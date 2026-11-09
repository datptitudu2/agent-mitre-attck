---
slug: evolution-v18-v19-v20
order: 7
title: "ATT&CK Tiến hoá thế nào qua v18 → v19 → v20?"
reading_minutes: 5
badge_label: "Bài học Đặc biệt"
try_technique_name: "Direct Prompt Injection"
try_domain: "enterprise-attack"
interactive_widget: "version-slider"
---

### Đừng để tài liệu cũ làm bạn bỡ ngỡ!

Nếu bạn đọc một cuốn sách hoặc bài blog viết trước năm 2025, họ sẽ nói *"Enterprise ATT&CK có 14 Tactics, trong đó cột thứ 5 là Defense Evasion, và phát hiện dựa trên Data Sources"*.
Trong vòng chưa đầy 1 năm (**10/2025 → 10/2026**), MITRE đã thực hiện **3 bước nhảy vọt lớn nhất lịch sử ATT&CK**. Hãy kéo thanh trượt tương tác ngay bên dưới để quan sát trực quan từng cột mốc!

---

### Ba cột mốc thay đổi kiến trúc bạn cần thuộc lòng

1. **ATT&CK v18 (Tháng 10/2025) — Cách mạng hoá Detection Engineering:**
   Loại bỏ hoàn toàn văn bản Detections cũ và đối tượng `x-mitre-data-source` trung gian; thay bằng kiến trúc ba tầng **Detection Strategy (`DET`) → Analytic (`AN`) → Data Component (`DC`)** có kèm `Mutable Elements`.
2. **ATT&CK v19 (28/04/2026) — Tách đôi Defense Evasion → Ma trận 15 Tactics:**
   Trước đây, cột *Defense Evasion* ôm đồm quá nhiều kỹ thuật khác bản chất. Từ v19, MITRE chính thức tách thành 2 Tactic riêng biệt:
   - **Stealth (`TA0005`):** Hành vi *ẩn mình, che giấu dấu vết* để không bị nhìn thấy (Masquerading, Fileless Storage, Timestomp...).
   - **Defense Impairment (`TA0112`):** Hành vi *chủ động tấn công, tắt hoặc làm mù* công cụ bảo vệ (Disable or Modify Tools, Clear Event Logs, Code Signing abuse...).
   Nhờ vậy, Enterprise ATT&CK tăng từ **14 lên 15 Tactics**, và Mobile ATT&CK có bộ Detection Strategies đầu tiên.
3. **ATT&CK v20 & v20.1 (Tháng 10–11/2026) — Kỷ nguyên Bảo mật Hệ thống AI & Mở rộng ICS:**
   - Bổ sung loạt kỹ thuật nhắm trực diện vào ứng dụng **AI / LLM** doanh nghiệp: `Direct Prompt Injection`, `Indirect Prompt Injection`, `AI Result Poisoning`, `Impair Autonomous Defenses`, `AI-Enabled Exfiltration`.
   - Phủ rộng Detection Strategies cho cả Enterprise và ICS, đồng thời tăng cường ngữ cảnh thiết bị công nghiệp (**ICS Assets**).
