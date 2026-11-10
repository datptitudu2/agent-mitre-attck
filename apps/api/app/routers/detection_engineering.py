"""Router phục vụ Rule Explorer (SigmaHQ), ML Feature Recipes và OS Telemetry Matrix (/api/detection)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.db import SupabaseDataClient, get_db_client

router = APIRouter(prefix="/detection", tags=["Detection Engineering"])


@router.get("/sigma-rules")
async def list_sigma_rules(
    technique_id: Optional[str] = Query(None, description="Lọc theo Technique ID (vd: T1059.001)"),
    level: Optional[str] = Query(None, description="Mức độ nghiêm trọng (low, medium, high, critical)"),
    search: Optional[str] = Query(None, description="Tìm kiếm tiêu đề hoặc mô tả"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Danh sách các luật phát hiện SigmaHQ chính thức kèm bộ lọc linh hoạt."""
    conditions = []
    params = []

    if technique_id:
        conditions.append("%s = ANY(techniques)")
        params.append(technique_id.strip())

    if level:
        conditions.append("level = %s")
        params.append(level.strip().lower())

    if search:
        conditions.append("(title ILIKE %s OR description ILIKE %s)")
        params.extend([f"%{search.strip()}%", f"%{search.strip()}%"])

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    query = f"""
        SELECT 
            id, title, status, description, author, references_list, tags, techniques,
            logsource, detection, raw_yaml, level, falsepositives, created_at
        FROM public.sigma_rules
        {where_clause}
        ORDER BY 
            CASE level 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                ELSE 4 
            END,
            title ASC;
    """

    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            rules = cur.fetchall()

    return {"rules": rules, "total": len(rules)}


@router.get("/sigma-rules/{rule_id}")
async def get_sigma_rule(
    rule_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Chi tiết một luật SigmaHQ theo mã ID."""
    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    id, title, status, description, author, references_list, tags, techniques,
                    logsource, detection, raw_yaml, level, falsepositives, created_at
                FROM public.sigma_rules
                WHERE id = %s;
            """, (rule_id,))
            rule = cur.fetchone()

    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy luật SigmaHQ với mã {rule_id}.",
        )

    return {"rule": rule}


@router.get("/ml-recipes")
async def list_ml_recipes(
    technique_id: Optional[str] = Query(None, description="Lọc theo Technique ID (vd: T1059.001)"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Danh sách các công thức trích xuất đặc trưng Machine Learning cho phát hiện bất thường."""
    query = """
        SELECT 
            id, technique_id, technique_name, feature_name, feature_formula,
            extraction_logic_sql, extraction_logic_python, intuition_vietnamese,
            expected_tp_signal, expected_fp_noise, colab_notebook_url, difficulty, created_at
        FROM public.ml_feature_recipes
    """
    params = []
    if technique_id:
        query += " WHERE technique_id = %s OR technique_id LIKE %s"
        params.extend([technique_id, f"{technique_id.split('.')[0]}%"])

    query += " ORDER BY difficulty ASC, feature_name ASC;"

    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params) if params else None)
            recipes = cur.fetchall()

    return {"recipes": recipes, "total": len(recipes)}


@router.get("/os-telemetry")
async def get_os_telemetry_matrix(
    user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
):
    """Bảng đối soát song song Telemetry giữa Windows và Linux cho cùng một hành vi tấn công."""
    with db.get_pg_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    id, action_category, behavior_description,
                    windows_source, windows_event, windows_fields,
                    linux_source, linux_event, linux_fields, notes
                FROM public.os_telemetry_matrix
                ORDER BY action_category ASC;
            """)
            matrix = cur.fetchall()

    return {"matrix": matrix}


@router.get("/hovercards")
async def get_knowledge_hovercards(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Từ điển thuật ngữ an ninh mạng chuẩn hoá phục vụ Knowledge Hovercards."""
    terms = {
        "EDR": {
            "term": "EDR (Endpoint Detection and Response)",
            "definition": "Phần mềm cài đặt trực tiếp trên thiết bị đầu cuối nhằm liên tục ghi nhận sự kiện cấp kernel (tiến trình, bộ nhớ, kết nối mạng) để phát hiện và ngăn chặn hành vi xâm nhập.",
            "example": "Microsoft Defender for Endpoint, CrowdStrike Falcon, SentinelOne."
        },
        "SIEM": {
            "term": "SIEM (Security Information and Event Management)",
            "definition": "Hệ thống trung tâm thu thập, chuẩn hóa và tương quan hóa nhật ký từ nhiều nguồn (Server, Firewall, EDR) để phân tích đe dọa diện rộng.",
            "example": "Splunk, Microsoft Sentinel, Elastic Security, QRadar."
        },
        "LotL": {
            "term": "Living off the Land (LotL)",
            "definition": "Kỹ thuật của kẻ tấn công sử dụng các công cụ hợp pháp có sẵn trên hệ điều hành (như PowerShell, Certutil, WMI, BASH) thay vì tải mã độc ngoại lai lên đĩa để né tránh Antivirus.",
            "example": "Dùng PowerShell tải payload từ URL hoặc dùng schtasks tạo cron ngầm."
        },
        "Parent-Child": {
            "term": "Quan hệ Tiến trình Cha–Con (Parent-Child)",
            "definition": "Mối liên kết gia phả giữa tiến trình khởi tạo (Parent) và tiến trình được sinh ra (Child). Sự bất thường trong cặp cha-con là một trong những chỉ báo xâm nhập mạnh mẽ nhất.",
            "example": "EXCEL.EXE sinh powershell.exe, hoặc sqlservr.exe sinh cmd.exe."
        },
        "Sigma": {
            "term": "Sigma Rule (Quy tắc Sigma)",
            "definition": "Định dạng chữ ký phát hiện mở độc lập với nền tảng SIEM, cho phép mô tả logic phát hiện một lần bằng YAML rồi biên dịch sang Splunk SPL, Elastic KQL, hay Sentinel KQL.",
            "example": "Luật phát hiện PowerShell ẩn cửa sổ chạy trên bất kỳ hệ thống SIEM nào."
        },
        "Entropy": {
            "term": "Entropy Shannon",
            "definition": "Thước đo độ ngẫu nhiên của một chuỗi ký tự. Dữ liệu văn bản tự nhiên có entropy thấp (3.5 - 4.3), trong khi shellcode, khóa mã hóa và chuỗi Base64 có entropy rất cao (> 5.2).",
            "example": "Phát hiện lệnh PowerShell bị obfuscate hoặc DNS tunneling subdomain."
        },
        "auditd": {
            "term": "Linux Audit Daemon (auditd)",
            "definition": "Hệ thống kiểm toán cấp nhân (kernel-space) chuẩn của Linux, theo dõi các lệnh gọi hệ thống (SYSCALL: execve, open, connect, setuid) và truy cập tập tin nhạy cảm.",
            "example": "Giám sát việc sửa đổi file /etc/sudoers hoặc ai đó thực thi curl."
        },
        "eBPF": {
            "term": "eBPF (Extended Berkeley Packet Filter)",
            "definition": "Công nghệ cho phép chạy các chương trình an toàn trực tiếp bên trong Linux kernel mà không cần thay đổi mã nguồn kernel hay nạp kernel module, mang lại khả năng quan sát zero-latency.",
            "example": "Tetragon, Tracee, Cilium giám sát Container và Kubernetes."
        }
    }
    return {"hovercards": terms}
