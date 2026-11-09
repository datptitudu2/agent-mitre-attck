---
slug: procedures-real-world
order: 3
title: "Procedure Examples — Cầu nối từ Lý thuyết sang Thực chiến"
reading_minutes: 4
badge_label: "Tư duy Săn tìm"
try_technique_name: "Mshta"
try_domain: "enterprise-attack"
interactive_widget: "none"
---

### Procedure là gì mà quan trọng đến vậy?

Nếu **Technique** nói rằng *"kẻ tấn công có thể mượn tiện ích HTML hợp lệ của hệ điều hành để chạy kịch bản ẩn"*, thì **Procedure** (Ví dụ thực thi thực tế) trả lời chính xác:
> *"Trong các vụ việc có thật đã được điều tra công bố, các nhóm tấn công và mẫu mã độc đã gọi tiện ích đó theo ngữ cảnh nào, đi kèm dấu hiệu gì?"*

Trong dữ liệu STIX 2.1 của MITRE, mỗi **Procedure Example** chính là một mối quan hệ `uses` (sử dụng) nối từ một **Group**, **Software**, hoặc **Campaign** tới một **Technique** kèm đoạn mô tả trích dẫn báo cáo điều tra gốc.

---

### Cách người làm phòng thủ đọc mục Procedure Examples

> **Diễn giải của ATT&CK Lab:** Đừng học thuộc lòng từng câu chữ của một sự cố quá khứ — hãy rút ra **quy luật hành vi bất biến**!

Khi mở tab **Thực tế & Giảm thiểu** của một Technique ngay trong ATT&CK Lab, hãy tự hỏi 3 câu:
1. **Tiến trình cha – con (Parent–Child Process) là gì?** (Ví dụ: ứng dụng văn phòng Word/Excel hiếm khi nào tự nhiên gọi trình thông dịch kịch bản hệ thống).
2. **Kết nối mạng đi kèm có hợp lý không?** (Một tiện ích cục bộ bỗng nhiên tải dữ liệu từ Internet).
3. **Độ phổ biến thực tế ra sao?** Những Technique được hàng chục Group và Software cùng sử dụng chính là nơi bạn nên ưu tiên kiểm tra khả năng phát hiện trước tiên.
