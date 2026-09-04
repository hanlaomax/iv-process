SS.addQuestions('aws', [
{
  cat: 'VPC',
  diagram: 'vpc-subnets',
  q: 'VPC, subnet (public/private) và route table hoạt động thế nào?',
  answer:
    '**VPC**: mạng ảo cô lập trong một region, bạn chọn dải CIDR (ví dụ `10.0.0.0/16`).\n\n' +
    '**Subnet**: một dải con trong VPC, **nằm trong một AZ**. "Public" hay "private" là do **route table**:\n' +
    '- **Public subnet**: route table có route `0.0.0.0/0 → Internet Gateway`.\n' +
    '- **Private subnet**: không có route ra IGW; ra internet (nếu cần) qua **NAT Gateway** đặt ở public subnet.\n\n' +
    'Mỗi subnet gắn đúng một route table; mỗi VPC có một main route table mặc định.',
  essence:
    'Không có thuộc tính "public/private" cho subnet — chỉ có việc route table của nó có đường tới Internet Gateway hay không. Thiết kế mạng = thiết kế route table.',
  example:
    'VPC 3 AZ: mỗi AZ có 1 public subnet (ALB, NAT GW) và 1 private subnet (EC2 app, RDS). App ở private subnet gọi API bên ngoài → đi qua NAT GW; internet gọi vào → chỉ tới ALB ở public subnet, không chạm được EC2.',
  demo: [
    {
      lang: "bash",
      title: "Điều DUY NHẤT làm subnet thành \"public\"",
      code:
        "# VPC = mạng riêng ảo, định nghĩa bằng CIDR. Chọn dải đủ rộng và KHÔNG\n" +
        "# trùng với mạng công ty/VPC khác (sau này peering sẽ vướng).\n" +
        "aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications \\\n" +
        "  \u0027ResourceType=vpc,Tags=[{Key=Name,Value=prod}]\u0027\n" +
        "\n" +
        "# Subnet nằm trong ĐÚNG MỘT AZ. Muốn chịu lỗi thì phải có subnet ở nhiều AZ.\n" +
        "aws ec2 create-subnet --vpc-id vpc-123 --cidr-block 10.0.1.0/24 \\\n" +
        "  --availability-zone ap-southeast-1a       # public\n" +
        "aws ec2 create-subnet --vpc-id vpc-123 --cidr-block 10.0.11.0/24 \\\n" +
        "  --availability-zone ap-southeast-1a       # private\n" +
        "\n" +
        "# ĐIỀU DUY NHẤT phân biệt public/private: ROUTE TABLE có đường ra\n" +
        "# Internet Gateway hay không. Không có thuộc tính \"public\" nào cả.\n" +
        "aws ec2 create-route --route-table-id rtb-public \\\n" +
        "  --destination-cidr-block 0.0.0.0/0 --gateway-id igw-123      # -> PUBLIC\n" +
        "\n" +
        "aws ec2 create-route --route-table-id rtb-private \\\n" +
        "  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id nat-123  # -> PRIVATE\n" +
        "\n" +
        "# AWS tự tạo route local cho CIDR của VPC — không xoá được, và đó là lý do\n" +
        "# mọi subnet trong VPC luôn thông nhau (trừ khi bị SG/NACL chặn).\n" +
        "\n" +
        "# Instance trong public subnet vẫn cần PUBLIC IP mới ra Internet được:\n" +
        "aws ec2 modify-subnet-attribute --subnet-id subnet-123 --map-public-ip-on-launch\n" +
        "\n" +
        "# THIẾT KẾ CHUẨN: 3 tầng x nhiều AZ — public (ALB, NAT), private-app (EC2/ECS),\n" +
        "# private-data (RDS, ElastiCache). Chừa dải trống để mở rộng sau.",
    },
  ],
},
{
  cat: 'VPC',
  q: 'Internet Gateway và NAT Gateway khác nhau thế nào?',
  answer:
    '- **Internet Gateway (IGW)**: cho phép tài nguyên có **public IP** trong public subnet giao tiếp **hai chiều** với internet. Không tính phí, không bottleneck, redundant sẵn.\n' +
    '- **NAT Gateway**: cho tài nguyên trong **private subnet** (chỉ có private IP) khởi tạo kết nối **ra ngoài** (tải update, gọi API), nhưng **internet không chủ động vào được**. Đặt trong public subnet, có phí theo giờ + theo GB xử lý, per-AZ (nên đặt mỗi AZ một cái để HA + tránh phí cross-AZ).',
  essence:
    'IGW = cửa hai chiều cho máy có public IP. NAT GW = cửa một chiều (ra) cho máy private. NAT bảo vệ backend khỏi kết nối đến từ bên ngoài trong khi vẫn cho phép outbound.',
  example:
    'EC2 app ở private subnet cần `apt update` và gọi Stripe API: route `0.0.0.0/0 → nat-gw`. Stripe không thể mở kết nối tới EC2 đó. Chi phí NAT cao khi traffic outbound lớn → cân nhắc VPC Endpoint cho traffic tới dịch vụ AWS.',
  viz: {
    type: 'compare',
    cols: ['Internet Gateway (IGW)', 'NAT Gateway'],
    rows: [
      ['Cho ai', 'tài nguyên có public IP trong public subnet', 'tài nguyên private subnet (chỉ private IP)'],
      ['Chiều', 'hai chiều', 'một chiều (ra ngoài)'],
      ['Internet vào được?', 'có', 'KHÔNG'],
      ['Phí', 'không', 'phí giờ + phí GB xử lý; đặt mỗi AZ một cái'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hai chiều đi khác nhau",
      code:
        "# INTERNET GATEWAY (IGW) — cổng HAI CHIỀU cho subnet public.\n" +
        "#  - miễn phí, tự scale, không có điểm nghẽn\n" +
        "#  - instance cần PUBLIC IP hoặc Elastic IP mới dùng được\n" +
        "#  - cho phép Internet CHỦ ĐỘNG gọi VÀO (nếu SG cho phép)\n" +
        "aws ec2 create-internet-gateway\n" +
        "aws ec2 attach-internet-gateway --vpc-id vpc-123 --internet-gateway-id igw-123\n" +
        "\n" +
        "# NAT GATEWAY — chỉ MỘT CHIỀU ĐI RA cho subnet private.\n" +
        "#  - instance private gọi ra Internet được (tải bản vá, gọi API bên ngoài)\n" +
        "#  - Internet KHÔNG BAO GIỜ chủ động gọi vào được -> đây là điểm an toàn cốt lõi\n" +
        "#  - NẰM TRONG subnet PUBLIC (nó cần IGW để ra ngoài)\n" +
        "aws ec2 create-nat-gateway --subnet-id subnet-public-1a \\\n" +
        "  --allocation-id eipalloc-123 --connectivity-type public\n" +
        "\n" +
        "# TIỀN — đây là một trong những khoản đắt bất ngờ nhất trên AWS:\n" +
        "#   ~$0,045/giờ (~$32/tháng) MỖI NAT Gateway + ~$0,045 MỖI GB đi qua.\n" +
        "#   Hệ thống đẩy vài TB/tháng qua NAT thì hoá đơn NAT vượt cả tiền EC2.\n" +
        "\n" +
        "# CÁCH GIẢM CHI PHÍ NAT:\n" +
        "#  - VPC Endpoint cho S3/DynamoDB (Gateway Endpoint MIỄN PHÍ) -> lưu lượng\n" +
        "#    tới S3 không đi qua NAT nữa. Đây là cách tiết kiệm lớn nhất và dễ nhất.\n" +
        "#  - Interface Endpoint cho các dịch vụ AWS khác (có phí nhưng thường rẻ hơn NAT)\n" +
        "#  - đặt NAT ở mỗi AZ để tránh phí liên vùng (đánh đổi: nhiều NAT hơn)\n" +
        "#  - môi trường dev: dùng một NAT chung, hoặc NAT instance tự dựng (rẻ hơn nhiều)",
    },
  ],
},
{
  cat: 'VPC',
  q: 'Security Group và Network ACL khác nhau ra sao?',
  answer:
    '| | Security Group | Network ACL |\n' +
    '|-|-|-|\n' +
    '| Cấp | ENI (instance) | Subnet |\n' +
    '| Trạng thái | **Stateful** (reply tự cho phép) | **Stateless** (phải mở cả 2 chiều) |\n' +
    '| Rule | Chỉ **allow** | allow **và** deny |\n' +
    '| Đánh giá | Tất cả rule | Theo thứ tự số, dừng ở match đầu |\n\n' +
    'SG là hàng rào chính (dùng hằng ngày). NACL là lớp phụ ở biên subnet — thường để mặc định allow-all, chỉ dùng khi cần **deny tường minh** (chặn một dải IP xấu).',
  essence:
    'SG stateful + chỉ allow + gắn instance = lớp bảo vệ chính. NACL stateless + có deny + gắn subnet = lớp bổ sung ở biên. Traffic phải qua cả hai.',
  example:
    'SG của RDS: chỉ allow port 5432 từ **SG của app** (không phải từ CIDR) → dù app scale, IP đổi, rule vẫn đúng. NACL: thêm deny cho một dải IP đang tấn công brute-force, áp cho cả subnet ngay lập tức.',
  viz: {
    type: 'compare',
    cols: ['Security Group', 'Network ACL'],
    rows: [
      ['Cấp', 'ENI (instance)', 'Subnet'],
      ['Trạng thái', 'stateful — reply tự cho phép', 'stateless — phải mở cả 2 chiều'],
      ['Rule', 'chỉ allow', 'allow VÀ deny'],
      ['Đánh giá', 'tất cả rule', 'theo thứ tự số, dừng ở match đầu'],
      ['Vai trò', 'hàng rào chính (dùng hằng ngày)', 'lớp phụ ở biên — chỉ khi cần deny tường minh'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Có trạng thái vs không trạng thái",
      code:
        "# SECURITY GROUP — tường lửa ở mức ENI (instance), CÓ TRẠNG THÁI.\n" +
        "#  - chỉ có rule ALLOW, không có DENY\n" +
        "#  - \"có trạng thái\" nghĩa là: cho phép vào thì chiều ra của CHÍNH kết nối đó\n" +
        "#    tự động được phép (và ngược lại) -> không phải mở cổng ephemeral\n" +
        "aws ec2 authorize-security-group-ingress --group-id sg-app \\\n" +
        "  --protocol tcp --port 8080 --source-group sg-alb     # tham chiếu SG khác!\n" +
        "# Tham chiếu SG thay vì CIDR là cách viết đúng: instance đổi IP không phải sửa rule.\n" +
        "\n" +
        "# NETWORK ACL — tường lửa ở mức SUBNET, KHÔNG có trạng thái.\n" +
        "#  - có cả ALLOW lẫn DENY, đánh số thứ tự, khớp SỐ NHỎ NHẤT trước rồi dừng\n" +
        "#  - phải mở CẢ HAI CHIỀU, và nhớ mở dải cổng ephemeral (1024-65535)\n" +
        "#    cho chiều về — đây là lỗi hay gặp nhất khi dùng NACL\n" +
        "aws ec2 create-network-acl-entry --network-acl-id acl-123 \\\n" +
        "  --rule-number 100 --protocol tcp --port-range From=443,To=443 \\\n" +
        "  --cidr-block 0.0.0.0/0 --rule-action allow --ingress\n" +
        "aws ec2 create-network-acl-entry --network-acl-id acl-123 \\\n" +
        "  --rule-number 100 --protocol tcp --port-range From=1024,To=65535 \\\n" +
        "  --cidr-block 0.0.0.0/0 --rule-action allow --egress     # BẮT BUỘC cho chiều về\n" +
        "\n" +
        "# THỰC TẾ: dùng SECURITY GROUP làm công cụ chính. NACL chỉ dùng cho\n" +
        "# một việc SG không làm được: CHẶN một dải IP cụ thể (vì SG không có DENY),\n" +
        "# hoặc làm hàng rào bảo vệ ở mức subnet cho yêu cầu tuân thủ.\n" +
        "# NACL mặc định cho phép mọi thứ -> nhiều hệ thống không đụng tới nó là hợp lý.",
    },
  ],
},
{
  cat: 'Kết nối',
  q: 'VPC Peering và Transit Gateway — khi nào dùng cái nào?',
  answer:
    '- **VPC Peering**: kết nối **1-1** giữa hai VPC (cùng/khác region/account). **Không bắc cầu** (A-B, B-C không cho A-C). Số kết nối bùng nổ theo `n(n-1)/2` khi nhiều VPC.\n' +
    '- **Transit Gateway (TGW)**: hub trung tâm, mọi VPC (và VPN, Direct Connect) gắn vào TGW → định tuyến qua route table của TGW. Bắc cầu được, quản lý tập trung, hỗ trợ hàng nghìn VPC. Có phí attachment + phí xử lý dữ liệu.',
  essence:
    'Peering là dây nối trực tiếp, tốt cho vài VPC. TGW là "router đám mây" hình sao, cần khi mạng có nhiều VPC/account/on-prem và cần quản lý định tuyến tập trung.',
  example:
    '2 VPC (app + shared services): peering là đủ, rẻ. 30 VPC của 30 team + kết nối on-prem qua Direct Connect: TGW hub, mỗi VPC một attachment, route table TGW phân đoạn team nào nói chuyện được với team nào.',
  viz: {
    type: 'compare',
    cols: ['VPC Peering', 'Transit Gateway (TGW)'],
    rows: [
      ['Hình thái', 'dây nối 1-1', 'router đám mây hình sao'],
      ['Bắc cầu (transitive)', 'không', 'có'],
      ['Số kết nối khi n VPC', 'n(n-1)/2 bùng nổ', 'n attachment'],
      ['Dùng cho', 'vài VPC', 'nhiều VPC/account/on-prem, định tuyến tập trung'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đấu nối từng cặp vs hub trung tâm",
      code:
        "# VPC PEERING — kết nối 1-1, KHÔNG bắc cầu (A-B và B-C không cho A-C).\n" +
        "#  + miễn phí phí giờ, chỉ trả phí truyền dữ liệu\n" +
        "#  + độ trễ thấp nhất\n" +
        "#  - n VPC cần n(n-1)/2 kết nối -> 10 VPC là 45 peering, không quản nổi\n" +
        "#  - CIDR KHÔNG được chồng lấn\n" +
        "aws ec2 create-vpc-peering-connection --vpc-id vpc-a --peer-vpc-id vpc-b\n" +
        "aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id pcx-123\n" +
        "# Phải thêm ROUTE Ở CẢ HAI VPC — quên vế này là lỗi phổ biến nhất:\n" +
        "aws ec2 create-route --route-table-id rtb-a \\\n" +
        "  --destination-cidr-block 10.1.0.0/16 --vpc-peering-connection-id pcx-123\n" +
        "\n" +
        "# TRANSIT GATEWAY — hub trung tâm, mọi thứ đấu vào một chỗ.\n" +
        "#  + BẮC CẦU được, quản lý tập trung, kết nối cả VPN/Direct Connect\n" +
        "#  + route table riêng cho từng nhóm -> cách ly được (ví dụ prod không thấy dev)\n" +
        "#  - ~$0,05/giờ mỗi attachment + phí xử lý dữ liệu -> đắt hơn peering rõ rệt\n" +
        "aws ec2 create-transit-gateway --description \"hub\"\n" +
        "aws ec2 create-transit-gateway-vpc-attachment \\\n" +
        "  --transit-gateway-id tgw-123 --vpc-id vpc-a --subnet-ids subnet-1 subnet-2\n" +
        "\n" +
        "# CHỌN:\n" +
        "#  - 2-3 VPC, kết nối đơn giản, muốn rẻ -> PEERING\n" +
        "#  - từ ~4-5 VPC trở lên, hoặc cần nối on-premises, hoặc cần phân đoạn mạng\n" +
        "#    -> TRANSIT GATEWAY\n" +
        "# Cả hai đều KHÔNG cho phép CIDR chồng lấn -> quy hoạch dải IP từ đầu là việc\n" +
        "# quan trọng nhất và ít được làm nhất.",
    },
  ],
},
{
  cat: 'Kết nối',
  q: 'VPC Endpoint: Gateway Endpoint và Interface Endpoint (PrivateLink)?',
  answer:
    'Cho phép tài nguyên trong VPC truy cập dịch vụ AWS **không đi qua internet/NAT**.\n\n' +
    '- **Gateway Endpoint**: chỉ cho **S3** và **DynamoDB**. Là một route trong route table (`pl-xxxx → vpce`). Miễn phí. Nên luôn tạo.\n' +
    '- **Interface Endpoint (AWS PrivateLink)**: một **ENI với private IP** trong subnet của bạn cho hầu hết dịch vụ khác (SQS, SNS, KMS, ECR, Secrets Manager, API của bạn…). Có phí theo giờ + GB.',
  essence:
    'Endpoint giữ traffic tới dịch vụ AWS **trong mạng AWS** — bảo mật hơn (không ra internet), rẻ hơn (bỏ phí NAT), và cho phép private subnet không cần NAT cho các call này.',
  example:
    'App private subnet gọi S3, SQS, Secrets Manager, ECR (pull image): tạo Gateway Endpoint S3 (free) + Interface Endpoint cho SQS/Secrets/ECR. Hoá đơn NAT Gateway giảm mạnh, và bucket policy có thể `Deny` nếu request không đến từ VPC Endpoint của bạn.',
  viz: {
    type: 'compare',
    cols: ['Gateway Endpoint', 'Interface Endpoint (PrivateLink)'],
    rows: [
      ['Dịch vụ', 'chỉ S3 và DynamoDB', 'hầu hết dịch vụ khác (SQS, KMS, ECR, Secrets…)'],
      ['Hình thức', 'route trong route table', 'ENI với private IP trong subnet'],
      ['Phí', 'miễn phí — nên luôn tạo', 'phí giờ + GB'],
      ['Lợi ích chung', 'traffic AWS trong mạng AWS: bảo mật hơn, bỏ phí NAT', 'như trái'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đi tới dịch vụ AWS mà không qua Internet",
      code:
        "# GATEWAY ENDPOINT — CHỈ cho S3 và DynamoDB. MIỄN PHÍ HOÀN TOÀN.\n" +
        "# Hoạt động bằng cách thêm route vào route table, không có ENI.\n" +
        "aws ec2 create-vpc-endpoint --vpc-id vpc-123 \\\n" +
        "  --service-name com.amazonaws.ap-southeast-1.s3 \\\n" +
        "  --route-table-ids rtb-private-1 rtb-private-2\n" +
        "# Đây là việc NÊN LÀM ĐẦU TIÊN với mọi VPC: lưu lượng tới S3 không còn đi\n" +
        "# qua NAT Gateway -> tiết kiệm rất nhiều tiền và nhanh hơn.\n" +
        "\n" +
        "# INTERFACE ENDPOINT (PrivateLink) — cho hầu hết dịch vụ AWS còn lại.\n" +
        "# Tạo ENI có IP riêng trong subnet của bạn + DNS riêng.\n" +
        "aws ec2 create-vpc-endpoint --vpc-id vpc-123 --vpc-endpoint-type Interface \\\n" +
        "  --service-name com.amazonaws.ap-southeast-1.secretsmanager \\\n" +
        "  --subnet-ids subnet-1 subnet-2 --security-group-ids sg-endpoint \\\n" +
        "  --private-dns-enabled\n" +
        "# ~$0,01/giờ mỗi AZ + phí dữ liệu. Vẫn thường rẻ hơn đẩy qua NAT.\n" +
        "\n" +
        "# private-dns-enabled rất quan trọng: nó khiến tên miền chuẩn\n" +
        "# (secretsmanager.ap-southeast-1.amazonaws.com) phân giải thành IP nội bộ\n" +
        "# -> KHÔNG PHẢI SỬA CODE.\n" +
        "\n" +
        "# Endpoint policy giới hạn thêm được ai/cái gì đi qua endpoint:\n" +
        "aws ec2 modify-vpc-endpoint --vpc-endpoint-id vpce-123 \\\n" +
        "  --policy-document file://endpoint-policy.json\n" +
        "\n" +
        "# LỢI ÍCH ngoài chi phí: subnet private KHÔNG CẦN NAT vẫn gọi được dịch vụ AWS\n" +
        "# -> kiến trúc hoàn toàn kín, đáp ứng yêu cầu tuân thủ.",
    },
  ],
},
{
  cat: 'DNS',
  q: 'Route 53: các routing policy?',
  answer:
    '- **Simple**: một record, một hoặc nhiều IP (client tự chọn).\n' +
    '- **Weighted**: chia traffic theo tỉ lệ (canary, A/B, blue-green).\n' +
    '- **Latency-based**: gửi user tới region có độ trễ thấp nhất.\n' +
    '- **Failover**: primary/secondary theo health check (active-passive DR).\n' +
    '- **Geolocation**: theo vị trí địa lý user (tuân thủ, ngôn ngữ).\n' +
    '- **Geoproximity**: theo khoảng cách + bias điều chỉnh.\n' +
    '- **Multivalue answer**: trả nhiều IP khoẻ mạnh (health-checked round robin đơn giản).',
  essence:
    'Route 53 không chỉ là DNS mà là "traffic manager toàn cầu": định tuyến theo tỉ lệ, độ trễ, vị trí, hoặc sức khoẻ endpoint — điều khiển ở tầng phân giải tên.',
  example:
    'Ra mắt version mới: weighted 95% v1 / 5% v2, tăng dần nếu ổn. App đa vùng: latency-based routing đưa user châu Á vào `ap-southeast-1`, user Mỹ vào `us-east-1`. DR: failover record trỏ region phụ khi health check region chính fail.',
  viz: {
    type: 'tree',
    title: 'Route 53 — "traffic manager toàn cầu"',
    root: {
      label: 'Định tuyến ở tầng phân giải tên',
      children: [
        { label: 'Simple', note: 'một record, một/nhiều IP' },
        { label: 'Weighted', note: 'chia traffic theo tỉ lệ — canary, A/B, blue-green' },
        { label: 'Latency-based', note: 'user tới region độ trễ thấp nhất' },
        { label: 'Failover', note: 'primary/secondary theo health check — active-passive DR' },
        { label: 'Geolocation / Geoproximity', note: 'theo vị trí / khoảng cách + bias' },
        { label: 'Multivalue answer', note: 'trả nhiều IP khoẻ — round robin đơn giản' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Bảy chính sách, chọn theo mục tiêu",
      code:
        "# SIMPLE — một bản ghi, một hoặc nhiều giá trị. Không có health check.\n" +
        "# WEIGHTED — chia lưu lượng theo tỉ lệ. Dùng cho canary/A-B testing.\n" +
        "aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch \u0027{\n" +
        "  \"Changes\":[{\"Action\":\"UPSERT\",\"ResourceRecordSet\":{\n" +
        "    \"Name\":\"api.example.com\",\"Type\":\"A\",\"SetIdentifier\":\"green\",\"Weight\":10,\n" +
        "    \"AliasTarget\":{\"HostedZoneId\":\"Z35\",\"DNSName\":\"green-alb...\",\"EvaluateTargetHealth\":true}}}]}\u0027\n" +
        "\n" +
        "# LATENCY-BASED — gửi tới region có ĐỘ TRỄ thấp nhất với người dùng.\n" +
        "#   Đây là lựa chọn tốt nhất cho hệ thống đa region hướng hiệu năng.\n" +
        "# GEOLOCATION — theo VỊ TRÍ người dùng. Dùng cho tuân thủ dữ liệu, nội dung\n" +
        "#   theo ngôn ngữ, hoặc chặn theo quốc gia. Nhớ có bản ghi \"default\".\n" +
        "# GEOPROXIMITY — theo khoảng cách địa lý, có \"bias\" để kéo giãn vùng phục vụ.\n" +
        "# FAILOVER — primary/secondary, cần health check. Dùng cho DR active-passive.\n" +
        "# MULTIVALUE ANSWER — trả nhiều IP kèm health check, client tự chọn.\n" +
        "#   Giống round-robin nhưng có loại bỏ endpoint chết.\n" +
        "\n" +
        "# ALIAS vs CNAME — điểm rất hay bị hỏi:\n" +
        "#  - Alias là bản ghi riêng của AWS, MIỄN PHÍ truy vấn, và dùng được ở\n" +
        "#    ZONE APEX (example.com) — CNAME thì KHÔNG.\n" +
        "#  - Alias trỏ tới tài nguyên AWS (ALB, CloudFront, S3 website, API Gateway)\n" +
        "#    và tự cập nhật khi IP đổi.\n" +
        "# -> Trỏ tới tài nguyên AWS thì luôn dùng ALIAS.",
    },
  ],
},
{
  cat: 'DNS',
  q: 'Route 53 health check hoạt động thế nào?',
  answer:
    'Health checker của AWS (từ nhiều địa điểm toàn cầu) định kỳ gọi endpoint (HTTP/HTTPS/TCP). Endpoint được coi unhealthy nếu tỉ lệ checker báo fail vượt ngưỡng.\n\n' +
    'Loại:\n' +
    '- **Endpoint check**: ping một IP/domain.\n' +
    '- **Calculated check**: kết hợp nhiều check con (AND/OR).\n' +
    '- **CloudWatch alarm check**: dựa trên alarm (ví dụ khi không thể check trực tiếp endpoint private).\n\n' +
    'Gắn health check vào record → Route 53 ngừng trả record unhealthy.',
  essence:
    'Health check biến DNS thành cơ chế failover: record "biến mất" khỏi câu trả lời khi endpoint chết. Kết hợp failover routing policy để tự chuyển sang backup.',
  example:
    'Primary record (region A) + health check gọi `/health`. Region A sập → sau vài chục giây, health check fail → Route 53 trả secondary record (region B). TTL thấp (60s) để client cập nhật nhanh.',
  viz: {
    type: 'flow',
    title: 'Route 53 health check = cơ chế failover DNS',
    nodes: ['AWS checkers (nhiều địa điểm) gọi endpoint', 'tỉ lệ fail vượt ngưỡng → unhealthy', 'Route 53 ngừng trả record unhealthy', 'failover routing → secondary record'],
    steps: [
      { to: 0, label: 'HTTP/HTTPS/TCP; loại: endpoint / calculated / CloudWatch alarm check' },
      { to: 2, label: 'record "biến mất" khỏi câu trả lời khi endpoint chết' },
      { to: 3, label: 'TTL thấp (60s) để client cập nhật nhanh' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba loại health check và cách kết hợp",
      code:
        "# 1) ENDPOINT — kiểm tra trực tiếp một IP/tên miền từ nhiều vị trí toàn cầu\n" +
        "aws route53 create-health-check --caller-reference $(date +%s) \\\n" +
        "  --health-check-config \u0027{\n" +
        "    \"Type\":\"HTTPS\",\"FullyQualifiedDomainName\":\"api.example.com\",\n" +
        "    \"Port\":443,\"ResourcePath\":\"/health\",\n" +
        "    \"RequestInterval\":30,\"FailureThreshold\":3,\n" +
        "    \"MeasureLatency\":true,\"EnableSNI\":true}\u0027\n" +
        "# Kiểm tra từ 15+ vị trí; chỉ coi là DOWN khi HƠN 18% checker báo lỗi\n" +
        "# -> chống báo động giả do một vùng mạng gặp sự cố.\n" +
        "# RequestInterval=10 (fast) tốn tiền hơn nhưng phát hiện nhanh hơn.\n" +
        "\n" +
        "# 2) CALCULATED — kết hợp nhiều health check bằng logic AND/OR/NOT.\n" +
        "#   Ví dụ: \"khoẻ\" nghĩa là CẢ web LẪN database đều khoẻ.\n" +
        "#   --child-health-checks id1 id2 --health-threshold 2\n" +
        "\n" +
        "# 3) CLOUDWATCH ALARM — dựa trên metric thay vì HTTP.\n" +
        "#   Rất hữu ích khi tình trạng khoẻ không đo được bằng một request HTTP\n" +
        "#   (ví dụ độ sâu hàng đợi, tỉ lệ lỗi, replica lag).\n" +
        "\n" +
        "# GẮN VÀO BẢN GHI DNS: bản ghi có health check FAIL sẽ bị loại khỏi câu trả lời.\n" +
        "#   \"HealthCheckId\": \"abc-123\"\n" +
        "\n" +
        "# LƯU Ý QUAN TRỌNG:\n" +
        "#  - endpoint phải cho phép IP của health checker của Route 53 (SG/firewall)\n" +
        "#  - health check gọi từ Internet -> KHÔNG kiểm tra được endpoint private\n" +
        "#    (dùng CloudWatch alarm cho trường hợp đó)\n" +
        "#  - DNS failover chịu ảnh hưởng của TTL: TTL 300 nghĩa là client có thể\n" +
        "#    còn dùng bản ghi cũ tới 5 phút -> đặt TTL 60 cho bản ghi cần failover nhanh",
    },
  ],
},
{
  cat: 'CDN',
  q: 'CloudFront: caching, TTL, invalidation và OAC?',
  answer:
    'CloudFront cache nội dung ở edge location. **Cache key** mặc định là URL; cấu hình thêm để cache theo header/cookie/query string cụ thể.\n\n' +
    '**TTL**: `Cache-Control`/`Expires` của origin, hoặc Min/Default/Max TTL của behavior.\n\n' +
    '**Invalidation**: xoá object khỏi cache trước hạn (`/images/*`) — vài invalidation path đầu mỗi tháng miễn phí, sau đó tính phí; **tốt hơn là versioning URL** (`app.v2.js`).\n\n' +
    '**OAC (Origin Access Control)**: cho phép **chỉ CloudFront** đọc S3 origin (ký SigV4) → bucket private hoàn toàn.',
  essence:
    'CloudFront giảm latency và tải origin bằng cache ở biên. Dùng versioned URL thay vì invalidation, và OAC để origin S3 không bao giờ public.',
  example:
    'SPA: `index.html` cache 60s (đổi nhanh khi deploy), asset băm nội dung (`main.a1b2c3.js`) cache 1 năm `immutable`. S3 bucket private, chỉ CloudFront (OAC) đọc được. Deploy mới = upload asset mới + index.html trỏ tới chúng, không cần invalidation.',
  viz: {
    type: 'tree',
    title: 'CloudFront',
    root: {
      label: 'Giảm latency + tải origin bằng cache ở biên',
      children: [
        { label: 'Cache key', note: 'mặc định URL; cấu hình thêm header/cookie/query string' },
        { label: 'TTL', note: 'Cache-Control/Expires của origin, hoặc Min/Default/Max của behavior' },
        { label: 'Invalidation', note: 'xoá cache trước hạn — tính phí; TỐT HƠN: versioned URL (app.v2.js)' },
        { label: 'OAC (Origin Access Control)', note: 'chỉ CloudFront đọc S3 origin → bucket private hoàn toàn' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Cache key, TTL và cách khoá origin",
      code:
        "# TTL — quyết định bởi header của origin, bị chặn bởi cấu hình CloudFront:\n" +
        "#   Cache-Control: max-age=31536000, immutable   -> tài sản có hash trong tên\n" +
        "#   Cache-Control: no-cache                      -> HTML, luôn kiểm tra lại\n" +
        "# MinTTL / DefaultTTL / MaxTTL của CloudFront ghi đè khoảng cho phép.\n" +
        "\n" +
        "# CACHE KEY — mặc định chỉ là URL. Thêm header/cookie/query vào cache key\n" +
        "# làm GIẢM tỉ lệ hit -> chỉ thêm cái THỰC SỰ ảnh hưởng nội dung.\n" +
        "aws cloudfront create-cache-policy --cache-policy-config \u0027{\n" +
        "  \"Name\":\"app-policy\",\"DefaultTTL\":86400,\"MinTTL\":0,\"MaxTTL\":31536000,\n" +
        "  \"ParametersInCacheKeyAndForwardedToOrigin\":{\n" +
        "    \"EnableAcceptEncodingGzip\":true,\"EnableAcceptEncodingBrotli\":true,\n" +
        "    \"HeadersConfig\":{\"HeaderBehavior\":\"whitelist\",\n" +
        "      \"Headers\":{\"Quantity\":1,\"Items\":[\"Accept-Language\"]}},\n" +
        "    \"CookiesConfig\":{\"CookieBehavior\":\"none\"},\n" +
        "    \"QueryStringsConfig\":{\"QueryStringBehavior\":\"whitelist\",\n" +
        "      \"QueryStrings\":{\"Quantity\":1,\"Items\":[\"v\"]}}}}\u0027\n" +
        "# Dùng ORIGIN REQUEST POLICY cho header cần chuyển tiếp tới origin nhưng\n" +
        "# KHÔNG cần nằm trong cache key (ví dụ Authorization).\n" +
        "\n" +
        "# INVALIDATION — tốn tiền sau 1.000 path/tháng và mất vài phút.\n" +
        "aws cloudfront create-invalidation --distribution-id E123 --paths \"/index.html\" \"/api/*\"\n" +
        "# CÁCH TỐT HƠN: đặt HASH vào tên file (app.a3f9c2.js) -> không bao giờ phải\n" +
        "# invalidate, và deploy mới không làm mất cache của file cũ.\n" +
        "\n" +
        "# OAC (Origin Access Control) — thay thế OAI đã lỗi thời. Chỉ CloudFront\n" +
        "# đọc được bucket S3, bucket đóng hoàn toàn với Internet.\n" +
        "aws cloudfront create-origin-access-control --origin-access-control-config \u0027{\n" +
        "  \"Name\":\"s3-oac\",\"OriginAccessControlOriginType\":\"s3\",\n" +
        "  \"SigningBehavior\":\"always\",\"SigningProtocol\":\"sigv4\"}\u0027\n" +
        "# Bucket policy chỉ cho phép service principal cloudfront.amazonaws.com\n" +
        "# với điều kiện AWS:SourceArn = ARN của distribution.\n" +
        "# OAC hỗ trợ SSE-KMS và cả PUT/DELETE — OAI thì không.",
    },
  ],
},
{
  cat: 'CDN',
  q: 'Dựng static website với S3 + CloudFront như thế nào?',
  answer:
    'Kiến trúc khuyến nghị:\n' +
    '- S3 bucket **private** (BPA bật), không bật S3 static website hosting.\n' +
    '- CloudFront distribution với **OAC** đọc bucket.\n' +
    '- ACM certificate (ở `us-east-1` cho CloudFront) cho custom domain qua Route 53 alias.\n' +
    '- Với SPA (client-side routing): cấu hình **custom error response** 403/404 → trả `/index.html` với status 200.\n' +
    '- Response headers policy để thêm HSTS, CSP.',
  essence:
    'S3 lưu file, CloudFront phục vụ (TLS, cache, edge, WAF). Bucket không bao giờ public — OAC là cầu nối. SPA cần map lỗi về index.html.',
  example:
    '`app.acme.com` → Route 53 alias → CloudFront → OAC → S3 `acme-frontend`. User vào `app.acme.com/dashboard` (route client-side) → S3 trả 403 (không có key đó) → CloudFront custom error rule đổi thành `index.html` 200 → React router xử lý.',
  viz: {
    type: 'flow',
    title: 'Static website: S3 + CloudFront',
    nodes: ['user → Route 53 alias', 'CloudFront (TLS, cache, edge, WAF)', 'OAC ký SigV4', 'S3 bucket PRIVATE (BPA bật)'],
    steps: [
      { to: 1, label: 'ACM cert ở us-east-1 cho custom domain' },
      { to: 3, label: 'bucket không bao giờ public — OAC là cầu nối' },
      { to: 3, label: 'SPA: custom error response 403/404 → trả /index.html status 200' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Kiến trúc chuẩn cho SPA/trang tĩnh",
      code:
        "# 1) Bucket PRIVATE hoàn toàn — KHÔNG bật \"static website hosting\"\n" +
        "# (chế độ đó bắt buộc public và chỉ chạy HTTP).\n" +
        "aws s3api create-bucket --bucket my-site --region ap-southeast-1 \\\n" +
        "  --create-bucket-configuration LocationConstraint=ap-southeast-1\n" +
        "aws s3api put-public-access-block --bucket my-site \\\n" +
        "  --public-access-block-configuration \\\n" +
        "  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true\n" +
        "\n" +
        "# 2) Chứng chỉ ACM — BẮT BUỘC ở us-east-1 cho CloudFront\n" +
        "aws acm request-certificate --domain-name example.com \\\n" +
        "  --subject-alternative-names \"*.example.com\" \\\n" +
        "  --validation-method DNS --region us-east-1\n" +
        "\n" +
        "# 3) Distribution với OAC, default root object, và xử lý lỗi cho SPA\n" +
        "#    Với SPA (React/Vue router): map 403 và 404 -> /index.html mã 200\n" +
        "aws cloudfront create-distribution --distribution-config \u0027{\n" +
        "  \"CustomErrorResponses\":{\"Quantity\":2,\"Items\":[\n" +
        "    {\"ErrorCode\":403,\"ResponsePagePath\":\"/index.html\",\"ResponseCode\":\"200\",\"ErrorCachingMinTTL\":0},\n" +
        "    {\"ErrorCode\":404,\"ResponsePagePath\":\"/index.html\",\"ResponseCode\":\"200\",\"ErrorCachingMinTTL\":0}]}}\u0027\n" +
        "\n" +
        "# 4) Deploy: hai lệnh sync với cache header KHÁC NHAU — đây là mấu chốt\n" +
        "aws s3 sync ./dist s3://my-site --delete \\\n" +
        "  --exclude \"index.html\" --exclude \"*.html\" \\\n" +
        "  --cache-control \"public,max-age=31536000,immutable\"    # tài sản có hash\n" +
        "aws s3 sync ./dist s3://my-site \\\n" +
        "  --exclude \"*\" --include \"*.html\" \\\n" +
        "  --cache-control \"public,max-age=0,must-revalidate\"     # HTML luôn kiểm tra lại\n" +
        "aws cloudfront create-invalidation --distribution-id E123 --paths \"/*\"\n" +
        "\n" +
        "# 5) Route 53 ALIAS trỏ tới distribution (dùng được ở zone apex).\n" +
        "# Nhớ thêm security header bằng response headers policy (HSTS, CSP, X-Frame-Options).",
    },
  ],
},
{
  cat: 'API',
  q: 'API Gateway: REST API, HTTP API và WebSocket API khác nhau?',
  answer:
    '- **HTTP API**: mới hơn, **rẻ hơn ~70%**, latency thấp hơn, đủ cho hầu hết use case — proxy tới Lambda/HTTP backend, JWT authorizer, CORS. Thiếu: API keys/usage plans, request validation nâng cao, WAF gắn trực tiếp, cache.\n' +
    '- **REST API**: đầy đủ tính năng — request/response transformation (VTL), validation, API keys + usage plans, caching, WAF, private API, canary deployment.\n' +
    '- **WebSocket API**: kết nối hai chiều lâu dài (chat, notification realtime, streaming) — route theo `$connect`/`$disconnect`/message.',
  essence:
    'HTTP API là mặc định (rẻ, nhanh, đủ dùng). REST API khi cần tính năng doanh nghiệp (usage plan, transform, cache). WebSocket khi cần server chủ động push.',
  example:
    'Backend cho mobile app: HTTP API + Lambda + JWT authorizer (Cognito). Cổng API bán cho đối tác cần rate limit theo gói + API key + báo cáo usage: REST API với usage plans. Tính năng chat realtime: WebSocket API.',
  viz: {
    type: 'compare',
    cols: ['HTTP API', 'REST API', 'WebSocket API'],
    rows: [
      ['Giá / latency', 'rẻ hơn ~70%, latency thấp', 'đắt hơn', '—'],
      ['Tính năng', 'proxy Lambda/HTTP, JWT authorizer, CORS', 'transform (VTL), validation, API keys + usage plans, cache, WAF, canary', 'kết nối 2 chiều lâu dài'],
      ['Dùng cho', 'mặc định — hầu hết use case', 'tính năng doanh nghiệp', 'chat, notification realtime, streaming'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba loại, và vì sao HTTP API thường là lựa chọn đúng",
      code:
        "# HTTP API — mới hơn, RẺ HƠN ~70%, độ trễ thấp hơn. Thiếu một số tính năng cũ.\n" +
        "#  Có: JWT authorizer sẵn, CORS, Lambda/HTTP proxy, VPC Link cho ALB/NLB\n" +
        "#  Không có: request/response transformation, API key + usage plan,\n" +
        "#            WAF trực tiếp, caching, xác thực schema request\n" +
        "aws apigatewayv2 create-api --name orders --protocol-type HTTP \\\n" +
        "  --target arn:aws:lambda:ap-southeast-1:123:function:orders\n" +
        "\n" +
        "# REST API — đầy đủ tính năng nhất, đắt hơn.\n" +
        "#  Chọn khi cần: API key/usage plan cho đối tác, caching, WAF, request\n" +
        "#  validation, biến đổi payload, hoặc private API trong VPC.\n" +
        "aws apigateway create-rest-api --name orders --endpoint-configuration types=REGIONAL\n" +
        "\n" +
        "# WEBSOCKET API — kết nối hai chiều lâu dài. Chat, thông báo real-time,\n" +
        "# cập nhật trực tiếp. Định tuyến theo route key trong message.\n" +
        "aws apigatewayv2 create-api --name chat --protocol-type WEBSOCKET \\\n" +
        "  --route-selection-expression \u0027$request.body.action\u0027\n" +
        "# Gửi ngược về client bằng ConnectionId qua API @connections.\n" +
        "\n" +
        "# ENDPOINT TYPE (REST API): EDGE (qua CloudFront), REGIONAL (thường tốt hơn\n" +
        "# nếu người dùng cùng region), PRIVATE (chỉ truy cập trong VPC qua endpoint).\n" +
        "\n" +
        "# CHỌN: mặc định HTTP API. Chỉ dùng REST API khi cần đúng một tính năng\n" +
        "# mà HTTP API thiếu — và cân nhắc chuyển tính năng đó sang CloudFront/WAF.",
    },
  ],
},
{
  cat: 'API',
  q: 'API Gateway: throttling, usage plan và các cách xác thực?',
  answer:
    '**Throttling**: token bucket — `rate` (steady) + `burst`. Áp ở cấp account, stage, method, hoặc per-client qua usage plan. Vượt → `429 Too Many Requests`.\n\n' +
    '**Usage plan** (REST API): gắn API key với hạn mức (quota theo ngày/tháng) + throttle riêng → bán API theo gói.\n\n' +
    '**Authorization**:\n' +
    '- **IAM** (SigV4): cho service-to-service nội bộ.\n' +
    '- **Cognito User Pools**: token từ Cognito.\n' +
    '- **Lambda authorizer**: logic tuỳ ý (verify JWT của IdP khác, kiểm tra DB), trả policy IAM (có cache).\n' +
    '- **JWT authorizer** (HTTP API): verify OIDC JWT native.',
  essence:
    'Throttling bảo vệ backend khỏi quá tải; usage plan biến API thành sản phẩm có gói cước; authorizer tách xác thực khỏi code business (đặc biệt Lambda authorizer cho logic tuỳ biến, có cache theo token).',
  example:
    'API công khai: throttle account-level 10.000 rps burst 5.000. Đối tác Free: 1.000 req/ngày, 5 rps. Đối tác Pro: 1M req/ngày, 100 rps. Lambda authorizer verify JWT của Auth0, cache 5 phút theo token → giảm lời gọi authorizer.',
  viz: {
    type: 'tree',
    title: 'API Gateway — bảo vệ + kiếm tiền + xác thực',
    root: {
      label: '3 lớp',
      children: [
        { label: 'Throttling', note: 'token bucket: rate + burst; vượt → 429. Áp account/stage/method/per-client' },
        { label: 'Usage plan (REST)', note: 'API key + quota ngày/tháng + throttle riêng → bán API theo gói' },
        { label: 'Authorization', note: 'IAM SigV4 (nội bộ), Cognito, Lambda authorizer (logic tuỳ ý, có cache), JWT authorizer (HTTP API)' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Bảo vệ backend và kiểm soát ai gọi",
      code:
        "# THROTTLING ba tầng, tầng chặt nhất thắng:\n" +
        "#  1) tài khoản: mặc định 10.000 req/s, burst 5.000 (xin tăng được)\n" +
        "#  2) theo stage/method\n" +
        "aws apigateway update-stage --rest-api-id abc --stage-name prod \\\n" +
        "  --patch-operations \\\n" +
        "    op=replace,path=/throttle/rateLimit,value=1000 \\\n" +
        "    op=replace,path=/throttle/burstLimit,value=2000\n" +
        "#  3) theo API key (usage plan)\n" +
        "\n" +
        "# USAGE PLAN + API KEY — cho đối tác bên ngoài, có hạn mức theo ngày/tháng\n" +
        "aws apigateway create-usage-plan --name gold \\\n" +
        "  --throttle rateLimit=100,burstLimit=200 \\\n" +
        "  --quota limit=1000000,period=MONTH\n" +
        "# LƯU Ý: API key KHÔNG phải cơ chế xác thực an toàn — nó chỉ để ĐỊNH DANH\n" +
        "# và đo lường. Xác thực thật phải dùng một trong các cách dưới.\n" +
        "\n" +
        "# CÁC CÁCH XÁC THỰC:\n" +
        "#  1) IAM (SigV4) — cho client trong AWS hoặc SDK. Kiểm soát qua IAM policy.\n" +
        "#  2) Cognito User Pool — có sẵn đăng ký/đăng nhập/MFA/social login\n" +
        "#  3) JWT authorizer (HTTP API) — verify token từ IdP bất kỳ (Auth0, Okta),\n" +
        "#     không cần viết code\n" +
        "#  4) Lambda authorizer — logic tuỳ ý, trả về IAM policy. Nhớ BẬT CACHE\n" +
        "#     (authorizerResultTtlInSeconds) nếu không mỗi request gọi thêm một Lambda:\n" +
        "aws apigateway create-authorizer --rest-api-id abc --name jwt-auth \\\n" +
        "  --type TOKEN --authorizer-uri $LAMBDA_URI \\\n" +
        "  --identity-source \u0027method.request.header.Authorization\u0027 \\\n" +
        "  --authorizer-result-ttl-in-seconds 300\n" +
        "\n" +
        "# Luôn bật access log và metric chi tiết để còn điều tra được:\n" +
        "#   op=replace,path=/accessLogSettings/destinationArn,value=$LOG_GROUP_ARN",
    },
  ],
},
{
  cat: 'API',
  q: 'Khi nào dùng ALB, khi nào dùng API Gateway?',
  answer:
    '**API Gateway** hơn khi: serverless (tích hợp Lambda native), cần API key/usage plan/quota, request validation & transformation, WebSocket, không muốn quản lý VPC/subnet, throttling per-client tinh vi, canary theo %.\n\n' +
    '**ALB** hơn khi: chạy container/EC2 lâu dài, throughput rất cao (ALB rẻ hơn nhiều ở quy mô lớn), cần latency cực thấp, sticky session, routing L7 phức tạp trong VPC, kết nối gRPC/WebSocket streaming.\n\n' +
    'Chi phí: ALB tính theo giờ + LCU; API Gateway theo request → ở lưu lượng lớn ALB rẻ hơn nhiều.',
  essence:
    'API Gateway = "API management layer" (feature-rich, per-request pricing, hợp serverless & thấp/trung bình traffic). ALB = "load balancer" (rẻ ở quy mô lớn, hợp workload thường trực).',
  example:
    'Microservice trên ECS Fargate, 50k rps nội bộ: ALB (path routing) — API Gateway sẽ tốn kém và thêm latency. Public API bán cho khách hàng, ~500 rps, cần quota + key: API Gateway REST.',
  viz: {
    type: 'compare',
    cols: ['API Gateway', 'ALB'],
    rows: [
      ['Là gì', 'API management layer', 'load balancer'],
      ['Giá', 'theo request → đắt ở quy mô lớn', 'theo giờ + LCU → rẻ ở quy mô lớn'],
      ['Hơn khi', 'serverless, API key/quota, transform, WebSocket, throttle per-client', 'container/EC2 thường trực, throughput rất cao, latency cực thấp, sticky'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hai bộ định tuyến, hai mô hình chi phí",
      code:
        "# API GATEWAY — cổng API có quản lý, tính tiền THEO REQUEST.\n" +
        "#  + xác thực (Cognito/JWT/Lambda authorizer), throttling, usage plan, API key\n" +
        "#  + tích hợp thẳng Lambda và cả dịch vụ AWS khác (không cần code trung gian)\n" +
        "#  + versioning, stage, canary deployment, biến đổi request/response\n" +
        "#  + WebSocket\n" +
        "#  - đắt khi lưu lượng lớn: ~$3,50/triệu request (REST) — 1 tỉ request\n" +
        "#    là $3.500/tháng chỉ riêng cổng\n" +
        "#  - thêm độ trễ (~10-50ms), timeout tối đa 29 giây\n" +
        "\n" +
        "# ALB — load balancer, tính tiền theo GIỜ + LCU (không theo request).\n" +
        "#  + rẻ hơn NHIỀU khi lưu lượng cao và ổn định\n" +
        "#  + độ trễ thấp hơn, kết nối lâu dài, hỗ trợ gRPC và WebSocket thô\n" +
        "#  + target là EC2/ECS/IP/Lambda\n" +
        "#  - không có xác thực sẵn (trừ OIDC/Cognito cơ bản), không throttling,\n" +
        "#    không API key, không biến đổi payload\n" +
        "\n" +
        "# CHỌN:\n" +
        "#  - backend là Lambda, lưu lượng vừa, cần xác thực/quota -> API GATEWAY\n" +
        "#  - backend là container/EC2, lưu lượng cao, HTTP thuần -> ALB\n" +
        "#  - cần cả hai: CloudFront -> ALB cho traffic chính, API Gateway cho\n" +
        "#    phần API công khai cần quota\n" +
        "\n" +
        "# Điểm hoà vốn thô: trên khoảng 20-50 triệu request/tháng thì ALB\n" +
        "# thường bắt đầu rẻ hơn rõ rệt.",
    },
  ],
},
{
  cat: 'Kết nối',
  q: 'Direct Connect và Site-to-Site VPN khác nhau thế nào?',
  answer:
    '- **Site-to-Site VPN**: tunnel IPsec **qua internet** giữa on-prem và VPC (hoặc TGW). Thiết lập trong vài phút, rẻ, nhưng băng thông/latency phụ thuộc internet, kém ổn định.\n' +
    '- **Direct Connect (DX)**: đường **cáp vật lý riêng** từ data center của bạn tới AWS (qua đối tác colocation). Băng thông cam kết (1–100 Gbps), latency thấp và ổn định, phí data transfer ra thấp hơn. Lead time hàng tuần, chi phí cao.\n\n' +
    'Thực tế: DX cho kết nối chính + VPN làm **backup** (DX không mã hoá sẵn → chạy VPN trên DX nếu cần mã hoá).',
  essence:
    'VPN = nhanh dựng, rẻ, qua internet (best-effort). DX = hạ tầng vật lý riêng, hiệu năng đảm bảo, đắt và chậm triển khai. Kết hợp DX + VPN backup cho enterprise.',
  example:
    'Công ty migrate data center: DX 10Gbps để copy hàng trăm TB và cho ứng dụng lai on-prem/cloud latency nhạy; VPN dựng ngay trong tuần đầu để bắt đầu làm việc, và làm đường dự phòng khi DX bảo trì.',
  viz: {
    type: 'compare',
    cols: ['Site-to-Site VPN', 'Direct Connect (DX)'],
    rows: [
      ['Kết nối', 'tunnel IPsec qua internet', 'cáp vật lý riêng (qua đối tác colo)'],
      ['Băng thông / latency', 'phụ thuộc internet, kém ổn định', 'cam kết 1–100 Gbps, thấp và ổn định'],
      ['Thời gian dựng', 'vài phút', 'hàng tuần'],
      ['Mã hoá', 'sẵn', 'không — chạy VPN trên DX nếu cần'],
      ['Thực tế', 'backup', 'kết nối chính; + VPN backup'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đường riêng vật lý vs đường hầm qua Internet",
      code:
        "# SITE-TO-SITE VPN — IPsec qua Internet công cộng.\n" +
        "#  + dựng trong vài giờ, rẻ (~$0,05/giờ + phí dữ liệu)\n" +
        "#  + mỗi kết nối có 2 tunnel để dự phòng\n" +
        "#  - băng thông tối đa ~1,25 Gbps mỗi tunnel\n" +
        "#  - độ trễ và jitter THEO INTERNET -> không đoán trước được\n" +
        "aws ec2 create-customer-gateway --type ipsec.1 \\\n" +
        "  --public-ip 203.0.113.10 --bgp-asn 65000\n" +
        "aws ec2 create-vpn-connection --type ipsec.1 \\\n" +
        "  --customer-gateway-id cgw-123 --vpn-gateway-id vgw-123 \\\n" +
        "  --options TunnelOptions=\u0027[{},{}]\u0027\n" +
        "\n" +
        "# DIRECT CONNECT — đường cáp VẬT LÝ riêng tới AWS.\n" +
        "#  + băng thông cam kết 50 Mbps - 100 Gbps, độ trễ ỔN ĐỊNH\n" +
        "#  + phí truyền dữ liệu RẺ HƠN NHIỀU so với qua Internet -> với khối lượng\n" +
        "#    lớn, riêng khoản này đã bù chi phí đường truyền\n" +
        "#  - mất VÀI TUẦN tới VÀI THÁNG để lắp đặt, chi phí cố định cao\n" +
        "#  - MỘT kết nối là một điểm lỗi -> cần hai kết nối ở hai vị trí khác nhau\n" +
        "aws directconnect create-connection --location EqSG2 \\\n" +
        "  --bandwidth 1Gbps --connection-name \"dx-primary\"\n" +
        "\n" +
        "# KIẾN TRÚC THỰC TẾ ĐƯỢC KHUYẾN NGHỊ:\n" +
        "#   Direct Connect làm đường chính + VPN làm ĐƯỜNG DỰ PHÒNG (rẻ, và tự\n" +
        "#   chuyển qua BGP khi DX chết). Đây là mô hình phổ biến nhất.\n" +
        "# Nhiều VPC/nhiều site -> đấu tất cả vào Transit Gateway thay vì nối chằng chịt.\n" +
        "# Lưu ý: DX mặc định KHÔNG mã hoá -> cần dữ liệu nhạy cảm thì chạy VPN\n" +
        "# bên trong DX, hoặc dùng MACsec.",
    },
  ],
},
{
  cat: 'VPC',
  q: 'DNS resolution trong VPC hoạt động thế nào?',
  answer:
    'Mỗi VPC có **Route 53 Resolver** tại địa chỉ `VPC_CIDR_base + 2` (ví dụ `10.0.0.2`) và `169.254.169.253`.\n\n' +
    '- Phân giải tên public bình thường.\n' +
    '- Phân giải tên **private hosted zone** gắn với VPC.\n' +
    '- Phân giải hostname nội bộ EC2.\n\n' +
    '**Resolver endpoints** cho hybrid DNS:\n' +
    '- **Inbound endpoint**: on-prem query được tên trong Route 53 private zone.\n' +
    '- **Outbound endpoint + rules**: VPC forward query cho domain on-prem (`corp.local`) tới DNS server on-prem.',
  essence:
    'VPC Resolver `.2` xử lý DNS trong VPC. Resolver endpoints nối DNS của AWS và on-prem để tên phân giải được cả hai chiều trong kiến trúc lai.',
  example:
    'App trên EC2 cần gọi `db.corp.local` (on-prem) và `api.internal.acme.com` (Route 53 private zone). Outbound resolver rule: `corp.local → forward tới 10.1.0.53` (DNS on-prem). Private zone gắn VPC lo phần còn lại.',
  viz: {
    type: 'tree',
    title: 'DNS resolution trong VPC',
    root: {
      label: 'Route 53 Resolver tại VPC_CIDR_base + 2 (10.0.0.2) và 169.254.169.253',
      children: [
        { label: 'Phân giải tên public bình thường' },
        { label: 'Private hosted zone gắn với VPC' },
        { label: 'Hostname nội bộ EC2' },
        { label: 'Inbound endpoint', note: 'on-prem query được tên trong Route 53 private zone' },
        { label: 'Outbound endpoint + rules', note: 'VPC forward query domain on-prem (corp.local) tới DNS on-prem' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Route 53 Resolver và địa chỉ .2",
      code:
        "# Mỗi VPC có một DNS resolver ở địa chỉ CIDR_VPC + 2 (VPC 10.0.0.0/16 -> 10.0.0.2),\n" +
        "# cũng truy cập được qua 169.254.169.253.\n" +
        "cat /etc/resolv.conf        # nameserver 10.0.0.2\n" +
        "\n" +
        "# HAI THUỘC TÍNH VPC phải bật (mặc định bật với VPC do console tạo):\n" +
        "aws ec2 modify-vpc-attribute --vpc-id vpc-123 --enable-dns-support\n" +
        "aws ec2 modify-vpc-attribute --vpc-id vpc-123 --enable-dns-hostnames\n" +
        "# Thiếu enable-dns-support -> mọi phân giải tên trong VPC hỏng.\n" +
        "# Thiếu enable-dns-hostnames -> Interface Endpoint với private DNS không hoạt động.\n" +
        "\n" +
        "# PRIVATE HOSTED ZONE — tên miền nội bộ chỉ phân giải được trong VPC\n" +
        "aws route53 create-hosted-zone --name internal.example.com \\\n" +
        "  --vpc VPCRegion=ap-southeast-1,VPCId=vpc-123 \\\n" +
        "  --caller-reference $(date +%s) --hosted-zone-config PrivateZone=true\n" +
        "\n" +
        "# LAI GHÉP VỚI ON-PREMISES — hai chiều, hai loại endpoint:\n" +
        "#  INBOUND  — cho on-premises phân giải tên trong AWS\n" +
        "#  OUTBOUND — cho tài nguyên AWS phân giải tên của on-premises\n" +
        "aws route53resolver create-resolver-endpoint --direction OUTBOUND \\\n" +
        "  --security-group-ids sg-dns --ip-addresses SubnetId=subnet-1 SubnetId=subnet-2 \\\n" +
        "  --name to-onprem\n" +
        "aws route53resolver create-resolver-rule --domain-name corp.local \\\n" +
        "  --rule-type FORWARD --resolver-endpoint-id rslvr-out-123 \\\n" +
        "  --target-ips Ip=192.168.1.10,Port=53\n" +
        "\n" +
        "# GIỚI HẠN HAY GÂY SỰ CỐ: mỗi ENI chỉ được 1.024 gói DNS mỗi giây tới\n" +
        "# resolver. Ứng dụng phân giải tên trong vòng lặp nóng sẽ bị drop im lặng\n" +
        "# -> triệu chứng là timeout ngẫu nhiên. Bật DNS cache cục bộ (nscd/dnsmasq)\n" +
        "# hoặc tăng TTL trong ứng dụng.",
    },
  ],
},
{
  cat: 'Chi phí',
  q: 'Chi phí data transfer trên AWS — những điểm hay bị bỏ sót?',
  answer:
    '- **Inbound tới AWS**: hầu như **miễn phí**.\n' +
    '- **Outbound ra internet**: tính phí theo GB (giảm dần theo bậc), thường là khoản lớn.\n' +
    '- **Cross-AZ** (trong cùng region): tính phí **cả hai chiều** (~$0.01/GB mỗi chiều) — RDS Multi-AZ, chat giữa service khác AZ, NAT GW khác AZ.\n' +
    '- **Cross-region**: đắt hơn cross-AZ.\n' +
    '- **Qua NAT Gateway**: phí xử lý mỗi GB + phí giờ.\n' +
    '- **CloudFront ra internet**: rẻ hơn trực tiếp từ EC2/S3.',
  essence:
    'Data transfer là "chi phí ẩn" lớn nhất trên AWS. Giữ traffic trong cùng AZ, dùng VPC Endpoint thay NAT, đặt CloudFront trước origin, và cẩn thận với chit-chat cross-AZ giữa microservice.',
  example:
    'Microservice A (AZ-a) gọi B (AZ-b) hàng triệu lần/ngày với payload lớn → hoá đơn cross-AZ bất ngờ. Sửa: dùng topology-aware routing (gọi instance cùng AZ trước), hoặc chấp nhận đánh đổi HA. NAT GW xử lý 10TB/tháng traffic tới S3 → thay bằng Gateway Endpoint (free).',
  viz: {
    type: 'bars',
    title: 'Data transfer — chi phí tương đối ($/GB, xấp xỉ)',
    unit: '$/GB',
    items: [
      { label: 'Inbound tới AWS', value: 0, note: 'hầu như miễn phí' },
      { label: 'Cross-AZ (mỗi chiều)', value: 0.01, note: 'tính CẢ HAI CHIỀU — RDS Multi-AZ, chat cross-AZ giữa microservice' },
      { label: 'Cross-region', value: 0.02, note: 'đắt hơn cross-AZ' },
      { label: 'Qua NAT Gateway', value: 0.045, note: 'phí xử lý mỗi GB + phí giờ' },
      { label: 'Outbound ra internet', value: 0.09, note: 'giảm dần theo bậc; CloudFront rẻ hơn trực tiếp' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Bảng chi phí ngầm và cách cắt giảm",
      code:
        "# QUY TẮC CƠ BẢN:\n" +
        "#  - vào AWS (inbound): MIỄN PHÍ\n" +
        "#  - trong CÙNG AZ, dùng private IP: MIỄN PHÍ\n" +
        "#  - GIỮA CÁC AZ trong cùng region: ~$0,01/GB MỖI CHIỀU (tức $0,02 khứ hồi)\n" +
        "#  - giữa các REGION: ~$0,02/GB trở lên\n" +
        "#  - RA INTERNET: ~$0,09/GB (100GB đầu mỗi tháng miễn phí)\n" +
        "#  - qua NAT Gateway: thêm ~$0,045/GB NGOÀI phí trên\n" +
        "#  - qua Transit Gateway: thêm ~$0,02/GB mỗi attachment\n" +
        "\n" +
        "# NHỮNG CHỖ HAY BỊ BỎ SÓT:\n" +
        "#  1) dùng PUBLIC IP hoặc Elastic IP để hai instance trong CÙNG VPC nói chuyện\n" +
        "#     -> bị tính như đi qua Internet. Luôn dùng PRIVATE IP hoặc tên DNS nội bộ.\n" +
        "#  2) RDS Multi-AZ nhân bản qua AZ -> AWS không tính, NHƯNG ứng dụng ở AZ này\n" +
        "#     đọc DB ở AZ kia thì CÓ tính\n" +
        "#  3) ALB rải request sang instance ở AZ khác -> cross-AZ charge\n" +
        "#     (tắt cross-zone load balancing của NLB nếu chấp nhận được sự lệch tải)\n" +
        "#  4) S3 ở region A, EC2 ở region B\n" +
        "#  5) log/metric đẩy sang region khác\n" +
        "\n" +
        "# CÁCH CẮT GIẢM, theo mức hiệu quả:\n" +
        "#  - CloudFront cho traffic ra Internet: rẻ hơn EC2/S3 trực tiếp, và MIỄN PHÍ\n" +
        "#    từ origin AWS lên CloudFront\n" +
        "#  - VPC Gateway Endpoint cho S3/DynamoDB (miễn phí, bỏ được NAT)\n" +
        "#  - giữ traffic trong cùng AZ khi có thể (đọc từ replica cùng AZ)\n" +
        "#  - nén dữ liệu trước khi truyền\n" +
        "\n" +
        "aws ce get-cost-and-usage --time-period Start=2026-08-01,End=2026-09-01 \\\n" +
        "  --granularity MONTHLY --metrics UnblendedCost \\\n" +
        "  --filter \u0027{\"Dimensions\":{\"Key\":\"USAGE_TYPE_GROUP\",\"Values\":[\"EC2: Data Transfer - Internet (Out)\"]}}\u0027",
    },
  ],
},
{
  cat: 'Bảo mật',
  q: 'AWS WAF và Shield bảo vệ khỏi những gì?',
  answer:
    '- **AWS Shield Standard** (miễn phí, tự động): chống DDoS lớp mạng/vận chuyển (L3/L4) — SYN flood, UDP reflection — cho mọi tài nguyên có public IP / CloudFront / Route 53.\n' +
    '- **Shield Advanced** (trả phí): bảo vệ nâng cao, DDoS response team, cost protection (hoàn phí scale do DDoS), bảo vệ L7.\n' +
    '- **WAF**: firewall lớp ứng dụng (L7) — rule chặn SQLi, XSS, rate-based rule, geo block, IP reputation, bot control, managed rule groups. Gắn vào ALB, CloudFront, API Gateway, AppSync.',
  essence:
    'Shield = chống DDoS (volumetric). WAF = lọc request độc hại ở tầng HTTP (injection, bot, abuse). Hai lớp khác nhau, thường dùng cùng nhau ở biên (CloudFront + WAF).',
  example:
    'API public: CloudFront + WAF với managed rule `AWSManagedRulesCommonRuleSet` + rate-based rule (chặn IP > 2000 req/5 phút) + geo-block các nước không phục vụ. Shield Standard tự lo lớp mạng. Nếu là mục tiêu DDoS thường xuyên → Shield Advanced.',
  viz: {
    type: 'compare',
    cols: ['AWS Shield', 'AWS WAF'],
    rows: [
      ['Lớp', 'L3/L4 — chống DDoS volumetric (SYN flood, UDP reflection)', 'L7 — lọc request độc hại HTTP'],
      ['Chặn gì', 'lưu lượng tấn công', 'SQLi, XSS, bot, rate-based, geo block, IP reputation'],
      ['Standard', 'miễn phí, tự động cho mọi public IP/CloudFront/Route 53', '—'],
      ['Advanced / gắn vào', 'DDoS response team, cost protection, L7', 'ALB, CloudFront, API Gateway, AppSync'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Tầng 7 vs tầng 3/4",
      code:
        "# SHIELD STANDARD — MIỄN PHÍ, tự động cho mọi khách hàng. Chống DDoS tầng\n" +
        "# 3/4 phổ biến (SYN flood, UDP reflection). Không phải làm gì cả.\n" +
        "\n" +
        "# SHIELD ADVANCED — $3.000/THÁNG. Đáng tiền khi:\n" +
        "#  + có đội ứng phó DDoS của AWS (DRT) hỗ trợ 24/7\n" +
        "#  + BẢO VỆ CHI PHÍ: được hoàn tiền phần scale phát sinh do bị tấn công\n" +
        "#  + phát hiện tinh vi hơn, có báo cáo chi tiết\n" +
        "#  + WAF miễn phí kèm theo\n" +
        "\n" +
        "# WAF — tầng 7 (HTTP). Chống SQL injection, XSS, bot, và giới hạn tốc độ.\n" +
        "# Gắn được vào: CloudFront, ALB, API Gateway, AppSync, Cognito.\n" +
        "aws wafv2 create-web-acl --name app-waf --scope REGIONAL \\\n" +
        "  --default-action Allow={} \\\n" +
        "  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=app \\\n" +
        "  --rules \u0027[\n" +
        "    {\"Name\":\"AWSManagedCommon\",\"Priority\":1,\n" +
        "     \"Statement\":{\"ManagedRuleGroupStatement\":{\n" +
        "       \"VendorName\":\"AWS\",\"Name\":\"AWSManagedRulesCommonRuleSet\"}},\n" +
        "     \"OverrideAction\":{\"None\":{}},\n" +
        "     \"VisibilityConfig\":{\"SampledRequestsEnabled\":true,\"CloudWatchMetricsEnabled\":true,\"MetricName\":\"common\"}},\n" +
        "    {\"Name\":\"RateLimit\",\"Priority\":2,\n" +
        "     \"Statement\":{\"RateBasedStatement\":{\"Limit\":2000,\"AggregateKeyType\":\"IP\"}},\n" +
        "     \"Action\":{\"Block\":{}},\n" +
        "     \"VisibilityConfig\":{\"SampledRequestsEnabled\":true,\"CloudWatchMetricsEnabled\":true,\"MetricName\":\"rate\"}}]\u0027\n" +
        "\n" +
        "# QUY TRÌNH TRIỂN KHAI AN TOÀN: bật rule ở chế độ COUNT trước, xem log\n" +
        "# vài ngày để tìm false positive, rồi mới chuyển sang BLOCK.\n" +
        "# Managed rule của AWS và của bên thứ ba (F5, Fortinet) tiết kiệm rất nhiều\n" +
        "# công so với tự viết rule.\n" +
        "# LƯU Ý: WAF cho CloudFront phải tạo ở scope CLOUDFRONT (us-east-1).",
    },
  ],
},
{
  cat: 'Kết nối',
  q: 'AWS PrivateLink để expose dịch vụ SaaS/nội bộ như thế nào?',
  answer:
    'PrivateLink cho phép **consumer** truy cập một dịch vụ qua **Interface Endpoint (ENI private IP trong VPC của họ)** mà không qua internet, không peering, không lộ dải IP hai bên.\n\n' +
    '**Provider** tạo một **Endpoint Service** trước một **NLB**, whitelist account được phép kết nối. Consumer tạo interface endpoint trỏ tới service đó.\n\n' +
    'Traffic một chiều (consumer → provider), IP không cần không trùng, provider chỉ thấy traffic qua NLB.',
  essence:
    'PrivateLink = "expose đúng một service qua một ENI riêng tư", không phải nối hai mạng. Lý tưởng cho SaaS bán cho khách hàng AWS, hoặc chia sẻ service nội bộ giữa các VPC/account mà không mở rộng mặt phẳng mạng.',
  example:
    'Công ty bán API phân tích: tạo Endpoint Service trước NLB, khách hàng (account khác) tạo interface endpoint `vpce-xxx.analytics.acme.com` → gọi API hoàn toàn trong mạng AWS, không đi internet, không cần khách hàng biết VPC/IP của bạn.',
  viz: {
    type: 'flow',
    title: 'PrivateLink — expose đúng MỘT service, không nối 2 mạng',
    nodes: ['Provider: Endpoint Service trước một NLB', 'whitelist account được phép', 'Consumer: Interface Endpoint (ENI private IP)', 'traffic một chiều consumer → provider trong mạng AWS'],
    steps: [
      { to: 2, label: 'consumer tạo interface endpoint trỏ tới service đó' },
      { to: 3, label: 'không qua internet, không peering, IP hai bên không cần không trùng' },
      { to: 3, label: 'lý tưởng cho SaaS bán cho khách AWS' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đưa dịch vụ sang VPC khác mà không mở mạng",
      code:
        "# VẤN ĐỀ với peering/TGW: nối hai VPC là mở cả một vùng mạng, và CIDR không\n" +
        "# được trùng. PrivateLink chỉ đưa MỘT DỊCH VỤ sang, một chiều, CIDR trùng\n" +
        "# cũng không sao.\n" +
        "\n" +
        "# PHÍA NHÀ CUNG CẤP: đặt NLB trước dịch vụ rồi tạo endpoint service\n" +
        "aws ec2 create-vpc-endpoint-service-configuration \\\n" +
        "  --network-load-balancer-arns $NLB_ARN \\\n" +
        "  --acceptance-required \\\n" +
        "  --supported-ip-address-types ipv4\n" +
        "# Cho phép tài khoản nào được kết nối:\n" +
        "aws ec2 modify-vpc-endpoint-service-permissions \\\n" +
        "  --service-id vpce-svc-123 \\\n" +
        "  --add-allowed-principals arn:aws:iam::222222222222:root\n" +
        "\n" +
        "# PHÍA KHÁCH HÀNG: tạo interface endpoint trỏ tới service đó\n" +
        "aws ec2 create-vpc-endpoint --vpc-id vpc-b --vpc-endpoint-type Interface \\\n" +
        "  --service-name com.amazonaws.vpce.ap-southeast-1.vpce-svc-123 \\\n" +
        "  --subnet-ids subnet-1 subnet-2 --security-group-ids sg-client\n" +
        "\n" +
        "# ĐẶC ĐIỂM:\n" +
        "#  - lưu lượng đi trong mạng AWS, KHÔNG qua Internet\n" +
        "#  - MỘT CHIỀU: khách hàng gọi được nhà cung cấp, ngược lại thì không\n" +
        "#  - CIDR chồng lấn không thành vấn đề (dùng ENI có IP trong VPC khách hàng)\n" +
        "#  - chỉ TCP; NLB nên nhà cung cấp không thấy IP nguồn thật (trừ khi bật\n" +
        "#    proxy protocol v2)\n" +
        "#  - đây chính là cách các SaaS trên AWS Marketplace (Datadog, Snowflake,\n" +
        "#    MongoDB Atlas) cung cấp kết nối riêng",
    },
  ],
},
{
  cat: 'VPC',
  q: 'Troubleshoot kết nối mạng trong VPC — dùng công cụ gì?',
  answer:
    '- **VPC Flow Logs**: ghi metadata mọi luồng IP (src/dst/port/protocol, ACCEPT/REJECT, byte) ra CloudWatch Logs / S3. Cho biết traffic có tới nơi không và bị chặn ở đâu (SG hay NACL).\n' +
    '- **Reachability Analyzer**: phân tích **tĩnh** đường đi giữa hai ENI/IGW/... — chỉ ra chính xác thành phần nào (route table, SG, NACL) chặn.\n' +
    '- **VPC Network Access Analyzer**: tìm các đường truy cập ngoài ý muốn (compliance).\n' +
    '- Cơ bản: `ping`/`traceroute`/`telnet`/`ss`, kiểm tra route table, DNS.',
  essence:
    'Flow Logs cho biết "traffic thực tế đi/bị chặn thế nào" (động). Reachability Analyzer cho biết "theo cấu hình thì có tới được không và tắc ở đâu" (tĩnh) — không cần gửi packet thật.',
  example:
    'App không kết nối được RDS: Reachability Analyzer từ ENI của app tới ENI của RDS → báo "blocked by security group sg-db: no inbound rule for port 5432 from sg-app". Sửa SG, phân tích lại → "reachable".',
  viz: {
    type: 'compare',
    cols: ['VPC Flow Logs', 'Reachability Analyzer'],
    rows: [
      ['Kiểu', 'động — traffic thực tế', 'tĩnh — theo cấu hình (không gửi packet thật)'],
      ['Cho biết', 'traffic có tới nơi không, bị chặn ở đâu (ACCEPT/REJECT)', 'theo cấu hình có tới được không và TẮC ở thành phần nào'],
      ['Output', 'metadata luồng IP → CloudWatch/S3', 'chỉ đúng route table/SG/NACL đang chặn'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Thứ tự kiểm tra và các công cụ",
      code:
        "# CÔNG CỤ MẠNH NHẤT: Reachability Analyzer — mô phỏng đường đi và chỉ ra\n" +
        "# CHÍNH XÁC thành phần nào chặn, KHÔNG cần gửi gói tin thật.\n" +
        "aws ec2 create-network-insights-path --source i-source --destination i-dest \\\n" +
        "  --protocol tcp --destination-port 443\n" +
        "aws ec2 start-network-insights-analysis --network-insights-path-id nip-123\n" +
        "aws ec2 describe-network-insights-analyses --network-insights-analysis-ids nia-123\n" +
        "# Output nói rõ: \"blocked by security group sg-xxx rule ...\" — tiết kiệm hàng giờ.\n" +
        "\n" +
        "# VPC FLOW LOGS — xem gói tin có tới không và bị ACCEPT hay REJECT\n" +
        "aws ec2 create-flow-logs --resource-type VPC --resource-ids vpc-123 \\\n" +
        "  --traffic-type ALL --log-destination-type cloud-watch-logs \\\n" +
        "  --log-group-name /vpc/flowlogs --deliver-logs-permission-arn $ROLE\n" +
        "# Truy vấn trong Logs Insights:\n" +
        "#   fields srcAddr, dstAddr, dstPort, action\n" +
        "#   | filter action = \"REJECT\" and dstPort = 443\n" +
        "#   | stats count(*) by srcAddr, dstAddr\n" +
        "# Lưu ý: REJECT ở flow log của SG nghĩa là SG chặn; NACL chặn thì thấy ở\n" +
        "# flow log của subnet.\n" +
        "\n" +
        "# DANH SÁCH KIỂM TRA THEO THỨ TỰ (từ hay sai nhất tới ít gặp):\n" +
        "#  1) Security Group: đã mở đúng cổng, đúng nguồn chưa (nhớ SG là stateful)\n" +
        "#  2) Route table: có đường tới đích không (peering/TGW/NAT/IGW)\n" +
        "#  3) NACL: đã mở CẢ hai chiều, kể cả cổng ephemeral chưa\n" +
        "#  4) Subnet có phải public không, instance có public IP không\n" +
        "#  5) DNS phân giải đúng chưa (dig/nslookup)\n" +
        "#  6) Firewall/iptables TRONG hệ điều hành\n" +
        "#  7) Ứng dụng có LẮNG NGHE trên đúng interface không (0.0.0.0 hay 127.0.0.1)\n" +
        "ss -tlnp                  # kiểm tra bước 7 — rất hay là nguyên nhân thật",
    },
  ],
},
{
  cat: 'CDN',
  q: 'AWS Global Accelerator khác CloudFront thế nào?',
  answer:
    '- **CloudFront**: CDN — **cache** nội dung (chủ yếu HTTP/S) ở edge, tối ưu cho content tĩnh/động cacheable, có WAF/Lambda@Edge.\n' +
    '- **Global Accelerator**: cung cấp **2 anycast IP tĩnh** toàn cầu; traffic của user vào edge gần nhất rồi đi **mạng backbone AWS** tới endpoint (ALB/NLB/EC2/EIP) ở region. **Không cache** — tối ưu đường đi cho **mọi giao thức** (TCP/UDP), failover region nhanh (health check, không phụ thuộc DNS TTL).',
  essence:
    'CloudFront tăng tốc bằng **cache ở biên**. Global Accelerator tăng tốc bằng **định tuyến qua backbone AWS** cho traffic không cache được (game, VoIP, API non-HTTP, IoT), kèm IP tĩnh + failover nhanh.',
  example:
    'Game server UDP đa vùng: Global Accelerator 2 IP tĩnh, player toàn cầu vào edge gần nhất, đi backbone tới region thấp latency nhất; region chết → chuyển endpoint trong vài giây (không chờ DNS). Website tin tức: CloudFront (cache).',
  viz: {
    type: 'compare',
    cols: ['CloudFront', 'Global Accelerator'],
    rows: [
      ['Tăng tốc bằng', 'cache nội dung ở edge', 'định tuyến qua backbone AWS'],
      ['Cache?', 'có', 'KHÔNG'],
      ['Giao thức', 'chủ yếu HTTP/S', 'mọi giao thức (TCP/UDP)'],
      ['Đặc điểm', 'WAF, Lambda@Edge', '2 anycast IP tĩnh, failover region nhanh (không phụ thuộc DNS TTL)'],
      ['Dùng cho', 'content tĩnh/động cacheable', 'game, VoIP, API non-HTTP, IoT'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Tăng tốc mạng vs cache nội dung",
      code:
        "# CLOUDFRONT — CDN: CACHE nội dung ở edge, chỉ HTTP/HTTPS.\n" +
        "#  + hit cache thì không chạm origin -> giảm tải và độ trễ mạnh\n" +
        "#  + có WAF, Lambda@Edge/CloudFront Functions, nén, chứng chỉ miễn phí\n" +
        "#  - chỉ hiệu quả với nội dung CACHE ĐƯỢC; API động thì lợi ích chủ yếu là\n" +
        "#    kết nối TCP/TLS được kết thúc ở edge\n" +
        "\n" +
        "# GLOBAL ACCELERATOR — KHÔNG cache. Nó cấp 2 IP ANYCAST tĩnh, đưa lưu lượng\n" +
        "# vào mạng lõi AWS ở edge gần nhất rồi đi tiếp bằng đường nội bộ.\n" +
        "#  + hỗ trợ TCP VÀ UDP (CloudFront thì không) -> game, VoIP, IoT\n" +
        "#  + IP TĨNH -> đối tác whitelist được, và không phụ thuộc TTL của DNS\n" +
        "#  + failover giữa region trong VÀI GIÂY (không chờ DNS TTL)\n" +
        "#  + cải thiện độ trễ và jitter cho traffic ĐỘNG, không cache được\n" +
        "aws globalaccelerator create-accelerator --name app-ga --ip-address-type IPV4\n" +
        "aws globalaccelerator create-endpoint-group \\\n" +
        "  --listener-arn $LISTENER --endpoint-group-region ap-southeast-1 \\\n" +
        "  --traffic-dial-percentage 100 \\\n" +
        "  --endpoint-configurations EndpointId=$ALB_ARN,Weight=100\n" +
        "\n" +
        "# CHỌN:\n" +
        "#  - website, tài sản tĩnh, API cache được  -> CLOUDFRONT\n" +
        "#  - TCP/UDP không phải HTTP, cần IP tĩnh, cần failover đa region nhanh\n" +
        "#    -> GLOBAL ACCELERATOR\n" +
        "#  - dùng CẢ HAI cũng hợp lý: CloudFront cho nội dung tĩnh,\n" +
        "#    Global Accelerator cho API động đa region.\n" +
        "# GA tính $0,025/giờ mỗi accelerator + phí truyền -> không rẻ, chỉ dùng\n" +
        "# khi thật sự cần một trong các đặc tính trên.",
    },
  ],
},
{
  cat: 'VPC',
  q: 'Elastic IP và Elastic Network Interface (ENI) là gì?',
  answer:
    '- **ENI**: card mạng ảo — có private IP (1 primary + nhiều secondary), MAC, security group, có thể có public IP/EIP. Gắn/tháo giữa các instance (cùng AZ) → di chuyển "danh tính mạng".\n' +
    '- **Elastic IP (EIP)**: public IPv4 tĩnh **của bạn**, gán vào ENI. Giữ nguyên khi instance stop/start hoặc khi bạn chuyển sang instance khác. EIP **không gắn vào tài nguyên đang chạy** bị tính phí (để chống lãng phí IPv4).',
  essence:
    'ENI là "danh tính mạng có thể tháo lắp"; EIP là "IP public cố định bạn kiểm soát". Dùng khi cần IP không đổi (whitelist của đối tác, DNS trỏ cứng, failover thủ công).',
  example:
    'Đối tác chỉ whitelist một IP outbound: đặt NAT Gateway với EIP cố định → mọi outbound của private subnet có IP nguồn không đổi. Failover appliance: tháo ENI (mang theo IP + SG) từ instance chết, gắn sang instance dự phòng.',
  viz: {
    type: 'compare',
    cols: ['ENI (Elastic Network Interface)', 'Elastic IP (EIP)'],
    rows: [
      ['Là gì', 'card mạng ảo: private IP, MAC, SG', 'public IPv4 tĩnh của bạn'],
      ['Gắn/tháo', 'giữa các instance (cùng AZ) → di chuyển "danh tính mạng"', 'gán vào ENI, giữ nguyên khi stop/start hoặc đổi instance'],
      ['Lưu ý', '—', 'EIP không gắn tài nguyên đang chạy → bị tính phí'],
      ['Dùng khi', 'failover appliance (mang IP + SG)', 'whitelist đối tác, DNS trỏ cứng'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "IP công khai cố định và card mạng ảo",
      code:
        "# ELASTIC IP — địa chỉ IPv4 public TĨNH, thuộc về TÀI KHOẢN chứ không phải instance.\n" +
        "aws ec2 allocate-address --domain vpc\n" +
        "aws ec2 associate-address --instance-id i-1234 --allocation-id eipalloc-123\n" +
        "# Instance stop/start -> public IP thường ĐỔI; Elastic IP thì KHÔNG.\n" +
        "\n" +
        "# TIỀN: từ 2/2024, MỌI IPv4 public đều tính phí (~$0,005/giờ ~ $3,6/tháng),\n" +
        "# và EIP KHÔNG GẮN VÀO ĐÂU cũng bị tính. Đây là khoản lãng phí phổ biến:\n" +
        "aws ec2 describe-addresses --query \u0027Addresses[?AssociationId==null].[PublicIp,AllocationId]\u0027\n" +
        "# -> giải phóng ngay những cái không dùng\n" +
        "# Giới hạn 5 EIP mỗi region (xin tăng được).\n" +
        "\n" +
        "# KHI NÀO THẬT SỰ CẦN EIP: NAT Gateway, đối tác cần whitelist IP, DNS trỏ\n" +
        "# thẳng vào IP. Còn lại nên dùng ALB/NLB + DNS thay vì gán EIP cho instance.\n" +
        "\n" +
        "# ENI — card mạng ảo: có private IP, MAC, security group, có thể gắn EIP.\n" +
        "# ENI TÁCH RỜI vòng đời với instance -> gắn sang instance khác được.\n" +
        "aws ec2 create-network-interface --subnet-id subnet-123 \\\n" +
        "  --groups sg-123 --description \"app eni\"\n" +
        "aws ec2 attach-network-interface --network-interface-id eni-123 \\\n" +
        "  --instance-id i-456 --device-index 1\n" +
        "\n" +
        "# ỨNG DỤNG THỰC TẾ của ENI phụ:\n" +
        "#  - failover thủ công: instance chính chết -> gắn ENI (kèm IP và SG) sang\n" +
        "#    instance dự phòng, mọi thứ trỏ tới IP đó không cần đổi gì\n" +
        "#  - tách mạng quản trị khỏi mạng dữ liệu\n" +
        "#  - license gắn với địa chỉ MAC\n" +
        "# Số ENI và số IP mỗi ENI PHỤ THUỘC LOẠI INSTANCE — đây là giới hạn hay\n" +
        "# gây bất ngờ khi chạy nhiều pod trên EKS (mỗi pod một IP từ ENI).",
    },
  ],
},
]);
