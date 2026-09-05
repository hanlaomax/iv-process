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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Đồng bộ (REST/gRPC)', 'Bất đồng bộ (message/event)'],
    rows: [
      ['Caller', 'chờ kết quả', 'phát rồi đi tiếp'],
      ['Dùng cho', 'cần dữ liệu ngay để làm tiếp — truy vấn', 'thông báo "đã có việc xảy ra" — thay đổi state'],
      ['Coupling', 'temporal: callee phải sống & nhanh', 'tách rời vòng đời (broker buffer)'],
      ['Nhược', 'lỗi lan theo chuỗi', 'eventual consistency, khó theo dõi luồng, cần idempotency'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai mô hình, hai kiểu phụ thuộc",
      code:
        "// ĐỒNG BỘ (HTTP/gRPC): gọi và CHỜ phản hồi\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    public Order place(CreateOrder req) {\n" +
        "        PaymentResult p = paymentClient.charge(req);   // CHỜ ở đây\n" +
        "        if (!p.success()) throw new PaymentFailedException();\n" +
        "        return orderRepo.save(new Order(req, p));\n" +
        "    }\n" +
        "}\n" +
        "// + đơn giản, dễ suy luận, biết NGAY kết quả\n" +
        "// - PHỤ THUỘC THỜI GIAN CHẠY: payment chết -> order chết theo\n" +
        "// - độ khả dụng NHÂN LÊN: 99,9% x 99,9% x 99,9% = 99,7%\n" +
        "// - độ trễ CỘNG DỒN qua từng tầng\n" +
        "\n" +
        "// BẤT ĐỒNG BỘ (message/event): gửi rồi tiếp tục\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    @Transactional\n" +
        "    public Order place(CreateOrder req) {\n" +
        "        Order o = orderRepo.save(new Order(req, Status.PENDING));\n" +
        "        outbox.save(new OrderPlaced(o.id(), o.total()));   // payment sẽ xử lý sau\n" +
        "        return o;                                          // trả về NGAY\n" +
        "    }\n" +
        "}\n" +
        "// + tách rời hoàn toàn: payment chết thì message nằm chờ, không mất\n" +
        "// + chịu tải đột biến nhờ hàng đợi; thêm consumer mới không sửa producer\n" +
        "// - phức tạp hơn: nhất quán cuối cùng, phải idempotent, khó gỡ rối\n" +
        "// - người dùng không biết kết quả ngay -> cần cơ chế thông báo trạng thái\n" +
        "\n" +
        "// CHỌN:\n" +
        "//  ĐỒNG BỘ khi: cần kết quả NGAY để quyết định bước tiếp (kiểm tra tồn kho\n" +
        "//    trước khi cho đặt hàng), truy vấn đọc, thao tác của người dùng cần phản hồi.\n" +
        "//  BẤT ĐỒNG BỘ khi: thông báo việc đã xảy ra, việc chạy nền (gửi mail,\n" +
        "//    xuất báo cáo), fanout nhiều bên quan tâm, hoặc downstream hay chậm.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Tiêu chí',
    cols: ['REST / JSON', 'gRPC'],
    rows: [
      ['Giao thức', 'HTTP/1.1, text', 'HTTP/2, binary (Protobuf)'],
      ['Contract', 'OpenAPI (tuỳ chọn)', '.proto bắt buộc, sinh code'],
      ['Hiệu năng', 'chậm hơn, payload lớn', 'nhanh, nhỏ, multiplexing'],
      ['Streaming', 'hạn chế (SSE)', 'client/server/bi-directional'],
      ['Trình duyệt / debug', 'native, curl đọc được', 'cần grpc-web + proxy, grpcurl'],
      ['Hợp với', 'public API, client, webhook, đối tác', 'service-to-service nội bộ'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hợp đồng .proto và code sinh ra",
      code:
        "// gRPC: hợp đồng là file .proto, code client/server được SINH RA\n" +
        "//   service OrderService {\n" +
        "//     rpc GetOrder (GetOrderRequest) returns (Order);\n" +
        "//     rpc StreamOrders (StreamRequest) returns (stream Order);   // streaming\n" +
        "//   }\n" +
        "//   message Order { string id = 1; double total = 2; Status status = 3; }\n" +
        "@GrpcService\n" +
        "public class OrderGrpcService extends OrderServiceGrpc.OrderServiceImplBase {\n" +
        "    @Override\n" +
        "    public void getOrder(GetOrderRequest req, StreamObserver<Order> obs) {\n" +
        "        obs.onNext(toProto(repo.findById(req.getId()).orElseThrow()));\n" +
        "        obs.onCompleted();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// REST: hợp đồng là OpenAPI (hoặc không có gì, tệ hơn)\n" +
        "@RestController\n" +
        "class OrderController {\n" +
        "    @GetMapping(\"/orders/{id}\")\n" +
        "    Order get(@PathVariable String id) { return service.find(id); }\n" +
        "}\n" +
        "\n" +
        "// gRPC MẠNH HƠN Ở:\n" +
        "//  - Protobuf nhị phân: nhỏ hơn JSON 3-10 lần, mã hoá/giải mã nhanh hơn\n" +
        "//  - HTTP/2: multiplexing nhiều request trên một kết nối, không head-of-line blocking\n" +
        "//  - STREAMING hai chiều\n" +
        "//  - hợp đồng BẮT BUỘC, sinh code cho mọi ngôn ngữ -> không lệch kiểu\n" +
        "//  - deadline propagation sẵn có\n" +
        "\n" +
        "// REST MẠNH HƠN Ở:\n" +
        "//  - trình duyệt gọi trực tiếp (gRPC-Web cần proxy)\n" +
        "//  - debug bằng curl, đọc bằng mắt\n" +
        "//  - cache HTTP, gateway, firewall hiểu được\n" +
        "//  - mọi công cụ đều hỗ trợ\n" +
        "\n" +
        "// CHỌN: gRPC cho giao tiếp NỘI BỘ giữa service (độ trễ, throughput).\n" +
        "// REST cho API CÔNG KHAI và cho frontend.\n" +
        "// Rất nhiều hệ thống dùng cả hai: REST ở biên, gRPC bên trong.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Tiêu chí',
    cols: ['Kafka', 'RabbitMQ', 'SQS + SNS'],
    rows: [
      ['Mô hình', 'log phân tán, replay được', 'broker + routing (exchange/binding)', 'managed queue + pub/sub'],
      ['Throughput', 'cực cao', 'vừa', 'vừa'],
      ['Lưu trữ / replay', 'có (retention)', 'không', 'không'],
      ['Ordering', 'per-partition', 'per-queue', 'SQS FIFO (MessageGroupId)'],
      ['Vận hành', 'nặng (hoặc managed)', 'trung bình', 'không phải vận hành gì'],
      ['Hợp với', 'event streaming, event sourcing, pipeline', 'task queue, RPC, workflow', 'đủ dùng trong AWS'],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Ba loại broker cho ba nhu cầu",
      code:
        "# KAFKA — log phân tán, giữ lại và phát lại được\n" +
        "spring:\n" +
        "  kafka:\n" +
        "    bootstrap-servers: kafka:9092\n" +
        "    producer: { acks: all, properties: { enable.idempotence: true } }\n" +
        "    consumer: { group-id: billing, auto-offset-reset: earliest }\n" +
        "# + throughput RẤT cao, giữ dữ liệu lâu, PHÁT LẠI được, nhiều consumer group\n" +
        "# + thứ tự trong partition, hệ sinh thái xử lý luồng\n" +
        "# - không có routing phức tạp, không ưu tiên, không xoá lẻ message\n" +
        "# -> Dùng cho: event streaming, event sourcing, tích hợp dữ liệu, CDC\n" +
        "\n" +
        "# RABBITMQ — message broker truyền thống, routing mạnh\n" +
        "spring:\n" +
        "  rabbitmq:\n" +
        "    host: rabbitmq\n" +
        "    listener: { simple: { prefetch: 10, retry: { enabled: true } } }\n" +
        "# + routing linh hoạt (direct, topic, fanout, headers), ưu tiên, TTL từng message\n" +
        "# + delayed message, dead letter exchange sẵn có\n" +
        "# - throughput thấp hơn Kafka, message BỊ XOÁ sau khi ack (không phát lại)\n" +
        "# -> Dùng cho: hàng đợi công việc, RPC bất đồng bộ, định tuyến phức tạp\n" +
        "\n" +
        "# SQS/SNS — managed hoàn toàn trên AWS\n" +
        "# + không phải vận hành gì, tự scale, tích hợp IAM/Lambda\n" +
        "# + SQS FIFO có thứ tự và khử trùng; SNS fanout\n" +
        "# - retention tối đa 14 ngày, không phát lại, throughput FIFO giới hạn\n" +
        "# -> Dùng cho: đã ở AWS, đội nhỏ, tải vừa",
    },
    {
      lang: "bash",
      title: "Câu hỏi để chọn",
      code:
        "# 1) Có cần PHÁT LẠI lịch sử không?           -> có thì KAFKA\n" +
        "# 2) Có cần routing/ưu tiên/TTL từng message? -> có thì RABBITMQ\n" +
        "# 3) Throughput bao nhiêu?                     -> trên ~100k msg/s thì KAFKA\n" +
        "# 4) Đội có vận hành nổi không?                -> không thì SQS/SNS hoặc managed\n" +
        "# 5) Nhiều consumer group độc lập đọc cùng dữ liệu? -> KAFKA\n" +
        "# 6) Cần delay/schedule message?               -> RABBITMQ hoặc SQS\n" +
        "\n" +
        "# SAI LẦM HAY GẶP: dùng Kafka làm hàng đợi công việc đơn giản (không cần\n" +
        "# phát lại, cần ưu tiên và retry từng message) -> phải tự viết rất nhiều\n" +
        "# thứ mà RabbitMQ/SQS đã có sẵn.",
    },
  ],
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
  viz: {
    type: 'layers',
    title: 'Event mang bao nhiêu thông tin',
    dir: 'up',
    layers: [
      { name: 'Event notification', tag: 'id + loại', note: 'consumer phải gọi lại provider lấy chi tiết — nhẹ nhưng tăng coupling đồng bộ' },
      { name: 'Event-carried state transfer', tag: 'đủ dữ liệu', note: 'consumer không cần gọi lại — tách rời hơn, event lớn, lưu bản sao. Điểm cân bằng phổ biến' },
      { name: 'Event sourcing', tag: 'toàn bộ lịch sử', note: 'mọi thay đổi state là chuỗi event = nguồn sự thật; state hiện tại = replay' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba kiểu event, ba mức dữ liệu mang theo",
      code:
        "// 1) EVENT NOTIFICATION — chỉ báo \"có chuyện xảy ra\", mang ID\n" +
        "public record OrderPlaced(String orderId, Instant at) { }\n" +
        "// Consumer phải GỌI NGƯỢC để lấy chi tiết:\n" +
        "@KafkaListener(topics = \"order-placed\")\n" +
        "public void on(OrderPlaced e) {\n" +
        "    Order o = orderClient.get(e.orderId());   // gọi ngược -> vẫn còn phụ thuộc\n" +
        "    ship(o);\n" +
        "}\n" +
        "// + event nhỏ, không lộ nội bộ, không lo dữ liệu cũ\n" +
        "// - vẫn phụ thuộc thời gian chạy vào producer; N event = N lời gọi ngược\n" +
        "\n" +
        "// 2) EVENT-CARRIED STATE TRANSFER — mang theo ĐỦ dữ liệu để xử lý\n" +
        "public record OrderPlaced(String orderId, String customerId, Address shipTo,\n" +
        "                          List<Item> items, BigDecimal total, Instant at) { }\n" +
        "@KafkaListener(topics = \"order-placed\")\n" +
        "public void on(OrderPlaced e) {\n" +
        "    ship(e.shipTo(), e.items());              // KHÔNG gọi ngược\n" +
        "}\n" +
        "// + tách rời hoàn toàn: producer chết, consumer vẫn xử lý được\n" +
        "// + consumer có thể dựng bản sao dữ liệu cục bộ (read model)\n" +
        "// - event to hơn, và có nguy cơ lộ mô hình nội bộ ra ngoài\n" +
        "// - dữ liệu trong event là ẢNH CHỤP tại thời điểm phát -> có thể đã cũ\n" +
        "\n" +
        "// 3) EVENT SOURCING — event LÀ nguồn sự thật, trạng thái được TÍNH RA\n" +
        "//   OrderCreated -> ItemAdded -> ItemAdded -> OrderPaid -> OrderShipped\n" +
        "public Order rebuild(List<DomainEvent> events) {\n" +
        "    Order o = new Order();\n" +
        "    events.forEach(o::apply);                 // phát lại toàn bộ lịch sử\n" +
        "    return o;\n" +
        "}\n" +
        "// + lịch sử đầy đủ, audit hoàn hảo, quay lại trạng thái bất kỳ thời điểm nào\n" +
        "// - phức tạp cao: snapshot, tiến hoá schema event, truy vấn cần CQRS\n" +
        "\n" +
        "// THỰC TẾ: phần lớn hệ thống dùng (2) — cân bằng tốt nhất giữa tách rời\n" +
        "// và độ phức tạp. (3) chỉ dùng cho miền nghiệp vụ THỰC SỰ cần lịch sử\n" +
        "// (kế toán, giao dịch, kiểm toán).",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Choreography', 'Orchestration'],
    rows: [
      ['Điều khiển luồng', 'không có "nhạc trưởng" — mỗi service tự phản ứng event', 'một orchestrator (state machine) điều khiển từng bước'],
      ['Tách rời', 'cao — thêm consumer không sửa ai', 'thấp hơn — thêm một thành phần'],
      ['Quan sát luồng', 'khó — "đơn hàng kẹt ở đâu?"', 'tường minh ở một chỗ, dễ debug'],
      ['Hợp với', 'ít bước, tách rời quan trọng', 'nhiều bước, saga tiền bạc cần kiểm soát'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ai điều khiển luồng nghiệp vụ",
      code:
        "// CHOREOGRAPHY — không có nhạc trưởng; mỗi service nghe event và tự\n" +
        "// quyết định bước tiếp theo.\n" +
        "@KafkaListener(topics = \"order-placed\")\n" +
        "public class PaymentService {\n" +
        "    public void on(OrderPlaced e) {\n" +
        "        try {\n" +
        "            charge(e);\n" +
        "            publish(new PaymentSucceeded(e.orderId()));\n" +
        "        } catch (Exception ex) {\n" +
        "            publish(new PaymentFailed(e.orderId(), ex.getMessage()));\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "@KafkaListener(topics = \"payment-succeeded\")\n" +
        "public class ShippingService {\n" +
        "    public void on(PaymentSucceeded e) { schedule(e.orderId()); }\n" +
        "}\n" +
        "// + tách rời tối đa, thêm bước mới không sửa service cũ\n" +
        "// + không có điểm nghẽn trung tâm\n" +
        "// - LUỒNG NGHIỆP VỤ NẰM RẢI RÁC: không ai nhìn thấy toàn cảnh\n" +
        "// - dễ tạo vòng lặp event ngoài ý muốn\n" +
        "// - khó trả lời \"đơn hàng này đang ở bước nào\"\n" +
        "\n" +
        "// ORCHESTRATION — một service điều phối giữ toàn bộ luồng\n" +
        "@Service\n" +
        "public class OrderSaga {\n" +
        "    public void execute(String orderId) {\n" +
        "        SagaState s = sagaRepo.start(orderId);\n" +
        "        try {\n" +
        "            s.step(\"payment\",   () -> paymentClient.charge(orderId));\n" +
        "            s.step(\"inventory\", () -> inventoryClient.reserve(orderId));\n" +
        "            s.step(\"shipping\",  () -> shippingClient.schedule(orderId));\n" +
        "            s.complete();\n" +
        "        } catch (Exception e) {\n" +
        "            s.compensateAll();          // chạy ngược các bước đã xong\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "// + luồng TƯỜNG MINH ở một chỗ, dễ đọc, dễ giám sát, dễ gỡ rối\n" +
        "// + biết chính xác saga đang ở bước nào\n" +
        "// - orchestrator thành phụ thuộc chung; cần lưu TRẠNG THÁI bền\n" +
        "\n" +
        "// CHỌN: dưới 3-4 bước, luồng đơn giản -> CHOREOGRAPHY.\n" +
        "// Nhiều bước, cần nhìn thấy trạng thái, cần bù trừ phức tạp -> ORCHESTRATION\n" +
        "// (Temporal, Camunda, AWS Step Functions, hoặc tự viết trên state machine).",
    },
  ],
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
  viz: {
    type: 'sequence',
    title: 'Chuỗi local transaction + compensating transaction khi lỗi',
    actors: ['orchestrator', 'flight', 'hotel', 'payment'],
    messages: [
      { from: 0, to: 1, label: 'ReserveFlight → OK' },
      { from: 0, to: 2, label: 'ReserveHotel → OK' },
      { from: 0, to: 3, label: 'ChargePayment → FAIL (thẻ hết hạn)' },
      { from: 0, to: 2, label: 'compensation: CancelHotel (idempotent, retry tới cùng)' },
      { from: 0, to: 1, label: 'compensation: CancelFlight' },
      { from: 0, to: 0, label: 'đơn → FAILED; đặt bước không đảo ngược ở cuối' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chuỗi transaction cục bộ và bước quay lui",
      code:
        "// Mỗi bước là một transaction CỤC BỘ (commit ngay). Không có rollback toàn\n" +
        "// cục -> phải có HÀNH ĐỘNG BÙ TRỪ cho từng bước.\n" +
        "@Service\n" +
        "public class OrderSaga {\n" +
        "    private final List<SagaStep> steps = List.of(\n" +
        "        new SagaStep(\"payment\",\n" +
        "            id -> paymentClient.charge(id),        // hành động\n" +
        "            id -> paymentClient.refund(id)),       // BÙ TRỪ\n" +
        "        new SagaStep(\"inventory\",\n" +
        "            id -> inventoryClient.reserve(id),\n" +
        "            id -> inventoryClient.release(id)),\n" +
        "        new SagaStep(\"shipping\",\n" +
        "            id -> shippingClient.schedule(id),\n" +
        "            id -> shippingClient.cancel(id))\n" +
        "    );\n" +
        "\n" +
        "    public void run(String orderId) {\n" +
        "        List<SagaStep> done = new ArrayList<>();\n" +
        "        try {\n" +
        "            for (SagaStep s : steps) {\n" +
        "                s.action().accept(orderId);\n" +
        "                done.add(s);\n" +
        "                sagaRepo.markCompleted(orderId, s.name());   // LƯU BỀN tiến độ\n" +
        "            }\n" +
        "        } catch (Exception e) {\n" +
        "            // Bù trừ theo thứ tự NGƯỢC LẠI\n" +
        "            for (int i = done.size() - 1; i >= 0; i--) {\n" +
        "                try { done.get(i).compensation().accept(orderId); }\n" +
        "                catch (Exception ce) { alert.raise(orderId, done.get(i).name(), ce); }\n" +
        "            }\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// BỐN ĐIỀU BẮT BUỘC:\n" +
        "// 1) BÙ TRỪ PHẢI IDEMPOTENT — nó sẽ bị gọi lại khi retry.\n" +
        "// 2) BÙ TRỪ KHÔNG PHẢI LÀ ROLLBACK: tiền đã trừ rồi hoàn lại là HAI giao\n" +
        "//    dịch trong sổ sách, không phải xoá dấu vết. Nghiệp vụ phải chấp nhận điều đó.\n" +
        "// 3) TRẠNG THÁI SAGA phải lưu BỀN — tiến trình chết giữa chừng thì phải\n" +
        "//    tiếp tục được từ chỗ dở.\n" +
        "// 4) Có bước KHÔNG bù trừ được (email đã gửi) -> đặt nó ở CUỐI chuỗi.\n" +
        "\n" +
        "// Bù trừ cũng thất bại -> cần can thiệp thủ công. Phải có cảnh báo và\n" +
        "// công cụ vận hành cho tình huống này, đừng để nó im lặng.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Đừng ghi hai nơi cùng lúc — ghi một nơi nguyên tử, relay chuyển sau',
    nodes: ['Một local transaction: bản ghi nghiệp vụ + dòng outbox', 'Relay đọc outbox (polling / CDC Debezium)', 'Publish lên broker (at-least-once)', 'Đánh dấu đã gửi'],
    steps: [
      { to: 0, label: 'DB rollback → không có dòng outbox → không có event sai' },
      { to: 1, label: 'Tiến trình riêng đọc SELECT ... WHERE published=false, hoặc CDC đọc WAL/binlog' },
      { to: 2, label: 'Consumer xử lý idempotent' },
      { to: 3, label: 'Còn một thao tác ghi nguyên tử duy nhất (vào DB)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một transaction database, không có dual-write",
      code:
        "// VẤN ĐỀ: ghi DB rồi publish Kafka là HAI hệ thống -> luôn có khe hở.\n" +
        "@Transactional\n" +
        "public void placeOrderBad(Order o) {\n" +
        "    orderRepo.save(o);\n" +
        "    kafka.send(\"orders\", toJson(o));   // Kafka chết -> DB có đơn, không ai biết\n" +
        "}\n" +
        "\n" +
        "// GIẢI PHÁP: ghi event vào BẢNG OUTBOX trong CÙNG transaction\n" +
        "@Transactional\n" +
        "public void placeOrder(Order o) {\n" +
        "    orderRepo.save(o);\n" +
        "    outboxRepo.save(OutboxEvent.builder()\n" +
        "        .id(UUID.randomUUID())\n" +
        "        .aggregateType(\"Order\")\n" +
        "        .aggregateId(o.id())          // dùng làm message key -> giữ thứ tự\n" +
        "        .eventType(\"OrderPlaced\")\n" +
        "        .payload(toJson(o))\n" +
        "        .build());\n" +
        "}   // hai bản ghi cùng commit hoặc cùng rollback — DB lo tính nguyên tử",
    },
    {
      lang: "sql",
      title: "Bảng outbox và tiến trình đẩy",
      code:
        "CREATE TABLE outbox (\n" +
        "  id             UUID PRIMARY KEY,\n" +
        "  aggregate_type TEXT NOT NULL,\n" +
        "  aggregate_id   TEXT NOT NULL,\n" +
        "  event_type     TEXT NOT NULL,\n" +
        "  payload        JSONB NOT NULL,\n" +
        "  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),\n" +
        "  published_at   TIMESTAMPTZ\n" +
        ");\n" +
        "-- Index MỘT PHẦN: chỉ đánh index dòng chưa gửi -> luôn nhỏ và nhanh\n" +
        "CREATE INDEX idx_outbox_unpublished ON outbox (created_at) WHERE published_at IS NULL;\n" +
        "\n" +
        "-- Publisher lấy việc; SKIP LOCKED để nhiều instance không giành nhau\n" +
        "SELECT * FROM outbox WHERE published_at IS NULL\n" +
        "ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED;\n" +
        "\n" +
        "-- Dọn định kỳ, nếu không bảng phình vô hạn\n" +
        "DELETE FROM outbox WHERE published_at < now() - INTERVAL \u00277 days\u0027;\n" +
        "\n" +
        "-- ĐẢM BẢO ĐẠT ĐƯỢC: AT-LEAST-ONCE. Publisher có thể gửi rồi chết trước khi\n" +
        "-- đánh dấu -> gửi trùng. Consumer BẮT BUỘC phải idempotent.\n" +
        "-- Nhưng KHÔNG BAO GIỜ MẤT event — đó là điều quan trọng nhất.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['API Composition', 'CQRS read model'],
    rows: [
      ['Khi nào ghép dữ liệu', 'lúc chạy — composer gọi từng service', 'dựng sẵn — service nghe event, build materialized view'],
      ['Latency', 'tổng/max các call', 'query một chỗ, nhanh'],
      ['Độ tin cậy', 'phụ thuộc tất cả service sống', 'chịu lỗi tốt'],
      ['Cái giá', 'N+1 nếu gọi lặp', 'eventual consistency + maintain projection'],
      ['Hợp với', 'query ít gặp, view linh hoạt', 'query nóng, cần latency thấp'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Gộp dữ liệu ở tầng trên, song song và có timeout",
      code:
        "@Service\n" +
        "public class OrderDetailsComposer {\n" +
        "    public OrderDetails get(String orderId) {\n" +
        "        // Gọi SONG SONG, không tuần tự — độ trễ là MAX chứ không phải TỔNG\n" +
        "        var orderF     = supplyAsync(() -> orderClient.get(orderId), pool);\n" +
        "        var paymentF   = supplyAsync(() -> paymentClient.getByOrder(orderId), pool);\n" +
        "        var shipmentF  = supplyAsync(() -> shippingClient.getByOrder(orderId), pool);\n" +
        "\n" +
        "        Order order = orderF.orTimeout(500, MILLISECONDS).join();   // BẮT BUỘC\n" +
        "\n" +
        "        // Dữ liệu PHỤ: lỗi thì trả về phần thiếu, đừng làm hỏng cả response\n" +
        "        Payment payment = paymentF.orTimeout(300, MILLISECONDS)\n" +
        "                .exceptionally(e -> { log.warn(\"payment lỗi\", e); return null; })\n" +
        "                .join();\n" +
        "        Shipment shipment = shipmentF.orTimeout(300, MILLISECONDS)\n" +
        "                .exceptionally(e -> null).join();\n" +
        "\n" +
        "        return new OrderDetails(order, payment, shipment);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// HẠN CHẾ CỦA API COMPOSITION:\n" +
        "// 1) Độ trễ = downstream CHẬM NHẤT; độ khả dụng là TÍCH của các service.\n" +
        "// 2) Không LỌC/SẮP XẾP/PHÂN TRANG xuyên service được. \"Danh sách đơn của\n" +
        "//    khách VIP, sắp theo tổng tiền\" là bài toán không giải được bằng cách này\n" +
        "//    -> phải dùng CQRS: dựng sẵn read model tổng hợp từ event.\n" +
        "// 3) Có thể tạo N+1 khi gộp danh sách -> dùng API lấy theo LÔ:\n" +
        "//    paymentClient.getByOrderIds(List.of(...))   thay vì gọi từng cái.\n" +
        "\n" +
        "// KHI NÀO ĐỦ DÙNG: dữ liệu ít, truy vấn theo ID, và số downstream nhỏ (2-4).\n" +
        "// Vượt quá đó -> CQRS read model.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'API riêng cho từng trải nghiệm',
    root: {
      label: 'Một backend riêng cho mỗi loại frontend',
      children: [
        { label: 'mobile-bff', note: 'payload nhỏ, ít call — tiết kiệm pin/data' },
        { label: 'web-bff', note: 'payload lớn, đầy đủ thông tin' },
        { label: 'Giảm round-trip', note: 'một call BFF thay vì 5 call service' },
        { label: 'Che giấu cấu trúc microservices', note: 'đổi service bên trong không ảnh hưởng client' },
        { label: 'Team frontend sở hữu', note: 'đổi UI + API cùng nhịp; đổi lại: trùng lặp logic giữa BFF' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Mỗi loại client một backend riêng",
      code:
        "// VẤN ĐỀ: một API chung phục vụ web, mobile và smart TV -> hoặc trả thừa\n" +
        "// dữ liệu (mobile tốn băng thông), hoặc client phải gọi 5 lần để ghép màn hình.\n" +
        "\n" +
        "// BFF: mỗi loại client có một backend riêng, do CHÍNH đội frontend đó sở hữu.\n" +
        "@RestController\n" +
        "@RequestMapping(\"/mobile/v1\")\n" +
        "public class MobileBff {\n" +
        "    @GetMapping(\"/home\")\n" +
        "    HomeScreen home(@AuthenticationPrincipal User u) {\n" +
        "        // Gộp đúng những gì MÀN HÌNH cần, trong MỘT request\n" +
        "        var orders  = supplyAsync(() -> orderClient.recent(u.id(), 5));\n" +
        "        var promos  = supplyAsync(() -> promoClient.forUser(u.id()));\n" +
        "        var profile = supplyAsync(() -> userClient.summary(u.id()));\n" +
        "        return new HomeScreen(\n" +
        "            profile.join(),\n" +
        "            orders.join().stream().map(this::toCompactDto).toList(),  // rút gọn\n" +
        "            promos.join());\n" +
        "    }\n" +
        "    // DTO cho mobile: chỉ 5 field thay vì 40 -> tiết kiệm băng thông\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH:\n" +
        "//  - giảm số round-trip (quan trọng với mạng di động)\n" +
        "//  - payload vừa đúng nhu cầu từng client\n" +
        "//  - đội frontend TỰ chủ động thay đổi BFF, không phải chờ đội backend\n" +
        "//  - logic riêng cho từng nền tảng nằm ở BFF, không làm bẩn service lõi\n" +
        "\n" +
        "// CẠM BẪY:\n" +
        "//  1) BFF phình thành nơi chứa LOGIC NGHIỆP VỤ -> nó chỉ nên gộp và biến\n" +
        "//     đổi dữ liệu, không quyết định nghiệp vụ.\n" +
        "//  2) Trùng lặp code giữa các BFF -> tách phần chung thành thư viện.\n" +
        "//  3) Quá nhiều BFF (mỗi màn hình một cái) -> chi phí vận hành.\n" +
        "\n" +
        "// GraphQL là một lựa chọn thay thế: client tự chọn field cần, không cần\n" +
        "// nhiều BFF. Đổi lại: phức tạp hơn về caching, phân quyền và giới hạn truy vấn.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Làm cho "gửi lại request giống hệt" trở nên vô hại',
    nodes: ['Request + Idempotency-Key: <uuid>', 'Tra key trong store (Redis/DB, có TTL)', 'Chưa thấy → xử lý + lưu key + kết quả', 'Thấy & đã xong → trả lại kết quả cũ', 'Thấy & đang xử lý → 409 (retry sau)'],
    steps: [
      { to: 1, label: 'Cho request không an toàn: POST tạo tài nguyên, thanh toán' },
      { to: 2, label: 'Lưu status + body cùng key' },
      { to: 3, label: 'Không xử lý lại — chống double-click, timeout retry, at-least-once redelivery' },
      { to: 4, label: 'Client retry sau vài giây' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cùng một key, cùng một kết quả",
      code:
        "// Client sinh key cho mỗi Ý ĐỊNH và giữ nguyên khi retry.\n" +
        "@PostMapping(\"/payments\")\n" +
        "public ResponseEntity<PaymentResult> pay(\n" +
        "        @RequestHeader(\"Idempotency-Key\") @NotBlank String key,\n" +
        "        @Valid @RequestBody PaymentRequest req) {\n" +
        "\n" +
        "    // 1) GIÀNH CHỖ nguyên tử — chống cả hai request đồng thời\n" +
        "    boolean acquired = idempotencyRepo.tryInsert(key, hash(req), Duration.ofHours(24));\n" +
        "\n" +
        "    if (!acquired) {\n" +
        "        var existing = idempotencyRepo.find(key);\n" +
        "        // 2) Cùng key nhưng payload KHÁC -> client dùng sai key\n" +
        "        if (!existing.requestHash().equals(hash(req)))\n" +
        "            return ResponseEntity.unprocessableEntity().build();      // 422\n" +
        "        // 3) Đang xử lý -> bảo client thử lại, KHÔNG xử lý song song\n" +
        "        if (existing.isInProgress())\n" +
        "            return ResponseEntity.status(409).header(\"Retry-After\", \"2\").build();\n" +
        "        // 4) Đã xong -> trả về ĐÚNG kết quả cũ\n" +
        "        return ResponseEntity.ok(existing.response());\n" +
        "    }\n" +
        "\n" +
        "    try {\n" +
        "        PaymentResult result = paymentService.charge(req);\n" +
        "        idempotencyRepo.complete(key, result);\n" +
        "        return ResponseEntity.ok(result);\n" +
        "    } catch (Exception e) {\n" +
        "        idempotencyRepo.remove(key);       // thất bại -> cho phép thử lại\n" +
        "        throw e;\n" +
        "    }\n" +
        "}\n" +
        "// LƯU KHOÁ Ở ĐÂU: với giao dịch tiền bạc, lưu trong DATABASE và trong\n" +
        "// CÙNG transaction với nghiệp vụ. Redis chỉ nên là lớp chặn nhanh phía trước.\n" +
        "// TTL 24-48 giờ là đủ cho mọi retry hợp lý.\n" +
        "// Đây là cách Stripe, PayPal và hầu hết cổng thanh toán làm.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Đừng ép ordering toàn cục — nhóm theo key thực thể',
    nodes: ['Partition/routing key = id thực thể', 'Mọi event cùng key → cùng partition', 'Consumer xử lý tuần tự trong partition', 'Vẫn lệch? version/sequence number trong event'],
    steps: [
      { to: 0, label: 'Kafka partition key = orderId; SQS FIFO MessageGroupId' },
      { to: 1, label: 'Thứ tự đảm bảo trong phạm vi một key' },
      { to: 2, label: 'Không dùng thread pool phá thứ tự' },
      { to: 3, label: 'Consumer bỏ qua event cũ hơn version đã thấy' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Thứ tự chỉ cần trong phạm vi một thực thể",
      code:
        "// KHÔNG BAO GIỜ có thứ tự toàn cục trong hệ phân tán. Nhưng thứ tự toàn\n" +
        "// cục cũng gần như không bao giờ cần — chỉ cần thứ tự CHO MỖI THỰC THỂ.\n" +
        "\n" +
        "// 1) DÙNG KEY để mọi message của một thực thể vào CÙNG partition\n" +
        "kafkaTemplate.send(\"order-events\", order.id(), event);   // key = orderId\n" +
        "\n" +
        "// 2) Phía consumer: một partition xử lý TUẦN TỰ. Muốn đa luồng thì\n" +
        "//    phân luồng THEO KEY, không phải theo message:\n" +
        "int slot = Math.abs(record.key().hashCode()) % workers.length;\n" +
        "workers[slot].submit(() -> process(record));\n" +
        "\n" +
        "// 3) KHÔNG dựa vào thứ tự khi có thể tránh — thiết kế event mang THỜI ĐIỂM\n" +
        "//    và SỐ PHIÊN BẢN để consumer tự xử lý message đến muộn:\n" +
        "public record OrderUpdated(String orderId, long version, Instant at, OrderData data) { }\n" +
        "\n" +
        "@KafkaListener(topics = \"order-updated\")\n" +
        "@Transactional\n" +
        "public void on(OrderUpdated e) {\n" +
        "    var current = repo.findById(e.orderId());\n" +
        "    if (current != null && current.version() >= e.version()) {\n" +
        "        return;      // message CŨ tới muộn -> BỎ QUA, không ghi đè dữ liệu mới\n" +
        "    }\n" +
        "    repo.upsert(e.orderId(), e.version(), e.data());\n" +
        "}\n" +
        "// Đây là cách bền vững nhất: hệ thống ĐÚNG kể cả khi thứ tự bị đảo.\n" +
        "\n" +
        "// NHỮNG THỨ PHÁ VỠ THỨ TỰ (phải biết):\n" +
        "//  - retry: message lỗi được đẩy sang retry topic -> nó tới SAU message kế tiếp\n" +
        "//  - tăng số partition -> ánh xạ key đổi -> lịch sử của một key nằm hai nơi\n" +
        "//  - nhiều consumer xử lý song song không phân luồng theo key\n" +
        "//  - DLQ và xử lý thủ công",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Tách "message độc" khỏi luồng chính để một record hỏng không nghẽn tất cả',
    nodes: ['Message fail', 'Retry queue có delay (5s → 1m → 10m)', 'Quá maxRetries', 'DLQ + metadata (lỗi, stack, offset gốc, số lần thử)', 'Alert + dashboard + replay sau khi sửa bug'],
    steps: [
      { to: 1, label: 'Lỗi tạm thời (downstream chập chờn) → thử lại sau delay' },
      { to: 2, label: 'Lỗi vĩnh viễn (schema sai, bug logic) vẫn fail' },
      { to: 3, label: 'Không retry vô hạn — không chặn queue/partition' },
      { to: 4, label: 'Không bao giờ "nuốt" message lỗi im lặng' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tách message xấu ra để không chặn cả hàng đợi",
      code:
        "// NGUYÊN TẮC: KHÔNG bao giờ để một message hỏng chặn partition/queue,\n" +
        "// và KHÔNG bao giờ vứt nó im lặng.\n" +
        "@RetryableTopic(\n" +
        "    attempts = \"4\",\n" +
        "    backoff = @Backoff(delay = 1000, multiplier = 4.0),     // 1s -> 4s -> 16s\n" +
        "    dltTopicSuffix = \"-dlt\",\n" +
        "    exclude = { DeserializationException.class,              // lỗi dữ liệu ->\n" +
        "                ValidationException.class })                 // vào thẳng DLT\n" +
        "@KafkaListener(topics = \"orders\")\n" +
        "public void handle(OrderEvent e) {\n" +
        "    process(e);        // lỗi tạm thời -> retry; lỗi vĩnh viễn -> DLT ngay\n" +
        "}\n" +
        "\n" +
        "@DltHandler\n" +
        "public void dlt(OrderEvent e,\n" +
        "                @Header(KafkaHeaders.ORIGINAL_TOPIC) String topic,\n" +
        "                @Header(KafkaHeaders.EXCEPTION_MESSAGE) String error) {\n" +
        "    log.error(\"vào DLQ: topic={} event={} lỗi={}\", topic, e, error);\n" +
        "    alertService.raise(\"dlq\", e.orderId(), error);    // PHẢI có cảnh báo\n" +
        "    dlqRepo.save(e, error);                           // lưu để còn phát lại\n" +
        "}\n" +
        "\n" +
        "// PHÂN BIỆT HAI LOẠI LỖI — đây là điểm quan trọng nhất:\n" +
        "//  TẠM THỜI (DB timeout, downstream 503, mạng)  -> retry có ý nghĩa\n" +
        "//  VĨNH VIỄN (JSON hỏng, thiếu field, vi phạm quy tắc) -> retry vô ích,\n" +
        "//    vào DLQ ngay để không đốt thời gian và không chặn message sau\n" +
        "\n" +
        "// DLQ CHỈ CÓ GIÁ TRỊ KHI:\n" +
        "//  1) có CẢNH BÁO khi có message vào (DLQ không ai xem = nơi dữ liệu đi chết)\n" +
        "//  2) giữ đủ NGỮ CẢNH: topic gốc, offset, exception, số lần thử, thời điểm\n" +
        "//  3) có CÔNG CỤ PHÁT LẠI sau khi sửa bug\n" +
        "//  4) có bảng theo dõi số lượng và xu hướng\n" +
        "\n" +
        "// CẢNH BÁO: retry topic PHÁ VỠ THỨ TỰ. Nghiệp vụ cần thứ tự tuyệt đối thì\n" +
        "// phải dừng hẳn partition và xử lý thủ công thay vì đẩy message ra sau.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Kiểm "hai phía hiểu nhau" mà không chạy cả hệ thống',
    nodes: ['Consumer viết test kỳ vọng', 'Sinh contract (file Pact)', 'Chia sẻ qua Pact Broker', 'Provider chạy verify: response thật thoả mọi contract', 'CI provider FAIL nếu thay đổi phá contract'],
    steps: [
      { to: 0, label: '"gọi GET /orders/1 thì nhận {id, status, total}"' },
      { to: 2, label: 'Artifact chung giữa hai phía' },
      { to: 3, label: 'Mỗi phía test độc lập trong CI của mình — nhanh' },
      { to: 4, label: 'Biết trước khi deploy, không chờ e2e giòn' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Consumer định nghĩa kỳ vọng, provider phải thoả mãn",
      code:
        "// VẤN ĐỀ: end-to-end test cần dựng cả hệ -> chậm, hay hỏng vặt, khó bảo trì.\n" +
        "// Unit test với mock thì nhanh, nhưng mock có thể KHÔNG GIỐNG thực tế.\n" +
        "// Contract test giải quyết đúng khoảng trống đó.\n" +
        "\n" +
        "// PHÍA CONSUMER: khai báo mình cần gì, sinh ra file hợp đồng\n" +
        "@ExtendWith(PactConsumerTestExt.class)\n" +
        "@PactTestFor(providerName = \"order-service\")\n" +
        "class OrderClientPactTest {\n" +
        "\n" +
        "    @Pact(consumer = \"shipping-service\")\n" +
        "    RequestResponsePact getOrder(PactDslWithProvider builder) {\n" +
        "        return builder\n" +
        "            .given(\"đơn hàng 123 tồn tại và đã thanh toán\")   // TRẠNG THÁI provider\n" +
        "            .uponReceiving(\"lấy chi tiết đơn 123\")\n" +
        "            .path(\"/orders/123\").method(\"GET\")\n" +
        "            .willRespondWith().status(200)\n" +
        "            .body(newJsonBody(o -> {\n" +
        "                o.stringType(\"id\", \"123\");\n" +
        "                o.stringMatcher(\"status\", \"NEW|PAID|SHIPPED\", \"PAID\");\n" +
        "                o.numberType(\"total\", 100.0);\n" +
        "            }).build())\n" +
        "            .toPact();\n" +
        "    }\n" +
        "\n" +
        "    @Test\n" +
        "    void test(MockServer mockServer) {\n" +
        "        var client = new OrderClient(mockServer.getUrl());\n" +
        "        assertThat(client.get(\"123\").status()).isEqualTo(\"PAID\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// PHÍA PROVIDER: chạy lại MỌI hợp đồng của mọi consumer\n" +
        "@Provider(\"order-service\")\n" +
        "@PactBroker(url = \"https://pact-broker.company.com\")\n" +
        "class OrderServiceContractTest {\n" +
        "    @State(\"đơn hàng 123 tồn tại và đã thanh toán\")\n" +
        "    void setup() { orderRepo.save(new Order(\"123\", \"PAID\", 100.0)); }\n" +
        "}\n" +
        "// -> Provider đổi API phá vỡ consumer thì CI ĐỎ NGAY, không phải chờ production.\n" +
        "\n" +
        "// CAN-I-DEPLOY: cổng kiểm tra trước khi deploy\n" +
        "//   pact-broker can-i-deploy --pacticipant order-service --version $SHA --to prod",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Loại',
    cols: ['Backward compatible', 'Forward compatible'],
    rows: [
      ['Nghĩa', 'consumer mới đọc được event cũ', 'consumer cũ đọc được event mới'],
      ['Quy tắc', 'chỉ thêm field optional/có default; không xoá/đổi kiểu/đổi nghĩa', 'consumer là tolerant reader — bỏ qua field lạ'],
      ['Công cụ', 'Schema Registry mode BACKWARD — chặn thay đổi phá vỡ tự động', 'kỷ luật code consumer'],
      ['Breaking không tránh được', 'phát OrderPlacedV2, chạy song song, migrate, bỏ V1', '—'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Quy tắc thay đổi event mà không phá consumer",
      code:
        "// Trong hệ event-driven, producer và consumer deploy ĐỘC LẬP và ở các phiên\n" +
        "// bản khác nhau -> schema event phải tiến hoá được.\n" +
        "\n" +
        "// THAY ĐỔI AN TOÀN:\n" +
        "public record OrderPlaced(\n" +
        "    String orderId,\n" +
        "    BigDecimal total,\n" +
        "    String currency,\n" +
        "    // THÊM field mới: PHẢI có giá trị mặc định / cho phép null\n" +
        "    @JsonProperty(defaultValue = \"0\") BigDecimal discount,\n" +
        "    @Nullable String couponCode\n" +
        ") { }\n" +
        "// Consumer cũ bỏ qua field lạ (Jackson: FAIL_ON_UNKNOWN_PROPERTIES = false)\n" +
        "// Consumer mới đọc event cũ vẫn có giá trị mặc định.\n" +
        "\n" +
        "// THAY ĐỔI PHÁ VỠ (phải tạo event/topic phiên bản mới):\n" +
        "//  - XOÁ hoặc ĐỔI TÊN field\n" +
        "//  - ĐỔI KIỂU (String -> Integer, hoặc đổi đơn vị tiền)\n" +
        "//  - làm field tuỳ chọn thành BẮT BUỘC\n" +
        "//  - đổi Ý NGHĨA của field (nguy hiểm nhất vì không công cụ nào phát hiện được)\n" +
        "\n" +
        "// SCHEMA REGISTRY thực thi quy tắc này tự động:\n" +
        "//   BACKWARD  — consumer mới đọc được dữ liệu cũ  (nâng cấp CONSUMER trước)\n" +
        "//   FORWARD   — consumer cũ đọc được dữ liệu mới  (nâng cấp PRODUCER trước)\n" +
        "//   FULL      — cả hai chiều\n" +
        "//   *_TRANSITIVE — kiểm tra với MỌI phiên bản trước, không chỉ liền kề\n" +
        "\n" +
        "// Với Avro, quy tắc vàng: field mới LUÔN có default\n" +
        "//   {\"name\": \"discount\", \"type\": [\"null\", \"double\"], \"default\": null}\n" +
        "\n" +
        "// Cấu hình consumer khoan dung:\n" +
        "//   spring.jackson.deserialization.fail-on-unknown-properties=false",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Kiến trúc tốt có chuỗi call nông',
    root: {
      label: 'Mỗi hop đồng bộ thêm latency và nhân xác suất lỗi',
      children: [
        { label: 'Latency cộng dồn', note: 'p99 tổng ≈ tổng p99 từng chặng' },
        { label: 'Availability nhân', note: '4 service × 99.9% → chuỗi ≈ 99.6%' },
        { label: 'Fault propagation', note: 'D chậm → C giữ conn → B hết thread → A timeout → cascading' },
        { label: 'Giảm', note: 'chuyển bước không-cần-ngay sang event; composition song song; cache; CQRS read model; timeout + circuit breaker + fallback' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Độ trễ cộng dồn, độ khả dụng nhân lên",
      code:
        "// A -> B -> C -> D, mỗi tầng 50ms và 99,9% khả dụng\n" +
        "//   độ trễ    = 50 + 50 + 50 + 50 = 200ms (chưa tính mạng)\n" +
        "//   khả dụng  = 0.999^4 = 99,6%  -> gấp 4 lần thời gian chết\n" +
        "// Và D chậm -> C chờ -> B chờ -> A chờ -> thread pool cạn từ dưới lên trên.\n" +
        "\n" +
        "// GIẢM CHUỖI — bốn cách, theo thứ tự hiệu quả:\n" +
        "\n" +
        "// 1) CHUYỂN SANG BẤT ĐỒNG BỘ những bước không cần kết quả ngay\n" +
        "@Transactional\n" +
        "public Order place(CreateOrder req) {\n" +
        "    Order o = repo.save(new Order(req, PENDING));\n" +
        "    outbox.save(new OrderPlaced(o.id()));     // payment/shipping xử lý sau\n" +
        "    return o;                                  // trả về ngay, chuỗi chỉ còn 1 tầng\n" +
        "}\n" +
        "\n" +
        "// 2) GỌI SONG SONG thay vì tuần tự -> độ trễ là MAX, không phải TỔNG\n" +
        "var a = supplyAsync(() -> serviceA.get(id), pool);\n" +
        "var b = supplyAsync(() -> serviceB.get(id), pool);\n" +
        "var result = a.thenCombine(b, Result::new).orTimeout(500, MILLISECONDS).join();\n" +
        "\n" +
        "// 3) NHÂN BẢN DỮ LIỆU cục bộ qua event -> không cần gọi nữa\n" +
        "//    shipping giữ bản sao địa chỉ khách hàng, cập nhật qua event.\n" +
        "\n" +
        "// 4) GỘP SERVICE: hai service luôn gọi nhau cho mọi request thì chúng\n" +
        "//    nên là MỘT service. Đây là dấu hiệu ranh giới sai.\n" +
        "\n" +
        "// BẮT BUỘC KHI VẪN CÒN CHUỖI ĐỒNG BỘ:\n" +
        "//  - TIMEOUT ở mọi tầng, và timeout GIẢM DẦN khi đi sâu (deadline propagation)\n" +
        "//  - circuit breaker để không chờ service đã chết\n" +
        "//  - bulkhead: thread pool riêng cho từng downstream",
    },
  ],
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
  viz: {
    type: 'sequence',
    title: 'Cả chuỗi cùng một hạn chót — không làm việc cho request đã bỏ cuộc',
    actors: ['client', 'A', 'B', 'C'],
    messages: [
      { from: 0, to: 1, label: 'deadline = 500ms (thời điểm T)' },
      { from: 1, to: 2, label: 'A dùng 200ms → gọi B, deadline còn 300ms' },
      { from: 2, to: 3, label: 'B dùng 280ms → gọi C, deadline còn 20ms' },
      { from: 3, to: 2, label: 'C: query cần 100ms > 20ms → DEADLINE_EXCEEDED ngay (fail fast)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hạn chót đi theo request, không phải timeout độc lập",
      code:
        "// TIMEOUT ĐỘC LẬP là sai: A đặt 1s, B đặt 1s, C đặt 1s -> A đã bỏ cuộc từ\n" +
        "// giây thứ nhất nhưng B và C vẫn đang làm việc vô ích, đốt tài nguyên.\n" +
        "\n" +
        "// DEADLINE là một MỐC THỜI GIAN TUYỆT ĐỐI, được truyền xuống toàn chuỗi.\n" +
        "// gRPC làm việc này SẴN qua metadata grpc-timeout:\n" +
        "OrderServiceGrpc.OrderServiceBlockingStub stub = OrderServiceGrpc\n" +
        "        .newBlockingStub(channel)\n" +
        "        .withDeadlineAfter(500, TimeUnit.MILLISECONDS);\n" +
        "Order order = stub.getOrder(req);\n" +
        "// Service B nhận được deadline CÒN LẠI (ví dụ 480ms) và khi gọi C, nó\n" +
        "// truyền tiếp phần còn lại (ví dụ 300ms). Hết hạn -> mọi tầng dừng NGAY.\n" +
        "\n" +
        "// Ở phía server, kiểm tra deadline trước khi làm việc nặng:\n" +
        "@Override\n" +
        "public void getOrder(GetOrderRequest req, StreamObserver<Order> obs) {\n" +
        "    if (Context.current().getDeadline() != null\n" +
        "            && Context.current().getDeadline().isExpired()) {\n" +
        "        obs.onError(Status.DEADLINE_EXCEEDED.asRuntimeException());\n" +
        "        return;    // caller đã bỏ cuộc -> đừng tốn công nữa\n" +
        "    }\n" +
        "    obs.onNext(load(req.getId()));\n" +
        "    obs.onCompleted();\n" +
        "}\n" +
        "\n" +
        "// VỚI HTTP/REST: không có sẵn, phải tự làm. Quy ước phổ biến là header\n" +
        "// X-Request-Deadline (epoch millis) hoặc X-Timeout-Ms còn lại:\n" +
        "long remaining = deadline - System.currentTimeMillis();\n" +
        "if (remaining <= 0) throw new DeadlineExceededException();\n" +
        "restClient.get().uri(url)\n" +
        "    .header(\"X-Timeout-Ms\", String.valueOf(remaining - 50))   // trừ dự phòng\n" +
        "    .retrieve();\n" +
        "\n" +
        "// TIMEOUT BUDGET: tổng ngân sách của request được chia cho các tầng, mỗi\n" +
        "// tầng giữ lại một phần dự phòng cho việc gộp kết quả và trả lời.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: '"Push HTTP không đảm bảo" — coi là at-least-once, không thứ tự',
    root: {
      label: 'Provider gọi HTTP tới URL consumer đăng ký khi có sự kiện',
      children: [
        { label: 'Retry với backoff', note: 'vài giờ tới vài ngày, rồi disable endpoint + alert nếu fail liên tục' },
        { label: 'Ký payload (HMAC header)', note: 'consumer verify nguồn gốc' },
        { label: 'Idempotency: gửi event-id', note: 'consumer dedup — webhook có thể trùng' },
        { label: 'Không đảm bảo thứ tự', note: 'consumer đính kèm timestamp/version' },
        { label: 'Nhận nhanh (ghi vào queue) rồi xử lý sau', note: 'không xử lý nặng trong handler; có endpoint xem lịch sử + replay' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Gửi và nhận webhook một cách đáng tin",
      code:
        "// PHÍA GỬI: retry có backoff, ký payload, và có DLQ\n" +
        "@Service\n" +
        "public class WebhookSender {\n" +
        "    @Retryable(maxAttempts = 5,\n" +
        "               backoff = @Backoff(delay = 1000, multiplier = 3, random = true))\n" +
        "    public void send(Webhook w) {\n" +
        "        String body = toJson(w.payload());\n" +
        "        String signature = hmacSha256(body, w.secret());     // KÝ payload\n" +
        "\n" +
        "        restClient.post().uri(w.url())\n" +
        "            .header(\"X-Signature\", \"sha256=\" + signature)\n" +
        "            .header(\"X-Event-Id\", w.eventId())               // để bên nhận dedup\n" +
        "            .header(\"X-Event-Type\", w.type())\n" +
        "            .header(\"X-Timestamp\", String.valueOf(now))      // chống replay\n" +
        "            .body(body)\n" +
        "            .retrieve().toBodilessEntity();\n" +
        "    }\n" +
        "    @Recover\n" +
        "    public void failed(Exception e, Webhook w) {\n" +
        "        webhookDlq.save(w, e);           // hết lượt thử -> DLQ + cảnh báo\n" +
        "        alert.raise(\"webhook-failed\", w.url());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// PHÍA NHẬN: xác thực chữ ký, khử trùng, và TRẢ LỜI NHANH\n" +
        "@PostMapping(\"/webhooks/payment\")\n" +
        "public ResponseEntity<Void> receive(\n" +
        "        @RequestHeader(\"X-Signature\") String signature,\n" +
        "        @RequestHeader(\"X-Event-Id\") String eventId,\n" +
        "        @RequestHeader(\"X-Timestamp\") long timestamp,\n" +
        "        @RequestBody String rawBody) {\n" +
        "\n" +
        "    // 1) Chống REPLAY: từ chối request quá cũ\n" +
        "    if (Math.abs(now() - timestamp) > 300_000) return ResponseEntity.badRequest().build();\n" +
        "    // 2) Xác thực chữ ký — so sánh theo THỜI GIAN HẰNG SỐ\n" +
        "    if (!MessageDigest.isEqual(expected(rawBody).getBytes(), signature.getBytes()))\n" +
        "        return ResponseEntity.status(401).build();\n" +
        "    // 3) KHỬ TRÙNG: bên gửi retry là chuyện bình thường\n" +
        "    if (!processedRepo.tryInsert(eventId)) return ResponseEntity.ok().build();\n" +
        "    // 4) Đưa vào hàng đợi rồi TRẢ LỜI NGAY — xử lý nặng ở nền\n" +
        "    queue.enqueue(rawBody);\n" +
        "    return ResponseEntity.accepted().build();     // 202\n" +
        "}\n" +
        "// Xử lý đồng bộ rồi mới trả lời -> bên gửi timeout và retry -> càng tải nặng.",
    },
  ],
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
  viz: {
    type: 'sequence',
    title: 'Buffering + load leveling của async, ngữ nghĩa đồng bộ của caller',
    actors: ['producer', 'request-q', 'consumer', 'reply-q'],
    messages: [
      { from: 0, to: 1, label: 'gửi message + correlationId + replyTo' },
      { from: 1, to: 2, label: 'consumer nhận, xử lý' },
      { from: 2, to: 3, label: 'gửi response tới replyTo, cùng correlationId' },
      { from: 3, to: 0, label: 'producer chờ, khớp correlationId — có timeout' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "RPC bất đồng bộ với correlation id",
      code:
        "// Ý tưởng: gửi request vào queue, kèm CORRELATION ID và REPLY-TO queue;\n" +
        "// bên xử lý gửi phản hồi về đúng queue đó.\n" +
        "@Service\n" +
        "public class AsyncRpcClient {\n" +
        "    private final Map<String, CompletableFuture<Response>> pending = new ConcurrentHashMap<>();\n" +
        "\n" +
        "    public CompletableFuture<Response> call(Request req, Duration timeout) {\n" +
        "        String correlationId = UUID.randomUUID().toString();\n" +
        "        var future = new CompletableFuture<Response>();\n" +
        "        pending.put(correlationId, future);\n" +
        "\n" +
        "        rabbitTemplate.convertAndSend(\"requests\", req, m -> {\n" +
        "            m.getMessageProperties().setCorrelationId(correlationId);\n" +
        "            m.getMessageProperties().setReplyTo(replyQueueName);\n" +
        "            m.getMessageProperties().setExpiration(String.valueOf(timeout.toMillis()));\n" +
        "            return m;\n" +
        "        });\n" +
        "\n" +
        "        return future.orTimeout(timeout.toMillis(), MILLISECONDS)\n" +
        "                     .whenComplete((r, e) -> pending.remove(correlationId));  // dọn\n" +
        "    }\n" +
        "\n" +
        "    @RabbitListener(queues = \"#{replyQueue.name}\")\n" +
        "    public void onReply(Response res, @Header(\"amq_correlationId\") String cid) {\n" +
        "        var f = pending.remove(cid);\n" +
        "        if (f != null) f.complete(res);      // null nghĩa là đã timeout -> bỏ qua\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// KHI NÀO DÙNG:\n" +
        "//  - đã có broker và muốn TÁCH RỜI về mặt vị trí (không cần biết địa chỉ service)\n" +
        "//  - cần hàng đợi làm bộ đệm cho downstream chậm/tải đột biến\n" +
        "//  - cần cân bằng tải tự nhiên giữa nhiều worker\n" +
        "\n" +
        "// KHI NÀO KHÔNG:\n" +
        "//  - độ trễ thấp là ưu tiên -> HTTP/gRPC trực tiếp đơn giản và nhanh hơn\n" +
        "//  - Mẫu này thêm rất nhiều phức tạp: dọn future treo, xử lý phản hồi tới\n" +
        "//    sau timeout, mất phản hồi khi instance restart (pending nằm trong RAM).\n" +
        "// -> Phần lớn trường hợp, gọi đồng bộ có timeout + circuit breaker là lựa chọn đúng.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: '"API composition được chuẩn hoá qua GraphQL"',
    nodes: ['Mỗi service expose subgraph (@key cho entity)', 'Gateway hợp nhất thành supergraph', 'Client gửi 1 query GraphQL', 'Gateway lập plan, gọi subgraph cần thiết', 'Resolve @key nối entity xuyên service, gộp kết quả'],
    steps: [
      { to: 1, label: 'Apollo Router — một endpoint duy nhất cho client' },
      { to: 3, label: 'Client tự chọn field, không over/under-fetch' },
      { to: 4, label: 'Nhược: gateway phức tạp, khó cache theo field, N+1 giữa subgraph nếu bất cẩn' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Một schema hợp nhất từ nhiều service",
      code:
        "# Mỗi service khai phần schema của mình; gateway HỢP NHẤT thành một graph.\n" +
        "# order-service (subgraph)\n" +
        "type Order @key(fields: \"id\") {\n" +
        "  id: ID!\n" +
        "  total: Float!\n" +
        "  status: String!\n" +
        "  customer: Customer            # tham chiếu sang subgraph khác\n" +
        "}\n" +
        "type Customer @key(fields: \"id\") {\n" +
        "  id: ID! @external             # entity do service khác SỞ HỮU\n" +
        "}\n" +
        "\n" +
        "# customer-service (subgraph) — MỞ RỘNG cùng một type\n" +
        "type Customer @key(fields: \"id\") {\n" +
        "  id: ID!\n" +
        "  name: String!\n" +
        "  email: String!\n" +
        "  orders: [Order]               # quan hệ ngược\n" +
        "}",
    },
    {
      lang: "java",
      title: "Cách gateway giải quyết truy vấn xuyên service",
      code:
        "// Client gửi MỘT truy vấn:\n" +
        "//   query { order(id: \"1\") { total customer { name email } } }\n" +
        "// Gateway lập kế hoạch:\n" +
        "//   1) hỏi order-service -> { total, customer: { id } }\n" +
        "//   2) hỏi customer-service qua _entities -> { name, email }\n" +
        "//   3) gộp kết quả trả về client\n" +
        "@SchemaMapping(typeName = \"Order\", field = \"customer\")\n" +
        "public Customer customer(Order order) {\n" +
        "    return customerLoader.load(order.customerId());    // DataLoader gom lô\n" +
        "}\n" +
        "\n" +
        "// DATALOADER là BẮT BUỘC, không phải tuỳ chọn: không có nó, truy vấn\n" +
        "// danh sách 100 đơn sẽ tạo 100 lời gọi tới customer-service (N+1).\n" +
        "@Bean\n" +
        "public BatchLoaderRegistry.RegistrationSpec<String, Customer> customerLoader() {\n" +
        "    return registry.forTypePair(String.class, Customer.class)\n" +
        "        .registerBatchLoader((ids, env) -> Flux.fromIterable(customerClient.getByIds(ids)));\n" +
        "}\n" +
        "\n" +
        "// LỢI: client lấy đúng dữ liệu cần trong một request; schema thống nhất;\n" +
        "// mỗi đội vẫn sở hữu phần schema của mình.\n" +
        "// CÁI GIÁ:\n" +
        "//  - caching HTTP không dùng được (mọi thứ là POST /graphql)\n" +
        "//  - phân quyền phải làm ở mức FIELD, phức tạp hơn REST\n" +
        "//  - truy vấn lồng sâu có thể làm sập backend -> phải giới hạn độ sâu/độ phức tạp\n" +
        "//  - gateway là điểm phụ thuộc chung, cần vận hành cẩn thận",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Outbox lo "không mất event" — Inbox lo "không xử lý trùng"',
    nodes: ['Nhận message (có messageId)', 'Kiểm tra messageId trong bảng inbox', 'Chưa có → xử lý + INSERT inbox (CÙNG transaction)', 'Đã có → bỏ qua'],
    steps: [
      { to: 1, label: 'Consumer có thể nhận trùng: redelivery, rebalance' },
      { to: 2, label: 'Ghi id đã xử lý + side-effect phải NGUYÊN TỬ với nhau' },
      { to: 3, label: 'Outbox (producer) + Inbox (consumer) → hiệu ứng exactly-once' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Khử trùng lặp ở phía consumer, nguyên tử với nghiệp vụ",
      code:
        "// Outbox đảm bảo KHÔNG MẤT event (at-least-once) -> consumer SẼ nhận trùng.\n" +
        "// Inbox đảm bảo XỬ LÝ ĐÚNG MỘT LẦN về mặt hiệu ứng.\n" +
        "@KafkaListener(topics = \"order-placed\")\n" +
        "@Transactional                                  // MỘT transaction cho cả hai việc\n" +
        "public void handle(OrderPlaced event) {\n" +
        "    // 1) Ghi vào bảng inbox — vi phạm khoá chính nghĩa là đã xử lý rồi\n" +
        "    int inserted = jdbc.update(\"\"\"\n" +
        "        INSERT INTO inbox (event_id, event_type, received_at)\n" +
        "        VALUES (?, ?, now()) ON CONFLICT (event_id) DO NOTHING\n" +
        "        \"\"\", event.eventId(), \"OrderPlaced\");\n" +
        "    if (inserted == 0) {\n" +
        "        log.debug(\"event {} đã xử lý, bỏ qua\", event.eventId());\n" +
        "        return;\n" +
        "    }\n" +
        "    // 2) Xử lý nghiệp vụ trong CÙNG transaction\n" +
        "    inventoryService.reserve(event.orderId(), event.items());\n" +
        "}\n" +
        "// Mấu chốt: bản ghi inbox và thay đổi nghiệp vụ cùng commit hoặc cùng\n" +
        "// rollback. Crash giữa chừng -> cả hai đều không xảy ra -> retry an toàn.",
    },
    {
      lang: "sql",
      title: "Bảng inbox và việc dọn dẹp",
      code:
        "CREATE TABLE inbox (\n" +
        "  event_id    UUID PRIMARY KEY,          -- do PRODUCER sinh, ổn định qua retry\n" +
        "  event_type  TEXT NOT NULL,\n" +
        "  received_at TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "CREATE INDEX idx_inbox_received ON inbox (received_at);\n" +
        "\n" +
        "-- Dọn định kỳ — cửa sổ giữ phải DÀI HƠN khoảng thời gian có thể phát lại\n" +
        "DELETE FROM inbox WHERE received_at < now() - INTERVAL \u002730 days\u0027;\n" +
        "\n" +
        "-- QUAN TRỌNG: event_id phải do PRODUCER sinh và giữ nguyên khi gửi lại.\n" +
        "-- Dùng toạ độ Kafka (topic-partition-offset) thì phát lại từ producer sẽ\n" +
        "-- có offset khác -> không khử được trùng.\n" +
        "\n" +
        "-- OUTBOX + INBOX = \"exactly-once processing\" ở mức hiệu ứng, mà không cần\n" +
        "-- distributed transaction. Đây là cặp mẫu nền tảng của kiến trúc event-driven.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Zero-trust: không tin request chỉ vì đến từ mạng nội bộ',
    root: {
      label: 'Mỗi call service-to-service phải có danh tính xác thực được',
      children: [
        { label: 'mTLS', note: 'mỗi service có cert, hai bên verify nhau — service mesh (Istio) tự cấp/xoay' },
        { label: 'OAuth2 Client Credentials', note: 'service lấy token bằng client_id/secret, đính kèm call' },
        { label: 'Signed JWT short TTL', note: 'downstream verify chữ ký' },
        { label: 'Token propagation cho user context', note: 'A gọi B thay mặt user → truyền tiếp token để B biết cả service nào gọi + user nào' },
      ],
    },
  },
  demo: [
    {
      lang: "yaml",
      title: "mTLS ở tầng hạ tầng",
      code:
        "# CÁCH 1: mTLS — hai bên cùng xuất trình chứng chỉ. Service mesh làm tự động,\n" +
        "# không phải sửa một dòng code nào.\n" +
        "apiVersion: security.istio.io/v1beta1\n" +
        "kind: PeerAuthentication\n" +
        "metadata:\n" +
        "  name: default\n" +
        "  namespace: production\n" +
        "spec:\n" +
        "  mtls:\n" +
        "    mode: STRICT              # BẮT BUỘC mTLS cho mọi traffic trong namespace\n" +
        "---\n" +
        "apiVersion: security.istio.io/v1beta1\n" +
        "kind: AuthorizationPolicy\n" +
        "metadata:\n" +
        "  name: payment-access\n" +
        "spec:\n" +
        "  selector:\n" +
        "    matchLabels: { app: payment-service }\n" +
        "  rules:\n" +
        "    - from:\n" +
        "        - source:\n" +
        "            principals: [\"cluster.local/ns/production/sa/order-service\"]\n" +
        "      to:\n" +
        "        - operation: { methods: [\"POST\"], paths: [\"/payments\"] }\n" +
        "# -> CHỈ order-service được gọi POST /payments. Danh tính dựa trên chứng chỉ,\n" +
        "#    không phải trên địa chỉ IP (IP giả mạo được, chứng chỉ thì không).",
    },
    {
      lang: "java",
      title: "Token ở tầng ứng dụng",
      code:
        "// CÁCH 2: OAuth2 client credentials — service tự lấy token từ IdP\n" +
        "@Bean\n" +
        "OAuth2AuthorizedClientManager clientManager(...) { ... }\n" +
        "\n" +
        "@Bean\n" +
        "RestClient paymentClient(OAuth2AuthorizedClientManager manager) {\n" +
        "    return RestClient.builder()\n" +
        "        .baseUrl(\"https://payment-service\")\n" +
        "        .requestInterceptor((req, body, ex) -> {\n" +
        "            var token = manager.authorize(withClientRegistrationId(\"payment\"));\n" +
        "            req.getHeaders().setBearerAuth(token.getAccessToken().getTokenValue());\n" +
        "            return ex.execute(req, body);\n" +
        "        })\n" +
        "        .build();\n" +
        "}\n" +
        "// Phía nhận verify JWT và kiểm tra SCOPE:\n" +
        "@PreAuthorize(\"hasAuthority(\u0027SCOPE_payments:write\u0027)\")\n" +
        "@PostMapping(\"/payments\")\n" +
        "public PaymentResult charge(@RequestBody ChargeRequest req) { }\n" +
        "\n" +
        "// SO SÁNH:\n" +
        "//  mTLS  — danh tính ở tầng KẾT NỐI, tự động, không sửa code, nhưng chỉ trả\n" +
        "//          lời \"service nào gọi\", không mang được ngữ cảnh người dùng.\n" +
        "//  JWT   — mang được scope, tenant, và danh tính NGƯỜI DÙNG (token propagation).\n" +
        "// -> Thực tế dùng CẢ HAI: mTLS cho danh tính service, JWT cho ngữ cảnh nghiệp vụ.\n" +
        "// TUYỆT ĐỐI KHÔNG dựa vào \"mạng nội bộ nên tin nhau\" — đó là mô hình đã lỗi thời.",
    },
  ],
},
]);
