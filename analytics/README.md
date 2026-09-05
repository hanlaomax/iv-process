# iv-analytics — backend thống kê truy cập

Cloudflare **Worker** (API) + **D1** (database SQLite quản lý sẵn). Free tier: 100k request/ngày,
D1 5 GB, 5 triệu dòng đọc/ngày, 100k dòng ghi/ngày — thừa cho một site nhỏ.

Site tĩnh (GitHub Pages) gọi:
- `POST /collect` — ghi một lượt truy cập (visitor id + chủ đề); client chỉ gọi **một lần mỗi phiên**
  (30 phút không hoạt động = phiên mới), nên số "views" = số phiên
- `GET /stats` — trả JSON tổng hợp cho footer + trang `/stats`

Visitor id là chuỗi ngẫu nhiên trong `localStorage`, không cookie. Worker **có lưu địa chỉ IP**
(bảng `visitor_ip`) và trang `/stats` hiển thị công khai — xem cảnh báo ở README gốc.

**Đăng nhập Google (tuỳ chọn)** — để đồng bộ tiến độ học + bảng xếp hạng:
- `POST /auth` `{credential}` — verify Google ID token, trả session token
- `GET /me`, `GET|POST /progress`, `POST /settings`, `POST /account/delete`
- `GET /leaderboard` — công khai
- `POST /admin/grant` — cấp premium (cần `Authorization: Bearer <ADMIN_TOKEN>`)

Xem phần **C** bên dưới để bật.

## Kiểm thử tại máy (không cần Cloudflare)

```bash
cd analytics && npm test        # hoặc: node test.mjs
```

`test.mjs` chạy `schema.sql` + `collect()` + `stats()` thật trên SQLite trong bộ nhớ
(`node:sqlite`, cần Node 22+) qua một shim tối giản của API D1. Nhờ đó kiểm chứng được SQL và
logic Worker mà không phải deploy. Thoát mã 1 khi có assertion sai — dùng được trong CI.

## Đã có DB từ trước? Chạy lại schema

`schema.sql` dùng `CREATE TABLE IF NOT EXISTS` nên chạy lại an toàn. Sau khi cập nhật code,
**bắt buộc** chạy lại để tạo bảng `visitor_ip` và `ip_day`, rồi mới deploy Worker:

```powershell
cd analytics
wrangler d1 execute iv-analytics --remote --file=schema.sql
wrangler deploy
```

Thiếu bước này thì `/collect` và `/stats` sẽ lỗi vì bảng chưa tồn tại.

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

## C. Bật đăng nhập Google (tuỳ chọn — làm sau khi A + B xong)

### 1. Tạo OAuth Client ID
1. <https://console.cloud.google.com/> → tạo project mới (ví dụ "interview-vault").
2. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create
   - App name: `Interview Vault`, support email: email của bạn
   - **App privacy policy URL**: `https://hanlaomax.github.io/iv-process/privacy/`
   - Scopes: chỉ giữ `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
     (không nhạy cảm → không cần Google duyệt)
   - Test users: thêm email của bạn nếu app còn "Testing"; bấm **Publish app** để mở cho mọi người
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `https://hanlaomax.github.io`
   - (Không cần redirect URI)
   - Copy **Client ID** (dạng `xxxxx.apps.googleusercontent.com`)

### 2. Thêm bảng người dùng vào D1
```powershell
cd analytics
wrangler d1 execute iv-analytics --remote --file=schema.sql   # IF NOT EXISTS — chạy lại an toàn
```

### 3. Đặt biến & secret cho Worker
```powershell
# Client ID (không bí mật) — dán vào [vars] GOOGLE_CLIENT_ID trong wrangler.toml, HOẶC:
wrangler secret put GOOGLE_CLIENT_ID     # dán Client ID

wrangler secret put SESSION_SECRET       # chuỗi ngẫu nhiên dài (vd: openssl rand -hex 32)
wrangler secret put ADMIN_TOKEN          # chuỗi ngẫu nhiên — để gọi /admin/grant

wrangler deploy
```

### 4. Cho site biết Client ID
GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**
- Name: `GOOGLE_CLIENT_ID`
- Value: Client ID ở trên

Push lại (hoặc Actions → Re-run) để build site. Chưa đặt biến thì nút "Đăng nhập" tự ẩn.

### 5. Cấp premium cho một người (thủ công)
```powershell
curl -X POST https://iv-analytics.<sub>.workers.dev/admin/grant `
  -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: text/plain" `
  --data '{\"email\":\"nguoidung@gmail.com\",\"tier\":\"premium\",\"days\":365}'
```
(Người đó phải đăng nhập ít nhất 1 lần trước để có bản ghi.)

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
