SS.addQuestions('microservices', [
{
  cat: 'Chịu lỗi',
  id: 'microservices-197hurn',
  q: 'Vì sao timeout là bắt buộc? Đặt bao nhiêu?',
  answer:
    'Không có timeout, một call chậm/treo giữ tài nguyên (thread, connection) vô hạn → hết pool → service không nhận request mới → **cascading failure**.\n\n' +
    'Đặt timeout dựa trên:\n' +
    '- **p99/p99.9 latency thực đo** của downstream, cộng biên độ nhỏ. KHÔNG đặt theo cảm tính (30s).\n' +
    '- **Timeout budget của cả chuỗi**: nếu client cho 500ms, mỗi hop phải ngắn hơn tổng còn lại.\n' +
    '- Timeout connection ngắn (vài trăm ms), timeout đọc theo p99.\n\n' +
    'Kèm timeout: retry (chỉ với idempotent), circuit breaker, fallback.',
  essence:
    'Timeout ngăn "lỗi cục bộ trở thành lỗi toàn cục". Giá trị đúng đến từ dữ liệu latency thật, không phải số tròn. Timeout quá dài vô dụng; quá ngắn gây fail giả.',
  example:
    'Call `pricing-service` có p99 = 80ms → đặt timeout 150ms. Downstream deploy làm p99 tăng lên 300ms → call của bạn timeout, circuit breaker mở, trả giá cache → người dùng vẫn checkout được. Nếu để timeout 10s: mọi thread của bạn kẹt, service sập.',
  viz: {
    type: 'flow',
    title: 'Không timeout → lỗi cục bộ trở thành lỗi toàn cục',
    nodes: ['Call chậm/treo', 'Giữ thread + connection vô hạn', 'Hết pool', 'Không nhận request mới', 'Cascading failure'],
    steps: [
      { to: 1, label: 'Không có timeout → tài nguyên không được nhả' },
      { to: 2, label: 'Mọi request mới cũng chờ' },
      { to: 4, label: 'Đặt timeout theo p99/p99.9 thực đo + biên nhỏ — không số tròn 30s' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Không timeout = chờ vô hạn = cạn thread pool",
      code:
        "// Nhiều HTTP client MẶC ĐỊNH KHÔNG có timeout -> một downstream treo sẽ\n" +
        "// giữ thread của bạn mãi mãi -> pool cạn -> service của BẠN cũng chết.\n" +
        "@Bean\n" +
        "RestClient paymentClient() {\n" +
        "    var factory = new SimpleClientHttpRequestFactory();\n" +
        "    factory.setConnectTimeout(Duration.ofMillis(500));   // bắt tay TCP\n" +
        "    factory.setReadTimeout(Duration.ofMillis(2000));     // chờ phản hồi\n" +
        "    return RestClient.builder()\n" +
        "        .baseUrl(\"http://payment-service\")\n" +
        "        .requestFactory(factory)\n" +
        "        .build();\n" +
        "}\n" +
        "\n" +
        "// ĐẶT BAO NHIÊU: dựa trên SỐ ĐO, không phải cảm tính.\n" +
        "//   timeout ≈ p99 của downstream × 1.5 ~ 2\n" +
        "// p99 của payment là 400ms -> timeout 600-800ms là hợp lý.\n" +
        "// Đặt theo p50 -> cắt nhầm request bình thường. Đặt 30 giây -> vô nghĩa\n" +
        "// vì người dùng đã bỏ đi từ lâu.\n" +
        "\n" +
        "// TIMEOUT PHẢI GIẢM DẦN khi đi sâu vào chuỗi:\n" +
        "//   gateway 3s -> service A 2.5s -> service B 1.5s -> service C 800ms\n" +
        "// Nếu tầng trong lâu hơn tầng ngoài thì tầng ngoài bỏ cuộc trước, và\n" +
        "// công việc bên trong trở nên vô ích.\n" +
        "\n" +
        "// CÁC LOẠI TIMEOUT PHẢI ĐẶT ĐỦ:\n" +
        "//  - connect timeout (ngắn: 200-500ms — kết nối được hay không thì biết nhanh)\n" +
        "//  - read/response timeout\n" +
        "//  - timeout lấy kết nối từ POOL (rất hay bị quên)\n" +
        "//  - transaction timeout ở database\n" +
        "//  - timeout tổng của cả request (deadline)\n" +
        "spring.datasource.hikari.connection-timeout=1000\n" +
        "spring.transaction.default-timeout=10",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-192lma8',
  q: 'Retry + exponential backoff + jitter. Retry storm là gì?',
  answer:
    '**Retry**: thử lại call thất bại (chỉ với lỗi **tạm thời**: timeout, 503, connection reset — KHÔNG retry 400, 404, 401).\n\n' +
    '**Exponential backoff**: khoảng chờ tăng theo cấp số nhân (100ms, 200ms, 400ms…) → không dồn dập.\n\n' +
    '**Jitter**: thêm ngẫu nhiên vào khoảng chờ → tránh mọi client retry **đồng loạt** cùng thời điểm.\n\n' +
    '**Retry storm / thundering herd**: downstream vừa hồi phục thì bị hàng loạt retry đồng bộ đập vào → sập lại. Backoff + jitter + circuit breaker + giới hạn tổng số retry đang chờ (retry budget) chống điều này.',
  essence:
    'Retry ngây thơ (retry ngay, không giới hạn) biến một sự cố ngắn thành sự cố kéo dài — bạn tự DDoS downstream. Backoff giãn ra, jitter phá đồng bộ, budget giới hạn tổng tải retry.',
  example:
    '1000 client gọi service X. X chết 2 giây. Không jitter: đúng giây thứ 2, cả 1000 retry cùng lúc → X sập lại. Có full jitter (`random(0, backoff)`): 1000 retry rải đều trong 2 giây → X hồi phục mượt.',
  viz: {
    type: 'timeline',
    title: 'Backoff giãn ra, jitter phá đồng bộ, budget giới hạn tổng tải retry',
    events: [
      { t: '0ms', label: 'call fail (timeout/503) — chỉ retry lỗi tạm thời' },
      { t: '~100ms', label: 'retry 1: backoff 100ms + jitter' },
      { t: '~300ms', label: 'retry 2: backoff 200ms + jitter' },
      { t: '~700ms', label: 'retry 3: backoff 400ms + jitter' },
      { label: 'hết retry budget → circuit breaker, không đập downstream vừa hồi phục' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Retry đúng cách, và cách nó có thể làm sập hệ thống",
      code:
        "@Retryable(\n" +
        "    retryFor = { HttpServerErrorException.class, ResourceAccessException.class },\n" +
        "    noRetryFor = { HttpClientErrorException.BadRequest.class },   // 4xx: retry vô ích\n" +
        "    maxAttempts = 3,\n" +
        "    backoff = @Backoff(delay = 100, multiplier = 2, maxDelay = 2000, random = true))\n" +
        "public PaymentResult charge(String orderId) {\n" +
        "    return paymentClient.charge(orderId);\n" +
        "}\n" +
        "\n" +
        "// BA YẾU TỐ, thiếu cái nào cũng nguy hiểm:\n" +
        "// 1) EXPONENTIAL BACKOFF: 100ms -> 200ms -> 400ms. Retry ngay lập tức chỉ\n" +
        "//    đổ thêm tải vào một service đang ngộp.\n" +
        "// 2) JITTER (random = true): KHÔNG có nó, 10.000 client cùng lỗi lúc t sẽ\n" +
        "//    cùng retry lúc t+100ms -> đợt sóng đồng bộ đập vào service vừa hồi phục.\n" +
        "// 3) GIỚI HẠN SỐ LẦN: retry vô hạn biến lỗi tạm thời thành sự cố kéo dài.\n" +
        "\n" +
        "// RETRY STORM — cơ chế khuếch đại:\n" +
        "//   A gọi B gọi C. C chậm. B retry 3 lần -> C nhận tải gấp 3.\n" +
        "//   A cũng retry 3 lần -> C nhận tải gấp 9. Ba tầng là gấp 27.\n" +
        "//   -> C không bao giờ hồi phục được.\n" +
        "// CHỐNG:\n" +
        "//  a) CHỈ RETRY Ở MỘT TẦNG (thường là tầng ngoài cùng hoặc tầng gần nhất\n" +
        "//     với downstream), không retry ở mọi tầng.\n" +
        "//  b) RETRY BUDGET: chỉ cho phép retry tối đa ~10% tổng số request.\n" +
        "//  c) CIRCUIT BREAKER: mở mạch thì DỪNG retry hoàn toàn.\n" +
        "//  d) Truyền deadline: hết hạn thì không retry nữa dù còn lượt.\n" +
        "\n" +
        "// CHỈ RETRY THAO TÁC IDEMPOTENT. Retry POST /payments không idempotent\n" +
        "// nghĩa là trừ tiền hai lần.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-4vg2yj',
  q: 'Circuit Breaker — 3 trạng thái và cách hoạt động?',
  answer:
    'Bọc quanh call tới một downstream. Ba trạng thái:\n' +
    '- **CLOSED** (bình thường): call đi qua. Đếm tỉ lệ lỗi. Vượt ngưỡng (ví dụ > 50% lỗi trong 10s hoặc N lỗi liên tiếp) → chuyển OPEN.\n' +
    '- **OPEN**: **không gọi downstream nữa**, trả lỗi/fallback **ngay lập tức** (fail fast). Sau `waitDuration` → HALF-OPEN.\n' +
    '- **HALF-OPEN**: cho **một số ít** call thử. Thành công → CLOSED (đã hồi phục). Thất bại → OPEN lại.\n\n' +
    'Lợi ích: (1) không lãng phí tài nguyên gọi service đang chết; (2) cho downstream thời gian hồi phục thay vì bị đập liên tục.',
  essence:
    'Circuit breaker = "cầu dao": khi downstream hỏng, ngắt kết nối để bảo vệ CẢ HAI phía — caller không kẹt tài nguyên, callee không bị bồi thêm tải khi đang gắng gượng.',
  example:
    'Resilience4j: `payment-service` bắt đầu trả 503. Sau 20 call mà 12 lỗi → breaker OPEN. Trong 30s tiếp theo, mọi call `payment` trả ngay `PaymentUnavailable` → UI hiện "thanh toán tạm gián đoạn, thử lại sau". Sau 30s, HALF-OPEN thử 3 call; OK → CLOSED, dịch vụ trở lại.',
  viz: {
    type: 'states',
    title: '"Cầu dao": ngắt kết nối để bảo vệ cả hai phía',
    start: 0,
    states: ['CLOSED', 'OPEN', 'HALF-OPEN'],
    transitions: [
      { from: 0, to: 1, label: 'tỉ lệ lỗi vượt ngưỡng (>50%/10s)' },
      { from: 1, to: 2, label: 'sau waitDuration' },
      { from: 2, to: 0, label: 'call thử thành công → đã hồi phục' },
      { from: 2, to: 1, label: 'call thử thất bại' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Dừng gọi service đã chết, để nó có cơ hội hồi phục",
      code:
        "// CLOSED     — bình thường, cho qua, đếm tỉ lệ lỗi\n" +
        "// OPEN       — TỪ CHỐI NGAY, không gọi downstream (fail fast)\n" +
        "// HALF_OPEN  — cho vài request thử; thành công -> CLOSED, lỗi -> OPEN lại\n" +
        "@CircuitBreaker(name = \"payment\", fallbackMethod = \"fallback\")\n" +
        "@Retry(name = \"payment\")                    // thứ tự: retry NẰM TRONG breaker\n" +
        "public PaymentResult charge(String orderId) {\n" +
        "    return paymentClient.charge(orderId);\n" +
        "}\n" +
        "\n" +
        "public PaymentResult fallback(String orderId, CallNotPermittedException e) {\n" +
        "    // Mạch ĐANG MỞ -> không gọi downstream, trả về ngay\n" +
        "    return PaymentResult.deferred(orderId);\n" +
        "}\n" +
        "public PaymentResult fallback(String orderId, Exception e) {\n" +
        "    return PaymentResult.failed(orderId, e.getMessage());\n" +
        "}",
    },
    {
      lang: "yaml",
      title: "Cấu hình Resilience4j và ý nghĩa từng tham số",
      code:
        "resilience4j:\n" +
        "  circuitbreaker:\n" +
        "    instances:\n" +
        "      payment:\n" +
        "        slidingWindowType: COUNT_BASED\n" +
        "        slidingWindowSize: 100              # xét 100 request gần nhất\n" +
        "        minimumNumberOfCalls: 20            # chưa đủ 20 thì KHÔNG mở mạch\n" +
        "                                            # (tránh mở vì 1/1 request lỗi)\n" +
        "        failureRateThreshold: 50            # trên 50% lỗi -> OPEN\n" +
        "        slowCallRateThreshold: 80           # 80% call chậm cũng tính là lỗi\n" +
        "        slowCallDurationThreshold: 2s       # chậm hơn 2s coi như lỗi\n" +
        "        waitDurationInOpenState: 30s        # mở 30s rồi thử lại\n" +
        "        permittedNumberOfCallsInHalfOpenState: 5\n" +
        "        automaticTransitionFromOpenToHalfOpenEnabled: true\n" +
        "        recordExceptions:\n" +
        "          - org.springframework.web.client.HttpServerErrorException\n" +
        "          - java.io.IOException\n" +
        "        ignoreExceptions:                   # 4xx KHÔNG phải lỗi của downstream\n" +
        "          - org.springframework.web.client.HttpClientErrorException\n" +
        "\n" +
        "# VÌ SAO CẦN: không có breaker, mỗi request đều chờ hết timeout rồi mới lỗi\n" +
        "# -> thread bị giữ, người dùng chờ vô ích, và downstream tiếp tục bị đập.\n" +
        "# Breaker biến \"chờ 2 giây rồi lỗi\" thành \"lỗi ngay lập tức\" và cho\n" +
        "# downstream không gian để hồi phục.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-mi1g30',
  q: 'Bulkhead pattern là gì?',
  answer:
    'Chia tài nguyên (thread pool, connection pool, semaphore) thành các "khoang" **cô lập** cho từng downstream/loại request — như khoang kín của tàu thuỷ.\n\n' +
    'Nếu một downstream chậm và làm cạn khoang của nó, các khoang khác **không bị ảnh hưởng**.\n\n' +
    'Không có bulkhead: mọi call dùng chung một pool 200 thread. Downstream X treo → 200 thread kẹt chờ X → service không xử lý được call tới Y, Z (dù chúng khoẻ).',
  essence:
    'Bulkhead giới hạn "bán kính nổ" của một downstream lỗi. Một service phụ chết chỉ làm hỏng tính năng dùng service đó, không kéo sập toàn bộ.',
  example:
    '`order-service` gọi `pricing` (quan trọng) và `recommendation` (tuỳ chọn). Bulkhead: `pricing` được pool 50 thread, `recommendation` chỉ 10 thread + timeout 100ms. `recommendation` treo → tối đa 10 thread kẹt, `pricing` vẫn còn 50 thread → checkout không bị ảnh hưởng.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Không bulkhead', 'Có bulkhead'],
    rows: [
      ['Tài nguyên', 'một pool chung 200 thread cho mọi call', 'khoang cô lập: pricing 50, recommendation 10'],
      ['Downstream X treo', '200 thread kẹt chờ X', 'tối đa 10 thread (khoang của X) kẹt'],
      ['Ảnh hưởng tới Y, Z (khoẻ)', 'không xử lý được (hết thread)', 'không bị ảnh hưởng'],
      ['Bán kính nổ', 'toàn service', 'chỉ tính năng dùng service đó'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chia ngăn để một chỗ hỏng không chìm cả tàu",
      code:
        "// Tên lấy từ khoang kín trên tàu thuỷ: thủng một khoang thì tàu vẫn nổi.\n" +
        "// VẤN ĐỀ: mọi lời gọi dùng CHUNG một thread pool. Service B chậm ->\n" +
        "// mọi thread bị giữ ở đó -> lời gọi tới C và D cũng không còn thread ->\n" +
        "// toàn bộ service chết vì MỘT downstream chậm.\n" +
        "\n" +
        "// BULKHEAD: mỗi downstream một pool RIÊNG\n" +
        "@Bulkhead(name = \"payment\", type = Bulkhead.Type.THREADPOOL)\n" +
        "@CircuitBreaker(name = \"payment\", fallbackMethod = \"fallback\")\n" +
        "public PaymentResult charge(String id) { return paymentClient.charge(id); }\n" +
        "\n" +
        "@Bulkhead(name = \"inventory\", type = Bulkhead.Type.THREADPOOL)\n" +
        "public Stock check(String sku) { return inventoryClient.check(sku); }\n" +
        "// payment ngộp thì chỉ pool của payment cạn; inventory vẫn chạy bình thường.",
    },
    {
      lang: "yaml",
      title: "Hai loại bulkhead và cấu hình",
      code:
        "resilience4j:\n" +
        "  bulkhead:                        # SEMAPHORE: giới hạn số call ĐỒNG THỜI\n" +
        "    instances:\n" +
        "      inventory:\n" +
        "        maxConcurrentCalls: 20\n" +
        "        maxWaitDuration: 100ms     # chờ chỗ trống tối đa 100ms rồi từ chối\n" +
        "  thread-pool-bulkhead:            # THREADPOOL: pool riêng + hàng đợi\n" +
        "    instances:\n" +
        "      payment:\n" +
        "        maxThreadPoolSize: 20\n" +
        "        coreThreadPoolSize: 10\n" +
        "        queueCapacity: 50\n" +
        "\n" +
        "# SEMAPHORE — nhẹ, không đổi thread, hợp với code đồng bộ đơn giản.\n" +
        "# THREADPOOL — cách ly mạnh hơn (call chạy trên thread khác) nhưng mất\n" +
        "#   ThreadLocal (SecurityContext, MDC) -> phải truyền thủ công.\n" +
        "\n" +
        "# CÁC TẦNG KHÁC CŨNG CẦN BULKHEAD:\n" +
        "#  - connection pool database RIÊNG cho luồng nghiệp vụ quan trọng\n" +
        "#  - Kubernetes: resource limit cho mỗi pod (một pod không ăn hết CPU node)\n" +
        "#  - Lambda: reserved concurrency cho mỗi function\n" +
        "#  - hàng đợi riêng cho từng loại công việc thay vì một queue chung",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-1e8wi10',
  q: 'Graceful degradation và fallback — thiết kế thế nào?',
  answer:
    'Khi một phụ thuộc lỗi, thay vì fail cả request, **giảm cấp** tính năng:\n' +
    '- Trả **giá trị mặc định** hợp lý ("chưa có đánh giá" thay vì lỗi).\n' +
    '- Trả **dữ liệu cache cũ** (stale-while-error).\n' +
    '- **Ẩn** một phần UI không quan trọng (bỏ khối "gợi ý cho bạn").\n' +
    '- **Hàng đợi** thao tác để xử lý sau (ghi nhận "đã nhận yêu cầu").\n\n' +
    'Phân loại phụ thuộc: **critical** (mất là fail — payment) vs **non-critical** (mất thì degrade — recommendation, review count). Chỉ critical mới được phép làm fail request.',
  essence:
    'Không phải mọi phụ thuộc đều quan trọng như nhau. Thiết kế để hệ thống **hoạt động ở mức giảm** khi phần phụ hỏng — trải nghiệm kém một chút còn hơn trang lỗi.',
  example:
    'Trang sản phẩm: `catalog` (critical), `price` (critical), `reviews` (non-critical), `related-products` (non-critical). `reviews` timeout → hiện "Đang tải đánh giá…" và trang vẫn cho thêm vào giỏ. `price` timeout → không cho mua (fail đúng).',
  viz: {
    type: 'tree',
    title: 'Chỉ phụ thuộc critical mới được phép làm fail request',
    root: {
      label: 'Khi phụ thuộc non-critical lỗi → giảm cấp, không fail cả request',
      children: [
        { label: 'Giá trị mặc định hợp lý', note: '"chưa có đánh giá" thay vì lỗi' },
        { label: 'Dữ liệu cache cũ', note: 'stale-while-error' },
        { label: 'Ẩn phần UI không quan trọng', note: 'bỏ khối "gợi ý cho bạn"' },
        { label: 'Hàng đợi thao tác xử lý sau', note: 'ghi nhận "đã nhận yêu cầu"' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Phục vụ suy giảm còn hơn không phục vụ",
      code:
        "// NGUYÊN TẮC: xác định đâu là chức năng CỐT LÕI, đâu là chức năng PHỤ.\n" +
        "// Chức năng phụ hỏng thì bỏ qua, đừng để nó kéo sập chức năng chính.\n" +
        "@Service\n" +
        "public class ProductPageService {\n" +
        "    public ProductPage load(String id) {\n" +
        "        Product p = productClient.get(id);        // CỐT LÕI: hỏng thì phải báo lỗi\n" +
        "\n" +
        "        // PHỤ: hỏng thì hiển thị thiếu, trang vẫn dùng được\n" +
        "        var reviews = tryOrDefault(() -> reviewClient.get(id), List.of());\n" +
        "        var recs    = tryOrDefault(() -> recommendClient.get(id), popularProducts());\n" +
        "        var stock   = tryOrDefault(() -> inventoryClient.get(id), Stock.unknown());\n" +
        "\n" +
        "        return new ProductPage(p, reviews, recs, stock);\n" +
        "    }\n" +
        "    private <T> T tryOrDefault(Supplier<T> call, T fallback) {\n" +
        "        try { return call.get(); }\n" +
        "        catch (Exception e) { metrics.increment(\"degraded\"); return fallback; }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// CÁC MỨC FALLBACK, từ tốt tới xấu:\n" +
        "// 1) DỮ LIỆU CŨ từ cache — người dùng gần như không nhận ra\n" +
        "public Product get(String id) {\n" +
        "    try {\n" +
        "        Product p = client.get(id);\n" +
        "        cache.put(id, p, Duration.ofHours(24));      // TTL DÀI để làm dự phòng\n" +
        "        return p;\n" +
        "    } catch (Exception e) {\n" +
        "        return cache.get(id).orElseThrow(() -> e);   // stale-while-error\n" +
        "    }\n" +
        "}\n" +
        "// 2) GIÁ TRỊ MẶC ĐỊNH hợp lý (danh sách phổ biến thay cho gợi ý cá nhân hoá)\n" +
        "// 3) CHỨC NĂNG RÚT GỌN (tìm kiếm cơ bản thay vì tìm kiếm nâng cao)\n" +
        "// 4) THÔNG BÁO RÕ RÀNG cho người dùng (\"tạm thời không hiển thị được đánh giá\")\n" +
        "// 5) LỖI — chỉ khi thật sự không còn cách nào\n" +
        "\n" +
        "// BẮT BUỘC: ĐO số lần rơi vào fallback. Fallback im lặng che giấu sự cố,\n" +
        "// và bạn sẽ chỉ biết khi khách hàng phàn nàn.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-73kg0d',
  q: 'Cascading failure — cơ chế và cách phòng tránh?',
  answer:
    'Một service quá tải/chậm → caller kẹt tài nguyên chờ → caller quá tải → caller-của-caller kẹt → lan ngược lên toàn hệ thống. Thường kèm **retry storm** làm nặng thêm.\n\n' +
    'Phòng tránh (nhiều lớp):\n' +
    '- **Timeout** hợp lý ở mọi call.\n' +
    '- **Circuit breaker** — ngắt sớm.\n' +
    '- **Bulkhead** — cô lập pool.\n' +
    '- **Load shedding** — từ chối request khi quá tải (trả 503 nhanh) thay vì nhận rồi chết.\n' +
    '- **Rate limiting** ở biên.\n' +
    '- **Backpressure** — chậm lại việc nhận việc khi downstream chậm.\n' +
    '- Retry budget + jitter.',
  essence:
    'Cascading failure là chế độ hỏng đặc trưng của hệ phân tán: lỗi lan qua các ranh giới đồng bộ. Không có một "viên đạn bạc" — cần nhiều lớp bảo vệ đặt đúng chỗ.',
  example:
    'DB của `user-service` chậm. Không phòng bị: `user-service` treo → `order-service` (gọi user để lấy tên) treo → `api-gateway` hết thread → toàn site down. Có phòng bị: circuit breaker của order→user mở sau 5s, order trả đơn hàng không kèm tên user (degrade), site vẫn chạy.',
  viz: {
    type: 'flow',
    title: 'Lỗi lan qua các ranh giới đồng bộ — cần nhiều lớp bảo vệ',
    nodes: ['Service quá tải/chậm', 'Caller kẹt tài nguyên chờ', 'Caller quá tải', 'Lan ngược lên toàn hệ thống'],
    steps: [
      { to: 1, label: 'Thường kèm retry storm làm nặng thêm' },
      { to: 3, label: 'user-svc chậm → order-svc treo → api-gateway hết thread → site down' },
      { to: 3, label: 'Phòng: timeout + circuit breaker + bulkhead + load shedding + rate limit + backpressure + retry budget' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một service chậm kéo sập cả hệ thống",
      code:
        "// CƠ CHẾ LAN TRUYỀN (từ dưới lên):\n" +
        "// 1) Service D chậm (GC dài, DB nghẽn, deploy lỗi)\n" +
        "// 2) C gọi D không có timeout -> thread của C bị giữ\n" +
        "// 3) Thread pool của C cạn -> C ngừng phản hồi\n" +
        "// 4) B chờ C -> pool của B cạn -> B chết\n" +
        "// 5) A chết -> toàn hệ thống sập vì MỘT service chậm ở tầng cuối\n" +
        "// 6) Retry ở mọi tầng khuếch đại tải lên gấp nhiều lần\n" +
        "// 7) Service khởi động lại, cache lạnh, tải dồn -> chết lại (chết dây chuyền)\n" +
        "\n" +
        "// SÁU LỚP PHÒNG THỦ, áp dụng cùng lúc:\n" +
        "@Bulkhead(name = \"downstream\")                  // 1) pool riêng cho mỗi downstream\n" +
        "@CircuitBreaker(name = \"downstream\",            // 2) ngừng gọi service đã chết\n" +
        "                fallbackMethod = \"fallback\")\n" +
        "@Retry(name = \"downstream\")                     // 3) retry CÓ GIỚI HẠN + jitter\n" +
        "@TimeLimiter(name = \"downstream\")               // 4) timeout bắt buộc\n" +
        "public CompletableFuture<Result> call() { ... }\n" +
        "\n" +
        "// 5) LOAD SHEDDING: từ chối bớt request khi quá tải thay vì chết cả cụm\n" +
        "// 6) ĐỘ TRỄ CÓ GIỚI HẠN ở mọi tầng, và deadline truyền xuyên chuỗi\n" +
        "\n" +
        "// PHÒNG Ở TẦNG HẠ TẦNG:\n" +
        "//  - resource limit cho mỗi pod (một service không ăn hết CPU của node)\n" +
        "//  - PodDisruptionBudget để không mất quá nhiều instance cùng lúc\n" +
        "//  - HPA scale trước khi ngộp\n" +
        "//  - readiness probe rút instance đang ngộp khỏi load balancer\n" +
        "\n" +
        "// DIỄN TẬP: chaos engineering — chủ động làm chậm một service ở staging\n" +
        "// và xem hệ thống có sống sót không. Đây là cách DUY NHẤT để biết chắc\n" +
        "// các lớp phòng thủ trên thật sự hoạt động.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-1cs7jcj',
  q: 'Load shedding là gì? Khác rate limiting thế nào?',
  answer:
    '**Rate limiting**: giới hạn *dựa trên quota* — mỗi client/API key được N request/giây, vượt thì 429. Đặt trước, biết trước.\n\n' +
    '**Load shedding**: giới hạn *dựa trên tình trạng hệ thống hiện tại* — khi service phát hiện mình quá tải (queue dài, CPU cao, p99 tăng, thread pool gần cạn) → **chủ động từ chối** một phần request (trả 503 nhanh), ưu tiên giữ phần còn lại chạy tốt.\n\n' +
    'Có thể shed theo độ ưu tiên: bỏ request "prefetch"/"nice-to-have" trước, giữ request "checkout".',
  essence:
    'Rate limiting = "bạn được bao nhiêu". Load shedding = "hệ thống chịu được bao nhiêu ngay lúc này". Thà phục vụ tốt 80% request còn hơn phục vụ tệ (hoặc chết) với 100%.',
  example:
    'Flash sale: traffic gấp 10 lần. `checkout-service` thấy queue > 1000 → bắt đầu shed: trả 503 cho request có header `x-priority: low` (như "kiểm tra tồn kho định kỳ"), giữ nguyên request đặt hàng thật. p99 của request quan trọng vẫn < 500ms.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Rate limiting', 'Load shedding'],
    rows: [
      ['Căn cứ', 'quota đặt trước (N req/s mỗi client)', 'tình trạng hệ thống hiện tại (queue, CPU, p99)'],
      ['Phản hồi', '429 khi vượt quota', '503 nhanh khi phát hiện quá tải'],
      ['Câu hỏi', '"bạn được bao nhiêu"', '"hệ thống chịu được bao nhiêu ngay lúc này"'],
      ['Ưu tiên', '—', 'bỏ "nice-to-have" trước, giữ "checkout"'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bỏ bớt việc để cứu phần còn lại",
      code:
        "// RATE LIMITING — giới hạn THEO CLIENT, biết trước, mang tính hợp đồng:\n" +
        "//   \"mỗi API key được 1000 request/phút\". Áp dụng LUÔN LUÔN, kể cả khi rảnh.\n" +
        "// LOAD SHEDDING — từ chối THEO TÌNH TRẠNG HỆ THỐNG, chỉ khi ĐANG quá tải:\n" +
        "//   \"hàng đợi quá sâu / độ trễ vượt ngưỡng -> từ chối bớt để không sập\".\n" +
        "\n" +
        "@Component\n" +
        "public class LoadShedder implements HandlerInterceptor {\n" +
        "    @Override\n" +
        "    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object h) {\n" +
        "        // Tín hiệu quá tải: độ sâu hàng đợi, độ trễ p99, hoặc số thread đang bận\n" +
        "        if (queueDepth() > THRESHOLD) {\n" +
        "            // ƯU TIÊN: giữ lại request quan trọng, bỏ request có thể bỏ\n" +
        "            if (isLowPriority(req)) {\n" +
        "                res.setStatus(503);\n" +
        "                res.setHeader(\"Retry-After\", \"5\");\n" +
        "                metrics.increment(\"shed\", \"priority\", \"low\");\n" +
        "                return false;\n" +
        "            }\n" +
        "        }\n" +
        "        if (queueDepth() > CRITICAL) {          // quá tải nặng -> bỏ cả loại cao hơn\n" +
        "            res.setStatus(503);\n" +
        "            return false;\n" +
        "        }\n" +
        "        return true;\n" +
        "    }\n" +
        "    private boolean isLowPriority(HttpServletRequest r) {\n" +
        "        return r.getRequestURI().startsWith(\"/api/reports\")     // báo cáo\n" +
        "            || \"bot\".equals(r.getHeader(\"X-Client-Type\"));      // crawler\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// VÌ SAO CẦN: khi quá tải, nhận HẾT request nghĩa là MỌI request đều chậm\n" +
        "// và cuối cùng đều timeout -> phục vụ được 0%. Từ chối 30% để 70% còn lại\n" +
        "// được phục vụ ĐÚNG là lựa chọn tốt hơn nhiều.\n" +
        "\n" +
        "// NGUYÊN TẮC: TỪ CHỐI SỚM và RẺ (ngay ở tầng ngoài, trước khi tốn tài\n" +
        "// nguyên), trả 503 kèm Retry-After, và đo tỉ lệ bị bỏ để biết cần scale.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-qry3zy',
  q: 'Backpressure trong hệ thống microservices?',
  answer:
    'Khi consumer xử lý chậm hơn producer sản xuất, thay vì để hàng đợi phình vô hạn (→ OOM) hoặc drop im lặng, hệ thống phải **báo ngược lên** để producer chậm lại.\n\n' +
    'Cơ chế:\n' +
    '- **Bounded queue/buffer**: đầy thì block producer hoặc trả lỗi.\n' +
    '- **Pull-based consumer** (Kafka): consumer tự kéo theo tốc độ của mình.\n' +
    '- **Reactive Streams** (`request(n)`): consumer nói với producer "tôi sẵn sàng nhận n phần tử".\n' +
    '- **HTTP 429/503 + Retry-After**: downstream báo caller "chậm lại".\n' +
    '- **Pause/resume** consumer khi pool downstream cạn.',
  essence:
    'Backpressure biến "quá tải âm thầm" (buffer phình, latency tăng, cuối cùng sập) thành "tín hiệu rõ ràng" để phía trước điều tiết. Không có nó, hệ thống dưới tải cao sẽ sụp đổ chứ không chậm lại êm.',
  example:
    'Consumer đọc từ Kafka, mỗi message gọi API bên thứ ba (rate limit 100/s). Nếu poll 500 message/lần và xử lý bằng thread pool → vượt rate limit, bị 429. Backpressure: `pause()` partition khi có 100 request đang bay, `resume()` khi < 50 → tự khớp tốc độ downstream.',
  viz: {
    type: 'flow',
    title: 'Biến "quá tải âm thầm" thành "tín hiệu rõ ràng" để phía trước điều tiết',
    nodes: ['Consumer xử lý chậm hơn producer', 'Bounded queue/buffer đầy', 'Báo ngược lên', 'Producer chậm lại'],
    steps: [
      { to: 1, label: 'Không bounded → buffer phình vô hạn → OOM' },
      { to: 2, label: 'Pull-based (Kafka), Reactive Streams request(n), HTTP 429/503 + Retry-After' },
      { to: 3, label: 'pause()/resume() consumer khi pool downstream cạn → tự khớp tốc độ' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Báo cho bên gửi biết mình không theo kịp",
      code:
        "// Backpressure = tín hiệu ngược dòng để bên sản xuất CHẬM LẠI, thay vì\n" +
        "// tiếp tục đẩy dữ liệu vào một hệ thống đang ngộp cho tới khi nó vỡ.\n" +
        "\n" +
        "// 1) VỚI HÀNG ĐỢI CÓ GIỚI HẠN — backpressure tự nhiên\n" +
        "new ThreadPoolExecutor(10, 20, 60L, SECONDS,\n" +
        "    new ArrayBlockingQueue<>(500),                       // CÓ GIỚI HẠN\n" +
        "    new ThreadPoolExecutor.CallerRunsPolicy());          // producer TỰ chạy task\n" +
        "// CallerRunsPolicy làm chậm chính producer -> đó là backpressure.\n" +
        "// Hàng đợi VÔ HẠN thì không bao giờ có tín hiệu -> chỉ có OOM.\n" +
        "\n" +
        "// 2) VỚI KAFKA — consumer điều tiết bằng pause/resume\n" +
        "if (localQueue.size() > HIGH_WATERMARK) {\n" +
        "    consumer.pause(consumer.assignment());       // ngừng nhận thêm\n" +
        "} else if (localQueue.size() < LOW_WATERMARK) {\n" +
        "    consumer.resume(consumer.assignment());\n" +
        "}\n" +
        "consumer.poll(Duration.ZERO);                    // vẫn poll để giữ chỗ trong group\n" +
        "\n" +
        "// 3) VỚI REACTIVE STREAMS — backpressure là một phần của giao thức\n" +
        "Flux.fromIterable(orders)\n" +
        "    .flatMap(o -> processAsync(o), 10)           // tối đa 10 việc đồng thời\n" +
        "    .onBackpressureBuffer(1000,\n" +
        "        dropped -> log.warn(\"bỏ {}\", dropped),\n" +
        "        BufferOverflowStrategy.DROP_OLDEST)\n" +
        "    .subscribe();\n" +
        "\n" +
        "// 4) VỚI HTTP — trả 429/503 kèm Retry-After để client tự giãn nhịp\n" +
        "return ResponseEntity.status(429).header(\"Retry-After\", \"10\").build();\n" +
        "\n" +
        "// NGUYÊN TẮC CHUNG: mọi hàng đợi trong hệ thống PHẢI có giới hạn.\n" +
        "// Hàng đợi vô hạn chỉ đổi lỗi \"từ chối request\" thành lỗi \"hết bộ nhớ\",\n" +
        "// và lỗi thứ hai tệ hơn nhiều vì nó làm mất cả dữ liệu đang xử lý.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-1e7lcpg',
  q: 'Fail fast và fail safe — khi nào áp dụng cái nào?',
  answer:
    '**Fail fast**: phát hiện lỗi/không thể xử lý → trả lỗi **ngay**, không cố gắng. Dùng khi: request không thể hoàn thành đúng (thiếu dữ liệu bắt buộc, downstream critical chết), và tiếp tục sẽ tốn tài nguyên vô ích hoặc tạo dữ liệu sai.\n\n' +
    '**Fail safe / fail soft**: gặp lỗi → **tiếp tục ở chế độ an toàn/giảm cấp** (giá trị mặc định, bỏ qua bước non-critical). Dùng khi: lỗi ở phần không quan trọng, và một kết quả "gần đúng" tốt hơn không có kết quả.\n\n' +
    'Nguyên tắc: fail fast cho **critical path**, fail safe cho **enrichment/optional**.',
  essence:
    'Fail fast bảo vệ tính đúng đắn và tài nguyên (đừng làm việc vô ích). Fail safe bảo vệ trải nghiệm (đừng để phần phụ làm hỏng phần chính). Cùng một hệ thống dùng cả hai, tuỳ đường đi.',
  example:
    'Đặt hàng: `payment` lỗi → **fail fast** (không tạo đơn "mồ côi chưa trả tiền"). `loyalty-points` service lỗi → **fail safe** (tạo đơn bình thường, cộng điểm sau qua job đối soát).',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Fail fast', 'Fail safe / fail soft'],
    rows: [
      ['Hành vi khi lỗi', 'trả lỗi ngay, không cố gắng', 'tiếp tục ở chế độ an toàn/giảm cấp'],
      ['Bảo vệ', 'tính đúng đắn + tài nguyên (đừng làm việc vô ích)', 'trải nghiệm (đừng để phần phụ hỏng phần chính)'],
      ['Dùng cho', 'critical path — thiếu dữ liệu bắt buộc, downstream critical chết', 'enrichment/optional — kết quả "gần đúng" tốt hơn không có'],
      ['Ví dụ đặt hàng', 'payment lỗi → không tạo đơn', 'loyalty-points lỗi → tạo đơn, cộng điểm sau'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Lỗi ồn ào hay lặng lẽ đi tiếp",
      code:
        "// FAIL FAST — phát hiện lỗi thì DỪNG NGAY và báo lỗi rõ ràng.\n" +
        "@PostConstruct\n" +
        "public void validateConfig() {\n" +
        "    if (paymentUrl == null || paymentUrl.isBlank())\n" +
        "        throw new IllegalStateException(\"Thiếu PAYMENT_URL — dừng khởi động\");\n" +
        "    // Thà không khởi động được còn hơn chạy rồi lỗi giữa đêm.\n" +
        "}\n" +
        "@PostMapping(\"/orders\")\n" +
        "public Order create(@Valid @RequestBody CreateOrder req) {   // validate ngay ở biên\n" +
        "    if (!inventoryClient.isAvailable(req.sku()))\n" +
        "        throw new OutOfStockException(req.sku());            // dừng ngay, đừng trừ tiền\n" +
        "    return service.place(req);\n" +
        "}\n" +
        "// DÙNG KHI: dữ liệu sai sẽ gây hậu quả (tiền bạc, đơn hàng), cấu hình sai,\n" +
        "// vi phạm ràng buộc nghiệp vụ, hoặc chức năng CỐT LÕI hỏng.\n" +
        "\n" +
        "// FAIL SAFE — lỗi thì dùng phương án dự phòng và ĐI TIẾP.\n" +
        "public List<Recommendation> getRecommendations(String userId) {\n" +
        "    try {\n" +
        "        return recommendClient.get(userId);\n" +
        "    } catch (Exception e) {\n" +
        "        log.warn(\"gợi ý lỗi, dùng danh sách phổ biến\", e);\n" +
        "        metrics.increment(\"recommendation.fallback\");    // BẮT BUỘC đo\n" +
        "        return popularProducts();\n" +
        "    }\n" +
        "}\n" +
        "// DÙNG KHI: chức năng PHỤ, dữ liệu bổ sung, phân tích, thông báo.\n" +
        "\n" +
        "// SAI LẦM PHỔ BIẾN NHẤT: fail safe không có metric -> lỗi bị nuốt im lặng,\n" +
        "// hệ thống \"chạy bình thường\" trong khi 40% người dùng thấy dữ liệu sai.\n" +
        "catch (Exception ignored) { }        // KHÔNG BAO GIỜ viết như thế này\n" +
        "\n" +
        "// QUY TẮC: fail fast cho GHI và cho nghiệp vụ; fail safe cho ĐỌC và cho\n" +
        "// phần bổ trợ. Và mọi fail safe đều phải có log + metric + ngưỡng cảnh báo.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-10xy0cu',
  q: 'Chỉ retry với idempotent operation — vì sao và làm sao?',
  answer:
    'Retry một operation **không idempotent** khi bạn không chắc nó đã chạy hay chưa → có thể **thực hiện hai lần** (charge tiền 2 lần, tạo 2 đơn).\n\n' +
    'Kịch bản nguy hiểm: gửi request → server xử lý xong → response bị mất trên đường về → client tưởng fail → retry.\n\n' +
    'Giải pháp:\n' +
    '- **GET, PUT, DELETE**: idempotent theo định nghĩa HTTP → retry an toàn.\n' +
    '- **POST**: không idempotent → thêm **Idempotency-Key**, server dedup.\n' +
    '- Thao tác nội bộ: thiết kế idempotent (`SET status=X` thay vì `INCREMENT`; UPSERT theo business key).',
  essence:
    'Retry an toàn ⟺ operation idempotent. Với thao tác thay đổi state, bạn phải *làm cho nó* idempotent (key + dedup) trước khi bật retry, nếu không retry là con dao hai lưỡi.',
  example:
    '`POST /transfers` chuyển tiền: nếu retry mà không có idempotency key → chuyển 2 lần. Sửa: client sinh `Idempotency-Key` một lần, gắn vào mọi retry; server: `INSERT INTO transfers(idempotency_key, ...) ON CONFLICT DO NOTHING` + trả kết quả cũ nếu key đã tồn tại.',
  viz: {
    type: 'compare',
    corner: 'Loại thao tác',
    cols: ['Idempotent (GET/PUT/DELETE)', 'Không idempotent (POST)'],
    rows: [
      ['Retry an toàn?', 'có — theo định nghĩa HTTP', 'không — có thể chạy 2 lần'],
      ['Kịch bản nguy hiểm', '—', 'xử lý xong → response mất → client tưởng fail → retry → charge 2 lần'],
      ['Làm cho retry an toàn', 'không cần gì', 'thêm Idempotency-Key + server dedup'],
      ['Thao tác nội bộ', 'SET status=X, UPSERT theo business key', 'tránh INCREMENT không key'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Retry thao tác không idempotent là trừ tiền hai lần",
      code:
        "// VẤN ĐỀ: request tới đích và ĐÃ XỬ LÝ, nhưng phản hồi mất trên đường về.\n" +
        "// Client không phân biệt được \"chưa tới\" với \"đã xử lý nhưng mất phản hồi\"\n" +
        "// -> retry -> xử lý LẦN HAI.\n" +
        "\n" +
        "// AN TOÀN ĐỂ RETRY:\n" +
        "// GET, PUT (đặt trạng thái tuyệt đối), DELETE (xoá lần hai vẫn là đã xoá)\n" +
        "restClient.put().uri(\"/orders/{id}/status\", id).body(new Status(\"PAID\"));   // idempotent\n" +
        "\n" +
        "// KHÔNG AN TOÀN: POST tạo tài nguyên, hoặc mọi phép CỘNG DỒN\n" +
        "restClient.post().uri(\"/payments\").body(new Charge(100));   // retry = trừ 2 lần\n" +
        "\n" +
        "// LÀM CHO NÓ IDEMPOTENT — ba cách:\n" +
        "// 1) IDEMPOTENCY KEY do client sinh\n" +
        "restClient.post().uri(\"/payments\")\n" +
        "    .header(\"Idempotency-Key\", intentId)      // GIỮ NGUYÊN khi retry\n" +
        "    .body(new Charge(100));\n" +
        "\n" +
        "// 2) THAO TÁC TUYỆT ĐỐI thay vì tương đối\n" +
        "// SAI:  UPDATE accounts SET balance = balance - 100     (cộng dồn)\n" +
        "// ĐÚNG: UPDATE accounts SET balance = 900 WHERE version = 5   (đặt giá trị + version)\n" +
        "\n" +
        "// 3) UPSERT theo khoá tự nhiên\n" +
        "// INSERT ... ON CONFLICT (order_id) DO UPDATE SET ...\n" +
        "\n" +
        "// CẤU HÌNH RETRY THEO LOẠI THAO TÁC:\n" +
        "@Retryable(retryFor = IOException.class, maxAttempts = 3)\n" +
        "public Order getOrder(String id) { }              // GET: retry thoải mái\n" +
        "\n" +
        "@Retryable(retryFor = IOException.class, maxAttempts = 3)\n" +
        "public void charge(String id, String idempotencyKey) { }   // an toàn NHỜ key\n" +
        "\n" +
        "public void chargeUnsafe(String id) { }           // KHÔNG @Retryable\n" +
        "// -> Lỗi thì đưa vào hàng đợi để con người hoặc quy trình đối soát xử lý,\n" +
        "//    KHÔNG tự động thử lại.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-cziemq',
  q: 'Fallback cache (stale-while-error) — dùng cache cũ khi downstream lỗi?',
  answer:
    'Cache dữ liệu từ downstream với hai mốc: **fresh TTL** (còn dùng bình thường) và **stale TTL** dài hơn (được phép dùng khi downstream lỗi).\n\n' +
    'Luồng:\n' +
    '- Cache còn fresh → trả về.\n' +
    '- Cache stale nhưng downstream OK → refresh, trả bản mới.\n' +
    '- Cache stale VÀ downstream lỗi/timeout/circuit-open → **trả bản stale** + log/metric "served stale".\n\n' +
    'Người dùng thấy dữ liệu hơi cũ thay vì lỗi. Phù hợp với dữ liệu ít đổi (catalog, config, tỉ giá).',
  essence:
    'Cache không chỉ để nhanh — nó là **lớp phòng thủ resilience**: khi nguồn dữ liệu chết, bản sao cũ vẫn giữ hệ thống chạy. "Hơi cũ" thường chấp nhận được hơn "sập".',
  example:
    '`product-service` gọi `pricing-service` cho giá. Cache giá fresh 60s, stale tới 1 giờ. `pricing-service` down 10 phút → `product-service` phục vụ giá từ cache stale (tối đa 1h tuổi) → trang vẫn hiện giá, vẫn mua được. Metric `price.stale.served` tăng → alert nhẹ.',
  viz: {
    type: 'flow',
    title: 'Cache là lớp phòng thủ resilience, không chỉ để nhanh',
    nodes: ['Cache còn fresh (TTL ngắn)', 'Stale nhưng downstream OK → refresh', 'Stale VÀ downstream lỗi/circuit-open → trả stale + metric'],
    steps: [
      { to: 0, label: 'Trả về ngay' },
      { to: 1, label: 'Lấy bản mới, cập nhật cache' },
      { to: 2, label: '"Hơi cũ" (tối đa stale TTL) chấp nhận được hơn "sập" — hợp dữ liệu ít đổi' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Dùng dữ liệu cũ khi downstream chết",
      code:
        "// Ý tưởng: cache có HAI mốc thời gian — TTL \"tươi\" ngắn, và TTL \"còn dùng\n" +
        "// được khi khẩn cấp\" dài hơn nhiều.\n" +
        "@Service\n" +
        "public class ProductService {\n" +
        "    private static final Duration FRESH = Duration.ofMinutes(5);\n" +
        "    private static final Duration STALE = Duration.ofHours(24);   // dự phòng\n" +
        "\n" +
        "    public Product get(String id) {\n" +
        "        String key = \"product:\" + id;\n" +
        "        Cached<Product> c = cache.get(key);\n" +
        "\n" +
        "        if (c != null && c.age() < FRESH) return c.value();       // còn tươi\n" +
        "\n" +
        "        try {\n" +
        "            Product p = productClient.get(id);\n" +
        "            cache.put(key, p, STALE);                              // lưu với TTL DÀI\n" +
        "            return p;\n" +
        "        } catch (Exception e) {\n" +
        "            if (c != null) {\n" +
        "                // Downstream chết -> dùng bản CŨ thay vì trả lỗi\n" +
        "                metrics.increment(\"stale.served\");\n" +
        "                log.warn(\"dùng dữ liệu cũ {} tuổi cho {}\", c.age(), id);\n" +
        "                return c.value();\n" +
        "            }\n" +
        "            throw e;      // không có gì trong cache -> đành phải lỗi\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: downstream chết 10 phút mà người dùng gần như không nhận ra.\n" +
        "// Đây là một trong những kỹ thuật chịu lỗi hiệu quả nhất trên mỗi dòng code bỏ ra.\n" +
        "\n" +
        "// KHI NÀO KHÔNG DÙNG: dữ liệu mà việc hiển thị SAI gây hậu quả —\n" +
        "// số dư tài khoản, tồn kho lúc thanh toán, giá đang khuyến mãi.\n" +
        "// -> Với những dữ liệu đó, thà báo lỗi rõ ràng còn hơn hiển thị sai.\n" +
        "\n" +
        "// BẮT BUỘC: đo tỉ lệ phục vụ dữ liệu cũ và cảnh báo khi nó tăng.\n" +
        "// Không đo thì downstream có thể chết cả ngày mà không ai biết.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-1epgfac',
  q: 'Client-side load balancing vs server-side — khác nhau?',
  answer:
    '**Server-side**: client gọi một địa chỉ ảo (load balancer / API gateway); LB chọn instance backend. Đơn giản cho client, nhưng LB là một hop thêm + điểm nghẽn tiềm tàng.\n\n' +
    '**Client-side**: client lấy **danh sách instance** từ service registry (Eureka, Consul, k8s Endpoints) và **tự chọn** (round-robin, least-connection, zone-aware). Không hop thừa, latency thấp hơn, load balancing thông minh hơn (biết health, zone). Nhược: logic LB nằm trong mọi client (thư viện / sidecar).\n\n' +
    'Service mesh (Istio) đẩy client-side LB xuống **sidecar** → client không cần thư viện, vẫn có lợi ích.',
  essence:
    'Server-side LB: một điểm điều phối, client "ngu". Client-side LB: client (hoặc sidecar của nó) biết topology và tự định tuyến — nhanh hơn, linh hoạt hơn, phổ biến trong microservices hiện đại.',
  example:
    'Spring Cloud LoadBalancer: `order-service` gọi `http://inventory-service/...` — thư viện resolve `inventory-service` từ Eureka thành 5 IP, chọn theo round-robin, bỏ instance unhealthy. Không qua LB trung tâm.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Server-side LB', 'Client-side LB'],
    rows: [
      ['Client gọi', 'một địa chỉ ảo (LB/gateway)', 'lấy danh sách instance từ registry, tự chọn'],
      ['Hop', 'một hop thêm + điểm nghẽn tiềm tàng', 'không hop thừa, latency thấp hơn'],
      ['Thông minh', 'cơ bản', 'zone-aware, biết health, least-connection'],
      ['Logic LB nằm ở', 'trung tâm', 'mọi client (thư viện) hoặc sidecar (service mesh)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ai quyết định gọi instance nào",
      code:
        "// SERVER-SIDE: client gọi MỘT địa chỉ (load balancer/Service của K8s),\n" +
        "// hạ tầng chọn instance.\n" +
        "restClient.get().uri(\"http://payment-service/payments/{id}\", id);\n" +
        "// Trong Kubernetes, \"payment-service\" là ClusterIP Service — kube-proxy\n" +
        "// chọn pod. Client không biết gì về danh sách instance.\n" +
        "// + client đơn giản, không phụ thuộc ngôn ngữ, dễ vận hành\n" +
        "// - thêm MỘT CHẶNG mạng; LB là điểm phụ thuộc chung\n" +
        "\n" +
        "// CLIENT-SIDE: client TỰ lấy danh sách instance và tự chọn\n" +
        "@LoadBalanced          // Spring Cloud LoadBalancer\n" +
        "@Bean RestClient.Builder builder() { return RestClient.builder(); }\n" +
        "// Client hỏi registry (Eureka/Consul) danh sách instance, rồi tự áp dụng\n" +
        "// thuật toán chọn: round-robin, random, least-connections, zone-aware.\n" +
        "// + không thêm chặng mạng -> độ trễ thấp hơn\n" +
        "// + chọn được theo VÙNG (ưu tiên instance cùng AZ -> giảm phí liên vùng)\n" +
        "// + thuật toán thông minh hơn (theo độ trễ thực đo, theo tải)\n" +
        "// - mỗi ngôn ngữ phải có thư viện riêng\n" +
        "// - client phải xử lý cache danh sách, làm mới, và instance chết\n" +
        "\n" +
        "// SERVICE MESH — kết hợp ưu điểm của cả hai: SIDECAR làm client-side\n" +
        "// load balancing, nhưng ứng dụng không cần biết gì.\n" +
        "// Ứng dụng gọi http://payment-service như bình thường; Envoy chặn lại,\n" +
        "// biết toàn bộ topology, và chọn endpoint tối ưu (kèm retry, circuit\n" +
        "// breaker, mTLS, tracing) — không cần thư viện cho từng ngôn ngữ.\n" +
        "\n" +
        "// THỰC TẾ HIỆN NAY: trên Kubernetes, mặc định dùng Service (server-side);\n" +
        "// cần điều khiển tinh vi hơn thì thêm service mesh.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-9ceh5t',
  q: 'Phối hợp Timeout + Retry + Circuit Breaker + Fallback — thứ tự thế nào?',
  answer:
    'Xếp lớp từ trong ra ngoài (thứ tự decorator điển hình, ví dụ Resilience4j):\n\n' +
    '`Fallback( Retry( CircuitBreaker( TimeLimiter( Bulkhead( call ) ) ) ) )`\n\n' +
    '- **Bulkhead**: giới hạn concurrency vào call.\n' +
    '- **TimeLimiter/Timeout**: mỗi lần thử có hạn.\n' +
    '- **CircuitBreaker**: nếu đang OPEN, chặn ngay (không tốn retry).\n' +
    '- **Retry**: thử lại lỗi tạm thời (với backoff+jitter); mỗi lần thử vẫn qua circuit breaker + timeout.\n' +
    '- **Fallback**: khi tất cả thất bại (hết retry, hoặc circuit OPEN) → trả giá trị thay thế.\n\n' +
    'Quan trọng: circuit breaker **bọc ngoài** retry để khi mạch mở, không retry vô ích.',
  essence:
    'Các mẫu resilience không loại trừ nhau — chúng xếp lớp. Sai thứ tự (retry ngoài circuit breaker) làm hỏng tác dụng: bạn retry cả khi service rõ ràng đang chết.',
  example:
    '`recommendationClient`: Bulkhead 20, Timeout 200ms, CircuitBreaker (mở khi >50% lỗi/10s), Retry 2 lần backoff 50ms+jitter, Fallback = danh sách "sản phẩm phổ biến" tĩnh. Recommendation down → sau vài giây circuit OPEN → mọi request nhận fallback ngay, 0ms, không retry.',
  viz: {
    type: 'layers',
    title: 'Các mẫu resilience xếp lớp — sai thứ tự làm hỏng tác dụng',
    layers: [
      { name: 'Fallback', tag: 'ngoài cùng', note: 'khi tất cả thất bại → trả giá trị thay thế' },
      { name: 'Retry', tag: 'backoff + jitter', note: 'thử lại lỗi tạm thời; mỗi lần vẫn qua circuit breaker + timeout' },
      { name: 'CircuitBreaker', tag: 'bọc NGOÀI retry', note: 'nếu đang OPEN → chặn ngay, không retry vô ích' },
      { name: 'TimeLimiter / Timeout', tag: '', note: 'mỗi lần thử có hạn' },
      { name: 'Bulkhead', tag: 'trong cùng', note: 'giới hạn concurrency vào call' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Thứ tự lồng nhau quyết định hành vi",
      code:
        "// THỨ TỰ ĐÚNG (từ ngoài vào trong):\n" +
        "//   Fallback ( CircuitBreaker ( Retry ( TimeLimiter ( Bulkhead ( CALL ) ) ) ) )\n" +
        "@Bulkhead(name = \"payment\", type = Bulkhead.Type.THREADPOOL)\n" +
        "@TimeLimiter(name = \"payment\")\n" +
        "@Retry(name = \"payment\")\n" +
        "@CircuitBreaker(name = \"payment\", fallbackMethod = \"fallback\")\n" +
        "public CompletableFuture<PaymentResult> charge(String orderId) {\n" +
        "    return supplyAsync(() -> paymentClient.charge(orderId));\n" +
        "}\n" +
        "public CompletableFuture<PaymentResult> fallback(String orderId, Throwable t) {\n" +
        "    return completedFuture(PaymentResult.deferred(orderId));\n" +
        "}\n" +
        "// (Trong Resilience4j với annotation, thứ tự áp dụng mặc định chính là:\n" +
        "//  Retry > CircuitBreaker > RateLimiter > TimeLimiter > Bulkhead.)\n" +
        "\n" +
        "// VÌ SAO THỨ TỰ NÀY:\n" +
        "// 1) TIMEOUT phải NẰM TRONG retry — mỗi LẦN THỬ có timeout riêng, nếu không\n" +
        "//    một lần thử treo vô hạn sẽ chặn mọi lần thử sau.\n" +
        "// 2) RETRY nằm TRONG circuit breaker — breaker đếm KẾT QUẢ CUỐI CÙNG sau\n" +
        "//    khi đã retry hết. Ngược lại thì mỗi lần retry đều tính là một lỗi\n" +
        "//    và mạch mở quá sớm.\n" +
        "// 3) FALLBACK ngoài cùng — bắt cả lỗi thật lẫn CallNotPermittedException\n" +
        "//    khi mạch đang mở.\n" +
        "// 4) BULKHEAD trong cùng — giới hạn số call thực sự đi ra ngoài.\n" +
        "\n" +
        "// NGÂN SÁCH THỜI GIAN phải cộng lại không vượt deadline của tầng trên:\n" +
        "//   3 lần thử × 800ms timeout + backoff (100 + 200) = ~2,7s\n" +
        "//   -> tầng trên phải cho phép ít nhất 3s, nếu không retry là vô nghĩa.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-1a70sew',
  q: 'Chaos Engineering là gì và làm thế nào?',
  answer:
    'Chủ động **tiêm lỗi vào production (hoặc gần production)** một cách có kiểm soát để **xác minh** hệ thống chịu được — thay vì hy vọng.\n\n' +
    'Quy trình:\n' +
    '1. Định nghĩa "steady state" (metric bình thường: success rate, p99).\n' +
    '2. Đưa ra giả thuyết ("nếu instance X chết, error rate không tăng quá 1%").\n' +
    '3. Tiêm lỗi: kill instance, thêm latency, ngắt mạng, làm chậm DB, tăng CPU.\n' +
    '4. Đo: giả thuyết đúng không? Nếu sai → tìm ra điểm yếu, sửa.\n' +
    '5. Giảm "blast radius": bắt đầu nhỏ, tăng dần; có nút dừng khẩn.\n\n' +
    'Công cụ: Chaos Monkey, Gremlin, Litmus, toxiproxy, `tc` (network).',
  essence:
    'Bạn không biết hệ thống có resilient không cho tới khi *thử làm nó hỏng*. Chaos engineering biến "chắc là ổn" thành "đã kiểm chứng ổn" và tìm điểm yếu vào ban ngày thay vì lúc 3h sáng.',
  example:
    'Game day: đội SRE dùng toxiproxy thêm 300ms latency vào call `order → payment`. Phát hiện: circuit breaker cấu hình sai ngưỡng, không mở → order-service thread pool cạn sau 40s. Sửa cấu hình, chạy lại → error rate giữ dưới 0.5%.',
  viz: {
    type: 'cycle',
    title: 'Biến "chắc là ổn" thành "đã kiểm chứng ổn"',
    steps: [
      { label: 'Định nghĩa steady state', note: 'metric bình thường: success rate, p99' },
      { label: 'Đưa giả thuyết', note: '"nếu instance X chết, error rate không tăng quá 1%"' },
      { label: 'Tiêm lỗi (blast radius nhỏ)', note: 'kill instance, thêm latency, ngắt mạng, làm chậm DB' },
      { label: 'Đo & sửa điểm yếu', note: 'giả thuyết sai → tìm điểm yếu, sửa; có nút dừng khẩn' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Chủ động gây lỗi để kiểm chứng giả định",
      code:
        "# Chaos engineering không phải \"phá cho vui\". Nó là THÍ NGHIỆM có giả thuyết:\n" +
        "# \"Nếu payment-service chậm 3 giây, order-service vẫn phục vụ được với\n" +
        "#  tỉ lệ lỗi dưới 1%.\" -> gây lỗi -> ĐO -> xác nhận hoặc bác bỏ.\n" +
        "apiVersion: chaos-mesh.org/v1alpha1\n" +
        "kind: NetworkChaos\n" +
        "metadata:\n" +
        "  name: payment-delay\n" +
        "spec:\n" +
        "  action: delay\n" +
        "  mode: all\n" +
        "  selector:\n" +
        "    namespaces: [production]\n" +
        "    labelSelectors: { app: payment-service }\n" +
        "  delay:\n" +
        "    latency: \"3s\"\n" +
        "    jitter: \"500ms\"\n" +
        "  duration: \"5m\"\n" +
        "---\n" +
        "apiVersion: chaos-mesh.org/v1alpha1\n" +
        "kind: PodChaos\n" +
        "metadata:\n" +
        "  name: kill-random-pod\n" +
        "spec:\n" +
        "  action: pod-kill\n" +
        "  mode: one\n" +
        "  selector:\n" +
        "    labelSelectors: { app: order-service }",
    },
    {
      lang: "bash",
      title: "Quy trình năm bước và các loại thí nghiệm",
      code:
        "# 1) XÁC ĐỊNH TRẠNG THÁI ỔN ĐỊNH bằng số đo (tỉ lệ thành công, p99, throughput)\n" +
        "# 2) ĐẶT GIẢ THUYẾT rõ ràng, có ngưỡng\n" +
        "# 3) GÂY LỖI trong phạm vi HẸP (một pod, một service, tỉ lệ nhỏ traffic)\n" +
        "# 4) ĐO và so sánh với trạng thái ổn định\n" +
        "# 5) SỬA điểm yếu tìm được, rồi mở rộng phạm vi\n" +
        "\n" +
        "# CÁC LOẠI THÍ NGHIỆM, theo thứ tự nên làm:\n" +
        "#  - giết một pod ngẫu nhiên          -> kiểm tra tự phục hồi\n" +
        "#  - thêm độ trễ mạng                 -> kiểm tra timeout và circuit breaker\n" +
        "#  - gây mất gói tin                  -> kiểm tra retry\n" +
        "#  - làm cạn CPU/RAM                  -> kiểm tra resource limit và HPA\n" +
        "#  - ngắt kết nối tới database        -> kiểm tra fallback\n" +
        "#  - mất cả một AZ                    -> kiểm tra kiến trúc đa vùng\n" +
        "\n" +
        "# NGUYÊN TẮC AN TOÀN:\n" +
        "#  - bắt đầu ở STAGING, chỉ sang production khi đã tự tin\n" +
        "#  - luôn có NÚT DỪNG khẩn cấp\n" +
        "#  - làm trong GIỜ LÀM VIỆC, có người theo dõi\n" +
        "#  - thông báo trước cho các đội liên quan\n" +
        "#  - giới hạn \"bán kính vụ nổ\": một service, một AZ, một phần trăm traffic\n" +
        "# Netflix Chaos Monkey, AWS Fault Injection Simulator, Chaos Mesh, Litmus.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-17yh8qb',
  q: 'Health check trong microservices: liveness vs readiness vs startup?',
  answer:
    '- **Liveness**: "process còn sống và có thể phục hồi không?". Fail → orchestrator **restart** pod. Chỉ fail khi deadlock/hỏng không tự thoát. KHÔNG kiểm tra downstream ở đây.\n' +
    '- **Readiness**: "sẵn sàng nhận traffic chưa?". Fail → **rút khỏi load balancer** (không restart). Fail khi: đang warm-up, mất kết nối DB tạm thời, đang graceful shutdown, downstream critical chết.\n' +
    '- **Startup**: cho app khởi động chậm (nạp cache lớn) thời gian trước khi liveness bắt đầu tính.',
  essence:
    'Liveness = "restart nếu treo". Readiness = "ngừng gửi traffic nếu chưa/không sẵn sàng". Nhầm lẫn (liveness phụ thuộc DB) gây restart bão khi DB chập chờn — càng làm mọi thứ tệ hơn.',
  example:
    'DB chập chờn 30s: readiness fail → pod rút khỏi service (không nhận request mới), liveness vẫn pass (không restart). DB hồi → readiness pass → pod nhận traffic lại. Nếu để liveness phụ thuộc DB → K8s restart hàng loạt pod đúng lúc DB đang yếu.',
  viz: {
    type: 'compare',
    corner: 'Probe',
    cols: ['Liveness', 'Readiness', 'Startup'],
    rows: [
      ['Câu hỏi', 'process còn sống, phục hồi được?', 'sẵn sàng nhận traffic chưa?', 'app khởi động chậm đã xong chưa?'],
      ['Fail → hành động', 'restart pod', 'rút khỏi load balancer (không restart)', 'hoãn liveness cho tới khi pass'],
      ['Kiểm tra downstream?', 'KHÔNG', 'có (DB, downstream critical)', '—'],
      ['Fail khi', 'deadlock/hỏng không tự thoát', 'warm-up, mất DB tạm, graceful shutdown', 'đang nạp cache lớn' ],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Ba loại probe cho ba câu hỏi khác nhau",
      code:
        "livenessProbe:                      # \"Tiến trình còn cứu được không?\"\n" +
        "  httpGet: { path: /actuator/health/liveness, port: 8080 }\n" +
        "  periodSeconds: 10\n" +
        "  failureThreshold: 3               # NỚI TAY: sai là bị GIẾT và tạo pod mới\n" +
        "readinessProbe:                     # \"Nhận traffic được chưa?\"\n" +
        "  httpGet: { path: /actuator/health/readiness, port: 8080 }\n" +
        "  periodSeconds: 5\n" +
        "  failureThreshold: 1               # CHẶT TAY: rút traffic là hành động rẻ\n" +
        "startupProbe:                       # \"Đã khởi động xong chưa?\"\n" +
        "  httpGet: { path: /actuator/health/liveness, port: 8080 }\n" +
        "  failureThreshold: 30\n" +
        "  periodSeconds: 10                 # cho phép tối đa 300 giây để khởi động\n" +
        "# startupProbe TẠM DỪNG hai probe kia trong lúc khởi động -> ứng dụng Java\n" +
        "# khởi động chậm không bị giết oan, mà liveness vẫn nhạy khi đã chạy ổn định.",
    },
    {
      lang: "java",
      title: "Nội dung mỗi probe nên kiểm tra gì",
      code:
        "// LIVENESS — CHỈ kiểm tra tiến trình còn lành mạnh. TUYỆT ĐỐI KHÔNG\n" +
        "// kiểm tra dependency bên ngoài.\n" +
        "@Component\n" +
        "public class LivenessIndicator implements HealthIndicator {\n" +
        "    @Override public Health health() {\n" +
        "        return deadlockDetected() ? Health.down().build() : Health.up().build();\n" +
        "    }\n" +
        "}\n" +
        "// LỖI KINH ĐIỂN: đưa DB check vào liveness. DB chậm 30 giây -> Kubernetes\n" +
        "// GIẾT SẠCH mọi pod cùng lúc, và pod mới cũng không lên nổi vì DB vẫn chậm\n" +
        "// -> biến sự cố nhỏ thành sự cố toàn phần.\n" +
        "\n" +
        "// READINESS — kiểm tra những thứ CẦN ĐỂ PHỤC VỤ REQUEST\n" +
        "@Component\n" +
        "public class ReadinessIndicator implements HealthIndicator {\n" +
        "    @Override public Health health() {\n" +
        "        if (!db.isReachable())        return Health.down().withDetail(\"db\", \"down\").build();\n" +
        "        if (cache.isCold())           return Health.down().withDetail(\"cache\", \"warming\").build();\n" +
        "        if (threadPool.isSaturated()) return Health.down().withDetail(\"pool\", \"full\").build();\n" +
        "        return Health.up().build();\n" +
        "    }\n" +
        "}\n" +
        "// Dependency KHÔNG CỐT LÕI thì đừng đưa vào readiness — nếu không, service\n" +
        "// gợi ý chết sẽ khiến toàn bộ pod bị rút khỏi load balancer.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-xl7zmd',
  q: 'Kiểm thử khả năng chịu lỗi (fault injection) trong CI/staging?',
  answer:
    'Không cần chờ chaos ở production. Test resilience sớm hơn:\n' +
    '- **Unit/component test**: mock downstream trả 503, timeout, response méo → assert circuit breaker mở, fallback được gọi, không crash.\n' +
    '- **Toxiproxy** giữa service và downstream trong integration test: thêm latency, cắt connection, giới hạn bandwidth.\n' +
    '- **Testcontainers** dựng downstream thật rồi `pause`/`kill` container giữa test.\n' +
    '- **Contract test cho lỗi**: provider cũng nên khai báo "tôi có thể trả 429/503" trong contract.\n' +
    '- Load test kèm fault (k6 + inject lỗi).',
  essence:
    'Resilience là một thuộc tính phải test như bất kỳ tính năng nào. "Happy path test" không bao giờ phát hiện circuit breaker cấu hình sai — phải chủ động tạo ra lỗi trong test.',
  example:
    'Integration test: khởi động `payment-mock` qua Toxiproxy. Test 1: proxy thêm latency 5s → assert order-service timeout sau 200ms + trả `PAYMENT_TIMEOUT`. Test 2: proxy `down` → assert sau 10 request circuit OPEN + response < 5ms.',
  viz: {
    type: 'tree',
    title: 'Resilience là thuộc tính phải test như bất kỳ tính năng nào',
    root: {
      label: '"Happy path test" không bao giờ phát hiện circuit breaker cấu hình sai',
      children: [
        { label: 'Unit/component test', note: 'mock downstream trả 503/timeout/response méo → assert breaker mở, fallback chạy' },
        { label: 'Toxiproxy trong integration test', note: 'thêm latency, cắt connection, giới hạn bandwidth' },
        { label: 'Testcontainers', note: 'dựng downstream thật rồi pause/kill container giữa test' },
        { label: 'Contract test cho lỗi', note: 'provider khai báo "tôi có thể trả 429/503"' },
        { label: 'Load test kèm fault', note: 'k6 + inject lỗi' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Tự động hoá việc kiểm chứng cơ chế chịu lỗi",
      code:
        "// Cơ chế chịu lỗi KHÔNG BAO GIỜ được kiểm thử = cơ chế không hoạt động.\n" +
        "// Phải có test tự động cho từng cơ chế.\n" +
        "@SpringBootTest\n" +
        "class ResilienceTest {\n" +
        "    @RegisterExtension\n" +
        "    static WireMockExtension payment = WireMockExtension.newInstance()\n" +
        "        .options(wireMockConfig().port(8089)).build();\n" +
        "\n" +
        "    @Test\n" +
        "    void tra_ve_fallback_khi_downstream_timeout() {\n" +
        "        payment.stubFor(post(\"/payments\")\n" +
        "            .willReturn(aResponse().withFixedDelay(5000)));   // giả lập chậm\n" +
        "\n" +
        "        PaymentResult r = orderService.charge(\"order-1\");\n" +
        "        assertThat(r.status()).isEqualTo(DEFERRED);           // fallback hoạt động\n" +
        "    }\n" +
        "\n" +
        "    @Test\n" +
        "    void mo_mach_sau_nhieu_loi_lien_tiep() {\n" +
        "        payment.stubFor(post(\"/payments\").willReturn(aResponse().withStatus(500)));\n" +
        "        for (int i = 0; i < 25; i++) orderService.charge(\"o\" + i);\n" +
        "\n" +
        "        assertThat(breakerRegistry.circuitBreaker(\"payment\").getState())\n" +
        "            .isEqualTo(CircuitBreaker.State.OPEN);\n" +
        "        // Và khi mạch mở, không còn request nào đi tới downstream:\n" +
        "        payment.verify(lessThan(25), postRequestedFor(urlEqualTo(\"/payments\")));\n" +
        "    }\n" +
        "\n" +
        "    @Test\n" +
        "    void khong_retry_thao_tac_khong_idempotent() {\n" +
        "        payment.stubFor(post(\"/payments\").willReturn(aResponse().withStatus(500)));\n" +
        "        assertThatThrownBy(() -> orderService.chargeUnsafe(\"o1\"));\n" +
        "        payment.verify(exactly(1), postRequestedFor(urlEqualTo(\"/payments\")));\n" +
        "    }\n" +
        "}\n" +
        "// Ở STAGING: dùng Toxiproxy hoặc Chaos Mesh để gây lỗi mạng thật, chạy\n" +
        "// tải, và kiểm tra SLO có được giữ không. Đưa vào pipeline định kỳ,\n" +
        "// không phải chỉ làm một lần.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-1ii8u7v',
  q: 'Rate limiting: các thuật toán (fixed/sliding window, token bucket) và đặt ở đâu?',
  answer:
    '- **Fixed window**: đếm request trong mỗi cửa sổ thời gian (mỗi phút). Đơn giản nhưng cho **burst gấp đôi** ở ranh giới cửa sổ.\n' +
    '- **Sliding window log**: lưu timestamp từng request, đếm trong cửa sổ trượt. Chính xác, tốn bộ nhớ.\n' +
    '- **Sliding window counter**: nội suy giữa hai cửa sổ — gần chính xác, rẻ.\n' +
    '- **Token bucket**: bucket đầy N token, hồi r token/giây; mỗi request tiêu 1 token. Cho phép **burst có kiểm soát**. Phổ biến nhất cho API.\n\n' +
    'Đặt ở: **API Gateway** (per client/API key, coarse), và/hoặc **trong service** (bảo vệ tài nguyên riêng như DB/downstream). State chia sẻ (Redis) khi có nhiều instance.',
  essence:
    'Token bucket là lựa chọn mặc định (burst mượt + tốc độ ổn định). Rate limit ở gateway bảo vệ toàn hệ; rate limit trong service bảo vệ tài nguyên cụ thể của nó. Với nhiều instance cần counter dùng chung (Redis + Lua nguyên tử).',
  example:
    'Gateway: token bucket 100 req/phút/user (Redis). `order-service` thêm rate limit nội bộ 50 req/s cho việc gọi `payment-provider` (đối tác giới hạn 60/s) — để một spike đơn hàng không làm mình bị đối tác chặn.',
  viz: {
    type: 'compare',
    corner: 'Thuật toán',
    cols: ['Fixed window', 'Sliding window log', 'Sliding window counter', 'Token bucket'],
    rows: [
      ['Độ chính xác', 'burst gấp đôi ở ranh giới', 'chính xác', 'gần chính xác', 'burst có kiểm soát'],
      ['Chi phí bộ nhớ', 'thấp', 'cao (lưu mọi timestamp)', 'thấp', 'thấp'],
      ['Phổ biến cho API', 'ít', 'ít', 'trung bình', 'nhất (mặc định)'],
    ],
  },
  demo: [
    {
      lang: "lua",
      title: "Sliding window bằng Redis, nguyên tử",
      code:
        "-- Phải NGUYÊN TỬ: đọc số hiện tại, so sánh, rồi ghi. Tách lệnh thì hai\n" +
        "-- request đồng thời cùng thấy 99 và cùng cho qua.\n" +
        "local key    = KEYS[1]\n" +
        "local now    = tonumber(ARGV[1])      -- mili giây\n" +
        "local window = tonumber(ARGV[2])\n" +
        "local limit  = tonumber(ARGV[3])\n" +
        "\n" +
        "redis.call(\u0027ZREMRANGEBYSCORE\u0027, key, 0, now - window)   -- bỏ phần ngoài cửa sổ\n" +
        "local count = redis.call(\u0027ZCARD\u0027, key)\n" +
        "if count >= limit then\n" +
        "  return {0, limit - count}                            -- từ chối\n" +
        "end\n" +
        "redis.call(\u0027ZADD\u0027, key, now, now .. \u0027-\u0027 .. math.random())\n" +
        "redis.call(\u0027PEXPIRE\u0027, key, window)\n" +
        "return {1, limit - count - 1}",
    },
    {
      lang: "yaml",
      title: "Đặt ở đâu và các thuật toán",
      code:
        "# BỐN THUẬT TOÁN:\n" +
        "#  FIXED WINDOW    — đơn giản nhất, nhưng cho phép GẤP ĐÔI ở ranh giới cửa sổ\n" +
        "#  SLIDING LOG     — chính xác nhất, tốn bộ nhớ (một bản ghi mỗi request)\n" +
        "#  SLIDING COUNTER — xấp xỉ, cân bằng tốt giữa chính xác và chi phí\n" +
        "#  TOKEN BUCKET    — cho phép BURST có kiểm soát; tốt nhất cho API công khai\n" +
        "\n" +
        "# ĐẶT Ở ĐÂU — nên có NHIỀU TẦNG:\n" +
        "# 1) EDGE/CDN — chặn tấn công thô, rẻ nhất vì chặn trước khi vào hạ tầng\n" +
        "# 2) API GATEWAY — giới hạn theo API key/tenant, đây là tầng chính\n" +
        "apiVersion: networking.istio.io/v1alpha3\n" +
        "kind: EnvoyFilter\n" +
        "metadata: { name: rate-limit }\n" +
        "spec:\n" +
        "  configPatches:\n" +
        "    - applyTo: HTTP_FILTER\n" +
        "      patch:\n" +
        "        value:\n" +
        "          name: envoy.filters.http.local_ratelimit\n" +
        "          typed_config:\n" +
        "            token_bucket:\n" +
        "              max_tokens: 1000\n" +
        "              tokens_per_fill: 1000\n" +
        "              fill_interval: 60s\n" +
        "# 3) SERVICE — bảo vệ tài nguyên cụ thể (endpoint đắt, gọi bên thứ ba)\n" +
        "# 4) DATABASE/downstream — connection pool cũng là một dạng giới hạn\n" +
        "\n" +
        "# LUÔN TRẢ HEADER CHUẨN để client tự điều tiết:\n" +
        "#   X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After\n" +
        "# Trả 429 Too Many Requests, không phải 503.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-xn4w2p',
  q: 'Timeout budget và deadline propagation xuyên chuỗi call?',
  answer:
    'Thay vì mỗi service đặt timeout độc lập (thường tuỳ hứng), truyền một **hạn chót chung** cho cả request.\n\n' +
    '- Entry point (gateway) đặt budget, ví dụ 800ms.\n' +
    '- Mỗi hop trừ đi thời gian đã dùng + ước tính overhead, truyền **thời gian còn lại** xuống hop sau (header `X-Deadline` / gRPC deadline).\n' +
    '- Service nào thấy "thời gian còn lại không đủ để làm việc" → fail fast ngay, không gọi tiếp downstream.\n' +
    '- Timeout cục bộ của mỗi call = min(timeout mặc định của call đó, thời gian còn lại trong budget).',
  essence:
    'Timeout budget đảm bảo tổng thời gian của cả chuỗi có trần cứng, và không service nào làm việc cho một request mà client đã (hoặc sắp) bỏ cuộc. Biến "N timeout rời rạc" thành "một hạn chót".',
  example:
    'Budget 800ms. Gateway→A (dùng 150ms)→B: B nhận deadline 650ms còn lại. B query DB 200ms, gọi C với deadline 400ms. C thấy công việc cần 500ms > 400ms → trả `DEADLINE_EXCEEDED` ngay, B trả kết quả một phần. Tổng < 800ms, không có call "mồ côi" chạy tiếp sau khi client timeout.',
  viz: {
    type: 'sequence',
    title: 'Biến "N timeout rời rạc" thành "một hạn chót"',
    actors: ['gateway', 'A', 'B', 'C'],
    messages: [
      { from: 0, to: 1, label: 'budget = 800ms' },
      { from: 1, to: 2, label: 'A dùng 150ms → B nhận deadline còn 650ms' },
      { from: 2, to: 3, label: 'B query DB 200ms → gọi C với deadline 400ms' },
      { from: 3, to: 2, label: 'C: việc cần 500ms > 400ms → DEADLINE_EXCEEDED ngay' },
      { from: 2, to: 0, label: 'B trả kết quả một phần — tổng < 800ms, không call "mồ côi"' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một ngân sách thời gian cho cả request",
      code:
        "// Ý tưởng: request có tổng ngân sách (ví dụ 3 giây). Mỗi tầng TIÊU một\n" +
        "// phần và truyền phần CÒN LẠI xuống dưới.\n" +
        "public class Deadline {\n" +
        "    private static final ThreadLocal<Long> DEADLINE = new ThreadLocal<>();\n" +
        "\n" +
        "    public static void set(long epochMillis) { DEADLINE.set(epochMillis); }\n" +
        "    public static long remaining() {\n" +
        "        Long d = DEADLINE.get();\n" +
        "        return d == null ? Long.MAX_VALUE : d - System.currentTimeMillis();\n" +
        "    }\n" +
        "    public static void checkOrThrow() {\n" +
        "        if (remaining() <= 0) throw new DeadlineExceededException();\n" +
        "    }\n" +
        "    public static void clear() { DEADLINE.remove(); }\n" +
        "}\n" +
        "\n" +
        "// Ở BIÊN: đặt deadline từ header hoặc giá trị mặc định\n" +
        "@Component\n" +
        "public class DeadlineFilter extends OncePerRequestFilter {\n" +
        "    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,\n" +
        "                                    FilterChain chain) throws IOException, ServletException {\n" +
        "        String h = req.getHeader(\"X-Request-Deadline\");\n" +
        "        Deadline.set(h != null ? Long.parseLong(h) : System.currentTimeMillis() + 3000);\n" +
        "        try { chain.doFilter(req, res); } finally { Deadline.clear(); }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// KHI GỌI XUỐNG DƯỚI: truyền deadline và dùng phần còn lại làm timeout\n" +
        "public Order fetch(String id) {\n" +
        "    Deadline.checkOrThrow();                       // đã hết hạn -> dừng ngay\n" +
        "    long remaining = Deadline.remaining() - 50;    // trừ dự phòng cho việc gộp\n" +
        "    return restClient.get().uri(\"/orders/{id}\", id)\n" +
        "        .header(\"X-Request-Deadline\", String.valueOf(System.currentTimeMillis() + remaining))\n" +
        "        .retrieve().body(Order.class);\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: khi tầng ngoài đã bỏ cuộc, mọi tầng bên trong DỪNG NGAY thay vì\n" +
        "// tiếp tục làm việc vô ích — đây là điểm khác biệt lớn so với timeout độc lập.\n" +
        "// gRPC làm sẵn việc này; với HTTP thì phải tự quy ước như trên.\n" +
        "// Nhớ truyền deadline qua cả ranh giới thread (thread pool, @Async).",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-1yp20ln',
  q: 'Xử lý partial failure trong API composition (một downstream lỗi)?',
  answer:
    'Composer gọi 4 service để dựng một response; service #3 timeout. Lựa chọn:\n' +
    '- **Fail cả request** — chỉ khi service đó critical (thiếu nó response vô nghĩa/nguy hiểm).\n' +
    '- **Trả một phần (partial response)** — với `_meta` báo phần nào thiếu; client render những gì có, hiện placeholder cho phần thiếu.\n' +
    '- **Giá trị mặc định / cache stale** cho phần thiếu.\n\n' +
    'Kỹ thuật: gọi **song song** (không tuần tự) với timeout riêng từng call; dùng `CompletableFuture.allOf` + `exceptionally` per-future; đánh dấu field nào là "best-effort".',
  essence:
    'Composition = gộp nhiều nguồn có độ tin cậy khác nhau. Thiết kế response để **chịu được thiếu một phần**: phân loại field critical/optional, trả partial + metadata thay vì all-or-nothing.',
  example:
    'Trang sản phẩm: `catalog` (critical), `price` (critical), `reviews` (optional), `recommendations` (optional). `reviews` timeout → response trả `{product, price, reviews: null, _degraded: ["reviews"]}` → UI hiện "Không tải được đánh giá" nhưng vẫn cho mua.',
  viz: {
    type: 'tree',
    title: 'Thiết kế response để chịu được thiếu một phần',
    root: {
      label: 'Composer gọi 4 service — service #3 timeout',
      children: [
        { label: 'Fail cả request', note: 'CHỈ khi service đó critical (thiếu nó response vô nghĩa/nguy hiểm)' },
        { label: 'Partial response + _meta', note: 'client render phần có, placeholder cho phần thiếu' },
        { label: 'Giá trị mặc định / cache stale', note: 'cho phần thiếu' },
        { label: 'Gọi song song, timeout riêng từng call', note: 'CompletableFuture.allOf + exceptionally per-future' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Một downstream lỗi không nên làm hỏng cả response",
      code:
        "@Service\n" +
        "public class DashboardService {\n" +
        "    public DashboardResponse load(String userId) {\n" +
        "        var profileF = supplyAsync(() -> profileClient.get(userId), pool);\n" +
        "        var ordersF  = supplyAsync(() -> orderClient.recent(userId), pool);\n" +
        "        var recsF    = supplyAsync(() -> recommendClient.get(userId), pool);\n" +
        "\n" +
        "        // BẮT BUỘC: thiếu cái này thì không dựng được trang -> lỗi thật\n" +
        "        Profile profile = profileF.orTimeout(500, MILLISECONDS).join();\n" +
        "\n" +
        "        // TUỲ CHỌN: lỗi thì đánh dấu phần đó là không khả dụng\n" +
        "        var orders = ordersF.orTimeout(500, MILLISECONDS)\n" +
        "            .handle((v, e) -> e == null ? Partial.ok(v) : Partial.<List<Order>>failed())\n" +
        "            .join();\n" +
        "        var recs = recsF.orTimeout(300, MILLISECONDS)\n" +
        "            .handle((v, e) -> e == null ? Partial.ok(v) : Partial.ok(popularItems()))\n" +
        "            .join();\n" +
        "\n" +
        "        return new DashboardResponse(profile, orders, recs);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// TRẢ VỀ CHO CLIENT một cách TƯỜNG MINH — đừng im lặng trả mảng rỗng,\n" +
        "// client không phân biệt được \"không có dữ liệu\" với \"lỗi\":\n" +
        "//   {\n" +
        "//     \"profile\": { ... },\n" +
        "//     \"orders\":  { \"status\": \"unavailable\", \"retryAfter\": 5 },\n" +
        "//     \"recommendations\": { \"status\": \"degraded\", \"data\": [...] }\n" +
        "//   }\n" +
        "// -> Frontend hiển thị đúng: phần nào có dữ liệu, phần nào đang lỗi,\n" +
        "//    và cho người dùng nút thử lại cho riêng phần đó.\n" +
        "\n" +
        "// PHÂN LOẠI TRƯỚC KHI VIẾT CODE: với mỗi downstream, trả lời câu hỏi\n" +
        "// \"thiếu dữ liệu này thì trang còn dùng được không?\" -> quyết định\n" +
        "// BẮT BUỘC hay TUỲ CHỌN. Đây là quyết định NGHIỆP VỤ, không phải kỹ thuật.\n" +
        "// Và luôn đo tỉ lệ suy giảm theo từng downstream.",
    },
  ],
},
{
  cat: 'Chịu lỗi',
  id: 'microservices-40vgox',
  q: 'Thundering herd khi service khởi động lại / cache lạnh?',
  answer:
    'Service restart / scale-out → cache in-memory trống → mọi request đầu tiên đều miss → **đồng loạt** gọi downstream/DB → downstream quá tải.\n\n' +
    'Tương tự: một key cache hot hết hạn → nhiều request cùng recompute.\n\n' +
    'Chống:\n' +
    '- **Single-flight / request coalescing**: nhiều request cùng key chờ **một** lần fetch (Go `singleflight`, Caffeine `AsyncCache`).\n' +
    '- **Cache warming** có kiểm soát khi startup (nạp top-N).\n' +
    '- **Staggered rollout**: không restart/scale tất cả instance cùng lúc.\n' +
    '- **TTL jitter** để key không hết hạn đồng loạt.\n' +
    '- Rate limit về phía downstream trong giai đoạn warm-up.',
  essence:
    'Cache lạnh + traffic cao = downstream bị đấm. Giải pháp cốt lõi: đảm bảo **chỉ một** request thực sự đi fetch cho mỗi key tại một thời điểm (single-flight), phần còn lại chờ và dùng chung kết quả.',
  example:
    'Deploy phiên bản mới, 20 pod restart cùng lúc, cache trống. Không single-flight: 20 pod × 1000 req/s đều miss → 20000 query/s xuống DB → DB sập. Có single-flight per-pod + rollout 4 pod/lần → DB thấy tối đa vài chục query/s.',
  viz: {
    type: 'flow',
    title: 'Đảm bảo CHỈ MỘT request thực sự đi fetch cho mỗi key tại một thời điểm',
    nodes: ['Restart / scale-out', 'Cache in-memory trống', 'Mọi request đầu đều miss', 'Đồng loạt gọi downstream/DB', 'Downstream quá tải'],
    steps: [
      { to: 2, label: 'Tương tự: một key hot hết hạn → nhiều request cùng recompute' },
      { to: 4, label: '20 pod × 1000 req/s miss → 20k query/s → DB sập' },
      { to: 4, label: 'Chống: single-flight/request coalescing, cache warming, staggered rollout, TTL jitter' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Đợt sóng đồng bộ sau khi khởi động lại",
      code:
        "// KỊCH BẢN: deploy xong, 20 pod cùng khởi động với cache RỖNG. Request đổ\n" +
        "// vào -> tất cả cùng miss cache -> tất cả cùng đập vào database -> DB sập\n" +
        "// -> pod bị đánh dấu không khoẻ -> restart -> lặp lại vòng chết.\n" +
        "\n" +
        "// 1) WARM CACHE TRƯỚC KHI NHẬN TRAFFIC — biện pháp hiệu quả nhất\n" +
        "@EventListener(ApplicationReadyEvent.class)\n" +
        "public void warmUp() {\n" +
        "    AvailabilityChangeEvent.publish(publisher, this, ReadinessState.REFUSING_TRAFFIC);\n" +
        "    cacheService.preloadHotData();      // nạp tập dữ liệu nóng\n" +
        "    AvailabilityChangeEvent.publish(publisher, this, ReadinessState.ACCEPTING_TRAFFIC);\n" +
        "}\n" +
        "// Readiness chỉ báo OK sau khi cache đã ấm -> load balancer chưa gửi request.\n" +
        "\n" +
        "// 2) KHOÁ CHỐNG TRÙNG khi nạp lại cùng một key (single-flight)\n" +
        "public Product get(String id) {\n" +
        "    Product cached = cache.get(id);\n" +
        "    if (cached != null) return cached;\n" +
        "    // Chỉ MỘT request được đi lấy; số còn lại chờ kết quả của nó\n" +
        "    return loadingCache.get(id, k -> productClient.get(k));\n" +
        "}\n" +
        "\n" +
        "// 3) TTL NGẪU NHIÊN — tránh mọi key hết hạn cùng lúc\n" +
        "cache.put(key, value, Duration.ofSeconds(3600 + random.nextInt(600)));\n" +
        "\n" +
        "// 4) KHỞI ĐỘNG LẦN LƯỢT, không đồng loạt\n" +
        "//   maxSurge: 1, maxUnavailable: 0  -> thay pod từng cái một\n" +
        "//   và thêm độ trễ ngẫu nhiên nhỏ lúc khởi động:\n" +
        "Thread.sleep(ThreadLocalRandom.current().nextInt(5000));\n" +
        "\n" +
        "// 5) GIỚI HẠN SỐ KẾT NỐI tới database ở mỗi pod -> DB không bao giờ nhận\n" +
        "//    quá số kết nối nó chịu được, dù có bao nhiêu pod.\n" +
        "\n" +
        "// 6) LOAD SHEDDING trong giai đoạn khởi động: từ chối bớt request thay vì\n" +
        "//    nhận hết rồi timeout tất cả.",
    },
  ],
},
]);
