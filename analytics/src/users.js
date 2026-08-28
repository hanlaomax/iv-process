/* Tài khoản người dùng: đăng nhập, đồng bộ tiến độ, cài đặt, xoá tài khoản,
   bảng xếp hạng, và cấp quyền premium (admin). */
import { json, utcDay } from './lib.js';
import { verifyGoogleToken, signSession, currentUser } from './auth.js';

async function tierOf(env, sub) {
  const row = await env.DB.prepare(
    `SELECT tier, expires_at FROM user_entitlement WHERE sub = ?`
  ).bind(sub).first();
  if (!row || row.tier !== 'premium') return 'free';
  if (row.expires_at && row.expires_at < Date.now()) return 'free';
  return 'premium';
}

async function profile(env, sub) {
  const u = await env.DB.prepare(
    `SELECT sub, email, name, picture, display_name, show_on_leaderboard FROM app_user WHERE sub = ?`
  ).bind(sub).first();
  if (!u) return null;
  return {
    name: u.name,
    email: u.email,
    picture: u.picture,
    displayName: u.display_name || u.name,
    showOnLeaderboard: !!u.show_on_leaderboard,
    tier: await tierOf(env, sub),
  };
}

/* POST /auth  { credential: <google id token> } */
export async function authLogin(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.SESSION_SECRET) {
    return json({ ok: false, error: 'not-configured' }, 503, env);
  }
  let body;
  try { body = JSON.parse(await request.text()); } catch { return json({ ok: false, error: 'body' }, 400, env); }

  let g;
  try { g = await verifyGoogleToken(body.credential, env.GOOGLE_CLIENT_ID); }
  catch (e) { return json({ ok: false, error: 'token', detail: String(e.message || e) }, 401, env); }

  const day = utcDay();
  await env.DB.prepare(
    `INSERT INTO app_user (sub, email, name, picture, created_day, last_seen_day)
     VALUES (?1, ?2, ?3, ?4, ?5, ?5)
     ON CONFLICT(sub) DO UPDATE SET email = ?2, name = ?3, picture = ?4, last_seen_day = ?5`
  ).bind(g.sub, g.email, g.name, g.picture, day).run();

  const prog = await env.DB.prepare(`SELECT rev FROM user_progress WHERE sub = ?`).bind(g.sub).first();
  const me = await profile(env, g.sub);
  const token = await signSession({ sub: g.sub, name: me.name, picture: me.picture }, env.SESSION_SECRET);
  return json({ ok: true, token, user: me, progressRev: prog ? prog.rev : 0 }, 200, env);
}

/* GET /me */
export async function getMe(request, env) {
  const s = await currentUser(request, env);
  if (!s) return json({ ok: false, error: 'auth' }, 401, env);
  const me = await profile(env, s.sub);
  if (!me) return json({ ok: false, error: 'gone' }, 401, env);
  const prog = await env.DB.prepare(`SELECT rev FROM user_progress WHERE sub = ?`).bind(s.sub).first();
  return json({ ok: true, user: me, progressRev: prog ? prog.rev : 0 }, 200, env);
}

/* GET /progress */
export async function getProgress(request, env) {
  const s = await currentUser(request, env);
  if (!s) return json({ ok: false, error: 'auth' }, 401, env);
  const row = await env.DB.prepare(`SELECT data, rev FROM user_progress WHERE sub = ?`).bind(s.sub).first();
  let data = {};
  try { data = row ? JSON.parse(row.data) : {}; } catch {}
  return json({ ok: true, rev: row ? row.rev : 0, data }, 200, env);
}

/* POST /progress  { data: {srs,learned,log}, todayReviews: <int> } */
export async function putProgress(request, env) {
  const s = await currentUser(request, env);
  if (!s) return json({ ok: false, error: 'auth' }, 401, env);
  let body;
  try { body = JSON.parse(await request.text()); } catch { return json({ ok: false, error: 'body' }, 400, env); }

  const blob = JSON.stringify(body.data || {});
  if (blob.length > 400000) return json({ ok: false, error: 'too-big' }, 413, env);

  const upd = (await env.DB.prepare(
    `INSERT INTO user_progress (sub, data, rev, updated_at) VALUES (?1, ?2, 1, ?3)
     ON CONFLICT(sub) DO UPDATE SET data = ?2, rev = user_progress.rev + 1, updated_at = ?3
     RETURNING rev`
  ).bind(s.sub, blob, Date.now()).first()) || { rev: 1 };

  const today = utcDay();
  const reviews = Math.max(0, Math.min(9999, parseInt(body.todayReviews, 10) || 0));
  if (reviews > 0) {
    await env.DB.prepare(
      `INSERT INTO user_activity_day (sub, day, reviews) VALUES (?1, ?2, ?3)
       ON CONFLICT(sub, day) DO UPDATE SET reviews = MAX(user_activity_day.reviews, ?3)`
    ).bind(s.sub, today, reviews).run();
  }
  return json({ ok: true, rev: upd.rev }, 200, env);
}

/* POST /settings  { displayName, showOnLeaderboard } */
export async function putSettings(request, env) {
  const s = await currentUser(request, env);
  if (!s) return json({ ok: false, error: 'auth' }, 401, env);
  let body;
  try { body = JSON.parse(await request.text()); } catch { return json({ ok: false, error: 'body' }, 400, env); }

  const name = String(body.displayName || '').trim().slice(0, 32) || null;
  const show = body.showOnLeaderboard ? 1 : 0;
  await env.DB.prepare(
    `UPDATE app_user SET display_name = ?, show_on_leaderboard = ? WHERE sub = ?`
  ).bind(name, show, s.sub).run();
  return json({ ok: true, user: await profile(env, s.sub) }, 200, env);
}

/* POST /account/delete — xoá toàn bộ dữ liệu của người dùng */
export async function deleteAccount(request, env) {
  const s = await currentUser(request, env);
  if (!s) return json({ ok: false, error: 'auth' }, 401, env);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM user_progress WHERE sub = ?`).bind(s.sub),
    env.DB.prepare(`DELETE FROM user_activity_day WHERE sub = ?`).bind(s.sub),
    env.DB.prepare(`DELETE FROM user_entitlement WHERE sub = ?`).bind(s.sub),
    env.DB.prepare(`DELETE FROM app_user WHERE sub = ?`).bind(s.sub),
  ]);
  return json({ ok: true }, 200, env);
}

/* GET /leaderboard — công khai, chỉ người bật hiển thị, top 20 theo 7 ngày */
export async function leaderboard(env) {
  const since = utcDay(new Date(Date.now() - 6 * 86400000));
  const res = await env.DB.prepare(
    `SELECT COALESCE(u.display_name, u.name) AS name, SUM(a.reviews) AS reviews
     FROM user_activity_day a JOIN app_user u ON u.sub = a.sub
     WHERE a.day >= ? AND u.show_on_leaderboard = 1
     GROUP BY a.sub ORDER BY reviews DESC, name ASC LIMIT 20`
  ).bind(since).all();
  return json({
    ok: true,
    since,
    entries: (res.results || []).map((r, i) => ({ rank: i + 1, name: r.name, reviews: r.reviews })),
  }, 200, env);
}

/* POST /admin/grant  (Authorization: Bearer <ADMIN_TOKEN>)  { email, tier, days } */
export async function adminGrant(request, env) {
  const auth = request.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== 'Bearer ' + env.ADMIN_TOKEN) {
    return json({ ok: false, error: 'auth' }, 401, env);
  }
  let body;
  try { body = JSON.parse(await request.text()); } catch { return json({ ok: false, error: 'body' }, 400, env); }

  const u = await env.DB.prepare(`SELECT sub FROM app_user WHERE email = ?`).bind(String(body.email || '')).first();
  if (!u) return json({ ok: false, error: 'no-user' }, 404, env);

  const tier = body.tier === 'free' ? 'free' : 'premium';
  const days = parseInt(body.days, 10);
  const expires = days > 0 ? Date.now() + days * 86400000 : null;
  await env.DB.prepare(
    `INSERT INTO user_entitlement (sub, tier, expires_at, granted_at, note) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(sub) DO UPDATE SET tier = ?2, expires_at = ?3, granted_at = ?4, note = ?5`
  ).bind(u.sub, tier, expires, Date.now(), String(body.note || '').slice(0, 200)).run();
  return json({ ok: true, sub: u.sub, tier, expires }, 200, env);
}
