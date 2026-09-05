/* Kiểm chứng Worker mà KHÔNG cần deploy lên Cloudflare.
   Chạy schema.sql + collect() + stats() trên SQLite trong bộ nhớ (node:sqlite,
   Node 22+) qua một shim tối giản của API D1.

   Chạy:  node analytics/test.mjs          (từ gốc repo hoặc từ analytics/)
   Thoát mã 1 nếu có assertion sai — dùng được trong CI. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { collect, stats } from './src/analytics.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(':memory:');
db.exec(readFileSync(join(HERE, 'schema.sql'), 'utf8'));

/* ---- shim tối giản của D1: chỉ đủ cho analytics.js ---- */
const wrap = (sql, params = []) => ({
  bind: (...args) => wrap(sql, args),
  all() {
    const st = db.prepare(sql);
    if (/^\s*(select|with)/i.test(sql) || /returning/i.test(sql)) {
      return { results: st.all(...params), success: true };
    }
    st.run(...params);
    return { results: [], success: true };
  },
});
const env = {
  ALLOW_ORIGIN: '',
  DB: { prepare: (sql) => wrap(sql), batch: async (stmts) => stmts.map((s) => s.all()) },
};

const req = (ip, vid, topic, geo = {}, ua = 'Mozilla/5.0 Chrome/120') => ({
  headers: { get: (k) => ({ 'user-agent': ua, 'cf-connecting-ip': ip })[k.toLowerCase()] ?? null },
  cf: geo,
  text: async () => JSON.stringify({ v: vid, t: topic }),
});

let failed = 0;
const ok = (label, cond) => {
  if (!cond) failed++;
  console.log(`${cond ? '  ok  ' : '  SAI '} ${label}`);
};

/* ---- collect ---- */
await collect(req('14.161.29.7', 'vid-aaaaaaaa', 'java', { country: 'VN', city: 'Hanoi' }), env);
await collect(req('14.161.29.7', 'vid-aaaaaaaa', 'kafka', { country: 'VN', city: 'Hanoi' }), env);
await collect(req('14.161.29.7', 'vid-bbbbbbbb', 'sql', { country: 'VN', city: 'Hanoi' }), env);
await collect(req('203.0.113.9', 'vid-cccccccc', 'hub', { country: 'SG', city: 'Singapore' }), env);
await collect(req('2405:4802:1f2:a10::1', 'vid-dddddddd', 'redis', { country: 'VN' }), env);
await collect(req('8.8.8.8', 'vid-eeeeeeee', 'aws', {}), env);
await collect(req('không-phải-ip', 'vid-ffffffff', 'java', {}), env);          // IP rác
await collect(req('1.2.3.4', 'vid-gggggggg', 'java', {}, 'Googlebot/2.1'), env); // bot

const ips = db.prepare('SELECT ip, views, country FROM visitor_ip ORDER BY views DESC, ip').all();
ok('chỉ 4 IP hợp lệ được lưu (IP rác và bot bị loại)', ips.length === 4);
ok('IP nhiều lượt nhất đúng', ips[0].ip === '14.161.29.7' && ips[0].views === 3);
ok('IPv6 lưu được', ips.some((r) => r.ip === '2405:4802:1f2:a10::1'));
ok('không có geo -> country NULL', ips.find((r) => r.ip === '8.8.8.8').country === null);
ok('ip_day: mỗi IP một dòng trong ngày', db.prepare('SELECT COUNT(*) c FROM ip_day').get().c === 4);
ok('lượt xem vẫn đếm cả khi không lấy được IP',
   db.prepare('SELECT SUM(views) s FROM daily').get().s === 7);

/* ---- stats ---- */
const p = await stats(env);
ok('totalIps = 4', p.totalIps === 4);
ok('today.ips = 4', p.today.ips === 4);
ok('topIps sắp giảm dần theo lượt',
   p.topIps.every((r, i, a) => i === 0 || a[i - 1].views >= r.views));
ok('topIps đủ trường cho bảng', !!(p.topIps[0].ip && p.topIps[0].firstDay && p.topIps[0].lastSeen));
ok('topCountries gộp đúng (VN dẫn đầu)',
   p.topCountries[0].country === 'VN' && p.topCountries[0].views === 4);
ok('quốc gia không rõ gộp vào "??"', p.topCountries.some((c) => c.country === '??'));
ok('last30Days có số IP mỗi ngày', p.last30Days.at(-1).ips === 4);

/* ---- cron dọn ip_day ---- */
db.prepare("INSERT INTO ip_day (ip, day) VALUES ('9.9.9.9', '2020-01-01')").run();
db.prepare('DELETE FROM ip_day WHERE day < ?')
  .run(new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
ok('cron xoá ip_day cũ, giữ dòng mới', db.prepare('SELECT COUNT(*) c FROM ip_day').get().c === 4);

console.log(failed ? `\n✗ ${failed} assertion sai` : '\n✓ Toàn bộ assertion pass');
process.exit(failed ? 1 : 0);
