---
slug: applying-attack-in-soc
order: 8
title: "Ứng dụng ATT&CK Thực tế: Threat Hunting, Purple Team & Đánh giá Coverage"
reading_minutes: 5
badge_label: "Thực hành Đội ngũ"
try_technique_name: "Disable or Modify Tools"
try_domain: "enterprise-attack"
interactive_widget: "none"
---

### Tránh cái bẫy "Tô xanh 100% Ma trận" (Bingo Card Fallacy)

Sai lầm phổ biến nhất khi mới áp dụng ATT&CK là cố gắng đánh dấu phủ xanh toàn bộ hàng trăm Technique như chơi trò điền ô số. Không một tổ chức nào cần (hoặc có thể) viết cảnh báo cho mọi kỹ thuật trên mọi hệ điều hành mà mình không vận hành!

---

### Quy trình 4 bước áp dụng ATT&CK thông minh cho đội 2–10 người

1. **Lọc theo Nền tảng của tổ chức (Platform Filtering):**
   Mở **Matrix Explorer**, lọc đúng nền tảng công ty đang chạy (ví dụ `Windows`, `Linux`, `SaaS`, `Containers`).
2. **Ưu tiên theo Mối đe doạ Thực tế (Threat-Informed Prioritization):**
   Bật chế độ **Heatmap Độ phổ biến thực tế** hoặc xem các nhóm hoạt động trong khu vực/ngành nghề của bạn (như `APT32` ở Đông Nam Á, hoặc `2016 Ukraine` nếu vận hành OT) để biết ~30 Technique cốt lõi xuất hiện lặp đi lặp lại.
3. **Đo độ phủ trung thực trong Coverage Lab:**
   Chuyển sang phân hệ **Coverage Lab** ngay trên thanh menu, đánh dấu những kỹ thuật đội đã thực sự thu thập đủ **Data Component** và có **Analytic** hoạt động (mức `100` nếu tự tin, mức `50` nếu mới phủ một phần), sau đó xem danh sách **"Gợi ý Technique phổ biến chưa được cover"**.
4. **Kiểm chứng định kỳ (Purple Team):**
   Mỗi tháng chọn 2–3 kỹ thuật trọng tâm, cùng nhau kiểm tra trên môi trường thử nghiệm xem log có về đúng SIEM và cảnh báo có kích hoạt đúng như kỳ vọng hay không, rồi xuất tệp **ATT&CK Navigator JSON** để lưu mốc tiến bộ của cả đội!

