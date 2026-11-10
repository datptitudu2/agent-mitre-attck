"""Populate Phase 2 (SigmaHQ Rules) & Phase 3 (ML Feature Recipes) in Supabase."""

import json
from apps.api.app.config import get_settings
from apps.api.app.db import SupabaseDataClient

DDL = """
-- ==============================================================================
-- PHASE 2 & 3: SIGMA RULES & ML FEATURE RECIPES (0003_sigma_and_ml.sql)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sigma_rules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'stable',
    description TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'SigmaHQ Community',
    references_list TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    techniques TEXT[] NOT NULL DEFAULT '{}',
    logsource JSONB NOT NULL DEFAULT '{}'::jsonb,
    detection JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_yaml TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('low', 'medium', 'high', 'critical')),
    falsepositives TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_feature_recipes (
    id TEXT PRIMARY KEY,
    technique_id TEXT NOT NULL,
    technique_name TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    feature_formula TEXT NOT NULL,
    extraction_logic_sql TEXT NOT NULL DEFAULT '',
    extraction_logic_python TEXT NOT NULL DEFAULT '',
    intuition_vietnamese TEXT NOT NULL,
    expected_tp_signal TEXT NOT NULL,
    expected_fp_noise TEXT NOT NULL,
    colab_notebook_url TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telemetry OS mapping table for side-by-side comparison (Phase 4)
CREATE TABLE IF NOT EXISTS public.os_telemetry_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_category TEXT NOT NULL,
    behavior_description TEXT NOT NULL,
    windows_source TEXT NOT NULL,
    windows_event TEXT NOT NULL,
    windows_fields TEXT NOT NULL,
    linux_source TEXT NOT NULL,
    linux_event TEXT NOT NULL,
    linux_fields TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
);

-- RLS policies
ALTER TABLE public.sigma_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_feature_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_telemetry_matrix ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS p_select_sigma ON public.sigma_rules;
    CREATE POLICY p_select_sigma ON public.sigma_rules FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS p_select_ml ON public.ml_feature_recipes;
    CREATE POLICY p_select_ml ON public.ml_feature_recipes FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS p_select_os_matrix ON public.os_telemetry_matrix;
    CREATE POLICY p_select_os_matrix ON public.os_telemetry_matrix FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
"""

SIGMA_RULES = [
    {
        "id": "sigma:win_powershell_hidden_b64",
        "title": "Mã thực thi PowerShell với cờ ẩn cửa sổ và mã hóa Base64",
        "status": "stable",
        "description": "Phát hiện tiến trình powershell.exe được gọi với các cờ che giấu (-W Hidden, -WindowStyle Hidden) kết hợp với chuỗi tham số mã hóa Base64 (-Enc, -EncodedCommand). Đây là hành vi kinh điển của dropper và malware Living-off-the-Land.",
        "author": "Florian Roth (Nextron Systems), SigmaHQ",
        "references": ["https://attack.mitre.org/techniques/T1059/001/"],
        "tags": ["attack.t1059.001", "attack.execution", "attack.defense_evasion"],
        "techniques": ["T1059.001"],
        "logsource": {"category": "process_creation", "product": "windows"},
        "detection": {
            "selection_img": {"Image|endswith": ["\\powershell.exe", "\\pwsh.exe"]},
            "selection_flags": {"CommandLine|contains|all": ["-w hidden", "-enc"]},
            "condition": "selection_img and selection_flags"
        },
        "raw_yaml": """title: Mã thực thi PowerShell với cờ ẩn cửa sổ và mã hóa Base64
id: 9fc51a3c-81b3-4851-9340-5e3cf4c7587a
status: stable
description: Phát hiện tiến trình PowerShell được kích hoạt ẩn cửa sổ kèm cờ mã hoá Base64.
references:
    - https://attack.mitre.org/techniques/T1059/001/
author: Florian Roth, SigmaHQ
tags:
    - attack.t1059.001
    - attack.execution
logsource:
    category: process_creation
    product: windows
detection:
    selection_img:
        Image|endswith:
            - '\\powershell.exe'
            - '\\pwsh.exe'
    selection_flags:
        CommandLine|contains|all:
            - '-w hidden'
            - '-enc'
    condition: selection_img and selection_flags
falsepositives:
    - Các script quản trị IT đặc biệt (thường có chữ ký Authenticode và nằm trong thư mục bảo vệ)
level: high""",
        "level": "high",
        "falsepositives": ["Script bảo trì hạ tầng từ SCCM/Intune có chữ ký số hợp lệ."]
    },
    {
        "id": "sigma:win_office_spawn_shell",
        "title": "Phần mềm văn phòng Office sinh tiến trình dòng lệnh (Cmd/PowerShell)",
        "status": "stable",
        "description": "Phát hiện các ứng dụng Office (WINWORD.EXE, EXCEL.EXE, POWERPNT.EXE) sinh tiến trình con là PowerShell, CMD, WScript, CScript. Đây là dấu hiệu chắc chắn 99% của tài liệu chứa mã độc Macro / CVE Exploit.",
        "author": "Michael Haag, SigmaHQ",
        "references": ["https://attack.mitre.org/techniques/T1059/001/", "https://attack.mitre.org/techniques/T1204/002/"],
        "tags": ["attack.t1059.001", "attack.t1204.002", "attack.execution"],
        "techniques": ["T1059.001", "T1204.002"],
        "logsource": {"category": "process_creation", "product": "windows"},
        "detection": {
            "selection_parent": {
                "ParentImage|endswith": ["\\winword.exe", "\\excel.exe", "\\powerpnt.exe", "\\outlook.exe"]
            },
            "selection_child": {
                "Image|endswith": ["\\cmd.exe", "\\powershell.exe", "\\pwsh.exe", "\\wscript.exe", "\\cscript.exe", "\\mshta.exe"]
            },
            "condition": "selection_parent and selection_child"
        },
        "raw_yaml": """title: Phần mềm văn phòng Office sinh tiến trình dòng lệnh
id: b655c65b-bf99-4c57-88f6-3f0449557b44
status: stable
description: Phát hiện Word/Excel/Outlook gọi shell nhị phân thực thi mã độc.
author: Michael Haag, SigmaHQ
tags:
    - attack.t1059.001
    - attack.execution
logsource:
    category: process_creation
    product: windows
detection:
    selection_parent:
        ParentImage|endswith:
            - '\\winword.exe'
            - '\\excel.exe'
            - '\\powerpnt.exe'
            - '\\outlook.exe'
    selection_child:
        Image|endswith:
            - '\\cmd.exe'
            - '\\powershell.exe'
            - '\\wscript.exe'
            - '\\mshta.exe'
    condition: selection_parent and selection_child
falsepositives:
    - Rất hiếm gặp trong môi trường doanh nghiệp bình thường
level: critical""",
        "level": "critical",
        "falsepositives": ["Gần như không có (False Positive Rate < 0.01%)."]
    },
    {
        "id": "sigma:win_lsass_dump_procdump",
        "title": "Trích xuất bộ nhớ LSASS bằng công cụ Procdump / Sysinternals",
        "status": "stable",
        "description": "Phát hiện việc sử dụng tiện ích procdump.exe hoặc các biến thể đổi tên để tạo bản sao bộ nhớ của Local Security Authority Subsystem Service (lsass.exe) nhằm đánh cắp mật khẩu và NTLM hash.",
        "author": "Florian Roth, SigmaHQ",
        "references": ["https://attack.mitre.org/techniques/T1003/001/"],
        "tags": ["attack.t1003.001", "attack.credential_access"],
        "techniques": ["T1003.001"],
        "logsource": {"category": "process_creation", "product": "windows"},
        "detection": {
            "selection_cli": {
                "CommandLine|contains|all": ["-ma", "lsass"]
            },
            "condition": "selection_cli"
        },
        "raw_yaml": """title: Trích xuất bộ nhớ LSASS bằng Procdump
id: 5aee49e3-38a8-4cac-81d3-82a0d1b4656b
status: stable
description: Phát hiện cờ -ma kèm đối tượng lsass để kết xuất mật khẩu trong bộ nhớ RAM.
author: Florian Roth, SigmaHQ
tags:
    - attack.t1003.001
    - attack.credential_access
logsource:
    category: process_creation
    product: windows
detection:
    selection_cli:
        CommandLine|contains|all:
            - '-ma'
            - 'lsass'
    condition: selection_cli
falsepositives:
    - Chuyên viên gỡ lỗi phần mềm được cấp thẩm quyền
level: critical""",
        "level": "critical",
        "falsepositives": ["Chuyên viên Microsoft PSS gỡ lỗi sự cố treo LSASS."]
    },
    {
        "id": "sigma:win_susp_schtasks_creation",
        "title": "Tạo Tác vụ Lịch trình (Scheduled Task) qua dòng lệnh Schtasks",
        "status": "stable",
        "description": "Phát hiện lệnh schtasks.exe được dùng để tạo mới tác vụ chạy ngầm định kỳ hoặc kích hoạt khi máy khởi động (Boot/Logon) nhằm mục đích duy trì sự hiện diện bền vững (Persistence).",
        "author": "Markus Neis, SigmaHQ",
        "references": ["https://attack.mitre.org/techniques/T1053/005/"],
        "tags": ["attack.t1053.005", "attack.persistence", "attack.execution"],
        "techniques": ["T1053.005"],
        "logsource": {"category": "process_creation", "product": "windows"},
        "detection": {
            "selection_img": {"Image|endswith": "\\schtasks.exe"},
            "selection_cli": {"CommandLine|contains|all": ["/create", "/tn"]},
            "condition": "selection_img and selection_cli"
        },
        "raw_yaml": """title: Tạo Tác vụ Lịch trình qua Schtasks
id: 926190dd-f14d-4e2a-ac5d-4f1e0dfa2202
status: stable
description: Phát hiện lệnh tạo tác vụ schtasks /create /tn duy trì sự hiện diện ngầm.
author: Markus Neis, SigmaHQ
tags:
    - attack.t1053.005
    - attack.persistence
logsource:
    category: process_creation
    product: windows
detection:
    selection_img:
        Image|endswith: '\\schtasks.exe'
    selection_cli:
        CommandLine|contains|all:
            - '/create'
            - '/tn'
    condition: selection_img and selection_cli
falsepositives:
    - Trình cài đặt phần mềm bên thứ 3 (Google Chrome, Adobe Updater)
level: medium""",
        "level": "medium",
        "falsepositives": ["Trình cài đặt ứng dụng Google Chrome, Adobe Updater tự động tạo task cập nhật."]
    },
    {
        "id": "sigma:win_wevtutil_log_clear",
        "title": "Xóa sạch Nhật ký Sự kiện Windows bằng công cụ wevtutil",
        "status": "stable",
        "description": "Phát hiện việc sử dụng wevtutil cl (clear log) để xóa các kênh nhật ký quan trọng như Security, System, Application hoặc Sysmon nhằm thủ tiêu dấu vết điều tra số.",
        "author": "Michael Haag, SigmaHQ",
        "references": ["https://attack.mitre.org/techniques/T1070/001/"],
        "tags": ["attack.t1070.001", "attack.defense_evasion"],
        "techniques": ["T1070.001"],
        "logsource": {"category": "process_creation", "product": "windows"},
        "detection": {
            "selection_img": {"Image|endswith": "\\wevtutil.exe"},
            "selection_cli": {"CommandLine|contains": [" cl ", " clear-log "]},
            "condition": "selection_img and selection_cli"
        },
        "raw_yaml": """title: Xóa sạch Nhật ký Sự kiện bằng wevtutil
id: cc350ade-fa72-4d56-a19e-e374d6c41b80
status: stable
description: Kẻ tấn công gọi wevtutil cl Security để xóa lịch sử sự kiện bảo mật.
author: Michael Haag, SigmaHQ
tags:
    - attack.t1070.001
    - attack.defense_evasion
logsource:
    category: process_creation
    product: windows
detection:
    selection_img:
        Image|endswith: '\\wevtutil.exe'
    selection_cli:
        CommandLine|contains:
            - ' cl '
            - ' clear-log '
    condition: selection_img and selection_cli
falsepositives:
    - Script bảo trì định kỳ dọn dẹp dung lượng đĩa của quản trị viên cũ
level: high""",
        "level": "high",
        "falsepositives": ["Script bảo trì định kỳ dọn dẹp dung lượng đĩa của quản trị viên."]
    },
    {
        "id": "sigma:lnx_curl_shell_piped",
        "title": "Tải script từ Internet và pipe trực tiếp vào Shell (Curl/Wget | bash)",
        "status": "stable",
        "description": "Phát hiện việc dùng curl hoặc wget để kéo mã độc từ IP ngoài rồi chuyển hướng (pipe) thẳng vào /bin/sh hoặc /bin/bash mà không lưu file xuống đĩa.",
        "author": "SigmaHQ Community",
        "references": ["https://attack.mitre.org/techniques/T1059/004/"],
        "tags": ["attack.t1059.004", "attack.execution"],
        "techniques": ["T1059.004"],
        "logsource": {"category": "process_creation", "product": "linux"},
        "detection": {
            "selection": {
                "CommandLine|contains": ["curl | sh", "curl | bash", "wget -O- | sh", "wget -O- | bash"]
            },
            "condition": "selection"
        },
        "raw_yaml": """title: Tải script từ Internet và pipe trực tiếp vào Shell
id: e263ea81-8b01-4ec4-a159-83c9e6bb167e
status: stable
description: Phát hiện lệnh curl/wget chuyển tiếp stdout trực tiếp tới bộ thông dịch bash.
author: SigmaHQ Community
tags:
    - attack.t1059.004
    - attack.execution
logsource:
    category: process_creation
    product: linux
detection:
    selection:
        CommandLine|contains:
            - 'curl | sh'
            - 'curl | bash'
            - 'wget -O- | sh'
            - 'wget -O- | bash'
    condition: selection
falsepositives:
    - Một số công cụ như Homebrew hoặc Docker install script (nhưng nên kiểm tra nguồn URL)
level: high""",
        "level": "high",
        "falsepositives": ["Trình cài đặt Docker / Homebrew / NVM chính thống."]
    }
]

ML_RECIPES = [
    {
        "id": "ml:cmdline_entropy_length",
        "technique_id": "T1059.001",
        "technique_name": "PowerShell Scripting Interpreter",
        "feature_name": "Độ dài & Entropy Shannon của Tham số Dòng Lệnh",
        "feature_formula": "H(X) = - \\sum_{i=1}^{n} P(x_i) \\log_2 P(x_i) \\quad \\text{kèm} \\quad \\text{Length}(CommandLine)",
        "extraction_logic_sql": """-- Trích xuất đặc trưng trong ClickHouse / PostgreSQL
SELECT 
    event_id,
    length(command_line) AS cmd_len,
    -- Ước lượng tỷ lệ ký tự đặc biệt che giấu
    round((length(command_line) - length(replace(command_line, '^', '')) + 
           length(command_line) - length(replace(command_line, '%', '')))::numeric / NULLIF(length(command_line), 0), 3) AS obfuscation_ratio
FROM process_events
WHERE image ILIKE '%powershell.exe';""",
        "extraction_logic_python": """import math
from collections import Counter

def calculate_shannon_entropy(text: str) -> float:
    if not text:
        return 0.0
    entropy = 0.0
    length = len(text)
    counts = Counter(text)
    for count in counts.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 3)

def extract_powershell_features(cmdline: str) -> dict:
    return {
        "length": len(cmdline),
        "entropy": calculate_shannon_entropy(cmdline),
        "has_base64_marker": any(f in cmdline.lower() for f in ["-enc", "-encodedcommand", "frombase64string"]),
        "special_char_ratio": round(sum(1 for c in cmdline if c in "^%$'`[]{}|") / max(len(cmdline), 1), 3)
    }""",
        "intuition_vietnamese": "Lệnh PowerShell thông thường của quản trị viên viết bằng từ vựng tiếng Anh tự nhiên (độ dài < 120 ký tự, entropy dao động từ 3.5 đến 4.3). Ngược lại, mã độc sử dụng Base64 hoặc chèn các ký tự thoát `^`, `'` để làm rối chữ khiến độ dài nhảy vọt (> 300 ký tự) và entropy tăng vọt (> 5.2).",
        "expected_tp_signal": "Entropy > 5.2 và Length > 350 ký tự: Bắt trọn 95% payload Cobalt Strike, PowerShell Empire và IEX Downloader.",
        "expected_fp_noise": "Các câu lệnh SQL query nhúng trong PowerShell script hoặc dữ liệu chứng chỉ X.509 hợp lệ.",
        "colab_notebook_url": "https://colab.research.google.com/drive/1_demo_powershell_entropy_detector",
        "difficulty": "beginner"
    },
    {
        "id": "ml:parent_child_rarity",
        "technique_id": "T1055",
        "technique_name": "Process Injection / Spawning Anomaly",
        "feature_name": "Tần suất Hiếm của Cặp Tiến Trình Cha–Con (P(Child | Parent))",
        "feature_formula": "R(P, C) = -\\log_{10} \\left( \\frac{\\text{Count}(Parent, Child) + 1}{\\text{Count}(Parent) + |V|} \\right)",
        "extraction_logic_sql": """-- Tần suất chuyển tiếp trạng thái tiến trình
WITH parent_counts AS (
    SELECT parent_image, count(*) as total_spawns 
    FROM process_events GROUP BY parent_image
),
pair_counts AS (
    SELECT parent_image, image, count(*) as pair_count
    FROM process_events GROUP BY parent_image, image
)
SELECT 
    pc.parent_image,
    pc.image,
    round(-log10((pc.pair_count::numeric + 1.0) / (p.total_spawns + 1000.0)), 4) AS rarity_score
FROM pair_counts pc
JOIN parent_counts p ON p.parent_image = pc.parent_image
ORDER BY rarity_score DESC;""",
        "extraction_logic_python": """# Xây dựng mô hình Bigram xác suất có làm trơn Laplace
import numpy as np

class ProcessGraphRarityModel:
    def __init__(self):
        self.pair_freq = Counter()
        self.parent_freq = Counter()
        self.vocab_size = 500

    def fit(self, process_pairs):
        for parent, child in process_pairs:
            self.pair_freq[(parent, child)] += 1
            self.parent_freq[parent] += 1

    def score(self, parent, child) -> float:
        num = self.pair_freq.get((parent, child), 0) + 1.0
        den = self.parent_freq.get(parent, 0) + self.vocab_size
        prob = num / den
        return float(-np.log10(prob))""",
        "intuition_vietnamese": "Trong một mạng doanh nghiệp có hàng triệu lượt sinh tiến trình, các cặp bình thường (như explorer.exe sinh chrome.exe, svchost.exe sinh taskhostw.exe) diễn ra liên tục hàng nghìn lần mỗi ngày. Cặp bất thường (như WINWORD.EXE sinh powershell.exe, hoặc sqlservr.exe sinh cmd.exe) có điểm Rarity Score đạt cực đại, là chỉ dấu xâm nhập hàng đầu.",
        "expected_tp_signal": "Rarity Score > 4.5: Phát hiện mọi cuộc tấn công khai thác lỗ hổng Web Shell, Office Macro, RCE.",
        "expected_fp_noise": "Quản trị viên chạy script lạ bằng tay trực tiếp từ Notepad++ hoặc công cụ phát triển IDE mới.",
        "colab_notebook_url": "https://colab.research.google.com/drive/1_demo_process_tree_rarity_model",
        "difficulty": "intermediate"
    },
    {
        "id": "ml:dns_tunneling_ratio",
        "technique_id": "T1071.004",
        "technique_name": "Application Layer Protocol: DNS",
        "feature_name": "Phân phối Độ Dài Tên Miền Con & Tỷ lệ Bản ghi Hiếm (DNS Tunneling)",
        "feature_formula": "F_{\\text{DNS}} = \\left[ \\text{Mean}(\\text{Len}_{sub}), \\text{Entropy}(Subdomain), \\frac{\\text{Count}(TXT)}{\\text{Total Query}}, \\text{DistinctRatio} \\right]",
        "extraction_logic_sql": """SELECT 
    client_ip,
    registered_domain,
    avg(length(subdomain)) AS avg_subdomain_len,
    count(DISTINCT subdomain)::numeric / count(*) AS uniqueness_ratio,
    count(CASE WHEN qtype = 'TXT' THEN 1 END)::numeric / count(*) AS txt_ratio
FROM dns_events
GROUP BY client_ip, registered_domain
HAVING count(*) > 50;""",
        "extraction_logic_python": """def extract_dns_features(queries: list[str], qtypes: list[str]) -> dict:
    subdomain_lens = [len(q.split('.')[0]) for q in queries]
    unique_subdomains = len(set(queries))
    total = len(queries)
    return {
        "avg_subdomain_length": sum(subdomain_lens) / max(total, 1),
        "uniqueness_ratio": round(unique_subdomains / max(total, 1), 3),
        "txt_record_ratio": round(sum(1 for t in qtypes if t == 'TXT') / max(total, 1), 3)
    }""",
        "intuition_vietnamese": "DNS Tunneling phân mảnh dữ liệu bí mật vào các tiền tố subdomain (ví dụ: a8f9c102.data.c2.com) và yêu cầu bản ghi TXT để tải tệp nhị phân về. Điểm đặc trưng là tính duy nhất của subdomain xấp xỉ 100% (không bao giờ lặp lại tên miền con) và tỷ lệ TXT cao bất thường.",
        "expected_tp_signal": "Uniqueness Ratio > 0.95 và Avg Subdomain Length > 28 ký tự: Phát hiện DNSCat2, Iodine, Cobalt Strike DNS Beacon.",
        "expected_fp_noise": "Dịch vụ Antivirus quét URL qua DNS (Sophos / McAfee cloud lookup), CDN round-robin.",
        "colab_notebook_url": "https://colab.research.google.com/drive/1_demo_dns_tunneling_classifier",
        "difficulty": "advanced"
    }
]

OS_TELEMETRY = [
    (
        "Khởi tạo tiến trình (Process Creation)",
        "Kẻ tấn công thực thi một tệp nhị phân hoặc tập lệnh trên hệ thống",
        "Windows Security / Sysmon",
        "Security.evtx 4688 / Sysmon EID 1",
        "CommandLine, ParentImage, Image, User, ProcessGuid, IntegrityLevel",
        "auditd / eBPF Tetragon",
        "auditd SYSCALL 59 (execve) / Tetragon process_exec",
        "a0, a1, a2, exe, comm, euid, auid, binary, arguments",
        "Windows cung cấp sẵn băm file và cây tiến trình hoàn chỉnh trong Sysmon; Linux auditd yêu cầu cấu hình auditctl -a always,exit -S execve"
    ),
    (
        "Kết nối mạng hướng ngoại (Outbound Network Connection)",
        "Tiến trình thiết lập liên lạc mạng với máy chủ điều khiển C2",
        "Sysmon",
        "Sysmon EventID 3",
        "Protocol, Initiated, SourceIp, DestinationIp, DestinationPort, Image",
        "Linux eBPF / Zeek",
        "Tetragon tcp_connect / Zeek conn.log",
        "saddr, daddr, dport, proto, id.orig_h, id.resp_h, id.resp_p, service",
        "Sysmon gắn trực tiếp PID/Image với phiên TCP; Zeek bắt ở tầng network switch không cần agent cài trên máy"
    ),
    (
        "Ghi đè hoặc tạo mới tập tin (File Creation)",
        "Ghi payload độc hoặc thả tệp thực thi vào thư mục hệ thống",
        "Sysmon",
        "Sysmon EventID 11",
        "TargetFilename, Image, CreationUtcTime",
        "auditd / eBPF",
        "auditd openat with O_CREAT / Tetragon file_modification",
        "name, nametype, flags, file.path",
        "Cần whitelist các thư mục thường xuyên ghi file tạm để tránh ngập lụt SIEM"
    ),
    (
        "Thay đổi khóa tự khởi động (Persistence)",
        "Cài cắm mã độc tự kích hoạt lại sau mỗi lần reboot",
        "Sysmon / Windows Security",
        "Sysmon EventID 13 / Security 4657",
        "TargetObject, Details, Image",
        "auditd",
        "auditd file watch trên /etc/systemd/system/ và /etc/cron*",
        "key, path, perms, arch",
        "Windows kiểm soát Registry Run keys (HKCU/HKLM); Linux giám sát thư mục cấu hình Systemd unit và Cron"
    )
]

def run():
    print("[*] Bắt đầu migration Phase 2 & 3: SigmaHQ & ML Feature Recipes...")
    client = SupabaseDataClient()
    settings = get_settings()

    with client.get_pg_conn() as conn:
        with conn.cursor() as cur:
            # 1. Chạy DDL
            print("[*] Áp dụng DDL...")
            cur.execute(DDL)

            # 2. Seed Sigma rules
            print("[*] Nạp SigmaHQ rules...")
            for r in SIGMA_RULES:
                cur.execute("""
                    INSERT INTO public.sigma_rules (id, title, status, description, author, references_list, tags, techniques, logsource, detection, raw_yaml, level, falsepositives)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        detection = EXCLUDED.detection,
                        raw_yaml = EXCLUDED.raw_yaml,
                        level = EXCLUDED.level,
                        falsepositives = EXCLUDED.falsepositives;
                """, (
                    r['id'], r['title'], r['status'], r['description'], r['author'],
                    r['references'], r['tags'], r['techniques'],
                    json.dumps(r['logsource']), json.dumps(r['detection']),
                    r['raw_yaml'], r['level'], r['falsepositives']
                ))

            # 3. Seed ML feature recipes
            print("[*] Nạp ML feature recipes...")
            for m in ML_RECIPES:
                cur.execute("""
                    INSERT INTO public.ml_feature_recipes (id, technique_id, technique_name, feature_name, feature_formula, extraction_logic_sql, extraction_logic_python, intuition_vietnamese, expected_tp_signal, expected_fp_noise, colab_notebook_url, difficulty)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        feature_formula = EXCLUDED.feature_formula,
                        extraction_logic_sql = EXCLUDED.extraction_logic_sql,
                        extraction_logic_python = EXCLUDED.extraction_logic_python,
                        intuition_vietnamese = EXCLUDED.intuition_vietnamese,
                        expected_tp_signal = EXCLUDED.expected_tp_signal,
                        expected_fp_noise = EXCLUDED.expected_fp_noise,
                        colab_notebook_url = EXCLUDED.colab_notebook_url;
                """, (
                    m['id'], m['technique_id'], m['technique_name'], m['feature_name'],
                    m['feature_formula'], m['extraction_logic_sql'], m['extraction_logic_python'],
                    m['intuition_vietnamese'], m['expected_tp_signal'], m['expected_fp_noise'],
                    m['colab_notebook_url'], m['difficulty']
                ))

            # 4. Seed OS telemetry comparison matrix
            print("[*] Nạp OS telemetry comparison matrix...")
            cur.execute("DELETE FROM public.os_telemetry_matrix;")
            for cat, desc, win_s, win_e, win_f, lnx_s, lnx_e, lnx_f, notes in OS_TELEMETRY:
                cur.execute("""
                    INSERT INTO public.os_telemetry_matrix (action_category, behavior_description, windows_source, windows_event, windows_fields, linux_source, linux_event, linux_fields, notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """, (cat, desc, win_s, win_e, win_f, lnx_s, lnx_e, lnx_f, notes))

            # Xuất file migration 0003_sigma_and_ml.sql
            with open("supabase/migrations/0003_sigma_and_ml.sql", "w", encoding="utf-8") as f:
                f.write(DDL)
                print("[+] Đã xuất file supabase/migrations/0003_sigma_and_ml.sql")

    print("[OK] HOÀN TẤT SEED PHASE 2 & 3 THÀNH CÔNG 100%!")

if __name__ == "__main__":
    run()
