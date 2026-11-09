# 🛡️ PROMPT CHO ANTIGRAVITY — "ATT&CK Lab": web học & trực quan hoá MITRE ATT&CK

> Hãy đọc toàn bộ file này trước, sau đó **tạo Implementation Plan + Task List (artifact) và chờ tôi duyệt** rồi mới code.
> Làm theo từng Phase, cuối mỗi phase tự chạy app, dùng Browser Agent kiểm thử UI và chụp screenshot làm bằng chứng.

---

## 0. Bối cảnh & mục tiêu

- Đây là web **nội bộ, 2–10 người dùng** (team bảo mật), mục đích **học MITRE ATT&CK dễ hiểu bằng ví dụ thực tế và hình ảnh trực quan**.
- Ngôn ngữ giao diện: **Tiếng Việt**, giữ nguyên thuật ngữ gốc tiếng Anh (Tactic, Technique, Sub-technique, Detection Strategy, Analytics…) kèm giải thích ngắn tiếng Việt.
- Dữ liệu **phải là kiến thức mới nhất**, crawl trực tiếp từ nguồn chính thức của MITRE, **không hard-code số liệu hay ID**.
- Ưu tiên: **dễ học > đầy đủ**, **dễ deploy > kiến trúc cầu kỳ**. Không over-engineer.
- Đây là web **giáo dục phòng thủ**: tuyệt đối không đưa payload, exploit, lệnh tấn công chạy được. Chỉ mô tả hành vi, ví dụ procedure ở mức khái niệm, và cách phát hiện/giảm thiểu.

---

## 1. Kiến thức nền cần nắm (đã kiểm chứng đến tháng 11/2026 — nhưng LUÔN đọc phiên bản thực tế từ dữ liệu crawl)

- Phiên bản mới nhất tại thời điểm viết prompt: **ATT&CK v20 (13/10/2026)**, có bản vá v20.1. MITRE giờ còn có các bản "agile release" nhỏ (vd v19.2) → **app phải tự phát hiện version mới nhất, không hard-code "v20"**.
- Số liệu v20 Enterprise (chỉ để so khớp sau khi crawl, không hard-code): 15 Tactics, 227 Techniques, 479 Sub-techniques, 178 Groups, 842 Software, 57 Campaigns, 44 Mitigations, 703 Detection Strategies, 1770 Analytics, 106 Data Components.
- **Thay đổi lớn cần có bài học riêng trong app:**
  1. **v18 (10/2025):** "Detections / Data Sources" cũ bị thay bằng mô hình mới: **Detection Strategy (DET…) → Analytic (AN…) → Data Component**. Detection Strategy = hướng phát hiện cấp cao độc lập vendor; Analytic = logic phát hiện theo từng nền tảng (Windows/Linux/macOS/Cloud…); Data Component = loại log/telemetry cần có.
  2. **v19 (28/04/2026):** tactic **Defense Evasion (TA0005) bị tách** thành **Stealth** và **Defense Impairment**. Enterprise giờ có **15 tactics** (không còn 14). Mobile có Detection Strategies đầu tiên.
  3. **v20 (13/10/2026):** thêm các technique **AI-focused** đầu tiên cho Enterprise (direct/indirect prompt injection, AI-enabled exfiltration, AI result poisoning…), thêm Detection Strategies cho Enterprise & ICS, ICS có thêm ngữ cảnh Asset.
- Cảnh báo UI: nhiều tài liệu cũ vẫn nói "14 tactics" → app cần có banner/tooltip giải thích điểm này.

---

## 2. Nguồn dữ liệu (crawl)

**Nguồn chính (STIX 2.1, chính thức):** GitHub repo `mitre-attack/attack-stix-data`
- `index.json` — liệt kê các domain và toàn bộ version có sẵn → dùng để xác định **latest**.
- `enterprise-attack/enterprise-attack.json`, `mobile-attack/mobile-attack.json`, `ics-attack/ics-attack.json` (bản latest).
- Có thư mục theo version (vd `enterprise-attack/enterprise-attack-<version>.json`) → dùng để **so sánh diff giữa 2 version**.
- Tải qua `https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/...`
- Nếu cấu trúc repo đã đổi, **tự dò lại** trong repo / trang https://attack.mitre.org/resources/updates/ rồi báo lại cho tôi; fallback: repo `mitre/cti` (STIX 2.0).

**Nguồn phụ:**
- https://attack.mitre.org/resources/updates/ (release notes, để hiển thị "Có gì mới").
- Changelog JSON giữa 2 version (nếu có trong repo) → dùng cho trang "What's New".

**Quy tắc parse STIX:**
- Object types: `x-mitre-tactic`, `attack-pattern` (technique & sub-technique, phân biệt bằng `x_mitre_is_subtechnique`), `intrusion-set` (Group), `malware` + `tool` (Software), `campaign`, `course-of-action` (Mitigation), `x-mitre-data-source`/`x-mitre-data-component`, **`x-mitre-detection-strategy`**, **`x-mitre-analytic`**, `x-mitre-asset` (ICS), `relationship`, `x-mitre-matrix`, `x-mitre-collection`.
- **Bỏ qua** object có `revoked: true` hoặc `x_mitre_deprecated: true` (nhưng lưu lại để hiển thị "đã deprecated → thay bằng…" khi tra cứu).
- ATT&CK ID lấy từ `external_references[0].external_id` (source_name = `mitre-attack`).
- Thứ tự cột tactic: theo `x-mitre-matrix.tactic_refs`. Technique thuộc tactic qua `kill_chain_phases[].phase_name` khớp `x_mitre_shortname` của tactic.
- Relationship quan trọng: `uses` (group/campaign/software → technique; group → software), `mitigates`, `subtechnique-of`, `detects`/liên kết Detection Strategy ↔ Technique ↔ Analytic ↔ Data Component (đọc schema thực tế rồi map, đừng đoán).
- Tôn trọng **Terms of Use của MITRE ATT&CK**: footer phải có câu ghi nguồn "© The MITRE Corporation. ATT&CK® is a registered trademark of The MITRE Corporation." kèm link tới license/terms, và hiển thị version dữ liệu đang dùng.

---

## 3. Kiến trúc & tech stack (chọn sẵn để dễ học, dễ deploy)

```
                 ┌──────────────── VERCEL (Hobby / free) ────────────────┐
 Người dùng ───► │  React SPA (static)      FastAPI (Python Function)     │
 (qua URL public)│  apps/web                apps/api  → /api/*            │
                 └───────┬──────────────────────────┬─────────────────────┘
                         │ Supabase JS (Auth,       │ đọc dữ liệu ATT&CK
                         │ bookmark, notes, RLS)    │ (service role, chỉ ở backend)
                         ▼                          ▼
                 ┌────────────────── SUPABASE (free) ──────────────────┐
                 │  Postgres + Auth + RLS                              │
                 └───────────────────────▲─────────────────────────────┘
                                         │ upsert dữ liệu
                 GitHub Actions (cron hằng tuần + nút chạy tay) ── chạy script crawl/parse STIX
```

**Quyết định then chốt cho Vercel free:** tác vụ **crawl + parse + ghi DB nặng KHÔNG chạy trong Vercel Function**.
Nó chạy bằng **script Python trong GitHub Actions** (miễn phí, không bị giới hạn thời gian như serverless), dùng chung module parser với API.
Vercel chỉ phục vụ: static frontend + API **đọc nhẹ**.

**Hosting:** Vercel Hobby (free) cho cả web và API; xem mục 8.

**Backend-as-a-Service:** **Supabase** (free tier) — Postgres, Auth (email magic link / Google), Row Level Security.
- Tắt public signup; chỉ **allowlist email** của người trong team (bảng `allowed_emails` + trigger kiểm tra khi đăng ký, hoặc mời thủ công).
- Role: `admin` (được bấm Sync) và `member`.

**API (FastAPI chạy trên Vercel Python Functions):** Python 3.12 + FastAPI + `httpx` + `pydantic`. Vercel hỗ trợ FastAPI gần như zero-config (entrypoint `apps/api/index.py` export biến `app`, route qua `vercel.json`/rewrites `/api/*`).
- Verify JWT của Supabase ở các endpoint cần đăng nhập/admin.
- Dùng `SUPABASE_SERVICE_ROLE_KEY` **chỉ ở backend (env Vercel, không có tiền tố VITE_)**, không bao giờ để lộ ra frontend.
- **Serverless = không có bộ nhớ chung giữa các lần gọi** → KHÔNG dựa vào cache in-memory. Dùng header `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400` + ETag để CDN của Vercel cache; dữ liệu chỉ đổi khi có version mới.
- Giữ bundle Python nhỏ (giới hạn 500 MB giải nén): không đưa file STIX, test, dữ liệu mẫu lớn vào bundle; dùng `excludeFiles` trong `vercel.json`. Không dùng thư viện nặng không cần thiết.
- Query Supabase theo kiểu **trả dữ liệu gọn đã tính sẵn** (bảng/view materialized cho `/matrix`), tránh parse JSON lớn trong request.

**Frontend:** Vite + React 18 + TypeScript + React Router + TanStack Query + Tailwind CSS + shadcn/ui + Framer Motion + **React Flow** (attack chain graph) + D3/visx (heatmap, chart) + `cmdk` (command palette) + Fuse.js (search client-side) + Zustand.

**Repo (monorepo đơn giản):**
```
attack-lab/
├─ apps/
│  ├─ web/                 # React SPA
│  └─ api/                 # FastAPI (index.py cho Vercel, scripts/sync_attack.py cho GitHub Actions)
├─ supabase/
│  ├─ migrations/          # SQL schema + RLS
│  └─ seed/                # allowlist, case studies, lessons
├─ content/
│  ├─ lessons/*.md         # bài học (viết tay, tiếng Việt)
│  ├─ cases/*.yaml         # case study thực tế (xem mục 6)
│  └─ quizzes/*.yaml
├─ .github/workflows/      # sync.yml (cron + dispatch), ci.yml
├─ docker-compose.yml      # chạy local: api (+ supabase CLI nếu cần)
├─ .env.example
└─ README.md               # hướng dẫn tiếng Việt: chạy local + deploy từng bước
```

---

## 4. Database (Supabase / Postgres)

**Giới hạn dung lượng Supabase free: DB 500 MB** → thiết kế tiết kiệm: chỉ lưu **đầy đủ bản latest** của mỗi domain; với bản trước chỉ giữ bảng nhẹ `attack_object_hashes(version, stix_id, attack_id, hash)` để làm trang "Có gì mới" (diff), không lưu lại toàn bộ JSON. Không nhân đôi dữ liệu ở nhiều bảng. Sau lần sync đầu hãy đo dung lượng thực tế (`pg_total_relation_size`) và báo cáo cho tôi.

Dữ liệu ATT&CK (ghi bởi API bằng service role, người dùng chỉ **đọc**):
- `attack_versions(id, domain, version, released_at, is_latest, synced_at)`
- `attack_objects(stix_id pk, version_id, domain, type, attack_id, name, description, platforms[], tactics[], is_subtechnique, parent_attack_id, revoked, deprecated, data jsonb)` — index trên `(domain, type, attack_id)` và full-text trên `name, description`.
- `attack_relationships(id, version_id, source_ref, target_ref, rel_type, description)` — index `(source_ref)`, `(target_ref)`, `(rel_type)`.
- `sync_runs(id, started_at, finished_at, status, domain, version, added, updated, removed, log)`.

Dữ liệu người dùng (RLS: chỉ chủ sở hữu đọc/ghi):
- `profiles(id → auth.users, display_name, role)`
- `bookmarks(user_id, attack_id, note, created_at)`
- `notes(user_id, attack_id, body_md, updated_at)`
- `progress(user_id, lesson_slug, completed_at)`
- `quiz_attempts(user_id, quiz_slug, score, answers jsonb, created_at)`
- `coverage_layers(user_id, name, domain, techniques jsonb, shared bool)` — layer "tôi phát hiện được technique nào".

Viết migration SQL đầy đủ + policy RLS + test nhanh rằng user A không đọc được dữ liệu của user B.

---

## 5. API endpoints (FastAPI, prefix `/api`)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Healthcheck |
| GET | `/versions` | Version đang có trong DB + version latest trên MITRE (để báo "có bản mới") |
| POST | `/sync` | **Admin/secret token**: crawl → parse → upsert. Idempotent, chạy nền, ghi `sync_runs`. Tham số `domain`, `version` (mặc định latest) |
| GET | `/matrix/{domain}` | Tactic → Technique → Sub-technique dạng gọn cho frontend vẽ matrix (có ETag) |
| GET | `/techniques/{attack_id}` | Chi tiết: mô tả, platform, procedure examples (groups/software/campaigns dùng nó), mitigations, **Detection Strategies → Analytics → Data Components** |
| GET | `/groups/{id}`, `/software/{id}`, `/campaigns/{id}` | Chi tiết + danh sách technique, nhóm theo tactic |
| GET | `/campaigns/{id}/chain` | Trả về chuỗi tấn công đã sắp xếp theo tactic để vẽ graph |
| GET | `/search?q=` | Tìm tất cả loại object |
| GET | `/diff?from=&to=&domain=` | So sánh 2 version: new / changed / deprecated / revoked |
| GET | `/export/navigator?layer_id=` | Xuất layer JSON tương thích **ATT&CK Navigator** |

Yêu cầu: validate input, CORS chỉ cho origin frontend, rate limit nhẹ, log có cấu trúc, lỗi trả JSON rõ ràng. Có OpenAPI docs tại `/docs`.

**Sync (chạy ngoài Vercel):**
- Script `apps/api/scripts/sync_attack.py` (CLI: `--domain`, `--version`, `--dry-run`) làm toàn bộ: tải STIX → parse → upsert Supabase → ghi `sync_runs`. Idempotent, ghi theo batch.
- `.github/workflows/sync.yml`: chạy **cron hằng tuần** + `workflow_dispatch` (bấm tay trong tab Actions, có input `domain`/`version`). Secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Endpoint `POST /api/sync` trên Vercel **không tự crawl**; nó chỉ gọi GitHub API `workflow_dispatch` (dùng `GITHUB_TOKEN_DISPATCH` fine-grained, quyền Actions: write) để kích hoạt workflow, trả về ngay "đã xếp lịch". Nút "Đồng bộ ngay" của admin trong UI gọi endpoint này. Trạng thái xem ở bảng `sync_runs`.
- Với `/versions`: so sánh version trong DB với `index.json` của MITRE và báo "có bản mới".

---

## 6. Tính năng frontend (theo thứ tự ưu tiên)

### 6.1 🗺️ Matrix Explorer (trang chính)
- Chuyển domain **Enterprise / Mobile / ICS**; hiển thị đúng số cột tactic (15 cho Enterprise) và tooltip giải thích **Stealth / Defense Impairment** thay cho Defense Evasion cũ.
- Click technique → mở **side panel** (không rời trang); sub-technique mở rộng dạng accordion.
- Lọc theo **platform** (Windows, Linux, macOS, Cloud, Containers, ESXi, Network, AI…), tìm kiếm nhanh, đánh dấu bookmark.
- Chế độ **Heatmap**: tô màu theo số group/software dùng technique, hoặc theo layer coverage của tôi.
- Badge "NEW ở version này" / "Đã đổi" cho technique mới so với version trước.

### 6.2 🎬 Case Studies — "Xem một cuộc tấn công thật diễn ra như thế nào"
Đây là tính năng **trọng tâm**. Mỗi case là **một Campaign hoặc Group có thật trong ATT&CK**, tự dựng từ dữ liệu crawl (tra theo **tên**, không hard-code ID) + lớp giải thích tiếng Việt do ta viết trong `content/cases/*.yaml`.
- **Attack Chain Player:** graph React Flow, các node technique xếp theo tactic từ trái sang phải; nút Play/Pause/Next/Prev để **hoạt ảnh từng bước**; node đang chạy phát sáng, cạnh có animation dòng chảy.
- Mỗi bước có panel: *Kẻ tấn công làm gì (ngôn ngữ đời thường)* → *Technique ATT&CK* → *Dấu hiệu để lại (telemetry)* → *Cách phát hiện (Detection Strategy/Analytic liên quan)* → *Cách giảm thiểu (Mitigation)*.
- Công tắc **"Góc nhìn Attacker ⇄ Defender"**: đổi nội dung panel và đổi màu giao diện nhẹ (đỏ/xanh).
- Timeline phía dưới + mini-map; nút "Xuất ảnh PNG" và "Xuất Navigator layer".
- **Case gợi ý (tra tên trong dữ liệu, bỏ qua case nào không tìm thấy và báo log):**
  1. *SolarWinds Compromise* — chuỗi cung ứng, kinh điển để học.
  2. *NotPetya* — lan truyền & phá huỷ.
  3. *Operation Dream Job* hoặc campaign tương tự — social engineering.
  4. *2016 Ukraine Electric Power Attack* — case **ICS**.
  5. **APT32 / OceanLotus** — nhóm hoạt động nhiều tại Đông Nam Á, gần gũi với người dùng ở Việt Nam.
  6. Một case **AI-focused (v20)** dựa trên các technique prompt injection / AI-enabled exfiltration mới — dựng chuỗi "kịch bản minh hoạ" ghi rõ là **giả định học tập, không phải sự cố có thật** nếu dữ liệu không có campaign tương ứng.
- Mỗi file `cases/*.yaml`: `slug, title, source_type (campaign|group), lookup_name, summary_vi, why_it_matters_vi, steps: [{technique_name_or_id, plain_vi, defender_vi}]`. Nếu technique trong yaml không còn tồn tại ở version mới → tự cảnh báo trong UI admin.

### 6.3 📚 Learning Path (học từ con số 0)
- Lộ trình: *ATT&CK là gì → Tactic/Technique/Sub-technique → Procedure Examples → Groups/Software/Campaigns → Mitigations → **Detection Strategy → Analytic → Data Component (mô hình mới v18+)** → Dùng ATT&CK trong thực tế (threat hunting, red/purple team, đánh giá coverage)*.
- Mỗi bài: nội dung ngắn (≤5 phút đọc), **ví dụ minh hoạ có sơ đồ tương tác**, ô "Thử ngay" mở đúng technique trong Matrix, và **mini quiz** cuối bài.
- Bài đặc biệt: "**ATT&CK thay đổi thế nào qua v18 → v19 → v20**" (trực quan: slider kéo qua lại giữa các version, thấy Defense Evasion tách đôi).
- Glossary có tooltip: rê chuột vào thuật ngữ ở bất kỳ đâu thấy giải thích ngắn.
- Theo dõi tiến độ mỗi người (bảng `progress`), huy hiệu hoàn thành.

### 6.4 🧪 Coverage Lab (mini Navigator)
- Người dùng tick "tôi/đội tôi phát hiện được technique này" → ra **heatmap coverage** theo tactic + % bao phủ.
- Gợi ý "technique phổ biến chưa được cover" dựa trên số group/campaign đang dùng.
- Lưu nhiều layer, chia sẻ trong team, **export/import JSON chuẩn ATT&CK Navigator**.

### 6.5 🔎 Explorer phụ
- Trang Groups / Software / Campaigns: danh sách + lọc + trang chi tiết (dùng chung component).
- **So sánh 2 Group**: Venn/overlap technique dùng chung.
- Trang "**Có gì mới**": diff giữa 2 version (new/changed/deprecated), lọc theo domain.
- **Command palette (Ctrl/Cmd + K)**: nhảy tới bất kỳ technique/group/software/bài học.

### 6.6 ⚙️ Admin (chỉ role admin)
- Trạng thái dữ liệu: version đang dùng vs version latest trên MITRE, nút **Đồng bộ ngay**, lịch sử `sync_runs`, log.
- Kiểm tra sức khoẻ nội dung: case/lesson nào đang tham chiếu technique đã deprecated/revoked.

---

## 7. Thiết kế giao diện — yêu cầu "WOW"

- **Phong cách:** cyber-defense hiện đại, nền tối sâu (gần đen xanh), điểm nhấn neon (cyan / tím / đỏ cảnh báo), **glassmorphism**, lưới/gradient mờ động ở hero, bo góc lớn, typography rõ ràng (heading dùng Space Grotesk hoặc Sora; body Inter; mã/ID dùng JetBrains Mono).
- Có **Light mode** sạch cho khi đọc lâu; chuyển theme mượt.
- **Landing/Dashboard:** hero động (matrix tactic "chạy" nhẹ), số liệu live của version hiện tại đếm tăng dần (count-up), thẻ "Tiếp tục học", "Case nổi bật", "Có gì mới ở vXX".
- **Chuyển động có chủ đích (Framer Motion):** chuyển trang mượt, stagger khi matrix xuất hiện, hover phát sáng theo tactic, hoạt ảnh attack chain là điểm nhấn số 1. Tôn trọng `prefers-reduced-motion`.
- **Mỗi tactic có một màu + icon riêng** nhất quán toàn app (kể cả Stealth và Defense Impairment mới).
- Responsive tốt trên laptop và tablet; matrix cuộn ngang mượt, cột tactic sticky header.
- Skeleton loading, empty state có minh hoạ, toast thông báo; hiệu năng: virtualize danh sách dài, matrix không giật (kiểm tra ≥ 60fps khi cuộn/hover).
- Accessibility: tương phản đạt WCAG AA, điều hướng bàn phím, aria-label cho graph.
- Đặt tên app và logo đơn giản (tự đề xuất, ví dụ **"ATT&CK Lab"**).

---

## 8. Triển khai lên Vercel Free (để người khác truy cập được)

**Mô hình:** 1 repo GitHub → 2 project Vercel (cùng repo, khác Root Directory) + Supabase free + GitHub Actions.

1. **Supabase** (tôi tự tạo project, region **Singapore**; Vercel Functions cũng đặt region Singapore `sin1`): chạy migrations (bạn xuất ra file SQL, tôi dán vào SQL Editor hoặc dùng Supabase CLI) → bật Auth, **tắt public signup** → **đăng nhập bằng email + mật khẩu, admin tạo/mời user thủ công** (KHÔNG dùng magic link vì SMTP mặc định của Supabase giới hạn rất ít email/giờ) → thêm allowlist email → tạo admin đầu tiên. Cấu hình **Site URL + Redirect URLs** = domain Vercel thật + `http://localhost:5173`.
   - **Bí mật:** bạn chỉ đọc biến từ `.env.local` (đã gitignore). Không yêu cầu tôi dán `service_role`/secret key hay mật khẩu DB vào chat; tôi tự đặt chúng vào Vercel env và GitHub Secrets. Chỉ `SUPABASE_URL` và anon/publishable key được phép nằm trong frontend.
   - Verify JWT: dùng cách mà dashboard Supabase hiện tại hỗ trợ (JWKS / JWT signing keys nếu project dùng khoá bất đối xứng; `SUPABASE_JWT_SECRET` chỉ khi project vẫn dùng secret cũ). Đọc docs hiện hành của Supabase rồi chọn đúng, ghi vào plan.
2. **Vercel project #1 — Web:** Root Directory `apps/web`, framework Vite. Biến môi trường: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (URL project API). Thêm `vercel.json` rewrite SPA (mọi route trả về `index.html`).
3. **Vercel project #2 — API:** Root Directory `apps/api`, FastAPI. Biến môi trường: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `ALLOWED_ORIGINS` (domain của web), `GITHUB_TOKEN_DISPATCH`, `GITHUB_REPO`. Đặt region gần Supabase (và gần Việt Nam nếu được, vd Singapore) để giảm độ trễ.
   - *(Phương án đơn giản hơn nếu muốn 1 project duy nhất: đặt FastAPI trong `/api` cùng project với web, cùng domain → bỏ CORS. Hãy chọn phương án này nếu cấu hình monorepo 2 project gây rắc rối, và ghi lại trong plan.)*
4. **GitHub:** thêm secrets cho workflow sync → chạy workflow lần đầu bằng tay → kiểm tra số liệu khớp release notes.
5. Kiểm tra từ máy/mạng khác (không phải máy dev): đăng nhập bằng email trong allowlist, xem matrix, chạy 1 case study.
6. `docker-compose.yml` + `.env.example` vẫn có để chạy local bằng 1–2 lệnh (dev local dùng `uvicorn`, không cần Docker trên Vercel).

**Ràng buộc Vercel Hobby cần tuân thủ khi thiết kế (đừng vi phạm):**
- Function: tối đa **300s** / **2 GB RAM** / bundle Python **≤ 500 MB** → API chỉ làm việc nhẹ, mọi tác vụ nặng để GitHub Actions.
- Không có tiến trình nền, không có file system ghi lâu dài, không có bộ nhớ chung giữa các request.
- Hạn mức băng thông/invocation có hạn → bật cache CDN ở mọi endpoint đọc, frontend dùng TanStack Query với `staleTime` dài (dữ liệu đổi theo version, không theo giây).
- **Ghi chú trong README:** gói Hobby của Vercel dành cho mục đích **cá nhân, phi thương mại** theo điều khoản của họ; nếu web này dùng trong công ty thì cần xem lại điều khoản hoặc chuyển Pro/Cloudflare Pages + nơi chạy API khác. Dừng lại hỏi tôi nếu có nghi ngại.
- Supabase free tier **tự tạm dừng project nếu không hoạt động ~1 tuần** → workflow sync hằng tuần cũng đóng vai trò giữ project hoạt động; ghi chú điều này trong README.
- Bảo vệ web nội bộ: ngoài Auth allowlist, **mọi route dữ liệu và API đều yêu cầu đăng nhập**; chỉ trang đăng nhập là public. Thêm `X-Robots-Tag: noindex` để không bị Google index.

---

## 9. Chất lượng & nghiệm thu

- Test: unit test parser STIX (dùng fixture nhỏ), test API chính (pytest), test RLS, vài e2e bằng Browser Agent (Matrix → click technique → mở case → Play chuỗi tấn công).
- **Điều kiện nghiệm thu:**
  - [ ] Sync lần đầu thành công cho Enterprise, Mobile, ICS; số lượng tactic/technique/group/software/campaign/detection strategy/analytic **khớp release notes** của version latest.
  - [ ] Enterprise hiển thị **15 tactics**, có Stealth & Defense Impairment, có tooltip giải thích.
  - [ ] Technique detail hiển thị đủ chuỗi **Detection Strategy → Analytic → Data Component**.
  - [ ] Ít nhất **5 case study** chạy được Attack Chain Player đầy đủ, có góc nhìn Attacker/Defender.
  - [ ] Trang "Có gì mới" diff đúng giữa 2 version liền kề.
  - [ ] Coverage Lab export file mở được trong ATT&CK Navigator.
  - [ ] User chưa nằm trong allowlist không đăng nhập được; RLS hoạt động.
  - [ ] Lighthouse Performance ≥ 85 trên trang Matrix; không có secret nào trong code frontend/git.
  - [ ] README chạy theo được từ đầu đến cuối.
  - [ ] **Web truy cập được qua URL Vercel public từ thiết bị khác**; login allowlist hoạt động trên domain thật.
  - [ ] Sync chạy thành công qua GitHub Actions (cron + bấm tay) và nút "Đồng bộ ngay" kích hoạt được workflow.
  - [ ] Không endpoint nào trên Vercel chạy quá ~10s trong điều kiện bình thường; response của `/matrix` được CDN cache.

---

## 10. Quy tắc làm việc cho agent

1. Bắt đầu bằng **Implementation Plan + Task List**, chờ tôi duyệt.
2. Làm theo phase, mỗi phase commit riêng, message rõ ràng:
   - **Phase 1:** Khung repo + Supabase schema + RLS + auth allowlist.
   - **Phase 2:** Crawler/parser STIX + `/sync` + `/matrix` + `/techniques` (kiểm tra số liệu).
   - **Phase 3:** Matrix Explorer + Technique panel + search + command palette.
   - **Phase 4:** Case Studies + Attack Chain Player (làm thật đẹp).
   - **Phase 5:** Learning Path + quiz + trang "Có gì mới" (diff).
   - **Phase 6:** Coverage Lab + Groups/Software/Campaigns + Admin.
   - **Phase 7:** Polish UI/animation, hiệu năng, a11y, README, deploy.
3. Khi gặp điểm mơ hồ về schema STIX hay cấu trúc repo MITRE: **đọc dữ liệu thật rồi quyết định**, ghi lại giả định trong plan. Không bịa field.
4. Không bao giờ hard-code số lượng/ID/phiên bản; mọi thứ lấy từ dữ liệu.
5. Nội dung giải thích tiếng Việt do bạn viết phải **ngắn, đời thường, có ví dụ**, đánh dấu rõ phần nào là "diễn giải của Lab" khác với mô tả gốc của MITRE.
6. Giữ code đơn giản, comment tiếng Việt ở chỗ khó, ưu tiên dễ đọc cho người đang học.
7. Cuối cùng báo cáo: những gì đã làm, những gì chưa làm, rủi ro/giả định, và cách deploy.
