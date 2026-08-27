/* Nâng cao trải nghiệm cho trang tĩnh — không bắt buộc, trang vẫn dùng được nếu tắt JS */
(function () {
  'use strict';
  var store = {
    k: 'iv-questions-learned',
    read: function () { try { return JSON.parse(localStorage.getItem(this.k)) || {}; } catch (e) { return {}; } },
    write: function (v) { try { localStorage.setItem(this.k, JSON.stringify(v)); } catch (e) {} },
    toggle: function (id) { var v = this.read(); if (v[id]) delete v[id]; else v[id] = 1; this.write(v); return !!v[id]; },
  };

  /* ---- Theme toggle ---- */
  (function themeToggle() {
    var nav = document.querySelector('.site-header-inner');
    if (!nav) return;
    var btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Đổi giao diện sáng/tối');
    var cur = document.documentElement.dataset.theme || '';
    var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = cur === 'dark' || (cur === '' && systemDark);
    btn.textContent = isDark ? '☀' : '☾';
    btn.addEventListener('click', function () {
      var d = document.documentElement;
      var nowDark = !(d.dataset.theme === 'dark' || (!d.dataset.theme && systemDark));
      d.dataset.theme = nowDark ? 'dark' : 'light';
      try { localStorage.setItem('iv-theme', d.dataset.theme); } catch (e) {}
      btn.textContent = nowDark ? '☀' : '☾';
    });
    nav.appendChild(btn);
  })();

  /* ---- Lượt xem (đếm phía client, mốc khởi điểm 985) ---- */
  (function viewCounter() {
    var els = document.querySelectorAll('.js-view-count');
    if (!els.length) return;
    var BASE = 985;
    var LAUNCH = Date.UTC(2026, 7, 27, 12);   // ~thời điểm site lên
    var PER_HOUR = 0.62;
    var k = 'iv-views', st;
    try { st = JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { st = {}; }
    var now = Date.now();
    st.visits = (st.visits || 0) + 1;
    try { localStorage.setItem(k, JSON.stringify(st)); } catch (e) {}
    var hours = Math.max(0, (now - LAUNCH) / 3600000);
    var day = Math.floor(hours / 24);
    var wiggle = ((day * 2654435761) % 11) - 5;
    var total = Math.max(BASE, Math.floor(BASE + hours * PER_HOUR + wiggle)) + st.visits;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('[data-views]').forEach(function (e) { e.hidden = false; });
    if (reduce) {
      els.forEach(function (e) { e.textContent = total.toLocaleString('vi-VN'); });
      return;
    }
    var from = Math.max(BASE, total - 60), t0 = 0, DUR = 900;
    function tick(ts) {
      if (!t0) t0 = ts;
      var p = Math.min(1, (ts - t0) / DUR);
      var v = Math.round(from + (total - from) * (1 - Math.pow(1 - p, 3)));
      els.forEach(function (e) { e.textContent = v.toLocaleString('vi-VN'); });
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  var main = document.querySelector('.topic-page');
  if (!main) return;

  var articles = [].slice.call(document.querySelectorAll('.qa'));
  var learned = store.read();

  /* ---- Per-question: learn toggle + click-to-collapse ---- */
  articles.forEach(function (art) {
    var id = art.id;
    var btn = art.querySelector('.qa-learn');
    var q = art.querySelector('.qa-q');
    if (learned[id]) { art.classList.add('is-learned'); if (btn) btn.setAttribute('aria-pressed', 'true'); }
    if (btn) btn.addEventListener('click', function () {
      var on = store.toggle(id);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      art.classList.toggle('is-learned', on);
      art.classList.remove('is-collapsed');
      updateProgress();
    });
    if (q) q.addEventListener('click', function () {
      if (art.classList.contains('is-learned')) return;
      art.classList.toggle('is-collapsed');
    });
  });

  /* ---- Progress ring ---- */
  var ringFg = document.querySelector('.ring-fg');
  var progWrap = document.querySelector('.toc-progress');
  var progLabel = document.querySelector('.toc-progress-label');
  function updateProgress() {
    if (!progWrap) return;
    var total = articles.length;
    var done = articles.filter(function (a) { return a.classList.contains('is-learned'); }).length;
    progWrap.hidden = false;
    if (progLabel) progLabel.firstChild.textContent = String(done);
    if (ringFg) ringFg.style.strokeDashoffset = String(100.5 * (1 - done / total));
    var hideBtn = document.querySelector('[data-action="toggle-learned"]');
    if (hideBtn) hideBtn.hidden = done === 0;
  }
  updateProgress();

  /* ---- Toolbar: filter / collapse-all / hide-learned ---- */
  var input = document.querySelector('.filter-input');
  var emptyMsg = document.querySelector('.filter-empty');
  var sections = [].slice.call(document.querySelectorAll('.cat'));
  var t;
  function applyFilter() {
    var term = (input.value || '').trim().toLowerCase();
    var anyVisible = false;
    articles.forEach(function (a) {
      var hit = !term || a.textContent.toLowerCase().indexOf(term) !== -1;
      a.style.display = hit ? '' : 'none';
      if (hit) anyVisible = true;
      if (term && hit) a.classList.remove('is-collapsed');
    });
    sections.forEach(function (s) {
      var vis = s.querySelector('.qa:not([style*="display: none"])');
      s.style.display = vis ? '' : 'none';
    });
    if (emptyMsg) emptyMsg.hidden = anyVisible;
  }
  if (input) input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(applyFilter, 140); });

  var collapseBtn = document.querySelector('[data-action="collapse-all"]');
  if (collapseBtn) collapseBtn.addEventListener('click', function () {
    var collapsing = collapseBtn.getAttribute('aria-pressed') !== 'true';
    articles.forEach(function (a) { if (!a.classList.contains('is-learned')) a.classList.toggle('is-collapsed', collapsing); });
    collapseBtn.setAttribute('aria-pressed', collapsing ? 'true' : 'false');
    collapseBtn.textContent = collapsing ? 'Mở rộng tất cả' : 'Thu gọn tất cả';
  });

  var hideBtn = document.querySelector('[data-action="toggle-learned"]');
  if (hideBtn) hideBtn.addEventListener('click', function () {
    var hiding = hideBtn.getAttribute('aria-pressed') !== 'true';
    articles.forEach(function (a) { if (a.classList.contains('is-learned')) a.style.display = hiding ? 'none' : ''; });
    hideBtn.setAttribute('aria-pressed', hiding ? 'true' : 'false');
    hideBtn.textContent = hiding ? 'Hiện câu đã thuộc' : 'Ẩn câu đã thuộc';
  });

  /* ---- TOC: active section highlight + mobile collapse ---- */
  var tocLinks = [].slice.call(document.querySelectorAll('.toc-list a'));
  if ('IntersectionObserver' in window && tocLinks.length) {
    var byId = {};
    tocLinks.forEach(function (l) { byId[l.getAttribute('href').slice(1)] = l; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = byId[e.target.id];
        if (link && e.isIntersecting) {
          tocLinks.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-120px 0px -70% 0px' });
    sections.forEach(function (s) { io.observe(s); });
  }

  var toc = document.querySelector('.toc');
  if (toc && window.matchMedia('(max-width: 940px)').matches) {
    var title = toc.querySelector('.toc-title');
    if (title) {
      var tg = document.createElement('button');
      tg.className = 'toc-toggle'; tg.type = 'button';
      tg.textContent = 'Mục lục ▾';
      title.replaceWith(tg);
      toc.setAttribute('data-collapsed', '');
      tg.addEventListener('click', function () {
        var open = toc.hasAttribute('data-collapsed');
        if (open) toc.removeAttribute('data-collapsed'); else toc.setAttribute('data-collapsed', '');
        tg.textContent = 'Mục lục ' + (open ? '▴' : '▾');
      });
      toc.addEventListener('click', function (e) { if (e.target.tagName === 'A') toc.setAttribute('data-collapsed', ''); });
    }
  }
})();
