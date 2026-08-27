# Interview Vault

Trang web tĩnh ôn tập **501 câu hỏi phỏng vấn cấp độ Middle** cho 5 chủ đề:
**Java / Spring Boot · Apache Kafka · AWS · Redis · SQL**.

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

1. Tạo một repo trên GitHub (ví dụ `interview-vault`), rồi:
   ```bash
   git remote add origin https://github.com/<username>/interview-vault.git
   git push -u origin main
   ```
2. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Mỗi lần push lên nhánh `main`, workflow tự build và deploy.
   URL: `https://<username>.github.io/interview-vault/`
   (workflow tự lấy đúng base URL, không cần sửa gì).

> Nếu muốn dùng làm **user site** (`<username>.github.io`): đặt tên repo là `<username>.github.io`
> — mọi thứ vẫn chạy, base URL thành `https://<username>.github.io/`.

## SEO

- Mỗi chủ đề là một URL riêng (`/java/`, `/kafka/`…) với toàn bộ nội dung trong HTML.
- `<title>`, `meta description`, canonical, Open Graph riêng cho từng trang.
- Structured data **FAQPage** (JSON-LD) cho mỗi trang chủ đề.
- `sitemap.xml`, `robots.txt`, trang `404.html` tự chứa.
- HTTPS do GitHub Pages tự cấp.

## Cấu trúc

```
src/
  data/                 # 25 file câu hỏi + _topics.js (nội dung, tự đăng ký qua SS.addQuestions)
  format.mjs            # markdown-lite -> HTML, slug, hash id, strip
  templates.mjs         # <head> đầy đủ SEO, header, footer, breadcrumb, khung trang
  render.mjs            # sinh trang chủ, trang chủ đề, sitemap, 404
  build.mjs             # đọc data -> kiểm tra toàn vẹn -> ghi dist/
  serve.mjs             # máy chủ tĩnh tối giản để xem thử
assets/
  styles.css           # thiết kế (IBM Plex Sans/Mono + Newsreader; màu theo chủ đề; sáng/tối)
  enhance.js            # tiện ích client (không bắt buộc)
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
