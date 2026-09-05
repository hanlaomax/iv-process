SS.addQuestions('redis', [
{
  cat: 'Replication',
  id: 'redis-1v5u178',
  q: 'Replication trong Redis hoạt động thế nào? Có đảm bảo gì?',
  answer:
    'Một master, N replica. Replica gửi `REPLCONF` / `PSYNC`; master gửi RDB snapshot rồi **stream các lệnh ghi** tiếp theo (replication stream).\n\n' +
    'Replication là **bất đồng bộ**: master trả lời client **trước khi** replica nhận lệnh. Master chết đột ngột → các lệnh chưa kịp propagate bị **mất**.\n\n' +
    'Replica mặc định **read-only** (`replica-read-only yes`) → dùng để scale đọc. `replica-serve-stale-data` quyết định replica có phục vụ dữ liệu cũ khi mất kết nối master không.',
  essence:
    'Replication cho HA (có bản dự phòng) và scale đọc, nhưng **async** nên luôn có cửa sổ mất dữ liệu khi failover. Không phải cơ chế nhất quán mạnh.',
  example:
    'App đọc nặng: 1 master + 3 replica, client route write → master, read → replica (chấp nhận replica lag ~ms). Nếu vài read cần "vừa ghi vừa đọc" nhất quán → đọc từ master cho riêng chúng.',
  viz: {
    type: 'flow',
    title: 'Replication (bất đồng bộ)',
    nodes: ['replica PSYNC', 'master gửi RDB snapshot', 'master stream các lệnh ghi tiếp theo', 'master trả lời client TRƯỚC khi replica nhận'],
    steps: [
      { to: 2, label: 'replica mặc định read-only → scale đọc' },
      { to: 3, label: 'master chết đột ngột → lệnh chưa propagate bị MẤT — luôn có cửa sổ mất dữ liệu khi failover' },
      { to: 3, label: 'read cần "vừa ghi vừa đọc" nhất quán → đọc từ master' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Bất đồng bộ, và điều đó quyết định mọi thứ",
      code:
        "redis-cli -h replica-1 REPLICAOF master-host 6379    # biến thành replica\n" +
        "redis-cli -h replica-1 REPLICAOF NO ONE              # tách ra thành master độc lập\n" +
        "redis-cli INFO replication\n" +
        "\n" +
        "# LUỒNG: replica kết nối -> đồng bộ lần đầu (RDB) -> sau đó master ĐẨY\n" +
        "# liên tục mọi lệnh ghi qua replication stream.\n" +
        "\n" +
        "# ĐẢM BẢO — và quan trọng hơn là những gì KHÔNG đảm bảo:\n" +
        "#  - BẤT ĐỒNG BỘ: master trả OK cho client TRƯỚC khi replica nhận được.\n" +
        "#    Master chết ngay sau đó -> ghi đó MẤT dù có replica.\n" +
        "#  - replica MẶC ĐỊNH CHỈ ĐỌC (replica-read-only yes) — giữ nguyên.\n" +
        "#  - replica có thể trả dữ liệu CŨ (độ trễ thường vài mili giây, nhưng có\n" +
        "#    thể lớn khi mạng nghẽn hoặc replica đang bận).\n" +
        "#  - replica cũng có thể có replica (chuỗi) -> giảm tải cho master.\n" +
        "\n" +
        "redis-cli CONFIG SET repl-ping-replica-period 10\n" +
        "redis-cli CONFIG SET repl-timeout 60\n" +
        "redis-cli INFO replication | grep master_repl_offset   # so với slave offset -> độ trễ\n" +
        "\n" +
        "# GIẢM RỦI RO MẤT DỮ LIỆU:\n" +
        "redis-cli WAIT 1 100                 # chờ ít nhất 1 replica ack, tối đa 100ms\n" +
        "redis-cli CONFIG SET min-replicas-to-write 1\n" +
        "redis-cli CONFIG SET min-replicas-max-lag 10\n" +
        "# Vẫn KHÔNG phải cam kết tuyệt đối — chỉ thu hẹp cửa sổ mất mát.",
    },
  ],
},
{
  cat: 'Replication',
  id: 'redis-13hcjba',
  q: 'Full resync và partial resync khác nhau thế nào?',
  answer:
    'Master giữ một **replication backlog** (buffer vòng, `repl-backlog-size`, mặc định 1MB) chứa các lệnh gần nhất, và mỗi replica có một **replication offset**.\n\n' +
    '- **Partial resync**: replica rớt kết nối ngắn rồi nối lại; nếu offset của nó vẫn nằm trong backlog → master chỉ gửi phần **thiếu** → nhanh, nhẹ.\n' +
    '- **Full resync**: offset đã trôi ra khỏi backlog (mất kết nối lâu, hoặc backlog nhỏ, hoặc master restart / đổi replication id) → master phải `BGSAVE` gửi lại **toàn bộ RDB** → tốn CPU/mạng/đĩa, có thể gây latency spike.',
  essence:
    'Backlog đủ lớn = mạng chập chờn chỉ gây partial resync (rẻ). Backlog nhỏ = mỗi gián đoạn thành full resync (đắt). Tăng `repl-backlog-size` cho môi trường mạng không ổn định.',
  example:
    'Replica ở AZ khác, mạng thỉnh thoảng đứt 10s. Ghi ~5MB/s. Backlog 1MB → mỗi lần đứt = full resync (BGSAVE 20GB!). Tăng `repl-backlog-size 256mb` → các gián đoạn < ~50s chỉ partial resync.',
  viz: {
    type: 'compare',
    cols: ['Partial resync', 'Full resync'],
    rows: [
      ['Khi nào', 'rớt kết nối ngắn, offset vẫn trong backlog', 'offset trôi khỏi backlog / master restart / đổi replication id'],
      ['Master làm gì', 'chỉ gửi phần THIẾU', 'BGSAVE gửi lại TOÀN BỘ RDB'],
      ['Chi phí', 'nhanh, nhẹ', 'tốn CPU/mạng/đĩa, có thể latency spike'],
      ['Tối ưu', 'tăng repl-backlog-size cho mạng không ổn định', '—'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Backlog quyết định mất kết nối có gây full resync hay không",
      code:
        "# FULL RESYNC — đắt: master fork, tạo RDB, gửi toàn bộ dataset, replica\n" +
        "# XOÁ dữ liệu cũ rồi nạp lại. Với dataset lớn có thể mất nhiều phút và\n" +
        "# gây latency spike trên master.\n" +
        "# Xảy ra khi: replica kết nối LẦN ĐẦU, replication ID không khớp, hoặc\n" +
        "# offset cần thiết đã bị đẩy ra khỏi backlog.\n" +
        "\n" +
        "# PARTIAL RESYNC — rẻ: replica báo offset cuối cùng nó nhận được, master\n" +
        "# gửi tiếp phần còn thiếu từ REPLICATION BACKLOG (một vòng đệm trong RAM).\n" +
        "redis-cli CONFIG SET repl-backlog-size 128mb     # mặc định chỉ 1MB — QUÁ NHỎ\n" +
        "redis-cli CONFIG SET repl-backlog-ttl 3600\n" +
        "\n" +
        "# CÁCH TÍNH backlog: (thời gian mất kết nối tối đa) x (tốc độ ghi)\n" +
        "#   mạng chớp nháy 60 giây, ghi 2MB/s -> cần ít nhất 120MB.\n" +
        "# Backlog nhỏ là nguyên nhân số một của \"cứ mạng trục trặc là full resync\".\n" +
        "\n" +
        "redis-cli INFO stats | grep sync_\n" +
        "# sync_full           — số lần full resync (phải RẤT ít)\n" +
        "# sync_partial_ok     — partial thành công (mong muốn)\n" +
        "# sync_partial_err    — partial thất bại -> phải full -> tăng backlog\n" +
        "\n" +
        "# Redis 4+ có PSYNC2: replica giữ được replication ID sau khi RESTART và\n" +
        "# sau khi được promote -> giảm mạnh số lần full resync không cần thiết.\n" +
        "redis-cli INFO replication | grep -E \"master_replid|master_repl_offset\"",
    },
  ],
},
{
  cat: 'Sentinel',
  id: 'redis-1gi111n',
  q: 'Redis Sentinel làm gì? Quorum là gì?',
  answer:
    'Sentinel là các tiến trình giám sát (thường 3+, số lẻ) cho một cụm master-replica:\n' +
    '- **Monitoring**: ping master/replica, phát hiện chết.\n' +
    '- **Automatic failover**: master chết → bầu một replica lên master, cấu hình lại các replica còn lại trỏ vào master mới.\n' +
    '- **Configuration provider**: client hỏi Sentinel "master hiện tại ở đâu?" → tự cập nhật khi failover.\n' +
    '- **Notification**.\n\n' +
    '**Quorum**: số Sentinel tối thiểu phải đồng ý "master đã chết" (SDOWN → ODOWN) để **khởi động** failover. Sau đó việc **bầu** Sentinel leader thực hiện failover cần **đa số** (majority) trên tổng số Sentinel.',
  essence:
    'Sentinel = "tầng giám sát + failover tự động + service discovery" cho mô hình master-replica. Quorum chống một Sentinel đơn lẻ (bị phân vùng mạng) tự ý failover.',
  example:
    '3 Sentinel, `quorum 2`. Master thật sự chết → ≥ 2 Sentinel thấy ODOWN → bầu leader (cần 2/3) → leader promote replica khoẻ nhất → client hỏi Sentinel nhận endpoint mới. Toàn bộ ~vài chục giây.',
  viz: {
    type: 'tree',
    title: 'Redis Sentinel (thường 3+, số lẻ) cho mô hình master-replica',
    root: {
      label: 'Quorum chống một Sentinel đơn lẻ (bị phân vùng) tự ý failover',
      children: [
        { label: 'Monitoring', note: 'ping master/replica, phát hiện chết' },
        { label: 'Automatic failover', note: 'bầu replica lên master, cấu hình lại các replica còn lại' },
        { label: 'Configuration provider', note: 'client hỏi "master hiện tại ở đâu?"' },
        { label: 'Quorum', note: 'số Sentinel tối thiểu đồng ý "master chết" để KHỞI ĐỘNG failover; bầu leader cần majority' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Giám sát, thông báo, và tự động failover",
      code:
        "# Sentinel là tiến trình RIÊNG (không phải Redis instance) làm ba việc:\n" +
        "#  1) GIÁM SÁT master và replica\n" +
        "#  2) THÔNG BÁO khi có sự cố\n" +
        "#  3) TỰ ĐỘNG FAILOVER: promote replica lên master, cấu hình lại các replica khác\n" +
        "#  4) làm SERVICE DISCOVERY: client hỏi Sentinel \"master hiện tại là ai\"\n" +
        "\n" +
        "# sentinel.conf\n" +
        "#   sentinel monitor mymaster 10.0.1.10 6379 2      <- 2 là QUORUM\n" +
        "#   sentinel down-after-milliseconds mymaster 5000\n" +
        "#   sentinel failover-timeout mymaster 60000\n" +
        "#   sentinel parallel-syncs mymaster 1\n" +
        "\n" +
        "# QUORUM = số Sentinel tối thiểu phải ĐỒNG Ý rằng master đã chết thì mới\n" +
        "# bắt đầu quy trình failover.\n" +
        "# NHƯNG: để THỰC HIỆN failover còn cần ĐA SỐ Sentinel (majority) bầu ra một\n" +
        "# leader. Hai ngưỡng này KHÁC NHAU và hay bị nhầm.\n" +
        "#   3 Sentinel, quorum=2 -> cần 2 đồng ý để khởi động, và 2 (majority) để thực thi.\n" +
        "\n" +
        "# LUÔN DÙNG SỐ LẺ và ÍT NHẤT 3 Sentinel, đặt ở các máy/AZ KHÁC NHAU.\n" +
        "# 2 Sentinel là vô nghĩa: mất một cái là không còn majority.\n" +
        "\n" +
        "redis-cli -p 26379 SENTINEL masters\n" +
        "redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster\n" +
        "redis-cli -p 26379 SENTINEL failover mymaster        # ép failover thủ công\n" +
        "redis-cli -p 26379 SENTINEL reset mymaster",
    },
  ],
},
{
  cat: 'Sentinel',
  id: 'redis-swbhpg',
  q: 'Quy trình failover của Sentinel diễn ra thế nào?',
  answer:
    '1. Một Sentinel không nhận phản hồi từ master trong `down-after-milliseconds` → đánh dấu **SDOWN** (subjectively down).\n' +
    '2. Hỏi các Sentinel khác; nếu đủ **quorum** đồng ý → **ODOWN** (objectively down).\n' +
    '3. Các Sentinel bầu một **leader** (Raft-like, cần majority).\n' +
    '4. Leader chọn replica tốt nhất (ưu tiên: `replica-priority` cao, replication offset lớn nhất, run id nhỏ nhất).\n' +
    '5. `REPLICAOF NO ONE` trên replica được chọn → nó thành master.\n' +
    '6. Các replica khác `REPLICAOF <new master>`.\n' +
    '7. Cập nhật cấu hình, thông báo; client hỏi Sentinel lấy master mới.',
  essence:
    'Failover = phát hiện (SDOWN→ODOWN qua quorum) → bầu leader (majority) → promote replica đầy đủ nhất → reconfigure. Cửa sổ downtime + khả năng mất write chưa replicate.',
  example:
    '`down-after-milliseconds 5000`, master treo do GC 6s → Sentinel bắt đầu failover dù master "chưa chết hẳn" → khi master cũ tỉnh lại, Sentinel bắt nó thành replica của master mới. Đặt ngưỡng quá thấp → failover giả thường xuyên.',
  viz: {
    type: 'flow',
    title: 'Quy trình failover của Sentinel',
    nodes: ['SDOWN (một Sentinel không thấy master trong down-after-ms)', 'ODOWN (đủ quorum đồng ý)', 'bầu Sentinel leader (Raft-like, majority)', 'leader chọn replica tốt nhất', 'REPLICAOF NO ONE → thành master; replica khác REPLICAOF <new>'],
    steps: [
      { to: 3, label: 'ưu tiên: replica-priority cao, offset lớn nhất, run id nhỏ nhất' },
      { to: 4, label: 'cập nhật cấu hình, thông báo; client hỏi Sentinel lấy master mới' },
      { to: 4, label: 'cửa sổ downtime + khả năng mất write chưa replicate. Ngưỡng quá thấp → failover giả' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Sáu bước, và thời gian thực tế",
      code:
        "# 1) SDOWN (subjectively down): MỘT Sentinel không nhận được PONG trong\n" +
        "#    down-after-milliseconds -> nó CHO RẰNG master chết.\n" +
        "#   sentinel down-after-milliseconds mymaster 5000\n" +
        "\n" +
        "# 2) ODOWN (objectively down): đủ QUORUM Sentinel cùng báo SDOWN\n" +
        "#    -> tập thể xác nhận master đã chết.\n" +
        "\n" +
        "# 3) BẦU LEADER: các Sentinel bầu ra MỘT leader (thuật toán kiểu Raft),\n" +
        "#    cần ĐA SỐ. Chỉ leader mới được thực hiện failover -> tránh hai\n" +
        "#    Sentinel cùng promote hai replica khác nhau.\n" +
        "\n" +
        "# 4) CHỌN REPLICA để promote, theo thứ tự ưu tiên:\n" +
        "#    a) replica-priority thấp hơn thắng (0 = KHÔNG BAO GIỜ được promote)\n" +
        "#    b) replication offset LỚN HƠN thắng (dữ liệu mới hơn)\n" +
        "#    c) run ID nhỏ hơn (để quyết định tất định)\n" +
        "redis-cli CONFIG SET replica-priority 100\n" +
        "redis-cli CONFIG SET replica-priority 0      # replica dùng cho backup/analytics\n" +
        "\n" +
        "# 5) PROMOTE: gửi REPLICAOF NO ONE cho replica được chọn; các replica còn\n" +
        "#    lại được trỏ sang master mới (parallel-syncs kiểm soát số replica đồng\n" +
        "#    bộ cùng lúc — đặt 1 để không làm nghẽn master mới).\n" +
        "\n" +
        "# 6) THÔNG BÁO: Sentinel phát sự kiện qua Pub/Sub; client (Lettuce/Jedis)\n" +
        "#    lắng nghe và tự chuyển kết nối.\n" +
        "redis-cli -p 26379 PSUBSCRIBE \u0027*\u0027\n" +
        "\n" +
        "# THỜI GIAN THỰC TẾ: down-after (5s) + bầu leader (~1s) + promote (~1s)\n" +
        "#   ≈ 7-10 giây không ghi được. Master cũ sống lại sẽ tự thành replica.\n" +
        "# MẤT DỮ LIỆU: phần master đã ack nhưng chưa kịp sao chép -> mất.",
    },
  ],
},
{
  cat: 'Cluster',
  diagram: 'redis-cluster-slots',
  id: 'redis-130mop2',
  q: 'Redis Cluster: 16384 hash slot và sharding?',
  answer:
    'Cluster chia keyspace thành **16384 slot**. `slot = CRC16(key) % 16384`. Mỗi master node sở hữu một dải slot; key thuộc slot nào thì nằm ở node đó.\n\n' +
    'Client (cluster-aware) biết bản đồ slot→node, gửi lệnh thẳng tới node đúng. Node nhận key không thuộc nó → trả **`MOVED <slot> <node>`** (bản đồ đổi) hoặc **`ASK`** (đang migrate slot).\n\n' +
    'Mỗi master có thể có replica; mất master → replica lên thay (cluster tự failover, không cần Sentinel).',
  essence:
    'Cluster = sharding tự động theo slot + HA tích hợp. 16384 slot là "đơn vị di chuyển" khi thêm/bớt node — bạn reshard bằng cách chuyển slot giữa các node.',
  example:
    'Cụm 3 master (slot 0–5460, 5461–10922, 10923–16383) + 3 replica. Thêm master thứ 4: chạy reshard chuyển ~4096 slot (và dữ liệu của chúng) từ 3 node cũ sang node mới. Client tự cập nhật bản đồ qua `MOVED`.',
  demo: [
    {
      lang: "bash",
      title: "Dữ liệu chia theo slot, không theo node",
      code:
        "# Redis Cluster chia keyspace thành 16384 SLOT cố định.\n" +
        "#   slot = CRC16(key) mod 16384\n" +
        "# Mỗi node phụ trách một dải slot. Thêm/bớt node = DI CHUYỂN SLOT giữa các\n" +
        "# node, không phải rehash toàn bộ key (đó là ưu điểm lớn so với hash thường).\n" +
        "\n" +
        "redis-cli --cluster create \\\n" +
        "  10.0.1.1:6379 10.0.1.2:6379 10.0.1.3:6379 \\\n" +
        "  10.0.1.4:6379 10.0.1.5:6379 10.0.1.6:6379 \\\n" +
        "  --cluster-replicas 1                       # 3 master + 3 replica\n" +
        "\n" +
        "redis-cli -c -h 10.0.1.1 CLUSTER INFO        # -c: tự đi theo redirect\n" +
        "redis-cli CLUSTER SLOTS\n" +
        "redis-cli CLUSTER SHARDS                     # Redis 7+\n" +
        "redis-cli CLUSTER KEYSLOT \"user:1001\"        # key này thuộc slot nào\n" +
        "redis-cli CLUSTER COUNTKEYSINSLOT 866\n" +
        "\n" +
        "# VÌ SAO 16384 chứ không phải 65536: mỗi node phải trao đổi bitmap slot\n" +
        "# trong gói tin gossip. 16384 bit = 2KB, đủ nhỏ để gửi thường xuyên;\n" +
        "# và cụm Redis hiếm khi vượt ~1000 node nên độ mịn này là đủ.\n" +
        "\n" +
        "# GIỚI HẠN QUAN TRỌNG: chỉ có DATABASE 0 (không dùng được SELECT).\n" +
        "# Và lệnh nhiều key chỉ chạy khi mọi key cùng một slot (xem câu về hash tag).\n" +
        "redis-cli --cluster check 10.0.1.1:6379",
    },
  ],
},
{
  cat: 'Cluster',
  id: 'redis-m7smn0',
  q: 'MOVED và ASK redirect khác nhau thế nào?',
  answer:
    '- **MOVED `<slot> <ip:port>`**: slot đã **thuộc hẳn** node khác. Client cập nhật bản đồ slot của mình và gửi lại tới node đúng. Xảy ra sau reshard.\n' +
    '- **ASK `<slot> <ip:port>`**: slot đang **trong quá trình migrate**. Một số key đã chuyển sang node đích. Client gửi `ASKING` + lệnh tới node đích **chỉ cho request này**, **không** cập nhật bản đồ (vì migrate chưa xong).\n\n' +
    'Client "dumb" (không cluster-aware) sẽ liên tục bị redirect và chậm — bắt buộc dùng cluster client.',
  essence:
    'MOVED = "đổi vĩnh viễn, cập nhật cache đi". ASK = "tạm thời cho lệnh này, đừng cache". Đây là cách Cluster reshard **online** mà không dừng dịch vụ.',
  example:
    'Đang migrate slot 8000 từ node A sang B. Key `foo` (slot 8000) chưa chuyển → ở A. Key `bar` (slot 8000) đã chuyển → A trả `ASK ... B` → client `ASKING; GET bar` tới B. Xong migrate → A trả `MOVED` cho cả hai.',
  viz: {
    type: 'compare',
    cols: ['MOVED <slot> <ip:port>', 'ASK <slot> <ip:port>'],
    rows: [
      ['Nghĩa', 'slot đã THUỘC HẲN node khác', 'slot đang TRONG quá trình migrate'],
      ['Client làm gì', 'cập nhật bản đồ slot + gửi lại tới node đúng', 'ASKING + lệnh tới node đích CHỈ cho request này, KHÔNG cache'],
      ['Xảy ra sau', 'reshard xong', 'một số key đã chuyển, migrate chưa xong'],
      ['Client "dumb"', 'liên tục bị redirect và chậm — bắt buộc cluster client', '—'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Chuyển hướng vĩnh viễn vs tạm thời",
      code:
        "# Client gửi lệnh tới node KHÔNG giữ slot đó -> node trả về redirect.\n" +
        "\n" +
        "# MOVED — slot ĐÃ THUỘC node khác một cách ỔN ĐỊNH.\n" +
        "#   (error) MOVED 866 10.0.1.2:6379\n" +
        "# -> Client phải CẬP NHẬT BẢN ĐỒ SLOT của mình rồi gửi lại. Các lệnh sau\n" +
        "#    đi thẳng tới đúng node, không redirect nữa.\n" +
        "\n" +
        "# ASK — slot đang trong quá trình DI CHUYỂN, và key CỤ THỂ này đã sang\n" +
        "# node đích rồi (nhưng slot chưa chuyển xong).\n" +
        "#   (error) ASK 866 10.0.1.3:6379\n" +
        "# -> Client gửi lệnh ASKING rồi gửi lại lệnh tới node đích, và KHÔNG\n" +
        "#    cập nhật bản đồ slot (vì việc di chuyển chưa xong).\n" +
        "\n" +
        "redis-cli -c -h 10.0.1.1 GET user:1001    # -c làm việc redirect tự động\n" +
        "# -> Redirected to slot [866] located at 10.0.1.2:6379\n" +
        "\n" +
        "# Ý NGHĨA THỰC TẾ: MOVED nghĩa là bản đồ slot của client đã cũ — nếu thấy\n" +
        "# MOVED liên tục thì client đang không cache bản đồ đúng cách (mỗi lệnh\n" +
        "# tốn hai round-trip -> chậm gấp đôi).\n" +
        "# ASK xuất hiện chỉ trong lúc reshard và sẽ hết sau đó.\n" +
        "\n" +
        "# Mọi client tốt (Lettuce, Jedis Cluster, go-redis) đều xử lý cả hai tự động\n" +
        "# và giữ bản đồ slot trong bộ nhớ. Tự viết client là chỗ dễ sai nhất.",
    },
  ],
},
{
  cat: 'Cluster',
  id: 'redis-t2dmvp',
  q: 'Multi-key operation trong Cluster và hash tag `{}`?',
  answer:
    'Lệnh đa key (`MGET`, `SINTER`, `MULTI` với nhiều key, Lua với nhiều `KEYS`) chỉ hoạt động nếu **tất cả key thuộc cùng một slot** — nếu không → `CROSSSLOT` error.\n\n' +
    '**Hash tag**: nếu key chứa `{...}`, chỉ phần trong ngoặc được hash. `user:{1000}:profile` và `user:{1000}:cart` → cùng slot → dùng chung được trong lệnh đa key / transaction / Lua.',
  essence:
    'Cluster hy sinh khả năng thao tác đa key tuỳ ý để có sharding. Hash tag là cách chủ động **gom các key liên quan vào cùng slot** khi bạn cần thao tác chúng cùng nhau.',
  example:
    'Cần `MULTI` cập nhật `order:{42}:status` và `order:{42}:items` nguyên tử → hash tag `{42}` đảm bảo cùng slot. Nhưng cẩn thận: mọi thứ của order 42 dồn một node → nếu order 42 là "khủng" thì tạo hot slot.',
  viz: {
    type: 'flow',
    title: 'Multi-key trong Cluster + hash tag {}',
    nodes: ['lệnh đa key (MGET, SINTER, MULTI, Lua)', 'tất cả key cùng slot? → OK', 'khác slot → CROSSSLOT error', 'hash tag: user:{1000}:profile + user:{1000}:cart → cùng slot'],
    steps: [
      { to: 2, label: 'Cluster hy sinh thao tác đa key tuỳ ý để có sharding' },
      { to: 3, label: 'chỉ phần trong {} được hash → chủ động gom key liên quan vào cùng slot' },
      { to: 3, label: 'cẩn thận: mọi thứ của order 42 dồn một node → nếu "khủng" thì hot slot' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Lệnh nhiều key chỉ chạy khi cùng slot",
      code:
        "redis-cli -c MGET user:1 user:2\n" +
        "# (error) CROSSSLOT Keys in request don\u0027t hash to the same slot\n" +
        "# Lý do: hai key thuộc hai slot khác nhau, có thể nằm trên hai node khác nhau.\n" +
        "# Redis KHÔNG làm giao dịch phân tán -> từ chối thẳng.\n" +
        "\n" +
        "# HASH TAG: chỉ phần TRONG {} được dùng để tính slot\n" +
        "redis-cli SET \"user:{1001}:profile\" \"...\"\n" +
        "redis-cli SET \"user:{1001}:sessions\" \"...\"\n" +
        "redis-cli SET \"user:{1001}:cart\" \"...\"\n" +
        "redis-cli CLUSTER KEYSLOT \"user:{1001}:profile\"    # cùng slot với hai key kia\n" +
        "redis-cli -c MGET \"user:{1001}:profile\" \"user:{1001}:cart\"    # chạy được\n" +
        "\n" +
        "# Áp dụng cho: MGET/MSET, SINTER/SUNION, ZUNIONSTORE, MULTI/EXEC,\n" +
        "# script Lua nhiều key, BLPOP nhiều key.\n" +
        "\n" +
        "# ĐÁNH ĐỔI PHẢI HIỂU: mọi key có cùng hash tag đều nằm TRÊN CÙNG MỘT NODE.\n" +
        "#  - dùng tag quá rộng (ví dụ {tenant-lớn}) -> một node ôm hết dữ liệu\n" +
        "#    -> lệch tải nghiêm trọng và không scale được nữa\n" +
        "#  - dùng tag quá hẹp -> lại không gom được key cần thao tác chung\n" +
        "# -> Chọn tag ở mức THỰC THỂ (user id, order id), không ở mức nhóm lớn.\n" +
        "\n" +
        "# Lua trong Cluster: mọi key PHẢI truyền qua KEYS[] và phải cùng slot.\n" +
        "redis-cli --cluster call 10.0.1.1:6379 DBSIZE     # chạy lệnh trên MỌI node",
    },
  ],
},
{
  cat: 'Cluster',
  id: 'redis-jsnuw0',
  q: 'Reshard / slot migration trong Cluster diễn ra thế nào?',
  answer:
    'Thêm node → chạy `redis-cli --cluster reshard`. Với mỗi slot chuyển:\n' +
    '1. Đánh dấu slot `IMPORTING` ở node đích, `MIGRATING` ở node nguồn.\n' +
    '2. Lặp: `CLUSTER GETKEYSINSLOT` lấy key trong slot → `MIGRATE` từng key (hoặc lô) sang đích.\n' +
    '3. Trong lúc này: key chưa chuyển → nguồn phục vụ; key đã chuyển → nguồn trả `ASK` sang đích.\n' +
    '4. Xong toàn bộ slot → `CLUSTER SETSLOT ... NODE <đích>` trên mọi node → chuyển sang `MOVED`.\n\n' +
    'Online, không downtime, nhưng tốn CPU/mạng — dùng `--pipeline` và giới hạn tốc độ.',
  essence:
    'Reshard là di chuyển key theo từng slot, với `ASK`/`MOVED` che giấu quá trình cho client. Big key trong slot đang migrate có thể chặn (`MIGRATE` một key lớn là đồng bộ).',
  example:
    'Cụm quá tải, thêm 2 node: reshard chuyển 1/3 số slot sang node mới vào giờ thấp điểm, theo dõi latency. Một hash key 5M field trong slot đang migrate → `MIGRATE` nó treo vài trăm ms → nên xử lý big key trước khi reshard.',
  viz: {
    type: 'flow',
    title: 'Reshard / slot migration (online, không downtime)',
    nodes: ['đánh dấu slot IMPORTING (đích) + MIGRATING (nguồn)', 'CLUSTER GETKEYSINSLOT → MIGRATE từng key/lô sang đích', 'trong lúc này: key chưa chuyển → nguồn; key đã chuyển → nguồn trả ASK', 'xong slot → CLUSTER SETSLOT ... NODE <đích> → chuyển sang MOVED'],
    steps: [
      { to: 1, label: 'ASK/MOVED che giấu quá trình cho client' },
      { to: 3, label: 'tốn CPU/mạng — dùng --pipeline và giới hạn tốc độ' },
      { to: 3, label: 'big key trong slot đang migrate → MIGRATE nó ĐỒNG BỘ, treo → xử lý big key trước' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Di chuyển slot mà không ngừng phục vụ",
      code:
        "# Thêm node mới (ban đầu nó KHÔNG có slot nào -> chưa phục vụ gì)\n" +
        "redis-cli --cluster add-node 10.0.1.7:6379 10.0.1.1:6379\n" +
        "\n" +
        "# Chuyển slot sang node mới\n" +
        "redis-cli --cluster reshard 10.0.1.1:6379 \\\n" +
        "  --cluster-from <node-id-nguồn> --cluster-to <node-id-đích> \\\n" +
        "  --cluster-slots 1000 --cluster-yes\n" +
        "\n" +
        "# Cân bằng lại toàn cụm tự động\n" +
        "redis-cli --cluster rebalance 10.0.1.1:6379 --cluster-use-empty-masters\n" +
        "\n" +
        "# QUY TRÌNH BÊN TRONG cho MỖI slot:\n" +
        "#  1) đích: CLUSTER SETSLOT <slot> IMPORTING <node-nguồn>\n" +
        "#  2) nguồn: CLUSTER SETSLOT <slot> MIGRATING <node-đích>\n" +
        "#  3) lặp: CLUSTER GETKEYSINSLOT -> MIGRATE từng lô key sang đích\n" +
        "#  4) trong lúc đó: key CHƯA chuyển -> phục vụ bình thường ở nguồn;\n" +
        "#     key ĐÃ chuyển -> nguồn trả về ASK redirect\n" +
        "#  5) xong: CLUSTER SETSLOT <slot> NODE <node-đích> trên MỌI node\n" +
        "\n" +
        "# -> Cụm VẪN PHỤC VỤ trong suốt quá trình. Đây là ưu điểm lớn của mô hình slot.\n" +
        "\n" +
        "# LƯU Ý:\n" +
        "#  - BIG KEY làm chậm migrate rất nhiều (MIGRATE một key lớn là thao tác\n" +
        "#    CHẶN cả hai node) -> dọn big key trước khi reshard\n" +
        "#  - reshard tốn băng thông và CPU -> làm ngoài giờ cao điểm\n" +
        "#  - xoá node: phải reshard hết slot đi trước, rồi mới del-node\n" +
        "redis-cli --cluster del-node 10.0.1.1:6379 <node-id>",
    },
  ],
},
{
  cat: 'Cluster',
  id: 'redis-ezxmht',
  q: 'Redis Cluster vs Sentinel — chọn cái nào?',
  answer:
    '- **Sentinel**: một master giữ **toàn bộ** dataset + replica; Sentinel lo failover. Dùng khi: dataset **vừa với RAM một node**, chỉ cần HA + scale đọc, muốn đơn giản, cần thao tác đa key tự do.\n' +
    '- **Cluster**: sharding dataset qua nhiều master + HA tích hợp. Dùng khi: dataset **vượt RAM một node**, cần scale ghi/throughput vượt một node. Đổi lại: hạn chế multi-key (cùng slot), client phức tạp hơn, vận hành khó hơn.',
  essence:
    'Sentinel = "một Redis lớn có dự phòng". Cluster = "nhiều Redis chia dữ liệu". Chọn Cluster khi bị chặn bởi RAM hoặc throughput ghi của một node — nếu không, Sentinel đơn giản hơn nhiều.',
  example:
    'Cache 40GB, ghi 50k ops/s: một node r6g.2xlarge (64GB) + Sentinel + 2 replica là đủ, đơn giản. Cache 500GB hoặc ghi 500k ops/s: bắt buộc Cluster ~8–12 shard.',
  viz: {
    type: 'compare',
    cols: ['Sentinel', 'Cluster'],
    rows: [
      ['Dataset', 'một master giữ TOÀN BỘ (vừa RAM một node)', 'sharding qua nhiều master (vượt RAM một node)'],
      ['Scale', 'HA + scale đọc', 'scale cả ghi/throughput/dung lượng'],
      ['Multi-key', 'tự do', 'chỉ cùng slot (hash tag)'],
      ['Chọn Cluster khi', '—', 'bị chặn bởi RAM hoặc throughput ghi của một node'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Sharding hay chỉ cần tính sẵn sàng",
      code:
        "# SENTINEL: MỘT master giữ TOÀN BỘ dữ liệu + replica + tự động failover.\n" +
        "#  + đơn giản, hỗ trợ MỌI lệnh (kể cả multi-key, transaction, Lua tuỳ ý)\n" +
        "#  + dùng được nhiều database (SELECT)\n" +
        "#  + client cũ chỉ cần biết địa chỉ Sentinel\n" +
        "#  - dataset bị giới hạn bởi RAM của MỘT máy\n" +
        "#  - throughput ghi bị giới hạn bởi MỘT master (một core)\n" +
        "\n" +
        "# CLUSTER: dữ liệu CHIA cho nhiều master, mỗi master có replica.\n" +
        "#  + scale ngang cả dung lượng lẫn throughput\n" +
        "#  + failover TỰ ĐỘNG, không cần tiến trình riêng\n" +
        "#  - lệnh multi-key bị giới hạn theo slot (cần hash tag)\n" +
        "#  - chỉ database 0\n" +
        "#  - client phải hỗ trợ cluster\n" +
        "#  - vận hành phức tạp hơn (reshard, gossip, nhiều node hơn)\n" +
        "\n" +
        "# CHỌN:\n" +
        "#  - dataset dưới ~25GB và ghi chưa chạm trần một core -> SENTINEL.\n" +
        "#    Đơn giản hơn nhiều và ít thứ có thể hỏng.\n" +
        "#  - dataset lớn hơn RAM một máy, hoặc cần throughput ghi cao -> CLUSTER.\n" +
        "#  - dùng managed (ElastiCache/MemoryDB): cluster mode disabled tương đương\n" +
        "#    Sentinel, enabled tương đương Cluster — chuyển đổi được nhưng tốn công.\n" +
        "\n" +
        "# LỜI KHUYÊN THỰC DỤNG: đừng bắt đầu bằng Cluster nếu chưa cần. Rất nhiều\n" +
        "# hệ thống chạy Cluster chỉ vì \"nghe có vẻ đúng\" rồi phải sống với ràng buộc\n" +
        "# multi-key mà không nhận được lợi ích gì.",
    },
  ],
},
{
  cat: 'Replication',
  id: 'redis-7jnifk',
  q: '`min-replicas-to-write` bảo vệ dữ liệu thế nào?',
  answer:
    '`min-replicas-to-write N` + `min-replicas-max-lag M`: master **từ chối ghi** nếu có ít hơn N replica kết nối với lag ≤ M giây.\n\n' +
    'Mục đích: nếu master bị cô lập (mất hết replica), thay vì tiếp tục nhận write (sẽ mất khi failover), master **dừng nhận write** → giảm lượng dữ liệu có thể mất.\n\n' +
    'Đánh đổi: giảm availability (mất replica = mất khả năng ghi) để tăng "an toàn write".',
  essence:
    'Đây là "quorum ghi nghèo" cho Redis: chỉ ghi khi dữ liệu có cơ hội tồn tại ở ≥ N nơi. Chọn cấu hình này khi mất write đau hơn là mất khả năng ghi tạm thời.',
  example:
    '`min-replicas-to-write 1`, `min-replicas-max-lag 10`: master + 2 replica. Cả 2 replica mất kết nối → master ngừng nhận write (client nhận lỗi) → không tích luỹ write sẽ bị mất khi Sentinel failover sang một replica cũ.',
  viz: {
    type: 'flow',
    title: 'min-replicas-to-write — "quorum ghi nghèo"',
    nodes: ['master + N replica', 'số replica kết nối (lag ≤ M) < min-replicas-to-write?', 'master TỪ CHỐI ghi (client nhận lỗi)', 'giảm lượng dữ liệu có thể mất khi failover'],
    steps: [
      { to: 1, label: 'master bị cô lập (mất hết replica)' },
      { to: 2, label: 'thay vì tiếp tục nhận write (sẽ mất khi failover), master DỪNG nhận write' },
      { to: 3, label: 'đánh đổi: giảm availability để tăng an toàn write' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Từ chối ghi khi không đủ replica khoẻ",
      code:
        "redis-cli CONFIG SET min-replicas-to-write 1\n" +
        "redis-cli CONFIG SET min-replicas-max-lag 10\n" +
        "# Master TỪ CHỐI mọi lệnh GHI khi không có ít nhất 1 replica có độ trễ\n" +
        "# dưới 10 giây. Client nhận lỗi:\n" +
        "#   (error) NOREPLICAS Not enough good replicas to write.\n" +
        "\n" +
        "# VÌ SAO CẦN: không có nó, master bị cô lập mạng (partition) vẫn NHẬN GHI\n" +
        "# bình thường. Trong lúc đó Sentinel đã promote một replica ở phía bên kia\n" +
        "# -> hai master cùng nhận ghi -> khi mạng hồi phục, master cũ bị hạ cấp\n" +
        "# thành replica và TOÀN BỘ dữ liệu nó nhận trong khoảng đó BỊ XOÁ.\n" +
        "\n" +
        "# Với cấu hình trên, master bị cô lập sẽ tự NGỪNG nhận ghi sau ~10 giây\n" +
        "# -> giới hạn lượng dữ liệu có thể mất.\n" +
        "\n" +
        "# ĐÁNH ĐỔI: đây là chọn NHẤT QUÁN thay vì SẴN SÀNG (bên C của CAP).\n" +
        "# Replica chết vì lý do khác (bảo trì, restart) cũng làm master ngừng ghi.\n" +
        "# -> Đặt min-replicas-to-write=1 với 2 replica là cân bằng hợp lý:\n" +
        "#    mất một replica vẫn ghi được, mất cả hai thì dừng.\n" +
        "\n" +
        "redis-cli INFO replication | grep connected_slaves\n" +
        "redis-cli INFO replication | grep -E \"slave[0-9]+:.*lag\"\n" +
        "\n" +
        "# Tương đương trong Cluster: cluster-require-full-coverage (xem câu riêng).",
    },
  ],
},
{
  cat: 'Sự cố',
  id: 'redis-smt9sg',
  q: 'Split-brain trong Redis (Sentinel/Cluster) và hậu quả?',
  answer:
    'Phân vùng mạng chia cụm: minority side vẫn có master cũ (client phía đó ghi vào), majority side promote master mới (client phía kia ghi vào). Khi mạng liền lại → master cũ bị hạ xuống replica và **đồng bộ theo master mới** → **mọi write vào master cũ trong lúc phân vùng bị mất**.\n\n' +
    'Giảm thiểu:\n' +
    '- `min-replicas-to-write` → master cũ (mất replica) tự ngừng nhận write.\n' +
    '- Cluster: `cluster-node-timeout` + master ở minority (không đủ replica/không liên lạc majority) tự chuyển sang trạng thái không phục vụ.\n' +
    '- Số node lẻ, đặt trải AZ hợp lý.',
  essence:
    'Redis ưu tiên availability nên split-brain có thể xảy ra và write ở phía "thua" bị mất. `min-replicas-to-write` là chốt chính để phía bị cô lập tự im lặng.',
  example:
    'Cụm 3 AZ, AZ chứa master bị cô lập. Không có `min-replicas-to-write`: app trong AZ đó tiếp tục ghi 30s → majority promote master mới → mạng hồi → 30s write đó biến mất. Có `min-replicas-to-write 1`: master cũ ngừng ghi ngay khi mất replica.',
  viz: {
    type: 'flow',
    title: 'Split-brain — write phía "thua" bị mất',
    nodes: ['phân vùng mạng chia cụm', 'minority: master cũ vẫn nhận write', 'majority: promote master mới, nhận write', 'mạng liền lại', 'master cũ → replica, đồng bộ theo master mới → MỌI write vào master cũ trong phân vùng bị MẤT'],
    steps: [
      { to: 2, label: 'Redis ưu tiên availability nên split-brain có thể xảy ra' },
      { to: 4, label: 'giảm thiểu: min-replicas-to-write → master cũ (mất replica) tự ngừng nhận write' },
      { to: 4, label: 'Cluster: master minority không liên lạc majority tự chuyển sang không phục vụ' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hai master cùng nhận ghi, và dữ liệu biến mất",
      code:
        "# KỊCH BẢN: mạng chia đôi. Master M nằm một bên; Sentinel ở bên kia không\n" +
        "# thấy M -> promote replica R thành master. Client bên phía M vẫn ghi vào M,\n" +
        "# client bên kia ghi vào R.\n" +
        "# Mạng hồi phục -> Sentinel bắt M làm replica của R -> M XOÁ dataset của\n" +
        "# mình và đồng bộ từ R -> MỌI GHI vào M trong khoảng đó BIẾN MẤT.\n" +
        "\n" +
        "# CHỐNG (Sentinel):\n" +
        "redis-cli CONFIG SET min-replicas-to-write 1     # M bị cô lập sẽ ngừng nhận ghi\n" +
        "redis-cli CONFIG SET min-replicas-max-lag 10\n" +
        "# Số Sentinel LẺ và >= 3, đặt ở các AZ khác nhau -> phía thiểu số không\n" +
        "# bao giờ đạt majority để promote.\n" +
        "\n" +
        "# CHỐNG (Cluster):\n" +
        "#   cluster-node-timeout 15000\n" +
        "# Master bị đa số node coi là chết -> nó tự chuyển sang trạng thái lỗi và\n" +
        "# NGỪNG nhận lệnh. Cơ chế này có sẵn, không cần cấu hình thêm.\n" +
        "redis-cli CLUSTER INFO | grep cluster_state\n" +
        "\n" +
        "# ĐIỀU CẦN CHẤP NHẬN: Redis KHÔNG có consensus cho dữ liệu (không như\n" +
        "# etcd/ZooKeeper). Replication bất đồng bộ nghĩa là LUÔN có khả năng mất\n" +
        "# một khoảng ghi khi failover. Các cấu hình trên chỉ GIỚI HẠN thiệt hại.\n" +
        "# Cần đảm bảo tuyệt đối -> dùng database có consensus (hoặc AWS MemoryDB,\n" +
        "# ghi vào transaction log đa AZ trước khi ack).",
    },
  ],
},
{
  cat: 'Client',
  id: 'redis-n7b1mw',
  q: 'Client cần xử lý gì khi Redis failover?',
  answer:
    '- **Cluster-aware / Sentinel-aware client**: tự lấy topology, cập nhật khi `MOVED` / khi Sentinel báo master đổi.\n' +
    '- **Retry với backoff**: trong failover có vài giây lệnh fail (`CLUSTERDOWN`, connection refused, `MOVED`) → retry (idempotent) hoặc trả lỗi có kiểm soát.\n' +
    '- **Connection pool** đủ và có health check; đóng connection tới node cũ.\n' +
    '- **Timeout ngắn** cho lệnh Redis (đừng để một lệnh treo 30s khi node chết).\n' +
    '- Không cache endpoint master lâu dài — luôn qua Sentinel/cluster discovery.',
  essence:
    'Failover là chuyện thường; client phải coi "Redis tạm không phản hồi vài giây" là trạng thái bình thường và phục hồi mượt, không phải một sự cố cần con người.',
  example:
    'Lettuce (Java) với `RedisClusterClient` + `ClusterTopologyRefreshOptions.enablePeriodicRefresh(30s)` + `enableAllAdaptiveRefreshTriggers()` → tự bắt `MOVED`/failover, retry, cập nhật topology. App chỉ thấy vài request chậm hơn trong ~5s.',
  viz: {
    type: 'tree',
    title: 'Client xử lý failover — coi "Redis tạm không phản hồi vài giây" là bình thường',
    root: {
      label: 'Failover là chuyện thường, không phải sự cố cần con người',
      children: [
        { label: 'Cluster-aware / Sentinel-aware client', note: 'tự lấy topology, cập nhật khi MOVED / Sentinel báo master đổi' },
        { label: 'Retry với backoff', note: 'CLUSTERDOWN, connection refused, MOVED → retry (idempotent)' },
        { label: 'Connection pool + health check', note: 'đóng connection tới node cũ' },
        { label: 'Timeout NGẮN cho lệnh Redis', note: 'đừng để lệnh treo 30s khi node chết' },
        { label: 'Không cache endpoint master lâu dài' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Cấu hình client để failover không thành sự cố",
      code:
        "// 1) KẾT NỐI QUA SENTINEL, không phải qua IP master trực tiếp\n" +
        "@Bean\n" +
        "public LettuceConnectionFactory connectionFactory() {\n" +
        "    RedisSentinelConfiguration sentinel = new RedisSentinelConfiguration()\n" +
        "            .master(\"mymaster\")\n" +
        "            .sentinel(\"sentinel-1\", 26379)\n" +
        "            .sentinel(\"sentinel-2\", 26379)\n" +
        "            .sentinel(\"sentinel-3\", 26379);\n" +
        "\n" +
        "    LettuceClientConfiguration cfg = LettuceClientConfiguration.builder()\n" +
        "            .commandTimeout(Duration.ofSeconds(2))       // ĐỪNG để mặc định quá dài\n" +
        "            .clientOptions(ClientOptions.builder()\n" +
        "                    .autoReconnect(true)\n" +
        "                    .disconnectedBehavior(DisconnectedBehavior.REJECT_COMMANDS)\n" +
        "                    // REJECT: lỗi NGAY thay vì xếp hàng chờ -> tránh dồn ứ request\n" +
        "                    .socketOptions(SocketOptions.builder()\n" +
        "                            .connectTimeout(Duration.ofSeconds(1)).build())\n" +
        "                    .build())\n" +
        "            .build();\n" +
        "    return new LettuceConnectionFactory(sentinel, cfg);\n" +
        "}\n" +
        "\n" +
        "// 2) RETRY có backoff cho lỗi tạm thời — failover mất ~10 giây\n" +
        "@Retryable(retryFor = RedisConnectionFailureException.class,\n" +
        "           maxAttempts = 3, backoff = @Backoff(delay = 500, multiplier = 2))\n" +
        "public Product get(String id) { ... }\n" +
        "\n" +
        "// 3) FALLBACK: Redis chết thì đọc thẳng DB, đừng để cả hệ thống sập theo\n" +
        "@CircuitBreaker(name = \"redis\", fallbackMethod = \"fromDb\")\n" +
        "public Product cached(String id) { ... }\n" +
        "public Product fromDb(String id, Throwable t) { return repository.findById(id).orElseThrow(); }\n" +
        "\n" +
        "// 4) Trong Cluster: client tự làm mới bản đồ slot khi gặp MOVED\n" +
        "//    ClusterClientOptions.builder().topologyRefreshOptions(\n" +
        "//        ClusterTopologyRefreshOptions.builder()\n" +
        "//            .enableAllAdaptiveRefreshTriggers()\n" +
        "//            .enablePeriodicRefresh(Duration.ofSeconds(30)).build())",
    },
  ],
},
{
  cat: 'Replication',
  id: 'redis-vqlwi6',
  q: '`WAIT` command làm gì và giới hạn?',
  answer:
    '`WAIT numreplicas timeout`: block client tới khi các lệnh ghi **trước đó** của connection này được **ack bởi ít nhất `numreplicas` replica**, hoặc hết `timeout` (ms). Trả về số replica đã ack.\n\n' +
    'Tăng độ an toàn: sau `SET critical ...`, gọi `WAIT 1 100` → chỉ tiếp tục nếu ít nhất 1 replica đã có.\n\n' +
    'Giới hạn: **không phải** quorum thật (không ngăn được split-brain hoàn toàn); thêm latency; nếu timeout thì bạn không biết chắc trạng thái (có thể đã replicate sau đó).',
  essence:
    '`WAIT` cho phép "ghi bán đồng bộ" theo từng lệnh khi cần — đánh đổi latency lấy giảm khả năng mất write. Không biến Redis thành hệ nhất quán mạnh.',
  example:
    'Ghi token thu hồi (không được mất): `SET revoked:{jti} 1 EX 3600` rồi `WAIT 1 200`. Nếu `WAIT` trả 0 (không replica nào ack trong 200ms) → coi thao tác chưa an toàn, retry hoặc ghi vào DB thay thế.',
  viz: {
    type: 'flow',
    title: 'WAIT numreplicas timeout — "ghi bán đồng bộ" theo từng lệnh',
    nodes: ['SET critical ...', 'WAIT 1 100', 'block tới khi ≥ 1 replica ack các lệnh ghi trước đó, hoặc timeout', 'trả về SỐ replica đã ack'],
    steps: [
      { to: 2, label: 'đánh đổi latency lấy giảm khả năng mất write' },
      { to: 3, label: 'KHÔNG phải quorum thật (không ngăn split-brain hoàn toàn)' },
      { to: 3, label: 'timeout → không biết chắc trạng thái (có thể đã replicate sau đó)' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Chờ replica xác nhận, nhưng không phải cam kết bền vững",
      code:
        "redis-cli SET critical:key \"value\"\n" +
        "redis-cli WAIT 1 100\n" +
        "# Chờ ít nhất 1 replica xác nhận đã NHẬN mọi lệnh ghi trước đó, tối đa 100ms.\n" +
        "# Trả về SỐ replica đã ack (có thể ÍT HƠN số yêu cầu nếu hết thời gian).\n" +
        "\n" +
        "# CÁCH DÙNG ĐÚNG: kiểm tra giá trị trả về\n" +
        "#   long acked = redis.execute(conn -> conn.wait(1, 100));\n" +
        "#   if (acked < 1) { /* chưa an toàn -> ghi log, cảnh báo, hoặc thử lại */ }\n" +
        "\n" +
        "# GIỚI HẠN PHẢI HIỂU RÕ:\n" +
        "# 1) Chỉ xác nhận replica ĐÃ NHẬN vào bộ nhớ, KHÔNG đảm bảo đã fsync xuống\n" +
        "#    đĩa. Mất điện đồng thời vẫn mất.\n" +
        "# 2) KHÔNG phải two-phase commit: ghi đã xảy ra trên master rồi. WAIT chỉ\n" +
        "#    cho biết mức độ nhân bản, không huỷ được ghi nếu không đủ replica.\n" +
        "# 3) LÀM CHẬM đáng kể — mỗi WAIT là một vòng chờ mạng. Đừng gọi sau mọi lệnh ghi;\n" +
        "#    chỉ dùng cho những ghi THẬT SỰ quan trọng.\n" +
        "# 4) Trong Cluster, WAIT chỉ áp dụng cho shard hiện tại.\n" +
        "\n" +
        "# Redis 7.0 thêm WAITAOF — chờ fsync AOF, đảm bảo mạnh hơn:\n" +
        "redis-cli WAITAOF 1 1 100     # 1 local fsync, 1 replica fsync, timeout 100ms\n" +
        "\n" +
        "# THỰC TẾ: WAIT là công cụ giảm rủi ro, không phải cơ chế bền vững.\n" +
        "# Dữ liệu không được phép mất thì nguồn sự thật phải là database giao dịch.",
    },
  ],
},
{
  cat: 'Scale',
  id: 'redis-1fal9b0',
  q: 'Scale Redis: vertical, read replica, hay cluster?',
  answer:
    '1. **Vertical** (node lớn hơn): đơn giản nhất; giới hạn bởi RAM/CPU máy lớn nhất. Redis đơn luồng nên CPU nhanh hơn > nhiều core.\n' +
    '2. **Read replica**: scale **đọc** (route read sang replica). Không giúp write, không giúp nếu dataset không vừa RAM.\n' +
    '3. **Cluster**: scale cả **write, throughput và dung lượng** bằng sharding. Cần khi bị chặn bởi RAM một node hoặc write ops của một node.\n' +
    '4. **App-level sharding**: tự chia key sang nhiều Redis độc lập — kiểm soát cao nhưng tự quản mọi thứ.',
  essence:
    'Đi theo thứ tự: to hơn → thêm replica cho đọc → cluster khi chạm trần RAM/write của một node. Đừng nhảy thẳng vào Cluster nếu chưa cần — nó thêm nhiều ràng buộc.',
  example:
    'Cache tăng từ 10GB → 30GB → 200GB: giai đoạn 1–2 chỉ cần node lớn hơn + 2 replica. Khi vượt ~100–150GB (hoặc write > ~100k/s), chuyển sang Cluster 6–10 shard.',
  viz: {
    type: 'layers',
    title: 'Scale Redis — đi theo thứ tự, đừng nhảy thẳng vào Cluster',
    layers: [
      { name: 'Vertical (node lớn hơn)', tag: 'đầu tiên', note: 'đơn giản nhất; Redis đơn luồng → CPU nhanh hơn > nhiều core' },
      { name: 'Read replica', note: 'scale ĐỌC; không giúp write, không giúp nếu dataset không vừa RAM' },
      { name: 'Cluster (sharding)', note: 'scale write + throughput + dung lượng; cần khi chạm trần RAM/write một node' },
      { name: 'App-level sharding', tag: 'cuối', note: 'kiểm soát cao nhất, tự quản mọi thứ' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba hướng, theo thứ tự nên thử",
      code:
        "# 1) VERTICAL (tăng RAM/CPU máy) — LUÔN THỬ TRƯỚC.\n" +
        "#    Redis đơn luồng nên thêm core không giúp xử lý lệnh, nhưng thêm RAM\n" +
        "#    giải quyết được vấn đề dung lượng, và CPU nhanh hơn thì mỗi lệnh nhanh hơn.\n" +
        "#    Máy 256GB RAM chứa được rất nhiều dữ liệu — đừng vội chia cụm.\n" +
        "redis-cli INFO memory | grep used_memory_human\n" +
        "\n" +
        "# 2) READ REPLICA — khi nút thắt là ĐỌC (thường là vậy)\n" +
        "redis-cli -h replica-1 REPLICAOF master 6379\n" +
        "#    Client đọc từ replica, ghi vào master. Chấp nhận dữ liệu trễ vài mili giây.\n" +
        "#    Rẻ và đơn giản hơn Cluster rất nhiều.\n" +
        "\n" +
        "# 3) CHIA NHIỀU INSTANCE TRÊN CÙNG MÁY — tận dụng nhiều core mà không cần Cluster\n" +
        "#    (mỗi instance một core, ứng dụng tự chọn instance theo loại dữ liệu)\n" +
        "\n" +
        "# 4) CLUSTER — khi dataset vượt RAM một máy, hoặc GHI chạm trần một core\n" +
        "redis-cli --cluster create ... --cluster-replicas 1\n" +
        "\n" +
        "# CÂU HỎI CHẨN ĐOÁN trước khi quyết định:\n" +
        "#  - nút thắt là RAM, CPU, hay BĂNG THÔNG MẠNG?\n" +
        "redis-cli INFO stats | grep instantaneous_ops_per_sec\n" +
        "redis-cli INFO stats | grep instantaneous_input_kbps\n" +
        "#  - có lệnh O(N) nào đang chiếm phần lớn thời gian không?  -> sửa nó trước\n" +
        "redis-cli SLOWLOG GET 10\n" +
        "#  - có big key/hot key không?                              -> sửa nó trước\n" +
        "redis-cli --bigkeys\n" +
        "# Rất nhiều trường hợp \"cần scale\" thực ra là một câu lệnh O(N) hoặc một\n" +
        "# hot key — sửa xong thì không cần scale nữa.",
    },
  ],
},
{
  cat: 'Managed',
  id: 'redis-1nfyieq',
  q: 'Các mode của managed Redis (ElastiCache/MemoryDB) và khác biệt?',
  answer:
    '- **ElastiCache for Redis — cluster mode disabled**: một shard (1 primary + tối đa 5 replica). Như Sentinel setup managed.\n' +
    '- **ElastiCache — cluster mode enabled**: nhiều shard, sharding tự động. Client phải cluster-aware.\n' +
    '- **ElastiCache Serverless**: tự scale, trả theo dùng.\n' +
    '- **MemoryDB**: Redis-compatible nhưng **durable** — multi-AZ transaction log, dùng làm **primary database** (strong consistency trên primary, durability 99.999999999%). Đắt hơn ElastiCache.',
  essence:
    'ElastiCache = Redis làm **cache** (chấp nhận mất data khi sự cố). MemoryDB = Redis làm **database** (durable, đắt hơn). Cluster mode = có shard hay không.',
  example:
    'Cache session/API: ElastiCache cluster-mode-disabled + 2 replica multi-AZ. Cần Redis làm nguồn sự thật cho dữ liệu không được mất (feature store, một số state realtime): MemoryDB.',
  viz: {
    type: 'compare',
    cols: ['ElastiCache — cluster mode disabled', 'cluster mode enabled', 'ElastiCache Serverless', 'MemoryDB'],
    rows: [
      ['Cấu trúc', '1 shard (1 primary + ≤ 5 replica)', 'nhiều shard, sharding tự động', 'tự scale, trả theo dùng', 'multi-AZ transaction log'],
      ['Redis làm', 'CACHE (chấp nhận mất data)', 'CACHE', 'CACHE', 'DATABASE — durable 11 số 9, strong consistency trên primary'],
      ['Client', 'thường', 'cluster-aware', 'tuỳ', '—'],
      ['Chi phí', '—', '—', '—', 'đắt hơn ElastiCache'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba lựa chọn trên AWS và khác biệt cốt lõi",
      code:
        "# ELASTICACHE — CLUSTER MODE DISABLED\n" +
        "#  Một shard: 1 primary + tối đa 5 replica. Tương đương Sentinel.\n" +
        "#  Hỗ trợ MỌI lệnh, dùng được nhiều database.\n" +
        "aws elasticache create-replication-group \\\n" +
        "  --replication-group-id cache --engine redis \\\n" +
        "  --cache-node-type cache.r7g.large --num-cache-clusters 3 \\\n" +
        "  --automatic-failover-enabled --multi-az-enabled\n" +
        "\n" +
        "# ELASTICACHE — CLUSTER MODE ENABLED\n" +
        "#  Nhiều shard, mỗi shard có replica. Scale ngang được.\n" +
        "#  Ràng buộc multi-key theo slot, chỉ database 0.\n" +
        "aws elasticache create-replication-group \\\n" +
        "  --replication-group-id cache --engine redis \\\n" +
        "  --num-node-groups 3 --replicas-per-node-group 2 \\\n" +
        "  --cache-node-type cache.r7g.large\n" +
        "\n" +
        "# MEMORYDB — KHÁC BIỆT CỐT LÕI: ghi vào TRANSACTION LOG ĐA AZ TRƯỚC khi ack.\n" +
        "#  -> BỀN VỮNG thật sự (durable), không mất dữ liệu khi failover.\n" +
        "#  -> đổi lại: độ trễ GHI cao hơn (mili giây thay vì micro giây) và ĐẮT hơn.\n" +
        "#  Dùng khi Redis là NGUỒN SỰ THẬT chứ không chỉ là cache.\n" +
        "aws memorydb create-cluster --cluster-name main --node-type db.r6g.large \\\n" +
        "  --acl-name open-access --num-shards 2\n" +
        "\n" +
        "# ELASTICACHE SERVERLESS — tự co giãn, tính theo dung lượng và request thật.\n" +
        "# Hợp khi tải không đều.\n" +
        "\n" +
        "# ĐIỂM CHUNG cần biết khi dùng managed:\n" +
        "#  - KHÔNG có CONFIG SET cho một số tham số (phải qua parameter group)\n" +
        "#  - KHÔNG có lệnh nguy hiểm: DEBUG, một phần của CONFIG\n" +
        "#  - ElastiCache KHÔNG hỗ trợ module (RedisJSON, RediSearch)\n" +
        "#  - failover do AWS quản lý, thường 30-60 giây",
    },
  ],
},
{
  cat: 'Sự cố',
  id: 'redis-47ak4s',
  q: 'Nhất quán dữ liệu trong cửa sổ failover — mất bao nhiêu?',
  answer:
    'Vì replication async, khi master chết đột ngột:\n' +
    '- Các write master đã ack client nhưng **chưa gửi tới replica được promote** → **mất**.\n' +
    '- Lượng mất ≈ (throughput ghi) × (replication lag tại thời điểm chết). Thường vài ms–vài trăm ms dữ liệu.\n\n' +
    'Ngoài ra: client có thể ghi vào master cũ trong khoảng "master cũ chưa biết mình bị thay" (giảm bằng `min-replicas-to-write`).\n\n' +
    'Không có cách nào để mất = 0 với Redis OSS; MemoryDB (transaction log) thì có.',
  essence:
    'Failover Redis = "mất khoảng vài trăm ms write cuối cùng" là bình thường. Thiết kế hệ để chịu được điều đó (idempotency, DB làm nguồn sự thật, hoặc dùng MemoryDB nếu thật sự cần).',
  example:
    'Rate limiter dùng Redis: failover làm mất counter ~200ms → vài user được thêm vài request quota. Vô hại. Nhưng "đã trừ tiền" mà chỉ ở Redis thì không chấp nhận được — phải ở DB.',
  viz: {
    type: 'flow',
    title: 'Mất bao nhiêu trong cửa sổ failover',
    nodes: ['master chết đột ngột', 'write đã ack client nhưng CHƯA gửi tới replica được promote → MẤT', 'lượng mất ≈ throughput ghi × replication lag', 'client có thể ghi vào master cũ trong lúc "chưa biết mình bị thay"'],
    steps: [
      { to: 2, label: 'thường vài ms–vài trăm ms dữ liệu' },
      { to: 3, label: 'giảm bằng min-replicas-to-write' },
      { to: 3, label: 'Redis OSS không thể mất = 0; MemoryDB (transaction log) thì có. Thiết kế hệ chịu được: idempotency, DB làm nguồn sự thật' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ước lượng lượng dữ liệu có thể mất",
      code:
        "# CỬA SỔ MẤT MÁT = (dữ liệu master đã ack nhưng chưa sao chép sang replica\n" +
        "#                   được promote) + (ghi vào master cũ trong lúc failover)\n" +
        "\n" +
        "# ĐO ĐỘ TRỄ NHÂN BẢN — đây là con số quyết định:\n" +
        "redis-cli INFO replication\n" +
        "# master_repl_offset:123456789        <- master đang ở đâu\n" +
        "# slave0:...,offset=123456700,lag=0   <- replica đang ở đâu\n" +
        "# Chênh lệch offset (byte) chia cho tốc độ ghi = thời gian dữ liệu có thể mất.\n" +
        "\n" +
        "# ƯỚC LƯỢNG THỰC TẾ:\n" +
        "#  - mạng LAN tốt, tải bình thường: chênh lệch vài KB -> mất vài mili giây dữ liệu\n" +
        "#  - mạng nghẽn hoặc replica bận: có thể lên hàng giây\n" +
        "#  - Sentinel down-after 5s + failover ~3s -> ghi trong ~8 giây đó có nguy cơ mất\n" +
        "\n" +
        "# GIẢM XUỐNG:\n" +
        "redis-cli CONFIG SET min-replicas-to-write 1    # master cô lập ngừng nhận ghi\n" +
        "redis-cli CONFIG SET min-replicas-max-lag 10\n" +
        "redis-cli WAIT 1 100                            # cho ghi quan trọng\n" +
        "redis-cli CONFIG SET repl-backlog-size 128mb    # tránh full resync kéo dài\n" +
        "# Sentinel: giảm down-after-milliseconds -> phát hiện nhanh hơn, nhưng\n" +
        "# tăng nguy cơ failover oan khi mạng chớp nháy.\n" +
        "\n" +
        "# ĐIỀU QUAN TRỌNG NHẤT: thiết kế ứng dụng CHẤP NHẬN được việc mất một\n" +
        "# khoảng ghi Redis. Cache mất -> nạp lại từ DB. Session mất -> đăng nhập lại.\n" +
        "# Dữ liệu KHÔNG chấp nhận mất thì không nên chỉ nằm ở Redis.",
    },
  ],
},
{
  cat: 'Cluster',
  id: 'redis-1dguaep',
  q: 'Pipeline và transaction trong Cluster bị giới hạn thế nào?',
  answer:
    '- **Pipeline**: gửi được nhiều lệnh, nhưng client cluster phải **nhóm theo node** (mỗi node một pipeline) và ghép kết quả. Lệnh chạm key ở node khác nhau không thể trong một pipeline gửi tới một node.\n' +
    '- **MULTI/EXEC**: mọi key trong transaction phải **cùng slot** (dùng hash tag). Khác slot → lỗi.\n' +
    '- **Lua**: mọi `KEYS[]` phải cùng slot.\n\n' +
    'Nghĩa là: thiết kế cho Cluster phải nghĩ trước về "những key nào cần thao tác cùng nhau" và gom chúng bằng hash tag.',
  essence:
    'Cluster đánh đổi tính nguyên tử đa key tuỳ ý để có sharding. Bạn lấy lại một phần bằng hash tag (gom key cùng slot), nhưng phải chấp nhận hạn chế đó khi thiết kế.',
  example:
    'Chuyển điểm giữa hai user: nếu `points:{userA}` và `points:{userB}` khác slot → không `MULTI` được. Giải pháp: hoặc gom cả hai vào một hash tag chung theo "ví" (`wallet:{groupId}:userA`), hoặc dùng Lua chạy trên một node với thiết kế key phù hợp, hoặc xử lý qua queue.',
  viz: {
    type: 'tree',
    title: 'Pipeline & transaction trong Cluster — nghĩ trước "key nào cần thao tác cùng nhau"',
    root: {
      label: 'Cluster đánh đổi nguyên tử đa key tuỳ ý để có sharding',
      children: [
        { label: 'Pipeline', note: 'client phải NHÓM THEO NODE (mỗi node một pipeline) và ghép kết quả' },
        { label: 'MULTI/EXEC', note: 'mọi key phải CÙNG SLOT (hash tag); khác slot → lỗi' },
        { label: 'Lua', note: 'mọi KEYS[] phải cùng slot' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Mọi thứ đều bị chặn bởi ranh giới slot",
      code:
        "// PIPELINE trong Cluster: client phải TỰ CHIA lệnh theo node.\n" +
        "// Lettuce/Jedis làm việc này tự động, nhưng hiệu quả GIẢM vì mỗi node\n" +
        "// là một pipeline riêng -> không còn là một round-trip duy nhất.\n" +
        "RedisAdvancedClusterAsyncCommands<String, String> async = conn.async();\n" +
        "async.setAutoFlushCommands(false);\n" +
        "List<RedisFuture<?>> futures = new ArrayList<>();\n" +
        "for (int i = 0; i < 1000; i++) futures.add(async.set(\"key:\" + i, \"v\"));\n" +
        "async.flushCommands();\n" +
        "LettuceFutures.awaitAll(5, TimeUnit.SECONDS, futures.toArray(new RedisFuture[0]));\n" +
        "\n" +
        "// TRANSACTION (MULTI/EXEC): mọi key phải CÙNG SLOT, nếu không -> CROSSSLOT.\n" +
        "// -> Bắt buộc dùng hash tag:\n" +
        "redis.multi();\n" +
        "redis.set(\"user:{1001}:profile\", json);\n" +
        "redis.set(\"user:{1001}:cart\", cart);       // cùng tag -> cùng slot -> chạy được\n" +
        "redis.exec();\n" +
        "\n" +
        "// LUA: mọi key phải truyền qua KEYS[] VÀ cùng slot.\n" +
        "// Script tự sinh tên key bên trong sẽ chạy sai node -> đây là lỗi rất khó phát hiện.\n" +
        "\n" +
        "// HỆ QUẢ THIẾT KẾ: trong Cluster, hãy nghĩ theo \"đơn vị dữ liệu\" —\n" +
        "// mọi thứ cần thao tác cùng nhau phải chia sẻ một hash tag ngay từ đầu.\n" +
        "// Sửa sau rất tốn công vì phải đổi tên key và di chuyển dữ liệu.\n" +
        "\n" +
        "// Nếu nghiệp vụ cần nhiều thao tác nguyên tử trên các thực thể KHÔNG liên\n" +
        "// quan -> đó là dấu hiệu Cluster không phù hợp, cân nhắc quay lại một\n" +
        "// instance lớn với Sentinel.",
    },
  ],
},
{
  cat: 'Cluster',
  id: 'redis-bv99aw',
  q: 'Redis Cluster failover tự động hoạt động thế nào (không cần Sentinel)?',
  answer:
    'Mỗi node cluster giao tiếp qua **gossip protocol** (cổng cluster bus). Node phát hiện master không phản hồi trong `cluster-node-timeout` → đánh dấu `PFAIL`; nếu **đa số master** đồng ý → `FAIL`.\n\n' +
    'Replica của master FAIL đó tổ chức **bầu cử**: replica có offset lớn nhất, được **đa số master** vote → tự promote (`CLUSTER FAILOVER`), tiếp quản slot của master cũ, broadcast cấu hình mới.\n\n' +
    'Nếu một master mất hết replica → slot của nó **offline** (trừ khi `cluster-require-full-coverage no`, khi đó phần còn lại vẫn phục vụ).',
  essence:
    'Cluster tự lo failover: các master vote để công nhận "chết" và để chọn replica lên thay. Không cần Sentinel. Nhưng cần đủ master (majority) sống để ra quyết định.',
  example:
    'Cụm 6 node (3 master + 3 replica). Master A chết → 2 master còn lại (majority của 3) công nhận FAIL → replica A1 (offset đầy đủ nhất) được vote → promote, nhận slot 0–5460. App bị vài `CLUSTERDOWN`/`MOVED` trong ~vài giây rồi ổn định.',
  viz: {
    type: 'flow',
    title: 'Cluster failover tự động (không cần Sentinel)',
    nodes: ['gossip protocol (cluster bus)', 'node không phản hồi trong cluster-node-timeout → PFAIL', 'đa số master đồng ý → FAIL', 'replica của master FAIL bầu cử (offset lớn nhất, đa số master vote)', 'replica tự promote, tiếp quản slot, broadcast cấu hình mới'],
    steps: [
      { to: 2, label: 'các master vote để công nhận "chết"' },
      { to: 4, label: 'cần đủ master (majority) sống để ra quyết định' },
      { to: 4, label: 'master mất hết replica → slot offline (trừ cluster-require-full-coverage no)' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Node tự giám sát nhau qua gossip",
      code:
        "# Cluster KHÔNG cần Sentinel: chính các node giám sát lẫn nhau qua giao thức\n" +
        "# gossip trên cổng phụ (cổng chính + 10000).\n" +
        "\n" +
        "# QUY TRÌNH:\n" +
        "# 1) PFAIL (possible fail): một node không nhận được PONG từ node khác\n" +
        "#    trong cluster-node-timeout -> đánh dấu nghi ngờ.\n" +
        "redis-cli CONFIG SET cluster-node-timeout 15000\n" +
        "\n" +
        "# 2) FAIL: thông tin PFAIL lan qua gossip. Khi ĐA SỐ MASTER đồng ý,\n" +
        "#    node được đánh dấu FAIL chính thức.\n" +
        "\n" +
        "# 3) BẦU CỬ: các replica của master chết tự ứng cử. Replica có offset\n" +
        "#    replication LỚN NHẤT được ưu tiên (chờ ít hơn trước khi xin phiếu).\n" +
        "#    Các MASTER trong cụm bỏ phiếu; cần ĐA SỐ master đồng ý.\n" +
        "redis-cli CONFIG SET cluster-replica-validity-factor 10\n" +
        "# replica tụt lại quá (node-timeout * factor) sẽ KHÔNG được ứng cử —\n" +
        "# tránh promote một replica có dữ liệu quá cũ.\n" +
        "\n" +
        "# 4) PROMOTE: replica thắng cử tự nhận slot của master cũ và thông báo\n" +
        "#    qua gossip. Client nhận MOVED và cập nhật bản đồ slot.\n" +
        "\n" +
        "# THỜI GIAN: thường 15-20 giây với node-timeout mặc định.\n" +
        "\n" +
        "redis-cli CLUSTER INFO | grep -E \"cluster_state|cluster_slots_ok\"\n" +
        "redis-cli CLUSTER NODES | grep fail\n" +
        "redis-cli CLUSTER FAILOVER          # failover thủ công, chạy TRÊN REPLICA\n" +
        "redis-cli CLUSTER FAILOVER TAKEOVER # ép, kể cả khi master còn sống (nguy hiểm)\n" +
        "\n" +
        "# YÊU CẦU: cần ĐA SỐ MASTER còn sống thì cụm mới hoạt động -> tối thiểu\n" +
        "# 3 master. Cụm 2 master mất một cái là dừng hoàn toàn.",
    },
  ],
},
{
  cat: 'Cluster',
  id: 'redis-13mnphl',
  q: '`cluster-require-full-coverage` và `replica-priority` dùng để làm gì?',
  answer:
    '`cluster-require-full-coverage`:\n' +
    '- `yes` (mặc định): nếu **bất kỳ** slot nào không có node phục vụ (master + replica của nó đều chết) → **toàn cụm** ngừng nhận lệnh (`CLUSTERDOWN`). Ưu tiên nhất quán/an toàn.\n' +
    '- `no`: các slot còn sống vẫn phục vụ; chỉ key thuộc slot mất mới lỗi. Ưu tiên availability một phần.\n\n' +
    '`replica-priority`: số nhỏ hơn = ưu tiên promote cao hơn khi failover; `0` = **không bao giờ** được promote (ví dụ replica dùng riêng cho backup/analytics ở DC xa).',
  essence:
    '`cluster-require-full-coverage` là công tắc "mất một phần thì sập hết hay phục vụ phần còn lại". `replica-priority` điều khiển replica nào được/không được lên làm master.',
  example:
    'Cache: đặt `cluster-require-full-coverage no` → mất 1 shard chỉ ảnh hưởng ~1/6 key, phần còn lại vẫn phục vụ (miss thì xuống DB). Replica đặt ở region DR để backup: `replica-priority 0` để failover không bao giờ đưa master sang region xa gây latency cho mọi client.',
  viz: {
    type: 'compare',
    cols: ['cluster-require-full-coverage = yes (mặc định)', '= no'],
    rows: [
      ['Khi một slot không có node phục vụ', 'TOÀN CỤM ngừng nhận lệnh (CLUSTERDOWN)', 'các slot còn sống vẫn phục vụ; chỉ key thuộc slot mất mới lỗi'],
      ['Ưu tiên', 'nhất quán / an toàn', 'availability một phần'],
      ['replica-priority', 'số nhỏ hơn = ưu tiên promote cao hơn', '0 = KHÔNG bao giờ được promote (replica DR ở region xa)'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hai công tắc quyết định hành vi khi có sự cố",
      code:
        "# CLUSTER-REQUIRE-FULL-COVERAGE (mặc định yes)\n" +
        "redis-cli CONFIG SET cluster-require-full-coverage yes\n" +
        "# yes -> chỉ cần MỘT slot không có node phục vụ là TOÀN CỤM ngừng nhận lệnh\n" +
        "#        (cluster_state:fail). Chọn NHẤT QUÁN: thà dừng còn hơn phục vụ\n" +
        "#        một phần dữ liệu và để ứng dụng tưởng key không tồn tại.\n" +
        "redis-cli CONFIG SET cluster-require-full-coverage no\n" +
        "# no  -> cụm vẫn phục vụ các slot còn sống; truy vấn vào slot mất thì lỗi.\n" +
        "#        Chọn SẴN SÀNG. Hợp khi Redis là CACHE THUẦN — mất một phần cache\n" +
        "#        chỉ làm chậm, không làm sai.\n" +
        "# NGUY HIỂM khi Redis là kho dữ liệu: key không đọc được sẽ bị hiểu nhầm là\n" +
        "# \"không tồn tại\" -> ứng dụng ghi đè, tạo trùng, hoặc trả sai cho người dùng.\n" +
        "redis-cli CLUSTER INFO | grep cluster_state\n" +
        "\n" +
        "# REPLICA-PRIORITY — điều khiển replica nào được ưu tiên promote\n" +
        "redis-cli CONFIG SET replica-priority 100    # mặc định\n" +
        "redis-cli CONFIG SET replica-priority 50     # ưu tiên CAO hơn (số nhỏ thắng)\n" +
        "redis-cli CONFIG SET replica-priority 0      # KHÔNG BAO GIỜ được promote\n" +
        "# Dùng 0 cho: replica dùng để chạy backup/phân tích, replica ở region xa\n" +
        "# (promote nó sẽ khiến mọi client phải đi qua WAN).\n" +
        "# Dùng số nhỏ cho replica cùng AZ với phần lớn ứng dụng.\n" +
        "# Áp dụng cho cả Sentinel lẫn Cluster.",
    },
  ],
},
{
  cat: 'Managed',
  id: 'redis-bfi964',
  q: 'Triển khai Redis multi-AZ cần cân nhắc gì?',
  answer:
    '- **Replica ở AZ khác master** → mất một AZ vẫn còn bản dự phòng.\n' +
    '- **Chi phí cross-AZ**: replication stream + client đọc replica khác AZ tính tiền data transfer.\n' +
    '- **Latency**: cross-AZ ~1–2ms → replication lag nhỉnh hơn, và đọc replica khác AZ chậm hơn đọc local.\n' +
    '- **Sentinel/quorum**: đặt Sentinel/master trải 3 AZ để mất 1 AZ không mất majority.\n' +
    '- **Failover**: đảm bảo client reconnect nhanh tới master mới (có thể ở AZ khác).',
  essence:
    'Multi-AZ đổi một ít latency và chi phí data transfer lấy khả năng sống sót khi mất nguyên một AZ. Điểm mấu chốt: quorum (Sentinel/master) phải trải đủ để không phụ thuộc một AZ.',
  example:
    'ElastiCache: primary AZ-a, replica AZ-b và AZ-c, "Multi-AZ with automatic failover" bật. AZ-a sập → ElastiCache promote replica ở AZ-b, cập nhật endpoint DNS → client (dùng configuration/primary endpoint) tự trỏ sang node mới trong ~1 phút.',
  viz: {
    type: 'tree',
    title: 'Redis multi-AZ — quorum phải trải đủ để không phụ thuộc một AZ',
    root: {
      label: 'Đổi một ít latency + chi phí data transfer lấy sống sót khi mất nguyên 1 AZ',
      children: [
        { label: 'Replica ở AZ khác master', note: 'mất một AZ vẫn còn bản dự phòng' },
        { label: 'Chi phí cross-AZ', note: 'replication stream + đọc replica khác AZ tính tiền data transfer' },
        { label: 'Latency cross-AZ ~1–2ms', note: 'replication lag nhỉnh hơn' },
        { label: 'Sentinel/master trải 3 AZ', note: 'mất 1 AZ không mất majority' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Trải AZ để chịu lỗi, và cái giá phải trả",
      code:
        "# BỐ TRÍ: master và replica ở AZ KHÁC NHAU; với Sentinel thì 3 Sentinel ở\n" +
        "# 3 AZ khác nhau (nếu không, mất một AZ là mất luôn majority).\n" +
        "#   AZ-a: master + sentinel-1\n" +
        "#   AZ-b: replica-1 + sentinel-2\n" +
        "#   AZ-c: replica-2 + sentinel-3\n" +
        "\n" +
        "aws elasticache create-replication-group \\\n" +
        "  --replication-group-id prod --engine redis \\\n" +
        "  --num-cache-clusters 3 --automatic-failover-enabled --multi-az-enabled \\\n" +
        "  --preferred-cache-cluster-a-zs ap-southeast-1a ap-southeast-1b ap-southeast-1c\n" +
        "\n" +
        "# CÁI GIÁ PHẢI CÂN NHẮC:\n" +
        "# 1) ĐỘ TRỄ giữa AZ ~1-2ms. Với Redis (vốn đo bằng micro giây) thì đây là\n" +
        "#    mức tăng ĐÁNG KỂ về tỉ lệ. Ứng dụng nên đọc từ replica CÙNG AZ.\n" +
        "# 2) CHI PHÍ truyền dữ liệu liên AZ — replication stream chạy liên tục,\n" +
        "#    và trên AWS thì tính tiền hai chiều.\n" +
        "# 3) Replication vẫn BẤT ĐỒNG BỘ -> failover chéo AZ vẫn có thể mất dữ liệu.\n" +
        "# 4) MẤT MỘT AZ: phải đảm bảo phần còn lại đủ majority để failover, VÀ đủ\n" +
        "#    năng lực phục vụ toàn bộ tải.\n" +
        "\n" +
        "# GIẢM ĐỘ TRỄ ĐỌC: đọc từ replica cùng AZ\n" +
        "redis-cli -h replica-same-az READONLY\n" +
        "\n" +
        "# ĐA REGION là chuyện khác hẳn: độ trễ hàng chục tới hàng trăm mili giây\n" +
        "# -> KHÔNG dùng replication đồng bộ. Dùng Global Datastore (ElastiCache)\n" +
        "# hoặc cluster độc lập mỗi region + đồng bộ ở tầng ứng dụng.",
    },
  ],
},
]);
