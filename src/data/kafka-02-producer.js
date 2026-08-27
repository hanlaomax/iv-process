SS.addQuestions('kafka', [
{
  cat: 'Producer',
  q: '`acks` = 0 / 1 / all có ý nghĩa gì?',
  answer:
    '- **acks=0**: producer không chờ xác nhận, "bắn và quên". Throughput cao nhất, mất message nếu leader chưa nhận. Dùng cho metrics/log chấp nhận mất.\n' +
    '- **acks=1**: leader ghi vào log local rồi ack. Mất message nếu leader chết trước khi follower replicate.\n' +
    '- **acks=all** (`-1`): leader chờ **tất cả replica trong ISR** ghi xong mới ack. Bền nhất, latency cao hơn. Phải đi kèm `min.insync.replicas ≥ 2` mới thực sự an toàn.',
  essence:
    '`acks` là mức "đã ghi" mà producer chờ: không ai / một mình leader / cả ISR. Độ bền tỉ lệ nghịch với throughput.',
  example:
    'Giao dịch tài chính: `acks=all`, `min.insync.replicas=2`, RF=3. Clickstream analytics: `acks=1` đủ. Ping health check nội bộ: `acks=0`.',
  viz: {
    type: 'compare',
    cols: ['acks=0', 'acks=1', 'acks=all (-1)'],
    rows: [
      ['Chờ gì', 'không chờ', 'leader ghi log local', 'tất cả replica trong ISR ghi xong'],
      ['Độ bền', 'thấp — mất nếu leader chưa nhận', 'mất nếu leader chết trước khi replicate', 'cao nhất'],
      ['Throughput / latency', 'cao nhất / thấp nhất', 'trung bình', 'thấp hơn / cao hơn'],
      ['Đi kèm', '—', '—', 'min.insync.replicas ≥ 2'],
    ],
  },
},
{
  cat: 'Producer',
  q: '`min.insync.replicas` tương tác với `acks=all` như thế nào?',
  answer:
    '`min.insync.replicas` (cấu hình ở **topic/broker**) là số replica tối thiểu phải nằm trong ISR để một lần ghi `acks=all` được chấp nhận.\n\n' +
    'Nếu số replica in-sync < `min.insync.replicas`, producer `acks=all` nhận `NotEnoughReplicasException` và **không ghi được** — Kafka chọn *từ chối ghi* hơn là *ghi rủi ro mất*.\n\n' +
    '`acks=1` hoặc `acks=0` **bỏ qua** `min.insync.replicas`.',
  essence:
    'Cặp `acks=all` + `min.insync.replicas=2` là hợp đồng: "chỉ báo thành công khi dữ liệu ở ≥ 2 nơi". Nó biến sự cố replica thành lỗi ghi rõ ràng thay vì mất dữ liệu âm thầm.',
  example:
    'RF=3, `min.insync.replicas=3` → chỉ cần **một** broker bảo trì là mọi producer `acks=all` dừng ghi (availability kém). Đặt `min.insync.replicas=2` với RF=3 là cân bằng phổ biến: chịu mất 1 broker mà vẫn ghi được.',
  viz: {
    type: 'flow',
    title: 'acks=all + min.insync.replicas',
    nodes: ['producer acks=all', 'đếm replica trong ISR', '≥ min.insync.replicas?', 'ghi thành công', 'NotEnoughReplicasException'],
    steps: [
      { to: 1, label: 'broker kiểm tra ISR hiện tại của partition' },
      { to: 3, label: 'đủ → ack khi ≥ min.insync.replicas đã ghi (dữ liệu ở ≥ 2 nơi)' },
      { to: 4, label: 'thiếu → TỪ CHỐI ghi, không ghi rủi ro mất. acks=1/0 bỏ qua min.insync.replicas' },
    ],
  },
},
{
  cat: 'Producer',
  q: 'Idempotent producer là gì? Nó chống loại trùng lặp nào?',
  answer:
    'Bật `enable.idempotence=true` (mặc định từ Kafka 3.0). Producer được cấp một **PID (producer id)** và gắn **sequence number** tăng dần cho mỗi (partition). Broker nhớ sequence cuối cùng đã nhận cho mỗi (PID, partition).\n\n' +
    'Nếu producer retry (do timeout/lỗi mạng) và gửi lại batch đã ghi, broker thấy sequence trùng/thấp hơn → **bỏ qua**, chỉ ack. Không tạo bản trùng.\n\n' +
    'Kèm theo: giữ **thứ tự** kể cả khi `max.in.flight.requests.per.connection` tới 5.',
  essence:
    'Idempotence khử trùng lặp gây ra bởi **retry của chính producer** trong một session. Nó không khử trùng lặp do producer restart hay do consumer xử lý lại — đó là việc của transactions / dedup phía consumer.',
  example:
    'Mạng chập chờn: producer gửi batch, broker ghi xong nhưng ack bị mất → producer retry. Không idempotence: message xuất hiện 2 lần. Có idempotence: broker nhận ra sequence đã thấy, chỉ ack lại, log sạch.',
  viz: {
    type: 'flow',
    title: 'Idempotent producer khử trùng do retry',
    nodes: ['producer nhận PID', 'gắn sequence number / partition', 'broker nhớ sequence cuối', 'ack bị mất → producer retry', 'broker thấy sequence trùng → bỏ qua'],
    steps: [
      { to: 1, label: 'mỗi (PID, partition) có sequence tăng dần' },
      { to: 2, label: 'broker lưu sequence cuối cùng đã nhận' },
      { to: 4, label: 'batch gửi lại có sequence trùng/thấp hơn → broker chỉ ack lại, không tạo bản trùng' },
      { to: 4, label: 'chỉ khử trùng do retry TRONG một session — không khử producer restart hay xử lý lại phía consumer' },
    ],
  },
},
{
  cat: 'Producer',
  q: '`linger.ms` và `batch.size` ảnh hưởng gì tới throughput?',
  answer:
    'Producer gom message theo (topic, partition) vào **batch**. Gửi khi: batch đầy `batch.size` (byte), HOẶC đã chờ `linger.ms`.\n\n' +
    '- `linger.ms=0` (mặc định): gửi ngay khi có thể → latency thấp, batch nhỏ, nhiều request.\n' +
    '- `linger.ms=5–100`: chờ chút để gom batch lớn hơn → ít request, nén tốt hơn, throughput cao hơn, đổi lấy vài ms latency.\n' +
    '- `batch.size` lớn hơn cho phép batch to hơn (nếu đủ dữ liệu).',
  essence:
    'Batching đánh đổi latency lấy throughput và hiệu quả nén/mạng. `linger.ms` là "độ kiên nhẫn chờ gom hàng" trước khi gửi.',
  example:
    'Pipeline ingest 500k msg/s: `linger.ms=20`, `batch.size=64KB`, `compression.type=lz4` → giảm số request xuống nhiều lần, băng thông mạng giảm ~4x nhờ nén trên batch lớn. Với lệnh trading nhạy latency thì để `linger.ms=0`.',
  viz: {
    type: 'compare',
    cols: ['linger.ms = 0 (mặc định)', 'linger.ms = 5–100'],
    rows: [
      ['Gửi khi', 'ngay khi có thể', 'chờ gom batch hoặc đầy batch.size'],
      ['Latency', 'thấp', '+vài ms'],
      ['Số request', 'nhiều', 'ít'],
      ['Nén / băng thông', 'kém (batch nhỏ)', 'tốt (batch lớn)'],
      ['Dùng cho', 'trading, lệnh nhạy latency', 'pipeline ingest throughput cao'],
    ],
  },
},
{
  cat: 'Producer',
  q: 'Các thuật toán nén (compression.type) — chọn cái nào?',
  answer:
    'Nén áp dụng trên **cả batch** (nhiều message) → tỉ lệ nén tốt hơn nén từng message.\n' +
    '- **none**: không nén.\n' +
    '- **gzip**: nén cao nhất, tốn CPU nhất.\n' +
    '- **snappy**: nhanh, tỉ lệ vừa — cân bằng phổ biến.\n' +
    '- **lz4**: rất nhanh, tỉ lệ tốt — thường được khuyến nghị.\n' +
    '- **zstd**: tỉ lệ gần gzip nhưng nhanh hơn nhiều, tuning được level — lựa chọn hiện đại nếu client/broker đủ mới.\n\n' +
    'Broker lưu nguyên batch đã nén; consumer giải nén. Nếu `compression.type` ở topic khác producer, broker phải nén lại (tốn CPU).',
  essence:
    'Nén giảm chi phí mạng + đĩa + tăng throughput hiệu dụng, đổi lấy CPU. lz4/zstd là điểm cân bằng tốt cho hầu hết workload.',
  example:
    'Message JSON lặp lại nhiều (log): `zstd` giảm ~5–8x dung lượng, tiết kiệm chi phí lưu trữ và inter-broker replication. Giữ `compression.type` nhất quán giữa producer và topic để broker không phải giải-nén-nén-lại.',
  viz: {
    type: 'compare',
    cols: ['gzip', 'snappy', 'lz4', 'zstd'],
    rows: [
      ['Tỉ lệ nén', 'cao nhất', 'vừa', 'tốt', 'gần gzip'],
      ['CPU', 'tốn nhất', 'nhẹ', 'rất nhẹ', 'nhẹ, tune level được'],
      ['Khuyến nghị', 'khi cần nén tối đa', 'cân bằng cũ', 'mặc định tốt', 'hiện đại (client/broker đủ mới)'],
    ],
  },
},
{
  cat: 'Producer',
  q: 'Partitioner mặc định hoạt động thế nào? Khi nào viết custom?',
  answer:
    '- **Có key**: `partition = murmur2(key) % numPartitions` → cùng key luôn cùng partition (miễn số partition không đổi).\n' +
    '- **Key null**: từ Kafka 2.4+ dùng **sticky partitioner** — dồn vào một partition cho tới khi batch đầy/gửi, rồi đổi partition khác. Giảm số batch nhỏ, tăng throughput; vẫn phân phối đều theo thời gian.\n\n' +
    'Custom partitioner khi: muốn định tuyến theo một phần của value, cân bằng tải theo trọng số, hoặc cách ly "khách hàng nóng" sang partition riêng.',
  essence:
    'Partitioner là hàm ánh xạ message → partition. Mặc định: hash(key) cho tính thứ tự, sticky cho hiệu năng khi không key. Custom chỉ khi có yêu cầu định tuyến đặc thù.',
  example:
    'Multi-tenant: tenant lớn chiếm 80% lưu lượng làm lệch partition. Custom partitioner map tenant lớn sang một dải partition riêng, tenant nhỏ hash bình thường → cân bằng tải consumer.',
  viz: {
    type: 'compare',
    cols: ['Có key', 'Key null (sticky, 2.4+)', 'Custom partitioner'],
    rows: [
      ['Cách chọn partition', 'murmur2(key) % N', 'dồn 1 partition tới khi batch gửi, rồi đổi', 'logic của bạn'],
      ['Thứ tự cho 1 thực thể', 'giữ', 'không', 'tuỳ'],
      ['Dùng khi', 'phần lớn trường hợp', 'sự kiện độc lập, tối ưu batch', 'định tuyến theo value, cách ly "khách nóng"'],
    ],
  },
},
{
  cat: 'Producer',
  q: '`buffer.memory`, `max.block.ms` và backpressure ở producer?',
  answer:
    'Producer `send()` là **bất đồng bộ**: message được đưa vào **buffer** (`buffer.memory`, mặc định 32MB) và một I/O thread nền gửi đi.\n\n' +
    'Nếu broker chậm/không phản hồi, buffer đầy. Khi đó `send()` **block** tối đa `max.block.ms` (mặc định 60s); hết thời gian → ném `TimeoutException`.\n\n' +
    'Đây là cơ chế backpressure: khi hạ nguồn không theo kịp, producer chậm lại thay vì phình bộ nhớ vô hạn.',
  essence:
    '`send()` nhanh vì chỉ enqueue; buffer đầy là tín hiệu Kafka đang là nút cổ chai. `max.block.ms` quyết định producer "chờ" hay "bỏ" khi nghẽn.',
  example:
    'Broker gặp sự cố 2 phút: với `max.block.ms=60000`, sau 60s các lời gọi `send()` bắt đầu ném timeout → ứng dụng biết để trả 503 hoặc ghi ra fallback (local disk/outbox) thay vì OOM vì buffer.',
  viz: {
    type: 'flow',
    title: 'Backpressure ở producer',
    nodes: ['send() enqueue', 'buffer.memory (32MB)', 'I/O thread nền gửi', 'broker chậm → buffer đầy', 'send() block max.block.ms', 'TimeoutException'],
    steps: [
      { to: 0, label: 'send() bất đồng bộ — chỉ đưa vào buffer, trả về ngay' },
      { to: 2, label: 'một I/O thread nền gửi batch đi' },
      { to: 3, label: 'hạ nguồn không kịp → buffer đầy' },
      { to: 4, label: 'send() block tối đa max.block.ms (60s) — producer chậm lại thay vì phình bộ nhớ' },
      { to: 5, label: 'hết thời gian → TimeoutException; app trả 503 / ghi outbox' },
    ],
  },
},
{
  cat: 'Producer',
  q: '`retries`, `delivery.timeout.ms` và `max.in.flight` ảnh hưởng thứ tự thế nào?',
  answer:
    '- `retries` (mặc định `Integer.MAX_VALUE`): số lần thử lại lỗi tạm thời.\n' +
    '- `delivery.timeout.ms` (mặc định 120s): **trần thời gian tổng** từ `send()` tới khi thành công/thất bại, bao trùm mọi retry. Đây là tham số nên chỉnh, không phải `retries`.\n' +
    '- `max.in.flight.requests.per.connection`: số request chưa được ack cùng lúc trên một connection.\n\n' +
    'Không idempotence + `max.in.flight > 1` + retry → request 2 có thể ghi trước request 1 khi request 1 bị retry ⇒ **đảo thứ tự**. Bật `enable.idempotence=true` cho phép `max.in.flight ≤ 5` mà vẫn giữ thứ tự.',
  essence:
    'Điều khiển retry bằng `delivery.timeout.ms` (thời gian), không phải `retries` (số lần). Idempotence là cách giữ throughput cao (in-flight > 1) mà không hy sinh thứ tự.',
  example:
    'Cần giữ thứ tự sự kiện tài khoản: `enable.idempotence=true`, `acks=all`, `max.in.flight=5`, `delivery.timeout.ms=120000`. Không bật idempotence thì phải ép `max.in.flight=1` → chậm hơn nhiều.',
  viz: {
    type: 'compare',
    cols: ['retries', 'delivery.timeout.ms', 'max.in.flight'],
    rows: [
      ['Là gì', 'số lần thử lại (mặc định MAX_VALUE)', 'trần thời gian TỔNG từ send() (mặc định 120s)', 'request chưa ack cùng lúc / connection'],
      ['Nên chỉnh', 'không — dùng cái bên phải', 'CÓ — điều khiển retry bằng thời gian', 'giữ ≤ 5 khi có idempotence'],
      ['Ảnh hưởng thứ tự', '—', '—', '>1 + retry không idempotence → đảo thứ tự'],
    ],
  },
},
{
  cat: 'Producer',
  q: 'KafkaProducer có thread-safe không? Nên tạo bao nhiêu instance?',
  answer:
    '`KafkaProducer` **thread-safe** và được thiết kế để **dùng chung giữa nhiều thread**. Tạo một instance (hoặc một pool nhỏ) cho toàn ứng dụng và tái sử dụng.\n\n' +
    'Nó nặng: mở connection tới broker, có buffer, I/O thread, metadata cache. Tạo/đóng producer cho mỗi message là phản mẫu nghiêm trọng (tốn kết nối, mất batching, mất idempotence sequence).\n\n' +
    'Nhớ `close()` (hoặc `flush()` trước khi shutdown) để gửi hết buffer.',
  essence:
    'Producer là tài nguyên dài hạn, chia sẻ, thread-safe — giống connection pool. Vòng đời của nó nên bằng vòng đời ứng dụng.',
  example:
    'Trong Spring, `KafkaTemplate` bọc một `ProducerFactory` singleton → một producer dùng chung. Anti-pattern: `new KafkaProducer(props)` trong mỗi request handler → sau vài phút hết file descriptor.',
  viz: {
    type: 'tree',
    title: 'KafkaProducer — tài nguyên dài hạn, chia sẻ',
    root: {
      label: 'Thread-safe; vòng đời = vòng đời ứng dụng (như connection pool)',
      children: [
        { label: 'Tạo 1 instance (hoặc pool nhỏ), dùng chung nhiều thread' },
        { label: 'Nặng: connection, buffer, I/O thread, metadata cache' },
        { label: 'Anti-pattern: new mỗi message → hết FD, mất batching, mất idempotence sequence' },
        { label: 'Shutdown: flush() / close() để gửi hết buffer' },
      ],
    },
  },
},
{
  cat: 'Producer',
  q: 'Xử lý lỗi gửi message thế nào (callback, exception)?',
  answer:
    '`producer.send(record, (metadata, exception) -> { ... })` — callback chạy trên I/O thread khi có kết quả.\n\n' +
    'Phân loại lỗi:\n' +
    '- **Retriable** (`NotLeaderForPartition`, `NotEnoughReplicas`, timeout mạng): producer tự retry tới `delivery.timeout.ms`.\n' +
    '- **Non-retriable** (`RecordTooLargeException`, `SerializationException`, `AuthorizationException`): fail ngay, callback nhận exception.\n\n' +
    'Chiến lược khi fail hẳn: ghi vào **dead-letter** (topic khác / DB / file), tăng metric cảnh báo, không nuốt lỗi im lặng.',
  essence:
    'Callback là nơi bạn quyết định số phận message không gửi được. Kafka lo retry lỗi tạm thời; bạn lo lỗi vĩnh viễn (dữ liệu xấu, quá lớn, không có quyền).',
  example:
    '`onCompletion`: nếu `exception instanceof RecordTooLargeException` → log + đẩy sang `orders.dlq` kèm lý do; nếu timeout sau 2 phút retry → alert on-call vì Kafka có thể đang down.',
  viz: {
    type: 'tree',
    title: 'Xử lý lỗi gửi trong callback',
    root: {
      label: 'send(record, (metadata, exception) -> ...)',
      children: [
        { label: 'Retriable', note: 'NotLeaderForPartition, NotEnoughReplicas, timeout mạng — producer tự retry tới delivery.timeout.ms' },
        { label: 'Non-retriable', note: 'RecordTooLarge, SerializationException, AuthorizationException — fail ngay' },
        { label: 'Khi fail hẳn', note: 'ghi dead-letter (topic/DB/file) + tăng metric + alert; không nuốt lỗi' },
      ],
    },
  },
},
{
  cat: 'Producer',
  q: 'Producer transactions (`transactional.id`) dùng để làm gì?',
  answer:
    'Bật `enable.idempotence=true` + đặt `transactional.id` (ổn định cho mỗi instance logic). Cho phép:\n' +
    '- Ghi **nhiều message vào nhiều partition/topic một cách nguyên tử** — hoặc tất cả xuất hiện, hoặc không cái nào.\n' +
    '- Ghi message + **commit offset consumer** trong cùng transaction (`sendOffsetsToTransaction`) → nền tảng exactly-once cho pipeline consume-transform-produce.\n\n' +
    'API: `initTransactions()`, `beginTransaction()`, `send(...)`, `commitTransaction()` / `abortTransaction()`.\n\n' +
    'Consumer phải đặt `isolation.level=read_committed` để không thấy message của transaction bị abort / chưa commit.',
  essence:
    'Transaction nâng idempotence (một partition) lên nguyên tử đa partition + gắn kết offset. Là mảnh ghép để "đọc–xử lý–ghi" không tạo trùng/mất khi lỗi.',
  example:
    'Service tính phí: đọc `payments`, ghi `ledger-entries` (2 partition) + `notifications`, rồi commit offset `payments` — tất cả trong một transaction. Crash giữa chừng → abort, không có ledger entry mồ côi, offset không tiến.',
  viz: {
    type: 'flow',
    title: 'Producer transaction (consume–transform–produce)',
    nodes: ['initTransactions()', 'beginTransaction()', 'send() nhiều topic/partition', 'sendOffsetsToTransaction()', 'commit / abort'],
    steps: [
      { to: 1, label: 'cần enable.idempotence + transactional.id ổn định' },
      { to: 2, label: 'ghi ledger-entries (2 partition) + notifications' },
      { to: 3, label: 'gắn commit offset consumer vào cùng transaction' },
      { to: 4, label: 'commit → tất cả xuất hiện; abort → không cái nào. Consumer đặt isolation.level=read_committed' },
    ],
  },
},
{
  cat: 'Serialization',
  q: 'Schema Registry là gì? Avro, JSON Schema, Protobuf khác nhau thế nào?',
  answer:
    'Message trong Kafka chỉ là byte. **Schema Registry** (Confluent/Apicurio) lưu schema tập trung, gán **schema id**; producer serialize theo schema và nhúng id vào message, consumer lấy schema theo id để deserialize.\n\n' +
    '- **Avro**: nhỏ gọn, schema tách rời, hỗ trợ evolution mạnh, phổ biến nhất trong hệ Kafka.\n' +
    '- **Protobuf**: nhỏ gọn, đa ngôn ngữ tốt, có sẵn nếu bạn đã dùng gRPC.\n' +
    '- **JSON Schema**: người đọc được, dễ debug, nhưng cồng kềnh hơn.\n\n' +
    'Registry kiểm tra **compatibility** (backward/forward/full) khi đăng ký schema mới → chặn thay đổi phá vỡ consumer.',
  essence:
    'Schema Registry biến "hợp đồng dữ liệu" thành thứ được version hoá và kiểm tra tự động, thay vì thoả thuận ngầm dễ vỡ. Avro là mặc định thực tế cho Kafka.',
  example:
    'Thêm field `discount` (có default) vào `Order` Avro với chế độ BACKWARD → consumer cũ vẫn đọc được message mới (bỏ qua field lạ), producer mới không phá ai. Đổi kiểu `amount` từ int sang string → registry từ chối đăng ký.',
  viz: {
    type: 'compare',
    cols: ['Avro', 'Protobuf', 'JSON Schema'],
    rows: [
      ['Kích thước', 'nhỏ gọn', 'nhỏ gọn', 'cồng kềnh'],
      ['Đọc được bằng mắt', 'không', 'không', 'có'],
      ['Evolution', 'mạnh, phổ biến nhất trong Kafka', 'tốt, đa ngôn ngữ', 'có nhưng nặng hơn'],
      ['Hợp khi', 'mặc định hệ Kafka', 'đã dùng gRPC', 'cần debug dễ'],
    ],
  },
},
{
  cat: 'Producer',
  q: 'Message headers trong Kafka dùng để làm gì?',
  answer:
    'Ngoài key và value, mỗi record có **headers** — danh sách cặp `(String, byte[])`. Không ảnh hưởng partitioning hay compaction.\n\n' +
    'Dùng cho **metadata kỹ thuật** tách khỏi payload nghiệp vụ:\n' +
    '- Trace context (`traceparent`, `X-B3-TraceId`) cho distributed tracing.\n' +
    '- `event-type`, `schema-version`, `content-type`.\n' +
    '- `source-service`, `correlation-id`, `retry-count`.\n\n' +
    'Consumer/interceptor đọc header mà không cần parse value.',
  essence:
    'Headers là "phong bì" cho metadata truyền tải; value là "lá thư" cho dữ liệu nghiệp vụ. Giữ hai thứ tách biệt giúp routing/observability không phụ thuộc schema payload.',
  example:
    'Framework retry: mỗi lần đưa message sang retry topic, tăng header `retry-count`. Consumer đọc header, nếu ≥ 3 thì chuyển thẳng DLQ. Tracing: propagate `traceparent` qua header để nối span producer → consumer.',
  viz: {
    type: 'tree',
    title: 'Headers = "phong bì" cho metadata (không ảnh hưởng partition/compaction)',
    root: {
      label: 'List (String, byte[]) — tách khỏi payload nghiệp vụ',
      children: [
        { label: 'Trace context', note: 'traceparent, X-B3-TraceId — nối span producer → consumer' },
        { label: 'event-type, schema-version, content-type' },
        { label: 'source-service, correlation-id, retry-count', note: 'framework retry: ≥ 3 → DLQ' },
      ],
    },
  },
},
{
  cat: 'Producer',
  q: 'Xử lý message quá lớn (large message) thế nào?',
  answer:
    'Giới hạn liên quan: `message.max.bytes` (broker), `max.request.size` (producer, mặc định 1MB), `max.partition.fetch.bytes` / `fetch.max.bytes` (consumer). Message vượt → `RecordTooLargeException`.\n\n' +
    'Lựa chọn:\n' +
    '- **Claim-check pattern**: lưu payload lớn vào object storage (S3), chỉ gửi **URL/khoá** qua Kafka.\n' +
    '- Chia nhỏ (chunking) rồi ghép lại — phức tạp, dễ lỗi.\n' +
    '- Tăng các limit (đồng bộ ở cả 3 nơi) — chỉ khi payload lớn là ngoại lệ, vì message lớn hại throughput, page cache, GC.',
  essence:
    'Kafka tối ưu cho nhiều message nhỏ. Payload lớn nên đi qua object storage, Kafka chỉ mang "tham chiếu" — vừa nhẹ vừa không đụng giới hạn.',
  example:
    'Sự kiện "đã tải lên video 500MB": ghi video lên S3, phát message `{ "videoId": "...", "s3Key": "...", "size": 500000000 }` vào topic `media-uploaded`. Consumer tải từ S3 khi cần.',
  viz: {
    type: 'tree',
    title: 'Message quá lớn (RecordTooLargeException)',
    root: {
      label: 'Kafka tối ưu cho nhiều message nhỏ',
      children: [
        { label: 'Claim-check pattern', note: 'payload lớn → S3, Kafka chỉ mang URL/khoá — khuyến nghị' },
        { label: 'Chunking', note: 'chia nhỏ rồi ghép — phức tạp, dễ lỗi' },
        { label: 'Tăng limit', note: 'message.max.bytes + max.request.size + fetch limits — đồng bộ 3 nơi; chỉ khi là ngoại lệ' },
      ],
    },
  },
},
{
  cat: 'Producer',
  q: 'Những metric quan trọng của producer cần theo dõi?',
  answer:
    '- `record-error-rate` / `record-retry-rate`: lỗi và retry tăng → broker/mạng có vấn đề.\n' +
    '- `request-latency-avg` / `-max`: độ trễ round-trip tới broker.\n' +
    '- `batch-size-avg`, `records-per-request-avg`: batch có hiệu quả không (quá nhỏ → tăng `linger.ms`).\n' +
    '- `buffer-available-bytes`: gần 0 → backpressure, hạ nguồn nghẽn.\n' +
    '- `compression-rate-avg`: hiệu quả nén.\n' +
    '- `record-send-rate` (throughput).',
  essence:
    'Theo dõi ba nhóm: lỗi/retry (sức khoẻ), latency (hiệu năng), buffer (backpressure). Buffer cạn + latency tăng là dấu hiệu sớm của sự cố broker.',
  example:
    'Alert: `buffer-available-bytes` < 10% trong 1 phút → producer sắp bắt đầu block. Kết hợp với `request-latency-max` tăng vọt → khả năng cao một broker giữ leader đang quá tải hoặc chết.',
  viz: {
    type: 'tree',
    title: 'Metric producer — theo dõi 3 nhóm',
    root: {
      label: 'Buffer cạn + latency tăng = dấu hiệu sớm sự cố broker',
      children: [
        { label: 'Lỗi / retry (sức khoẻ)', note: 'record-error-rate, record-retry-rate' },
        { label: 'Latency (hiệu năng)', note: 'request-latency-avg / -max' },
        { label: 'Buffer (backpressure)', note: 'buffer-available-bytes gần 0 → hạ nguồn nghẽn' },
        { label: 'Batch', note: 'batch-size-avg quá nhỏ → tăng linger.ms' },
      ],
    },
  },
},
{
  cat: 'Producer',
  q: 'Producer nên xử lý thế nào khi cụm Kafka tạm thời không khả dụng?',
  answer:
    'Mặc định producer khá bền: retry lỗi tạm thời tới `delivery.timeout.ms`, buffer giữ message, `send()` block khi buffer đầy tới `max.block.ms`.\n\n' +
    'Chiến lược ứng dụng:\n' +
    '- **Fallback outbox**: nếu `send()` fail hẳn, ghi message vào DB/local disk; một job nền gửi lại khi Kafka hồi.\n' +
    '- **Circuit breaker** quanh producer để trả lỗi nhanh cho client thay vì treo.\n' +
    '- Không nuốt exception trong callback; tăng metric + alert.',
  essence:
    'Kafka down ngắn thì cấu hình producer tự chịu. Kafka down lâu cần đường thoát (outbox/disk) để không mất sự kiện và không kéo sập service gọi nó.',
  example:
    'Checkout service: nếu phát `OrderPlaced` fail sau khi đã retry hết, ghi vào bảng `outbox` cùng transaction với đơn hàng. Debezium/CDC hoặc scheduler đọc `outbox` publish lại → không mất sự kiện dù Kafka chết 10 phút.',
  viz: {
    type: 'flow',
    title: 'Kafka tạm không khả dụng',
    nodes: ['send()', 'retry tới delivery.timeout.ms', 'buffer giữ + block max.block.ms', 'fail hẳn → ghi outbox (DB/disk)', 'job nền gửi lại khi Kafka hồi'],
    steps: [
      { to: 1, label: 'producer tự chịu down ngắn: retry lỗi tạm thời' },
      { to: 3, label: 'down lâu → cần đường thoát: ghi message vào bảng outbox cùng transaction nghiệp vụ' },
      { to: 4, label: 'CDC/scheduler đọc outbox publish lại — không mất sự kiện, không kéo sập service' },
    ],
  },
},
{
  cat: 'Producer',
  q: 'Gửi message tới một partition cụ thể — nên hay không?',
  answer:
    '`new ProducerRecord<>(topic, partitionNumber, key, value)` chỉ định partition trực tiếp, bỏ qua partitioner.\n\n' +
    'Hiếm khi nên: nó **hard-code** giả định về số partition; nếu topic tăng partition, logic của bạn sai. Cũng dễ gây lệch tải.\n\n' +
    'Hợp lý khi: bạn cần kiểm soát tuyệt đối phân bổ (ví dụ mỗi consumer instance sở hữu đúng một partition theo cấu hình tĩnh), hoặc migration dữ liệu.',
  essence:
    'Để partitioner làm việc theo key trong đa số trường hợp. Chỉ định partition thủ công là gắn ứng dụng vào layout vật lý của topic — dễ vỡ khi topic thay đổi.',
  example:
    'Đúng cách: key = `orderId`, partitioner tự lo. Sai cách: `partition = orderId.hashCode() % 6` trong code producer — ngày topic lên 12 partition, dữ liệu cũ và mới của cùng order rơi hai partition, vỡ thứ tự.',
  viz: {
    type: 'compare',
    cols: ['Để partitioner làm việc theo key', 'Chỉ định partition thủ công'],
    rows: [
      ['Cách', 'key = orderId, partitioner tự lo', 'new ProducerRecord(topic, partitionNumber, ...)'],
      ['Khi topic tăng partition', 'vẫn đúng (chấp nhận key→partition đổi cho dữ liệu mới)', 'logic sai, dữ liệu cùng thực thể rơi 2 partition'],
      ['Hợp lý khi', 'đa số trường hợp', 'kiểm soát tuyệt đối / migration'],
    ],
  },
},
{
  cat: 'Producer',
  q: 'Tinh chỉnh producer cho throughput cao gồm những gì?',
  answer:
    '- `batch.size` lớn hơn (64–256KB) + `linger.ms` 10–100ms → batch to.\n' +
    '- `compression.type=lz4` hoặc `zstd`.\n' +
    '- `acks=1` nếu nghiệp vụ cho phép (hoặc `all` + chấp nhận latency).\n' +
    '- `buffer.memory` đủ lớn để hấp thụ spike.\n' +
    '- `enable.idempotence=true` (cho phép in-flight 5 mà vẫn an toàn).\n' +
    '- Đủ partition để song song.\n' +
    '- Dùng chung một producer instance, nhiều thread.',
  essence:
    'Throughput cao = batch lớn + nén + đủ partition + đừng chờ nhiều hơn mức cần (`acks`). Đo `batch-size-avg` để biết linger có tác dụng không.',
  example:
    'Ingest log 1M msg/s: `batch.size=131072`, `linger.ms=25`, `compression.type=zstd`, `acks=1`, 48 partition, một producer chia sẻ giữa 8 thread → đạt mục tiêu với ~4 broker.',
  viz: {
    type: 'tree',
    title: 'Tinh chỉnh producer cho throughput cao',
    root: {
      label: 'batch lớn + nén + đủ partition + đừng chờ hơn mức cần',
      children: [
        { label: 'batch.size 64–256KB + linger.ms 10–100ms' },
        { label: 'compression.type = lz4 / zstd' },
        { label: 'acks=1 nếu nghiệp vụ cho phép' },
        { label: 'enable.idempotence=true', note: 'in-flight 5 mà vẫn an toàn' },
        { label: 'đủ partition + 1 producer chia sẻ nhiều thread' },
      ],
    },
  },
},
{
  cat: 'Producer',
  q: '`flush()` và `close()` của producer — khi nào gọi, khác nhau gì?',
  answer:
    '`flush()`: chặn cho tới khi **mọi record đang trong buffer** được gửi và ack (hoặc fail). Producer vẫn dùng tiếp được sau đó. Dùng khi cần "đảm bảo mọi thứ đã đi" tại một checkpoint.\n\n' +
    '`close()` (hoặc `close(Duration)`): flush hết buffer rồi **giải phóng tài nguyên** (connection, I/O thread, metrics). Sau `close()` producer không dùng lại được. `close(Duration.ZERO)` = bỏ luôn record chưa gửi.\n\n' +
    'Quên `close()`/`flush()` khi shutdown → mất các record cuối còn nằm trong buffer.',
  essence:
    '`flush` = "gửi hết ngay bây giờ, tôi còn dùng tiếp". `close` = "gửi hết rồi dọn dẹp, tôi xong việc". Shutdown hook phải gọi một trong hai.',
  example:
    'Batch job phát 1 triệu event rồi thoát: cuối vòng lặp gọi `producer.flush()` rồi `producer.close()`. Không có → JVM exit khi buffer còn ~vài nghìn record chưa gửi → mất dữ liệu âm thầm, không lỗi.',
  viz: {
    type: 'compare',
    cols: ['flush()', 'close()'],
    rows: [
      ['Làm gì', 'chặn tới khi mọi record trong buffer được gửi + ack', 'flush hết rồi giải phóng tài nguyên'],
      ['Dùng lại được sau đó', 'có', 'không'],
      ['Dùng khi', 'checkpoint: "đảm bảo mọi thứ đã đi"', 'shutdown: "xong việc"'],
      ['Bỏ record chưa gửi', '—', 'close(Duration.ZERO)'],
    ],
  },
},
{
  cat: 'Producer',
  q: 'Điều gì xảy ra khi producer gửi message với key = null?',
  answer:
    'Key null hợp lệ. Hệ quả:\n' +
    '- **Partitioning**: dùng sticky partitioner (Kafka 2.4+) — dồn message vào một partition cho tới khi batch được gửi, rồi chuyển partition khác. Phân phối đều theo thời gian nhưng **không** đảm bảo message liên tiếp cùng partition.\n' +
    '- **Compaction**: message key null bị **loại bỏ** khi compaction chạy (không có key để giữ "bản mới nhất").\n\n' +
    'Không có key ⇒ không có bảo đảm thứ tự cho một thực thể logic.',
  essence:
    'Key null = "không quan tâm thứ tự, không compaction". Chỉ dùng cho sự kiện độc lập (log dòng, metric điểm) nơi mỗi message tự đứng một mình.',
  example:
    'Topic `app-logs` (cleanup.policy=delete): key null ổn, chỉ cần đổ đều và xoá theo thời gian. Topic `device-state` (compact): key null là sai — message sẽ bị compaction xoá, mất trạng thái.',
  viz: {
    type: 'tree',
    title: 'key = null',
    root: {
      label: '"không quan tâm thứ tự, không compaction"',
      children: [
        { label: 'Partitioning', note: 'sticky partitioner — dồn 1 partition tới khi batch gửi rồi đổi' },
        { label: 'Compaction', note: 'message key null bị LOẠI BỎ (không có key để giữ "bản mới nhất")' },
        { label: 'Chỉ dùng cho', note: 'sự kiện độc lập: log dòng, metric điểm' },
      ],
    },
  },
},
]);
