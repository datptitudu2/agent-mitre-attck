"""Endpoint dịch thuật chuyên ngành an toàn thông tin (Giữ nguyên các thuật ngữ phổ biến: process, Sysmon, EventCode...)."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import logging
import re
import urllib.parse
import urllib.request
from typing import Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from apps.api.app.auth import AuthenticatedUser, get_current_user

logger = logging.getLogger("attack_lab.translate")

router = APIRouter(prefix="/translate", tags=["Translation"])
_EXECUTOR = ThreadPoolExecutor(max_workers=10)

# Danh sách thuật ngữ kỹ thuật tiêu chuẩn KHÔNG dịch (ai trong ngành cũng hiểu)
# Sắp xếp từ dài đến ngắn để regex không bị thay thế một phần từ con
CYBER_PRESERVED_TERMS = [
    # Process & Command
    "parent process", "child process", "process creation", "process execution", "process hollowing",
    "process injection", "process tampering", "process tree", "process lineage", "process", "processes",
    "powershell.exe", "PowerShell", "cmd.exe", "CMD", "bash", "sh", "zsh", "wscript", "cscript",
    # Event Logs & Sysmon
    "WinEventLog:Microsoft-Windows-Sysmon/Operational", "WinEventLog:System", "WinEventLog:Security",
    "WinEventLog", "EventCode", "Event ID", "Sysmon", "ETW", "Audit Policy",
    # Systems & Tools
    "EDR", "SIEM", "SOC", "AV", "XDR", "NDR", "SOAR",
    # Malware & Attack forms
    "spearphishing attachment", "spearphishing link", "spearphishing", "phishing",
    "ransomware", "wiper", "trojan", "backdoor", "rootkit", "dropper", "loader", "beacon",
    "Command and Control", "C2", "payload", "shellcode", "exploit", "zero-day",
    # Binaries & OS internals
    "DLL", "EXE", "ELF", "PE", "registry", "Registry", "HKLM", "HKCU", "Run keys", "svchost.exe",
    "rundll32.exe", "regsvr32.exe", "certutil.exe", "mshta.exe", "explorer.exe",
    # Identity & Auth
    "Active Directory", "Kerberos", "NTLM", "Golden Ticket", "Silver Ticket", "Pass the Hash",
    "LSASS", "SAM", "LSA", "access token", "token", "privilege elevation", "privilege escalation",
    # Network & Protocols
    "WMI", "SMB", "RDP", "SSH", "HTTP", "HTTPS", "DNS", "TCP", "UDP", "IP", "port",
    "inbound", "outbound", "traffic", "socket", "beaconing", "egress", "ingress",
    # Office & Common software
    "Office", "Word", "Excel", "Outlook", "winword.exe", "excel.exe", "outlook.exe",
    "macro", "VBA", "API", "hooking",
]
CYBER_PRESERVED_TERMS.sort(key=len, reverse=True)

# Bộ nhớ đệm bản dịch trong RAM để phản hồi 0ms cho các lần gọi lặp lại
TRANSLATION_CACHE: Dict[str, str] = {}


class TranslateRequest(BaseModel):
    texts: List[str] = Field(default_factory=list, max_length=200, description="Danh sách các đoạn văn bản cần dịch")
    target_lang: str = Field(default="vi", max_length=10)


class TranslateResponse(BaseModel):
    translations: List[str]
    cached_count: int


def _translate_single(text: str, target_lang: str = "vi") -> str:
    trimmed = text.strip()
    if not trimmed:
        return text

    cache_key = hashlib.sha256(f"{target_lang}:{trimmed}".encode("utf-8")).hexdigest()
    if cache_key in TRANSLATION_CACHE:
        return TRANSLATION_CACHE[cache_key]

    # Bước 1: Bảo vệ các thuật ngữ chuyên ngành quen thuộc bằng token [[TERM_N]]
    term_map: Dict[str, str] = {}
    counter = 0
    work_text = trimmed

    for term in CYBER_PRESERVED_TERMS:
        pattern = re.compile(r"\b" + re.escape(term) + r"\b", re.IGNORECASE)

        def repl(match: re.Match) -> str:
            nonlocal counter
            token = f"[[TERM_{counter}]]"
            term_map[token] = match.group(0)
            counter += 1
            return token

        work_text = pattern.sub(repl, work_text)

    # Bước 2: Gọi dịch vụ dịch thuật (Google Translate endpoint công khai cho GTx)
    url = (
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl="
        + urllib.parse.quote(target_lang)
        + "&dt=t&q="
        + urllib.parse.quote(work_text)
    )
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ATT&CK-Lab/1.0"},
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            raw_data = json.loads(res.read().decode("utf-8"))
            translated = "".join([part[0] for part in raw_data[0] if part and len(part) > 0])
    except Exception as exc:
        logger.warning("Không thể dịch tự động '%s': %s", text[:40], exc)
        return text

    # Bước 3: Hoàn nguyên chính xác các thuật ngữ kỹ thuật ban đầu
    for token, original in term_map.items():
        translated = translated.replace(token, original)
        translated = translated.replace(token.lower(), original)

    TRANSLATION_CACHE[cache_key] = translated
    return translated


@router.post("", response_model=TranslateResponse)
async def translate_texts(
    payload: TranslateRequest,
    _user: AuthenticatedUser = Depends(get_current_user),
) -> TranslateResponse:
    """Dịch nhanh các đoạn văn bản STIX 2.1 sang tiếng Việt đa luồng và giữ nguyên các thuật ngữ kỹ thuật phổ biến."""
    cached = 0
    for t in payload.texts:
        k = hashlib.sha256(f"{payload.target_lang}:{t.strip()}".encode("utf-8")).hexdigest()
        if k in TRANSLATION_CACHE:
            cached += 1

    # Dịch đa luồng bằng ThreadPoolExecutor (10 workers) để phản hồi trong chớp mắt (< 1.5s)
    loop = asyncio.get_event_loop()
    def run_batch():
        return list(_EXECUTOR.map(lambda t: _translate_single(t, payload.target_lang), payload.texts))

    results = await loop.run_in_executor(None, run_batch)
    return TranslateResponse(translations=results, cached_count=cached)

