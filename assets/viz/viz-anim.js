/* Renderer SVG: flow, sequence, states, cycle, timeline (có bước chạy)
   + quadrant (tĩnh). Toạ độ theo viewBox, CSS co giãn 100%. */
(function () {
  'use strict';
  if (!window.IVViz) return;
  var S = IVViz.S;

  function svg(w, h) {
    var el = S('svg', { class: 'vz-svg', viewBox: '0 0 ' + w + ' ' + h, role: 'img' });
    var defs = S('defs', {}, [
      S('marker', { id: 'vzArrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse' }, [
        S('path', { d: 'M0 0 L10 5 L0 10 z', class: 'vz-arrowhead' }),
      ]),
    ]);
    el.appendChild(defs);
    return el;
  }
  function box(x, y, w, h, label, cls) {
    var g = S('g', { class: 'vz-node ' + (cls || '') });
    g.appendChild(S('rect', { x: x, y: y, width: w, height: h, rx: 8, class: 'vz-node-rect' }));
    var max = Math.max(4, Math.floor(w / 6.7));
    var short = label.length > max ? label.slice(0, max - 1) + '…' : label;
    var t = S('text', { x: x + w / 2, y: y + h / 2, class: 'vz-node-text', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    t.textContent = short;
    if (short !== label) g.appendChild(S('title', {}, [label]));
    g.appendChild(t);
    return g;
  }
  function line(x1, y1, x2, y2, cls) {
    return S('line', { x1: x1, y1: y1, x2: x2, y2: y2, class: 'vz-edge ' + (cls || ''), 'marker-end': 'url(#vzArrow)' });
  }

  /* ---- flow: pipeline ngang, sáng dần theo bước ---- */
  IVViz.register('flow', function (spec, ctx) {
    var nodes = spec.nodes || [];
    var n = nodes.length,
      W = 640,
      bw = Math.min(120, (W - 40) / n - 16),
      gap = (W - 40 - bw * n) / Math.max(1, n - 1),
      y = 30,
      bh = 46;
    var el = svg(W, 110);
    var edges = [],
      boxes = [];
    for (var i = 0; i < n; i++) {
      var x = 20 + i * (bw + gap);
      if (i > 0) {
        var e = line(x - gap, y + bh / 2, x, y + bh / 2);
        edges.push(e);
        el.appendChild(e);
      }
      var b = box(x, y, bw, bh, nodes[i], 'is-off');
      boxes.push(b);
      el.appendChild(b);
    }
    ctx.stage.appendChild(el);
    var steps = (spec.steps || nodes.map(function (nm, i) { return { to: i, label: nm }; })).map(function (st) {
      return {
        label: st.label,
        run: function () {
          boxes.forEach(function (b, i) { b.classList.toggle('is-off', i > st.to); b.classList.toggle('is-on', i <= st.to); });
          edges.forEach(function (e, i) { e.classList.toggle('is-on', i + 1 <= st.to); });
        },
      };
    });
    return {
      steps: steps,
      reset: function () {
        boxes.forEach(function (b) { b.classList.add('is-off'); b.classList.remove('is-on'); });
        edges.forEach(function (e) { e.classList.remove('is-on'); });
      },
    };
  });

  /* ---- sequence: lifeline dọc, mỗi bước một thông điệp ---- */
  IVViz.register('sequence', function (spec, ctx) {
    var actors = spec.actors || [],
      msgs = spec.messages || [];
    var W = 640,
      colW = W / (actors.length + 1),
      topH = 40,
      rowH = 30,
      H = topH + 20 + msgs.length * rowH + 10;
    var el = svg(W, H);
    var xs = actors.map(function (_, i) { return colW * (i + 1); });
    actors.forEach(function (a, i) {
      el.appendChild(box(xs[i] - colW / 2 + 10, 8, colW - 20, 26, a, 'is-on'));
      el.appendChild(S('line', { x1: xs[i], y1: topH, x2: xs[i], y2: H - 6, class: 'vz-lifeline' }));
    });
    ctx.stage.appendChild(el);
    var drawn = [];
    var steps = msgs.map(function (m, i) {
      return {
        label: m.label,
        run: function () {
          drawn.forEach(function (g, gi) { g.classList.toggle('is-dim', gi !== i); });
          if (drawn[i]) return;
          var y = topH + 22 + i * rowH,
            x1 = xs[m.from],
            x2 = xs[m.to];
          var g = S('g', { class: 'vz-msg' });
          g.appendChild(S('line', { x1: x1, y1: y, x2: x2, y2: y, class: 'vz-edge is-on' + (m.dashed ? ' vz-dashed' : ''), 'marker-end': 'url(#vzArrow)' }));
          var t = S('text', { x: (x1 + x2) / 2, y: y - 6, class: 'vz-msg-text', 'text-anchor': 'middle' });
          t.textContent = m.label;
          g.appendChild(t);
          el.appendChild(g);
          drawn[i] = g;
        },
      };
    });
    return {
      steps: steps,
      reset: function () {
        drawn.forEach(function (g) { if (g && g.parentNode) g.parentNode.removeChild(g); });
        drawn = [];
      },
    };
  });

  /* ---- states: máy trạng thái, bước qua các chuyển tiếp ---- */
  IVViz.register('states', function (spec, ctx) {
    var sts = spec.states || [],
      trs = spec.transitions || [];
    var W = 520,
      Hh = 300,
      cx = W / 2,
      cy = Hh / 2,
      R = 110,
      r = 34;
    var el = svg(W, Hh);
    var pos = sts.map(function (_, i) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / sts.length;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    var edgeEls = trs.map(function (tr) {
      var p = pos[tr.from],
        qq = pos[tr.to];
      var mx = (p.x + qq.x) / 2 + (qq.y - p.y) * 0.18,
        my = (p.y + qq.y) / 2 - (qq.x - p.x) * 0.18;
      var bow = 0.28;
      mx = (p.x + qq.x) / 2 + (qq.y - p.y) * bow;
      my = (p.y + qq.y) / 2 - (qq.x - p.x) * bow;
      var path = S('path', { d: 'M' + p.x + ' ' + p.y + ' Q ' + mx + ' ' + my + ' ' + qq.x + ' ' + qq.y, class: 'vz-edge', 'marker-end': 'url(#vzArrow)', fill: 'none' });
      el.appendChild(path);
      var t = S('text', { x: mx, y: my, class: 'vz-msg-text vz-hidden-label', 'text-anchor': 'middle' });
      t.textContent = tr.label || '';
      el.appendChild(t);
      return { path: path, label: t };
    });
    var nodeEls = sts.map(function (nm, i) {
      var g = S('g', { class: 'vz-node is-off' });
      g.appendChild(S('circle', { cx: pos[i].x, cy: pos[i].y, r: r, class: 'vz-node-rect' }));
      var t = S('text', { x: pos[i].x, y: pos[i].y, class: 'vz-node-text', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
      t.textContent = nm;
      g.appendChild(t);
      el.appendChild(g);
      return g;
    });
    ctx.stage.appendChild(el);
    function light(cur, active) {
      nodeEls.forEach(function (g, i) { g.classList.toggle('is-on', i === cur); g.classList.toggle('is-off', i !== cur); });
      edgeEls.forEach(function (e, i) {
        e.path.classList.toggle('is-on', i === active);
        e.label.classList.toggle('is-on', i === active);
      });
    }
    var steps = trs.map(function (tr) {
      return { label: (sts[tr.from] || '') + ' → ' + (sts[tr.to] || '') + (tr.label ? ' (' + tr.label + ')' : ''), run: function () { light(tr.to, trs.indexOf(tr)); } };
    });
    return { steps: steps, reset: function () { light(spec.start != null ? spec.start : 0, -1); } };
  });

  /* ---- cycle: vòng lặp các bước ---- */
  IVViz.register('cycle', function (spec, ctx) {
    var items = spec.steps || [];
    var W = 480,
      Hh = 300,
      cx = W / 2,
      cy = Hh / 2,
      R = 100;
    var el = svg(W, Hh);
    var pos = items.map(function (_, i) {
      var a = -Math.PI / 2 + (i * 2 * Math.PI) / items.length;
      return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
    });
    items.forEach(function (_, i) {
      var a = pos[i],
        b = pos[(i + 1) % items.length];
      el.appendChild(S('path', { d: 'M' + a.x + ' ' + a.y + ' Q ' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y, class: 'vz-edge vz-cycle-arc', 'marker-end': 'url(#vzArrow)', fill: 'none' }));
    });
    var boxes = items.map(function (it, i) {
      var b = box(pos[i].x - 52, pos[i].y - 18, 104, 36, it.label, 'is-off');
      el.appendChild(b);
      return b;
    });
    ctx.stage.appendChild(el);
    var steps = items.map(function (it, i) {
      return { label: it.note || it.label, run: function () { boxes.forEach(function (b, bi) { b.classList.toggle('is-on', bi === i); b.classList.toggle('is-off', bi !== i); }); } };
    });
    return { steps: steps, reset: function () { boxes.forEach(function (b) { b.classList.add('is-off'); b.classList.remove('is-on'); }); } };
  });

  /* ---- timeline: trục ngang, lộ dần sự kiện ---- */
  IVViz.register('timeline', function (spec, ctx) {
    var ev = spec.events || [];
    var W = 640,
      Hh = 130,
      y = 70,
      x0 = 30,
      x1 = W - 20;
    var el = svg(W, Hh);
    el.appendChild(S('line', { x1: x0, y1: y, x2: x1, y2: y, class: 'vz-edge is-on', 'marker-end': 'url(#vzArrow)' }));
    var step = (x1 - x0 - 20) / Math.max(1, ev.length - 1 || 1);
    var groups = ev.map(function (e, i) {
      var x = x0 + i * step + (ev.length === 1 ? (x1 - x0) / 2 : 0);
      var g = S('g', { class: 'vz-tl is-hidden' });
      g.appendChild(S('circle', { cx: x, cy: y, r: 5, class: 'vz-tl-dot' }));
      var up = i % 2 === 0;
      var t = S('text', { x: x, y: up ? y - 16 : y + 24, class: 'vz-msg-text', 'text-anchor': 'middle' });
      t.textContent = e.label;
      g.appendChild(t);
      if (e.t) {
        var tt = S('text', { x: x, y: up ? y - 30 : y + 38, class: 'vz-tl-time', 'text-anchor': 'middle' });
        tt.textContent = e.t;
        g.appendChild(tt);
      }
      el.appendChild(g);
      return g;
    });
    ctx.stage.appendChild(el);
    var steps = ev.map(function (e, i) {
      return { label: e.label, run: function () { groups.forEach(function (g, gi) { g.classList.toggle('is-hidden', gi > i); }); } };
    });
    return { steps: steps, reset: function () { groups.forEach(function (g) { g.classList.add('is-hidden'); }); } };
  });

  /* ---- quadrant: ma trận 2x2 (tĩnh) ---- */
  IVViz.register('quadrant', function (spec, ctx) {
    var W = 520,
      Hh = 380,
      L = 90,
      R = 24,
      T = 34,
      B = 46;
    var el = svg(W, Hh);
    var x0 = L, x1 = W - R, y0 = T, y1 = Hh - B, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    el.appendChild(S('rect', { x: x0, y: y0, width: x1 - x0, height: y1 - y0, class: 'vz-quad-box' }));
    el.appendChild(S('line', { x1: mx, y1: y0, x2: mx, y2: y1, class: 'vz-quad-axis' }));
    el.appendChild(S('line', { x1: x0, y1: my, x2: x1, y2: my, class: 'vz-quad-axis' }));
    function ax(txt, x, y, anchor) {
      var t = S('text', { x: x, y: y, class: 'vz-quad-axis-label', 'text-anchor': anchor || 'middle' });
      t.textContent = txt;
      el.appendChild(t);
    }
    if (spec.x) { ax('◄ ' + spec.x[0], (x0 + mx) / 2, y1 + 26); ax(spec.x[1] + ' ►', (mx + x1) / 2, y1 + 26); }
    if (spec.y) { ax(spec.y[1] + ' ▲', x0 - 8, y0 + 4, 'end'); ax(spec.y[0] + ' ▼', x0 - 8, y1, 'end'); }
    var buckets = {};
    (spec.items || []).forEach(function (it) {
      var key = (it.qx ? 1 : 0) + ',' + (it.qy ? 1 : 0);
      (buckets[key] = buckets[key] || []).push(it);
    });
    Object.keys(buckets).forEach(function (key) {
      var qx = +key[0], qy = key[2] === '1', list = buckets[key];
      var cx = qx ? (mx + x1) / 2 : (x0 + mx) / 2;
      var cy = qy ? (y0 + my) / 2 : (my + y1) / 2;
      var step = 22, top = cy - ((list.length - 1) * step) / 2;
      list.forEach(function (it, i) {
        var yy = top + i * step;
        var g = S('g', { class: 'vz-node is-on' });
        g.appendChild(S('circle', { cx: cx - 46, cy: yy, r: 5, class: 'vz-node-rect' }));
        var t = S('text', { x: cx - 36, y: yy, class: 'vz-msg-text', 'dominant-baseline': 'central' });
        t.textContent = it.label;
        g.appendChild(t);
        el.appendChild(g);
      });
    });
    ctx.stage.appendChild(el);
  });
})();
