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
},
{
  cat: 'Nhất quán',
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
},
]);
