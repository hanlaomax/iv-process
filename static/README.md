# static/

Mọi file trong thư mục này (trừ `README.md`) được `build.mjs` copy **nguyên trạng ra gốc site**
(`dist/`), tức là truy cập được tại `https://<domain>/<tên-file>`.

Dùng cho:

| File | Mục đích |
|---|---|
| `googleXXXXXXXX.html` | Xác minh Google Search Console (cách "HTML file") |
| `BingSiteAuth.xml` | Xác minh Bing Webmaster Tools |
| `CNAME` | Custom domain cho GitHub Pages |
| `ads.txt`, `_headers`, ... | Tuỳ nhu cầu |

Ví dụ verify Search Console:
1. Search Console → thêm property `https://hanlaomax.github.io/iv-process/` → chọn **HTML file**
2. Tải file `google....html` Google cung cấp, đặt vào `static/`
3. `git push` → chờ Actions build xong
4. Mở `https://hanlaomax.github.io/iv-process/google....html` để chắc file đã live
5. Bấm **Verify** trong Search Console
