SS.addQuestions('design-patterns', [
{
  cat: 'Enterprise',
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
},
{
  cat: 'Enterprise',
  q: 'Repository vs DAO — khác nhau thế nào?',
  answer:
    '- **DAO (Data Access Object)**: gần với **bảng/nguồn dữ liệu**. Method theo thao tác dữ liệu: `insert`, `update`, `delete`, `selectById`, `selectAll`. Thường trả về row/record/DTO. Tư duy data-centric.\n' +
    '- **Repository**: gần với **domain**. Method theo ngôn ngữ nghiệp vụ: `findActiveSubscriptions`, `save(order)`. Trả về **aggregate** đầy đủ hành vi. Che giấu cả việc "có thể là nhiều bảng". Tư duy domain-centric.\n\n' +
    'Repository thường **dùng** DAO/ORM bên dưới. Một aggregate có thể map sang nhiều bảng — repository lo việc ghép; DAO thì một-DAO-một-bảng.',
  essence:
    'DAO nói ngôn ngữ của database ("row của bảng orders"). Repository nói ngôn ngữ của domain ("đơn hàng của khách hàng X"). Repository là DAO + ngữ nghĩa domain + biên giới aggregate.',
  example:
    'DAO: `orderDao.selectById(5)` → `OrderRow`; `orderItemDao.selectByOrderId(5)` → `List<OrderItemRow>`; service tự ghép. Repository: `orderRepository.findById(new OrderId(5))` → `Order` đầy đủ (gồm items, đã dựng thành aggregate) với method `order.cancel()`.',
},
{
  cat: 'Enterprise',
  q: 'Unit of Work pattern là gì?',
  answer:
    'Theo dõi mọi object bị **thay đổi** trong một transaction nghiệp vụ (new/dirty/removed), rồi **flush** tất cả xuống DB trong **một transaction** khi commit — thay vì mỗi thay đổi ghi ngay.\n\n' +
    'Lợi ích: một transaction DB duy nhất; giảm số lần gọi DB (batch); giải quyết thứ tự ghi (insert parent trước child); tránh ghi trùng.\n\n' +
    'JPA/Hibernate **Persistence Context** chính là Unit of Work: bạn `find`/`persist`/sửa entity, Hibernate theo dõi (dirty checking), flush khi commit.',
  essence:
    'Unit of Work = "gom mọi thay đổi của một use case, ghi một lần". Bạn (hoặc ORM) không ghi từng thay đổi ngay mà tích luỹ và commit nguyên tử. EntityManager/DbContext là hiện thân của pattern này.',
  example:
    '`@Transactional void processOrder() { Order o = repo.findById(id); o.markPaid(); Customer c = custRepo.findById(o.customerId()); c.addLoyaltyPoints(10); }` — không có `save()` nào. Hibernate (UoW) theo dõi `o` và `c` dirty, khi method kết thúc → một transaction, hai UPDATE, đúng thứ tự.',
},
{
  cat: 'Enterprise',
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
},
{
  cat: 'DDD',
  q: 'Value Object là gì? Khác Entity thế nào?',
  answer:
    '- **Entity**: có **định danh** (id) xuyên suốt vòng đời; hai entity "bằng nhau" nếu **cùng id** dù thuộc tính khác. Có thể thay đổi (mutable). Ví dụ: `Customer`, `Order`.\n' +
    '- **Value Object**: **không có định danh**; được định nghĩa **hoàn toàn bởi giá trị các thuộc tính**; hai VO bằng nhau nếu **mọi thuộc tính bằng nhau**. Nên **bất biến** (immutable). Ví dụ: `Money`, `Address`, `DateRange`, `Email`, `Coordinate`.\n\n' +
    'VO giải quyết **Primitive Obsession**: thay `String email`, `BigDecimal amount + String currency` bằng type `Email`, `Money` — mang theo validation + hành vi (`money.plus(other)`, `range.overlaps(other)`).',
  essence:
    'Entity = "cái này là ai" (định danh quan trọng). Value Object = "cái này là bao nhiêu / cái gì" (giá trị quan trọng, danh tính không). VO bất biến, tự validate, mang hành vi liên quan → code an toàn và biểu cảm hơn primitive.',
  example:
    '`Order` (entity, id=5) có `Money total` và `Address shippingAddress` (value objects). `new Money(100, "USD").plus(new Money(50, "USD"))` = `Money(150, USD)`; cộng khác currency → throw. `Email.of("bad")` → throw ngay lúc tạo, không phải lúc dùng.',
},
{
  cat: 'DDD',
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
},
{
  cat: 'DDD',
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
},
{
  cat: 'Enterprise',
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
},
{
  cat: 'Kiến trúc',
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
},
{
  cat: 'Kiến trúc',
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
},
{
  cat: 'Kiến trúc',
  q: 'Layered architecture truyền thống vs Hexagonal — khác biệt cốt lõi?',
  answer:
    '**Layered (N-tier)**: `Presentation → Application → Domain → Infrastructure`, phụ thuộc **từ trên xuống**. Vấn đề: **Domain phụ thuộc Infrastructure** (repository implementation, ORM) → domain dính công nghệ; đổi DB ảnh hưởng domain; test domain cần DB.\n\n' +
    '**Hexagonal**: Domain ở **trung tâm**, Infrastructure ở **rìa** và **phụ thuộc ngược vào** Domain (qua port). Domain định nghĩa `interface Repository`; Infrastructure implements. Domain hoàn toàn thuần.\n\n' +
    'Điểm khác: hướng phụ thuộc giữa Domain và Infrastructure bị **đảo** (DIP).',
  essence:
    'Layered để domain phụ thuộc infra (xuống dưới) → domain bị nhiễm công nghệ. Hexagonal đảo hướng đó: infra phụ thuộc domain → domain sạch, testable, framework-independent. Cùng số "tầng", khác hướng mũi tên ở chỗ quan trọng nhất.',
  example:
    'Layered: `OrderService` (domain) `import com.acme.persistence.OrderRepositoryImpl` hoặc ít nhất biết về JPA. Hexagonal: `OrderService` chỉ biết `OrderRepository` (interface trong package domain); `OrderRepositoryImpl` ở package infrastructure `import` ngược lên domain.',
},
{
  cat: 'Enterprise',
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
},
{
  cat: 'Enterprise',
  q: 'Active Record vs Data Mapper?',
  answer:
    '- **Active Record**: object **vừa mang dữ liệu vừa biết cách tự lưu**: `user.save()`, `User.find(1)`, `user.delete()`. Object khớp 1-1 với row bảng. Đơn giản, ít code, tốt cho CRUD. Nhược: domain object coupling với DB; khó test; khó tách domain model khỏi schema; logic persistence lẫn logic nghiệp vụ. (Rails ActiveRecord, Eloquent).\n\n' +
    '- **Data Mapper**: một **mapper riêng** chuyển đổi giữa domain object (thuần, không biết DB) và database. Domain object không có method persistence. Phức tạp hơn nhưng domain sạch, testable, model độc lập schema. (Hibernate/JPA, Doctrine).',
  essence:
    'Active Record: object tự lo persistence (nhanh, đơn giản, coupling). Data Mapper: tách persistence ra mapper (domain thuần, phù hợp domain phức tạp/DDD). Chọn theo độ phức tạp domain: CRUD app → Active Record; rich domain → Data Mapper.',
  example:
    'Active Record: `$order = Order::find(5); $order->status = "PAID"; $order->save();`. Data Mapper (JPA): `Order order = em.find(Order.class, 5); order.markPaid();` — `Order` không có `save()`; `EntityManager` (mapper) theo dõi và flush. `Order` không import gì về DB.',
},
{
  cat: 'Enterprise',
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
},
{
  cat: 'Kiến trúc',
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
},
{
  cat: 'Kiến trúc',
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
},
{
  cat: 'Kiến trúc',
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
},
{
  cat: 'Kiến trúc',
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
},
{
  cat: 'DDD',
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
},
{
  cat: 'Kiến trúc',
  q: 'Saga như một pattern kiến trúc — orchestration vs choreography saga?',
  answer:
    'Saga điều phối một transaction nghiệp vụ xuyên nhiều aggregate/service bằng chuỗi local transaction + compensation.\n\n' +
    '- **Choreography saga**: không có điều phối viên. Mỗi service nghe event, làm phần của mình, phát event tiếp. Luồng "nổi lên". Ít hạ tầng; khó nhìn tổng thể, dễ có phụ thuộc chu trình.\n' +
    '- **Orchestration saga**: một **saga orchestrator** (state machine, thường persistent) gọi từng bước, nhận kết quả, quyết định bước tiếp hoặc compensation. Luồng tường minh ở một chỗ; dễ quan sát/sửa; thêm một thành phần (dùng Temporal, Camunda, hoặc tự viết).',
  essence:
    'Saga = "transaction dài với các bước bù trừ" thay cho ACID xuyên service. Choreography cho quy trình ngắn, tách rời; orchestration cho quy trình dài, nhiều bước, cần theo dõi trạng thái (nhất là liên quan tiền bạc).',
  example:
    'Đặt tour (orchestration): `TourBookingSaga` state machine — `reserveFlight` → `reserveHotel` → `chargePayment`. `chargePayment` fail → saga chạy `cancelHotel`, `cancelFlight`, kết thúc FAILED. Orchestrator lưu trạng thái saga trong DB → crash giữa chừng thì resume được.',
},
]);
