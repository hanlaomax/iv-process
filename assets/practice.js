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
      var vis =
        (!curTopic || tr.getAttribute('data-topic') === curTopic) &&
        (!curStatus || bucket(tr.getAttribute('data-id')) === curStatus) &&
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

  function showCard() {
    var it = DATA[queue[qi]];
    $('[data-pr-cur]').textContent = qi + 1;
    $('[data-pr-qtopic]').textContent = (NAMES[it.topic] || it.topic) + ' · ' + it.cat;
    $('[data-pr-qtext]').textContent = it.q;
    var b = $('[data-pr-qbody]');
    b.innerHTML = it.body; b.hidden = true;
    $('[data-pr-grade]').hidden = true;
    var rev = $('[data-pr-reveal]'); rev.hidden = false;
  }

  $('[data-pr-reveal]').addEventListener('click', function () {
    var b = $('[data-pr-qbody]');
    b.hidden = false; this.hidden = true;
    $('[data-pr-grade]').hidden = false;
    if (window.IVViz && window.IVViz.mount) {
      $$('figure.viz[data-viz]', b).forEach(window.IVViz.mount);
    }
  });

  $$('[data-pr-grade] [data-g]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var g = btn.getAttribute('data-g');
      grade(queue[qi], g); results[g]++; logToday();
      var dot = $('[data-pr-dots]').children[qi];
      if (dot) dot.className = 'pr-pdot is-' + g;
      qi++;
      if (qi >= queue.length) endSession();
      else showCard();
      window.scrollTo(0, 0);
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
