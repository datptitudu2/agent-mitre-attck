"""Endpoints quản lý phiên bản ATT&CK (/api/versions) và kích hoạt đồng bộ (/api/sync)."""

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
import httpx
from pydantic import BaseModel, Field

from apps.api.app.auth import AuthenticatedUser, get_current_user, require_admin
from apps.api.app.config import Settings, get_settings
from apps.api.app.db import SupabaseDataClient, get_db_client
from apps.api.parser.stix_loader import SUPPORTED_DOMAINS, fetch_remote_index

logger = logging.getLogger("attack_lab.routers.sync")
router = APIRouter(tags=["Versions & Sync"])


class SyncRequest(BaseModel):
    domain: str = Field(default="all", pattern="^(all|enterprise-attack|mobile-attack|ics-attack)$")
    version: str = Field(default="latest", max_length=32)


@router.get("/versions")
async def get_versions(
    check_remote: bool = Query(
        default=False,
        description="Nếu bật, gọi thêm index.json từ GitHub MITRE để so sánh bản mới nhất.",
    ),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Đọc phiên bản đang lưu trong Supabase (và tuỳ chọn đối chiếu index.json trực tuyến của MITRE)."""
    db_versions = await db.fetch_all_sql(
        """
        select domain, version, released_at, is_latest, stats, synced_at
        from public.attack_versions
        where is_latest = true
        order by domain;
        """
    )
    snap_versions_rows = await db.fetch_all_sql(
        """
        select domain, array_agg(distinct version order by version desc) as snapshot_versions
        from public.attack_object_snapshots
        group by domain;
        """
    )
    recent_runs = await db.fetch_all_sql(
        """
        select id, started_at, finished_at, status, trigger_source, domain, version,
               counts, added, updated, removed, db_size_bytes, log
        from public.sync_runs
        order by started_at desc
        limit 15;
        """
    )

    snap_map = {r["domain"]: (r["snapshot_versions"] or []) for r in snap_versions_rows}
    db_by_domain = {r["domain"]: r for r in db_versions}

    remote_latest: Dict[str, Optional[str]] = {}
    if check_remote:
        try:
            remote_index = await fetch_remote_index(timeout=5.0)
            for dom in SUPPORTED_DOMAINS:
                vers = remote_index.get(dom) or []
                remote_latest[dom] = vers[0].version if vers else None
        except Exception as exc:
            logger.warning("Không đọc được index.json từ MITRE lúc kiểm tra phiên bản: %s", exc)

    domains_info = []
    any_update_available = False
    for dom in SUPPORTED_DOMAINS:
        cur = db_by_domain.get(dom)
        current_ver = cur["version"] if cur else None
        mitre_ver = remote_latest.get(dom)
        has_update = bool(mitre_ver and current_ver and mitre_ver != current_ver)
        if has_update or (mitre_ver and not current_ver):
            any_update_available = True

        domains_info.append(
            {
                "domain": dom,
                "current_version": current_ver,
                "mitre_latest_version": mitre_ver,
                "has_update": has_update,
                "released_at": cur["released_at"] if cur else None,
                "synced_at": cur["synced_at"] if cur else None,
                "stats": cur["stats"] if cur else {},
                "available_diff_versions": snap_map.get(dom, []),
            }
        )

    return {
        "has_update": any_update_available,
        "domains": domains_info,
        "recent_sync_runs": recent_runs,
    }


@router.post("/sync", status_code=status.HTTP_202_ACCEPTED)
async def trigger_sync_workflow(
    body: SyncRequest,
    admin_user: AuthenticatedUser = Depends(require_admin),
    settings: Settings = Depends(get_settings),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Kích hoạt GitHub Actions workflow_dispatch (không tự chạy tác vụ crawl nặng trên Vercel Serverless)."""
    token = settings.github_token_dispatch.strip()
    repo = settings.github_repo.strip()
    wf_file = settings.github_workflow_file.strip() or "sync.yml"
    wf_ref = settings.github_workflow_ref.strip() or "main"

    if not token or not repo:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Chưa cấu hình GITHUB_TOKEN_DISPATCH và GITHUB_REPO trên môi trường Backend. "
                "Ở máy local, hãy chạy: python -m apps.api.scripts.sync_attack --domain all"
            ),
        )

    dispatch_url = f"https://api.github.com/repos/{repo}/actions/workflows/{wf_file}/dispatches"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            dispatch_url,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            json={
                "ref": wf_ref,
                "inputs": {
                    "domain": body.domain,
                    "version": body.version,
                },
            },
        )

    if resp.status_code not in (200, 201, 204):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API trả mã lỗi {resp.status_code}: {resp.text[:240]}",
        )

    await db.execute_sql(
        """
        insert into public.sync_runs (status, trigger_source, domain, version, log)
        values ('queued', %s, %s, %s, %s);
        """,
        (
            f"admin:{admin_user.email}",
            body.domain,
            body.version,
            f"Đã gửi yêu cầu workflow_dispatch ({wf_file} @ {wf_ref}) lên GitHub Actions.",
        ),
    )

    return {
        "status": "queued",
        "message": "Đã xếp lịch đồng bộ trên GitHub Actions thành công.",
        "domain": body.domain,
        "version": body.version,
    }
