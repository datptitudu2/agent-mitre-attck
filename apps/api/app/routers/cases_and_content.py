"""Endpoints đọc Case Studies (content/cases/*.yaml) kết hợp tra cứu động từ dữ liệu STIX 2.1 trong Supabase."""

from collections import defaultdict
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
import yaml

from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.db import SupabaseDataClient, get_db_client

logger = logging.getLogger("attack_lab.routers.cases")
router = APIRouter(tags=["Case Studies & Content"])

REPO_ROOT = Path(__file__).resolve().parents[4]
CASES_DIR = REPO_ROOT / "content" / "cases"


def load_case_yaml_files() -> List[Dict[str, Any]]:
    """Đọc toàn bộ tệp YAML trong content/cases/ theo thứ tự tên tệp."""
    if not CASES_DIR.exists():
        return []
    items: List[Dict[str, Any]] = []
    for path in sorted(CASES_DIR.glob("*.yaml")):
        with path.open("r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh) or {}
            raw["_file"] = path.name
            items.append(raw)
    return items


async def _resolve_source_entity(
    db: SupabaseDataClient,
    domain: str,
    source_type: str,
    lookup_name: str,
) -> Optional[Dict[str, Any]]:
    """Tra cứu thực thể Campaign / Group / Software theo tên (không hard-code ID)."""
    if source_type == "scenario":
        return None

    if source_type == "group":
        type_clause = "type = 'intrusion-set'"
    elif source_type == "software":
        type_clause = "type in ('malware', 'tool')"
    else:
        type_clause = "type = 'campaign'"

    row = await db.fetch_one_sql(
        f"""
        select stix_id, domain, type, attack_id, name, description, data
        from public.attack_objects
        where domain = %s
          and {type_clause}
          and not revoked and not deprecated
          and (lower(name) = %s or (data -> 'aliases')::text ilike %s)
        order by case when lower(name) = %s then 0 else 1 end
        limit 1;
        """,
        (domain, lookup_name.lower(), f'%"{lookup_name}"%', lookup_name.lower()),
    )
    return row


@router.get("/cases")
async def list_case_studies(
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Liệt kê các Case Study hợp lệ (bỏ qua và ghi log nếu thực thể gốc không tồn tại trong DB)."""
    raw_cases = load_case_yaml_files()
    result_items: List[Dict[str, Any]] = []

    for c in raw_cases:
        domain = c.get("domain", "enterprise-attack")
        source_type = c.get("source_type", "campaign")
        lookup_name = c.get("lookup_name", "")

        entity = await _resolve_source_entity(db, domain, source_type, lookup_name)
        if source_type != "scenario" and not entity:
            logger.warning(
                "Bỏ qua case '%s' vì không tìm thấy thực thể '%s' (%s) trong domain %s",
                c.get("slug"),
                lookup_name,
                source_type,
                domain,
            )
            continue

        result_items.append(
            {
                "slug": c["slug"],
                "title": c["title"],
                "subtitle": c.get("subtitle", ""),
                "domain": domain,
                "source_type": source_type,
                "lookup_name": lookup_name,
                "entity_attack_id": entity["attack_id"] if entity else None,
                "entity_name": entity["name"] if entity else lookup_name,
                "year_label": c.get("year_label", ""),
                "difficulty": c.get("difficulty", "Trung bình"),
                "is_hypothetical": bool(c.get("is_hypothetical", False)),
                "disclaimer_vi": c.get("disclaimer_vi"),
                "tags": c.get("tags", []),
                "summary_vi": c.get("summary_vi", "").strip(),
                "why_it_matters_vi": c.get("why_it_matters_vi", "").strip(),
                "step_count": len(c.get("steps") or []),
            }
        )

    return {"count": len(result_items), "items": result_items}


@router.get("/cases/{slug}")
async def get_case_study_detail(
    slug: str,
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Đọc chi tiết 1 Case Study, tự động ghép nối Technique, Procedure, Detection Strategy -> Analytic -> Data Component & Mitigation."""
    raw_cases = load_case_yaml_files()
    target_case = next((c for c in raw_cases if c.get("slug") == slug.strip()), None)
    if not target_case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Case Study '{slug}'.",
        )

    domain = target_case.get("domain", "enterprise-attack")
    source_type = target_case.get("source_type", "campaign")
    lookup_name = target_case.get("lookup_name", "")

    ver_row = await db.fetch_one_sql(
        "select version from public.attack_versions where domain = %s and is_latest = true limit 1;",
        (domain,),
    )
    attack_version = ver_row["version"] if ver_row else "20.1"

    entity = await _resolve_source_entity(db, domain, source_type, lookup_name)
    if source_type != "scenario" and not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Thực thể '{lookup_name}' không tồn tại trong cơ sở dữ liệu hiện hành.",
        )

    # Thu thập danh sách stix_id của thực thể chính + phụ (vd 2016 Ukraine + Industroyer) để lấy mô tả procedure thực tế
    entity_stix_ids: List[str] = []
    if entity:
        entity_stix_ids.append(entity["stix_id"])
    for sec_name in target_case.get("secondary_lookup_names") or []:
        sec_row = await db.fetch_one_sql(
            """
            select stix_id from public.attack_objects
            where domain = %s and lower(name) = %s and not revoked and not deprecated
            limit 1;
            """,
            (domain, sec_name.lower()),
        )
        if sec_row:
            entity_stix_ids.append(sec_row["stix_id"])

    # Lấy thứ tự Tactic chuẩn của domain
    tactic_rows = await db.fetch_all_sql(
        """
        select attack_id, name, tactics, data
        from public.attack_objects
        where domain = %s and type = 'x-mitre-tactic' and not revoked and not deprecated;
        """,
        (domain,),
    )
    tactic_map: Dict[str, Dict[str, Any]] = {}
    for tr in tactic_rows:
        tdata = tr.get("data") or {}
        sn = tdata.get("shortname") or (tr["tactics"][0] if tr.get("tactics") else "")
        tactic_map[sn] = {
            "attack_id": tr["attack_id"],
            "shortname": sn,
            "name": tr["name"],
            "order": int(tdata.get("order", 999)),
        }

    # Tra cứu toàn bộ technique xuất hiện trong steps chỉ bằng 1 truy vấn
    raw_steps = target_case.get("steps") or []
    wanted_names = list({(s.get("technique_name") or "").strip().lower() for s in raw_steps if s.get("technique_name")})
    wanted_ids = list({(s.get("technique_name") or "").strip().upper() for s in raw_steps if s.get("technique_name")})

    tech_rows = await db.fetch_all_sql(
        """
        select stix_id, attack_id, name, description, platforms, tactics,
               is_subtechnique, parent_attack_id, is_new, usage_count,
               revoked, deprecated, replaced_by_attack_id, data
        from public.attack_objects
        where domain = %s
          and type = 'attack-pattern'
          and (lower(name) = any(%s) or upper(attack_id) = any(%s))
        order by (revoked or deprecated) asc, is_subtechnique asc;
        """,
        (domain, wanted_names, wanted_ids),
    )

    # Ưu tiên technique khớp tactic_hint nếu trùng tên (vd Domains / Spearphishing Link)
    tech_candidates_by_name: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    tech_by_id: Dict[str, Dict[str, Any]] = {}
    for tr in tech_rows:
        tech_candidates_by_name[tr["name"].lower()].append(tr)
        if tr.get("attack_id"):
            tech_by_id[tr["attack_id"].upper()] = tr

    chosen_tech_by_step: Dict[int, Optional[Dict[str, Any]]] = {}
    tech_stix_ids: List[str] = []
    for idx, s in enumerate(raw_steps):
        ref = (s.get("technique_name") or "").strip()
        hint = (s.get("tactic_hint") or "").strip()
        chosen: Optional[Dict[str, Any]] = tech_by_id.get(ref.upper())
        if not chosen:
            cands = tech_candidates_by_name.get(ref.lower(), [])
            if hint:
                hint_match = next((c for c in cands if hint in (c.get("tactics") or [])), None)
                chosen = hint_match or (cands[0] if cands else None)
            elif cands:
                chosen = cands[0]
        chosen_tech_by_step[idx] = chosen
        if chosen and chosen["stix_id"] not in tech_stix_ids:
            tech_stix_ids.append(chosen["stix_id"])

    # Lấy mô tả procedure thực tế từ thực thể nguồn -> các technique
    proc_desc_by_tech: Dict[str, str] = {}
    if entity_stix_ids and tech_stix_ids:
        proc_rows = await db.fetch_all_sql(
            """
            select target_ref, description
            from public.attack_relationships
            where domain = %s
              and rel_type = 'uses'
              and source_ref = any(%s)
              and target_ref = any(%s);
            """,
            (domain, entity_stix_ids, tech_stix_ids),
        )
        for pr in proc_rows:
            if pr.get("description") and pr["target_ref"] not in proc_desc_by_tech:
                proc_desc_by_tech[pr["target_ref"]] = pr["description"]

    # Lấy Mitigations cho các technique trong chuỗi
    mitigations_by_tech: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    if tech_stix_ids:
        mit_rows = await db.fetch_all_sql(
            """
            select r.target_ref, r.description as rel_description,
                   m.attack_id, m.name, m.description as mit_description
            from public.attack_relationships r
            join public.attack_objects m
              on m.domain = r.domain and m.stix_id = r.source_ref
            where r.domain = %s
              and r.rel_type = 'mitigates'
              and r.target_ref = any(%s)
              and m.type = 'course-of-action'
              and not m.revoked and not m.deprecated
            order by m.attack_id;
            """,
            (domain, tech_stix_ids),
        )
        for mr in mit_rows:
            if len(mitigations_by_tech[mr["target_ref"]]) < 4:
                mitigations_by_tech[mr["target_ref"]].append(
                    {
                        "attack_id": mr["attack_id"],
                        "name": mr["name"],
                        "description": mr["rel_description"] or mr["mit_description"],
                    }
                )

    # Lấy Detection Strategies -> Analytics -> Data Components cho toàn bộ các bước
    detections_by_tech: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    if tech_stix_ids:
        det_rows = await db.fetch_all_sql(
            """
            select r.target_ref as tech_stix_id,
                   d.stix_id as det_stix_id, d.attack_id, d.name, d.data
            from public.attack_relationships r
            join public.attack_objects d
              on d.domain = r.domain and d.stix_id = r.source_ref
            where r.domain = %s
              and r.rel_type = 'detects'
              and r.target_ref = any(%s)
              and d.type = 'x-mitre-detection-strategy'
              and not d.revoked and not d.deprecated
            order by d.attack_id;
            """,
            (domain, tech_stix_ids),
        )

        all_an_refs: List[str] = []
        for dr in det_rows:
            for aref in (dr.get("data") or {}).get("analytic_refs") or []:
                if aref not in all_an_refs:
                    all_an_refs.append(aref)

        analytics_map: Dict[str, Dict[str, Any]] = {}
        dc_map: Dict[str, Dict[str, Any]] = {}
        if all_an_refs:
            an_rows = await db.fetch_all_sql(
                """
                select stix_id, attack_id, name, description, platforms, data
                from public.attack_objects
                where domain = %s and stix_id = any(%s) and not revoked and not deprecated;
                """,
                (domain, all_an_refs),
            )
            analytics_map = {ar["stix_id"]: ar for ar in an_rows}

            dc_refs: List[str] = []
            for ar in an_rows:
                for ls in (ar.get("data") or {}).get("log_source_references") or []:
                    dcref = ls.get("x_mitre_data_component_ref")
                    if dcref and dcref not in dc_refs:
                        dc_refs.append(dcref)
            if dc_refs:
                dc_rows = await db.fetch_all_sql(
                    """
                    select stix_id, attack_id, name
                    from public.attack_objects
                    where domain = %s and stix_id = any(%s);
                    """,
                    (domain, dc_refs),
                )
                dc_map = {d["stix_id"]: d for d in dc_rows}

        for dr in det_rows:
            tech_sid = dr["tech_stix_id"]
            if len(detections_by_tech[tech_sid]) >= 3:
                continue
            an_list = []
            for aref in ((dr.get("data") or {}).get("analytic_refs") or [])[:3]:
                an_obj = analytics_map.get(aref)
                if not an_obj:
                    continue
                log_sources = []
                for ls in ((an_obj.get("data") or {}).get("log_source_references") or [])[:4]:
                    dc = dc_map.get(ls.get("x_mitre_data_component_ref", ""))
                    log_sources.append(
                        {
                            "name": ls.get("name", ""),
                            "channel": ls.get("channel", ""),
                            "data_component_id": dc["attack_id"] if dc else None,
                            "data_component_name": dc["name"] if dc else None,
                        }
                    )
                an_list.append(
                    {
                        "attack_id": an_obj["attack_id"],
                        "name": an_obj["name"],
                        "description": an_obj["description"],
                        "platforms": an_obj["platforms"] or [],
                        "log_sources": log_sources,
                    }
                )

            detections_by_tech[tech_sid].append(
                {
                    "attack_id": dr["attack_id"],
                    "name": dr["name"],
                    "url": (dr.get("data") or {}).get("url"),
                    "analytics": an_list,
                }
            )

    # Dựng danh sách bước hoàn chỉnh + Navigator Layer JSON
    enriched_steps: List[Dict[str, Any]] = []
    nav_techniques: List[Dict[str, Any]] = []

    for idx, s in enumerate(raw_steps):
        chosen = chosen_tech_by_step.get(idx)
        hint = (s.get("tactic_hint") or "").strip()

        if chosen:
            tech_tactics = chosen.get("tactics") or []
            primary_tactic = hint if hint in tech_tactics else (tech_tactics[0] if tech_tactics else hint)
            tmeta = tactic_map.get(
                primary_tactic,
                {"attack_id": "", "shortname": primary_tactic, "name": primary_tactic, "order": idx + 1},
            )
            sid = chosen["stix_id"]
            step_item = {
                "step_order": int(s.get("step_order", idx + 1)),
                "stage_title_vi": s.get("stage_title_vi", ""),
                "plain_vi": (s.get("plain_vi") or "").strip(),
                "telemetry_vi": (s.get("telemetry_vi") or "").strip(),
                "defender_vi": (s.get("defender_vi") or "").strip(),
                "resolved": True,
                "attack_id": chosen["attack_id"],
                "technique_name": chosen["name"],
                "tactic_shortname": tmeta["shortname"],
                "tactic_name": tmeta["name"],
                "tactic_id": tmeta["attack_id"],
                "tactic_order": tmeta["order"],
                "platforms": chosen.get("platforms") or [],
                "is_subtechnique": bool(chosen.get("is_subtechnique")),
                "is_new": bool(chosen.get("is_new")),
                "revoked": bool(chosen.get("revoked")),
                "deprecated": bool(chosen.get("deprecated")),
                "replaced_by_attack_id": chosen.get("replaced_by_attack_id"),
                "mitre_url": (chosen.get("data") or {}).get("url"),
                "mitre_procedure": proc_desc_by_tech.get(sid),
                "detection_strategies": detections_by_tech.get(sid, []),
                "mitigations": mitigations_by_tech.get(sid, []),
            }
            nav_entry: Dict[str, Any] = {
                "techniqueID": chosen["attack_id"],
                "score": 100,
                "color": "#06b6d4",
                "comment": f"Bước {step_item['step_order']}: {step_item['stage_title_vi']}",
                "enabled": True,
                "showSubtechniques": True,
            }
            if tmeta["shortname"]:
                nav_entry["tactic"] = tmeta["shortname"]
            nav_techniques.append(nav_entry)
        else:
            step_item = {
                "step_order": int(s.get("step_order", idx + 1)),
                "stage_title_vi": s.get("stage_title_vi", ""),
                "plain_vi": (s.get("plain_vi") or "").strip(),
                "telemetry_vi": (s.get("telemetry_vi") or "").strip(),
                "defender_vi": (s.get("defender_vi") or "").strip(),
                "resolved": False,
                "attack_id": "UNRESOLVED",
                "technique_name": s.get("technique_name", ""),
                "tactic_shortname": hint or "unknown",
                "tactic_name": hint or "Unknown",
                "tactic_id": "",
                "tactic_order": idx + 1,
                "platforms": [],
                "is_subtechnique": False,
                "is_new": False,
                "revoked": False,
                "deprecated": False,
                "replaced_by_attack_id": None,
                "mitre_url": None,
                "mitre_procedure": None,
                "detection_strategies": [],
                "mitigations": [],
            }

        enriched_steps.append(step_item)

    navigator_layer = {
        "name": f"ATT&CK Lab Case: {target_case['title']}",
        "versions": {
            "attack": attack_version.split(".")[0],
            "navigator": "5.1.0",
            "layer": "4.5",
        },
        "domain": domain,
        "description": target_case.get("summary_vi", "").strip(),
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
    }

    return {
        "slug": target_case["slug"],
        "title": target_case["title"],
        "subtitle": target_case.get("subtitle", ""),
        "domain": domain,
        "attack_version": attack_version,
        "source_type": source_type,
        "lookup_name": lookup_name,
        "year_label": target_case.get("year_label", ""),
        "difficulty": target_case.get("difficulty", "Trung bình"),
        "is_hypothetical": bool(target_case.get("is_hypothetical", False)),
        "disclaimer_vi": target_case.get("disclaimer_vi"),
        "tags": target_case.get("tags", []),
        "summary_vi": (target_case.get("summary_vi") or "").strip(),
        "why_it_matters_vi": (target_case.get("why_it_matters_vi") or "").strip(),
        "entity": (
            {
                "attack_id": entity["attack_id"],
                "name": entity["name"],
                "type": entity["type"],
                "description": entity["description"],
                "url": (entity.get("data") or {}).get("url"),
            }
            if entity
            else None
        ),
        "steps": enriched_steps,
        "navigator_layer": navigator_layer,
    }
