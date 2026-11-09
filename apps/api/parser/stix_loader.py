"""Tải index.json và các gói STIX 2.1 chính thức từ GitHub mitre-attack/attack-stix-data.

Nguyên tắc:
- Tự động đọc danh sách domain và version từ index.json, KHÔNG bao giờ hard-code số phiên bản.
- Sắp xếp đúng cả bản chính (20.0), bản vá (20.1) và bản agile (19.2).
- Hỗ trợ cache đĩa tạm (.cache/stix) khi chạy local để tiết kiệm băng thông khi thử nghiệm.
"""

from dataclasses import dataclass
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from packaging.version import InvalidVersion, Version

logger = logging.getLogger("attack_lab.parser.loader")

INDEX_URL = "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/index.json"
RAW_BASE = "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master"
SUPPORTED_DOMAINS = ("enterprise-attack", "mobile-attack", "ics-attack")

# STIX Collection ID chuẩn của MITRE dùng làm đối chiếu phụ nếu URL thay đổi cấu trúc
KNOWN_COLLECTION_IDS = {
    "x-mitre-collection--1f5f1533-f617-4ca8-9ab4-6a02367fa019": "enterprise-attack",
    "x-mitre-collection--dac0d2d7-8653-445c-9bff-82f934c1e858": "mobile-attack",
    "x-mitre-collection--90c00720-636b-4485-b342-8751d232bf09": "ics-attack",
}


@dataclass(frozen=True)
class DomainVersionInfo:
    domain: str
    version: str
    url: str
    modified: str


def _parse_semver_key(ver_str: str) -> Tuple[int, Any]:
    """Khoá sắp xếp an toàn cho chuỗi version (vd '20.1', '19.2', '20.0')."""
    cleaned = ver_str.strip().lstrip("vV")
    try:
        return (1, Version(cleaned))
    except InvalidVersion:
        return (0, cleaned)


def _infer_domain_from_collection(col: Dict[str, Any]) -> Optional[str]:
    col_id = str(col.get("id") or "")
    if col_id in KNOWN_COLLECTION_IDS:
        return KNOWN_COLLECTION_IDS[col_id]

    name_lower = str(col.get("name") or "").lower()
    if "enterprise" in name_lower:
        return "enterprise-attack"
    if "mobile" in name_lower:
        return "mobile-attack"
    if "ics" in name_lower:
        return "ics-attack"

    for ver in col.get("versions") or []:
        url = str(ver.get("url") or "")
        for dom in SUPPORTED_DOMAINS:
            if f"/{dom}/" in url or url.endswith(f"{dom}.json"):
                return dom
    return None


async def _get_with_retries(url: str, timeout: float = 60.0) -> str:
    """Tải nội dung qua HTTP kèm cơ chế tự thử lại & ưu tiên IPv4 nếu đường truyền chập chờn."""
    import asyncio

    headers = {"User-Agent": "ATTACK-Lab-Defensive-Edu/1.0"}
    last_exc: Optional[Exception] = None

    for attempt in range(4):
        # Lần đầu thử dual-stack, từ lần 2 ép IPv4 ("0.0.0.0") tránh lỗi rớt gói IPv6 của ISP
        transport = (
            httpx.AsyncHTTPTransport(retries=2)
            if attempt == 0
            else httpx.AsyncHTTPTransport(retries=2, local_address="0.0.0.0")
        )
        try:
            async with httpx.AsyncClient(
                timeout=timeout,
                follow_redirects=True,
                headers=headers,
                transport=transport,
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                return resp.text
        except Exception as exc:
            last_exc = exc
            logger.warning("Tải %s thất bại lần %s/4 (%s), đang thử lại...", url, attempt + 1, exc)
            await asyncio.sleep(1.5 * (attempt + 1))

    assert last_exc is not None
    raise last_exc


async def fetch_remote_index(
    timeout: float = 30.0,
    cache_dir: Optional[Path] = None,
) -> Dict[str, List[DomainVersionInfo]]:
    """Đọc index.json trên GitHub MITRE và trả danh sách version (giảm dần, bản mới nhất đứng đầu) theo từng domain."""
    try:
        raw_text = await _get_with_retries(INDEX_URL, timeout=timeout)
        raw_index = json.loads(raw_text)
        if cache_dir is not None:
            cache_dir.mkdir(parents=True, exist_ok=True)
            (cache_dir / "index.json").write_text(raw_text, encoding="utf-8")
    except Exception:
        if cache_dir is not None and (cache_dir / "index.json").exists():
            logger.warning("Dùng bản sao index.json trong cache đĩa do kết nối GitHub tạm gián đoạn.")
            raw_index = json.loads((cache_dir / "index.json").read_text(encoding="utf-8"))
        else:
            raise

    result: Dict[str, List[DomainVersionInfo]] = {}
    for col in raw_index.get("collections") or []:
        domain = _infer_domain_from_collection(col)
        if not domain:
            continue

        entries: List[DomainVersionInfo] = []
        for v in col.get("versions") or []:
            ver_str = str(v.get("version") or "").strip()
            url = str(v.get("url") or "").strip()
            modified = str(v.get("modified") or "").strip()
            if not ver_str or not url:
                continue
            entries.append(
                DomainVersionInfo(
                    domain=domain,
                    version=ver_str,
                    url=url,
                    modified=modified,
                )
            )

        entries.sort(key=lambda item: _parse_semver_key(item.version), reverse=True)
        if entries:
            result[domain] = entries

    # Fallback phòng hờ nếu cấu trúc index.json đổi hoàn toàn
    for dom in SUPPORTED_DOMAINS:
        if dom not in result:
            logger.warning("Không tìm thấy %s trong index.json, kích hoạt đường dẫn fallback.", dom)
            result[dom] = [
                DomainVersionInfo(
                    domain=dom,
                    version="latest",
                    url=f"{RAW_BASE}/{dom}/{dom}.json",
                    modified="",
                )
            ]

    return result


def select_target_and_previous_version(
    versions: List[DomainVersionInfo],
    requested_version: Optional[str] = None,
) -> Tuple[DomainVersionInfo, Optional[DomainVersionInfo]]:
    """Chọn bản cần tải (mặc định là bản mới nhất) và bản liền kề trước đó để tính diff."""
    if not versions:
        raise ValueError("Danh sách version trống.")

    if not requested_version or requested_version.lower() == "latest":
        target = versions[0]
        prev = versions[1] if len(versions) > 1 else None
        return target, prev

    cleaned_req = requested_version.strip().lstrip("vV")
    for idx, item in enumerate(versions):
        if item.version == requested_version or item.version.lstrip("vV") == cleaned_req:
            prev = versions[idx + 1] if idx + 1 < len(versions) else None
            return item, prev

    raise ValueError(
        f"Không tìm thấy phiên bản '{requested_version}'. Các bản có sẵn: "
        + ", ".join(v.version for v in versions[:8])
    )


async def download_stix_bundle(
    version_info: DomainVersionInfo,
    cache_dir: Optional[Path] = None,
    timeout: float = 120.0,
) -> Dict[str, Any]:
    """Tải STIX 2.1 Bundle JSON (có hỗ trợ cache đĩa tuỳ chọn khi chạy local)."""
    if cache_dir is not None:
        cache_dir.mkdir(parents=True, exist_ok=True)
        cache_file = cache_dir / f"{version_info.domain}-{version_info.version}.json"
        if cache_file.exists() and cache_file.stat().st_size > 1024:
            logger.info("Đọc STIX bundle từ cache đĩa: %s", cache_file.name)
            return json.loads(cache_file.read_text(encoding="utf-8"))

    logger.info(
        "Đang tải STIX bundle [%s v%s] từ %s ...",
        version_info.domain,
        version_info.version,
        version_info.url,
    )
    text = await _get_with_retries(version_info.url, timeout=timeout)
    bundle = json.loads(text)

    if cache_dir is not None:
        cache_file = cache_dir / f"{version_info.domain}-{version_info.version}.json"
        cache_file.write_text(text, encoding="utf-8")

    return bundle
