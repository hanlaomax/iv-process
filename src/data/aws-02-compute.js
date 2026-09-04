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
  demo: [
    {
      lang: "bash",
      title: "Đọc tên instance và chọn theo nút thắt",
      code:
        "# Cấu trúc tên: m6i.2xlarge\n" +
        "#   m  = họ (mục đích sử dụng)\n" +
        "#   6  = thế hệ (càng mới càng rẻ/hiệu năng tốt hơn — hầu như luôn nên lên đời)\n" +
        "#   i  = biến thể: i=Intel, a=AMD, g=Graviton(ARM), d=đĩa NVMe, n=mạng nhanh\n" +
        "#   2xlarge = kích thước (large=2 vCPU, xlarge=4, 2xlarge=8...)\n" +
        "\n" +
        "# T (t3, t4g)  — burstable, tích luỹ CPU credit. RẺ NHẤT cho tải thấp/không đều.\n" +
        "#                BẪY: hết credit -> bị bóp CPU thê thảm. Đừng dùng cho prod ổn định.\n" +
        "# M (m6i, m7g) — cân bằng, tỉ lệ 4GB RAM/vCPU. Mặc định khi chưa biết chọn gì.\n" +
        "# C (c6i, c7g) — nhiều CPU, 2GB RAM/vCPU. Xử lý ảnh, mã hoá, batch, game server.\n" +
        "# R (r6i)      — nhiều RAM, 8GB/vCPU. Cache, in-memory DB, Spark.\n" +
        "# X / z1d      — cực nhiều RAM (SAP HANA), hoặc xung nhịp cao nhất.\n" +
        "# I (i4i)      — NVMe local cực nhanh. NoSQL, data warehouse.\n" +
        "# P / G / Inf  — GPU / chip AI.\n" +
        "\n" +
        "aws ec2 describe-instance-types --filters \"Name=instance-type,Values=m6i.2xlarge\" \\\n" +
        "  --query \u0027InstanceTypes[].[VCpuInfo.DefaultVCpus,MemoryInfo.SizeInMiB,NetworkInfo.NetworkPerformance]\u0027\n" +
        "\n" +
        "# CÁCH CHỌN ĐÚNG: đừng đoán. Chạy một tuần rồi xem Compute Optimizer:\n" +
        "aws compute-optimizer get-ec2-instance-recommendations --instance-arns $ARN",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Bốn cách trả tiền, xếp theo mức giảm giá",
      code:
        "# ON-DEMAND — trả theo giây, không cam kết. Đắt nhất. Dùng cho tải bất thường,\n" +
        "#   môi trường dev, hoặc khi chưa biết nhu cầu dài hạn.\n" +
        "\n" +
        "# SAVINGS PLANS — cam kết chi $X/giờ trong 1 hoặc 3 năm. Giảm tới 72%.\n" +
        "#   Compute Savings Plans LINH HOẠT NHẤT: áp dụng cho mọi region, mọi họ\n" +
        "#   instance, cả Fargate và Lambda -> hầu như luôn chọn cái này.\n" +
        "aws ce get-savings-plans-purchase-recommendation \\\n" +
        "  --savings-plans-type COMPUTE_SP --term-in-years ONE_YEAR \\\n" +
        "  --payment-option NO_UPFRONT --lookback-period-in-days SIXTY_DAYS\n" +
        "\n" +
        "# RESERVED INSTANCES — cam kết theo loại instance cụ thể. Giảm tương tự nhưng\n" +
        "#   kém linh hoạt hơn Savings Plans. Ưu điểm còn lại: RI có thể bán lại trên\n" +
        "#   Marketplace, và Convertible RI đổi được loại instance.\n" +
        "#   Standard RI còn cho phép \"capacity reservation\" — quan trọng nếu bạn CẦN\n" +
        "#   chắc chắn có máy trong một AZ.\n" +
        "\n" +
        "# SPOT — dùng dung lượng dư của AWS, giảm TỚI 90%, nhưng AWS thu hồi bất cứ lúc\n" +
        "#   nào với cảnh báo 2 phút. Xem câu sau.\n" +
        "aws ec2 describe-spot-price-history --instance-types m6i.large \\\n" +
        "  --product-descriptions \"Linux/UNIX\" --max-items 5\n" +
        "\n" +
        "# CHIẾN LƯỢC thực dụng: phủ tải NỀN ổn định bằng Savings Plans (~70% tải),\n" +
        "# phần đỉnh bằng On-Demand, phần chịu gián đoạn được bằng Spot.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Bắt tín hiệu thu hồi và thiết kế chịu được",
      code:
        "# AWS báo trước 2 PHÚT qua instance metadata. Phải chủ động hỏi, không có push.\n" +
        "while true; do\n" +
        "  # IMDSv2: lấy token trước\n" +
        "  TOKEN=$(curl -sX PUT \"http://169.254.169.254/latest/api/token\" \\\n" +
        "    -H \"X-aws-ec2-metadata-token-ttl-seconds: 21600\")\n" +
        "  ACTION=$(curl -s -H \"X-aws-ec2-metadata-token: $TOKEN\" \\\n" +
        "    http://169.254.169.254/latest/meta-data/spot/instance-action)\n" +
        "  if [ -n \"$ACTION\" ]; then\n" +
        "    echo \"sắp bị thu hồi: $ACTION\"\n" +
        "    # rút khỏi load balancer -> ngừng nhận việc mới -> lưu checkpoint -> thoát sạch\n" +
        "    /opt/app/graceful-shutdown.sh\n" +
        "    break\n" +
        "  fi\n" +
        "  sleep 5\n" +
        "done\n" +
        "\n" +
        "# THIẾT KẾ ĐỂ CHỊU ĐƯỢC:\n" +
        "#  - workload PHẢI stateless hoặc có checkpoint (lưu tiến độ ra S3/DynamoDB)\n" +
        "#  - trải nhiều loại instance và nhiều AZ -> giảm khả năng bị thu hồi đồng loạt\n" +
        "#  - allocation strategy = capacity-optimized (chọn pool ít khả năng bị thu hồi\n" +
        "#    nhất) thay vì lowest-price\n" +
        "#  - luôn có phần On-Demand làm nền để dịch vụ không chết hẳn",
    },
    {
      lang: "json",
      title: "EC2 Fleet trộn On-Demand và Spot",
      code:
        "{\n" +
        "  \"Comment\": \"Mixed instances policy: 30% nền On-Demand, phần còn lại Spot trải nhiều loại\",\n" +
        "  \"MixedInstancesPolicy\": {\n" +
        "    \"InstancesDistribution\": {\n" +
        "      \"OnDemandBaseCapacity\": 2,\n" +
        "      \"OnDemandPercentageAboveBaseCapacity\": 30,\n" +
        "      \"SpotAllocationStrategy\": \"capacity-optimized\"\n" +
        "    },\n" +
        "    \"LaunchTemplate\": {\n" +
        "      \"Overrides\": [\n" +
        "        { \"InstanceType\": \"m6i.large\" },\n" +
        "        { \"InstanceType\": \"m5.large\" },\n" +
        "        { \"InstanceType\": \"m6a.large\" },\n" +
        "        { \"InstanceType\": \"m5a.large\" }\n" +
        "      ]\n" +
        "    }\n" +
        "  }\n" +
        "}",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Ba thứ quyết định instance khởi động thành cái gì",
      code:
        "# AMI = ảnh đĩa gốc. Nên \"nướng\" sẵn AMI có đủ agent/runtime (Packer/EC2 Image\n" +
        "# Builder) -> khởi động nhanh hơn nhiều so với cài đặt lúc boot.\n" +
        "aws ec2 create-image --instance-id i-1234 --name \"app-v1.2\" --no-reboot\n" +
        "# --no-reboot nhanh hơn nhưng KHÔNG đảm bảo nhất quán filesystem.\n" +
        "\n" +
        "# USER DATA = script chạy ở lần boot ĐẦU TIÊN (bằng quyền root).\n" +
        "#!/bin/bash\n" +
        "yum install -y amazon-cloudwatch-agent\n" +
        "aws s3 cp s3://config/app.yml /etc/app/\n" +
        "systemctl start app\n" +
        "# Chạy lại mỗi lần boot: dùng cloud-init với \"#cloud-config\" và always.\n" +
        "# Log để gỡ rối: /var/log/cloud-init-output.log\n" +
        "\n" +
        "# IMDS = endpoint 169.254.169.254 cung cấp metadata + CREDENTIAL của role.\n" +
        "TOKEN=$(curl -sX PUT \"http://169.254.169.254/latest/api/token\" \\\n" +
        "  -H \"X-aws-ec2-metadata-token-ttl-seconds: 21600\")\n" +
        "curl -s -H \"X-aws-ec2-metadata-token: $TOKEN\" \\\n" +
        "  http://169.254.169.254/latest/meta-data/instance-id\n" +
        "\n" +
        "# IMDSv2 BẮT BUỘC PHẢI BẬT: nó yêu cầu PUT lấy token trước, và token không\n" +
        "# đi qua được reverse proxy (TTL hop = 1). Đây là lá chắn chống SSRF —\n" +
        "# lỗ hổng SSRF trong ứng dụng từng bị dùng để đọc credential qua IMDSv1.\n" +
        "aws ec2 modify-instance-metadata-options --instance-id i-1234 \\\n" +
        "  --http-tokens required --http-put-response-hop-limit 1",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Chọn theo IOPS/throughput và cách gp3 thay đổi cuộc chơi",
      code:
        "# gp3 (SSD, MẶC ĐỊNH NÊN DÙNG) — 3.000 IOPS và 125 MB/s BAO GỒM trong giá,\n" +
        "#   tăng thêm ĐỘC LẬP với dung lượng (tối đa 16.000 IOPS, 1.000 MB/s).\n" +
        "#   Rẻ hơn gp2 khoảng 20% ở cùng dung lượng.\n" +
        "aws ec2 create-volume --volume-type gp3 --size 100 \\\n" +
        "  --iops 6000 --throughput 250 --availability-zone ap-southeast-1a\n" +
        "\n" +
        "# gp2 (CŨ) — IOPS GẮN CỨNG với dung lượng: 3 IOPS/GB. Cần 9.000 IOPS thì\n" +
        "#   phải mua 3TB dù chỉ dùng 100GB. Luôn nên chuyển sang gp3:\n" +
        "aws ec2 modify-volume --volume-id vol-123 --volume-type gp3\n" +
        "\n" +
        "# io2 / io2 Block Express (SSD cao cấp) — tới 256.000 IOPS, độ bền 99,999%,\n" +
        "#   hỗ trợ Multi-Attach. Cho DB quan trọng cần IOPS cao và ổn định. ĐẮT.\n" +
        "\n" +
        "# st1 (HDD throughput) — rẻ, tối ưu ĐỌC TUẦN TỰ (500 MB/s). Log, big data,\n" +
        "#   data warehouse. RẤT TỆ với truy cập ngẫu nhiên.\n" +
        "# sc1 (HDD lạnh) — rẻ nhất, dữ liệu hiếm truy cập.\n" +
        "\n" +
        "# Đo trước khi chọn — hầu hết mọi người mua thừa IOPS:\n" +
        "aws cloudwatch get-metric-statistics --namespace AWS/EBS \\\n" +
        "  --metric-name VolumeReadOps --dimensions Name=VolumeId,Value=vol-123 \\\n" +
        "  --start-time 2026-09-01T00:00:00Z --end-time 2026-09-04T00:00:00Z \\\n" +
        "  --period 3600 --statistics Average\n" +
        "# Thay đổi kích thước/loại KHÔNG cần dừng máy (elastic volumes), nhưng phải\n" +
        "# mở rộng filesystem thủ công sau đó: growpart + resize2fs/xfs_growfs.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Đĩa gắn máy vs đĩa qua mạng",
      code:
        "# INSTANCE STORE — NVMe/SSD gắn VẬT LÝ vào máy chủ vật lý.\n" +
        "#  + nhanh nhất (hàng triệu IOPS, độ trễ micro giây), miễn phí (đã tính trong giá)\n" +
        "#  - EPHEMERAL: stop/terminate/hỏng phần cứng là MẤT SẠCH. Reboot thì còn.\n" +
        "#  - không snapshot được, không tách ra gắn máy khác được, không đổi kích thước\n" +
        "lsblk                              # thấy nvme1n1... là instance store\n" +
        "sudo mkfs -t xfs /dev/nvme1n1\n" +
        "sudo mount /dev/nvme1n1 /mnt/cache\n" +
        "# Dùng cho: cache, thư mục tạm, shuffle của Spark, dữ liệu tái tạo được,\n" +
        "# hoặc DB tự nhân bản ở tầng ứng dụng (Cassandra, Kafka).\n" +
        "\n" +
        "# EBS — lưu trữ khối qua MẠNG, độc lập vòng đời với instance.\n" +
        "#  + bền (99,8-99,999%), snapshot được, tách/gắn được, đổi kích thước nóng\n" +
        "#  - chậm hơn instance store, và tính tiền theo GB/tháng\n" +
        "aws ec2 attach-volume --volume-id vol-123 --instance-id i-456 --device /dev/sdf\n" +
        "\n" +
        "# QUY TẮC: mọi dữ liệu KHÔNG tái tạo được -> EBS (hoặc S3).\n" +
        "# Instance store chỉ cho thứ mất đi cũng không sao.\n" +
        "# LƯU Ý: stop rồi start EC2 = máy chuyển sang host vật lý khác -> mất instance\n" +
        "# store. Đây là cách mất dữ liệu phổ biến với người mới.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Snapshot tăng dần, lưu trên S3",
      code:
        "# Snapshot ĐẦU TIÊN chép toàn bộ block đã dùng. Các snapshot SAU chỉ chép\n" +
        "# block ĐÃ THAY ĐỔI -> nhanh và rẻ hơn nhiều.\n" +
        "aws ec2 create-snapshot --volume-id vol-123 \\\n" +
        "  --description \"trước khi nâng cấp\" \\\n" +
        "  --tag-specifications \u0027ResourceType=snapshot,Tags=[{Key=Env,Value=prod}]\u0027\n" +
        "\n" +
        "# Snapshot lưu trong S3 do AWS quản lý (không thấy trong bucket của bạn),\n" +
        "# BỀN theo region — chịu được mất cả một AZ.\n" +
        "\n" +
        "# XOÁ AN TOÀN: xoá một snapshot giữa chuỗi KHÔNG làm hỏng snapshot sau.\n" +
        "# AWS tự dồn block cần thiết sang snapshot kế tiếp.\n" +
        "\n" +
        "# Khôi phục: tạo volume mới từ snapshot (gắn được vào AZ bất kỳ trong region)\n" +
        "aws ec2 create-volume --snapshot-id snap-123 --availability-zone ap-southeast-1b\n" +
        "\n" +
        "# BẪY HIỆU NĂNG: volume tạo từ snapshot nạp block LƯỜI từ S3 -> lần đọc đầu\n" +
        "# tiên mỗi block RẤT chậm. Dùng Fast Snapshot Restore nếu cần nhanh ngay\n" +
        "# (tốn tiền theo giờ), hoặc đọc trước toàn bộ volume: fio/dd.\n" +
        "\n" +
        "# TỰ ĐỘNG HOÁ bằng Data Lifecycle Manager thay vì tự viết cron:\n" +
        "aws dlm create-lifecycle-policy --execution-role-arn $ROLE \\\n" +
        "  --description \"daily snapshots\" --state ENABLED \\\n" +
        "  --policy-details file://policy.json\n" +
        "# Sao chép snapshot sang region khác để có DR thật sự.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Ba cơ chế của ASG",
      code:
        "# 1) SCALING POLICY\n" +
        "# Target tracking — DỄ NHẤT và nên dùng mặc định: đặt mục tiêu, AWS tự tính\n" +
        "aws autoscaling put-scaling-policy --auto-scaling-group-name app-asg \\\n" +
        "  --policy-name cpu-target --policy-type TargetTrackingScaling \\\n" +
        "  --target-tracking-configuration \u0027{\n" +
        "    \"TargetValue\": 60.0,\n" +
        "    \"PredefinedMetricSpecification\": {\"PredefinedMetricType\": \"ASGAverageCPUUtilization\"}}\u0027\n" +
        "# Step scaling — nhiều bậc theo mức độ vượt ngưỡng (khi cần kiểm soát chi tiết)\n" +
        "# Scheduled — biết trước tải (giờ cao điểm, chiến dịch khuyến mãi)\n" +
        "# Predictive — ML dự đoán theo lịch sử, scale TRƯỚC khi tải tới\n" +
        "\n" +
        "# 2) HEALTH CHECK\n" +
        "aws autoscaling update-auto-scaling-group --auto-scaling-group-name app-asg \\\n" +
        "  --health-check-type ELB --health-check-grace-period 300\n" +
        "# EC2 (mặc định) chỉ kiểm tra máy có sống không -> ứng dụng chết mà máy sống\n" +
        "# thì ASG KHÔNG biết. Có load balancer thì LUÔN đổi sang ELB.\n" +
        "# grace-period phải ĐỦ DÀI cho ứng dụng khởi động, nếu không ASG giết\n" +
        "# instance đang boot -> vòng lặp tạo/giết vô tận.\n" +
        "\n" +
        "# 3) LIFECYCLE HOOK — chen vào giữa quá trình tạo/huỷ\n" +
        "aws autoscaling put-lifecycle-hook --lifecycle-hook-name drain \\\n" +
        "  --auto-scaling-group-name app-asg \\\n" +
        "  --lifecycle-transition autoscaling:EC2_INSTANCE_TERMINATING \\\n" +
        "  --heartbeat-timeout 300 --default-result CONTINUE\n" +
        "# Dùng để: đẩy nốt log, rút khỏi service discovery, hoàn tất request đang chạy\n" +
        "# trước khi máy bị huỷ. Nhớ gọi complete-lifecycle-action khi xong.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Launch configuration đã lỗi thời",
      code:
        "# LAUNCH CONFIGURATION (cũ, AWS đã ngừng phát triển từ 2023):\n" +
        "#  - BẤT BIẾN: muốn đổi một tham số phải tạo cái mới hoàn toàn\n" +
        "#  - không có phiên bản\n" +
        "#  - không hỗ trợ: mixed instances, Spot+On-Demand trong một ASG,\n" +
        "#    T2/T3 unlimited, đặt tag khi tạo, IMDSv2 required, placement group mới\n" +
        "\n" +
        "# LAUNCH TEMPLATE (nên dùng cho mọi thứ):\n" +
        "aws ec2 create-launch-template --launch-template-name app-lt \\\n" +
        "  --version-description v1 \\\n" +
        "  --launch-template-data \u0027{\n" +
        "    \"ImageId\": \"ami-123\",\n" +
        "    \"InstanceType\": \"m6i.large\",\n" +
        "    \"IamInstanceProfile\": {\"Name\": \"app-profile\"},\n" +
        "    \"MetadataOptions\": {\"HttpTokens\": \"required\"},\n" +
        "    \"TagSpecifications\": [{\"ResourceType\":\"instance\",\n" +
        "      \"Tags\":[{\"Key\":\"Name\",\"Value\":\"app\"}]}]}\u0027\n" +
        "\n" +
        "# CÓ PHIÊN BẢN -> đổi cấu hình và ROLLBACK dễ dàng:\n" +
        "aws ec2 create-launch-template-version --launch-template-name app-lt \\\n" +
        "  --source-version 1 --launch-template-data \u0027{\"ImageId\":\"ami-456\"}\u0027\n" +
        "\n" +
        "aws autoscaling update-auto-scaling-group --auto-scaling-group-name app-asg \\\n" +
        "  --launch-template LaunchTemplateName=app-lt,Version=\u0027$Latest\u0027\n" +
        "# Dùng $Latest hay $Default hay số cụ thể: production nên ghim SỐ CỤ THỂ\n" +
        "# để deploy có kiểm soát, không bị đổi ngoài ý muốn.\n" +
        "\n" +
        "# Thay instance đang chạy theo template mới:\n" +
        "aws autoscaling start-instance-refresh --auto-scaling-group-name app-asg \\\n" +
        "  --preferences \u0027{\"MinHealthyPercentage\": 90, \"InstanceWarmup\": 300}\u0027",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Tầng 7 vs tầng 4 vs chèn thiết bị mạng",
      code:
        "# ALB (tầng 7, HTTP/HTTPS)\n" +
        "#  + định tuyến theo path/host/header/query/phương thức, WebSocket, gRPC\n" +
        "#  + tích hợp WAF, Cognito, hỗ trợ target là Lambda và IP\n" +
        "#  - độ trễ cao hơn NLB, IP KHÔNG cố định (phải dùng DNS)\n" +
        "aws elbv2 create-listener --load-balancer-arn $ALB --protocol HTTPS --port 443 \\\n" +
        "  --certificates CertificateArn=$CERT \\\n" +
        "  --default-actions Type=forward,TargetGroupArn=$TG\n" +
        "\n" +
        "# NLB (tầng 4, TCP/UDP/TLS)\n" +
        "#  + độ trễ CỰC THẤP, hàng triệu request/giây\n" +
        "#  + IP TĨNH cho mỗi AZ (quan trọng khi đối tác cần whitelist IP)\n" +
        "#  + GIỮ NGUYÊN IP nguồn của client -> ứng dụng thấy IP thật\n" +
        "#  + hỗ trợ UDP, và PrivateLink dùng NLB\n" +
        "#  - không hiểu HTTP -> không định tuyến theo path, không WAF\n" +
        "aws elbv2 create-load-balancer --name nlb --type network \\\n" +
        "  --subnets subnet-1 subnet-2\n" +
        "\n" +
        "# GWLB (tầng 3, GENEVE)\n" +
        "#  Dùng để chèn thiết bị bảo mật của bên thứ ba (firewall, IDS/IPS) vào\n" +
        "#  đường đi của gói tin một cách trong suốt. Không phải load balancer\n" +
        "#  cho ứng dụng — đây là công cụ của đội network/security.\n" +
        "\n" +
        "# CHỌN: HTTP API/web -> ALB. TCP/UDP, cần IP tĩnh, hoặc cần độ trễ tối thiểu\n" +
        "# -> NLB. Cần đưa traffic qua firewall ảo -> GWLB.\n" +
        "# CLB (classic) đã lỗi thời, chỉ còn trong hệ thống cũ.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Quy tắc định tuyến và cái giá của sticky session",
      code:
        "# TARGET GROUP gom các đích cùng loại + health check riêng\n" +
        "aws elbv2 create-target-group --name app-tg --protocol HTTP --port 8080 \\\n" +
        "  --vpc-id vpc-123 --target-type ip \\\n" +
        "  --health-check-path /actuator/health/readiness \\\n" +
        "  --health-check-interval-seconds 10 --healthy-threshold-count 2 \\\n" +
        "  --unhealthy-threshold-count 2 --matcher HttpCode=200\n" +
        "# Health check dùng READINESS, không dùng liveness — đây là điểm hay sai.\n" +
        "\n" +
        "# QUY TẮC ĐỊNH TUYẾN có độ ưu tiên, khớp cái đầu tiên là dừng\n" +
        "aws elbv2 create-rule --listener-arn $LISTENER --priority 10 \\\n" +
        "  --conditions \u0027[{\"Field\":\"path-pattern\",\"Values\":[\"/api/v2/*\"]}]\u0027 \\\n" +
        "  --actions \u0027[{\"Type\":\"forward\",\"TargetGroupArn\":\"\u0027$TG_V2\u0027\"}]\u0027\n" +
        "# Điều kiện dùng được: path-pattern, host-header, http-header, http-request-method,\n" +
        "# query-string, source-ip. Đủ để làm canary theo header hoặc tách theo tenant.\n" +
        "\n" +
        "# WEIGHTED TARGET GROUP — nền tảng cho blue/green và canary\n" +
        "aws elbv2 modify-listener --listener-arn $LISTENER \\\n" +
        "  --default-actions \u0027[{\"Type\":\"forward\",\"ForwardConfig\":{\n" +
        "    \"TargetGroups\":[{\"TargetGroupArn\":\"\u0027$BLUE\u0027\",\"Weight\":90},\n" +
        "                    {\"TargetGroupArn\":\"\u0027$GREEN\u0027\",\"Weight\":10}]}}]\u0027\n" +
        "\n" +
        "# STICKY SESSION — gắn client vào một target bằng cookie\n" +
        "aws elbv2 modify-target-group-attributes --target-group-arn $TG \\\n" +
        "  --attributes Key=stickiness.enabled,Value=true \\\n" +
        "               Key=stickiness.type,Value=lb_cookie \\\n" +
        "               Key=stickiness.lb_cookie.duration_seconds,Value=3600\n" +
        "# GIÁ PHẢI TRẢ: tải phân bổ LỆCH, và target chết là mất session của client đó.\n" +
        "# -> Cách đúng là để ứng dụng STATELESS và đưa session ra Redis/DynamoDB.\n" +
        "# Sticky session chỉ nên là giải pháp tạm cho hệ thống cũ.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Vòng đời execution environment và cách giảm cold start",
      code:
        "public class Handler implements RequestHandler<Request, Response> {\n" +
        "\n" +
        "    // KHỞI TẠO TĨNH — chạy MỘT LẦN khi tạo execution environment,\n" +
        "    // được TÁI SỬ DỤNG cho mọi lần gọi sau (warm start).\n" +
        "    // Đặt mọi thứ tốn kém ở đây: SDK client, kết nối DB, đọc cấu hình.\n" +
        "    private static final DynamoDbClient DDB = DynamoDbClient.builder()\n" +
        "            .httpClient(UrlConnectionHttpClient.create())   // nhẹ hơn Netty/Apache\n" +
        "            .build();\n" +
        "    private static final ObjectMapper MAPPER = new ObjectMapper();\n" +
        "\n" +
        "    @Override\n" +
        "    public Response handleRequest(Request req, Context ctx) {\n" +
        "        // Thân hàm chạy MỖI LẦN gọi. Đừng khởi tạo client ở đây.\n" +
        "        return process(req);\n" +
        "    }\n" +
        "}\n" +
        "// VÒNG ĐỜI: INIT (tải code, khởi tạo runtime, chạy static) -> INVOKE -> ... -> SHUTDOWN.\n" +
        "// COLD START = phải làm bước INIT. Xảy ra khi: lần gọi đầu, scale thêm\n" +
        "// concurrency, sau khi environment bị dọn (~5-15 phút không dùng), hoặc deploy mới.\n" +
        "\n" +
        "// GIẢM COLD START:\n" +
        "//  - chọn runtime nhẹ (Node/Python ~100-200ms; Java/.NET ~1-3s)\n" +
        "//  - giảm kích thước gói (bỏ dependency thừa, dùng layer)\n" +
        "//  - TĂNG BỘ NHỚ -> được nhiều CPU hơn -> init nhanh hơn (thường rẻ hơn tổng thể)\n" +
        "//  - Java: bật SnapStart (Lambda chụp snapshot sau init -> giảm tới 90%)\n" +
        "//  - cần độ trễ ổn định tuyệt đối -> provisioned concurrency\n" +
        "// KHÔNG hiệu quả: \"ping giữ ấm\" — không kiểm soát được số environment,\n" +
        "// và tốn tiền vô ích khi cần scale thật.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Một cái giới hạn, một cái làm nóng sẵn",
      code:
        "# Tài khoản có trần chung (mặc định 1.000 concurrent executions cho MỌI function).\n" +
        "# Một function chạy loạn có thể ăn hết trần và làm CHẾT mọi function khác.\n" +
        "\n" +
        "# RESERVED CONCURRENCY — dành riêng một phần trần, và cũng là TRẦN CỨNG\n" +
        "aws lambda put-function-concurrency \\\n" +
        "  --function-name critical-api --reserved-concurrent-executions 200\n" +
        "# Hai tác dụng cùng lúc:\n" +
        "#  1) BẢO ĐẢM: function này luôn có 200 slot, không ai giành được\n" +
        "#  2) GIỚI HẠN: nó KHÔNG BAO GIỜ vượt quá 200 -> bảo vệ DB phía sau khỏi\n" +
        "#     bị 1.000 kết nối đồng thời đập vào\n" +
        "# Đặt = 0 để TẮT function ngay lập tức (cách dừng khẩn cấp).\n" +
        "# KHÔNG tốn thêm tiền.\n" +
        "\n" +
        "# PROVISIONED CONCURRENCY — giữ sẵn N environment ĐÃ KHỞI TẠO -> KHÔNG cold start\n" +
        "aws lambda put-provisioned-concurrency-config \\\n" +
        "  --function-name critical-api --qualifier PROD --provisioned-concurrent-executions 50\n" +
        "# TỐN TIỀN theo giờ dù có gọi hay không.\n" +
        "# Dùng cho: API nhạy độ trễ, hàm Java/.NET, sự kiện biết trước (mở bán vé).\n" +
        "# Kết hợp Application Auto Scaling để tăng/giảm theo lịch -> tiết kiệm hơn.\n" +
        "\n" +
        "# Phân biệt nhanh: reserved = ĐẶT CHỖ và ĐẶT TRẦN (miễn phí).\n" +
        "#                  provisioned = LÀM NÓNG SẴN (tốn tiền).",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Trần cứng và cách lách",
      code:
        "# THỜI GIAN: tối đa 15 PHÚT. Không nới được.\n" +
        "#   -> việc lâu hơn: Step Functions, ECS/Fargate task, hoặc chia nhỏ.\n" +
        "\n" +
        "# BỘ NHỚ: 128MB - 10.240MB. CPU tỉ lệ THUẬN với bộ nhớ (10.240MB ~ 6 vCPU).\n" +
        "#   -> tăng bộ nhớ thường làm hàm chạy nhanh hơn và RẺ HƠN tổng thể.\n" +
        "aws lambda update-function-configuration --function-name f --memory-size 1024\n" +
        "# Dùng Lambda Power Tuning để tìm điểm tối ưu thay vì đoán.\n" +
        "\n" +
        "# GÓI TRIỂN KHAI: 50MB (zip nén, upload trực tiếp), 250MB (giải nén, gồm layer),\n" +
        "#   nhưng CONTAINER IMAGE thì tới 10GB -> đây là lối thoát cho hàm nặng (ML).\n" +
        "\n" +
        "# PAYLOAD: 6MB đồng bộ, 256KB bất đồng bộ (và cho SQS/SNS).\n" +
        "#   -> dữ liệu lớn: đẩy lên S3, truyền con trỏ (claim check).\n" +
        "\n" +
        "# /tmp: 512MB mặc định, nâng được tới 10GB.\n" +
        "aws lambda update-function-configuration --function-name f \\\n" +
        "  --ephemeral-storage \u0027{\"Size\": 2048}\u0027\n" +
        "\n" +
        "# CONCURRENCY: 1.000 mặc định cho cả tài khoản (xin tăng được).\n" +
        "#   Burst: 500-3.000 tuỳ region, sau đó tăng 500/phút -> tải tăng vọt đột ngột\n" +
        "#   vẫn bị throttle dù chưa chạm trần.\n" +
        "\n" +
        "# BIẾN MÔI TRƯỜNG: tổng 4KB. Và đừng để bí mật ở đó — dùng Secrets Manager.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Hai orchestrator, một mô hình tính toán",
      code:
        "# ECS — orchestrator RIÊNG của AWS.\n" +
        "#  + đơn giản, tích hợp sâu (IAM per-task, ALB, CloudWatch), MIỄN PHÍ control plane\n" +
        "#  + đội nhỏ lên production nhanh hơn nhiều\n" +
        "#  - chỉ chạy trên AWS, hệ sinh thái hẹp hơn Kubernetes rất nhiều\n" +
        "aws ecs create-cluster --cluster-name prod\n" +
        "\n" +
        "# EKS — Kubernetes có quản lý.\n" +
        "#  + chuẩn mở, hệ sinh thái khổng lồ (Helm, operator, service mesh)\n" +
        "#  + kỹ năng và cấu hình mang đi được sang cloud khác\n" +
        "#  - $0,10/giờ cho control plane (~$73/tháng mỗi cụm) + độ phức tạp thật sự\n" +
        "#  - cần người hiểu Kubernetes để vận hành\n" +
        "eksctl create cluster --name prod --nodegroup-name ng --nodes 3\n" +
        "\n" +
        "# FARGATE — KHÔNG phải orchestrator, mà là cách CHẠY task/pod không cần\n" +
        "# quản lý EC2. Dùng được với CẢ ECS lẫn EKS.\n" +
        "#  + không vá OS, không sizing node, cách ly tốt hơn\n" +
        "#  - đắt hơn EC2 ~20-30% ở tải ổn định; không dùng được GPU, không DaemonSet\n" +
        "#  - cold start chậm hơn, và giới hạn cấu hình mạng/khối lượng lưu trữ\n" +
        "\n" +
        "# CHỌN THỰC DỤNG:\n" +
        "#  - đội nhỏ, chỉ ở AWS, muốn nhanh          -> ECS + Fargate\n" +
        "#  - tải ổn định lớn, cần tối ưu chi phí      -> ECS/EKS trên EC2 (+ Spot)\n" +
        "#  - đã có kỹ năng K8s, cần đa cloud/hệ sinh thái -> EKS\n" +
        "#  - chỉ một vài container đơn giản           -> cân nhắc App Runner",
    },
  ],
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
  demo: [
    {
      lang: "json",
      title: "Task definition là \"bản thiết kế\" của container",
      code:
        "{\n" +
        "  \"family\": \"order-service\",\n" +
        "  \"networkMode\": \"awsvpc\",\n" +
        "  \"requiresCompatibilities\": [\"FARGATE\"],\n" +
        "  \"cpu\": \"1024\",\n" +
        "  \"memory\": \"2048\",\n" +
        "  \"executionRoleArn\": \"arn:aws:iam::123:role/ecsTaskExecutionRole\",\n" +
        "  \"taskRoleArn\": \"arn:aws:iam::123:role/orderServiceRole\",\n" +
        "  \"containerDefinitions\": [{\n" +
        "    \"name\": \"app\",\n" +
        "    \"image\": \"123.dkr.ecr.ap-southeast-1.amazonaws.com/order:1.2.0\",\n" +
        "    \"portMappings\": [{ \"containerPort\": 8080 }],\n" +
        "    \"secrets\": [\n" +
        "      { \"name\": \"DB_PASSWORD\", \"valueFrom\": \"arn:aws:secretsmanager:...:prod/db\" }\n" +
        "    ],\n" +
        "    \"healthCheck\": {\n" +
        "      \"command\": [\"CMD-SHELL\", \"curl -f http://localhost:8080/health || exit 1\"],\n" +
        "      \"interval\": 30, \"timeout\": 5, \"retries\": 3, \"startPeriod\": 60\n" +
        "    },\n" +
        "    \"logConfiguration\": {\n" +
        "      \"logDriver\": \"awslogs\",\n" +
        "      \"options\": { \"awslogs-group\": \"/ecs/order\", \"awslogs-region\": \"ap-southeast-1\" }\n" +
        "    },\n" +
        "    \"stopTimeout\": 30\n" +
        "  }]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Hai role khác nhau, và service giữ số lượng task",
      code:
        "# HAI ROLE RẤT HAY BỊ NHẦM:\n" +
        "#  executionRole — quyền cho ECS AGENT: kéo image từ ECR, ghi log, đọc secret\n" +
        "#  taskRole      — quyền cho CHÍNH ỨNG DỤNG: gọi S3, DynamoDB...\n" +
        "\n" +
        "# SERVICE: giữ đúng số task mong muốn, tự thay task chết, nối vào load balancer\n" +
        "aws ecs create-service --cluster prod --service-name order \\\n" +
        "  --task-definition order-service:5 --desired-count 3 \\\n" +
        "  --launch-type FARGATE \\\n" +
        "  --load-balancers targetGroupArn=$TG,containerName=app,containerPort=8080 \\\n" +
        "  --deployment-configuration \u0027maximumPercent=200,minimumHealthyPercent=100\u0027\n" +
        "# minimumHealthyPercent=100 + maximumPercent=200 -> rolling update không giảm\n" +
        "# năng lực phục vụ (tạo mới trước, xoá cũ sau).\n" +
        "\n" +
        "# CAPACITY PROVIDER: quyết định task chạy ở đâu và trộn Spot bao nhiêu\n" +
        "aws ecs put-cluster-capacity-providers --cluster prod \\\n" +
        "  --capacity-providers FARGATE FARGATE_SPOT \\\n" +
        "  --default-capacity-provider-strategy \\\n" +
        "    capacityProvider=FARGATE,weight=1,base=2 \\\n" +
        "    capacityProvider=FARGATE_SPOT,weight=4\n" +
        "# 2 task nền luôn chạy On-Demand, phần mở rộng ưu tiên Spot -> giảm chi phí mạnh.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Registry riêng, quét lỗ hổng và vòng đời image",
      code:
        "aws ecr create-repository --repository-name order-service \\\n" +
        "  --image-scanning-configuration scanOnPush=true \\\n" +
        "  --image-tag-mutability IMMUTABLE \\\n" +
        "  --encryption-configuration encryptionType=KMS\n" +
        "# IMMUTABLE rất quan trọng: không ai ghi đè được tag \"1.2.0\" -> deploy luôn\n" +
        "# tái lập được, và chống tấn công chuỗi cung ứng bằng cách đẩy đè tag.\n" +
        "\n" +
        "# Đẩy image\n" +
        "aws ecr get-login-password --region ap-southeast-1 \\\n" +
        "  | docker login --username AWS --password-stdin 123.dkr.ecr.ap-southeast-1.amazonaws.com\n" +
        "docker push 123.dkr.ecr.ap-southeast-1.amazonaws.com/order-service:1.2.0\n" +
        "\n" +
        "# QUÉT LỖ HỔNG\n" +
        "#  Basic     — miễn phí, quét khi push, dựa trên CVE của hệ điều hành\n" +
        "#  Enhanced  — dùng Amazon Inspector: quét LIÊN TỤC (cả image cũ đã push từ lâu),\n" +
        "#              phát hiện cả lỗ hổng trong thư viện ngôn ngữ. Tốn tiền, đáng giá.\n" +
        "aws ecr put-registry-scanning-configuration --scan-type ENHANCED \\\n" +
        "  --rules \u0027[{\"scanFrequency\":\"CONTINUOUS_SCAN\",\"repositoryFilters\":[{\"filter\":\"*\",\"filterType\":\"WILDCARD\"}]}]\u0027\n" +
        "\n" +
        "aws ecr describe-image-scan-findings --repository-name order-service --image-id imageTag=1.2.0\n" +
        "\n" +
        "# LIFECYCLE POLICY — image cũ tích tụ rất nhanh và tốn tiền lưu trữ\n" +
        "aws ecr put-lifecycle-policy --repository-name order-service \\\n" +
        "  --lifecycle-policy-text \u0027{\"rules\":[{\n" +
        "    \"rulePriority\":1,\"description\":\"giữ 10 image gần nhất\",\n" +
        "    \"selection\":{\"tagStatus\":\"any\",\"countType\":\"imageCountMoreThan\",\"countNumber\":10},\n" +
        "    \"action\":{\"type\":\"expire\"}}]}\u0027",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Ba kiểu, ba mục tiêu trái ngược nhau",
      code:
        "# CLUSTER — dồn instance vào CÙNG một rack -> mạng nhanh nhất (tới 100 Gbps),\n" +
        "#   độ trễ thấp nhất. Dùng cho HPC, tính toán phân tán chặt chẽ.\n" +
        "#   RỦI RO: cùng một điểm lỗi. Rack hỏng là mất tất cả.\n" +
        "aws ec2 create-placement-group --group-name hpc --strategy cluster\n" +
        "# Nên dùng cùng loại instance và khởi động cùng lúc, nếu không dễ bị\n" +
        "# InsufficientCapacity.\n" +
        "\n" +
        "# SPREAD — TRẢI mỗi instance sang một rack KHÁC NHAU (tối đa 7 instance mỗi AZ).\n" +
        "#   Dùng cho số ít instance cực quan trọng: node controller, license server.\n" +
        "aws ec2 create-placement-group --group-name critical --strategy spread\n" +
        "\n" +
        "# PARTITION — chia thành các phân vùng (tối đa 7 mỗi AZ), mỗi phân vùng nằm\n" +
        "#   trên tập rack riêng. Instance trong cùng phân vùng có thể cùng rack.\n" +
        "#   Dùng cho hệ phân tán lớn: HDFS, Cassandra, Kafka — đặt replica ở phân vùng\n" +
        "#   khác nhau thì mất một rack chỉ mất một replica.\n" +
        "aws ec2 create-placement-group --group-name kafka --strategy partition \\\n" +
        "  --partition-count 3\n" +
        "aws ec2 run-instances --placement \"GroupName=kafka,PartitionNumber=1\" ...\n" +
        "\n" +
        "# LƯU Ý: placement group là khái niệm TRONG một AZ (trừ spread có thể trải AZ).\n" +
        "# Nó không thay thế được việc trải nhiều AZ cho tính sẵn sàng.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Ba loại kiểm tra và tự phục hồi",
      code:
        "# SYSTEM STATUS CHECK — hạ tầng AWS: máy chủ vật lý, mạng, nguồn điện.\n" +
        "#   Lỗi -> việc của AWS. Cách chữa: stop/start (chuyển sang host khác) hoặc\n" +
        "#   để auto recovery làm.\n" +
        "# INSTANCE STATUS CHECK — bản thân instance: OS không boot, filesystem hỏng,\n" +
        "#   hết bộ nhớ, cấu hình mạng sai. Lỗi -> việc của BẠN.\n" +
        "# EBS STATUS CHECK — volume gắn vào có phản hồi không.\n" +
        "\n" +
        "aws ec2 describe-instance-status --instance-ids i-1234 \\\n" +
        "  --query \u0027InstanceStatuses[].[SystemStatus.Status,InstanceStatus.Status]\u0027\n" +
        "\n" +
        "# AUTO RECOVERY: từ tháng 3/2022 BẬT MẶC ĐỊNH cho instance đủ điều kiện.\n" +
        "# Nó khởi động lại instance trên host vật lý khác, GIỮ NGUYÊN instance id,\n" +
        "# private IP, Elastic IP, metadata và mọi volume EBS.\n" +
        "# LƯU Ý: dữ liệu trong INSTANCE STORE bị MẤT (host mới).\n" +
        "\n" +
        "# Đặt hành vi tường minh:\n" +
        "aws ec2 modify-instance-maintenance-options \\\n" +
        "  --instance-id i-1234 --auto-recovery default    # hoặc disabled\n" +
        "\n" +
        "# Alarm tự phục hồi cho trường hợp muốn kiểm soát riêng:\n" +
        "aws cloudwatch put-metric-alarm --alarm-name recover-i-1234 \\\n" +
        "  --metric-name StatusCheckFailed_System --namespace AWS/EC2 \\\n" +
        "  --statistic Maximum --period 60 --threshold 1 --evaluation-periods 2 \\\n" +
        "  --comparison-operator GreaterThanOrEqualToThreshold \\\n" +
        "  --dimensions Name=InstanceId,Value=i-1234 \\\n" +
        "  --alarm-actions arn:aws:automate:ap-southeast-1:ec2:recover\n" +
        "\n" +
        "# Auto recovery KHÔNG chữa được lỗi bên trong OS/ứng dụng -> vẫn cần\n" +
        "# ASG + health check ELB cho tính sẵn sàng thật sự.",
    },
  ],
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
  demo: [
    {
      lang: "dockerfile",
      title: "Build đa kiến trúc để chạy trên Graviton",
      code:
        "# Graviton (m6g, m7g, c7g, r7g...) là CPU ARM do AWS thiết kế:\n" +
        "#   giá thấp hơn ~20% và hiệu năng/giá tốt hơn tới 40% so với x86 tương đương,\n" +
        "#   tiêu thụ điện thấp hơn nhiều.\n" +
        "\n" +
        "# Image phải build cho đúng kiến trúc. Dùng buildx để ra image đa kiến trúc:\n" +
        "FROM --platform=$BUILDPLATFORM eclipse-temurin:21-jdk AS build\n" +
        "ARG TARGETPLATFORM\n" +
        "WORKDIR /src\n" +
        "COPY . .\n" +
        "RUN ./mvnw -q package -DskipTests\n" +
        "\n" +
        "FROM eclipse-temurin:21-jre\n" +
        "COPY --from=build /src/target/app.jar /app.jar\n" +
        "ENTRYPOINT [\"java\", \"-jar\", \"/app.jar\"]",
    },
    {
      lang: "bash",
      title: "Quy trình migrate và những chỗ hay vướng",
      code:
        "docker buildx build --platform linux/amd64,linux/arm64 \\\n" +
        "  -t 123.dkr.ecr.ap-southeast-1.amazonaws.com/app:1.0 --push .\n" +
        "\n" +
        "# NHỮNG THỨ HỢP GRAVITON NGAY (gần như không phải sửa gì):\n" +
        "#  - ngôn ngữ chạy trên máy ảo/thông dịch: Java, Go, Python, Node, .NET Core\n" +
        "#  - dịch vụ managed: RDS, ElastiCache, OpenSearch, Lambda -> chỉ đổi tham số\n" +
        "aws lambda update-function-configuration --function-name f --architectures arm64\n" +
        "\n" +
        "# NHỮNG CHỖ HAY VƯỚNG:\n" +
        "#  - thư viện NATIVE biên dịch sẵn cho x86 (một số JNI, gRPC native, sharp,\n" +
        "#    thư viện ML) -> phải tìm bản arm64 hoặc build lại\n" +
        "#  - image cơ sở không có bản arm64\n" +
        "#  - phần mềm thương mại không hỗ trợ ARM\n" +
        "#  - agent/sidecar của bên thứ ba\n" +
        "\n" +
        "# QUY TRÌNH AN TOÀN: chạy song song hai target group (x86 và arm64) sau ALB,\n" +
        "# chuyển dần trọng số và so sánh độ trễ/lỗi trước khi chuyển hẳn.",
    },
  ],
},
]);
