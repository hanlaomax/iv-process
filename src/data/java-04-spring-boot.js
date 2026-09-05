SS.addQuestions('java', [
{
  cat: 'Spring Boot',
  id: 'java-1pcv3jd',
  q: 'Spring Boot giải quyết vấn đề gì so với Spring thuần?',
  answer:
    'Đây là câu mở màn gần như chắc chắn có trong mọi buổi phỏng vấn Spring Boot. Nghe thì dễ, nhưng phần lớn ứng viên trả lời sai trọng tâm: họ kể tính năng ("Boot có auto-config, có embedded server") thay vì nói được **Boot đã bỏ đi cái gì**.\n' +
    '\n' +
    'Tôi sẽ đi từ vấn đề gốc của Spring thuần → bốn khoản chi phí cụ thể → Boot xử lý từng khoản ra sao → và quan trọng nhất, những gì Boot KHÔNG làm.\n' +
    '\n' +
    '## 1. Trước hết: Spring Boot không phải một framework mới\n' +
    '\n' +
    'Rất nhiều người hiểu nhầm chỗ này.\n' +
    '\n' +
    '```\n' +
    'Spring Framework   (IoC container, DI, AOP, MVC, Tx...)\n' +
    '        ↑\n' +
    '        │  Boot dựng BÊN TRÊN, không thay thế\n' +
    '        │\n' +
    'Spring Boot        (auto-config + starter + embedded server)\n' +
    '```\n' +
    '\n' +
    '`ApplicationContext`, `@Transactional`, `DispatcherServlet` — tất cả vẫn là của Spring Framework. Boot không viết lại chúng.\n' +
    '\n' +
    'Vậy Boot làm gì? Nó trả lời đúng một câu hỏi:\n' +
    '\n' +
    'Tại sao để chạy được một REST API đơn giản, tôi phải viết 200 dòng cấu hình mà 195 dòng trong đó dự án nào cũng giống hệt nhau?\n' +
    '\n' +
    '## 2. Bốn khoản chi phí của Spring thuần\n' +
    '\n' +
    'Hãy hình dung bạn bắt đầu một REST API năm 2013, dùng Spring thuần.\n' +
    '\n' +
    '**Khoản 1 — cấu hình hạ tầng.** Bạn phải tự khai báo gần như mọi thứ:\n' +
    '\n' +
    '```java\n' +
    '@Configuration\n' +
    '@EnableWebMvc\n' +
    '@ComponentScan("com.shop")\n' +
    'public class WebConfig implements WebMvcConfigurer {\n' +
    '\n' +
    '    @Bean\n' +
    '    public DataSource dataSource() {\n' +
    '        HikariDataSource ds = new HikariDataSource();\n' +
    '        ds.setJdbcUrl("jdbc:postgresql://localhost:5432/shop");\n' +
    '        ds.setUsername("app");\n' +
    '        ds.setPassword("secret");\n' +
    '        return ds;\n' +
    '    }\n' +
    '\n' +
    '    @Bean\n' +
    '    public LocalContainerEntityManagerFactoryBean entityManagerFactory() { ... }\n' +
    '\n' +
    '    @Bean\n' +
    '    public PlatformTransactionManager transactionManager(EntityManagerFactory emf) { ... }\n' +
    '\n' +
    '    @Bean\n' +
    '    public MappingJackson2HttpMessageConverter jsonConverter() { ... }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Cộng thêm một `WebApplicationInitializer` để đăng ký `DispatcherServlet`. Đọc lại đoạn trên và tự hỏi: có dòng nào là **nghiệp vụ** của bạn không? Không dòng nào cả.\n' +
    '\n' +
    '**Khoản 2 — địa ngục phiên bản.** Bạn cần `spring-webmvc`, `spring-orm`, `hibernate-core`, `jackson-databind`, `hibernate-validator`. Mỗi thư viện có nhiều bản, và không phải tổ hợp nào cũng chạy được với nhau. Sai một bản là `NoSuchMethodError` lúc runtime.\n' +
    '\n' +
    '**Khoản 3 — đóng gói và deploy.** Sản phẩm build ra là file WAR. Muốn chạy, bạn phải có sẵn một Tomcat được cài đúng phiên bản, cấu hình đúng, rồi copy WAR vào `webapps/`. Môi trường dev, staging, prod dễ lệch nhau.\n' +
    '\n' +
    '**Khoản 4 — vận hành.** Health check, metrics, đọc cấu hình theo môi trường, cấu hình log — tự làm hết.\n' +
    '\n' +
    '## 3. Lời giải của Boot cho từng khoản\n' +
    '\n' +
    'Đối chiếu một-một:\n' +
    '\n' +
    '| Chi phí của Spring thuần | Boot xử lý bằng |\n' +
    '| --- | --- |\n' +
    '| Cấu hình hạ tầng lặp lại | **Auto-configuration** |\n' +
    '| Địa ngục phiên bản | **Starter** + BOM `spring-boot-dependencies` |\n' +
    '| WAR + Tomcat ngoài | **Embedded server** + executable jar |\n' +
    '| Vận hành thủ công | **Actuator** + externalized config |\n' +
    '\n' +
    '## 4. Auto-configuration: quy ước thay cho khai báo\n' +
    '\n' +
    'Nguyên tắc của nó gói gọn trong một câu:\n' +
    '\n' +
    'Nếu tôi thấy thư viện X trên classpath, và bạn CHƯA tự khai báo bean cho X, thì tôi khai một bean mặc định hợp lý cho X.\n' +
    '\n' +
    '```\n' +
    'classpath có HikariCP + driver Postgres?\n' +
    '        ↓\n' +
    'bạn đã tự khai @Bean DataSource chưa?\n' +
    '        ↓ chưa\n' +
    'Boot tự tạo DataSource từ spring.datasource.*\n' +
    '```\n' +
    '\n' +
    'Nhờ vậy toàn bộ `WebConfig` ở mục 2 rút xuống còn ba dòng trong `application.yml`:\n' +
    '\n' +
    '```yaml\n' +
    'spring:\n' +
    '  datasource:\n' +
    '    url: jdbc:postgresql://localhost:5432/shop\n' +
    '    username: app\n' +
    '    password: secret\n' +
    '```\n' +
    '\n' +
    'Điểm mấu chốt: đây **không phải magic không cưỡng lại được**. Mỗi auto-config đều gắn `@ConditionalOnMissingBean`, nên ngay khi bạn tự khai một `@Bean DataSource`, bản của bạn thắng.\n' +
    '\n' +
    '## 5. Starter: mua theo giỏ, không mua lẻ\n' +
    '\n' +
    'Thay vì tự chọn 6 thư viện và cầu nguyện chúng hợp nhau:\n' +
    '\n' +
    '```xml\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-web</artifactId>\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    'Một dòng đó kéo về `spring-webmvc`, Tomcat embedded, Jackson, validation — tất cả ở những phiên bản đã được kiểm định là chạy được với nhau. Và bạn không ghi số phiên bản, vì BOM của Boot đã quyết.\n' +
    '\n' +
    '## 6. Embedded server: server thành dependency\n' +
    '\n' +
    'Đây là thay đổi tư duy lớn nhất, và cũng là thứ khiến Boot hợp với container.\n' +
    '\n' +
    '```\n' +
    'Cách cũ:  WAR  →  triển khai VÀO  →  Tomcat cài sẵn ngoài\n' +
    'Cách mới: Tomcat  →  nằm BÊN TRONG  →  app.jar  →  java -jar app.jar\n' +
    '```\n' +
    '\n' +
    'Hệ quả thực tế rất lớn: máy dev và pod production chạy **cùng một** Tomcat, cùng phiên bản, cùng cấu hình. Cả một lớp bug "trên máy tôi chạy được" biến mất. Và Dockerfile chỉ còn cần một JRE.\n' +
    '\n' +
    '## 7. Externalized config: một artifact, nhiều môi trường\n' +
    '\n' +
    'Boot đọc cấu hình từ nhiều nguồn với thứ tự ưu tiên rõ ràng — dòng lệnh thắng biến môi trường, biến môi trường thắng file trong jar.\n' +
    '\n' +
    'Nghĩa là bạn build **một** image duy nhất rồi đẩy qua dev, staging, prod, chỉ đổi biến môi trường. Không rebuild, nên artifact đã test ở staging đúng là artifact chạy ở prod.\n' +
    '\n' +
    '## 8. Boot KHÔNG làm gì — phần rất hay được hỏi vặn\n' +
    '\n' +
    'Nói được phần này là bạn khác hẳn ứng viên học thuộc:\n' +
    '\n' +
    '- Boot **không** làm ứng dụng chạy nhanh hơn. Runtime vẫn là Spring Framework.\n' +
    '- Boot **không** loại bỏ nhu cầu hiểu Spring. Khi auto-config làm sai ý, bạn phải biết `ApplicationContext` và vòng đời bean để gỡ.\n' +
    '- Boot **không** phù hợp tuyệt đối. Nó có ý kiến riêng (opinionated); dự án cần kiểm soát tuyệt đối từng bean đôi khi thấy nó cản đường.\n' +
    '- Boot **không** phải microservices. Bạn hoàn toàn có thể viết một monolith bằng Boot, và rất nhiều hệ thống lớn đang làm vậy.\n' +
    '\n' +
    '## 9. So sánh cụ thể một REST API "hello"\n' +
    '\n' +
    'Spring thuần: `WebConfig` + `AppInitializer` + `pom.xml` tự ghim 6 phiên bản + build WAR + cài Tomcat. Khoảng 5 file, chưa có dòng nghiệp vụ nào.\n' +
    '\n' +
    'Spring Boot:\n' +
    '\n' +
    '```java\n' +
    '@SpringBootApplication\n' +
    '@RestController\n' +
    'public class ShopApplication {\n' +
    '\n' +
    '    public static void main(String[] args) {\n' +
    '        SpringApplication.run(ShopApplication.class, args);\n' +
    '    }\n' +
    '\n' +
    '    @GetMapping("/hello")\n' +
    '    public String hello() {\n' +
    '        return "hello";\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Một file, một starter, `mvn spring-boot:run` là chạy.\n' +
    '\n' +
    '## 10. Chốt lại\n' +
    '\n' +
    'Chuỗi nên nhớ khi trả lời:\n' +
    '\n' +
    '```\n' +
    'Spring thuần: mạnh nhưng bắt bạn cấu hình lặp lại\n' +
    '        ↓\n' +
    'auto-config  → bỏ cấu hình hạ tầng\n' +
    'starter      → bỏ địa ngục phiên bản\n' +
    'embedded     → bỏ server cài ngoài\n' +
    'actuator     → bỏ hạ tầng vận hành tự viết\n' +
    '        ↓\n' +
    'bạn chỉ còn viết nghiệp vụ\n' +
    '```\n' +
    '\n' +
    'Câu trả lời một dòng: Spring Boot không thêm sức mạnh cho Spring, nó **xoá bỏ chi phí khởi động và vận hành** bằng quy ước hợp lý cộng cấu hình có điều kiện, mà vẫn cho bạn ghi đè mọi thứ khi cần.\n' +
    '\n' +
    'Điểm đáng đào tiếp ngay sau đây là: auto-configuration thực sự tìm và quyết định như thế nào? Vì hiểu cơ chế đó là chìa khoá để gỡ mọi lỗi "sao Boot tự tạo bean này".',
  essence:
    'Boot không thêm sức mạnh nào cho Spring — nó xoá đi phần cấu hình mà dự án nào cũng phải viết giống nhau, bằng quy ước hợp lý cộng **auto-configuration** có điều kiện. Bạn vẫn ghi đè được mọi thứ, nên đây là đánh đổi giữa tốc độ khởi động dự án và quyền kiểm soát chi tiết.',
  example:
    'Một REST API "hello world" viết bằng Spring thuần cần khoảng 5 file cấu hình XML/Java, một bản WAR và một Tomcat cài sẵn bên ngoài. Cũng chức năng đó với Boot chỉ còn một class `@SpringBootApplication` cộng dependency `spring-boot-starter-web`, chạy thẳng bằng `mvn spring-boot:run`. Điều đáng nói là ở production, chính cái jar đó chạy bằng `java -jar` với Tomcat nằm bên trong, nên môi trường dev và prod không còn lệch nhau.',
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
  id: 'java-1lpb6sm',
  q: 'Auto-configuration hoạt động chính xác như thế nào?',
  answer:
    'Đây là câu phân loại ứng viên rất tốt. Ai cũng biết "Boot tự cấu hình giúp mình", nhưng chỉ người từng gỡ lỗi cấu hình mới nói được Boot **tìm** các lớp auto-config ở đâu và **quyết định** áp dụng chúng theo thứ tự nào.\n' +
    '\n' +
    'Tôi sẽ đi từ điểm khởi động → nơi Boot đọc danh sách → cơ chế điều kiện → thứ tự áp dụng → và cách bạn tự quan sát nó.\n' +
    '\n' +
    '## 1. Điểm khởi động\n' +
    '\n' +
    'Mọi thứ bắt đầu từ một annotation quen thuộc:\n' +
    '\n' +
    '```java\n' +
    '@SpringBootApplication\n' +
    'public class ShopApplication { ... }\n' +
    '```\n' +
    '\n' +
    'Nó là gộp của ba annotation:\n' +
    '\n' +
    '```\n' +
    '@SpringBootApplication\n' +
    '        │\n' +
    '        ├── @SpringBootConfiguration   (một dạng @Configuration)\n' +
    '        ├── @ComponentScan             (quét bean của BẠN)\n' +
    '        └── @EnableAutoConfiguration   (quét bean của THƯ VIỆN)\n' +
    '```\n' +
    '\n' +
    'Hai cái cuối rất hay bị lẫn. `@ComponentScan` tìm `@Service`, `@Repository`, `@Controller` trong package của bạn. `@EnableAutoConfiguration` thì hoàn toàn khác — nó đi tìm cấu hình dựng sẵn nằm trong các jar khác.\n' +
    '\n' +
    '## 2. Boot lấy danh sách auto-config từ đâu?\n' +
    '\n' +
    'Đây là chi tiết mà ứng viên khá thường trả lời được.\n' +
    '\n' +
    '`@EnableAutoConfiguration` import `AutoConfigurationImportSelector`. Class này quét **mọi jar trên classpath** để đọc file:\n' +
    '\n' +
    '```\n' +
    'META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\n' +
    '```\n' +
    '\n' +
    'Đó là một file text, mỗi dòng là tên đầy đủ của một class auto-config:\n' +
    '\n' +
    '```\n' +
    'org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration\n' +
    'org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration\n' +
    'org.springframework.boot.autoconfigure.jackson.JacksonAutoConfiguration\n' +
    '...\n' +
    '```\n' +
    '\n' +
    'Lưu ý mốc phiên bản, vì đây là chi tiết hay được hỏi: **trước Boot 2.7**, danh sách này nằm trong `META-INF/spring.factories` dưới khoá `EnableAutoConfiguration`. Từ 2.7 nó chuyển sang file `.imports` ở trên, và tới Boot 3 thì cách cũ bị bỏ hẳn.\n' +
    '\n' +
    'Riêng `spring-boot-autoconfigure` đã chứa sẵn hơn một trăm class như vậy. Nghĩa là ngay khi khởi động, Boot có trong tay một danh sách rất dài các cấu hình **ứng viên**.\n' +
    '\n' +
    '## 3. Nhưng danh sách dài không có nghĩa là áp dụng hết\n' +
    '\n' +
    'Đây mới là phần cốt lõi.\n' +
    '\n' +
    'Nếu Boot áp dụng tất cả, ứng dụng của bạn sẽ có cả `DataSource` lẫn `RedisTemplate` lẫn `KafkaTemplate` dù bạn không dùng. Nên mỗi class auto-config đều được bọc trong các **điều kiện**:\n' +
    '\n' +
    '```java\n' +
    '@AutoConfiguration\n' +
    '@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })\n' +
    '@EnableConfigurationProperties(DataSourceProperties.class)\n' +
    'public class DataSourceAutoConfiguration {\n' +
    '\n' +
    '    @Bean\n' +
    '    @ConditionalOnMissingBean(DataSource.class)\n' +
    '    public DataSource dataSource(DataSourceProperties properties) { ... }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Các điều kiện hay gặp nhất:\n' +
    '\n' +
    '- `@ConditionalOnClass` — chỉ chạy nếu class đó có trên classpath. Đây là cách Boot "đoán" bạn định dùng gì.\n' +
    '- `@ConditionalOnMissingBean` — chỉ tạo nếu bạn CHƯA tự khai bean cùng kiểu.\n' +
    '- `@ConditionalOnProperty` — chỉ chạy khi một property có giá trị nhất định.\n' +
    '- `@ConditionalOnWebApplication` — chỉ chạy trong ứng dụng web (servlet hoặc reactive).\n' +
    '- `@ConditionalOnBean` — chỉ chạy khi một bean khác đã tồn tại.\n' +
    '\n' +
    'Kết hợp lại, luồng quyết định cho từng class là:\n' +
    '\n' +
    '```\n' +
    'class auto-config X\n' +
    '        ↓\n' +
    '@ConditionalOnClass thoả?\n' +
    '        ↓ không → bỏ qua hoàn toàn\n' +
    '        ↓ có\n' +
    '@ConditionalOnProperty thoả?\n' +
    '        ↓ không → bỏ qua\n' +
    '        ↓ có\n' +
    'với từng @Bean bên trong:\n' +
    '@ConditionalOnMissingBean thoả?\n' +
    '        ↓ không (bạn đã tự khai) → giữ bean của BẠN\n' +
    '        ↓ có\n' +
    '        → đăng ký bean mặc định của Boot\n' +
    '```\n' +
    '\n' +
    '## 4. Vì sao bean của bạn luôn thắng?\n' +
    '\n' +
    'Câu trả lời nằm ở `@ConditionalOnMissingBean`, nhưng có một chi tiết về **thứ tự** rất đáng nói.\n' +
    '\n' +
    'Auto-configuration luôn được xử lý **sau cùng**, sau khi toàn bộ bean do bạn khai báo đã được đăng ký. Vì vậy tới lượt auto-config chạy, nó đã "nhìn thấy" đầy đủ những gì bạn định nghĩa.\n' +
    '\n' +
    '```\n' +
    '1. @ComponentScan     → bean của bạn vào context\n' +
    '2. @Configuration      → @Bean của bạn vào context\n' +
    '3. auto-configuration  → chỉ điền vào chỗ còn TRỐNG\n' +
    '```\n' +
    '\n' +
    'Đây là lý do bạn không bao giờ phải "tắt" auto-config chỉ để thay một bean: cứ khai bean của mình, Boot tự lùi.\n' +
    '\n' +
    '## 5. Điều khiển thứ tự giữa các auto-config\n' +
    '\n' +
    'Khi các auto-config phụ thuộc nhau, Boot dùng ba annotation:\n' +
    '\n' +
    '- `@AutoConfigureBefore` — chạy trước class được chỉ định.\n' +
    '- `@AutoConfigureAfter` — chạy sau. Ví dụ cấu hình JPA phải chạy sau khi `DataSource` đã có.\n' +
    '- `@AutoConfigureOrder` — chỉ định thứ tự bằng số.\n' +
    '\n' +
    '## 6. Cách tự quan sát: báo cáo điều kiện\n' +
    '\n' +
    'Đây là mẹo thực chiến nên nói trong phỏng vấn, vì nó cho thấy bạn đã dùng thật.\n' +
    '\n' +
    'Chạy ứng dụng với cờ debug:\n' +
    '\n' +
    '```bash\n' +
    'java -jar app.jar --debug\n' +
    '# hoặc đặt trong application.yml:\n' +
    '#   debug: true\n' +
    '```\n' +
    '\n' +
    'Boot sẽ in ra `CONDITIONS EVALUATION REPORT` gồm ba phần:\n' +
    '\n' +
    '```\n' +
    'Positive matches:   auto-config ĐÃ áp dụng, kèm lý do\n' +
    'Negative matches:   auto-config BỊ BỎ QUA, kèm lý do chính xác\n' +
    'Exclusions:         cái bạn tự loại trừ\n' +
    '```\n' +
    '\n' +
    'Phần `Negative matches` là thứ quý nhất khi gỡ lỗi. Thay vì đoán mò "sao không có `DataSource`", bạn đọc thẳng dòng như `DataSourceAutoConfiguration did not match: @ConditionalOnClass did not find required class \'javax.sql.DataSource\'`.\n' +
    '\n' +
    'Ngoài ra, endpoint `/actuator/conditions` cho cùng thông tin đó dưới dạng JSON.\n' +
    '\n' +
    '## 7. Khi cần tắt bớt\n' +
    '\n' +
    'Có hai cách, dùng cho hai tình huống khác nhau:\n' +
    '\n' +
    '```java\n' +
    '// Tắt hẳn một auto-config cụ thể\n' +
    '@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class })\n' +
    '\n' +
    '// Hoặc qua cấu hình, tiện khi chỉ muốn tắt ở một profile\n' +
    '// spring.autoconfigure.exclude=org.springframework...DataSourceAutoConfiguration\n' +
    '```\n' +
    '\n' +
    'Trên thực tế bạn hiếm khi cần tới chúng — phần lớn trường hợp chỉ cần khai bean của mình là đủ.\n' +
    '\n' +
    '## 8. Tự viết một auto-configuration\n' +
    '\n' +
    'Nếu công ty bạn có thư viện nội bộ dùng chung, đây là cách đóng gói nó cho đẹp:\n' +
    '\n' +
    '```java\n' +
    '@AutoConfiguration\n' +
    '@ConditionalOnClass(AuditClient.class)\n' +
    '@ConditionalOnProperty(prefix = "company.audit", name = "enabled", havingValue = "true")\n' +
    '@EnableConfigurationProperties(AuditProperties.class)\n' +
    'public class AuditAutoConfiguration {\n' +
    '\n' +
    '    @Bean\n' +
    '    @ConditionalOnMissingBean\n' +
    '    public AuditClient auditClient(AuditProperties props) {\n' +
    '        return new AuditClient(props.getEndpoint(), props.getTimeout());\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Rồi khai tên class đó trong `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` của jar thư viện. Từ đó, mọi service chỉ cần thêm dependency là có `AuditClient` sẵn sàng, mà vẫn tự thay được nếu muốn.\n' +
    '\n' +
    '## 9. Chốt lại\n' +
    '\n' +
    'Chuỗi cần nhớ:\n' +
    '\n' +
    '```\n' +
    '@EnableAutoConfiguration\n' +
    '        ↓\n' +
    'đọc AutoConfiguration.imports trong mọi jar\n' +
    '        ↓\n' +
    'được danh sách ứng viên (hơn 100 class)\n' +
    '        ↓\n' +
    'lọc bằng @ConditionalOnClass / OnProperty / OnWebApplication\n' +
    '        ↓\n' +
    'chạy SAU bean của bạn\n' +
    '        ↓\n' +
    '@ConditionalOnMissingBean → chỉ điền chỗ trống\n' +
    '        ↓\n' +
    'context hoàn chỉnh\n' +
    '```\n' +
    '\n' +
    'Nói gọn: auto-configuration là cơ chế **phản ứng theo classpath và theo những gì bạn chưa làm**, chứ không phải một tập cấu hình luôn bật.\n' +
    '\n' +
    'Từ đây có một hướng đào rất tự nhiên: nếu auto-config phản ứng theo classpath, thì thứ quyết định classpath chính là các starter — và đó là lý do starter không chỉ là "gói dependency cho tiện".',
  essence:
    'Auto-config là cơ chế phản ứng, không phải tập cấu hình luôn bật: nó đọc danh sách ứng viên từ `AutoConfiguration.imports` của mọi jar, lọc bằng các **điều kiện** như `@ConditionalOnClass`, rồi chạy sau cùng nên `@ConditionalOnMissingBean` chỉ điền vào chỗ bạn còn để trống.',
  example:
    'Khi classpath có HikariCP cùng property `spring.datasource.url`, Boot tự dựng `DataSource` cho bạn. Thêm `spring-boot-starter-data-redis` thì nó dựng tiếp `RedisConnectionFactory`, `RedisTemplate` và `StringRedisTemplate`. Nhưng ngay khi bạn tự khai một `@Bean RedisTemplate` để đổi serializer, bản của bạn được dùng còn bản mặc định lặng lẽ rút lui — và chạy với `--debug` bạn sẽ thấy đúng dòng giải thích điều đó trong mục `Negative matches`.',
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
  id: 'java-72f6ne',
  q: '"Starter" trong Spring Boot là gì?',
  answer:
    'Câu này nghe nhẹ nhàng nên nhiều người trả lời hời hợt: "starter là gói dependency cho tiện". Đúng nhưng chưa đủ, và người phỏng vấn thường hỏi vặn ngay: vậy tại sao không tự thêm mấy dependency đó?\n' +
    '\n' +
    'Tôi sẽ đi từ bài toán thật mà starter giải → cấu tạo bên trong → quan hệ với BOM → quan hệ với auto-config → và cách tự viết một starter nội bộ.\n' +
    '\n' +
    '## 1. Bài toán: địa ngục phiên bản\n' +
    '\n' +
    'Giả sử bạn cần làm REST API có JSON và validation, không dùng starter. Bạn phải tự khai:\n' +
    '\n' +
    '```xml\n' +
    '<dependency> spring-webmvc         : 6.1.4  </dependency>\n' +
    '<dependency> spring-web            : 6.1.4  </dependency>\n' +
    '<dependency> jackson-databind      : 2.15.4 </dependency>\n' +
    '<dependency> jackson-datatype-jsr310 : ???  </dependency>\n' +
    '<dependency> tomcat-embed-core     : 10.1.19</dependency>\n' +
    '<dependency> hibernate-validator   : 8.0.1  </dependency>\n' +
    '<dependency> jakarta.validation-api: 3.0.2  </dependency>\n' +
    '```\n' +
    '\n' +
    'Bây giờ trả lời giúp tôi vài câu:\n' +
    '\n' +
    'Bản `jackson-datatype-jsr310` nào chạy được với `jackson-databind` 2.15.4? Tomcat 10.1 dùng `jakarta.*` hay `javax.*`? Hibernate Validator 8 cần bản `jakarta.validation-api` nào?\n' +
    '\n' +
    'Nếu chọn sai, lỗi thường **không xuất hiện lúc build**. Nó nổ lúc runtime dưới dạng `NoSuchMethodError` hoặc `ClassNotFoundException`, đôi khi chỉ khi chạm đúng một nhánh code hiếm.\n' +
    '\n' +
    'Đó là bài toán starter giải quyết.\n' +
    '\n' +
    '## 2. Starter thực chất là gì?\n' +
    '\n' +
    'Một starter là artifact **gần như rỗng**: không có class, không có logic, chỉ có `pom.xml` liệt kê dependency.\n' +
    '\n' +
    '```\n' +
    'spring-boot-starter-web (jar rỗng)\n' +
    '        │\n' +
    '        ├── spring-boot-starter          (core: logging, autoconfigure, spring-core)\n' +
    '        ├── spring-boot-starter-json     (Jackson + các module thường dùng)\n' +
    '        ├── spring-boot-starter-tomcat   (Tomcat embedded)\n' +
    '        ├── spring-web\n' +
    '        └── spring-webmvc\n' +
    '```\n' +
    '\n' +
    'Bạn khai một dòng, Maven kéo về cả cây. Và bạn **không ghi số phiên bản**:\n' +
    '\n' +
    '```xml\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-web</artifactId>\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    '## 3. Vì sao không cần ghi phiên bản? BOM\n' +
    '\n' +
    'Đây là chi tiết phân biệt người hiểu thật với người dùng theo thói quen.\n' +
    '\n' +
    'Phiên bản đến từ **BOM** (Bill of Materials) tên `spring-boot-dependencies`. Nó là một pom kiểu `dependencyManagement`, ghim phiên bản cho hàng trăm thư viện phổ biến — kể cả những thư viện không phải của Spring như Jackson, Hibernate, Kafka client, Lettuce.\n' +
    '\n' +
    'Bạn nhận BOM theo một trong hai cách:\n' +
    '\n' +
    '```xml\n' +
    '<!-- Cách 1: kế thừa parent -->\n' +
    '<parent>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-parent</artifactId>\n' +
    '  <version>3.2.4</version>\n' +
    '</parent>\n' +
    '\n' +
    '<!-- Cách 2: import BOM, dùng khi dự án đã có parent riêng của công ty -->\n' +
    '<dependencyManagement>\n' +
    '  <dependencies>\n' +
    '    <dependency>\n' +
    '      <groupId>org.springframework.boot</groupId>\n' +
    '      <artifactId>spring-boot-dependencies</artifactId>\n' +
    '      <version>3.2.4</version>\n' +
    '      <type>pom</type>\n' +
    '      <scope>import</scope>\n' +
    '    </dependency>\n' +
    '  </dependencies>\n' +
    '</dependencyManagement>\n' +
    '```\n' +
    '\n' +
    'Hệ quả rất đáng giá: nâng Boot từ 3.2.4 lên 3.3.0 là **một dòng**, và cả bộ thư viện đi cùng được nâng theo tổ hợp đã kiểm định.\n' +
    '\n' +
    'Muốn ghim khác đi vẫn được, chỉ cần ghi đè property:\n' +
    '\n' +
    '```xml\n' +
    '<properties>\n' +
    '  <jackson-bom.version>2.17.0</jackson-bom.version>\n' +
    '</properties>\n' +
    '```\n' +
    '\n' +
    'Nhưng lúc đó bạn tự chịu trách nhiệm về tương thích — đúng tinh thần "có ý kiến nhưng không ép buộc" của Boot.\n' +
    '\n' +
    '## 4. Starter và auto-config: hai nửa của một cơ chế\n' +
    '\n' +
    'Rất nhiều người nhầm hai thứ này là một. Chúng tách bạch:\n' +
    '\n' +
    '```\n' +
    'starter        → quyết định CÓ GÌ trên classpath\n' +
    '                        ↓\n' +
    'auto-config    → phản ứng theo thứ CÓ trên classpath\n' +
    '                        ↓\n' +
    'bean sẵn sàng dùng\n' +
    '```\n' +
    '\n' +
    'Ví dụ cụ thể: `spring-boot-starter-data-redis` kéo Lettuce về classpath. Sau đó `RedisAutoConfiguration` thấy `@ConditionalOnClass(RedisOperations.class)` thoả nên dựng `RedisConnectionFactory` và `RedisTemplate`.\n' +
    '\n' +
    'Bỏ starter đi thì auto-config im lặng bỏ qua. Chính vì vậy mới có câu nói "thêm dependency là có tính năng".\n' +
    '\n' +
    '## 5. Bộ starter hay dùng\n' +
    '\n' +
    '| Starter | Kéo về | Dùng khi |\n' +
    '| --- | --- | --- |\n' +
    '| `spring-boot-starter-web` | Spring MVC, Tomcat, Jackson, validation | REST API kiểu servlet |\n' +
    '| `spring-boot-starter-webflux` | Spring WebFlux, Netty, `WebClient` | API phi blocking, hoặc chỉ cần WebClient |\n' +
    '| `spring-boot-starter-data-jpa` | Hibernate, Spring Data JPA, HikariCP | Truy cập DB quan hệ qua JPA |\n' +
    '| `spring-boot-starter-security` | Spring Security | Xác thực, phân quyền |\n' +
    '| `spring-boot-starter-validation` | Hibernate Validator | `@Valid` khi không dùng starter-web |\n' +
    '| `spring-boot-starter-actuator` | Actuator | Health, metrics, vận hành |\n' +
    '| `spring-boot-starter-test` | JUnit 5, Mockito, AssertJ, Spring Test | Test, thường ở scope `test` |\n' +
    '\n' +
    '## 6. Đổi thành phần bên trong starter\n' +
    '\n' +
    'Starter là "có ý kiến" chứ không "độc quyền". Muốn dùng Jetty thay Tomcat chẳng hạn:\n' +
    '\n' +
    '```xml\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-web</artifactId>\n' +
    '  <exclusions>\n' +
    '    <exclusion>\n' +
    '      <groupId>org.springframework.boot</groupId>\n' +
    '      <artifactId>spring-boot-starter-tomcat</artifactId>\n' +
    '    </exclusion>\n' +
    '  </exclusions>\n' +
    '</dependency>\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-jetty</artifactId>\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    'Auto-config tự nhận ra Jetty trên classpath và cấu hình theo Jetty. Bạn không phải sửa dòng code nào.\n' +
    '\n' +
    '## 7. Tự viết starter nội bộ\n' +
    '\n' +
    'Đây là câu hỏi nâng cao hay gặp ở vị trí senior, và cũng là thứ thực sự hữu ích khi công ty có nhiều service dùng chung hạ tầng.\n' +
    '\n' +
    'Quy ước đặt tên rất quan trọng:\n' +
    '\n' +
    '```\n' +
    'spring-boot-starter-xxx    → dành riêng cho starter CHÍNH THỨC của Spring\n' +
    'xxx-spring-boot-starter    → dành cho starter của bên thứ ba (bạn dùng cái này)\n' +
    '```\n' +
    '\n' +
    'Cấu trúc thường thấy gồm hai module:\n' +
    '\n' +
    '```\n' +
    'company-audit-spring-boot-autoconfigure   (chứa @AutoConfiguration + properties)\n' +
    'company-audit-spring-boot-starter         (pom rỗng, chỉ khai dependency)\n' +
    '```\n' +
    '\n' +
    'Trong module autoconfigure:\n' +
    '\n' +
    '```java\n' +
    '@AutoConfiguration\n' +
    '@ConditionalOnClass(AuditClient.class)\n' +
    '@EnableConfigurationProperties(AuditProperties.class)\n' +
    'public class AuditAutoConfiguration {\n' +
    '\n' +
    '    @Bean\n' +
    '    @ConditionalOnMissingBean\n' +
    '    public AuditClient auditClient(AuditProperties props) {\n' +
    '        return new AuditClient(props.getEndpoint(), props.getTimeout());\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Và khai tên class đó vào file:\n' +
    '\n' +
    '```\n' +
    'src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\n' +
    '```\n' +
    '\n' +
    'Từ đó, mọi service trong công ty chỉ cần thêm một dependency là có `AuditClient` chuẩn, cấu hình được qua `application.yml`, và vẫn tự thay được nhờ `@ConditionalOnMissingBean`.\n' +
    '\n' +
    '## 8. Chốt lại\n' +
    '\n' +
    '```\n' +
    'starter = pom rỗng gom dependency theo TÍNH NĂNG\n' +
    '        +\n' +
    'BOM     = ghim phiên bản đã kiểm định tương thích\n' +
    '        ↓\n' +
    'bạn khai 1 dòng, không ghi version\n' +
    '        ↓\n' +
    'classpath có đủ thư viện\n' +
    '        ↓\n' +
    'auto-config phản ứng và dựng bean\n' +
    '```\n' +
    '\n' +
    'Câu trả lời một dòng: starter biến việc chọn thư viện từ một bài toán tương thích phiên bản thành một dòng khai báo theo tính năng, và chính nó là thứ kích hoạt auto-configuration.\n' +
    '\n' +
    'Hướng đào tiếp rất tự nhiên: khi đã có bean rồi, làm sao đưa giá trị cấu hình khác nhau vào chúng cho từng môi trường — tức là thứ tự ưu tiên các nguồn cấu hình.',
  essence:
    'Starter là một pom gần như rỗng gom dependency theo **tính năng**, còn phiên bản do BOM `spring-boot-dependencies` ghim sẵn theo tổ hợp đã kiểm định. Nó quyết định classpath có gì, và chính classpath đó mới là thứ kích hoạt auto-configuration.',
  example:
    'Cần bảo mật thì thêm `spring-boot-starter-security`; cần gọi HTTP đi ra thì `spring-boot-starter-webflux` để có `WebClient`; cần test thì `spring-boot-starter-test` là đủ cả JUnit 5, Mockito, AssertJ lẫn Spring Test. Đáng chú ý là muốn đổi Tomcat sang Jetty bạn chỉ cần `exclusion` starter-tomcat rồi thêm starter-jetty — auto-config tự nhận ra và cấu hình lại, không phải sửa dòng code nào.',
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
  id: 'java-hw6l4t',
  q: 'Thứ tự ưu tiên các nguồn cấu hình trong Spring Boot?',
  answer:
    'Đây là câu hỏi mang tính vận hành, và nó phân biệt rất rõ người từng deploy thật với người mới chỉ chạy trên máy. Ai đã từng ngồi gỡ lỗi "sao prod vẫn đọc password của dev" đều nhớ thứ tự này.\n' +
    '\n' +
    'Tôi sẽ đi từ nguyên tắc thiết kế → bảng thứ tự → relaxed binding → profile → và các bẫy thường gặp.\n' +
    '\n' +
    '## 1. Nguyên tắc đằng sau thứ tự\n' +
    '\n' +
    'Đừng học vẹt danh sách. Hãy nhớ một quy tắc, phần còn lại suy ra được:\n' +
    '\n' +
    'Nguồn nào **gần lúc chạy và gần môi trường thật** hơn thì thắng.\n' +
    '\n' +
    '```\n' +
    'xa runtime                                    gần runtime\n' +
    '────────────────────────────────────────────────────────►\n' +
    'file trong jar  <  file ngoài jar  <  biến môi trường  <  tham số dòng lệnh\n' +
    '    (yếu nhất)                                          (mạnh nhất)\n' +
    '```\n' +
    '\n' +
    'Lý do rất thực tế: file trong jar được đóng cứng lúc build, còn biến môi trường thì hạ tầng bơm vào lúc deploy. Muốn một artifact chạy được ở mọi môi trường, thứ bơm lúc deploy bắt buộc phải thắng.\n' +
    '\n' +
    '## 2. Bảng thứ tự (rút gọn phần hay dùng)\n' +
    '\n' +
    'Từ **cao xuống thấp**, nguồn trên ghi đè nguồn dưới:\n' +
    '\n' +
    '1. Tham số dòng lệnh: `java -jar app.jar --server.port=9000`\n' +
    '2. `SPRING_APPLICATION_JSON` — cả khối JSON nhét trong một biến môi trường\n' +
    '3. Biến môi trường OS và system properties (`-Dserver.port=9000`)\n' +
    '4. `application-{profile}.yml` **ngoài** jar\n' +
    '5. `application-{profile}.yml` **trong** jar\n' +
    '6. `application.yml` **ngoài** jar\n' +
    '7. `application.yml` **trong** jar\n' +
    '8. `@PropertySource` trên `@Configuration`\n' +
    '9. Default properties đặt bằng `SpringApplication.setDefaultProperties`\n' +
    '\n' +
    'Hai điều đáng chú ý ở bảng này:\n' +
    '\n' +
    'File có profile luôn thắng file không profile. Nên `application-prod.yml` ghi đè `application.yml`, và đó chính là cơ chế bạn dùng hằng ngày.\n' +
    '\n' +
    'File ngoài jar luôn thắng file trong jar. Đây là cách vá cấu hình ở prod mà không cần build lại.\n' +
    '\n' +
    '## 3. Relaxed binding: biến môi trường viết thế nào?\n' +
    '\n' +
    'Đây là chi tiết cực kỳ hay dùng trong Kubernetes và Docker, và cũng hay bị hỏi.\n' +
    '\n' +
    'Property trong YAML viết kiểu chấm và gạch ngang, còn biến môi trường thì không cho phép ký tự đó. Boot tự quy đổi:\n' +
    '\n' +
    '```\n' +
    'spring.datasource.url          →  SPRING_DATASOURCE_URL\n' +
    'app.rate-limit.per-second      →  APP_RATELIMIT_PERSECOND\n' +
    '                                  (hoặc APP_RATE_LIMIT_PER_SECOND)\n' +
    'management.endpoints.web.exposure.include\n' +
    '                               →  MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE\n' +
    '```\n' +
    '\n' +
    'Quy tắc: viết hoa toàn bộ, thay dấu chấm bằng `_`, bỏ hoặc thay dấu gạch ngang bằng `_`.\n' +
    '\n' +
    'Lưu ý một hạn chế quan trọng: relaxed binding hoạt động đầy đủ với `@ConfigurationProperties`. Với `@Value` thì nó không được hỗ trợ trọn vẹn, nên `@Value("${app.rateLimit.perSecond}")` có thể không nhận được biến môi trường như bạn tưởng.\n' +
    '\n' +
    '## 4. Profile: chọn tập cấu hình theo môi trường\n' +
    '\n' +
    '```yaml\n' +
    '# application.yml — giá trị chung, mặc định thiên về dev\n' +
    'server:\n' +
    '  port: 8080\n' +
    'spring:\n' +
    '  datasource:\n' +
    '    url: jdbc:postgresql://localhost:5432/shop\n' +
    '```\n' +
    '\n' +
    '```yaml\n' +
    '# application-prod.yml — chỉ ghi những gì KHÁC đi\n' +
    'spring:\n' +
    '  datasource:\n' +
    '    url: jdbc:postgresql://db.internal:5432/shop\n' +
    '  jpa:\n' +
    '    hibernate:\n' +
    '      ddl-auto: validate\n' +
    'logging:\n' +
    '  level:\n' +
    '    root: WARN\n' +
    '```\n' +
    '\n' +
    'Kích hoạt bằng bất kỳ cách nào trong ba cách sau:\n' +
    '\n' +
    '```bash\n' +
    'java -jar app.jar --spring.profiles.active=prod\n' +
    'export SPRING_PROFILES_ACTIVE=prod\n' +
    '# hoặc đặt spring.profiles.active trong application.yml (ít dùng cho prod)\n' +
    '```\n' +
    '\n' +
    'Điểm quan trọng cần nói rõ: `application-prod.yml` **không thay thế** `application.yml`, nó **chồng lên**. Những khoá không được khai lại vẫn giữ giá trị từ file chung.\n' +
    '\n' +
    '## 5. Multi-document YAML: gộp vào một file\n' +
    '\n' +
    'Khi cấu hình còn nhỏ, bạn có thể không tách file:\n' +
    '\n' +
    '```yaml\n' +
    'server:\n' +
    '  port: 8080\n' +
    '\n' +
    '---\n' +
    'spring:\n' +
    '  config:\n' +
    '    activate:\n' +
    '      on-profile: prod\n' +
    'server:\n' +
    '  port: 80\n' +
    'logging:\n' +
    '  level:\n' +
    '    root: WARN\n' +
    '```\n' +
    '\n' +
    'Dấu `---` ngăn các tài liệu YAML, và `spring.config.activate.on-profile` quyết định khối nào được áp dụng. Cú pháp cũ `spring.profiles` đã bị bỏ từ Boot 2.4, đây là chi tiết hay được hỏi khi nâng cấp.\n' +
    '\n' +
    '## 6. Luồng thực tế trong Kubernetes\n' +
    '\n' +
    'Ghép tất cả lại, đây là cách một hệ thống thật vận hành:\n' +
    '\n' +
    '```\n' +
    'image được build MỘT lần\n' +
    '        │  chứa application.yml (mặc định dev)\n' +
    '        ↓\n' +
    'deploy lên prod\n' +
    '        │\n' +
    '        ├── SPRING_PROFILES_ACTIVE=prod        (từ Deployment env)\n' +
    '        ├── SPRING_DATASOURCE_URL=...          (từ ConfigMap)\n' +
    '        └── SPRING_DATASOURCE_PASSWORD=...     (từ Secret)\n' +
    '        ↓\n' +
    'Boot hợp nhất theo thứ tự ưu tiên\n' +
    '        ↓\n' +
    'biến môi trường thắng file trong jar\n' +
    '        ↓\n' +
    'app chạy với cấu hình prod, KHÔNG rebuild\n' +
    '```\n' +
    '\n' +
    'Chính vì không rebuild nên artifact đã kiểm thử ở staging đúng là artifact chạy ở production. Đây là lý do sâu xa của cả cơ chế này, chứ không chỉ là chuyện tiện tay.\n' +
    '\n' +
    '## 7. Ba cái bẫy hay gặp\n' +
    '\n' +
    '**Bẫy 1 — tưởng file profile thay thế file chung.** Nó chỉ chồng lên. Nếu `application.yml` bật một tính năng nguy hiểm, `application-prod.yml` phải tắt tường minh, im lặng là vẫn bật.\n' +
    '\n' +
    '**Bẫy 2 — để mật khẩu trong file rồi tưởng biến môi trường sẽ thắng.** Đúng là nó thắng, nhưng mật khẩu vẫn nằm trong image và trong Git. Bí mật phải lấy từ Secret hoặc vault, không nằm ở file mặc định.\n' +
    '\n' +
    '**Bẫy 3 — nhầm giữa hai loại port.** `server.port` là port ứng dụng, `management.server.port` là port Actuator. Ở prod người ta hay tách chúng để không phơi endpoint quản trị ra ngoài.\n' +
    '\n' +
    '## 8. Chốt lại\n' +
    '\n' +
    '```\n' +
    'gần môi trường thật hơn = ưu tiên cao hơn\n' +
    '        ↓\n' +
    'dòng lệnh > env var > file ngoài jar > file trong jar\n' +
    '        ↓\n' +
    'profile chồng lên file chung, không thay thế\n' +
    '        ↓\n' +
    'một artifact chạy được mọi môi trường\n' +
    '```\n' +
    '\n' +
    'Muốn kiểm chứng lúc chạy, gọi `/actuator/env` sẽ thấy đúng giá trị cuối cùng cùng nguồn đã cấp nó — cách nhanh nhất để kết thúc mọi tranh cãi "sao nó lấy giá trị này".\n' +
    '\n' +
    'Từ đây dẫn thẳng tới câu hỏi kế: khi khối cấu hình lớn dần, bạn nên tiêm từng giá trị bằng `@Value` hay bind cả nhóm bằng `@ConfigurationProperties`?',
  essence:
    'Nguyên tắc gói trong một câu: nguồn nào **gần lúc chạy và gần môi trường thật** hơn thì thắng, nên dòng lệnh ghi đè biến môi trường, biến môi trường ghi đè file trong jar. Nhờ vậy một artifact duy nhất chạy được ở mọi môi trường mà không phải build lại.',
  example:
    'Image Docker được build sẵn với `application.yml` mặc định thiên về dev. Khi deploy prod, Kubernetes bơm `SPRING_PROFILES_ACTIVE=prod` từ Deployment và `SPRING_DATASOURCE_PASSWORD` từ Secret, ghi đè giá trị nằm trong jar mà không cần rebuild. Nhờ đó chính cái image đã kiểm thử ở staging là cái chạy ở production, và khi nghi ngờ thì gọi `/actuator/env` để xem giá trị cuối cùng đến từ nguồn nào.',
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
  id: 'java-snpnep',
  q: '`@ConfigurationProperties` và `@Value` — chọn cái nào?',
  answer:
    'Câu này tưởng là chuyện sở thích cá nhân, nhưng thật ra có một ranh giới kỹ thuật khá rõ. Trả lời được ranh giới đó cho thấy bạn đã từng bảo trì cấu hình của một service lớn, chứ không chỉ đọc tutorial.\n' +
    '\n' +
    'Tôi sẽ đi từ bản chất hai cơ chế → so sánh theo từng tiêu chí → validate → những gì chỉ `@Value` làm được → và tiêu chí chọn.\n' +
    '\n' +
    '## 1. Bản chất khác nhau ở đâu?\n' +
    '\n' +
    '```\n' +
    '@Value                      →  lấy MỘT ô cấu hình, đổ vào MỘT field\n' +
    '@ConfigurationProperties    →  bind CẢ MỘT KHỐI cấu hình vào MỘT object có kiểu\n' +
    '```\n' +
    '\n' +
    'Nói cách khác, `@Value` làm việc ở mức từng giá trị, còn `@ConfigurationProperties` làm việc ở mức **mô hình cấu hình**.\n' +
    '\n' +
    'Hãy nhìn cùng một nhu cầu viết theo hai cách.\n' +
    '\n' +
    'Với `@Value`:\n' +
    '\n' +
    '```java\n' +
    '@Service\n' +
    'public class MailService {\n' +
    '\n' +
    '    @Value("${app.mail.host}")\n' +
    '    private String host;\n' +
    '\n' +
    '    @Value("${app.mail.port}")\n' +
    '    private int port;\n' +
    '\n' +
    '    @Value("${app.mail.from}")\n' +
    '    private String from;\n' +
    '\n' +
    '    @Value("${app.mail.max-size}")\n' +
    '    private int maxSize;\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Với `@ConfigurationProperties`:\n' +
    '\n' +
    '```java\n' +
    '@ConfigurationProperties(prefix = "app.mail")\n' +
    'public record MailProperties(String host, int port, String from, DataSize maxSize) {}\n' +
    '```\n' +
    '\n' +
    '```java\n' +
    '@Service\n' +
    'public class MailService {\n' +
    '\n' +
    '    private final MailProperties props;\n' +
    '\n' +
    '    public MailService(MailProperties props) {\n' +
    '        this.props = props;\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Bốn field rời rạc nằm lẫn trong logic nghiệp vụ đã trở thành một object có tên, có kiểu, tiêm được qua constructor.\n' +
    '\n' +
    '## 2. So sánh theo từng tiêu chí\n' +
    '\n' +
    '| Tiêu chí | `@Value` | `@ConfigurationProperties` |\n' +
    '| --- | --- | --- |\n' +
    '| Phạm vi | Một giá trị | Cả một nhóm có prefix |\n' +
    '| Kiểu phức tạp (`List`, `Map`, nested) | Rất vụng | Hỗ trợ tự nhiên |\n' +
    '| Relaxed binding | Không đầy đủ | Đầy đủ |\n' +
    '| Validate cả nhóm | Không | `@Validated` + JSR-380 |\n' +
    '| Gợi ý trong IDE | Không | Có, qua annotation processor |\n' +
    '| SpEL | Có | Không |\n' +
    '| Test bằng cách tạo object thường | Khó | Dễ, chỉ là POJO |\n' +
    '| Nơi thấy được toàn bộ cấu hình | Rải rác khắp code | Tập trung một class |\n' +
    '\n' +
    '## 3. Kiểu dữ liệu: khác biệt lớn nhất trong thực tế\n' +
    '\n' +
    '`@ConfigurationProperties` bind được những thứ mà `@Value` xử lý rất khổ sở:\n' +
    '\n' +
    '```yaml\n' +
    'app:\n' +
    '  mail:\n' +
    '    host: smtp.company.vn\n' +
    '    port: 587\n' +
    '    max-size: 10MB          # -> DataSize\n' +
    '    timeout: 30s            # -> Duration\n' +
    '    recipients:             # -> List<String>\n' +
    '      - ops@company.vn\n' +
    '      - dev@company.vn\n' +
    '    headers:                # -> Map<String,String>\n' +
    '      X-Source: shop-api\n' +
    '    retry:                  # -> object lồng nhau\n' +
    '      max-attempts: 3\n' +
    '      backoff: 2s\n' +
    '```\n' +
    '\n' +
    '```java\n' +
    '@ConfigurationProperties(prefix = "app.mail")\n' +
    'public record MailProperties(\n' +
    '        String host,\n' +
    '        int port,\n' +
    '        DataSize maxSize,\n' +
    '        Duration timeout,\n' +
    '        List<String> recipients,\n' +
    '        Map<String, String> headers,\n' +
    '        Retry retry) {\n' +
    '\n' +
    '    public record Retry(int maxAttempts, Duration backoff) {}\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Chú ý `DataSize` và `Duration`: Boot tự chuyển `10MB` thành số byte, `30s` thành `Duration`. Với `@Value` bạn sẽ phải tự parse chuỗi, và đó là chỗ sinh bug.\n' +
    '\n' +
    'Cũng chú ý **relaxed binding** ở đây: `max-size` trong YAML bind thẳng vào `maxSize` trong Java. Bạn có thể viết `max-size`, `maxSize`, `max_size` hay `MAX_SIZE` đều được.\n' +
    '\n' +
    '## 4. Validate: biến lỗi runtime thành lỗi khởi động\n' +
    '\n' +
    'Đây là lợi ích tôi đánh giá cao nhất, và cũng là câu trả lời ăn điểm.\n' +
    '\n' +
    '```java\n' +
    '@Validated\n' +
    '@ConfigurationProperties(prefix = "app.rate-limit")\n' +
    'public record RateLimitProperties(\n' +
    '        @Min(1) @Max(10_000) int perSecond,\n' +
    '        @NotNull Duration window,\n' +
    '        @NotBlank String strategy) {}\n' +
    '```\n' +
    '\n' +
    'Nếu ai đó deploy với `per-second: 0`, ứng dụng **không khởi động được**, và log chỉ thẳng vào property sai:\n' +
    '\n' +
    '```\n' +
    'Binding to target ... failed:\n' +
    '    Property: app.rate-limit.per-second\n' +
    '    Value: "0"\n' +
    '    Reason: must be greater than or equal to 1\n' +
    '```\n' +
    '\n' +
    'Hãy so sánh với kịch bản dùng `@Value`: app khởi động bình thường, chạy ngon lành, rồi hai tiếng sau mới có người phát hiện rate limit không chặn ai cả. Chuyển một lỗi runtime âm thầm thành một lỗi khởi động ồn ào là đánh đổi cực kỳ có lợi.\n' +
    '\n' +
    '## 5. Đăng ký bean thế nào?\n' +
    '\n' +
    'Có ba cách, nên biết cả ba:\n' +
    '\n' +
    '```java\n' +
    '// Cách 1: quét tự động (khuyên dùng), đặt trên class chính\n' +
    '@SpringBootApplication\n' +
    '@ConfigurationPropertiesScan\n' +
    'public class ShopApplication { }\n' +
    '\n' +
    '// Cách 2: khai tường minh\n' +
    '@EnableConfigurationProperties(MailProperties.class)\n' +
    '\n' +
    '// Cách 3: coi nó như bean thường\n' +
    '@Component\n' +
    '@ConfigurationProperties(prefix = "app.mail")\n' +
    'public class MailProperties { ... }\n' +
    '```\n' +
    '\n' +
    'Với `record` hoặc class chỉ có constructor, Boot dùng **constructor binding** nên object trở thành bất biến — rất hợp với cấu hình, vì cấu hình không nên đổi lúc chạy.\n' +
    '\n' +
    '## 6. Vậy khi nào `@Value` vẫn đúng?\n' +
    '\n' +
    'Đừng trả lời cực đoan kiểu "luôn dùng `@ConfigurationProperties`". `@Value` vẫn có chỗ:\n' +
    '\n' +
    '- Chỉ cần một hai giá trị lẻ, không thuộc nhóm nào: `@Value("${spring.application.name}")`.\n' +
    '- Cần **SpEL**, thứ `@ConfigurationProperties` không có:\n' +
    '\n' +
    '```java\n' +
    '@Value("#{systemProperties[\'user.region\'] ?: \'VN\'}")\n' +
    'private String region;\n' +
    '\n' +
    '@Value("${app.workers:#{T(java.lang.Runtime).getRuntime().availableProcessors()}}")\n' +
    'private int workers;\n' +
    '```\n' +
    '\n' +
    '- Cần giá trị mặc định inline nhanh: `@Value("${app.timeout:5000}")`.\n' +
    '\n' +
    '## 7. Tiêu chí chọn\n' +
    '\n' +
    '```\n' +
    'cấu hình của bạn có bao nhiêu khoá?\n' +
    '        │\n' +
    '        ├── 1–2 khoá rời, không liên quan nhau  → @Value\n' +
    '        │\n' +
    '        └── một nhóm có ý nghĩa chung\n' +
    '                    ↓\n' +
    '            cần List/Map/nested/Duration?   → @ConfigurationProperties\n' +
    '            cần validate?                    → @ConfigurationProperties\n' +
    '            cần test dễ?                     → @ConfigurationProperties\n' +
    '```\n' +
    '\n' +
    'Một cách nhìn khác cũng rất hữu ích: nếu bạn thấy mình viết `@Value` ba lần trở lên với cùng một prefix, đó là tín hiệu nhóm cấu hình đó xứng đáng có một class riêng.\n' +
    '\n' +
    '## 8. Chốt lại\n' +
    '\n' +
    '`@Value` là "lấy một ô cấu hình". `@ConfigurationProperties` là "khai báo mô hình cấu hình có kiểu, có validate, có tài liệu".\n' +
    '\n' +
    'Với dự án thật, tôi mặc định chọn `@ConfigurationProperties` cho mọi cấu hình thuộc về ứng dụng, và chỉ để `@Value` cho vài giá trị lẻ hoặc khi cần SpEL.\n' +
    '\n' +
    'Từ đây có một hướng đào tiếp thú vị: cấu hình đã gọn rồi, nhưng ứng dụng đóng gói và tự chạy như thế nào mà không cần Tomcat cài ngoài — tức là cơ chế embedded server và executable jar.',
  essence:
    '`@Value` làm việc ở mức **một ô cấu hình**, còn `@ConfigurationProperties` làm việc ở mức **mô hình cấu hình có kiểu**: bind cả nhóm, hỗ trợ `List`/`Map`/nested/`Duration`, relaxed binding đầy đủ và validate được. Giá trị lớn nhất là nó biến một lỗi cấu hình âm thầm lúc chạy thành lỗi ồn ào ngay lúc khởi động.',
  example:
    'Khai `@Validated @ConfigurationProperties("app.rate-limit") record RateLimitProps(@Min(1) int perSecond, Duration window) {}` rồi ai đó deploy nhầm `per-second: 0` thì ứng dụng không khởi động được, log chỉ thẳng vào property sai. Nếu dùng `@Value`, app vẫn chạy ngon lành và phải vài tiếng sau mới có người nhận ra rate limit không chặn ai — đúng loại sự cố khó truy nhất.',
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
  id: 'java-46xy0a',
  q: 'Embedded server và executable jar hoạt động ra sao?',
  answer:
    'Đây là câu mà rất nhiều người dùng Boot hằng ngày vẫn không trả lời được, vì `java -jar app.jar` chạy quá êm nên chẳng ai hỏi bên trong nó có gì. Nhưng hiểu chỗ này bạn sẽ giải thích được cả chuyện vì sao Boot hợp với Docker, và vì sao có lúc `ClassNotFoundException` xuất hiện rất lạ.\n' +
    '\n' +
    'Tôi sẽ đi từ cách cũ → đảo ngược quan hệ với server → cấu trúc thật của fat jar → cơ chế class loader → rồi tới Docker layer.\n' +
    '\n' +
    '## 1. Cách cũ: ứng dụng sống nhờ server\n' +
    '\n' +
    'Trước Boot, quan hệ là thế này:\n' +
    '\n' +
    '```\n' +
    'Tomcat (cài sẵn trên máy chủ)\n' +
    '   │\n' +
    '   ├── webapps/shop.war      ← app của bạn\n' +
    '   ├── webapps/report.war    ← app của người khác\n' +
    '   └── webapps/admin.war\n' +
    '```\n' +
    '\n' +
    'Server là **hạ tầng có sẵn**, ứng dụng chỉ là một file WAR được thả vào. Điều đó kéo theo hàng loạt phiền toái: máy dev chạy Tomcat 9, prod chạy Tomcat 8.5; sửa cấu hình `server.xml` trên prod thì dev không có; ba app dùng chung một JVM nên một app rò bộ nhớ là cả ba chết.\n' +
    '\n' +
    '## 2. Cách của Boot: đảo ngược quan hệ\n' +
    '\n' +
    'Boot lật ngược hoàn toàn:\n' +
    '\n' +
    '```\n' +
    'Cách cũ:   WAR   →  triển khai VÀO  →  Tomcat cài sẵn\n' +
    'Cách mới:  Tomcat →  nằm BÊN TRONG  →  app.jar\n' +
    '```\n' +
    '\n' +
    'Tomcat trở thành một **dependency bình thường**, đúng như Jackson hay Hibernate:\n' +
    '\n' +
    '```xml\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-web</artifactId>\n' +
    '  <!-- kéo theo spring-boot-starter-tomcat -->\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    'Đây không phải mẹo đóng gói. Đó là một thay đổi về quyền sở hữu: phiên bản server, cấu hình thread pool, cổng lắng nghe — tất cả giờ nằm trong repo của bạn, đi cùng code, được review cùng code.\n' +
    '\n' +
    '## 3. Lúc khởi động chuyện gì xảy ra?\n' +
    '\n' +
    '```\n' +
    'SpringApplication.run()\n' +
    '        ↓\n' +
    'tạo ApplicationContext (loại ServletWebServerApplicationContext)\n' +
    '        ↓\n' +
    'tìm bean ServletWebServerFactory\n' +
    '        │   TomcatServletWebServerFactory   (nếu có Tomcat trên classpath)\n' +
    '        │   JettyServletWebServerFactory    (nếu có Jetty)\n' +
    '        │   UndertowServletWebServerFactory (nếu có Undertow)\n' +
    '        ↓\n' +
    'factory.getWebServer(...)  → tạo instance Tomcat trong tiến trình\n' +
    '        ↓\n' +
    'đăng ký DispatcherServlet + các Filter\n' +
    '        ↓\n' +
    'mở cổng 8080, bắt đầu nhận request\n' +
    '```\n' +
    '\n' +
    'Chú ý: **không có tiến trình Tomcat riêng**. Nó là các object Java chạy trong chính JVM của bạn. Vì vậy đổi web server chỉ là đổi dependency, không đổi một dòng code nào:\n' +
    '\n' +
    '```xml\n' +
    '<exclusion> spring-boot-starter-tomcat </exclusion>\n' +
    '<dependency> spring-boot-starter-jetty </dependency>\n' +
    '```\n' +
    '\n' +
    '## 4. Fat jar: vấn đề jar-in-jar\n' +
    '\n' +
    'Đây là phần kỹ thuật thú vị nhất, và cũng hay được hỏi vặn.\n' +
    '\n' +
    'Ứng dụng của bạn phụ thuộc khoảng 50 jar. Muốn chạy bằng `java -jar app.jar`, tất cả phải nằm trong một file. Nhưng đặc tả JAR **không hỗ trợ jar lồng jar** — class loader chuẩn của Java không đọc được một jar nằm bên trong một jar khác.\n' +
    '\n' +
    'Có hai hướng giải quyết, và Boot chọn hướng thứ hai:\n' +
    '\n' +
    '**Hướng shade/uber-jar** (Maven Shade dùng): giải nén hết mọi jar rồi trộn class vào chung một cây thư mục. Nhược điểm nặng: file trùng tên bị ghi đè, chữ ký số hỏng, và các file `META-INF/services` bị chồng nhau nếu không cấu hình cẩn thận.\n' +
    '\n' +
    '**Hướng của Boot**: giữ nguyên các jar dependency, tự viết class loader biết đọc jar lồng nhau.\n' +
    '\n' +
    '## 5. Cấu trúc thật bên trong app.jar\n' +
    '\n' +
    'Giải nén một fat jar ra bạn sẽ thấy:\n' +
    '\n' +
    '```\n' +
    'app.jar\n' +
    '├── META-INF/\n' +
    '│   └── MANIFEST.MF\n' +
    '│         Main-Class: org.springframework.boot.loader.launch.JarLauncher\n' +
    '│         Start-Class: com.shop.ShopApplication      ← main THẬT của bạn\n' +
    '│\n' +
    '├── org/springframework/boot/loader/...   ← code launcher của Boot\n' +
    '│\n' +
    '└── BOOT-INF/\n' +
    '    ├── classes/          ← class + resource CỦA BẠN\n' +
    '    │   ├── com/shop/ShopApplication.class\n' +
    '    │   └── application.yml\n' +
    '    ├── lib/              ← dependency, giữ nguyên dạng jar\n' +
    '    │   ├── spring-web-6.1.4.jar\n' +
    '    │   ├── tomcat-embed-core-10.1.19.jar\n' +
    '    │   └── ... (khoảng 50 file)\n' +
    '    └── classpath.idx\n' +
    '```\n' +
    '\n' +
    'Điểm mấu chốt nằm ở `MANIFEST.MF`: `Main-Class` **không phải** class của bạn, mà là `JarLauncher` của Boot. Class của bạn được ghi ở khoá riêng `Start-Class`.\n' +
    '\n' +
    '## 6. Luồng chạy khi gõ java -jar\n' +
    '\n' +
    '```\n' +
    'java -jar app.jar\n' +
    '        ↓\n' +
    'JVM đọc MANIFEST → chạy JarLauncher.main()\n' +
    '        ↓\n' +
    'JarLauncher tạo LaunchedClassLoader\n' +
    '        │   (class loader tự viết, biết đọc jar nằm trong jar)\n' +
    '        ↓\n' +
    'nạp mọi jar trong BOOT-INF/lib vào classpath\n' +
    '        ↓\n' +
    'đọc Start-Class từ manifest\n' +
    '        ↓\n' +
    'gọi com.shop.ShopApplication.main(args)\n' +
    '        ↓\n' +
    'SpringApplication.run() → Tomcat embedded khởi động\n' +
    '```\n' +
    '\n' +
    'Hệ quả thực tế đáng nhớ: đây là lý do một vài thư viện quét classpath theo cách "thủ công" đôi khi trục trặc trong fat jar — chúng giả định classpath phẳng, trong khi ở đây nó là jar lồng jar do class loader riêng của Boot phục vụ.\n' +
    '\n' +
    'Cũng vì thế, `spring-boot-maven-plugin` là bắt buộc để repackage:\n' +
    '\n' +
    '```xml\n' +
    '<build>\n' +
    '  <plugins>\n' +
    '    <plugin>\n' +
    '      <groupId>org.springframework.boot</groupId>\n' +
    '      <artifactId>spring-boot-maven-plugin</artifactId>\n' +
    '    </plugin>\n' +
    '  </plugins>\n' +
    '</build>\n' +
    '```\n' +
    '\n' +
    'Không có plugin này, `mvn package` chỉ ra một jar thường chứa mỗi class của bạn, chạy lên là `ClassNotFoundException` ngay.\n' +
    '\n' +
    '## 7. Layered jar: tối ưu cache cho Docker\n' +
    '\n' +
    'Đây là phần rất đáng nói vì nó cho thấy bạn từng làm CI/CD thật.\n' +
    '\n' +
    'Vấn đề: fat jar khoảng 50MB, trong đó code của bạn chỉ chiếm vài trăm KB, còn lại là dependency. Nếu Dockerfile viết ngây thơ:\n' +
    '\n' +
    '```dockerfile\n' +
    'FROM eclipse-temurin:17-jre\n' +
    'COPY target/app.jar /app.jar\n' +
    'ENTRYPOINT ["java", "-jar", "/app.jar"]\n' +
    '```\n' +
    '\n' +
    'thì mỗi lần sửa một dòng code, cả layer 50MB bị build lại và đẩy lại registry — dù 49MB trong đó không hề đổi.\n' +
    '\n' +
    'Boot cung cấp `layertools` để tách jar theo tần suất thay đổi:\n' +
    '\n' +
    '```bash\n' +
    'java -Djarmode=layertools -jar app.jar list\n' +
    '# dependencies\n' +
    '# spring-boot-loader\n' +
    '# snapshot-dependencies\n' +
    '# application\n' +
    '```\n' +
    '\n' +
    'Dockerfile nhiều tầng tận dụng đúng thứ tự đó:\n' +
    '\n' +
    '```dockerfile\n' +
    'FROM eclipse-temurin:17-jre AS builder\n' +
    'WORKDIR /app\n' +
    'COPY target/app.jar app.jar\n' +
    'RUN java -Djarmode=layertools -jar app.jar extract\n' +
    '\n' +
    'FROM eclipse-temurin:17-jre\n' +
    'WORKDIR /app\n' +
    '# Ba layer dưới hiếm đổi -> Docker dùng lại cache\n' +
    'COPY --from=builder /app/dependencies/ ./\n' +
    'COPY --from=builder /app/spring-boot-loader/ ./\n' +
    'COPY --from=builder /app/snapshot-dependencies/ ./\n' +
    '# Layer này đổi mỗi lần build, nhưng chỉ vài trăm KB\n' +
    'COPY --from=builder /app/application/ ./\n' +
    'ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]\n' +
    '```\n' +
    '\n' +
    'Kết quả: build lần thứ hai chỉ đẩy vài trăm KB thay vì 50MB. Trên một pipeline chạy vài chục lần mỗi ngày, khác biệt này rất rõ.\n' +
    '\n' +
    '## 8. Vẫn đóng WAR được không?\n' +
    '\n' +
    'Được, và đôi khi vẫn cần vì chính sách hạ tầng của công ty. Có hai việc phải làm:\n' +
    '\n' +
    '```xml\n' +
    '<packaging>war</packaging>\n' +
    '```\n' +
    '\n' +
    '```java\n' +
    '@SpringBootApplication\n' +
    'public class ShopApplication extends SpringBootServletInitializer {\n' +
    '\n' +
    '    @Override\n' +
    '    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {\n' +
    '        return builder.sources(ShopApplication.class);\n' +
    '    }\n' +
    '\n' +
    '    public static void main(String[] args) {\n' +
    '        SpringApplication.run(ShopApplication.class, args);\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Và đánh dấu starter-tomcat là `provided` để không đóng gói Tomcat vào WAR. Nhưng hãy nói rõ trong phỏng vấn rằng đây là lựa chọn cho môi trường legacy — mặc định hiện nay là fat jar.\n' +
    '\n' +
    '## 9. Chốt lại\n' +
    '\n' +
    '```\n' +
    'server = dependency, không phải hạ tầng\n' +
    '        ↓\n' +
    'fat jar giữ nguyên các jar con trong BOOT-INF/lib\n' +
    '        ↓\n' +
    'Main-Class là JarLauncher, class của bạn nằm ở Start-Class\n' +
    '        ↓\n' +
    'LaunchedClassLoader đọc được jar-in-jar\n' +
    '        ↓\n' +
    'một artifact tự chứa, chạy y hệt trên laptop, CI và production\n' +
    '```\n' +
    '\n' +
    'Đây chính là mảnh ghép khiến Boot hợp với container: image chỉ cần một JRE, và cấu hình khác nhau giữa các môi trường được bơm từ bên ngoài.\n' +
    '\n' +
    'Hướng đào tiếp: app đã chạy trong container rồi, làm sao để hệ thống điều phối biết nó khoẻ hay không, và bạn quan sát nó bằng gì — đó là vai trò của Actuator.',
  essence:
    'Server trở thành **dependency** chứ không còn là hạ tầng cài sẵn: Tomcat chạy như các object Java trong chính JVM của bạn. Fat jar giữ nguyên các jar con trong `BOOT-INF/lib` và dùng class loader riêng để đọc jar-in-jar, nhờ đó cho ra một artifact tự chứa, chạy giống hệt nhau trên laptop, CI và production.',
  example:
    'Dockerfile chỉ cần `FROM eclipse-temurin:17-jre`, `COPY app.jar` và `ENTRYPOINT ["java","-jar","/app.jar"]`. Nhưng viết vậy thì mỗi lần sửa một dòng code, cả layer 50MB bị đẩy lại registry dù 49MB trong đó là dependency không đổi. Dùng `java -Djarmode=layertools -jar app.jar extract` để tách dependencies, loader, snapshot-dependencies và application thành các layer riêng, build lần sau chỉ còn đẩy vài trăm KB.',
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
  id: 'java-18jcj2b',
  q: 'Spring Boot Actuator cung cấp gì? Bảo mật endpoint thế nào?',
  answer:
    'Câu này kiểm tra xem bạn có từng vận hành ứng dụng ở production hay không. Người chỉ viết code thường chỉ biết `/actuator/health`. Người từng trực hệ thống sẽ nói được cả cách đóng bớt cửa lại, vì Actuator mở ra khá nhiều thứ nhạy cảm.\n' +
    '\n' +
    'Tôi sẽ đi từ vấn đề Actuator giải quyết → nhóm endpoint → cơ chế health → cách phơi ra → và ba lớp bảo vệ.\n' +
    '\n' +
    '## 1. Vấn đề: ứng dụng là một hộp đen\n' +
    '\n' +
    'Ứng dụng đang chạy trong container, và bạn cần trả lời những câu rất đời thường:\n' +
    '\n' +
    'App còn sống không? Nó đã sẵn sàng nhận request chưa? Kết nối DB thế nào? Heap đang bao nhiêu? Đang chạy commit nào? Có cách nào bật log DEBUG mà không phải restart không?\n' +
    '\n' +
    'Không có Actuator, bạn phải tự viết một `HealthController`, tự đếm metric, tự phơi thông tin build. Mỗi service một kiểu, và không cái nào đủ tốt.\n' +
    '\n' +
    'Actuator là bộ **giao diện vận hành chuẩn** cho những câu hỏi đó.\n' +
    '\n' +
    '## 2. Bật lên\n' +
    '\n' +
    '```xml\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-actuator</artifactId>\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    'Chỉ vậy thôi. Nhưng ở đây có một điểm rất quan trọng về mặc định: **thêm dependency không có nghĩa là mọi endpoint được phơi ra HTTP**. Mặc định chỉ `/actuator/health` mở qua web. Đây là lựa chọn an toàn có chủ ý của Boot, và cũng là câu hỏi vặn hay gặp.\n' +
    '\n' +
    '## 3. Các nhóm endpoint\n' +
    '\n' +
    '| Endpoint | Cho biết | Ai dùng |\n' +
    '| --- | --- | --- |\n' +
    '| `/actuator/health` | Trạng thái app và từng thành phần | Kubernetes, load balancer |\n' +
    '| `/actuator/health/liveness` | Tiến trình còn sống không | Liveness probe |\n' +
    '| `/actuator/health/readiness` | Đã sẵn sàng nhận traffic chưa | Readiness probe |\n' +
    '| `/actuator/info` | Phiên bản, commit, thời điểm build | Con người, trang trạng thái |\n' +
    '| `/actuator/metrics` | Metric dạng JSON, tra từng chỉ số | Debug thủ công |\n' +
    '| `/actuator/prometheus` | Toàn bộ metric dạng Prometheus | Prometheus scrape |\n' +
    '| `/actuator/loggers` | Xem và **đổi log level lúc chạy** | Điều tra sự cố |\n' +
    '| `/actuator/env` | Toàn bộ property và nguồn của chúng | Gỡ lỗi cấu hình |\n' +
    '| `/actuator/threaddump` | Trạng thái mọi thread | Điều tra treo, deadlock |\n' +
    '| `/actuator/heapdump` | Tải file heap dump | Điều tra rò bộ nhớ |\n' +
    '| `/actuator/mappings` | Bảng route đã đăng ký | Kiểm tra endpoint |\n' +
    '| `/actuator/conditions` | Báo cáo auto-config khớp hay không | Gỡ lỗi auto-config |\n' +
    '\n' +
    'Ba endpoint đáng chú ý nhất trong thực chiến:\n' +
    '\n' +
    '`/actuator/loggers` cho phép bật DEBUG cho đúng một package, ngay trên pod đang lỗi, mà không restart — nghĩa là không mất trạng thái đang lỗi:\n' +
    '\n' +
    '```bash\n' +
    'curl -X POST http://pod:8081/actuator/loggers/com.shop.payment \\\n' +
    '  -H \'Content-Type: application/json\' \\\n' +
    '  -d \'{"configuredLevel":"DEBUG"}\'\n' +
    '```\n' +
    '\n' +
    '`/actuator/env` chấm dứt mọi tranh cãi kiểu "cấu hình đã vào chưa", vì nó chỉ rõ giá trị cuối cùng đến từ nguồn nào.\n' +
    '\n' +
    '`/actuator/heapdump` cực kỳ nhạy cảm: file tải về chứa **toàn bộ nội dung heap**, tức là có thể gồm cả mật khẩu, token và dữ liệu khách hàng đang nằm trong bộ nhớ.\n' +
    '\n' +
    '## 4. Health hoạt động thế nào?\n' +
    '\n' +
    'Health không phải một cờ bật/tắt. Nó là tổng hợp từ nhiều `HealthIndicator`, mỗi cái phụ trách một thành phần:\n' +
    '\n' +
    '```\n' +
    'HealthEndpoint\n' +
    '    ├── DataSourceHealthIndicator   (chạy một truy vấn kiểm tra)\n' +
    '    ├── DiskSpaceHealthIndicator    (còn đủ chỗ trống không)\n' +
    '    ├── RedisHealthIndicator        (PING)\n' +
    '    ├── KafkaHealthIndicator\n' +
    '    └── HealthIndicator của bạn\n' +
    '            ↓\n' +
    '    trạng thái xấu nhất trở thành trạng thái chung\n' +
    '```\n' +
    '\n' +
    'Bật xem chi tiết:\n' +
    '\n' +
    '```yaml\n' +
    'management:\n' +
    '  endpoint:\n' +
    '    health:\n' +
    '      show-details: when-authorized   # never | when-authorized | always\n' +
    '```\n' +
    '\n' +
    'Tự viết một indicator cho phụ thuộc nghiệp vụ:\n' +
    '\n' +
    '```java\n' +
    '@Component\n' +
    'public class PaymentGatewayHealthIndicator implements HealthIndicator {\n' +
    '\n' +
    '    private final PaymentGateway gateway;\n' +
    '\n' +
    '    @Override\n' +
    '    public Health health() {\n' +
    '        try {\n' +
    '            gateway.ping();\n' +
    '            return Health.up().withDetail("gateway", "reachable").build();\n' +
    '        } catch (Exception e) {\n' +
    '            // Cân nhắc kỹ: đưa vào health nghĩa là cổng thanh toán sập\n' +
    '            // sẽ khiến pod của bạn bị rút khỏi load balancer\n' +
    '            return Health.down(e).build();\n' +
    '        }\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Dòng comment ở trên là một cái bẫy thật. Đưa mọi phụ thuộc bên ngoài vào health nghe có vẻ kỹ càng, nhưng nó biến sự cố của người khác thành sự cố của bạn.\n' +
    '\n' +
    '## 5. Phơi endpoint ra ngoài\n' +
    '\n' +
    '```yaml\n' +
    'management:\n' +
    '  endpoints:\n' +
    '    web:\n' +
    '      exposure:\n' +
    '        include: health,info,prometheus     # chỉ liệt kê thứ thực sự cần\n' +
    '        # KHÔNG dùng include: "*" ở production\n' +
    '      base-path: /actuator\n' +
    '  endpoint:\n' +
    '    health:\n' +
    '      probes:\n' +
    '        enabled: true    # bật /health/liveness và /health/readiness\n' +
    '  info:\n' +
    '    env:\n' +
    '      enabled: true\n' +
    '```\n' +
    '\n' +
    'Nguyên tắc: **liệt kê trắng danh sách**, không dùng dấu sao. Mỗi endpoint mở thêm là một bề mặt tấn công.\n' +
    '\n' +
    '## 6. Ba lớp bảo vệ\n' +
    '\n' +
    '**Lớp 1 — tách cổng.** Đây là biện pháp đơn giản và hiệu quả nhất:\n' +
    '\n' +
    '```yaml\n' +
    'management:\n' +
    '  server:\n' +
    '    port: 8081          # cổng quản trị, khác 8080 của ứng dụng\n' +
    '    address: 127.0.0.1  # chỉ nghe trên loopback nếu phù hợp\n' +
    '```\n' +
    '\n' +
    'Trong Kubernetes, Service chỉ phơi cổng 8080 ra ngoài, còn 8081 chỉ nội bộ cụm truy cập được. Vậy là Actuator không bao giờ ra tới internet, dù bạn có cấu hình nhầm gì đi nữa.\n' +
    '\n' +
    '**Lớp 2 — xác thực bằng Spring Security:**\n' +
    '\n' +
    '```java\n' +
    '@Bean\n' +
    'SecurityFilterChain actuatorChain(HttpSecurity http) throws Exception {\n' +
    '    return http\n' +
    '        .securityMatcher(EndpointRequest.toAnyEndpoint())\n' +
    '        .authorizeHttpRequests(reg -> reg\n' +
    '            .requestMatchers(EndpointRequest.to("health", "info")).permitAll()\n' +
    '            .anyRequest().hasRole("ACTUATOR_ADMIN"))\n' +
    '        .httpBasic(Customizer.withDefaults())\n' +
    '        .build();\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '`EndpointRequest` là lớp tiện ích của Boot, dùng nó thay cho việc so khớp chuỗi `/actuator/**` thủ công, vì nó tự bám theo `base-path` bạn cấu hình.\n' +
    '\n' +
    '**Lớp 3 — mạng.** Network policy hoặc security group chặn cổng quản trị từ bên ngoài. Đây là lớp cuối cùng, phòng khi hai lớp trên bị cấu hình sai.\n' +
    '\n' +
    '## 7. Bẫy hay gặp\n' +
    '\n' +
    'Phơi `env` hoặc `configprops` ra ngoài mà quên rằng chúng in cả giá trị cấu hình. Boot có che bớt các khoá trông giống bí mật, nhưng đừng dựa hoàn toàn vào đó.\n' +
    '\n' +
    'Cho health phụ thuộc vào dịch vụ bên thứ ba, khiến hệ điều phối rút pod của bạn khi chính dịch vụ kia gặp sự cố.\n' +
    '\n' +
    'Để Prometheus scrape qua cổng ứng dụng, làm metric quản trị lẫn vào traffic người dùng và bị tính vào cùng bộ đếm.\n' +
    '\n' +
    '## 8. Chốt lại\n' +
    '\n' +
    '```\n' +
    'starter-actuator\n' +
    '        ↓\n' +
    'mặc định chỉ health được phơi ra web\n' +
    '        ↓\n' +
    'liệt kê trắng đúng thứ cần: health, info, prometheus\n' +
    '        ↓\n' +
    'tách sang cổng quản trị riêng\n' +
    '        ↓\n' +
    'Spring Security cho các endpoint nhạy cảm\n' +
    '        ↓\n' +
    'network policy chặn từ ngoài\n' +
    '```\n' +
    '\n' +
    'Một câu chốt: Actuator biến ứng dụng thành thứ quan sát được, đổi lại bạn phải chủ động quyết định ai được nhìn thấy gì.\n' +
    '\n' +
    'Từ đây dẫn thẳng sang một cặp endpoint mà mọi hệ thống chạy Kubernetes đều phải hiểu cho đúng: liveness và readiness.',
  essence:
    'Actuator biến ứng dụng thành thứ **quan sát được**: health cho hệ điều phối, metrics cho hệ giám sát, `loggers` và `env` cho lúc điều tra sự cố ngay trên production. Đổi lại nó phơi ra thông tin nhạy cảm, nên mặc định chỉ `health` mở qua web và bạn phải chủ động liệt kê trắng phần còn lại.',
  example:
    'Kubernetes dùng `/actuator/health/liveness` và `/actuator/health/readiness` cho hai probe, Prometheus scrape `/actuator/prometheus`. Giá trị lớn nhất lúc trực sự cố là `/actuator/loggers`: bạn POST một dòng để bật DEBUG cho đúng package `com.shop.payment` trên chính pod đang lỗi, không cần restart nên không mất trạng thái đang lỗi. Ngược lại `env` và `heapdump` phải nằm sau cổng quản trị riêng hoặc sau xác thực, vì heap dump chứa cả token và dữ liệu khách hàng đang nằm trong bộ nhớ.',
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
  id: 'java-1h3ni5j',
  q: 'Liveness và Readiness probe khác nhau thế nào?',
  answer:
    'Đây là câu mà trả lời sai sẽ gây sự cố thật, và người phỏng vấn biết điều đó. Cấu hình nhầm hai probe này là nguyên nhân kinh điển của kiểu sự cố "database chập chờn 30 giây, nhưng cả cụm sập nửa tiếng".\n' +
    '\n' +
    'Tôi sẽ đi từ hai câu hỏi khác nhau mà chúng trả lời → hậu quả khi fail → nguyên tắc chọn thứ đưa vào từng probe → cấu hình Boot → cấu hình Kubernetes → và kịch bản sự cố thực tế.\n' +
    '\n' +
    '## 1. Chúng trả lời hai câu hỏi khác nhau\n' +
    '\n' +
    'Đây là toàn bộ chìa khoá. Nhớ đúng hai câu này là suy ra được mọi thứ còn lại:\n' +
    '\n' +
    '```\n' +
    'Liveness   →  "Tiến trình này còn cứu được không?"\n' +
    'Readiness  →  "Ngay lúc này, có nên gửi request tới đây không?"\n' +
    '```\n' +
    '\n' +
    'Hai câu hỏi khác nhau, nên biện pháp cũng khác nhau — và mức độ nặng nhẹ chênh nhau rất xa:\n' +
    '\n' +
    '```\n' +
    'liveness FAIL   →  Kubernetes GIẾT container rồi khởi động lại\n' +
    '                   (biện pháp mạnh, mất hết trạng thái trong bộ nhớ)\n' +
    '\n' +
    'readiness FAIL  →  Kubernetes RÚT pod khỏi Service endpoints\n' +
    '                   (biện pháp nhẹ, tiến trình vẫn sống, tự quay lại được)\n' +
    '```\n' +
    '\n' +
    '## 2. Vì sao phân biệt sai lại nguy hiểm?\n' +
    '\n' +
    'Hãy xét một sự cố rất hay xảy ra: database chập chờn trong 30 giây.\n' +
    '\n' +
    'Kịch bản sai — cho liveness kiểm tra cả kết nối DB:\n' +
    '\n' +
    '```\n' +
    'DB chậm 30s\n' +
    '     ↓\n' +
    'liveness fail trên MỌI pod (vì chúng dùng chung một DB)\n' +
    '     ↓\n' +
    'Kubernetes restart toàn bộ pod cùng lúc\n' +
    '     ↓\n' +
    'pod mới khởi động, đồng loạt mở kết nối mới tới DB đang yếu\n' +
    '     ↓\n' +
    'DB càng quá tải\n' +
    '     ↓\n' +
    'liveness lại fail  →  restart tiếp  →  vòng lặp chết\n' +
    '```\n' +
    '\n' +
    'DB chỉ hắt hơi 30 giây, còn hệ thống của bạn thì gãy hẳn. Đây gọi là restart storm, và nó tự khuếch đại.\n' +
    '\n' +
    'Kịch bản đúng — DB chỉ nằm trong readiness:\n' +
    '\n' +
    '```\n' +
    'DB chậm 30s\n' +
    '     ↓\n' +
    'readiness fail  →  pod bị rút khỏi load balancer\n' +
    '     ↓\n' +
    'liveness VẪN PASS  →  không pod nào bị restart\n' +
    '     ↓\n' +
    'kết nối cũ, cache trong bộ nhớ, JIT đã warm-up: giữ nguyên hết\n' +
    '     ↓\n' +
    'DB hồi phục\n' +
    '     ↓\n' +
    'readiness pass trở lại  →  pod nhận traffic lại, chỉ trong vài giây\n' +
    '```\n' +
    '\n' +
    'Cùng một sự cố đầu vào, hai kết cục hoàn toàn khác nhau.\n' +
    '\n' +
    '## 3. Nguyên tắc chọn thứ đưa vào mỗi probe\n' +
    '\n' +
    'Từ đó rút ra một quy tắc rất gọn:\n' +
    '\n' +
    '**Liveness chỉ nên fail khi ứng dụng rơi vào trạng thái không thể tự thoát ra.** Ví dụ: deadlock toàn cục, một lỗi nội bộ khiến vòng lặp xử lý chết hẳn, trạng thái hỏng không thể phục hồi. Nói cách khác: chỉ fail khi **restart là cách duy nhất còn lại**.\n' +
    '\n' +
    '**Readiness fail khi tạm thời chưa phục vụ tốt được**, nhưng bản thân tiến trình vẫn ổn. Ví dụ: đang khởi động và nạp cache, mất kết nối DB tạm thời, connection pool cạn, hoặc đang trong quá trình tắt.\n' +
    '\n' +
    'Bảng quyết định nhanh:\n' +
    '\n' +
    '| Tình huống | Liveness | Readiness |\n' +
    '| --- | --- | --- |\n' +
    '| Đang khởi động, chưa nạp xong cache | Pass | Fail |\n' +
    '| DB mất kết nối tạm thời | Pass | Fail |\n' +
    '| Dịch vụ bên thứ ba sập | Pass | Pass hoặc Fail, tuỳ mức phụ thuộc |\n' +
    '| Connection pool cạn kiệt | Pass | Fail |\n' +
    '| Deadlock, thread pool chết hẳn | **Fail** | Fail |\n' +
    '| Đang graceful shutdown | Pass | **Fail** |\n' +
    '\n' +
    'Nhìn cột đầu sẽ thấy: liveness rất hiếm khi fail. Đó là điều bình thường và đúng.\n' +
    '\n' +
    '## 4. Spring Boot phơi chúng ra sao?\n' +
    '\n' +
    'Boot có sẵn hai probe riêng:\n' +
    '\n' +
    '```\n' +
    '/actuator/health/liveness    → chỉ gom các indicator thuộc nhóm liveness\n' +
    '/actuator/health/readiness   → chỉ gom các indicator thuộc nhóm readiness\n' +
    '```\n' +
    '\n' +
    'Điểm quan trọng nhất, và cũng là thứ hay bị hỏi: mặc định của Boot đã đúng sẵn. `livenessState` **không** bao gồm các indicator kiểm tra hạ tầng bên ngoài như DB hay Redis; những cái đó nằm ở readiness. Nghĩa là bạn chỉ làm sai khi tự tay cấu hình sai.\n' +
    '\n' +
    'Bật lên:\n' +
    '\n' +
    '```yaml\n' +
    'management:\n' +
    '  endpoint:\n' +
    '    health:\n' +
    '      probes:\n' +
    '        enabled: true      # tự bật khi Boot phát hiện đang chạy trên Kubernetes\n' +
    '      show-details: always\n' +
    '  endpoints:\n' +
    '    web:\n' +
    '      exposure:\n' +
    '        include: health,info,prometheus\n' +
    '```\n' +
    '\n' +
    'Muốn thêm indicator vào đúng nhóm:\n' +
    '\n' +
    '```yaml\n' +
    'management:\n' +
    '  health:\n' +
    '    readinessstate:\n' +
    '      enabled: true\n' +
    '  endpoint:\n' +
    '    health:\n' +
    '      group:\n' +
    '        readiness:\n' +
    '          include: readinessState,db,redis\n' +
    '        liveness:\n' +
    '          include: livenessState\n' +
    '```\n' +
    '\n' +
    'Chú ý nhóm `liveness` ở trên: nó chỉ chứa `livenessState`, không có `db`. Đó chính là điểm mấu chốt của cả câu hỏi này.\n' +
    '\n' +
    '## 5. Cấu hình phía Kubernetes\n' +
    '\n' +
    '```yaml\n' +
    'livenessProbe:\n' +
    '  httpGet:\n' +
    '    path: /actuator/health/liveness\n' +
    '    port: 8081                 # cổng quản trị riêng\n' +
    '  initialDelaySeconds: 30\n' +
    '  periodSeconds: 10\n' +
    '  failureThreshold: 3          # phải hỏng 3 lần liên tiếp mới restart\n' +
    '  timeoutSeconds: 3\n' +
    '\n' +
    'readinessProbe:\n' +
    '  httpGet:\n' +
    '    path: /actuator/health/readiness\n' +
    '    port: 8081\n' +
    '  initialDelaySeconds: 10\n' +
    '  periodSeconds: 5             # kiểm tra dày hơn: phản ứng nhanh\n' +
    '  failureThreshold: 2\n' +
    '  timeoutSeconds: 2\n' +
    '\n' +
    'startupProbe:                  # dành cho app khởi động chậm\n' +
    '  httpGet:\n' +
    '    path: /actuator/health/liveness\n' +
    '    port: 8081\n' +
    '  failureThreshold: 30\n' +
    '  periodSeconds: 5             # cho tối đa 150 giây để khởi động\n' +
    '```\n' +
    '\n' +
    'Hai chi tiết đáng nói:\n' +
    '\n' +
    'Readiness nên kiểm tra **dày hơn** liveness. Rút một pod khỏi load balancer là hành động rẻ, nên phản ứng nhanh có lợi. Còn restart là hành động đắt, nên phải thận trọng — đó là lý do `failureThreshold` của liveness lớn hơn.\n' +
    '\n' +
    '`startupProbe` giải quyết bài toán ứng dụng JVM khởi động chậm. Khi nó còn đang chạy, liveness bị tạm hoãn. Nhờ vậy bạn không phải đặt `initialDelaySeconds` thật lớn cho liveness — vốn là cách làm cũ, khiến hệ thống phản ứng chậm suốt vòng đời pod chỉ để chiều một giai đoạn khởi động.\n' +
    '\n' +
    '## 6. Tự điều khiển trạng thái trong code\n' +
    '\n' +
    'Đôi khi bạn muốn chủ động báo "chưa sẵn sàng", ví dụ khi đang nạp một cache lớn:\n' +
    '\n' +
    '```java\n' +
    '@Component\n' +
    'public class WarmupRunner implements ApplicationRunner {\n' +
    '\n' +
    '    private final ApplicationEventPublisher publisher;\n' +
    '    private final CatalogCache cache;\n' +
    '\n' +
    '    @Override\n' +
    '    public void run(ApplicationArguments args) {\n' +
    '        // Trong lúc này readiness vẫn đang FAIL -> chưa ai gửi request tới\n' +
    '        cache.loadAll();\n' +
    '\n' +
    '        AvailabilityChangeEvent.publish(publisher, this, ReadinessState.ACCEPTING_TRAFFIC);\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Ngược lại, khi phát hiện trạng thái hỏng không cứu được:\n' +
    '\n' +
    '```java\n' +
    'AvailabilityChangeEvent.publish(publisher, this, LivenessState.BROKEN);\n' +
    '```\n' +
    '\n' +
    'Hãy dùng `LivenessState.BROKEN` rất tiết kiệm — nó tương đương việc bạn tự yêu cầu bị khai tử.\n' +
    '\n' +
    '## 7. Ba cái bẫy\n' +
    '\n' +
    '**Bẫy 1 — cho DB vào liveness.** Đã phân tích ở mục 2, đây là bẫy nguy hiểm nhất.\n' +
    '\n' +
    '**Bẫy 2 — không có readiness.** Không có nó, Kubernetes coi pod sẵn sàng ngay khi container start. Traffic đổ vào lúc Spring context còn chưa dựng xong, và người dùng nhận lỗi trong suốt mỗi lần rolling update.\n' +
    '\n' +
    '**Bẫy 3 — hai probe trỏ vào cùng một đường dẫn `/actuator/health`.** Lúc đó chúng không còn là hai khái niệm nữa: bất kỳ trục trặc phụ thuộc nào cũng thành lệnh restart.\n' +
    '\n' +
    '## 8. Chốt lại\n' +
    '\n' +
    '```\n' +
    'liveness  = "còn cứu được không?"   → fail thì RESTART   → hiếm khi fail\n' +
    'readiness = "có nên gửi request?"   → fail thì RÚT ra    → fail thường xuyên là bình thường\n' +
    '                    ↓\n' +
    'phụ thuộc bên ngoài (DB, Redis, API) chỉ thuộc readiness\n' +
    '                    ↓\n' +
    'liveness chỉ fail khi restart là lối thoát duy nhất\n' +
    '```\n' +
    '\n' +
    'Một câu chốt: liveness bảo vệ hệ thống khỏi tiến trình treo vĩnh viễn, readiness bảo vệ người dùng khỏi bị định tuyến tới pod chưa sẵn sàng. Nhầm vai hai cái là biến sự cố nhỏ thành sự cố lớn.\n' +
    '\n' +
    'Có một mảnh ghép còn thiếu ở đây: readiness giúp rút pod trước khi nó chết, nhưng còn những request đang xử lý dở thì sao? Đó chính là phần việc của graceful shutdown.',
  essence:
    'Liveness trả lời "tiến trình còn cứu được không" và fail thì bị **restart** — biện pháp mạnh, nên rất hiếm khi được phép fail. Readiness trả lời "có nên gửi request tới đây không" và fail thì chỉ bị **rút khỏi load balancer** — biện pháp nhẹ, tự quay lại được. Vì vậy mọi phụ thuộc bên ngoài như DB hay Redis chỉ được nằm trong readiness.',
  example:
    'Database chập chờn 30 giây là phép thử kinh điển. Nếu liveness kiểm tra cả DB, toàn bộ pod fail cùng lúc, Kubernetes restart hàng loạt, pod mới đồng loạt mở kết nối mới tới DB đang yếu và đẩy nó quá tải sâu hơn — một vòng lặp tự khuếch đại. Cấu hình đúng thì readiness fail nên pod bị rút khỏi load balancer, liveness vẫn pass nên không ai bị restart, cache và kết nối trong bộ nhớ được giữ nguyên, và khi DB hồi phục thì pod nhận traffic lại chỉ sau vài giây.',
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
  id: 'java-fmw405',
  q: 'Graceful shutdown trong Spring Boot là gì và cấu hình thế nào?',
  answer:
    'Đây là câu hỏi mà câu trả lời hay nhất luôn nhắc tới **hai phía**: ứng dụng phải biết chờ, và hệ điều phối cũng phải biết chờ ứng dụng. Chỉ cấu hình một phía thì graceful shutdown không có tác dụng, và đó chính là chỗ người phỏng vấn muốn dò.\n' +
    '\n' +
    'Tôi sẽ đi từ chuyện gì xảy ra khi không có nó → các pha khi tắt → cấu hình Boot → phối hợp với Kubernetes → khoảng trễ ít người biết → và những tài nguyên khác cần đóng.\n' +
    '\n' +
    '## 1. Không có graceful shutdown thì sao?\n' +
    '\n' +
    'Mỗi lần deploy, Kubernetes gửi `SIGTERM` cho pod cũ. Mặc định của JVM là dừng gần như ngay lập tức.\n' +
    '\n' +
    '```\n' +
    'pod đang xử lý 12 request\n' +
    '        ↓\n' +
    'SIGTERM\n' +
    '        ↓\n' +
    'JVM thoát ngay\n' +
    '        ↓\n' +
    '12 kết nối TCP bị cắt giữa chừng\n' +
    '        ↓\n' +
    'người dùng thấy: connection reset / 502\n' +
    'transaction đang dở: rollback hoặc tệ hơn là dở dang\n' +
    '```\n' +
    '\n' +
    'Với hệ thống deploy vài lần mỗi ngày, đây là nguồn lỗi 5xx đều đặn mà biểu đồ giám sát nào cũng thấy — những cái gai nhỏ đúng vào giờ deploy.\n' +
    '\n' +
    '## 2. Graceful shutdown làm gì?\n' +
    '\n' +
    'Nó chèn một giai đoạn ở giữa:\n' +
    '\n' +
    '```\n' +
    'SIGTERM\n' +
    '   ↓\n' +
    '[1] Ngừng nhận kết nối mới          ← đóng cửa vào\n' +
    '   ↓\n' +
    '[2] Chờ request đang chạy hoàn tất  ← trong hạn cho phép\n' +
    '   ↓\n' +
    '[3] Hết hạn thì mới cắt phần còn lại\n' +
    '   ↓\n' +
    '[4] Đóng context: connection pool, executor, message listener\n' +
    '   ↓\n' +
    'JVM thoát\n' +
    '```\n' +
    '\n' +
    'Điểm cốt lõi nằm ở bước 1 và 2: ngừng **nhận vào** ngay, nhưng vẫn **làm nốt** việc đã nhận.\n' +
    '\n' +
    '## 3. Cấu hình phía Spring Boot\n' +
    '\n' +
    'Chỉ có hai dòng, nhưng phải có cả hai:\n' +
    '\n' +
    '```yaml\n' +
    'server:\n' +
    '  shutdown: graceful          # mặc định là immediate\n' +
    '\n' +
    'spring:\n' +
    '  lifecycle:\n' +
    '    timeout-per-shutdown-phase: 30s   # hạn chờ, mặc định 30s\n' +
    '```\n' +
    '\n' +
    'Dòng đầu bật cơ chế. Dòng sau quyết định chờ tối đa bao lâu trước khi cắt.\n' +
    '\n' +
    'Chọn con số này thế nào? Hãy lấy theo **thời gian xử lý ở phân vị cao nhất** của endpoint chậm nhất, cộng thêm biên an toàn. Nếu p99 của bạn là 2 giây thì 30 giây là rất rộng rãi. Nhưng nếu có endpoint xuất báo cáo chạy 20 giây, con số 30 giây mới vừa đủ.\n' +
    '\n' +
    'Đặt quá ngắn thì request vẫn bị cắt. Đặt quá dài thì mỗi lần rolling update kéo lê, và nếu pod bị kẹt thì Kubernetes phải chờ hết hạn mới `SIGKILL`.\n' +
    '\n' +
    '## 4. Phối hợp với Kubernetes\n' +
    '\n' +
    'Đây là nửa còn lại, và là chỗ hay bị bỏ sót.\n' +
    '\n' +
    '```yaml\n' +
    'spec:\n' +
    '  terminationGracePeriodSeconds: 45   # PHẢI lớn hơn timeout của app\n' +
    '  containers:\n' +
    '    - name: shop-api\n' +
    '      lifecycle:\n' +
    '        preStop:\n' +
    '          exec:\n' +
    '            command: ["sh", "-c", "sleep 5"]\n' +
    '```\n' +
    '\n' +
    'Hai điều cần nhớ:\n' +
    '\n' +
    '`terminationGracePeriodSeconds` phải **lớn hơn** `timeout-per-shutdown-phase`. Nếu app xin chờ 30 giây mà Kubernetes chỉ cho 20, thì đúng phút thứ 20 nó `SIGKILL` và mọi nỗ lực chờ đợi trở nên vô nghĩa. Quy tắc an toàn: `terminationGracePeriodSeconds = timeout của app + 10~15 giây` cho các bước dọn dẹp còn lại.\n' +
    '\n' +
    '`preStop` với một lệnh sleep ngắn trông rất kỳ quặc, nên mục sau giải thích riêng.\n' +
    '\n' +
    '## 5. Khoảng trễ mà ít người biết\n' +
    '\n' +
    'Đây là chi tiết ăn điểm, vì nó chỉ lộ ra khi bạn từng ngồi soi log lúc rolling update.\n' +
    '\n' +
    'Khi một pod bị xoá, Kubernetes làm **hai việc song song**, không theo thứ tự:\n' +
    '\n' +
    '```\n' +
    '        pod bị đánh dấu Terminating\n' +
    '                 │\n' +
    '        ┌────────┴────────┐\n' +
    '        │                 │\n' +
    '   gửi SIGTERM      cập nhật Service endpoints\n' +
    '   (tức thì)        (qua kube-proxy / ingress — mất một lúc)\n' +
    '```\n' +
    '\n' +
    'Nghĩa là có một khoảng vài trăm mili giây tới vài giây mà **app đã bắt đầu tắt nhưng load balancer vẫn còn gửi request tới**. Những request đó rơi đúng vào lúc app vừa đóng cửa vào, và chúng thất bại.\n' +
    '\n' +
    '`preStop: sleep 5` giải quyết đúng chỗ đó: nó trì hoãn `SIGTERM` thêm 5 giây, đủ để việc rút endpoint lan khắp cụm trước khi app bắt đầu tắt.\n' +
    '\n' +
    'Thứ tự lý tưởng vì vậy là:\n' +
    '\n' +
    '```\n' +
    'preStop sleep 5   →  endpoint được rút khỏi mọi node\n' +
    '        ↓\n' +
    'SIGTERM           →  app ngừng nhận, xử lý nốt việc đang chạy\n' +
    '        ↓\n' +
    'app thoát sạch    →  không request nào bị cắt\n' +
    '```\n' +
    '\n' +
    '## 6. Còn những thứ không phải HTTP thì sao?\n' +
    '\n' +
    '`server.shutdown=graceful` chỉ lo phần web server. Ứng dụng thật còn nhiều thứ khác cần đóng cho tử tế.\n' +
    '\n' +
    '**Consumer Kafka:** cần commit offset đã xử lý xong trước khi thoát, nếu không message sẽ bị xử lý lại sau khi rebalance.\n' +
    '\n' +
    '**Scheduler và executor:** nên tắt có chờ:\n' +
    '\n' +
    '```java\n' +
    '@Bean(destroyMethod = "shutdown")\n' +
    'public ThreadPoolTaskExecutor taskExecutor() {\n' +
    '    ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();\n' +
    '    ex.setWaitForTasksToCompleteOnShutdown(true);\n' +
    '    ex.setAwaitTerminationSeconds(20);\n' +
    '    return ex;\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '**Dọn dẹp riêng của bạn:** dùng vòng đời bean, đừng dùng `Runtime.addShutdownHook`:\n' +
    '\n' +
    '```java\n' +
    '@Component\n' +
    'public class JobDrainer {\n' +
    '\n' +
    '    @PreDestroy\n' +
    '    public void drain() {\n' +
    '        // Chạy trong pha đóng context, sau khi request HTTP đã xong\n' +
    '        jobQueue.drainAndPersist();\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '## 7. Kiểm chứng thật\n' +
    '\n' +
    'Đừng chỉ tin cấu hình. Cách thử rất đơn giản:\n' +
    '\n' +
    '```bash\n' +
    '# Cửa sổ 1: đẩy tải liên tục vào service\n' +
    'hey -z 60s -c 20 http://shop-api/orders\n' +
    '\n' +
    '# Cửa sổ 2: giữa chừng thì rolling update\n' +
    'kubectl rollout restart deployment/shop-api\n' +
    '```\n' +
    '\n' +
    'Nếu graceful shutdown đúng, báo cáo cuối cùng phải là **0 lỗi**. Còn thấy `connection reset` nghĩa là còn thiếu một mảnh — thường là thiếu `preStop`, hoặc `terminationGracePeriodSeconds` nhỏ hơn timeout của app.\n' +
    '\n' +
    '## 8. Chốt lại\n' +
    '\n' +
    '```\n' +
    'app:  server.shutdown=graceful\n' +
    '      + timeout-per-shutdown-phase: 30s\n' +
    '        ↓\n' +
    'k8s:  terminationGracePeriodSeconds > timeout của app\n' +
    '      + preStop sleep để bù độ trễ rút endpoint\n' +
    '        ↓\n' +
    'ngoài HTTP: Kafka commit, executor chờ, @PreDestroy\n' +
    '        ↓\n' +
    'rolling update không sinh một lỗi 5xx nào\n' +
    '```\n' +
    '\n' +
    'Một câu chốt: graceful shutdown là sự **phối hợp hai phía** — app chờ request đang chạy, còn hệ điều phối chờ app. Cấu hình lệch một phía thì coi như chưa có.\n' +
    '\n' +
    'Hướng đào tiếp tự nhiên: những hành vi vòng đời như thế này rất cần được kiểm chứng bằng test, mà test một ứng dụng Boot lại có nhiều mức khác nhau — từ `@SpringBootTest` dựng cả context tới các test slice chỉ dựng một tầng.',
  essence:
    'Graceful shutdown là sự **phối hợp hai phía**: ứng dụng ngừng nhận request mới rồi chờ request đang chạy hoàn tất, còn hệ điều phối phải cho nó đủ thời gian để làm việc đó. Cấu hình lệch một phía — chẳng hạn `terminationGracePeriodSeconds` nhỏ hơn timeout của app — thì coi như chưa bật.',
  example:
    'Trong một lần rolling update, pod cũ nhận `SIGTERM`, readiness fail nên không còn được định tuyến, rồi nó xử lý nốt 12 request đang chạy trong khoảng 5 giây và thoát sạch. Không có graceful shutdown thì đúng 12 request đó nhận connection reset. Cách kiểm chứng rẻ nhất là đẩy tải liên tục bằng `hey -z 60s -c 20` rồi `kubectl rollout restart` giữa chừng — cấu hình đúng thì con số lỗi cuối cùng phải là 0.',
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
  id: 'java-15zm418',
  q: '`@SpringBootTest` và các test slice (`@WebMvcTest`, `@DataJpaTest`) khác nhau thế nào?',
  answer:
    'Đây là câu hỏi mà câu trả lời hay hoặc dở lộ ra ngay ở một chỗ: bạn có nhắc tới **thời gian chạy test** hay không. Người chưa từng bảo trì bộ test lớn sẽ nói "cứ `@SpringBootTest` cho chắc". Người đã từng ngồi chờ CI 20 phút thì hiểu vì sao slice tồn tại.\n' +
    '\n' +
    'Tôi sẽ đi từ cái giá của việc nạp context → slice là gì → từng loại slice → cách chọn → và bẫy hay gặp.\n' +
    '\n' +
    '## 1. Cái giá thật của việc nạp context\n' +
    '\n' +
    'Một ứng dụng Boot cỡ vừa có khoảng 300–500 bean. Nạp toàn bộ context nghĩa là:\n' +
    '\n' +
    '```\n' +
    'quét component\n' +
    '        ↓\n' +
    'chạy toàn bộ auto-configuration\n' +
    '        ↓\n' +
    'dựng DataSource → mở kết nối thật\n' +
    '        ↓\n' +
    'khởi tạo Hibernate SessionFactory, quét entity\n' +
    '        ↓\n' +
    'dựng Kafka consumer, Redis client, HTTP client...\n' +
    '        ↓\n' +
    'khởi động Tomcat\n' +
    '        ↓\n' +
    '~8 giây\n' +
    '```\n' +
    '\n' +
    'Tám giây cho một lần. Nghe không nhiều. Nhưng nhân lên:\n' +
    '\n' +
    '```\n' +
    '200 test class × 8s   =  ~27 phút\n' +
    '200 test class × 0.5s =  ~1.7 phút\n' +
    '```\n' +
    '\n' +
    'Khác biệt đó quyết định việc lập trình viên có chạy test trước khi push hay không. Bộ test chạy 27 phút thì người ta sẽ tìm cách né nó.\n' +
    '\n' +
    '## 2. Slice là gì?\n' +
    '\n' +
    'Slice test nạp **đúng phần context cần cho một tầng**, và cắt bỏ phần còn lại.\n' +
    '\n' +
    '```\n' +
    '@SpringBootTest        →  ████████████████████  toàn bộ context\n' +
    '@WebMvcTest            →  ████░░░░░░░░░░░░░░░░  chỉ tầng web\n' +
    '@DataJpaTest           →  ░░░░████░░░░░░░░░░░░  chỉ tầng JPA\n' +
    '@JsonTest              →  ░░░░░░░░██░░░░░░░░░░  chỉ Jackson\n' +
    '```\n' +
    '\n' +
    'Cơ chế bên dưới cũng thú vị: mỗi slice dùng một bộ lọc riêng lên danh sách auto-configuration, chỉ giữ lại nhóm liên quan. Nghĩa là slice không phải "test giả" — nó vẫn là Spring thật, chỉ nạp ít hơn.\n' +
    '\n' +
    '## 3. `@WebMvcTest` — test tầng web\n' +
    '\n' +
    'Nạp: `@Controller`, `@RestController`, `@ControllerAdvice`, `WebMvcConfigurer`, các converter, filter, và cấu hình Spring Security nếu có.\n' +
    '\n' +
    'Không nạp: `@Service`, `@Repository`, `DataSource`, JPA.\n' +
    '\n' +
    '```java\n' +
    '@WebMvcTest(UserController.class)\n' +
    'class UserControllerTest {\n' +
    '\n' +
    '    @Autowired MockMvc mockMvc;\n' +
    '\n' +
    '    @MockBean UserService userService;   // Boot 3.4+ dùng @MockitoBean\n' +
    '\n' +
    '    @Test\n' +
    '    void tra_ve_400_khi_email_sai_dinh_dang() throws Exception {\n' +
    '        mockMvc.perform(post("/users")\n' +
    '                .contentType(APPLICATION_JSON)\n' +
    '                .content("""\n' +
    '                    {"email": "khong-phai-email", "name": "Vũ"}\n' +
    '                    """))\n' +
    '            .andExpect(status().isBadRequest())\n' +
    '            .andExpect(jsonPath("$.errors[0].field").value("email"));\n' +
    '    }\n' +
    '\n' +
    '    @Test\n' +
    '    void tra_ve_201_va_location_khi_tao_thanh_cong() throws Exception {\n' +
    '        given(userService.create(any())).willReturn(new User(7L, "vu@shop.vn"));\n' +
    '\n' +
    '        mockMvc.perform(post("/users")\n' +
    '                .contentType(APPLICATION_JSON)\n' +
    '                .content("""\n' +
    '                    {"email": "vu@shop.vn", "name": "Vũ"}\n' +
    '                    """))\n' +
    '            .andExpect(status().isCreated())\n' +
    '            .andExpect(header().string("Location", "/users/7"));\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Cái được kiểm ở đây rất rõ ràng: định tuyến, deserialize JSON, validation, mã HTTP, header, hình dạng response. Đúng những thứ thuộc trách nhiệm của tầng web, và không đụng tới database.\n' +
    '\n' +
    'Chú ý `@MockBean`: nó không chỉ tạo mock, mà còn **đưa mock đó vào context** thay cho bean thật. Từ Boot 3.4, annotation này chuyển sang `@MockitoBean` — chi tiết đáng biết nếu bạn đang nâng cấp.\n' +
    '\n' +
    '## 4. `@DataJpaTest` — test tầng dữ liệu\n' +
    '\n' +
    'Nạp: entity, repository, `EntityManager`, `DataSource`, cấu hình transaction.\n' +
    '\n' +
    'Không nạp: controller, service, tầng web.\n' +
    '\n' +
    'Ba hành vi mặc định cần nhớ:\n' +
    '\n' +
    '```\n' +
    '1. Mỗi test chạy trong một transaction\n' +
    '2. Kết thúc test thì ROLLBACK  → test không ảnh hưởng nhau\n' +
    '3. Tự thay DataSource bằng DB nhúng (H2) nếu tìm thấy trên classpath\n' +
    '```\n' +
    '\n' +
    'Hành vi thứ ba là con dao hai lưỡi. Test chạy trên H2 nhưng production chạy Postgres, nên những thứ khác biệt giữa hai hệ — kiểu dữ liệu JSON, hàm cửa sổ, cú pháp `ON CONFLICT`, hành vi khoá — sẽ không được kiểm. Cách xử lý đúng là dùng Testcontainers:\n' +
    '\n' +
    '```java\n' +
    '@DataJpaTest\n' +
    '@AutoConfigureTestDatabase(replace = NONE)   // đừng thay bằng H2\n' +
    '@Testcontainers\n' +
    'class OrderRepositoryTest {\n' +
    '\n' +
    '    @Container\n' +
    '    @ServiceConnection                        // Boot 3.1+: tự nối vào DataSource\n' +
    '    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");\n' +
    '\n' +
    '    @Autowired OrderRepository repo;\n' +
    '    @Autowired TestEntityManager em;\n' +
    '\n' +
    '    @Test\n' +
    '    void tim_don_qua_han_theo_query_tuy_bien() {\n' +
    '        em.persist(new Order("A", Status.PENDING, now().minusDays(3)));\n' +
    '        em.persist(new Order("B", Status.PENDING, now()));\n' +
    '        em.flush();\n' +
    '\n' +
    '        var result = repo.findOverdue(now().minusDays(1));\n' +
    '\n' +
    '        assertThat(result).extracting(Order::getCode).containsExactly("A");\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '`@ServiceConnection` là bổ sung rất đáng dùng từ Boot 3.1: nó tự lấy URL, user, password từ container và bơm vào cấu hình, nên bạn không phải viết `@DynamicPropertySource` thủ công nữa.\n' +
    '\n' +
    '## 5. Các slice khác\n' +
    '\n' +
    '| Slice | Nạp gì | Dùng để |\n' +
    '| --- | --- | --- |\n' +
    '| `@WebMvcTest` | Tầng web MVC | Route, validation, mã HTTP |\n' +
    '| `@WebFluxTest` | Tầng WebFlux | Như trên, cho ứng dụng reactive |\n' +
    '| `@DataJpaTest` | JPA, repository | Truy vấn, mapping entity |\n' +
    '| `@DataRedisTest` | Redis | Thao tác với Redis |\n' +
    '| `@JdbcTest` | `JdbcTemplate` | SQL viết tay |\n' +
    '| `@JsonTest` | Jackson | Serialize/deserialize, định dạng ngày |\n' +
    '| `@RestClientTest` | `RestTemplate`/`RestClient` | Client gọi ra ngoài, có `MockRestServiceServer` |\n' +
    '\n' +
    '## 6. Khi nào thì `@SpringBootTest` là đúng?\n' +
    '\n' +
    'Slice không thay thế được tất cả. `@SpringBootTest` đúng khi bạn muốn kiểm **sự ghép nối** giữa các tầng:\n' +
    '\n' +
    '```java\n' +
    '@SpringBootTest(webEnvironment = RANDOM_PORT)\n' +
    '@AutoConfigureMockMvc\n' +
    'class CheckoutFlowTest {\n' +
    '\n' +
    '    @Autowired TestRestTemplate rest;\n' +
    '\n' +
    '    @Test\n' +
    '    void dat_hang_thanh_cong_thi_tru_ton_kho_va_ghi_su_kien() {\n' +
    '        var res = rest.postForEntity("/checkout", new CheckoutRequest("SKU-1", 2), OrderView.class);\n' +
    '\n' +
    '        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);\n' +
    '        assertThat(inventory.stockOf("SKU-1")).isEqualTo(8);\n' +
    '        assertThat(outbox.findAll()).hasSize(1);\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Bốn tuỳ chọn `webEnvironment` nên phân biệt được:\n' +
    '\n' +
    '- `MOCK` (mặc định): không mở cổng thật, dùng cùng `MockMvc`.\n' +
    '- `RANDOM_PORT`: mở server thật ở cổng ngẫu nhiên — hợp cho test chạy song song.\n' +
    '- `DEFINED_PORT`: dùng đúng cổng cấu hình.\n' +
    '- `NONE`: không có tầng web.\n' +
    '\n' +
    '## 7. Mẹo quan trọng: chia sẻ context giữa các test\n' +
    '\n' +
    'Đây là chi tiết ăn điểm, vì nó cho thấy bạn hiểu Spring Test làm gì bên dưới.\n' +
    '\n' +
    'Spring **cache lại ApplicationContext** và dùng lại cho các test có cùng cấu hình. Nghĩa là 50 test class dùng chung một cấu hình chỉ tốn một lần nạp context.\n' +
    '\n' +
    'Nhưng cache đó bị phá vỡ bởi bất cứ thứ gì làm cấu hình khác đi:\n' +
    '\n' +
    '```\n' +
    '@MockBean khác nhau          → context khác → nạp lại\n' +
    '@TestPropertySource khác     → context khác → nạp lại\n' +
    '@ActiveProfiles khác         → context khác → nạp lại\n' +
    '@DirtiesContext              → huỷ cache    → nạp lại\n' +
    '```\n' +
    '\n' +
    'Vì vậy một bộ test chậm bất thường thường không phải vì có nhiều `@SpringBootTest`, mà vì có **quá nhiều biến thể cấu hình**. Cách chữa là gom về một lớp base chung:\n' +
    '\n' +
    '```java\n' +
    '@SpringBootTest(webEnvironment = RANDOM_PORT)\n' +
    '@ActiveProfiles("test")\n' +
    '@Testcontainers\n' +
    'public abstract class IntegrationTestBase {\n' +
    '\n' +
    '    @Container\n' +
    '    @ServiceConnection\n' +
    '    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");\n' +
    '    // static -> container dùng chung cho MỌI test kế thừa\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Mọi integration test extends class này, và cả bộ chỉ nạp context một lần.\n' +
    '\n' +
    '## 8. Chiến lược nên trình bày\n' +
    '\n' +
    '```\n' +
    '        ít, chậm, ghép nhiều tầng\n' +
    '              @SpringBootTest          ~5%   luồng nghiệp vụ chính\n' +
    '                    ▲\n' +
    '              slice test               ~25%  từng tầng, có Spring\n' +
    '                    ▲\n' +
    '              unit test thuần          ~70%  không Spring, mili giây\n' +
    '        nhiều, nhanh, cô lập\n' +
    '```\n' +
    '\n' +
    'Một nguyên tắc gọn để chốt: **nạp ít nhất có thể mà vẫn kiểm được đúng thứ bạn muốn kiểm**. Logic nghiệp vụ thuần thì đừng dùng Spring; test một tầng thì dùng slice; chỉ dùng `@SpringBootTest` cho vài luồng thật sự cần các tầng ghép với nhau.\n' +
    '\n' +
    '## 9. Chốt lại\n' +
    '\n' +
    '```\n' +
    '@SpringBootTest  = nạp tất cả   → chậm → dành cho luồng end-to-end\n' +
    'slice            = nạp một tầng → nhanh, cô lập lỗi rõ ràng\n' +
    '        ↓\n' +
    'context được cache theo CẤU HÌNH\n' +
    '        ↓\n' +
    'càng ít biến thể cấu hình, bộ test càng nhanh\n' +
    '```\n' +
    '\n' +
    'Hướng đào tiếp: trong test cũng như lúc khởi động thật, đôi khi bạn cần chạy một đoạn logic ngay sau khi context sẵn sàng — và đó là chỗ `CommandLineRunner` với `ApplicationRunner` xuất hiện.',
  essence:
    'Slice test nạp **đúng phần context cần cho một tầng** nên nhanh và khoanh vùng lỗi rõ, còn `@SpringBootTest` nạp tất cả nên chỉ đáng dùng khi bạn thật sự muốn kiểm sự ghép nối giữa các tầng. Điều ít người để ý là Spring cache context theo cấu hình, nên thứ làm bộ test chậm thường là quá nhiều biến thể `@MockBean`/`@TestPropertySource` chứ không phải số lượng test.',
  example:
    'Muốn kiểm validation và mã HTTP của `POST /users` thì `@WebMvcTest` cùng `MockMvc` là đủ, `UserService` chỉ cần mock. Muốn kiểm một `@Query` tự viết thì dùng `@DataJpaTest` nhưng chạy trên Testcontainers Postgres với `@AutoConfigureTestDatabase(replace = NONE)`, vì chạy trên H2 sẽ bỏ lọt đúng những khác biệt quan trọng như kiểu JSON, hàm cửa sổ hay `ON CONFLICT`. Chỉ vài luồng nghiệp vụ chính như checkout mới xứng đáng dùng `@SpringBootTest`.',
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
  id: 'java-1sxntc1',
  q: '`CommandLineRunner` và `ApplicationRunner` dùng khi nào?',
  answer:
    'Đây là câu ngắn, và chính vì ngắn nên người phỏng vấn hay hỏi tiếp: "vậy khác gì `@PostConstruct`?" và "chạy job nền có nên dùng nó không?". Hai câu hỏi vặn đó mới là phần thật.\n' +
    '\n' +
    'Tôi sẽ đi từ vị trí của runner trong vòng đời → khác biệt giữa hai loại → so sánh với các hook khác → thứ tự chạy → xử lý lỗi → và những gì KHÔNG nên nhét vào đây.\n' +
    '\n' +
    '## 1. Runner nằm ở đâu trong vòng đời?\n' +
    '\n' +
    '```\n' +
    'SpringApplication.run()\n' +
    '        ↓\n' +
    'tạo và làm đầy ApplicationContext\n' +
    '        ↓\n' +
    'khởi tạo mọi bean singleton\n' +
    '        ↓\n' +
    '@PostConstruct của từng bean          ← bean đó vừa xong, các bean khác CHƯA chắc\n' +
    '        ↓\n' +
    'refresh() hoàn tất\n' +
    '        ↓\n' +
    'web server khởi động, mở cổng\n' +
    '        ↓\n' +
    '★ CommandLineRunner / ApplicationRunner ★   ← MỌI bean đã sẵn sàng\n' +
    '        ↓\n' +
    'ApplicationReadyEvent\n' +
    '        ↓\n' +
    'app phục vụ bình thường\n' +
    '```\n' +
    '\n' +
    'Điểm mấu chốt nằm ở vị trí ngôi sao: khi runner chạy, **toàn bộ** context đã dựng xong. Bạn tiêm được bất kỳ bean nào và gọi được bất kỳ thứ gì, kể cả những bean phụ thuộc lẫn nhau phức tạp.\n' +
    '\n' +
    '## 2. Hai loại khác nhau ở đúng một chỗ\n' +
    '\n' +
    'Khác biệt duy nhất là hình dạng tham số.\n' +
    '\n' +
    '```java\n' +
    '@Component\n' +
    'public class RawRunner implements CommandLineRunner {\n' +
    '\n' +
    '    @Override\n' +
    '    public void run(String... args) {\n' +
    '        // args thô, y hệt String[] args của main()\n' +
    '        // ["--seed", "--profile=demo", "input.csv"]\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '```java\n' +
    '@Component\n' +
    'public class ParsedRunner implements ApplicationRunner {\n' +
    '\n' +
    '    @Override\n' +
    '    public void run(ApplicationArguments args) {\n' +
    '        // Đã được phân tích sẵn\n' +
    '        boolean seed = args.containsOption("seed");\n' +
    '        List<String> profiles = args.getOptionValues("profile");   // ["demo"]\n' +
    '        List<String> files = args.getNonOptionArgs();              // ["input.csv"]\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Với `java -jar app.jar --seed --profile=demo input.csv`, `ApplicationRunner` phân biệt được đâu là option (`--key=value`) và đâu là operand thường. `CommandLineRunner` thì đưa bạn mảng thô và bạn tự parse.\n' +
    '\n' +
    'Kết luận thực dụng: nếu có đọc tham số dòng lệnh, dùng `ApplicationRunner`. Nếu không đọc gì cả, hai cái tương đương và chọn cái nào cũng được.\n' +
    '\n' +
    '## 3. So với các hook khởi động khác\n' +
    '\n' +
    'Đây là phần hay bị hỏi vặn nhất, nên nắm rõ bảng này:\n' +
    '\n' +
    '| Hook | Chạy khi | Thấy được gì | Hợp cho |\n' +
    '| --- | --- | --- | --- |\n' +
    '| `@PostConstruct` | Ngay sau khi bean đó khởi tạo | Chỉ bean đó và phụ thuộc của nó | Chuẩn bị nội bộ một bean |\n' +
    '| `InitializingBean` | Như trên, cách viết cũ hơn | Như trên | Hiếm dùng trong code mới |\n' +
    '| `ApplicationRunner` | Sau khi TOÀN BỘ context sẵn sàng | Mọi bean | Việc cần nhiều bean phối hợp |\n' +
    '| `ApplicationReadyEvent` | Ngay sau các runner | Mọi bean | Như runner, hợp khi muốn tách rời |\n' +
    '| `@EventListener(ContextRefreshedEvent)` | Mỗi lần context refresh | Mọi bean | Cẩn thận: có thể chạy nhiều lần |\n' +
    '\n' +
    'Hai cái bẫy quan trọng ở bảng này:\n' +
    '\n' +
    '`@PostConstruct` chạy **quá sớm** cho những việc cần bean khác. Nếu bạn gọi một service chưa được khởi tạo xong, kết quả có thể là `NullPointerException` hoặc tệ hơn là proxy AOP chưa được áp — nghĩa là `@Transactional` trên method đó không có tác dụng.\n' +
    '\n' +
    '`ContextRefreshedEvent` có thể phát nhiều lần trong ứng dụng có context cha–con, ví dụ hệ thống cũ dùng Spring MVC với context riêng. Runner thì đảm bảo chạy đúng một lần.\n' +
    '\n' +
    '## 4. Nhiều runner và thứ tự\n' +
    '\n' +
    'Khi có nhiều runner, mặc định thứ tự không được đảm bảo. Dùng `@Order`, số nhỏ chạy trước:\n' +
    '\n' +
    '```java\n' +
    '@Component\n' +
    '@Order(1)\n' +
    'class SchemaCheckRunner implements ApplicationRunner { ... }\n' +
    '\n' +
    '@Component\n' +
    '@Order(2)\n' +
    'class CacheWarmupRunner implements ApplicationRunner { ... }\n' +
    '```\n' +
    '\n' +
    'Cả `CommandLineRunner` và `ApplicationRunner` được sắp chung trong một danh sách, nên `@Order` so sánh xuyên hai loại.\n' +
    '\n' +
    '## 5. Xử lý lỗi: đây là hành vi rất đáng nhớ\n' +
    '\n' +
    'Nếu runner ném exception, ứng dụng **dừng khởi động** và thoát với mã khác 0.\n' +
    '\n' +
    '```java\n' +
    '@Component\n' +
    'public class RequiredConnectionsRunner implements ApplicationRunner {\n' +
    '\n' +
    '    private final PaymentGateway gateway;\n' +
    '\n' +
    '    @Override\n' +
    '    public void run(ApplicationArguments args) {\n' +
    '        // Fail fast: thà chết lúc khởi động còn hơn nhận traffic rồi mới hỏng\n' +
    '        gateway.ping();\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Hành vi này rất hợp với Kubernetes: pod không bao giờ vào trạng thái Ready, rolling update tự dừng lại, và phiên bản cũ vẫn đang chạy. Bạn có một lần deploy thất bại sạch sẽ thay vì một phiên bản hỏng âm thầm nhận traffic.\n' +
    '\n' +
    'Ngược lại, nếu công việc đó **không** thiết yếu thì phải tự bắt lỗi, đừng để nó giết ứng dụng:\n' +
    '\n' +
    '```java\n' +
    '@Override\n' +
    'public void run(ApplicationArguments args) {\n' +
    '    try {\n' +
    '        cache.warmUp();\n' +
    '    } catch (Exception e) {\n' +
    '        // Cache nguội chỉ làm chậm, không đáng để chặn cả lần deploy\n' +
    '        log.warn("Không warm được cache, sẽ nạp dần theo request", e);\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '## 6. Việc gì KHÔNG nên đặt vào runner\n' +
    '\n' +
    'Đây là phần người phỏng vấn thích nghe nhất, vì nó cho thấy bạn hiểu ranh giới.\n' +
    '\n' +
    '**Đừng chạy vòng lặp vô hạn hay tác vụ nền dài.** Runner chạy trên thread khởi động chính. Một vòng `while(true)` trong đó sẽ chặn luôn quá trình khởi động, và tuỳ tình huống có thể khiến app không bao giờ phát `ApplicationReadyEvent`. Việc chạy nền thuộc về `@Scheduled`, `@Async` hoặc một `ExecutorService` riêng.\n' +
    '\n' +
    '**Đừng đặt việc tốn nhiều thời gian mà không cân nhắc probe.** Nạp một cache 60 giây trong runner nghĩa là 60 giây đó pod chưa Ready. Nếu `startupProbe` không đủ rộng, Kubernetes sẽ giết pod giữa chừng và bạn rơi vào vòng lặp restart.\n' +
    '\n' +
    '**Đừng dùng nó để chạy migration schema.** Đó là việc của Flyway hoặc Liquibase, vốn chạy sớm hơn và có khoá chống chạy song song trên nhiều instance.\n' +
    '\n' +
    '**Cẩn thận khi nhiều instance cùng chạy.** Runner chạy trên **mọi** pod. Nếu nó seed dữ liệu, mười pod sẽ seed mười lần. Cần một khoá phân tán hoặc thao tác idempotent.\n' +
    '\n' +
    '## 7. Những việc runner hợp làm\n' +
    '\n' +
    '- Seed dữ liệu mẫu cho môi trường dev, có cờ bật tắt.\n' +
    '- Warm cache hoặc warm JIT trước khi nhận traffic.\n' +
    '- Kiểm tra fail-fast các phụ thuộc bắt buộc.\n' +
    '- In ra thông tin chẩn đoán lúc khởi động: phiên bản, profile đang bật, cấu hình quan trọng.\n' +
    '- Chạy chế độ dòng lệnh: dùng chính ứng dụng như một công cụ CLI cho một tác vụ rồi thoát.\n' +
    '\n' +
    'Trường hợp cuối trông như sau:\n' +
    '\n' +
    '```java\n' +
    '@SpringBootApplication\n' +
    'public class ReportApplication implements ApplicationRunner {\n' +
    '\n' +
    '    public static void main(String[] args) {\n' +
    '        // exit() để mã thoát của runner trở thành mã thoát của tiến trình\n' +
    '        System.exit(SpringApplication.exit(\n' +
    '            SpringApplication.run(ReportApplication.class, args)));\n' +
    '    }\n' +
    '\n' +
    '    @Override\n' +
    '    public void run(ApplicationArguments args) {\n' +
    '        reportService.export(args.getOptionValues("month").get(0));\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '## 8. Chốt lại\n' +
    '\n' +
    '```\n' +
    'runner = hook chạy MỘT LẦN sau khi toàn bộ context sẵn sàng\n' +
    '        ↓\n' +
    'ApplicationRunner: tham số đã parse    ← chọn cái này nếu đọc args\n' +
    'CommandLineRunner: tham số thô\n' +
    '        ↓\n' +
    'ném exception → app dừng khởi động (fail fast, rất hợp K8s)\n' +
    '        ↓\n' +
    'KHÔNG dùng cho việc chạy nền dài, migration, hay thao tác không idempotent\n' +
    '```\n' +
    '\n' +
    'Hướng đào tiếp: runner hay được dùng để in thông tin chẩn đoán lúc khởi động, mà muốn thông tin đó hữu ích trong container thì phải hiểu Boot cấu hình logging như thế nào.',
  essence:
    'Runner là hook chạy **một lần** sau khi toàn bộ context đã sẵn sàng — khác `@PostConstruct` vốn chạy quá sớm, lúc các bean khác chưa chắc đã dựng xong. `ApplicationRunner` hơn ở chỗ tham số đã được phân tích sẵn, và nếu nó ném exception thì ứng dụng dừng khởi động luôn, đúng tinh thần fail fast.',
  example:
    'Viết `@Bean ApplicationRunner seed(UserRepo repo) { return args -> { if (args.containsOption("seed")) repo.saveAll(demoUsers()); }; }` để chỉ nạp dữ liệu mẫu khi chạy `java -jar app.jar --seed`. Nhưng nhớ rằng runner chạy trên **mọi** pod, nên mười instance sẽ seed mười lần — việc trong runner phải idempotent hoặc phải có khoá phân tán.',
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
  id: 'java-1u0438y',
  q: 'Logging trong Spring Boot: mặc định là gì, cấu hình level ra sao?',
  answer:
    'Logging là thứ ai cũng dùng nhưng ít người cấu hình đúng. Trong phỏng vấn, câu này thường rẽ nhanh sang chủ đề vận hành: log của bạn ghi đi đâu trong container, và làm sao bật DEBUG trên production mà không phải deploy lại?\n' +
    '\n' +
    'Tôi sẽ đi từ kiến trúc mặc định → cấu hình bằng property → khi nào cần file XML → log trong container → đổi level lúc chạy → và các bẫy hay gặp.\n' +
    '\n' +
    '## 1. Kiến trúc mặc định\n' +
    '\n' +
    'Boot dựng sẵn một chồng logging và bạn hầu như không phải làm gì:\n' +
    '\n' +
    '```\n' +
    'code của bạn\n' +
    '        ↓\n' +
    'SLF4J API              ← bạn CHỈ nên lập trình với tầng này\n' +
    '        ↓\n' +
    'Logback                ← hiện thực mặc định của Boot\n' +
    '        ↓\n' +
    'Console appender → stdout\n' +
    '```\n' +
    '\n' +
    'Vì sao có hai tầng? SLF4J là **giao diện**, Logback là **hiện thực**. Nhờ tách ra, thư viện bên thứ ba viết theo SLF4J vẫn chạy được dù ứng dụng của bạn chọn hiện thực nào.\n' +
    '\n' +
    'Boot còn cài sẵn các cầu nối để gom mọi framework logging cũ về chung một chỗ:\n' +
    '\n' +
    '```\n' +
    'Java Util Logging ─┐\n' +
    'Apache Commons ────┼──→ cầu nối ──→ SLF4J ──→ Logback\n' +
    'Log4j 1.x ─────────┘\n' +
    '```\n' +
    '\n' +
    'Nghĩa là một thư viện cũ vẫn dùng Log4j 1.x thì log của nó vẫn xuất hiện đúng định dạng chung, cùng file, cùng cấu hình level. Đây là chi tiết đáng nói vì nó giải thích tại sao bạn không bao giờ phải cấu hình logging cho từng thư viện.\n' +
    '\n' +
    'Trong code, chỉ dùng SLF4J:\n' +
    '\n' +
    '```java\n' +
    'private static final Logger log = LoggerFactory.getLogger(OrderService.class);\n' +
    '// hoặc @Slf4j của Lombok\n' +
    '\n' +
    'log.info("Đã tạo đơn {} cho khách {}", orderId, customerId);\n' +
    '```\n' +
    '\n' +
    'Chú ý cách dùng `{}` thay vì nối chuỗi. Nếu level INFO đang tắt, chuỗi kia **không bao giờ được dựng** — khác hẳn `log.info("... " + orderId)` vốn luôn phải nối chuỗi rồi mới biết là bị bỏ đi.\n' +
    '\n' +
    '## 2. Đổi level bằng property — bao phủ phần lớn nhu cầu\n' +
    '\n' +
    'Không cần file XML nào cả:\n' +
    '\n' +
    '```yaml\n' +
    'logging:\n' +
    '  level:\n' +
    '    root: INFO\n' +
    '    com.shop: DEBUG                    # code của bạn\n' +
    '    org.springframework.web: DEBUG     # xem request được map thế nào\n' +
    '    org.hibernate.SQL: DEBUG           # in câu SQL\n' +
    '    org.hibernate.orm.jdbc.bind: TRACE # in cả tham số bind (Hibernate 6)\n' +
    '    org.apache.kafka: WARN             # thư viện quá ồn thì hạ xuống\n' +
    '```\n' +
    '\n' +
    'Level được áp theo **cây package**, cụ thể hơn thì thắng:\n' +
    '\n' +
    '```\n' +
    'root                = INFO\n' +
    'com.shop            = DEBUG   →  com.shop.order.OrderService kế thừa DEBUG\n' +
    'com.shop.audit      = WARN    →  riêng nhánh audit bị hạ xuống WARN\n' +
    '```\n' +
    '\n' +
    'Nhóm có sẵn cũng tiện:\n' +
    '\n' +
    '```yaml\n' +
    'logging:\n' +
    '  level:\n' +
    '    web: DEBUG      # nhóm dựng sẵn cho toàn bộ tầng web\n' +
    '    sql: DEBUG      # nhóm dựng sẵn cho SQL\n' +
    '```\n' +
    '\n' +
    '## 3. Ghi ra file\n' +
    '\n' +
    '```yaml\n' +
    'logging:\n' +
    '  file:\n' +
    '    name: /var/log/shop/app.log      # hoặc logging.file.path để chỉ định thư mục\n' +
    '  logback:\n' +
    '    rollingpolicy:\n' +
    '      max-file-size: 100MB\n' +
    '      max-history: 7                  # giữ 7 ngày\n' +
    '      total-size-cap: 2GB\n' +
    '```\n' +
    '\n' +
    'Nhưng hãy nói thẳng quan điểm này trong phỏng vấn: **trong container, đừng ghi ra file.** Lý do rất cụ thể — file nằm trong lớp ghi của container nên mất khi pod bị xoá; nó làm đầy đĩa của node; và bạn phải exec vào pod mới đọc được, trong khi pod thì có thể đã biến mất.\n' +
    '\n' +
    'Chuẩn trong container là ghi ra stdout, để runtime thu thập và chuyển tiếp về hệ thống tập trung. May mắn là đó cũng chính là mặc định của Boot.\n' +
    '\n' +
    '## 4. Khi nào cần `logback-spring.xml`?\n' +
    '\n' +
    'Property đủ cho level và những thứ cơ bản. Bạn cần file XML khi muốn kiểm soát sâu hơn: appender tuỳ biến, định dạng JSON, cấu hình khác nhau theo profile, hay gửi log đi nơi khác.\n' +
    '\n' +
    'Điểm quan trọng về tên file: dùng `logback-spring.xml`, **đừng** dùng `logback.xml`. Lý do là `logback.xml` được Logback nạp rất sớm, trước khi Spring dựng `Environment`, nên bạn mất luôn khả năng dùng `<springProfile>` và `<springProperty>`.\n' +
    '\n' +
    '```xml\n' +
    '<configuration>\n' +
    '  <include resource="org/springframework/boot/logging/logback/defaults.xml"/>\n' +
    '\n' +
    '  <springProperty scope="context" name="appName" source="spring.application.name"/>\n' +
    '\n' +
    '  <!-- Máy dev: đọc bằng mắt, có màu -->\n' +
    '  <springProfile name="dev">\n' +
    '    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>\n' +
    '    <root level="INFO">\n' +
    '      <appender-ref ref="CONSOLE"/>\n' +
    '    </root>\n' +
    '  </springProfile>\n' +
    '\n' +
    '  <!-- Production: JSON một dòng cho hệ thu thập log -->\n' +
    '  <springProfile name="prod">\n' +
    '    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">\n' +
    '      <encoder class="net.logstash.logback.encoder.LogstashEncoder">\n' +
    '        <customFields>{"app":"${appName}"}</customFields>\n' +
    '      </encoder>\n' +
    '    </appender>\n' +
    '    <root level="INFO">\n' +
    '      <appender-ref ref="JSON"/>\n' +
    '    </root>\n' +
    '  </springProfile>\n' +
    '</configuration>\n' +
    '```\n' +
    '\n' +
    '## 5. Vì sao production nên log dạng JSON?\n' +
    '\n' +
    'Log nhiều dòng dễ đọc bằng mắt nhưng rất khó cho máy. Hãy so sánh.\n' +
    '\n' +
    'Dạng văn bản:\n' +
    '\n' +
    '```\n' +
    '2026-09-05 14:23:11.482  INFO 1 --- [nio-8080-exec-3] c.s.o.OrderService : Đã tạo đơn 8821 cho khách 415\n' +
    '```\n' +
    '\n' +
    'Muốn tìm tất cả đơn của khách 415, bạn phải viết biểu thức chính quy, và nó sẽ vỡ ngay khi ai đó đổi câu chữ trong log.\n' +
    '\n' +
    'Dạng JSON:\n' +
    '\n' +
    '```json\n' +
    '{"@timestamp":"2026-09-05T14:23:11.482Z","level":"INFO","logger":"c.s.o.OrderService",\n' +
    ' "message":"Đã tạo đơn 8821 cho khách 415","app":"shop-api","traceId":"a1b2c3",\n' +
    ' "orderId":8821,"customerId":415}\n' +
    '```\n' +
    '\n' +
    'Giờ truy vấn chỉ là `customerId: 415`, và nó không phụ thuộc vào câu chữ. Thêm nữa, `traceId` cho phép ghép toàn bộ log của một request đi qua nhiều service.\n' +
    '\n' +
    'Đưa dữ liệu có cấu trúc vào log bằng MDC:\n' +
    '\n' +
    '```java\n' +
    'MDC.put("orderId", String.valueOf(order.getId()));\n' +
    'try {\n' +
    '    log.info("Bắt đầu xử lý thanh toán");\n' +
    '    // mọi log trong khối này đều tự mang theo orderId\n' +
    '} finally {\n' +
    '    MDC.remove("orderId");   // BẮT BUỘC: MDC dựa trên ThreadLocal\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Dòng `finally` không phải cho đẹp. MDC lưu trên `ThreadLocal`, mà thread thì nằm trong pool và sống rất lâu — quên xoá thì request sau sẽ mang nhầm `orderId` của request trước.\n' +
    '\n' +
    '## 6. Đổi level lúc chạy — thứ đáng giá nhất khi trực sự cố\n' +
    '\n' +
    'Đây là mẹo nên nói trong phỏng vấn, vì nó chỉ đến từ kinh nghiệm thật.\n' +
    '\n' +
    'Tình huống: một endpoint đang lỗi trên production, log INFO không đủ chi tiết. Cách làm ngây thơ là sửa cấu hình rồi deploy lại — nhưng deploy lại nghĩa là **mất luôn trạng thái đang lỗi**, và có khi lỗi không tái hiện nữa.\n' +
    '\n' +
    'Actuator cho bạn bật DEBUG ngay tại chỗ:\n' +
    '\n' +
    '```bash\n' +
    '# Xem level hiện tại\n' +
    'curl http://pod:8081/actuator/loggers/com.shop.payment\n' +
    '\n' +
    '# Bật DEBUG cho đúng một package\n' +
    'curl -X POST http://pod:8081/actuator/loggers/com.shop.payment \\\n' +
    '  -H \'Content-Type: application/json\' \\\n' +
    '  -d \'{"configuredLevel":"DEBUG"}\'\n' +
    '\n' +
    '# Điều tra xong thì trả về như cũ\n' +
    'curl -X POST http://pod:8081/actuator/loggers/com.shop.payment \\\n' +
    '  -H \'Content-Type: application/json\' \\\n' +
    '  -d \'{"configuredLevel":null}\'\n' +
    '```\n' +
    '\n' +
    'Có hiệu lực tức thì, không restart, không mất trạng thái. Nhớ khoanh đúng package hẹp — bật DEBUG cho `root` trên hệ thống đang tải cao có thể sinh hàng gigabyte log trong vài phút và tự tạo ra sự cố thứ hai.\n' +
    '\n' +
    '## 7. Đổi sang Log4j2\n' +
    '\n' +
    'Nếu cần Log4j2, chẳng hạn vì hiệu năng ghi bất đồng bộ:\n' +
    '\n' +
    '```xml\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-web</artifactId>\n' +
    '  <exclusions>\n' +
    '    <exclusion>\n' +
    '      <groupId>org.springframework.boot</groupId>\n' +
    '      <artifactId>spring-boot-starter-logging</artifactId>\n' +
    '    </exclusion>\n' +
    '  </exclusions>\n' +
    '</dependency>\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-starter-log4j2</artifactId>\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    'Code không phải sửa dòng nào, vì bạn vẫn lập trình với SLF4J. Đây chính là lợi ích của việc tách giao diện khỏi hiện thực đã nói ở mục 1.\n' +
    '\n' +
    '## 8. Bốn cái bẫy\n' +
    '\n' +
    '**Ghi log dữ liệu nhạy cảm.** Mật khẩu, token, số thẻ, thông tin cá nhân. Đừng bao giờ `log.debug("request: {}", request)` với một object có thể chứa những thứ đó.\n' +
    '\n' +
    '**Nối chuỗi thay vì dùng `{}`.** Đã nói ở mục 1, và nó thực sự tốn CPU trên đường dẫn nóng.\n' +
    '\n' +
    '**Vừa log vừa ném exception.** `log.error("lỗi", e); throw e;` khiến cùng một lỗi xuất hiện hai lần ở hai nơi, làm nhiễu việc điều tra. Hãy chọn một: xử lý và log, hoặc ném lên cho tầng trên.\n' +
    '\n' +
    '**Đặt `logback.xml` thay vì `logback-spring.xml`.** Mất `<springProfile>` mà không hiểu vì sao.\n' +
    '\n' +
    '## 9. Chốt lại\n' +
    '\n' +
    '```\n' +
    'SLF4J (giao diện) → Logback (mặc định) → stdout\n' +
    '        ↓\n' +
    'level chỉnh bằng property, theo cây package\n' +
    '        ↓\n' +
    'container: JSON ra stdout + MDC mang traceId\n' +
    '        ↓\n' +
    'cần appender/định dạng riêng → logback-spring.xml (KHÔNG phải logback.xml)\n' +
    '        ↓\n' +
    'sự cố: /actuator/loggers bật DEBUG tức thì, không cần deploy\n' +
    '```\n' +
    '\n' +
    'Hướng đào tiếp: vòng lặp phát triển cũng có công cụ riêng của nó — và `spring-boot-devtools` là thứ được thiết kế để chỉ tồn tại lúc dev rồi biến mất khỏi artifact production.',
  essence:
    'Boot dựng sẵn chồng SLF4J trên Logback và gom cả các framework logging cũ về chung một chỗ qua cầu nối, nên bạn chỉnh được phần lớn nhu cầu chỉ bằng property. Trong container, nguyên tắc là ghi **JSON ra stdout** kèm `traceId` trong MDC, và khi cần điều tra thì bật DEBUG lúc chạy qua `/actuator/loggers` thay vì deploy lại.',
  example:
    'Đang có một request lỗi lạ trên production: thay vì sửa cấu hình rồi deploy lại — vốn làm mất luôn trạng thái đang lỗi — hãy gọi `curl -X POST /actuator/loggers/com.shop.payment -d \'{"configuredLevel":"DEBUG"}\'` để bật DEBUG cho đúng package đó, điều tra xong thì POST lại với `null` để trả về mặc định. Nhớ khoanh package thật hẹp, vì bật DEBUG cho `root` trên hệ thống tải cao có thể sinh hàng gigabyte log trong vài phút và tạo ra sự cố thứ hai.',
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
  id: 'java-q0iwer',
  q: '`spring-boot-devtools` làm gì? Có nên dùng ở production không?',
  answer:
    'Câu này có hai nửa, và nửa sau mới là thứ người phỏng vấn quan tâm. Nửa đầu "DevTools làm gì" thì ai cũng trả lời được. Nửa sau — "có nên dùng ở production không" — là một câu hỏi cài bẫy nhẹ, vì câu trả lời đúng không phải chỉ là "không nên", mà là "nó đã được thiết kế để tự biến mất".\n' +
    '\n' +
    'Tôi sẽ đi từ vấn đề vòng lặp phát triển → cơ chế hai class loader → các tính năng khác → vì sao nó tự tắt ở production → rủi ro nếu cố tình bật → và các lựa chọn thay thế.\n' +
    '\n' +
    '## 1. Vấn đề: vòng lặp phát triển quá chậm\n' +
    '\n' +
    'Sửa một dòng trong controller, và bạn phải:\n' +
    '\n' +
    '```\n' +
    'sửa code → dừng app → build → khởi động lại → chờ ~8 giây → thử lại\n' +
    '```\n' +
    '\n' +
    'Tám giây mỗi lần, vài chục lần một buổi. Điều tệ hơn thời gian là **đứt mạch tập trung**: đủ lâu để bạn chuyển sang cửa sổ khác, và đủ để mất ngữ cảnh đang nghĩ.\n' +
    '\n' +
    'DevTools rút vòng lặp đó xuống khoảng một giây.\n' +
    '\n' +
    '```xml\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-devtools</artifactId>\n' +
    '  <optional>true</optional>\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    '## 2. Cơ chế hai class loader — phần cốt lõi\n' +
    '\n' +
    'Đây là chi tiết kỹ thuật đáng nói nhất, vì nó giải thích luôn cả giới hạn của DevTools.\n' +
    '\n' +
    'Quan sát cơ bản: khi bạn sửa code, **chỉ code của bạn đổi**. Khoảng 50 jar thư viện thì không. Nhưng khởi động lại JVM lại nạp lại tất cả từ đầu.\n' +
    '\n' +
    'DevTools tách classpath làm hai:\n' +
    '\n' +
    '```\n' +
    '┌─────────────────────────────────────────┐\n' +
    '│  base class loader                      │\n' +
    '│  Spring, Hibernate, Jackson, Tomcat...  │  ← nạp MỘT lần, giữ nguyên\n' +
    '│  (hiếm khi đổi)                         │\n' +
    '├─────────────────────────────────────────┤\n' +
    '│  restart class loader                   │\n' +
    '│  class của BẠN trong target/classes     │  ← vứt đi và nạp lại\n' +
    '│  (đổi liên tục)                         │\n' +
    '└─────────────────────────────────────────┘\n' +
    '```\n' +
    '\n' +
    'Khi phát hiện class thay đổi:\n' +
    '\n' +
    '```\n' +
    'file .class đổi\n' +
    '        ↓\n' +
    'đóng ApplicationContext hiện tại\n' +
    '        ↓\n' +
    'VỨT restart class loader, giữ nguyên base\n' +
    '        ↓\n' +
    'tạo restart class loader mới, nạp lại class của bạn\n' +
    '        ↓\n' +
    'dựng lại context\n' +
    '        ↓\n' +
    '~1 giây thay vì ~8 giây\n' +
    '```\n' +
    '\n' +
    'Toàn bộ phần đắt đỏ — nạp và verify hàng chục nghìn class thư viện — được bỏ qua.\n' +
    '\n' +
    'Nhưng cũng vì vậy mà có giới hạn cần biết: đây là **restart**, không phải hot reload thật. Trạng thái trong bộ nhớ mất hết. Đổi chữ ký method hay cấu trúc class thì được, nhưng đổi phiên bản dependency vẫn phải khởi động lại hoàn toàn. Muốn hot reload thật sự giữ nguyên trạng thái thì phải dùng công cụ khác như JRebel.\n' +
    '\n' +
    'Một lưu ý thực tế: restart được kích hoạt khi **file `.class` trong classpath** thay đổi, nên IDE phải biên dịch thì mới có chuyện gì xảy ra. Trong IntelliJ, hãy bật build tự động hoặc nhấn tổ hợp build; nếu không bạn sẽ ngồi chờ một sự kiện không bao giờ tới.\n' +
    '\n' +
    '## 3. Các tính năng còn lại\n' +
    '\n' +
    '**LiveReload.** DevTools chạy một máy chủ LiveReload, và với tiện ích trình duyệt tương ứng, trang tự làm mới khi tài nguyên tĩnh đổi. Tiện khi làm giao diện dựa trên template.\n' +
    '\n' +
    '**Đặt lại mặc định thân thiện cho dev.** DevTools tự tắt cache của các template engine như Thymeleaf và FreeMarker. Nếu không, bạn sẽ sửa file HTML mà chẳng thấy gì thay đổi, rồi nghi ngờ chính mình.\n' +
    '\n' +
    '**Thuộc tính toàn cục.** Có thể đặt cấu hình dùng chung cho mọi dự án trên máy bạn ở `~/.config/spring-boot/spring-boot-devtools.properties`.\n' +
    '\n' +
    '**Remote debug.** DevTools hỗ trợ chế độ từ xa, nhưng phần này nên tránh — mục sau sẽ nói rõ vì sao.\n' +
    '\n' +
    '## 4. Vì sao nó tự biến mất ở production?\n' +
    '\n' +
    'Đây là điểm ăn điểm của câu hỏi.\n' +
    '\n' +
    'DevTools tự vô hiệu hoá khi phát hiện ứng dụng đang chạy từ một artifact đóng gói đầy đủ, tức là khi bạn chạy `java -jar app.jar`. Nó nhận ra mình đang không ở trong môi trường phát triển và lặng lẽ tắt.\n' +
    '\n' +
    'Ngoài ra, `spring-boot-maven-plugin` **loại nó khỏi fat jar** khi bạn khai báo đúng cách:\n' +
    '\n' +
    '```xml\n' +
    '<!-- Maven -->\n' +
    '<dependency>\n' +
    '  <groupId>org.springframework.boot</groupId>\n' +
    '  <artifactId>spring-boot-devtools</artifactId>\n' +
    '  <optional>true</optional>\n' +
    '</dependency>\n' +
    '```\n' +
    '\n' +
    '```groovy\n' +
    '// Gradle: có hẳn một cấu hình riêng cho việc này\n' +
    'developmentOnly \'org.springframework.boot:spring-boot-devtools\'\n' +
    '```\n' +
    '\n' +
    'Chữ `optional` với `developmentOnly` chính là cơ chế đó. Bỏ chúng đi thì DevTools bị đóng gói vào jar — dù nó vẫn tự tắt lúc chạy, artifact của bạn vẫn phình ra và mang theo một thư viện không cần thiết.\n' +
    '\n' +
    '## 5. Nếu cố tình bật ở production thì sao?\n' +
    '\n' +
    'Người phỏng vấn có thể hỏi thẳng "nếu bật thì hại gì". Ba rủi ro cụ thể:\n' +
    '\n' +
    '**Bề mặt tấn công.** Chế độ remote của DevTools mở một kênh cho phép nạp class từ xa. Nếu lộ ra ngoài, đó là con đường thực thi mã tuỳ ý.\n' +
    '\n' +
    '**Hành vi khó lường.** Cơ chế theo dõi file và restart tự động không có chỗ đứng trong một tiến trình đang phục vụ người dùng. Một thao tác chạm vào file có thể khiến ứng dụng tự restart giữa lúc đang xử lý.\n' +
    '\n' +
    '**Mặc định sai.** DevTools cố ý tắt cache để tiện cho dev. Đúng những cache đó lại là thứ bạn cần ở production.\n' +
    '\n' +
    'Câu trả lời gọn: không, và may là bạn không cần phải nhớ điều đó, vì cơ chế đã được thiết kế để tự bảo vệ.\n' +
    '\n' +
    '## 6. Các lựa chọn thay thế\n' +
    '\n' +
    'Đáng nhắc để cho thấy bạn theo dõi hệ sinh thái:\n' +
    '\n' +
    '**Spring Boot DevTools + IDE build tự động** là mặc định miễn phí, phù hợp hầu hết trường hợp.\n' +
    '\n' +
    '**JRebel** là công cụ thương mại làm hot reload thật, giữ nguyên trạng thái trong bộ nhớ, xử lý được cả những thay đổi mà DevTools phải restart.\n' +
    '\n' +
    '**Spring Boot Docker Compose** từ Boot 3.1: khai báo `compose.yaml` và Boot tự bật các dịch vụ phụ thuộc như Postgres, Redis khi bạn chạy dev, rồi tự nối cấu hình vào. Nó không thay DevTools mà giải quyết một nỗi đau khác của vòng lặp phát triển.\n' +
    '\n' +
    '**Testcontainers ở chế độ dev** từ Boot 3.1: chạy ứng dụng qua một `main` phụ có kèm container, nên môi trường dev giống production hơn.\n' +
    '\n' +
    '## 7. Chốt lại\n' +
    '\n' +
    '```\n' +
    'DevTools = công cụ CHỈ dành cho lúc dev\n' +
    '        ↓\n' +
    'hai class loader: base giữ nguyên, restart vứt đi và nạp lại\n' +
    '        ↓\n' +
    '~1 giây thay vì ~8 giây, nhưng là RESTART chứ không phải hot reload\n' +
    '        ↓\n' +
    'khai optional / developmentOnly → không lọt vào fat jar\n' +
    '        ↓\n' +
    'chạy java -jar → tự vô hiệu hoá\n' +
    '```\n' +
    '\n' +
    'Một câu chốt: DevTools đánh đổi một chút phức tạp về class loader để lấy lại vòng lặp phát triển nhanh, và nó được thiết kế để tự biến mất khỏi artifact production chứ không dựa vào việc bạn nhớ gỡ ra.\n' +
    '\n' +
    'Hướng đào tiếp: khi ứng dụng đã chạy được và sửa được nhanh, thứ tiếp theo cần chuẩn hoá là cách nó trả lỗi ra ngoài — tức là xử lý lỗi tập trung với `@RestControllerAdvice` và `ProblemDetail`.',
  essence:
    'DevTools là công cụ chỉ dành cho lúc phát triển: nó tách classpath thành **hai class loader** — base giữ nguyên thư viện, restart vứt đi và nạp lại code của bạn — nên rút vòng lặp từ khoảng 8 giây xuống còn 1 giây. Nhưng đó là restart chứ không phải hot reload, và nó cố ý tự vô hiệu hoá khi chạy từ `java -jar` cũng như không lọt vào fat jar nếu khai `optional`/`developmentOnly`.',
  example:
    'Sửa một `@RestController` rồi lưu, DevTools dựng lại context trong khoảng một giây thay vì khởi động nguội mất tám giây. Điều kiện là IDE phải thực sự biên dịch ra file `.class` — trong IntelliJ nếu chưa bật build tự động thì bạn sẽ ngồi chờ một sự kiện không bao giờ tới. Cũng đừng quên `<optional>true</optional>` với Maven hay `developmentOnly` với Gradle, nếu không thư viện này bị đóng gói vào fat jar dù lúc chạy nó vẫn tự tắt.',
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
  id: 'java-113zt5u',
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
  id: 'java-1xubem3',
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
  id: 'java-jpz1ht',
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
  id: 'java-atwrmy',
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
  id: 'java-90xe95',
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
  id: 'java-ucmq7u',
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
  id: 'java-7byow',
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
