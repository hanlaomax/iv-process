/* Trang /luyen-tap/ — duyệt câu hỏi, lọc, và phiên luyện chủ động
   (active recall + spaced repetition), toàn bộ client-side, tiến độ ở localStorage. */
(function () {
  'use strict';
  var page = document.querySelector('.practice-page');
  if (!page) return;

  var $ = function (s, r) { return (r || page).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || page).querySelectorAll(s)); };

  /* ---------- lưu trữ ---------- */
  var K_LEARNED = 'iv-questions-learned', K_SRS = 'iv-srs', K_LOG = 'iv-practice-log';
  var read = function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  var write = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  var learned = read(K_LEARNED, {});
  var srs = read(K_SRS, {});   // id -> { due, interval, reps, ease }
  var log = read(K_LOG, {});   // 'YYYY-MM-DD' -> số câu
  var DAY = 86400000, today = new Date().toISOString().slice(0, 10);

  function bucket(id) {
    if (learned[id]) return 'learned';
    var e = srs[id];
    if (!e) return 'new';
    return e.due <= Date.now() ? 'due' : 'learned';
  }

  function grade(id, g) {
    var e = srs[id] || { interval: 0, reps: 0, ease: 2.5 };
    if (g === 'again') {
      e.reps = 0; e.interval = 0; e.ease = Math.max(1.3, e.ease - 0.2);
      e.due = Date.now() + 600000;
      delete learned[id];
    } else if (g === 'hard') {
      e.reps = (e.reps || 0) + 1;
      e.interval = Math.max(1, (e.interval || 1) * 1.2);
      e.ease = Math.max(1.3, e.ease - 0.05);
      e.due = Date.now() + e.interval * DAY;
      delete learned[id];
    } else {
      e.reps = (e.reps || 0) + 1;
      e.interval = e.reps <= 1 ? 1 : e.reps === 2 ? 3 : Math.round((e.interval || 3) * e.ease);
      e.due = Date.now() + e.interval * DAY;
      learned[id] = 1;
    }
    srs[id] = e;
    write(K_SRS, srs); write(K_LEARNED, learned);
  }

  function logToday() { log[today] = (log[today] || 0) + 1; write(K_LOG, log); }
  function streak() {
    var n = 0, d = new Date();
    if (!log[today]) d.setDate(d.getDate() - 1);
    while (log[d.toISOString().slice(0, 10)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------- header số liệu ---------- */
  function paintStats() {
    var box = $('[data-pr-stats]'), now = Date.now(), due = 0;
    for (var id in srs) if (!learned[id] && srs[id].due <= now) due++;
    set(box, 'learned', Object.keys(learned).length);
    set(box, 'due', due);
    set(box, 'today', log[today] || 0);
    set(box, 'streak', streak());
  }
  function set(box, k, v) { var el = box.querySelector('[data-k="' + k + '"]'); if (el) el.textContent = v; }

  /* ---------- bảng duyệt ---------- */
  var rows = $$('[data-pr-rows] tr');
  var curTopic = '', curStatus = '', curSearch = '';

  function paintDots() {
    rows.forEach(function (tr) {
      var s = bucket(tr.getAttribute('data-id')), dot = tr.querySelector('.pr-dot');
      dot.className = 'pr-dot is-' + s;
      dot.title = s === 'learned' ? 'Đã thuộc' : s === 'due' ? 'Cần ôn' : 'Chưa làm';
    });
  }

  function cap() { return parseInt($('[data-pr-count]').value, 10) || 0; }

  function applyFilter() {
    var q = curSearch.trim().toLowerCase(), shown = 0;
    rows.forEach(function (tr) {
      var okStatus = !curStatus ||
        (curStatus === 'code' ? tr.dataset.code === '1' : bucket(tr.getAttribute('data-id')) === curStatus);
      var vis =
        (!curTopic || tr.getAttribute('data-topic') === curTopic) &&
        okStatus &&
        (!q || tr.textContent.toLowerCase().indexOf(q) !== -1);
      tr.hidden = !vis;
      if (vis) shown++;
    });
    $('[data-pr-empty]').hidden = shown > 0;
    $('[data-pr-count-label]').textContent = shown + ' câu khớp bộ lọc';
    var c = cap();
    $('[data-pr-start-n]').textContent = shown ? '(' + (c ? Math.min(shown, c) : shown) + ')' : '';
    $('[data-pr-start]').disabled = shown === 0;
  }

  $$('.pr-chip').forEach(function (c) {
    c.addEventListener('click', function () {
      $$('.pr-chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
      curTopic = c.getAttribute('data-topic');
      applyFilter();
    });
  });
  $('[data-pr-filter-status]').addEventListener('change', function () { curStatus = this.value; applyFilter(); });
  $('[data-pr-count]').addEventListener('change', applyFilter);
  var st;
  $('[data-pr-search]').addEventListener('input', function () {
    var v = this.value; clearTimeout(st);
    st = setTimeout(function () { curSearch = v; applyFilter(); }, 130);
  });

  var params = new URLSearchParams(location.search);
  var wantTopic = params.get('topic');
  if (wantTopic) { var chip = $('.pr-chip[data-topic="' + wantTopic + '"]'); if (chip) chip.click(); }

  /* ---------- nội dung câu hỏi (tải on-demand) ---------- */
  var DATA = null;
  function loadData() {
    if (DATA) return Promise.resolve();
    return fetch('questions.json').then(function (r) {
      if (!r.ok) throw 0;
      return r.json();
    }).then(function (arr) {
      DATA = {};
      arr.forEach(function (it) { DATA[it.id] = it; });
    });
  }

  /* ---------- trình luyện ---------- */
  var browseEl = $('[data-pr-browse]'), playerEl = $('[data-pr-player]'), qcard = $('.pr-qcard');
  var queue = [], qi = 0, results = { again: 0, hard: 0, good: 0 };
  var NAMES = {
    java: 'Java / Spring Boot', kafka: 'Apache Kafka', aws: 'AWS', redis: 'Redis', sql: 'SQL',
    microservices: 'Microservices', 'design-patterns': 'Design Patterns',
  };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function buildQueue() {
    var due = [], fresh = [], later = [];
    rows.forEach(function (tr) {
      if (tr.hidden) return;
      var id = tr.getAttribute('data-id'), b = bucket(id);
      (b === 'due' ? due : b === 'new' ? fresh : later).push(id);
    });
    var all = shuffle(due).concat(shuffle(fresh), shuffle(later));
    var c = cap();
    return c ? all.slice(0, c) : all;
  }

  function enterPlayer(ids) {
    if (!ids.length) return;
    var startBtn = $('[data-pr-start]');
    startBtn.disabled = true; startBtn.textContent = 'Đang tải…';
    loadData().then(function () {
      queue = ids; qi = 0; results = { again: 0, hard: 0, good: 0 };
      browseEl.hidden = true; playerEl.hidden = false;
      $('[data-pr-end]').hidden = true; qcard.hidden = false;
      $('[data-pr-total]').textContent = queue.length;
      var dots = $('[data-pr-dots]'); dots.innerHTML = '';
      queue.forEach(function () { dots.appendChild(document.createElement('span')).className = 'pr-pdot'; });
      showCard();
      window.scrollTo(0, 0);
    }).catch(function () {
      startBtn.textContent = 'Lỗi tải — thử lại';
    }).then(function () {
      startBtn.disabled = false;
      if (startBtn.textContent === 'Đang tải…') startBtn.textContent = 'Bắt đầu luyện';
    });
  }

  var curCode = null;

  function showCard() {
    var it = DATA[queue[qi]];
    $('[data-pr-cur]').textContent = qi + 1;
    $('[data-pr-qtopic]').textContent = (NAMES[it.topic] || it.topic) + ' · ' + it.cat;
    $('[data-pr-qtext]').textContent = it.q;
    var b = $('[data-pr-qbody]');
    b.innerHTML = it.body; b.hidden = true;
    $('[data-pr-grade]').hidden = true;
    var rev = $('[data-pr-reveal]'); rev.hidden = false;

    var panel = $('[data-pr-code]');
    curCode = it.code && it.code.lang === 'sql' && window.IVSql ? it.code : null;
    if (curCode) {
      panel.hidden = false;
      $('[data-pr-code-prompt]').textContent = curCode.prompt;
      $('[data-pr-editor]').value = curCode.starter || 'SELECT ';
      var res = $('[data-pr-code-result]'); res.hidden = true; res.innerHTML = '';
      var sc = $('[data-pr-code-schema]'); sc.open = false; sc.dataset.loaded = '';
      $('[data-pr-code-schema-body]').innerHTML = '';
      rev.textContent = 'Xem giải thích khái niệm';
    } else {
      panel.hidden = true;
      rev.textContent = 'Hiện đáp án';
    }
  }

  $('[data-pr-reveal]').addEventListener('click', function () {
    var b = $('[data-pr-qbody]');
    b.hidden = false; this.hidden = true;
    if (!curCode) $('[data-pr-grade]').hidden = false;
    if (window.IVViz && window.IVViz.mount) {
      $$('figure.viz[data-viz]', b).forEach(window.IVViz.mount);
    }
  });

  function advance(g) {
    grade(queue[qi], g); results[g === 'good' ? 'good' : g === 'hard' ? 'hard' : 'again']++; logToday();
    var dot = $('[data-pr-dots]').children[qi];
    if (dot) dot.className = 'pr-pdot is-' + (g === 'again' ? 'again' : g === 'hard' ? 'hard' : 'good');
    qi++;
    if (qi >= queue.length) endSession();
    else showCard();
    window.scrollTo(0, 0);
  }

  $$('[data-pr-grade] [data-g]').forEach(function (btn) {
    btn.addEventListener('click', function () { advance(btn.getAttribute('data-g')); });
  });

  /* ---------- bài tập code (SQL, sql.js) ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function resultTable(rs) {
    if (!rs || !rs.rows || !rs.rows.length) return '<p class="pr-rt-empty">(không có hàng)</p>';
    var head = (rs.columns || []).map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('');
    var body = rs.rows.slice(0, 8).map(function (row) {
      return '<tr>' + row.map(function (v) {
        return '<td>' + (v === null ? '<i>NULL</i>' : esc(v)) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    var more = rs.rows.length > 8 ? '<p class="pr-rt-more">… và ' + (rs.rows.length - 8) + ' hàng nữa</p>' : '';
    return '<div class="pr-rt-wrap"><table class="pr-rt"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + more;
  }

  function runCode() {
    if (!curCode) return;
    var query = $('[data-pr-editor]').value.trim();
    var r = $('[data-pr-code-result]');
    r.hidden = false;
    r.innerHTML = '<p class="pr-running">Đang chạy…</p>';
    window.IVSql.grade(curCode, query).then(function (res) {
      if (res.ok) {
        r.innerHTML = '<p class="pr-verdict pr-ok">✓ Accepted — đúng trên mọi bộ dữ liệu.</p>' +
          '<button type="button" class="pr-start" data-pr-code-next>Câu tiếp →</button>';
        r.querySelector('[data-pr-code-next]').addEventListener('click', function () { advance('good'); });
        return;
      }
      var bad = null, idx = 0;
      for (var i = 0; i < res.cases.length; i++) if (!res.cases[i].pass) { bad = res.cases[i]; idx = i; break; }
      var h = '<p class="pr-verdict pr-wrong">✗ Chưa đúng' +
        (res.cases.length > 1 ? ' — sai ở bộ dữ liệu ' + (idx + 1) : '') + '</p>';
      if (bad.error) h += '<pre class="pr-err">' + esc(bad.error) + '</pre>';
      else h += '<div class="pr-diff"><div><b>Mong đợi</b>' + resultTable(bad.expected) +
        '</div><div><b>Kết quả của bạn</b>' + resultTable(bad.got) + '</div></div>';
      r.innerHTML = h;
    }).catch(function (e) {
      r.innerHTML = '<p class="pr-verdict pr-wrong">Lỗi: ' + esc(e && e.message || e) + '</p>';
    });
  }

  $('[data-pr-run]').addEventListener('click', runCode);
  $('[data-pr-code-reset]').addEventListener('click', function () {
    if (curCode) $('[data-pr-editor]').value = curCode.starter || 'SELECT ';
  });
  $('[data-pr-code-sol]').addEventListener('click', function () {
    if (!curCode) return;
    var r = $('[data-pr-code-result]');
    r.hidden = false;
    r.innerHTML = '<div class="pr-sol"><b>Lời giải mẫu</b><pre></pre></div>';
    r.querySelector('pre').textContent = curCode.solution;
    $('[data-pr-grade]').hidden = false;
  });
  $('[data-pr-editor]').addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      var s = this.selectionStart, en = this.selectionEnd;
      this.value = this.value.slice(0, s) + '  ' + this.value.slice(en);
      this.selectionStart = this.selectionEnd = s + 2;
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault(); runCode();
    }
  });
  $('[data-pr-code-schema]').addEventListener('toggle', function () {
    var d = this;
    if (!d.open || d.dataset.loaded || !curCode) return;
    d.dataset.loaded = '1';
    var host = $('[data-pr-code-schema-body]');
    host.innerHTML = '<pre class="pr-schema-ddl">' + esc(curCode.tables) + '</pre><p class="pr-running">Đang nạp dữ liệu mẫu…</p>';
    window.IVSql.preview(curCode).then(function (tables) {
      var h = '<pre class="pr-schema-ddl">' + esc(curCode.tables) + '</pre>';
      tables.forEach(function (t) {
        h += '<p class="pr-schema-tname">' + esc(t.table) + ' — dữ liệu mẫu (bộ 1)</p>' +
          resultTable({ columns: t.columns, rows: t.rows });
      });
      host.innerHTML = h;
    }).catch(function () {
      host.innerHTML = '<pre class="pr-schema-ddl">' + esc(curCode.tables) + '</pre>';
    });
  });

  function endSession() {
    qcard.hidden = true;
    $('[data-pr-end]').hidden = false;
    $('[data-pr-end-summary]').textContent =
      queue.length + ' câu · ' + results.good + ' đã thuộc · ' + results.hard + ' khó · ' + results.again + ' cần ôn lại';
    paintDots(); paintStats();
  }

  function exitToBrowse() {
    playerEl.hidden = true; browseEl.hidden = false;
    qcard.hidden = false; $('[data-pr-end]').hidden = true;
    paintDots(); paintStats(); applyFilter();
    window.scrollTo(0, 0);
  }

  $('[data-pr-start]').addEventListener('click', function () { enterPlayer(buildQueue()); });
  $('[data-pr-again]').addEventListener('click', function () { enterPlayer(buildQueue()); });
  $('[data-pr-exit]').addEventListener('click', exitToBrowse);
  $('[data-pr-end-exit]').addEventListener('click', exitToBrowse);

  $$('.pr-open').forEach(function (btn) {
    btn.addEventListener('click', function () { enterPlayer([btn.getAttribute('data-id')]); });
  });

  document.addEventListener('keydown', function (e) {
    if (playerEl.hidden || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.code === 'Space' && !$('[data-pr-reveal]').hidden) { e.preventDefault(); $('[data-pr-reveal]').click(); }
    else if (!$('[data-pr-grade]').hidden) {
      var m = { Digit1: 'again', Digit2: 'hard', Digit3: 'good' }[e.code];
      if (m) { e.preventDefault(); $('[data-pr-grade] [data-g="' + m + '"]').click(); }
    }
  });

  /* ---------- init ---------- */
  paintStats(); paintDots(); applyFilter();
  if (params.get('start') === '1') $('[data-pr-start]').click();
})();
