SS.addQuestions('java', [
{
  cat: 'Spring Data / JPA',
  id: 'java-1lnjq6e',
  q: 'Các trạng thái của một JPA entity là gì?',
  answer:
    '- **Transient (new)**: object vừa `new`, chưa liên kết với persistence context, không có id trong DB.\n' +
    '- **Managed (persistent)**: đang được persistence context theo dõi. Mọi thay đổi field sẽ tự động sync xuống DB khi flush (**dirty checking**).\n' +
    '- **Detached**: từng managed nhưng context đã đóng (hết transaction) hoặc `EntityManager` clear. Thay đổi không còn được theo dõi.\n' +
    '- **Removed**: đã gọi `remove()`, sẽ bị DELETE khi flush.\n\n' +
    'Chuyển trạng thái: `persist`, `merge` (detached→managed bằng cách copy), `remove`, `detach`/`clear`.',
  essence:
    'Chỉ entity ở trạng thái managed mới được tự động đồng bộ. "Sửa entity mà không thấy update DB" thường vì nó đang detached.',
  example:
    'Nhận `User` từ REST (detached, do deserialize), sửa `name`, rồi chỉ `user.setName(...)` mà không `repo.save(user)` → không có gì xảy ra. `save()` thực chất gọi `merge` để đưa nó về managed.',
  viz: {
    type: 'states',
    title: 'Trạng thái JPA entity',
    states: ['Transient', 'Managed', 'Detached', 'Removed'],
    start: 0,
    transitions: [
      { from: 0, to: 1, label: 'persist()' },
      { from: 1, to: 2, label: 'context đóng / detach / clear' },
      { from: 2, to: 1, label: 'merge()' },
      { from: 1, to: 3, label: 'remove()' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn trạng thái và đường đi giữa chúng",
      code:
        "@PersistenceContext EntityManager em;\n" +
        "\n" +
        "// 1) TRANSIENT — object Java thường, JPA chưa biết gì về nó, chưa có id\n" +
        "Order o = new Order(\"SKU-1\");\n" +
        "\n" +
        "// 2) MANAGED — nằm trong persistence context, mọi thay đổi được THEO DÕI\n" +
        "em.persist(o);                 // transient -> managed\n" +
        "Order found = em.find(Order.class, 1L);        // load lên là managed sẵn\n" +
        "found.setStatus(\"PAID\");       // KHÔNG cần gọi save(): dirty checking tự UPDATE\n" +
        "\n" +
        "// 3) DETACHED — từng managed, nhưng persistence context đã đóng/tách ra\n" +
        "em.detach(o);                  // managed -> detached\n" +
        "em.clear();                    // tách TẤT CẢ\n" +
        "// Sau khi transaction kết thúc, mọi entity đều thành detached.\n" +
        "// Sửa entity detached KHÔNG sinh UPDATE nào cả — đây là nguồn bug \"mất dữ liệu\".\n" +
        "Order merged = em.merge(o);    // detached -> managed (TRẢ VỀ object mới,\n" +
        "                               // object cũ VẪN detached — hay bị nhầm chỗ này)\n" +
        "\n" +
        "// 4) REMOVED — đã đánh dấu xoá, DELETE chạy khi flush\n" +
        "em.remove(found);              // managed -> removed\n" +
        "\n" +
        "// Ghi nhớ: chỉ MANAGED mới có dirty checking. Ba trạng thái còn lại,\n" +
        "// bạn sửa gì cũng không xuống DB.",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-1h2123g',
  q: 'Persistence context (first-level cache) và dirty checking hoạt động thế nào?',
  answer:
    'Persistence context là một `Map<EntityKey, Entity>` gắn với transaction. Trong cùng transaction, `findById(1)` hai lần trả về **cùng một object** (không query lần hai) — đó là first-level cache, luôn bật, không tắt được.\n\n' +
    'Khi load, Hibernate chụp lại "snapshot" các field. Lúc **flush** (trước commit, trước query, hoặc gọi tay), nó so sánh state hiện tại với snapshot → sinh UPDATE cho field đã đổi. Không cần gọi `save()`.',
  essence:
    'Persistence context vừa là cache trong-transaction vừa là "unit of work" gom thay đổi. Dirty checking khiến `setter` trên entity managed đủ để cập nhật DB.',
  example:
    '`@Transactional void deactivate(Long id){ User u = repo.findById(id).orElseThrow(); u.setActive(false); }` — không có `save()` nào, nhưng khi method kết thúc, Hibernate flush và chạy `UPDATE users SET active=false WHERE id=?`.',
  viz: {
    type: 'flow',
    title: 'Dirty checking — không cần save()',
    nodes: ['findById()', 'chụp snapshot fields', 'setter đổi field', 'flush (trước commit)', 'so sánh với snapshot', 'sinh UPDATE'],
    steps: [
      { to: 0, label: 'entity vào persistence context (managed); findById lần 2 trả cùng object' },
      { to: 1, label: 'Hibernate lưu snapshot giá trị field lúc load' },
      { to: 2, label: 'code gọi u.setActive(false) — không gọi save()' },
      { to: 4, label: 'lúc flush: so state hiện tại với snapshot' },
      { to: 5, label: 'field đã đổi → sinh UPDATE cho đúng cột đó' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cache cấp 1 và dirty checking",
      code:
        "@Transactional\n" +
        "public void demo() {\n" +
        "    Order a = repo.findById(1L).orElseThrow();\n" +
        "    Order b = repo.findById(1L).orElseThrow();\n" +
        "\n" +
        "    // CHỈ MỘT câu SELECT chạy. Lần thứ hai lấy từ persistence context.\n" +
        "    System.out.println(a == b);      // true — CÙNG một object trong bộ nhớ\n" +
        "    // -> Đây là \"repeatable read\" ở mức ứng dụng, luôn bật, không tắt được.\n" +
        "\n" +
        "    a.setStatus(\"PAID\");             // không gọi save() gì cả\n" +
        "    // Lúc commit, Hibernate so sánh snapshot chụp lúc load với giá trị hiện tại\n" +
        "    // -> phát hiện status đổi -> tự sinh UPDATE. Đó là DIRTY CHECKING.\n" +
        "}\n" +
        "// Phạm vi: persistence context sống theo TRANSACTION. Hết transaction là hết.\n" +
        "\n" +
        "@Transactional\n" +
        "public void batchLeak() {\n" +
        "    for (int i = 0; i < 100_000; i++) {\n" +
        "        em.persist(new Order(\"SKU-\" + i));\n" +
        "        // Mỗi entity managed được giữ + một SNAPSHOT để so sánh -> tốn RAM gấp đôi,\n" +
        "        // và dirty checking phải quét toàn bộ -> càng lúc càng chậm -> OOM.\n" +
        "        if (i % 500 == 0) {\n" +
        "            em.flush();    // đẩy SQL xuống DB\n" +
        "            em.clear();    // BẮT BUỘC: dọn persistence context\n" +
        "        }\n" +
        "    }\n" +
        "}",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-76dwvl',
  q: 'Lazy và eager loading? `LazyInitializationException` từ đâu ra?',
  answer:
    '`FetchType.LAZY`: quan hệ chỉ được load khi truy cập lần đầu (Hibernate dùng proxy). `EAGER`: load ngay cùng entity cha.\n\n' +
    'Mặc định: `@ManyToOne`/`@OneToOne` là EAGER, `@OneToMany`/`@ManyToMany` là LAZY. Khuyến nghị: đặt **tất cả LAZY**, chỉ fetch khi cần.\n\n' +
    '`LazyInitializationException`: truy cập quan hệ lazy khi persistence context đã đóng (ngoài `@Transactional`, ví dụ ở tầng controller hoặc khi serialize JSON).',
  essence:
    'Lazy hoãn truy vấn để tránh kéo dữ liệu thừa, nhưng dữ liệu chỉ lấy được khi session còn mở. Lỗi này là dấu hiệu bạn đang cố dùng entity ngoài ranh giới transaction.',
  example:
    'Controller trả thẳng `order` có `List<Item> items` LAZY → Jackson serialize chạm `items` ngoài transaction → exception. Sửa: map sang DTO **trong** service (còn transaction), hoặc dùng fetch join/`@EntityGraph`.',
  viz: {
    type: 'compare',
    cols: ['FetchType.LAZY', 'FetchType.EAGER'],
    rows: [
      ['Khi nào load quan hệ', 'lần đầu truy cập (proxy)', 'ngay cùng entity cha'],
      ['Mặc định', '@OneToMany, @ManyToMany', '@ManyToOne, @OneToOne'],
      ['Rủi ro', 'LazyInitializationException ngoài transaction', 'kéo dữ liệu thừa, N+1 ngầm'],
      ['Khuyến nghị', 'đặt tất cả LAZY, fetch join khi cần', 'tránh'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "LazyInitializationException và ba cách chữa đúng",
      code:
        "@Entity\n" +
        "public class Order {\n" +
        "    @ManyToOne(fetch = FetchType.LAZY)     // @ManyToOne/@OneToOne MẶC ĐỊNH LÀ EAGER\n" +
        "    private Customer customer;             // -> luôn ghi rõ LAZY\n" +
        "\n" +
        "    @OneToMany(mappedBy = \"order\")         // @OneToMany/@ManyToMany mặc định LAZY (đúng)\n" +
        "    private List<OrderLine> lines;\n" +
        "}\n" +
        "\n" +
        "// LazyInitializationException: chạm vào field lazy SAU khi session đã đóng\n" +
        "public Order getBroken(Long id) {\n" +
        "    Order o = repo.findById(id).orElseThrow();   // transaction kết thúc ở đây\n" +
        "    return o;                                     // controller gọi o.getLines()\n" +
        "}                                                 // -> no Session\n" +
        "\n" +
        "// CHỮA 1 (tốt nhất): fetch join — lấy đúng thứ cần, trong MỘT câu truy vấn\n" +
        "@Query(\"SELECT o FROM Order o JOIN FETCH o.lines WHERE o.id = :id\")\n" +
        "Optional<Order> findWithLines(@Param(\"id\") Long id);\n" +
        "\n" +
        "// CHỮA 2: entity graph — khai báo, không phải sửa JPQL\n" +
        "@EntityGraph(attributePaths = {\"lines\", \"customer\"})\n" +
        "Optional<Order> findById(Long id);\n" +
        "\n" +
        "// CHỮA 3: map sang DTO NGAY TRONG transaction\n" +
        "@Transactional(readOnly = true)\n" +
        "public OrderDto get(Long id) {\n" +
        "    Order o = repo.findById(id).orElseThrow();\n" +
        "    return new OrderDto(o.getId(), o.getLines().size());   // chạm lazy khi còn session\n" +
        "}\n" +
        "\n" +
        "// ĐỪNG chữa bằng spring.jpa.open-in-view: nó giữ session mở suốt request,\n" +
        "// che lỗi đi và âm thầm bắn N+1 query từ tầng view. Boot còn cảnh báo khi bật.\n" +
        "// -> spring.jpa.open-in-view: false",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-1s1vs68',
  q: 'N+1 select problem là gì và khắc phục thế nào?',
  answer:
    'Load danh sách N `Order`, rồi vòng lặp truy cập `order.getCustomer()` (lazy) → 1 query lấy list + N query lấy từng customer = **N+1** query.\n\n' +
    'Khắc phục:\n' +
    '- **JOIN FETCH** trong JPQL: `select o from Order o join fetch o.customer`.\n' +
    '- `@EntityGraph(attributePaths = "customer")` trên method repository.\n' +
    '- `@BatchSize(size = 50)` / `hibernate.default_batch_fetch_size` → gom N query thành N/50 query `IN (...)`.\n' +
    '- DTO projection với JPQL constructor expression (chỉ lấy cột cần).',
  essence:
    'N+1 là hệ quả của lazy loading trong vòng lặp. Giải pháp là "nói trước" cái gì cần: fetch join / entity graph / batch fetch.',
  example:
    'Màn hình 20 đơn hàng hiện tên khách + tên 3 sản phẩm đầu: `@EntityGraph(attributePaths = {"customer","items"})` biến ~80 query thành 1–2 query. Bật `spring.jpa.properties.hibernate.generate_statistics=true` để phát hiện.',
  viz: {
    type: 'tree',
    title: 'N+1 = 1 query list + N query quan hệ lazy trong vòng lặp',
    root: {
      label: 'Khắc phục: "nói trước" cái gì cần',
      children: [
        { label: 'JOIN FETCH trong JPQL', note: 'select o from Order o join fetch o.customer' },
        { label: '@EntityGraph(attributePaths = ...)', note: 'trên method repository' },
        { label: '@BatchSize / default_batch_fetch_size', note: 'gom N query thành N/size query IN (...)' },
        { label: 'DTO projection', note: 'constructor expression — chỉ lấy cột cần' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "N+1 xuất hiện thế nào và bốn cách khắc phục",
      code:
        "// 1 câu lấy danh sách + N câu lấy quan hệ của từng phần tử\n" +
        "List<Order> orders = repo.findAll();          // SELECT * FROM orders        (1 câu)\n" +
        "for (Order o : orders) {\n" +
        "    o.getCustomer().getName();                // SELECT * FROM customers ... (N câu)\n" +
        "}\n" +
        "// 100 đơn -> 101 query. Trên môi trường thật, đây là nguyên nhân chậm\n" +
        "// phổ biến nhất của ứng dụng JPA.\n" +
        "\n" +
        "// CÁCH 1: JOIN FETCH — dùng nhiều nhất\n" +
        "@Query(\"SELECT DISTINCT o FROM Order o JOIN FETCH o.customer\")\n" +
        "List<Order> findAllWithCustomer();\n" +
        "// Lưu ý: JOIN FETCH nhiều collection cùng lúc -> tích Descartes.\n" +
        "// Nhiều hơn một collection thì tách query hoặc dùng @BatchSize.\n" +
        "\n" +
        "// CÁCH 2: @EntityGraph — sạch hơn, giữ nguyên method Spring Data\n" +
        "@EntityGraph(attributePaths = \"customer\")\n" +
        "List<Order> findAll();\n" +
        "\n" +
        "// CÁCH 3: @BatchSize — gom N câu thành N/size câu IN (...)\n" +
        "@Entity\n" +
        "class Order {\n" +
        "    @ManyToOne(fetch = FetchType.LAZY)\n" +
        "    @BatchSize(size = 50)                     // 100 câu -> 2 câu\n" +
        "    private Customer customer;\n" +
        "}\n" +
        "// Hoặc bật toàn cục: spring.jpa.properties.hibernate.default_batch_fetch_size=50\n" +
        "\n" +
        "// CÁCH 4: chiếu thẳng sang DTO — không nạp entity, thường là nhanh nhất\n" +
        "@Query(\"SELECT new com.example.OrderDto(o.id, c.name) FROM Order o JOIN o.customer c\")\n" +
        "List<OrderDto> findAllDto();",
    },
    {
      lang: "yaml",
      title: "Phát hiện N+1 trước khi lên production",
      code:
        "spring:\n" +
        "  jpa:\n" +
        "    properties:\n" +
        "      hibernate:\n" +
        "        generate_statistics: true      # in số câu truy vấn mỗi transaction\n" +
        "    open-in-view: false                # đừng để view tự bắn query\n" +
        "logging:\n" +
        "  level:\n" +
        "    org.hibernate.SQL: DEBUG\n" +
        "    org.hibernate.stat: DEBUG\n" +
        "# Chắc chắn hơn: thêm datasource-proxy hoặc thư viện quick-perf vào test,\n" +
        "# rồi ASSERT số câu query. N+1 xuất hiện là test đỏ ngay.",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-1pw2pbs',
  q: '`@Transactional(readOnly = true)` mang lại lợi ích gì?',
  answer:
    '- Hibernate đặt `FlushMode = MANUAL` → **không dirty checking, không flush tự động** → tiết kiệm CPU và tránh UPDATE ngoài ý muốn.\n' +
    '- Gợi ý cho driver/DB rằng transaction chỉ đọc (một số DB tối ưu, hoặc route sang read replica).\n' +
    '- Với cấu hình read/write splitting, `readOnly` là tín hiệu để chọn `DataSource` replica.\n\n' +
    'Không phải "khoá chống ghi" — nếu bạn cố ghi, tuỳ cấu hình có thể vẫn ghi hoặc lỗi.',
  essence:
    'Chủ yếu là tối ưu Hibernate (bỏ snapshot + flush) và là hint định tuyến. Nên đặt cho mọi service method chỉ truy vấn.',
  example:
    '`@Transactional(readOnly = true) List<OrderDto> search(...)` — không tốn chi phí dirty-check trên hàng nghìn entity load ra, và với `AbstractRoutingDataSource` sẽ đọc từ replica, giảm tải primary.',
  viz: {
    type: 'tree',
    title: '@Transactional(readOnly = true)',
    root: {
      label: 'Lợi ích (nên đặt cho mọi method chỉ truy vấn)',
      children: [
        { label: 'FlushMode = MANUAL', note: 'không dirty checking, không flush → tiết kiệm CPU, tránh UPDATE ngoài ý muốn' },
        { label: 'Hint cho driver/DB', note: 'một số DB tối ưu transaction chỉ đọc' },
        { label: 'Route sang read replica', note: 'với AbstractRoutingDataSource — giảm tải primary' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba lợi ích thật sự",
      code:
        "@Transactional(readOnly = true)     // nên đặt mặc định cho MỌI method chỉ đọc\n" +
        "public OrderDto get(Long id) {\n" +
        "    return repo.findById(id).map(OrderDto::from).orElseThrow();\n" +
        "}\n" +
        "// 1) Hibernate chuyển FlushMode sang MANUAL -> KHÔNG chạy dirty checking,\n" +
        "//    không giữ snapshot -> đỡ CPU và RAM rõ rệt khi đọc nhiều bản ghi.\n" +
        "// 2) Đặt cờ read-only xuống JDBC Connection -> DB có thể tối ưu thêm\n" +
        "//    (PostgreSQL/MySQL). Với replica, đây còn là điều kiện để định tuyến đọc.\n" +
        "// 3) Là tài liệu sống: người đọc code biết ngay method này không ghi.\n" +
        "\n" +
        "@Service\n" +
        "@Transactional(readOnly = true)      // mặc định cho cả class\n" +
        "public class OrderService {\n" +
        "\n" +
        "    @Transactional                   // ghi đè cho method ghi\n" +
        "    public void place(Order o) { repo.save(o); }\n" +
        "}\n" +
        "\n" +
        "// BẪY: readOnly KHÔNG phải là bảo đảm an toàn. Với REQUIRED, nếu đã có\n" +
        "// transaction ghi ở ngoài thì cờ readOnly bị BỎ QUA và ghi vẫn xuống DB.\n" +
        "// Nó là gợi ý tối ưu, không phải cơ chế cấm ghi.",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-fcvcdk',
  q: 'JPQL, native query và Criteria API — chọn cái nào?',
  answer:
    '- **JPQL / `@Query`**: viết theo entity, portable giữa các DB, kiểm tra lúc khởi động. Đủ cho 90% trường hợp.\n' +
    '- **Native query** (`nativeQuery = true`): SQL thật. Dùng khi cần tính năng riêng của DB (window function, CTE, upsert, hint), hoặc tối ưu query phức tạp.\n' +
    '- **Criteria API**: build query bằng code, type-safe (với metamodel). Dùng cho **query động** (search nhiều điều kiện tuỳ chọn) — nhưng dài dòng; thay thế nhẹ hơn là Spring Data `Specification` hoặc QueryDSL.',
  essence:
    'JPQL cho truy vấn tĩnh, portable. Native cho khi cần sức mạnh DB cụ thể. Criteria/Specification cho khi cấu trúc query thay đổi theo input.',
  example:
    'Bộ lọc sản phẩm (giá, danh mục, còn hàng — mỗi cái optional): dùng `Specification` ghép các `Predicate` theo tham số có mặt. Báo cáo doanh thu theo tháng dùng `SUM() OVER()` → native query.',
  viz: {
    type: 'compare',
    cols: ['JPQL / @Query', 'Native query', 'Criteria / Specification'],
    rows: [
      ['Viết theo', 'entity', 'SQL thật', 'code (type-safe với metamodel)'],
      ['Portable giữa DB', 'có', 'không', 'có'],
      ['Kiểm tra', 'lúc khởi động', 'runtime', 'lúc biên dịch'],
      ['Dùng khi', 'truy vấn tĩnh (90%)', 'tính năng riêng DB: window, CTE, upsert', 'query động theo input'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba công cụ, ba mục đích",
      code:
        "public interface OrderRepository extends JpaRepository<Order, Long> {\n" +
        "\n" +
        "    // 1) Derived query — đơn giản nhất, tên method sinh ra câu truy vấn.\n" +
        "    // Quá 3-4 điều kiện là tên method dài không đọc nổi -> chuyển sang @Query.\n" +
        "    List<Order> findByStatusAndCreatedAtAfter(String status, Instant after);\n" +
        "\n" +
        "    // 2) JPQL — viết theo ENTITY và field Java, không phải bảng/cột.\n" +
        "    // Được kiểm tra lúc khởi động, đổi DB không phải sửa.\n" +
        "    @Query(\"SELECT o FROM Order o WHERE o.status = :status AND o.total > :min\")\n" +
        "    List<Order> search(@Param(\"status\") String status, @Param(\"min\") BigDecimal min);\n" +
        "\n" +
        "    // Chiếu thẳng sang DTO -> chỉ lấy đúng cột cần\n" +
        "    @Query(\"SELECT new com.example.OrderSummary(o.id, o.total) FROM Order o\")\n" +
        "    List<OrderSummary> summaries();\n" +
        "\n" +
        "    // 3) NATIVE — khi cần tính năng riêng của DB (window function, CTE, JSONB,\n" +
        "    // full-text). Đổi lại: mất tính di động, không kiểm tra được lúc biên dịch.\n" +
        "    @Query(value = \"\"\"\n" +
        "            SELECT o.*, RANK() OVER (PARTITION BY customer_id ORDER BY total DESC) rnk\n" +
        "            FROM orders o WHERE o.created_at > :since\n" +
        "            \"\"\", nativeQuery = true)\n" +
        "    List<Order> ranked(@Param(\"since\") Instant since);\n" +
        "}\n" +
        "\n" +
        "// 4) Criteria API / Specification — khi điều kiện lọc ĐỘNG theo input người dùng.\n" +
        "// Rất dài dòng, chỉ dùng đúng chỗ này.\n" +
        "public static Specification<Order> hasStatus(String s) {\n" +
        "    return (root, q, cb) -> s == null ? null : cb.equal(root.get(\"status\"), s);\n" +
        "}\n" +
        "repo.findAll(where(hasStatus(status)).and(createdAfter(from)), pageable);\n" +
        "// -> Cân nhắc QueryDSL: cùng mục đích nhưng đọc dễ hơn nhiều.\n" +
        "\n" +
        "// TUYỆT ĐỐI KHÔNG nối chuỗi để tạo query -> SQL injection:\n" +
        "//   \"SELECT o FROM Order o WHERE o.status = \u0027\" + input + \"\u0027\"   // SAI",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-1hcl4f4',
  q: 'Optimistic locking và pessimistic locking khác nhau thế nào?',
  answer:
    '**Optimistic** (`@Version` trên field int/timestamp): không khoá gì khi đọc. Lúc UPDATE, Hibernate thêm `WHERE version = ?`; nếu 0 dòng bị ảnh hưởng (ai đó đã sửa) → `OptimisticLockException`. Giả định xung đột hiếm.\n\n' +
    '**Pessimistic** (`@Lock(PESSIMISTIC_WRITE)` → `SELECT ... FOR UPDATE`): khoá dòng ngay khi đọc, thread khác chờ. Giả định xung đột thường xuyên, hoặc thao tác không idempotent.',
  essence:
    'Optimistic: "cứ làm, kiểm tra lúc ghi, thất bại thì thử lại" — throughput cao, cần retry logic. Pessimistic: "khoá trước cho chắc" — đơn giản nhưng giảm concurrency, nguy cơ deadlock.',
  example:
    'Sửa hồ sơ người dùng (hiếm khi hai người sửa cùng lúc): optimistic + hiện thông báo "dữ liệu đã thay đổi, tải lại". Trừ tồn kho vé concert lúc mở bán (tranh chấp cực cao): pessimistic hoặc `UPDATE ... SET qty = qty - 1 WHERE qty > 0` nguyên tử.',
  viz: {
    type: 'compare',
    cols: ['Optimistic (@Version)', 'Pessimistic (SELECT ... FOR UPDATE)'],
    rows: [
      ['Khi đọc', 'không khoá', 'khoá dòng ngay, thread khác chờ'],
      ['Phát hiện xung đột', 'lúc UPDATE: WHERE version = ? → 0 dòng → OptimisticLockException', 'không xảy ra (đã khoá)'],
      ['Giả định', 'xung đột hiếm', 'xung đột thường xuyên'],
      ['Đánh đổi', 'throughput cao, cần retry logic', 'đơn giản, giảm concurrency, nguy cơ deadlock'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "@Version vs khoá ở DB",
      code:
        "// OPTIMISTIC — không khoá gì cả, chỉ KIỂM TRA lúc ghi.\n" +
        "@Entity\n" +
        "public class Product {\n" +
        "    @Id private Long id;\n" +
        "    private int stock;\n" +
        "\n" +
        "    @Version                       // Hibernate tự tăng mỗi lần UPDATE\n" +
        "    private Long version;          // UPDATE ... WHERE id = ? AND version = ?\n" +
        "}                                  // 0 dòng bị ảnh hưởng -> ai đó đã sửa trước\n" +
        "                                   // -> OptimisticLockException\n" +
        "\n" +
        "@Service\n" +
        "public class StockService {\n" +
        "    @Retryable(retryFor = ObjectOptimisticLockingFailureException.class,\n" +
        "               maxAttempts = 3, backoff = @Backoff(delay = 50))\n" +
        "    @Transactional\n" +
        "    public void decrease(Long id, int qty) {       // xung đột thì thử lại\n" +
        "        Product p = repo.findById(id).orElseThrow();\n" +
        "        p.setStock(p.getStock() - qty);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// PESSIMISTIC — khoá NGAY từ lúc đọc, người khác phải chờ.\n" +
        "public interface ProductRepository extends JpaRepository<Product, Long> {\n" +
        "\n" +
        "    @Lock(LockModeType.PESSIMISTIC_WRITE)          // SELECT ... FOR UPDATE\n" +
        "    @QueryHints(@QueryHint(name = \"jakarta.persistence.lock.timeout\", value = \"3000\"))\n" +
        "    Optional<Product> findByIdForUpdate(Long id);\n" +
        "\n" +
        "    @Lock(LockModeType.PESSIMISTIC_READ)           // SELECT ... FOR SHARE\n" +
        "    Optional<Product> findByIdShared(Long id);\n" +
        "}\n" +
        "\n" +
        "// CHỌN THẾ NÀO:\n" +
        "//   Xung đột HIẾM (đa số trường hợp)      -> optimistic. Không khoá, dễ mở rộng.\n" +
        "//   Xung đột NHIỀU trên cùng một bản ghi  -> pessimistic. Retry liên tục còn tệ hơn.\n" +
        "//   Giao dịch dài, người dùng ngồi sửa form -> BẮT BUỘC optimistic\n" +
        "//     (khoá pessimistic qua nhiều request là công thức gây deadlock).\n" +
        "// Nhớ: pessimistic lock luôn cần TIMEOUT, nếu không một transaction treo\n" +
        "// sẽ kéo theo cả hệ thống.",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-hi4nt8',
  q: 'Khi nào Hibernate flush? `save()` và `saveAndFlush()` khác gì?',
  answer:
    'Flush = đồng bộ thay đổi trong persistence context xuống DB (chạy INSERT/UPDATE/DELETE), **chưa commit**.\n\n' +
    'Xảy ra tự động khi: (1) transaction commit; (2) trước khi chạy một query có thể bị ảnh hưởng bởi thay đổi đang chờ (`AUTO` mode); (3) gọi `flush()` tay.\n\n' +
    '`repository.save(e)`: với entity mới → `persist` (có thể hoãn INSERT tới flush); với detached → `merge`. **Không** ép flush ngay.\n' +
    '`saveAndFlush(e)`: `save` rồi `flush()` ngay — thấy lỗi ràng buộc DB lập tức, hoặc cần id/sequence ngay.',
  essence:
    'Hibernate gom thao tác và ghi theo lô lúc flush để tối ưu. `saveAndFlush` phá tính hoãn đó để lấy phản hồi DB sớm.',
  example:
    'Import 10.000 dòng: `save` trong vòng lặp + `entityManager.flush()/clear()` mỗi 500 dòng để tránh persistence context phình to gây OOM và để tận dụng JDBC batch.',
  viz: {
    type: 'compare',
    cols: ['save()', 'saveAndFlush()'],
    rows: [
      ['Với entity mới', 'persist — có thể hoãn INSERT tới flush', 'persist rồi flush() ngay'],
      ['Với detached', 'merge', 'merge rồi flush() ngay'],
      ['Ép ghi xuống DB', 'không (gom theo lô)', 'có'],
      ['Dùng khi', 'bình thường (tối ưu batch)', 'cần thấy lỗi ràng buộc / id / sequence ngay'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba thời điểm flush tự động và save vs saveAndFlush",
      code:
        "@Transactional\n" +
        "public void demo() {\n" +
        "    Order o = new Order(\"SKU-1\");\n" +
        "    repo.save(o);          // CHƯA chắc có INSERT ngay. Với id GenerationType.IDENTITY\n" +
        "                           // thì buộc phải INSERT ngay để lấy id; với SEQUENCE thì không.\n" +
        "\n" +
        "    // Hibernate tự flush ở ba thời điểm:\n" +
        "    //  1) trước khi COMMIT\n" +
        "    //  2) trước khi chạy một QUERY có thể bị ảnh hưởng bởi thay đổi đang treo\n" +
        "    //  3) khi gọi tay em.flush()\n" +
        "    List<Order> all = repo.findAll();   // <- flush ở đây để query thấy dữ liệu mới\n" +
        "}\n" +
        "\n" +
        "// save() vs saveAndFlush()\n" +
        "repo.save(o);            // chỉ đưa vào persistence context, để dành tới lúc flush\n" +
        "repo.saveAndFlush(o);    // ép SQL xuống DB NGAY\n" +
        "\n" +
        "// Khi nào cần saveAndFlush:\n" +
        "//  - cần đọc lại bằng native query (native query KHÔNG kích hoạt flush tự động)\n" +
        "//  - muốn bắt lỗi ràng buộc (unique, FK) ngay tại chỗ để xử lý\n" +
        "//  - trong test, muốn kiểm chứng SQL thật sự chạy\n" +
        "// LƯU Ý: flush KHÔNG phải commit. Rollback sau flush vẫn huỷ sạch mọi thứ.\n" +
        "\n" +
        "// Batch insert cần cả ba thứ, thiếu một là không có hiệu quả:\n" +
        "//   spring.jpa.properties.hibernate.jdbc.batch_size=50\n" +
        "//   spring.jpa.properties.hibernate.order_inserts=true\n" +
        "//   + id KHÔNG dùng IDENTITY (IDENTITY vô hiệu hoá batch hoàn toàn)",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-1w60wyv',
  q: 'Cascade types và `orphanRemoval` — ý nghĩa và cạm bẫy?',
  answer:
    'Cascade lan truyền thao tác từ entity cha sang con: `PERSIST`, `MERGE`, `REMOVE`, `REFRESH`, `DETACH`, `ALL`.\n\n' +
    '`orphanRemoval = true`: khi một con bị **gỡ khỏi collection** của cha (`order.getItems().remove(item)`), con đó bị DELETE — mô hình "con không tồn tại độc lập".\n\n' +
    'Cạm bẫy: `CascadeType.ALL` + `orphanRemoval` trên quan hệ dùng chung (many-to-many hoặc con được entity khác tham chiếu) → xoá cha xoá luôn dữ liệu người khác đang dùng.',
  essence:
    'Cascade chỉ hợp lý cho quan hệ **sở hữu thật sự** (aggregate: Order sở hữu OrderItem). Với quan hệ tham chiếu (Order → Customer), không cascade REMOVE.',
  example:
    '`@OneToMany(mappedBy="order", cascade=ALL, orphanRemoval=true) List<OrderItem> items` — hợp lý, item không sống ngoài order. Nhưng đặt cascade REMOVE từ `Order` sang `Customer` sẽ xoá khách hàng khi xoá đơn — thảm hoạ.',
  viz: {
    type: 'tree',
    title: 'Cascade — chỉ cho quan hệ SỞ HỮU thật sự',
    root: {
      label: 'Cascade lan truyền thao tác cha → con',
      children: [
        { label: 'PERSIST / MERGE / REMOVE / REFRESH / DETACH / ALL' },
        { label: 'orphanRemoval = true', note: 'gỡ con khỏi collection → DELETE con' },
        { label: 'Hợp lý: Order → OrderItem', note: 'aggregate, item không sống độc lập' },
        { label: 'Cạm bẫy: cascade REMOVE Order → Customer', note: 'xoá đơn xoá luôn khách — thảm hoạ' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Cascade nào an toàn, cascade nào nguy hiểm",
      code:
        "@Entity\n" +
        "public class Order {\n" +
        "\n" +
        "    // Quan hệ SỞ HỮU thật sự: OrderLine không tồn tại độc lập ngoài Order\n" +
        "    @OneToMany(mappedBy = \"order\",\n" +
        "               cascade = CascadeType.ALL,     // PERSIST + MERGE + REMOVE + REFRESH + DETACH\n" +
        "               orphanRemoval = true)          // gỡ khỏi list -> XOÁ hẳn khỏi DB\n" +
        "    private List<OrderLine> lines = new ArrayList<>();\n" +
        "\n" +
        "    // Quan hệ THAM CHIẾU: Customer sống độc lập -> TUYỆT ĐỐI không cascade REMOVE\n" +
        "    @ManyToOne(fetch = FetchType.LAZY)        // cascade = {} (mặc định)\n" +
        "    private Customer customer;                // xoá 1 đơn mà mất luôn khách hàng\n" +
        "}                                             // là tai nạn kinh điển\n" +
        "\n" +
        "// CASCADE REMOVE vs ORPHAN REMOVAL — khác nhau ở chỗ nào:\n" +
        "order.getLines().remove(line);      // orphanRemoval=true -> DELETE dòng đó\n" +
        "                                    // chỉ cascade REMOVE  -> KHÔNG xoá, chỉ mất liên kết\n" +
        "repo.delete(order);                 // cả hai đều xoá các line theo\n" +
        "\n" +
        "// BẪY thay cả danh sách: gán list mới làm Hibernate mất dấu collection\n" +
        "order.setLines(newLines);                     // SAI với orphanRemoval\n" +
        "order.getLines().clear();                     // ĐÚNG: sửa TẠI CHỖ\n" +
        "order.getLines().addAll(newLines);\n" +
        "\n" +
        "// Luôn có helper hai chiều để tránh lệch quan hệ:\n" +
        "public void addLine(OrderLine l) {\n" +
        "    lines.add(l);\n" +
        "    l.setOrder(this);         // thiếu dòng này -> cột FK là null\n" +
        "}",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-7sgfp',
  q: 'Vì sao không nên trả entity trực tiếp ra API? Dùng projection/DTO thế nào?',
  answer:
    'Trả entity gây: lộ cấu trúc DB & field nhạy cảm; `LazyInitializationException` hoặc kéo cả đồ thị quan hệ; vòng lặp vô hạn khi serialize quan hệ hai chiều; coupling API contract với schema; khó versioning.\n\n' +
    'Giải pháp:\n' +
    '- **DTO record** map thủ công hoặc bằng MapStruct trong service (còn transaction).\n' +
    '- **Interface projection** của Spring Data: `interface OrderView { Long getId(); String getCustomerName(); }` — Hibernate chỉ SELECT cột cần.\n' +
    '- **Constructor expression** JPQL: `select new com.acme.OrderDto(o.id, c.name) from Order o join o.customer c`.',
  essence:
    'API contract và persistence model là hai thứ khác nhau, tiến hoá với nhịp khác nhau. DTO là ranh giới chống rò rỉ giữa chúng, đồng thời giảm dữ liệu truy vấn.',
  example:
    'Danh sách đơn hàng chỉ cần id, ngày, tổng tiền, tên khách: interface projection `OrderSummary` → query chỉ lấy 4 cột thay vì hydrate cả entity `Order` + `Customer` + `List<OrderItem>`.',
  viz: {
    type: 'compare',
    cols: ['Trả entity trực tiếp', 'DTO / projection'],
    rows: [
      ['Lộ thông tin', 'cấu trúc DB + field nhạy cảm', 'chỉ field cần'],
      ['Serialize quan hệ', 'LazyInitializationException / vòng lặp vô hạn', 'an toàn'],
      ['Coupling', 'API contract dính schema', 'ranh giới rõ, tiến hoá độc lập'],
      ['Dữ liệu truy vấn', 'hydrate cả đồ thị', 'SELECT đúng cột cần'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn lý do và ba cách map",
      code:
        "// Lý do:\n" +
        "//  1) BẢO MẬT: field nhạy cảm (passwordHash, internalNote) lộ ra ngoài\n" +
        "//  2) LazyInitializationException hoặc N+1 khi Jackson serialize field lazy\n" +
        "//  3) Vòng lặp vô hạn với quan hệ hai chiều (Order -> lines -> order -> ...)\n" +
        "//  4) Đổi schema DB là VỠ hợp đồng API của client\n" +
        "\n" +
        "// CÁCH 1: DTO thủ công — rõ ràng nhất, không ma thuật\n" +
        "public record OrderDto(Long id, String status, BigDecimal total, String customerName) {\n" +
        "    public static OrderDto from(Order o) {\n" +
        "        return new OrderDto(o.getId(), o.getStatus(), o.getTotal(), o.getCustomer().getName());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// CÁCH 2: interface projection — Spring Data tự sinh, CHỈ SELECT cột cần\n" +
        "public interface OrderSummary {\n" +
        "    Long getId();\n" +
        "    BigDecimal getTotal();\n" +
        "    @Value(\"#{target.customer.name}\")      // projection động (mở, kèm rủi ro N+1)\n" +
        "    String getCustomerName();\n" +
        "}\n" +
        "List<OrderSummary> findByStatus(String status);   // SQL chỉ lấy id, total\n" +
        "\n" +
        "// CÁCH 3: chiếu vào class trong JPQL — kiểm soát chính xác câu SQL\n" +
        "@Query(\"SELECT new com.example.OrderDto(o.id, o.status, o.total, c.name) \" +\n" +
        "       \"FROM Order o JOIN o.customer c WHERE o.status = :s\")\n" +
        "List<OrderDto> findDtos(@Param(\"s\") String status);\n" +
        "\n" +
        "// MapStruct sinh code map lúc BIÊN DỊCH -> không reflection, không tốn runtime.\n" +
        "@Mapper(componentModel = \"spring\")\n" +
        "public interface OrderMapper {\n" +
        "    @Mapping(source = \"customer.name\", target = \"customerName\")\n" +
        "    OrderDto toDto(Order order);\n" +
        "}",
    },
  ],
},
{
  cat: 'Spring MVC',
  id: 'java-1yj5ez4',
  q: '`@RestController` khác `@Controller` thế nào? Content negotiation là gì?',
  answer:
    '`@Controller`: giá trị trả về (String) được hiểu là **tên view** → `ViewResolver` render HTML.\n\n' +
    '`@RestController` = `@Controller` + `@ResponseBody` ở cấp class → mọi giá trị trả về được **serialize thẳng vào body** qua `HttpMessageConverter` (Jackson cho JSON).\n\n' +
    '**Content negotiation**: Spring chọn converter dựa trên header `Accept` của client và các converter có trên classpath. `Accept: application/xml` + Jackson XML → trả XML; mặc định JSON.',
  essence:
    '`@Controller` hướng view (server-side rendering); `@RestController` hướng data (API). Content negotiation để một endpoint phục vụ nhiều định dạng theo yêu cầu client.',
  example:
    '`@GetMapping("/users/{id}") User get(...)` trong `@RestController` → client gọi với `Accept: application/json` nhận JSON. Thêm `jackson-dataformat-csv` + `produces="text/csv"` cho endpoint export.',
  viz: {
    type: 'compare',
    cols: ['@Controller', '@RestController'],
    rows: [
      ['Giá trị trả về (String)', 'tên view → ViewResolver render HTML', 'serialize thẳng vào body'],
      ['= gì', 'server-side rendering', '@Controller + @ResponseBody cấp class'],
      ['Chuyển đổi', 'template engine', 'HttpMessageConverter (Jackson)'],
      ['Content negotiation', '—', 'chọn converter theo header Accept + classpath'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "@ResponseBody và content negotiation",
      code:
        "// @Controller: trả về TÊN VIEW, ViewResolver đi tìm template\n" +
        "@Controller\n" +
        "public class PageController {\n" +
        "    @GetMapping(\"/orders\")\n" +
        "    public String list(Model model) {\n" +
        "        model.addAttribute(\"orders\", service.findAll());\n" +
        "        return \"orders/list\";            // -> templates/orders/list.html\n" +
        "    }\n" +
        "\n" +
        "    @GetMapping(\"/api/orders\")\n" +
        "    @ResponseBody                        // ghi thẳng vào response body\n" +
        "    public List<Order> api() { return service.findAll(); }\n" +
        "}\n" +
        "\n" +
        "// @RestController = @Controller + @ResponseBody cho MỌI method\n" +
        "@RestController\n" +
        "@RequestMapping(\"/api/orders\")\n" +
        "public class OrderApi {\n" +
        "\n" +
        "    @GetMapping(produces = {MediaType.APPLICATION_JSON_VALUE,\n" +
        "                            MediaType.APPLICATION_XML_VALUE})\n" +
        "    public List<Order> list() { return service.findAll(); }\n" +
        "\n" +
        "    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)\n" +
        "    public ResponseEntity<Order> create(@RequestBody CreateOrder req) {\n" +
        "        Order o = service.create(req);\n" +
        "        return ResponseEntity.created(URI.create(\"/api/orders/\" + o.getId())).body(o);\n" +
        "    }\n" +
        "}\n" +
        "// CONTENT NEGOTIATION: Spring chọn HttpMessageConverter theo thứ tự\n" +
        "//  1) đuôi mở rộng URL (mặc định TẮT từ Boot 2.6 — nguy cơ bảo mật)\n" +
        "//  2) tham số ?format=json (phải bật thủ công)\n" +
        "//  3) header Accept                       <- chuẩn, dùng cái này\n" +
        "// Không converter nào khớp -> 406 Not Acceptable.\n" +
        "// Chỉ có jackson-databind trên classpath thì mọi Accept khác JSON đều 406.",
    },
  ],
},
{
  cat: 'Spring MVC',
  id: 'java-1yda95g',
  q: '`@RequestParam`, `@PathVariable`, `@RequestBody` dùng khi nào?',
  answer:
    '- `@PathVariable`: lấy phần biến trong đường dẫn — định danh tài nguyên. `/users/{id}` → `@PathVariable Long id`.\n' +
    '- `@RequestParam`: lấy query param `?page=2&size=20` hoặc form field — lọc, phân trang, tuỳ chọn. Có `required`, `defaultValue`.\n' +
    '- `@RequestBody`: deserialize toàn bộ body (JSON) thành object — payload tạo/cập nhật.\n\n' +
    'REST quy ước: định danh trong path, tham số phụ trong query, dữ liệu phức tạp trong body. `GET`/`DELETE` không nên có body.',
  essence:
    'Path = "cái gì", query = "lọc/điều chỉnh thế nào", body = "dữ liệu đầy đủ". Chọn đúng chỗ giúp URL rõ nghĩa và cache-friendly.',
  example:
    '`GET /orders/{orderId}/items?status=SHIPPED&page=0&size=50` → `@PathVariable orderId`, `@RequestParam status/page/size`. `POST /orders` với `@RequestBody CreateOrderRequest`.',
  viz: {
    type: 'compare',
    cols: ['@PathVariable', '@RequestParam', '@RequestBody'],
    rows: [
      ['Lấy từ', 'biến trong đường dẫn /users/{id}', 'query ?page=2 hoặc form field', 'toàn bộ body (JSON)'],
      ['Ý nghĩa REST', '"cái gì" — định danh tài nguyên', '"lọc / điều chỉnh thế nào"', 'dữ liệu tạo/cập nhật đầy đủ'],
      ['Tuỳ chọn', '—', 'required, defaultValue', '—'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Lấy dữ liệu từ đâu và ràng buộc nào",
      code:
        "@RestController\n" +
        "@RequestMapping(\"/api/orders\")\n" +
        "public class OrderController {\n" +
        "\n" +
        "    // @PathVariable — ĐỊNH DANH tài nguyên, nằm trong đường dẫn\n" +
        "    @GetMapping(\"/{id}\")\n" +
        "    public Order get(@PathVariable Long id) { }\n" +
        "\n" +
        "    @GetMapping(\"/{orderId}/lines/{lineId}\")\n" +
        "    public Line line(@PathVariable Long orderId, @PathVariable Long lineId) { }\n" +
        "\n" +
        "    // @RequestParam — LỌC / PHÂN TRANG / TUỲ CHỌN, nằm sau dấu ?\n" +
        "    @GetMapping\n" +
        "    public Page<Order> search(\n" +
        "            @RequestParam(required = false) String status,       // ?status=PAID\n" +
        "            @RequestParam(defaultValue = \"0\") int page,          // có mặc định\n" +
        "            @RequestParam(defaultValue = \"20\") @Max(100) int size,\n" +
        "            @RequestParam List<String> tags,                     // ?tags=a&tags=b\n" +
        "            Pageable pageable) { }                               // Spring tự bind\n" +
        "\n" +
        "    // @RequestBody — DỮ LIỆU của thao tác ghi, nằm trong body, parse bởi Jackson\n" +
        "    @PostMapping\n" +
        "    public Order create(@Valid @RequestBody CreateOrderRequest req) { }\n" +
        "\n" +
        "    // Các nguồn khác\n" +
        "    @GetMapping(\"/me\")\n" +
        "    public Order me(@RequestHeader(\"X-Tenant\") String tenant,\n" +
        "                    @CookieValue(name = \"sid\", required = false) String sid,\n" +
        "                    @AuthenticationPrincipal UserDetails user) { }\n" +
        "\n" +
        "    // Form + upload file\n" +
        "    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)\n" +
        "    public void upload(@RequestPart(\"meta\") Meta meta,\n" +
        "                       @RequestPart(\"file\") MultipartFile file) { }\n" +
        "}\n" +
        "// LƯU Ý: @PathVariable và @RequestParam mặc định BẮT BUỘC — thiếu là 400.\n" +
        "// Muốn tuỳ chọn thì required = false hoặc dùng Optional/defaultValue.\n" +
        "// Biên dịch không có -parameters thì phải ghi rõ tên: @PathVariable(\"id\").",
    },
  ],
},
{
  cat: 'Spring MVC',
  id: 'java-pkvt1s',
  q: 'Filter, Interceptor và `@ControllerAdvice` khác nhau ở đâu?',
  answer:
    '- **Servlet Filter**: tầng thấp nhất, chạy trước cả `DispatcherServlet`, thao tác trên `ServletRequest/Response` thô. Dùng cho: logging request, CORS, nén, security (Spring Security là chuỗi filter), rewrite.\n' +
    '- **HandlerInterceptor**: trong Spring MVC, biết được handler nào sẽ chạy (`preHandle`, `postHandle`, `afterCompletion`). Dùng cho: auth theo controller, đo thời gian xử lý, set attribute cho view.\n' +
    '- **`@ControllerAdvice`**: xử lý xuyên suốt ở tầng controller — `@ExceptionHandler`, `@ModelAttribute`, `@InitBinder`.',
  essence:
    'Càng ra ngoài càng thô và tổng quát (Filter), càng vào trong càng hiểu ngữ cảnh MVC (Interceptor → Advice). Chọn tầng thấp nhất đủ dùng.',
  example:
    'Gắn `traceId` vào MDC cho mọi request kể cả tài nguyên tĩnh → Filter. Kiểm tra quyền "chỉ owner mới xem" dựa trên handler → Interceptor. Map `AccessDeniedException` → 403 body chuẩn → `@ControllerAdvice`.',
  viz: {
    type: 'layers',
    title: 'Càng ngoài càng thô, càng trong càng hiểu ngữ cảnh MVC',
    layers: [
      { name: 'Servlet Filter', tag: 'ngoài cùng', note: 'trước DispatcherServlet, request/response thô: CORS, nén, Spring Security, traceId' },
      { name: 'DispatcherServlet' },
      { name: 'HandlerInterceptor', note: 'biết handler nào sẽ chạy: auth theo controller, đo thời gian' },
      { name: '@ControllerAdvice', note: '@ExceptionHandler, @ModelAttribute, @InitBinder' },
      { name: 'Controller', tag: 'trong cùng' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba tầng chặn, ba phạm vi khác nhau",
      code:
        "// 1) FILTER — chuẩn Servlet, NGOÀI CÙNG, chạy trước DispatcherServlet.\n" +
        "// Thấy mọi request kể cả tài nguyên tĩnh và lỗi. Không biết gì về controller.\n" +
        "@Component\n" +
        "@Order(1)\n" +
        "public class TraceIdFilter extends OncePerRequestFilter {\n" +
        "    @Override\n" +
        "    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,\n" +
        "                                    FilterChain chain) throws ServletException, IOException {\n" +
        "        MDC.put(\"traceId\", UUID.randomUUID().toString());\n" +
        "        try {\n" +
        "            chain.doFilter(req, res);      // quên dòng này là request treo\n" +
        "        } finally {\n" +
        "            MDC.clear();                   // luôn dọn trong finally\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "// Việc hợp với filter: logging, CORS, nén, đọc/ghi lại body, security.\n" +
        "\n" +
        "// 2) INTERCEPTOR — của Spring MVC, chạy TRONG DispatcherServlet.\n" +
        "// Biết handler nào sắp chạy -> đọc được annotation trên method.\n" +
        "@Component\n" +
        "public class AuthInterceptor implements HandlerInterceptor {\n" +
        "    @Override\n" +
        "    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {\n" +
        "        if (handler instanceof HandlerMethod hm && hm.hasMethodAnnotation(AdminOnly.class)) {\n" +
        "            if (!isAdmin(req)) { res.setStatus(403); return false; }   // false = chặn\n" +
        "        }\n" +
        "        return true;\n" +
        "    }\n" +
        "    // postHandle: sau controller, trước render view\n" +
        "    // afterCompletion: sau khi xong hết, kể cả khi có exception\n" +
        "}\n" +
        "\n" +
        "@Configuration\n" +
        "class WebConfig implements WebMvcConfigurer {\n" +
        "    @Override\n" +
        "    public void addInterceptors(InterceptorRegistry reg) {\n" +
        "        reg.addInterceptor(new AuthInterceptor()).addPathPatterns(\"/api/**\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 3) @ControllerAdvice — trong tầng controller: xử lý exception, bind dữ liệu,\n" +
        "// thêm model chung. Không thấy được request bị chặn từ trước bởi filter.\n" +
        "@RestControllerAdvice\n" +
        "class Advice {\n" +
        "    @ExceptionHandler(Exception.class)\n" +
        "    ProblemDetail handle(Exception e) { }\n" +
        "\n" +
        "    @ModelAttribute\n" +
        "    void common(Model m) { m.addAttribute(\"version\", buildVersion); }\n" +
        "}\n" +
        "// Thứ tự: Filter -> DispatcherServlet -> Interceptor.preHandle -> Controller\n" +
        "//         -> ControllerAdvice (nếu lỗi) -> Interceptor.postHandle -> Filter",
    },
  ],
},
{
  cat: 'Spring MVC',
  id: 'java-6je1wo',
  q: 'CORS là gì? Cấu hình trong Spring như thế nào?',
  answer:
    'CORS (Cross-Origin Resource Sharing): trình duyệt chặn JS gọi API khác **origin** (scheme+host+port) trừ khi server trả header cho phép (`Access-Control-Allow-Origin`…). Với request "non-simple", trình duyệt gửi **preflight** `OPTIONS` trước.\n\n' +
    'Cấu hình Spring:\n' +
    '- `@CrossOrigin` trên controller/method (cục bộ).\n' +
    '- Toàn cục: `WebMvcConfigurer.addCorsMappings(...)`.\n' +
    '- Với Spring Security: cấu hình `CorsConfigurationSource` và `http.cors()` — nếu không, filter security chặn OPTIONS trước.',
  essence:
    'CORS là cơ chế phía **trình duyệt**, không phải bảo mật server (Postman/curl không bị ảnh hưởng). Server chỉ khai báo origin nào được phép đọc response.',
  example:
    'SPA ở `https://app.acme.com` gọi API `https://api.acme.com`: cấu hình allowedOrigins = `https://app.acme.com`, allowedMethods = GET/POST/PUT/DELETE, allowCredentials = true (và KHÔNG dùng `*` khi có credentials).',
  viz: {
    type: 'sequence',
    title: 'CORS preflight (cơ chế phía trình duyệt)',
    actors: ['Browser (app.acme.com)', 'API (api.acme.com)'],
    messages: [
      { from: 0, to: 1, label: 'OPTIONS (preflight) — request non-simple' },
      { from: 1, to: 0, label: 'Access-Control-Allow-Origin/Methods/Headers', dashed: true },
      { from: 0, to: 1, label: 'request thật (nếu được phép)' },
      { from: 1, to: 0, label: 'response — JS chỉ đọc được nếu origin khớp', dashed: true },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cấu hình đúng chỗ và bẫy credentials",
      code:
        "// CORS là cơ chế của TRÌNH DUYỆT: JS ở origin A gọi API ở origin B thì trình duyệt\n" +
        "// chặn, TRỪ KHI server trả header cho phép. Không phải bảo mật phía server —\n" +
        "// curl/Postman không bị ảnh hưởng gì.\n" +
        "\n" +
        "// Cấu hình TOÀN CỤC — nên dùng\n" +
        "@Configuration\n" +
        "public class CorsConfig implements WebMvcConfigurer {\n" +
        "    @Override\n" +
        "    public void addCorsMappings(CorsRegistry reg) {\n" +
        "        reg.addMapping(\"/api/**\")\n" +
        "           .allowedOrigins(\"https://app.example.com\")   // liệt kê rõ, KHÔNG dùng \"*\"\n" +
        "           .allowedMethods(\"GET\", \"POST\", \"PUT\", \"DELETE\")\n" +
        "           .allowedHeaders(\"*\")\n" +
        "           .exposedHeaders(\"X-Total-Count\")   // header client ĐỌC ĐƯỢC từ JS\n" +
        "           .allowCredentials(true)            // cho gửi cookie\n" +
        "           .maxAge(3600);                     // cache preflight 1 giờ\n" +
        "    }\n" +
        "}\n" +
        "// BẪY LỚN: allowCredentials(true) + allowedOrigins(\"*\") -> trình duyệt TỪ CHỐI.\n" +
        "// Cần pattern thì dùng allowedOriginPatterns(\"https://*.example.com\").\n" +
        "\n" +
        "// Theo controller\n" +
        "@CrossOrigin(origins = \"https://app.example.com\")\n" +
        "@RestController\n" +
        "class PublicApi { }\n" +
        "\n" +
        "// CÓ SPRING SECURITY thì phải bật riêng, nếu không filter security chặn\n" +
        "// request preflight OPTIONS trước khi CORS kịp chạy:\n" +
        "@Bean\n" +
        "SecurityFilterChain chain(HttpSecurity http) throws Exception {\n" +
        "    return http.cors(withDefaults())        // dòng này là bắt buộc\n" +
        "               .csrf(csrf -> csrf.disable())\n" +
        "               .build();\n" +
        "}\n" +
        "// PREFLIGHT: trình duyệt gửi OPTIONS trước khi gửi request \"không đơn giản\"\n" +
        "// (method khác GET/POST/HEAD, hoặc có header tuỳ chỉnh như Authorization).",
    },
  ],
},
{
  cat: 'Spring Security',
  id: 'java-1pbwp6n',
  q: 'Spring Security filter chain và luồng authentication hoạt động thế nào?',
  answer:
    'Spring Security là một chuỗi **servlet filter** (`SecurityFilterChain`) đứng trước app. Các filter chính: `SecurityContextPersistenceFilter`, `UsernamePasswordAuthenticationFilter` / `BearerTokenAuthenticationFilter`, `ExceptionTranslationFilter`, `AuthorizationFilter`.\n\n' +
    'Luồng: filter trích credential từ request → tạo `Authentication` (chưa xác thực) → `AuthenticationManager` → `AuthenticationProvider` (ví dụ `DaoAuthenticationProvider` dùng `UserDetailsService` + `PasswordEncoder`) → nếu ok, lưu `Authentication` đã xác thực vào `SecurityContextHolder` (ThreadLocal) → `AuthorizationFilter` kiểm tra quyền theo rule.',
  essence:
    'Xác thực (bạn là ai) xảy ra sớm trong chuỗi filter và kết quả nằm ở `SecurityContextHolder`; phân quyền (bạn được làm gì) xảy ra ngay trước khi vào controller.',
  example:
    'API JWT: `BearerTokenAuthenticationFilter` đọc `Authorization: Bearer ...`, `JwtDecoder` verify chữ ký + expiry, tạo `JwtAuthenticationToken` với authorities từ claim `scope`/`roles`, đặt vào context. Controller lấy user qua `@AuthenticationPrincipal`.',
  viz: {
    type: 'flow',
    title: 'Spring Security filter chain',
    nodes: ['filter trích credential', 'Authentication (chưa xác thực)', 'AuthenticationManager', 'AuthenticationProvider', 'SecurityContextHolder', 'AuthorizationFilter'],
    steps: [
      { to: 0, label: 'UsernamePasswordAuthenticationFilter / BearerTokenAuthenticationFilter đọc request' },
      { to: 2, label: 'tạo token chưa xác thực → giao cho AuthenticationManager' },
      { to: 3, label: 'DaoAuthenticationProvider: UserDetailsService + PasswordEncoder (hoặc JwtDecoder verify chữ ký)' },
      { to: 4, label: 'ok → lưu Authentication đã xác thực vào SecurityContextHolder (ThreadLocal)' },
      { to: 5, label: 'AuthorizationFilter kiểm tra quyền theo rule, ngay trước controller' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Luồng xác thực và cấu hình kiểu mới",
      code:
        "// Security là MỘT filter servlet (springSecurityFilterChain) chứa một CHUỖI\n" +
        "// filter bên trong. Luồng của form login:\n" +
        "//   1) UsernamePasswordAuthenticationFilter lấy user/pass -> tạo Authentication chưa xác thực\n" +
        "//   2) AuthenticationManager (ProviderManager) chọn AuthenticationProvider phù hợp\n" +
        "//   3) DaoAuthenticationProvider gọi UserDetailsService.loadUserByUsername\n" +
        "//   4) PasswordEncoder.matches(raw, encoded)\n" +
        "//   5) Thành công -> Authentication đã xác thực vào SecurityContextHolder\n" +
        "//      (mặc định lưu ở ThreadLocal, và ghi vào session qua SecurityContextRepository)\n" +
        "//   6) FilterSecurityInterceptor/AuthorizationFilter kiểm tra quyền ở cuối chuỗi\n" +
        "\n" +
        "@Configuration\n" +
        "@EnableWebSecurity\n" +
        "@EnableMethodSecurity                      // bật @PreAuthorize\n" +
        "public class SecurityConfig {\n" +
        "\n" +
        "    // Spring Security 6: WebSecurityConfigurerAdapter đã bị XOÁ -> khai bean\n" +
        "    @Bean\n" +
        "    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n" +
        "        return http\n" +
        "            .authorizeHttpRequests(auth -> auth\n" +
        "                .requestMatchers(\"/public/**\", \"/actuator/health\").permitAll()\n" +
        "                .requestMatchers(\"/admin/**\").hasRole(\"ADMIN\")\n" +
        "                .anyRequest().authenticated())          // luôn kết thúc bằng dòng này\n" +
        "            .oauth2ResourceServer(o -> o.jwt(withDefaults()))\n" +
        "            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n" +
        "            .csrf(csrf -> csrf.disable())               // chỉ vì API stateless dùng JWT\n" +
        "            .build();\n" +
        "    }\n" +
        "\n" +
        "    @Bean\n" +
        "    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }\n" +
        "}\n" +
        "// THỨ TỰ RULE QUAN TRỌNG: khớp cái đầu tiên là dừng -> rule cụ thể phải\n" +
        "// đứng TRƯỚC rule chung. Đặt anyRequest() lên đầu là mở toang mọi thứ.",
    },
  ],
},
{
  cat: 'Spring Security',
  id: 'java-1hgtwl',
  q: 'Session-based authentication và token/JWT — ưu nhược điểm?',
  answer:
    '**Session (cookie)**: server lưu session state, cookie chỉ chứa session id. Thu hồi tức thì (xoá session), nhỏ gọn, tự động theo cookie. Nhược: cần session store chia sẻ khi scale (Redis), dễ dính CSRF, không tiện cho mobile/third-party.\n\n' +
    '**JWT (stateless)**: token tự chứa claim + chữ ký, server không lưu. Scale ngang dễ, hợp SPA/mobile/microservice. Nhược: **khó thu hồi trước hạn** (cần blacklist/token ngắn hạn + refresh token), payload lớn hơn, lộ token là nguy hiểm tới khi hết hạn.',
  essence:
    'Session đẩy state về server (dễ kiểm soát, khó scale). JWT đẩy state vào token (dễ scale, khó thu hồi). Chọn theo nhu cầu logout tức thì vs kiến trúc phân tán.',
  example:
    'Web app nội bộ một domain: session + Redis, đơn giản và logout ngay. Hệ thống nhiều service + app mobile: access token JWT sống 15 phút + refresh token lưu DB (thu hồi được).',
  viz: {
    type: 'compare',
    cols: ['Session (cookie)', 'JWT (stateless)'],
    rows: [
      ['State lưu ở', 'server (cookie chỉ chứa session id)', 'trong token (claim + chữ ký)'],
      ['Scale ngang', 'cần session store chia sẻ (Redis)', 'dễ — server không lưu gì'],
      ['Thu hồi', 'tức thì (xoá session)', 'khó trước hạn → token ngắn + refresh token'],
      ['Hợp với', 'web app một domain', 'SPA / mobile / microservice'],
      ['Rủi ro', 'CSRF', 'lộ token nguy hiểm tới khi hết hạn'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai mô hình, hai kiểu đánh đổi",
      code:
        "// SESSION: server giữ trạng thái, client chỉ cầm session id trong cookie.\n" +
        "// + Thu hồi TỨC THÌ (xoá session là xong)\n" +
        "// + Cookie HttpOnly -> JS không đọc được -> chống XSS đánh cắp token\n" +
        "// - Server phải lưu state -> scale ngang cần session store dùng chung\n" +
        "http.sessionManagement(s -> s\n" +
        "        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)\n" +
        "        .sessionFixation().migrateSession()      // chống session fixation\n" +
        "        .maximumSessions(1));                    // một tài khoản một phiên\n" +
        "// spring-session-data-redis: chia sẻ session giữa nhiều instance\n" +
        "\n" +
        "// JWT: server không giữ gì, mọi thông tin nằm trong token đã ký.\n" +
        "// + Không state -> scale ngang thoải mái, hợp microservice\n" +
        "// - KHÔNG THU HỒI ĐƯỢC trước khi hết hạn (đây là nhược điểm cốt tử)\n" +
        "// - Payload ai cũng đọc được (chỉ ký, KHÔNG mã hoá) -> đừng nhét dữ liệu nhạy cảm\n" +
        "// - Token dài, gửi kèm mọi request\n" +
        "@Bean\n" +
        "JwtDecoder jwtDecoder() {\n" +
        "    return NimbusJwtDecoder.withJwkSetUri(\"https://idp.example.com/.well-known/jwks.json\")\n" +
        "            .build();\n" +
        "}\n" +
        "\n" +
        "// Mô hình thực dụng nhất hiện nay:\n" +
        "//   access token sống NGẮN (5-15 phút, JWT, không thu hồi cũng chấp nhận được)\n" +
        "//   + refresh token sống dài, LƯU Ở SERVER (thu hồi được), đặt trong cookie\n" +
        "//     HttpOnly + Secure + SameSite=Strict\n" +
        "// ĐỪNG lưu JWT trong localStorage: dính XSS là mất token.",
    },
  ],
},
{
  cat: 'Spring Security',
  id: 'java-17emnvf',
  q: 'Vì sao lưu mật khẩu phải hash bằng BCrypt/Argon2? `PasswordEncoder` là gì?',
  answer:
    'Không bao giờ lưu plaintext hay hash nhanh (MD5/SHA-256) — GPU brute-force hàng tỉ hash/giây. Cần hàm **chậm có chủ đích** và **có salt**:\n' +
    '- **BCrypt**: salt tự sinh nhúng trong output, cost factor điều chỉnh được (work factor).\n' +
    '- **Argon2 / scrypt**: thêm kháng tấn công bộ nhớ (memory-hard) — khuyến nghị mới.\n\n' +
    '`PasswordEncoder` interface: `encode(raw)`, `matches(raw, encoded)`. `DelegatingPasswordEncoder` (mặc định) lưu prefix `{bcrypt}` để **nâng thuật toán dần** mà vẫn verify hash cũ.',
  essence:
    'Salt chống rainbow table & hash trùng; work factor cao khiến brute-force không khả thi về chi phí. `PasswordEncoder` trừu tượng hoá để đổi/nâng cấp thuật toán không phá dữ liệu cũ.',
  example:
    '`new BCryptPasswordEncoder(12)`. Khi user đăng nhập thành công với hash `{bcrypt}` cũ cost 10, có thể re-encode sang cost 12 hoặc Argon2 và lưu lại — nâng cấp âm thầm theo thời gian.',
  viz: {
    type: 'compare',
    cols: ['MD5 / SHA-256 (hash nhanh)', 'BCrypt / Argon2 (chậm có chủ đích)'],
    rows: [
      ['Tốc độ', 'GPU brute-force hàng tỉ hash/giây', 'work/cost factor điều chỉnh được'],
      ['Salt', 'không (rainbow table, hash trùng)', 'tự sinh, nhúng trong output'],
      ['Kháng bộ nhớ', 'không', 'Argon2 / scrypt memory-hard'],
      ['Nâng cấp thuật toán', '—', 'DelegatingPasswordEncoder: prefix {bcrypt} verify hash cũ, re-encode dần'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Vì sao SHA-256 sai và PasswordEncoder giải quyết gì",
      code:
        "// SAI: SHA-256/MD5 được thiết kế để NHANH. GPU thử được hàng tỉ hash mỗi giây\n" +
        "// -> dò toàn bộ mật khẩu phổ biến trong vài phút. Không salt thì rainbow table\n" +
        "// còn phá được ngay lập tức.\n" +
        "String bad = DigestUtils.sha256Hex(password);      // ĐỪNG\n" +
        "\n" +
        "// ĐÚNG: hàm hash mật khẩu được thiết kế CHẬM CÓ CHỦ Ý, có salt sẵn bên trong\n" +
        "@Bean\n" +
        "public PasswordEncoder passwordEncoder() {\n" +
        "    return new BCryptPasswordEncoder(12);   // cost 12 = 2^12 vòng lặp\n" +
        "}                                           // tăng 1 -> chậm gấp đôi cho CẢ hacker\n" +
        "\n" +
        "String hash = encoder.encode(\"matkhau123\");\n" +
        "// $2a$12$N9qo8uLOickgx2ZMRZoMye...  = thuật toán $ cost $ salt+hash\n" +
        "// Cùng một mật khẩu, mỗi lần encode ra chuỗi KHÁC nhau (salt ngẫu nhiên)\n" +
        "// -> vì vậy KHÔNG BAO GIỜ so sánh bằng equals:\n" +
        "encoder.matches(\"matkhau123\", hash);        // true — phải dùng matches()\n" +
        "\n" +
        "// Argon2 (thắng Password Hashing Competition) — lựa chọn tốt nhất hiện nay,\n" +
        "// chống cả tấn công bằng GPU/ASIC vì tốn NHIỀU BỘ NHỚ:\n" +
        "@Bean\n" +
        "PasswordEncoder argon2() {\n" +
        "    return new Argon2PasswordEncoder(16, 32, 1, 1 << 14, 3);  // salt, hash, song song, 16MB, 3 vòng\n" +
        "}\n" +
        "\n" +
        "// DelegatingPasswordEncoder (mặc định của Spring Security): prefix {bcrypt},\n" +
        "// {argon2} trong chuỗi hash -> nâng cấp thuật toán dần mà không bắt user đổi mật khẩu.\n" +
        "PasswordEncoder delegating = PasswordEncoderFactories.createDelegatingPasswordEncoder();",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-1pb9r53',
  q: 'Keyset pagination và offset pagination — khác nhau và khi nào dùng?',
  answer:
    '**Offset** (`LIMIT 20 OFFSET 10000`): DB vẫn phải duyệt và bỏ qua 10.000 dòng → càng về trang sau càng chậm; thêm/xoá dữ liệu giữa các lần gọi gây trùng/nhảy dòng.\n\n' +
    '**Keyset (seek)**: `WHERE (created_at, id) < (:lastCreatedAt, :lastId) ORDER BY created_at DESC, id DESC LIMIT 20`. Dùng giá trị của dòng cuối trang trước làm mốc → luôn nhanh (dùng index), ổn định khi dữ liệu thay đổi. Đổi lại: không nhảy tới trang bất kỳ, chỉ "trang kế tiếp".',
  essence:
    'Offset đơn giản nhưng chi phí tăng tuyến tính theo số trang. Keyset biến phân trang thành truy vấn range trên index — phù hợp feed/infinite scroll/export lớn.',
  example:
    'Xuất 2 triệu bản ghi qua API: offset trang 50.000 mất vài giây/lần. Keyset theo `(id)` giữ mỗi lần ~vài ms. Spring Data hỗ trợ `Slice` + `ScrollPosition` (Boot 3.1+) cho keyset.',
  viz: {
    type: 'compare',
    cols: ['Offset (LIMIT n OFFSET m)', 'Keyset / seek'],
    rows: [
      ['Chi phí theo trang', 'DB duyệt & bỏ qua m dòng → tăng tuyến tính', 'luôn nhanh (range trên index)'],
      ['Khi dữ liệu thay đổi', 'trùng / nhảy dòng', 'ổn định'],
      ['Nhảy tới trang bất kỳ', 'được', 'chỉ "trang kế tiếp"'],
      ['Hợp với', 'trang admin ít dữ liệu', 'feed, infinite scroll, export lớn'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Vì sao OFFSET chậm dần và keyset thì không",
      code:
        "-- OFFSET: DB phải ĐỌC RỒI VỨT BỎ toàn bộ số dòng bị bỏ qua\n" +
        "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 100000;\n" +
        "-- -> quét 100.020 dòng để trả về 20. Trang càng sâu càng chậm tuyến tính.\n" +
        "-- Lỗi thứ hai, ít người để ý: nếu có bản ghi mới chèn vào giữa lúc phân trang,\n" +
        "-- dòng ở ranh giới bị LẶP hoặc BỊ NHẢY QUA.\n" +
        "\n" +
        "-- KEYSET (seek): nhớ vị trí cuối của trang trước, dùng index nhảy thẳng tới đó\n" +
        "SELECT * FROM orders\n" +
        "WHERE (created_at, id) < (\u00272026-09-01 10:00:00\u0027, 12345)   -- con trỏ trang trước\n" +
        "ORDER BY created_at DESC, id DESC\n" +
        "LIMIT 20;\n" +
        "-- -> luôn chỉ đọc 20 dòng, trang thứ 1 hay thứ 100.000 đều nhanh như nhau.\n" +
        "-- Cần index khớp đúng thứ tự sắp xếp:\n" +
        "CREATE INDEX idx_orders_created_id ON orders (created_at DESC, id DESC);\n" +
        "-- Phải thêm cột UNIQUE (id) vào khoá sắp xếp để không nhập nhằng khi trùng created_at.",
    },
    {
      lang: "java",
      title: "Cài đặt trong Spring Data",
      code:
        "// OFFSET — tiện, dùng cho trang admin có ít dữ liệu hoặc cần tổng số trang\n" +
        "Page<Order> page = repo.findAll(PageRequest.of(pageNo, 20, Sort.by(\"createdAt\").descending()));\n" +
        "page.getTotalElements();   // COUNT(*) thêm một câu query NỮA — rất đắt trên bảng lớn\n" +
        "// -> Không cần tổng số thì trả Slice, Spring Data sẽ bỏ câu count đi\n" +
        "Slice<Order> slice = repo.findByStatus(\"PAID\", PageRequest.of(0, 20));\n" +
        "\n" +
        "// KEYSET — cho API công khai, infinite scroll, hoặc bảng hàng chục triệu dòng\n" +
        "public interface OrderRepository extends JpaRepository<Order, Long> {\n" +
        "    @Query(\"\"\"\n" +
        "           SELECT o FROM Order o\n" +
        "           WHERE o.createdAt < :cursorTime\n" +
        "              OR (o.createdAt = :cursorTime AND o.id < :cursorId)\n" +
        "           ORDER BY o.createdAt DESC, o.id DESC\n" +
        "           \"\"\")\n" +
        "    List<Order> nextPage(@Param(\"cursorTime\") Instant t, @Param(\"cursorId\") Long id,\n" +
        "                         Pageable limit);\n" +
        "}\n" +
        "// Trả cursor (mã hoá base64) cho client thay vì số trang.\n" +
        "// ĐÁNH ĐỔI: không nhảy tới \"trang 57\" được, không hiện tổng số trang.",
    },
  ],
},
{
  cat: 'Spring Data / JPA',
  id: 'java-1ldhyvq',
  q: '`@Modifying @Query` cần lưu ý gì (flush, clear, transaction)?',
  answer:
    'Với UPDATE/DELETE bằng JPQL/native, method repository phải gắn `@Modifying` và chạy trong `@Transactional`.\n\n' +
    'Vấn đề: câu lệnh chạy **thẳng xuống DB, bỏ qua persistence context**. Entity đã load trước đó trong context vẫn giữ giá trị cũ (stale). \n\n' +
    '`@Modifying(flushAutomatically = true, clearAutomatically = true)`: flush thay đổi đang chờ trước khi chạy, và clear context sau đó để lần đọc kế tiếp lấy dữ liệu mới.',
  essence:
    'Bulk update là thao tác "vòng qua" Hibernate. Nếu trong cùng transaction bạn còn dùng lại entity liên quan, phải clear context để tránh đọc bản cũ.',
  example:
    '`@Modifying @Query("update Token t set t.revoked = true where t.userId = :uid")` để logout mọi phiên. Nếu sau đó cùng transaction lại `findByUserId` và kiểm tra `revoked`, cần `clearAutomatically = true` mới thấy `true`.',
  viz: {
    type: 'flow',
    title: '@Modifying @Query = thao tác "vòng qua" Hibernate',
    nodes: ['@Modifying + @Transactional', 'chạy thẳng xuống DB', 'bỏ qua persistence context', 'entity đã load bị stale', 'clearAutomatically = true'],
    steps: [
      { to: 0, label: 'UPDATE/DELETE bằng JPQL/native cần @Modifying, trong @Transactional' },
      { to: 2, label: 'câu lệnh không đi qua persistence context' },
      { to: 3, label: 'entity load trước đó trong context vẫn giữ giá trị cũ' },
      { to: 4, label: 'flushAutomatically trước, clearAutomatically sau → lần đọc kế tiếp lấy dữ liệu mới' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba tham số bắt buộc nhớ và vì sao",
      code:
        "public interface OrderRepository extends JpaRepository<Order, Long> {\n" +
        "\n" +
        "    // Thiếu @Modifying -> Hibernate coi đây là SELECT và ném lỗi ngay\n" +
        "    @Modifying(\n" +
        "        flushAutomatically = true,   // FLUSH thay đổi đang treo XUỐNG DB TRƯỚC khi chạy,\n" +
        "                                     // nếu không UPDATE này chạy trên dữ liệu cũ\n" +
        "        clearAutomatically = true    // XOÁ persistence context SAU khi chạy, vì entity\n" +
        "    )                                // đang cache trong bộ nhớ giờ đã LỖI THỜI\n" +
        "    @Transactional                   // bắt buộc — không có thì TransactionRequiredException\n" +
        "    @Query(\"UPDATE Order o SET o.status = :status WHERE o.createdAt < :before\")\n" +
        "    int expireOld(@Param(\"status\") String status, @Param(\"before\") Instant before);\n" +
        "    // trả về SỐ DÒNG bị ảnh hưởng\n" +
        "}\n" +
        "\n" +
        "// VÌ SAO nguy hiểm: bulk update/delete đi THẲNG xuống DB, KHÔNG qua\n" +
        "// persistence context. Hệ quả:\n" +
        "//  - entity đang managed trong bộ nhớ vẫn giữ giá trị CŨ -> đọc ra là sai\n" +
        "//  - KHÔNG kích hoạt @PreUpdate/@PostUpdate, không tăng @Version\n" +
        "//  - KHÔNG cascade sang quan hệ con -> có thể vi phạm khoá ngoại\n" +
        "@Transactional\n" +
        "public void demo() {\n" +
        "    Order o = repo.findById(1L).orElseThrow();     // status = \"NEW\", đang managed\n" +
        "    repo.expireOld(\"EXPIRED\", Instant.now());      // DB đã thành \"EXPIRED\"\n" +
        "    System.out.println(o.getStatus());             // vẫn in \"NEW\" nếu không clear!\n" +
        "}\n" +
        "\n" +
        "// Đổi lại: cập nhật 1 triệu dòng bằng một câu UPDATE nhanh hơn hàng nghìn lần\n" +
        "// so với load từng entity rồi sửa. Dùng đúng chỗ: job dọn dẹp, migrate dữ liệu.",
    },
  ],
},
{
  cat: 'Spring Security',
  id: 'java-fgkgoq',
  q: '`@PreAuthorize` là gì? Khi nào cần bật CSRF protection?',
  answer:
    '**Method security** (`@EnableMethodSecurity`): `@PreAuthorize("hasRole(\'ADMIN\')")`, `@PreAuthorize("#id == authentication.principal.id")` — kiểm tra quyền ngay tại method service/controller bằng SpEL, gần logic nghiệp vụ. `@PostAuthorize`, `@PreFilter`/`@PostFilter` lọc collection.\n\n' +
    '**CSRF**: chỉ nguy hiểm khi trình duyệt **tự động gửi credential** (cookie session) → cần cho app dùng cookie + form. API **stateless dùng Bearer token** thì không cần (token không tự gửi kèm), thường `http.csrf(csrf -> csrf.disable())`.',
  essence:
    'Method security bổ sung lớp phân quyền chi tiết theo dữ liệu, không chỉ theo URL. CSRF protection cần khi và chỉ khi cơ chế auth của bạn dựa trên cái trình duyệt tự đính kèm (cookie).',
  example:
    '`@PreAuthorize("hasAuthority(\'ORDER_READ\') and @orderGuard.isOwner(#orderId, authentication)")` — vừa cần quyền, vừa phải là chủ đơn. App REST + JWT: tắt CSRF; app Thymeleaf + form login: giữ CSRF (Spring tự chèn token vào form).',
  viz: {
    type: 'compare',
    cols: ['Auth bằng cookie / session (form login)', 'Auth bằng Bearer token (JWT, stateless)'],
    rows: [
      ['CSRF protection', 'CẦN — trình duyệt tự gửi cookie', 'không cần — token không tự đính kèm'],
      ['Cấu hình', 'giữ mặc định (Spring chèn token vào form)', 'http.csrf(csrf -> csrf.disable())'],
      ['@PreAuthorize', 'hoạt động như nhau (SpEL, gần logic nghiệp vụ)', 'hoạt động như nhau'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Phân quyền ở mức method và khi nào cần CSRF",
      code:
        "@Configuration\n" +
        "@EnableMethodSecurity          // bắt buộc, mặc định TẮT\n" +
        "public class MethodSecurityConfig { }\n" +
        "\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "\n" +
        "    @PreAuthorize(\"hasRole(\u0027ADMIN\u0027)\")                     // kiểm tra TRƯỚC khi chạy\n" +
        "    public void deleteAll() { }\n" +
        "\n" +
        "    @PreAuthorize(\"hasAnyAuthority(\u0027SCOPE_orders:write\u0027, \u0027ROLE_ADMIN\u0027)\")\n" +
        "    public Order create(CreateOrder req) { }\n" +
        "\n" +
        "    // Truy cập tham số của method bằng #tên\n" +
        "    @PreAuthorize(\"#userId == authentication.principal.id or hasRole(\u0027ADMIN\u0027)\")\n" +
        "    public User profile(Long userId) { }\n" +
        "\n" +
        "    // Kiểm tra SAU khi chạy, dựa trên kết quả trả về\n" +
        "    @PostAuthorize(\"returnObject.ownerId == authentication.principal.id\")\n" +
        "    public Order get(Long id) { }\n" +
        "\n" +
        "    // Lọc phần tử trong collection\n" +
        "    @PostFilter(\"filterObject.ownerId == authentication.principal.id\")\n" +
        "    public List<Order> listAll() { }\n" +
        "\n" +
        "    // Logic phức tạp -> viết thành bean rồi gọi trong biểu thức\n" +
        "    @PreAuthorize(\"@orderPermission.canEdit(#id, authentication)\")\n" +
        "    public void edit(Long id) { }\n" +
        "}\n" +
        "// Lưu ý: hasRole(\u0027ADMIN\u0027) tự thêm tiền tố ROLE_ -> quyền thật là \"ROLE_ADMIN\".\n" +
        "// hasAuthority(\u0027ADMIN\u0027) thì KHÔNG thêm gì. Nhầm hai cái này là lỗi rất hay gặp.\n" +
        "// @PreAuthorize dựa trên proxy -> self-invocation cũng vô hiệu hoá nó.",
    },
    {
      lang: "java",
      title: "CSRF: khi nào cần bật, khi nào tắt được",
      code:
        "// CSRF: trang web độc hại khiến TRÌNH DUYỆT của nạn nhân gửi request kèm\n" +
        "// cookie phiên tới site của bạn. Trình duyệt tự đính cookie -> server tưởng hợp lệ.\n" +
        "\n" +
        "// CẦN CSRF khi xác thực bằng COOKIE/SESSION (app web truyền thống, form)\n" +
        "@Bean\n" +
        "SecurityFilterChain webChain(HttpSecurity http) throws Exception {\n" +
        "    return http.csrf(csrf -> csrf\n" +
        "            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()) // cho SPA đọc\n" +
        "            .ignoringRequestMatchers(\"/webhook/**\"))    // webhook bên ngoài không có token\n" +
        "        .build();\n" +
        "}\n" +
        "\n" +
        "// TẮT ĐƯỢC khi API hoàn toàn STATELESS, xác thực bằng header Authorization:\n" +
        "// trình duyệt KHÔNG tự thêm header đó -> không có bề mặt tấn công CSRF.\n" +
        "@Bean\n" +
        "SecurityFilterChain apiChain(HttpSecurity http) throws Exception {\n" +
        "    return http.csrf(csrf -> csrf.disable())\n" +
        "        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n" +
        "        .build();\n" +
        "}\n" +
        "// CẢNH BÁO: lưu JWT trong cookie thì CSRF QUAY LẠI -> phải bật lại,\n" +
        "// hoặc dùng SameSite=Strict. \"Dùng JWT nên tắt CSRF\" chỉ đúng khi token\n" +
        "// nằm trong header, không nằm trong cookie.",
    },
  ],
},
]);
