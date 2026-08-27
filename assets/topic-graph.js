/* Trang chủ đề: nút chuyển "Danh sách / Bản đồ" + vẽ bản đồ khái niệm (graph).
   Dữ liệu ở <script type="application/json" id="graph-data">; nhãn node lấy từ .qa-q. */
(function () {
  'use strict';
  var page = document.querySelector('.topic-page');
  if (!page) return;
  var dataEl = document.getElementById('graph-data');
  var toggle = document.querySelector('.view-toggle');
  var mount = document.querySelector('.topic-graph');
  var VKEY = 'iv-topic-view';

  /* ---- nhấp nháy câu đích khi bấm chip "Câu liên quan" ---- */
  document.querySelectorAll('.related-chip').forEach(function (a) {
    a.addEventListener('click', function () {
      if (page.classList.contains('is-graph-view')) setView('list');
      var t = document.getElementById(a.getAttribute('href').slice(1));
      if (!t) return;
      t.classList.remove('is-flash');
      void t.offsetWidth;
      t.classList.add('is-flash');
      setTimeout(function () { t.classList.remove('is-flash'); }, 1400);
    });
  });

  if (!dataEl || !toggle || !mount) return;
  var graph;
  try { graph = JSON.parse(dataEl.textContent); } catch (e) { return; }
  if (!graph.nodes || graph.nodes.length < 3) return;

  toggle.hidden = false;
  var btns = toggle.querySelectorAll('.vt-btn');
  var built = false;

  function setView(v) {
    var graphView = v === 'graph';
    page.classList.toggle('is-graph-view', graphView);
    mount.hidden = !graphView;
    btns.forEach(function (b) {
      var on = b.dataset.view === v;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    try { localStorage.setItem(VKEY, v); } catch (e) {}
    if (graphView && !built) { built = true; build(); }
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
  var saved;
  try { saved = localStorage.getItem(VKEY); } catch (e) {}
  if (saved === 'graph') setView('graph');

  /* ---- layout lực, tất định ---- */
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

  function build() {
    var NS = 'http://www.w3.org/2000/svg';
    var nodes = graph.nodes.map(function (nd, i) {
      var art = document.getElementById(nd[0]);
      var q = art && art.querySelector('.qa-q');
      return { id: nd[0], cat: nd[1], label: q ? q.textContent.trim() : nd[0], deg: 0 };
    });
    var edges = (graph.edges || []).filter(function (e) { return nodes[e[0]] && nodes[e[1]]; });
    edges.forEach(function (e) { nodes[e[0]].deg++; nodes[e[1]].deg++; });

    var n = nodes.length, W = 900, Hh = Math.max(460, Math.min(900, n * 7));
    var rand = rng(n * 2654435761 + edges.length);
    var k = Math.sqrt((W * Hh) / n) * 0.62;
    nodes.forEach(function (nd, i) {
      var a = (i / n) * 2 * Math.PI;
      nd.x = W / 2 + Math.cos(a) * (120 + rand() * 220);
      nd.y = Hh / 2 + Math.sin(a) * (120 + rand() * 220);
    });
    var iters = n > 70 ? 200 : 300;
    for (var it = 0; it < iters; it++) {
      var temp = 1 - it / iters;
      for (var i = 0; i < n; i++) {
        var fx = 0, fy = 0, A = nodes[i];
        for (var j = 0; j < n; j++) {
          if (i === j) continue;
          var dx = A.x - nodes[j].x, dy = A.y - nodes[j].y;
          var d2 = dx * dx + dy * dy || 0.01, d = Math.sqrt(d2);
          var rep = (k * k) / d2;
          fx += (dx / d) * rep * 24;
          fy += (dy / d) * rep * 24;
        }
        fx += (W / 2 - A.x) * 0.03;
        fy += (Hh / 2 - A.y) * 0.03;
        A.fx = fx; A.fy = fy;
      }
      edges.forEach(function (e) {
        var A = nodes[e[0]], B = nodes[e[1]];
        var dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var att = d / k * 8;
        var ax = (dx / d) * att, ay = (dy / d) * att;
        A.fx += ax; A.fy += ay; B.fx -= ax; B.fy -= ay;
      });
      for (var m = 0; m < n; m++) {
        var P = nodes[m], fl = Math.sqrt(P.fx * P.fx + P.fy * P.fy) || 0.01;
        P.x += (P.fx / fl) * Math.min(fl, 16 * temp + 1);
        P.y += (P.fy / fl) * Math.min(fl, 16 * temp + 1);
      }
    }
    /* chuẩn hoá về khung nhìn có lề, tránh node dồn ra biên */
    var xs0 = nodes.map(function (p) { return p.x; }), ys0 = nodes.map(function (p) { return p.y; });
    var minX = Math.min.apply(null, xs0), maxX = Math.max.apply(null, xs0);
    var minY = Math.min.apply(null, ys0), maxY = Math.max.apply(null, ys0);
    var pad = 40, sx = (W - 2 * pad) / (maxX - minX || 1), sy = (Hh - 2 * pad) / (maxY - minY || 1);
    var sN = Math.min(sx, sy);
    nodes.forEach(function (p) {
      p.x = pad + (p.x - minX) * sN + (W - 2 * pad - (maxX - minX) * sN) / 2;
      p.y = pad + (p.y - minY) * sN + (Hh - 2 * pad - (maxY - minY) * sN) / 2;
    });

    var cats = [];
    nodes.forEach(function (nd) { if (cats.indexOf(nd.cat) < 0) cats.push(nd.cat); });
    function hue(c) { var h = 0; for (var i = 0; i < c.length; i++) h = (h * 31 + c.charCodeAt(i)) % 360; return h; }
    var color = function (c) { return 'hsl(' + hue(c) + ' 55% 52%)'; };

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'graph-svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + Hh);
    var pan = document.createElementNS(NS, 'g');
    svg.appendChild(pan);
    var gEdges = document.createElementNS(NS, 'g');
    gEdges.setAttribute('class', 'graph-edges');
    pan.appendChild(gEdges);
    var adj = nodes.map(function () { return []; });
    edges.forEach(function (e) {
      adj[e[0]].push(e[1]); adj[e[1]].push(e[0]);
      var ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', nodes[e[0]].x); ln.setAttribute('y1', nodes[e[0]].y);
      ln.setAttribute('x2', nodes[e[1]].x); ln.setAttribute('y2', nodes[e[1]].y);
      ln.setAttribute('class', 'graph-edge');
      ln.__n = [e[0], e[1]];
      gEdges.appendChild(ln);
    });
    var gNodes = document.createElementNS(NS, 'g');
    gNodes.setAttribute('class', 'graph-nodes');
    pan.appendChild(gNodes);
    var nodeEls = nodes.map(function (nd, i) {
      var g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'graph-node');
      g.setAttribute('transform', 'translate(' + nd.x + ' ' + nd.y + ')');
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', 4 + Math.min(7, nd.deg));
      c.setAttribute('fill', color(nd.cat));
      g.appendChild(c);
      var tt = document.createElementNS(NS, 'title');
      tt.textContent = nd.label;
      g.appendChild(tt);
      var tx = document.createElementNS(NS, 'text');
      tx.setAttribute('class', 'graph-label');
      tx.setAttribute('x', 9 + Math.min(7, nd.deg));
      tx.setAttribute('y', 4);
      tx.textContent = nd.label.length > 46 ? nd.label.slice(0, 45) + '…' : nd.label;
      g.appendChild(tx);
      g.addEventListener('mouseenter', function () { lit(i, true); });
      g.addEventListener('mouseleave', function () { lit(i, false); });
      g.addEventListener('click', function () {
        setView('list');
        var art = document.getElementById(nd.id);
        if (art) { location.hash = '#' + nd.id; art.classList.add('is-flash'); setTimeout(function () { art.classList.remove('is-flash'); }, 1400); }
      });
      gNodes.appendChild(g);
      return g;
    });
    function lit(i, on) {
      svg.classList.toggle('is-lit', on);
      var near = {}; near[i] = 1; adj[i].forEach(function (j) { near[j] = 1; });
      nodeEls.forEach(function (g, j) { g.classList.toggle('is-near', on && !!near[j]); });
      gEdges.querySelectorAll('.graph-edge').forEach(function (ln) {
        ln.classList.toggle('is-near', on && (ln.__n[0] === i || ln.__n[1] === i));
      });
    }

    /* pan + zoom */
    var tx = 0, ty = 0, sc = 1, drag = null;
    function apply() { pan.setAttribute('transform', 'translate(' + tx + ' ' + ty + ') scale(' + sc + ')'); }
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var f = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      sc = Math.max(0.4, Math.min(4, sc * f));
      apply();
    }, { passive: false });
    svg.addEventListener('pointerdown', function (e) { drag = { x: e.clientX - tx, y: e.clientY - ty }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', function (e) { if (!drag) return; tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(); });
    svg.addEventListener('pointerup', function () { drag = null; });

    var legend = document.createElement('div');
    legend.className = 'graph-legend';
    cats.forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'graph-legend-item';
      s.innerHTML = '<i style="background:' + color(c) + '"></i>';
      s.appendChild(document.createTextNode(c));
      legend.appendChild(s);
    });
    var hint = document.createElement('p');
    hint.className = 'graph-hint';
    hint.textContent = 'Kéo để di chuyển · lăn chuột để phóng to · bấm một node để mở câu hỏi';
    mount.appendChild(hint);
    mount.appendChild(legend);
    mount.appendChild(svg);
  }
})();
