/* Renderer tĩnh (không có bước chạy): compare, layers, tree, bars.
   Chủ yếu dựng DOM HTML để nhẹ, responsive và truy cập được. */
(function () {
  'use strict';
  if (!window.IVViz) return;
  var H = IVViz.H;

  /* ---- compare: bảng so sánh nhiều cột ---- */
  IVViz.register('compare', function (spec, ctx) {
    var cols = spec.cols || [];
    var wrap = H('div', { class: 'vz-tablewrap' });
    var table = H('table', { class: 'vz-compare' });
    var thead = H('thead');
    var htr = H('tr', {}, [H('th', { class: 'vz-rowhead', text: spec.corner || '' })]);
    cols.forEach(function (c, ci) {
      htr.appendChild(
        H('th', {
          class: 'vz-colhead',
          role: 'button',
          tabindex: '0',
          'data-col': ci,
          text: c,
          onclick: function () { focusCol(ci); },
          onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); focusCol(ci); } },
        })
      );
    });
    thead.appendChild(htr);
    table.appendChild(thead);
    var tbody = H('tbody');
    (spec.rows || []).forEach(function (row) {
      var tr = H('tr', { onclick: function () { tr.classList.toggle('is-on'); } }, [
        H('th', { scope: 'row', text: row[0] }),
      ]);
      for (var i = 1; i < row.length; i++) tr.appendChild(H('td', { 'data-col': i - 1, text: row[i] }));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    ctx.stage.appendChild(wrap);
    var focused = -1;
    function focusCol(ci) {
      focused = focused === ci ? -1 : ci;
      table.classList.toggle('is-focusing', focused >= 0);
      table.querySelectorAll('[data-col]').forEach(function (el) {
        el.classList.toggle('is-col-on', focused >= 0 && +el.dataset.col === focused);
      });
    }
  });

  /* ---- layers: chồng tầng, bấm để mở ghi chú ---- */
  IVViz.register('layers', function (spec, ctx) {
    var box = H('div', { class: 'vz-layers' + (spec.dir === 'up' ? ' vz-layers-up' : '') });
    (spec.layers || []).forEach(function (l, i) {
      var note = l.note ? H('p', { class: 'vz-layer-note', text: l.note }) : null;
      var row = H('div', { class: 'vz-layer', 'data-i': i }, [
        H('div', { class: 'vz-layer-bar', role: note ? 'button' : null, tabindex: note ? '0' : null }, [
          H('span', { class: 'vz-layer-name', text: l.name }),
          l.tag ? H('span', { class: 'vz-layer-tag', text: l.tag }) : document.createTextNode(''),
        ]),
      ]);
      if (note) {
        row.appendChild(note);
        var bar = row.querySelector('.vz-layer-bar');
        bar.addEventListener('click', function () { row.classList.toggle('is-open'); });
        bar.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.classList.toggle('is-open'); }
        });
      }
      box.appendChild(row);
    });
    ctx.stage.appendChild(box);
  });

  /* ---- tree: cây phân cấp thu gọn được ---- */
  IVViz.register('tree', function (spec, ctx) {
    function node(n, depth) {
      var li = H('li', { class: 'vz-tnode' });
      var head = H('div', { class: 'vz-trow' });
      var kids = n.children || [];
      if (kids.length) {
        var toggle = H('button', {
          class: 'vz-ttoggle',
          type: 'button',
          'aria-expanded': depth === 0 ? 'true' : 'false',
          text: depth === 0 ? '▾' : '▸',
        });
        head.appendChild(toggle);
      }
      head.appendChild(H('span', { class: 'vz-tlabel', text: n.label }));
      if (n.note) head.appendChild(H('span', { class: 'vz-tnote', text: n.note }));
      li.appendChild(head);
      if (kids.length) {
        var ul = H('ul', { class: 'vz-tchildren' });
        if (depth !== 0) ul.hidden = true;
        kids.forEach(function (c) { ul.appendChild(node(c, depth + 1)); });
        li.appendChild(ul);
        toggle.addEventListener('click', function () {
          var open = ul.hidden;
          ul.hidden = !open;
          toggle.textContent = open ? '▾' : '▸';
          toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      }
      return li;
    }
    var root = H('ul', { class: 'vz-tree' }, [node(spec.root || { label: '?' }, 0)]);
    ctx.stage.appendChild(root);
  });

  /* ---- bars: so sánh độ lớn (tuỳ chọn thang log) ---- */
  IVViz.register('bars', function (spec, ctx) {
    var items = spec.items || [];
    var log = spec.scale === 'log';
    var vals = items.map(function (it) { return Math.max(it.value, log ? 1 : 0); });
    var max = Math.max.apply(null, vals.concat([1]));
    var box = H('div', { class: 'vz-bars' });
    items.forEach(function (it, i) {
      var pct = log
        ? (Math.log(Math.max(it.value, 1)) / Math.log(max)) * 100
        : (it.value / max) * 100;
      var row = H('div', { class: 'vz-bar-row', role: it.note ? 'button' : null, tabindex: it.note ? '0' : null }, [
        H('span', { class: 'vz-bar-label', text: it.label }),
        H('span', { class: 'vz-bar-track' }, [
          H('span', { class: 'vz-bar-fill', style: 'width:' + Math.max(2, Math.min(100, pct)).toFixed(1) + '%' }),
        ]),
        H('span', { class: 'vz-bar-val', text: it.value + (spec.unit ? ' ' + spec.unit : '') }),
      ]);
      if (it.note) {
        var note = H('p', { class: 'vz-bar-note', text: it.note, hidden: true });
        row.addEventListener('click', function () { note.hidden = !note.hidden; });
        row.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); note.hidden = !note.hidden; }
        });
        var group = H('div', { class: 'vz-bar-group' }, [row, note]);
        box.appendChild(group);
      } else box.appendChild(row);
    });
    ctx.stage.appendChild(box);
  });
})();
