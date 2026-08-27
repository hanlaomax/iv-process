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
},
]);
