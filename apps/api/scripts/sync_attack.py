"""CLI đồng bộ dữ liệu MITRE ATT&CK STIX 2.1 lên Supabase Postgres.

Chạy độc lập ngoài Vercel (trong GitHub Actions hoặc máy local):
  python -m apps.api.scripts.sync_attack --domain all --version latest
  python -m apps.api.scripts.sync_attack --domain enterprise-attack --dry-run
"""

import argparse
import asyncio
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

from psycopg.types.json import Jsonb

ROOT_DIR = Path(__file__).resolve().parents[3]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from apps.api.app.config import get_settings
from apps.api.app.db import SupabaseDataClient
from apps.api.parser.diff_engine import compute_version_diff
from apps.api.parser.stix_loader import (
    SUPPORTED_DOMAINS,
    DomainVersionInfo,
    download_stix_bundle,
    fetch_remote_index,
    select_target_and_previous_version,
)
from apps.api.parser.stix_mapper import build_snapshots_only, parse_stix_bundle

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("attack_lab.sync")


def _major_number(ver: str) -> Optional[int]:
    head = ver.strip().lstrip("vV").split(".")[0]
    return int(head) if head.isdigit() else None


def _pick_previous_major_version(
    versions: List[DomainVersionInfo], target: DomainVersionInfo
) -> Optional[DomainVersionInfo]:
    """Tìm bản phát hành mới nhất của major liền trước (vd target=20.1 -> tìm 19.2 hoặc 19.0)."""
    target_major = _major_number(target.version)
    if target_major is None:
        return None
    for candidate in versions:
        cand_major = _major_number(candidate.version)
        if cand_major is not None and cand_major < target_major:
            return candidate
    return None


def _chunked(items: List[Any], size: int = 500):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _upsert_domain_to_postgres(
    db: SupabaseDataClient,
    parsed,
    extra_snapshots: List[Tuple_Version_Rows := Any],
    compared_to_version: Optional[str],
    diff_summary: Dict[str, int],
    trigger_source: str,
) -> Dict[str, Any]:
    """Ghi toàn bộ dữ liệu của 1 domain vào Postgres trong giao dịch an toàn & đo dung lượng DB."""
    if compared_to_version:
        parsed.matrix_payload["compared_to_version"] = compared_to_version

    with db.get_pg_conn(autocommit=False) as conn:
        with conn.cursor() as cur:
            # 1. Tạo hoặc cập nhật bản ghi attack_versions, xoá các bản không còn là latest để giữ DB < 500MB
            cur.execute(
                """
                update public.attack_versions
                set is_latest = false
                where domain = %s and version <> %s;
                """,
                (parsed.domain, parsed.version),
            )
            cur.execute(
                """
                delete from public.attack_versions
                where domain = %s and version <> %s;
                """,
                (parsed.domain, parsed.version),
            )

            cur.execute(
                """
                insert into public.attack_versions (domain, version, released_at, is_latest, stats, synced_at)
                values (%s, %s, %s, true, %s, now())
                on conflict (domain, version) do update
                  set released_at = excluded.released_at,
                      is_latest = true,
                      stats = excluded.stats,
                      synced_at = now()
                returning id;
                """,
                (
                    parsed.domain,
                    parsed.version,
                    parsed.released_at or None,
                    Jsonb(parsed.stats),
                ),
            )
            version_id = cur.fetchone()["id"]

            # 2. Xoá sạch objects/relationships cũ của version này rồi chèn theo lô (idempotent tuyệt đối)
            cur.execute(
                "delete from public.attack_objects where domain = %s;",
                (parsed.domain,),
            )
            cur.execute(
                "delete from public.attack_relationships where domain = %s;",
                (parsed.domain,),
            )

            obj_sql = """
                insert into public.attack_objects (
                    domain, stix_id, version_id, type, attack_id, name, description,
                    platforms, tactics, is_subtechnique, parent_attack_id,
                    revoked, deprecated, replaced_by_attack_id, usage_count,
                    is_new, is_changed, data
                ) values (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s
                )
            """
            for batch in _chunked(parsed.objects, 600):
                cur.executemany(
                    obj_sql,
                    [
                        (
                            o["domain"],
                            o["stix_id"],
                            version_id,
                            o["type"],
                            o["attack_id"],
                            o["name"],
                            o["description"],
                            o["platforms"],
                            o["tactics"],
                            o["is_subtechnique"],
                            o["parent_attack_id"],
                            o["revoked"],
                            o["deprecated"],
                            o["replaced_by_attack_id"],
                            o["usage_count"],
                            o["is_new"],
                            o["is_changed"],
                            Jsonb(o["data"]),
                        )
                        for o in batch
                    ],
                )

            rel_sql = """
                insert into public.attack_relationships (
                    domain, id, version_id, source_ref, target_ref,
                    rel_type, source_type, target_type, description
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            for batch in _chunked(parsed.relationships, 1000):
                cur.executemany(
                    rel_sql,
                    [
                        (
                            r["domain"],
                            r["id"],
                            version_id,
                            r["source_ref"],
                            r["target_ref"],
                            r["rel_type"],
                            r["source_type"],
                            r["target_type"],
                            r["description"],
                        )
                        for r in batch
                    ],
                )

            # 3. Lưu JSON dựng sẵn cho /api/matrix/{domain}
            cur.execute(
                """
                insert into public.attack_matrix_views (domain, version, etag, payload, updated_at)
                values (%s, %s, %s, %s, now())
                on conflict (domain) do update
                  set version = excluded.version,
                      etag = excluded.etag,
                      payload = excluded.payload,
                      updated_at = now();
                """,
                (
                    parsed.domain,
                    parsed.version,
                    parsed.matrix_etag,
                    Jsonb(parsed.matrix_payload),
                ),
            )

            # 4. Lưu bảng snapshot nhẹ (chỉ giữ tối đa 3 phiên bản gần nhất của mỗi domain)
            all_snap_sets = [(parsed.version, parsed.snapshots)] + list(extra_snapshots)
            keep_versions = [v for v, _ in all_snap_sets]
            cur.execute(
                """
                delete from public.attack_object_snapshots
                where domain = %s and not (version = any(%s));
                """,
                (parsed.domain, keep_versions),
            )

            snap_sql = """
                insert into public.attack_object_snapshots (
                    domain, version, stix_id, attack_id, type, name,
                    is_subtechnique, revoked, deprecated, replaced_by_attack_id,
                    tactics, content_hash
                ) values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (domain, version, stix_id) do update
                  set attack_id = excluded.attack_id,
                      name = excluded.name,
                      revoked = excluded.revoked,
                      deprecated = excluded.deprecated,
                      replaced_by_attack_id = excluded.replaced_by_attack_id,
                      tactics = excluded.tactics,
                      content_hash = excluded.content_hash
            """
            for snap_ver, snap_rows in all_snap_sets:
                cur.execute(
                    "delete from public.attack_object_snapshots where domain = %s and version = %s;",
                    (parsed.domain, snap_ver),
                )
                for batch in _chunked(snap_rows, 1000):
                    cur.executemany(
                        snap_sql,
                        [
                            (
                                s["domain"],
                                s["version"],
                                s["stix_id"],
                                s["attack_id"],
                                s["type"],
                                s["name"],
                                s["is_subtechnique"],
                                s["revoked"],
                                s["deprecated"],
                                s["replaced_by_attack_id"],
                                s["tactics"],
                                s["content_hash"],
                            )
                            for s in batch
                        ],
                    )

        conn.commit()

    # 5. Đo dung lượng thực tế của toàn bộ DB và từng bảng sau khi commit
    with db.get_pg_conn(autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("select public.get_db_size_stats() as size_stats;")
            size_stats = cur.fetchone()["size_stats"]
            db_bytes = int(size_stats.get("database_bytes") or 0)

            log_msg = (
                f"Đồng bộ thành công {parsed.domain} v{parsed.version} "
                f"(so sánh với v{compared_to_version or 'N/A'}). "
                f"Dung lượng DB: {size_stats.get('database_pretty')}."
            )
            cur.execute(
                """
                insert into public.sync_runs (
                    started_at, finished_at, status, trigger_source, domain, version,
                    counts, added, updated, removed, db_size_bytes, log
                ) values (
                    now(), now(), 'success', %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                );
                """,
                (
                    trigger_source,
                    parsed.domain,
                    parsed.version,
                    Jsonb(parsed.stats),
                    diff_summary.get("added", 0),
                    diff_summary.get("modified", 0),
                    diff_summary.get("deprecated", 0) + diff_summary.get("revoked", 0),
                    db_bytes,
                    log_msg,
                ),
            )

    return size_stats


async def run_sync(
    domain_arg: str = "all",
    version_arg: str = "latest",
    dry_run: bool = False,
    use_cache: bool = False,
    trigger_source: str = "cli",
) -> List[Dict[str, Any]]:
    settings = get_settings()
    db = SupabaseDataClient(settings)
    cache_dir = (ROOT_DIR / ".cache" / "stix") if use_cache else None

    index_map = await fetch_remote_index(cache_dir=cache_dir)
    domains = list(SUPPORTED_DOMAINS) if domain_arg == "all" else [domain_arg]

    summaries: List[Dict[str, Any]] = []
    for dom in domains:
        if dom not in SUPPORTED_DOMAINS:
            raise ValueError(f"Domain không hợp lệ: {dom}")

        versions = index_map[dom]
        target_info, prev_patch_info = select_target_and_previous_version(versions, version_arg)
        prev_major_info = _pick_previous_major_version(versions, target_info)

        # Dùng bản major trước (vd 19.x khi đang ở 20.1) để gắn badge NEW nổi bật cho tính năng mới của v20
        baseline_info = prev_major_info or prev_patch_info
        extra_snapshots = []
        baseline_map: Dict[str, Dict[str, Any]] = {}

        if prev_patch_info and prev_patch_info.version != target_info.version:
            patch_bundle = await download_stix_bundle(prev_patch_info, cache_dir=cache_dir)
            patch_snaps = build_snapshots_only(dom, prev_patch_info.version, patch_bundle)
            extra_snapshots.append((prev_patch_info.version, patch_snaps))
            if baseline_info and baseline_info.version == prev_patch_info.version:
                baseline_map = {s["stix_id"]: s for s in patch_snaps}

        if (
            prev_major_info
            and prev_major_info.version != target_info.version
            and (not prev_patch_info or prev_major_info.version != prev_patch_info.version)
        ):
            major_bundle = await download_stix_bundle(prev_major_info, cache_dir=cache_dir)
            major_snaps = build_snapshots_only(dom, prev_major_info.version, major_bundle)
            extra_snapshots.append((prev_major_info.version, major_snaps))
            baseline_map = {s["stix_id"]: s for s in major_snaps}

        target_bundle = await download_stix_bundle(target_info, cache_dir=cache_dir)
        parsed = parse_stix_bundle(
            domain=dom,
            version=target_info.version,
            bundle=target_bundle,
            released_at=target_info.modified or None,
            prev_snapshots_by_stix_id=baseline_map,
        )

        diff_counts = {"added": 0, "modified": 0, "deprecated": 0, "revoked": 0}
        if baseline_map:
            diff_res = compute_version_diff(list(baseline_map.values()), parsed.snapshots)
            diff_counts = diff_res["counts"]

        logger.info(
            "[%s v%s] Stats=%s | Diff(vs %s)=%s",
            dom,
            parsed.version,
            json.dumps(parsed.stats),
            baseline_info.version if baseline_info else "none",
            json.dumps(diff_counts),
        )

        size_stats = {}
        if not dry_run:
            size_stats = await asyncio.to_thread(
                _upsert_domain_to_postgres,
                db,
                parsed,
                extra_snapshots,
                baseline_info.version if baseline_info else None,
                diff_counts,
                trigger_source,
            )

        summaries.append(
            {
                "domain": dom,
                "version": parsed.version,
                "compared_to": baseline_info.version if baseline_info else None,
                "stats": parsed.stats,
                "diff": diff_counts,
                "db_size": size_stats,
            }
        )

    return summaries


def main() -> None:
    parser = argparse.ArgumentParser(description="Đồng bộ dữ liệu MITRE ATT&CK STIX 2.1 lên Supabase.")
    parser.add_argument(
        "--domain",
        default="all",
        choices=["all", "enterprise-attack", "mobile-attack", "ics-attack"],
        help="Domain cần đồng bộ (mặc định: all).",
    )
    parser.add_argument(
        "--version",
        default="latest",
        help="Phiên bản cần đồng bộ (mặc định: latest, tự dò từ index.json).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Chỉ tải và parse kiểm tra số liệu, không ghi vào Supabase.",
    )
    parser.add_argument(
        "--use-cache",
        action="store_true",
        help="Tái sử dụng file STIX đã tải trong .cache/stix khi chạy ở máy local.",
    )
    parser.add_argument(
        "--trigger-source",
        default="cli",
        help="Nguồn kích hoạt ghi vào bảng sync_runs (cli / github_actions / admin).",
    )
    args = parser.parse_args()

    import socket

    socket.getaddrinfo("raw.githubusercontent.com", 443)
    started = datetime.now(timezone.utc)
    results = asyncio.run(
        run_sync(
            domain_arg=args.domain,
            version_arg=args.version,
            dry_run=args.dry_run,
            use_cache=args.use_cache,
            trigger_source=args.trigger_source,
        )
    )
    elapsed = round((datetime.now(timezone.utc) - started).total_seconds(), 2)
    print(json.dumps({"elapsed_seconds": elapsed, "results": results}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
