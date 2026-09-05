SS.addQuestions('design-patterns', [
{
  cat: 'Enterprise',
  id: 'design-patterns-1j3t7dx',
  q: 'Repository pattern — vấn đề và cách hiện thực?',
  answer:
    'Repository là một **abstraction giống collection** cho việc truy cập aggregate/entity, che giấu chi tiết lưu trữ (SQL, ORM, NoSQL, HTTP).\n\n' +
    '```\ninterface OrderRepository {\n  Optional<Order> findById(OrderId id);\n  void save(Order order);\n  List<Order> findByCustomer(CustomerId id);\n}\n```\n\n' +
    'Domain/service code làm việc với interface này; implementation (`JpaOrderRepository`, `InMemoryOrderRepository` cho test) nằm ở tầng infra.\n\n' +
    'Repository trả về **domain object đầy đủ hành vi** (không phải row/DTO), thường ở mức **aggregate root**.',
  essence:
    'Repository = "bộ sưu tập object domain, không cần biết chúng nằm ở đâu". Nó tách domain khỏi persistence (DIP), cho phép test không DB, và tập trung query logic thay vì rải SQL khắp service.',
  example:
    '`OrderService` phụ thuộc `OrderRepository` (interface). Prod: `JpaOrderRepository`. Test: `InMemoryOrderRepository` với một `Map`. Đổi từ Postgres sang DynamoDB → viết `DynamoOrderRepository`, domain và service không đổi một dòng.',
  viz: {
    type: 'flow',
    title: '"Bộ sưu tập object domain, không cần biết chúng nằm ở đâu"',
    nodes: ['Domain / service code', 'OrderRepository (interface)', 'JpaOrderRepository / InMemoryOrderRepository (infra)', 'Trả domain object đầy đủ hành vi (aggregate root)'],
    steps: [
      { to: 1, label: 'Interface giống collection: findById, save, findByCustomer' },
      { to: 2, label: 'Prod: JPA; Test: Map — không cần DB' },
      { to: 3, label: 'Không phải row/DTO. Tập trung query logic thay vì rải SQL khắp service' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bộ sưu tập object trong bộ nhớ, che giấu việc lưu trữ",
      code:
        "// Ý TƯỞNG: repository giả vờ như một COLLECTION trong bộ nhớ chứa các\n" +
        "// aggregate. Domain không biết dữ liệu nằm ở Postgres, MongoDB hay file.\n" +
        "\n" +
        "// INTERFACE nằm ở TẦNG DOMAIN — đây là điểm quan trọng nhất (DIP)\n" +
        "package com.example.domain.order;\n" +
        "public interface OrderRepository {\n" +
        "    Optional<Order> findById(OrderId id);\n" +
        "    List<Order> findPendingOlderThan(Duration age);   // ngôn ngữ NGHIỆP VỤ\n" +
        "    void save(Order order);\n" +
        "    void delete(OrderId id);\n" +
        "}\n" +
        "\n" +
        "// CÀI ĐẶT nằm ở TẦNG HẠ TẦNG\n" +
        "package com.example.infrastructure.persistence;\n" +
        "@Repository\n" +
        "public class JpaOrderRepository implements OrderRepository {\n" +
        "    private final OrderJpaRepository jpa;             // Spring Data\n" +
        "    private final OrderMapper mapper;\n" +
        "\n" +
        "    @Override\n" +
        "    public Optional<Order> findById(OrderId id) {\n" +
        "        return jpa.findById(id.value()).map(mapper::toDomain);   // entity -> domain\n" +
        "    }\n" +
        "    @Override\n" +
        "    public void save(Order order) {\n" +
        "        jpa.save(mapper.toEntity(order));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// BA NGUYÊN TẮC:\n" +
        "// 1) Method dùng NGÔN NGỮ NGHIỆP VỤ, không phải ngôn ngữ truy vấn:\n" +
        "//    findPendingOlderThan(...) chứ không phải findByStatusAndCreatedAtBefore(...)\n" +
        "// 2) Repository làm việc với AGGREGATE ROOT, không phải với từng bảng.\n" +
        "//    Không có OrderLineRepository — order line được lưu qua Order.\n" +
        "// 3) KHÔNG để chi tiết hạ tầng rò rỉ ra interface: không trả về Page của\n" +
        "//    Spring, không nhận Specification, không ném exception của JPA.\n" +
        "\n" +
        "// LỢI ÍCH: domain test được bằng InMemoryOrderRepository; đổi công nghệ\n" +
        "// lưu trữ không đụng vào nghiệp vụ.\n" +
        "// TRANH LUẬN: Spring Data JPA đã là một repository — thêm một tầng nữa có\n" +
        "// đáng không? Đáng khi domain phức tạp và cần độc lập; không đáng với CRUD.",
    },
  ],
},
{
  cat: 'Enterprise',
  id: 'design-patterns-h3xijz',
  q: 'Repository vs DAO — khác nhau thế nào?',
  answer:
    '- **DAO (Data Access Object)**: gần với **bảng/nguồn dữ liệu**. Method theo thao tác dữ liệu: `insert`, `update`, `delete`, `selectById`, `selectAll`. Thường trả về row/record/DTO. Tư duy data-centric.\n' +
    '- **Repository**: gần với **domain**. Method theo ngôn ngữ nghiệp vụ: `findActiveSubscriptions`, `save(order)`. Trả về **aggregate** đầy đủ hành vi. Che giấu cả việc "có thể là nhiều bảng". Tư duy domain-centric.\n\n' +
    'Repository thường **dùng** DAO/ORM bên dưới. Một aggregate có thể map sang nhiều bảng — repository lo việc ghép; DAO thì một-DAO-một-bảng.',
  essence:
    'DAO nói ngôn ngữ của database ("row của bảng orders"). Repository nói ngôn ngữ của domain ("đơn hàng của khách hàng X"). Repository là DAO + ngữ nghĩa domain + biên giới aggregate.',
  example:
    'DAO: `orderDao.selectById(5)` → `OrderRow`; `orderItemDao.selectByOrderId(5)` → `List<OrderItemRow>`; service tự ghép. Repository: `orderRepository.findById(new OrderId(5))` → `Order` đầy đủ (gồm items, đã dựng thành aggregate) với method `order.cancel()`.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['DAO', 'Repository'],
    rows: [
      ['Gần với', 'bảng / nguồn dữ liệu', 'domain'],
      ['Method', 'insert, update, selectById, selectAll', 'findActiveSubscriptions, save(order) — ngôn ngữ nghiệp vụ'],
      ['Trả về', 'row / record / DTO', 'aggregate đầy đủ hành vi'],
      ['Nhiều bảng cho một khái niệm', 'một DAO một bảng', 'repository lo việc ghép'],
      ['Tư duy', 'data-centric', 'domain-centric (= DAO + ngữ nghĩa domain + biên aggregate)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai mức trừu tượng khác nhau",
      code:
        "// DAO — gần với DỮ LIỆU. Một DAO thường tương ứng MỘT BẢNG, và method\n" +
        "// phản ánh thao tác trên bảng đó.\n" +
        "public interface OrderDao {\n" +
        "    OrderEntity selectById(long id);\n" +
        "    List<OrderEntity> selectByStatus(String status);\n" +
        "    int insert(OrderEntity e);\n" +
        "    int update(OrderEntity e);\n" +
        "    int deleteById(long id);\n" +
        "}\n" +
        "public interface OrderLineDao {                 // bảng riêng -> DAO riêng\n" +
        "    List<OrderLineEntity> selectByOrderId(long orderId);\n" +
        "}\n" +
        "// - trả về ENTITY (phản ánh cấu trúc bảng)\n" +
        "// - ngôn ngữ: select/insert/update/delete\n" +
        "// - client tự ghép các DAO lại\n" +
        "\n" +
        "// REPOSITORY — gần với DOMAIN. Một repository cho MỘT AGGREGATE, và\n" +
        "// aggregate có thể trải trên nhiều bảng.\n" +
        "public interface OrderRepository {\n" +
        "    Optional<Order> findById(OrderId id);       // trả về AGGREGATE đầy đủ\n" +
        "    List<Order> findOverdueForCustomer(CustomerId id);\n" +
        "    void save(Order order);                      // lưu cả order VÀ order lines\n" +
        "}\n" +
        "// - trả về DOMAIN OBJECT (có hành vi, có bất biến)\n" +
        "// - ngôn ngữ NGHIỆP VỤ\n" +
        "// - repository lo việc ghép/tách các bảng bên trong\n" +
        "\n" +
        "// KHÁC BIỆT CỐT LÕI:\n" +
        "//  DAO        — trừu tượng hoá CƠ CHẾ truy cập dữ liệu\n" +
        "//  REPOSITORY — trừu tượng hoá VIỆC LƯU TRỮ đối với domain\n" +
        "// Repository thường DÙNG DAO bên trong:\n" +
        "public class JpaOrderRepository implements OrderRepository {\n" +
        "    private final OrderDao orderDao;\n" +
        "    private final OrderLineDao lineDao;\n" +
        "    public Optional<Order> findById(OrderId id) {\n" +
        "        var e = orderDao.selectById(id.value());\n" +
        "        var lines = lineDao.selectByOrderId(id.value());\n" +
        "        return Optional.of(mapper.toDomain(e, lines));      // GHÉP thành aggregate\n" +
        "    }\n" +
        "}\n" +
        "// THỰC TẾ: nhiều dự án dùng lẫn lộn hai từ. Điều quan trọng không phải\n" +
        "// tên gọi mà là: interface có nói ngôn ngữ nghiệp vụ không, và nó có\n" +
        "// che giấu được hạ tầng không.",
    },
  ],
},
{
  cat: 'Enterprise',
  id: 'design-patterns-1u9qn6o',
  q: 'Unit of Work pattern là gì?',
  answer:
    'Theo dõi mọi object bị **thay đổi** trong một transaction nghiệp vụ (new/dirty/removed), rồi **flush** tất cả xuống DB trong **một transaction** khi commit — thay vì mỗi thay đổi ghi ngay.\n\n' +
    'Lợi ích: một transaction DB duy nhất; giảm số lần gọi DB (batch); giải quyết thứ tự ghi (insert parent trước child); tránh ghi trùng.\n\n' +
    'JPA/Hibernate **Persistence Context** chính là Unit of Work: bạn `find`/`persist`/sửa entity, Hibernate theo dõi (dirty checking), flush khi commit.',
  essence:
    'Unit of Work = "gom mọi thay đổi của một use case, ghi một lần". Bạn (hoặc ORM) không ghi từng thay đổi ngay mà tích luỹ và commit nguyên tử. EntityManager/DbContext là hiện thân của pattern này.',
  example:
    '`@Transactional void processOrder() { Order o = repo.findById(id); o.markPaid(); Customer c = custRepo.findById(o.customerId()); c.addLoyaltyPoints(10); }` — không có `save()` nào. Hibernate (UoW) theo dõi `o` và `c` dirty, khi method kết thúc → một transaction, hai UPDATE, đúng thứ tự.',
  viz: {
    type: 'flow',
    title: '"Gom mọi thay đổi của một use case, ghi một lần"',
    nodes: ['Use case bắt đầu', 'Theo dõi object: new / dirty / removed', 'Commit', 'Flush tất cả trong MỘT transaction'],
    steps: [
      { to: 1, label: 'Không ghi ngay từng thay đổi — tích luỹ (Hibernate dirty checking)' },
      { to: 3, label: 'Batch, đúng thứ tự (parent trước child), tránh ghi trùng' },
      { to: 3, label: 'JPA Persistence Context / EntityManager / DbContext = hiện thân của pattern này' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Gom mọi thay đổi rồi ghi một lần, trong một transaction",
      code:
        "// Ý TƯỞNG: theo dõi mọi object bị thay đổi trong một nghiệp vụ, rồi ghi\n" +
        "// TẤT CẢ xuống database trong MỘT transaction khi kết thúc.\n" +
        "\n" +
        "// TRONG JAVA, JPA/Hibernate ĐÃ CÀI SẴN pattern này: persistence context\n" +
        "// chính là unit of work.\n" +
        "@Transactional                        // ranh giới của unit of work\n" +
        "public void processOrder(OrderId id) {\n" +
        "    Order order = orderRepo.findById(id).orElseThrow();   // trở thành MANAGED\n" +
        "    order.confirm();                                       // KHÔNG gọi save()\n" +
        "    Customer c = customerRepo.findById(order.customerId()).orElseThrow();\n" +
        "    c.addLoyaltyPoints(order.total());                     // KHÔNG gọi save()\n" +
        "    // Khi transaction commit, Hibernate:\n" +
        "    //  1) DIRTY CHECKING: so sánh snapshot lúc load với giá trị hiện tại\n" +
        "    //  2) sinh UPDATE cho những gì THỰC SỰ đổi\n" +
        "    //  3) sắp xếp thứ tự câu lệnh để tôn trọng khoá ngoại\n" +
        "    //  4) gom thành batch nếu được cấu hình\n" +
        "}\n" +
        "\n" +
        "// TỰ CÀI ĐẶT (khi không dùng ORM):\n" +
        "public class UnitOfWork {\n" +
        "    private final List<Object> newObjects = new ArrayList<>();\n" +
        "    private final List<Object> dirtyObjects = new ArrayList<>();\n" +
        "    private final List<Object> removedObjects = new ArrayList<>();\n" +
        "\n" +
        "    public void registerNew(Object o)     { newObjects.add(o); }\n" +
        "    public void registerDirty(Object o)   { dirtyObjects.add(o); }\n" +
        "    public void registerRemoved(Object o) { removedObjects.add(o); }\n" +
        "\n" +
        "    public void commit() {\n" +
        "        try (var tx = beginTransaction()) {\n" +
        "            newObjects.forEach(this::insert);\n" +
        "            dirtyObjects.forEach(this::update);\n" +
        "            removedObjects.forEach(this::delete);       // MỘT transaction\n" +
        "            tx.commit();\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: một transaction thay vì nhiều; giảm số lần round-trip tới DB;\n" +
        "// và đảm bảo tính nguyên tử cho cả nghiệp vụ.\n" +
        "// LƯU Ý: đừng để unit of work quá LỚN (xử lý hàng chục nghìn object trong\n" +
        "// một transaction) -> tốn bộ nhớ, giữ khoá lâu. Chia lô khi cần.",
    },
  ],
},
{
  cat: 'Enterprise',
  id: 'design-patterns-1hovo92',
  q: 'DTO pattern — khi nào và vì sao?',
  answer:
    'DTO (Data Transfer Object): object **phẳng, không hành vi**, chỉ để **truyền dữ liệu qua một ranh giới** (API response/request, giữa các tầng, giữa service, giao diện remote).\n\n' +
    'Vì sao (không trả entity trực tiếp):\n' +
    '- **Tách API contract khỏi domain model** — refactor domain không phá client.\n' +
    '- Không lộ field nội bộ/nhạy cảm.\n' +
    '- Tránh lazy-loading exception, vòng lặp serialize (quan hệ hai chiều).\n' +
    '- Mỗi endpoint trả **đúng shape** nó cần (aggregate từ nhiều nguồn).\n' +
    '- Giảm dữ liệu truyền (một call thay vì N).\n\n' +
    'Map entity↔DTO thủ công hoặc MapStruct.',
  essence:
    'DTO là "hình dạng dữ liệu tại ranh giới" — độc lập với "hình dạng để xử lý nghiệp vụ" (domain) và "hình dạng để lưu trữ" (entity/row). Ba lớp này tiến hoá với nhịp khác nhau; trộn chúng khiến mọi thay đổi lan rộng.',
  example:
    '`Order` entity (JPA, quan hệ với `Customer`, `Payment`, audit fields). API GET `/orders/5` trả `OrderResponse{ id, status, total, itemCount, customerName }`. Thêm audit column vào entity → API không đổi. Client không thấy `Payment` details.',
  viz: {
    type: 'tree',
    title: 'Ba lớp (DTO / domain / entity) tiến hoá với nhịp khác nhau',
    root: {
      label: 'DTO = hình dạng dữ liệu tại ranh giới (phẳng, không hành vi)',
      children: [
        { label: 'Tách API contract khỏi domain model', note: 'refactor domain không phá client' },
        { label: 'Không lộ field nội bộ/nhạy cảm', note: '' },
        { label: 'Tránh lazy-loading exception, vòng lặp serialize', note: 'quan hệ hai chiều' },
        { label: 'Mỗi endpoint trả đúng shape nó cần', note: 'aggregate từ nhiều nguồn; giảm dữ liệu truyền' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Object chỉ để chở dữ liệu qua ranh giới",
      code:
        "public record OrderResponse(\n" +
        "    String id,\n" +
        "    String status,\n" +
        "    BigDecimal total,\n" +
        "    String customerName,\n" +
        "    List<OrderLineResponse> lines\n" +
        ") {\n" +
        "    public static OrderResponse from(Order order) {\n" +
        "        return new OrderResponse(\n" +
        "            order.id().value(),\n" +
        "            order.status().name(),\n" +
        "            order.total().amount(),\n" +
        "            order.customer().name(),\n" +
        "            order.lines().stream().map(OrderLineResponse::from).toList());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// BỐN LÝ DO DÙNG DTO:\n" +
        "// 1) TIẾN HOÁ ĐỘC LẬP — đổi cấu trúc domain (tách class, đổi tên field)\n" +
        "//    mà KHÔNG phá vỡ client. Đây là lý do quan trọng nhất.\n" +
        "// 2) BẢO MẬT — domain có field nội bộ (giá vốn, ghi chú nội bộ, cờ kỹ thuật)\n" +
        "//    không được lộ ra ngoài. Trả entity trực tiếp là rò rỉ dữ liệu.\n" +
        "// 3) TUẦN TỰ HOÁ — domain có value object và kiểu phức tạp mà JSON không\n" +
        "//    diễn đạt tự nhiên; entity JPA có lazy proxy gây lỗi khi serialize.\n" +
        "// 4) MỖI CLIENT một hình dạng: mobile cần 5 field, web cần 40.\n" +
        "\n" +
        "// KHI NÀO KHÔNG CẦN:\n" +
        "//  - ứng dụng CRUD nhỏ, domain gần như trùng với API -> DTO chỉ là code lặp\n" +
        "//  - dịch vụ nội bộ dùng chung một thư viện model (nhưng cẩn thận: đó là\n" +
        "//    con đường tới distributed monolith)\n" +
        "\n" +
        "// GIẢM CODE LẶP bằng MapStruct — sinh code lúc BIÊN DỊCH, không reflection:\n" +
        "@Mapper(componentModel = \"spring\")\n" +
        "public interface OrderMapper {\n" +
        "    @Mapping(source = \"customer.name\", target = \"customerName\")\n" +
        "    OrderResponse toResponse(Order order);\n" +
        "}\n" +
        "\n" +
        "// TÁCH DTO VÀO/RA: CreateOrderRequest khác OrderResponse. Dùng chung một\n" +
        "// class cho cả hai dẫn tới field thừa và validate nhập nhằng.",
    },
  ],
},
{
  cat: 'DDD',
  id: 'design-patterns-m00ac3',
  q: 'Value Object là gì? Khác Entity thế nào?',
  answer:
    '- **Entity**: có **định danh** (id) xuyên suốt vòng đời; hai entity "bằng nhau" nếu **cùng id** dù thuộc tính khác. Có thể thay đổi (mutable). Ví dụ: `Customer`, `Order`.\n' +
    '- **Value Object**: **không có định danh**; được định nghĩa **hoàn toàn bởi giá trị các thuộc tính**; hai VO bằng nhau nếu **mọi thuộc tính bằng nhau**. Nên **bất biến** (immutable). Ví dụ: `Money`, `Address`, `DateRange`, `Email`, `Coordinate`.\n\n' +
    'VO giải quyết **Primitive Obsession**: thay `String email`, `BigDecimal amount + String currency` bằng type `Email`, `Money` — mang theo validation + hành vi (`money.plus(other)`, `range.overlaps(other)`).',
  essence:
    'Entity = "cái này là ai" (định danh quan trọng). Value Object = "cái này là bao nhiêu / cái gì" (giá trị quan trọng, danh tính không). VO bất biến, tự validate, mang hành vi liên quan → code an toàn và biểu cảm hơn primitive.',
  example:
    '`Order` (entity, id=5) có `Money total` và `Address shippingAddress` (value objects). `new Money(100, "USD").plus(new Money(50, "USD"))` = `Money(150, USD)`; cộng khác currency → throw. `Email.of("bad")` → throw ngay lúc tạo, không phải lúc dùng.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Entity', 'Value Object'],
    rows: [
      ['Định danh', 'có (id) xuyên suốt vòng đời', 'không'],
      ['Bằng nhau khi', 'cùng id (dù thuộc tính khác)', 'mọi thuộc tính bằng nhau'],
      ['Mutable?', 'có thể', 'nên bất biến'],
      ['Câu hỏi', '"cái này là ai"', '"cái này là bao nhiêu / cái gì"'],
      ['Ví dụ', 'Customer, Order', 'Money, Address, Email, DateRange (giải Primitive Obsession)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Định danh bằng GIÁ TRỊ vs bằng ID",
      code:
        "// VALUE OBJECT — không có định danh riêng; hai VO bằng nhau khi mọi\n" +
        "// thuộc tính bằng nhau. BẤT BIẾN.\n" +
        "public record Money(BigDecimal amount, Currency currency) {\n" +
        "    public Money {\n" +
        "        Objects.requireNonNull(amount);\n" +
        "        if (amount.scale() > 2) throw new IllegalArgumentException(\"quá 2 số lẻ\");\n" +
        "    }\n" +
        "    public Money plus(Money other) {\n" +
        "        requireSameCurrency(other);\n" +
        "        return new Money(amount.add(other.amount), currency);   // object MỚI\n" +
        "    }\n" +
        "    public boolean isGreaterThan(Money o) { return amount.compareTo(o.amount) > 0; }\n" +
        "}\n" +
        "Money a = new Money(BigDecimal.TEN, VND);\n" +
        "Money b = new Money(BigDecimal.TEN, VND);\n" +
        "a.equals(b);           // true — cùng GIÁ TRỊ là cùng một thứ\n" +
        "\n" +
        "// ENTITY — có ĐỊNH DANH; hai entity bằng nhau khi cùng ID, dù thuộc tính khác.\n" +
        "public class Order {\n" +
        "    private final OrderId id;                 // ĐỊNH DANH\n" +
        "    private OrderStatus status;               // thuộc tính THAY ĐỔI được\n" +
        "\n" +
        "    @Override public boolean equals(Object o) {\n" +
        "        return o instanceof Order other && id.equals(other.id);   // CHỈ so ID\n" +
        "    }\n" +
        "    @Override public int hashCode() { return id.hashCode(); }\n" +
        "}\n" +
        "// Đơn hàng đổi trạng thái từ NEW sang PAID -> vẫn là ĐÚNG đơn hàng đó.\n" +
        "\n" +
        "// VÌ SAO VALUE OBJECT QUAN TRỌNG — nó chống \"primitive obsession\":\n" +
        "public void transfer(String from, String to, BigDecimal amount) { }   // dễ gọi nhầm\n" +
        "public void transfer(AccountId from, AccountId to, Money amount) { }  // compiler chặn\n" +
        "\n" +
        "// Và VO là nơi tự nhiên để đặt QUY TẮC NGHIỆP VỤ:\n" +
        "//   Money không cho cộng hai loại tiền khác nhau\n" +
        "//   Email tự validate định dạng khi tạo\n" +
        "//   DateRange đảm bảo from <= to\n" +
        "\n" +
        "// TRONG JAVA: record là công cụ hoàn hảo cho value object (bất biến,\n" +
        "// equals/hashCode theo giá trị, toString — tất cả miễn phí).",
    },
  ],
},
{
  cat: 'DDD',
  id: 'design-patterns-14znx1y',
  q: 'Aggregate và Aggregate Root là gì?',
  answer:
    '**Aggregate**: một **cụm** entity + value object được đối xử như **một đơn vị** cho thay đổi dữ liệu, có **ranh giới nhất quán** (consistency boundary).\n\n' +
    '**Aggregate Root**: entity "cửa ngõ" của aggregate — code bên ngoài **chỉ tham chiếu tới root**, mọi thao tác đi qua root. Root chịu trách nhiệm **enforce invariant** của cả aggregate.\n\n' +
    'Quy tắc:\n' +
    '- Một transaction chỉ nên sửa **một** aggregate (aggregate khác → eventual consistency qua domain event).\n' +
    '- Repository chỉ cho **aggregate root**.\n' +
    '- Tham chiếu giữa aggregate bằng **id**, không phải object reference.\n' +
    '- Aggregate nhỏ (chỉ gồm cái phải nhất quán tức thì).',
  essence:
    'Aggregate = "đơn vị nhất quán giao dịch". Root là người gác cổng enforce mọi quy tắc bên trong. Giữ aggregate nhỏ; giữa các aggregate là eventual consistency. Đây là khái niệm DDD quan trọng nhất về mặt kỹ thuật.',
  example:
    '`Order` (root) chứa `List<OrderLine>` (entity con) và `Money total`. Invariant "total = sum(lines)" do `Order` enforce — không ai sửa `OrderLine` trực tiếp, phải `order.addLine(...)`. `Order` tham chiếu `Customer` bằng `CustomerId`, không giữ object `Customer`. Sửa order + trừ kho = 2 aggregate → order phát `OrderPlaced`, inventory xử lý sau.',
  viz: {
    type: 'tree',
    title: '"Đơn vị nhất quán giao dịch" — khái niệm DDD quan trọng nhất về kỹ thuật',
    root: {
      label: 'Aggregate Root là người gác cổng, enforce mọi invariant bên trong',
      children: [
        { label: 'Code ngoài chỉ tham chiếu tới root', note: 'mọi thao tác đi qua root (order.addLine())' },
        { label: 'Một transaction chỉ sửa MỘT aggregate', note: 'aggregate khác → eventual consistency qua domain event' },
        { label: 'Repository chỉ cho aggregate root', note: '' },
        { label: 'Tham chiếu giữa aggregate bằng id', note: 'Order giữ CustomerId, không object Customer' },
        { label: 'Aggregate nhỏ', note: 'chỉ gồm cái phải nhất quán tức thì' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ranh giới nhất quán và điểm vào duy nhất",
      code:
        "// AGGREGATE = một cụm object được coi là MỘT ĐƠN VỊ cho mục đích thay đổi dữ liệu.\n" +
        "// AGGREGATE ROOT = entity duy nhất mà bên ngoài được phép tham chiếu tới.\n" +
        "public class Order {                     // AGGREGATE ROOT\n" +
        "    private final OrderId id;\n" +
        "    private final List<OrderLine> lines = new ArrayList<>();   // nằm TRONG aggregate\n" +
        "    private OrderStatus status;\n" +
        "    private Money total;\n" +
        "\n" +
        "    // MỌI thay đổi đi qua root -> root bảo vệ được BẤT BIẾN\n" +
        "    public void addLine(ProductId product, int quantity, Money unitPrice) {\n" +
        "        if (status != OrderStatus.NEW)\n" +
        "            throw new IllegalStateException(\"đơn đã chốt, không sửa được\");\n" +
        "        if (lines.size() >= 100)\n" +
        "            throw new IllegalStateException(\"tối đa 100 dòng\");\n" +
        "        lines.add(new OrderLine(product, quantity, unitPrice));\n" +
        "        recalculateTotal();                                    // giữ BẤT BIẾN\n" +
        "    }\n" +
        "\n" +
        "    public List<OrderLine> lines() { return List.copyOf(lines); }   // KHÔNG cho sửa\n" +
        "}\n" +
        "// KHÔNG có OrderLineRepository — không ai được sửa OrderLine trực tiếp.\n" +
        "\n" +
        "// BỐN QUY TẮC CỦA AGGREGATE:\n" +
        "// 1) Bên ngoài CHỈ tham chiếu tới ROOT, không tới object bên trong.\n" +
        "// 2) Object bên trong tham chiếu ra ngoài bằng ID, KHÔNG bằng tham chiếu trực tiếp:\n" +
        "public class Order {\n" +
        "    private final CustomerId customerId;      // ID, KHÔNG phải Customer customer\n" +
        "}\n" +
        "// 3) MỘT transaction chỉ nên sửa MỘT aggregate. Cần sửa nhiều -> dùng\n" +
        "//    domain event và nhất quán cuối cùng.\n" +
        "// 4) Aggregate là RANH GIỚI NHẤT QUÁN: mọi bất biến bên trong nó luôn đúng\n" +
        "//    sau mỗi transaction.\n" +
        "\n" +
        "// KÍCH THƯỚC AGGREGATE — quyết định thiết kế quan trọng nhất:\n" +
        "//  quá LỚN  -> tranh chấp khoá cao, tải nhiều dữ liệu không cần\n" +
        "//  quá NHỎ  -> không bảo vệ được bất biến, phải phối hợp nhiều aggregate\n" +
        "// -> Nguyên tắc: nhỏ nhất có thể mà vẫn giữ được bất biến nghiệp vụ.",
    },
  ],
},
{
  cat: 'DDD',
  id: 'design-patterns-o5snnn',
  q: 'Domain Events — pattern và cách dùng?',
  answer:
    'Một **domain event** ghi lại "điều gì đó có ý nghĩa nghiệp vụ đã xảy ra" (`OrderPlaced`, `PaymentReceived`, `SubscriptionCancelled`) — quá khứ, bất biến.\n\n' +
    'Cách dùng:\n' +
    '- Aggregate tạo event khi state đổi; **thu thập** trên aggregate (`order.domainEvents()`).\n' +
    '- Sau khi persist aggregate (cùng transaction) → **publish** event.\n' +
    '- **In-process**: handler khác trong cùng service xử lý (Spring `@DomainEventsListener` / `ApplicationEventPublisher`), thường `@TransactionalEventListener(AFTER_COMMIT)`.\n' +
    '- **Cross-service**: qua outbox → message broker.\n\n' +
    'Lợi: tách side-effect khỏi logic chính; nhiều reaction cho một sự kiện; audit; tích hợp.',
  essence:
    'Domain event làm cho "cái gì đã xảy ra" thành first-class. Nó tách "quy tắc thay đổi state" (trong aggregate) khỏi "hệ quả của thay đổi đó" (email, cập nhật read model, tích hợp) — mỗi hệ quả là một handler độc lập.',
  example:
    '`order.place()` → aggregate thêm `OrderPlaced` vào danh sách event. Repository save → publish. Handler AFTER_COMMIT: `InventoryHandler` trừ kho (hoặc phát event xuyên service), `EmailHandler` gửi xác nhận, `AnalyticsHandler` ghi metric. Thêm "gửi SMS" = thêm một handler.',
  viz: {
    type: 'flow',
    title: 'Tách "quy tắc thay đổi state" khỏi "hệ quả của thay đổi"',
    nodes: ['Aggregate tạo event khi state đổi', 'Thu thập trên aggregate (order.domainEvents())', 'Persist aggregate (cùng transaction)', 'Publish event', 'Handler độc lập: Inventory, Email, Analytics (AFTER_COMMIT)'],
    steps: [
      { to: 0, label: 'Domain event = "điều gì đó có ý nghĩa nghiệp vụ đã xảy ra" — quá khứ, bất biến' },
      { to: 3, label: 'In-process: @TransactionalEventListener; cross-service: outbox → broker' },
      { to: 4, label: 'Thêm "gửi SMS" = thêm một handler' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ghi lại \"chuyện gì đã xảy ra\" trong ngôn ngữ nghiệp vụ",
      code:
        "// Domain event mô tả một SỰ VIỆC ĐÃ XẢY RA, đặt tên ở THÌ QUÁ KHỨ.\n" +
        "public record OrderPlaced(OrderId orderId, CustomerId customerId,\n" +
        "                          Money total, Instant occurredAt) implements DomainEvent { }\n" +
        "\n" +
        "// AGGREGATE tự ghi nhận event của mình\n" +
        "public class Order extends AggregateRoot {\n" +
        "    public static Order place(CustomerId customer, List<OrderLine> lines) {\n" +
        "        Order order = new Order(OrderId.generate(), customer, lines);\n" +
        "        order.registerEvent(new OrderPlaced(order.id, customer,\n" +
        "                                            order.total, Instant.now()));\n" +
        "        return order;\n" +
        "    }\n" +
        "}\n" +
        "public abstract class AggregateRoot {\n" +
        "    private final List<DomainEvent> events = new ArrayList<>();\n" +
        "    protected void registerEvent(DomainEvent e) { events.add(e); }\n" +
        "    public List<DomainEvent> pullEvents() {          // lấy VÀ xoá\n" +
        "        var copy = List.copyOf(events);\n" +
        "        events.clear();\n" +
        "        return copy;\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// PHÁT event khi LƯU aggregate\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    @Transactional\n" +
        "    public void place(PlaceOrderCommand cmd) {\n" +
        "        Order order = Order.place(cmd.customerId(), cmd.lines());\n" +
        "        repository.save(order);\n" +
        "        order.pullEvents().forEach(publisher::publishEvent);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// XỬ LÝ — sau khi COMMIT, để tránh gửi mail rồi transaction lại rollback\n" +
        "@Component\n" +
        "public class OrderEventHandlers {\n" +
        "    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)\n" +
        "    public void on(OrderPlaced e) { mailer.sendConfirmation(e); }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: tách tác dụng phụ ra khỏi logic chính; thêm việc cần làm khi\n" +
        "// có đơn hàng mà không sửa OrderService; và domain diễn đạt được điều\n" +
        "// mà người làm nghiệp vụ nói.\n" +
        "// CẦN ĐẢM BẢO KHÔNG MẤT event -> kết hợp với OUTBOX (ghi event vào DB\n" +
        "// trong cùng transaction).",
    },
  ],
},
{
  cat: 'Enterprise',
  id: 'design-patterns-13u5wnn',
  q: 'Specification pattern — đóng gói business rule thành object?',
  answer:
    'Đóng gói một **điều kiện nghiệp vụ** (predicate) thành một object có thể **kết hợp** (`and`, `or`, `not`) và tái dùng.\n\n' +
    '```\ninterface Specification<T> { boolean isSatisfiedBy(T candidate); }\nvar premiumActive = isPremium.and(isActive).and(hasNoOverdue);\n```\n\n' +
    'Dùng cho:\n' +
    '- **Validation** ("đơn hàng có đủ điều kiện checkout không").\n' +
    '- **Selection từ collection** (`customers.stream().filter(spec::isSatisfiedBy)`).\n' +
    '- **Query** (Spring Data JPA `Specification` → dịch sang WHERE clause).\n' +
    '- Cùng một rule dùng ở cả ba chỗ (validate, in-memory filter, DB query).',
  essence:
    'Specification biến "if lồng nhau về điều kiện nghiệp vụ" thành object đặt tên, ghép được, test được, tái dùng ở validate + filter + query. Rule sống ở domain, không rải trong service/repository.',
  example:
    'Spring Data JPA: `Specification<Order> recent = (root, q, cb) -> cb.greaterThan(root.get("createdAt"), lastWeek);` `Specification<Order> highValue = ...;` → `orderRepo.findAll(recent.and(highValue))` sinh SQL `WHERE created_at > ? AND total > ?`. Cùng spec dùng để validate một order đơn lẻ.',
  viz: {
    type: 'tree',
    title: 'Rule sống ở domain, không rải trong service/repository',
    root: {
      label: 'Đóng gói điều kiện nghiệp vụ thành object ghép được (and/or/not), test được',
      children: [
        { label: 'Validation', note: '"đơn hàng có đủ điều kiện checkout không"' },
        { label: 'Selection từ collection', note: 'customers.stream().filter(spec::isSatisfiedBy)' },
        { label: 'Query', note: 'Spring Data JPA Specification → dịch sang WHERE clause' },
        { label: 'Cùng một rule ở cả ba chỗ', note: 'validate + in-memory filter + DB query' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Quy tắc trở thành object kết hợp được",
      code:
        "public interface Specification<T> {\n" +
        "    boolean isSatisfiedBy(T candidate);\n" +
        "\n" +
        "    default Specification<T> and(Specification<T> other) {\n" +
        "        return c -> this.isSatisfiedBy(c) && other.isSatisfiedBy(c);\n" +
        "    }\n" +
        "    default Specification<T> or(Specification<T> other) {\n" +
        "        return c -> this.isSatisfiedBy(c) || other.isSatisfiedBy(c);\n" +
        "    }\n" +
        "    default Specification<T> not() {\n" +
        "        return c -> !this.isSatisfiedBy(c);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "public record CustomerIsGold() implements Specification<Order> {\n" +
        "    public boolean isSatisfiedBy(Order o) { return o.customer().tier() == GOLD; }\n" +
        "}\n" +
        "public record OrderExceeds(Money threshold) implements Specification<Order> {\n" +
        "    public boolean isSatisfiedBy(Order o) { return o.total().isGreaterThan(threshold); }\n" +
        "}\n" +
        "\n" +
        "// KẾT HỢP quy tắc như ghép câu — đọc gần như tiếng Việt:\n" +
        "Specification<Order> freeShipping =\n" +
        "    new CustomerIsGold().or(new OrderExceeds(Money.vnd(1_000_000)));\n" +
        "\n" +
        "if (freeShipping.isSatisfiedBy(order)) applyFreeShipping();\n" +
        "\n" +
        "// BA CÔNG DỤNG CỦA CÙNG MỘT SPECIFICATION:\n" +
        "// 1) KIỂM TRA một object (như trên)\n" +
        "// 2) LỌC một danh sách trong bộ nhớ\n" +
        "orders.stream().filter(freeShipping::isSatisfiedBy).toList();\n" +
        "// 3) TRUY VẤN database — với Spring Data JPA Specification:\n" +
        "public static Specification<OrderEntity> isGold() {\n" +
        "    return (root, q, cb) -> cb.equal(root.get(\"customer\").get(\"tier\"), \"GOLD\");\n" +
        "}\n" +
        "repository.findAll(isGold().and(exceeds(threshold)), pageable);\n" +
        "\n" +
        "// LỢI ÍCH: quy tắc nghiệp vụ có TÊN, được test riêng, và dùng lại được ở\n" +
        "// nhiều nơi thay vì lặp lại điều kiện if khắp code.\n" +
        "// CẢNH BÁO: đừng lạm dụng — với điều kiện đơn giản dùng một lần thì một\n" +
        "// câu if rõ ràng hơn nhiều so với ba class.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-uc8och',
  q: 'Ports & Adapters (Hexagonal Architecture) là gì?',
  answer:
    'Đặt **domain/application logic ở trung tâm**, hoàn toàn không biết gì về công nghệ bên ngoài (DB, HTTP, message queue, UI).\n\n' +
    '- **Port**: interface do lõi định nghĩa — "tôi cần/cung cấp gì". *Driving port* (API lõi cho phía ngoài gọi vào: use case), *driven port* (lõi cần gì từ hạ tầng: `OrderRepository`, `PaymentGateway`).\n' +
    '- **Adapter**: code kết nối một công nghệ cụ thể với một port. *Driving adapter* (REST controller, CLI, message consumer gọi use case). *Driven adapter* (JPA repository, HTTP client Stripe implements port).\n\n' +
    'Quy tắc phụ thuộc: **mọi thứ trỏ vào trong**; lõi không import gì của adapter.',
  essence:
    'Hexagonal = "lõi nghiệp vụ ở giữa, công nghệ ở rìa, nối bằng interface (port) mà lõi sở hữu". Đổi REST→gRPC hay Postgres→Mongo = đổi adapter, lõi bất biến. Test lõi = mock các port, không cần hạ tầng.',
  example:
    'Lõi: `PlaceOrderUseCase` (driving port) dùng `OrderRepository` + `PaymentGateway` (driven port). Adapter: `OrderController` (REST) gọi use case; `KafkaOrderConsumer` cũng gọi use case; `JpaOrderRepository` implements repo port; `StripePaymentAdapter` implements payment port. Lõi không có `@RestController`, `@Entity`, `import stripe`.',
  viz: {
    type: 'tree',
    title: '"Lõi ở giữa, công nghệ ở rìa, nối bằng interface (port) mà lõi sở hữu"',
    root: {
      label: 'Quy tắc phụ thuộc: mọi thứ trỏ VÀO TRONG — lõi không import gì của adapter',
      children: [
        { label: 'Driving port', note: 'API lõi cho phía ngoài gọi vào (use case)' },
        { label: 'Driven port', note: 'lõi cần gì từ hạ tầng (OrderRepository, PaymentGateway)' },
        { label: 'Driving adapter', note: 'REST controller, CLI, message consumer gọi use case' },
        { label: 'Driven adapter', note: 'JPA repository, Stripe HTTP client implements port' },
        { label: 'Đổi REST→gRPC / Postgres→Mongo', note: '= đổi adapter, lõi bất biến. Test lõi = mock port' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Domain ở giữa, mọi thứ khác cắm vào qua cổng",
      code:
        "// DOMAIN ở TRUNG TÂM, không phụ thuộc gì bên ngoài.\n" +
        "// PORT = interface do domain định nghĩa. ADAPTER = cài đặt cụ thể.\n" +
        "\n" +
        "// INBOUND PORT (driving) — cách thế giới bên ngoài GỌI VÀO domain\n" +
        "package com.example.domain.port.in;\n" +
        "public interface PlaceOrderUseCase {\n" +
        "    OrderId place(PlaceOrderCommand cmd);\n" +
        "}\n" +
        "\n" +
        "// OUTBOUND PORT (driven) — cách domain GỌI RA thế giới bên ngoài\n" +
        "package com.example.domain.port.out;\n" +
        "public interface OrderRepository { void save(Order o); }\n" +
        "public interface PaymentPort { PaymentResult charge(Money amount, String token); }\n" +
        "\n" +
        "// DOMAIN — cài đặt inbound port, DÙNG outbound port. Không import\n" +
        "// Spring, không import JPA, không import HTTP.\n" +
        "package com.example.domain.service;\n" +
        "public class PlaceOrderService implements PlaceOrderUseCase {\n" +
        "    private final OrderRepository orders;      // PORT\n" +
        "    private final PaymentPort payments;        // PORT\n" +
        "\n" +
        "    public OrderId place(PlaceOrderCommand cmd) {\n" +
        "        Order order = Order.place(cmd.customerId(), cmd.lines());\n" +
        "        payments.charge(order.total(), cmd.paymentToken());\n" +
        "        orders.save(order);\n" +
        "        return order.id();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// ADAPTER VÀO — điều khiển domain\n" +
        "package com.example.adapter.in.web;\n" +
        "@RestController\n" +
        "public class OrderController {\n" +
        "    private final PlaceOrderUseCase useCase;             // chỉ biết PORT\n" +
        "    @PostMapping(\"/orders\")\n" +
        "    public OrderResponse create(@RequestBody CreateOrderRequest req) {\n" +
        "        return toResponse(useCase.place(req.toCommand()));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// ADAPTER RA — được domain điều khiển\n" +
        "package com.example.adapter.out.persistence;\n" +
        "@Repository\n" +
        "public class JpaOrderAdapter implements OrderRepository { }\n" +
        "\n" +
        "// LỢI ÍCH: domain test được HOÀN TOÀN bằng adapter giả; đổi web sang gRPC,\n" +
        "// đổi Postgres sang Mongo — domain không đổi một dòng.\n" +
        "// CÁI GIÁ: nhiều file hơn, nhiều mapping hơn. Chỉ đáng khi domain THỰC SỰ\n" +
        "// phức tạp; với CRUD thì đây là over-engineering.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-q7fi2x',
  q: 'Clean Architecture / Onion Architecture — Dependency Rule?',
  answer:
    'Các vòng đồng tâm, phụ thuộc **chỉ hướng vào trong**:\n' +
    '- **Entities** (trong cùng): quy tắc nghiệp vụ doanh nghiệp, thuần, không phụ thuộc gì.\n' +
    '- **Use Cases**: quy tắc nghiệp vụ ứng dụng; điều phối entities; định nghĩa interface cho tầng ngoài.\n' +
    '- **Interface Adapters**: controller, presenter, gateway — chuyển đổi dữ liệu giữa use case và framework.\n' +
    '- **Frameworks & Drivers** (ngoài cùng): DB, web framework, UI, thiết bị.\n\n' +
    '**Dependency Rule**: code vòng trong **không biết gì** về vòng ngoài. Tên class/khái niệm vòng ngoài không xuất hiện trong vòng trong. Vượt ranh giới bằng interface + DIP.',
  essence:
    'Clean/Onion/Hexagonal cùng một ý: **nghiệp vụ ở trung tâm, không phụ thuộc framework; phụ thuộc luôn hướng vào lõi ổn định**. Framework là "chi tiết" cắm vào, không phải nền tảng bạn xây trên.',
  example:
    'Use case `TransferMoney` không import Spring, JPA, Jackson. Nó dùng `AccountRepository` (interface nó tự định nghĩa). `SpringJpaAccountRepository` (vòng ngoài) implements interface đó. Bạn có thể chạy/test toàn bộ logic transfer mà không khởi động Spring hay DB.',
  viz: {
    type: 'layers',
    title: 'Các vòng đồng tâm — phụ thuộc CHỈ hướng vào trong',
    layers: [
      { name: 'Frameworks & Drivers', tag: 'ngoài cùng', note: 'DB, web framework, UI, thiết bị — "chi tiết" cắm vào' },
      { name: 'Interface Adapters', tag: '', note: 'controller, presenter, gateway — chuyển đổi dữ liệu giữa use case và framework' },
      { name: 'Use Cases', tag: '', note: 'quy tắc nghiệp vụ ứng dụng; điều phối entities; định nghĩa interface cho tầng ngoài' },
      { name: 'Entities', tag: 'trong cùng', note: 'quy tắc nghiệp vụ doanh nghiệp, thuần, không phụ thuộc gì' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Phụ thuộc chỉ hướng VÀO TRONG",
      code:
        "// CÁC VÒNG, từ trong ra ngoài:\n" +
        "//   1. Entities        — quy tắc nghiệp vụ cốt lõi (thuần Java)\n" +
        "//   2. Use Cases       — quy tắc nghiệp vụ của ứng dụng\n" +
        "//   3. Interface Adapters — controller, presenter, gateway\n" +
        "//   4. Frameworks & Drivers — Spring, JPA, database, web\n" +
        "\n" +
        "// DEPENDENCY RULE: mã nguồn ở vòng TRONG KHÔNG BAO GIỜ biết gì về vòng NGOÀI.\n" +
        "package com.example.domain.entity;              // VÒNG 1\n" +
        "public class Order {                             // KHÔNG import gì ngoài JDK\n" +
        "    private final OrderId id;\n" +
        "    public void confirm() { if (status != NEW) throw new IllegalStateException(); }\n" +
        "}\n" +
        "\n" +
        "package com.example.application.usecase;         // VÒNG 2\n" +
        "public class PlaceOrderUseCase {\n" +
        "    private final OrderRepository repo;          // interface ĐỊNH NGHĨA Ở ĐÂY\n" +
        "    public OrderId execute(PlaceOrderCommand cmd) { ... }\n" +
        "}\n" +
        "\n" +
        "package com.example.adapter.persistence;         // VÒNG 3-4\n" +
        "@Repository\n" +
        "public class JpaOrderRepository implements OrderRepository {   // cài đặt Ở NGOÀI\n" +
        "    @PersistenceContext private EntityManager em;              // JPA chỉ ở đây\n" +
        "}\n" +
        "\n" +
        "// KIỂM CHỨNG BẰNG TEST KIẾN TRÚC — nếu không, quy tắc sẽ bị vi phạm dần:\n" +
        "@ArchTest\n" +
        "static final ArchRule dependency_rule = layeredArchitecture().consideringAllDependencies()\n" +
        "    .layer(\"Domain\").definedBy(\"..domain..\")\n" +
        "    .layer(\"Application\").definedBy(\"..application..\")\n" +
        "    .layer(\"Adapter\").definedBy(\"..adapter..\")\n" +
        "    .whereLayer(\"Domain\").mayOnlyBeAccessedByLayers(\"Application\", \"Adapter\")\n" +
        "    .whereLayer(\"Adapter\").mayNotBeAccessedByAnyLayer();\n" +
        "\n" +
        "@ArchTest\n" +
        "static final ArchRule domain_khong_biet_framework =\n" +
        "    noClasses().that().resideInAPackage(\"..domain..\")\n" +
        "        .should().dependOnClassesThat()\n" +
        "        .resideInAnyPackage(\"org.springframework..\", \"jakarta.persistence..\");\n" +
        "\n" +
        "// LỢI ÍCH: nghiệp vụ test được không cần Spring; framework trở thành CHI\n" +
        "// TIẾT có thể thay; quyết định về database hoãn được tới muộn.\n" +
        "// CÁI GIÁ: nhiều tầng và nhiều mapping. Đánh giá trung thực xem domain\n" +
        "// của bạn có đủ phức tạp để xứng đáng hay không.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-1sgltpm',
  q: 'Layered architecture truyền thống vs Hexagonal — khác biệt cốt lõi?',
  answer:
    '**Layered (N-tier)**: `Presentation → Application → Domain → Infrastructure`, phụ thuộc **từ trên xuống**. Vấn đề: **Domain phụ thuộc Infrastructure** (repository implementation, ORM) → domain dính công nghệ; đổi DB ảnh hưởng domain; test domain cần DB.\n\n' +
    '**Hexagonal**: Domain ở **trung tâm**, Infrastructure ở **rìa** và **phụ thuộc ngược vào** Domain (qua port). Domain định nghĩa `interface Repository`; Infrastructure implements. Domain hoàn toàn thuần.\n\n' +
    'Điểm khác: hướng phụ thuộc giữa Domain và Infrastructure bị **đảo** (DIP).',
  essence:
    'Layered để domain phụ thuộc infra (xuống dưới) → domain bị nhiễm công nghệ. Hexagonal đảo hướng đó: infra phụ thuộc domain → domain sạch, testable, framework-independent. Cùng số "tầng", khác hướng mũi tên ở chỗ quan trọng nhất.',
  example:
    'Layered: `OrderService` (domain) `import com.acme.persistence.OrderRepositoryImpl` hoặc ít nhất biết về JPA. Hexagonal: `OrderService` chỉ biết `OrderRepository` (interface trong package domain); `OrderRepositoryImpl` ở package infrastructure `import` ngược lên domain.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Layered (N-tier)', 'Hexagonal'],
    rows: [
      ['Hướng phụ thuộc', 'từ trên xuống: Domain → Infrastructure', 'Infrastructure → Domain (đảo, DIP)'],
      ['Domain', 'dính công nghệ (repository impl, ORM)', 'hoàn toàn thuần'],
      ['Đổi DB', 'ảnh hưởng domain', 'đổi adapter, domain bất biến'],
      ['Test domain', 'cần DB', 'mock port, không hạ tầng'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hướng của mũi tên phụ thuộc",
      code:
        "// LAYERED TRUYỀN THỐNG — phụ thuộc đi XUỐNG, và tầng dưới cùng là DATABASE\n" +
        "//   Controller -> Service -> Repository -> Database\n" +
        "package com.example.service;\n" +
        "public class OrderService {\n" +
        "    private final OrderRepository repo;      // interface nằm ở TẦNG PERSISTENCE\n" +
        "}\n" +
        "package com.example.persistence;\n" +
        "public interface OrderRepository { }         // <- ĐIỂM MẤU CHỐT\n" +
        "// Service phải IMPORT package persistence -> nghiệp vụ phụ thuộc hạ tầng.\n" +
        "// Hệ quả: đổi cách lưu trữ ảnh hưởng tầng nghiệp vụ; test nghiệp vụ khó;\n" +
        "// và database trở thành trung tâm của thiết kế.\n" +
        "\n" +
        "// HEXAGONAL — phụ thuộc hướng VÀO TRONG, interface nằm ở TRUNG TÂM\n" +
        "package com.example.domain.port.out;\n" +
        "public interface OrderRepository { }         // <- interface Ở DOMAIN\n" +
        "package com.example.domain.service;\n" +
        "public class OrderService {\n" +
        "    private final OrderRepository repo;      // không import gì ngoài domain\n" +
        "}\n" +
        "package com.example.adapter.out;\n" +
        "public class JpaOrderRepository implements OrderRepository { }   // hạ tầng\n" +
        "                                                    // phụ thuộc VÀO domain\n" +
        "\n" +
        "// KHÁC BIỆT CỐT LÕI chỉ nằm ở MỘT ĐIỀU: interface được ĐỊNH NGHĨA Ở ĐÂU.\n" +
        "//  - ở tầng hạ tầng  -> layered, nghiệp vụ phụ thuộc hạ tầng\n" +
        "//  - ở tầng domain   -> hexagonal, hạ tầng phụ thuộc nghiệp vụ\n" +
        "\n" +
        "// HỆ QUẢ THỰC TẾ:\n" +
        "//  Layered    — đơn giản, quen thuộc, ít file. Đủ tốt cho ứng dụng CRUD\n" +
        "//               và cho đội mới. Rủi ro: logic nghiệp vụ trôi dần vào\n" +
        "//               service và entity JPA, thành anemic domain model.\n" +
        "//  Hexagonal  — domain độc lập, test nhanh, thay hạ tầng dễ. Đắt hơn về\n" +
        "//               số file và mapping.\n" +
        "\n" +
        "// CHỌN THEO ĐỘ PHỨC TẠP NGHIỆP VỤ, không theo trào lưu. Ứng dụng chủ yếu\n" +
        "// là CRUD thì layered đơn giản là lựa chọn đúng.",
    },
  ],
},
{
  cat: 'Enterprise',
  id: 'design-patterns-8kytuy',
  q: 'Service Layer pattern — vai trò và ranh giới?',
  answer:
    'Một tầng định nghĩa **ranh giới của ứng dụng** và tập **use case/operation** mà nó cung cấp cho client (controller, message handler, batch job). Mỗi method service layer = một **giao dịch nghiệp vụ** hoàn chỉnh.\n\n' +
    'Trách nhiệm:\n' +
    '- Điều phối domain object + repository để hoàn thành một use case.\n' +
    '- Quản lý **transaction** (`@Transactional` ở đây).\n' +
    '- Xử lý cross-cutting ở mức use case (authorization, event publishing sau commit).\n\n' +
    'KHÔNG chứa: business rule (thuộc domain object), chi tiết HTTP (thuộc controller), SQL (thuộc repository). Service mỏng nếu domain model "rich".',
  essence:
    'Service Layer = "danh mục các thao tác ứng dụng có thể làm" + nơi quản lý transaction và điều phối. Với domain model tốt, nó mỏng (điều phối). Với anemic model, nó phình (chứa cả logic — anti-pattern).',
  example:
    '`OrderService.placeOrder(cmd)`: `@Transactional` → load `Cart` aggregate, `cart.checkout()` (rule ở đây), `orderRepo.save(order)`, publish `OrderPlaced`. 8 dòng điều phối. Rule "giỏ trống không checkout được", "áp giới hạn số lượng" nằm trong `Cart`, không trong service.',
  viz: {
    type: 'tree',
    title: 'Domain model tốt → service mỏng (điều phối). Anemic → service phình (anti-pattern)',
    root: {
      label: '"Danh mục các thao tác ứng dụng" + quản lý transaction',
      children: [
        { label: 'Điều phối domain object + repository', note: 'mỗi method = một giao dịch nghiệp vụ hoàn chỉnh' },
        { label: 'Quản lý transaction', note: '@Transactional ở đây' },
        { label: 'Cross-cutting mức use case', note: 'authorization, event publishing sau commit' },
        { label: 'KHÔNG chứa', note: 'business rule (→ domain), chi tiết HTTP (→ controller), SQL (→ repository)' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Điều phối, không phải chứa quy tắc nghiệp vụ",
      code:
        "// SERVICE LAYER ĐÚNG — nó ĐIỀU PHỐI, còn quy tắc nằm trong DOMAIN\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    @Transactional                                  // 1) ranh giới TRANSACTION\n" +
        "    public OrderId place(PlaceOrderCommand cmd) {\n" +
        "        var customer = customerRepo.findById(cmd.customerId())\n" +
        "                                   .orElseThrow(CustomerNotFound::new);\n" +
        "\n" +
        "        Order order = Order.place(customer, cmd.lines());   // 2) QUY TẮC ở domain\n" +
        "        paymentPort.charge(order.total(), cmd.token());     // 3) gọi hạ tầng\n" +
        "        orderRepo.save(order);                              // 4) lưu trữ\n" +
        "        publisher.publishEvent(new OrderPlaced(order.id()));// 5) phát event\n" +
        "        return order.id();\n" +
        "    }\n" +
        "}\n" +
        "// Service làm: mở transaction, lấy dữ liệu, gọi domain, lưu, phát event.\n" +
        "// Service KHÔNG làm: quyết định \"đơn hàng thế nào là hợp lệ\".\n" +
        "\n" +
        "// SERVICE LAYER SAI — mọi quy tắc dồn vào đây, entity thành túi dữ liệu\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    public void place(PlaceOrderCommand cmd) {\n" +
        "        if (cmd.lines().isEmpty()) throw new IllegalArgumentException();\n" +
        "        BigDecimal total = BigDecimal.ZERO;\n" +
        "        for (var l : cmd.lines()) total = total.add(l.price().multiply(l.qty()));\n" +
        "        if (customer.getTier().equals(\"GOLD\")) total = total.multiply(0.9);\n" +
        "        Order o = new Order();\n" +
        "        o.setTotal(total);                     // entity chỉ có setter\n" +
        "        o.setStatus(\"NEW\");\n" +
        "        // -> ANEMIC DOMAIN MODEL: quy tắc bị rải rác, lặp lại ở mọi service\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// RANH GIỚI RÕ RÀNG:\n" +
        "//  CONTROLLER — chuyển đổi HTTP <-> command/DTO, không có logic\n" +
        "//  SERVICE    — điều phối, transaction, gọi hạ tầng\n" +
        "//  DOMAIN     — quy tắc nghiệp vụ và bất biến\n" +
        "//  REPOSITORY — lưu trữ\n" +
        "\n" +
        "// DẤU HIỆU SERVICE PHÌNH: nó dài hàng nghìn dòng, có nhiều if về quy tắc\n" +
        "// nghiệp vụ, và entity tương ứng chỉ toàn getter/setter.",
    },
  ],
},
{
  cat: 'Enterprise',
  id: 'design-patterns-18bpg3a',
  q: 'Active Record vs Data Mapper?',
  answer:
    '- **Active Record**: object **vừa mang dữ liệu vừa biết cách tự lưu**: `user.save()`, `User.find(1)`, `user.delete()`. Object khớp 1-1 với row bảng. Đơn giản, ít code, tốt cho CRUD. Nhược: domain object coupling với DB; khó test; khó tách domain model khỏi schema; logic persistence lẫn logic nghiệp vụ. (Rails ActiveRecord, Eloquent).\n\n' +
    '- **Data Mapper**: một **mapper riêng** chuyển đổi giữa domain object (thuần, không biết DB) và database. Domain object không có method persistence. Phức tạp hơn nhưng domain sạch, testable, model độc lập schema. (Hibernate/JPA, Doctrine).',
  essence:
    'Active Record: object tự lo persistence (nhanh, đơn giản, coupling). Data Mapper: tách persistence ra mapper (domain thuần, phù hợp domain phức tạp/DDD). Chọn theo độ phức tạp domain: CRUD app → Active Record; rich domain → Data Mapper.',
  example:
    'Active Record: `$order = Order::find(5); $order->status = "PAID"; $order->save();`. Data Mapper (JPA): `Order order = em.find(Order.class, 5); order.markPaid();` — `Order` không có `save()`; `EntityManager` (mapper) theo dõi và flush. `Order` không import gì về DB.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Active Record', 'Data Mapper'],
    rows: [
      ['Object', 'vừa mang dữ liệu vừa tự lưu (user.save())', 'thuần, không biết DB; mapper riêng chuyển đổi'],
      ['Object ↔ bảng', '1-1 với row', 'độc lập schema'],
      ['Code / độ phức tạp', 'ít, đơn giản', 'nhiều hơn (mapping layer)'],
      ['Test', 'khó (coupling DB)', 'domain test không cần DB'],
      ['Hợp với', 'CRUD app (Rails AR, Eloquent)', 'rich domain / DDD (Hibernate, Doctrine)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Object tự lưu mình vs có người lưu hộ",
      code:
        "// ACTIVE RECORD — object CHỨA LUÔN logic truy cập dữ liệu\n" +
        "public class User extends ActiveRecord {          // kiểu Rails, Eloquent\n" +
        "    private String name;\n" +
        "    public void save()   { db.execute(\"INSERT INTO users ...\"); }\n" +
        "    public void delete() { db.execute(\"DELETE FROM users WHERE id = ?\", id); }\n" +
        "    public static User find(long id) { ... }\n" +
        "}\n" +
        "User u = User.find(1);\n" +
        "u.setName(\"An\");\n" +
        "u.save();                                          // object TỰ lưu mình\n" +
        "// + rất nhanh để viết, ít code, trực quan cho CRUD\n" +
        "// - object gắn CHẶT với database -> không test được nếu không có DB\n" +
        "// - domain model bị ép giống cấu trúc BẢNG\n" +
        "// - vi phạm SRP: object vừa mang dữ liệu nghiệp vụ vừa biết SQL\n" +
        "\n" +
        "// DATA MAPPER — có một tầng RIÊNG lo việc ánh xạ\n" +
        "public class User {                                // domain THUẦN\n" +
        "    private final UserId id;\n" +
        "    private String name;\n" +
        "    public void rename(String newName) { ... }     // chỉ có nghiệp vụ\n" +
        "}\n" +
        "public interface UserRepository {                   // mapper lo lưu trữ\n" +
        "    Optional<User> findById(UserId id);\n" +
        "    void save(User user);\n" +
        "}\n" +
        "// + domain KHÔNG biết gì về database -> test được, đổi được\n" +
        "// + domain model theo NGHIỆP VỤ, không theo bảng\n" +
        "// - nhiều code hơn (mapping giữa entity và domain)\n" +
        "\n" +
        "// TRONG JAVA: JPA/Hibernate là DATA MAPPER (EntityManager làm việc ánh xạ).\n" +
        "// Nhưng nhiều dự án dùng nó theo kiểu active record — nhét logic vào\n" +
        "// @Entity và gọi repository.save() khắp nơi.\n" +
        "\n" +
        "// CHỌN: ứng dụng CRUD, ít quy tắc nghiệp vụ -> Active Record (hoặc JPA\n" +
        "// entity dùng trực tiếp) là đủ và nhanh.\n" +
        "// Domain phức tạp, nhiều quy tắc và bất biến -> Data Mapper.",
    },
  ],
},
{
  cat: 'Enterprise',
  id: 'design-patterns-157mr5n',
  q: 'Anti-Corruption Layer (ACL) — pattern chi tiết?',
  answer:
    'Khi tích hợp với hệ thống/context có mô hình **khác biệt hoặc kém chất lượng** (legacy, đối tác, một bounded context khác), đặt một lớp **dịch thuật** ở biên để mô hình xấu đó **không rò rỉ** vào domain sạch của bạn.\n\n' +
    'Thành phần:\n' +
    '- **Adapter**: giao tiếp với hệ ngoài (SOAP client, file parser).\n' +
    '- **Translator**: chuyển đổi model ngoài ↔ model của bạn.\n' +
    '- **Facade** (tuỳ chọn): interface gọn cho phần còn lại của service.\n\n' +
    'ACL có thể là module trong service, hoặc một service riêng.',
  essence:
    'ACL bảo vệ tính toàn vẹn của mô hình domain bạn khi phải "nói chuyện" với một mô hình bạn không kiểm soát. Trả giá dịch thuật ở một chỗ, đổi lấy việc phần còn lại không bị nhiễm khái niệm/nợ của hệ ngoài.',
  example:
    'Service `loyalty` mới tích hợp CRM cũ: CRM trả `MEMBER_TIER = "G"` (gold), ngày `20240115`, điểm là string. ACL `CrmMemberTranslator`: `"G"` → `Tier.GOLD` enum, `"20240115"` → `LocalDate`, string → `int`. Domain `loyalty` chỉ thấy `Member { Tier tier; LocalDate joinedAt; int points; }` sạch sẽ.',
  viz: {
    type: 'flow',
    title: 'Trả giá dịch thuật ở một chỗ — phần còn lại không bị nhiễm nợ của hệ ngoài',
    nodes: ['Hệ ngoài: model khác biệt / kém chất lượng', 'Adapter (SOAP client, file parser)', 'Translator (model ngoài ↔ model của bạn)', '(Facade — interface gọn)', 'Domain sạch'],
    steps: [
      { to: 1, label: 'legacy, đối tác, hoặc một bounded context khác' },
      { to: 2, label: '"G" → Tier.GOLD; "20240115" → LocalDate; string → int' },
      { to: 4, label: 'Member { Tier tier; LocalDate joinedAt; int points; } — ACL = module hoặc service riêng' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Lớp dịch bảo vệ mô hình của mình",
      code:
        "// ACL gồm ba phần: FACADE (interface sạch), ADAPTER (dịch), TRANSLATOR (ánh xạ).\n" +
        "\n" +
        "// 1) INTERFACE SẠCH — domain chỉ biết cái này\n" +
        "package com.example.domain.port.out;\n" +
        "public interface CustomerLookup {\n" +
        "    Optional<Customer> findById(CustomerId id);\n" +
        "}\n" +
        "\n" +
        "// 2) ADAPTER — nơi DUY NHẤT biết về hệ ngoài\n" +
        "package com.example.adapter.out.legacy;\n" +
        "@Component\n" +
        "public class LegacyCustomerAdapter implements CustomerLookup {\n" +
        "    private final LegacySoapClient client;\n" +
        "    private final LegacyCustomerTranslator translator;\n" +
        "\n" +
        "    @Override\n" +
        "    @Retryable(maxAttempts = 3)                    // ACL cũng là nơi đặt\n" +
        "    @CircuitBreaker(name = \"legacy-crm\")           // retry/circuit breaker\n" +
        "    public Optional<Customer> findById(CustomerId id) {\n" +
        "        try {\n" +
        "            LegacyCustDTO dto = client.getCust(id.value());\n" +
        "            if (dto == null || \"9\".equals(dto.getStatCd())) return Optional.empty();\n" +
        "            return Optional.of(translator.toDomain(dto));\n" +
        "        } catch (LegacySoapFault e) {\n" +
        "            throw new CustomerLookupException(e);   // đổi sang exception CỦA TA\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 3) TRANSLATOR — mọi sự kỳ quặc của hệ ngoài bị NHỐT ở đây\n" +
        "@Component\n" +
        "public class LegacyCustomerTranslator {\n" +
        "    public Customer toDomain(LegacyCustDTO dto) {\n" +
        "        return new Customer(\n" +
        "            new CustomerId(dto.getCustNo()),\n" +
        "            new PersonName(dto.getFnm(), dto.getLnm()),\n" +
        "            LocalDate.parse(dto.getRegDt(), DateTimeFormatter.ofPattern(\"yyyyMMdd\")),\n" +
        "            mapTier(dto.getTierCd()),                    // \"01\" -> Tier.GOLD\n" +
        "            \"Y\".equals(dto.getActFlg()));\n" +
        "    }\n" +
        "    private Tier mapTier(String code) {\n" +
        "        return switch (code) {\n" +
        "            case \"01\" -> Tier.GOLD; case \"02\" -> Tier.SILVER; default -> Tier.STANDARD;\n" +
        "        };\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: thay hệ legacy chỉ cần viết adapter mới; test domain bằng\n" +
        "// CustomerLookup giả; và mọi giả định về hệ ngoài nằm ở MỘT chỗ, có test riêng.\n" +
        "// ACL cũng là nơi tự nhiên để đặt CACHE cho hệ ngoài chậm.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-rcg9nu',
  q: 'Làm sao giữ domain layer "thuần" (không phụ thuộc framework)?',
  answer:
    '- **Không annotation framework trong domain**: không `@Entity`, `@Component`, `@JsonProperty` trên domain object (dùng mapping riêng ở tầng infra, hoặc JPA XML mapping, hoặc entity riêng ≠ domain object).\n' +
    '- **Không import** thư viện hạ tầng (JPA, Jackson, Spring, driver DB) trong package domain.\n' +
    '- **Interface (port) do domain định nghĩa**, implementation ở infra.\n' +
    '- Dùng **plain constructor / value object**, không phụ thuộc DI container để tạo domain object.\n' +
    '- **Enforce bằng ArchUnit**: `noClasses().that().resideInAPackage("..domain..").should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "jakarta.persistence..")`.\n\n' +
    'Đánh đổi: cần mapping layer (domain ↔ persistence entity), nhiều code hơn. Đáng khi domain phức tạp và sống lâu.',
  essence:
    'Domain thuần = có thể compile & test domain **không cần** Spring, JPA, hay bất kỳ framework nào. Framework là plugin ở rìa. Giá: một lớp mapping. Lợi: domain dễ test, dễ hiểu, sống sót qua các lần đổi framework.',
  example:
    'Package `com.acme.order.domain`: chỉ `Order`, `OrderLine`, `Money`, `OrderRepository` (interface) — zero import framework. Package `com.acme.order.infrastructure`: `OrderJpaEntity` (có `@Entity`), `OrderJpaRepository implements OrderRepository`, `OrderMapper` (domain ↔ entity). ArchUnit test chặn domain import `jakarta.persistence`.',
  viz: {
    type: 'tree',
    title: 'Domain thuần = compile & test KHÔNG cần Spring, JPA, framework nào',
    root: {
      label: 'Framework là plugin ở rìa. Giá: một lớp mapping',
      children: [
        { label: 'Không annotation framework trong domain', note: 'không @Entity, @Component, @JsonProperty trên domain object' },
        { label: 'Không import thư viện hạ tầng', note: 'JPA, Jackson, Spring, driver DB — trong package domain' },
        { label: 'Interface (port) do domain định nghĩa', note: 'implementation ở infra' },
        { label: 'Plain constructor / value object', note: 'không phụ thuộc DI container để tạo domain object' },
        { label: 'Enforce bằng ArchUnit', note: 'chặn domain dependOn org.springframework / jakarta.persistence' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Domain chỉ import JDK",
      code:
        "// DOMAIN THUẦN — không có annotation của framework nào\n" +
        "package com.example.domain.order;\n" +
        "\n" +
        "import java.time.Instant;                     // CHỈ import JDK\n" +
        "import java.util.List;\n" +
        "\n" +
        "public class Order {\n" +
        "    private final OrderId id;\n" +
        "    private final CustomerId customerId;\n" +
        "    private final List<OrderLine> lines;\n" +
        "    private OrderStatus status;\n" +
        "\n" +
        "    public void confirm() {\n" +
        "        if (status != OrderStatus.NEW)\n" +
        "            throw new OrderCannotBeConfirmedException(id, status);\n" +
        "        this.status = OrderStatus.CONFIRMED;\n" +
        "    }\n" +
        "}\n" +
        "// KHÔNG có: @Entity, @Table, @Component, @JsonProperty, @NotNull\n" +
        "\n" +
        "// ENTITY PERSISTENCE là class RIÊNG ở tầng hạ tầng:\n" +
        "package com.example.adapter.out.persistence;\n" +
        "@Entity\n" +
        "@Table(name = \"orders\")\n" +
        "class OrderEntity {                            // package-private\n" +
        "    @Id private String id;\n" +
        "    @Column private String status;\n" +
        "    @OneToMany(cascade = ALL) private List<OrderLineEntity> lines;\n" +
        "}\n" +
        "\n" +
        "@Component\n" +
        "class OrderPersistenceAdapter implements OrderRepository {\n" +
        "    public void save(Order order) { jpa.save(mapper.toEntity(order)); }\n" +
        "    public Optional<Order> findById(OrderId id) {\n" +
        "        return jpa.findById(id.value()).map(mapper::toDomain);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// THỰC THI BẰNG TEST, không chỉ bằng kỷ luật:\n" +
        "@ArchTest\n" +
        "static final ArchRule domain_thuan =\n" +
        "    noClasses().that().resideInAPackage(\"..domain..\")\n" +
        "        .should().dependOnClassesThat().resideInAnyPackage(\n" +
        "            \"org.springframework..\", \"jakarta.persistence..\",\n" +
        "            \"com.fasterxml.jackson..\", \"jakarta.validation..\");\n" +
        "\n" +
        "// LỢI ÍCH: test domain chạy trong MILI GIÂY (không cần Spring context);\n" +
        "// nâng cấp framework không đụng nghiệp vụ; và domain diễn đạt được\n" +
        "// nghiệp vụ mà không bị cấu trúc bảng chi phối.\n" +
        "\n" +
        "// CÁI GIÁ: phải viết mapping giữa domain và entity. Với domain đơn giản,\n" +
        "// cái giá này KHÔNG đáng — dùng thẳng JPA entity là lựa chọn hợp lý.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-1dqolfg',
  q: 'CQRS như một pattern kiến trúc — tách read và write model?',
  answer:
    'Tách hoàn toàn:\n' +
    '- **Write side (command)**: nhận command → load aggregate → thực thi rule → lưu → phát event. Model chuẩn hoá, enforce invariant.\n' +
    '- **Read side (query)**: một hoặc nhiều **read model** (view) được tối ưu cho từng truy vấn — denormalized, phẳng, đúng shape UI. Cập nhật từ event của write side (projection).\n\n' +
    'Mức độ: từ nhẹ (cùng DB, view/read-only repository riêng) tới nặng (DB riêng cho read, cập nhật async → eventual consistency).\n\n' +
    'Dùng khi: đọc/ghi có yêu cầu rất khác (scale, shape, tần suất); nhiều view khác nhau của cùng dữ liệu; kết hợp event sourcing. KHÔNG cho CRUD đơn giản.',
  essence:
    'CQRS: "một model để đảm bảo tính đúng khi ghi, model khác để trả lời nhanh khi đọc". Chấp nhận hai model (và eventual consistency giữa chúng) để mỗi bên được tối ưu riêng. Chi phí lớn — chỉ khi lợi ích rõ ràng.',
  example:
    'Ngân hàng: write side `Account` aggregate enforce "không âm", ghi từng giao dịch. Read side: `AccountStatementView` (số dư + 50 giao dịch gần nhất, denormalized), `MonthlyReportView` (tổng hợp theo tháng) — cập nhật từ event `MoneyTransferred`. Query statement không đụng aggregate, không tính lại từ event.',
  viz: {
    type: 'flow',
    title: '"Model để đảm bảo tính đúng khi ghi, model khác để trả lời nhanh khi đọc"',
    nodes: ['Command → load aggregate → thực thi rule', 'Lưu + phát event', 'Projection cập nhật read model (nhiều view)', 'Query = SELECT read model (denormalized, đúng shape UI)'],
    steps: [
      { to: 0, label: 'Write side: model chuẩn hoá, enforce invariant' },
      { to: 2, label: 'Mức nhẹ (cùng DB, view riêng) → nặng (DB riêng, async → eventual consistency)' },
      { to: 3, label: 'Chi phí lớn — CHỈ khi đọc/ghi có yêu cầu rất khác. KHÔNG cho CRUD đơn giản' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai mô hình cho hai loại công việc",
      code:
        "// WRITE MODEL — tối ưu cho TÍNH ĐÚNG ĐẮN: chuẩn hoá, có bất biến, có aggregate\n" +
        "@Service\n" +
        "public class OrderCommandService {\n" +
        "    @Transactional\n" +
        "    public OrderId handle(PlaceOrderCommand cmd) {\n" +
        "        Order order = Order.place(cmd.customerId(), cmd.lines());   // domain đầy đủ\n" +
        "        repository.save(order);\n" +
        "        publisher.publish(new OrderPlaced(order.id(), order.total()));\n" +
        "        return order.id();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// READ MODEL — tối ưu cho TRUY VẤN: phi chuẩn hoá, đúng hình dạng màn hình cần\n" +
        "@Service\n" +
        "public class OrderQueryService {\n" +
        "    private final JdbcTemplate jdbc;            // KHÔNG qua domain, KHÔNG qua ORM\n" +
        "\n" +
        "    public List<OrderListItem> search(SearchCriteria c) {\n" +
        "        return jdbc.query(\"\"\"\n" +
        "            SELECT order_id, customer_name, total, status, item_count\n" +
        "            FROM order_list_view\n" +
        "            WHERE status = ? ORDER BY created_at DESC LIMIT ?\n" +
        "            \"\"\", rowMapper, c.status(), c.limit());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// PROJECTION — dựng read model từ event\n" +
        "@Component\n" +
        "public class OrderListProjection {\n" +
        "    @EventListener\n" +
        "    public void on(OrderPlaced e) {\n" +
        "        jdbc.update(\"\"\"\n" +
        "            INSERT INTO order_list_view (order_id, customer_name, total, status)\n" +
        "            VALUES (?,?,?,?) ON CONFLICT (order_id) DO UPDATE SET status = EXCLUDED.status\n" +
        "            \"\"\", e.orderId(), e.customerName(), e.total(), e.status());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// BA MỨC CQRS — không phải cứ CQRS là phải làm mức cao nhất:\n" +
        "//  1) Tách CLASS: command service và query service riêng, CÙNG database.\n" +
        "//     Rẻ, dễ, và đã giải quyết phần lớn vấn đề.\n" +
        "//  2) Tách MODEL: read model là bảng/view phi chuẩn hoá trong cùng DB.\n" +
        "//  3) Tách DATABASE: read model ở kho riêng (Elasticsearch, Redis), đồng\n" +
        "//     bộ qua event -> nhất quán cuối cùng.\n" +
        "\n" +
        "// KHI NÀO DÙNG: tỉ lệ đọc/ghi rất lệch, truy vấn phức tạp, hoặc cần\n" +
        "// truy vấn xuyên nhiều aggregate/service.\n" +
        "// KHI NÀO KHÔNG: CRUD đơn giản -> CQRS chỉ thêm phức tạp và độ trễ.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-spjcgc',
  q: 'Transactional Outbox như một pattern kiến trúc — vị trí và trách nhiệm?',
  answer:
    'Giải quyết **dual write** (ghi DB + publish event không nguyên tử) ở tầng kiến trúc:\n\n' +
    '- Trong use case (`@Transactional`): ghi aggregate + ghi bản ghi event vào **bảng `outbox`** (cùng transaction, cùng DB).\n' +
    '- Một **relay** (tách biệt): đọc `outbox` (polling hoặc CDC) → publish lên message broker → đánh dấu đã gửi.\n' +
    '- Consumer phía nhận: **idempotent** (inbox / dedup) vì relay là at-least-once.\n\n' +
    'Vị trí: outbox thuộc tầng infrastructure của service; relay có thể là background job trong service hoặc Debezium connector riêng.',
  essence:
    'Outbox biến "2 write vào 2 hệ thống" thành "1 write nguyên tử vào DB (gồm cả event) + 1 relay đáng tin". Là mảnh ghép nền tảng cho mọi kiến trúc event-driven cần đảm bảo "state đổi ⟺ event được phát".',
  example:
    '`PlaceOrderUseCase`: `@Transactional` { `orderRepo.save(order)`; `outboxRepo.save(OutboxMessage.from(order.domainEvents()))` }. Debezium theo dõi bảng `outbox` của service → mỗi INSERT publish lên Kafka topic tương ứng. Order lưu được ⟺ event `OrderPlaced` chắc chắn sẽ ra broker.',
  viz: {
    type: 'tree',
    title: '"1 write nguyên tử vào DB (gồm cả event) + 1 relay đáng tin"',
    root: {
      label: 'Biến "2 write vào 2 hệ thống" thành đảm bảo "state đổi ⟺ event được phát"',
      children: [
        { label: 'Trong use case (@Transactional)', note: 'ghi aggregate + ghi bản ghi event vào bảng outbox (cùng transaction, cùng DB)' },
        { label: 'Relay (tách biệt)', note: 'đọc outbox (polling / CDC) → publish lên broker → đánh dấu đã gửi' },
        { label: 'Consumer phía nhận', note: 'idempotent (inbox / dedup) vì relay là at-least-once' },
        { label: 'Vị trí', note: 'outbox = infra của service; relay = background job hoặc Debezium connector riêng' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ranh giới giữa \"ghi dữ liệu\" và \"báo cho thế giới\"",
      code:
        "// VỊ TRÍ: outbox nằm ở TẦNG HẠ TẦNG, nhưng được kích hoạt bởi DOMAIN EVENT.\n" +
        "// Domain KHÔNG biết gì về Kafka hay về bảng outbox.\n" +
        "\n" +
        "// 1) DOMAIN phát event (thuần)\n" +
        "public class Order extends AggregateRoot {\n" +
        "    public static Order place(...) {\n" +
        "        Order o = new Order(...);\n" +
        "        o.registerEvent(new OrderPlaced(o.id, o.total));   // domain event\n" +
        "        return o;\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 2) APPLICATION lưu aggregate và event trong CÙNG transaction\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    @Transactional\n" +
        "    public OrderId place(PlaceOrderCommand cmd) {\n" +
        "        Order order = Order.place(cmd.customerId(), cmd.lines());\n" +
        "        orderRepository.save(order);\n" +
        "        order.pullEvents().forEach(outboxPort::append);    // PORT, không phải Kafka\n" +
        "        return order.id();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 3) HẠ TẦNG cài đặt outbox port\n" +
        "@Component\n" +
        "public class JdbcOutboxAdapter implements OutboxPort {\n" +
        "    public void append(DomainEvent e) {\n" +
        "        jdbc.update(\"\"\"\n" +
        "            INSERT INTO outbox (id, aggregate_type, aggregate_id, event_type, payload)\n" +
        "            VALUES (?,?,?,?,?::jsonb)\n" +
        "            \"\"\", UUID.randomUUID(), e.aggregateType(), e.aggregateId(),\n" +
        "                 e.getClass().getSimpleName(), toJson(e));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 4) RELAY — tiến trình riêng, KHÔNG nằm trong luồng nghiệp vụ\n" +
        "@Component\n" +
        "public class OutboxRelay {\n" +
        "    @Scheduled(fixedDelay = 500)\n" +
        "    @Transactional\n" +
        "    public void publish() {\n" +
        "        outboxRepo.fetchUnpublished(100).forEach(e -> {\n" +
        "            kafka.send(topicFor(e), e.aggregateId(), e.payload());\n" +
        "            outboxRepo.markPublished(e.id());\n" +
        "        });\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// TRÁCH NHIỆM RÕ RÀNG:\n" +
        "//  Domain      — biết CHUYỆN GÌ đã xảy ra\n" +
        "//  Application — đảm bảo dữ liệu và event cùng nguyên tử\n" +
        "//  Infrastructure — biết event đi ĐÂU và bằng CÁCH NÀO\n" +
        "// -> Đổi từ Kafka sang RabbitMQ chỉ đụng vào relay.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-ykai1x',
  q: 'CQRS: rebuild read model / versioning projection khi logic thay đổi?',
  answer:
    'Read model được dựng từ event bằng **projection** (handler cập nhật view khi có event). Khi bạn phát hiện bug projection, hoặc cần thêm cột/view mới:\n\n' +
    '- **Replay**: xoá read model, chạy lại projection từ đầu stream event → dựng lại đúng. Điều kiện: event phải được **lưu giữ** (event store, hoặc Kafka retention/compaction đủ dài).\n' +
    '- **Blue-green projection**: dựng read model mới (version 2) song song bằng replay, khi bắt kịp thì chuyển query sang v2, xoá v1. Không downtime.\n' +
    '- **Projection phải idempotent** (xử lý lại event không nhân đôi) — thường lưu "đã xử lý tới offset/event nào".',
  essence:
    'Giá trị lớn của CQRS + event: read model là "phái sinh" — có bug hay cần đổi, **xoá và dựng lại từ event**. Điều kiện tiên quyết: event được giữ lại và projection idempotent.',
  example:
    'Read model `OrderSummary` tính sai `discountTotal` do bug. Sửa code projection → dựng bảng `order_summary_v2` bằng replay toàn bộ topic `orders` từ đầu (2 giờ). Khi v2 bắt kịp realtime → đổi query sang v2, drop v1. Người dùng không thấy gián đoạn.',
  viz: {
    type: 'flow',
    title: 'Read model là "phái sinh" — có bug hay cần đổi, xoá và dựng lại từ event',
    nodes: ['Bug projection / cần view mới', 'Sửa code projection', 'Dựng read model v2 song song bằng replay từ đầu stream', 'v2 bắt kịp realtime → chuyển query sang v2, drop v1'],
    steps: [
      { to: 2, label: 'Điều kiện: event được LƯU GIỮ (event store / Kafka retention đủ dài)' },
      { to: 3, label: 'Blue-green projection — không downtime' },
      { to: 3, label: 'Projection phải idempotent (lưu "đã xử lý tới offset nào")' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Dựng lại read model từ đầu",
      code:
        "// Sức mạnh lớn nhất của CQRS + event: read model có thể XOÁ VÀ DỰNG LẠI\n" +
        "// bất cứ lúc nào từ nguồn sự thật.\n" +
        "@Component\n" +
        "public class ProjectionRebuilder {\n" +
        "\n" +
        "    public void rebuild(String projectionName, Instant from) {\n" +
        "        // 1) Tạo bảng read model MỚI (không đụng bảng đang phục vụ)\n" +
        "        jdbc.execute(\"CREATE TABLE order_list_view_v2 (LIKE order_list_view)\");\n" +
        "\n" +
        "        // 2) Phát lại toàn bộ event vào projection mới\n" +
        "        eventStore.streamFrom(from).forEach(e -> projection.applyTo(\"v2\", e));\n" +
        "\n" +
        "        // 3) Đổi tên nguyên tử — không có downtime\n" +
        "        jdbc.execute(\"\"\"\n" +
        "            BEGIN;\n" +
        "            ALTER TABLE order_list_view RENAME TO order_list_view_old;\n" +
        "            ALTER TABLE order_list_view_v2 RENAME TO order_list_view;\n" +
        "            COMMIT;\n" +
        "            \"\"\");\n" +
        "        // 4) Xoá bảng cũ sau khi đã chắc chắn\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// VERSIONING PROJECTION — chạy SONG SONG hai phiên bản trong lúc chuyển:\n" +
        "@Component\n" +
        "public class OrderListProjection {\n" +
        "    @EventListener\n" +
        "    public void on(OrderPlaced e) {\n" +
        "        applyV1(e);         // phiên bản đang phục vụ\n" +
        "        applyV2(e);         // phiên bản mới, đang dựng\n" +
        "    }\n" +
        "}\n" +
        "// Khi v2 đã bắt kịp và được kiểm chứng -> chuyển truy vấn sang v2, bỏ v1.\n" +
        "\n" +
        "// THEO DÕI TIẾN ĐỘ — bắt buộc, vì rebuild có thể mất hàng giờ:\n" +
        "CREATE TABLE projection_checkpoint (\n" +
        "  name TEXT PRIMARY KEY, last_event_id BIGINT, updated_at TIMESTAMPTZ\n" +
        ");\n" +
        "// Checkpoint cho phép tiếp tục từ chỗ dở nếu tiến trình chết.\n" +
        "\n" +
        "// BA ĐIỀU KIỆN để rebuild được:\n" +
        "//  1) EVENT phải được LƯU BỀN và đọc lại được theo thứ tự\n" +
        "//  2) PROJECTION phải IDEMPOTENT (dùng upsert, không dùng insert thuần)\n" +
        "//  3) event phải mang ĐỦ dữ liệu (event-carried state transfer), không\n" +
        "//     chỉ mang id — vì gọi ngược lại service khác lúc rebuild là không khả thi",
    },
  ],
},
{
  cat: 'DDD',
  id: 'design-patterns-1o8ufrs',
  q: 'Có nên tách domain model khỏi persistence model (JPA entity) không?',
  answer:
    '**Gộp** (domain object = JPA entity, có `@Entity` trên aggregate):\n' +
    '- Ít code (không mapping layer).\n' +
    '- Nhược: domain dính JPA (annotation, lazy loading, no-arg constructor, hạn chế về immutability/value object); schema và domain model bị ép khớp; khó test không JPA.\n\n' +
    '**Tách** (domain object thuần + `XxxJpaEntity` riêng + mapper):\n' +
    '- Domain sạch: immutable, value object, không import framework, test không cần DB.\n' +
    '- Nhược: mapping layer (thủ công hoặc MapStruct), hai class song song.\n\n' +
    'Chọn: domain đơn giản/CRUD → gộp (thực dụng). Domain phức tạp, nhiều invariant, sống lâu, làm DDD nghiêm túc → tách.',
  essence:
    'Đây là đánh đổi "thực dụng vs thuần khiết". Gộp: nhanh, đủ cho phần lớn app. Tách: domain model tự do tiến hoá độc lập với schema và framework, đáng giá khi domain là tài sản cốt lõi và phức tạp.',
  example:
    'CRUD admin panel: entity JPA làm luôn domain object — không cần tách. Core banking domain (`Account` với hàng chục quy tắc, `Money` VO, event sourcing một phần): tách `Account` (thuần) khỏi `AccountRow`/`AccountEventEntity`, mapper ở tầng infra.',
  viz: {
    type: 'compare',
    corner: 'Đánh đổi "thực dụng vs thuần khiết"',
    cols: ['Gộp (domain = JPA entity)', 'Tách (domain thuần + mapper)'],
    rows: [
      ['Code', 'ít — không mapping layer', 'hai class song song + mapper (MapStruct)'],
      ['Domain dính JPA?', 'có (annotation, lazy loading, no-arg constructor, hạn chế immutability)', 'không import framework'],
      ['Schema ↔ domain', 'bị ép khớp', 'tiến hoá độc lập'],
      ['Test không JPA', 'khó', 'được'],
      ['Chọn khi', 'domain đơn giản / CRUD', 'domain phức tạp, nhiều invariant, sống lâu, DDD nghiêm túc'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Câu trả lời phụ thuộc độ phức tạp nghiệp vụ",
      code:
        "// KHÔNG TÁCH — dùng thẳng JPA entity làm domain model\n" +
        "@Entity\n" +
        "@Table(name = \"orders\")\n" +
        "public class Order {\n" +
        "    @Id private String id;\n" +
        "    @Enumerated(STRING) private OrderStatus status;\n" +
        "    @OneToMany(mappedBy = \"order\", cascade = ALL) private List<OrderLine> lines;\n" +
        "\n" +
        "    public void confirm() {                       // vẫn có hành vi nghiệp vụ\n" +
        "        if (status != NEW) throw new IllegalStateException();\n" +
        "        this.status = CONFIRMED;\n" +
        "    }\n" +
        "}\n" +
        "// + ÍT CODE, không mapping, năng suất cao\n" +
        "// + Hibernate lo dirty checking, lazy loading\n" +
        "// - JPA ÁP ĐẶT ràng buộc lên thiết kế domain:\n" +
        "//     cần constructor không tham số, không dùng được final field,\n" +
        "//     khó dùng value object, quan hệ bị dẫn dắt bởi khoá ngoại\n" +
        "// - lazy proxy rò rỉ ra ngoài -> LazyInitializationException ở tầng web\n" +
        "// - domain test phải có JPA\n" +
        "\n" +
        "// TÁCH — hai model riêng\n" +
        "public class Order { }                     // domain THUẦN, không annotation\n" +
        "@Entity class OrderEntity { }              // persistence, package-private\n" +
        "// + domain hoàn toàn tự do và test được trong mili giây\n" +
        "// + đổi lược đồ database không ảnh hưởng domain\n" +
        "// - PHẢI VIẾT MAPPING hai chiều, và mapping quan hệ phức tạp rất tốn công\n" +
        "// - mất dirty checking -> phải tự quản lý cái gì đã đổi\n" +
        "\n" +
        "// QUYẾT ĐỊNH THEO ĐỘ PHỨC TẠP:\n" +
        "//  CRUD, ít quy tắc          -> KHÔNG tách. Tách là over-engineering.\n" +
        "//  Domain phức tạp, nhiều bất biến, nhiều value object -> TÁCH.\n" +
        "//  Đang phân vân             -> bắt đầu KHÔNG tách, tách sau khi thấy đau.\n" +
        "\n" +
        "// GIẢI PHÁP TRUNG DUNG rất thực dụng: giữ JPA entity nhưng ĐẶT HÀNH VI\n" +
        "// vào nó (không anemic), giấu setter, và không để entity rò ra ngoài\n" +
        "// tầng service (luôn trả về DTO).",
    },
  ],
},
{
  cat: 'Kiến trúc',
  id: 'design-patterns-1851f7g',
  q: 'Saga như một pattern kiến trúc — orchestration vs choreography saga?',
  answer:
    'Saga điều phối một transaction nghiệp vụ xuyên nhiều aggregate/service bằng chuỗi local transaction + compensation.\n\n' +
    '- **Choreography saga**: không có điều phối viên. Mỗi service nghe event, làm phần của mình, phát event tiếp. Luồng "nổi lên". Ít hạ tầng; khó nhìn tổng thể, dễ có phụ thuộc chu trình.\n' +
    '- **Orchestration saga**: một **saga orchestrator** (state machine, thường persistent) gọi từng bước, nhận kết quả, quyết định bước tiếp hoặc compensation. Luồng tường minh ở một chỗ; dễ quan sát/sửa; thêm một thành phần (dùng Temporal, Camunda, hoặc tự viết).',
  essence:
    'Saga = "transaction dài với các bước bù trừ" thay cho ACID xuyên service. Choreography cho quy trình ngắn, tách rời; orchestration cho quy trình dài, nhiều bước, cần theo dõi trạng thái (nhất là liên quan tiền bạc).',
  example:
    'Đặt tour (orchestration): `TourBookingSaga` state machine — `reserveFlight` → `reserveHotel` → `chargePayment`. `chargePayment` fail → saga chạy `cancelHotel`, `cancelFlight`, kết thúc FAILED. Orchestrator lưu trạng thái saga trong DB → crash giữa chừng thì resume được.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Choreography saga', 'Orchestration saga'],
    rows: [
      ['Điều phối viên', 'không — mỗi service nghe event, làm phần mình, phát event tiếp', 'saga orchestrator (state machine, thường persistent)'],
      ['Luồng', '"nổi lên" — khó nhìn tổng thể, dễ phụ thuộc chu trình', 'tường minh ở một chỗ; dễ quan sát/sửa'],
      ['Hạ tầng', 'ít', 'thêm một thành phần (Temporal, Camunda)'],
      ['Hợp với', 'quy trình ngắn, tách rời', 'quy trình dài, nhiều bước, theo dõi trạng thái (tiền bạc)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Giao dịch dài, nhiều service, có bù trừ",
      code:
        "// ORCHESTRATION SAGA — một orchestrator giữ toàn bộ luồng và trạng thái\n" +
        "@Service\n" +
        "public class OrderSagaOrchestrator {\n" +
        "    @Transactional\n" +
        "    public void start(OrderId orderId) {\n" +
        "        SagaState saga = sagaRepo.create(orderId, State.STARTED);   // LƯU BỀN\n" +
        "        commandBus.send(new ReservePaymentCommand(orderId, saga.id()));\n" +
        "    }\n" +
        "\n" +
        "    @EventListener\n" +
        "    public void on(PaymentReserved e) {\n" +
        "        sagaRepo.advance(e.sagaId(), Step.PAYMENT_DONE);\n" +
        "        commandBus.send(new ReserveInventoryCommand(e.orderId(), e.sagaId()));\n" +
        "    }\n" +
        "\n" +
        "    @EventListener\n" +
        "    public void on(InventoryReservationFailed e) {\n" +
        "        sagaRepo.advance(e.sagaId(), Step.COMPENSATING);\n" +
        "        commandBus.send(new RefundPaymentCommand(e.orderId()));   // BÙ TRỪ\n" +
        "    }\n" +
        "\n" +
        "    @Scheduled(fixedDelay = 60_000)\n" +
        "    public void handleTimeouts() {                    // saga treo -> xử lý\n" +
        "        sagaRepo.findStuck(Duration.ofMinutes(10)).forEach(this::compensate);\n" +
        "    }\n" +
        "}\n" +
        "// + nhìn thấy TOÀN BỘ luồng ở một chỗ, biết saga đang ở bước nào\n" +
        "// + xử lý timeout và bù trừ tập trung\n" +
        "// - orchestrator là phụ thuộc chung; cần lưu trạng thái bền\n" +
        "\n" +
        "// CHOREOGRAPHY SAGA — không có nhạc trưởng, mỗi service nghe và phản ứng\n" +
        "@KafkaListener(topics = \"order-placed\")\n" +
        "public class PaymentService {\n" +
        "    public void on(OrderPlaced e) {\n" +
        "        try { charge(e); publish(new PaymentSucceeded(e.orderId())); }\n" +
        "        catch (Exception ex) { publish(new PaymentFailed(e.orderId())); }\n" +
        "    }\n" +
        "}\n" +
        "@KafkaListener(topics = \"payment-failed\")\n" +
        "public class OrderService {\n" +
        "    public void on(PaymentFailed e) { cancel(e.orderId()); }      // bù trừ\n" +
        "}\n" +
        "// + tách rời tối đa, không có điểm nghẽn\n" +
        "// - luồng RẢI RÁC, khó trả lời \"đơn này đang ở đâu\"; dễ tạo vòng lặp event\n" +
        "\n" +
        "// BA ĐIỀU BẮT BUỘC CHO CẢ HAI:\n" +
        "//  1) mỗi bước phải IDEMPOTENT (message sẽ tới nhiều lần)\n" +
        "//  2) mỗi bước phải có HÀNH ĐỘNG BÙ TRỪ, và bù trừ cũng phải idempotent\n" +
        "//  3) trạng thái saga phải LƯU BỀN để tiếp tục được sau khi tiến trình chết\n" +
        "// Và: bù trừ KHÔNG phải rollback — tiền đã trừ rồi hoàn lại là HAI giao\n" +
        "// dịch trong sổ sách. Nghiệp vụ phải chấp nhận điều đó.",
    },
  ],
},
]);
