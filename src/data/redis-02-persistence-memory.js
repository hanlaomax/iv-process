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
  demo: [
    {
      lang: "bash",
      title: "Ảnh chụp toàn bộ dataset tại một thời điểm",
      code:
        "# Cấu hình trong redis.conf: lưu khi đủ số thay đổi trong khoảng thời gian\n" +
        "#   save 900 1      # 900 giây mà có ít nhất 1 key đổi\n" +
        "#   save 300 10\n" +
        "#   save 60 10000\n" +
        "redis-cli CONFIG SET save \"900 1 300 10 60 10000\"\n" +
        "\n" +
        "# SAVE — chạy ĐỒNG BỘ trên thread chính -> CHẶN TOÀN BỘ server tới khi xong.\n" +
        "# TUYỆT ĐỐI không dùng ở production.\n" +
        "redis-cli SAVE\n" +
        "\n" +
        "# BGSAVE — fork tiến trình con, tiến trình con ghi file, tiến trình cha vẫn\n" +
        "# phục vụ bình thường. Đây là cách luôn dùng.\n" +
        "redis-cli BGSAVE\n" +
        "redis-cli LASTSAVE                        # timestamp lần lưu thành công cuối\n" +
        "redis-cli INFO persistence | grep rdb_\n" +
        "\n" +
        "# CHI PHÍ CỦA FORK — điểm quan trọng nhất phải hiểu:\n" +
        "#  - fork() dùng copy-on-write: ban đầu cha và con CHIA SẺ bộ nhớ\n" +
        "#  - nhưng mỗi trang bộ nhớ bị GHI trong lúc lưu sẽ được SAO CHÉP\n" +
        "#  - dataset 10GB với tỉ lệ ghi cao có thể tốn thêm vài GB RAM\n" +
        "#  - bản thân lời gọi fork() gây LATENCY SPIKE tỉ lệ với kích thước bộ nhớ\n" +
        "redis-cli INFO stats | grep latest_fork_usec    # fork gần nhất mất bao lâu\n" +
        "\n" +
        "# ƯU: file nhỏ gọn (nén), khôi phục NHANH, hợp làm backup và làm bản sao\n" +
        "# để dựng replica.\n" +
        "# NHƯỢC: MẤT DỮ LIỆU giữa hai lần snapshot (có thể tới vài phút).",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Ghi nhật ký mọi lệnh ghi",
      code:
        "redis-cli CONFIG SET appendonly yes\n" +
        "# AOF ghi lại từng lệnh GHI vào file. Khôi phục = phát lại toàn bộ lệnh.\n" +
        "\n" +
        "# BA MỨC appendfsync — đây là đánh đổi bền vững/hiệu năng cốt lõi:\n" +
        "redis-cli CONFIG SET appendfsync always      # fsync MỖI lệnh ghi\n" +
        "#   -> gần như không mất dữ liệu, nhưng CHẬM (mỗi ghi phải chờ đĩa)\n" +
        "redis-cli CONFIG SET appendfsync everysec    # fsync MỖI GIÂY — MẶC ĐỊNH\n" +
        "#   -> mất tối đa 1 giây dữ liệu; cân bằng tốt nhất, gần như luôn chọn cái này\n" +
        "redis-cli CONFIG SET appendfsync no          # để OS tự quyết (~30 giây)\n" +
        "#   -> nhanh nhất, mất nhiều nhất\n" +
        "\n" +
        "# AOF REWRITE — file AOF phình to (ghi 1 key 1000 lần = 1000 dòng).\n" +
        "# Rewrite viết lại file tối giản: chỉ đủ lệnh để dựng lại trạng thái HIỆN TẠI.\n" +
        "redis-cli BGREWRITEAOF\n" +
        "redis-cli CONFIG SET auto-aof-rewrite-percentage 100    # phình gấp đôi thì rewrite\n" +
        "redis-cli CONFIG SET auto-aof-rewrite-min-size 64mb\n" +
        "\n" +
        "# Redis 7 đổi sang MULTI-PART AOF: một file base (RDB) + nhiều file\n" +
        "# incremental trong thư mục appendonlydir/ -> rewrite an toàn và nhẹ hơn.\n" +
        "ls /var/lib/redis/appendonlydir/\n" +
        "\n" +
        "# ƯU: mất ít dữ liệu hơn RDB rất nhiều; file dạng text nên đọc/sửa được khi\n" +
        "# cần cứu dữ liệu (ví dụ xoá lệnh FLUSHALL vô tình).\n" +
        "# NHƯỢC: file lớn hơn, khôi phục CHẬM hơn (phải phát lại lệnh).",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Bật cả hai, và hiểu cái nào được dùng khi khởi động",
      code:
        "# BẬT CẢ HAI là cấu hình khuyến nghị cho production:\n" +
        "redis-cli CONFIG SET save \"900 1 300 10 60 10000\"\n" +
        "redis-cli CONFIG SET appendonly yes\n" +
        "redis-cli CONFIG SET appendfsync everysec\n" +
        "\n" +
        "# KHI KHỞI ĐỘNG LẠI: nếu AOF được bật, Redis dùng AOF (mới hơn RDB) và\n" +
        "# BỎ QUA file RDB. Đây là điểm rất hay gây mất dữ liệu:\n" +
        "#   bật appendonly yes lần đầu trên server ĐANG CHẠY -> AOF bắt đầu từ\n" +
        "#   trạng thái hiện tại (đúng), nhưng nếu SỬA CONFIG FILE rồi restart mà\n" +
        "#   AOF chưa có -> Redis khởi động với dataset RỖNG.\n" +
        "# -> Luôn bật bằng CONFIG SET trước, rồi mới ghi vào file config:\n" +
        "redis-cli CONFIG REWRITE\n" +
        "\n" +
        "# RDB-AOF HYBRID (mặc định từ Redis 4, nên bật):\n" +
        "redis-cli CONFIG SET aof-use-rdb-preamble yes\n" +
        "# File AOF bắt đầu bằng một RDB nén (khôi phục nhanh) rồi mới tới các lệnh\n" +
        "# ghi sau đó (mất ít dữ liệu) -> lấy ưu điểm của cả hai.\n" +
        "\n" +
        "# CHỌN THEO NHU CẦU:\n" +
        "#  - cache thuần, mất được -> TẮT cả hai (nhanh nhất)\n" +
        "#  - chấp nhận mất vài phút, cần khôi phục nhanh -> chỉ RDB\n" +
        "#  - cần mất ít nhất có thể -> AOF everysec (+ RDB để backup)\n" +
        "# Và nhớ: cả hai đều KHÔNG thay thế BACKUP RA NGOÀI MÁY.\n" +
        "redis-cli --rdb /backup/dump-$(date +%F).rdb    # lấy snapshot về máy khác",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Câu trả lời trung thực: KHÔNG, ở mức của database giao dịch",
      code:
        "# Redis có persistence, nhưng KHÔNG có độ bền như PostgreSQL/MySQL:\n" +
        "\n" +
        "# 1) appendfsync everysec (mặc định) -> mất tối đa 1 GIÂY dữ liệu khi mất điện.\n" +
        "#    Đặt always thì bền hơn nhưng throughput giảm rất mạnh.\n" +
        "\n" +
        "# 2) REPLICATION LÀ BẤT ĐỒNG BỘ. Master ack cho client TRƯỚC khi replica\n" +
        "#    nhận được. Master chết ngay sau đó -> dữ liệu đó MẤT dù có replica.\n" +
        "redis-cli WAIT 1 100      # chờ ít nhất 1 replica xác nhận, tối đa 100ms\n" +
        "# WAIT chỉ giảm rủi ro, KHÔNG phải cam kết như 2PC — vẫn có cửa sổ mất.\n" +
        "\n" +
        "# 3) Không có transaction có rollback. MULTI/EXEC nguyên tử nhưng lệnh lỗi\n" +
        "#    giữa chừng thì các lệnh khác vẫn chạy.\n" +
        "\n" +
        "# 4) Failover có thể MẤT ghi: replica được bầu làm master chưa chắc đã nhận\n" +
        "#    hết dữ liệu -> phần chênh lệch biến mất.\n" +
        "\n" +
        "# LÀM CHO BỀN HƠN (vẫn không bằng RDBMS):\n" +
        "redis-cli CONFIG SET appendfsync always\n" +
        "redis-cli CONFIG SET min-replicas-to-write 1     # từ chối ghi khi không đủ replica\n" +
        "redis-cli CONFIG SET min-replicas-max-lag 10\n" +
        "\n" +
        "# KẾT LUẬN THỰC DỤNG: coi Redis là CACHE và kho dữ liệu tạm/phái sinh.\n" +
        "# Dữ liệu là NGUỒN SỰ THẬT (tiền, đơn hàng) phải nằm ở database giao dịch;\n" +
        "# Redis giữ bản sao để đọc nhanh. Muốn Redis bền thật -> cân nhắc MemoryDB\n" +
        "# (AWS, ghi vào transaction log đa AZ trước khi ack).",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Không đặt maxmemory là lỗi cấu hình nghiêm trọng",
      code:
        "redis-cli CONFIG SET maxmemory 4gb\n" +
        "redis-cli CONFIG SET maxmemory-policy allkeys-lru\n" +
        "# Không đặt maxmemory -> Redis ăn hết RAM -> OS OOM killer giết tiến trình,\n" +
        "# hoặc tệ hơn là máy bắt đầu SWAP (xem câu riêng về swap).\n" +
        "# Quy tắc: đặt maxmemory khoảng 60-70% RAM của máy, chừa chỗ cho fork COW.\n" +
        "\n" +
        "# TÁM POLICY:\n" +
        "#  noeviction (MẶC ĐỊNH) — từ chối lệnh GHI khi đầy, đọc vẫn được.\n" +
        "#    Dùng khi Redis là kho dữ liệu, không phải cache. Ứng dụng PHẢI xử lý lỗi OOM.\n" +
        "#  allkeys-lru     — bỏ key ít dùng gần đây nhất, xét MỌI key. Cache thuần -> chọn cái này.\n" +
        "#  allkeys-lfu     — bỏ key ÍT ĐƯỢC DÙNG nhất (theo tần suất). Tốt hơn LRU khi\n" +
        "#                    có key nóng ổn định lẫn key quét một lần.\n" +
        "#  allkeys-random  — ngẫu nhiên; rẻ nhất về CPU, hiếm khi là lựa chọn tốt.\n" +
        "#  volatile-lru / volatile-lfu / volatile-random / volatile-ttl\n" +
        "#                  — CHỈ xét key CÓ TTL.\n" +
        "\n" +
        "# BẪY LỚN với volatile-*: nếu không key nào có TTL, Redis không có gì để bỏ\n" +
        "# -> hành xử như noeviction -> ghi bị từ chối dù policy là \"volatile-lru\".\n" +
        "\n" +
        "redis-cli INFO stats | grep evicted_keys        # có đang phải bỏ key không\n" +
        "redis-cli INFO memory | grep used_memory_human\n" +
        "# evicted_keys tăng liên tục = cache quá nhỏ so với working set\n" +
        "# -> tăng RAM, hoặc giảm dữ liệu, hoặc chấp nhận hit rate thấp hơn.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Gần đây vs thường xuyên",
      code:
        "# LRU (Least Recently Used) — bỏ key LÂU NHẤT chưa được dùng.\n" +
        "# Nhược điểm: một lần quét toàn bộ dữ liệu (job batch, crawler) sẽ ĐẨY hết\n" +
        "# key nóng ra khỏi cache, dù chúng được dùng hàng nghìn lần.\n" +
        "redis-cli CONFIG SET maxmemory-policy allkeys-lru\n" +
        "\n" +
        "# LFU (Least Frequently Used, Redis 4+) — bỏ key ÍT ĐƯỢC DÙNG NHẤT.\n" +
        "# Key được truy cập 10.000 lần sẽ sống sót qua một đợt quét một lần.\n" +
        "redis-cli CONFIG SET maxmemory-policy allkeys-lfu\n" +
        "redis-cli CONFIG SET lfu-log-factor 10       # counter tăng chậm dần (log)\n" +
        "redis-cli CONFIG SET lfu-decay-time 1        # counter GIẢM 1 mỗi phút không dùng\n" +
        "# lfu-decay-time rất quan trọng: không có nó, key từng nóng trong quá khứ\n" +
        "# sẽ chiếm chỗ vĩnh viễn dù giờ không ai dùng.\n" +
        "\n" +
        "# Redis dùng LRU/LFU XẤP XỈ, không phải chính xác: mỗi lần cần bỏ key,\n" +
        "# nó lấy mẫu ngẫu nhiên rồi chọn cái tệ nhất trong mẫu.\n" +
        "redis-cli CONFIG SET maxmemory-samples 5     # tăng lên 10 -> chính xác hơn, tốn CPU hơn\n" +
        "\n" +
        "redis-cli OBJECT FREQ mykey       # counter LFU (chỉ khi policy là lfu)\n" +
        "redis-cli OBJECT IDLETIME mykey   # giây không được dùng (chỉ khi policy là lru)\n" +
        "\n" +
        "# CHỌN LFU khi: có tập key NÓNG rõ rệt, và có job quét dữ liệu định kỳ.\n" +
        "# CHỌN LRU khi: mẫu truy cập thay đổi theo thời gian (dữ liệu theo phiên,\n" +
        "# nội dung mới thay nội dung cũ) — recency phản ánh đúng giá trị hơn.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Bộ nhớ OS cấp lớn hơn bộ nhớ Redis thật sự dùng",
      code:
        "redis-cli INFO memory\n" +
        "# used_memory                 — Redis nghĩ nó đang dùng bao nhiêu\n" +
        "# used_memory_rss             — OS thật sự cấp bao nhiêu\n" +
        "# mem_fragmentation_ratio     — rss / used_memory\n" +
        "\n" +
        "# ĐỌC TỈ LỆ NÀY:\n" +
        "#  ~1.0 - 1.5  -> bình thường, khoẻ mạnh\n" +
        "#  > 1.5       -> PHÂN MẢNH: cấp phát rồi giải phóng nhiều key kích thước\n" +
        "#                 khác nhau -> allocator giữ lại các khoảng trống không dùng được\n" +
        "#  < 1.0       -> NGUY HIỂM: một phần bộ nhớ đã bị SWAP ra đĩa\n" +
        "\n" +
        "# NGUYÊN NHÂN: xoá hàng loạt key, key có kích thước rất khác nhau,\n" +
        "# hoặc jemalloc giữ lại vùng nhớ để tái sử dụng.\n" +
        "\n" +
        "# CHỮA 1: defrag chủ động (Redis 4+, cần jemalloc — mặc định trên Linux)\n" +
        "redis-cli CONFIG SET activedefrag yes\n" +
        "redis-cli CONFIG SET active-defrag-ignore-bytes 100mb\n" +
        "redis-cli CONFIG SET active-defrag-threshold-lower 10     # bắt đầu ở 10% phân mảnh\n" +
        "redis-cli CONFIG SET active-defrag-threshold-upper 100\n" +
        "redis-cli CONFIG SET active-defrag-cycle-min 5            # % CPU tối đa cho defrag\n" +
        "redis-cli CONFIG SET active-defrag-cycle-max 25\n" +
        "\n" +
        "# CHỮA 2 (triệt để): restart instance. Với replica thì dễ — failover sang\n" +
        "# replica rồi restart master cũ.\n" +
        "\n" +
        "# PHÒNG: giữ kích thước key/value đồng đều hơn, tránh chu kỳ tạo-xoá hàng\n" +
        "# loạt key lớn, và luôn để maxmemory đủ xa so với RAM vật lý.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Hai vấn đề khác nhau, hai cách chữa khác nhau",
      code:
        "# BIG KEY — một key chứa quá nhiều dữ liệu (list 1 triệu phần tử, hash\n" +
        "# hàng trăm nghìn field, string vài trăm MB).\n" +
        "# Hậu quả: mọi thao tác trên nó là O(N) và CHẶN server; xoá nó cũng chặn;\n" +
        "# trong Cluster nó làm lệch phân bổ dữ liệu và cản trở migrate slot.\n" +
        "redis-cli --bigkeys                     # quét toàn bộ, an toàn (dùng SCAN)\n" +
        "redis-cli --memkeys                     # theo bộ nhớ thật\n" +
        "redis-cli MEMORY USAGE mykey\n" +
        "redis-cli DEBUG OBJECT mykey            # chỉ dùng ở môi trường test\n" +
        "\n" +
        "# CHỮA BIG KEY: chia nhỏ.\n" +
        "#   user:1:posts (1 triệu phần tử)\n" +
        "#   -> user:1:posts:0, user:1:posts:1, ... (theo id % 100)\n" +
        "# Và luôn dùng UNLINK thay DEL để xoá ở thread nền:\n" +
        "redis-cli UNLINK bigkey\n" +
        "\n" +
        "# HOT KEY — một key bị truy cập quá nhiều (ví dụ cấu hình toàn cục,\n" +
        "# sản phẩm đang flash sale). Nó làm một node/CPU quá tải trong khi\n" +
        "# phần còn lại rảnh; trong Cluster không cân bằng được bằng cách thêm node.\n" +
        "redis-cli --hotkeys                     # cần maxmemory-policy là lfu\n" +
        "redis-cli MONITOR | head -1000 | awk \u0027{print $4}\u0027 | sort | uniq -c | sort -rn | head\n" +
        "# (MONITOR làm chậm server — chỉ chạy vài giây)\n" +
        "\n" +
        "# CHỮA HOT KEY:\n" +
        "#  1) cache CỤC BỘ ở tầng ứng dụng (L1) với TTL ngắn -> phần lớn request\n" +
        "#     không chạm Redis nữa\n" +
        "#  2) NHÂN BẢN key thành N bản (hotkey:0..hotkey:9), client chọn ngẫu nhiên\n" +
        "#  3) đọc từ replica",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Vì sao BGSAVE có thể làm treo Redis vài trăm mili giây",
      code:
        "# BGSAVE/BGREWRITEAOF gọi fork(). Tiến trình con dùng COPY-ON-WRITE: ban đầu\n" +
        "# chia sẻ bộ nhớ với cha, chỉ sao chép trang nào bị GHI trong lúc lưu.\n" +
        "\n" +
        "# HAI VẤN ĐỀ:\n" +
        "# 1) BẢN THÂN fork() CHẶN — kernel phải sao chép bảng trang. Thời gian tỉ lệ\n" +
        "#    với kích thước bộ nhớ: ~10-20ms cho mỗi GB (tệ hơn nhiều trên máy ảo).\n" +
        "redis-cli INFO stats | grep latest_fork_usec       # microsecond\n" +
        "# Dataset 24GB có thể mất 300-500ms -> mọi request trong khoảng đó bị treo.\n" +
        "\n" +
        "# 2) BỘ NHỚ TĂNG VỌT — tỉ lệ ghi càng cao, càng nhiều trang bị sao chép.\n" +
        "#    Trường hợp xấu nhất tốn GẤP ĐÔI bộ nhớ. Đây là lý do maxmemory nên\n" +
        "#    để ở mức 60-70% RAM chứ không phải 90%.\n" +
        "\n" +
        "# GIẢM THIỂU:\n" +
        "#  - TẮT transparent huge pages (THP) — với THP, mỗi trang là 2MB thay vì 4KB\n" +
        "#    -> COW sao chép nhiều gấp 512 lần. Redis cảnh báo về việc này lúc khởi động.\n" +
        "echo never > /sys/kernel/mm/transparent_hugepage/enabled\n" +
        "#  - đặt vm.overcommit_memory = 1, nếu không fork có thể thất bại\n" +
        "sysctl -w vm.overcommit_memory=1\n" +
        "#  - chia dataset lớn thành nhiều instance nhỏ hơn\n" +
        "#  - chuyển việc lưu snapshot sang REPLICA, master không lưu gì:\n" +
        "#      trên master: save \"\" và appendonly no\n" +
        "#      trên replica: bật RDB/AOF bình thường\n" +
        "#  - dùng máy vật lý hoặc loại máy ảo có fork nhanh (EC2 Nitro tốt hơn Xen cũ)",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Đọc bộ nhớ Redis cho đúng",
      code:
        "redis-cli INFO memory\n" +
        "\n" +
        "# used_memory              — tổng bộ nhớ Redis cấp phát (dữ liệu + overhead)\n" +
        "# used_memory_rss          — OS thật sự cấp bao nhiêu (đây là con số để so với RAM máy)\n" +
        "# used_memory_peak         — ĐỈNH từ lúc khởi động. Nếu peak cao hơn hiện tại\n" +
        "#                            rất nhiều thì phân mảnh có thể do đợt đỉnh đó.\n" +
        "# used_memory_lua / used_memory_scripts — bộ nhớ cho script Lua\n" +
        "# used_memory_dataset      — phần THẬT SỰ là dữ liệu (used_memory trừ overhead)\n" +
        "# mem_fragmentation_ratio  — rss / used_memory (xem câu về phân mảnh)\n" +
        "# mem_allocator            — jemalloc / libc (jemalloc mới hỗ trợ defrag)\n" +
        "# maxmemory / maxmemory_policy\n" +
        "# mem_clients_normal       — buffer của client thường\n" +
        "# mem_clients_slaves       — buffer gửi cho replica; TĂNG VỌT nghĩa là replica\n" +
        "#                            đang tụt lại -> sắp bị ngắt kết nối\n" +
        "# mem_replication_backlog  — vùng đệm cho partial resync\n" +
        "\n" +
        "redis-cli MEMORY DOCTOR         # chẩn đoán tự động, gợi ý vấn đề\n" +
        "redis-cli MEMORY STATS          # chi tiết theo từng thành phần\n" +
        "redis-cli MEMORY USAGE key      # bộ nhớ của một key cụ thể\n" +
        "\n" +
        "# CÁI CẦN CẢNH BÁO:\n" +
        "#  used_memory / maxmemory > 80%      -> sắp phải evict\n" +
        "#  mem_fragmentation_ratio > 1.5      -> phân mảnh\n" +
        "#  mem_fragmentation_ratio < 1.0      -> ĐANG SWAP, xử lý ngay\n" +
        "#  mem_clients_slaves tăng bất thường -> replica chậm",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Danh sách nguyên nhân, xếp theo tần suất gặp",
      code:
        "# CÔNG CỤ ĐO\n" +
        "redis-cli --latency                    # độ trễ hiện tại (PING liên tục)\n" +
        "redis-cli --latency-history            # theo thời gian, thấy được đột biến\n" +
        "redis-cli --intrinsic-latency 100      # độ trễ NỘI TẠI của máy (không phải Redis)\n" +
        "redis-cli LATENCY RESET\n" +
        "redis-cli CONFIG SET latency-monitor-threshold 100    # ghi sự kiện > 100ms\n" +
        "redis-cli LATENCY LATEST\n" +
        "redis-cli LATENCY DOCTOR               # phân tích và gợi ý — bắt đầu từ đây\n" +
        "\n" +
        "# NGUYÊN NHÂN, theo thứ tự hay gặp:\n" +
        "# 1) LỆNH CHẬM (O(N) trên collection lớn) — nguyên nhân số một\n" +
        "redis-cli SLOWLOG GET 10\n" +
        "# 2) FORK khi BGSAVE/BGREWRITEAOF -> spike vài trăm ms (xem câu về COW)\n" +
        "redis-cli INFO stats | grep latest_fork_usec\n" +
        "# 3) SWAP — thảm hoạ, độ trễ nhảy từ micro giây lên mili giây\n" +
        "redis-cli INFO memory | grep fragmentation      # < 1.0 là dấu hiệu\n" +
        "# 4) AOF fsync=always, hoặc đĩa chậm\n" +
        "# 5) HẾT BỘ NHỚ -> evict liên tục, mỗi lần ghi phải bỏ nhiều key\n" +
        "# 6) XOÁ key lớn đồng bộ (DEL trên collection triệu phần tử) -> dùng UNLINK\n" +
        "# 7) Hàng loạt key HẾT HẠN cùng lúc -> active expire chạy dồn\n" +
        "# 8) Mạng: băng thông bão hoà, hoặc client dùng transparent huge pages\n" +
        "# 9) THIẾU PIPELINE ở client -> độ trễ do round-trip, không phải do Redis\n" +
        "\n" +
        "redis-cli INFO commandstats     # usec_per_call của từng lệnh -> tìm lệnh đắt\n" +
        "redis-cli INFO latencystats     # phân vị độ trễ theo lệnh (Redis 7+)",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Replica cần RDB để đồng bộ lần đầu",
      code:
        "# FULL RESYNC: master chạy BGSAVE tạo file RDB rồi gửi cho replica.\n" +
        "# -> Master TẮT persistence hoàn toàn vẫn PHẢI fork và tạo RDB khi có\n" +
        "#    replica đồng bộ lần đầu. Không tránh được chi phí fork.\n" +
        "\n" +
        "# DISKLESS REPLICATION — gửi thẳng RDB qua socket, KHÔNG ghi ra đĩa\n" +
        "redis-cli CONFIG SET repl-diskless-sync yes\n" +
        "redis-cli CONFIG SET repl-diskless-sync-delay 5     # chờ gom nhiều replica cùng lúc\n" +
        "# Rất hữu ích khi đĩa chậm (network storage) hoặc không muốn ghi đĩa.\n" +
        "redis-cli CONFIG SET repl-diskless-load swapdb      # phía replica: nạp thẳng từ socket\n" +
        "\n" +
        "# CẢNH BÁO NGUY HIỂM: replica TẮT persistence + có tự động restart\n" +
        "#   -> replica khởi động lại với dataset RỖNG\n" +
        "#   -> nó đồng bộ với master và... nếu master cũng vừa restart và đồng bộ\n" +
        "#      NGƯỢC lại (trong cấu hình Sentinel) thì dữ liệu bị XOÁ SẠCH.\n" +
        "# -> LUÔN bật ít nhất một dạng persistence, hoặc TẮT auto-restart.\n" +
        "\n" +
        "# Backlog cho partial resync — đặt đủ lớn để mạng chớp nháy không gây full resync:\n" +
        "redis-cli CONFIG SET repl-backlog-size 64mb\n" +
        "redis-cli CONFIG SET repl-backlog-ttl 3600\n" +
        "\n" +
        "# CHIẾN LƯỢC HAY DÙNG: master không lưu gì (save \"\", appendonly no) để tránh\n" +
        "# fork spike; replica bật đầy đủ RDB + AOF và làm nhiệm vụ backup.\n" +
        "redis-cli INFO replication",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Nhật ký lệnh chậm — công cụ chẩn đoán đầu tiên",
      code:
        "redis-cli CONFIG SET slowlog-log-slower-than 10000   # microsecond -> 10ms\n" +
        "redis-cli CONFIG SET slowlog-max-len 256             # giữ 256 mục gần nhất\n" +
        "redis-cli SLOWLOG GET 10\n" +
        "# Mỗi mục: id, timestamp, thời gian thực thi (microsecond), lệnh + tham số,\n" +
        "#          địa chỉ client, tên client\n" +
        "redis-cli SLOWLOG LEN\n" +
        "redis-cli SLOWLOG RESET\n" +
        "\n" +
        "# ĐIỂM QUAN TRỌNG PHẢI HIỂU: SLOWLOG chỉ đo THỜI GIAN THỰC THI LỆNH.\n" +
        "# Nó KHÔNG tính:\n" +
        "#  - thời gian chờ trong hàng đợi (lệnh trước đang chặn)\n" +
        "#  - thời gian truyền dữ liệu qua mạng\n" +
        "# -> Client báo chậm 500ms nhưng SLOWLOG trống là chuyện bình thường:\n" +
        "#    nguyên nhân nằm ở mạng, ở client, hoặc ở một lệnh chậm KHÁC đang chặn.\n" +
        "\n" +
        "# Đặt ngưỡng thấp khi đang điều tra (nhớ trả về sau):\n" +
        "redis-cli CONFIG SET slowlog-log-slower-than 1000    # 1ms\n" +
        "\n" +
        "# Xuất ra để theo dõi lâu dài — SLOWLOG là vòng đệm, mục cũ bị đẩy ra:\n" +
        "redis-cli SLOWLOG GET 128 > /var/log/redis-slowlog-$(date +%s).txt\n" +
        "\n" +
        "# Đi kèm SLOWLOG để có bức tranh đầy đủ:\n" +
        "redis-cli INFO commandstats     # tổng thời gian và usec trung bình MỖI LỆNH\n" +
        "                                # -> tìm lệnh chậm vừa phải nhưng gọi RẤT NHIỀU\n" +
        "redis-cli LATENCY DOCTOR",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Redis phát sự kiện khi key thay đổi",
      code:
        "# TẮT mặc định (tốn CPU). Bật bằng chuỗi ký tự chọn loại sự kiện:\n" +
        "redis-cli CONFIG SET notify-keyspace-events \"KEA\"\n" +
        "#  K = keyspace event (kênh __keyspace@0__:<key>, payload là TÊN LỆNH)\n" +
        "#  E = keyevent event (kênh __keyevent@0__:<lệnh>, payload là TÊN KEY)\n" +
        "#  A = mọi loại sự kiện (tương đương \"g$lshzxet\")\n" +
        "#  g=generic  $=string  l=list  s=set  h=hash  z=zset  x=expired  e=evicted\n" +
        "\n" +
        "redis-cli PSUBSCRIBE \u0027__keyevent@0__:expired\u0027    # nghe key hết hạn\n" +
        "redis-cli PSUBSCRIBE \u0027__keyspace@0__:user:*\u0027     # nghe thay đổi trên key cụ thể\n" +
        "\n" +
        "# LƯU Ý RẤT QUAN TRỌNG — vì sao KHÔNG nên dựa vào cho logic quan trọng:\n" +
        "# 1) Nó dùng PUB/SUB -> FIRE-AND-FORGET. Consumer offline lúc sự kiện xảy ra\n" +
        "#    là MẤT vĩnh viễn, không có cách nào lấy lại.\n" +
        "# 2) Sự kiện \"expired\" phát khi key BỊ XOÁ THẬT (lazy hoặc active expire),\n" +
        "#    có thể TRỄ HƠN thời điểm hết hạn rất nhiều.\n" +
        "# 3) Trong Cluster, sự kiện chỉ phát trên node chứa key -> phải subscribe\n" +
        "#    TẤT CẢ node.\n" +
        "# 4) Tốn CPU khi keyspace lớn và thay đổi nhiều.\n" +
        "\n" +
        "# THAY THẾ ĐÁNG TIN: dùng SORTED SET làm hàng đợi hẹn giờ\n" +
        "redis-cli ZADD scheduled:jobs 1757030400 \"job-1\"\n" +
        "redis-cli ZRANGEBYSCORE scheduled:jobs 0 $(date +%s) LIMIT 0 100\n" +
        "# -> worker chủ động poll, không mất việc khi restart, và phát lại được.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Client chậm có thể làm sập Redis",
      code:
        "# Redis đẩy dữ liệu vào buffer của từng client. Client đọc chậm -> buffer\n" +
        "# phình -> ăn hết RAM của server. Giới hạn buffer chính là lá chắn.\n" +
        "redis-cli CONFIG GET client-output-buffer-limit\n" +
        "# Định dạng: <loại> <hard limit> <soft limit> <soft seconds>\n" +
        "#   normal  0 0 0                 -> client thường: KHÔNG giới hạn (mặc định)\n" +
        "#   replica 256mb 64mb 60         -> vượt 256MB, hoặc trên 64MB liên tục 60s -> NGẮT\n" +
        "#   pubsub  32mb 8mb 60\n" +
        "\n" +
        "redis-cli CONFIG SET client-output-buffer-limit \"pubsub 64mb 16mb 60\"\n" +
        "\n" +
        "# BA TÌNH HUỐNG THỰC TẾ:\n" +
        "# 1) PUB/SUB consumer chậm — publisher bắn nhanh hơn subscriber xử lý.\n" +
        "#    Buffer đầy -> Redis NGẮT KẾT NỐI subscriber -> nó mất message và\n" +
        "#    phải subscribe lại. Đây là lý do pub/sub không dùng cho dữ liệu quan trọng.\n" +
        "# 2) REPLICA chậm — buffer vượt hạn -> ngắt -> replica phải FULL RESYNC ->\n" +
        "#    master fork lại -> tải tăng thêm -> vòng xoáy tệ hơn.\n" +
        "#    Triệu chứng: mem_clients_slaves tăng, replica liên tục resync.\n" +
        "# 3) Client chạy MONITOR hoặc lệnh trả về dữ liệu khổng lồ (KEYS *,\n" +
        "#    LRANGE 0 -1) mà đọc chậm -> normal không giới hạn -> có thể làm hết RAM.\n" +
        "#    -> Nên đặt giới hạn cho normal ở hệ thống có client không tin cậy.\n" +
        "\n" +
        "redis-cli CLIENT LIST                      # cột omem = bộ nhớ buffer của client\n" +
        "redis-cli CLIENT LIST | awk \u0027{print $1, $6, $17}\u0027 | sort -k3 -rn | head\n" +
        "redis-cli CLIENT KILL ID 42                # ngắt client đang gây vấn đề",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Tắt để lấy hiệu năng, và cái giá phải trả",
      code:
        "redis-cli CONFIG SET save \"\"              # tắt RDB\n" +
        "redis-cli CONFIG SET appendonly no        # tắt AOF\n" +
        "\n" +
        "# TẮT KHI:\n" +
        "#  1) Redis là CACHE THUẦN — mất dữ liệu chỉ làm cache nguội, dữ liệu gốc\n" +
        "#     vẫn ở database. Đây là trường hợp phổ biến nhất và hoàn toàn hợp lý.\n" +
        "#  2) Dữ liệu TÁI TẠO ĐƯỢC nhanh (bảng tra cứu, kết quả tính toán).\n" +
        "#  3) Session store mà đăng nhập lại được chấp nhận.\n" +
        "#  4) Cần độ trễ ổn định tuyệt đối — không muốn spike do fork.\n" +
        "#  5) Master trong cấu hình có replica: master không lưu, REPLICA lo persistence.\n" +
        "\n" +
        "# LỢI ÍCH: không fork -> không latency spike, không tốn thêm RAM cho COW,\n" +
        "# không tốn I/O đĩa, throughput cao hơn.\n" +
        "\n" +
        "# CÁI GIÁ VÀ CÁI BẪY CHẾT NGƯỜI:\n" +
        "#  - restart là MẤT SẠCH -> nếu database phía sau không chịu nổi lượt truy cập\n" +
        "#    khi cache rỗng thì đây là sự cố dây chuyền (cache avalanche).\n" +
        "#  - NGUY HIỂM NHẤT: master tắt persistence + auto-restart. Master restart với\n" +
        "#    dataset RỖNG, replica đồng bộ theo và XOÁ SẠCH dữ liệu của chính nó.\n" +
        "#    -> Nếu tắt persistence trên master thì PHẢI tắt auto-restart, hoặc\n" +
        "#       đảm bảo Sentinel promote replica trước khi master cũ quay lại.\n" +
        "\n" +
        "# TRUNG DUNG hợp lý: tắt AOF (tốn kém nhất), giữ RDB thưa để có điểm khôi phục:\n" +
        "redis-cli CONFIG SET save \"900 1\"",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "RAM là micro giây, swap là mili giây — chậm 1000 lần",
      code:
        "# Redis giả định MỌI truy cập bộ nhớ là tức thì. Một trang bị swap ra đĩa\n" +
        "# khiến lệnh đó phải chờ I/O — và vì Redis ĐƠN LUỒNG, cả server đứng chờ theo.\n" +
        "# Độ trễ nhảy từ ~100 micro giây lên hàng chục mili giây.\n" +
        "\n" +
        "# PHÁT HIỆN:\n" +
        "redis-cli INFO memory | grep fragmentation_ratio    # < 1.0 = đang bị swap\n" +
        "cat /proc/$(pgrep redis-server)/smaps | grep -i swap | awk \u0027{s+=$2} END {print s\" kB\"}\u0027\n" +
        "vmstat 1 5        # cột si/so khác 0 = đang swap in/out\n" +
        "\n" +
        "# PHÒNG TRÁNH:\n" +
        "# 1) Đặt maxmemory ở mức 60-70% RAM vật lý — chừa chỗ cho COW lúc fork,\n" +
        "#    cho buffer client và cho chính OS.\n" +
        "redis-cli CONFIG SET maxmemory 4gb        # trên máy 8GB\n" +
        "\n" +
        "# 2) Giảm xu hướng swap của kernel (KHÔNG nên tắt hẳn swap)\n" +
        "sysctl -w vm.swappiness=1\n" +
        "# swappiness=0 có thể khiến OOM killer ra tay sớm hơn -> 1 an toàn hơn.\n" +
        "\n" +
        "# 3) vm.overcommit_memory=1 để fork() không thất bại\n" +
        "sysctl -w vm.overcommit_memory=1\n" +
        "\n" +
        "# 4) TẮT transparent huge pages — gây cả latency lẫn tốn bộ nhớ khi COW\n" +
        "echo never > /sys/kernel/mm/transparent_hugepage/enabled\n" +
        "\n" +
        "# 5) Trong container: đặt memory limit và maxmemory KHỚP NHAU, và nhớ rằng\n" +
        "#    OOM killer của container sẽ giết Redis không báo trước.\n" +
        "\n" +
        "# 6) Theo dõi used_memory_rss so với RAM máy, cảnh báo ở 75%.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Đo thật thay vì tính lý thuyết",
      code:
        "# CÁCH ĐÁNG TIN NHẤT: nạp một MẪU rồi ngoại suy.\n" +
        "redis-cli INFO memory | grep used_memory:          # trước khi nạp\n" +
        "# nạp 10.000 bản ghi thật\n" +
        "redis-cli INFO memory | grep used_memory:          # sau khi nạp\n" +
        "# (sau - trước) / 10000 = bộ nhớ mỗi bản ghi, rồi nhân với số lượng thật.\n" +
        "\n" +
        "redis-cli MEMORY USAGE user:1                      # bộ nhớ một key cụ thể\n" +
        "redis-cli --bigkeys                                # phân bố kích thước\n" +
        "\n" +
        "# CÁC KHOẢN OVERHEAD hay bị quên:\n" +
        "#  - TÊN KEY: mỗi key tốn bộ nhớ cho chính chuỗi tên. 10 triệu key với tên\n" +
        "#    dài 40 byte = 400MB chỉ riêng tên.\n" +
        "#  - metadata mỗi key: ~50-100 byte (con trỏ dict, robj, TTL...)\n" +
        "#  - buffer client và replica\n" +
        "#  - copy-on-write lúc fork: dự phòng thêm 20-50%\n" +
        "#  - phân mảnh: nhân thêm ~1.2-1.5\n" +
        "\n" +
        "# CÔNG THỨC THÔ:\n" +
        "#   RAM cần = (dữ liệu đo được) x 1.3 (phân mảnh) x 1.5 (COW + buffer)\n" +
        "#           = khoảng gấp đôi dữ liệu thuần\n" +
        "# -> dataset 4GB thì nên có máy 8GB và đặt maxmemory 5-6GB.\n" +
        "\n" +
        "# GIẢM BỘ NHỚ:\n" +
        "#  - dùng Hash nhỏ dưới ngưỡng listpack thay vì nhiều String rời\n" +
        "#  - rút ngắn tên key (app:u:1 thay vì application:user:1)\n" +
        "#  - nén giá trị lớn ở phía client trước khi lưu\n" +
        "#  - dùng Bitmap/HyperLogLog cho bài toán đếm\n" +
        "redis-cli MEMORY DOCTOR",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Xoá đồng bộ vs xoá ở thread nền",
      code:
        "redis-cli DEL bigkey        # giải phóng bộ nhớ NGAY trên thread chính\n" +
        "# Với key nhỏ thì O(1), không sao. Nhưng với list 10 triệu phần tử thì đây\n" +
        "# là O(N) và CHẶN toàn bộ server trong lúc giải phóng từng phần tử.\n" +
        "\n" +
        "redis-cli UNLINK bigkey     # gỡ key khỏi keyspace NGAY (O(1)), việc giải phóng\n" +
        "                            # bộ nhớ đẩy sang THREAD NỀN -> không chặn\n" +
        "# Redis đủ thông minh: key nhỏ thì UNLINK vẫn xoá đồng bộ (rẻ hơn là đẩy\n" +
        "# sang thread khác). Nên UNLINK không bao giờ tệ hơn DEL.\n" +
        "# -> Mặc định nên dùng UNLINK.\n" +
        "\n" +
        "# LAZY FREEING — áp dụng cùng ý tưởng cho các tình huống xoá khác:\n" +
        "redis-cli CONFIG SET lazyfree-lazy-eviction yes    # khi evict vì hết bộ nhớ\n" +
        "redis-cli CONFIG SET lazyfree-lazy-expire yes      # khi key hết hạn\n" +
        "redis-cli CONFIG SET lazyfree-lazy-server-del yes  # khi lệnh ngầm xoá key cũ\n" +
        "                                                   # (ví dụ SET đè lên key lớn)\n" +
        "redis-cli CONFIG SET replica-lazy-flush yes        # khi replica xoá dataset\n" +
        "                                                   # trước lúc full resync\n" +
        "# Redis 7 bật sẵn phần lớn các tuỳ chọn này.\n" +
        "\n" +
        "# TƯƠNG TỰ với FLUSH:\n" +
        "redis-cli FLUSHALL ASYNC        # KHÔNG chặn\n" +
        "redis-cli FLUSHDB ASYNC\n" +
        "redis-cli FLUSHALL              # đồng bộ — có thể treo server rất lâu",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Chặn client, KHÔNG chặn server",
      code:
        "# Điểm quan trọng nhất: lệnh blocking chỉ treo CLIENT gọi nó. Redis đưa\n" +
        "# client vào danh sách chờ và tiếp tục phục vụ client khác bình thường.\n" +
        "# Nó KHÔNG mâu thuẫn với mô hình đơn luồng.\n" +
        "\n" +
        "redis-cli BLPOP queue:jobs 30          # chờ tối đa 30 giây; 0 = chờ vô hạn\n" +
        "redis-cli BRPOP queue:jobs 0\n" +
        "# Thay cho vòng lặp polling (LPOP + sleep) -> độ trễ gần như bằng 0 và\n" +
        "# không đốt CPU/băng thông cho những lần poll rỗng.\n" +
        "\n" +
        "# BLMOVE (thay cho BRPOPLPUSH đã deprecated) — hàng đợi TIN CẬY:\n" +
        "redis-cli BLMOVE queue:jobs queue:processing RIGHT LEFT 30\n" +
        "# Lấy job VÀ đặt vào danh sách \"đang xử lý\" trong MỘT thao tác nguyên tử.\n" +
        "# Consumer chết giữa chừng -> job vẫn nằm ở queue:processing, một job giám\n" +
        "# sát có thể đưa nó trở lại. Với BLPOP thuần thì job biến mất cùng consumer.\n" +
        "\n" +
        "redis-cli BZPOPMIN delayed:jobs 30     # chặn trên Sorted Set\n" +
        "redis-cli XREAD BLOCK 5000 STREAMS orders \u0027$\u0027   # chặn trên Stream\n" +
        "\n" +
        "# WAIT — chờ replica xác nhận đã nhận dữ liệu\n" +
        "redis-cli WAIT 1 100      # chờ >= 1 replica, tối đa 100ms; trả về số replica đã ack\n" +
        "# Giảm rủi ro mất dữ liệu khi failover, nhưng KHÔNG phải cam kết bền vững:\n" +
        "# nó chỉ xác nhận replica ĐÃ NHẬN, không đảm bảo đã ghi xuống đĩa.\n" +
        "\n" +
        "# CẠM BẪY:\n" +
        "#  - trong MULTI/EXEC và Lua, lệnh blocking KHÔNG chặn mà trả về ngay như\n" +
        "#    khi hết thời gian chờ\n" +
        "#  - mỗi client blocking chiếm một kết nối -> cần connection pool đủ lớn\n" +
        "#  - trong Cluster, BLPOP chỉ chặn trên node chứa key đó",
    },
  ],
},
]);
