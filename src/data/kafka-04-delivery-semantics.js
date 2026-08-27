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
},
]);
