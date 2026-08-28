# iv-analytics — backend thống kê truy cập

Cloudflare **Worker** (API) + **D1** (database SQLite quản lý sẵn). Free tier: 100k request/ngày,
D1 5 GB, 5 triệu dòng đọc/ngày, 100k dòng ghi/ngày — thừa cho một site nhỏ.

Site tĩnh (GitHub Pages) gọi:
- `POST /collect` — ghi một lượt xem (visitor id + chủ đề)
- `GET /stats` — trả JSON tổng hợp cho footer + trang `/stats`

Dữ liệu ẩn danh: visitor id là chuỗi ngẫu nhiên trong `localStorage`, không cookie, không lưu IP.

---

## A. Set up database (làm phần này trước)

### 1. Tài khoản Cloudflare (miễn phí)
<https://dash.cloudflare.com/sign-up> — chỉ cần email, không cần thẻ.

### 2. Cài Wrangler CLI
```powershell
npm install -g wrangler
wrangler --version        # >= 3.x
```
(Hoặc bỏ qua cài đặt, thay `wrangler` bằng `npx wrangler` ở mọi lệnh.)

### 3. Đăng nhập
```powershell
wrangler login            # mở trình duyệt, bấm "Allow"
```

### 4. Tạo database D1
```powershell
cd analytics
wrangler d1 create iv-analytics
```
Lệnh in ra một khối như:
```
[[d1_databases]]
binding = "DB"
database_name = "iv-analytics"
database_id = "a1b2c3d4-...."
```
**Chép `database_id`** vào `analytics/wrangler.toml` (thay `REPLACE_WITH_D1_DATABASE_ID`).

### 5. Tạo bảng (chạy schema)
```powershell
# database production (Cloudflare)
wrangler d1 execute iv-analytics --remote --file=schema.sql

# bản local để test bằng `wrangler dev` (tuỳ chọn)
wrangler d1 execute iv-analytics --local --file=schema.sql
```

### 6. Kiểm tra
```powershell
wrangler d1 execute iv-analytics --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```
Phải thấy: `visitor`, `visitor_day`, `daily`, `daily_topic`.

Đến đây "SQL server" đã sẵn sàng. Deploy Worker và nối site ở phần B (làm sau).

---

## B. Deploy Worker + nối vào site (làm sau)

### 1. Đặt origin của site
Sửa `wrangler.toml` → `ALLOW_ORIGIN = "https://<username>.github.io"`.

### 2. Deploy
```powershell
wrangler deploy
```
In ra URL, ví dụ `https://iv-analytics.<subdomain>.workers.dev`. Thử:
```powershell
curl https://iv-analytics.<subdomain>.workers.dev/stats
```

### 3. Cho site biết URL này
GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**
- Name: `ANALYTICS_URL`
- Value: URL Worker ở trên (không có `/` cuối)

Push lại (hoặc **Actions → Deploy → Re-run**) để build site với biến này.
Chưa đặt biến thì site vẫn chạy — footer dùng bộ đếm tạm phía client.

---

## Xem / truy vấn dữ liệu

```powershell
# 10 ngày gần nhất
wrangler d1 execute iv-analytics --remote --command "SELECT * FROM daily ORDER BY day DESC LIMIT 10"

# tổng lượt xem, tổng khách, khách quay lại
wrangler d1 execute iv-analytics --remote --command "SELECT (SELECT COALESCE(SUM(views),0) FROM daily) AS views, (SELECT COUNT(*) FROM visitor) AS visitors, (SELECT COUNT(*) FROM visitor WHERE first_day<>last_day) AS returning"

# top chủ đề
wrangler d1 execute iv-analytics --remote --command "SELECT topic, SUM(views) v FROM daily_topic GROUP BY topic ORDER BY v DESC"
```

Hoặc dùng SQL console trên web: **Cloudflare Dashboard → Storage & Databases → D1 → iv-analytics → Console**.

## Local dev

```powershell
wrangler d1 execute iv-analytics --local --file=schema.sql   # 1 lần
wrangler dev                                                 # http://localhost:8787
```
