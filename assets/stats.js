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
    set(tiles, 'totalIps', fmt(d.totalIps));
    set(tiles, 'todayViews', fmt(d.today && d.today.views));
    set(tiles, 'todayIps', fmt(d.today && d.today.ips));

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
          ' khách (' + fmt(x.returningVisitors) + ' quay lại) · ' + fmt(x.ips) + ' IP';
        col.appendChild(document.createElement('span')).className = 'stats-col-bar';
        chart.appendChild(col);
      });
    }

    bars('[data-stats-topics-wrap]', '[data-stats-topics]', d.topTopics, function (x) {
      return { label: NAMES[x.topic] || x.topic, value: x.views };
    });

    bars('[data-stats-countries-wrap]', '[data-stats-countries]', d.topCountries, function (x) {
      return {
        label: countryName(x.country),
        value: x.views,
        title: fmt(x.ips) + ' IP duy nhất · ' + fmt(x.views) + ' lượt truy cập',
      };
    });

    renderIps(d);

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

  /* Dãy thanh ngang dùng chung cho "theo chủ đề" và "theo quốc gia" */
  function bars(wrapSel, hostSel, list, toRow) {
    list = list || [];
    if (!list.length) return;
    $(wrapSel).hidden = false;
    var max = Math.max(1, toRow(list[0]).value);
    var host = $(hostSel);
    host.innerHTML = '';
    list.forEach(function (x) {
      var r = toRow(x);
      var row = document.createElement('div');
      row.className = 'stats-bar-row';
      if (r.title) row.title = r.title;
      var label = document.createElement('span');
      label.className = 'stats-bar-label';
      label.textContent = r.label;
      var track = document.createElement('span');
      track.className = 'stats-bar-track';
      var fill = document.createElement('span');
      fill.className = 'stats-bar-fill';
      fill.style.width = Math.max(3, Math.round((r.value / max) * 100)) + '%';
      track.appendChild(fill);
      var val = document.createElement('span');
      val.className = 'stats-bar-val';
      val.textContent = fmt(r.value);
      row.append(label, track, val);
      host.appendChild(row);
    });
  }

  /* ---- Bảng địa chỉ IP ---- */
  var ipData = [];
  var ipSort = 'views';

  function renderIps(d) {
    ipData = d.topIps || [];
    if (!ipData.length) return;
    $('[data-stats-ips-wrap]').hidden = false;

    var note = $('[data-stats-ip-note]');
    if (note) {
      note.textContent = 'Hiển thị ' + fmt(ipData.length) + ' IP nhiều lượt nhất trong tổng số ' +
        fmt(d.totalIps) + ' IP đã ghi nhận. Một lượt = một phiên. Bấm "Lượt" hoặc "Gần nhất" để đổi cách sắp xếp.';
    }
    paintIps();
  }

  function paintIps() {
    var rows = ipData.slice().sort(function (a, b) {
      return ipSort === 'lastSeen'
        ? (b.lastSeen || 0) - (a.lastSeen || 0)
        : (b.views - a.views) || ((b.lastSeen || 0) - (a.lastSeen || 0));
    });
    var host = $('[data-stats-ips]');
    host.innerHTML = '';
    rows.forEach(function (x, i) {
      var tr = document.createElement('tr');
      tr.appendChild(cell(String(i + 1), 'num'));
      tr.appendChild(cell(x.ip, 'stats-ip'));
      tr.appendChild(cell(place(x)));
      tr.appendChild(cell(fmt(x.views), 'num'));
      tr.appendChild(cell(x.firstDay || '—'));
      tr.appendChild(cell(ago(x.lastSeen), 'num'));
      host.appendChild(tr);
    });
  }

  // textContent (không phải innerHTML): IP/thành phố đến từ header request,
  // không được phép chèn HTML vào trang.
  function cell(text, cls) {
    var td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text;
    return td;
  }

  var regionNames = null;
  try { regionNames = new Intl.DisplayNames(['vi'], { type: 'region' }); } catch (e) {}

  function countryName(code) {
    if (!code || code === '??') return 'Không rõ';
    if (code === 'T1') return 'Tor';           // mã riêng của Cloudflare
    try { return regionNames ? regionNames.of(code) : code; } catch (e) { return code; }
  }

  function place(x) {
    if (x.city && x.country) return x.city + ', ' + countryName(x.country);
    return x.city || countryName(x.country);
  }

  function ago(ts) {
    if (!ts) return '—';
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 60) return s + ' giây trước';
    var m = Math.round(s / 60);
    if (m < 60) return m + ' phút trước';
    var h = Math.round(m / 60);
    if (h < 24) return h + ' giờ trước';
    var dd = Math.round(h / 24);
    if (dd < 30) return dd + ' ngày trước';
    return new Date(ts).toLocaleDateString('vi-VN');
  }

  root.querySelectorAll('.stats-sort').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ipSort = btn.getAttribute('data-sort');
      root.querySelectorAll('.stats-sort').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      paintIps();
    });
  });
})();
