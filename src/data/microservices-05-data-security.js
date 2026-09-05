SS.addQuestions('microservices', [
{
  cat: 'Dữ liệu',
  id: 'microservices-1clpab1',
  q: 'CQRS là gì? Khi nào dùng trong microservices?',
  answer:
    '**CQRS** (Command Query Responsibility Segregation): tách **model ghi** (command — thay đổi state) khỏi **model đọc** (query — trả dữ liệu).\n\n' +
    '- Write side: model chuẩn hoá, enforce invariant, tối ưu cho tính đúng.\n' +
    '- Read side: một hoặc nhiều **read model** (materialized view) được dựng từ event của write side, tối ưu cho từng truy vấn cụ thể (denormalized, đúng shape UI cần).\n\n' +
    'Dùng khi: pattern đọc và ghi **khác nhau nhiều**; cần scale đọc độc lập; query cần data từ nhiều service (dựng read model từ nhiều nguồn event). KHÔNG dùng cho CRUD đơn giản — nó thêm phức tạp và eventual consistency.',
  essence:
    'CQRS thừa nhận "đọc và ghi là hai bài toán khác nhau" và cho phép tối ưu riêng. Trong microservices, read model là cách trả lời query xuyên service mà không JOIN và không call chuỗi lúc request.',
  example:
    '`order-service` (write) enforce quy tắc đặt hàng. `order-history-service` (read) lắng nghe `OrderPlaced`, `OrderShipped`, `OrderCancelled` + `CustomerUpdated` từ customer-service → dựng bảng `order_summary(orderId, customerName, status, total, ...)`. Trang "đơn hàng của tôi" query một bảng, một service, latency ms.',
  viz: {
    type: 'flow',
    title: '"Đọc và ghi là hai bài toán khác nhau" — tối ưu riêng',
    nodes: ['Write side: model chuẩn hoá, enforce invariant', 'Phát event khi state đổi', 'Read side: read model (materialized view) từ event', 'Query = SELECT một bảng, đúng shape UI'],
    steps: [
      { to: 0, label: 'Tối ưu cho tính đúng' },
      { to: 2, label: 'Dựng read model từ event của nhiều service — không JOIN, không call chuỗi lúc request' },
      { to: 3, label: 'Đổi lại: eventual consistency. KHÔNG dùng cho CRUD đơn giản' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tách mô hình GHI khỏi mô hình ĐỌC",
      code:
        "// COMMAND — mô hình ghi: chuẩn hoá, có ràng buộc, tối ưu cho tính đúng đắn\n" +
        "@Service\n" +
        "public class OrderCommandService {\n" +
        "    @Transactional\n" +
        "    public void place(PlaceOrderCommand cmd) {\n" +
        "        Order order = Order.create(cmd);      // aggregate với đầy đủ quy tắc\n" +
        "        orderRepo.save(order);\n" +
        "        outbox.save(new OrderPlaced(order));  // phát event để dựng read model\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// QUERY — mô hình đọc: PHI CHUẨN HOÁ, tối ưu cho đúng màn hình cần hiển thị\n" +
        "@Service\n" +
        "public class OrderQueryService {\n" +
        "    public List<OrderListView> search(SearchCriteria c) {\n" +
        "        // Đọc từ bảng/kho ĐÃ TỔNG HỢP SẴN — không join, không tính toán\n" +
        "        return jdbc.query(\"\"\"\n" +
        "            SELECT id, customer_name, total, status, item_count\n" +
        "            FROM order_list_view\n" +
        "            WHERE status = ? ORDER BY created_at DESC LIMIT ?\n" +
        "            \"\"\", mapper, c.status(), c.limit());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// READ MODEL được cập nhật từ event:\n" +
        "@KafkaListener(topics = \"order-events\")\n" +
        "public void project(OrderPlaced e) {\n" +
        "    jdbc.update(\"\"\"\n" +
        "        INSERT INTO order_list_view (id, customer_name, total, status, item_count)\n" +
        "        VALUES (?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status\n" +
        "        \"\"\", e.orderId(), e.customerName(), e.total(), e.status(), e.itemCount());\n" +
        "}\n" +
        "\n" +
        "// KHI NÀO DÙNG:\n" +
        "//  - tỉ lệ đọc/ghi rất lệch, và truy vấn đọc phức tạp\n" +
        "//  - cần TRUY VẤN XUYÊN SERVICE (đây là lý do phổ biến nhất trong microservices)\n" +
        "//  - mô hình đọc và ghi khác nhau về bản chất\n" +
        "// KHI NÀO KHÔNG: CRUD đơn giản -> CQRS chỉ thêm phức tạp và độ trễ đồng bộ.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-1fic5k7',
  q: 'Event Sourcing là gì? Ưu và nhược điểm?',
  answer:
    'Thay vì lưu **trạng thái hiện tại**, lưu **chuỗi event** (mọi thay đổi) là nguồn sự thật. State hiện tại = fold/replay các event. Có thể chụp **snapshot** định kỳ để replay nhanh.\n\n' +
    'Ưu: audit trail đầy đủ & miễn phí; "time travel" (state tại bất kỳ thời điểm); dựng được read model mới bằng replay; hợp tự nhiên với event-driven; debug "tại sao state thành thế này".\n\n' +
    'Nhược: đường cong học dốc; query phức tạp (cần projection); versioning event schema khó; xoá dữ liệu (GDPR) khó — event là append-only; eventual consistency; công cụ/DB chuyên dụng (EventStoreDB, hoặc Kafka + KTable).',
  essence:
    'Event sourcing đổi "biết state bây giờ" lấy "biết toàn bộ lịch sử làm sao đến state này". Cực mạnh cho domain cần audit/temporal (tài chính, y tế), nhưng là công cụ chuyên dụng — đừng dùng mặc định.',
  example:
    'Tài khoản ngân hàng: thay vì cột `balance`, lưu event `Deposited(100)`, `Withdrawn(30)`, `Deposited(50)`. Balance = 120 (fold). Kiểm toán hỏi "số dư ngày 15/6" → replay tới ngày đó. Phát hiện bug tính phí → sửa projection, replay lại toàn bộ.',
  viz: {
    type: 'tree',
    title: 'Đổi "biết state bây giờ" lấy "biết toàn bộ lịch sử" — công cụ chuyên dụng',
    root: {
      label: 'Lưu chuỗi event là nguồn sự thật; state = fold/replay (+ snapshot)',
      children: [
        { label: 'Ưu: audit trail đầy đủ & miễn phí', note: '"time travel" — state tại bất kỳ thời điểm' },
        { label: 'Ưu: dựng read model mới bằng replay', note: 'hợp tự nhiên với event-driven' },
        { label: 'Nhược: query phức tạp (cần projection)', note: 'versioning event schema khó' },
        { label: 'Nhược: xoá dữ liệu (GDPR) khó', note: 'event append-only; cần DB chuyên dụng (EventStoreDB / Kafka+KTable)' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Lưu SỰ KIỆN, không lưu trạng thái",
      code:
        "// Trạng thái hiện tại được TÍNH RA bằng cách phát lại toàn bộ sự kiện.\n" +
        "public class Order {\n" +
        "    private String id;\n" +
        "    private OrderStatus status;\n" +
        "    private final List<Item> items = new ArrayList<>();\n" +
        "    private long version;\n" +
        "\n" +
        "    public static Order rebuild(List<DomainEvent> history) {\n" +
        "        Order o = new Order();\n" +
        "        history.forEach(o::apply);           // phát lại từ đầu\n" +
        "        return o;\n" +
        "    }\n" +
        "    private void apply(DomainEvent e) {\n" +
        "        switch (e) {\n" +
        "            case OrderCreated c -> { this.id = c.orderId(); this.status = NEW; }\n" +
        "            case ItemAdded a    -> items.add(a.item());\n" +
        "            case OrderPaid p    -> this.status = PAID;\n" +
        "            case OrderShipped s -> this.status = SHIPPED;\n" +
        "            default -> throw new IllegalStateException(\"event lạ: \" + e);\n" +
        "        }\n" +
        "        this.version++;\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// SNAPSHOT — bắt buộc khi lịch sử dài, nếu không mỗi lần đọc phải phát lại\n" +
        "// hàng nghìn event:\n" +
        "public Order load(String id) {\n" +
        "    Snapshot s = snapshotRepo.latest(id);                    // ảnh chụp gần nhất\n" +
        "    List<DomainEvent> after = eventStore.since(id, s.version());\n" +
        "    return Order.fromSnapshot(s).applyAll(after);            // chỉ phát lại phần sau\n" +
        "}\n" +
        "\n" +
        "// ƯU: lịch sử ĐẦY ĐỦ (audit hoàn hảo), quay lại trạng thái bất kỳ thời điểm\n" +
        "// nào, dựng được read model MỚI từ lịch sử cũ (rất mạnh khi đổi yêu cầu),\n" +
        "// và bản thân event là cơ chế tích hợp với service khác.\n" +
        "\n" +
        "// NHƯỢC (nghiêm trọng, đừng đánh giá thấp):\n" +
        "//  - TIẾN HOÁ SCHEMA EVENT: event cũ tồn tại VĨNH VIỄN, phải đọc được mãi\n" +
        "//  - truy vấn cần CQRS -> luôn có độ trễ đồng bộ\n" +
        "//  - đường học dốc, và rất khó quay lui khi đã chọn\n" +
        "//  - GDPR \"quyền được quên\" xung đột với log bất biến (phải mã hoá và xoá khoá)\n" +
        "\n" +
        "// -> Chỉ dùng cho miền THỰC SỰ cần lịch sử: kế toán, giao dịch, kiểm toán.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-s9d3pf',
  q: 'Shared database giữa các service — vì sao là anti-pattern?',
  answer:
    'Nhiều service đọc/ghi chung một database (hoặc cùng bảng).\n\n' +
    'Vấn đề:\n' +
    '- **Schema trở thành API ngầm không có contract**: đổi bảng làm hỏng service khác, không biết ai đang phụ thuộc.\n' +
    '- **Không deploy độc lập**: migration phải phối hợp.\n' +
    '- **Coupling runtime**: lock, transaction, connection pool tranh chấp giữa các service.\n' +
    '- **Không chọn được công nghệ lưu trữ** riêng.\n' +
    '- Mất ranh giới sở hữu dữ liệu → "ai chịu trách nhiệm tính đúng của bảng này?".\n\n' +
    'Đây là dấu hiệu #1 của distributed monolith.',
  essence:
    'Database riêng là *định nghĩa* của service độc lập. Chia sẻ DB = giữ coupling chặt nhất (dữ liệu) trong khi mất tính đơn giản của monolith. Tệ cả đôi đường.',
  example:
    '`order-service` và `reporting-service` cùng đọc bảng `orders`. Team order thêm cột NOT NULL → reporting-service (không biết) crash khi insert. Sửa: order-service sở hữu `orders`, phát event; reporting-service giữ bản sao của riêng nó hoặc query qua API.',
  viz: {
    type: 'tree',
    title: 'Dấu hiệu #1 của distributed monolith',
    root: {
      label: 'Chia sẻ DB = coupling chặt nhất (dữ liệu) + mất tính đơn giản của monolith',
      children: [
        { label: 'Schema thành API ngầm không có contract', note: 'đổi bảng làm hỏng service khác, không biết ai phụ thuộc' },
        { label: 'Không deploy độc lập', note: 'migration phải phối hợp' },
        { label: 'Coupling runtime', note: 'lock, transaction, connection pool tranh chấp' },
        { label: 'Không chọn được công nghệ lưu trữ riêng', note: '' },
        { label: 'Mất ranh giới sở hữu', note: '"ai chịu trách nhiệm tính đúng của bảng này?"' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Ranh giới bị phá từ mọi phía",
      code:
        "-- Hai service cùng đọc/ghi một bảng:\n" +
        "--   order-service:    INSERT INTO orders ...\n" +
        "--   reporting-service: SELECT * FROM orders JOIN ...\n" +
        "--   legacy-batch:      UPDATE orders SET status = \u0027X\u0027 ...\n" +
        "\n" +
        "-- BỐN HẬU QUẢ:\n" +
        "-- 1) KHÔNG DEPLOY ĐỘC LẬP: đổi một cột là phải phối hợp mọi service.\n" +
        "ALTER TABLE orders RENAME COLUMN total TO total_amount;   -- vỡ mọi service khác\n" +
        "\n" +
        "-- 2) KHÔNG AI SỞ HỮU quy tắc nghiệp vụ: mỗi service ghi theo cách của mình,\n" +
        "--    và ràng buộc chỉ có ở tầng ứng dụng thì bị bỏ qua từ đường khác.\n" +
        "\n" +
        "-- 3) TRANH CHẤP KHOÁ và hiệu năng: một service chạy báo cáo nặng làm chậm\n" +
        "--    service giao dịch.\n" +
        "\n" +
        "-- 4) KHÔNG chọn được công nghệ lưu trữ phù hợp cho từng service.\n" +
        "\n" +
        "-- CÁCH CHỮA — theo thứ tự thực hiện:\n" +
        "-- Bước 1: tách QUYỀN trước, để lộ ra ai đang đọc gì\n" +
        "CREATE SCHEMA orders;\n" +
        "ALTER TABLE public.orders SET SCHEMA orders;\n" +
        "GRANT USAGE ON SCHEMA orders TO order_service;\n" +
        "REVOKE ALL ON SCHEMA orders FROM reporting_service;     -- lỗi sẽ chỉ ra người dùng\n" +
        "\n" +
        "-- Bước 2: cung cấp API hoặc EVENT cho những người đang đọc trực tiếp\n" +
        "-- Bước 3: chuyển họ sang dùng API/event\n" +
        "-- Bước 4: tách hẳn sang database riêng\n" +
        "\n" +
        "-- NGOẠI LỆ CHẤP NHẬN ĐƯỢC: dùng chung một CỤM database nhưng KHÁC SCHEMA\n" +
        "-- và KHÁC USER, không service nào truy cập schema của service khác.\n" +
        "-- Điều này tiết kiệm chi phí vận hành mà vẫn giữ được ranh giới.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-1l06zfs',
  q: 'Anti-Corruption Layer (ACL) khi tích hợp với hệ legacy?',
  answer:
    'Khi service mới phải tích hợp với hệ thống cũ (legacy monolith, hệ đối tác) có mô hình domain xấu/khác biệt, đừng để mô hình đó "rò rỉ" vào service mới.\n\n' +
    '**ACL** = một lớp dịch thuật đặt giữa: nó nhận dữ liệu/API của hệ ngoài và **chuyển đổi** sang mô hình sạch của domain bạn (và ngược lại). Bên trong service bạn chỉ làm việc với mô hình của mình.\n\n' +
    'ACL có thể là: một module trong service, hoặc một service riêng (adapter service).',
  essence:
    'ACL bảo vệ mô hình domain sạch của bạn khỏi sự lây nhiễm của mô hình xấu bên ngoài. Chi phí dịch thuật ở một chỗ, đổi lấy việc phần còn lại của service không dính "nợ" của hệ legacy.',
  example:
    'Service `pricing` mới phải lấy dữ liệu từ ERP cũ (SOAP, field tên `CUST_PRC_GRP_CD`, ngày dạng `YYYYMMDD`, giá là string). ACL: một `ErpPricingClient` gọi SOAP, parse, chuyển thành `PriceGroup` enum + `LocalDate` + `Money`. Phần `pricing` còn lại không biết ERP tồn tại.',
  viz: {
    type: 'flow',
    title: 'Chi phí dịch thuật ở một chỗ — phần còn lại không dính "nợ" legacy',
    nodes: ['Hệ ngoài (legacy / đối tác): model xấu, khác biệt', 'ACL: lớp dịch thuật', 'Mô hình domain sạch của bạn'],
    steps: [
      { to: 0, label: 'SOAP, CUST_PRC_GRP_CD, ngày YYYYMMDD, giá là string' },
      { to: 1, label: 'ErpPricingClient: gọi, parse, chuyển đổi hai chiều' },
      { to: 2, label: 'PriceGroup enum + LocalDate + Money — service không biết ERP tồn tại' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Lớp dịch để mô hình bẩn không lan vào trong",
      code:
        "// VẤN ĐỀ: hệ legacy có mô hình dữ liệu kỳ quặc (viết tắt khó hiểu, cờ dạng\n" +
        "// chuỗi, ngày dạng \"yyyyMMdd\", trường dùng lại cho nhiều mục đích).\n" +
        "// Nếu để nó lan vào domain model của mình, sự kỳ quặc đó sẽ nhiễm khắp code.\n" +
        "\n" +
        "// LỚP CHỐNG NHIỄM: dịch giữa hai mô hình, và chỉ nó biết về hệ legacy.\n" +
        "@Component\n" +
        "public class LegacyCustomerAdapter implements CustomerRepository {\n" +
        "    private final LegacySoapClient legacy;\n" +
        "\n" +
        "    @Override\n" +
        "    public Optional<Customer> findById(CustomerId id) {\n" +
        "        LegacyCustDTO dto = legacy.getCust(id.value());     // mô hình BẨN\n" +
        "        if (dto == null || \"9\".equals(dto.getStatCd())) return Optional.empty();\n" +
        "        return Optional.of(translate(dto));                 // -> mô hình SẠCH\n" +
        "    }\n" +
        "\n" +
        "    private Customer translate(LegacyCustDTO dto) {\n" +
        "        return new Customer(\n" +
        "            new CustomerId(dto.getCustNo()),\n" +
        "            new PersonName(dto.getFnm(), dto.getLnm()),        // fnm/lnm -> tên rõ ràng\n" +
        "            parseDate(dto.getRegDt()),                          // \"20260905\" -> LocalDate\n" +
        "            mapTier(dto.getTierCd()),                           // \"01\" -> Tier.GOLD\n" +
        "            \"Y\".equals(dto.getActFlg())                         // \"Y\"/\"N\" -> boolean\n" +
        "        );\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// DOMAIN KHÔNG BAO GIỜ thấy LegacyCustDTO:\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final CustomerRepository customers;    // interface SẠCH\n" +
        "    public void place(CreateOrder req) {\n" +
        "        Customer c = customers.findById(req.customerId()).orElseThrow();\n" +
        "        if (c.tier() == Tier.GOLD) applyDiscount();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: thay hệ legacy sau này chỉ cần viết adapter mới; domain không\n" +
        "// đổi một dòng. Và mọi sự kỳ quặc bị NHỐT ở một chỗ, có thể test riêng.\n" +
        "// ACL cũng là nơi đặt retry, circuit breaker và cache cho hệ legacy chậm.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-l4li88',
  q: 'Tách một bảng ra service riêng — migrate dữ liệu thế nào?',
  answer:
    'Không "cắt" một phát. Các bước (mở rộng của strangler):\n' +
    '1. **Tạo service mới** với DB riêng, API đầy đủ, nhưng chưa ai dùng.\n' +
    '2. **Đồng bộ dữ liệu**: CDC từ bảng cũ → service mới (hoặc dual-write có kiểm soát). Backfill dữ liệu lịch sử.\n' +
    '3. **Chuyển đọc**: các consumer dần chuyển sang gọi API service mới (feature flag), so sánh kết quả với đường cũ (shadow read).\n' +
    '4. **Chuyển ghi**: consumer ghi qua service mới; service mới là nguồn sự thật; bảng cũ thành read-only rồi bỏ.\n' +
    '5. Dọn: xoá code/bảng cũ.\n\n' +
    'Mỗi bước có thể dừng/quay lui. Luôn có giai đoạn hai nguồn chạy song song + đối soát.',
  essence:
    'Migrate dữ liệu trong microservices là một quá trình nhiều tuần với các giai đoạn "hai nguồn song song", không phải một script chạy một lần. Đối soát (reconciliation) là bắt buộc để tin tưởng đường mới.',
  example:
    'Tách `inventory` khỏi monolith: (1) `inventory-service` + Postgres riêng; (2) Debezium CDC từ bảng `stock` của monolith → inventory-service; (3) monolith gọi API inventory-service để đọc tồn kho (flag), so với đọc DB trực tiếp; (4) chuyển ghi; (5) sau 1 tháng ổn định, drop bảng `stock`.',
  viz: {
    type: 'flow',
    title: 'Quá trình nhiều tuần với "hai nguồn song song" — không một script',
    nodes: ['Tạo service mới + DB riêng (chưa ai dùng)', 'Đồng bộ: CDC + backfill lịch sử', 'Chuyển đọc (flag, shadow read + so sánh)', 'Chuyển ghi — service mới là nguồn sự thật', 'Dọn: xoá code/bảng cũ'],
    steps: [
      { to: 1, label: 'Debezium CDC từ bảng cũ → service mới' },
      { to: 2, label: 'Consumer dần chuyển sang API mới; đối soát kết quả với đường cũ' },
      { to: 3, label: 'Bảng cũ thành read-only rồi bỏ' },
      { to: 4, label: 'Mỗi bước có thể dừng/quay lui' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Quy trình sáu bước, không downtime",
      code:
        "-- BƯỚC 1: TÁCH CODE TRƯỚC, giữ nguyên database.\n" +
        "--   Mọi truy cập bảng orders đi qua một lớp repository duy nhất trong monolith.\n" +
        "--   Đây là bước quan trọng nhất và cũng dễ bị bỏ qua nhất.\n" +
        "\n" +
        "-- BƯỚC 2: DỰNG SERVICE MỚI với database riêng, và ĐỒNG BỘ dữ liệu\n" +
        "--   Dùng CDC (Debezium) đọc WAL của DB cũ -> ghi sang DB mới. Không đụng\n" +
        "--   vào code monolith, không thêm tải cho DB cũ.\n" +
        "CREATE PUBLICATION orders_pub FOR TABLE orders;\n" +
        "SELECT pg_create_logical_replication_slot(\u0027orders_slot\u0027, \u0027pgoutput\u0027);\n" +
        "\n" +
        "-- BƯỚC 3: ĐỌC SONG SONG và SO SÁNH (shadow read) — bước giảm rủi ro chính\n" +
        "--   Monolith vẫn đọc DB cũ để trả về, đồng thời gọi service mới và\n" +
        "--   SO SÁNH kết quả, ghi log khi lệch. Chạy vài ngày tới khi tỉ lệ lệch = 0.\n" +
        "\n" +
        "-- BƯỚC 4: CHUYỂN ĐỌC sang service mới (theo tỉ lệ: 1% -> 10% -> 100%)\n" +
        "\n" +
        "-- BƯỚC 5: CHUYỂN GHI sang service mới. Đây là bước KHÓ NHẤT vì phải\n" +
        "--   nguyên tử. Cách an toàn: chuyển ghi rồi đồng bộ NGƯỢC (DB mới -> DB cũ)\n" +
        "--   trong một thời gian để còn đường lui.\n" +
        "\n" +
        "-- BƯỚC 6: NGỪNG đồng bộ, XOÁ bảng cũ (sau khi đã sao lưu và chờ đủ lâu).\n" +
        "ALTER TABLE orders RENAME TO orders_deprecated;   -- đổi tên trước, xoá sau\n" +
        "-- Đổi tên trước giúp phát hiện code còn sót đang dùng bảng này.\n" +
        "\n" +
        "-- HAI ĐIỂM KHÓ NHẤT:\n" +
        "--  a) KHOÁ NGOẠI xuyên ranh giới: phải bỏ FK và chuyển sang kiểm tra ở\n" +
        "--     tầng ứng dụng hoặc chấp nhận nhất quán cuối cùng.\n" +
        "--  b) TRANSACTION xuyên bảng cũ và mới trong giai đoạn chuyển tiếp\n" +
        "--     -> dùng outbox/saga, đừng cố giữ transaction chung.",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'microservices-1fgeomm',
  q: 'Token propagation: khi service A gọi B thay mặt user?',
  answer:
    'Request người dùng vào gateway với một access token (JWT/OAuth2). Khi service A cần gọi service B để hoàn thành request đó, B cần biết cả "user nào" và "service nào" đang gọi.\n\n' +
    'Cách:\n' +
    '- **Token forwarding**: A truyền tiếp nguyên token của user trong header `Authorization` xuống B. Đơn giản nhưng token có scope rộng, TTL của user token.\n' +
    '- **Token Exchange** (RFC 8693): A đổi token user lấy một token mới, scope hẹp hơn, dành riêng cho gọi B ("A gọi B thay mặt user X, chỉ để đọc order").\n' +
    '- **On-behalf-of**: tương tự, kèm cả danh tính service A và user X.\n\n' +
    'Kèm service-to-service auth (mTLS) để xác thực chính service A.',
  essence:
    'Trong chuỗi call, mỗi service cần đủ context để **tự phân quyền** (user + client + scope). Forwarding đơn giản; token exchange an toàn hơn (least privilege, không lộ token gốc quá sâu).',
  example:
    'User gọi `GET /orders/5` → gateway verify JWT → `order-service`. order-service cần địa chỉ giao từ `customer-service`: token exchange lấy token scope `customer:read` cho user đó → gọi `customer-service` → customer-service kiểm tra "user X có được xem địa chỉ của customer trong order 5 không".',
  viz: {
    type: 'compare',
    corner: 'Cách',
    cols: ['Token forwarding', 'Token Exchange (RFC 8693)', 'On-behalf-of'],
    rows: [
      ['Cách làm', 'A truyền tiếp nguyên token user xuống B', 'A đổi token user lấy token mới, scope hẹp cho gọi B', 'như exchange, kèm danh tính A + user X'],
      ['Scope', 'rộng (của user token)', 'hẹp ("chỉ đọc order")', 'hẹp + rõ chủ thể'],
      ['An toàn', 'token gốc lộ sâu', 'least privilege, không lộ token gốc', 'least privilege + truy vết'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Truyền danh tính người dùng xuống chuỗi",
      code:
        "// VẤN ĐỀ: service B cần biết NGƯỜI DÙNG nào đang thao tác, không chỉ biết\n" +
        "// \"service A gọi tôi\" — để kiểm tra quyền và ghi audit.\n" +
        "\n" +
        "// CÁCH 1: TRUYỀN THẲNG token của người dùng (đơn giản nhất)\n" +
        "@Bean\n" +
        "RestClient orderClient() {\n" +
        "    return RestClient.builder()\n" +
        "        .requestInterceptor((req, body, ex) -> {\n" +
        "            var auth = SecurityContextHolder.getContext().getAuthentication();\n" +
        "            if (auth instanceof JwtAuthenticationToken jwt) {\n" +
        "                req.getHeaders().setBearerAuth(jwt.getToken().getTokenValue());\n" +
        "            }\n" +
        "            return ex.execute(req, body);\n" +
        "        }).build();\n" +
        "}\n" +
        "// + đơn giản, B kiểm tra quyền của chính người dùng\n" +
        "// - token có scope RỘNG đi khắp hệ thống; B bị chiếm là có token của user\n" +
        "// - token hết hạn giữa chuỗi call dài\n" +
        "\n" +
        "// CÁCH 2: TOKEN EXCHANGE (RFC 8693) — an toàn hơn\n" +
        "// A đổi token của user lấy một token MỚI, scope HẸP, chỉ dùng để gọi B:\n" +
        "//   POST /token\n" +
        "//   grant_type=urn:ietf:params:oauth:grant-type:token-exchange\n" +
        "//   subject_token=<token của user>\n" +
        "//   audience=payment-service\n" +
        "//   scope=payments:write\n" +
        "// -> token mới chỉ gọi được payment-service, chỉ với quyền cần thiết.\n" +
        "\n" +
        "// CÁCH 3: mTLS cho danh tính SERVICE + header mang danh tính USER\n" +
        "//   (chỉ dùng khi mạng đã zero-trust và header không thể giả mạo từ ngoài)\n" +
        "\n" +
        "// LƯU Ý CHUNG:\n" +
        "//  - KHÔNG bao giờ log token\n" +
        "//  - luôn kiểm tra QUYỀN ở service ĐÍCH, đừng tin rằng gateway đã kiểm tra\n" +
        "//    (defense in depth)\n" +
        "//  - truyền được cả qua message: đưa vào header của message, không vào payload",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'microservices-fj37el',
  q: 'Authorization tập trung (OPA) vs phân tán trong từng service?',
  answer:
    '**Trong từng service**: mỗi service tự chứa logic "ai được làm gì". Gần domain, không có điểm nghẽn, nhưng logic phân quyền rải rác, khó audit toàn cục, dễ lệch.\n\n' +
    '**Tập trung — Policy as Code** (Open Policy Agent): policy viết bằng Rego, deploy như một sidecar/library cạnh mỗi service. Service hỏi OPA "user X có được làm action Y trên resource Z?" → OPA trả allow/deny dựa trên policy chung.\n' +
    '- Policy quản lý tập trung, version hoá, test được, audit được.\n' +
    '- Quyết định vẫn ở **cạnh service** (OPA local) → không thêm network hop, không điểm lỗi trung tâm.\n\n' +
    'Thực tế phổ biến: **coarse-grained** (RBAC theo role) ở gateway/OPA; **fine-grained** (user này có phải chủ order này không) trong service vì nó cần domain data.',
  essence:
    'Tách "policy" (quy tắc, quản lý tập trung) khỏi "enforcement" (thực thi tại chỗ, phi tập trung). OPA cho bạn cả hai: một nguồn policy, thực thi cạnh mỗi service.',
  example:
    'OPA policy: "user role `support` được `read` mọi order nhưng không `refund` quá 1 triệu". `order-service` gọi OPA local với `{user, action: "refund", order: {amount}}` → deny nếu amount > 1M. Policy này áp cho mọi service, sửa một chỗ.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Trong từng service', 'Tập trung — OPA (policy as code)'],
    rows: [
      ['Logic phân quyền', 'rải rác, dễ lệch', 'một nguồn: Rego, version hoá, test được'],
      ['Audit toàn cục', 'khó', 'dễ'],
      ['Nơi quyết định', 'trong code service', 'cạnh service (OPA local) — không network hop, không điểm lỗi trung tâm'],
      ['Thực tế', 'fine-grained (chủ resource này?) cần domain data → ở service', 'coarse-grained (RBAC theo role) ở gateway/OPA'],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Chính sách viết bằng Rego, tách khỏi code",
      code:
        "# OPA (Open Policy Agent) tách QUYẾT ĐỊNH phân quyền khỏi code nghiệp vụ.\n" +
        "# Chính sách viết bằng Rego, quản lý như code, deploy độc lập.\n" +
        "package authz\n" +
        "\n" +
        "default allow = false\n" +
        "\n" +
        "# Admin làm được mọi thứ\n" +
        "allow {\n" +
        "  input.user.roles[_] == \"admin\"\n" +
        "}\n" +
        "\n" +
        "# Người dùng đọc được đơn hàng CỦA CHÍNH MÌNH\n" +
        "allow {\n" +
        "  input.method == \"GET\"\n" +
        "  input.path = [\"orders\", order_id]\n" +
        "  input.user.id == data.orders[order_id].customer_id\n" +
        "}\n" +
        "\n" +
        "# Nhân viên cùng phòng ban, trong giờ làm việc\n" +
        "allow {\n" +
        "  input.user.department == data.orders[input.path[1]].department\n" +
        "  time.clock(time.now_ns())[0] >= 8\n" +
        "  time.clock(time.now_ns())[0] < 18\n" +
        "}",
    },
    {
      lang: "java",
      title: "Gọi OPA và so sánh hai mô hình",
      code:
        "// OPA chạy như SIDECAR -> gọi qua localhost, độ trễ dưới 1ms\n" +
        "@Component\n" +
        "public class OpaAuthorizer {\n" +
        "    public boolean allow(AuthzInput input) {\n" +
        "        var res = restClient.post()\n" +
        "            .uri(\"http://localhost:8181/v1/data/authz/allow\")\n" +
        "            .body(Map.of(\"input\", input))\n" +
        "            .retrieve().body(OpaResponse.class);\n" +
        "        return res.result();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// TẬP TRUNG (OPA):\n" +
        "//  + chính sách ở MỘT chỗ, audit và review được, đổi không cần deploy service\n" +
        "//  + nhất quán giữa mọi service, dùng được với mọi ngôn ngữ\n" +
        "//  - thêm một thành phần phải vận hành; sidecar tốn tài nguyên\n" +
        "//  - chính sách phức tạp khó gỡ rối; cần đồng bộ DỮ LIỆU vào OPA\n" +
        "\n" +
        "// PHÂN TÁN (mỗi service tự kiểm tra):\n" +
        "@PreAuthorize(\"hasRole(\u0027ADMIN\u0027) or #userId == authentication.principal.id\")\n" +
        "public Order get(String userId, String orderId) { }\n" +
        "//  + đơn giản, nhanh, dùng được dữ liệu nội bộ của service\n" +
        "//  - logic trùng lặp và dễ LỆCH nhau giữa các service\n" +
        "//  - đổi chính sách phải deploy lại\n" +
        "\n" +
        "// THỰC TẾ: quyền THÔ (vai trò, tenant, scope) -> tập trung ở gateway/OPA.\n" +
        "// Quyền TINH gắn với dữ liệu nghiệp vụ (\"đơn này có phải của anh không\")\n" +
        "// -> để trong service, vì chỉ nó có dữ liệu đó.",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'microservices-s0n601',
  q: 'API Gateway auth vs per-service auth — chia trách nhiệm thế nào?',
  answer:
    '**Ở Gateway** (edge):\n' +
    '- Xác thực (verify JWT signature, expiry, issuer) — làm một lần, service tin tưởng.\n' +
    '- Coarse authorization (role có được chạm nhóm endpoint này không).\n' +
    '- Rate limiting, quota, chống abuse, WAF.\n\n' +
    '**Trong service** (không bỏ qua — defense in depth):\n' +
    '- **Fine-grained authorization** cần domain data: "user này có phải chủ resource này?", "đơn hàng này thuộc tenant của user?".\n' +
    '- Không tin mù header từ gateway (zero-trust) — vẫn verify token hoặc dùng mTLS + signed context.\n\n' +
    'Gateway giảm tải phần chung; service giữ phần chỉ nó biết.',
  essence:
    'Gateway lo "bạn là ai và có được vào khu vực này không". Service lo "bạn có được động vào *đúng cái này* không" — vì chỉ service mới biết dữ liệu để quyết định. Cả hai lớp, không lớp nào tin lớp kia tuyệt đối.',
  example:
    'Gateway: verify JWT, chặn nếu không có role `customer`. `order-service` nhận `GET /orders/5`: kiểm tra `order.customerId == jwt.sub` → deny 403 nếu user cố xem đơn của người khác (dù đã qua gateway). IDOR attack bị chặn ở tầng service.',
  viz: {
    type: 'compare',
    corner: 'Trách nhiệm',
    cols: ['Ở Gateway (edge)', 'Trong service (defense in depth)'],
    rows: [
      ['Câu hỏi', '"bạn là ai, có được vào khu vực này không"', '"bạn có được động vào ĐÚNG cái này không"'],
      ['Xác thực', 'verify JWT signature/expiry/issuer — một lần', 'không tin mù header — vẫn verify token hoặc mTLS + signed context'],
      ['Authorization', 'coarse (role chạm nhóm endpoint)', 'fine-grained cần domain data ("user này là chủ resource?")'],
      ['Thêm', 'rate limit, quota, WAF', 'chặn IDOR (order.customerId == jwt.sub)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Gateway xác thực, service phân quyền",
      code:
        "// GATEWAY — XÁC THỰC (authentication): \"anh là ai?\"\n" +
        "//  - verify chữ ký JWT, kiểm tra hạn, kiểm tra issuer\n" +
        "//  - từ chối token sai/hết hạn NGAY ở biên -> service không phải làm lại\n" +
        "//  - có thể đổi token bên ngoài lấy token nội bộ\n" +
        "\n" +
        "// SERVICE — PHÂN QUYỀN (authorization): \"anh được làm gì với TÀI NGUYÊN NÀY?\"\n" +
        "@RestController\n" +
        "public class OrderController {\n" +
        "    @GetMapping(\"/orders/{id}\")\n" +
        "    @PreAuthorize(\"hasAuthority(\u0027SCOPE_orders:read\u0027)\")     // quyền thô\n" +
        "    public Order get(@PathVariable String id,\n" +
        "                     @AuthenticationPrincipal Jwt jwt) {\n" +
        "        Order order = service.find(id);\n" +
        "        // QUYỀN TINH — chỉ service này có đủ dữ liệu để quyết định:\n" +
        "        if (!order.customerId().equals(jwt.getSubject()) && !isAdmin(jwt))\n" +
        "            throw new AccessDeniedException(\"không phải đơn của bạn\");\n" +
        "        return order;\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// VÌ SAO SERVICE VẪN PHẢI KIỂM TRA dù gateway đã làm (defense in depth):\n" +
        "//  1) traffic có thể tới service KHÔNG qua gateway (service khác gọi thẳng,\n" +
        "//     job nội bộ, hoặc kẻ tấn công đã vào được mạng nội bộ)\n" +
        "//  2) gateway không biết dữ liệu nghiệp vụ (\"đơn này thuộc về ai\")\n" +
        "//  3) cấu hình gateway sai một lần là mọi service mất bảo vệ\n" +
        "\n" +
        "// TUYỆT ĐỐI KHÔNG: \"mạng nội bộ nên tin nhau, service không cần kiểm tra\".\n" +
        "// Đây là giả định đã bị chứng minh là sai trong mọi vụ tấn công lớn.\n" +
        "\n" +
        "// Service verify JWT rẻ (chỉ kiểm chữ ký bằng public key đã cache):\n" +
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://idp/.well-known/jwks.json",
    },
  ],
},
{
  cat: 'Testing',
  id: 'microservices-1a0xo65',
  q: 'Kim tự tháp kiểm thử cho microservices gồm những tầng nào?',
  answer:
    'Từ nhiều & rẻ (dưới) lên ít & đắt (trên):\n' +
    '- **Unit test**: logic thuần trong một service, mock mọi phụ thuộc. Nhiều nhất.\n' +
    '- **Component/service test**: chạy nguyên một service in-memory hoặc trong container, downstream được stub (WireMock), DB thật (Testcontainers). Kiểm tra service hành xử đúng qua API của nó.\n' +
    '- **Contract test** (Pact): kiểm tra provider–consumer không lệch hợp đồng, mỗi phía chạy riêng.\n' +
    '- **Integration test**: service + các backing service thật (DB, broker) qua Testcontainers.\n' +
    '- **End-to-end**: vài luồng quan trọng qua nhiều service thật trong staging. Ít nhất, giòn nhất, chậm nhất.',
  essence:
    'Đảo ngược "ice cream cone" (nhiều e2e, ít unit). E2E test cho microservices cực đắt và giòn — thay phần lớn giá trị của nó bằng **contract test + component test**. Chỉ giữ vài e2e cho critical path.',
  example:
    '`order-service`: 400 unit test (logic tính giá, trạng thái), 30 component test (`@SpringBootTest` + WireMock cho payment + Testcontainers Postgres), 5 Pact contract (với web-bff, inventory-service), 2 e2e (đặt hàng thành công, đặt hàng khi hết tồn kho).',
  viz: {
    type: 'layers',
    title: 'Đảo ngược "ice cream cone" — thay e2e bằng contract + component test',
    layers: [
      { name: 'End-to-end', tag: 'ít nhất, giòn nhất', note: 'vài luồng critical qua nhiều service thật trong staging' },
      { name: 'Integration', tag: '', note: 'service + backing service thật (DB, broker) qua Testcontainers' },
      { name: 'Contract (Pact)', tag: '', note: 'provider–consumer không lệch hợp đồng, mỗi phía chạy riêng' },
      { name: 'Component / service', tag: '', note: 'nguyên một service, downstream stub (WireMock), DB thật' },
      { name: 'Unit', tag: 'nhiều nhất, rẻ nhất', note: 'logic thuần, mock mọi phụ thuộc' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Nhiều test nhanh ở dưới, ít test chậm ở trên",
      code:
        "// TẦNG 1 — UNIT TEST (nhiều nhất, mili giây, không I/O)\n" +
        "@Test\n" +
        "void tinh_tong_don_hang() {\n" +
        "    var order = new Order(List.of(new Item(\"A\", 2, money(100))));\n" +
        "    assertThat(order.total()).isEqualTo(money(200));\n" +
        "}\n" +
        "\n" +
        "// TẦNG 2 — INTEGRATION TEST (service + database thật qua Testcontainers)\n" +
        "@SpringBootTest\n" +
        "@Testcontainers\n" +
        "class OrderRepositoryTest {\n" +
        "    @Container static PostgreSQLContainer<?> db = new PostgreSQLContainer<>(\"postgres:16\");\n" +
        "    @DynamicPropertySource\n" +
        "    static void props(DynamicPropertyRegistry r) { r.add(\"spring.datasource.url\", db::getJdbcUrl); }\n" +
        "\n" +
        "    @Test void luu_va_tim_theo_trang_thai() { ... }\n" +
        "}\n" +
        "\n" +
        "// TẦNG 3 — COMPONENT TEST (cả service, downstream được GIẢ LẬP)\n" +
        "@SpringBootTest(webEnvironment = RANDOM_PORT)\n" +
        "class OrderApiTest {\n" +
        "    @RegisterExtension static WireMockExtension payment = ...;\n" +
        "    @Test void tra_ve_201_khi_dat_hang_thanh_cong() { ... }\n" +
        "}\n" +
        "\n" +
        "// TẦNG 4 — CONTRACT TEST (thay cho phần lớn end-to-end test)\n" +
        "//   Consumer khai kỳ vọng -> provider chạy lại và xác nhận (Pact)\n" +
        "//   -> phát hiện thay đổi phá vỡ mà KHÔNG cần dựng cả hệ thống\n" +
        "\n" +
        "// TẦNG 5 — END-TO-END (ÍT NHẤT: chậm, không ổn định, khó bảo trì)\n" +
        "//   Chỉ giữ vài kịch bản \"smoke\" quan trọng nhất: đăng nhập, đặt hàng,\n" +
        "//   thanh toán. Chạy sau khi deploy vào staging.\n" +
        "\n" +
        "// TRONG MICROSERVICES, tầng CONTRACT quan trọng hơn hẳn so với monolith:\n" +
        "// nó cho phép mỗi service test độc lập mà vẫn chắc chắn về tích hợp.\n" +
        "// Đầu tư vào end-to-end thay vì contract là sai lầm phổ biến và tốn kém.\n" +
        "// Bổ sung: TESTING IN PRODUCTION (canary, shadow traffic, synthetic monitoring).",
    },
  ],
},
{
  cat: 'Testing',
  id: 'microservices-14jar2p',
  q: 'Consumer-Driven Contract testing — quy trình chi tiết?',
  answer:
    '1. **Consumer** viết test dùng thư viện Pact: định nghĩa interaction ("given order 1 exists, when GET /orders/1, then response is {...}"). Test chạy với mock provider → sinh file **pact** (JSON contract).\n' +
    '2. Consumer publish pact lên **Pact Broker** kèm version + branch.\n' +
    '3. **Provider** trong CI: lấy các pact của mọi consumer từ broker, dựng provider thật (với state setup: "given order 1 exists" → seed DB), replay từng request trong pact, assert response thật khớp expectation.\n' +
    '4. Provider publish kết quả verification.\n' +
    '5. **can-i-deploy**: trước khi deploy, hỏi broker "phiên bản này của provider có tương thích với các consumer đang chạy production không?" → chặn deploy nếu phá contract.',
  essence:
    'Contract test dịch chuyển "phát hiện breaking change" từ e2e/production (muộn, đắt) sang CI của từng service (sớm, rẻ). Consumer định nghĩa "tôi cần gì", provider chứng minh "tôi cung cấp đủ".',
  example:
    '`web-bff` khai báo pact: cần `estimatedDelivery` (ISO date) từ `order-service`. Dev order-service đổi field thành timestamp epoch → CI order-service chạy pact verify → FAIL: "web-bff expects ISO string" → biết ngay, không merge. `can-i-deploy` cũng sẽ chặn.',
  viz: {
    type: 'flow',
    title: 'Dịch "phát hiện breaking change" từ production sang CI của từng service',
    nodes: ['Consumer viết pact test (mock provider) → sinh file pact', 'Publish pact lên Pact Broker (version + branch)', 'Provider CI: lấy pact, dựng provider thật + state setup, replay, assert', 'Provider publish kết quả verification', 'can-i-deploy: "tương thích với consumer production?" → chặn nếu phá'],
    steps: [
      { to: 0, label: '"given order 1 exists, when GET /orders/1, then {...}"' },
      { to: 2, label: '"given order 1 exists" → seed DB' },
      { to: 4, label: 'Consumer định nghĩa "tôi cần gì", provider chứng minh "tôi cung cấp đủ"' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Từ kỳ vọng của consumer tới cổng deploy",
      code:
        "// BƯỚC 1: CONSUMER viết test mô tả mình CẦN GÌ -> sinh file hợp đồng\n" +
        "@ExtendWith(PactConsumerTestExt.class)\n" +
        "@PactTestFor(providerName = \"order-service\", port = \"8089\")\n" +
        "class OrderClientPactTest {\n" +
        "    @Pact(consumer = \"shipping-service\")\n" +
        "    RequestResponsePact orderExists(PactDslWithProvider b) {\n" +
        "        return b.given(\"đơn 123 tồn tại và đã thanh toán\")\n" +
        "                .uponReceiving(\"lấy đơn 123\")\n" +
        "                .path(\"/orders/123\").method(\"GET\")\n" +
        "                .willRespondWith().status(200)\n" +
        "                .body(newJsonBody(o -> {\n" +
        "                    o.stringType(\"id\", \"123\");\n" +
        "                    o.stringMatcher(\"status\", \"NEW|PAID|SHIPPED\", \"PAID\");\n" +
        "                    o.numberType(\"total\", 100.0);\n" +
        "                }).build())\n" +
        "                .toPact();\n" +
        "    }\n" +
        "    @Test void test(MockServer server) {\n" +
        "        assertThat(new OrderClient(server.getUrl()).get(\"123\").status()).isEqualTo(\"PAID\");\n" +
        "    }\n" +
        "}\n" +
        "// Dùng MATCHER (stringType, numberType) chứ không phải giá trị cố định —\n" +
        "// hợp đồng nói về CẤU TRÚC và KIỂU, không phải về dữ liệu cụ thể.\n" +
        "\n" +
        "// BƯỚC 2: đẩy hợp đồng lên Pact Broker (trong CI của consumer)\n" +
        "//   pact-broker publish target/pacts --consumer-app-version=$GIT_SHA --branch=$BRANCH\n" +
        "\n" +
        "// BƯỚC 3: PROVIDER chạy lại MỌI hợp đồng của MỌI consumer\n" +
        "@Provider(\"order-service\")\n" +
        "@PactBroker(url = \"https://pact-broker.company.com\")\n" +
        "@ExtendWith(SpringExtension.class)\n" +
        "class OrderProviderTest {\n" +
        "    @State(\"đơn 123 tồn tại và đã thanh toán\")     // dựng dữ liệu cho trạng thái này\n" +
        "    void setup() { orderRepo.save(new Order(\"123\", \"PAID\", 100.0)); }\n" +
        "\n" +
        "    @TestTemplate\n" +
        "    @ExtendWith(PactVerificationSpringProvider.class)\n" +
        "    void verify(PactVerificationContext ctx) { ctx.verifyInteraction(); }\n" +
        "}\n" +
        "\n" +
        "// BƯỚC 4: CỔNG DEPLOY — chỉ deploy khi tương thích với mọi bên\n" +
        "//   pact-broker can-i-deploy --pacticipant order-service \\\n" +
        "//     --version $GIT_SHA --to-environment production\n" +
        "// -> Đây là giá trị lớn nhất: biết CHẮC bản này không phá vỡ ai trước khi deploy.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-11sw39k',
  q: 'Materialized view / read replica để phục vụ query xuyên service?',
  answer:
    'Query cần data từ nhiều service, chạy thường xuyên, cần nhanh → dựng sẵn thay vì gọi lúc chạy.\n\n' +
    '**Read model service** (CQRS): một service lắng nghe event từ các service liên quan, cập nhật một bảng denormalized đúng shape của query. Query = SELECT một bảng.\n\n' +
    '**Data lake / warehouse** cho analytics: ETL/CDC từ mọi service DB → một kho (Snowflake, BigQuery, ClickHouse) → team BI query thoải mái, không đụng OLTP.\n\n' +
    'Đánh đổi: eventual consistency (read model trễ vài giây so với nguồn); phải maintain projection (bug projection → dữ liệu sai, cần replay được).',
  essence:
    'Đừng để query xuyên service thành N call runtime. Vật chất hoá kết quả từ event stream (read model cho query nghiệp vụ nóng) hoặc trong warehouse (cho analytics). Chấp nhận độ trễ đổi lấy tốc độ và độ tin cậy.',
  example:
    'Dashboard "doanh thu theo cửa hàng theo ngày" cần data từ `order`, `payment`, `store`. Không query 3 service: CDC cả 3 → ClickHouse; dashboard query ClickHouse, trả trong < 1s. Dữ liệu trễ ~2 phút — chấp nhận được cho báo cáo.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Read model service (CQRS)', 'Data lake / warehouse'],
    rows: [
      ['Nguồn', 'lắng nghe event từ các service liên quan', 'ETL/CDC từ mọi service DB'],
      ['Dùng cho', 'query nghiệp vụ nóng, cần latency thấp', 'analytics, BI — không đụng OLTP'],
      ['Query', 'SELECT một bảng denormalized', 'Snowflake/BigQuery/ClickHouse'],
      ['Đánh đổi', 'eventual consistency (trễ vài giây), maintain projection (cần replay được)', 'trễ vài phút, chấp nhận cho báo cáo'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Dựng sẵn bảng đọc từ event của nhiều service",
      code:
        "-- BÀI TOÁN: \"danh sách đơn hàng kèm tên khách và trạng thái giao hàng,\n" +
        "-- lọc theo khách VIP, sắp theo tổng tiền, phân trang.\"\n" +
        "-- API composition KHÔNG giải được (không lọc/sắp xếp xuyên service được).\n" +
        "\n" +
        "-- GIẢI PHÁP: read model tổng hợp, cập nhật từ event của cả ba service\n" +
        "CREATE TABLE order_search_view (\n" +
        "  order_id        TEXT PRIMARY KEY,\n" +
        "  customer_id     TEXT NOT NULL,\n" +
        "  customer_name   TEXT NOT NULL,      -- từ customer-service\n" +
        "  customer_tier   TEXT NOT NULL,\n" +
        "  total           NUMERIC(18,2) NOT NULL,\n" +
        "  order_status    TEXT NOT NULL,      -- từ order-service\n" +
        "  shipment_status TEXT,               -- từ shipping-service\n" +
        "  created_at      TIMESTAMPTZ NOT NULL,\n" +
        "  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "CREATE INDEX idx_osv_tier_total ON order_search_view (customer_tier, total DESC);\n" +
        "CREATE INDEX idx_osv_created ON order_search_view (created_at DESC);\n" +
        "\n" +
        "-- Truy vấn giờ chỉ là MỘT câu trên MỘT bảng — nhanh và đơn giản\n" +
        "SELECT * FROM order_search_view\n" +
        "WHERE customer_tier = \u0027VIP\u0027 ORDER BY total DESC LIMIT 20;",
    },
    {
      lang: "java",
      title: "Projection từ nhiều nguồn event",
      code:
        "@Service\n" +
        "public class OrderSearchProjection {\n" +
        "\n" +
        "    @KafkaListener(topics = \"order-events\")\n" +
        "    public void onOrder(OrderEvent e) {\n" +
        "        jdbc.update(\"\"\"\n" +
        "            INSERT INTO order_search_view (order_id, customer_id, total, order_status, created_at)\n" +
        "            VALUES (?,?,?,?,?)\n" +
        "            ON CONFLICT (order_id) DO UPDATE\n" +
        "              SET order_status = EXCLUDED.order_status, updated_at = now()\n" +
        "            \"\"\", e.orderId(), e.customerId(), e.total(), e.status(), e.createdAt());\n" +
        "    }\n" +
        "\n" +
        "    @KafkaListener(topics = \"customer-events\")\n" +
        "    public void onCustomer(CustomerEvent e) {\n" +
        "        // Tên khách đổi -> cập nhật MỌI dòng của khách đó\n" +
        "        jdbc.update(\"\"\"\n" +
        "            UPDATE order_search_view SET customer_name = ?, customer_tier = ?, updated_at = now()\n" +
        "            WHERE customer_id = ?\n" +
        "            \"\"\", e.name(), e.tier(), e.customerId());\n" +
        "    }\n" +
        "\n" +
        "    @KafkaListener(topics = \"shipping-events\")\n" +
        "    public void onShipment(ShipmentEvent e) {\n" +
        "        jdbc.update(\"UPDATE order_search_view SET shipment_status = ? WHERE order_id = ?\",\n" +
        "                    e.status(), e.orderId());\n" +
        "    }\n" +
        "}\n" +
        "// ĐÁNH ĐỔI: dữ liệu TRỄ vài giây, và có thể LỆCH -> cần job đối soát định kỳ,\n" +
        "// và phải dựng lại được read model từ đầu bằng cách phát lại event.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-12rxs9p',
  q: 'Multi-tenancy trong microservices: các mô hình cô lập dữ liệu?',
  answer:
    '- **Shared schema** (`tenant_id` mọi bảng): rẻ nhất, một migration; rủi ro rò rỉ nếu quên `WHERE tenant_id` (dùng Row-Level Security để ép); noisy neighbor.\n' +
    '- **Schema per tenant**: cô lập tốt hơn, backup/restore per-tenant; migration chạy N lần; N lớn → nặng metadata.\n' +
    '- **Database per tenant**: cô lập tối đa (bảo mật, tuning, compliance, giới hạn tài nguyên); vận hành N database — chỉ hợp số ít tenant lớn.\n\n' +
    'Trong microservices: `tenant_id` phải **propagate qua mọi call và event** (header `X-Tenant-ID` / claim trong token), mỗi service enforce cô lập ở tầng data của nó.',
  essence:
    'Chọn mô hình theo trục "chi phí vận hành ↔ mức cô lập". Điểm khó riêng của microservices: tenant context phải đi xuyên suốt toàn bộ chuỗi call/event, và MỖI service phải tự thực thi cô lập.',
  example:
    'SaaS B2B: shared schema + Postgres RLS (`CREATE POLICY tenant_isolation USING (tenant_id = current_setting(\'app.tenant\')::uuid)`) cho 5000 tenant nhỏ; database riêng cho 8 khách enterprise có yêu cầu compliance. `tenant_id` nằm trong JWT, mọi service set `SET app.tenant` đầu mỗi request.',
  viz: {
    type: 'compare',
    corner: 'Mô hình',
    cols: ['Shared schema', 'Schema per tenant', 'Database per tenant'],
    rows: [
      ['Chi phí vận hành', 'thấp nhất (một migration)', 'trung bình (migration N lần)', 'cao (N database)'],
      ['Mức cô lập', 'thấp — quên WHERE tenant_id = rò rỉ (dùng RLS)', 'khá — backup/restore per-tenant', 'tối đa'],
      ['Điểm khó riêng của microservices', 'tenant_id phải propagate qua MỌI call & event; MỖI service tự enforce cô lập', '', ''],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ba mức cô lập",
      code:
        "-- 1) SHARED SCHEMA (cột tenant_id) — rẻ nhất, phổ biến nhất\n" +
        "CREATE TABLE orders (\n" +
        "  id BIGSERIAL PRIMARY KEY,\n" +
        "  tenant_id BIGINT NOT NULL,\n" +
        "  total NUMERIC(18,2) NOT NULL\n" +
        ");\n" +
        "-- tenant_id phải là cột ĐẦU TIÊN của MỌI index:\n" +
        "CREATE INDEX idx_orders_tenant_created ON orders (tenant_id, created_at DESC);\n" +
        "\n" +
        "-- Bảo vệ bằng Row Level Security, đừng chỉ dựa vào việc code nhớ WHERE:\n" +
        "ALTER TABLE orders ENABLE ROW LEVEL SECURITY;\n" +
        "CREATE POLICY tenant_isolation ON orders\n" +
        "  USING (tenant_id = current_setting(\u0027app.tenant_id\u0027)::bigint);\n" +
        "SET app.tenant_id = \u002742\u0027;     -- đặt ở ĐẦU MỖI REQUEST\n" +
        "-- + rẻ, dễ vận hành, migration một lần cho tất cả\n" +
        "-- - RÒ RỈ DỮ LIỆU nếu quên lọc (rủi ro nghiêm trọng nhất)\n" +
        "-- - tenant lớn ảnh hưởng tenant nhỏ; khó backup/khôi phục riêng một tenant\n" +
        "\n" +
        "-- 2) SCHEMA-PER-TENANT\n" +
        "CREATE SCHEMA tenant_42;\n" +
        "-- + cách ly tốt hơn, backup riêng được, tuỳ biến được theo tenant\n" +
        "-- - migration phải chạy trên TỪNG schema; hàng nghìn schema làm chậm catalog\n" +
        "\n" +
        "-- 3) DATABASE-PER-TENANT\n" +
        "-- + cách ly MẠNH NHẤT, giới hạn tài nguyên riêng, đáp ứng yêu cầu tuân thủ\n" +
        "-- - đắt nhất, connection pool nhân lên, vận hành phức tạp",
    },
    {
      lang: "java",
      title: "Truyền và ràng buộc tenant xuyên chuỗi service",
      code:
        "@Component\n" +
        "public class TenantFilter extends OncePerRequestFilter {\n" +
        "    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,\n" +
        "                                    FilterChain chain) throws ServletException, IOException {\n" +
        "        // Lấy tenant từ TOKEN, KHÔNG lấy từ header do client gửi (giả mạo được)\n" +
        "        String tenant = ((Jwt) SecurityContextHolder.getContext()\n" +
        "                .getAuthentication().getPrincipal()).getClaim(\"tenant_id\");\n" +
        "        TenantContext.set(tenant);\n" +
        "        try { chain.doFilter(req, res); } finally { TenantContext.clear(); }\n" +
        "    }\n" +
        "}\n" +
        "// Truyền xuống downstream qua header, và service đích PHẢI kiểm tra lại\n" +
        "// tenant trong token khớp với tenant trong dữ liệu — đừng tin caller.",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'microservices-z91jak',
  q: 'Xoá dữ liệu người dùng (GDPR "right to be forgotten") xuyên nhiều service?',
  answer:
    'Dữ liệu một user nằm rải ở nhiều service (order, payment, support, analytics, event log, backup). Xoá thật ở mọi nơi rất khó.\n\n' +
    'Cách tiếp cận:\n' +
    '- **Orchestrated deletion**: một `privacy-service` phát event `UserDeletionRequested`; mỗi service tự xoá/ẩn danh dữ liệu của user đó và xác nhận (`UserDataDeleted`); theo dõi tới khi tất cả xong.\n' +
    '- **Crypto-shredding**: dữ liệu cá nhân được mã hoá bằng key riêng của user; "xoá" = huỷ key → dữ liệu (kể cả trong backup, event log append-only) trở nên không đọc được.\n' +
    '- **Anonymization** thay vì delete cho dữ liệu cần giữ (đơn hàng cho kế toán): thay PII bằng placeholder.',
  essence:
    'Xoá cứng xuyên hệ phân tán (nhất là với event sourcing / backup bất biến) gần như bất khả thi. Crypto-shredding (xoá = huỷ khoá giải mã) là kỹ thuật thực dụng nhất để "quên" dữ liệu ở mọi nơi cùng lúc.',
  example:
    'Mỗi user có một AES key lưu trong `key-vault`. Order-service lưu `shippingAddress` đã mã hoá bằng key đó. User yêu cầu xoá → `privacy-service` huỷ key trong vault → mọi bản mã hoá (DB, event `OrderPlaced` trong Kafka, backup S3) không giải mã được nữa. Đơn hàng vẫn còn (`total`, `date`) cho kế toán nhưng không còn PII.',
  viz: {
    type: 'flow',
    title: 'Xoá cứng xuyên phân tán gần bất khả thi — crypto-shredding là thực dụng nhất',
    nodes: ['privacy-service phát UserDeletionRequested', 'Mỗi service xoá / ẩn danh dữ liệu user', 'Xác nhận UserDataDeleted', 'Theo dõi tới khi tất cả xong'],
    steps: [
      { to: 1, label: 'Crypto-shredding: dữ liệu mã hoá bằng key riêng user → "xoá" = huỷ key → backup & event log append-only cũng không đọc được' },
      { to: 2, label: 'Anonymization thay delete cho dữ liệu cần giữ (đơn hàng cho kế toán) — thay PII bằng placeholder' },
      { to: 3, label: 'Orchestrated deletion — biết khi nào hoàn tất' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Xoá phân tán, có theo dõi và xác nhận",
      code:
        "// THÁCH THỨC: dữ liệu của một người nằm rải rác ở N service, N read model,\n" +
        "// log, backup, data warehouse, và cả trong event đã phát đi.\n" +
        "@Service\n" +
        "public class DataDeletionOrchestrator {\n" +
        "\n" +
        "    public void requestDeletion(String userId) {\n" +
        "        var req = deletionRepo.create(userId, Status.PENDING);\n" +
        "        // Phát event tới MỌI service — mỗi service tự biết mình giữ gì\n" +
        "        publisher.publish(new UserDeletionRequested(req.id(), userId));\n" +
        "        // Theo dõi từng service đã xác nhận chưa\n" +
        "    }\n" +
        "\n" +
        "    @KafkaListener(topics = \"user-deletion-completed\")\n" +
        "    public void onCompleted(UserDeletionCompleted e) {\n" +
        "        deletionRepo.markServiceDone(e.requestId(), e.serviceName());\n" +
        "        if (deletionRepo.allServicesDone(e.requestId())) {\n" +
        "            deletionRepo.markCompleted(e.requestId());     // có bằng chứng tuân thủ\n" +
        "        }\n" +
        "    }\n" +
        "\n" +
        "    @Scheduled(cron = \"0 0 * * * *\")\n" +
        "    public void checkOverdue() {                            // service nào chưa xong\n" +
        "        deletionRepo.findOverdue(Duration.ofDays(25)).forEach(alert::raise);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// MỖI SERVICE tự xử lý phần của mình:\n" +
        "@KafkaListener(topics = \"user-deletion-requested\")\n" +
        "@Transactional\n" +
        "public void handle(UserDeletionRequested e) {\n" +
        "    orderRepo.anonymize(e.userId());     // giữ đơn hàng (nghĩa vụ kế toán)\n" +
        "                                          // nhưng XOÁ thông tin cá nhân\n" +
        "    publisher.publish(new UserDeletionCompleted(e.requestId(), \"order-service\"));\n" +
        "}\n" +
        "\n" +
        "// BỐN VẤN ĐỀ KHÓ:\n" +
        "// 1) EVENT ĐÃ PHÁT trong Kafka là BẤT BIẾN -> dùng CRYPTO-SHREDDING:\n" +
        "//    mã hoá dữ liệu cá nhân bằng khoá riêng của từng user, xoá KHOÁ là\n" +
        "//    dữ liệu trở thành vô nghĩa vĩnh viễn.\n" +
        "// 2) BACKUP: không xoá được trong backup cũ -> ghi rõ chính sách retention.\n" +
        "// 3) LOG: đừng log PII ngay từ đầu (rẻ hơn nhiều so với đi xoá sau).\n" +
        "// 4) Phân biệt XOÁ và ẨN DANH — nhiều dữ liệu phải giữ vì nghĩa vụ pháp lý.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-108mtlb',
  q: 'Distributed caching giữa các service — nhất quán thế nào?',
  answer:
    'Nhiều service (hoặc nhiều instance) cache cùng loại dữ liệu → khi nguồn đổi, các bản cache bị stale.\n\n' +
    'Chiến lược:\n' +
    '- **TTL ngắn**: chấp nhận stale trong vài giây/phút — đơn giản nhất, đủ cho phần lớn.\n' +
    '- **Event-driven invalidation**: service sở hữu data phát event `XChanged` → mọi service/instance nghe và xoá key cache tương ứng (Redis pub/sub, hoặc Kafka).\n' +
    '- **Cache-aside + write-through** ở service sở hữu; các service khác gọi API (có cache riêng TTL ngắn).\n' +
    '- **Versioned key** (`product:v{updatedAt}:{id}`): đổi data → key mới, key cũ tự hết hạn.\n\n' +
    'Tránh: nhiều service ghi chung một Redis cache cho cùng data — quay lại shared-database problem.',
  essence:
    'Cache trong microservices là **bản sao có thể sai** của dữ liệu do service khác sở hữu. Nhất quán = TTL ngắn (đơn giản) hoặc invalidation qua event (realtime hơn). Mỗi service cache độc lập, đồng bộ qua event, không chia sẻ cache store cho business data.',
  example:
    '`product-service` sở hữu catalog. `search-service`, `pricing-service` mỗi cái cache tên/thuộc tính sản phẩm (TTL 5 phút) + nghe event `ProductUpdated` để xoá key ngay. Admin sửa tên sản phẩm → event → cả hai service xoá cache trong ~100ms, không chờ hết 5 phút.',
  viz: {
    type: 'tree',
    title: 'Cache = bản sao có thể sai của dữ liệu do service khác sở hữu',
    root: {
      label: 'Mỗi service cache độc lập, đồng bộ qua event — không chia sẻ cache store cho business data',
      children: [
        { label: 'TTL ngắn', note: 'chấp nhận stale vài giây/phút — đơn giản nhất, đủ cho phần lớn' },
        { label: 'Event-driven invalidation', note: 'service sở hữu phát XChanged → mọi instance xoá key (Redis pub/sub, Kafka)' },
        { label: 'Versioned key', note: 'product:v{updatedAt}:{id} — đổi data → key mới, key cũ tự hết hạn' },
        { label: 'Tránh', note: 'nhiều service ghi chung một Redis cache cho cùng data → quay lại shared-database' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Cache dùng chung và bài toán invalidate",
      code:
        "// NGUYÊN TẮC 1: CHỈ SERVICE SỞ HỮU dữ liệu mới được cache và invalidate nó.\n" +
        "// Service khác cache dữ liệu của người ta -> không ai biết khi nào nó cũ.\n" +
        "@Service\n" +
        "public class ProductService {          // service SỞ HỮU product\n" +
        "    @Cacheable(value = \"products\", key = \"#id\")\n" +
        "    public Product get(String id) { return repo.findById(id).orElseThrow(); }\n" +
        "\n" +
        "    @CacheEvict(value = \"products\", key = \"#p.id\")\n" +
        "    @Transactional\n" +
        "    public void update(Product p) {\n" +
        "        repo.save(p);\n" +
        "        publisher.publish(new ProductUpdated(p.id()));   // BÁO cho bên khác\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// NGUYÊN TẮC 2: service khác muốn cache thì phải NGHE EVENT để invalidate\n" +
        "@KafkaListener(topics = \"product-events\")\n" +
        "public void onProductUpdated(ProductUpdated e) {\n" +
        "    localCache.invalidate(e.productId());     // xoá bản sao cục bộ\n" +
        "}\n" +
        "\n" +
        "// CACHE HAI TẦNG:\n" +
        "//  L1 (trong process, Caffeine) — nano giây, nhưng KHÔNG xoá được từ xa\n" +
        "//     -> TTL RẤT NGẮN (5-30 giây) là giới hạn trên của mức \"cũ\" chấp nhận được\n" +
        "//  L2 (Redis dùng chung)        — mili giây, mọi instance thấy như nhau\n" +
        "private final Cache<String, Product> l1 = Caffeine.newBuilder()\n" +
        "    .maximumSize(10_000).expireAfterWrite(Duration.ofSeconds(30)).build();\n" +
        "\n" +
        "// NHẤT QUÁN — chọn một mức và ghi rõ trong tài liệu:\n" +
        "//  a) TTL ngắn — đơn giản nhất, chấp nhận dữ liệu cũ trong TTL. Đủ cho ~90%.\n" +
        "//  b) Event-based invalidate — chính xác hơn, nhưng event có thể MẤT\n" +
        "//     (pub/sub) -> vẫn cần TTL làm lưới an toàn.\n" +
        "//  c) Write-through — cache luôn khớp, nhưng ghi chậm hơn.\n" +
        "\n" +
        "// TUYỆT ĐỐI KHÔNG cache: số dư, tồn kho lúc thanh toán, quyền truy cập.",
    },
  ],
},
{
  cat: 'Bảo mật',
  id: 'microservices-bxgea4',
  q: 'Secrets rotation và không có secret nào trong code/image?',
  answer:
    'Nguyên tắc:\n' +
    '- **Không** secret trong: source code, Dockerfile, `env` của image, ConfigMap, git (kể cả private repo).\n' +
    '- Secret sống trong **secret manager** (Vault, AWS Secrets Manager), inject lúc **runtime** (env từ K8s Secret + encryption at rest, CSI Secrets Store, hoặc Vault agent sidecar).\n' +
    '- **Rotation**: secret manager đổi giá trị định kỳ (DB password, API key); app **đọc lại** (poll / watch / restart) — không hardcode một lần lúc startup.\n' +
    '- **Least privilege**: mỗi service chỉ đọc secret của nó (IAM policy / Vault policy theo path).\n' +
    '- **Detect leak**: scan git (gitleaks) trong CI; nếu lộ → xoay ngay.',
  essence:
    'Secret là dữ liệu động, được quản lý bên ngoài artifact và tự xoay. Image và code phải "vô danh" — cùng một image chạy được ở mọi môi trường vì secret được bơm vào lúc chạy.',
  example:
    'RDS password xoay mỗi 30 ngày qua Secrets Manager rotation Lambda. `order-service` dùng AWS JDBC wrapper tự lấy password mới nhất từ Secrets Manager mỗi khi tạo connection → xoay password không cần restart service, không downtime.',
  viz: {
    type: 'tree',
    title: 'Image và code phải "vô danh" — secret bơm vào lúc chạy',
    root: {
      label: 'Cùng một image chạy được ở mọi môi trường',
      children: [
        { label: 'KHÔNG secret trong', note: 'source code, Dockerfile, env của image, ConfigMap, git (kể cả private)' },
        { label: 'Secret trong secret manager', note: 'Vault / Secrets Manager — inject runtime (K8s Secret + encryption, CSI, Vault agent)' },
        { label: 'Rotation', note: 'secret manager đổi định kỳ; app đọc lại (poll/watch), không hardcode lúc startup' },
        { label: 'Least privilege', note: 'mỗi service chỉ đọc secret của nó (IAM/Vault policy theo path)' },
        { label: 'Detect leak', note: 'gitleaks trong CI; lộ → xoay ngay' },
      ],
    },
  },
  demo: [
    {
      lang: "yaml",
      title: "Secret được tiêm lúc chạy, xoay vòng tự động",
      code:
        "apiVersion: external-secrets.io/v1beta1\n" +
        "kind: ExternalSecret\n" +
        "metadata: { name: order-service-secrets }\n" +
        "spec:\n" +
        "  refreshInterval: 1h                  # tự đồng bộ lại -> xoay vòng lan tới pod\n" +
        "  secretStoreRef: { name: vault-backend, kind: ClusterSecretStore }\n" +
        "  target:\n" +
        "    name: order-service-secret\n" +
        "    creationPolicy: Owner\n" +
        "  data:\n" +
        "    - secretKey: DB_PASSWORD\n" +
        "      remoteRef: { key: secret/data/order-service, property: db_password }\n" +
        "---\n" +
        "# Vault Agent sidecar: tiêm secret vào file và tự làm mới, không qua K8s Secret\n" +
        "metadata:\n" +
        "  annotations:\n" +
        "    vault.hashicorp.com/agent-inject: \"true\"\n" +
        "    vault.hashicorp.com/role: \"order-service\"\n" +
        "    vault.hashicorp.com/agent-inject-secret-db: \"database/creds/order-service\"",
    },
    {
      lang: "bash",
      title: "Ba nguyên tắc và cách kiểm chứng",
      code:
        "# NGUYÊN TẮC 1: KHÔNG secret nào trong code, image, hay git.\n" +
        "gitleaks detect --source . --verbose\n" +
        "trufflehog filesystem . --only-verified\n" +
        "# Đưa vào pre-commit hook và CI — phát hiện sớm rẻ hơn nhiều so với xoay\n" +
        "# vòng khẩn cấp sau khi lộ.\n" +
        "\n" +
        "# NGUYÊN TẮC 2: XOAY VÒNG TỰ ĐỘNG, không phụ thuộc con người nhớ.\n" +
        "# Vault dynamic secrets: mỗi pod nhận một credential DB RIÊNG, TTL ngắn:\n" +
        "vault read database/creds/order-service    # username/password mới, hết hạn sau 1h\n" +
        "# -> credential lộ ra cũng chỉ dùng được trong thời gian rất ngắn.\n" +
        "\n" +
        "# NGUYÊN TẮC 3: XOAY VÒNG PHẢI KHÔNG GÂY GIÁN ĐOẠN.\n" +
        "# Cách làm: giai đoạn HAI KHOÁ CÙNG HỢP LỆ\n" +
        "#   1) tạo credential mới, cũ VẪN dùng được\n" +
        "#   2) ứng dụng nhận credential mới (refresh hoặc rolling restart)\n" +
        "#   3) xác nhận không còn ai dùng credential cũ\n" +
        "#   4) thu hồi credential cũ\n" +
        "# Bỏ qua bước (1) hoặc (3) là gây sự cố.\n" +
        "\n" +
        "# KIỂM TRA secret có lọt vào image không:\n" +
        "docker history --no-trunc order-service:1.0 | grep -i -E \"password|secret|key\"\n" +
        "# Và nhớ: biến môi trường hiện trong `kubectl describe pod` -> với secret\n" +
        "# nhạy cảm, ưu tiên mount thành FILE thay vì đặt vào env.",
    },
  ],
},
{
  cat: 'Testing',
  id: 'microservices-16mblzl',
  q: 'Quản lý dữ liệu test khi test xuyên nhiều service?',
  answer:
    'Thách thức: một luồng e2e cần dữ liệu nhất quán ở DB của nhiều service (customer tồn tại ở customer-service, sản phẩm ở catalog-service, tồn kho ở inventory-service).\n\n' +
    'Cách:\n' +
    '- **Test setup qua API công khai**: gọi API của từng service để tạo state (không đụng DB trực tiếp) → dữ liệu đi qua đúng validation, tránh "state bất hợp lệ".\n' +
    '- **Provider state cho contract test**: mỗi provider có endpoint/hook "given X exists" chỉ dùng cho test.\n' +
    '- **Ephemeral environment**: mỗi PR dựng một namespace K8s riêng với đủ service + seed data → test cô lập, xong thì xoá.\n' +
    '- **Data builder / factory** dùng chung, versioned.\n' +
    '- Tránh: một "big shared test DB" — mọi test giẫm chân nhau, giòn.',
  essence:
    'Dữ liệu test phải được tạo qua API/hook chính thức (đảm bảo hợp lệ), cô lập theo test/PR (ephemeral env hoặc tenant riêng), và tái lập được. "Shared golden dataset" là nguồn của flaky test.',
  example:
    'CI cho một PR: tạo namespace `pr-1234`, deploy 6 service + Postgres/Kafka, chạy job seed gọi `POST /customers`, `POST /products` (qua API). Chạy e2e suite. Xoá namespace. Mỗi PR có môi trường sạch, không ảnh hưởng PR khác.',
  viz: {
    type: 'tree',
    title: '"Shared golden dataset" là nguồn của flaky test',
    root: {
      label: 'Dữ liệu test: tạo qua API/hook chính thức, cô lập theo PR, tái lập được',
      children: [
        { label: 'Test setup qua API công khai', note: 'không đụng DB trực tiếp → dữ liệu qua đúng validation' },
        { label: 'Provider state cho contract test', note: 'endpoint/hook "given X exists" chỉ dùng cho test' },
        { label: 'Ephemeral environment per PR', note: 'namespace K8s riêng + đủ service + seed data → xong thì xoá' },
        { label: 'Data builder / factory dùng chung, versioned', note: '' },
        { label: 'Tránh "big shared test DB"', note: 'mọi test giẫm chân nhau, giòn' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Dữ liệu test độc lập, tái lập được",
      code:
        "// VẤN ĐỀ: test xuyên service cần dữ liệu nhất quán ở NHIỀU database.\n" +
        "// Dùng chung một bộ dữ liệu tĩnh -> test này làm hỏng test kia, và\n" +
        "// chạy song song thì đụng nhau.\n" +
        "\n" +
        "// CÁCH 1: TESTCONTAINERS — mỗi lần chạy một database SẠCH\n" +
        "@Testcontainers\n" +
        "@SpringBootTest\n" +
        "class OrderIntegrationTest {\n" +
        "    @Container static PostgreSQLContainer<?> db = new PostgreSQLContainer<>(\"postgres:16\")\n" +
        "        .withReuse(true);                    // dùng lại giữa các lần chạy -> nhanh hơn\n" +
        "    @Container static KafkaContainer kafka = new KafkaContainer(...);\n" +
        "}\n" +
        "\n" +
        "// CÁCH 2: TEST DATA BUILDER — mỗi test tự tạo dữ liệu của mình, ID DUY NHẤT\n" +
        "public class OrderBuilder {\n" +
        "    private String id = \"order-\" + UUID.randomUUID();     // không bao giờ đụng\n" +
        "    private String customerId = \"cust-\" + UUID.randomUUID();\n" +
        "    public OrderBuilder paid() { this.status = \"PAID\"; return this; }\n" +
        "    public Order build() { return new Order(id, customerId, status, total); }\n" +
        "}\n" +
        "@Test\n" +
        "void test() {\n" +
        "    var order = anOrder().paid().withTotal(money(500)).build();\n" +
        "    // Test ĐỘC LẬP: chạy song song, chạy lại, thứ tự bất kỳ đều đúng.\n" +
        "}\n" +
        "\n" +
        "// CÁCH 3: DỌN DẸP tự động\n" +
        "@Transactional        // integration test: tự rollback sau mỗi test\n" +
        "@Sql(scripts = \"/cleanup.sql\", executionPhase = AFTER_TEST_METHOD)\n" +
        "\n" +
        "// NGUYÊN TẮC:\n" +
        "//  - test KHÔNG phụ thuộc THỨ TỰ chạy và không phụ thuộc test khác\n" +
        "//  - KHÔNG dùng dữ liệu production (kể cả đã ẩn danh, rủi ro rò rỉ vẫn còn)\n" +
        "//  - dữ liệu tạo trong test phải TỰ DỌN\n" +
        "//  - dùng CONTRACT TEST để giảm nhu cầu test xuyên service ngay từ đầu\n" +
        "//  - môi trường staging: nạp lại dữ liệu định kỳ từ bộ dữ liệu tổng hợp",
    },
  ],
},
{
  cat: 'Giao tiếp',
  id: 'microservices-1cb5pye',
  q: 'DTO vs domain model ở ranh giới service — vì sao tách?',
  answer:
    '**Domain model**: các entity/aggregate bên trong service, chứa logic nghiệp vụ, invariant, có thể phức tạp và thay đổi thường xuyên.\n\n' +
    '**DTO (Data Transfer Object)**: cấu trúc phẳng, không logic, dùng cho input/output API và event payload.\n\n' +
    'Tách vì:\n' +
    '- **API contract độc lập với refactor nội bộ**: đổi cấu trúc domain không phá consumer.\n' +
    '- Không lộ chi tiết nội bộ (field kỹ thuật, quan hệ) ra ngoài.\n' +
    '- Tránh vòng lặp serialize với quan hệ hai chiều.\n' +
    '- Mỗi API/event chỉ mang **đúng field cần**, không phải cả entity.\n\n' +
    'Map giữa hai bằng tay hoặc MapStruct.',
  essence:
    'DTO là "hình dạng dữ liệu tại ranh giới"; domain model là "hình dạng dữ liệu để xử lý nghiệp vụ". Chúng tiến hoá với nhịp khác nhau — trộn lẫn khiến mọi refactor nội bộ thành breaking change.',
  example:
    '`Order` entity có `List<OrderLine>`, `AuditInfo`, `PricingStrategy`, quan hệ tới `Customer`. API trả `OrderDto{ id, status, total, itemCount, customerName }`. Đổi `PricingStrategy` thành interface mới → API không đổi, consumer không biết.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Domain model', 'DTO'],
    rows: [
      ['Vai trò', 'entity/aggregate bên trong — logic, invariant', 'cấu trúc phẳng, không logic — input/output API, event payload'],
      ['Nhịp thay đổi', 'thường xuyên (refactor nội bộ)', 'chậm (là contract)'],
      ['Lộ ra ngoài', 'không — field kỹ thuật, quan hệ', 'chỉ đúng field cần'],
      ['Trộn lẫn thì', 'mọi refactor nội bộ thành breaking change', '—'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Mô hình bên trong khác hợp đồng bên ngoài",
      code:
        "// DOMAIN MODEL — thể hiện quy tắc nghiệp vụ, chỉ dùng BÊN TRONG service\n" +
        "public class Order {\n" +
        "    private final OrderId id;\n" +
        "    private OrderStatus status;\n" +
        "    private final List<OrderLine> lines;\n" +
        "    private Money total;\n" +
        "\n" +
        "    public void confirm() {                    // hành vi nghiệp vụ\n" +
        "        if (status != NEW) throw new IllegalStateException(\"chỉ xác nhận đơn mới\");\n" +
        "        if (lines.isEmpty()) throw new IllegalStateException(\"đơn rỗng\");\n" +
        "        this.status = CONFIRMED;\n" +
        "    }\n" +
        "    // Không getter/setter cho mọi field; đóng gói chặt.\n" +
        "}\n" +
        "\n" +
        "// DTO — hợp đồng với BÊN NGOÀI, phẳng, tuần tự hoá được, KHÔNG có hành vi\n" +
        "public record OrderResponse(String id, String status, BigDecimal total,\n" +
        "                            List<OrderLineResponse> lines) {\n" +
        "    public static OrderResponse from(Order o) {\n" +
        "        return new OrderResponse(o.id().value(), o.status().name(),\n" +
        "                                 o.total().amount(),\n" +
        "                                 o.lines().stream().map(OrderLineResponse::from).toList());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// VÌ SAO PHẢI TÁCH:\n" +
        "// 1) TIẾN HOÁ ĐỘC LẬP: đổi cấu trúc nội bộ (tách class, đổi tên field) mà\n" +
        "//    KHÔNG phá vỡ client. Đây là lý do quan trọng nhất.\n" +
        "// 2) BẢO MẬT: domain có field nội bộ (chi phí, ghi chú nội bộ, cờ kỹ thuật)\n" +
        "//    không được lộ ra ngoài.\n" +
        "// 3) TUẦN TỰ HOÁ: domain có kiểu phức tạp (value object, enum nội bộ) mà\n" +
        "//    JSON không diễn đạt tự nhiên; và lazy loading gây lỗi khi serialize.\n" +
        "// 4) MỖI CLIENT một dạng dữ liệu khác nhau (mobile cần rút gọn).\n" +
        "\n" +
        "// CÁI GIÁ: code map thêm. Giảm bằng MapStruct (sinh code lúc BIÊN DỊCH,\n" +
        "// không reflection):\n" +
        "@Mapper(componentModel = \"spring\")\n" +
        "public interface OrderMapper {\n" +
        "    @Mapping(source = \"id.value\", target = \"id\")\n" +
        "    OrderResponse toResponse(Order order);\n" +
        "}\n" +
        "// ĐỪNG dùng chung DTO giữa các service qua thư viện — đó là cách nhanh\n" +
        "// nhất để tạo ra distributed monolith.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-zn7a4m',
  q: 'Outbox relay: polling publisher vs CDC (Debezium) — đánh đổi?',
  answer:
    'Cả hai đọc bảng `outbox` (ghi cùng transaction với dữ liệu nghiệp vụ) và publish lên broker.\n\n' +
    '- **Polling publisher**: một job định kỳ `SELECT * FROM outbox WHERE published = false ORDER BY id LIMIT n`, publish, đánh dấu/xoá. Đơn giản, không thêm hạ tầng, nhưng độ trễ = chu kỳ polling, tải thêm lên DB, cần xử lý concurrent poller (`FOR UPDATE SKIP LOCKED`).\n' +
    '- **CDC (Debezium)**: đọc **WAL/binlog**, phát mỗi INSERT vào `outbox` thành sự kiện Kafka. Độ trễ ~ms, không query DB, throughput cao. Nhưng cần vận hành Kafka Connect + Debezium, cấu hình replication slot, xử lý schema.',
  essence:
    'Cùng một pattern outbox, khác cơ chế "chuyển tiếp": polling đơn giản/độ trễ cao/tải DB; CDC realtime/hạ tầng nặng hơn. Hệ nhỏ → polling; hệ nhiều event, cần realtime, đã có Kafka Connect → CDC.',
  example:
    'Startup ~50 event/s, chấp nhận trễ 1–2s: `@Scheduled(fixedDelay=1000)` poll outbox, publish, xoá. Công ty nhiều service cần event realtime: Debezium theo dõi bảng `outbox`, SMT `EventRouter` tách message theo `aggregate_type` sang đúng topic.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Polling publisher', 'CDC (Debezium)'],
    rows: [
      ['Cơ chế', 'job SELECT ... WHERE published=false LIMIT n, publish, đánh dấu', 'đọc WAL/binlog, phát mỗi INSERT outbox thành event'],
      ['Độ trễ', '= chu kỳ polling', '~ms'],
      ['Tải lên DB', 'thêm query định kỳ', 'không query'],
      ['Hạ tầng', 'không thêm gì (cần FOR UPDATE SKIP LOCKED)', 'Kafka Connect + Debezium + replication slot'],
      ['Hợp với', 'hệ nhỏ', 'nhiều event, cần realtime, đã có Kafka Connect'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Polling: đơn giản, tự kiểm soát",
      code:
        "@Component\n" +
        "public class OutboxPublisher {\n" +
        "    @Scheduled(fixedDelay = 500)\n" +
        "    @Transactional\n" +
        "    public void publish() {\n" +
        "        var events = jdbc.query(\"\"\"\n" +
        "            SELECT * FROM outbox WHERE published_at IS NULL\n" +
        "            ORDER BY created_at LIMIT 100\n" +
        "            FOR UPDATE SKIP LOCKED\n" +
        "            \"\"\", mapper);                     // SKIP LOCKED: nhiều instance không giành nhau\n" +
        "\n" +
        "        for (var e : events) {\n" +
        "            kafka.send(topicFor(e), e.aggregateId(), e.payload());   // key = giữ thứ tự\n" +
        "            jdbc.update(\"UPDATE outbox SET published_at = now() WHERE id = ?\", e.id());\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "// + đơn giản, không thêm hạ tầng, dễ hiểu và dễ gỡ rối\n" +
        "// + kiểm soát hoàn toàn: định tuyến, biến đổi, lọc trước khi gửi\n" +
        "// - thêm tải cho database (poll liên tục, kể cả khi không có việc)\n" +
        "// - độ trễ = chu kỳ poll\n" +
        "// - crash giữa send và update -> GỬI TRÙNG (chấp nhận được nếu consumer idempotent)",
    },
    {
      lang: "json",
      title: "CDC: độ trễ thấp, không đụng database",
      code:
        "{\n" +
        "  \"name\": \"outbox-connector\",\n" +
        "  \"config\": {\n" +
        "    \"connector.class\": \"io.debezium.connector.postgresql.PostgresConnector\",\n" +
        "    \"database.hostname\": \"order-db\",\n" +
        "    \"database.dbname\": \"orders\",\n" +
        "    \"table.include.list\": \"public.outbox\",\n" +
        "    \"plugin.name\": \"pgoutput\",\n" +
        "    \"transforms\": \"outbox\",\n" +
        "    \"transforms.outbox.type\": \"io.debezium.transforms.outbox.EventRouter\",\n" +
        "    \"transforms.outbox.route.by.field\": \"aggregate_type\",\n" +
        "    \"transforms.outbox.table.field.event.key\": \"aggregate_id\",\n" +
        "    \"transforms.outbox.table.field.event.payload\": \"payload\",\n" +
        "    \"tombstones.on.delete\": \"false\"\n" +
        "  }\n" +
        "}\n" +
        "// + độ trễ MILI GIÂY, gần như không thêm tải cho DB (đọc WAL, không truy vấn)\n" +
        "// + KHÔNG BỎ SÓT thay đổi nào, kể cả khi có người sửa trực tiếp trong DB\n" +
        "// + không cần viết và vận hành code publisher\n" +
        "// - thêm Kafka Connect + Debezium vào hệ thống phải vận hành\n" +
        "// - cần quyền replication và cấu hình WAL (wal_level = logical)\n" +
        "// - replication slot bị bỏ quên sẽ CHẶN VACUUM và làm đầy đĩa -> phải giám sát\n" +
        "\n" +
        "// CHỌN: bắt đầu bằng POLLING (đủ tốt cho phần lớn hệ thống, độ trễ vài trăm\n" +
        "// mili giây là chấp nhận được). Chuyển sang CDC khi cần độ trễ thấp hơn,\n" +
        "// hoặc khi đã có Kafka Connect cho việc khác.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-1r3riig',
  q: 'Tích hợp giữa các bounded context: Shared Kernel, Customer/Supplier, Published Language?',
  answer:
    'Các kiểu quan hệ giữa bounded context (DDD Context Mapping):\n' +
    '- **Shared Kernel**: hai context chia sẻ một phần model/code chung. Rủi ro coupling — chỉ dùng khi hai team phối hợp chặt.\n' +
    '- **Customer/Supplier**: context downstream (customer) có tiếng nói với upstream (supplier) về nhu cầu; upstream commit hỗ trợ.\n' +
    '- **Conformist**: downstream chấp nhận model của upstream nguyên trạng (không có ACL) — khi upstream không thể ảnh hưởng.\n' +
    '- **Anti-Corruption Layer**: downstream dịch model upstream sang model của mình.\n' +
    '- **Published Language**: một schema chung, được version hoá, làm phương tiện trao đổi (Avro/Protobuf event schema, OpenAPI) — không ai "sở hữu" model của người kia.\n' +
    '- **Open Host Service**: upstream cung cấp một API/protocol ổn định cho mọi downstream.',
  essence:
    'Cách hai service tích hợp phản ánh quan hệ quyền lực & tin cậy giữa hai team. Published Language + Open Host Service (event schema chuẩn + API ổn định) là mô hình lành mạnh nhất cho microservices ở quy mô.',
  example:
    '`order` (downstream) cần dữ liệu từ `pricing` (upstream). Nếu cùng team: có thể Customer/Supplier. Nếu `pricing` là hệ dùng chung nhiều team: `pricing` publish **Published Language** — event `PriceChanged` theo Avro schema trong registry, `order` conform theo schema đó (hoặc ACL nếu schema xấu).',
  viz: {
    type: 'tree',
    title: 'Cách hai service tích hợp phản ánh quan hệ quyền lực & tin cậy giữa team',
    root: {
      label: 'DDD Context Mapping',
      children: [
        { label: 'Shared Kernel', note: 'chia sẻ một phần model/code — rủi ro coupling, chỉ khi hai team phối hợp chặt' },
        { label: 'Customer/Supplier', note: 'downstream có tiếng nói với upstream về nhu cầu' },
        { label: 'Conformist', note: 'downstream chấp nhận model upstream nguyên trạng (không ACL)' },
        { label: 'Anti-Corruption Layer', note: 'downstream dịch model upstream sang model của mình' },
        { label: 'Published Language + Open Host Service', note: 'schema chung version hoá + API ổn định — lành mạnh nhất ở quy mô' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba kiểu quan hệ trong context map",
      code:
        "// 1) SHARED KERNEL — hai context dùng chung một phần model.\n" +
        "//    Dùng RẤT hạn chế: mọi thay đổi phải được cả hai đội đồng ý.\n" +
        "//    Chấp nhận được cho: kiểu dữ liệu cơ bản (Money, Address, DateRange).\n" +
        "public record Money(BigDecimal amount, Currency currency) { }\n" +
        "//    KHÔNG chấp nhận được cho: entity nghiệp vụ (Order, Customer) —\n" +
        "//    đó là con đường thẳng tới distributed monolith.\n" +
        "\n" +
        "// 2) CUSTOMER / SUPPLIER — downstream (customer) có tiếng nói với\n" +
        "//    upstream (supplier) về hợp đồng. Được đảm bảo bằng CONTRACT TEST:\n" +
        "//    consumer công bố kỳ vọng, provider phải chạy lại và thoả mãn.\n" +
        "\n" +
        "// 3) CONFORMIST — downstream chấp nhận mô hình của upstream y nguyên,\n" +
        "//    không có tiếng nói (điển hình khi tích hợp với API bên thứ ba).\n" +
        "//    Rủi ro: mô hình của họ nhiễm vào code của mình -> nên kèm ACL.\n" +
        "\n" +
        "// 4) PUBLISHED LANGUAGE — ngôn ngữ chung ĐƯỢC CÔNG BỐ và có phiên bản,\n" +
        "//    độc lập với mô hình nội bộ của bất kỳ bên nào. Đây là lựa chọn TỐT NHẤT\n" +
        "//    cho tích hợp qua event:\n" +
        "public record OrderPlacedEvent(          // hợp đồng CÔNG KHAI, có version\n" +
        "    String eventId,\n" +
        "    String eventType,          // \"OrderPlaced\"\n" +
        "    int schemaVersion,         // 2\n" +
        "    Instant occurredAt,\n" +
        "    OrderPayload payload       // KHÁC với domain model nội bộ\n" +
        ") { }\n" +
        "// Mỗi bên tự dịch giữa published language và mô hình nội bộ của mình\n" +
        "// -> đổi mô hình nội bộ không ảnh hưởng ai.\n" +
        "\n" +
        "// 5) ANTI-CORRUPTION LAYER — lớp dịch bảo vệ mô hình của mình (xem câu riêng).\n" +
        "// 6) SEPARATE WAYS — không tích hợp gì cả. Đôi khi đây là câu trả lời đúng:\n" +
        "//    chi phí tích hợp lớn hơn giá trị thu được.",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-1mhxz0f',
  q: 'Data ownership — vì sao "không service nào đọc trực tiếp DB của service khác"?',
  answer:
    'Mỗi mẩu dữ liệu có **đúng một service sở hữu** — service đó là nguồn sự thật, chịu trách nhiệm tính đúng, và là nơi duy nhất ghi.\n\n' +
    'Service khác cần dữ liệu đó thì:\n' +
    '- **Query qua API** của service sở hữu (đồng bộ, dữ liệu mới nhất, nhưng coupling runtime).\n' +
    '- **Giữ bản sao (replica) cập nhật qua event** (bất đồng bộ, có thể stale, nhưng tách rời).\n\n' +
    'Đọc trực tiếp DB của service khác phá vỡ: đóng gói (schema thành API ngầm), khả năng đổi schema/công nghệ, ranh giới trách nhiệm.',
  essence:
    'Ownership rõ ràng = một nguồn sự thật, một nơi ghi, một nơi enforce invariant. Chia sẻ quyền truy cập dữ liệu (dù chỉ đọc) là chia sẻ coupling — và bạn không kiểm soát được ai phụ thuộc gì.',
  example:
    '`analytics-service` muốn số liệu order. Sai: kết nối vào Postgres của `order-service`, `SELECT * FROM orders`. Đúng: đăng ký consumer Kafka topic `orders` (do order-service phát), dựng bảng riêng trong DB analytics. Order-service đổi schema thoải mái, chỉ cần giữ event contract.',
  viz: {
    type: 'flow',
    title: 'Một nguồn sự thật, một nơi ghi, một nơi enforce invariant',
    nodes: ['Mỗi mẩu dữ liệu: đúng MỘT service sở hữu', 'Service khác cần dữ liệu đó', 'Query qua API (đồng bộ, mới nhất, coupling runtime)', 'HOẶC giữ replica cập nhật qua event (bất đồng bộ, có thể stale, tách rời)'],
    steps: [
      { to: 0, label: 'Service sở hữu = nguồn sự thật, nơi duy nhất ghi' },
      { to: 2, label: 'Không đọc trực tiếp DB của service khác — phá đóng gói, ranh giới trách nhiệm' },
      { to: 3, label: 'analytics đăng ký Kafka topic orders → dựng bảng riêng; order-service đổi schema thoải mái' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Một chủ sở hữu cho mỗi mảnh dữ liệu",
      code:
        "-- QUY TẮC: mỗi mảnh dữ liệu có ĐÚNG MỘT service sở hữu. Service đó là nơi\n" +
        "-- duy nhất được GHI, và là NGUỒN SỰ THẬT.\n" +
        "GRANT ALL ON SCHEMA orders TO order_service;\n" +
        "REVOKE ALL ON SCHEMA orders FROM reporting_service;   -- THỰC THI bằng quyền,\n" +
        "                                                       -- không chỉ bằng quy ước\n" +
        "\n" +
        "-- VÌ SAO ĐỌC TRỰC TIẾP CŨNG KHÔNG ĐƯỢC (nhiều người nghĩ đọc thì vô hại):\n" +
        "-- 1) SCHEMA thành API ngầm: đổi một cột là vỡ service khác, mà không ai\n" +
        "--    biết trước vì không có hợp đồng nào cả.\n" +
        "-- 2) BỎ QUA QUY TẮC NGHIỆP VỤ: bảng chỉ chứa dữ liệu thô; logic \"đơn nào\n" +
        "--    được coi là hợp lệ\" nằm trong code của service sở hữu.\n" +
        "-- 3) TRANH CHẤP TÀI NGUYÊN: truy vấn báo cáo nặng làm chậm giao dịch.\n" +
        "-- 4) Không refactor được: service sở hữu không dám đổi cấu trúc lưu trữ.\n" +
        "\n" +
        "-- BA CÁCH ĐÚNG ĐỂ LẤY DỮ LIỆU CỦA SERVICE KHÁC:\n" +
        "-- a) GỌI API (đồng bộ) — dữ liệu luôn mới, nhưng tạo phụ thuộc thời gian chạy\n" +
        "-- b) NGHE EVENT và giữ BẢN SAO cục bộ (bất đồng bộ) — tách rời tốt nhất\n" +
        "CREATE TABLE customer_replica (          -- BẢN SAO, không phải nguồn sự thật\n" +
        "  customer_id TEXT PRIMARY KEY,\n" +
        "  name        TEXT NOT NULL,\n" +
        "  tier        TEXT NOT NULL,\n" +
        "  updated_at  TIMESTAMPTZ NOT NULL\n" +
        ");\n" +
        "-- Chỉ giữ những field MÌNH CẦN, không sao chép cả bảng.\n" +
        "-- c) READ MODEL tổng hợp (CQRS) cho truy vấn xuyên service\n" +
        "\n" +
        "-- CÁCH DUY NHẤT ĐƯỢC PHÉP ĐỌC CHUNG DATABASE: qua một VIEW chỉ đọc, được\n" +
        "-- coi là hợp đồng công khai và có cam kết ổn định. Nhưng ngay cả khi đó,\n" +
        "-- API hoặc event vẫn là lựa chọn tốt hơn.",
    },
  ],
},
]);
