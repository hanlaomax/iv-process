/* Hình minh hoạ: SQL */
(function () {
  var D = window.IVDiagrams;
  if (!D) return;
  var S = D.S, H = D.H;

  /* ---------- Các loại JOIN ---------- */
  D.define('sql-joins', {
    title: 'Các loại JOIN giữ lại hàng nào',
    build: function (api) {
      var A = [{ k: 1 }, { k: 2 }, { k: 3 }, { k: 4 }];
      var B = [{ k: 3 }, { k: 4 }, { k: 5 }, { k: 6 }];
      var svg = S('svg', { viewBox: '0 0 640 320', class: 'dg-svg' });
      function col(x, title, rows, prefix) {
        var g = S('g');
        g.appendChild(S('text', { x: x + 45, y: 26, class: 'dg-t dg-t-mid' }, [title]));
        rows.forEach(function (r, i) {
          var y = 46 + i * 52;
          var rect = S('rect', { x: x, y: y, width: 90, height: 40, rx: 8, class: 'dg-box', id: prefix + r.k });
          var tx = S('text', { x: x + 45, y: y + 24, class: 'dg-t dg-t-mid' }, [prefix + ' · key ' + r.k]);
          g.appendChild(rect); g.appendChild(tx);
          r._y = y + 20;
        });
        return g;
      }
      var gA = col(30, 'Bảng A', A, 'a');
      var gB = col(520, 'Bảng B', B, 'b');
      var gL = S('g', { class: 'dg-links' });
      A.forEach(function (a) {
        B.forEach(function (b) {
          if (a.k === b.k) gL.appendChild(S('path', { d: 'M120 ' + a._y + ' C 300 ' + a._y + ', 340 ' + b._y + ', 520 ' + b._y, class: 'dg-link', 'data-pair': a.k }));
        });
      });
      var out = S('text', { x: 320, y: 300, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(gL); svg.appendChild(gA); svg.appendChild(gB); svg.appendChild(out);
      api.stage.appendChild(svg);

      function paint(keepA, keepB, note) {
        A.forEach(function (a) {
          var el = svg.querySelector('#a' + a.k);
          el.setAttribute('class', 'dg-box' + (keepA(a) ? ' dg-on' : ' dg-off'));
        });
        B.forEach(function (b) {
          var el = svg.querySelector('#b' + b.k);
          el.setAttribute('class', 'dg-box' + (keepB(b) ? ' dg-on' : ' dg-off'));
        });
        svg.querySelectorAll('.dg-link').forEach(function (l) {
          var m = A.some(function (a) { return keepA(a) && a.k == l.dataset.pair; }) && B.some(function (b) { return keepB(b) && b.k == l.dataset.pair; });
          l.setAttribute('class', 'dg-link' + (m ? ' dg-on' : ''));
        });
        out.textContent = note;
      }
      var both = function (r) { return [3, 4].indexOf(r.k) !== -1; };
      return {
        reset: function () { paint(function () { return true; }, function () { return true; }, 'Bảng A key {1,2,3,4} · Bảng B key {3,4,5,6} · khớp ở {3,4}'); },
        steps: [
          { label: 'INNER JOIN — chỉ hàng khớp ở CẢ hai bảng: {3,4}', run: function () { paint(both, both, 'Kết quả: 2 hàng (key 3, 4)'); } },
          { label: 'LEFT JOIN — mọi hàng bảng A; cột B là NULL nếu không khớp', run: function () { paint(function () { return true; }, both, 'Kết quả: 4 hàng — a1,a2 kèm NULL; a3,a4 kèm b3,b4'); } },
          { label: 'RIGHT JOIN — mọi hàng bảng B; cột A là NULL nếu không khớp', run: function () { paint(both, function () { return true; }, 'Kết quả: 4 hàng — b3,b4 kèm a3,a4; b5,b6 kèm NULL'); } },
          { label: 'FULL OUTER JOIN — mọi hàng cả hai bên, NULL chỗ không khớp', run: function () { paint(function () { return true; }, function () { return true; }, 'Kết quả: 6 hàng — hợp của LEFT và RIGHT'); } },
        ],
      };
    },
  });

  /* ---------- B-tree index lookup ---------- */
  D.define('btree-index', {
    title: 'Tra cứu qua B-tree index: WHERE id = 42',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 300', class: 'dg-svg' });
      function node(id, x, y, w, label) {
        var g = S('g', { id: id });
        g.appendChild(S('rect', { x: x, y: y, width: w, height: 34, rx: 7, class: 'dg-box' }));
        g.appendChild(S('text', { x: x + w / 2, y: y + 22, class: 'dg-t dg-t-mid' }, [label]));
        return g;
      }
      var edges = S('g', { class: 'dg-links' });
      [[320, 46, 130, 96], [320, 46, 470, 96], [130, 96, 60, 176], [130, 96, 200, 176], [470, 96, 400, 176], [470, 96, 560, 176]].forEach(function (e, i) {
        edges.appendChild(S('path', { d: 'M' + e[0] + ' ' + (e[1] + 34) + ' L ' + e[2] + ' ' + e[3], class: 'dg-link', id: 'e' + i }));
      });
      svg.appendChild(edges);
      svg.appendChild(node('n-root', 270, 12, 100, '≤50 | >50'));
      svg.appendChild(node('n-b1', 80, 96, 100, '20 | 40'));
      svg.appendChild(node('n-b2', 420, 96, 100, '70 | 90'));
      svg.appendChild(node('n-l1', 20, 176, 80, '1…19'));
      svg.appendChild(node('n-l2', 150, 176, 80, '41…50'));
      svg.appendChild(node('n-l3', 350, 176, 90, '51…70'));
      svg.appendChild(node('n-l4', 500, 176, 90, '91…∞'));
      svg.appendChild(node('n-row', 150, 250, 200, 'Hàng dữ liệu id=42 (heap)'));
      svg.appendChild(S('path', { d: 'M190 210 L 220 250', class: 'dg-link', id: 'e-row' }));
      api.stage.appendChild(svg);

      function lit(ids) {
        ['n-root', 'n-b1', 'n-b2', 'n-l1', 'n-l2', 'n-l3', 'n-l4', 'n-row'].forEach(function (id) {
          svg.querySelector('#' + id + ' rect').setAttribute('class', 'dg-box' + (ids.indexOf(id) !== -1 ? ' dg-on' : ''));
        });
        svg.querySelectorAll('.dg-link').forEach(function (l) { l.classList.remove('dg-on'); });
        (arguments[1] || []).forEach(function (e) { var n = svg.querySelector('#' + e); if (n) n.classList.add('dg-on'); });
      }
      return {
        reset: function () { lit([]); },
        steps: [
          { label: 'Bắt đầu ở nút gốc (root)', run: function () { lit(['n-root']); } },
          { label: '42 ≤ 50 → đi nhánh trái, tới nút [20 | 40]', run: function () { lit(['n-root', 'n-b1'], ['e0', 'e2']); } },
          { label: '42 > 40 → đi tới lá [41…50]', run: function () { lit(['n-b1', 'n-l2'], ['e3']); } },
          { label: 'Quét trong lá, thấy khoá 42 → lấy con trỏ tới hàng', run: function () { lit(['n-l2'], []); } },
          { label: 'Đọc hàng dữ liệu từ heap — tổng cộng ~4 lần đọc, O(log n)', run: function () { lit(['n-l2', 'n-row'], ['e-row']); } },
        ],
      };
    },
  });

  /* ---------- MVCC / snapshot isolation ---------- */
  D.define('mvcc-snapshot', {
    title: 'MVCC: mỗi transaction đọc từ ảnh chụp (snapshot) riêng',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 300', class: 'dg-svg' });
      // timeline
      svg.appendChild(S('line', { x1: 40, y1: 150, x2: 600, y2: 150, class: 'dg-axis' }));
      svg.appendChild(S('text', { x: 40, y: 175, class: 'dg-t dg-muted' }, ['thời gian →']));
      // versions of row x
      function ver(x, label, cls) {
        var g = S('g', { class: cls });
        g.appendChild(S('rect', { x: x, y: 120, width: 92, height: 30, rx: 6, class: 'dg-box' }));
        g.appendChild(S('text', { x: x + 46, y: 140, class: 'dg-t dg-t-mid' }, [label]));
        return g;
      }
      var v1 = ver(70, 'x = 100', 'v v1'); var v2 = ver(360, 'x = 150', 'v v2');
      svg.appendChild(v1); svg.appendChild(v2);
      // transaction A (top) and B (bottom)
      function txn(y, name, x1, x2, cls) {
        var g = S('g', { class: cls });
        g.appendChild(S('rect', { x: x1, y: y, width: x2 - x1, height: 26, rx: 6, class: 'dg-txn' }));
        g.appendChild(S('text', { x: x1 + 8, y: y + 18, class: 'dg-t' }, [name]));
        return g;
      }
      var tA = txn(50, 'Transaction A  (bắt đầu sớm)', 120, 520, 'tA');
      var tB = txn(210, 'Transaction B', 300, 430, 'tB');
      svg.appendChild(tA); svg.appendChild(tB);
      var eyeA = S('text', { x: 500, y: 44, class: 'dg-t dg-t-mid dg-eye' }, ['A đọc x → ?']);
      var eyeB = S('text', { x: 300, y: 262, class: 'dg-t dg-t-mid dg-eye' }, ['']);
      svg.appendChild(eyeA); svg.appendChild(eyeB);
      api.stage.appendChild(svg);

      function set(o) {
        v2.style.opacity = o.v2 ? 1 : 0.15;
        eyeA.textContent = o.a || '';
        eyeB.textContent = o.b || '';
        eyeA.setAttribute('class', 'dg-t dg-t-mid dg-eye' + (o.aStale ? ' dg-warn' : (o.a ? ' dg-ok' : '')));
      }
      return {
        reset: function () { set({ v2: false, a: '', b: '' }); },
        steps: [
          { label: 'Chỉ có version v1 (x = 100). Transaction A bắt đầu, chụp snapshot.', run: function () { set({ v2: false, a: 'snapshot: x = 100', b: '' }); } },
          { label: 'Transaction B chạy UPDATE x = 150 → tạo version v2, rồi COMMIT.', run: function () { set({ v2: true, a: 'snapshot: x = 100', b: 'B ghi & commit v2' }); } },
          { label: 'A đọc x → vẫn thấy v1 = 100 (theo snapshot của A). Đọc không bị chặn bởi ghi.', run: function () { set({ v2: true, a: 'A đọc x = 100  ✓ nhất quán', aStale: true, b: '' }); } },
          { label: 'A commit. Từ giờ, transaction/statement mới đọc x sẽ thấy v2 = 150. v1 chờ VACUUM dọn.', run: function () { set({ v2: true, a: 'A xong', b: 'statement mới đọc x = 150' }); } },
        ],
      };
    },
  });
})();
