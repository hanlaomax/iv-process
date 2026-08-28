/* Trang /stats — nạp số liệu từ Worker và vẽ (không thư viện ngoài) */
(function () {
  'use strict';
  var root = document.querySelector('.stats-page');
  if (!root) return;

  var $ = function (s) { return root.querySelector(s); };
  var stateEl = $('[data-stats-state]');
  var base = window.IV_ANALYTICS;

  if (!base) {
    show('Thống kê chưa được cấu hình. Đặt repo variable ANALYTICS_URL (URL của Cloudflare Worker) rồi build lại.');
    return;
  }
  base = base.replace(/\/+$/, '');
  show('Đang tải số liệu…');

  var cached = null;
  try { cached = JSON.parse(sessionStorage.getItem('iv-stats') || 'null'); } catch (e) {}
  if (cached && Date.now() - cached._t < 300000) render(cached);

  fetch(base + '/stats', { credentials: 'omit', mode: 'cors' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (d) {
      d._t = Date.now();
      try { sessionStorage.setItem('iv-stats', JSON.stringify(d)); } catch (e) {}
      render(d);
    })
    .catch(function () { if (!cached) show('Không tải được thống kê. Thử lại sau.'); });

  function show(msg) { stateEl.textContent = msg; stateEl.hidden = false; }
  function fmt(n) { return Number(n || 0).toLocaleString('vi-VN'); }

  var NAMES = {
    java: 'Java / Spring Boot', kafka: 'Apache Kafka', aws: 'AWS', redis: 'Redis', sql: 'SQL',
    microservices: 'Microservices', 'design-patterns': 'Design Patterns',
    hub: 'Trang chủ', stats: 'Trang thống kê', 'luyen-tap': 'Luyện tập',
    'tai-khoan': 'Tài khoản', 'bang-xep-hang': 'Bảng xếp hạng', privacy: 'Bảo mật', other: 'Khác',
  };

  function render(d) {
    stateEl.hidden = true;

    var tiles = $('[data-stats-tiles]');
    tiles.hidden = false;
    set(tiles, 'totalViews', fmt(d.totalViews));
    set(tiles, 'totalVisitors', fmt(d.totalVisitors));
    set(tiles, 'returningVisitors', fmt(d.returningVisitors));
    var pct = d.totalVisitors ? Math.round((d.returningVisitors / d.totalVisitors) * 100) : 0;
    set(tiles, 'returningPct', pct ? '(' + pct + '%)' : '');
    set(tiles, 'todayViews', fmt(d.today && d.today.views));

    var days = d.last30Days || [];
    if (days.length) {
      $('[data-stats-chart-wrap]').hidden = false;
      var max = Math.max(1, Math.max.apply(null, days.map(function (x) { return x.views; })));
      var chart = $('[data-stats-chart]');
      chart.innerHTML = '';
      days.forEach(function (x) {
        var col = document.createElement('div');
        col.className = 'stats-col';
        col.style.setProperty('--h', Math.max(2, Math.round((x.views / max) * 100)) + '%');
        col.title = x.day + ' · ' + fmt(x.views) + ' lượt truy cập · ' + fmt(x.visitors) +
          ' khách (' + fmt(x.returningVisitors) + ' quay lại)';
        col.appendChild(document.createElement('span')).className = 'stats-col-bar';
        chart.appendChild(col);
      });
    }

    var topics = d.topTopics || [];
    if (topics.length) {
      $('[data-stats-topics-wrap]').hidden = false;
      var tmax = Math.max(1, topics[0].views);
      var host = $('[data-stats-topics]');
      host.innerHTML = '';
      topics.forEach(function (x) {
        var row = document.createElement('div');
        row.className = 'stats-bar-row';
        var label = document.createElement('span');
        label.className = 'stats-bar-label';
        label.textContent = NAMES[x.topic] || x.topic;
        var track = document.createElement('span');
        track.className = 'stats-bar-track';
        var fill = document.createElement('span');
        fill.className = 'stats-bar-fill';
        fill.style.width = Math.max(3, Math.round((x.views / tmax) * 100)) + '%';
        track.appendChild(fill);
        var val = document.createElement('span');
        val.className = 'stats-bar-val';
        val.textContent = fmt(x.views);
        row.append(label, track, val);
        host.appendChild(row);
      });
    }

    var meta = $('[data-stats-meta]');
    meta.hidden = false;
    meta.textContent = 'Cập nhật lúc ' + new Date(d.generatedAt).toLocaleString('vi-VN') +
      ' · bộ nhớ đệm ~5 phút · một lượt = một phiên (30 phút không hoạt động thì tính phiên mới) ·' +
      ' "khách quay lại" = trình duyệt đã ghé từ một ngày trước.';
  }

  function set(scope, k, v) {
    var el = scope.querySelector('[data-k="' + k + '"]');
    if (el) el.textContent = v;
  }
})();
