---
slug: groups-software-campaigns
order: 4
title: "Groups, Software và Campaigns khác nhau thế nào?"
reading_minutes: 4
badge_label: "Tình báo Mối đe doạ"
try_technique_name: "Compromise Software Supply Chain"
try_domain: "enterprise-attack"
interactive_widget: "none"
---

### Ba mảnh ghép của bức tranh Tình báo Mối đe doạ (CTI)

Trong ATT&CK, hoạt động tấn công ngoài đời thực được tổ chức thành 3 loại thực thể bổ trợ lẫn nhau:

1. **Group (`Gxxxx` — STIX `intrusion-set`):**
   Tập hợp hoạt động tấn công có chung đặc điểm hạ tầng, mục tiêu và thói quen kỹ thuật được cộng đồng theo dõi qua thời gian dài (ví dụ: **APT32 / OceanLotus**, **APT29**, **Lazarus Group**).
2. **Software (`Sxxxx` — STIX `malware` & `tool`):**
   - **Malware:** Phần mềm được viết riêng cho mục đích độc hại (ví dụ `NotPetya`, `SUNBURST`, `Industroyer`).
   - **Tool:** Công cụ quản trị hoặc kiểm thử hợp pháp nhưng bị kẻ tấn công lạm dụng (ví dụ tiện ích nén, công cụ quản trị từ xa).
3. **Campaign (`Cxxxx` — STIX `campaign`):**
   Một chiến dịch cụ thể diễn ra trong khung thời gian xác định (ví dụ `SolarWinds Compromise`, `Operation Dream Job`, `2016 Ukraine Electric Power Attack`).

---

### Tại sao MITRE tách riêng Campaign khỏi Group?

Trong thực tế điều tra sự cố:
- Khi một đợt tấn công lớn vừa nổ ra, giới chuyên môn thấy rõ chuỗi hành vi liên kết với nhau (đủ để lập một hồ sơ **Campaign**), nhưng có thể mất nhiều tháng hoặc nhiều năm mới đủ bằng chứng quy gán (`attributed-to`) cho một **Group** cụ thể.
- Hơn nữa, một **Group** có thể thay đổi bộ kỹ thuật theo từng năm: xem theo **Campaign** giúp đội phòng thủ thấy rõ chuỗi tấn công của một sự kiện cụ thể từ đầu đến cuối mà không bị lẫn với các kỹ thuật cũ cách đây 10 năm của nhóm đó.

