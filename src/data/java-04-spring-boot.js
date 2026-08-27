SS.addQuestions('java', [
{
  cat: 'Spring Boot',
  q: 'Spring Boot giải quyết vấn đề gì so với Spring thuần?',
  answer:
    'Spring thuần mạnh nhưng tốn nhiều cấu hình: khai báo `DispatcherServlet`, view resolver, data source, transaction manager, chọn phiên bản thư viện tương thích, đóng gói WAR deploy lên server.\n\n' +
    'Spring Boot cung cấp:\n' +
    '- **Auto-configuration**: tự cấu hình theo classpath.\n' +
    '- **Starter dependencies**: gom nhóm thư viện + phiên bản đã kiểm định.\n' +
    '- **Embedded server**: chạy `java -jar`, không cần cài Tomcat ngoài.\n' +
    '- **Production-ready**: Actuator (health, metrics), externalized config, logging mặc định.\n' +
    '- **Opinionated defaults** nhưng vẫn ghi đè được.',
  essence:
    'Boot không thêm sức mạnh mới cho Spring; nó loại bỏ cấu hình lặp lại bằng quy ước + auto-config có điều kiện, để bạn tập trung vào nghiệp vụ.',
  example:
    'Một REST API "hello world": Spring thuần cần ~5 file XML/Java config + WAR + Tomcat. Với Boot: 1 class `@SpringBootApplication` + `spring-boot-starter-web`, `mvn spring-boot:run` là chạy.',
},
{
  cat: 'Spring Boot',
  q: 'Auto-configuration hoạt động chính xác như thế nào?',
  answer:
    '`@EnableAutoConfiguration` (trong `@SpringBootApplication`) đọc danh sách các class auto-config từ file `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` (trước Boot 2.7 là `spring.factories`) của mọi jar.\n\n' +
    'Mỗi class là `@AutoConfiguration` gắn các `@ConditionalOnClass`, `@ConditionalOnMissingBean`, `@ConditionalOnProperty`… Spring đánh giá điều kiện và chỉ áp dụng cái phù hợp.\n\n' +
    '`@ConditionalOnMissingBean` đảm bảo bean **bạn tự khai báo** luôn thắng auto-config. Xem `--debug` để in "CONDITIONS EVALUATION REPORT".',
  essence:
    'Auto-config = "nếu thấy X trên classpath và bạn chưa tự cấu hình thì tôi cấu hình mặc định cho X". Nó phản ứng theo dependency chứ không phải luôn bật.',
  example:
    'Có `HikariCP` + `spring.datasource.url` → tự tạo `DataSource`. Thêm `spring-boot-starter-data-redis` → tự tạo `RedisConnectionFactory`, `RedisTemplate`, `StringRedisTemplate`. Tự khai báo `@Bean RedisTemplate` → bản của bạn được dùng.',
},
{
  cat: 'Spring Boot',
  q: '"Starter" trong Spring Boot là gì?',
  answer:
    'Starter là một artifact **chỉ chứa dependency**, không có code (hoặc rất ít). Nó gom một nhóm thư viện thường dùng cùng nhau, với phiên bản đã được BOM (`spring-boot-dependencies`) kiểm định tương thích.\n\n' +
    'Ví dụ `spring-boot-starter-web` kéo về: `spring-webmvc`, `spring-boot-starter-tomcat`, `spring-boot-starter-json` (Jackson), validation.\n\n' +
    'Lợi ích: không phải tự tìm và ghép phiên bản từng thư viện; nâng cấp Boot là nâng cả bộ nhất quán.',
  essence:
    'Starter = "giỏ dependency theo tính năng" + quản lý phiên bản tập trung. Nó biến việc chọn thư viện từ bài toán tương thích thành một dòng khai báo.',
  example:
    'Cần bảo mật: thêm `spring-boot-starter-security`. Cần gọi HTTP: `spring-boot-starter-webflux` (WebClient) hoặc dùng `RestClient`. Cần test: `spring-boot-starter-test` (JUnit 5, Mockito, AssertJ, Spring Test).',
},
{
  cat: 'Spring Boot',
  q: 'Thứ tự ưu tiên các nguồn cấu hình trong Spring Boot?',
  answer:
    'Từ **cao xuống thấp** (nguồn trên ghi đè nguồn dưới), rút gọn:\n' +
    '1. Tham số dòng lệnh (`--server.port=9000`).\n' +
    '2. `SPRING_APPLICATION_JSON`.\n' +
    '3. Biến môi trường OS / system properties (`-D`).\n' +
    '4. `application-{profile}.yml` ngoài jar → trong jar.\n' +
    '5. `application.yml` ngoài jar → trong jar.\n' +
    '6. `@PropertySource`.\n' +
    '7. Default properties (`SpringApplication.setDefaultProperties`).\n\n' +
    'Trong container/K8s, biến môi trường (ví dụ `SPRING_DATASOURCE_URL`) là cách ghi đè phổ biến — dấu chấm/gạch chuyển thành `_` viết hoa (relaxed binding).',
  essence:
    'Cấu hình gần runtime và gần môi trường thật thì thắng. Nhờ đó một artifact chạy được ở mọi môi trường chỉ bằng cách bơm env var/arg khác nhau.',
  example:
    'Image Docker build sẵn với `application.yml` mặc định (dev). Khi deploy prod, K8s inject `SPRING_PROFILES_ACTIVE=prod` và `SPRING_DATASOURCE_PASSWORD` từ Secret — ghi đè giá trị trong jar mà không rebuild.',
},
{
  cat: 'Spring Boot',
  q: '`@ConfigurationProperties` và `@Value` — chọn cái nào?',
  answer:
    '`@Value("${...}")`: tiêm **một** giá trị vào field/param. Hợp cho 1–2 giá trị lẻ. Không hỗ trợ relaxed binding đầy đủ, không validate nhóm, không metadata IDE.\n\n' +
    '`@ConfigurationProperties(prefix = "app.mail")`: bind **cả nhóm** property vào một POJO có cấu trúc (nested object, `List`, `Map`, `Duration`, `DataSize`). Hỗ trợ **relaxed binding** (`app.mail.max-size` ↔ `maxSize`), `@Validated` (JSR-380), gợi ý IDE qua annotation processor.',
  essence:
    '`@Value` là "lấy một ô cấu hình". `@ConfigurationProperties` là "map một khối cấu hình có kiểu và validate". Cấu hình phức tạp thì luôn dùng cái sau.',
  example:
    '`@ConfigurationProperties("app.rate-limit") @Validated record RateLimitProps(@Min(1) int perSecond, Duration window) {}` — gom cấu hình rate limit, sai kiểu/thiếu giá trị là app không khởi động, thay vì lỗi runtime.',
},
{
  cat: 'Spring Boot',
  q: 'Embedded server và executable jar hoạt động ra sao?',
  answer:
    'Boot nhúng Tomcat/Jetty/Undertow như **thư viện**. Lúc khởi động, `ServletWebServerFactory` tạo server, đăng ký `DispatcherServlet`, mở cổng — không cần server container ngoài.\n\n' +
    '`spring-boot-maven-plugin` đóng gói **fat jar** với layout đặc biệt: class app ở `BOOT-INF/classes`, dependency ở `BOOT-INF/lib`, và một `JarLauncher` của Boot làm `Main-Class`. `java -jar app.jar` → launcher tạo class loader lồng nhau đọc jar-in-jar rồi gọi class main thật.',
  essence:
    'Server là dependency chứ không phải hạ tầng. Fat jar là một artifact tự chứa, chạy giống nhau trên laptop, CI và production — hợp với triết lý container.',
  example:
    'Dockerfile chỉ cần `FROM eclipse-temurin:17-jre` + `COPY app.jar` + `ENTRYPOINT ["java","-jar","/app.jar"]`. Để tối ưu cache layer, dùng `layertools` tách dependencies/loader/app thành các layer riêng.',
},
{
  cat: 'Spring Boot',
  q: 'Spring Boot Actuator cung cấp gì? Bảo mật endpoint thế nào?',
  answer:
    'Actuator thêm các endpoint vận hành qua `spring-boot-starter-actuator`:\n' +
    '- `/actuator/health` (trạng thái app + thành phần: DB, disk, Redis…).\n' +
    '- `/actuator/info`, `/actuator/metrics`, `/actuator/prometheus` (Micrometer).\n' +
    '- `/actuator/env`, `/actuator/loggers` (đổi log level runtime), `/actuator/threaddump`, `/actuator/heapdump`.\n\n' +
    'Mặc định chỉ `health` được expose qua HTTP. Bật thêm: `management.endpoints.web.exposure.include=health,info,prometheus`. Bảo vệ: đặt trên **port riêng** (`management.server.port`), hoặc Spring Security cho path `/actuator/**`, không expose ra internet.',
  essence:
    'Actuator biến app thành "observable": health cho orchestrator, metrics cho monitoring, loggers/env cho debug production. Đổi lại phải kiểm soát truy cập vì nó lộ thông tin nhạy cảm.',
  example:
    'K8s dùng `/actuator/health/liveness` và `/readiness` cho probe. Prometheus scrape `/actuator/prometheus`. `env`, `heapdump` chỉ mở trong mạng nội bộ hoặc sau auth.',
},
{
  cat: 'Spring Boot',
  q: 'Liveness và Readiness probe khác nhau thế nào?',
  answer:
    '**Liveness**: "process còn sống và có khả năng phục hồi không?". Fail → orchestrator **restart** pod. Chỉ nên fail khi app vào trạng thái không thể tự thoát (deadlock, hỏng nội bộ).\n\n' +
    '**Readiness**: "app đã sẵn sàng nhận traffic chưa?". Fail → orchestrator **ngừng route traffic** tới pod nhưng không restart. Fail khi đang warm-up, mất kết nối DB tạm thời, hoặc đang graceful shutdown.\n\n' +
    'Spring Boot expose `/actuator/health/liveness` và `/readiness` khi chạy trên K8s (tự phát hiện) hoặc bật `management.health.probes.enabled=true`.',
  essence:
    'Liveness bảo vệ khỏi treo vĩnh viễn (biện pháp mạnh: restart). Readiness bảo vệ người dùng khỏi bị route tới pod chưa/không sẵn sàng (biện pháp nhẹ: rút khỏi load balancer).',
  example:
    'DB chập chờn 30 giây: nếu để liveness phụ thuộc DB → K8s restart hàng loạt pod, càng tệ. Đúng: readiness fail (ngừng nhận request), liveness vẫn pass (không restart), pod tự hồi khi DB trở lại.',
},
{
  cat: 'Spring Boot',
  q: 'Graceful shutdown trong Spring Boot là gì và cấu hình thế nào?',
  answer:
    'Khi nhận `SIGTERM`, thay vì cắt ngang request đang xử lý, app: ngừng nhận request mới, **chờ** request đang chạy hoàn tất trong một khoảng thời gian, rồi mới đóng.\n\n' +
    'Cấu hình: `server.shutdown=graceful` và `spring.lifecycle.timeout-per-shutdown-phase=30s`.\n\n' +
    'Kết hợp K8s: `terminationGracePeriodSeconds` ≥ timeout của app; readiness probe fail ngay khi nhận SIGTERM để load balancer rút pod trước.',
  essence:
    'Graceful shutdown loại bỏ lỗi 5xx và transaction dở dang khi deploy/scale-down. Nó là sự phối hợp giữa app (chờ request) và orchestrator (chờ app).',
  example:
    'Rolling update: pod cũ nhận SIGTERM → readiness fail → hết route → xử lý nốt 12 request đang chạy trong ~5s → thoát sạch. Không có graceful, 12 request đó nhận connection reset.',
},
{
  cat: 'Testing',
  q: '`@SpringBootTest` và các test slice (`@WebMvcTest`, `@DataJpaTest`) khác nhau thế nào?',
  answer:
    '`@SpringBootTest`: nạp **toàn bộ** ApplicationContext (mọi bean). Đầy đủ nhưng chậm; dùng cho integration/end-to-end test. Kết hợp `webEnvironment = RANDOM_PORT` + `TestRestTemplate`/`WebTestClient`.\n\n' +
    '**Slice test** chỉ nạp phần context liên quan:\n' +
    '- `@WebMvcTest(UserController.class)`: chỉ MVC layer (controller, `@ControllerAdvice`, converters), service phải `@MockBean`.\n' +
    '- `@DataJpaTest`: chỉ JPA layer + DB nhúng + transaction rollback mỗi test.\n' +
    '- `@JsonTest`, `@RestClientTest`, `@WebFluxTest`…',
  essence:
    'Slice = "nạp ít context nhất để test đúng một tầng" → nhanh, cô lập. `@SpringBootTest` = "nạp tất cả" → dùng khi thật sự cần kiểm tra các tầng ghép với nhau.',
  example:
    'Test validation + mã HTTP của `POST /users`: `@WebMvcTest` + `MockMvc`, mock `UserService`. Test truy vấn custom `@Query`: `@DataJpaTest` chạy trên Testcontainers Postgres. Chỉ smoke test toàn hệ thống mới cần `@SpringBootTest`.',
},
{
  cat: 'Spring Boot',
  q: '`CommandLineRunner` và `ApplicationRunner` dùng khi nào?',
  answer:
    'Cả hai là bean được Spring gọi **một lần** ngay sau khi context sẵn sàng, trước khi app "chạy chính thức".\n\n' +
    '- `CommandLineRunner`: nhận `String... args` thô.\n' +
    '- `ApplicationRunner`: nhận `ApplicationArguments` đã parse (phân biệt option `--x=y` và operand).\n\n' +
    'Nhiều runner sắp thứ tự bằng `@Order` / `Ordered`. Exception ném ra sẽ làm app dừng khởi động (exit code khác 0).\n\n' +
    'Dùng cho: seed dữ liệu, warm cache, chạy job một lần, kiểm tra kết nối bắt buộc.',
  essence:
    'Runner là "hook chạy sau startup". `ApplicationRunner` hơn ở chỗ đã parse tham số. Không dùng cho tác vụ chạy nền dài hạn (đó là việc của `@Scheduled`/`@Async`).',
  example:
    '`@Bean ApplicationRunner seed(UserRepo repo){ return args -> { if (args.containsOption("seed")) repo.saveAll(demoUsers()); }; }` — chỉ nạp dữ liệu mẫu khi chạy `java -jar app.jar --seed`.',
},
{
  cat: 'Spring Boot',
  q: 'Logging trong Spring Boot: mặc định là gì, cấu hình level ra sao?',
  answer:
    'Mặc định dùng **Logback** qua SLF4J, với pattern console có màu, ghi ra stdout (hợp container). Log4j2 thay được bằng cách đổi starter.\n\n' +
    'Đặt level qua property (không cần file XML):\n' +
    '`logging.level.root=INFO`, `logging.level.org.hibernate.SQL=DEBUG`, `logging.level.com.acme=DEBUG`.\n\n' +
    'File: `logging.file.name=app.log`. Đổi runtime qua Actuator `/actuator/loggers`. Cần cấu hình sâu (appender, JSON encoder) thì dùng `logback-spring.xml` (hỗ trợ `<springProfile>`).',
  essence:
    'Boot cho phép chỉnh 90% nhu cầu logging bằng property. Trong môi trường container, log ra stdout dạng JSON để hệ thống thu thập (ELK/Loki) parse được.',
  example:
    'Debug một request lạ trên production: `curl -X POST /actuator/loggers/com.acme.payment -d \'{"configuredLevel":"DEBUG"}\'` bật DEBUG tạm thời cho đúng package, không cần redeploy, xong thì trả về `INFO`.',
},
{
  cat: 'Spring Boot',
  q: '`spring-boot-devtools` làm gì? Có nên dùng ở production không?',
  answer:
    'DevTools hỗ trợ vòng lặp phát triển:\n' +
    '- **Automatic restart**: khi class thay đổi, restart nhanh bằng 2 class loader (base cho thư viện không đổi, restart cho code của bạn).\n' +
    '- **LiveReload**: tự refresh trình duyệt.\n' +
    '- Tắt cache của template engine, đặt property mặc định thân thiện dev.\n\n' +
    'Ở production: DevTools **tự vô hiệu hoá** khi chạy từ `java -jar` (fully packaged) và không được đưa vào fat jar (`optional`/`developmentOnly`).',
  essence:
    'DevTools là công cụ chỉ dành cho dev; restart hai-class-loader nhanh hơn khởi động lại JVM. Nó cố ý "biến mất" trong artifact production.',
  example:
    'Sửa một `@RestController`, lưu → DevTools restart context trong ~1s thay vì ~8s cold start. Kết hợp IDE "build automatically" để trải nghiệm gần như hot reload.',
},
{
  cat: 'Web / Boot',
  q: 'Xử lý lỗi tập trung với `@RestControllerAdvice` và `ProblemDetail`?',
  answer:
    '`@RestControllerAdvice` chứa các `@ExceptionHandler` áp cho toàn bộ controller. Bắt exception nghiệp vụ, map sang mã HTTP + body chuẩn.\n\n' +
    'Từ Spring 6 / Boot 3, `ProblemDetail` (RFC 7807/9457) là chuẩn: body JSON gồm `type`, `title`, `status`, `detail`, `instance` + field mở rộng.\n\n' +
    '`ResponseEntityExceptionHandler` xử lý sẵn các exception của Spring MVC (validation, không đọc được body, method không hỗ trợ…).',
  essence:
    'Advice tách xử lý lỗi khỏi controller, cho một hợp đồng lỗi nhất quán toàn API. `ProblemDetail` chuẩn hoá hình dạng body lỗi để client xử lý đồng nhất.',
  example:
    '`@ExceptionHandler(EntityNotFoundException.class) ProblemDetail handle(EntityNotFoundException e){ var pd = ProblemDetail.forStatusAndDetail(NOT_FOUND, e.getMessage()); pd.setType(URI.create("https://api.acme.com/errors/not-found")); return pd; }`.',
},
{
  cat: 'Web / Boot',
  q: 'Bean Validation trong Spring Boot: `@Valid` vs `@Validated`, validate ở đâu?',
  answer:
    'Có `spring-boot-starter-validation` (Hibernate Validator) → tự bật.\n\n' +
    '- `@Valid` (Jakarta): kích hoạt validate object lồng nhau; đặt trên `@RequestBody`, param, hoặc field.\n' +
    '- `@Validated` (Spring): thêm hỗ trợ **validation groups** và bật **method-level validation** khi đặt trên class (`@Service`, `@Controller`) → validate tham số/kết quả method.\n\n' +
    'Lỗi ở `@RequestBody` → `MethodArgumentNotValidException`; ở param → `ConstraintViolationException`. Xử lý trong `@RestControllerAdvice`.',
  essence:
    '`@Valid` là "hãy validate cái này". `@Validated` là bản Spring mở rộng thêm groups + validate ngay tại biên method. Validate ở biên (controller/service) để dữ liệu vào trong luôn hợp lệ.',
  example:
    '`record CreateUser(@NotBlank String name, @Email String email, @Min(18) int age)` + `@PostMapping ... ResponseEntity<?> create(@Valid @RequestBody CreateUser req)`. Sai email → 400 với danh sách field lỗi, không chạm tới service.',
},
{
  cat: 'Spring Boot',
  q: 'Observability trong Spring Boot 3: Micrometer, metrics và distributed tracing?',
  answer:
    '- **Metrics**: Micrometer là facade (giống SLF4J cho metrics). Boot tự đo JVM, HTTP request, DataSource, cache… Export sang Prometheus/Datadog qua registry tương ứng.\n' +
    '- **Tracing**: Micrometer Tracing (thay Spring Cloud Sleuth) tạo/lan truyền trace-id, span-id qua HTTP/messaging; bridge sang OpenTelemetry hoặc Zipkin.\n' +
    '- **Logs**: pattern log tự thêm `traceId`/`spanId` để nối log với trace.\n\n' +
    '`@Observed` hoặc `ObservationRegistry` để đo một đoạn code nghiệp vụ.',
  essence:
    'Ba trụ cột — metrics, traces, logs — được nối với nhau qua trace-id. Micrometer là lớp trừu tượng để đổi backend (Prometheus, Tempo, Datadog) mà không sửa code.',
  example:
    'Request chậm: xem metric `http_server_requests_seconds{uri="/orders",quantile="0.99"}` tăng → mở trace theo `traceId` trong log → thấy span "call inventory-service" chiếm 800ms → khoanh vùng đúng service.',
},
{
  cat: 'Spring Boot',
  q: 'Spring Boot 3 có gì thay đổi lớn (Jakarta, Java 17, native)?',
  answer:
    '- **Jakarta EE 9+**: mọi `javax.*` (servlet, persistence, validation) đổi thành `jakarta.*`. Nâng cấp phải sửa import và thư viện bên thứ ba tương thích.\n' +
    '- **Java 17 là baseline** (Boot 3.2+ hỗ trợ Java 21, virtual threads).\n' +
    '- **GraalVM native image** chính thức: biên dịch AOT ra binary khởi động ~vài chục ms, RAM thấp — đổi lại build lâu, reflection cần khai báo hint.\n' +
    '- Observability tích hợp sẵn (Micrometer Tracing), `RestClient`, `ProblemDetail`, hỗ trợ `@HttpExchange` client khai báo.',
  essence:
    'Boot 3 là mốc "dọn nhà": rời nền tảng javax cũ, lên Java hiện đại, mở đường cho native/serverless. Rào cản chính khi nâng cấp là hệ sinh thái thư viện javax.',
  example:
    'Function serverless cần cold start nhanh: build native image Boot 3 → khởi động 40ms, RAM 60MB thay vì JVM 2s / 300MB. Với service thường trực, JVM + CDS/AOT vẫn là lựa chọn cân bằng hơn.',
},
{
  cat: 'Testing',
  q: '`@MockBean` khác Mockito `@Mock` thế nào trong test Spring?',
  answer:
    '`@Mock` (Mockito thuần): tạo mock, gán vào field test, không liên quan Spring context.\n\n' +
    '`@MockBean` (Spring Boot Test): tạo mock **và thay thế bean cùng kiểu trong ApplicationContext** bằng mock đó. Mọi bean phụ thuộc vào nó sẽ nhận mock. Việc thay bean khiến context bị **đánh dấu dirty** → Spring tạo lại context cho test khác (chậm nếu lạm dụng).\n\n' +
    'Boot 3.4+ giới thiệu `@MockitoBean` (thay `@MockBean` sẽ deprecated).',
  essence:
    '`@Mock` cô lập một object. `@MockBean` cô lập một **bean bên trong context đang chạy** — mạnh hơn nhưng phá cache context, nên dùng có chọn lọc.',
  example:
    '`@WebMvcTest(OrderController.class)` + `@MockBean OrderService service` — controller thật chạy với service giả, kiểm tra mapping/validation/HTTP status. Nếu chỉ test một helper thuần logic, dùng `@Mock` + `@InjectMocks` nhanh hơn nhiều.',
},
{
  cat: 'Spring Boot',
  q: 'File cấu hình: `.properties` vs `.yml`, multi-document YAML, `spring.config.import`?',
  answer:
    '`.properties` (key phẳng) và `.yml` (phân cấp, gọn cho cấu trúc lồng nhau) tương đương về khả năng; không trộn hai file cùng tên (một cái sẽ bị bỏ qua).\n\n' +
    'YAML **multi-document**: ngăn bằng `---`, mỗi phần có thể gắn `spring.config.activate.on-profile` → cấu hình theo profile trong cùng một file.\n\n' +
    '`spring.config.import`: nạp thêm nguồn — `optional:file:./config/`, `configtree:/etc/secrets/` (mỗi file = 1 property, hợp K8s Secret mount), hoặc `configserver:` (Spring Cloud Config).',
  essence:
    'YAML hợp cấu hình phân cấp; multi-document YAML gộp mọi profile vào một file; `configtree` là cầu nối chuẩn giữa Secret dạng file của K8s và property của Spring.',
  example:
    'K8s mount Secret vào `/etc/secrets/spring.datasource.password`. Đặt `spring.config.import=optional:configtree:/etc/secrets/` → Boot đọc file đó thành property `spring.datasource.password`, không cần env var lộ trong `describe pod`.',
},
{
  cat: 'Spring Boot',
  q: 'Virtual threads (Project Loom) tích hợp với Spring Boot thế nào?',
  answer:
    'Virtual thread (Java 21) là thread rất nhẹ do JVM lập lịch trên một nhóm nhỏ carrier thread OS. Khi virtual thread block ở I/O, nó được "gỡ" khỏi carrier → hàng triệu virtual thread khả thi.\n\n' +
    'Boot 3.2+: bật `spring.threads.virtual.enabled=true` → Tomcat xử lý mỗi request trên một virtual thread; `@Async`, `@Scheduled` cũng dùng virtual thread executor.\n\n' +
    'Lợi ích: mô hình lập trình blocking đơn giản (`RestTemplate`, JDBC) mà vẫn scale như reactive. Lưu ý: tránh `synchronized` dài (pin carrier), pool connection vẫn là giới hạn.',
  essence:
    'Virtual threads giữ code đồng bộ dễ đọc nhưng bỏ được trần "1 request = 1 OS thread". Với service I/O-bound, đây là cách tăng thông lượng mà không viết reactive.',
  example:
    'API gateway gọi 5 downstream tuần tự, mỗi cái 100ms: với platform thread, 200 thread phục vụ 200 request đồng thời. Bật virtual threads → 10.000 request đồng thời vẫn ổn vì thread chờ I/O gần như miễn phí.',
},
]);
