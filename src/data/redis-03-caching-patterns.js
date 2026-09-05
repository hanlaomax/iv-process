SS.addQuestions('redis', [
{
  cat: 'Pattern',
  q: 'Cache-aside (lazy loading) hoạt động thế nào? Ưu nhược điểm?',
  answer:
    'Luồng đọc: app `GET` từ Redis → **hit**: trả về; **miss**: đọc DB → `SET` vào Redis (kèm TTL) → trả về.\n\n' +
    'Luồng ghi: app cập nhật DB → **xoá** (hoặc cập nhật) key cache.\n\n' +
    'Ưu: chỉ cache dữ liệu thực sự được đọc; cache độc lập với DB (Redis chết vẫn chạy được, chỉ chậm). Nhược: mỗi cache miss = 1 lần DB + 1 lần ghi Redis (latency đầu tiên cao); có cửa sổ dữ liệu cũ (cache stale) giữa lúc DB đổi và cache bị xoá; nguy cơ stampede khi key hot hết hạn.',
  essence:
    'Cache-aside: ứng dụng chủ động quản lý cache, DB là nguồn sự thật, cache chỉ là bản sao có thể mất. Phổ biến nhất vì đơn giản và chịu lỗi tốt.',
  example:
    '`getUser(id)`: `redis.get("user:"+id)` → miss → `db.findUser(id)` → `redis.set("user:"+id, json, "EX", 300)`. `updateUser`: ghi DB xong `redis.del("user:"+id)`. Lần đọc tiếp theo nạp lại bản mới.',
  viz: {
    type: 'flow',
    title: 'Cache-aside (lazy loading) — phổ biến nhất',
    nodes: ['app GET Redis', 'hit → trả về', 'miss → đọc DB', 'SET Redis (kèm TTL) → trả về', 'write: update DB → XOÁ key cache'],
    steps: [
      { to: 1, label: 'chỉ cache dữ liệu thực sự được đọc' },
      { to: 3, label: 'cache miss đầu tiên = 1 DB + 1 ghi Redis (latency cao)' },
      { to: 4, label: 'cache độc lập với DB (Redis chết vẫn chạy, chỉ chậm); có cửa sổ stale + nguy cơ stampede' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Mẫu cache phổ biến nhất, và điểm yếu của nó",
      code:
        "public Product get(String id) {\n" +
        "    String key = \"product:\" + id;\n" +
        "\n" +
        "    // 1) ĐỌC cache trước\n" +
        "    String cached = redis.opsForValue().get(key);\n" +
        "    if (cached != null) return parse(cached);        // HIT\n" +
        "\n" +
        "    // 2) MISS -> đọc database\n" +
        "    Product p = repository.findById(id).orElseThrow();\n" +
        "\n" +
        "    // 3) GHI vào cache kèm TTL — TTL là bắt buộc, không có TTL thì dữ liệu\n" +
        "    //    cũ sẽ nằm mãi khi có lỗi invalidate\n" +
        "    redis.opsForValue().set(key, json(p), Duration.ofMinutes(30));\n" +
        "    return p;\n" +
        "}\n" +
        "\n" +
        "public void update(String id, Product p) {\n" +
        "    repository.save(p);                              // ghi DB TRƯỚC\n" +
        "    redis.delete(\"product:\" + id);                   // rồi XOÁ cache\n" +
        "}\n" +
        "\n" +
        "// ƯU:\n" +
        "//  - chỉ cache thứ THỰC SỰ được đọc -> tiết kiệm bộ nhớ\n" +
        "//  - cache chết thì hệ thống vẫn chạy (chậm hơn), không phụ thuộc cứng\n" +
        "//  - đơn giản, dễ hiểu, dễ debug\n" +
        "\n" +
        "// NHƯỢC (phải biết để xử lý):\n" +
        "//  1) request đầu tiên luôn CHẬM (cache miss)\n" +
        "//  2) STAMPEDE: cache hết hạn -> hàng nghìn request cùng miss cùng lúc\n" +
        "//     -> tất cả cùng đập vào DB (xem câu về stampede)\n" +
        "//  3) có cửa sổ dữ liệu CŨ giữa lúc ghi DB và lúc xoá cache",
    },
  ],
},
{
  cat: 'Pattern',
  q: 'Read-through, write-through và write-behind khác cache-aside thế nào?',
  answer:
    '- **Read-through**: app luôn hỏi **cache layer**; cache tự đọc DB khi miss (logic nạp nằm trong cache/library, không phải app).\n' +
    '- **Write-through**: app ghi vào cache; cache **đồng bộ** ghi xuống DB. Cache luôn nhất quán với DB, nhưng mỗi write chậm hơn.\n' +
    '- **Write-behind (write-back)**: app ghi vào cache; cache **bất đồng bộ** flush xuống DB theo lô. Write cực nhanh, nhưng **rủi ro mất dữ liệu** nếu cache chết trước khi flush, và DB tạm thời cũ.',
  essence:
    'Cache-aside/read-through: khác nhau ở "ai chứa logic nạp". Write-through đổi tốc độ ghi lấy nhất quán; write-behind đổi độ bền lấy tốc độ ghi.',
  example:
    'Write-behind hợp cho counter/metric chịu mất mát nhỏ: `INCR views:post:123` trong Redis, mỗi 10s một job flush tổng vào DB. Write-through hợp cho dữ liệu cần cache và DB luôn khớp (ít dùng vì phức tạp).',
  viz: {
    type: 'compare',
    cols: ['Cache-aside / Read-through', 'Write-through', 'Write-behind'],
    rows: [
      ['Khác nhau ở', 'ai chứa logic nạp (app vs cache layer)', 'app ghi cache → cache ĐỒNG BỘ ghi DB', 'app ghi cache → cache BẤT ĐỒNG BỘ flush DB theo lô'],
      ['Đánh đổi', '—', 'nhất quán, nhưng write chậm hơn', 'write cực nhanh, RỦI RO mất dữ liệu nếu cache chết trước flush'],
      ['Dùng cho', 'phổ biến nhất', 'cache & DB luôn khớp', 'counter/metric chịu mất mát nhỏ'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ai chịu trách nhiệm nói chuyện với database",
      code:
        "// CACHE-ASIDE: ỨNG DỤNG tự lo cả cache lẫn DB (xem câu trước).\n" +
        "\n" +
        "// READ-THROUGH: ứng dụng CHỈ nói chuyện với cache; cache tự đi lấy từ DB khi miss.\n" +
        "@Cacheable(value = \"products\", key = \"#id\")     // Spring Cache = read-through\n" +
        "public Product get(String id) {\n" +
        "    return repository.findById(id).orElseThrow();   // chỉ chạy khi MISS\n" +
        "}\n" +
        "// + code sạch, logic cache tập trung một chỗ\n" +
        "// - phải có cache provider hỗ trợ; khó kiểm soát chi tiết\n" +
        "\n" +
        "// WRITE-THROUGH: ghi vào cache VÀ database ĐỒNG BỘ, trong cùng thao tác.\n" +
        "@CachePut(value = \"products\", key = \"#p.id\")\n" +
        "public Product save(Product p) {\n" +
        "    return repository.save(p);\n" +
        "}\n" +
        "// + cache LUÔN nhất quán với DB, đọc sau ghi luôn đúng\n" +
        "// - mọi lần ghi đều chậm hơn; cache đầy dữ liệu có thể không ai đọc\n" +
        "\n" +
        "// WRITE-BEHIND (write-back): ghi vào CACHE rồi trả về ngay; một tiến trình\n" +
        "// nền ghi xuống DB sau (thường theo lô).\n" +
        "redis.opsForValue().set(key, json(p));\n" +
        "redis.opsForList().leftPush(\"write:queue\", id);     // job nền xử lý\n" +
        "// + ghi CỰC NHANH, gom được nhiều lần ghi thành một (đếm view, log)\n" +
        "// - RỦI RO MẤT DỮ LIỆU nếu cache chết trước khi kịp ghi xuống DB\n" +
        "// - phức tạp: phải xử lý retry, thứ tự, và xung đột\n" +
        "// -> chỉ dùng cho dữ liệu chấp nhận mất (bộ đếm, thống kê)",
    },
  ],
},
{
  cat: 'Nhất quán',
  diagram: 'cache-stampede',
  q: 'Cache stampede (thundering herd) là gì? Cách giảm thiểu?',
  answer:
    'Khi một key hot **hết hạn**, hàng nghìn request đồng thời miss cùng lúc → tất cả cùng lao xuống DB tính lại cùng một giá trị → DB quá tải (có thể sập).\n\n' +
    'Giảm thiểu:\n' +
    '- **Mutex / single-flight**: chỉ một request giành lock (`SET lock NX EX`) để nạp lại; các request khác chờ ngắn rồi đọc cache, hoặc trả giá trị cũ.\n' +
    '- **Early recomputation**: làm mới key **trước** khi hết hạn (probabilistic early expiration — xác suất tính lại tăng dần khi gần TTL).\n' +
    '- **TTL jitter**: thêm ngẫu nhiên vào TTL để các key không hết hạn cùng lúc.',
  essence:
    'Stampede = "cả đám cùng cache miss một lúc". Chống bằng cách đảm bảo **chỉ một** request tính lại (lock), hoặc tính lại **trước hạn** để không bao giờ có khoảnh khắc key vắng mặt.',
  example:
    'Trang chủ cache 60s, 20k req/s. Lúc key hết hạn: dùng Lua/`SET NX` lock — request đầu tiên nạp (giữ lock 5s), 19.999 request kia đọc lại cache (giờ đã có) hoặc nhận stale-while-revalidate. DB chỉ thấy 1 query thay vì 20k.',
  demo: [
    {
      lang: "java",
      title: "Một key hết hạn, hàng nghìn request cùng đập vào DB",
      code:
        "// VẤN ĐỀ: key nóng hết hạn lúc 10:00:00. 5.000 request đang chạy cùng miss,\n" +
        "// cả 5.000 cùng query DB. DB sập, và khi cache được ghi lại thì đã quá muộn.\n" +
        "\n" +
        "// CÁCH 1: KHOÁ MUTEX — chỉ một request được đi lấy dữ liệu\n" +
        "public Product get(String id) {\n" +
        "    String key = \"product:\" + id;\n" +
        "    String cached = redis.opsForValue().get(key);\n" +
        "    if (cached != null) return parse(cached);\n" +
        "\n" +
        "    String lockKey = \"lock:\" + key;\n" +
        "    boolean got = redis.opsForValue()\n" +
        "            .setIfAbsent(lockKey, \"1\", Duration.ofSeconds(10));\n" +
        "    if (got) {\n" +
        "        try {\n" +
        "            Product p = repository.findById(id).orElseThrow();\n" +
        "            redis.opsForValue().set(key, json(p), Duration.ofMinutes(30));\n" +
        "            return p;\n" +
        "        } finally {\n" +
        "            redis.delete(lockKey);\n" +
        "        }\n" +
        "    }\n" +
        "    // không lấy được khoá -> chờ ngắn rồi đọc lại cache\n" +
        "    Thread.sleep(50);\n" +
        "    return get(id);\n" +
        "}\n" +
        "\n" +
        "// CÁCH 2: LÀM MỚI SỚM XÁC SUẤT (probabilistic early expiration) — tốt nhất\n" +
        "// vì không có thời điểm nào toàn bộ cùng miss.\n" +
        "long ttl = redis.getExpire(key);\n" +
        "if (ttl < 300 && ThreadLocalRandom.current().nextDouble() < 0.1) {\n" +
        "    asyncRefresh(id);            // 10% request làm mới sớm, số còn lại dùng bản cũ\n" +
        "}\n" +
        "\n" +
        "// CÁCH 3: TTL NGẪU NHIÊN — trải thời điểm hết hạn ra\n" +
        "int ttlSeconds = 1800 + ThreadLocalRandom.current().nextInt(300);\n" +
        "\n" +
        "// CÁCH 4: KHÔNG BAO GIỜ hết hạn, job nền làm mới định kỳ (dữ liệu rất nóng).",
    },
  ],
},
{
  cat: 'Nhất quán',
  q: 'Cache penetration (đọc key không tồn tại) — xử lý thế nào?',
  answer:
    'Request liên tục hỏi key **không tồn tại trong cả cache lẫn DB** (id ngẫu nhiên, tấn công) → mọi request đều miss cache và đập vào DB.\n\n' +
    'Xử lý:\n' +
    '- **Null caching**: cache cả kết quả "không tìm thấy" với TTL ngắn (`SET user:X "__NULL__" EX 60`).\n' +
    '- **Bloom filter**: giữ một bloom filter các id **thực sự tồn tại**; nếu bloom nói "chắc chắn không có" → trả 404 ngay, không chạm DB.\n' +
    '- Validate input (id đúng format/khoảng) trước khi tra.',
  essence:
    'Penetration = "miss có chủ đích/vô hạn". Null caching chặn lặp lại cùng một id không tồn tại; bloom filter chặn cả không gian id không tồn tại với bộ nhớ nhỏ.',
  example:
    'API `/product/{id}` bị quét id ngẫu nhiên: thêm `BF.EXISTS product:bloom <id>` (bloom chứa mọi product id thật). Bloom nói "không" → 404 tức thì. Bloom nói "có thể" → tra cache/DB bình thường. False positive nhỏ chỉ khiến vài request thừa xuống DB.',
  viz: {
    type: 'tree',
    title: 'Cache penetration — "miss có chủ đích/vô hạn" (id không có trong cả cache lẫn DB)',
    root: {
      label: 'Mọi request đều miss cache và đập vào DB',
      children: [
        { label: 'Null caching', note: 'cache cả kết quả "không tìm thấy" với TTL ngắn (SET user:X "__NULL__" EX 60)' },
        { label: 'Bloom filter', note: 'giữ bloom các id THỰC SỰ tồn tại; bloom nói "chắc chắn không" → 404 ngay' },
        { label: 'Validate input', note: 'id đúng format/khoảng trước khi tra' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Request tìm thứ không tồn tại, cache không đỡ được",
      code:
        "// VẤN ĐỀ: kẻ tấn công (hoặc bug) query id không tồn tại liên tục.\n" +
        "// Cache luôn MISS (vì không có gì để cache), mọi request đều xuống DB.\n" +
        "\n" +
        "// CÁCH 1: NEGATIVE CACHING — cache cả kết quả \"không tồn tại\", TTL NGẮN\n" +
        "public Product get(String id) {\n" +
        "    String key = \"product:\" + id;\n" +
        "    String cached = redis.opsForValue().get(key);\n" +
        "    if (\"__NULL__\".equals(cached)) return null;      // biết chắc không tồn tại\n" +
        "    if (cached != null) return parse(cached);\n" +
        "\n" +
        "    Product p = repository.findById(id).orElse(null);\n" +
        "    if (p == null) {\n" +
        "        // TTL NGẮN: nếu sau đó bản ghi được tạo thật thì cache sai không kéo dài\n" +
        "        redis.opsForValue().set(key, \"__NULL__\", Duration.ofMinutes(2));\n" +
        "        return null;\n" +
        "    }\n" +
        "    redis.opsForValue().set(key, json(p), Duration.ofMinutes(30));\n" +
        "    return p;\n" +
        "}\n" +
        "\n" +
        "// CÁCH 2: BLOOM FILTER — chặn ngay trước khi chạm cache lẫn DB\n" +
        "// (RedisBloom module). Rất hiệu quả khi tập id hợp lệ lớn và cố định.\n" +
        "//   BF.EXISTS products:filter <id>\n" +
        "//   trả về 0 -> CHẮC CHẮN không tồn tại -> từ chối ngay, không đụng DB\n" +
        "//   trả về 1 -> CÓ THỂ tồn tại -> đi tiếp bình thường\n" +
        "if (Boolean.FALSE.equals(bloomFilter.mightContain(id))) return null;\n" +
        "\n" +
        "// CÁCH 3: KIỂM TRA ĐỊNH DẠNG id ở tầng API trước khi vào logic\n" +
        "//   id phải khớp regex/khoảng giá trị hợp lệ -> loại phần lớn request rác.",
    },
  ],
},
{
  cat: 'Nhất quán',
  q: 'Cache avalanche (sập cache hàng loạt) là gì?',
  answer:
    'Hai kịch bản:\n' +
    '- **Nhiều key hết hạn cùng lúc** (ví dụ nạp cache hàng loạt lúc 0h với cùng TTL) → cùng lúc miss → DB spike.\n' +
    '- **Redis chết / restart** → toàn bộ cache biến mất → mọi request xuống DB.\n\n' +
    'Chống:\n' +
    '- **TTL jitter**: `EX (base + random(0, spread))`.\n' +
    '- **Redis HA** (Sentinel/Cluster) để không mất toàn bộ.\n' +
    '- **Circuit breaker / rate limit** ở tầng DB.\n' +
    '- **Cache warming** có kiểm soát sau restart.',
  essence:
    'Avalanche = mất một lượng lớn cache cùng lúc (do TTL đồng loạt hoặc Redis down). Jitter chống cái đầu; HA + circuit breaker chống cái sau.',
  example:
    'Job warm cache mỗi đêm `SET ... EX 3600` cho 100k key → 1 giờ sau tất cả hết hạn trong vài giây → DB sập. Sửa: `EX (3600 + rand(0..600))` → key hết hạn rải đều trong 10 phút.',
  viz: {
    type: 'tree',
    title: 'Cache avalanche — mất một lượng lớn cache CÙNG LÚC',
    root: {
      label: 'Hai kịch bản, hai cách chống',
      children: [
        { label: 'Nhiều key hết hạn cùng lúc (nạp hàng loạt cùng TTL)', note: 'chống: TTL jitter — EX (base + random(0, spread))' },
        { label: 'Redis chết / restart → toàn bộ cache biến mất', note: 'chống: Redis HA (Sentinel/Cluster)' },
        { label: 'Bổ sung', note: 'circuit breaker / rate limit ở tầng DB; cache warming có kiểm soát' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Nhiều key cùng hết hạn, hoặc cache chết hẳn",
      code:
        "// HAI KỊCH BẢN KHÁC NHAU:\n" +
        "// A) Hàng loạt key cùng TTL -> hết hạn CÙNG LÚC -> DB nhận toàn bộ tải.\n" +
        "//    Điển hình: nạp cache hàng loạt lúc khởi động với cùng TTL 1 giờ.\n" +
        "// B) Redis CHẾT hoàn toàn -> 100% request xuống DB -> DB sập theo.\n" +
        "\n" +
        "// CHỐNG (A): TTL ngẫu nhiên — cách đơn giản và hiệu quả nhất\n" +
        "int ttl = 3600 + ThreadLocalRandom.current().nextInt(600);   // 60-70 phút\n" +
        "redis.opsForValue().set(key, value, Duration.ofSeconds(ttl));\n" +
        "\n" +
        "// CHỐNG (B): nhiều lớp phòng thủ\n" +
        "// 1) CIRCUIT BREAKER trước database — thà trả lỗi/dữ liệu suy giảm cho một\n" +
        "//    phần request còn hơn để DB sập và mất tất cả\n" +
        "@CircuitBreaker(name = \"db\", fallbackMethod = \"degraded\")\n" +
        "public Product get(String id) { ... }\n" +
        "public Product degraded(String id, Throwable t) {\n" +
        "    return Product.placeholder();       // dữ liệu tối thiểu, hoặc thông báo lỗi mềm\n" +
        "}\n" +
        "\n" +
        "// 2) CACHE CỤC BỘ (L1) làm lớp đỡ khi Redis chết\n" +
        "private final Cache<String, Product> local = Caffeine.newBuilder()\n" +
        "        .maximumSize(10_000).expireAfterWrite(Duration.ofSeconds(30)).build();\n" +
        "\n" +
        "// 3) BULKHEAD/giới hạn số kết nối tới DB -> DB chỉ nhận lượng nó chịu được,\n" +
        "//    phần dư bị từ chối nhanh thay vì xếp hàng làm sập cả hệ thống\n" +
        "// 4) Redis phải có REPLICA + failover tự động (Sentinel/Cluster)\n" +
        "// 5) CACHE WARMING sau khi khôi phục, trước khi mở lại lưu lượng",
    },
  ],
},
{
  cat: 'Nhất quán',
  q: 'Cập nhật cache: nên xoá key hay ghi đè key sau khi update DB?',
  answer:
    '**Xoá (invalidate) thường tốt hơn ghi đè**:\n' +
    '- Ghi đè cache ngay sau update DB có thể ghi **giá trị cũ** nếu có write đồng thời (race): T1 ghi DB v2, T2 ghi DB v3, T2 set cache v3, T1 set cache v2 → cache stale.\n' +
    '- Xoá cache → lần đọc kế tiếp nạp lại từ DB (nguồn sự thật). Đơn giản, ít race hơn.\n\n' +
    'Thứ tự: **update DB trước, rồi xoá cache** (cache-aside). "Xoá cache trước rồi update DB" tạo cửa sổ một reader nạp lại giá trị cũ vào cache.',
  essence:
    'Xoá cache đẩy trách nhiệm "giá trị đúng" về DB. Ghi đè cache trực tiếp mở ra race giữa các writer. Update-DB-rồi-delete-cache là mẫu an toàn phổ biến (dù vẫn có cửa sổ hiếm).',
  example:
    'Sửa giá sản phẩm: `UPDATE products SET price=... WHERE id=5` → `redis.del("product:5")`. Không làm `redis.set("product:5", newValue)` — nếu hai admin sửa cùng lúc, cache có thể kẹt giá của người "ghi cache sau nhưng DB trước".',
  viz: {
    type: 'compare',
    cols: ['Xoá (invalidate) key — nên', 'Ghi đè key sau update DB'],
    rows: [
      ['Race giữa writer', 'ít hơn — lần đọc kế tiếp nạp lại từ DB', 'T1 ghi v2, T2 ghi v3, T2 set cache v3, T1 set cache v2 → stale'],
      ['Trách nhiệm "giá trị đúng"', 'đẩy về DB (nguồn sự thật)', 'cache tự giữ'],
      ['Thứ tự an toàn', 'update DB TRƯỚC, rồi xoá cache', '—'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Xoá (invalidate) gần như luôn đúng hơn ghi đè",
      code:
        "// XOÁ CACHE (cache invalidation) — nên dùng\n" +
        "@Transactional\n" +
        "public void update(Product p) {\n" +
        "    repository.save(p);\n" +
        "    redis.delete(\"product:\" + p.getId());     // lần đọc sau sẽ nạp lại bản mới nhất\n" +
        "}\n" +
        "\n" +
        "// GHI ĐÈ CACHE (cache update) — có vẻ hiệu quả hơn nhưng nguy hiểm\n" +
        "redis.opsForValue().set(\"product:\" + p.getId(), json(p), TTL);\n" +
        "\n" +
        "// VÌ SAO XOÁ TỐT HƠN:\n" +
        "// 1) RACE CONDITION khi ghi đè: hai request cập nhật đồng thời\n" +
        "//      A ghi DB (v1) -> B ghi DB (v2) -> B ghi cache (v2) -> A ghi cache (v1)\n" +
        "//      -> cache giữ v1 CŨ trong khi DB là v2. Sai lệch kéo dài tới hết TTL.\n" +
        "//    Xoá cache không có vấn đề này (xoá hai lần cũng vô hại).\n" +
        "// 2) Ghi đè cache những thứ có thể KHÔNG AI ĐỌC -> lãng phí bộ nhớ.\n" +
        "// 3) Giá trị trong cache thường KHÁC dạng với entity DB (đã join, đã tính\n" +
        "//    toán) -> ghi đè phải dựng lại đúng dạng đó, dễ sai.\n" +
        "\n" +
        "// THỨ TỰ CŨNG QUAN TRỌNG: ghi DB TRƯỚC, xoá cache SAU.\n" +
        "// Xoá trước rồi ghi DB -> có cửa sổ để request khác nạp lại GIÁ TRỊ CŨ vào cache.\n" +
        "\n" +
        "// Vẫn còn một khe hẹp: request đọc nạp giá trị cũ ngay trước khi xoá.\n" +
        "// -> Cache-Aside + DELAYED DOUBLE DELETE: xoá, ghi DB, chờ ~500ms rồi xoá lần nữa.",
    },
  ],
},
{
  cat: 'Nhất quán',
  q: 'Vấn đề dual-write cache-DB và cách xử lý triệt để?',
  answer:
    'Update DB và invalidate cache là **hai thao tác không nguyên tử**. Lỗi giữa chúng (app crash sau khi ghi DB, trước khi xoá cache) → cache stale mãi.\n\n' +
    'Giảm/khử:\n' +
    '- **TTL** trên mọi key cache → stale tự hết hạn (giới hạn thời gian sai).\n' +
    '- **Xoá cache qua CDC**: Debezium đọc binlog DB → phát sự kiện thay đổi → consumer xoá key cache tương ứng. Đảm bảo cache luôn được invalidate khi DB đổi, kể cả app crash.\n' +
    '- **Delayed double delete**: xoá cache, update DB, chờ vài trăm ms, xoá cache lần nữa (dọn giá trị mà reader kịp nạp lại giữa chừng).',
  essence:
    'Không có cách nào làm cache-DB nhất quán tuyệt đối rẻ. TTL là "sàn an toàn" bắt buộc. CDC-based invalidation là giải pháp mạnh nhất vì tách việc xoá cache khỏi code ghi.',
  example:
    'Hệ thống quan trọng: mọi thay đổi bảng `product` → binlog → Kafka → consumer `redis.del("product:"+id)`. App chỉ ghi DB, không tự lo cache. Kèm TTL 10 phút phòng consumer trễ.',
  viz: {
    type: 'tree',
    title: 'Dual-write cache-DB — hai thao tác không nguyên tử',
    root: {
      label: 'Crash giữa "ghi DB" và "xoá cache" → cache stale mãi',
      children: [
        { label: 'TTL trên mọi key cache', note: 'SÀN AN TOÀN bắt buộc — stale tự hết hạn' },
        { label: 'Xoá cache qua CDC (Debezium → Kafka)', note: 'giải pháp mạnh nhất — tách việc xoá cache khỏi code ghi, đúng cả khi app crash' },
        { label: 'Delayed double delete', note: 'xoá, update DB, chờ vài trăm ms, xoá lần nữa (dọn giá trị reader kịp nạp)' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ghi hai nơi luôn có khe hở",
      code:
        "// VẤN ĐỀ: DB và Redis không có transaction chung. Bất kỳ thứ tự nào cũng\n" +
        "// có kịch bản để lại dữ liệu không nhất quán.\n" +
        "repository.save(p);              // thành công\n" +
        "redis.delete(key);               // Redis timeout -> cache giữ dữ liệu CŨ\n" +
        "\n" +
        "// GIẢM THIỂU (không triệt để):\n" +
        "// 1) TTL NGẮN -> sai lệch tự hết sau TTL. Đơn giản và hiệu quả nhất trong\n" +
        "//    thực tế; phần lớn hệ thống chỉ cần đến mức này.\n" +
        "// 2) Xoá cache SAU KHI transaction commit, không phải trong transaction:\n" +
        "@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)\n" +
        "public void onUpdated(ProductUpdated e) { redis.delete(\"product:\" + e.id()); }\n" +
        "//    Xoá trong transaction mà transaction rollback -> đã xoá cache oan\n" +
        "//    (không sai dữ liệu, nhưng gây miss vô ích).\n" +
        "// 3) RETRY + hàng đợi: xoá thất bại -> đẩy vào queue để thử lại.\n" +
        "\n" +
        "// TRIỆT ĐỂ: CDC — để DATABASE là nguồn sự thật duy nhất\n" +
        "// Debezium đọc WAL/binlog -> Kafka -> consumer xoá cache.\n" +
        "@KafkaListener(topics = \"cdc.public.products\")\n" +
        "public void onDbChange(ChangeEvent e) {\n" +
        "    redis.delete(\"product:\" + e.after().get(\"id\"));\n" +
        "}\n" +
        "// + KHÔNG BAO GIỜ bỏ sót thay đổi (kể cả sửa trực tiếp trong DB, migration)\n" +
        "// + ứng dụng không phải nghĩ tới cache nữa\n" +
        "// - thêm hạ tầng (Kafka + Debezium) và độ trễ vài trăm mili giây",
    },
  ],
},
{
  cat: 'Pattern',
  q: 'Multi-level cache (L1 local + L2 Redis) — khi nào dùng?',
  answer:
    '- **L1**: cache in-process (Caffeine, guava) — latency ns, không qua network, không tốn Redis. Nhưng: mỗi instance một bản (không nhất quán giữa các pod), tốn heap.\n' +
    '- **L2**: Redis — chia sẻ giữa mọi instance, dung lượng lớn, latency ms.\n\n' +
    'Luồng: đọc L1 → miss → đọc L2 → miss → DB → điền cả L2 và L1.\n\n' +
    'Invalidation L1 khó: dùng pub/sub Redis phát "key X đã đổi" → mọi instance xoá khỏi L1; hoặc L1 TTL rất ngắn (1–5s).',
  essence:
    'L1 cắt được cả latency network và tải Redis cho các key **cực nóng**, đổi lấy độ trễ nhất quán (mỗi instance có thể lệch nhau vài giây). Chỉ thêm L1 cho số ít key hot nhất.',
  example:
    'Feature flags đọc hàng chục nghìn lần/s mỗi pod: L1 Caffeine TTL 5s + subscribe channel `flags:changed` để invalidate ngay khi admin đổi. Redis (L2) chỉ nhận ~1 req/pod/5s thay vì hàng chục nghìn.',
  viz: {
    type: 'flow',
    title: 'Multi-level cache (L1 local + L2 Redis)',
    nodes: ['đọc L1 (in-process, latency ns)', 'miss → đọc L2 (Redis, chia sẻ)', 'miss → DB', 'điền cả L2 và L1'],
    steps: [
      { to: 0, label: 'L1 cắt cả latency network và tải Redis cho key CỰC NÓNG' },
      { to: 3, label: 'đổi lấy độ trễ nhất quán — mỗi instance có thể lệch vài giây' },
      { to: 3, label: 'invalidation L1: pub/sub Redis "key X đã đổi" → mọi instance xoá; hoặc L1 TTL rất ngắn (1–5s)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cache trong process + cache dùng chung",
      code:
        "// L1 (Caffeine trong JVM): độ trễ NANO giây, không qua mạng.\n" +
        "// L2 (Redis): dùng chung mọi instance, sống sót qua restart ứng dụng.\n" +
        "private final Cache<String, Product> l1 = Caffeine.newBuilder()\n" +
        "        .maximumSize(10_000)\n" +
        "        .expireAfterWrite(Duration.ofSeconds(30))   // TTL NGẮN — mấu chốt\n" +
        "        .recordStats()\n" +
        "        .build();\n" +
        "\n" +
        "public Product get(String id) {\n" +
        "    Product p = l1.getIfPresent(id);\n" +
        "    if (p != null) return p;                        // L1 hit\n" +
        "\n" +
        "    String cached = redis.opsForValue().get(\"product:\" + id);\n" +
        "    if (cached != null) {\n" +
        "        p = parse(cached);\n" +
        "        l1.put(id, p);                              // nạp ngược lên L1\n" +
        "        return p;\n" +
        "    }\n" +
        "    p = repository.findById(id).orElseThrow();\n" +
        "    redis.opsForValue().set(\"product:\" + id, json(p), Duration.ofMinutes(30));\n" +
        "    l1.put(id, p);\n" +
        "    return p;\n" +
        "}\n" +
        "\n" +
        "// VẤN ĐỀ CỐT LÕI: không xoá được L1 của các instance KHÁC.\n" +
        "// -> Dùng Pub/Sub để phát lệnh xoá tới mọi instance:\n" +
        "@EventListener\n" +
        "public void onInvalidate(String id) { l1.invalidate(id); }\n" +
        "redis.convertAndSend(\"cache:invalidate\", id);      // mọi instance đều nghe\n" +
        "\n" +
        "// KHI NÀO DÙNG: key CỰC NÓNG (cấu hình, bảng tra cứu, feature flag) mà\n" +
        "// dữ liệu cũ vài giây là chấp nhận được.\n" +
        "// KHI NÀO KHÔNG: dữ liệu phải chính xác tức thì (số dư, tồn kho).\n" +
        "// LUÔN để TTL L1 rất ngắn — đó là giới hạn trên của mức \"cũ\" mà bạn chấp nhận.",
    },
  ],
},
{
  cat: 'Rate limiting',
  q: 'Rate limiting với Redis: fixed window, sliding window, token bucket?',
  answer:
    '- **Fixed window**: `INCR rate:{user}:{minute}` + `EXPIRE 60`. Đơn giản nhưng có "burst ở biên" — 2× limit quanh ranh giới cửa sổ.\n' +
    '- **Sliding window log**: ZSet, score = timestamp; mỗi request `ZADD` + `ZREMRANGEBYSCORE` (xoá cũ hơn window) + `ZCARD`. Chính xác nhưng tốn bộ nhớ (lưu mọi timestamp).\n' +
    '- **Sliding window counter**: nội suy giữa cửa sổ hiện tại và trước — gần chính xác, rẻ.\n' +
    '- **Token bucket** (Lua): lưu (tokens, lastRefill); mỗi request tính token hồi theo thời gian, trừ 1 nếu đủ. Cho phép burst có kiểm soát.',
  essence:
    'Fixed window rẻ nhưng cho burst gấp đôi ở biên. Sliding window chính xác hơn. Token bucket cho phép burst mượt và là lựa chọn phổ biến cho API — hiện thực nguyên tử bằng Lua.',
  example:
    'API limit 100 req/phút/user: token bucket Lua với capacity 100, refill 100/60 token/s. User im lặng 1 phút → đầy 100 token, có thể burst 100 request rồi phải giãn ra. Nguyên tử nên 500 request đồng thời vẫn đếm đúng.',
  viz: {
    type: 'compare',
    cols: ['Fixed window', 'Sliding window log', 'Sliding window counter', 'Token bucket (Lua)'],
    rows: [
      ['Cách', 'INCR rate:{user}:{minute} + EXPIRE', 'ZSet score=timestamp, ZREMRANGEBYSCORE + ZCARD', 'nội suy cửa sổ hiện tại + trước', 'lưu (tokens, lastRefill), tính token hồi'],
      ['Chính xác', 'burst 2× ở biên', 'chính xác', 'gần chính xác', 'chính xác + burst có kiểm soát'],
      ['Chi phí', 'rẻ nhất', 'tốn RAM (mọi timestamp)', 'rẻ', 'rẻ, phổ biến cho API'],
    ],
  },
  demo: [
    {
      lang: "lua",
      title: "Ba thuật toán, và vì sao phải viết bằng Lua",
      code:
        "-- FIXED WINDOW — đơn giản nhất, nhưng cho phép GẤP ĐÔI ở ranh giới cửa sổ\n" +
        "-- (100 request lúc 10:00:59 và 100 request lúc 10:01:00)\n" +
        "--   local c = redis.call(\u0027INCR\u0027, KEYS[1])\n" +
        "--   if c == 1 then redis.call(\u0027EXPIRE\u0027, KEYS[1], ARGV[1]) end\n" +
        "--   return c <= tonumber(ARGV[2]) and 1 or 0\n" +
        "\n" +
        "-- SLIDING WINDOW LOG — chính xác nhất, dùng Sorted Set với score = timestamp\n" +
        "local key    = KEYS[1]\n" +
        "local now    = tonumber(ARGV[1])      -- mili giây\n" +
        "local window = tonumber(ARGV[2])\n" +
        "local limit  = tonumber(ARGV[3])\n" +
        "\n" +
        "redis.call(\u0027ZREMRANGEBYSCORE\u0027, key, 0, now - window)   -- bỏ phần ngoài cửa sổ\n" +
        "local count = redis.call(\u0027ZCARD\u0027, key)\n" +
        "if count >= limit then\n" +
        "  return 0                                              -- từ chối\n" +
        "end\n" +
        "redis.call(\u0027ZADD\u0027, key, now, now .. \u0027-\u0027 .. math.random())\n" +
        "redis.call(\u0027PEXPIRE\u0027, key, window)\n" +
        "return 1\n" +
        "-- Chính xác nhưng tốn bộ nhớ: lưu MỘT phần tử cho MỖI request.\n" +
        "-- Giới hạn cao (hàng nghìn/giây) thì dùng sliding window COUNTER thay thế.",
    },
    {
      lang: "bash",
      title: "Chạy script và vì sao không tách lệnh",
      code:
        "redis-cli --eval sliding_window.lua rate:user:1 , $(date +%s%3N) 60000 100\n" +
        "\n" +
        "# VÌ SAO PHẢI DÙNG LUA: các bước \"đọc số hiện tại -> so sánh -> ghi\" phải\n" +
        "# NGUYÊN TỬ. Tách thành nhiều lệnh thì hai request đồng thời cùng đọc thấy\n" +
        "# 99 và cùng cho qua -> vượt hạn mức.\n" +
        "\n" +
        "# TOKEN BUCKET (xem script ở câu về Lua) — cho phép BURST có kiểm soát:\n" +
        "# giỏ đầy dần theo thời gian, mỗi request tiêu một token.\n" +
        "# Đây là lựa chọn tốt nhất cho API công khai: mượt, cho phép đột biến ngắn,\n" +
        "# và tham số (capacity, rate) dễ giải thích cho người dùng.\n" +
        "\n" +
        "# TRẢ VỀ CHO CLIENT header chuẩn để họ tự điều tiết:\n" +
        "#   X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
    },
  ],
},
{
  cat: 'Distributed lock',
  q: 'Distributed lock với Redis: `SET NX`, Redlock, và fencing token?',
  answer:
    '**Lock đơn giản**: `SET lock:{res} {token} NX PX 30000`; giải phóng bằng Lua kiểm tra token.\n\n' +
    '**Redlock**: thuật toán trên **N Redis master độc lập** — giành lock ở đa số (N/2+1) node trong thời gian ngắn → chịu được mất vài node. Gây tranh luận (Martin Kleppmann): không an toàn khi có GC pause / clock drift lớn.\n\n' +
    '**Fencing token**: mỗi lần cấp lock kèm một số tăng dần; tài nguyên được bảo vệ **từ chối** thao tác mang token cũ hơn → an toàn kể cả khi client "zombie" tưởng mình còn giữ lock.',
  essence:
    'Redis lock đủ tốt cho "hiệu quả" (tránh làm việc trùng). Cho "đúng đắn" (không được phép hai client cùng ghi), cần fencing token ở phía tài nguyên — chỉ lock thôi không đủ an toàn tuyệt đối.',
  example:
    'Cron chạy một-node: `SET NX PX` là đủ (chạy trùng chỉ tốn tài nguyên). Ghi file/DB mà tuyệt đối không được hai writer: lock + fencing token, storage kiểm tra `token > lastSeenToken` trước khi ghi.',
  viz: {
    type: 'compare',
    cols: ['SET NX PX (lock đơn giản)', 'Redlock (N master độc lập)', 'Fencing token'],
    rows: [
      ['Cơ chế', 'giành key + Lua kiểm token khi giải phóng', 'giành lock ở đa số N/2+1 node', 'số tăng dần kèm mỗi lần cấp lock'],
      ['An toàn', 'đủ cho "hiệu quả" (tránh làm việc trùng)', 'gây tranh luận (GC pause / clock drift)', 'đúng cả khi client zombie'],
      ['Cho', 'cron một-node', 'chịu mất vài node Redis', 'tuyệt đối không hai writer — tài nguyên từ chối token cũ'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba mức độ chặt chẽ",
      code:
        "// MỨC 1: SET NX EX — đủ cho phần lớn trường hợp\n" +
        "String token = UUID.randomUUID().toString();\n" +
        "boolean locked = redis.opsForValue()\n" +
        "        .setIfAbsent(\"lock:job\", token, Duration.ofSeconds(30));\n" +
        "if (!locked) return;\n" +
        "try {\n" +
        "    doWork();\n" +
        "} finally {\n" +
        "    // Nhả lock phải NGUYÊN TỬ: kiểm tra token rồi mới xoá\n" +
        "    redis.execute(RedisScript.of(\n" +
        "        \"if redis.call(\u0027GET\u0027,KEYS[1])==ARGV[1] then return redis.call(\u0027DEL\u0027,KEYS[1]) else return 0 end\",\n" +
        "        Long.class), List.of(\"lock:job\"), token);\n" +
        "}\n" +
        "\n" +
        "// ĐIỂM YẾU: replication BẤT ĐỒNG BỘ. Master cấp lock rồi chết trước khi\n" +
        "// sao chép -> replica lên làm master, không biết gì về lock -> cấp cho\n" +
        "// client thứ hai -> HAI client cùng vào vùng tới hạn.\n" +
        "\n" +
        "// MỨC 2: REDLOCK — lấy lock trên N instance ĐỘC LẬP (thường 5), thành công\n" +
        "// khi chiếm được đa số (3/5) trong thời gian ngắn hơn TTL.\n" +
        "RedissonClient redisson = Redisson.create(config);\n" +
        "RLock lock = redisson.getLock(\"lock:job\");\n" +
        "if (lock.tryLock(5, 30, TimeUnit.SECONDS)) {        // Redisson có watchdog tự gia hạn\n" +
        "    try { doWork(); } finally { lock.unlock(); }\n" +
        "}\n" +
        "// Redlock vẫn bị tranh cãi: nó giả định đồng hồ các node không lệch nhiều\n" +
        "// và không có GC pause dài. Martin Kleppmann đã chỉ ra các kịch bản hỏng.\n" +
        "\n" +
        "// MỨC 3: FENCING TOKEN — cách DUY NHẤT thật sự an toàn\n" +
        "long fence = redis.opsForValue().increment(\"lock:job:fence\");   // tăng dần\n" +
        "// Truyền fence xuống hệ thống ĐÍCH; đích TỪ CHỐI mọi ghi có fence NHỎ HƠN\n" +
        "// cái nó đã thấy -> client \"zombie\" tỉnh dậy muộn không ghi đè được.\n" +
        "storage.write(data, fence);\n" +
        "\n" +
        "// KẾT LUẬN: cần đúng đắn TUYỆT ĐỐI (tiền bạc) thì đừng dùng khoá Redis —\n" +
        "// dùng khoá của database giao dịch, hoặc thiết kế idempotent.",
    },
  ],
},
{
  cat: 'Pattern',
  q: 'Nên cache cái gì và KHÔNG nên cache cái gì?',
  answer:
    '**Nên cache**: dữ liệu đọc nhiều-ghi ít, tính toán đắt (aggregate, join phức tạp), gọi service ngoài chậm, tương đối chấp nhận stale (profile, catalog, config, kết quả search phổ biến).\n\n' +
    '**Cân nhắc / không nên**: dữ liệu thay đổi liên tục và cần chính xác tuyệt đối (số dư ví — trừ khi có cơ chế nhất quán), dữ liệu đọc một lần rồi thôi (cache pollution), dữ liệu quá lớn/ít lặp (hit rate thấp → cache vô ích, tốn RAM), dữ liệu nhạy cảm không nên nằm ở nơi ít kiểm soát hơn.',
  essence:
    'Cache có giá trị khi (chi phí tạo lại × tần suất đọc) cao và (tần suất thay đổi) thấp. Hit rate thấp nghĩa là cache đang gây hại (thêm latency + RAM mà không tiết kiệm gì).',
  example:
    'Cache: trang sản phẩm (đọc 1000:1 so với ghi), kết quả "sản phẩm liên quan" (tính đắt). Không cache: feed cá nhân hoá realtime của mỗi user (mỗi lần khác nhau, hit rate ~0), số dư tài khoản (đọc thẳng DB hoặc dùng cơ chế riêng).',
  viz: {
    type: 'compare',
    cols: ['Nên cache', 'Không nên cache'],
    rows: [
      ['Đọc/ghi', 'đọc nhiều - ghi ít', 'thay đổi liên tục + cần chính xác tuyệt đối'],
      ['Chi phí tạo lại', 'đắt (aggregate, join, gọi service ngoài chậm)', 'rẻ hoặc đọc một lần rồi thôi (cache pollution)'],
      ['Hit rate', 'cao', 'thấp → cache đang GÂY HẠI (thêm latency + RAM)'],
      ['Ví dụ', 'profile, catalog, config, "sản phẩm liên quan"', 'feed cá nhân hoá realtime, số dư tài khoản'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tiêu chí quyết định",
      code:
        "// NÊN CACHE:\n" +
        "// 1) ĐỌC NHIỀU, GHI ÍT — tỉ lệ đọc/ghi càng cao càng đáng\n" +
        "redis.opsForValue().set(\"product:1\", json, Duration.ofMinutes(30));\n" +
        "// 2) TỐN KÉM để tạo ra: join nhiều bảng, tính toán nặng, gọi API bên ngoài\n" +
        "// 3) DÙNG CHUNG giữa nhiều người dùng: danh mục, cấu hình, bảng giá\n" +
        "// 4) CHẤP NHẬN ĐƯỢC dữ liệu cũ vài giây/phút\n" +
        "// 5) KÍCH THƯỚC hợp lý (dưới vài trăm KB mỗi giá trị)\n" +
        "\n" +
        "// KHÔNG NÊN CACHE:\n" +
        "// 1) Dữ liệu phải CHÍNH XÁC TỨC THÌ: số dư tài khoản, tồn kho lúc thanh toán\n" +
        "if (needsExactBalance) return repository.getBalance(id);   // đọc thẳng DB\n" +
        "// 2) GHI NHIỀU HƠN ĐỌC -> cache liên tục bị xoá, chỉ tốn công\n" +
        "// 3) Dữ liệu riêng của TỪNG người dùng mà mỗi người chỉ đọc một lần\n" +
        "//    -> tỉ lệ hit gần 0, chỉ tốn bộ nhớ\n" +
        "// 4) Dữ liệu RẤT LỚN (blob hàng chục MB) -> dùng CDN/object storage\n" +
        "// 5) Dữ liệu NHẠY CẢM chưa mã hoá (số thẻ, thông tin y tế)\n" +
        "// 6) Kết quả truy vấn có PHÂN TRANG/SẮP XẾP tuỳ ý -> tổ hợp key bùng nổ\n" +
        "\n" +
        "// ĐO TRƯỚC KHI CACHE: cache làm hệ thống PHỨC TẠP HƠN (thêm điểm lỗi,\n" +
        "// thêm bài toán nhất quán). Query 5ms chạy 10 lần/phút thì cache không\n" +
        "// giải quyết vấn đề gì cả.\n" +
        "// Theo dõi hit rate: dưới 80% thì xem lại TTL và chiến lược key.\n" +
        "redis.opsForValue().get(\"stats\");   // INFO stats: keyspace_hits / keyspace_misses",
    },
  ],
},
{
  cat: 'Rate limiting',
  q: 'Session store trong Redis — thiết kế thế nào?',
  answer:
    'Lưu session server-side, client chỉ giữ **session id** trong cookie (`Secure`, `HttpOnly`, `SameSite`).\n\n' +
    '- Key: `session:{id}`, value: hash hoặc JSON string chứa userId, roles, csrf token, metadata.\n' +
    '- TTL = thời gian sống session; gia hạn (`EXPIRE`) mỗi request để "sliding expiration".\n' +
    '- Redis HA (Sentinel/Cluster) vì mất session = mọi user bị đăng xuất.\n' +
    '- Logout = `DEL session:{id}`; "logout mọi thiết bị" = lưu `user:{id}:sessions` set các session id rồi xoá hết.',
  essence:
    'Session trong Redis cho scale ngang (mọi pod đọc chung), logout tức thì (xoá key), và TTL tự dọn. Đổi lại Redis trở thành thành phần quan trọng cần HA.',
  example:
    'Spring Session + Redis: `spring.session.store-type=redis`, `spring.session.timeout=30m`. Mỗi request chạm session → TTL reset về 30m. Admin ban user → xoá mọi `session:*` của user đó → lần request tiếp theo họ bị đá ra.',
  viz: {
    type: 'tree',
    title: 'Session store trong Redis',
    root: {
      label: 'Client giữ session id trong cookie (Secure, HttpOnly, SameSite)',
      children: [
        { label: 'Key session:{id}', note: 'value: hash/JSON chứa userId, roles, csrf token' },
        { label: 'TTL = thời gian sống; EXPIRE mỗi request → sliding expiration' },
        { label: 'Redis HA', note: 'mất session = mọi user bị đăng xuất' },
        { label: 'Logout', note: 'DEL session:{id}; "mọi thiết bị" = lưu user:{id}:sessions set rồi xoá hết' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Session ngoài process để scale ngang",
      code:
        "// VẤN ĐỀ: session trong bộ nhớ JVM -> phải dùng sticky session, và restart\n" +
        "// là mọi người bị đăng xuất.\n" +
        "@Configuration\n" +
        "@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)\n" +
        "public class SessionConfig {\n" +
        "    @Bean\n" +
        "    public LettuceConnectionFactory connectionFactory() {\n" +
        "        return new LettuceConnectionFactory(\n" +
        "                new RedisStandaloneConfiguration(\"redis\", 6379));\n" +
        "    }\n" +
        "    @Bean                                    // JSON dễ đọc/debug hơn JDK serialization\n" +
        "    public RedisSerializer<Object> springSessionDefaultRedisSerializer() {\n" +
        "        return new GenericJackson2JsonRedisSerializer();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Spring Session lưu mỗi session thành một HASH:\n" +
        "//   spring:session:sessions:<id>          -> dữ liệu session\n" +
        "//   spring:session:sessions:expires:<id>  -> để dọn dẹp\n" +
        "//   spring:session:expirations:<phút>     -> tập hợp session hết hạn theo phút\n" +
        "\n" +
        "// NGUYÊN TẮC THIẾT KẾ:\n" +
        "//  1) GIỮ SESSION NHỎ (dưới vài KB): chỉ userId, role, vài cờ. Đừng nhét\n" +
        "//     giỏ hàng hay danh sách quyền chi tiết vào đó — mỗi request đều phải\n" +
        "//     đọc và ghi lại toàn bộ.\n" +
        "//  2) TTL trượt: mỗi request gia hạn -> người dùng đang hoạt động không bị đăng xuất.\n" +
        "//  3) ĐỔI SESSION ID sau khi đăng nhập -> chống session fixation.\n" +
        "//  4) Cookie: HttpOnly + Secure + SameSite=Lax/Strict.\n" +
        "//  5) Redis chết = mọi người đăng xuất -> cần replica và failover, hoặc\n" +
        "//     chấp nhận đây là sự cố có thể xảy ra.\n" +
        "//  6) Đăng xuất mọi thiết bị: lưu tập session id theo user\n" +
        "redis.opsForSet().add(\"user:1:sessions\", sessionId);",
    },
  ],
},
{
  cat: 'Pattern',
  q: 'Cache warming — khi nào cần và làm thế nào?',
  answer:
    'Sau khi Redis restart / deploy / thêm node, cache trống → "cold start" → tải dồn xuống DB, latency cao cho tới khi cache ấm.\n\n' +
    'Cache warming: chủ động nạp trước các key nóng đã biết:\n' +
    '- Job chạy lúc khởi động nạp top-N sản phẩm / config / dữ liệu trang chủ.\n' +
    '- Replay traffic log để "làm ấm" theo pattern thật.\n' +
    '- Với Redis Cluster: thêm node → nạp dần.\n\n' +
    'Kèm stampede protection để cold start không làm sập DB.',
  essence:
    'Warming đổi một đợt tải có kiểm soát (lúc bạn chọn) lấy việc tránh một đợt tải không kiểm soát (lúc user tới). Chỉ cần cho các hệ mà cold cache thực sự nguy hiểm.',
  example:
    'E-commerce deploy lúc 2h sáng: sau khi Redis mới lên, chạy `warmCache()` nạp 5000 sản phẩm bán chạy + config + danh mục. 6h sáng traffic tới → hit rate đã ~85% thay vì 0%.',
  viz: {
    type: 'flow',
    title: 'Cache warming',
    nodes: ['Redis restart / deploy / thêm node → cache trống', 'cold start: tải dồn xuống DB, latency cao', 'chủ động nạp trước key nóng đã biết', 'traffic tới → hit rate đã cao'],
    steps: [
      { to: 2, label: 'job lúc khởi động nạp top-N sản phẩm/config; hoặc replay traffic log theo pattern thật' },
      { to: 3, label: 'đổi một đợt tải có kiểm soát (lúc bạn chọn) lấy việc tránh đợt tải không kiểm soát' },
      { to: 3, label: 'kèm stampede protection để cold start không sập DB' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Nạp trước dữ liệu nóng để tránh đợt miss đồng loạt",
      code:
        "// KHI NÀO CẦN:\n" +
        "//  1) sau khi Redis restart / failover -> cache rỗng, DB nhận toàn bộ tải\n" +
        "//  2) trước SỰ KIỆN biết trước: flash sale, mở bán vé, ra mắt sản phẩm\n" +
        "//  3) sau khi deploy nếu đổi định dạng key (cache cũ vô dụng)\n" +
        "//  4) hệ thống có tập dữ liệu nóng NHỎ và ổn định\n" +
        "\n" +
        "@EventListener(ApplicationReadyEvent.class)\n" +
        "public void warmUp() {\n" +
        "    // Chỉ nạp thứ THỰC SỰ nóng — nạp hết là vô nghĩa và tốn bộ nhớ\n" +
        "    List<Product> hot = repository.findTop1000ByOrderByViewCountDesc();\n" +
        "    hot.forEach(p -> redis.opsForValue().set(\n" +
        "            \"product:\" + p.getId(), json(p),\n" +
        "            Duration.ofMinutes(30 + random.nextInt(10))));   // TTL rải ra\n" +
        "}\n" +
        "\n" +
        "// LÀM MỚI ĐỊNH KỲ cho dữ liệu nóng, để nó không bao giờ hết hạn đột ngột:\n" +
        "@Scheduled(fixedDelay = 600_000)\n" +
        "public void refreshHot() {\n" +
        "    repository.findTop1000ByOrderByViewCountDesc()\n" +
        "              .forEach(p -> redis.opsForValue().set(\"product:\" + p.getId(), json(p), TTL));\n" +
        "}\n" +
        "\n" +
        "// PHỐI HỢP VỚI TRIỂN KHAI: đừng mở lưu lượng vào ngay khi instance sẵn sàng.\n" +
        "// Warm cache TRƯỚC, rồi mới báo readiness -> load balancer mới gửi request.\n" +
        "AvailabilityChangeEvent.publish(publisher, this, ReadinessState.REFUSING_TRAFFIC);\n" +
        "warmUp();\n" +
        "AvailabilityChangeEvent.publish(publisher, this, ReadinessState.ACCEPTING_TRAFFIC);\n" +
        "\n" +
        "// LƯU Ý: warm bằng cách quét toàn bộ DB có thể tự nó làm sập DB.\n" +
        "// Chia lô, thêm độ trễ giữa các lô, và chạy ngoài giờ cao điểm.",
    },
  ],
},
{
  cat: 'Nhất quán',
  q: 'Negative caching là gì và rủi ro?',
  answer:
    'Cache cả kết quả "không có gì" (404, list rỗng, null) để tránh hỏi lại nguồn cho cùng một truy vấn không có kết quả.\n\n' +
    'Rủi ro:\n' +
    '- **TTL quá dài**: khi dữ liệu **thực sự được tạo**, user vẫn thấy "không tồn tại" tới khi negative cache hết hạn.\n' +
    '- Nhầm lẫn giá trị sentinel (`"__NULL__"`) với dữ liệu thật.\n\n' +
    'Giải pháp: TTL ngắn cho negative entry (30–60s), và **xoá negative key** khi resource được tạo.',
  essence:
    'Negative caching chống penetration nhưng tạo cửa sổ "dữ liệu mới nhưng cache nói chưa có". Giữ TTL ngắn và invalidate khi tạo mới.',
  example:
    'User đăng ký username `alice`: trước đó nhiều lần check `alice` chưa tồn tại → negative cache `username:alice = "free"` TTL 30s. Khi `alice` đăng ký xong → `DEL username:alice` (hoặc set giá trị thật) để người khác không thấy "còn trống".',
  viz: {
    type: 'tree',
    title: 'Negative caching — cache cả kết quả "không có gì"',
    root: {
      label: 'Chống penetration nhưng tạo cửa sổ "dữ liệu mới nhưng cache nói chưa có"',
      children: [
        { label: 'Rủi ro: TTL quá dài', note: 'khi dữ liệu THỰC SỰ được tạo, user vẫn thấy "không tồn tại"' },
        { label: 'Rủi ro: nhầm sentinel ("__NULL__") với dữ liệu thật' },
        { label: 'Giải pháp', note: 'TTL ngắn (30–60s) + XOÁ negative key khi resource được tạo' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Cache cả kết quả \"không tồn tại\"",
      code:
        "// MỤC ĐÍCH: chặn cache penetration — request tìm thứ không tồn tại lặp đi\n" +
        "// lặp lại sẽ luôn miss cache và luôn xuống DB.\n" +
        "private static final String NULL_MARKER = \"\u0000NULL\";\n" +
        "\n" +
        "public Product get(String id) {\n" +
        "    String cached = redis.opsForValue().get(\"product:\" + id);\n" +
        "    if (NULL_MARKER.equals(cached)) return null;     // biết chắc không có\n" +
        "    if (cached != null) return parse(cached);\n" +
        "\n" +
        "    Product p = repository.findById(id).orElse(null);\n" +
        "    if (p == null) {\n" +
        "        redis.opsForValue().set(\"product:\" + id, NULL_MARKER,\n" +
        "                Duration.ofMinutes(2));              // TTL NGẮN — điểm mấu chốt\n" +
        "        return null;\n" +
        "    }\n" +
        "    redis.opsForValue().set(\"product:\" + id, json(p), Duration.ofMinutes(30));\n" +
        "    return p;\n" +
        "}\n" +
        "\n" +
        "// RỦI RO:\n" +
        "// 1) DỮ LIỆU CŨ SAI HƯỚNG NGUY HIỂM: bản ghi được TẠO ngay sau khi cache\n" +
        "//    \"không tồn tại\" -> người dùng thấy 404 dù dữ liệu đã có.\n" +
        "//    -> TTL phải NGẮN (1-5 phút), và khi TẠO bản ghi phải XOÁ marker:\n" +
        "@Transactional\n" +
        "public Product create(Product p) {\n" +
        "    Product saved = repository.save(p);\n" +
        "    redis.delete(\"product:\" + saved.getId());        // dọn marker null\n" +
        "    return saved;\n" +
        "}\n" +
        "// 2) TỐN BỘ NHỚ nếu bị tấn công bằng hàng triệu id ngẫu nhiên -> mỗi id\n" +
        "//    tạo một entry. -> kết hợp Bloom filter và giới hạn tốc độ.\n" +
        "// 3) Phải phân biệt rõ \"chưa cache\" (null) và \"đã cache là không tồn tại\"\n" +
        "//    -> dùng marker đặc biệt, đừng dùng chuỗi rỗng (dễ trùng dữ liệu thật).",
    },
  ],
},
{
  cat: 'Rate limiting',
  q: 'Idempotency key lưu trong Redis — thiết kế?',
  answer:
    'Client gửi `Idempotency-Key`; server:\n' +
    '1. `SET idem:{key} "PROCESSING" NX EX 86400` (nguyên tử).\n' +
    '2. Set được → xử lý request, rồi `SET idem:{key} <serialized_response> EX 86400`.\n' +
    '3. Không set được → `GET idem:{key}`: nếu `"PROCESSING"` → trả 409 (đang xử lý, client retry sau); nếu là response → trả **nguyên response cũ**, không xử lý lại.\n\n' +
    'TTL đủ dài để bao phủ mọi lần client có thể retry.',
  essence:
    'Redis `SET NX` cấp "quyền xử lý" cho đúng một request mang key đó; lưu kèm response để retry sau này nhận lại kết quả cũ thay vì tác động lần hai.',
  example:
    'Payment API: client timeout rồi retry cùng key → server thấy `idem:{key}` đã có response `{"paymentId": "p_123", "status": "success"}` → trả lại y hệt, không charge lần nữa. Nếu request đầu vẫn đang chạy → 409, client backoff.',
  viz: {
    type: 'flow',
    title: 'Idempotency key trong Redis',
    nodes: ['SET idem:{key} "PROCESSING" NX EX 86400', 'set được → xử lý, rồi SET idem:{key} <response> EX 86400', 'không set được → GET idem:{key}', '"PROCESSING" → 409 (client retry sau)', 'là response → trả NGUYÊN response cũ'],
    steps: [
      { to: 0, label: 'SET NX cấp "quyền xử lý" cho đúng một request' },
      { to: 4, label: 'retry cùng key → nhận lại kết quả cũ thay vì tác động lần hai' },
      { to: 4, label: 'TTL đủ dài để bao phủ mọi lần client có thể retry' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chống xử lý trùng ở biên hệ thống",
      code:
        "public PaymentResult pay(String idempotencyKey, PaymentRequest req) {\n" +
        "    String key = \"idem:\" + idempotencyKey;\n" +
        "\n" +
        "    // 1) GIÀNH CHỖ nguyên tử — SET NX là mấu chốt, hai request đồng thời\n" +
        "    //    chỉ một cái thắng\n" +
        "    boolean acquired = redis.opsForValue().setIfAbsent(\n" +
        "            key, \"IN_PROGRESS:\" + hash(req), Duration.ofHours(24));\n" +
        "\n" +
        "    if (!acquired) {\n" +
        "        String existing = redis.opsForValue().get(key);\n" +
        "        if (existing == null) return pay(idempotencyKey, req);   // vừa hết hạn\n" +
        "\n" +
        "        // 2) Cùng key nhưng payload KHÁC -> client dùng sai, phải báo lỗi\n" +
        "        if (!existing.endsWith(hash(req)))\n" +
        "            throw new ConflictException(\"Idempotency key đã dùng cho request khác\");\n" +
        "\n" +
        "        // 3) Đang xử lý -> bảo client thử lại, KHÔNG xử lý song song\n" +
        "        if (existing.startsWith(\"IN_PROGRESS\"))\n" +
        "            throw new RetryLaterException(2);\n" +
        "\n" +
        "        // 4) Đã xong -> trả về ĐÚNG kết quả cũ\n" +
        "        return parse(existing.substring(\"DONE:\".length()));\n" +
        "    }\n" +
        "\n" +
        "    try {\n" +
        "        PaymentResult result = process(req);\n" +
        "        redis.opsForValue().set(key, \"DONE:\" + json(result), Duration.ofHours(24));\n" +
        "        return result;\n" +
        "    } catch (Exception e) {\n" +
        "        redis.delete(key);        // thất bại -> cho phép thử lại\n" +
        "        throw e;\n" +
        "    }\n" +
        "}\n" +
        "// LƯU Ý: Redis không bền tuyệt đối. Với giao dịch tiền bạc, khoá idempotency\n" +
        "// nên nằm ở DATABASE (cùng transaction với nghiệp vụ); Redis chỉ là lớp\n" +
        "// chặn nhanh phía trước để giảm tải.",
    },
  ],
},
{
  cat: 'Pattern',
  q: 'Leaderboard realtime với Sorted Set — thiết kế và xử lý quy mô lớn?',
  answer:
    'Cơ bản: `ZINCRBY leaderboard <delta> <userId>`; `ZREVRANGE leaderboard 0 9 WITHSCORES` (top 10); `ZREVRANK leaderboard <userId>` (hạng của tôi); `ZSCORE`.\n\n' +
    'Quy mô lớn:\n' +
    '- **Nhiều leaderboard theo thời gian**: `lb:daily:2024-06-01`, `lb:weekly:...` với TTL.\n' +
    '- **Hàng chục triệu user**: một ZSet vẫn ổn (skiplist O(log N)), nhưng RAM lớn → cân nhắc chỉ giữ top-K + tính hạng gần đúng cho phần đuôi.\n' +
    '- **Cluster**: một leaderboard = một key = một slot → có thể là hot key; chia theo region/segment.',
  essence:
    'ZSet giải quyết leaderboard gần như trực tiếp: cập nhật điểm O(log N), lấy top-N O(log N + N), lấy hạng O(log N). Thách thức ở quy mô là hot key và RAM, không phải thuật toán.',
  example:
    'Game mobile: `lb:season:5` ZSet ~5M người chơi (~400MB). "Điểm và hạng của tôi + 10 người quanh tôi": `ZSCORE` + `ZREVRANK` + `ZREVRANGE (rank-5) (rank+5)`. Reset mùa: đổi sang `lb:season:6`, key cũ `EXPIRE` sau khi tổng kết.',
  viz: {
    type: 'tree',
    title: 'Leaderboard realtime với Sorted Set',
    root: {
      label: 'ZSet giải quyết gần như trực tiếp (cập nhật/top-N/hạng đều O(log N))',
      children: [
        { label: 'ZINCRBY / ZREVRANGE 0 9 (top 10) / ZREVRANK (hạng của tôi) / ZSCORE' },
        { label: 'Nhiều leaderboard theo thời gian', note: 'lb:daily:2024-06-01, lb:weekly:... với TTL' },
        { label: 'Hàng chục triệu user', note: 'một ZSet vẫn ổn; RAM lớn → chỉ giữ top-K + hạng gần đúng cho đuôi' },
        { label: 'Cluster', note: 'một leaderboard = một key = một slot → hot key; chia theo region/segment' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Bài toán mà ZSet sinh ra để giải",
      code:
        "redis-cli ZADD leaderboard:global 1500 \"user:1\"\n" +
        "redis-cli ZINCRBY leaderboard:global 100 \"user:1\"      # cộng điểm nguyên tử\n" +
        "\n" +
        "redis-cli ZREVRANGE leaderboard:global 0 9 WITHSCORES  # top 10 — O(log N + M)\n" +
        "redis-cli ZREVRANK leaderboard:global \"user:1\"         # hạng của một người — O(log N)\n" +
        "redis-cli ZSCORE leaderboard:global \"user:1\"           # O(1)\n" +
        "\n" +
        "# \"Quanh tôi\" — hiển thị 5 người trên và 5 người dưới\n" +
        "rank=$(redis-cli ZREVRANK leaderboard:global \"user:1\")\n" +
        "redis-cli ZREVRANGE leaderboard:global $((rank-5)) $((rank+5)) WITHSCORES\n" +
        "\n" +
        "# BẢNG THEO KỲ — key theo thời gian, TTL tự dọn\n" +
        "redis-cli ZINCRBY leaderboard:2026-09 100 \"user:1\"\n" +
        "redis-cli EXPIRE leaderboard:2026-09 5184000            # 60 ngày\n" +
        "# Gộp nhiều tuần thành bảng tháng:\n" +
        "redis-cli ZUNIONSTORE leaderboard:month 4 lb:w1 lb:w2 lb:w3 lb:w4\n" +
        "\n" +
        "# XỬ LÝ ĐỒNG ĐIỂM (rất hay gặp và hay bị bỏ qua): cùng điểm thì ai trước?\n" +
        "# Mẹo: gộp thời gian vào score. score = điểm * 10^10 + (thời_gian_còn_lại)\n" +
        "# -> cùng điểm thì người đạt SỚM HƠN xếp trên.\n" +
        "\n" +
        "# QUY MÔ LỚN (hàng chục triệu người chơi):\n" +
        "#  - ZSet 10 triệu phần tử tốn ~1GB và mọi thao tác vẫn O(log N) -> vẫn ổn\n" +
        "#  - nhưng ZREVRANGE lấy 10.000 phần tử là O(N) -> giới hạn kích thước trang\n" +
        "#  - CHIA theo khu vực/hạng đấu để mỗi ZSet nhỏ lại\n" +
        "#  - chỉ giữ TOP N trong ZSet, phần còn lại tính hạng xấp xỉ từ DB\n" +
        "redis-cli ZREMRANGEBYRANK leaderboard:global 0 -10001   # chỉ giữ top 10.000",
    },
  ],
},
{
  cat: 'Pattern',
  q: 'Feature flag / config cache với pub/sub invalidation?',
  answer:
    'Config/flag thay đổi hiếm nhưng đọc rất nhiều. Mẫu:\n' +
    '- Mỗi instance giữ **bản sao in-memory** (L1) của toàn bộ config.\n' +
    '- Nạp lần đầu từ Redis (hoặc DB).\n' +
    '- Subscribe channel `config:changed`. Khi admin đổi config → ghi Redis/DB + `PUBLISH config:changed <key>`.\n' +
    '- Mọi instance nhận message → reload key đó (hoặc toàn bộ) vào L1.\n\n' +
    'Fallback: reload định kỳ (mỗi 60s) phòng khi miss message pub/sub.',
  essence:
    'Đọc từ RAM local (nhanh nhất), cập nhật qua pub/sub (gần realtime khi đổi), reload định kỳ (bảo hiểm cho tính không tin cậy của pub/sub). Ba lớp cho vừa nhanh vừa đúng.',
  example:
    'Bật/tắt tính năng "checkout mới" cho 100 pod: admin toggle → `PUBLISH config:changed feature.new-checkout` → trong ~ms mọi pod cập nhật L1, request tiếp theo dùng giá trị mới. Không có pub/sub thì phải chờ TTL 60s.',
  viz: {
    type: 'flow',
    title: 'Feature flag / config — 3 lớp: nhanh + đúng',
    nodes: ['mỗi instance giữ bản sao in-memory (L1) toàn bộ config', 'nạp lần đầu từ Redis/DB', 'subscribe channel config:changed', 'admin đổi → ghi Redis + PUBLISH config:changed <key>', 'mọi instance nhận → reload L1', 'fallback: reload định kỳ (60s)'],
    steps: [
      { to: 0, label: 'đọc từ RAM local — nhanh nhất' },
      { to: 4, label: 'cập nhật qua pub/sub — gần realtime khi đổi (~ms)' },
      { to: 5, label: 'reload định kỳ — bảo hiểm cho tính không tin cậy của pub/sub' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cấu hình đọc rất nhiều, đổi rất ít",
      code:
        "// Feature flag được đọc ở MỌI request -> phải nằm trong bộ nhớ process (L1).\n" +
        "// Nhưng đổi cờ phải có hiệu lực NGAY trên mọi instance -> dùng Pub/Sub.\n" +
        "@Component\n" +
        "public class FeatureFlags {\n" +
        "    private volatile Map<String, Boolean> flags = Map.of();\n" +
        "\n" +
        "    @PostConstruct\n" +
        "    void load() {                                   // nạp lần đầu từ Redis\n" +
        "        flags = redis.opsForHash().entries(\"config:flags\");\n" +
        "    }\n" +
        "\n" +
        "    public boolean isEnabled(String name) {\n" +
        "        return flags.getOrDefault(name, false);     // đọc từ RAM, không chạm mạng\n" +
        "    }\n" +
        "\n" +
        "    // Nghe kênh invalidate -> nạp lại\n" +
        "    @EventListener\n" +
        "    public void onConfigChanged(String message) { load(); }\n" +
        "}\n" +
        "\n" +
        "@Configuration\n" +
        "class PubSubConfig {\n" +
        "    @Bean\n" +
        "    RedisMessageListenerContainer container(RedisConnectionFactory f, FeatureFlags flags) {\n" +
        "        var c = new RedisMessageListenerContainer();\n" +
        "        c.setConnectionFactory(f);\n" +
        "        c.addMessageListener((msg, p) -> flags.load(),\n" +
        "                new ChannelTopic(\"config:changed\"));\n" +
        "        return c;\n" +
        "    }\n" +
        "}\n" +
        "// Khi admin đổi cờ:\n" +
        "redis.opsForHash().put(\"config:flags\", \"new-checkout\", \"true\");\n" +
        "redis.convertAndSend(\"config:changed\", \"flags\");   // mọi instance nạp lại ngay\n" +
        "\n" +
        "// LƯU Ý: Pub/Sub là FIRE-AND-FORGET — instance đang restart sẽ BỎ LỠ thông báo.\n" +
        "// -> Luôn kèm một chu kỳ nạp lại định kỳ làm lưới an toàn:\n" +
        "@Scheduled(fixedDelay = 60_000)\n" +
        "public void periodicReload() { load(); }",
    },
  ],
},
{
  cat: 'Nhất quán',
  q: 'Cache key design và versioning để invalidate hàng loạt?',
  answer:
    'Nhúng version vào key hoặc namespace:\n' +
    '- **Global version**: `cache:v{N}:...`. Bump `N` = coi như xoá toàn bộ cache (key cũ tự hết hạn theo TTL).\n' +
    '- **Per-entity version**: key `product:{id}:v{ver}` với `ver` lấy từ `updated_at` / một counter. Update entity → `ver` đổi → key mới, key cũ bị bỏ rơi.\n' +
    '- **Dependency key**: lưu `list:products:{queryHash}` phụ thuộc `products:version`; bump `products:version` khi bất kỳ product nào đổi → mọi list cache "hết hiệu lực" ngầm.',
  essence:
    'Versioning biến "invalidate nhiều key" thành "đổi một số". Không cần tìm và xoá — key cũ trở nên không ai tra tới và TTL dọn chúng.',
  example:
    'Đổi thuật toán render giá (mọi cache giá sai): bump `cache:pricing:v2` → v3. Code đọc key `cache:pricing:v3:{sku}` → toàn miss → nạp lại bằng logic mới. Key `v2` không ai đọc, hết hạn rồi biến mất. Không cần `SCAN` + `DEL` hàng triệu key.',
  viz: {
    type: 'tree',
    title: 'Cache key versioning — biến "invalidate nhiều key" thành "đổi một số"',
    root: {
      label: 'Key cũ trở nên không ai tra tới, TTL dọn chúng',
      children: [
        { label: 'Global version', note: 'cache:v{N}:... — bump N = coi như xoá toàn bộ cache' },
        { label: 'Per-entity version', note: 'product:{id}:v{ver} với ver từ updated_at — update entity → key mới' },
        { label: 'Dependency key', note: 'list:products:{queryHash} phụ thuộc products:version; bump → mọi list cache hết hiệu lực ngầm' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Đổi version thay vì đi xoá từng key",
      code:
        "# BÀI TOÁN: đổi cấu trúc dữ liệu cache, hoặc cần xoá toàn bộ cache của một\n" +
        "# danh mục. Không thể dùng KEYS để tìm rồi xoá (chặn server).\n" +
        "\n" +
        "# CÁCH 1: VERSION TRONG KEY — tăng version là toàn bộ cache cũ thành mồ côi\n" +
        "# và tự hết hạn theo TTL. Không cần xoá gì cả.\n" +
        "redis-cli SET \"product:v2:1001\" \u0027{\"schema\":\"new\"}\u0027 EX 3600\n" +
        "# Deploy đổi tiền tố từ v1 sang v2 -> mọi lần đọc đều miss và nạp lại đúng\n" +
        "# định dạng mới; key v1 tự biến mất sau TTL.\n" +
        "\n" +
        "# CÁCH 2: VERSION TRONG REDIS — invalidate hàng loạt mà không cần deploy\n" +
        "redis-cli INCR \"cache:version:product\"          # trả về 5\n" +
        "# Ứng dụng đọc version rồi ghép vào key:\n" +
        "#   key = \"product:v\" + version + \":\" + id\n" +
        "# Tăng version -> mọi key cũ lập tức không được dùng nữa.\n" +
        "\n" +
        "# CÁCH 3: XOÁ THEO NHÓM bằng SCAN (khi không có version)\n" +
        "redis-cli --scan --pattern \u0027product:*\u0027 | xargs -L 100 redis-cli UNLINK\n" +
        "# An toàn hơn KEYS vì SCAN không chặn, và UNLINK giải phóng ở thread nền.\n" +
        "\n" +
        "# CÁCH 4: TAG hoá — giữ một Set các key thuộc mỗi nhóm\n" +
        "redis-cli SADD \"tag:category:5\" \"product:100\" \"product:101\"\n" +
        "redis-cli SMEMBERS \"tag:category:5\" | xargs redis-cli UNLINK\n" +
        "redis-cli UNLINK \"tag:category:5\"\n" +
        "# Tốn thêm bộ nhớ và phải bảo trì tập tag, nhưng xoá chính xác theo nhóm.\n" +
        "\n" +
        "# NGUYÊN TẮC: key phải MÔ TẢ ĐỦ mọi thứ ảnh hưởng tới giá trị —\n" +
        "# id, version schema, ngôn ngữ, quyền xem, tham số phân trang.\n" +
        "# Thiếu một chiều là hai người dùng khác nhau nhận cùng một giá trị SAI.",
    },
  ],
},
{
  cat: 'Nhất quán',
  q: 'Hot key trong cache — phát hiện và giảm tải thế nào?',
  answer:
    'Một key được đọc với tần suất bất thường (sản phẩm viral, config toàn cục) → dồn tải vào một shard/CPU của Redis, hoặc một kết nối.\n\n' +
    'Giảm tải:\n' +
    '- **L1 local cache** với TTL ngắn (1–3s): cắt phần lớn traffic trước khi tới Redis.\n' +
    '- **Nhân bản key**: `price:X:0` .. `price:X:9`, client đọc ngẫu nhiên một bản → rải tải; ghi thì cập nhật cả 10.\n' +
    '- **Đọc từ replica** cho key đó.\n' +
    '- Phát hiện: `redis-cli --hotkeys` (cần LFU), giám sát ở tầng client/proxy.',
  essence:
    'Hot key phá vỡ giả định "tải phân bố đều theo key". Giải pháp là thêm một tầng trước Redis (L1) hoặc biến một key thành nhiều bản để phân tán điểm truy cập.',
  example:
    'Flash sale: giá + tồn kho của 1 sản phẩm đọc 80k/s. Thêm L1 Caffeine TTL 1s ở mỗi pod (20 pod) → Redis chỉ nhận ~20 req/s cho key đó. Tồn kho cần realtime hơn thì nhân 8 bản key và đọc random.',
  viz: {
    type: 'tree',
    title: 'Hot key trong cache — thêm một tầng trước Redis, hoặc biến 1 key thành nhiều bản',
    root: {
      label: 'Phá vỡ giả định "tải phân bố đều theo key"',
      children: [
        { label: 'L1 local cache TTL ngắn (1–3s)', note: 'cắt phần lớn traffic trước khi tới Redis' },
        { label: 'Nhân bản key', note: 'price:X:0 .. price:X:9, đọc ngẫu nhiên; ghi cập nhật cả 10' },
        { label: 'Đọc từ replica cho key đó' },
        { label: 'Phát hiện', note: 'redis-cli --hotkeys (cần LFU), giám sát ở client/proxy' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Một key nóng làm nghẽn một node",
      code:
        "# PHÁT HIỆN\n" +
        "redis-cli --hotkeys                       # cần maxmemory-policy allkeys-lfu\n" +
        "redis-cli OBJECT FREQ product:hot         # counter LFU của một key\n" +
        "redis-cli MONITOR | head -5000 | awk \u0027{print $4}\u0027 | sort | uniq -c | sort -rn | head\n" +
        "# (MONITOR làm chậm server đáng kể — chỉ chạy vài giây ở môi trường có tải)\n" +
        "redis-cli INFO commandstats\n" +
        "# Trong Cluster: một node có CPU/băng thông cao hơn hẳn các node khác\n" +
        "# là dấu hiệu điển hình của hot key.\n" +
        "\n" +
        "# GIẢM TẢI — ba cách, theo thứ tự nên thử:\n" +
        "# 1) CACHE CỤC BỘ (L1) với TTL rất ngắn — hiệu quả nhất và đơn giản nhất.\n" +
        "#    99% request không còn chạm Redis nữa.\n" +
        "#    Caffeine: maximumSize(1000).expireAfterWrite(Duration.ofSeconds(5))\n" +
        "\n" +
        "# 2) NHÂN BẢN KEY — chia tải ra nhiều key (và nhiều node trong Cluster)\n" +
        "for i in $(seq 0 9); do\n" +
        "  redis-cli SET \"product:hot:copy$i\" \"$(redis-cli GET product:hot)\" EX 300\n" +
        "done\n" +
        "# Client chọn ngẫu nhiên copy0..copy9 -> tải chia đều 10 phần.\n" +
        "# Đổi lại: cập nhật phải ghi cả 10 bản.\n" +
        "\n" +
        "# 3) ĐỌC TỪ REPLICA — chia tải đọc, chấp nhận dữ liệu trễ một chút\n" +
        "redis-cli -h replica-1 READONLY\n" +
        "\n" +
        "# 4) Trong Cluster, dùng HASH TAG để chủ động phân bố key nóng sang các slot\n" +
        "#    khác nhau thay vì để chúng dồn về một node.",
    },
  ],
},
{
  cat: 'Pattern',
  q: 'Stale-while-revalidate với Redis — hoạt động thế nào?',
  answer:
    'Lưu kèm mỗi giá trị một **"soft TTL"** (thời điểm nên làm mới) ngắn hơn **"hard TTL"** (thời điểm thực sự hết hạn trong Redis).\n\n' +
    'Khi đọc:\n' +
    '- Còn trong soft TTL → trả về bình thường.\n' +
    '- Quá soft TTL nhưng chưa hard → **trả ngay giá trị cũ** cho client, đồng thời **kích hoạt nạp lại nền** (một request giành lock để refresh).\n' +
    '- Quá hard TTL → miss thật, nạp đồng bộ.',
  essence:
    'SWR loại bỏ "latency spike khi hết hạn": client luôn nhận phản hồi nhanh (kể cả hơi cũ), việc làm mới diễn ra ngầm. Kết hợp lock để chỉ một request refresh.',
  example:
    'Trang chủ: soft TTL 60s, hard TTL 600s. Phút thứ 2, request tới → nhận bản 61s tuổi tức thì + trigger refresh nền. Chỉ khi cache "chết hẳn" (10 phút, ví dụ backend lỗi liên tục) mới có miss đồng bộ.',
  viz: {
    type: 'flow',
    title: 'Stale-while-revalidate — loại bỏ latency spike khi hết hạn',
    nodes: ['lưu kèm soft TTL (nên làm mới) < hard TTL (thực sự hết hạn)', 'còn trong soft TTL → trả về bình thường', 'quá soft, chưa hard → TRẢ NGAY giá trị cũ + kích hoạt nạp lại NỀN', 'quá hard TTL → miss thật, nạp đồng bộ'],
    steps: [
      { to: 2, label: 'client luôn nhận phản hồi nhanh (kể cả hơi cũ); việc làm mới diễn ra ngầm' },
      { to: 2, label: 'một request giành lock để refresh — chỉ một request tính lại' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Trả bản cũ ngay, làm mới ở nền",
      code:
        "// Ý tưởng: người dùng KHÔNG BAO GIỜ phải chờ nạp lại cache. Hết hạn \"mềm\"\n" +
        "// thì vẫn trả bản cũ và kích hoạt làm mới ở nền.\n" +
        "public Product get(String id) {\n" +
        "    String key = \"product:\" + id;\n" +
        "    Entry e = parse(redis.opsForValue().get(key));\n" +
        "\n" +
        "    if (e == null) {\n" +
        "        return loadAndCache(id);                 // miss thật -> phải chờ\n" +
        "    }\n" +
        "    if (e.isStale()) {                           // quá softTtl nhưng chưa quá hardTtl\n" +
        "        // Chỉ MỘT request được đi làm mới, số còn lại dùng bản cũ\n" +
        "        boolean got = redis.opsForValue()\n" +
        "                .setIfAbsent(\"refresh:\" + key, \"1\", Duration.ofSeconds(30));\n" +
        "        if (got) asyncExecutor.submit(() -> loadAndCache(id));\n" +
        "    }\n" +
        "    return e.value();                            // luôn trả về ngay lập tức\n" +
        "}\n" +
        "\n" +
        "private Product loadAndCache(String id) {\n" +
        "    Product p = repository.findById(id).orElseThrow();\n" +
        "    // Lưu KÈM thời điểm hết hạn MỀM; TTL thật (hard) dài hơn nhiều\n" +
        "    Entry e = new Entry(p, Instant.now().plus(Duration.ofMinutes(5)));   // soft\n" +
        "    redis.opsForValue().set(\"product:\" + id, json(e), Duration.ofHours(1)); // hard\n" +
        "    return p;\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH:\n" +
        "//  - độ trễ p99 ổn định: không request nào phải chờ nạp lại\n" +
        "//  - chống stampede tự nhiên (chỉ một request làm mới)\n" +
        "//  - DB chết tạm thời -> vẫn phục vụ được bằng dữ liệu cũ tới hết hard TTL\n" +
        "// ĐÁNH ĐỔI: người dùng có thể thấy dữ liệu cũ trong khoảng soft-to-hard.\n" +
        "// -> Chọn softTtl theo mức \"cũ\" mà nghiệp vụ chấp nhận được.",
    },
  ],
},
]);
