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
