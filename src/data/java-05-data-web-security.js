SS.addQuestions('java', [
{
  cat: 'Spring Data / JPA',
  q: 'Các trạng thái của một JPA entity là gì?',
  answer:
    '- **Transient (new)**: object vừa `new`, chưa liên kết với persistence context, không có id trong DB.\n' +
    '- **Managed (persistent)**: đang được persistence context theo dõi. Mọi thay đổi field sẽ tự động sync xuống DB khi flush (**dirty checking**).\n' +
    '- **Detached**: từng managed nhưng context đã đóng (hết transaction) hoặc `EntityManager` clear. Thay đổi không còn được theo dõi.\n' +
    '- **Removed**: đã gọi `remove()`, sẽ bị DELETE khi flush.\n\n' +
    'Chuyển trạng thái: `persist`, `merge` (detached→managed bằng cách copy), `remove`, `detach`/`clear`.',
  essence:
    'Chỉ entity ở trạng thái managed mới được tự động đồng bộ. "Sửa entity mà không thấy update DB" thường vì nó đang detached.',
  example:
    'Nhận `User` từ REST (detached, do deserialize), sửa `name`, rồi chỉ `user.setName(...)` mà không `repo.save(user)` → không có gì xảy ra. `save()` thực chất gọi `merge` để đưa nó về managed.',
},
{
  cat: 'Spring Data / JPA',
  q: 'Persistence context (first-level cache) và dirty checking hoạt động thế nào?',
  answer:
    'Persistence context là một `Map<EntityKey, Entity>` gắn với transaction. Trong cùng transaction, `findById(1)` hai lần trả về **cùng một object** (không query lần hai) — đó là first-level cache, luôn bật, không tắt được.\n\n' +
    'Khi load, Hibernate chụp lại "snapshot" các field. Lúc **flush** (trước commit, trước query, hoặc gọi tay), nó so sánh state hiện tại với snapshot → sinh UPDATE cho field đã đổi. Không cần gọi `save()`.',
  essence:
    'Persistence context vừa là cache trong-transaction vừa là "unit of work" gom thay đổi. Dirty checking khiến `setter` trên entity managed đủ để cập nhật DB.',
  example:
    '`@Transactional void deactivate(Long id){ User u = repo.findById(id).orElseThrow(); u.setActive(false); }` — không có `save()` nào, nhưng khi method kết thúc, Hibernate flush và chạy `UPDATE users SET active=false WHERE id=?`.',
},
{
  cat: 'Spring Data / JPA',
  q: 'Lazy và eager loading? `LazyInitializationException` từ đâu ra?',
  answer:
    '`FetchType.LAZY`: quan hệ chỉ được load khi truy cập lần đầu (Hibernate dùng proxy). `EAGER`: load ngay cùng entity cha.\n\n' +
    'Mặc định: `@ManyToOne`/`@OneToOne` là EAGER, `@OneToMany`/`@ManyToMany` là LAZY. Khuyến nghị: đặt **tất cả LAZY**, chỉ fetch khi cần.\n\n' +
    '`LazyInitializationException`: truy cập quan hệ lazy khi persistence context đã đóng (ngoài `@Transactional`, ví dụ ở tầng controller hoặc khi serialize JSON).',
  essence:
    'Lazy hoãn truy vấn để tránh kéo dữ liệu thừa, nhưng dữ liệu chỉ lấy được khi session còn mở. Lỗi này là dấu hiệu bạn đang cố dùng entity ngoài ranh giới transaction.',
  example:
    'Controller trả thẳng `order` có `List<Item> items` LAZY → Jackson serialize chạm `items` ngoài transaction → exception. Sửa: map sang DTO **trong** service (còn transaction), hoặc dùng fetch join/`@EntityGraph`.',
},
{
  cat: 'Spring Data / JPA',
  q: 'N+1 select problem là gì và khắc phục thế nào?',
  answer:
    'Load danh sách N `Order`, rồi vòng lặp truy cập `order.getCustomer()` (lazy) → 1 query lấy list + N query lấy từng customer = **N+1** query.\n\n' +
    'Khắc phục:\n' +
    '- **JOIN FETCH** trong JPQL: `select o from Order o join fetch o.customer`.\n' +
    '- `@EntityGraph(attributePaths = "customer")` trên method repository.\n' +
    '- `@BatchSize(size = 50)` / `hibernate.default_batch_fetch_size` → gom N query thành N/50 query `IN (...)`.\n' +
    '- DTO projection với JPQL constructor expression (chỉ lấy cột cần).',
  essence:
    'N+1 là hệ quả của lazy loading trong vòng lặp. Giải pháp là "nói trước" cái gì cần: fetch join / entity graph / batch fetch.',
  example:
    'Màn hình 20 đơn hàng hiện tên khách + tên 3 sản phẩm đầu: `@EntityGraph(attributePaths = {"customer","items"})` biến ~80 query thành 1–2 query. Bật `spring.jpa.properties.hibernate.generate_statistics=true` để phát hiện.',
},
{
  cat: 'Spring Data / JPA',
  q: '`@Transactional(readOnly = true)` mang lại lợi ích gì?',
  answer:
    '- Hibernate đặt `FlushMode = MANUAL` → **không dirty checking, không flush tự động** → tiết kiệm CPU và tránh UPDATE ngoài ý muốn.\n' +
    '- Gợi ý cho driver/DB rằng transaction chỉ đọc (một số DB tối ưu, hoặc route sang read replica).\n' +
    '- Với cấu hình read/write splitting, `readOnly` là tín hiệu để chọn `DataSource` replica.\n\n' +
    'Không phải "khoá chống ghi" — nếu bạn cố ghi, tuỳ cấu hình có thể vẫn ghi hoặc lỗi.',
  essence:
    'Chủ yếu là tối ưu Hibernate (bỏ snapshot + flush) và là hint định tuyến. Nên đặt cho mọi service method chỉ truy vấn.',
  example:
    '`@Transactional(readOnly = true) List<OrderDto> search(...)` — không tốn chi phí dirty-check trên hàng nghìn entity load ra, và với `AbstractRoutingDataSource` sẽ đọc từ replica, giảm tải primary.',
},
{
  cat: 'Spring Data / JPA',
  q: 'JPQL, native query và Criteria API — chọn cái nào?',
  answer:
    '- **JPQL / `@Query`**: viết theo entity, portable giữa các DB, kiểm tra lúc khởi động. Đủ cho 90% trường hợp.\n' +
    '- **Native query** (`nativeQuery = true`): SQL thật. Dùng khi cần tính năng riêng của DB (window function, CTE, upsert, hint), hoặc tối ưu query phức tạp.\n' +
    '- **Criteria API**: build query bằng code, type-safe (với metamodel). Dùng cho **query động** (search nhiều điều kiện tuỳ chọn) — nhưng dài dòng; thay thế nhẹ hơn là Spring Data `Specification` hoặc QueryDSL.',
  essence:
    'JPQL cho truy vấn tĩnh, portable. Native cho khi cần sức mạnh DB cụ thể. Criteria/Specification cho khi cấu trúc query thay đổi theo input.',
  example:
    'Bộ lọc sản phẩm (giá, danh mục, còn hàng — mỗi cái optional): dùng `Specification` ghép các `Predicate` theo tham số có mặt. Báo cáo doanh thu theo tháng dùng `SUM() OVER()` → native query.',
},
{
  cat: 'Spring Data / JPA',
  q: 'Optimistic locking và pessimistic locking khác nhau thế nào?',
  answer:
    '**Optimistic** (`@Version` trên field int/timestamp): không khoá gì khi đọc. Lúc UPDATE, Hibernate thêm `WHERE version = ?`; nếu 0 dòng bị ảnh hưởng (ai đó đã sửa) → `OptimisticLockException`. Giả định xung đột hiếm.\n\n' +
    '**Pessimistic** (`@Lock(PESSIMISTIC_WRITE)` → `SELECT ... FOR UPDATE`): khoá dòng ngay khi đọc, thread khác chờ. Giả định xung đột thường xuyên, hoặc thao tác không idempotent.',
  essence:
    'Optimistic: "cứ làm, kiểm tra lúc ghi, thất bại thì thử lại" — throughput cao, cần retry logic. Pessimistic: "khoá trước cho chắc" — đơn giản nhưng giảm concurrency, nguy cơ deadlock.',
  example:
    'Sửa hồ sơ người dùng (hiếm khi hai người sửa cùng lúc): optimistic + hiện thông báo "dữ liệu đã thay đổi, tải lại". Trừ tồn kho vé concert lúc mở bán (tranh chấp cực cao): pessimistic hoặc `UPDATE ... SET qty = qty - 1 WHERE qty > 0` nguyên tử.',
},
{
  cat: 'Spring Data / JPA',
  q: 'Khi nào Hibernate flush? `save()` và `saveAndFlush()` khác gì?',
  answer:
    'Flush = đồng bộ thay đổi trong persistence context xuống DB (chạy INSERT/UPDATE/DELETE), **chưa commit**.\n\n' +
    'Xảy ra tự động khi: (1) transaction commit; (2) trước khi chạy một query có thể bị ảnh hưởng bởi thay đổi đang chờ (`AUTO` mode); (3) gọi `flush()` tay.\n\n' +
    '`repository.save(e)`: với entity mới → `persist` (có thể hoãn INSERT tới flush); với detached → `merge`. **Không** ép flush ngay.\n' +
    '`saveAndFlush(e)`: `save` rồi `flush()` ngay — thấy lỗi ràng buộc DB lập tức, hoặc cần id/sequence ngay.',
  essence:
    'Hibernate gom thao tác và ghi theo lô lúc flush để tối ưu. `saveAndFlush` phá tính hoãn đó để lấy phản hồi DB sớm.',
  example:
    'Import 10.000 dòng: `save` trong vòng lặp + `entityManager.flush()/clear()` mỗi 500 dòng để tránh persistence context phình to gây OOM và để tận dụng JDBC batch.',
},
{
  cat: 'Spring Data / JPA',
  q: 'Cascade types và `orphanRemoval` — ý nghĩa và cạm bẫy?',
  answer:
    'Cascade lan truyền thao tác từ entity cha sang con: `PERSIST`, `MERGE`, `REMOVE`, `REFRESH`, `DETACH`, `ALL`.\n\n' +
    '`orphanRemoval = true`: khi một con bị **gỡ khỏi collection** của cha (`order.getItems().remove(item)`), con đó bị DELETE — mô hình "con không tồn tại độc lập".\n\n' +
    'Cạm bẫy: `CascadeType.ALL` + `orphanRemoval` trên quan hệ dùng chung (many-to-many hoặc con được entity khác tham chiếu) → xoá cha xoá luôn dữ liệu người khác đang dùng.',
  essence:
    'Cascade chỉ hợp lý cho quan hệ **sở hữu thật sự** (aggregate: Order sở hữu OrderItem). Với quan hệ tham chiếu (Order → Customer), không cascade REMOVE.',
  example:
    '`@OneToMany(mappedBy="order", cascade=ALL, orphanRemoval=true) List<OrderItem> items` — hợp lý, item không sống ngoài order. Nhưng đặt cascade REMOVE từ `Order` sang `Customer` sẽ xoá khách hàng khi xoá đơn — thảm hoạ.',
},
{
  cat: 'Spring Data / JPA',
  q: 'Vì sao không nên trả entity trực tiếp ra API? Dùng projection/DTO thế nào?',
  answer:
    'Trả entity gây: lộ cấu trúc DB & field nhạy cảm; `LazyInitializationException` hoặc kéo cả đồ thị quan hệ; vòng lặp vô hạn khi serialize quan hệ hai chiều; coupling API contract với schema; khó versioning.\n\n' +
    'Giải pháp:\n' +
    '- **DTO record** map thủ công hoặc bằng MapStruct trong service (còn transaction).\n' +
    '- **Interface projection** của Spring Data: `interface OrderView { Long getId(); String getCustomerName(); }` — Hibernate chỉ SELECT cột cần.\n' +
    '- **Constructor expression** JPQL: `select new com.acme.OrderDto(o.id, c.name) from Order o join o.customer c`.',
  essence:
    'API contract và persistence model là hai thứ khác nhau, tiến hoá với nhịp khác nhau. DTO là ranh giới chống rò rỉ giữa chúng, đồng thời giảm dữ liệu truy vấn.',
  example:
    'Danh sách đơn hàng chỉ cần id, ngày, tổng tiền, tên khách: interface projection `OrderSummary` → query chỉ lấy 4 cột thay vì hydrate cả entity `Order` + `Customer` + `List<OrderItem>`.',
},
{
  cat: 'Spring MVC',
  q: '`@RestController` khác `@Controller` thế nào? Content negotiation là gì?',
  answer:
    '`@Controller`: giá trị trả về (String) được hiểu là **tên view** → `ViewResolver` render HTML.\n\n' +
    '`@RestController` = `@Controller` + `@ResponseBody` ở cấp class → mọi giá trị trả về được **serialize thẳng vào body** qua `HttpMessageConverter` (Jackson cho JSON).\n\n' +
    '**Content negotiation**: Spring chọn converter dựa trên header `Accept` của client và các converter có trên classpath. `Accept: application/xml` + Jackson XML → trả XML; mặc định JSON.',
  essence:
    '`@Controller` hướng view (server-side rendering); `@RestController` hướng data (API). Content negotiation để một endpoint phục vụ nhiều định dạng theo yêu cầu client.',
  example:
    '`@GetMapping("/users/{id}") User get(...)` trong `@RestController` → client gọi với `Accept: application/json` nhận JSON. Thêm `jackson-dataformat-csv` + `produces="text/csv"` cho endpoint export.',
},
{
  cat: 'Spring MVC',
  q: '`@RequestParam`, `@PathVariable`, `@RequestBody` dùng khi nào?',
  answer:
    '- `@PathVariable`: lấy phần biến trong đường dẫn — định danh tài nguyên. `/users/{id}` → `@PathVariable Long id`.\n' +
    '- `@RequestParam`: lấy query param `?page=2&size=20` hoặc form field — lọc, phân trang, tuỳ chọn. Có `required`, `defaultValue`.\n' +
    '- `@RequestBody`: deserialize toàn bộ body (JSON) thành object — payload tạo/cập nhật.\n\n' +
    'REST quy ước: định danh trong path, tham số phụ trong query, dữ liệu phức tạp trong body. `GET`/`DELETE` không nên có body.',
  essence:
    'Path = "cái gì", query = "lọc/điều chỉnh thế nào", body = "dữ liệu đầy đủ". Chọn đúng chỗ giúp URL rõ nghĩa và cache-friendly.',
  example:
    '`GET /orders/{orderId}/items?status=SHIPPED&page=0&size=50` → `@PathVariable orderId`, `@RequestParam status/page/size`. `POST /orders` với `@RequestBody CreateOrderRequest`.',
},
{
  cat: 'Spring MVC',
  q: 'Filter, Interceptor và `@ControllerAdvice` khác nhau ở đâu?',
  answer:
    '- **Servlet Filter**: tầng thấp nhất, chạy trước cả `DispatcherServlet`, thao tác trên `ServletRequest/Response` thô. Dùng cho: logging request, CORS, nén, security (Spring Security là chuỗi filter), rewrite.\n' +
    '- **HandlerInterceptor**: trong Spring MVC, biết được handler nào sẽ chạy (`preHandle`, `postHandle`, `afterCompletion`). Dùng cho: auth theo controller, đo thời gian xử lý, set attribute cho view.\n' +
    '- **`@ControllerAdvice`**: xử lý xuyên suốt ở tầng controller — `@ExceptionHandler`, `@ModelAttribute`, `@InitBinder`.',
  essence:
    'Càng ra ngoài càng thô và tổng quát (Filter), càng vào trong càng hiểu ngữ cảnh MVC (Interceptor → Advice). Chọn tầng thấp nhất đủ dùng.',
  example:
    'Gắn `traceId` vào MDC cho mọi request kể cả tài nguyên tĩnh → Filter. Kiểm tra quyền "chỉ owner mới xem" dựa trên handler → Interceptor. Map `AccessDeniedException` → 403 body chuẩn → `@ControllerAdvice`.',
},
{
  cat: 'Spring MVC',
  q: 'CORS là gì? Cấu hình trong Spring như thế nào?',
  answer:
    'CORS (Cross-Origin Resource Sharing): trình duyệt chặn JS gọi API khác **origin** (scheme+host+port) trừ khi server trả header cho phép (`Access-Control-Allow-Origin`…). Với request "non-simple", trình duyệt gửi **preflight** `OPTIONS` trước.\n\n' +
    'Cấu hình Spring:\n' +
    '- `@CrossOrigin` trên controller/method (cục bộ).\n' +
    '- Toàn cục: `WebMvcConfigurer.addCorsMappings(...)`.\n' +
    '- Với Spring Security: cấu hình `CorsConfigurationSource` và `http.cors()` — nếu không, filter security chặn OPTIONS trước.',
  essence:
    'CORS là cơ chế phía **trình duyệt**, không phải bảo mật server (Postman/curl không bị ảnh hưởng). Server chỉ khai báo origin nào được phép đọc response.',
  example:
    'SPA ở `https://app.acme.com` gọi API `https://api.acme.com`: cấu hình allowedOrigins = `https://app.acme.com`, allowedMethods = GET/POST/PUT/DELETE, allowCredentials = true (và KHÔNG dùng `*` khi có credentials).',
},
{
  cat: 'Spring Security',
  q: 'Spring Security filter chain và luồng authentication hoạt động thế nào?',
  answer:
    'Spring Security là một chuỗi **servlet filter** (`SecurityFilterChain`) đứng trước app. Các filter chính: `SecurityContextPersistenceFilter`, `UsernamePasswordAuthenticationFilter` / `BearerTokenAuthenticationFilter`, `ExceptionTranslationFilter`, `AuthorizationFilter`.\n\n' +
    'Luồng: filter trích credential từ request → tạo `Authentication` (chưa xác thực) → `AuthenticationManager` → `AuthenticationProvider` (ví dụ `DaoAuthenticationProvider` dùng `UserDetailsService` + `PasswordEncoder`) → nếu ok, lưu `Authentication` đã xác thực vào `SecurityContextHolder` (ThreadLocal) → `AuthorizationFilter` kiểm tra quyền theo rule.',
  essence:
    'Xác thực (bạn là ai) xảy ra sớm trong chuỗi filter và kết quả nằm ở `SecurityContextHolder`; phân quyền (bạn được làm gì) xảy ra ngay trước khi vào controller.',
  example:
    'API JWT: `BearerTokenAuthenticationFilter` đọc `Authorization: Bearer ...`, `JwtDecoder` verify chữ ký + expiry, tạo `JwtAuthenticationToken` với authorities từ claim `scope`/`roles`, đặt vào context. Controller lấy user qua `@AuthenticationPrincipal`.',
},
{
  cat: 'Spring Security',
  q: 'Session-based authentication và token/JWT — ưu nhược điểm?',
  answer:
    '**Session (cookie)**: server lưu session state, cookie chỉ chứa session id. Thu hồi tức thì (xoá session), nhỏ gọn, tự động theo cookie. Nhược: cần session store chia sẻ khi scale (Redis), dễ dính CSRF, không tiện cho mobile/third-party.\n\n' +
    '**JWT (stateless)**: token tự chứa claim + chữ ký, server không lưu. Scale ngang dễ, hợp SPA/mobile/microservice. Nhược: **khó thu hồi trước hạn** (cần blacklist/token ngắn hạn + refresh token), payload lớn hơn, lộ token là nguy hiểm tới khi hết hạn.',
  essence:
    'Session đẩy state về server (dễ kiểm soát, khó scale). JWT đẩy state vào token (dễ scale, khó thu hồi). Chọn theo nhu cầu logout tức thì vs kiến trúc phân tán.',
  example:
    'Web app nội bộ một domain: session + Redis, đơn giản và logout ngay. Hệ thống nhiều service + app mobile: access token JWT sống 15 phút + refresh token lưu DB (thu hồi được).',
},
{
  cat: 'Spring Security',
  q: 'Vì sao lưu mật khẩu phải hash bằng BCrypt/Argon2? `PasswordEncoder` là gì?',
  answer:
    'Không bao giờ lưu plaintext hay hash nhanh (MD5/SHA-256) — GPU brute-force hàng tỉ hash/giây. Cần hàm **chậm có chủ đích** và **có salt**:\n' +
    '- **BCrypt**: salt tự sinh nhúng trong output, cost factor điều chỉnh được (work factor).\n' +
    '- **Argon2 / scrypt**: thêm kháng tấn công bộ nhớ (memory-hard) — khuyến nghị mới.\n\n' +
    '`PasswordEncoder` interface: `encode(raw)`, `matches(raw, encoded)`. `DelegatingPasswordEncoder` (mặc định) lưu prefix `{bcrypt}` để **nâng thuật toán dần** mà vẫn verify hash cũ.',
  essence:
    'Salt chống rainbow table & hash trùng; work factor cao khiến brute-force không khả thi về chi phí. `PasswordEncoder` trừu tượng hoá để đổi/nâng cấp thuật toán không phá dữ liệu cũ.',
  example:
    '`new BCryptPasswordEncoder(12)`. Khi user đăng nhập thành công với hash `{bcrypt}` cũ cost 10, có thể re-encode sang cost 12 hoặc Argon2 và lưu lại — nâng cấp âm thầm theo thời gian.',
},
{
  cat: 'Spring Data / JPA',
  q: 'Keyset pagination và offset pagination — khác nhau và khi nào dùng?',
  answer:
    '**Offset** (`LIMIT 20 OFFSET 10000`): DB vẫn phải duyệt và bỏ qua 10.000 dòng → càng về trang sau càng chậm; thêm/xoá dữ liệu giữa các lần gọi gây trùng/nhảy dòng.\n\n' +
    '**Keyset (seek)**: `WHERE (created_at, id) < (:lastCreatedAt, :lastId) ORDER BY created_at DESC, id DESC LIMIT 20`. Dùng giá trị của dòng cuối trang trước làm mốc → luôn nhanh (dùng index), ổn định khi dữ liệu thay đổi. Đổi lại: không nhảy tới trang bất kỳ, chỉ "trang kế tiếp".',
  essence:
    'Offset đơn giản nhưng chi phí tăng tuyến tính theo số trang. Keyset biến phân trang thành truy vấn range trên index — phù hợp feed/infinite scroll/export lớn.',
  example:
    'Xuất 2 triệu bản ghi qua API: offset trang 50.000 mất vài giây/lần. Keyset theo `(id)` giữ mỗi lần ~vài ms. Spring Data hỗ trợ `Slice` + `ScrollPosition` (Boot 3.1+) cho keyset.',
},
{
  cat: 'Spring Data / JPA',
  q: '`@Modifying @Query` cần lưu ý gì (flush, clear, transaction)?',
  answer:
    'Với UPDATE/DELETE bằng JPQL/native, method repository phải gắn `@Modifying` và chạy trong `@Transactional`.\n\n' +
    'Vấn đề: câu lệnh chạy **thẳng xuống DB, bỏ qua persistence context**. Entity đã load trước đó trong context vẫn giữ giá trị cũ (stale). \n\n' +
    '`@Modifying(flushAutomatically = true, clearAutomatically = true)`: flush thay đổi đang chờ trước khi chạy, và clear context sau đó để lần đọc kế tiếp lấy dữ liệu mới.',
  essence:
    'Bulk update là thao tác "vòng qua" Hibernate. Nếu trong cùng transaction bạn còn dùng lại entity liên quan, phải clear context để tránh đọc bản cũ.',
  example:
    '`@Modifying @Query("update Token t set t.revoked = true where t.userId = :uid")` để logout mọi phiên. Nếu sau đó cùng transaction lại `findByUserId` và kiểm tra `revoked`, cần `clearAutomatically = true` mới thấy `true`.',
},
{
  cat: 'Spring Security',
  q: '`@PreAuthorize` là gì? Khi nào cần bật CSRF protection?',
  answer:
    '**Method security** (`@EnableMethodSecurity`): `@PreAuthorize("hasRole(\'ADMIN\')")`, `@PreAuthorize("#id == authentication.principal.id")` — kiểm tra quyền ngay tại method service/controller bằng SpEL, gần logic nghiệp vụ. `@PostAuthorize`, `@PreFilter`/`@PostFilter` lọc collection.\n\n' +
    '**CSRF**: chỉ nguy hiểm khi trình duyệt **tự động gửi credential** (cookie session) → cần cho app dùng cookie + form. API **stateless dùng Bearer token** thì không cần (token không tự gửi kèm), thường `http.csrf(csrf -> csrf.disable())`.',
  essence:
    'Method security bổ sung lớp phân quyền chi tiết theo dữ liệu, không chỉ theo URL. CSRF protection cần khi và chỉ khi cơ chế auth của bạn dựa trên cái trình duyệt tự đính kèm (cookie).',
  example:
    '`@PreAuthorize("hasAuthority(\'ORDER_READ\') and @orderGuard.isOwner(#orderId, authentication)")` — vừa cần quyền, vừa phải là chủ đơn. App REST + JWT: tắt CSRF; app Thymeleaf + form login: giữ CSRF (Spring tự chèn token vào form).',
},
]);
