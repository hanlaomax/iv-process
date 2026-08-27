SS.addQuestions('kafka', [
{
  cat: 'Consumer',
  q: 'Vòng lặp poll của consumer hoạt động thế nào? `max.poll.records`, `max.poll.interval.ms`?',
  answer:
    'Consumer chạy vòng lặp: `poll(timeout)` → nhận tối đa `max.poll.records` record (mặc định 500) → xử lý → commit offset → lặp lại.\n\n' +
    '`poll()` còn làm việc nền quan trọng: gửi heartbeat, tham gia rebalance. Vì vậy **phải gọi `poll()` đều đặn**.\n\n' +
    '`max.poll.interval.ms` (mặc định 5 phút): nếu khoảng cách giữa hai lần `poll()` vượt ngưỡng này (xử lý lô quá lâu), broker coi consumer "chết" → **loại khỏi group và rebalance**.',
  essence:
    '`poll()` vừa lấy dữ liệu vừa "giữ chỗ" trong group. Xử lý một lô lâu hơn `max.poll.interval.ms` = tự bị đá ra. Giảm `max.poll.records` hoặc tăng interval khi xử lý nặng.',
  example:
    'Mỗi record gọi API mất 2s, `max.poll.records=500` → một lô mất ~1000s ≫ 300s → rebalance liên tục, không tiến được. Sửa: `max.poll.records=20` (lô ~40s) hoặc đẩy xử lý sang thread pool và pause partition.',
},
{
  cat: 'Rebalancing',
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
},
{
  cat: 'Rebalancing',
  q: 'Eager rebalancing và cooperative (incremental) rebalancing khác nhau thế nào?',
  answer:
    '**Eager** (`RangeAssignor`, `RoundRobinAssignor`): mọi consumer **revoke tất cả** partition, rebalance, rồi nhận lại phân bổ mới. Toàn group dừng xử lý trong suốt quá trình.\n\n' +
    '**Cooperative** (`CooperativeStickyAssignor`, mặc định từ Kafka 3.x cho nhiều client): chỉ **revoke những partition cần chuyển chủ**, các partition khác vẫn được xử lý bình thường. Rebalance diễn ra qua nhiều vòng nhỏ.',
  essence:
    'Eager: "buông hết, chia lại". Cooperative: "chỉ trao đổi phần chênh lệch". Cooperative giảm mạnh thời gian gián đoạn khi scale/deploy.',
  example:
    'Group 10 consumer, thêm 1 consumer thứ 11: eager → cả 10 dừng, chia lại 100% partition. Cooperative → chỉ ~1/11 partition được chuyển sang consumer mới, 90%+ luồng xử lý không bị gián đoạn.',
},
{
  cat: 'Rebalancing',
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
},
{
  cat: 'Offset',
  q: 'Commit offset: auto-commit và manual commit (`commitSync`/`commitAsync`)?',
  answer:
    '- **Auto** (`enable.auto.commit=true`): consumer tự commit offset của lô *đã poll* theo `auto.commit.interval.ms` (5s). Đơn giản nhưng có thể commit **trước khi xử lý xong** → mất message khi crash; hoặc xử lý xong nhưng chưa tới kỳ commit → xử lý lại khi rebalance.\n' +
    '- **Manual**: `enable.auto.commit=false`, gọi `commitSync()` (chặn, retry, an toàn — dùng khi shutdown/sau lô) hoặc `commitAsync()` (không chặn, throughput cao, không retry — dùng trong vòng lặp).\n\n' +
    'Mẫu phổ biến: `commitAsync` mỗi lô + `commitSync` một lần trong `finally` khi thoát.',
  essence:
    'Commit thủ công **sau khi xử lý** biến "đọc tới đâu" thành "đã làm xong tới đâu" — điều kiện cần cho at-least-once đáng tin.',
  example:
    'Consumer ghi vào DB: `for (rec : records) upsert(rec); consumer.commitSync(offsetsOf(records));`. Crash sau khi ghi DB nhưng trước commit → lô đó chạy lại; nếu `upsert` idempotent thì kết quả vẫn đúng.',
},
{
  cat: 'Offset',
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
},
{
  cat: 'Consumer',
  q: 'Consumer lag là gì? Đo và xử lý thế nào?',
  answer:
    '**Lag** của một partition = `log-end-offset` (message mới nhất) − `committed-offset` (consumer đã xử lý tới). Tổng lag của group = tổng các partition.\n\n' +
    'Đo: `kafka-consumer-groups.sh --describe`, JMX `records-lag-max`, hoặc exporter (Burrow, kafka-lag-exporter) → Prometheus.\n\n' +
    'Xử lý lag tăng: thêm consumer (tới trần = số partition), tối ưu xử lý mỗi message, tăng `max.poll.records`, xử lý song song trong consumer, hoặc tăng partition (cho tương lai).',
  essence:
    'Lag là thước đo "consumer có theo kịp producer không" và là chỉ số cảnh báo quan trọng nhất của một pipeline. Lag tăng đều = throughput tiêu thụ < throughput sản xuất.',
  example:
    'Alert: lag group `payments` > 100k và đang tăng → producer đang spike hoặc consumer chậm. Scale consumer từ 4 → 8 pod (topic 12 partition) → tiêu thụ tăng gần 2x, lag rút về 0 trong 10 phút.',
},
{
  cat: 'Consumer',
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
},
{
  cat: 'Rebalancing',
  q: 'Static membership (`group.instance.id`) giải quyết vấn đề gì?',
  answer:
    'Bình thường, consumer restart = rời group + join lại = 2 lần rebalance, và có thể nhận partition khác.\n\n' +
    'Đặt `group.instance.id` cố định cho mỗi instance → consumer thành **thành viên tĩnh**. Khi nó restart nhanh (trong `session.timeout.ms`), coordinator **giữ nguyên** phân bổ partition cho id đó, **không rebalance**.\n\n' +
    'Rất hợp với deployment có identity ổn định (StatefulSet trong K8s).',
  essence:
    'Static membership tách "restart tạm thời" khỏi "rời group vĩnh viễn". Deploy/restart pod không còn gây rebalance nếu hoàn tất trong session timeout.',
  example:
    'K8s StatefulSet: `group.instance.id=$(POD_NAME)`, `session.timeout.ms=120s`. Rolling update mỗi pod restart trong ~30s → 0 rebalance, consumer nhận lại đúng partition cũ, state cache còn nguyên.',
},
{
  cat: 'Consumer',
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
},
{
  cat: 'Rebalancing',
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
},
{
  cat: 'Consumer',
  q: 'Khi nào dùng `pause()` / `resume()` và `seek()`?',
  answer:
    '`pause(partitions)`: ngừng nhận record từ partition đó ở các `poll()` tiếp theo (nhưng vẫn heartbeat, vẫn giữ partition). `resume()` để tiếp tục. Dùng khi: hạ nguồn (DB, API) đang quá tải → backpressure; hoặc đang xử lý bất đồng bộ một lô lớn.\n\n' +
    '`seek(partition, offset)` / `seekToBeginning` / `seekToEnd`: đặt lại vị trí đọc. Dùng để **replay** (tua lại xử lý sự kiện), bỏ qua message lỗi, hoặc khôi phục từ offset lưu bên ngoài.',
  essence:
    '`pause/resume` là van điều tiết luồng để giữ nhịp poll mà không nhận thêm dữ liệu. `seek` là điều khiển thủ công con trỏ đọc — nền tảng của replay và offset-ngoài-Kafka.',
  example:
    'Bug xử lý sai từ 09:00 hôm qua: tìm offset tương ứng timestamp (`offsetsForTimes`), `seek` group về đó, cho chạy lại. Backpressure: khi DB connection pool cạn, `pause` các partition, `poll` vẫn chạy để không bị rebalance, khi pool rảnh thì `resume`.',
},
{
  cat: 'Consumer',
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
},
{
  cat: 'Consumer',
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
},
{
  cat: 'Consumer',
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
},
{
  cat: 'Consumer',
  q: '`isolation.level=read_committed` làm gì?',
  answer:
    'Mặc định `read_uncommitted`: consumer thấy **mọi** message, kể cả của transaction chưa commit hoặc đã abort.\n\n' +
    '`read_committed`: consumer chỉ thấy message thuộc transaction **đã commit** (và message không giao dịch). Message của transaction bị abort bị lọc bỏ; consumer đọc tới **Last Stable Offset (LSO)** thay vì high watermark — có thể chờ nếu có transaction đang mở.',
  essence:
    'Bắt buộc đặt `read_committed` nếu upstream dùng transactional producer, nếu không bạn xử lý cả những message "chưa chắc chắn" rồi phải rollback.',
  example:
    'Pipeline EOS: producer transaction ghi `ledger`. Consumer của `ledger` phải `read_committed` — nếu để mặc định, một transaction rollback (do lỗi) vẫn khiến consumer ghi bút toán sai vào sổ cái.',
},
{
  cat: 'Consumer',
  q: 'Vì sao số partition đặt trần cho khả năng scale consumer?',
  answer:
    'Trong một consumer group, mỗi partition được gán cho **đúng một** consumer. Nếu group có nhiều consumer hơn số partition, các consumer thừa **không nhận partition nào** → ngồi không (chỉ là dự phòng nóng khi có consumer khác chết).\n\n' +
    'Do đó: **song song tối đa của một group = số partition của topic**.\n\n' +
    'Tăng partition được (nhưng đổi key→partition mapping, ảnh hưởng thứ tự dữ liệu cũ); giảm không được.',
  essence:
    'Partition là "làn xe" — thêm bao nhiêu xe (consumer) cũng không vượt số làn. Lập kế hoạch partition với dự phòng cho tăng trưởng consumer.',
  example:
    'Topic 8 partition, đang chạy 8 consumer, lag vẫn tăng vì mỗi message nặng. Thêm consumer thứ 9–16 → vô ích, chúng idle. Phải: tăng partition lên 24, hoặc xử lý song song bên trong consumer, hoặc tối ưu code xử lý.',
},
{
  cat: 'Consumer',
  q: 'Đọc một compacted topic từ đầu có gì khác biệt?',
  answer:
    'Compacted topic giữ **bản mới nhất cho mỗi key** (cộng thêm phần "tail" gần đây chưa nén, có thể còn nhiều bản của cùng key).\n\n' +
    'Đọc từ `earliest` → nhận một "ảnh chụp" trạng thái hiện tại: mỗi key xuất hiện ít nhất một lần với giá trị mới nhất, cộng vài bản lịch sử ở đuôi. Message value = `null` là **tombstone** — nghĩa là key đã bị xoá.\n\n' +
    'Đây là cách một service mới dựng lại toàn bộ state mà không cần lịch sử đầy đủ.',
  essence:
    'Compacted topic ≈ một bảng key-value được stream hoá. Đọc từ đầu = bootstrap trạng thái; tombstone = lệnh xoá.',
  example:
    'Topic `customer-profile` (compact). Service gợi ý mới deploy: đọc từ `earliest`, dựng `Map<customerId, Profile>` trong bộ nhớ/RocksDB, gặp tombstone thì xoá key. Sau khi bắt kịp, chuyển sang xử lý sự kiện realtime. Đây chính là KTable của Kafka Streams.',
},
{
  cat: 'Consumer',
  q: 'Follower fetching (`client.rack`) giúp gì cho consumer đa vùng?',
  answer:
    'Mặc định consumer luôn đọc từ **leader** partition, dù leader nằm ở AZ/region khác → tốn phí truyền dữ liệu cross-AZ và thêm latency.\n\n' +
    'Từ Kafka 2.4: đặt `client.rack` trên consumer + `replica.selector.class=RackAwareReplicaSelector` trên broker → consumer đọc từ **follower cùng rack** nếu có (follower vẫn chỉ replicate, nhưng được phép phục vụ fetch cho consumer).\n\n' +
    'Ghi vẫn luôn qua leader; chỉ đọc mới được định tuyến theo rack.',
  essence:
    'Follower fetching cắt lưu lượng đọc cross-AZ bằng cách cho consumer lấy dữ liệu từ bản sao gần nhất. Đổi lại consumer có thể đọc dữ liệu trễ hơn leader vài mili giây.',
  example:
    'Cụm trải 3 AZ, consumer analytics chạy ở AZ-c: đặt `client.rack=az-c` → consumer đọc từ follower ở az-c thay vì leader ở az-a → hoá đơn data transfer AWS giảm đáng kể cho pipeline throughput lớn.',
},
{
  cat: 'Consumer',
  q: 'Khi nào nên dùng plain consumer, Kafka Streams, hay Kafka Connect?',
  answer:
    '- **Plain consumer (client API)**: kiểm soát tối đa, logic tuỳ ý, tích hợp vào service hiện có. Bạn tự lo threading, offset, retry, state.\n' +
    '- **Kafka Streams**: thư viện xử lý luồng — map/filter/join/aggregate/windowing, quản lý state store + changelog, exactly-once tích hợp. Chạy như một app thường (không cần cụm riêng). Dùng khi logic là "biến đổi topic thành topic".\n' +
    '- **Kafka Connect**: framework tích hợp dữ liệu no-code/low-code — source (DB→Kafka) và sink (Kafka→S3/ES/JDBC), có SMT, chạy cluster riêng. Dùng để **đổ dữ liệu** giữa Kafka và hệ thống ngoài.',
  essence:
    'Consumer cho logic nghiệp vụ tuỳ biến; Streams cho pipeline transform/aggregate có state; Connect cho di chuyển dữ liệu vào/ra Kafka mà không viết code.',
  example:
    'Đồng bộ Postgres → Kafka: Connect + Debezium (source). Tính "doanh thu 5 phút gần nhất theo cửa hàng": Kafka Streams windowed aggregation. Gửi email khi đơn hàng > 10 triệu: plain consumer trong service notification.',
},
]);
