# Interview Vault

Trang web tĩnh ôn tập **700+ câu hỏi phỏng vấn cấp độ Middle** cho 7 chủ đề:
**Java / Spring Boot · Apache Kafka · AWS · Redis · SQL · Microservices · Design Patterns**.

Mỗi câu gồm ba phần: **Trả lời** (chi tiết) · **Bản chất** (cốt lõi để nhớ nhanh) · **Ví dụ thực tế**.
Nội dung tiếng Việt, giữ nguyên thuật ngữ kỹ thuật tiếng Anh.

Trang được **render sẵn thành HTML tĩnh** (tối ưu SEO), hoạt động **không cần JavaScript**;
JavaScript chỉ thêm tiện ích (lọc, đánh dấu "đã thuộc", thu gọn, giao diện sáng/tối).

## Chạy tại máy

Không cần cài package (chỉ dùng Node core).

```bash
node src/build.mjs      # sinh trang tĩnh vào dist/
node src/serve.mjs      # xem thử tại http://localhost:4173
# hoặc gộp cả hai:
npm run serve
```

## Triển khai lên GitHub Pages

Đã có sẵn workflow `.github/workflows/deploy.yml` (build bằng Node, deploy qua GitHub Pages).

1. Tạo một repo trên GitHub (ví dụ `iv-process`), rồi:
   ```bash
   git remote add origin https://github.com/<username>/iv-process.git
   git push -u origin main
   ```
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Mỗi lần push lên nhánh `main`, workflow tự build và deploy.
   URL: `https://<username>.github.io/iv-process/`
   (workflow tự lấy đúng base URL, không cần sửa gì).

> Nếu muốn dùng làm **user site** (`<username>.github.io`): đặt tên repo là `<username>.github.io`
> — mọi thứ vẫn chạy, base URL thành `https://<username>.github.io/`.

## Thống kê truy cập (tuỳ chọn)

Backend riêng trong [`analytics/`](analytics/) — **Cloudflare Worker + D1** (SQLite), miễn phí.
Xem [`analytics/README.md`](analytics/README.md) để set up database và deploy.

Sau khi deploy Worker, đặt **repo variable** `ANALYTICS_URL` = URL Worker
(*Settings → Secrets and variables → Actions → Variables*) rồi build lại (push hoặc re-run Actions).

- Có `ANALYTICS_URL`: footer hiện **số thật**, thêm trang **`/stats`** (tổng lượt xem, khách duy
  nhất, khách quay lại, biểu đồ 30 ngày, lượt xem theo chủ đề).
- Chưa có: footer dùng bộ đếm tạm phía client, `/stats` báo "chưa cấu hình".

Dữ liệu **ẩn danh**: visitor id là chuỗi ngẫu nhiên trong `localStorage` (không cookie, không lưu
IP); tôn trọng Do Not Track; bot bị lọc theo User-Agent.

## SEO

- Mỗi chủ đề là một URL riêng (`/java/`, `/kafka/`…) với toàn bộ nội dung trong HTML.
- `<title>`, `meta description`, canonical, Open Graph riêng cho từng trang.
- Structured data **FAQPage** (JSON-LD) cho mỗi trang chủ đề.
- `sitemap.xml`, `robots.txt`, trang `404.html` tự chứa.
- HTTPS do GitHub Pages tự cấp.

> **Được index chưa?** Có thẻ SEO ≠ có mặt trên Google. Site mới phải: (1) thêm vào
> **Google Search Console** — xác minh bằng cách bỏ file `google….html` vào [`static/`](static/);
> (2) nộp `sitemap.xml`; (3) *URL Inspection → Request Indexing* cho trang chủ + 7 trang chủ đề.
> Index mất vài ngày–2 tuần; xếp hạng từ khoá cạnh tranh mất nhiều tháng + cần backlink.

## Cấu trúc

```
src/
  data/                 # 35 file câu hỏi + _topics.js (nội dung, tự đăng ký qua SS.addQuestions)
  format.mjs            # markdown-lite -> HTML, slug, hash id, strip
  templates.mjs         # <head> đầy đủ SEO, header, footer, breadcrumb, khung trang
  render.mjs            # sinh trang chủ, trang chủ đề, trang /stats, sitemap, 404
  build.mjs             # đọc data -> kiểm tra toàn vẹn -> ghi dist/  (đọc env ANALYTICS_URL)
  serve.mjs             # máy chủ tĩnh tối giản để xem thử
assets/
  styles.css           # thiết kế (IBM Plex Sans/Mono + Lora; màu theo chủ đề; sáng/tối)
  enhance.js            # tiện ích client + gửi lượt xem (không bắt buộc)
  stats.js             # nạp & vẽ số liệu cho trang /stats
analytics/             # Cloudflare Worker + D1 — backend thống kê (deploy riêng)
static/                # file copy nguyên trạng ra gốc site (google….html, BingSiteAuth.xml, CNAME…)
.github/workflows/deploy.yml
```

### Thêm câu hỏi

Sửa file trong `src/data/`. Mỗi mục:

```js
SS.addQuestions('java', [
  {
    cat: 'Tên mục con',
    q: 'Câu hỏi?',
    answer: 'Hỗ trợ **đậm**, `code`, ```khối code```, danh sách "- ", "1. ", bảng "| a | b |".',
    essence: 'Cốt lõi 1–2 câu.',
    example: 'Ví dụ thực tế 1–2 câu.',
  },
]);
```

`id` sinh tự động từ hash nội dung câu hỏi (ổn định khi thêm/sắp xếp lại).
Chạy lại `node src/build.mjs` — build sẽ dừng nếu thiếu field hoặc trùng id.

Tuỳ chọn thêm cho mỗi câu:

- `related: ['java-xxxx', ...]` — ghi đè thủ công danh sách câu liên quan (mặc định tự suy ra).
- `viz: { type, ... }` — hình minh hoạ tương tác. `type` là một trong: `compare`, `layers`,
  `tree`, `bars`, `flow`, `sequence`, `states`, `cycle`, `timeline`, `quadrant`
  (xem `assets/viz/viz-static.js` và `assets/viz/viz-anim.js` để biết cấu trúc dữ liệu từng loại).
