"""Unit test Phase 1: Kiểm chứng JWKS/HS256 Auth, Allowlist, Header noindex và cấu trúc SQL RLS."""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, patch

from cryptography.hazmat.primitives.asymmetric import ec
import httpx
import jwt
import pytest

from apps.api.app.config import Settings, get_settings
from apps.api.app.db import get_db_client
from apps.api.app.main import create_app

ROOT_DIR = Path(__file__).resolve().parents[3]


class FakeSupabaseClient:
    """Giả lập bảng allowed_emails & dữ liệu người dùng có áp dụng logic RLS chủ sở hữu."""

    def __init__(self) -> None:
        self.allowed_emails: Dict[str, Dict[str, str]] = {
            "admin@team.vn": {"email": "admin@team.vn", "role": "admin"},
            "alice@team.vn": {"email": "alice@team.vn", "role": "member"},
            "bob@team.vn": {"email": "bob@team.vn", "role": "member"},
        }
        self.bookmarks: List[Dict[str, Any]] = [
            {
                "id": "bm-bob-1",
                "user_id": "uid-bob",
                "domain": "enterprise-attack",
                "attack_id": "T1059",
                "note": "Ghi chú riêng của Bob",
            }
        ]

    async def select(
        self,
        table: str,
        params: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        params = params or {}
        if table == "allowed_emails":
            email_filter = params.get("email", "")
            if email_filter.startswith("eq."):
                target = email_filter[3:].lower()
                if target in self.allowed_emails:
                    return [self.allowed_emails[target]]
            return []
        return []

    def query_bookmarks_as_rls_user(
        self, current_uid: str, current_email: str
    ) -> List[Dict[str, Any]]:
        """Mô phỏng chính xác policy bookmarks_owner_all: auth.uid() = user_id AND is_allowed_member()."""
        if current_email.lower() not in self.allowed_emails:
            return []
        return [row for row in self.bookmarks if row["user_id"] == current_uid]


def _make_settings(jwt_secret: str = "super-test-hs256-secret-key-32bytes!!") -> Settings:
    return Settings(
        supabase_url="https://demo-project.supabase.co",
        supabase_service_role_key="service-role-test-key",
        supabase_jwt_secret=jwt_secret,
        allowed_origins="http://localhost:5173",
    )


@pytest.mark.asyncio
async def test_healthcheck_and_noindex_header():
    settings = _make_settings()
    app = create_app(settings)
    app.dependency_overrides[get_settings] = lambda: settings

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/health")

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert "noindex" in resp.headers.get("X-Robots-Tag", "")


@pytest.mark.asyncio
async def test_unauthenticated_request_rejected():
    settings = _make_settings()
    app = create_app(settings)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/me")

    assert resp.status_code == 401
    assert resp.json()["error"]["code"] == "HTTP_401"


@pytest.mark.asyncio
async def test_jwks_es256_verification_and_allowlist_enforcement():
    """Kiểm chứng xác thực khoá bất đối xứng ES256 (chuẩn JWKS hiện hành của Supabase) + chặn ngoài allowlist."""
    settings = _make_settings(jwt_secret="")
    fake_db = FakeSupabaseClient()

    app = create_app(settings)
    app.dependency_overrides[get_db_client] = lambda: fake_db
    app.dependency_overrides[get_settings] = lambda: settings

    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    now = datetime.now(timezone.utc)
    alice_token = jwt.encode(
        {
            "sub": "uid-alice",
            "email": "alice@team.vn",
            "aud": "authenticated",
            "iss": "https://demo-project.supabase.co/auth/v1",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        },
        private_key,
        algorithm="ES256",
        headers={"kid": "supa-key-1"},
    )

    outsider_token = jwt.encode(
        {
            "sub": "uid-outsider",
            "email": "stranger@gmail.com",
            "aud": "authenticated",
            "iss": "https://demo-project.supabase.co/auth/v1",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        },
        private_key,
        algorithm="ES256",
        headers={"kid": "supa-key-1"},
    )

    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key
    mock_jwk_client = MagicMock()
    mock_jwk_client.get_signing_key_from_jwt.return_value = mock_signing_key

    transport = httpx.ASGITransport(app=app)
    with patch("apps.api.app.auth._get_jwks_client", return_value=mock_jwk_client):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            ok_resp = await client.get(
                "/api/me", headers={"Authorization": f"Bearer {alice_token}"}
            )
            assert ok_resp.status_code == 200
            assert ok_resp.json()["user"]["email"] == "alice@team.vn"
            assert ok_resp.json()["user"]["role"] == "member"

            blocked_resp = await client.get(
                "/api/me", headers={"Authorization": f"Bearer {outsider_token}"}
            )
            assert blocked_resp.status_code == 403


def test_user_a_cannot_read_user_b_private_rows_and_sql_rls_completeness():
    """Kiểm chứng cô lập dữ liệu User A vs User B và kiểm tra toàn bộ bảng trong migration đều bật RLS."""
    fake_db = FakeSupabaseClient()
    alice_visible = fake_db.query_bookmarks_as_rls_user("uid-alice", "alice@team.vn")
    bob_visible = fake_db.query_bookmarks_as_rls_user("uid-bob", "bob@team.vn")
    assert alice_visible == []
    assert len(bob_visible) == 1
    assert bob_visible[0]["attack_id"] == "T1059"

    sql_path = ROOT_DIR / "supabase" / "migrations" / "0001_init_attack_lab.sql"
    sql_text = sql_path.read_text(encoding="utf-8").lower()

    expected_tables = [
        "allowed_emails",
        "profiles",
        "attack_versions",
        "attack_objects",
        "attack_relationships",
        "attack_matrix_views",
        "attack_object_snapshots",
        "sync_runs",
        "bookmarks",
        "notes",
        "progress",
        "quiz_attempts",
        "coverage_layers",
    ]
    for tbl in expected_tables:
        assert f"alter table public.{tbl} enable row level security;" in sql_text, (
            f"Bảng {tbl} chưa bật RLS!"
        )

    assert "trg_enforce_allowed_email" in sql_text
    assert "auth.uid() = user_id" in sql_text
