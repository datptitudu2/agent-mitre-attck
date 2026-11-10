---
slug: mitigations-defense
order: 5
title: "Mitigations — Phòng ngừa Chủ động trước khi Cảnh báo Nổ"
reading_minutes: 4
badge_label: "Kiến trúc Phòng thủ"
try_technique_name: "LSASS Memory"
try_domain: "enterprise-attack"
interactive_widget: "none"
---

### Phát hiện (Detection) tốt, nhưng Ngăn chặn (Mitigation) còn tốt hơn

Nhiều người mới học ATT&CK chỉ tập trung viết rule cảnh báo SIEM mà quên mất rằng: nếu kiến trúc hệ thống khoá chặt bề mặt tấn công ngay từ đầu (**Mitigation** — mã `Mxxxx`), đội trực SOC sẽ giảm được hàng nghìn cảnh báo nhiễu mỗi tháng.

---

### Ví dụ thực tế: Bảo vệ thông tin xác thực trong bộ nhớ

Hãy xét một trong những hành vi phổ biến nhất trên Windows là đọc vùng bộ nhớ tiến trình xác thực (`LSASS Memory`):
- **Nếu chỉ dựa vào Detection:** Kẻ tấn công đã chiếm quyền trên máy, chạy công cụ đọc bộ nhớ → EDR/SIEM mới phát cảnh báo → SOC phải chạy đua khoanh vùng trước khi kẻ tấn công kịp dùng mật khẩu đó sang máy chủ khác.
- **Nếu kết hợp Mitigation từ trước:**
  1. Bật **Credential Guard / LSA Protection** để cách ly vùng nhớ xác thực bằng ảo hoá phần cứng.
  2. Không bao giờ dùng tài khoản quản trị miền (Domain Admin) đăng nhập trực tiếp lên máy trạm người dùng (**Privileged Account Management**).
  3. Dùng mật khẩu quản trị cục bộ khác nhau cho từng máy (**LAPS**).

Khi đó, dù máy trạm đầu tiên bị lừa mở tệp độc hại, kẻ tấn công vẫn bị chặn đứng trước bức tường di chuyển ngang!

