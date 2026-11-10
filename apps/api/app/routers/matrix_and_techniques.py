"""Endpoints đọc ma trận (/api/matrix/{domain}), chi tiết Technique (/api/techniques/{attack_id}) và Tìm kiếm (/api/search)."""

import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status

from apps.api.app.auth import AuthenticatedUser, get_current_user
from apps.api.app.db import SupabaseDataClient, get_db_client
from apps.api.parser.stix_loader import SUPPORTED_DOMAINS

logger = logging.getLogger("attack_lab.techniques")
router = APIRouter(tags=["Matrix & Techniques"])

_TRANSLATIONS_TABLE_INITIALIZED = False

CORE_MITIGATION_SEEDS = [
    ("M1017", "mitigation", "Huấn luyện nhân viên kiểm tra danh tính người gửi qua kênh phụ trước khi nhấp liên kết."),
    ("M1054", "mitigation", "Cấu hình phần mềm chỉ bật tính năng cần thiết, chặn chạy macro và mã kịch bản từ internet."),
    ("M1056", "mitigation", "Tăng cường thu thập Threat Intelligence và phát hiện sớm thông tin tổ chức bị lộ lọt bên ngoài."),
    ("M1021", "mitigation", "Chặn tải hoặc thực thi nội dung web đáng ngờ từ các tên miền chưa được xếp hạng an toàn."),
    ("M1049", "mitigation", "Triển khai phần mềm phòng chống mã độc quét chữ ký và hành vi thời gian thực trên máy trạm."),
    ("M1026", "mitigation", "Giới hạn tài khoản đặc quyền, áp dụng nguyên tắc đặc quyền tối thiểu cho mọi người dùng."),
    ("M1051", "mitigation", "Cập nhật bản vá bảo mật hệ điều hành và trình duyệt ngay khi nhà cung cấp phát hành."),
    ("M1041", "mitigation", "Bật cơ chế AppLocker hoặc WDAC chặn thực thi file nhị phân không rõ nguồn gốc."),
    ("M1038", "mitigation", "Khoá quyền chạy file thực thi từ các thư mục tạm (AppData, Temp, Downloads)."),
    ("M1031", "mitigation", "Bật hệ thống IPS/IDS ngăn chặn các gói tin khai thác dịch vụ biên và lỗ hổng mạng."),
    ("M1020", "mitigation", "Giải mã và kiểm tra lưu lượng HTTPS để phát hiện mã độc ẩn trong kênh truyền mã hoá."),
    ("M1030", "mitigation", "Phân đoạn mạng cô lập máy trạm với hệ thống máy chủ và cơ sở dữ liệu nhạy cảm."),
    ("M1042", "mitigation", "Vô hiệu hoá hoặc gỡ bỏ hoàn toàn các dịch vụ và cổng giao tiếp thừa không dùng đến."),
    ("M1016", "mitigation", "Quét lỗ hổng định kỳ toàn bộ bề mặt tấn công bên ngoài và các máy chủ nội bộ."),
    ("M1047", "mitigation", "Bật kiểm toán hệ thống ghi lại đầy đủ nhật ký xác thực và thay đổi cấu hình trọng yếu."),
    ("M1034", "mitigation", "Chặn thiết bị và phụ kiện USB/phần cứng lạ bằng chính sách Endpoint Security."),
    ("M1035", "mitigation", "Thiết lập chính sách kiểm soát truy cập mạng (802.1X, chứng chỉ thiết bị) và hạn chế cấp DHCP."),
    ("M1018", "mitigation", "Đào tạo người dùng nhận biết các kỹ thuật Social Engineering và báo cáo kịp thời."),
    ("M1022", "mitigation", "Kiểm soát chặt chẽ việc thêm người dùng và cấp quyền đối với các tài khoản mạng xã hội tổ chức."),
]


async def _ensure_translations_db(db: SupabaseDataClient) -> None:
    global _TRANSLATIONS_TABLE_INITIALIZED
    if _TRANSLATIONS_TABLE_INITIALIZED:
        return
    try:
        await db.execute_sql("""
            CREATE TABLE IF NOT EXISTS public.attack_translations (
                attack_id TEXT PRIMARY KEY,
                type TEXT NOT NULL DEFAULT 'technique',
                name_vi TEXT NOT NULL DEFAULT '',
                action_vi TEXT NOT NULL DEFAULT '',
                summary_vi TEXT NOT NULL DEFAULT '',
                tactical_insight_vi TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        """)
        for aid, atype, act_vi in CORE_MITIGATION_SEEDS:
            await db.execute_sql("""
                INSERT INTO public.attack_translations (attack_id, type, action_vi)
                VALUES (%s, %s, %s)
                ON CONFLICT (attack_id) DO UPDATE
                SET action_vi = EXCLUDED.action_vi
                WHERE public.attack_translations.action_vi = '';
            """, (aid, atype, act_vi))
        _TRANSLATIONS_TABLE_INITIALIZED = True
    except Exception as e:
        logger.warning(f"Could not ensure attack_translations table in DB: {e}")



@router.get("/matrix/{domain}")
async def get_domain_matrix(
    domain: str,
    response: Response,
    if_none_match: Optional[str] = Header(default=None, alias="If-None-Match"),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Any:
    """Trả dữ liệu Matrix dựng sẵn từ 1 dòng duy nhất trong attack_matrix_views kèm ETag & Cache-Control."""
    if domain not in SUPPORTED_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Domain '{domain}' không hợp lệ. Hỗ trợ: {', '.join(SUPPORTED_DOMAINS)}.",
        )

    # Kiểm tra nhanh ETag trước khi đọc toàn bộ JSONB nếu trình duyệt gửi If-None-Match
    if if_none_match:
        meta = await db.fetch_one_sql(
            "select etag from public.attack_matrix_views where domain = %s;",
            (domain,),
        )
        if meta and meta["etag"] == if_none_match.strip():
            return Response(
                status_code=status.HTTP_304_NOT_MODIFIED,
                headers={
                    "ETag": meta["etag"],
                    "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
                    "CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
                    "Vary": "Authorization",
                },
            )

    row = await db.fetch_one_sql(
        "select version, etag, payload, updated_at from public.attack_matrix_views where domain = %s;",
        (domain,),
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chưa có dữ liệu đồng bộ cho domain '{domain}'. Hãy chạy sync lần đầu.",
        )

    response.headers["ETag"] = row["etag"]
    response.headers["Cache-Control"] = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400"
    response.headers["CDN-Cache-Control"] = "public, s-maxage=3600, stale-while-revalidate=86400"
    response.headers["Vary"] = "Authorization"
    return row["payload"]


@router.get("/techniques/{attack_id}")
async def get_technique_detail(
    attack_id: str,
    domain: Optional[str] = Query(default=None),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Chi tiết Technique/Sub-technique + Procedure Examples + Mitigations + Detection Strategy -> Analytic -> Data Component."""
    clean_id = attack_id.strip().upper()

    if domain:
        tech = await db.fetch_one_sql(
            """
            select * from public.attack_objects
            where domain = %s and type = 'attack-pattern' and upper(attack_id) = %s
            limit 1;
            """,
            (domain, clean_id),
        )
    else:
        # Ưu tiên bản active (không revoked/deprecated) và ưu tiên enterprise-attack nếu trùng ID
        tech = await db.fetch_one_sql(
            """
            select * from public.attack_objects
            where type = 'attack-pattern' and upper(attack_id) = %s
            order by (revoked or deprecated) asc,
                     case domain
                       when 'enterprise-attack' then 1
                       when 'mobile-attack' then 2
                       else 3
                     end asc
            limit 1;
            """,
            (clean_id,),
        )

    if not tech:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Technique có mã '{clean_id}'.",
        )

    resolved_domain = tech["domain"]
    stix_id = tech["stix_id"]

    # Thông tin technique thay thế nếu đối tượng đã bị revoked
    replaced_by_obj = None
    if tech.get("replaced_by_attack_id"):
        replaced_by_obj = await db.fetch_one_sql(
            """
            select attack_id, name, domain
            from public.attack_objects
            where domain = %s and attack_id = %s
            limit 1;
            """,
            (resolved_domain, tech["replaced_by_attack_id"]),
        )

    # Parent hoặc Sub-techniques liên quan
    parent_tech = None
    if tech["is_subtechnique"] and tech.get("parent_attack_id"):
        parent_tech = await db.fetch_one_sql(
            """
            select attack_id, name
            from public.attack_objects
            where domain = %s and type = 'attack-pattern' and attack_id = %s
            limit 1;
            """,
            (resolved_domain, tech["parent_attack_id"]),
        )

    subtechniques = await db.fetch_all_sql(
        """
        select attack_id, name, platforms, usage_count, is_new, is_changed
        from public.attack_objects
        where domain = %s
          and type = 'attack-pattern'
          and parent_attack_id = %s
          and not revoked and not deprecated
        order by attack_id;
        """,
        (resolved_domain, tech["attack_id"]),
    )

    # 1. Procedure Examples (Groups, Software, Campaigns dùng technique này) + Mitigations
    inbound_rows = await db.fetch_all_sql(
        """
        select r.rel_type, r.description as rel_description,
               o.stix_id, o.type, o.attack_id, o.name, o.data
        from public.attack_relationships r
        join public.attack_objects o
          on o.domain = r.domain and o.stix_id = r.source_ref
        where r.domain = %s
          and r.target_ref = %s
          and r.rel_type in ('uses', 'mitigates', 'detects', 'targets')
          and not o.revoked and not o.deprecated
        order by o.attack_id;
        """,
        (resolved_domain, stix_id),
    )

    # ICS Assets: attack-pattern --(targets)--> x-mitre-asset
    outbound_assets = await db.fetch_all_sql(
        """
        select r.description as rel_description,
               o.attack_id, o.name, o.description, o.data
        from public.attack_relationships r
        join public.attack_objects o
          on o.domain = r.domain and o.stix_id = r.target_ref
        where r.domain = %s
          and r.source_ref = %s
          and r.rel_type = 'targets'
          and o.type = 'x-mitre-asset'
          and not o.revoked and not o.deprecated
        order by o.attack_id;
        """,
        (resolved_domain, stix_id),
    )

    procedure_groups: List[Dict[str, Any]] = []
    procedure_software: List[Dict[str, Any]] = []
    procedure_campaigns: List[Dict[str, Any]] = []
    mitigations: List[Dict[str, Any]] = []
    strategy_rows: List[Dict[str, Any]] = []
    ics_assets: List[Dict[str, Any]] = list(outbound_assets)

    for row in inbound_rows:
        rtype = row["rel_type"]
        otype = row["type"]
        entry = {
            "attack_id": row["attack_id"],
            "name": row["name"],
            "type": otype,
            "description": row["rel_description"],
        }
        if rtype == "uses":
            if otype == "intrusion-set":
                procedure_groups.append(entry)
            elif otype in ("malware", "tool"):
                procedure_software.append(entry)
            elif otype == "campaign":
                procedure_campaigns.append(entry)
        elif rtype == "mitigates" and otype == "course-of-action":
            mitigations.append(entry)
        elif rtype == "detects" and otype == "x-mitre-detection-strategy":
            strategy_rows.append(row)
        elif rtype == "targets" and otype == "x-mitre-asset":
            ics_assets.append(entry)

    # 2. Dựng cây hoàn chỉnh: Detection Strategy (DET...) -> Analytic (AN...) -> Data Component (DC...)
    all_analytic_stix_ids: List[str] = []
    for srow in strategy_rows:
        refs = (srow.get("data") or {}).get("analytic_refs") or []
        for ref in refs:
            if ref not in all_analytic_stix_ids:
                all_analytic_stix_ids.append(ref)

    analytics_by_stix: Dict[str, Dict[str, Any]] = {}
    all_dc_stix_ids: List[str] = []
    if all_analytic_stix_ids:
        analytic_objs = await db.fetch_all_sql(
            """
            select stix_id, attack_id, name, description, platforms, data
            from public.attack_objects
            where domain = %s and stix_id = any(%s) and not revoked and not deprecated;
            """,
            (resolved_domain, all_analytic_stix_ids),
        )
        for aobj in analytic_objs:
            analytics_by_stix[aobj["stix_id"]] = aobj
            for lsr in (aobj.get("data") or {}).get("log_source_references") or []:
                dc_ref = lsr.get("x_mitre_data_component_ref")
                if dc_ref and dc_ref not in all_dc_stix_ids:
                    all_dc_stix_ids.append(dc_ref)

    dc_by_stix: Dict[str, Dict[str, Any]] = {}
    if all_dc_stix_ids:
        dc_objs = await db.fetch_all_sql(
            """
            select stix_id, attack_id, name, description, data
            from public.attack_objects
            where domain = %s and stix_id = any(%s);
            """,
            (resolved_domain, all_dc_stix_ids),
        )
        for dobj in dc_objs:
            dc_by_stix[dobj["stix_id"]] = dobj

    detection_strategies: List[Dict[str, Any]] = []
    for srow in strategy_rows:
        sdata = srow.get("data") or {}
        nested_analytics: List[Dict[str, Any]] = []
        for aref in sdata.get("analytic_refs") or []:
            aobj = analytics_by_stix.get(aref)
            if not aobj:
                continue
            adata = aobj.get("data") or {}
            log_sources_enriched: List[Dict[str, Any]] = []
            for lsr in adata.get("log_source_references") or []:
                dc_ref = lsr.get("x_mitre_data_component_ref")
                dc_info = dc_by_stix.get(dc_ref) if dc_ref else None
                log_sources_enriched.append(
                    {
                        "name": lsr.get("name") or "",
                        "channel": lsr.get("channel") or "",
                        "data_component": {
                            "attack_id": dc_info["attack_id"],
                            "name": dc_info["name"],
                            "description": dc_info["description"],
                        }
                        if dc_info
                        else None,
                    }
                )
            nested_analytics.append(
                {
                    "attack_id": aobj["attack_id"],
                    "name": aobj["name"],
                    "description": aobj["description"],
                    "platforms": aobj["platforms"],
                    "url": adata.get("url") or "",
                    "mutable_elements": adata.get("mutable_elements") or [],
                    "log_sources": log_sources_enriched,
                }
            )
        nested_analytics.sort(key=lambda x: x["attack_id"])
        detection_strategies.append(
            {
                "attack_id": srow["attack_id"],
                "name": srow["name"],
                "url": sdata.get("url") or "",
                "analytics": nested_analytics,
            }
        )

    # 3. Lấy thông tin bản dịch & hành vi phòng thủ từ DB (attack_translations)
    await _ensure_translations_db(db)
    all_needed_ids = [tech["attack_id"]] + [m["attack_id"] for m in mitigations if m.get("attack_id")]
    db_translations: Dict[str, Dict[str, Any]] = {}
    if all_needed_ids:
        try:
            trans_rows = await db.fetch_all_sql("""
                SELECT attack_id, name_vi, action_vi, summary_vi, tactical_insight_vi
                FROM public.attack_translations
                WHERE attack_id = ANY(%s);
            """, (all_needed_ids,))
            for tr in trans_rows:
                db_translations[tr["attack_id"]] = tr
        except Exception as e:
            logger.warning(f"Error reading attack_translations: {e}")

    # Làm giàu mitigations: gán action_vi ngắn gọn (<= 20 từ) và đánh dấu bản dịch
    for m in mitigations:
        mid = m.get("attack_id")
        tr = db_translations.get(mid)
        if tr and tr.get("action_vi"):
            m["action_vi"] = tr["action_vi"]
            m["is_auto"] = False
        else:
            desc = m.get("description") or ""
            clean_desc = re.sub(r"\[.*?\]\(.*?\)", "", desc)
            clean_desc = re.sub(r"\(Citation:.*?\)", "", clean_desc).strip()
            first_sent = clean_desc.split(". ")[0] if clean_desc else ""
            words = first_sent.split()[:18]
            m["action_vi"] = " ".join(words) + ("..." if len(first_sent.split()) > 18 else "") if words else f"Áp dụng biện pháp {m.get('name')} theo khuyến nghị MITRE."
            m["is_auto"] = True

    # Phân loại ranh giới vành đai: PRE-ATTACK, Cross-Boundary (xuyên vành đai), hoặc Internal (nội bộ)
    tactics = tech.get("tactics") or []
    tactics_lower = [t.lower() for t in tactics]
    is_pre = any(t in ("reconnaissance", "resource-development") for t in tactics_lower)
    is_cross = any(t in ("initial-access",) for t in tactics_lower)
    boundary_type = "pre" if is_pre else ("cross" if is_cross else "internal")

    # Xây dựng Fast Card 3 điều cốt lõi
    clean_tech_desc = re.sub(r"\[.*?\]\(.*?\)", "", tech.get("description") or "")
    clean_tech_desc = re.sub(r"\(Citation:.*?\)", "", clean_tech_desc).strip()
    first_tech_sent = clean_tech_desc.split(". ")[0] if clean_tech_desc else ""
    fast_what = f"{first_tech_sent}." if first_tech_sent else f"{tech['name']} ({tech['attack_id']}) là kỹ thuật thuộc giai đoạn {', '.join(tactics)}."

    if boundary_type == "pre":
        fast_sign = "Gần như KHÔNG để lại log trong mạng nội bộ (hoạt động xảy ra trên hạ tầng của bên thứ ba hoặc internet)."
    elif boundary_type == "cross":
        fast_sign = "Khởi phát từ kết nối web ngoài hoặc email, sau đó sinh tiến trình con bất thường hoặc kích hoạt khai thác trên máy trạm."
    elif len(detection_strategies) > 0 and detection_strategies[0].get("analytics"):
        top_strat = detection_strategies[0]
        top_an = top_strat["analytics"][0]
        top_log = top_an["log_sources"][0] if top_an.get("log_sources") else None
        if top_log:
            ch_name = top_log.get("channel") or (top_log.get("data_component") or {}).get("name") or "Kênh Telemetry"
            fast_sign = f"Nhận diện qua log {top_log['name']} ({ch_name}) theo chiến lược {top_strat['attack_id']}."
        else:
            fast_sign = f"Phát hiện dựa trên chiến lược {top_strat['attack_id']}: {top_strat['name']}."
    else:
        fast_sign = "Đối chiếu hành vi tiến trình bất thường với các kết nối mạng và khóa Registry vừa tạo."

    if len(mitigations) > 0:
        top_mit = mitigations[0]
        fast_mit = f"Áp dụng biện pháp [{top_mit['attack_id']} {top_mit['name']}]: {top_mit['action_vi']}"
    elif parent_tech:
        fast_mit = f"Chưa có mitigation riêng; áp dụng chính sách bảo vệ kế thừa từ kỹ thuật cha [{parent_tech['attack_id']} {parent_tech['name']}]."
    else:
        fast_mit = "Áp dụng nguyên tắc đặc quyền tối thiểu (Least Privilege) và phân tách mạng nghiêm ngặt."

    fast_card = {
        "what": fast_what,
        "sign": fast_sign,
        "mitigate": fast_mit,
    }

    # Dynamic Horizon Stages & Tactical Insight
    db_tech_tr = db_translations.get(tech["attack_id"])
    if db_tech_tr and db_tech_tr.get("tactical_insight_vi"):
        tactical_insight = db_tech_tr["tactical_insight_vi"]
    elif boundary_type == "pre":
        tactical_insight = f"{tech['name']} ({tech['attack_id']}) diễn ra hoàn toàn bên ngoài tầm với của firewall và EDR nội bộ. Khi đối phương bắt đầu tác chiến, họ đã sở hữu tài nguyên hợp lệ. Trọng tâm phòng thủ là đào tạo nhận thức nhân sự và thu thập Threat Intelligence từ bên ngoài."
    elif boundary_type == "cross":
        tactical_insight = f"{tech['name']} ({tech['attack_id']}) là kỹ thuật xâm nhập xuyên vành đai: đối phương chuẩn bị tài nguyên bên ngoài và lợi dụng các kênh tương tác để đưa mã độc vào mạng nội bộ. Cần bảo vệ tại Gateway kết hợp kiểm soát chặt chẽ thiết bị đầu cuối."
    else:
        tactical_insight = f"{tech['name']} ({tech['attack_id']}) thực thi ngay bên trong hệ thống nội bộ của bạn. Đây là vùng kiểm soát chính của EDR/SIEM, cho phép phát hiện trực tiếp qua các Data Components như Process Creation và Memory Modification."

    stage1 = "Hạ tầng / Tài nguyên ngoài" if boundary_type == "cross" else "Bên ngoài mạng tổ chức"
    stage2 = "Xâm nhập qua ranh giới mạng" if boundary_type == "cross" else "Điểm tiếp xúc biên"
    stage3 = "Thực thi mã trên Endpoint" if boundary_type == "cross" else "Vùng nội bộ được kiểm soát"

    if tech["attack_id"].startswith("T1566"):
        stage1 = "Email / Link gửi từ ngoài"
        stage2 = "Người dùng mở tệp / liên kết"
        stage3 = "Thực thi mã độc trên máy trạm"
    elif tech["attack_id"] == "T1190":
        stage1 = "Dịch vụ mạng lộ internet"
        stage2 = "Khai thác lỗ hổng từ xa"
        stage3 = "Chiếm quyền máy chủ biên"
    elif tech["attack_id"].startswith("T1189"):
        stage1 = "Web bị chèn mã độc"
        stage2 = "Khai thác trình duyệt web"
        stage3 = "Thực thi payload trên máy trạm"

    horizon = {
        "boundary_type": boundary_type,
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
        "insight": tactical_insight,
    }

    return {
        "domain": resolved_domain,
        "attack_id": tech["attack_id"],
        "name": tech["name"],
        "description": tech["description"],
        "platforms": tech["platforms"],
        "tactics": tech["tactics"],
        "is_subtechnique": tech["is_subtechnique"],
        "parent": parent_tech,
        "subtechniques": subtechniques,
        "revoked": tech["revoked"],
        "deprecated": tech["deprecated"],
        "replaced_by": replaced_by_obj,
        "usage_count": tech["usage_count"],
        "is_new": tech["is_new"],
        "is_changed": tech["is_changed"],
        "metadata": tech["data"],
        "procedures": {
            "groups": procedure_groups,
            "software": procedure_software,
            "campaigns": procedure_campaigns,
        },
        "mitigations": mitigations,
        "detection_strategies": detection_strategies,
        "ics_assets": ics_assets,
        "fast_card": fast_card,
        "tactical_insight": tactical_insight,
        "horizon": horizon,
    }


@router.get("/search")
async def search_attack_objects(
    q: str = Query(..., min_length=1, max_length=120),
    domain: Optional[str] = Query(default=None),
    type_filter: Optional[str] = Query(default=None, alias="type"),
    include_deprecated: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    _user: AuthenticatedUser = Depends(get_current_user),
    db: SupabaseDataClient = Depends(get_db_client),
) -> Dict[str, Any]:
    """Tìm kiếm toàn cục theo mã ATT&CK ID, tên hoặc từ khoá mô tả."""
    term = q.strip()
    like_prefix = f"{term}%"
    like_any = f"%{term}%"

    conditions = ["(attack_id ilike %s or name ilike %s or search_tsv @@ plainto_tsquery('english', %s))"]
    params: List[Any] = [like_prefix, like_any, term]

    if not include_deprecated:
        conditions.append("(not revoked and not deprecated)")
    if domain:
        conditions.append("domain = %s")
        params.append(domain)
    if type_filter:
        if type_filter == "software":
            conditions.append("type in ('malware', 'tool')")
        else:
            conditions.append("type = %s")
            params.append(type_filter)

    params.extend([term.upper(), like_prefix, limit])
    sql = f"""
        select domain, type, attack_id, name, is_subtechnique, tactics, platforms,
               revoked, deprecated, replaced_by_attack_id, usage_count
        from public.attack_objects
        where {' and '.join(conditions)}
        order by
          (upper(attack_id) = %s) desc,
          (attack_id ilike %s) desc,
          usage_count desc,
          attack_id asc
        limit %s;
    """
    rows = await db.fetch_all_sql(sql, tuple(params))
    return {"query": term, "count": len(rows), "results": rows}
