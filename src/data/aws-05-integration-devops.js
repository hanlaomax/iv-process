SS.addQuestions('aws', [
{
  cat: 'Messaging',
  q: 'SQS Standard và FIFO khác nhau? Visibility timeout và DLQ?',
  answer:
    '- **Standard**: throughput gần như vô hạn, **at-least-once** (có thể trùng), **best-effort ordering** (không đảm bảo thứ tự).\n' +
    '- **FIFO**: đảm bảo **thứ tự** trong một `MessageGroupId` và **exactly-once processing** (dedup theo `MessageDeduplicationId` trong 5 phút). Throughput giới hạn (~3.000 msg/s với batching, cao hơn với high throughput mode).\n\n' +
    '**Visibility timeout**: sau khi consumer nhận message, nó "ẩn" trong khoảng này; nếu consumer không xoá message trước khi hết → message hiện lại cho consumer khác.\n\n' +
    '**DLQ**: sau `maxReceiveCount` lần nhận không thành công, message chuyển sang dead-letter queue.',
  essence:
    'Standard = nhanh, trùng, không thứ tự (cần consumer idempotent). FIFO = thứ tự + không trùng, đổi lấy throughput. Visibility timeout phải > thời gian xử lý; DLQ hứng message độc.',
  example:
    'Xử lý đơn hàng cần đúng thứ tự per-customer: FIFO với `MessageGroupId = customerId`. Xử lý email hàng loạt (thứ tự không quan trọng): Standard. Visibility timeout đặt 6× thời gian xử lý trung bình; `maxReceiveCount = 5` → DLQ + alarm.',
},
{
  cat: 'Messaging',
  q: 'SQS long polling và message retention?',
  answer:
    '- **Short polling** (mặc định, `WaitTimeSeconds=0`): trả về ngay, có thể rỗng dù có message (chỉ hỏi một tập server) → tốn request rỗng, tăng chi phí và latency.\n' +
    '- **Long polling** (`WaitTimeSeconds` 1–20): server **chờ** tới khi có message hoặc hết thời gian → ít request rỗng hơn, phản hồi nhanh hơn khi có message, rẻ hơn. **Luôn nên bật.**\n\n' +
    '- **Retention**: message giữ tối đa 4 ngày mặc định (cấu hình 60s–14 ngày). Không consume kịp → mất.',
  essence:
    'Long polling giảm chi phí và latency bằng cách để server chờ thay vì client hỏi liên tục. Retention là "hạn sử dụng" của message chưa xử lý.',
  example:
    'Consumer đặt `WaitTimeSeconds=20`: gần như không có ReceiveMessage rỗng, hoá đơn SQS giảm, message được pick trong < 1s. Queue phục vụ job nặng chạy đêm: retention 14 ngày phòng consumer chết cả cuối tuần.',
},
{
  cat: 'Messaging',
  q: 'SNS: pub/sub, fanout và filter policy?',
  answer:
    'SNS là pub/sub: publisher gửi tới **topic**, SNS đẩy tới mọi **subscriber** (SQS, Lambda, HTTP/S, email, SMS, Kinesis Firehose).\n\n' +
    '**Fanout pattern**: SNS topic → nhiều SQS queue. Mỗi service tiêu thụ độc lập từ queue riêng (có buffer, retry, DLQ) → tách rời hoàn toàn.\n\n' +
    '**Filter policy**: mỗi subscription lọc message theo attribute (`{"eventType": ["order_created"]}`) → subscriber chỉ nhận cái nó quan tâm, không cần lọc trong code.',
  essence:
    'SNS đẩy (push) một message tới nhiều đích. Fanout SNS→SQS thêm buffer/độ bền cho mỗi consumer. Filter policy chuyển việc lọc lên tầng messaging.',
  example:
    'Event `OrderPlaced` → SNS topic → 3 SQS queue: `inventory` (filter: mọi order), `fraud-check` (filter: `amount > 1000`), `analytics` (mọi order). Thêm consumer mới = thêm một subscription, publisher không đổi.',
},
{
  cat: 'Messaging',
  q: 'EventBridge khác SNS thế nào? Khi nào dùng?',
  answer:
    'EventBridge là **event bus** hướng tới kiến trúc event-driven doanh nghiệp:\n' +
    '- **Rule matching** trên toàn bộ nội dung event (không chỉ attribute), với pattern phong phú (prefix, số, `exists`, `anything-but`).\n' +
    '- **Nhiều target/rule** (Lambda, SQS, SNS, Step Functions, API destination, cross-account/cross-region bus).\n' +
    '- Nhận event từ **AWS services** (EC2 state change, S3, CodePipeline…) và **SaaS partners** (Datadog, Zendesk…).\n' +
    '- **Schema registry** + code binding, **input transformer**, **archive & replay**.\n\n' +
    'SNS nhanh hơn, latency thấp hơn, throughput cao hơn, rẻ hơn cho fanout thuần đơn giản.',
  essence:
    'SNS = fanout nhanh, đơn giản (attribute filter). EventBridge = router sự kiện thông minh (content-based routing, nguồn AWS/SaaS, replay) — chậm hơn chút nhưng mạnh hơn nhiều cho event choreography.',
  example:
    'Microservice choreography: dùng EventBridge custom bus, rule `detail.status = "SHIPPED"` → Lambda gửi email + Step Function bắt đầu quy trình giao. `EC2 Spot interruption` event của AWS → rule → Lambda drain instance.',
},
{
  cat: 'Streaming',
  q: 'Kinesis Data Streams, Firehose và Managed Service for Flink khác nhau?',
  answer:
    '- **Data Streams**: log realtime có **shard**, retention 1–365 ngày, consumer đọc theo offset, **replay được**, latency ~200ms. Bạn quản lý consumer (KCL/Lambda). Giống Kafka thu nhỏ.\n' +
    '- **Firehose**: **fully managed delivery** — buffer rồi nạp vào S3/Redshift/OpenSearch/Splunk, có transform (Lambda) và convert format (Parquet). Không replay, latency tối thiểu ~60s. Cho "đổ dữ liệu vào kho".\n' +
    '- **Managed Service for Apache Flink**: xử lý stream có state (aggregate, window, join) bằng SQL/Java/Python.',
  essence:
    'Data Streams = bус realtime replay-được (bạn xử lý). Firehose = ống nạp dữ liệu vào kho, không quản lý gì. Flink = engine tính toán trên stream.',
  example:
    'Clickstream: web → Kinesis Data Streams → (a) Lambda realtime cho dashboard live; (b) Firehose subscribe cùng stream, nén Parquet, đổ S3 mỗi 5 phút cho Athena. Cần tính "top sản phẩm 10 phút gần nhất": Flink.',
},
{
  cat: 'Streaming',
  q: 'Kinesis: shard, partition key và resharding?',
  answer:
    'Mỗi **shard**: ghi 1 MB/s hoặc 1.000 records/s; đọc 2 MB/s (shared) hoặc 2 MB/s/consumer (enhanced fan-out).\n\n' +
    '**Partition key** → hash → shard. Key phân bố kém → **hot shard** (một shard quá tải trong khi shard khác nhàn).\n\n' +
    '**Resharding**: `split` (tách hot shard làm hai) hoặc `merge`. Thủ công hoặc dùng auto-scaling (Lambda + CloudWatch). On-demand mode: Kinesis tự scale shard theo tải.',
  essence:
    'Shard là đơn vị throughput + song song (giống partition Kafka). Partition key quyết định phân bố; on-demand mode bỏ việc tự quản shard nhưng đắt hơn ở tải cao ổn định.',
  example:
    'Telemetry từ 100k thiết bị: partition key = `deviceId` (cardinality cao, phân bố đều). Một khách hàng lớn chiếm 40% traffic → hot shard → split shard đó, hoặc thêm suffix ngẫu nhiên vào key cho tenant lớn.',
},
{
  cat: 'Orchestration',
  q: 'Step Functions: state machine, Standard vs Express?',
  answer:
    'Step Functions điều phối workflow bằng **state machine** (JSON/ASL): các state `Task`, `Choice`, `Parallel`, `Map`, `Wait`, `Retry`/`Catch`. Tích hợp trực tiếp 200+ dịch vụ AWS (không cần Lambda "keo").\n\n' +
    '- **Standard**: tối đa 1 năm, exactly-once, lịch sử thực thi đầy đủ (audit/debug), giá theo state transition. Cho workflow nghiệp vụ dài, cần độ tin cậy và quan sát.\n' +
    '- **Express**: tối đa 5 phút, at-least-once, giá theo số lần chạy + thời gian/RAM, throughput rất cao. Cho xử lý event/stream tần suất lớn, ngắn.',
  essence:
    'Step Functions thay "orchestration bằng code + retry thủ công" bằng state machine khai báo có retry/catch built-in. Standard cho workflow dài đáng tin; Express cho khối lượng lớn ngắn hạn.',
  example:
    'Onboarding khách hàng (nhiều bước, chờ phê duyệt, có thể kéo dài ngày): Standard, `Wait for callback` cho bước duyệt thủ công. Xử lý mỗi event IoT qua 4 bước biến đổi, 50k/s: Express.',
},
{
  cat: 'Observability',
  q: 'CloudWatch: metrics, alarms, Logs và Logs Insights?',
  answer:
    '- **Metrics**: time-series (namespace/dimension). AWS phát sẵn nhiều; bạn `PutMetricData` custom hoặc dùng **EMF** (Embedded Metric Format — log JSON có cấu trúc, CloudWatch tự trích metric).\n' +
    '- **Alarms**: đánh giá metric theo ngưỡng/anomaly → hành động (SNS, Auto Scaling, EC2 action). **Composite alarm** kết hợp nhiều alarm giảm nhiễu.\n' +
    '- **Logs**: log group/stream, retention cấu hình được, metric filter (đếm pattern → metric), subscription filter (stream sang Lambda/Kinesis/OpenSearch).\n' +
    '- **Logs Insights**: query ngôn ngữ riêng để phân tích log ad-hoc.',
  essence:
    'Metrics cho xu hướng & alarm; Logs cho chi tiết & điều tra; Logs Insights cho truy vấn nhanh; metric filter/EMF là cầu nối biến log thành metric.',
  example:
    'Không có metric "số lần thanh toán thất bại": thêm metric filter trên log group đếm pattern `"payment failed"` → metric → alarm khi > 10/5 phút. Điều tra spike: Logs Insights `fields @message | filter @message like /payment failed/ | stats count() by bin(1m)`.',
},
{
  cat: 'Observability',
  q: 'AWS X-Ray / distributed tracing giải quyết vấn đề gì?',
  answer:
    'Trong hệ microservice, một request đi qua API Gateway → Lambda → DynamoDB → SQS → Lambda khác. Khi chậm/lỗi, log rời rạc không cho biết **khâu nào**.\n\n' +
    'X-Ray gán **trace ID** truyền qua các service, mỗi service ghi **segment/subsegment** (thời gian, lỗi, metadata) → dựng **service map** và **timeline** của từng request.\n\n' +
    'Tích hợp SDK/agent, hoặc dùng **OpenTelemetry** (ADOT) đẩy sang X-Ray hoặc backend khác.',
  essence:
    'Tracing nối các mảnh xử lý rải rác của một request thành một bức tranh liền mạch — chỉ ra service/khâu nào là nút thắt hoặc nguồn lỗi, điều mà metric và log đơn lẻ không làm được.',
  example:
    'API p99 tăng: service map X-Ray cho thấy 80% thời gian nằm ở subsegment "DynamoDB Query" của một Lambda → thiếu index / query scan. Không có tracing, bạn phải đoán và thêm log thủ công khắp nơi.',
},
{
  cat: 'IaC',
  q: 'CloudFormation: stack, change set, drift, nested/StackSets?',
  answer:
    '- **Stack**: tập tài nguyên quản lý cùng nhau từ một template. Xoá stack = xoá tài nguyên (trừ `DeletionPolicy: Retain`).\n' +
    '- **Change set**: xem trước thay đổi (tạo/sửa/**thay thế** tài nguyên) trước khi apply — tránh bất ngờ (một số thay đổi buộc re-create).\n' +
    '- **Drift detection**: phát hiện tài nguyên bị sửa **ngoài** CloudFormation (click tay trong console).\n' +
    '- **Nested stacks**: tách template lớn thành module. **StackSets**: deploy cùng một stack ra nhiều account/region.',
  essence:
    'CloudFormation là state machine cho hạ tầng: template là mong muốn, stack là hiện trạng, change set là "diff" xem trước, drift là "ai đó sửa lén". StackSets nhân bản ra tổ chức.',
  example:
    'Đổi instance type RDS: tạo change set → thấy "Replacement: True" (mất dữ liệu!) → dừng lại, dùng `modify-db-instance` thay vì CloudFormation, hoặc snapshot trước. Drift detection hàng tuần phát hiện security group bị mở tay.',
},
{
  cat: 'IaC',
  q: 'CloudFormation, CDK và Terraform — so sánh?',
  answer:
    '- **CloudFormation**: native AWS, YAML/JSON khai báo, không cần state file (AWS giữ), rollback tự động, chỉ AWS.\n' +
    '- **CDK**: viết bằng ngôn ngữ lập trình (TS/Python/Java) → **synth ra CloudFormation**. Có vòng lặp, hàm, abstraction (Construct) tái dùng. Vẫn là AWS-only, thừa hưởng giới hạn CFN.\n' +
    '- **Terraform**: HCL khai báo, **đa cloud/đa provider**, cộng đồng module lớn, quản lý **state file** (cần backend S3+DynamoDB lock), plan/apply rõ ràng. Không rollback tự động.',
  essence:
    'CFN/CDK cho "all-in AWS" (CDK thêm sức mạnh ngôn ngữ). Terraform cho đa cloud và hệ sinh thái provider rộng, đổi lấy việc tự quản state. Chọn theo phạm vi (AWS-only?) và kỹ năng team.',
  example:
    'Shop toàn AWS, team thích TypeScript: CDK (Construct dùng lại cho mọi service: ECS + ALB + alarm + dashboard trong 20 dòng). Công ty dùng cả AWS + Cloudflare + Datadog + GitHub: Terraform để quản tất cả trong một workflow.',
},
{
  cat: 'CI/CD',
  q: 'CodePipeline, CodeBuild, CodeDeploy — vai trò mỗi cái?',
  answer:
    '- **CodePipeline**: orchestrator — định nghĩa các **stage** (Source → Build → Test → Deploy → Approve) và luồng giữa chúng, trigger theo commit.\n' +
    '- **CodeBuild**: chạy build/test trong container managed theo `buildspec.yml` (như một CI runner). Trả artifact.\n' +
    '- **CodeDeploy**: triển khai artifact ra EC2/ASG/ECS/Lambda với chiến lược (in-place, blue/green, canary), hook lifecycle, tự rollback khi alarm/health fail.\n\n' +
    'Có thể thay từng phần bằng GitHub Actions/GitLab và chỉ dùng CodeDeploy cho phần deploy.',
  essence:
    'Pipeline điều phối, Build biên dịch/test, Deploy đưa ra môi trường an toàn (canary + auto rollback). Ba dịch vụ rời để ghép linh hoạt với công cụ ngoài.',
  example:
    'Pipeline: Source (CodeCommit/GitHub) → CodeBuild (`mvn verify`, build image, push ECR) → Deploy staging (CodeDeploy ECS blue/green) → Manual approval → Deploy prod (canary 10% 10 phút, rollback nếu alarm 5xx).',
},
{
  cat: 'CI/CD',
  q: 'Chiến lược triển khai trên AWS: rolling, blue/green, canary?',
  answer:
    '- **Rolling**: thay dần từng batch instance/task. Ít tài nguyên thừa, nhưng trong lúc deploy chạy lẫn 2 version; rollback = rolling ngược (chậm).\n' +
    '- **Blue/Green**: dựng môi trường mới (green) song song, test, rồi **chuyển toàn bộ traffic** (ALB target group / Route 53 / CodeDeploy). Rollback = trỏ lại blue **tức thì**. Tốn 2x tài nguyên tạm thời.\n' +
    '- **Canary**: chuyển **một phần nhỏ** traffic sang version mới, quan sát metric, tăng dần. Phát hiện lỗi với blast radius nhỏ.',
  essence:
    'Rolling tiết kiệm nhưng rollback chậm và trộn version. Blue/green cho rollback tức thì. Canary cho phát hiện lỗi sớm với ít người dùng bị ảnh hưởng. Canary + auto-rollback theo alarm là tiêu chuẩn vàng.',
  example:
    'ECS service với CodeDeploy: blue/green, canary `10% trong 5 phút` → CloudWatch alarm theo dõi 5xx & latency → nếu vượt ngưỡng, tự rollback về task set cũ (chưa bị xoá) trong < 1 phút.',
},
{
  cat: 'Vận hành',
  q: 'AWS Systems Manager (SSM): Session Manager, Run Command, Parameter Store?',
  answer:
    '- **Session Manager**: shell vào EC2/on-prem **không cần SSH/bastion/port 22 mở** — qua SSM agent + IAM, có log & audit toàn bộ phiên.\n' +
    '- **Run Command**: chạy lệnh/script trên nhiều instance cùng lúc (patch, restart service, thu thập thông tin) — không cần SSH.\n' +
    '- **Patch Manager**: vá OS theo baseline + maintenance window.\n' +
    '- **Parameter Store**: config & secret phân cấp (xem câu ở phần IAM).\n' +
    '- **State Manager / Automation**: giữ instance ở trạng thái mong muốn, runbook tự động.',
  essence:
    'SSM loại bỏ nhu cầu SSH/bastion và các credential quản trị: mọi thao tác vận hành đi qua IAM + agent, được audit. "Không có port 22" là một mục tiêu bảo mật khả thi nhờ SSM.',
  example:
    'Điều tra sự cố trên instance production: `aws ssm start-session --target i-xxx` → vào shell, phiên được ghi ra S3/CloudWatch. Vá lỗ hổng khẩn: Run Command chạy `yum update -y openssl` trên 200 instance có tag `env=prod` trong một lệnh.',
},
{
  cat: 'Chi phí',
  q: 'Các chiến lược tối ưu chi phí AWS chính?',
  answer:
    '- **Right-sizing**: dùng Compute Optimizer / CloudWatch để phát hiện instance quá khổ.\n' +
    '- **Cam kết**: Savings Plans / RI cho baseline; Spot cho workload chịu gián đoạn.\n' +
    '- **Tắt cái không dùng**: dev/test theo lịch, xoá EBS/EIP/snapshot mồ côi, xoá NAT GW không cần.\n' +
    '- **Storage tiering**: S3 lifecycle, gp2→gp3, Intelligent-Tiering.\n' +
    '- **Serverless/managed** cho tải thất thường.\n' +
    '- **Giảm data transfer**: VPC Endpoint, CloudFront, tránh chit-chat cross-AZ.\n' +
    '- **Quan sát**: Cost Explorer, Budgets + alert, cost allocation tags, anomaly detection.',
  essence:
    'Tối ưu chi phí = (đo lường + tag) → (right-size + cam kết + Spot) → (dọn rác + tiering) → (giảm data transfer). Làm liên tục, không phải một lần.',
  example:
    'Cost Explorer group by service: 40% hoá đơn là NAT Gateway data processing → thêm S3/ECR/SQS VPC Endpoint, tiết kiệm ~30% tổng. Compute Optimizer: 15 instance `m5.2xlarge` ở 10% CPU → xuống `m6i.large`.',
},
{
  cat: 'Vận hành',
  q: 'Auto scaling cho Lambda, DynamoDB, ECS hoạt động thế nào?',
  answer:
    '- **Lambda**: tự scale theo số invoke đồng thời (burst 500–3000 tuỳ region, rồi +500/phút), tới account concurrency limit. Reserved/provisioned concurrency để kiểm soát.\n' +
    '- **DynamoDB**: Application Auto Scaling điều chỉnh RCU/WCU theo target utilization (provisioned mode); hoặc on-demand tự lo.\n' +
    '- **ECS**: Service Auto Scaling (target tracking trên CPU/memory/ALB request count, hoặc step) điều chỉnh số task; cần Cluster Auto Scaling / Fargate cho capacity node.',
  essence:
    'Serverless (Lambda/DynamoDB on-demand) scale gần như tự động. Provisioned mode và ECS cần cấu hình target tracking. Luôn có trần (concurrency limit, max capacity) để chặn chi phí/blast radius khi có sự cố hoặc tấn công.',
  example:
    'ECS service: target tracking `ALBRequestCountPerTarget=1000`, min 4 / max 40 task. Kèm CloudWatch alarm nếu chạm max 40 trong 10 phút → cảnh báo (có thể là DDoS hoặc cần tăng max). DynamoDB bảng đi kèm: auto scaling WCU 100–5000.',
},
{
  cat: 'Tuân thủ',
  q: 'AWS Config rules và conformance pack dùng để làm gì?',
  answer:
    'Config rule đánh giá cấu hình tài nguyên liên tục và đánh dấu **COMPLIANT / NON_COMPLIANT**:\n' +
    '- **Managed rules**: `s3-bucket-public-read-prohibited`, `encrypted-volumes`, `rds-multi-az-support`, `iam-password-policy`, `required-tags`…\n' +
    '- **Custom rules**: Lambda hoặc Guard policy.\n' +
    '- **Remediation**: gắn SSM Automation tự sửa (ví dụ tự bật encryption, tự đóng security group).\n' +
    '- **Conformance pack**: bó rule theo chuẩn (CIS, PCI, HIPAA) deploy một lần cho account/OU.',
  essence:
    'Config biến chính sách bảo mật/tuân thủ thành kiểm tra tự động, liên tục, có thể tự khắc phục — thay vì audit thủ công định kỳ.',
  example:
    'Rule `s3-bucket-server-side-encryption-enabled` + remediation: bucket nào bị tạo không mã hoá → Config đánh dấu NON_COMPLIANT → SSM Automation tự bật SSE-S3 và gửi thông báo cho team tạo ra nó.',
},
{
  cat: 'Độ tin cậy',
  q: 'Các chiến lược Disaster Recovery trên AWS (theo RTO/RPO)?',
  answer:
    'Từ rẻ/chậm tới đắt/nhanh:\n' +
    '- **Backup & Restore**: sao lưu sang region khác (snapshot, S3 CRR). RTO/RPO hàng giờ. Rẻ nhất.\n' +
    '- **Pilot Light**: chạy sẵn lõi tối thiểu ở region phụ (DB replica, AMI sẵn), phần còn lại tắt. RTO ~chục phút.\n' +
    '- **Warm Standby**: phiên bản thu nhỏ chạy đủ ở region phụ, scale lên khi failover. RTO ~phút.\n' +
    '- **Multi-site Active/Active**: chạy đầy đủ ở nhiều region, traffic chia sẵn. RTO ~0, đắt và phức tạp nhất.',
  essence:
    'DR là đánh đổi chi phí ↔ (RTO: bao lâu để phục hồi) và (RPO: mất bao nhiêu dữ liệu). Chọn theo mức độ chịu đựng của nghiệp vụ, không phải "càng cao càng tốt".',
  example:
    'Blog nội bộ: Backup & Restore (snapshot hàng ngày sang region khác). Hệ thống thanh toán: Warm Standby — Aurora Global Database (RPO < 1s), ECS service min-capacity ở region phụ, Route 53 failover, diễn tập failover hàng quý.',
},
{
  cat: 'Messaging',
  q: 'SQS + Lambda: partial batch failure và batching xử lý thế nào?',
  answer:
    'Lambda poll SQS theo lô (`batchSize` tới 10.000 cho standard, cửa sổ `maxBatchingWindow`). Mặc định: nếu **function ném lỗi**, **cả lô** quay lại queue → message đã xử lý thành công bị xử lý lại.\n\n' +
    'Bật **`ReportBatchItemFailures`**: function trả về danh sách `batchItemFailures` (id các message fail) → chỉ những message đó quay lại queue, phần thành công được xoá.\n\n' +
    'Kèm: visibility timeout ≥ 6× function timeout; DLQ trên queue (không phải trên Lambda) để hứng message độc.',
  essence:
    'Không bật partial batch response = "một message xấu kéo cả lô chạy lại". `ReportBatchItemFailures` khoanh vùng thất bại xuống từng message, giữ hiệu quả của batching mà không mất tính đúng đắn.',
  example:
    'Lô 10 message, message #4 lỗi transient: function `try/catch` từng cái, trả `{batchItemFailures: [{itemIdentifier: "id-4"}]}` → 9 message được xoá, chỉ #4 quay lại queue và retry; sau `maxReceiveCount` lần → DLQ.',
},
{
  cat: 'Observability',
  q: 'Metrics, logs và traces — vai trò mỗi loại trong observability trên AWS?',
  answer:
    '- **Metrics** (CloudWatch): số liệu tổng hợp theo thời gian — rẻ để lưu lâu, tốt cho dashboard, alarm, xu hướng ("có vấn đề không?").\n' +
    '- **Logs** (CloudWatch Logs): sự kiện chi tiết dạng text/JSON — đắt hơn để lưu, dùng khi điều tra ("chuyện gì đã xảy ra với request này?").\n' +
    '- **Traces** (X-Ray/OTel): đường đi của một request qua các service — chỉ ra "khâu nào chậm/lỗi".\n\n' +
    'Nối chúng bằng **correlation id / trace id** trong log để nhảy giữa ba góc nhìn.',
  essence:
    'Metrics phát hiện "có gì đó sai" (alarm). Traces khoanh vùng "ở đâu". Logs giải thích "tại sao". Một quy trình điều tra tốt đi qua cả ba, được nối bằng id chung.',
  example:
    'Alarm: p99 latency `/checkout` tăng (metric) → mở X-Ray, lọc trace chậm → thấy span `PaymentService.charge` timeout (trace) → Logs Insights lọc theo `traceId` đó → thấy `connection pool exhausted` (log). Nguyên nhân: pool size quá nhỏ.',
},
]);
