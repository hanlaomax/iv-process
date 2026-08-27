SS.addQuestions('microservices', [
{
  cat: 'Giao tiếp',
  q: 'Giao tiếp đồng bộ và bất đồng bộ — khi nào dùng cái nào?',
  answer:
    '**Đồng bộ** (REST/gRPC, request–response): caller chờ kết quả. Dùng khi: cần dữ liệu *ngay* để tiếp tục (query), thao tác đọc, luồng đơn giản. Nhược: **temporal coupling** — callee phải sống và nhanh, lỗi lan theo chuỗi.\n\n' +
    '**Bất đồng bộ** (message/event qua broker): caller phát message rồi đi tiếp. Dùng khi: thông báo "đã có việc xảy ra", xử lý nền, fan-out nhiều consumer, tách rời vòng đời. Ưu: chịu lỗi tốt (broker buffer), scale độc lập. Nhược: eventual consistency, khó theo dõi luồng, cần idempotency.',
  essence:
    'Đồng bộ cho "tôi cần biết ngay để làm tiếp"; bất đồng bộ cho "tôi thông báo, ai quan tâm thì xử lý". Ưu tiên bất đồng bộ cho **thay đổi state**, đồng bộ cho **truy vấn**.',
  example:
    'Checkout: `order-service` gọi **đồng bộ** `payment-service` (cần biết thanh toán OK mới tạo đơn) nhưng phát **event** `OrderPlaced` cho `inventory`, `email`, `analytics` (không cần chờ chúng). Nếu email service chết, đơn hàng vẫn tạo được.',
},
{
  cat: 'Giao tiếp',
  q: 'REST và gRPC — so sánh, chọn khi nào?',
  answer:
    '| | REST/JSON | gRPC |\n' +
    '|-|-|-|\n' +
    '| Giao thức | HTTP/1.1, text | HTTP/2, binary (Protobuf) |\n' +
    '| Contract | OpenAPI (tuỳ chọn) | .proto (bắt buộc, sinh code) |\n' +
    '| Hiệu năng | Chậm hơn, payload lớn | Nhanh, nhỏ, multiplexing |\n' +
    '| Streaming | Hạn chế (SSE) | Có (client/server/bi-directional) |\n' +
    '| Trình duyệt | Native | Cần grpc-web + proxy |\n' +
    '| Debug | curl, đọc được | Cần công cụ (grpcurl) |\n\n' +
    'Dùng **gRPC** cho giao tiếp **service-to-service nội bộ** (hiệu năng, contract chặt, streaming). Dùng **REST** cho **public API / client trình duyệt / webhook / đối tác**.',
  essence:
    'gRPC tối ưu cho "máy nói với máy" trong mạng nội bộ với contract mạnh. REST tối ưu cho khả năng tiếp cận, debug, và tương thích rộng (trình duyệt, đối tác).',
  example:
    '`order-service` ↔ `inventory-service`: gRPC (thường xuyên, cần nhanh, `.proto` là contract). API mà app mobile và đối tác gọi: REST qua API Gateway. Nhiều hệ dùng cả hai: gRPC bên trong, REST/GraphQL ở rìa.',
},
{
  cat: 'Giao tiếp',
  q: 'Chọn message broker: Kafka, RabbitMQ hay SQS/SNS?',
  answer:
    '- **Kafka**: log phân tán, throughput cực cao, lưu trữ + replay, ordering per-partition, nhiều consumer group đọc độc lập. Cho event streaming, event sourcing, data pipeline. Vận hành nặng (hoặc dùng managed).\n' +
    '- **RabbitMQ**: message broker truyền thống, routing linh hoạt (exchange/binding), per-message ack, priority, TTL, dead-letter. Cho task queue, RPC, workflow. Không lưu lâu, không replay tốt.\n' +
    '- **SQS + SNS** (AWS): fully managed, SQS = queue (một consumer group), SNS = pub/sub fan-out. Đơn giản, ít vận hành, nhưng ít tính năng, không replay.',
  essence:
    'Kafka = "sổ cái sự kiện tua lại được, throughput lớn". RabbitMQ = "hàng đợi công việc với routing thông minh". SQS/SNS = "không phải vận hành gì, đủ dùng trong AWS".',
  example:
    'Event `OrderPlaced` mà 5 team tiêu thụ và cần replay khi thêm consumer mới → **Kafka**. Hàng đợi gửi email với retry + DLQ, throughput vừa → **RabbitMQ** hoặc **SQS**. Fan-out thông báo tới nhiều queue → **SNS→SQS**.',
},
{
  cat: 'Event-driven',
  q: 'Event notification, event-carried state transfer, event sourcing — khác nhau?',
  answer:
    '- **Event notification**: event chỉ mang id + loại ("Order 123 đã đổi trạng thái"). Consumer phải **gọi lại** provider để lấy chi tiết. Nhẹ, nhưng tăng coupling đồng bộ.\n' +
    '- **Event-carried state transfer (ECST)**: event mang **đủ dữ liệu** consumer cần ("Order 123: status=SHIPPED, items=[...], total=..."). Consumer không cần gọi lại → tách rời hơn, nhưng event lớn và consumer lưu bản sao.\n' +
    '- **Event sourcing**: **mọi thay đổi state được lưu dưới dạng chuỗi event** là nguồn sự thật; state hiện tại = replay các event.',
  essence:
    'Ba mức "event mang bao nhiêu thông tin": chỉ tín hiệu → tín hiệu + trạng thái → toàn bộ lịch sử. ECST là điểm cân bằng phổ biến cho microservices (giảm call đồng bộ, chấp nhận trùng lặp dữ liệu).',
  example:
    'Notification: `{ "type": "OrderShipped", "orderId": 123 }` → email-service gọi `GET /orders/123`. ECST: `{ "type": "OrderShipped", "orderId": 123, "customerEmail": "...", "trackingUrl": "..." }` → email-service gửi luôn, không gọi ai.',
},
{
  cat: 'Event-driven',
  q: 'Choreography và Orchestration khác nhau thế nào?',
  answer:
    '**Choreography**: không có "nhạc trưởng". Mỗi service lắng nghe event và tự quyết định phản ứng + phát event tiếp theo. Luồng nghiệp vụ "nổi lên" từ tương tác.\n' +
    '- Ưu: tách rời cao, thêm consumer không sửa ai.\n' +
    '- Nhược: luồng tổng thể **khó nhìn**, khó debug "đơn hàng kẹt ở đâu", dễ có vòng lặp event ngầm.\n\n' +
    '**Orchestration**: một **orchestrator** (state machine) điều khiển: gọi từng bước, nhận kết quả, quyết định bước tiếp / bù trừ.\n' +
    '- Ưu: luồng tường minh ở một chỗ, dễ quan sát, dễ sửa.\n' +
    '- Nhược: thêm một thành phần; orchestrator có thể phình to.',
  essence:
    'Ít bước, tách rời quan trọng → choreography. Nhiều bước, cần quan sát/kiểm soát luồng (nhất là saga tiền bạc) → orchestration. Nhiều hệ dùng lai: choreography ở mức cao, orchestration trong một số quy trình phức tạp.',
  example:
    'Đăng ký người dùng (tạo account → gửi email xác thực → tạo hồ sơ): choreography đủ. Quy trình hoàn tiền (kiểm tra đơn → tạo credit note → gọi cổng thanh toán → cập nhật sổ cái → thông báo): orchestrator (Temporal/Camunda) vì cần theo dõi trạng thái và retry/bù trừ chính xác.',
},
{
  cat: 'Saga',
  q: 'Saga pattern hoạt động thế nào? Compensating transaction là gì?',
  answer:
    'Saga chia một "transaction nghiệp vụ" xuyên nhiều service thành chuỗi **local transaction**. Mỗi bước commit cục bộ; nếu một bước fail, chạy các **compensating transaction** (hành động bù trừ) để hoàn tác các bước đã thành công.\n\n' +
    'Ví dụ compensation: đã `ReserveInventory` → bù bằng `ReleaseInventory`; đã `ChargeCard` → bù bằng `RefundCard`.\n\n' +
    'Lưu ý:\n' +
    '- Compensation phải **idempotent** và **luôn thành công được** (retry tới cùng).\n' +
    '- Có trạng thái "không bù được" (ví dụ đã gửi hàng) → cần can thiệp thủ công / thiết kế để bước không đảo ngược nằm cuối.\n' +
    '- Saga cho **eventual consistency**, không phải isolation — cần xử lý "đọc bẩn giữa chừng".',
  essence:
    'Saga thay "atomic + rollback" (bất khả thi xuyên service) bằng "chuỗi commit + undo nghiệp vụ". Mỗi bước phải nghĩ trước hành động bù trừ của nó.',
  example:
    'Đặt tour: `reserve-flight` → `reserve-hotel` → `charge-payment`. `charge-payment` fail (thẻ hết hạn) → orchestrator gọi `cancel-hotel` rồi `cancel-flight`. Đơn hàng kết thúc ở trạng thái FAILED, khách được thông báo, không mất tiền, không giữ chỗ.',
},
{
  cat: 'Dữ liệu',
  q: 'Transactional Outbox — publish event đáng tin khi ghi DB?',
  answer:
    'Vấn đề **dual write**: cần ghi DB (tạo đơn) VÀ publish event (`OrderPlaced`). Không có transaction chung → ghi DB xong mà publish fail (hoặc ngược lại) → không nhất quán.\n\n' +
    'Outbox:\n' +
    '1. Trong **cùng một local transaction**, ghi bản ghi nghiệp vụ + một dòng vào bảng `outbox`.\n' +
    '2. Một tiến trình riêng đọc `outbox` và publish lên broker: **polling** (`SELECT ... WHERE published = false`) hoặc **CDC** (Debezium đọc WAL/binlog).\n' +
    '3. Đánh dấu đã gửi.\n\n' +
    'Giờ chỉ còn **một** thao tác ghi nguyên tử (vào DB); việc chuyển sang broker là at-least-once + idempotent.',
  essence:
    'Đừng ghi hai nơi cùng lúc. Ghi một nơi nguyên tử (DB, gồm cả event trong bảng outbox), rồi để một relay đáng tin chuyển event ra broker.',
  example:
    '`@Transactional`: `orderRepo.save(order)` + `outboxRepo.save(new OutboxEvent("OrderPlaced", json))`. Debezium theo dõi bảng `outbox`, mỗi INSERT → publish lên Kafka topic `orders`. DB rollback → không có dòng outbox → không có event sai.',
},
{
  cat: 'Giao tiếp',
  q: 'API Composition — truy vấn dữ liệu xuyên nhiều service?',
  answer:
    'Không có JOIN xuyên service. Để trả một view cần data từ nhiều service:\n\n' +
    '**API Composition**: một **composer** (thường là API Gateway hoặc BFF) gọi từng service, gộp kết quả trong bộ nhớ, trả về client.\n' +
    '- Đơn giản, không cần lưu trữ thêm.\n' +
    '- Nhược: latency = tổng (hoặc max nếu song song) các call; N+1 nếu gọi lặp; phụ thuộc tất cả service phải sống.\n\n' +
    '**CQRS read model**: một service lắng nghe event từ nhiều service, dựng sẵn một bảng "materialized view" tối ưu cho truy vấn đó → query một chỗ, nhanh, chịu lỗi tốt. Đổi lại: eventual consistency + phải maintain projection.',
  essence:
    'Query xuyên service: composition (gọi lúc chạy, đơn giản, mong manh) hoặc CQRS read model (dựng sẵn, nhanh, phức tạp hơn). Chọn theo tần suất query và yêu cầu latency/độ tin cậy.',
  example:
    'Trang "chi tiết đơn hàng" cần order + customer + shipping: API composition ở BFF gọi 3 service song song (`CompletableFuture.allOf`). Trang "lịch sử đơn hàng của tôi" (query nóng, cần nhanh): `order-history-service` giữ read model tổng hợp sẵn từ event.',
},
{
  cat: 'Giao tiếp',
  q: 'Backends for Frontends (BFF) pattern là gì?',
  answer:
    'Thay vì một API Gateway chung cho mọi client, tạo **một backend riêng cho mỗi loại frontend** (web, iOS, Android, đối tác).\n\n' +
    'Mỗi BFF:\n' +
    '- Gộp/biến đổi dữ liệu từ nhiều downstream service theo đúng nhu cầu của UI đó.\n' +
    '- Giảm số round-trip cho client (một call BFF thay vì 5 call service).\n' +
    '- Che giấu cấu trúc microservices khỏi client; đổi service bên trong không ảnh hưởng client.\n' +
    '- Do team frontend sở hữu → thay đổi UI + API cùng nhịp.\n\n' +
    'Nhược: trùng lặp logic giữa các BFF; thêm một tầng.',
  essence:
    'BFF là "API riêng cho từng trải nghiệm". Nó tách nhu cầu rất khác nhau của web (payload lớn, ít call) và mobile (payload nhỏ, tiết kiệm pin/data) khỏi nhau và khỏi các service lõi.',
  example:
    'App mobile cần màn hình home gọn: `mobile-bff` gọi `feed`, `promo`, `user` → trả một JSON gọn ~5KB. Web dashboard cần chi tiết: `web-bff` trả ~50KB với đầy đủ thông tin. Hai BFF, cùng downstream service.',
},
{
  cat: 'Giao tiếp',
  q: 'Idempotency ở biên API — thiết kế thế nào?',
  answer:
    'Client gửi header `Idempotency-Key: <uuid>` cho request không an toàn (POST tạo tài nguyên, thanh toán). Server:\n' +
    '1. Tra key trong store (Redis/DB, có TTL).\n' +
    '2. Chưa thấy → xử lý, **lưu key + kết quả** (status + body), trả kết quả.\n' +
    '3. Thấy rồi & đã xong → trả **lại kết quả cũ**, không xử lý lại.\n' +
    '4. Thấy rồi & đang xử lý → trả 409 (client retry sau).\n\n' +
    'Bảo vệ trước: client retry do timeout, double-click, network chập chờn, at-least-once redelivery từ broker.',
  essence:
    'Trong hệ phân tán, "gửi đúng một lần" là bất khả thi → làm cho "gửi lại request giống hệt" trở nên vô hại. Idempotency key = server nhận ra và trả kết quả cũ.',
  example:
    'Payment API: app mobile timeout sau 30s dù server đã charge → app retry cùng `Idempotency-Key` → server thấy key đã có kết quả `{paymentId: "p_123"}` → trả lại y hệt, KHÔNG charge lần hai. Stripe/PayPal đều làm vậy.',
},
{
  cat: 'Event-driven',
  q: 'Message ordering giữa các service — đảm bảo thế nào?',
  answer:
    'Ordering toàn cục thường không cần và rất đắt. Cần ordering **theo một thực thể** (mọi event của order X theo đúng thứ tự).\n\n' +
    'Cách làm:\n' +
    '- **Partition/routing theo key** = id thực thể (Kafka partition key = `orderId`; RabbitMQ consistent hash exchange; SQS FIFO `MessageGroupId`). Mọi event cùng key → cùng partition → thứ tự đảm bảo.\n' +
    '- Consumer xử lý **tuần tự trong một partition** (không dùng thread pool phá thứ tự).\n' +
    '- Nếu vẫn có thể lệch: đính kèm **version/sequence number** trong event, consumer bỏ qua event cũ hơn version đã thấy.',
  essence:
    'Đừng ép ordering toàn cục. Nhóm các event *cần* thứ tự theo key thực thể vào cùng một partition, xử lý tuần tự trong partition đó.',
  example:
    'Event `AddressChanged` rồi `OrderShipped` của cùng đơn: key = `orderId` → cùng Kafka partition → consumer `shipping` xử lý đúng thứ tự. Đơn khác nằm partition khác, xử lý song song.',
},
{
  cat: 'Event-driven',
  q: 'Dead Letter Queue (DLQ) và xử lý poison message?',
  answer:
    'Một message không xử lý được (dữ liệu sai schema, bug logic, downstream lỗi vĩnh viễn) sẽ bị retry vô hạn → **chặn** cả queue/partition.\n\n' +
    'Mẫu:\n' +
    '- Sau `maxRetries` lần fail → chuyển message sang **DLQ** kèm metadata (lỗi gì, stack trace, offset gốc, số lần thử).\n' +
    '- **Retry queue có delay** cho lỗi tạm thời (`retry-5s`, `retry-1m`, `retry-10m`) trước khi tới DLQ.\n' +
    '- **Alert** trên DLQ; có dashboard xem nội dung; có công cụ **replay** DLQ sau khi sửa bug.\n\n' +
    'Không bao giờ "nuốt" message lỗi im lặng.',
  essence:
    'DLQ tách "message độc" ra khỏi luồng chính để một record hỏng không làm nghẽn tất cả. Retry queue cho lỗi tạm; DLQ cho lỗi cần con người xem.',
  example:
    'Message có JSON sai định dạng: consumer bắt `DeserializationException` → publish nguyên bytes sang `orders.dlq` với header `error`, `original-offset`. Partition tiếp tục chạy. Team data xem DLQ, phát hiện producer bug, sửa, replay 200 message từ DLQ.',
},
{
  cat: 'Testing',
  q: 'Contract testing (consumer-driven contracts / Pact) là gì?',
  answer:
    'Vấn đề: provider đổi API làm hỏng consumer, nhưng e2e test đủ N service thì chậm và giòn.\n\n' +
    'Contract testing:\n' +
    '1. **Consumer** viết test mô tả kỳ vọng: "gọi `GET /orders/1` thì nhận `{id, status, total}`" → sinh ra một **contract** (file Pact).\n' +
    '2. Contract được chia sẻ (Pact Broker).\n' +
    '3. **Provider** chạy test xác minh: response thật của nó **thoả** mọi contract của các consumer.\n' +
    '4. CI của provider fail nếu một thay đổi phá contract của consumer nào đó → biết trước khi deploy.',
  essence:
    'Contract test kiểm tra "hai phía hiểu nhau" mà không cần chạy cả hệ thống. Mỗi phía test độc lập với một artifact chung (contract). Nhanh, chạy trong CI của từng service.',
  example:
    '`web-bff` (consumer) khai báo cần field `estimatedDelivery` từ `order-service`. Dev order-service lỡ đổi tên field → CI order-service chạy Pact verify → FAIL với "web-bff mong đợi estimatedDelivery" → sửa trước khi merge.',
},
{
  cat: 'Event-driven',
  q: 'Tương thích schema của event (backward/forward compatibility)?',
  answer:
    'Event được lưu lâu và nhiều consumer đọc → schema phải tiến hoá an toàn.\n\n' +
    '- **Backward compatible** (consumer mới đọc event cũ): chỉ **thêm field optional/có default**, không xoá field, không đổi kiểu, không đổi nghĩa.\n' +
    '- **Forward compatible** (consumer cũ đọc event mới): consumer phải là **tolerant reader** — bỏ qua field lạ.\n' +
    '- Dùng **Schema Registry** (Avro/Protobuf/JSON Schema) với compatibility mode `BACKWARD` — tự chặn thay đổi phá vỡ.\n\n' +
    'Breaking change không tránh được → phát **event type mới** (`OrderPlacedV2`), chạy song song, migrate consumer, rồi bỏ V1.',
  essence:
    'Event schema là hợp đồng nhiều-bên tồn tại lâu. "Chỉ thêm, không xoá/đổi" giải quyết 90%. Schema Registry biến quy tắc đó thành kiểm tra tự động.',
  example:
    'Thêm `discountCode` (string, default "") vào `OrderPlaced` với mode BACKWARD → consumer cũ bỏ qua, producer mới không phá ai. Registry từ chối nếu bạn đổi `amount` từ int sang string.',
},
{
  cat: 'Giao tiếp',
  q: 'Chuỗi call đồng bộ sâu gây vấn đề gì? Giảm thế nào?',
  answer:
    'Request A→B→C→D đồng bộ:\n' +
    '- **Latency cộng dồn**: p99 tổng ≈ tổng p99 từng chặng (hoặc tệ hơn).\n' +
    '- **Availability nhân**: 4 service mỗi cái 99.9% → chuỗi ≈ 99.6%.\n' +
    '- **Fault propagation**: D chậm → C giữ connection chờ → B hết thread → A timeout → cascading failure.\n\n' +
    'Giảm:\n' +
    '- Chuyển các bước không cần-ngay sang **bất đồng bộ / event**.\n' +
    '- **API composition song song** thay vì tuần tự.\n' +
    '- **Cache** dữ liệu ít đổi từ downstream.\n' +
    '- **CQRS read model**: dựng sẵn view, không gọi chuỗi lúc request.\n' +
    '- Timeout + circuit breaker + fallback ở mỗi chặng.',
  essence:
    'Mỗi hop đồng bộ thêm latency và nhân xác suất lỗi. Kiến trúc tốt có **chuỗi call nông** — phần lớn "làm việc" xảy ra bất đồng bộ hoặc từ dữ liệu đã dựng sẵn.',
  example:
    'Trang home gọi `feed`→`ranking`→`profile`→`ads` tuần tự = 400ms + hay lỗi. Sửa: `feed-service` giữ read model đã gộp sẵn (cập nhật qua event), trang home gọi 1 lần = 30ms. Ads gọi song song, có fallback "không hiện ads" nếu lỗi.',
},
{
  cat: 'Giao tiếp',
  q: 'gRPC deadline/timeout propagation trong chuỗi call?',
  answer:
    'gRPC có khái niệm **deadline** (không phải timeout cục bộ): client đặt "request này phải xong trước thời điểm T". Deadline được **truyền tự động** qua metadata xuống các call con.\n\n' +
    'Mỗi service khi gọi tiếp: deadline còn lại = T − now. Nếu đã hết → không gọi nữa, trả `DEADLINE_EXCEEDED` ngay (fail fast, không lãng phí tài nguyên downstream).\n\n' +
    'Với REST: phải tự làm — truyền header `X-Deadline` hoặc `timeout budget`, mỗi service trừ đi thời gian đã dùng.',
  essence:
    'Deadline propagation biến "mỗi service một timeout tuỳ hứng" thành "cả chuỗi cùng một hạn chót". Downstream không làm việc cho một request mà client đã bỏ cuộc.',
  example:
    'Client đặt deadline 500ms. A dùng 200ms rồi gọi B với deadline còn 300ms. B dùng 280ms, gọi C với deadline còn 20ms → C thấy "không đủ thời gian" → trả `DEADLINE_EXCEEDED` ngay thay vì chạy query 100ms vô ích.',
},
{
  cat: 'Giao tiếp',
  q: 'Webhook giữa các service / với bên thứ ba — thiết kế đáng tin?',
  answer:
    'Webhook = provider gọi HTTP tới URL do consumer đăng ký khi có sự kiện. Vấn đề: consumer có thể down, chậm, trả lỗi.\n\n' +
    'Thiết kế:\n' +
    '- **Retry với backoff** (vài giờ tới vài ngày), rồi **disable endpoint** + alert nếu fail liên tục.\n' +
    '- **Ký payload** (HMAC signature header) để consumer verify nguồn gốc.\n' +
    '- **Idempotency**: gửi `event-id`, consumer dedup (webhook có thể trùng).\n' +
    '- **Không đảm bảo thứ tự** → consumer đính kèm timestamp/version.\n' +
    '- Cho consumer một **endpoint xem lịch sử + replay** webhook đã miss.\n' +
    '- Bên nhận nên **nhận nhanh (ghi vào queue) rồi xử lý sau**, không xử lý nặng trong handler.',
  essence:
    'Webhook là "push HTTP không đảm bảo". Coi nó như at-least-once, không thứ tự: consumer phải idempotent, có dedup, và tự lấy lại được cái đã miss.',
  example:
    'GitHub webhook `push` event: ký HMAC-SHA256, gửi `X-GitHub-Delivery` (id để dedup), retry vài lần. Consumer verify chữ ký → đẩy vào SQS → trả 200 ngay → worker xử lý build. Có UI xem "recent deliveries" + nút redeliver.',
},
{
  cat: 'Event-driven',
  q: 'Request/reply qua message broker — khi nào và làm thế nào?',
  answer:
    'Đôi khi cần "gửi yêu cầu qua queue nhưng vẫn chờ kết quả" (để có buffer, load leveling, không cần service kia có endpoint HTTP).\n\n' +
    'Cách làm:\n' +
    '- Producer gửi message tới `request-queue` kèm `correlationId` và `replyTo` (tên queue trả lời).\n' +
    '- Consumer xử lý, gửi response tới `replyTo` queue với cùng `correlationId`.\n' +
    '- Producer chờ trên `replyTo` queue, khớp `correlationId`, có **timeout**.\n\n' +
    'RabbitMQ hỗ trợ sẵn (Direct Reply-To). Kafka thì bất tiện hơn (cần reply topic + partition).',
  essence:
    'Request/reply qua broker cho bạn buffering và load leveling của async, với ngữ nghĩa đồng bộ của caller. Nhưng caller vẫn bị chặn + cần timeout → cân nhắc có thực sự cần chờ không.',
  example:
    'Service tính toán nặng (render báo cáo): API nhận request → gửi vào RabbitMQ `report-requests` → worker pool xử lý → gửi kết quả về `reply-<id>`. API chờ tối đa 30s; nếu quá thì trả `202 Accepted` + link poll kết quả.',
},
{
  cat: 'Giao tiếp',
  q: 'GraphQL Federation cho microservices?',
  answer:
    'Mỗi service expose một **subgraph** GraphQL (phần schema nó sở hữu, với `@key` cho entity). Một **gateway** (Apollo Router) hợp nhất thành một **supergraph** duy nhất.\n\n' +
    'Client gửi một query GraphQL tới gateway; gateway lập kế hoạch, gọi các subgraph cần thiết, resolve `@key` để nối entity xuyên service, gộp kết quả.\n\n' +
    'Ưu: client có một endpoint, tự chọn field, không over/under-fetch; mỗi team sở hữu phần schema của mình.\n' +
    'Nhược: gateway phức tạp, khó cache/rate-limit theo field, N+1 giữa subgraph nếu không cẩn thận, cần kỷ luật schema.',
  essence:
    'Federation là "API composition được chuẩn hoá qua GraphQL": mỗi service góp một phần schema, gateway tự nối. Mạnh cho client đa dạng, nhưng thêm một tầng thông minh cần vận hành.',
  example:
    '`Product` do catalog-service sở hữu (`@key(fields: "id")`); `Review` do review-service sở hữu và `extend type Product { reviews: [Review] }`. Client query `{ product(id:1) { name reviews { rating } } }` → gateway gọi catalog rồi review, nối theo `id`.',
},
{
  cat: 'Dữ liệu',
  q: 'Inbox pattern (bổ sung cho Outbox) — khử trùng lặp phía consumer?',
  answer:
    'Outbox đảm bảo event được **publish** đáng tin (at-least-once). Consumer có thể nhận **trùng** (redelivery, rebalance).\n\n' +
    '**Inbox pattern**: consumer lưu id các message đã xử lý vào bảng `inbox` (hoặc `processed_events`), trong **cùng transaction** với side-effect nghiệp vụ.\n' +
    '- Nhận message → kiểm tra `messageId` đã có trong `inbox` chưa.\n' +
    '- Chưa → xử lý + INSERT vào `inbox` (cùng transaction).\n' +
    '- Đã có → bỏ qua (đã xử lý).\n\n' +
    'Kết hợp Outbox (producer) + Inbox (consumer) → hiệu ứng **exactly-once** cho pipeline event-driven.',
  essence:
    'Outbox lo "không mất event". Inbox lo "không xử lý trùng". Điểm mấu chốt của inbox: ghi id đã xử lý và làm side-effect phải **nguyên tử** với nhau.',
  example:
    '`inventory-service` nhận `OrderPlaced` (có `eventId`): `INSERT INTO inbox(event_id) VALUES(?) ON CONFLICT DO NOTHING` — nếu insert được thì trừ kho; nếu 0 dòng thì event này đã xử lý, skip. Cả hai trong một transaction DB.',
},
{
  cat: 'Giao tiếp',
  q: 'Service-to-service authentication — xác thực giữa các service?',
  answer:
    'Service gọi service cũng cần chứng minh danh tính, không chỉ user.\n\n' +
    '- **mTLS**: mỗi service có cert; hai bên verify cert của nhau. Thường do **service mesh** (Istio) tự động cấp/xoay cert.\n' +
    '- **OAuth2 Client Credentials**: service lấy access token từ authorization server bằng `client_id/secret`, đính kèm vào call.\n' +
    '- **Signed JWT** với short TTL, service downstream verify chữ ký.\n\n' +
    '**Token propagation cho user context**: khi service A (thay mặt user) gọi B, truyền tiếp token của user (hoặc token exchange) để B biết cả "service nào gọi" và "user nào".',
  essence:
    'Zero-trust: không tin request chỉ vì nó đến từ mạng nội bộ. Mỗi call service-to-service phải có danh tính xác thực được (mTLS hoặc token), và mang theo user context nếu cần phân quyền theo user.',
  example:
    'Service mesh Istio: `order-service` gọi `payment-service` qua mTLS tự động (Istio inject cert). Đồng thời `order-service` truyền tiếp JWT của user trong header `Authorization` để `payment-service` kiểm tra "user này có quyền thanh toán đơn này không".',
},
]);
