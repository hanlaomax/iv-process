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
  viz: {
    type: 'compare',
    cols: ['SQS Standard', 'SQS FIFO'],
    rows: [
      ['Throughput', 'gần vô hạn', '~3000 msg/s (cao hơn với high throughput mode)'],
      ['Thứ tự', 'best-effort (không đảm bảo)', 'đảm bảo trong một MessageGroupId'],
      ['Trùng', 'at-least-once (cần consumer idempotent)', 'exactly-once (dedup 5 phút)'],
      ['Chung', 'visibility timeout phải > thời gian xử lý; DLQ sau maxReceiveCount', 'như trái'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hai loại queue, và ba tham số quyết định hành vi",
      code:
        "# STANDARD — throughput gần như không giới hạn, AT-LEAST-ONCE,\n" +
        "# thứ tự \"cố gắng hết sức\" (không đảm bảo). Mặc định nên dùng.\n" +
        "aws sqs create-queue --queue-name orders \\\n" +
        "  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600\n" +
        "\n" +
        "# FIFO — thứ tự CHÍNH XÁC trong mỗi MessageGroupId, khử trùng lặp trong 5 phút.\n" +
        "# Trần 300 msg/s (3.000 khi bật batching); tên queue phải kết thúc bằng .fifo\n" +
        "aws sqs create-queue --queue-name orders.fifo \\\n" +
        "  --attributes FifoQueue=true,ContentBasedDeduplication=true\n" +
        "aws sqs send-message --queue-url $URL --message-body \u0027{\"id\":1}\u0027 \\\n" +
        "  --message-group-id \"customer-42\" \\    # thứ tự đảm bảo TRONG nhóm này\n" +
        "  --message-deduplication-id \"order-1001\"\n" +
        "# MessageGroupId là chìa khoá: mỗi nhóm xử lý tuần tự, các nhóm khác nhau\n" +
        "# chạy song song -> chọn nhóm theo entity id để vừa có thứ tự vừa có song song.\n" +
        "\n" +
        "# VISIBILITY TIMEOUT — sau khi nhận, message bị ẨN trong bao lâu.\n" +
        "# Quá ngắn -> consumer chưa xử lý xong đã có người khác nhận -> XỬ LÝ TRÙNG.\n" +
        "# Quy tắc: đặt >= thời gian xử lý p99, và gia hạn nếu cần:\n" +
        "aws sqs change-message-visibility --queue-url $URL \\\n" +
        "  --receipt-handle $RH --visibility-timeout 600\n" +
        "\n" +
        "# DLQ — sau maxReceiveCount lần nhận không xoá, message chuyển sang queue chết\n" +
        "aws sqs set-queue-attributes --queue-url $URL --attributes \\\n" +
        "  \u0027RedrivePolicy=\"{\\\"deadLetterTargetArn\\\":\\\"\u0027$DLQ_ARN\u0027\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"\u0027\n" +
        "# DLQ PHẢI có người theo dõi và có alarm, nếu không nó chỉ là nơi dữ liệu đi chết.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Short polling (mặc định, WaitTimeSeconds=0)', 'Long polling (1–20s)'],
    rows: [
      ['Hành vi', 'trả về ngay, có thể rỗng dù có message', 'server CHỜ tới khi có message hoặc hết thời gian'],
      ['Request rỗng', 'nhiều → tốn tiền + latency', 'ít'],
      ['Khuyến nghị', '—', 'LUÔN nên bật'],
      ['Retention', 'mặc định 4 ngày (60s–14 ngày)', 'không consume kịp → mất'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Long polling gần như luôn đúng",
      code:
        "# SHORT POLLING (mặc định, WaitTimeSeconds=0): trả về NGAY, và chỉ hỏi một\n" +
        "# TẬP CON máy chủ -> có thể trả về rỗng dù queue đang có message.\n" +
        "# Hệ quả: nhiều request rỗng -> tốn tiền (tính theo request) và tăng độ trễ.\n" +
        "\n" +
        "# LONG POLLING: chờ tới khi có message hoặc hết thời gian.\n" +
        "aws sqs set-queue-attributes --queue-url $URL \\\n" +
        "  --attributes ReceiveMessageWaitTimeSeconds=20      # tối đa 20 giây\n" +
        "aws sqs receive-message --queue-url $URL \\\n" +
        "  --wait-time-seconds 20 --max-number-of-messages 10\n" +
        "# Lợi: ít request rỗng hơn hàng chục lần, ĐỘ TRỄ THẤP HƠN (nhận ngay khi\n" +
        "# message tới, không phải chờ vòng poll sau), và quét toàn bộ máy chủ.\n" +
        "# -> Gần như không có lý do để dùng short polling.\n" +
        "\n" +
        "# RETENTION: 60 giây - 14 NGÀY (mặc định 4 ngày)\n" +
        "aws sqs set-queue-attributes --queue-url $URL \\\n" +
        "  --attributes MessageRetentionPeriod=1209600        # 14 ngày\n" +
        "# Đặt DÀI cho queue quan trọng: nếu consumer chết cả cuối tuần, message\n" +
        "# vẫn còn khi bạn quay lại. DLQ nên luôn để 14 ngày.\n" +
        "\n" +
        "# DELAY QUEUE (hoãn cả queue) và per-message delay (tối đa 15 phút):\n" +
        "aws sqs send-message --queue-url $URL --message-body \u0027{}\u0027 --delay-seconds 900\n" +
        "\n" +
        "# Message tối đa 256KB -> lớn hơn thì dùng S3 + con trỏ (extended client library).",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'SNS fanout + filter policy',
    nodes: ['publisher → SNS topic', 'đẩy tới mọi subscriber', 'fanout: SNS → nhiều SQS queue', 'mỗi service tiêu thụ độc lập (buffer, retry, DLQ)'],
    steps: [
      { to: 1, label: 'subscriber: SQS, Lambda, HTTP/S, email, SMS, Firehose' },
      { to: 3, label: 'filter policy: mỗi subscription lọc theo attribute — subscriber chỉ nhận cái nó quan tâm' },
      { to: 3, label: 'thêm consumer mới = thêm một subscription, publisher không đổi' },
    ],
  },
  demo: [
    {
      lang: "json",
      title: "Filter policy: lọc ở SNS thay vì ở consumer",
      code:
        "{\n" +
        "  \"Comment\": \"Subscription chỉ nhận đơn hàng lớn ở VN — lọc ngay tại SNS\",\n" +
        "  \"eventType\": [\"OrderPlaced\", \"OrderCancelled\"],\n" +
        "  \"country\": [\"VN\"],\n" +
        "  \"total\": [{ \"numeric\": [\">=\", 1000000] }],\n" +
        "  \"source\": [{ \"anything-but\": \"test\" }]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Fanout và các đích đăng ký",
      code:
        "aws sns create-topic --name order-events\n" +
        "aws sns subscribe --topic-arn $TOPIC --protocol sqs --notification-endpoint $QUEUE_ARN\n" +
        "aws sns subscribe --topic-arn $TOPIC --protocol lambda --notification-endpoint $FN_ARN\n" +
        "aws sns subscribe --topic-arn $TOPIC --protocol https --notification-endpoint https://hook\n" +
        "\n" +
        "# Áp filter policy — message không khớp bị BỎ, không tính phí gửi\n" +
        "aws sns set-subscription-attributes --subscription-arn $SUB \\\n" +
        "  --attribute-name FilterPolicy --attribute-value file://filter.json\n" +
        "# Mặc định lọc theo MessageAttributes; muốn lọc theo nội dung body:\n" +
        "aws sns set-subscription-attributes --subscription-arn $SUB \\\n" +
        "  --attribute-name FilterPolicyScope --attribute-value MessageBody\n" +
        "\n" +
        "# MẪU FANOUT KINH ĐIỂN: SNS -> nhiều SQS -> nhiều consumer\n" +
        "# Vì sao chèn SQS vào giữa thay vì SNS -> Lambda trực tiếp:\n" +
        "#  - có BUFFER, chịu được tải đột biến\n" +
        "#  - consumer chết thì message vẫn nằm chờ (SNS gửi thẳng mà lỗi là mất,\n" +
        "#    chỉ còn retry policy hạn chế)\n" +
        "#  - mỗi consumer có tốc độ xử lý riêng, không ảnh hưởng nhau\n" +
        "#  - có DLQ riêng cho từng nhánh\n" +
        "\n" +
        "# SNS FIFO cũng có, nhưng chỉ gửi được tới SQS FIFO.\n" +
        "# Nhớ cấu hình DLQ cho subscription:\n" +
        "#   --attribute-name RedrivePolicy",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['SNS', 'EventBridge'],
    rows: [
      ['Lọc / định tuyến', 'theo attribute', 'theo TOÀN BỘ nội dung event (prefix, số, exists, anything-but)'],
      ['Nguồn event', 'publisher của bạn', '+ AWS services (EC2, S3…) + SaaS partners (Datadog…)'],
      ['Tính năng', 'fanout thuần', 'schema registry, input transformer, archive & replay, cross-account bus'],
      ['Hiệu năng', 'nhanh hơn, rẻ hơn cho fanout đơn giản', 'chậm hơn chút, mạnh hơn cho event choreography'],
    ],
  },
  demo: [
    {
      lang: "json",
      title: "Rule khớp theo NỘI DUNG sự kiện",
      code:
        "{\n" +
        "  \"Comment\": \"Event pattern: khớp theo cấu trúc sự kiện, mạnh hơn filter của SNS\",\n" +
        "  \"source\": [\"order-service\"],\n" +
        "  \"detail-type\": [\"OrderPlaced\"],\n" +
        "  \"detail\": {\n" +
        "    \"total\": [{ \"numeric\": [\">\", 1000000] }],\n" +
        "    \"customer\": { \"tier\": [\"gold\", \"platinum\"] },\n" +
        "    \"region\": [{ \"anything-but\": [\"test\"] }]\n" +
        "  }\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Khi nào dùng EventBridge, khi nào SNS",
      code:
        "aws events put-rule --name big-orders --event-pattern file://pattern.json\n" +
        "aws events put-targets --rule big-orders --targets \\\n" +
        "  \u0027Id=1,Arn=\u0027$LAMBDA_ARN \u0027Id=2,Arn=\u0027$SFN_ARN\u0027,RoleArn=\u0027$ROLE\n" +
        "\n" +
        "# EVENTBRIDGE MẠNH HƠN Ở:\n" +
        "#  - khớp mẫu theo NỘI DUNG lồng nhau, so sánh số, tiền tố, anything-but\n" +
        "#  - hơn 20 loại ĐÍCH sẵn có (Step Functions, ECS task, Kinesis, API\n" +
        "#    Destination gọi HTTP bên ngoài) — không cần viết Lambda trung gian\n" +
        "#  - nhận sự kiện TỪ CHÍNH AWS (EC2 đổi trạng thái, CodePipeline, S3...)\n" +
        "#    và từ SaaS bên thứ ba (Datadog, Shopify, Zendesk)\n" +
        "#  - SCHEDULER: cron thay thế CloudWatch Events\n" +
        "#  - ARCHIVE + REPLAY: lưu sự kiện và phát lại — cực kỳ hữu ích khi sửa bug\n" +
        "#  - SCHEMA REGISTRY: sinh code từ schema sự kiện\n" +
        "aws events create-archive --archive-name orders --event-source-arn $BUS_ARN\n" +
        "aws events start-replay --replay-name fix-bug --event-source-arn $ARCHIVE_ARN \\\n" +
        "  --event-start-time 2026-09-01T00:00:00Z --event-end-time 2026-09-02T00:00:00Z \\\n" +
        "  --destination \u0027{\"Arn\":\"\u0027$BUS_ARN\u0027\"}\u0027\n" +
        "\n" +
        "# SNS MẠNH HƠN Ở: throughput cao hơn nhiều, độ trễ thấp hơn, rẻ hơn,\n" +
        "# hỗ trợ SMS/email/mobile push, và có SNS FIFO.\n" +
        "\n" +
        "# CHỌN: định tuyến sự kiện phức tạp, tích hợp nhiều dịch vụ -> EVENTBRIDGE.\n" +
        "# Fanout thuần với throughput rất cao, hoặc cần gửi SMS/email -> SNS.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Kinesis Data Streams', 'Firehose', 'Managed Flink'],
    rows: [
      ['Vai trò', 'bus realtime có shard, replay được (bạn xử lý)', 'ống nạp dữ liệu vào kho (không quản lý gì)', 'engine tính toán trên stream'],
      ['Latency', '~200ms', 'tối thiểu ~60s', '—'],
      ['Replay', 'có (retention 1–365 ngày)', 'không', '—'],
      ['Đích / xử lý', 'KCL / Lambda', 'S3/Redshift/OpenSearch/Splunk + transform', 'aggregate, window, join bằng SQL/Java/Python'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba dịch vụ cho ba giai đoạn của pipeline",
      code:
        "# DATA STREAMS — hàng đợi luồng có thứ tự, giữ 24 giờ tới 365 ngày.\n" +
        "# Nhiều consumer đọc độc lập, tua lại được. Giống Kafka nhất.\n" +
        "aws kinesis create-stream --stream-name events --shard-count 4\n" +
        "aws kinesis create-stream --stream-name events --stream-mode-details \\\n" +
        "  StreamMode=ON_DEMAND        # tự scale, đắt hơn nhưng khỏi tính shard\n" +
        "\n" +
        "# FIREHOSE — ĐƯỜNG ỐNG NẠP dữ liệu, KHÔNG lưu trữ, KHÔNG tua lại.\n" +
        "# Tự gom lô, nén, chuyển định dạng (JSON -> Parquet) và ĐỔ vào đích.\n" +
        "# Gần như không phải vận hành gì. Độ trễ tối thiểu ~60 giây.\n" +
        "aws firehose create-delivery-stream --delivery-stream-name to-s3 \\\n" +
        "  --extended-s3-destination-configuration \u0027{\n" +
        "    \"BucketARN\":\"arn:aws:s3:::data-lake\",\n" +
        "    \"Prefix\":\"events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/\",\n" +
        "    \"BufferingHints\":{\"SizeInMBs\":128,\"IntervalInSeconds\":300},\n" +
        "    \"CompressionFormat\":\"GZIP\",\n" +
        "    \"DataFormatConversionConfiguration\":{\"Enabled\":true}}\u0027\n" +
        "\n" +
        "# MANAGED SERVICE FOR FLINK (tên cũ: Kinesis Data Analytics) — XỬ LÝ luồng\n" +
        "# có trạng thái: cửa sổ thời gian, join, tổng hợp, phát hiện bất thường.\n" +
        "\n" +
        "# KẾT HỢP ĐIỂN HÌNH:\n" +
        "#   ứng dụng -> Data Streams -> Flink (tổng hợp) -> Firehose -> S3 -> Athena\n" +
        "# CHỌN NHANH:\n" +
        "#  - chỉ cần đổ dữ liệu vào S3/OpenSearch/Redshift -> FIREHOSE (đơn giản nhất)\n" +
        "#  - cần nhiều consumer, tua lại, độ trễ dưới giây -> DATA STREAMS\n" +
        "#  - cần tính toán trên luồng -> FLINK\n" +
        "#  - đã quen Kafka và cần hệ sinh thái của nó -> MSK",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Kinesis shard (giống partition Kafka)',
    nodes: ['record + partition key', 'hash → shard', 'shard: 1MB/s ghi, 1000 rec/s, 2MB/s đọc', 'key phân bố kém → hot shard', 'resharding: split / merge; on-demand tự scale'],
    steps: [
      { to: 2, label: 'shard = đơn vị throughput + song song' },
      { to: 3, label: 'một shard quá tải trong khi shard khác nhàn' },
      { to: 4, label: 'split hot shard làm hai, hoặc thêm suffix ngẫu nhiên vào key cho tenant lớn' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Shard là đơn vị năng lực và đơn vị thứ tự",
      code:
        "# MỖI SHARD: ghi 1 MB/s hoặc 1.000 record/s; đọc 2 MB/s (chia cho mọi consumer).\n" +
        "# Partition key -> hash -> quyết định shard. Cùng key = cùng shard = ĐÚNG THỨ TỰ.\n" +
        "aws kinesis put-record --stream-name events \\\n" +
        "  --partition-key \"customer-42\" --data \"$(echo -n \u0027{\"e\":1}\u0027 | base64)\"\n" +
        "\n" +
        "# HOT SHARD: partition key lực lượng thấp (ví dụ \"country\") -> mọi record dồn\n" +
        "# một shard -> ProvisionedThroughputExceededException dù stream còn thừa năng lực.\n" +
        "# -> chọn key phân tán đều (userId, deviceId, orderId).\n" +
        "\n" +
        "# RESHARDING — tách hoặc gộp shard, làm TỪNG CẶP một\n" +
        "aws kinesis update-shard-count --stream-name events \\\n" +
        "  --target-shard-count 8 --scaling-type UNIFORM_SCALING\n" +
        "# Shard cũ chuyển sang trạng thái CLOSED nhưng dữ liệu vẫn đọc được tới hết\n" +
        "# retention -> consumer phải xử lý xong shard cha TRƯỚC khi đọc shard con\n" +
        "# (KCL lo việc này; tự viết consumer thì phải tự xử lý, rất dễ sai).\n" +
        "\n" +
        "# ENHANCED FAN-OUT — mỗi consumer có 2 MB/s RIÊNG (thay vì chia nhau),\n" +
        "# và dùng HTTP/2 push -> độ trễ ~70ms thay vì ~200ms khi poll.\n" +
        "aws kinesis register-stream-consumer --stream-arn $ARN --consumer-name analytics\n" +
        "\n" +
        "# ON-DEMAND mode tự scale theo lưu lượng -> tránh được hầu hết bài toán\n" +
        "# shard, đổi lại chi phí cao hơn. Tải khó đoán thì nên chọn.\n" +
        "aws cloudwatch get-metric-statistics --namespace AWS/Kinesis \\\n" +
        "  --metric-name WriteProvisionedThroughputExceeded \\\n" +
        "  --dimensions Name=StreamName,Value=events \\\n" +
        "  --start-time 2026-09-04T00:00:00Z --end-time 2026-09-05T00:00:00Z \\\n" +
        "  --period 300 --statistics Sum",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Step Functions Standard', 'Express'],
    rows: [
      ['Thời gian tối đa', '1 năm', '5 phút'],
      ['Semantics', 'exactly-once', 'at-least-once'],
      ['Lịch sử thực thi', 'đầy đủ (audit/debug)', 'không'],
      ['Giá', 'theo state transition', 'theo số lần chạy + thời gian/RAM'],
      ['Dùng cho', 'workflow nghiệp vụ dài, cần tin cậy', 'event/stream tần suất lớn, ngắn'],
    ],
  },
  demo: [
    {
      lang: "json",
      title: "State machine với retry và catch",
      code:
        "{\n" +
        "  \"Comment\": \"Xử lý đơn hàng: retry có backoff, và bù trừ khi lỗi\",\n" +
        "  \"StartAt\": \"ChargePayment\",\n" +
        "  \"States\": {\n" +
        "    \"ChargePayment\": {\n" +
        "      \"Type\": \"Task\",\n" +
        "      \"Resource\": \"arn:aws:states:::lambda:invoke\",\n" +
        "      \"Parameters\": { \"FunctionName\": \"charge\", \"Payload.$\": \"$\" },\n" +
        "      \"Retry\": [{\n" +
        "        \"ErrorEquals\": [\"States.TaskFailed\", \"Lambda.ServiceException\"],\n" +
        "        \"IntervalSeconds\": 2, \"MaxAttempts\": 3, \"BackoffRate\": 2.0\n" +
        "      }],\n" +
        "      \"Catch\": [{\n" +
        "        \"ErrorEquals\": [\"States.ALL\"],\n" +
        "        \"Next\": \"CancelOrder\", \"ResultPath\": \"$.error\"\n" +
        "      }],\n" +
        "      \"Next\": \"ReserveInventory\"\n" +
        "    },\n" +
        "    \"ReserveInventory\": {\n" +
        "      \"Type\": \"Task\",\n" +
        "      \"Resource\": \"arn:aws:states:::dynamodb:updateItem\",\n" +
        "      \"Parameters\": { \"TableName\": \"Inventory\" },\n" +
        "      \"End\": true\n" +
        "    },\n" +
        "    \"CancelOrder\": {\n" +
        "      \"Type\": \"Task\",\n" +
        "      \"Resource\": \"arn:aws:states:::lambda:invoke\",\n" +
        "      \"Parameters\": { \"FunctionName\": \"cancel\" },\n" +
        "      \"End\": true\n" +
        "    }\n" +
        "  }\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Standard vs Express, và vì sao dùng Step Functions",
      code:
        "# STANDARD — tối đa 1 NĂM, chính xác MỘT LẦN, lưu lịch sử đầy đủ từng bước\n" +
        "# (xem lại được input/output của mỗi state -> gỡ rối rất dễ).\n" +
        "# Tính tiền THEO CHUYỂN TRẠNG THÁI (~$25/triệu) -> đắt nếu nhiều bước.\n" +
        "# Dùng cho: quy trình nghiệp vụ dài, saga, phê duyệt của con người, ETL.\n" +
        "\n" +
        "# EXPRESS — tối đa 5 PHÚT, AT-LEAST-ONCE, log vào CloudWatch.\n" +
        "# Tính tiền theo SỐ LẦN CHẠY + thời gian -> rẻ hơn tới 100 lần khi\n" +
        "# throughput cao. Dùng cho: xử lý sự kiện, IoT, luồng streaming.\n" +
        "aws stepfunctions create-state-machine --name orders \\\n" +
        "  --definition file://sm.json --role-arn $ROLE --type EXPRESS\n" +
        "\n" +
        "# VÌ SAO DÙNG STEP FUNCTIONS thay vì viết logic điều phối trong Lambda:\n" +
        "#  - retry/backoff/catch KHAI BÁO, không phải code\n" +
        "#  - trạng thái được lưu bền -> chạy hàng tháng vẫn không mất\n" +
        "#  - nhìn thấy quy trình bằng sơ đồ, và xem được từng lần chạy hỏng ở đâu\n" +
        "#  - gọi thẳng hơn 200 dịch vụ AWS mà không cần Lambda trung gian\n" +
        "#  - Map state chạy song song hàng nghìn nhánh (Distributed Map tới 10.000)\n" +
        "#  - callback pattern (waitForTaskToken) cho bước cần con người duyệt",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'CloudWatch',
    root: {
      label: 'Metrics: xu hướng & alarm · Logs: chi tiết & điều tra',
      children: [
        { label: 'Metrics', note: 'time-series; PutMetricData custom hoặc EMF (log JSON → CloudWatch tự trích metric)' },
        { label: 'Alarms', note: 'ngưỡng/anomaly → SNS, Auto Scaling, EC2 action; composite alarm giảm nhiễu' },
        { label: 'Logs', note: 'retention cấu hình, metric filter (đếm pattern → metric), subscription filter' },
        { label: 'Logs Insights', note: 'query ngôn ngữ riêng để phân tích log ad-hoc' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Bốn thành phần và các bẫy chi phí",
      code:
        "# METRICS — mặc định 5 phút (basic); detailed monitoring 1 phút (có phí).\n" +
        "# Custom metric: dùng EMF (Embedded Metric Format) thay vì gọi PutMetricData\n" +
        "# trong vòng lặp — EMF nhúng metric vào log, rẻ hơn nhiều và không chặn.\n" +
        "aws cloudwatch put-metric-data --namespace App \\\n" +
        "  --metric-name OrdersProcessed --value 1 --unit Count \\\n" +
        "  --dimensions Service=orders,Env=prod\n" +
        "\n" +
        "# ALARM — nhớ TreatMissingData, nếu không alarm sẽ ở trạng thái INSUFFICIENT\n" +
        "# và không bao giờ kêu:\n" +
        "aws cloudwatch put-metric-alarm --alarm-name api-5xx \\\n" +
        "  --metric-name 5XXError --namespace AWS/ApiGateway \\\n" +
        "  --statistic Sum --period 300 --threshold 10 \\\n" +
        "  --comparison-operator GreaterThanThreshold --evaluation-periods 2 \\\n" +
        "  --datapoints-to-alarm 2 --treat-missing-data notBreaching \\\n" +
        "  --alarm-actions $SNS_ARN\n" +
        "# COMPOSITE ALARM gộp nhiều alarm -> giảm nhiễu khi một sự cố kéo theo\n" +
        "# hàng chục cảnh báo:\n" +
        "aws cloudwatch put-composite-alarm --alarm-name service-down \\\n" +
        "  --alarm-rule \"ALARM(api-5xx) AND ALARM(db-connections)\"\n" +
        "\n" +
        "# LOGS — LUÔN đặt retention. Mặc định là VĨNH VIỄN và đây là nguyên nhân\n" +
        "# hoá đơn CloudWatch phình to nhất:\n" +
        "aws logs put-retention-policy --log-group-name /aws/lambda/orders --retention-in-days 30\n" +
        "\n" +
        "# LOGS INSIGHTS — truy vấn log, tính tiền theo LƯỢNG DỮ LIỆU QUÉT\n" +
        "aws logs start-query --log-group-name /aws/lambda/orders \\\n" +
        "  --start-time $(date -d \u00271 hour ago\u0027 +%s) --end-time $(date +%s) \\\n" +
        "  --query-string \u0027fields @timestamp, @message\n" +
        "    | filter @message like /ERROR/\n" +
        "    | stats count(*) by bin(5m)\u0027\n" +
        "# Luôn thu hẹp khoảng thời gian và lọc sớm để giảm dữ liệu quét.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'X-Ray / distributed tracing',
    nodes: ['request qua API GW → Lambda → DynamoDB → SQS → Lambda', 'trace ID truyền qua các service', 'mỗi service ghi segment/subsegment (thời gian, lỗi, metadata)', 'service map + timeline của từng request'],
    steps: [
      { to: 1, label: 'log rời rạc không cho biết KHÂU NÀO chậm/lỗi' },
      { to: 3, label: 'chỉ ra service/khâu nào là nút thắt — điều metric và log đơn lẻ không làm được' },
      { to: 3, label: 'SDK/agent, hoặc OpenTelemetry (ADOT)' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Nhìn xuyên suốt một request qua nhiều dịch vụ",
      code:
        "# VẤN ĐỀ: request chậm 3 giây, đi qua API Gateway -> Lambda -> DynamoDB ->\n" +
        "# service khác. Log của từng dịch vụ KHÔNG nói được thời gian nằm ở đâu.\n" +
        "# Tracing nối các đoạn lại bằng một TRACE ID chung.\n" +
        "\n" +
        "# Bật cho Lambda và API Gateway — hầu như không phải sửa code:\n" +
        "aws lambda update-function-configuration --function-name orders \\\n" +
        "  --tracing-config Mode=Active\n" +
        "aws apigateway update-stage --rest-api-id abc --stage-name prod \\\n" +
        "  --patch-operations op=replace,path=/tracingEnabled,value=true\n" +
        "\n" +
        "# Trong code, bọc SDK để tự tạo subsegment cho mọi lời gọi AWS:\n" +
        "#   Java:   AWSXRay.beginSubsegment(\"charge-payment\") / endSubsegment()\n" +
        "#   Node:   const AWS = AWSXRay.captureAWS(require(\u0027aws-sdk\u0027))\n" +
        "#   Python: patch_all()\n" +
        "\n" +
        "# KHÁI NIỆM:\n" +
        "#  segment    — công việc của MỘT dịch vụ\n" +
        "#  subsegment — chi tiết bên trong (một truy vấn DB, một lời gọi HTTP)\n" +
        "#  annotation — được ĐÁNH INDEX, tìm kiếm được (đặt orderId, customerId ở đây)\n" +
        "#  metadata   — không index, chỉ để xem\n" +
        "# -> đặt định danh nghiệp vụ vào ANNOTATION thì mới truy được một request cụ thể.\n" +
        "\n" +
        "aws xray get-trace-summaries --start-time $(date -d \u00271 hour ago\u0027 +%s) \\\n" +
        "  --end-time $(date +%s) --filter-expression \u0027responsetime > 3\u0027\n" +
        "\n" +
        "# SAMPLING: mặc định 1 request/giây + 5% phần còn lại -> đủ để thấy xu hướng\n" +
        "# mà không tốn kém. Tăng khi đang điều tra sự cố.\n" +
        "# Xu hướng hiện nay: dùng OpenTelemetry (ADOT) thay vì SDK X-Ray riêng —\n" +
        "# không bị khoá vào một nhà cung cấp.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'CloudFormation — state machine cho hạ tầng',
    root: {
      label: 'template = mong muốn; stack = hiện trạng',
      children: [
        { label: 'Stack', note: 'tập tài nguyên từ một template; xoá stack = xoá tài nguyên (trừ DeletionPolicy: Retain)' },
        { label: 'Change set', note: 'xem trước "diff" — cảnh báo "Replacement: True" (re-create → mất dữ liệu)' },
        { label: 'Drift detection', note: 'phát hiện tài nguyên bị sửa NGOÀI CloudFormation' },
        { label: 'Nested stacks / StackSets', note: 'module hoá / deploy ra nhiều account/region' },
      ],
    },
  },
  demo: [
    {
      lang: "yaml",
      title: "Template và các khái niệm chính",
      code:
        "AWSTemplateFormatVersion: \u00272010-09-09\u0027\n" +
        "Parameters:\n" +
        "  Env:\n" +
        "    Type: String\n" +
        "    AllowedValues: [dev, prod]\n" +
        "Conditions:\n" +
        "  IsProd: !Equals [!Ref Env, prod]\n" +
        "Resources:\n" +
        "  Bucket:\n" +
        "    Type: AWS::S3::Bucket\n" +
        "    DeletionPolicy: Retain              # KHÔNG xoá khi xoá stack\n" +
        "    UpdateReplacePolicy: Retain\n" +
        "    Properties:\n" +
        "      BucketName: !Sub \"${AWS::StackName}-data-${AWS::AccountId}\"\n" +
        "      VersioningConfiguration:\n" +
        "        Status: !If [IsProd, Enabled, Suspended]\n" +
        "Outputs:\n" +
        "  BucketArn:\n" +
        "    Value: !GetAtt Bucket.Arn\n" +
        "    Export:\n" +
        "      Name: !Sub \"${AWS::StackName}-BucketArn\"   # stack khác import được",
    },
    {
      lang: "bash",
      title: "Change set, drift và StackSets",
      code:
        "# CHANGE SET — xem TRƯỚC thay đổi, đặc biệt là tài nguyên nào bị THAY THẾ\n" +
        "# (replacement = xoá và tạo mới = MẤT DỮ LIỆU). Luôn xem trước ở production.\n" +
        "aws cloudformation create-change-set --stack-name prod \\\n" +
        "  --template-body file://template.yml --change-set-name update-1\n" +
        "aws cloudformation describe-change-set --stack-name prod \\\n" +
        "  --change-set-name update-1 --query \u0027Changes[].ResourceChange.[LogicalResourceId,Action,Replacement]\u0027\n" +
        "aws cloudformation execute-change-set --stack-name prod --change-set-name update-1\n" +
        "\n" +
        "# DRIFT — phát hiện ai đó sửa tay trên console, làm lệch khỏi template\n" +
        "aws cloudformation detect-stack-drift --stack-name prod\n" +
        "aws cloudformation describe-stack-resource-drifts --stack-name prod \\\n" +
        "  --stack-resource-drift-status-filters MODIFIED DELETED\n" +
        "\n" +
        "# NESTED STACK — tách template lớn thành module tái sử dụng (AWS::CloudFormation::Stack)\n" +
        "# StackSets — triển khai CÙNG một template ra NHIỀU tài khoản và NHIỀU region\n" +
        "aws cloudformation create-stack-instances --stack-set-name baseline \\\n" +
        "  --deployment-targets OrganizationalUnitIds=ou-abc \\\n" +
        "  --regions ap-southeast-1 us-east-1\n" +
        "\n" +
        "# STACK POLICY chống xoá nhầm tài nguyên quan trọng:\n" +
        "aws cloudformation set-stack-policy --stack-name prod --stack-policy-body file://policy.json\n" +
        "# Kẹt ở UPDATE_ROLLBACK_FAILED -> continue-update-rollback với\n" +
        "# --resources-to-skip (tình huống khó chịu nhất của CloudFormation).",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['CloudFormation', 'CDK', 'Terraform'],
    rows: [
      ['Ngôn ngữ', 'YAML/JSON khai báo', 'TS/Python/Java → synth ra CFN', 'HCL khai báo'],
      ['Phạm vi', 'chỉ AWS', 'chỉ AWS + sức mạnh ngôn ngữ (Construct)', 'đa cloud / đa provider'],
      ['State', 'AWS giữ', 'AWS giữ (qua CFN)', 'state file (backend S3 + DynamoDB lock)'],
      ['Rollback', 'tự động', 'tự động', 'không tự động (plan/apply)'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba công cụ IaC, ba đánh đổi",
      code:
        "# CLOUDFORMATION — YAML/JSON khai báo, native AWS.\n" +
        "#  + miễn phí, quản lý state hộ, tích hợp sâu (StackSets, drift, rollback tự động)\n" +
        "#  - dài dòng, logic điều kiện yếu, chỉ AWS, đôi khi chậm hỗ trợ dịch vụ mới\n" +
        "aws cloudformation deploy --template-file t.yml --stack-name prod\n" +
        "\n" +
        "# CDK — viết bằng TypeScript/Python/Java/Go rồi SINH RA CloudFormation.\n" +
        "#  + dùng vòng lặp, hàm, lớp, kiểm tra kiểu, test đơn vị được\n" +
        "#  + construct cấp cao giảm rất nhiều dòng (một dòng ra cả VPC nhiều AZ)\n" +
        "#  + vẫn hưởng mọi ưu điểm của CloudFormation ở tầng dưới\n" +
        "#  - phải biết lập trình; template sinh ra khó đọc; nâng cấp CDK đôi khi gây khác biệt\n" +
        "cdk diff && cdk deploy\n" +
        "\n" +
        "# TERRAFORM — HCL, ĐA CLOUD, hệ sinh thái provider khổng lồ.\n" +
        "#  + một công cụ cho AWS + Cloudflare + Datadog + GitHub...\n" +
        "#  + plan/apply rõ ràng, module tái sử dụng tốt, cộng đồng lớn\n" +
        "#  - phải TỰ QUẢN LÝ STATE (S3 + DynamoDB lock) — state hỏng là vấn đề thật\n" +
        "#  - đổi giấy phép sang BUSL năm 2023 (OpenTofu là bản fork mã nguồn mở)\n" +
        "terraform plan -out=tfplan && terraform apply tfplan\n" +
        "\n" +
        "# CHỌN:\n" +
        "#  - chỉ AWS, đội thích khai báo thuần -> CloudFormation\n" +
        "#  - chỉ AWS, đội mạnh về lập trình, hạ tầng phức tạp -> CDK\n" +
        "#  - đa cloud, hoặc quản lý cả SaaS ngoài AWS -> Terraform\n" +
        "# Quan trọng hơn việc chọn: CHỌN MỘT và dùng nhất quán. Trộn lẫn ba thứ\n" +
        "# trên cùng một hệ thống là nguồn đau khổ lâu dài.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Pipeline: 3 dịch vụ rời để ghép linh hoạt',
    nodes: ['Source (CodeCommit/GitHub)', 'CodeBuild (mvn verify, build image, push ECR)', 'Deploy staging (CodeDeploy)', 'Manual approval', 'Deploy prod (canary + auto rollback)'],
    steps: [
      { to: 0, label: 'CodePipeline orchestrator: định nghĩa các stage, trigger theo commit' },
      { to: 1, label: 'CodeBuild = CI runner theo buildspec.yml → trả artifact' },
      { to: 4, label: 'CodeDeploy: in-place / blue-green / canary, hook lifecycle, tự rollback khi alarm/health fail' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "buildspec của CodeBuild",
      code:
        "version: 0.2\n" +
        "phases:\n" +
        "  pre_build:\n" +
        "    commands:\n" +
        "      - aws ecr get-login-password | docker login --username AWS --password-stdin $REPO\n" +
        "  build:\n" +
        "    commands:\n" +
        "      - ./mvnw -q package\n" +
        "      - docker build -t $REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION .\n" +
        "  post_build:\n" +
        "    commands:\n" +
        "      - docker push $REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION\n" +
        "      - printf \u0027[{\"name\":\"app\",\"imageUri\":\"%s\"}]\u0027 $REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json\n" +
        "artifacts:\n" +
        "  files: [imagedefinitions.json]\n" +
        "cache:\n" +
        "  paths: [\u0027/root/.m2/**/*\u0027]        # cache dependency -> build nhanh hơn nhiều",
    },
    {
      lang: "bash",
      title: "Ba vai trò và khi nào dùng thay vì GitHub Actions",
      code:
        "# CODEPIPELINE — bộ ĐIỀU PHỐI: nối các giai đoạn (source -> build -> test ->\n" +
        "# deploy), quản lý artifact giữa các bước, hỗ trợ phê duyệt thủ công.\n" +
        "aws codepipeline create-pipeline --cli-input-json file://pipeline.json\n" +
        "\n" +
        "# CODEBUILD — chạy BUILD/TEST trong container tạm. Tính tiền theo phút.\n" +
        "# Không phải nuôi build server, tự scale.\n" +
        "aws codebuild start-build --project-name app-build\n" +
        "\n" +
        "# CODEDEPLOY — TRIỂN KHAI ra EC2/ECS/Lambda với chiến lược có kiểm soát\n" +
        "# (rolling, blue/green, canary) và TỰ ROLLBACK khi alarm kêu.\n" +
        "aws deploy create-deployment --application-name app \\\n" +
        "  --deployment-group-name prod --revision file://revision.json\n" +
        "\n" +
        "# THỰC TẾ: nhiều đội dùng GITHUB ACTIONS/GitLab CI cho source+build (gần\n" +
        "# code hơn, hệ sinh thái action phong phú) và chỉ dùng CodeDeploy cho phần\n" +
        "# triển khai blue/green trên ECS/Lambda.\n" +
        "# Dùng trọn bộ Code* hợp lý khi: yêu cầu tuân thủ bắt mọi thứ ở trong AWS,\n" +
        "# hoặc cần IAM role thay vì lưu credential ở CI bên ngoài.\n" +
        "# (GitHub Actions + OIDC cũng bỏ được credential -> lý do này yếu dần.)",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Rolling', 'Blue/Green', 'Canary'],
    rows: [
      ['Cách', 'thay dần từng batch', 'dựng môi trường mới rồi chuyển TOÀN BỘ traffic', 'chuyển một phần nhỏ traffic, tăng dần'],
      ['Tài nguyên thừa', 'ít', '2x tạm thời', 'ít'],
      ['Rollback', 'rolling ngược (chậm), trộn 2 version', 'trỏ lại blue TỨC THÌ', 'blast radius nhỏ'],
      ['Tiêu chuẩn vàng', '—', '—', 'canary + auto-rollback theo alarm'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba chiến lược và cách cấu hình",
      code:
        "# ROLLING — thay dần từng phần. Rẻ nhất (không cần gấp đôi tài nguyên),\n" +
        "# nhưng trong lúc deploy có HAI PHIÊN BẢN cùng chạy -> API phải tương thích\n" +
        "# ngược, và rollback chậm.\n" +
        "aws ecs update-service --cluster prod --service app \\\n" +
        "  --task-definition app:5 \\\n" +
        "  --deployment-configuration \u0027minimumHealthyPercent=100,maximumPercent=200\u0027\n" +
        "\n" +
        "# BLUE/GREEN — dựng môi trường mới SONG SONG, kiểm tra, rồi chuyển toàn bộ\n" +
        "# lưu lượng. Rollback tức thì (chỉ chuyển ngược). Tốn gấp đôi tài nguyên\n" +
        "# trong lúc chuyển đổi.\n" +
        "aws deploy create-deployment --application-name app \\\n" +
        "  --deployment-group-name prod \\\n" +
        "  --deployment-config-name CodeDeployDefault.ECSAllAtOnce\n" +
        "# ECS blue/green dùng hai target group; ALB chuyển listener sang TG mới.\n" +
        "\n" +
        "# CANARY — chuyển một PHẦN NHỎ lưu lượng trước, theo dõi, rồi tăng dần.\n" +
        "# An toàn nhất vì lỗi chỉ ảnh hưởng vài phần trăm người dùng.\n" +
        "aws deploy create-deployment --application-name app \\\n" +
        "  --deployment-group-name prod \\\n" +
        "  --deployment-config-name CodeDeployDefault.ECSCanary10Percent5Minutes\n" +
        "# Lambda có sẵn alias + weighted routing:\n" +
        "aws lambda update-alias --function-name orders --name PROD \\\n" +
        "  --function-version 5 --routing-config AdditionalVersionWeights={4=0.9}\n" +
        "\n" +
        "# QUAN TRỌNG HƠN CẢ CHIẾN LƯỢC: TỰ ĐỘNG ROLLBACK theo alarm.\n" +
        "aws deploy update-deployment-group --application-name app \\\n" +
        "  --current-deployment-group-name prod \\\n" +
        "  --auto-rollback-configuration enabled=true,events=DEPLOYMENT_FAILURE,DEPLOYMENT_STOP_ON_ALARM \\\n" +
        "  --alarm-configuration enabled=true,alarms=[{name=api-5xx}]\n" +
        "# Không có rollback tự động thì mọi chiến lược đều dựa vào việc có người\n" +
        "# đang nhìn dashboard đúng lúc.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Systems Manager — "không có port 22" là mục tiêu khả thi',
    root: {
      label: 'Mọi thao tác vận hành qua IAM + agent, được audit',
      children: [
        { label: 'Session Manager', note: 'shell vào EC2 không cần SSH/bastion/port 22; log toàn bộ phiên' },
        { label: 'Run Command', note: 'chạy lệnh/script trên nhiều instance cùng lúc' },
        { label: 'Patch Manager', note: 'vá OS theo baseline + maintenance window' },
        { label: 'Parameter Store', note: 'config & secret phân cấp' },
        { label: 'State Manager / Automation', note: 'giữ instance ở trạng thái mong muốn, runbook' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Quản trị máy chủ mà không cần SSH",
      code:
        "# SESSION MANAGER — shell vào instance KHÔNG CẦN cổng 22, KHÔNG CẦN\n" +
        "# bastion host, KHÔNG CẦN key SSH, và instance có thể nằm ở subnet PRIVATE.\n" +
        "aws ssm start-session --target i-1234\n" +
        "# Điều kiện: SSM Agent (có sẵn trên AMI Amazon Linux/Ubuntu mới) + instance\n" +
        "# profile có AmazonSSMManagedInstanceCore + đường ra tới endpoint SSM\n" +
        "# (NAT hoặc VPC Endpoint).\n" +
        "# LỢI ÍCH BẢO MẬT rất lớn: bỏ được hoàn toàn cổng 22 khỏi security group,\n" +
        "# mọi phiên đều được ghi log vào CloudTrail và có thể ghi lại toàn bộ session.\n" +
        "\n" +
        "# Port forwarding tới RDS trong subnet private mà không cần bastion:\n" +
        "aws ssm start-session --target i-1234 \\\n" +
        "  --document-name AWS-StartPortForwardingSessionToRemoteHost \\\n" +
        "  --parameters \u0027{\"host\":[\"prod.xxx.rds.amazonaws.com\"],\"portNumber\":[\"5432\"],\"localPortNumber\":[\"5432\"]}\u0027\n" +
        "\n" +
        "# RUN COMMAND — chạy lệnh trên HÀNG NGHÌN instance cùng lúc, có kiểm soát\n" +
        "aws ssm send-command --document-name \"AWS-RunShellScript\" \\\n" +
        "  --targets \"Key=tag:Env,Values=prod\" \\\n" +
        "  --parameters \u0027commands=[\"systemctl restart app\"]\u0027 \\\n" +
        "  --max-concurrency \"10%\" --max-errors \"5\"\n" +
        "\n" +
        "# PATCH MANAGER — vá lỗi theo lịch và theo baseline\n" +
        "aws ssm create-patch-baseline --name prod-baseline --operating-system AMAZON_LINUX_2\n" +
        "\n" +
        "# PARAMETER STORE — cấu hình và bí mật (xem câu so sánh với Secrets Manager)\n" +
        "aws ssm get-parameters-by-path --path /prod/ --recursive --with-decryption",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Tối ưu chi phí AWS — làm LIÊN TỤC',
    root: {
      label: '(đo + tag) → (right-size + cam kết + Spot) → (dọn rác + tiering) → (giảm data transfer)',
      children: [
        { label: 'Right-sizing', note: 'Compute Optimizer / CloudWatch phát hiện instance quá khổ' },
        { label: 'Cam kết', note: 'Savings Plans / RI cho baseline; Spot cho workload chịu gián đoạn' },
        { label: 'Tắt cái không dùng', note: 'dev/test theo lịch; xoá EBS/EIP/snapshot mồ côi' },
        { label: 'Storage tiering', note: 'S3 lifecycle, gp2→gp3, Intelligent-Tiering' },
        { label: 'Giảm data transfer', note: 'VPC Endpoint, CloudFront, tránh chit-chat cross-AZ' },
        { label: 'Quan sát', note: 'Cost Explorer, Budgets + alert, anomaly detection' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Theo thứ tự hiệu quả trên mỗi giờ công bỏ ra",
      code:
        "# 1) XOÁ THỨ KHÔNG DÙNG — luôn là khoản thắng lớn nhất và nhanh nhất\n" +
        "aws ec2 describe-addresses --query \u0027Addresses[?AssociationId==null]\u0027        # EIP rỗi\n" +
        "aws ec2 describe-volumes --filters Name=status,Values=available             # EBS không gắn\n" +
        "aws rds describe-db-instances --query \u0027DBInstances[?DBInstanceStatus==`stopped`]\u0027\n" +
        "# + snapshot cũ, load balancer không có target, NAT ở môi trường dev\n" +
        "\n" +
        "# 2) RIGHT-SIZING — hầu hết instance được cấp thừa 2-3 lần\n" +
        "aws compute-optimizer get-ec2-instance-recommendations \\\n" +
        "  --query \u0027instanceRecommendations[?finding==`OVER_PROVISIONED`]\u0027\n" +
        "\n" +
        "# 3) SAVINGS PLANS / RESERVED — giảm tới 72% cho tải nền ổn định\n" +
        "aws ce get-savings-plans-purchase-recommendation --savings-plans-type COMPUTE_SP \\\n" +
        "  --term-in-years ONE_YEAR --payment-option NO_UPFRONT --lookback-period-in-days SIXTY_DAYS\n" +
        "\n" +
        "# 4) SPOT cho workload chịu gián đoạn (CI, batch, xử lý ảnh) — giảm tới 90%\n" +
        "# 5) LIFECYCLE S3 + retention CloudWatch Logs (rất hay bị bỏ quên)\n" +
        "aws logs put-retention-policy --log-group-name /aws/lambda/f --retention-in-days 14\n" +
        "\n" +
        "# 6) TẮT MÔI TRƯỜNG DEV NGOÀI GIỜ — 12 giờ/ngày, 5 ngày/tuần\n" +
        "#    = chỉ chạy ~36% thời gian -> tiết kiệm ~64%\n" +
        "# 7) GATEWAY ENDPOINT cho S3/DynamoDB -> cắt phí NAT\n" +
        "# 8) Graviton -> rẻ hơn ~20% ở cùng hiệu năng\n" +
        "\n" +
        "# THEO DÕI để không tái diễn:\n" +
        "aws budgets create-budget --account-id 123456789012 --budget file://budget.json\n" +
        "aws ce get-anomaly-monitors     # Cost Anomaly Detection: cảnh báo tăng bất thường\n" +
        "# Và bật Cost Explorer + tag phân bổ chi phí ngay từ đầu, nếu không sẽ\n" +
        "# không biết tiền đi đâu.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Lambda', 'DynamoDB', 'ECS'],
    rows: [
      ['Cách scale', 'tự theo invoke đồng thời (burst 500–3000, rồi +500/phút)', 'Application Auto Scaling RCU/WCU theo target utilization; hoặc on-demand', 'Service Auto Scaling target tracking (CPU/mem/ALB request)'],
      ['Cần cấu hình?', 'gần như không', 'provisioned mode cần; on-demand tự lo', 'cần + Cluster Auto Scaling / Fargate cho node'],
      ['Luôn có trần', 'concurrency limit', 'max capacity', 'max task'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba mô hình scale khác nhau",
      code:
        "# LAMBDA — scale TỰ ĐỘNG hoàn toàn, không cấu hình gì.\n" +
        "#  Burst 500-3.000 (tuỳ region), sau đó +500 mỗi phút tới trần tài khoản.\n" +
        "#  -> tải tăng vọt đột ngột VẪN bị throttle dù chưa chạm trần 1.000.\n" +
        "aws lambda put-function-concurrency --function-name f \\\n" +
        "  --reserved-concurrent-executions 200        # vừa bảo đảm vừa giới hạn\n" +
        "aws lambda put-provisioned-concurrency-config --function-name f \\\n" +
        "  --qualifier PROD --provisioned-concurrent-executions 50    # bỏ cold start\n" +
        "\n" +
        "# DYNAMODB — Application Auto Scaling điều chỉnh RCU/WCU theo mức sử dụng\n" +
        "aws application-autoscaling register-scalable-target \\\n" +
        "  --service-namespace dynamodb --resource-id \"table/Orders\" \\\n" +
        "  --scalable-dimension \"dynamodb:table:WriteCapacityUnits\" \\\n" +
        "  --min-capacity 10 --max-capacity 500\n" +
        "aws application-autoscaling put-scaling-policy \\\n" +
        "  --policy-type TargetTrackingScaling --target-tracking-scaling-policy-configuration \\\n" +
        "  \u0027{\"TargetValue\":70.0,\"PredefinedMetricSpecification\":\n" +
        "    {\"PredefinedMetricType\":\"DynamoDBWriteCapacityUtilization\"}}\u0027\n" +
        "# Scale mất VÀI PHÚT -> tải tăng đột ngột vẫn throttle. Cần phản ứng tức\n" +
        "# thì thì dùng ON-DEMAND.\n" +
        "\n" +
        "# ECS — hai tầng phải cấu hình RIÊNG:\n" +
        "#  a) SERVICE auto scaling: số TASK\n" +
        "aws application-autoscaling put-scaling-policy \\\n" +
        "  --service-namespace ecs --resource-id service/prod/app \\\n" +
        "  --scalable-dimension ecs:service:DesiredCount \\\n" +
        "  --policy-type TargetTrackingScaling --target-tracking-scaling-policy-configuration \\\n" +
        "  \u0027{\"TargetValue\":70.0,\"PredefinedMetricSpecification\":\n" +
        "    {\"PredefinedMetricType\":\"ECSServiceAverageCPUUtilization\"}}\u0027\n" +
        "#  b) CLUSTER capacity provider: số INSTANCE EC2 (Fargate thì không cần)\n" +
        "# Quên vế (b) là task mới không có chỗ chạy -> kẹt ở trạng thái PENDING.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'AWS Config rules — chính sách thành kiểm tra tự động, liên tục',
    nodes: ['Config rule đánh giá cấu hình liên tục', 'COMPLIANT / NON_COMPLIANT', 'remediation: SSM Automation tự sửa', 'conformance pack: bó rule theo chuẩn (CIS, PCI, HIPAA)'],
    steps: [
      { to: 1, label: 'managed rules (s3-bucket-public-read-prohibited, encrypted-volumes…) hoặc custom (Lambda/Guard)' },
      { to: 2, label: 'ví dụ: bucket không mã hoá → tự bật SSE-S3 + thông báo team tạo ra nó' },
      { to: 3, label: 'deploy một lần cho account/OU — thay audit thủ công định kỳ' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Kiểm tra tuân thủ liên tục và tự sửa",
      code:
        "# Config ghi lại TRẠNG THÁI cấu hình theo thời gian và đánh giá liên tục\n" +
        "# theo các rule -> trả lời được \"có bao nhiêu bucket đang public NGAY BÂY GIỜ\"\n" +
        "# và \"tài nguyên này đã đổi gì trong 6 tháng qua\".\n" +
        "aws configservice put-config-rule --config-rule \u0027{\n" +
        "  \"ConfigRuleName\": \"s3-bucket-public-read-prohibited\",\n" +
        "  \"Source\": {\"Owner\": \"AWS\", \"SourceIdentifier\": \"S3_BUCKET_PUBLIC_READ_PROHIBITED\"},\n" +
        "  \"Scope\": {\"ComplianceResourceTypes\": [\"AWS::S3::Bucket\"]}}\u0027\n" +
        "\n" +
        "aws configservice describe-compliance-by-config-rule \\\n" +
        "  --compliance-types NON_COMPLIANT\n" +
        "\n" +
        "# TỰ ĐỘNG SỬA (remediation) — không chỉ báo cáo mà còn khắc phục\n" +
        "aws configservice put-remediation-configurations --remediation-configurations \u0027[{\n" +
        "  \"ConfigRuleName\":\"s3-bucket-public-read-prohibited\",\n" +
        "  \"TargetType\":\"SSM_DOCUMENT\",\n" +
        "  \"TargetId\":\"AWS-DisableS3BucketPublicReadWrite\",\n" +
        "  \"Automatic\":true,\n" +
        "  \"MaximumAutomaticAttempts\":3}]\u0027\n" +
        "\n" +
        "# CONFORMANCE PACK — gói nhiều rule theo một khung tuân thủ\n" +
        "# (PCI-DSS, HIPAA, CIS, NIST), triển khai một lần cho cả tổ chức:\n" +
        "aws configservice put-conformance-pack --conformance-pack-name pci \\\n" +
        "  --template-s3-uri s3://aws-config-conformance-packs/Operational-Best-Practices-for-PCI-DSS.yaml\n" +
        "\n" +
        "# PHÂN BIỆT với các dịch vụ nghe giống nhau:\n" +
        "#   Config      — CẤU HÌNH có đúng chuẩn không (tuân thủ)\n" +
        "#   Security Hub — tổng hợp phát hiện bảo mật từ nhiều nguồn\n" +
        "#   GuardDuty   — phát hiện HÀNH VI đe doạ (đào coin, gọi API bất thường)\n" +
        "#   Inspector   — quét LỖ HỔNG phần mềm trong EC2/ECR/Lambda\n" +
        "# CHI PHÍ: Config tính theo số bản ghi cấu hình + số lần đánh giá rule.\n" +
        "# Bật ghi mọi loại tài nguyên ở tài khoản lớn có thể tốn bất ngờ.",
    },
  ],
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
  viz: {
    type: 'bars',
    title: 'DR — RTO điển hình (log scale, càng ngắn càng đắt/phức tạp)',
    unit: 'phút',
    scale: 'log',
    items: [
      { label: 'Backup & Restore', value: 240, note: 'snapshot/S3 CRR sang region khác — rẻ nhất, RTO/RPO hàng giờ' },
      { label: 'Pilot Light', value: 30, note: 'lõi tối thiểu chạy sẵn (DB replica, AMI); phần còn lại tắt' },
      { label: 'Warm Standby', value: 3, note: 'phiên bản thu nhỏ chạy đủ, scale lên khi failover' },
      { label: 'Multi-site Active/Active', value: 1, note: 'chạy đầy đủ nhiều region, RTO ~0 — đắt & phức tạp nhất' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Bốn mức, theo RTO/RPO và chi phí",
      code:
        "# RTO = mất bao lâu để khôi phục. RPO = chấp nhận mất bao nhiêu dữ liệu.\n" +
        "\n" +
        "# 1) BACKUP & RESTORE — RTO/RPO: giờ tới ngày. RẺ NHẤT.\n" +
        "#    Sao lưu sang region khác, khi có sự cố thì dựng lại từ đầu.\n" +
        "aws backup create-backup-plan --backup-plan file://plan.json\n" +
        "aws rds copy-db-snapshot --source-db-snapshot-identifier $SNAP \\\n" +
        "  --target-db-snapshot-identifier dr --source-region ap-southeast-1 --region us-west-2\n" +
        "\n" +
        "# 2) PILOT LIGHT — RTO: chục phút tới giờ. RPO: phút.\n" +
        "#    Giữ phần LÕI chạy ở region dự phòng (database replica), phần compute\n" +
        "#    tắt sẵn nhưng đã có AMI/template, khi cần thì bật lên.\n" +
        "aws rds create-db-instance-read-replica --db-instance-identifier dr-replica \\\n" +
        "  --source-db-instance-identifier arn:aws:rds:ap-southeast-1:123:db:prod \\\n" +
        "  --region us-west-2\n" +
        "\n" +
        "# 3) WARM STANDBY — RTO: phút. RPO: giây.\n" +
        "#    Bản sao ĐẦY ĐỦ nhưng quy mô NHỎ đang chạy thật; khi failover thì scale lên.\n" +
        "\n" +
        "# 4) MULTI-SITE ACTIVE/ACTIVE — RTO/RPO: gần bằng 0. ĐẮT NHẤT và phức tạp nhất.\n" +
        "#    Cả hai region cùng phục vụ; Route 53 latency routing + Aurora Global\n" +
        "#    Database hoặc DynamoDB Global Tables.\n" +
        "aws dynamodb update-table --table-name Orders \\\n" +
        "  --replica-updates \u0027[{\"Create\":{\"RegionName\":\"us-west-2\"}}]\u0027\n" +
        "\n" +
        "# CHỌN THEO TIỀN: hỏi \"một giờ ngừng hoạt động tốn bao nhiêu\" rồi so với\n" +
        "# chi phí của từng mức. Đa số hệ thống pilot light là đủ.\n" +
        "\n" +
        "# ĐIỀU QUAN TRỌNG NHẤT: PHẢI DIỄN TẬP. Kế hoạch DR chưa từng chạy thử\n" +
        "# thì không phải kế hoạch. Đặt lịch game day định kỳ.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'SQS + Lambda: partial batch failure',
    nodes: ['Lambda poll SQS theo lô', 'mặc định: function ném lỗi → CẢ LÔ quay lại queue', 'bật ReportBatchItemFailures', 'trả batchItemFailures (id message fail)', 'chỉ message đó quay lại, phần thành công được xoá'],
    steps: [
      { to: 1, label: 'message đã xử lý thành công bị xử lý lại — "một message xấu kéo cả lô"' },
      { to: 4, label: 'khoanh vùng thất bại xuống từng message, giữ hiệu quả batching' },
      { to: 4, label: 'visibility timeout ≥ 6× function timeout; DLQ trên QUEUE (không phải Lambda)' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Chỉ trả lại message THẤT BẠI, không trả cả lô",
      code:
        "# VẤN ĐỀ: Lambda nhận lô 10 message, message thứ 7 lỗi -> mặc định CẢ LÔ\n" +
        "# quay lại queue -> 9 message tốt bị xử lý LẠI -> trùng lặp và lãng phí.\n" +
        "\n" +
        "# GIẢI PHÁP: ReportBatchItemFailures\n" +
        "aws lambda create-event-source-mapping \\\n" +
        "  --function-name process --event-source-arn $QUEUE_ARN \\\n" +
        "  --batch-size 10 --maximum-batching-window-in-seconds 5 \\\n" +
        "  --function-response-types ReportBatchItemFailures \\\n" +
        "  --scaling-config MaximumConcurrency=50\n" +
        "# MaximumConcurrency giới hạn số Lambda chạy song song -> bảo vệ database\n" +
        "# phía sau khỏi bị hàng nghìn kết nối đập vào.\n" +
        "\n" +
        "# Handler phải TRẢ VỀ danh sách message thất bại:\n" +
        "#   exports.handler = async (event) => {\n" +
        "#     const failures = [];\n" +
        "#     for (const record of event.Records) {\n" +
        "#       try { await process(record); }\n" +
        "#       catch (e) { failures.push({ itemIdentifier: record.messageId }); }\n" +
        "#     }\n" +
        "#     return { batchItemFailures: failures };   // chỉ những cái này quay lại queue\n" +
        "#   };\n" +
        "\n" +
        "# BATCHING WINDOW: chờ gom đủ lô hoặc hết thời gian -> ít lần gọi Lambda hơn,\n" +
        "# rẻ hơn, nhưng thêm độ trễ. Với FIFO queue, lô được nhóm theo MessageGroupId.\n" +
        "\n" +
        "# LƯU Ý: visibility timeout của queue phải >= 6 LẦN timeout của Lambda\n" +
        "# (khuyến nghị của AWS) — thiếu thì message hiện lại trước khi Lambda xong.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Điều tra: metrics → traces → logs, nối bằng id chung',
    nodes: ['Metrics: "có gì đó sai" (alarm p99 tăng)', 'Traces: "ở đâu" (span PaymentService.charge timeout)', 'Logs: "tại sao" (connection pool exhausted)'],
    steps: [
      { to: 0, label: 'metric rẻ để lưu lâu, tốt cho dashboard & xu hướng' },
      { to: 1, label: 'trace khoanh vùng khâu chậm/lỗi qua các service' },
      { to: 2, label: 'Logs Insights lọc theo traceId đó → nguyên nhân gốc' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba trụ cột trả lời ba câu hỏi khác nhau",
      code:
        "# METRICS — số liệu tổng hợp theo thời gian. Trả lời \"CÓ VẤN ĐỀ KHÔNG?\"\n" +
        "#  + rẻ, lưu lâu, cảnh báo trên đó rất hiệu quả\n" +
        "#  - đã tổng hợp nên MẤT chi tiết: biết tỉ lệ lỗi 5% nhưng không biết lỗi gì\n" +
        "aws cloudwatch put-metric-alarm --alarm-name error-rate \\\n" +
        "  --metric-name Errors --namespace AWS/Lambda --statistic Sum \\\n" +
        "  --period 300 --threshold 10 --comparison-operator GreaterThanThreshold \\\n" +
        "  --evaluation-periods 2 --alarm-actions $SNS\n" +
        "\n" +
        "# LOGS — sự kiện rời rạc kèm ngữ cảnh. Trả lời \"CHUYỆN GÌ ĐÃ XẢY RA?\"\n" +
        "#  + chi tiết đầy đủ, tìm kiếm được\n" +
        "#  - đắt khi khối lượng lớn, và một mình log không cho thấy quan hệ nhân quả\n" +
        "#    giữa các dịch vụ\n" +
        "# Luôn dùng LOG CÓ CẤU TRÚC (JSON) và nhúng traceId:\n" +
        "#   {\"level\":\"ERROR\",\"traceId\":\"1-abc\",\"orderId\":\"O-1\",\"msg\":\"charge failed\"}\n" +
        "\n" +
        "# TRACES — đường đi của MỘT request qua nhiều dịch vụ.\n" +
        "# Trả lời \"THỜI GIAN/LỖI NẰM Ở ĐÂU trong chuỗi?\"\n" +
        "#  + chỉ ra chính xác dịch vụ nào chậm, gọi bao nhiêu lần\n" +
        "#  - thường chỉ lấy mẫu -> không có đủ mọi request\n" +
        "aws xray get-trace-summaries --start-time $(date -d \u002730 min ago\u0027 +%s) \\\n" +
        "  --end-time $(date +%s) --filter-expression \u0027error\u0027\n" +
        "\n" +
        "# QUY TRÌNH ĐIỀU TRA THỰC TẾ nối cả ba:\n" +
        "#  1) METRIC báo động: tỉ lệ lỗi tăng\n" +
        "#  2) TRACE chỉ ra dịch vụ nào lỗi và ở bước nào\n" +
        "#  3) LOG (lọc theo traceId lấy từ trace) cho biết lỗi CỤ THỂ là gì\n" +
        "# -> Mấu chốt để làm được điều này là traceId phải có mặt trong CẢ log lẫn trace.\n" +
        "# OpenTelemetry (qua ADOT) là cách chuẩn hoá cả ba mà không khoá vào nhà cung cấp.",
    },
  ],
},
]);
