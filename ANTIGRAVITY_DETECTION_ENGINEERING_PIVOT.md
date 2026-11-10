# 🛠️ PIVOT: từ "thẻ kiến thức" sang "Detection Engineering Workbench"
### Cho Antigravity / Gemini 4 Argon — áp dụng cho Popup Technique, Learning Path và các trang mới
> Đọc kèm `DESIGN.md`. Quy trình: đọc hết → **kế hoạch + wireframe + đề xuất migration Supabase (artifact)** → chờ tôi duyệt → làm theo Phase, mỗi Phase có ảnh trước/sau + rubric kèm bằng chứng cụ thể.
> **Mọi bảng ánh xạ/nội dung biên soạn phải nằm trong Supabase (có trang Admin để sửa), không hard-code trong mã.**

---

## ⚠️ ĐIỀU CHỈNH ƯU TIÊN (phản hồi mới nhất của chủ dự án — THẮNG mọi mục mâu thuẫn bên dưới)

**Chủ dự án KHÔNG muốn bài tập.** Mục tiêu là: **kiến thức đầy đủ, thực tiễn, trực quan, dễ nhớ.** Do đó:

**BỎ (không xây, không đưa vào kế hoạch/migration):**
- Mọi bài tập, thử thách, chấm điểm, bảng điểm, xếp hạng, đồ án cuối (capstone), quiz bắt buộc.
- Bảng `lab_challenges`, `lab_attempts`; "chế độ thử thách" của Rule Playground; các mục "Bài tập" trong bảng track ở mục 8; các tiêu chí nghiệm thu liên quan.
- Bảng xếp hạng đồng đội, streak, huy hiệu.

**ĐỔI VAI TRÒ:**
- *Rule Playground* → **Rule Explorer**: chỉ **xem** một luật Sigma chạy trên bộ log mẫu (tô sáng sự kiện khớp / không khớp, giải thích vì sao), có thể chỉnh luật để quan sát — **không chấm điểm, không "thử thách"**.
- *Learning Path* → **Lộ trình đọc**: thứ tự đọc gợi ý + trạng thái "đã đọc / chưa đọc", không bài tập. Mỗi bài là kiến thức + ví dụ có sẵn lời giải thích.
- *Flashcard/thẻ ôn* → **tuỳ chọn thụ động**: nút "Đánh dấu để xem lại" nhắc lại khi người dùng muốn; không bắt buộc, không điểm số.
- *Case Theater "Phòng thủ thử"* → giữ như **công cụ khám phá** (thử đặt biện pháp và xem chuỗi dừng ở đâu), **không điểm số/xếp hạng**.
- *Notebook Colab* → **tài liệu tham khảo tuỳ chọn**, không phải bài tập.

**GIỮ NGUYÊN (là lõi "kiến thức thực tiễn"):** Knowledge Hovercards (mục 13), Telemetry (mục 3), Agent Telemetry Planner (công cụ ứng dụng), nội dung ML (mục 5), luật Sigma hiển thị kèm giải thích (mục 4), chòm sao giải thích được (mục 14), Case Theater (các tab).

**THÊM để kiến thức dễ nhớ (thay cho bài tập):**
1. **"Chuỗi 6 mắt xích" — một khung tư duy duy nhất cho MỌI technique**, lặp lại giống hệt ở mọi nơi để người học hình thành mô hình trong đầu (chunking):
   `① HÀNH VI (kẻ tấn công làm gì) → ② DẤU VẾT (để lại gì trên máy/mạng) → ③ NGUỒN LOG (thu ở đâu: Sysmon/EventID/auditd) → ④ CÁCH PHÁT HIỆN (luật/analytic) → ⑤ ĐẶC TRƯNG ML (tín hiệu để mô hình học) → ⑥ CÁCH CHẶN (mitigation)`.
   Thẻ nhanh (mục 00) của popup hiển thị đúng 6 mắt xích này, mỗi mắt xích 1 câu; các mục 03–06 là phần mở rộng của từng mắt xích. Cùng một biểu tượng/số thứ tự cho mỗi mắt xích ở mọi trang.
2. **Annotated Log Reader ("đọc log có chú giải")**: hiển thị một sự kiện log mẫu (có nhãn `MINH HOẠ`); **hover từng trường** (`Image`, `ParentImage`, `CommandLine`, `GrantedAccess`…) → giải thích ý nghĩa, vì sao trường đó quan trọng với technique, bình thường trông thế nào và đáng ngờ trông thế nào. Đây là ví dụ thực hành *chỉ để đọc*, thay cho bài tập.
3. **So sánh Windows ↔ Linux cạnh nhau** cho cùng một hành vi (vd tạo tiến trình: Sysmon EID 1 / 4688 ↔ auditd `execve`): bảng hai cột, cùng 6 mắt xích.
4. **Trang tra cứu nhanh (cheat-sheet)** in được: Sysmon Event ID, Windows Security EventID quan trọng, record/syscall auditd, danh sách đặc trưng ML hay dùng — tra theo thuật ngữ, có hover giải thích.
5. **Chuyện thật gắn với kiến thức:** từ mỗi mắt xích có link tới *bước trong case* nơi nó xuất hiện (SolarWinds, NotPetya…), để nhớ bằng câu chuyện.
6. **Bản đồ phủ kiến thức (Knowledge Coverage Map)** trong Admin: bảng "chủ đề × số mục đã có / đã duyệt / mục tiêu" (Sysmon, Windows Security, auditd, ETW, eBPF, osquery, Zeek, luật, đặc trưng ML, mô hình, độ đo, kiến trúc agent) để theo dõi độ đầy đủ — **không hard-code**, đọc từ `knowledge_entries`.

**Nghiệm thu thay thế:** thay các mục "bài tập/thử thách/chấm điểm" bằng — (a) mọi technique ưu tiên đều có đủ 6 mắt xích (hoặc `CHƯA CÓ DỮ LIỆU` ở mắt xích thiếu); (b) Annotated Log Reader cho ≥ 10 sự kiện phổ biến (Sysmon, Windows Security, auditd); (c) ≥ 3 cặp so sánh Windows ↔ Linux; (d) cheat-sheet hoạt động; (e) Knowledge Coverage Map hiển thị đúng.

---

## 0. Vấn đề cần giải quyết (phản hồi của người dùng, đánh giá là đúng)

Popup hiện tại (đã đẹp, đúng `DESIGN.md`) về bản chất vẫn là **trang MITRE được dàn lại**: cùng dữ liệu, thêm vài hình. Học xong người dùng **chỉ biết** technique là gì, chứ **không làm được** việc thật. Mục tiêu thật của người dùng là:

> *Dùng ATT&CK để xây **endpoint agent (Windows/Linux)** và **mô hình ML phát hiện** — cần biết: thu telemetry gì, viết luật gì, trích đặc trưng gì, gán nhãn thế nào, kiểm thử và đo độ phủ ra sao.*

**Điểm khác biệt cần tạo ra so với website MITRE:**

| MITRE ATT&CK gốc | ATT&CK Lab (sau pivot) |
|---|---|
| Mô tả technique | **Telemetry nào trên máy Windows/Linux của bạn nhìn thấy nó** (EventID/auditd/field) |
| Có Detection Strategy/Analytic (chữ) | **Luật Sigma thật** + sân thử luật chạy ngay trên log mẫu, có TP/FP |
| Không nói gì về ML | **Đặc trưng, nhãn, bẫy, dataset, cách đánh giá** cho từng nhóm technique |
| Không biết agent của bạn thu gì | **Agent Telemetry Planner**: chọn collector → ra độ phủ + danh sách lỗ hổng |
| Bài học tĩnh | **Learning Path theo vai trò** với bài tập tự chấm |

---

## 1. Audit nhanh hiện trạng (dựa trên ảnh chụp trang đã triển khai)

> Lưu ý: audit này dựa trên ảnh chụp popup `T1659 Content Injection` và trang `/learn`; **chưa thấy** nội dung bài giảng 2–8, quiz, `/coverage`, `/explorer`, `/whats-new`. Agent phải tự rà toàn bộ các trang này và nộp bảng audit tương tự.

**Còn lỗi/hạn chế ở popup:**
1. Thẻ nhanh mục "1. LÀ GÌ" **vẫn là tiếng Anh nguyên văn**; "ẩn dụ" **vẫn là câu mẫu chung** ("Mượn áo bảo vệ để mở két sắt… Living off the Land") và **không đúng** với technique (T1659 là chèn nội dung vào lưu lượng mạng, không phải dùng công cụ hợp lệ). Cùng kiểu sai đã thấy ở T1542.001. → Ẩn dụ chỉ hiển thị khi `status = reviewed`.
2. Mục "Tầm nhìn": ô **"BÊN NGOÀI: [Không phát sinh từ ngoài]" gần như trống**, ô tô nền đỏ (trái nguyên tắc không tint), câu nhận định kết luận chung chung ("bảo vệ tại Gateway…").
3. Mục "Chòm sao": chỉ có **2 điểm** (Disco, MoustachedBouncer) trên canvas rộng gần trống; tên bị cắt `MoustachedBo…`. Khi ít hơn ~6 thực thể → dùng danh sách, không dùng canvas.
4. Thước tactic dùng **chữ xoay dọc** khó đọc (`Trinh sát`, `Tài nguyên`…).
5. Mô tả Analytic/Mitigation/vụ việc còn nhiều tiếng Anh, chưa có nhãn bản dịch tự động.
6. Mọi mục chỉ **mô tả**, không có hành động nào ("làm gì với kiến thức này?").

**Learning Path (`/learn`):**
- 8 bài "≤ 5 phút/bài", thiên khái niệm (ATT&CK là gì, tactic/technique, procedure, group, mitigation, DET→AN→DC, v18→v20); tiến độ `0/8`; chưa thấy bài tập nào gắn với telemetry, luật hay ML. → Cần tái cấu trúc thành các **track theo vai trò** (mục 7).

---

## 2. Cấu trúc mới của Popup Technique: HIỂU → LÀM

Giữ drawer cuộn một mạch, mục lục dính. Thêm **công tắc hệ điều hành `WINDOWS | LINUX | MACOS`** (chỉ hiện OS mà technique áp dụng, lấy từ `x_mitre_platforms`); công tắc này đổi nội dung các mục 03–06.

```
 LỚP "HIỂU" (ngắn, 1 phút)
 00 THẺ NHANH         ← 3 điều cần nhớ (tiếng Việt, đã duyệt hoặc nhãn bản nháp)
 01 VỊ TRÍ & AI DÙNG  ← thước tactic + trước/sau + danh sách thực thể (gộp mục 02,03 cũ)
 02 TẦM NHÌN          ← trong/ngoài mạng (sửa theo mục 1) — rút gọn

 LỚP "LÀM" (trọng tâm, phụ thuộc OS đã chọn)
 03 TELEMETRY         ← máy bạn cần thu gì, ở đâu, field nào (mục 3)
 04 LUẬT PHÁT HIỆN    ← Sigma/CAR liên quan + "Thử trong sân luật" (mục 4)
 05 ĐẶC TRƯNG & ML    ← observable → đặc trưng → nhãn → bẫy → dataset (mục 5)
 06 KIỂM THỬ & ĐỘ PHỦ ← cách xác nhận bạn thấy nó + tác động lên độ phủ agent (mục 6)

 PHỤ
 07 NGUYÊN VĂN MITRE  ← đã render, thu gọn
 08 GHI NHỚ           ← thẻ ôn + câu hỏi nhanh
```
Style theo `DESIGN.md` (hairline, không card/tint/glass, serif cho tiêu đề, một khung duy nhất cho Thẻ nhanh).

---

## 3. Mục 03 — TELEMETRY: "máy tôi cần thu gì để thấy nó?"

**Nguồn dữ liệu (ưu tiên theo thứ tự):**
1. **Chính STIX ATT&CK v18+:** mỗi Analytic có tham chiếu log source (tên + channel, ví dụ `WinEventLog:Security // EventCode=4688`) gắn với Data Component (DCxxxx) — dữ liệu này **đã hiển thị trong mục DET→AN→DC**; parse ra bảng có cấu trúc.
2. **CTID Sensor Mappings to ATT&CK (SMAP):** ánh xạ sự kiện cảm biến ↔ Data Source/Component cho **Sysmon, WinEvtx, Auditd, OSQuery, Zeek, CloudTrail**; có tải CSV/STIX. ⚠️ SMAP xây trên danh mục Data Component **cũ (khoảng v13)** nên không khớp 1–1 với DCxxxx của v18+ → khớp theo tên + **bắt buộc duyệt tay** (cột `review_status`).
3. **Bổ sung biên soạn** (SMAP không phủ): ETW providers, eBPF, EDR-native — ghi `source = curated`, có `confidence`.

**Hiển thị:** với OS đang chọn, bảng:

```
DATA COMPONENT        COLLECTOR · EVENT              FIELD QUAN TRỌNG              CẦN BẬT
DC0032 Process Creat. Sysmon EID 1 / WinEvtx 4688     Image, CommandLine, ParentImage, Hashes   Sysmon cấu hình process_create; chính sách "Audit Process Creation" + command-line logging
DC0067 Logon Session  WinEvtx 4624/4648               LogonType, TargetUserName, IpAddress      Audit Logon
…
```
- Ghi rõ **cái gì bật mặc định, cái gì phải bật** và **chi phí** (khối lượng log: thấp/vừa/cao — thang định tính, không bịa số liệu).
- Technique chủ yếu ở **lớp mạng/ngoài endpoint** (vd T1659, hay nhãn `PRE`) → hiển thị rõ: *"Technique này chủ yếu quan sát ở lớp mạng/proxy (Zeek, proxy log), endpoint agent thấy rất ít"* — đây là thông tin quan trọng cho người xây agent, không được che giấu.
- Mỗi dòng có nút **"Thêm vào profile agent của tôi"** (liên kết Planner, mục 8).

---

## 4. Mục 04 — LUẬT PHÁT HIỆN + SÂN THỬ LUẬT

**Nguồn:** SigmaHQ (luật Sigma công khai, gắn tag `attack.tXXXX`); tuỳ chọn MITRE CAR (pseudo-code analytics). **Kiểm tra giấy phép của từng nguồn trước khi lưu/hiển thị lại** (SigmaHQ dùng Detection Rule License — phải ghi nguồn/tác giả); luật/nguồn có giấy phép hạn chế (vd Elastic) → **chỉ link ra ngoài**, không lưu nội dung.

**Mỗi luật hiển thị:** tên, `level`, `logsource` (product/category), tóm tắt logic bằng tiếng Việt (nhãn `BẢN NHÁP AI` đến khi duyệt), **`falsepositives`** (ghi chú dương tính giả), **độ bền trước né tránh** (luật dựa vào tên file/hash dễ bị đổi → yếu; dựa vào hành vi/quan hệ tiến trình → bền hơn; gắn nhãn định tính và tham chiếu khung *Summiting the Pyramid* của CTID nếu có điểm số chính thức), link nguồn + commit + tác giả.

**Sân thử luật `/lab/rules` (và nhúng trong mục 04):**
- Trình soạn (CodeMirror) cho **tập con Sigma**: `selection`/`filter`, `condition` (`and/or/not`, `1 of`, `all of`), modifier `contains`, `startswith`, `endswith`, `re`, `all`.
- **Bộ đánh giá viết bằng TypeScript chạy ở trình duyệt** (có unit test), chạy trên **bộ sự kiện mẫu** gồm sự kiện lành tính + sự kiện hành vi đáng ngờ **đã gắn nhãn**, hiển thị **TP / FP / FN**, danh sách sự kiện khớp, và gợi ý giảm FP.
- **Chế độ thử thách:** "Bắt hành vi của T1xxx với FP ≤ N", tự chấm điểm, lưu `lab_attempts`.
- **Bộ sự kiện mẫu:** tổng hợp (synthetic) hoặc trích từ nguồn có giấy phép phù hợp (xem mục 5), **nhỏ (≤ ~500 sự kiện/bộ)**, có nhãn `MINH HOẠ`; **không chứa mã độc, payload hay lệnh khai thác có thể dùng lại**.

---

## 5. Mục 05 — ĐẶC TRƯNG & ML: "biến technique thành bài toán học máy"

Nội dung xây ở **mức Data Component (~100 mục, tái dùng cho mọi technique)** + biên soạn riêng cho ~30 technique phổ biến nhất.

**Cấu trúc mỗi mục:**
1. **Observable:** sự kiện/trường nào mang tín hiệu (vd tiến trình cha–con, command line, image load, truy cập tiến trình, registry, kết nối mạng, `execve`…).
2. **Đặc trưng gợi ý:** tần suất hiếm của cặp cha–con, độ dài/entropy/n-gram của command line, đường dẫn bất thường, tính hợp lệ chữ ký số, cấp độ toàn vẹn, thời điểm trong ngày, **baseline theo từng máy/người dùng**, đặc trưng chuỗi (n-gram theo cây tiến trình), đồ thị tiến trình.
3. **Nhãn:** nhãn ATT&CK là **nhãn ý đồ/hành vi**, không phải nhãn từng sự kiện; khuyến nghị gán ở mức *cửa sổ thời gian/đoạn cây tiến trình*, nêu rõ **nhiễu nhãn** và **chồng lấn giữa technique**.
4. **Cách tiếp cận phù hợp** (`technique_approach`): `LUẬT ĐỦ DÙNG` · `HÀNH VI + BASELINE` · `MÔ HÌNH CHUỖI` · `CHỦ YẾU NGOÀI ENDPOINT` — kèm lý do tiếng Việt.
5. **Bẫy thường gặp:** rò rỉ dữ liệu qua dấu vết công cụ mô phỏng (tên bài test, đường dẫn lab), mất cân bằng lớp cực đoan, **chia tập theo thời gian và theo máy** (không chia ngẫu nhiên), trôi dạt khái niệm, kẻ tấn công thích nghi/né tránh, chi phí cảnh báo.
6. **Cách đánh giá:** precision tại ngân sách cảnh báo/ngày, recall theo từng technique, thời gian-đến-phát-hiện — **không dùng accuracy**.
7. **Dataset gợi ý (chỉ metadata + link + giấy phép):** ví dụ bộ telemetry Windows đã gắn ATT&CK của OTRF *Security-Datasets*, kho *attack_data* của Splunk, DARPA OpTC (đồ thị tiến trình). **Agent phải tự kiểm tra tồn tại, giấy phép và định dạng của từng nguồn** trước khi đưa vào; không liệt kê nguồn không xác minh được.

**Notebook thực hành:** sinh sẵn các Jupyter notebook ngắn (`content/notebooks/*.ipynb`): nạp mẫu nhỏ → trích đặc trưng → mô hình cơ sở (Isolation Forest / gradient boosting) → đánh giá chia theo thời gian. Nút **"Mở trong Colab"**; ứng dụng **không chạy mô hình** trên Vercel.

**Nhãn trung thực bắt buộc:** *"Gợi ý học tập, không phải công thức đảm bảo hiệu quả; hiệu quả phụ thuộc dữ liệu của bạn."* Không bịa chỉ số hiệu năng.

---

## 6. Mục 06 — KIỂM THỬ & ĐỘ PHỦ

- **Kiểm thử:** liệt kê các bài test tương ứng trong **Atomic Red Team** (chỉ *tên, nền tảng, link* — **không hiển thị lệnh trong ứng dụng**), kèm *"sự kiện bạn **nên thấy** nếu telemetry đúng"* (lấy từ mục 03). Nhãn: *chỉ chạy trong môi trường lab được uỷ quyền.*
- **Độ phủ:** hiển thị "với profile agent đang chọn, technique này: `QUAN SÁT ĐƯỢC` / `MỘT PHẦN` / `MÙ`" và "thêm collector X sẽ nâng lên …".
- Liên kết sang Case Theater nếu technique xuất hiện trong case đã có scene.

---

## 7. Agent Telemetry Planner (`/agent`) — trang mới, là điểm khác biệt lớn nhất

**Mục tiêu:** trả lời *"agent của tôi đang thu những gì thì thấy được bao nhiêu technique, còn mù ở đâu, nên bổ sung gì trước?"*

**Cách hoạt động (tính hoàn toàn từ dữ liệu):**
1. Người dùng chọn OS và các **collector/nguồn log** đang/dự định bật (Sysmon, Windows Security audit policies, ETW providers, auditd, osquery, eBPF, Zeek…). Mỗi collector đã gắn tập sự kiện → Data Component (bảng `dc_event_map`).
2. Hệ thống tính **tập Data Component được phủ**.
3. Với mỗi technique (theo OS): duyệt Detection Strategy → Analytic (đúng nền tảng) → tập DC cần có.
   - `QUAN SÁT ĐƯỢC` nếu có ≥1 analytic mà **mọi** DC cần thiết đều được phủ;
   - `MỘT PHẦN` nếu chỉ có một số DC;
   - `MÙ` nếu không có.
4. Hiển thị: **heatmap Matrix**, % độ phủ theo tactic, **danh sách lỗ hổng xếp hạng theo độ phổ biến** (số group/campaign dùng technique), và **gợi ý "collector/DC nên thêm tiếp theo" theo thuật toán tham lam** ("thêm Sysmon EID 10 → +N technique").
5. Lưu nhiều profile, so sánh 2 profile (split slider), xuất **ATT&CK Navigator layer** + **checklist cấu hình** (nhóm audit policy / nhóm quy tắc Sysmon / nhóm luật auditd cần bật).
6. **Chú thích trung thực cố định:** *"Quan sát được ≠ phát hiện được. Độ phủ này chỉ nói bạn CÓ dữ liệu để viết luật/mô hình, không nói luật đó đã tồn tại hay hiệu quả."*

---

## 8. Learning Path — tái cấu trúc theo track

Giữ track nền tảng nhưng **rút gọn còn 4–5 bài** (loại bỏ lặp), rồi thêm các track thực hành:

| Track | Nội dung | Bài tập |
|---|---|---|
| **0 · Nền tảng** | ATT&CK là gì, Tactic/Technique, mô hình DET→AN→DC, v18→v20 | Quiz + thẻ ôn |
| **1 · Telemetry Windows** | Security log, Sysmon, ETW; tiến trình, đăng nhập, dịch vụ, tác vụ lên lịch, registry, truy cập tiến trình | Với một nhóm technique: chọn đúng EventID/field; đọc log mẫu và chỉ ra bằng chứng |
| **2 · Telemetry Linux** | auditd (quy tắc, syscall/record), journald/syslog, giới thiệu eBPF | Viết quy tắc auditd tối thiểu (chỉ mô tả/khung, trong sân thử); đọc log mẫu |
| **3 · Viết luật phát hiện** | Sigma, `logsource`, thống kê/ngưỡng, giảm dương tính giả, **độ bền trước né tránh** | Thử thách trong Rule Playground (có chấm điểm TP/FP) |
| **4 · ML cho phát hiện endpoint** | Nhãn, đặc trưng, baseline, mô hình chuỗi, đánh giá, trôi dạt, đối kháng | Notebook Colab + câu hỏi kiểm tra khái niệm |
| **5 · Xây endpoint agent** | Kiến trúc collector → chuẩn hoá (OCSF/ECS) → luật/ML → phản ứng; hiệu năng, chống can thiệp, quyền riêng tư; **dùng Planner** | **Capstone:** thiết kế gói thu thập + phát hiện cho case SolarWinds hoặc NotPetya trên agent Windows+Linux (Planner + Playground + Case Theater) |

**Khuôn mỗi bài:** `Tình huống thực tế → Dữ liệu/telemetry mẫu → Bài tập tương tác → Tự chấm → Liên kết technique/case → Thẻ ôn`.
**Kỹ thuật:** nội dung bài viết bằng MDX trong repo; các widget nhúng được (`<TechniqueCard/>`, `<RulePlayground/>`, `<CoveragePlanner/>`, `<EventTimeline/>`); tiến độ lưu `lesson_progress`. Đề xuất phương án lưu (MDX trong repo vs bảng DB) và lý do trong kế hoạch.

---

## 9. Thay đổi Supabase cần thiết (agent đề xuất migration chi tiết, RLS đầy đủ)

> Nguyên tắc: **bảng tham chiếu** (dữ liệu chung) → mọi user đã đăng nhập được đọc, chỉ `admin` ghi; **bảng người dùng** → chỉ chủ sở hữu (hoặc `shared = true`). Dùng `(select auth.uid())` trong policy. **Giới hạn DB free 500 MB** → không lưu dataset lớn, chỉ metadata + mẫu nhỏ.

**Tham chiếu telemetry**
- `collectors(id, slug, name, os[], kind, docs_url, notes_vi)` — Sysmon, WinEvtx/Security, ETW, auditd, osquery, eBPF, Zeek…
- `collector_events(id, collector_id, event_key, name, key_fields jsonb, default_enabled bool, volume_hint, enable_howto_vi)` — vd `sysmon:1`, `winsec:4688`, `auditd:execve`.
- `dc_event_map(id, dc_attack_id, event_id → collector_events, source ('stix'|'smap'|'curated'), confidence, review_status, reviewed_by, note)`.
- `technique_required_dcs` — **materialized view** (technique × analytic → tập DC cần có), làm mới sau mỗi sync.

**Luật & kiểm thử**
- `detection_rules(id, source ('sigmahq'|'car'|…), source_rule_id, title, status, level, logsource jsonb, tags text[], technique_ids text[], yaml text NULL, falsepositives text[], repo_url, commit_sha, license, author, robustness ('low'|'medium'|'high'|NULL), summary_vi, review_status)` — `yaml` chỉ lưu khi giấy phép cho phép.
- `atomic_tests(id, technique_id, test_guid, name, platforms[], url)` — chỉ metadata.
- `lab_event_sets(id, title, os, technique_ids[], license, source_note, events jsonb, labels jsonb)` — nhỏ, có nhãn.
- `lab_challenges(id, slug, title, event_set_id, target_technique, constraints jsonb, difficulty, hint_vi)`
- `lab_attempts(id, user_id, challenge_id, rule_text, result jsonb, score, created_at)`

**ML**
- `feature_recipes(id, scope ('data_component'|'technique'), scope_id, observables_vi, features_vi, labeling_vi, pitfalls_vi, eval_vi, review_status)`
- `technique_approach(attack_id, approach, rationale_vi, review_status)`
- `datasets(id, name, url, license, os[], format, description_vi, technique_ids[], verified_at)` — metadata, link ra ngoài.
- `notebooks(id, slug, title, colab_url, repo_path, track, lesson_slug)`

**Agent Planner**
- `agent_profiles(id, user_id, name, os, collector_event_ids uuid[], extra jsonb, shared bool, created_at)`
- (tuỳ chọn) `agent_coverage_snapshots(profile_id, attack_version, summary jsonb, created_at)` để cache.

**Học tập & nội dung (từ prompt trước nếu chưa có)**
- `technique_explanations`, `technique_insights`, `review_cards`, `lesson_progress`, `scenario_runs`.

**Pipeline đồng bộ mới (GitHub Actions, không chạy trên Vercel):** SigmaHQ (tag `attack.t…`), Atomic Red Team (chỉ chỉ mục), SMAP (CSV/STIX), (tuỳ chọn) CAR. **Mỗi lần ghi nhận `source_url + commit_sha + license + thời điểm`.** Lỗi một nguồn không làm hỏng toàn bộ sync. **Trang Admin:** hàng đợi duyệt (ánh xạ DC↔event, tóm tắt tiếng Việt, ẩn dụ, feature recipes), CRUD các bảng tham chiếu, nhập CSV.

---

## 10. Nguyên tắc nội dung & an toàn (không thương lượng)

- **Phòng thủ:** không payload, không lệnh khai thác có thể dùng lại, không IoC thật; Atomic Red Team chỉ link + metadata + nhãn "lab được uỷ quyền".
- **Giấy phép:** kiểm tra và ghi rõ giấy phép/tác giả/commit cho mọi nội dung bên ngoài; nguồn hạn chế → chỉ link.
- **Trung thực:** nhãn `BẢN NHÁP AI` / `ĐÃ DUYỆT`, `MINH HOẠ`, `OBSERVABLE ≠ DETECTED`; không bịa số liệu hiệu năng ML; mapping thiếu → hiển thị `CHƯA CÓ DỮ LIỆU`, không đoán.
- Ghi nguồn/bản quyền MITRE ATT&CK & phiên bản dữ liệu theo điều khoản.
- Tuân thủ `DESIGN.md` mục 8 (danh sách cấm giao diện).

---

## 11. Lộ trình (dừng chờ duyệt sau mỗi Phase)

- **P0 — Dọn nợ popup:** sửa 6 điểm ở mục 1 (ẩn dụ chỉ khi đã duyệt, thẻ nhanh không còn tiếng Anh thô, bỏ tint ở "Tầm nhìn", chòm sao → danh sách khi ít thực thể, nhãn tactic dễ đọc, nhãn bản dịch) + rà audit toàn bộ trang chưa kiểm tra.
- **P1 — Telemetry + Planner MVP:** parse log source từ STIX, nhập SMAP, bảng `collectors/collector_events/dc_event_map`, mục 03 của popup, trang `/agent` (tính độ phủ + lỗ hổng + gợi ý tham lam + Navigator layer).
- **P2 — Luật & Sân thử:** crawl SigmaHQ → `detection_rules`, mục 04, Rule Playground (bộ đánh giá TS + test), 5–10 thử thách đầu tiên.
- **P3 — ML:** `feature_recipes` cho các Data Component chính, `technique_approach`, mục 05, 3–4 notebook Colab đầu.
- **P4 — Learning Path theo track** (Track 1, 3 trước; sau đó 2, 4, 5) + capstone.
- **P5 — Kiểm thử & liên thông:** mục 06 (Atomic metadata), liên kết Case Theater ↔ Planner ↔ Playground, thẻ ôn.

---

## 12. Nghiệm thu

- [ ] Với **T1059.001** và ít nhất 4 technique khác (Windows + Linux): đủ mục 03–06 hoạt động; mục thiếu dữ liệu hiển thị `CHƯA CÓ DỮ LIỆU`.
- [ ] Mục 03 cho đúng EventID/field khớp STIX & SMAP; ánh xạ `smap` có `review_status`; technique thiên về lớp mạng được ghi rõ.
- [ ] Planner: chọn "Sysmon + Windows Security" → ra độ phủ (kèm công thức/giải thích), danh sách lỗ hổng xếp hạng, gợi ý "thêm gì tiếp theo" **kiểm chứng tay đúng trên ≥ 3 technique**; xuất Navigator layer mở được.
- [ ] Rule Playground: bộ đánh giá có unit test (selection/filter/condition/modifier, trường thiếu, regex lỗi); thử thách chấm đúng TP/FP; không có nội dung độc hại.
- [ ] Mọi luật ngoài có tác giả/giấy phép/commit/link; nguồn hạn chế chỉ link.
- [ ] Nội dung ML có đủ 7 phần; không có số liệu hiệu năng bịa; notebook mở được trên Colab.
- [ ] Learning Path có ≥ 2 track thực hành hoàn chỉnh (Track 1 và 3) với bài tập tự chấm; tiến độ lưu đúng; RLS đúng (user A không thấy dữ liệu user B).
- [ ] Migration Supabase có RLS, index, `(select auth.uid())`; DB chưa vượt ngân sách (báo cáo `pg_total_relation_size`).
- [ ] Ảnh trước/sau (1440/1024/390, Dark+Light), rubric `DESIGN.md` mục 7 ≥ 4/5 kèm bằng chứng cụ thể; 60fps; axe-core không lỗi nghiêm trọng.
- [ ] Báo cáo cuối: đã làm / chưa làm / đánh đổi / rủi ro giấy phép / đề xuất tiếp.

---

## 13. BỔ SUNG — "Kiến thức tại chỗ" (Knowledge Hovercards): chạm vào thuật ngữ là học, không phải rời trang

**Vấn đề:** hiện người học gặp `Sysmon EID 10`, `EventCode=4688`, `auditd execve`, `Isolation Forest`, `baseline`, `label leakage`… rồi phải ra Google/MITRE/docs để hiểu → mất mạch, và Lab không khác gì trang MITRE.

**Giải pháp:** mọi thuật ngữ kỹ thuật xuất hiện trong ứng dụng đều là một **"mục tri thức" (knowledge entry)** có thẻ nổi tại chỗ. Hai phía:

- **Phía AGENT / ENDPOINT:** Sysmon (từng Event ID), Windows Security EventID, ETW provider, auditd (record/syscall), eBPF, osquery table, các field quan trọng (`Image`, `ParentImage`, `CommandLine`, `LogonType`, `GrantedAccess`…), cách bật/cấu hình ở mức khái niệm.
- **Phía AI / ML:** đặc trưng (frequency, entropy, n-gram, parent-child rarity), baseline theo máy/người dùng, nhãn & nhiễu nhãn, rò rỉ dữ liệu, mô hình (Isolation Forest, gradient boosting, mô hình chuỗi), độ đo (precision tại ngân sách cảnh báo, PR-curve), trôi dạt, né tránh.

### 13.1 Hành vi
- **Hover / focus bàn phím / chạm (mobile)** vào thuật ngữ → hiện **thẻ nhỏ** (≤ ~120 từ) gồm: *định nghĩa 1–2 câu tiếng Việt · vì sao quan trọng với ATT&CK · 1 ví dụ cực ngắn (dòng log mẫu có nhãn `MINH HOẠ`, công thức, hoặc mini-diagram) · "dùng khi nào / bẫy thường gặp"*.
- Có thể cho thẻ liệt kê **liên kết nội bộ**: "Dùng để phát hiện: T1003.001, T1059.001…", "Data Component: DC0032", "Bài học liên quan", "Luật liên quan".
- Bấm **"Mở rộng"** → **mở ngay trong drawer** (ngăn xếp điều hướng push/pop + breadcrumb + nút ← quay lại), KHÔNG chuyển trang, KHÔNG mở tab ngoài. Từ đó đi tiếp sang mục liên quan, hoặc "Mở trang đầy đủ" `/kb/<slug>` nếu muốn.
- Ví dụ chuỗi đi sâu **không cần rời ứng dụng**: `Technique T1003.001` → hover `Sysmon EID 10` → mở rộng (trường `GrantedAccess`, `TargetImage`, ví dụ sự kiện mẫu, nhiễu thường gặp) → bấm sang luật liên quan → thử trong Rule Playground.
- Link ra nguồn gốc (MITRE/Microsoft/docs) chỉ là **"Tham khảo"** nhỏ ở cuối, không bắt buộc để học.

### 13.2 Ở đâu xuất hiện
Popup technique (mục 03–06), bài học trong Learning Path, luồng telemetry của Case Theater (hover `DCxxxx` / EventID), Agent Planner (hover collector/event), Rule Playground (hover field/modifier), Notebook/ML section (hover đặc trưng, độ đo).

### 13.3 Kỹ thuật & dữ liệu (Supabase)
- `knowledge_entries(id, slug unique, kind ('collector_event'|'field'|'agent_concept'|'ml_concept'|'metric'|'model'|'tool'), title_vi, aliases text[], short_vi, detail_mdx, example jsonb, when_to_use_vi, pitfalls_vi, sources jsonb, review_status ('draft'|'reviewed'), reviewed_by, updated_at)`
- `knowledge_links(entry_id, target_type ('technique'|'data_component'|'lesson'|'rule'|'entry'), target_id, relation)` — đồ thị liên kết hai chiều (backlinks).
- RLS: member đọc; admin ghi. Có trang Admin để duyệt/sửa/nhập CSV.
- **Auto-linker:** quét văn bản (mô tả đã dịch, bài học MDX, panel) để bọc thuật ngữ khớp `title_vi`/`aliases` bằng `<Term slug>`; **chỉ bọc lần xuất hiện đầu tiên trong mỗi đoạn** để không rối mắt; tôn trọng ranh giới từ (đừng khớp "execve" bên trong từ khác); có danh sách loại trừ.
- **UI:** Radix `HoverCard` + `Popover` (hover có độ trễ ~150ms, focus, tap); prefetch bằng TanStack Query; bộ nhớ đệm; có `aria-describedby`, đóng bằng Esc; không che nội dung đang đọc; style theo `DESIGN.md` (hairline, mono cho ID, không glow/card tint).
- **Nội dung:** viết **bằng lời của Lab, không sao chép tài liệu gốc** (tránh vấn đề bản quyền); ví dụ log là **tổng hợp** có nhãn `MINH HOẠ`. Khởi đầu ~150 mục ưu tiên (Sysmon EID 1/3/7/8/10/11/12-13/22, Windows 4624/4625/4648/4688/4697/4698/4104/1102, các record auditd chính, ETW cơ bản, và các khái niệm ML ở trên). Nội dung do LLM soạn nháp **phải mang nhãn `BẢN NHÁP AI` đến khi người duyệt**.
- Mỗi mục có chỉ số "được dùng ở N chỗ" để biết nên ưu tiên viết sâu mục nào.

### 13.4 Nghiệm thu
- [ ] Hover/focus/tap hoạt động trên desktop, bàn phím và mobile; không che nội dung, đóng bằng Esc.
- [ ] Đi từ T1003.001 → Sysmon EID 10 → luật liên quan → Rule Playground **mà không rời ứng dụng**.
- [ ] ≥ 100 mục `reviewed` (hoặc ghi rõ tỉ lệ `draft`) và ≥ 30 mục thuộc phía ML.
- [ ] Auto-linker không bọc nhầm, không bọc lặp trong cùng đoạn; có unit test.
- [ ] Không có nội dung chép nguyên từ tài liệu gốc; mọi ví dụ log có nhãn `MINH HOẠ`.

---

## 14. BỔ SUNG — Chòm sao "Ai dùng nó" phải *giải thích được*, không chỉ để ngắm
> Áp dụng cho chòm sao ở popup technique (ví dụ T1197 BITS Jobs với 13 thực thể) và mọi hình vẽ quan hệ khác. **Nguyên tắc chung: mọi phần tử trên hình (nút, cạnh, ký hiệu, màu, chú giải) đều phải có nghĩa và giải thích được khi hover/focus/chạm.**

### 14.1 Hiện trạng cần sửa (từ ảnh T1197)
1. **Nhãn chồng nhau:** `Cobalt Strike` đè lên `Wizard Spider`, `Leviathan` bị đường nối cắt. Dùng d3-force với `forceCollide` theo **bán kính nhãn** (không chỉ bán kính nút) hoặc bố trí tia + đặt nhãn ngoài vòng, đủ số tick để ổn định.
2. **Màu xanh dương của Software không thuộc bảng token** (chỉ có 2 màu tín hiệu `--attack`/`--defend`). Phân biệt loại bằng **hình + nét**, không bằng thêm màu: Group = vòng rỗng, Software = vuông, Campaign = tam giác; `--attack` chỉ dùng cho technique ở giữa và trạng thái được chọn.
3. **Mọi nút cùng cỡ, mọi cạnh giống nhau** → không truyền tải thông tin. Cỡ nút theo **số technique mà thực thể đó dùng** (độ "rộng" của đối tượng); độ đậm cạnh theo mức liên quan (vd có nhiều procedure example).
4. **Nhãn đỏ `Bazar` không rõ nghĩa:** mọi trạng thái màu (hover, chọn, nổi bật) phải có ý nghĩa nhất quán và có trong chú giải.
5. Chú giải `o GROUP · ▫ SOFTWARE · △ CAMPAIGN` chỉ là chữ → làm **chú giải tương tác** (hover vào từng mục giải thích: *Group = nhóm tấn công được MITRE theo dõi; Software = mã độc/công cụ mà họ dùng; Campaign = một chiến dịch cụ thể*).

### 14.2 Hover / focus / chạm vào NÚT → thẻ giải thích (dữ liệu thật từ STIX + nội dung Lab)
**Group (vd Patchwork G0040):** tên + alias · **số technique nhóm này dùng** · tactic nổi bật của nhóm · **"Họ dùng T1197 như thế nào"** (trích từ mô tả quan hệ `uses` — procedure example — tóm tắt tiếng Việt, nhãn `BẢN NHÁP AI` nếu chưa duyệt) · nút "Xem hồ sơ nhóm".
**Software (vd Cobalt Strike, BITSAdmin):** loại **malware hay tool** (lấy từ STIX type — cho biết công cụ hợp pháp bị lạm dụng, vd BITSAdmin là tiện ích Windows có sẵn) · nền tảng · **dùng T1197 để làm gì** · số technique khác nó dùng · "Phòng thủ nên chú ý" (1 câu, đã duyệt).
**Campaign:** thời gian `first_seen`–`last_seen` (nếu có), mô tả ngắn, nhóm liên quan.
**Nút trung tâm (technique):** nhắc lại 3 điều cần nhớ.
Thẻ ≤ ~100 từ, theo `DESIGN.md` (hairline, mono cho ID), có `aria-describedby`, mở bằng hover / focus / tap, đóng bằng Esc.

### 14.3 Hover vào CẠNH → "đường nối này nói gì"
Hiển thị đúng **một câu quan hệ** (vd *"Patchwork dùng BITS Jobs để tải thêm mã độc về máy"* — rút từ procedure example) + trích nguồn. Đây là phần giúp hiểu "vì sao nút này nối với technique kia".

### 14.4 Tương tác khám phá (đi sâu mà không rời drawer)
- Hover nút → **làm mờ phần còn lại**, nổi bật nút + cạnh; hiện thêm **các technique khác** nút đó dùng dưới dạng chấm mờ nhỏ quanh nó.
- **Bấm nút → "tái tâm"** chòm sao quanh thực thể đó (nó dùng những technique nào), có breadcrumb `T1197 › Patchwork › T1059.001` và nút ← quay lại — *ngăn xếp điều hướng trong drawer*, không chuyển trang.
- **Bộ lọc nhanh:** chỉ Group / chỉ Software / chỉ Campaign; sắp xếp theo "số technique dùng".
- Hiển thị "**các technique thường đi kèm**" (đồng xuất hiện trong cùng đối tượng) kèm chú thích giới hạn dữ liệu đã yêu cầu ở mục 3.3 của file Technique Dossier.

### 14.5 Quy tắc hiển thị
- Ít hơn ~6 thực thể → dùng **danh sách** (canvas gần trống như ca T1659 là lãng phí); nhiều hơn ~40 → gộp/hiện top-N + "xem tất cả".
- **Có phương án không chỉ hover:** bấm để "ghim" thẻ (mobile/bàn phím); danh sách văn bản tương đương cho trình đọc màn hình.
- `prefers-reduced-motion`: tắt mô phỏng lực, bố trí tĩnh.
- Ngôn ngữ giải thích: tiếng Việt, tên riêng giữ nguyên; không bịa thông tin ngoài dữ liệu — thiếu thì hiện `CHƯA ĐỦ DỮ LIỆU`.

### 14.6 Nghiệm thu
- [ ] Không còn nhãn chồng nhau ở 1440/1024/390 với T1197 (13 thực thể) và một technique có ~40 thực thể.
- [ ] Mọi phần tử (nút, cạnh, chú giải) có giải thích khi hover/focus/chạm; kiểm bằng bàn phím và mobile.
- [ ] Cỡ nút theo số technique dùng; số liệu khớp truy vấn kiểm tra tay trên 3 thực thể.
- [ ] Không còn màu ngoài token; phân biệt loại bằng hình.
- [ ] Tái tâm + breadcrumb hoạt động, không rời drawer.
- [ ] Ít thực thể → danh sách; nhiều thực thể → top-N có "xem tất cả".

---

## 15. YÊU CẦU BỔ SUNG — Đồng bộ thiết kế trang MATRIX (`/matrix`) với các trang đã làm xong
> Hiện `/matrix` còn mang phong cách cũ (bo tròn, nền tint, màu xanh cyan/tím) trong khi `/cases`, `/learn`, popup Technique đã theo `DESIGN.md` ("Hồ sơ tình báo × Bản đồ"). **Mục tiêu: người dùng chuyển giữa các trang mà không thấy "hai sản phẩm khác nhau".** Quy tắc: **giữ mọi chức năng và bố cục dễ nhìn hiện có; chỉ đổi "da" (token, typography, hình khối) và sửa các điểm khó đọc.**

### 15.1 Hiện trạng cần đổi (từ ảnh chụp `/matrix`)
| Phần tử | Đang có | Đổi thành |
|---|---|---|
| Chip `v20.1 • 15 Tactics • 227 Techniques` | Viên thuốc viền cyan | Một dòng mono dưới tiêu đề: `V20.1 · 15 TACTICS · 227 TECHNIQUES`, không chip |
| Banner "Lưu ý cho người học" | Hộp bo tròn nền tím/hồng, chữ nhấn màu hồng | Dải mỏng hairline + vạch dọc 2px bên trái, chữ thường; nhấn bằng `--bone-100`; nút đóng và ghi nhớ đã đóng (bằng localStorage có try/catch) |
| Công tắc `Enterprise / Mobile / ICS` | Khối xanh dương sáng | Segmented control hairline, chỉ báo trượt bằng spring, mono UPPERCASE, màu chọn = `--attack`/trung tính (không dùng xanh dương) |
| Thanh lọc (tìm kiếm, platform, "Mới ở bản này", Bookmark, Heatmap) | Ô/nút bo tròn dạng pill | Ô vuông hairline (radius 2–4px), placeholder mono, nút dạng chữ + icon stroke 1.25; Heatmap = công tắc chữ `HEATMAP: TẮT / ĐỘ PHỔ BIẾN / COVERAGE CỦA TÔI` |
| Đầu cột tactic | Thẻ lớn nền xanh nhạt, icon cyan, **tên tactic gần như không đọc được** (xanh trên xanh) | Nhãn mono `TA0043 · 01 / RECONNAISSANCE` + tên tiếng Việt serif/sans rõ nét, nền = bề mặt trung tính, đường kẻ dưới; **đạt contrast AA** |
| Icon tactic | Icon thư viện màu cyan | **Bộ ký hiệu hình học tự vẽ** nét 1.25px (đã đặc tả ở `DESIGN.md` mục 3) |
| Ô technique | Hộp bo tròn, ID màu cyan | Ô hairline sát khít (radius 2px), ID mono `--bone-500`, tên `--bone-100`; hover: nổi viền `--line-strong` |
| Dấu `Đổi` (vàng) và `NEW` (xanh lá) | Chip màu | Nhãn mono nhỏ: `ĐỔI` (`--caution`, ≤5% diện tích) và `NEW` (`--attack`), kèm **chú giải ở thanh lọc** giải thích từng nhãn |
| Chip số sub-technique `.3 >` | Chip bo tròn | Chỉ số mono `+3` + mũi tên, bấm để xổ danh sách thụt lề có vạch dọc 1px |
| Số lượng ở góc đầu cột | Viên thuốc tối | Số mono thường |
| Nền trang | Phẳng | Lưới toạ độ 32px rất mờ + thước toạ độ mảnh ở mép khung (như `DESIGN.md`) |

### 15.2 GIỮ NGUYÊN (vì dễ nhìn / dễ dùng)
- 15 cột tactic cuộn ngang với **header dính**, thứ tự đúng ma trận; mật độ ô gọn như hiện tại.
- Hiển thị **ID + tên** trong từng ô; số sub-technique; dấu "Đổi/NEW".
- Tìm kiếm nhanh theo ID/tên, lọc **Platform**, nút **"Mới ở bản này"**, **Bookmark (N)**, **Heatmap** (Độ phổ biến thực tế, Coverage của tôi).
- Công tắc Enterprise / Mobile / ICS; thông tin phiên bản dữ liệu; banner giải thích "14 → 15 Tactics" (một lần, đóng được).
- Bấm technique mở drawer chi tiết bên phải (đã đồng bộ phong cách).

### 15.3 Cải thiện dễ nhìn (làm cùng lúc)
1. **Technique thuộc nhiều tactic** (vd T1197 xuất hiện ở Execution và Persistence) hiện lặp mà không giải thích → thêm ký hiệu nhỏ `◐ 3 tactic`; hover một technique thì **làm sáng viền tất cả vị trí xuất hiện của nó** trong ma trận.
2. **Hover kể chuyện** (đã đặc tả): làm mờ ô không liên quan, nổi các technique cùng group/software phổ biến.
3. **Chế độ Heatmap** dùng đúng dải `--heat-0 … --heat-5` (đơn sắc), có thanh chú giải thang đo.
4. Dòng trạng thái lọc: "Đang hiển thị 143 / 227 technique" + nút xoá bộ lọc.
5. Hiển thị phím tắt: `/` để tìm, `Esc` đóng drawer, `←/→` chuyển giữa các technique lân cận trong cột.
6. Khi drawer mở, **làm dịu nền ~40% (không blur)** và **đánh dấu technique đang xem** trong ma trận.
7. Responsive 1440 / 1024 / 390 (mobile: cột tactic chuyển thành danh sách accordion theo tactic).

### 15.4 Chuẩn hoá toàn site
Rà **mọi trang còn lại** (Tổng quan, Coverage Lab, Explorer, Có gì mới, Admin, trang đăng nhập) xem còn sót phong cách cũ không (bo tròn lớn, nền tint, viền cyan/tím, chip, glow). Nộp bảng audit "trang → vi phạm → đã sửa/chưa" và sửa **cùng đợt** với Matrix. Dùng **một bộ component dùng chung** (Button, SegmentedControl, Field, Tag, Banner, TableRow…) thay vì sửa lẻ từng trang, để mọi trang đồng bộ tự động.

### 15.5 Nghiệm thu riêng cho mục này
- [ ] Đặt cạnh nhau `/matrix`, `/cases`, `/learn`, popup: cùng token, cùng typography, cùng hình khối; không còn xanh dương/cyan/tím ngoài token; không còn pill/chip metadata; không còn glow.
- [ ] Tên tactic ở đầu cột đạt contrast AA (kèm số đo); mọi nhãn mono không nhỏ hơn 11px.
- [ ] Toàn bộ chức năng ở 15.2 vẫn hoạt động.
- [ ] Ký hiệu đa-tactic và hover làm sáng các vị trí hoạt động đúng với T1197 và 2 technique khác.
- [ ] Ảnh trước/sau (1440/1024/390, Dark + Light) cho `/matrix`; rubric `DESIGN.md` mục 7 ≥ 4/5 kèm bằng chứng cụ thể; 60fps khi cuộn ma trận.
- [ ] Bảng audit toàn site đã nộp; các trang còn lại đã đồng bộ hoặc có lý do ghi rõ.

---

## 16. Lỗi nội dung đã thấy trong bài học 2 (`/learn?lesson=tactics-techniques-subtechniques`) và popup mở từ bài học
1. **Có thể sai ID technique dẫn chiếu:** bài viết đặt "Spearphishing Attachment" dưới **Phishing thuộc Initial Access**, nhưng nút "Thử nghiệm trên dữ liệu thật" mở `T1598.002` — popup cho thấy technique này thuộc **Reconnaissance** (Phishing for Information). Hai technique khác nhau (nhiều khả năng ví dụ đúng là `T1566.001`). **Đối chiếu mọi ID trong mọi bài học với DB**, sửa và thêm CI cảnh báo khi tactic của technique dẫn chiếu không khớp với tactic bài nói tới.
2. **Bảng "Khái niệm gốc | Câu hỏi trả lời | Ví dụ đời thường | Ví dụ trong ATT&CK"** hiển thị không viền, không phân hàng, khó đọc → hairline từng hàng, header mono, cột ví dụ ATT&CK dùng `<Term>` (hover giải thích) thay vì chữ mono trơn.
3. Văn bản bài dính nhau, thiếu khoảng cách đoạn; tiêu đề phụ ("Điểm quan trọng hay gây hiểu nhầm") chưa là heading → áp thang chữ và khoảng đệm theo `DESIGN.md`.
4. Popup mở từ bài học vẫn có: mục "LÀ GÌ" **tiếng Anh nguyên văn**; **ẩn dụ mẫu chung** không khớp technique (đã yêu cầu chỉ hiển thị ẩn dụ khi `reviewed`).
5. Viền chọn bài (cam + xanh chồng) → dùng `:focus-visible` theo token.
