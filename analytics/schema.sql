-- Interview Vault — analytics schema (Cloudflare D1 = SQLite)
-- Chạy: wrangler d1 execute iv-analytics --remote --file=schema.sql

-- Mỗi visitor: id ngẫu nhiên lưu ở localStorage của trình duyệt (không PII, không cookie)
CREATE TABLE IF NOT EXISTS visitor (
  id         TEXT PRIMARY KEY,
  first_day  TEXT NOT NULL,              -- YYYY-MM-DD (UTC) — lần đầu ghé
  last_day   TEXT NOT NULL,              -- lần gần nhất ghé
  views      INTEGER NOT NULL DEFAULT 1
);

-- Một dòng cho mỗi (visitor, ngày) → đếm khách duy nhất theo ngày
CREATE TABLE IF NOT EXISTS visitor_day (
  id   TEXT NOT NULL,
  day  TEXT NOT NULL,
  PRIMARY KEY (id, day)
);
CREATE INDEX IF NOT EXISTS idx_visitor_day_day ON visitor_day (day);

-- Tổng hợp theo ngày (dùng cho biểu đồ 30 ngày trên trang /stats)
CREATE TABLE IF NOT EXISTS daily (
  day                TEXT PRIMARY KEY,
  views              INTEGER NOT NULL DEFAULT 0,
  visitors           INTEGER NOT NULL DEFAULT 0,   -- khách duy nhất trong ngày
  new_visitors       INTEGER NOT NULL DEFAULT 0,   -- lần đầu ghé site
  returning_visitors INTEGER NOT NULL DEFAULT 0    -- đã ghé từ ngày trước, hôm nay quay lại
);

-- Tổng hợp lượt xem theo chủ đề theo ngày
CREATE TABLE IF NOT EXISTS daily_topic (
  day    TEXT NOT NULL,
  topic  TEXT NOT NULL,
  views  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, topic)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Thống kê theo ĐỊA CHỈ IP.
-- CẢNH BÁO: IP là dữ liệu cá nhân theo GDPR, và trang /stats CÔNG KHAI hiển thị
-- bảng IP này. Đây là lựa chọn có chủ ý của chủ site — /privacy đã ghi rõ.
-- Muốn bớt nhạy cảm: che 8 bit cuối trước khi lưu (xem maskIp trong analytics.js).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS visitor_ip (
  ip        TEXT PRIMARY KEY,
  first_day TEXT NOT NULL,              -- YYYY-MM-DD (UTC) — lần đầu thấy IP này
  last_day  TEXT NOT NULL,
  last_seen INTEGER NOT NULL,           -- epoch ms — để sắp theo "gần đây nhất"
  views     INTEGER NOT NULL DEFAULT 1, -- số phiên truy cập từ IP này
  country   TEXT,                       -- request.cf.country (Cloudflare cho sẵn)
  city      TEXT                        -- request.cf.city
);
CREATE INDEX IF NOT EXISTS idx_visitor_ip_views ON visitor_ip (views DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_ip_last_seen ON visitor_ip (last_seen DESC);

-- Một dòng cho mỗi (ip, ngày) → đếm IP duy nhất theo ngày
CREATE TABLE IF NOT EXISTS ip_day (
  ip  TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (ip, day)
);
CREATE INDEX IF NOT EXISTS idx_ip_day_day ON ip_day (day);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tài khoản người dùng (đăng nhập Google) — tuỳ chọn, chỉ để đồng bộ tiến độ
-- học đa thiết bị + bảng xếp hạng. KHÔNG gắn với bảng visitor/lượt xem ẩn danh.
-- ─────────────────────────────────────────────────────────────────────────────

-- Một dòng cho mỗi người đăng nhập. sub = Google subject id (ổn định, không đổi).
CREATE TABLE IF NOT EXISTS app_user (
  sub                TEXT PRIMARY KEY,
  email              TEXT,
  name               TEXT,
  picture            TEXT,
  display_name       TEXT,                       -- tên hiển thị trên bảng xếp hạng
  show_on_leaderboard INTEGER NOT NULL DEFAULT 0,
  created_day        TEXT NOT NULL,
  last_seen_day      TEXT NOT NULL
);

-- Tiến độ học của mỗi người: một blob JSON { srs, learned, log }.
CREATE TABLE IF NOT EXISTS user_progress (
  sub        TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  rev        INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- Số câu luyện mỗi ngày của mỗi người (cho bảng xếp hạng 7 ngày).
CREATE TABLE IF NOT EXISTS user_activity_day (
  sub     TEXT NOT NULL,
  day     TEXT NOT NULL,
  reviews INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sub, day)
);
CREATE INDEX IF NOT EXISTS idx_user_activity_day ON user_activity_day (day);

-- Quyền truy cập nội dung premium. Cấp thủ công qua POST /admin/grant.
CREATE TABLE IF NOT EXISTS user_entitlement (
  sub        TEXT PRIMARY KEY,
  tier       TEXT NOT NULL DEFAULT 'free',       -- 'free' | 'premium'
  expires_at INTEGER,                            -- null = vĩnh viễn
  granted_at INTEGER NOT NULL,
  note       TEXT
);
