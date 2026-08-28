SS.addQuestions('microservices', [
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
{
  cat: 'Chịu lỗi',
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
},
]);
