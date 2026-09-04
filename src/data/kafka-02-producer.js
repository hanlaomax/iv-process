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
  demo: [
    {
      lang: "properties",
      title: "Ba mức đánh đổi giữa độ bền và độ trễ",
      code:
        "# acks=0 — gửi rồi quên. Không chờ phản hồi nào.\n" +
        "#   nhanh nhất, nhưng broker chết là mất sạch mà producer KHÔNG HỀ BIẾT.\n" +
        "#   Chỉ dùng cho metric/log chấp nhận mất.\n" +
        "acks=0\n" +
        "\n" +
        "# acks=1 — chờ LEADER ghi xong. Không chờ follower.\n" +
        "#   Mất dữ liệu khi: leader ack xong rồi chết TRƯỚC khi follower kịp sao chép.\n" +
        "#   Đây là cửa sổ mất mát nhỏ nhưng có thật.\n" +
        "acks=1\n" +
        "\n" +
        "# acks=all (= -1) — chờ mọi replica TRONG ISR ghi xong.\n" +
        "#   MẶC ĐỊNH từ Kafka 3.0. Không mất dữ liệu miễn còn một replica trong ISR sống.\n" +
        "acks=all\n" +
        "min.insync.replicas=2       # đặt Ở TOPIC, xem câu sau — thiếu nó thì acks=all vô nghĩa\n" +
        "\n" +
        "# Chi phí: acks=all thêm một vòng nhân bản vào độ trễ (thường +2..10ms trong\n" +
        "# cùng vùng). Với idempotence + batch tốt, throughput giảm ít hơn nhiều so với\n" +
        "# cảm giác — đừng đánh đổi độ bền lấy độ trễ khi chưa đo.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Hai tham số phải đi cùng nhau mới có tác dụng",
      code:
        "# acks=all nghĩa là \"chờ mọi replica TRONG ISR\". Nhưng nếu ISR co lại còn 1\n" +
        "# (hai follower chết), thì \"mọi ISR\" = một mình leader -> acks=all trở nên\n" +
        "# vô nghĩa mà không báo lỗi gì. min.insync.replicas là chốt chặn cho việc đó.\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name orders \\\n" +
        "  --add-config min.insync.replicas=2\n" +
        "\n" +
        "# Với RF=3, min.insync.replicas=2, acks=all:\n" +
        "#   ISR = 3 -> ghi bình thường, chịu được mất 1 broker\n" +
        "#   ISR = 2 -> vẫn ghi được (đúng ngưỡng)\n" +
        "#   ISR = 1 -> producer nhận NotEnoughReplicasException, TỪ CHỐI ghi\n" +
        "# Từ chối ghi là ĐÚNG: thà dừng còn hơn ghi vào chỗ sắp mất.\n" +
        "\n" +
        "# BẪY: RF=3 + min.insync.replicas=3 -> mất một broker là topic ngừng ghi hoàn toàn.\n" +
        "# Luôn để min.insync.replicas = RF - 1.\n" +
        "\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --describe \\\n" +
        "  --entity-type topics --entity-name orders",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Chống trùng do RETRY, không chống trùng do gửi lại từ ứng dụng",
      code:
        "Properties p = new Properties();\n" +
        "p.put(\"enable.idempotence\", \"true\");    // MẶC ĐỊNH true từ Kafka 3.0\n" +
        "// Bật cái này thì Kafka tự ép: acks=all, retries=Integer.MAX_VALUE,\n" +
        "// max.in.flight.requests.per.connection <= 5. Đặt ngược lại -> ConfigException.\n" +
        "\n" +
        "// CƠ CHẾ: producer được cấp một PID (producer id), mỗi partition có một\n" +
        "// sequence number tăng dần. Broker nhớ sequence cuối cùng của mỗi (PID, partition):\n" +
        "//   seq = lastSeq + 1 -> ghi bình thường\n" +
        "//   seq <= lastSeq     -> ĐÃ GHI RỒI, bỏ qua và trả về ack thành công (dedup)\n" +
        "//   seq >  lastSeq + 1 -> thủng lỗ -> OutOfOrderSequenceException\n" +
        "\n" +
        "// Trước khi có idempotence: ack bị mất trên đường về -> producer retry\n" +
        "// -> message vào log HAI LẦN. Đây là nguồn trùng lặp phổ biến nhất.\n" +
        "\n" +
        "// GIỚI HẠN QUAN TRỌNG: chỉ khử trùng trong PHIÊN của một producer.\n" +
        "producer.send(record);      // ứng dụng crash rồi khởi động lại\n" +
        "producer.send(record);      // PID mới -> Kafka coi là message MỚI, KHÔNG khử được\n" +
        "// Muốn chống cả trường hợp đó -> transaction hoặc khoá idempotency ở tầng nghiệp vụ.",
    },
  ],
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
  demo: [
    {
      lang: "properties",
      title: "Đổi một chút độ trễ lấy rất nhiều throughput",
      code:
        "# Producer gom record thành BATCH theo từng partition. Batch được gửi khi\n" +
        "# ĐẦY (batch.size) HOẶC HẾT GIỜ CHỜ (linger.ms) — cái nào tới trước.\n" +
        "batch.size=32768        # byte, mặc định 16384. Là TRẦN của một batch, không phải mục tiêu\n" +
        "linger.ms=10            # mặc định 0 = gửi ngay, gần như không gom được gì\n" +
        "\n" +
        "# linger.ms=0 nghĩa là mỗi record một request khi tải nhẹ -> tốn overhead khủng khiếp.\n" +
        "# Chỉ cần đặt 5-20ms là batch đầy lên rõ rệt: ít request hơn, nén hiệu quả hơn\n" +
        "# (nén cả batch), CPU broker nhẹ hơn. Throughput thường tăng vài lần.\n" +
        "\n" +
        "# Nén chỉ thật sự hiệu quả khi batch đủ lớn — nén 1 record thì gần như vô ích.\n" +
        "compression.type=lz4\n" +
        "\n" +
        "# Chỉnh thế nào:\n" +
        "#  - cần độ trễ thấp nhất (giao dịch) -> linger.ms=0..5\n" +
        "#  - throughput cao (log, CDC, ETL)   -> linger.ms=50..100, batch.size=128KB\n" +
        "# Theo dõi batch-size-avg và records-per-request-avg: batch trung bình còn\n" +
        "# nhỏ hơn nhiều so với batch.size nghĩa là linger.ms đang quá ngắn.",
    },
  ],
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
  demo: [
    {
      lang: "properties",
      title: "Bốn lựa chọn và tiêu chí chọn",
      code:
        "compression.type=lz4       # mặc định nên dùng\n" +
        "\n" +
        "# none   — không nén. Chỉ hợp khi payload đã nén sẵn (ảnh, video, protobuf nhỏ).\n" +
        "# gzip   — nén TỐT nhất (~70-80%), nhưng ngốn CPU nhất. Hợp khi băng thông\n" +
        "#          đắt hơn CPU: truyền qua WAN, MirrorMaker liên vùng.\n" +
        "# snappy — nhanh, tỉ lệ nén trung bình. Lựa chọn cũ, giờ lz4 thường tốt hơn.\n" +
        "# lz4    — nhanh gần snappy, nén tốt hơn. Cân bằng nhất -> mặc định thực dụng.\n" +
        "# zstd   — nén xấp xỉ gzip nhưng nhanh hơn NHIỀU (Kafka 2.1+). Tốt nhất nếu\n" +
        "#          client và broker đều đủ mới. Chỉnh được mức nén.\n" +
        "\n" +
        "# NGUYÊN TẮC then chốt: dữ liệu được giữ NGUYÊN DẠNG NÉN suốt chặng\n" +
        "# producer -> broker (lưu thẳng lên đĩa) -> consumer. Broker KHÔNG giải nén\n" +
        "# (trừ khi phải chuyển đổi định dạng cho client cũ, hoặc để validate).\n" +
        "# -> nén tiết kiệm cả băng thông LẪN dung lượng đĩa LẪN CPU broker.\n" +
        "\n" +
        "# Đặt nén ở TOPIC để ép mọi producer tuân theo:\n" +
        "#   kafka-configs.sh --alter --entity-type topics --entity-name orders \\\n" +
        "#     --add-config compression.type=zstd\n" +
        "# Giá trị \u0027producer\u0027 (mặc định của broker) nghĩa là giữ nguyên cái producer gửi lên.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Ba nhánh của partitioner mặc định và khi nào tự viết",
      code:
        "// Có key      -> partition = murmur2(keyBytes) % numPartitions   (ổn định, lặp lại được)\n" +
        "// Không key   -> sticky partitioning: dồn vào MỘT partition cho tới khi batch đầy\n" +
        "//                rồi mới đổi sang partition khác (Kafka 2.4+). Batch to hơn\n" +
        "//                round-robin thuần -> độ trễ thấp hơn ở tải nhẹ.\n" +
        "// Chỉ định rõ -> dùng đúng partition đó, bỏ qua mọi tính toán.\n" +
        "\n" +
        "// Tự viết partitioner khi ánh xạ mặc định gây LỆCH TẢI nghiêm trọng:\n" +
        "public class TenantPartitioner implements Partitioner {\n" +
        "    @Override\n" +
        "    public int partition(String topic, Object key, byte[] keyBytes,\n" +
        "                         Object value, byte[] valueBytes, Cluster cluster) {\n" +
        "        int n = cluster.partitionCountForTopic(topic);\n" +
        "        String tenant = (String) key;\n" +
        "        // Tenant khổng lồ được cấp riêng một dải partition, phần còn lại chia đều\n" +
        "        if (tenant.startsWith(\"BIGCORP\")) return Math.abs(tenant.hashCode()) % 4;\n" +
        "        return 4 + Math.abs(tenant.hashCode()) % (n - 4);\n" +
        "    }\n" +
        "    @Override public void close() {}\n" +
        "    @Override public void configure(Map<String, ?> configs) {}\n" +
        "}\n" +
        "p.put(\"partitioner.class\", TenantPartitioner.class.getName());\n" +
        "\n" +
        "// CẢNH BÁO: đổi partitioner (hoặc đổi số partition) làm key cũ đi sang\n" +
        "// partition khác -> phá vỡ thứ tự và làm hỏng compaction. Cân nhắc rất kỹ.",
    },
  ],
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
  demo: [
    {
      lang: "properties",
      title: "Điều gì xảy ra khi gửi nhanh hơn Kafka nhận",
      code:
        "# Producer KHÔNG gửi ngay mà đưa record vào buffer trong bộ nhớ, một thread\n" +
        "# nền (Sender) mới đẩy đi. buffer.memory là tổng dung lượng buffer đó.\n" +
        "buffer.memory=67108864      # 64MB, mặc định 32MB\n" +
        "max.block.ms=60000          # send() chặn tối đa bao lâu khi buffer đầy\n" +
        "\n" +
        "# Buffer đầy (Kafka chậm, hoặc mạng nghẽn, hoặc broker chết) thì send() sẽ CHẶN.\n" +
        "# Chặn quá max.block.ms -> ném TimeoutException.\n" +
        "# -> Đây chính là backpressure: producer bị làm chậm lại để không nuốt hết RAM.\n" +
        "\n" +
        "# BẪY 1: max.block.ms lớn trên luồng xử lý request HTTP -> request treo hàng phút.\n" +
        "#        Đặt ngắn (vài giây) rồi tự xử lý lỗi thì tốt hơn.\n" +
        "# BẪY 2: send() là bất đồng bộ nên nhiều người tưởng nó không bao giờ chặn.\n" +
        "#        Nó CÓ chặn — ở đúng chỗ buffer đầy và lúc chờ metadata lần đầu.\n" +
        "\n" +
        "# Theo dõi: buffer-available-bytes tụt về 0 và waiting-threads > 0\n" +
        "# là dấu hiệu producer đang bị nghẽn.",
    },
  ],
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
  demo: [
    {
      lang: "properties",
      title: "Ba tham số quyết định \"gửi được hay không\" và \"có giữ thứ tự không\"",
      code:
        "# Từ Kafka 2.1, delivery.timeout.ms là TRẦN TỔNG THỜI GIAN cho một record,\n" +
        "# tính từ lúc send() tới lúc thành công hoặc bỏ cuộc. Nó bao trùm cả retry.\n" +
        "delivery.timeout.ms=120000       # nên chỉnh CÁI NÀY thay vì chỉnh retries\n" +
        "request.timeout.ms=30000         # timeout của MỘT request tới broker\n" +
        "retry.backoff.ms=100\n" +
        "retries=2147483647               # để mặc định; delivery.timeout.ms mới là thứ dừng cuộc chơi\n" +
        "# Ràng buộc: delivery.timeout.ms >= request.timeout.ms + linger.ms\n" +
        "\n" +
        "# THỨ TỰ: nhiều request bay song song trên một connection, cái đầu lỗi phải\n" +
        "# gửi lại trong khi cái sau đã ghi xong -> ĐẢO THỨ TỰ.\n" +
        "max.in.flight.requests.per.connection=5\n" +
        "enable.idempotence=true          # broker sắp xếp lại theo sequence -> vẫn giữ thứ tự\n" +
        "# Nếu TẮT idempotence mà vẫn cần thứ tự tuyệt đối thì buộc phải đặt\n" +
        "# max.in.flight=1 -> throughput giảm mạnh. Bật idempotence là lựa chọn đúng.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Một instance dùng chung cho cả ứng dụng",
      code:
        "// KafkaProducer THREAD-SAFE. Chia sẻ MỘT instance giữa mọi thread là cách\n" +
        "// dùng ĐÚNG và NHANH NHẤT — nhiều thread cùng ghi giúp batch đầy nhanh hơn.\n" +
        "@Configuration\n" +
        "public class ProducerConfig {\n" +
        "    @Bean(destroyMethod = \"close\")           // đóng đúng lúc ứng dụng tắt\n" +
        "    public KafkaProducer<String, String> producer() {\n" +
        "        Properties p = new Properties();\n" +
        "        p.put(\"bootstrap.servers\", \"kafka:9092\");\n" +
        "        p.put(\"key.serializer\", StringSerializer.class.getName());\n" +
        "        p.put(\"value.serializer\", StringSerializer.class.getName());\n" +
        "        p.put(\"enable.idempotence\", \"true\");\n" +
        "        return new KafkaProducer<>(p);\n" +
        "    }\n" +
        "}\n" +
        "// Mỗi producer nuôi một thread nền (Sender) + buffer riêng.\n" +
        "// Tạo producer cho mỗi request là sai lầm nặng: mất kết nối, mất metadata,\n" +
        "// batch luôn rỗng, và rò rỉ thread.\n" +
        "\n" +
        "// Khi nào cần NHIỀU producer:\n" +
        "//  - cần cấu hình KHÁC nhau (acks=all cho giao dịch, acks=1 cho log)\n" +
        "//  - dùng transaction: mỗi transactional.id phải có producer RIÊNG\n" +
        "//  - muốn cách ly tài nguyên giữa các luồng nghiệp vụ quan trọng khác nhau",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Ba cách gửi và phân biệt lỗi tạm thời với lỗi vĩnh viễn",
      code:
        "// 1) FIRE-AND-FORGET: mất message mà không biết. Chỉ dùng cho dữ liệu bỏ được.\n" +
        "producer.send(record);\n" +
        "\n" +
        "// 2) ĐỒNG BỘ: chắc chắn nhưng giết throughput (chờ từng cái một)\n" +
        "try {\n" +
        "    RecordMetadata md = producer.send(record).get();\n" +
        "} catch (ExecutionException e) {\n" +
        "    Throwable cause = e.getCause();\n" +
        "}\n" +
        "\n" +
        "// 3) BẤT ĐỒNG BỘ + CALLBACK: cách nên dùng\n" +
        "producer.send(record, (metadata, ex) -> {\n" +
        "    if (ex == null) {\n" +
        "        log.debug(\"đã ghi {}-{}@{}\", metadata.topic(), metadata.partition(), metadata.offset());\n" +
        "        return;\n" +
        "    }\n" +
        "    if (ex instanceof RetriableException) {\n" +
        "        // NotLeaderOrFollower, NetworkException, Timeout... client ĐÃ tự retry\n" +
        "        // tới hết delivery.timeout.ms rồi mới báo lên đây -> giờ là lỗi thật\n" +
        "        metrics.increment(\"kafka.send.failed.retriable\");\n" +
        "        deadLetter.save(record);                 // cứu lấy message, gửi lại sau\n" +
        "    } else {\n" +
        "        // RecordTooLargeException, SerializationException, AuthorizationException\n" +
        "        // -> retry vô ích, phải sửa dữ liệu hoặc cấu hình\n" +
        "        log.error(\"lỗi không thể retry\", ex);\n" +
        "        alert.fire(ex);\n" +
        "    }\n" +
        "});\n" +
        "// LƯU Ý: callback chạy trên THREAD SENDER của producer. Làm việc nặng hoặc\n" +
        "// chặn trong callback sẽ làm nghẽn toàn bộ việc gửi của mọi partition.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Ghi nguyên tử nhiều partition trong một lần",
      code:
        "Properties p = new Properties();\n" +
        "p.put(\"transactional.id\", \"order-processor-1\");  // PHẢI ổn định và DUY NHẤT\n" +
        "p.put(\"enable.idempotence\", \"true\");             // transaction bao hàm idempotence\n" +
        "KafkaProducer<String, String> producer = new KafkaProducer<>(p);\n" +
        "\n" +
        "producer.initTransactions();     // gọi MỘT lần lúc khởi động: đăng ký với\n" +
        "                                 // transaction coordinator và \"chặn\" producer cũ\n" +
        "                                 // cùng transactional.id (zombie fencing)\n" +
        "try {\n" +
        "    producer.beginTransaction();\n" +
        "    producer.send(new ProducerRecord<>(\"orders\",   key, orderJson));\n" +
        "    producer.send(new ProducerRecord<>(\"payments\", key, paymentJson));\n" +
        "    producer.send(new ProducerRecord<>(\"audit\",    key, auditJson));\n" +
        "    producer.commitTransaction();     // ba topic hoặc CÙNG hiện, hoặc KHÔNG cái nào\n" +
        "} catch (ProducerFencedException | OutOfOrderSequenceException | AuthorizationException e) {\n" +
        "    producer.close();                 // KHÔNG cứu được: phải tạo producer mới\n" +
        "} catch (KafkaException e) {\n" +
        "    producer.abortTransaction();      // cứu được: huỷ rồi thử lại\n" +
        "}\n" +
        "\n" +
        "// Consumer chỉ thấy dữ liệu đã commit khi đặt isolation.level=read_committed.\n" +
        "// Bản chất: broker vẫn ghi mọi record vào log ngay, kèm marker COMMIT/ABORT.\n" +
        "// Consumer read_committed lọc bỏ phần bị abort khi đọc.\n" +
        "// GIÁ PHẢI TRẢ: thêm độ trễ (chờ marker) và consumer không đọc vượt qua\n" +
        "// transaction đang mở (LSO) -> một transaction treo làm nghẽn cả partition.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Hợp đồng dữ liệu và ba định dạng",
      code:
        "// VẤN ĐỀ: producer đổi cấu trúc JSON, consumer vỡ lúc chạy. Không ai biết\n" +
        "// topic đang chứa cái gì. Schema Registry biến schema thành HỢP ĐỒNG được kiểm tra.\n" +
        "p.put(\"value.serializer\", KafkaAvroSerializer.class.getName());\n" +
        "p.put(\"schema.registry.url\", \"http://schema-registry:8081\");\n" +
        "p.put(\"auto.register.schemas\", \"false\");   // production: đăng ký qua CI, không tự động\n" +
        "\n" +
        "// Serializer gửi schema lên registry, nhận về SCHEMA ID (4 byte) và chỉ nhúng\n" +
        "// id đó vào message thay vì cả schema:\n" +
        "//   [magic byte 0][schema id 4 byte][payload đã mã hoá]\n" +
        "// -> message nhỏ, và consumer tra id để biết đọc theo schema nào.\n" +
        "\n" +
        "// AVRO      — nhỏ gọn nhất, hỗ trợ tiến hoá schema tốt nhất, mặc định trong\n" +
        "//             hệ sinh thái Kafka. Cần file .avsc và sinh code.\n" +
        "// PROTOBUF  — nhỏ gọn, đa ngôn ngữ mạnh, hợp khi đã dùng gRPC.\n" +
        "// JSON SCHEMA — dễ đọc, dễ debug, nhưng payload to hơn nhiều và tiến hoá lỏng lẻo hơn.\n" +
        "\n" +
        "// Với Avro, luôn đặt default cho field mới -> thêm field không phá consumer cũ:\n" +
        "//   {\"name\":\"discount\",\"type\":[\"null\",\"double\"],\"default\":null}",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Metadata tách khỏi payload",
      code:
        "// Header cho phép mang thông tin KỸ THUẬT mà không phải nhét vào payload\n" +
        "// nghiệp vụ — quan trọng vì payload thường bị ràng buộc bởi schema.\n" +
        "ProducerRecord<String, byte[]> record = new ProducerRecord<>(\"orders\", key, value);\n" +
        "record.headers()\n" +
        "      .add(\"trace-id\",     traceId.getBytes(UTF_8))       // truy vết phân tán\n" +
        "      .add(\"source\",       \"checkout-svc\".getBytes(UTF_8))\n" +
        "      .add(\"schema-version\", \"3\".getBytes(UTF_8))\n" +
        "      .add(\"event-type\",   \"OrderPlaced\".getBytes(UTF_8)) // định tuyến không cần parse payload\n" +
        "      .add(\"retry-count\",  \"0\".getBytes(UTF_8));          // dùng cho retry topic\n" +
        "\n" +
        "// Phía consumer: lọc/định tuyến mà KHÔNG phải giải mã payload -> rẻ hơn nhiều\n" +
        "for (var r : records) {\n" +
        "    Header h = r.headers().lastHeader(\"event-type\");\n" +
        "    String type = h == null ? \"\" : new String(h.value(), UTF_8);\n" +
        "    if (!\"OrderPlaced\".equals(type)) continue;\n" +
        "    process(r);\n" +
        "}\n" +
        "\n" +
        "// Lưu ý: header là byte[], có thể LẶP cùng một key (dùng lastHeader để lấy cái cuối).\n" +
        "// Header KHÔNG được nén riêng và tính vào kích thước message -> đừng nhét\n" +
        "// dữ liệu lớn. Cũng đừng đặt dữ liệu nghiệp vụ vào header: nó nằm ngoài schema,\n" +
        "// không ai kiểm tra được.",
    },
  ],
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
  demo: [
    {
      lang: "properties",
      title: "Bốn chỗ phải chỉnh cùng lúc, và cách tốt hơn",
      code:
        "# Mặc định trần là 1MB. Vượt -> RecordTooLargeException.\n" +
        "# Muốn tăng, phải chỉnh ĐỦ BỐN chỗ, thiếu một là vẫn lỗi ở chỗ khác:\n" +
        "message.max.bytes=10485760              # broker: nhận\n" +
        "replica.fetch.max.bytes=10485760        # broker: nhân bản giữa các replica\n" +
        "max.request.size=10485760               # producer\n" +
        "max.partition.fetch.bytes=10485760      # consumer\n" +
        "fetch.max.bytes=52428800                # consumer: tổng cho một lần fetch\n" +
        "\n" +
        "# NHƯNG tăng trần là lựa chọn TỆ: message lớn làm phình page cache, kéo dài\n" +
        "# thời gian nhân bản, gây timeout rebalance, và một message xấu có thể\n" +
        "# làm nghẽn cả partition.\n" +
        "\n" +
        "# CÁCH ĐÚNG — claim check pattern: đẩy payload lên object storage,\n" +
        "# Kafka chỉ mang con trỏ:\n" +
        "#   { \"bucket\": \"s3://payloads\", \"key\": \"2026/09/abc123\", \"size\": 8912345 }\n" +
        "# Message vài trăm byte, Kafka làm đúng việc của nó, và storage rẻ hơn nhiều.\n" +
        "\n" +
        "# Cách khác: chia nhỏ (chunking) cùng key rồi ghép lại ở consumer —\n" +
        "# phức tạp và dễ sai, chỉ dùng khi không có object storage.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Sáu metric nói lên gần như mọi vấn đề",
      code:
        "// Lấy metric qua chính client (hoặc JMX / Micrometer)\n" +
        "for (var e : producer.metrics().entrySet()) {\n" +
        "    MetricName n = e.getKey();\n" +
        "    if (n.group().equals(\"producer-metrics\")) log.info(\"{} = {}\", n.name(), e.getValue().metricValue());\n" +
        "}\n" +
        "\n" +
        "// 1) record-error-rate       > 0 là có message MẤT -> cảnh báo ngay\n" +
        "// 2) record-retry-rate       tăng = mạng/broker không ổn định, hoặc leader đang chuyển\n" +
        "// 3) request-latency-avg     độ trễ tới broker; tăng đột biến = broker quá tải\n" +
        "// 4) buffer-available-bytes  tụt về 0 = producer bị nghẽn, send() sắp chặn\n" +
        "// 5) batch-size-avg          nhỏ hơn nhiều so với batch.size = linger.ms quá ngắn\n" +
        "//                            -> đang lãng phí throughput\n" +
        "// 6) record-queue-time-avg   record nằm chờ trong buffer bao lâu; cao = Sender không kịp đẩy\n" +
        "\n" +
        "// Ngoài ra: compression-rate-avg (nén có hiệu quả không),\n" +
        "//           records-per-request-avg (batch có thật sự gom được không)\n" +
        "\n" +
        "// Xuất sang Prometheus trong Spring Boot:\n" +
        "//   new KafkaClientMetrics(producer).bindTo(meterRegistry);",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Chống nghẽn ứng dụng khi Kafka chết",
      code:
        "// Kafka chết mà producer cứ chặn -> kéo sập luôn dịch vụ đang gọi nó.\n" +
        "// Nguyên tắc: LỖI NHANH ở producer, và có đường thoát cho dữ liệu.\n" +
        "Properties p = new Properties();\n" +
        "p.put(\"max.block.ms\", \"5000\");           // đừng để 60s mặc định trên luồng request\n" +
        "p.put(\"delivery.timeout.ms\", \"30000\");\n" +
        "p.put(\"retry.backoff.ms\", \"200\");\n" +
        "\n" +
        "// 1) Circuit breaker: hỏng liên tục thì ngừng gọi một lúc, tránh dồn đống\n" +
        "@CircuitBreaker(name = \"kafka\", fallbackMethod = \"fallback\")\n" +
        "public void publish(String key, String value) {\n" +
        "    producer.send(new ProducerRecord<>(\"orders\", key, value), this::onComplete);\n" +
        "}\n" +
        "\n" +
        "// 2) Fallback: KHÔNG được để mất dữ liệu nghiệp vụ quan trọng\n" +
        "public void fallback(String key, String value, Throwable t) {\n" +
        "    outbox.save(key, value);      // ghi xuống DB, job nền gửi lại sau\n" +
        "    metrics.increment(\"kafka.fallback\");\n" +
        "}\n" +
        "\n" +
        "// 3) Với dữ liệu bỏ được (metric, log): đếm rồi bỏ, đừng chặn nghiệp vụ\n" +
        "// 4) Với dữ liệu quan trọng: OUTBOX ngay từ đầu là thiết kế đúng hơn —\n" +
        "//    ghi DB và Kafka trong hai bước riêng luôn có nguy cơ lệch (dual-write).",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Được phép, nhưng gần như luôn là ý tồi",
      code:
        "// Chỉ định partition cứng:\n" +
        "producer.send(new ProducerRecord<>(\"orders\", 3, key, value));   // luôn vào partition 3\n" +
        "\n" +
        "// VÌ SAO THƯỜNG LÀ SAI:\n" +
        "//  - partition 3 biến mất/đổi vai trò khi cụm thay đổi -> code phải sửa theo\n" +
        "//  - tăng số partition thì logic phân bổ của bạn lệch ngay\n" +
        "//  - dễ gây lệch tải: nhiều producer cùng chọn tay thì không ai cân bằng\n" +
        "//  - mất đi khả năng gom theo key mà Kafka làm sẵn\n" +
        "\n" +
        "// CÁCH ĐÚNG gần như mọi trường hợp: dùng KEY và để Kafka tự ánh xạ\n" +
        "producer.send(new ProducerRecord<>(\"orders\", customerId, value));\n" +
        "\n" +
        "// Trường hợp hợp lý hiếm hoi:\n" +
        "//  - công cụ vận hành/test cần ghi vào đúng một partition để tái hiện lỗi\n" +
        "//  - đã tự viết partitioner nhưng cần ghi đè cho một luồng đặc biệt\n" +
        "//  - cần đọc lại và ghi lại đúng partition cũ khi sửa dữ liệu\n" +
        "\n" +
        "// Muốn biết topic có bao nhiêu partition trước khi tính toán:\n" +
        "List<PartitionInfo> parts = producer.partitionsFor(\"orders\");",
    },
  ],
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
  demo: [
    {
      lang: "properties",
      title: "Bộ cấu hình throughput và cái giá của nó",
      code:
        "# Gom batch to — đây là đòn bẩy lớn nhất\n" +
        "batch.size=131072                # 128KB\n" +
        "linger.ms=50                     # chờ 50ms để batch đầy\n" +
        "buffer.memory=134217728          # 128MB buffer\n" +
        "\n" +
        "# Nén cả batch — giảm băng thông và đĩa, thường TĂNG throughput vì mạng\n" +
        "# là nút thắt trước CPU\n" +
        "compression.type=lz4             # hoặc zstd nếu client/broker đủ mới\n" +
        "\n" +
        "# Nhiều request bay song song, vẫn giữ thứ tự nhờ idempotence\n" +
        "max.in.flight.requests.per.connection=5\n" +
        "enable.idempotence=true\n" +
        "acks=all                         # ĐỪNG hạ xuống 1 để lấy tốc độ trước khi đo\n" +
        "\n" +
        "# Kết nối và bộ đệm socket (quan trọng khi độ trễ mạng cao, ví dụ liên vùng)\n" +
        "send.buffer.bytes=1048576\n" +
        "receive.buffer.bytes=1048576\n" +
        "\n" +
        "# Ngoài cấu hình:\n" +
        "#  - dùng MỘT producer dùng chung, nhiều thread cùng gửi -> batch đầy nhanh\n" +
        "#  - đủ partition để phân tán tải, nhưng không quá nhiều (batch bị chia nhỏ)\n" +
        "#  - serializer nhanh (Avro/Protobuf thay vì JSON chuỗi dài)\n" +
        "# ĐÁNH ĐỔI: linger.ms=50 nghĩa là thêm tối đa 50ms độ trễ cho mỗi message.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Một cái đợi, một cái đợi rồi dọn",
      code:
        "// send() chỉ đưa record vào buffer. Chưa gọi flush/close mà thoát tiến trình\n" +
        "// là MẤT toàn bộ record còn nằm trong buffer.\n" +
        "\n" +
        "producer.send(record1);\n" +
        "producer.send(record2);\n" +
        "producer.flush();     // CHẶN tới khi mọi record trong buffer được ack (hoặc lỗi).\n" +
        "                      // Producer VẪN DÙNG TIẾP được sau flush.\n" +
        "\n" +
        "// Dùng flush() khi cần một điểm mốc chắc chắn:\n" +
        "for (var row : batch) producer.send(toRecord(row));\n" +
        "producer.flush();                 // chắc chắn cả lô đã lên Kafka\n" +
        "checkpoint.save(batch.lastId());  // rồi mới ghi mốc tiến độ\n" +
        "\n" +
        "producer.close();                 // flush + đóng kết nối + dừng thread Sender.\n" +
        "                                  // Sau close(), producer KHÔNG dùng lại được.\n" +
        "producer.close(Duration.ofSeconds(30));   // có hạn: quá 30s thì bỏ record còn lại\n" +
        "\n" +
        "// Trong Spring: @Bean(destroyMethod = \"close\") hoặc try-with-resources\n" +
        "try (KafkaProducer<String, String> p = new KafkaProducer<>(props)) {\n" +
        "    p.send(record);\n" +
        "}   // tự close -> tự flush\n" +
        "\n" +
        "// ĐỪNG gọi flush() sau MỖI send(): biến producer bất đồng bộ thành đồng bộ,\n" +
        "// batch không bao giờ gom được, throughput sụp đổ.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Không key: sticky partitioning, và mất mọi đảm bảo về thứ tự",
      code:
        "producer.send(new ProducerRecord<>(\"logs\", null, logLine));   // key = null\n" +
        "\n" +
        "// Kafka 2.4+ dùng STICKY PARTITIONING: dồn record vào MỘT partition cho tới\n" +
        "// khi batch đầy (hoặc hết linger.ms), rồi chọn ngẫu nhiên partition khác.\n" +
        "// Trước 2.4 là round-robin từng record -> batch bé, nhiều request, chậm hơn.\n" +
        "\n" +
        "// HỆ QUẢ cần biết:\n" +
        "//  1) Không có đảm bảo thứ tự nào giữa các message — chúng nằm rải mọi partition.\n" +
        "//  2) Quan sát trong khoảng ngắn sẽ thấy \"lệch\": một partition nhận cả cụm\n" +
        "//     record liên tiếp. Về dài hạn thì vẫn đều.\n" +
        "//  3) Trên topic COMPACTED, key null là LỖI — compaction dựa vào key để biết\n" +
        "//     giữ bản ghi nào. Broker từ chối với InvalidRecordException.\n" +
        "\n" +
        "// Khi nào key=null là đúng: log, metric, sự kiện độc lập không cần thứ tự,\n" +
        "// và mỗi record tự đứng một mình.\n" +
        "// Khi nào PHẢI có key: mọi thứ liên quan tới một thực thể (đơn hàng, user,\n" +
        "// thiết bị) mà thứ tự có ý nghĩa, hoặc topic dùng compaction.",
    },
  ],
},
]);
