/* Sinh HTML cho trang chủ và từng trang chủ đề */
import { fmt, esc, plain, slugify, truncate } from './format.mjs';
import { head, header, footer, breadcrumb, page } from './templates.mjs';
import { connect } from './relate.mjs';

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

function relatedChips(q, ctx) {
  const ids = (ctx.related && ctx.related.get(q.id)) || [];
  const links = ids
    .map((rid) => {
      const r = ctx.byId.get(rid);
      if (!r) return '';
      return `<a class="related-chip" href="#${esc(rid)}" data-rel="${esc(rid)}">${esc(truncate(r.q, 58))}</a>`;
    })
    .filter(Boolean)
    .join('');
  if (!links) return '';
  return `<nav class="qa-related" aria-label="Câu hỏi liên quan">
      <span class="qa-related-label">Câu liên quan</span>${links}
    </nav>`;
}

/* 3 khối trả lời + hình minh hoạ — dùng chung cho trang chủ đề và trình luyện tập.
   forPlayer: bỏ hình diagram cũ (cần script riêng); viz vẫn giữ. */
function qaBlocks(q, forPlayer) {
  const figure = q.viz ? vizFigure(q.viz) : !forPlayer && q.diagram ? diagramFigure(q.diagram) : '';
  return `<div class="qa-block qa-answer"><h4>Trả lời</h4>${fmt(q.answer)}</div>
    <div class="qa-block qa-essence"><h4>Bản chất</h4>${fmt(q.essence)}</div>
    <div class="qa-block qa-example"><h4>Ví dụ thực tế</h4>${fmt(q.example)}</div>
    ${figure}`;
}

function questionArticle(q, n, ctx) {
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
    ${qaBlocks(q)}
    ${relatedChips(q, ctx)}
  </div>
</article>`;
}

/* Hình minh hoạ tương tác dựng từ dữ liệu khai báo (viz-core.js + renderer theo type) */
function vizFigure(spec) {
  const json = JSON.stringify(spec).replace(/</g, '\\u003c');
  const title = spec.title ? `<span class="viz-title">${esc(spec.title)}</span>` : '';
  return `<figure class="viz" data-viz="${esc(json)}">
  <figcaption class="viz-cap"><span class="viz-badge">Minh hoạ</span>${title}</figcaption>
  <noscript><p class="viz-noscript">Bật JavaScript để xem hình minh hoạ tương tác cho câu này.</p></noscript>
</figure>`;
}

function diagramFigure(id) {
  return `<figure class="diagram" data-diagram="${esc(id)}">
  <figcaption class="diagram-cap"><span class="diagram-badge">Hình minh hoạ</span></figcaption>
  <noscript><p class="diagram-noscript">Bật JavaScript để xem hình minh hoạ động cho phần này.</p></noscript>
</figure>`;
}

/* Trang chủ đề */
export function renderTopicPage({ topic, list, topics, siteUrl, hasDiagrams, hasViz, analyticsUrl, googleClientId }) {
  const url = `${siteUrl}${topic.id}/`;
  const groups = groupByCat(list);
  const idx = topics.findIndex((t) => t.id === topic.id);
  const prev = topics[idx - 1];
  const next = topics[idx + 1];

  const { related, graph } = connect(list);
  const ctx = { related, byId: new Map(list.map((q) => [q.id, q])) };

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
  ${g.items.map((q) => questionArticle(q, ++n, ctx)).join('\n')}
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
        <div class="view-toggle" role="group" aria-label="Kiểu xem" hidden>
          <button type="button" class="vt-btn is-on" data-view="list" aria-pressed="true">Danh sách</button>
          <button type="button" class="vt-btn" data-view="graph" aria-pressed="false">Bản đồ</button>
        </div>
        <label class="filter"><span class="visually-hidden">Lọc câu hỏi</span>
          <input type="search" class="filter-input" placeholder="Lọc câu hỏi trong trang…" autocomplete="off">
        </label>
        <div class="toolbar-actions">
          <a class="btn-ghost btn-practice" href="../luyen-tap/?topic=${topic.id}">🎯 Luyện tập chủ đề</a>
          <button type="button" class="btn-ghost" data-action="toggle-learned" hidden>Ẩn câu đã thuộc</button>
          <button type="button" class="btn-ghost" data-action="collapse-all">Thu gọn tất cả</button>
        </div>
        <p class="filter-empty" hidden>Không có câu hỏi khớp từ khoá.</p>
      </div>
      ${sections}
      <section class="topic-graph" aria-label="Bản đồ khái niệm" hidden>
        <noscript><p class="graph-noscript">Bật JavaScript để xem bản đồ khái niệm.</p></noscript>
      </section>
      ${pager}
    </div>
  </div>
</main>
<script type="application/json" id="graph-data">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
${footer('../')}`;

  const topicScripts = ['assets/topic-graph.js'];
  if (hasViz) topicScripts.push('assets/viz/viz-core.js', 'assets/viz/viz-static.js', 'assets/viz/viz-anim.js');
  if (hasDiagrams) topicScripts.push('assets/diagrams/core.js', `assets/diagrams/${topic.id}.js`);

  return page({
    root: '../',
    scripts: topicScripts,
    head: head({
      title: `${topic.name} — ${list.length} câu hỏi phỏng vấn (level Middle)`,
      description: desc,
      keywords: topic.keywords,
      canonical: url,
      root: '../',
      ogType: 'article',
      jsonld: faqJsonLd(topic, list, url),
      analyticsUrl,
      googleClientId,
    }),
    body,
  });
}

/* Trang thống kê /stats — khung tĩnh, assets/stats.js nạp số liệu từ Worker */
export function renderStatsPage({ topics, siteUrl, analyticsUrl, googleClientId }) {
  const url = `${siteUrl}stats/`;
  const body = `${header({ root: '../', topics, current: null })}
<main id="main" class="stats-page">
  <div class="wrap stats-wrap">
    ${breadcrumb([{ name: 'Trang chủ', href: '../' }, { name: 'Thống kê' }])}
    <h1 class="topic-h1"><span class="topic-h1-icon" aria-hidden="true">📈</span>Thống kê truy cập</h1>

    <p class="stats-state" data-stats-state hidden></p>

    <div class="stats-tiles" data-stats-tiles hidden>
      <div class="stat-tile"><b data-k="totalViews">—</b><span>Tổng lượt truy cập</span></div>
      <div class="stat-tile"><b data-k="totalVisitors">—</b><span>Khách duy nhất</span></div>
      <div class="stat-tile"><b data-k="returningVisitors">—</b><span>Khách quay lại <em data-k="returningPct"></em></span></div>
      <div class="stat-tile"><b data-k="todayViews">—</b><span>Truy cập hôm nay</span></div>
    </div>

    <section class="stats-section" data-stats-chart-wrap hidden>
      <h2>30 ngày gần nhất</h2>
      <div class="stats-chart" data-stats-chart></div>
      <p class="stats-legend">Cột = lượt truy cập/ngày. Rê chuột để xem số khách.</p>
    </section>

    <section class="stats-section" data-stats-topics-wrap hidden>
      <h2>Lượt truy cập theo chủ đề</h2>
      <div class="stats-bars" data-stats-topics></div>
    </section>

    <p class="stats-meta muted" data-stats-meta hidden></p>
  </div>
</main>
${footer('../')}`;

  return page({
    root: '../',
    scripts: ['assets/stats.js'],
    head: head({
      title: 'Thống kê truy cập — Interview Vault',
      description: 'Số liệu truy cập ẩn danh của Interview Vault: tổng lượt truy cập, khách duy nhất, khách quay lại, 30 ngày gần nhất.',
      canonical: url,
      root: '../',
      robots: 'noindex, follow',
      analyticsUrl,
      googleClientId,
    }),
    body,
  });
}

/* Dữ liệu cho trình luyện tập: nội dung đầy đủ mỗi câu, tải on-demand (luyen-tap/questions.json) */
export function practiceData(questions) {
  return JSON.stringify(
    questions.map((q) => {
      const o = { id: q.id, topic: q.topic, cat: q.cat, q: q.q, body: qaBlocks(q, true).trim() };
      if (q.code) o.code = q.code;
      return o;
    })
  );
}

/* Trang luyện tập /luyen-tap/ — duyệt + lọc + phiên luyện (spaced repetition, client-side) */
export function renderPracticePage({ topics, questions, siteUrl, analyticsUrl, googleClientId }) {
  const url = `${siteUrl}luyen-tap/`;
  const nameOf = new Map(topics.map((t) => [t.id, t.name]));

  const chips = topics
    .map(
      (t) =>
        `<button type="button" class="pr-chip" data-topic="${t.id}"><span aria-hidden="true">${esc(
          t.icon
        )}</span> ${esc(t.name)}</button>`
    )
    .join('');

  const rows = questions
    .map(
      (q, i) => `<tr data-id="${esc(q.id)}" data-topic="${esc(q.topic)}" data-cat="${esc(q.cat)}"${
        q.code ? ' data-code="1"' : ''
      }>
    <td class="pr-n">${i + 1}</td>
    <td class="pr-qcell"><button type="button" class="pr-open" data-id="${esc(q.id)}">${esc(q.q)}</button>${
      q.code ? ` <span class="pr-badge" title="Có bài tập code">&lt;/&gt; ${esc(q.code.lang || 'code')}</span>` : ''
    }
      <span class="pr-meta">${esc(nameOf.get(q.topic) || q.topic)} · ${esc(q.cat)}</span></td>
    <td class="pr-status"><span class="pr-dot" title="Chưa làm"></span></td>
  </tr>`
    )
    .join('\n');

  const body = `${header({ root: '../', topics, current: 'luyen-tap' })}
<main id="main" class="practice-page" data-practice>
  <div class="wrap pr-wrap">
    ${breadcrumb([{ name: 'Trang chủ', href: '../' }, { name: 'Luyện tập' }])}
    <h1 class="topic-h1"><span class="topic-h1-icon" aria-hidden="true">🎯</span>Luyện tập</h1>
    <p class="lede">Chế độ chủ động: hiện câu hỏi, tự nhớ lại, rồi mở đáp án và tự chấm.
      Câu bạn chưa chắc sẽ được lặp lại sớm hơn (spaced repetition). Tiến độ lưu trên trình duyệt.</p>

    <div class="pr-stats" data-pr-stats>
      <div class="pr-stat"><b data-k="learned">0</b><span>đã thuộc</span></div>
      <div class="pr-stat"><b data-k="due">0</b><span>cần ôn</span></div>
      <div class="pr-stat"><b data-k="today">0</b><span>luyện hôm nay</span></div>
      <div class="pr-stat"><b data-k="streak">0</b><span>ngày liên tục</span></div>
    </div>

    <section class="pr-browse" data-pr-browse>
      <div class="pr-filters">
        <div class="pr-chips" role="group" aria-label="Lọc theo chủ đề">
          <button type="button" class="pr-chip is-on" data-topic="">Tất cả</button>
          ${chips}
        </div>
        <div class="pr-filter-row">
          <label class="pr-select"><span class="visually-hidden">Trạng thái</span>
            <select data-pr-filter-status>
              <option value="">Mọi trạng thái</option>
              <option value="new">Chưa làm</option>
              <option value="due">Cần ôn</option>
              <option value="learned">Đã thuộc</option>
              <option value="code">Có bài tập code</option>
            </select>
          </label>
          <label class="pr-select"><span class="visually-hidden">Số câu mỗi phiên</span>
            <select data-pr-count>
              <option value="10">10 câu / phiên</option>
              <option value="20" selected>20 câu / phiên</option>
              <option value="50">50 câu / phiên</option>
              <option value="0">Không giới hạn</option>
            </select>
          </label>
          <input type="search" class="pr-search" placeholder="Tìm câu hỏi…" autocomplete="off" data-pr-search>
          <button type="button" class="pr-start" data-pr-start>Bắt đầu luyện <span class="pr-start-n" data-pr-start-n></span></button>
        </div>
        <p class="pr-count" data-pr-count-label></p>
      </div>

      <div class="pr-table-wrap">
        <table class="pr-table">
          <thead><tr><th class="pr-n">#</th><th>Câu hỏi</th><th class="pr-status">Trạng thái</th></tr></thead>
          <tbody data-pr-rows>
${rows}
          </tbody>
        </table>
        <p class="pr-empty" data-pr-empty hidden>Không có câu hỏi khớp bộ lọc.</p>
      </div>
    </section>

    <section class="pr-player" data-pr-player hidden aria-live="polite">
      <div class="pr-player-bar">
        <span class="pr-player-count">Câu <b data-pr-cur>1</b> / <b data-pr-total>1</b></span>
        <div class="pr-player-dots" data-pr-dots></div>
        <button type="button" class="pr-exit" data-pr-exit>Thoát phiên</button>
      </div>
      <article class="pr-qcard">
        <span class="pr-qcard-topic" data-pr-qtopic></span>
        <h2 class="pr-qcard-q" data-pr-qtext></h2>

        <div class="pr-code" data-pr-code hidden>
          <p class="pr-code-prompt" data-pr-code-prompt></p>
          <details class="pr-code-schema" data-pr-code-schema>
            <summary>Xem schema &amp; dữ liệu mẫu</summary>
            <div class="pr-code-schema-body" data-pr-code-schema-body></div>
          </details>
          <textarea class="pr-editor" data-pr-editor spellcheck="false" autocomplete="off" autocapitalize="off"></textarea>
          <div class="pr-code-actions">
            <button type="button" class="pr-run" data-pr-run>▶ Chạy &amp; chấm</button>
            <button type="button" class="pr-code-reset" data-pr-code-reset>Xoá về mẫu</button>
            <button type="button" class="pr-code-sol" data-pr-code-sol>Xem lời giải</button>
          </div>
          <div class="pr-code-result" data-pr-code-result hidden></div>
        </div>

        <button type="button" class="pr-reveal" data-pr-reveal>Hiện đáp án</button>
        <div class="pr-qcard-body qa-body" data-pr-qbody hidden></div>
        <div class="pr-grade" data-pr-grade hidden>
          <p class="pr-grade-label">Bạn nhớ tới đâu?</p>
          <div class="pr-grade-btns">
            <button type="button" data-g="again"><b>Không nhớ</b><span>ôn lại sớm</span></button>
            <button type="button" data-g="hard"><b>Khó</b><span>~1 ngày</span></button>
            <button type="button" data-g="good"><b>Đã thuộc</b><span>giãn dần</span></button>
          </div>
        </div>
      </article>
      <div class="pr-end" data-pr-end hidden>
        <h2>Xong phiên 🎉</h2>
        <p class="pr-end-summary" data-pr-end-summary></p>
        <div class="pr-end-actions">
          <button type="button" class="pr-start" data-pr-again>Phiên mới</button>
          <button type="button" class="pr-exit" data-pr-end-exit>Về danh sách</button>
        </div>
      </div>
    </section>
  </div>
</main>
${footer('../')}`;

  return page({
    root: '../',
    scripts: [
      'assets/viz/viz-core.js', 'assets/viz/viz-static.js', 'assets/viz/viz-anim.js',
      'assets/sql-run.js', 'assets/practice.js',
    ],
    head: head({
      title: 'Luyện tập câu hỏi phỏng vấn — Interview Vault',
      description:
        'Luyện tập chủ động 700+ câu hỏi phỏng vấn Java/Spring, Kafka, AWS, Redis, SQL, Microservices, Design Patterns theo phương pháp spaced repetition. Lọc theo chủ đề, tự chấm, theo dõi tiến độ.',
      keywords: 'luyện tập phỏng vấn, ôn phỏng vấn backend, flashcard câu hỏi phỏng vấn, spaced repetition java',
      canonical: url,
      root: '../',
      analyticsUrl,
      googleClientId,
    }),
    body,
  });
}

/* Trang chủ */
export function renderHub({ topics, counts, total, siteUrl, analyticsUrl, googleClientId }) {
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
      <p class="hero-lede">Java &amp; Spring Boot, Apache Kafka, AWS, Redis, SQL, Microservices và Design Patterns.
        Mỗi câu gồm ba phần: <strong>trả lời</strong> chi tiết, <strong>bản chất</strong> để nhớ nhanh, và
        <strong>ví dụ thực tế</strong>. Tiếng Việt, giữ nguyên thuật ngữ tiếng Anh.</p>
      <div class="hero-stats">
        <span><b>${total}</b> câu hỏi</span>
        <span><b>${topics.length}</b> chủ đề</span>
        <span><b>3</b> phần / câu</span>
      </div>
      <p class="hero-views" data-views hidden>👁 <b class="js-view-count">—</b> lượt truy cập</p>
    </div>
  </section>
  <section class="wrap topic-grid-section" aria-label="Chủ đề">
    <div class="topic-grid">${cards}</div>
  </section>
  <section class="wrap practice-cta-section">
    <a class="practice-cta" href="luyen-tap/">
      <span class="practice-cta-icon" aria-hidden="true">🎯</span>
      <span class="practice-cta-text">
        <b>Luyện tập chủ động</b>
        <span>Không chỉ đọc — tự nhớ lại, tự chấm, để hệ thống lặp lại câu bạn chưa chắc (spaced repetition).</span>
      </span>
      <span class="practice-cta-go" aria-hidden="true">Vào luyện →</span>
    </a>
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
      title: `Interview Vault — ${total} câu hỏi phỏng vấn Backend & Kiến trúc`,
      description: `Bộ ${total} câu hỏi phỏng vấn cấp độ Middle: Java/Spring Boot, Apache Kafka, AWS, Redis, SQL, Microservices và Design Patterns. Mỗi câu có trả lời chi tiết, phần bản chất để nhớ nhanh và ví dụ thực tế. Nội dung tiếng Việt.`,
      keywords: 'câu hỏi phỏng vấn, phỏng vấn backend, java spring boot, kafka, aws, redis, sql, microservices, design pattern, solid, ôn thi phỏng vấn middle developer',
      canonical: siteUrl,
      root: '',
      jsonld,
      analyticsUrl,
      googleClientId,
    }),
    body,
  });
}

export function renderSitemap({ topics, siteUrl }) {
  const now = new Date().toISOString().slice(0, 10);
  const urls = [
    siteUrl, `${siteUrl}luyen-tap/`, `${siteUrl}bang-xep-hang/`, `${siteUrl}privacy/`,
    ...topics.map((t) => `${siteUrl}${t.id}/`),
  ];
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
