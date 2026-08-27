/* Hình minh hoạ: Apache Kafka */
(function () {
  var D = window.IVDiagrams;
  if (!D) return;
  var S = D.S;

  /* ---------- Consumer group & phân bổ partition ---------- */
  D.define('kafka-consumer-groups', {
    title: 'Consumer group: mỗi partition được gán cho đúng 1 consumer',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 320', class: 'dg-svg' });
      var parts = [];
      for (var i = 0; i < 4; i++) {
        var y = 30 + i * 62;
        var g = S('g', { id: 'p' + i });
        g.appendChild(S('rect', { x: 40, y: y, width: 250, height: 44, rx: 8, class: 'dg-box' }));
        g.appendChild(S('text', { x: 52, y: y + 27, class: 'dg-t' }, ['Partition ' + i]));
        g.appendChild(S('circle', { cx: 250, cy: y + 22, r: 6, class: 'dg-msg' }));
        g.appendChild(S('circle', { cx: 228, cy: y + 22, r: 6, class: 'dg-msg' }));
        g.appendChild(S('circle', { cx: 206, cy: y + 22, r: 6, class: 'dg-msg' }));
        svg.appendChild(g);
        parts.push({ y: y + 22 });
      }
      svg.appendChild(S('text', { x: 40, y: 300, class: 'dg-t dg-muted' }, ['Topic "orders" · 4 partition']));
      var cons = S('g', { id: 'cons' });
      svg.appendChild(cons);
      var links = S('g', { class: 'dg-links', id: 'klinks' });
      svg.appendChild(links);
      api.stage.appendChild(svg);

      function draw(n, note) {
        cons.textContent = '';
        links.textContent = '';
        var list = [];
        for (var c = 0; c < n; c++) {
          var cy = 20 + c * (280 / Math.max(n, 1)) + (280 / Math.max(n, 1)) / 2;
          var gg = S('g');
          gg.appendChild(S('rect', { x: 460, y: cy - 18, width: 150, height: 36, rx: 8, class: 'dg-box' + (c >= 4 ? ' dg-off' : ' dg-on') }));
          gg.appendChild(S('text', { x: 470, y: cy + 5, class: 'dg-t' }, ['Consumer ' + (c + 1) + (c >= 4 ? ' (rảnh)' : '')]));
          cons.appendChild(gg);
          list.push(cy);
        }
        parts.forEach(function (p, pi) {
          var owner = n === 0 ? -1 : pi % n;
          if (owner >= 0 && owner < 4 && owner < list.length) {
            links.appendChild(S('path', { d: 'M290 ' + p.y + ' C 380 ' + p.y + ', 380 ' + list[owner] + ', 460 ' + list[owner], class: 'dg-link dg-on' }));
          }
        });
        svg.querySelector('text.dg-muted').textContent = note || 'Topic "orders" · 4 partition';
      }
      return {
        reset: function () { draw(0, 'Topic "orders" · 4 partition · chưa có consumer'); },
        steps: [
          { label: '1 consumer trong group → nhận toàn bộ 4 partition', run: function () { draw(1, '1 consumer đọc cả 4 partition'); } },
          { label: '2 consumer → mỗi cái 2 partition (chia đều)', run: function () { draw(2, '2 consumer · mỗi cái 2 partition'); } },
          { label: '4 consumer → 1-1, song song tối đa', run: function () { draw(4, '4 consumer · mỗi cái 1 partition · song song tối đa'); } },
          { label: '5 consumer → consumer thứ 5 KHÔNG nhận partition nào (ngồi rảnh)', run: function () { draw(5, 'Số consumer > số partition → dư thừa'); } },
        ],
      };
    },
  });

  /* ---------- Replication & ISR ---------- */
  D.define('kafka-replication', {
    title: 'Replication factor 3, acks=all, ISR',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 300', class: 'dg-svg' });
      var B = [
        { x: 60, label: 'Broker 1', role: 'Leader' },
        { x: 250, label: 'Broker 2', role: 'Follower' },
        { x: 440, label: 'Broker 3', role: 'Follower' },
      ];
      B.forEach(function (b, i) {
        var g = S('g', { id: 'b' + i });
        g.appendChild(S('rect', { x: b.x, y: 90, width: 140, height: 70, rx: 10, class: 'dg-box' }));
        g.appendChild(S('text', { x: b.x + 70, y: 116, class: 'dg-t dg-t-mid' }, [b.label]));
        g.appendChild(S('text', { x: b.x + 70, y: 138, class: 'dg-t dg-t-mid dg-role' }, [b.role]));
        svg.appendChild(g);
      });
      svg.appendChild(S('path', { d: 'M130 92 C 130 40, 320 40, 320 88', class: 'dg-link', id: 'r1' }));
      svg.appendChild(S('path', { d: 'M130 92 C 200 30, 510 30, 510 88', class: 'dg-link', id: 'r2' }));
      var prod = S('g', { id: 'prod' });
      prod.appendChild(S('rect', { x: 250, y: 210, width: 140, height: 34, rx: 8, class: 'dg-box' }));
      prod.appendChild(S('text', { x: 320, y: 232, class: 'dg-t dg-t-mid' }, ['Producer']));
      prod.appendChild(S('path', { d: 'M250 220 C 160 210, 130 180, 130 160', class: 'dg-link', id: 'pw' }));
      svg.appendChild(prod);
      var note = S('text', { x: 320, y: 280, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(note);
      api.stage.appendChild(svg);

      function set(o) {
        ['r1', 'r2'].forEach(function (id, i) { svg.querySelector('#' + id).setAttribute('class', 'dg-link' + (o.isr > i + 1 ? ' dg-on' : ' dg-off')); });
        svg.querySelector('#b1 rect').setAttribute('class', 'dg-box' + (o.isr >= 2 ? ' dg-on' : ' dg-off'));
        svg.querySelector('#b2 rect').setAttribute('class', 'dg-box' + (o.isr >= 3 ? ' dg-on' : ' dg-off'));
        svg.querySelector('#b0 rect').setAttribute('class', 'dg-box' + (o.leaderDead ? ' dg-off' : ' dg-on'));
        if (o.newLeader != null) {
          B.forEach(function (b, i) { svg.querySelector('#b' + i + ' .dg-role').textContent = i === o.newLeader ? 'Leader (mới)' : (i === 0 ? 'chết' : 'Follower'); });
        } else {
          B.forEach(function (b, i) { svg.querySelector('#b' + i + ' .dg-role').textContent = b.role; });
        }
        note.textContent = o.note || '';
      }
      return {
        reset: function () { set({ isr: 3, note: 'ISR = {B1, B2, B3} — cả 3 bám kịp leader' }); },
        steps: [
          { label: 'Producer gửi với acks=all → leader (B1) nhận, ghi log', run: function () { set({ isr: 3, note: 'Leader B1 nhận message' }); } },
          { label: 'B2, B3 fetch & replicate. Đủ trong ISR → leader ack cho producer', run: function () { set({ isr: 3, note: 'acks=all thoả: message có ở cả 3 replica trong ISR' }); } },
          { label: 'B3 tụt hậu quá replica.lag.time.max.ms → bị loại khỏi ISR', run: function () { set({ isr: 2, note: 'ISR = {B1, B2}. min.insync.replicas=2 vẫn thoả → còn ghi được' }); } },
          { label: 'Leader B1 chết → controller bầu B2 (trong ISR) làm leader mới', run: function () { set({ isr: 2, leaderDead: true, newLeader: 1, note: 'Không mất message đã committed. Nếu ISR rỗng → partition offline' }); } },
        ],
      };
    },
  });
})();
