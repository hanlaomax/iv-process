/* iv-analytics — Cloudflare Worker (router)
   Thống kê ẩn danh:  POST /collect · GET /stats
   Tài khoản Google:  POST /auth · GET /me · GET|POST /progress · POST /settings
                      POST /account/delete · GET /leaderboard · POST /admin/grant
   cron: dọn bảng visitor_day + user_activity_day > 90 ngày */
import { cors, json, utcDay } from './lib.js';
import { collect, stats } from './analytics.js';
import {
  authLogin, getMe, getProgress, putProgress, putSettings, deleteAccount, leaderboard, adminGrant,
} from './users.js';

const GET = {
  '/stats': (req, env) => stats(env).then((p) => json(p, 200, env, { 'Cache-Control': 'public, max-age=60' })),
  '/me': getMe,
  '/progress': getProgress,
  '/leaderboard': (req, env) => leaderboard(env),
};
const POST = {
  '/collect': collect,
  '/auth': authLogin,
  '/progress': putProgress,
  '/settings': putSettings,
  '/account/delete': deleteAccount,
  '/admin/grant': adminGrant,
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) });

    try {
      if (request.method === 'GET') {
        if (pathname === '/' || pathname === '/health') return json({ ok: true, service: 'iv-analytics' }, 200, env);
        const h = GET[pathname];
        if (h) return await h(request, env);
      }
      if (request.method === 'POST') {
        const h = POST[pathname];
        if (h) return await h(request, env);
      }
    } catch (e) {
      return json({ ok: false, error: 'server', detail: String(e && e.message || e) }, 500, env);
    }
    return json({ ok: false, error: 'not found' }, 404, env);
  },

  async scheduled(event, env, ctx) {
    const cutoff = utcDay(new Date(Date.now() - 90 * 86400000));
    ctx.waitUntil(env.DB.batch([
      env.DB.prepare(`DELETE FROM visitor_day WHERE day < ?`).bind(cutoff),
      env.DB.prepare(`DELETE FROM user_activity_day WHERE day < ?`).bind(cutoff),
    ]));
  },
};
