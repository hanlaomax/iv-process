SS.addQuestions('kafka', [
{
  cat: 'Consumer',
  id: 'kafka-329pm6',
  q: 'Vòng lặp poll của consumer hoạt động thế nào? `max.poll.records`, `max.poll.interval.ms`?',
  answer:
    'Consumer chạy vòng lặp: `poll(timeout)` → nhận tối đa `max.poll.records` record (mặc định 500) → xử lý → commit offset → lặp lại.\n\n' +
    '`poll()` còn làm việc nền quan trọng: gửi heartbeat, tham gia rebalance. Vì vậy **phải gọi `poll()` đều đặn**.\n\n' +
    '`max.poll.interval.ms` (mặc định 5 phút): nếu khoảng cách giữa hai lần `poll()` vượt ngưỡng này (xử lý lô quá lâu), broker coi consumer "chết" → **loại khỏi group và rebalance**.',
  essence:
    '`poll()` vừa lấy dữ liệu vừa "giữ chỗ" trong group. Xử lý một lô lâu hơn `max.poll.interval.ms` = tự bị đá ra. Giảm `max.poll.records` hoặc tăng interval khi xử lý nặng.',
  example:
    'Mỗi record gọi API mất 2s, `max.poll.records=500` → một lô mất ~1000s ≫ 300s → rebalance liên tục, không tiến được. Sửa: `max.poll.records=20` (lô ~40s) hoặc đẩy xử lý sang thread pool và pause partition.',
  viz: {
    type: 'flow',
    title: 'Vòng lặp poll — poll() cũng "giữ chỗ" trong group',
    nodes: ['poll(timeout)', 'nhận ≤ max.poll.records', 'xử lý lô', 'commit offset', 'lặp lại'],
    steps: [
      { to: 0, label: 'poll() còn gửi heartbeat + tham gia rebalance — phải gọi đều đặn' },
      { to: 1, label: 'mặc định 500 record' },
      { to: 2, label: 'xử lý lâu hơn max.poll.interval.ms (5 phút) → broker coi consumer chết → rebalance' },
      { to: 3, label: 'giảm max.poll.records hoặc tăng interval khi xử lý nặng' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "poll() làm nhiều việc hơn tên gọi của nó",
      code:
        "Properties p = new Properties();\n" +
        "p.put(\"max.poll.records\", \"500\");          // số record TỐI ĐA mỗi lần poll trả về\n" +
        "p.put(\"max.poll.interval.ms\", \"300000\");   // 5 phút: khoảng cách TỐI ĐA giữa hai lần poll\n" +
        "\n" +
        "KafkaConsumer<String, String> consumer = new KafkaConsumer<>(p);\n" +
        "consumer.subscribe(List.of(\"orders\"));\n" +
        "\n" +
        "while (running) {\n" +
        "    var records = consumer.poll(Duration.ofMillis(1000));\n" +
        "    for (var r : records) process(r);       // TOÀN BỘ 500 record phải xong\n" +
        "    consumer.commitSync();                  // trước lần poll kế tiếp\n" +
        "}\n" +
        "// poll() KHÔNG chỉ lấy dữ liệu. Nó còn: tham gia/duy trì group, chạy rebalance,\n" +
        "// gửi offset auto-commit, và cập nhật metadata. Không gọi poll() = coi như chết.\n" +
        "\n" +
        "// BẪY KINH ĐIỂN: xử lý một record mất 1 giây, max.poll.records=500\n" +
        "// -> 500 giây > max.poll.interval.ms 300 giây -> broker coi consumer đã chết\n" +
        "// -> ĐÁ RA KHỎI GROUP giữa chừng -> rebalance -> commit thất bại\n" +
        "// -> lô đó bị xử lý LẠI -> lặp vô hạn.\n" +
        "// Chữa: giảm max.poll.records (ví dụ 50), hoặc tăng max.poll.interval.ms,\n" +
        "// hoặc đẩy phần việc nặng sang thread pool và dùng pause()/resume().",
    },
  ],
},
{
  cat: 'Rebalancing',
  id: 'kafka-8btube',
  q: 'Consumer group rebalancing là gì? Khi nào bị trigger?',
  answer:
    'Rebalance = phân bổ lại partition cho các consumer trong group. Do **group coordinator** (một broker) điều phối.\n\n' +
    'Trigger khi:\n' +
    '- Consumer **join** (scale up, khởi động).\n' +
    '- Consumer **leave** (shutdown sạch) hoặc **bị coi là chết** (miss heartbeat / vượt `max.poll.interval.ms`).\n' +
    '- **Số partition của topic thay đổi**, hoặc consumer subscribe pattern khớp topic mới.\n\n' +
    'Với protocol *eager* (cũ), toàn bộ consumer **ngừng đọc** trong lúc rebalance ("stop-the-world").',
  essence:
    'Rebalance là cách group tự cân bằng khi thành viên/partition thay đổi. Nó cần thiết nhưng tốn kém — mục tiêu vận hành là làm nó **hiếm** và **nhanh**.',
  example:
    'Deploy rolling 6 pod lần lượt restart → 6 lần rebalance, mỗi lần vài giây không xử lý → lag tăng vọt. Giảm tác động bằng static membership + cooperative rebalancing + `group.initial.rebalance.delay.ms`.',
  viz: {
    type: 'tree',
    title: 'Rebalance — mục tiêu vận hành: làm nó HIẾM và NHANH',
    root: {
      label: 'Group coordinator phân bổ lại partition khi:',
      children: [
        { label: 'Consumer join', note: 'scale up, khởi động' },
        { label: 'Consumer leave / bị coi là chết', note: 'miss heartbeat hoặc vượt max.poll.interval.ms' },
        { label: 'Số partition topic thay đổi / subscribe pattern khớp topic mới' },
        { label: 'Eager protocol', note: 'toàn group "stop-the-world" trong lúc rebalance' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Cái gì kích hoạt rebalance và vì sao nó tốn kém",
      code:
        "// Rebalance = phân công lại partition cho các consumer trong group.\n" +
        "// Trong lúc đó, với giao thức eager, TOÀN BỘ group NGỪNG xử lý (stop-the-world).\n" +
        "\n" +
        "// Bị kích hoạt khi:\n" +
        "//  1) consumer mới tham gia (scale up, hoặc pod khởi động lại)\n" +
        "//  2) consumer rời đi: gọi close(), hoặc quá session.timeout.ms không heartbeat,\n" +
        "//     hoặc quá max.poll.interval.ms không gọi poll()  <- nguyên nhân hay gặp nhất\n" +
        "//  3) số partition của topic tăng\n" +
        "//  4) topic khớp pattern subscribe được tạo/xoá\n" +
        "\n" +
        "consumer.subscribe(Pattern.compile(\"orders-.*\"));   // topic mới khớp -> rebalance\n" +
        "\n" +
        "// Giảm rebalance không cần thiết:\n" +
        "p.put(\"group.instance.id\", \"consumer-1\");           // static membership (xem câu riêng)\n" +
        "p.put(\"partition.assignment.strategy\",\n" +
        "      CooperativeStickyAssignor.class.getName());   // không dừng toàn bộ group\n" +
        "p.put(\"max.poll.records\", \"100\");                   // xử lý một lô nhanh hơn\n" +
        "\n" +
        "// Đóng đúng cách để consumer rời group NGAY, không phải chờ hết session timeout:\n" +
        "Runtime.getRuntime().addShutdownHook(new Thread(consumer::wakeup));\n" +
        "try { pollLoop(); }\n" +
        "catch (WakeupException e) { /* thoát bình thường */ }\n" +
        "finally { consumer.close(); }   // gửi LeaveGroup -> rebalance nhanh gọn",
    },
  ],
},
{
  cat: 'Rebalancing',
  id: 'kafka-az21as',
  q: 'Eager rebalancing và cooperative (incremental) rebalancing khác nhau thế nào?',
  answer:
    '**Eager** (`RangeAssignor`, `RoundRobinAssignor`): mọi consumer **revoke tất cả** partition, rebalance, rồi nhận lại phân bổ mới. Toàn group dừng xử lý trong suốt quá trình.\n\n' +
    '**Cooperative** (`CooperativeStickyAssignor`, mặc định từ Kafka 3.x cho nhiều client): chỉ **revoke những partition cần chuyển chủ**, các partition khác vẫn được xử lý bình thường. Rebalance diễn ra qua nhiều vòng nhỏ.',
  essence:
    'Eager: "buông hết, chia lại". Cooperative: "chỉ trao đổi phần chênh lệch". Cooperative giảm mạnh thời gian gián đoạn khi scale/deploy.',
  example:
    'Group 10 consumer, thêm 1 consumer thứ 11: eager → cả 10 dừng, chia lại 100% partition. Cooperative → chỉ ~1/11 partition được chuyển sang consumer mới, 90%+ luồng xử lý không bị gián đoạn.',
  viz: {
    type: 'compare',
    cols: ['Eager (Range, RoundRobin)', 'Cooperative (CooperativeSticky)'],
    rows: [
      ['Khi rebalance', 'revoke TẤT CẢ partition', 'chỉ revoke partition cần chuyển chủ'],
      ['Xử lý trong lúc rebalance', 'toàn group dừng', 'partition khác vẫn chạy'],
      ['Số vòng', 'một lần', 'nhiều vòng nhỏ'],
      ['Thêm 1 consumer vào group 10', 'cả 10 dừng, chia lại 100%', 'chỉ ~1/11 partition chuyển'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Nhả hết vs chỉ nhả phần cần đổi",
      code:
        "# EAGER (RangeAssignor, RoundRobinAssignor — kiểu cũ):\n" +
        "#   mọi consumer NHẢ TOÀN BỘ partition -> chờ phân công lại -> nhận về.\n" +
        "#   Cả group ngừng xử lý trong suốt quá trình. Group 50 consumer mà một pod\n" +
        "#   restart cũng làm cả 50 dừng.\n" +
        "\n" +
        "# COOPERATIVE (CooperativeStickyAssignor — nên dùng):\n" +
        "#   chỉ những partition THỰC SỰ phải chuyển chủ mới bị nhả. Consumer không\n" +
        "#   liên quan tiếp tục xử lý bình thường.\n" +
        "partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor\n" +
        "\n" +
        "# Cơ chế: rebalance chạy HAI VÒNG. Vòng 1 tính phân công mới và chỉ yêu cầu\n" +
        "# nhả phần dư; vòng 2 gán phần vừa nhả cho chủ mới.\n" +
        "\n" +
        "# NÂNG CẤP AN TOÀN (không được nhảy thẳng, sẽ lỗi giao thức):\n" +
        "#   bước 1: deploy với strategy = [CooperativeSticky, RangeAssignor]  (cả hai)\n" +
        "#   bước 2: khi mọi instance đã chạy bản trên -> deploy chỉ còn CooperativeSticky\n" +
        "\n" +
        "# Kafka 3.7+ có KIP-848 (giao thức rebalance mới, broker tự tính phân công)\n" +
        "# -> giảm mạnh thời gian rebalance, đang dần thành mặc định.",
    },
  ],
},
{
  cat: 'Rebalancing',
  id: 'kafka-1a7hvmc',
  q: 'Các chiến lược gán partition (partition assignment strategy)?',
  answer:
    '- **RangeAssignor** (mặc định cũ): với mỗi topic, chia partition liên tiếp cho consumer theo thứ tự. Dễ lệch tải khi nhiều topic ít partition.\n' +
    '- **RoundRobinAssignor**: rải toàn bộ (topic, partition) xoay vòng qua các consumer → cân bằng hơn.\n' +
    '- **StickyAssignor**: cân bằng nhưng **giữ nguyên** phân bổ cũ nhiều nhất có thể khi rebalance → ít xáo trộn.\n' +
    '- **CooperativeStickyAssignor**: sticky + cooperative protocol (khuyến nghị hiện nay).',
  essence:
    'Trục đánh đổi: cân bằng tải ↔ ổn định (ít chuyển partition). Sticky/cooperative tối ưu cả hai và giảm chi phí "khởi động lại state" mỗi lần rebalance.',
  example:
    'Consumer có state cục bộ theo partition (cache, bộ đếm): dùng `CooperativeStickyAssignor` để sau rebalance phần lớn partition vẫn ở consumer cũ → không phải nạp lại cache.',
  viz: {
    type: 'compare',
    cols: ['RangeAssignor', 'RoundRobinAssignor', 'StickyAssignor', 'CooperativeStickyAssignor'],
    rows: [
      ['Cân bằng tải', 'dễ lệch (nhiều topic ít partition)', 'tốt hơn', 'tốt', 'tốt'],
      ['Ổn định khi rebalance', 'thấp', 'thấp', 'giữ phân bổ cũ nhiều nhất', 'sticky + cooperative'],
      ['Khuyến nghị', '—', '—', '—', 'hiện nay'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Bốn chiến lược và điểm khác biệt thật sự",
      code:
        "# RangeAssignor (mặc định cũ) — chia theo DẢI, cho TỪNG topic một.\n" +
        "#   2 topic x 3 partition, 2 consumer -> C1 nhận p0,p1 của CẢ HAI topic; C2 nhận p2.\n" +
        "#   -> LỆCH TẢI có hệ thống khi số partition không chia hết cho số consumer.\n" +
        "#   Ưu điểm duy nhất: cùng partition number của nhiều topic về cùng consumer -> tiện join.\n" +
        "partition.assignment.strategy=org.apache.kafka.clients.consumer.RangeAssignor\n" +
        "\n" +
        "# RoundRobinAssignor — rải đều mọi partition của MỌI topic.\n" +
        "#   Cân bằng tốt hơn, nhưng rebalance là xáo trộn lại gần như toàn bộ.\n" +
        "\n" +
        "# StickyAssignor — cân bằng NHƯ round-robin, nhưng cố GIỮ NGUYÊN phân công cũ\n" +
        "#   nhiều nhất có thể khi rebalance -> ít mất cache/state hơn.\n" +
        "\n" +
        "# CooperativeStickyAssignor — sticky + rebalance tăng dần. LỰA CHỌN MẶC ĐỊNH\n" +
        "#   nên dùng cho hệ thống mới.\n" +
        "partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor\n" +
        "\n" +
        "# Tự viết khi cần logic đặc thù (ví dụ gán theo rack để tránh phí liên vùng):\n" +
        "#   kế thừa AbstractPartitionAssignor và cài đặt assign().\n" +
        "# Mọi consumer trong group phải có ÍT NHẤT MỘT chiến lược chung, nếu không\n" +
        "# group không thể hình thành.",
    },
  ],
},
{
  cat: 'Offset',
  id: 'kafka-rox1og',
  q: 'Commit offset: auto-commit và manual commit (`commitSync`/`commitAsync`)?',
  answer:
    '- **Auto** (`enable.auto.commit=true`): consumer tự commit offset của lô *đã poll* theo `auto.commit.interval.ms` (5s). Đơn giản nhưng có thể commit **trước khi xử lý xong** → mất message khi crash; hoặc xử lý xong nhưng chưa tới kỳ commit → xử lý lại khi rebalance.\n' +
    '- **Manual**: `enable.auto.commit=false`, gọi `commitSync()` (chặn, retry, an toàn — dùng khi shutdown/sau lô) hoặc `commitAsync()` (không chặn, throughput cao, không retry — dùng trong vòng lặp).\n\n' +
    'Mẫu phổ biến: `commitAsync` mỗi lô + `commitSync` một lần trong `finally` khi thoát.',
  essence:
    'Commit thủ công **sau khi xử lý** biến "đọc tới đâu" thành "đã làm xong tới đâu" — điều kiện cần cho at-least-once đáng tin.',
  example:
    'Consumer ghi vào DB: `for (rec : records) upsert(rec); consumer.commitSync(offsetsOf(records));`. Crash sau khi ghi DB nhưng trước commit → lô đó chạy lại; nếu `upsert` idempotent thì kết quả vẫn đúng.',
  viz: {
    type: 'compare',
    cols: ['auto-commit', 'commitSync()', 'commitAsync()'],
    rows: [
      ['Khi nào commit', 'định kỳ auto.commit.interval.ms (5s)', 'ngay, chặn, retry', 'ngay, không chặn, không retry'],
      ['Rủi ro', 'commit trước khi xử lý xong → mất; hoặc xử lý lại khi rebalance', 'chậm hơn', 'commit có thể "tụt" nếu lỗi'],
      ['Dùng', 'đơn giản, chấp nhận at-most/at-least tuỳ timing', 'shutdown / sau lô / finally', 'trong vòng lặp (throughput)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba kiểu commit và ngữ nghĩa mất/trùng của từng kiểu",
      code:
        "// AUTO-COMMIT: commit theo ĐỒNG HỒ, không theo tiến độ xử lý -> có thể MẤT message\n" +
        "p.put(\"enable.auto.commit\", \"true\");\n" +
        "p.put(\"auto.commit.interval.ms\", \"5000\");\n" +
        "// poll xong -> 5s trôi qua -> auto-commit chạy -> crash giữa lúc xử lý\n" +
        "// -> khởi động lại bỏ qua những message chưa xử lý xong. Tránh ở hệ thống nghiêm túc.\n" +
        "\n" +
        "p.put(\"enable.auto.commit\", \"false\");    // luôn tắt\n" +
        "\n" +
        "// commitSync: CHẶN và tự retry tới khi thành công. Chậm nhưng chắc.\n" +
        "while (running) {\n" +
        "    var records = consumer.poll(Duration.ofMillis(1000));\n" +
        "    for (var r : records) process(r);\n" +
        "    consumer.commitSync();               // at-least-once: xử lý xong RỒI mới commit\n" +
        "}\n" +
        "\n" +
        "// commitAsync: không chặn -> throughput cao hơn, nhưng KHÔNG retry\n" +
        "// (retry một commit cũ có thể ghi đè lên commit mới hơn -> tụt offset).\n" +
        "consumer.commitAsync((offsets, ex) -> {\n" +
        "    if (ex != null) log.warn(\"commit lỗi, lần poll sau sẽ commit lại\", ex);\n" +
        "});\n" +
        "\n" +
        "// MẪU CHUẨN: async trong vòng lặp cho nhanh, sync một lần lúc đóng cho chắc\n" +
        "try {\n" +
        "    while (running) {\n" +
        "        var records = consumer.poll(Duration.ofMillis(1000));\n" +
        "        for (var r : records) process(r);\n" +
        "        consumer.commitAsync();\n" +
        "    }\n" +
        "} finally {\n" +
        "    try { consumer.commitSync(); } finally { consumer.close(); }\n" +
        "}\n" +
        "\n" +
        "// Commit chính xác tới từng partition (khi xử lý theo nhóm):\n" +
        "consumer.commitSync(Map.of(tp, new OffsetAndMetadata(lastOffset + 1)));\n" +
        "// LƯU Ý: commit offset là \"offset SẼ ĐỌC TIẾP\", tức lastProcessed + 1.",
    },
  ],
},
{
  cat: 'Offset',
  id: 'kafka-1b83tfx',
  q: '`auto.offset.reset` = earliest / latest / none nghĩa là gì?',
  answer:
    'Áp dụng khi consumer **không có offset đã commit** cho một partition (group mới, hoặc offset cũ đã bị xoá do retention):\n' +
    '- **earliest**: đọc từ đầu partition — xử lý toàn bộ lịch sử còn lưu.\n' +
    '- **latest** (mặc định): đọc từ message mới kể từ lúc join — bỏ qua quá khứ.\n' +
    '- **none**: ném exception, buộc bạn xử lý tường minh.',
  essence:
    'Đây là chính sách "bắt đầu từ đâu khi lạc mất vị trí". `latest` cho streaming realtime; `earliest` cho pipeline cần đầy đủ dữ liệu (ETL, dựng lại state).',
  example:
    'Service analytics mới lên: `earliest` để backfill toàn bộ sự kiện có trong retention. Service gửi notification realtime: `latest` — không ai muốn nhận lại thông báo của 3 ngày trước khi service vừa deploy.',
  viz: {
    type: 'compare',
    cols: ['earliest', 'latest (mặc định)', 'none'],
    rows: [
      ['Khi không có offset commit', 'đọc từ đầu partition', 'đọc từ message mới kể từ lúc join', 'ném exception'],
      ['Dùng cho', 'ETL, backfill, dựng lại state', 'streaming realtime', 'buộc xử lý tường minh'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Chỉ có tác dụng khi KHÔNG có offset đã commit",
      code:
        "# Áp dụng cho đúng hai tình huống:\n" +
        "#   1) consumer group HOÀN TOÀN MỚI (chưa từng commit)\n" +
        "#   2) offset đã commit KHÔNG CÒN TỒN TẠI (dữ liệu bị xoá theo retention\n" +
        "#      trong lúc consumer chết lâu ngày)\n" +
        "auto.offset.reset=earliest\n" +
        "\n" +
        "# earliest — đọc từ message cũ nhất còn giữ.\n" +
        "#   Dùng cho: xử lý dữ liệu không được sót (thanh toán, CDC, ETL), topic compacted\n" +
        "#   (phải đọc hết mới dựng được trạng thái).\n" +
        "#   Rủi ro: group mới trên topic 7 ngày dữ liệu -> nuốt hàng trăm triệu message.\n" +
        "\n" +
        "# latest (MẶC ĐỊNH) — chỉ đọc message tới TỪ BÂY GIỜ.\n" +
        "#   Dùng cho: metric, giám sát, thông báo real-time — dữ liệu cũ vô nghĩa.\n" +
        "#   Rủi ro: consumer chết quá lâu -> ÂM THẦM bỏ qua toàn bộ phần tồn đọng\n" +
        "#   mà không có cảnh báo nào.\n" +
        "\n" +
        "# none — ném NoOffsetForPartitionException, buộc ứng dụng tự quyết.\n" +
        "#   An toàn nhất cho hệ thống quan trọng: mất offset là SỰ CỐ cần con người xem,\n" +
        "#   không phải chuyện im lặng bỏ qua hoặc đọc lại từ đầu.\n" +
        "\n" +
        "# Đặt lại offset thủ công (consumer phải đang DỪNG):\n" +
        "#   kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group g1 \\\n" +
        "#     --topic orders --reset-offsets --to-datetime 2026-09-01T00:00:00.000 --execute",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-1gnfdmy',
  q: 'Consumer lag là gì? Đo và xử lý thế nào?',
  answer:
    '**Lag** của một partition = `log-end-offset` (message mới nhất) − `committed-offset` (consumer đã xử lý tới). Tổng lag của group = tổng các partition.\n\n' +
    'Đo: `kafka-consumer-groups.sh --describe`, JMX `records-lag-max`, hoặc exporter (Burrow, kafka-lag-exporter) → Prometheus.\n\n' +
    'Xử lý lag tăng: thêm consumer (tới trần = số partition), tối ưu xử lý mỗi message, tăng `max.poll.records`, xử lý song song trong consumer, hoặc tăng partition (cho tương lai).',
  essence:
    'Lag là thước đo "consumer có theo kịp producer không" và là chỉ số cảnh báo quan trọng nhất của một pipeline. Lag tăng đều = throughput tiêu thụ < throughput sản xuất.',
  example:
    'Alert: lag group `payments` > 100k và đang tăng → producer đang spike hoặc consumer chậm. Scale consumer từ 4 → 8 pod (topic 12 partition) → tiêu thụ tăng gần 2x, lag rút về 0 trong 10 phút.',
  viz: {
    type: 'flow',
    title: 'Consumer lag = log-end-offset − committed-offset',
    nodes: ['đo lag (JMX, exporter → Prometheus)', 'lag tăng đều', 'throughput tiêu thụ < sản xuất', 'thêm consumer (≤ số partition) / tối ưu / tăng partition'],
    steps: [
      { to: 1, label: 'chỉ số cảnh báo quan trọng nhất của pipeline' },
      { to: 2, label: 'producer spike hoặc consumer chậm' },
      { to: 3, label: 'scale 4→8 pod (topic 12 partition) → tiêu thụ ~2x, lag rút về 0' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đo lag và phân biệt hai nguyên nhân",
      code:
        "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\\n" +
        "  --describe --group order-processor\n" +
        "# TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG    CONSUMER-ID\n" +
        "# orders  0          10500           10500           0\n" +
        "# orders  1          8200            15000           6800   <- partition này nghẽn\n" +
        "\n" +
        "# LAG = LOG-END-OFFSET - CURRENT-OFFSET, tính theo TỪNG partition.\n" +
        "# Đừng chỉ nhìn tổng: lag dồn vào MỘT partition là dấu hiệu khác hẳn\n" +
        "# so với lag dàn đều.\n" +
        "\n" +
        "# Lag dồn một partition -> LỆCH KEY (một key nóng chiếm hết) hoặc\n" +
        "#   consumer giữ partition đó đang chậm/treo.\n" +
        "# Lag đều mọi partition -> thiếu năng lực xử lý nói chung.\n" +
        "\n" +
        "# XỬ LÝ, theo thứ tự nên thử:\n" +
        "#  1) tăng số consumer — CHỈ hiệu quả tới bằng số partition\n" +
        "#  2) tăng max.poll.records và xử lý theo lô (batch insert thay vì từng dòng)\n" +
        "#  3) tách phần chậm (gọi API ngoài) sang thread pool, dùng pause()/resume()\n" +
        "#  4) cuối cùng mới tăng partition — đổi ánh xạ key, cân nhắc kỹ\n" +
        "\n" +
        "# Cảnh báo nên đặt theo THỜI GIAN chứ không theo số message:\n" +
        "#   lag_seconds = lag / throughput  -> \"chậm hơn 5 phút\" dễ hiểu hơn \"lag 2 triệu\".",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-1gtb3bj',
  q: '`session.timeout.ms` và `heartbeat.interval.ms` liên quan thế nào?',
  answer:
    'Consumer chạy một **heartbeat thread** riêng gửi tín hiệu "còn sống" tới group coordinator mỗi `heartbeat.interval.ms` (mặc định 3s).\n\n' +
    'Nếu coordinator không nhận heartbeat trong `session.timeout.ms` (mặc định 45s, dải cho phép `group.min/max.session.timeout.ms`) → coi consumer chết → rebalance.\n\n' +
    'Quy tắc: `heartbeat.interval.ms` ≈ 1/3 `session.timeout.ms`.\n\n' +
    'Lưu ý: heartbeat tách khỏi `poll()`, nên consumer có thể "còn sống" (heartbeat ok) nhưng vẫn bị đá vì xử lý lô quá `max.poll.interval.ms`.',
  essence:
    '`session.timeout.ms` phát hiện **process chết / mạng đứt** (qua heartbeat). `max.poll.interval.ms` phát hiện **xử lý bị treo** (qua nhịp poll). Hai cơ chế bổ sung nhau.',
  example:
    'Mạng chập chờn gây rebalance giả: tăng `session.timeout.ms` lên 60s (và `heartbeat.interval.ms` 20s) để chịu được gián đoạn ngắn mà không kích hoạt rebalance.',
  viz: {
    type: 'compare',
    cols: ['session.timeout.ms (+ heartbeat.interval.ms)', 'max.poll.interval.ms'],
    rows: [
      ['Phát hiện', 'process chết / mạng đứt', 'xử lý bị treo'],
      ['Qua cơ chế', 'heartbeat thread riêng (mỗi 3s)', 'nhịp gọi poll()'],
      ['Mặc định', '45s (heartbeat ≈ 1/3)', '5 phút'],
      ['Consumer heartbeat ok nhưng lô lâu', '→ vẫn "còn sống"', '→ vẫn bị đá'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Hai đồng hồ khác nhau cho hai kiểu chết khác nhau",
      code:
        "# heartbeat chạy ở THREAD NỀN riêng, độc lập với việc xử lý.\n" +
        "heartbeat.interval.ms=3000       # gửi nhịp tim mỗi 3 giây\n" +
        "session.timeout.ms=45000         # không nhận nhịp tim trong 45s -> coi là CHẾT\n" +
        "# Quy tắc: heartbeat.interval.ms <= session.timeout.ms / 3\n" +
        "\n" +
        "# session.timeout.ms bắt \"tiến trình chết / mất mạng\" -> thread nền im lặng.\n" +
        "# max.poll.interval.ms bắt \"tiến trình sống nhưng TREO khi xử lý\" -> vẫn gửi\n" +
        "# nhịp tim nhưng không gọi poll() nữa.\n" +
        "max.poll.interval.ms=300000\n" +
        "\n" +
        "# Hai loại lỗi khác nhau nên có hai đồng hồ khác nhau — trước Kafka 0.10.1\n" +
        "# chỉ có một, khiến việc xử lý chậm bị nhầm là chết.\n" +
        "\n" +
        "# Chỉnh thế nào:\n" +
        "#  - session.timeout NGẮN  -> phát hiện chết nhanh, nhưng dễ rebalance oan\n" +
        "#    khi mạng chớp nháy hoặc GC pause dài\n" +
        "#  - session.timeout DÀI   -> ít rebalance oan, nhưng partition bị \"treo\"\n" +
        "#    lâu hơn khi consumer chết thật\n" +
        "# Broker chặn khoảng cho phép: group.min.session.timeout.ms / group.max.session.timeout.ms",
    },
  ],
},
{
  cat: 'Rebalancing',
  id: 'kafka-1o9jph3',
  q: 'Static membership (`group.instance.id`) giải quyết vấn đề gì?',
  answer:
    'Bình thường, consumer restart = rời group + join lại = 2 lần rebalance, và có thể nhận partition khác.\n\n' +
    'Đặt `group.instance.id` cố định cho mỗi instance → consumer thành **thành viên tĩnh**. Khi nó restart nhanh (trong `session.timeout.ms`), coordinator **giữ nguyên** phân bổ partition cho id đó, **không rebalance**.\n\n' +
    'Rất hợp với deployment có identity ổn định (StatefulSet trong K8s).',
  essence:
    'Static membership tách "restart tạm thời" khỏi "rời group vĩnh viễn". Deploy/restart pod không còn gây rebalance nếu hoàn tất trong session timeout.',
  example:
    'K8s StatefulSet: `group.instance.id=$(POD_NAME)`, `session.timeout.ms=120s`. Rolling update mỗi pod restart trong ~30s → 0 rebalance, consumer nhận lại đúng partition cũ, state cache còn nguyên.',
  viz: {
    type: 'flow',
    title: 'Static membership (group.instance.id)',
    nodes: ['consumer restart', 'join lại trong session.timeout.ms', 'coordinator giữ nguyên phân bổ cho id đó', 'KHÔNG rebalance'],
    steps: [
      { to: 1, label: 'group.instance.id cố định → thành viên tĩnh' },
      { to: 3, label: 'bình thường restart = 2 rebalance; static = 0 nếu hoàn tất trong session timeout' },
      { to: 3, label: 'hợp K8s StatefulSet: group.instance.id=$(POD_NAME), session.timeout.ms=120s' },
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Restart mà không gây rebalance",
      code:
        "# VẤN ĐỀ: mỗi lần rolling update, mỗi pod rời đi rồi quay lại được coi là một\n" +
        "# thành viên MỚI -> hai lần rebalance cho mỗi pod. Group 20 pod = 40 lần\n" +
        "# rebalance cho một lần deploy, mỗi lần cả group dừng xử lý.\n" +
        "group.instance.id=order-consumer-3      # ID ỔN ĐỊNH, DUY NHẤT trong group\n" +
        "session.timeout.ms=120000               # nới rộng để bao trọn thời gian restart\n" +
        "\n" +
        "# Có ID tĩnh, consumer rời đi KHÔNG kích hoạt rebalance ngay. Broker giữ nguyên\n" +
        "# phân công partition cho tới khi hết session.timeout.ms. Quay lại trong khoảng\n" +
        "# đó -> nhận LẠI ĐÚNG partition cũ, không rebalance lần nào.\n" +
        "\n" +
        "# Rất hợp với StatefulSet trên Kubernetes (hostname đã sẵn ổn định):\n" +
        "#   group.instance.id = ${HOSTNAME}     # order-consumer-0, -1, -2...\n" +
        "\n" +
        "# ĐÁNH ĐỔI phải hiểu rõ: consumer CHẾT THẬT thì partition của nó bị BỎ TRỐNG\n" +
        "# cho tới hết session.timeout.ms (ở đây là 2 phút) -> lag tăng trong khoảng đó.\n" +
        "# Đặt session.timeout đủ dài để bao restart, nhưng đủ ngắn để không chịu nổi\n" +
        "# một pod chết hẳn.\n" +
        "\n" +
        "# Trùng group.instance.id giữa hai instance -> FencedInstanceIdException,\n" +
        "# instance cũ bị đá ra. Đừng bao giờ để hai pod dùng chung một ID.",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-1xx6xtl',
  q: 'Consumer có thể nhận message trùng không? Xử lý thế nào?',
  answer:
    'Có — mô hình mặc định là **at-least-once**. Trùng lặp xảy ra khi consumer xử lý xong nhưng crash/rebalance **trước khi commit** offset → lô đó chạy lại.\n\n' +
    'Xử lý:\n' +
    '- **Idempotent consumer**: thao tác lặp lại cho kết quả như một lần (`UPSERT` theo business key, `SET` thay vì `INCREMENT`).\n' +
    '- **Dedup store**: lưu id message đã xử lý (Redis/DB có TTL), bỏ qua nếu thấy lại.\n' +
    '- **Transactional (EOS)** cho pipeline consume-transform-produce.',
  essence:
    'Đừng cố làm Kafka "không bao giờ trùng"; hãy làm **consumer chịu được trùng**. Idempotency ở phía xử lý là giải pháp bền vững nhất.',
  example:
    'Consumer cập nhật số dư: thay vì `balance += amount` (sai khi lặp), lưu `processed_event_ids` và chỉ apply nếu `eventId` chưa có, trong cùng transaction DB với việc cập nhật số dư.',
  viz: {
    type: 'tree',
    title: 'Đừng làm Kafka "không trùng" — làm consumer CHỊU ĐƯỢC trùng',
    root: {
      label: 'Mặc định at-least-once: trùng khi xử lý xong nhưng crash trước commit',
      children: [
        { label: 'Idempotent consumer', note: 'UPSERT theo business key, SET thay vì INCREMENT' },
        { label: 'Dedup store', note: 'lưu id message đã xử lý (Redis/DB có TTL)' },
        { label: 'Transactional (EOS)', note: 'cho pipeline consume-transform-produce' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Trùng là chuyện bình thường — thiết kế để chịu được",
      code:
        "// CÓ. At-least-once là mặc định, và trùng đến từ:\n" +
        "//  - xử lý xong nhưng crash TRƯỚC khi commit -> lô đó chạy lại\n" +
        "//  - rebalance giữa chừng -> partition chuyển sang consumer khác từ offset cũ\n" +
        "//  - commitAsync thất bại lặng lẽ\n" +
        "\n" +
        "// CÁCH ĐÚNG: làm cho việc xử lý IDEMPOTENT, đừng cố chống trùng ở tầng Kafka.\n" +
        "\n" +
        "// 1) UPSERT theo khoá tự nhiên — đơn giản và hiệu quả nhất\n" +
        "jdbc.update(\"\"\"\n" +
        "    INSERT INTO orders (id, status, total) VALUES (?, ?, ?)\n" +
        "    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, total = EXCLUDED.total\n" +
        "    \"\"\", r.key(), status, total);\n" +
        "\n" +
        "// 2) Bảng dedup theo message id — khi thao tác không thể upsert\n" +
        "boolean isNew = jdbc.update(\n" +
        "    \"INSERT INTO processed (msg_id, at) VALUES (?, now()) ON CONFLICT DO NOTHING\",\n" +
        "    r.topic() + \"-\" + r.partition() + \"-\" + r.offset()) == 1;\n" +
        "if (!isNew) return;      // đã xử lý rồi, bỏ qua\n" +
        "process(r);\n" +
        "// Nhớ đặt TTL/job dọn bảng này, nếu không nó phình vô hạn.\n" +
        "\n" +
        "// 3) Lưu offset CÙNG transaction với dữ liệu nghiệp vụ -> exactly-once phía sink\n" +
        "tx.begin();\n" +
        "saveOrder(order);\n" +
        "saveOffset(r.partition(), r.offset() + 1);\n" +
        "tx.commit();\n" +
        "// Khi khởi động: consumer.seek(tp, loadOffsetFromDatabase(tp));",
    },
  ],
},
{
  cat: 'Rebalancing',
  id: 'kafka-yztbn4',
  q: '`ConsumerRebalanceListener` dùng để làm gì?',
  answer:
    'Callback gắn khi `subscribe(topics, listener)`:\n' +
    '- `onPartitionsRevoked(partitions)`: gọi **trước khi** consumer mất các partition này. Nơi để **commit offset cuối** và flush state/buffer.\n' +
    '- `onPartitionsAssigned(partitions)`: gọi **sau khi** nhận partition mới. Nơi để **nạp state** (seek tới offset lưu ở nơi khác, warm cache).\n' +
    '- `onPartitionsLost(partitions)` (cooperative): mất partition bất thường, không kịp commit.',
  essence:
    'Listener là hook để bàn giao partition sạch sẽ: bên nhả thì lưu tiến độ, bên nhận thì khôi phục ngữ cảnh. Bắt buộc nếu bạn quản lý offset/state ngoài Kafka.',
  example:
    'Consumer lưu offset trong DB cùng dữ liệu nghiệp vụ (exactly-once thủ công): `onPartitionsRevoked` → commit transaction cuối; `onPartitionsAssigned` → đọc offset từ DB và `consumer.seek(partition, offset)` để tiếp tục đúng chỗ.',
  viz: {
    type: 'flow',
    title: 'ConsumerRebalanceListener — bàn giao partition sạch',
    nodes: ['onPartitionsRevoked', 'rebalance', 'onPartitionsAssigned', '(onPartitionsLost)'],
    steps: [
      { to: 0, label: 'TRƯỚC khi mất partition: commit offset cuối, flush state/buffer' },
      { to: 2, label: 'SAU khi nhận partition mới: nạp state, seek tới offset lưu ở nơi khác, warm cache' },
      { to: 3, label: 'cooperative: mất partition bất thường, không kịp commit' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Móc vào đúng lúc mất và nhận partition",
      code:
        "consumer.subscribe(List.of(\"orders\"), new ConsumerRebalanceListener() {\n" +
        "\n" +
        "    @Override\n" +
        "    public void onPartitionsRevoked(Collection<TopicPartition> partitions) {\n" +
        "        // Gọi TRƯỚC khi mất quyền sở hữu -> đây là cơ hội CUỐI CÙNG để commit.\n" +
        "        // Không commit ở đây thì mọi thứ xử lý từ lần commit trước sẽ chạy LẠI\n" +
        "        // trên consumer mới -> trùng lặp.\n" +
        "        log.info(\"nhả {}\", partitions);\n" +
        "        consumer.commitSync(currentOffsets);\n" +
        "        flushPendingWrites();          // đẩy nốt buffer xuống DB\n" +
        "    }\n" +
        "\n" +
        "    @Override\n" +
        "    public void onPartitionsAssigned(Collection<TopicPartition> partitions) {\n" +
        "        // Gọi SAU khi nhận partition, TRƯỚC lần poll đầu tiên trên chúng.\n" +
        "        log.info(\"nhận {}\", partitions);\n" +
        "        for (TopicPartition tp : partitions) {\n" +
        "            long offset = loadOffsetFromDatabase(tp);   // tự quản offset\n" +
        "            if (offset >= 0) consumer.seek(tp, offset);\n" +
        "            warmUpCacheFor(tp);                         // nạp state cần thiết\n" +
        "        }\n" +
        "    }\n" +
        "\n" +
        "    @Override\n" +
        "    public void onPartitionsLost(Collection<TopicPartition> partitions) {\n" +
        "        // Chỉ với cooperative: partition bị lấy mất ĐỘT NGỘT (đã hết session).\n" +
        "        // ĐỪNG commit ở đây — partition đã có chủ mới, commit sẽ ghi đè sai.\n" +
        "        discardLocalState(partitions);\n" +
        "    }\n" +
        "});",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-yvgh9',
  q: 'Khi nào dùng `pause()` / `resume()` và `seek()`?',
  answer:
    '`pause(partitions)`: ngừng nhận record từ partition đó ở các `poll()` tiếp theo (nhưng vẫn heartbeat, vẫn giữ partition). `resume()` để tiếp tục. Dùng khi: hạ nguồn (DB, API) đang quá tải → backpressure; hoặc đang xử lý bất đồng bộ một lô lớn.\n\n' +
    '`seek(partition, offset)` / `seekToBeginning` / `seekToEnd`: đặt lại vị trí đọc. Dùng để **replay** (tua lại xử lý sự kiện), bỏ qua message lỗi, hoặc khôi phục từ offset lưu bên ngoài.',
  essence:
    '`pause/resume` là van điều tiết luồng để giữ nhịp poll mà không nhận thêm dữ liệu. `seek` là điều khiển thủ công con trỏ đọc — nền tảng của replay và offset-ngoài-Kafka.',
  example:
    'Bug xử lý sai từ 09:00 hôm qua: tìm offset tương ứng timestamp (`offsetsForTimes`), `seek` group về đó, cho chạy lại. Backpressure: khi DB connection pool cạn, `pause` các partition, `poll` vẫn chạy để không bị rebalance, khi pool rảnh thì `resume`.',
  viz: {
    type: 'tree',
    title: 'pause/resume vs seek',
    root: {
      label: 'Điều khiển thủ công luồng đọc',
      children: [
        { label: 'pause(partitions) / resume()', note: 'ngừng nhận record nhưng vẫn heartbeat, vẫn giữ partition — van backpressure' },
        { label: 'seek(partition, offset)', note: 'replay xử lý sự kiện, bỏ qua message lỗi, khôi phục từ offset lưu ngoài' },
        { label: 'seekToBeginning / seekToEnd', note: 'đặt lại về đầu/cuối partition' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Điều tiết luồng và điều khiển vị trí đọc",
      code:
        "// pause/resume: tạm ngừng nhận dữ liệu của MỘT SỐ partition mà VẪN gọi poll()\n" +
        "// -> vẫn gửi nhịp tim, KHÔNG bị đá khỏi group. Đây là chìa khoá để xử lý\n" +
        "// bất đồng bộ mà không vi phạm max.poll.interval.ms.\n" +
        "var records = consumer.poll(Duration.ofMillis(1000));\n" +
        "for (var r : records) queue.offer(r);              // đẩy sang thread pool\n" +
        "\n" +
        "if (queue.size() > HIGH_WATERMARK) {\n" +
        "    consumer.pause(consumer.assignment());          // ngừng nhận thêm\n" +
        "} else if (queue.size() < LOW_WATERMARK) {\n" +
        "    consumer.resume(consumer.assignment());         // nhận lại\n" +
        "}\n" +
        "consumer.poll(Duration.ZERO);   // vẫn phải poll đều để giữ chỗ trong group\n" +
        "\n" +
        "// Dùng pause khi: hệ thống đích (DB, API) đang chậm/lỗi, cần chờ hồi phục\n" +
        "// mà không muốn mất quyền sở hữu partition.\n" +
        "\n" +
        "// seek: điều khiển vị trí đọc — chỉ dùng được sau khi đã có phân công partition\n" +
        "consumer.poll(Duration.ZERO);                        // kích hoạt phân công\n" +
        "consumer.seek(new TopicPartition(\"orders\", 0), 5000);\n" +
        "consumer.seekToBeginning(consumer.assignment());     // phát lại toàn bộ\n" +
        "consumer.seekToEnd(consumer.assignment());           // bỏ qua tồn đọng\n" +
        "\n" +
        "// Tua theo THỜI GIAN — cách hay dùng nhất khi xử lý sự cố\n" +
        "long ts = Instant.parse(\"2026-09-01T00:00:00Z\").toEpochMilli();\n" +
        "consumer.offsetsForTimes(Map.of(tp, ts))\n" +
        "        .forEach((k, v) -> { if (v != null) consumer.seek(k, v.offset()); });",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-s9okdw',
  q: 'KafkaConsumer có thread-safe không? Mô hình đa luồng nào phổ biến?',
  answer:
    '`KafkaConsumer` **KHÔNG** thread-safe (trừ `wakeup()`). Một consumer instance chỉ được dùng bởi **một thread**.\n\n' +
    'Mô hình:\n' +
    '- **N consumer, mỗi cái một thread** (đơn giản nhất): song song tới số partition.\n' +
    '- **1 consumer + thread pool xử lý**: poll trên một thread, giao record cho worker pool. Nhanh hơn nhưng phải tự quản lý commit offset và thứ tự (thường phân công theo key/partition cho worker).',
  essence:
    'Song song "an toàn" nhất là nhiều consumer instance. Dùng thread pool để tăng throughput đòi hỏi tự xử lý offset commit và mất bảo đảm thứ tự nếu không phân vùng theo key.',
  example:
    'Xử lý mỗi message tốn 50ms I/O, topic 12 partition: chạy 12 consumer thread (1 instance/thread). Nếu cần hơn 12x mà không tăng partition: 1 consumer poll + pool 100 worker, phân record theo `key.hashCode() % 100` để mỗi key vẫn tuần tự, `pause` khi pool đầy.',
  viz: {
    type: 'compare',
    cols: ['N consumer, mỗi cái 1 thread', '1 consumer + thread pool xử lý'],
    rows: [
      ['Song song tối đa', '= số partition', 'nhiều hơn số partition'],
      ['Commit offset', 'tự nhiên', 'phải tự quản lý'],
      ['Thứ tự', 'giữ theo partition', 'mất, trừ khi phân worker theo key'],
      ['Độ phức tạp', 'thấp — an toàn nhất', 'cao'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "KHÔNG — và ba mô hình đa luồng",
      code:
        "// KafkaConsumer KHÔNG thread-safe. Gọi từ thread khác -> ConcurrentModificationException.\n" +
        "// Ngoại lệ DUY NHẤT: wakeup() gọi được từ thread khác (để dừng vòng poll).\n" +
        "\n" +
        "// MÔ HÌNH 1: mỗi thread một consumer (phổ biến nhất, đơn giản nhất)\n" +
        "for (int i = 0; i < 4; i++) {\n" +
        "    executor.submit(() -> {\n" +
        "        try (var c = new KafkaConsumer<String, String>(props)) {\n" +
        "            c.subscribe(List.of(\"orders\"));\n" +
        "            while (running) c.poll(Duration.ofSeconds(1)).forEach(this::process);\n" +
        "        }\n" +
        "    });\n" +
        "}\n" +
        "// + đơn giản, giữ thứ tự trong partition. - trần song song = số partition,\n" +
        "// mỗi consumer tốn một kết nối TCP riêng.\n" +
        "\n" +
        "// MÔ HÌNH 2: một consumer + thread pool xử lý -> vượt trần partition\n" +
        "var records = consumer.poll(Duration.ofSeconds(1));\n" +
        "for (var r : records) {\n" +
        "    int slot = Math.abs(r.key().hashCode()) % workers.length;\n" +
        "    workers[slot].submit(() -> process(r));   // PHÂN LUỒNG THEO KEY để giữ thứ tự\n" +
        "}\n" +
        "// Bắt buộc kèm pause()/resume() và commit thủ công theo tiến độ THẬT của worker,\n" +
        "// nếu không sẽ commit trước khi xử lý xong -> mất message.\n" +
        "\n" +
        "// MÔ HÌNH 3: dùng framework lo hộ — Spring Kafka\n" +
        "@KafkaListener(topics = \"orders\", concurrency = \"4\")   // tạo 4 consumer\n" +
        "public void on(ConsumerRecord<String, String> r) { process(r); }",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-1to62gw',
  q: '`fetch.min.bytes` và `fetch.max.wait.ms` điều chỉnh gì?',
  answer:
    'Điều khiển cách consumer kéo dữ liệu từ broker:\n' +
    '- `fetch.min.bytes` (mặc định 1): broker chờ tích luỹ đủ ngần này byte trước khi trả lời fetch.\n' +
    '- `fetch.max.wait.ms` (mặc định 500): thời gian tối đa broker chờ nếu chưa đủ `fetch.min.bytes`.\n\n' +
    'Tăng `fetch.min.bytes` (ví dụ 64KB) → ít request hơn, throughput tốt hơn, đổi lấy latency tối đa bằng `fetch.max.wait.ms`.',
  essence:
    'Đây là "batching phía đọc": gom nhiều dữ liệu vào một fetch response. Đánh đổi latency ↔ hiệu quả giống `linger.ms` bên producer.',
  example:
    'Consumer analytics không nhạy latency: `fetch.min.bytes=1048576`, `fetch.max.wait.ms=1000` → mỗi fetch mang ~1MB, giảm mạnh số request tới broker. Consumer realtime alerting: giữ mặc định để nhận message ngay.',
  viz: {
    type: 'compare',
    cols: ['Mặc định (fetch.min.bytes=1)', 'Tăng fetch.min.bytes (64KB–1MB)'],
    rows: [
      ['Broker trả fetch khi', 'có bất kỳ dữ liệu nào', 'đủ byte HOẶC hết fetch.max.wait.ms (500ms)'],
      ['Số request', 'nhiều', 'ít'],
      ['Latency', 'thấp', 'tối đa = fetch.max.wait.ms'],
      ['Dùng cho', 'realtime alerting', 'analytics throughput cao'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Đánh đổi độ trễ lấy hiệu quả, ở phía consumer",
      code:
        "# Consumer gửi fetch request tới broker. Broker CHỜ tới khi gom đủ\n" +
        "# fetch.min.bytes dữ liệu, HOẶC hết fetch.max.wait.ms, rồi mới trả lời.\n" +
        "fetch.min.bytes=1              # mặc định 1 = trả về ngay khi có bất kỳ dữ liệu nào\n" +
        "fetch.max.wait.ms=500          # trần thời gian chờ\n" +
        "\n" +
        "# fetch.min.bytes=1 nghĩa là khi tải nhẹ, consumer bắn liên tục fetch request\n" +
        "# và nhận về từng ít một -> tốn CPU broker và nhiều round-trip mạng.\n" +
        "# Tăng lên (ví dụ 64KB) khi throughput cao và không cần độ trễ dưới giây:\n" +
        "fetch.min.bytes=65536\n" +
        "fetch.max.wait.ms=500          # trần độ trễ thêm vào là 500ms\n" +
        "\n" +
        "# Các trần khác cần biết:\n" +
        "max.partition.fetch.bytes=1048576   # tối đa mỗi partition trả về một lần\n" +
        "fetch.max.bytes=52428800            # tối đa cho CẢ fetch request\n" +
        "\n" +
        "# BẪY: max.partition.fetch.bytes phải >= message lớn nhất, nếu không consumer\n" +
        "# sẽ TREO vĩnh viễn ở message đó (không đọc nổi, không tiến lên được).\n" +
        "# Kafka hiện đại vẫn trả về message vượt trần nếu nó là record đầu tiên,\n" +
        "# nhưng đừng dựa vào đó.",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-h9cra2',
  q: 'Xử lý message lỗi (processing failure): retry topic và DLQ?',
  answer:
    'Không nên block vòng lặp poll để retry vô hạn một message xấu (chặn cả partition).\n\n' +
    'Mẫu **non-blocking retry**:\n' +
    '- Thử xử lý; nếu lỗi tạm thời → publish message sang **retry topic** (`orders.retry.5s`, `orders.retry.1m`…) với delay tăng dần; consumer riêng đọc retry topic.\n' +
    '- Hết số lần retry / lỗi vĩnh viễn → publish sang **DLQ** (`orders.dlt`) kèm header lý do, stack trace, offset gốc.\n' +
    '- Alert trên DLQ; xử lý thủ công hoặc reprocess sau khi sửa bug.\n\n' +
    'Spring Kafka có `DeadLetterPublishingRecoverer` + `RetryableTopic`.',
  essence:
    'Tách "message độc" ra khỏi luồng chính để một record hỏng không làm nghẽn cả partition. Retry topic cho lỗi tạm, DLQ cho lỗi cần con người.',
  example:
    'Message có JSON sai schema: consumer chính bắt `DeserializationException` → đẩy nguyên bytes sang `orders.dlt` với header `exception-message`, `original-offset`. Partition tiếp tục chạy. Team data xem DLQ, sửa producer, replay.',
  viz: {
    type: 'flow',
    title: 'Non-blocking retry — đừng chặn partition vì 1 message xấu',
    nodes: ['thử xử lý', 'lỗi tạm → retry topic (delay tăng dần)', 'consumer riêng đọc retry topic', 'hết retry / lỗi vĩnh viễn → DLQ + alert'],
    steps: [
      { to: 1, label: 'publish sang orders.retry.5s, orders.retry.1m… — partition chính không nghẽn' },
      { to: 3, label: 'DLQ kèm header lý do, stack trace, offset gốc — cần con người' },
      { to: 3, label: 'Spring Kafka: RetryableTopic + DeadLetterPublishingRecoverer' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Retry topic có backoff và DLQ",
      code:
        "// Nguyên tắc: KHÔNG bao giờ chặn partition vì một message xấu, và KHÔNG bao giờ\n" +
        "// vứt im lặng. Chuyển nó sang chỗ khác rồi tiếp tục.\n" +
        "\n" +
        "// 1) Phân biệt lỗi TẠM THỜI và lỗi VĨNH VIỄN — hai loại xử lý khác hẳn nhau\n" +
        "try {\n" +
        "    process(r);\n" +
        "} catch (TransientException e) {          // DB timeout, API 503 -> đáng retry\n" +
        "    sendToRetryTopic(r, attempt + 1);\n" +
        "} catch (Exception e) {                   // JSON hỏng, thiếu field -> retry vô ích\n" +
        "    sendToDlq(r, e);\n" +
        "}\n" +
        "\n" +
        "// 2) Retry topic phân tầng theo độ trễ (Spring Kafka làm sẵn)\n" +
        "@RetryableTopic(\n" +
        "    attempts = \"4\",\n" +
        "    backoff = @Backoff(delay = 1000, multiplier = 4.0),   // 1s -> 4s -> 16s\n" +
        "    dltStrategy = DltStrategy.FAIL_ON_ERROR,\n" +
        "    exclude = {DeserializationException.class})           // lỗi này vào thẳng DLT\n" +
        "@KafkaListener(topics = \"orders\")\n" +
        "public void on(Order o) { process(o); }\n" +
        "\n" +
        "@DltHandler\n" +
        "public void dlt(Order o, @Header(KafkaHeaders.EXCEPTION_MESSAGE) String err) {\n" +
        "    log.error(\"vào DLQ: {} — {}\", o, err);\n" +
        "    alert.fire(o, err);       // DLQ phải CÓ NGƯỜI THEO DÕI, không thì vô dụng\n" +
        "}\n" +
        "\n" +
        "// 3) Gắn ngữ cảnh vào header để còn điều tra và phát lại được\n" +
        "record.headers().add(\"original-topic\", r.topic().getBytes(UTF_8));\n" +
        "record.headers().add(\"original-offset\", String.valueOf(r.offset()).getBytes(UTF_8));\n" +
        "record.headers().add(\"error\", e.getMessage().getBytes(UTF_8));\n" +
        "\n" +
        "// CẢNH BÁO: retry topic PHÁ VỠ THỨ TỰ (message lỗi bị đẩy về sau).\n" +
        "// Nghiệp vụ cần thứ tự tuyệt đối thì phải dừng partition và xử lý thủ công.",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-k781z',
  q: '`isolation.level=read_committed` làm gì?',
  answer:
    'Mặc định `read_uncommitted`: consumer thấy **mọi** message, kể cả của transaction chưa commit hoặc đã abort.\n\n' +
    '`read_committed`: consumer chỉ thấy message thuộc transaction **đã commit** (và message không giao dịch). Message của transaction bị abort bị lọc bỏ; consumer đọc tới **Last Stable Offset (LSO)** thay vì high watermark — có thể chờ nếu có transaction đang mở.',
  essence:
    'Bắt buộc đặt `read_committed` nếu upstream dùng transactional producer, nếu không bạn xử lý cả những message "chưa chắc chắn" rồi phải rollback.',
  example:
    'Pipeline EOS: producer transaction ghi `ledger`. Consumer của `ledger` phải `read_committed` — nếu để mặc định, một transaction rollback (do lỗi) vẫn khiến consumer ghi bút toán sai vào sổ cái.',
  viz: {
    type: 'compare',
    cols: ['read_uncommitted (mặc định)', 'read_committed'],
    rows: [
      ['Thấy message', 'mọi message, kể cả tx chưa commit / đã abort', 'chỉ tx đã commit + message không giao dịch'],
      ['Đọc tới', 'high watermark', 'Last Stable Offset (LSO) — có thể chờ nếu tx đang mở'],
      ['Bắt buộc khi', '—', 'upstream dùng transactional producer'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Chỉ đọc dữ liệu của transaction đã commit",
      code:
        "isolation.level=read_committed      # mặc định là read_uncommitted\n" +
        "\n" +
        "# read_uncommitted (mặc định): thấy MỌI record trong log, kể cả record thuộc\n" +
        "# transaction chưa commit hoặc đã bị ABORT. Nhanh nhất, nhưng phá vỡ EOS.\n" +
        "\n" +
        "# read_committed: consumer bỏ qua record của transaction bị abort, và KHÔNG\n" +
        "# đọc vượt qua LSO (Last Stable Offset) — offset của transaction đang mở\n" +
        "# sớm nhất. Bắt buộc nếu producer dùng transaction.\n" +
        "\n" +
        "# HỆ QUẢ ĐỘ TRỄ cần hiểu: message đã nằm trên đĩa nhưng consumer KHÔNG thấy\n" +
        "# cho tới khi marker commit được ghi. Transaction dài = độ trễ end-to-end dài.\n" +
        "# Tệ hơn: một transaction TREO (producer chết giữa chừng) làm NGHẼN toàn bộ\n" +
        "# partition cho tới hết transaction.timeout.ms.\n" +
        "\n" +
        "# Kiểm tra transaction treo khi consumer đứng im mà lag vẫn tăng:\n" +
        "#   kafka-transactions.sh --bootstrap-server localhost:9092 list\n" +
        "#   kafka-transactions.sh --bootstrap-server localhost:9092 describe --transactional-id tx-1\n" +
        "\n" +
        "# Với Kafka Streams: processing.guarantee=exactly_once_v2 tự đặt read_committed.",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-mffhfv',
  q: 'Vì sao số partition đặt trần cho khả năng scale consumer?',
  answer:
    'Trong một consumer group, mỗi partition được gán cho **đúng một** consumer. Nếu group có nhiều consumer hơn số partition, các consumer thừa **không nhận partition nào** → ngồi không (chỉ là dự phòng nóng khi có consumer khác chết).\n\n' +
    'Do đó: **song song tối đa của một group = số partition của topic**.\n\n' +
    'Tăng partition được (nhưng đổi key→partition mapping, ảnh hưởng thứ tự dữ liệu cũ); giảm không được.',
  essence:
    'Partition là "làn xe" — thêm bao nhiêu xe (consumer) cũng không vượt số làn. Lập kế hoạch partition với dự phòng cho tăng trưởng consumer.',
  example:
    'Topic 8 partition, đang chạy 8 consumer, lag vẫn tăng vì mỗi message nặng. Thêm consumer thứ 9–16 → vô ích, chúng idle. Phải: tăng partition lên 24, hoặc xử lý song song bên trong consumer, hoặc tối ưu code xử lý.',
  viz: {
    type: 'compare',
    cols: ['consumer < partition', 'consumer = partition', 'consumer > partition'],
    rows: [
      ['Phân bổ', 'một consumer nhiều partition', '1-1, song song tối đa', 'consumer thừa ngồi không (dự phòng nóng)'],
      ['Hệ quả', 'chưa tận dụng hết', 'tối ưu', 'thêm consumer vô ích → phải tăng partition'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Một partition không bao giờ chia cho hai consumer cùng group",
      code:
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders\n" +
        "# Partitions: 6\n" +
        "\n" +
        "# 6 partition, 3 consumer -> mỗi consumer 2 partition\n" +
        "# 6 partition, 6 consumer -> mỗi consumer 1 partition   <- điểm tối đa hữu ích\n" +
        "# 6 partition, 10 consumer -> 4 consumer NGỒI KHÔNG, lag không hề giảm\n" +
        "\n" +
        "# Vì sao Kafka thiết kế vậy: để đảm bảo THỨ TỰ trong partition. Hai consumer\n" +
        "# cùng đọc một partition thì không còn thứ tự nào cả.\n" +
        "\n" +
        "# 4 consumer \"dự phòng\" không hoàn toàn vô ích: một consumer chết thì rebalance\n" +
        "# gán ngay partition đó cho consumer rảnh -> failover nhanh. Nhưng chúng\n" +
        "# KHÔNG làm tăng throughput.\n" +
        "\n" +
        "# Khi đụng trần mà vẫn lag, theo thứ tự nên thử:\n" +
        "#  1) làm việc xử lý nhanh hơn (batch, bỏ N+1 query, bỏ gọi API đồng bộ)\n" +
        "#  2) một consumer + thread pool phân luồng theo key -> vượt trần partition\n" +
        "#  3) cuối cùng mới tăng partition:\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --alter --topic orders --partitions 12\n" +
        "# -> đổi ánh xạ key, phá thứ tự của key hiện có. Không giảm lại được.",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-sn8sf2',
  q: 'Đọc một compacted topic từ đầu có gì khác biệt?',
  answer:
    'Compacted topic giữ **bản mới nhất cho mỗi key** (cộng thêm phần "tail" gần đây chưa nén, có thể còn nhiều bản của cùng key).\n\n' +
    'Đọc từ `earliest` → nhận một "ảnh chụp" trạng thái hiện tại: mỗi key xuất hiện ít nhất một lần với giá trị mới nhất, cộng vài bản lịch sử ở đuôi. Message value = `null` là **tombstone** — nghĩa là key đã bị xoá.\n\n' +
    'Đây là cách một service mới dựng lại toàn bộ state mà không cần lịch sử đầy đủ.',
  essence:
    'Compacted topic ≈ một bảng key-value được stream hoá. Đọc từ đầu = bootstrap trạng thái; tombstone = lệnh xoá.',
  example:
    'Topic `customer-profile` (compact). Service gợi ý mới deploy: đọc từ `earliest`, dựng `Map<customerId, Profile>` trong bộ nhớ/RocksDB, gặp tombstone thì xoá key. Sau khi bắt kịp, chuyển sang xử lý sự kiện realtime. Đây chính là KTable của Kafka Streams.',
  viz: {
    type: 'flow',
    title: 'Đọc compacted topic từ earliest = bootstrap trạng thái',
    nodes: ['seek earliest', 'nhận "ảnh chụp" (bản mới nhất mỗi key)', 'value = null → tombstone (key đã xoá)', 'dựng Map<key, value> / RocksDB', 'bắt kịp → chuyển realtime'],
    steps: [
      { to: 1, label: 'mỗi key xuất hiện ≥ 1 lần với giá trị mới nhất + vài bản lịch sử ở đuôi chưa nén' },
      { to: 2, label: 'gặp tombstone → xoá key khỏi state' },
      { to: 4, label: 'service mới dựng lại toàn bộ state mà không cần lịch sử đầy đủ — chính là KTable' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bạn nhận trạng thái, không phải lịch sử",
      code:
        "// Trên topic compacted, đọc từ đầu KHÔNG cho bạn toàn bộ lịch sử — chỉ cho\n" +
        "// bản ghi MỚI NHẤT của mỗi key (cộng phần \"dirty\" chưa được nén).\n" +
        "p.put(\"auto.offset.reset\", \"earliest\");\n" +
        "consumer.subscribe(List.of(\"user-profiles\"));\n" +
        "\n" +
        "Map<String, Profile> state = new HashMap<>();\n" +
        "while (catchingUp) {\n" +
        "    var records = consumer.poll(Duration.ofMillis(500));\n" +
        "    for (var r : records) {\n" +
        "        if (r.value() == null) state.remove(r.key());   // TOMBSTONE = đã xoá\n" +
        "        else state.put(r.key(), parse(r.value()));      // bản mới ghi đè bản cũ\n" +
        "    }\n" +
        "    // Dựng xong khi đã bắt kịp cuối log\n" +
        "    catchingUp = !caughtUp(consumer);\n" +
        "}\n" +
        "\n" +
        "// Ba điều phải nhớ:\n" +
        "//  1) OFFSET KHÔNG LIÊN TỤC — bản ghi bị nén đã biến mất, offset nhảy cóc.\n" +
        "//     Đừng viết code giả định offset tăng đều từng bước.\n" +
        "//  2) Có thể thấy NHIỀU bản của cùng một key (phần chưa được nén) -> phải\n" +
        "//     xử lý theo kiểu ghi đè, bản sau thắng bản trước.\n" +
        "//  3) TOMBSTONE (value = null) chỉ tồn tại trong delete.retention.ms (24h).\n" +
        "//     Dựng lại trạng thái sau thời gian đó sẽ KHÔNG thấy lệnh xoá nữa.\n" +
        "\n" +
        "// Đây chính là cơ chế changelog topic của Kafka Streams dùng để khôi phục state store.",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-1eaqk95',
  q: 'Follower fetching (`client.rack`) giúp gì cho consumer đa vùng?',
  answer:
    'Mặc định consumer luôn đọc từ **leader** partition, dù leader nằm ở AZ/region khác → tốn phí truyền dữ liệu cross-AZ và thêm latency.\n\n' +
    'Từ Kafka 2.4: đặt `client.rack` trên consumer + `replica.selector.class=RackAwareReplicaSelector` trên broker → consumer đọc từ **follower cùng rack** nếu có (follower vẫn chỉ replicate, nhưng được phép phục vụ fetch cho consumer).\n\n' +
    'Ghi vẫn luôn qua leader; chỉ đọc mới được định tuyến theo rack.',
  essence:
    'Follower fetching cắt lưu lượng đọc cross-AZ bằng cách cho consumer lấy dữ liệu từ bản sao gần nhất. Đổi lại consumer có thể đọc dữ liệu trễ hơn leader vài mili giây.',
  example:
    'Cụm trải 3 AZ, consumer analytics chạy ở AZ-c: đặt `client.rack=az-c` → consumer đọc từ follower ở az-c thay vì leader ở az-a → hoá đơn data transfer AWS giảm đáng kể cho pipeline throughput lớn.',
  viz: {
    type: 'flow',
    title: 'Follower fetching (client.rack)',
    nodes: ['mặc định: consumer đọc leader', 'leader ở AZ khác → phí cross-AZ + latency', 'set client.rack + RackAwareReplicaSelector', 'consumer đọc follower cùng rack'],
    steps: [
      { to: 2, label: 'consumer client.rack=az-c + broker replica.selector.class' },
      { to: 3, label: 'follower vẫn chỉ replicate nhưng được phép phục vụ fetch' },
      { to: 3, label: 'GHI vẫn luôn qua leader; chỉ ĐỌC định tuyến theo rack (trễ hơn leader vài ms)' },
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Cắt chi phí truyền dữ liệu liên vùng",
      code:
        "# Mặc định, consumer LUÔN đọc từ LEADER. Leader nằm ở AZ khác -> mọi byte đọc\n" +
        "# đều tính phí truyền liên vùng, và độ trễ cao hơn. Với lưu lượng lớn,\n" +
        "# đây thường là khoản tiền lớn nhất trong hoá đơn Kafka.\n" +
        "\n" +
        "# Trên BROKER — cho phép phục vụ đọc từ follower:\n" +
        "replica.selector.class=org.apache.kafka.common.replica.RackAwareReplicaSelector\n" +
        "broker.rack=ap-southeast-1a          # đặt đúng AZ của từng broker\n" +
        "\n" +
        "# Trên CONSUMER — khai báo mình đang ở đâu:\n" +
        "client.rack=ap-southeast-1a\n" +
        "# -> Kafka trả về replica CÙNG rack nếu có, không thì rơi về leader như cũ.\n" +
        "\n" +
        "# CÁI GIÁ: follower luôn tụt sau leader một chút, và consumer chỉ đọc được\n" +
        "# tới HIGH WATERMARK -> độ trễ end-to-end tăng nhẹ. Đổi lại là tiền và băng thông.\n" +
        "\n" +
        "# Ghi thì vẫn BẮT BUỘC qua leader — follower fetching chỉ áp dụng cho ĐỌC.\n" +
        "# Cần cả Kafka 2.4+ ở broker lẫn client.",
    },
  ],
},
{
  cat: 'Consumer',
  id: 'kafka-7b3be7',
  q: 'Khi nào nên dùng plain consumer, Kafka Streams, hay Kafka Connect?',
  answer:
    '- **Plain consumer (client API)**: kiểm soát tối đa, logic tuỳ ý, tích hợp vào service hiện có. Bạn tự lo threading, offset, retry, state.\n' +
    '- **Kafka Streams**: thư viện xử lý luồng — map/filter/join/aggregate/windowing, quản lý state store + changelog, exactly-once tích hợp. Chạy như một app thường (không cần cụm riêng). Dùng khi logic là "biến đổi topic thành topic".\n' +
    '- **Kafka Connect**: framework tích hợp dữ liệu no-code/low-code — source (DB→Kafka) và sink (Kafka→S3/ES/JDBC), có SMT, chạy cluster riêng. Dùng để **đổ dữ liệu** giữa Kafka và hệ thống ngoài.',
  essence:
    'Consumer cho logic nghiệp vụ tuỳ biến; Streams cho pipeline transform/aggregate có state; Connect cho di chuyển dữ liệu vào/ra Kafka mà không viết code.',
  example:
    'Đồng bộ Postgres → Kafka: Connect + Debezium (source). Tính "doanh thu 5 phút gần nhất theo cửa hàng": Kafka Streams windowed aggregation. Gửi email khi đơn hàng > 10 triệu: plain consumer trong service notification.',
  viz: {
    type: 'compare',
    cols: ['Plain consumer', 'Kafka Streams', 'Kafka Connect'],
    rows: [
      ['Vai trò', 'logic nghiệp vụ tuỳ biến', 'transform/aggregate/join có state', 'di chuyển dữ liệu vào/ra Kafka'],
      ['Bạn tự lo', 'threading, offset, retry, state', 'ít — thư viện quản lý state + changelog + EOS', 'gần như không (config)'],
      ['Chạy như', 'trong service của bạn', 'app thường', 'cluster Connect riêng'],
      ['Ví dụ', 'gửi email khi đơn > 10 triệu', 'doanh thu 5 phút theo cửa hàng', 'Postgres → Kafka (Debezium)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba công cụ cho ba loại việc",
      code:
        "// PLAIN CONSUMER — cần kiểm soát hoàn toàn, hoặc logic không hợp mô hình luồng\n" +
        "consumer.subscribe(List.of(\"orders\"));\n" +
        "while (running) consumer.poll(Duration.ofSeconds(1)).forEach(this::callExternalApi);\n" +
        "// Hợp khi: gọi API bên ngoài, logic nghiệp vụ phức tạp, cần tự quản offset.\n" +
        "// Phải tự lo: rebalance, commit, retry, DLQ, đa luồng.\n" +
        "\n" +
        "// KAFKA STREAMS — biến đổi Kafka -> Kafka, có TRẠNG THÁI\n" +
        "StreamsBuilder b = new StreamsBuilder();\n" +
        "b.stream(\"orders\", Consumed.with(Serdes.String(), orderSerde))\n" +
        " .filter((k, v) -> v.total() > 100)\n" +
        " .groupByKey()\n" +
        " .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))\n" +
        " .aggregate(Stats::new, (k, v, agg) -> agg.add(v), Materialized.as(\"stats-store\"))\n" +
        " .toStream()\n" +
        " .to(\"order-stats\");\n" +
        "// Hợp khi: join, aggregate, cửa sổ thời gian, exactly-once. Nó lo hộ state\n" +
        "// store + changelog topic + khôi phục sau sự cố. Chỉ là một THƯ VIỆN,\n" +
        "// không cần cụm xử lý riêng.\n" +
        "\n" +
        "// KAFKA CONNECT — di chuyển dữ liệu giữa Kafka và hệ thống ngoài, KHÔNG viết code\n" +
        "// (cấu hình JSON, chạy ở chế độ distributed, có sẵn retry/offset/scale)\n" +
        "// Hợp khi: CDC từ Postgres (Debezium), đổ sang S3/Elasticsearch/BigQuery.\n" +
        "// Đừng viết tay consumer để làm việc mà connector có sẵn đã làm tốt hơn.",
    },
    {
      lang: "json",
      title: "Ví dụ một connector thay cho hàng trăm dòng code",
      code:
        "{\n" +
        "  \"name\": \"postgres-source\",\n" +
        "  \"config\": {\n" +
        "    \"connector.class\": \"io.debezium.connector.postgresql.PostgresConnector\",\n" +
        "    \"database.hostname\": \"postgres\",\n" +
        "    \"database.dbname\": \"orders\",\n" +
        "    \"topic.prefix\": \"cdc\",\n" +
        "    \"plugin.name\": \"pgoutput\",\n" +
        "    \"transforms\": \"unwrap\",\n" +
        "    \"transforms.unwrap.type\": \"io.debezium.transforms.ExtractNewRecordState\"\n" +
        "  }\n" +
        "}",
    },
  ],
},
]);
