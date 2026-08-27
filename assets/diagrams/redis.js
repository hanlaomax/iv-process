/* Hình minh hoạ: Redis */
(function () {
  var D = window.IVDiagrams;
  if (!D) return;
  var S = D.S;

  /* ---------- Cache stampede ---------- */
  D.define('cache-stampede', {
    title: 'Cache stampede khi key hot hết hạn — và cách chặn bằng lock',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 300', class: 'dg-svg' });
      var reqs = [];
      for (var i = 0; i < 6; i++) {
        var y = 24 + i * 42;
        svg.appendChild(S('rect', { x: 20, y: y, width: 96, height: 30, rx: 7, class: 'dg-box dg-on' }));
        svg.appendChild(S('text', { x: 68, y: y + 20, class: 'dg-t dg-t-mid' }, ['request']));
        reqs.push(y + 15);
      }
      svg.appendChild(S('rect', { x: 250, y: 90, width: 130, height: 120, rx: 10, class: 'dg-box', id: 'cache' }));
      svg.appendChild(S('text', { x: 315, y: 84, class: 'dg-t dg-t-mid' }, ['Redis cache']));
      svg.appendChild(S('text', { x: 315, y: 155, class: 'dg-t dg-t-mid dg-muted', id: 'ckey' }, ['key: hit']));
      svg.appendChild(S('rect', { x: 500, y: 110, width: 120, height: 80, rx: 10, class: 'dg-box', id: 'db' }));
      svg.appendChild(S('text', { x: 560, y: 155, class: 'dg-t dg-t-mid' }, ['Database']));
      var flowC = S('g', { id: 'flowC' }), flowDB = S('g', { id: 'flowDB' });
      svg.appendChild(flowC); svg.appendChild(flowDB);
      var note = S('text', { x: 320, y: 280, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(note);
      api.stage.appendChild(svg);
      function flows(g, toX, toY, n, cls) {
        g.textContent = '';
        for (var i = 0; i < n; i++) {
          g.appendChild(S('path', { d: 'M116 ' + reqs[i] + ' C 190 ' + reqs[i] + ', 190 ' + toY + ', ' + toX + ' ' + toY, class: 'dg-link ' + (cls || 'dg-on') }));
        }
      }
      return {
        reset: function () { flows(flowC, 250, 150, 6); flowDB.textContent = ''; svg.querySelector('#ckey').textContent = 'key: HIT'; svg.querySelector('#db').setAttribute('class', 'dg-box'); note.textContent = 'Bình thường: mọi request đọc từ cache'; },
        steps: [
          { label: 'Key hot HẾT HẠN. 6 request đồng thời cùng miss.', run: function () { flows(flowC, 250, 150, 6); flowDB.textContent = ''; svg.querySelector('#ckey').textContent = 'key: EXPIRED'; note.textContent = 'Tất cả cùng miss một lúc'; } },
          { label: 'Không chặn → CẢ 6 request đập xuống DB tính lại cùng một giá trị', run: function () { flowC.textContent = ''; flows(flowDB, 500, 150, 6, 'dg-link'); svg.querySelector('#db').setAttribute('class', 'dg-box dg-off'); [].forEach.call(svg.querySelectorAll('#flowDB path'), function (p) { p.classList.add('dg-on'); p.style.stroke = '#c2540c'; }); note.textContent = '💥 DB quá tải — có thể sập'; } },
          { label: 'Có lock (SET key lock NX EX): chỉ 1 request giành lock, xuống DB', run: function () { flowC.textContent = ''; flows(flowDB, 500, 150, 1); note.textContent = '1 request nạp lại; 5 request kia chờ ngắn hoặc nhận giá trị cũ'; } },
          { label: 'Request đó ghi lại cache; 5 request kia đọc từ cache như thường', run: function () { flowDB.textContent = ''; flows(flowC, 250, 150, 6); svg.querySelector('#ckey').textContent = 'key: HIT (mới)'; note.textContent = 'DB chỉ thấy 1 query thay vì 6'; } },
        ],
      };
    },
  });

  /* ---------- Redis Cluster hash slots ---------- */
  D.define('redis-cluster-slots', {
    title: 'Redis Cluster: 16384 hash slot chia cho các node',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 260', class: 'dg-svg' });
      var bar = S('g', { id: 'bar' });
      svg.appendChild(bar);
      svg.appendChild(S('text', { x: 20, y: 20, class: 'dg-t dg-muted' }, ['slot 0']));
      svg.appendChild(S('text', { x: 560, y: 20, class: 'dg-t dg-muted' }, ['16383']));
      var keys = S('g', { id: 'keys' });
      svg.appendChild(keys);
      var note = S('text', { x: 320, y: 240, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(note);
      api.stage.appendChild(svg);
      function drawBar(ranges) {
        bar.textContent = '';
        var x = 20, W = 600;
        ranges.forEach(function (r, i) {
          var w = W * r.frac;
          bar.appendChild(S('rect', { x: x, y: 30, width: w - 3, height: 40, rx: 5, class: 'dg-box dg-on' }));
          bar.appendChild(S('text', { x: x + w / 2, y: 55, class: 'dg-t dg-t-mid' }, [r.label]));
          x += w;
        });
      }
      function drawKeys(map) {
        keys.textContent = '';
        map.forEach(function (k, i) {
          var y = 110 + i * 34;
          keys.appendChild(S('text', { x: 40, y: y, class: 'dg-t' }, ['key "' + k.key + '"  →  CRC16 % 16384 = ' + k.slot + '  →  ' + k.node]));
        });
      }
      var three = [
        { frac: 1 / 3, label: 'Node A · slot 0–5460' },
        { frac: 1 / 3, label: 'Node B · 5461–10922' },
        { frac: 1 / 3, label: 'Node C · 10923–16383' },
      ];
      var four = [
        { frac: 0.26, label: 'Node A' }, { frac: 0.24, label: 'Node B' },
        { frac: 0.25, label: 'Node C' }, { frac: 0.25, label: 'Node D (mới)' },
      ];
      return {
        reset: function () { drawBar(three); keys.textContent = ''; note.textContent = '3 node · mỗi node giữ một dải slot'; },
        steps: [
          { label: 'Mỗi key được hash → một slot cố định (CRC16 % 16384)', run: function () { drawBar(three); drawKeys([{ key: 'user:42', slot: 3120, node: 'Node A' }, { key: 'cart:99', slot: 8900, node: 'Node B' }, { key: 'order:7', slot: 15010, node: 'Node C' }]); note.textContent = 'Client cluster-aware biết bản đồ slot → node, gửi thẳng đúng node'; } },
          { label: 'Thêm Node D → reshard: chuyển một phần slot (và dữ liệu) sang D', run: function () { drawBar(four); note.textContent = 'Trong lúc migrate: node cũ trả ASK, xong thì trả MOVED'; } },
          { label: 'Key nào cần thao tác cùng nhau → dùng hash tag {…} để vào cùng slot', run: function () { drawBar(four); drawKeys([{ key: 'user:{42}:profile', slot: 3120, node: 'Node A' }, { key: 'user:{42}:cart', slot: 3120, node: 'Node A' }]); note.textContent = 'Chỉ phần trong {} được hash → hai key cùng slot → MGET/MULTI/Lua dùng được'; } },
        ],
      };
    },
  });
})();
