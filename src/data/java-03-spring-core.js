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
},
]);
