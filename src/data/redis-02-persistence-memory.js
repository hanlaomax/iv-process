SS.addQuestions('redis', [
{
  cat: 'Persistence',
  q: 'RDB snapshot hoạt động thế nào? `SAVE` vs `BGSAVE`?',
  answer:
    'RDB là **ảnh chụp toàn bộ dataset** tại một thời điểm, ghi ra file `dump.rdb` (nén, compact).\n\n' +
    '- `SAVE`: ghi đồng bộ trên main thread → **chặn** server cho tới xong. Không dùng production.\n' +
    '- `BGSAVE`: Redis `fork()` một tiến trình con; nhờ **copy-on-write** của OS, con thấy snapshot bất biến của bộ nhớ và ghi ra đĩa, main thread vẫn phục vụ.\n\n' +
    'Trigger: `save 900 1` / `save 300 100` trong config (sau X giây có Y thay đổi), hoặc gọi tay, hoặc trước shutdown.',
  essence:
    'RDB = backup định kỳ dạng ảnh chụp, rất gọn và khôi phục nhanh. `BGSAVE` tránh chặn nhờ fork + COW, nhưng fork tốn RAM và có thể gây latency spike trên dataset lớn.',
  example:
    'Redis 30GB trên máy 40GB RAM: `BGSAVE` fork → nếu ghi nhiều trong lúc save, COW nhân đôi các trang bị sửa → RAM có thể vọt lên gần 40GB → nguy cơ OOM/swap. Cần headroom RAM ≥ 1.5–2× dataset, hoặc dùng replica để save.',
  viz: {
    type: 'compare',
    cols: ['SAVE', 'BGSAVE'],
    rows: [
      ['Cách', 'ghi đồng bộ trên main thread', 'fork() tiến trình con, COW'],
      ['Chặn server?', 'CÓ — tới khi xong', 'không — main thread vẫn phục vụ'],
      ['Cái giá', '—', 'fork tốn RAM (COW) + latency spike trên dataset lớn'],
      ['Production', 'không dùng', 'dùng; cân nhắc save trên replica'],
    ],
  },
},
{
  cat: 'Persistence',
  q: 'AOF là gì? `appendfsync` có mấy mức?',
  answer:
    'AOF (Append Only File): ghi **mọi lệnh ghi** vào file log; khôi phục = chạy lại log.\n\n' +
    '`appendfsync`:\n' +
    '- **always**: fsync sau mỗi lệnh → gần như không mất dữ liệu, nhưng chậm (giới hạn bởi tốc độ fsync đĩa).\n' +
    '- **everysec** (mặc định): fsync mỗi giây → mất tối đa ~1 giây dữ liệu khi crash. Cân bằng tốt.\n' +
    '- **no**: để OS tự flush → nhanh nhất, mất nhiều nhất.\n\n' +
    '**AOF rewrite** (`BGREWRITEAOF`): nén log bằng cách viết lại tập lệnh tối thiểu tái tạo state hiện tại (tránh file phình vô hạn).',
  essence:
    'AOF đánh đổi độ bền lấy hiệu năng qua `appendfsync`. `everysec` là mặc định hợp lý: mất tối đa 1s khi mất điện, đủ nhanh cho hầu hết workload.',
  example:
    'Redis làm session store: `everysec` — mất 1s session khi crash là chấp nhận được. Redis lưu dữ liệu tài chính không thể mất: `always` + đĩa NVMe, chấp nhận throughput thấp hơn, và vẫn nên có DB thật phía sau.',
  viz: {
    type: 'compare',
    cols: ['appendfsync always', 'everysec (mặc định)', 'no'],
    rows: [
      ['fsync khi nào', 'sau mỗi lệnh', 'mỗi giây', 'để OS tự flush'],
      ['Mất dữ liệu khi crash', 'gần như không', 'tối đa ~1 giây', 'nhiều nhất'],
      ['Tốc độ', 'chậm (giới hạn bởi fsync đĩa)', 'cân bằng tốt', 'nhanh nhất'],
    ],
  },
},
{
  cat: 'Persistence',
  q: 'RDB và AOF — dùng cái nào? Có kết hợp được không?',
  answer:
    '- **RDB**: file nhỏ, khôi phục nhanh, tốt cho backup/DR. Nhược: mất dữ liệu giữa hai snapshot (có thể vài phút).\n' +
    '- **AOF**: mất ít dữ liệu hơn (≤ 1s với everysec), nhưng file lớn hơn, khôi phục chậm hơn.\n\n' +
    '**Kết hợp** (khuyến nghị cho production cần bền): bật cả hai. Với `aof-use-rdb-preamble yes`, file AOF bắt đầu bằng một RDB (khôi phục nhanh phần lớn) rồi các lệnh incremental sau đó (mất ít). Khi khởi động, Redis ưu tiên AOF nếu bật.',
  essence:
    'RDB cho "khôi phục nhanh, backup gọn"; AOF cho "mất ít dữ liệu". Bật cả hai + preamble để có cả hai ưu điểm. Redis thuần cache thì có thể tắt persistence hoàn toàn.',
  example:
    'Redis làm cache thuần (dữ liệu tái tạo được từ DB): tắt cả hai (`save ""`, `appendonly no`) → không có latency spike do save, restart thì cache lạnh nhưng tự ấm lại. Redis làm data store: RDB + AOF everysec.',
  viz: {
    type: 'compare',
    cols: ['RDB', 'AOF', 'Kết hợp (khuyến nghị)'],
    rows: [
      ['File', 'nhỏ', 'lớn hơn', 'AOF bắt đầu bằng RDB preamble'],
      ['Khôi phục', 'nhanh', 'chậm hơn', 'nhanh phần lớn + mất ít'],
      ['Mất dữ liệu', 'giữa 2 snapshot (vài phút)', '≤ 1s (everysec)', '≤ 1s'],
      ['Cache thuần', 'có thể tắt cả hai (save "", appendonly no)', '—', '—'],
    ],
  },
},
{
  cat: 'Persistence',
  q: 'Redis có phải là một database bền vững (durable) không?',
  answer:
    'Redis **không** cho đảm bảo durability mạnh như một RDBMS:\n' +
    '- `everysec` AOF: mất tới 1 giây writes khi crash.\n' +
    '- Replication là **bất đồng bộ**: master ack client trước khi replica nhận → master chết có thể mất writes chưa replicate.\n' +
    '- `WAIT numreplicas timeout` ép chờ replica ack, nhưng vẫn không phải quorum thật.\n\n' +
    'Redis 7.4+ có "Redis Enterprise" và một số cải tiến, nhưng nói chung: dùng Redis như **cache / state phụ trợ**, không phải nguồn sự thật duy nhất cho dữ liệu không được mất.',
  essence:
    'Redis chọn tốc độ và đơn giản hơn là durability tuyệt đối. Nếu mất vài giây dữ liệu là thảm hoạ, Redis phải đứng trước một hệ lưu trữ bền thật sự.',
  example:
    'Giỏ hàng lưu chỉ trên Redis, master crash → mất giỏ hàng vài user 1 giây cuối. Chấp nhận được. Nhưng "đơn hàng đã đặt" thì phải nằm ở Postgres; Redis chỉ cache trạng thái để đọc nhanh.',
  viz: {
    type: 'tree',
    title: 'Redis KHÔNG cho durability mạnh như RDBMS',
    root: {
      label: 'Dùng Redis như cache / state phụ trợ, không phải nguồn sự thật duy nhất',
      children: [
        { label: 'everysec AOF', note: 'mất tới 1 giây writes khi crash' },
        { label: 'Replication bất đồng bộ', note: 'master ack client trước khi replica nhận → master chết có thể mất writes' },
        { label: 'WAIT numreplicas', note: 'ép chờ replica ack nhưng vẫn không phải quorum thật' },
      ],
    },
  },
},
{
  cat: 'Bộ nhớ',
  q: '`maxmemory` và các eviction policy?',
  answer:
    'Khi RAM dùng đạt `maxmemory`, Redis áp `maxmemory-policy`:\n' +
    '- **noeviction** (mặc định): từ chối lệnh ghi (trả lỗi), đọc vẫn được.\n' +
    '- **allkeys-lru / allkeys-lfu**: evict key ít dùng gần đây / ít dùng nhất, xét **mọi** key.\n' +
    '- **volatile-lru / volatile-lfu / volatile-ttl / volatile-random**: chỉ evict key **có TTL**.\n' +
    '- **allkeys-random / volatile-random**.\n\n' +
    'LRU/LFU của Redis là **xấp xỉ** (lấy mẫu ngẫu nhiên, chọn cái tệ nhất trong mẫu) — không phải LRU chính xác, để tiết kiệm CPU/RAM.',
  essence:
    'Chính sách eviction quyết định Redis làm gì khi đầy: từ chối ghi (data store) hay tự dọn key nguội (cache). `allkeys-lru`/`allkeys-lfu` cho cache; `noeviction` cho khi mọi key đều quan trọng.',
  example:
    'Redis thuần cache: `maxmemory 8gb`, `maxmemory-policy allkeys-lfu` (LFU tốt hơn LRU khi có key "một-lần-rồi-thôi"). Redis vừa cache vừa lưu lock/counter: `volatile-lru` để chỉ dọn cache (có TTL), không đụng lock/counter (không TTL).',
  viz: {
    type: 'tree',
    title: 'maxmemory-policy — Redis làm gì khi đầy RAM',
    root: {
      label: 'LRU/LFU của Redis là XẤP XỈ (lấy mẫu, chọn cái tệ nhất trong mẫu)',
      children: [
        { label: 'noeviction (mặc định)', note: 'từ chối lệnh ghi (trả lỗi), đọc vẫn được — cho data store' },
        { label: 'allkeys-lru / allkeys-lfu', note: 'evict xét MỌI key — cho cache' },
        { label: 'volatile-lru / lfu / ttl / random', note: 'chỉ evict key CÓ TTL — dọn cache, không đụng lock/counter' },
      ],
    },
  },
},
{
  cat: 'Bộ nhớ',
  q: 'LRU và LFU khác nhau thế nào? Khi nào chọn LFU?',
  answer:
    '- **LRU (Least Recently Used)**: evict key **lâu nhất chưa được truy cập**. Vấn đề: một lần scan/quét lớn kéo nhiều key "một lần dùng" vào, đẩy key nóng thật sự ra.\n' +
    '- **LFU (Least Frequently Used)** (Redis 4+): evict key **ít được truy cập nhất theo tần suất**, với cơ chế "làm già" counter theo thời gian để key từng nóng nhưng nay nguội cũng bị dọn.\n\n' +
    'LFU chống được "cache pollution" từ truy cập một lần.',
  essence:
    'LRU nhìn "lần cuối dùng"; LFU nhìn "dùng bao nhiêu lần". LFU bền vững hơn khi có traffic quét/one-off lẫn với traffic thật.',
  example:
    'Cache API: một crawler quét toàn bộ sản phẩm mỗi đêm. Với LRU, sau khi crawler chạy, cache toàn key sản phẩm ít người xem, key hot bị evict → sáng ra cache miss cao. Với `allkeys-lfu`, key hot có tần suất cao vẫn được giữ.',
  viz: {
    type: 'compare',
    cols: ['LRU (Least Recently Used)', 'LFU (Least Frequently Used, Redis 4+)'],
    rows: [
      ['Evict theo', '"lần cuối dùng" lâu nhất', '"dùng bao nhiêu lần" ít nhất (có làm già counter)'],
      ['Điểm yếu', 'một lần scan lớn đẩy key nóng ra (cache pollution)', 'chống được cache pollution từ truy cập một lần'],
      ['Chọn khi', 'traffic đều', 'có traffic quét/one-off lẫn traffic thật'],
    ],
  },
},
{
  cat: 'Bộ nhớ',
  q: 'Memory fragmentation trong Redis là gì?',
  answer:
    '`mem_fragmentation_ratio` = `used_memory_rss` (RAM OS cấp) / `used_memory` (Redis nghĩ mình dùng).\n\n' +
    '- ~1.0–1.5: bình thường.\n' +
    '- > 1.5: phân mảnh cao — allocator (jemalloc) giữ nhiều trang không trả lại OS sau khi xoá nhiều key hoặc thay đổi kích thước value nhiều.\n' +
    '- < 1.0: Redis đang **swap** ra đĩa — cực xấu, latency tăng vọt.\n\n' +
    'Khắc phục: `activedefrag yes` (defrag nền), restart, hoặc `MEMORY PURGE`.',
  essence:
    'Fragmentation là khoảng cách giữa "RAM Redis cần" và "RAM OS đã cấp cho tiến trình". Cao thì lãng phí RAM; dưới 1 nghĩa là đang swap — phải xử lý ngay.',
  example:
    'Sau khi xoá 40% key (dọn dữ liệu cũ), `used_memory` giảm còn `used_memory_rss` vẫn cao → ratio 1.8. Bật `activedefrag yes` với ngưỡng phù hợp → jemalloc dồn dữ liệu, trả trang về OS, ratio về ~1.2.',
  viz: {
    type: 'compare',
    cols: ['ratio 1.0–1.5', 'ratio > 1.5', 'ratio < 1.0'],
    rows: [
      ['Nghĩa', 'bình thường', 'phân mảnh cao — allocator giữ trang không trả OS', 'Redis đang SWAP ra đĩa'],
      ['Hành động', '—', 'activedefrag yes / restart / MEMORY PURGE', 'CỰC XẤU — latency tăng vọt, xử lý ngay'],
    ],
  },
},
{
  cat: 'Bộ nhớ',
  q: 'Big keys và hot keys — vấn đề và cách phát hiện?',
  answer:
    '**Big key**: một key chứa quá nhiều dữ liệu (hash/set/list/zset hàng triệu phần tử, hoặc string vài chục MB). Hại: lệnh O(N) trên nó chặn server; migrate slot trong Cluster chặn; `DEL` gây latency spike.\n\n' +
    '**Hot key**: một key nhận tỉ lệ truy cập bất thường cao → một shard/CPU quá tải trong khi phần còn lại nhàn.\n\n' +
    'Phát hiện: `redis-cli --bigkeys` (mẫu), `--hotkeys` (cần LFU), `MEMORY USAGE key`, `SLOWLOG`, phân tích RDB (rdb-tools).',
  essence:
    'Big key vi phạm giả định "thao tác O(1) nhanh". Hot key vi phạm giả định "tải phân bố đều". Cả hai làm hỏng mô hình đơn luồng + sharding của Redis.',
  example:
    'Big key: `HSET all_users_status <userId> <status>` với 5M field → sửa lại thành hash phân mảnh `users_status:{shard}` theo `userId % 256`. Hot key: giá sản phẩm bán chạy đọc 50k/s → thêm local cache ở app (TTL 1s) hoặc replicate key ra nhiều bản `price:X:{0..9}`.',
  viz: {
    type: 'compare',
    cols: ['Big key', 'Hot key'],
    rows: [
      ['Vi phạm giả định', '"thao tác O(1) nhanh"', '"tải phân bố đều"'],
      ['Hại', 'lệnh O(N) chặn server, migrate slot chặn, DEL spike', 'một shard/CPU quá tải, phần còn lại nhàn'],
      ['Phát hiện', 'redis-cli --bigkeys, MEMORY USAGE', '--hotkeys (cần LFU), SLOWLOG'],
      ['Sửa', 'hash phân mảnh theo userId % 256', 'local cache ở app, hoặc replicate key nhiều bản'],
    ],
  },
},
{
  cat: 'Persistence',
  q: 'Copy-on-write khi fork và latency spike lúc save?',
  answer:
    'Khi `BGSAVE`/`BGREWRITEAOF`, Redis `fork()`. Tiến trình con chia sẻ trang bộ nhớ với cha (COW). Khi cha **ghi** vào một trang, OS **nhân bản trang đó** cho cha → dataset ghi nhiều = tốn thêm RAM và tốn thời gian copy trang.\n\n' +
    'Bản thân lời gọi `fork()` cũng mất thời gian tỉ lệ với số trang bảng trang (page table) → **latency spike** vài chục–vài trăm ms trên dataset lớn (thấy trong `latest_fork_usec`).',
  essence:
    'Save không chặn nhờ COW, nhưng "cái giá" bị dời sang: RAM tăng theo tỉ lệ ghi trong lúc save, và một cú giật latency lúc fork. Dataset càng lớn, càng đau.',
  example:
    'Redis 50GB, ghi ~20% dataset mỗi phút: mỗi `BGSAVE` khiến RAM tăng ~10GB (COW) và `fork` mất ~200ms (mọi client thấy giật). Giải pháp: giảm tần suất save, tắt save trên master và để **replica** làm persistence.',
  viz: {
    type: 'flow',
    title: 'Copy-on-write khi fork — "cái giá" bị dời sang',
    nodes: ['BGSAVE → fork()', 'con chia sẻ trang bộ nhớ với cha (COW)', 'cha GHI vào một trang', 'OS nhân bản trang đó cho cha', 'RAM tăng theo tỉ lệ ghi + latency spike lúc fork'],
    steps: [
      { to: 1, label: 'save không chặn nhờ COW' },
      { to: 3, label: 'dataset ghi nhiều trong lúc save = tốn thêm RAM + thời gian copy trang' },
      { to: 4, label: 'fork() mất thời gian tỉ lệ page table (latest_fork_usec). Giải pháp: save "" trên master, để replica làm persistence' },
    ],
  },
},
{
  cat: 'Bộ nhớ',
  q: 'Các trường quan trọng trong `INFO memory`?',
  answer:
    '- `used_memory`: Redis nghĩ mình dùng (data + overhead nội bộ).\n' +
    '- `used_memory_rss`: RAM thực OS cấp cho tiến trình.\n' +
    '- `used_memory_peak`: đỉnh — hữu ích để sizing.\n' +
    '- `used_memory_lua` / `used_memory_scripts`: bộ nhớ script.\n' +
    '- `mem_fragmentation_ratio`.\n' +
    '- `maxmemory` / `maxmemory_policy`.\n' +
    '- `mem_clients_normal` / `mem_clients_slaves`: buffer output client (pub/sub chậm, replica lag → phình).\n' +
    '- `evicted_keys`, `keyspace_misses` (từ `INFO stats`).',
  essence:
    'Theo dõi `used_memory` vs `maxmemory` (còn headroom không), `mem_fragmentation_ratio` (lãng phí / swap), và `evicted_keys` (cache có đang bị ép dọn không).',
  example:
    'Alert: `used_memory / maxmemory > 0.9` → sắp evict/từ chối ghi. `evicted_keys` tăng nhanh + `keyspace_misses` tăng → cache quá nhỏ so với working set, tăng RAM hoặc rà soát TTL/big key.',
  viz: {
    type: 'tree',
    title: 'INFO memory — 3 nhóm cần theo dõi',
    root: {
      label: 'used_memory vs maxmemory · fragmentation · evicted_keys',
      children: [
        { label: 'used_memory / used_memory_rss / used_memory_peak', note: 'Redis nghĩ mình dùng / RAM thực OS cấp / đỉnh (sizing)' },
        { label: 'mem_fragmentation_ratio', note: 'lãng phí (>1.5) hoặc swap (<1.0)' },
        { label: 'mem_clients_normal / mem_clients_slaves', note: 'buffer output client — pub/sub chậm, replica lag → phình' },
        { label: 'evicted_keys, keyspace_misses', note: 'cache có đang bị ép dọn không' },
      ],
    },
  },
},
{
  cat: 'Latency',
  q: 'Những nguồn gây latency trong Redis và cách chẩn đoán?',
  answer:
    'Nguồn phổ biến:\n' +
    '- **Lệnh chậm O(N)** (`KEYS`, `HGETALL` key lớn, `SORT`) — chặn mọi client.\n' +
    '- **fork** cho save/rewrite — spike lúc `BGSAVE`.\n' +
    '- **AOF fsync** (`always`, hoặc đĩa chậm/đầy).\n' +
    '- **Swap** (RAM không đủ) — thảm hoạ.\n' +
    '- **Eviction** hàng loạt khi đầy RAM.\n' +
    '- **Network / client buffer** (pub/sub consumer chậm).\n\n' +
    'Chẩn đoán: `SLOWLOG GET`, `LATENCY DOCTOR`, `LATENCY HISTORY <event>`, `INFO` (latest_fork_usec, rdb_last_bgsave_status), `redis-cli --latency`.',
  essence:
    'Vì đơn luồng, latency của Redis = "lệnh đang chạy chặn bao lâu". Ba thủ phạm hàng đầu: lệnh O(N) lớn, fork lúc save, và fsync/đĩa. `LATENCY DOCTOR` chỉ thẳng nguyên nhân.',
  example:
    'p99 thỉnh thoảng vọt 300ms mỗi 5 phút: `LATENCY HISTORY fork` cho thấy đúng lúc `BGSAVE`. Chuyển persistence sang replica (`save ""` trên master) → spike biến mất. `SLOWLOG` phát hiện một `SMEMBERS` trên set 2M phần tử → sửa code.',
  viz: {
    type: 'tree',
    title: 'Nguồn latency (Redis đơn luồng: latency = lệnh đang chạy chặn bao lâu)',
    root: {
      label: 'Chẩn đoán: SLOWLOG GET, LATENCY DOCTOR, redis-cli --latency',
      children: [
        { label: 'Lệnh chậm O(N)', note: 'KEYS, HGETALL key lớn, SORT — chặn mọi client' },
        { label: 'fork cho save/rewrite', note: 'spike lúc BGSAVE' },
        { label: 'AOF fsync', note: 'always, hoặc đĩa chậm/đầy' },
        { label: 'Swap (RAM không đủ)', note: 'thảm hoạ' },
        { label: 'Eviction hàng loạt / client buffer (pub/sub chậm)' },
      ],
    },
  },
},
{
  cat: 'Persistence',
  q: 'Persistence tương tác với replication như thế nào?',
  answer:
    'Khi replica kết nối master lần đầu (hoặc cần full resync), master chạy `BGSAVE` tạo RDB, gửi cho replica, rồi stream các lệnh ghi tiếp theo từ **replication backlog buffer**.\n\n' +
    '- Nếu master **tắt persistence hoàn toàn**: nguy hiểm — master restart (crash + auto-restart) với dataset rỗng, rồi replica sync theo → **mất sạch dữ liệu toàn cụm**.\n' +
    '- Nên: giữ ít nhất RDB trên một node, hoặc `save`/AOF trên replica.\n\n' +
    'Partial resync: nếu replica rớt kết nối ngắn và backlog còn đủ (`repl-backlog-size`), chỉ gửi phần thiếu thay vì full RDB.',
  essence:
    'Replication dùng chính cơ chế RDB để bootstrap replica. Tắt persistence + auto-restart master = "master rỗng lan sang replica". Backlog đủ lớn giúp tránh full resync tốn kém khi mạng chập chờn.',
  example:
    'Master + 2 replica, tất cả `save ""` để tránh latency: master crash, systemd restart nó với dataset rỗng, hai replica sync theo → mất hết. Sửa: bật RDB nhẹ (`save 900 1`) hoặc chạy AOF trên replica, và tắt auto-restart master (để người quyết định).',
  viz: {
    type: 'flow',
    title: 'Persistence + replication',
    nodes: ['replica kết nối master (full resync)', 'master BGSAVE tạo RDB', 'gửi RDB cho replica', 'stream lệnh tiếp theo từ replication backlog'],
    steps: [
      { to: 1, label: 'replication dùng chính cơ chế RDB để bootstrap replica' },
      { to: 3, label: 'backlog đủ lớn (repl-backlog-size) → partial resync khi mạng chập chờn, tránh full RDB' },
      { to: 3, label: 'NGUY HIỂM: master tắt persistence + auto-restart → master rỗng lan sang replica → MẤT SẠCH toàn cụm' },
    ],
  },
},
{
  cat: 'Latency',
  q: 'SLOWLOG là gì và dùng thế nào?',
  answer:
    'SLOWLOG ghi lại các lệnh có **thời gian thực thi** (không tính I/O mạng) vượt `slowlog-log-slower-than` (micro giây, mặc định 10000 = 10ms). Giữ tối đa `slowlog-max-len` entry (128).\n\n' +
    '`SLOWLOG GET 10` → thấy timestamp, thời gian, lệnh + args, client. `SLOWLOG RESET` xoá.\n\n' +
    'Đặt ngưỡng thấp hơn (ví dụ 1000 = 1ms) tạm thời khi điều tra.',
  essence:
    'SLOWLOG là công cụ đầu tiên khi Redis "thỉnh thoảng chậm": nó chỉ ra chính xác lệnh nào (và từ client nào) tốn thời gian CPU trên server đơn luồng.',
  example:
    'User báo API lag lúc cao điểm: `SLOWLOG GET 20` cho thấy nhiều `LRANGE queue:jobs 0 -1` mất 40ms (list 200k phần tử). Sửa: đổi sang `LRANGE queue:jobs 0 99` + xử lý theo lô, hoặc chuyển sang Streams.',
  viz: {
    type: 'tree',
    title: 'SLOWLOG — công cụ đầu tiên khi Redis "thỉnh thoảng chậm"',
    root: {
      label: 'Chỉ ra chính xác lệnh nào (từ client nào) tốn CPU trên server đơn luồng',
      children: [
        { label: 'Ghi lệnh có thời gian thực thi > slowlog-log-slower-than', note: 'micro giây, mặc định 10000 = 10ms; không tính I/O mạng' },
        { label: 'SLOWLOG GET 10', note: 'timestamp, thời gian, lệnh + args, client' },
        { label: 'Đặt ngưỡng thấp hơn (1000 = 1ms) tạm thời khi điều tra' },
      ],
    },
  },
},
{
  cat: 'Sự kiện',
  q: 'Keyspace notifications trong Redis là gì? Lưu ý gì?',
  answer:
    'Bật `notify-keyspace-events` (ví dụ `Ex` cho expired events, `KEA` cho tất cả). Redis publish message pub/sub khi có sự kiện trên key: `__keyspace@0__:mykey` (sự kiện gì trên key này) và `__keyevent@0__:expired` (key nào vừa expired).\n\n' +
    'Lưu ý:\n' +
    '- Dựa trên **pub/sub** → **không đảm bảo delivery**: subscriber offline lúc event → mất.\n' +
    '- Event `expired` phát khi key **thực sự bị xoá** (lazy hoặc active), không phải đúng lúc TTL về 0 → có độ trễ.\n' +
    '- Tải cao: nhiều notification có thể tốn CPU.',
  essence:
    'Keyspace notifications hữu ích cho "phản ứng khi key thay đổi/hết hạn" nhưng là **best-effort** (pub/sub). Đừng dựa vào nó cho logic nghiệp vụ quan trọng — dùng Streams hoặc kiểm tra chủ động.',
  example:
    'Muốn xử lý khi session hết hạn: subscribe `__keyevent@0__:expired`, lọc key `session:*`. Rủi ro: nếu consumer restart, các session expired trong lúc đó bị bỏ sót. An toàn hơn: dùng ZSet với score = expireAt, worker quét định kỳ.',
  viz: {
    type: 'tree',
    title: 'Keyspace notifications — best-effort, đừng dựa cho logic quan trọng',
    root: {
      label: 'notify-keyspace-events (Ex cho expired, KEA cho tất cả)',
      children: [
        { label: '__keyspace@0__:mykey', note: 'sự kiện gì trên key này' },
        { label: '__keyevent@0__:expired', note: 'key nào vừa expired' },
        { label: 'Dựa trên pub/sub', note: 'KHÔNG đảm bảo delivery — subscriber offline → mất' },
        { label: 'Event expired có độ trễ', note: 'phát khi key THỰC SỰ bị xoá (lazy/active), không đúng lúc TTL về 0' },
      ],
    },
  },
},
{
  cat: 'Bộ nhớ',
  q: 'Client output buffer limit và slow consumer pub/sub?',
  answer:
    'Redis giữ một **output buffer** cho mỗi client (dữ liệu chờ gửi ra socket). Nếu client đọc chậm hơn tốc độ Redis gửi (đặc biệt pub/sub subscriber chậm, hoặc replica lag), buffer phình → tốn RAM.\n\n' +
    '`client-output-buffer-limit` đặt trần theo loại client (normal / replica / pubsub): `hard limit` (đóng client ngay khi vượt) và `soft limit` (đóng nếu vượt liên tục N giây).\n\n' +
    'Replica bị đóng vì buffer → phải full resync lại.',
  essence:
    'Một consumer/replica chậm có thể "kéo" RAM của Redis lên qua output buffer. Limit là van an toàn — thà cắt client chậm còn hơn để nó làm OOM cả server.',
  example:
    'Pub/sub channel phát 50k msg/s, một subscriber xử lý chậm (10k/s): buffer của nó phình vài trăm MB → chạm `pubsub hard limit` → Redis đóng kết nối subscriber đó. App phải reconnect và chấp nhận mất message trong lúc đó (bản chất pub/sub).',
  viz: {
    type: 'flow',
    title: 'Client output buffer limit — van an toàn',
    nodes: ['client đọc chậm hơn tốc độ Redis gửi', 'output buffer của client đó phình', 'chạm soft limit (N giây liên tục) hoặc hard limit', 'Redis đóng kết nối client đó'],
    steps: [
      { to: 1, label: 'đặc biệt pub/sub subscriber chậm hoặc replica lag' },
      { to: 3, label: 'client-output-buffer-limit theo loại: normal / replica / pubsub' },
      { to: 3, label: 'replica bị đóng vì buffer → phải full resync lại. Thà cắt client chậm còn hơn OOM cả server' },
    ],
  },
},
{
  cat: 'Persistence',
  q: 'Khi nào nên tắt persistence hoàn toàn?',
  answer:
    'Tắt cả RDB (`save ""`) và AOF (`appendonly no`) khi:\n' +
    '- Redis là **cache thuần**: mọi dữ liệu tái tạo được từ nguồn khác (DB, tính toán).\n' +
    '- Mất toàn bộ khi restart là chấp nhận được (cache lạnh rồi tự ấm).\n' +
    '- Cần loại bỏ hoàn toàn latency spike do fork/save và I/O đĩa.\n\n' +
    'Khi đó **phải** tắt auto-restart hoặc thiết kế để cache miss không làm sập DB (stampede protection), và không dùng replication kiểu master rỗng lan sang replica.',
  essence:
    'Persistence off = Redis nhanh nhất, ổn định latency nhất, nhưng dữ liệu là "dùng một lần". Chỉ hợp lệ khi Redis không phải nguồn sự thật của bất cứ thứ gì.',
  example:
    'Redis cache trước Postgres: `save ""`, `appendonly no`, `maxmemory-policy allkeys-lru`. Restart Redis lúc deploy → cache trống → nhờ có single-flight lock (Lua/lock key), chỉ một request mỗi key đi xuống DB để nạp lại, phần còn lại chờ.',
  viz: {
    type: 'tree',
    title: 'Khi nào tắt persistence hoàn toàn (save "", appendonly no)',
    root: {
      label: 'Hợp lệ khi Redis không phải nguồn sự thật của bất cứ thứ gì',
      children: [
        { label: 'Redis là cache thuần', note: 'mọi dữ liệu tái tạo được từ DB / tính toán' },
        { label: 'Mất toàn bộ khi restart chấp nhận được', note: 'cache lạnh rồi tự ấm lại' },
        { label: 'Cần loại bỏ latency spike do fork/save + I/O đĩa' },
        { label: 'Bắt buộc kèm', note: 'tắt auto-restart, stampede protection, không dùng replication master-rỗng' },
      ],
    },
  },
},
{
  cat: 'Latency',
  q: 'Vì sao Redis bị swap là thảm hoạ, và phòng tránh thế nào?',
  answer:
    'Redis giả định **mọi truy cập là RAM** (ns–µs). Nếu OS swap trang của Redis ra đĩa, một lệnh chạm trang đó phải chờ đọc đĩa (ms) — **trong lúc đó main thread bị chặn**, mọi client treo.\n\n' +
    'Phòng tránh:\n' +
    '- RAM vật lý ≥ `maxmemory` + headroom cho COW/buffer/OS (thường 1.5–2× dataset nếu có save).\n' +
    '- `vm.swappiness` thấp (1), hoặc không cấu hình swap trên node Redis.\n' +
    '- Đặt `maxmemory` để Redis tự evict/từ chối **trước khi** OS phải swap.\n' +
    '- Giám sát `used_memory_rss` và `mem_fragmentation_ratio < 1`.',
  essence:
    'Swap phá vỡ giả định nền tảng của Redis (tất cả trong RAM). Một page fault = cả server đứng hình vài ms. `maxmemory` đúng + đủ RAM vật lý là bắt buộc, không phải tuỳ chọn.',
  example:
    'Node 16GB, Redis không đặt `maxmemory`, dataset tăng tới 15GB + fork lúc save → OS swap → p99 nhảy từ 1ms lên 800ms. Sửa: `maxmemory 10gb` + `allkeys-lru`, tắt swap, hoặc nâng RAM/chuyển sang cluster.',
  viz: {
    type: 'flow',
    title: 'Vì sao swap là thảm hoạ',
    nodes: ['OS swap trang của Redis ra đĩa', 'một lệnh chạm trang đó', 'phải chờ đọc đĩa (ms)', 'main thread bị CHẶN → mọi client treo'],
    steps: [
      { to: 1, label: 'Redis giả định mọi truy cập là RAM (ns–µs)' },
      { to: 3, label: 'một page fault = cả server đứng hình vài ms' },
      { to: 3, label: 'phòng tránh: RAM vật lý ≥ maxmemory + headroom; vm.swappiness=1; đặt maxmemory để Redis tự evict TRƯỚC khi OS swap' },
    ],
  },
},
{
  cat: 'Bộ nhớ',
  q: 'Ước lượng bộ nhớ Redis cần cho một dataset?',
  answer:
    'Không chỉ là tổng kích thước value:\n' +
    '- Mỗi key có overhead (~50–90 byte: dict entry, robj, expire entry, con trỏ).\n' +
    '- Encoding: collection nhỏ (listpack/intset) tiết kiệm; lớn (hashtable/skiplist) tốn hơn.\n' +
    '- Fragmentation ~1.2–1.5×.\n' +
    '- Headroom cho COW lúc save, output buffer, replication backlog.\n\n' +
    'Cách chắc chắn: nạp dữ liệu mẫu thật, xem `INFO memory` + `MEMORY USAGE <key>`, rồi nhân theo tỉ lệ.',
  essence:
    'RAM thực tế ≈ (data + overhead per-key + fragmentation) × headroom. Nhiều key nhỏ → overhead per-key chiếm tỉ trọng lớn; gom vào hash giảm đáng kể.',
  example:
    '100 triệu key string 20 byte value: không phải 2GB mà ~8–10GB (mỗi key ~80–100 byte tổng). Gom thành 1 triệu hash mỗi cái 100 field → cùng dữ liệu nhưng ~3–4GB nhờ listpack + ít overhead key.',
  viz: {
    type: 'tree',
    title: 'Ước lượng RAM ≈ (data + overhead per-key + fragmentation) × headroom',
    root: {
      label: 'Không chỉ là tổng kích thước value',
      children: [
        { label: 'Overhead mỗi key ~50–90 byte', note: 'dict entry, robj, expire entry, con trỏ' },
        { label: 'Encoding', note: 'collection nhỏ (listpack/intset) tiết kiệm; lớn tốn hơn' },
        { label: 'Fragmentation ~1.2–1.5×' },
        { label: 'Headroom', note: 'COW lúc save, output buffer, replication backlog' },
        { label: 'Nhiều key nhỏ → gom vào hash giảm đáng kể' },
      ],
    },
  },
},
{
  cat: 'Bộ nhớ',
  q: '`DEL` và `UNLINK` khác nhau? Lazy freeing là gì?',
  answer:
    '`DEL key`: giải phóng bộ nhớ của key **đồng bộ** trên main thread. Với key lớn (hash/set 10M phần tử) → giải phóng từng phần tử mất hàng trăm ms → **chặn** server.\n\n' +
    '`UNLINK key`: gỡ key khỏi keyspace ngay (O(1) nhìn từ client), việc **giải phóng bộ nhớ** đẩy sang **thread nền** (bio). Không gây latency spike.\n\n' +
    'Các `lazyfree-*` config bật giải phóng nền tự động cho: eviction, expire, `FLUSHALL/DB`, ghi đè key. Redis 7 mặc định bật nhiều cái.',
  essence:
    'Xoá một key lớn tốn công bằng số phần tử. `UNLINK` (và lazyfree) tách "gỡ tên" khỏi "trả bộ nhớ", giữ main thread không bị chặn bởi việc dọn dẹp.',
  example:
    'Job dọn dẹp cuối ngày xoá ~50 key hash mỗi cái vài triệu field: dùng `DEL` → mỗi lệnh treo server ~200ms, p99 API tăng vọt. Đổi sang `UNLINK` → client nhận reply ngay, bộ nhớ được trả dần ở background.',
  viz: {
    type: 'compare',
    cols: ['DEL key', 'UNLINK key'],
    rows: [
      ['Giải phóng bộ nhớ', 'ĐỒNG BỘ trên main thread', 'đẩy sang thread nền (bio)'],
      ['Với key lớn (10M phần tử)', 'giải phóng từng phần tử → chặn server hàng trăm ms', 'client nhận reply ngay (O(1))'],
      ['lazyfree-* config', '—', 'bật giải phóng nền tự động cho eviction, expire, FLUSHALL, ghi đè'],
    ],
  },
},
{
  cat: 'Sự kiện',
  q: 'Blocking commands (`BLPOP`, `BRPOPLPUSH`, `WAIT`) hoạt động thế nào?',
  answer:
    '`BLPOP key timeout`: nếu list rỗng, **client bị block** (không phải server) tới khi có phần tử được `LPUSH`/`RPUSH` vào, hoặc hết timeout. Nhiều client chờ → phục vụ theo thứ tự FIFO.\n\n' +
    '`BLMOVE`/`BRPOPLPUSH`: pop từ list này, push sang list khác — "reliable queue" (giữ bản sao ở list "processing" tới khi xử lý xong).\n\n' +
    '`WAIT numreplicas timeout`: block client tới khi ghi trước đó được ack bởi N replica (hoặc timeout) — tăng độ an toàn write.',
  essence:
    'Blocking command để client "chờ có việc" mà không cần polling. Server vẫn phục vụ client khác bình thường — chỉ client gọi lệnh block là chờ.',
  example:
    'Worker queue: `BRPOPLPUSH queue:jobs queue:processing 5` — lấy job và đồng thời lưu vào "processing"; xử lý xong `LREM queue:processing 1 <job>`. Worker chết giữa chừng → job còn ở "processing", một job cron chuyển nó về `queue:jobs`.',
  viz: {
    type: 'tree',
    title: 'Blocking commands — client "chờ có việc" mà không cần polling',
    root: {
      label: 'CLIENT bị block (không phải server) — server vẫn phục vụ client khác',
      children: [
        { label: 'BLPOP key timeout', note: 'list rỗng → chờ tới khi có phần tử được push, hoặc hết timeout; nhiều client chờ → FIFO' },
        { label: 'BLMOVE / BRPOPLPUSH', note: 'pop list này, push list khác — "reliable queue" (bản sao ở "processing")' },
        { label: 'WAIT numreplicas timeout', note: 'block tới khi ghi trước đó được ack bởi N replica' },
      ],
    },
  },
},
]);
