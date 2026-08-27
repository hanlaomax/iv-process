/* Khung hình minh hoạ tương tác dựng từ dữ liệu khai báo.
   Mỗi câu hỏi có thể khai báo `viz: { type, ... }`; build.mjs sinh
   <figure class="viz" data-viz='{...}'> và nạp core + các renderer.
   Renderer đăng ký qua window.IVViz.register(type, fn).
   fn(spec, ctx) với ctx = { stage, S, H, reduce }; trả về (tuỳ chọn)
   { steps:[{label, run(i)}], reset() } để core lắp thanh điều khiển. */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var renderers = {};

  function S(tag, attrs, kids) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    (kids || []).forEach(function (c) {
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }
  function H(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs)
      for (var k in attrs) {
        if (attrs[k] == null) continue;
        if (k === 'class') e.className = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      }
    (kids || []).forEach(function (c) {
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function register(type, fn) {
    renderers[type] = fn;
  }

  function controlBar(fig, steps, reset) {
    var label = H('p', { class: 'vz-steplabel' });
    var bar = H('div', { class: 'vz-controls' });
    fig.appendChild(label);
    fig.appendChild(bar);
    var i = -1,
      playing = false,
      timer = null;

    function show(n) {
      i = Math.max(0, Math.min(steps.length - 1, n));
      steps[i].run(i);
      label.textContent =
        (steps.length > 1 ? i + 1 + '/' + steps.length + ' · ' : '') + (steps[i].label || '');
      prev.disabled = i === 0;
      next.disabled = i === steps.length - 1;
    }
    function stop() {
      playing = false;
      clearTimeout(timer);
      play.textContent = '▶ Chạy';
    }
    function doReset() {
      stop();
      if (reset) reset();
      i = -1;
      if (steps.length) show(0);
    }
    function run() {
      if (i >= steps.length - 1) doReset();
      playing = true;
      play.textContent = '❚❚ Dừng';
      (function loop() {
        if (!playing) return;
        if (i >= steps.length - 1) {
          stop();
          return;
        }
        show(i + 1);
        timer = setTimeout(loop, reduce ? 950 : 1500);
      })();
    }

    var rst = H('button', { class: 'vz-btn', type: 'button', title: 'Làm lại', onclick: doReset }, ['↺']);
    var prev = H('button', { class: 'vz-btn', type: 'button', onclick: function () { stop(); show(i - 1); } }, ['‹']);
    var play = H('button', { class: 'vz-btn vz-play', type: 'button', onclick: function () { playing ? stop() : run(); } }, ['▶ Chạy']);
    var next = H('button', { class: 'vz-btn', type: 'button', onclick: function () { stop(); show(i + 1); } }, ['›']);
    if (steps.length > 1) [rst, prev, play, next].forEach(function (b) { bar.appendChild(b); });
    else [rst, play].forEach(function (b) { bar.appendChild(b); });
    doReset();
  }

  function mount(fig) {
    var spec;
    try {
      spec = JSON.parse(fig.dataset.viz);
    } catch (e) {
      return;
    }
    var fn = renderers[spec && spec.type];
    if (!fn) {
      fig.hidden = true;
      return;
    }
    var stage = H('div', { class: 'vz-stage' });
    fig.appendChild(stage);
    var out;
    try {
      out = fn(spec, { stage: stage, S: S, H: H, reduce: reduce }) || {};
    } catch (e) {
      fig.hidden = true;
      return;
    }
    if (out.steps && out.steps.length) controlBar(fig, out.steps, out.reset);
  }

  window.IVViz = { register: register, S: S, H: H };

  function init() {
    document.querySelectorAll('figure.viz[data-viz]').forEach(mount);
  }
  /* các renderer (viz-*.js) cùng defer, chạy sau core nhưng trước DOMContentLoaded */
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
