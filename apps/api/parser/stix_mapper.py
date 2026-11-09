"""Bộ chuyển đổi STIX 2.1 Bundle thành dữ liệu chuẩn hoá cho ATT&CK Lab.

Đã kiểm chứng trực tiếp trên dữ liệu thật của MITRE ATT&CK v20.1 (Enterprise, Mobile, ICS):
- Thứ tự cột Tactic đọc từ `x-mitre-matrix.tactic_refs` (Enterprise = 15 tactics).
- Chuỗi phát hiện mới:
    `x-mitre-detection-strategy` --(relationship: detects)--> `attack-pattern`
    `x-mitre-detection-strategy.x_mitre_analytic_refs[]` ---> `x-mitre-analytic`
    `x-mitre-analytic.x_mitre_log_source_references[].x_mitre_data_component_ref` ---> `x-mitre-data-component`
- ICS Asset: `attack-pattern` --(relationship: targets)--> `x-mitre-asset` (hỗ trợ cả chiều ngược dự phòng).
- Revoked/Deprecated: ẩn khỏi thống kê & Matrix active, nhưng lưu kèm `replaced_by_attack_id` (từ `revoked-by`).
"""

from collections import defaultdict
from dataclasses import dataclass
import hashlib
import json
from typing import Any, Dict, List, Optional, Set, Tuple

MITRE_SOURCES = {
    "mitre-attack",
    "mitre-mobile-attack",
    "mitre-ics-attack",
}

SUPPORTED_OBJECT_TYPES = {
    "x-mitre-tactic",
    "attack-pattern",
    "intrusion-set",
    "malware",
    "tool",
    "campaign",
    "course-of-action",
    "x-mitre-detection-strategy",
    "x-mitre-analytic",
    "x-mitre-data-component",
    "x-mitre-data-source",
    "x-mitre-asset",
}

SUPPORTED_REL_TYPES = {
    "uses",
    "mitigates",
    "subtechnique-of",
    "detects",
    "attributed-to",
    "targets",
    "revoked-by",
}


@dataclass
class ParsedBundleResult:
    domain: str
    version: str
    released_at: Optional[str]
    stats: Dict[str, int]
    objects: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    snapshots: List[Dict[str, Any]]
    matrix_payload: Dict[str, Any]
    matrix_etag: str


def extract_mitre_ref(obj: Dict[str, Any]) -> Tuple[str, str]:
    """Lấy ATT&CK ID (vd T1059, TA0005, DET0103, AN0110, DC0001) và URL gốc từ external_references."""
    refs = obj.get("external_references") or []
    for ref in refs:
        if ref.get("source_name") in MITRE_SOURCES and ref.get("external_id"):
            return str(ref["external_id"]).strip(), str(ref.get("url") or "").strip()
    for ref in refs:
        if ref.get("external_id"):
            return str(ref["external_id"]).strip(), str(ref.get("url") or "").strip()
    # Một số x-mitre-data-component có thể không có external_id ở bản cũ -> dùng đoạn cuối STIX UUID
    stix_id = str(obj.get("id") or "")
    fallback_id = stix_id.split("--")[-1][:8].upper() if "--" in stix_id else stix_id
    return fallback_id, ""


def _compute_content_hash(obj: Dict[str, Any], tactics: List[str]) -> str:
    """Băm nội dung cốt lõi của đối tượng để phát hiện thay đổi giữa 2 phiên bản."""
    canonical = {
        "name": obj.get("name") or "",
        "description": obj.get("description") or "",
        "platforms": sorted(obj.get("x_mitre_platforms") or []),
        "tactics": sorted(tactics),
        "revoked": bool(obj.get("revoked", False)),
        "deprecated": bool(obj.get("x_mitre_deprecated", False)),
        "analytic_refs": sorted(obj.get("x_mitre_analytic_refs") or []),
        "log_sources": obj.get("x_mitre_log_source_references") or [],
    }
    raw = json.dumps(canonical, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]


def build_snapshots_only(domain: str, version: str, bundle: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Chỉ trích xuất bảng băm nhẹ (~1.5 MB) cho các phiên bản lịch sử phục vụ trang 'Có gì mới' (/diff)."""
    raw_objects = bundle.get("objects") or []
    stix_to_attack_id: Dict[str, str] = {}
    revoked_by_map: Dict[str, str] = {}

    for obj in raw_objects:
        oid = obj.get("id")
        otype = obj.get("type")
        if oid and otype in SUPPORTED_OBJECT_TYPES:
            aid, _ = extract_mitre_ref(obj)
            stix_to_attack_id[oid] = aid

    for obj in raw_objects:
        if obj.get("type") == "relationship" and obj.get("relationship_type") == "revoked-by":
            src = obj.get("source_ref")
            tgt = obj.get("target_ref")
            if src and tgt and tgt in stix_to_attack_id:
                revoked_by_map[src] = stix_to_attack_id[tgt]

    snapshots: List[Dict[str, Any]] = []
    for obj in raw_objects:
        otype = obj.get("type")
        stix_id = obj.get("id")
        if not stix_id or otype not in SUPPORTED_OBJECT_TYPES:
            continue

        attack_id, _ = extract_mitre_ref(obj)
        tactics = [
            str(p.get("phase_name"))
            for p in (obj.get("kill_chain_phases") or [])
            if str(p.get("kill_chain_name") or "").startswith("mitre-") and p.get("phase_name")
        ]
        snapshots.append(
            {
                "domain": domain,
                "version": version,
                "stix_id": stix_id,
                "attack_id": attack_id,
                "type": otype,
                "name": str(obj.get("name") or attack_id),
                "is_subtechnique": bool(obj.get("x_mitre_is_subtechnique", False)),
                "revoked": bool(obj.get("revoked", False)),
                "deprecated": bool(obj.get("x_mitre_deprecated", False)),
                "replaced_by_attack_id": revoked_by_map.get(stix_id),
                "tactics": tactics,
                "content_hash": _compute_content_hash(obj, tactics),
            }
        )
    return snapshots


def parse_stix_bundle(
    domain: str,
    version: str,
    bundle: Dict[str, Any],
    released_at: Optional[str] = None,
    prev_snapshots_by_stix_id: Optional[Dict[str, Dict[str, Any]]] = None,
) -> ParsedBundleResult:
    """Phân tích trọn vẹn STIX 2.1 bundle của bản mới nhất thành cấu trúc lưu DB & Matrix dựng sẵn."""
    raw_objects = bundle.get("objects") or []
    prev_map = prev_snapshots_by_stix_id or {}

    # Bước 1: Quét sơ bộ bảng ánh xạ ID, Matrix tactic order, và các quan hệ đặc biệt
    stix_to_obj: Dict[str, Dict[str, Any]] = {}
    stix_to_attack_id: Dict[str, str] = {}
    matrix_tactic_stix_order: List[str] = []
    collection_modified: Optional[str] = released_at

    for obj in raw_objects:
        oid = obj.get("id")
        otype = obj.get("type")
        if not oid or not otype:
            continue
        stix_to_obj[oid] = obj

        if otype == "x-mitre-collection" and not collection_modified:
            collection_modified = obj.get("modified")
        elif otype == "x-mitre-matrix" and not obj.get("revoked") and not obj.get("x_mitre_deprecated"):
            # Lấy thứ tự cột chuẩn từ x-mitre-matrix
            refs = obj.get("tactic_refs") or []
            if len(refs) > len(matrix_tactic_stix_order):
                matrix_tactic_stix_order = list(refs)

        if otype in SUPPORTED_OBJECT_TYPES:
            aid, _ = extract_mitre_ref(obj)
            stix_to_attack_id[oid] = aid

    # Bước 2: Quét toàn bộ relationships để tìm parent_attack_id, replaced_by_attack_id và tính usage_count
    subtech_parent_map: Dict[str, str] = {}
    revoked_by_map: Dict[str, str] = {}
    tech_actors_used: Dict[str, Set[str]] = defaultdict(set)
    parsed_relationships: List[Dict[str, Any]] = []

    for obj in raw_objects:
        if obj.get("type") != "relationship":
            continue
        if obj.get("revoked") or obj.get("x_mitre_deprecated"):
            continue

        rel_id = str(obj.get("id") or "")
        rel_type = str(obj.get("relationship_type") or "")
        src_ref = str(obj.get("source_ref") or "")
        tgt_ref = str(obj.get("target_ref") or "")
        if not rel_id or rel_type not in SUPPORTED_REL_TYPES or not src_ref or not tgt_ref:
            continue

        src_obj = stix_to_obj.get(src_ref)
        tgt_obj = stix_to_obj.get(tgt_ref)
        if not src_obj or not tgt_obj:
            continue

        if rel_type == "revoked-by":
            if tgt_ref in stix_to_attack_id:
                revoked_by_map[src_ref] = stix_to_attack_id[tgt_ref]

        if rel_type == "subtechnique-of" and tgt_ref in stix_to_attack_id:
            subtech_parent_map[src_ref] = stix_to_attack_id[tgt_ref]

        src_active = not src_obj.get("revoked") and not src_obj.get("x_mitre_deprecated")
        tgt_active = not tgt_obj.get("revoked") and not tgt_obj.get("x_mitre_deprecated")

        if (
            rel_type == "uses"
            and src_active
            and tgt_active
            and tgt_obj.get("type") == "attack-pattern"
            and src_obj.get("type") in ("intrusion-set", "malware", "tool", "campaign")
        ):
            tech_actors_used[tgt_ref].add(src_ref)

        # Cắt gọn mô tả quá dài để giữ tổng DB gọn nhẹ dưới ngưỡng 500 MB mà vẫn đủ ví dụ thực tế
        desc = str(obj.get("description") or "").strip()
        if len(desc) > 1200:
            desc = desc[:1197] + "..."

        parsed_relationships.append(
            {
                "domain": domain,
                "id": rel_id,
                "source_ref": src_ref,
                "target_ref": tgt_ref,
                "rel_type": rel_type,
                "source_type": str(src_obj.get("type") or ""),
                "target_type": str(tgt_obj.get("type") or ""),
                "description": desc,
            }
        )

    # Bước 3: Ánh xạ thứ tự Tactic chuẩn từ x-mitre-matrix
    tactic_order_by_shortname: Dict[str, int] = {}
    ordered_tactic_defs: List[Dict[str, Any]] = []

    for idx, tac_stix_id in enumerate(matrix_tactic_stix_order):
        tac_obj = stix_to_obj.get(tac_stix_id)
        if not tac_obj or tac_obj.get("revoked") or tac_obj.get("x_mitre_deprecated"):
            continue
        shortname = str(tac_obj.get("x_mitre_shortname") or "").strip()
        tac_id, tac_url = extract_mitre_ref(tac_obj)
        tactic_order_by_shortname[shortname] = idx
        ordered_tactic_defs.append(
            {
                "stix_id": tac_stix_id,
                "attack_id": tac_id,
                "shortname": shortname,
                "name": str(tac_obj.get("name") or tac_id),
                "description": str(tac_obj.get("description") or ""),
                "url": tac_url,
                "order": idx,
            }
        )

    # Bước 4: Chuẩn hoá từng đối tượng trong SUPPORTED_OBJECT_TYPES
    parsed_objects: List[Dict[str, Any]] = []
    snapshots: List[Dict[str, Any]] = []
    stats = {
        "tactics": 0,
        "techniques": 0,
        "subtechniques": 0,
        "groups": 0,
        "software": 0,
        "campaigns": 0,
        "mitigations": 0,
        "detection_strategies": 0,
        "analytics": 0,
        "data_components": 0,
        "assets": 0,
    }
    all_platforms: Set[str] = set()

    for obj in raw_objects:
        otype = obj.get("type")
        stix_id = str(obj.get("id") or "")
        if not stix_id or otype not in SUPPORTED_OBJECT_TYPES:
            continue

        attack_id, ext_url = extract_mitre_ref(obj)
        revoked = bool(obj.get("revoked", False))
        deprecated = bool(obj.get("x_mitre_deprecated", False))
        is_active = not revoked and not deprecated
        is_sub = bool(obj.get("x_mitre_is_subtechnique", False))

        platforms = [str(p) for p in (obj.get("x_mitre_platforms") or []) if p]
        if is_active:
            all_platforms.update(platforms)

        tactics: List[str] = []
        if otype == "x-mitre-tactic":
            sn = str(obj.get("x_mitre_shortname") or "").strip()
            if sn:
                tactics = [sn]
        elif otype == "attack-pattern":
            seen_phases: Set[str] = set()
            for phase in obj.get("kill_chain_phases") or []:
                kcn = str(phase.get("kill_chain_name") or "")
                pname = str(phase.get("phase_name") or "")
                if kcn.startswith("mitre-") and pname and pname not in seen_phases:
                    seen_phases.add(pname)
                    tactics.append(pname)
            tactics.sort(key=lambda s: tactic_order_by_shortname.get(s, 999))

        parent_attack_id = subtech_parent_map.get(stix_id)
        if not parent_attack_id and is_sub and "." in attack_id:
            parent_attack_id = attack_id.split(".")[0]

        replaced_by = revoked_by_map.get(stix_id)
        content_hash = _compute_content_hash(obj, tactics)

        prev_snap = prev_map.get(stix_id)
        is_new = bool(prev_map and is_active and prev_snap is None)
        is_changed = bool(
            prev_map
            and is_active
            and prev_snap is not None
            and prev_snap.get("content_hash") != content_hash
        )

        # Chỉ lưu metadata gọn cần cho giao diện trong cột data JSONB (tránh lặp lại description)
        extra_data: Dict[str, Any] = {
            "url": ext_url,
            "version": obj.get("x_mitre_version") or "",
            "created": obj.get("created") or "",
            "modified": obj.get("modified") or "",
        }
        if otype == "x-mitre-tactic":
            extra_data["shortname"] = obj.get("x_mitre_shortname") or ""
            extra_data["order"] = tactic_order_by_shortname.get(extra_data["shortname"], 999)
        elif otype in ("intrusion-set", "campaign"):
            extra_data["aliases"] = obj.get("aliases") or []
            if otype == "campaign":
                extra_data["first_seen"] = obj.get("first_seen") or ""
                extra_data["last_seen"] = obj.get("last_seen") or ""
        elif otype in ("malware", "tool"):
            extra_data["aliases"] = obj.get("x_mitre_aliases") or []
        elif otype == "x-mitre-detection-strategy":
            extra_data["analytic_refs"] = obj.get("x_mitre_analytic_refs") or []
        elif otype == "x-mitre-analytic":
            extra_data["log_source_references"] = obj.get("x_mitre_log_source_references") or []
            extra_data["mutable_elements"] = obj.get("x_mitre_mutable_elements") or []
        elif otype == "x-mitre-data-component":
            extra_data["log_sources"] = obj.get("x_mitre_log_sources") or []
            if obj.get("x_mitre_data_source_ref"):
                extra_data["data_source_ref"] = obj.get("x_mitre_data_source_ref")
        elif otype == "x-mitre-asset":
            extra_data["sectors"] = obj.get("x_mitre_sectors") or []
            extra_data["related_assets"] = obj.get("x_mitre_related_assets") or []

        usage_count = len(tech_actors_used.get(stix_id, set())) if otype == "attack-pattern" else 0

        if is_active:
            if otype == "x-mitre-tactic":
                stats["tactics"] += 1
            elif otype == "attack-pattern":
                if is_sub:
                    stats["subtechniques"] += 1
                else:
                    stats["techniques"] += 1
            elif otype == "intrusion-set":
                stats["groups"] += 1
            elif otype in ("malware", "tool"):
                stats["software"] += 1
            elif otype == "campaign":
                stats["campaigns"] += 1
            elif otype == "course-of-action":
                stats["mitigations"] += 1
            elif otype == "x-mitre-detection-strategy":
                stats["detection_strategies"] += 1
            elif otype == "x-mitre-analytic":
                stats["analytics"] += 1
            elif otype == "x-mitre-data-component":
                stats["data_components"] += 1
            elif otype == "x-mitre-asset":
                stats["assets"] += 1

        parsed_objects.append(
            {
                "domain": domain,
                "stix_id": stix_id,
                "type": otype,
                "attack_id": attack_id,
                "name": str(obj.get("name") or attack_id),
                "description": str(obj.get("description") or ""),
                "platforms": platforms,
                "tactics": tactics,
                "is_subtechnique": is_sub,
                "parent_attack_id": parent_attack_id,
                "revoked": revoked,
                "deprecated": deprecated,
                "replaced_by_attack_id": replaced_by,
                "usage_count": usage_count,
                "is_new": is_new,
                "is_changed": is_changed,
                "data": extra_data,
            }
        )

        snapshots.append(
            {
                "domain": domain,
                "version": version,
                "stix_id": stix_id,
                "attack_id": attack_id,
                "type": otype,
                "name": str(obj.get("name") or attack_id),
                "is_subtechnique": is_sub,
                "revoked": revoked,
                "deprecated": deprecated,
                "replaced_by_attack_id": replaced_by,
                "tactics": tactics,
                "content_hash": content_hash,
            }
        )

    # Bước 5: Dựng sẵn JSON gọn nhẹ cho /api/matrix/{domain}
    active_techs = [
        o for o in parsed_objects
        if o["type"] == "attack-pattern" and not o["revoked"] and not o["deprecated"]
    ]
    subs_by_parent: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for item in active_techs:
        if item["is_subtechnique"] and item["parent_attack_id"]:
            subs_by_parent[item["parent_attack_id"]].append(
                {
                    "attack_id": item["attack_id"],
                    "name": item["name"],
                    "platforms": item["platforms"],
                    "usage_count": item["usage_count"],
                    "is_new": item["is_new"],
                    "is_changed": item["is_changed"],
                }
            )
    for sub_list in subs_by_parent.values():
        sub_list.sort(key=lambda x: x["attack_id"])

    tactic_columns: List[Dict[str, Any]] = []
    for tac in ordered_tactic_defs:
        sn = tac["shortname"]
        col_techniques: List[Dict[str, Any]] = []
        for item in active_techs:
            if item["is_subtechnique"] or sn not in item["tactics"]:
                continue
            children = subs_by_parent.get(item["attack_id"], [])
            # Tổng độ phổ biến của technique cha bao gồm cả các sub-technique con
            combined_usage = item["usage_count"] + sum(c["usage_count"] for c in children)
            col_techniques.append(
                {
                    "attack_id": item["attack_id"],
                    "name": item["name"],
                    "platforms": item["platforms"],
                    "usage_count": combined_usage,
                    "direct_usage_count": item["usage_count"],
                    "is_new": item["is_new"],
                    "is_changed": item["is_changed"],
                    "subtechnique_count": len(children),
                    "subtechniques": children,
                }
            )
        col_techniques.sort(key=lambda x: x["name"].lower())
        tactic_columns.append(
            {
                "attack_id": tac["attack_id"],
                "shortname": sn,
                "name": tac["name"],
                "order": tac["order"],
                "technique_count": len(col_techniques),
                "techniques": col_techniques,
            }
        )

    matrix_payload = {
        "domain": domain,
        "version": version,
        "released_at": collection_modified,
        "stats": stats,
        "platforms": sorted(all_platforms),
        "tactics": tactic_columns,
    }
    raw_matrix_bytes = json.dumps(matrix_payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    matrix_etag = f'W/"{domain}-{version}-{hashlib.sha1(raw_matrix_bytes).hexdigest()[:12]}"'

    return ParsedBundleResult(
        domain=domain,
        version=version,
        released_at=collection_modified,
        stats=stats,
        objects=parsed_objects,
        relationships=parsed_relationships,
        snapshots=snapshots,
        matrix_payload=matrix_payload,
        matrix_etag=matrix_etag,
    )
