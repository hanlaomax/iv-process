SS.addQuestions('kafka', [
{
  cat: 'Delivery semantics',
  q: 'At-most-once, at-least-once, exactly-once nghĩa là gì?',
  answer:
    '- **At-most-once**: mỗi message được xử lý 0 hoặc 1 lần — có thể **mất**, không bao giờ trùng. Đạt bằng cách commit offset *trước* khi xử lý.\n' +
    '- **At-least-once**: mỗi message xử lý ≥ 1 lần — không mất, có thể **trùng**. Commit offset *sau* khi xử lý. Đây là mặc định của Kafka.\n' +
    '- **Exactly-once (EOS)**: hiệu ứng của mỗi message xảy ra đúng một lần — không mất, không trùng. Cần idempotent producer + transactions + `read_committed`, hoặc consumer idempotent/dedup.',
  essence:
    'Ba mức là đánh đổi giữa "mất" và "trùng". Chọn thời điểm commit offset so với thời điểm xử lý quyết định bạn đang ở mức nào.',
  example:
    'Gửi SMS OTP: at-least-once chấp nhận được (thà gửi 2 lần còn hơn không gửi). Trừ tiền tài khoản: cần EOS hoặc consumer idempotent — trừ 2 lần là sự cố tài chính.',
  viz: {
    type: 'compare',
    cols: ['At-most-once', 'At-least-once (mặc định)', 'Exactly-once (EOS)'],
    rows: [
      ['Xử lý', '0 hoặc 1 lần', '≥ 1 lần', 'hiệu ứng đúng 1 lần'],
      ['Mất?', 'có thể', 'không', 'không'],
      ['Trùng?', 'không', 'có thể', 'không'],
      ['Cách đạt', 'commit offset TRƯỚC khi xử lý', 'commit SAU khi xử lý', 'idempotent producer + tx + read_committed, hoặc consumer idempotent/dedup'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba mức, khác nhau ở CHỖ ĐẶT lệnh commit",
      code:
        "// AT-MOST-ONCE: commit TRƯỚC khi xử lý -> crash là MẤT message, không bao giờ trùng\n" +
        "var records = consumer.poll(Duration.ofSeconds(1));\n" +
        "consumer.commitSync();                 // commit trước\n" +
        "for (var r : records) process(r);      // crash ở đây -> lô này mất vĩnh viễn\n" +
        "// Dùng cho: metric, log, dữ liệu mà mất một ít không sao.\n" +
        "\n" +
        "// AT-LEAST-ONCE (mặc định, dùng nhiều nhất): xử lý xong RỒI commit\n" +
        "for (var r : records) process(r);\n" +
        "consumer.commitSync();                 // crash trước dòng này -> lô chạy LẠI -> TRÙNG\n" +
        "// Không mất, nhưng phải làm việc xử lý idempotent.\n" +
        "\n" +
        "// EXACTLY-ONCE: offset và kết quả xử lý phải cùng thành công hoặc cùng thất bại.\n" +
        "// Hai cách duy nhất:\n" +
        "//  1) Trong nội bộ Kafka -> transaction (sendOffsetsToTransaction)\n" +
        "//  2) Ra hệ thống ngoài -> lưu offset CÙNG transaction với dữ liệu\n" +
        "tx.begin();\n" +
        "saveOrder(order);\n" +
        "saveOffset(r.partition(), r.offset() + 1);   // cùng một transaction DB\n" +
        "tx.commit();\n" +
        "\n" +
        "// Không có \"exactly-once qua mạng\" theo nghĩa tuyệt đối — cái đạt được là\n" +
        "// \"hiệu ứng đúng một lần\", nhờ nguyên tử hoặc nhờ idempotent.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Vì sao at-least-once là mặc định, và trùng lặp đến từ đâu?',
  answer:
    'Kafka ưu tiên **không mất dữ liệu**: producer retry khi không chắc ghi thành công, consumer commit offset sau khi xử lý. Cả hai đều có thể tạo trùng:\n\n' +
    '- **Producer**: gửi batch, broker ghi xong, ack bị mất trên đường về → producer retry → message xuất hiện 2 lần (idempotent producer khắc phục cái này).\n' +
    '- **Consumer**: xử lý xong lô, chưa kịp commit offset thì crash/rebalance → lô chạy lại trên consumer khác.',
  essence:
    'Trùng lặp là cái giá của "không mất". Idempotent producer khử trùng do retry; trùng do consumer restart phải khử ở phía xử lý.',
  example:
    'Consumer ghi vào Elasticsearch bằng `index` với `_id = eventId` → ghi lại cùng doc là ghi đè, không tạo bản thứ hai. Đây là biến at-least-once thành hiệu ứng exactly-once mà không cần transaction.',
  viz: {
    type: 'tree',
    title: 'Trùng lặp là cái giá của "không mất"',
    root: {
      label: 'Kafka ưu tiên không mất dữ liệu → at-least-once mặc định',
      children: [
        { label: 'Trùng từ producer', note: 'ack bị mất trên đường về → retry → message 2 lần (idempotent producer khắc phục)' },
        { label: 'Trùng từ consumer', note: 'xử lý xong nhưng crash/rebalance trước commit → lô chạy lại' },
        { label: 'Khử phía xử lý', note: 'ghi ES với _id = eventId → ghi đè, không tạo bản 2' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Bốn nguồn trùng lặp",
      code:
        "// 1) PRODUCER retry khi ack bị mất trên đường về\n" +
        "producer.send(record);   // broker đã ghi, nhưng ack rớt -> client retry -> ghi 2 lần\n" +
        "p.put(\"enable.idempotence\", \"true\");    // CHỮA: broker khử theo sequence number\n" +
        "\n" +
        "// 2) CONSUMER crash sau khi xử lý, trước khi commit\n" +
        "for (var r : records) process(r);\n" +
        "// <- crash ở đây: lần khởi động sau đọc lại từ offset cũ\n" +
        "consumer.commitSync();\n" +
        "\n" +
        "// 3) REBALANCE: partition chuyển sang consumer khác từ offset đã commit gần nhất\n" +
        "// -> mọi thứ xử lý sau lần commit đó bị làm lại trên consumer mới.\n" +
        "// CHỮA (giảm bớt): commit trong onPartitionsRevoked\n" +
        "\n" +
        "// 4) COMMIT ASYNC thất bại lặng lẽ, không retry\n" +
        "\n" +
        "// Vì sao mặc định là at-least-once chứ không phải exactly-once:\n" +
        "// EOS đòi transaction -> thêm coordinator, thêm marker, thêm độ trễ, và\n" +
        "// consumer phải read_committed (không đọc vượt transaction đang mở).\n" +
        "// Với đa số hệ thống, làm việc xử lý IDEMPOTENT rẻ hơn và bền hơn nhiều\n" +
        "// so với bật EOS toàn tuyến.",
    },
  ],
},
{
  cat: 'Exactly-once',
  q: 'Idempotent producer khử trùng lặp về mặt kỹ thuật như thế nào?',
  answer:
    'Khi bật `enable.idempotence=true`, mỗi producer được cấp **PID (Producer ID)** từ broker. Mỗi batch gửi tới một partition mang **sequence number** tăng liên tục.\n\n' +
    'Broker lưu, cho mỗi `(PID, partition)`, sequence cao nhất đã ghi. Khi nhận batch:\n' +
    '- sequence = kỳ vọng → ghi, tăng bộ đếm.\n' +
    '- sequence ≤ đã ghi (retry) → **bỏ qua**, ack lại.\n' +
    '- sequence > kỳ vọng (nhảy cóc) → `OutOfOrderSequenceException`.\n\n' +
    'PID mất khi producer restart → chỉ khử trùng trong một *session*.',
  essence:
    'Idempotence = đánh số thứ tự request phía producer + broker nhớ "đã thấy tới đâu". Nó dọn trùng do retry mạng, không dọn trùng do producer mới khởi tạo lại.',
  example:
    'Producer gửi seq 45, broker ghi nhưng timeout ack → retry seq 45 → broker thấy "đã ghi 45", chỉ ack. Log chỉ có một bản. Nếu producer process restart, nó xin PID mới, seq reset về 0 — broker không nhận ra liên hệ với batch cũ.',
  viz: {
    type: 'tree',
    title: 'Broker so sánh sequence cho mỗi (PID, partition)',
    root: {
      label: 'Broker lưu sequence cao nhất đã ghi',
      children: [
        { label: 'sequence = kỳ vọng', note: 'ghi, tăng bộ đếm' },
        { label: 'sequence ≤ đã ghi (retry)', note: 'BỎ QUA, ack lại — không tạo trùng' },
        { label: 'sequence > kỳ vọng (nhảy cóc)', note: 'OutOfOrderSequenceException' },
        { label: 'Producer restart', note: 'PID mới, seq reset 0 → chỉ khử trùng trong một session' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "PID + sequence number cho mỗi partition",
      code:
        "p.put(\"enable.idempotence\", \"true\");    // mặc định true từ Kafka 3.0\n" +
        "\n" +
        "// CƠ CHẾ:\n" +
        "//  1) Producer xin broker cấp một PID (producer id) khi khởi tạo.\n" +
        "//  2) Mỗi (PID, partition) có một sequence number tăng dần từ 0.\n" +
        "//  3) Mỗi batch gửi đi mang theo PID + sequence đầu tiên của batch.\n" +
        "//  4) Broker nhớ sequence CUỐI CÙNG đã ghi cho mỗi (PID, partition):\n" +
        "//        seq == lastSeq + 1  -> ghi bình thường, cập nhật lastSeq\n" +
        "//        seq <= lastSeq      -> ĐÃ GHI RỒI -> bỏ qua, trả ack thành công\n" +
        "//        seq >  lastSeq + 1  -> thủng lỗ -> OutOfOrderSequenceException\n" +
        "\n" +
        "// Broker giữ 5 batch gần nhất cho mỗi (PID, partition) -> đây chính là lý do\n" +
        "// max.in.flight.requests.per.connection phải <= 5 khi bật idempotence.\n" +
        "\n" +
        "// GIỚI HẠN quan trọng, hay bị hiểu nhầm:\n" +
        "//  - chỉ trong MỘT PHIÊN producer. Restart -> PID mới -> không khử được nữa.\n" +
        "//  - chỉ khử trùng do RETRY của client. Ứng dụng tự gọi send() hai lần thì\n" +
        "//    đó là hai message khác nhau, Kafka không biết.\n" +
        "//  - transactional.id giải quyết phần \"qua các phiên\": PID được giữ nguyên\n" +
        "//    theo transactional.id khi khởi động lại.",
    },
  ],
},
{
  cat: 'Exactly-once',
  q: 'Kafka transactions cho phép ghi nguyên tử như thế nào?',
  answer:
    'Producer đặt `transactional.id` cố định. Luồng:\n' +
    '`initTransactions()` → `beginTransaction()` → nhiều `send()` (tới nhiều topic/partition) → `commitTransaction()` (hoặc `abortTransaction()`).\n\n' +
    'Broker ghi các message với marker "thuộc transaction X"; khi commit, ghi một **commit marker** vào mỗi partition liên quan. Consumer `read_committed` chỉ để lộ message khi thấy commit marker; message của transaction abort bị bỏ qua.\n\n' +
    '**Transaction Coordinator** (broker) quản lý trạng thái transaction trong topic `__transaction_state`.',
  essence:
    'Transaction = "hoặc tất cả message trong nhóm này hiển thị, hoặc không cái nào". Nó biến nhiều lần ghi rải rác thành một đơn vị nguyên tử mà consumer read_committed tôn trọng.',
  example:
    'Xử lý một sự kiện tạo ra 3 output: ghi `inventory-updated` + `shipping-requested` + cập nhật offset input — tất cả trong một transaction. Crash sau `send` thứ 2 → abort → consumer downstream không thấy `inventory-updated` mồ côi.',
  viz: {
    type: 'flow',
    title: 'Kafka transaction — ghi nguyên tử đa partition',
    nodes: ['initTransactions()', 'beginTransaction()', 'nhiều send() (nhiều topic/partition)', 'commitTransaction()', 'commit marker vào mỗi partition'],
    steps: [
      { to: 2, label: 'broker ghi message với marker "thuộc transaction X"' },
      { to: 4, label: 'commit → ghi commit marker; consumer read_committed chỉ để lộ message khi thấy marker' },
      { to: 4, label: 'abort → message bị bỏ qua. Transaction Coordinator quản lý trạng thái trong __transaction_state' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Marker và transaction coordinator",
      code:
        "p.put(\"transactional.id\", \"payment-processor-1\");   // ổn định qua các lần restart\n" +
        "KafkaProducer<String, String> producer = new KafkaProducer<>(p);\n" +
        "producer.initTransactions();\n" +
        "\n" +
        "producer.beginTransaction();\n" +
        "producer.send(new ProducerRecord<>(\"payments\", key, payment));\n" +
        "producer.send(new ProducerRecord<>(\"ledger\",   key, entry));\n" +
        "producer.commitTransaction();\n" +
        "\n" +
        "// CƠ CHẾ THẬT (khác với hình dung thường gặp):\n" +
        "//  - Record được ghi vào log NGAY khi send, KHÔNG bị giữ lại ở đâu cả.\n" +
        "//  - commitTransaction() ghi thêm một CONTROL RECORD (marker COMMIT) vào\n" +
        "//    từng partition liên quan. abort thì ghi marker ABORT.\n" +
        "//  - Consumer read_committed đọc log, gặp marker mới biết record trước đó\n" +
        "//    là hợp lệ hay phải bỏ qua.\n" +
        "//  - Transaction coordinator (một broker) ghi trạng thái transaction vào\n" +
        "//    topic nội bộ __transaction_state để khôi phục được sau sự cố.\n" +
        "\n" +
        "// Vì record đã nằm sẵn trong log, EOS KHÔNG làm chậm việc GHI đáng kể.\n" +
        "// Cái chậm nằm ở phía ĐỌC: consumer phải chờ marker mới thấy dữ liệu,\n" +
        "// và không đọc vượt qua LSO (transaction đang mở sớm nhất).",
    },
  ],
},
{
  cat: 'Exactly-once',
  q: 'Pattern consume-transform-produce với exactly-once hoạt động ra sao?',
  answer:
    'Đây là pipeline điển hình: đọc từ topic A, biến đổi, ghi ra topic B.\n\n' +
    'EOS cần **gộp việc ghi output và việc commit offset input vào cùng một transaction**:\n' +
    '```\n' +
    'producer.beginTransaction();\n' +
    'producer.send(outputRecords);\n' +
    'producer.sendOffsetsToTransaction(inputOffsets, consumerGroupMetadata);\n' +
    'producer.commitTransaction();\n' +
    '```\n' +
    'Nếu commit thành công: output đã ghi VÀ offset input đã tiến — cùng nhau. Nếu abort/crash: cả hai đều không xảy ra, lô input được xử lý lại.',
  essence:
    'Chìa khoá EOS của pipeline là offset commit trở thành một phần của transaction output. "Đã xử lý" và "đã ghi kết quả" không còn tách rời được nữa.',
  example:
    'Kafka Streams đặt `processing.guarantee=exactly_once_v2` làm chính xác việc này bên dưới: mỗi lần commit, nó atomically flush output + state changelog + offset. Người dùng không thấy chi tiết.',
  viz: {
    type: 'flow',
    title: 'Consume–transform–produce với EOS',
    nodes: ['beginTransaction()', 'send(outputRecords)', 'sendOffsetsToTransaction(inputOffsets)', 'commitTransaction()'],
    steps: [
      { to: 1, label: 'ghi output ra topic B' },
      { to: 2, label: 'commit offset input trở thành MỘT PHẦN của transaction output' },
      { to: 3, label: 'commit thành công → output đã ghi VÀ offset đã tiến, cùng nhau; abort/crash → cả hai không xảy ra, lô xử lý lại' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Đưa offset vào chính transaction",
      code:
        "// Đây là mẫu EOS quan trọng nhất trong Kafka: đọc từ topic A, biến đổi,\n" +
        "// ghi sang topic B, và commit offset của A — TẤT CẢ trong một transaction.\n" +
        "p.put(\"transactional.id\", \"enricher-\" + instanceId);\n" +
        "consumerProps.put(\"isolation.level\", \"read_committed\");\n" +
        "consumerProps.put(\"enable.auto.commit\", \"false\");   // BẮT BUỘC tắt\n" +
        "\n" +
        "producer.initTransactions();\n" +
        "while (running) {\n" +
        "    var records = consumer.poll(Duration.ofMillis(1000));\n" +
        "    if (records.isEmpty()) continue;\n" +
        "\n" +
        "    producer.beginTransaction();\n" +
        "    try {\n" +
        "        for (var r : records) {\n" +
        "            producer.send(new ProducerRecord<>(\"orders-enriched\", r.key(), enrich(r.value())));\n" +
        "        }\n" +
        "        // MẤU CHỐT: offset được ghi BỞI PRODUCER, nằm TRONG transaction\n" +
        "        Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();\n" +
        "        for (var tp : records.partitions()) {\n" +
        "            var last = records.records(tp).get(records.records(tp).size() - 1);\n" +
        "            offsets.put(tp, new OffsetAndMetadata(last.offset() + 1));\n" +
        "        }\n" +
        "        producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());\n" +
        "        producer.commitTransaction();   // dữ liệu ra + offset vào: cùng nguyên tử\n" +
        "    } catch (KafkaException e) {\n" +
        "        producer.abortTransaction();    // không ghi gì, offset cũng không nhích\n" +
        "    }\n" +
        "}\n" +
        "// KHÔNG bao giờ gọi consumer.commitSync() trong mẫu này — sẽ phá vỡ nguyên tử.",
    },
  ],
},
{
  cat: 'Exactly-once',
  q: 'Zombie fencing trong Kafka transactions là gì?',
  answer:
    '"Zombie" = một instance producer cũ tưởng đã chết nhưng vẫn còn sống (network partition), tiếp tục ghi.\n\n' +
    'Với transactional producer: mỗi lần `initTransactions()`, broker tăng **epoch** cho `transactional.id` đó. Ghi/commit từ epoch **cũ hơn** bị từ chối (`ProducerFencedException`).\n\n' +
    'Nhờ đó chỉ instance mới nhất giữ một `transactional.id` được phép ghi — instance zombie bị "fenced out".',
  essence:
    'Epoch là cơ chế "chỉ một chủ tại một thời điểm" cho `transactional.id`. Nó ngăn hai instance (do failover) cùng ghi và phá vỡ tính nguyên tử.',
  example:
    'Pod A treo GC 30s, K8s khởi động pod B với cùng `transactional.id`. B gọi `initTransactions()` → epoch tăng. A tỉnh dậy, thử `commitTransaction()` → `ProducerFencedException`, A tự thoát. Không có double-write.',
  viz: {
    type: 'sequence',
    title: 'Zombie fencing bằng epoch',
    actors: ['Producer A (zombie)', 'Coordinator', 'Producer B (mới)'],
    messages: [
      { from: 0, to: 1, label: 'đang treo GC 30s…', dashed: true },
      { from: 2, to: 1, label: 'initTransactions() → epoch++' },
      { from: 0, to: 1, label: 'commitTransaction() (epoch cũ)' },
      { from: 1, to: 0, label: 'ProducerFencedException', dashed: true },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chặn instance cũ \"sống lại\" ghi đè dữ liệu",
      code:
        "// VẤN ĐỀ: instance A bị treo (GC dài, mạng đứt) -> hệ thống tưởng chết, khởi\n" +
        "// động instance B thay thế. Rồi A tỉnh lại và tiếp tục ghi -> hai instance\n" +
        "// cùng ghi cho một luồng dữ liệu -> hỏng dữ liệu.\n" +
        "\n" +
        "p.put(\"transactional.id\", \"payment-processor-1\");   // GIỐNG NHAU giữa A và B\n" +
        "producer.initTransactions();\n" +
        "// initTransactions() làm hai việc:\n" +
        "//  1) đăng ký transactional.id với coordinator\n" +
        "//  2) TĂNG EPOCH của transactional.id đó lên 1\n" +
        "\n" +
        "// B gọi initTransactions() -> epoch từ 5 lên 6.\n" +
        "// A (epoch 5) gửi tiếp -> broker thấy epoch cũ -> TỪ CHỐI:\n" +
        "try {\n" +
        "    producer.send(record);\n" +
        "    producer.commitTransaction();\n" +
        "} catch (ProducerFencedException e) {\n" +
        "    // A biết mình đã bị thay thế. KHÔNG được retry, KHÔNG cứu được.\n" +
        "    log.error(\"instance này đã bị fence, thoát\", e);\n" +
        "    producer.close();\n" +
        "    System.exit(1);          // để orchestrator dọn dẹp\n" +
        "}\n" +
        "\n" +
        "// Điều kiện để fencing hoạt động: transactional.id phải ỔN ĐỊNH và gắn với\n" +
        "// PHÂN VÙNG CÔNG VIỆC, không phải ngẫu nhiên mỗi lần khởi động.\n" +
        "// UUID mới mỗi lần start -> không fence được gì cả.\n" +
        "// Thường đặt theo partition hoặc theo ordinal của StatefulSet.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Dual-write problem là gì và Outbox pattern giải quyết thế nào?',
  answer:
    '**Dual write**: một thao tác cần ghi vào **hai hệ thống** — DB (lưu đơn hàng) và Kafka (phát sự kiện). Không có transaction phân tán → nếu ghi DB xong mà publish Kafka fail (hoặc ngược lại) → hai bên **không nhất quán**.\n\n' +
    '**Outbox pattern**: trong **cùng transaction DB**, ghi cả bản ghi nghiệp vụ và một dòng vào bảng `outbox`. Một tiến trình riêng (CDC/Debezium hoặc polling) đọc `outbox` và publish lên Kafka, đánh dấu đã gửi.\n\n' +
    'Giờ chỉ còn **một** lần ghi nguyên tử (vào DB); việc chuyển sang Kafka là at-least-once và idempotent.',
  essence:
    'Không ghi hai nơi cùng lúc. Ghi một nơi nguyên tử (DB), rồi để một cơ chế đáng tin chuyển tiếp sang nơi thứ hai. Outbox biến "2 write không nhất quán" thành "1 write + 1 relay".',
  example:
    '`@Transactional`: `orderRepo.save(order)` + `outboxRepo.save(new OutboxEvent("OrderCreated", payload))`. Debezium theo dõi bảng `outbox`, publish mỗi dòng mới lên topic `orders`. DB rollback → không có dòng outbox → không có sự kiện sai.',
  viz: {
    type: 'flow',
    title: 'Outbox pattern — biến dual-write thành 1 write + 1 relay',
    nodes: ['@Transactional', 'save(order) + save(outboxEvent)', 'commit DB (nguyên tử)', 'CDC/polling đọc outbox', 'publish Kafka + đánh dấu đã gửi'],
    steps: [
      { to: 1, label: 'cùng transaction DB: bản ghi nghiệp vụ + một dòng outbox' },
      { to: 2, label: 'chỉ còn MỘT lần ghi nguyên tử (vào DB)' },
      { to: 4, label: 'chuyển sang Kafka là at-least-once + idempotent; DB rollback → không có dòng outbox → không có sự kiện sai' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai hệ thống, không có transaction chung",
      code:
        "// DUAL-WRITE: ghi vào hai hệ thống không có transaction chung -> luôn có\n" +
        "// cửa sổ mà một cái thành công, cái kia thất bại.\n" +
        "@Transactional\n" +
        "public void placeOrder(Order o) {\n" +
        "    repo.save(o);                        // DB commit\n" +
        "    producer.send(new ProducerRecord<>(\"orders\", o.id(), json(o)));\n" +
        "    // Kafka chết ở đây -> DB có đơn, hệ thống khác KHÔNG BAO GIỜ biết\n" +
        "    // Đảo ngược thứ tự cũng không cứu được: Kafka xong, DB rollback -> sự kiện ma\n" +
        "}\n" +
        "\n" +
        "// OUTBOX: chỉ ghi vào MỘT hệ thống (DB), trong CÙNG transaction\n" +
        "@Transactional\n" +
        "public void placeOrder(Order o) {\n" +
        "    repo.save(o);\n" +
        "    outboxRepo.save(new OutboxEvent(\n" +
        "        UUID.randomUUID(), \"Order\", o.id(), \"OrderPlaced\", json(o)));\n" +
        "    // Cả hai cùng commit hoặc cùng rollback — DB lo hộ tính nguyên tử\n" +
        "}\n" +
        "// Một tiến trình riêng đọc bảng outbox và đẩy sang Kafka. Nó có thể gửi TRÙNG\n" +
        "// (crash sau khi gửi, trước khi đánh dấu) -> at-least-once, và consumer\n" +
        "// phải idempotent. Nhưng KHÔNG BAO GIỜ MẤT.",
    },
    {
      lang: "sql",
      title: "Bảng outbox",
      code:
        "CREATE TABLE outbox (\n" +
        "  id             UUID PRIMARY KEY,\n" +
        "  aggregate_type TEXT        NOT NULL,   -- \"Order\"\n" +
        "  aggregate_id   TEXT        NOT NULL,   -- dùng làm message key -> giữ thứ tự\n" +
        "  event_type     TEXT        NOT NULL,   -- \"OrderPlaced\"\n" +
        "  payload        JSONB       NOT NULL,\n" +
        "  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),\n" +
        "  published_at   TIMESTAMPTZ                        -- NULL = chưa gửi\n" +
        ");\n" +
        "\n" +
        "-- Index một phần: chỉ đánh index dòng chưa gửi -> luôn nhỏ và nhanh\n" +
        "CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;\n" +
        "\n" +
        "-- Publisher lấy việc, khoá dòng để nhiều instance không giành nhau\n" +
        "SELECT * FROM outbox WHERE published_at IS NULL\n" +
        "ORDER BY created_at LIMIT 100\n" +
        "FOR UPDATE SKIP LOCKED;",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Idempotent consumer với dedup store — thiết kế thế nào?',
  answer:
    'Mỗi message cần một **khoá idempotency** ổn định: id nghiệp vụ (`paymentId`), hoặc `(topic, partition, offset)`, hoặc hash nội dung.\n\n' +
    'Khi xử lý:\n' +
    '1. Trong cùng transaction với side-effect: kiểm tra khoá đã có trong bảng/`SET` dedup chưa.\n' +
    '2. Chưa có → thực hiện side-effect + ghi khoá.\n' +
    '3. Đã có → bỏ qua (đã xử lý rồi).\n\n' +
    'Dedup store cần TTL (Redis) hoặc dọn định kỳ; TTL phải dài hơn khoảng thời gian message có thể bị replay.',
  essence:
    'Dedup = "nhớ những gì đã làm, từ chối làm lại". Điểm mấu chốt: ghi khoá dedup và thực hiện side-effect phải **nguyên tử** với nhau, nếu không vẫn có kẽ hở.',
  example:
    'Consumer cộng điểm thưởng: `INSERT INTO processed(event_id) VALUES(?) ON CONFLICT DO NOTHING` — nếu insert được 1 dòng thì `UPDATE loyalty SET points = points + ?`; nếu 0 dòng thì message này đã xử lý, skip. Cả hai trong một transaction DB.',
  viz: {
    type: 'flow',
    title: 'Idempotent consumer với dedup store',
    nodes: ['message + khoá idempotency', 'transaction DB', 'khoá đã có trong dedup?', 'chưa: side-effect + ghi khoá', 'đã có: bỏ qua'],
    steps: [
      { to: 0, label: 'khoá = id nghiệp vụ, hoặc (topic, partition, offset), hoặc hash nội dung' },
      { to: 1, label: 'kiểm tra + side-effect + ghi khoá phải NGUYÊN TỬ với nhau' },
      { to: 3, label: 'INSERT ... ON CONFLICT DO NOTHING → nếu insert được thì apply' },
      { to: 4, label: '0 dòng → đã xử lý rồi. Dedup store cần TTL > khoảng thời gian có thể replay' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Khoá dedup, TTL, và chọn chỗ lưu",
      code:
        "// Khoá dedup phải ổn định qua các lần phát lại. Hai lựa chọn:\n" +
        "//  a) toạ độ Kafka: topic-partition-offset  -> ổn định, nhưng phát lại từ\n" +
        "//     producer (gửi lại message y hệt) sẽ có offset khác -> không khử được\n" +
        "//  b) id nghiệp vụ do producer sinh (eventId trong payload) -> tốt hơn\n" +
        "String dedupKey = event.eventId();\n" +
        "\n" +
        "// LƯU Ở DB — chắc chắn nhất, và dùng chung transaction với dữ liệu nghiệp vụ\n" +
        "@Transactional\n" +
        "public void handle(OrderEvent e) {\n" +
        "    int inserted = jdbc.update(\n" +
        "        \"INSERT INTO processed_events (id, at) VALUES (?, now()) ON CONFLICT DO NOTHING\",\n" +
        "        e.eventId());\n" +
        "    if (inserted == 0) return;        // đã xử lý -> bỏ qua, KHÔNG làm lại\n" +
        "    applyBusinessLogic(e);            // cùng transaction -> nguyên tử thật sự\n" +
        "}\n" +
        "\n" +
        "// LƯU Ở REDIS — nhanh hơn nhưng KHÔNG nguyên tử với DB\n" +
        "Boolean isNew = redis.opsForValue().setIfAbsent(\"dedup:\" + e.eventId(), \"1\", Duration.ofDays(7));\n" +
        "if (Boolean.FALSE.equals(isNew)) return;\n" +
        "// Rủi ro: set Redis xong rồi crash trước khi xử lý -> message bị BỎ QUA vĩnh viễn.\n" +
        "// -> chỉ dùng Redis khi mất một ít là chấp nhận được, hoặc set SAU khi xử lý xong.\n" +
        "\n" +
        "// TTL là bắt buộc: cửa sổ trùng lặp thực tế chỉ vài phút tới vài giờ,\n" +
        "// nhưng phải dài hơn retention của topic nếu có thể phát lại toàn bộ.\n" +
        "DELETE FROM processed_events WHERE at < now() - INTERVAL \u00277 days\u0027;",
    },
  ],
},
{
  cat: 'Exactly-once',
  q: 'EOS có nhược điểm gì? Khi nào KHÔNG nên dùng?',
  answer:
    'Chi phí:\n' +
    '- **Throughput/latency**: transaction thêm marker, coordinator round-trip, consumer `read_committed` phải chờ tới LSO.\n' +
    '- **Phức tạp vận hành**: quản lý `transactional.id`, `transaction.timeout.ms`, xử lý `ProducerFencedException`, transaction "treo" chặn LSO của consumer.\n' +
    '- Chỉ áp dụng trong phạm vi **Kafka-to-Kafka**; không mở rộng ra DB/HTTP bên ngoài.\n\n' +
    'Không nên dùng khi: consumer đã idempotent tự nhiên (UPSERT), hoặc side-effect là hệ thống ngoài (lúc đó dùng outbox + dedup).',
  essence:
    'EOS đắt và giới hạn trong biên giới Kafka. Nếu bạn có thể làm consumer idempotent, đó thường là giải pháp đơn giản, rẻ và mạnh hơn.',
  example:
    'Pipeline Kafka Streams thuần (topic→aggregate→topic): bật EOS v2, đáng giá. Consumer nạp dữ liệu vào Postgres: đừng dùng Kafka transaction — dùng UPSERT theo business key + lưu offset trong cùng transaction DB.',
  viz: {
    type: 'tree',
    title: 'EOS đắt và giới hạn trong biên giới Kafka',
    root: {
      label: 'Nếu consumer idempotent được → thường đơn giản, rẻ, mạnh hơn',
      children: [
        { label: 'Throughput/latency', note: 'marker, coordinator round-trip, read_committed chờ tới LSO' },
        { label: 'Phức tạp vận hành', note: 'transactional.id, transaction.timeout.ms, ProducerFencedException, tx treo' },
        { label: 'Chỉ Kafka-to-Kafka', note: 'không mở rộng ra DB/HTTP' },
        { label: 'Không nên khi', note: 'consumer đã idempotent (UPSERT), hoặc side-effect ra hệ ngoài → outbox + dedup' },
      ],
    },
  },
  demo: [
    {
      lang: "properties",
      title: "Cái giá của exactly-once",
      code:
        "processing.guarantee=exactly_once_v2     # Kafka Streams\n" +
        "# hoặc producer transactional + consumer read_committed\n" +
        "\n" +
        "# GIÁ PHẢI TRẢ:\n" +
        "# 1) ĐỘ TRỄ: consumer read_committed không đọc vượt qua LSO. Message nằm sẵn\n" +
        "#    trên đĩa nhưng phải chờ marker commit. Transaction dài = độ trễ dài.\n" +
        "# 2) THROUGHPUT: thêm marker record, thêm round-trip tới coordinator.\n" +
        "#    Thực tế giảm ~3-20% tuỳ kích thước transaction (transaction quá nhỏ thì\n" +
        "#    overhead marker chiếm tỉ trọng lớn).\n" +
        "# 3) VẬN HÀNH PHỨC TẠP: transaction TREO làm nghẽn cả partition tới hết\n" +
        "#    transaction.timeout.ms. Phải theo dõi và biết cách xử lý.\n" +
        "# 4) CHỈ TRONG PHẠM VI KAFKA: ghi ra DB/API bên ngoài thì transaction Kafka\n" +
        "#    không bao trùm được. Đây là hiểu nhầm phổ biến nhất về EOS.\n" +
        "# 5) transactional.id phải quản lý cẩn thận, nếu không fencing vô tác dụng.\n" +
        "\n" +
        "# KHI NÀO KHÔNG NÊN DÙNG:\n" +
        "#  - sink là hệ thống ngoài -> làm idempotent ở sink rẻ và bền hơn nhiều\n" +
        "#  - dữ liệu chịu được trùng (metric, log, cache warming)\n" +
        "#  - cần độ trễ thấp nhất có thể\n" +
        "#  - việc xử lý vốn đã idempotent (upsert theo khoá) -> EOS không thêm gì cả",
    },
  ],
},
{
  cat: 'Exactly-once',
  q: 'Kafka Streams đạt exactly-once bằng cách nào (`processing.guarantee`)?',
  answer:
    'Đặt `processing.guarantee=exactly_once_v2`. Mỗi task Streams dùng một transactional producer. Trong một chu kỳ commit, nó **atomically**:\n' +
    '- Ghi các record output.\n' +
    '- Ghi cập nhật **state store** vào topic changelog.\n' +
    '- Commit offset của input.\n\n' +
    'Nếu crash giữa chừng: transaction abort, state store được khôi phục từ changelog về đúng điểm commit trước, input xử lý lại. Kết quả cuối cùng như thể mỗi record xử lý đúng một lần.\n\n' +
    '`v2` (Kafka 2.6+) dùng một producer cho mỗi instance thay vì mỗi task → ít tài nguyên hơn `v1`.',
  essence:
    'Streams gói output + thay đổi state + offset vào một transaction. State (đếm, join, window) và stream ra ngoài luôn nhất quán với nhau kể cả khi lỗi.',
  example:
    'Đếm số đơn hàng theo cửa hàng: với at-least-once, replay sau crash đếm dư. Với EOS v2, sau khi khôi phục, `count` phản ánh đúng số đơn hàng distinct — không cộng lại những đơn đã tính.',
  viz: {
    type: 'flow',
    title: 'Kafka Streams EOS (processing.guarantee = exactly_once_v2)',
    nodes: ['chu kỳ commit', 'ghi record output', 'ghi cập nhật state store → changelog', 'commit offset input'],
    steps: [
      { to: 1, label: 'mỗi task Streams dùng một transactional producer — 3 bước ATOMICALLY' },
      { to: 3, label: 'crash giữa chừng → abort, state khôi phục từ changelog về điểm commit trước, input xử lý lại' },
      { to: 3, label: 'state (đếm, join, window) và stream ra ngoài luôn nhất quán; v2 = 1 producer/instance (nhẹ hơn v1)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một dòng cấu hình, và nó lo phần còn lại",
      code:
        "Properties p = new Properties();\n" +
        "p.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);\n" +
        "p.put(StreamsConfig.APPLICATION_ID_CONFIG, \"order-aggregator\");   // -> transactional.id\n" +
        "\n" +
        "// Streams tự làm những việc sau trong MỘT transaction cho mỗi lô:\n" +
        "//  1) ghi kết quả ra topic đầu ra\n" +
        "//  2) ghi thay đổi state store ra CHANGELOG TOPIC\n" +
        "//  3) commit offset của topic đầu vào (sendOffsetsToTransaction)\n" +
        "// -> ba thứ này cùng thành công hoặc cùng bị huỷ. Đây là điểm mạnh nhất\n" +
        "// của Streams so với tự viết consumer: state store cũng được bao gồm.\n" +
        "\n" +
        "StreamsBuilder b = new StreamsBuilder();\n" +
        "b.stream(\"orders\")\n" +
        " .groupByKey()\n" +
        " .count(Materialized.as(\"order-counts\"))   // state store, có changelog\n" +
        " .toStream()\n" +
        " .to(\"order-counts-topic\");\n" +
        "\n" +
        "// EOS_V2 (Kafka 2.5+) dùng MỘT producer cho mỗi instance thay vì mỗi\n" +
        "// task -> giảm mạnh số transaction và tài nguyên so với exactly_once cũ.\n" +
        "// Cần broker >= 2.5.\n" +
        "\n" +
        "p.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, \"100\");\n" +
        "// Với EOS, commit interval quyết định độ trễ end-to-end (mặc định 100ms\n" +
        "// khi bật EOS, thay vì 30 giây). Tăng lên -> throughput tốt hơn, trễ hơn.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Làm sao vừa giữ thứ tự, vừa exactly-once, vừa throughput?',
  answer:
    '- **Thứ tự trong partition**: `enable.idempotence=true` cho phép `max.in.flight.requests.per.connection ≤ 5` mà không đảo thứ tự khi retry.\n' +
    '- **Exactly-once**: transactions + `read_committed`, hoặc consumer idempotent.\n' +
    '- **Throughput**: batching (`linger.ms`, `batch.size`), nén, đủ partition, transaction không quá nhỏ (mỗi transaction gồm một lô, không phải một message).\n\n' +
    'Consumer: xử lý tuần tự trong một partition; song song bằng nhiều partition, không bằng thread pool trên một partition (trừ khi phân theo key).',
  essence:
    'Ba yêu cầu này không mâu thuẫn nếu: idempotence bật, transaction ở mức lô, song song ở mức partition. Chúng chỉ xung đột khi bạn cố song song bên trong một partition.',
  example:
    'Pipeline sổ cái: 24 partition (key = accountId), idempotent + transactional producer, mỗi transaction commit một lô ~1000 record, consumer `read_committed` xử lý tuần tự mỗi partition. Thứ tự per-account đảm bảo, không trùng, ~vài trăm nghìn msg/s.',
  viz: {
    type: 'tree',
    title: 'Thứ tự + EOS + throughput không mâu thuẫn nếu…',
    root: {
      label: 'Chỉ xung đột khi cố song song BÊN TRONG một partition',
      children: [
        { label: 'Thứ tự', note: 'enable.idempotence=true cho phép max.in.flight ≤ 5 không đảo thứ tự' },
        { label: 'Exactly-once', note: 'transaction ở mức LÔ (không phải 1 message) + read_committed' },
        { label: 'Throughput', note: 'batching, nén, đủ partition' },
        { label: 'Song song', note: 'ở mức partition; nhiều partition, không thread pool trên 1 partition' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba mục tiêu không mâu thuẫn nếu phân vùng đúng",
      code:
        "// Chìa khoá: THỨ TỰ chỉ cần trong phạm vi một THỰC THỂ, không phải toàn hệ thống.\n" +
        "// Chọn key đúng thì cả ba mục tiêu đạt được cùng lúc.\n" +
        "\n" +
        "// 1) THỨ TỰ: mọi message của một thực thể vào cùng partition\n" +
        "producer.send(new ProducerRecord<>(\"orders\", order.id(), json));   // key = id đơn hàng\n" +
        "\n" +
        "// 2) EXACTLY-ONCE: idempotence + transaction (hoặc idempotent ở sink)\n" +
        "p.put(\"enable.idempotence\", \"true\");\n" +
        "p.put(\"max.in.flight.requests.per.connection\", \"5\");   // vẫn giữ thứ tự nhờ sequence\n" +
        "p.put(\"acks\", \"all\");\n" +
        "\n" +
        "// 3) THROUGHPUT: song song theo PARTITION, không phải theo message\n" +
        "p.put(\"linger.ms\", \"20\");\n" +
        "p.put(\"batch.size\", \"65536\");\n" +
        "p.put(\"compression.type\", \"lz4\");\n" +
        "// Phía consumer: nhiều consumer, mỗi consumer nhiều partition;\n" +
        "// trong một partition thì xử lý TUẦN TỰ để giữ thứ tự.\n" +
        "\n" +
        "// Vượt trần partition mà vẫn giữ thứ tự: phân luồng theo key trong một consumer\n" +
        "int slot = Math.abs(r.key().hashCode()) % workers.length;\n" +
        "workers[slot].submit(() -> process(r));   // cùng key -> cùng worker -> đúng thứ tự\n" +
        "// Kèm theo: pause()/resume() và chỉ commit tới offset mà MỌI worker đã xong.\n" +
        "\n" +
        "// Cái KHÔNG đạt được: thứ tự TOÀN CỤC trên nhiều partition + throughput cao.\n" +
        "// Muốn thứ tự toàn cục thì phải 1 partition -> mất hết song song. Hầu như\n" +
        "// không nghiệp vụ nào thật sự cần điều đó.",
    },
  ],
},
{
  cat: 'Exactly-once',
  q: '`transaction.timeout.ms` và transaction "treo" (hanging) là gì?',
  answer:
    '`transaction.timeout.ms` (producer, mặc định 60s; ≤ `transaction.max.timeout.ms` của broker): nếu producer mở transaction mà không commit/abort trong thời gian này, **coordinator tự abort** nó.\n\n' +
    '**Hanging transaction**: producer chết đột ngột giữa transaction, hoặc bug khiến không bao giờ commit. Message của nó nằm sau LSO → consumer `read_committed` **bị chặn**, không đọc tiếp partition đó cho tới khi transaction được resolve (thường bởi timeout hoặc producer mới cùng `transactional.id` với epoch cao hơn).',
  essence:
    'Transaction chưa kết thúc là "rào chắn" với consumer read_committed. Timeout là van an toàn để rào chắn đó không tồn tại vĩnh viễn.',
  example:
    'Consumer lag của một pipeline EOS đột nhiên đứng im dù producer vẫn ghi: kiểm tra transaction treo (`kafka-transactions.sh --list`). Producer bị OOM giữa transaction → sau `transaction.timeout.ms` coordinator abort → consumer thông luồng trở lại.',
  viz: {
    type: 'flow',
    title: 'Hanging transaction chặn consumer read_committed',
    nodes: ['producer mở transaction', 'không commit/abort (chết đột ngột)', 'message nằm sau LSO', 'consumer read_committed bị chặn', 'coordinator abort sau transaction.timeout.ms'],
    steps: [
      { to: 2, label: 'transaction chưa kết thúc = "rào chắn" với consumer' },
      { to: 3, label: 'consumer không đọc tiếp partition đó tới khi transaction được resolve' },
      { to: 4, label: 'timeout (mặc định 60s) là van an toàn — hoặc producer mới cùng transactional.id epoch cao hơn' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Transaction treo và cách xử lý",
      code:
        "# transaction.timeout.ms (producer, mặc định 60s): coordinator chờ tối đa bao lâu\n" +
        "# trước khi tự ABORT một transaction đang mở.\n" +
        "# Bị chặn trên bởi broker: transaction.max.timeout.ms (mặc định 15 phút).\n" +
        "\n" +
        "# TRANSACTION TREO xảy ra khi producer chết giữa beginTransaction() và\n" +
        "# commit/abort. Hậu quả nghiêm trọng: LSO của partition đó đứng yên ->\n" +
        "# consumer read_committed KHÔNG đọc được gì thêm, dù dữ liệu mới vẫn đổ vào.\n" +
        "# Triệu chứng điển hình: lag tăng đều mà consumer hoàn toàn khoẻ mạnh.\n" +
        "\n" +
        "kafka-transactions.sh --bootstrap-server localhost:9092 list\n" +
        "kafka-transactions.sh --bootstrap-server localhost:9092 \\\n" +
        "  describe --transactional-id payment-processor-1\n" +
        "\n" +
        "# Tìm transaction treo lâu hơn ngưỡng:\n" +
        "kafka-transactions.sh --bootstrap-server localhost:9092 \\\n" +
        "  find-hanging --broker-id 1 --max-transaction-timeout 900000\n" +
        "\n" +
        "# Ép abort (chỉ khi đã chắc producer đó chết hẳn):\n" +
        "kafka-transactions.sh --bootstrap-server localhost:9092 \\\n" +
        "  abort --topic orders --partition 3 --start-offset 12345\n" +
        "\n" +
        "# PHÒNG hơn chống: đặt transaction.timeout.ms ngắn (30-60s), giữ transaction\n" +
        "# NHỎ, và luôn có abortTransaction() trong khối catch.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'So sánh Kafka EOS với distributed transaction (2PC/XA)?',
  answer:
    '**2PC/XA**: coordinator hỏi tất cả participant "sẵn sàng?" (prepare), rồi "commit". Blocking: nếu coordinator chết sau prepare, participant giữ khoá chờ vô hạn. Kém scale, latency cao, hầu hết hệ phân tán hiện đại tránh.\n\n' +
    '**Kafka EOS**: không phải 2PC. Nó chỉ nguyên tử **trong Kafka** (message + offset + state changelog), dùng marker + epoch fencing, không giữ khoá phân tán. Không bao trùm DB/HTTP.\n\n' +
    'Cho hệ đa thành phần: dùng **saga** (chuỗi bước bù trừ) hoặc **outbox**, không dùng 2PC.',
  essence:
    'Kafka EOS là "atomic trong một hệ thống" chứ không phải "atomic across hệ thống". Để nhất quán nhiều hệ thống, dùng saga/outbox + idempotency, không dùng transaction phân tán.',
  example:
    'Đặt hàng chạm cả payment service + inventory service + email: không có transaction toàn cục. Dùng saga: `OrderPlaced` → `PaymentProcessed` → `InventoryReserved`; nếu inventory fail thì phát `PaymentRefund` (bước bù trừ).',
  viz: {
    type: 'compare',
    cols: ['Kafka EOS', '2PC / XA'],
    rows: [
      ['Phạm vi', 'chỉ trong Kafka (message + offset + changelog)', 'nhiều participant (DB, MQ…)'],
      ['Cơ chế', 'marker + epoch fencing, không giữ khoá', 'prepare/commit, giữ khoá'],
      ['Khi coordinator chết', 'timeout tự abort', 'participant chờ vô hạn (blocking)'],
      ['Cho hệ đa thành phần', 'không — dùng saga / outbox', 'tránh trong hệ hiện đại'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai cách giải cùng một bài toán, chi phí rất khác",
      code:
        "// 2PC/XA: một transaction manager điều phối NHIỀU hệ thống khác nhau\n" +
        "UserTransaction tx = ctx.lookup(\"java:comp/UserTransaction\");\n" +
        "tx.begin();\n" +
        "jdbcResource.insert(order);      // DB\n" +
        "jmsResource.send(message);       // message broker\n" +
        "tx.commit();                     // hai pha: prepare tất cả -> commit tất cả\n" +
        "// VẤN ĐỀ:\n" +
        "//  - KHOÁ tài nguyên suốt cả hai pha -> throughput thấp\n" +
        "//  - coordinator chết giữa hai pha -> tài nguyên bị khoá treo, phải can thiệp tay\n" +
        "//  - mọi hệ thống tham gia phải hỗ trợ XA (nhiều DB/API hiện đại thì không)\n" +
        "//  - không mở rộng được ra quy mô lớn\n" +
        "\n" +
        "// KAFKA EOS: KHÔNG phải distributed transaction. Nó chỉ nguyên tử TRONG Kafka.\n" +
        "producer.beginTransaction();\n" +
        "producer.send(recordA);                                   // topic A\n" +
        "producer.send(recordB);                                   // topic B\n" +
        "producer.sendOffsetsToTransaction(offsets, groupMetadata); // offset\n" +
        "producer.commitTransaction();\n" +
        "// Rẻ hơn nhiều vì: không khoá gì cả (chỉ append + marker), coordinator là\n" +
        "// một broker Kafka bình thường, trạng thái nằm trong một topic có nhân bản.\n" +
        "\n" +
        "// Ra ngoài Kafka thì dùng gì: OUTBOX (một transaction DB duy nhất) hoặc\n" +
        "// SAGA (chuỗi bước có bù trừ). Cả hai đều chấp nhận trạng thái trung gian\n" +
        "// và tính nhất quán cuối cùng, đổi lại là khả năng mở rộng.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Message key ảnh hưởng thế nào tới dedup và compaction?',
  answer:
    'Key là đơn vị cho **compaction** (giữ bản mới nhất mỗi key) và thường là **khoá idempotency tự nhiên** cho consumer.\n\n' +
    'Nếu producer đặt key = business id (`orderId`), thì:\n' +
    '- Topic compact tự giữ trạng thái mới nhất của mỗi order.\n' +
    '- Consumer có thể dedup theo key hoặc dùng key làm `_id` khi ghi ra store idempotent.\n\n' +
    'Key ngẫu nhiên/UUID mỗi message → mất khả năng compaction, mất khoá dedup tự nhiên, phải sinh khoá idempotency riêng.',
  essence:
    'Chọn key có ý nghĩa nghiệp vụ mở khoá "miễn phí" cả compaction lẫn dedup. Key vô nghĩa buộc bạn tự xây các cơ chế đó.',
  example:
    'Topic `account-balance` (compact), key = `accountId`, value = số dư mới nhất. Service mới đọc từ đầu có ngay số dư hiện tại mọi tài khoản. Consumer ghi vào cache dùng `accountId` làm key → replay là ghi đè, không cộng dồn.',
  viz: {
    type: 'compare',
    cols: ['key = business id (orderId)', 'key ngẫu nhiên / UUID mỗi message'],
    rows: [
      ['Compaction', 'giữ trạng thái mới nhất mỗi thực thể', 'mất khả năng compaction'],
      ['Khoá dedup', 'có sẵn (tự nhiên)', 'phải sinh khoá idempotency riêng'],
      ['Ghi ra store idempotent', 'dùng key làm _id → replay là ghi đè', 'không'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Key là danh tính bản ghi, không chỉ là cách chia partition",
      code:
        "// COMPACTION: key chính là danh tính. Kafka giữ bản ghi MỚI NHẤT của mỗi key.\n" +
        "producer.send(new ProducerRecord<>(\"user-profiles\", \"user-7\", v1));\n" +
        "producer.send(new ProducerRecord<>(\"user-profiles\", \"user-7\", v2));\n" +
        "// sau compaction chỉ còn v2. key = null trên topic compacted -> InvalidRecordException.\n" +
        "\n" +
        "producer.send(new ProducerRecord<>(\"user-profiles\", \"user-7\", null));   // tombstone: xoá\n" +
        "\n" +
        "// DEDUP: chọn key sai thì trùng lặp không khử được đúng.\n" +
        "//  - key = id thực thể (order-123): mọi thay đổi của đơn đó cùng partition\n" +
        "//    -> consumer thấy đúng thứ tự -> upsert cho kết quả đúng\n" +
        "//  - key = ngẫu nhiên/null: hai bản của cùng một đơn rơi vào hai partition\n" +
        "//    -> hai consumer xử lý song song -> ghi đè lẫn nhau theo thứ tự ngẫu nhiên\n" +
        "\n" +
        "// ĐÂY LÀ MỘT KEY TỆ cho topic compacted:\n" +
        "producer.send(new ProducerRecord<>(\"events\", UUID.randomUUID().toString(), v));\n" +
        "// mỗi message một key duy nhất -> compaction KHÔNG bao giờ nén được gì\n" +
        "// -> topic phình vô hạn mà vẫn mang tiếng là \"compacted\".\n" +
        "\n" +
        "// Quy tắc: key trên topic compacted = khoá chính của thực thể.\n" +
        "// Key trên topic sự kiện = thứ mà bạn cần giữ thứ tự theo nó.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Xử lý poison message trong pipeline exactly-once mà không phá EOS?',
  answer:
    'Poison message (không deserialize được / luôn ném exception) trong transaction: nếu bạn abort transaction để "bỏ qua" thì cả lô bị xử lý lại → kẹt vĩnh viễn.\n\n' +
    'Cách làm: bắt exception cho **từng record**, không để nó làm hỏng cả transaction. Record độc → gửi sang **DLQ topic** (vẫn trong transaction đang mở, như một output hợp lệ), rồi commit transaction bình thường (offset tiến qua record độc).\n\n' +
    'Spring Kafka: `DefaultErrorHandler` + `DeadLetterPublishingRecoverer` phối hợp với `KafkaTransactionManager`.',
  essence:
    'Đừng abort transaction vì một record xấu. Biến "xử lý thất bại" thành "output hợp lệ = gửi vào DLQ", để offset vẫn tiến và EOS vẫn nguyên vẹn cho phần còn lại.',
  example:
    'Lô 500 record, record thứ 200 sai schema: catch `SerializationException`, `producer.send(dlqRecord)` trong cùng transaction, tiếp tục record 201–500, `commitTransaction`. Offset qua 200, pipeline không kẹt, record độc nằm ở DLQ chờ điều tra.',
  viz: {
    type: 'flow',
    title: 'Poison message trong pipeline EOS — đừng abort transaction',
    nodes: ['xử lý từng record', 'record độc → catch exception', 'send(dlqRecord) trong transaction đang mở', 'tiếp tục record còn lại', 'commitTransaction (offset qua record độc)'],
    steps: [
      { to: 1, label: 'bắt exception cho TỪNG record, không để hỏng cả transaction' },
      { to: 2, label: '"xử lý thất bại" → "output hợp lệ = gửi DLQ"' },
      { to: 4, label: 'offset vẫn tiến, EOS nguyên vẹn cho phần còn lại, pipeline không kẹt' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tách message xấu ra mà không phá vỡ transaction",
      code:
        "// VẤN ĐỀ: trong pipeline EOS, một message không xử lý được sẽ làm abort cả\n" +
        "// transaction -> lô đó chạy lại -> gặp lại đúng message đó -> LẶP VÔ HẠN,\n" +
        "// và partition đứng im hoàn toàn.\n" +
        "\n" +
        "producer.beginTransaction();\n" +
        "try {\n" +
        "    for (var r : records) {\n" +
        "        try {\n" +
        "            producer.send(new ProducerRecord<>(\"out\", r.key(), transform(r.value())));\n" +
        "        } catch (DeserializationException | ValidationException e) {\n" +
        "            // MẤU CHỐT: gửi vào DLQ NGAY TRONG CÙNG TRANSACTION.\n" +
        "            // Không ném ra ngoài -> transaction vẫn commit -> offset vẫn tiến.\n" +
        "            producer.send(new ProducerRecord<>(\"out-dlq\", r.key(), r.value()));\n" +
        "            metrics.increment(\"poison.message\");\n" +
        "        }\n" +
        "    }\n" +
        "    producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());\n" +
        "    producer.commitTransaction();\n" +
        "} catch (KafkaException e) {          // chỉ abort với lỗi HẠ TẦNG\n" +
        "    producer.abortTransaction();\n" +
        "}\n" +
        "// Nguyên tắc: lỗi DỮ LIỆU -> chuyển sang DLQ trong transaction, tiếp tục chạy.\n" +
        "//             lỗi HẠ TẦNG -> abort và thử lại nguyên lô.\n" +
        "\n" +
        "// Với Kafka Streams, cùng ý tưởng qua handler:\n" +
        "p.put(StreamsConfig.DEFAULT_DESERIALIZATION_EXCEPTION_HANDLER_CLASS_CONFIG,\n" +
        "      LogAndContinueExceptionHandler.class);   // hoặc tự viết để đẩy vào DLQ",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: '"Effectively-once" và tranh luận quanh "exactly-once"?',
  answer:
    'Có ý kiến cho rằng "exactly-once delivery" là bất khả thi trong hệ phân tán (two generals problem) — bạn không thể đảm bảo message được *gửi* đúng một lần qua mạng không tin cậy.\n\n' +
    'Điều Kafka thực sự cung cấp là **exactly-once processing / effectively-once**: message có thể được *truyền* nhiều lần, nhưng **hiệu ứng** (state, output) chỉ xảy ra một lần, nhờ idempotence + atomic commit.\n\n' +
    'Về mặt thực dụng, đó là điều người dùng cần: kết quả đúng, không phải số lần byte đi qua dây.',
  essence:
    'Không thể "gửi đúng một lần"; có thể "tác động đúng một lần". EOS của Kafka là về tính đúng đắn của kết quả cuối, không phải về đếm số lần chuyển giao vật lý.',
  example:
    'Đếm lượt xem video: dù sự kiện `view` được retry/replay, nhờ dedup theo `(userId, videoId, sessionId)` con số cuối cùng đúng bằng số lượt xem thật. "Delivery" có thể trùng, "count" thì không.',
  viz: {
    type: 'compare',
    cols: ['"exactly-once delivery"', '"effectively-once processing"'],
    rows: [
      ['Có khả thi?', 'không (two generals problem)', 'có'],
      ['Nói về', 'số lần message đi qua dây', 'hiệu ứng (state, output)'],
      ['Kafka cung cấp', '—', 'message truyền nhiều lần, hiệu ứng 1 lần (idempotence + atomic commit)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Vì sao \"đúng một lần\" là nói về HIỆU ỨNG, không phải về số lần gửi",
      code:
        "// Định lý Two Generals: trên mạng không tin cậy, KHÔNG THỂ đảm bảo một\n" +
        "// message được gửi và xác nhận đúng một lần. Ack có thể mất, và bên gửi\n" +
        "// không bao giờ phân biệt được \"chưa tới\" với \"tới rồi nhưng ack mất\".\n" +
        "\n" +
        "// Nên cái Kafka làm KHÔNG phải \"gửi đúng một lần\" mà là:\n" +
        "//  1) gửi nhiều lần (retry) — chấp nhận điều đó\n" +
        "//  2) khử trùng bằng PID + sequence\n" +
        "//  3) làm cho HIỆU ỨNG chỉ xảy ra một lần (nguyên tử/idempotent)\n" +
        "// -> \"effectively-once\" mô tả đúng bản chất hơn.\n" +
        "\n" +
        "// Và giới hạn quan trọng nhất: EOS chỉ áp dụng TRONG Kafka.\n" +
        "producer.beginTransaction();\n" +
        "producer.send(new ProducerRecord<>(\"out\", key, value));   // trong transaction\n" +
        "httpClient.post(\"https://api.doi-tac.com/charge\", body);  // NGOÀI transaction!\n" +
        "producer.commitTransaction();\n" +
        "// Transaction abort -> record Kafka bị huỷ, nhưng tiền ĐÃ TRỪ ở đối tác.\n" +
        "// -> Ra ngoài Kafka thì phải dùng idempotency key ở phía API.\n" +
        "\n" +
        "// Kết luận thực dụng: đừng hỏi \"có exactly-once không\", hãy hỏi\n" +
        "// \"hiệu ứng của việc xử lý lại một message có gây sai lệch không\".\n" +
        "// Nếu không -> at-least-once + idempotent là đủ, và đơn giản hơn nhiều.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Saga pattern là gì? Choreography vs orchestration?',
  answer:
    'Saga: một transaction nghiệp vụ dài trải nhiều service được chia thành chuỗi **local transaction**, mỗi bước phát sự kiện kích hoạt bước sau. Nếu một bước fail → chạy các **compensating action** (bù trừ) để hoàn tác các bước trước.\n\n' +
    '- **Choreography**: không có điều phối viên trung tâm — mỗi service lắng nghe sự kiện và tự quyết định bước tiếp/bù trừ. Đơn giản với ít bước, nhưng luồng khó nhìn tổng thể khi nhiều service.\n' +
    '- **Orchestration**: một **saga orchestrator** (state machine) điều khiển: gọi từng bước, nhận kết quả, quyết định tiếp/bù. Dễ quan sát và sửa, nhưng thêm một thành phần.',
  essence:
    'Saga thay "transaction phân tán nguyên tử" (bất khả thi/đắt) bằng "eventual consistency có bù trừ". Choreography phân tán quyết định qua sự kiện; orchestration tập trung quyết định vào một state machine.',
  example:
    'Đặt tour: `reserve-flight` → `reserve-hotel` → `charge-card`. Nếu `charge-card` fail: phát `PaymentFailed` → hotel service `cancel-hotel`, flight service `cancel-flight`. Orchestrator (Temporal/Camunda hoặc service tự viết) theo dõi trạng thái saga và retry/bù đúng thứ tự.',
  viz: {
    type: 'compare',
    cols: ['Choreography', 'Orchestration'],
    rows: [
      ['Điều phối', 'không có trung tâm — mỗi service nghe sự kiện', 'saga orchestrator (state machine) điều khiển'],
      ['Ưu', 'đơn giản với ít bước', 'dễ quan sát & sửa'],
      ['Nhược', 'luồng khó nhìn tổng thể khi nhiều service', 'thêm một thành phần'],
      ['Bù trừ', 'mỗi service tự quyết định', 'orchestrator quyết định thứ tự bù'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chuỗi transaction cục bộ + bước bù trừ",
      code:
        "// Saga thay thế distributed transaction: mỗi bước là một transaction CỤC BỘ,\n" +
        "// mỗi bước có một hành động BÙ TRỪ để quay lui khi bước sau thất bại.\n" +
        "\n" +
        "// CHOREOGRAPHY — mỗi service nghe sự kiện và tự quyết bước tiếp theo\n" +
        "@KafkaListener(topics = \"order-created\")\n" +
        "public void onOrderCreated(OrderCreated e) {\n" +
        "    try {\n" +
        "        payment.charge(e.orderId(), e.amount());\n" +
        "        producer.send(new ProducerRecord<>(\"payment-succeeded\", e.orderId(), json));\n" +
        "    } catch (PaymentFailedException ex) {\n" +
        "        producer.send(new ProducerRecord<>(\"payment-failed\", e.orderId(), json));\n" +
        "    }\n" +
        "}\n" +
        "@KafkaListener(topics = \"payment-failed\")\n" +
        "public void compensate(PaymentFailed e) { orderService.cancel(e.orderId()); }  // bù trừ\n" +
        "// + không có điểm nghẽn trung tâm, service tách rời hoàn toàn\n" +
        "// - luồng nghiệp vụ nằm RẢI RÁC, không ai nhìn thấy toàn cảnh; dễ tạo vòng lặp sự kiện\n" +
        "\n" +
        "// ORCHESTRATION — một service điều phối giữ toàn bộ luồng\n" +
        "public void execute(String orderId) {\n" +
        "    var saga = sagaRepo.create(orderId);\n" +
        "    try {\n" +
        "        saga.step(\"payment\",   () -> payment.charge(orderId));\n" +
        "        saga.step(\"inventory\", () -> inventory.reserve(orderId));\n" +
        "        saga.step(\"shipping\",  () -> shipping.schedule(orderId));\n" +
        "    } catch (Exception e) {\n" +
        "        saga.compensateAll();      // chạy ngược các bước đã xong\n" +
        "    }\n" +
        "}\n" +
        "// + luồng tường minh ở MỘT chỗ, dễ debug và giám sát\n" +
        "// - orchestrator thành điểm phụ thuộc chung, và cần lưu trạng thái bền\n" +
        "// Chọn: dưới 3-4 bước -> choreography. Nhiều bước, cần nhìn thấy trạng thái\n" +
        "// -> orchestration (Temporal, Camunda, hoặc tự viết trên state machine).",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Idempotency key ở biên API (HTTP) hoạt động thế nào?',
  answer:
    'Client gửi header `Idempotency-Key: <uuid>` cho các request không an toàn (POST tạo tài nguyên/thanh toán). Server:\n' +
    '1. Tra key trong store (Redis/DB, có TTL).\n' +
    '2. Chưa thấy → xử lý, **lưu key + response** (trạng thái + body), trả kết quả.\n' +
    '3. Thấy rồi, đã hoàn tất → trả lại **response đã lưu**, không xử lý lại.\n' +
    '4. Thấy rồi, đang xử lý → trả 409/425 (yêu cầu client chờ/retry).\n\n' +
    'Bảo vệ trước retry của client, double-click, timeout-rồi-thử-lại.',
  essence:
    'Idempotency key biến "gửi lại request giống hệt" thành vô hại — server nhận ra và trả kết quả cũ. Đây là "idempotent producer" phiên bản HTTP, do ứng dụng tự làm.',
  example:
    'Payment API: mobile app timeout sau 30s dù server đã charge thành công → app retry cùng `Idempotency-Key` → server trả lại `201` với payment id cũ, **không** charge lần hai. Stripe, PayPal đều dùng cơ chế này.',
  viz: {
    type: 'flow',
    title: 'Idempotency-Key ở biên API (HTTP)',
    nodes: ['client gửi Idempotency-Key: <uuid>', 'server tra key trong store (TTL)', 'chưa thấy: xử lý + lưu key + response', 'thấy, đã xong: trả response đã lưu', 'thấy, đang xử lý: 409/425'],
    steps: [
      { to: 0, label: 'cho request không an toàn (POST tạo tài nguyên / thanh toán)' },
      { to: 2, label: 'lần đầu → xử lý thật, lưu (trạng thái + body)' },
      { to: 3, label: 'retry / double-click / timeout-rồi-thử-lại → trả kết quả cũ, KHÔNG charge lần 2' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chống trùng ở nơi request đi vào hệ thống",
      code:
        "// Client sinh key (mỗi Ý ĐỊNH một key, giữ nguyên khi retry) và gửi kèm:\n" +
        "//   POST /payments\n" +
        "//   Idempotency-Key: 8f3a-...-c21b\n" +
        "@PostMapping(\"/payments\")\n" +
        "public ResponseEntity<PaymentResult> pay(\n" +
        "        @RequestHeader(\"Idempotency-Key\") String key,\n" +
        "        @RequestBody PaymentRequest req) {\n" +
        "\n" +
        "    // 1) Cố GIÀNH CHỖ cho key này — atomic, chống cả hai request đồng thời\n" +
        "    boolean acquired = jdbc.update(\"\"\"\n" +
        "        INSERT INTO idempotency (key, request_hash, status, created_at)\n" +
        "        VALUES (?, ?, \u0027IN_PROGRESS\u0027, now()) ON CONFLICT DO NOTHING\n" +
        "        \"\"\", key, hash(req)) == 1;\n" +
        "\n" +
        "    if (!acquired) {\n" +
        "        var existing = repo.find(key);\n" +
        "        // 2) Cùng key nhưng payload KHÁC -> client dùng sai key\n" +
        "        if (!existing.requestHash().equals(hash(req)))\n" +
        "            return ResponseEntity.status(422).build();\n" +
        "        // 3) Đang xử lý -> bảo client thử lại sau, ĐỪNG xử lý song song\n" +
        "        if (existing.status() == IN_PROGRESS)\n" +
        "            return ResponseEntity.status(409).header(\"Retry-After\", \"2\").build();\n" +
        "        // 4) Đã xong -> trả về ĐÚNG kết quả cũ, không làm lại\n" +
        "        return ResponseEntity.ok(existing.response());\n" +
        "    }\n" +
        "\n" +
        "    PaymentResult result = paymentService.charge(req);\n" +
        "    jdbc.update(\"UPDATE idempotency SET status=\u0027DONE\u0027, response=? WHERE key=?\",\n" +
        "                json(result), key);\n" +
        "    return ResponseEntity.ok(result);\n" +
        "}\n" +
        "// TTL 24-48h là đủ cho mọi retry hợp lý. Đây là cách Stripe, PayPal làm.",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Transactional outbox: polling publisher vs CDC (Debezium)?',
  answer:
    'Cả hai đọc bảng `outbox` (được ghi cùng transaction với dữ liệu nghiệp vụ) và publish lên Kafka.\n\n' +
    '- **Polling publisher**: một job định kỳ `SELECT * FROM outbox WHERE published = false ORDER BY id LIMIT n`, publish, rồi `UPDATE published = true` (hoặc xoá). Đơn giản, không thêm hạ tầng, nhưng có độ trễ polling và tải DB.\n' +
    '- **CDC (Debezium)**: đọc **WAL/binlog** của DB, phát mỗi INSERT vào `outbox` thành sự kiện Kafka. Độ trễ thấp (~ms), không query DB, nhưng cần vận hành Kafka Connect + Debezium.',
  essence:
    'Cùng một pattern outbox, khác cơ chế "chuyển tiếp": polling đơn giản/độ trễ cao; CDC realtime/hạ tầng nặng hơn. Cả hai đều biến dual-write thành single-write + relay.',
  example:
    'Hệ nhỏ, vài sự kiện/giây, chấp nhận độ trễ 1–2s: polling publisher (một `@Scheduled`). Hệ nhiều service, cần sự kiện realtime, đã có Kafka Connect: Debezium đọc bảng `outbox`, `EventRouter` SMT tách message theo `aggregate_type` sang đúng topic.',
  viz: {
    type: 'compare',
    cols: ['Polling publisher', 'CDC (Debezium)'],
    rows: [
      ['Cơ chế chuyển tiếp', 'job định kỳ SELECT ... WHERE published=false', 'đọc WAL/binlog của DB'],
      ['Độ trễ', 'cao (polling interval)', 'thấp (~ms)'],
      ['Tải DB', 'có (query)', 'không'],
      ['Hạ tầng', 'không thêm (một @Scheduled)', 'Kafka Connect + Debezium'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai cách đẩy outbox lên Kafka",
      code:
        "// CÁCH 1: POLLING PUBLISHER — job định kỳ quét bảng outbox\n" +
        "@Scheduled(fixedDelay = 500)\n" +
        "@Transactional\n" +
        "public void publish() {\n" +
        "    var events = jdbc.query(\"\"\"\n" +
        "        SELECT * FROM outbox WHERE published_at IS NULL\n" +
        "        ORDER BY created_at LIMIT 100\n" +
        "        FOR UPDATE SKIP LOCKED\n" +
        "        \"\"\", mapper);                      // SKIP LOCKED: nhiều instance không giành nhau\n" +
        "    for (var e : events) {\n" +
        "        producer.send(new ProducerRecord<>(\"orders\", e.aggregateId(), e.payload()));\n" +
        "        jdbc.update(\"UPDATE outbox SET published_at = now() WHERE id = ?\", e.id());\n" +
        "    }\n" +
        "}\n" +
        "// + đơn giản, không thêm hạ tầng, dễ hiểu dễ debug\n" +
        "// - thêm tải cho DB (poll liên tục), độ trễ = chu kỳ poll,\n" +
        "//   và crash giữa send với update -> gửi trùng (chấp nhận được, cần idempotent)\n" +
        "\n" +
        "// CÁCH 2: CDC — Debezium đọc WAL/binlog của DB, KHÔNG truy vấn bảng\n" +
        "// + độ trễ mili-giây, gần như không thêm tải cho DB, không mất sự kiện nào\n" +
        "// - thêm Kafka Connect + Debezium vào hệ thống phải vận hành\n" +
        "// - cần quyền replication trên DB và cấu hình WAL đúng",
    },
    {
      lang: "json",
      title: "Cấu hình Debezium outbox",
      code:
        "{\n" +
        "  \"name\": \"outbox-connector\",\n" +
        "  \"config\": {\n" +
        "    \"connector.class\": \"io.debezium.connector.postgresql.PostgresConnector\",\n" +
        "    \"database.hostname\": \"postgres\",\n" +
        "    \"database.dbname\": \"orders\",\n" +
        "    \"table.include.list\": \"public.outbox\",\n" +
        "    \"transforms\": \"outbox\",\n" +
        "    \"transforms.outbox.type\":\n" +
        "      \"io.debezium.transforms.outbox.EventRouter\",\n" +
        "    \"transforms.outbox.route.by.field\": \"aggregate_type\",\n" +
        "    \"transforms.outbox.table.field.event.key\": \"aggregate_id\",\n" +
        "    \"transforms.outbox.table.field.event.payload\": \"payload\"\n" +
        "  }\n" +
        "}",
    },
  ],
},
{
  cat: 'Delivery semantics',
  q: 'Trùng lặp do consumer rebalance — chống bằng cách nào?',
  answer:
    'Khi rebalance xảy ra giữa lúc consumer đã xử lý một phần lô nhưng chưa commit, consumer mới nhận partition đó và xử lý lại từ offset committed cũ.\n\n' +
    'Giảm/khử:\n' +
    '- Commit offset **thường xuyên hơn** (sau mỗi lô nhỏ) để cửa sổ "đã làm nhưng chưa commit" hẹp lại.\n' +
    '- `ConsumerRebalanceListener.onPartitionsRevoked` → commit offset đang giữ trước khi nhả partition.\n' +
    '- **Cooperative rebalancing** + **static membership** → giảm số lần và phạm vi rebalance.\n' +
    '- Cuối cùng: consumer **idempotent** để việc xử lý lại vô hại.',
  essence:
    'Rebalance là điều bình thường; mục tiêu là (a) làm nó hiếm, (b) commit sát với xử lý, (c) đảm bảo xử lý lại không gây hại. Ba lớp bảo vệ chồng lên nhau.',
  example:
    'Deploy gây rebalance: `onPartitionsRevoked` commit ngay offset của các record đã ghi DB; consumer mới bắt đầu từ đó. Kết hợp UPSERT idempotent → kể cả nếu một vài record lọt qua khe hở, ghi lại cũng không sai.',
  viz: {
    type: 'tree',
    title: 'Trùng do rebalance — 3 lớp bảo vệ chồng lên nhau',
    root: {
      label: 'Rebalance là bình thường; giảm số lần + commit sát xử lý + xử lý lại vô hại',
      children: [
        { label: 'Commit offset thường xuyên hơn', note: 'cửa sổ "đã làm nhưng chưa commit" hẹp lại' },
        { label: 'onPartitionsRevoked → commit trước khi nhả partition' },
        { label: 'Cooperative rebalancing + static membership', note: 'giảm số lần và phạm vi' },
        { label: 'Consumer idempotent', note: 'xử lý lại vô hại — lớp cuối cùng' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Bốn lớp phòng thủ",
      code:
        "// Rebalance -> partition chuyển chủ từ offset commit gần nhất -> mọi thứ xử lý\n" +
        "// sau lần commit đó bị làm LẠI. Không tránh được hoàn toàn, chỉ giảm và chịu được.\n" +
        "\n" +
        "// LỚP 1: commit ngay trước khi mất partition\n" +
        "consumer.subscribe(List.of(\"orders\"), new ConsumerRebalanceListener() {\n" +
        "    @Override public void onPartitionsRevoked(Collection<TopicPartition> parts) {\n" +
        "        consumer.commitSync(currentOffsets);     // cửa sổ trùng lặp thu về gần 0\n" +
        "    }\n" +
        "    @Override public void onPartitionsAssigned(Collection<TopicPartition> parts) {}\n" +
        "});\n" +
        "\n" +
        "// LỚP 2: giảm số lần rebalance\n" +
        "p.put(\"group.instance.id\", System.getenv(\"HOSTNAME\"));   // static membership\n" +
        "p.put(\"partition.assignment.strategy\", CooperativeStickyAssignor.class.getName());\n" +
        "p.put(\"max.poll.records\", \"100\");        // lô nhỏ -> commit thường xuyên hơn\n" +
        "\n" +
        "// LỚP 3: commit thường xuyên hơn, hoặc theo lô nhỏ\n" +
        "if (++count % 50 == 0) consumer.commitAsync();\n" +
        "\n" +
        "// LỚP 4 (quan trọng nhất): làm việc xử lý IDEMPOTENT — ba lớp trên chỉ\n" +
        "// thu hẹp cửa sổ, không đóng được nó.\n" +
        "jdbc.update(\"\"\"\n" +
        "    INSERT INTO orders (id, status) VALUES (?, ?)\n" +
        "    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status\n" +
        "    \"\"\", r.key(), status);\n" +
        "\n" +
        "// Và đóng consumer cho tử tế để không phải chờ hết session timeout:\n" +
        "Runtime.getRuntime().addShutdownHook(new Thread(consumer::wakeup));",
    },
  ],
},
]);
