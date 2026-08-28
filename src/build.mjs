/* Static site generator: đọc dữ liệu câu hỏi -> sinh trang tĩnh vào dist/ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from './format.mjs';
import {
  renderHub, renderTopicPage, renderStatsPage, renderPracticePage, practiceData,
  renderSitemap, render404,
} from './render.mjs';

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

/* URL backend thống kê (Cloudflare Worker) — trống thì site dùng bộ đếm tạm phía client */
const analyticsUrl = (process.env.ANALYTICS_URL || '').trim().replace(/\/+$/, '');

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

/* Cảnh báo (không dừng build) cho các trường tuỳ chọn */
for (const t of topics) {
  const list = SS.q[t.id] || [];
  const ids = new Set(list.map((q) => q.id));
  for (const q of list) {
    if (Array.isArray(q.related))
      for (const r of q.related)
        if (!ids.has(r)) console.warn(`⚠ ${q.id}: related "${r}" không có trong chủ đề ${t.id}`);
    if (q.viz && !q.viz.type) console.warn(`⚠ ${q.id}: viz thiếu "type"`);
  }
}

/* Dọn & tạo dist — xoá nội dung, giữ lại thư mục gốc (tránh EPERM khi dist đang bị
   một tiến trình khác giữ làm thư mục làm việc hoặc phục vụ tĩnh trên Windows) */
mkdirSync(DIST, { recursive: true });
for (const entry of readdirSync(DIST)) rmSync(join(DIST, entry), { recursive: true, force: true });
mkdirSync(join(DIST, 'assets'), { recursive: true });

/* Trang chủ */
writeFileSync(join(DIST, 'index.html'), renderHub({ topics, counts, total, siteUrl, analyticsUrl }));

/* Trang thống kê */
mkdirSync(join(DIST, 'stats'), { recursive: true });
writeFileSync(join(DIST, 'stats', 'index.html'), renderStatsPage({ topics, siteUrl, analyticsUrl }));

/* Trang luyện tập + dữ liệu nội dung đầy đủ (tải on-demand) */
const allQuestions = topics.flatMap((t) => SS.q[t.id] || []);
mkdirSync(join(DIST, 'luyen-tap'), { recursive: true });
writeFileSync(
  join(DIST, 'luyen-tap', 'index.html'),
  renderPracticePage({ topics, questions: allQuestions, siteUrl, analyticsUrl })
);
writeFileSync(join(DIST, 'luyen-tap', 'questions.json'), practiceData(allQuestions));

/* Có file hình minh hoạ cho chủ đề nào? */
const diagramDir = join(ROOT, 'assets', 'diagrams');
let diagramTopics = new Set();
try {
  diagramTopics = new Set(
    readdirSync(diagramDir).filter((f) => f.endsWith('.js') && f !== 'core.js').map((f) => f.replace('.js', ''))
  );
} catch {}

/* Trang từng chủ đề */
for (const topic of topics) {
  const list = SS.q[topic.id];
  const dir = join(DIST, topic.id);
  mkdirSync(dir, { recursive: true });
  const hasDiagrams = diagramTopics.has(topic.id) && list.some((q) => q.diagram);
  const hasViz = list.some((q) => q.viz);
  writeFileSync(
    join(dir, 'index.html'),
    renderTopicPage({ topic, list, topics, siteUrl, hasDiagrams, hasViz, analyticsUrl })
  );
}

/* Tài nguyên tĩnh */
cpSync(join(ROOT, 'assets', 'styles.css'), join(DIST, 'assets', 'styles.css'));
cpSync(join(ROOT, 'assets', 'enhance.js'), join(DIST, 'assets', 'enhance.js'));
cpSync(join(ROOT, 'assets', 'stats.js'), join(DIST, 'assets', 'stats.js'));
cpSync(join(ROOT, 'assets', 'practice.js'), join(DIST, 'assets', 'practice.js'));
cpSync(join(ROOT, 'assets', 'topic-graph.js'), join(DIST, 'assets', 'topic-graph.js'));
cpSync(join(ROOT, 'assets', 'viz'), join(DIST, 'assets', 'viz'), { recursive: true });
if (diagramTopics.size) cpSync(diagramDir, join(DIST, 'assets', 'diagrams'), { recursive: true });

/* File tĩnh tuỳ ý ở gốc site: google<...>.html (Search Console), BingSiteAuth.xml,
   ads.txt, CNAME... — bỏ vào thư mục static/ ở gốc repo. */
try {
  for (const entry of readdirSync(join(ROOT, 'static'))) {
    if (entry === 'README.md' || entry.startsWith('.')) continue;
    cpSync(join(ROOT, 'static', entry), join(DIST, entry), { recursive: true });
  }
} catch {}

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
