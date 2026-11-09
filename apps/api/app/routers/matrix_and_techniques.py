"""Endpoints đọc ma trận (/api/matrix/{domain}), chi tiết Technique (/api/techniques/{attack_id}) và Tìm kiếm (/api/search)."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status

from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.db import SupabaseDataClient, get_db_client
from apps.api.parser.stix_loader import SUPPORTED_DOMAINS

router = APIRouter(tags=["Matrix & Techniques"])


@router.get("/matrix/{domain}")
async def get_domain_matrix(
    domain: str,
    response: Response,
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Any:
    """Trả dữ liệu Matrix dựng sẵn từ 1 dòng duy nhất trong attack_matrix_views kèm ETag & Cache-Control."""
    if domain not in SUPPORTED_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Domain '{domain}' không hợp lệ. Hỗ trợ: {', '.join(SUPPORTED_DOMAINS)}.",
        )

    # Kiểm tra nhanh ETag trước khi đọc toàn bộ JSONB nếu trình duyệt gửi If-None-Match
    if if_none_match:
        meta = await db.fetch_one_sql(
            "select etag from public.attack_matrix_views where domain = %s;",
            (domain,),
        )
        if meta and meta["etag"] == if_none_match.strip():
            return Response(
                status_code=status.HTTP_304_NOT_MODIFIED,
                headers={
                    "ETag": meta["etag"],
                    "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
                },
            )

    row = await db.fetch_one_sql(
        "select version, etag, payload, updated_at from public.attack_matrix_views where domain = %s;",
        (domain,),
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chưa có dữ liệu đồng bộ cho domain '{domain}'. Hãy chạy sync lần đầu.",
        )

    response.headers["ETag"] = row["etag"]
    response.headers["Cache-Control"] = "private, max-age=3600, stale-while-revalidate=86400"
    return row["payload"]


@router.get("/techniques/{attack_id}")
async def get_technique_detail(
    attack_id: str,
    domain: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Chi tiết Technique/Sub-technique + Procedure Examples + Mitigations + Detection Strategy -> Analytic -> Data Component."""
    clean_id = attack_id.strip().upper()

    if domain:
        tech = await db.fetch_one_sql(
            """
            select * from public.attack_objects
            where domain = %s and type = 'attack-pattern' and upper(attack_id) = %s
            limit 1;
            """,
            (domain, clean_id),
        )
    else:
        # Ưu tiên bản active (không revoked/deprecated) và ưu tiên enterprise-attack nếu trùng ID
        tech = await db.fetch_one_sql(
            """
            select * from public.attack_objects
            where type = 'attack-pattern' and upper(attack_id) = %s
            order by (revoked or deprecated) asc,
                     case domain
                       when 'enterprise-attack' then 1
                       when 'mobile-attack' then 2
                       else 3
                     end asc
            limit 1;
            """,
            (clean_id,),
        )

    if not tech:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Technique có mã '{clean_id}'.",
        )

    resolved_domain = tech["domain"]
    stix_id = tech["stix_id"]

    # Thông tin technique thay thế nếu đối tượng đã bị revoked
    replaced_by_obj = None
    if tech.get("replaced_by_attack_id"):
        replaced_by_obj = await db.fetch_one_sql(
            """
            select attack_id, name, domain
            from public.attack_objects
            where domain = %s and attack_id = %s
            limit 1;
            """,
            (resolved_domain, tech["replaced_by_attack_id"]),
        )

    # Parent hoặc Sub-techniques liên quan
    parent_tech = None
    if tech["is_subtechnique"] and tech.get("parent_attack_id"):
        parent_tech = await db.fetch_one_sql(
            """
            select attack_id, name
            from public.attack_objects
            where domain = %s and type = 'attack-pattern' and attack_id = %s
            limit 1;
            """,
            (resolved_domain, tech["parent_attack_id"]),
        )

    subtechniques = await db.fetch_all_sql(
        """
        select attack_id, name, platforms, usage_count, is_new, is_changed
        from public.attack_objects
        where domain = %s
          and type = 'attack-pattern'
          and parent_attack_id = %s
          and not revoked and not deprecated
        order by attack_id;
        """,
        (resolved_domain, tech["attack_id"]),
    )

    # 1. Procedure Examples (Groups, Software, Campaigns dùng technique này) + Mitigations
    inbound_rows = await db.fetch_all_sql(
        """
        select r.rel_type, r.description as rel_description,
               o.stix_id, o.type, o.attack_id, o.name, o.data
        from public.attack_relationships r
        join public.attack_objects o
          on o.domain = r.domain and o.stix_id = r.source_ref
        where r.domain = %s
          and r.target_ref = %s
          and r.rel_type in ('uses', 'mitigates', 'detects', 'targets')
          and not o.revoked and not o.deprecated
        order by o.attack_id;
        """,
        (resolved_domain, stix_id),
    )

    # ICS Assets: attack-pattern --(targets)--> x-mitre-asset
    outbound_assets = await db.fetch_all_sql(
        """
        select r.description as rel_description,
               o.attack_id, o.name, o.description, o.data
        from public.attack_relationships r
        join public.attack_objects o
          on o.domain = r.domain and o.stix_id = r.target_ref
        where r.domain = %s
          and r.source_ref = %s
          and r.rel_type = 'targets'
          and o.type = 'x-mitre-asset'
          and not o.revoked and not o.deprecated
        order by o.attack_id;
        """,
        (resolved_domain, stix_id),
    )

    procedure_groups: List[Dict[str, Any]] = []
    procedure_software: List[Dict[str, Any]] = []
    procedure_campaigns: List[Dict[str, Any]] = []
    mitigations: List[Dict[str, Any]] = []
    strategy_rows: List[Dict[str, Any]] = []
    ics_assets: List[Dict[str, Any]] = list(outbound_assets)

    for row in inbound_rows:
        rtype = row["rel_type"]
        otype = row["type"]
        entry = {
            "attack_id": row["attack_id"],
            "name": row["name"],
            "type": otype,
            "description": row["rel_description"],
        }
        if rtype == "uses":
            if otype == "intrusion-set":
                procedure_groups.append(entry)
            elif otype in ("malware", "tool"):
                procedure_software.append(entry)
            elif otype == "campaign":
                procedure_campaigns.append(entry)
        elif rtype == "mitigates" and otype == "course-of-action":
            mitigations.append(entry)
        elif rtype == "detects" and otype == "x-mitre-detection-strategy":
            strategy_rows.append(row)
        elif rtype == "targets" and otype == "x-mitre-asset":
            ics_assets.append(entry)

    # 2. Dựng cây hoàn chỉnh: Detection Strategy (DET...) -> Analytic (AN...) -> Data Component (DC...)
    all_analytic_stix_ids: List[str] = []
    for srow in strategy_rows:
        refs = (srow.get("data") or {}).get("analytic_refs") or []
        for ref in refs:
            if ref not in all_analytic_stix_ids:
                all_analytic_stix_ids.append(ref)

    analytics_by_stix: Dict[str, Dict[str, Any]] = {}
    all_dc_stix_ids: List[str] = []
    if all_analytic_stix_ids:
        analytic_objs = await db.fetch_all_sql(
            """
            select stix_id, attack_id, name, description, platforms, data
            from public.attack_objects
            where domain = %s and stix_id = any(%s) and not revoked and not deprecated;
            """,
            (resolved_domain, all_analytic_stix_ids),
        )
        for aobj in analytic_objs:
            analytics_by_stix[aobj["stix_id"]] = aobj
            for lsr in (aobj.get("data") or {}).get("log_source_references") or []:
                dc_ref = lsr.get("x_mitre_data_component_ref")
                if dc_ref and dc_ref not in all_dc_stix_ids:
                    all_dc_stix_ids.append(dc_ref)

    dc_by_stix: Dict[str, Dict[str, Any]] = {}
    if all_dc_stix_ids:
        dc_objs = await db.fetch_all_sql(
            """
            select stix_id, attack_id, name, description, data
            from public.attack_objects
            where domain = %s and stix_id = any(%s);
            """,
            (resolved_domain, all_dc_stix_ids),
        )
        for dobj in dc_objs:
            dc_by_stix[dobj["stix_id"]] = dobj

    detection_strategies: List[Dict[str, Any]] = []
    for srow in strategy_rows:
        sdata = srow.get("data") or {}
        nested_analytics: List[Dict[str, Any]] = []
        for aref in sdata.get("analytic_refs") or []:
            aobj = analytics_by_stix.get(aref)
            if not aobj:
                continue
            adata = aobj.get("data") or {}
            log_sources_enriched: List[Dict[str, Any]] = []
            for lsr in adata.get("log_source_references") or []:
                dc_ref = lsr.get("x_mitre_data_component_ref")
                dc_info = dc_by_stix.get(dc_ref) if dc_ref else None
                log_sources_enriched.append(
                    {
                        "name": lsr.get("name") or "",
                        "channel": lsr.get("channel") or "",
                        "data_component": {
                            "attack_id": dc_info["attack_id"],
                            "name": dc_info["name"],
                            "description": dc_info["description"],
                        }
                        if dc_info
                        else None,
                    }
                )
            nested_analytics.append(
                {
                    "attack_id": aobj["attack_id"],
                    "name": aobj["name"],
                    "description": aobj["description"],
                    "platforms": aobj["platforms"],
                    "url": adata.get("url") or "",
                    "mutable_elements": adata.get("mutable_elements") or [],
                    "log_sources": log_sources_enriched,
                }
            )
        nested_analytics.sort(key=lambda x: x["attack_id"])
        detection_strategies.append(
            {
                "attack_id": srow["attack_id"],
                "name": srow["name"],
                "url": sdata.get("url") or "",
                "analytics": nested_analytics,
            }
        )

    return {
        "domain": resolved_domain,
        "attack_id": tech["attack_id"],
        "name": tech["name"],
        "description": tech["description"],
        "platforms": tech["platforms"],
        "tactics": tech["tactics"],
        "is_subtechnique": tech["is_subtechnique"],
        "parent": parent_tech,
        "subtechniques": subtechniques,
        "revoked": tech["revoked"],
        "deprecated": tech["deprecated"],
        "replaced_by": replaced_by_obj,
        "usage_count": tech["usage_count"],
        "is_new": tech["is_new"],
        "is_changed": tech["is_changed"],
        "metadata": tech["data"],
        "procedures": {
            "groups": procedure_groups,
            "software": procedure_software,
            "campaigns": procedure_campaigns,
        },
        "mitigations": mitigations,
        "detection_strategies": detection_strategies,
        "ics_assets": ics_assets,
    }


@router.get("/search")
async def search_attack_objects(
    q: str = Query(..., min_length=1, max_length=120),
    domain: Optional[str] = Query(default=None),
    type_filter: Optional[str] = Query(default=None, alias="type"),
    include_deprecated: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Tìm kiếm toàn cục theo mã ATT&CK ID, tên hoặc từ khoá mô tả."""
    term = q.strip()
    like_prefix = f"{term}%"
    like_any = f"%{term}%"

    conditions = ["(attack_id ilike %s or name ilike %s or search_tsv @@ plainto_tsquery('english', %s))"]
    params: List[Any] = [like_prefix, like_any, term]

    if not include_deprecated:
        conditions.append("(not revoked and not deprecated)")
    if domain:
        conditions.append("domain = %s")
        params.append(domain)
    if type_filter:
        if type_filter == "software":
            conditions.append("type in ('malware', 'tool')")
        else:
            conditions.append("type = %s")
            params.append(type_filter)

    params.extend([term.upper(), like_prefix, limit])
    sql = f"""
        select domain, type, attack_id, name, is_subtechnique, tactics, platforms,
               revoked, deprecated, replaced_by_attack_id, usage_count
        from public.attack_objects
        where {' and '.join(conditions)}
        order by
          (upper(attack_id) = %s) desc,
          (attack_id ilike %s) desc,
          usage_count desc,
          attack_id asc
        limit %s;
    """
    rows = await db.fetch_all_sql(sql, tuple(params))
    return {"query": term, "count": len(rows), "results": rows}
