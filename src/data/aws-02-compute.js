SS.addQuestions('aws', [
{
  cat: 'EC2',
  q: 'Các họ EC2 instance (instance family) và cách chọn?',
  answer:
    'Đặt tên: `m6i.xlarge` = họ `m`, thế hệ 6, biến thể `i` (Intel), kích thước `xlarge`.\n\n' +
    '- **General purpose (t, m)**: cân bằng CPU/RAM. `t` là burstable (tích luỹ CPU credit) cho tải nhẹ/không đều; `m` cho tải ổn định.\n' +
    '- **Compute optimized (c)**: tỉ lệ CPU cao — batch, encoding, game server, web tier.\n' +
    '- **Memory optimized (r, x)**: RAM lớn — DB in-memory, cache, phân tích.\n' +
    '- **Storage optimized (i, d)**: NVMe local throughput cao.\n' +
    '- **Accelerated (p, g, inf)**: GPU/chip AI.',
  essence:
    'Chọn theo tài nguyên **giới hạn** (bottleneck) của workload: CPU-bound → `c`; RAM-bound → `r`; đều → `m`; tải thất thường nhẹ → `t`. Đo trước khi chọn.',
  example:
    'API Java heap 12GB, CPU trung bình 30%: `r6i.large` (16GB RAM) hợp hơn `c6i.large` (4GB — OOM) hay `m6i.xlarge` (thừa CPU, tốn tiền). Dev/test server ít traffic: `t3.small` burstable.',
  viz: {
    type: 'quadrant',
    title: 'Chọn họ EC2 theo bottleneck của workload',
    x: ['CPU thấp', 'CPU cao'],
    y: ['RAM thấp', 'RAM cao'],
    items: [
      { label: 't (burstable) — tải nhẹ/không đều', qx: 0, qy: 0 },
      { label: 'c (compute) — batch, encoding, web', qx: 1, qy: 0 },
      { label: 'r / x (memory) — DB in-memory, cache', qx: 0, qy: 1 },
      { label: 'm (general) — tải ổn định, cân bằng', qx: 1, qy: 1 },
    ],
  },
},
{
  cat: 'EC2',
  q: 'Các mô hình giá EC2: On-Demand, Reserved, Savings Plans, Spot?',
  answer:
    '- **On-Demand**: trả theo giây, không cam kết. Cho tải không đoán được, ngắn hạn, hoặc để đo baseline.\n' +
    '- **Reserved Instances (RI)**: cam kết 1–3 năm cho một cấu hình cụ thể → giảm tới ~72%. Cứng nhắc (theo family/region).\n' +
    '- **Savings Plans**: cam kết mức chi tiêu ($/giờ) 1–3 năm → giảm tương tự RI nhưng **linh hoạt** across family/region/OS; "Compute Savings Plans" còn áp cho Fargate/Lambda.\n' +
    '- **Spot**: dùng capacity dư, giảm tới ~90%, nhưng AWS **có thể thu hồi** với thông báo 2 phút.',
  essence:
    'On-Demand cho phần thay đổi; Savings Plans/RI cho phần baseline ổn định (cam kết đổi lấy giảm giá); Spot cho phần chịu được gián đoạn. Kết hợp cả ba để tối ưu chi phí.',
  example:
    'Fleet 20 instance: 8 instance baseline 24/7 → Compute Savings Plan 1 năm. Phần scale theo giờ cao điểm → On-Demand. Job xử lý ảnh async, retry được → Spot (tiết kiệm ~80%).',
  viz: {
    type: 'compare',
    cols: ['On-Demand', 'Reserved (RI)', 'Savings Plans', 'Spot'],
    rows: [
      ['Cam kết', 'không', '1–3 năm, cấu hình cụ thể', '1–3 năm, mức chi tiêu $/h'],
      ['Giảm giá', '0', 'tới ~72%', 'tương tự RI', 'tới ~90%'],
      ['Linh hoạt', 'cao nhất', 'cứng (family/region)', 'across family/region/OS, cả Fargate/Lambda', 'AWS thu hồi (báo 2 phút)'],
      ['Dùng cho', 'phần thay đổi / đo baseline', 'baseline (RI cũ)', 'baseline ổn định', 'chịu được gián đoạn'],
    ],
  },
},
{
  cat: 'EC2',
  q: 'Spot instance bị thu hồi — làm sao thiết kế để chịu được?',
  answer:
    'AWS gửi **interruption notice** qua instance metadata / EventBridge, ~2 phút trước khi thu hồi.\n\n' +
    'Thiết kế:\n' +
    '- Chỉ chạy **workload chịu gián đoạn**: batch, CI, xử lý hàng đợi, stateless web (sau LB).\n' +
    '- Xử lý notice: drain connection, checkpoint tiến độ, trả task về queue.\n' +
    '- **Diversify**: dùng nhiều instance type + AZ trong một Spot fleet / ASG với `capacity-optimized` allocation → giảm khả năng bị thu hồi hàng loạt.\n' +
    '- Kết hợp `On-Demand base + Spot` trong ASG.',
  essence:
    'Spot rẻ vì "mượn" capacity — kiến trúc phải coi việc mất instance là bình thường: stateless, checkpoint, đa dạng hoá, và có phần On-Demand làm sàn.',
  example:
    'CI runner trên Spot: mỗi job đọc từ SQS, nếu nhận interruption notice thì để job chạy dở quay lại queue (visibility timeout hết) → job khác pick trên instance mới. Kết quả: giảm 85% chi phí CI, thỉnh thoảng job chậm vài phút.',
  viz: {
    type: 'flow',
    title: 'Chịu được Spot bị thu hồi',
    nodes: ['interruption notice (~2 phút, IMDS/EventBridge)', 'drain connection + checkpoint tiến độ', 'trả task về queue', 'diversify: nhiều instance type + AZ (capacity-optimized)'],
    steps: [
      { to: 1, label: 'chỉ chạy workload chịu gián đoạn: batch, CI, xử lý queue, stateless web sau LB' },
      { to: 2, label: 'job dở quay lại queue → instance mới pick lại' },
      { to: 3, label: 'kết hợp On-Demand base + Spot trong ASG làm sàn' },
    ],
  },
},
{
  cat: 'EC2',
  q: 'AMI, user data và Instance Metadata Service (IMDSv2) là gì?',
  answer:
    '- **AMI (Amazon Machine Image)**: ảnh đĩa gốc để launch instance — OS + phần mềm cài sẵn. "Golden AMI" (build bằng Packer) giúp khởi động nhanh, nhất quán.\n' +
    '- **User data**: script chạy **lần đầu boot** (cloud-init) — cài agent, đăng ký vào cluster, kéo config.\n' +
    '- **IMDS**: endpoint `169.254.169.254` cho instance tự truy vấn metadata (instance id, region) và **credential của instance role**.\n' +
    '- **IMDSv2**: bắt buộc lấy token (PUT) trước khi đọc → chống tấn công SSRF đọc trộm credential. Nên ép `HttpTokens=required`.',
  essence:
    'AMI = trạng thái ban đầu; user data = tuỳ biến lúc boot; IMDS = cách instance biết "mình là ai" và lấy credential. IMDSv2 vá lỗ hổng SSRF kinh điển (Capital One breach).',
  example:
    'Golden AMI có sẵn JDK + agent monitoring. User data: `aws s3 cp s3://config/app.yml /etc/app/ && systemctl start app`. Enforce IMDSv2 để một bug SSRF trong app không đọc được credential role qua `169.254.169.254`.',
  viz: {
    type: 'tree',
    title: 'Khởi động EC2',
    root: {
      label: 'AMI = trạng thái ban đầu; user data = tuỳ biến lúc boot; IMDS = "mình là ai"',
      children: [
        { label: 'AMI', note: 'ảnh đĩa gốc: OS + phần mềm. "Golden AMI" (Packer) → khởi động nhanh, nhất quán' },
        { label: 'User data', note: 'script chạy lần đầu boot (cloud-init): cài agent, đăng ký cluster' },
        { label: 'IMDS (169.254.169.254)', note: 'instance tự truy vấn metadata + credential của instance role' },
        { label: 'IMDSv2', note: 'bắt buộc token (PUT) trước khi đọc → chống SSRF (Capital One breach). HttpTokens=required' },
      ],
    },
  },
},
{
  cat: 'Storage',
  q: 'Các loại EBS volume (gp3, io2, st1, sc1) — chọn khi nào?',
  answer:
    '- **gp3** (SSD, general): baseline 3.000 IOPS / 125 MB/s, **tăng IOPS/throughput độc lập với dung lượng** (khác gp2). Mặc định cho hầu hết workload.\n' +
    '- **io2 / io2 Block Express** (SSD, provisioned IOPS): IOPS cao và ổn định, durability 99.999%, hỗ trợ Multi-Attach. Cho DB đòi hỏi khắt khe.\n' +
    '- **st1** (HDD, throughput): rẻ, tối ưu đọc/ghi tuần tự lớn — log, big data, data warehouse.\n' +
    '- **sc1** (HDD, cold): rẻ nhất, dữ liệu truy cập hiếm.',
  essence:
    'SSD (gp3/io2) cho random I/O và latency thấp; HDD (st1/sc1) cho throughput tuần tự giá rẻ. gp3 tách IOPS khỏi size là lý do nên migrate từ gp2.',
  example:
    'DB Postgres OLTP: gp3 với 200GB nhưng provision 10.000 IOPS (không cần mua 3TB như gp2). Volume chứa log Kafka: st1 3TB — tuần tự, rẻ, throughput cao. Backup ít đọc lại: sc1.',
  viz: {
    type: 'compare',
    cols: ['gp3 (SSD)', 'io2 (SSD provisioned)', 'st1 (HDD)', 'sc1 (HDD cold)'],
    rows: [
      ['I/O', 'random, latency thấp', 'IOPS cao & ổn định, 99.999% durability', 'tuần tự lớn', 'tuần tự, truy cập hiếm'],
      ['Đặc điểm', 'tăng IOPS/throughput độc lập với size', 'Multi-Attach', 'rẻ', 'rẻ nhất'],
      ['Dùng cho', 'mặc định hầu hết workload', 'DB khắt khe', 'log, big data, warehouse', 'archive'],
    ],
  },
},
{
  cat: 'Storage',
  q: 'Instance store và EBS khác nhau thế nào?',
  answer:
    '- **EBS**: volume mạng, **tồn tại độc lập** với instance — stop/start/terminate instance thì dữ liệu vẫn còn (trừ khi `DeleteOnTermination`). Snapshot được, đổi type được, di chuyển giữa instance (cùng AZ).\n' +
    '- **Instance store**: đĩa NVMe **gắn vật lý** vào host — latency cực thấp, throughput cao, **miễn phí**, nhưng **mất sạch dữ liệu** khi instance stop/terminate/host fail (ephemeral).',
  essence:
    'EBS = lưu trữ bền, linh hoạt, có phí. Instance store = scratch disk siêu nhanh, dữ liệu biến mất khi instance dừng. Chỉ để dữ liệu tái tạo được trên instance store.',
  example:
    'Database cache/tempdb, Kafka broker với replication, Elasticsearch data node (có replica shard): dùng instance store cho tốc độ. Dữ liệu nguồn của sự thật (RDS, EBS volume gốc): luôn EBS.',
  viz: {
    type: 'compare',
    cols: ['EBS', 'Instance store'],
    rows: [
      ['Kiểu', 'volume mạng, tồn tại độc lập', 'đĩa NVMe gắn vật lý vào host'],
      ['Khi stop/terminate instance', 'dữ liệu vẫn còn (trừ DeleteOnTermination)', 'MẤT SẠCH (ephemeral)'],
      ['Tốc độ', 'tốt', 'cực thấp latency, throughput cao'],
      ['Phí', 'có', 'miễn phí'],
      ['Dùng cho', 'nguồn sự thật (RDS, volume gốc)', 'scratch: cache, tempdb, data node có replica'],
    ],
  },
},
{
  cat: 'Storage',
  q: 'EBS snapshot hoạt động thế nào?',
  answer:
    'Snapshot là bản sao **incremental** của volume, lưu trên S3 (do AWS quản lý, không thấy trong S3 của bạn). Lần đầu copy toàn bộ block đã dùng; lần sau chỉ copy block **thay đổi** kể từ snapshot trước.\n\n' +
    'Khôi phục: tạo volume mới từ snapshot (lazy-load block từ S3, có thể "warm up" bằng Fast Snapshot Restore). Copy snapshot sang region khác cho DR. Chia sẻ với account khác.',
  essence:
    'Snapshot incremental + lưu ở S3 = backup rẻ và có thể chuyển vùng. Nó là nền tảng cho AMI (AMI = snapshot(s) + metadata) và DR của EC2.',
  example:
    'Data Lifecycle Manager: tự snapshot mọi volume có tag `backup=daily` lúc 2h sáng, giữ 7 bản, copy sang `us-west-2`. Sự cố region chính: launch instance từ AMI + attach volume từ snapshot đã copy.',
  viz: {
    type: 'flow',
    title: 'EBS snapshot — incremental, lưu ở S3 do AWS quản',
    nodes: ['snapshot lần đầu: copy toàn bộ block đã dùng', 'snapshot sau: chỉ copy block THAY ĐỔI', 'lưu trên S3 (không thấy trong S3 của bạn)', 'khôi phục: tạo volume mới, lazy-load block'],
    steps: [
      { to: 1, label: 'backup rẻ vì chỉ lưu phần chênh lệch' },
      { to: 3, label: 'warm up bằng Fast Snapshot Restore; copy sang region khác cho DR' },
      { to: 3, label: 'AMI = snapshot(s) + metadata' },
    ],
  },
},
{
  cat: 'Auto Scaling',
  diagram: 'autoscaling',
  q: 'Auto Scaling Group: scaling policy, health check, lifecycle hook?',
  answer:
    '**Scaling policies**:\n' +
    '- **Target tracking**: giữ một metric ở giá trị đích (CPU 50%, hoặc request/target của ALB) — đơn giản, nên dùng.\n' +
    '- **Step / simple scaling**: theo ngưỡng CloudWatch alarm.\n' +
    '- **Scheduled**: theo lịch (biết trước cao điểm).\n\n' +
    '**Health check**: EC2 (instance status) hoặc **ELB** (target health) — ASG thay instance unhealthy.\n\n' +
    '**Lifecycle hook**: tạm dừng instance ở trạng thái `Pending:Wait` / `Terminating:Wait` để chạy hành động (cài đặt, drain connection, đẩy log) trước khi vào/ra service.',
  essence:
    'ASG duy trì "số lượng mong muốn" instance khoẻ mạnh và điều chỉnh theo tải. Target tracking cho scaling; ELB health check cho tự chữa lành; lifecycle hook cho bàn giao sạch.',
  example:
    'ASG web tier: target tracking giữ `ALBRequestCountPerTarget = 1000`, health check = ELB, lifecycle hook `Terminating:Wait` 120s để deregister khỏi ALB và xử lý nốt request đang chạy trước khi tắt.',
},
{
  cat: 'Auto Scaling',
  q: 'Launch template khác launch configuration thế nào?',
  answer:
    '**Launch configuration** (cũ): bất biến, phải tạo mới để đổi bất kỳ tham số nào, không hỗ trợ tính năng EC2 mới, chỉ dùng với ASG.\n\n' +
    '**Launch template** (khuyến nghị): có **versioning**, hỗ trợ mọi tính năng EC2 mới (mixed instances policy, Spot+On-Demand, T2/T3 unlimited, IMDSv2 enforcement, tag on launch), dùng được cả ngoài ASG (RunInstances, Spot Fleet).',
  essence:
    'Launch template là bản kế nhiệm có version của launch configuration. AWS đã ngừng phát triển launch configuration — dùng template cho mọi thứ mới.',
  example:
    'Mixed instances policy trong ASG: launch template định nghĩa base, ASG khai báo "20% On-Demand, 80% Spot, phân bổ trên `m6i.large`, `m5.large`, `m6a.large`". Launch configuration không làm được điều này.',
  viz: {
    type: 'compare',
    cols: ['Launch configuration (cũ)', 'Launch template (khuyến nghị)'],
    rows: [
      ['Versioning', 'không — tạo mới để đổi', 'có'],
      ['Tính năng EC2 mới', 'không', 'tất cả: mixed instances, Spot+On-Demand, IMDSv2 enforce, tag on launch'],
      ['Dùng ở đâu', 'chỉ ASG', 'ASG + RunInstances + Spot Fleet'],
      ['Trạng thái', 'AWS ngừng phát triển', 'dùng cho mọi thứ mới'],
    ],
  },
},
{
  cat: 'Load Balancing',
  q: 'ALB, NLB và GWLB khác nhau ra sao?',
  answer:
    '- **ALB (Application LB, layer 7)**: hiểu HTTP/HTTPS/gRPC/WebSocket. Routing theo **path, host, header, query, method**; target group; TLS termination; tích hợp WAF, Cognito auth. Cho web app, microservice, API.\n' +
    '- **NLB (Network LB, layer 4)**: TCP/UDP/TLS, hiệu năng cực cao, latency siêu thấp, **static IP / Elastic IP**, giữ nguyên source IP. Cho traffic non-HTTP, throughput lớn, cần IP cố định.\n' +
    '- **GWLB (Gateway LB)**: chèn appliance bên thứ ba (firewall, IDS/IPS) vào đường đi của traffic một cách trong suốt.',
  essence:
    'ALB = định tuyến thông minh ở tầng ứng dụng. NLB = ống dẫn L4 nhanh, IP tĩnh, giữ source IP. GWLB = "bump in the wire" cho security appliance.',
  example:
    'API REST + gRPC nội bộ: ALB với path routing (`/api/*` → service A, `/grpc.*` → service B). Game server UDP hoặc MQTT broker cần IP whitelist của khách hàng: NLB với Elastic IP.',
  viz: {
    type: 'compare',
    cols: ['ALB (L7)', 'NLB (L4)', 'GWLB'],
    rows: [
      ['Hiểu', 'HTTP/HTTPS/gRPC/WebSocket', 'TCP/UDP/TLS', 'gói tin (GENEVE)'],
      ['Routing', 'path, host, header, query, method', '—', 'trong suốt'],
      ['Đặc điểm', 'WAF, Cognito auth, TLS termination', 'IP tĩnh/EIP, giữ source IP, latency siêu thấp', 'chèn appliance bên thứ ba (firewall, IDS)'],
      ['Cho', 'web app, microservice, API', 'non-HTTP, throughput lớn, cần IP cố định', 'security appliance "bump in the wire"'],
    ],
  },
},
{
  cat: 'Load Balancing',
  q: 'ALB routing, target group và sticky session?',
  answer:
    '**Listener rule** đánh giá theo thứ tự priority: điều kiện (host/path/header…) → hành động (forward tới target group, redirect, fixed response, authenticate).\n\n' +
    '**Target group**: nhóm target (EC2/IP/Lambda) + health check + thuật toán (round robin / least outstanding requests) + deregistration delay (connection draining).\n\n' +
    '**Sticky session**: cookie (`AWSALB` do LB tạo, hoặc app cookie) ghim client vào một target. Chỉ dùng khi app **có state cục bộ** — tốt hơn là làm app stateless (session ở Redis/DynamoDB).',
  essence:
    'ALB = tập rule "nếu request khớp X thì gửi tới target group Y". Sticky session là giải pháp chữa cháy cho app stateful; đích đến nên là app không cần sticky.',
  example:
    'Rule: `Host = admin.acme.com` → target group `admin` (2 instance); `Path = /uploads/*` + `Method = POST` → target group `upload`. Tắt stickiness sau khi chuyển session sang ElastiCache → deploy/scale không làm rớt phiên đăng nhập.',
  viz: {
    type: 'tree',
    title: 'ALB routing',
    root: {
      label: 'Tập rule "nếu request khớp X thì gửi tới target group Y"',
      children: [
        { label: 'Listener rule', note: 'đánh giá theo priority: điều kiện (host/path/header) → hành động (forward, redirect, auth)' },
        { label: 'Target group', note: 'target (EC2/IP/Lambda) + health check + thuật toán + deregistration delay (draining)' },
        { label: 'Sticky session', note: 'cookie ghim client vào một target — chỉ khi app có state cục bộ; tốt hơn: app stateless (session ở Redis)' },
      ],
    },
  },
},
{
  cat: 'Lambda',
  q: 'Lambda: mô hình thực thi và cold start?',
  answer:
    'Lambda chạy code trong **execution environment** (microVM Firecracker). Vòng đời:\n' +
    '1. **Cold start**: tạo môi trường mới → tải code → khởi tạo runtime + code ngoài handler (`init`). Chậm hơn (chục ms tới vài giây với JVM/.NET).\n' +
    '2. **Warm invoke**: tái dùng môi trường có sẵn → chỉ chạy handler, rất nhanh.\n\n' +
    'Mỗi môi trường xử lý **một request tại một thời điểm**; concurrency = số môi trường song song.\n\n' +
    'Giảm cold start: runtime nhẹ (Node/Python/Go), giảm package size, khởi tạo client/pool ở scope `init` (tái dùng), SnapStart (Java), provisioned concurrency.',
  essence:
    'Lambda tái sử dụng môi trường giữa các lần gọi — code ngoài handler chạy một lần mỗi môi trường. Cold start là cái giá của việc tạo môi trường mới khi scale hoặc sau thời gian nhàn rỗi.',
  example:
    'Kết nối DB: đặt `const pool = createPool()` **ngoài** handler → tái dùng qua nhiều invoke trên cùng môi trường. Đặt trong handler → tạo pool mỗi request → cạn connection DB.',
  viz: {
    type: 'flow',
    title: 'Lambda execution environment (microVM Firecracker)',
    nodes: ['cold start: tạo môi trường mới', 'tải code', 'init: runtime + code NGOÀI handler', 'chạy handler', 'warm invoke: chỉ chạy handler'],
    steps: [
      { to: 2, label: 'code ngoài handler chạy MỘT LẦN mỗi môi trường — đặt pool/client ở đây để tái dùng' },
      { to: 3, label: 'mỗi môi trường xử lý một request tại một thời điểm; concurrency = số môi trường' },
      { to: 4, label: 'giảm cold start: runtime nhẹ, giảm package, SnapStart (Java), provisioned concurrency' },
    ],
  },
},
{
  cat: 'Lambda',
  q: 'Reserved concurrency và provisioned concurrency khác nhau?',
  answer:
    '- **Reserved concurrency**: **giới hạn trên** số instance đồng thời của một function, và **đảm bảo** phần đó cho nó (lấy từ pool chung của account). Đặt = 0 để "tắt" function. Bảo vệ downstream (DB) khỏi bị function scale quá tay, và ngăn function này ăn hết concurrency của function khác.\n' +
    '- **Provisioned concurrency**: **khởi tạo sẵn** N môi trường (đã init, warm) → không cold start cho N request đồng thời đầu tiên. Tính phí kể cả khi không dùng.',
  essence:
    'Reserved = "trần và sàn về **số lượng**" (kiểm soát blast radius và chia phần). Provisioned = "warm sẵn để **không cold start**" (kiểm soát latency). Hai mục đích khác nhau.',
  example:
    'Function ghi vào RDS (pool 100 connection): đặt reserved concurrency = 50 để Lambda không mở > 50 connection. API nhạy latency, spike lúc 9h sáng: provisioned concurrency = 20 + auto scaling theo lịch để p99 không bị cold start.',
  viz: {
    type: 'compare',
    cols: ['Reserved concurrency', 'Provisioned concurrency'],
    rows: [
      ['Kiểm soát', 'SỐ LƯỢNG (trần và sàn)', 'LATENCY (không cold start)'],
      ['Làm gì', 'giới hạn trên + đảm bảo phần đó (lấy từ pool account)', 'khởi tạo sẵn N môi trường warm'],
      ['Chi phí', 'không thêm', 'tính phí kể cả khi không dùng'],
      ['Dùng để', 'bảo vệ downstream (DB), chia phần với function khác; =0 để tắt', 'p99 ổn định cho function nhạy latency'],
    ],
  },
},
{
  cat: 'Lambda',
  q: 'Các giới hạn quan trọng của Lambda?',
  answer:
    '- **Timeout**: tối đa **15 phút**. Tác vụ dài hơn → Step Functions, ECS/Fargate, hoặc chia nhỏ.\n' +
    '- **Memory**: 128MB–10.240MB; CPU **tỉ lệ thuận** với memory (tăng RAM = tăng vCPU).\n' +
    '- **Payload**: 6MB (sync invoke), 256KB (async/event). Lớn hơn → dùng S3 + truyền tham chiếu.\n' +
    '- **/tmp**: 512MB mặc định, cấu hình tới 10GB.\n' +
    '- **Deployment package**: 50MB (zip) / 250MB (giải nén) / 10GB (container image).\n' +
    '- **Concurrency**: 1.000/region mặc định (tăng được).',
  essence:
    'Lambda hợp cho tác vụ **ngắn, event-driven, bùng nổ**. Chạm timeout 15 phút hay payload lớn là tín hiệu nên đổi sang Fargate/Step Functions.',
  example:
    'Xử lý video 20 phút: không phải việc của Lambda. Dùng Lambda để **nhận event S3** và **submit** một ECS Fargate task hoặc MediaConvert job, rồi một Lambda khác xử lý event "hoàn thành".',
  viz: {
    type: 'tree',
    title: 'Giới hạn Lambda — dấu hiệu nên đổi sang Fargate/Step Functions',
    root: {
      label: 'Hợp cho tác vụ ngắn, event-driven, bùng nổ',
      children: [
        { label: 'Timeout tối đa 15 phút' },
        { label: 'Memory 128MB–10GB', note: 'CPU tỉ lệ thuận với memory' },
        { label: 'Payload 6MB sync / 256KB async', note: 'lớn hơn → S3 + tham chiếu' },
        { label: '/tmp 512MB (tới 10GB)' },
        { label: 'Package 50MB zip / 250MB giải nén / 10GB container' },
        { label: 'Concurrency 1000/region (tăng được)' },
      ],
    },
  },
},
{
  cat: 'Containers',
  q: 'ECS, EKS và Fargate — chọn cái nào?',
  answer:
    '- **ECS (Elastic Container Service)**: orchestrator của AWS, đơn giản, tích hợp sâu (ALB, IAM task role, CloudWatch). Ít khái niệm, vận hành nhẹ.\n' +
    '- **EKS (managed Kubernetes)**: chuẩn K8s, hệ sinh thái lớn (Helm, operators), đa cloud/portable, nhưng phức tạp và tốn công vận hành hơn.\n' +
    '- **Fargate**: chế độ **serverless compute** cho cả ECS và EKS — không quản lý EC2 node, trả theo vCPU/RAM của task. Đổi lại giá/đơn vị cao hơn và một số hạn chế (không DaemonSet, không GPU trên EKS Fargate, không privileged).',
  essence:
    'ECS vs EKS là "đơn giản, thuần AWS" vs "chuẩn K8s, portable, phức tạp". Fargate vs EC2 là "không quản node, trả theo task" vs "quản node, rẻ hơn khi tải cao và ổn định".',
  example:
    'Team nhỏ, toàn AWS, vài chục service: **ECS on Fargate** — deploy nhanh, không lo node. Công ty có nền tảng K8s, cần Istio/ArgoCD/operator, chạy đa cloud: **EKS**, dùng EC2 node cho phần baseline + Fargate cho spike.',
  viz: {
    type: 'compare',
    cols: ['ECS', 'EKS', 'Fargate (mode)'],
    rows: [
      ['Là gì', 'orchestrator của AWS, đơn giản', 'managed Kubernetes chuẩn', 'compute serverless cho ECS/EKS'],
      ['Tích hợp / hệ sinh thái', 'sâu, thuần AWS', 'Helm, operators, portable đa cloud', '—'],
      ['Vận hành', 'nhẹ', 'phức tạp, tốn công', 'không quản EC2 node'],
      ['Đánh đổi', '—', '—', 'giá/đơn vị cao hơn, một số hạn chế (no DaemonSet, no GPU EKS Fargate)'],
    ],
  },
},
{
  cat: 'Containers',
  q: 'ECS task definition, service và capacity provider?',
  answer:
    '- **Task definition**: "công thức" cho một task — container image(s), CPU/memory, port mapping, env, secrets, **task role** (quyền IAM của container), log config. Có version.\n' +
    '- **Task**: một lần chạy của task definition.\n' +
    '- **Service**: duy trì N task chạy liên tục, tích hợp ALB, rolling/blue-green deploy, auto scaling.\n' +
    '- **Capacity provider**: nguồn compute cho task — `FARGATE`, `FARGATE_SPOT`, hoặc ASG của EC2. Cho phép trộn (ví dụ 1 task base On-Demand + phần còn lại Fargate Spot).',
  essence:
    'Task definition = image + tài nguyên + quyền. Service = "giữ cho N bản chạy và cập nhật an toàn". Capacity provider = quyết định task chạy trên hạ tầng nào.',
  example:
    'Service `api`: task def yêu cầu 0.5 vCPU / 1GB, task role cho phép đọc Secrets Manager + ghi SQS, desired count 4, ALB target group, capacity provider strategy `FARGATE:1, FARGATE_SPOT:3` (25% ổn định, 75% rẻ).',
  viz: {
    type: 'tree',
    title: 'ECS',
    root: {
      label: 'Task def = công thức; Service = giữ N bản + cập nhật an toàn; Capacity provider = chạy trên đâu',
      children: [
        { label: 'Task definition', note: 'image, CPU/memory, port, env, secrets, task role (quyền IAM), log config — có version' },
        { label: 'Task', note: 'một lần chạy của task definition' },
        { label: 'Service', note: 'duy trì N task, ALB, rolling/blue-green, auto scaling' },
        { label: 'Capacity provider', note: 'FARGATE / FARGATE_SPOT / ASG EC2 — trộn được' },
      ],
    },
  },
},
{
  cat: 'Containers',
  q: 'ECR và quét lỗ hổng image?',
  answer:
    'ECR (Elastic Container Registry): registry Docker riêng tư, tích hợp IAM (không cần credential riêng), lifecycle policy (xoá image cũ), immutable tags, replication cross-region.\n\n' +
    '**Image scanning**:\n' +
    '- **Basic**: quét CVE khi push (dùng Clair).\n' +
    '- **Enhanced** (Amazon Inspector): quét liên tục cả OS packages và **application dependencies** (npm, pip, Maven…), tự quét lại khi có CVE mới, đẩy finding vào Security Hub.',
  essence:
    'ECR là nơi lưu image gắn với IAM. Enhanced scanning biến registry thành một điểm kiểm soát bảo mật liên tục — không chỉ quét lúc push mà quét lại khi thế giới phát hiện CVE mới.',
  example:
    'Pipeline: build image → push ECR → Inspector quét → nếu có CVE `CRITICAL` thì fail deploy. Vài tuần sau, CVE mới trong `log4j` được công bố → Inspector tự đánh dấu các image đang chạy chứa nó, gửi alert.',
  viz: {
    type: 'compare',
    cols: ['Basic scanning', 'Enhanced (Amazon Inspector)'],
    rows: [
      ['Khi nào quét', 'lúc push', 'liên tục — tự quét lại khi có CVE mới'],
      ['Quét gì', 'CVE OS packages (Clair)', 'OS packages + application dependencies (npm, pip, Maven)'],
      ['Tích hợp', '—', 'đẩy finding vào Security Hub'],
    ],
  },
},
{
  cat: 'EC2',
  q: 'Placement group là gì? Có mấy loại?',
  answer:
    '- **Cluster**: dồn instance vào cùng một rack/AZ → mạng độ trễ thấp, băng thông cao (tới 100 Gbps) giữa các instance. Cho HPC, tính toán phân tán chặt chẽ. Rủi ro: mất rack là mất cả nhóm.\n' +
    '- **Spread**: mỗi instance trên một rack riêng (tối đa 7/AZ) → cách ly lỗi phần cứng tối đa. Cho số ít instance quan trọng.\n' +
    '- **Partition**: chia thành các partition, mỗi partition trên tập rack riêng (tối đa 7/AZ) → cân bằng giữa hiệu năng và cách ly. Cho HDFS, Kafka, Cassandra.',
  essence:
    'Placement group điều khiển instance được đặt **gần nhau** (cluster: nhanh) hay **tách xa nhau** (spread: an toàn) hay **theo nhóm** (partition: cho hệ phân tán nhận biết topology).',
  example:
    'Cụm Kafka 12 broker: partition placement group với 3 partition → mỗi partition một tập rack; đặt replica của mỗi Kafka partition trải qua các partition placement khác nhau → mất một rack chỉ mất 1/3 broker.',
  viz: {
    type: 'compare',
    cols: ['Cluster', 'Spread', 'Partition'],
    rows: [
      ['Vị trí', 'dồn cùng rack/AZ', 'mỗi instance một rack riêng (≤ 7/AZ)', 'các partition trên tập rack riêng'],
      ['Ưu', 'mạng tới 100 Gbps, latency thấp', 'cách ly lỗi phần cứng tối đa', 'cân bằng hiệu năng ↔ cách ly'],
      ['Cho', 'HPC, tính toán phân tán chặt', 'số ít instance quan trọng', 'HDFS, Kafka, Cassandra'],
    ],
  },
},
{
  cat: 'EC2',
  q: 'Status check của EC2 và auto recovery?',
  answer:
    'EC2 có hai status check:\n' +
    '- **System status check**: sức khoẻ hạ tầng AWS bên dưới instance (host, mạng, nguồn điện). Fail → thường tự khắc phục bằng cách **di chuyển instance sang host khác** (auto recovery) — giữ nguyên id, private IP, EIP, EBS.\n' +
    '- **Instance status check**: sức khoẻ của OS/cấu hình instance (kernel panic, hết bộ nhớ, network config sai). Fail → bạn phải sửa (thường reboot/rebuild).\n\n' +
    'Bật auto recovery qua CloudWatch alarm `StatusCheckFailed_System` hành động `recover`, hoặc mặc định với instance thế hệ mới.',
  essence:
    'System check = lỗi phía AWS (AWS/auto-recovery lo). Instance check = lỗi phía bạn (OS/app, bạn lo). Auto recovery xử lý hỏng phần cứng mà không mất danh tính instance.',
  example:
    'Host vật lý chạy instance DB bị lỗi phần cứng lúc nửa đêm: `StatusCheckFailed_System` → auto recovery di chuyển instance sang host khoẻ, cùng EBS volume, khởi động lại trong vài phút — không cần con người, không mất dữ liệu.',
  viz: {
    type: 'compare',
    cols: ['System status check', 'Instance status check'],
    rows: [
      ['Kiểm tra', 'hạ tầng AWS bên dưới (host, mạng, điện)', 'OS/cấu hình instance (kernel panic, hết RAM, network sai)'],
      ['Fail → ai lo', 'AWS — auto recovery di chuyển sang host khác (giữ id, IP, EIP, EBS)', 'bạn — thường reboot/rebuild'],
      ['Bật auto recovery', 'CloudWatch alarm StatusCheckFailed_System → recover', '—'],
    ],
  },
},
{
  cat: 'EC2',
  q: 'AWS Graviton (ARM) mang lại lợi ích gì? Cần lưu ý gì khi migrate?',
  answer:
    'Graviton là CPU ARM do AWS thiết kế (`m7g`, `c7g`, `r7g`…). Ưu điểm: **giá/hiệu năng tốt hơn ~20–40%** so với x86 tương đương, tiêu thụ điện thấp hơn (tốt cho pillar Sustainability).\n\n' +
    'Lưu ý migrate:\n' +
    '- Cần **build lại** artifact cho `arm64` (Docker multi-arch, hoặc binary ARM).\n' +
    '- Kiểm tra thư viện native, agent, extension có bản ARM.\n' +
    '- Ngôn ngữ interpreted/JVM thường "chỉ chạy"; C/C++/Rust cần recompile.\n' +
    '- Benchmark lại — lợi ích thực tế thay đổi theo workload.',
  essence:
    'Graviton là "cùng công việc, ít tiền hơn" nếu stack của bạn chạy được trên ARM. Rào cản là build pipeline đa kiến trúc và dependency native, không phải hiệu năng.',
  example:
    'Service Java + Docker: đổi base image sang `arm64`, thêm `--platform linux/arm64` vào buildx, đổi task sang `c7g` → hoá đơn compute giảm ~30%, latency không đổi. Một Lambda dùng thư viện `sharp` (native) phải chờ bản ARM.',
  viz: {
    type: 'tree',
    title: 'AWS Graviton (ARM) — "cùng công việc, ít tiền hơn"',
    root: {
      label: 'Rào cản là build pipeline đa kiến trúc + dependency native, không phải hiệu năng',
      children: [
        { label: 'Giá/hiệu năng tốt hơn ~20–40% so với x86', note: 'điện thấp hơn — tốt cho Sustainability' },
        { label: 'Cần build lại artifact cho arm64', note: 'Docker multi-arch / binary ARM' },
        { label: 'Kiểm tra thư viện native, agent, extension có bản ARM' },
        { label: 'JVM/interpreted thường "chỉ chạy"; C/C++/Rust cần recompile' },
        { label: 'Benchmark lại — lợi ích thực tế thay đổi theo workload' },
      ],
    },
  },
},
]);
