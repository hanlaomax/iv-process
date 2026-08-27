/* Khung hình minh hoạ động — dùng chung cho các file diagrams/<topic>.js
   Mỗi diagram: window.IVDiagrams.define(id, { title, caption, steps, build }) */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var registry = {};

  function S(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function H(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function define(id, spec) { registry[id] = spec; }

  function mount(fig) {
    var spec = registry[fig.dataset.diagram];
    if (!spec) return;
    var cap = fig.querySelector('.diagram-cap');
    if (cap && spec.title) cap.appendChild(H('span', { class: 'diagram-title', text: spec.title }));

    var stage = H('div', { class: 'diagram-stage' });
    var stepLabel = H('p', { class: 'diagram-steplabel' });
    var bar = H('div', { class: 'diagram-controls' });
    fig.appendChild(stage);
    fig.appendChild(stepLabel);
    fig.appendChild(bar);

    var api = { S: S, H: H, stage: stage, reduce: reduceMotion };
    var built = spec.build(api) || {};
    var steps = built.steps || spec.steps || [];
    var reset = built.reset || function () {};
    var i = -1, playing = false, timer = null;

    function show(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      steps[i].run(api);
      stepLabel.textContent = (steps.length > 1 ? (i + 1) + '/' + steps.length + ' · ' : '') + (steps[i].label || '');
      btnPrev.disabled = i === 0;
      btnNext.disabled = i === steps.length - 1;
    }
    function stop() { playing = false; clearTimeout(timer); btnPlay.textContent = '▶ Chạy'; }
    function play() {
      if (i >= steps.length - 1) { doReset(); }
      playing = true; btnPlay.textContent = '❚❚ Dừng';
      (function loop() {
        if (!playing) return;
        if (i >= steps.length - 1) { stop(); return; }
        show(i + 1);
        timer = setTimeout(loop, reduceMotion ? 900 : 1600);
      })();
    }
    function doReset() { stop(); reset(api); i = -1; if (steps.length) show(0); }

    var btnReset = H('button', { class: 'dg-btn', type: 'button', title: 'Làm lại', onclick: doReset }, ['↺']);
    var btnPrev = H('button', { class: 'dg-btn', type: 'button', onclick: function () { stop(); show(i - 1); } }, ['‹']);
    var btnPlay = H('button', { class: 'dg-btn dg-play', type: 'button', onclick: function () { playing ? stop() : play(); } }, ['▶ Chạy']);
    var btnNext = H('button', { class: 'dg-btn', type: 'button', onclick: function () { stop(); show(i + 1); } }, ['›']);
    if (steps.length > 1) { bar.appendChild(btnReset); bar.appendChild(btnPrev); bar.appendChild(btnPlay); bar.appendChild(btnNext); }
    else if (steps.length === 1) { bar.appendChild(btnReset); bar.appendChild(btnPlay); }

    doReset();
  }

  window.IVDiagrams = { define: define, S: S, H: H };

  function init() {
    document.querySelectorAll('.diagram[data-diagram]').forEach(mount);
  }
  /* các file diagrams/<topic>.js (cùng defer) chạy sau core.js nhưng trước DOMContentLoaded,
     nên luôn chờ tới DOMContentLoaded để mọi define() đã xong */
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
