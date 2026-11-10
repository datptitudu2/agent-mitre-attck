# 🎨 DESIGN.md — Chỉ đạo thiết kế UI & Motion cho "ATT&CK Lab"
### Dành cho Gemini 4 Argon trong Antigravity

> **File này THẮNG mục 7 ("Thiết kế giao diện") của file prompt chính** nếu hai bên mâu thuẫn.
> Mục tiêu duy nhất của file này: giao diện **đẹp thật sự, có cá tính, có chuyển động tinh tế, và KHÔNG có "mùi AI/template"**.
> Đọc hết file → viết **Design Brief + Design Tokens + kế hoạch review** thành artifact → chờ tôi duyệt → mới code UI.

---

## 1. Tư duy gốc (đọc kỹ)

Bạn không "dựng giao diện cho đẹp". Bạn là **art director + motion designer + front-end engineer** đang làm một sản phẩm có bản sắc riêng.

Giao diện "mùi AI" gần như luôn do: chọn mọi thứ ở mức **mặc định an toàn** (font mặc định, gradient tím-xanh, card bo tròn đồng loạt, glow neon, icon emoji, bố cục 3 cột giống nhau). Hãy **chủ động làm khác**: mỗi quyết định thiết kế phải có **lý do gắn với nội dung** (ATT&CK = bản đồ hành vi kẻ tấn công), không phải vì "trông ngầu".

**Câu hỏi tự kiểm tra cho mọi màn hình:** *"Nếu bỏ logo đi, người xem có đoán ra đây là template Tailwind/shadcn/landing page AI không?"* Nếu có → làm lại.

---

## 2. Concept nghệ thuật: "Hồ sơ tình báo × Bản đồ địa hình"

ATT&CK là **bản đồ lãnh thổ của kẻ tấn công**. Giao diện lấy cảm hứng từ:
- **Hồ sơ tình báo / field manual / atlas địa lý:** lưới toạ độ, ghi chú bên lề, nhãn số hiệu, dấu đăng ký (registration marks), đường đồng mức, chú giải (legend).
- **Biên tập báo chí (editorial):** chữ serif lớn, tương phản kích thước dữ dội, cột chữ có nhịp, số liệu như infographic của báo in cao cấp.
- **Đài chỉ huy (mission control) tiết chế:** dữ liệu mật độ cao nhưng sạch, mono cho số hiệu, trạng thái live nhỏ gọn.

Từ khoá cảm xúc: *điềm tĩnh, chính xác, có trọng lượng, hơi nguy hiểm — như đọc một bản báo cáo mật được dàn trang rất đẹp.*
**Không** phải: "cyberpunk neon", "hacker xanh lá Matrix", "SaaS landing tím gradient".

> Nếu sau khi đọc references (mục 9) bạn thấy hướng khác tốt hơn, **được đề xuất tối đa 2 hướng thay thế** trong Design Brief kèm lý do, nhưng phải chọn một và nhất quán.

---

## 3. Design Tokens (điểm khởi đầu — được tinh chỉnh nhưng phải giữ tinh thần)

### 3.1 Màu — kỷ luật: *nền trung tính ấm + đúng 2 màu tín hiệu*
```css
:root {
  /* Dark là mặc định — màu mực hơi ngả xanh rêu, KHÔNG phải đen xanh navy */
  --ink-950:#0A0C0B; --ink-900:#101311; --ink-800:#171B19; --ink-700:#222724;
  --line: rgba(236,232,222,.10);       /* hairline 1px, dùng thay cho shadow */
  --line-strong: rgba(236,232,222,.22);
  --bone-100:#ECE8DE; --bone-300:#B9B5A9; --bone-500:#7C7A72;   /* chữ: trắng ngà, không #fff */

  --attack:#FF5A36;     /* vermilion — hành vi kẻ tấn công, cảnh báo, điểm nhấn chính */
  --defend:#6FCFB2;     /* xanh bạc hà trầm — phát hiện/giảm thiểu/phòng thủ */
  --caution:#F2B84B;    /* chỉ dùng dưới 5% diện tích (deprecated/ghi chú) */
}
/* Light = chủ đề "giấy hồ sơ" thiết kế RIÊNG, không phải đảo màu dark */
[data-theme="light"] {
  --paper:#F3EFE6; --paper-2:#EAE5D8; --ink:#141412; --line: rgba(20,20,18,.12);
}
```
Quy tắc màu:
- **Không rainbow cho 15 tactic.** Mỗi tactic nhận diện bằng **số thứ tự + ký hiệu hình học + độ đậm của một dải màu**, chỉ tactic đang chọn mới dùng màu tín hiệu. Tactic **Stealth** và **Defense Impairment** (mới ở v19) có dấu "NEW" nhỏ bằng `--attack`.
- Heatmap dùng **một dải màu liên tục** (ink → vermilion), không dùng đỏ-vàng-xanh kiểu bảng điều khiển mặc định.
- **Cấm:** gradient tím→xanh, gradient chữ (text gradient), glow neon quanh card, blur glass ở mọi nơi. Glass chỉ được dùng **tối đa 1–2 chỗ** có lý do (vd panel nổi trên graph).
- Phân tầng bằng **độ sáng nền + hairline**, không bằng shadow dày hay viền phát sáng.

### 3.2 Typography — yếu tố quyết định "mùi AI"
- **Display (tiêu đề lớn, số liệu hero):** serif có cá tính, biến thiên (gợi ý **Fraunces** hoặc **Newsreader**) — dùng cỡ **rất lớn** (clamp 56–180px), tracking âm nhẹ, đôi khi italic ở một từ nhấn.
- **UI / body:** grotesk có tính cách (gợi ý **Bricolage Grotesque**, hoặc **Be Vietnam Pro**). **Không dùng Inter, Roboto, Space Grotesk, Poppins** làm font chính.
- **Mono (ID, số hiệu, nhãn, code):** **JetBrains Mono** hoặc **IBM Plex Mono**, cỡ nhỏ, UPPERCASE + letter-spacing rộng cho nhãn kiểu `T1566.001 — PHISHING`.
- ⚠️ **BẮT BUỘC hỗ trợ tiếng Việt:** trước khi chốt font, **kiểm tra subset `vietnamese`** trên Google Fonts và render thử chuỗi *"Phát hiện, Đánh cắp thông tin xác thực, Leo thang đặc quyền, Ẩn mình"* ở mọi cỡ. Dấu không được vỡ, cắt, lệch. Nếu font nào lỗi → thay font khác, không chấp nhận fallback xấu.
- Thang chữ **fluid** (`clamp`), tỉ lệ ~1.25–1.333; line-height chặt cho display (0.95–1.05), thoáng cho body (1.55–1.65); `font-variant-numeric: tabular-nums` cho mọi số liệu; `text-wrap: balance` cho tiêu đề, `pretty` cho đoạn văn.

### 3.3 Bố cục & chi tiết
- Lưới **12 cột + baseline 8px**, có toggle hiển thị lưới (phím `G`) khi dev. Cho phép **bố cục bất đối xứng**, chữ khổng lồ tràn lề, cột bên lề chứa "ghi chú" nhỏ (marginalia).
- **Hairline 1px** làm ngôn ngữ chính (bảng, ngăn cách, khung). Bo góc **nhỏ và nhất quán** (2–6px), không bo tròn lớn kiểu pill/bubble mọi nơi.
- **Chi tiết đặc trưng (dùng tiết chế, mỗi màn 2–3 chi tiết):** dấu cộng toạ độ `+` ở góc khung, nhãn toạ độ/số hiệu nhỏ, thước đo ở mép, đường đồng mức mờ làm nền, nhãn `FIG. 03`, `REF: T1059`, số trang kiểu hồ sơ.
- **Texture:** noise/grain rất nhẹ (opacity 3–6%, dạng SVG/CSS, không PNG nặng) để nền không "phẳng như nhựa".
- **Icon:** một bộ duy nhất, nét mảnh đồng nhất (Phosphor Thin/Light hoặc Tabler stroke 1.25), **cấm emoji trong UI**; icon đặc thù (tactic, nền tảng) tự vẽ SVG hình học đơn giản.
- Mật độ thông tin: **cao nhưng có thở** — chọn khoảng trắng có chủ đích, không đệm đều mọi nơi.

---

## 4. Chuyển động — "wow" nhưng có chủ đích

**Nguyên tắc:** chuyển động phải *kể chuyện* (cho thấy quan hệ, trình tự, nhân quả của cuộc tấn công), không phải trang trí. Một khoảnh khắc ấn tượng mỗi màn hình tốt hơn mười hiệu ứng rải rác.

**Token motion:**
```css
--ease-out-expo: cubic-bezier(.16,1,.3,1);
--ease-in-out:  cubic-bezier(.65,0,.35,1);
--dur-micro:120ms; --dur-ui:240ms; --dur-scene:480ms; --dur-hero:900ms;
/* Spring (Framer Motion): stiffness 260, damping 30, mass 0.9 */
```

**Bộ công cụ (chọn gọn):** Framer Motion (layout/gesture/shared element) + **GSAP + ScrollTrigger** (kể chuyện theo cuộn) + **Lenis** (smooth scroll, tắt khi `prefers-reduced-motion`) + **View Transitions API** (chuyển trang/chi tiết) + **Three.js/OGL + GLSL** (CHỈ cho hero, xem dưới) + SVG path animation (`pathLength`) cho attack chain.

**Danh sách hiệu ứng nên có (ưu tiên theo giá trị):**
1. **Attack Chain Player (số 1):** đường nối giữa các technique được "vẽ" dần bằng SVG path, có xung sáng chạy dọc; node kích hoạt theo trình tự với spring; camera tự pan/zoom theo bước (graph "bay" tới node tiếp theo); phím ←/→/Space điều khiển; khi chuyển Attacker ⇄ Defender, **màu tín hiệu đảo (vermilion ⇄ mint) bằng một lần quét mask (clip-path wipe)** chứ không phải fade.
2. **Hero WebGL (Argon phát huy sở trường — shader):** một **đồ thị tri thức ATT&CK dạng điểm/đường** (các technique là điểm, quan hệ là đường mảnh) trôi nhẹ trong không gian, **phản ứng với con trỏ** (điểm gần chuột sáng lên và hiện nhãn ID), viết **GLSL tuỳ chỉnh** (không dùng preset). Bắt buộc: lazy-load, `devicePixelRatio` cap = 2, tự hạ chất lượng khi FPS < 50, **fallback ảnh tĩnh/SVG** trên mobile & khi `prefers-reduced-motion`.
3. **Matrix reveal:** cột tactic xuất hiện theo sóng (stagger từ trái sang phải), technique "bật sáng" theo heatmap; hover một technique → làm mờ phần còn lại, nổi bật các technique cùng group/software (quan hệ hiện ra như đường mờ).
4. **Số liệu live (ticker):** con số version (vd số technique/analytic) chạy kiểu **odometer** (cuộn chữ số), không phải count-up tuyến tính.
5. **Tiêu đề kiểu biên tập:** chữ tách theo dòng, trồi lên từ mask (line reveal), từ nhấn italic serif.
6. **Slider so sánh version (v18→v19→v20):** kéo thanh → tactic "Defense Evasion" **tách đôi** thành Stealth + Defense Impairment bằng morph/animate layout. Đây là cảnh minh hoạ chính của bài học.
7. **Chuyển trang:** shared-element (technique trong matrix "phóng to" thành trang chi tiết) bằng View Transitions/Framer layoutId.
8. **Micro-interaction:** nút có phản hồi lực (scale 0.98 + lún nhẹ), con trỏ tuỳ chỉnh **chỉ** trên vùng graph (đổi hình theo ngữ cảnh), command palette mở bằng spring, toast trượt có quán tính, skeleton có shimmer chậm tinh tế.

**Kỷ luật hiệu năng & a11y (không thương lượng):**
- Chỉ animate `transform` và `opacity` (và `clip-path`/`filter` có kiểm soát); không animate `width/height/top/left`.
- Mục tiêu **60fps** khi cuộn matrix, hover, và chạy attack chain; đo bằng Performance trace, ghi số liệu vào báo cáo.
- `prefers-reduced-motion`: thay hiệu ứng lớn bằng fade/đổi trạng thái tức thì, tắt WebGL & Lenis.
- Hero + thư viện nặng **code-split**; LCP < 2.5s trên 4G giả lập; tổng JS ban đầu có ngân sách (đặt trong plan, ví dụ ≤ 200KB gzip cho route đầu).
- Mọi hiệu ứng có thể tạm dừng; graph có mô tả `aria-label` và điều hướng bàn phím; tương phản chữ đạt WCAG AA.

---

## 5. Chỉ đạo từng màn hình

**Landing / Dashboard**
- Không hero "tiêu đề giữa + 2 nút". Hãy làm **tiêu đề serif khổng lồ lệch trái** chồng lên hero WebGL, cột phải là "bản tin phiên bản" (version, ngày phát hành, 3 thay đổi lớn, kiểu cột tin báo chí).
- Dưới hero: dải số liệu odometer; một khối "Case của tuần" trình bày như **trang bìa tạp chí**, không phải card.
- **Cấm** lưới 3 card icon đều nhau.

**Matrix Explorer**
- Nền có lưới toạ độ mờ; header cột tactic **sticky** dạng nhãn mono `TA0001 · 01 / INITIAL ACCESS`.
- Technique hiển thị như **ô dữ liệu hairline**, không phải thẻ bo tròn đổ bóng; sub-technique mở dạng danh sách thụt có đường dẫn mảnh.
- Panel chi tiết bên phải trượt vào, bố cục 2 cột kiểu hồ sơ: trái = mô tả, phải = "ghi chú bên lề" (platform, ID, phiên bản, liên quan).

**Technique detail — chuỗi phát hiện v18+**
- Vẽ **sơ đồ 3 tầng nối nhau** Detection Strategy → Analytic → Data Component như bản vẽ kỹ thuật (đường nối thẳng/vuông góc, nhãn mono), hover tầng nào thì làm nổi chuỗi liên quan. Đây phải là hình đáng chụp màn hình.

**Case Studies / Attack Chain Player**
- Màn hình chia: graph chiếm ~65%, bên phải là "lời bình của analyst" (typeset như chú thích báo cáo), dưới là **timeline kiểu đoạn phim** có playhead kéo được.
- Thiết kế cảm giác **"đang xem lại hiện trường"**: ngày giờ/giai đoạn nhỏ kiểu `T+00:42`, nhãn mono, âm sắc điềm tĩnh. Không máu me, không hiệu ứng "hack" phim ảnh.

**Learning Path**
- Trình bày như **mục lục sách/atlas** với số chương lớn, tiến độ là một **đường vẽ dần** chứ không phải progress bar xanh. Quiz có phản hồi bằng chuyển động tinh tế (đúng: đường mint vẽ xong; sai: rung 1 nhịp + giải thích).

**Coverage Lab**
- Heatmap lớn như **bản đồ nhiệt in ấn**, có chú giải, có chế độ "so sánh 2 layer" bằng đường chia kéo được.

**Trạng thái đặc biệt:** empty/error/loading đều có **thiết kế riêng** (minh hoạ vector đơn giản đúng concept, copy tiếng Việt ngắn, có cá tính nhưng không đùa cợt).

---

## 6. Giọng chữ (microcopy)

- Tiếng Việt tự nhiên, **giọng analyst**: ngắn, chắc, cụ thể. Giữ thuật ngữ gốc (Technique, Analytic…).
- **Cấm** mẫu sáo rỗng của AI: "Khám phá sức mạnh của…", "Nâng tầm…", "Giải pháp toàn diện", "Hành trình…", dấu chấm than thừa, emoji.
- Nút/nhãn là hành động cụ thể: "Phát lại chuỗi tấn công", "Xem 3 analytic liên quan", "Xuất layer Navigator".

---

## 7. QUY TRÌNH BẮT BUỘC — vòng lặp tự phê bình bằng hình ảnh

Sức mạnh của bạn nằm ở **vòng lặp critique đa tác tử có nhìn ảnh thật**. Hãy dùng nó, đừng "viết code một lần rồi tuyên bố xong".

1. **Design Brief (artifact):** concept, moodboard bằng lời, tokens cuối cùng, lý do chọn font (đã test tiếng Việt), danh sách hiệu ứng + ngân sách hiệu năng.
2. **Dựng Design System trước:** trang `/styleguide` hiển thị màu, thang chữ (có chuỗi tiếng Việt đủ dấu), icon, nút, input, bảng, tooltip, các trạng thái, và **mẫu từng motion** (có nút phát lại). Tôi duyệt trang này trước khi làm màn hình thật.
3. **Với MỖI màn hình, chạy vòng lặp (tối thiểu 3 vòng):**
   - **Builder** dựng/sửa.
   - **Browser Agent** chụp màn hình ở **1440×900, 1024×768, 390×844**, cả dark & light; ghi **video ngắn** cho các cảnh chuyển động.
   - **Critic agent (tách biệt với Builder, khó tính):** chấm điểm theo rubric dưới đây, nêu **tối đa 5 lỗi cụ thể nhất** kèm cách sửa.
   - Builder sửa → lặp lại. Chỉ dừng khi **mọi mục ≥ 4/5**.
4. **Rubric (mỗi mục 1–5, ghi vào artifact):**
   - *Phân cấp thị giác* — mắt có biết nhìn đâu trước không?
   - *Typography* — cỡ, trọng lượng, nhịp, dấu tiếng Việt.
   - *Nhịp khoảng cách & lưới* — có hệ thống hay đệm tuỳ tiện?
   - *Kỷ luật màu* — đúng 2 màu tín hiệu, không thừa gradient/glow?
   - *Tính nguyên bản* — **"có giống template AI không?"** (mục 8 là phép thử).
   - *Chất lượng chuyển động* — easing, thời lượng, có kể chuyện không, có giật không?
   - *Mật độ & dễ đọc* — dữ liệu dày nhưng đọc được?
   - *Hiệu năng & a11y* — số đo thật.
5. **Bằng chứng:** đính kèm ảnh *trước/sau* mỗi vòng và điểm số vào artifact cuối phase.

---

## 8. Danh sách CẤM (phép thử "không mùi AI")

Nếu thấy bất kỳ điều nào dưới đây trong output → **coi là lỗi, sửa ngay:**
- ❌ Gradient tím/xanh dương/hồng, gradient trên chữ, "aurora blob" mờ ở nền.
- ❌ Glow/neon bao quanh card, nút, chữ.
- ❌ Glassmorphism làm kiểu mặc định cho mọi thẻ.
- ❌ Font Inter/Roboto/Poppins/Space Grotesk làm font chính; chỉ một font cho mọi thứ.
- ❌ Hero căn giữa "tiêu đề + mô tả + 2 nút"; lưới 3 card icon giống hệt nhau; "bento grid" đều đặn vô hồn.
- ❌ Mọi thứ bo tròn lớn (rounded-2xl/3xl) và đổ shadow mềm.
- ❌ Emoji làm icon; icon mặc định không chỉnh stroke/kích thước.
- ❌ Giao diện shadcn/ui **nguyên bản chưa restyle** (nếu dùng thì phải ghi đè hoàn toàn theo tokens).
- ❌ Hiệu ứng "hacker": mưa ký tự xanh lá, terminal giả, glitch rẻ tiền.
- ❌ Copy sáo rỗng kiểu marketing AI.
- ❌ Animation fade-in-up đồng loạt cho mọi phần tử (làm "nhạt" mọi thứ); hiệu ứng không có lý do kể chuyện.
- ❌ Bố cục đối xứng hoàn hảo, mọi khối cùng chiều rộng, cùng khoảng cách, không có điểm nhấn.

---

## 9. Tài liệu tham chiếu (tôi sẽ cung cấp)

- Thư mục `design/references/` chứa ảnh chụp/URL các trang tôi thấy đẹp trong video.
- **Việc của bạn:** phân tích từng reference để rút ra **"design DNA"** (lưới, tỉ lệ chữ, nhịp khoảng cách, cách dùng màu, kiểu chuyển động, chi tiết đặc trưng) rồi **diễn giải lại theo concept của ATT&CK Lab — TUYỆT ĐỐI không sao chép bố cục/asset/mã của ai**. Ghi kết quả vào Design Brief.
- Nếu `design/references/` còn trống, hãy tự đề xuất hướng dựa trên mục 2 và nói rõ giả định.

---

## 10. Nghiệm thu thiết kế

- [ ] `/styleguide` đầy đủ, duyệt xong trước khi làm màn hình thật.
- [ ] Mọi màn hình đạt rubric ≥ 4/5, có ảnh trước/sau.
- [ ] Không vi phạm mục 8 (kiểm bằng critic agent, kèm danh sách đã đối chiếu).
- [ ] Attack Chain Player, hero WebGL, slider v18→v20 hoạt động mượt, có video đính kèm.
- [ ] Font tiếng Việt hiển thị đúng ở mọi cỡ; dark & light đều hoàn chỉnh (light thiết kế riêng).
- [ ] 60fps ở các cảnh chính (kèm số đo), `prefers-reduced-motion` hoạt động, WebGL có fallback.
- [ ] Lighthouse: Performance ≥ 85, Accessibility ≥ 95 ở trang Matrix và trang Landing.
- [ ] Báo cáo cuối: những gì đã làm, chỗ nào chưa đạt và vì sao, đề xuất bước tiếp.

