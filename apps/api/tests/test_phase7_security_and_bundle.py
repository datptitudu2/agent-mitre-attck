"""Kiểm thử Phase 7: Rà soát bảo mật kho mã, chống rò rỉ Secret ra Frontend bundle, Header noindex, Cache CDN & Rate Limit."""

import json
from pathlib import Path
import re
import subprocess

from apps.api.app.config import Settings
from apps.api.app.middleware import SlidingWindowRateLimiter

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_gitignore_and_tracked_files_never_expose_secrets():
    gitignore = (REPO_ROOT / ".gitignore").read_text(encoding="utf-8")
    assert ".env.*" in gitignore or ".env.local" in gitignore
    assert ".cache/" in gitignore or ".cache" in gitignore

    ignore_check = subprocess.run(
        ["git", "check-ignore", ".env.local", ".cache/test.json"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=False,
    )
    assert ignore_check.returncode == 0
    assert ".env.local" in ignore_check.stdout

    proc = subprocess.run(
        ["git", "ls-files"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    tracked = set(line.strip() for line in proc.stdout.splitlines() if line.strip())
    assert ".env.example" in tracked
    assert ".env" not in tracked
    assert ".env.local" not in tracked
    for item in tracked:
        assert not item.endswith(".env.local"), f"Phát hiện tệp bí mật bị track trong git: {item}"


def test_frontend_source_and_production_bundle_contain_zero_backend_secrets():
    forbidden_markers = [
        "SUPABASE_SERVICE_ROLE_KEY",
        "postgresql://postgres",
        "GITHUB_TOKEN_DISPATCH",
        "SYNC_ADMIN_SECRET",
    ]
    secret_key_pattern = re.compile(r"sb_secret_[A-Za-z0-9_-]{8,}")

    # 1. Quét toàn bộ mã nguồn Frontend (apps/web/src)
    web_src = REPO_ROOT / "apps" / "web" / "src"
    src_files = list(web_src.rglob("*.ts")) + list(web_src.rglob("*.tsx"))
    assert len(src_files) >= 15
    for path in src_files:
        text = path.read_text(encoding="utf-8")
        for marker in forbidden_markers:
            assert marker not in text, f"Phát hiện chuỗi nhạy cảm '{marker}' trong {path}"
        assert not secret_key_pattern.search(text), f"Phát hiện khoá sb_secret_ thật trong {path}"

    # 2. Quét toàn bộ bundle Production đã build (apps/web/dist/assets) nếu có
    dist_assets = REPO_ROOT / "apps" / "web" / "dist" / "assets"
    if dist_assets.exists():
        js_files = list(dist_assets.glob("*.js"))
        assert len(js_files) >= 5, "Production build phải được tách chunk hợp lý"
        for js_path in js_files:
            content = js_path.read_text(encoding="utf-8", errors="ignore")
            for marker in forbidden_markers:
                assert marker not in content, f"Rò rỉ chuỗi nhạy cảm '{marker}' trong bundle {js_path.name}"
            assert not secret_key_pattern.search(content), f"Rò rỉ khoá sb_secret_ thật trong {js_path.name}"
            # Đảm bảo không có chunk JS đơn lẻ nào vượt quá 500 kB raw
            size_kb = js_path.stat().st_size / 1024.0
            assert size_kb < 500.0, f"Chunk {js_path.name} quá lớn ({size_kb:.1f} kB >= 500 kB)"


def test_vercel_config_enforces_sin1_region_noindex_and_bundle_exclusions():
    vercel_cfg = json.loads((REPO_ROOT / "vercel.json").read_text(encoding="utf-8"))
    assert "sin1" in vercel_cfg.get("regions", [])

    func_cfg = vercel_cfg.get("functions", {}).get("api/index.py", {})
    exclude_files = func_cfg.get("excludeFiles", "")
    assert "apps/web/**" in exclude_files
    assert ".cache/**" in exclude_files
    # Đảm bảo thư mục content/** KHÔNG bị loại trừ để Serverless Function đọc được Cases/Lessons/Quizzes
    assert "content/**" not in exclude_files

    all_headers = [
        (h["key"].lower(), h["value"].lower())
        for rule in vercel_cfg.get("headers", [])
        for h in rule.get("headers", [])
    ]
    robots_values = [val for key, val in all_headers if key == "x-robots-tag"]
    assert robots_values and "noindex" in robots_values[0]


def test_sliding_window_rate_limiter_blocks_burst_traffic():
    limiter = SlidingWindowRateLimiter(max_requests_per_minute=10)
    for _ in range(10):
        assert limiter.allow("203.0.113.9") is True
    assert limiter.allow("203.0.113.9") is False
    # IP khác không bị ảnh hưởng
    assert limiter.allow("203.0.113.10") is True


def test_cors_settings_parse_cleanly_without_wildcard_leak():
    cfg = Settings(
        SUPABASE_URL="https://example.supabase.co",
        ALLOWED_ORIGINS="https://attack-lab.vercel.app, http://localhost:5173",
    )
    assert cfg.cors_origins == [
        "https://attack-lab.vercel.app",
        "http://localhost:5173",
    ]
    assert "*" not in cfg.cors_origins


import httpx
import pytest
from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.db import get_db_client
from apps.api.app.main import create_app


class _FakeMatrixDb:
    async def fetch_one_sql(self, query: str, params=()):
        if "attack_matrix_views" in query:
            return {
                "version": "20.1",
                "etag": '"ent-v20.1-hash"',
                "payload": {"domain": "enterprise-attack", "version": "20.1", "tactics": []},
                "updated_at": "2026-11-09T00:00:00Z",
            }
        return None


@pytest.mark.asyncio
async def test_matrix_endpoint_cdn_cache_etag_304_and_unauthenticated_no_store():
    cfg = Settings(supabase_url="https://demo.supabase.co", supabase_jwt_secret="test-secret-32-bytes-minimum-key!!")
    app = create_app(cfg)
    app.dependency_overrides[get_db_client] = lambda: _FakeMatrixDb()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1) Chưa đăng nhập -> 401 + Cache-Control: no-store (không bao giờ bị CDN cache nhầm)
        unauth = await client.get("/api/matrix/enterprise-attack")
        assert unauth.status_code == 401
        assert unauth.headers.get("Cache-Control") == "no-store"

    # 2) Đã xác thực -> 200 + s-maxage CDN cache + Vary: Authorization + ETag + 304 Not Modified
    app.dependency_overrides[get_current_user] = lambda: AuthenticatedUser(
        id="uid-1", email="admin@team.vn", role="admin"
    )
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        ok = await client.get("/api/matrix/enterprise-attack")
        assert ok.status_code == 200
        cc = ok.headers.get("Cache-Control", "")
        assert "s-maxage=3600" in cc
        assert "stale-while-revalidate" in cc
        assert "Authorization" in ok.headers.get("Vary", "")
        assert ok.headers.get("ETag") == '"ent-v20.1-hash"'
        assert "noindex" in ok.headers.get("X-Robots-Tag", "")

        not_mod = await client.get(
            "/api/matrix/enterprise-attack",
            headers={"If-None-Match": '"ent-v20.1-hash"'},
        )
        assert not_mod.status_code == 304
        assert "s-maxage=3600" in not_mod.headers.get("Cache-Control", "")

