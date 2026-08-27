SS.addQuestions('design-patterns', [
{
  cat: 'Structural',
  q: 'Adapter pattern — vấn đề và cấu trúc?',
  answer:
    'Cho phép hai interface **không tương thích** làm việc với nhau bằng một lớp trung gian **chuyển đổi** interface này sang interface kia.\n\n' +
    '- **Object adapter** (composition, phổ biến): adapter *chứa* một instance của class cần adapt, và implements interface client mong đợi.\n' +
    '- **Class adapter** (kế thừa đa — không có trong Java thuần).\n\n' +
    'Dùng khi: muốn dùng một class/thư viện có sẵn nhưng interface của nó không khớp với code của bạn; tích hợp hệ legacy/bên thứ ba.',
  essence:
    'Adapter = "phích cắm chuyển đổi". Bạn không sửa được class nguồn (thư viện, legacy) và không muốn sửa client → đặt một lớp dịch ở giữa. Nó *thay đổi interface*, không thêm hành vi.',
  example:
    'Code của bạn dùng interface `PaymentGateway { PaymentResult charge(Money m); }`. Thư viện Stripe có `StripeClient.createCharge(long cents, String currency)`. `StripeAdapter implements PaymentGateway` bọc `StripeClient`, chuyển `Money` → `(cents, currency)` và response Stripe → `PaymentResult`.',
},
{
  cat: 'Structural',
  q: 'Adapter, Facade, Decorator, Proxy — phân biệt (dễ nhầm)?',
  answer:
    'Cả bốn đều "bọc" một object, nhưng **mục đích khác nhau**:\n' +
    '- **Adapter**: **đổi interface** để tương thích. `X` → interface `Y` mà client cần.\n' +
    '- **Facade**: **đơn giản hoá** — cung cấp một interface gọn cho một hệ thống con phức tạp (nhiều class). Giảm số thứ client phải biết.\n' +
    '- **Decorator**: **thêm hành vi** động, **giữ nguyên interface**. Có thể chồng nhiều lớp.\n' +
    '- **Proxy**: **kiểm soát truy cập**, **giữ nguyên interface** — lazy load, cache, remote, kiểm tra quyền, đo lường. Client tưởng đang gọi object thật.',
  essence:
    'Adapter đổi interface; Facade thu gọn interface; Decorator thêm chức năng cùng interface; Proxy chặn/kiểm soát cùng interface. Câu hỏi phân biệt: "interface có đổi không?" (chỉ Adapter/Facade) và "có thêm hành vi không?" (Decorator có, Proxy thường không — chỉ kiểm soát).',
  example:
    '`InputStream` của Java: `FileInputStream` (thật) → `BufferedInputStream` (Decorator: thêm buffering) → `GZIPInputStream` (Decorator: thêm giải nén). `Files.newBufferedReader(path)` là Facade (giấu việc tạo FileInputStream + InputStreamReader + BufferedReader). Hibernate lazy entity là Proxy.',
},
{
  cat: 'Structural',
  q: 'Decorator pattern — thêm chức năng mà không sửa class gốc?',
  answer:
    'Bọc object trong một "decorator" cùng interface, decorator thêm hành vi **trước/sau** khi uỷ quyền cho object bên trong. Có thể **chồng nhiều decorator**.\n\n' +
    '```\ninterface Coffee { double cost(); }\nclass Espresso implements Coffee { cost() { return 2.0; } }\nclass MilkDecorator implements Coffee {\n  private final Coffee inner;\n  MilkDecorator(Coffee c) { inner = c; }\n  double cost() { return inner.cost() + 0.5; }\n}\n```\n`new WhipDecorator(new MilkDecorator(new Espresso()))` → 3.0.\n\n' +
    'Dùng khi: cần nhiều **tổ hợp** tính năng tuỳ chọn mà nếu dùng kế thừa sẽ bùng nổ số class (`EspressoWithMilkAndWhip`, `LatteWithoutFoam`…).',
  essence:
    'Decorator = "kế thừa động, chồng được". Thay vì tạo class cho mọi tổ hợp tính năng, bạn ghép các decorator lúc runtime. Nguyên tắc "composition over inheritance" ở dạng thuần khiết.',
  example:
    'HTTP client: `client` → `RetryingClient(client)` → `LoggingClient(...)` → `AuthClient(...)`. Mỗi lớp thêm một mối quan tâm, tất cả cùng interface `HttpClient`, ghép tuỳ ý theo môi trường.',
},
{
  cat: 'Structural',
  q: 'Proxy pattern — các loại và use case?',
  answer:
    'Một object đứng thay cho object thật, cùng interface, **kiểm soát truy cập**:\n' +
    '- **Virtual proxy**: trì hoãn tạo/nạp object đắt tới khi thực sự cần (lazy loading).\n' +
    '- **Remote proxy**: đại diện local cho object ở process/máy khác (RPC stub).\n' +
    '- **Protection proxy**: kiểm tra quyền trước khi cho gọi.\n' +
    '- **Smart proxy / reference**: thêm hành vi phụ — đếm reference, cache kết quả, log, đo latency, mở transaction.\n\n' +
    'Client không biết mình đang nói với proxy hay object thật.',
  essence:
    'Proxy = "người gác cổng cùng bộ mặt". Nó chặn mọi lời gọi để làm thêm việc (lazy, cache, auth, remote, đo) mà object thật và client đều không cần biết.',
  example:
    'Hibernate: `order.getCustomer()` trả về một **proxy** `Customer` (chưa load từ DB). Chỉ khi bạn gọi `customer.getName()` thì proxy mới query DB (virtual proxy / lazy loading). Spring `@Transactional` bean là protection/smart proxy.',
},
{
  cat: 'Structural',
  q: 'JDK Dynamic Proxy và CGLIB — khác nhau, dùng khi nào?',
  answer:
    '- **JDK Dynamic Proxy**: tạo proxy **lúc runtime** implements một hoặc nhiều **interface**. `Proxy.newProxyInstance(cl, interfaces, invocationHandler)`. Chỉ hoạt động nếu target có interface. Không proxy được method không thuộc interface.\n' +
    '- **CGLIB** (hoặc ByteBuddy): tạo proxy bằng cách **sinh subclass** của class target lúc runtime, override method. Proxy được class **không có interface**. Không proxy được method `final`, class `final`, hoặc constructor.\n\n' +
    'Spring AOP: dùng JDK proxy nếu bean có interface, CGLIB nếu không (Spring Boot mặc định ép CGLIB — `proxyTargetClass=true`).',
  essence:
    'JDK proxy proxy theo **interface** (nhẹ, chuẩn JDK). CGLIB proxy theo **class** (subclass, mạnh hơn nhưng có giới hạn `final`). Cả hai là nền tảng của AOP, ORM lazy loading, mock framework.',
  example:
    '`@Service class OrderService` (không interface) + `@Transactional` → Spring dùng CGLIB tạo `OrderService$$SpringCGLIB$$0 extends OrderService`, override method để chèn transaction. Nếu `OrderService implements OrderApi` → có thể dùng JDK proxy implements `OrderApi`.',
},
{
  cat: 'Structural',
  q: 'Facade pattern — khi nào dùng?',
  answer:
    'Cung cấp **một interface đơn giản, thống nhất** cho một hệ thống con gồm nhiều class phức tạp. Client chỉ cần biết facade, không cần hiểu các class bên trong.\n\n' +
    'Dùng khi:\n' +
    '- Hệ con phức tạp, client chỉ cần vài use case đơn giản.\n' +
    '- Muốn **giảm coupling** giữa client và chi tiết hệ con → đổi bên trong không ảnh hưởng client.\n' +
    '- Muốn phân lớp: facade là điểm vào của mỗi tầng.\n\n' +
    'Facade **không** cấm truy cập trực tiếp class bên trong (khác Adapter/Proxy) — nó chỉ cung cấp lối tắt.',
  essence:
    'Facade = "quầy lễ tân" cho một hệ thống con. Nó không thêm chức năng, không đổi interface của các class con — nó gom một quy trình thường dùng thành một lời gọi đơn giản và che bớt sự phức tạp.',
  example:
    'Chuyển đổi video cần: `Codec`, `AudioMixer`, `BitrateReader`, `VideoFile`, `Muxer`… `VideoConverter.convert("in.mp4", "webm")` (facade) điều phối tất cả. Client chỉ gọi một dòng. Trong microservices, API Gateway/BFF đóng vai Facade cho tập service.',
},
{
  cat: 'Structural',
  q: 'Composite pattern — cây object với xử lý đồng nhất?',
  answer:
    'Cho phép **đối xử object đơn lẻ (leaf) và nhóm object (composite) giống nhau** qua một interface chung. Composite chứa danh sách con (leaf hoặc composite khác) → cấu trúc cây.\n\n' +
    '```\ninterface FileNode { long size(); }\nclass File implements FileNode { size() { return bytes; } }\nclass Folder implements FileNode {\n  List<FileNode> children;\n  size() { return children.stream().mapToLong(FileNode::size).sum(); }\n}\n```\n\n' +
    'Client gọi `node.size()` không cần biết đó là file hay folder.',
  essence:
    'Composite = "cây mà nút và lá cùng một interface". Client viết code đệ quy tự nhiên mà không phải `if (isLeaf) ... else ...` ở khắp nơi. Dùng cho: cấu trúc thư mục, DOM/UI tree, tổ chức nhân sự, biểu thức.',
  example:
    'UI: `Component` (interface `render()`). `Button`, `Label` (leaf). `Panel` (composite, chứa list `Component`, `render()` gọi render từng con). `window.render()` vẽ cả cây UI. Thêm loại component mới không sửa code duyệt cây.',
},
{
  cat: 'Structural',
  q: 'Bridge pattern — tách abstraction khỏi implementation?',
  answer:
    'Tách một hệ phân cấp thành **hai hệ phân cấp độc lập**: "abstraction" (cái client dùng) và "implementation" (cách làm), nối với nhau bằng composition (cây cầu).\n\n' +
    'Giải quyết **bùng nổ tổ hợp**: nếu có M kiểu abstraction × N kiểu implementation, kế thừa tạo M×N class; Bridge chỉ cần M + N.\n\n' +
    '```\nabstract class Shape { protected Renderer renderer; abstract void draw(); }\ninterface Renderer { void renderCircle(...); }  // SvgRenderer, CanvasRenderer\nclass Circle extends Shape { void draw() { renderer.renderCircle(...); } }\n```',
  essence:
    'Bridge = "hai trục biến thiên độc lập, nối bằng composition". Khi bạn thấy mình sắp tạo `RedSquare`, `BlueSquare`, `RedCircle`, `BlueCircle` (2 trục: hình × màu) → tách thành `Shape` giữ một `Color`.',
  example:
    'Notification: abstraction `Notification` (Alert, Reminder, News) × implementation `Channel` (Email, SMS, Push). Không tạo 9 class — `Notification` giữ một `Channel`, gọi `channel.send(...)`. Thêm channel Slack = 1 class, không phải 3.',
},
{
  cat: 'Structural',
  q: 'Flyweight pattern — chia sẻ object để tiết kiệm bộ nhớ?',
  answer:
    'Khi cần **rất nhiều** object gần giống nhau, tách state thành:\n' +
    '- **Intrinsic** (nội tại): phần **dùng chung, bất biến** → lưu trong flyweight, chia sẻ.\n' +
    '- **Extrinsic** (ngoại lai): phần **khác nhau theo ngữ cảnh** → truyền vào method từ ngoài, không lưu.\n\n' +
    'Một factory quản lý pool flyweight, trả về instance đã có nếu trùng intrinsic state.',
  essence:
    'Flyweight = "tách phần chung ra dùng chung". Thay vì 1 triệu object mỗi cái mang đủ dữ liệu, có ~vài chục flyweight (phần chung) + dữ liệu riêng truyền lúc dùng. Là kỹ thuật tối ưu bộ nhớ, thêm độ phức tạp.',
  example:
    'Text editor: 1 triệu ký tự trên màn hình. Không tạo 1 triệu object `Character` mang font/size/glyph. Tạo ~100 flyweight `Glyph` (một cho mỗi ký tự "a", "b"… + font) dùng chung; vị trí (x, y) là extrinsic, truyền vào `glyph.draw(x, y)`. Java `Integer.valueOf(-128..127)` cũng là flyweight.',
},
{
  cat: 'Structural',
  q: 'MVC, MVP, MVVM — khác nhau ở đâu?',
  answer:
    'Đều tách **Model** (dữ liệu + logic nghiệp vụ) khỏi phần hiển thị, khác ở cách nối View và logic trình bày:\n\n' +
    '- **MVC**: Controller nhận input, cập nhật Model; View quan sát Model và tự cập nhật. View và Model có thể biết nhau.\n' +
    '- **MVP**: View "thụ động" (passive), chỉ chuyển tiếp sự kiện cho **Presenter**; Presenter chứa toàn bộ logic trình bày, cập nhật View qua interface. View không biết Model. Dễ test Presenter.\n' +
    '- **MVVM**: **ViewModel** expose state/command dưới dạng observable; View **data-binding** hai chiều với ViewModel (framework lo đồng bộ). ViewModel không biết View. Phổ biến ở WPF, Android (Jetpack), Vue.',
  essence:
    'Tất cả là "tách UI khỏi logic". MVP: presenter đẩy dữ liệu vào view thụ động (test tốt, nhiều boilerplate). MVVM: view tự bind vào viewmodel qua framework (ít boilerplate, cần hỗ trợ data-binding).',
  example:
    'Android Jetpack (MVVM): `ViewModel` giữ `LiveData<UiState>`; Fragment (View) `observe` và render; user click → gọi `viewModel.onSubmit()`. ViewModel test được bằng JUnit thuần, không cần Android. Web: React component + hook state ≈ MVVM.',
},
{
  cat: 'Structural',
  q: 'Decorator vs kế thừa (inheritance) — chọn thế nào?',
  answer:
    '**Kế thừa**: quan hệ tĩnh, quyết định lúc compile. Thêm biến thể = thêm subclass. Nhiều "trục" biến thể → bùng nổ class. Vi phạm "favor composition".\n\n' +
    '**Decorator**: quan hệ động, ghép lúc runtime. Thêm biến thể = thêm một decorator, tổ hợp tuỳ ý. Nhược: nhiều object nhỏ, khó debug stack sâu, decorator phải cẩn thận giữ đúng hợp đồng interface.\n\n' +
    'Dùng Decorator khi: cần **nhiều tổ hợp** tính năng tuỳ chọn, thêm/bớt runtime. Dùng kế thừa khi: hệ phân cấp is-a rõ ràng, ít trục, ổn định.',
  essence:
    'Kế thừa cho "loại con cố định"; Decorator cho "tính năng ghép được". Câu hỏi: bạn có 3 tính năng độc lập bật/tắt được không? Nếu có, kế thừa cần 2³ = 8 class, Decorator cần 3.',
  example:
    'Cửa sổ có thể có: viền, thanh cuộn, tooltip — độc lập. Kế thừa: `BorderedScrollableWindow`, `BorderedWindow`, `ScrollableTooltipWindow`… Decorator: `new TooltipDecorator(new ScrollDecorator(new BorderDecorator(window)))` — ghép đúng cái cần.',
},
{
  cat: 'Structural',
  q: 'Proxy vs Decorator — cùng bọc object, khác gì?',
  answer:
    'Về cấu trúc code gần như giống nhau (bọc một object cùng interface, uỷ quyền). Khác ở **ý định**:\n\n' +
    '- **Decorator**: **thêm hành vi/trách nhiệm mới** cho object. Client chủ động ghép nhiều decorator theo nhu cầu. Object bên trong thường do client cung cấp.\n' +
    '- **Proxy**: **kiểm soát truy cập** tới object (lazy, remote, auth, cache, đo). Client thường không biết proxy tồn tại. Proxy thường **tự quản lý** object thật (tạo lúc cần, giữ tham chiếu remote).\n\n' +
    'Số lượng: nhiều decorator chồng nhau là bình thường; proxy thường một lớp.',
  essence:
    'Decorator: "tôi thêm chức năng, và bạn biết tôi ở đây". Proxy: "tôi thay mặt object thật, bạn không cần biết". Cùng khuôn wrapper, khác mục đích và mức độ hiển thị với client.',
  example:
    '`BufferedInputStream(new FileInputStream(f))` — client cố ý thêm buffering (Decorator). `orderRepository.findById(1)` trả về entity mà thực ra là Hibernate proxy lazy-load `Customer` bên trong — client không hề biết (Proxy).',
},
{
  cat: 'Structural',
  q: 'Structural pattern trong thư viện Java chuẩn — ví dụ?',
  answer:
    '- **Decorator**: `java.io` — `BufferedReader`, `InputStreamReader`, `GZIPInputStream`, `LineNumberReader` bọc nhau. `Collections.synchronizedList/unmodifiableList`.\n' +
    '- **Adapter**: `Arrays.asList(array)` (mảng → List), `InputStreamReader` (byte stream → char stream — vừa adapter vừa decorator).\n' +
    '- **Proxy**: `java.lang.reflect.Proxy` (dynamic proxy), RMI stub.\n' +
    '- **Facade**: `Files`, `Executors` (giấu việc tạo `ThreadPoolExecutor` với 7 tham số).\n' +
    '- **Composite**: `java.awt.Container` chứa `Component`; JSF/Swing component tree.\n' +
    '- **Flyweight**: `Integer.valueOf`, `String` pool.',
  essence:
    'Bạn đã dùng structural pattern hàng ngày. Nhận ra chúng trong thư viện quen thuộc giúp hiểu ý định và áp dụng đúng chỗ trong code của mình.',
  example:
    '`new BufferedReader(new InputStreamReader(new FileInputStream("f.txt"), UTF_8))`: `FileInputStream` (byte source) → `InputStreamReader` (adapter byte→char + decode) → `BufferedReader` (decorator: buffering + `readLine()`). Ba pattern trong một dòng.',
},
{
  cat: 'Structural',
  q: 'Facade vs API Gateway (trong microservices) — liên hệ?',
  answer:
    'API Gateway là **Facade ở cấp hệ thống phân tán**:\n' +
    '- Client (mobile, web) không cần biết có 20 microservice, gọi tới đâu, cấu trúc ra sao.\n' +
    '- Gateway cung cấp một interface gọn (`/api/v1/...`), che giấu topology bên trong.\n' +
    '- Đổi/tách/gộp service bên trong → client không ảnh hưởng (gateway route lại).\n\n' +
    'Khác: gateway còn làm cross-cutting (auth, rate limit, TLS) mà Facade GoF thuần không làm. BFF là Facade "theo từng loại client".',
  essence:
    'Cùng ý tưởng ở hai quy mô: Facade giấu sự phức tạp của một hệ con class; API Gateway giấu sự phức tạp của một mạng service. Cả hai cho client "một cửa" và tự do refactor phía sau.',
  example:
    'App mobile gọi `GET api.acme.com/home` → gateway/BFF gọi `feed-service`, `promo-service`, `user-service`, gộp kết quả. Sau này `feed-service` tách thành `feed` + `ranking` → app mobile không đổi một dòng code.',
},
{
  cat: 'Structural',
  q: 'Marker interface là gì? Còn dùng không?',
  answer:
    'Interface **không có method** (`Serializable`, `Cloneable`, `RandomAccess`), chỉ để **đánh dấu** một class có một thuộc tính/khả năng nào đó; code khác kiểm tra bằng `instanceof`.\n\n' +
    'Ngày nay phần lớn được thay bằng **annotation** (`@Entity`, `@FunctionalInterface`) — linh hoạt hơn (có tham số, retention policy, target).\n\n' +
    'Marker interface vẫn có chỗ khi: cần **kiểu** để dùng trong chữ ký/generic bound (annotation không tạo kiểu), hoặc compiler cần enforce (`@FunctionalInterface` kiểm tra một abstract method).',
  essence:
    'Marker interface = "gắn nhãn bằng kiểu". Annotation thường tốt hơn (metadata giàu hơn), nhưng marker interface thắng khi bạn cần cái nhãn đó tham gia vào hệ thống kiểu (generic, overload, chữ ký method).',
  example:
    '`Serializable`: JVM kiểm tra `obj instanceof Serializable` trước khi serialize. Nếu là annotation `@Serializable`, không thể viết `void save(Serializable s)` để chỉ nhận object serialize được. `RandomAccess`: `Collections.binarySearch` kiểm tra để chọn thuật toán.',
},
{
  cat: 'Structural',
  q: 'Khi nào một wrapper là over-engineering thay vì Decorator/Proxy hữu ích?',
  answer:
    'Wrapper thêm một lớp gián tiếp. Nó **không đáng** khi:\n' +
    '- Chỉ uỷ quyền 1-1 không thêm gì ("pass-through wrapper").\n' +
    '- "Để dễ mock sau này" nhưng object gốc đã là interface / đã mock được.\n' +
    '- Wrap một class đã dễ dùng, đã ổn định.\n' +
    '- Tạo ra chuỗi wrapper 4-5 tầng khiến debug phải nhảy nhiều file.\n\n' +
    'Đáng khi: thực sự thêm hành vi tái dùng (retry, cache, log, metric) áp cho nhiều nơi, hoặc thực sự cần kiểm soát truy cập (lazy, remote, auth).',
  essence:
    'Wrapper = gián tiếp = chi phí đọc hiểu. Trả tiền cho nó khi nó gom một mối quan tâm chéo (cross-cutting) tái dùng được. Wrap "cho sạch" hay "phòng xa" thường là nợ, không phải tài sản.',
  example:
    'Có ích: `MeteredRepository` wrap mọi repository để đo thời gian query → gắn một lần, áp cho tất cả. Vô ích: `UserServiceWrapper` chỉ gọi thẳng `userService.xxx()` cho mọi method "để trừu tượng hoá" — xoá đi, dùng `userService` trực tiếp.',
},
{
  cat: 'Structural',
  q: 'Composite + Visitor thường đi cùng nhau — vì sao?',
  answer:
    'Composite tạo **cây object** (nhiều loại nút: leaf, composite, các subtype). Khi cần **thêm nhiều thao tác mới** trên cây (in ra, tính tổng, validate, export JSON/XML) mà không muốn nhồi mọi thao tác vào các class nút:\n\n' +
    '**Visitor** tách thao tác ra thành class riêng. Mỗi visitor implements "làm gì với từng loại nút". Nút chỉ cần method `accept(Visitor v)`.\n\n' +
    'Đánh đổi: thêm **thao tác** mới rẻ (thêm visitor); thêm **loại nút** mới đắt (sửa mọi visitor).',
  essence:
    'Composite định nghĩa cấu trúc cây; Visitor định nghĩa các thao tác trên cây, tách rời. Dùng khi cấu trúc nút ổn định nhưng danh sách thao tác còn tăng (compiler AST là ví dụ kinh điển: nhiều pass phân tích trên cùng một AST).',
  example:
    'AST của một ngôn ngữ: các nút `Literal`, `BinaryOp`, `FunctionCall` (Composite). Visitor: `TypeCheckVisitor`, `PrettyPrintVisitor`, `EvalVisitor`, `BytecodeGenVisitor`. Thêm pass "optimize" = thêm một visitor, không sửa nút.',
},
{
  cat: 'Structural',
  q: 'Decorator để thêm cross-cutting concern (log, cache, retry, metric) — có phải AOP thủ công?',
  answer:
    'Đúng — chồng decorator là cách "AOP bằng tay": mỗi decorator là một **aspect** (một mối quan tâm cắt ngang) bọc quanh đối tượng.\n\n' +
    '```\nRepository repo = new LoggingRepo(new CachingRepo(new MeteredRepo(new JpaRepo())));\n```\n\n' +
    'So với AOP (Spring `@Transactional`, `@Cacheable`):\n' +
    '- Decorator: **tường minh** (thấy rõ thứ tự bọc trong code), không "phép thuật", debug dễ, nhưng phải viết wrapper + wiring cho mỗi interface.\n' +
    '- AOP proxy: **ngầm** (annotation), ít code, nhưng self-invocation không hoạt động, khó thấy hành vi thực, phụ thuộc container.',
  essence:
    'Decorator và AOP giải cùng bài toán (thêm hành vi cắt ngang mà không sửa lõi). Decorator: tường minh, nhiều boilerplate. AOP: ngầm, ít code, nhiều "bẫy". Với ít interface và muốn rõ ràng → Decorator; với hàng trăm điểm áp dụng → AOP.',
  example:
    'Client HTTP: `new ObservableClient(new RetryingClient(new AuthClient(baseClient)))` — nhìn code biết ngay: mọi call được auth, rồi retry, rồi đo. So với `@Retryable` + interceptor auth + `@Timed` rải rác — ngắn hơn nhưng phải đọc 3 chỗ để hiểu.',
},
{
  cat: 'Structural',
  q: 'Bridge vs Adapter — dễ nhầm, phân biệt thế nào?',
  answer:
    '- **Adapter**: áp dụng **sau khi** hệ thống đã tồn tại — bạn có `X` không khớp, cần làm nó khớp với `Y`. Mục tiêu: **tương thích** với cái đã có. Thường không định trước.\n' +
    '- **Bridge**: quyết định **thiết kế từ đầu** — bạn *cố ý* tách abstraction và implementation thành hai hệ phân cấp để chúng biến thiên độc lập. Mục tiêu: **linh hoạt mở rộng** hai chiều.\n\n' +
    'Adapter làm cho hai thứ không hợp làm việc được với nhau; Bridge ngăn hai thứ trở nên gắn chặt ngay từ đầu.',
  essence:
    'Adapter = chữa cháy tương thích (reactive). Bridge = thiết kế trước cho hai trục thay đổi độc lập (proactive). Cùng dùng composition, khác thời điểm và ý định.',
  example:
    'Adapter: tích hợp SDK thanh toán mới có interface lạ → viết adapter về interface `PaymentGateway` của bạn. Bridge: ngay từ đầu thiết kế `Report` (PDF/HTML/CSV) tách khỏi `DataSource` (SQL/API/File) vì biết cả hai trục sẽ tăng.',
},
{
  cat: 'Structural',
  q: 'Module pattern / cấu trúc package để enforce ranh giới trong monolith?',
  answer:
    'Trong một monolith/modular monolith, dùng cấu trúc package + công cụ để **enforce** ranh giới module (mỗi module ≈ bounded context):\n' +
    '- **Package by feature** (`com.acme.order`, `com.acme.billing`), không package by layer (`com.acme.controller`, `...service`).\n' +
    '- Mỗi module có **package public API** (`com.acme.order.api`) — nơi duy nhất module khác được import; phần còn lại `internal`.\n' +
    '- Enforce bằng: **ArchUnit** test, **Java Module System** (JPMS `exports`), **Spring Modulith**, hoặc Gradle sub-project với dependency rõ ràng.\n' +
    '- Module giao tiếp qua interface + event nội bộ, không truy cập class internal của nhau.',
  essence:
    'Ranh giới module không tự nhiên tồn tại — phải enforce bằng công cụ, nếu không mọi thứ dần import lẫn nhau. Cấu trúc package theo feature + kiểm tra tự động (ArchUnit) giữ monolith "modular" thật sự.',
  example:
    'ArchUnit test: `noClasses().that().resideInAPackage("..order.internal..").should().beAccessedByClassesThat().resideOutsideOfPackage("..order..")` → CI fail nếu `billing` lỡ import `order.internal.OrderEntity`. Buộc phải dùng `order.api.OrderService`.',
},
]);
