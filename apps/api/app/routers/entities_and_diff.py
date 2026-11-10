"""Endpoints thực thể (Groups, Software, Campaigns + Chain), Diff phiên bản (/api/diff) và Xuất Navigator (/api/export/navigator)."""

from collections import defaultdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.db import SupabaseDataClient, get_db_client
from apps.api.parser.diff_engine import compute_version_diff
from apps.api.parser.stix_loader import SUPPORTED_DOMAINS

router = APIRouter(tags=["Entities, Diff & Export"])


async def _fetch_tactic_order_map(db: SupabaseDataClient, domain: str) -> List[Dict[str, Any]]:
    rows = await db.fetch_all_sql(
        """
        select attack_id, name, tactics, data
        from public.attack_objects
        where domain = %s and type = 'x-mitre-tactic' and not revoked and not deprecated;
        """,
        (domain,),
    )
    tactics = []
    for r in rows:
        data = r.get("data") or {}
        sn = data.get("shortname") or (r["tactics"][0] if r.get("tactics") else "")
        tactics.append(
            {
                "attack_id": r["attack_id"],
                "shortname": sn,
                "name": r["name"],
                "order": int(data.get("order", 999)),
            }
        )
    tactics.sort(key=lambda x: x["order"])
    return tactics


async def _get_entity_detail(
    db: SupabaseDataClient,
    entity_kind: str,
    identifier: str,
    domain: Optional[str],
) -> Dict[str, Any]:
    """Lấy thông tin chi tiết Group / Software / Campaign (hỗ trợ tra cả mã ID lẫn tên không phân biệt hoa thường)."""
    type_clause = (
        "type in ('malware', 'tool')"
        if entity_kind == "software"
        else f"type = '{entity_kind}'"
    )
    ident = identifier.strip()

    params: List[Any] = [ident.upper(), ident.lower()]
    domain_sql = ""
    if domain:
        domain_sql = "and domain = %s"
        params.append(domain)

    row = await db.fetch_one_sql(
        f"""
        select *
        from public.attack_objects
        where {type_clause}
          and (upper(attack_id) = %s or lower(name) = %s)
          {domain_sql}
        order by (revoked or deprecated) asc,
                 case domain
                   when 'enterprise-attack' then 1
                   when 'ics-attack' then 2
                   else 3
                 end asc
        limit 1;
        """,
        tuple(params),
    )

    if not row:
        # Thử khớp theo bí danh (aliases) trong JSONB nếu tra theo tên như OceanLotus
        alias_params: List[Any] = [f"%{ident}%"]
        if domain:
            alias_params.append(domain)
        row = await db.fetch_one_sql(
            f"""
            select *
            from public.attack_objects
            where {type_clause}
              and not revoked and not deprecated
              and (name ilike %s or (data -> 'aliases')::text ilike %s)
              {domain_sql}
            limit 1;
            """,
            (f"%{ident}%", f"%{ident}%", *([domain] if domain else [])),
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đối tượng '{identifier}'.",
        )

    resolved_domain = row["domain"]
    stix_id = row["stix_id"]
    ordered_tactics = await _fetch_tactic_order_map(db, resolved_domain)
    tactic_meta = {t["shortname"]: t for t in ordered_tactics}

    outbound = await db.fetch_all_sql(
        """
        select r.rel_type, r.description as rel_description,
               o.type, o.attack_id, o.name, o.tactics, o.platforms, o.is_subtechnique
        from public.attack_relationships r
        join public.attack_objects o
          on o.domain = r.domain and o.stix_id = r.target_ref
        where r.domain = %s
          and r.source_ref = %s
          and r.rel_type in ('uses', 'attributed-to')
          and not o.revoked and not o.deprecated
        order by o.attack_id;
        """,
        (resolved_domain, stix_id),
    )

    by_tactic: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    flat_techniques: List[Dict[str, Any]] = []
    related_software: List[Dict[str, Any]] = []
    attributed_groups: List[Dict[str, Any]] = []

    for item in outbound:
        if item["type"] == "attack-pattern" and item["rel_type"] == "uses":
            tech_entry = {
                "attack_id": item["attack_id"],
                "name": item["name"],
                "tactics": item["tactics"],
                "platforms": item["platforms"],
                "is_subtechnique": item["is_subtechnique"],
                "procedure_description": item["rel_description"],
            }
            flat_techniques.append(tech_entry)
            for t_sn in item["tactics"] or ["unclassified"]:
                by_tactic[t_sn].append(tech_entry)
        elif item["type"] in ("malware", "tool") and item["rel_type"] == "uses":
            related_software.append(
                {
                    "attack_id": item["attack_id"],
                    "name": item["name"],
                    "type": item["type"],
                    "description": item["rel_description"],
                }
            )
        elif item["type"] == "intrusion-set" and item["rel_type"] == "attributed-to":
            attributed_groups.append(
                {
                    "attack_id": item["attack_id"],
                    "name": item["name"],
                    "description": item["rel_description"],
                }
            )

    grouped_tactics = []
    for tac in ordered_tactics:
        sn = tac["shortname"]
        if sn in by_tactic:
            grouped_tactics.append(
                {
                    "attack_id": tac["attack_id"],
                    "shortname": sn,
                    "name": tac["name"],
                    "order": tac["order"],
                    "techniques": by_tactic[sn],
                }
            )

    return {
        "domain": resolved_domain,
        "type": row["type"],
        "attack_id": row["attack_id"],
        "name": row["name"],
        "description": row["description"],
        "platforms": row["platforms"],
        "metadata": row["data"],
        "technique_count": len(flat_techniques),
        "techniques": flat_techniques,
        "techniques_by_tactic": grouped_tactics,
        "related_software": related_software,
        "attributed_groups": attributed_groups,
    }


@router.get("/groups")
async def list_groups(
    domain: str = Query(default="enterprise-attack"),
    q: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    params: List[Any] = [domain]
    search_clause = ""
    if q and q.strip():
        like_q = f"%{q.strip()}%"
        search_clause = "and (attack_id ilike %s or name ilike %s or (data -> 'aliases')::text ilike %s)"
        params.extend([like_q, like_q, like_q])

    rows = await db.fetch_all_sql(
        f"""
        select domain, attack_id, name, left(description, 260) as summary, data
        from public.attack_objects
        where domain = %s and type = 'intrusion-set' and not revoked and not deprecated
        {search_clause}
        order by name asc;
        """,
        tuple(params),
    )
    return {"domain": domain, "count": len(rows), "items": rows}


@router.get("/groups/{group_id}")
async def get_group(
    group_id: str,
    domain: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    return await _get_entity_detail(db, "intrusion-set", group_id, domain)


@router.get("/software")
async def list_software(
    domain: str = Query(default="enterprise-attack"),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    params: List[Any] = [domain]
    search_clause = ""
    if q and q.strip():
        like_q = f"%{q.strip()}%"
        search_clause = "and (attack_id ilike %s or name ilike %s)"
        params.extend([like_q, like_q])
    params.append(limit)

    rows = await db.fetch_all_sql(
        f"""
        select domain, type, attack_id, name, platforms, left(description, 240) as summary, data
        from public.attack_objects
        where domain = %s and type in ('malware', 'tool') and not revoked and not deprecated
        {search_clause}
        order by name asc
        limit %s;
        """,
        tuple(params),
    )
    return {"domain": domain, "count": len(rows), "items": rows}


@router.get("/software/{software_id}")
async def get_software(
    software_id: str,
    domain: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    return await _get_entity_detail(db, "software", software_id, domain)


@router.get("/campaigns")
async def list_campaigns(
    domain: str = Query(default="enterprise-attack"),
    q: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    params: List[Any] = [domain]
    search_clause = ""
    if q and q.strip():
        like_q = f"%{q.strip()}%"
        search_clause = "and (attack_id ilike %s or name ilike %s)"
        params.extend([like_q, like_q])

    rows = await db.fetch_all_sql(
        f"""
        select domain, attack_id, name, left(description, 260) as summary, data
        from public.attack_objects
        where domain = %s and type = 'campaign' and not revoked and not deprecated
        {search_clause}
        order by (data ->> 'first_seen') desc nulls last, name asc;
        """,
        tuple(params),
    )
    return {"domain": domain, "count": len(rows), "items": rows}


@router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    domain: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    return await _get_entity_detail(db, "campaign", campaign_id, domain)


@router.get("/campaigns/{campaign_id}/chain")
async def get_campaign_attack_chain(
    campaign_id: str,
    domain: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Trả về chuỗi tấn công của Campaign đã sắp xếp theo thứ tự Tactic để vẽ đồ thị React Flow."""
    detail = await _get_entity_detail(db, "campaign", campaign_id, domain)
    steps = []
    step_index = 0
    for stage in detail["techniques_by_tactic"]:
        for tech in stage["techniques"]:
            steps.append(
                {
                    "step": step_index,
                    "tactic_id": stage["attack_id"],
                    "tactic_shortname": stage["shortname"],
                    "tactic_name": stage["name"],
                    "tactic_order": stage["order"],
                    "attack_id": tech["attack_id"],
                    "name": tech["name"],
                    "procedure_description": tech["procedure_description"],
                }
            )
            step_index += 1

    return {
        "campaign": {
            "domain": detail["domain"],
            "attack_id": detail["attack_id"],
            "name": detail["name"],
            "description": detail["description"],
            "metadata": detail["metadata"],
            "attributed_groups": detail["attributed_groups"],
        },
        "stages": detail["techniques_by_tactic"],
        "steps": steps,
    }


@router.get("/diff")
async def get_version_diff(
    domain: str = Query(default="enterprise-attack"),
    from_ver: Optional[str] = Query(default=None, alias="from"),
    to_ver: Optional[str] = Query(default=None, alias="to"),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """So sánh 2 phiên bản trong bảng attack_object_snapshots."""
    if domain not in SUPPORTED_DOMAINS:
        raise HTTPException(status_code=400, detail=f"Domain '{domain}' không hợp lệ.")

    avail_rows = await db.fetch_all_sql(
        """
        select distinct version
        from public.attack_object_snapshots
        where domain = %s;
        """,
        (domain,),
    )
    from packaging.version import InvalidVersion, Version

    def _vkey(v: str):
        try:
            return (1, Version(v.lstrip("vV")))
        except InvalidVersion:
            return (0, v)

    available = sorted([r["version"] for r in avail_rows], key=_vkey, reverse=True)
    if len(available) < 2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cần ít nhất 2 phiên bản snapshot của {domain} để so sánh.",
        )

    resolved_to = to_ver or available[0]
    # Mặc định ưu tiên so với bản major trước (vd 19.x -> 20.1) để thấy rõ bức tranh thay đổi lớn
    if from_ver:
        resolved_from = from_ver
    else:
        to_major = resolved_to.split(".")[0]
        major_diff_candidates = [v for v in available if v != resolved_to and v.split(".")[0] != to_major]
        resolved_from = major_diff_candidates[0] if major_diff_candidates else available[1]

    old_rows = await db.fetch_all_sql(
        "select * from public.attack_object_snapshots where domain = %s and version = %s;",
        (domain, resolved_from),
    )
    new_rows = await db.fetch_all_sql(
        "select * from public.attack_object_snapshots where domain = %s and version = %s;",
        (domain, resolved_to),
    )

    diff_data = compute_version_diff(old_rows, new_rows)
    return {
        "domain": domain,
        "from_version": resolved_from,
        "to_version": resolved_to,
        "available_versions": available,
        **diff_data,
    }


@router.get("/export/navigator")
async def export_navigator_layer(
    layer_id: str = Query(...),
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Xuất Coverage Layer từ Supabase ra định dạng chuẩn ATT&CK Navigator Layer Format v4.5."""
    layer = await db.fetch_one_sql(
        """
        select id, user_id, name, description, domain, techniques, shared
        from public.coverage_layers
        where id::text = %s and (user_id::text = %s or shared = true)
        limit 1;
        """,
        (layer_id.strip(), user.id),
    )
    if not layer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy Coverage Layer hoặc bạn không có quyền truy cập.",
        )

    ver_row = await db.fetch_one_sql(
        "select version from public.attack_versions where domain = %s and is_latest = true limit 1;",
        (layer["domain"],),
    )
    attack_ver = (ver_row["version"].split(".")[0]) if ver_row else "20"

    nav_techniques = []
    for item in layer["techniques"] or []:
        tid = item.get("techniqueID") or item.get("attack_id")
        if not tid:
            continue
        score = int(item.get("score", 100))
        entry: Dict[str, Any] = {
            "techniqueID": tid,
            "score": score,
            "color": item.get("color") or ("#10b981" if score >= 70 else "#f59e0b"),
            "comment": item.get("comment") or "Đánh dấu từ ATT&CK Lab Coverage",
            "enabled": True,
            "showSubtechniques": True,
        }
        if item.get("tactic"):
            entry["tactic"] = item["tactic"]
        nav_techniques.append(entry)

    return {
        "name": layer["name"],
        "versions": {
            "attack": attack_ver,
            "navigator": "5.1.0",
            "layer": "4.5",
        },
        "domain": layer["domain"],
        "description": layer["description"] or "Xuất từ ATT&CK Lab",
        "sorting": 0,
        "layout": {
            "layout": "side",
            "aggregateFunction": "average",
            "showID": True,
            "showName": True,
            "showAggregateScores": False,
            "countUnscored": False,
            "expandedSubtechniques": "annotated",
        },
        "hideDisabled": False,
        "techniques": nav_techniques,
        "gradient": {
            "colors": ["#ef4444", "#f59e0b", "#10b981"],
            "minValue": 0,
            "maxValue": 100,
        },
        "legendItems": [
            {"label": "Đã có khả năng phát hiện tốt", "color": "#10b981"},
            {"label": "Phát hiện một phần / cần tinh chỉnh", "color": "#f59e0b"},
        ],
    }

