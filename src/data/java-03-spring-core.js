SS.addQuestions('java', [
{
  cat: 'Spring Core / IoC',
  q: 'IoC và DI là gì? Có mấy kiểu inject, nên dùng kiểu nào?',
  answer:
    '**IoC** đảo quyền điều khiển: container tạo và ghép nối object thay vì code tự `new`. **DI** là cách hiện thực IoC — container "tiêm" phụ thuộc vào bean.\n\n' +
    'Ba kiểu:\n' +
    '- **Constructor injection** (khuyến nghị): phụ thuộc là `final`, bắt buộc, phát hiện thiếu bean ngay khi khởi động, dễ test (new thủ công), lộ rõ khi class có quá nhiều phụ thuộc.\n' +
    '- **Setter injection**: cho phụ thuộc tuỳ chọn hoặc cần cấu hình lại.\n' +
    '- **Field injection** (`@Autowired` trên field): gọn nhưng khó test, ẩn phụ thuộc, không set `final` được, dễ tạo circular dependency âm thầm.',
  essence:
    'Container là bên "sở hữu" việc tạo và wiring. Constructor injection biến hợp đồng phụ thuộc thành một phần chữ ký class — không thể tạo object ở trạng thái nửa vời.',
  example:
    '`@Service class OrderService { private final PaymentGateway gw; OrderService(PaymentGateway gw){ this.gw = gw; } }`. Trong unit test: `new OrderService(mockGw)` — không cần Spring context. Field injection sẽ buộc dùng reflection hoặc `@SpringBootTest` nặng nề.',
  viz: {
    type: 'compare',
    cols: ['Constructor', 'Setter', 'Field (@Autowired)'],
    rows: [
      ['Phụ thuộc', 'final, bắt buộc', 'tuỳ chọn / cấu hình lại', 'không final được'],
      ['Thiếu bean', 'phát hiện khi khởi động', 'muộn hơn', 'ẩn'],
      ['Test', 'new thủ công, dễ', 'gọi setter', 'cần reflection / context'],
      ['Circular dependency', 'lộ ngay (fail)', 'âm thầm chịu được', 'âm thầm chịu được'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba kiểu inject và vì sao constructor injection thắng",
      code:
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final PaymentGateway gateway;      // final -> không ai đổi được sau khi tạo\n" +
        "    private final OrderRepository repo;\n" +
        "\n" +
        "    // CONSTRUCTOR INJECTION — nên dùng. Từ Spring 4.3, một constructor\n" +
        "    // duy nhất thì KHÔNG cần @Autowired nữa.\n" +
        "    public OrderService(PaymentGateway gateway, OrderRepository repo) {\n" +
        "        this.gateway = gateway;\n" +
        "        this.repo = repo;\n" +
        "    }\n" +
        "}\n" +
        "// Vì sao tốt nhất:\n" +
        "//  - dependency là bắt buộc và bất biến (final)\n" +
        "//  - object không bao giờ tồn tại ở trạng thái nửa vời\n" +
        "//  - test được bằng new OrderService(mock1, mock2) — không cần Spring\n" +
        "//  - constructor quá nhiều tham số -> tự nó BÁO ĐỘNG class đang ôm quá nhiều việc\n" +
        "\n" +
        "@Service\n" +
        "public class Bad {\n" +
        "    @Autowired private PaymentGateway gateway;   // FIELD INJECTION — tránh\n" +
        "    // - không final được -> có thể bị đổi lúc chạy\n" +
        "    // - test bắt buộc phải bật Spring context hoặc dùng reflection\n" +
        "    // - che giấu việc class đang phụ thuộc quá nhiều thứ\n" +
        "\n" +
        "    @Autowired                                   // SETTER INJECTION\n" +
        "    public void setGateway(PaymentGateway g) { this.gateway = g; }\n" +
        "    // chỉ dùng cho dependency THẬT SỰ tuỳ chọn hoặc cần thay lúc chạy\n" +
        "}",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Phân biệt `@Component`, `@Bean` và `@Configuration`.',
  answer:
    '`@Component` (và `@Service`, `@Repository`, `@Controller`): đánh dấu class để **component scan** tự phát hiện và tạo bean. Dùng cho class **của bạn**.\n\n' +
    '`@Bean`: đặt trên **method** trong class `@Configuration`, giá trị trả về được đăng ký làm bean. Dùng khi cần tạo bean từ class **thư viện bên thứ ba** (không sửa được để thêm annotation) hoặc cần logic khởi tạo.\n\n' +
    '`@Configuration`: class chứa các `@Bean`. Mặc định `proxyBeanMethods=true` → Spring tạo proxy CGLIB để lời gọi method `@Bean` này sang method `@Bean` khác vẫn trả về **cùng singleton**.',
  essence:
    '`@Component` = "quét tôi". `@Bean` = "gọi factory method của tôi". `@Configuration` = "đây là nơi định nghĩa bean thủ công, có ngữ nghĩa singleton giữa các @Bean".',
  example:
    '`@Bean public ObjectMapper objectMapper() { return new ObjectMapper().registerModule(new JavaTimeModule()); }` — `ObjectMapper` là của Jackson, không thể gắn `@Component`, nên phải khai báo bằng `@Bean` kèm cấu hình.',
  viz: {
    type: 'compare',
    cols: ['@Component', '@Bean', '@Configuration'],
    rows: [
      ['Đặt ở', 'class', 'method', 'class chứa các @Bean'],
      ['Cách tạo bean', 'component scan tự phát hiện', 'gọi factory method', '—'],
      ['Dùng cho', 'class của bạn', 'class thư viện bên thứ ba / cần logic khởi tạo', 'nơi khai báo bean thủ công'],
      ['Ngữ nghĩa', 'stereotype', 'trả về = 1 bean', 'proxyBeanMethods giữ singleton giữa @Bean'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Khi nào dùng cái nào",
      code:
        "// @Component (+ @Service/@Repository/@Controller): đánh dấu class CỦA MÌNH,\n" +
        "// Spring tự quét và tự tạo. Không kiểm soát được cách khởi tạo.\n" +
        "@Service\n" +
        "public class OrderService { }\n" +
        "\n" +
        "@Configuration\n" +
        "public class AppConfig {\n" +
        "\n" +
        "    // @Bean: đặt trên METHOD, mình tự tạo object -> dùng cho class\n" +
        "    // của THƯ VIỆN BÊN NGOÀI (không sửa được để gắn @Component)\n" +
        "    @Bean\n" +
        "    public RestClient restClient(RestClient.Builder builder) {\n" +
        "        return builder.baseUrl(\"https://api.example.com\")\n" +
        "                      .requestFactory(timeoutFactory())    // cấu hình tuỳ ý\n" +
        "                      .build();\n" +
        "    }\n" +
        "\n" +
        "    // Tên bean mặc định = tên method (\"restClient\"). Đổi được:\n" +
        "    @Bean(name = \"slowClient\", initMethod = \"warmUp\", destroyMethod = \"close\")\n" +
        "    public RestClient slow() { return RestClient.create(); }\n" +
        "}\n" +
        "// Tóm lại: class của mình -> @Component. Class người khác -> @Bean.\n" +
        "// @Configuration là nơi CHỨA các method @Bean (xem câu proxyBeanMethods).",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Các scope của Spring bean? "Singleton" của Spring nghĩa là gì?',
  answer:
    '- **singleton** (mặc định): **một instance cho mỗi ApplicationContext**, không phải một per JVM. Tạo eager khi khởi động.\n' +
    '- **prototype**: tạo mới mỗi lần được yêu cầu; Spring **không** quản lý huỷ (không gọi `@PreDestroy`).\n' +
    '- Web: **request**, **session**, **application**, **websocket**.\n\n' +
    'Singleton bean bị chia sẻ giữa mọi thread → phải **stateless** hoặc chỉ chứa state bất biến / thread-safe.',
  essence:
    'Spring singleton là "một per container", quản lý bởi container. Khác Singleton pattern (một per class loader, tự quản). State khả biến trong singleton bean là nguồn bug đa luồng.',
  example:
    'Một `@Service` lỡ có field `private User currentUser` được set trong method xử lý request → hai request đồng thời ghi đè nhau. Sửa: truyền `user` qua tham số, hoặc dùng `ThreadLocal`/request scope.',
  viz: {
    type: 'compare',
    cols: ['singleton (mặc định)', 'prototype', 'request / session'],
    rows: [
      ['Số instance', '1 cho mỗi ApplicationContext', 'mới mỗi lần yêu cầu', '1 cho mỗi HTTP request / session'],
      ['Khởi tạo', 'eager lúc startup', 'lazy khi cần', 'khi request tới'],
      ['Callback huỷ', '@PreDestroy được gọi', 'KHÔNG gọi', 'khi request/session kết thúc'],
      ['Lưu ý', 'phải stateless / thread-safe', 'container không quản lý huỷ', 'chỉ dùng trong web context'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Sáu scope và ý nghĩa thật của \"singleton\"",
      code:
        "@Service                                  // singleton: MẶC ĐỊNH\n" +
        "public class Cache { }\n" +
        "// \"Singleton\" của Spring = MỘT instance cho MỖI ApplicationContext,\n" +
        "// KHÔNG phải singleton theo nghĩa JVM (mỗi context là một cái riêng).\n" +
        "// Hệ quả quan trọng: bean singleton bị mọi request dùng chung\n" +
        "// -> tuyệt đối không giữ state của request trong field.\n" +
        "\n" +
        "@Service\n" +
        "@Scope(\"prototype\")                       // mỗi lần lấy ra là một object MỚI\n" +
        "public class ReportBuilder { }            // Spring KHÔNG quản vòng đời huỷ của nó\n" +
        "\n" +
        "// 4 scope chỉ có trong web context:\n" +
        "@Scope(value = \"request\",  proxyMode = ScopedProxyMode.TARGET_CLASS)  // mỗi HTTP request\n" +
        "@Scope(value = \"session\",  proxyMode = ScopedProxyMode.TARGET_CLASS)  // mỗi HTTP session\n" +
        "@Scope(\"application\")                     // mỗi ServletContext\n" +
        "@Scope(\"websocket\")                       // mỗi phiên WebSocket\n" +
        "\n" +
        "// proxyMode BẮT BUỘC khi tiêm bean scope ngắn vào bean scope dài:\n" +
        "// nó tiêm một PROXY, mỗi lần gọi method proxy mới đi tìm instance đúng\n" +
        "// của request/session hiện tại.",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  diagram: 'bean-lifecycle',
  q: 'Vòng đời của một Spring bean gồm những bước nào?',
  answer:
    'Khởi tạo: instantiate (constructor) → populate properties (DI) → `BeanNameAware`/`BeanFactoryAware`/`ApplicationContextAware` → `BeanPostProcessor.postProcessBeforeInitialization` → `@PostConstruct` → `InitializingBean.afterPropertiesSet()` → custom `initMethod` → `BeanPostProcessor.postProcessAfterInitialization` (nơi **AOP proxy** được tạo) → bean sẵn sàng.\n\n' +
    'Huỷ (khi context đóng): `@PreDestroy` → `DisposableBean.destroy()` → custom `destroyMethod`.\n\n' +
    'Bean prototype: Spring dừng ở bước "sẵn sàng", không gọi callback huỷ.',
  essence:
    'Container kiểm soát toàn bộ vòng đời và chèn các điểm mở rộng. Proxy AOP/transaction được "bọc" ở bước post-process-after-init, nên bean bạn nhận thực chất là proxy.',
  example:
    '`@PostConstruct void warmUp() { cache.preload(); }` chạy sau khi mọi phụ thuộc đã được tiêm — an toàn để dùng repository. Đặt logic đó trong constructor sẽ NPE vì field còn null.',
  demo: [
    {
      lang: "java",
      title: "Các móc nối theo đúng thứ tự chạy",
      code:
        "@Component\n" +
        "public class LifecycleDemo implements InitializingBean, DisposableBean {\n" +
        "\n" +
        "    public LifecycleDemo() { }                 // 1. instantiate (constructor)\n" +
        "\n" +
        "    @Autowired\n" +
        "    public void setDep(Dep d) { }              // 2. populate properties (DI)\n" +
        "\n" +
        "    @PostConstruct                             // 5. @PostConstruct (nên dùng cái này)\n" +
        "    void init() { }\n" +
        "\n" +
        "    @Override\n" +
        "    public void afterPropertiesSet() { }       // 6. InitializingBean (gắn chặt Spring)\n" +
        "\n" +
        "    // 7. init-method khai báo ở @Bean(initMethod = \"...\")\n" +
        "    // 8. BeanPostProcessor.postProcessAfterInitialization  <- AOP proxy tạo Ở ĐÂY\n" +
        "\n" +
        "    @PreDestroy                                // 9. khi context đóng\n" +
        "    void cleanup() { }\n" +
        "\n" +
        "    @Override\n" +
        "    public void destroy() { }                  // 10. DisposableBean\n" +
        "}\n" +
        "// Thứ tự đầy đủ giữa 2 và 5: các *Aware (BeanNameAware, ApplicationContextAware)\n" +
        "// -> BeanPostProcessor.postProcessBeforeInitialization -> @PostConstruct.\n" +
        "// Bean prototype: Spring KHÔNG gọi bước huỷ -> tự dọn lấy.",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Spring xử lý circular dependency thế nào? Khi nào không xử lý được?',
  answer:
    'Với **field/setter injection** giữa hai singleton A↔B: Spring dùng **three-level cache**. Nó tạo A (chưa hoàn thiện), đặt một tham chiếu sớm vào "early singleton cache", tiêm A dở dang vào B, hoàn thiện B, rồi hoàn thiện A. Hoạt động được.\n\n' +
    'Với **constructor injection**: không thể — cần B đã tồn tại để tạo A và ngược lại → `BeanCurrentlyInCreationException`.\n\n' +
    'Từ Spring Boot 2.6, circular reference bị **cấm mặc định**; phải bật `spring.main.allow-circular-references=true` hoặc (tốt hơn) refactor.',
  essence:
    'Circular dependency chỉ "chữa" được khi có điểm chèn tham chiếu dở dang (setter/field). Vòng qua constructor là bế tắc thật sự. Nó thường là dấu hiệu phân tách trách nhiệm sai.',
  example:
    '`UserService` ↔ `NotificationService` gọi qua lại. Sửa bằng cách tách phần chung ra `UserNotificationFacade`, hoặc dùng `ApplicationEventPublisher` để `UserService` phát event thay vì gọi trực tiếp.',
  viz: {
    type: 'flow',
    title: 'Three-level cache "chữa" vòng field/setter',
    nodes: ['tạo A (dở dang)', 'đặt ref sớm vào cache', 'tiêm A dở vào B', 'hoàn thiện B', 'hoàn thiện A'],
    steps: [
      { to: 0, label: 'instantiate A qua constructor (chưa populate)' },
      { to: 1, label: 'đặt tham chiếu sớm của A vào early singleton cache' },
      { to: 2, label: 'B cần A → lấy tham chiếu A dở dang' },
      { to: 3, label: 'B được wiring đầy đủ và hoàn thiện' },
      { to: 4, label: 'quay lại tiêm B vào A, hoàn thiện A. (Constructor injection: bế tắc → BeanCurrentlyInCreationException)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba cache và trường hợp Spring bó tay",
      code:
        "// Spring giải được vòng lặp bằng SETTER/FIELD injection nhờ 3 cấp cache:\n" +
        "//   singletonObjects       (bean hoàn chỉnh)\n" +
        "//   earlySingletonObjects  (bean đã tạo, chưa init xong)\n" +
        "//   singletonFactories     (factory sinh tham chiếu sớm — cần cho AOP proxy)\n" +
        "@Service\n" +
        "class A { @Autowired B b; }     // A tạo xong -> đưa tham chiếu sớm vào cache\n" +
        "@Service\n" +
        "class B { @Autowired A a; }     // B lấy được A \"chưa xong\" -> vòng lặp gỡ được\n" +
        "\n" +
        "// KHÔNG giải được với constructor injection: muốn tạo A phải có B đã hoàn chỉnh,\n" +
        "// mà muốn tạo B lại phải có A -> BeanCurrentlyInCreationException\n" +
        "@Service\n" +
        "class X { X(Y y) {} }\n" +
        "@Service\n" +
        "class Y { Y(X x) {} }\n" +
        "\n" +
        "// Từ Spring Boot 2.6, vòng lặp bị CẤM mặc định. Bật lại chỉ là hoãn nợ kỹ thuật:\n" +
        "// spring.main.allow-circular-references=true\n" +
        "\n" +
        "// Cách chữa đúng, theo thứ tự ưu tiên:\n" +
        "//  1) Tách phần dùng chung ra class thứ ba -> hết vòng lặp (tốt nhất)\n" +
        "//  2) @Lazy trên một phía -> tiêm proxy, hoãn khởi tạo tới lần gọi đầu\n" +
        "@Service\n" +
        "class Better { Better(@Lazy Other other) {} }\n" +
        "//  3) Dùng ApplicationEventPublisher để đảo chiều phụ thuộc",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'BeanFactory và ApplicationContext khác nhau ra sao?',
  answer:
    '`BeanFactory` là container cơ bản: DI, lazy khởi tạo bean khi `getBean`.\n\n' +
    '`ApplicationContext` là superset, thêm:\n' +
    '- **Eager** khởi tạo singleton lúc startup (fail-fast).\n' +
    '- Tự nhận diện `BeanPostProcessor`, `BeanFactoryPostProcessor`.\n' +
    '- Quốc tế hoá (`MessageSource`), **event publishing** (`ApplicationEventPublisher`).\n' +
    '- Tích hợp `Environment` (profiles, properties), resource loading.\n\n' +
    'Thực tế luôn dùng `ApplicationContext`; `BeanFactory` chỉ xuất hiện trong nội bộ Spring và trường hợp cực kỳ hạn chế tài nguyên.',
  essence:
    'ApplicationContext = BeanFactory + hạ tầng ứng dụng doanh nghiệp (event, i18n, môi trường) + eager/fail-fast startup.',
  example:
    'Khi khai báo sai kiểu bean, `ApplicationContext` làm app **không khởi động được** với thông báo rõ ràng — tốt hơn nhiều so với lỗi runtime lúc request đầu tiên chạm tới bean đó.',
  viz: {
    type: 'compare',
    cols: ['BeanFactory', 'ApplicationContext'],
    rows: [
      ['Khởi tạo singleton', 'lazy khi getBean', 'eager lúc startup (fail-fast)'],
      ['BeanPostProcessor', 'phải tự đăng ký', 'tự nhận diện'],
      ['i18n / event / Environment', 'không', 'có (MessageSource, publisher, profiles)'],
      ['Thực tế dùng', 'chỉ nội bộ Spring', 'luôn dùng cái này'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cái sau là cái trước cộng thêm mọi thứ bạn thật sự cần",
      code:
        "// BeanFactory: chỉ có DI cơ bản, khởi tạo LƯỜI (lazy) — tạo khi getBean()\n" +
        "BeanFactory factory = new XmlBeanFactory(new ClassPathResource(\"beans.xml\"));\n" +
        "Service s = factory.getBean(Service.class);     // tới đây bean mới được tạo\n" +
        "\n" +
        "// ApplicationContext: kế thừa BeanFactory và thêm\n" +
        "ApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class);\n" +
        "// Khởi tạo SỚM (eager) mọi singleton ngay lúc start -> lỗi cấu hình lộ ra\n" +
        "// lúc khởi động chứ không phải giữa đêm khi có request đầu tiên.\n" +
        "\n" +
        "ctx.getMessage(\"greeting\", null, Locale.of(\"vi\"));   // i18n\n" +
        "ctx.publishEvent(new OrderPlacedEvent(id));          // event\n" +
        "ctx.getResource(\"classpath:data.json\");              // resource\n" +
        "// + tự nhận diện BeanPostProcessor/BeanFactoryPostProcessor, hỗ trợ AOP,\n" +
        "//   tích hợp môi trường (Environment, profile)\n" +
        "\n" +
        "// Thực tế: luôn dùng ApplicationContext. BeanFactory chỉ còn ý nghĩa\n" +
        "// khi cần cực tiết kiệm bộ nhớ, hoặc để hiểu tầng bên dưới khi đọc source.",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: '`BeanPostProcessor` và `BeanFactoryPostProcessor` khác gì?',
  answer:
    '`BeanFactoryPostProcessor` (BFPP): chạy **sau khi** đọc xong bean definition nhưng **trước khi** tạo bean. Sửa **metadata/định nghĩa** bean. Ví dụ `PropertySourcesPlaceholderConfigurer` thay `${...}`.\n\n' +
    '`BeanPostProcessor` (BPP): chạy quanh **quá trình khởi tạo từng instance** (`before/afterInitialization`). Sửa hoặc **bọc** instance. Ví dụ `AutowiredAnnotationBeanPostProcessor` (xử lý `@Autowired`), `AsyncAnnotationBeanPostProcessor`, hạ tầng AOP tạo proxy.',
  essence:
    'BFPP thao tác trên "bản thiết kế" (definition) trước khi build. BPP thao tác trên "sản phẩm" (instance) trong lúc build. Đây là cơ chế Spring tự mở rộng chính nó.',
  example:
    '`@ConfigurationProperties` binding, `@Value` resolution là nhờ BFPP nạp property. `@Transactional`, `@Cacheable`, `@Async` hoạt động là nhờ BPP bọc bean bằng proxy ở `postProcessAfterInitialization`.',
  viz: {
    type: 'flow',
    title: 'BFPP thao tác "bản thiết kế", BPP thao tác "sản phẩm"',
    nodes: ['definition', 'BFPP', 'tạo instance', 'BPP before', '@PostConstruct', 'BPP after', 'sẵn sàng'],
    steps: [
      { to: 1, label: 'BeanFactoryPostProcessor: sửa định nghĩa, ví dụ resolve ${...}' },
      { to: 2, label: 'container tạo instance + populate DI' },
      { to: 3, label: 'BeanPostProcessor.postProcessBeforeInitialization' },
      { to: 4, label: '@PostConstruct / afterPropertiesSet / initMethod' },
      { to: 5, label: 'postProcessAfterInitialization — nơi bean bị bọc thành proxy AOP/transaction' },
      { to: 6, label: 'bean bạn nhận thực chất là proxy' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một cái sửa ĐỊNH NGHĨA, một cái sửa INSTANCE",
      code:
        "// BeanFactoryPostProcessor: chạy TRƯỚC khi bất kỳ bean nào được tạo,\n" +
        "// sửa BeanDefinition (metadata). Ví dụ kinh điển: thay ${...} trong config.\n" +
        "@Component\n" +
        "public class MyBfpp implements BeanFactoryPostProcessor {\n" +
        "    @Override\n" +
        "    public void postProcessBeanFactory(ConfigurableListableBeanFactory bf) {\n" +
        "        BeanDefinition bd = bf.getBeanDefinition(\"orderService\");\n" +
        "        bd.setScope(\"prototype\");           // đổi metadata trước khi tạo\n" +
        "        bd.setLazyInit(true);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// BeanPostProcessor: chạy quanh bước KHỞI TẠO của TỪNG instance đã có.\n" +
        "// Đây chính là cơ chế Spring dùng để bọc AOP proxy và xử lý @Autowired.\n" +
        "@Component\n" +
        "public class MyBpp implements BeanPostProcessor {\n" +
        "    @Override\n" +
        "    public Object postProcessBeforeInitialization(Object bean, String name) {\n" +
        "        return bean;                        // trước @PostConstruct\n" +
        "    }\n" +
        "    @Override\n" +
        "    public Object postProcessAfterInitialization(Object bean, String name) {\n" +
        "        if (bean instanceof OrderService) {\n" +
        "            return Proxy.newProxyInstance(...);   // TRẢ VỀ VẬT KHÁC -> thành proxy\n" +
        "        }\n" +
        "        return bean;                        // sau @PostConstruct\n" +
        "    }\n" +
        "}\n" +
        "// Thứ tự: BFPP (tất cả) -> tạo bean -> BPP.before -> @PostConstruct -> BPP.after",
    },
  ],
},
{
  cat: 'Spring AOP',
  diagram: 'spring-aop-proxy',
  q: 'Spring AOP hoạt động thế nào? JDK proxy vs CGLIB? Vấn đề self-invocation?',
  answer:
    'Spring AOP dựa trên **proxy runtime**. Nếu bean **implements interface** → mặc định JDK dynamic proxy (proxy theo interface). Nếu không → **CGLIB** (tạo subclass, ghi đè method). Spring Boot mặc định ép CGLIB (`proxyTargetClass=true`).\n\n' +
    'Client gọi vào proxy → proxy chạy advice (before/around/after) → gọi target.\n\n' +
    '**Self-invocation**: khi một method trong bean gọi `this.otherMethod()`, lời gọi đi thẳng tới target, **không qua proxy** → `@Transactional`, `@Cacheable`, `@Async` trên `otherMethod` **không có tác dụng**.',
  essence:
    'Advice chỉ được áp khi lời gọi đi xuyên qua proxy. `this.method()` bỏ qua proxy — đây là lý do phổ biến khiến annotation "không chạy".',
  example:
    '`class ReportService { public void run(){ this.generate(); } @Cacheable void generate(){...} }` — cache không bao giờ trúng. Sửa: tách `generate` sang bean khác, hoặc tự inject `self` (`@Lazy ReportService self`) và gọi `self.generate()`.',
  demo: [
    {
      lang: "java",
      title: "JDK proxy vs CGLIB và bẫy self-invocation",
      code:
        "// Spring AOP là proxy LÚC CHẠY, không phải weaving lúc biên dịch như AspectJ.\n" +
        "// - Bean có implement interface  -> JDK dynamic proxy (proxy theo interface)\n" +
        "// - Không có interface           -> CGLIB (sinh class con, nên method/class\n" +
        "//                                   không được final, và cần constructor gọi được)\n" +
        "// Spring Boot ép CGLIB mặc định: spring.aop.proxy-target-class=true\n" +
        "\n" +
        "@Aspect\n" +
        "@Component\n" +
        "public class TimingAspect {\n" +
        "    @Around(\"@annotation(Timed)\")\n" +
        "    public Object time(ProceedingJoinPoint pjp) throws Throwable {\n" +
        "        long t0 = System.nanoTime();\n" +
        "        try {\n" +
        "            return pjp.proceed();                  // gọi method thật\n" +
        "        } finally {\n" +
        "            log.info(\"{} mất {}ms\", pjp.getSignature(), (System.nanoTime() - t0) / 1e6);\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "@Service\n" +
        "public class ReportService {\n" +
        "    public void outer() {\n" +
        "        inner();        // BẪY SELF-INVOCATION: gọi thẳng qua `this`,\n" +
        "    }                   // KHÔNG đi qua proxy -> @Timed/@Transactional/@Cacheable\n" +
        "                        // trên inner() KHÔNG có tác dụng\n" +
        "    @Timed\n" +
        "    public void inner() { }\n" +
        "}\n" +
        "// Ba cách chữa, theo thứ tự nên dùng:\n" +
        "//  1) Tách inner() sang bean khác rồi tiêm vào (thiết kế đúng nhất)\n" +
        "//  2) Tự tiêm chính mình: @Autowired @Lazy private ReportService self;  self.inner();\n" +
        "//  3) AopContext.currentProxy() — cần exposeProxy = true, khó đọc",
    },
  ],
},
{
  cat: 'Spring AOP',
  q: '`@Transactional` hoạt động nội bộ ra sao? Khi nào KHÔNG rollback?',
  answer:
    'Một BPP bọc bean bằng proxy; method `@Transactional` được `TransactionInterceptor` bao: mở transaction (qua `PlatformTransactionManager`), gọi method, `commit` nếu bình thường, `rollback` nếu ném exception.\n\n' +
    'Mặc định chỉ rollback với **unchecked exception** (`RuntimeException`, `Error`). **Checked exception KHÔNG rollback** trừ khi khai báo `rollbackFor = Exception.class`.\n\n' +
    'Không có tác dụng khi: method không `public`; self-invocation; exception bị `catch` và nuốt; class không được Spring quản lý; DB engine không hỗ trợ transaction (MyISAM).',
  essence:
    '`@Transactional` là advice quanh proxy + quy tắc rollback theo loại exception. "Nuốt exception" hoặc "gọi nội bộ" là hai cách vô hiệu hoá nó mà không báo lỗi.',
  example:
    '`@Transactional void importFile() throws IOException { ... }` — nếu `IOException` xảy ra sau khi đã ghi vài bản ghi, transaction **vẫn commit** phần dở dang. Sửa: `@Transactional(rollbackFor = Exception.class)`.',
  viz: {
    type: 'flow',
    title: '@Transactional = advice quanh proxy',
    nodes: ['gọi proxy', 'mở transaction', 'chạy method', 'ném exception?', 'commit / rollback'],
    steps: [
      { to: 0, label: 'lời gọi phải đi qua proxy (public, từ bean khác)' },
      { to: 1, label: 'TransactionInterceptor mở tx qua PlatformTransactionManager' },
      { to: 2, label: 'thân method chạy' },
      { to: 3, label: 'unchecked (RuntimeException/Error) → rollback; checked → COMMIT trừ khi rollbackFor' },
      { to: 4, label: 'không tác dụng nếu: nuốt exception, self-invocation, method không public' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn lý do @Transactional \"không chạy\"",
      code:
        "@Service\n" +
        "public class OrderService {\n" +
        "\n" +
        "    @Transactional\n" +
        "    public void place(Order o) {\n" +
        "        repo.save(o);\n" +
        "        gateway.charge(o);       // ném RuntimeException -> rollback\n" +
        "    }\n" +
        "\n" +
        "    // BẪY 1: mặc định CHỈ rollback với unchecked exception (RuntimeException/Error).\n" +
        "    // Checked exception -> COMMIT bình thường!\n" +
        "    @Transactional(rollbackFor = Exception.class)   // phải khai báo rõ\n" +
        "    public void withChecked() throws IOException { }\n" +
        "\n" +
        "    // BẪY 2: self-invocation — gọi this.place() không qua proxy -> không có transaction\n" +
        "    public void wrapper() { place(o); }             // KHÔNG có transaction\n" +
        "\n" +
        "    // BẪY 3: method không public. Với proxy CGLIB, private/protected/package-private\n" +
        "    // bị bỏ qua im lặng, không báo lỗi gì.\n" +
        "    @Transactional\n" +
        "    private void hidden() { }                       // vô tác dụng\n" +
        "\n" +
        "    // BẪY 4: nuốt exception -> Spring không thấy lỗi -> vẫn commit\n" +
        "    @Transactional\n" +
        "    public void swallow() {\n" +
        "        try { repo.save(o); }\n" +
        "        catch (Exception e) { log.error(\"lỗi\", e); }   // nuốt = commit\n" +
        "        // Muốn chủ động huỷ: TransactionAspectSupport\n" +
        "        //     .currentTransactionStatus().setRollbackOnly();\n" +
        "    }\n" +
        "}\n" +
        "// Cơ chế: proxy mở transaction trước khi vào method, commit khi ra bình thường,\n" +
        "// rollback khi có unchecked exception. Ranh giới transaction = ranh giới PROXY.",
    },
  ],
},
{
  cat: 'Spring AOP',
  q: 'Transaction propagation: REQUIRED, REQUIRES_NEW, NESTED khác nhau thế nào?',
  answer:
    '- **REQUIRED** (mặc định): tham gia transaction hiện có, nếu chưa có thì tạo mới. Rollback ở bất kỳ đâu → cả transaction rollback.\n' +
    '- **REQUIRES_NEW**: **tạm treo** transaction ngoài, mở transaction mới độc lập (thường là connection khác). Commit/rollback riêng, không ảnh hưởng transaction ngoài.\n' +
    '- **NESTED**: tạo **savepoint** trong transaction hiện có. Rollback chỉ quay về savepoint; nhưng nếu transaction ngoài rollback thì phần nested cũng mất. Cần DB hỗ trợ savepoint.',
  essence:
    'REQUIRED = "một transaction dùng chung". REQUIRES_NEW = "transaction tách rời hoàn toàn". NESTED = "checkpoint bên trong transaction cha".',
  example:
    'Ghi audit log phải luôn lưu dù nghiệp vụ chính fail: đặt `@Transactional(propagation = REQUIRES_NEW)` cho `auditService.log(...)`. Nếu để REQUIRED, khi đơn hàng rollback thì log cũng biến mất.',
  viz: {
    type: 'compare',
    cols: ['REQUIRED (mặc định)', 'REQUIRES_NEW', 'NESTED'],
    rows: [
      ['Với tx đang có', 'tham gia', 'tạm treo, mở tx mới độc lập', 'tạo savepoint bên trong'],
      ['Rollback', 'ở bất kỳ đâu → cả tx rollback', 'riêng, không ảnh hưởng tx ngoài', 'chỉ về savepoint'],
      ['Nếu tx ngoài rollback', '—', 'phần mới vẫn commit', 'phần nested cũng mất'],
      ['Yêu cầu', '—', 'thường connection khác', 'DB hỗ trợ savepoint'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba mức propagation dùng thật và khác biệt khi rollback",
      code:
        "@Service\n" +
        "public class AuditService {\n" +
        "\n" +
        "    // REQUIRED (mặc định): có sẵn transaction thì THAM GIA, chưa có thì tạo mới.\n" +
        "    // Hệ quả: mọi thứ nằm chung MỘT transaction -> một chỗ lỗi là rollback tất.\n" +
        "    @Transactional(propagation = Propagation.REQUIRED)\n" +
        "    public void join() { }\n" +
        "\n" +
        "    // REQUIRES_NEW: LUÔN mở transaction mới, TẠM DỪNG transaction ngoài.\n" +
        "    // Dùng khi cần ghi bằng được dù việc chính thất bại — ví dụ ghi audit log.\n" +
        "    @Transactional(propagation = Propagation.REQUIRES_NEW)\n" +
        "    public void audit(String msg) { auditRepo.save(msg); }   // commit độc lập\n" +
        "    // Cảnh báo: chiếm 2 connection cùng lúc -> pool nhỏ thì dễ tự deadlock.\n" +
        "\n" +
        "    // NESTED: dùng SAVEPOINT trong cùng một transaction. Rollback phần lồng\n" +
        "    // không kéo theo phần ngoài, nhưng ngoài rollback thì trong mất theo.\n" +
        "    @Transactional(propagation = Propagation.NESTED)\n" +
        "    public void partial() { }\n" +
        "    // Chỉ chạy với JDBC transaction manager; JPA thường không hỗ trợ.\n" +
        "}\n" +
        "\n" +
        "// Các mức còn lại, ít gặp:\n" +
        "//   SUPPORTS      có thì dùng, không có cũng chạy\n" +
        "//   NOT_SUPPORTED tạm dừng transaction đang có, chạy không transaction\n" +
        "//   MANDATORY     bắt buộc phải có sẵn, không thì ném lỗi\n" +
        "//   NEVER         có transaction là ném lỗi",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: '`@Autowired` resolve bean thế nào khi có nhiều ứng viên?',
  answer:
    'Thứ tự: (1) khớp theo **kiểu**; (2) nếu nhiều ứng viên, lọc theo `@Primary`; (3) nếu vẫn nhiều, so khớp `@Qualifier("name")` hoặc **tên field/param** với tên bean; (4) không giải quyết được → `NoUniqueBeanDefinitionException`.\n\n' +
    '`@Primary`: đánh dấu bean "mặc định" khi mơ hồ. `@Qualifier`: chỉ định chính xác tại điểm tiêm, **ưu tiên cao hơn** `@Primary`.\n\n' +
    '`required = false` hoặc `Optional<T>` / `ObjectProvider<T>` cho phụ thuộc không bắt buộc.',
  essence:
    'By-type trước, rồi thu hẹp bằng `@Primary` (mặc định toàn cục) hoặc `@Qualifier` (chỉ định cục bộ). Tên bean là "tie-breaker" cuối.',
  example:
    'Hai `DataSource`: `@Primary` cho `DataSource` chính, `@Qualifier("readReplicaDataSource")` tại nơi cần đọc từ replica. Repository báo cáo tiêm replica, phần còn lại dùng bean primary.',
  viz: {
    type: 'flow',
    title: '@Autowired resolve khi có nhiều ứng viên',
    nodes: ['khớp theo kiểu', 'nhiều ứng viên?', 'lọc @Primary', 'vẫn nhiều?', '@Qualifier / tên bean', 'không giải quyết được'],
    steps: [
      { to: 0, label: 'bước 1: tìm bean cùng kiểu' },
      { to: 2, label: 'bước 2: nếu nhiều → chọn bean đánh dấu @Primary' },
      { to: 4, label: 'bước 3: so khớp @Qualifier("name") hoặc tên field/param với tên bean (ưu tiên hơn @Primary)' },
      { to: 5, label: 'không còn cách phân biệt → NoUniqueBeanDefinitionException' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Thứ tự phân giải khi có nhiều ứng viên",
      code:
        "public interface PaymentGateway { }\n" +
        "\n" +
        "@Component\n" +
        "class StripeGateway implements PaymentGateway { }\n" +
        "@Component\n" +
        "class PaypalGateway implements PaymentGateway { }\n" +
        "\n" +
        "@Service\n" +
        "class Broken {\n" +
        "    // NoUniqueBeanDefinitionException: có 2 ứng viên cùng kiểu\n" +
        "    Broken(PaymentGateway gateway) { }\n" +
        "}\n" +
        "\n" +
        "// Thứ tự Spring quyết định:\n" +
        "//   1) khớp theo KIỂU -> chỉ 1 ứng viên thì xong\n" +
        "//   2) còn nhiều: ưu tiên bean có @Primary\n" +
        "//   3) vẫn nhiều: khớp @Qualifier\n" +
        "//   4) vẫn nhiều: khớp TÊN BIẾN với tên bean\n" +
        "//   5) hết cách -> ném lỗi\n" +
        "\n" +
        "@Component\n" +
        "@Primary                          // mặc định toàn ứng dụng\n" +
        "class StripeGateway2 implements PaymentGateway { }\n" +
        "\n" +
        "@Service\n" +
        "class Explicit {\n" +
        "    Explicit(@Qualifier(\"paypalGateway\") PaymentGateway g) { }   // chỉ định rõ\n" +
        "}\n" +
        "\n" +
        "@Service\n" +
        "class ByName {\n" +
        "    ByName(PaymentGateway paypalGateway) { }   // tên tham số khớp tên bean\n" +
        "}\n" +
        "\n" +
        "// Tiêm TẤT CẢ ứng viên — rất hợp cho pattern strategy/plugin\n" +
        "@Service\n" +
        "class All {\n" +
        "    All(List<PaymentGateway> all,               // theo thứ tự @Order\n" +
        "        Map<String, PaymentGateway> byName) { } // key = tên bean\n" +
        "}\n" +
        "\n" +
        "// Dependency tuỳ chọn: đừng để văng lỗi khi không có bean\n" +
        "@Autowired(required = false) private Optional<Tracer> tracer;",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Tiêm bean prototype vào bean singleton thì sao? Cách lấy instance mới mỗi lần?',
  answer:
    'Nếu tiêm thẳng, prototype chỉ được resolve **một lần** lúc tạo singleton → singleton giữ mãi một instance prototype ("đóng băng").\n\n' +
    'Cách lấy instance mới:\n' +
    '- `ObjectProvider<T>` / `Provider<T>`: gọi `.getObject()` mỗi lần cần.\n' +
    '- `@Lookup` method: Spring override method để trả bean mới.\n' +
    '- **Scoped proxy**: `@Scope(value = "prototype", proxyMode = TARGET_CLASS)` — proxy tự lấy instance mới mỗi lần gọi.\n' +
    '- Inject `ApplicationContext` và `getBean()` (coupling cao, ít dùng).',
  essence:
    'Vòng đời bean con bị "kẹt" theo bean chứa nó nếu tiêm trực tiếp. Cần một lớp gián tiếp (provider/proxy/lookup) để mỗi lần truy cập mới trigger container tạo instance.',
  example:
    '`@Service class BatchRunner { private final ObjectProvider<JobContext> jobCtx; void run(){ JobContext c = jobCtx.getObject(); ... } }` — mỗi lần `run()` nhận một `JobContext` sạch, dù `BatchRunner` là singleton.',
  viz: {
    type: 'tree',
    title: 'Lấy instance prototype mới mỗi lần',
    root: {
      label: 'Tiêm thẳng → prototype bị "đóng băng" trong singleton',
      children: [
        { label: 'ObjectProvider<T> / Provider<T>', note: 'gọi .getObject() mỗi lần cần' },
        { label: '@Lookup method', note: 'Spring override method để trả bean mới' },
        { label: 'Scoped proxy', note: '@Scope(proxyMode = TARGET_CLASS) — proxy tự lấy instance mới' },
        { label: 'inject ApplicationContext + getBean()', note: 'coupling cao, ít dùng' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Vấn đề injection điểm-thời-gian và bốn cách lấy instance mới",
      code:
        "@Component\n" +
        "@Scope(\"prototype\")\n" +
        "class Task { }\n" +
        "\n" +
        "@Service\n" +
        "class Broken {\n" +
        "    private final Task task;      // BẪY: tiêm MỘT lần lúc tạo singleton\n" +
        "    Broken(Task task) { this.task = task; }\n" +
        "    // -> mọi lời gọi sau này đều dùng LẠI đúng một object đó.\n" +
        "    // Scope prototype trở nên vô nghĩa.\n" +
        "}\n" +
        "\n" +
        "// CÁCH 1: ObjectProvider — sạch nhất, không phụ thuộc API container\n" +
        "@Service\n" +
        "class WithProvider {\n" +
        "    private final ObjectProvider<Task> tasks;\n" +
        "    WithProvider(ObjectProvider<Task> tasks) { this.tasks = tasks; }\n" +
        "    void run() { Task t = tasks.getObject(); }     // mỗi lần gọi là object mới\n" +
        "}\n" +
        "\n" +
        "// CÁCH 2: scoped proxy — chỗ dùng không cần biết gì\n" +
        "@Component\n" +
        "@Scope(value = \"prototype\", proxyMode = ScopedProxyMode.TARGET_CLASS)\n" +
        "class ProxiedTask { }\n" +
        "\n" +
        "// CÁCH 3: @Lookup — Spring override method để trả về bean mới\n" +
        "@Service\n" +
        "abstract class WithLookup {\n" +
        "    @Lookup\n" +
        "    protected abstract Task newTask();\n" +
        "}\n" +
        "\n" +
        "// CÁCH 4: ApplicationContextAware — chạy được nhưng gắn chặt vào Spring, tránh dùng",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: '`${...}` và `#{...}` trong `@Value` khác nhau thế nào?',
  answer:
    '`${property.key:default}` — **property placeholder**: lấy giá trị từ `Environment` (application.yml, biến môi trường, `--arg`, config server). Resolve bởi `PropertySourcesPlaceholderConfigurer`.\n\n' +
    '`#{expression}` — **SpEL (Spring Expression Language)**: biểu thức chạy lúc tạo bean, có thể gọi method, truy cập bean khác (`#{@otherBean.value}`), toán tử, `T(java.lang.Math).PI`.\n\n' +
    'Có thể lồng nhau: dùng `${...}` để lấy chuỗi thô rồi cho SpEL trong `#{...}` xử lý tiếp (ví dụ tách chuỗi thành mảng).',
  essence:
    '`${}` là tra cứu cấu hình tĩnh. `#{}` là tính toán biểu thức động. Nhầm lẫn khiến giá trị không được resolve hoặc SpEL injection.',
  example:
    '`@Value("${app.max-retry:3}") int maxRetry;` lấy từ config, mặc định 3. `@Value("#{${app.rate} * 60}") int perMinute;` tính từ giá trị config. Cẩn thận SpEL với input người dùng — rủi ro thực thi mã.',
  viz: {
    type: 'compare',
    cols: ['${property.key:default}', '#{expression}'],
    rows: [
      ['Là gì', 'property placeholder', 'SpEL — Spring Expression Language'],
      ['Nguồn', 'Environment: yml, env var, --arg, config server', 'biểu thức chạy lúc tạo bean'],
      ['Làm được', 'tra cứu cấu hình tĩnh + default', 'gọi method, truy cập bean khác, toán tử, T(...)'],
      ['Rủi ro', 'giá trị không resolve nếu sai cú pháp', 'SpEL injection nếu ghép input người dùng'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Property placeholder vs SpEL",
      code:
        "@Component\n" +
        "public class Config {\n" +
        "\n" +
        "    // ${...} — PROPERTY PLACEHOLDER: lấy từ Environment\n" +
        "    // (application.yml, biến môi trường, tham số dòng lệnh...)\n" +
        "    @Value(\"${app.name}\")\n" +
        "    private String name;\n" +
        "\n" +
        "    @Value(\"${app.timeout:5000}\")           // sau dấu : là giá trị mặc định\n" +
        "    private int timeout;                    // thiếu key mà không có mặc định -> lỗi khởi động\n" +
        "\n" +
        "    @Value(\"${app.hosts}\")                  // \"a,b,c\" tự tách thành list\n" +
        "    private List<String> hosts;\n" +
        "\n" +
        "    // #{...} — SpEL: BIỂU THỨC, tính lúc chạy\n" +
        "    @Value(\"#{2 * 60 * 1000}\")\n" +
        "    private long twoMinutes;\n" +
        "\n" +
        "    @Value(\"#{systemProperties[\u0027user.timezone\u0027]}\")\n" +
        "    private String tz;\n" +
        "\n" +
        "    @Value(\"#{otherBean.someProperty}\")     // đọc property của bean khác\n" +
        "    private String fromBean;\n" +
        "\n" +
        "    // Lồng nhau: SpEL bọc ngoài, placeholder được thay TRƯỚC\n" +
        "    @Value(\"#{\u0027${app.hosts}\u0027.split(\u0027,\u0027).length}\")\n" +
        "    private int hostCount;\n" +
        "}\n" +
        "// Nhớ: ${} = TRA CỨU giá trị cấu hình. #{} = TÍNH một biểu thức.\n" +
        "// Nhiều property liên quan nhau -> bỏ @Value, dùng @ConfigurationProperties.",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Profiles trong Spring dùng để làm gì? `@Profile` hoạt động ra sao?',
  answer:
    'Profile cho phép nhóm cấu hình/bean theo môi trường (`dev`, `test`, `staging`, `prod`). Kích hoạt qua `spring.profiles.active=prod` (env var, arg, config).\n\n' +
    '`@Profile("prod")` trên `@Configuration`/`@Bean`/`@Component`: bean chỉ được đăng ký khi profile đó active. Hỗ trợ biểu thức: `@Profile("!test")`, `@Profile("prod & eu")`.\n\n' +
    'File cấu hình theo profile: `application-prod.yml` được nạp chồng lên `application.yml`.',
  essence:
    'Profile là công tắc điều kiện ở tầng định nghĩa bean và property, giúp một artifact chạy đúng ở nhiều môi trường mà không cần build lại.',
  example:
    '`@Bean @Profile("!prod") CommandLineRunner seedData(...){...}` chỉ nạp dữ liệu mẫu ngoài production. `@Bean @Profile("prod") DataSource realDs()` vs `@Profile("test") DataSource h2()`.',
  viz: {
    type: 'compare',
    cols: ['profile: test', 'profile: prod'],
    rows: [
      ['DataSource', 'H2 in-memory', 'DataSource thật (@Profile("prod"))'],
      ['seedData CommandLineRunner', 'chạy (@Profile("!prod"))', 'không chạy'],
      ['File cấu hình', 'application-test.yml chồng lên', 'application-prod.yml chồng lên'],
      ['Kích hoạt', 'spring.profiles.active=test', 'spring.profiles.active=prod'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bean theo môi trường và cách kích hoạt",
      code:
        "@Configuration\n" +
        "public class DataSourceConfig {\n" +
        "\n" +
        "    @Bean\n" +
        "    @Profile(\"dev\")                       // chỉ tạo khi profile dev đang bật\n" +
        "    DataSource devDs() { return new EmbeddedDatabaseBuilder().build(); }\n" +
        "\n" +
        "    @Bean\n" +
        "    @Profile(\"prod\")\n" +
        "    DataSource prodDs() { return HikariDataSource.of(url, user, pass); }\n" +
        "\n" +
        "    @Bean\n" +
        "    @Profile(\"!prod\")                     // MỌI profile TRỪ prod\n" +
        "    Tracer verboseTracer() { return new LoggingTracer(); }\n" +
        "\n" +
        "    @Bean\n" +
        "    @Profile({\"prod\", \"staging\"})         // hoặc prod hoặc staging\n" +
        "    Metrics metrics() { return new DatadogMetrics(); }\n" +
        "}\n" +
        "\n" +
        "@Service\n" +
        "@Profile(\"prod & !legacy\")                // biểu thức: & | ! và ngoặc đơn\n" +
        "class ModernProdService { }",
    },
    {
      lang: "yaml",
      title: "Kích hoạt profile và cấu hình riêng từng môi trường",
      code:
        "# application.yml — phần dùng chung\n" +
        "spring:\n" +
        "  application:\n" +
        "    name: order-service\n" +
        "  profiles:\n" +
        "    active: dev            # đừng hardcode \"prod\" ở đây, để môi trường quyết định\n" +
        "    # group gộp nhiều profile thành một tên gọi\n" +
        "    group:\n" +
        "      prod: [prod-db, prod-cache, metrics]\n" +
        "\n" +
        "---\n" +
        "# Multi-document YAML: khối riêng cho từng profile, cùng một file\n" +
        "spring:\n" +
        "  config:\n" +
        "    activate:\n" +
        "      on-profile: dev\n" +
        "logging:\n" +
        "  level:\n" +
        "    org.hibernate.SQL: DEBUG\n" +
        "\n" +
        "# Ưu tiên kích hoạt lúc chạy (cao hơn file cấu hình):\n" +
        "#   java -jar app.jar --spring.profiles.active=prod\n" +
        "#   SPRING_PROFILES_ACTIVE=prod java -jar app.jar\n" +
        "# Test: @ActiveProfiles(\"test\")",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Spring event: `ApplicationEventPublisher`, `@EventListener`, `@TransactionalEventListener`.',
  answer:
    'Publish: inject `ApplicationEventPublisher`, gọi `publishEvent(new OrderCreatedEvent(order))`.\n\n' +
    'Listen: `@EventListener void on(OrderCreatedEvent e){...}`. Mặc định **đồng bộ** — chạy trên cùng thread, cùng transaction với publisher. Thêm `@Async` để chạy nền.\n\n' +
    '`@TransactionalEventListener(phase = AFTER_COMMIT)`: chỉ xử lý **sau khi transaction commit thành công** — tránh gửi email/notification rồi transaction lại rollback.',
  essence:
    'Event giúp giảm coupling giữa các module trong cùng process (in-process pub/sub). Đồng bộ theo mặc định; `AFTER_COMMIT` là chốt an toàn cho side-effect ra ngoài.',
  example:
    '`OrderService` phát `OrderPaidEvent`; `InvoiceListener` (AFTER_COMMIT) tạo hoá đơn, `EmailListener` (AFTER_COMMIT + @Async) gửi mail. `OrderService` không biết gì về invoice/email → dễ thêm listener mới.',
  viz: {
    type: 'sequence',
    title: 'Event in-process + @TransactionalEventListener',
    actors: ['OrderService', 'TX', 'InvoiceListener', 'EmailListener'],
    messages: [
      { from: 0, to: 1, label: 'publishEvent(OrderPaidEvent)' },
      { from: 1, to: 1, label: 'commit thành công' },
      { from: 1, to: 2, label: 'AFTER_COMMIT → tạo hoá đơn' },
      { from: 1, to: 3, label: 'AFTER_COMMIT + @Async → gửi mail', dashed: true },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Event đồng bộ, bất đồng bộ và gắn với transaction",
      code:
        "// 1) Định nghĩa event — từ Spring 4.2 không cần kế thừa ApplicationEvent\n" +
        "public record OrderPlacedEvent(String orderId, long amount) { }\n" +
        "\n" +
        "// 2) Phát\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final ApplicationEventPublisher publisher;\n" +
        "\n" +
        "    @Transactional\n" +
        "    public void place(Order o) {\n" +
        "        repo.save(o);\n" +
        "        publisher.publishEvent(new OrderPlacedEvent(o.id(), o.amount()));\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 3) Nhận — MẶC ĐỊNH LÀ ĐỒNG BỘ, chạy trên chính thread đang gọi,\n" +
        "// và nằm trong CÙNG transaction. Listener ném lỗi -> rollback cả việc chính.\n" +
        "@Component\n" +
        "public class EmailListener {\n" +
        "\n" +
        "    @EventListener\n" +
        "    public void on(OrderPlacedEvent e) { }\n" +
        "\n" +
        "    @EventListener\n" +
        "    @Async                                   // chạy thread khác -> KHÔNG rollback theo,\n" +
        "    public void onAsync(OrderPlacedEvent e) { }   // nhưng cũng mất luôn transaction\n" +
        "\n" +
        "    // Chờ transaction COMMIT XONG rồi mới chạy — đúng cho việc gửi mail,\n" +
        "    // đẩy message: tránh gửi mail rồi transaction lại rollback.\n" +
        "    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)\n" +
        "    public void onCommitted(OrderPlacedEvent e) { mailer.send(e); }\n" +
        "\n" +
        "    // Các phase khác: BEFORE_COMMIT, AFTER_ROLLBACK, AFTER_COMPLETION\n" +
        "    @EventListener\n" +
        "    @Order(1)                                // thứ tự giữa nhiều listener\n" +
        "    public void first(OrderPlacedEvent e) { }\n" +
        "}",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Component scanning là gì? `@ComponentScan` và `@SpringBootApplication` liên quan thế nào?',
  answer:
    'Component scan quét classpath tìm class có `@Component` (và stereotype) để đăng ký bean tự động.\n\n' +
    '`@SpringBootApplication` = `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`. `@ComponentScan` mặc định quét **package của class main và các sub-package**.\n\n' +
    'Class nằm ngoài cây package đó sẽ **không** được quét → bean "không tìm thấy". Có thể chỉ định `@ComponentScan(basePackages = "com.acme")`.',
  essence:
    'Vị trí class main quyết định phạm vi quét mặc định. Đây là lý do quy ước đặt class main ở package gốc của dự án.',
  example:
    'Class main ở `com.acme.app`, nhưng có `@Repository` ở `com.acme.shared.persistence` → không được quét, khởi động fail. Sửa: chuyển class main lên `com.acme`, hoặc khai báo `@SpringBootApplication(scanBasePackages = "com.acme")`.',
  viz: {
    type: 'flow',
    title: 'Phạm vi component scan',
    nodes: ['@SpringBootApplication', '@ComponentScan', 'quét package main + sub', 'tìm @Component', 'đăng ký bean'],
    steps: [
      { to: 1, label: '@SpringBootApplication = @Configuration + @EnableAutoConfiguration + @ComponentScan' },
      { to: 2, label: 'mặc định quét package của class main và mọi sub-package' },
      { to: 3, label: 'tìm class có @Component / @Service / @Repository / @Controller' },
      { to: 4, label: 'đăng ký bean. Class ngoài cây package đó → KHÔNG được quét → "bean không tìm thấy"' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Phạm vi quét và cách thu hẹp",
      code:
        "// @SpringBootApplication đã gộp sẵn 3 annotation:\n" +
        "//   @SpringBootConfiguration + @EnableAutoConfiguration + @ComponentScan\n" +
        "@SpringBootApplication          // quét từ CHÍNH package của class này trở xuống\n" +
        "public class Application {\n" +
        "    public static void main(String[] args) { SpringApplication.run(Application.class, args); }\n" +
        "}\n" +
        "// -> Đặt class main ở package GỐC (com.example.app). Đặt sâu hơn thì các\n" +
        "// package anh em không được quét, và triệu chứng là \"bean not found\" khó hiểu.\n" +
        "\n" +
        "@Configuration\n" +
        "@ComponentScan(\n" +
        "    basePackages = {\"com.example.core\", \"com.example.web\"},   // chỉ định rõ\n" +
        "    // basePackageClasses an toàn hơn: đổi tên package không hỏng\n" +
        "    basePackageClasses = {CoreMarker.class},\n" +
        "    excludeFilters = @ComponentScan.Filter(\n" +
        "        type = FilterType.ASSIGNABLE_TYPE, classes = LegacyService.class)\n" +
        ")\n" +
        "public class ScanConfig { }\n" +
        "\n" +
        "// Quét nhiều package lớn làm chậm khởi động. Nếu là thư viện dùng chung,\n" +
        "// đừng bắt người dùng quét — hãy đăng ký qua auto-configuration\n" +
        "// (META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports).",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: '`@Configuration` với `proxyBeanMethods = true/false` khác gì (full vs lite mode)?',
  answer:
    '**Full mode** (`proxyBeanMethods = true`, mặc định): class `@Configuration` được bọc CGLIB proxy. Gọi một `@Bean` method từ method khác trong cùng config trả về **cùng singleton** đã đăng ký, không tạo instance mới.\n\n' +
    '**Lite mode** (`proxyBeanMethods = false`): không proxy → gọi chéo `@Bean` method tạo **object mới** mỗi lần. Nhanh hơn khi khởi động, ít bộ nhớ, nhưng phải tự tránh gọi chéo (nên inject qua tham số method).',
  essence:
    'Full mode giữ ngữ nghĩa singleton kể cả khi bạn gọi `@Bean` method như hàm thường. Lite mode bỏ proxy để nhẹ, đổi lại bạn chịu trách nhiệm không gọi chéo.',
  example:
    'Spring Boot auto-configuration đặt `proxyBeanMethods = false` để tăng tốc startup. Trong config của bạn, nếu `beanA()` gọi `beanB()`, hãy dùng `@Bean A a(B b)` (nhận `b` qua tham số) thay vì gọi `beanB()` trực tiếp.',
  viz: {
    type: 'compare',
    cols: ['Full mode (proxyBeanMethods=true)', 'Lite mode (=false)'],
    rows: [
      ['@Configuration', 'bọc CGLIB proxy', 'không proxy'],
      ['Gọi chéo @Bean method', 'trả về cùng singleton đã đăng ký', 'tạo object mới mỗi lần'],
      ['Startup', 'chậm hơn, tốn bộ nhớ', 'nhanh, nhẹ'],
      ['Trách nhiệm', 'gọi như hàm thường vẫn đúng', 'phải nhận bean qua tham số method'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Full mode vs lite mode",
      code:
        "@Configuration                        // proxyBeanMethods = true (mặc định) = FULL MODE\n" +
        "public class FullMode {\n" +
        "\n" +
        "    @Bean\n" +
        "    public Repo repo() { return new Repo(); }\n" +
        "\n" +
        "    @Bean\n" +
        "    public Service service() {\n" +
        "        return new Service(repo());   // gọi repo() -> CGLIB chặn lại và trả về\n" +
        "    }                                 // ĐÚNG bean singleton trong container\n" +
        "    @Bean\n" +
        "    public Other other() {\n" +
        "        return new Other(repo());     // vẫn là CÙNG một object với ở trên\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "@Configuration(proxyBeanMethods = false)   // LITE MODE — không sinh proxy CGLIB\n" +
        "public class LiteMode {\n" +
        "\n" +
        "    @Bean\n" +
        "    public Repo repo() { return new Repo(); }\n" +
        "\n" +
        "    @Bean\n" +
        "    public Service service() {\n" +
        "        return new Service(repo());   // BẪY: gọi method Java THUẦN -> tạo Repo MỚI,\n" +
        "    }                                 // không phải bean trong container!\n" +
        "\n" +
        "    @Bean\n" +
        "    public Service serviceOk(Repo repo) {   // ĐÚNG: nhận qua THAM SỐ\n" +
        "        return new Service(repo);           // Spring tự tiêm đúng bean\n" +
        "    }\n" +
        "}\n" +
        "// Vì sao có lite mode: bỏ CGLIB -> khởi động nhanh hơn, hợp native image.\n" +
        "// Toàn bộ auto-configuration của Spring Boot đều dùng proxyBeanMethods = false.\n" +
        "// Quy tắc an toàn: luôn nhận dependency qua THAM SỐ của method @Bean.",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: '`@Conditional` là gì? Nó liên quan gì tới auto-configuration?',
  answer:
    '`@Conditional(SomeCondition.class)` chỉ đăng ký bean/config khi điều kiện đúng. Spring Boot cung cấp sẵn:\n' +
    '- `@ConditionalOnClass` / `@ConditionalOnMissingClass`: theo sự hiện diện của class trên classpath.\n' +
    '- `@ConditionalOnBean` / `@ConditionalOnMissingBean`: theo bean đã có.\n' +
    '- `@ConditionalOnProperty`: theo giá trị property.\n' +
    '- `@ConditionalOnWebApplication`, `@ConditionalOnExpression`…\n\n' +
    'Auto-configuration = hàng loạt `@Configuration` gắn các `@ConditionalOn...`, nạp có chọn lọc theo những gì bạn có trên classpath.',
  essence:
    'Auto-config là "cấu hình mặc định có điều kiện": có `spring-data-redis` + `redis.host` → tự tạo `RedisTemplate`, trừ khi bạn đã tự khai báo (`@ConditionalOnMissingBean`).',
  example:
    'Thêm dependency `spring-boot-starter-data-jpa` + `com.h2database:h2` → Boot tự cấu hình `DataSource` H2 in-memory, `EntityManagerFactory`, `JpaTransactionManager`. Bạn khai báo `DataSource` riêng → auto-config lùi lại nhờ `@ConditionalOnMissingBean`.',
  viz: {
    type: 'tree',
    title: '@Conditional — cấu hình mặc định có điều kiện',
    root: {
      label: '@Conditional(...) — chỉ đăng ký khi điều kiện đúng',
      children: [
        { label: '@ConditionalOnClass / OnMissingClass', note: 'theo class có trên classpath' },
        { label: '@ConditionalOnBean / OnMissingBean', note: 'auto-config lùi lại nếu bạn đã tự khai báo' },
        { label: '@ConditionalOnProperty', note: 'theo giá trị property' },
        { label: '@ConditionalOnWebApplication / OnExpression', note: '…' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Điều kiện dựng sẵn — nền tảng của auto-configuration",
      code:
        "@Configuration\n" +
        "public class ConditionalConfig {\n" +
        "\n" +
        "    // Chỉ tạo khi CHƯA có bean cùng kiểu -> cho phép người dùng ghi đè.\n" +
        "    // Đây là mấu chốt của toàn bộ auto-configuration Spring Boot.\n" +
        "    @Bean\n" +
        "    @ConditionalOnMissingBean(DataSource.class)\n" +
        "    DataSource defaultDs() { return new EmbeddedDatabaseBuilder().build(); }\n" +
        "\n" +
        "    @Bean\n" +
        "    @ConditionalOnClass(name = \"com.zaxxer.hikari.HikariDataSource\")   // có trên classpath?\n" +
        "    DataSource hikari() { return new HikariDataSource(); }\n" +
        "\n" +
        "    @Bean\n" +
        "    @ConditionalOnProperty(name = \"app.cache.enabled\", havingValue = \"true\",\n" +
        "                           matchIfMissing = true)                      // bật/tắt bằng config\n" +
        "    CacheManager cache() { return new CaffeineCacheManager(); }\n" +
        "\n" +
        "    @Bean\n" +
        "    @ConditionalOnBean(MeterRegistry.class)          // phụ thuộc bean khác đã có\n" +
        "    @ConditionalOnWebApplication(type = Type.SERVLET)\n" +
        "    MetricsFilter filter() { return new MetricsFilter(); }\n" +
        "}\n" +
        "\n" +
        "// Điều kiện tự viết:\n" +
        "public class OnLinux implements Condition {\n" +
        "    @Override\n" +
        "    public boolean matches(ConditionContext ctx, AnnotatedTypeMetadata meta) {\n" +
        "        return ctx.getEnvironment().getProperty(\"os.name\", \"\").contains(\"Linux\");\n" +
        "    }\n" +
        "}\n" +
        "// Debug khi bean không xuất hiện như mong đợi:\n" +
        "//   java -jar app.jar --debug     -> in ra CONDITIONS EVALUATION REPORT,\n" +
        "//   nói rõ điều kiện nào khớp, điều kiện nào không và VÌ SAO.",
    },
  ],
},
{
  cat: 'Spring AOP',
  q: '`@Async` và `@Scheduled` hoạt động thế nào? Cạm bẫy thường gặp?',
  answer:
    'Cả hai dựa trên proxy AOP (cần `@EnableAsync` / `@EnableScheduling`).\n\n' +
    '`@Async`: lời gọi method được đẩy sang `TaskExecutor`, trả về ngay (`void`, `Future`, hoặc `CompletableFuture`). Method phải `public`, gọi từ **bean khác** (self-invocation vô hiệu hoá), và nên cấu hình executor riêng (mặc định `SimpleAsyncTaskExecutor` tạo thread vô hạn — nguy hiểm).\n\n' +
    '`@Scheduled`: chạy theo `fixedRate`/`fixedDelay`/`cron`. Mặc định **một thread duy nhất** cho mọi job → job chậm làm trễ job khác; cần `ThreadPoolTaskScheduler`. Trong cluster nhiều instance, mọi node đều chạy → cần khoá phân tán (ShedLock).',
  essence:
    'Cả hai chỉ là advice quanh proxy. `@Async` cần executor có giới hạn; `@Scheduled` cần pool và, trong môi trường scale-out, cần cơ chế chọn một node chạy.',
  example:
    'Job gửi email nhắc hạn chạy `@Scheduled(cron="0 0 8 * * *")` trên 3 pod → 3 lần gửi. Bọc bằng `@SchedulerLock` (ShedLock + Redis/DB) để chỉ một pod thực thi mỗi lần.',
  viz: {
    type: 'compare',
    cols: ['@Async', '@Scheduled'],
    rows: [
      ['Cần bật', '@EnableAsync', '@EnableScheduling'],
      ['Cơ chế', 'đẩy lời gọi sang TaskExecutor, trả về ngay', 'chạy theo fixedRate / fixedDelay / cron'],
      ['Cạm bẫy chính', 'executor mặc định tạo thread vô hạn', '1 thread cho mọi job → job chậm làm trễ job khác'],
      ['Trong cluster', '—', 'mọi node đều chạy → cần ShedLock'],
      ['Chung', 'self-invocation vô hiệu hoá (advice quanh proxy)', 'method phải public'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cấu hình pool riêng và những bẫy im lặng",
      code:
        "@Configuration\n" +
        "@EnableAsync                       // thiếu annotation này thì @Async im lặng KHÔNG chạy\n" +
        "@EnableScheduling\n" +
        "public class AsyncConfig {\n" +
        "\n" +
        "    // Mặc định @Async dùng SimpleAsyncTaskExecutor — TẠO THREAD MỚI MỖI LẦN GỌI,\n" +
        "    // không giới hạn. Luôn khai báo pool riêng:\n" +
        "    @Bean(name = \"taskExecutor\")\n" +
        "    public Executor taskExecutor() {\n" +
        "        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();\n" +
        "        ex.setCorePoolSize(8);\n" +
        "        ex.setMaxPoolSize(16);\n" +
        "        ex.setQueueCapacity(500);           // có giới hạn -> có áp lực ngược\n" +
        "        ex.setThreadNamePrefix(\"async-\");\n" +
        "        ex.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());\n" +
        "        return ex;\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "@Service\n" +
        "public class Jobs {\n" +
        "    @Async(\"taskExecutor\")\n" +
        "    public CompletableFuture<Report> build() {         // trả CompletableFuture để\n" +
        "        return CompletableFuture.completedFuture(r);   // còn bắt được exception\n" +
        "    }\n" +
        "    // BẪY 1: @Async trả void thì exception BIẾN MẤT hoàn toàn\n" +
        "    //         -> cài AsyncUncaughtExceptionHandler nếu buộc phải dùng void\n" +
        "    // BẪY 2: self-invocation — gọi this.build() không qua proxy -> chạy đồng bộ\n" +
        "    // BẪY 3: mất ThreadLocal (SecurityContext, MDC, transaction) sang thread mới\n" +
        "\n" +
        "    // Mặc định @Scheduled dùng pool CHỈ 1 THREAD -> job chạy lâu chặn mọi job khác\n" +
        "    // -> spring.task.scheduling.pool.size: 5\n" +
        "    @Scheduled(cron = \"0 0 3 * * *\", zone = \"Asia/Ho_Chi_Minh\")   // luôn ghi rõ zone\n" +
        "    public void nightly() { }\n" +
        "\n" +
        "    @Scheduled(fixedDelay = 5000)     // đếm từ lúc KẾT THÚC lần trước\n" +
        "    public void poll() { }\n" +
        "    @Scheduled(fixedRate = 5000)      // đếm từ lúc BẮT ĐẦU -> chạy lâu là dồn việc\n" +
        "    public void tick() { }\n" +
        "    // Nhiều instance cùng chạy -> cần khoá phân tán (ShedLock), nếu không\n" +
        "    // job sẽ chạy trùng trên mọi pod.\n" +
        "}",
    },
  ],
},
{
  cat: 'Spring Core / IoC',
  q: 'Spring singleton bean có thread-safe không? Làm sao để an toàn?',
  answer:
    'Spring **không** làm gì để bean thread-safe. Một singleton bean được nhiều request/thread dùng chung, nên:\n' +
    '- **Không giữ state khả biến** trên field (không lưu dữ liệu request vào field service).\n' +
    '- Phụ thuộc được tiêm (repository, template) thường đã thread-safe → dùng thoải mái.\n' +
    '- Nếu cần state theo request: dùng biến cục bộ method, tham số, `ThreadLocal`, hoặc bean scope `request`/`prototype`.\n' +
    '- State khả biến dùng chung thật sự cần → `synchronized`, `Atomic*`, `ConcurrentHashMap`.',
  essence:
    'Bean singleton nên là "hàm không trạng thái có phụ thuộc". Trạng thái đi theo lời gọi (stack), không đi theo bean.',
  example:
    '`@Service class PdfService { private ByteArrayOutputStream buffer; }` — sai, hai request ghi chung buffer. Đúng: tạo `buffer` cục bộ trong method `generate()` và trả về, không lưu lại trên bean.',
  viz: {
    type: 'tree',
    title: 'Giữ singleton bean an toàn đa luồng',
    root: {
      label: 'Spring KHÔNG làm bean thread-safe',
      children: [
        { label: 'Không giữ state khả biến trên field', note: 'đừng lưu dữ liệu request vào field service' },
        { label: 'Phụ thuộc được tiêm thường đã thread-safe', note: 'repository, template — dùng thoải mái' },
        { label: 'State theo request', note: 'biến cục bộ method, tham số, ThreadLocal, scope request/prototype' },
        { label: 'State dùng chung thật sự', note: 'synchronized, Atomic*, ConcurrentHashMap' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Singleton dùng chung mọi request -> state là mìn",
      code:
        "@Service\n" +
        "public class Unsafe {\n" +
        "    private int counter;                 // MÌN: mọi request dùng chung field này\n" +
        "    private String currentUser;          // Tệ hơn: rò rỉ dữ liệu giữa các user\n" +
        "\n" +
        "    public void handle(String user) {\n" +
        "        this.currentUser = user;         // request B ghi đè giá trị của request A\n" +
        "        counter++;                       // race condition, đếm sai\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "@Service\n" +
        "public class Safe {\n" +
        "    private final OrderRepository repo;          // AN TOÀN: immutable, chỉ đọc\n" +
        "    private final AtomicInteger counter = new AtomicInteger();   // an toàn tự thân\n" +
        "\n" +
        "    public Safe(OrderRepository repo) { this.repo = repo; }\n" +
        "\n" +
        "    public void handle(String user) {            // state nằm ở BIẾN CỤC BỘ\n" +
        "        var ctx = new Context(user);             // mỗi thread một bản riêng\n" +
        "        counter.incrementAndGet();\n" +
        "        repo.save(ctx.toEntity());\n" +
        "    }\n" +
        "}\n" +
        "// Bốn cách làm cho an toàn, theo thứ tự nên chọn:\n" +
        "//  1) KHÔNG giữ state — chỉ có final dependency + biến cục bộ (chuẩn mực)\n" +
        "//  2) State bất biến (record, List.copyOf)\n" +
        "//  3) Cấu trúc đồng bộ sẵn: AtomicX, ConcurrentHashMap, LongAdder\n" +
        "//  4) Đổi scope: @Scope(\"request\") hoặc ThreadLocal (nhớ remove())\n" +
        "// Lưu ý: Spring Data repository, RestClient, ObjectMapper đều đã thread-safe.\n" +
        "// Ngược lại SimpleDateFormat thì KHÔNG -> dùng DateTimeFormatter.",
    },
  ],
},
]);
