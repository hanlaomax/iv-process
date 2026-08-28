/* Thống kê truy cập ẩn danh: POST /collect + GET /stats.
   Không cookie, không IP — visitor id là chuỗi ngẫu nhiên ở localStorage.
   Client chỉ gọi /collect một lần mỗi phiên (30 phút không hoạt động = phiên mới),
   nên mọi số "views" ở đây thực chất là số lượt truy cập / phiên. */
import { cors, json, utcDay } from './lib.js';

const TOPICS = new Set([
  'hub', 'stats', 'luyen-tap', 'tai-khoan', 'bang-xep-hang', 'privacy',
  'java', 'kafka', 'aws', 'redis', 'sql', 'microservices', 'design-patterns',
]);
const BOT = /bot\b|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|pinterest|whatsapp|telegram|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|monitor|python-requests|curl\/|wget|okhttp|go-http|node-fetch|axios/i;

let statsCache = null; // { at, payload } — cache trong isolate, TTL 60s

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

  await env.DB.batch([
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
  ]);

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
  ]);

  const one = (r) => (r.results && r.results[0]) || {};
  const t = one(res[3]);
  const payload = {
    generatedAt: new Date().toISOString(),
    totalViews: one(res[0]).v || 0,
    totalVisitors: one(res[1]).v || 0,
    returningVisitors: one(res[2]).v || 0,
    today: {
      views: t.views || 0,
      visitors: t.visitors || 0,
      newVisitors: t.new_visitors || 0,
      returningVisitors: t.returning_visitors || 0,
    },
    last30Days: (res[4].results || []).map((r) => ({
      day: r.day, views: r.views, visitors: r.visitors, returningVisitors: r.returning_visitors,
    })),
    topTopics: (res[5].results || []).map((r) => ({ topic: r.topic, views: r.views })),
  };

  statsCache = { at: Date.now(), payload };
  return payload;
}
