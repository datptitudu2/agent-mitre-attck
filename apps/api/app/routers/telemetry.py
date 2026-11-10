"""Router cho Telemetry Workbench & Agent Telemetry Planner (/api/telemetry)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.db import SupabaseDataClient, get_db_client

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


class PlanRequest(BaseModel):
    selected_collector_ids: List[str] = Field(default_factory=list)


class GreedyGain(BaseModel):
    collector_id: str
    collector_name: str
    os: str
    additional_techniques: int
    marginal_gain_pct: float
    key_unlocked_capabilities: List[str] = Field(default_factory=list)


class TacticCoverage(BaseModel):
    covered: int
    total: int
    percentage: float


class PlanResponse(BaseModel):
    covered_techniques_count: int
    total_techniques_count: int
    coverage_percentage: float
    tactics_coverage: Dict[str, TacticCoverage]
    greedy_recommendations: List[GreedyGain]
    uncovered_techniques_sample: List[Dict[str, Any]]


@router.get("/collectors")
async def list_collectors(
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Danh sách các telemetry collectors và số lượng sự kiện/kỹ thuật hỗ trợ."""
    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    c.id, c.name, c.os, c.category, c.is_agentless, c.description, c.doc_url,
                    COUNT(DISTINCT e.id) as events_count,
                    COUNT(DISTINCT m.technique_id) as techniques_covered_count
                FROM public.telemetry_collectors c
                LEFT JOIN public.collector_events e ON e.collector_id = c.id
                LEFT JOIN public.technique_telemetry_matrix m ON c.id = ANY(m.capable_collectors)
                GROUP BY c.id, c.name, c.os, c.category, c.is_agentless, c.description, c.doc_url
                ORDER BY techniques_covered_count DESC;
            """)
            collectors = cur.fetchall()

            cur.execute("""
                SELECT id, collector_id, event_code, event_name, description, sample_payload, fields_schema
                FROM public.collector_events
                ORDER BY collector_id, event_code;
            """)
            events = cur.fetchall()

    events_by_col: Dict[str, List[Dict[str, Any]]] = {}
    for ev in events:
        col_id = ev["collector_id"]
        events_by_col.setdefault(col_id, []).append(ev)

    result = []
    for col in collectors:
        c_dict = dict(col)
        c_dict["events"] = events_by_col.get(col["id"], [])
        result.append(c_dict)

    return {"collectors": result}


@router.post("/plan", response_model=PlanResponse)
async def calculate_telemetry_plan(
    payload: PlanRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Tính toán độ phủ telemetry theo danh sách collectors được chọn và gợi ý greedy collector tiếp theo."""
    selected = set(payload.selected_collector_ids)

    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            # Lấy toàn bộ ma trận Enterprise
            cur.execute("""
                SELECT technique_id, technique_name, tactics, platforms, required_dcs, capable_collectors
                FROM public.technique_telemetry_matrix;
            """)
            all_matrix = cur.fetchall()

            # Lấy danh sách toàn bộ collectors
            cur.execute("""
                SELECT id, name, os, category FROM public.telemetry_collectors;
            """)
            all_collectors = {r["id"]: r for r in cur.fetchall()}

    total_techs = len(all_matrix)
    if total_techs == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chưa có dữ liệu technique_telemetry_matrix.",
        )

    covered_tech_ids = set()
    uncovered_techs = []
    tactic_totals: Dict[str, int] = {}
    tactic_covered: Dict[str, int] = {}

    for row in all_matrix:
        tid = row["technique_id"]
        tacs = row["tactics"] or []
        for tac in tacs:
            tactic_totals[tac] = tactic_totals.get(tac, 0) + 1

        row_collectors = set(row["capable_collectors"] or [])
        if selected and bool(row_collectors.intersection(selected)):
            covered_tech_ids.add(tid)
            for tac in tacs:
                tactic_covered[tac] = tactic_covered.get(tac, 0) + 1
        else:
            uncovered_techs.append({
                "technique_id": tid,
                "technique_name": row["technique_name"],
                "tactics": tacs,
                "platforms": row["platforms"],
                "capable_collectors": list(row_collectors),
            })

    covered_count = len(covered_tech_ids)
    coverage_pct = round((covered_count / total_techs) * 100, 1)

    tactics_coverage: Dict[str, TacticCoverage] = {}
    for tac, tot in tactic_totals.items():
        cov = tactic_covered.get(tac, 0)
        pct = round((cov / tot) * 100, 1) if tot > 0 else 0.0
        tactics_coverage[tac] = TacticCoverage(covered=cov, total=tot, percentage=pct)

    # Thuật toán Greedy: Với mỗi collector CHƯA ĐƯỢC CHỌN, tính xem nó sẽ bổ sung bao nhiêu kỹ thuật MỚI
    unselected_col_ids = set(all_collectors.keys()) - selected
    greedy_recommendations: List[GreedyGain] = []

    for cid in unselected_col_ids:
        c_info = all_collectors[cid]
        # Đếm số kỹ thuật trong uncovered_techs mà collector này có thể cover
        marginal_techs = [
            t for t in uncovered_techs
            if cid in t["capable_collectors"]
        ]
        marginal_count = len(marginal_techs)
        marginal_pct = round((marginal_count / total_techs) * 100, 1)

        key_caps = []
        if cid == "sysmon":
            key_caps = ["Process Creation (EID 1)", "Network Connect (EID 3)", "DNS Query (EID 22)"]
        elif cid == "winevent_security":
            key_caps = ["Process 4688", "Logon 4624/4625", "Service 7045"]
        elif cid == "linux_auditd":
            key_caps = ["SYSCALL execve", "openat / file modify", "setuid privilege"]
        elif cid == "linux_ebpf":
            key_caps = ["kprobe process_exec", "K8s Container telemetry", "zero-latency"]
        elif cid == "zeek_nsm":
            key_caps = ["L7 Protocol parsing", "DNS tunneling", "TLS SNI inspection"]
        elif cid == "aws_cloudtrail":
            key_caps = ["IAM role assumption", "S3 Bucket modifications", "Cloud persistence"]
        elif cid == "azure_activity":
            key_caps = ["Entra ID authentication", "OAuth app consent", "Azure RBAC"]
        elif cid == "mde_edr":
            key_caps = ["Deep endpoint telemetry", "DeviceProcessEvents", "In-memory inspection"]

        greedy_recommendations.append(
            GreedyGain(
                collector_id=cid,
                collector_name=c_info["name"],
                os=c_info["os"],
                additional_techniques=marginal_count,
                marginal_gain_pct=marginal_pct,
                key_unlocked_capabilities=key_caps,
            )
        )

    greedy_recommendations.sort(key=lambda x: x.additional_techniques, reverse=True)

    return PlanResponse(
        covered_techniques_count=covered_count,
        total_techniques_count=total_techs,
        coverage_percentage=coverage_pct,
        tactics_coverage=tactics_coverage,
        greedy_recommendations=greedy_recommendations,
        uncovered_techniques_sample=uncovered_techs[:15],
    )


@router.get("/annotated-logs")
async def list_annotated_logs(
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Danh sách tất cả mẫu log thực chiến có chú thích chi tiết."""
    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    s.id, s.technique_id, s.technique_name, s.collector_id,
                    c.name as collector_name, c.os as collector_os,
                    s.scenario_title, s.scenario_description, s.raw_log, s.annotations,
                    s.created_at
                FROM public.annotated_log_samples s
                JOIN public.telemetry_collectors c ON c.id = s.collector_id
                ORDER BY s.technique_id;
            """)
            logs = cur.fetchall()
    return {"logs": logs}


@router.get("/annotated-logs/{technique_id}")
async def get_annotated_logs_for_technique(
    technique_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Lấy mẫu log có chú giải cho một Technique cụ thể (hoặc fallback mẫu cùng họ)."""
    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    s.id, s.technique_id, s.technique_name, s.collector_id,
                    c.name as collector_name, c.os as collector_os,
                    s.scenario_title, s.scenario_description, s.raw_log, s.annotations,
                    s.created_at
                FROM public.annotated_log_samples s
                JOIN public.telemetry_collectors c ON c.id = s.collector_id
                WHERE s.technique_id = %s OR s.technique_id LIKE %s
                ORDER BY (s.technique_id = %s) DESC;
            """, (technique_id, f"{technique_id.split('.')[0]}%", technique_id))
            logs = cur.fetchall()

    return {"technique_id": technique_id, "logs": logs}

