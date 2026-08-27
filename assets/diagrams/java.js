/* Hình minh hoạ: Java / Spring */
(function () {
  var D = window.IVDiagrams;
  if (!D) return;
  var S = D.S;

  /* ---------- Vòng đời Spring Bean ---------- */
  D.define('bean-lifecycle', {
    title: 'Vòng đời một Spring bean (khởi tạo → sẵn sàng → huỷ)',
    build: function (api) {
      var phases = [
        'Constructor', 'Tiêm phụ thuộc (DI)', '*Aware callbacks',
        'BeanPostProcessor · before', '@PostConstruct', 'afterPropertiesSet()',
        'init-method', 'BeanPostProcessor · after (tạo AOP proxy)', 'BEAN SẴN SÀNG',
        '@PreDestroy', 'destroy() / destroy-method',
      ];
      var svg = S('svg', { viewBox: '0 0 640 ' + (phases.length * 40 + 20), class: 'dg-svg' });
      phases.forEach(function (p, i) {
        var y = 12 + i * 40;
        var g = S('g', { id: 'ph' + i });
        g.appendChild(S('rect', { x: 60, y: y, width: 520, height: 30, rx: 7, class: 'dg-step' }));
        g.appendChild(S('text', { x: 76, y: y + 20, class: 'dg-t' }, [(i + 1) + '.  ' + p]));
        if (i < phases.length - 1) g.appendChild(S('line', { x1: 320, y1: y + 30, x2: 320, y2: y + 40, class: 'dg-link dg-on' }));
        svg.appendChild(g);
      });
      api.stage.appendChild(svg);
      function upto(n) {
        phases.forEach(function (_, i) {
          var r = svg.querySelector('#ph' + i + ' rect');
          r.setAttribute('class', 'dg-step' + (i < n ? ' dg-done' : (i === n ? ' dg-on' : '')));
        });
      }
      var steps = phases.map(function (p, i) {
        return { label: (i === 8 ? 'Bean nằm trong container, phục vụ request' : (i > 8 ? 'Khi đóng context: ' : '') + p), run: function () { upto(i); } };
      });
      return { reset: function () { upto(-1); }, steps: steps };
    },
  });

  /* ---------- Spring AOP proxy ---------- */
  D.define('spring-aop-proxy', {
    title: 'Spring AOP: lời gọi đi qua proxy; self-invocation thì không',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 300', class: 'dg-svg' });
      function box(id, x, y, w, h, label, cls) {
        var g = S('g', { id: id });
        g.appendChild(S('rect', { x: x, y: y, width: w, height: h, rx: 9, class: cls || 'dg-box' }));
        g.appendChild(S('text', { x: x + w / 2, y: y + (h < 40 ? 22 : 26), class: 'dg-t dg-t-mid' }, [label]));
        return g;
      }
      svg.appendChild(box('client', 30, 120, 90, 40, 'Client'));
      svg.appendChild(box('proxy', 170, 60, 210, 170, 'Proxy (CGLIB)'));
      svg.appendChild(box('advice', 195, 100, 160, 40, '@Transactional / advice', 'dg-box'));
      svg.appendChild(box('target', 195, 160, 160, 50, 'Bean thật (target)', 'dg-box'));
      svg.appendChild(box('db', 460, 120, 110, 40, 'DB / cache…', 'dg-box'));
      svg.appendChild(S('path', { d: 'M120 140 L 170 140', class: 'dg-link', id: 'a1' }));
      svg.appendChild(S('path', { d: 'M275 140 L 275 160', class: 'dg-link', id: 'a2' }));
      svg.appendChild(S('path', { d: 'M355 185 L 460 140', class: 'dg-link', id: 'a3' }));
      svg.appendChild(S('path', { d: 'M275 195 C 400 260, 130 260, 255 200', class: 'dg-link', id: 'self' }));
      var note = S('text', { x: 320, y: 285, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(note);
      api.stage.appendChild(svg);
      function lit(ids, n) {
        ['a1', 'a2', 'a3', 'self', 'advice', 'target', 'proxy'].forEach(function (id) {
          var el = svg.querySelector('#' + id);
          var r = el.tagName === 'g' ? el.querySelector('rect') : el;
          (r || el).classList.remove('dg-on');
        });
        ids.forEach(function (id) {
          var el = svg.querySelector('#' + id);
          var r = el.tagName === 'g' ? el.querySelector('rect') : el;
          (r || el).classList.add('dg-on');
        });
        note.textContent = n || '';
      }
      return {
        reset: function () { lit([], 'bankService bạn inject thực chất là proxy'); },
        steps: [
          { label: 'Client gọi bankService.transfer() → vào PROXY', run: function () { lit(['a1', 'proxy'], 'Lời gọi từ ngoài đi qua proxy'); } },
          { label: 'Proxy chạy advice: mở transaction / kiểm tra cache…', run: function () { lit(['proxy', 'advice'], 'advice bọc quanh method'); } },
          { label: 'Proxy gọi bean thật; bean gọi DB; rồi advice commit', run: function () { lit(['a2', 'a3', 'target', 'advice'], 'target chạy business logic, advice hoàn tất'); } },
          { label: 'Self-invocation: this.otherMethod() gọi thẳng target, KHÔNG qua proxy → advice trên otherMethod bị bỏ qua', run: function () { lit(['self', 'target'], '⚠ this.method() bỏ qua proxy — @Transactional/@Cacheable không chạy'); } },
        ],
      };
    },
  });

  /* ---------- Generational GC ---------- */
  D.define('gc-generational', {
    title: 'Generational GC: Eden → Survivor → Old',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 240', class: 'dg-svg' });
      function region(id, x, w, label) {
        var g = S('g', { id: id });
        g.appendChild(S('rect', { x: x, y: 40, width: w, height: 120, rx: 8, class: 'dg-box' }));
        g.appendChild(S('text', { x: x + w / 2, y: 30, class: 'dg-t dg-t-mid' }, [label]));
        return g;
      }
      svg.appendChild(region('eden', 30, 200, 'Eden'));
      svg.appendChild(region('s0', 250, 90, 'Survivor'));
      svg.appendChild(region('old', 370, 240, 'Old gen'));
      var live = S('g', { id: 'objs' });
      svg.appendChild(live);
      var note = S('text', { x: 320, y: 200, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(note);
      api.stage.appendChild(svg);
      function dots(region, count, cls) {
        for (var i = 0; i < count; i++) {
          var rx = { eden: [40, 220], s0: [258, 74], old: [378, 224] }[region];
          live.appendChild(S('circle', { cx: rx[0] + Math.random() * rx[1], cy: 55 + Math.random() * 90, r: 6, class: 'dg-msg ' + (cls || '') }));
        }
      }
      function clear() { live.textContent = ''; }
      return {
        reset: function () { clear(); note.textContent = 'Object mới luôn cấp phát vào Eden'; },
        steps: [
          { label: 'Ứng dụng tạo nhiều object mới → lấp đầy Eden', run: function () { clear(); dots('eden', 26); note.textContent = 'Eden gần đầy'; } },
          { label: 'Minor GC: copy object CÒN SỐNG sang Survivor, xoá phần còn lại (rất nhanh)', run: function () { clear(); dots('s0', 5); note.textContent = 'Đa số object "chết trẻ" → quét Eden nhỏ rất rẻ'; } },
          { label: 'Lặp nhiều vòng Minor GC; object sống dai được "thăng cấp" lên Old', run: function () { clear(); dots('eden', 14); dots('s0', 4); dots('old', 6); note.textContent = 'Sống qua nhiều lần GC → promote lên Old'; } },
          { label: 'Old đầy → Major/Full GC: chậm hơn nhiều, pause dài hơn', run: function () { clear(); dots('old', 3); note.textContent = 'Vì vậy: giữ object ngắn hạn thật sự ngắn hạn, tránh cache sai làm phình Old'; } },
        ],
      };
    },
  });
})();
