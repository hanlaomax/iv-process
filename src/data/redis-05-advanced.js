SS.addQuestions('redis', [
{
  cat: 'Pub/Sub & Streams',
  id: 'redis-ax0mwd',
  q: 'Redis Pub/Sub: cơ chế và những hạn chế cần biết?',
  answer:
    '`SUBSCRIBE channel` / `PUBLISH channel message` / `PSUBSCRIBE pattern.*`. Message được đẩy tới **mọi subscriber đang kết nối tại thời điểm publish**.\n\n' +
    'Hạn chế:\n' +
    '- **Fire-and-forget**: subscriber offline → **mất** message. Không lưu trữ, không replay, không ack.\n' +
    '- Subscriber chậm → output buffer phình → có thể bị Redis ngắt kết nối.\n' +
    '- Trong Cluster: pub/sub thường (không sharded) broadcast tới mọi node → tốn băng thông; Redis 7 có `SSUBSCRIBE` (sharded pub/sub) theo slot.\n' +
    '- Không phù hợp cho message quan trọng.',
  essence:
    'Pub/Sub là "loa phát thanh": ai đang nghe thì nghe, không ai chịu trách nhiệm lưu lại. Dùng cho tín hiệu nhất thời (invalidate cache, presence), không cho dữ liệu không được mất.',
  example:
    'Invalidate L1 cache: `PUBLISH cache:invalidate "product:5"` → mọi pod đang chạy xoá khỏi local cache. Nếu một pod vừa restart và bỏ lỡ message → không sao, TTL ngắn của L1 sẽ dọn. Đơn hàng thì KHÔNG dùng pub/sub.',
  viz: {
    type: 'tree',
    title: 'Redis Pub/Sub — "loa phát thanh", ai đang nghe thì nghe',
    root: {
      label: 'Message tới MỌI subscriber đang kết nối TẠI thời điểm publish',
      children: [
        { label: 'Fire-and-forget', note: 'subscriber offline → MẤT; không lưu trữ, không replay, không ack' },
        { label: 'Subscriber chậm', note: 'output buffer phình → có thể bị Redis ngắt kết nối' },
        { label: 'Trong Cluster', note: 'pub/sub thường broadcast tới mọi node; Redis 7 có SSUBSCRIBE (sharded theo slot)' },
        { label: 'Dùng cho', note: 'tín hiệu nhất thời (invalidate cache, presence) — KHÔNG cho dữ liệu không được mất' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Fire-and-forget: đơn giản, nhanh, và mất message",
      code:
        "redis-cli SUBSCRIBE news:tech\n" +
        "redis-cli PSUBSCRIBE \u0027news:*\u0027                 # theo mẫu\n" +
        "redis-cli PUBLISH news:tech \"bài viết mới\"    # trả về SỐ subscriber nhận được\n" +
        "\n" +
        "# CƠ CHẾ: message được đẩy TỨC THÌ tới các subscriber đang kết nối,\n" +
        "# rồi BIẾN MẤT. Không lưu, không hàng đợi, không xác nhận.\n" +
        "\n" +
        "# BỐN HẠN CHẾ PHẢI BIẾT:\n" +
        "# 1) MẤT MESSAGE: subscriber offline lúc publish -> không bao giờ nhận được.\n" +
        "#    Kể cả đang online mà mạng chớp nháy cũng mất.\n" +
        "# 2) KHÔNG CÓ ACK, không có retry, không phát lại được.\n" +
        "# 3) SLOW CONSUMER bị NGẮT KẾT NỐI khi buffer đầy:\n" +
        "redis-cli CONFIG GET client-output-buffer-limit    # pubsub 32mb 8mb 60\n" +
        "# 4) Trong CLUSTER, PUBLISH được phát tán tới MỌI node -> tốn băng thông.\n" +
        "#    Redis 7 thêm SPUBLISH/SSUBSCRIBE (sharded pub/sub) chỉ trong một slot:\n" +
        "redis-cli SPUBLISH channel:{tag} \"message\"\n" +
        "\n" +
        "# DÙNG CHO: thông báo real-time không quan trọng (cập nhật UI, chat),\n" +
        "# invalidate cache, đánh thức worker, phát tín hiệu cấu hình đổi.\n" +
        "# KHÔNG DÙNG CHO: hàng đợi công việc, sự kiện nghiệp vụ, bất cứ thứ gì\n" +
        "# mất đi thì có hậu quả -> dùng STREAMS.\n" +
        "\n" +
        "redis-cli PUBSUB CHANNELS          # kênh đang có subscriber\n" +
        "redis-cli PUBSUB NUMSUB news:tech  # số subscriber của một kênh",
    },
  ],
},
{
  cat: 'Pub/Sub & Streams',
  id: 'redis-jv1h66',
  q: 'Redis Streams: consumer group, `XACK`, `XPENDING`, `XCLAIM`?',
  answer:
    '`XADD stream * field value` thêm entry (id `<ms>-<seq>`). `XLEN`, `XRANGE`, `XREAD`.\n\n' +
    'Consumer group: `XGROUP CREATE`, `XREADGROUP GROUP g c COUNT 10 STREAMS s >` — mỗi entry giao cho **một** consumer trong group, đưa vào **PEL (Pending Entries List)** của consumer đó.\n\n' +
    '`XACK s g id` → xác nhận đã xử lý, gỡ khỏi PEL. `XPENDING` → xem entry đang treo (chưa ack). `XCLAIM` / `XAUTOCLAIM` → consumer khác "cướp" entry đã treo quá lâu (do consumer gốc chết) để xử lý lại.',
  essence:
    'Streams = log bền + consumer group + ack + tái phân công entry treo. Đây là mô hình "message queue đáng tin" của Redis: không mất, có retry, theo dõi được tiến độ.',
  example:
    'Hàng đợi gửi email: `XADD emails * to ... subject ...`. 3 worker cùng group. Worker 2 chết khi đang giữ 5 entry chưa ack → job cron `XAUTOCLAIM emails g worker-recovery 60000 0` chuyển 5 entry đó cho worker khác xử lý lại.',
  viz: {
    type: 'flow',
    title: 'Redis Streams consumer group — "message queue đáng tin"',
    nodes: ['XADD stream * ...', 'XREADGROUP GROUP g c STREAMS s >', 'mỗi entry giao cho MỘT consumer → vào PEL của nó', 'XACK → gỡ khỏi PEL', 'XCLAIM / XAUTOCLAIM → consumer khác cướp entry treo quá lâu'],
    steps: [
      { to: 2, label: 'PEL = Pending Entries List (chưa ack)' },
      { to: 3, label: 'XPENDING → xem entry đang treo' },
      { to: 4, label: 'consumer gốc chết → entry treo → xử lý lại. Không mất, có retry, theo dõi được' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hàng đợi tin cậy với theo dõi tiến độ",
      code:
        "redis-cli XADD orders \u0027*\u0027 orderId 1001 total 500000\n" +
        "redis-cli XGROUP CREATE orders billing 0 MKSTREAM   # 0 = từ đầu, $ = chỉ message mới\n" +
        "\n" +
        "# ĐỌC: \u0027>\u0027 nghĩa là \"message CHƯA AI trong group nhận\"\n" +
        "redis-cli XREADGROUP GROUP billing worker-1 COUNT 10 BLOCK 5000 STREAMS orders \u0027>\u0027\n" +
        "# Message đọc ra được đưa vào PEL (Pending Entries List) của consumer đó.\n" +
        "\n" +
        "redis-cli XACK orders billing 1757030400000-0      # xử lý xong -> gỡ khỏi PEL\n" +
        "# KHÔNG ack -> message nằm mãi trong PEL -> không mất, và giành lại được.\n" +
        "\n" +
        "# XPENDING — xem việc đang dở\n" +
        "redis-cli XPENDING orders billing                       # tóm tắt\n" +
        "redis-cli XPENDING orders billing - + 10 worker-1       # chi tiết từng message\n" +
        "# Trả về: id, consumer đang giữ, đã idle bao lâu, đã giao bao nhiêu lần.\n" +
        "# \"Đã giao nhiều lần\" là dấu hiệu POISON MESSAGE -> chuyển sang DLQ.\n" +
        "\n" +
        "# XCLAIM / XAUTOCLAIM — consumer chết, consumer khác giành lấy việc của nó\n" +
        "redis-cli XAUTOCLAIM orders billing worker-2 60000 0 COUNT 10\n" +
        "# Lấy mọi message đã idle hơn 60 giây và giao cho worker-2. Đây là cơ chế\n" +
        "# phục hồi khi worker chết giữa chừng — thứ mà List và Pub/Sub không có.\n" +
        "\n" +
        "# ĐỌC LẠI việc của chính mình sau khi restart (id \u00270\u0027 thay vì \u0027>\u0027):\n" +
        "redis-cli XREADGROUP GROUP billing worker-1 COUNT 10 STREAMS orders 0\n" +
        "\n" +
        "# CẮT NGẮN — stream không tự dọn:\n" +
        "redis-cli XADD orders MAXLEN \u0027~\u0027 1000000 \u0027*\u0027 field value\n" +
        "redis-cli XTRIM orders MINID \u0027~\u0027 $(($(date +%s%3N) - 86400000))   # giữ 24 giờ\n" +
        "redis-cli XINFO GROUPS orders\n" +
        "redis-cli XINFO STREAM orders",
    },
  ],
},
{
  cat: 'Pub/Sub & Streams',
  id: 'redis-ndxe83',
  q: 'Redis Streams vs Kafka — khi nào chọn cái nào?',
  answer:
    '- **Streams**: nằm trong Redis bạn đã có, latency cực thấp, đủ cho throughput vừa (hàng chục–trăm nghìn msg/s), retention giới hạn bởi RAM (dùng `MAXLEN ~`), một partition logic (không phân vùng song song thực sự trong một stream).\n' +
    '- **Kafka**: throughput cực cao, retention lớn (đĩa/tiered), partition cho song song thật, hệ sinh thái (Connect, Streams, Schema Registry), ordering per-partition, replay quy mô lớn.\n\n' +
    'Streams hợp: job queue, event bus nội bộ nhẹ, notification. Kafka hợp: pipeline dữ liệu lớn, event backbone toàn công ty, cần lưu lâu.',
  essence:
    'Streams = "queue/log đủ tốt, không thêm hạ tầng" khi đã có Redis. Kafka = "event platform" khi cần throughput/retention/hệ sinh thái mà Streams không với tới.',
  example:
    'Startup dùng Redis cho cache, cần hàng đợi xử lý ảnh ~5k job/s: Streams — không dựng thêm Kafka. Công ty logistics cần bус sự kiện cho 40 service, lưu 30 ngày, replay để rebuild: Kafka.',
  viz: {
    type: 'compare',
    cols: ['Redis Streams', 'Kafka'],
    rows: [
      ['Latency', 'cực thấp', 'thấp'],
      ['Throughput', 'vừa (hàng chục–trăm nghìn msg/s)', 'cực cao'],
      ['Retention', 'giới hạn bởi RAM (MAXLEN ~)', 'lớn (đĩa / tiered)'],
      ['Song song', 'một partition logic', 'partition cho song song thật'],
      ['Dùng cho', 'job queue, event bus nội bộ nhẹ — không thêm hạ tầng', 'pipeline dữ liệu lớn, event backbone toàn công ty'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Cùng mô hình log, khác quy mô và độ bền",
      code:
        "# GIỐNG NHAU: log append-only, consumer group, offset/id, phát lại được, ack.\n" +
        "\n" +
        "# REDIS STREAMS MẠNH HƠN Ở:\n" +
        "#  - độ trễ THẤP HƠN nhiều (micro giây so với mili giây)\n" +
        "#  - đơn giản: đã có Redis rồi thì không phải dựng thêm hạ tầng\n" +
        "#  - đủ cho throughput vừa (hàng chục nghìn msg/s)\n" +
        "redis-cli XADD events \u0027*\u0027 type click userId 42\n" +
        "\n" +
        "# KAFKA MẠNH HƠN Ở:\n" +
        "#  - LƯU TRỮ: dữ liệu trên ĐĨA, giữ hàng tháng/năm với chi phí thấp.\n" +
        "#    Redis giữ trong RAM -> retention dài là rất đắt.\n" +
        "#  - ĐỘ BỀN: replication đồng bộ với acks=all + min.insync.replicas.\n" +
        "#    Redis replication BẤT ĐỒNG BỘ -> failover có thể mất message.\n" +
        "#  - THÔNG LƯỢNG: hàng triệu msg/s, scale ngang bằng partition.\n" +
        "#  - HỆ SINH THÁI: Connect, Streams, Schema Registry, CDC.\n" +
        "#  - THỨ TỰ và phân vùng theo key ở quy mô lớn.\n" +
        "\n" +
        "# CHỌN REDIS STREAMS khi:\n" +
        "#  - đã dùng Redis, không muốn thêm hệ thống mới\n" +
        "#  - throughput vừa phải, retention ngắn (giờ tới ngày)\n" +
        "#  - cần độ trễ cực thấp\n" +
        "#  - mất một ít message khi sự cố là chấp nhận được\n" +
        "# CHỌN KAFKA khi:\n" +
        "#  - sự kiện là NGUỒN SỰ THẬT, không được mất\n" +
        "#  - cần giữ lâu và phát lại lịch sử\n" +
        "#  - throughput lớn, nhiều consumer group độc lập\n" +
        "#  - cần tích hợp hệ sinh thái dữ liệu",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-1ywxlwv',
  q: 'Pipelining, MULTI/EXEC và Lua — chọn cái nào cho tình huống nào?',
  answer:
    '- **Pipelining**: gửi nhiều lệnh **độc lập** để tiết kiệm RTT. Không nguyên tử, không có logic điều kiện.\n' +
    '- **MULTI/EXEC**: chạy nhóm lệnh **không bị xen kẽ**. Nhưng bạn **không thể dùng kết quả lệnh trước để quyết định lệnh sau** (tất cả xếp hàng rồi mới chạy). `WATCH` cho optimistic lock.\n' +
    '- **Lua (`EVAL`)**: nguyên tử + có **logic** (if/else, vòng lặp, dùng kết quả `redis.call` giữa chừng). Mạnh nhất cho "đọc–tính–ghi có điều kiện".',
  essence:
    'Pipeline cho tốc độ (nhiều lệnh, không quan tâm nguyên tử). MULTI/EXEC cho nhóm lệnh cố định không xen kẽ. Lua khi cần **quyết định trong lúc chạy** một cách nguyên tử.',
  example:
    'Nạp 1000 key: pipeline. "Trừ tồn kho nếu còn hàng" (đọc số lượng, so sánh, trừ): Lua — `if tonumber(redis.call("GET", KEYS[1])) >= n then return redis.call("DECRBY", KEYS[1], n) else return -1 end`. MULTI/EXEC không làm được nhánh if này.',
  viz: {
    type: 'compare',
    cols: ['Pipelining', 'MULTI/EXEC', 'Lua (EVAL)'],
    rows: [
      ['Nguyên tử', 'không', 'có (không xen kẽ)', 'có'],
      ['Logic điều kiện', 'không', 'KHÔNG — tất cả xếp hàng rồi mới chạy', 'CÓ (if/else, vòng lặp, dùng kết quả redis.call giữa chừng)'],
      ['Dùng cho', 'nhiều lệnh độc lập, tiết kiệm RTT', 'nhóm lệnh cố định không xen kẽ (+ WATCH)', '"đọc–tính–ghi có điều kiện"'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba công cụ, ba mục đích khác nhau",
      code:
        "# PIPELINE — gom ROUND-TRIP MẠNG. Không nguyên tử.\n" +
        "# Dùng khi: nhiều lệnh ĐỘC LẬP, không phụ thuộc kết quả của nhau.\n" +
        "redis-cli --pipe < commands.txt\n" +
        "# Client khác CÓ THỂ chen lệnh vào giữa. Lệnh này lỗi không ảnh hưởng lệnh kia.\n" +
        "\n" +
        "# MULTI/EXEC — NGUYÊN TỬ (không ai chen vào), nhưng KHÔNG có logic điều kiện\n" +
        "# và KHÔNG dùng được kết quả của lệnh trước.\n" +
        "redis-cli MULTI\n" +
        "redis-cli INCR counter\n" +
        "redis-cli EXPIRE counter 60\n" +
        "redis-cli EXEC\n" +
        "# Dùng khi: một nhóm lệnh cố định phải chạy liền mạch.\n" +
        "# Cần điều kiện dựa trên giá trị hiện tại -> phải kèm WATCH và vòng lặp thử lại.\n" +
        "\n" +
        "# LUA — NGUYÊN TỬ + có LOGIC. Đọc, quyết định, rồi ghi — tất cả trên server.\n" +
        "redis-cli EVAL \"\n" +
        "  local cur = tonumber(redis.call(\u0027GET\u0027, KEYS[1]) or 0)\n" +
        "  if cur + tonumber(ARGV[1]) > tonumber(ARGV[2]) then return 0 end\n" +
        "  redis.call(\u0027INCRBY\u0027, KEYS[1], ARGV[1])\n" +
        "  return 1\" 1 quota:user:1 5 100\n" +
        "# Dùng khi: cần đọc-kiểm tra-ghi nguyên tử (rate limit, trừ tồn kho,\n" +
        "# nhả lock có kiểm tra chủ sở hữu).\n" +
        "\n" +
        "# BẢNG CHỌN NHANH:\n" +
        "#  Nhiều lệnh độc lập, muốn nhanh          -> PIPELINE\n" +
        "#  Nhóm lệnh cố định cần nguyên tử          -> MULTI/EXEC\n" +
        "#  Cần logic/điều kiện trong lúc nguyên tử  -> LUA\n" +
        "#  Kết hợp: pipeline chứa nhiều lệnh EVALSHA cũng hoàn toàn hợp lý.",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-1fg2igs',
  q: 'Lua scripting: `EVALSHA`, script cache, và quy tắc "no side effects"?',
  answer:
    '`SCRIPT LOAD` (hoặc `EVAL` lần đầu) → Redis cache script theo SHA1. Sau đó `EVALSHA <sha> ...` chỉ gửi hash (tiết kiệm băng thông). Client thường tự fallback `EVAL` nếu server trả `NOSCRIPT` (sau restart).\n\n' +
    'Quy tắc:\n' +
    '- **Deterministic**: cùng input → cùng kết quả. Không `TIME`, `SRANDMEMBER`, random tuỳ tiện (ảnh hưởng replication/AOF trước đây; Redis mới có "effects replication" giảm bớt vấn đề, nhưng vẫn nên tránh).\n' +
    '- Truyền time/random qua `ARGV`.\n' +
    '- Khai báo **mọi key** trong `KEYS[]` (bắt buộc cho Cluster).\n' +
    '- Script ngắn — nó chặn server.',
  essence:
    'Lua cho bạn atomic + logic phía server. Giá phải trả: script chặn main thread, và phải deterministic + khai báo keys đúng để tương thích replication và Cluster.',
  example:
    'Rate limiter: `SCRIPT LOAD` lúc app khởi động → lưu SHA. Mỗi request `EVALSHA <sha> 1 rate:{user} <now_ms> <limit> <window_ms>`. Truyền `now_ms` từ app (không gọi `redis.call("TIME")` trong script).',
  viz: {
    type: 'tree',
    title: 'Lua scripting — atomic + logic phía server',
    root: {
      label: 'Giá phải trả: script chặn main thread + phải deterministic + keys đúng',
      children: [
        { label: 'SCRIPT LOAD → cache theo SHA1; EVALSHA <sha> chỉ gửi hash', note: 'client fallback EVAL nếu NOSCRIPT (sau restart)' },
        { label: 'Deterministic', note: 'không TIME/SRANDMEMBER tuỳ tiện — truyền time/random qua ARGV' },
        { label: 'Khai báo MỌI key trong KEYS[]', note: 'bắt buộc cho Cluster' },
        { label: 'Script ngắn', note: 'nó chặn server' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Vòng đời script và các quy tắc bắt buộc",
      code:
        "redis-cli SCRIPT LOAD \"return redis.call(\u0027GET\u0027, KEYS[1])\"\n" +
        "# -> trả về SHA1, ví dụ \"6b1bf486c81ceb7edf3c093f4c48582e38c0e791\"\n" +
        "redis-cli EVALSHA 6b1bf486c81ceb7edf3c093f4c48582e38c0e791 1 mykey\n" +
        "\n" +
        "# VÌ SAO EVALSHA: EVAL gửi TOÀN BỘ script mỗi lần -> tốn băng thông.\n" +
        "# EVALSHA chỉ gửi 40 ký tự.\n" +
        "# Client PHẢI xử lý lỗi NOSCRIPT (script cache mất khi restart hoặc\n" +
        "# SCRIPT FLUSH) bằng cách gửi lại EVAL — mọi client tốt đều làm sẵn.\n" +
        "redis-cli SCRIPT EXISTS 6b1bf486c81ceb7edf3c093f4c48582e38c0e791\n" +
        "redis-cli SCRIPT FLUSH\n" +
        "redis-cli SCRIPT KILL       # dừng script đang chạy quá lâu (chỉ khi chưa ghi gì)\n" +
        "\n" +
        "# QUY TẮC \"NO SIDE EFFECTS\" / TẤT ĐỊNH — vì sao quan trọng:\n" +
        "# Script phải cho CÙNG kết quả khi chạy lại. Trước Redis 5, script được\n" +
        "# nhân bản sang replica/AOF dưới dạng SCRIPT, không phải kết quả -> script\n" +
        "# không tất định sẽ làm replica LỆCH dữ liệu so với master.\n" +
        "#  - KHÔNG dùng math.random không seed\n" +
        "#  - KHÔNG dùng TIME/thời gian hệ thống -> truyền từ ngoài qua ARGV\n" +
        "#  - KHÔNG lặp qua kết quả KEYS/SCAN rồi ghi theo thứ tự ngẫu nhiên\n" +
        "# Redis 5+ dùng effect replication (nhân bản KẾT QUẢ) nên bớt nghiêm ngặt,\n" +
        "# nhưng giữ script tất định vẫn là thói quen đúng.\n" +
        "\n" +
        "# QUY TẮC KEYS[]: mọi key phải khai qua KEYS, không hardcode.\n" +
        "# Cluster cần biết trước key để định tuyến và kiểm tra cùng slot.\n" +
        "\n" +
        "# Script CHẶN toàn server khi chạy -> giữ nó NGẮN.\n" +
        "redis-cli CONFIG SET busy-reply-threshold 5000    # ms trước khi báo BUSY",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-1omzhx8',
  q: 'Redis Functions (7.0) khác Lua `EVAL` thế nào?',
  answer:
    'Redis Functions là bản kế nhiệm "chính thức" của scripting:\n' +
    '- Tổ chức thành **library** (`FUNCTION LOAD`), nhiều function đặt tên, đăng ký một lần và **tồn tại qua restart** (được persist + replicate như dữ liệu).\n' +
    '- Gọi bằng tên: `FCALL myfunc numkeys ...` — không cần quản lý SHA1.\n' +
    '- Vẫn chạy Lua bên dưới, cùng ràng buộc (atomic, deterministic, khai báo keys).',
  essence:
    'Functions = scripting được "sản phẩm hoá": library có tên, bền qua restart, quản lý như một phần của deployment thay vì client tự nạp SHA mỗi lần.',
  example:
    'Thay vì mỗi service tự `SCRIPT LOAD` logic rate-limit và lo `NOSCRIPT`: platform team `FUNCTION LOAD` một library `ratelimit` lên cụm, mọi service chỉ `FCALL ratelimit.check 1 key ...`. Nâng cấp logic = load lại library.',
  viz: {
    type: 'compare',
    cols: ['Lua EVAL / EVALSHA', 'Redis Functions (7.0)'],
    rows: [
      ['Tổ chức', 'client tự nạp script, quản SHA1', 'library có tên (FUNCTION LOAD), nhiều function'],
      ['Qua restart', 'mất — client lo NOSCRIPT', 'TỒN TẠI (persist + replicate như dữ liệu)'],
      ['Gọi', 'EVALSHA <sha>', 'FCALL myfunc numkeys ...'],
      ['Bên dưới', 'Lua', 'vẫn Lua, cùng ràng buộc'],
    ],
  },
  demo: [
    {
      lang: "lua",
      title: "Hàm được đăng ký và tồn tại lâu dài",
      code:
        "#!lua name=mylib\n" +
        "\n" +
        "-- Redis Functions: đăng ký MỘT LẦN, tồn tại trong dataset (được nhân bản\n" +
        "-- và lưu vào RDB/AOF). Không còn cảnh \"script cache mất sau restart\".\n" +
        "local function rate_limit(keys, args)\n" +
        "  local key    = keys[1]\n" +
        "  local limit  = tonumber(args[1])\n" +
        "  local window = tonumber(args[2])\n" +
        "\n" +
        "  local count = redis.call(\u0027INCR\u0027, key)\n" +
        "  if count == 1 then\n" +
        "    redis.call(\u0027EXPIRE\u0027, key, window)\n" +
        "  end\n" +
        "  return count <= limit and 1 or 0\n" +
        "end\n" +
        "\n" +
        "local function get_and_touch(keys, args)\n" +
        "  local v = redis.call(\u0027GET\u0027, keys[1])\n" +
        "  if v then redis.call(\u0027EXPIRE\u0027, keys[1], args[1]) end\n" +
        "  return v\n" +
        "end\n" +
        "\n" +
        "redis.register_function(\u0027rate_limit\u0027, rate_limit)\n" +
        "redis.register_function(\u0027get_and_touch\u0027, get_and_touch)",
    },
    {
      lang: "bash",
      title: "Nạp và gọi function",
      code:
        "redis-cli -x FUNCTION LOAD < mylib.lua\n" +
        "redis-cli FCALL rate_limit 1 rate:user:1 100 60\n" +
        "redis-cli FCALL_RO get_and_touch 1 session:abc 1800   # chỉ đọc, chạy được trên replica\n" +
        "redis-cli FUNCTION LIST\n" +
        "redis-cli FUNCTION STATS\n" +
        "redis-cli FUNCTION DUMP > functions.bin      # sao lưu / chuyển sang cụm khác\n" +
        "\n" +
        "# KHÁC EVAL/EVALSHA:\n" +
        "#  1) BỀN: function là một phần của dataset, được nhân bản và lưu persistence\n" +
        "#     -> không có lỗi NOSCRIPT, không cần client giữ SHA\n" +
        "#  2) CÓ TÊN: gọi bằng tên nghiệp vụ thay vì chuỗi hash khó hiểu\n" +
        "#  3) THƯ VIỆN: gom nhiều hàm liên quan, chia sẻ code chung giữa chúng\n" +
        "#  4) TÁCH BẠCH vai trò: quản trị nạp function; ứng dụng chỉ FCALL\n" +
        "#     -> quản lý được bằng ACL, và code không nằm rải rác trong ứng dụng\n" +
        "#  5) FCALL_RO chạy được trên replica\n" +
        "\n" +
        "# EVAL vẫn hợp cho script dùng một lần hoặc sinh động lúc chạy.",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-1iz3ypb',
  q: 'Vì sao Redis transaction "không có rollback"?',
  answer:
    'Trong `MULTI/EXEC`, nếu một lệnh **lỗi lúc chạy** (ví dụ `INCR` trên một key kiểu list) → lệnh đó fail nhưng **các lệnh khác vẫn chạy**. Không có undo.\n\n' +
    'Redis coi lỗi runtime trong transaction là **bug của lập trình viên** (đáng ra phải kiểm tra kiểu trước), và việc bỏ rollback giữ Redis đơn giản + nhanh.\n\n' +
    'Lỗi **cú pháp** (lệnh không tồn tại, sai số tham số) thì bị bắt lúc `MULTI` queue → cả `EXEC` bị từ chối.',
  essence:
    'Redis transaction đảm bảo "chạy liên tục không xen kẽ", **không** đảm bảo "tất cả hoặc không". Bạn phải tự đảm bảo các lệnh sẽ thành công (kiểm tra trước, hoặc dùng Lua với logic phòng thủ).',
  example:
    '`MULTI; INCR counter; LPUSH counter "x"; EXEC` → `INCR` thành công (counter = 1), `LPUSH` lỗi (WRONGTYPE), nhưng `INCR` **không** bị hoàn tác. Kết quả: counter đã tăng dù "transaction" có lệnh lỗi.',
  viz: {
    type: 'flow',
    title: 'Redis transaction KHÔNG có rollback',
    nodes: ['MULTI → lệnh QUEUED', 'lỗi CÚ PHÁP (lệnh không tồn tại) → bắt lúc queue → EXEC bị từ chối', 'EXEC chạy', 'lỗi RUNTIME (INCR trên list) → lệnh đó fail nhưng các lệnh KHÁC VẪN CHẠY'],
    steps: [
      { to: 2, label: 'đảm bảo "chạy liên tục không xen kẽ", KHÔNG đảm bảo "tất cả hoặc không"' },
      { to: 3, label: 'Redis coi lỗi runtime là bug lập trình viên (đáng ra kiểm tra kiểu trước)' },
      { to: 3, label: 'phải tự đảm bảo lệnh sẽ thành công, hoặc dùng Lua với logic phòng thủ' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Nguyên tử về THỰC THI, không phải về ngữ nghĩa",
      code:
        "redis-cli MULTI\n" +
        "redis-cli SET counter \"không-phải-số\"\n" +
        "redis-cli INCR counter                 # sẽ LỖI lúc thực thi\n" +
        "redis-cli LPUSH mylist \"x\"\n" +
        "redis-cli EXEC\n" +
        "# Kết quả: SET thành công, INCR lỗi, LPUSH VẪN CHẠY.\n" +
        "# Redis KHÔNG rollback hai lệnh kia.\n" +
        "\n" +
        "# HAI LOẠI LỖI, xử lý khác nhau:\n" +
        "# 1) LỖI CÚ PHÁP / lệnh không tồn tại -> phát hiện lúc XẾP HÀNG\n" +
        "#    -> Redis huỷ TOÀN BỘ transaction, EXEC trả về lỗi. (Từ Redis 2.6.5.)\n" +
        "# 2) LỖI RUNTIME (sai kiểu dữ liệu) -> chỉ phát hiện lúc THỰC THI\n" +
        "#    -> lệnh đó lỗi, các lệnh khác VẪN chạy.\n" +
        "\n" +
        "# LÝ DO THIẾT KẾ (theo tài liệu chính thức):\n" +
        "#  - lỗi runtime kiểu này là LỖI LẬP TRÌNH, phải phát hiện lúc phát triển,\n" +
        "#    không phải tình huống cần xử lý lúc chạy\n" +
        "#  - hỗ trợ rollback đòi hỏi lưu trạng thái cũ -> làm Redis chậm và phức tạp hơn\n" +
        "#  - Redis ưu tiên đơn giản và tốc độ\n" +
        "\n" +
        "# HỆ QUẢ THỰC TẾ: MULTI/EXEC chỉ đảm bảo \"không ai chen vào giữa\", KHÔNG\n" +
        "# đảm bảo \"tất cả hoặc không gì cả\" như transaction của RDBMS.\n" +
        "# -> Cần đảm bảo ngữ nghĩa thì phải:\n" +
        "#    a) kiểm tra kiểu/điều kiện TRƯỚC khi vào MULTI, hoặc\n" +
        "#    b) dùng LUA và tự kiểm tra rồi quyết định có ghi hay không:\n" +
        "redis-cli EVAL \"\n" +
        "  if redis.call(\u0027TYPE\u0027, KEYS[1])[\u0027ok\u0027] ~= \u0027string\u0027 then return 0 end\n" +
        "  redis.call(\u0027INCR\u0027, KEYS[1])\n" +
        "  return 1\" 1 counter",
    },
  ],
},
{
  cat: 'Nguyên tử',
  id: 'redis-1a325pz',
  q: 'Optimistic locking với `WATCH` (CAS) — mẫu code và khi nào dùng?',
  answer:
    '```\n' +
    'WATCH key\n' +
    'val = GET key            # đọc trạng thái hiện tại\n' +
    '... tính toán dựa trên val ...\n' +
    'MULTI\n' +
    'SET key newVal           # hoặc lệnh phụ thuộc val\n' +
    'EXEC                     # nil nếu key bị client khác sửa từ lúc WATCH\n' +
    '```\n' +
    'Nếu `EXEC` trả nil → thử lại toàn bộ vòng.\n\n' +
    'Dùng khi: cần logic đọc-tính-ghi mà tranh chấp **thấp** (retry hiếm xảy ra) và bạn muốn tránh viết Lua. Tranh chấp cao → Lua hiệu quả hơn (không retry storm).',
  essence:
    '`WATCH` biến MULTI/EXEC thành compare-and-swap: "chỉ commit nếu dữ liệu tôi dựa vào chưa đổi". Đơn giản cho tranh chấp thấp; Lua tốt hơn cho tranh chấp cao.',
  example:
    'Cập nhật một field JSON trong Redis string (không có lệnh atomic sẵn): `WATCH doc:1` → `GET` → parse, sửa field, serialize → `MULTI; SET doc:1 newJson; EXEC`. Nếu ai đó vừa sửa `doc:1` → retry. (Hoặc dùng RedisJSON `JSON.SET doc:1 $.field value` — atomic sẵn.)',
  viz: {
    type: 'flow',
    title: 'Optimistic locking với WATCH (CAS)',
    nodes: ['WATCH key', 'GET key (đọc trạng thái)', 'tính toán dựa trên val', 'MULTI → SET key newVal → EXEC', 'EXEC nil nếu key bị client khác sửa từ lúc WATCH → thử lại toàn bộ vòng'],
    steps: [
      { to: 3, label: '"chỉ commit nếu dữ liệu tôi dựa vào chưa đổi"' },
      { to: 4, label: 'dùng khi tranh chấp THẤP (retry hiếm) và muốn tránh viết Lua' },
      { to: 4, label: 'tranh chấp cao → Lua hiệu quả hơn (không retry storm)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Mẫu chuẩn và khi nào nên dùng Lua thay thế",
      code:
        "// Bài toán: trừ tồn kho, phải đọc giá trị hiện tại rồi mới quyết định.\n" +
        "public boolean reserve(String productId, int qty) {\n" +
        "    String key = \"stock:\" + productId;\n" +
        "\n" +
        "    return redis.execute(new SessionCallback<Boolean>() {\n" +
        "        @Override\n" +
        "        public Boolean execute(RedisOperations ops) {\n" +
        "            for (int attempt = 0; attempt < 3; attempt++) {\n" +
        "                ops.watch(key);                       // theo dõi key này\n" +
        "\n" +
        "                Integer stock = (Integer) ops.opsForValue().get(key);\n" +
        "                if (stock == null || stock < qty) {\n" +
        "                    ops.unwatch();                    // NHỚ unwatch khi thoát sớm\n" +
        "                    return false;\n" +
        "                }\n" +
        "\n" +
        "                ops.multi();\n" +
        "                ops.opsForValue().set(key, stock - qty);\n" +
        "                List<Object> result = ops.exec();\n" +
        "\n" +
        "                // exec() trả về null nghĩa là key đã bị NGƯỜI KHÁC sửa\n" +
        "                // giữa WATCH và EXEC -> transaction bị huỷ -> thử lại\n" +
        "                if (result != null && !result.isEmpty()) return true;\n" +
        "            }\n" +
        "            return false;                             // hết lượt thử\n" +
        "        }\n" +
        "    });\n" +
        "}\n" +
        "\n" +
        "// KHI NÀO DÙNG WATCH: logic quyết định phải chạy ở PHÍA CLIENT (cần gọi\n" +
        "// service khác, cần dữ liệu ngoài Redis).\n" +
        "\n" +
        "// KHI NÀO DÙNG LUA THAY THẾ (thường là vậy): logic đơn giản, chỉ dựa trên\n" +
        "// dữ liệu trong Redis. Lua nguyên tử sẵn, KHÔNG cần vòng lặp thử lại,\n" +
        "// và chỉ tốn MỘT round-trip thay vì ba:\n" +
        "//   if tonumber(redis.call(\u0027GET\u0027,KEYS[1])) >= tonumber(ARGV[1]) then\n" +
        "//     return redis.call(\u0027DECRBY\u0027, KEYS[1], ARGV[1]) else return -1 end\n" +
        "\n" +
        "// LƯU Ý: tranh chấp cao -> WATCH thất bại liên tục -> phải giới hạn số lần\n" +
        "// thử và có đường thoát, nếu không sẽ đốt CPU vô ích.",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'redis-1tepd56',
  q: 'Redis ACL (6.0+): users và permissions?',
  answer:
    'Trước 6.0 chỉ có một mật khẩu chung (`requirepass`). ACL cho phép nhiều user với quyền hạn chế:\n' +
    '`ACL SETUSER alice on >password ~cache:* +get +set +del -@dangerous`\n' +
    '- `~pattern`: key nào được truy cập.\n' +
    '- `+command` / `-command` / `+@category` (`@read`, `@write`, `@admin`, `@dangerous`).\n' +
    '- `&channel`: pub/sub channel nào.\n\n' +
    'User `default` nên bị siết hoặc tắt. Kết hợp ACL log (`ACL LOG`) để audit lệnh bị từ chối.',
  essence:
    'ACL đưa least-privilege vào Redis: mỗi service một user chỉ chạm được namespace key và tập lệnh của nó — thay vì "ai có mật khẩu thì làm được mọi thứ".',
  example:
    'Service `analytics` chỉ đọc: `ACL SETUSER analytics on >... ~stats:* ~events:* +@read -@write`. Nó không thể `FLUSHALL`, không thể `DEL`, không đụng key của service khác. Nếu code lỗi gọi `DEL` → bị từ chối + ghi vào `ACL LOG`.',
  viz: {
    type: 'tree',
    title: 'Redis ACL (6.0+) — least-privilege thay vì "ai có mật khẩu thì làm mọi thứ"',
    root: {
      label: 'ACL SETUSER alice on >password ~cache:* +get +set -@dangerous',
      children: [
        { label: '~pattern', note: 'key nào được truy cập' },
        { label: '+command / -command / +@category', note: '@read, @write, @admin, @dangerous' },
        { label: '&channel', note: 'pub/sub channel nào' },
        { label: 'User default nên bị siết hoặc tắt; ACL LOG để audit lệnh bị từ chối' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Quyền tối thiểu thay cho một mật khẩu duy nhất",
      code:
        "# Trước 6.0 chỉ có MỘT mật khẩu (requirepass) và mọi client có toàn quyền.\n" +
        "# ACL cho phép tạo nhiều user với quyền hạn chế theo lệnh và theo key.\n" +
        "\n" +
        "redis-cli ACL SETUSER app-reader on \u0027>matkhau-manh\u0027 \\\n" +
        "  \u0027~cache:*\u0027 \u0027~product:*\u0027 \\\n" +
        "  \u0027+get\u0027 \u0027+mget\u0027 \u0027+exists\u0027 \u0027+ttl\u0027 \u0027+scan\u0027\n" +
        "# on              — kích hoạt user\n" +
        "# >mật khẩu       — đặt mật khẩu\n" +
        "# ~pattern        — CHỈ được truy cập key khớp mẫu này\n" +
        "# +lệnh / -lệnh   — cho phép / cấm lệnh cụ thể\n" +
        "\n" +
        "# Dùng CATEGORY thay vì liệt kê từng lệnh:\n" +
        "redis-cli ACL SETUSER app-writer on \u0027>matkhau\u0027 \u0027~app:*\u0027 \u0027+@read\u0027 \u0027+@write\u0027 \u0027-@dangerous\u0027\n" +
        "redis-cli ACL CAT                       # danh sách category\n" +
        "redis-cli ACL CAT dangerous             # lệnh nào thuộc nhóm nguy hiểm\n" +
        "\n" +
        "# User cho pub/sub (Redis 7 tách riêng quyền kênh):\n" +
        "redis-cli ACL SETUSER notifier on \u0027>pass\u0027 \u0027&events:*\u0027 \u0027+publish\u0027 \u0027+subscribe\u0027\n" +
        "\n" +
        "redis-cli ACL LIST\n" +
        "redis-cli ACL WHOAMI\n" +
        "redis-cli ACL GETUSER app-reader\n" +
        "redis-cli ACL DELUSER app-reader\n" +
        "redis-cli ACL LOG                       # các lần bị TỪ CHỐI — rất hữu ích khi gỡ rối\n" +
        "\n" +
        "# TẮT user mặc định (quan trọng): nếu không, ai kết nối cũng thành \"default\"\n" +
        "redis-cli ACL SETUSER default off\n" +
        "# Lưu vào file để không mất khi restart:\n" +
        "#   aclfile /etc/redis/users.acl\n" +
        "redis-cli ACL SAVE\n" +
        "redis-cli ACL LOAD",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'redis-1yj66ag',
  q: 'Bảo mật Redis: protected mode, TLS, `rename-command`?',
  answer:
    '- **`protected-mode yes`** (mặc định): nếu Redis bind mọi interface mà không có mật khẩu → chỉ chấp nhận kết nối từ localhost. Chống expose Redis "trần" ra internet (nguyên nhân vô số vụ bị chiếm).\n' +
    '- **TLS** (`tls-port`, cert): mã hoá client↔server và replication. Bắt buộc nếu traffic đi qua mạng không tin cậy.\n' +
    '- **`rename-command`**: đổi tên hoặc vô hiệu hoá lệnh nguy hiểm (`rename-command FLUSHALL ""`, `rename-command CONFIG "CONFIG_9a3f"`).\n' +
    '- Bind vào private IP, security group chặt, không bao giờ 0.0.0.0 công khai.',
  essence:
    'Redis mặc định không mã hoá và tin tưởng client trong mạng. Bảo mật = network isolation + auth/ACL + TLS + tắt/đổi tên lệnh phá huỷ. Redis lộ ra internet = bị chiếm trong vài phút.',
  example:
    'Production: `bind 10.0.1.5`, `requirepass` mạnh + ACL per-service, `tls-port 6379` với mutual TLS cho replication cross-AZ, `rename-command FLUSHALL ""` và `rename-command KEYS ""` để không ai (kể cả nhầm lẫn) chạy được.',
  viz: {
    type: 'tree',
    title: 'Bảo mật Redis — "lộ ra internet = bị chiếm trong vài phút"',
    root: {
      label: 'network isolation + auth/ACL + TLS + tắt/đổi tên lệnh phá huỷ',
      children: [
        { label: 'protected-mode yes', note: 'bind mọi interface + không mật khẩu → chỉ chấp nhận localhost' },
        { label: 'TLS (tls-port, cert)', note: 'mã hoá client↔server và replication — bắt buộc trên mạng không tin cậy' },
        { label: 'rename-command', note: 'FLUSHALL "", CONFIG "CONFIG_9a3f" — vô hiệu hoá / đổi tên lệnh nguy hiểm' },
        { label: 'Bind private IP, security group chặt, KHÔNG bao giờ 0.0.0.0 công khai' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Redis mặc định KHÔNG an toàn khi lộ ra Internet",
      code:
        "# 1) BIND + PROTECTED MODE — lớp phòng thủ đầu tiên\n" +
        "#   bind 127.0.0.1 10.0.1.5        <- chỉ lắng nghe interface cần thiết\n" +
        "#   protected-mode yes             <- mặc định yes: từ chối kết nối từ xa\n" +
        "#                                     khi chưa đặt mật khẩu\n" +
        "# Redis không mật khẩu, bind 0.0.0.0 là bị quét và chiếm trong vài phút —\n" +
        "# đây là nguyên nhân của rất nhiều vụ tấn công thực tế.\n" +
        "\n" +
        "# 2) XÁC THỰC — dùng ACL thay vì requirepass đơn lẻ\n" +
        "#   requirepass <mật khẩu rất dài>\n" +
        "redis-cli ACL SETUSER default off\n" +
        "\n" +
        "# 3) TLS (Redis 6+) — mã hoá đường truyền\n" +
        "#   tls-port 6380\n" +
        "#   port 0                          <- TẮT hẳn cổng không mã hoá\n" +
        "#   tls-cert-file /etc/redis/redis.crt\n" +
        "#   tls-key-file /etc/redis/redis.key\n" +
        "#   tls-ca-cert-file /etc/redis/ca.crt\n" +
        "#   tls-auth-clients yes            <- yêu cầu client cũng có chứng chỉ\n" +
        "redis-cli --tls --cert client.crt --key client.key --cacert ca.crt -p 6380 PING\n" +
        "# TLS làm giảm throughput đáng kể (~20-40%) vì mất tối ưu đường truyền.\n" +
        "\n" +
        "# 4) VÔ HIỆU HOÁ lệnh nguy hiểm\n" +
        "#   rename-command FLUSHALL \"\"\n" +
        "#   rename-command FLUSHDB \"\"\n" +
        "#   rename-command CONFIG \"CONFIG_a8f3c1\"\n" +
        "#   rename-command KEYS \"\"\n" +
        "#   rename-command DEBUG \"\"\n" +
        "# (Với Redis 7 nên dùng ACL thay cho rename-command — sạch hơn và linh hoạt hơn.)\n" +
        "\n" +
        "# 5) MẠNG: đặt Redis trong subnet PRIVATE, security group chỉ mở cho\n" +
        "#    ứng dụng, KHÔNG BAO GIỜ mở ra Internet.\n" +
        "# 6) Chạy bằng user không đặc quyền, và đặt thư mục dữ liệu đúng quyền.",
    },
  ],
},
{
  cat: 'Client',
  id: 'redis-an77zh',
  q: 'Client-side caching / client tracking (RESP3) là gì?',
  answer:
    'Redis 6 (RESP3) hỗ trợ **server-assisted client-side caching**: client cache giá trị trong bộ nhớ của nó; server **theo dõi** các key client đã đọc và gửi **invalidation message** khi key đó thay đổi (hoặc bị evict).\n\n' +
    'Hai mode:\n' +
    '- **Default (tracking)**: server nhớ chính xác key nào client nào đọc (tốn RAM server).\n' +
    '- **Broadcast**: server gửi invalidation cho mọi client đăng ký prefix, không nhớ per-client.',
  essence:
    'Client tracking là "L1 cache với invalidation tự động do Redis đẩy" — giảm round-trip cho key nóng mà không lo stale (Redis chủ động báo khi đổi). Đánh đổi: phức tạp client, RAM server (default mode).',
  example:
    'Client (Lettuce/redis-py hỗ trợ) bật tracking broadcast cho prefix `config:` → đọc `config:feature-x` một lần, cache local; admin đổi `config:feature-x` → Redis đẩy invalidation → client xoá cache, lần đọc sau lấy giá trị mới. Không cần tự làm pub/sub.',
  viz: {
    type: 'flow',
    title: 'Client-side caching / client tracking (RESP3)',
    nodes: ['client đọc key → cache trong bộ nhớ của nó', 'server THEO DÕI key client đã đọc', 'key thay đổi (hoặc bị evict)', 'server gửi invalidation message → client xoá cache'],
    steps: [
      { to: 1, label: 'default (tracking): server nhớ chính xác key nào client nào đọc (tốn RAM server)' },
      { to: 3, label: 'broadcast: server gửi invalidation cho mọi client đăng ký prefix, không nhớ per-client' },
      { to: 3, label: '"L1 cache với invalidation tự động do Redis đẩy" — không lo stale, không cần tự pub/sub' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Redis chủ động báo khi key đổi",
      code:
        "# BÀI TOÁN: cache cục bộ (L1) rất nhanh nhưng không biết khi nào dữ liệu\n" +
        "# trên Redis đã đổi -> phải đặt TTL ngắn và chấp nhận dữ liệu cũ.\n" +
        "# CLIENT TRACKING: Redis GHI NHỚ client nào đã đọc key nào, và GỬI THÔNG BÁO\n" +
        "# khi key đó thay đổi -> client xoá cache cục bộ đúng lúc.\n" +
        "\n" +
        "redis-cli -3                          # dùng giao thức RESP3\n" +
        "> CLIENT TRACKING on\n" +
        "> GET product:1                       # Redis ghi nhận client này quan tâm key đó\n" +
        "# Khi ai đó SET product:1 -> client nhận invalidation message qua kênh\n" +
        "# __redis__:invalidate\n" +
        "\n" +
        "# CHẾ ĐỘ BCAST — không theo dõi từng key mà theo TIỀN TỐ (ít tốn bộ nhớ hơn\n" +
        "# ở phía server, nhưng client nhận cả thông báo không liên quan):\n" +
        "> CLIENT TRACKING on BCAST PREFIX product: PREFIX config:\n" +
        "\n" +
        "# OPTIN/OPTOUT — kiểm soát key nào được theo dõi:\n" +
        "> CLIENT TRACKING on OPTIN\n" +
        "> CLIENT CACHING yes                  # chỉ lệnh TIẾP THEO mới được theo dõi\n" +
        "> GET product:1\n" +
        "\n" +
        "# Với RESP2, dùng chế độ redirect: thông báo gửi qua một kết nối khác\n" +
        "> CLIENT TRACKING on REDIRECT <client-id>\n" +
        "\n" +
        "redis-cli CLIENT TRACKINGINFO\n" +
        "redis-cli INFO clients | grep tracking\n" +
        "\n" +
        "# LỢI ÍCH: cache L1 gần như luôn đúng mà không cần TTL siêu ngắn -> giảm\n" +
        "# mạnh số round-trip tới Redis cho dữ liệu nóng.\n" +
        "# LƯU Ý: server tốn bộ nhớ để giữ bảng theo dõi (tracking-table-max-keys),\n" +
        "# và thông báo là BEST-EFFORT — mất kết nối thì phải xoá sạch cache cục bộ.",
    },
  ],
},
{
  cat: 'Hiệu năng',
  id: 'redis-157zsa4',
  q: 'Redis I/O threads (`io-threads`) làm gì? Có phải Redis đã đa luồng?',
  answer:
    'Từ Redis 6, `io-threads N` cho phép nhiều thread xử lý phần **đọc/ghi socket và parse/serialize protocol** — thường là nút thắt khi có nhiều kết nối và payload lớn.\n\n' +
    '**Việc thực thi lệnh vẫn đơn luồng** → atomicity và mô hình không-lock không đổi.\n\n' +
    'Chỉ nên bật khi CPU là bottleneck do I/O (thấy qua profiling); trên workload lệnh đơn giản nó không giúp và có thể hại.',
  essence:
    'Redis vẫn "đơn luồng ở chỗ quan trọng" (thực thi lệnh). `io-threads` chỉ song song hoá phần networking. Đừng kỳ vọng nó biến Redis thành đa lõi cho logic.',
  example:
    'Redis phục vụ 50k kết nối, payload trung bình 4KB, CPU pin 100% ở `readQueryFromClient`/`writeToClient`: bật `io-threads 4` → throughput tăng ~2x. Nếu lệnh chủ yếu là `INCR` nhỏ, một core đã dư → không bật.',
  viz: {
    type: 'compare',
    cols: ['io-threads N (Redis 6+)', 'Thực thi lệnh'],
    rows: [
      ['Song song hoá', 'đọc/ghi socket + parse/serialize protocol', 'VẪN ĐƠN LUỒNG'],
      ['Ảnh hưởng', 'giảm nút thắt networking khi nhiều kết nối / payload lớn', 'atomicity + mô hình không-lock KHÔNG đổi'],
      ['Khi nào bật', 'CPU pin ở readQueryFromClient/writeToClient (profiling)', '—'],
      ['Lệnh đơn giản (INCR nhỏ)', 'không giúp, có thể hại', '—'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đa luồng phần MẠNG, không phải phần thực thi",
      code:
        "#   io-threads 4                 <- trong redis.conf, KHÔNG đổi lúc chạy được\n" +
        "#   io-threads-do-reads yes      <- mặc định chỉ đa luồng phần GHI\n" +
        "\n" +
        "# ĐIỀU QUAN TRỌNG NHẤT: Redis VẪN ĐƠN LUỒNG ở phần THỰC THI LỆNH.\n" +
        "# io-threads chỉ song song hoá việc ĐỌC/GHI SOCKET và PHÂN TÍCH giao thức —\n" +
        "# những việc chiếm phần lớn thời gian khi payload lớn hoặc nhiều client.\n" +
        "# Mọi lệnh vẫn chạy tuần tự trên thread chính -> tính nguyên tử không đổi.\n" +
        "\n" +
        "# KHI NÀO CÓ ÍCH:\n" +
        "#  - throughput rất cao (trên ~100k ops/s) và CPU của thread chính đã bão hoà\n" +
        "#  - payload lớn (giá trị vài chục KB trở lên)\n" +
        "#  - rất nhiều kết nối đồng thời\n" +
        "# KHI NÀO VÔ ÍCH: tải thấp/trung bình -> thêm thread chỉ tốn CPU và có thể\n" +
        "# làm CHẬM hơn do chi phí điều phối.\n" +
        "\n" +
        "# Khuyến nghị của Redis: io-threads = số core - 1, và KHÔNG quá 8.\n" +
        "# Máy 4 core trở xuống thì đừng bật.\n" +
        "nproc\n" +
        "redis-cli INFO cpu\n" +
        "redis-cli --stat                  # theo dõi ops/s và số client\n" +
        "\n" +
        "# ĐO TRƯỚC VÀ SAU khi bật, đừng bật theo cảm tính:\n" +
        "redis-benchmark -h localhost -t set,get -n 1000000 -c 100 -P 16 -d 1024",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-r0tb1f',
  q: 'Sorted Set nâng cao: `ZRANGEBYSCORE`, `ZADD GT/LT`, `ZPOPMIN`, `ZRANGEBYLEX`?',
  answer:
    '- `ZRANGEBYSCORE key min max LIMIT offset count`: lấy phần tử trong khoảng score (dùng cho time range, priority range).\n' +
    '- `ZADD key GT 100 member`: chỉ cập nhật nếu score mới **lớn hơn** score cũ (`LT` ngược lại) — hữu ích cho "chỉ giữ điểm cao nhất", "chỉ tiến thời gian".\n' +
    '- `ZPOPMIN` / `BZPOPMIN`: lấy và xoá phần tử score nhỏ nhất — priority queue nguyên tử.\n' +
    '- `ZRANGEBYLEX`: khi mọi phần tử cùng score, lấy theo thứ tự từ điển — dùng cho autocomplete/index.',
  essence:
    'ZSet không chỉ là leaderboard: `GT/LT` cho cập nhật có điều kiện nguyên tử, `ZPOPMIN` cho priority queue, `BYLEX` cho index sắp xếp — nhiều bài toán gọn lại thành một lệnh.',
  example:
    'Delayed queue nguyên tử: worker `BZPOPMIN jobs 5` lấy job đến hạn sớm nhất (score = runAt). "Chỉ ghi nhận highscore": `ZADD scores GT <newScore> <player>` — không cần đọc-so-sánh-ghi.',
  viz: {
    type: 'tree',
    title: 'ZSet nâng cao — nhiều bài toán gọn lại thành MỘT lệnh',
    root: {
      label: 'ZSet không chỉ là leaderboard',
      children: [
        { label: 'ZRANGEBYSCORE key min max LIMIT', note: 'time range, priority range' },
        { label: 'ZADD key GT 100 member', note: 'chỉ cập nhật nếu score mới lớn hơn — "chỉ giữ điểm cao nhất", "chỉ tiến thời gian"' },
        { label: 'ZPOPMIN / BZPOPMIN', note: 'lấy + xoá phần tử score nhỏ nhất — priority queue nguyên tử' },
        { label: 'ZRANGEBYLEX', note: 'mọi phần tử cùng score → lấy theo thứ tự từ điển — autocomplete/index' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Các lệnh ZSet ít dùng nhưng rất mạnh",
      code:
        "# ZADD với cờ điều kiện (Redis 6.2+) — tránh phải đọc rồi so sánh\n" +
        "redis-cli ZADD leaderboard GT CH 1500 \"user:1\"\n" +
        "#  GT — chỉ cập nhật nếu score MỚI LỚN HƠN (giữ điểm cao nhất — đúng cho leaderboard)\n" +
        "#  LT — chỉ cập nhật nếu NHỎ HƠN (giữ thời gian sớm nhất)\n" +
        "#  NX — chỉ thêm mới, không cập nhật\n" +
        "#  XX — chỉ cập nhật, không thêm mới\n" +
        "#  CH — trả về số phần tử THỰC SỰ thay đổi (mặc định chỉ đếm phần tử mới)\n" +
        "\n" +
        "# ZRANGEBYSCORE với khoảng mở/đóng và phân trang\n" +
        "redis-cli ZRANGEBYSCORE events 1757030400 \u0027+inf\u0027 LIMIT 0 100\n" +
        "redis-cli ZRANGEBYSCORE events \u0027(1000\u0027 2000        # ( = loại trừ cận\n" +
        "redis-cli ZREVRANGEBYSCORE events \u0027+inf\u0027 \u0027-inf\u0027 LIMIT 0 10\n" +
        "\n" +
        "# ZPOPMIN / ZPOPMAX — lấy VÀ xoá nguyên tử. Nền tảng của hàng đợi ưu tiên.\n" +
        "redis-cli ZPOPMIN delayed:jobs 5\n" +
        "redis-cli BZPOPMIN delayed:jobs 30                 # bản chặn\n" +
        "\n" +
        "# ZRANGEBYLEX — khi MỌI phần tử cùng score, sắp theo từ điển.\n" +
        "# Dùng cho autocomplete và index thứ cấp:\n" +
        "redis-cli ZADD names 0 \"an\" 0 \"anh\" 0 \"binh\"\n" +
        "redis-cli ZRANGEBYLEX names \u0027[an\u0027 \u0027[an\\xff\u0027        # mọi từ bắt đầu bằng \"an\"\n" +
        "\n" +
        "# ZRANGESTORE (7.0) — lưu kết quả vào key khác, không phải trả về client\n" +
        "redis-cli ZRANGESTORE top10 leaderboard 0 9 REV\n" +
        "\n" +
        "# ZUNIONSTORE / ZINTERSTORE với TRỌNG SỐ — kết hợp nhiều bảng xếp hạng\n" +
        "redis-cli ZUNIONSTORE total 2 lb:tuan lb:thang WEIGHTS 1 0.5 AGGREGATE SUM\n" +
        "redis-cli ZINTERCARD 2 set1 set2 LIMIT 100         # đếm giao mà không tạo key mới",
    },
  ],
},
{
  cat: 'Sự cố',
  id: 'redis-uo5cct',
  q: 'Keyspace notification `expired` — vì sao không nên dựa vào cho logic quan trọng?',
  answer:
    'Vấn đề:\n' +
    '- Dựa trên **pub/sub** → subscriber offline lúc phát → **mất** event. Không replay.\n' +
    '- Event `expired` chỉ phát khi key **thực sự bị xoá** — với **lazy expiration**, một key TTL=0 nhưng không ai truy cập có thể "chưa expired" hàng phút cho tới khi active-cycle bắt được → **độ trễ không xác định**.\n' +
    '- Trên replica, key hết hạn không bị xoá chủ động (chờ master gửi `DEL`) → notification behavior khác.\n' +
    '- Tải cao nhiều key hết hạn cùng lúc → burst CPU.',
  essence:
    'Notification `expired` là "gợi ý best-effort, có độ trễ", không phải "callback đúng lúc TTL về 0". Cho logic quan trọng (huỷ đơn sau X phút), dùng ZSet + poller hoặc scheduler thật.',
  example:
    'Huỷ đơn hàng chưa thanh toán sau 15 phút: **sai** = `SET order:1 pending EX 900` + nghe `expired`. **Đúng** = `ZADD orders:pending <expireAt> order:1`; worker mỗi 10s `ZRANGEBYSCORE orders:pending -inf <now>` xử lý và `ZREM`.',
  viz: {
    type: 'tree',
    title: 'Notification "expired" — "gợi ý best-effort, có độ trễ", không phải callback đúng lúc',
    root: {
      label: 'Cho logic quan trọng (huỷ đơn sau X phút): dùng ZSet + poller / scheduler thật',
      children: [
        { label: 'Dựa pub/sub', note: 'subscriber offline lúc phát → MẤT, không replay' },
        { label: 'Lazy expiration → độ trễ KHÔNG xác định', note: 'key TTL=0 không ai truy cập có thể "chưa expired" hàng phút' },
        { label: 'Trên replica', note: 'key hết hạn không bị xoá chủ động (chờ master DEL) → behavior khác' },
        { label: 'Tải cao nhiều key hết hạn cùng lúc → burst CPU' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Vì sao không dựa vào sự kiện hết hạn cho logic quan trọng",
      code:
        "redis-cli CONFIG SET notify-keyspace-events \"Ex\"\n" +
        "redis-cli PSUBSCRIBE \u0027__keyevent@0__:expired\u0027\n" +
        "\n" +
        "# BỐN LÝ DO KHÔNG NÊN DỰA VÀO:\n" +
        "# 1) SỰ KIỆN PHÁT KHI KEY BỊ XOÁ THẬT, không phải khi HẾT HẠN.\n" +
        "#    Redis xoá key hết hạn theo hai cách: LAZY (khi có ai truy cập) và\n" +
        "#    ACTIVE (quét ngẫu nhiên 20 key mỗi 100ms). Key không ai đụng tới có\n" +
        "#    thể tồn tại thêm HÀNG PHÚT sau thời điểm hết hạn.\n" +
        "#    -> Dùng nó để hẹn giờ chính xác là SAI.\n" +
        "\n" +
        "# 2) DÙNG PUB/SUB -> FIRE-AND-FORGET. Consumer restart, mạng chớp nháy,\n" +
        "#    buffer đầy -> MẤT sự kiện VĨNH VIỄN, không có cách nào phát hiện.\n" +
        "\n" +
        "# 3) TRONG CLUSTER: sự kiện chỉ phát trên node chứa key -> phải subscribe\n" +
        "#    TẤT CẢ node. Và trên REPLICA, key hết hạn không tự xoá (chờ master\n" +
        "#    gửi lệnh DEL) -> thời điểm phát khác nhau.\n" +
        "\n" +
        "# 4) Tốn CPU khi keyspace lớn và nhiều key hết hạn.\n" +
        "\n" +
        "# THAY THẾ ĐÚNG: Sorted Set làm hàng đợi hẹn giờ — worker chủ động poll\n" +
        "redis-cli ZADD scheduled 1757030400 \"session:abc\"\n" +
        "redis-cli ZRANGEBYSCORE scheduled 0 $(date +%s) LIMIT 0 100\n" +
        "# Worker chết thì việc vẫn còn; phát lại được; biết chính xác cái gì chưa xử lý.\n" +
        "# Kết hợp ZPOPMIN hoặc Lua để lấy và xoá nguyên tử, tránh hai worker cùng lấy.",
    },
  ],
},
{
  cat: 'Hiệu năng',
  id: 'redis-u25l56',
  q: 'App-level sharding vs Redis Cluster — đánh đổi?',
  answer:
    '- **App-level sharding**: app tự chọn Redis instance theo `hash(key) % N`. Kiểm soát hoàn toàn (routing, replica, config từng shard), không có ràng buộc slot/CROSSSLOT của Cluster. Nhưng: **tự làm mọi thứ** — thêm/bớt shard = resharding thủ công đau đớn, tự lo failover mỗi shard, client phức tạp.\n' +
    '- **Cluster**: sharding + failover + resharding online tự động. Đổi lại: hạn chế multi-key (hash tag), client phải cluster-aware, vận hành cụm phức tạp hơn.',
  essence:
    'App-level sharding = linh hoạt tối đa + gánh nặng vận hành tối đa. Cluster = tự động hoá phần khó (reshard, failover) đổi lấy một số ràng buộc. Đa số nên chọn Cluster hoặc managed.',
  example:
    'Legacy dùng 4 Redis instance riêng, app hash `userId % 4`: giờ cần 6 shard → phải viết script migrate 1/3 key, downtime hoặc dual-write phức tạp. Nếu dùng Cluster từ đầu: `--cluster reshard` online, không sửa code.',
  viz: {
    type: 'compare',
    cols: ['App-level sharding', 'Redis Cluster'],
    rows: [
      ['Routing', 'app tự chọn instance theo hash(key) % N', 'slot tự động, ASK/MOVED'],
      ['Thêm/bớt shard', 'resharding THỦ CÔNG đau đớn (migrate + downtime/dual-write)', '--cluster reshard online'],
      ['Failover mỗi shard', 'tự lo', 'tự động (đa số master vote)'],
      ['Ràng buộc', 'không có slot/CROSSSLOT', 'multi-key phải cùng slot (hash tag)'],
      ['Kết luận', 'linh hoạt tối đa + gánh nặng vận hành tối đa', 'đa số nên chọn cái này hoặc managed'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tự chia hay để Redis chia",
      code:
        "// APP-LEVEL SHARDING: ứng dụng tự quyết key nào đi instance nào.\n" +
        "private RedisTemplate<String, String> shardFor(String key) {\n" +
        "    int shard = Math.abs(key.hashCode()) % shards.size();\n" +
        "    return shards.get(shard);\n" +
        "}\n" +
        "// + KIỂM SOÁT HOÀN TOÀN: chia theo tenant, theo loại dữ liệu, theo vùng\n" +
        "// + mỗi shard là Redis ĐỘC LẬP -> dùng được mọi lệnh, mọi database,\n" +
        "//   và có thể cấu hình khác nhau (shard này bật AOF, shard kia không)\n" +
        "// + client đơn giản (không cần hỗ trợ cluster)\n" +
        "// - TỰ LÀM MỌI THỨ: rebalance khi thêm shard là ĐAU ĐỚN (đổi modulo là\n" +
        "//   đổi ánh xạ TOÀN BỘ key)\n" +
        "// - tự lo failover cho từng shard\n" +
        "// - không có lệnh nào chạy xuyên shard\n" +
        "\n" +
        "// Giảm đau khi rebalance: dùng CONSISTENT HASHING thay vì modulo\n" +
        "// -> thêm shard chỉ di chuyển 1/N dữ liệu thay vì gần như toàn bộ.\n" +
        "\n" +
        "// REDIS CLUSTER:\n" +
        "// + rebalance BẰNG CÁCH DI CHUYỂN SLOT, cụm vẫn phục vụ trong lúc đó\n" +
        "// + failover tự động sẵn có\n" +
        "// + client thư viện lo hết redirect\n" +
        "// - ràng buộc multi-key theo slot, chỉ database 0\n" +
        "// - vận hành phức tạp hơn\n" +
        "\n" +
        "// CHỌN: mặc định dùng CLUSTER (nó giải quyết đúng bài toán này).\n" +
        "// App-level sharding hợp lý khi: cần cách ly cứng theo tenant, cần cấu hình\n" +
        "// khác nhau cho từng nhóm dữ liệu, hoặc dùng managed Redis không có cluster mode.",
    },
  ],
},
{
  cat: 'Giám sát',
  id: 'redis-zchrmi',
  q: 'Giám sát Redis: `INFO`, `MONITOR`, `LATENCY`, `--bigkeys`/`--hotkeys`?',
  answer:
    '- **`INFO`**: nguồn metric chính — memory, clients, stats (ops/s, hit rate, evicted), replication, persistence, keyspace.\n' +
    '- **`MONITOR`**: stream **mọi lệnh** realtime — hữu ích debug nhưng **giảm throughput ~50%**, tuyệt đối không để chạy lâu trên production.\n' +
    '- **`LATENCY DOCTOR` / `LATENCY HISTORY`**: phân tích spike latency và nguyên nhân (fork, expire, aof...).\n' +
    '- **`redis-cli --bigkeys`**: mẫu tìm key lớn nhất mỗi kiểu. **`--hotkeys`**: cần `maxmemory-policy` LFU.\n' +
    '- **`SLOWLOG GET`**: lệnh chậm.',
  essence:
    '`INFO` cho bức tranh sức khoẻ tổng thể (đẩy vào Prometheus). `LATENCY`/`SLOWLOG` để điều tra spike. `MONITOR` là công cụ mạnh nhưng nguy hiểm — chỉ dùng chớp nhoáng.',
  example:
    'Dashboard: `keyspace_hits / (hits + misses)` (hit rate < 0.8 → cache không hiệu quả), `instantaneous_ops_per_sec`, `used_memory` vs `maxmemory`, `connected_clients`, `rdb_last_bgsave_status`, `master_repl_offset - slave offset` (replication lag).',
  viz: {
    type: 'tree',
    title: 'Giám sát Redis',
    root: {
      label: 'INFO cho sức khoẻ tổng thể; LATENCY/SLOWLOG để điều tra spike',
      children: [
        { label: 'INFO', note: 'memory, clients, stats (ops/s, hit rate, evicted), replication, persistence — đẩy Prometheus' },
        { label: 'MONITOR', note: 'stream MỌI lệnh — giảm throughput ~50%, KHÔNG để chạy lâu' },
        { label: 'LATENCY DOCTOR / HISTORY', note: 'phân tích spike + nguyên nhân (fork, expire, aof)' },
        { label: 'redis-cli --bigkeys / --hotkeys (cần LFU); SLOWLOG GET' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Bộ công cụ chẩn đoán, và cái nào an toàn ở production",
      code:
        "# INFO — an toàn, dùng liên tục để thu thập metric\n" +
        "redis-cli INFO                       # tất cả\n" +
        "redis-cli INFO stats                 # ops/s, hit/miss, expired, evicted\n" +
        "redis-cli INFO memory\n" +
        "redis-cli INFO replication\n" +
        "redis-cli INFO commandstats          # số lần gọi và usec trung bình MỖI LỆNH\n" +
        "redis-cli INFO latencystats          # phân vị độ trễ theo lệnh (Redis 7+)\n" +
        "redis-cli INFO keyspace              # số key và số key có TTL mỗi database\n" +
        "\n" +
        "# Tỉ lệ hit — chỉ số sức khoẻ quan trọng nhất của một cache:\n" +
        "redis-cli INFO stats | grep -E \"keyspace_hits|keyspace_misses\"\n" +
        "\n" +
        "# --stat — bảng điều khiển đơn giản, cập nhật liên tục\n" +
        "redis-cli --stat\n" +
        "\n" +
        "# LATENCY — đo độ trễ, an toàn\n" +
        "redis-cli --latency\n" +
        "redis-cli --latency-history\n" +
        "redis-cli --intrinsic-latency 100    # độ trễ của MÁY, không phải của Redis\n" +
        "redis-cli LATENCY DOCTOR             # phân tích tự động — bắt đầu từ đây\n" +
        "redis-cli CONFIG SET latency-monitor-threshold 100\n" +
        "\n" +
        "# MONITOR — in MỌI lệnh đang chạy. RẤT HỮU ÍCH nhưng LÀM CHẬM server\n" +
        "# đáng kể (mọi lệnh phải ghi thêm ra một kênh). Chỉ chạy VÀI GIÂY:\n" +
        "redis-cli MONITOR | head -1000 > /tmp/cmds.txt\n" +
        "awk \u0027{print $4}\u0027 /tmp/cmds.txt | sort | uniq -c | sort -rn | head\n" +
        "\n" +
        "# --bigkeys / --memkeys / --hotkeys — quét bằng SCAN nên an toàn, nhưng\n" +
        "# tốn thời gian trên dataset lớn:\n" +
        "redis-cli --bigkeys\n" +
        "redis-cli --hotkeys                  # cần maxmemory-policy lfu\n" +
        "\n" +
        "# Xuất sang Prometheus: redis_exporter -> Grafana (có dashboard sẵn).",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  id: 'redis-ncx82m',
  q: 'Dùng List làm queue có vấn đề gì so với dedicated MQ / Streams?',
  answer:
    'List queue (`LPUSH` + `BRPOP`) đơn giản nhưng thiếu:\n' +
    '- **Ack / at-least-once**: `RPOP` xoá luôn → worker chết = mất job (trừ khi dùng `LMOVE` sang list "processing" và tự dọn).\n' +
    '- **Consumer group**: không có; muốn nhiều worker phải tự chia.\n' +
    '- **Retry / DLQ / visibility timeout**: tự xây.\n' +
    '- **Theo dõi**: không biết "đang xử lý bao nhiêu, treo bao lâu".\n' +
    '- **Delayed / priority**: cần ZSet riêng.',
  essence:
    'List queue ổn cho task đơn giản, chấp nhận mất mát, một loại consumer. Cần đảm bảo xử lý + retry + quan sát → Redis Streams (consumer group) hoặc MQ chuyên dụng (SQS, RabbitMQ).',
  example:
    'Gửi webhook (được phép mất vài cái, tải nhẹ): List + `BRPOPLPUSH` + reaper. Xử lý thanh toán async (không được mất, cần retry có backoff, cần biết cái nào đang kẹt): Streams với `XPENDING`/`XAUTOCLAIM`, hoặc SQS + DLQ.',
  viz: {
    type: 'tree',
    title: 'List queue thiếu gì so với Streams / MQ chuyên dụng',
    root: {
      label: 'Ổn cho task đơn giản, chấp nhận mất mát, một loại consumer',
      children: [
        { label: 'Ack / at-least-once', note: 'RPOP xoá luôn → worker chết = mất job (trừ khi LMOVE + tự dọn)' },
        { label: 'Consumer group', note: 'không có; muốn nhiều worker phải tự chia' },
        { label: 'Retry / DLQ / visibility timeout', note: 'tự xây' },
        { label: 'Theo dõi', note: 'không biết "đang xử lý bao nhiêu, treo bao lâu"' },
        { label: 'Delayed / priority', note: 'cần ZSet riêng' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Đơn giản, nhưng thiếu gần hết những gì hàng đợi cần",
      code:
        "redis-cli LPUSH queue:jobs \"job1\"\n" +
        "redis-cli BRPOP queue:jobs 30\n" +
        "\n" +
        "# NĂM THỨ THIẾU so với hàng đợi thật:\n" +
        "# 1) KHÔNG CÓ ACK. BRPOP lấy message ra là nó BIẾN MẤT. Consumer chết giữa\n" +
        "#    lúc xử lý -> job mất vĩnh viễn, không ai biết.\n" +
        "#    Giảm nhẹ bằng BLMOVE (lấy và đặt vào danh sách \"đang xử lý\"):\n" +
        "redis-cli BLMOVE queue:jobs queue:processing RIGHT LEFT 30\n" +
        "#    Nhưng vẫn phải TỰ VIẾT job giám sát để đưa việc quá hạn trở lại.\n" +
        "\n" +
        "# 2) KHÔNG CÓ CONSUMER GROUP. Nhiều consumer cùng BRPOP thì mỗi job vẫn chỉ\n" +
        "#    một consumer nhận (tốt), nhưng KHÔNG có nhiều nhóm xử lý ĐỘC LẬP cùng\n" +
        "#    một luồng dữ liệu.\n" +
        "\n" +
        "# 3) KHÔNG PHÁT LẠI ĐƯỢC. Xử lý sai logic -> không có cách lấy lại job cũ.\n" +
        "\n" +
        "# 4) KHÔNG CÓ retry/DLQ/độ trễ sẵn có -> tự viết hết.\n" +
        "\n" +
        "# 5) KHÔNG QUAN SÁT ĐƯỢC: chỉ biết LLEN, không biết job nào đang xử lý,\n" +
        "#    đã thử bao nhiêu lần, consumer nào đang giữ.\n" +
        "redis-cli LLEN queue:jobs\n" +
        "\n" +
        "# DÙNG LIST KHI: hàng đợi nội bộ đơn giản, job mất được, không cần theo dõi.\n" +
        "# CHUYỂN SANG STREAMS KHI: cần ack, consumer group, phát lại (vẫn trong Redis).\n" +
        "# CHUYỂN SANG MQ THẬT (RabbitMQ/SQS/Kafka) KHI: cần độ bền cao, định tuyến\n" +
        "# phức tạp, ưu tiên, delay dài, hoặc quan sát/vận hành nghiêm túc.",
    },
  ],
},
{
  cat: 'Hiệu năng',
  id: 'redis-1gm3he2',
  q: 'RESP2 vs RESP3 — thay đổi gì đáng chú ý?',
  answer:
    'RESP3 (Redis 6+, opt-in qua `HELLO 3`):\n' +
    '- **Kiểu dữ liệu phong phú hơn**: map, set, double, boolean, big number, verbatim string — trước đó mọi thứ là array/string, client phải tự đoán.\n' +
    '- **Push messages**: kênh out-of-band cho pub/sub và **client-side caching invalidation** trên cùng connection (không cần connection riêng cho SUBSCRIBE).\n' +
    '- **Attributes**: metadata kèm reply.\n\n' +
    'Client hiện đại tự negotiate; RESP2 vẫn được hỗ trợ.',
  essence:
    'RESP3 làm protocol "tự mô tả" hơn (client bớt đoán kiểu) và cho phép push message trên connection thường — nền tảng cho client-side caching và pub/sub gọn hơn.',
  example:
    'Với RESP3, `CONFIG GET` hoặc `XPENDING` trả về **map** thật thay vì array phẳng xen kẽ key-value → client parse an toàn hơn. Client-side caching invalidation đến qua push message trên chính connection đang dùng, không cần mở SUBSCRIBE riêng.',
  viz: {
    type: 'compare',
    cols: ['RESP2', 'RESP3 (Redis 6+, HELLO 3)'],
    rows: [
      ['Kiểu dữ liệu', 'mọi thứ là array/string — client tự đoán', 'map, set, double, boolean, big number, verbatim string'],
      ['Push messages', 'cần connection riêng cho SUBSCRIBE', 'kênh out-of-band trên cùng connection (pub/sub + invalidation)'],
      ['Ví dụ', 'CONFIG GET trả array phẳng xen kẽ', 'trả map thật → client parse an toàn hơn'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Giao thức mới, kiểu dữ liệu phong phú hơn",
      code:
        "redis-cli -3                     # dùng RESP3\n" +
        "redis-cli HELLO 3                # chuyển giao thức trong một kết nối đang mở\n" +
        "\n" +
        "# RESP2 chỉ có 5 kiểu: simple string, error, integer, bulk string, array.\n" +
        "# Mọi thứ phức tạp đều phải nhét vào ARRAY -> client phải TỰ ĐOÁN cấu trúc.\n" +
        "# Ví dụ HGETALL trả về mảng phẳng [field1, value1, field2, value2] và client\n" +
        "# phải tự ghép cặp.\n" +
        "\n" +
        "# RESP3 thêm: map, set, double, big number, boolean, verbatim string,\n" +
        "# push message, attribute.\n" +
        "# -> HGETALL trả về MAP thật, XINFO trả về map, ZSCORE trả về double.\n" +
        "# -> Client không phải suy đoán, ít lỗi chuyển đổi kiểu hơn.\n" +
        "\n" +
        "# HAI TÍNH NĂNG QUAN TRỌNG chỉ RESP3 mới làm gọn được:\n" +
        "# 1) PUSH MESSAGE trên CÙNG kết nối: pub/sub và invalidation không cần\n" +
        "#    kết nối riêng nữa -> nền tảng cho client-side caching:\n" +
        "redis-cli -3 CLIENT TRACKING on\n" +
        "# 2) ATTRIBUTE: gửi metadata kèm phản hồi mà không phá cấu trúc dữ liệu.\n" +
        "\n" +
        "# TƯƠNG THÍCH: Redis 6+ hỗ trợ CẢ HAI, mặc định vẫn là RESP2 để không phá\n" +
        "# client cũ. Client phải chủ động gửi HELLO 3.\n" +
        "redis-cli INFO clients\n" +
        "redis-cli CLIENT INFO | grep resp\n" +
        "\n" +
        "# THỰC TẾ: nâng lên RESP3 chủ yếu đáng làm khi bạn cần client-side caching.\n" +
        "# Ngoài ra hãy kiểm tra kỹ — một số thư viện xử lý kiểu trả về khác nhau\n" +
        "# giữa hai giao thức, có thể làm vỡ code đang chạy.",
    },
  ],
},
{
  cat: 'Hiệu năng',
  id: 'redis-1qrw3ut',
  q: 'Vì sao nên biết Big-O và tránh `O(N)` trên collection lớn trong Redis?',
  answer:
    'Redis thực thi lệnh **đơn luồng** → một lệnh `O(N)` với N lớn **chặn toàn bộ server** trong suốt thời gian chạy; mọi client khác treo, health check fail, có thể kích hoạt failover giả.\n\n' +
    'Các "quả bom" thường gặp:\n' +
    '- `KEYS *`, `SMEMBERS bigset`, `HGETALL bighash`, `LRANGE key 0 -1`, `ZRANGE key 0 -1`.\n' +
    '- `DEL` một key khổng lồ (dùng `UNLINK`).\n' +
    '- `SORT` không `BY`/`LIMIT` trên list lớn.\n' +
    '- Lua script lặp qua hàng triệu phần tử.\n\n' +
    'Thay thế: `SCAN`/`HSCAN`/`SSCAN`/`ZSCAN`, `LRANGE` có giới hạn, `ZRANGEBYSCORE ... LIMIT`.',
  essence:
    'Trên server đơn luồng, "chậm cho một lệnh" = "chậm cho tất cả". Thuộc lòng lệnh nào là O(N) và luôn phân trang/giới hạn phạm vi thay vì lấy nguyên collection.',
  example:
    'Endpoint admin gọi `HGETALL sessions:all` (2 triệu field) mất 300ms → trong 300ms đó Redis không phục vụ ai → p99 của toàn app nhảy vọt mỗi lần admin mở trang. Sửa: `HSCAN` phân trang, hoặc tách cấu trúc.',
  viz: {
    type: 'compare',
    cols: ['"Quả bom" O(N) — chặn TOÀN BỘ server', 'Thay thế'],
    rows: [
      ['Đọc cả collection', 'KEYS *, SMEMBERS, HGETALL, LRANGE 0 -1, ZRANGE 0 -1', 'SCAN/HSCAN/SSCAN/ZSCAN, LRANGE có giới hạn, ZRANGEBYSCORE ... LIMIT'],
      ['Xoá key khổng lồ', 'DEL', 'UNLINK'],
      ['Sắp xếp', 'SORT không BY/LIMIT trên list lớn', 'SORT ... LIMIT'],
      ['Hệ quả', 'mọi client treo, health check fail, có thể failover giả', '—'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đơn luồng biến một lệnh chậm thành sự cố toàn hệ thống",
      code:
        "# Ở database thường, một query chậm chỉ ảnh hưởng connection đó.\n" +
        "# Ở Redis, nó CHẶN TOÀN BỘ SERVER — mọi client khác đứng chờ.\n" +
        "\n" +
        "# VÍ DỤ CỤ THỂ: LRANGE trên list 1 triệu phần tử\n" +
        "redis-cli LRANGE big:list 0 -1          # O(N): ~100ms+ -> 100ms KHÔNG AI\n" +
        "                                        # được phục vụ -> hàng nghìn timeout\n" +
        "redis-cli LRANGE big:list 0 99          # O(100): an toàn\n" +
        "\n" +
        "# CÁC LỆNH PHẢI CHÚ Ý (O(N) theo kích thước collection):\n" +
        "#   HGETALL, HKEYS, HVALS      -> HSCAN\n" +
        "#   SMEMBERS                   -> SSCAN\n" +
        "#   LRANGE 0 -1                -> giới hạn khoảng\n" +
        "#   ZRANGE 0 -1                -> giới hạn khoảng\n" +
        "#   DEL trên collection lớn    -> UNLINK\n" +
        "#   SINTER/SUNION set lớn      -> O(N*M), tính trước hoặc chia nhỏ\n" +
        "\n" +
        "# O(N) THEO TOÀN BỘ KEYSPACE (nguy hiểm nhất):\n" +
        "#   KEYS, FLUSHALL/FLUSHDB đồng bộ, SCAN với COUNT quá lớn\n" +
        "\n" +
        "# PHÁT HIỆN trong hệ thống đang chạy:\n" +
        "redis-cli CONFIG SET slowlog-log-slower-than 10000\n" +
        "redis-cli SLOWLOG GET 10\n" +
        "redis-cli INFO commandstats | sort -t= -k3 -rn | head    # usec_per_call cao nhất\n" +
        "redis-cli --bigkeys                                       # collection nào đang to\n" +
        "\n" +
        "# NGUYÊN TẮC: mọi lệnh phải có N BIẾT TRƯỚC VÀ NHỎ. Không kiểm soát được N\n" +
        "# -> dùng biến thể SCAN, giới hạn khoảng, hoặc chia nhỏ cấu trúc dữ liệu.\n" +
        "# Đây là khác biệt tư duy quan trọng nhất khi chuyển từ SQL sang Redis.",
    },
  ],
},
{
  cat: 'Client',
  id: 'redis-1uuq3re',
  q: 'Connection pool cho Redis: cấu hình và cạm bẫy?',
  answer:
    'Redis xử lý lệnh đơn luồng nên **một connection** đã có thể đẩy throughput cao (nhất là với pipeline). Nhưng blocking command và latency mạng khiến pool vẫn cần.\n\n' +
    'Cấu hình: max pool size hợp lý (thường 8–50/instance app, không phải hàng trăm), timeout kết nối/lệnh ngắn, test-on-borrow hoặc keepalive, tối đa idle.\n\n' +
    'Cạm bẫy:\n' +
    '- Pool quá lớn → nhiều connection idle, tốn `maxclients` của Redis, tốn RAM (mỗi client có buffer).\n' +
    '- Dùng chung connection cho `SUBSCRIBE` và lệnh thường (RESP2) → hỏng.\n' +
    '- Lệnh blocking (`BRPOP`) giữ connection lâu → cạn pool.',
  essence:
    'Với Redis, "nhiều connection" không tuyến tính tăng throughput (server đơn luồng). Pool vừa đủ + timeout ngắn + tách connection cho blocking/pubsub là công thức đúng.',
  example:
    'App 20 pod, mỗi pod pool 20 → 400 connection tới Redis (`maxclients 10000` ổn). Đặt pool 500/pod "cho chắc" → 10.000 connection, chạm `maxclients`, RAM client buffer đáng kể, không nhanh hơn. Blocking `BRPOP` dùng pool riêng.',
  viz: {
    type: 'tree',
    title: 'Connection pool cho Redis — "nhiều connection" không tuyến tính tăng throughput',
    root: {
      label: 'Server đơn luồng — pool vừa đủ + timeout ngắn + tách connection blocking/pubsub',
      children: [
        { label: 'Max pool size 8–50/instance app', note: 'không phải hàng trăm' },
        { label: 'Timeout kết nối/lệnh NGẮN; keepalive / test-on-borrow' },
        { label: 'Pool quá lớn → connection idle tốn maxclients + RAM (mỗi client có buffer)' },
        { label: 'SUBSCRIBE và lệnh thường dùng chung connection (RESP2) → hỏng' },
        { label: 'Blocking (BRPOP) giữ connection lâu → dùng pool RIÊNG' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Kích thước pool, timeout và các lỗi hay gặp",
      code:
        "@Bean\n" +
        "public LettuceConnectionFactory redisConnectionFactory() {\n" +
        "    GenericObjectPoolConfig<?> pool = new GenericObjectPoolConfig<>();\n" +
        "    pool.setMaxTotal(50);            // tổng kết nối tối đa\n" +
        "    pool.setMaxIdle(20);\n" +
        "    pool.setMinIdle(10);             // giữ sẵn -> tránh chi phí tạo kết nối lúc cao điểm\n" +
        "    pool.setMaxWait(Duration.ofMillis(100));   // chờ lấy kết nối, ĐỪNG để vô hạn\n" +
        "    pool.setTestOnBorrow(false);     // true = thêm một PING mỗi lần mượn -> chậm\n" +
        "    pool.setTestWhileIdle(true);     // kiểm tra kết nối rỗi ở nền — nên bật\n" +
        "\n" +
        "    LettucePoolingClientConfiguration cfg = LettucePoolingClientConfiguration.builder()\n" +
        "            .poolConfig(pool)\n" +
        "            .commandTimeout(Duration.ofSeconds(1))     // Redis nhanh -> timeout NGẮN\n" +
        "            .build();\n" +
        "    return new LettuceConnectionFactory(\n" +
        "            new RedisStandaloneConfiguration(\"redis\", 6379), cfg);\n" +
        "}\n" +
        "\n" +
        "// LƯU Ý QUAN TRỌNG VỀ LETTUCE: nó dựa trên Netty và THREAD-SAFE — một kết\n" +
        "// nối duy nhất phục vụ được nhiều thread (multiplexing). Phần lớn ứng dụng\n" +
        "// KHÔNG CẦN pool khi dùng Lettuce.\n" +
        "// CẦN pool khi: dùng lệnh CHẶN (BLPOP), transaction (MULTI/EXEC), hoặc\n" +
        "// pub/sub — những thứ chiếm riêng một kết nối.\n" +
        "// JEDIS thì KHÔNG thread-safe -> BẮT BUỘC phải có pool.\n" +
        "\n" +
        "// CẠM BẪY:\n" +
        "//  1) Pool quá NHỎ -> thread xếp hàng chờ kết nối; triệu chứng giống hệt\n" +
        "//     \"Redis chậm\" nhưng SLOWLOG lại trống.\n" +
        "//  2) Pool quá LỚN -> Redis chạm maxclients (mặc định 10.000) và tốn bộ nhớ\n" +
        "//     cho buffer mỗi kết nối.\n" +
        "//  3) commandTimeout quá DÀI -> một lệnh chậm giữ kết nối, kéo sập cả pool.\n" +
        "//  4) Quên đóng kết nối khi dùng API cấp thấp -> rò rỉ, pool cạn dần.\n" +
        "// redis-cli INFO clients      -> connected_clients, blocked_clients\n" +
        "// redis-cli CONFIG GET maxclients",
    },
  ],
},
]);
