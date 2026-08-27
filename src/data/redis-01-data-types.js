SS.addQuestions('redis', [
{
  cat: 'Tổng quan',
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
},
{
  cat: 'Kiểu dữ liệu',
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
},
{
  cat: 'Kiểu dữ liệu',
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
},
{
  cat: 'Kiểu dữ liệu',
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
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Set dùng cho việc gì? Các phép toán tập hợp?',
  answer:
    'Set = tập phần tử duy nhất, không thứ tự. `SADD`, `SREM`, `SISMEMBER` (O(1)), `SCARD`, `SMEMBERS` (cẩn thận nếu lớn), `SRANDMEMBER`, `SPOP`.\n\n' +
    'Phép toán: `SINTER` (giao), `SUNION` (hợp), `SDIFF` (hiệu) — và bản `*STORE` lưu kết quả.\n\n' +
    'Use case: tag, danh sách bạn bè, "ai đã like", chống trùng, chọn ngẫu nhiên, tính "bạn chung".',
  essence:
    'Set trả lời nhanh "phần tử này có trong nhóm không?" và các câu hỏi giao/hợp/hiệu giữa các nhóm — mà không cần kéo dữ liệu về app để xử lý.',
  example:
    '"Bạn chung của A và B": `SINTER friends:A friends:B`. "Người xem video X nhưng chưa mua": `SDIFF viewers:X buyers:X`. "Bài viết có cả tag redis và cache": `SINTER tag:redis tag:cache`.',
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Sorted Set (ZSet): cấu trúc và các use case kinh điển?',
  answer:
    'ZSet = set mà mỗi phần tử có một **score** (double); phần tử được **sắp xếp theo score**. Hiện thực bằng skiplist + hash → thêm/xoá/tra hạng O(log N).\n\n' +
    'Lệnh: `ZADD`, `ZRANGE`/`ZREVRANGE` (theo hạng), `ZRANGEBYSCORE` (theo khoảng score), `ZRANK`, `ZINCRBY`, `ZPOPMIN`.\n\n' +
    'Use case: **leaderboard** (score = điểm), **priority queue / delayed job** (score = timestamp thực thi), **sliding window rate limit** (score = timestamp), **time-series index**, top-N.',
  essence:
    'ZSet = "danh sách luôn được sắp xếp, có thể truy vấn theo hạng hoặc theo khoảng score". Là cấu trúc linh hoạt nhất của Redis, giải quyết leaderboard, hàng đợi có ưu tiên và rate limit chính xác.',
  example:
    'Delayed queue: `ZADD jobs <runAtEpoch> jobId`. Worker mỗi giây: `ZRANGEBYSCORE jobs -inf <now> LIMIT 0 10` lấy job đến hạn, xử lý, `ZREM`. Leaderboard: `ZINCRBY game:leaderboard 10 player:5`, `ZREVRANGE game:leaderboard 0 9 WITHSCORES` cho top 10.',
},
{
  cat: 'Kiểu dữ liệu',
  q: 'HyperLogLog dùng để làm gì? Đánh đổi ra sao?',
  answer:
    'HyperLogLog ước lượng **số phần tử duy nhất** (cardinality) của một tập rất lớn với sai số ~0.81%, chỉ tốn **12KB** cố định mỗi key — bất kể tập có 100 hay 1 tỉ phần tử.\n\n' +
    'Lệnh: `PFADD key element`, `PFCOUNT key`, `PFMERGE dest src1 src2`.\n\n' +
    'Đánh đổi: **không lưu phần tử thật** (không kiểm tra "X có trong tập không"), kết quả là **ước lượng**.',
  essence:
    'HLL đổi độ chính xác tuyệt đối lấy bộ nhớ hằng số cực nhỏ. Dùng khi bạn chỉ cần *con số đếm distinct gần đúng*, không cần danh sách.',
  example:
    'Đếm "số IP/user duy nhất truy cập mỗi trang mỗi ngày" cho hàng triệu trang: một Set sẽ tốn GB. `PFADD uv:page:123:2024-06-01 <userId>` → 12KB/trang/ngày. `PFCOUNT` cho unique visitor; `PFMERGE` để cộng dồn theo tuần.',
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Redis Streams khác Pub/Sub và List như thế nào?',
  answer:
    '- **Pub/Sub**: fire-and-forget. Subscriber offline lúc publish → **mất message**. Không lưu trữ, không replay, không ack.\n' +
    '- **List** (như queue): message được lưu, nhưng `RPOP` xoá luôn → chỉ một consumer nhận, không có consumer group, không replay, khó theo dõi "đã xử lý".\n' +
    '- **Streams**: log **append-only** có id (timestamp-seq), **lưu trữ** (có `MAXLEN` để giới hạn), **consumer groups** (nhiều consumer chia tải), **ACK** (`XACK`), theo dõi pending (`XPENDING`), claim lại message treo (`XCLAIM`), replay theo id.',
  essence:
    'Pub/Sub = broadcast không đảm bảo. List = queue đơn giản một chiều. Streams = "Kafka mini trong Redis": bền, có group, có ack, replay được.',
  example:
    'Thông báo realtime tới UI đang mở (mất cũng không sao): Pub/Sub. Hàng đợi task cần đảm bảo xử lý, nhiều worker, retry message lỗi: Streams với consumer group — `XADD`, `XREADGROUP`, `XACK`, và job cron `XAUTOCLAIM` message treo quá lâu.',
},
{
  cat: 'TTL & key',
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
},
{
  cat: 'TTL & key',
  q: 'Vì sao không dùng `KEYS` trong production? Dùng gì thay thế?',
  answer:
    '`KEYS pattern` quét **toàn bộ keyspace** trong một lần, O(N), **chặn server** cho tới khi xong. Với hàng triệu key = treo vài giây → mọi client timeout.\n\n' +
    '`SCAN cursor MATCH pattern COUNT 100`: **iterator** — trả về một phần key + cursor để lặp tiếp. Không chặn (mỗi lần chỉ làm một ít việc). Đảm bảo: key tồn tại suốt quá trình scan sẽ được trả (có thể trùng, có thể bỏ sót key thêm/xoá giữa chừng).\n\n' +
    'Tương tự: `HSCAN`, `SSCAN`, `ZSCAN` cho collection lớn.',
  essence:
    '`KEYS` và các lệnh O(N) lớn là "vũ khí tự sát" trên server đơn luồng. `SCAN` chia công việc thành nhiều bước nhỏ, không làm nghẽn client khác.',
  example:
    'Cần xoá mọi key `session:*` của một user: `SCAN 0 MATCH session:user:1:* COUNT 200` trong vòng lặp, `UNLINK` (xoá bất đồng bộ) từng batch. Không bao giờ `KEYS session:*` rồi `DEL`.',
},
{
  cat: 'Hiệu năng',
  q: 'Pipelining trong Redis là gì? Khác transaction thế nào?',
  answer:
    '**Pipelining**: client gửi **nhiều lệnh liên tiếp** không chờ reply từng cái, rồi đọc tất cả reply một lượt. Giảm số lần round-trip mạng (RTT) → tăng throughput hàng chục lần cho batch lệnh nhỏ.\n\n' +
    'Pipeline **không** đảm bảo nguyên tử: lệnh của client khác có thể xen vào giữa. Nó chỉ là tối ưu mạng.\n\n' +
    '`MULTI/EXEC` (transaction) đảm bảo các lệnh chạy **liên tiếp không bị xen**, nhưng không rollback nếu một lệnh lỗi logic.',
  essence:
    'Pipeline tối ưu **độ trễ mạng** (gộp RTT). Transaction đảm bảo **tính nguyên tử** (không xen kẽ). Hai mục đích khác nhau — thường dùng pipeline nhiều hơn.',
  example:
    'Nạp 10.000 cặp key-value lúc warm cache: không pipeline = 10.000 RTT (~mỗi cái 0.5ms → 5s). Pipeline theo lô 500 = 20 RTT → ~10ms. Với client như lettuce/redis-py, bật pipeline/batch mode.',
},
{
  cat: 'Nguyên tử',
  q: 'MULTI/EXEC và WATCH (optimistic locking) hoạt động thế nào?',
  answer:
    '`MULTI` bắt đầu ghi hàng đợi lệnh; các lệnh sau đó được **xếp hàng** (trả `QUEUED`); `EXEC` chạy **toàn bộ liên tiếp, nguyên tử** (không client nào xen vào). `DISCARD` huỷ.\n\n' +
    '**Không có rollback**: nếu một lệnh trong transaction fail (ví dụ sai kiểu), các lệnh khác vẫn chạy.\n\n' +
    '`WATCH key`: trước `MULTI`, đánh dấu theo dõi key. Nếu key đó bị **sửa bởi client khác** trước `EXEC` → `EXEC` trả nil (transaction huỷ) → client tự thử lại. Đây là **CAS / optimistic lock**.',
  essence:
    'MULTI/EXEC = "chạy nhóm lệnh này không ai chen ngang". WATCH thêm "và huỷ nếu dữ liệu tôi dựa vào đã đổi". Không có rollback nên phải tự kiểm tra điều kiện trước.',
  example:
    'Trừ số dư an toàn: `WATCH balance:1` → `GET balance:1` (giả sử 100) → nếu đủ tiền: `MULTI` → `DECRBY balance:1 30` → `EXEC`. Nếu client khác vừa đổi `balance:1` → `EXEC` trả nil → lặp lại. Hoặc đơn giản hơn: dùng Lua.',
},
{
  cat: 'Nguyên tử',
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
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Bitmap trong Redis: use case và giới hạn?',
  answer:
    'Bitmap là String được thao tác ở mức bit: `SETBIT key offset 0|1`, `GETBIT`, `BITCOUNT` (đếm bit 1), `BITOP AND/OR/XOR/NOT`, `BITPOS`.\n\n' +
    'Offset là chỉ số user/entity → mỗi user tốn **1 bit**. 1 triệu user ≈ 125KB.\n\n' +
    'Use case: daily active users, "user đã xem thông báo chưa", A/B test bucket, feature access. Giới hạn: offset phải là số nguyên dày đặc (id lớn/thưa → tốn bộ nhớ do String phải cấp phát tới offset đó).',
  essence:
    'Bitmap = "mảng boolean khổng lồ nén cực chặt", lý tưởng cho trạng thái nhị phân theo user-id liên tục. Kết hợp `BITOP` để trả lời câu hỏi tập hợp trên hàng triệu user gần như tức thì.',
  example:
    '"User hoạt động cả 7 ngày trong tuần": `BITOP AND result dau:d1 dau:d2 ... dau:d7` rồi `BITCOUNT result`. "Hoạt động ít nhất 1 ngày": `BITOP OR`. Mỗi ngày một bitmap ~125KB cho 1M user.',
},
{
  cat: 'Nguyên tử',
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
},
{
  cat: 'Tổng quan',
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
},
{
  cat: 'Hiệu năng',
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
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Redis Geo dùng để làm gì?',
  answer:
    'Geo là ZSet với score được mã hoá geohash. `GEOADD key <lon> <lat> member`, `GEOSEARCH key FROMLONLAT <lon> <lat> BYRADIUS 5 km ASC`, `GEODIST`, `GEOPOS`.\n\n' +
    'Use case: "cửa hàng/tài xế/người dùng trong bán kính X km", sắp theo khoảng cách, tìm N điểm gần nhất.\n\n' +
    'Vì là ZSet nên có thể `ZREM` để xoá điểm, `EXPIRE` cả key.',
  essence:
    'Geo cho phép truy vấn không gian (bán kính, gần nhất) ngay trong Redis với latency ms — đủ cho nhiều bài toán "gần tôi" mà không cần PostGIS.',
  example:
    'App gọi xe: mỗi tài xế online cập nhật `GEOADD drivers:online <lon> <lat> driver:123` mỗi vài giây. Khi có cuốc: `GEOSEARCH drivers:online FROMLONLAT <pickupLon> <pickupLat> BYRADIUS 3 km ASC COUNT 10` → 10 tài xế gần nhất.',
},
{
  cat: 'TTL & key',
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
},
{
  cat: 'Tổng quan',
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
},
]);
