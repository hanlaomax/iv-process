SS.addQuestions('aws', [
{
  cat: 'VPC',
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
},
]);
