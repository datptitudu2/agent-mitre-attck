---
slug: what-is-attack
order: 1
title: "MITRE ATT&CK là gì? Tư duy Phòng thủ theo Hành vi"
reading_minutes: 4
badge_label: "Nền tảng Nhập môn"
try_technique_name: "Phishing"
try_domain: "enterprise-attack"
interactive_widget: "pyramid"
---

### Diễn giải của ATT&CK Lab (Dễ hiểu trong 1 phút)

Hãy hình dung bạn là người bảo vệ một toà nhà lớn:
- Nếu chỉ chặn theo **danh sách biển số xe đen** (giống như chặn địa chỉ IP hoặc mã băm tệp tin `SHA-256`), kẻ xấu chỉ cần đổi biển số khác trong 5 giây là đi qua trót lọt.
- Ngược lại, nếu camera và đội bảo vệ nhận diện theo **hành vi đáng ngờ** — ví dụ *"một người mặc đồng phục bảo trì nhưng lại cạy khoá phòng máy chủ lúc 2 giờ sáng"* — thì dù kẻ đó đổi bao nhiêu bộ quần áo vẫn bị phát hiện.

Đó chính là cốt lõi của **MITRE ATT&CK** (*Adversarial Tactics, Techniques, and Common Knowledge*): một bách khoa toàn thư mở, ghi chép lại **hành vi thực tế** của các nhóm tấn công ngoài đời thực trên toàn thế giới.

---

### Tại sao đội bảo mật không thể chỉ dựa vào IoC (IP / Hash)?

Trong mô hình nổi tiếng **Pyramid of Pain** (Kim tự tháp Nỗi đau của David Bianco):
1. **Tầng đáy (Dễ đổi nhất):** Giá trị băm tệp tin (Hash), địa chỉ IP, tên miền. Kẻ tấn công đổi tự động gần như không tốn chi phí.
2. **Tầng giữa:** Dấu vết mạng/máy chủ và Công cụ (Software). Đổi mất vài giờ đến vài ngày.
3. **Tầng đỉnh (Đau đớn nhất cho kẻ tấn công):** **TTPs** (*Tactics, Techniques, and Procedures*). Khi đội phòng thủ phát hiện dựa trên hành vi ở tầng này, kẻ tấn công buộc phải học lại hoặc viết lại toàn bộ quy trình tác chiến.

---

### 3 Ma trận (Domains) chính trong ATT&CK

- **Enterprise:** Mạng văn phòng, máy chủ Windows/Linux/macOS, Active Directory, Đám mây (IaaS/SaaS), Container và cả hệ thống **AI** mới nhất.
- **Mobile:** Thiết bị di động Android và iOS.
- **ICS (Industrial Control Systems):** Hệ thống điều khiển công nghiệp OT như trạm biến áp, nhà máy nước, dây chuyền sản xuất.

