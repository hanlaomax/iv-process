/* Static site generator: đọc dữ liệu câu hỏi -> sinh trang tĩnh vào dist/ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from './format.mjs';
import { renderHub, renderTopicPage, renderSitemap, render404 } from './render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const DATA_DIR = join(ROOT, 'src', 'data');

/* URL gốc: env SITE_URL > package.json "homepage" > mặc định */
let siteUrl = process.env.SITE_URL || '';
if (!siteUrl) {
  try {
    siteUrl = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).homepage || '';
  } catch {}
}
siteUrl = (siteUrl || 'https://example.github.io/interview-vault').replace(/\/?$/, '/');

/* Shim tối thiểu để chạy các file dữ liệu viết theo kiểu biến toàn cục SS */
const SS = { topics: [], q: {} };
SS.addQuestions = (topic, arr) => {
  const list = (SS.q[topic] = SS.q[topic] || []);
  for (const item of arr) {
    item.topic = topic;
    item.id = topic + '-' + hash(item.q);
    list.push(item);
  }
};

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.js')).sort();
for (const f of files) {
  const code = readFileSync(join(DATA_DIR, f), 'utf8');
  new Function('SS', code)(SS);
}

const topics = SS.topics;
const counts = Object.fromEntries(topics.map((t) => [t.id, (SS.q[t.id] || []).length]));
const total = Object.values(counts).reduce((a, b) => a + b, 0);

/* Kiểm tra toàn vẹn trước khi build */
const problems = [];
for (const t of topics) {
  const list = SS.q[t.id] || [];
  if (!list.length) problems.push(`${t.id}: 0 câu`);
  const ids = new Set(list.map((q) => q.id));
  if (ids.size !== list.length) problems.push(`${t.id}: id trùng`);
  for (const q of list)
    if (!q.q || !q.answer || !q.essence || !q.example || !q.cat) problems.push(`${q.id}: thiếu field`);
}
if (problems.length) {
  console.error('Build dừng — dữ liệu có vấn đề:\n' + problems.join('\n'));
  process.exit(1);
}

/* Dọn & tạo dist */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });

/* Trang chủ */
writeFileSync(join(DIST, 'index.html'), renderHub({ topics, counts, total, siteUrl }));

/* Trang từng chủ đề */
for (const topic of topics) {
  const list = SS.q[topic.id];
  const dir = join(DIST, topic.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), renderTopicPage({ topic, list, topics, siteUrl }));
}

/* Tài nguyên tĩnh */
cpSync(join(ROOT, 'assets', 'styles.css'), join(DIST, 'assets', 'styles.css'));
cpSync(join(ROOT, 'assets', 'enhance.js'), join(DIST, 'assets', 'enhance.js'));

/* SEO phụ trợ */
writeFileSync(join(DIST, 'sitemap.xml'), renderSitemap({ topics, siteUrl }));
writeFileSync(
  join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`
);
writeFileSync(join(DIST, '404.html'), render404({ topics, siteUrl }));
writeFileSync(join(DIST, '.nojekyll'), '');

console.log(`✓ Build xong: ${total} câu / ${topics.length} chủ đề -> dist/`);
console.log(`  Site URL: ${siteUrl}`);
