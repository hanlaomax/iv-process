/* Hình minh hoạ: AWS */
(function () {
  var D = window.IVDiagrams;
  if (!D) return;
  var S = D.S;

  /* ---------- VPC: public / private subnet ---------- */
  D.define('vpc-subnets', {
    title: 'VPC: public subnet (qua Internet Gateway) vs private subnet (qua NAT)',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 320', class: 'dg-svg' });
      svg.appendChild(S('rect', { x: 20, y: 20, width: 600, height: 280, rx: 12, class: 'dg-box' }));
      svg.appendChild(S('text', { x: 34, y: 40, class: 'dg-t dg-muted' }, ['VPC 10.0.0.0/16']));
      function box(id, x, y, w, h, label, sub) {
        var g = S('g', { id: id });
        g.appendChild(S('rect', { x: x, y: y, width: w, height: h, rx: 8, class: 'dg-box' }));
        g.appendChild(S('text', { x: x + w / 2, y: y + (sub ? 22 : h / 2 + 4), class: 'dg-t dg-t-mid' }, [label]));
        if (sub) g.appendChild(S('text', { x: x + w / 2, y: y + 40, class: 'dg-t dg-t-mid dg-muted' }, [sub]));
        return g;
      }
      svg.appendChild(box('pub', 45, 60, 250, 100, 'Public subnet', '10.0.1.0/24'));
      svg.appendChild(box('alb', 70, 110, 90, 34, 'ALB'));
      svg.appendChild(box('nat', 185, 110, 90, 34, 'NAT GW'));
      svg.appendChild(box('priv', 45, 190, 250, 90, 'Private subnet', '10.0.2.0/24'));
      svg.appendChild(box('ec2', 90, 230, 160, 34, 'EC2 (app) · RDS'));
      svg.appendChild(box('igw', 360, 60, 100, 40, 'Internet Gateway'));
      svg.appendChild(box('net', 500, 150, 100, 40, 'Internet'));
      [['e-igw-net', 'M460 80 L 500 160'], ['e-alb-igw', 'M160 110 C 300 60, 340 70, 360 78'],
       ['e-ec2-nat', 'M170 230 C 170 180, 230 160, 230 144'], ['e-nat-igw', 'M275 120 C 340 100, 350 90, 360 88'],
       ['e-net-alb', 'M500 165 C 350 260, 200 200, 130 144']].forEach(function (e) {
        svg.appendChild(S('path', { d: e[1], class: 'dg-link', id: e[0] }));
      });
      var note = S('text', { x: 320, y: 312, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(note);
      api.stage.appendChild(svg);
      function lit(ids, n) {
        svg.querySelectorAll('.dg-link').forEach(function (l) { l.classList.remove('dg-on'); l.style.stroke = ''; });
        svg.querySelectorAll('.dg-box').forEach(function (b) { b.classList.remove('dg-on'); });
        ids.forEach(function (id) { var el = svg.querySelector('#' + id); if (!el) return; var t = el.querySelector ? el.querySelector('rect,path') : el; (t || el).classList.add('dg-on'); });
        note.textContent = n || '';
      }
      return {
        reset: function () { lit([], 'Public/Private do route table quyết định — không phải thuộc tính subnet'); },
        steps: [
          { label: 'Internet → ALB: request từ ngoài đi qua Internet Gateway vào public subnet', run: function () { lit(['e-net-alb', 'e-alb-igw', 'igw', 'alb', 'pub'], 'Chỉ ALB ở public subnet nhận request từ internet'); } },
          { label: 'ALB chuyển tiếp tới EC2 trong PRIVATE subnet (không có IP public)', run: function () { lit(['alb', 'ec2', 'priv'], 'EC2 app không thể bị gọi trực tiếp từ internet'); } },
          { label: 'EC2 cần gọi ra ngoài (tải update, gọi API) → đi qua NAT Gateway', run: function () { lit(['ec2', 'e-ec2-nat', 'nat', 'e-nat-igw', 'igw'], 'NAT: outbound được, inbound thì KHÔNG'); } },
        ],
      };
    },
  });

  /* ---------- Auto Scaling (target tracking) ---------- */
  D.define('autoscaling', {
    title: 'Auto Scaling Group với target tracking (CPU 50%)',
    build: function (api) {
      var svg = S('svg', { viewBox: '0 0 640 260', class: 'dg-svg' });
      svg.appendChild(S('line', { x1: 40, y1: 200, x2: 600, y2: 200, class: 'dg-axis' }));
      svg.appendChild(S('line', { x1: 40, y1: 40, x2: 40, y2: 200, class: 'dg-axis' }));
      svg.appendChild(S('line', { x1: 40, y1: 120, x2: 600, y2: 120, class: 'dg-link', id: 'target' }));
      svg.querySelector('#target').style.strokeDasharray = '5 4';
      svg.appendChild(S('text', { x: 46, y: 116, class: 'dg-t dg-muted' }, ['mục tiêu CPU 50%']));
      var load = S('path', { class: 'dg-link dg-on', id: 'load', d: '' });
      svg.appendChild(load);
      var insts = S('g', { id: 'insts' });
      svg.appendChild(insts);
      var note = S('text', { x: 320, y: 240, class: 'dg-t dg-t-mid dg-muted' }, ['']);
      svg.appendChild(note);
      api.stage.appendChild(svg);
      function drawLoad(pts) {
        load.setAttribute('d', 'M' + pts.map(function (p) { return p[0] + ' ' + p[1]; }).join(' L '));
      }
      function drawInsts(n) {
        insts.textContent = '';
        for (var i = 0; i < n; i++) {
          insts.appendChild(S('rect', { x: 460 + i * 26, y: 40, width: 20, height: 40, rx: 4, class: 'dg-box dg-on' }));
        }
        insts.appendChild(S('text', { x: 460, y: 100, class: 'dg-t dg-muted' }, [n + ' instance']));
      }
      return {
        reset: function () { drawLoad([[40, 150], [200, 150], [400, 150], [600, 150]]); drawInsts(2); note.textContent = 'Baseline: 2 instance, CPU ~40%'; },
        steps: [
          { label: 'Traffic tăng → CPU vượt 50% → alarm kích hoạt scale-out', run: function () { drawLoad([[40, 150], [180, 150], [320, 70], [600, 70]]); drawInsts(2); note.textContent = 'CPU 75% > mục tiêu'; } },
          { label: 'ASG thêm instance → tải chia đều → CPU về gần mục tiêu', run: function () { drawLoad([[40, 70], [200, 90], [400, 118], [600, 120]]); drawInsts(4); note.textContent = '4 instance · CPU ~50%'; } },
          { label: 'Giờ thấp điểm: CPU tụt dưới mục tiêu → scale-in (bỏ bớt instance, có cooldown)', run: function () { drawLoad([[40, 120], [200, 140], [400, 155], [600, 158]]); drawInsts(2); note.textContent = 'Về 2 instance. Health check (ELB) tự thay instance hỏng'; } },
        ],
      };
    },
  });
})();
