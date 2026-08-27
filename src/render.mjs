/* Sinh HTML cho trang chủ và từng trang chủ đề */
import { fmt, esc, plain, slugify, truncate } from './format.mjs';
import { head, header, footer, breadcrumb, page } from './templates.mjs';

/* Gom câu hỏi theo mục (giữ thứ tự xuất hiện) */
function groupByCat(list) {
  const groups = [];
  const idx = new Map();
  for (const q of list) {
    if (!idx.has(q.cat)) {
      idx.set(q.cat, groups.length);
      groups.push({ cat: q.cat, slug: 'muc-' + slugify(q.cat), items: [] });
    }
    groups[idx.get(q.cat)].items.push(q);
  }
  return groups;
}

const answerText = (q) =>
  plain(q.answer) + ' Bản chất: ' + plain(q.essence) + ' Ví dụ thực tế: ' + plain(q.example);

function faqJsonLd(topic, list, url) {
  const graph = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: url.replace(/[^/]+\/$/, '') || url },
        { '@type': 'ListItem', position: 2, name: topic.name, item: url },
      ],
    },
    {
      '@type': 'FAQPage',
      name: `${topic.name} — câu hỏi phỏng vấn`,
      inLanguage: 'vi',
      mainEntity: list.map((q) => ({
        '@type': 'Question',
        name: plain(q.q),
        acceptedAnswer: { '@type': 'Answer', text: truncate(answerText(q), 1200) },
      })),
    },
  ];
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

function questionArticle(q, n) {
  return `<article class="qa" id="${esc(q.id)}">
  <div class="qa-head">
    <span class="qa-num" aria-hidden="true">${n}</span>
    <h3 class="qa-q">${esc(q.q)}</h3>
    <button type="button" class="qa-learn" data-id="${esc(q.id)}" aria-pressed="false">
      <span class="qa-learn-icon" aria-hidden="true">✓</span><span class="qa-learn-text">Đã thuộc</span>
    </button>
    <a class="qa-permalink" href="#${esc(q.id)}" aria-label="Liên kết cố định tới câu hỏi này">#</a>
  </div>
  <div class="qa-body">
    <div class="qa-block qa-answer"><h4>Trả lời</h4>${fmt(q.answer)}</div>
    <div class="qa-block qa-essence"><h4>Bản chất</h4>${fmt(q.essence)}</div>
    <div class="qa-block qa-example"><h4>Ví dụ thực tế</h4>${fmt(q.example)}</div>
  </div>
</article>`;
}

/* Trang chủ đề */
export function renderTopicPage({ topic, list, topics, siteUrl }) {
  const url = `${siteUrl}${topic.id}/`;
  const groups = groupByCat(list);
  const idx = topics.findIndex((t) => t.id === topic.id);
  const prev = topics[idx - 1];
  const next = topics[idx + 1];

  const toc = groups
    .map(
      (g) =>
        `<li><a href="#${g.slug}">${esc(g.cat)}</a><span class="toc-count">${g.items.length}</span></li>`
    )
    .join('');

  let n = 0;
  const sections = groups
    .map(
      (g) => `<section class="cat" id="${g.slug}" aria-labelledby="${g.slug}-h">
  <h2 class="cat-title" id="${g.slug}-h">${esc(g.cat)} <span class="cat-count">${g.items.length} câu</span></h2>
  ${g.items.map((q) => questionArticle(q, ++n)).join('\n')}
</section>`
    )
    .join('\n');

  const pager = `<nav class="topic-pager" aria-label="Chủ đề khác">
  ${prev ? `<a class="pager-prev" href="../${prev.id}/"><small>Trước</small><span>${esc(prev.icon)} ${esc(prev.name)}</span></a>` : '<span></span>'}
  ${next ? `<a class="pager-next" href="../${next.id}/"><small>Tiếp</small><span>${esc(next.name)} ${esc(next.icon)}</span></a>` : '<span></span>'}
</nav>`;

  const desc = truncate(
    `${list.length} câu hỏi phỏng vấn ${topic.name} cấp độ Middle: ${topic.subtitle}. Mỗi câu có trả lời chi tiết, bản chất và ví dụ thực tế.`,
    300
  );

  const body = `${header({ root: '../', topics, current: topic.id })}
<main id="main" class="topic-page" data-topic="${topic.id}">
  <div class="wrap topic-layout">
    <aside class="toc" aria-label="Mục lục">
      <div class="toc-inner">
        <div class="toc-progress" data-topic="${topic.id}" hidden>
          <svg viewBox="0 0 36 36" class="ring" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="16"/><circle class="ring-fg" cx="18" cy="18" r="16"/></svg>
          <span class="toc-progress-label">0<small>/${list.length}</small></span>
          <span class="toc-progress-text">đã thuộc</span>
        </div>
        <p class="toc-title">Mục lục</p>
        <ol class="toc-list">${toc}</ol>
      </div>
    </aside>
    <div class="topic-main">
      ${breadcrumb([{ name: 'Trang chủ', href: '../' }, { name: topic.name }])}
      <h1 class="topic-h1"><span class="topic-h1-icon" aria-hidden="true">${esc(topic.icon)}</span>${esc(topic.name)}</h1>
      <p class="topic-count-line">${list.length} câu hỏi phỏng vấn · cấp độ Middle</p>
      <p class="lede">${esc(topic.intro)}</p>
      <div class="toolbar" role="search">
        <label class="filter"><span class="visually-hidden">Lọc câu hỏi</span>
          <input type="search" class="filter-input" placeholder="Lọc câu hỏi trong trang…" autocomplete="off">
        </label>
        <div class="toolbar-actions">
          <button type="button" class="btn-ghost" data-action="toggle-learned" hidden>Ẩn câu đã thuộc</button>
          <button type="button" class="btn-ghost" data-action="collapse-all">Thu gọn tất cả</button>
        </div>
        <p class="filter-empty" hidden>Không có câu hỏi khớp từ khoá.</p>
      </div>
      ${sections}
      ${pager}
    </div>
  </div>
</main>
${footer('../')}`;

  return page({
    root: '../',
    head: head({
      title: `${topic.name} — ${list.length} câu hỏi phỏng vấn (level Middle)`,
      description: desc,
      keywords: topic.keywords,
      canonical: url,
      root: '../',
      ogType: 'article',
      jsonld: faqJsonLd(topic, list, url),
    }),
    body,
  });
}

/* Trang chủ */
export function renderHub({ topics, counts, total, siteUrl }) {
  const cards = topics
    .map(
      (t) => `<a class="topic-card" href="${t.id}/" data-topic="${t.id}">
  <span class="topic-card-icon" aria-hidden="true">${esc(t.icon)}</span>
  <h2>${esc(t.name)}</h2>
  <p class="topic-card-count">${counts[t.id]} câu hỏi</p>
  <p class="topic-card-sub">${esc(t.subtitle)}</p>
  <span class="topic-card-cta">Bắt đầu học <span aria-hidden="true">→</span></span>
</a>`
    )
    .join('\n');

  const jsonld = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Interview Vault',
        url: siteUrl,
        inLanguage: 'vi',
        description: `${total} câu hỏi phỏng vấn cấp độ Middle cho Java/Spring Boot, Kafka, AWS, Redis và SQL.`,
      },
      {
        '@type': 'ItemList',
        itemListElement: topics.map((t, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: `${t.name} — câu hỏi phỏng vấn`,
          url: `${siteUrl}${t.id}/`,
        })),
      },
    ],
  });

  const body = `${header({ root: '', topics, current: null })}
<main id="main" class="hub">
  <section class="hero">
    <div class="wrap">
      <p class="hero-eyebrow">Ôn tập phỏng vấn · cấp độ Middle</p>
      <h1 class="hero-h1">${total} câu hỏi phỏng vấn, mỗi câu <em>hiểu tới bản chất</em></h1>
      <p class="hero-lede">Java &amp; Spring Boot, Apache Kafka, AWS, Redis và SQL. Mỗi câu gồm ba phần:
        <strong>trả lời</strong> chi tiết, <strong>bản chất</strong> để nhớ nhanh, và <strong>ví dụ thực tế</strong>.
        Tiếng Việt, giữ nguyên thuật ngữ tiếng Anh.</p>
      <div class="hero-stats">
        <span><b>${total}</b> câu hỏi</span>
        <span><b>${topics.length}</b> chủ đề</span>
        <span><b>3</b> phần / câu</span>
      </div>
    </div>
  </section>
  <section class="wrap topic-grid-section" aria-label="Chủ đề">
    <div class="topic-grid">${cards}</div>
  </section>
  <section class="wrap how">
    <h2>Cách dùng để học hiệu quả</h2>
    <ol class="how-list">
      <li><b>Đọc phần "Bản chất" trước.</b> Nếu tự giải thích lại được, đánh dấu "đã thuộc" và bỏ qua.</li>
      <li><b>Chưa chắc thì đọc "Trả lời" đầy đủ,</b> rồi soi "Ví dụ thực tế" để neo kiến thức vào tình huống.</li>
      <li><b>Dùng ô lọc trong mỗi chủ đề</b> để ôn nhanh theo từ khoá (ví dụ: "index", "rebalancing", "MVCC").</li>
      <li><b>Tiến độ "đã thuộc" được lưu trên trình duyệt</b> — quay lại chỉ cần xem các câu còn lại.</li>
    </ol>
  </section>
</main>
${footer('')}`;

  return page({
    root: '',
    head: head({
      title: `Interview Vault — ${total} câu hỏi phỏng vấn Java, Kafka, AWS, Redis, SQL`,
      description: `Bộ ${total} câu hỏi phỏng vấn cấp độ Middle cho Java/Spring Boot, Apache Kafka, AWS, Redis và SQL. Mỗi câu có trả lời chi tiết, phần bản chất để nhớ nhanh và ví dụ thực tế. Nội dung tiếng Việt.`,
      keywords: 'câu hỏi phỏng vấn, phỏng vấn backend, java spring boot, kafka, aws, redis, sql, ôn thi phỏng vấn middle developer',
      canonical: siteUrl,
      root: '',
      jsonld,
    }),
    body,
  });
}

export function renderSitemap({ topics, siteUrl }) {
  const now = new Date().toISOString().slice(0, 10);
  const urls = [siteUrl, ...topics.map((t) => `${siteUrl}${t.id}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u, i) => `  <url><loc>${esc(u)}</loc><lastmod>${now}</lastmod><changefreq>monthly</changefreq><priority>${i === 0 ? '1.0' : '0.8'}</priority></url>`).join('\n')}
</urlset>
`;
}

/* 404 tự chứa: không phụ thuộc đường dẫn tài nguyên (GitHub Pages phục vụ file này cho mọi URL sai) */
export function render404({ topics, siteUrl }) {
  const links = topics
    .map((t) => `<li><a href="${siteUrl}${t.id}/">${esc(t.icon)} ${esc(t.name)}</a></li>`)
    .join('');
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Không tìm thấy trang — Interview Vault</title>
<meta name="robots" content="noindex">
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px;
    font:16px/1.6 "IBM Plex Sans",system-ui,"Segoe UI",Roboto,sans-serif;background:#fbfaf7;color:#1b1a17}
  @media(prefers-color-scheme:dark){body{background:#14171a;color:#e9e6e0}}
  h1{font-size:28px;margin:0 0 8px}
  p{color:#6b6560;max-width:44ch;margin:0 auto 20px}
  @media(prefers-color-scheme:dark){p{color:#a7a29b}}
  a{color:#15706b}
  @media(prefers-color-scheme:dark){a{color:#4db3a9}}
  ul{list-style:none;padding:0;margin:0;display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
</style>
</head>
<body>
<main>
  <h1>404 — Không tìm thấy trang</h1>
  <p>Trang bạn tìm không tồn tại hoặc đã được di chuyển. Chọn một chủ đề để tiếp tục ôn tập:</p>
  <ul>${links}</ul>
  <p style="margin-top:24px"><a href="${siteUrl}">← Về trang chủ</a></p>
</main>
</body>
</html>
`;
}
