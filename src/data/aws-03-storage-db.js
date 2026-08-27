SS.addQuestions('aws', [
{
  cat: 'S3',
  q: 'S3: bucket, object, key và độ bền 11 số 9 nghĩa là gì?',
  answer:
    'S3 là object storage: **bucket** (namespace toàn cầu duy nhất) chứa **object**. Object gồm `key` (chuỗi, "đường dẫn" phẳng — không có thư mục thật), data (tới 5TB), metadata, version id.\n\n' +
    '**11 số 9 durability** (99.999999999%): AWS tự động sao chép mỗi object qua tối thiểu 3 AZ. Xác suất mất một object trong năm cực nhỏ — kỳ vọng mất 1 object nếu bạn lưu 10 triệu object trong ~10.000 năm.\n\n' +
    '**Availability** (99.9–99.99% tuỳ storage class) là chuyện khác — khả năng truy cập tại một thời điểm.',
  essence:
    'Durability = "dữ liệu không mất" (rất cao nhờ replicate đa AZ). Availability = "truy cập được ngay bây giờ" (thấp hơn). S3 gần như không mất dữ liệu, nhưng vẫn có thể tạm không truy cập được.',
  example:
    'Lưu backup DB, ảnh người dùng, log lên S3 Standard: không cần tự lo replicate. Nhưng vẫn nên bật **versioning** + **replication cross-region** để chống *xoá nhầm* và *sự cố region* — durability không cứu bạn khỏi lỗi con người.',
  viz: {
    type: 'compare',
    cols: ['Durability (11 số 9)', 'Availability (99.9–99.99%)'],
    rows: [
      ['Nghĩa', 'dữ liệu KHÔNG mất', 'truy cập được NGAY bây giờ'],
      ['Nhờ đâu', 'replicate mỗi object qua ≥ 3 AZ', 'tuỳ storage class'],
      ['Không cứu khỏi', 'xoá nhầm, sự cố region', '—'],
      ['Bổ sung', 'versioning + replication cross-region', '—'],
    ],
  },
},
{
  cat: 'S3',
  q: 'Các storage class của S3 và lifecycle policy?',
  answer:
    '- **Standard**: truy cập thường xuyên, độ trễ ms.\n' +
    '- **Intelligent-Tiering**: tự chuyển object giữa các tier theo pattern truy cập — không phí truy xuất, chỉ phí monitoring nhỏ. Mặc định tốt khi không rõ pattern.\n' +
    '- **Standard-IA / One Zone-IA**: truy cập ít, rẻ hơn lưu trữ nhưng có phí retrieval; One Zone chỉ 1 AZ (rẻ hơn, kém bền hơn).\n' +
    '- **Glacier Instant / Flexible / Deep Archive**: lưu trữ dài hạn, từ ms tới hàng giờ để lấy ra, cực rẻ.\n\n' +
    '**Lifecycle policy**: tự chuyển class hoặc xoá theo tuổi object / version.',
  essence:
    'Đánh đổi: giá lưu trữ ↔ giá + độ trễ truy xuất. Lifecycle policy tự động hoá việc "dữ liệu nguội thì đẩy xuống tier rẻ hơn".',
  example:
    'Log ứng dụng: lifecycle rule — 30 ngày ở Standard → 90 ngày Standard-IA → 1 năm Glacier Flexible → xoá sau 7 năm (tuân thủ). Với dữ liệu không rõ pattern (user upload): Intelligent-Tiering để khỏi đoán.',
  viz: {
    type: 'tree',
    title: 'S3 storage class — giá lưu trữ ↔ giá + độ trễ truy xuất',
    root: {
      label: 'Lifecycle policy tự đẩy dữ liệu nguội xuống tier rẻ hơn',
      children: [
        { label: 'Standard', note: 'truy cập thường xuyên, độ trễ ms' },
        { label: 'Intelligent-Tiering', note: 'tự chuyển tier theo pattern — mặc định tốt khi không rõ' },
        { label: 'Standard-IA / One Zone-IA', note: 'truy cập ít, rẻ lưu nhưng phí retrieval; One Zone kém bền hơn' },
        { label: 'Glacier Instant / Flexible / Deep Archive', note: 'archive dài hạn, ms → hàng giờ để lấy, cực rẻ' },
      ],
    },
  },
},
{
  cat: 'S3',
  q: 'Mô hình nhất quán (consistency) của S3 hiện nay?',
  answer:
    'Từ tháng 12/2020, S3 cung cấp **strong read-after-write consistency** cho **mọi** thao tác trên mọi region — miễn phí, tự động.\n\n' +
    'Nghĩa là: sau khi `PUT` thành công một object (mới hoặc ghi đè), mọi `GET`/`LIST` ngay sau đó **luôn thấy phiên bản mới nhất**.\n\n' +
    'Trước đây: ghi mới thì strong, nhưng ghi đè và xoá là **eventually consistent** — code cũ có thể còn workaround (retry, chờ) không cần nữa.',
  essence:
    'S3 giờ hành xử trực giác: viết xong đọc lại thấy ngay. Bỏ các hack "sleep sau khi upload" trong codebase cũ.',
  example:
    'Pipeline: Lambda ghi file kết quả lên S3 rồi trigger Lambda tiếp theo `GET` file đó → đảm bảo đọc được nội dung vừa ghi, không còn cảnh "NoSuchKey" ngẫu nhiên như thời eventually consistent.',
  viz: {
    type: 'compare',
    cols: ['Trước 12/2020', 'Từ 12/2020 (hiện nay)'],
    rows: [
      ['Ghi object mới', 'strong', 'strong'],
      ['Ghi đè / xoá', 'eventually consistent', 'strong read-after-write'],
      ['Hệ quả', 'code cũ cần retry / sleep sau upload', 'viết xong đọc lại thấy ngay — bỏ hết hack'],
    ],
  },
},
{
  cat: 'S3',
  q: 'Bảo mật S3: bucket policy, Block Public Access, presigned URL?',
  answer:
    '- **Block Public Access (BPA)**: công tắc ở cấp account & bucket **chặn** mọi cấu hình khiến bucket public — nên **bật hết** trừ khi thực sự cần static website public.\n' +
    '- **Bucket policy** (resource-based): kiểm soát ai truy cập gì; dùng `Condition` (`aws:SourceVpce`, `aws:PrincipalOrgID`, `s3:x-amz-server-side-encryption`).\n' +
    '- **ACL**: cơ chế cũ, AWS khuyến nghị tắt (`Object Ownership = Bucket owner enforced`).\n' +
    '- **Presigned URL**: URL có chữ ký + hạn dùng, cho phép client tải lên/xuống **một object** mà không cần credential AWS.',
  essence:
    'Mặc định private + BPA bật. Cấp quyền hẹp qua bucket policy/IAM. Chia sẻ tạm thời với người ngoài qua presigned URL, không phải làm bucket public.',
  example:
    'Cho phép user upload avatar: backend tạo presigned `PUT` URL (hết hạn 5 phút, giới hạn content-type, size) → browser upload thẳng lên S3, không đi qua server. Bucket vẫn hoàn toàn private, BPA bật.',
  viz: {
    type: 'tree',
    title: 'Bảo mật S3 — mặc định private + BPA bật',
    root: {
      label: 'Cấp quyền hẹp; chia sẻ tạm qua presigned URL, KHÔNG làm bucket public',
      children: [
        { label: 'Block Public Access (BPA)', note: 'công tắc account & bucket chặn mọi cấu hình public — bật hết trừ static website' },
        { label: 'Bucket policy (resource-based)', note: 'Condition: aws:SourceVpce, aws:PrincipalOrgID, ép mã hoá' },
        { label: 'ACL', note: 'cơ chế cũ — tắt (Object Ownership = Bucket owner enforced)' },
        { label: 'Presigned URL', note: 'URL có chữ ký + hạn dùng cho MỘT object, không cần credential AWS' },
      ],
    },
  },
},
{
  cat: 'S3',
  q: 'S3 versioning và bảo vệ chống xoá?',
  answer:
    'Bật **versioning**: mỗi `PUT`/`DELETE` tạo version mới thay vì ghi đè. `DELETE` chỉ đặt một **delete marker** (object "biến mất" nhưng version cũ vẫn còn); khôi phục bằng cách xoá delete marker.\n\n' +
    '**MFA Delete**: yêu cầu mã MFA để xoá vĩnh viễn một version hoặc tắt versioning — chống xoá do credential bị lộ.\n\n' +
    '**Object Lock** (WORM): khoá object không cho xoá/sửa trong một khoảng thời gian (compliance) hoặc cho tới khi gỡ (governance) — chống cả ransomware và insider.',
  essence:
    'Versioning = "undo cho S3". Delete marker biến xoá thành một hành động có thể đảo. Object Lock là mức bảo vệ mạnh nhất cho dữ liệu bất biến (audit, backup).',
  example:
    'Bucket backup: versioning + Object Lock (compliance mode, 90 ngày) + lifecycle xoá version cũ hơn 1 năm. Ransomware mã hoá và ghi đè file backup → chỉ tạo version mới, các version sạch vẫn khôi phục được.',
  viz: {
    type: 'flow',
    title: 'S3 versioning = "undo cho S3"',
    nodes: ['bật versioning', 'PUT/DELETE tạo version mới', 'DELETE chỉ đặt delete marker', 'khôi phục: xoá delete marker', 'MFA Delete + Object Lock (WORM)'],
    steps: [
      { to: 2, label: 'object "biến mất" nhưng version cũ vẫn còn' },
      { to: 3, label: 'xoá biến thành hành động có thể đảo' },
      { to: 4, label: 'MFA Delete: cần mã MFA để xoá vĩnh viễn. Object Lock: khoá không cho xoá/sửa — chống ransomware + insider' },
    ],
  },
},
{
  cat: 'S3',
  q: 'Các kiểu mã hoá S3: SSE-S3, SSE-KMS, SSE-C, DSSE-KMS?',
  answer:
    '- **SSE-S3** (`AES256`): AWS quản key hoàn toàn. Đơn giản, miễn phí. Mặc định cho object mới.\n' +
    '- **SSE-KMS**: dùng CMK của bạn trong KMS → **kiểm soát** (key policy, audit qua CloudTrail, xoay vòng), nhưng có phí KMS API và giới hạn request (giảm bằng **S3 Bucket Keys**).\n' +
    '- **SSE-C**: bạn cung cấp key trong mỗi request, AWS mã hoá nhưng không lưu key — bạn tự quản.\n' +
    '- **DSSE-KMS**: mã hoá hai lớp cho yêu cầu tuân thủ khắt khe.',
  essence:
    'SSE-S3 cho "chỉ cần mã hoá at-rest". SSE-KMS khi cần kiểm soát và audit truy cập key (tách quyền: có `s3:GetObject` nhưng thiếu `kms:Decrypt` thì vẫn không đọc được).',
  example:
    'Bucket chứa dữ liệu PII: SSE-KMS với CMK riêng, bật S3 Bucket Keys để giảm chi phí KMS. Bucket policy `Deny` nếu request không có header `x-amz-server-side-encryption: aws:kms` → không ai upload plaintext được.',
  viz: {
    type: 'compare',
    cols: ['SSE-S3 (AES256)', 'SSE-KMS', 'SSE-C', 'DSSE-KMS'],
    rows: [
      ['Ai quản key', 'AWS hoàn toàn', 'CMK của bạn trong KMS', 'bạn cung cấp key mỗi request', 'KMS, mã hoá 2 lớp'],
      ['Kiểm soát / audit', 'không', 'key policy + CloudTrail + xoay vòng', 'tự quản', 'như KMS'],
      ['Chi phí', 'miễn phí', 'phí KMS API (giảm bằng Bucket Keys)', '—', 'cao'],
      ['Dùng khi', 'chỉ cần mã hoá at-rest', 'cần tách quyền (GetObject nhưng thiếu kms:Decrypt)', 'yêu cầu đặc biệt', 'tuân thủ khắt khe'],
    ],
  },
},
{
  cat: 'S3',
  q: 'Tối ưu hiệu năng S3: prefix, multipart upload, Transfer Acceleration?',
  answer:
    '- **Prefix scaling**: S3 tự scale ~3.500 PUT/COPY/POST/DELETE và ~5.500 GET/HEAD **mỗi giây mỗi prefix**. Nhiều prefix song song → throughput cộng dồn. (Không còn cần "random hash prefix" như xưa, nhưng phân tán key vẫn giúp.)\n' +
    '- **Multipart upload**: chia file lớn (> 100MB, bắt buộc > 5GB) thành phần, upload **song song**, retry từng phần, resume được.\n' +
    '- **Transfer Acceleration**: upload qua edge location gần nhất rồi đi đường backbone AWS tới bucket — tăng tốc cho client ở xa region.',
  essence:
    'Throughput S3 gần như vô hạn nếu bạn **song song hoá** (nhiều prefix, nhiều part). Nút thắt thường là client đơn luồng, không phải S3.',
  example:
    'Upload file 50GB từ VN lên bucket ở `us-east-1`: multipart (part 100MB, 20 luồng song song) + Transfer Acceleration → từ vài giờ xuống vài chục phút, và nếu mạng rớt chỉ retry vài part.',
  viz: {
    type: 'tree',
    title: 'Tối ưu hiệu năng S3 — nút thắt thường là client đơn luồng',
    root: {
      label: 'Throughput gần vô hạn nếu SONG SONG HOÁ',
      children: [
        { label: 'Prefix scaling', note: '~3500 ghi/s + ~5500 đọc/s MỖI prefix; nhiều prefix → cộng dồn' },
        { label: 'Multipart upload', note: 'file > 100MB (bắt buộc > 5GB): chia phần, upload song song, retry/resume từng phần' },
        { label: 'Transfer Acceleration', note: 'upload qua edge gần nhất rồi đi backbone AWS — cho client ở xa region' },
      ],
    },
  },
},
{
  cat: 'S3',
  q: 'S3 Event Notifications dùng để làm gì?',
  answer:
    'S3 phát sự kiện khi có `s3:ObjectCreated:*`, `s3:ObjectRemoved:*`, `s3:ObjectRestore:*`… tới đích: **Lambda**, **SQS**, **SNS**, hoặc **EventBridge** (nhiều tính năng lọc/định tuyến hơn).\n\n' +
    'Nền cho kiến trúc event-driven: upload file → tự động xử lý.\n\n' +
    'Lưu ý: delivery **at-least-once** (có thể trùng), thứ tự không đảm bảo → consumer phải idempotent. Một số cấu hình có thể bỏ sót event hiếm gặp → cân nhắc reconciliation định kỳ cho hệ quan trọng.',
  essence:
    'S3 trở thành nguồn phát sự kiện: "có object mới" kích hoạt pipeline. EventBridge là đích linh hoạt nhất (lọc theo suffix, size, định tuyến nhiều target).',
  example:
    'User upload ảnh → `ObjectCreated` → Lambda tạo thumbnail + trích metadata EXIF + ghi record vào DynamoDB. Upload CSV vào prefix `imports/` → SQS → ECS task xử lý ETL (queue để chịu tải spike).',
  viz: {
    type: 'flow',
    title: 'S3 Event Notifications — nguồn phát sự kiện',
    nodes: ['s3:ObjectCreated / ObjectRemoved / ObjectRestore', 'đích: Lambda / SQS / SNS / EventBridge', 'pipeline event-driven'],
    steps: [
      { to: 1, label: 'EventBridge linh hoạt nhất (lọc theo suffix/size, nhiều target)' },
      { to: 2, label: 'upload ảnh → Lambda tạo thumbnail; upload CSV → SQS → ECS ETL' },
      { to: 2, label: 'delivery at-least-once (có thể trùng), thứ tự không đảm bảo → consumer idempotent' },
    ],
  },
},
{
  cat: 'RDS',
  q: 'RDS Multi-AZ và Read Replica khác nhau thế nào?',
  answer:
    '- **Multi-AZ**: một standby **đồng bộ** ở AZ khác, **không phục vụ traffic**. Mục đích: **HA/failover** — primary chết thì standby lên (đổi DNS endpoint) trong ~60–120s, không mất dữ liệu (sync replication).\n' +
    '- **Read Replica**: bản sao **bất đồng bộ**, **phục vụ read**. Mục đích: **scale đọc**, offload báo cáo/analytics. Có replica lag; có thể promote thủ công thành primary độc lập (DR thô).\n\n' +
    'Kết hợp cả hai: Multi-AZ cho HA + nhiều Read Replica cho scale.',
  essence:
    'Multi-AZ = chống downtime (standby bị động, sync). Read Replica = chống nghẽn đọc (active, async, có lag). Giải quyết hai bài toán khác nhau.',
  example:
    'App thương mại điện tử: RDS Multi-AZ cho OLTP (failover tự động). Thêm 2 Read Replica: 1 cho trang danh mục/tìm kiếm (đọc nặng), 1 cho dashboard BI — writer không bị ảnh hưởng bởi query báo cáo nặng.',
  viz: {
    type: 'compare',
    cols: ['Multi-AZ', 'Read Replica'],
    rows: [
      ['Replication', 'đồng bộ (sync)', 'bất đồng bộ (async, có lag)'],
      ['Phục vụ traffic?', 'KHÔNG — standby bị động', 'CÓ — phục vụ read'],
      ['Mục đích', 'HA / failover (~60–120s, không mất dữ liệu)', 'scale đọc, offload báo cáo'],
      ['Bài toán', 'chống downtime', 'chống nghẽn đọc'],
    ],
  },
},
{
  cat: 'RDS',
  q: 'RDS backup: automated backup, snapshot và Point-in-Time Recovery?',
  answer:
    '- **Automated backups**: bật retention 1–35 ngày. RDS backup toàn bộ hàng ngày + **lưu transaction log mỗi 5 phút** → cho phép **PITR**: khôi phục về **bất kỳ thời điểm** nào trong cửa sổ retention (tạo instance mới).\n' +
    '- **Manual snapshot**: bạn tự tạo, **giữ tới khi xoá** (không theo retention), copy cross-region/cross-account được.\n\n' +
    'Xoá instance: automated backup bị xoá (trừ khi tạo final snapshot); manual snapshot còn lại.',
  essence:
    'Automated backup + transaction log = "tua ngược DB tới bất kỳ phút nào trong 35 ngày". Manual snapshot = ảnh chụp cố định bạn chủ động giữ (trước migration, cho compliance, cho DR cross-region).',
  example:
    'Lúc 14:32 một job chạy `DELETE` thiếu `WHERE` xoá nhầm 50k dòng. PITR: khôi phục instance mới về **14:31:00**, export bảng bị ảnh hưởng, import lại vào production — không mất các giao dịch khác sau 14:32 trên các bảng khác.',
  viz: {
    type: 'compare',
    cols: ['Automated backup', 'Manual snapshot'],
    rows: [
      ['Retention', '1–35 ngày', 'giữ tới khi bạn xoá'],
      ['Đặc biệt', 'backup hàng ngày + transaction log mỗi 5 phút → PITR về bất kỳ phút nào', 'ảnh chụp cố định'],
      ['Copy cross-region/account', '—', 'được'],
      ['Khi xoá instance', 'bị xoá (trừ final snapshot)', 'còn lại'],
    ],
  },
},
{
  cat: 'Aurora',
  q: 'Kiến trúc Aurora khác RDS truyền thống thế nào?',
  answer:
    'Aurora tách **compute** (instance chạy engine MySQL/PostgreSQL) khỏi **storage** — một tầng lưu trữ phân tán, tự mở rộng tới 128TB, sao chép **6 bản qua 3 AZ**, self-healing.\n\n' +
    'Instance chỉ ghi **log records** xuống storage (không ghi cả trang) → nhanh hơn nhiều. Tối đa **15 read replica** chia sẻ cùng storage → replica lag rất thấp (mili giây), thêm replica không cần copy dữ liệu.\n\n' +
    'Failover nhanh (~30s) vì replica đã sẵn sàng trên cùng storage.',
  essence:
    'Aurora = "engine tương thích MySQL/PG + storage layer cloud-native chia sẻ". Replica dùng chung storage nên rẻ, nhanh, lag thấp; failover không cần khôi phục dữ liệu.',
  example:
    'App cần 10 read replica: RDS MySQL mỗi replica là một bản copy đầy đủ (tốn dung lượng + lag do binlog). Aurora: 10 replica cùng trỏ một storage, lag ~10ms, thêm/bớt replica trong 1–2 phút.',
  viz: {
    type: 'compare',
    cols: ['RDS truyền thống', 'Aurora'],
    rows: [
      ['Storage', 'gắn với instance', 'tầng phân tán chia sẻ, tự mở rộng tới 128TB, 6 bản qua 3 AZ'],
      ['Instance ghi', 'cả trang xuống đĩa', 'chỉ log records → nhanh hơn nhiều'],
      ['Read replica', 'mỗi cái là bản copy đầy đủ, lag do binlog', 'tối đa 15, dùng chung storage, lag ~ms, thêm không cần copy'],
      ['Failover', 'khôi phục dữ liệu', '~30s — replica đã sẵn trên cùng storage'],
    ],
  },
},
{
  cat: 'Aurora',
  q: 'Aurora Serverless v2 dùng khi nào?',
  answer:
    'Aurora Serverless v2 tự động scale compute (ACU — Aurora Capacity Unit) **theo tải, từng nấc nhỏ, trong vài giây**, không gián đoạn kết nối (khác v1). Tỉ lệ 0.5–256 ACU.\n\n' +
    'Hợp với: tải **thất thường/không đoán được**, môi trường dev/test (scale gần 0 khi rảnh), multi-tenant với các tenant tải khác nhau, ứng dụng mới chưa biết capacity.\n\n' +
    'Kém hợp: tải cao **ổn định 24/7** (provisioned + Reserved rẻ hơn).',
  essence:
    'Serverless v2 = "trả đúng lượng compute DB đang cần, thay đổi mượt theo giây". Giá trị nằm ở tải biến động; tải phẳng thì instance cố định vẫn kinh tế hơn.',
  example:
    'SaaS B2B: ban ngày giờ hành chính tải cao, đêm gần như 0. Serverless v2 scale 4→32 ACU lúc cao điểm, co về 2 ACU ban đêm → tiết kiệm ~60% so với provision cho đỉnh.',
  viz: {
    type: 'compare',
    cols: ['Tải biến động / không đoán được', 'Tải cao ổn định 24/7'],
    rows: [
      ['Nên dùng', 'Aurora Serverless v2', 'provisioned + Reserved'],
      ['Serverless v2 làm gì', 'scale 0.5–256 ACU theo giây, không gián đoạn kết nối', '—'],
      ['Ví dụ', 'dev/test, multi-tenant, ứng dụng mới, SaaS B2B giờ hành chính', 'hệ thống tải phẳng'],
    ],
  },
},
{
  cat: 'DynamoDB',
  q: 'DynamoDB: partition key, sort key và giới hạn item?',
  answer:
    '- **Partition key (hash key)**: DynamoDB hash nó để chọn partition vật lý. Quyết định **phân bố dữ liệu** — key phải có cardinality cao và truy cập đều.\n' +
    '- **Sort key (range key)** (tuỳ chọn): trong một partition key, các item được **sắp xếp** theo sort key → cho phép query theo khoảng, `begins_with`, `between`.\n' +
    '- Primary key = partition key (+ sort key). Phải **duy nhất**.\n' +
    '- **Item tối đa 400KB** (gồm cả tên attribute).',
  essence:
    'Partition key = "dữ liệu nằm ở đâu"; sort key = "thứ tự trong nhóm đó". Thiết kế key = thiết kế access pattern, làm ngay từ đầu vì đổi rất khó.',
  example:
    'Bảng messages: PK = `conversationId`, SK = `timestamp#messageId`. Query "50 tin nhắn mới nhất của hội thoại X" = query PK=X, SK descending, limit 50 — một thao tác, latency ms.',
  viz: {
    type: 'tree',
    title: 'DynamoDB key — thiết kế key = thiết kế access pattern (làm từ đầu)',
    root: {
      label: 'Primary key = partition key (+ sort key) — phải DUY NHẤT',
      children: [
        { label: 'Partition key (hash)', note: '"dữ liệu nằm ở đâu" — cardinality cao, truy cập đều' },
        { label: 'Sort key (range, tuỳ chọn)', note: '"thứ tự trong nhóm" — query theo khoảng, begins_with, between' },
        { label: 'Item tối đa 400KB', note: 'gồm cả tên attribute' },
      ],
    },
  },
},
{
  cat: 'DynamoDB',
  q: 'DynamoDB capacity: on-demand vs provisioned, RCU/WCU?',
  answer:
    '- **WCU**: 1 WCU = 1 ghi/giây cho item ≤ 1KB. **RCU**: 1 RCU = 1 đọc **strongly consistent**/giây cho item ≤ 4KB (hoặc 2 đọc eventually consistent).\n' +
    '- **Provisioned**: bạn đặt RCU/WCU, có auto scaling theo target utilization. Rẻ hơn nếu tải **ổn định/đoán được**; có thể mua reserved capacity.\n' +
    '- **On-demand**: không cần đặt capacity, trả theo request thực tế, chịu spike tức thì. Đắt hơn/đơn vị nhưng không lo throttling; tốt cho tải mới/thất thường.',
  essence:
    'Provisioned = cam kết capacity đổi giá rẻ (hợp tải phẳng). On-demand = trả theo dùng, co giãn tức thì (hợp tải bùng nổ hoặc chưa rõ). Chuyển qua lại được (giới hạn tần suất).',
  example:
    'Bảng session (tải đều theo DAU): provisioned + auto scaling 40–70% utilization. Bảng cho tính năng mới ra mắt: on-demand trong 2 tháng để quan sát pattern, rồi chuyển provisioned nếu ổn định.',
  viz: {
    type: 'compare',
    cols: ['Provisioned', 'On-demand'],
    rows: [
      ['Bạn làm gì', 'đặt RCU/WCU + auto scaling theo target', 'không cần đặt'],
      ['Giá', 'rẻ hơn nếu tải ổn định; mua reserved được', 'đắt hơn/đơn vị, trả theo request thực'],
      ['Spike', 'có thể throttling', 'chịu spike tức thì, không lo throttling'],
      ['Dùng cho', 'tải phẳng, đoán được', 'tải mới / thất thường / chưa rõ'],
    ],
  },
},
{
  cat: 'DynamoDB',
  q: 'GSI và LSI khác nhau thế nào?',
  answer:
    '- **LSI (Local Secondary Index)**: cùng partition key, **khác sort key**. Phải tạo **lúc tạo bảng**, tối đa 5, dùng chung capacity với bảng, hỗ trợ strongly consistent read. Giới hạn 10GB item collection mỗi partition key.\n' +
    '- **GSI (Global Secondary Index)**: **partition key và sort key hoàn toàn khác**. Tạo/xoá **bất kỳ lúc nào**, tối đa 20, có **capacity riêng**, chỉ **eventually consistent**. Thực chất là một bảng phái sinh được DynamoDB tự đồng bộ.',
  essence:
    'LSI = "cách sắp xếp khác trong cùng partition" (cố định lúc tạo bảng). GSI = "một access pattern hoàn toàn khác" (linh hoạt, capacity riêng, async). GSI phổ biến hơn nhiều.',
  example:
    'Bảng orders PK=`customerId`, SK=`orderDate`. Cần query "đơn theo trạng thái": GSI PK=`status`, SK=`orderDate`. Cần "đơn của customer sắp theo tổng tiền": LSI SK=`totalAmount` (phải quyết định lúc tạo bảng).',
  viz: {
    type: 'compare',
    cols: ['LSI (Local Secondary Index)', 'GSI (Global Secondary Index)'],
    rows: [
      ['Key', 'cùng partition key, KHÁC sort key', 'partition key và sort key HOÀN TOÀN khác'],
      ['Tạo', 'chỉ lúc tạo bảng, tối đa 5', 'bất kỳ lúc nào, tối đa 20'],
      ['Capacity', 'dùng chung với bảng', 'riêng'],
      ['Consistency', 'strong được', 'chỉ eventually consistent'],
    ],
  },
},
{
  cat: 'DynamoDB',
  q: 'Single-table design trong DynamoDB là gì?',
  answer:
    'Thay vì mỗi entity một bảng (như RDBMS), gom **nhiều loại entity vào một bảng**, dùng PK/SK generic (`PK`, `SK`) với giá trị mang tiền tố loại (`USER#123`, `ORDER#456`).\n\n' +
    'Mục đích: **lấy nhiều entity liên quan trong một query** (không có JOIN). Overload GSI cho các access pattern khác.\n\n' +
    'Đánh đổi: thiết kế khó, khó đọc bằng mắt, phải biết **trước** mọi access pattern, migration phức tạp. Nhiều team dùng "few-table" thực dụng hơn.',
  essence:
    'DynamoDB không có JOIN → single-table "pre-join" dữ liệu bằng cách đặt chung partition. Nó tối ưu cho số lần round-trip, đổi lấy độ phức tạp mô hình hoá.',
  example:
    'PK=`USER#123`: item SK=`PROFILE` (thông tin user), SK=`ORDER#2024-001`, SK=`ORDER#2024-002`. Query PK=`USER#123` một lần → lấy profile + toàn bộ đơn hàng. RDBMS cần 2 query hoặc 1 JOIN.',
  viz: {
    type: 'flow',
    title: 'Single-table design — "pre-join" bằng cách đặt chung partition',
    nodes: ['gom nhiều loại entity vào 1 bảng', 'PK/SK generic + tiền tố loại (USER#123, ORDER#456)', 'overload GSI cho access pattern khác', 'query 1 lần lấy nhiều entity liên quan'],
    steps: [
      { to: 1, label: 'DynamoDB không có JOIN' },
      { to: 3, label: 'tối ưu số round-trip, đổi lấy độ phức tạp mô hình hoá' },
      { to: 3, label: 'phải biết TRƯỚC mọi access pattern; migration phức tạp — nhiều team dùng "few-table" thực dụng hơn' },
    ],
  },
},
{
  cat: 'DynamoDB',
  q: 'DynamoDB Streams và TTL dùng để làm gì?',
  answer:
    '- **Streams**: log thay đổi (INSERT/MODIFY/REMOVE) theo thứ tự per-partition-key, giữ 24 giờ. Trigger Lambda → dùng cho: cập nhật aggregate, đồng bộ sang OpenSearch/S3, audit, phát event, materialized view, replication (Global Tables dùng cơ chế này).\n' +
    '- **TTL**: chỉ định một attribute chứa epoch timestamp; DynamoDB **tự xoá** item sau thời điểm đó (trong vòng ~48h, miễn phí). Item bị xoá qua TTL cũng xuất hiện trong Streams (`userIdentity` = `dynamodb.amazonaws.com`).',
  essence:
    'Streams biến DynamoDB thành nguồn CDC event-driven. TTL là cách dọn dữ liệu hết hạn (session, cache, log) mà không tốn WCU và không cần job xoá.',
  example:
    'Bảng `sessions` với TTL attribute `expiresAt`: item tự biến mất sau 24h. Streams → Lambda: khi item session bị REMOVE, ghi một sự kiện "session ended" vào analytics; khi ORDER được INSERT, cập nhật bộ đếm `dailyOrderCount`.',
  viz: {
    type: 'tree',
    title: 'DynamoDB Streams + TTL',
    root: {
      label: 'Streams biến DynamoDB thành nguồn CDC event-driven',
      children: [
        { label: 'Streams', note: 'log INSERT/MODIFY/REMOVE theo thứ tự per-partition-key, giữ 24h → trigger Lambda' },
        { label: 'Dùng Streams cho', note: 'aggregate, đồng bộ OpenSearch/S3, audit, materialized view, Global Tables' },
        { label: 'TTL', note: 'attribute epoch → DynamoDB tự xoá item (~48h, miễn phí, không tốn WCU)' },
        { label: 'Item xoá qua TTL', note: 'cũng xuất hiện trong Streams (userIdentity = dynamodb.amazonaws.com)' },
      ],
    },
  },
},
{
  cat: 'DynamoDB',
  q: 'Eventually consistent vs strongly consistent read? DynamoDB transactions?',
  answer:
    '- **Eventually consistent read** (mặc định): có thể đọc trúng một replica chưa nhận bản ghi mới nhất (thường trễ < 1s). Rẻ hơn (0.5 RCU).\n' +
    '- **Strongly consistent read**: luôn phản ánh mọi ghi thành công trước đó. Tốn 1 RCU, latency nhỉnh hơn, **không dùng được trên GSI**.\n' +
    '- **Transactions** (`TransactWriteItems`/`TransactGetItems`): tối đa 100 item, all-or-nothing, có điều kiện (`ConditionCheck`). Tốn 2x capacity. Cho thao tác cần nguyên tử đa item (chuyển tiền, đảm bảo tính duy nhất).',
  essence:
    'Mặc định là eventually consistent để nhanh và rẻ; yêu cầu strong khi vừa-ghi-vừa-đọc cùng item. Transactions thêm tính nguyên tử ACID có giới hạn cho các thao tác đa item.',
  example:
    'Đăng ký username duy nhất: `TransactWriteItems` gồm `Put` item user + `Put` item `USERNAME#alice` với `ConditionExpression: attribute_not_exists(PK)` → hoặc cả hai thành công, hoặc fail nếu username đã tồn tại. Đọc lại profile ngay sau khi update: strongly consistent.',
  viz: {
    type: 'compare',
    cols: ['Eventually consistent (mặc định)', 'Strongly consistent', 'Transactions'],
    rows: [
      ['Đọc', 'có thể trúng replica cũ (< 1s)', 'luôn phản ánh mọi ghi trước đó', 'TransactWriteItems/GetItems ≤ 100 item'],
      ['Chi phí', '0.5 RCU', '1 RCU, latency nhỉnh', '2x capacity'],
      ['Giới hạn', '—', 'KHÔNG dùng được trên GSI', 'all-or-nothing, có ConditionCheck'],
      ['Dùng khi', 'nhanh, rẻ', 'vừa-ghi-vừa-đọc cùng item', 'nguyên tử đa item (chuyển tiền, tính duy nhất)'],
    ],
  },
},
{
  cat: 'Cache',
  q: 'ElastiCache: Redis và Memcached — chọn cái nào?',
  answer:
    '- **Memcached**: multi-threaded, chỉ key-value string đơn giản, không persistence, không replication, sharding phía client. Cho cache thuần, đơn giản, cần nhiều core.\n' +
    '- **Redis** (hoặc Valkey): single-threaded (per shard), **nhiều kiểu dữ liệu** (list, set, sorted set, hash, stream), replication, cluster mode, snapshot/AOF, pub/sub, Lua, transaction, geo. Cho cache có cấu trúc, leaderboard, rate limit, session, hàng đợi nhẹ.',
  essence:
    'Memcached = cache RAM thuần, đa luồng, không HA. Redis = "cấu trúc dữ liệu qua mạng" + HA + persistence. Gần như luôn chọn Redis trừ khi nhu cầu cực kỳ đơn giản.',
  example:
    'Cache kết quả query DB dạng blob JSON, cần throughput cao trên instance nhiều core, chấp nhận mất khi restart: Memcached. Cần leaderboard (sorted set), phân tán rate limit, session store có failover: Redis.',
  viz: {
    type: 'compare',
    cols: ['Memcached', 'Redis / Valkey'],
    rows: [
      ['Luồng', 'multi-threaded', 'single-threaded per shard'],
      ['Kiểu dữ liệu', 'chỉ key-value string', 'list, set, sorted set, hash, stream'],
      ['HA / persistence', 'không', 'replication, cluster, snapshot/AOF'],
      ['Dùng cho', 'cache thuần, đơn giản, nhiều core', 'leaderboard, rate limit, session, pub/sub — gần như luôn chọn Redis'],
    ],
  },
},
{
  cat: 'Storage',
  q: 'EBS, EFS, S3 và FSx — dùng cho tình huống nào?',
  answer:
    '- **EBS**: block storage cho **một** EC2 (io2 hỗ trợ Multi-Attach hạn chế). Như ổ đĩa của server. Cho OS, DB tự quản, ứng dụng cần filesystem POSIX hiệu năng cao.\n' +
    '- **EFS**: NFS được quản lý, **nhiều EC2/Lambda/container mount đồng thời**, tự co giãn, đa AZ. Cho shared content, home directory, CMS, CI workspace.\n' +
    '- **S3**: object storage qua API HTTP, không phải filesystem. Cho backup, media, data lake, static asset, log.\n' +
    '- **FSx**: filesystem chuyên dụng — FSx for Windows (SMB/AD), FSx for Lustre (HPC), FSx for NetApp ONTAP.',
  essence:
    'EBS = đĩa của một máy. EFS = ổ chia sẻ mạng POSIX cho nhiều máy. S3 = kho object qua API. Chọn theo "một hay nhiều client" và "filesystem hay object".',
  example:
    'Cụm 10 web server cần cùng thư mục upload: EFS mount lên cả 10. Mỗi server cần đĩa riêng cho DB local: EBS gp3. Ảnh gốc do người dùng tải lên, phục vụ qua CloudFront: S3.',
  viz: {
    type: 'compare',
    cols: ['EBS', 'EFS', 'S3', 'FSx'],
    rows: [
      ['Kiểu', 'block — đĩa của MỘT máy', 'NFS POSIX — nhiều máy mount đồng thời', 'object qua API HTTP', 'filesystem chuyên dụng'],
      ['Client', '1 EC2 (io2 Multi-Attach hạn chế)', 'nhiều EC2/Lambda/container, đa AZ', 'bất kỳ, qua HTTP', 'Windows (SMB/AD), Lustre (HPC), ONTAP'],
      ['Dùng cho', 'OS, DB tự quản', 'shared content, home dir, CI workspace', 'backup, media, data lake, log', 'khối lượng công việc đặc thù'],
    ],
  },
},
]);
