"""Unit test Phase 2: Kiểm chứng STIX 2.1 Parser (Stealth/Defense Impairment, Detection Strategy -> Analytic -> Data Component, Revoked-by) & Diff Engine."""

from apps.api.parser.diff_engine import compute_version_diff
from apps.api.parser.stix_loader import DomainVersionInfo, select_target_and_previous_version
from apps.api.parser.stix_mapper import build_snapshots_only, parse_stix_bundle


def _build_fixture_stix_bundle(include_ai_tech: bool = True) -> dict:
    objects = [
        {
            "type": "x-mitre-matrix",
            "id": "x-mitre-matrix--ent",
            "name": "Enterprise ATT&CK",
            "tactic_refs": [
                "x-mitre-tactic--stealth",
                "x-mitre-tactic--def-imp",
            ],
        },
        {
            "type": "x-mitre-tactic",
            "id": "x-mitre-tactic--stealth",
            "name": "Stealth",
            "x_mitre_shortname": "stealth",
            "external_references": [{"source_name": "mitre-attack", "external_id": "TA0005"}],
        },
        {
            "type": "x-mitre-tactic",
            "id": "x-mitre-tactic--def-imp",
            "name": "Defense Impairment",
            "x_mitre_shortname": "defense-impairment",
            "external_references": [{"source_name": "mitre-attack", "external_id": "TA0112"}],
        },
        {
            "type": "attack-pattern",
            "id": "attack-pattern--parent",
            "name": "Impair Defenses",
            "description": "Adversaries may maliciously modify components of a victim environment.",
            "x_mitre_is_subtechnique": False,
            "x_mitre_platforms": ["Windows", "Linux"],
            "kill_chain_phases": [
                {"kill_chain_name": "mitre-attack", "phase_name": "defense-impairment"}
            ],
            "external_references": [{"source_name": "mitre-attack", "external_id": "T1562"}],
        },
        {
            "type": "attack-pattern",
            "id": "attack-pattern--sub",
            "name": "Disable or Modify Tools",
            "description": "Subtechnique disabling security tools.",
            "x_mitre_is_subtechnique": True,
            "x_mitre_platforms": ["Windows"],
            "kill_chain_phases": [
                {"kill_chain_name": "mitre-attack", "phase_name": "defense-impairment"}
            ],
            "external_references": [{"source_name": "mitre-attack", "external_id": "T1562.001"}],
        },
        {
            "type": "attack-pattern",
            "id": "attack-pattern--old",
            "name": "Disabling Security Tools (Legacy)",
            "revoked": True,
            "external_references": [{"source_name": "mitre-attack", "external_id": "T1089"}],
        },
        {
            "type": "intrusion-set",
            "id": "intrusion-set--apt32",
            "name": "APT32",
            "aliases": ["APT32", "OceanLotus"],
            "external_references": [{"source_name": "mitre-attack", "external_id": "G0050"}],
        },
        {
            "type": "x-mitre-data-component",
            "id": "x-mitre-data-component--dc1",
            "name": "Service Modification",
            "description": "Modification of OS service state.",
            "external_references": [{"source_name": "mitre-attack", "external_id": "DC0075"}],
        },
        {
            "type": "x-mitre-analytic",
            "id": "x-mitre-analytic--an1",
            "name": "Analytic 0001",
            "description": "Detect stopping security services.",
            "x_mitre_platforms": ["Windows"],
            "x_mitre_mutable_elements": [
                {"field": "ServiceName", "description": "EDR service names"}
            ],
            "x_mitre_log_source_references": [
                {
                    "x_mitre_data_component_ref": "x-mitre-data-component--dc1",
                    "name": "WinEventLog:System",
                    "channel": "EventCode=7036",
                }
            ],
            "external_references": [{"source_name": "mitre-attack", "external_id": "AN0001"}],
        },
        {
            "type": "x-mitre-detection-strategy",
            "id": "x-mitre-detection-strategy--det1",
            "name": "Detect Security Tool Tampering",
            "x_mitre_analytic_refs": ["x-mitre-analytic--an1"],
            "external_references": [{"source_name": "mitre-attack", "external_id": "DET0001"}],
        },
        {
            "type": "relationship",
            "id": "relationship--sub",
            "relationship_type": "subtechnique-of",
            "source_ref": "attack-pattern--sub",
            "target_ref": "attack-pattern--parent",
        },
        {
            "type": "relationship",
            "id": "relationship--revoked",
            "relationship_type": "revoked-by",
            "source_ref": "attack-pattern--old",
            "target_ref": "attack-pattern--sub",
        },
        {
            "type": "relationship",
            "id": "relationship--uses",
            "relationship_type": "uses",
            "source_ref": "intrusion-set--apt32",
            "target_ref": "attack-pattern--parent",
            "description": "APT32 impaired host defenses.",
        },
        {
            "type": "relationship",
            "id": "relationship--detects",
            "relationship_type": "detects",
            "source_ref": "x-mitre-detection-strategy--det1",
            "target_ref": "attack-pattern--parent",
        },
    ]

    if include_ai_tech:
        objects.append(
            {
                "type": "attack-pattern",
                "id": "attack-pattern--ai",
                "name": "Prompt Injection",
                "description": "Adversaries craft inputs to manipulate LLM behavior.",
                "x_mitre_is_subtechnique": False,
                "x_mitre_platforms": ["AI"],
                "kill_chain_phases": [
                    {"kill_chain_name": "mitre-attack", "phase_name": "stealth"}
                ],
                "external_references": [{"source_name": "mitre-attack", "external_id": "T9999"}],
            }
        )

    return {"type": "bundle", "id": "bundle--fixture", "objects": objects}


def test_parse_stix_bundle_stats_revoked_and_detection_links():
    v19_bundle = _build_fixture_stix_bundle(include_ai_tech=False)
    v19_snaps = build_snapshots_only("enterprise-attack", "19.2", v19_bundle)
    prev_map = {s["stix_id"]: s for s in v19_snaps}

    v20_bundle = _build_fixture_stix_bundle(include_ai_tech=True)
    parsed = parse_stix_bundle(
        domain="enterprise-attack",
        version="20.1",
        bundle=v20_bundle,
        prev_snapshots_by_stix_id=prev_map,
    )

    assert parsed.stats["tactics"] == 2
    assert parsed.stats["techniques"] == 2  # T1089 bị revoked nên không tính vào active!
    assert parsed.stats["subtechniques"] == 1
    assert parsed.stats["groups"] == 1
    assert parsed.stats["detection_strategies"] == 1
    assert parsed.stats["analytics"] == 1
    assert parsed.stats["data_components"] == 1

    by_id = {o["attack_id"]: o for o in parsed.objects}
    assert by_id["T1089"]["revoked"] is True
    assert by_id["T1089"]["replaced_by_attack_id"] == "T1562.001"
    assert by_id["T1562.001"]["parent_attack_id"] == "T1562"
    assert by_id["T1562"]["usage_count"] == 1
    assert by_id["T9999"]["is_new"] is True
    assert by_id["DET0001"]["data"]["analytic_refs"] == ["x-mitre-analytic--an1"]
    assert len(by_id["AN0001"]["data"]["log_source_references"]) == 1

    # Kiểm tra diff engine
    diff = compute_version_diff(v19_snaps, parsed.snapshots)
    assert diff["counts"]["added"] == 1
    assert diff["added"][0]["attack_id"] == "T9999"


def test_semver_version_selection_with_agile_and_patch():
    versions = [
        DomainVersionInfo("enterprise-attack", "20.1", "https://example/20.1.json", ""),
        DomainVersionInfo("enterprise-attack", "20.0", "https://example/20.0.json", ""),
        DomainVersionInfo("enterprise-attack", "19.2", "https://example/19.2.json", ""),
    ]
    target, prev = select_target_and_previous_version(versions, "latest")
    assert target.version == "20.1"
    assert prev is not None and prev.version == "20.0"
