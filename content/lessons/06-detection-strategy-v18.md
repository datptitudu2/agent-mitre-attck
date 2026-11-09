---
slug: detection-strategy-v18
order: 6
title: "Mô hình Phát hiện Mới (v18+): Detection Strategy → Analytic → Data Component"
reading_minutes: 5
badge_label: "Trọng tâm v18+"
try_technique_name: "Code Signing"
try_domain: "enterprise-attack"
interactive_widget: "det-tree"
---

### Tại sao MITRE khai tử mục "Detections / Data Sources" kiểu cũ?

Trước phiên bản **ATT&CK v18 (10/2025)**, phần gợi ý phát hiện của mỗi Technique chỉ là vài dòng văn bản mô tả chung chung kèm danh sách *Data Source* rời rạc. Kỹ sư SOC thường lúng túng: *"Biết là cần Process Creation rồi, nhưng logic kết hợp các trường dữ liệu trên Windows khác Linux ra sao, và ngưỡng nào cần tinh chỉnh theo môi trường công ty?"*

Từ **v18 trở đi**, MITRE tái cấu trúc toàn bộ thành chuỗi **3 tầng có cấu trúc chặt chẽ** trong dữ liệu STIX 2.1:

---

### Giải phẫu Chuỗi `DET → AN → Data Component`

1. **Detection Strategy (`DETxxxx` — Chiến lược phát hiện cấp cao):**
   Định nghĩa ý tưởng phát hiện cốt lõi cho một Technique, hoàn toàn **độc lập với nhà cung cấp hay hệ điều hành**.
2. **Analytic (`ANxxxx` — Logic phân tích theo nền tảng):**
   Mỗi Detection Strategy chứa một hoặc nhiều Analytic cụ thể cho `Windows`, `Linux`, `macOS`, `SaaS`, `AI`... Bên trong Analytic còn chỉ rõ **Mutable Elements** — tức những tham số (như danh sách tiến trình quản trị nội bộ, dải IP máy chủ backup, ngưỡng thời gian) mà mỗi tổ chức **phải tự tinh chỉnh** để giảm báo động giả!
3. **Data Component (`DCxxxx` — Nguồn Telemetry / Kênh Log):**
   Mỗi Analytic liên kết trực tiếp tới các Data Component kèm tên kênh nhật ký cụ thể (ví dụ `WinEventLog:Security EventCode=4688` hoặc `auditd SYSCALL`).

> **Mẹo thực hành trên ATT&CK Lab:** Bấm nút **"Thử ngay Technique mẫu"** bên dưới và chuyển sang tab **Detection → Analytic** để tận mắt xem cấu trúc cây 3 tầng này trên dữ liệu thật!
