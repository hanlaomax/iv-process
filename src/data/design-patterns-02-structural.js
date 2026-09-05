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
  viz: {
    type: 'flow',
    title: '"Phích cắm chuyển đổi" — đổi interface, không thêm hành vi',
    nodes: ['Client mong interface Y (PaymentGateway)', 'Adapter implements Y, chứa X', 'Chuyển đổi lời gọi + kiểu dữ liệu', 'X thật (StripeClient — interface lạ, không sửa được)'],
    steps: [
      { to: 1, label: 'Object adapter: composition (phổ biến hơn class adapter)' },
      { to: 2, label: 'Money → (cents, currency); response Stripe → PaymentResult' },
      { to: 3, label: 'Dùng khi: class/thư viện có sẵn không khớp code của bạn; tích hợp legacy' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Dịch giữa hai interface không khớp",
      code:
        "// VẤN ĐỀ: code của bạn cần interface A, thư viện bên ngoài cung cấp interface B.\n" +
        "// Không sửa được thư viện, và không muốn để interface của nó lan vào code mình.\n" +
        "\n" +
        "// Interface MÀ CODE CỦA BẠN CẦN:\n" +
        "public interface PaymentGateway {\n" +
        "    PaymentResult charge(Money amount, String cardToken);\n" +
        "}\n" +
        "\n" +
        "// Interface CỦA THƯ VIỆN — hoàn toàn khác:\n" +
        "public class StripeApi {\n" +
        "    public StripeCharge createCharge(long amountInCents, String currency,\n" +
        "                                     String source, Map<String, String> metadata) { ... }\n" +
        "}\n" +
        "\n" +
        "// ADAPTER: dịch giữa hai thế giới\n" +
        "public class StripeAdapter implements PaymentGateway {\n" +
        "    private final StripeApi stripe;\n" +
        "\n" +
        "    @Override\n" +
        "    public PaymentResult charge(Money amount, String cardToken) {\n" +
        "        StripeCharge c = stripe.createCharge(\n" +
        "            amount.toCents(),                          // Money -> long cents\n" +
        "            amount.currency().getCurrencyCode(),\n" +
        "            cardToken,\n" +
        "            Map.of());\n" +
        "        return c.isPaid()                              // StripeCharge -> PaymentResult\n" +
        "            ? PaymentResult.success(c.getId())\n" +
        "            : PaymentResult.failed(c.getFailureMessage());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: đổi sang Paypal chỉ cần viết PaypalAdapter; code nghiệp vụ\n" +
        "// KHÔNG đổi một dòng. Và test được bằng cách mock PaymentGateway.\n" +
        "\n" +
        "// HAI BIẾN THỂ:\n" +
        "//  OBJECT ADAPTER (như trên) — adapter GIỮ một tham chiếu tới đối tượng\n" +
        "//    được thích ứng. Linh hoạt, dùng composition. LUÔN chọn cách này.\n" +
        "//  CLASS ADAPTER — adapter KẾ THỪA class được thích ứng. Java không đa kế\n" +
        "//    thừa nên hạn chế, và gắn chặt hơn.\n" +
        "\n" +
        "// Trong JDK: InputStreamReader (byte stream -> char stream),\n" +
        "// Arrays.asList (mảng -> List), Collections.enumeration (Iterator -> Enumeration).",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Pattern',
    cols: ['Adapter', 'Facade', 'Decorator', 'Proxy'],
    rows: [
      ['Interface đổi?', 'có (X → Y)', 'có (thu gọn)', 'không', 'không'],
      ['Thêm hành vi?', 'không', 'không', 'có', 'thường không (chỉ kiểm soát)'],
      ['Mục đích', 'tương thích', 'đơn giản hoá hệ con', 'thêm chức năng động', 'kiểm soát truy cập (lazy/cache/auth/remote)'],
      ['Chồng nhiều lớp?', 'không', 'không', 'có', 'thường một'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn pattern cùng \"bọc\" object, khác nhau ở MỤC ĐÍCH",
      code:
        "// Cả bốn đều bọc một object khác. Phân biệt bằng câu hỏi \"để làm gì\".\n" +
        "\n" +
        "// ADAPTER — ĐỔI INTERFACE. Interface vào khác interface ra.\n" +
        "public class StripeAdapter implements PaymentGateway {   // interface CỦA TA\n" +
        "    private final StripeApi stripe;                       // interface CỦA HỌ\n" +
        "}\n" +
        "// Mục đích: làm cho hai thứ không khớp có thể làm việc với nhau.\n" +
        "\n" +
        "// FACADE — ĐƠN GIẢN HOÁ. Một interface DỄ cho một hệ thống PHỨC TẠP.\n" +
        "public class OrderFacade {\n" +
        "    public void placeOrder(Cart cart) {                   // MỘT lời gọi\n" +
        "        inventory.reserve(cart);                          // thay cho NĂM\n" +
        "        var payment = paymentGateway.charge(cart.total());\n" +
        "        var order = orderRepo.create(cart, payment);\n" +
        "        shipping.schedule(order);\n" +
        "        notifications.send(order);\n" +
        "    }\n" +
        "}\n" +
        "// Mục đích: giảm số thứ client phải biết. Interface MỚI, đơn giản hơn.\n" +
        "\n" +
        "// DECORATOR — THÊM HÀNH VI. Interface RA GIỐNG interface VÀO.\n" +
        "public class CachingRepository implements OrderRepository {\n" +
        "    private final OrderRepository delegate;               // CÙNG interface\n" +
        "    public Order find(String id) {\n" +
        "        return cache.computeIfAbsent(id, delegate::find); // thêm cache\n" +
        "    }\n" +
        "}\n" +
        "// Mục đích: thêm chức năng mà không sửa class gốc. LỒNG NHAU được.\n" +
        "\n" +
        "// PROXY — KIỂM SOÁT TRUY CẬP. Interface giống, nhưng quyết định CÓ GỌI hay không.\n" +
        "public class SecuredService implements Service {\n" +
        "    private final Service delegate;\n" +
        "    public void execute() {\n" +
        "        if (!currentUser().isAdmin()) throw new AccessDeniedException();\n" +
        "        delegate.execute();                               // có thể KHÔNG gọi\n" +
        "    }\n" +
        "}\n" +
        "// Mục đích: kiểm soát khi nào và có được truy cập object thật hay không.\n" +
        "\n" +
        "// TÓM TẮT: Adapter đổi HÌNH DẠNG. Facade đơn giản hoá QUY MÔ.\n" +
        "//          Decorator thêm CHỨC NĂNG. Proxy kiểm soát TRUY CẬP.",
    },
  ],
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
  viz: {
    type: 'layers',
    title: '"Kế thừa động, chồng được" — composition over inheritance thuần khiết',
    layers: [
      { name: 'WhipDecorator', tag: '+0.7', note: 'cost() = inner.cost() + 0.7' },
      { name: 'MilkDecorator', tag: '+0.5', note: 'cost() = inner.cost() + 0.5' },
      { name: 'Espresso', tag: '2.0', note: 'object gốc — cùng interface Coffee' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bọc nhiều lớp, mỗi lớp một trách nhiệm",
      code:
        "public interface DataSource {\n" +
        "    void write(String data);\n" +
        "    String read();\n" +
        "}\n" +
        "\n" +
        "public class FileDataSource implements DataSource {       // thành phần GỐC\n" +
        "    public void write(String data) { Files.writeString(path, data); }\n" +
        "    public String read() { return Files.readString(path); }\n" +
        "}\n" +
        "\n" +
        "// DECORATOR CƠ SỞ: giữ tham chiếu và chuyển tiếp\n" +
        "public abstract class DataSourceDecorator implements DataSource {\n" +
        "    protected final DataSource wrappee;\n" +
        "    protected DataSourceDecorator(DataSource wrappee) { this.wrappee = wrappee; }\n" +
        "    public void write(String data) { wrappee.write(data); }\n" +
        "    public String read() { return wrappee.read(); }\n" +
        "}\n" +
        "\n" +
        "public class EncryptionDecorator extends DataSourceDecorator {\n" +
        "    public EncryptionDecorator(DataSource w) { super(w); }\n" +
        "    @Override public void write(String data) { super.write(encrypt(data)); }\n" +
        "    @Override public String read() { return decrypt(super.read()); }\n" +
        "}\n" +
        "public class CompressionDecorator extends DataSourceDecorator {\n" +
        "    public CompressionDecorator(DataSource w) { super(w); }\n" +
        "    @Override public void write(String data) { super.write(compress(data)); }\n" +
        "    @Override public String read() { return decompress(super.read()); }\n" +
        "}\n" +
        "\n" +
        "// LỒNG NHAU — thứ tự QUAN TRỌNG (nén trước rồi mã hoá, hay ngược lại)\n" +
        "DataSource ds = new EncryptionDecorator(\n" +
        "                    new CompressionDecorator(\n" +
        "                        new FileDataSource(\"data.txt\")));\n" +
        "ds.write(\"nội dung\");     // nén -> mã hoá -> ghi file\n" +
        "\n" +
        "// ƯU SO VỚI KẾ THỪA: kế thừa cần 2^n lớp cho n tính năng\n" +
        "// (FileEncrypted, FileCompressed, FileEncryptedCompressed...).\n" +
        "// Decorator: n lớp, kết hợp LÚC CHẠY theo bất kỳ thứ tự nào.\n" +
        "\n" +
        "// TRONG JDK: java.io là ví dụ kinh điển\n" +
        "new BufferedReader(new InputStreamReader(new FileInputStream(\"f.txt\")));\n" +
        "// Trong thực tế: thêm log, cache, retry, metric, kiểm tra quyền quanh\n" +
        "// một service mà không đụng vào code nghiệp vụ.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: '"Người gác cổng cùng bộ mặt" — client không biết',
    root: {
      label: 'Object đứng thay object thật, cùng interface, kiểm soát truy cập',
      children: [
        { label: 'Virtual proxy', note: 'trì hoãn tạo/nạp object đắt tới khi thực sự cần (lazy loading)' },
        { label: 'Remote proxy', note: 'đại diện local cho object ở process/máy khác (RPC stub)' },
        { label: 'Protection proxy', note: 'kiểm tra quyền trước khi cho gọi' },
        { label: 'Smart proxy / reference', note: 'đếm reference, cache, log, đo latency, mở transaction' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Bốn loại proxy, cùng interface với đối tượng thật",
      code:
        "public interface ImageLoader { Image load(String path); }\n" +
        "\n" +
        "// 1) VIRTUAL PROXY — hoãn việc tạo object đắt tới khi thật sự cần\n" +
        "public class LazyImageLoader implements ImageLoader {\n" +
        "    private final Map<String, Image> cache = new ConcurrentHashMap<>();\n" +
        "    public Image load(String path) {\n" +
        "        return cache.computeIfAbsent(path, p -> new RealImageLoader().load(p));\n" +
        "    }\n" +
        "}\n" +
        "// Hibernate dùng cách này cho lazy loading: object trả về là PROXY, chỉ\n" +
        "// truy vấn database khi bạn gọi getter đầu tiên.\n" +
        "\n" +
        "// 2) PROTECTION PROXY — kiểm soát quyền truy cập\n" +
        "public class SecuredDocumentService implements DocumentService {\n" +
        "    private final DocumentService delegate;\n" +
        "    public Document get(String id) {\n" +
        "        if (!currentUser().canRead(id)) throw new AccessDeniedException();\n" +
        "        return delegate.get(id);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 3) REMOTE PROXY — object cục bộ đại diện cho object ở XA\n" +
        "// (RMI, gRPC stub, Feign client — bạn gọi như method thường, nó gửi request)\n" +
        "@FeignClient(name = \"payment-service\")\n" +
        "public interface PaymentClient {\n" +
        "    @PostMapping(\"/payments\") PaymentResult charge(@RequestBody ChargeRequest r);\n" +
        "}\n" +
        "\n" +
        "// 4) SMART PROXY / caching proxy — thêm hành vi khi truy cập\n" +
        "//    (đếm tham chiếu, ghi log, cache, mở transaction)\n" +
        "\n" +
        "// TRONG SPRING: @Transactional, @Cacheable, @Async, @PreAuthorize đều\n" +
        "// hoạt động bằng cách bọc bean của bạn trong một PROXY.\n" +
        "// -> Đây là lý do SELF-INVOCATION không hoạt động: gọi this.method()\n" +
        "//    KHÔNG đi qua proxy, nên annotation không có tác dụng.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['JDK Dynamic Proxy', 'CGLIB / ByteBuddy'],
    rows: [
      ['Cơ chế', 'implements interface lúc runtime', 'sinh subclass của class target'],
      ['Cần interface?', 'có', 'không'],
      ['Giới hạn', 'không proxy method ngoài interface', 'không proxy method/class final, constructor'],
      ['Spring dùng khi', 'bean có interface', 'bean không interface (Boot mặc định ép CGLIB)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Hai cách sinh proxy lúc chạy",
      code:
        "// JDK DYNAMIC PROXY — chỉ proxy được INTERFACE, có sẵn trong JDK\n" +
        "public class LoggingHandler implements InvocationHandler {\n" +
        "    private final Object target;\n" +
        "    public LoggingHandler(Object target) { this.target = target; }\n" +
        "\n" +
        "    @Override\n" +
        "    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {\n" +
        "        long start = System.nanoTime();\n" +
        "        try {\n" +
        "            return method.invoke(target, args);\n" +
        "        } finally {\n" +
        "            log.info(\"{} mất {}ms\", method.getName(), (System.nanoTime() - start) / 1e6);\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "PaymentGateway proxy = (PaymentGateway) Proxy.newProxyInstance(\n" +
        "    PaymentGateway.class.getClassLoader(),\n" +
        "    new Class<?>[]{ PaymentGateway.class },        // BẮT BUỘC là interface\n" +
        "    new LoggingHandler(realGateway));\n" +
        "\n" +
        "// CGLIB — sinh LỚP CON lúc chạy, proxy được cả class KHÔNG có interface\n" +
        "Enhancer e = new Enhancer();\n" +
        "e.setSuperclass(OrderService.class);\n" +
        "e.setCallback((MethodInterceptor) (obj, method, args, mp) -> {\n" +
        "    log.info(\"gọi {}\", method.getName());\n" +
        "    return mp.invokeSuper(obj, args);\n" +
        "});\n" +
        "OrderService proxy = (OrderService) e.create();\n" +
        "\n" +
        "// SO SÁNH:\n" +
        "//  JDK   — cần interface; nhẹ; có sẵn; KHÔNG proxy được method không nằm\n" +
        "//          trong interface\n" +
        "//  CGLIB — không cần interface; NHƯNG class và method không được final,\n" +
        "//          và cần constructor gọi được; nặng hơn (sinh bytecode)\n" +
        "\n" +
        "// SPRING: mặc định dùng CGLIB (spring.aop.proxy-target-class=true).\n" +
        "// Trước đây nó tự chọn: có interface thì JDK proxy, không thì CGLIB —\n" +
        "// điều này gây lỗi khó hiểu khi tiêm bean theo class trong khi proxy là JDK.\n" +
        "\n" +
        "// CẢ HAI đều KHÔNG chặn được self-invocation, vì lời gọi this.method()\n" +
        "// không đi qua proxy. Cần chặn thật sự -> AspectJ (weaving lúc biên dịch).",
    },
  ],
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
  viz: {
    type: 'flow',
    title: '"Quầy lễ tân" — gom một quy trình thường dùng thành một lời gọi',
    nodes: ['Client: VideoConverter.convert("in.mp4", "webm")', 'Facade điều phối', 'Codec + AudioMixer + BitrateReader + Muxer', 'Output'],
    steps: [
      { to: 1, label: 'Client chỉ cần biết facade, không hiểu class bên trong' },
      { to: 2, label: 'Facade không thêm chức năng, không đổi interface class con' },
      { to: 3, label: 'Không cấm truy cập trực tiếp class bên trong (khác Adapter/Proxy) — chỉ là lối tắt' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một cửa vào đơn giản cho hệ thống phức tạp",
      code:
        "// KHÔNG CÓ FACADE — client phải biết 5 hệ thống con và ĐÚNG THỨ TỰ gọi\n" +
        "public class OrderController {\n" +
        "    public void placeOrder(Cart cart) {\n" +
        "        inventoryService.checkAvailability(cart);\n" +
        "        var reservation = inventoryService.reserve(cart);\n" +
        "        var payment = paymentService.charge(cart.total(), cart.paymentMethod());\n" +
        "        var order = orderRepository.create(cart, payment, reservation);\n" +
        "        shippingService.schedule(order);\n" +
        "        notificationService.sendConfirmation(order);\n" +
        "        analyticsService.trackPurchase(order);\n" +
        "    }\n" +
        "}\n" +
        "// -> Controller biết QUÁ NHIỀU; đổi quy trình là phải sửa mọi nơi gọi.\n" +
        "\n" +
        "// CÓ FACADE:\n" +
        "@Service\n" +
        "public class OrderFacade {\n" +
        "    public OrderResult placeOrder(Cart cart) {\n" +
        "        var reservation = inventory.reserve(cart);\n" +
        "        try {\n" +
        "            var payment = payments.charge(cart.total(), cart.paymentMethod());\n" +
        "            var order = orders.create(cart, payment, reservation);\n" +
        "            shipping.schedule(order);\n" +
        "            notifications.sendConfirmation(order);\n" +
        "            return OrderResult.success(order);\n" +
        "        } catch (PaymentException e) {\n" +
        "            inventory.release(reservation);          // logic bù trừ nằm Ở ĐÂY\n" +
        "            return OrderResult.failed(e.getMessage());\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "public class OrderController {\n" +
        "    public void placeOrder(Cart cart) { facade.placeOrder(cart); }   // MỘT lời gọi\n" +
        "}\n" +
        "\n" +
        "// KHI NÀO DÙNG: hệ thống con phức tạp, nhiều client cần cùng một quy trình,\n" +
        "// hoặc muốn tạo một ranh giới rõ ràng cho một module.\n" +
        "\n" +
        "// LƯU Ý QUAN TRỌNG: facade KHÔNG che giấu hoàn toàn — client vẫn dùng\n" +
        "// trực tiếp hệ thống con được khi cần điều khiển chi tiết.\n" +
        "// CẠM BẪY: facade phình thành GOD OBJECT chứa mọi logic nghiệp vụ.\n" +
        "// Nó chỉ nên ĐIỀU PHỐI, không nên tự mình quyết định quy tắc nghiệp vụ.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Cây mà nút và lá cùng một interface — client gọi node.size() không cần biết loại',
    root: {
      label: 'Folder (composite) — size() = tổng size các con',
      children: [
        { label: 'File a.txt (leaf)', note: 'size() = bytes' },
        {
          label: 'Folder sub/ (composite)',
          children: [
            { label: 'File b.png (leaf)', note: '' },
            { label: 'File c.log (leaf)', note: '' },
          ],
        },
        { label: 'File d.md (leaf)', note: 'dùng cho: thư mục, DOM/UI tree, tổ chức nhân sự, biểu thức' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Lá và nhánh dùng chung một interface",
      code:
        "public interface FileSystemNode {\n" +
        "    String name();\n" +
        "    long size();\n" +
        "    void print(String indent);\n" +
        "}\n" +
        "\n" +
        "// LÁ — không có con\n" +
        "public record FileNode(String name, long size) implements FileSystemNode {\n" +
        "    public void print(String indent) {\n" +
        "        System.out.println(indent + name + \" (\" + size + \" bytes)\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// NHÁNH — chứa các node khác, CÙNG interface\n" +
        "public class DirectoryNode implements FileSystemNode {\n" +
        "    private final String name;\n" +
        "    private final List<FileSystemNode> children = new ArrayList<>();\n" +
        "\n" +
        "    public void add(FileSystemNode child) { children.add(child); }\n" +
        "\n" +
        "    @Override\n" +
        "    public long size() {\n" +
        "        return children.stream().mapToLong(FileSystemNode::size).sum();   // ĐỆ QUY\n" +
        "    }\n" +
        "    @Override\n" +
        "    public void print(String indent) {\n" +
        "        System.out.println(indent + name + \"/\");\n" +
        "        children.forEach(c -> c.print(indent + \"  \"));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// CLIENT XỬ LÝ LÁ VÀ NHÁNH NHƯ NHAU — đây là điểm cốt lõi:\n" +
        "FileSystemNode node = getNode();\n" +
        "System.out.println(node.size());     // không cần biết đó là file hay thư mục\n" +
        "\n" +
        "// ỨNG DỤNG: cây thư mục, cây UI component, cấu trúc tổ chức, menu nhiều\n" +
        "// cấp, biểu thức toán học, và cây quy tắc nghiệp vụ (điều kiện AND/OR lồng nhau).\n" +
        "\n" +
        "// ĐÁNH ĐỔI THIẾT KẾ: đặt add()/remove() ở đâu?\n" +
        "//  - ở INTERFACE CHUNG: client xử lý đồng nhất hoàn toàn, nhưng lá phải\n" +
        "//    cài đặt add() rồi ném UnsupportedOperationException (vi phạm LSP)\n" +
        "//  - chỉ ở NHÁNH (như trên): an toàn về kiểu, nhưng client phải ép kiểu\n" +
        "//    khi muốn thêm con\n" +
        "// -> GoF nghiêng về cách một; thực tế cách hai thường an toàn hơn.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Hai trục biến thiên độc lập, nối bằng composition → M+N thay vì M×N',
    root: {
      label: 'Shape giữ một Renderer (cây cầu)',
      children: [
        { label: 'Abstraction (cái client dùng)', note: 'Notification: Alert / Reminder / News' },
        { label: 'Implementation (cách làm)', note: 'Channel: Email / SMS / Push' },
        { label: 'Kế thừa → M×N class', note: 'RedSquare, BlueSquare, RedCircle… bùng nổ tổ hợp' },
        { label: 'Bridge → M+N class', note: 'thêm channel Slack = 1 class, không phải 3' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Hai chiều thay đổi độc lập",
      code:
        "// VẤN ĐỀ: có 2 chiều biến thiên — loại THÔNG BÁO (cảnh báo, nhắc nhở, báo cáo)\n" +
        "// và KÊNH GỬI (email, SMS, Slack). Dùng kế thừa cần 3 x 3 = 9 lớp.\n" +
        "// Thêm một kênh -> thêm 3 lớp nữa. Bùng nổ tổ hợp.\n" +
        "\n" +
        "// BRIDGE: tách hai chiều thành hai hệ phân cấp ĐỘC LẬP, nối bằng composition.\n" +
        "// CHIỀU 1 — IMPLEMENTATION (kênh gửi)\n" +
        "public interface MessageSender {\n" +
        "    void send(String to, String subject, String body);\n" +
        "}\n" +
        "public class EmailSender implements MessageSender { ... }\n" +
        "public class SmsSender implements MessageSender { ... }\n" +
        "public class SlackSender implements MessageSender { ... }\n" +
        "\n" +
        "// CHIỀU 2 — ABSTRACTION (loại thông báo)\n" +
        "public abstract class Notification {\n" +
        "    protected final MessageSender sender;              // CẦU NỐI\n" +
        "    protected Notification(MessageSender sender) { this.sender = sender; }\n" +
        "    public abstract void notify(String to, Map<String, Object> data);\n" +
        "}\n" +
        "\n" +
        "public class AlertNotification extends Notification {\n" +
        "    public AlertNotification(MessageSender s) { super(s); }\n" +
        "    public void notify(String to, Map<String, Object> data) {\n" +
        "        sender.send(to, \"[KHẨN] \" + data.get(\"title\"), renderAlert(data));\n" +
        "    }\n" +
        "}\n" +
        "public class ReportNotification extends Notification {\n" +
        "    public ReportNotification(MessageSender s) { super(s); }\n" +
        "    public void notify(String to, Map<String, Object> data) {\n" +
        "        sender.send(to, \"Báo cáo \" + data.get(\"period\"), renderReport(data));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Kết hợp TỰ DO lúc chạy: 3 + 3 = 6 lớp thay vì 9, và thêm một kênh\n" +
        "// chỉ tốn MỘT lớp:\n" +
        "new AlertNotification(new SmsSender()).notify(\"0901234567\", data);\n" +
        "new ReportNotification(new EmailSender()).notify(\"a@x.com\", data);\n" +
        "\n" +
        "// KHÁC ADAPTER: adapter sửa chữa hai interface KHÔNG khớp (thường là sau\n" +
        "// khi đã có sẵn). Bridge được THIẾT KẾ TRƯỚC để hai chiều tiến hoá độc lập.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: '"Tách phần chung ra dùng chung" — kỹ thuật tối ưu bộ nhớ',
    root: {
      label: '1 triệu object → ~vài chục flyweight + dữ liệu riêng truyền lúc dùng',
      children: [
        { label: 'Intrinsic (nội tại)', note: 'phần dùng chung, bất biến → lưu trong flyweight, chia sẻ (glyph "a" + font)' },
        { label: 'Extrinsic (ngoại lai)', note: 'phần khác theo ngữ cảnh → truyền vào method từ ngoài (vị trí x, y)' },
        { label: 'Factory quản pool flyweight', note: 'trả instance đã có nếu trùng intrinsic state' },
        { label: 'Ví dụ JDK', note: 'Integer.valueOf(-128..127), String pool' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Tách state chung ra để dùng lại",
      code:
        "// VẤN ĐỀ: một triệu ký tự trên màn hình, mỗi ký tự là một object chứa\n" +
        "// font, size, màu... -> tốn bộ nhớ khủng khiếp, dù chỉ có vài chục kiểu.\n" +
        "\n" +
        "// TÁCH STATE:\n" +
        "//  INTRINSIC (nội tại) — dùng chung, BẤT BIẾN, được CHIA SẺ\n" +
        "public record CharacterStyle(String fontFamily, int fontSize, Color color) { }\n" +
        "\n" +
        "//  EXTRINSIC (ngoại lai) — riêng cho từng thể hiện, do CLIENT giữ\n" +
        "public record CharacterPosition(int x, int y) { }\n" +
        "\n" +
        "// FACTORY quản lý các flyweight, đảm bảo chỉ tạo MỘT lần cho mỗi biến thể\n" +
        "public class StyleFactory {\n" +
        "    private static final Map<String, CharacterStyle> CACHE = new ConcurrentHashMap<>();\n" +
        "\n" +
        "    public static CharacterStyle get(String font, int size, Color color) {\n" +
        "        return CACHE.computeIfAbsent(font + size + color,\n" +
        "            k -> new CharacterStyle(font, size, color));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Một triệu ký tự -> chỉ vài chục object CharacterStyle được tạo:\n" +
        "for (var ch : text) {\n" +
        "    CharacterStyle style = StyleFactory.get(\"Arial\", 12, BLACK);   // DÙNG LẠI\n" +
        "    render(ch, style, new CharacterPosition(x, y));\n" +
        "}\n" +
        "\n" +
        "// TRONG JDK: Integer.valueOf cache [-128,127], String pool, Boolean.TRUE/FALSE.\n" +
        "Integer a = Integer.valueOf(100), b = Integer.valueOf(100);\n" +
        "System.out.println(a == b);        // true — cùng một flyweight\n" +
        "\n" +
        "// ĐIỀU KIỆN ĐỂ ĐÁNG DÙNG:\n" +
        "//  - RẤT NHIỀU object (hàng trăm nghìn trở lên)\n" +
        "//  - phần lớn state là DÙNG CHUNG được\n" +
        "//  - state chia sẻ phải BẤT BIẾN (nếu không, sửa một chỗ ảnh hưởng mọi nơi)\n" +
        "// Không đủ ba điều kiện -> flyweight chỉ thêm phức tạp. Trong Java hiện đại,\n" +
        "// pattern này hiếm khi cần vì GC và bộ nhớ đã rất khác thời GoF.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['MVC', 'MVP', 'MVVM'],
    rows: [
      ['View', 'quan sát Model, tự cập nhật', 'thụ động — chỉ chuyển tiếp sự kiện', 'data-binding hai chiều với ViewModel'],
      ['Logic trình bày ở', 'Controller', 'Presenter (toàn bộ)', 'ViewModel'],
      ['View biết Model?', 'có thể', 'không', 'không'],
      ['Test', 'khó tách', 'Presenter test tốt (nhiều boilerplate)', 'ViewModel test bằng JUnit thuần (cần data-binding)'],
      ['Phổ biến', 'web classic', 'Android cũ, GWT', 'WPF, Android Jetpack, Vue' ],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba cách tách giao diện khỏi logic",
      code:
        "// MVC — Model, View, Controller\n" +
        "//   View  <- Model (view ĐỌC TRỰC TIẾP model, hoặc nhận qua controller)\n" +
        "//   Controller nhận input, cập nhật Model\n" +
        "@Controller\n" +
        "public class OrderController {\n" +
        "    @PostMapping(\"/orders\")\n" +
        "    public String create(@ModelAttribute OrderForm form, Model model) {\n" +
        "        Order order = orderService.place(form.toCommand());   // cập nhật MODEL\n" +
        "        model.addAttribute(\"order\", order);\n" +
        "        return \"orders/detail\";                                // chọn VIEW\n" +
        "    }\n" +
        "}\n" +
        "// Controller có thể phục vụ NHIỀU view; view có thể phụ thuộc model.\n" +
        "// Đây là mô hình của Spring MVC, Rails, ASP.NET MVC.\n" +
        "\n" +
        "// MVP — Model, View, Presenter\n" +
        "//   View THỤ ĐỘNG hoàn toàn (chỉ có interface hiển thị), Presenter điều\n" +
        "//   khiển mọi thứ và không biết gì về framework UI.\n" +
        "public interface OrderView {                  // View là INTERFACE\n" +
        "    void showOrder(OrderViewModel vm);\n" +
        "    void showError(String message);\n" +
        "    void showLoading(boolean loading);\n" +
        "}\n" +
        "public class OrderPresenter {\n" +
        "    private final OrderView view;             // presenter GỌI view\n" +
        "    private final OrderService service;\n" +
        "\n" +
        "    public void onPlaceOrder(OrderForm form) {\n" +
        "        view.showLoading(true);\n" +
        "        try { view.showOrder(toViewModel(service.place(form))); }\n" +
        "        catch (Exception e) { view.showError(e.getMessage()); }\n" +
        "        finally { view.showLoading(false); }\n" +
        "    }\n" +
        "}\n" +
        "// + Presenter TEST ĐƯỢC hoàn toàn bằng cách mock OrderView, không cần UI.\n" +
        "// - nhiều code lặp (mỗi màn hình một interface view).\n" +
        "\n" +
        "// MVVM — Model, View, ViewModel\n" +
        "//   ViewModel phơi ra STATE có thể QUAN SÁT được; View RÀNG BUỘC (bind)\n" +
        "//   vào state đó và tự cập nhật. ViewModel KHÔNG biết gì về View.\n" +
        "//   -> Android (Jetpack), WPF, Vue/React với state management.\n" +
        "// + ít code kết nối nhất nhờ data binding\n" +
        "// - cần framework hỗ trợ binding; debug binding khó hơn\n" +
        "\n" +
        "// ĐIỂM CHUNG: cả ba đều nhằm tách LOGIC khỏi HIỂN THỊ để test được và\n" +
        "// thay đổi giao diện mà không đụng nghiệp vụ.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Kế thừa', 'Decorator'],
    rows: [
      ['Quan hệ', 'tĩnh — lúc compile', 'động — ghép lúc runtime'],
      ['Thêm biến thể', 'thêm subclass', 'thêm một decorator, tổ hợp tuỳ ý'],
      ['3 tính năng độc lập', '2³ = 8 class', '3 decorator'],
      ['Nhược', 'bùng nổ class khi nhiều trục', 'nhiều object nhỏ, stack sâu khó debug'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Kết hợp lúc chạy vs cố định lúc biên dịch",
      code:
        "// KẾ THỪA — bùng nổ tổ hợp\n" +
        "class FileDataSource { }\n" +
        "class EncryptedFileDataSource extends FileDataSource { }\n" +
        "class CompressedFileDataSource extends FileDataSource { }\n" +
        "class EncryptedCompressedFileDataSource extends ??? { }   // Java không đa kế thừa\n" +
        "// n tính năng -> cần tới 2^n lớp, và không kết hợp được lúc chạy.\n" +
        "\n" +
        "// DECORATOR — n lớp, kết hợp tự do\n" +
        "DataSource ds = new EncryptionDecorator(new CompressionDecorator(new FileDataSource()));\n" +
        "// Đổi thứ tự, bỏ bớt, thêm vào — tất cả LÚC CHẠY, theo cấu hình.\n" +
        "\n" +
        "// CHỌN KẾ THỪA khi:\n" +
        "//  - quan hệ thật sự là \"LÀ MỘT\" (Dog LÀ MỘT Animal)\n" +
        "//  - lớp con cần truy cập state protected của lớp cha\n" +
        "//  - chỉ có MỘT chiều biến thiên và số biến thể nhỏ, cố định\n" +
        "//  - cần override nhiều hành vi, không chỉ bọc thêm\n" +
        "\n" +
        "// CHỌN DECORATOR khi:\n" +
        "//  - cần KẾT HỢP nhiều tính năng độc lập\n" +
        "//  - cần quyết định LÚC CHẠY\n" +
        "//  - thêm mối quan tâm CẮT NGANG (log, cache, retry, metric)\n" +
        "//  - không muốn (hoặc không thể) sửa class gốc\n" +
        "\n" +
        "// ĐIỀU KIỆN ĐỂ DÙNG DECORATOR: phải có INTERFACE chung. Class không có\n" +
        "// interface thì phải tạo interface trước (hoặc dùng proxy CGLIB).\n" +
        "\n" +
        "// TRONG SPRING, decorator thường được thay bằng AOP hoặc bằng bean bọc bean:\n" +
        "@Bean\n" +
        "@Primary\n" +
        "public OrderRepository cachingOrderRepository(OrderRepository delegate) {\n" +
        "    return new CachingOrderRepository(delegate);      // decorator qua DI\n" +
        "}\n" +
        "// Nguyên tắc chung: ƯU TIÊN COMPOSITION HƠN KẾ THỪA.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Decorator', 'Proxy'],
    rows: [
      ['Ý định', 'thêm hành vi/trách nhiệm mới', 'kiểm soát truy cập (lazy/remote/auth/cache/đo)'],
      ['Client biết?', 'có — chủ động ghép', 'thường không'],
      ['Object bên trong', 'do client cung cấp', 'proxy tự quản (tạo lúc cần, giữ tham chiếu remote)'],
      ['Số lượng', 'nhiều lớp chồng nhau', 'thường một lớp'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Khác ở MỤC ĐÍCH và ở AI TẠO đối tượng bên trong",
      code:
        "// CẤU TRÚC GIỐNG HỆT NHAU: cả hai đều implement cùng interface và giữ\n" +
        "// một tham chiếu tới đối tượng thật. Khác biệt nằm ở Ý ĐỊNH.\n" +
        "\n" +
        "// DECORATOR — THÊM chức năng. Luôn gọi đối tượng bên trong.\n" +
        "public class LoggingRepository implements OrderRepository {\n" +
        "    private final OrderRepository delegate;\n" +
        "    public LoggingRepository(OrderRepository delegate) {   // NHẬN từ bên ngoài\n" +
        "        this.delegate = delegate;\n" +
        "    }\n" +
        "    public Order find(String id) {\n" +
        "        log.info(\"tìm đơn {}\", id);\n" +
        "        Order o = delegate.find(id);           // LUÔN gọi\n" +
        "        log.info(\"kết quả {}\", o);\n" +
        "        return o;\n" +
        "    }\n" +
        "}\n" +
        "// - Client CHỦ ĐỘNG lồng các decorator, và biết mình đang lồng cái gì.\n" +
        "// - Nhiều decorator lồng nhau là chuyện bình thường.\n" +
        "\n" +
        "// PROXY — KIỂM SOÁT truy cập. Có thể KHÔNG gọi đối tượng bên trong.\n" +
        "public class SecuredRepository implements OrderRepository {\n" +
        "    private OrderRepository delegate;          // có thể TỰ TẠO, hoặc tạo LƯỜI\n" +
        "    public Order find(String id) {\n" +
        "        if (!currentUser().canRead(id))\n" +
        "            throw new AccessDeniedException();   // KHÔNG gọi delegate\n" +
        "        if (delegate == null) delegate = new JdbcOrderRepository();   // lazy\n" +
        "        return delegate.find(id);\n" +
        "    }\n" +
        "}\n" +
        "// - Client thường KHÔNG BIẾT mình đang dùng proxy (trong suốt).\n" +
        "// - Proxy thường tự quản lý vòng đời của đối tượng thật.\n" +
        "// - Thường chỉ có MỘT proxy, không lồng nhau.\n" +
        "\n" +
        "// PHÂN BIỆT NHANH:\n" +
        "//  \"Tôi muốn thêm hành vi vào một object đã có\"        -> DECORATOR\n" +
        "//  \"Tôi muốn kiểm soát/hoãn/thay thế việc truy cập nó\" -> PROXY\n" +
        "\n" +
        "// Trong Spring, @Transactional/@Cacheable là PROXY (chúng có thể không\n" +
        "// gọi method thật — cache hit thì trả về ngay).",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Bạn đã dùng structural pattern hàng ngày',
    root: {
      label: 'Trong thư viện Java chuẩn',
      children: [
        { label: 'Decorator', note: 'java.io — BufferedReader, GZIPInputStream bọc nhau; Collections.unmodifiableList' },
        { label: 'Adapter', note: 'Arrays.asList(array), InputStreamReader (byte→char)' },
        { label: 'Proxy', note: 'java.lang.reflect.Proxy, RMI stub' },
        { label: 'Facade', note: 'Files, Executors (giấu ThreadPoolExecutor 7 tham số)' },
        { label: 'Composite', note: 'java.awt.Container chứa Component' },
        { label: 'Flyweight', note: 'Integer.valueOf, String pool' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Pattern trong chính JDK",
      code:
        "// ADAPTER\n" +
        "Arrays.asList(array);                          // mảng -> List\n" +
        "Collections.enumeration(collection);           // Iterator -> Enumeration (cũ)\n" +
        "new InputStreamReader(inputStream);            // byte stream -> char stream\n" +
        "\n" +
        "// DECORATOR — java.io là ví dụ kinh điển nhất\n" +
        "new BufferedReader(                            // thêm đệm\n" +
        "    new InputStreamReader(                     // đổi byte -> char (adapter)\n" +
        "        new GZIPInputStream(                   // thêm giải nén\n" +
        "            new FileInputStream(\"data.gz\"))));\n" +
        "Collections.unmodifiableList(list);            // thêm tính bất biến\n" +
        "Collections.synchronizedMap(map);              // thêm đồng bộ hoá\n" +
        "\n" +
        "// PROXY\n" +
        "Proxy.newProxyInstance(loader, interfaces, handler);   // dynamic proxy\n" +
        "// RMI stub, và mọi @Transactional/@Cacheable trong Spring\n" +
        "\n" +
        "// FACADE\n" +
        "java.net.http.HttpClient;                      // che giấu socket, TLS, HTTP/2\n" +
        "Executors.newFixedThreadPool(10);              // che giấu ThreadPoolExecutor\n" +
        "                                               // với 7 tham số\n" +
        "// FLYWEIGHT\n" +
        "Integer.valueOf(100);                          // cache [-128, 127]\n" +
        "\"hello\";                                       // String pool\n" +
        "Boolean.TRUE;\n" +
        "\n" +
        "// COMPOSITE\n" +
        "// javax.swing.JComponent (component chứa component)\n" +
        "// java.io.File (file và thư mục cùng một class)\n" +
        "\n" +
        "// BRIDGE\n" +
        "// JDBC: java.sql.Driver là abstraction, mỗi database một implementation\n" +
        "DriverManager.getConnection(url);               // code của bạn không đổi\n" +
        "\n" +
        "// ĐỌC MÃ NGUỒN JDK là cách học pattern hiệu quả nhất: chúng được dùng ở\n" +
        "// đó vì có LÝ DO THẬT, không phải để minh hoạ.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Facade (GoF)', 'API Gateway'],
    rows: [
      ['Quy mô', 'một hệ con gồm nhiều class', 'một mạng gồm nhiều service'],
      ['Che giấu', 'chi tiết các class bên trong', 'topology: bao nhiêu service, ở đâu'],
      ['Cross-cutting', 'không', 'auth, rate limit, TLS'],
      ['Chung', 'cho client "một cửa" + tự do refactor phía sau', 'BFF = Facade "theo từng loại client"'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cùng ý tưởng, khác quy mô và khác mối quan tâm",
      code:
        "// FACADE — ở mức LỚP/MODULE, trong CÙNG một tiến trình\n" +
        "@Service\n" +
        "public class OrderFacade {\n" +
        "    public OrderResult place(Cart cart) {\n" +
        "        var reservation = inventory.reserve(cart);      // lời gọi HÀM\n" +
        "        var payment = payments.charge(cart.total());\n" +
        "        return orders.create(cart, payment, reservation);\n" +
        "    }\n" +
        "}\n" +
        "// Mối quan tâm: giảm số thứ client phải biết, gom quy trình.\n" +
        "\n" +
        "// API GATEWAY — ở mức HỆ THỐNG, giữa các TIẾN TRÌNH qua mạng\n" +
        "// Cùng ý tưởng \"một cửa vào cho hệ thống phức tạp\", nhưng phải lo thêm:\n" +
        "//  - xác thực và phân quyền tập trung\n" +
        "//  - rate limiting, quota\n" +
        "//  - TIMEOUT, RETRY, CIRCUIT BREAKER (vì lời gọi có thể thất bại)\n" +
        "//  - TLS termination, CORS, nén\n" +
        "//  - định tuyến, phiên bản API, canary\n" +
        "//  - log/metric/trace tập trung\n" +
        "// -> Những thứ này KHÔNG tồn tại với facade trong cùng tiến trình.\n" +
        "\n" +
        "// GATEWAY AGGREGATION giống facade nhất:\n" +
        "@RestController\n" +
        "public class OrderAggregator {                     // BFF / gateway aggregation\n" +
        "    @GetMapping(\"/order-details/{id}\")\n" +
        "    public OrderDetails get(@PathVariable String id) {\n" +
        "        var order    = supplyAsync(() -> orderClient.get(id));\n" +
        "        var payment  = supplyAsync(() -> paymentClient.getByOrder(id));\n" +
        "        var shipment = supplyAsync(() -> shippingClient.getByOrder(id));\n" +
        "        return new OrderDetails(order.join(), payment.join(), shipment.join());\n" +
        "    }\n" +
        "}\n" +
        "// Khác biệt cốt lõi so với facade: mỗi lời gọi có thể TIMEOUT hoặc LỖI\n" +
        "// -> phải xử lý partial failure, và phải gọi SONG SONG.\n" +
        "\n" +
        "// CẠM BẪY CHUNG của cả hai: phình thành nơi chứa logic nghiệp vụ, rồi\n" +
        "// trở thành điểm nghẽn (kỹ thuật lẫn tổ chức).",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Marker interface', 'Annotation'],
    rows: [
      ['Có method?', 'không (Serializable, Cloneable, RandomAccess)', '—'],
      ['Tạo kiểu?', 'có — dùng được trong chữ ký/generic bound', 'không'],
      ['Metadata giàu (tham số, retention, target)', 'không', 'có'],
      ['Thắng khi', 'cần nhãn tham gia hệ thống kiểu; compiler enforce (@FunctionalInterface)', 'phần lớn trường hợp metadata thuần' ],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Interface rỗng để đánh dấu kiểu",
      code:
        "// MARKER INTERFACE — interface KHÔNG có method, chỉ để \"đánh dấu\"\n" +
        "public interface Serializable { }        // JDK\n" +
        "public interface Cloneable { }\n" +
        "public interface RandomAccess { }        // báo rằng get(i) là O(1)\n" +
        "\n" +
        "// CÁCH DÙNG: kiểm tra bằng instanceof\n" +
        "if (obj instanceof Serializable) { serialize(obj); }\n" +
        "// ArrayList implements RandomAccess, LinkedList thì không\n" +
        "// -> Collections.binarySearch chọn thuật toán khác nhau tuỳ theo:\n" +
        "if (list instanceof RandomAccess) binarySearchByIndex(list);\n" +
        "else                              binarySearchByIterator(list);\n" +
        "\n" +
        "// ƯU ĐIỂM so với annotation:\n" +
        "//  1) ĐƯỢC KIỂM TRA LÚC BIÊN DỊCH — method chỉ nhận đúng kiểu đã đánh dấu:\n" +
        "public void save(Serializable obj) { }      // compiler chặn kiểu sai\n" +
        "//     Annotation không làm được điều này (phải kiểm tra lúc chạy).\n" +
        "//  2) Chỉ định được PHẠM VI chính xác hơn nhờ hệ phân cấp kiểu.\n" +
        "\n" +
        "// NHƯỢC ĐIỂM:\n" +
        "//  1) KHÔNG mang được THAM SỐ (annotation thì có: @Retryable(maxAttempts = 3))\n" +
        "//  2) \"dùng hết\" một vị trí kế thừa interface\n" +
        "//  3) không gỡ bỏ được ở lớp con (đã implement là mãi mãi)\n" +
        "\n" +
        "// TRONG JAVA HIỆN ĐẠI: ANNOTATION thay thế phần lớn nhu cầu marker interface,\n" +
        "// vì linh hoạt hơn và mang được metadata:\n" +
        "@Entity @Transactional @Deprecated @FunctionalInterface\n" +
        "\n" +
        "// MARKER INTERFACE VẪN HỢP LÝ khi bạn cần compiler ÉP KIỂU tại chỗ dùng.\n" +
        "// Serializable là ví dụ đúng: nó cho phép ObjectOutputStream.writeObject\n" +
        "// chỉ nhận object đã được đánh dấu.\n" +
        "// (Và Cloneable là ví dụ SAI: nó marker nhưng lại đổi hành vi của\n" +
        "//  Object.clone() — một thiết kế mà chính tác giả Java thừa nhận là hỏng.)",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Wrapper = gián tiếp = chi phí đọc hiểu',
    root: {
      label: 'Trả tiền cho wrapper khi nó gom một mối quan tâm chéo tái dùng được',
      children: [
        { label: 'KHÔNG đáng: pass-through 1-1 không thêm gì', note: '' },
        { label: 'KHÔNG đáng: "để dễ mock sau" khi object gốc đã là interface', note: '' },
        { label: 'KHÔNG đáng: wrap class đã dễ dùng, đã ổn định', note: '' },
        { label: 'KHÔNG đáng: chuỗi wrapper 4-5 tầng phải nhảy nhiều file', note: '' },
        { label: 'ĐÁNG: retry / cache / log / metric áp cho nhiều nơi; kiểm soát truy cập (lazy/remote/auth)', note: '' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Wrapper có giá trị và wrapper chỉ chuyển tiếp",
      code:
        "// WRAPPER VÔ ÍCH — chỉ chuyển tiếp, không thêm gì\n" +
        "public class UserServiceWrapper implements UserService {\n" +
        "    private final UserService delegate;\n" +
        "    public User find(String id) { return delegate.find(id); }      // hết\n" +
        "    public void save(User u)    { delegate.save(u); }\n" +
        "}\n" +
        "// -> Xoá nó đi thì code không tệ hơn chút nào. Đó là câu trả lời.\n" +
        "\n" +
        "// WRAPPER CÓ GIÁ TRỊ — thêm một mối quan tâm RÕ RÀNG\n" +
        "public class CachingUserService implements UserService {\n" +
        "    private final UserService delegate;\n" +
        "    private final Cache<String, User> cache;\n" +
        "\n" +
        "    public User find(String id) {\n" +
        "        return cache.get(id, delegate::find);            // THÊM cache\n" +
        "    }\n" +
        "    public void save(User u) {\n" +
        "        delegate.save(u);\n" +
        "        cache.invalidate(u.id());                        // và giữ cache đúng\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// BỐN CÂU HỎI KIỂM TRA:\n" +
        "// 1) Wrapper này THÊM hành vi gì? Không trả lời được -> xoá.\n" +
        "// 2) Có thật sự cần thay thế lúc chạy không, hay chỉ \"phòng khi cần\"?\n" +
        "// 3) Có ít nhất HAI cài đặt không? (interface một cài đặt thường là thừa)\n" +
        "// 4) Bỏ tầng này đi thì code có tệ hơn không?\n" +
        "\n" +
        "// DẤU HIỆU OVER-ENGINEERING:\n" +
        "//  - interface + Impl, chỉ có đúng một Impl, và không có kế hoạch thêm\n" +
        "//  - chuỗi tầng chỉ chuyển tiếp: Controller -> Facade -> Service -> Manager\n" +
        "//    -> Helper -> Repository, mỗi tầng chỉ gọi tầng dưới\n" +
        "//  - trừu tượng hoá cho \"khả năng đổi database sau này\" — điều gần như\n" +
        "//    không bao giờ xảy ra, và nếu xảy ra thì trừu tượng đó cũng không đủ\n" +
        "\n" +
        "// NGUYÊN TẮC: mỗi tầng phải TRẢ LỜI ĐƯỢC câu hỏi \"nó thêm giá trị gì\".\n" +
        "// Thêm tầng khi có ÁP LỰC THẬT, không phải khi dự đoán.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Cấu trúc nút ổn định, danh sách thao tác còn tăng',
    nodes: ['Composite: cây nút (Literal, BinaryOp, FunctionCall)', 'node.accept(Visitor v)', 'Visitor xử lý từng loại nút', 'Thêm thao tác = thêm một visitor (không sửa nút)'],
    steps: [
      { to: 1, label: 'Nút chỉ cần method accept — không nhồi mọi thao tác vào class nút' },
      { to: 2, label: 'TypeCheckVisitor, PrettyPrintVisitor, EvalVisitor, BytecodeGenVisitor' },
      { to: 3, label: 'Đánh đổi: thêm LOẠI NÚT mới thì đắt (sửa mọi visitor)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cây dữ liệu ổn định, thao tác thì luôn thêm mới",
      code:
        "// COMPOSITE tạo ra CÂY. Nhưng ta cần làm NHIỀU VIỆC trên cây đó:\n" +
        "// tính tổng, in ra, xuất JSON, validate, tối ưu hoá...\n" +
        "// Nhét mọi việc vào các lớp node -> chúng phình to và vi phạm SRP.\n" +
        "\n" +
        "// VISITOR tách THAO TÁC ra khỏi CẤU TRÚC:\n" +
        "public interface Node {\n" +
        "    <R> R accept(NodeVisitor<R> visitor);       // double dispatch\n" +
        "}\n" +
        "public record NumberNode(double value) implements Node {\n" +
        "    public <R> R accept(NodeVisitor<R> v) { return v.visitNumber(this); }\n" +
        "}\n" +
        "public record AddNode(Node left, Node right) implements Node {\n" +
        "    public <R> R accept(NodeVisitor<R> v) { return v.visitAdd(this); }\n" +
        "}\n" +
        "\n" +
        "public interface NodeVisitor<R> {\n" +
        "    R visitNumber(NumberNode n);\n" +
        "    R visitAdd(AddNode n);\n" +
        "}\n" +
        "\n" +
        "// THÊM THAO TÁC MỚI = thêm MỘT visitor, KHÔNG sửa lớp node nào:\n" +
        "public class EvalVisitor implements NodeVisitor<Double> {\n" +
        "    public Double visitNumber(NumberNode n) { return n.value(); }\n" +
        "    public Double visitAdd(AddNode n) {\n" +
        "        return n.left().accept(this) + n.right().accept(this);   // đệ quy\n" +
        "    }\n" +
        "}\n" +
        "public class PrintVisitor implements NodeVisitor<String> {\n" +
        "    public String visitNumber(NumberNode n) { return String.valueOf(n.value()); }\n" +
        "    public String visitAdd(AddNode n) {\n" +
        "        return \"(\" + n.left().accept(this) + \" + \" + n.right().accept(this) + \")\";\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// ĐÁNH ĐỔI CỐT LÕI của Visitor:\n" +
        "//  + THÊM THAO TÁC rất dễ (thêm một class)\n" +
        "//  - THÊM LOẠI NODE rất khó (phải sửa MỌI visitor)\n" +
        "// -> Chỉ dùng khi cấu trúc ỔN ĐỊNH mà thao tác thì hay thêm.\n" +
        "//    Đây đúng là tình huống của compiler, trình phân tích cú pháp, cây biểu thức.\n" +
        "\n" +
        "// JAVA HIỆN ĐẠI: sealed interface + pattern matching thay thế gọn hơn nhiều:\n" +
        "sealed interface Node permits NumberNode, AddNode { }\n" +
        "double eval(Node n) {\n" +
        "    return switch (n) {\n" +
        "        case NumberNode num -> num.value();\n" +
        "        case AddNode add -> eval(add.left()) + eval(add.right());\n" +
        "    };            // compiler ĐẢM BẢO đã xử lý hết mọi loại node\n" +
        "}",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Decorator (AOP bằng tay)', 'AOP proxy (@Transactional, @Cacheable)'],
    rows: [
      ['Hiển thị', 'tường minh — thấy rõ thứ tự bọc trong code', 'ngầm — annotation'],
      ['Code', 'phải viết wrapper + wiring cho mỗi interface', 'ít code'],
      ['Bẫy', 'boilerplate', 'self-invocation không hoạt động, khó thấy hành vi thực'],
      ['Khi nào', 'ít interface, muốn rõ ràng', 'hàng trăm điểm áp dụng'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Đúng, và đó là điểm mạnh lẫn điểm yếu của nó",
      code:
        "// DECORATOR cho mối quan tâm cắt ngang:\n" +
        "public class RetryingPaymentGateway implements PaymentGateway {\n" +
        "    private final PaymentGateway delegate;\n" +
        "    public PaymentResult charge(Money m, String token) {\n" +
        "        for (int i = 0; i < 3; i++) {\n" +
        "            try { return delegate.charge(m, token); }\n" +
        "            catch (TransientException e) { sleep(backoff(i)); }\n" +
        "        }\n" +
        "        throw new PaymentFailedException();\n" +
        "    }\n" +
        "}\n" +
        "public class MetricPaymentGateway implements PaymentGateway {\n" +
        "    private final PaymentGateway delegate;\n" +
        "    public PaymentResult charge(Money m, String token) {\n" +
        "        return timer.record(() -> delegate.charge(m, token));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "@Bean\n" +
        "@Primary\n" +
        "PaymentGateway gateway(StripeGateway real, MeterRegistry reg) {\n" +
        "    return new MetricPaymentGateway(\n" +
        "               new RetryingPaymentGateway(\n" +
        "                   new LoggingPaymentGateway(real)), reg);\n" +
        "}\n" +
        "\n" +
        "// SO VỚI AOP:\n" +
        "@Retryable(maxAttempts = 3)\n" +
        "@Timed\n" +
        "@Transactional\n" +
        "public PaymentResult charge(Money m, String token) { ... }\n" +
        "\n" +
        "// DECORATOR:\n" +
        "//  + TƯỜNG MINH: nhìn code là biết chính xác thứ tự bọc\n" +
        "//  + không có ma thuật, gỡ rối dễ, stack trace rõ ràng\n" +
        "//  + KHÔNG có vấn đề self-invocation\n" +
        "//  + kiểm tra được lúc BIÊN DỊCH\n" +
        "//  - nhiều code lặp; phải bọc TỪNG service một\n" +
        "\n" +
        "// AOP:\n" +
        "//  + rất ít code, áp dụng cho HÀNG LOẠT class bằng một pointcut\n" +
        "//  - \"ma thuật\": nhìn method không biết có gì chạy quanh nó\n" +
        "//  - dựa trên PROXY -> self-invocation KHÔNG hoạt động\n" +
        "//  - thứ tự các aspect phải quản lý bằng @Order, dễ nhầm\n" +
        "\n" +
        "// CHỌN: vài chỗ cụ thể, cần rõ ràng -> DECORATOR.\n" +
        "// Áp dụng đồng loạt cho cả tầng (log mọi controller, transaction mọi\n" +
        "// service) -> AOP.\n" +
        "// Trong thực tế thường dùng CẢ HAI, tuỳ mức độ phổ quát của mối quan tâm.",
    },
  ],
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Adapter', 'Bridge'],
    rows: [
      ['Thời điểm', 'sau khi hệ thống đã tồn tại (X không khớp Y)', 'thiết kế từ đầu'],
      ['Mục tiêu', 'tương thích với cái đã có', 'linh hoạt mở rộng hai chiều độc lập'],
      ['Tính chất', 'chữa cháy (reactive)', 'thiết kế trước (proactive)'],
      ['Chung', 'đều dùng composition', 'khác thời điểm và ý định'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Thời điểm và ý định khác nhau",
      code:
        "// ADAPTER — SỬA CHỮA. Hai interface đã tồn tại và KHÔNG khớp; adapter\n" +
        "// được thêm vào SAU để chúng làm việc với nhau.\n" +
        "public class LegacyPaymentAdapter implements PaymentGateway {   // interface CỦA TA\n" +
        "    private final LegacySoapPaymentService legacy;              // đã tồn tại\n" +
        "    public PaymentResult charge(Money m, String token) {\n" +
        "        var req = new LegacyChargeRequest();\n" +
        "        req.setAmt(m.toCents());                                 // DỊCH\n" +
        "        req.setCcy(m.currency().getCurrencyCode());\n" +
        "        return toResult(legacy.processPayment(req));\n" +
        "    }\n" +
        "}\n" +
        "// Đặc điểm: một chiều biến thiên; adapter thường KHÔNG được lên kế hoạch\n" +
        "// từ đầu; mục tiêu là tương thích.\n" +
        "\n" +
        "// BRIDGE — THIẾT KẾ TRƯỚC. Bạn BIẾT có hai chiều sẽ cùng thay đổi, nên\n" +
        "// tách chúng ngay từ đầu để tránh bùng nổ tổ hợp.\n" +
        "public abstract class Report {                      // CHIỀU 1: loại báo cáo\n" +
        "    protected final Renderer renderer;              // CẦU NỐI\n" +
        "    protected Report(Renderer r) { this.renderer = r; }\n" +
        "    public abstract void generate(Data d);\n" +
        "}\n" +
        "public interface Renderer {                          // CHIỀU 2: định dạng xuất\n" +
        "    void renderHeader(String t);\n" +
        "    void renderRow(Row r);\n" +
        "    byte[] finish();\n" +
        "}\n" +
        "new SalesReport(new PdfRenderer()).generate(data);\n" +
        "new SalesReport(new ExcelRenderer()).generate(data);\n" +
        "new InventoryReport(new PdfRenderer()).generate(data);\n" +
        "// 2 loại báo cáo x 3 định dạng = 5 lớp thay vì 6, và thêm một định dạng\n" +
        "// chỉ tốn MỘT lớp thay vì 2.\n" +
        "\n" +
        "// PHÂN BIỆT NHANH:\n" +
        "//  ADAPTER — \"tôi có hai thứ không khớp, làm sao ghép lại\"  (chữa cháy)\n" +
        "//  BRIDGE  — \"tôi có hai chiều biến thiên, làm sao tách ra\" (thiết kế)\n" +
        "// Về cấu trúc code chúng rất giống nhau; khác biệt nằm ở BỐI CẢNH và Ý ĐỊNH.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Ranh giới module không tự tồn tại — phải enforce bằng công cụ',
    root: {
      label: 'Mỗi module ≈ bounded context',
      children: [
        { label: 'Package by feature', note: 'com.acme.order, com.acme.billing — không package by layer' },
        { label: 'Package public API + internal', note: 'com.acme.order.api là nơi duy nhất module khác import' },
        { label: 'Enforce', note: 'ArchUnit test, JPMS exports, Spring Modulith, Gradle sub-project' },
        { label: 'Giao tiếp', note: 'qua interface + event nội bộ, không truy cập class internal của nhau' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ranh giới được THỰC THI, không chỉ là quy ước",
      code:
        "// CẤU TRÚC: mỗi module một package gốc, chỉ lộ ra MỘT interface công khai\n" +
        "// com.example.order      -> OrderFacade (public), phần còn lại package-private\n" +
        "// com.example.payment    -> PaymentFacade\n" +
        "// com.example.inventory  -> InventoryFacade\n" +
        "\n" +
        "package com.example.payment;\n" +
        "public interface PaymentFacade {                    // DUY NHẤT được public\n" +
        "    PaymentResult charge(ChargeCommand cmd);\n" +
        "}\n" +
        "class PaymentServiceImpl implements PaymentFacade { }   // package-private\n" +
        "class PaymentRepository { }                             // package-private\n" +
        "class PaymentEntity { }                                 // package-private\n" +
        "\n" +
        "// Module khác KHÔNG THỂ đụng vào bên trong — compiler chặn:\n" +
        "package com.example.order;\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final PaymentFacade payment;             // OK\n" +
        "    // private final PaymentRepository repo;         // KHÔNG BIÊN DỊCH ĐƯỢC\n" +
        "}\n" +
        "\n" +
        "// THỰC THI BẰNG CÔNG CỤ, đừng chỉ dựa vào kỷ luật:\n" +
        "// 1) ArchUnit — test kiến trúc chạy trong CI\n" +
        "@ArchTest\n" +
        "static final ArchRule modules_khong_dung_noi_bo_cua_nhau =\n" +
        "    slices().matching(\"com.example.(*)..\").should().notDependOnEachOther()\n" +
        "        .ignoreDependency(alwaysTrue(), nameMatching(\".*Facade\"));\n" +
        "\n" +
        "@ArchTest\n" +
        "static final ArchRule domain_khong_phu_thuoc_framework =\n" +
        "    noClasses().that().resideInAPackage(\"..domain..\")\n" +
        "        .should().dependOnClassesThat()\n" +
        "        .resideInAnyPackage(\"org.springframework..\", \"jakarta.persistence..\");\n" +
        "\n" +
        "// 2) Java Module System (JPMS) — thực thi ở mức RUNTIME\n" +
        "//    module com.example.payment { exports com.example.payment.api; }\n" +
        "// 3) Maven multi-module — thực thi lúc BUILD\n" +
        "// 4) Spring Modulith — kiểm tra ranh giới và sinh sơ đồ module tự động\n" +
        "\n" +
        "// GIÁ TRỊ: đây là MODULAR MONOLITH — giữ được sự đơn giản của một\n" +
        "// deployment, mà vẫn có ranh giới rõ ràng. Và khi cần tách một module\n" +
        "// thành microservice, ranh giới đã sẵn sàng.",
    },
  ],
},
]);
