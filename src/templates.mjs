/* Khung trang HTML tĩnh: <head> đầy đủ SEO, header điều hướng, footer */
import { esc } from './format.mjs';

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8E%AF%3C/text%3E%3C/svg%3E";

/* head: {title, description, canonical, root, jsonld, keywords, ogType, robots, analyticsUrl} */
export function head(o) {
  const t = esc(o.title);
  const d = esc(o.description);
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
${o.keywords ? `<meta name="keywords" content="${esc(o.keywords)}">` : ''}
<link rel="canonical" href="${esc(o.canonical)}">
<meta name="robots" content="${esc(o.robots || 'index, follow, max-image-preview:large, max-snippet:-1')}">
<meta property="og:site_name" content="Interview Vault">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:url" content="${esc(o.canonical)}">
<meta property="og:locale" content="vi_VN">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,600&display=swap">
<link rel="stylesheet" href="${o.root}assets/styles.css">
<link rel="sitemap" type="application/xml" href="${o.root}sitemap.xml">
<script>(function(){try{var t=localStorage.getItem('iv-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}})();</script>
<script>window.IV_ROOT=${JSON.stringify(o.root || '')};</script>
${o.analyticsUrl ? `<script>window.IV_ANALYTICS=${JSON.stringify(o.analyticsUrl)};</script>` : ''}
${o.googleClientId ? `<script>window.IV_GOOGLE_CLIENT_ID=${JSON.stringify(o.googleClientId)};</script>` : ''}
${o.jsonld ? `<script type="application/ld+json">${o.jsonld}</script>` : ''}`;
}

/* header: {root, topics, current} */
export function header(o) {
  const links = o.topics
    .map(
      (t) =>
        `<a class="topnav-link${t.id === o.current ? ' is-current' : ''}" href="${o.root}${t.id}/"${
          t.id === o.current ? ' aria-current="page"' : ''
        }><span aria-hidden="true">${t.icon}</span> ${esc(t.name)}</a>`
    )
    .join('');
  return `<a class="skip-link" href="#main">Bỏ qua tới nội dung</a>
<header class="site-header">
  <div class="wrap site-header-inner">
    <a class="brand" href="${o.root}"><span class="brand-mark" aria-hidden="true">🎯</span> Interview Vault</a>
    <nav class="topnav" aria-label="Chủ đề">${links}</nav>
    <a class="topnav-cta${o.current === 'luyen-tap' ? ' is-current' : ''}" href="${o.root}luyen-tap/">🎯 Luyện tập</a>
    <div class="topnav-acct" data-acct hidden></div>
  </div>
</header>`;
}

export function breadcrumb(items) {
  const parts = items
    .map((it, i) =>
      it.href && i < items.length - 1
        ? `<a href="${esc(it.href)}">${esc(it.name)}</a>`
        : `<span aria-current="page">${esc(it.name)}</span>`
    )
    .join('<span class="sep" aria-hidden="true">/</span>');
  return `<nav class="breadcrumb" aria-label="Đường dẫn">${parts}</nav>`;
}

export function footer(root) {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
  <div class="wrap">
    <p class="footer-views" data-views hidden>👁 <b class="js-view-count">—</b> lượt truy cập</p>
    <p>Interview Vault — bộ câu hỏi phỏng vấn cấp độ Middle. Nội dung tiếng Việt, giữ nguyên thuật ngữ tiếng Anh.</p>
    <p class="muted">Cập nhật ${year}. Trang tĩnh, hoạt động không cần JavaScript.</p>
    <p><a href="${root}">Trang chủ</a> · <a href="${root}luyen-tap/">Luyện tập</a> · <a href="${root}bang-xep-hang/">Bảng xếp hạng</a> · <a href="${root}tai-khoan/">Tài khoản</a> · <a href="${root}stats/">Thống kê</a> · <a href="${root}privacy/">Bảo mật</a> · <a href="${root}sitemap.xml">Sitemap</a></p>
  </div>
</footer>`;
}

/* Lắp trang hoàn chỉnh — root là tiền tố tương đối ("" cho trang chủ, "../" cho trang chủ đề) */
export function page({ head: h, body, root = '', scripts = [] }) {
  const s = ['assets/enhance.js', 'assets/auth.js', ...scripts]
    .map((src) => `<script src="${root}${src}" defer></script>`)
    .join('\n');
  return `<!doctype html>
<html lang="vi">
<head>
${h}
</head>
<body>
${body}
${s}
</body>
</html>
`;
}
