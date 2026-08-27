SS.addQuestions('redis', [
{
  cat: 'Replication',
  q: 'Replication trong Redis hoạt động thế nào? Có đảm bảo gì?',
  answer:
    'Một master, N replica. Replica gửi `REPLCONF` / `PSYNC`; master gửi RDB snapshot rồi **stream các lệnh ghi** tiếp theo (replication stream).\n\n' +
    'Replication là **bất đồng bộ**: master trả lời client **trước khi** replica nhận lệnh. Master chết đột ngột → các lệnh chưa kịp propagate bị **mất**.\n\n' +
    'Replica mặc định **read-only** (`replica-read-only yes`) → dùng để scale đọc. `replica-serve-stale-data` quyết định replica có phục vụ dữ liệu cũ khi mất kết nối master không.',
  essence:
    'Replication cho HA (có bản dự phòng) và scale đọc, nhưng **async** nên luôn có cửa sổ mất dữ liệu khi failover. Không phải cơ chế nhất quán mạnh.',
  example:
    'App đọc nặng: 1 master + 3 replica, client route write → master, read → replica (chấp nhận replica lag ~ms). Nếu vài read cần "vừa ghi vừa đọc" nhất quán → đọc từ master cho riêng chúng.',
},
{
  cat: 'Replication',
  q: 'Full resync và partial resync khác nhau thế nào?',
  answer:
    'Master giữ một **replication backlog** (buffer vòng, `repl-backlog-size`, mặc định 1MB) chứa các lệnh gần nhất, và mỗi replica có một **replication offset**.\n\n' +
    '- **Partial resync**: replica rớt kết nối ngắn rồi nối lại; nếu offset của nó vẫn nằm trong backlog → master chỉ gửi phần **thiếu** → nhanh, nhẹ.\n' +
    '- **Full resync**: offset đã trôi ra khỏi backlog (mất kết nối lâu, hoặc backlog nhỏ, hoặc master restart / đổi replication id) → master phải `BGSAVE` gửi lại **toàn bộ RDB** → tốn CPU/mạng/đĩa, có thể gây latency spike.',
  essence:
    'Backlog đủ lớn = mạng chập chờn chỉ gây partial resync (rẻ). Backlog nhỏ = mỗi gián đoạn thành full resync (đắt). Tăng `repl-backlog-size` cho môi trường mạng không ổn định.',
  example:
    'Replica ở AZ khác, mạng thỉnh thoảng đứt 10s. Ghi ~5MB/s. Backlog 1MB → mỗi lần đứt = full resync (BGSAVE 20GB!). Tăng `repl-backlog-size 256mb` → các gián đoạn < ~50s chỉ partial resync.',
},
{
  cat: 'Sentinel',
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
},
{
  cat: 'Sentinel',
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
},
{
  cat: 'Cluster',
  q: 'Redis Cluster: 16384 hash slot và sharding?',
  answer:
    'Cluster chia keyspace thành **16384 slot**. `slot = CRC16(key) % 16384`. Mỗi master node sở hữu một dải slot; key thuộc slot nào thì nằm ở node đó.\n\n' +
    'Client (cluster-aware) biết bản đồ slot→node, gửi lệnh thẳng tới node đúng. Node nhận key không thuộc nó → trả **`MOVED <slot> <node>`** (bản đồ đổi) hoặc **`ASK`** (đang migrate slot).\n\n' +
    'Mỗi master có thể có replica; mất master → replica lên thay (cluster tự failover, không cần Sentinel).',
  essence:
    'Cluster = sharding tự động theo slot + HA tích hợp. 16384 slot là "đơn vị di chuyển" khi thêm/bớt node — bạn reshard bằng cách chuyển slot giữa các node.',
  example:
    'Cụm 3 master (slot 0–5460, 5461–10922, 10923–16383) + 3 replica. Thêm master thứ 4: chạy reshard chuyển ~4096 slot (và dữ liệu của chúng) từ 3 node cũ sang node mới. Client tự cập nhật bản đồ qua `MOVED`.',
},
{
  cat: 'Cluster',
  q: 'MOVED và ASK redirect khác nhau thế nào?',
  answer:
    '- **MOVED `<slot> <ip:port>`**: slot đã **thuộc hẳn** node khác. Client cập nhật bản đồ slot của mình và gửi lại tới node đúng. Xảy ra sau reshard.\n' +
    '- **ASK `<slot> <ip:port>`**: slot đang **trong quá trình migrate**. Một số key đã chuyển sang node đích. Client gửi `ASKING` + lệnh tới node đích **chỉ cho request này**, **không** cập nhật bản đồ (vì migrate chưa xong).\n\n' +
    'Client "dumb" (không cluster-aware) sẽ liên tục bị redirect và chậm — bắt buộc dùng cluster client.',
  essence:
    'MOVED = "đổi vĩnh viễn, cập nhật cache đi". ASK = "tạm thời cho lệnh này, đừng cache". Đây là cách Cluster reshard **online** mà không dừng dịch vụ.',
  example:
    'Đang migrate slot 8000 từ node A sang B. Key `foo` (slot 8000) chưa chuyển → ở A. Key `bar` (slot 8000) đã chuyển → A trả `ASK ... B` → client `ASKING; GET bar` tới B. Xong migrate → A trả `MOVED` cho cả hai.',
},
{
  cat: 'Cluster',
  q: 'Multi-key operation trong Cluster và hash tag `{}`?',
  answer:
    'Lệnh đa key (`MGET`, `SINTER`, `MULTI` với nhiều key, Lua với nhiều `KEYS`) chỉ hoạt động nếu **tất cả key thuộc cùng một slot** — nếu không → `CROSSSLOT` error.\n\n' +
    '**Hash tag**: nếu key chứa `{...}`, chỉ phần trong ngoặc được hash. `user:{1000}:profile` và `user:{1000}:cart` → cùng slot → dùng chung được trong lệnh đa key / transaction / Lua.',
  essence:
    'Cluster hy sinh khả năng thao tác đa key tuỳ ý để có sharding. Hash tag là cách chủ động **gom các key liên quan vào cùng slot** khi bạn cần thao tác chúng cùng nhau.',
  example:
    'Cần `MULTI` cập nhật `order:{42}:status` và `order:{42}:items` nguyên tử → hash tag `{42}` đảm bảo cùng slot. Nhưng cẩn thận: mọi thứ của order 42 dồn một node → nếu order 42 là "khủng" thì tạo hot slot.',
},
{
  cat: 'Cluster',
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
},
{
  cat: 'Cluster',
  q: 'Redis Cluster vs Sentinel — chọn cái nào?',
  answer:
    '- **Sentinel**: một master giữ **toàn bộ** dataset + replica; Sentinel lo failover. Dùng khi: dataset **vừa với RAM một node**, chỉ cần HA + scale đọc, muốn đơn giản, cần thao tác đa key tự do.\n' +
    '- **Cluster**: sharding dataset qua nhiều master + HA tích hợp. Dùng khi: dataset **vượt RAM một node**, cần scale ghi/throughput vượt một node. Đổi lại: hạn chế multi-key (cùng slot), client phức tạp hơn, vận hành khó hơn.',
  essence:
    'Sentinel = "một Redis lớn có dự phòng". Cluster = "nhiều Redis chia dữ liệu". Chọn Cluster khi bị chặn bởi RAM hoặc throughput ghi của một node — nếu không, Sentinel đơn giản hơn nhiều.',
  example:
    'Cache 40GB, ghi 50k ops/s: một node r6g.2xlarge (64GB) + Sentinel + 2 replica là đủ, đơn giản. Cache 500GB hoặc ghi 500k ops/s: bắt buộc Cluster ~8–12 shard.',
},
{
  cat: 'Replication',
  q: '`min-replicas-to-write` bảo vệ dữ liệu thế nào?',
  answer:
    '`min-replicas-to-write N` + `min-replicas-max-lag M`: master **từ chối ghi** nếu có ít hơn N replica kết nối với lag ≤ M giây.\n\n' +
    'Mục đích: nếu master bị cô lập (mất hết replica), thay vì tiếp tục nhận write (sẽ mất khi failover), master **dừng nhận write** → giảm lượng dữ liệu có thể mất.\n\n' +
    'Đánh đổi: giảm availability (mất replica = mất khả năng ghi) để tăng "an toàn write".',
  essence:
    'Đây là "quorum ghi nghèo" cho Redis: chỉ ghi khi dữ liệu có cơ hội tồn tại ở ≥ N nơi. Chọn cấu hình này khi mất write đau hơn là mất khả năng ghi tạm thời.',
  example:
    '`min-replicas-to-write 1`, `min-replicas-max-lag 10`: master + 2 replica. Cả 2 replica mất kết nối → master ngừng nhận write (client nhận lỗi) → không tích luỹ write sẽ bị mất khi Sentinel failover sang một replica cũ.',
},
{
  cat: 'Sự cố',
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
},
{
  cat: 'Client',
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
},
{
  cat: 'Replication',
  q: '`WAIT` command làm gì và giới hạn?',
  answer:
    '`WAIT numreplicas timeout`: block client tới khi các lệnh ghi **trước đó** của connection này được **ack bởi ít nhất `numreplicas` replica**, hoặc hết `timeout` (ms). Trả về số replica đã ack.\n\n' +
    'Tăng độ an toàn: sau `SET critical ...`, gọi `WAIT 1 100` → chỉ tiếp tục nếu ít nhất 1 replica đã có.\n\n' +
    'Giới hạn: **không phải** quorum thật (không ngăn được split-brain hoàn toàn); thêm latency; nếu timeout thì bạn không biết chắc trạng thái (có thể đã replicate sau đó).',
  essence:
    '`WAIT` cho phép "ghi bán đồng bộ" theo từng lệnh khi cần — đánh đổi latency lấy giảm khả năng mất write. Không biến Redis thành hệ nhất quán mạnh.',
  example:
    'Ghi token thu hồi (không được mất): `SET revoked:{jti} 1 EX 3600` rồi `WAIT 1 200`. Nếu `WAIT` trả 0 (không replica nào ack trong 200ms) → coi thao tác chưa an toàn, retry hoặc ghi vào DB thay thế.',
},
{
  cat: 'Scale',
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
},
{
  cat: 'Managed',
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
},
{
  cat: 'Sự cố',
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
},
{
  cat: 'Cluster',
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
},
{
  cat: 'Cluster',
  q: 'Redis Cluster failover tự động hoạt động thế nào (không cần Sentinel)?',
  answer:
    'Mỗi node cluster giao tiếp qua **gossip protocol** (cổng cluster bus). Node phát hiện master không phản hồi trong `cluster-node-timeout` → đánh dấu `PFAIL`; nếu **đa số master** đồng ý → `FAIL`.\n\n' +
    'Replica của master FAIL đó tổ chức **bầu cử**: replica có offset lớn nhất, được **đa số master** vote → tự promote (`CLUSTER FAILOVER`), tiếp quản slot của master cũ, broadcast cấu hình mới.\n\n' +
    'Nếu một master mất hết replica → slot của nó **offline** (trừ khi `cluster-require-full-coverage no`, khi đó phần còn lại vẫn phục vụ).',
  essence:
    'Cluster tự lo failover: các master vote để công nhận "chết" và để chọn replica lên thay. Không cần Sentinel. Nhưng cần đủ master (majority) sống để ra quyết định.',
  example:
    'Cụm 6 node (3 master + 3 replica). Master A chết → 2 master còn lại (majority của 3) công nhận FAIL → replica A1 (offset đầy đủ nhất) được vote → promote, nhận slot 0–5460. App bị vài `CLUSTERDOWN`/`MOVED` trong ~vài giây rồi ổn định.',
},
{
  cat: 'Cluster',
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
},
{
  cat: 'Managed',
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
},
]);
