SS.addQuestions('kafka', [
{
  cat: 'Nền tảng',
  q: 'Kafka là gì? Khác message queue truyền thống (RabbitMQ) ở đâu?',
  answer:
    'Kafka là **distributed commit log** phân tán: producer *append* message vào log, consumer *đọc theo offset*. Message **không bị xoá khi đọc** — chúng tồn tại theo retention (thời gian/dung lượng).\n\n' +
    'Khác broker truyền thống:\n' +
    '- **Pull-based**: consumer tự kéo với tốc độ của mình; không có "push" gây quá tải.\n' +
    '- **Replayable**: nhiều consumer group đọc độc lập cùng dữ liệu, tua lại offset bất kỳ.\n' +
    '- **Ordering theo partition**, throughput cao nhờ ghi tuần tự lên đĩa + zero-copy.\n' +
    '- RabbitMQ mạnh về routing linh hoạt, per-message ack, TTL/priority; Kafka mạnh về throughput, lưu trữ, stream processing.',
  essence:
    'Kafka là "cuốn nhật ký sự kiện có thể tua lại", không phải hàng đợi tiêu thụ-rồi-mất. Consumer là người đọc log tại một vị trí, không phải người "nhận và xoá".',
  example:
    'Một sự kiện `OrderCreated` được: service kho đọc để trừ tồn, service email đọc để gửi mail, pipeline analytics đọc để nạp vào data lake — ba consumer group, cùng một topic, offset riêng. Với RabbitMQ bạn phải fan-out qua nhiều queue.',
},
{
  cat: 'Nền tảng',
  q: 'Topic, partition và offset là gì?',
  answer:
    '**Topic**: tên logic của một luồng sự kiện (ví dụ `orders`).\n\n' +
    '**Partition**: mỗi topic chia thành N partition — mỗi partition là một **log có thứ tự, append-only**, lưu trên đĩa của broker. Đây là đơn vị song song và nhân bản.\n\n' +
    '**Offset**: số thứ tự tăng dần, **duy nhất trong một partition**, gán cho mỗi message. Consumer theo dõi "đã đọc tới offset nào" cho từng partition.\n\n' +
    'Không có offset toàn cục cho topic; thứ tự chỉ tồn tại trong phạm vi một partition.',
  essence:
    'Topic là khái niệm; partition là đơn vị vật lý + song song + thứ tự; offset là con trỏ đọc trong một partition. Mọi bảo đảm của Kafka đều gắn với partition.',
  example:
    'Topic `orders` 6 partition. Message key = `customerId` → mọi sự kiện của cùng một khách vào cùng partition, đọc lại đúng thứ tự. Consumer lag của partition 3 = latest offset (100) − committed offset (85) = 15 message chưa xử lý.',
},
{
  cat: 'Nền tảng',
  q: 'Vì sao Kafka chia partition? Đánh đổi gì về thứ tự?',
  answer:
    'Partition cho phép:\n' +
    '- **Mở rộng ngang**: các partition nằm trên nhiều broker → ghi/đọc song song, vượt giới hạn một máy.\n' +
    '- **Song song hoá consumer**: trong một consumer group, mỗi partition được gán cho tối đa **một** consumer → số partition = trần số consumer chạy song song.\n\n' +
    'Đánh đổi: **thứ tự chỉ đảm bảo trong một partition**, không phải toàn topic. Muốn giữ thứ tự cho một thực thể (user, tài khoản, đơn hàng), phải dùng **cùng key** để chúng rơi vào cùng partition.',
  essence:
    'Partition đổi "thứ tự toàn cục" lấy "throughput và song song". Bạn thiết kế key để nhóm những sự kiện *cần* thứ tự vào chung một partition.',
  example:
    'Sự kiện tài khoản ngân hàng: key = `accountId`. Nạp tiền rồi rút tiền của cùng tài khoản luôn cùng partition → consumer xử lý đúng thứ tự. Sự kiện của tài khoản khác nằm partition khác, xử lý song song.',
},
{
  cat: 'Nền tảng',
  q: 'Broker, cluster và controller là gì? KRaft khác ZooKeeper thế nào?',
  answer:
    '**Broker**: một tiến trình Kafka, lưu một tập partition (leader hoặc follower). Nhiều broker tạo thành **cluster**.\n\n' +
    '**Controller**: một broker được bầu làm điều phối — quản lý metadata, bầu leader partition, xử lý broker join/leave.\n\n' +
    'Trước: metadata + bầu cử lưu ở **ZooKeeper** (cụm riêng, thêm vận hành). Từ Kafka 3.3+ ổn định **KRaft**: Kafka tự quản metadata bằng một Raft log nội bộ (`__cluster_metadata`), bỏ hẳn ZooKeeper — triển khai đơn giản hơn, scale metadata tốt hơn, recovery nhanh hơn. Kafka 4.0 chỉ còn KRaft.',
  essence:
    'Broker lưu dữ liệu; controller lưu "bản đồ" cụm. KRaft gộp vai trò của ZooKeeper vào chính Kafka, giảm một thành phần phải vận hành.',
  example:
    'Cụm cũ: 3 ZooKeeper + 5 Kafka broker. Cụm KRaft: 3 node "controller" (hoặc combined) + broker — ít hạ tầng, và khi controller đổi thì cụm phục hồi metadata trong vài giây thay vì đọc lại toàn bộ từ ZK.',
},
{
  cat: 'Nền tảng',
  q: 'Replication factor, leader/follower và ISR là gì?',
  answer:
    '**Replication factor (RF)**: mỗi partition có RF bản sao trên RF broker khác nhau. RF=3 chịu được mất 2 broker.\n\n' +
    'Một bản là **leader** (nhận mọi read/write), các bản còn lại là **follower** (fetch dữ liệu từ leader để bám theo).\n\n' +
    '**ISR (In-Sync Replicas)**: tập các replica (gồm leader) đang bám kịp leader trong `replica.lag.time.max.ms`. Follower tụt lại bị loại khỏi ISR; bắt kịp thì được thêm lại. Leader mới chỉ được bầu từ ISR (trừ khi bật unclean election).',
  essence:
    'RF là số bản sao; ISR là số bản sao *đang thực sự đồng bộ*. Độ bền thực tế phụ thuộc kích thước ISR, không chỉ RF.',
  example:
    'RF=3, `min.insync.replicas=2`, producer `acks=all`: message được coi là "đã ghi" khi có mặt ở ≥ 2 replica trong ISR. Nếu 2 follower cùng chết, ISR còn 1 < 2 → producer nhận lỗi thay vì ghi rủi ro mất dữ liệu.',
},
{
  cat: 'Nền tảng',
  q: 'Producer ghi vào đâu và consumer đọc từ đâu trong một partition?',
  answer:
    'Cả read và write của một partition đều đi qua **leader** của partition đó. Producer gửi tới broker đang giữ leader; consumer fetch từ leader.\n\n' +
    'Follower **không phục vụ client**, chỉ replicate. (Từ Kafka 2.4 có "follower fetching" cho consumer đọc từ replica gần về mặt địa lý để giảm chi phí cross-AZ, nhưng mặc định vẫn là leader.)\n\n' +
    'Producer biết leader nào nhờ **metadata** lấy từ bất kỳ broker nào (bootstrap), và tự cập nhật khi leader đổi.',
  essence:
    'Leader partition là điểm truy cập duy nhất cho dữ liệu partition đó — đơn giản hoá tính nhất quán. Follower chỉ để dự phòng.',
  example:
    'Broker giữ leader partition 4 bị chết → controller bầu một follower trong ISR làm leader mới → producer/consumer nhận `NotLeaderForPartition`, refresh metadata, chuyển sang broker mới. Gián đoạn thường dưới một giây.',
},
{
  cat: 'Lưu trữ',
  q: 'Retention và log compaction khác nhau thế nào?',
  answer:
    '`cleanup.policy`:\n' +
    '- **delete** (mặc định): xoá message cũ hơn `retention.ms` (ví dụ 7 ngày) hoặc khi partition vượt `retention.bytes`. Giữ *lịch sử theo thời gian*.\n' +
    '- **compact**: giữ **message mới nhất cho mỗi key**, xoá các bản cũ hơn của cùng key. Message key=null bị bỏ. Giữ *trạng thái hiện tại*.\n' +
    '- **compact,delete**: kết hợp cả hai.\n\n' +
    'Compaction chạy nền theo segment; luôn giữ "tail" gần nhất chưa nén.',
  essence:
    'delete = "log sự kiện có hạn sử dụng". compact = "bảng key→value phiên bản mới nhất, dạng log". Chọn theo việc bạn cần dòng sự kiện hay ảnh chụp trạng thái.',
  example:
    'Topic `user-events` (delete, 30 ngày) cho analytics. Topic `user-profile-snapshot` (compact) để service mới khởi động có thể đọc từ đầu và dựng lại profile hiện tại của mọi user mà không cần toàn bộ lịch sử. Đây là nền của Kafka Streams KTable.',
},
{
  cat: 'Consumer group',
  q: 'Consumer group là gì? Partition được gán cho consumer thế nào?',
  answer:
    'Một **consumer group** là tập consumer cùng `group.id` chia nhau đọc các partition của topic. Mỗi partition được gán cho **đúng một** consumer trong group tại một thời điểm.\n\n' +
    '- consumer < partition → một consumer giữ nhiều partition.\n' +
    '- consumer = partition → 1-1, song song tối đa.\n' +
    '- consumer > partition → consumer thừa **ngồi không**.\n\n' +
    'Nhiều group khác nhau đọc **độc lập** cùng topic (mỗi group có offset riêng) → fan-out.',
  essence:
    'Group = đơn vị "chia tải và mở rộng" cho một logic tiêu thụ. Số partition đặt trần cho khả năng song song của một group.',
  example:
    'Topic 12 partition, service thanh toán chạy 4 pod cùng group → mỗi pod 3 partition. Scale lên 12 pod → mỗi pod 1 partition. Scale lên 15 pod → 3 pod idle, cần tăng partition mới tận dụng.',
},
{
  cat: 'Consumer group',
  q: 'Offset được lưu ở đâu và bởi ai?',
  answer:
    'Consumer **tự chịu trách nhiệm** commit offset "đã xử lý xong". Kafka lưu offset trong một topic nội bộ compacted: **`__consumer_offsets`** (50 partition mặc định), key = (group, topic, partition), value = offset + metadata.\n\n' +
    'Commit có thể **tự động** (`enable.auto.commit=true`, định kỳ theo `auto.commit.interval.ms`) hoặc **thủ công** (`commitSync`/`commitAsync`).\n\n' +
    'Khi consumer khởi động / sau rebalance, nó đọc offset đã commit từ topic này để biết bắt đầu từ đâu.',
  essence:
    'Offset là trạng thái của *consumer*, không phải của broker; nó được lưu như một message compacted. "Đọc tới đâu" và "đã xử lý xong tới đâu" là hai thứ khác nhau — bạn kiểm soát bằng thời điểm commit.',
  example:
    'Auto-commit: consumer poll 100 message, sau 5s auto-commit offset 100, nhưng mới xử lý 60 thì crash → 40 message bị **mất** (at-most-once vô tình). Commit thủ công sau khi xử lý xong từng lô để đạt at-least-once.',
},
{
  cat: 'Nền tảng',
  q: 'Message key dùng để làm gì?',
  answer:
    'Key (tuỳ chọn) quyết định:\n' +
    '- **Partitioning**: `partition = hash(key) % numPartitions` (partitioner mặc định) → cùng key ⇒ cùng partition ⇒ cùng thứ tự.\n' +
    '- **Log compaction**: đơn vị "giữ bản mới nhất" là theo key.\n\n' +
    'Key = null → partitioner phân phối xoay vòng/sticky theo batch, không đảm bảo cùng đích.\n\n' +
    'Chọn key = định danh thực thể mà bạn cần thứ tự và/hoặc gom nhóm (userId, orderId, deviceId).',
  essence:
    'Key vừa là "khoá định tuyến partition" vừa là "khoá compaction". Thiết kế key = thiết kế mô hình thứ tự và trạng thái của bạn.',
  example:
    'IoT: key = `deviceId` → chuỗi telemetry của một thiết bị luôn theo thứ tự trên một partition. Nếu key = `null`, hai lần đo liên tiếp của cùng thiết bị có thể vào hai partition và bị xử lý lệch thứ tự.',
},
{
  cat: 'Kiến trúc',
  q: 'Kafka lưu trên đĩa nhưng vẫn rất nhanh — vì sao?',
  answer:
    '- **Sequential I/O**: chỉ append cuối file log → tốc độ ghi tuần tự trên HDD/SSD gần bằng RAM ngẫu nhiên, tránh seek.\n' +
    '- **Page cache của OS**: dữ liệu vừa ghi còn nóng trong page cache, consumer đọc gần realtime lấy từ RAM, không chạm đĩa. Kafka cố ý **không** cache trong JVM heap (tránh GC, tận dụng OS).\n' +
    '- **Zero-copy** (`sendfile`): gửi dữ liệu từ page cache thẳng ra socket, không copy qua user space.\n' +
    '- **Batching + compression** ở cả producer và broker → ít syscall, ít byte trên mạng.',
  essence:
    'Kafka nhanh không phải vì tránh đĩa mà vì dùng đĩa đúng cách (tuần tự) + để OS làm cache + loại bỏ copy thừa. Throughput bị giới hạn bởi NIC/đĩa, hiếm khi bởi CPU.',
  example:
    'Một broker thường trên NVMe + 10GbE đẩy hàng trăm MB/s mỗi partition. Nếu đặt `log.dirs` trên network storage có latency cao hoặc bật fsync mỗi message, throughput sụp — vì phá vỡ mô hình sequential + page cache.',
},
{
  cat: 'Lưu trữ',
  q: 'Partition log được tổ chức thành segment như thế nào?',
  answer:
    'Mỗi partition là một thư mục chứa nhiều **segment file**: `.log` (dữ liệu), `.index` (offset → vị trí byte), `.timeindex` (timestamp → offset).\n\n' +
    'Kafka chỉ append vào **active segment**. Khi segment đạt `segment.bytes` (1GB mặc định) hoặc `segment.ms`, nó được "đóng" và mở segment mới.\n\n' +
    'Retention/compaction/xoá thao tác ở mức **segment** (xoá cả file), không xoá từng message — nên rất rẻ.',
  essence:
    'Chia segment để việc xoá dữ liệu cũ chỉ là xoá file, và tra cứu offset dùng index thưa (binary search) thay vì quét toàn bộ.',
  example:
    '`retention.ms=86400000` (1 ngày), `segment.ms=3600000` (1 giờ) → mỗi giờ một segment, sau 24 giờ segment cũ nhất bị xoá nguyên file. Đặt segment quá lớn khiến dữ liệu quá hạn vẫn nằm lại lâu vì segment chưa đóng.',
},
{
  cat: 'Nền tảng',
  q: 'Kafka đảm bảo thứ tự message ở mức nào?',
  answer:
    'Chỉ **trong một partition**: message ghi trước có offset nhỏ hơn và được consumer đọc trước.\n\n' +
    'Không đảm bảo giữa các partition của cùng topic. Nếu producer bật retry mà `max.in.flight.requests.per.connection > 1` và **không** bật idempotence, một lần retry có thể làm đảo thứ tự ngay trong partition.\n\n' +
    'Consumer đơn luồng đọc theo offset thì giữ thứ tự; nếu bạn xử lý message bằng thread pool thì tự phá thứ tự.',
  essence:
    'Thứ tự = thuộc tính của partition + producer cấu hình đúng + consumer xử lý tuần tự trong partition. Vỡ ở bất kỳ mắt xích nào là mất thứ tự.',
  example:
    'Để an toàn thứ tự với throughput: bật `enable.idempotence=true` (cho phép `max.in.flight=5` mà vẫn giữ thứ tự khi retry). Ở consumer, nếu cần song song, chia theo key trong nội bộ để mỗi key vẫn tuần tự.',
},
{
  cat: 'Nền tảng',
  q: 'High watermark và log end offset là gì?',
  answer:
    '**Log End Offset (LEO)**: offset của message kế tiếp sẽ được ghi vào một replica (cuối log của replica đó).\n\n' +
    '**High Watermark (HW)**: offset lớn nhất đã được **replicate tới tất cả replica trong ISR**. Consumer (mặc định) chỉ đọc được tới HW − 1 — gọi là message "committed".\n\n' +
    'Message nằm giữa HW và LEO của leader là "chưa committed": nếu leader chết trước khi ISR bám kịp, chúng có thể bị mất/truncate.',
  essence:
    'LEO là "đã viết tới đâu"; HW là "đã an toàn tới đâu". Consumer chỉ thấy dữ liệu an toàn → không bao giờ đọc message rồi sau đó nó biến mất do failover.',
  example:
    'Leader ở offset 1000, hai follower ISR ở 995 và 998 → HW = 995. Consumer đọc tối đa 994. Nếu leader chết, follower ở 998 lên leader; 5 message 995–999 chưa từng "committed" nên consumer chưa đọc → không có nghịch lý.',
},
{
  cat: 'Nền tảng',
  q: 'So sánh Kafka với AWS Kinesis và Apache Pulsar (tổng quan)?',
  answer:
    '- **Kafka**: partition-based, hệ sinh thái lớn (Connect, Streams, Schema Registry), tự vận hành hoặc managed (MSK, Confluent). Kiểm soát cao, cần vận hành.\n' +
    '- **Kinesis**: fully managed của AWS, khái niệm "shard" ~ partition, giới hạn 1MB/s ghi & 2MB/s đọc mỗi shard, retention tối đa 365 ngày, tích hợp sâu AWS (Lambda, Firehose). Ít việc vận hành, kém linh hoạt và có giới hạn cứng.\n' +
    '- **Pulsar**: tách **compute (broker) và storage (BookKeeper)**, hỗ trợ cả queue lẫn stream, multi-tenancy, geo-replication tích hợp. Kiến trúc phức tạp hơn, cộng đồng nhỏ hơn.',
  essence:
    'Kafka = tiêu chuẩn de-facto với hệ sinh thái mạnh. Kinesis = đổi tính linh hoạt lấy "không phải vận hành" trong AWS. Pulsar = kiến trúc tách tầng, linh hoạt mô hình tiêu thụ.',
  example:
    'Startup toàn AWS, tải vừa, muốn ít ops → Kinesis + Lambda. Công ty cần stream processing phức tạp, đa cloud, throughput lớn, đã có team platform → Kafka (MSK hoặc self-managed).',
},
{
  cat: 'Kiến trúc',
  q: 'Tiered storage (KIP-405) giải quyết vấn đề gì?',
  answer:
    'Mặc định mọi dữ liệu partition nằm trên đĩa local của broker → giữ dữ liệu lâu = cần đĩa lớn, và thêm broker vào cụm phải copy nhiều dữ liệu (rebalance chậm).\n\n' +
    '**Tiered storage**: broker giữ dữ liệu "nóng" (gần đây) trên đĩa local, tự động đẩy segment cũ lên **object storage** (S3, GCS) rẻ hơn. Consumer đọc dữ liệu cũ được phục vụ trong suốt từ tier xa.\n\n' +
    'Có từ Kafka 3.6 (early access) / 3.9+ ổn định hơn; Confluent/AWS MSK đã hỗ trợ.',
  essence:
    'Tách "compute + hot data" khỏi "cold data lưu trữ lâu". Cho phép retention hàng tháng/năm với chi phí object storage, và co giãn cụm nhanh vì broker giữ ít dữ liệu local.',
  example:
    'Yêu cầu tuân thủ: giữ mọi giao dịch 2 năm. Không tiered storage: mỗi broker cần chục TB SSD. Có tiered storage: broker giữ 2 ngày local, phần còn lại trên S3 — chi phí giảm nhiều lần, replay lịch sử vẫn được.',
},
{
  cat: 'Vận hành',
  q: 'Rack awareness trong Kafka là gì?',
  answer:
    'Cấu hình `broker.rack` (ví dụ = availability zone). Khi tạo/reassign partition, Kafka **phân bổ replica trải đều trên các rack** thay vì dồn vào một rack.\n\n' +
    'Nhờ đó mất nguyên một rack/AZ vẫn còn ≥ 1 replica ở rack khác → partition không offline.\n\n' +
    'Kết hợp `replica.selector.class` cho phép consumer đọc từ replica **cùng rack** (follower fetching) để giảm lưu lượng và chi phí cross-AZ.',
  essence:
    'Rack awareness biến RF thành khả năng chịu lỗi *theo miền lỗi vật lý* (AZ), không chỉ theo số broker. Thiếu nó, RF=3 vẫn có thể chết cả 3 replica nếu cùng một AZ sập.',
  example:
    'Cụm 6 broker trên 3 AZ (`broker.rack=us-east-1a/1b/1c`), RF=3 → mỗi partition có đúng 1 replica mỗi AZ. AWS bảo trì AZ 1a → mọi partition vẫn có leader/ISR ở 1b, 1c.',
},
{
  cat: 'Thiết kế',
  q: 'Nên chọn số partition cho một topic như thế nào?',
  answer:
    'Cân nhắc:\n' +
    '- **Throughput mục tiêu / throughput mỗi partition** (đo bằng benchmark, thường 10–50 MB/s hoặc vài chục nghìn msg/s).\n' +
    '- **Song song consumer tối đa mong muốn** — không thể có nhiều consumer hoạt động hơn số partition trong một group.\n' +
    '- Quá nhiều partition: tăng thời gian bầu lại leader khi broker chết, tăng file descriptor và memory, rebalance chậm, độ trễ end-to-end tăng.\n\n' +
    'Kinh nghiệm: bắt đầu vừa phải (ví dụ 12–30), **tăng được** sau này (nhưng key→partition mapping sẽ đổi). Không giảm được.',
  essence:
    'Partition = min(đủ throughput, đủ song song) nhưng đừng thừa. Tăng dễ, giảm không; và tăng phá vỡ tính "cùng key cùng partition" cho dữ liệu đã có.',
  example:
    'Cần 300 MB/s, mỗi partition ~30 MB/s, muốn dự phòng 2x consumer scale → ~20 partition. Đặt 500 partition "cho chắc" khiến cụm nhỏ khởi động chậm và p99 latency xấu.',
},
{
  cat: 'Nền tảng',
  q: '`bootstrap.servers` là gì? Client tìm broker để đọc/ghi như thế nào?',
  answer:
    '`bootstrap.servers` là **danh sách vài broker khởi đầu** (không cần liệt kê hết cụm). Client kết nối tới một trong số đó và gửi **metadata request** → nhận về: danh sách toàn bộ broker, và với mỗi topic-partition thì **leader đang nằm ở broker nào**.\n\n' +
    'Từ đó client kết nối trực tiếp tới broker giữ leader của partition nó cần. Khi leader đổi (`NotLeaderForPartition`), client tự refresh metadata.\n\n' +
    'Nên đưa ≥ 2–3 broker vào list để chịu được việc broker khởi đầu bị chết lúc client start.',
  essence:
    '`bootstrap.servers` chỉ là "cửa vào" để lấy bản đồ cụm. Sau đó client tự định tuyến tới đúng leader partition, không đi qua một proxy trung tâm.',
  example:
    'Đặt `bootstrap.servers=kafka-0:9092,kafka-1:9092,kafka-2:9092`. Nếu chỉ ghi `kafka-0` và node đó đang bảo trì lúc app deploy → app không kết nối được dù cụm vẫn khoẻ.',
},
{
  cat: 'Nền tảng',
  q: 'Một Kafka record gồm những thành phần nào?',
  answer:
    'Mỗi record: **key** (nullable), **value** (nullable — null = tombstone khi compact), **timestamp**, **headers** (list cặp `String → byte[]`), và metadata do broker gán: **topic, partition, offset**.\n\n' +
    '`timestamp` có hai loại theo `message.timestamp.type`:\n' +
    '- `CreateTime` (mặc định): thời điểm producer tạo record.\n' +
    '- `LogAppendTime`: thời điểm broker ghi vào log.\n\n' +
    'Timestamp dùng cho retention theo thời gian, `offsetsForTimes` (tìm offset theo mốc thời gian), và windowing trong Kafka Streams.',
  essence:
    'Record = (key, value, timestamp, headers) do producer đặt + (topic, partition, offset) do broker gán. Timestamp là trục thời gian cho retention và stream processing.',
  example:
    'Replay sự kiện từ 14:00 hôm qua: `consumer.offsetsForTimes(Map.of(tp, ts))` trả offset đầu tiên có timestamp ≥ ts, rồi `seek` tới đó. Chỉ hoạt động đúng nếu producer dùng `CreateTime` hợp lý (không phải giờ lệch).',
},
{
  cat: 'Nền tảng',
  q: 'Những use case điển hình của Kafka?',
  answer:
    '- **Messaging / decoupling** giữa microservice (thay REST call trực tiếp).\n' +
    '- **Event sourcing**: log sự kiện là nguồn sự thật, dựng lại state bằng cách replay.\n' +
    '- **CDC (Change Data Capture)**: Debezium đọc binlog DB → phát sự kiện thay đổi.\n' +
    '- **Stream processing**: Kafka Streams / Flink tính toán realtime (aggregation, join, alerting).\n' +
    '- **Log & metrics aggregation**: gom log từ nhiều service.\n' +
    '- **Data integration**: Kafka Connect làm "xương sống" đổ dữ liệu giữa DB, search, data lake.',
  essence:
    'Kafka là "hệ thần kinh trung ương" cho dữ liệu chuyển động: mọi thay đổi trở thành sự kiện, nhiều hệ tiêu thụ độc lập, có thể tua lại.',
  example:
    'CDC: đơn hàng ghi vào Postgres → Debezium phát `orders` topic → sink connector nạp vào Elasticsearch (tìm kiếm) + Snowflake (BI) + service gợi ý. Không service nào phải gọi trực tiếp DB của service khác.',
},
]);
