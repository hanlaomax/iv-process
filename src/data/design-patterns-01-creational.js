SS.addQuestions('design-patterns', [
{
  cat: 'Tổng quan',
  q: 'Design pattern là gì? GoF phân loại thành mấy nhóm? Khi nào KHÔNG nên dùng?',
  answer:
    '**Design pattern** = giải pháp tái sử dụng cho một vấn đề thiết kế thường gặp trong một ngữ cảnh nhất định. Không phải code copy-paste mà là **khuôn mẫu tư duy** + từ vựng chung để giao tiếp.\n\n' +
    'GoF (Gang of Four) chia 23 mẫu thành 3 nhóm:\n' +
    '- **Creational** (5): cách tạo object — Singleton, Factory Method, Abstract Factory, Builder, Prototype.\n' +
    '- **Structural** (7): cách ghép object/class — Adapter, Decorator, Proxy, Facade, Composite, Bridge, Flyweight.\n' +
    '- **Behavioral** (11): cách các object tương tác & phân chia trách nhiệm — Strategy, Observer, Template Method, Command, State, Chain of Responsibility, Iterator, Mediator, Visitor, Memento, Interpreter.\n\n' +
    'KHÔNG dùng khi: vấn đề chưa xuất hiện (YAGNI), pattern làm code phức tạp hơn giải pháp trực tiếp, hoặc ngôn ngữ đã có sẵn cơ chế (lambda thay Strategy, first-class function thay Command).',
  essence:
    'Pattern là công cụ giao tiếp và tái dùng kinh nghiệm, không phải mục tiêu. "Áp pattern" trước khi có vấn đề = over-engineering. Nhận ra pattern *đang hình thành* trong code rồi mới đặt tên/tinh chỉnh thì tốt hơn.',
  example:
    'Code review: "hàm này nhận một object có method `execute()`, lưu vào list, chạy sau" — đó chính là Command pattern, dù không ai cố ý. Đặt tên interface là `Command`, thêm `undo()` khi cần. Ngược lại, viết `AbstractFactoryProviderStrategy` cho một `if` hai nhánh là lạm dụng.',
  viz: {
    type: 'tree',
    title: 'Pattern là công cụ giao tiếp, không phải mục tiêu',
    root: {
      label: 'GoF: 23 mẫu, 3 nhóm',
      children: [
        { label: 'Creational (5)', note: 'cách tạo object — Singleton, Factory Method, Abstract Factory, Builder, Prototype' },
        { label: 'Structural (7)', note: 'cách ghép object/class — Adapter, Decorator, Proxy, Facade, Composite, Bridge, Flyweight' },
        { label: 'Behavioral (11)', note: 'cách object tương tác — Strategy, Observer, Template Method, Command, State, Chain, Iterator, Mediator, Visitor, Memento, Interpreter' },
        { label: 'KHÔNG dùng khi', note: 'vấn đề chưa xuất hiện (YAGNI); pattern làm code phức tạp hơn; ngôn ngữ đã có cơ chế (lambda thay Strategy)' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba nhóm, và khi nào pattern làm hại nhiều hơn giúp",
      code:
        "// GoF (1994) chia 23 pattern thành ba nhóm theo MỤC ĐÍCH:\n" +
        "// 1) CREATIONAL — cách TẠO object: Singleton, Factory Method, Abstract\n" +
        "//    Factory, Builder, Prototype\n" +
        "// 2) STRUCTURAL — cách GHÉP class/object: Adapter, Decorator, Proxy,\n" +
        "//    Facade, Composite, Bridge, Flyweight\n" +
        "// 3) BEHAVIORAL — cách object GIAO TIẾP: Strategy, Observer, Command,\n" +
        "//    State, Template Method, Chain of Responsibility, Iterator, Mediator,\n" +
        "//    Memento, Visitor, Interpreter\n" +
        "\n" +
        "// Pattern là TÊN GỌI CHUNG cho một giải pháp lặp lại — giá trị lớn nhất\n" +
        "// của nó là ở việc GIAO TIẾP: nói \"dùng Strategy ở đây\" ngắn hơn nhiều\n" +
        "// so với mô tả cả thiết kế.\n" +
        "\n" +
        "// KHI NÀO KHÔNG NÊN DÙNG:\n" +
        "// SAI — dùng pattern vì \"thấy hay\", cho một bài toán không hề tồn tại:\n" +
        "interface GreetingStrategy { String greet(String name); }\n" +
        "class VietnameseGreeting implements GreetingStrategy { ... }\n" +
        "class GreetingFactory { static GreetingStrategy create(String lang) { ... } }\n" +
        "class GreetingService { private final GreetingFactory factory; ... }\n" +
        "// 4 class, 1 interface... cho việc này:\n" +
        "String greet(String name) { return \"Xin chào \" + name; }\n" +
        "\n" +
        "// ĐÚNG — thêm pattern khi ĐÃ CÓ áp lực thay đổi thật:\n" +
        "//  - đã có 3+ biến thể của cùng một hành vi\n" +
        "//  - đã phải sửa cùng một chỗ nhiều lần vì lý do khác nhau\n" +
        "//  - đã cần test một phần mà không dựng được cả hệ\n" +
        "\n" +
        "// Nhiều pattern của GoF là cách LÁCH giới hạn ngôn ngữ những năm 90.\n" +
        "// Java hiện đại: lambda thay Strategy/Command, record thay Value Object,\n" +
        "// enum thay Singleton, sealed + pattern matching thay Visitor.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Singleton — cách hiện thực đúng (thread-safe) trong Java?',
  answer:
    'Mục tiêu: đúng **một** instance, truy cập toàn cục.\n\n' +
    '- **Enum singleton** (khuyến nghị — Effective Java): `enum Config { INSTANCE; ... }`. Thread-safe, chống reflection, serialize an toàn, ngắn gọn.\n' +
    '- **Initialization-on-demand holder**: instance nằm trong static nested class, chỉ nạp khi lần đầu truy cập → lazy + thread-safe nhờ cơ chế class loading của JVM, không cần `synchronized`.\n' +
    '- **Double-checked locking**: `volatile` instance + kiểm tra 2 lần trong/ngoài `synchronized`. Dễ viết sai (quên `volatile` → thấy object khởi tạo dở).\n' +
    '- **Eager**: `static final INSTANCE = new ...()`. Đơn giản, thread-safe, nhưng tạo ngay cả khi không dùng.',
  essence:
    'Enum singleton hoặc holder idiom giải quyết mọi góc cạnh (lazy, thread-safe, serialize, reflection). Double-checked locking là "bẫy phỏng vấn" — biết nhưng ưu tiên hai cách kia.',
  example:
    '```\nclass Logger {\n  private Logger() {}\n  private static class Holder { static final Logger I = new Logger(); }\n  public static Logger getInstance() { return Holder.I; }\n}\n```\nHolder chỉ được JVM nạp lúc `getInstance()` đầu tiên → lazy + không cần khoá.',
  viz: {
    type: 'compare',
    corner: 'Cách',
    cols: ['Enum singleton', 'Holder idiom', 'Double-checked locking', 'Eager'],
    rows: [
      ['Lazy', 'không', 'có', 'có', 'không'],
      ['Thread-safe', 'có', 'có (class loading)', 'chỉ khi có volatile', 'có'],
      ['Chống reflection / serialize', 'có', 'không', 'không', 'không'],
      ['Đánh giá', 'khuyến nghị (Effective Java)', 'khuyến nghị', '"bẫy phỏng vấn" — dễ viết sai', 'đơn giản, tạo cả khi không dùng'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn cách, và cách nào thật sự đúng",
      code:
        "// CÁCH 1: ENUM — cách ĐÚNG NHẤT (Effective Java, Item 3)\n" +
        "public enum ConfigManager {\n" +
        "    INSTANCE;\n" +
        "    private final Properties props = load();\n" +
        "    public String get(String key) { return props.getProperty(key); }\n" +
        "}\n" +
        "ConfigManager.INSTANCE.get(\"app.name\");\n" +
        "// + JVM đảm bảo duy nhất, thread-safe, chống được cả REFLECTION và\n" +
        "//   SERIALIZATION (hai cách phá vỡ singleton mà các cách khác không chặn được)\n" +
        "// - không kế thừa được class khác, và khởi tạo LƯỜI không được\n" +
        "\n" +
        "// CÁCH 2: HOLDER IDIOM — lười, thread-safe, không cần đồng bộ hoá\n" +
        "public class ConfigManager {\n" +
        "    private ConfigManager() {}\n" +
        "    private static class Holder {           // class con chỉ được NẠP khi\n" +
        "        static final ConfigManager INSTANCE = new ConfigManager();   // lần đầu dùng\n" +
        "    }\n" +
        "    public static ConfigManager getInstance() { return Holder.INSTANCE; }\n" +
        "}\n" +
        "// JVM đảm bảo việc nạp class là thread-safe -> không cần synchronized.\n" +
        "\n" +
        "// CÁCH 3: DOUBLE-CHECKED LOCKING — BẮT BUỘC có volatile\n" +
        "public class ConfigManager {\n" +
        "    private static volatile ConfigManager instance;   // thiếu volatile là SAI\n" +
        "    public static ConfigManager getInstance() {\n" +
        "        if (instance == null) {\n" +
        "            synchronized (ConfigManager.class) {\n" +
        "                if (instance == null) instance = new ConfigManager();\n" +
        "            }\n" +
        "        }\n" +
        "        return instance;\n" +
        "    }\n" +
        "}\n" +
        "// Không có volatile: thread khác có thể thấy tham chiếu KHÁC NULL nhưng\n" +
        "// object CHƯA KHỞI TẠO XONG (do sắp xếp lại lệnh). Lỗi này rất khó tái hiện.\n" +
        "\n" +
        "// CÁCH 4 (SAI): synchronized cả method -> mọi lần gọi đều tranh khoá\n" +
        "public static synchronized ConfigManager getInstance() { ... }",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Vì sao Singleton bị coi là anti-pattern? Dependency Injection thay thế thế nào?',
  answer:
    'Vấn đề của Singleton "cổ điển" (`getInstance()` gọi khắp nơi):\n' +
    '- **Global state ẩn**: khó biết class nào phụ thuộc gì; thay đổi state ảnh hưởng khắp nơi.\n' +
    '- **Khó test**: không mock/thay được; test này ảnh hưởng test kia (shared state); cần reset thủ công.\n' +
    '- **Vi phạm SRP**: class vừa lo nghiệp vụ vừa lo vòng đời của chính nó.\n' +
    '- **Che giấu coupling**: `Foo.getInstance()` không xuất hiện trong chữ ký, "tight coupling" ngầm.\n\n' +
    'DI: vẫn giữ "một instance dùng chung" (container quản lý scope singleton) nhưng **tiêm qua constructor** → phụ thuộc lộ rõ, mock được, không global access point.',
  essence:
    'Vấn đề không phải "một instance" mà là "truy cập toàn cục qua static". DI giữ tính duy nhất (do container), bỏ đi global access và làm phụ thuộc tường minh + testable.',
  example:
    'Thay `class OrderService { void run() { Db.getInstance().save(...); } }` bằng `class OrderService { private final Db db; OrderService(Db db) {...} }`. Container tạo một `Db` duy nhất, tiêm vào. Test: `new OrderService(mockDb)`.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Singleton cổ điển (getInstance)', 'DI (scope singleton)'],
    rows: [
      ['Số instance', 'một', 'một (container quản lý)'],
      ['Truy cập', 'global static — coupling ẩn, không trong chữ ký', 'tiêm qua constructor — phụ thuộc lộ rõ'],
      ['Test', 'không mock được, shared state giữa test', 'new Service(mockDb)'],
      ['SRP', 'vi phạm — class tự lo vòng đời của mình', 'container lo vòng đời'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn vấn đề, và cách DI giải quyết",
      code:
        "// SINGLETON CỔ ĐIỂN:\n" +
        "public class OrderService {\n" +
        "    public void place(Order o) {\n" +
        "        PaymentGateway.getInstance().charge(o);   // PHỤ THUỘC ẨN\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// VẤN ĐỀ 1: PHỤ THUỘC BỊ GIẤU. Nhìn chữ ký của OrderService không biết\n" +
        "//   nó cần PaymentGateway -> không đọc hết code thì không hiểu.\n" +
        "// VẤN ĐỀ 2: KHÔNG TEST ĐƯỢC. Không thay được bằng mock (trừ khi dùng\n" +
        "//   PowerMock hoặc thêm setter — cả hai đều là dấu hiệu thiết kế sai).\n" +
        "// VẤN ĐỀ 3: TRẠNG THÁI TOÀN CỤC. Test này làm bẩn test kia, và thứ tự\n" +
        "//   chạy test ảnh hưởng kết quả.\n" +
        "// VẤN ĐỀ 4: VÒNG ĐỜI CỨNG. Không có instance khác nhau cho từng tenant,\n" +
        "//   từng môi trường, hay từng request.\n" +
        "\n" +
        "// DI GIẢI QUYẾT: vẫn MỘT instance, nhưng do CONTAINER quản lý\n" +
        "@Service                                 // Spring: mặc định singleton scope\n" +
        "public class OrderService {\n" +
        "    private final PaymentGateway gateway;\n" +
        "    public OrderService(PaymentGateway gateway) {    // phụ thuộc TƯỜNG MINH\n" +
        "        this.gateway = gateway;\n" +
        "    }\n" +
        "    public void place(Order o) { gateway.charge(o); }\n" +
        "}\n" +
        "\n" +
        "// Test trở nên tầm thường:\n" +
        "@Test void test() {\n" +
        "    var mock = mock(PaymentGateway.class);\n" +
        "    new OrderService(mock).place(order);              // không cần framework\n" +
        "    verify(mock).charge(order);\n" +
        "}\n" +
        "\n" +
        "// KHI NÀO SINGLETON CỔ ĐIỂN VẪN ỔN: object KHÔNG TRẠNG THÁI và thật sự\n" +
        "// toàn cục (logger, hằng số), hoặc trong code không có container DI.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Factory Method pattern — vấn đề nó giải quyết và cấu trúc?',
  answer:
    'Định nghĩa một **method để tạo object**, nhưng để **lớp con quyết định** class cụ thể nào được tạo. Client làm việc với interface/abstract, không `new` class cụ thể.\n\n' +
    'Cấu trúc: `abstract class Creator { abstract Product createProduct(); void doWork() { Product p = createProduct(); ... } }` → `ConcreteCreatorA extends Creator { Product createProduct() { return new ProductA(); } }`.\n\n' +
    'Dùng khi: một class không biết trước phải tạo loại object nào; muốn để lớp con mở rộng loại object; muốn tách "logic dùng object" khỏi "logic tạo object".',
  essence:
    'Factory Method đảo ngược quyền chọn class cụ thể: superclass định nghĩa *quy trình*, subclass cắm vào *sản phẩm cụ thể*. Là "Template Method áp cho việc tạo object".',
  example:
    '`abstract class Dialog { abstract Button createButton(); void render() { createButton().onClick(...); } }`. `WindowsDialog` tạo `WindowsButton`, `WebDialog` tạo `HtmlButton`. Code render dùng chung, chỉ khác loại button do subclass quyết.',
  viz: {
    type: 'flow',
    title: '"Template Method áp cho việc tạo object"',
    nodes: ['Creator.doWork() — quy trình chung', 'gọi createProduct() (abstract)', 'Subclass override → chọn class cụ thể', 'Client dùng Product qua interface'],
    steps: [
      { to: 0, label: 'Superclass định nghĩa quy trình' },
      { to: 2, label: 'ConcreteCreatorA → new ProductA; WindowsDialog → WindowsButton' },
      { to: 3, label: 'Tách "logic dùng object" khỏi "logic tạo object"' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Để lớp con quyết định tạo object nào",
      code:
        "// VẤN ĐỀ: code có logic chung, nhưng LOẠI object cần tạo lại khác nhau\n" +
        "// theo ngữ cảnh. Dùng new trực tiếp -> gắn chặt vào class cụ thể.\n" +
        "public abstract class DocumentExporter {\n" +
        "\n" +
        "    // TEMPLATE: khung xử lý CỐ ĐỊNH\n" +
        "    public final byte[] export(Report report) {\n" +
        "        Formatter formatter = createFormatter();     // <- FACTORY METHOD\n" +
        "        formatter.writeHeader(report.title());\n" +
        "        report.rows().forEach(formatter::writeRow);\n" +
        "        return formatter.finish();\n" +
        "    }\n" +
        "\n" +
        "    // Lớp con quyết định tạo cái gì\n" +
        "    protected abstract Formatter createFormatter();\n" +
        "}\n" +
        "\n" +
        "public class PdfExporter extends DocumentExporter {\n" +
        "    @Override protected Formatter createFormatter() { return new PdfFormatter(); }\n" +
        "}\n" +
        "public class ExcelExporter extends DocumentExporter {\n" +
        "    @Override protected Formatter createFormatter() { return new ExcelFormatter(); }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: DocumentExporter KHÔNG biết gì về PdfFormatter/ExcelFormatter.\n" +
        "// Thêm định dạng mới = thêm một lớp con, KHÔNG sửa code cũ (OCP).\n" +
        "\n" +
        "// TRONG JAVA HIỆN ĐẠI, thường không cần cả hệ thống lớp con:\n" +
        "public class DocumentExporter {\n" +
        "    private final Supplier<Formatter> factory;        // truyền hàm tạo vào\n" +
        "    public DocumentExporter(Supplier<Formatter> factory) { this.factory = factory; }\n" +
        "    public byte[] export(Report r) { Formatter f = factory.get(); ... }\n" +
        "}\n" +
        "new DocumentExporter(PdfFormatter::new).export(report);\n" +
        "// Ngắn hơn nhiều và linh hoạt hơn. Chỉ dùng lớp con khi lớp con còn ghi\n" +
        "// đè các hành vi KHÁC nữa, không chỉ mỗi việc tạo object.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Abstract Factory — khác Factory Method thế nào?',
  answer:
    '**Abstract Factory**: cung cấp interface để tạo **cả một họ object liên quan** mà không chỉ định class cụ thể. Mỗi "concrete factory" tạo ra một họ nhất quán.\n\n' +
    '```\ninterface GuiFactory { Button createButton(); Checkbox createCheckbox(); }\nclass MacFactory implements GuiFactory { ... tạo MacButton, MacCheckbox }\nclass WinFactory implements GuiFactory { ... tạo WinButton, WinCheckbox }\n```\n\n' +
    'Khác Factory Method:\n' +
    '- Factory Method: **một** sản phẩm, dùng **kế thừa** (override method).\n' +
    '- Abstract Factory: **nhiều** sản phẩm cùng họ, dùng **composition** (client giữ một `GuiFactory`).\n' +
    '- Abstract Factory thường **chứa nhiều** Factory Method bên trong.',
  essence:
    'Factory Method tạo một thứ; Abstract Factory tạo một bộ thứ đi cùng nhau và đảm bảo chúng **tương thích** (không lẫn MacButton với WinCheckbox).',
  example:
    'App chạy đa nền tảng: inject `GuiFactory` phù hợp lúc khởi động (`macOS` → `MacFactory`). Mọi UI component được tạo qua factory đó → giao diện nhất quán, thêm nền tảng Linux = thêm một `LinuxFactory`.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Factory Method', 'Abstract Factory'],
    rows: [
      ['Tạo ra', 'MỘT sản phẩm', 'MỘT HỌ sản phẩm liên quan'],
      ['Cơ chế', 'kế thừa (override method)', 'composition (client giữ một factory)'],
      ['Đảm bảo', '—', 'các sản phẩm tương thích (không lẫn MacButton với WinCheckbox)'],
      ['Quan hệ', '—', 'Abstract Factory thường chứa nhiều Factory Method'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tạo cả một HỌ sản phẩm khớp nhau",
      code:
        "// ABSTRACT FACTORY tạo NHIỀU loại object LIÊN QUAN, đảm bảo chúng khớp nhau.\n" +
        "public interface UiFactory {\n" +
        "    Button createButton();\n" +
        "    Checkbox createCheckbox();\n" +
        "    Dialog createDialog();          // cả HỌ sản phẩm\n" +
        "}\n" +
        "\n" +
        "public class MaterialUiFactory implements UiFactory {\n" +
        "    public Button createButton()     { return new MaterialButton(); }\n" +
        "    public Checkbox createCheckbox() { return new MaterialCheckbox(); }\n" +
        "    public Dialog createDialog()     { return new MaterialDialog(); }\n" +
        "}\n" +
        "public class CupertinoUiFactory implements UiFactory {\n" +
        "    public Button createButton()     { return new CupertinoButton(); }\n" +
        "    public Checkbox createCheckbox() { return new CupertinoCheckbox(); }\n" +
        "    public Dialog createDialog()     { return new CupertinoDialog(); }\n" +
        "}\n" +
        "\n" +
        "// Client dùng MỘT factory -> mọi thành phần CHẮC CHẮN cùng một bộ giao diện\n" +
        "public class Screen {\n" +
        "    private final UiFactory ui;\n" +
        "    public Screen(UiFactory ui) { this.ui = ui; }\n" +
        "    public void render() {\n" +
        "        ui.createButton().draw();\n" +
        "        ui.createCheckbox().draw();     // không bao giờ lẫn Material với Cupertino\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// KHÁC BIỆT CỐT LÕI:\n" +
        "//  FACTORY METHOD   — tạo MỘT loại object; biến thể chọn bằng KẾ THỪA\n" +
        "//  ABSTRACT FACTORY — tạo MỘT HỌ object liên quan; biến thể chọn bằng\n" +
        "//                     việc truyền vào một factory khác (COMPOSITION)\n" +
        "\n" +
        "// VÍ DỤ THỰC TẾ: DataSource/Connection/Statement của JDBC theo từng loại DB;\n" +
        "// bộ parser/serializer theo định dạng; bộ client theo môi trường (thật/giả lập).\n" +
        "// ĐIỂM YẾU: thêm một loại sản phẩm mới vào HỌ -> phải sửa MỌI factory.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Simple Factory, Factory Method, Abstract Factory — phân biệt nhanh?',
  answer:
    '- **Simple Factory** (không phải GoF, chỉ là idiom): một class/method với `switch/if` trả về object theo tham số. `ShapeFactory.create("circle")`. Đơn giản, nhưng thêm loại phải sửa factory (vi phạm OCP).\n' +
    '- **Factory Method** (GoF): method tạo object được **override bởi subclass**. Thêm loại = thêm subclass, không sửa code cũ.\n' +
    '- **Abstract Factory** (GoF): tạo **họ object** liên quan; client chọn một concrete factory.\n\n' +
    'Độ phức tạp tăng dần. Đa số trường hợp thực tế **Simple Factory là đủ** (hoặc chỉ cần một static factory method).',
  essence:
    'Đừng nhảy thẳng vào Abstract Factory. Bắt đầu bằng constructor hoặc simple factory; leo lên Factory Method khi cần subclass mở rộng loại; lên Abstract Factory khi có *nhiều họ* sản phẩm phải nhất quán.',
  example:
    'Parse config theo định dạng: Simple Factory `ParserFactory.forExtension(".json")` với switch là đủ. Nếu bạn có "họ" gồm parser + serializer + validator theo từng định dạng và chúng phải khớp nhau → Abstract Factory.',
  viz: {
    type: 'layers',
    title: 'Độ phức tạp tăng dần — đừng nhảy thẳng vào Abstract Factory',
    dir: 'up',
    layers: [
      { name: 'Simple Factory', tag: 'không phải GoF', note: 'class/method với switch/if trả object theo tham số — thêm loại phải sửa factory (vi phạm OCP). Đa số trường hợp là đủ' },
      { name: 'Factory Method', tag: 'GoF', note: 'method tạo object được override bởi subclass — thêm loại = thêm subclass, không sửa code cũ' },
      { name: 'Abstract Factory', tag: 'GoF', note: 'tạo HỌ object liên quan; client chọn một concrete factory — khi có nhiều họ phải nhất quán' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba mức độ, từ đơn giản tới phức tạp",
      code:
        "// 1) SIMPLE FACTORY — không phải pattern GoF, chỉ là một method tập trung\n" +
        "//    việc tạo object. Dùng nhiều nhất trong thực tế vì đơn giản.\n" +
        "public class PaymentFactory {\n" +
        "    public static PaymentGateway create(String type) {\n" +
        "        return switch (type) {\n" +
        "            case \"stripe\" -> new StripeGateway();\n" +
        "            case \"paypal\" -> new PaypalGateway();\n" +
        "            default -> throw new IllegalArgumentException(type);\n" +
        "        };\n" +
        "    }\n" +
        "}\n" +
        "// - Thêm loại mới phải SỬA switch (vi phạm OCP), nhưng đổi lại rất dễ đọc.\n" +
        "\n" +
        "// 2) FACTORY METHOD — lớp con quyết định, KHÔNG phải sửa code cũ\n" +
        "public abstract class PaymentProcessor {\n" +
        "    protected abstract PaymentGateway createGateway();      // lớp con cài đặt\n" +
        "    public final void process(Order o) { createGateway().charge(o); }\n" +
        "}\n" +
        "\n" +
        "// 3) ABSTRACT FACTORY — tạo cả HỌ object khớp nhau\n" +
        "public interface PaymentKit {\n" +
        "    PaymentGateway gateway();\n" +
        "    RefundHandler refunds();\n" +
        "    ReportGenerator reports();\n" +
        "}\n" +
        "\n" +
        "// CHỌN THEO CÂU HỎI:\n" +
        "//  - chỉ cần gom việc tạo object vào một chỗ?        -> SIMPLE FACTORY\n" +
        "//  - cần lớp con quyết định tạo gì, và không muốn sửa code cũ? -> FACTORY METHOD\n" +
        "//  - cần nhiều object LIÊN QUAN phải khớp nhau?      -> ABSTRACT FACTORY\n" +
        "\n" +
        "// TRONG SPRING, phần lớn nhu cầu này được giải quyết bằng DI:\n" +
        "@Service\n" +
        "public class PaymentProcessor {\n" +
        "    private final Map<String, PaymentGateway> gateways;   // Spring tiêm TẤT CẢ\n" +
        "    public void process(Order o) { gateways.get(o.method()).charge(o); }\n" +
        "}\n" +
        "// -> thêm gateway mới = thêm một @Component, không sửa dòng nào.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Builder pattern — khi nào dùng, cấu trúc thế nào?',
  answer:
    'Tách việc **xây dựng** một object phức tạp khỏi **biểu diễn** của nó, cho phép tạo từng bước và tái dùng quy trình.\n\n' +
    'Dùng khi:\n' +
    '- Object có **nhiều tham số** (nhất là nhiều optional) → constructor lồng nhau (telescoping) không đọc được.\n' +
    '- Cần **bất biến** (immutable) nhưng có nhiều field.\n' +
    '- Xây object theo nhiều bước, có validation ở cuối.\n\n' +
    '```\nUser u = User.builder()\n  .name("An").email("a@x.com")\n  .age(30)              // optional\n  .build();             // validate ở đây\n```\n\n' +
    'Biến thể GoF: `Director` điều khiển các `Builder` khác nhau để tạo biểu diễn khác nhau từ cùng quy trình.',
  essence:
    'Builder = "constructor có tên tham số + optional + immutable + validation một chỗ". Nó giải quyết vấn đề "constructor 8 tham số, không biết tham số thứ 5 là gì".',
  example:
    '`new HttpRequest("GET", "/api", null, headers, null, 30, true, false)` → không đọc được. `HttpRequest.builder().method(GET).url("/api").header("Auth", tok).timeout(30).build()` → rõ ràng, chỉ set cái cần, `build()` kiểm tra url không null.',
  viz: {
    type: 'flow',
    title: '"Constructor có tên tham số + optional + immutable + validation một chỗ"',
    nodes: ['builder()', 'set từng field (fluent, .withX() trả this)', 'build() — validate invariant', 'Object bất biến, luôn hợp lệ'],
    steps: [
      { to: 1, label: 'Chỉ set cái cần — optional bỏ qua' },
      { to: 2, label: 'Kiểm bắt buộc có gì, giá trị hợp lệ không → ném lỗi với message rõ' },
      { to: 3, label: 'Dùng khi ≥ 4–5 tham số, hoặc nhiều optional, hoặc cần immutable' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Nhiều tham số, nhiều tuỳ chọn, và object bất biến",
      code:
        "// VẤN ĐỀ: constructor với 8 tham số, một nửa là tuỳ chọn\n" +
        "new Order(id, customerId, items, null, null, \"VND\", null, true);   // không đọc nổi\n" +
        "\n" +
        "// BUILDER:\n" +
        "public final class Order {\n" +
        "    private final String id;\n" +
        "    private final String customerId;\n" +
        "    private final List<Item> items;\n" +
        "    private final String currency;\n" +
        "    private final String note;\n" +
        "\n" +
        "    private Order(Builder b) {          // constructor PRIVATE\n" +
        "        this.id = b.id;\n" +
        "        this.customerId = b.customerId;\n" +
        "        this.items = List.copyOf(b.items);      // bản sao BẤT BIẾN\n" +
        "        this.currency = b.currency;\n" +
        "        this.note = b.note;\n" +
        "    }\n" +
        "\n" +
        "    public static Builder builder() { return new Builder(); }\n" +
        "\n" +
        "    public static final class Builder {\n" +
        "        private String id;\n" +
        "        private String customerId;\n" +
        "        private List<Item> items = new ArrayList<>();\n" +
        "        private String currency = \"VND\";        // giá trị MẶC ĐỊNH\n" +
        "        private String note;\n" +
        "\n" +
        "        public Builder id(String id)              { this.id = id; return this; }\n" +
        "        public Builder customerId(String c)       { this.customerId = c; return this; }\n" +
        "        public Builder addItem(Item i)            { this.items.add(i); return this; }\n" +
        "        public Builder currency(String c)         { this.currency = c; return this; }\n" +
        "        public Builder note(String n)             { this.note = n; return this; }\n" +
        "\n" +
        "        public Order build() {\n" +
        "            // VALIDATE TẬP TRUNG — object không bao giờ tồn tại ở trạng thái sai\n" +
        "            if (id == null) throw new IllegalStateException(\"thiếu id\");\n" +
        "            if (items.isEmpty()) throw new IllegalStateException(\"đơn rỗng\");\n" +
        "            return new Order(this);\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "Order o = Order.builder().id(\"O-1\").customerId(\"C-1\")\n" +
        "               .addItem(new Item(\"SKU-1\", 2)).note(\"giao buổi sáng\").build();\n" +
        "\n" +
        "// KHI NÀO DÙNG: từ ~4-5 tham số trở lên, hoặc có nhiều tham số TUỲ CHỌN,\n" +
        "// hoặc cần object BẤT BIẾN có validate.\n" +
        "// Lombok @Builder sinh sẵn; record + builder cũng kết hợp được.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Builder vs telescoping constructor vs JavaBeans setter?',
  answer:
    '- **Telescoping constructor**: `C(a)`, `C(a,b)`, `C(a,b,c)`… Người đọc phải đếm tham số; dễ truyền nhầm thứ tự (hai `int` liền nhau); bùng nổ số constructor.\n' +
    '- **JavaBeans (setter)**: `new C(); c.setA(); c.setB();` → đọc được, nhưng object **có thể ở trạng thái không nhất quán** giữa các lời gọi setter, và **không thể immutable**, không thread-safe.\n' +
    '- **Builder**: đọc được như setter + object cuối cùng **immutable** + validate trong `build()` + không có trạng thái nửa vời.\n\n' +
    'Builder tốn code hơn (hoặc dùng Lombok `@Builder`, record + compact constructor).',
  essence:
    'Builder lấy tính đọc được của setter và tính an toàn (immutable, nhất quán, validate) của constructor — với chi phí một ít boilerplate. Đáng dùng khi ≥ 4–5 tham số hoặc cần immutability.',
  example:
    '`Pizza`: size bắt buộc, topping tuỳ chọn nhiều loại. Setter → có thể quên set size, hoặc dùng pizza khi mới set nửa. Builder → `Pizza.builder().size(LARGE).addTopping(CHEESE).addTopping(HAM).build()` trả về pizza hoàn chỉnh, bất biến.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Telescoping constructor', 'JavaBeans (setter)', 'Builder'],
    rows: [
      ['Đọc được', 'không (đếm tham số, dễ nhầm thứ tự)', 'có', 'có'],
      ['Immutable', 'có', 'KHÔNG', 'có'],
      ['Trạng thái nửa vời', 'không', 'có (giữa các setter)', 'không'],
      ['Validate', 'trong constructor', 'rải rác / không', 'dồn vào build()'],
      ['Chi phí', 'bùng nổ số constructor', 'ít code', 'boilerplate (hoặc Lombok @Builder)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba cách khởi tạo, hai cách có vấn đề thật",
      code:
        "// 1) TELESCOPING CONSTRUCTOR — chồng constructor\n" +
        "public Pizza(int size) { this(size, false); }\n" +
        "public Pizza(int size, boolean cheese) { this(size, cheese, false); }\n" +
        "public Pizza(int size, boolean cheese, boolean pepperoni) { ... }\n" +
        "new Pizza(12, true, false, true, false, true);     // tham số nào là gì?\n" +
        "// - KHÔNG ĐỌC ĐƯỢC, và hoán đổi nhầm hai boolean thì compiler KHÔNG BÁO LỖI\n" +
        "// - số tổ hợp bùng nổ khi thêm tuỳ chọn\n" +
        "\n" +
        "// 2) JAVABEANS SETTER\n" +
        "Pizza p = new Pizza();\n" +
        "p.setSize(12);\n" +
        "p.setCheese(true);\n" +
        "// - object tồn tại ở trạng thái NỬA VỜI giữa các lệnh set (nguy hiểm khi\n" +
        "//   chia sẻ giữa thread, và khi có exception ở giữa)\n" +
        "// - KHÔNG BẤT BIẾN được -> không thread-safe, không dùng làm key\n" +
        "// - không validate tập trung được\n" +
        "\n" +
        "// 3) BUILDER — giải quyết cả hai\n" +
        "Pizza p = Pizza.builder().size(12).cheese(true).pepperoni(true).build();\n" +
        "// + đọc như văn xuôi, tên tham số hiện rõ\n" +
        "// + object BẤT BIẾN và LUÔN hợp lệ (validate trong build())\n" +
        "// + thêm tuỳ chọn mới không phá vỡ code cũ\n" +
        "// - nhiều code hơn (Lombok @Builder giải quyết)\n" +
        "\n" +
        "// TRONG JAVA HIỆN ĐẠI, với ÍT tham số thì RECORD là đủ:\n" +
        "public record Pizza(int size, boolean cheese, boolean pepperoni) {\n" +
        "    public Pizza {                            // compact constructor: validate\n" +
        "        if (size < 6) throw new IllegalArgumentException(\"nhỏ quá\");\n" +
        "    }\n" +
        "}\n" +
        "// Record cho bất biến + equals/hashCode/toString miễn phí. Chỉ thêm builder\n" +
        "// khi số tham số lớn hoặc có nhiều giá trị mặc định.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Prototype pattern — tạo object bằng cách sao chép?',
  answer:
    'Tạo object mới bằng cách **clone một prototype** có sẵn thay vì `new` + cấu hình lại từ đầu.\n\n' +
    'Dùng khi:\n' +
    '- Khởi tạo object **tốn kém** (query DB, tính toán, đọc file) và bạn cần nhiều bản gần giống.\n' +
    '- Số lượng "loại" object không biết trước lúc compile — giữ một registry các prototype, clone khi cần.\n' +
    '- Muốn tránh hệ thống factory class song song với hệ thống product class.\n\n' +
    'Java: `Cloneable`/`clone()` nhiều khiếm khuyết → thực tế dùng **copy constructor** hoặc method `copy()`. Chú ý shallow vs deep copy.',
  essence:
    'Prototype = "tạo bằng sao chép mẫu". Hữu ích khi cấu hình một object phức tạp/đắt và cần nhiều biến thể của nó. Trong Java, hiện thực bằng copy constructor, không phải `Cloneable`.',
  example:
    'Editor đồ hoạ: người dùng cấu hình một "brush" phức tạp (nhiều tham số). Nhấn "nhân bản" → clone brush đó rồi chỉnh vài tham số, thay vì dựng lại từ mặc định. Game: `enemyPrototype` được clone để spawn hàng loạt enemy giống nhau.',
  viz: {
    type: 'tree',
    title: '"Tạo bằng sao chép mẫu"',
    root: {
      label: 'Clone một prototype có sẵn thay vì new + cấu hình lại từ đầu',
      children: [
        { label: 'Khởi tạo tốn kém', note: 'query DB, tính toán, đọc file — cần nhiều bản gần giống' },
        { label: 'Loại object không biết trước lúc compile', note: 'giữ registry các prototype, clone khi cần' },
        { label: 'Tránh hệ thống factory class song song với product class', note: '' },
        { label: 'Java', note: 'dùng copy constructor / method copy(), không Cloneable. Chú ý shallow vs deep copy' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Sao chép một mẫu có sẵn thay vì dựng từ đầu",
      code:
        "// DÙNG KHI: việc TẠO object tốn kém (đọc file, gọi mạng, tính toán nặng)\n" +
        "// nhưng bạn cần nhiều bản gần giống nhau.\n" +
        "public class ReportTemplate implements Cloneable {\n" +
        "    private String title;\n" +
        "    private List<Section> sections;       // dựng từ database, tốn kém\n" +
        "    private Style style;\n" +
        "\n" +
        "    @Override\n" +
        "    public ReportTemplate clone() {\n" +
        "        try {\n" +
        "            ReportTemplate copy = (ReportTemplate) super.clone();   // SHALLOW\n" +
        "            // Phải DEEP COPY từng field mutable, nếu không hai bản dùng chung:\n" +
        "            copy.sections = sections.stream().map(Section::copy).toList();\n" +
        "            copy.style = style.copy();\n" +
        "            return copy;\n" +
        "        } catch (CloneNotSupportedException e) { throw new AssertionError(e); }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// TRONG JAVA HIỆN ĐẠI, TRÁNH Cloneable (thiết kế hỏng: marker interface\n" +
        "// rỗng, clone() protected, không chạy constructor, ném checked exception).\n" +
        "// DÙNG COPY CONSTRUCTOR hoặc STATIC FACTORY:\n" +
        "public record ReportTemplate(String title, List<Section> sections, Style style) {\n" +
        "    public ReportTemplate {\n" +
        "        sections = List.copyOf(sections);            // bất biến ngay từ đầu\n" +
        "    }\n" +
        "    public ReportTemplate withTitle(String newTitle) {   // \"copy có sửa\"\n" +
        "        return new ReportTemplate(newTitle, sections, style);\n" +
        "    }\n" +
        "}\n" +
        "var base = loadExpensiveTemplate();\n" +
        "var q1 = base.withTitle(\"Báo cáo Q1\");\n" +
        "var q2 = base.withTitle(\"Báo cáo Q2\");    // không phải nạp lại từ database\n" +
        "\n" +
        "// LƯU Ý: object BẤT BIẾN thì KHÔNG CẦN sao chép gì cả — chỉ cần chia sẻ.\n" +
        "// Prototype chỉ có ý nghĩa với object MUTABLE và tốn kém để tạo.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Object Pool pattern — khi nào thực sự cần?',
  answer:
    'Giữ sẵn một **tập object đã khởi tạo**, cho mượn (acquire) và trả lại (release) thay vì tạo/huỷ liên tục.\n\n' +
    'Đáng dùng khi object **rất đắt để tạo** và **được dùng nhiều lần trong thời gian ngắn**:\n' +
    '- **Connection pool** (DB, HTTP) — kinh điển, gần như luôn dùng.\n' +
    '- Thread pool.\n' +
    '- Object nặng: parser lớn, buffer, kết nối tới hardware.\n\n' +
    'KHÔNG nên pool object nhẹ (POJO) — JVM cấp phát + minor GC rẻ hơn nhiều so với chi phí quản lý pool + rủi ro object "bẩn" (state cũ) khi tái dùng.',
  essence:
    'Object pool chỉ đáng khi chi phí *tạo/huỷ* vượt xa chi phí *quản lý pool*. Với connection/thread thì đúng. Với object thường trong ngôn ngữ có GC hiện đại thì thường phản tác dụng (object pooling là "quá khứ" của Java thời GC chậm).',
  example:
    'HikariCP: pool 20 connection DB. Mỗi request `borrow` một connection, xong `return`. Tạo connection TCP + TLS + auth mất ~50ms → pool tránh chi phí đó cho mỗi query. Ngược lại, "pool `StringBuilder`" là ý tưởng tồi.',
  viz: {
    type: 'compare',
    corner: 'Đối tượng',
    cols: ['Nên pool', 'Không nên pool'],
    rows: [
      ['Ví dụ', 'connection DB/HTTP, thread, parser lớn, buffer, kết nối hardware', 'POJO, StringBuilder, object nhẹ'],
      ['Chi phí tạo/huỷ', 'rất đắt (TCP + TLS + auth ~50ms)', 'rẻ (cấp phát + minor GC)'],
      ['Cân nhắc', 'chi phí tạo/huỷ >> chi phí quản lý pool', 'quản lý pool + rủi ro object "bẩn" (state cũ) lấn át'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tái sử dụng object đắt, và vì sao hiếm khi cần tự viết",
      code:
        "// DÙNG KHI object có CHI PHÍ TẠO RẤT LỚN so với chi phí giữ nó sống:\n" +
        "//  - kết nối database (bắt tay TCP + xác thực: hàng chục mili giây)\n" +
        "//  - kết nối HTTP giữ nguyên (keep-alive)\n" +
        "//  - thread (tạo thread là lời gọi hệ điều hành)\n" +
        "//  - buffer lớn, đối tượng đồ hoạ nặng\n" +
        "\n" +
        "// TRONG THỰC TẾ: ĐỪNG tự viết. Dùng thư viện đã được kiểm chứng:\n" +
        "HikariConfig cfg = new HikariConfig();\n" +
        "cfg.setMaximumPoolSize(20);\n" +
        "cfg.setMinimumIdle(5);\n" +
        "cfg.setConnectionTimeout(1000);        // chờ lấy kết nối tối đa 1s\n" +
        "cfg.setMaxLifetime(1_800_000);         // thay kết nối sau 30 phút\n" +
        "cfg.setLeakDetectionThreshold(60_000); // cảnh báo kết nối không được trả về\n" +
        "DataSource ds = new HikariDataSource(cfg);\n" +
        "\n" +
        "ExecutorService pool = Executors.newFixedThreadPool(10);      // pool thread\n" +
        "\n" +
        "// VÌ SAO ĐỪNG TỰ VIẾT — bốn thứ rất dễ sai:\n" +
        "//  1) RÒ RỈ: object mượn mà không trả -> pool cạn dần rồi treo cả hệ thống\n" +
        "//  2) TRẠNG THÁI BẨN: object trả về còn giữ state của lần dùng trước\n" +
        "//     (transaction chưa commit, biến session còn sót) -> lỗi rất khó tìm\n" +
        "//  3) KIỂM TRA SỨC KHOẺ: kết nối đã chết trong pool phải bị phát hiện\n" +
        "//  4) đồng bộ hoá, timeout, và co giãn kích thước\n" +
        "\n" +
        "// KHÔNG DÙNG cho object THƯỜNG: JVM cấp phát object rất rẻ (con trỏ bump),\n" +
        "// và GC thế hệ trẻ xử lý object chết sớm gần như miễn phí. Pool object\n" +
        "// thường LÀM CHẬM chương trình và tăng nguy cơ bug.\n" +
        "// Chỉ pool những gì gắn với TÀI NGUYÊN HỆ ĐIỀU HÀNH.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Dependency Injection là pattern gì? Các kiểu inject?',
  answer:
    'DI là kỹ thuật hiện thực **Inversion of Control** cho việc lấy phụ thuộc: object **không tự tạo/tìm** phụ thuộc mà **nhận từ bên ngoài**.\n\n' +
    'Ba kiểu:\n' +
    '- **Constructor injection** (khuyến nghị): phụ thuộc qua tham số constructor → có thể `final`, bắt buộc, object luôn hợp lệ sau khi tạo, dễ test.\n' +
    '- **Setter injection**: cho phụ thuộc optional hoặc cần thay đổi runtime.\n' +
    '- **Field injection** (annotation trên field): gọn nhưng ẩn phụ thuộc, không `final`, khó test không container.\n\n' +
    'DI làm cho phụ thuộc **tường minh** (trong chữ ký) và **thay thế được** (mock trong test, impl khác trong prod).',
  essence:
    'DI = "đừng gọi cho tôi, tôi sẽ gọi cho bạn" áp cho phụ thuộc. Constructor injection biến hợp đồng phụ thuộc thành một phần của chữ ký class — không thể tạo object ở trạng thái thiếu phụ thuộc.',
  example:
    '`class ReportService { private final PdfRenderer r; private final Clock clock; ReportService(PdfRenderer r, Clock clock) {...} }`. Test: `new ReportService(mockRenderer, Clock.fixed(...))` — kiểm soát cả renderer lẫn thời gian, không cần Spring.',
  viz: {
    type: 'compare',
    corner: 'Kiểu inject',
    cols: ['Constructor (khuyến nghị)', 'Setter', 'Field (annotation)'],
    rows: [
      ['field final', 'được', 'không', 'không'],
      ['Object hợp lệ sau khi tạo', 'luôn (phụ thuộc bắt buộc)', 'có thể thiếu', 'có thể thiếu'],
      ['Test không container', 'dễ (new Service(mock))', 'khá', 'khó'],
      ['Dùng cho', 'phụ thuộc bắt buộc', 'optional / thay runtime', 'gọn nhưng ẩn phụ thuộc'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Object không tự tạo phụ thuộc của mình",
      code:
        "// KHÔNG DÙNG DI — class tự tạo phụ thuộc -> gắn chặt, không test được\n" +
        "public class OrderService {\n" +
        "    private final PaymentGateway gateway = new StripeGateway();   // CỨNG\n" +
        "}\n" +
        "\n" +
        "// DÙNG DI — phụ thuộc được TRUYỀN VÀO từ bên ngoài\n" +
        "// 1) CONSTRUCTOR INJECTION — nên dùng\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final PaymentGateway gateway;      // final: bất biến\n" +
        "    private final OrderRepository repo;\n" +
        "\n" +
        "    public OrderService(PaymentGateway gateway, OrderRepository repo) {\n" +
        "        this.gateway = gateway;\n" +
        "        this.repo = repo;\n" +
        "    }\n" +
        "}\n" +
        "// + phụ thuộc BẮT BUỘC và BẤT BIẾN; object không bao giờ ở trạng thái nửa vời\n" +
        "// + test bằng new OrderService(mock1, mock2) — không cần framework\n" +
        "// + constructor quá nhiều tham số TỰ BÁO ĐỘNG rằng class ôm quá nhiều việc\n" +
        "\n" +
        "// 2) SETTER INJECTION — cho phụ thuộc THẬT SỰ tuỳ chọn\n" +
        "@Autowired(required = false)\n" +
        "public void setMetrics(MetricsCollector m) { this.metrics = m; }\n" +
        "\n" +
        "// 3) FIELD INJECTION — tránh\n" +
        "@Autowired private PaymentGateway gateway;\n" +
        "// - không final được, test phải dùng reflection hoặc bật cả context,\n" +
        "//   và che giấu việc class đang phụ thuộc quá nhiều thứ\n" +
        "\n" +
        "// DI KHÔNG CẦN FRAMEWORK — đây chỉ là một pattern:\n" +
        "var service = new OrderService(new StripeGateway(), new JdbcOrderRepository(ds));\n" +
        "// Framework chỉ giúp tự động hoá việc lắp ráp khi hệ thống lớn.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Service Locator vs Dependency Injection?',
  answer:
    '**Service Locator**: một registry trung tâm; class **tự hỏi** locator để lấy phụ thuộc: `Db db = ServiceLocator.get(Db.class)`.\n\n' +
    '**DI**: class **nhận** phụ thuộc từ ngoài, không biết đến bất kỳ locator nào.\n\n' +
    'Service Locator bị chê vì:\n' +
    '- Phụ thuộc **ẩn** (không trong chữ ký) → coupling che giấu.\n' +
    '- Mọi class coupling với locator.\n' +
    '- Test phải cấu hình locator (global state).\n\n' +
    'DI được ưa chuộng hơn: phụ thuộc lộ rõ, không class nào biết đến cơ chế wiring.',
  essence:
    'Cả hai đảo ngược việc *tạo* phụ thuộc. Nhưng Service Locator vẫn để class chủ động *đi lấy* (coupling với locator, phụ thuộc ẩn); DI để phụ thuộc được *đưa tới* (không coupling, tường minh). DI thắng.',
  example:
    'Android cũ dùng `context.getSystemService(...)` (service locator). Code hiện đại (Hilt/Dagger) chuyển sang constructor injection → dependency của một ViewModel hiện rõ trong constructor, test dễ.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Service Locator', 'Dependency Injection'],
    rows: [
      ['Lấy phụ thuộc', 'class TỰ hỏi locator (ServiceLocator.get(Db.class))', 'class NHẬN từ ngoài'],
      ['Phụ thuộc', 'ẩn — không trong chữ ký', 'lộ rõ — trong constructor'],
      ['Coupling', 'mọi class coupling với locator', 'không class nào biết cơ chế wiring'],
      ['Test', 'phải cấu hình locator (global state)', 'truyền mock trực tiếp'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Kéo phụ thuộc về vs được đẩy vào",
      code:
        "// SERVICE LOCATOR — object TỰ ĐI TÌM phụ thuộc của mình\n" +
        "public class OrderService {\n" +
        "    public void place(Order o) {\n" +
        "        var gateway = ServiceLocator.get(PaymentGateway.class);   // KÉO về\n" +
        "        gateway.charge(o);\n" +
        "    }\n" +
        "}\n" +
        "// VẤN ĐỀ:\n" +
        "//  1) PHỤ THUỘC BỊ GIẤU: chữ ký class không cho biết nó cần gì\n" +
        "//  2) mọi class phụ thuộc vào CHÍNH SERVICE LOCATOR -> một phụ thuộc toàn cục mới\n" +
        "//  3) lỗi thiếu bean chỉ lộ ra LÚC CHẠY, ở đúng dòng gọi get()\n" +
        "//  4) test phải cấu hình locator toàn cục -> test làm bẩn lẫn nhau\n" +
        "\n" +
        "// DEPENDENCY INJECTION — phụ thuộc được ĐẨY vào\n" +
        "public class OrderService {\n" +
        "    private final PaymentGateway gateway;\n" +
        "    public OrderService(PaymentGateway gateway) { this.gateway = gateway; }\n" +
        "}\n" +
        "// + phụ thuộc TƯỜNG MINH ngay ở chữ ký\n" +
        "// + thiếu phụ thuộc -> lỗi LÚC KHỞI ĐỘNG (Spring) hoặc lúc BIÊN DỊCH\n" +
        "// + test không cần hạ tầng gì\n" +
        "\n" +
        "// KHI NÀO SERVICE LOCATOR CÒN HỢP LÝ:\n" +
        "//  - code cũ chưa có container DI, và refactor toàn bộ là quá tốn kém\n" +
        "//  - plugin nạp động lúc chạy (không biết trước cần gì)\n" +
        "//  - framework nội bộ cần tra cứu theo tên lúc chạy\n" +
        "// Ngay cả khi đó, nên GIỚI HẠN việc tra cứu ở MỘT lớp biên, phần còn lại\n" +
        "// của hệ thống vẫn dùng DI.\n" +
        "\n" +
        "// Trong Spring, ApplicationContextAware chính là service locator —\n" +
        "// dùng nó là dấu hiệu nên xem lại thiết kế.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Static factory method (Effective Java) — ưu điểm so với constructor?',
  answer:
    'Một `public static` method trả về instance của class, thay cho (hoặc bổ sung) constructor.\n\n' +
    'Ưu điểm:\n' +
    '- **Có tên**: `BigInteger.probablePrime(...)` rõ hơn `new BigInteger(int, int, Random)`.\n' +
    '- **Không bắt buộc tạo object mới**: có thể trả về instance cache (`Boolean.valueOf`, `Integer.valueOf` với int nhỏ), enforce singleton/instance control.\n' +
    '- **Trả về subtype**: `Collections.unmodifiableList(...)` trả một implementation ẩn.\n' +
    '- **Chọn class trả về theo tham số**: `EnumSet.of(...)` trả `RegularEnumSet` hoặc `JumboEnumSet`.\n\n' +
    'Nhược: không dễ phân biệt với method thường; class không có public constructor thì không subclass được (đôi khi là ưu điểm).',
  essence:
    'Static factory method cho bạn tên có ý nghĩa, kiểm soát instance (cache/singleton), và linh hoạt kiểu trả về — những thứ constructor không làm được. Quy ước: `of`, `from`, `valueOf`, `getInstance`, `create`.',
  example:
    '`List.of(1, 2, 3)` — có tên rõ, trả về một immutable list implementation nội bộ, có thể tối ưu (list rỗng dùng singleton). `new ArrayList<>(...)` không làm được các điều đó.',
  viz: {
    type: 'tree',
    title: 'Quy ước tên: of, from, valueOf, getInstance, create',
    root: {
      label: 'Ưu điểm so với constructor',
      children: [
        { label: 'Có tên', note: 'BigInteger.probablePrime(...) rõ hơn new BigInteger(int, int, Random)' },
        { label: 'Không bắt buộc tạo object mới', note: 'trả instance cache (Integer.valueOf), enforce instance control' },
        { label: 'Trả về subtype', note: 'Collections.unmodifiableList(...) trả implementation ẩn' },
        { label: 'Chọn class trả về theo tham số', note: 'EnumSet.of(...) → RegularEnumSet hoặc JumboEnumSet' },
        { label: 'Nhược', note: 'khó phân biệt với method thường; không public constructor → không subclass được' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Method tĩnh trả về instance, và năm lợi thế",
      code:
        "public final class Money {\n" +
        "    private final BigDecimal amount;\n" +
        "    private final Currency currency;\n" +
        "\n" +
        "    private Money(BigDecimal amount, Currency currency) { ... }   // constructor PRIVATE\n" +
        "\n" +
        "    // 1) CÓ TÊN — thể hiện được ý nghĩa, và tạo được nhiều \"constructor\"\n" +
        "    //    cùng danh sách tham số (điều constructor không làm được)\n" +
        "    public static Money vnd(long amount)  { return new Money(BigDecimal.valueOf(amount), VND); }\n" +
        "    public static Money usd(double amount){ return new Money(BigDecimal.valueOf(amount), USD); }\n" +
        "    public static Money zero(Currency c)  { return new Money(BigDecimal.ZERO, c); }\n" +
        "}\n" +
        "Money.vnd(100_000);        // rõ ràng hơn new Money(100000, Currency.getInstance(\"VND\"))\n" +
        "\n" +
        "// 2) KHÔNG BẮT BUỘC tạo object mới -> CACHE được\n" +
        "public static Boolean valueOf(boolean b) { return b ? TRUE : FALSE; }   // JDK\n" +
        "Integer.valueOf(127);      // dùng lại từ cache [-128, 127]\n" +
        "\n" +
        "// 3) TRẢ VỀ KIỂU CON — che giấu lớp cài đặt\n" +
        "public static <T> List<T> of(T... elements) {          // List.of trả về\n" +
        "    return new ImmutableCollections.ListN<>(elements); // lớp private\n" +
        "}\n" +
        "// Client chỉ biết List; lớp cài đặt đổi mà không ảnh hưởng ai.\n" +
        "\n" +
        "// 4) Kiểu trả về đổi được theo THAM SỐ\n" +
        "public static Set<Rank> of(Rank first, Rank... rest) {\n" +
        "    return rest.length <= 5 ? new RegularEnumSet<>(...) : new JumboEnumSet<>(...);\n" +
        "}\n" +
        "\n" +
        "// 5) Lớp trả về chưa cần tồn tại lúc VIẾT method (ServiceLoader, JDBC)\n" +
        "\n" +
        "// NHƯỢC ĐIỂM: class không có constructor public thì không kế thừa được\n" +
        "// (thường lại là điều tốt), và method tĩnh khó tìm hơn constructor trong\n" +
        "// tài liệu -> đặt tên theo quy ước: of, from, valueOf, getInstance, newInstance.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Lazy initialization và initialization-on-demand holder idiom?',
  answer:
    '**Lazy init**: chỉ tạo object khi lần đầu cần → tiết kiệm nếu có thể không bao giờ cần, hoặc dời chi phí khởi động.\n\n' +
    'Với field non-static: `if (field == null) field = compute(); return field;` — cần `synchronized` hoặc `volatile` + DCL nếu đa luồng.\n\n' +
    '**Holder idiom** (cho static): đặt instance trong một static nested class. JVM đảm bảo class chỉ được nạp (và static field khởi tạo) **một lần, thread-safe**, đúng lúc lần đầu class đó được tham chiếu:\n' +
    '```\nstatic class Holder { static final Heavy I = new Heavy(); }\nstatic Heavy get() { return Holder.I; }\n```\n' +
    'Lazy + thread-safe + không cần khoá.',
  essence:
    'Holder idiom là cách lazy-init static an toàn nhất trong Java: bạn "mượn" đảm bảo thread-safe của cơ chế class-loading thay vì tự viết khoá. Cho instance field, cân nhắc chỉ eager-init nếu chi phí nhỏ.',
  example:
    'Một `ObjectMapper` cấu hình phức tạp, đắt, nhưng không phải request nào cũng cần: đặt trong `Holder` → chỉ tạo khi endpoint dùng JSON đầu tiên được gọi, và tạo đúng một lần dù 100 request đồng thời.',
  viz: {
    type: 'flow',
    title: 'Mượn đảm bảo thread-safe của cơ chế class-loading thay vì tự viết khoá',
    nodes: ['get() được gọi lần đầu', 'JVM nạp static nested class Holder', 'Khởi tạo static final I = new Heavy() — một lần, thread-safe', 'Trả Holder.I (mọi lần sau: instant)'],
    steps: [
      { to: 1, label: 'Holder không nạp khi class ngoài nạp — chỉ khi được tham chiếu' },
      { to: 2, label: 'JVM đảm bảo class init chạy đúng một lần dù 100 luồng' },
      { to: 3, label: 'Lazy + thread-safe + không synchronized' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hoãn việc tạo object tới khi thật sự cần",
      code:
        "// LAZY INIT ĐƠN GIẢN — chỉ an toàn khi ĐƠN LUỒNG\n" +
        "private ExpensiveResource resource;\n" +
        "public ExpensiveResource get() {\n" +
        "    if (resource == null) resource = new ExpensiveResource();   // RACE nếu đa luồng\n" +
        "    return resource;\n" +
        "}\n" +
        "\n" +
        "// HOLDER IDIOM — lười + thread-safe + KHÔNG tốn chi phí đồng bộ hoá\n" +
        "public class ResourceManager {\n" +
        "    private ResourceManager() {}\n" +
        "    private static class Holder {\n" +
        "        static final ExpensiveResource INSTANCE = new ExpensiveResource();\n" +
        "    }\n" +
        "    public static ExpensiveResource get() { return Holder.INSTANCE; }\n" +
        "}\n" +
        "// CƠ CHẾ: JVM chỉ NẠP class Holder khi nó được tham chiếu lần đầu, và\n" +
        "// việc nạp class được JVM đảm bảo thread-safe. Không cần synchronized,\n" +
        "// không cần volatile, không có chi phí ở các lần gọi sau.\n" +
        "// Đây là cách hiện thực lazy singleton TỐT NHẤT trong Java (ngoài enum).\n" +
        "\n" +
        "// CHO FIELD CỦA INSTANCE (không phải static) — double-checked locking:\n" +
        "private volatile ExpensiveResource resource;     // volatile BẮT BUỘC\n" +
        "public ExpensiveResource get() {\n" +
        "    ExpensiveResource r = resource;               // đọc volatile MỘT lần\n" +
        "    if (r == null) {\n" +
        "        synchronized (this) {\n" +
        "            r = resource;\n" +
        "            if (r == null) resource = r = new ExpensiveResource();\n" +
        "        }\n" +
        "    }\n" +
        "    return r;\n" +
        "}\n" +
        "\n" +
        "// CÁCH GỌN NHẤT trong Java hiện đại:\n" +
        "private final Supplier<ExpensiveResource> lazy = Suppliers.memoize(ExpensiveResource::new);\n" +
        "\n" +
        "// KHI NÀO ĐÁNG LÀM: object thật sự ĐẮT và có thể KHÔNG BAO GIỜ dùng tới.\n" +
        "// Ngược lại, khởi tạo sớm giúp lỗi cấu hình lộ ra lúc khởi động — thường tốt hơn.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Registry / Multiton pattern là gì?',
  answer:
    '- **Multiton**: như Singleton nhưng có **một tập instance được đặt tên/khoá**, mỗi khoá đúng một instance. `Currency.getInstance("USD")` luôn trả cùng object.\n' +
    '- **Registry**: một nơi tập trung để **đăng ký và tra cứu** object/service theo khoá lúc runtime. Thường dùng cho plugin, handler.\n\n' +
    'Rủi ro giống Singleton: global mutable state, khó test, coupling ẩn. Ưu tiên DI + `Map` được inject nếu có thể.',
  essence:
    'Multiton = "Singleton theo khoá". Registry = "danh bạ runtime". Cả hai hữu ích cho tập object cố định/plugin nhưng mang theo nhược điểm của global state — dùng có kiểm soát, ưu tiên inject collection.',
  example:
    '`Charset.forName("UTF-8")` (multiton — mỗi charset một instance dùng chung). Framework plugin: `HandlerRegistry.register("payment", new PaymentHandler())` rồi `registry.get(eventType).handle(e)`. Trong Spring, thay bằng inject `Map<String, Handler>` (Spring tự gom các bean).',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Multiton', 'Registry'],
    rows: [
      ['Là gì', '"Singleton theo khoá" — mỗi khoá đúng một instance', '"danh bạ runtime" — đăng ký & tra cứu theo khoá'],
      ['Ví dụ', 'Currency.getInstance("USD"), Charset.forName(...)', 'HandlerRegistry.register("payment", ...)'],
      ['Rủi ro', 'global mutable state, khó test, coupling ẩn', 'như trên'],
      ['Thay thế', 'DI + Map được inject (Spring tự gom Map<String, Handler>)', ''],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Nhiều instance được quản lý theo khoá",
      code:
        "// MULTITON = Singleton mở rộng: mỗi KHOÁ một instance duy nhất.\n" +
        "public class ConnectionRegistry {\n" +
        "    private static final Map<String, Connection> INSTANCES = new ConcurrentHashMap<>();\n" +
        "\n" +
        "    public static Connection forTenant(String tenantId) {\n" +
        "        return INSTANCES.computeIfAbsent(tenantId, ConnectionRegistry::create);\n" +
        "    }                        // computeIfAbsent: NGUYÊN TỬ, không tạo trùng\n" +
        "}\n" +
        "\n" +
        "// REGISTRY — kho tra cứu object theo khoá, thường được đăng ký lúc khởi động\n" +
        "@Component\n" +
        "public class HandlerRegistry {\n" +
        "    private final Map<String, EventHandler> handlers;\n" +
        "\n" +
        "    // Spring tiêm MỌI EventHandler; ta lập chỉ mục theo loại sự kiện\n" +
        "    public HandlerRegistry(List<EventHandler> all) {\n" +
        "        this.handlers = all.stream()\n" +
        "            .collect(toMap(EventHandler::eventType, identity()));\n" +
        "    }\n" +
        "    public void dispatch(Event e) {\n" +
        "        EventHandler h = handlers.get(e.type());\n" +
        "        if (h == null) throw new IllegalStateException(\"không có handler cho \" + e.type());\n" +
        "        h.handle(e);\n" +
        "    }\n" +
        "}\n" +
        "// -> Thêm loại sự kiện mới = thêm một @Component, KHÔNG sửa dòng nào ở đây.\n" +
        "// Đây là cách thay thế cho switch/case dài, và tuân thủ OCP.\n" +
        "\n" +
        "// CẢNH BÁO: registry TĨNH mang mọi nhược điểm của trạng thái toàn cục —\n" +
        "// khó test, rò rỉ bộ nhớ (map giữ tham chiếu mãi), và vấn đề đồng thời.\n" +
        "// -> Ưu tiên registry là một BEAN do container quản lý (như ví dụ trên)\n" +
        "//    thay vì Map static.\n" +
        "// Với multiton theo tenant: nhớ có cơ chế DỌN khi tenant bị xoá.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Creational pattern trong Spring: BeanFactory, FactoryBean, @Bean?',
  answer:
    '- **`ApplicationContext` / `BeanFactory`**: chính là một **factory + registry + DI container** khổng lồ. Bạn khai báo bean, nó lo tạo, wiring, scope, vòng đời.\n' +
    '- **`@Bean` method**: một **factory method** — Spring gọi nó để tạo bean, cho phép logic khởi tạo tuỳ ý (dùng cho class bên thứ ba).\n' +
    '- **`FactoryBean<T>`**: một bean mà khi bạn inject, Spring trả về `T` do `getObject()` tạo, không phải chính `FactoryBean`. Dùng để đóng gói logic tạo phức tạp (ví dụ `SqlSessionFactoryBean` của MyBatis).\n' +
    '- **`@Scope("prototype")`**: mỗi lần lấy tạo mới (Prototype pattern ở cấp container).\n' +
    '- **`ObjectProvider` / `@Lookup`**: lấy instance mới theo yêu cầu (giải quyết prototype-in-singleton).',
  essence:
    'Spring hiện thực hầu hết creational pattern cho bạn: container là factory + registry + DI, `@Bean`/`FactoryBean` là các factory method có thể cắm logic, scope là instance control. Ít khi cần tự viết factory class.',
  example:
    '`@Bean public DataSource dataSource() { return DataSourceBuilder.create()....build(); }` — factory method tạo `DataSource` (class thư viện). `@Bean RestClient restClient(RestClient.Builder b) { return b.baseUrl(...).build(); }` — Builder + factory method kết hợp.',
  viz: {
    type: 'tree',
    title: 'Spring hiện thực hầu hết creational pattern cho bạn',
    root: {
      label: 'ApplicationContext / BeanFactory = factory + registry + DI container',
      children: [
        { label: '@Bean method', note: 'factory method — Spring gọi để tạo bean, logic khởi tạo tuỳ ý (class bên thứ ba)' },
        { label: 'FactoryBean<T>', note: 'inject → Spring trả T do getObject() tạo (SqlSessionFactoryBean)' },
        { label: '@Scope("prototype")', note: 'mỗi lần lấy tạo mới — Prototype ở cấp container' },
        { label: 'ObjectProvider / @Lookup', note: 'lấy instance mới theo yêu cầu — prototype-in-singleton' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba cơ chế tạo bean và khi nào dùng cái nào",
      code:
        "// 1) @Bean — factory method thông thường. Dùng cho class của THƯ VIỆN\n" +
        "//    ngoài (không sửa được để gắn @Component).\n" +
        "@Configuration\n" +
        "public class AppConfig {\n" +
        "    @Bean\n" +
        "    public RestClient paymentClient(RestClient.Builder builder) {\n" +
        "        return builder.baseUrl(\"https://payment\").build();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 2) FactoryBean — bean có nhiệm vụ TẠO RA bean khác. Dùng khi việc khởi\n" +
        "//    tạo phức tạp và cần logic, hoặc cần trả về PROXY.\n" +
        "@Component\n" +
        "public class PaymentGatewayFactoryBean implements FactoryBean<PaymentGateway> {\n" +
        "    private final Environment env;\n" +
        "\n" +
        "    @Override\n" +
        "    public PaymentGateway getObject() {\n" +
        "        String provider = env.getProperty(\"payment.provider\", \"stripe\");\n" +
        "        return switch (provider) {\n" +
        "            case \"stripe\" -> new StripeGateway(env.getProperty(\"stripe.key\"));\n" +
        "            case \"paypal\" -> new PaypalGateway(env.getProperty(\"paypal.key\"));\n" +
        "            default -> throw new IllegalStateException(provider);\n" +
        "        };\n" +
        "    }\n" +
        "    @Override public Class<?> getObjectType() { return PaymentGateway.class; }\n" +
        "    @Override public boolean isSingleton() { return true; }\n" +
        "}\n" +
        "// LƯU Ý: getBean(\"paymentGatewayFactoryBean\") trả về SẢN PHẨM (PaymentGateway);\n" +
        "// muốn lấy chính FactoryBean thì thêm & : getBean(\"&paymentGatewayFactoryBean\").\n" +
        "// Đây là cơ chế Spring dùng cho Mapper của MyBatis, proxy của Spring Data...\n" +
        "\n" +
        "// 3) BeanFactory / ObjectProvider — lấy bean LÚC CHẠY (khi cần prototype\n" +
        "//    hoặc quyết định theo điều kiện runtime)\n" +
        "@Service\n" +
        "public class TaskRunner {\n" +
        "    private final ObjectProvider<Task> tasks;      // sạch hơn ApplicationContextAware\n" +
        "    public void run() { Task t = tasks.getObject(); }   // instance MỚI mỗi lần\n" +
        "}\n" +
        "\n" +
        "// CHỌN: mặc định @Bean. Cần logic khởi tạo phức tạp -> FactoryBean.\n" +
        "// Cần instance mới lúc chạy -> ObjectProvider.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Fluent Builder + validation + immutable — hiện thực đúng?',
  answer:
    'Mục tiêu: API dễ đọc, object cuối **bất biến**, **luôn hợp lệ**.\n\n' +
    'Nguyên tắc:\n' +
    '- Builder có các field mutable + method `withX()`/`x()` trả `this` (fluent).\n' +
    '- `build()`: **kiểm tra invariant** (bắt buộc có gì, giá trị hợp lệ không) → ném `IllegalStateException`/`IllegalArgumentException` với message rõ, rồi tạo object bất biến (constructor private nhận builder).\n' +
    '- Object đích: mọi field `final`, không setter, collection được copy phòng thủ (`List.copyOf`).\n' +
    '- Với hệ phân cấp: generic self-type (`Builder<T extends Builder<T>>`) để builder của subclass vẫn fluent.\n\n' +
    'Java hiện đại: `record` + compact constructor validate + static builder, hoặc Lombok `@Builder`.',
  essence:
    'Điểm mấu chốt: **validation dồn vào `build()`**, object đích **hoàn toàn bất biến**, không có đường nào tạo được object không hợp lệ. Builder mutable là "vùng đệm" trước khi đóng băng.',
  example:
    '```\npublic record DateRange(LocalDate from, LocalDate to) {\n  public DateRange {           // compact constructor\n    if (to.isBefore(from)) throw new IllegalArgumentException("to < from");\n  }\n}\n```\nKhông thể tạo `DateRange` với `to` trước `from`. Với nhiều field optional thì thêm builder gọi constructor này.',
  viz: {
    type: 'flow',
    title: 'Không có đường nào tạo được object không hợp lệ',
    nodes: ['Builder mutable — "vùng đệm"', 'withX() trả this (fluent)', 'build() kiểm invariant', 'constructor private nhận builder → object final + copy phòng thủ'],
    steps: [
      { to: 1, label: 'Field mutable trong builder, chưa đóng băng' },
      { to: 2, label: 'Bắt buộc có gì? giá trị hợp lệ? → ném IllegalStateException với message rõ' },
      { to: 3, label: 'Object đích: mọi field final, không setter, List.copyOf. Java hiện đại: record + compact constructor' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba yếu tố kết hợp",
      code:
        "public final class Order {\n" +
        "    private final String id;\n" +
        "    private final String customerId;\n" +
        "    private final List<Item> items;       // BẤT BIẾN\n" +
        "    private final Money total;\n" +
        "\n" +
        "    private Order(Builder b) {\n" +
        "        this.id = b.id;\n" +
        "        this.customerId = b.customerId;\n" +
        "        this.items = List.copyOf(b.items);            // bản sao PHÒNG THỦ\n" +
        "        this.total = b.total;\n" +
        "    }\n" +
        "\n" +
        "    public List<Item> items() { return items; }       // đã bất biến, trả thẳng được\n" +
        "\n" +
        "    public static Builder builder() { return new Builder(); }\n" +
        "\n" +
        "    public static final class Builder {\n" +
        "        private String id;\n" +
        "        private String customerId;\n" +
        "        private final List<Item> items = new ArrayList<>();\n" +
        "        private Money total;\n" +
        "\n" +
        "        public Builder id(String id) {\n" +
        "            this.id = requireNonNull(id, \"id\");       // validate SỚM ở từng bước\n" +
        "            return this;\n" +
        "        }\n" +
        "        public Builder addItem(Item item) {\n" +
        "            items.add(requireNonNull(item, \"item\"));\n" +
        "            return this;\n" +
        "        }\n" +
        "\n" +
        "        public Order build() {\n" +
        "            // VALIDATE TOÀN CỤC — những quy tắc liên quan nhiều field\n" +
        "            List<String> errors = new ArrayList<>();\n" +
        "            if (id == null)          errors.add(\"thiếu id\");\n" +
        "            if (customerId == null)  errors.add(\"thiếu customerId\");\n" +
        "            if (items.isEmpty())     errors.add(\"đơn hàng rỗng\");\n" +
        "            if (total != null && total.isNegative()) errors.add(\"tổng tiền âm\");\n" +
        "            if (!errors.isEmpty())\n" +
        "                throw new IllegalStateException(\"Order không hợp lệ: \" + errors);\n" +
        "            return new Order(this);            // chỉ tạo khi CHẮC CHẮN hợp lệ\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "// BA NGUYÊN TẮC:\n" +
        "// 1) Validate ở CẢ HAI mức: từng bước (rẻ, báo lỗi sớm) và trong build()\n" +
        "//    (quy tắc liên quan nhiều field).\n" +
        "// 2) GOM lỗi rồi báo một lần — người dùng không phải sửa từng cái một.\n" +
        "// 3) Bản sao phòng thủ cho MỌI collection/mảng, cả lúc nhận lẫn lúc trả.\n" +
        "// Builder dùng lại được nhiều lần thì phải cẩn thận: build() hai lần với\n" +
        "// cùng builder sẽ chia sẻ state -> hoặc copy list trong build(), hoặc cấm.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Dấu hiệu lạm dụng creational pattern (over-engineering)?',
  answer:
    '- Một `Factory` chỉ có `return new X()` — không thêm giá trị gì so với `new X()`.\n' +
    '- `AbstractFactoryProviderBuilderStrategy` cho một trường hợp có một implementation duy nhất.\n' +
    '- Interface + factory "phòng khi sau này có impl thứ hai" — YAGNI (thêm khi thực sự cần, refactor rẻ).\n' +
    '- Builder cho class 2 field.\n' +
    '- Prototype/pool cho object nhẹ.\n' +
    '- Nhiều tầng gián tiếp khiến "nhảy" 5 file mới thấy chỗ object thực sự được tạo.\n\n' +
    'Quy tắc: dùng cách đơn giản nhất (constructor / static factory) cho tới khi có **áp lực thay đổi cụ thể** (cần thay impl, cần cấu hình phức tạp, cần subclass mở rộng).',
  essence:
    'Pattern thêm gián tiếp; gián tiếp có chi phí (đọc hiểu, điều hướng). Chỉ "trả tiền" cho gián tiếp khi nó mua được sự linh hoạt bạn *đang cần*, không phải linh hoạt tưởng tượng.',
  example:
    'Codebase có `UserFactory`, `UserFactoryImpl`, `UserFactoryProvider`, `DefaultUserFactoryProvider` — chỉ để `new User(name, email)`. Xoá hết, gọi `new User(...)` hoặc `User.of(...)`. Nếu ngày mai cần `AdminUser` → lúc đó mới thêm factory, mất 10 phút.',
  viz: {
    type: 'tree',
    title: 'Chỉ "trả tiền" cho gián tiếp khi nó mua được linh hoạt bạn ĐANG cần',
    root: {
      label: 'Dấu hiệu lạm dụng creational pattern',
      children: [
        { label: 'Factory chỉ có return new X()', note: 'không thêm giá trị gì' },
        { label: 'AbstractFactoryProviderBuilderStrategy cho 1 implementation', note: '' },
        { label: 'Interface + factory "phòng khi sau này có impl thứ hai"', note: 'YAGNI — refactor rẻ, thêm khi thực sự cần' },
        { label: 'Builder cho class 2 field; Prototype/pool cho object nhẹ', note: '' },
        { label: 'Nhảy 5 file mới thấy chỗ object thực sự được tạo', note: '' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Khi pattern nhiều hơn logic nghiệp vụ",
      code:
        "// DẤU HIỆU 1: FACTORY chỉ có MỘT cài đặt và không có dấu hiệu sẽ có thêm\n" +
        "public interface UserServiceFactory { UserService create(); }\n" +
        "public class UserServiceFactoryImpl implements UserServiceFactory {\n" +
        "    public UserService create() { return new UserServiceImpl(); }\n" +
        "}\n" +
        "// -> Chỉ cần: new UserServiceImpl()  (hoặc để container DI lo)\n" +
        "\n" +
        "// DẤU HIỆU 2: BUILDER cho object 2-3 field bắt buộc\n" +
        "Point p = Point.builder().x(1).y(2).build();\n" +
        "Point p = new Point(1, 2);                  // rõ hơn, ngắn hơn\n" +
        "record Point(int x, int y) { }              // và đây là đủ\n" +
        "\n" +
        "// DẤU HIỆU 3: interface chỉ có MỘT implementation, đặt tên XxxImpl\n" +
        "// -> interface tồn tại \"để test\" trong khi Mockito mock được class thường,\n" +
        "//    hoặc \"để linh hoạt sau này\" — một dự đoán hiếm khi thành sự thật.\n" +
        "\n" +
        "// DẤU HIỆU 4: ABSTRACT FACTORY cho một \"họ\" chỉ có một thành viên\n" +
        "\n" +
        "// DẤU HIỆU 5: nhiều tầng gián tiếp mà mỗi tầng chỉ chuyển tiếp lời gọi\n" +
        "//   Controller -> Facade -> Service -> Manager -> Helper -> Repository\n" +
        "//   -> mỗi tầng phải TRẢ LỜI ĐƯỢC \"nó thêm giá trị gì\"; không trả lời được thì bỏ.\n" +
        "\n" +
        "// NGUYÊN TẮC:\n" +
        "//  - YAGNI: thêm trừu tượng khi ĐÃ CÓ nhu cầu thật, không phải khi dự đoán\n" +
        "//  - Quy tắc BA: xuất hiện lần thứ ba thì mới trừu tượng hoá\n" +
        "//  - Bắt đầu bằng cách ĐƠN GIẢN NHẤT chạy được; refactor khi có áp lực thật\n" +
        "//  - Đo bằng câu hỏi: \"bỏ lớp này đi thì code có tệ hơn không?\"\n" +
        "\n" +
        "// Refactor RA khỏi thiết kế đơn giản thì dễ; refactor ra khỏi trừu tượng\n" +
        "// sai thì rất khó — đó là lý do nên bắt đầu đơn giản.",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Monostate pattern — "Singleton mà không phải Singleton"?',
  answer:
    'Monostate: nhiều instance của class được tạo bình thường (`new`), nhưng **tất cả chia sẻ chung state** vì các field là `static`. Hành vi giống Singleton (một state chung) nhưng không kiểm soát số instance.\n\n' +
    '```\nclass Config {\n  private static String env;      // shared\n  public String getEnv() { return env; }\n  public void setEnv(String e) { env = e; }\n}\n// new Config() bao nhiêu lần cũng thấy cùng env\n```\n\n' +
    'Ưu so với Singleton: dùng như object bình thường (tạo tự do, polymorphism, không có `getInstance()`). Nhược: vẫn là global mutable state ẩn (còn khó thấy hơn Singleton), khó test, không lazy.',
  essence:
    'Monostate giấu tính "một state chung" sau vẻ ngoài của một class thường. Ít lộ liễu hơn Singleton nhưng cùng bản chất global state — và cái ẩn thì nguy hiểm hơn cái lộ. Hiếm khi là lựa chọn tốt; DI vẫn hơn.',
  example:
    'Java `java.util.Calendar` cũ có yếu tố monostate qua static config. Thực tế: nếu thấy mình muốn "Singleton nhưng cần polymorphism/tạo tự do", hãy dùng DI với scope singleton thay vì monostate.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Singleton', 'Monostate'],
    rows: [
      ['Số instance', 'kiểm soát — đúng một', 'tạo tự do (new), nhưng field static → state chung'],
      ['Cách dùng', 'getInstance()', 'như object bình thường + polymorphism'],
      ['Bản chất', 'global state — lộ liễu', 'global state — ẩn (nguy hiểm hơn vì khó thấy)'],
      ['Lựa chọn tốt hơn', 'DI scope singleton', 'DI scope singleton'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Nhiều instance nhưng dùng chung state",
      code:
        "// SINGLETON: một instance, nhiều tham chiếu tới nó.\n" +
        "// MONOSTATE:  nhiều instance, nhưng MỌI state đều STATIC -> chúng hành xử\n" +
        "// như thể là một.\n" +
        "public class AppConfig {\n" +
        "    private static String environment;         // STATIC: dùng chung\n" +
        "    private static int maxConnections;\n" +
        "\n" +
        "    public String getEnvironment() { return environment; }        // KHÔNG static\n" +
        "    public void setEnvironment(String e) { environment = e; }\n" +
        "}\n" +
        "AppConfig a = new AppConfig();\n" +
        "AppConfig b = new AppConfig();\n" +
        "a.setEnvironment(\"prod\");\n" +
        "b.getEnvironment();          // \"prod\" — b thấy thay đổi của a\n" +
        "\n" +
        "// SO VỚI SINGLETON:\n" +
        "// + client dùng như class BÌNH THƯỜNG (new được), không phải gọi getInstance()\n" +
        "// + KẾ THỪA được, và có thể triển khai interface -> polymorphism hoạt động\n" +
        "// + chuyển từ monostate sang instance thường chỉ cần bỏ từ khoá static\n" +
        "\n" +
        "// NHƯNG MANG MỌI VẤN ĐỀ CỦA TRẠNG THÁI TOÀN CỤC — và tệ hơn ở một điểm:\n" +
        "// nó GIẤU điều đó đi. Người đọc thấy `new AppConfig()` và tưởng mình có\n" +
        "// một object riêng, trong khi thực tế đang sửa state dùng chung.\n" +
        "// -> Đây là lý do monostate hiếm khi được khuyến nghị.\n" +
        "\n" +
        "// TRONG THỰC TẾ: dùng DI với singleton scope. Nó cho bạn \"một instance\"\n" +
        "// mà KHÔNG có trạng thái toàn cục ẩn, và test được:\n" +
        "@Component\n" +
        "public class AppConfig {\n" +
        "    private final String environment;      // bất biến, tiêm từ cấu hình\n" +
        "    public AppConfig(@Value(\"${app.env}\") String env) { this.environment = env; }\n" +
        "}",
    },
  ],
},
{
  cat: 'Creational',
  q: 'Phân biệt IoC, Dependency Inversion (DIP), và Dependency Injection?',
  answer:
    '- **IoC (Inversion of Control)**: nguyên tắc rộng — framework/container điều khiển luồng, gọi code của bạn ("Hollywood principle"). Bao gồm cả template method, event, DI, lifecycle callbacks.\n' +
    '- **DIP (Dependency Inversion Principle — chữ D trong SOLID)**: nguyên tắc thiết kế — module cấp cao **không phụ thuộc** module cấp thấp; cả hai phụ thuộc **abstraction**. Abstraction không phụ thuộc chi tiết.\n' +
    '- **DI (Dependency Injection)**: **kỹ thuật cụ thể** để cung cấp phụ thuộc từ ngoài (thường qua constructor). Là *một cách* thực hiện IoC cho phần "lấy phụ thuộc".',
  essence:
    'DIP là "hãy phụ thuộc vào interface". DI là "hãy nhận interface đó từ bên ngoài". IoC là khái niệm bao trùm "ai điều khiển ai". DI phục vụ DIP; DIP + DI cho code lỏng lẻo, testable.',
  example:
    '`OrderService` (cấp cao) không `import EmailSender` (cấp thấp, cụ thể). Nó định nghĩa interface `Notifier` (DIP — abstraction thuộc về tầng cao). `EmailNotifier` implements `Notifier`. Container inject `EmailNotifier` vào `OrderService` (DI). Container điều khiển việc tạo & wiring (IoC).',
  viz: {
    type: 'tree',
    title: 'DI phục vụ DIP; IoC là khái niệm bao trùm',
    root: {
      label: '"Ai điều khiển ai" và "phụ thuộc vào cái gì"',
      children: [
        { label: 'IoC (Inversion of Control)', note: 'nguyên tắc rộng — framework gọi code của bạn (Hollywood principle). Gồm template method, event, DI, lifecycle callback' },
        { label: 'DIP (chữ D trong SOLID)', note: 'module cấp cao không phụ thuộc cấp thấp; cả hai phụ thuộc abstraction' },
        { label: 'DI (Dependency Injection)', note: 'kỹ thuật cụ thể — cung cấp phụ thuộc từ ngoài (thường qua constructor). Một cách thực hiện IoC' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba khái niệm hay bị dùng lẫn lộn",
      code:
        "// 1) IoC (Inversion of Control) — NGUYÊN TẮC RỘNG: quyền điều khiển luồng\n" +
        "//    chạy bị đảo ngược, framework gọi code của bạn thay vì ngược lại.\n" +
        "//    (\"Hollywood principle: don\u0027t call us, we\u0027ll call you\")\n" +
        "//    DI chỉ là MỘT dạng của IoC. Các dạng khác: template method, callback,\n" +
        "//    event listener, và toàn bộ mô hình lập trình hướng sự kiện.\n" +
        "@EventListener                       // framework gọi bạn, không phải bạn gọi nó\n" +
        "public void on(OrderPlaced e) { }\n" +
        "\n" +
        "// 2) DIP (Dependency Inversion Principle) — chữ D trong SOLID, nói về\n" +
        "//    HƯỚNG PHỤ THUỘC ở mức thiết kế:\n" +
        "//    \"Module cấp cao KHÔNG phụ thuộc module cấp thấp. Cả hai phụ thuộc\n" +
        "//     vào TRỪU TƯỢNG.\"\n" +
        "// VI PHẠM DIP:\n" +
        "public class OrderService {                    // cấp cao\n" +
        "    private final MySqlOrderRepository repo;   // phụ thuộc TRỰC TIẾP vào cấp thấp\n" +
        "}\n" +
        "// TUÂN THỦ DIP:\n" +
        "public class OrderService {\n" +
        "    private final OrderRepository repo;        // phụ thuộc vào TRỪU TƯỢNG\n" +
        "}\n" +
        "// Và quan trọng: interface OrderRepository thuộc về TẦNG DOMAIN, không\n" +
        "// thuộc tầng hạ tầng -> hướng phụ thuộc bị \"đảo ngược\" so với thông thường.\n" +
        "\n" +
        "// 3) DI (Dependency Injection) — KỸ THUẬT cụ thể để cung cấp phụ thuộc\n" +
        "public OrderService(OrderRepository repo) { this.repo = repo; }\n" +
        "\n" +
        "// QUAN HỆ: DIP nói NÊN phụ thuộc vào cái gì (trừu tượng).\n" +
        "//          DI nói LÀM THẾ NÀO để đưa phụ thuộc đó vào.\n" +
        "//          IoC là nguyên tắc bao trùm cả hai.\n" +
        "// Dùng DI mà tiêm class cụ thể -> có DI nhưng KHÔNG có DIP.\n" +
        "// Tự new interface trong constructor -> có DIP nhưng không có DI.",
    },
  ],
},
]);
