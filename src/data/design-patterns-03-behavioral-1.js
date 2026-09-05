SS.addQuestions('design-patterns', [
{
  cat: 'Behavioral',
  q: 'Strategy pattern — vấn đề và cấu trúc?',
  answer:
    'Định nghĩa một **họ thuật toán**, đóng gói mỗi cái thành class riêng, cho phép **thay đổi thuật toán độc lập** với client dùng nó.\n\n' +
    '```\ninterface ShippingStrategy { Money cost(Order o); }\nclass StandardShipping implements ShippingStrategy { ... }\nclass ExpressShipping implements ShippingStrategy { ... }\nclass Checkout {\n  private ShippingStrategy strategy;\n  Money total(Order o) { return o.subtotal().plus(strategy.cost(o)); }\n}\n```\n\n' +
    'Dùng khi: có nhiều cách làm một việc, chọn lúc runtime; muốn loại bỏ `if/else`/`switch` lớn phân nhánh theo loại; muốn test từng thuật toán riêng.',
  essence:
    'Strategy = "cắm thuật toán từ ngoài vào". Nó biến `if type == A ... else if type == B ...` thành "chọn strategy phù hợp và gọi nó". Nền tảng của Open-Closed: thêm thuật toán mới = thêm class, không sửa client.',
  example:
    'Nén file: `Compressor` giữ một `CompressionStrategy` (`Zip`, `Gzip`, `Lz4`). `compressor.compress(file)` gọi strategy hiện tại. Thêm `ZstdStrategy` không đụng `Compressor`. `Comparator` trong Java chính là Strategy cho việc so sánh.',
  viz: {
    type: 'flow',
    title: '"Cắm thuật toán từ ngoài vào" — nền tảng của Open-Closed',
    nodes: ['Client (Checkout) giữ một ShippingStrategy', 'gọi strategy.cost(order)', 'Đổi strategy runtime / chọn theo context', 'Thêm thuật toán mới = thêm class'],
    steps: [
      { to: 1, label: 'Biến if type==A ... else if type==B ... thành "chọn strategy và gọi nó"' },
      { to: 2, label: 'StandardShipping, ExpressShipping — mỗi cái một class, test riêng' },
      { to: 3, label: 'Không sửa client. Comparator trong Java chính là Strategy' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Đóng gói thuật toán, hoán đổi lúc chạy",
      code:
        "// VẤN ĐỀ: cùng một việc, nhiều cách làm, và cách làm được chọn lúc chạy.\n" +
        "public interface ShippingCostCalculator {\n" +
        "    Money calculate(Order order);\n" +
        "}\n" +
        "\n" +
        "@Component(\"standard\")\n" +
        "public class StandardShipping implements ShippingCostCalculator {\n" +
        "    public Money calculate(Order o) { return Money.vnd(30_000); }\n" +
        "}\n" +
        "@Component(\"express\")\n" +
        "public class ExpressShipping implements ShippingCostCalculator {\n" +
        "    public Money calculate(Order o) { return Money.vnd(30_000 + o.weightKg() * 5_000); }\n" +
        "}\n" +
        "@Component(\"free\")\n" +
        "public class FreeShipping implements ShippingCostCalculator {\n" +
        "    public Money calculate(Order o) { return Money.ZERO; }\n" +
        "}\n" +
        "\n" +
        "// CONTEXT — không biết gì về các cài đặt cụ thể\n" +
        "@Service\n" +
        "public class ShippingService {\n" +
        "    private final Map<String, ShippingCostCalculator> strategies;   // Spring tiêm HẾT\n" +
        "\n" +
        "    public Money cost(Order o, String method) {\n" +
        "        var s = strategies.get(method);\n" +
        "        if (s == null) throw new IllegalArgumentException(\"phương thức lạ: \" + method);\n" +
        "        return s.calculate(o);\n" +
        "    }\n" +
        "}\n" +
        "// -> Thêm phương thức giao hàng mới = thêm MỘT @Component. KHÔNG sửa\n" +
        "//    dòng nào ở ShippingService (đúng Open/Closed Principle).\n" +
        "\n" +
        "// VỚI LOGIC ĐƠN GIẢN, lambda là đủ — không cần cả hệ thống class:\n" +
        "Map<String, Function<Order, Money>> strategies = Map.of(\n" +
        "    \"standard\", o -> Money.vnd(30_000),\n" +
        "    \"free\",     o -> Money.ZERO);\n" +
        "\n" +
        "// KHI NÀO DÙNG CLASS thay vì lambda: thuật toán có state, cần test riêng,\n" +
        "// cần tiêm phụ thuộc, hoặc dài hơn vài dòng.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Strategy vs chuỗi if/else / switch — khi nào đáng tách?',
  answer:
    'Không phải mọi `switch` đều cần Strategy. Đáng tách khi:\n' +
    '- Mỗi nhánh **phức tạp** (nhiều dòng, có state riêng, phụ thuộc riêng).\n' +
    '- Danh sách nhánh **hay thay đổi/mở rộng** (thêm loại → không muốn sửa file cũ).\n' +
    '- Cần **test từng nhánh riêng**.\n' +
    '- Cùng một `switch` bị **lặp ở nhiều nơi**.\n\n' +
    'KHÔNG tách khi: 2–3 nhánh đơn giản, ổn định, chỉ xuất hiện một chỗ → `switch` (hoặc `Map<Enum, Function>`) rõ ràng hơn và ít file hơn.\n\n' +
    'Trong Java hiện đại: `Map<Type, Function>` hoặc enum có abstract method thường đủ, nhẹ hơn Strategy đầy đủ.',
  essence:
    'Strategy trả tiền bằng số class + gián tiếp; nó "mua" khả năng mở rộng không sửa code cũ và test cô lập. Với logic đơn giản, ổn định, một chỗ → `switch` thắng. Đo bằng "nhánh này có thay đổi/lặp/phức tạp không?".',
  example:
    'Tính phí theo `PlanType` (FREE/PRO/ENTERPRISE), mỗi loại là công thức nhiều bước + tra bảng giá riêng + hay thêm plan mới → Strategy (hoặc enum với abstract `calculateFee()`). Ngược lại, `switch(status) { case ACTIVE -> "green"; ... }` — giữ nguyên switch.',
  viz: {
    type: 'compare',
    corner: 'Tình huống',
    cols: ['Strategy (class / enum abstract method)', 'switch / Map<Enum, Function>'],
    rows: [
      ['Mỗi nhánh phức tạp (state, phụ thuộc riêng)', 'đáng tách', 'không phù hợp'],
      ['Danh sách nhánh hay thay đổi/mở rộng', 'thêm class, không sửa file cũ', 'sửa file mỗi lần'],
      ['Cần test từng nhánh riêng', 'dễ', 'khó'],
      ['2–3 nhánh đơn giản, ổn định, một chỗ', 'quá nặng', 'rõ ràng hơn, ít file'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Không phải mọi switch đều cần thành Strategy",
      code:
        "// SWITCH VẪN TỐT khi: ít nhánh, logic NGẮN, ổn định, và nằm ở MỘT chỗ\n" +
        "public Money shippingCost(Order o, ShippingMethod m) {\n" +
        "    return switch (m) {\n" +
        "        case STANDARD -> Money.vnd(30_000);\n" +
        "        case EXPRESS  -> Money.vnd(50_000);\n" +
        "        case FREE     -> Money.ZERO;\n" +
        "    };\n" +
        "}\n" +
        "// Với sealed/enum, compiler còn ĐẢM BẢO bạn xử lý hết mọi nhánh —\n" +
        "// điều mà Strategy KHÔNG cho bạn.\n" +
        "\n" +
        "// TÁCH THÀNH STRATEGY khi có ÍT NHẤT MỘT dấu hiệu:\n" +
        "// 1) mỗi nhánh dài hơn ~10 dòng, hoặc có logic con phức tạp\n" +
        "// 2) CÙNG một switch xuất hiện ở NHIỀU chỗ trong code\n" +
        "//    (tính phí ở chỗ này, hiển thị nhãn ở chỗ kia, validate ở chỗ khác)\n" +
        "// 3) mỗi nhánh cần PHỤ THUỘC KHÁC NHAU (gọi service khác nhau)\n" +
        "public class ExpressShipping implements ShippingCostCalculator {\n" +
        "    private final DistanceService distances;      // chỉ nhánh này cần\n" +
        "    private final WeatherService weather;\n" +
        "}\n" +
        "// 4) thêm nhánh mới là chuyện THƯỜNG XUYÊN\n" +
        "// 5) cần test từng nhánh ĐỘC LẬP\n" +
        "// 6) nhánh được nạp động (plugin, cấu hình theo tenant)\n" +
        "\n" +
        "// ĐỪNG TÁCH khi:\n" +
        "//  - chỉ có 2-3 nhánh, mỗi nhánh một dòng\n" +
        "//  - tập giá trị cố định và gần như không đổi\n" +
        "//  - việc tách chỉ làm phải nhảy qua 5 file mới hiểu được một logic đơn giản\n" +
        "\n" +
        "// QUY TẮC BA: xuất hiện lần thứ ba thì mới trừu tượng hoá. Trừu tượng\n" +
        "// hoá quá sớm thường tạo ra ranh giới SAI, và ranh giới sai đắt hơn\n" +
        "// nhiều so với một switch dài.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Observer pattern — cấu trúc và use case?',
  answer:
    'Một object (**subject**) duy trì danh sách các **observer** và **tự động thông báo** chúng khi state thay đổi (thường gọi method `update()`).\n\n' +
    '```\ninterface Observer { void onEvent(Event e); }\nclass Subject {\n  private List<Observer> observers = new ArrayList<>();\n  void subscribe(Observer o) { observers.add(o); }\n  void notifyAll(Event e) { observers.forEach(o -> o.onEvent(e)); }\n}\n```\n\n' +
    'Dùng khi: một thay đổi cần kéo theo cập nhật nhiều object mà bạn **không biết trước** là bao nhiêu/loại gì; muốn tách rời "cái phát" khỏi "cái phản ứng".',
  essence:
    'Observer = "publish–subscribe trong một process". Subject không biết observer là ai, chỉ biết "có ai đó muốn được báo". Nền tảng của event handling, reactive, data binding, MVC.',
  example:
    'Excel: ô A1 = `B1 + C1`. Ô A1 (observer) subscribe B1, C1 (subject). Đổi B1 → B1 notify → A1 tính lại. UI framework: nút "Save" observe form state → tự enable/disable. `PropertyChangeListener` trong JavaBeans.',
  viz: {
    type: 'flow',
    title: '"Publish–subscribe trong một process"',
    nodes: ['Observer.subscribe(subject)', 'Subject state thay đổi', 'subject.notifyAll(event)', 'Mỗi observer.onEvent(e) — tự cập nhật'],
    steps: [
      { to: 0, label: 'Subject giữ List<Observer>' },
      { to: 2, label: 'Subject không biết observer là ai, chỉ biết "có ai đó muốn được báo"' },
      { to: 3, label: 'Nền tảng của event handling, reactive, data binding, MVC' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một đối tượng đổi, nhiều đối tượng được báo",
      code:
        "// SUBJECT giữ danh sách observer và thông báo khi có thay đổi.\n" +
        "public interface OrderObserver {\n" +
        "    void onOrderPlaced(Order order);\n" +
        "}\n" +
        "\n" +
        "public class OrderSubject {\n" +
        "    private final List<OrderObserver> observers = new CopyOnWriteArrayList<>();\n" +
        "    // CopyOnWriteArrayList: an toàn khi observer tự gỡ mình trong lúc duyệt\n" +
        "\n" +
        "    public void subscribe(OrderObserver o)   { observers.add(o); }\n" +
        "    public void unsubscribe(OrderObserver o) { observers.remove(o); }\n" +
        "\n" +
        "    public void place(Order order) {\n" +
        "        repository.save(order);\n" +
        "        for (var o : observers) {\n" +
        "            try { o.onOrderPlaced(order); }\n" +
        "            catch (Exception e) {\n" +
        "                // MỘT observer lỗi KHÔNG được làm hỏng các observer khác\n" +
        "                log.error(\"observer {} lỗi\", o.getClass(), e);\n" +
        "            }\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// TRONG SPRING — không cần tự viết:\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final ApplicationEventPublisher publisher;\n" +
        "    @Transactional\n" +
        "    public void place(Order o) {\n" +
        "        repo.save(o);\n" +
        "        publisher.publishEvent(new OrderPlacedEvent(o.id()));\n" +
        "    }\n" +
        "}\n" +
        "@Component\n" +
        "public class EmailNotifier {\n" +
        "    @EventListener\n" +
        "    public void on(OrderPlacedEvent e) { mailer.send(e); }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: OrderService KHÔNG biết ai đang lắng nghe -> thêm việc cần làm\n" +
        "// khi có đơn hàng mà không sửa OrderService.\n" +
        "\n" +
        "// BA CẠM BẪY (xem các câu riêng):\n" +
        "//  1) rò rỉ bộ nhớ nếu quên unsubscribe\n" +
        "//  2) đồng bộ mặc định -> observer chậm làm chậm cả luồng chính\n" +
        "//  3) thứ tự thông báo không đảm bảo, và dễ tạo chuỗi sự kiện dây chuyền",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Observer vs Pub/Sub (message bus) vs Event-driven — phân biệt?',
  answer:
    '- **Observer (GoF)**: subject **giữ trực tiếp** danh sách observer; gọi thẳng `observer.update()`. Đồng bộ, trong-process, coupling nhẹ (subject biết interface Observer).\n' +
    '- **Pub/Sub qua event bus / mediator**: publisher và subscriber **không biết nhau**, giao tiếp qua một **broker/bus** trung gian. Có thể async, có thể xuyên process.\n' +
    '- **Event-driven architecture**: kiến trúc ở tầng hệ thống — service phát domain event lên message broker (Kafka), service khác phản ứng. Async, phân tán, bền.\n\n' +
    'Cùng ý tưởng "phản ứng với thay đổi", khác về: ai giữ danh sách, đồng bộ hay async, trong-process hay phân tán.',
  essence:
    'Observer: subject tự quản subscriber, gọi trực tiếp (in-process, sync). Pub/Sub: một bus ở giữa, publisher/subscriber độc lập hoàn toàn. Event-driven: pub/sub ở quy mô hệ thống phân tán với broker bền.',
  example:
    'In-process: `orderService` có `List<OrderListener>`, gọi `listener.onOrderPlaced()` (Observer). Spring: `applicationEventPublisher.publishEvent(new OrderPlaced())` → bất kỳ `@EventListener` nào nhận (Pub/Sub qua ApplicationContext bus). Phân tán: publish `OrderPlaced` lên Kafka (Event-driven).',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Observer (GoF)', 'Pub/Sub (event bus)', 'Event-driven architecture'],
    rows: [
      ['Ai giữ danh sách subscriber', 'subject giữ trực tiếp', 'broker/bus trung gian', 'message broker (Kafka)'],
      ['Đồng bộ / async', 'đồng bộ', 'có thể async', 'async'],
      ['Phạm vi', 'trong-process', 'có thể xuyên process', 'phân tán, bền'],
      ['Coupling', 'nhẹ (subject biết interface Observer)', 'publisher/subscriber không biết nhau', 'service không biết nhau'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba mức độ tách rời",
      code:
        "// 1) OBSERVER (GoF) — subject GIỮ THAM CHIẾU trực tiếp tới observer\n" +
        "subject.subscribe(observer);           // subject BIẾT observer là ai\n" +
        "// - cùng tiến trình, cùng bộ nhớ\n" +
        "// - đồng bộ, gọi trực tiếp\n" +
        "// - subject và observer gắn với nhau (dù qua interface)\n" +
        "\n" +
        "// 2) PUB/SUB — có TRUNG GIAN (message bus/broker); publisher và subscriber\n" +
        "//    KHÔNG BIẾT NHAU\n" +
        "publisher.publishEvent(new OrderPlacedEvent(id));    // Spring: bus trong tiến trình\n" +
        "kafkaTemplate.send(\"order-events\", event);           // Kafka: bus ngoài tiến trình\n" +
        "// - tách rời hoàn toàn: thêm/bớt subscriber không ảnh hưởng publisher\n" +
        "// - có thể qua mạng, có thể bền vững, có thể phát lại\n" +
        "\n" +
        "// 3) EVENT-DRIVEN ARCHITECTURE — không chỉ là cơ chế, mà là KIẾN TRÚC:\n" +
        "//    hệ thống được tổ chức quanh việc SẢN SINH và PHẢN ỨNG với sự kiện.\n" +
        "//    Bao gồm: event sourcing, CQRS, saga, event streaming.\n" +
        "\n" +
        "// SO SÁNH THEO BA TIÊU CHÍ:\n" +
        "//              Observer      Pub/Sub trong tiến trình   Pub/Sub qua broker\n" +
        "// Phạm vi      cùng process  cùng process               nhiều service\n" +
        "// Bền vững     không         không                      có (Kafka)\n" +
        "// Biết nhau    có            không                      không\n" +
        "// Phát lại     không         không                      có\n" +
        "\n" +
        "// LƯU Ý QUAN TRỌNG: Spring ApplicationEvent mặc định là ĐỒNG BỘ và nằm\n" +
        "// trong CÙNG TRANSACTION -> listener ném lỗi là rollback cả nghiệp vụ chính.\n" +
        "@TransactionalEventListener(phase = AFTER_COMMIT)   // chờ commit rồi mới chạy\n" +
        "public void on(OrderPlacedEvent e) { mailer.send(e); }\n" +
        "// Đây là cấu hình đúng cho việc gửi mail/đẩy message: tránh gửi rồi mới rollback.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Template Method pattern — khung xử lý với các bước cắm được?',
  answer:
    'Định nghĩa **bộ khung của một thuật toán** trong một method của superclass, để **một số bước cho subclass override**. Các bước bất biến nằm trong superclass, bước biến thiên là abstract.\n\n' +
    '```\nabstract class DataImporter {\n  final void run() {              // template method (final: không override)\n    var raw = read();            // abstract\n    var valid = validate(raw);    // có default, override được\n    save(valid);                  // abstract\n    notifyDone();                 // hook, mặc định rỗng\n  }\n  abstract List<Row> read();\n  abstract void save(List<Row> rows);\n}\n```',
  essence:
    'Template Method = "khung cố định, chỗ trống cho subclass điền". Nó đảo ngược quyền điều khiển: superclass gọi method của subclass ("Hollywood principle"). Dùng khi nhiều biến thể chia sẻ *cùng một quy trình* nhưng khác vài bước.',
  example:
    'JUnit: `runTest()` (template) gọi `setUp()` → `test method` → `tearDown()`. Bạn override `setUp`/`tearDown`. Spring `AbstractController`, servlet `HttpServlet.service()` gọi `doGet`/`doPost`. `InputStream.read(byte[])` gọi `read()` abstract.',
  viz: {
    type: 'flow',
    title: '"Khung cố định, chỗ trống cho subclass điền" (Hollywood principle)',
    nodes: ['run() — template method (final: không override)', 'read() — abstract (subclass điền)', 'validate() — có default, override được', 'save() — abstract', 'notifyDone() — hook, mặc định rỗng'],
    steps: [
      { to: 0, label: 'Bước bất biến nằm trong superclass' },
      { to: 1, label: 'Superclass GỌI method của subclass' },
      { to: 4, label: 'Dùng khi nhiều biến thể chia sẻ cùng quy trình, khác vài bước' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Lớp cha giữ khung, lớp con điền chi tiết",
      code:
        "public abstract class DataImporter {\n" +
        "\n" +
        "    // TEMPLATE METHOD — final: khung KHÔNG được đổi\n" +
        "    public final ImportResult importData(Path file) {\n" +
        "        validate(file);                      // bước CỐ ĐỊNH\n" +
        "        var raw = read(file);                // bước THAY ĐỔI\n" +
        "        var records = parse(raw);            // bước THAY ĐỔI\n" +
        "        var valid = filterValid(records);    // bước CỐ ĐỊNH\n" +
        "        var saved = save(valid);             // bước THAY ĐỔI\n" +
        "        afterImport(saved);                  // HOOK — mặc định không làm gì\n" +
        "        return new ImportResult(saved.size(), records.size() - valid.size());\n" +
        "    }\n" +
        "\n" +
        "    protected abstract String read(Path file);\n" +
        "    protected abstract List<Record> parse(String raw);\n" +
        "    protected abstract int save(List<Record> records);\n" +
        "\n" +
        "    // HOOK: lớp con override nếu muốn, không bắt buộc\n" +
        "    protected void afterImport(List<Record> saved) { }\n" +
        "\n" +
        "    private void validate(Path f) { if (!Files.exists(f)) throw new IllegalArgumentException(); }\n" +
        "    private List<Record> filterValid(List<Record> r) { return r.stream().filter(Record::isValid).toList(); }\n" +
        "}\n" +
        "\n" +
        "public class CsvImporter extends DataImporter {\n" +
        "    protected String read(Path f) { return Files.readString(f); }\n" +
        "    protected List<Record> parse(String raw) { return CsvParser.parse(raw); }\n" +
        "    protected int save(List<Record> r) { return repo.saveAll(r).size(); }\n" +
        "    @Override protected void afterImport(List<Record> saved) { cache.invalidateAll(); }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: thuật toán tổng thể ĐƯỢC ĐẢM BẢO không đổi; lớp con không thể\n" +
        "// quên bước validate hay filterValid. Đây là \"Hollywood principle\":\n" +
        "// lớp cha gọi lớp con, không phải ngược lại.\n" +
        "\n" +
        "// CẠM BẪY: dùng KẾ THỪA -> gắn chặt, chỉ chọn được biến thể lúc BIÊN DỊCH,\n" +
        "// và lớp con phụ thuộc vào chi tiết của lớp cha. Cần linh hoạt lúc chạy\n" +
        "// -> dùng Strategy (truyền các bước vào dưới dạng hàm).",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Template Method vs Strategy — giống mục tiêu, khác cách?',
  answer:
    'Cả hai cho phép **thay đổi một phần hành vi**:\n\n' +
    '- **Template Method**: dùng **kế thừa**. Khung ở superclass, biến thể ở subclass override method. Quan hệ tĩnh (compile-time). Subclass chỉ đổi được các bước được cho phép; không đổi được khung.\n' +
    '- **Strategy**: dùng **composition**. Client giữ một object strategy, có thể **đổi runtime**, tổ hợp linh hoạt. Không cần kế thừa.\n\n' +
    'Strategy linh hoạt hơn (đổi runtime, tránh kế thừa sâu); Template Method gọn hơn khi biến thể ít và cố định, và khi muốn tái dùng nhiều code chung.',
  essence:
    'Template Method: "kế thừa để điền chỗ trống trong quy trình". Strategy: "composition để cắm thuật toán từ ngoài". Cùng bài toán, Strategy thường là lựa chọn hiện đại hơn (favor composition, đổi runtime).',
  example:
    'Xử lý payment với các bước chung (validate → charge → record → notify): Template Method nếu chỉ khác bước `charge` theo provider và số provider cố định. Strategy nếu muốn đổi provider runtime hoặc test từng bước độc lập.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Template Method', 'Strategy'],
    rows: [
      ['Cơ chế', 'kế thừa (subclass override method)', 'composition (client giữ object strategy)'],
      ['Thời điểm', 'tĩnh (compile-time)', 'đổi được runtime'],
      ['Đổi được gì', 'chỉ các bước được cho phép, không đổi khung', 'toàn bộ thuật toán, tổ hợp linh hoạt'],
      ['Hợp khi', 'biến thể ít, cố định, nhiều code chung', 'đổi runtime, tránh kế thừa sâu, test cô lập'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Kế thừa vs composition",
      code:
        "// TEMPLATE METHOD — KẾ THỪA. Khung ở lớp cha, biến thể ở lớp con.\n" +
        "public abstract class Report {\n" +
        "    public final void generate() {          // khung CỐ ĐỊNH\n" +
        "        var data = fetchData();\n" +
        "        var formatted = format(data);\n" +
        "        send(formatted);\n" +
        "    }\n" +
        "    protected abstract Data fetchData();\n" +
        "    protected abstract String format(Data d);\n" +
        "    private void send(String s) { ... }     // không cho đổi\n" +
        "}\n" +
        "// + đảm bảo khung không bị phá vỡ; lớp con dùng được state của cha\n" +
        "// - chọn biến thể lúc BIÊN DỊCH; chỉ kế thừa được MỘT lớp\n" +
        "// - lớp con phụ thuộc chi tiết lớp cha (kế thừa là gắn kết chặt nhất)\n" +
        "\n" +
        "// STRATEGY — COMPOSITION. Biến thể được TRUYỀN VÀO.\n" +
        "public class Report {\n" +
        "    private final DataFetcher fetcher;\n" +
        "    private final Formatter formatter;\n" +
        "\n" +
        "    public Report(DataFetcher f, Formatter fmt) { this.fetcher = f; this.formatter = fmt; }\n" +
        "\n" +
        "    public void generate() {\n" +
        "        var data = fetcher.fetch();\n" +
        "        send(formatter.format(data));\n" +
        "    }\n" +
        "}\n" +
        "new Report(new SqlFetcher(), new PdfFormatter()).generate();\n" +
        "new Report(new ApiFetcher(), new ExcelFormatter()).generate();   // đổi LÚC CHẠY\n" +
        "// + kết hợp tự do; test từng phần độc lập; đổi được lúc chạy\n" +
        "// - khung không được bảo vệ (ai cũng có thể gọi sai thứ tự)\n" +
        "\n" +
        "// CHỌN:\n" +
        "//  - có NHIỀU bước cần thay đổi, và chúng ĐỘC LẬP với nhau -> STRATEGY\n" +
        "//  - cần ĐẢM BẢO thứ tự các bước, và lớp con cần state chung -> TEMPLATE METHOD\n" +
        "//  - cần đổi lúc chạy hoặc kết hợp nhiều chiều              -> STRATEGY\n" +
        "\n" +
        "// Java hiện đại nghiêng về STRATEGY vì lambda làm nó rất nhẹ:\n" +
        "public void generate(Supplier<Data> fetcher, Function<Data, String> formatter) { }",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Command pattern — đóng gói yêu cầu thành object?',
  answer:
    'Biến một **yêu cầu/thao tác** thành một **object** chứa đủ thông tin để thực hiện nó (receiver + tham số + method). Tách "cái phát lệnh" khỏi "cái thực hiện lệnh".\n\n' +
    '```\ninterface Command { void execute(); }\nclass CreateOrderCommand implements Command {\n  private final OrderService svc; private final OrderData data;\n  void execute() { svc.create(data); }\n}\n```\n\n' +
    'Cho phép: **hàng đợi** lệnh, **log/replay**, **undo/redo** (thêm `undo()`), **transaction** (nhóm lệnh), **macro** (composite command), **retry**, chạy lệnh ở thread khác.',
  essence:
    'Command = "biến động từ thành danh từ". Một khi thao tác là object, bạn có thể lưu, truyền, xếp hàng, hoãn, hoàn tác, ghi log nó — những thứ không làm được với một lời gọi method trực tiếp.',
  example:
    'Editor: mỗi hành động (gõ, xoá, định dạng) là một Command với `execute()` + `undo()`, đẩy vào stack → Ctrl+Z. Task queue: mỗi job là một Command serialize được, đẩy vào Redis/DB, worker `execute()`. GUI: mỗi menu item/nút gắn một Command.',
  viz: {
    type: 'tree',
    title: '"Biến động từ thành danh từ" — thao tác là object',
    root: {
      label: 'Object chứa receiver + tham số + method — tách "phát lệnh" khỏi "thực hiện lệnh"',
      children: [
        { label: 'Hàng đợi lệnh', note: 'job serialize được, đẩy vào Redis/DB, worker execute()' },
        { label: 'Log / replay', note: '' },
        { label: 'Undo/redo', note: 'thêm undo()' },
        { label: 'Transaction (nhóm lệnh), macro (composite command)', note: '' },
        { label: 'Retry, chạy lệnh ở thread khác', note: '' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Biến lời gọi method thành object",
      code:
        "public interface Command {\n" +
        "    void execute();\n" +
        "}\n" +
        "\n" +
        "public class PlaceOrderCommand implements Command {\n" +
        "    private final OrderService service;      // RECEIVER\n" +
        "    private final CreateOrderRequest request;\n" +
        "\n" +
        "    public PlaceOrderCommand(OrderService s, CreateOrderRequest r) {\n" +
        "        this.service = s; this.request = r;\n" +
        "    }\n" +
        "    @Override public void execute() { service.place(request); }\n" +
        "}\n" +
        "\n" +
        "// INVOKER — không biết gì về nội dung command\n" +
        "public class CommandQueue {\n" +
        "    private final BlockingQueue<Command> queue = new LinkedBlockingQueue<>();\n" +
        "    public void submit(Command c) { queue.offer(c); }\n" +
        "    public void run() {\n" +
        "        while (running) queue.take().execute();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// VÌ SAO BIẾN LỜI GỌI THÀNH OBJECT — nó mở ra những việc sau:\n" +
        "// 1) XẾP HÀNG và thực thi SAU (job queue, xử lý nền)\n" +
        "// 2) GHI LOG mọi thao tác -> audit trail, và phát lại được\n" +
        "// 3) UNDO/REDO (xem câu riêng)\n" +
        "// 4) THỬ LẠI khi lỗi — command chứa đủ thông tin để chạy lại\n" +
        "// 5) GỬI QUA MẠNG — command tuần tự hoá được (đây chính là ý tưởng\n" +
        "//    của message/event trong hệ phân tán)\n" +
        "// 6) GỘP nhiều command thành MACRO command\n" +
        "\n" +
        "// TRONG JAVA HIỆN ĐẠI, Runnable/Callable CHÍNH LÀ Command:\n" +
        "executor.submit(() -> orderService.place(request));    // lambda = command\n" +
        "\n" +
        "// KHI NÀO CẦN CLASS THẬT: khi command cần MANG DỮ LIỆU để tuần tự hoá,\n" +
        "// để undo, hoặc để kiểm tra/lọc trước khi thực thi.\n" +
        "// Trong CQRS, \"Command\" chính là pattern này ở mức kiến trúc.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Command + undo/redo — hiện thực thế nào?',
  answer:
    'Mỗi command lưu **đủ state để tự đảo ngược**:\n' +
    '- `execute()`: thực hiện + lưu thông tin cần cho undo (Memento — giá trị cũ, hoặc thao tác nghịch đảo).\n' +
    '- `undo()`: khôi phục.\n\n' +
    'Quản lý:\n' +
    '- **Undo stack**: mỗi `execute` push command. Ctrl+Z: pop → `undo()` → push sang **redo stack**.\n' +
    '- Ctrl+Y: pop redo stack → `execute()` → push lại undo stack.\n' +
    '- Thao tác mới (không phải redo) → xoá redo stack.\n\n' +
    'Với thao tác lớn: lưu **Memento** (snapshot phần bị ảnh hưởng) thay vì thao tác nghịch đảo.',
  essence:
    'Undo/redo = hai stack + command biết tự đảo ngược. Command đơn giản lưu "giá trị cũ"; command phức tạp lưu Memento (ảnh chụp). Redo stack bị xoá khi có nhánh lịch sử mới.',
  example:
    '`SetCellCommand(cell, newValue)`: `execute()` lưu `oldValue = cell.get()` rồi `cell.set(newValue)`. `undo()`: `cell.set(oldValue)`. Spreadsheet giữ `Deque<Command> undo, redo`. Xoá 100 dòng → `DeleteRowsCommand` lưu Memento của 100 dòng đó để undo.',
  viz: {
    type: 'flow',
    title: 'Hai stack + command biết tự đảo ngược',
    nodes: ['execute() — thực hiện + lưu oldValue / Memento', 'push vào undo stack', 'Ctrl+Z: pop → undo() → push sang redo stack', 'Ctrl+Y: pop redo → execute() → push lại undo', 'Thao tác mới (không phải redo) → xoá redo stack'],
    steps: [
      { to: 1, label: 'Command đơn giản lưu "giá trị cũ"' },
      { to: 2, label: 'Command phức tạp lưu Memento (snapshot phần bị ảnh hưởng)' },
      { to: 4, label: 'Redo stack bị xoá khi có nhánh lịch sử mới' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Command biết cách tự hoàn tác",
      code:
        "public interface UndoableCommand {\n" +
        "    void execute();\n" +
        "    void undo();\n" +
        "}\n" +
        "\n" +
        "public class AddItemCommand implements UndoableCommand {\n" +
        "    private final Cart cart;\n" +
        "    private final Item item;\n" +
        "\n" +
        "    public void execute() { cart.add(item); }\n" +
        "    public void undo()    { cart.remove(item); }    // thao tác NGƯỢC\n" +
        "}\n" +
        "\n" +
        "public class UpdatePriceCommand implements UndoableCommand {\n" +
        "    private final Product product;\n" +
        "    private final Money newPrice;\n" +
        "    private Money oldPrice;                          // LƯU trạng thái cũ\n" +
        "\n" +
        "    public void execute() {\n" +
        "        this.oldPrice = product.price();             // ghi nhớ TRƯỚC khi đổi\n" +
        "        product.setPrice(newPrice);\n" +
        "    }\n" +
        "    public void undo() { product.setPrice(oldPrice); }\n" +
        "}\n" +
        "\n" +
        "// HISTORY — hai ngăn xếp\n" +
        "public class CommandHistory {\n" +
        "    private final Deque<UndoableCommand> undoStack = new ArrayDeque<>();\n" +
        "    private final Deque<UndoableCommand> redoStack = new ArrayDeque<>();\n" +
        "\n" +
        "    public void execute(UndoableCommand c) {\n" +
        "        c.execute();\n" +
        "        undoStack.push(c);\n" +
        "        redoStack.clear();          // làm việc mới -> mất nhánh redo\n" +
        "    }\n" +
        "    public void undo() {\n" +
        "        if (undoStack.isEmpty()) return;\n" +
        "        var c = undoStack.pop();\n" +
        "        c.undo();\n" +
        "        redoStack.push(c);\n" +
        "    }\n" +
        "    public void redo() {\n" +
        "        if (redoStack.isEmpty()) return;\n" +
        "        var c = redoStack.pop();\n" +
        "        c.execute();\n" +
        "        undoStack.push(c);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// HAI CÁCH LƯU TRẠNG THÁI ĐỂ HOÀN TÁC:\n" +
        "//  a) THAO TÁC NGƯỢC (như AddItem) — nhẹ, nhưng không phải việc gì cũng có\n" +
        "//  b) LƯU TRẠNG THÁI CŨ (như UpdatePrice) -> đây chính là MEMENTO pattern\n" +
        "//     Tốn bộ nhớ hơn nhưng luôn đúng.\n" +
        "// Với object lớn: lưu snapshot định kỳ + command từ snapshot đó (giống\n" +
        "// cách event sourcing dùng snapshot).",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'State pattern — object đổi hành vi theo trạng thái nội tại?',
  answer:
    'Cho phép một object **thay đổi hành vi khi state nội tại thay đổi** — như thể nó đổi class. Mỗi state là một class implements cùng interface; object (context) uỷ quyền hành vi cho object state hiện tại; state có thể **chuyển context sang state khác**.\n\n' +
    '```\ninterface OrderState { void pay(OrderContext c); void ship(OrderContext c); }\nclass PendingState implements OrderState {\n  void pay(OrderContext c) { ...; c.setState(new PaidState()); }\n  void ship(OrderContext c) { throw new IllegalStateException("chưa trả tiền"); }\n}\n```\n\n' +
    'Thay cho `switch(state)` khổng lồ ở mọi method.',
  essence:
    'State = "state machine hướng đối tượng". Mỗi trạng thái biết: hành vi hợp lệ của nó + chuyển sang trạng thái nào. Thêm trạng thái mới = thêm một class, không sửa `switch` ở 10 method.',
  example:
    'Đơn hàng: `PENDING → PAID → SHIPPED → DELIVERED`, có thể `CANCELLED`. Mỗi state cho phép/cấm các thao tác khác nhau. `PendingState.cancel()` OK; `ShippedState.cancel()` từ chối. Máy bán hàng, TCP connection, document workflow, game character state.',
  viz: {
    type: 'states',
    title: 'State machine hướng đối tượng — mỗi state là một class',
    start: 0,
    states: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    transitions: [
      { from: 0, to: 1, label: 'pay()' },
      { from: 1, to: 2, label: 'ship()' },
      { from: 2, to: 3, label: 'deliver()' },
      { from: 0, to: 4, label: 'cancel() OK' },
      { from: 1, to: 4, label: 'cancel() + refund' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Mỗi trạng thái là một class, và nó tự quyết định bước tiếp",
      code:
        "// KHÔNG DÙNG STATE — switch lặp lại ở mọi method\n" +
        "public class Order {\n" +
        "    private String status;\n" +
        "    public void pay() {\n" +
        "        switch (status) {\n" +
        "            case \"NEW\" -> status = \"PAID\";\n" +
        "            case \"PAID\" -> throw new IllegalStateException(\"đã thanh toán\");\n" +
        "            case \"CANCELLED\" -> throw new IllegalStateException(\"đã huỷ\");\n" +
        "        }\n" +
        "    }\n" +
        "    public void ship() { switch (status) { ... } }     // LẶP LẠI\n" +
        "    public void cancel() { switch (status) { ... } }   // LẶP LẠI\n" +
        "}\n" +
        "\n" +
        "// DÙNG STATE — mỗi trạng thái biết mình làm được gì\n" +
        "public interface OrderState {\n" +
        "    default OrderState pay()    { throw new IllegalStateException(\"không thể thanh toán\"); }\n" +
        "    default OrderState ship()   { throw new IllegalStateException(\"không thể giao\"); }\n" +
        "    default OrderState cancel() { throw new IllegalStateException(\"không thể huỷ\"); }\n" +
        "}\n" +
        "\n" +
        "public class NewState implements OrderState {\n" +
        "    public OrderState pay()    { return new PaidState(); }\n" +
        "    public OrderState cancel() { return new CancelledState(); }\n" +
        "    // ship() dùng mặc định -> tự động ném lỗi\n" +
        "}\n" +
        "public class PaidState implements OrderState {\n" +
        "    public OrderState ship()   { return new ShippedState(); }\n" +
        "    public OrderState cancel() { return new RefundingState(); }   // huỷ sau khi trả tiền\n" +
        "}\n" +
        "public class ShippedState implements OrderState { }   // trạng thái CUỐI\n" +
        "\n" +
        "public class Order {\n" +
        "    private OrderState state = new NewState();\n" +
        "    public void pay()  { state = state.pay(); }\n" +
        "    public void ship() { state = state.ship(); }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: quy tắc chuyển trạng thái nằm GỌN ở một chỗ cho mỗi trạng thái,\n" +
        "// và thêm trạng thái mới không phải sửa mọi switch.\n" +
        "// Dùng default method để chuyển mặc định là \"không cho phép\" -> an toàn.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'State vs Strategy — cấu trúc giống hệt, khác gì?',
  answer:
    'Cùng cấu trúc (context uỷ quyền cho một object interface). Khác **ý định** và **ai điều khiển việc đổi**:\n\n' +
    '- **Strategy**: các thuật toán **độc lập, không biết nhau**. **Client** chọn strategy và thường không đổi trong vòng đời object. Client "biết" mình đang chọn cái gì.\n' +
    '- **State**: các state **biết nhau** (state này chuyển sang state kia). Việc chuyển state do **chính các state** (hoặc context) điều khiển dựa trên sự kiện, không phải client. Client không quan tâm state hiện tại.\n\n' +
    'Strategy: "làm việc X bằng cách nào". State: "object đang ở giai đoạn nào của vòng đời và cư xử ra sao".',
  essence:
    'Strategy = thuật toán hoán đổi được, client chọn. State = giai đoạn vòng đời, các state tự chuyển tiếp nhau theo sự kiện. Nếu các "chiến lược" của bạn tự chuyển sang nhau → đó là State.',
  example:
    'Strategy: `PaymentMethod` (Card/PayPal/Crypto) — user chọn, không tự đổi. State: `DraftPost → PublishedPost → ArchivedPost` — `publish()` gọi trên draft tự chuyển sang published; published không cho `publish()` nữa.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Strategy', 'State'],
    rows: [
      ['Các object interface', 'độc lập, không biết nhau', 'biết nhau (state này chuyển sang state kia)'],
      ['Ai điều khiển việc đổi', 'client chọn, thường không đổi trong vòng đời', 'chính các state (hoặc context) theo sự kiện'],
      ['Client', '"biết" mình đang chọn cái gì', 'không quan tâm state hiện tại'],
      ['Câu hỏi', '"làm việc X bằng cách nào"', '"object đang ở giai đoạn nào của vòng đời"'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Khác ở AI QUYẾT ĐỊNH và có chuyển đổi hay không",
      code:
        "// CẤU TRÚC GIỐNG HỆT: context giữ tham chiếu tới một interface, uỷ quyền\n" +
        "// công việc cho nó. Khác biệt nằm ở NGỮ NGHĨA.\n" +
        "\n" +
        "// STRATEGY — CLIENT chọn, và lựa chọn KHÔNG TỰ ĐỔI\n" +
        "public class ShippingService {\n" +
        "    private final ShippingCostCalculator calculator;\n" +
        "    public ShippingService(ShippingCostCalculator c) { this.calculator = c; }  // client quyết\n" +
        "    public Money cost(Order o) { return calculator.calculate(o); }\n" +
        "}\n" +
        "new ShippingService(new ExpressShipping());       // client biết và chọn\n" +
        "// - các strategy KHÔNG biết nhau\n" +
        "// - không có khái niệm \"chuyển từ strategy này sang strategy kia\"\n" +
        "// - mục đích: nhiều cách làm cùng một việc\n" +
        "\n" +
        "// STATE — ĐỐI TƯỢNG tự chuyển trạng thái, và các state BIẾT NHAU\n" +
        "public class Order {\n" +
        "    private OrderState state = new NewState();\n" +
        "    public void pay() { state = state.pay(); }     // STATE trả về state TIẾP THEO\n" +
        "}\n" +
        "public class NewState implements OrderState {\n" +
        "    public OrderState pay() { return new PaidState(); }    // biết PaidState\n" +
        "}\n" +
        "// - state quyết định state kế tiếp -> có ĐỒ THỊ CHUYỂN TRẠNG THÁI\n" +
        "// - client thường KHÔNG biết object đang ở state nào\n" +
        "// - mục đích: hành vi thay đổi theo VÒNG ĐỜI của đối tượng\n" +
        "\n" +
        "// PHÂN BIỆT NHANH BẰNG HAI CÂU HỎI:\n" +
        "// 1) \"Ai chọn cài đặt?\"  Client -> Strategy. Chính object -> State.\n" +
        "// 2) \"Có chuyển từ cái này sang cái kia không?\" Có -> State. Không -> Strategy.\n" +
        "\n" +
        "// Ví dụ Strategy: thuật toán nén, cách tính phí, cách sắp xếp.\n" +
        "// Ví dụ State: vòng đời đơn hàng, kết nối TCP, trình phát nhạc (play/pause/stop).",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Cách hiện thực một state machine — enum, State pattern, hay thư viện?',
  answer:
    '- **Enum + transition table** (đơn giản): `enum State { PENDING, PAID, SHIPPED }` + `Map<State, Set<State>>` cho phép chuyển; hoặc enum có method `next(Event)`.\n' +
    '- **State pattern** (một class/state): khi mỗi state có **nhiều hành vi phức tạp** + nhiều thao tác được phép/cấm khác nhau.\n' +
    '- **Thư viện state machine** (Spring StateMachine, XState, tinystatemachine): khi cần state phân cấp, parallel region, guard, action, visualization, persistence.\n\n' +
    'Chọn theo độ phức tạp: vài trạng thái + chuyển đơn giản → enum. Nhiều hành vi/thao tác theo trạng thái → State pattern. Workflow phức tạp có nhánh, timer, sub-state → thư viện.',
  essence:
    'Đừng dùng thư viện state machine cho 3 trạng thái (enum đủ), cũng đừng nhồi workflow 20 trạng thái vào `switch` (dùng State pattern hoặc thư viện). Kích thước và độ phức tạp quyết định.',
  example:
    'Trạng thái task đơn giản (`TODO → DOING → DONE`): enum với `Set<Status> allowedNext`. Quy trình phê duyệt đơn nghỉ phép (nhiều cấp duyệt, timeout tự escalate, có thể rút lại): Spring StateMachine hoặc Temporal workflow.',
  viz: {
    type: 'layers',
    title: 'Kích thước và độ phức tạp quyết định',
    dir: 'up',
    layers: [
      { name: 'Enum + transition table', tag: 'đơn giản', note: 'vài trạng thái + chuyển đơn giản — Map<State, Set<State>> hoặc enum.next(Event)' },
      { name: 'State pattern (một class/state)', tag: '', note: 'mỗi state nhiều hành vi phức tạp + thao tác được phép/cấm khác nhau' },
      { name: 'Thư viện state machine', tag: 'Spring StateMachine, XState', note: 'state phân cấp, parallel region, guard, action, visualization, persistence' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba mức, chọn theo độ phức tạp",
      code:
        "// MỨC 1: ENUM với bảng chuyển trạng thái — GỌN NHẤT cho máy trạng thái nhỏ\n" +
        "public enum OrderStatus {\n" +
        "    NEW      { public Set<OrderStatus> next() { return Set.of(PAID, CANCELLED); } },\n" +
        "    PAID     { public Set<OrderStatus> next() { return Set.of(SHIPPED, REFUNDING); } },\n" +
        "    SHIPPED  { public Set<OrderStatus> next() { return Set.of(DELIVERED); } },\n" +
        "    DELIVERED{ public Set<OrderStatus> next() { return Set.of(); } },\n" +
        "    CANCELLED{ public Set<OrderStatus> next() { return Set.of(); } },\n" +
        "    REFUNDING{ public Set<OrderStatus> next() { return Set.of(REFUNDED); } },\n" +
        "    REFUNDED { public Set<OrderStatus> next() { return Set.of(); } };\n" +
        "\n" +
        "    public abstract Set<OrderStatus> next();\n" +
        "\n" +
        "    public void checkTransitionTo(OrderStatus target) {\n" +
        "        if (!next().contains(target))\n" +
        "            throw new IllegalStateException(\"không thể chuyển \" + this + \" -> \" + target);\n" +
        "    }\n" +
        "}\n" +
        "// + rất gọn, dễ đọc toàn bộ đồ thị chuyển trạng thái trong MỘT chỗ\n" +
        "// + enum lưu vào database tự nhiên\n" +
        "// - khó gắn hành vi phức tạp cho từng trạng thái\n" +
        "\n" +
        "// MỨC 2: STATE PATTERN — khi mỗi trạng thái có HÀNH VI riêng phức tạp\n" +
        "//   (xem câu về State pattern)\n" +
        "\n" +
        "// MỨC 3: THƯ VIỆN (Spring StateMachine, Temporal, Camunda) — khi cần:\n" +
        "//  - trạng thái LƯU BỀN và khôi phục được sau khi tiến trình chết\n" +
        "//  - máy trạng thái phân tán, chạy hàng tuần/tháng\n" +
        "//  - hành động bù trừ, timer, sự kiện chờ\n" +
        "//  - hình dung được luồng bằng sơ đồ, và người ngoài kỹ thuật đọc được\n" +
        "\n" +
        "// CHỌN:\n" +
        "//  - dưới ~7 trạng thái, hành vi đơn giản -> ENUM\n" +
        "//  - hành vi phức tạp cho từng trạng thái  -> STATE PATTERN\n" +
        "//  - quy trình dài, cần bền và quan sát được -> THƯ VIỆN\n" +
        "// LUÔN: ghi rõ đồ thị chuyển trạng thái ở MỘT chỗ, và kiểm tra chuyển\n" +
        "// trạng thái ở tầng domain, không rải rác trong controller.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Chain of Responsibility — chuỗi handler xử lý request?',
  answer:
    'Cho request đi qua một **chuỗi các handler**; mỗi handler quyết định **xử lý** request hay **chuyển tiếp** cho handler kế tiếp (hoặc cả hai).\n\n' +
    '```\nabstract class Handler {\n  protected Handler next;\n  abstract void handle(Request r);\n}\n```\n\n' +
    'Dùng khi: nhiều đối tượng có thể xử lý request và bạn không muốn hard-code cái nào; muốn thêm/bớt/đổi thứ tự bước xử lý dễ dàng; xử lý theo nhiều bước tuần tự (validate → auth → rate-limit → log → business).',
  essence:
    'CoR = "pipeline handler, mỗi mắt xích tự quyết xử lý hay đẩy tiếp". Tách người gửi khỏi người xử lý; cho phép cấu hình chuỗi linh hoạt. Cẩn thận: request có thể đi hết chuỗi mà không ai xử lý.',
  example:
    'Servlet Filter chain, Spring Security filter chain, middleware trong Express/ASP.NET Core. Xử lý exception: `NullHandler → ValidationHandler → BusinessHandler → DefaultHandler`. Duyệt chi phí: nhân viên < 1tr → trưởng nhóm < 10tr → giám đốc → HĐQT.',
  viz: {
    type: 'flow',
    title: '"Pipeline handler, mỗi mắt xích tự quyết xử lý hay đẩy tiếp"',
    nodes: ['Request', 'Handler 1: xử lý hoặc chuyển tiếp', 'Handler 2', 'Handler 3', 'Default handler'],
    steps: [
      { to: 1, label: 'Duyệt chi phí: nhân viên < 1tr → trưởng nhóm < 10tr → giám đốc' },
      { to: 3, label: 'Thêm/bớt/đổi thứ tự bước dễ dàng; tách người gửi khỏi người xử lý' },
      { to: 4, label: 'Cẩn thận: request có thể đi hết chuỗi mà không ai xử lý' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chuyền request qua chuỗi tới khi có người xử lý",
      code:
        "public abstract class ApprovalHandler {\n" +
        "    private ApprovalHandler next;\n" +
        "\n" +
        "    public ApprovalHandler setNext(ApprovalHandler next) {\n" +
        "        this.next = next;\n" +
        "        return next;                       // cho phép nối chuỗi fluent\n" +
        "    }\n" +
        "\n" +
        "    public final void handle(ExpenseRequest req) {\n" +
        "        if (canApprove(req)) {\n" +
        "            approve(req);\n" +
        "        } else if (next != null) {\n" +
        "            next.handle(req);              // CHUYỀN TIẾP\n" +
        "        } else {\n" +
        "            throw new IllegalStateException(\"không ai duyệt được \" + req.amount());\n" +
        "        }\n" +
        "    }\n" +
        "    protected abstract boolean canApprove(ExpenseRequest r);\n" +
        "    protected abstract void approve(ExpenseRequest r);\n" +
        "}\n" +
        "\n" +
        "public class TeamLeadHandler extends ApprovalHandler {\n" +
        "    protected boolean canApprove(ExpenseRequest r) { return r.amount() <= 5_000_000; }\n" +
        "    protected void approve(ExpenseRequest r) { log.info(\"trưởng nhóm duyệt\"); }\n" +
        "}\n" +
        "public class ManagerHandler extends ApprovalHandler {\n" +
        "    protected boolean canApprove(ExpenseRequest r) { return r.amount() <= 50_000_000; }\n" +
        "    protected void approve(ExpenseRequest r) { log.info(\"quản lý duyệt\"); }\n" +
        "}\n" +
        "\n" +
        "// LẮP CHUỖI:\n" +
        "var lead = new TeamLeadHandler();\n" +
        "lead.setNext(new ManagerHandler()).setNext(new DirectorHandler());\n" +
        "lead.handle(new ExpenseRequest(30_000_000));      // -> ManagerHandler xử lý\n" +
        "\n" +
        "// LỢI ÍCH: người GỬI không biết ai sẽ xử lý; thêm/bớt/sắp xếp lại handler\n" +
        "// mà không sửa client. Mỗi handler chỉ biết đúng phần việc của mình.\n" +
        "\n" +
        "// HAI BIẾN THỂ:\n" +
        "//  a) DỪNG ở handler đầu tiên xử lý được (như trên) — kiểu \"phê duyệt\"\n" +
        "//  b) MỌI handler đều chạy (kiểu middleware/filter) — xem câu tiếp theo\n" +
        "\n" +
        "// Trong JDK/framework: Servlet Filter, Spring Security filter chain,\n" +
        "// OkHttp/Netty interceptor, và cả try/catch của Java (exception được\n" +
        "// chuyền lên tới khối catch xử lý được).",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Chain of Responsibility trong middleware/filter — khác gì bản GoF cổ điển?',
  answer:
    'Bản GoF cổ điển: mỗi handler xử lý **hoặc** chuyển tiếp (một trong hai) — như xử lý exception.\n\n' +
    'Bản **middleware/filter** hiện đại: mỗi handler chạy code **trước** khi gọi `next()`, `next()` chạy phần còn lại của chuỗi, rồi handler chạy code **sau** — cho phép **bọc** (như Decorator around):\n' +
    '```\nvoid handle(Request req, Chain chain) {\n  long start = now();          // before\n  chain.next(req);             // gọi phần còn lại\n  log(now() - start);          // after\n}\n```\n\n' +
    'Mỗi middleware có thể: sửa request/response, dừng chuỗi (không gọi next), xử lý lỗi từ downstream.',
  essence:
    'Middleware = CoR + khả năng chạy logic *sau* khi phần còn lại của chuỗi hoàn tất (nhờ `next()` là lời gọi lồng nhau, không phải "chuyển tiếp rồi quên"). Đây là mô hình pipeline phổ biến nhất trong web framework.',
  example:
    'Express: `app.use(logger)`, `app.use(auth)`, `app.use(bodyParser)`. Mỗi cái gọi `next()`. `auth` middleware: kiểm tra token → không hợp lệ thì `res.status(401)` (dừng chuỗi), hợp lệ thì `next()`. `logger` đo thời gian cả request nhờ code sau `next()`.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['CoR cổ điển (GoF)', 'Middleware / filter'],
    rows: [
      ['Mỗi handler', 'xử lý HOẶC chuyển tiếp (một trong hai)', 'code trước next() → next() → code sau next()'],
      ['Chạy logic SAU khi chuỗi hoàn tất', 'không', 'có (next() là lời gọi lồng nhau)'],
      ['Bọc được (như Decorator around)?', 'không', 'có — đo thời gian cả request'],
      ['Sửa request/response, dừng chuỗi', 'hạn chế', 'có'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chuỗi \"bọc\" thay vì chuỗi \"chuyền\"",
      code:
        "// BẢN GoF CỔ ĐIỂN: chuyền request cho tới khi MỘT handler xử lý, rồi DỪNG.\n" +
        "// Handler chỉ chạy TRƯỚC hoặc thay cho phần còn lại.\n" +
        "\n" +
        "// BẢN MIDDLEWARE: MỌI handler đều chạy, và mỗi cái bọc quanh phần còn lại\n" +
        "// -> chạy được cả TRƯỚC và SAU khi phần sau xử lý xong.\n" +
        "@Component\n" +
        "public class LoggingFilter extends OncePerRequestFilter {\n" +
        "    @Override\n" +
        "    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,\n" +
        "                                    FilterChain chain) throws ServletException, IOException {\n" +
        "        long start = System.nanoTime();\n" +
        "        log.info(\"-> {} {}\", req.getMethod(), req.getRequestURI());   // TRƯỚC\n" +
        "\n" +
        "        chain.doFilter(req, res);        // gọi phần CÒN LẠI của chuỗi\n" +
        "\n" +
        "        log.info(\"<- {} ({}ms)\", res.getStatus(),                     // SAU\n" +
        "                 (System.nanoTime() - start) / 1_000_000);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// KHÁC BIỆT CỐT LÕI:\n" +
        "//  GoF        — handler QUYẾT ĐỊNH có chuyền tiếp hay không; ai xử lý thì dừng\n" +
        "//  Middleware — handler LUÔN chuyền tiếp (trừ khi muốn chặn), và có cơ hội\n" +
        "//               xử lý cả trên đường ĐI lẫn đường VỀ\n" +
        "// -> Middleware giống DECORATOR lồng nhau hơn là chain of responsibility.\n" +
        "\n" +
        "// CHẶN chuỗi (không gọi doFilter) khi muốn từ chối request:\n" +
        "if (!authenticated(req)) {\n" +
        "    res.setStatus(401);\n" +
        "    return;                              // KHÔNG gọi chain.doFilter -> dừng\n" +
        "}\n" +
        "\n" +
        "// THỨ TỰ RẤT QUAN TRỌNG và phải khai báo rõ:\n" +
        "@Order(Ordered.HIGHEST_PRECEDENCE)       // correlation id phải chạy ĐẦU TIÊN\n" +
        "// Ứng dụng: correlation id -> xác thực -> rate limit -> log -> nén -> controller",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Iterator pattern — còn ý nghĩa gì khi mọi ngôn ngữ đã có sẵn?',
  answer:
    'Iterator cung cấp cách **duyệt tuần tự** các phần tử của một collection **mà không lộ cấu trúc bên trong** (array, linked list, tree, DB cursor…).\n\n' +
    'Ngày nay ngôn ngữ tích hợp sẵn (`Iterable`/`Iterator` + for-each trong Java, generator/`yield`, `IEnumerable`) — bạn hiếm khi tự viết. Nhưng pattern vẫn quan trọng khi:\n' +
    '- **Custom traversal**: duyệt cây theo BFS/DFS/in-order; duyệt có filter/transform lazy.\n' +
    '- **Lazy / vô hạn**: iterator sinh phần tử theo yêu cầu (đọc file lớn từng dòng, phân trang API, stream vô hạn).\n' +
    '- Ẩn nguồn: cùng interface iterator dù dữ liệu từ RAM, DB, hay network.',
  essence:
    'Iterator tách "cách duyệt" khỏi "cách lưu trữ" và cho phép duyệt **lazy** (không nạp hết vào bộ nhớ). Đó là lý do nó vẫn nền tảng: `Stream`, generator, pagination iterator đều là Iterator.',
  example:
    'Đọc 10GB log: `LogFileIterator implements Iterator<LogLine>` đọc từng dòng khi `next()` được gọi → xử lý được file lớn hơn RAM. API pagination: `PagedIterator` tự động gọi trang tiếp theo khi hết trang hiện tại — client chỉ `for (var item : pagedResults)`.',
  viz: {
    type: 'tree',
    title: 'Tách "cách duyệt" khỏi "cách lưu trữ" + cho phép duyệt lazy',
    root: {
      label: 'Ngôn ngữ có sẵn (Iterable, generator) — nhưng pattern vẫn quan trọng khi:',
      children: [
        { label: 'Custom traversal', note: 'cây theo BFS/DFS/in-order; duyệt có filter/transform lazy' },
        { label: 'Lazy / vô hạn', note: 'đọc file lớn từng dòng, phân trang API, stream vô hạn' },
        { label: 'Ẩn nguồn', note: 'cùng interface iterator dù dữ liệu từ RAM, DB, hay network' },
        { label: 'Vẫn nền tảng', note: 'Stream, generator, pagination iterator đều là Iterator' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Pattern đã trở thành một phần của ngôn ngữ",
      code:
        "// Iterator là ví dụ điển hình của pattern được HẤP THỤ vào ngôn ngữ.\n" +
        "for (String s : list) { }        // Java tự dịch thành Iterator\n" +
        "list.stream().filter(...);       // Stream cũng dựa trên Spliterator\n" +
        "\n" +
        "// VẪN CẦN TỰ VIẾT khi: duyệt một cấu trúc dữ liệu RIÊNG, hoặc duyệt\n" +
        "// nguồn dữ liệu KHÔNG nằm hết trong bộ nhớ.\n" +
        "public class PagedApiIterator<T> implements Iterator<T> {\n" +
        "    private final Function<Integer, List<T>> fetchPage;\n" +
        "    private Iterator<T> current = Collections.emptyIterator();\n" +
        "    private int page = 0;\n" +
        "    private boolean exhausted = false;\n" +
        "\n" +
        "    @Override\n" +
        "    public boolean hasNext() {\n" +
        "        while (!current.hasNext() && !exhausted) {\n" +
        "            List<T> next = fetchPage.apply(page++);        // TẢI LƯỜI trang sau\n" +
        "            if (next.isEmpty()) { exhausted = true; return false; }\n" +
        "            current = next.iterator();\n" +
        "        }\n" +
        "        return current.hasNext();\n" +
        "    }\n" +
        "    @Override public T next() { return current.next(); }\n" +
        "}\n" +
        "// Client duyệt như một collection bình thường, KHÔNG BIẾT dữ liệu đang\n" +
        "// được tải theo trang qua mạng:\n" +
        "for (Order o : new PagedApiIterable<>(page -> api.getOrders(page))) {\n" +
        "    process(o);\n" +
        "}\n" +
        "\n" +
        "// GIÁ TRỊ CỐT LÕI CỦA PATTERN: tách CÁCH DUYỆT khỏi CẤU TRÚC dữ liệu.\n" +
        "// Nhờ đó client dùng một cách duy nhất cho mọi nguồn: list, cây, file,\n" +
        "// kết quả truy vấn database, API phân trang.\n" +
        "\n" +
        "// TRONG JAVA HIỆN ĐẠI, thường viết Spliterator/Stream thay vì Iterator\n" +
        "// để tận dụng được stream API:\n" +
        "public Stream<Order> streamOrders() {\n" +
        "    return StreamSupport.stream(new PagedApiSpliterator<>(...), false);\n" +
        "}\n" +
        "// Và nhớ ĐÓNG tài nguyên: try-with-resources với Stream đọc file/DB.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Mediator pattern — giảm coupling giữa nhiều object tương tác?',
  answer:
    'Khi **nhiều object tương tác chằng chịt** (mỗi cái giữ tham chiếu tới nhiều cái khác — "many-to-many"), đặt một **Mediator** ở giữa: các object chỉ nói với mediator, mediator điều phối tương tác.\n\n' +
    'Đổi coupling **n×n** thành **n×1**. Logic điều phối tập trung ở mediator thay vì rải khắp các object.\n\n' +
    'Nhược: mediator có thể phình thành "god object" nếu điều phối quá nhiều.',
  essence:
    'Mediator = "trạm điều phối". Thay vì mỗi component biết mọi component khác, tất cả biết mediator. Tương tác trở nên rõ ràng (ở một chỗ) và component tái dùng được (không dính vào nhau).',
  example:
    'Form phức tạp: khi "quốc gia" đổi → cập nhật dropdown "tỉnh", ẩn/hiện field "state", đổi format số điện thoại, revalidate. Không để mỗi field biết mọi field khác — một `FormMediator` xử lý `onCountryChanged()`. Chat room: user gửi message tới room (mediator), room broadcast — user không giữ list user khác.',
  viz: {
    type: 'flow',
    title: '"Trạm điều phối" — đổi coupling n×n thành n×1',
    nodes: ['Nhiều object tương tác chằng chịt (n×n)', 'Đặt một Mediator ở giữa', 'Các object chỉ nói với mediator', 'Mediator điều phối tương tác (logic tập trung)'],
    steps: [
      { to: 0, label: 'Mỗi cái giữ tham chiếu tới nhiều cái khác' },
      { to: 2, label: 'Component tái dùng được (không dính vào nhau)' },
      { to: 3, label: 'Nhược: mediator có thể phình thành "god object"' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Đưa mạng lưới quan hệ về hình sao",
      code:
        "// VẤN ĐỀ: n component cùng nói chuyện với nhau -> n(n-1)/2 mối quan hệ.\n" +
        "// 6 component = 15 mối quan hệ, và mỗi component phải biết 5 cái còn lại.\n" +
        "\n" +
        "public interface DialogMediator {\n" +
        "    void notify(Component sender, String event);\n" +
        "}\n" +
        "\n" +
        "public class OrderFormMediator implements DialogMediator {\n" +
        "    private final CustomerSelect customer;\n" +
        "    private final ProductList products;\n" +
        "    private final DiscountField discount;\n" +
        "    private final SubmitButton submit;\n" +
        "\n" +
        "    @Override\n" +
        "    public void notify(Component sender, String event) {\n" +
        "        // TOÀN BỘ logic tương tác nằm Ở ĐÂY\n" +
        "        if (sender == customer && event.equals(\"changed\")) {\n" +
        "            products.filterByCustomerTier(customer.getSelected().tier());\n" +
        "            discount.setMax(customer.getSelected().maxDiscount());\n" +
        "        }\n" +
        "        if (sender == products && event.equals(\"changed\")) {\n" +
        "            submit.setEnabled(!products.getSelected().isEmpty());\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "// Mỗi component chỉ biết MEDIATOR, không biết nhau:\n" +
        "public class CustomerSelect extends Component {\n" +
        "    public void onChange() { mediator.notify(this, \"changed\"); }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: n mối quan hệ thay vì n², và logic tương tác nằm ở MỘT chỗ\n" +
        "// có thể đọc và test được.\n" +
        "\n" +
        "// CẠM BẪY LỚN NHẤT: mediator phình thành GOD OBJECT. Nó tập trung độ phức\n" +
        "// tạp lại một chỗ — hữu ích khi độ phức tạp đó vốn đã tồn tại, nhưng nguy\n" +
        "// hiểm khi nó tiếp tục lớn lên.\n" +
        "// -> Chia mediator theo NHÓM component liên quan, đừng làm một cái cho cả màn hình.\n" +
        "\n" +
        "// VÍ DỤ THỰC TẾ: form UI phức tạp, air traffic control (kinh điển),\n" +
        "// và ở mức kiến trúc: message broker, API gateway, và orchestrator trong saga.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Mediator vs Observer — đều giảm coupling, khác gì?',
  answer:
    '- **Observer**: quan hệ **một-nhiều** một chiều. Subject phát, observer nghe. Subject không quan tâm observer làm gì. Dùng cho "thông báo thay đổi".\n' +
    '- **Mediator**: quan hệ **nhiều-nhiều** hai chiều, có **logic điều phối**. Mediator biết cách các thành phần nên phản ứng với nhau, chứa quy tắc tương tác. Dùng cho "điều phối hành vi phức tạp giữa các thành phần ngang hàng".\n\n' +
    'Thực tế thường kết hợp: các thành phần notify mediator (kiểu Observer), mediator điều phối (kiểu Mediator).',
  essence:
    'Observer: "báo cho ai quan tâm" (phi tập trung, không logic điều phối). Mediator: "điều phối tương tác theo quy tắc" (tập trung, có logic). Observer là kênh; Mediator là bộ não.',
  example:
    'Observer: `stockPrice` thay đổi → notify các widget hiển thị. Mediator: trong một dialog, khi checkbox "gửi email" được tick → mediator enable field "email", set field "phương thức" = EMAIL, disable field "SMS" — logic "khi X thì Y, Z" nằm ở mediator.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Observer', 'Mediator'],
    rows: [
      ['Quan hệ', 'một-nhiều, một chiều', 'nhiều-nhiều, hai chiều'],
      ['Logic điều phối', 'không — subject không quan tâm observer làm gì', 'có — chứa quy tắc "khi X thì Y, Z"'],
      ['Vai trò', 'kênh ("báo cho ai quan tâm")', 'bộ não ("điều phối theo quy tắc")'],
      ['Kết hợp', 'component notify mediator (kiểu Observer), mediator điều phối (kiểu Mediator)', ''],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ai biết ai, và luồng thông tin đi theo hướng nào",
      code:
        "// OBSERVER — quan hệ MỘT-NHIỀU, một chiều\n" +
        "// Subject phát ra thay đổi; observer phản ứng. Subject KHÔNG biết observer\n" +
        "// làm gì, observer KHÔNG nói lại với subject.\n" +
        "publisher.publishEvent(new OrderPlacedEvent(id));\n" +
        "@EventListener public void on(OrderPlacedEvent e) { mailer.send(e); }\n" +
        "// - luồng MỘT CHIỀU: subject -> observer\n" +
        "// - observer không biết nhau\n" +
        "// - dùng khi: \"chuyện X đã xảy ra, ai quan tâm thì tự xử lý\"\n" +
        "\n" +
        "// MEDIATOR — quan hệ NHIỀU-NHIỀU, hai chiều\n" +
        "// Component báo cho mediator; mediator ĐIỀU PHỐI, gọi ngược lại các\n" +
        "// component khác.\n" +
        "mediator.notify(this, \"changed\");        // component -> mediator\n" +
        "// mediator gọi products.filter(), discount.setMax()  // mediator -> component\n" +
        "// - luồng HAI CHIỀU và có LOGIC ĐIỀU PHỐI ở giữa\n" +
        "// - mediator BIẾT tất cả component\n" +
        "// - dùng khi: \"các component phải phối hợp với nhau theo quy tắc phức tạp\"\n" +
        "\n" +
        "// PHÂN BIỆT BẰNG CÂU HỎI:\n" +
        "// 1) \"Có logic quyết định ai làm gì tiếp theo không?\"\n" +
        "//    Có -> MEDIATOR. Không, chỉ là thông báo -> OBSERVER.\n" +
        "// 2) \"Các bên có cần nói chuyện HAI CHIỀU không?\"\n" +
        "//    Có -> MEDIATOR. Một chiều -> OBSERVER.\n" +
        "\n" +
        "// LIÊN HỆ VỚI MICROSERVICES — đây chính là:\n" +
        "//  CHOREOGRAPHY = Observer  (mỗi service nghe event, tự quyết định)\n" +
        "//  ORCHESTRATION = Mediator (một service điều phối toàn bộ luồng)\n" +
        "// Và cùng đánh đổi: choreography tách rời hơn nhưng khó nhìn toàn cảnh;\n" +
        "// orchestration tường minh hơn nhưng tạo điểm phụ thuộc trung tâm.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Observer pattern và rủi ro memory leak (lapsed listener)?',
  answer:
    'Subject giữ **strong reference** tới observer. Nếu observer bị "bỏ quên" mà không **unsubscribe**, nó không bao giờ được GC → **memory leak** (lapsed listener problem). Còn tệ hơn: observer "chết" vẫn nhận event và xử lý sai.\n\n' +
    'Phòng tránh:\n' +
    '- **Luôn unsubscribe** trong `dispose()`/`onDestroy()`/`@PreDestroy`; dùng try-with-resources / lifecycle-aware component.\n' +
    '- **Weak reference** cho observer (subject giữ `WeakReference`) — observer bị GC thì tự rụng khỏi list. Đánh đổi: observer có thể biến mất bất ngờ.\n' +
    '- Dùng framework quản lý lifecycle (Android `LifecycleObserver`, RxJava `CompositeDisposable`, Reactor).',
  essence:
    'Observer tạo một reference ngầm từ subject (thường sống lâu) tới observer (thường sống ngắn). Không unsubscribe = leak. Đây là bug phổ biến nhất khi dùng Observer/listener thủ công.',
  example:
    'Activity Android đăng ký `LocationListener` với `LocationManager` (singleton, sống mãi) nhưng quên gỡ khi Activity destroy → Activity không được GC, cả view tree của nó rò rỉ. Xoay màn hình vài lần → OutOfMemory. Sửa: `removeUpdates(listener)` trong `onDestroy`.',
  viz: {
    type: 'flow',
    title: 'Reference ngầm từ subject (sống lâu) tới observer (sống ngắn)',
    nodes: ['Subject giữ strong reference tới observer', 'Observer bị "bỏ quên", không unsubscribe', 'Observer không bao giờ được GC → memory leak', 'Observer "chết" vẫn nhận event và xử lý sai'],
    steps: [
      { to: 2, label: 'Lapsed listener problem — bug phổ biến nhất với Observer thủ công' },
      { to: 3, label: 'Phòng: luôn unsubscribe trong dispose()/onDestroy/@PreDestroy' },
      { to: 3, label: 'Hoặc: WeakReference; framework lifecycle-aware (LifecycleObserver, CompositeDisposable)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Subject giữ tham chiếu, observer không bao giờ được thu hồi",
      code:
        "// VẤN ĐỀ \"LAPSED LISTENER\": observer đăng ký rồi quên gỡ. Subject sống lâu\n" +
        "// (thường là singleton) giữ tham chiếu MẠNH -> observer KHÔNG BAO GIỜ bị\n" +
        "// GC thu hồi, dù không ai còn dùng nó.\n" +
        "public class EventBus {\n" +
        "    private static final List<Listener> LISTENERS = new ArrayList<>();   // sống mãi\n" +
        "    public static void register(Listener l) { LISTENERS.add(l); }\n" +
        "}\n" +
        "public class OrderScreen {\n" +
        "    public OrderScreen() { EventBus.register(this); }    // KHÔNG BAO GIỜ gỡ\n" +
        "}\n" +
        "// Mở và đóng màn hình 1000 lần -> 1000 OrderScreen còn sống trong bộ nhớ,\n" +
        "// và mỗi cái vẫn NHẬN và XỬ LÝ sự kiện -> vừa rò rỉ vừa gây hành vi sai.\n" +
        "\n" +
        "// CHỮA 1: LUÔN GỠ ĐĂNG KÝ — đối xứng với việc đăng ký\n" +
        "@Component\n" +
        "public class OrderScreen implements AutoCloseable {\n" +
        "    @PostConstruct void init()  { bus.register(this); }\n" +
        "    @PreDestroy   void close()  { bus.unregister(this); }     // BẮT BUỘC\n" +
        "}\n" +
        "\n" +
        "// CHỮA 2: THAM CHIẾU YẾU — subject không giữ observer sống\n" +
        "public class WeakEventBus {\n" +
        "    private final List<WeakReference<Listener>> listeners = new CopyOnWriteArrayList<>();\n" +
        "\n" +
        "    public void publish(Event e) {\n" +
        "        listeners.removeIf(ref -> ref.get() == null);      // dọn tham chiếu chết\n" +
        "        listeners.forEach(ref -> {\n" +
        "            Listener l = ref.get();\n" +
        "            if (l != null) l.onEvent(e);\n" +
        "        });\n" +
        "    }\n" +
        "}\n" +
        "// CẢNH BÁO: lambda và anonymous class KHÔNG có tham chiếu mạnh nào khác\n" +
        "// -> chúng bị GC ngay lập tức và listener \"biến mất\" một cách khó hiểu.\n" +
        "// -> Weak reference chỉ dùng được khi observer được giữ ở nơi khác.\n" +
        "\n" +
        "// CHỮA 3: dùng framework quản lý vòng đời (Spring @EventListener) —\n" +
        "// container tự gỡ listener khi bean bị huỷ.\n" +
        "\n" +
        "// CHỮA 4: đổi sang message queue — publisher và subscriber không giữ\n" +
        "// tham chiếu tới nhau chút nào.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Interpreter pattern — khi nào (hiếm khi) dùng?',
  answer:
    'Định nghĩa **ngữ pháp** cho một ngôn ngữ nhỏ và một **interpreter** duyệt cây cú pháp (AST) để "thực thi" nó. Mỗi luật ngữ pháp = một class; `interpret(context)` đệ quy.\n\n' +
    'Dùng khi: bạn có một **DSL đơn giản, ổn định** cần đánh giá lặp đi lặp lại — biểu thức boolean/số học, rule engine đơn giản, query filter, template.\n\n' +
    'KHÔNG dùng khi: ngữ pháp phức tạp/hay đổi → dùng parser generator (ANTLR) + Visitor, hoặc nhúng một ngôn ngữ script có sẵn (Groovy, JS). Interpreter thủ công không scale với ngữ pháp lớn.',
  essence:
    'Interpreter là pattern **ít dùng nhất** của GoF. Nó hợp lý cho DSL cực nhỏ và cố định. Ngữ pháp thật sự → dùng công cụ chuyên dụng, đừng tự viết một class cho mỗi luật.',
  example:
    'Rule "hiển thị banner": DSL `age > 18 AND (country == "VN" OR isVip)`. Parse thành AST gồm `AndExpr`, `OrExpr`, `GreaterThan`, `Equals`, `Variable`. `expr.interpret(userContext)` → boolean. Đủ nhỏ và ổn định để tự viết. Nếu DSL phình thêm hàm, vòng lặp → chuyển sang nhúng scripting.',
  viz: {
    type: 'tree',
    title: 'Pattern ít dùng nhất của GoF',
    root: {
      label: 'Ngữ pháp cho một ngôn ngữ nhỏ + interpreter duyệt AST',
      children: [
        { label: 'Dùng khi: DSL đơn giản, ỔN ĐỊNH', note: 'biểu thức boolean/số học, rule engine đơn giản, query filter, template' },
        { label: 'Mỗi luật ngữ pháp = một class', note: 'interpret(context) đệ quy' },
        { label: 'KHÔNG dùng khi ngữ pháp phức tạp/hay đổi', note: 'parser generator (ANTLR) + Visitor' },
        { label: 'Hoặc nhúng ngôn ngữ script có sẵn', note: 'Groovy, JS — interpreter thủ công không scale với ngữ pháp lớn' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Định nghĩa ngữ pháp và diễn giải câu",
      code:
        "// Interpreter biểu diễn NGỮ PHÁP của một ngôn ngữ nhỏ dưới dạng cây object,\n" +
        "// mỗi nút biết cách tự \"diễn giải\" chính mình.\n" +
        "public interface Expression {\n" +
        "    boolean interpret(Map<String, Object> context);\n" +
        "}\n" +
        "\n" +
        "public record EqualsExpression(String field, Object value) implements Expression {\n" +
        "    public boolean interpret(Map<String, Object> ctx) {\n" +
        "        return Objects.equals(ctx.get(field), value);\n" +
        "    }\n" +
        "}\n" +
        "public record AndExpression(Expression left, Expression right) implements Expression {\n" +
        "    public boolean interpret(Map<String, Object> ctx) {\n" +
        "        return left.interpret(ctx) && right.interpret(ctx);\n" +
        "    }\n" +
        "}\n" +
        "public record OrExpression(Expression left, Expression right) implements Expression {\n" +
        "    public boolean interpret(Map<String, Object> ctx) {\n" +
        "        return left.interpret(ctx) || right.interpret(ctx);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Quy tắc nghiệp vụ \"tier = GOLD AND (country = VN OR country = SG)\":\n" +
        "Expression rule = new AndExpression(\n" +
        "    new EqualsExpression(\"tier\", \"GOLD\"),\n" +
        "    new OrExpression(new EqualsExpression(\"country\", \"VN\"),\n" +
        "                     new EqualsExpression(\"country\", \"SG\")));\n" +
        "\n" +
        "boolean matched = rule.interpret(Map.of(\"tier\", \"GOLD\", \"country\", \"VN\"));\n" +
        "\n" +
        "// KHI NÀO DÙNG: ngôn ngữ NHỎ, ngữ pháp ĐƠN GIẢN và ỔN ĐỊNH —\n" +
        "//  - quy tắc nghiệp vụ do người dùng cấu hình (bộ lọc, điều kiện khuyến mãi)\n" +
        "//  - biểu thức tìm kiếm\n" +
        "//  - công thức tính toán đơn giản\n" +
        "\n" +
        "// KHI NÀO KHÔNG (gần như luôn):\n" +
        "//  - ngữ pháp phức tạp -> dùng ANTLR/JavaCC sinh parser, đừng viết tay\n" +
        "//  - đã có sẵn thư viện: SpEL, MVEL, JEXL, hoặc quy tắc bằng Drools\n" +
        "//  - hiệu năng quan trọng: cây object diễn giải rất chậm so với code biên dịch\n" +
        "\n" +
        "// Đây là pattern ÍT DÙNG NHẤT trong GoF. Trong Java thực tế,\n" +
        "// Spring Expression Language thường đã đủ:\n" +
        "ExpressionParser parser = new SpelExpressionParser();\n" +
        "parser.parseExpression(\"tier == \u0027GOLD\u0027 and country in {\u0027VN\u0027,\u0027SG\u0027}\")\n" +
        "      .getValue(context, Boolean.class);",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Observer đồng bộ vs bất đồng bộ trong ứng dụng thực — chọn thế nào?',
  answer:
    '**Đồng bộ** (`notify` gọi thẳng, cùng thread, cùng transaction):\n' +
    '- Đơn giản, dễ debug, observer lỗi thì biết ngay.\n' +
    '- Nhược: observer chậm làm chậm subject; observer lỗi có thể rollback thao tác chính; thứ tự observer ảnh hưởng kết quả.\n\n' +
    '**Bất đồng bộ** (đẩy event vào queue/executor, observer xử lý sau):\n' +
    '- Subject không bị chặn; side-effect tách rời.\n' +
    '- Nhược: eventual, cần xử lý lỗi/retry riêng, khó đảm bảo "đã xử lý", có thể xử lý cả khi transaction chính rollback (trừ khi dùng after-commit).\n\n' +
    'Quy tắc: side-effect **phải thành công cùng** thao tác chính → sync; side-effect **độc lập / ra ngoài** (email, cập nhật cache, analytics) → async (và `AFTER_COMMIT`).',
  essence:
    'Sync observer: hệ quả là một phần của giao dịch. Async observer: hệ quả là phản ứng độc lập, best-effort. Nhầm (gửi email sync trong transaction) → email chậm làm treo request, hoặc email đã gửi rồi transaction rollback.',
  example:
    'Spring: `order.place()` phát `OrderPlaced`. `InventoryHandler` — nếu trừ kho phải nguyên tử với đơn hàng → sync, cùng transaction. `EmailHandler`, `AnalyticsHandler` → `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` — chạy sau khi đơn hàng chắc chắn đã commit, không làm chậm response.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Observer đồng bộ', 'Observer bất đồng bộ'],
    rows: [
      ['Chặn subject?', 'có — observer chậm làm chậm subject', 'không'],
      ['Cùng transaction?', 'có — observer lỗi có thể rollback thao tác chính', 'không (dùng AFTER_COMMIT)'],
      ['Debug', 'dễ — lỗi biết ngay', 'khó — cần retry/lỗi riêng'],
      ['Dùng cho', 'side-effect phải thành công CÙNG thao tác chính (trừ kho)', 'side-effect độc lập (email, cache, analytics)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba chế độ, ba mức đảm bảo",
      code:
        "// 1) ĐỒNG BỘ, CÙNG TRANSACTION (mặc định của Spring)\n" +
        "@EventListener\n" +
        "public void on(OrderPlacedEvent e) { auditRepo.save(...); }\n" +
        "// + listener nằm TRONG transaction của publisher -> ghi audit cùng nguyên tử\n" +
        "// - listener CHẬM làm chậm cả nghiệp vụ chính\n" +
        "// - listener LỖI -> ROLLBACK cả việc đặt hàng\n" +
        "// -> Chỉ dùng khi listener THỰC SỰ phải cùng số phận với nghiệp vụ chính.\n" +
        "\n" +
        "// 2) ĐỒNG BỘ, SAU KHI COMMIT\n" +
        "@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)\n" +
        "public void on(OrderPlacedEvent e) { mailer.send(e); }\n" +
        "// + tránh gửi mail rồi transaction lại rollback (lỗi kinh điển)\n" +
        "// - vẫn chặn luồng chính; và listener lỗi thì nghiệp vụ ĐÃ commit rồi\n" +
        "//   -> phải tự xử lý (retry, ghi vào hàng đợi)\n" +
        "// -> Đây là lựa chọn ĐÚNG cho phần lớn tác dụng phụ.\n" +
        "\n" +
        "// 3) BẤT ĐỒNG BỘ\n" +
        "@Async(\"eventExecutor\")\n" +
        "@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)\n" +
        "public void on(OrderPlacedEvent e) { slowExternalCall(e); }\n" +
        "// + không chặn luồng chính\n" +
        "// - MẤT ngữ cảnh: SecurityContext, MDC (traceId), transaction\n" +
        "// - listener lỗi thì KHÔNG AI BIẾT nếu không xử lý riêng\n" +
        "// - tiến trình chết -> MẤT event (nó chỉ nằm trong bộ nhớ)\n" +
        "@Bean(\"eventExecutor\")\n" +
        "Executor executor() {\n" +
        "    var ex = new ThreadPoolTaskExecutor();\n" +
        "    ex.setQueueCapacity(500);                         // CÓ GIỚI HẠN\n" +
        "    ex.setRejectedExecutionHandler(new CallerRunsPolicy());\n" +
        "    return ex;\n" +
        "}\n" +
        "\n" +
        "// KHI CẦN ĐẢM BẢO KHÔNG MẤT: đừng dùng event trong bộ nhớ -> ghi vào\n" +
        "// OUTBOX trong cùng transaction, rồi một tiến trình đẩy sang message queue.\n" +
        "// Đây là ranh giới giữa \"observer trong ứng dụng\" và \"kiến trúc hướng sự kiện\".",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Lambda / first-class function thay thế được pattern nào?',
  answer:
    'Trong ngôn ngữ có function là first-class (Java 8+, Kotlin, JS, Python), nhiều pattern GoF "co lại" thành một hàm:\n' +
    '- **Strategy** → truyền một lambda thay vì class implements interface một-method. `list.sort((a,b) -> ...)`.\n' +
    '- **Command** → `Runnable`/`Supplier`/method reference thay vì class Command.\n' +
    '- **Template Method** → truyền các bước biến thiên làm tham số hàm (higher-order function) thay vì subclass.\n' +
    '- **Observer** → `List<Consumer<Event>>` thay vì interface Observer.\n' +
    '- **Factory Method** → `Supplier<T>` / constructor reference.\n\n' +
    'Pattern không biến mất — **ý định** vẫn đó, chỉ là **hiện thực nhẹ hơn**, ít boilerplate.',
  essence:
    'GoF viết cho ngôn ngữ chỉ có class (C++/Java cũ). Nhiều pattern là "cách mô phỏng first-class function bằng class". Có lambda rồi thì dùng lambda — nhưng vẫn nên biết tên pattern để giao tiếp và để nhận ra khi cần class đầy đủ (state, nhiều method).',
  example:
    'Trước Java 8: `Collections.sort(list, new Comparator<User>() { public int compare(...) {...} })` (Strategy dạng anonymous class). Java 8+: `list.sort(comparing(User::getAge).thenComparing(User::getName))`. Cùng pattern Strategy, ngắn hơn 5 lần.',
  viz: {
    type: 'compare',
    corner: 'Pattern',
    cols: ['GoF cổ điển (class)', 'Lambda / first-class function'],
    rows: [
      ['Strategy', 'class implements interface một-method', 'truyền lambda: list.sort((a,b) -> ...)'],
      ['Command', 'class Command', 'Runnable / Supplier / method reference'],
      ['Template Method', 'subclass override method', 'truyền các bước làm tham số (higher-order function)'],
      ['Observer', 'interface Observer', 'List<Consumer<Event>>'],
      ['Factory Method', 'subclass', 'Supplier<T> / constructor reference'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Nhiều pattern GoF chỉ là cách lách giới hạn ngôn ngữ",
      code:
        "// STRATEGY -> hàm\n" +
        "// Trước:  interface Comparator + class cài đặt\n" +
        "// Nay:\n" +
        "list.sort(Comparator.comparing(Order::total).reversed());\n" +
        "Function<Order, Money> pricing = o -> o.total().multiply(0.9);\n" +
        "\n" +
        "// COMMAND -> Runnable/Callable\n" +
        "executor.submit(() -> orderService.place(request));      // command = lambda\n" +
        "List<Runnable> undoStack = new ArrayList<>();\n" +
        "undoStack.add(() -> cart.remove(item));\n" +
        "\n" +
        "// TEMPLATE METHOD -> hàm bậc cao (truyền các bước vào)\n" +
        "public <T> T withTransaction(Function<Session, T> work) {\n" +
        "    var tx = session.beginTransaction();\n" +
        "    try { T r = work.apply(session); tx.commit(); return r; }\n" +
        "    catch (Exception e) { tx.rollback(); throw e; }\n" +
        "}\n" +
        "withTransaction(s -> s.save(order));      // khung cố định, bước biến thiên\n" +
        "\n" +
        "// FACTORY METHOD -> Supplier / method reference\n" +
        "Supplier<Connection> factory = DriverManager::getConnection;\n" +
        "\n" +
        "// OBSERVER -> Consumer\n" +
        "List<Consumer<Order>> listeners = new ArrayList<>();\n" +
        "listeners.add(o -> mailer.send(o));\n" +
        "listeners.forEach(l -> l.accept(order));\n" +
        "\n" +
        "// VISITOR -> sealed interface + pattern matching (Java 21)\n" +
        "sealed interface Shape permits Circle, Square { }\n" +
        "double area(Shape s) {\n" +
        "    return switch (s) {\n" +
        "        case Circle c -> Math.PI * c.r() * c.r();\n" +
        "        case Square q -> q.side() * q.side();\n" +
        "    };                            // compiler ĐẢM BẢO xử lý hết\n" +
        "}\n" +
        "\n" +
        "// DECORATOR -> function composition\n" +
        "Function<String, String> pipeline = ((Function<String, String>) this::trim)\n" +
        "    .andThen(this::normalize).andThen(this::validate);\n" +
        "\n" +
        "// KHI NÀO VẪN CẦN CLASS: cần STATE, cần TÊN có ý nghĩa, cần tiêm phụ thuộc,\n" +
        "// cần test riêng, hoặc logic dài hơn vài dòng.\n" +
        "// Ý CHÍNH: pattern là GIẢI PHÁP cho vấn đề, không phải mục tiêu. Ngôn ngữ\n" +
        "// tiến hoá thì cách giải quyết cũng đổi — nhưng VẤN ĐỀ thì vẫn còn đó.",
    },
  ],
},
]);
