SS.addQuestions('kafka', [
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Giám sát',
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
},
{
  cat: 'Hệ sinh thái',
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
},
{
  cat: 'Hệ sinh thái',
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
},
{
  cat: 'Hệ sinh thái',
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
},
{
  cat: 'Bảo mật',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Thiết kế',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
{
  cat: 'Vận hành',
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
},
]);
