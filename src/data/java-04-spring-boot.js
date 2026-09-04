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
  viz: {
    type: 'compare',
    cols: ['Spring thuần', 'Spring Boot'],
    rows: [
      ['Cấu hình', 'khai báo DispatcherServlet, view resolver, DataSource… thủ công', 'auto-configuration theo classpath'],
      ['Phiên bản thư viện', 'tự chọn + ghép tương thích', 'starter + BOM đã kiểm định'],
      ['Server', 'đóng WAR, cài Tomcat ngoài', 'embedded, java -jar'],
      ['Vận hành', 'tự thêm', 'Actuator, externalized config, logging sẵn'],
    ],
  },
  demo: [
    {
      lang: "xml",
      title: "Trước: Spring thuần — cấu hình XML dài và tự quản version",
      code:
        "<!-- Phải tự khai từng dependency và tự canh version cho khớp nhau -->\n" +
        "<dependency>\n" +
        "  <groupId>org.springframework</groupId>\n" +
        "  <artifactId>spring-webmvc</artifactId>\n" +
        "  <version>5.3.31</version>\n" +
        "</dependency>\n" +
        "<dependency>\n" +
        "  <groupId>org.springframework</groupId>\n" +
        "  <artifactId>spring-orm</artifactId>\n" +
        "  <version>5.3.31</version>   <!-- lệch version một cái là NoSuchMethodError -->\n" +
        "</dependency>\n" +
        "\n" +
        "<!-- Rồi web.xml + dispatcher-servlet.xml + khai DataSource, EntityManager,\n" +
        "     TransactionManager, ViewResolver... vài trăm dòng XML trước khi\n" +
        "     viết được dòng code nghiệp vụ đầu tiên. Cuối cùng đóng WAR, deploy Tomcat. -->",
    },
    {
      lang: "java",
      title: "Sau: Spring Boot — chạy được với một class",
      code:
        "@SpringBootApplication          // = @Configuration + @EnableAutoConfiguration + @ComponentScan\n" +
        "@RestController\n" +
        "public class Application {\n" +
        "\n" +
        "    @GetMapping(\"/hello\")\n" +
        "    public String hello() { return \"xin chào\"; }\n" +
        "\n" +
        "    public static void main(String[] args) {\n" +
        "        SpringApplication.run(Application.class, args);   // Tomcat nhúng tự khởi động\n" +
        "    }\n" +
        "}\n" +
        "// Bốn thứ Boot mang lại:\n" +
        "//  1) Starter      — một dependency kéo theo cả cụm, version đã khớp sẵn\n" +
        "//  2) Auto-config  — thấy gì trên classpath thì tự cấu hình thứ đó\n" +
        "//  3) Server nhúng — chạy java -jar, không cần cài Tomcat bên ngoài\n" +
        "//  4) Production-ready — Actuator: health, metrics, thông tin build\n" +
        "// Boot KHÔNG thay thế Spring: nó vẫn là Spring, chỉ bỏ phần cấu hình lặp đi lặp lại.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Auto-configuration đánh giá theo điều kiện',
    nodes: ['@EnableAutoConfiguration', 'đọc AutoConfiguration.imports', 'đánh giá @ConditionalOn...', 'áp dụng cái phù hợp'],
    steps: [
      { to: 1, label: 'đọc danh sách class auto-config từ mọi jar (META-INF/spring/...)' },
      { to: 2, label: 'mỗi class gắn @ConditionalOnClass / OnMissingBean / OnProperty…' },
      { to: 3, label: 'chỉ áp dụng cấu hình có điều kiện đúng; bean bạn tự khai báo luôn thắng nhờ @ConditionalOnMissingBean' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Từ @EnableAutoConfiguration tới bean cuối cùng",
      code:
        "// 1) @SpringBootApplication chứa @EnableAutoConfiguration\n" +
        "// 2) Nó đọc file trong MỌI jar trên classpath:\n" +
        "//    META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\n" +
        "//    (Boot 2.x cũ dùng META-INF/spring.factories)\n" +
        "// 3) Mỗi dòng là một class @AutoConfiguration, được lọc qua các @Conditional\n" +
        "\n" +
        "@AutoConfiguration(after = DataSourceAutoConfiguration.class)   // thứ tự áp dụng\n" +
        "@ConditionalOnClass({DataSource.class, JdbcTemplate.class})     // có trên classpath?\n" +
        "@ConditionalOnSingleCandidate(DataSource.class)                 // có đúng 1 DataSource?\n" +
        "@EnableConfigurationProperties(JdbcProperties.class)\n" +
        "public class JdbcTemplateAutoConfiguration {\n" +
        "\n" +
        "    @Bean\n" +
        "    @Primary\n" +
        "    @ConditionalOnMissingBean(JdbcOperations.class)   // MẤU CHỐT: chỉ tạo khi\n" +
        "    JdbcTemplate jdbcTemplate(DataSource ds) {        // người dùng CHƯA tự định nghĩa\n" +
        "        return new JdbcTemplate(ds);\n" +
        "    }\n" +
        "}\n" +
        "// -> Vì sao khai một @Bean cùng kiểu là auto-config tự nhường: chính là\n" +
        "// @ConditionalOnMissingBean. Auto-config luôn chạy SAU cấu hình của người dùng.",
    },
    {
      lang: "bash",
      title: "Xem vì sao một auto-config được/không được áp dụng",
      code:
        "java -jar app.jar --debug     # in CONDITIONS EVALUATION REPORT\n" +
        "\n" +
        "# Positive matches:  điều kiện nào khớp -> bean nào được tạo\n" +
        "# Negative matches:  KHÔNG khớp vì sao (thiếu class, đã có bean, property tắt)\n" +
        "# Exclusions:        bị loại thủ công\n" +
        "\n" +
        "curl localhost:8080/actuator/conditions   # cùng báo cáo đó qua HTTP\n" +
        "\n" +
        "# Loại một auto-config gây phiền:\n" +
        "java -jar app.jar --spring.autoconfigure.exclude=\\\n" +
        "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Starter = giỏ dependency theo tính năng',
    root: {
      label: 'spring-boot-starter-web',
      children: [
        { label: 'spring-webmvc' },
        { label: 'spring-boot-starter-tomcat', note: 'embedded server' },
        { label: 'spring-boot-starter-json', note: 'Jackson' },
        { label: 'validation' },
      ],
    },
  },
  demo: [
    {
      lang: "xml",
      title: "Starter chỉ là một POM rỗng gom sẵn dependency",
      code:
        "<!-- Một dòng này kéo theo: spring-web, spring-webmvc, jackson,\n" +
        "     tomcat nhúng, validation... với version đã được kiểm thử khớp nhau -->\n" +
        "<dependency>\n" +
        "  <groupId>org.springframework.boot</groupId>\n" +
        "  <artifactId>spring-boot-starter-web</artifactId>\n" +
        "  <!-- KHÔNG cần <version>: parent POM đã quản lý -->\n" +
        "</dependency>\n" +
        "\n" +
        "<parent>\n" +
        "  <groupId>org.springframework.boot</groupId>\n" +
        "  <artifactId>spring-boot-starter-parent</artifactId>\n" +
        "  <version>3.2.0</version>       <!-- một chỗ duy nhất quyết định mọi version -->\n" +
        "</parent>\n" +
        "\n" +
        "<!-- Đổi Tomcat sang Undertow: loại rồi thêm cái khác -->\n" +
        "<dependency>\n" +
        "  <groupId>org.springframework.boot</groupId>\n" +
        "  <artifactId>spring-boot-starter-web</artifactId>\n" +
        "  <exclusions>\n" +
        "    <exclusion>\n" +
        "      <groupId>org.springframework.boot</groupId>\n" +
        "      <artifactId>spring-boot-starter-tomcat</artifactId>\n" +
        "    </exclusion>\n" +
        "  </exclusions>\n" +
        "</dependency>\n" +
        "<dependency>\n" +
        "  <groupId>org.springframework.boot</groupId>\n" +
        "  <artifactId>spring-boot-starter-undertow</artifactId>\n" +
        "</dependency>\n" +
        "\n" +
        "<!-- Quy ước tên: spring-boot-starter-* là của Boot;\n" +
        "     starter của bên thứ ba đặt là <tên>-spring-boot-starter -->",
    },
  ],
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
  viz: {
    type: 'layers',
    title: 'Ưu tiên nguồn cấu hình (trên ghi đè dưới)',
    layers: [
      { name: 'Tham số dòng lệnh', tag: 'cao nhất', note: '--server.port=9000' },
      { name: 'SPRING_APPLICATION_JSON' },
      { name: 'Biến môi trường OS / -D system properties', note: 'cách ghi đè phổ biến trong K8s (relaxed binding)' },
      { name: 'application-{profile}.yml', note: 'ngoài jar → trong jar' },
      { name: 'application.yml', note: 'ngoài jar → trong jar' },
      { name: 'Default properties', tag: 'thấp nhất' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Nguồn sau ghi đè nguồn trước",
      code:
        "# Từ ƯU TIÊN THẤP tới CAO (bản rút gọn, cái sau thắng cái trước):\n" +
        "#   1. @PropertySource\n" +
        "#   2. application.yml trong jar\n" +
        "#   3. application-<profile>.yml trong jar\n" +
        "#   4. application.yml ngoài jar (cùng thư mục chạy, hoặc ./config/)\n" +
        "#   5. application-<profile>.yml ngoài jar\n" +
        "#   6. biến môi trường OS\n" +
        "#   7. system property (-D)\n" +
        "#   8. tham số dòng lệnh (--key=value)          <- gần như cao nhất\n" +
        "#   9. @TestPropertySource / properties của @SpringBootTest\n" +
        "\n" +
        "java -jar app.jar --server.port=9090            # thắng mọi file cấu hình\n" +
        "SERVER_PORT=9090 java -jar app.jar              # relaxed binding: SERVER_PORT\n" +
        "                                                # -> server.port\n" +
        "java -Dserver.port=9090 -jar app.jar\n" +
        "\n" +
        "# Relaxed binding — bốn cách viết sau là MỘT property:\n" +
        "#   spring.jpa.database-platform   (kebab, nên dùng trong yml)\n" +
        "#   spring.jpa.databasePlatform\n" +
        "#   spring.jpa.database_platform\n" +
        "#   SPRING_JPA_DATABASEPLATFORM    (dạng biến môi trường)\n" +
        "\n" +
        "# Xem giá trị cuối cùng thực sự đang dùng và nó đến từ nguồn nào:\n" +
        "curl localhost:8080/actuator/env/server.port",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['@Value("${...}")', '@ConfigurationProperties'],
    rows: [
      ['Phạm vi', 'một giá trị lẻ', 'cả nhóm property vào POJO có cấu trúc'],
      ['Kiểu phức', 'không', 'nested, List, Map, Duration, DataSize'],
      ['Relaxed binding', 'hạn chế', 'đầy đủ (max-size ↔ maxSize)'],
      ['Validate', 'không', '@Validated (JSR-380) — sai là app không khởi động'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "@ConfigurationProperties: gom nhóm, kiểu an toàn, validate được",
      code:
        "@ConfigurationProperties(prefix = \"app.mail\")\n" +
        "@Validated                                  // bật Bean Validation cho config\n" +
        "public record MailProperties(\n" +
        "        @NotBlank String host,              // thiếu -> LỖI NGAY LÚC KHỞI ĐỘNG,\n" +
        "        @Min(1) @Max(65535) int port,       // không phải lúc gửi mail đầu tiên\n" +
        "        @NotNull Duration timeout,          // \"30s\" tự parse thành Duration\n" +
        "        DataSize maxAttachment,             // \"10MB\" tự parse\n" +
        "        List<String> recipients,            // hỗ trợ list, map, object lồng nhau\n" +
        "        Map<String, String> headers\n" +
        ") { }\n" +
        "\n" +
        "@EnableConfigurationProperties(MailProperties.class)   // hoặc @ConfigurationPropertiesScan\n" +
        "@Configuration\n" +
        "class MailConfig {\n" +
        "    @Bean\n" +
        "    Mailer mailer(MailProperties props) { return new Mailer(props); }\n" +
        "}\n" +
        "\n" +
        "// @Value hợp cho MỘT giá trị lẻ:\n" +
        "@Value(\"${app.name}\") private String name;\n" +
        "// Nhưng thua ở: không gom nhóm, không validate, không metadata cho IDE,\n" +
        "// không hỗ trợ relaxed binding đầy đủ, không bind được kiểu phức tạp.\n" +
        "// -> Nhiều hơn 2-3 property liên quan nhau thì luôn dùng @ConfigurationProperties.",
    },
    {
      lang: "yaml",
      title: "Cấu hình tương ứng",
      code:
        "app:\n" +
        "  mail:\n" +
        "    host: smtp.example.com\n" +
        "    port: 587\n" +
        "    timeout: 30s              # tự chuyển thành Duration\n" +
        "    max-attachment: 10MB      # tự chuyển thành DataSize\n" +
        "    recipients:\n" +
        "      - ops@example.com\n" +
        "      - dev@example.com\n" +
        "    headers:\n" +
        "      X-Source: order-service",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'java -jar app.jar (fat jar)',
    nodes: ['java -jar app.jar', 'JarLauncher (Main-Class)', 'class loader lồng nhau', 'đọc jar-in-jar', 'gọi class main thật'],
    steps: [
      { to: 1, label: 'Main-Class trong manifest là JarLauncher của Boot' },
      { to: 2, label: 'tạo class loader đọc BOOT-INF/classes (app) + BOOT-INF/lib (dependency)' },
      { to: 4, label: 'launcher gọi class @SpringBootApplication → ServletWebServerFactory tạo Tomcat nhúng, mở cổng' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Bên trong một fat jar của Spring Boot",
      code:
        "unzip -l app.jar\n" +
        "# BOOT-INF/classes/     <- code của bạn\n" +
        "# BOOT-INF/lib/         <- toàn bộ dependency, vẫn ở dạng .jar NGUYÊN VẸN\n" +
        "# META-INF/MANIFEST.MF\n" +
        "# org/springframework/boot/loader/   <- launcher của Boot\n" +
        "\n" +
        "cat META-INF/MANIFEST.MF\n" +
        "# Main-Class: org.springframework.boot.loader.launch.JarLauncher   <- chạy trước\n" +
        "# Start-Class: com.example.Application                             <- main thật của bạn\n" +
        "\n" +
        "# Vì sao cần launcher riêng: ClassLoader chuẩn của Java KHÔNG đọc được\n" +
        "# jar lồng trong jar. Boot dùng LaunchedURLClassLoader để làm việc đó.\n" +
        "# Đây cũng là lý do KHÔNG nên dùng \"uber jar\" giải nén trộn hết class vào nhau:\n" +
        "# trộn xong là mất chữ ký, đụng file trùng tên trong META-INF/services.\n" +
        "\n" +
        "# Giải nén sẵn theo lớp -> Docker cache tốt hơn nhiều (lib đổi ít hơn code)\n" +
        "java -Djarmode=layertools -jar app.jar extract\n" +
        "# tạo ra: dependencies/ spring-boot-loader/ snapshot-dependencies/ application/",
    },
  ],
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
  viz: {
    type: 'tree',
    title: '/actuator/** — biến app thành "observable"',
    root: {
      label: '/actuator (mặc định chỉ health expose qua HTTP)',
      children: [
        { label: 'health', note: 'app + DB, disk, Redis… → cho orchestrator (liveness/readiness)' },
        { label: 'metrics / prometheus', note: 'Micrometer → monitoring' },
        { label: 'loggers', note: 'đổi log level runtime' },
        { label: 'env / heapdump / threaddump', note: 'debug — lộ thông tin nhạy cảm, phải bảo vệ' },
      ],
    },
  },
  demo: [
    {
      lang: "yaml",
      title: "Mở đúng endpoint cần và khoá phần còn lại",
      code:
        "management:\n" +
        "  endpoints:\n" +
        "    web:\n" +
        "      exposure:\n" +
        "        include: health,info,metrics,prometheus   # MẶC ĐỊNH chỉ có health\n" +
        "        # ĐỪNG dùng include: \"*\" ở production — /env và /heapdump lộ secret\n" +
        "      base-path: /actuator\n" +
        "  endpoint:\n" +
        "    health:\n" +
        "      show-details: when-authorized      # never | when-authorized | always\n" +
        "      probes:\n" +
        "        enabled: true                    # bật /health/liveness và /health/readiness\n" +
        "    shutdown:\n" +
        "      enabled: false                     # tắt: endpoint này tắt được cả ứng dụng\n" +
        "  server:\n" +
        "    port: 9090                           # tách sang cổng riêng, không expose ra ngoài\n" +
        "  metrics:\n" +
        "    tags:\n" +
        "      application: order-service",
    },
    {
      lang: "java",
      title: "Health indicator riêng và bảo mật endpoint",
      code:
        "@Component\n" +
        "public class QueueHealthIndicator implements HealthIndicator {\n" +
        "    @Override\n" +
        "    public Health health() {\n" +
        "        long depth = queue.depth();\n" +
        "        if (depth > 10_000)\n" +
        "            return Health.down().withDetail(\"depth\", depth).build();   // -> HTTP 503\n" +
        "        return Health.up().withDetail(\"depth\", depth).build();\n" +
        "    }\n" +
        "}\n" +
        "// Endpoint hay dùng: /health /info /metrics /prometheus /loggers (đổi log level\n" +
        "// lúc chạy, không cần restart) /threaddump /heapdump /env /conditions /mappings\n" +
        "\n" +
        "@Bean\n" +
        "SecurityFilterChain actuatorSecurity(HttpSecurity http) throws Exception {\n" +
        "    return http.securityMatcher(EndpointRequest.toAnyEndpoint())\n" +
        "            .authorizeHttpRequests(a -> a\n" +
        "                    // health/info cho k8s probe gọi tự do\n" +
        "                    .requestMatchers(EndpointRequest.to(\"health\", \"info\")).permitAll()\n" +
        "                    .anyRequest().hasRole(\"ADMIN\"))     // còn lại phải là admin\n" +
        "            .httpBasic(withDefaults())\n" +
        "            .build();\n" +
        "}",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Liveness', 'Readiness'],
    rows: [
      ['Câu hỏi', 'process còn sống & phục hồi được không?', 'đã sẵn sàng nhận traffic chưa?'],
      ['Fail →', 'orchestrator RESTART pod', 'ngừng route traffic, KHÔNG restart'],
      ['Nên fail khi', 'deadlock, hỏng nội bộ không tự thoát', 'warm-up, mất DB tạm, graceful shutdown'],
      ['Endpoint', '/actuator/health/liveness', '/actuator/health/readiness'],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Hai câu hỏi khác nhau nên hai probe khác nhau",
      code:
        "# LIVENESS  = \"tiến trình còn cứu được không?\" -> FAIL thì k8s GIẾT và tạo pod mới\n" +
        "# READINESS = \"nhận traffic được chưa?\"        -> FAIL thì k8s chỉ RÚT khỏi load balancer\n" +
        "livenessProbe:\n" +
        "  httpGet:\n" +
        "    path: /actuator/health/liveness\n" +
        "    port: 8080\n" +
        "  initialDelaySeconds: 30      # cho JVM thời gian khởi động\n" +
        "  periodSeconds: 10\n" +
        "  failureThreshold: 3          # nới tay: sai ở đây là restart oan cả cụm\n" +
        "\n" +
        "readinessProbe:\n" +
        "  httpGet:\n" +
        "    path: /actuator/health/readiness\n" +
        "    port: 8080\n" +
        "  periodSeconds: 5\n" +
        "  failureThreshold: 1          # chặt tay: rút traffic là hành động rẻ, hồi lại được\n" +
        "\n" +
        "# LỖI KINH ĐIỂN: đưa DB check vào LIVENESS. DB chậm 30 giây -> k8s giết SẠCH\n" +
        "# mọi pod cùng lúc, và pod mới cũng không lên nổi vì DB vẫn chậm.\n" +
        "# -> Dependency bên ngoài chỉ thuộc READINESS.",
    },
    {
      lang: "java",
      title: "Điều khiển trạng thái readiness từ trong code",
      code:
        "@Component\n" +
        "public class WarmupListener {\n" +
        "    private final ApplicationEventPublisher publisher;\n" +
        "\n" +
        "    @EventListener(ApplicationReadyEvent.class)\n" +
        "    public void warmUp() {\n" +
        "        // Tự rút khỏi load balancer trong lúc nạp cache nặng\n" +
        "        AvailabilityChangeEvent.publish(publisher, this,\n" +
        "                ReadinessState.REFUSING_TRAFFIC);\n" +
        "        cache.preload();\n" +
        "        AvailabilityChangeEvent.publish(publisher, this,\n" +
        "                ReadinessState.ACCEPTING_TRAFFIC);\n" +
        "    }\n" +
        "}\n" +
        "// Boot tự chuyển readiness sang REFUSING_TRAFFIC khi bắt đầu graceful shutdown.",
    },
  ],
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
  viz: {
    type: 'timeline',
    title: 'Graceful shutdown khi rolling update',
    events: [
      { t: 't0', label: 'nhận SIGTERM' },
      { t: 't0+', label: 'readiness fail' },
      { t: 't1', label: 'load balancer rút pod, hết route request mới' },
      { t: 't1→t2', label: 'chờ request đang chạy hoàn tất (timeout-per-shutdown-phase)' },
      { t: 't2', label: 'đóng server, thoát sạch — không 5xx' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Cấu hình và phối hợp với Kubernetes",
      code:
        "server:\n" +
        "  shutdown: graceful          # mặc định là immediate — cắt phăng request đang chạy\n" +
        "spring:\n" +
        "  lifecycle:\n" +
        "    timeout-per-shutdown-phase: 30s   # chờ tối đa 30s rồi mới cắt",
    },
    {
      lang: "bash",
      title: "Trình tự tắt đúng và cái bẫy race condition",
      code:
        "# Khi nhận SIGTERM, Boot sẽ:\n" +
        "#   1) ngừng nhận kết nối MỚI\n" +
        "#   2) để request ĐANG chạy hoàn tất (tối đa timeout ở trên)\n" +
        "#   3) đóng ApplicationContext -> chạy @PreDestroy, đóng connection pool\n" +
        "#   4) thoát\n" +
        "\n" +
        "# BẪY: k8s gửi SIGTERM và xoá pod khỏi Endpoints SONG SONG, không theo thứ tự.\n" +
        "# Có một khoảng ngắn kube-proxy vẫn đẩy traffic vào pod đang tắt -> lỗi 502.\n" +
        "# Cách chữa: ngủ một nhịp TRƯỚC khi tiến trình bắt đầu tắt.\n" +
        "lifecycle:\n" +
        "  preStop:\n" +
        "    exec:\n" +
        "      command: [\"sh\", \"-c\", \"sleep 5\"]\n" +
        "terminationGracePeriodSeconds: 45   # phải LỚN HƠN preStop + timeout của app",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['@SpringBootTest', '@WebMvcTest', '@DataJpaTest'],
    rows: [
      ['Nạp', 'toàn bộ ApplicationContext', 'chỉ MVC layer', 'chỉ JPA layer + DB nhúng'],
      ['Tốc độ', 'chậm', 'nhanh', 'nhanh'],
      ['Phụ thuộc', 'thật', 'service phải @MockBean', 'repository thật, transaction rollback mỗi test'],
      ['Dùng cho', 'integration / end-to-end', 'test controller: mapping, validation, HTTP', 'test @Query, mapping entity'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Toàn bộ context vs lát cắt",
      code:
        "// @SpringBootTest: nạp TOÀN BỘ context -> chậm nhất, nhưng gần production nhất.\n" +
        "// Dùng cho integration test đầu-cuối.\n" +
        "@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)\n" +
        "@AutoConfigureMockMvc\n" +
        "class FullIT {\n" +
        "    @Autowired TestRestTemplate rest;\n" +
        "\n" +
        "    @Test\n" +
        "    void ok() {\n" +
        "        assertThat(rest.getForObject(\"/orders/1\", Order.class)).isNotNull();\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// @WebMvcTest: CHỈ nạp tầng web (controller, filter, advice, converter).\n" +
        "// Service/Repository KHÔNG được nạp -> phải mock.\n" +
        "@WebMvcTest(OrderController.class)\n" +
        "class WebSliceTest {\n" +
        "    @Autowired MockMvc mvc;\n" +
        "    @MockBean OrderService service;             // bắt buộc, nếu không -> bean not found\n" +
        "\n" +
        "    @Test\n" +
        "    void returns404() throws Exception {\n" +
        "        given(service.find(\"x\")).willThrow(new NotFoundException());\n" +
        "        mvc.perform(get(\"/orders/x\")).andExpect(status().isNotFound());\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// @DataJpaTest: chỉ nạp JPA + repository. Mặc định dùng DB nhúng và\n" +
        "// TỰ ROLLBACK sau mỗi test.\n" +
        "@DataJpaTest\n" +
        "class RepoTest {\n" +
        "    @Autowired OrderRepository repo;\n" +
        "    @Autowired TestEntityManager em;\n" +
        "\n" +
        "    @Test\n" +
        "    void findsByStatus() {\n" +
        "        em.persist(new Order(\"NEW\"));\n" +
        "        assertThat(repo.findByStatus(\"NEW\")).hasSize(1);\n" +
        "    }\n" +
        "}\n" +
        "// Các slice khác: @JsonTest, @RestClientTest, @DataRedisTest, @JdbcTest.\n" +
        "// Context được CACHE và dùng lại giữa các test có cấu hình GIỐNG NHAU\n" +
        "// -> mỗi biến thể @MockBean/@TestPropertySource lại tạo thêm một context mới,\n" +
        "// đó chính là lý do bộ test phình thời gian.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['CommandLineRunner', 'ApplicationRunner'],
    rows: [
      ['Tham số', 'String... args (thô)', 'ApplicationArguments (đã parse)'],
      ['Phân biệt --x=y vs operand', 'không', 'có'],
      ['Thời điểm chạy', 'một lần, sau khi context sẵn sàng', 'một lần, sau khi context sẵn sàng'],
      ['Thứ tự nhiều runner', '@Order / Ordered', '@Order / Ordered'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chạy code sau khi context sẵn sàng",
      code:
        "@Component\n" +
        "@Order(1)                                  // thứ tự khi có nhiều runner\n" +
        "public class SeedRunner implements CommandLineRunner {\n" +
        "    @Override\n" +
        "    public void run(String... args) {      // args THÔ, y như main(String[])\n" +
        "        log.info(\"nạp dữ liệu mẫu\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "@Component\n" +
        "@Order(2)\n" +
        "public class ReportRunner implements ApplicationRunner {\n" +
        "    @Override\n" +
        "    public void run(ApplicationArguments args) {   // args đã PHÂN TÍCH sẵn\n" +
        "        if (args.containsOption(\"rebuild\")) {      // --rebuild=true\n" +
        "            List<String> values = args.getOptionValues(\"rebuild\");\n" +
        "        }\n" +
        "        List<String> plain = args.getNonOptionArgs();   // tham số không có --\n" +
        "    }\n" +
        "}\n" +
        "// Khác biệt duy nhất: kiểu tham số. ApplicationArguments tiện hơn -> ưu tiên.\n" +
        "\n" +
        "// Cả hai chạy SAU khi context sẵn sàng, TRƯỚC khi SpringApplication.run() trả về.\n" +
        "// Runner ném exception -> ứng dụng KHỞI ĐỘNG THẤT BẠI (thường là điều bạn muốn\n" +
        "// với việc migrate dữ liệu, nhưng phải nhớ điều đó).\n" +
        "\n" +
        "// Với ứng dụng dạng job chạy một lần rồi thoát, đặt exit code cho đúng:\n" +
        "System.exit(SpringApplication.exit(ctx, () -> 0));",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Logging trong Spring Boot',
    root: {
      label: 'Logback qua SLF4J (mặc định, ghi stdout)',
      children: [
        { label: 'Đặt level qua property', note: 'logging.level.com.acme=DEBUG — không cần file XML' },
        { label: 'Đổi runtime', note: 'POST /actuator/loggers/<package> — không redeploy' },
        { label: 'Ghi file', note: 'logging.file.name=app.log' },
        { label: 'Cấu hình sâu', note: 'logback-spring.xml — appender, JSON encoder, <springProfile>' },
      ],
    },
  },
  demo: [
    {
      lang: "yaml",
      title: "Level, file và pattern",
      code:
        "logging:\n" +
        "  level:\n" +
        "    root: INFO\n" +
        "    com.example.order: DEBUG            # theo package\n" +
        "    org.hibernate.SQL: DEBUG            # in câu SQL\n" +
        "    org.hibernate.orm.jdbc.bind: TRACE  # in cả giá trị tham số (Hibernate 6)\n" +
        "    org.springframework.web: INFO\n" +
        "  file:\n" +
        "    name: /var/log/app/application.log  # có file.name mới ghi ra file\n" +
        "  logback:\n" +
        "    rollingpolicy:\n" +
        "      max-file-size: 100MB\n" +
        "      max-history: 30\n" +
        "      total-size-cap: 3GB\n" +
        "  pattern:\n" +
        "    console: \"%d{HH:mm:ss} %-5level [%X{traceId}] %logger{20} - %msg%n\"",
    },
    {
      lang: "bash",
      title: "Mặc định là gì và đổi level lúc đang chạy",
      code:
        "# Mặc định: SLF4J (API) + Logback (implementation), đi kèm spring-boot-starter-logging.\n" +
        "# Muốn đổi sang Log4j2: loại starter-logging rồi thêm spring-boot-starter-log4j2.\n" +
        "# Mặc định chỉ in ra console, KHÔNG ghi file.\n" +
        "\n" +
        "# Đổi log level KHÔNG CẦN RESTART (rất hữu ích khi đang có sự cố production):\n" +
        "curl -X POST localhost:8080/actuator/loggers/com.example.order \\\n" +
        "  -H \"Content-Type: application/json\" \\\n" +
        "  -d \u0027{\"configuredLevel\":\"DEBUG\"}\u0027\n" +
        "\n" +
        "curl localhost:8080/actuator/loggers/com.example.order   # xem level hiện tại\n" +
        "\n" +
        "# Trả về mặc định:\n" +
        "curl -X POST localhost:8080/actuator/loggers/com.example.order \\\n" +
        "  -H \"Content-Type: application/json\" -d \u0027{\"configuredLevel\":null}\u0027\n" +
        "\n" +
        "# Bật debug toàn cục lúc khởi động:\n" +
        "java -jar app.jar --debug     # KHÔNG phải root=DEBUG, mà là báo cáo auto-config",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['DevTools ở dev', 'ở production'],
    rows: [
      ['Automatic restart', '2 class loader → restart ~1s khi đổi code', 'tự vô hiệu hoá khi java -jar'],
      ['LiveReload', 'tự refresh trình duyệt', '—'],
      ['Cache template', 'tắt', '—'],
      ['Trong fat jar', 'scope developmentOnly / optional', 'không được đóng gói vào'],
    ],
  },
  demo: [
    {
      lang: "xml",
      title: "Chỉ dùng lúc phát triển",
      code:
        "<dependency>\n" +
        "  <groupId>org.springframework.boot</groupId>\n" +
        "  <artifactId>spring-boot-devtools</artifactId>\n" +
        "  <optional>true</optional>     <!-- optional: không lan sang project phụ thuộc -->\n" +
        "  <scope>runtime</scope>\n" +
        "</dependency>",
    },
    {
      lang: "yaml",
      title: "DevTools làm gì và vì sao không được dùng ở production",
      code:
        "spring:\n" +
        "  devtools:\n" +
        "    restart:\n" +
        "      enabled: true\n" +
        "      exclude: static/**,public/**   # đổi file tĩnh thì reload, không restart\n" +
        "    livereload:\n" +
        "      enabled: true                  # trình duyệt tự tải lại\n" +
        "# DevTools còn tự tắt cache (thymeleaf, static resource) để dễ phát triển.\n" +
        "\n" +
        "# Cơ chế restart nhanh: DÙNG HAI CLASSLOADER — base (dependency, ít đổi)\n" +
        "# và restart (code của bạn). Chỉ nạp lại cái thứ hai -> nhanh hơn khởi động lại.\n" +
        "# Hệ quả cần biết: object nạp bởi hai classloader khác nhau -> ClassCastException\n" +
        "# khó hiểu khi cache/deserialize giữa các lần restart.\n" +
        "\n" +
        "# VÌ SAO KHÔNG DÙNG Ở PRODUCTION:\n" +
        "#  - tự TẮT cache -> chậm hẳn\n" +
        "#  - remote debug/restart là một bề mặt tấn công\n" +
        "#  - hai classloader gây lỗi lạ khó tái hiện\n" +
        "# May là Boot tự vô hiệu hoá DevTools khi chạy từ jar đóng gói hoàn chỉnh\n" +
        "# (java -jar), nên rủi ro chính là khi chạy nhầm bằng IDE/mvn ở môi trường thật.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Xử lý lỗi tập trung',
    nodes: ['exception nghiệp vụ', '@RestControllerAdvice', '@ExceptionHandler', 'map HTTP + ProblemDetail', 'client'],
    steps: [
      { to: 1, label: 'advice áp cho toàn bộ controller — tách xử lý lỗi khỏi controller' },
      { to: 2, label: '@ExceptionHandler(EntityNotFoundException.class)' },
      { to: 3, label: 'ProblemDetail (RFC 7807/9457): type, title, status, detail, instance' },
      { to: 4, label: 'mọi lỗi có hình dạng body nhất quán → client xử lý đồng nhất' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một chỗ xử lý mọi lỗi, trả ProblemDetail chuẩn RFC 7807",
      code:
        "@RestControllerAdvice\n" +
        "public class GlobalExceptionHandler {\n" +
        "\n" +
        "    @ExceptionHandler(OrderNotFoundException.class)\n" +
        "    public ProblemDetail handleNotFound(OrderNotFoundException e) {\n" +
        "        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND,\n" +
        "                e.getMessage());\n" +
        "        pd.setTitle(\"Không tìm thấy đơn hàng\");\n" +
        "        pd.setType(URI.create(\"https://api.example.com/errors/order-not-found\"));\n" +
        "        pd.setProperty(\"orderId\", e.getOrderId());     // field mở rộng tuỳ ý\n" +
        "        pd.setProperty(\"timestamp\", Instant.now());\n" +
        "        return pd;                                     // Content-Type:\n" +
        "    }                                                  // application/problem+json\n" +
        "\n" +
        "    // Gom lỗi validate thành danh sách rõ ràng cho client\n" +
        "    @ExceptionHandler(MethodArgumentNotValidException.class)\n" +
        "    public ProblemDetail handleValidation(MethodArgumentNotValidException e) {\n" +
        "        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);\n" +
        "        pd.setTitle(\"Dữ liệu không hợp lệ\");\n" +
        "        pd.setProperty(\"errors\", e.getBindingResult().getFieldErrors().stream()\n" +
        "                .collect(toMap(FieldError::getField, FieldError::getDefaultMessage)));\n" +
        "        return pd;\n" +
        "    }\n" +
        "\n" +
        "    // Lưới an toàn cuối cùng: KHÔNG bao giờ để lộ stack trace ra ngoài\n" +
        "    @ExceptionHandler(Exception.class)\n" +
        "    public ProblemDetail handleAll(Exception e) {\n" +
        "        log.error(\"lỗi không lường trước\", e);          // chi tiết chỉ vào log\n" +
        "        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,\n" +
        "                \"Đã có lỗi xảy ra\");                    // client chỉ thấy câu chung\n" +
        "    }\n" +
        "}\n" +
        "// Kế thừa ResponseEntityExceptionHandler để bắt luôn lỗi chuẩn của Spring MVC.\n" +
        "// Thu hẹp phạm vi: @RestControllerAdvice(basePackages = \"com.example.api.v1\")",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['@Valid (Jakarta)', '@Validated (Spring)'],
    rows: [
      ['Vai trò', 'kích hoạt validate object lồng nhau', 'thêm validation groups + method-level'],
      ['Đặt ở', '@RequestBody, param, field', 'class (@Service/@Controller) → validate tham số/kết quả method'],
      ['Lỗi @RequestBody', 'MethodArgumentNotValidException', '—'],
      ['Lỗi param', '—', 'ConstraintViolationException'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "@Valid vs @Validated và validate ở đúng tầng",
      code:
        "public record CreateOrderRequest(\n" +
        "        @NotBlank(message = \"Mã sản phẩm không được rỗng\") String sku,\n" +
        "        @Min(1) @Max(100) int quantity,\n" +
        "        @Email String contactEmail,\n" +
        "        @Valid Address address                 // @Valid để đệ quy xuống object con\n" +
        ") { }\n" +
        "\n" +
        "@RestController\n" +
        "@Validated                                     // CẦN cho validate ở tham số đơn lẻ\n" +
        "public class OrderController {\n" +
        "\n" +
        "    // @Valid trên @RequestBody -> lỗi ném MethodArgumentNotValidException\n" +
        "    @PostMapping(\"/orders\")\n" +
        "    public Order create(@Valid @RequestBody CreateOrderRequest req) { }\n" +
        "\n" +
        "    // Validate tham số rời (@RequestParam/@PathVariable) CHỈ chạy khi class\n" +
        "    // có @Validated -> lỗi ném ConstraintViolationException (khác loại!)\n" +
        "    @GetMapping(\"/orders\")\n" +
        "    public List<Order> list(@RequestParam @Min(1) @Max(100) int size) { }\n" +
        "}\n" +
        "\n" +
        "// Khác biệt cốt lõi:\n" +
        "//   @Valid     — chuẩn Jakarta, đệ quy vào object lồng nhau, KHÔNG có group\n" +
        "//   @Validated — của Spring, hỗ trợ GROUP, đặt được ở cấp class để bật\n" +
        "//                validate cho tham số method\n" +
        "public interface OnCreate { }\n" +
        "public interface OnUpdate { }\n" +
        "record UserDto(@NotNull(groups = OnUpdate.class) Long id,\n" +
        "               @NotBlank(groups = {OnCreate.class, OnUpdate.class}) String name) { }\n" +
        "\n" +
        "@PostMapping(\"/users\")\n" +
        "User create(@Validated(OnCreate.class) @RequestBody UserDto dto) { }\n" +
        "\n" +
        "// Validate ở đâu: tầng API cho định dạng/bắt buộc; quy tắc NGHIỆP VỤ\n" +
        "// (số dư đủ không, trạng thái hợp lệ không) thuộc về domain, đừng nhét vào annotation.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Ba trụ cột nối nhau qua traceId',
    nodes: ['metric p99 tăng', 'mở trace theo traceId', 'xem span chậm', 'khoanh vùng service'],
    steps: [
      { to: 0, label: 'http_server_requests_seconds{uri="/orders",quantile="0.99"} tăng (Micrometer → Prometheus)' },
      { to: 1, label: 'log tự thêm traceId/spanId → nhảy từ log sang trace' },
      { to: 2, label: 'span "call inventory-service" chiếm 800ms' },
      { to: 3, label: 'đổi backend (Prometheus/Tempo/Datadog) không sửa code nhờ Micrometer' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Metrics, trace và span tuỳ chỉnh",
      code:
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final MeterRegistry registry;\n" +
        "    private final Counter placed;\n" +
        "\n" +
        "    public OrderService(MeterRegistry registry) {\n" +
        "        this.registry = registry;\n" +
        "        this.placed = Counter.builder(\"orders.placed\")\n" +
        "                .description(\"số đơn đã đặt\")\n" +
        "                .tag(\"channel\", \"web\")        // TAG phải có lực lượng THẤP —\n" +
        "                .register(registry);          // đừng bao giờ tag orderId/userId\n" +
        "    }                                         // (cardinality nổ -> sập Prometheus)\n" +
        "\n" +
        "    @Observed(name = \"order.place\")           // tạo cả metric lẫn span một lúc\n" +
        "    public void place(Order o) {\n" +
        "        placed.increment();\n" +
        "        registry.gauge(\"orders.queue.depth\", queue, Queue::depth);   // giá trị hiện tại\n" +
        "        Timer.builder(\"orders.processing\")\n" +
        "             .publishPercentiles(0.5, 0.95, 0.99)\n" +
        "             .register(registry)\n" +
        "             .record(() -> process(o));\n" +
        "    }\n" +
        "}",
    },
    {
      lang: "yaml",
      title: "Bật Prometheus và tracing",
      code:
        "management:\n" +
        "  endpoints:\n" +
        "    web:\n" +
        "      exposure:\n" +
        "        include: health,metrics,prometheus\n" +
        "  metrics:\n" +
        "    tags:\n" +
        "      application: ${spring.application.name}\n" +
        "  tracing:\n" +
        "    sampling:\n" +
        "      probability: 0.1        # lấy mẫu 10% — 1.0 ở production sẽ rất tốn\n" +
        "  otlp:\n" +
        "    tracing:\n" +
        "      endpoint: http://collector:4318/v1/traces\n" +
        "\n" +
        "logging:\n" +
        "  pattern:\n" +
        "    # traceId/spanId do Micrometer Tracing tự đưa vào MDC -> log nối được với trace\n" +
        "    level: \"%5p [${spring.application.name},%X{traceId:-},%X{spanId:-}]\"\n" +
        "\n" +
        "# Kiến trúc Boot 3: Micrometer Metrics (số liệu) + Micrometer Tracing (vết),\n" +
        "# thay cho Spring Cloud Sleuth đã ngừng phát triển.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Spring Boot 3 — "dọn nhà"',
    root: {
      label: 'Spring Boot 3',
      children: [
        { label: 'Jakarta EE 9+', note: 'javax.* → jakarta.*; rào cản chính khi nâng cấp' },
        { label: 'Java 17 baseline', note: '3.2+ hỗ trợ Java 21, virtual threads' },
        { label: 'GraalVM native image', note: 'khởi động ~vài chục ms, RAM thấp; build lâu, cần reflection hint' },
        { label: 'Observability tích hợp', note: 'Micrometer Tracing, RestClient, ProblemDetail, @HttpExchange' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba thay đổi bắt buộc phải xử lý khi nâng cấp",
      code:
        "// 1) javax.* -> jakarta.* (đây là phần tốn công nhất, đụng gần như mọi file)\n" +
        "import jakarta.persistence.Entity;      // cũ: javax.persistence.Entity\n" +
        "import jakarta.validation.Valid;        // cũ: javax.validation.Valid\n" +
        "import jakarta.servlet.http.HttpServletRequest;\n" +
        "// Thư viện nào chưa lên jakarta thì KHÔNG dùng được -> phải nâng cấp trước.\n" +
        "\n" +
        "// 2) Java 17 là tối thiểu (Boot 3.2 hỗ trợ tới Java 21)\n" +
        "//    -> dùng được record, sealed, pattern matching, virtual thread\n" +
        "\n" +
        "// 3) Trace/metrics: Sleuth bị thay bằng Micrometer Tracing (xem câu observability)\n" +
        "\n" +
        "// Thay đổi nhỏ hơn nhưng dễ vỡ khi nâng cấp:\n" +
        "//  - Spring Security: WebSecurityConfigurerAdapter bị XOÁ -> khai SecurityFilterChain\n" +
        "//  - trailing slash: /orders/ KHÔNG còn tự khớp /orders (đường cũ trả 404)\n" +
        "//  - Hibernate 6: một số HQL và cách đặt tên cột đổi\n" +
        "//  - RestTemplate vào chế độ bảo trì -> chuyển dần sang RestClient/WebClient",
    },
    {
      lang: "bash",
      title: "Native image với GraalVM",
      code:
        "# Boot 3 hỗ trợ AOT + GraalVM native sẵn trong plugin\n" +
        "./mvnw -Pnative native:compile\n" +
        "\n" +
        "./target/app          # khởi động ~50ms thay vì ~2s, RAM ~1/5\n" +
        "\n" +
        "# Cái giá phải trả:\n" +
        "#  - build rất lâu (5-10 phút) và tốn RAM\n" +
        "#  - reflection/proxy/resource phải KHAI BÁO TRƯỚC (hoặc dùng RuntimeHints)\n" +
        "#  - không còn JIT tối ưu dần -> throughput đỉnh THẤP HƠN JVM thường\n" +
        "# -> Hợp function/CLI khởi động nhiều lần. Service chạy dài thì JVM thường vẫn tốt hơn.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['@Mock (Mockito)', '@MockBean / @MockitoBean (Spring)'],
    rows: [
      ['Phạm vi', 'một object, gán vào field test', 'thay bean cùng kiểu trong ApplicationContext'],
      ['Bean phụ thuộc', 'không liên quan', 'mọi bean phụ thuộc nhận mock'],
      ['Context cache', 'không ảnh hưởng', 'đánh dấu dirty → tạo lại context (chậm nếu lạm dụng)'],
      ['Dùng khi', 'test logic thuần (+ @InjectMocks)', 'cần cô lập 1 bean trong context đang chạy'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Một cái thay bean trong context, một cái chỉ là object",
      code:
        "// @Mock (Mockito thuần): chỉ tạo object giả, KHÔNG liên quan gì Spring.\n" +
        "// Nhanh nhất vì không nạp context. Ưu tiên dùng cho unit test.\n" +
        "@ExtendWith(MockitoExtension.class)\n" +
        "class UnitTest {\n" +
        "    @Mock OrderRepository repo;\n" +
        "    @InjectMocks OrderService service;         // Mockito tự tiêm qua constructor\n" +
        "\n" +
        "    @Test\n" +
        "    void tinhTong() {\n" +
        "        given(repo.findById(\"1\")).willReturn(Optional.of(new Order(100)));\n" +
        "        assertThat(service.total(\"1\")).isEqualTo(100);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// @MockBean (Spring Boot): THAY THẾ bean thật trong ApplicationContext.\n" +
        "// Cần khi code đang test được Spring quản lý (controller, @Transactional...).\n" +
        "@SpringBootTest\n" +
        "class ContextTest {\n" +
        "    @Autowired OrderService service;    // bean THẬT, nhưng repo bên trong là mock\n" +
        "    @MockBean OrderRepository repo;     // thay bean thật trong context\n" +
        "\n" +
        "    @Test\n" +
        "    void goiQuaSpring() {\n" +
        "        given(repo.findById(\"1\")).willReturn(Optional.of(new Order(100)));\n" +
        "        assertThat(service.total(\"1\")).isEqualTo(100);\n" +
        "    }\n" +
        "}\n" +
        "// CÁI GIÁ của @MockBean: mỗi tổ hợp @MockBean khác nhau tạo ra một\n" +
        "// ApplicationContext MỚI, không dùng lại được cache -> bộ test chậm dần.\n" +
        "// -> Mặc định dùng @Mock; chỉ dùng @MockBean khi thật sự cần context.\n" +
        "// Boot 3.4+: @MockBean deprecated, thay bằng @MockitoBean.\n" +
        "// @SpyBean/@MockitoSpyBean: giữ bean thật, chỉ ghi đè một vài method.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['.properties', '.yml', 'spring.config.import'],
    rows: [
      ['Cú pháp', 'key phẳng', 'phân cấp, gọn cho lồng nhau', 'nạp thêm nguồn ngoài'],
      ['Multi-document', 'không', '--- + spring.config.activate.on-profile', '—'],
      ['Nguồn thêm', '—', '—', 'optional:file:, configtree:/etc/secrets/, configserver:'],
      ['Dùng', 'đơn giản', 'cấu hình phân cấp', 'K8s Secret mount → property (không lộ trong describe pod)'],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "YAML: phân cấp, multi-document, import",
      code:
        "spring:\n" +
        "  application:\n" +
        "    name: order-service\n" +
        "  datasource:\n" +
        "    url: jdbc:postgresql://localhost:5432/orders\n" +
        "    hikari:\n" +
        "      maximum-pool-size: 20\n" +
        "  config:\n" +
        "    # Nạp thêm nguồn cấu hình khác (Boot 2.4+), optional: thiếu file cũng không lỗi\n" +
        "    import:\n" +
        "      - optional:file:./config/local.yml\n" +
        "      - optional:configtree:/run/secrets/     # mỗi file = một property (k8s secret)\n" +
        "      - vault://secret/order-service\n" +
        "\n" +
        "---\n" +
        "# Multi-document: nhiều \"tài liệu\" trong CÙNG một file, ngăn bằng ---\n" +
        "spring:\n" +
        "  config:\n" +
        "    activate:\n" +
        "      on-profile: prod          # khối này chỉ áp dụng khi profile prod bật\n" +
        "      on-cloud-platform: kubernetes\n" +
        "  datasource:\n" +
        "    url: jdbc:postgresql://prod-db:5432/orders\n" +
        "logging:\n" +
        "  level:\n" +
        "    root: WARN",
    },
    {
      lang: "properties",
      title: ".properties: phẳng, nhưng không nhập nhằng",
      code:
        "# Ưu: không phụ thuộc thụt lề, không có bẫy kiểu dữ liệu, dễ ghi đè bằng biến môi trường\n" +
        "spring.application.name=order-service\n" +
        "spring.datasource.hikari.maximum-pool-size=20\n" +
        "\n" +
        "# List thì phải đánh chỉ số bằng tay -> đây là chỗ YAML thắng rõ\n" +
        "app.mail.recipients[0]=ops@example.com\n" +
        "app.mail.recipients[1]=dev@example.com\n" +
        "\n" +
        "# BẪY CỦA YAML cần biết:\n" +
        "#  - phải thụt lề bằng DẤU CÁCH, dùng tab là lỗi parse\n" +
        "#  - country: NO  -> YAML 1.1 hiểu thành boolean false! Phải viết \"NO\"\n" +
        "#  - version: 1.10 -> thành số 1.1. Phải viết \"1.10\"\n" +
        "#  - mật khẩu bắt đầu bằng * hoặc & -> phải bọc nháy\n" +
        "# Cùng lúc có cả hai file: .properties THẮNG .yml (nạp sau, ghi đè).\n" +
        "# -> Chọn một kiểu cho cả dự án, đừng trộn.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Platform thread', 'Virtual thread (Java 21)'],
    rows: [
      ['Ánh xạ', '1:1 với OS thread', 'nhiều virtual : ít carrier OS thread'],
      ['Khi block I/O', 'giữ OS thread', 'gỡ khỏi carrier — gần như miễn phí'],
      ['Số lượng khả thi', 'hàng trăm–nghìn', 'hàng triệu'],
      ['Bật ở Boot 3.2+', '—', 'spring.threads.virtual.enabled=true'],
      ['Lưu ý', '—', 'tránh synchronized dài (pin carrier); pool connection vẫn là trần'],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Bật virtual thread trong Spring Boot 3.2+",
      code:
        "spring:\n" +
        "  threads:\n" +
        "    virtual:\n" +
        "      enabled: true      # cần Java 21. Một dòng này thay đổi rất nhiều thứ:\n" +
        "# - Tomcat xử lý mỗi request trên MỘT virtual thread (thay cho pool 200 thread)\n" +
        "# - @Async và @Scheduled chạy trên virtual thread\n" +
        "# - Spring Data, RestClient... không phải sửa gì",
    },
    {
      lang: "java",
      title: "Vì sao nó thay đổi cách nghĩ về IO-bound",
      code:
        "// TRƯỚC: mỗi request chiếm một platform thread (~1MB stack, do OS xếp lịch).\n" +
        "// 200 thread là trần thực tế -> gọi API chậm là pool cạn -> hết phục vụ được.\n" +
        "// Đó là lý do phải viết reactive (WebFlux) cho hệ thống nhiều IO.\n" +
        "\n" +
        "// SAU: virtual thread do JVM xếp lịch, tốn vài trăm byte, tạo hàng triệu cái được.\n" +
        "try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {\n" +
        "    List<Future<String>> results = urls.stream()\n" +
        "            .map(url -> executor.submit(() -> httpClient.send(req(url), ofString())))\n" +
        "            .toList();      // 10.000 lời gọi song song vẫn bình thường\n" +
        "}\n" +
        "// Code CHẶN bình thường lại đạt được throughput của code bất đồng bộ, mà vẫn\n" +
        "// giữ được stack trace dễ đọc và debugger dùng được.\n" +
        "\n" +
        "// BA CÁI BẪY còn lại:\n" +
        "//  1) synchronized GHIM virtual thread vào carrier thread (đỡ hơn từ JDK 24,\n" +
        "//     trước đó nên đổi sang ReentrantLock ở đoạn có IO bên trong)\n" +
        "//  2) ThreadLocal: mỗi task một thread mới -> pattern cache theo thread vô dụng,\n" +
        "//     và tốn bộ nhớ nếu giữ nhiều\n" +
        "//  3) Không dùng cho tác vụ CPU-bound — chỗ đó vẫn cần pool cố định\n" +
        "//  4) Connection pool (Hikari) trở thành nút thắt mới: một triệu virtual thread\n" +
        "//     vẫn chỉ chia nhau 20 connection -> phải chỉnh lại kích thước pool",
    },
  ],
},
]);
