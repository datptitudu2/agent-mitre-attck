"""So sánh sự thay đổi (Diff) giữa 2 phiên bản ATT&CK dựa trên bảng nhẹ attack_object_snapshots."""

from typing import Any, Dict, List


def compute_version_diff(
    from_rows: List[Dict[str, Any]],
    to_rows: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Phân loại đối tượng giữa bản cũ (from) và bản mới (to): added, modified, deprecated, revoked."""
    old_by_id = {r["stix_id"]: r for r in from_rows}
    new_by_id = {r["stix_id"]: r for r in to_rows}

    added: List[Dict[str, Any]] = []
    modified: List[Dict[str, Any]] = []
    deprecated: List[Dict[str, Any]] = []
    revoked: List[Dict[str, Any]] = []

    for stix_id, cur in new_by_id.items():
        prev = old_by_id.get(stix_id)
        cur_active = not cur.get("revoked") and not cur.get("deprecated")

        item_summary = {
            "stix_id": stix_id,
            "attack_id": cur["attack_id"],
            "type": cur["type"],
            "name": cur["name"],
            "is_subtechnique": bool(cur.get("is_subtechnique")),
            "tactics": cur.get("tactics") or [],
            "replaced_by_attack_id": cur.get("replaced_by_attack_id"),
        }

        if prev is None:
            if cur_active:
                added.append(item_summary)
            continue

        prev_was_active = not prev.get("revoked") and not prev.get("deprecated")

        if prev_was_active and cur.get("revoked"):
            revoked.append(item_summary)
        elif prev_was_active and cur.get("deprecated"):
            deprecated.append(item_summary)
        elif cur_active and prev.get("content_hash") != cur.get("content_hash"):
            if prev.get("name") != cur.get("name"):
                item_summary["previous_name"] = prev.get("name")
            modified.append(item_summary)

    for bucket in (added, modified, deprecated, revoked):
        bucket.sort(key=lambda x: (x["type"], x["attack_id"]))

    return {
        "counts": {
            "added": len(added),
            "modified": len(modified),
            "deprecated": len(deprecated),
            "revoked": len(revoked),
        },
        "added": added,
        "modified": modified,
        "deprecated": deprecated,
        "revoked": revoked,
    }

