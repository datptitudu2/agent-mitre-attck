---
slug: tactics-techniques-subtechniques
order: 2
title: "Phân biệt Tactic, Technique và Sub-technique"
reading_minutes: 4
badge_label: "Xương sống Ma trận"
try_technique_name: "Spearphishing Attachment"
try_domain: "enterprise-attack"
interactive_widget: "hierarchy"
---

### Ba câu hỏi vàng để không bao giờ nhầm lẫn

Khi nhìn vào bảng Ma trận ATT&CK khổng lồ, bạn chỉ cần nhớ 3 cấp độ từ tổng quát đến chi tiết:

| Khái niệm gốc | Câu hỏi trả lời | Ví dụ đời thường | Ví dụ trong ATT&CK |
|---|---|---|---|
| **Tactic** (Hàng ngang trên cùng) | **Tại sao?** (Mục tiêu lúc này là gì?) | Đột nhập vào trong nhà | `Initial Access` (Xâm nhập ban đầu) |
| **Technique** (Ô lớn trong cột) | **Bằng cách nào?** (Cách thức thực hiện) | Lừa chủ nhà tự mở cửa | `Phishing` (Tấn công lừa đảo) |
| **Sub-technique** (Ô con mở rộng) | **Chi tiết kỹ thuật nào?** | Gửi bưu phẩm giả mạo có gắn thiết bị | `Spearphishing Attachment` (Đính kèm tệp mồi nhử) |

---

### Điểm quan trọng hay gây hiểu nhầm

1. **Một Technique có thể nằm ở nhiều cột Tactic:**
   Ví dụ kỹ thuật `Scheduled Task/Job` vừa giúp kẻ tấn công **chạy mã** (`Execution`), vừa giúp **bám trụ sau khi khởi động lại máy** (`Persistence`), vừa có thể **chạy dưới quyền cao hơn** (`Privilege Escalation`).
2. **Thứ tự cột không bắt buộc phải đi lần lượt từng cột một:**
   Kẻ tấn công ngoài đời không cần đi đủ tất cả các cột; họ chỉ dùng những bước cần thiết để đạt mục tiêu, thậm chí lặp lại vòng `Discovery → Lateral Movement → Credential Access` nhiều lần.
3. **Tại sao phải chia nhỏ tới Sub-technique?**
   Nếu bạn nói với kỹ sư SIEM *"hãy viết rule bắt Phishing"* thì quá rộng. Nhưng nếu chỉ rõ `Spearphishing Attachment` vs `Spearphishing via Service`, nguồn log cần thu thập sẽ rõ ràng ngay lập tức.

