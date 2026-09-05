SS.addQuestions('redis', [
{
  cat: 'Tổng quan',
  id: 'redis-1u62br8',
  q: 'Redis là gì? Vì sao single-threaded mà vẫn nhanh?',
  answer:
    'Redis là in-memory data store: lưu **cấu trúc dữ liệu** (string, hash, list, set, sorted set, stream…) trong RAM, truy cập qua network với latency sub-millisecond.\n\n' +
    'Xử lý lệnh trên **một thread duy nhất** (từ 6.0 có I/O threads cho đọc/ghi socket, nhưng thực thi lệnh vẫn đơn luồng). Nhanh vì:\n' +
    '- Toàn bộ dữ liệu trong RAM, không đụng đĩa cho read.\n' +
    '- Đơn luồng → **không cần lock**, không context switch, mỗi lệnh **nguyên tử**.\n' +
    '- I/O multiplexing (epoll) xử lý hàng nghìn kết nối.\n' +
    '- Cấu trúc dữ liệu tối ưu + giao thức RESP nhẹ.',
  essence:
    'Đơn luồng biến "atomicity" và "không lock" thành mặc định. Nút thắt là RAM và network, không phải CPU — nên lệnh O(N) lớn (KEYS, lớn) sẽ chặn *mọi* client.',
  example:
    'Bộ đếm lượt xem: `INCR post:123:views` — nguyên tử, không race, ~100k ops/s trên một core. Nhưng `KEYS *` trên 10 triệu key chặn server vài giây → mọi request khác treo. Dùng `SCAN` thay thế.',
  viz: {
    type: 'tree',
    title: 'Redis đơn luồng mà nhanh — nút thắt là RAM & network, không phải CPU',
    root: {
      label: 'Đơn luồng biến atomicity + không lock thành mặc định',
      children: [
        { label: 'Toàn bộ dữ liệu trong RAM', note: 'không đụng đĩa cho read' },
        { label: 'Đơn luồng → không lock, không context switch, mỗi lệnh nguyên tử' },
        { label: 'I/O multiplexing (epoll)', note: 'xử lý hàng nghìn kết nối' },
        { label: 'Hệ quả', note: 'lệnh O(N) lớn (KEYS) chặn MỌI client' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Nút thắt là RAM và mạng, không phải CPU",
      code:
        "# Redis xử lý lệnh trên MỘT thread duy nhất. Vẫn đạt hàng trăm nghìn ops/s vì:\n" +
        "#  1) toàn bộ dữ liệu trong RAM -> không đụng đĩa khi đọc\n" +
        "#  2) đơn luồng -> KHÔNG lock, KHÔNG context switch, mỗi lệnh tự nhiên NGUYÊN TỬ\n" +
        "#  3) I/O multiplexing (epoll) -> một thread phục vụ hàng chục nghìn kết nối\n" +
        "#  4) giao thức RESP đơn giản, phân tích rất nhanh\n" +
        "\n" +
        "redis-benchmark -h localhost -p 6379 -t get,set -n 100000 -c 50\n" +
        "# SET: ~120.000 requests/s   GET: ~130.000 requests/s\n" +
        "\n" +
        "# HỆ QUẢ QUAN TRỌNG NHẤT của đơn luồng: MỘT lệnh chậm CHẶN TẤT CẢ.\n" +
        "redis-cli KEYS \u0027*\u0027                 # O(N) trên 10 triệu key -> treo cả server vài giây\n" +
        "redis-cli SLOWLOG GET 10           # xem lệnh nào đang làm nghẽn\n" +
        "\n" +
        "# Vì CPU không phải nút thắt, thêm core KHÔNG giúp gì. Muốn scale thì:\n" +
        "#  - chạy nhiều instance trên cùng máy (mỗi instance một core)\n" +
        "#  - hoặc dùng Redis Cluster\n" +
        "# io-threads (6.0+) chỉ đa luồng phần ĐỌC/GHI SOCKET, việc thực thi lệnh\n" +
        "# vẫn đơn luồng — đừng nhầm là Redis đã thành đa luồng.",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-4zorga',
  q: 'String trong Redis dùng cho việc gì ngoài lưu text?',
  answer:
    'String là kiểu cơ bản (tối đa 512MB), thực chất là mảng byte. Use case:\n' +
    '- **Cache** giá trị/blob JSON: `SET user:1 "{...}" EX 3600`.\n' +
    '- **Counter nguyên tử**: `INCR`, `INCRBY`, `DECR` — đếm view, rate limit, sinh id.\n' +
    '- **Bitmap**: `SETBIT`/`GETBIT`/`BITCOUNT` — theo dõi trạng thái nhị phân hàng triệu user tiết kiệm bộ nhớ.\n' +
    '- **Lock**: `SET lock:x token NX EX 30`.\n' +
    '- **Cache with expiry** cho session, OTP, token.',
  essence:
    'String không chỉ là chuỗi — nó là "ô nhớ nguyên tử" hỗ trợ số học và thao tác bit. `INCR` và `SET NX EX` là hai công cụ được dùng nhiều nhất.',
  example:
    'Rate limit đơn giản: `INCR rate:user:1:minute` rồi `EXPIRE rate:user:1:minute 60` (lần đầu); nếu giá trị > 100 thì chặn. Daily active users: `SETBIT dau:2024-06-01 <userId> 1`, cuối ngày `BITCOUNT` cho số DAU với ~vài trăm KB/ngày.',
  viz: {
    type: 'tree',
    title: 'String = "ô nhớ nguyên tử" (không chỉ chuỗi, tối đa 512MB)',
    root: {
      label: 'INCR và SET NX EX là hai công cụ dùng nhiều nhất',
      children: [
        { label: 'Cache blob JSON', note: 'SET user:1 "{...}" EX 3600' },
        { label: 'Counter nguyên tử', note: 'INCR / INCRBY — đếm view, rate limit, sinh id' },
        { label: 'Bitmap', note: 'SETBIT/BITCOUNT — trạng thái nhị phân hàng triệu user tiết kiệm RAM' },
        { label: 'Lock', note: 'SET lock:x token NX EX 30' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "String là \"ô nhớ nguyên tử\", tối đa 512MB",
      code:
        "# 1) COUNTER nguyên tử — đây là use case dùng nhiều nhất, không phải lưu text\n" +
        "redis-cli INCR page:views:2026-09-05          # nguyên tử, không cần lock\n" +
        "redis-cli INCRBY user:1:points 50\n" +
        "redis-cli INCRBYFLOAT account:1:balance 10.5\n" +
        "\n" +
        "# 2) CACHE blob (JSON, HTML, kết quả tính toán) kèm TTL\n" +
        "redis-cli SET user:1 \u0027{\"name\":\"An\",\"tier\":\"gold\"}\u0027 EX 3600\n" +
        "\n" +
        "# 3) LOCK phân tán\n" +
        "redis-cli SET lock:order:1 \"token-abc\" NX EX 30\n" +
        "\n" +
        "# 4) BITMAP — String thao tác ở mức bit, cực tiết kiệm cho trạng thái nhị phân\n" +
        "redis-cli SETBIT user:active:2026-09-05 12345 1     # user 12345 hoạt động\n" +
        "redis-cli BITCOUNT user:active:2026-09-05           # đếm user hoạt động\n" +
        "# 1 triệu user chỉ tốn 125KB.\n" +
        "\n" +
        "# 5) Thao tác trên một phần chuỗi\n" +
        "redis-cli SETRANGE key 5 \"xyz\"\n" +
        "redis-cli GETRANGE key 0 9\n" +
        "redis-cli APPEND log:1 \"dòng mới\\n\"\n" +
        "\n" +
        "# 6) Lấy giá trị cũ trong một lệnh (Redis 6.2+)\n" +
        "redis-cli SET config:v2 \"new\" GET      # trả về giá trị cũ, đặt giá trị mới\n" +
        "\n" +
        "# Nhiều key một lệnh -> ít round-trip mạng hơn hẳn:\n" +
        "redis-cli MSET k1 v1 k2 v2\n" +
        "redis-cli MGET k1 k2",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-mi1y1r',
  q: 'Hash dùng khi nào? Ưu điểm so với nhiều String?',
  answer:
    'Hash = map field→value trong một key: `HSET user:1 name "An" age 30 city "HCM"`.\n\n' +
    'Ưu điểm so với `user:1:name`, `user:1:age`… riêng lẻ:\n' +
    '- **Tiết kiệm bộ nhớ**: hash nhỏ được mã hoá `listpack` (compact) thay vì overhead một key/entry.\n' +
    '- Thao tác **một phần**: `HGET`, `HINCRBY` một field mà không đọc/ghi cả object.\n' +
    '- Gom logic: xoá `user:1` là xoá toàn bộ, set TTL cho cả object.',
  essence:
    'Hash là "object/record" trong Redis — dùng khi bạn có nhiều thuộc tính của cùng một thực thể và muốn sửa từng thuộc tính. Nhỏ thì còn siêu tiết kiệm RAM.',
  example:
    'Giỏ hàng: `HSET cart:user:1 sku_A 2 sku_B 1`, `HINCRBY cart:user:1 sku_A 1` (tăng số lượng), `HDEL cart:user:1 sku_B`, `HGETALL cart:user:1`. Thay vì serialize/deserialize cả JSON mỗi lần đổi số lượng.',
  viz: {
    type: 'compare',
    cols: ['Hash (HSET user:1 name ... age ...)', 'Nhiều String (user:1:name, user:1:age)'],
    rows: [
      ['Bộ nhớ', 'nhỏ → listpack compact', 'overhead một key/entry'],
      ['Thao tác một phần', 'HGET / HINCRBY một field', 'phải quản lý nhiều key'],
      ['Gom logic', 'xoá / set TTL cho cả object', 'phải xoá từng key'],
      ['Là gì', '"object/record" trong Redis', '—'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Một object = một key, sửa từng field",
      code:
        "# Thay vì nhiều String rời rạc:\n" +
        "#   user:1:name, user:1:email, user:1:tier   -> 3 key, 3 lần round-trip\n" +
        "# Dùng Hash:\n" +
        "redis-cli HSET user:1 name \"An\" email \"an@x.com\" tier \"gold\" points 120\n" +
        "redis-cli HGET user:1 tier                  # lấy MỘT field, không phải cả object\n" +
        "redis-cli HMGET user:1 name tier            # lấy vài field\n" +
        "redis-cli HGETALL user:1                    # O(N) — cẩn thận với hash lớn\n" +
        "redis-cli HINCRBY user:1 points 10          # tăng field NGUYÊN TỬ\n" +
        "redis-cli HDEL user:1 email\n" +
        "redis-cli HEXISTS user:1 tier\n" +
        "\n" +
        "# ƯU ĐIỂM SO VỚI JSON TRONG STRING:\n" +
        "#  - sửa MỘT field không phải đọc-parse-ghi lại cả object (tránh race condition)\n" +
        "#  - HINCRBY nguyên tử ngay trên field\n" +
        "#  - hash NHỎ (dưới hash-max-listpack-entries=128 và\n" +
        "#    hash-max-listpack-value=64) được mã hoá thành LISTPACK -> tiết kiệm\n" +
        "#    bộ nhớ tới vài lần so với các String riêng lẻ\n" +
        "redis-cli OBJECT ENCODING user:1            # listpack hoặc hashtable\n" +
        "\n" +
        "# HẠN CHẾ QUAN TRỌNG: KHÔNG đặt TTL cho từng FIELD được (chỉ cả key).\n" +
        "# (Redis 7.4 mới thêm HEXPIRE.) Cần TTL từng phần -> tách thành key riêng.\n" +
        "# Và HGETALL trên hash hàng chục nghìn field sẽ chặn server -> dùng HSCAN.\n" +
        "redis-cli HSCAN user:1 0 COUNT 100",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-d3626b',
  q: 'List trong Redis: cấu trúc và use case?',
  answer:
    'List là danh sách liên kết (quicklist — mảng các listpack). `LPUSH`/`RPUSH` thêm hai đầu O(1); `LRANGE` đọc theo range; `LPOP`/`RPOP`; `LLEN`.\n\n' +
    'Use case:\n' +
    '- **Queue/stack**: producer `LPUSH`, consumer `RPOP` (hoặc `BRPOP` blocking).\n' +
    '- **Timeline/feed** giới hạn: `LPUSH feed:user:1 postId` + `LTRIM feed:user:1 0 999` (giữ 1000 mới nhất).\n' +
    '- **Log gần đây**, activity stream.\n\n' +
    'Truy cập theo index (`LINDEX`) là O(N) — không dùng list như array.',
  essence:
    'List tối ưu cho thao tác **hai đầu** (queue, feed có giới hạn). Cho hàng đợi bền vững/nhiều consumer group thì Streams tốt hơn.',
  example:
    'Feed "bài mới nhất": mỗi khi có post, `LPUSH feed:follower:X postId` cho mọi follower + `LTRIM feed:follower:X 0 499`. Đọc feed = `LRANGE feed:follower:X 0 19`. Bounded, O(1) ghi, O(K) đọc.',
  viz: {
    type: 'tree',
    title: 'List (quicklist) — tối ưu thao tác HAI ĐẦU',
    root: {
      label: 'LPUSH/RPUSH O(1); LINDEX O(N) — đừng dùng như array',
      children: [
        { label: 'Queue / stack', note: 'LPUSH + RPOP (hoặc BRPOP blocking)' },
        { label: 'Timeline/feed giới hạn', note: 'LPUSH + LTRIM feed 0 999 (giữ 1000 mới nhất)' },
        { label: 'Log gần đây, activity stream' },
        { label: 'Hàng đợi bền vững / nhiều consumer group', note: '→ Streams tốt hơn' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Danh sách liên kết hai đầu (quicklist)",
      code:
        "# Cấu trúc: quicklist (danh sách liên kết của các listpack) -> thêm/xoá ở\n" +
        "# HAI ĐẦU là O(1), nhưng truy cập GIỮA là O(N).\n" +
        "redis-cli LPUSH queue:jobs \"job1\" \"job2\"    # đẩy vào đầu\n" +
        "redis-cli RPUSH queue:jobs \"job3\"           # đẩy vào cuối\n" +
        "redis-cli LPOP queue:jobs                   # lấy từ đầu\n" +
        "redis-cli RPOP queue:jobs\n" +
        "redis-cli LLEN queue:jobs\n" +
        "redis-cli LRANGE queue:jobs 0 9             # 10 phần tử đầu — O(N)\n" +
        "\n" +
        "# 1) HÀNG ĐỢI công việc đơn giản (FIFO): LPUSH + BRPOP\n" +
        "redis-cli BRPOP queue:jobs 30               # CHẶN tối đa 30s, không cần polling\n" +
        "# An toàn hơn — không mất job khi consumer chết giữa chừng:\n" +
        "redis-cli LMOVE queue:jobs queue:processing RIGHT LEFT\n" +
        "# (BRPOPLPUSH là bản cũ; LMOVE/BLMOVE là bản mới nên dùng)\n" +
        "\n" +
        "# 2) DANH SÁCH GIỚI HẠN — timeline, log gần nhất, hoạt động gần đây\n" +
        "redis-cli LPUSH user:1:timeline \"post-99\"\n" +
        "redis-cli LTRIM user:1:timeline 0 99        # chỉ giữ 100 mục mới nhất\n" +
        "# Cặp LPUSH + LTRIM là mẫu rất hay dùng để danh sách không phình vô hạn.\n" +
        "\n" +
        "# 3) STACK (LIFO): LPUSH + LPOP\n" +
        "\n" +
        "# LƯU Ý: dùng List làm message queue có hạn chế thật sự — không có consumer\n" +
        "# group, không ack, không phát lại. Cần những thứ đó thì dùng STREAMS.",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-1alkt76',
  q: 'Set dùng cho việc gì? Các phép toán tập hợp?',
  answer:
    'Set = tập phần tử duy nhất, không thứ tự. `SADD`, `SREM`, `SISMEMBER` (O(1)), `SCARD`, `SMEMBERS` (cẩn thận nếu lớn), `SRANDMEMBER`, `SPOP`.\n\n' +
    'Phép toán: `SINTER` (giao), `SUNION` (hợp), `SDIFF` (hiệu) — và bản `*STORE` lưu kết quả.\n\n' +
    'Use case: tag, danh sách bạn bè, "ai đã like", chống trùng, chọn ngẫu nhiên, tính "bạn chung".',
  essence:
    'Set trả lời nhanh "phần tử này có trong nhóm không?" và các câu hỏi giao/hợp/hiệu giữa các nhóm — mà không cần kéo dữ liệu về app để xử lý.',
  example:
    '"Bạn chung của A và B": `SINTER friends:A friends:B`. "Người xem video X nhưng chưa mua": `SDIFF viewers:X buyers:X`. "Bài viết có cả tag redis và cache": `SINTER tag:redis tag:cache`.',
  viz: {
    type: 'tree',
    title: 'Set — tập phần tử duy nhất, không thứ tự',
    root: {
      label: 'Trả lời nhanh "phần tử này có trong nhóm không?" + giao/hợp/hiệu',
      children: [
        { label: 'SADD / SREM / SISMEMBER (O(1)) / SCARD' },
        { label: 'SINTER (giao)', note: '"bạn chung của A và B"' },
        { label: 'SUNION (hợp) / SDIFF (hiệu)', note: '"người xem X nhưng chưa mua"' },
        { label: 'Use case', note: 'tag, bạn bè, "ai đã like", chống trùng, chọn ngẫu nhiên' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Tập hợp không trùng, và các phép toán tập hợp",
      code:
        "redis-cli SADD post:1:tags \"redis\" \"cache\" \"database\"\n" +
        "redis-cli SISMEMBER post:1:tags \"redis\"     # O(1) — kiểm tra thành viên\n" +
        "redis-cli SCARD post:1:tags                 # đếm, O(1)\n" +
        "redis-cli SMEMBERS post:1:tags              # O(N) — cẩn thận với set lớn\n" +
        "redis-cli SRANDMEMBER post:1:tags 2         # lấy ngẫu nhiên (bốc thăm, gợi ý)\n" +
        "redis-cli SPOP post:1:tags                  # lấy VÀ xoá ngẫu nhiên\n" +
        "\n" +
        "# PHÉP TOÁN TẬP HỢP — đây là thứ làm Set đáng giá\n" +
        "redis-cli SINTER user:1:friends user:2:friends       # bạn chung\n" +
        "redis-cli SUNION tag:redis tag:cache                 # hợp\n" +
        "redis-cli SDIFF user:1:friends user:2:friends        # có ở 1 mà không có ở 2\n" +
        "redis-cli SINTERSTORE result user:1:friends user:2:friends   # lưu kết quả\n" +
        "\n" +
        "# USE CASE thực tế:\n" +
        "#  - khử trùng lặp (id đã xử lý, IP đã thấy)\n" +
        "#  - quan hệ nhiều-nhiều (tag, người theo dõi, quyền)\n" +
        "#  - \"bạn chung\", \"sản phẩm cùng danh mục\" bằng SINTER\n" +
        "#  - lấy ngẫu nhiên có kiểm soát (SRANDMEMBER)\n" +
        "\n" +
        "# CẢNH BÁO: SINTER/SUNION trên set hàng triệu phần tử là O(N*M) và CHẶN\n" +
        "# server (đơn luồng). Set lớn thì tính trước hoặc chia nhỏ.\n" +
        "# SSCAN để duyệt an toàn thay cho SMEMBERS:\n" +
        "redis-cli SSCAN post:1:tags 0 COUNT 100",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-el3s9y',
  q: 'Sorted Set (ZSet): cấu trúc và các use case kinh điển?',
  answer:
    'ZSet = set mà mỗi phần tử có một **score** (double); phần tử được **sắp xếp theo score**. Hiện thực bằng skiplist + hash → thêm/xoá/tra hạng O(log N).\n\n' +
    'Lệnh: `ZADD`, `ZRANGE`/`ZREVRANGE` (theo hạng), `ZRANGEBYSCORE` (theo khoảng score), `ZRANK`, `ZINCRBY`, `ZPOPMIN`.\n\n' +
    'Use case: **leaderboard** (score = điểm), **priority queue / delayed job** (score = timestamp thực thi), **sliding window rate limit** (score = timestamp), **time-series index**, top-N.',
  essence:
    'ZSet = "danh sách luôn được sắp xếp, có thể truy vấn theo hạng hoặc theo khoảng score". Là cấu trúc linh hoạt nhất của Redis, giải quyết leaderboard, hàng đợi có ưu tiên và rate limit chính xác.',
  example:
    'Delayed queue: `ZADD jobs <runAtEpoch> jobId`. Worker mỗi giây: `ZRANGEBYSCORE jobs -inf <now> LIMIT 0 10` lấy job đến hạn, xử lý, `ZREM`. Leaderboard: `ZINCRBY game:leaderboard 10 player:5`, `ZREVRANGE game:leaderboard 0 9 WITHSCORES` cho top 10.',
  viz: {
    type: 'flow',
    title: 'ZSet — "danh sách luôn được sắp xếp" (skiplist + hash, O(log N))',
    nodes: ['ZADD jobs <runAtEpoch> jobId', 'worker mỗi giây: ZRANGEBYSCORE jobs -inf <now> LIMIT 0 10', 'xử lý job đến hạn', 'ZREM'],
    steps: [
      { to: 0, label: 'score = timestamp thực thi → delayed queue' },
      { to: 1, label: 'lấy job đến hạn theo khoảng score' },
      { to: 3, label: 'cùng cấu trúc giải quyết: leaderboard (score=điểm), sliding window rate limit (score=timestamp), top-N' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Skip list + hash table -> vừa xếp hạng vừa tra cứu O(1)",
      code:
        "# Mỗi phần tử có một SCORE (số thực) quyết định thứ tự.\n" +
        "redis-cli ZADD leaderboard 1500 \"player1\" 2300 \"player2\" 1800 \"player3\"\n" +
        "redis-cli ZINCRBY leaderboard 100 \"player1\"        # cộng điểm nguyên tử\n" +
        "redis-cli ZSCORE leaderboard \"player1\"             # O(1)\n" +
        "redis-cli ZREVRANK leaderboard \"player1\"           # hạng (0 = cao nhất) — O(log N)\n" +
        "redis-cli ZREVRANGE leaderboard 0 9 WITHSCORES     # top 10 — O(log N + M)\n" +
        "redis-cli ZRANGEBYSCORE leaderboard 1000 2000      # lọc theo khoảng điểm\n" +
        "redis-cli ZCOUNT leaderboard 1000 2000\n" +
        "\n" +
        "# BỐN USE CASE KINH ĐIỂN:\n" +
        "# 1) BẢNG XẾP HẠNG — đúng bài toán mà ZSet sinh ra\n" +
        "# 2) HÀNG ĐỢI ƯU TIÊN / hẹn giờ: score = timestamp\n" +
        "redis-cli ZADD delayed:jobs 1757030400 \"job-1\"\n" +
        "redis-cli ZRANGEBYSCORE delayed:jobs 0 $(date +%s) LIMIT 0 10   # job tới hạn\n" +
        "redis-cli ZPOPMIN delayed:jobs                                  # lấy sớm nhất\n" +
        "# 3) RATE LIMITING sliding window: score = timestamp, xoá phần ngoài cửa sổ\n" +
        "redis-cli ZREMRANGEBYSCORE rate:user:1 0 $(($(date +%s) - 60))\n" +
        "redis-cli ZCARD rate:user:1\n" +
        "# 4) DỮ LIỆU CHUỖI THỜI GIAN: score = thời điểm, lấy theo khoảng\n" +
        "\n" +
        "# ZRANGEBYLEX — khi MỌI phần tử có CÙNG score, sắp xếp theo từ điển\n" +
        "redis-cli ZADD autocomplete 0 \"redis\" 0 \"redisearch\" 0 \"redistribute\"\n" +
        "redis-cli ZRANGEBYLEX autocomplete \"[redis\" \"[redis\\xff\"     # gợi ý tiền tố",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-10fsq8s',
  q: 'HyperLogLog dùng để làm gì? Đánh đổi ra sao?',
  answer:
    'HyperLogLog ước lượng **số phần tử duy nhất** (cardinality) của một tập rất lớn với sai số ~0.81%, chỉ tốn **12KB** cố định mỗi key — bất kể tập có 100 hay 1 tỉ phần tử.\n\n' +
    'Lệnh: `PFADD key element`, `PFCOUNT key`, `PFMERGE dest src1 src2`.\n\n' +
    'Đánh đổi: **không lưu phần tử thật** (không kiểm tra "X có trong tập không"), kết quả là **ước lượng**.',
  essence:
    'HLL đổi độ chính xác tuyệt đối lấy bộ nhớ hằng số cực nhỏ. Dùng khi bạn chỉ cần *con số đếm distinct gần đúng*, không cần danh sách.',
  example:
    'Đếm "số IP/user duy nhất truy cập mỗi trang mỗi ngày" cho hàng triệu trang: một Set sẽ tốn GB. `PFADD uv:page:123:2024-06-01 <userId>` → 12KB/trang/ngày. `PFCOUNT` cho unique visitor; `PFMERGE` để cộng dồn theo tuần.',
  viz: {
    type: 'compare',
    cols: ['Set', 'HyperLogLog'],
    rows: [
      ['Bộ nhớ cho 1 tỉ phần tử', 'GB', '12KB CỐ ĐỊNH'],
      ['Độ chính xác', 'tuyệt đối', 'ước lượng (sai số ~0.81%)'],
      ['Kiểm tra "X có trong tập?"', 'được (SISMEMBER)', 'KHÔNG — không lưu phần tử thật'],
      ['Dùng khi', 'cần danh sách + kiểm tra thành viên', 'chỉ cần con số đếm distinct gần đúng'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đếm phần tử duy nhất với 12KB cố định",
      code:
        "# BÀI TOÁN: đếm số user duy nhất truy cập trong ngày. Dùng Set thì 10 triệu\n" +
        "# user tốn hàng trăm MB. HyperLogLog luôn tốn 12KB, bất kể bao nhiêu phần tử.\n" +
        "redis-cli PFADD visitors:2026-09-05 \"user1\" \"user2\" \"user3\"\n" +
        "redis-cli PFCOUNT visitors:2026-09-05\n" +
        "\n" +
        "# GỘP nhiều ngày — đây là điểm mạnh thật sự, Set không làm được rẻ như vậy\n" +
        "redis-cli PFMERGE visitors:week visitors:2026-09-01 visitors:2026-09-02 \\\n" +
        "  visitors:2026-09-03 visitors:2026-09-04 visitors:2026-09-05\n" +
        "redis-cli PFCOUNT visitors:week\n" +
        "# Gộp KHÔNG đếm trùng: user vào cả 5 ngày vẫn chỉ tính một lần.\n" +
        "\n" +
        "# ĐÁNH ĐỔI phải chấp nhận:\n" +
        "#  - SAI SỐ ~0,81% (đếm 1.000.000 có thể ra 1.008.000)\n" +
        "#  - KHÔNG lấy ra được danh sách phần tử — chỉ biết SỐ LƯỢNG\n" +
        "#  - không kiểm tra được \"user X đã có trong đó chưa\"\n" +
        "\n" +
        "# KHI NÀO DÙNG: đếm UV, số IP duy nhất, số từ khoá tìm kiếm duy nhất —\n" +
        "# những chỗ mà sai lệch 1% không ảnh hưởng quyết định.\n" +
        "# KHI NÀO KHÔNG: đếm tiền, đếm tồn kho, hoặc cần lấy danh sách -> dùng Set.\n" +
        "\n" +
        "# So sánh bộ nhớ 10 triệu phần tử: Set ~400MB, HyperLogLog 12KB.",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-12rgnbi',
  q: 'Redis Streams khác Pub/Sub và List như thế nào?',
  answer:
    '- **Pub/Sub**: fire-and-forget. Subscriber offline lúc publish → **mất message**. Không lưu trữ, không replay, không ack.\n' +
    '- **List** (như queue): message được lưu, nhưng `RPOP` xoá luôn → chỉ một consumer nhận, không có consumer group, không replay, khó theo dõi "đã xử lý".\n' +
    '- **Streams**: log **append-only** có id (timestamp-seq), **lưu trữ** (có `MAXLEN` để giới hạn), **consumer groups** (nhiều consumer chia tải), **ACK** (`XACK`), theo dõi pending (`XPENDING`), claim lại message treo (`XCLAIM`), replay theo id.',
  essence:
    'Pub/Sub = broadcast không đảm bảo. List = queue đơn giản một chiều. Streams = "Kafka mini trong Redis": bền, có group, có ack, replay được.',
  example:
    'Thông báo realtime tới UI đang mở (mất cũng không sao): Pub/Sub. Hàng đợi task cần đảm bảo xử lý, nhiều worker, retry message lỗi: Streams với consumer group — `XADD`, `XREADGROUP`, `XACK`, và job cron `XAUTOCLAIM` message treo quá lâu.',
  viz: {
    type: 'compare',
    cols: ['Pub/Sub', 'List (như queue)', 'Streams'],
    rows: [
      ['Lưu trữ', 'không — subscriber offline → mất', 'có, nhưng RPOP xoá luôn', 'log append-only, có MAXLEN'],
      ['Nhiều consumer', 'broadcast', 'chỉ 1 nhận', 'consumer groups chia tải'],
      ['ACK / replay', 'không', 'không', 'XACK, XPENDING, XCLAIM, replay theo id'],
      ['Là gì', 'broadcast không đảm bảo', 'queue một chiều đơn giản', '"Kafka mini trong Redis"'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Log có thứ tự, giữ lại được, có consumer group",
      code:
        "# PUB/SUB — fire-and-forget: ai không online lúc gửi thì MẤT message vĩnh viễn.\n" +
        "# LIST — giữ được, nhưng không có consumer group, không ack, đọc là mất.\n" +
        "# STREAMS — log append-only: giữ lại, nhiều consumer group độc lập, có ACK.\n" +
        "\n" +
        "redis-cli XADD orders \u0027*\u0027 orderId 1001 total 500000   # * = tự sinh id theo thời gian\n" +
        "redis-cli XLEN orders\n" +
        "redis-cli XRANGE orders - +                            # đọc toàn bộ\n" +
        "redis-cli XREAD COUNT 10 BLOCK 5000 STREAMS orders 0   # đọc từ đầu, chặn 5s\n" +
        "\n" +
        "# CONSUMER GROUP — chia việc và theo dõi cái nào đã xử lý\n" +
        "redis-cli XGROUP CREATE orders billing 0\n" +
        "redis-cli XREADGROUP GROUP billing worker-1 COUNT 10 BLOCK 5000 STREAMS orders \u0027>\u0027\n" +
        "redis-cli XACK orders billing 1757030400000-0          # báo đã xử lý xong\n" +
        "\n" +
        "# Message đã đọc mà chưa ACK nằm trong PEL (pending entries list) -> KHÔNG mất\n" +
        "redis-cli XPENDING orders billing\n" +
        "# Consumer chết -> consumer khác GIÀNH LẤY việc dở của nó:\n" +
        "redis-cli XAUTOCLAIM orders billing worker-2 60000 0   # quá 60s chưa ack\n" +
        "\n" +
        "# GIỚI HẠN ĐỘ DÀI — stream không tự xoá, phải chủ động cắt:\n" +
        "redis-cli XADD orders MAXLEN \u0027~\u0027 1000000 \u0027*\u0027 orderId 1002\n" +
        "# ~ nghĩa là \"xấp xỉ\" -> rẻ hơn nhiều so với cắt chính xác.\n" +
        "\n" +
        "# CHỌN: thông báo tức thời không cần bền -> PUB/SUB.\n" +
        "# Hàng đợi đơn giản một consumer -> LIST.\n" +
        "# Cần ack, consumer group, phát lại -> STREAMS.",
    },
  ],
},
{
  cat: 'TTL & key',
  id: 'redis-1j3qe0n',
  q: 'TTL / expiration trong Redis hoạt động thế nào?',
  answer:
    'Đặt hạn: `EXPIRE key 60`, `SET key v EX 60`, `PEXPIRE` (ms), `EXPIREAT` (timestamp). Xem: `TTL`/`PTTL`. Gỡ hạn: `PERSIST`.\n\n' +
    'Redis xoá key hết hạn theo **hai cơ chế**:\n' +
    '- **Lazy**: khi một client truy cập key, nếu hết hạn thì xoá và trả nil.\n' +
    '- **Active**: mỗi ~100ms, lấy mẫu ngẫu nhiên các key có TTL, xoá cái đã hết hạn; nếu tỉ lệ hết hạn cao thì lặp lại.\n\n' +
    'Ghi đè giá trị bằng `SET` (không kèm `KEEPTTL`) sẽ **xoá TTL**.',
  essence:
    'Key hết hạn không biến mất ngay lập tức về mặt bộ nhớ — nó được dọn khi bị chạm tới hoặc khi vòng quét ngẫu nhiên bắt được. Cẩn thận `SET` làm mất TTL đã đặt.',
  example:
    'Session `SET session:abc "<data>" EX 1800`. Gia hạn khi user hoạt động: `EXPIRE session:abc 1800` (sliding). Nếu update data bằng `SET session:abc "<new>"` mà quên `KEEPTTL` → session thành vĩnh viễn, rò rỉ bộ nhớ dần.',
  viz: {
    type: 'flow',
    title: 'TTL / expiration',
    nodes: ['EXPIRE / SET ... EX', 'Lazy: khi client truy cập key hết hạn → xoá, trả nil', 'Active: mỗi ~100ms sample key có TTL, xoá cái hết hạn', 'SET (không KEEPTTL) → XOÁ TTL'],
    steps: [
      { to: 1, label: 'key hết hạn không biến mất ngay về mặt bộ nhớ' },
      { to: 2, label: 'nếu tỉ lệ hết hạn cao thì lặp lại vòng quét' },
      { to: 3, label: 'cẩn thận: ghi đè giá trị bằng SET làm mất TTL đã đặt → rò rỉ bộ nhớ' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hai cơ chế xoá và các bẫy hay gặp",
      code:
        "redis-cli SET session:abc \"data\" EX 3600      # đặt TTL ngay lúc SET (nên dùng)\n" +
        "redis-cli EXPIRE session:abc 1800             # đặt TTL cho key đã có\n" +
        "redis-cli TTL session:abc                     # giây còn lại; -1 = không TTL; -2 = không tồn tại\n" +
        "redis-cli PERSIST session:abc                 # gỡ TTL\n" +
        "redis-cli EXPIREAT session:abc 1757030400     # hết hạn tại một thời điểm\n" +
        "\n" +
        "# HAI CƠ CHẾ XOÁ:\n" +
        "#  1) LAZY — chỉ kiểm tra khi key được TRUY CẬP. Key hết hạn mà không ai đụng\n" +
        "#     tới thì vẫn CHIẾM BỘ NHỚ.\n" +
        "#  2) ACTIVE — mỗi 100ms lấy NGẪU NHIÊN 20 key có TTL, xoá cái đã hết hạn;\n" +
        "#     nếu hơn 25% đã hết hạn thì lặp lại ngay.\n" +
        "# -> Đây là lý do bộ nhớ không giảm ngay sau khi hàng loạt key hết hạn,\n" +
        "#    và vì sao không nên dựa vào thời điểm hết hạn để tính toán chính xác.\n" +
        "\n" +
        "# BẪY 1: các lệnh GHI ĐÈ giá trị sẽ XOÁ TTL\n" +
        "redis-cli SET k v EX 60\n" +
        "redis-cli SET k v2              # TTL BIẾN MẤT -> key sống mãi\n" +
        "redis-cli SET k v2 KEEPTTL      # Redis 6.0+: giữ nguyên TTL\n" +
        "# Ngược lại: INCR, HSET, LPUSH... KHÔNG làm mất TTL của key.\n" +
        "\n" +
        "# BẪY 2: hàng loạt key cùng TTL -> hết hạn cùng lúc -> cache avalanche.\n" +
        "# Thêm ngẫu nhiên: EX (3600 + random(0..300))\n" +
        "\n" +
        "# BẪY 3: keyspace notification \"expired\" gửi khi key BỊ XOÁ THẬT, có thể\n" +
        "# trễ hơn thời điểm hết hạn nhiều -> đừng dùng cho logic cần chính xác thời gian.",
    },
  ],
},
{
  cat: 'TTL & key',
  id: 'redis-x1z1jo',
  q: 'Vì sao không dùng `KEYS` trong production? Dùng gì thay thế?',
  answer:
    '`KEYS pattern` quét **toàn bộ keyspace** trong một lần, O(N), **chặn server** cho tới khi xong. Với hàng triệu key = treo vài giây → mọi client timeout.\n\n' +
    '`SCAN cursor MATCH pattern COUNT 100`: **iterator** — trả về một phần key + cursor để lặp tiếp. Không chặn (mỗi lần chỉ làm một ít việc). Đảm bảo: key tồn tại suốt quá trình scan sẽ được trả (có thể trùng, có thể bỏ sót key thêm/xoá giữa chừng).\n\n' +
    'Tương tự: `HSCAN`, `SSCAN`, `ZSCAN` cho collection lớn.',
  essence:
    '`KEYS` và các lệnh O(N) lớn là "vũ khí tự sát" trên server đơn luồng. `SCAN` chia công việc thành nhiều bước nhỏ, không làm nghẽn client khác.',
  example:
    'Cần xoá mọi key `session:*` của một user: `SCAN 0 MATCH session:user:1:* COUNT 200` trong vòng lặp, `UNLINK` (xoá bất đồng bộ) từng batch. Không bao giờ `KEYS session:*` rồi `DEL`.',
  viz: {
    type: 'compare',
    cols: ['KEYS pattern', 'SCAN cursor MATCH pattern COUNT 100'],
    rows: [
      ['Cách hoạt động', 'quét toàn bộ keyspace một lần, O(N)', 'iterator — trả một phần key + cursor'],
      ['Chặn server?', 'CÓ — treo vài giây với hàng triệu key', 'không (mỗi lần làm một ít việc)'],
      ['Đảm bảo', '—', 'key tồn tại suốt scan sẽ được trả (có thể trùng)'],
      ['Tương tự cho collection', '—', 'HSCAN, SSCAN, ZSCAN'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "KEYS chặn cả server, SCAN thì không",
      code:
        "# KEYS quét TOÀN BỘ keyspace, O(N), và vì Redis đơn luồng nên nó CHẶN\n" +
        "# mọi client khác. 10 triệu key -> treo vài giây -> timeout hàng loạt.\n" +
        "redis-cli KEYS \u0027user:*\u0027          # ĐỪNG BAO GIỜ chạy ở production\n" +
        "\n" +
        "# SCAN — con trỏ, trả về từng phần nhỏ, KHÔNG chặn\n" +
        "redis-cli SCAN 0 MATCH \u0027user:*\u0027 COUNT 100\n" +
        "# Trả về [cursor_mới, [keys...]]. Lặp tới khi cursor = 0.\n" +
        "redis-cli --scan --pattern \u0027user:*\u0027 | head -20    # tiện dụng từ CLI\n" +
        "\n" +
        "# ĐẢM BẢO CỦA SCAN (phải hiểu để dùng đúng):\n" +
        "#  - key tồn tại suốt quá trình quét CHẮC CHẮN được trả về\n" +
        "#  - key có thể bị trả về TRÙNG -> code phải chịu được trùng\n" +
        "#  - key thêm/xoá trong lúc quét thì không đảm bảo gì\n" +
        "#  - COUNT chỉ là GỢI Ý, không phải số lượng chính xác mỗi lần\n" +
        "\n" +
        "# Biến thể cho từng kiểu dữ liệu — dùng khi collection lớn:\n" +
        "redis-cli HSCAN user:1 0 COUNT 100\n" +
        "redis-cli SSCAN post:1:tags 0 COUNT 100\n" +
        "redis-cli ZSCAN leaderboard 0 COUNT 100\n" +
        "\n" +
        "# CÁC LỆNH NGUY HIỂM KHÁC (đều O(N) và chặn): FLUSHALL, FLUSHDB, SMEMBERS,\n" +
        "# HGETALL, LRANGE 0 -1 trên collection lớn.\n" +
        "# Chặn hẳn ở production:\n" +
        "#   rename-command KEYS \"\"\n" +
        "#   rename-command FLUSHALL \"\"",
    },
  ],
},
{
  cat: 'Hiệu năng',
  id: 'redis-tvassk',
  q: 'Pipelining trong Redis là gì? Khác transaction thế nào?',
  answer:
    '**Pipelining**: client gửi **nhiều lệnh liên tiếp** không chờ reply từng cái, rồi đọc tất cả reply một lượt. Giảm số lần round-trip mạng (RTT) → tăng throughput hàng chục lần cho batch lệnh nhỏ.\n\n' +
    'Pipeline **không** đảm bảo nguyên tử: lệnh của client khác có thể xen vào giữa. Nó chỉ là tối ưu mạng.\n\n' +
    '`MULTI/EXEC` (transaction) đảm bảo các lệnh chạy **liên tiếp không bị xen**, nhưng không rollback nếu một lệnh lỗi logic.',
  essence:
    'Pipeline tối ưu **độ trễ mạng** (gộp RTT). Transaction đảm bảo **tính nguyên tử** (không xen kẽ). Hai mục đích khác nhau — thường dùng pipeline nhiều hơn.',
  example:
    'Nạp 10.000 cặp key-value lúc warm cache: không pipeline = 10.000 RTT (~mỗi cái 0.5ms → 5s). Pipeline theo lô 500 = 20 RTT → ~10ms. Với client như lettuce/redis-py, bật pipeline/batch mode.',
  viz: {
    type: 'compare',
    cols: ['Pipelining', 'MULTI/EXEC (transaction)'],
    rows: [
      ['Tối ưu', 'độ trễ mạng (gộp RTT)', 'tính nguyên tử (không xen kẽ)'],
      ['Nguyên tử?', 'KHÔNG — lệnh client khác có thể xen', 'CÓ — chạy liên tiếp không bị xen'],
      ['Rollback', '—', 'không — lệnh lỗi logic, các lệnh khác vẫn chạy'],
      ['Dùng khi', 'batch lệnh nhỏ (thường xuyên hơn)', 'cần đảm bảo nhóm lệnh không bị chen ngang'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Gộp round-trip mạng, KHÔNG phải nguyên tử",
      code:
        "# VẤN ĐỀ: 1.000 lệnh tuần tự = 1.000 round-trip. Với RTT 1ms là mất 1 giây,\n" +
        "# trong khi Redis chỉ tốn vài mili giây để thực thi.\n" +
        "# PIPELINE: gửi hết một lượt, đọc hết một lượt -> 1 round-trip.\n" +
        "redis-cli --pipe < commands.txt\n" +
        "(echo -en \"SET k1 v1\\r\\nSET k2 v2\\r\\nGET k1\\r\\n\"; sleep 1) | nc localhost 6379\n" +
        "\n" +
        "# Trong client Java (Lettuce/Jedis):\n" +
        "#   pipeline.set(\"k1\",\"v1\"); pipeline.set(\"k2\",\"v2\"); pipeline.sync();\n" +
        "\n" +
        "# KHÁC TRANSACTION (MULTI/EXEC) — đây là điểm hay nhầm:\n" +
        "#  PIPELINE     — chỉ gom mạng. Lệnh của client KHÁC CÓ THỂ chen vào giữa.\n" +
        "#                 Không nguyên tử. Lỗi ở lệnh này không ảnh hưởng lệnh kia.\n" +
        "#  MULTI/EXEC   — nguyên tử: toàn bộ khối chạy liền mạch, không ai chen vào.\n" +
        "#                 Nhưng KHÔNG có rollback nếu một lệnh lỗi lúc thực thi.\n" +
        "redis-cli MULTI\n" +
        "redis-cli SET k1 v1\n" +
        "redis-cli EXEC\n" +
        "\n" +
        "# LƯU Ý KHI DÙNG PIPELINE:\n" +
        "#  - đừng gom quá lớn (hàng trăm nghìn lệnh) -> chiếm nhiều RAM ở cả hai phía\n" +
        "#    và giữ server bận lâu. Chia lô 100-1.000 lệnh là hợp lý.\n" +
        "#  - trong Redis Cluster, pipeline chỉ gom được các key CÙNG một node\n" +
        "#  - cần vừa nguyên tử vừa có logic điều kiện -> dùng LUA thay vì pipeline",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-1unxyo5',
  q: 'MULTI/EXEC và WATCH (optimistic locking) hoạt động thế nào?',
  answer:
    '`MULTI` bắt đầu ghi hàng đợi lệnh; các lệnh sau đó được **xếp hàng** (trả `QUEUED`); `EXEC` chạy **toàn bộ liên tiếp, nguyên tử** (không client nào xen vào). `DISCARD` huỷ.\n\n' +
    '**Không có rollback**: nếu một lệnh trong transaction fail (ví dụ sai kiểu), các lệnh khác vẫn chạy.\n\n' +
    '`WATCH key`: trước `MULTI`, đánh dấu theo dõi key. Nếu key đó bị **sửa bởi client khác** trước `EXEC` → `EXEC` trả nil (transaction huỷ) → client tự thử lại. Đây là **CAS / optimistic lock**.',
  essence:
    'MULTI/EXEC = "chạy nhóm lệnh này không ai chen ngang". WATCH thêm "và huỷ nếu dữ liệu tôi dựa vào đã đổi". Không có rollback nên phải tự kiểm tra điều kiện trước.',
  example:
    'Trừ số dư an toàn: `WATCH balance:1` → `GET balance:1` (giả sử 100) → nếu đủ tiền: `MULTI` → `DECRBY balance:1 30` → `EXEC`. Nếu client khác vừa đổi `balance:1` → `EXEC` trả nil → lặp lại. Hoặc đơn giản hơn: dùng Lua.',
  viz: {
    type: 'flow',
    title: 'MULTI/EXEC + WATCH = CAS / optimistic lock',
    nodes: ['WATCH balance:1', 'GET balance:1 (kiểm tra điều kiện)', 'MULTI → lệnh QUEUED', 'EXEC', 'key bị client khác sửa trước EXEC → EXEC trả nil → retry'],
    steps: [
      { to: 0, label: 'đánh dấu theo dõi key TRƯỚC MULTI' },
      { to: 3, label: 'EXEC chạy toàn bộ liên tiếp, nguyên tử — không có rollback' },
      { to: 4, label: 'phải tự kiểm tra điều kiện trước; hoặc dùng Lua cho đơn giản' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Transaction Redis: nguyên tử nhưng KHÔNG rollback",
      code:
        "redis-cli MULTI                      # bắt đầu: các lệnh sau được XẾP HÀNG\n" +
        "redis-cli SET account:1 100\n" +
        "redis-cli INCRBY account:2 50\n" +
        "redis-cli EXEC                       # thực thi TẤT CẢ liền mạch, không ai chen vào\n" +
        "redis-cli DISCARD                    # huỷ hàng đợi\n" +
        "\n" +
        "# KHÔNG CÓ ROLLBACK: nếu một lệnh lỗi lúc THỰC THI (ví dụ INCR trên chuỗi),\n" +
        "# các lệnh khác VẪN chạy. Redis coi đó là lỗi lập trình, không phải lỗi runtime.\n" +
        "# (Lỗi CÚ PHÁP lúc xếp hàng thì cả khối bị huỷ.)\n" +
        "\n" +
        "# WATCH — khoá lạc quan (CAS): huỷ transaction nếu key bị NGƯỜI KHÁC sửa\n" +
        "redis-cli WATCH account:1\n" +
        "# đọc giá trị, tính toán ở phía client\n" +
        "redis-cli MULTI\n" +
        "redis-cli SET account:1 <giá_trị_mới>\n" +
        "redis-cli EXEC       # trả về nil nếu account:1 đã bị sửa từ lúc WATCH -> thử lại\n" +
        "\n" +
        "# Mẫu chuẩn trong ứng dụng:\n" +
        "#   while (true) {\n" +
        "#     watch(key);\n" +
        "#     var v = get(key);\n" +
        "#     if (!ok(v)) { unwatch(); break; }\n" +
        "#     var r = multi().set(key, f(v)).exec();\n" +
        "#     if (r != null) break;          // thành công\n" +
        "#   }                                 // null -> có xung đột, lặp lại\n" +
        "\n" +
        "# EXEC và DISCARD đều tự gỡ WATCH.\n" +
        "# THỰC TẾ: vòng lặp WATCH dài dòng và tốn round-trip -> phần lớn trường hợp\n" +
        "# dùng LUA gọn hơn và nhanh hơn, vì script chạy nguyên tử ngay trên server.",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-5x33ra',
  q: 'Lua scripting trong Redis: vì sao dùng, quy tắc gì?',
  answer:
    '`EVAL script numkeys key... arg...` chạy một script Lua **nguyên tử** trên server (như một lệnh duy nhất, không client nào xen vào). `EVALSHA` chạy theo SHA1 đã cache (client gửi script một lần).\n\n' +
    'Quy tắc:\n' +
    '- Script phải **deterministic** (không dùng random/time tuỳ tiện — dùng arg truyền vào).\n' +
    '- Mọi key phải khai báo trong `KEYS[]` (để tương thích Cluster).\n' +
    '- Không nên chạy script dài — nó **chặn** server.',
  essence:
    'Lua = "gộp nhiều thao tác đọc-nghĩ-ghi thành một lệnh nguyên tử phía server" — giải quyết được race mà pipeline/transaction đơn giản không làm được (vì có logic điều kiện ở giữa).',
  example:
    'Rate limit token bucket chính xác: một script Lua đọc số token còn lại + timestamp, tính token hồi theo thời gian trôi qua, nếu đủ thì trừ 1 và trả OK, không đủ trả DENY — tất cả nguyên tử, không race dù nghìn request đồng thời.',
  viz: {
    type: 'tree',
    title: 'Lua scripting — gộp "đọc-nghĩ-ghi" thành MỘT lệnh nguyên tử',
    root: {
      label: 'EVAL / EVALSHA — giải race mà pipeline/transaction đơn giản không làm được',
      children: [
        { label: 'Nguyên tử', note: 'chạy như một lệnh, không client nào xen vào' },
        { label: 'Phải deterministic', note: 'không dùng random/time tuỳ tiện — dùng ARGV truyền vào' },
        { label: 'Mọi key khai báo trong KEYS[]', note: 'để tương thích Cluster' },
        { label: 'Không chạy script dài', note: 'nó CHẶN server' },
      ],
    },
  },
  demo: [
    {
      lang: "lua",
      title: "Nguyên tử hoá logic đọc-quyết định-ghi",
      code:
        "-- Script chạy NGUYÊN TỬ trên server: không lệnh nào chen vào giữa.\n" +
        "-- Giải quyết đúng bài toán mà pipeline và MULTI không làm được:\n" +
        "-- cần ĐỌC rồi QUYẾT ĐỊNH rồi GHI mà không ai xen vào.\n" +
        "\n" +
        "-- Ví dụ: rate limit token bucket\n" +
        "local key      = KEYS[1]\n" +
        "local capacity = tonumber(ARGV[1])\n" +
        "local rate     = tonumber(ARGV[2])   -- token mỗi giây\n" +
        "local now      = tonumber(ARGV[3])\n" +
        "local cost     = tonumber(ARGV[4])\n" +
        "\n" +
        "local bucket = redis.call(\u0027HMGET\u0027, key, \u0027tokens\u0027, \u0027ts\u0027)\n" +
        "local tokens = tonumber(bucket[1]) or capacity\n" +
        "local ts     = tonumber(bucket[2]) or now\n" +
        "\n" +
        "-- nạp lại token theo thời gian đã trôi qua\n" +
        "tokens = math.min(capacity, tokens + (now - ts) * rate)\n" +
        "\n" +
        "if tokens < cost then\n" +
        "  return 0                            -- từ chối\n" +
        "end\n" +
        "\n" +
        "tokens = tokens - cost\n" +
        "redis.call(\u0027HMSET\u0027, key, \u0027tokens\u0027, tokens, \u0027ts\u0027, now)\n" +
        "redis.call(\u0027EXPIRE\u0027, key, math.ceil(capacity / rate) * 2)\n" +
        "return 1                              -- cho phép",
    },
    {
      lang: "bash",
      title: "Quy tắc bắt buộc khi viết Lua",
      code:
        "redis-cli SCRIPT LOAD \"$(cat rate_limit.lua)\"       # trả về SHA1\n" +
        "redis-cli EVALSHA <sha1> 1 rate:user:1 10 1 $(date +%s) 1\n" +
        "# Dùng EVALSHA thay vì EVAL: không phải gửi cả script mỗi lần.\n" +
        "# Client phải xử lý lỗi NOSCRIPT (script cache bị xoá khi restart) bằng cách\n" +
        "# gửi lại EVAL — mọi client tốt đều làm sẵn việc này.\n" +
        "\n" +
        "# QUY TẮC BẮT BUỘC:\n" +
        "#  1) MỌI key phải truyền qua KEYS[], KHÔNG hardcode trong script.\n" +
        "#     Redis Cluster cần biết trước key để định tuyến; vi phạm là script\n" +
        "#     chạy sai node.\n" +
        "#  2) KHÔNG dùng nguồn ngẫu nhiên/thời gian trong script — truyền từ ngoài\n" +
        "#     qua ARGV để script TẤT ĐỊNH (cần cho replication và AOF).\n" +
        "#  3) Script phải NGẮN. Nó chặn toàn bộ server khi chạy.\n" +
        "redis-cli SCRIPT KILL          # cứu khi script chạy quá lâu (chỉ khi chưa ghi gì)",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-v9os1t',
  q: 'Bitmap trong Redis: use case và giới hạn?',
  answer:
    'Bitmap là String được thao tác ở mức bit: `SETBIT key offset 0|1`, `GETBIT`, `BITCOUNT` (đếm bit 1), `BITOP AND/OR/XOR/NOT`, `BITPOS`.\n\n' +
    'Offset là chỉ số user/entity → mỗi user tốn **1 bit**. 1 triệu user ≈ 125KB.\n\n' +
    'Use case: daily active users, "user đã xem thông báo chưa", A/B test bucket, feature access. Giới hạn: offset phải là số nguyên dày đặc (id lớn/thưa → tốn bộ nhớ do String phải cấp phát tới offset đó).',
  essence:
    'Bitmap = "mảng boolean khổng lồ nén cực chặt", lý tưởng cho trạng thái nhị phân theo user-id liên tục. Kết hợp `BITOP` để trả lời câu hỏi tập hợp trên hàng triệu user gần như tức thì.',
  example:
    '"User hoạt động cả 7 ngày trong tuần": `BITOP AND result dau:d1 dau:d2 ... dau:d7` rồi `BITCOUNT result`. "Hoạt động ít nhất 1 ngày": `BITOP OR`. Mỗi ngày một bitmap ~125KB cho 1M user.',
  viz: {
    type: 'tree',
    title: 'Bitmap — "mảng boolean khổng lồ nén cực chặt"',
    root: {
      label: 'offset = user-id → mỗi user 1 bit; 1M user ≈ 125KB',
      children: [
        { label: 'SETBIT / GETBIT / BITCOUNT / BITPOS' },
        { label: 'BITOP AND/OR/XOR/NOT', note: '"user hoạt động cả 7 ngày": BITOP AND rồi BITCOUNT' },
        { label: 'Use case', note: 'DAU, "đã xem thông báo chưa", A/B bucket, feature access' },
        { label: 'Giới hạn', note: 'offset phải dày đặc — id lớn/thưa → tốn RAM (String cấp phát tới offset đó)' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Trạng thái nhị phân của hàng triệu đối tượng trong vài trăm KB",
      code:
        "# Bitmap không phải kiểu riêng — nó là String thao tác ở mức BIT.\n" +
        "redis-cli SETBIT active:2026-09-05 12345 1     # user id 12345 hoạt động hôm nay\n" +
        "redis-cli GETBIT active:2026-09-05 12345\n" +
        "redis-cli BITCOUNT active:2026-09-05           # tổng số user hoạt động\n" +
        "redis-cli BITPOS active:2026-09-05 1           # id nhỏ nhất có bit = 1\n" +
        "\n" +
        "# PHÉP TOÁN BIT giữa các bitmap — đây là điểm mạnh thật sự\n" +
        "redis-cli BITOP AND active:both active:2026-09-04 active:2026-09-05  # hoạt động CẢ 2 ngày\n" +
        "redis-cli BITOP OR  active:week active:2026-09-01 active:2026-09-02\n" +
        "redis-cli BITCOUNT active:both\n" +
        "\n" +
        "# USE CASE:\n" +
        "#  - điểm danh / retention theo ngày (user hoạt động ngày nào)\n" +
        "#  - trạng thái bật/tắt cho hàng triệu đối tượng (đã đọc thông báo, đã nhận quà)\n" +
        "#  - A/B testing: user nào thuộc nhóm nào\n" +
        "#  - bloom filter thủ công\n" +
        "\n" +
        "# BỘ NHỚ: 1 triệu user = 1 triệu bit = 125KB. So với Set (~40MB) là gấp ~320 lần.\n" +
        "\n" +
        "# GIỚI HẠN QUAN TRỌNG:\n" +
        "#  1) offset phải là SỐ NGUYÊN liên tục và NHỎ. id kiểu UUID không dùng được\n" +
        "#     -> phải có bảng ánh xạ UUID sang số nguyên tăng dần.\n" +
        "#  2) SETBIT ở offset lớn CẤP PHÁT NGAY toàn bộ vùng nhớ tới đó:\n" +
        "#     SETBIT k 4000000000 1 -> cấp 512MB ngay lập tức. Rất dễ gây sự cố.\n" +
        "#  3) Tối đa 512MB (2^32 bit).\n" +
        "#  4) Dữ liệu THƯA (chỉ vài nghìn user trong dải id tới hàng tỉ) thì Set rẻ hơn.",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-16n1zng',
  q: 'Vì sao `SET key value NX EX 30` là cách đúng để tạo lock?',
  answer:
    '`SET lock:x <token> NX EX 30` làm **một lệnh nguyên tử**:\n' +
    '- `NX`: chỉ set nếu key **chưa tồn tại** → chỉ một client giành được.\n' +
    '- `EX 30`: tự hết hạn sau 30s → nếu client giữ lock chết, lock **không kẹt vĩnh viễn**.\n' +
    '- `<token>` (giá trị ngẫu nhiên duy nhất): khi giải phóng, client kiểm tra token đúng của mình mới xoá (bằng Lua) → tránh xoá nhầm lock của client khác đã chiếm sau khi mình timeout.\n\n' +
    'Cách sai: `SETNX` rồi `EXPIRE` riêng — không nguyên tử, client chết giữa hai lệnh → lock vĩnh viễn.',
  essence:
    'Lock cần ba tính chất trong một thao tác: loại trừ (`NX`), tự hết hạn (`EX`), và giải phóng an toàn (token + Lua). `SET ... NX EX` gộp hai cái đầu; token lo cái thứ ba.',
  example:
    'Cron job chạy trên 3 instance, chỉ muốn 1 chạy: `SET cron:daily-report <uuid> NX EX 300`. Ai set được thì chạy; xong thì `EVAL "if redis.call(\'get\',KEYS[1])==ARGV[1] then return redis.call(\'del\',KEYS[1]) end" 1 cron:daily-report <uuid>`.',
  viz: {
    type: 'tree',
    title: 'SET key value NX EX 30 — lock đúng cách (một lệnh nguyên tử)',
    root: {
      label: 'Lock cần 3 tính chất trong một thao tác',
      children: [
        { label: 'NX — loại trừ', note: 'chỉ set nếu key chưa tồn tại → chỉ một client giành được' },
        { label: 'EX 30 — tự hết hạn', note: 'client giữ lock chết → lock không kẹt vĩnh viễn' },
        { label: 'token + Lua — giải phóng an toàn', note: 'kiểm tra token của mình mới xoá, tránh xoá nhầm lock client khác' },
        { label: 'Cách SAI', note: 'SETNX rồi EXPIRE riêng — client chết giữa hai lệnh → lock vĩnh viễn' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Một lệnh nguyên tử, có TTL, có định danh chủ sở hữu",
      code:
        "redis-cli SET lock:order:123 \"token-uuid-abc\" NX EX 30\n" +
        "# NX  — chỉ đặt khi key CHƯA tồn tại -> đúng một client thắng\n" +
        "# EX  — TTL: client chết thì lock TỰ NHẢ, không kẹt vĩnh viễn\n" +
        "# value = TOKEN DUY NHẤT -> để biết ai là chủ lock\n" +
        "\n" +
        "# VÌ SAO PHẢI LÀ MỘT LỆNH: cách cũ SETNX rồi EXPIRE là HAI lệnh.\n" +
        "# Client chết giữa hai lệnh -> lock KHÔNG có TTL -> kẹt vĩnh viễn.\n" +
        "\n" +
        "# VÌ SAO PHẢI CÓ TOKEN: nếu không, kịch bản này làm hỏng dữ liệu:\n" +
        "#   A lấy lock 30s -> A chạy chậm mất 35s -> lock hết hạn -> B lấy được lock\n" +
        "#   -> A xong và gọi DEL -> A XOÁ NHẦM LOCK CỦA B -> C cũng vào được -> hai\n" +
        "#   client cùng chạy trong vùng tới hạn.\n" +
        "\n" +
        "# NHẢ LOCK phải NGUYÊN TỬ: kiểm tra token rồi mới xoá -> bắt buộc dùng Lua\n" +
        "redis-cli EVAL \"\n" +
        "  if redis.call(\u0027GET\u0027, KEYS[1]) == ARGV[1] then\n" +
        "    return redis.call(\u0027DEL\u0027, KEYS[1])\n" +
        "  else\n" +
        "    return 0\n" +
        "  end\" 1 lock:order:123 \"token-uuid-abc\"\n" +
        "\n" +
        "# GIA HẠN lock khi việc chưa xong (watchdog):\n" +
        "redis-cli EVAL \"\n" +
        "  if redis.call(\u0027GET\u0027, KEYS[1]) == ARGV[1] then\n" +
        "    return redis.call(\u0027EXPIRE\u0027, KEYS[1], ARGV[2])\n" +
        "  else return 0 end\" 1 lock:order:123 \"token-uuid-abc\" 30\n" +
        "\n" +
        "# GIỚI HẠN CÒN LẠI: với replication BẤT ĐỒNG BỘ, master chết sau khi cấp\n" +
        "# lock nhưng trước khi sao chép -> replica lên làm master và cấp lại lock\n" +
        "# cho client khác. Muốn chặt hơn -> Redlock, hoặc fencing token.",
    },
  ],
},
{
  cat: 'Tổng quan',
  id: 'redis-h8z0al',
  q: 'Các Redis module (RedisJSON, RediSearch, RedisBloom) làm gì?',
  answer:
    '- **RedisJSON**: lưu và thao tác document JSON native — `JSON.SET`, `JSON.GET path`, `JSON.ARRAPPEND`. Không phải serialize/deserialize cả object.\n' +
    '- **RediSearch**: full-text search + secondary index trên hash/JSON — query, aggregation, vector similarity search (RAG). Biến Redis thành search engine.\n' +
    '- **RedisBloom**: Bloom filter, Cuckoo filter, Count-Min Sketch, Top-K — kiểm tra "có thể đã thấy" với bộ nhớ nhỏ.\n' +
    '- **RedisTimeSeries**: chuỗi thời gian với downsampling, retention.\n\n' +
    'Có trong Redis Stack / Redis 8 (tích hợp sẵn).',
  essence:
    'Module mở rộng Redis từ "key-value + cấu trúc" sang document store, search engine, probabilistic data structure — giảm nhu cầu thêm hệ thống riêng cho các bài toán đó.',
  example:
    'Chống xử lý trùng event mà không lưu hết id: `BF.ADD seen:events <eventId>` + `BF.EXISTS` — vài MB cho hàng chục triệu id, chấp nhận false positive nhỏ. Autocomplete/search sản phẩm: RediSearch index trên hash sản phẩm.',
  viz: {
    type: 'tree',
    title: 'Redis modules (Redis Stack / Redis 8)',
    root: {
      label: 'Mở rộng từ key-value sang document/search/probabilistic — giảm nhu cầu hệ thống riêng',
      children: [
        { label: 'RedisJSON', note: 'JSON.SET / JSON.GET path — thao tác document JSON native' },
        { label: 'RediSearch', note: 'full-text + secondary index + vector similarity (RAG)' },
        { label: 'RedisBloom', note: 'Bloom/Cuckoo filter, Count-Min Sketch, Top-K' },
        { label: 'RedisTimeSeries', note: 'chuỗi thời gian với downsampling, retention' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Mở rộng Redis thành nhiều loại database",
      code:
        "# REDISJSON — lưu và sửa JSON tại chỗ theo JSONPath, không phải đọc-parse-ghi\n" +
        "redis-cli JSON.SET user:1 \u0027$\u0027 \u0027{\"name\":\"An\",\"address\":{\"city\":\"HCM\"},\"tags\":[\"a\",\"b\"]}\u0027\n" +
        "redis-cli JSON.GET user:1 \u0027$.address.city\u0027\n" +
        "redis-cli JSON.SET user:1 \u0027$.address.city\u0027 \u0027\"HN\"\u0027      # sửa MỘT trường\n" +
        "redis-cli JSON.ARRAPPEND user:1 \u0027$.tags\u0027 \u0027\"c\"\u0027\n" +
        "redis-cli JSON.NUMINCRBY user:1 \u0027$.points\u0027 10\n" +
        "\n" +
        "# REDISEARCH — index thứ cấp và full-text search trên Hash/JSON.\n" +
        "# Giải quyết hạn chế lớn nhất của Redis: chỉ truy vấn được theo key.\n" +
        "redis-cli FT.CREATE idx:users ON JSON PREFIX 1 user: SCHEMA \\\n" +
        "  \u0027$.name\u0027 AS name TEXT \u0027$.address.city\u0027 AS city TAG \u0027$.points\u0027 AS points NUMERIC SORTABLE\n" +
        "redis-cli FT.SEARCH idx:users \u0027@city:{HCM} @points:[100 +inf]\u0027 SORTBY points DESC\n" +
        "redis-cli FT.AGGREGATE idx:users \u0027*\u0027 GROUPBY 1 @city REDUCE COUNT 0 AS total\n" +
        "\n" +
        "# REDISBLOOM — cấu trúc xác suất, tiết kiệm bộ nhớ khủng khiếp\n" +
        "redis-cli BF.ADD seen:urls \"https://a.com\"\n" +
        "redis-cli BF.EXISTS seen:urls \"https://a.com\"   # 0 = CHẮC CHẮN chưa có\n" +
        "                                                # 1 = CÓ THỂ đã có (dương tính giả)\n" +
        "# Dùng chống cache penetration, khử trùng URL crawler, lọc email đã gửi.\n" +
        "redis-cli CMS.INCRBY traffic ip1 1              # Count-Min Sketch: đếm xấp xỉ\n" +
        "redis-cli TOPK.ADD trending \"keyword\"           # Top-K: tìm phần tử nóng nhất\n" +
        "redis-cli TS.ADD temperature \u0027*\u0027 25.3           # RedisTimeSeries\n" +
        "\n" +
        "# LƯU Ý: module cần được CÀI trên server. Redis Stack đóng gói sẵn tất cả;\n" +
        "# ElastiCache thì KHÔNG hỗ trợ module (MemoryDB/Redis Enterprise mới có).",
    },
  ],
},
{
  cat: 'Hiệu năng',
  id: 'redis-1vg4yrn',
  q: 'Redis mã hoá cấu trúc dữ liệu nhỏ như thế nào (encoding)?',
  answer:
    'Redis chọn cách lưu nội bộ theo kích thước để tiết kiệm RAM:\n' +
    '- Hash/List/ZSet/Set nhỏ → **listpack** (mảng liền mạch, compact) thay vì cấu trúc đầy đủ (hashtable/skiplist).\n' +
    '- Set toàn số nguyên → **intset**.\n' +
    '- String số → lưu dạng int.\n\n' +
    'Ngưỡng chuyển đổi: `hash-max-listpack-entries` (128), `hash-max-listpack-value` (64), tương tự cho list/zset/set. Vượt ngưỡng → chuyển sang cấu trúc "thật" (nhanh hơn cho N lớn nhưng tốn RAM hơn).\n\n' +
    'Xem: `OBJECT ENCODING key`.',
  essence:
    'Collection nhỏ được lưu ở dạng nén (listpack/intset) — rất tiết kiệm bộ nhớ. Giữ collection dưới ngưỡng (chia nhỏ key) có thể giảm RAM đáng kể.',
  example:
    'Lưu 10 triệu object nhỏ: dùng 10 triệu hash key `user:{id}` với ~5 field → mỗi cái listpack, tổng RAM thấp hơn nhiều so với để field vượt ngưỡng thành hashtable. `OBJECT ENCODING user:1` trả `listpack`.',
  viz: {
    type: 'compare',
    cols: ['Collection nhỏ (< ngưỡng)', 'Vượt ngưỡng'],
    rows: [
      ['Hash/List/ZSet/Set', 'listpack (mảng liền mạch, compact)', 'hashtable / skiplist "thật"'],
      ['Set toàn số nguyên', 'intset', 'hashtable'],
      ['RAM', 'rất tiết kiệm', 'tốn hơn'],
      ['Tốc độ với N lớn', '—', 'nhanh hơn'],
      ['Ngưỡng', 'hash-max-listpack-entries 128 / -value 64', 'chia nhỏ key để giữ dưới ngưỡng'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Collection nhỏ dùng cách lưu tiết kiệm hơn nhiều",
      code:
        "redis-cli OBJECT ENCODING mykey\n" +
        "# Cùng một kiểu dữ liệu, Redis chọn cách lưu KHÁC nhau tuỳ kích thước:\n" +
        "#  String  — int (số nguyên) | embstr (<= 44 byte) | raw\n" +
        "#  Hash    — listpack (nhỏ) | hashtable\n" +
        "#  List    — listpack | quicklist\n" +
        "#  Set     — intset (toàn số nguyên) | listpack | hashtable\n" +
        "#  ZSet    — listpack | skiplist\n" +
        "\n" +
        "# NGƯỠNG chuyển đổi (cấu hình trong redis.conf):\n" +
        "redis-cli CONFIG GET hash-max-listpack-entries      # 128\n" +
        "redis-cli CONFIG GET hash-max-listpack-value        # 64 (byte)\n" +
        "redis-cli CONFIG GET zset-max-listpack-entries      # 128\n" +
        "redis-cli CONFIG GET set-max-intset-entries         # 512\n" +
        "redis-cli CONFIG GET list-max-listpack-size         # 128\n" +
        "\n" +
        "# LISTPACK lưu liền mạch trong một khối bộ nhớ -> tiết kiệm gấp NHIỀU LẦN\n" +
        "# so với hashtable (không có con trỏ, không có overhead mỗi phần tử).\n" +
        "# Đổi lại: thao tác là O(N), nhưng N nhỏ nên vẫn rất nhanh.\n" +
        "\n" +
        "# CHIẾN THUẬT THỰC TẾ: chia nhỏ hash lớn thành nhiều hash nhỏ dưới ngưỡng.\n" +
        "# Ví dụ thay vì một hash 1 triệu field, dùng 10.000 hash mỗi cái 100 field\n" +
        "# (bucket = id % 10000) -> tiết kiệm bộ nhớ rất đáng kể.\n" +
        "\n" +
        "# MỘT CHIỀU: khi đã chuyển sang hashtable/skiplist thì KHÔNG quay lại listpack\n" +
        "# dù sau đó xoá bớt phần tử.\n" +
        "redis-cli MEMORY USAGE mykey        # đo bộ nhớ thật của một key",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-14g4bab',
  q: 'Redis Geo dùng để làm gì?',
  answer:
    'Geo là ZSet với score được mã hoá geohash. `GEOADD key <lon> <lat> member`, `GEOSEARCH key FROMLONLAT <lon> <lat> BYRADIUS 5 km ASC`, `GEODIST`, `GEOPOS`.\n\n' +
    'Use case: "cửa hàng/tài xế/người dùng trong bán kính X km", sắp theo khoảng cách, tìm N điểm gần nhất.\n\n' +
    'Vì là ZSet nên có thể `ZREM` để xoá điểm, `EXPIRE` cả key.',
  essence:
    'Geo cho phép truy vấn không gian (bán kính, gần nhất) ngay trong Redis với latency ms — đủ cho nhiều bài toán "gần tôi" mà không cần PostGIS.',
  example:
    'App gọi xe: mỗi tài xế online cập nhật `GEOADD drivers:online <lon> <lat> driver:123` mỗi vài giây. Khi có cuốc: `GEOSEARCH drivers:online FROMLONLAT <pickupLon> <pickupLat> BYRADIUS 3 km ASC COUNT 10` → 10 tài xế gần nhất.',
  viz: {
    type: 'flow',
    title: 'Redis Geo (ZSet với score = geohash)',
    nodes: ['GEOADD drivers:online <lon> <lat> driver:123', 'score được mã hoá geohash trong ZSet', 'GEOSEARCH ... FROMLONLAT ... BYRADIUS 3 km ASC COUNT 10', '10 điểm gần nhất, sắp theo khoảng cách'],
    steps: [
      { to: 1, label: 'vì là ZSet nên có ZREM để xoá điểm, EXPIRE cả key' },
      { to: 3, label: 'truy vấn không gian (bán kính, gần nhất) latency ms — không cần PostGIS' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Toạ độ và truy vấn theo bán kính, xây trên Sorted Set",
      code:
        "# GEO không phải kiểu riêng — nó là Sorted Set với score là geohash 52-bit.\n" +
        "redis-cli GEOADD drivers 106.700 10.776 \"driver:1\" 106.660 10.762 \"driver:2\"\n" +
        "\n" +
        "# Tìm trong bán kính — dùng cho \"tài xế gần tôi\", \"cửa hàng gần đây\"\n" +
        "redis-cli GEOSEARCH drivers FROMLONLAT 106.695 10.770 \\\n" +
        "  BYRADIUS 3 km ASC COUNT 10 WITHCOORD WITHDIST\n" +
        "# GEOSEARCH (6.2+) thay cho GEORADIUS đã deprecated.\n" +
        "\n" +
        "# Tìm trong một HÌNH CHỮ NHẬT (hợp với khung nhìn bản đồ)\n" +
        "redis-cli GEOSEARCH drivers FROMLONLAT 106.695 10.770 BYBOX 5 5 km ASC\n" +
        "\n" +
        "redis-cli GEODIST drivers \"driver:1\" \"driver:2\" km     # khoảng cách\n" +
        "redis-cli GEOPOS drivers \"driver:1\"                    # lấy toạ độ\n" +
        "redis-cli ZSCORE drivers \"driver:1\"                    # thấy rõ: vẫn là ZSet\n" +
        "redis-cli ZREM drivers \"driver:1\"                      # xoá bằng lệnh ZSet\n" +
        "\n" +
        "# USE CASE: gọi xe, giao đồ ăn, tìm chi nhánh gần nhất, geofencing,\n" +
        "# ghép người chơi theo khu vực.\n" +
        "\n" +
        "# GIỚI HẠN:\n" +
        "#  - chỉ hỗ trợ điểm, KHÔNG có đa giác/đường đi phức tạp\n" +
        "#  - độ chính xác ~0,5m (đủ cho mọi ứng dụng thực tế)\n" +
        "#  - không hoạt động ở vùng cực\n" +
        "#  - GEOSEARCH là O(N + log M) -> tập dữ liệu rất lớn thì nên chia key\n" +
        "#    theo vùng (ví dụ theo thành phố) để giảm N",
    },
  ],
},
{
  cat: 'TTL & key',
  id: 'redis-uqf32w',
  q: 'Quy ước đặt tên key trong Redis nên như thế nào?',
  answer:
    'Không có "thư mục" thật, nhưng dùng `:` làm phân cách namespace theo quy ước:\n' +
    '`<app>:<entity>:<id>:<attribute>` — ví dụ `shop:cart:user:1042`, `shop:product:55:stock`.\n\n' +
    'Nguyên tắc:\n' +
    '- Tiền tố app/service để nhiều hệ dùng chung một Redis không đụng nhau.\n' +
    '- Nhúng **version** vào key cache (`v2:...`) để "vô hiệu hoá hàng loạt" khi đổi format.\n' +
    '- Key ngắn gọn (key dài × hàng triệu = tốn RAM đáng kể).\n' +
    '- Tránh ký tự khoảng trắng / đặc biệt.',
  essence:
    'Key là namespace phẳng — bạn tự áp cấu trúc bằng quy ước `:`. Thiết kế tốt giúp `SCAN MATCH` theo nhóm, tránh xung đột, và cho phép invalidate theo version.',
  example:
    'Đổi cấu trúc object user cache: thay vì đi xoá từng key, bump prefix `user:v3:{id}`. Code đọc `user:v3:...`, các key `user:v2:*` cũ tự hết hạn theo TTL rồi biến mất — không cần thao tác xoá hàng loạt.',
  viz: {
    type: 'tree',
    title: 'Quy ước đặt tên key (namespace phẳng — dùng ":" phân cách)',
    root: {
      label: '<app>:<entity>:<id>:<attribute> — shop:cart:user:1042',
      children: [
        { label: 'Tiền tố app/service', note: 'nhiều hệ dùng chung một Redis không đụng nhau' },
        { label: 'Nhúng version vào key cache', note: 'v2:... → bump prefix để "vô hiệu hoá hàng loạt"' },
        { label: 'Key ngắn gọn', note: 'key dài × hàng triệu = tốn RAM đáng kể' },
        { label: 'Tránh khoảng trắng / ký tự đặc biệt' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Key là API của dữ liệu — đặt tên có hệ thống",
      code:
        "# QUY ƯỚC: <ứng-dụng>:<thực-thể>:<id>:<thuộc-tính>\n" +
        "#   app:user:1001:profile\n" +
        "#   app:user:1001:sessions\n" +
        "#   app:order:5001:items\n" +
        "#   app:cache:product:200:v3\n" +
        "# Dấu \u0027:\u0027 là quy ước chuẩn của cộng đồng, và các công cụ GUI (RedisInsight)\n" +
        "# dùng nó để hiển thị dạng cây.\n" +
        "\n" +
        "# NGUYÊN TẮC:\n" +
        "#  1) CÓ TIỀN TỐ ứng dụng/môi trường -> nhiều hệ thống dùng chung Redis\n" +
        "#     không giẫm lên nhau, và xoá theo nhóm được.\n" +
        "#  2) ĐỦ MÔ TẢ nhưng KHÔNG QUÁ DÀI — mỗi key tốn bộ nhớ cho chính tên nó.\n" +
        "#     Hàng triệu key thì tên dài 50 byte tốn thêm hàng chục MB.\n" +
        "#  3) CÓ VERSION trong key cho dữ liệu cache -> đổi cấu trúc thì tăng version,\n" +
        "#     không cần xoá key cũ (chúng tự hết hạn):\n" +
        "redis-cli SET app:cache:product:200:v3 \u0027{\"schema\":\"new\"}\u0027 EX 3600\n" +
        "#  4) KHÔNG dùng khoảng trắng và ký tự đặc biệt.\n" +
        "#  5) NHẤT QUÁN số ít/số nhiều — chọn một kiểu cho cả hệ thống.\n" +
        "\n" +
        "# HASH TAG cho Redis Cluster: phần trong {} quyết định slot -> đưa các key\n" +
        "# cần thao tác chung về CÙNG một node\n" +
        "redis-cli SET \u0027app:user:{1001}:profile\u0027 \"...\"\n" +
        "redis-cli SET \u0027app:user:{1001}:sessions\u0027 \"...\"\n" +
        "redis-cli MGET \u0027app:user:{1001}:profile\u0027 \u0027app:user:{1001}:sessions\u0027   # chạy được\n" +
        "\n" +
        "# Kiểm tra key nào chiếm bộ nhớ:\n" +
        "redis-cli --bigkeys\n" +
        "redis-cli --memkeys",
    },
  ],
},
{
  cat: 'Tổng quan',
  id: 'redis-1nxmyp5',
  q: 'Độ phức tạp (Big-O) của các lệnh Redis — cái nào cần tránh?',
  answer:
    'An toàn (O(1) hoặc O(log N)): `GET/SET`, `HGET/HSET`, `INCR`, `LPUSH/RPOP`, `SADD/SISMEMBER`, `ZADD/ZRANK/ZRANGEBYSCORE` (log N + M).\n\n' +
    'Nguy hiểm nếu N lớn (chặn server):\n' +
    '- `KEYS`, `SMEMBERS`, `HGETALL`, `LRANGE 0 -1`, `ZRANGE 0 -1` — O(N).\n' +
    '- `SORT`, `SINTERSTORE` trên set lớn.\n' +
    '- `DEL` một key cực lớn (dùng `UNLINK` — xoá nền).\n' +
    '- `FLUSHALL`/`FLUSHDB` sync.',
  essence:
    'Trên server đơn luồng, một lệnh O(N) với N lớn làm treo *toàn bộ*. Biết lệnh nào là O(N) và luôn giới hạn phạm vi (`SCAN`, `LRANGE 0 99`, `ZRANGEBYSCORE ... LIMIT`).',
  example:
    'Code review bắt gặp `HGETALL cart:user:1` khi cart có thể có 5000 item → thay bằng `HSCAN` hoặc thiết kế lại. `DEL bigset` (10M phần tử) treo 2s → dùng `UNLINK bigset` (giải phóng ở thread nền).',
  viz: {
    type: 'compare',
    cols: ['An toàn — O(1) / O(log N)', 'Nguy hiểm nếu N lớn — O(N) chặn server'],
    rows: [
      ['Lệnh', 'GET/SET, HGET/HSET, INCR, LPUSH/RPOP, SADD/SISMEMBER, ZADD/ZRANK', 'KEYS, SMEMBERS, HGETALL, LRANGE 0 -1, ZRANGE 0 -1'],
      ['Cũng tránh', '—', 'SORT / SINTERSTORE trên set lớn; DEL key cực lớn (→ UNLINK); FLUSHALL sync'],
      ['Cách đúng', '—', 'luôn giới hạn phạm vi: SCAN, LRANGE 0 99, ZRANGEBYSCORE ... LIMIT'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Vì sao Big-O quan trọng hơn ở Redis so với nơi khác",
      code:
        "# Redis ĐƠN LUỒNG: một lệnh O(N) chậm không chỉ chậm cho client đó — nó\n" +
        "# CHẶN TOÀN BỘ server. Đây là điểm khác biệt căn bản so với database khác.\n" +
        "\n" +
        "# AN TOÀN — O(1):\n" +
        "#   GET SET INCR EXPIRE TTL EXISTS TYPE\n" +
        "#   HGET HSET HDEL HEXISTS\n" +
        "#   LPUSH RPUSH LPOP RPOP LLEN\n" +
        "#   SADD SREM SISMEMBER SCARD\n" +
        "#   ZADD ZSCORE ZCARD              (ZADD/ZSCORE là O(log N), coi như rẻ)\n" +
        "\n" +
        "# CẨN TRỌNG — O(N) theo kích thước COLLECTION:\n" +
        "#   HGETALL HKEYS HVALS            -> dùng HSCAN\n" +
        "#   SMEMBERS                       -> dùng SSCAN\n" +
        "#   LRANGE 0 -1                    -> giới hạn khoảng\n" +
        "#   ZRANGE 0 -1                    -> giới hạn khoảng\n" +
        "#   DEL trên collection lớn        -> dùng UNLINK (xoá ở thread nền)\n" +
        "\n" +
        "# NGUY HIỂM — O(N) theo TOÀN BỘ keyspace:\n" +
        "#   KEYS       -> SCAN\n" +
        "#   FLUSHALL FLUSHDB (đồng bộ)  -> thêm ASYNC\n" +
        "#   SORT trên tập lớn, SINTER/SUNION trên set lớn: O(N*M)\n" +
        "\n" +
        "# PHÁT HIỆN lệnh chậm đang chạy trong hệ thống:\n" +
        "redis-cli CONFIG SET slowlog-log-slower-than 10000    # ghi lệnh > 10ms\n" +
        "redis-cli SLOWLOG GET 10\n" +
        "redis-cli --latency-history -h localhost\n" +
        "redis-cli INFO commandstats | sort -t= -k2 -rn | head  # lệnh nào tốn tổng thời gian nhất\n" +
        "\n" +
        "# NGUYÊN TẮC: mọi lệnh O(N) phải có GIỚI HẠN N biết trước. Không kiểm soát\n" +
        "# được N thì phải chuyển sang biến thể SCAN hoặc chia nhỏ dữ liệu.",
    },
  ],
},
]);
