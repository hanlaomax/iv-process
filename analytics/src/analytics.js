/* Thống kê truy cập: POST /collect + GET /stats.
   Không cookie — visitor id là chuỗi ngẫu nhiên ở localStorage.
   CÓ lưu ĐỊA CHỈ IP của khách (bảng visitor_ip) và /stats công khai hiển thị nó.
   Client chỉ gọi /collect một lần mỗi phiên (30 phút không hoạt động = phiên mới),
   nên mọi số "views" ở đây thực chất là số lượt truy cập / phiên. */
import { cors, json, utcDay } from './lib.js';

const TOPICS = new Set([
  'hub', 'stats', 'luyen-tap', 'tai-khoan', 'bang-xep-hang', 'privacy',
  'java', 'kafka', 'aws', 'redis', 'sql', 'microservices', 'design-patterns',
]);
const BOT = /bot\b|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|pinterest|whatsapp|telegram|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|monitor|python-requests|curl\/|wget|okhttp|go-http|node-fetch|axios/i;

const TOP_IP_LIMIT = 100; // số IP trả về cho trang /stats

let statsCache = null; // { at, payload } — cache trong isolate, TTL 60s

/* Lấy IP thật của khách. Trên Cloudflare, CF-Connecting-IP luôn do chính
   Cloudflare đặt nên KHÔNG giả mạo được; các header còn lại chỉ là dự phòng
   khi Worker chạy sau một proxy khác. */
function clientIp(request) {
  const cf = request.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = request.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0] || request.headers.get('x-real-ip') || '';
}

/* Chỉ nhận IPv4/IPv6 hợp lệ — chặn rác và header bịa từ client không đi qua CF */
const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]{2,45}$/;
function normalizeIp(raw) {
  const ip = String(raw || '').trim().toLowerCase();
  if (!ip || ip.length > 45) return '';
  if (IPV4.test(ip)) return ip.split('.').every((o) => Number(o) <= 255) ? ip : '';
  if (ip.includes(':') && IPV6.test(ip)) return ip;
  return '';
}

/* Che phần định danh cuối: IPv4 -> x.y.z.0, IPv6 -> giữ /64.
   KHÔNG được dùng ở cấu hình hiện tại (site chọn lưu IP đầy đủ) — để sẵn đây
   nếu sau này muốn giảm mức nhạy cảm: gọi maskIp(ip) trước khi ghi DB. */
export function maskIp(ip) {
  if (!ip) return '';
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':') + '::';
  return ip.replace(/\.\d{1,3}$/, '.0');
}

export async function collect(request, env) {
  const ua = request.headers.get('user-agent') || '';
  if (!ua || BOT.test(ua)) return json({ ok: true, skipped: 'bot' }, 200, env);

  const origin = request.headers.get('origin') || '';
  const allow = env.ALLOW_ORIGIN || '';
  if (allow && allow !== '*' && origin && origin !== allow) {
    return json({ ok: false, error: 'origin' }, 403, env);
  }

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return json({ ok: false, error: 'body' }, 400, env);
  }

  const vid = String(body.v || '').trim();
  if (!/^[A-Za-z0-9._-]{8,64}$/.test(vid)) return json({ ok: false, error: 'vid' }, 400, env);

  let topic = String(body.t || 'hub').trim().toLowerCase();
  if (!TOPICS.has(topic)) topic = 'other';

  const day = utcDay();

  const [vres, vdres] = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO visitor (id, first_day, last_day, views) VALUES (?, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET last_day = excluded.last_day, views = visitor.views + 1
       RETURNING first_day, views`
    ).bind(vid, day, day),
    env.DB.prepare(
      `INSERT INTO visitor_day (id, day) VALUES (?, ?) ON CONFLICT DO NOTHING RETURNING 1`
    ).bind(vid, day),
  ]);

  const vrow = (vres.results && vres.results[0]) || { first_day: day, views: 1 };
  const isNew = vrow.views === 1;
  const isReturning = String(vrow.first_day) < day;
  const firstToday = !!(vdres.results && vdres.results.length);

  const dv = firstToday ? 1 : 0;
  const dn = firstToday && isNew ? 1 : 0;
  const dr = firstToday && isReturning ? 1 : 0;

  const writes = [
    env.DB.prepare(
      `INSERT INTO daily (day, views, visitors, new_visitors, returning_visitors) VALUES (?, 1, ?, ?, ?)
       ON CONFLICT(day) DO UPDATE SET
         views = daily.views + 1,
         visitors = daily.visitors + ?,
         new_visitors = daily.new_visitors + ?,
         returning_visitors = daily.returning_visitors + ?`
    ).bind(day, dv, dn, dr, dv, dn, dr),
    env.DB.prepare(
      `INSERT INTO daily_topic (day, topic, views) VALUES (?, ?, 1)
       ON CONFLICT(day, topic) DO UPDATE SET views = daily_topic.views + 1`
    ).bind(day, topic),
  ];

  /* Ghi nhận IP. Bỏ qua khi không lấy được IP hợp lệ — thà thiếu một dòng
     còn hơn làm bẩn bảng bằng giá trị rác. */
  const ip = normalizeIp(clientIp(request));
  if (ip) {
    const geo = request.cf || {};
    const country = geo.country ? String(geo.country).slice(0, 8) : null;
    const city = geo.city ? String(geo.city).slice(0, 64) : null;
    writes.push(
      env.DB.prepare(
        `INSERT INTO visitor_ip (ip, first_day, last_day, last_seen, views, country, city)
         VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT(ip) DO UPDATE SET
           last_day  = excluded.last_day,
           last_seen = excluded.last_seen,
           views     = visitor_ip.views + 1,
           country   = COALESCE(excluded.country, visitor_ip.country),
           city      = COALESCE(excluded.city, visitor_ip.city)`
      ).bind(ip, day, day, Date.now(), country, city),
      env.DB.prepare(
        `INSERT INTO ip_day (ip, day) VALUES (?, ?) ON CONFLICT DO NOTHING`
      ).bind(ip, day)
    );
  }

  await env.DB.batch(writes);

  return json({ ok: true }, 200, env);
}

export async function stats(env) {
  if (statsCache && Date.now() - statsCache.at < 60000) return statsCache.payload;

  const day = utcDay();
  const since = utcDay(new Date(Date.now() - 29 * 86400000));
  const res = await env.DB.batch([
    env.DB.prepare(`SELECT COALESCE(SUM(views), 0) AS v FROM daily`),
    env.DB.prepare(`SELECT COUNT(*) AS v FROM visitor`),
    env.DB.prepare(`SELECT COUNT(*) AS v FROM visitor WHERE first_day <> last_day`),
    env.DB.prepare(`SELECT views, visitors, new_visitors, returning_visitors FROM daily WHERE day = ?`).bind(day),
    env.DB.prepare(`SELECT day, views, visitors, returning_visitors FROM daily WHERE day >= ? ORDER BY day`).bind(since),
    env.DB.prepare(`SELECT topic, SUM(views) AS views FROM daily_topic GROUP BY topic ORDER BY views DESC`),
    env.DB.prepare(`SELECT COUNT(*) AS v FROM visitor_ip`),
    env.DB.prepare(`SELECT COUNT(*) AS v FROM ip_day WHERE day = ?`).bind(day),
    env.DB.prepare(`SELECT day, COUNT(*) AS ips FROM ip_day WHERE day >= ? GROUP BY day`).bind(since),
    env.DB.prepare(
      `SELECT ip, views, first_day, last_day, last_seen, country, city
       FROM visitor_ip ORDER BY views DESC, last_seen DESC LIMIT ?`
    ).bind(TOP_IP_LIMIT),
    env.DB.prepare(
      `SELECT COALESCE(country, '??') AS country, COUNT(*) AS ips, SUM(views) AS views
       FROM visitor_ip GROUP BY country ORDER BY views DESC LIMIT 20`
    ),
  ]);

  const one = (r) => (r.results && r.results[0]) || {};
  const t = one(res[3]);

  // IP duy nhất theo ngày -> ghép vào chuỗi 30 ngày
  const ipsByDay = new Map((res[8].results || []).map((r) => [r.day, r.ips]));

  const payload = {
    generatedAt: new Date().toISOString(),
    totalViews: one(res[0]).v || 0,
    totalVisitors: one(res[1]).v || 0,
    returningVisitors: one(res[2]).v || 0,
    totalIps: one(res[6]).v || 0,
    today: {
      views: t.views || 0,
      visitors: t.visitors || 0,
      newVisitors: t.new_visitors || 0,
      returningVisitors: t.returning_visitors || 0,
      ips: one(res[7]).v || 0,
    },
    last30Days: (res[4].results || []).map((r) => ({
      day: r.day, views: r.views, visitors: r.visitors,
      returningVisitors: r.returning_visitors, ips: ipsByDay.get(r.day) || 0,
    })),
    topTopics: (res[5].results || []).map((r) => ({ topic: r.topic, views: r.views })),
    topIps: (res[9].results || []).map((r) => ({
      ip: r.ip, views: r.views, firstDay: r.first_day, lastDay: r.last_day,
      lastSeen: r.last_seen, country: r.country || null, city: r.city || null,
    })),
    topCountries: (res[10].results || []).map((r) => ({
      country: r.country, ips: r.ips, views: r.views,
    })),
    ipLimit: TOP_IP_LIMIT,
  };

  statsCache = { at: Date.now(), payload };
  return payload;
}
