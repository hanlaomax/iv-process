SS.addQuestions('kafka', [
{
  cat: 'Vận hành',
  id: 'kafka-fi9g6k',
  q: 'ISR shrink/expand và unclean leader election là gì?',
  answer:
    'Follower fetch không kịp leader trong `replica.lag.time.max.ms` → bị **loại khỏi ISR** (shrink). Bắt kịp → **thêm lại** (expand). Metric `IsrShrinksPerSec` cao = follower/broker/mạng có vấn đề.\n\n' +
    'Khi leader chết mà **ISR rỗng** (không còn replica đồng bộ):\n' +
    '- `unclean.leader.election.enable=false` (mặc định): partition **offline** cho tới khi một replica trong ISR quay lại → ưu tiên **không mất dữ liệu**.\n' +
    '- `true`: bầu một replica ngoài ISR (tụt hậu) làm leader → partition online lại nhưng **mất** các message replica đó chưa có.',
  essence:
    'ISR là "danh sách replica đáng tin". Unclean election là lựa chọn availability-vs-durability khi danh sách đó cạn: chấp nhận mất dữ liệu để online, hay chờ.',
  example:
    'Dữ liệu tài chính: giữ `unclean.leader.election.enable=false`. Nếu cả ISR chết, chấp nhận partition offline vài phút và điều tra, hơn là mất giao dịch. Với topic log/metric có thể bật `true` để ưu tiên tính sẵn sàng.',
  viz: {
    type: 'compare',
    cols: ['unclean.leader.election = false (mặc định)', '= true'],
    rows: [
      ['Khi ISR rỗng và leader chết', 'partition OFFLINE tới khi replica ISR quay lại', 'bầu replica ngoài ISR (tụt hậu) làm leader'],
      ['Ưu tiên', 'không mất dữ liệu', 'tính sẵn sàng'],
      ['Hệ quả', 'gián đoạn vài phút', 'partition online lại nhưng MẤT message replica đó chưa có'],
      ['Dùng cho', 'dữ liệu tài chính', 'topic log / metric'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Đánh đổi giữa \"còn phục vụ\" và \"không mất dữ liệu\"",
      code:
        "# Follower tụt lại quá lâu -> bị loại khỏi ISR (shrink). Bắt kịp -> vào lại (expand).\n" +
        "replica.lag.time.max.ms=30000     # không fetch kịp trong 30s -> ra khỏi ISR\n" +
        "\n" +
        "# UNCLEAN LEADER ELECTION: cho phép bầu leader từ replica NGOÀI ISR khi\n" +
        "# không còn replica nào trong ISR sống.\n" +
        "unclean.leader.election.enable=false    # MẶC ĐỊNH và nên giữ nguyên\n" +
        "# false -> partition NGỪNG PHỤC VỤ cho tới khi một replica ISR quay lại.\n" +
        "#          Chọn tính nhất quán: thà dừng còn hơn mất dữ liệu.\n" +
        "# true  -> partition sống lại ngay, nhưng replica được bầu đang thiếu dữ liệu\n" +
        "#          -> MẤT VĨNH VIỄN phần message đã ack. Chỉ dùng cho dữ liệu\n" +
        "#          bỏ được (metric, log) mà tính sẵn sàng quan trọng hơn.\n" +
        "\n" +
        "# Theo dõi: ISR shrink liên tục là dấu hiệu sớm của sự cố\n" +
        "#   kafka.server:type=ReplicaManager,name=IsrShrinksPerSec\n" +
        "#   kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions   -> phải luôn = 0\n" +
        "# Nguyên nhân thường gặp: I/O đĩa bão hoà, mạng giữa broker nghẽn, GC pause dài.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-my1omf',
  q: 'Cấu hình nào quyết định độ bền dữ liệu (durability) end-to-end?',
  answer:
    'Phải khớp ở nhiều tầng:\n' +
    '- **Topic**: `replication.factor ≥ 3`, `min.insync.replicas = 2`, `unclean.leader.election.enable = false`.\n' +
    '- **Producer**: `acks = all`, `enable.idempotence = true`, `delivery.timeout.ms` đủ dài.\n' +
    '- **Consumer**: commit offset **sau** khi xử lý (tắt auto-commit hoặc commit thủ công).\n' +
    '- **Broker**: `log.flush` để OS quản (dựa vào replication, không fsync mỗi message).\n\n' +
    'Chỉ cần một mắt xích yếu (ví dụ `acks=1`) là cả chuỗi mất bảo đảm.',
  essence:
    'Durability là thuộc tính của cả pipeline, không của một tham số. RF cho bản sao, `min.insync` + `acks=all` cho "đã ghi nhiều nơi", commit-sau-xử-lý cho "không mất ở consumer".',
  example:
    'Audit: `RF=3, min.insync.replicas=2, acks=all, idempotence=true`. Chịu mất 1 broker vẫn ghi bình thường; mất 2 broker thì producer nhận lỗi (dừng ghi) thay vì mất âm thầm.',
  viz: {
    type: 'tree',
    title: 'Durability là thuộc tính của CẢ pipeline — một mắt xích yếu là hỏng',
    root: {
      label: 'Phải khớp ở mọi tầng',
      children: [
        { label: 'Topic', note: 'replication.factor ≥ 3, min.insync.replicas = 2, unclean.leader.election = false' },
        { label: 'Producer', note: 'acks = all, enable.idempotence = true, delivery.timeout.ms đủ dài' },
        { label: 'Consumer', note: 'commit offset SAU khi xử lý (tắt auto-commit)' },
        { label: 'Broker', note: 'để OS quản log.flush, dựa vào replication (không fsync mỗi message)' },
      ],
    },
  },
  demo: [
    {
      lang: "properties",
      title: "Sáu tham số, thiếu một là thủng",
      code:
        "# --- PRODUCER ---\n" +
        "acks=all                      # chờ toàn bộ ISR ghi xong\n" +
        "enable.idempotence=true       # chống trùng do retry (mặc định true từ 3.0)\n" +
        "delivery.timeout.ms=120000    # kiên nhẫn đủ lâu trước khi bỏ cuộc\n" +
        "\n" +
        "# --- TOPIC / BROKER ---\n" +
        "# replication.factor=3        # đặt lúc tạo topic\n" +
        "min.insync.replicas=2         # BẮT BUỘC, nếu không acks=all vô nghĩa khi ISR co lại\n" +
        "unclean.leader.election.enable=false\n" +
        "\n" +
        "# --- CONSUMER ---\n" +
        "enable.auto.commit=false      # commit SAU khi xử lý xong\n" +
        "\n" +
        "# Mắt xích yếu nhất quyết định tất cả. Ví dụ điển hình về việc thủng:\n" +
        "#   acks=all + RF=3 nhưng QUÊN min.insync.replicas -> ISR co còn 1\n" +
        "#   -> \"mọi ISR\" = một mình leader -> mất dữ liệu mà không có cảnh báo nào.\n" +
        "\n" +
        "# Còn một mắt xích nữa ít người để ý: flush xuống đĩa.\n" +
        "# Kafka mặc định dựa vào page cache của OS, KHÔNG fsync mỗi message\n" +
        "# (log.flush.interval.messages mặc định là vô hạn). Mất điện đồng thời cả 3\n" +
        "# broker thì vẫn mất. Kafka chọn nhân bản thay vì fsync — đó là đánh đổi\n" +
        "# có chủ ý, và với RF=3 trải nhiều AZ thì rủi ro là chấp nhận được.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-1v3p5e',
  q: 'Thêm broker vào cụm và partition reassignment hoạt động thế nào?',
  answer:
    'Broker mới **không** tự nhận partition cũ — chỉ nhận partition của topic tạo *sau* khi nó join.\n\n' +
    'Để cân bằng lại: chạy `kafka-reassign-partitions.sh` với kế hoạch (thủ công hoặc Cruise Control tự sinh). Broker mới bắt đầu **replicate** dữ liệu partition được giao (tốn băng thông inter-broker), khi bắt kịp thì vào ISR và có thể nhận leadership.\n\n' +
    'Giới hạn tốc độ bằng `--throttle` để không bão hoà mạng, ảnh hưởng traffic production.',
  essence:
    'Mở rộng cụm = di chuyển replica sang broker mới, một thao tác nặng I/O có kiểm soát. Cruise Control tự động hoá việc lập kế hoạch và cân bằng liên tục.',
  example:
    'Thêm 2 broker vào cụm 6 broker: Cruise Control sinh plan chuyển ~25% replica sang node mới, throttle 50MB/s/broker, hoàn tất trong vài giờ mà p99 latency của app gần như không đổi.',
  viz: {
    type: 'flow',
    title: 'Thêm broker + partition reassignment',
    nodes: ['broker mới join', 'chỉ nhận partition topic tạo SAU đó', 'kafka-reassign-partitions (plan / Cruise Control)', 'replicate dữ liệu (--throttle)', 'bắt kịp → vào ISR → nhận leadership'],
    steps: [
      { to: 1, label: 'broker mới KHÔNG tự nhận partition cũ' },
      { to: 3, label: 'thao tác nặng I/O inter-broker; --throttle để không bão hoà mạng' },
      { to: 4, label: 'Cruise Control tự động hoá lập kế hoạch và cân bằng liên tục' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Broker mới KHÔNG tự nhận dữ liệu cũ",
      code:
        "# Hiểu nhầm phổ biến: thêm broker vào là tải tự cân bằng. KHÔNG.\n" +
        "# Broker mới chỉ nhận partition của topic TẠO SAU đó. Phải reassign thủ công.\n" +
        "\n" +
        "# 1) Liệt kê topic cần chuyển\n" +
        "cat > topics.json <<\u0027EOF\u0027\n" +
        "{\"topics\": [{\"topic\": \"orders\"}, {\"topic\": \"payments\"}], \"version\": 1}\n" +
        "EOF\n" +
        "\n" +
        "# 2) Sinh kế hoạch (broker-list gồm CẢ broker cũ lẫn mới)\n" +
        "kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\\n" +
        "  --topics-to-move-json-file topics.json \\\n" +
        "  --broker-list \"1,2,3,4\" --generate > plan.json\n" +
        "# LƯU LẠI phần \"current\" trong output — đó là đường lui nếu cần rollback\n" +
        "\n" +
        "# 3) Thực thi, kèm GIỚI HẠN BĂNG THÔNG (bắt buộc ở production)\n" +
        "kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\\n" +
        "  --reassignment-json-file plan.json --execute \\\n" +
        "  --throttle 50000000        # 50 MB/s — không có nó, việc sao chép sẽ\n" +
        "                             # bão hoà mạng và làm chết luồng nghiệp vụ\n" +
        "\n" +
        "# 4) Theo dõi tới khi xong, rồi GỠ throttle (quên gỡ là bóp băng thông mãi)\n" +
        "kafka-reassign-partitions.sh --bootstrap-server localhost:9092 \\\n" +
        "  --reassignment-json-file plan.json --verify\n" +
        "\n" +
        "# 5) Cân bằng lại vai trò leader\n" +
        "kafka-leader-election.sh --bootstrap-server localhost:9092 --election-type preferred --all-topic-partitions",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-gtx76k',
  q: 'Tăng số partition của một topic có hệ quả gì?',
  answer:
    '`kafka-topics.sh --alter --partitions N` chỉ **tăng** được (không giảm).\n\n' +
    'Hệ quả: partitioner mặc định `hash(key) % numPartitions` → **cùng key giờ ánh xạ tới partition khác**. Dữ liệu cũ của một key nằm ở partition cũ, dữ liệu mới ở partition mới → **vỡ thứ tự per-key** và **vỡ giả định của compaction/consumer state**.\n\n' +
    'Consumer có state theo key sẽ thấy "key nhảy partition". Streams app cần reset/reprocess.',
  essence:
    'Tăng partition là thay đổi *phá vỡ* với mọi thứ dựa trên "key → partition ổn định". Lên kế hoạch số partition từ đầu; nếu buộc phải tăng, coi như một migration.',
  example:
    'Topic `orders` (key = orderId) tăng 12 → 24 partition. Sự kiện của order #555 trước đây ở partition 3, giờ event mới vào partition 9 → consumer xử lý theo thứ tự order có thể thấy update trước create. Giải pháp: tạo topic mới 24 partition, dùng dual-write/migration rồi cắt sang.',
  viz: {
    type: 'flow',
    title: 'Tăng partition là thay đổi PHÁ VỠ',
    nodes: ['alter --partitions N (chỉ tăng)', 'hash(key) % numPartitions đổi', 'cùng key ánh xạ partition khác', 'vỡ thứ tự per-key + compaction + consumer state'],
    steps: [
      { to: 1, label: 'dữ liệu cũ của một key ở partition cũ, dữ liệu mới ở partition mới' },
      { to: 3, label: 'consumer có state theo key thấy "key nhảy partition"; Streams cần reset/reprocess' },
      { to: 3, label: 'nếu buộc phải tăng → coi như một migration (topic mới + dual-write + cắt sang)' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Chỉ tăng được, và nó phá vỡ ánh xạ key",
      code:
        "kafka-topics.sh --bootstrap-server localhost:9092 \\\n" +
        "  --alter --topic orders --partitions 12       # từ 6 lên 12\n" +
        "\n" +
        "# KHÔNG GIẢM ĐƯỢC. Muốn giảm phải tạo topic mới rồi chép dữ liệu sang.\n" +
        "\n" +
        "# HỆ QUẢ NGHIÊM TRỌNG NHẤT: partition = murmur2(key) % N. Đổi N là đổi ánh xạ.\n" +
        "#   \"order-123\" trước ở partition 3, giờ sang partition 9.\n" +
        "#   -> Lịch sử của một thực thể nằm ở HAI partition khác nhau\n" +
        "#   -> THỨ TỰ bị phá vỡ: message cũ ở p3, message mới ở p9, hai consumer\n" +
        "#      xử lý song song, không còn bảo đảm gì.\n" +
        "\n" +
        "# Trên topic COMPACTED thì tệ hơn nhiều: hai bản của cùng một key ở hai\n" +
        "# partition -> compaction không bao giờ hợp nhất được -> trạng thái sai vĩnh viễn.\n" +
        "\n" +
        "# Hệ quả khác: rebalance toàn group, và consumer đang chạy phải làm mới metadata.\n" +
        "\n" +
        "# CÁCH LÀM AN TOÀN:\n" +
        "#  - chọn dư partition NGAY TỪ ĐẦU (rẻ hơn nhiều so với sửa sau)\n" +
        "#  - buộc phải đổi: tạo topic mới với số partition mới, chạy song song,\n" +
        "#    chuyển consumer sang, rồi bỏ topic cũ\n" +
        "#  - hoặc chọn thời điểm topic rỗng (đã qua hết retention)",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-mvsb3y',
  q: '`cleanup.policy`, retention và compaction — các tham số quan trọng?',
  answer:
    '- `cleanup.policy = delete | compact | "compact,delete"`.\n' +
    '- **delete**: `retention.ms` (thời gian), `retention.bytes` (dung lượng/partition). Xoá theo segment.\n' +
    '- **compact**: `min.cleanable.dirty.ratio` (bao nhiêu % "bẩn" thì chạy nén), `delete.retention.ms` (giữ tombstone bao lâu — consumer chậm phải kịp thấy), `segment.ms`.\n' +
    '- `min.compaction.lag.ms` / `max.compaction.lag.ms`: chặn dưới/trên thời gian một message có thể bị nén.',
  essence:
    'delete = giới hạn tuổi/kích thước log. compact = giữ latest-per-key + quản lý tombstone. Tham số tinh chỉnh tần suất nén và độ trễ dữ liệu bị xoá thực sự.',
  example:
    'Topic `user-consents` (compact): `delete.retention.ms=7d` để consumer downtime tối đa 1 tuần vẫn nhận được tombstone (xoá consent). Nếu đặt quá ngắn, consumer offline cuối tuần bỏ lỡ lệnh xoá → giữ lại dữ liệu đã bị rút đồng ý.',
  viz: {
    type: 'tree',
    title: 'cleanup.policy — tham số',
    root: {
      label: 'delete | compact | "compact,delete"',
      children: [
        { label: 'delete', note: 'retention.ms (thời gian), retention.bytes (dung lượng/partition) — xoá theo segment' },
        { label: 'compact', note: 'min.cleanable.dirty.ratio (khi nào chạy nén), delete.retention.ms (giữ tombstone bao lâu)' },
        { label: 'min/max.compaction.lag.ms', note: 'chặn dưới/trên thời gian một message có thể bị nén' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Các tham số hay dùng nhất và ý nghĩa thật của chúng",
      code:
        "# XOÁ THEO THỜI GIAN/DUNG LƯỢNG\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name events --add-config \\\n" +
        "  cleanup.policy=delete,retention.ms=604800000,retention.bytes=53687091200,segment.ms=86400000\n" +
        "# retention.bytes là GIỚI HẠN CHO MỖI PARTITION, không phải cho cả topic —\n" +
        "# chỗ này rất hay bị tính nhầm khi ước lượng dung lượng đĩa.\n" +
        "\n" +
        "# NÉN THEO KEY\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name user-state --add-config \\\n" +
        "  cleanup.policy=compact,min.cleanable.dirty.ratio=0.5,delete.retention.ms=86400000,min.compaction.lag.ms=0\n" +
        "# min.cleanable.dirty.ratio: tỉ lệ dữ liệu \"bẩn\" cần đạt trước khi cleaner chạy.\n" +
        "#   thấp (0.1) -> nén sát hơn, tốn CPU/IO. cao (0.9) -> topic phình to hơn.\n" +
        "# delete.retention.ms: tombstone sống bao lâu -> consumer chậm phải bắt kịp\n" +
        "#   trong khoảng này, nếu không sẽ KHÔNG BAO GIỜ thấy lệnh xoá.\n" +
        "# min.compaction.lag.ms: bảo đảm message nằm ít nhất bấy lâu mới bị nén,\n" +
        "#   cho consumer kịp đọc bản gốc.\n" +
        "\n" +
        "# CẢ HAI: giữ trạng thái mới nhất nhưng vẫn dọn bản ghi quá cũ\n" +
        "--add-config cleanup.policy=compact,delete,retention.ms=2592000000\n" +
        "\n" +
        "# LƯU Ý: segment ĐANG hoạt động không bao giờ bị nén hay xoá.\n" +
        "# segment.ms quá lớn -> retention không có tác dụng như mong đợi.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-1750jjl',
  q: 'Topic `__consumer_offsets` là gì và cần lưu ý gì?',
  answer:
    'Topic nội bộ compacted, 50 partition mặc định (`offsets.topic.num.partitions`), RF theo `offsets.topic.replication.factor`.\n\n' +
    'Lưu offset commit của **mọi** consumer group: key = `(group, topic, partition)`, value = `(offset, metadata, timestamp)`.\n\n' +
    'Lưu ý:\n' +
    '- RF của nó phải ≥ 3 ở production (cụm nhỏ lúc tạo có thể lỡ đặt RF=1 → mất offset khi broker chết).\n' +
    '- Group không hoạt động → offset bị xoá sau `offsets.retention.mines` (mặc định 7 ngày) → group đó khi quay lại rơi vào `auto.offset.reset`.',
  essence:
    'Vị trí đọc của consumer chính là dữ liệu trong một topic Kafka bình thường. Bảo vệ nó như topic quan trọng: RF cao, retention đủ dài cho consumer nghỉ lễ.',
  example:
    'Consumer batch chạy hàng tuần, nghỉ 8 ngày → offset đã bị xoá (retention 7 ngày) → lần chạy sau `auto.offset.reset=latest` bỏ qua một tuần dữ liệu. Sửa: tăng `offsets.retention.minutes`, hoặc consumer commit "giữ nhịp" định kỳ.',
  viz: {
    type: 'tree',
    title: '__consumer_offsets (topic nội bộ compacted, 50 partition)',
    root: {
      label: 'Vị trí đọc của consumer = dữ liệu trong một topic Kafka bình thường',
      children: [
        { label: 'RF phải ≥ 3 ở production', note: 'cụm nhỏ lúc tạo dễ lỡ đặt RF=1 → mất offset khi broker chết' },
        { label: 'key = (group, topic, partition)', note: 'value = offset + metadata + timestamp' },
        { label: 'Group không hoạt động', note: 'offset bị xoá sau offsets.retention.minutes (7 ngày) → rơi vào auto.offset.reset' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Topic nội bộ giữ toàn bộ tiến độ của mọi consumer group",
      code:
        "# 50 partition (offsets.topic.num.partitions), compacted, RF mặc định 3.\n" +
        "# Key = (group.id, topic, partition) -> nhờ compaction chỉ giữ offset mới nhất.\n" +
        "# Group được ánh xạ tới coordinator qua: abs(hash(group.id)) % 50\n" +
        "\n" +
        "kafka-console-consumer.sh --bootstrap-server localhost:9092 \\\n" +
        "  --topic __consumer_offsets --from-beginning \\\n" +
        "  --formatter \"kafka.coordinator.group.GroupMetadataManager\\$OffsetsMessageFormatter\" | head\n" +
        "\n" +
        "# BỐN ĐIỀU CẦN LƯU Ý:\n" +
        "# 1) RF phải >= 3 ở production. Cụm dựng thử thường để RF=1 rồi lên thật quên\n" +
        "#    sửa -> mất broker đó là MỌI group mất offset, đọc lại từ đầu.\n" +
        "#    offsets.topic.replication.factor=3   (chỉ có tác dụng lúc topic được TẠO)\n" +
        "# 2) offsets.retention.ms (mặc định 7 ngày): group KHÔNG hoạt động quá lâu\n" +
        "#    -> offset bị XOÁ -> quay lại thì auto.offset.reset quyết định số phận.\n" +
        "#    Đây là nguyên nhân điển hình của \"sau kỳ nghỉ, consumer đọc lại từ đầu\".\n" +
        "# 3) Partition lệch nặng: một group commit quá dày (commit mỗi message)\n" +
        "#    làm nóng một partition -> giảm tần suất commit.\n" +
        "# 4) ĐỪNG sửa tay topic này.\n" +
        "\n" +
        "kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list\n" +
        "kafka-consumer-groups.sh --bootstrap-server localhost:9092 --delete --group cu-khong-dung",
    },
  ],
},
{
  cat: 'Giám sát',
  id: 'kafka-1pk4ref',
  q: 'Những metric Kafka quan trọng nhất cần cảnh báo?',
  answer:
    '**Broker/cluster**:\n' +
    '- `UnderReplicatedPartitions` > 0: replica tụt hậu → rủi ro mất dữ liệu.\n' +
    '- `OfflinePartitionsCount` > 0: partition không có leader → outage.\n' +
    '- `ActiveControllerCount` phải = 1 trên toàn cụm.\n' +
    '- Request latency (produce/fetch) p99, request handler idle ratio.\n' +
    '- Disk usage, network throughput.\n\n' +
    '**Ứng dụng**:\n' +
    '- **Consumer lag** (và xu hướng).\n' +
    '- Producer error/retry rate.',
  essence:
    'Ba báo động đỏ: under-replicated partitions (durability), offline partitions (availability), consumer lag tăng (pipeline không theo kịp). Còn lại là chỉ số hiệu năng.',
  example:
    'Alert bậc 1: `OfflinePartitionsCount > 0` → page ngay. Bậc 2: `UnderReplicatedPartitions > 0` trong 5 phút → điều tra broker. Bậc 3: lag group X > ngưỡng và tăng 15 phút liên tục → scale consumer.',
  viz: {
    type: 'tree',
    title: 'Ba báo động đỏ của Kafka',
    root: {
      label: 'Còn lại là chỉ số hiệu năng',
      children: [
        { label: 'UnderReplicatedPartitions > 0', note: 'durability — replica tụt hậu, rủi ro mất dữ liệu' },
        { label: 'OfflinePartitionsCount > 0', note: 'availability — partition không có leader → outage → page ngay' },
        { label: 'Consumer lag tăng đều', note: 'pipeline không theo kịp' },
        { label: 'ActiveControllerCount phải = 1', note: 'trên toàn cụm' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Ưu tiên theo mức độ nghiêm trọng",
      code:
        "# === BÁO ĐỘNG ĐỎ (gọi người dậy lúc nửa đêm) ===\n" +
        "# UnderReplicatedPartitions > 0        replica đang tụt lại -> sắp mất dự phòng\n" +
        "#   kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions\n" +
        "# OfflinePartitionsCount > 0           partition KHÔNG CÓ leader -> ngừng phục vụ\n" +
        "#   kafka.controller:type=KafkaController,name=OfflinePartitionsCount\n" +
        "# ActiveControllerCount != 1           phải đúng 1 trên toàn cụm; 0 = không ai\n" +
        "#   điều phối, 2 = split brain\n" +
        "# UncleanLeaderElectionsPerSec > 0     đã có dữ liệu bị mất\n" +
        "\n" +
        "# === CẢNH BÁO (xem trong giờ làm việc) ===\n" +
        "# consumer lag theo thời gian          đo bằng giây, không phải số message\n" +
        "# IsrShrinksPerSec tăng                dấu hiệu sớm của nghẽn I/O hoặc mạng\n" +
        "# RequestHandlerAvgIdlePercent < 30%   thread pool xử lý sắp bão hoà\n" +
        "#   kafka.server:type=KafkaRequestHandlerPool,name=RequestHandlerAvgIdlePercent\n" +
        "# NetworkProcessorAvgIdlePercent < 30%\n" +
        "# đĩa còn trống < 20%                  Kafka đầy đĩa là hỏng rất khó cứu\n" +
        "\n" +
        "# === HIỆU NĂNG ===\n" +
        "# TotalTimeMs theo từng loại request (Produce, FetchConsumer, FetchFollower)\n" +
        "#   -> tách được thành queue/local/remote/response time, chỉ ra nút thắt ở đâu\n" +
        "# BytesInPerSec, BytesOutPerSec, MessagesInPerSec\n" +
        "\n" +
        "# Thu thập: JMX Exporter -> Prometheus -> Grafana (có dashboard sẵn),\n" +
        "# hoặc Cruise Control / Confluent Control Center.",
    },
  ],
},
{
  cat: 'Hệ sinh thái',
  id: 'kafka-17so28c',
  q: 'Kafka Connect là gì? Source/sink, converter, SMT, distributed mode?',
  answer:
    'Framework tích hợp dữ liệu chạy như cụm worker riêng.\n' +
    '- **Source connector**: hệ ngoài → Kafka (Debezium CDC, JDBC source, file).\n' +
    '- **Sink connector**: Kafka → hệ ngoài (S3, Elasticsearch, JDBC, BigQuery).\n' +
    '- **Converter**: (de)serialize giữa Kafka bytes và định dạng nội bộ (Avro + Schema Registry, JSON, Protobuf).\n' +
    '- **SMT (Single Message Transform)**: biến đổi nhẹ từng message (rename field, mask, route topic) không cần code.\n' +
    '- **Distributed mode**: nhiều worker chia task, cân bằng và tự phục hồi qua REST API + topic nội bộ (`connect-configs/offsets/status`).',
  essence:
    'Connect là "ETL streaming khai báo bằng JSON": bạn cấu hình connector thay vì viết consumer/producer. Scale và fault-tolerance do framework lo.',
  example:
    'Đồng bộ toàn bộ Postgres sang data lake: Debezium source (CDC) → topic → S3 sink connector (Parquet, phân vùng theo ngày). Thêm SMT `MaskField` cho cột PII. Không viết dòng code nào, chỉ 2 file config.',
  viz: {
    type: 'tree',
    title: 'Kafka Connect — "ETL streaming khai báo bằng JSON"',
    root: {
      label: 'Cấu hình connector thay vì viết consumer/producer',
      children: [
        { label: 'Source connector', note: 'hệ ngoài → Kafka: Debezium CDC, JDBC, file' },
        { label: 'Sink connector', note: 'Kafka → hệ ngoài: S3, Elasticsearch, JDBC, BigQuery' },
        { label: 'Converter', note: '(de)serialize Kafka bytes ↔ Avro/JSON/Protobuf' },
        { label: 'SMT', note: 'biến đổi nhẹ từng message: rename, mask, route topic' },
        { label: 'Distributed mode', note: 'nhiều worker chia task, cân bằng + tự phục hồi qua REST + topic nội bộ' },
      ],
    },
  },
  demo: [
    {
      lang: "json",
      title: "Distributed mode, converter và SMT",
      code:
        "{\n" +
        "  \"name\": \"orders-to-s3\",\n" +
        "  \"config\": {\n" +
        "    \"connector.class\": \"io.confluent.connect.s3.S3SinkConnector\",\n" +
        "    \"tasks.max\": \"4\",\n" +
        "    \"topics\": \"orders\",\n" +
        "    \"s3.bucket.name\": \"data-lake\",\n" +
        "    \"format.class\": \"io.confluent.connect.s3.format.parquet.ParquetFormat\",\n" +
        "    \"flush.size\": \"10000\",\n" +
        "    \"key.converter\": \"org.apache.kafka.connect.storage.StringConverter\",\n" +
        "    \"value.converter\": \"io.confluent.connect.avro.AvroConverter\",\n" +
        "    \"value.converter.schema.registry.url\": \"http://schema-registry:8081\",\n" +
        "    \"transforms\": \"maskPii,addTs\",\n" +
        "    \"transforms.maskPii.type\": \"org.apache.kafka.connect.transforms.MaskField$Value\",\n" +
        "    \"transforms.maskPii.fields\": \"email,phone\",\n" +
        "    \"transforms.addTs.type\": \"org.apache.kafka.connect.transforms.InsertField$Value\",\n" +
        "    \"transforms.addTs.timestamp.field\": \"ingested_at\",\n" +
        "    \"errors.tolerance\": \"all\",\n" +
        "    \"errors.deadletterqueue.topic.name\": \"connect-dlq\",\n" +
        "    \"errors.deadletterqueue.context.headers.enable\": \"true\"\n" +
        "  }\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Vận hành Connect ở chế độ distributed",
      code:
        "# SOURCE: hệ thống ngoài -> Kafka (Debezium CDC, JDBC, file)\n" +
        "# SINK:   Kafka -> hệ thống ngoài (S3, Elasticsearch, JDBC, BigQuery)\n" +
        "# CONVERTER: chuyển đổi dạng dữ liệu (Avro/JSON/String/Protobuf)\n" +
        "# SMT: biến đổi NHẸ từng record (mask, đổi tên field, định tuyến) — không\n" +
        "#      thay thế được xử lý luồng thật sự, đừng nhét logic nghiệp vụ vào đây\n" +
        "\n" +
        "curl -X POST -H \"Content-Type: application/json\" \\\n" +
        "  --data @connector.json http://connect:8083/connectors\n" +
        "\n" +
        "curl http://connect:8083/connectors/orders-to-s3/status     # RUNNING / FAILED\n" +
        "curl -X POST http://connect:8083/connectors/orders-to-s3/restart?includeTasks=true\n" +
        "curl -X PUT  http://connect:8083/connectors/orders-to-s3/pause\n" +
        "\n" +
        "# Distributed mode giữ cấu hình/offset/trạng thái trong ba topic nội bộ\n" +
        "# (connect-configs, connect-offsets, connect-status) -> worker chết thì\n" +
        "# task tự chuyển sang worker khác. Luôn dùng distributed ở production,\n" +
        "# kể cả khi chỉ chạy một worker.",
    },
  ],
},
{
  cat: 'Hệ sinh thái',
  id: 'kafka-dxgms5',
  q: 'Kafka Streams: KStream vs KTable, state store, changelog, windowing?',
  answer:
    '- **KStream**: luồng sự kiện bất tận (mỗi record là một fact độc lập).\n' +
    '- **KTable**: bảng thay đổi — mỗi record là "giá trị mới nhất của key" (nền tảng compacted topic). KStream ⟷ KTable chuyển đổi được.\n' +
    '- **State store**: RocksDB nhúng lưu state (đếm, join, aggregate), backup vào **changelog topic** (compacted) để khôi phục khi instance chết/di chuyển.\n' +
    '- **Windowing**: gom sự kiện theo cửa sổ thời gian — tumbling, hopping, sliding, session — cho aggregation theo thời gian, xử lý dữ liệu trễ bằng grace period.',
  essence:
    'KStream = sự kiện, KTable = trạng thái. State store cho phép xử lý có nhớ; changelog làm state đó chịu lỗi. Windowing đưa yếu tố thời gian vào aggregation.',
  example:
    '"Số đơn hàng và doanh thu mỗi cửa hàng trong cửa sổ 1 giờ, cập nhật mỗi 5 phút": `orders.groupBy(store).windowedBy(TimeWindows.ofSizeAndGrace(1h, 10m)).aggregate(...)` → phát ra topic `store-hourly-stats`. Instance crash → state khôi phục từ changelog trong vài giây.',
  viz: {
    type: 'compare',
    cols: ['KStream', 'KTable'],
    rows: [
      ['Mỗi record là', 'một fact độc lập (sự kiện)', 'giá trị mới nhất của key (trạng thái)'],
      ['Nền tảng', 'luồng bất tận', 'compacted topic'],
      ['State', 'stateless mặc định', 'state store (RocksDB) + changelog topic (khôi phục khi chết)'],
      ['Windowing', 'tumbling / hopping / sliding / session — grace period cho dữ liệu trễ', '—'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Luồng sự kiện vs bảng trạng thái",
      code:
        "StreamsBuilder b = new StreamsBuilder();\n" +
        "\n" +
        "// KSTREAM = luồng SỰ KIỆN. Mỗi record là một sự việc độc lập, cộng dồn.\n" +
        "KStream<String, Click> clicks = b.stream(\"clicks\");\n" +
        "\n" +
        "// KTABLE = BẢNG TRẠNG THÁI. Mỗi record GHI ĐÈ giá trị cũ của cùng key\n" +
        "// (chính là ngữ nghĩa của topic compacted).\n" +
        "KTable<String, User> users = b.table(\"users\",\n" +
        "        Materialized.as(\"users-store\"));      // state store cục bộ (RocksDB)\n" +
        "\n" +
        "// GLOBALKTABLE = bản sao ĐẦY ĐỦ trên MỌI instance -> join không cần cùng key,\n" +
        "// nhưng tốn bộ nhớ/đĩa. Chỉ dùng cho dữ liệu tra cứu nhỏ.\n" +
        "GlobalKTable<String, Country> countries = b.globalTable(\"countries\");\n" +
        "\n" +
        "// Join stream với table: làm giàu sự kiện bằng trạng thái hiện tại\n" +
        "clicks.join(users, (click, user) -> new EnrichedClick(click, user))\n" +
        "      .to(\"clicks-enriched\");\n" +
        "\n" +
        "// Aggregate có cửa sổ thời gian\n" +
        "clicks.groupByKey()\n" +
        "      .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofMinutes(5), Duration.ofMinutes(1)))\n" +
        "      .count(Materialized.as(\"clicks-per-5min\"))\n" +
        "      .toStream()\n" +
        "      .to(\"click-counts\");\n" +
        "// grace period: chờ thêm bao lâu cho dữ liệu ĐẾN MUỘN trước khi chốt cửa sổ.\n" +
        "\n" +
        "// STATE STORE + CHANGELOG: mọi state store được sao lưu tự động vào một\n" +
        "// topic changelog (compacted). Instance chết -> instance khác đọc changelog\n" +
        "// dựng lại state. Đây là lý do Streams chịu lỗi được mà không cần cụm riêng.\n" +
        "// standby.replicas > 0 để có bản dự phòng nóng -> khôi phục nhanh hơn nhiều.",
    },
  ],
},
{
  cat: 'Hệ sinh thái',
  id: 'kafka-1oyrjf4',
  q: 'Schema Registry compatibility modes: BACKWARD, FORWARD, FULL?',
  answer:
    '- **BACKWARD** (mặc định): consumer dùng schema **mới** đọc được dữ liệu ghi bằng schema **cũ**. Cho phép: xoá field, thêm field **optional/có default**. → nâng cấp **consumer trước**.\n' +
    '- **FORWARD**: consumer dùng schema **cũ** đọc được dữ liệu ghi bằng schema **mới**. Cho phép: thêm field, xoá field optional. → nâng cấp **producer trước**.\n' +
    '- **FULL**: cả hai chiều (giao của hai tập trên).\n' +
    '- `*_TRANSITIVE`: kiểm tra với **mọi** phiên bản trước, không chỉ phiên bản liền kề.',
  essence:
    'Compatibility mode là hợp đồng về thứ tự nâng cấp an toàn giữa producer và consumer. BACKWARD (phổ biến nhất) nghĩa là "consumer mới, dữ liệu cũ vẫn đọc được".',
  example:
    'Thêm `promoCode` (string, default "") vào `Order` với BACKWARD: deploy consumer mới trước (bỏ qua field nếu vắng), rồi producer mới. Registry từ chối nếu bạn cố thêm field **required** không default (phá consumer đọc dữ liệu cũ).',
  viz: {
    type: 'compare',
    cols: ['BACKWARD (mặc định)', 'FORWARD', 'FULL'],
    rows: [
      ['Nghĩa', 'consumer mới đọc dữ liệu ghi bằng schema cũ', 'consumer cũ đọc dữ liệu ghi bằng schema mới', 'cả hai chiều'],
      ['Cho phép', 'xoá field, thêm field optional/có default', 'thêm field, xoá field optional', 'giao của hai tập'],
      ['Thứ tự nâng cấp', 'consumer TRƯỚC', 'producer TRƯỚC', 'tuỳ ý'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ai nâng cấp trước quyết định chế độ nào",
      code:
        "# BACKWARD (mặc định): consumer dùng schema MỚI đọc được dữ liệu CŨ.\n" +
        "#   Được phép: XOÁ field, THÊM field CÓ default.\n" +
        "#   -> Nâng cấp CONSUMER trước, rồi mới tới producer. Dùng nhiều nhất.\n" +
        "\n" +
        "# FORWARD: consumer dùng schema CŨ đọc được dữ liệu MỚI.\n" +
        "#   Được phép: THÊM field, XOÁ field CÓ default.\n" +
        "#   -> Nâng cấp PRODUCER trước. Hợp khi consumer nằm ngoài tầm kiểm soát.\n" +
        "\n" +
        "# FULL: thoả mãn cả hai chiều. An toàn nhất, gò bó nhất.\n" +
        "# NONE: tắt kiểm tra — đừng dùng ở production.\n" +
        "# *_TRANSITIVE: kiểm tra với MỌI phiên bản trước đó, không chỉ phiên bản liền kề.\n" +
        "#   -> nên dùng khi consumer có thể tụt lại nhiều phiên bản.\n" +
        "\n" +
        "curl -X PUT -H \"Content-Type: application/json\" \\\n" +
        "  --data \u0027{\"compatibility\": \"BACKWARD_TRANSITIVE\"}\u0027 \\\n" +
        "  http://schema-registry:8081/config/orders-value\n" +
        "\n" +
        "# Kiểm tra TRƯỚC KHI deploy (nên đưa vào CI):\n" +
        "curl -X POST -H \"Content-Type: application/vnd.schemas.v1+json\" \\\n" +
        "  --data @new-schema.json \\\n" +
        "  http://schema-registry:8081/compatibility/subjects/orders-value/versions/latest\n" +
        "\n" +
        "curl http://schema-registry:8081/subjects/orders-value/versions\n" +
        "\n" +
        "# Quy tắc vàng: field mới LUÔN có default -> tương thích cả hai chiều.\n" +
        "#   {\"name\": \"discount\", \"type\": [\"null\", \"double\"], \"default\": null}",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'kafka-roy07l',
  q: 'Bảo mật Kafka: TLS, SASL, ACL?',
  answer:
    '- **Encryption in transit**: TLS trên listener (`SSL://`), mã hoá client↔broker và broker↔broker.\n' +
    '- **Authentication (SASL)**: `SASL/PLAIN` (user/pass, cần TLS), `SASL/SCRAM` (hash, lưu trong Kafka/ZK), `SASL/GSSAPI` (Kerberos), `SASL/OAUTHBEARER` (OIDC token). Xác định "client là ai" (principal).\n' +
    '- **Authorization (ACL)**: `kafka-acls.sh` cấp quyền Read/Write/Create/Describe trên resource (topic, group, cluster) cho principal. `allow.everyone.if.no.acl.found=false` để mặc định là từ chối.',
  essence:
    'Ba lớp: TLS (không ai nghe lén), SASL (bạn là ai), ACL (bạn được làm gì). Thiếu ACL thì mọi client xác thực được có toàn quyền.',
  example:
    'App thanh toán: principal `svc-payment` được `Write` topic `payments`, `Read` group `payment-processor`. Không có quyền trên topic `hr-events`. Client dùng SASL/SCRAM over TLS, mật khẩu từ Vault.',
  viz: {
    type: 'layers',
    title: 'Bảo mật Kafka — 3 lớp',
    layers: [
      { name: 'TLS — encryption in transit', tag: 'không ai nghe lén', note: 'listener SSL://, mã hoá client↔broker và broker↔broker' },
      { name: 'SASL — authentication', tag: 'bạn là ai', note: 'PLAIN / SCRAM / GSSAPI (Kerberos) / OAUTHBEARER → principal' },
      { name: 'ACL — authorization', tag: 'bạn được làm gì', note: 'Read/Write/Create/Describe trên topic/group/cluster; allow.everyone.if.no.acl.found=false' },
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Ba tầng: mã hoá, danh tính, quyền",
      code:
        "# 1) TLS — mã hoá đường truyền (và có thể xác thực hai chiều)\n" +
        "listeners=SASL_SSL://:9093\n" +
        "ssl.keystore.location=/etc/kafka/secrets/kafka.keystore.jks\n" +
        "ssl.keystore.password=${KEYSTORE_PASSWORD}\n" +
        "ssl.truststore.location=/etc/kafka/secrets/kafka.truststore.jks\n" +
        "ssl.client.auth=required          # bắt buộc client cũng có chứng chỉ (mTLS)\n" +
        "# LƯU Ý: bật TLS làm MẤT tối ưu zero-copy -> CPU broker tăng đáng kể.\n" +
        "\n" +
        "# 2) SASL — xác thực danh tính\n" +
        "sasl.enabled.mechanisms=SCRAM-SHA-512      # tốt hơn PLAIN (không gửi mật khẩu thô)\n" +
        "# Các cơ chế: PLAIN (chỉ dùng sau TLS), SCRAM-SHA-256/512, GSSAPI (Kerberos),\n" +
        "#             OAUTHBEARER (OIDC — hợp với hệ thống hiện đại)\n" +
        "security.inter.broker.protocol=SASL_SSL\n" +
        "\n" +
        "# 3) ACL — phân quyền\n" +
        "authorizer.class.name=org.apache.kafka.metadata.authorizer.StandardAuthorizer  # KRaft\n" +
        "allow.everyone.if.no.acl.found=false      # mặc định TỪ CHỐI — quan trọng\n" +
        "super.users=User:admin",
    },
    {
      lang: "bash",
      title: "Cấp quyền tối thiểu",
      code:
        "# Tạo user SCRAM\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --add-config \u0027SCRAM-SHA-512=[password=matkhau-manh]\u0027 \\\n" +
        "  --entity-type users --entity-name order-service\n" +
        "\n" +
        "# Producer chỉ được GHI vào đúng một topic\n" +
        "kafka-acls.sh --bootstrap-server localhost:9092 --add \\\n" +
        "  --allow-principal User:order-service \\\n" +
        "  --operation Write --operation Describe --topic orders\n" +
        "\n" +
        "# Consumer cần quyền trên CẢ topic LẪN group (rất hay quên vế group)\n" +
        "kafka-acls.sh --bootstrap-server localhost:9092 --add \\\n" +
        "  --allow-principal User:billing-service \\\n" +
        "  --operation Read --operation Describe --topic orders\n" +
        "kafka-acls.sh --bootstrap-server localhost:9092 --add \\\n" +
        "  --allow-principal User:billing-service --operation Read --group billing\n" +
        "\n" +
        "kafka-acls.sh --bootstrap-server localhost:9092 --list --topic orders",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-17rjxji',
  q: 'Consumer lag monitoring: công cụ và cách đặt cảnh báo?',
  answer:
    'Công cụ:\n' +
    '- `kafka-consumer-groups.sh --describe` (thủ công).\n' +
    '- **kafka-lag-exporter** / **Kminion** / **Burrow** → Prometheus + Grafana.\n' +
    '- JMX `records-lag-max` trên chính consumer.\n\n' +
    'Cảnh báo tốt không chỉ nhìn giá trị tuyệt đối mà nhìn **xu hướng và thời gian tiêu thụ hết lag**: lag 1 triệu nhưng đang giảm nhanh thì ổn; lag 50k nhưng tăng đều 10 phút thì nguy.',
  essence:
    'Lag đo khoảng cách producer–consumer. Metric hữu ích nhất là "ước lượng thời gian để đuổi kịp" (lag / tốc độ tiêu thụ), không phải con số lag trần trụi.',
  example:
    'Grafana: panel `sum(kafka_consumergroup_lag) by (group)` + `deriv()` để thấy xu hướng. Alert: `lag > 100k AND deriv(lag) > 0 trong 10m` → tránh báo động giả khi có spike ngắn rồi tự hồi.',
  viz: {
    type: 'flow',
    title: 'Consumer lag — nhìn xu hướng, không nhìn giá trị trần',
    nodes: ['đo lag (kafka-lag-exporter / Burrow → Prometheus)', 'lag lớn nhưng đang giảm nhanh', 'lag nhỏ nhưng tăng đều 10 phút', 'alert: lag > X AND deriv(lag) > 0'],
    steps: [
      { to: 1, label: 'metric hữu ích nhất: lag / tốc độ tiêu thụ = "thời gian để đuổi kịp"' },
      { to: 2, label: 'ổn — sắp bắt kịp' },
      { to: 3, label: 'nguy — đặt alert theo xu hướng để tránh báo động giả khi spike ngắn' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đo bằng giây, không phải bằng số message",
      code:
        "# CLI — nhanh gọn khi cần xem ngay\n" +
        "kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\\n" +
        "  --describe --group order-processor\n" +
        "\n" +
        "# Burrow (LinkedIn) — đánh giá theo XU HƯỚNG, không theo ngưỡng cứng.\n" +
        "# Nó phân loại OK / WARN / ERR / STOP / STALL dựa trên việc offset có\n" +
        "# tiến lên hay không -> ít báo động giả hơn ngưỡng tĩnh.\n" +
        "curl http://burrow:8000/v3/kafka/local/consumer/order-processor/status\n" +
        "\n" +
        "# kafka-lag-exporter / kafka_exporter — xuất Prometheus, và quan trọng là\n" +
        "# tính được lag theo THỜI GIAN (ước lượng \"chậm bao nhiêu giây\").\n" +
        "\n" +
        "# VÌ SAO đo bằng giây: \"lag 1 triệu message\" vô nghĩa nếu không biết tốc độ\n" +
        "# xử lý. 1 triệu message với 100k msg/s là 10 giây — hoàn toàn bình thường.\n" +
        "# Cùng con số đó với 100 msg/s là gần 3 giờ — sự cố nghiêm trọng.\n" +
        "\n" +
        "# Cảnh báo nên đặt:\n" +
        "#  - lag_seconds > SLA trong 5 phút liên tục      -> cảnh báo\n" +
        "#  - lag TĂNG ĐỀU trong 15 phút                   -> consumer không theo kịp\n" +
        "#  - offset ĐỨNG YÊN mà lag > 0                   -> consumer TREO/chết\n" +
        "#    (đây là trường hợp nguy hiểm nhất và hay bị bỏ sót)\n" +
        "#  - lag lệch giữa các partition                  -> lệch key hoặc một consumer hỏng",
    },
  ],
},
{
  cat: 'Thiết kế',
  id: 'kafka-1tmvqwz',
  q: 'Lập kế hoạch sizing: partition/broker, throughput?',
  answer:
    'Quy tắc kinh nghiệm:\n' +
    '- Giới hạn tổng partition (leader + follower) mỗi broker: ~2.000–4.000 với ZooKeeper, nhiều hơn với KRaft.\n' +
    '- Throughput mỗi partition: đo thực tế, thường 10–50 MB/s.\n' +
    '- Số partition topic ≈ max(throughput mục tiêu / throughput/partition, số consumer song song cần).\n' +
    '- Đĩa: `throughput ghi × retention × RF`, cộng headroom 30–40%.\n' +
    '- Mạng: replication nhân đôi lưu lượng ghi (RF-1 lần fetch giữa broker).',
  essence:
    'Bắt đầu từ throughput mục tiêu và SLA, suy ra partition và broker; luôn chừa headroom cho spike và cho việc rebalance/reassign. Đừng "đặt thật nhiều partition cho chắc".',
  example:
    'Mục tiêu 500 MB/s ghi, RF=3, retention 3 ngày: đĩa ≈ 500MB/s × 259200s × 3 ≈ 389 TB thô → ~15 broker với 30TB NVMe mỗi broker (kèm headroom). ~48 partition cho topic chính (10MB/s/partition).',
  viz: {
    type: 'tree',
    title: 'Sizing — từ throughput mục tiêu suy ra partition + broker',
    root: {
      label: 'Luôn chừa headroom cho spike + rebalance/reassign',
      children: [
        { label: 'Tổng partition/broker', note: '~2000–4000 với ZooKeeper, nhiều hơn với KRaft' },
        { label: 'Throughput/partition', note: 'đo thực tế, thường 10–50 MB/s' },
        { label: 'Số partition topic', note: '≈ max(throughput mục tiêu / throughput/partition, số consumer song song)' },
        { label: 'Đĩa', note: 'throughput ghi × retention × RF + headroom 30–40%' },
        { label: 'Mạng', note: 'replication nhân đôi lưu lượng ghi' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Tính từ throughput và retention",
      code:
        "# 1) DUNG LƯỢNG ĐĨA\n" +
        "#    đĩa = throughput_ghi × retention × RF × (1 + dự phòng)\n" +
        "#    Ví dụ: 50 MB/s × 7 ngày × 3 × 1.3\n" +
        "#         = 50 × 86400 × 7 × 3 × 1.3 / 1024^3 ≈ 110 TB\n" +
        "#    Chia cho số broker, và giữ mức dùng đĩa dưới 70%.\n" +
        "\n" +
        "# 2) SỐ PARTITION\n" +
        "#    N = max(T_mục_tiêu / T_producer_đơn, T_mục_tiêu / T_consumer_đơn)\n" +
        "#    Rồi nhân thêm 2-3 lần để dự phòng tăng trưởng — vì tăng partition\n" +
        "#    sau này rất tốn kém (phá ánh xạ key).\n" +
        "\n" +
        "# 3) SỐ BROKER — lấy giá trị lớn nhất trong ba ràng buộc:\n" +
        "#    - đĩa: tổng dung lượng / dung lượng mỗi broker\n" +
        "#    - mạng: throughput × (RF + số consumer group) / băng thông NIC\n" +
        "#            (đây thường là ràng buộc bị bỏ quên nhưng lại chặt nhất)\n" +
        "#    - partition: tổng partition / ~4000 mỗi broker\n" +
        "#    Tối thiểu 3 broker để RF=3 có ý nghĩa.\n" +
        "\n" +
        "# 4) HEAP: 6GB là đủ cho hầu hết broker. RAM còn lại để OS làm page cache\n" +
        "#    (nên đủ chứa \"dữ liệu nóng\" — thường là vài giờ gần nhất).\n" +
        "\n" +
        "# Đo thật thay vì đoán:\n" +
        "kafka-producer-perf-test.sh --topic bench --num-records 5000000 \\\n" +
        "  --record-size 1024 --throughput -1 \\\n" +
        "  --producer-props bootstrap.servers=localhost:9092 acks=all compression.type=lz4\n" +
        "kafka-consumer-perf-test.sh --bootstrap-server localhost:9092 \\\n" +
        "  --topic bench --messages 5000000",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-uyj6wh',
  q: 'MirrorMaker 2 và replication đa vùng (multi-region)?',
  answer:
    'MirrorMaker 2 (dựa trên Kafka Connect) sao chép topic giữa các cụm: dữ liệu, cấu hình topic, ACL, và **offset translation** (map offset group giữa cụm nguồn và đích).\n\n' +
    'Kiến trúc:\n' +
    '- **Active-passive (DR)**: cụm chính phục vụ, cụm phụ nhận bản sao, failover khi thảm hoạ.\n' +
    '- **Active-active**: hai vùng cùng ghi; MM2 dùng tiền tố topic (`us.orders`, `eu.orders`) tránh vòng lặp.\n\n' +
    'Replication là **bất đồng bộ** → có thể mất một ít dữ liệu chưa kịp sao chép khi vùng chính sập (RPO > 0).',
  essence:
    'MM2 là "sao lưu topic sang cụm khác" kèm dịch offset để consumer failover đúng chỗ. Bất đồng bộ nên luôn có độ trễ và RPO khác 0.',
  example:
    'DR: cụm `us-east` (primary) mirror sang `us-west`. Sự cố vùng: chuyển consumer sang `us-west`, dùng offset đã translate để tiếp tục gần đúng vị trí. Chấp nhận mất ~vài giây dữ liệu cuối cùng chưa mirror.',
  viz: {
    type: 'compare',
    cols: ['Active-passive (DR)', 'Active-active'],
    rows: [
      ['Cụm phụ', 'nhận bản sao, failover khi thảm hoạ', 'hai vùng cùng ghi'],
      ['Tránh vòng lặp', '—', 'tiền tố topic: us.orders, eu.orders'],
      ['Replication', 'bất đồng bộ (RPO > 0)', 'bất đồng bộ'],
      ['MM2 làm gì', 'sao chép dữ liệu + config + ACL + offset translation', 'như bên trái'],
    ],
  },
  demo: [
    {
      lang: "properties",
      title: "Sao chép giữa hai cụm, và bài toán offset",
      code:
        "# MM2 chạy trên nền Kafka Connect, sao chép: dữ liệu topic, cấu hình topic,\n" +
        "# ACL, và (quan trọng nhất) ÁNH XẠ OFFSET giữa hai cụm.\n" +
        "clusters=primary,backup\n" +
        "primary.bootstrap.servers=kafka-hcm:9092\n" +
        "backup.bootstrap.servers=kafka-hn:9092\n" +
        "\n" +
        "primary->backup.enabled=true\n" +
        "primary->backup.topics=orders|payments\n" +
        "primary->backup.emit.heartbeats.enabled=true\n" +
        "primary->backup.sync.group.offsets.enabled=true    # đồng bộ offset consumer group\n" +
        "replication.factor=3\n" +
        "refresh.topics.interval.seconds=60\n" +
        "\n" +
        "# ĐẶT TÊN: mặc định topic ở đích có TIỀN TỐ tên cụm nguồn (primary.orders)\n" +
        "# -> chống vòng lặp khi sao chép hai chiều. Muốn giữ nguyên tên thì dùng\n" +
        "# IdentityReplicationPolicy, nhưng phải tự lo chống vòng lặp.\n" +
        "replication.policy.class=org.apache.kafka.connect.mirror.IdentityReplicationPolicy\n" +
        "\n" +
        "# BÀI TOÁN CỐT LÕI: offset ở hai cụm KHÔNG khớp nhau (thứ tự ghi khác,\n" +
        "# retention khác). MM2 duy trì topic checkpoints để ánh xạ offset, dùng\n" +
        "# RemoteClusterUtils.translateOffsets() khi failover.\n" +
        "\n" +
        "# HAI KIẾN TRÚC:\n" +
        "#  - Active-Passive: chỉ ghi ở primary, backup dự phòng. Đơn giản, dễ đúng.\n" +
        "#  - Active-Active: ghi cả hai nơi -> phải giải quyết xung đột dữ liệu ở\n" +
        "#    tầng ứng dụng. Đừng chọn nếu chưa thật sự cần.\n" +
        "# Cả hai đều là bất đồng bộ -> failover LUÔN có khả năng mất một ít dữ liệu (RPO > 0).",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-1thdwvu',
  q: 'Broker chết hoặc đầy đĩa — quy trình phục hồi?',
  answer:
    '**Broker chết**: controller tự bầu leader mới từ ISR cho các partition broker đó giữ leader → gián đoạn ngắn. Khi broker quay lại, nó fetch phần thiếu để trở lại ISR. Nếu chết lâu, cân nhắc reassign partition sang broker khác.\n\n' +
    '**Đầy đĩa**: broker ngừng ghi, partition trên đó offline hoặc under-replicated. Xử lý: giảm `retention.ms`/`retention.bytes` của topic lớn để giải phóng segment; hoặc thêm `log.dirs` (đĩa mới); hoặc di chuyển partition. Phòng ngừa: alert ở 75% disk.',
  essence:
    'Kafka tự chịu được mất broker nhờ replication; việc của bạn là khôi phục ISR và không để đĩa đầy. Đĩa đầy là sự cố tự gây phổ biến nhất — quota + retention + alert.',
  example:
    'Broker 3 đầy đĩa lúc 2h sáng: `UnderReplicatedPartitions` tăng. Hành động nhanh: `kafka-configs.sh --alter --add-config retention.ms=43200000` cho topic ngốn dung lượng nhất → segment cũ bị xoá → đĩa thoáng → broker ghi lại → ISR hồi.',
  viz: {
    type: 'compare',
    cols: ['Broker chết', 'Đầy đĩa'],
    rows: [
      ['Kafka tự làm gì', 'controller bầu leader mới từ ISR → gián đoạn ngắn', 'broker ngừng ghi, partition offline / under-replicated'],
      ['Xử lý', 'chờ broker hồi (fetch phần thiếu); chết lâu → reassign', 'giảm retention topic lớn / thêm log.dirs / di chuyển partition'],
      ['Phòng ngừa', 'replication (RF ≥ 3)', 'quota + retention + alert ở 75% disk'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Quy trình xử lý theo thứ tự",
      code:
        "# === BROKER CHẾT ===\n" +
        "# 1) Kafka tự bầu leader mới từ ISR -> cụm vẫn phục vụ nếu RF >= 2.\n" +
        "#    Việc đầu tiên là XÁC NHẬN mức độ ảnh hưởng, chưa vội sửa:\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --under-replicated-partitions\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --unavailable-partitions\n" +
        "\n" +
        "# 2) Khởi động lại được thì cứ khởi động — broker tự bắt kịp từ leader.\n" +
        "#    Dữ liệu còn nguyên trên đĩa nên nhanh hơn nhiều so với thay mới.\n" +
        "\n" +
        "# 3) Chết hẳn (mất đĩa): dựng broker mới với CÙNG node.id (KRaft) và\n" +
        "#    reassign partition sang nó. Nhớ đặt --throttle.\n" +
        "\n" +
        "# === ĐẦY ĐĨA (nguy hiểm hơn: broker không ghi được và có thể hỏng log) ===\n" +
        "# 1) Cứu chỗ trống NGAY bằng cách giảm retention của topic to nhất:\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --entity-type topics --entity-name events --add-config retention.ms=3600000\n" +
        "# Kafka sẽ xoá segment cũ trong vòng vài phút. Nhớ đặt lại sau khi qua sự cố.\n" +
        "\n" +
        "# 2) Tìm ai đang chiếm đĩa\n" +
        "du -sh /var/lib/kafka/data/* | sort -h | tail -20\n" +
        "kafka-log-dirs.sh --bootstrap-server localhost:9092 --describe --broker-list 1\n" +
        "\n" +
        "# 3) Chuyển bớt partition sang broker khác (--execute với throttle)\n" +
        "\n" +
        "# PHÒNG: cảnh báo ở mức 70% đĩa, đặt retention.bytes cho mọi topic,\n" +
        "# và tách log.dirs sang đĩa riêng khỏi ổ hệ điều hành.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-1n0dsj7',
  q: 'Rolling upgrade / restart Kafka an toàn cần lưu ý gì?',
  answer:
    '- Restart **từng broker một**, chờ nó trở lại ISR đầy đủ (`UnderReplicatedPartitions` về 0) mới làm broker tiếp theo.\n' +
    '- Trước khi tắt: chạy **controlled shutdown** (`controlled.shutdown.enable=true`) để broker chuyển leadership đi trước, tránh gián đoạn đột ngột.\n' +
    '- Nâng version: theo `inter.broker.protocol.version` và `log.message.format.version` — nâng binary trước, bump protocol version sau khi tất cả broker đã lên.\n' +
    '- Consumer/producer với `enable.idempotence` + retry sẽ tự vượt qua các lần chuyển leader.',
  essence:
    'Nguyên tắc: mỗi lúc chỉ một broker "ra khỏi vòng", và luôn chờ replication bắt kịp. Controlled shutdown biến việc tắt broker thành di chuyển leadership có trật tự.',
  example:
    'Cụm 6 broker, RF=3: script restart broker 1 → chờ `UnderReplicatedPartitions=0` (2–5 phút) → broker 2 → ... Toàn bộ upgrade mất ~30 phút, ứng dụng chỉ thấy vài `NotLeaderForPartition` được retry trong suốt.',
  viz: {
    type: 'flow',
    title: 'Rolling upgrade an toàn — mỗi lúc chỉ MỘT broker ra khỏi vòng',
    nodes: ['controlled shutdown (chuyển leadership đi trước)', 'restart broker', 'chờ UnderReplicatedPartitions về 0', 'broker tiếp theo'],
    steps: [
      { to: 0, label: 'controlled.shutdown.enable=true — tránh gián đoạn đột ngột' },
      { to: 2, label: 'chờ replication bắt kịp mới làm broker tiếp theo' },
      { to: 3, label: 'nâng version: bump inter.broker.protocol.version SAU khi mọi broker đã lên binary mới' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Trình tự và các chốt kiểm tra",
      code:
        "# NGUYÊN TẮC: mỗi lần MỘT broker, và chỉ sang broker tiếp theo khi\n" +
        "# UnderReplicatedPartitions đã về 0.\n" +
        "\n" +
        "# 1) Trước khi bắt đầu: xác nhận cụm khoẻ\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --under-replicated-partitions\n" +
        "# Phải KHÔNG có dòng nào. Đang có replica tụt lại mà restart là tự chuốc sự cố.\n" +
        "\n" +
        "# 2) Chuyển leader ra khỏi broker sắp restart -> tránh gián đoạn cho client\n" +
        "kafka-leader-election.sh --bootstrap-server localhost:9092 \\\n" +
        "  --election-type preferred --all-topic-partitions\n" +
        "\n" +
        "# 3) Tắt MỀM (controlled shutdown: broker tự chuyển leader trước khi thoát)\n" +
        "#    controlled.shutdown.enable=true  (mặc định)\n" +
        "systemctl stop kafka        # đợi thoát hẳn, đừng kill -9\n" +
        "\n" +
        "# 4) Nâng cấp, khởi động lại, rồi CHỜ bắt kịp hoàn toàn\n" +
        "systemctl start kafka\n" +
        "watch \u0027kafka-topics.sh --bootstrap-server localhost:9092 --describe --under-replicated-partitions | wc -l\u0027\n" +
        "\n" +
        "# 5) Lặp lại cho broker tiếp theo.\n" +
        "\n" +
        "# NÂNG CẤP PHIÊN BẢN — hai vòng, không được gộp:\n" +
        "#   Vòng 1: cài binary mới, GIỮ NGUYÊN\n" +
        "#           inter.broker.protocol.version=<phiên bản CŨ>\n" +
        "#   Vòng 2: sau khi mọi broker đã chạy binary mới, mới nâng\n" +
        "#           inter.broker.protocol.version=<phiên bản MỚI> rồi restart lại.\n" +
        "# Làm vậy để còn ROLLBACK được ở vòng 1 — sau khi nâng protocol thì không lui được.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-1w9x1tj',
  q: 'Client quotas trong Kafka dùng để làm gì?',
  answer:
    'Quota giới hạn tài nguyên một client/nhóm client được dùng, đặt theo `client.id`, principal (user), hoặc cả hai:\n' +
    '- **Network bandwidth quota**: byte/s produce và fetch.\n' +
    '- **Request quota**: % thời gian request handler + network thread.\n\n' +
    'Khi client vượt, broker **throttle** (trì hoãn response) chứ không lỗi. Bảo vệ cụm khỏi một client "ồn ào" (bug, load test, tenant tham lam) làm ảnh hưởng client khác.',
  essence:
    'Quota là cách cô lập hiệu năng giữa các client dùng chung cụm — "noisy neighbor protection". Throttle mềm (chậm lại) thay vì từ chối cứng.',
  example:
    'Cụm multi-tenant: đặt `producer_byte_rate=10485760` (10MB/s) cho `client.id=analytics-backfill` để job backfill lịch sử không nuốt hết băng thông broker và làm chậm pipeline realtime của team khác.',
  viz: {
    type: 'tree',
    title: 'Client quotas — "noisy neighbor protection"',
    root: {
      label: 'Đặt theo client.id, principal (user), hoặc cả hai',
      children: [
        { label: 'Network bandwidth quota', note: 'byte/s produce và fetch' },
        { label: 'Request quota', note: '% thời gian request handler + network thread' },
        { label: 'Khi vượt', note: 'broker THROTTLE (trì hoãn response) — mềm, không lỗi cứng' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Chống một client làm chết cả cụm",
      code:
        "# Không có quota, một client lỗi (vòng lặp gửi, consumer đọc lại từ đầu toàn bộ\n" +
        "# lịch sử) có thể bão hoà mạng/đĩa và làm chậm MỌI client khác.\n" +
        "\n" +
        "# Giới hạn băng thông theo user\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --add-config \u0027producer_byte_rate=10485760,consumer_byte_rate=20971520\u0027 \\\n" +
        "  --entity-type users --entity-name analytics-service\n" +
        "# 10 MB/s ghi, 20 MB/s đọc\n" +
        "\n" +
        "# Giới hạn theo client.id\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --add-config \u0027producer_byte_rate=5242880\u0027 \\\n" +
        "  --entity-type clients --entity-name batch-loader\n" +
        "\n" +
        "# Giới hạn CPU (phần trăm thời gian xử lý request trên broker) — chặn được cả\n" +
        "# client gửi ít dữ liệu nhưng bắn quá nhiều request nhỏ\n" +
        "--add-config \u0027request_percentage=50\u0027\n" +
        "\n" +
        "# Mặc định cho MỌI client chưa có quota riêng\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --alter \\\n" +
        "  --add-config \u0027producer_byte_rate=52428800\u0027 --entity-type users --entity-default\n" +
        "\n" +
        "# CÁCH THỰC THI: broker không từ chối request mà TRÌ HOÃN phản hồi — client\n" +
        "# tự chậm lại một cách tự nhiên, không cần sửa code. Theo dõi qua metric\n" +
        "# produce-throttle-time-avg / fetch-throttle-time-avg ở phía client.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-10uqkze',
  q: 'Preferred leader election và cân bằng leadership?',
  answer:
    'Mỗi partition có một **preferred leader** — replica đầu tiên trong danh sách assignment. Sau khi broker chết rồi hồi, leadership có thể dồn lệch (broker vừa hồi giữ toàn follower).\n\n' +
    '`auto.leader.rebalance.enable=true` (mặc định): controller định kỳ chuyển leadership về preferred leader nếu lệch quá `leader.imbalance.per.broker.percentage`.\n\n' +
    'Thủ công: `kafka-leader-election.sh --election-type preferred`.',
  essence:
    'Leadership lệch = một số broker gánh mọi read/write, số khác nhàn. Preferred leader election trải đều tải bằng cách đưa leadership về vị trí "cân bằng theo thiết kế".',
  example:
    'Sau khi restart cả cụm theo thứ tự, broker 1 tình cờ làm leader cho 60% partition → CPU/network broker 1 cao. Chạy preferred leader election → leadership rải đều 6 broker, tải cân lại.',
  viz: {
    type: 'flow',
    title: 'Preferred leader election',
    nodes: ['broker chết rồi hồi', 'leadership dồn lệch (broker vừa hồi toàn follower)', 'auto.leader.rebalance.enable (mặc định)', 'controller chuyển leadership về preferred leader'],
    steps: [
      { to: 1, label: 'preferred leader = replica đầu tiên trong danh sách assignment' },
      { to: 2, label: 'controller định kỳ kiểm tra nếu lệch quá leader.imbalance.per.broker.percentage' },
      { to: 3, label: 'thủ công: kafka-leader-election.sh --election-type preferred' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Vì sao leadership lệch và cách cân bằng lại",
      code:
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders\n" +
        "# Partition: 0  Leader: 2  Replicas: 1,2,3   <- replica ĐẦU TIÊN là 1, nhưng leader là 2\n" +
        "# Partition: 1  Leader: 2  Replicas: 2,3,1\n" +
        "# Partition: 2  Leader: 2  Replicas: 3,1,2   <- broker 2 đang gánh MỌI leader\n" +
        "\n" +
        "# PREFERRED LEADER = replica ĐẦU TIÊN trong danh sách Replicas. Kafka phân bổ\n" +
        "# danh sách này đều nhau lúc tạo topic, nên nếu preferred leader luôn được chọn\n" +
        "# thì tải leader tự cân bằng.\n" +
        "\n" +
        "# Vì sao lệch: broker 1 restart -> leader chuyển sang 2. Broker 1 quay lại\n" +
        "# nhưng KHÔNG tự đòi lại vai trò leader -> sau vài lần restart, leadership\n" +
        "# dồn hết vào những broker khởi động sớm.\n" +
        "# Hậu quả: chỉ broker đó chịu toàn bộ traffic đọc/ghi (mọi request đều qua leader),\n" +
        "# trong khi các broker khác gần như rảnh.\n" +
        "\n" +
        "# Cân bằng lại thủ công:\n" +
        "kafka-leader-election.sh --bootstrap-server localhost:9092 \\\n" +
        "  --election-type preferred --all-topic-partitions\n" +
        "\n" +
        "# Hoặc chỉ một số partition:\n" +
        "kafka-leader-election.sh --bootstrap-server localhost:9092 \\\n" +
        "  --election-type preferred --path-to-json-file partitions.json",
    },
    {
      lang: "properties",
      title: "Tự động cân bằng, và vì sao nhiều nơi tắt nó đi",
      code:
        "auto.leader.rebalance.enable=true       # mặc định true\n" +
        "leader.imbalance.check.interval.seconds=300\n" +
        "leader.imbalance.per.broker.percentage=10   # lệch quá 10% thì tự chuyển\n" +
        "\n" +
        "# Tự động rất tiện, nhưng có một cái bẫy: broker vừa khởi động lại được giao\n" +
        "# leader NGAY khi vào ISR, trong khi page cache còn nguội và nó có thể chưa\n" +
        "# hoàn toàn ổn định -> độ trễ tăng đột biến đúng lúc vừa qua sự cố.\n" +
        "\n" +
        "# Nhiều đội vận hành cụm lớn TẮT tự động và chạy tay sau khi đã xác nhận\n" +
        "# cụm khoẻ (under-replicated = 0, broker đã chạy ổn định vài phút):\n" +
        "#   auto.leader.rebalance.enable=false\n" +
        "\n" +
        "# Đây cũng là bước cuối bắt buộc sau khi reassign partition hoặc rolling restart —\n" +
        "# reassign xong mà không cân bằng leader thì tải vẫn dồn về một chỗ.\n" +
        "# election-type unclean chỉ dùng khi chấp nhận MẤT dữ liệu để cứu tính sẵn sàng.",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-1cn8xlj',
  q: 'Các công cụ CLI Kafka hay dùng khi vận hành/debug?',
  answer:
    '- `kafka-topics.sh`: tạo/xoá/mô tả topic, tăng partition, xem replica & ISR.\n' +
    '- `kafka-consumer-groups.sh`: xem lag, reset offset (`--to-earliest`, `--to-datetime`, `--shift-by`), xoá group.\n' +
    '- `kafka-console-producer.sh` / `kafka-console-consumer.sh`: bơm/đọc message thủ công (kèm `--property print.key=true`, `--from-beginning`).\n' +
    '- `kafka-configs.sh`: xem/đổi config động của topic/broker (retention, quota) không cần restart.\n' +
    '- `kafka-reassign-partitions.sh`, `kafka-leader-election.sh`, `kafka-acls.sh`, `kafka-dump-log.sh`.',
  essence:
    'Bộ CLI đi kèm Kafka đủ cho hầu hết thao tác vận hành: chẩn đoán lag, đổi config nóng, di chuyển partition, đọc thô một topic để debug.',
  example:
    'Consumer xử lý sai 1 giờ dữ liệu: `kafka-consumer-groups.sh --reset-offsets --group billing --topic invoices --to-datetime 2024-06-01T13:00:00 --execute` (khi consumer đã dừng) rồi khởi động lại để chạy lại từ mốc đó.',
  viz: {
    type: 'tree',
    title: 'CLI Kafka hay dùng khi vận hành/debug',
    root: {
      label: 'Bộ CLI đi kèm đủ cho hầu hết thao tác',
      children: [
        { label: 'kafka-topics.sh', note: 'tạo/xoá/mô tả, tăng partition, xem replica & ISR' },
        { label: 'kafka-consumer-groups.sh', note: 'xem lag, reset offset (--to-earliest, --to-datetime, --shift-by)' },
        { label: 'kafka-console-producer/consumer.sh', note: 'bơm/đọc message thủ công để debug' },
        { label: 'kafka-configs.sh', note: 'đổi config động topic/broker không cần restart' },
        { label: 'kafka-reassign-partitions / leader-election / acls / dump-log' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Bộ công cụ cần thuộc lòng",
      code:
        "# === TOPIC ===\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --list\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --topic orders\n" +
        "kafka-topics.sh --bootstrap-server localhost:9092 --describe --under-replicated-partitions\n" +
        "\n" +
        "# === CONSUMER GROUP ===\n" +
        "kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --group g1\n" +
        "# Đặt lại offset (group phải đang DỪNG). Luôn --dry-run trước:\n" +
        "kafka-consumer-groups.sh --bootstrap-server localhost:9092 --group g1 \\\n" +
        "  --topic orders --reset-offsets --to-datetime 2026-09-01T00:00:00.000 --dry-run\n" +
        "\n" +
        "# === ĐỌC / GHI THỬ ===\n" +
        "kafka-console-consumer.sh --bootstrap-server localhost:9092 --topic orders \\\n" +
        "  --from-beginning --property print.key=true --property print.headers=true --max-messages 10\n" +
        "kafka-console-producer.sh --bootstrap-server localhost:9092 --topic orders \\\n" +
        "  --property parse.key=true --property key.separator=:\n" +
        "\n" +
        "# === CẤU HÌNH ===\n" +
        "kafka-configs.sh --bootstrap-server localhost:9092 --describe --entity-type topics --entity-name orders\n" +
        "\n" +
        "# === CHẨN ĐOÁN SÂU ===\n" +
        "kafka-log-dirs.sh --bootstrap-server localhost:9092 --describe --broker-list 1\n" +
        "kafka-run-class.sh kafka.tools.DumpLogSegments --files /var/lib/kafka/data/orders-0/000...log\n" +
        "kafka-run-class.sh kafka.tools.GetOffsetShell --bootstrap-server localhost:9092 --topic orders --time -1\n" +
        "kafka-transactions.sh --bootstrap-server localhost:9092 list\n" +
        "\n" +
        "# === ĐO HIỆU NĂNG ===\n" +
        "kafka-producer-perf-test.sh --topic bench --num-records 1000000 --record-size 1024 \\\n" +
        "  --throughput -1 --producer-props bootstrap.servers=localhost:9092\n" +
        "\n" +
        "# Thay thế hiện đại, dễ dùng hơn nhiều: kcat (kafkacat), kaf, redpanda console.\n" +
        "kcat -b localhost:9092 -t orders -C -o -10 -e     # đọc 10 message cuối rồi thoát",
    },
  ],
},
{
  cat: 'Vận hành',
  id: 'kafka-opuu36',
  q: 'Kafka trên Kubernetes: nên tự vận hành hay dùng managed?',
  answer:
    '**Self-managed trên K8s** (Strimzi operator): Strimzi quản lý broker (StatefulSet), KRaft/ZK, rolling update, cert, user/topic dưới dạng CRD. Linh hoạt, chạy được đa cloud, nhưng team phải hiểu Kafka sâu (đĩa, rebalance, tuning).\n\n' +
    '**Managed** (Confluent Cloud, AWS MSK, Aiven): nhà cung cấp lo broker, patch, scaling, backup. Ít việc ops, đổi lại chi phí cao hơn và ít quyền kiểm soát tuning/version.\n\n' +
    'Yếu tố quyết định: quy mô team platform, yêu cầu tuân thủ, chi phí, mức độ cần kiểm soát.',
  essence:
    'Managed đổi tiền lấy thời gian vận hành và rủi ro. Self-managed (Strimzi) hợp lý khi bạn đã có năng lực platform và cần kiểm soát/đa cloud.',
  example:
    'Startup 3 backend engineer, chưa có team infra: Confluent Cloud/MSK để không ai phải thức đêm vì broker đầy đĩa. Tập đoàn có team platform 10 người, yêu cầu on-prem: Strimzi trên K8s.',
  viz: {
    type: 'compare',
    cols: ['Self-managed (Strimzi trên K8s)', 'Managed (Confluent Cloud, MSK, Aiven)'],
    rows: [
      ['Ai lo broker/patch/scaling', 'team bạn', 'nhà cung cấp'],
      ['Yêu cầu', 'hiểu Kafka sâu (đĩa, rebalance, tuning)', 'ít việc ops'],
      ['Kiểm soát / đa cloud', 'cao', 'thấp'],
      ['Chi phí', 'thấp hơn (nếu có năng lực)', 'cao hơn'],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Tự vận hành với Strimzi, và khi nào nên dùng managed",
      code:
        "apiVersion: kafka.strimzi.io/v1beta2\n" +
        "kind: Kafka\n" +
        "metadata:\n" +
        "  name: production\n" +
        "spec:\n" +
        "  kafka:\n" +
        "    replicas: 3\n" +
        "    config:\n" +
        "      default.replication.factor: 3\n" +
        "      min.insync.replicas: 2\n" +
        "      offsets.topic.replication.factor: 3\n" +
        "      transaction.state.log.replication.factor: 3\n" +
        "      transaction.state.log.min.isr: 2\n" +
        "    storage:\n" +
        "      type: jbod\n" +
        "      volumes:\n" +
        "        - id: 0\n" +
        "          type: persistent-claim      # BẮT BUỘC dùng PV, không dùng emptyDir\n" +
        "          size: 2Ti\n" +
        "          class: fast-ssd\n" +
        "          deleteClaim: false          # giữ dữ liệu khi pod bị xoá\n" +
        "    rack:\n" +
        "      topologyKey: topology.kubernetes.io/zone   # trải replica ra nhiều AZ\n" +
        "    resources:\n" +
        "      requests: { memory: 32Gi, cpu: \"4\" }\n" +
        "      limits:   { memory: 32Gi, cpu: \"8\" }       # request = limit -> QoS Guaranteed\n" +
        "    jvmOptions:\n" +
        "      -Xms: 6g\n" +
        "      -Xmx: 6g                        # heap NHỎ, phần RAM còn lại cho page cache",
    },
    {
      lang: "bash",
      title: "Tự vận hành hay dùng managed",
      code:
        "# TỰ VẬN HÀNH (Strimzi) hợp khi:\n" +
        "#  - đã có đội vận hành K8s vững và người hiểu Kafka\n" +
        "#  - cần kiểm soát phiên bản/cấu hình sâu, hoặc dữ liệu không được rời hạ tầng\n" +
        "#  - lưu lượng đủ lớn để chi phí managed vượt chi phí người\n" +
        "\n" +
        "# MANAGED (MSK, Confluent Cloud, Aiven) hợp khi:\n" +
        "#  - đội nhỏ, muốn tập trung vào sản phẩm\n" +
        "#  - lưu lượng vừa phải\n" +
        "#  - cần SLA có cam kết bằng hợp đồng\n" +
        "\n" +
        "# NHỮNG THỨ HAY SAI KHI CHẠY KAFKA TRÊN K8S:\n" +
        "#  - dùng emptyDir hoặc storage class chậm -> mất dữ liệu / chậm khủng khiếp\n" +
        "#  - đặt memory limit thấp -> không còn page cache -> hiệu năng sụp\n" +
        "#  - không cấu hình rack -> ba replica cùng một AZ\n" +
        "#  - terminationGracePeriodSeconds quá ngắn -> broker bị kill giữa chừng\n" +
        "#    (Kafka cần thời gian cho controlled shutdown)\n" +
        "#  - dùng Deployment thay vì StatefulSet -> danh tính broker không ổn định",
    },
  ],
},
]);
