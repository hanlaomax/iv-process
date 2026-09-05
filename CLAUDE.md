# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

## Tổng quan

**Interview Vault** — static site generator tự viết (Node core, **không dependency npm**), sinh
702 câu hỏi phỏng vấn cấp Middle cho 7 chủ đề (java, kafka, aws, redis, sql, microservices,
design-patterns) thành HTML tĩnh deploy lên GitHub Pages.

Nội dung **tiếng Việt**, giữ nguyên thuật ngữ kỹ thuật tiếng Anh. Comment trong code cũng viết
tiếng Việt — giữ nguyên quy ước này khi thêm code.

Nguyên tắc xuyên suốt: **trang phải dùng được khi tắt JavaScript**. JS chỉ là lớp tăng cường
(lọc, đánh dấu đã thuộc, theme, hình minh hoạ, luyện tập). Mọi tính năng backend (analytics,
đăng nhập) đều **tuỳ chọn** — thiếu env var thì UI tự ẩn, site vẫn chạy.

## Lệnh

```bash
node src/build.mjs      # sinh dist/ (không cần npm install)
node src/serve.mjs      # xem thử http://localhost:4173 (PORT để đổi cổng)
npm run serve           # build + serve
```

Không có test runner. **Kiểm chứng thay đổi bằng cách chạy `node src/build.mjs`** — build tự
validate dữ liệu và dừng (exit 1) nếu thiếu field hoặc trùng id; cảnh báo (không dừng) cho
`related` trỏ sai, `viz` thiếu `type`, `code` thiếu field.

Env var đọc lúc build: `SITE_URL` (mặc định `package.json` → `homepage`), `ANALYTICS_URL`,
`GOOGLE_CLIENT_ID`. Cả ba đều optional.

## Kiến trúc

### Pipeline build (`src/build.mjs`)

1. Đọc mọi `src/data/*.js` bằng `new Function('SS', code)(SS)` — file dữ liệu viết theo kiểu
   global `SS.topics = [...]` / `SS.addQuestions(topic, [...])`, **không phải ES module**.
   File nạp theo thứ tự alphabet nên `_topics.js` chạy trước.
2. `id` mỗi câu = `<topic>-<hash(q)>` sinh tự động (`hash` trong `format.mjs`, cùng thuật toán
   với client). **Sửa text câu hỏi = đổi id** → hỏng permalink và tiến độ đã lưu ở localStorage.
3. Validate → xoá & ghi lại `dist/` → render từng trang → copy assets + `static/`.

### Module

| File | Vai trò |
|---|---|
| `src/format.mjs` | markdown-lite → HTML (`fmt`), `esc`, `slugify` (bỏ dấu tiếng Việt), `hash`, `plain`, `truncate` |
| `src/highlight.mjs` | tô màu cú pháp lúc build (`highlight`, `normalizeLang`, `langLabel`, `isSupportedLang`) — tokenizer tự viết, không dependency |
| `src/relate.mjs` | `connect(list)` → câu liên quan tự động + chip khái niệm + graph, chấm điểm theo term **in đậm**/`code` với df/rarity |
| `src/templates.mjs` | `head()` (SEO đầy đủ), `header()`, `footer()`, `breadcrumb()`, `page()` |
| `src/render.mjs` | trang chủ, trang chủ đề (FAQPage JSON-LD), `/stats`, `/luyen-tap` + `questions.json`, sitemap, 404 |
| `src/render-user.mjs` | `/tai-khoan`, `/bang-xep-hang`, `/privacy` |
| `src/serve.mjs` | static server tối giản để preview |
| `tools/add-demos.mjs` | chèn field `demo` hàng loạt từ file patch (không tham gia build) |

`page({ root, scripts })`: `root` là tiền tố tương đối (`''` trang chủ, `'../'` trang con) —
mọi link/asset phải đi qua nó. `enhance.js` + `auth.js` luôn được nhúng; script khác truyền qua
`scripts`. Trang chủ đề chỉ nạp `viz/*` khi có câu dùng `viz`, `diagrams/*` khi có `diagram`.

### Client (`assets/`, ES5 IIFE, không build step)

Global đăng ký giữa các file: `window.IVAuth` (đăng nhập + sync), `window.IVViz.register/mount`,
`window.IVDiagrams.define`, `window.IVSql.ready/preview/grade`. Build inject
`window.IV_ROOT`, `IV_ANALYTICS`, `IV_GOOGLE_CLIENT_ID`.

Đổi tiến độ → `window.dispatchEvent(new Event('iv-progress'))`; các trang khác lắng nghe event
này để vẽ lại. localStorage keys: `iv-questions-learned`, `iv-srs`, `iv-practice-log`,
`iv-theme`, `iv-vid`, `iv-ses`, `iv-session`, `iv-profile`.

Viz renderer đăng ký theo `type`: `compare`/`layers`/`tree`/`bars` ở `viz-static.js`,
`flow`/`sequence`/`states`/`cycle`/`timeline`/`quadrant` ở `viz-anim.js`. Thêm type mới =
`IVViz.register('ten', fn)` + document trong README.

`sql-run.js` nạp lười `assets/vendor/sql-wasm.*` (sql.js), chấm bài SQL bằng cách chạy lời giải
và bài nộp trên **2 dataset** rồi so result set (chống hard-code).

### Backend (`analytics/` — deploy riêng)

Cloudflare Worker + D1, không nằm trong pipeline build của site. `worker.js` là router bảng
GET/POST; `analytics.js` (`/collect`, `/stats` ẩn danh), `users.js` (Google login, progress
sync, leaderboard, `/admin/grant`), `auth.js` (verify Google ID token + ký session), `lib.js`.
Deploy bằng `wrangler deploy` trong `analytics/`; schema ở `schema.sql` (idempotent).
Xem `analytics/README.md`.

Thống kê **ẩn danh, không gắn với tài khoản đăng nhập** — giữ nguyên tách biệt này. Một lượt
truy cập = một phiên (30 phút không hoạt động).

## Thêm / sửa câu hỏi

Sửa file trong `src/data/<topic>-NN-*.js`:

```js
SS.addQuestions('java', [{
  cat: 'Tên mục con',          // bắt buộc — gom nhóm & mục lục
  q: 'Câu hỏi?',               // bắt buộc — quyết định id
  answer: '...',               // bắt buộc — markdown-lite
  essence: '...',              // bắt buộc — cốt lõi 1–2 câu
  example: '...',              // bắt buộc — ví dụ thực tế
  // tuỳ chọn:
  related: ['java-xxxx'],      // ghi đè danh sách câu liên quan
  viz: { type: 'tree', ... },  // hình minh hoạ tương tác
  demo: [{ lang, title, code }],  // ví dụ code/config (xem dưới)
  code: { lang: 'sql', prompt, tables, datasets, starter, solution, ordered },
  diagram: 'sql-joins',        // hình động cũ, cần assets/diagrams/<topic>.js
}]);
```

### Field `demo` — ví dụ code & cấu hình

Khối "Code & cấu hình" hiện dưới phần "Ví dụ thực tế", dùng chung cho trang chủ đề lẫn trình
luyện tập. **Phần giải thích nằm trong chính comment của đoạn code** — không có field giải thích
riêng, đó là quy ước đã chốt.

```js
demo: [
  { lang: 'java', title: 'Tiêu đề ngắn', code: 'dòng 1\n' + 'dòng 2' },
  { lang: 'yaml', title: 'Cấu hình tương ứng', code: '...' },
]
```

Một object cũng được (không cần bọc mảng). `lang` phải nằm trong danh sách `src/highlight.mjs`
hỗ trợ: `java`, `sql`, `yaml`, `properties`, `json`, `xml`, `bash`, `dockerfile`, `js`, `lua`
(kèm alias: `yml`, `sh`, `shell`, `ini`, `mysql`…). Lang lạ vẫn render nhưng không có màu và
build in cảnh báo.

Thêm ngôn ngữ mới = thêm một entry vào `DEFS` trong `src/highlight.mjs`. **Rule chỉ được dùng
nhóm không bắt `(?:...)`** — `scan()` dò nhóm khớp theo chỉ số, nhóm bắt lồng nhau làm lệch hết.

### Soạn demo hàng loạt

Đừng sửa tay từng object (dễ sai escape `\n`, dấu nháy). Viết file patch rồi chèn bằng
`tools/add-demos.mjs`:

```
@@ <chuỗi con DUY NHẤT của dòng q:>
--- <lang> | <title>
<code...>
--- <lang> | <title>
<code...>
@@ <câu tiếp theo>
```

```bash
node tools/add-demos.mjs patch.txt src/data/java-01-core-oop.js
```

Script tự escape sang chuỗi JS nối `\n`, chèn `demo:` làm field cuối của object. Nó **dừng
với exit 1** nếu chuỗi match khớp 0 hoặc >1 câu, hoặc câu đó đã có `demo` — nên chạy lại an
toàn. Sau khi chèn luôn chạy `node src/build.mjs` để xác nhận.

Lưu ý khi viết chuỗi match: nó so với **nguyên văn dòng `q:` trong file nguồn**, kể cả dấu
backtick và dấu nháy đã escape (`\'`), nên copy trực tiếp một đoạn từ file thay vì gõ lại —
chuỗi ngắn không chứa ký tự đặc biệt là an toàn nhất.

Hiện **702/702 câu đã có `demo`** (793 khối code). Thêm câu hỏi mới thì nhớ thêm demo cho nó.

markdown-lite hỗ trợ: `**đậm**`, `` `code` ``, ```` ```khối``` ````, `- ` bullet, `1. ` số,
bảng `| a | b |`. Một block phải **đồng nhất một loại** (mọi dòng đều bullet, hoặc đều bảng…);
tách block bằng dòng trống.

Term **in đậm** và `` `code` `` trong `answer`/`essence` là input cho `relate.mjs` — chúng sinh
ra chip khái niệm và câu liên quan. Bôi đậm thuật ngữ có ý nghĩa, không bôi đậm tuỳ tiện.

## Lưu ý

- Không thêm dependency npm cho site tĩnh — pipeline cố ý chỉ dùng Node core.
- `dist/` là output, trong `.gitignore` — không commit, không sửa tay.
- File cần đặt ở gốc site (`google….html`, `BingSiteAuth.xml`, `CNAME`) bỏ vào `static/`.
- Mọi text hiển thị cho người dùng viết tiếng Việt; đường dẫn URL cũng tiếng Việt không dấu
  (`/luyen-tap/`, `/tai-khoan/`, `/bang-xep-hang/`).
- Đổi cấu trúc trang thì cập nhật `renderSitemap` trong `src/render.mjs` và `footer()` trong
  `src/templates.mjs`.
