SS.addQuestions('kafka', [
{
  cat: 'Nền tảng',
  id: 'kafka-1y7ch7z',
  q: 'Kafka là gì? Khác message queue truyền thống (RabbitMQ) ở đâu?',
  answer:
    'Kafka là **distributed commit log** phân tán: producer *append* message vào log, consumer *đọc theo offset*. Message **không bị xoá khi đọc** — chúng tồn tại theo retention (thời gian/dung lượng).\n\n' +
    'Khác broker truyền thống:\n' +
    '- **Pull-based**: consumer tự kéo với tốc độ của mình; không có "push" gây quá tải.\n' +
    '- **Replayable**: nhiều consumer group đọc độc lập cùng dữ liệu, tua lại offset bất kỳ.\n' +
    '- **Ordering theo partition**, throughput cao nhờ ghi tuần tự lên đĩa + zero-copy.\n' +
    '- RabbitMQ mạnh về routing linh hoạt, per-message ack, TTL/priority; Kafka mạnh về throughput, lưu trữ, stream processing.',
  essence:
    'Kafka là "cuốn nhật ký sự kiện có thể tua lại", không phải hàng đợi tiêu thụ-rồi-mất. Consumer là người đọc log tại một vị trí, không phải người "nhận và xoá".',
  example:
    'Một sự kiện `OrderCreated` được: service kho đọc để trừ tồn, service email đọc để gửi mail, pipeline analytics đọc để nạp vào data lake — ba consumer group, cùng một topic, offset riêng. Với RabbitMQ bạn phải fan-out qua nhiều queue.',
  viz: {
    type: 'compare',
    cols: ['Kafka (commit log)', 'RabbitMQ (message broker)'],
    rows: [
      ['Message sau khi đọc', 'vẫn còn theo retention', 'ack rồi là mất'],
      ['Mô hình', 'pull — consumer tự kéo', 'push tới consumer'],
      ['Nhiều consumer', 'mỗi group đọc độc lập, tua lại offset', 'phải fan-out nhiều queue'],
      ['Thế mạnh', 'throughput, lưu trữ, stream processing', 'routing linh hoạt, per-message ack, TTL/priority'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Điểm khác cốt lõi: đọc xong message vẫn còn nguyên",
      code:
        "// RabbitMQ: broker ĐẨY message, consumer ack -> message BỊ XOÁ khỏi queue.\n" +
        "// Muốn nhiều bên cùng nhận -> phải nhân bản ra nhiều queue.\n" +
        "\n" +
        "// Kafka: message là bản ghi APPEND-ONLY trên đĩa, đọc KHÔNG xoá.\n" +
        "// Mỗi consumer group giữ con trỏ (offset) riêng trên cùng một log.\n" +
        "Properties p = new Properties();\n" +
        "p.put(\"bootstrap.servers\", \"kafka:9092\");\n" +
        "p.put(\"group.id\", \"billing\");             // group A đọc từ offset của riêng nó\n" +
        "KafkaConsumer<String, String> billing = new KafkaConsumer<>(p);\n" +
        "\n" +
        "p.put(\"group.id\", \"analytics\");            // group B đọc CÙNG dữ liệu đó,\n" +
        "KafkaConsumer<String, String> analytics = new KafkaConsumer<>(p);  // offset riêng\n" +
        "\n" +
        "// Hệ quả thực tế của thiết kế này:\n" +
        "//  - thêm consumer mới không ảnh hưởng gì tới consumer đang chạy\n" +
        "//  - tua lại lịch sử được (seek về offset cũ) -> replay khi sửa bug\n" +
        "//  - dữ liệu giữ theo THỜI GIAN (retention), không theo \"đã đọc hay chưa\"\n" +
        "//  - đổi lại: KHÔNG có routing phức tạp như exchange của RabbitMQ,\n" +
        "//    không có priority queue, không xoá lẻ từng message",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-1wwtchq',
  q: 'Topic, partition và offset là gì?',
  answer:
    '**Topic**: tên logic của một luồng sự kiện (ví dụ `orders`).\n\n' +
    '**Partition**: mỗi topic chia thành N partition — mỗi partition là một **log có thứ tự, append-only**, lưu trên đĩa của broker. Đây là đơn vị song song và nhân bản.\n\n' +
    '**Offset**: số thứ tự tăng dần, **duy nhất trong một partition**, gán cho mỗi message. Consumer theo dõi "đã đọc tới offset nào" cho từng partition.\n\n' +
    'Không có offset toàn cục cho topic; thứ tự chỉ tồn tại trong phạm vi một partition.',
  essence:
    'Topic là khái niệm; partition là đơn vị vật lý + song song + thứ tự; offset là con trỏ đọc trong một partition. Mọi bảo đảm của Kafka đều gắn với partition.',
  example:
    'Topic `orders` 6 partition. Message key = `customerId` → mọi sự kiện của cùng một khách vào cùng partition, đọc lại đúng thứ tự. Consumer lag của partition 3 = latest offset (100) − committed offset (85) = 15 message chưa xử lý.',
  viz: {
    type: 'tree',
    title: 'Topic → Partition → Offset',
    root: {
      label: 'Topic "orders" (tên logic của luồng sự kiện)',
      children: [
        { label: 'Partition 0', note: 'log append-only có thứ tự, trên đĩa 1 broker — đơn vị song song + nhân bản' },
        { label: 'Partition 1 … N', note: 'không có offset toàn cục cho topic' },
        { label: 'Offset', note: 'số thứ tự tăng dần, duy nhất TRONG một partition; consumer theo dõi "đọc tới đâu"' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Ba tầng: topic -> partition -> offset",
      code:
        "# Topic = tên logic. Partition = log vật lý được ghi nối tiếp. Offset = số thứ tự trong partition.\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 \\\n" +
        "  --create --topic orders --partitions 6 --replication-factor 3\n" +
        "\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders\n" +
        "# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3\n" +
        "# Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1\n" +
        "\n" +
        "# Xem offset đầu và cuối của từng partition\n" +
        "kafka-run-class.sh kafka.tools.GetOffsetShell \\\n" +
        "  --bootstrap-server localhost:9092 --topic orders --time -1   # log end offset\n" +
        "kafka-run-class.sh kafka.tools.GetOffsetShell \\\n" +
        "  --bootstrap-server localhost:9092 --topic orders --time -2   # earliest offset\n" +
        "\n" +
        "# Offset là DUY NHẤT TRONG MỘT PARTITION, không phải trong topic.\n" +
        "# orders-0 offset 5 và orders-1 offset 5 là hai message hoàn toàn khác nhau.\n" +
        "# Offset chỉ TĂNG, không tái sử dụng kể cả sau khi message cũ bị xoá theo retention.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-5ccnvc',
  q: 'Vì sao Kafka chia partition? Đánh đổi gì về thứ tự?',
  answer:
    'Partition cho phép:\n' +
    '- **Mở rộng ngang**: các partition nằm trên nhiều broker → ghi/đọc song song, vượt giới hạn một máy.\n' +
    '- **Song song hoá consumer**: trong một consumer group, mỗi partition được gán cho tối đa **một** consumer → số partition = trần số consumer chạy song song.\n\n' +
    'Đánh đổi: **thứ tự chỉ đảm bảo trong một partition**, không phải toàn topic. Muốn giữ thứ tự cho một thực thể (user, tài khoản, đơn hàng), phải dùng **cùng key** để chúng rơi vào cùng partition.',
  essence:
    'Partition đổi "thứ tự toàn cục" lấy "throughput và song song". Bạn thiết kế key để nhóm những sự kiện *cần* thứ tự vào chung một partition.',
  example:
    'Sự kiện tài khoản ngân hàng: key = `accountId`. Nạp tiền rồi rút tiền của cùng tài khoản luôn cùng partition → consumer xử lý đúng thứ tự. Sự kiện của tài khoản khác nằm partition khác, xử lý song song.',
  viz: {
    type: 'compare',
    cols: ['Không chia partition', 'Chia partition (theo key)'],
    rows: [
      ['Thứ tự', 'toàn topic', 'chỉ trong một partition'],
      ['Throughput', 'giới hạn một máy', 'mở rộng ngang trên nhiều broker'],
      ['Song song consumer', '1', 'tối đa = số partition'],
      ['Giữ thứ tự cho 1 thực thể', '—', 'dùng cùng key → cùng partition'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Partition mua song song bằng cái giá là thứ tự toàn cục",
      code:
        "// Partition giải quyết hai việc:\n" +
        "//  1) SONG SONG: mỗi partition được đúng một consumer trong group xử lý\n" +
        "//  2) DUNG LƯỢNG: một topic không bị giới hạn bởi đĩa của một broker\n" +
        "\n" +
        "// ĐÁNH ĐỔI: Kafka CHỈ đảm bảo thứ tự TRONG một partition, không phải toàn topic.\n" +
        "producer.send(new ProducerRecord<>(\"orders\", null, \"tạo đơn 123\"));   // -> partition 3\n" +
        "producer.send(new ProducerRecord<>(\"orders\", null, \"huỷ đơn 123\"));   // -> partition 5\n" +
        "// Hai message này có thể được xử lý theo thứ tự NGƯỢC nhau -> huỷ trước khi tạo.\n" +
        "\n" +
        "// Cách giữ thứ tự cho những message CÓ LIÊN QUAN: dùng chung key\n" +
        "producer.send(new ProducerRecord<>(\"orders\", \"order-123\", \"tạo đơn\"));\n" +
        "producer.send(new ProducerRecord<>(\"orders\", \"order-123\", \"huỷ đơn\"));\n" +
        "// cùng key -> cùng partition -> đảm bảo đúng thứ tự với nhau.\n" +
        "// Đây là kỹ thuật quan trọng nhất khi thiết kế topic: chọn key sao cho\n" +
        "// mọi message cần thứ tự với nhau đều rơi vào cùng một partition.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-z9xsoz',
  q: 'Broker, cluster và controller là gì? KRaft khác ZooKeeper thế nào?',
  answer:
    '**Broker**: một tiến trình Kafka, lưu một tập partition (leader hoặc follower). Nhiều broker tạo thành **cluster**.\n\n' +
    '**Controller**: một broker được bầu làm điều phối — quản lý metadata, bầu leader partition, xử lý broker join/leave.\n\n' +
    'Trước: metadata + bầu cử lưu ở **ZooKeeper** (cụm riêng, thêm vận hành). Từ Kafka 3.3+ ổn định **KRaft**: Kafka tự quản metadata bằng một Raft log nội bộ (`__cluster_metadata`), bỏ hẳn ZooKeeper — triển khai đơn giản hơn, scale metadata tốt hơn, recovery nhanh hơn. Kafka 4.0 chỉ còn KRaft.',
  essence:
    'Broker lưu dữ liệu; controller lưu "bản đồ" cụm. KRaft gộp vai trò của ZooKeeper vào chính Kafka, giảm một thành phần phải vận hành.',
  example:
    'Cụm cũ: 3 ZooKeeper + 5 Kafka broker. Cụm KRaft: 3 node "controller" (hoặc combined) + broker — ít hạ tầng, và khi controller đổi thì cụm phục hồi metadata trong vài giây thay vì đọc lại toàn bộ từ ZK.',
  viz: {
    type: 'compare',
    cols: ['ZooKeeper (cũ)', 'KRaft (Kafka 3.3+, bắt buộc từ 4.0)'],
    rows: [
      ['Lưu metadata + bầu cử', 'cụm ZooKeeper riêng', 'Raft log nội bộ __cluster_metadata'],
      ['Thành phần vận hành', 'ZK + Kafka broker', 'chỉ Kafka (controller/combined node)'],
      ['Scale metadata', 'giới hạn', 'tốt hơn'],
      ['Recovery khi đổi controller', 'đọc lại từ ZK', 'vài giây'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "KRaft: bỏ ZooKeeper, controller nằm trong chính Kafka",
      code:
        "# Trước: metadata (topic, partition, ISR, ACL) nằm ở ZooKeeper -> phải vận hành\n" +
        "# HAI cụm, và số partition tối đa bị chặn ~200k vì controller phải nạp hết từ ZK.\n" +
        "\n" +
        "# KRaft (mặc định từ Kafka 3.3, ZooKeeper bị xoá hẳn ở 4.0):\n" +
        "process.roles=broker,controller       # gộp; production nên tách riêng vai trò\n" +
        "node.id=1\n" +
        "controller.quorum.voters=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093\n" +
        "listeners=PLAINTEXT://:9092,CONTROLLER://:9093\n" +
        "controller.listener.names=CONTROLLER\n" +
        "\n" +
        "# Controller là một broker được bầu, chịu trách nhiệm: bầu leader cho partition,\n" +
        "# theo dõi broker sống/chết, áp dụng thay đổi metadata.\n" +
        "# KRaft lưu metadata thành MỘT LOG KAFKA (topic __cluster_metadata) -> controller\n" +
        "# mới chỉ cần đọc tiếp từ offset cuối thay vì nạp lại toàn bộ -> failover\n" +
        "# từ hàng chục giây xuống dưới một giây, và scale tới hàng triệu partition.",
    },
  ],
},
{
  cat: 'Nền tảng',
  diagram: 'kafka-replication',
  id: 'kafka-163jqzt',
  q: 'Replication factor, leader/follower và ISR là gì?',
  answer:
    '**Replication factor (RF)**: mỗi partition có RF bản sao trên RF broker khác nhau. RF=3 chịu được mất 2 broker.\n\n' +
    'Một bản là **leader** (nhận mọi read/write), các bản còn lại là **follower** (fetch dữ liệu từ leader để bám theo).\n\n' +
    '**ISR (In-Sync Replicas)**: tập các replica (gồm leader) đang bám kịp leader trong `replica.lag.time.max.ms`. Follower tụt lại bị loại khỏi ISR; bắt kịp thì được thêm lại. Leader mới chỉ được bầu từ ISR (trừ khi bật unclean election).',
  essence:
    'RF là số bản sao; ISR là số bản sao *đang thực sự đồng bộ*. Độ bền thực tế phụ thuộc kích thước ISR, không chỉ RF.',
  example:
    'RF=3, `min.insync.replicas=2`, producer `acks=all`: message được coi là "đã ghi" khi có mặt ở ≥ 2 replica trong ISR. Nếu 2 follower cùng chết, ISR còn 1 < 2 → producer nhận lỗi thay vì ghi rủi ro mất dữ liệu.',
  demo: [
    {
      lang: "bash",
      title: "ISR quyết định lúc nào ghi được coi là an toàn",
      code:
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders\n" +
        "# Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3   <- khoẻ\n" +
        "# Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2       <- CẢNH BÁO: 2 replica tụt lại\n" +
        "\n" +
        "# Replicas = danh sách được PHÂN CÔNG giữ bản sao.\n" +
        "# ISR (In-Sync Replicas) = tập con đang THEO KỊP leader.\n" +
        "# Follower tụt quá replica.lag.time.max.ms (mặc định 30s) -> bị loại khỏi ISR.\n" +
        "\n" +
        "# Mọi đọc/ghi đều qua LEADER (trừ follower fetching). Follower chỉ sao chép.\n" +
        "# Leader chết -> controller bầu leader mới TỪ ISR -> không mất dữ liệu đã ack.\n" +
        "\n" +
        "# RF=3 là mặc định nên dùng ở production: chịu được mất 1 broker mà vẫn ghi được\n" +
        "# với min.insync.replicas=2. RF=1 nghĩa là broker chết = mất dữ liệu vĩnh viễn.\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name orders \\\n" +
        "  --add-config min.insync.replicas=2",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-1wbyjum',
  q: 'Producer ghi vào đâu và consumer đọc từ đâu trong một partition?',
  answer:
    'Cả read và write của một partition đều đi qua **leader** của partition đó. Producer gửi tới broker đang giữ leader; consumer fetch từ leader.\n\n' +
    'Follower **không phục vụ client**, chỉ replicate. (Từ Kafka 2.4 có "follower fetching" cho consumer đọc từ replica gần về mặt địa lý để giảm chi phí cross-AZ, nhưng mặc định vẫn là leader.)\n\n' +
    'Producer biết leader nào nhờ **metadata** lấy từ bất kỳ broker nào (bootstrap), và tự cập nhật khi leader đổi.',
  essence:
    'Leader partition là điểm truy cập duy nhất cho dữ liệu partition đó — đơn giản hoá tính nhất quán. Follower chỉ để dự phòng.',
  example:
    'Broker giữ leader partition 4 bị chết → controller bầu một follower trong ISR làm leader mới → producer/consumer nhận `NotLeaderForPartition`, refresh metadata, chuyển sang broker mới. Gián đoạn thường dưới một giây.',
  viz: {
    type: 'flow',
    title: 'Read/write một partition đều qua leader',
    nodes: ['client', 'metadata (bootstrap)', 'leader broker', 'follower (chỉ replicate)'],
    steps: [
      { to: 1, label: 'client lấy metadata: leader partition nằm ở broker nào' },
      { to: 2, label: 'producer ghi + consumer fetch đều đi tới leader' },
      { to: 3, label: 'follower fetch từ leader để bám theo — không phục vụ client (trừ follower fetching)' },
      { to: 2, label: 'leader chết → controller bầu follower ISR làm leader → client refresh metadata' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ghi ở cuối log, đọc từ offset tự chọn",
      code:
        "// GHI: producer luôn append vào CUỐI partition. Không sửa, không chèn giữa.\n" +
        "RecordMetadata md = producer.send(new ProducerRecord<>(\"orders\", \"k1\", \"v1\")).get();\n" +
        "System.out.println(md.partition() + \"@\" + md.offset());   // orders-3@10472\n" +
        "\n" +
        "// ĐỌC: consumer tự quyết đọc từ đâu — đây là điểm khác biệt lớn nhất\n" +
        "// so với message queue truyền thống.\n" +
        "consumer.subscribe(List.of(\"orders\"));           // tiếp tục từ offset đã commit\n" +
        "consumer.seekToBeginning(consumer.assignment()); // đọc lại từ đầu (replay)\n" +
        "consumer.seekToEnd(consumer.assignment());       // bỏ qua tồn đọng, đọc từ giờ\n" +
        "consumer.seek(new TopicPartition(\"orders\", 0), 10000);   // nhảy tới offset cụ thể\n" +
        "\n" +
        "// Tua theo THỜI GIAN — hay dùng nhất khi xử lý sự cố (\"phát lại từ 9h sáng nay\")\n" +
        "var tp = new TopicPartition(\"orders\", 0);\n" +
        "long ts = Instant.now().minus(2, ChronoUnit.HOURS).toEpochMilli();\n" +
        "var found = consumer.offsetsForTimes(Map.of(tp, ts));\n" +
        "consumer.seek(tp, found.get(tp).offset());",
    },
  ],
},
{
  cat: 'Lưu trữ',
  id: 'kafka-alm5f7',
  q: 'Retention và log compaction khác nhau thế nào?',
  answer:
    '`cleanup.policy`:\n' +
    '- **delete** (mặc định): xoá message cũ hơn `retention.ms` (ví dụ 7 ngày) hoặc khi partition vượt `retention.bytes`. Giữ *lịch sử theo thời gian*.\n' +
    '- **compact**: giữ **message mới nhất cho mỗi key**, xoá các bản cũ hơn của cùng key. Message key=null bị bỏ. Giữ *trạng thái hiện tại*.\n' +
    '- **compact,delete**: kết hợp cả hai.\n\n' +
    'Compaction chạy nền theo segment; luôn giữ "tail" gần nhất chưa nén.',
  essence:
    'delete = "log sự kiện có hạn sử dụng". compact = "bảng key→value phiên bản mới nhất, dạng log". Chọn theo việc bạn cần dòng sự kiện hay ảnh chụp trạng thái.',
  example:
    'Topic `user-events` (delete, 30 ngày) cho analytics. Topic `user-profile-snapshot` (compact) để service mới khởi động có thể đọc từ đầu và dựng lại profile hiện tại của mọi user mà không cần toàn bộ lịch sử. Đây là nền của Kafka Streams KTable.',
  viz: {
    type: 'compare',
    cols: ['cleanup.policy = delete', 'cleanup.policy = compact'],
    rows: [
      ['Giữ gì', 'message mới hơn retention.ms / retention.bytes', 'message mới nhất cho MỖI key'],
      ['Message key=null', 'giữ', 'bị bỏ'],
      ['Ý nghĩa', 'log sự kiện có hạn sử dụng', 'bảng key→value phiên bản mới nhất (dạng log)'],
      ['Dùng cho', 'analytics, audit theo thời gian', 'snapshot trạng thái, nền KTable'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Xoá theo thời gian vs giữ bản ghi mới nhất mỗi key",
      code:
        "# delete (mặc định): xoá segment cũ theo THỜI GIAN hoặc DUNG LƯỢNG.\n" +
        "# Dùng cho luồng SỰ KIỆN (click, log, đo lường) — dữ liệu cũ hết giá trị.\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name events --add-config \\\n" +
        "  cleanup.policy=delete,retention.ms=604800000,retention.bytes=10737418240\n" +
        "# 7 ngày HOẶC 10GB — chạm cái nào trước thì xoá cái đó.\n" +
        "\n" +
        "# compact: giữ lại BẢN GHI MỚI NHẤT CỦA MỖI KEY, mãi mãi.\n" +
        "# Dùng cho TRẠNG THÁI hiện tại (hồ sơ user, tồn kho, bảng cấu hình).\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name user-profiles --add-config \\\n" +
        "  cleanup.policy=compact,min.cleanable.dirty.ratio=0.5,segment.ms=604800000\n" +
        "\n" +
        "# Xoá một key trong topic compacted: gửi TOMBSTONE (value = null)\n" +
        "# -> giữ lại delete.retention.ms (mặc định 24h) rồi biến mất hẳn.\n" +
        "\n" +
        "# Dùng cả hai: giữ trạng thái mới nhất NHƯNG vẫn dọn bản ghi quá cũ\n" +
        "--add-config cleanup.policy=compact,delete,retention.ms=2592000000",
    },
  ],
},
{
  cat: 'Consumer group',
  diagram: 'kafka-consumer-groups',
  id: 'kafka-1egdruj',
  q: 'Consumer group là gì? Partition được gán cho consumer thế nào?',
  answer:
    'Một **consumer group** là tập consumer cùng `group.id` chia nhau đọc các partition của topic. Mỗi partition được gán cho **đúng một** consumer trong group tại một thời điểm.\n\n' +
    '- consumer < partition → một consumer giữ nhiều partition.\n' +
    '- consumer = partition → 1-1, song song tối đa.\n' +
    '- consumer > partition → consumer thừa **ngồi không**.\n\n' +
    'Nhiều group khác nhau đọc **độc lập** cùng topic (mỗi group có offset riêng) → fan-out.',
  essence:
    'Group = đơn vị "chia tải và mở rộng" cho một logic tiêu thụ. Số partition đặt trần cho khả năng song song của một group.',
  example:
    'Topic 12 partition, service thanh toán chạy 4 pod cùng group → mỗi pod 3 partition. Scale lên 12 pod → mỗi pod 1 partition. Scale lên 15 pod → 3 pod idle, cần tăng partition mới tận dụng.',
  demo: [
    {
      lang: "java",
      title: "Group là đơn vị scale, partition là đơn vị chia việc",
      code:
        "Properties p = new Properties();\n" +
        "p.put(\"bootstrap.servers\", \"kafka:9092\");\n" +
        "p.put(\"group.id\", \"order-processor\");     // CÙNG group.id -> CHIA NHAU partition\n" +
        "p.put(\"key.deserializer\", StringDeserializer.class.getName());\n" +
        "p.put(\"value.deserializer\", StringDeserializer.class.getName());\n" +
        "\n" +
        "// Quy tắc chia: MỖI partition được gán cho ĐÚNG MỘT consumer trong group.\n" +
        "// Một consumer có thể giữ nhiều partition, nhưng không bao giờ ngược lại.\n" +
        "//   topic 6 partition, 2 consumer  -> mỗi consumer 3 partition\n" +
        "//   topic 6 partition, 6 consumer  -> mỗi consumer 1 partition (tối đa hữu ích)\n" +
        "//   topic 6 partition, 8 consumer  -> 2 consumer NGỒI KHÔNG, không nhận gì cả\n" +
        "// -> số partition là TRẦN CỨNG cho khả năng mở rộng của một group.\n" +
        "\n" +
        "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\\n" +
        "  --describe --group order-processor\n" +
        "# TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG  CONSUMER-ID",
    },
  ],
},
{
  cat: 'Consumer group',
  id: 'kafka-c2vjn1',
  q: 'Offset được lưu ở đâu và bởi ai?',
  answer:
    'Consumer **tự chịu trách nhiệm** commit offset "đã xử lý xong". Kafka lưu offset trong một topic nội bộ compacted: **`__consumer_offsets`** (50 partition mặc định), key = (group, topic, partition), value = offset + metadata.\n\n' +
    'Commit có thể **tự động** (`enable.auto.commit=true`, định kỳ theo `auto.commit.interval.ms`) hoặc **thủ công** (`commitSync`/`commitAsync`).\n\n' +
    'Khi consumer khởi động / sau rebalance, nó đọc offset đã commit từ topic này để biết bắt đầu từ đâu.',
  essence:
    'Offset là trạng thái của *consumer*, không phải của broker; nó được lưu như một message compacted. "Đọc tới đâu" và "đã xử lý xong tới đâu" là hai thứ khác nhau — bạn kiểm soát bằng thời điểm commit.',
  example:
    'Auto-commit: consumer poll 100 message, sau 5s auto-commit offset 100, nhưng mới xử lý 60 thì crash → 40 message bị **mất** (at-most-once vô tình). Commit thủ công sau khi xử lý xong từng lô để đạt at-least-once.',
  viz: {
    type: 'flow',
    title: 'Offset là trạng thái của consumer',
    nodes: ['poll message', 'xử lý', 'commit offset', '__consumer_offsets (compacted)', 'restart / rebalance đọc lại'],
    steps: [
      { to: 1, label: 'consumer poll một lô message' },
      { to: 2, label: '"đọc tới đâu" ≠ "đã xử lý xong tới đâu"' },
      { to: 3, label: 'commit: auto (định kỳ) hoặc thủ công (commitSync sau khi xử lý)' },
      { to: 3, label: 'lưu vào topic nội bộ __consumer_offsets, key=(group,topic,partition)' },
      { to: 4, label: 'consumer khởi động lại đọc offset đã commit để biết bắt đầu từ đâu' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Consumer tự lưu, và lưu vào một topic Kafka bình thường",
      code:
        "// Offset KHÔNG do broker quản lý hộ. Consumer chủ động commit, và nó được ghi\n" +
        "// vào topic nội bộ __consumer_offsets (50 partition, compacted).\n" +
        "// Key = (group.id, topic, partition) -> nhờ compaction, topic này không phình.\n" +
        "\n" +
        "p.put(\"enable.auto.commit\", \"false\");    // luôn tắt ở hệ thống nghiêm túc\n" +
        "KafkaConsumer<String, String> consumer = new KafkaConsumer<>(p);\n" +
        "\n" +
        "while (true) {\n" +
        "    var records = consumer.poll(Duration.ofMillis(1000));\n" +
        "    for (var r : records) process(r);\n" +
        "    consumer.commitSync();               // commit SAU khi xử lý xong -> at-least-once\n" +
        "}\n" +
        "\n" +
        "// Auto-commit (mặc định true, mỗi 5 giây) nguy hiểm ở chỗ: nó commit theo ĐỒNG HỒ\n" +
        "// chứ không theo tiến độ xử lý. Poll xong, commit chạy, rồi mới crash giữa lúc\n" +
        "// xử lý -> message coi như đã xong nhưng thực tế chưa -> MẤT message.\n" +
        "\n" +
        "// Muốn lưu offset ở chỗ khác cũng được — lưu chung DB với dữ liệu nghiệp vụ\n" +
        "// trong CÙNG một transaction là cách đạt exactly-once phía sink:\n" +
        "consumer.seek(tp, loadOffsetFromDatabase(tp));",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-1mhsel9',
  q: 'Message key dùng để làm gì?',
  answer:
    'Key (tuỳ chọn) quyết định:\n' +
    '- **Partitioning**: `partition = hash(key) % numPartitions` (partitioner mặc định) → cùng key ⇒ cùng partition ⇒ cùng thứ tự.\n' +
    '- **Log compaction**: đơn vị "giữ bản mới nhất" là theo key.\n\n' +
    'Key = null → partitioner phân phối xoay vòng/sticky theo batch, không đảm bảo cùng đích.\n\n' +
    'Chọn key = định danh thực thể mà bạn cần thứ tự và/hoặc gom nhóm (userId, orderId, deviceId).',
  essence:
    'Key vừa là "khoá định tuyến partition" vừa là "khoá compaction". Thiết kế key = thiết kế mô hình thứ tự và trạng thái của bạn.',
  example:
    'IoT: key = `deviceId` → chuỗi telemetry của một thiết bị luôn theo thứ tự trên một partition. Nếu key = `null`, hai lần đo liên tiếp của cùng thiết bị có thể vào hai partition và bị xử lý lệch thứ tự.',
  viz: {
    type: 'compare',
    cols: ['key = deviceId', 'key = null'],
    rows: [
      ['Partition đích', 'hash(key) % N → luôn cùng partition', 'xoay vòng / sticky theo batch'],
      ['Thứ tự cho 1 thực thể', 'giữ (cùng partition)', 'không đảm bảo'],
      ['Log compaction', 'giữ bản mới nhất theo key', 'không áp dụng'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Key quyết định partition, thứ tự và compaction",
      code:
        "// 1) ĐỊNH TUYẾN: partition = murmur2(key) % numPartitions\n" +
        "producer.send(new ProducerRecord<>(\"orders\", \"customer-42\", json));\n" +
        "// mọi message của customer-42 luôn vào cùng một partition\n" +
        "\n" +
        "// 2) THỨ TỰ: cùng key -> cùng partition -> đảm bảo thứ tự với nhau\n" +
        "producer.send(new ProducerRecord<>(\"orders\", \"order-9\", \"CREATED\"));\n" +
        "producer.send(new ProducerRecord<>(\"orders\", \"order-9\", \"PAID\"));\n" +
        "producer.send(new ProducerRecord<>(\"orders\", \"order-9\", \"SHIPPED\"));  // đúng thứ tự\n" +
        "\n" +
        "// 3) COMPACTION: trên topic compacted, key là danh tính bản ghi\n" +
        "producer.send(new ProducerRecord<>(\"user-profiles\", \"user-7\", newProfile));\n" +
        "producer.send(new ProducerRecord<>(\"user-profiles\", \"user-7\", null));  // tombstone: xoá\n" +
        "\n" +
        "// key = null -> phân bổ dính (sticky): gom đầy một batch vào một partition rồi\n" +
        "// mới đổi sang partition khác. Cân bằng tốt hơn round-robin thuần vì batch to hơn.\n" +
        "\n" +
        "// BẪY LỚN: chọn key có lực lượng THẤP -> partition lệch nặng.\n" +
        "// \"country\" chỉ vài chục giá trị, và \"VN\" chiếm 90% -> một partition gánh hết.\n" +
        "// -> chọn key phân tán đều VÀ vẫn gom đúng nhóm cần thứ tự (thường là entity id).",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'kafka-bfjf3u',
  q: 'Kafka lưu trên đĩa nhưng vẫn rất nhanh — vì sao?',
  answer:
    '- **Sequential I/O**: chỉ append cuối file log → tốc độ ghi tuần tự trên HDD/SSD gần bằng RAM ngẫu nhiên, tránh seek.\n' +
    '- **Page cache của OS**: dữ liệu vừa ghi còn nóng trong page cache, consumer đọc gần realtime lấy từ RAM, không chạm đĩa. Kafka cố ý **không** cache trong JVM heap (tránh GC, tận dụng OS).\n' +
    '- **Zero-copy** (`sendfile`): gửi dữ liệu từ page cache thẳng ra socket, không copy qua user space.\n' +
    '- **Batching + compression** ở cả producer và broker → ít syscall, ít byte trên mạng.',
  essence:
    'Kafka nhanh không phải vì tránh đĩa mà vì dùng đĩa đúng cách (tuần tự) + để OS làm cache + loại bỏ copy thừa. Throughput bị giới hạn bởi NIC/đĩa, hiếm khi bởi CPU.',
  example:
    'Một broker thường trên NVMe + 10GbE đẩy hàng trăm MB/s mỗi partition. Nếu đặt `log.dirs` trên network storage có latency cao hoặc bật fsync mỗi message, throughput sụp — vì phá vỡ mô hình sequential + page cache.',
  viz: {
    type: 'tree',
    title: 'Kafka nhanh vì dùng đĩa đúng cách',
    root: {
      label: 'Throughput bị giới hạn bởi NIC/đĩa, hiếm khi bởi CPU',
      children: [
        { label: 'Sequential I/O', note: 'chỉ append cuối file → tránh seek, gần bằng RAM ngẫu nhiên' },
        { label: 'Page cache của OS', note: 'consumer đọc gần realtime lấy từ RAM; Kafka cố ý không cache trong JVM heap' },
        { label: 'Zero-copy (sendfile)', note: 'page cache → socket, không qua user space' },
        { label: 'Batching + compression', note: 'ít syscall, ít byte trên mạng' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Bốn kỹ thuật, và cái gì phá vỡ chúng",
      code:
        "# 1) GHI TUẦN TỰ: chỉ append vào cuối file. Ghi tuần tự trên HDD còn nhanh hơn\n" +
        "#    ghi ngẫu nhiên trên SSD. Không có seek, không cập nhật tại chỗ.\n" +
        "\n" +
        "# 2) PAGE CACHE: Kafka KHÔNG tự cache trong heap JVM mà dựa vào page cache của OS.\n" +
        "#    -> heap nhỏ (6GB là đủ cho broker), RAM còn lại để OS làm cache;\n" +
        "#    -> broker restart mà cache vẫn còn nóng.\n" +
        "free -h        # phần \"buff/cache\" lớn là dấu hiệu TỐT trên máy Kafka\n" +
        "\n" +
        "# 3) ZERO-COPY: sendfile() đẩy thẳng từ page cache ra network card, KHÔNG chép\n" +
        "#    qua bộ nhớ ứng dụng. Dữ liệu không đi vào không gian người dùng lần nào.\n" +
        "\n" +
        "# 4) BATCH + NÉN: gộp nhiều record thành một batch, nén cả batch, giữ nguyên\n" +
        "#    dạng nén đó suốt từ producer qua broker tới consumer.\n" +
        "\n" +
        "# PHÁ VỠ ZERO-COPY (mất phần lớn hiệu năng) khi:\n" +
        "#  - bật TLS: dữ liệu buộc phải qua tầng mã hoá trong ứng dụng\n" +
        "#  - broker phải GIẢI NÉN để chuyển đổi định dạng (client version quá cũ)\n" +
        "# -> giữ client và broker cùng thế hệ message format là việc đáng làm.",
    },
  ],
},
{
  cat: 'Lưu trữ',
  id: 'kafka-1ngyim1',
  q: 'Partition log được tổ chức thành segment như thế nào?',
  answer:
    'Mỗi partition là một thư mục chứa nhiều **segment file**: `.log` (dữ liệu), `.index` (offset → vị trí byte), `.timeindex` (timestamp → offset).\n\n' +
    'Kafka chỉ append vào **active segment**. Khi segment đạt `segment.bytes` (1GB mặc định) hoặc `segment.ms`, nó được "đóng" và mở segment mới.\n\n' +
    'Retention/compaction/xoá thao tác ở mức **segment** (xoá cả file), không xoá từng message — nên rất rẻ.',
  essence:
    'Chia segment để việc xoá dữ liệu cũ chỉ là xoá file, và tra cứu offset dùng index thưa (binary search) thay vì quét toàn bộ.',
  example:
    '`retention.ms=86400000` (1 ngày), `segment.ms=3600000` (1 giờ) → mỗi giờ một segment, sau 24 giờ segment cũ nhất bị xoá nguyên file. Đặt segment quá lớn khiến dữ liệu quá hạn vẫn nằm lại lâu vì segment chưa đóng.',
  viz: {
    type: 'flow',
    title: 'Partition log = nhiều segment file',
    nodes: ['append', 'active segment', 'đạt segment.bytes/ms', 'đóng, mở segment mới', 'retention xoá cả file'],
    steps: [
      { to: 1, label: 'chỉ append vào active segment (.log + .index + .timeindex)' },
      { to: 3, label: 'đạt 1GB (mặc định) hoặc segment.ms → đóng, mở segment mới' },
      { to: 4, label: 'retention/compaction thao tác ở mức segment — xoá nguyên file, rất rẻ' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Segment: đơn vị xoá và đơn vị tra cứu",
      code:
        "ls -la /var/lib/kafka/data/orders-0/\n" +
        "# 00000000000000000000.log     <- dữ liệu, tên = offset đầu tiên trong segment\n" +
        "# 00000000000000000000.index   <- offset  -> vị trí byte (thưa)\n" +
        "# 00000000000000000000.timeindex <- timestamp -> offset (cho offsetsForTimes)\n" +
        "# 00000000000000368912.log     <- segment ĐANG hoạt động, chỉ file này được ghi\n" +
        "\n" +
        "# Vì sao cắt segment: Kafka KHÔNG xoá từng message. Nó xoá NGUYÊN một file\n" +
        "# segment. Đó là lý do retention chỉ chính xác tới mức segment.\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name orders --add-config \\\n" +
        "  segment.bytes=1073741824,segment.ms=604800000     # cắt khi 1GB HOẶC 7 ngày\n" +
        "\n" +
        "# BẪY: segment quá LỚN -> dữ liệu quá hạn vẫn nằm đó vì segment chưa đóng.\n" +
        "#      segment quá NHỎ -> hàng chục nghìn file, tốn file descriptor, mở file chậm.\n" +
        "\n" +
        "# Tra cứu offset: nhị phân trên tên file -> tìm trong .index (thưa, mặc định\n" +
        "# mỗi 4KB một mục) -> quét tuần tự đoạn ngắn còn lại trong .log.\n" +
        "kafka-run-class.sh kafka.tools.DumpLogSegments \\\n" +
        "  --files /var/lib/kafka/data/orders-0/00000000000000000000.log --print-data-log",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-mgcm0s',
  q: 'Kafka đảm bảo thứ tự message ở mức nào?',
  answer:
    'Chỉ **trong một partition**: message ghi trước có offset nhỏ hơn và được consumer đọc trước.\n\n' +
    'Không đảm bảo giữa các partition của cùng topic. Nếu producer bật retry mà `max.in.flight.requests.per.connection > 1` và **không** bật idempotence, một lần retry có thể làm đảo thứ tự ngay trong partition.\n\n' +
    'Consumer đơn luồng đọc theo offset thì giữ thứ tự; nếu bạn xử lý message bằng thread pool thì tự phá thứ tự.',
  essence:
    'Thứ tự = thuộc tính của partition + producer cấu hình đúng + consumer xử lý tuần tự trong partition. Vỡ ở bất kỳ mắt xích nào là mất thứ tự.',
  example:
    'Để an toàn thứ tự với throughput: bật `enable.idempotence=true` (cho phép `max.in.flight=5` mà vẫn giữ thứ tự khi retry). Ở consumer, nếu cần song song, chia theo key trong nội bộ để mỗi key vẫn tuần tự.',
  viz: {
    type: 'flow',
    title: 'Thứ tự cần đúng ở cả 3 mắt xích',
    nodes: ['partition', 'producer', 'consumer'],
    steps: [
      { to: 0, label: 'thứ tự chỉ đảm bảo TRONG một partition (offset nhỏ đọc trước)' },
      { to: 1, label: 'retry + max.in.flight>1 không idempotence → có thể đảo thứ tự; bật enable.idempotence=true' },
      { to: 2, label: 'xử lý tuần tự trong partition; dùng thread pool là tự phá thứ tự' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Thứ tự chỉ có trong partition — và ba thứ phá vỡ nó",
      code:
        "// ĐẢM BẢO: trong MỘT partition, message đọc ra đúng thứ tự đã ghi. Hết.\n" +
        "// KHÔNG đảm bảo: thứ tự giữa các partition, giữa các topic.\n" +
        "\n" +
        "// PHÁ VỠ 1: retry với nhiều request đang bay cùng lúc\n" +
        "p.put(\"max.in.flight.requests.per.connection\", \"5\");\n" +
        "p.put(\"retries\", \"3\");\n" +
        "// msg1 lỗi phải gửi lại trong khi msg2 đã ghi xong -> msg2 nằm TRƯỚC msg1.\n" +
        "p.put(\"enable.idempotence\", \"true\");   // CHỮA: broker tự sắp xếp lại theo\n" +
        "                                       // sequence number, giữ được thứ tự\n" +
        "                                       // với max.in.flight tới 5\n" +
        "\n" +
        "// PHÁ VỠ 2: xử lý đa luồng phía consumer\n" +
        "records.forEach(r -> executor.submit(() -> process(r)));   // SAI: mất thứ tự\n" +
        "// CHỮA: phân luồng theo KEY, mỗi key luôn về đúng một thread\n" +
        "int slot = Math.abs(r.key().hashCode()) % workers.length;\n" +
        "workers[slot].submit(() -> process(r));\n" +
        "\n" +
        "// PHÁ VỠ 3: đổi số partition -> murmur2(key) % N đổi theo -> key cũ đi\n" +
        "// partition khác, message cũ và mới của cùng một thực thể nằm ở hai nơi.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-1yb7666',
  q: 'High watermark và log end offset là gì?',
  answer:
    '**Log End Offset (LEO)**: offset của message kế tiếp sẽ được ghi vào một replica (cuối log của replica đó).\n\n' +
    '**High Watermark (HW)**: offset lớn nhất đã được **replicate tới tất cả replica trong ISR**. Consumer (mặc định) chỉ đọc được tới HW − 1 — gọi là message "committed".\n\n' +
    'Message nằm giữa HW và LEO của leader là "chưa committed": nếu leader chết trước khi ISR bám kịp, chúng có thể bị mất/truncate.',
  essence:
    'LEO là "đã viết tới đâu"; HW là "đã an toàn tới đâu". Consumer chỉ thấy dữ liệu an toàn → không bao giờ đọc message rồi sau đó nó biến mất do failover.',
  example:
    'Leader ở offset 1000, hai follower ISR ở 995 và 998 → HW = 995. Consumer đọc tối đa 994. Nếu leader chết, follower ở 998 lên leader; 5 message 995–999 chưa từng "committed" nên consumer chưa đọc → không có nghịch lý.',
  viz: {
    type: 'compare',
    cols: ['Log End Offset (LEO)', 'High Watermark (HW)'],
    rows: [
      ['Nghĩa', 'offset message kế tiếp sẽ ghi (cuối log replica)', 'offset lớn nhất đã replicate tới TẤT CẢ replica ISR'],
      ['Consumer đọc được', '—', 'chỉ tới HW − 1 ("committed")'],
      ['Message giữa HW và LEO', '"đã viết" nhưng chưa an toàn', 'có thể bị truncate khi failover'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ranh giới giữa \"đã ghi\" và \"đọc được\"",
      code:
        "# LEO (Log End Offset): offset kế tiếp sẽ được ghi vào partition của MỘT replica.\n" +
        "# HW (High Watermark): offset cao nhất đã được sao chép sang TOÀN BỘ ISR.\n" +
        "\n" +
        "# Consumer CHỈ đọc được tới HW - 1. Phần từ HW tới LEO đã nằm trên đĩa leader\n" +
        "# nhưng chưa nhân bản đủ -> chưa cho đọc, vì nếu leader chết ngay lúc đó,\n" +
        "# phần đó có thể biến mất khi leader mới lên.\n" +
        "kafka-run-class.sh kafka.tools.GetOffsetShell \\\n" +
        "  --bootstrap-server localhost:9092 --topic orders --time -1   # ~ HW\n" +
        "\n" +
        "kafka-replica-verification.sh --broker-list localhost:9092 --topic-white-list orders\n" +
        "\n" +
        "# Khoảng cách LEO - HW lớn và kéo dài = follower đang tụt lại\n" +
        "# -> sắp bị loại khỏi ISR -> kiểm tra I/O đĩa và băng thông mạng giữa broker.\n" +
        "# Đây cũng chính là lý do vì sao acks=all làm tăng độ trễ end-to-end:\n" +
        "# message phải chờ nhân bản đủ ISR thì HW mới nhích lên và consumer mới thấy.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-1d1tu93',
  q: 'So sánh Kafka với AWS Kinesis và Apache Pulsar (tổng quan)?',
  answer:
    '- **Kafka**: partition-based, hệ sinh thái lớn (Connect, Streams, Schema Registry), tự vận hành hoặc managed (MSK, Confluent). Kiểm soát cao, cần vận hành.\n' +
    '- **Kinesis**: fully managed của AWS, khái niệm "shard" ~ partition, giới hạn 1MB/s ghi & 2MB/s đọc mỗi shard, retention tối đa 365 ngày, tích hợp sâu AWS (Lambda, Firehose). Ít việc vận hành, kém linh hoạt và có giới hạn cứng.\n' +
    '- **Pulsar**: tách **compute (broker) và storage (BookKeeper)**, hỗ trợ cả queue lẫn stream, multi-tenancy, geo-replication tích hợp. Kiến trúc phức tạp hơn, cộng đồng nhỏ hơn.',
  essence:
    'Kafka = tiêu chuẩn de-facto với hệ sinh thái mạnh. Kinesis = đổi tính linh hoạt lấy "không phải vận hành" trong AWS. Pulsar = kiến trúc tách tầng, linh hoạt mô hình tiêu thụ.',
  example:
    'Startup toàn AWS, tải vừa, muốn ít ops → Kinesis + Lambda. Công ty cần stream processing phức tạp, đa cloud, throughput lớn, đã có team platform → Kafka (MSK hoặc self-managed).',
  viz: {
    type: 'compare',
    cols: ['Kafka', 'Kinesis', 'Pulsar'],
    rows: [
      ['Vận hành', 'tự / managed (MSK, Confluent)', 'fully managed AWS', 'tự — kiến trúc phức tạp'],
      ['Đơn vị', 'partition', 'shard (1MB/s ghi, 2MB/s đọc)', 'partition, tách broker/BookKeeper'],
      ['Retention', 'tuỳ (tiered storage)', 'tối đa 365 ngày', 'tuỳ'],
      ['Điểm mạnh', 'hệ sinh thái Connect/Streams', 'tích hợp AWS, ít ops', 'queue + stream, multi-tenancy, geo-replication'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba hệ, cùng ý tưởng log, khác mô hình vận hành",
      code:
        "# KAFKA — log phân tán, partition gắn cứng với broker (trừ tiered storage).\n" +
        "#   + hệ sinh thái lớn nhất (Connect, Streams, Schema Registry, ksqlDB)\n" +
        "#   - scale = reassign partition, thao tác nặng; tự vận hành thì tốn người\n" +
        "kafka-topics.sh --create --topic orders --partitions 6 --replication-factor 3\n" +
        "\n" +
        "# KINESIS — managed hoàn toàn của AWS, đơn vị là \"shard\".\n" +
        "#   + không phải vận hành gì, tích hợp sẵn IAM/Lambda/Firehose\n" +
        "#   - retention tối đa 365 ngày, 1MB/record; mỗi shard 1MB/s ghi, 2MB/s đọc\n" +
        "#   - tính tiền theo shard-giờ -> đắt dần khi lưu lượng lớn\n" +
        "aws kinesis create-stream --stream-name orders --shard-count 6\n" +
        "\n" +
        "# PULSAR — TÁCH tầng phục vụ (broker) và tầng lưu trữ (BookKeeper).\n" +
        "#   + broker không giữ dữ liệu -> thêm/bớt broker gần như tức thì\n" +
        "#   + có sẵn multi-tenancy, geo-replication, cả queue lẫn stream trong một hệ\n" +
        "#   - phải vận hành THÊM BookKeeper + ZooKeeper -> phức tạp hơn hẳn\n" +
        "#   - cộng đồng và hệ sinh thái nhỏ hơn Kafka nhiều\n" +
        "\n" +
        "# Chọn: đang ở AWS và lưu lượng vừa -> Kinesis (hoặc MSK).\n" +
        "# Cần hệ sinh thái/xử lý luồng -> Kafka. Cần đa tenant + co giãn nhanh -> Pulsar.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'kafka-1xcxyo8',
  q: 'Tiered storage (KIP-405) giải quyết vấn đề gì?',
  answer:
    'Mặc định mọi dữ liệu partition nằm trên đĩa local của broker → giữ dữ liệu lâu = cần đĩa lớn, và thêm broker vào cụm phải copy nhiều dữ liệu (rebalance chậm).\n\n' +
    '**Tiered storage**: broker giữ dữ liệu "nóng" (gần đây) trên đĩa local, tự động đẩy segment cũ lên **object storage** (S3, GCS) rẻ hơn. Consumer đọc dữ liệu cũ được phục vụ trong suốt từ tier xa.\n\n' +
    'Có từ Kafka 3.6 (early access) / 3.9+ ổn định hơn; Confluent/AWS MSK đã hỗ trợ.',
  essence:
    'Tách "compute + hot data" khỏi "cold data lưu trữ lâu". Cho phép retention hàng tháng/năm với chi phí object storage, và co giãn cụm nhanh vì broker giữ ít dữ liệu local.',
  example:
    'Yêu cầu tuân thủ: giữ mọi giao dịch 2 năm. Không tiered storage: mỗi broker cần chục TB SSD. Có tiered storage: broker giữ 2 ngày local, phần còn lại trên S3 — chi phí giảm nhiều lần, replay lịch sử vẫn được.',
  viz: {
    type: 'layers',
    title: 'Tiered storage (KIP-405)',
    layers: [
      { name: 'Hot data — đĩa local broker', tag: 'gần đây', note: 'compute + dữ liệu nóng; broker giữ ít → co giãn cụm nhanh' },
      { name: 'Cold data — object storage (S3/GCS)', tag: 'segment cũ', note: 'rẻ hơn nhiều; retention hàng tháng/năm; consumer đọc trong suốt từ tier xa' },
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Tách lưu trữ khỏi tính toán",
      code:
        "# VẤN ĐỀ: muốn giữ dữ liệu 1 năm thì phải mua đĩa local cho từng broker và\n" +
        "# nhân với replication factor. Tệ hơn: thêm broker mới phải sao chép hàng TB\n" +
        "# dữ liệu cũ trước khi phục vụ được -> rebalance mất hàng giờ.\n" +
        "\n" +
        "# GIẢI PHÁP: segment cũ (đã đóng) được đẩy sang object storage (S3/GCS),\n" +
        "# đĩa local chỉ giữ phần nóng. Consumer đọc dữ liệu cũ thì broker tải về hộ,\n" +
        "# hoàn toàn trong suốt với client — không phải sửa code.\n" +
        "remote.log.storage.system.enable=true\n" +
        "remote.log.storage.manager.class.name=org.apache.kafka.server.log.remote.storage.RemoteStorageManager\n" +
        "rsm.config.chunk.size=104857600\n" +
        "\n" +
        "# Cấu hình theo topic: giữ 6 giờ trên đĩa local, tổng cộng 1 năm\n" +
        "# local.retention.ms=21600000\n" +
        "# retention.ms=31536000000\n" +
        "\n" +
        "# Lợi: chi phí giảm mạnh (S3 rẻ hơn SSD nhiều lần), rebalance nhanh vì\n" +
        "# broker mới chỉ cần sao chép phần nóng.\n" +
        "# Giá: đọc dữ liệu cũ CHẬM hơn nhiều và tốn phí truy xuất -> không hợp\n" +
        "# với consumer thường xuyên tua lại toàn bộ lịch sử.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-10bwzoy',
  q: 'Rack awareness trong Kafka là gì?',
  answer:
    'Cấu hình `broker.rack` (ví dụ = availability zone). Khi tạo/reassign partition, Kafka **phân bổ replica trải đều trên các rack** thay vì dồn vào một rack.\n\n' +
    'Nhờ đó mất nguyên một rack/AZ vẫn còn ≥ 1 replica ở rack khác → partition không offline.\n\n' +
    'Kết hợp `replica.selector.class` cho phép consumer đọc từ replica **cùng rack** (follower fetching) để giảm lưu lượng và chi phí cross-AZ.',
  essence:
    'Rack awareness biến RF thành khả năng chịu lỗi *theo miền lỗi vật lý* (AZ), không chỉ theo số broker. Thiếu nó, RF=3 vẫn có thể chết cả 3 replica nếu cùng một AZ sập.',
  example:
    'Cụm 6 broker trên 3 AZ (`broker.rack=us-east-1a/1b/1c`), RF=3 → mỗi partition có đúng 1 replica mỗi AZ. AWS bảo trì AZ 1a → mọi partition vẫn có leader/ISR ở 1b, 1c.',
  viz: {
    type: 'tree',
    title: 'Rack awareness (broker.rack = AZ)',
    root: {
      label: 'RF thành khả năng chịu lỗi theo miền lỗi vật lý (AZ)',
      children: [
        { label: 'Replica trải đều trên các rack/AZ', note: 'không dồn 3 replica vào 1 AZ' },
        { label: 'Mất nguyên 1 AZ → còn ≥ 1 replica ở AZ khác', note: 'partition không offline' },
        { label: 'Follower fetching cùng rack', note: 'replica.selector.class → giảm lưu lượng + chi phí cross-AZ' },
      ],
    },
  },
  demo: [
    {
      lang: "properties",
      title: "Trải replica ra nhiều vùng lỗi",
      code:
        "# Không cấu hình gì -> Kafka có thể đặt cả 3 replica của một partition\n" +
        "# vào 3 broker NẰM CÙNG một rack / một availability zone.\n" +
        "# Rack đó mất điện = partition đó chết hẳn dù RF=3.\n" +
        "broker.rack=ap-southeast-1a      # đặt trên TỪNG broker, khác nhau theo AZ\n" +
        "\n" +
        "# Có thông tin này, Kafka trải replica ra các rack khác nhau nhiều nhất có thể\n" +
        "# khi tạo topic hoặc reassign partition.\n" +
        "\n" +
        "# Phía consumer: đọc từ follower CÙNG rack thay vì luôn phải sang leader\n" +
        "client.rack=ap-southeast-1a\n" +
        "# -> cắt phần lớn chi phí truyền dữ liệu liên vùng (rất đáng kể trên AWS)\n" +
        "# Broker cần: replica.selector.class=org.apache.kafka.common.replica.RackAwareReplicaSelector\n" +
        "\n" +
        "# LƯU Ý: broker.rack chỉ có tác dụng cho topic TẠO SAU khi cấu hình.\n" +
        "# Topic cũ phải chạy reassignment thủ công mới trải lại được.",
    },
  ],
},
{
  cat: 'Thiết kế',
  id: 'kafka-167d0ks',
  q: 'Nên chọn số partition cho một topic như thế nào?',
  answer:
    'Cân nhắc:\n' +
    '- **Throughput mục tiêu / throughput mỗi partition** (đo bằng benchmark, thường 10–50 MB/s hoặc vài chục nghìn msg/s).\n' +
    '- **Song song consumer tối đa mong muốn** — không thể có nhiều consumer hoạt động hơn số partition trong một group.\n' +
    '- Quá nhiều partition: tăng thời gian bầu lại leader khi broker chết, tăng file descriptor và memory, rebalance chậm, độ trễ end-to-end tăng.\n\n' +
    'Kinh nghiệm: bắt đầu vừa phải (ví dụ 12–30), **tăng được** sau này (nhưng key→partition mapping sẽ đổi). Không giảm được.',
  essence:
    'Partition = min(đủ throughput, đủ song song) nhưng đừng thừa. Tăng dễ, giảm không; và tăng phá vỡ tính "cùng key cùng partition" cho dữ liệu đã có.',
  example:
    'Cần 300 MB/s, mỗi partition ~30 MB/s, muốn dự phòng 2x consumer scale → ~20 partition. Đặt 500 partition "cho chắc" khiến cụm nhỏ khởi động chậm và p99 latency xấu.',
  viz: {
    type: 'tree',
    title: 'Chọn số partition = min(đủ throughput, đủ song song), đừng thừa',
    root: {
      label: 'Tăng được sau này (nhưng key→partition đổi); KHÔNG giảm được',
      children: [
        { label: 'Throughput mục tiêu / throughput mỗi partition', note: 'benchmark ~10–50 MB/s mỗi partition' },
        { label: 'Song song consumer tối đa mong muốn', note: 'không thể nhiều consumer hoạt động hơn số partition' },
        { label: 'Quá nhiều partition', note: 'bầu lại leader lâu, nhiều file descriptor/memory, rebalance chậm, latency tăng' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Tính từ throughput, rồi chặn bởi các giới hạn thực tế",
      code:
        "# Công thức khởi điểm:\n" +
        "#   N = max(T_mục_tiêu / T_một_producer, T_mục_tiêu / T_một_consumer)\n" +
        "# Ví dụ: cần 600 MB/s, một consumer xử lý được 50 MB/s -> cần ít nhất 12 partition.\n" +
        "\n" +
        "# Rồi cộng thêm các ràng buộc:\n" +
        "#  - N là TRẦN số consumer hữu ích trong một group -> để dư chỗ tăng trưởng\n" +
        "#  - mỗi partition tốn file descriptor + bộ nhớ trên broker\n" +
        "#  - nhiều partition -> failover CHẬM hơn (controller phải bầu lại từng cái)\n" +
        "#  - producer giữ buffer riêng cho mỗi partition -> nhiều quá thì batch nhỏ đi,\n" +
        "#    throughput GIẢM chứ không tăng\n" +
        "\n" +
        "# Mốc thực dụng: 2-4 partition cho mỗi core của consumer dự kiến;\n" +
        "# giữ dưới ~4000 partition/broker và ~200k partition/cụm (KRaft nới rộng hơn nhiều).\n" +
        "\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 \\\n" +
        "  --alter --topic orders --partitions 12      # CHỈ TĂNG được, không giảm\n" +
        "\n" +
        "# Cảnh báo: tăng partition làm ĐỔI ánh xạ key -> partition, phá vỡ thứ tự của\n" +
        "# các key đang có. Thà chọn dư ngay từ đầu còn hơn tăng sau.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-gmgqkm',
  q: '`bootstrap.servers` là gì? Client tìm broker để đọc/ghi như thế nào?',
  answer:
    '`bootstrap.servers` là **danh sách vài broker khởi đầu** (không cần liệt kê hết cụm). Client kết nối tới một trong số đó và gửi **metadata request** → nhận về: danh sách toàn bộ broker, và với mỗi topic-partition thì **leader đang nằm ở broker nào**.\n\n' +
    'Từ đó client kết nối trực tiếp tới broker giữ leader của partition nó cần. Khi leader đổi (`NotLeaderForPartition`), client tự refresh metadata.\n\n' +
    'Nên đưa ≥ 2–3 broker vào list để chịu được việc broker khởi đầu bị chết lúc client start.',
  essence:
    '`bootstrap.servers` chỉ là "cửa vào" để lấy bản đồ cụm. Sau đó client tự định tuyến tới đúng leader partition, không đi qua một proxy trung tâm.',
  example:
    'Đặt `bootstrap.servers=kafka-0:9092,kafka-1:9092,kafka-2:9092`. Nếu chỉ ghi `kafka-0` và node đó đang bảo trì lúc app deploy → app không kết nối được dù cụm vẫn khoẻ.',
  viz: {
    type: 'flow',
    title: 'bootstrap.servers chỉ là "cửa vào"',
    nodes: ['client', 'kết nối 1 broker khởi đầu', 'metadata request', 'bản đồ cụm + leader map', 'kết nối leader trực tiếp'],
    steps: [
      { to: 1, label: 'bootstrap.servers = vài broker (nên ≥ 2–3 để chịu 1 node bảo trì)' },
      { to: 3, label: 'nhận danh sách toàn bộ broker + leader của mỗi topic-partition' },
      { to: 4, label: 'client định tuyến thẳng tới leader, không qua proxy trung tâm; NotLeaderForPartition → refresh' },
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Bootstrap chỉ là điểm hẹn đầu tiên",
      code:
        "# Không cần liệt kê mọi broker — client chỉ dùng danh sách này để hỏi metadata\n" +
        "# lần đầu, rồi tự biết toàn bộ cụm. Ghi 2-3 cái để phòng một cái đang chết.\n" +
        "bootstrap.servers=kafka-1:9092,kafka-2:9092,kafka-3:9092\n" +
        "\n" +
        "# Luồng: connect vào một broker bất kỳ -> xin metadata -> nhận về danh sách\n" +
        "# broker và LEADER của từng partition -> từ đó client kết nối THẲNG tới leader.\n" +
        "metadata.max.age.ms=300000        # tự làm mới metadata sau 5 phút\n" +
        "\n" +
        "# BẪY KINH ĐIỂN: advertised.listeners của broker phải là địa chỉ mà CLIENT\n" +
        "# gọi tới được. Trong Docker/K8s, broker hay báo về hostname nội bộ\n" +
        "# -> client kết nối bootstrap thành công rồi TREO khi gọi leader.\n" +
        "# Trên broker:\n" +
        "advertised.listeners=PLAINTEXT://kafka-1.example.com:9092\n" +
        "\n" +
        "# Kiểm tra client thực sự nhận được gì:\n" +
        "kafka-broker-api-versions.sh --bootstrap-server kafka-1:9092 | head",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-1i98g6z',
  q: 'Một Kafka record gồm những thành phần nào?',
  answer:
    'Mỗi record: **key** (nullable), **value** (nullable — null = tombstone khi compact), **timestamp**, **headers** (list cặp `String → byte[]`), và metadata do broker gán: **topic, partition, offset**.\n\n' +
    '`timestamp` có hai loại theo `message.timestamp.type`:\n' +
    '- `CreateTime` (mặc định): thời điểm producer tạo record.\n' +
    '- `LogAppendTime`: thời điểm broker ghi vào log.\n\n' +
    'Timestamp dùng cho retention theo thời gian, `offsetsForTimes` (tìm offset theo mốc thời gian), và windowing trong Kafka Streams.',
  essence:
    'Record = (key, value, timestamp, headers) do producer đặt + (topic, partition, offset) do broker gán. Timestamp là trục thời gian cho retention và stream processing.',
  example:
    'Replay sự kiện từ 14:00 hôm qua: `consumer.offsetsForTimes(Map.of(tp, ts))` trả offset đầu tiên có timestamp ≥ ts, rồi `seek` tới đó. Chỉ hoạt động đúng nếu producer dùng `CreateTime` hợp lý (không phải giờ lệch).',
  viz: {
    type: 'tree',
    title: 'Một Kafka record',
    root: {
      label: 'Record = (producer đặt) + (broker gán)',
      children: [
        { label: 'key (nullable)', note: 'partitioning + compaction' },
        { label: 'value (nullable)', note: 'null = tombstone khi compact' },
        { label: 'timestamp', note: 'CreateTime (mặc định) hoặc LogAppendTime — dùng cho retention, offsetsForTimes, windowing' },
        { label: 'headers', note: 'list String → byte[]' },
        { label: 'topic, partition, offset', note: 'do broker gán' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Sáu phần của một record",
      code:
        "ProducerRecord<String, String> record = new ProducerRecord<>(\n" +
        "        \"orders\",                          // 1. topic       (bắt buộc)\n" +
        "        3,                                 // 2. partition   (null = để partitioner chọn)\n" +
        "        System.currentTimeMillis(),        // 3. timestamp   (null = broker/producer tự đặt)\n" +
        "        \"order-123\",                       // 4. key         (null được)\n" +
        "        \"{\\\"total\\\":100}\");                // 5. value       (null = tombstone)\n" +
        "\n" +
        "record.headers()                           // 6. headers: metadata dạng key-value\n" +
        "      .add(\"trace-id\", traceId.getBytes(UTF_8))\n" +
        "      .add(\"content-type\", \"application/json\".getBytes(UTF_8));\n" +
        "\n" +
        "// Phía consumer, mỗi record còn kèm thông tin do broker gán:\n" +
        "for (ConsumerRecord<String, String> r : records) {\n" +
        "    r.topic(); r.partition(); r.offset();\n" +
        "    r.timestamp();                         // giá trị thật\n" +
        "    r.timestampType();                     // CreateTime (producer đặt)\n" +
        "                                           // hay LogAppendTime (broker đặt)\n" +
        "    r.serializedKeySize(); r.serializedValueSize();\n" +
        "}\n" +
        "// log.message.timestamp.type quyết định dùng loại nào. LogAppendTime cho\n" +
        "// retention chính xác hơn, nhưng mất thời điểm sự kiện THẬT ở phía nguồn.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'kafka-f08see',
  q: 'Những use case điển hình của Kafka?',
  answer:
    '- **Messaging / decoupling** giữa microservice (thay REST call trực tiếp).\n' +
    '- **Event sourcing**: log sự kiện là nguồn sự thật, dựng lại state bằng cách replay.\n' +
    '- **CDC (Change Data Capture)**: Debezium đọc binlog DB → phát sự kiện thay đổi.\n' +
    '- **Stream processing**: Kafka Streams / Flink tính toán realtime (aggregation, join, alerting).\n' +
    '- **Log & metrics aggregation**: gom log từ nhiều service.\n' +
    '- **Data integration**: Kafka Connect làm "xương sống" đổ dữ liệu giữa DB, search, data lake.',
  essence:
    'Kafka là "hệ thần kinh trung ương" cho dữ liệu chuyển động: mọi thay đổi trở thành sự kiện, nhiều hệ tiêu thụ độc lập, có thể tua lại.',
  example:
    'CDC: đơn hàng ghi vào Postgres → Debezium phát `orders` topic → sink connector nạp vào Elasticsearch (tìm kiếm) + Snowflake (BI) + service gợi ý. Không service nào phải gọi trực tiếp DB của service khác.',
  viz: {
    type: 'tree',
    title: 'Kafka — "hệ thần kinh trung ương" cho dữ liệu chuyển động',
    root: {
      label: 'Mọi thay đổi thành sự kiện; nhiều hệ tiêu thụ độc lập; tua lại được',
      children: [
        { label: 'Messaging / decoupling microservice' },
        { label: 'Event sourcing', note: 'log là nguồn sự thật, replay dựng lại state' },
        { label: 'CDC', note: 'Debezium đọc binlog DB → phát sự kiện thay đổi' },
        { label: 'Stream processing', note: 'Kafka Streams / Flink realtime' },
        { label: 'Log & metrics aggregation' },
        { label: 'Data integration', note: 'Kafka Connect làm xương sống DB ↔ search ↔ data lake' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Bốn nhóm, phân biệt qua cách đặt topic và retention",
      code:
        "// 1) EVENT SOURCING / nguồn sự tin cậy — retention dài hoặc compacted\n" +
        "producer.send(new ProducerRecord<>(\"account-events\", accountId, \"DEPOSITED:100\"));\n" +
        "// trạng thái hiện tại = phát lại toàn bộ sự kiện. Kafka là sổ cái, không phải cache.\n" +
        "\n" +
        "// 2) TÁCH RỜI DỊCH VỤ (pub/sub) — mỗi bên tiêu thụ độc lập\n" +
        "producer.send(new ProducerRecord<>(\"order-placed\", orderId, json));\n" +
        "// billing, shipping, analytics mỗi bên một group, thêm bên mới không sửa producer.\n" +
        "\n" +
        "// 3) THU THẬP LOG / METRIC — throughput cực cao, retention ngắn, chấp nhận\n" +
        "// mất mát nhỏ để đổi lấy tốc độ\n" +
        "p.put(\"acks\", \"1\");\n" +
        "p.put(\"compression.type\", \"lz4\");\n" +
        "\n" +
        "// 4) CDC + tích hợp dữ liệu — Debezium đọc WAL của DB đẩy vào Kafka,\n" +
        "// Connect đổ tiếp sang kho dữ liệu. Đây là cách thay thế ETL theo lô.\n" +
        "\n" +
        "// KHÔNG hợp với Kafka:\n" +
        "//  - request/response cần trả lời ngay -> dùng HTTP/gRPC\n" +
        "//  - hàng đợi công việc cần ưu tiên, TTL từng message, xoá lẻ -> RabbitMQ/SQS\n" +
        "//  - dữ liệu cần truy vấn theo nhiều chiều -> đó là việc của database",
    },
  ],
},
]);
