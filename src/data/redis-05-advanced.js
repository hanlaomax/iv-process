SS.addQuestions('redis', [
{
  cat: 'Pub/Sub & Streams',
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
},
{
  cat: 'Pub/Sub & Streams',
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
},
{
  cat: 'Pub/Sub & Streams',
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
},
{
  cat: 'Nguyên tử',
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
},
{
  cat: 'Nguyên tử',
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
},
{
  cat: 'Nguyên tử',
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
},
{
  cat: 'Nguyên tử',
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
},
{
  cat: 'Nguyên tử',
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
},
{
  cat: 'Bảo mật',
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
},
{
  cat: 'Bảo mật',
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
},
{
  cat: 'Client',
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
},
{
  cat: 'Hiệu năng',
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
},
{
  cat: 'Kiểu dữ liệu',
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
},
{
  cat: 'Sự cố',
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
},
{
  cat: 'Hiệu năng',
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
},
{
  cat: 'Giám sát',
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
},
{
  cat: 'Kiểu dữ liệu',
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
},
{
  cat: 'Hiệu năng',
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
},
{
  cat: 'Hiệu năng',
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
},
{
  cat: 'Client',
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
},
]);
