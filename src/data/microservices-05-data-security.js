SS.addQuestions('microservices', [
{
  cat: 'Dữ liệu',
  q: 'CQRS là gì? Khi nào dùng trong microservices?',
  answer:
    '**CQRS** (Command Query Responsibility Segregation): tách **model ghi** (command — thay đổi state) khỏi **model đọc** (query — trả dữ liệu).\n\n' +
    '- Write side: model chuẩn hoá, enforce invariant, tối ưu cho tính đúng.\n' +
    '- Read side: một hoặc nhiều **read model** (materialized view) được dựng từ event của write side, tối ưu cho từng truy vấn cụ thể (denormalized, đúng shape UI cần).\n\n' +
    'Dùng khi: pattern đọc và ghi **khác nhau nhiều**; cần scale đọc độc lập; query cần data từ nhiều service (dựng read model từ nhiều nguồn event). KHÔNG dùng cho CRUD đơn giản — nó thêm phức tạp và eventual consistency.',
  essence:
    'CQRS thừa nhận "đọc và ghi là hai bài toán khác nhau" và cho phép tối ưu riêng. Trong microservices, read model là cách trả lời query xuyên service mà không JOIN và không call chuỗi lúc request.',
  example:
    '`order-service` (write) enforce quy tắc đặt hàng. `order-history-service` (read) lắng nghe `OrderPlaced`, `OrderShipped`, `OrderCancelled` + `CustomerUpdated` từ customer-service → dựng bảng `order_summary(orderId, customerName, status, total, ...)`. Trang "đơn hàng của tôi" query một bảng, một service, latency ms.',
},
{
  cat: 'Dữ liệu',
  q: 'Event Sourcing là gì? Ưu và nhược điểm?',
  answer:
    'Thay vì lưu **trạng thái hiện tại**, lưu **chuỗi event** (mọi thay đổi) là nguồn sự thật. State hiện tại = fold/replay các event. Có thể chụp **snapshot** định kỳ để replay nhanh.\n\n' +
    'Ưu: audit trail đầy đủ & miễn phí; "time travel" (state tại bất kỳ thời điểm); dựng được read model mới bằng replay; hợp tự nhiên với event-driven; debug "tại sao state thành thế này".\n\n' +
    'Nhược: đường cong học dốc; query phức tạp (cần projection); versioning event schema khó; xoá dữ liệu (GDPR) khó — event là append-only; eventual consistency; công cụ/DB chuyên dụng (EventStoreDB, hoặc Kafka + KTable).',
  essence:
    'Event sourcing đổi "biết state bây giờ" lấy "biết toàn bộ lịch sử làm sao đến state này". Cực mạnh cho domain cần audit/temporal (tài chính, y tế), nhưng là công cụ chuyên dụng — đừng dùng mặc định.',
  example:
    'Tài khoản ngân hàng: thay vì cột `balance`, lưu event `Deposited(100)`, `Withdrawn(30)`, `Deposited(50)`. Balance = 120 (fold). Kiểm toán hỏi "số dư ngày 15/6" → replay tới ngày đó. Phát hiện bug tính phí → sửa projection, replay lại toàn bộ.',
},
{
  cat: 'Dữ liệu',
  q: 'Shared database giữa các service — vì sao là anti-pattern?',
  answer:
    'Nhiều service đọc/ghi chung một database (hoặc cùng bảng).\n\n' +
    'Vấn đề:\n' +
    '- **Schema trở thành API ngầm không có contract**: đổi bảng làm hỏng service khác, không biết ai đang phụ thuộc.\n' +
    '- **Không deploy độc lập**: migration phải phối hợp.\n' +
    '- **Coupling runtime**: lock, transaction, connection pool tranh chấp giữa các service.\n' +
    '- **Không chọn được công nghệ lưu trữ** riêng.\n' +
    '- Mất ranh giới sở hữu dữ liệu → "ai chịu trách nhiệm tính đúng của bảng này?".\n\n' +
    'Đây là dấu hiệu #1 của distributed monolith.',
  essence:
    'Database riêng là *định nghĩa* của service độc lập. Chia sẻ DB = giữ coupling chặt nhất (dữ liệu) trong khi mất tính đơn giản của monolith. Tệ cả đôi đường.',
  example:
    '`order-service` và `reporting-service` cùng đọc bảng `orders`. Team order thêm cột NOT NULL → reporting-service (không biết) crash khi insert. Sửa: order-service sở hữu `orders`, phát event; reporting-service giữ bản sao của riêng nó hoặc query qua API.',
},
{
  cat: 'Dữ liệu',
  q: 'Anti-Corruption Layer (ACL) khi tích hợp với hệ legacy?',
  answer:
    'Khi service mới phải tích hợp với hệ thống cũ (legacy monolith, hệ đối tác) có mô hình domain xấu/khác biệt, đừng để mô hình đó "rò rỉ" vào service mới.\n\n' +
    '**ACL** = một lớp dịch thuật đặt giữa: nó nhận dữ liệu/API của hệ ngoài và **chuyển đổi** sang mô hình sạch của domain bạn (và ngược lại). Bên trong service bạn chỉ làm việc với mô hình của mình.\n\n' +
    'ACL có thể là: một module trong service, hoặc một service riêng (adapter service).',
  essence:
    'ACL bảo vệ mô hình domain sạch của bạn khỏi sự lây nhiễm của mô hình xấu bên ngoài. Chi phí dịch thuật ở một chỗ, đổi lấy việc phần còn lại của service không dính "nợ" của hệ legacy.',
  example:
    'Service `pricing` mới phải lấy dữ liệu từ ERP cũ (SOAP, field tên `CUST_PRC_GRP_CD`, ngày dạng `YYYYMMDD`, giá là string). ACL: một `ErpPricingClient` gọi SOAP, parse, chuyển thành `PriceGroup` enum + `LocalDate` + `Money`. Phần `pricing` còn lại không biết ERP tồn tại.',
},
{
  cat: 'Dữ liệu',
  q: 'Tách một bảng ra service riêng — migrate dữ liệu thế nào?',
  answer:
    'Không "cắt" một phát. Các bước (mở rộng của strangler):\n' +
    '1. **Tạo service mới** với DB riêng, API đầy đủ, nhưng chưa ai dùng.\n' +
    '2. **Đồng bộ dữ liệu**: CDC từ bảng cũ → service mới (hoặc dual-write có kiểm soát). Backfill dữ liệu lịch sử.\n' +
    '3. **Chuyển đọc**: các consumer dần chuyển sang gọi API service mới (feature flag), so sánh kết quả với đường cũ (shadow read).\n' +
    '4. **Chuyển ghi**: consumer ghi qua service mới; service mới là nguồn sự thật; bảng cũ thành read-only rồi bỏ.\n' +
    '5. Dọn: xoá code/bảng cũ.\n\n' +
    'Mỗi bước có thể dừng/quay lui. Luôn có giai đoạn hai nguồn chạy song song + đối soát.',
  essence:
    'Migrate dữ liệu trong microservices là một quá trình nhiều tuần với các giai đoạn "hai nguồn song song", không phải một script chạy một lần. Đối soát (reconciliation) là bắt buộc để tin tưởng đường mới.',
  example:
    'Tách `inventory` khỏi monolith: (1) `inventory-service` + Postgres riêng; (2) Debezium CDC từ bảng `stock` của monolith → inventory-service; (3) monolith gọi API inventory-service để đọc tồn kho (flag), so với đọc DB trực tiếp; (4) chuyển ghi; (5) sau 1 tháng ổn định, drop bảng `stock`.',
},
{
  cat: 'Bảo mật',
  q: 'Token propagation: khi service A gọi B thay mặt user?',
  answer:
    'Request người dùng vào gateway với một access token (JWT/OAuth2). Khi service A cần gọi service B để hoàn thành request đó, B cần biết cả "user nào" và "service nào" đang gọi.\n\n' +
    'Cách:\n' +
    '- **Token forwarding**: A truyền tiếp nguyên token của user trong header `Authorization` xuống B. Đơn giản nhưng token có scope rộng, TTL của user token.\n' +
    '- **Token Exchange** (RFC 8693): A đổi token user lấy một token mới, scope hẹp hơn, dành riêng cho gọi B ("A gọi B thay mặt user X, chỉ để đọc order").\n' +
    '- **On-behalf-of**: tương tự, kèm cả danh tính service A và user X.\n\n' +
    'Kèm service-to-service auth (mTLS) để xác thực chính service A.',
  essence:
    'Trong chuỗi call, mỗi service cần đủ context để **tự phân quyền** (user + client + scope). Forwarding đơn giản; token exchange an toàn hơn (least privilege, không lộ token gốc quá sâu).',
  example:
    'User gọi `GET /orders/5` → gateway verify JWT → `order-service`. order-service cần địa chỉ giao từ `customer-service`: token exchange lấy token scope `customer:read` cho user đó → gọi `customer-service` → customer-service kiểm tra "user X có được xem địa chỉ của customer trong order 5 không".',
},
{
  cat: 'Bảo mật',
  q: 'Authorization tập trung (OPA) vs phân tán trong từng service?',
  answer:
    '**Trong từng service**: mỗi service tự chứa logic "ai được làm gì". Gần domain, không có điểm nghẽn, nhưng logic phân quyền rải rác, khó audit toàn cục, dễ lệch.\n\n' +
    '**Tập trung — Policy as Code** (Open Policy Agent): policy viết bằng Rego, deploy như một sidecar/library cạnh mỗi service. Service hỏi OPA "user X có được làm action Y trên resource Z?" → OPA trả allow/deny dựa trên policy chung.\n' +
    '- Policy quản lý tập trung, version hoá, test được, audit được.\n' +
    '- Quyết định vẫn ở **cạnh service** (OPA local) → không thêm network hop, không điểm lỗi trung tâm.\n\n' +
    'Thực tế phổ biến: **coarse-grained** (RBAC theo role) ở gateway/OPA; **fine-grained** (user này có phải chủ order này không) trong service vì nó cần domain data.',
  essence:
    'Tách "policy" (quy tắc, quản lý tập trung) khỏi "enforcement" (thực thi tại chỗ, phi tập trung). OPA cho bạn cả hai: một nguồn policy, thực thi cạnh mỗi service.',
  example:
    'OPA policy: "user role `support` được `read` mọi order nhưng không `refund` quá 1 triệu". `order-service` gọi OPA local với `{user, action: "refund", order: {amount}}` → deny nếu amount > 1M. Policy này áp cho mọi service, sửa một chỗ.',
},
{
  cat: 'Bảo mật',
  q: 'API Gateway auth vs per-service auth — chia trách nhiệm thế nào?',
  answer:
    '**Ở Gateway** (edge):\n' +
    '- Xác thực (verify JWT signature, expiry, issuer) — làm một lần, service tin tưởng.\n' +
    '- Coarse authorization (role có được chạm nhóm endpoint này không).\n' +
    '- Rate limiting, quota, chống abuse, WAF.\n\n' +
    '**Trong service** (không bỏ qua — defense in depth):\n' +
    '- **Fine-grained authorization** cần domain data: "user này có phải chủ resource này?", "đơn hàng này thuộc tenant của user?".\n' +
    '- Không tin mù header từ gateway (zero-trust) — vẫn verify token hoặc dùng mTLS + signed context.\n\n' +
    'Gateway giảm tải phần chung; service giữ phần chỉ nó biết.',
  essence:
    'Gateway lo "bạn là ai và có được vào khu vực này không". Service lo "bạn có được động vào *đúng cái này* không" — vì chỉ service mới biết dữ liệu để quyết định. Cả hai lớp, không lớp nào tin lớp kia tuyệt đối.',
  example:
    'Gateway: verify JWT, chặn nếu không có role `customer`. `order-service` nhận `GET /orders/5`: kiểm tra `order.customerId == jwt.sub` → deny 403 nếu user cố xem đơn của người khác (dù đã qua gateway). IDOR attack bị chặn ở tầng service.',
},
{
  cat: 'Testing',
  q: 'Kim tự tháp kiểm thử cho microservices gồm những tầng nào?',
  answer:
    'Từ nhiều & rẻ (dưới) lên ít & đắt (trên):\n' +
    '- **Unit test**: logic thuần trong một service, mock mọi phụ thuộc. Nhiều nhất.\n' +
    '- **Component/service test**: chạy nguyên một service in-memory hoặc trong container, downstream được stub (WireMock), DB thật (Testcontainers). Kiểm tra service hành xử đúng qua API của nó.\n' +
    '- **Contract test** (Pact): kiểm tra provider–consumer không lệch hợp đồng, mỗi phía chạy riêng.\n' +
    '- **Integration test**: service + các backing service thật (DB, broker) qua Testcontainers.\n' +
    '- **End-to-end**: vài luồng quan trọng qua nhiều service thật trong staging. Ít nhất, giòn nhất, chậm nhất.',
  essence:
    'Đảo ngược "ice cream cone" (nhiều e2e, ít unit). E2E test cho microservices cực đắt và giòn — thay phần lớn giá trị của nó bằng **contract test + component test**. Chỉ giữ vài e2e cho critical path.',
  example:
    '`order-service`: 400 unit test (logic tính giá, trạng thái), 30 component test (`@SpringBootTest` + WireMock cho payment + Testcontainers Postgres), 5 Pact contract (với web-bff, inventory-service), 2 e2e (đặt hàng thành công, đặt hàng khi hết tồn kho).',
},
{
  cat: 'Testing',
  q: 'Consumer-Driven Contract testing — quy trình chi tiết?',
  answer:
    '1. **Consumer** viết test dùng thư viện Pact: định nghĩa interaction ("given order 1 exists, when GET /orders/1, then response is {...}"). Test chạy với mock provider → sinh file **pact** (JSON contract).\n' +
    '2. Consumer publish pact lên **Pact Broker** kèm version + branch.\n' +
    '3. **Provider** trong CI: lấy các pact của mọi consumer từ broker, dựng provider thật (với state setup: "given order 1 exists" → seed DB), replay từng request trong pact, assert response thật khớp expectation.\n' +
    '4. Provider publish kết quả verification.\n' +
    '5. **can-i-deploy**: trước khi deploy, hỏi broker "phiên bản này của provider có tương thích với các consumer đang chạy production không?" → chặn deploy nếu phá contract.',
  essence:
    'Contract test dịch chuyển "phát hiện breaking change" từ e2e/production (muộn, đắt) sang CI của từng service (sớm, rẻ). Consumer định nghĩa "tôi cần gì", provider chứng minh "tôi cung cấp đủ".',
  example:
    '`web-bff` khai báo pact: cần `estimatedDelivery` (ISO date) từ `order-service`. Dev order-service đổi field thành timestamp epoch → CI order-service chạy pact verify → FAIL: "web-bff expects ISO string" → biết ngay, không merge. `can-i-deploy` cũng sẽ chặn.',
},
{
  cat: 'Dữ liệu',
  q: 'Materialized view / read replica để phục vụ query xuyên service?',
  answer:
    'Query cần data từ nhiều service, chạy thường xuyên, cần nhanh → dựng sẵn thay vì gọi lúc chạy.\n\n' +
    '**Read model service** (CQRS): một service lắng nghe event từ các service liên quan, cập nhật một bảng denormalized đúng shape của query. Query = SELECT một bảng.\n\n' +
    '**Data lake / warehouse** cho analytics: ETL/CDC từ mọi service DB → một kho (Snowflake, BigQuery, ClickHouse) → team BI query thoải mái, không đụng OLTP.\n\n' +
    'Đánh đổi: eventual consistency (read model trễ vài giây so với nguồn); phải maintain projection (bug projection → dữ liệu sai, cần replay được).',
  essence:
    'Đừng để query xuyên service thành N call runtime. Vật chất hoá kết quả từ event stream (read model cho query nghiệp vụ nóng) hoặc trong warehouse (cho analytics). Chấp nhận độ trễ đổi lấy tốc độ và độ tin cậy.',
  example:
    'Dashboard "doanh thu theo cửa hàng theo ngày" cần data từ `order`, `payment`, `store`. Không query 3 service: CDC cả 3 → ClickHouse; dashboard query ClickHouse, trả trong < 1s. Dữ liệu trễ ~2 phút — chấp nhận được cho báo cáo.',
},
{
  cat: 'Dữ liệu',
  q: 'Multi-tenancy trong microservices: các mô hình cô lập dữ liệu?',
  answer:
    '- **Shared schema** (`tenant_id` mọi bảng): rẻ nhất, một migration; rủi ro rò rỉ nếu quên `WHERE tenant_id` (dùng Row-Level Security để ép); noisy neighbor.\n' +
    '- **Schema per tenant**: cô lập tốt hơn, backup/restore per-tenant; migration chạy N lần; N lớn → nặng metadata.\n' +
    '- **Database per tenant**: cô lập tối đa (bảo mật, tuning, compliance, giới hạn tài nguyên); vận hành N database — chỉ hợp số ít tenant lớn.\n\n' +
    'Trong microservices: `tenant_id` phải **propagate qua mọi call và event** (header `X-Tenant-ID` / claim trong token), mỗi service enforce cô lập ở tầng data của nó.',
  essence:
    'Chọn mô hình theo trục "chi phí vận hành ↔ mức cô lập". Điểm khó riêng của microservices: tenant context phải đi xuyên suốt toàn bộ chuỗi call/event, và MỖI service phải tự thực thi cô lập.',
  example:
    'SaaS B2B: shared schema + Postgres RLS (`CREATE POLICY tenant_isolation USING (tenant_id = current_setting(\'app.tenant\')::uuid)`) cho 5000 tenant nhỏ; database riêng cho 8 khách enterprise có yêu cầu compliance. `tenant_id` nằm trong JWT, mọi service set `SET app.tenant` đầu mỗi request.',
},
{
  cat: 'Bảo mật',
  q: 'Xoá dữ liệu người dùng (GDPR "right to be forgotten") xuyên nhiều service?',
  answer:
    'Dữ liệu một user nằm rải ở nhiều service (order, payment, support, analytics, event log, backup). Xoá thật ở mọi nơi rất khó.\n\n' +
    'Cách tiếp cận:\n' +
    '- **Orchestrated deletion**: một `privacy-service` phát event `UserDeletionRequested`; mỗi service tự xoá/ẩn danh dữ liệu của user đó và xác nhận (`UserDataDeleted`); theo dõi tới khi tất cả xong.\n' +
    '- **Crypto-shredding**: dữ liệu cá nhân được mã hoá bằng key riêng của user; "xoá" = huỷ key → dữ liệu (kể cả trong backup, event log append-only) trở nên không đọc được.\n' +
    '- **Anonymization** thay vì delete cho dữ liệu cần giữ (đơn hàng cho kế toán): thay PII bằng placeholder.',
  essence:
    'Xoá cứng xuyên hệ phân tán (nhất là với event sourcing / backup bất biến) gần như bất khả thi. Crypto-shredding (xoá = huỷ khoá giải mã) là kỹ thuật thực dụng nhất để "quên" dữ liệu ở mọi nơi cùng lúc.',
  example:
    'Mỗi user có một AES key lưu trong `key-vault`. Order-service lưu `shippingAddress` đã mã hoá bằng key đó. User yêu cầu xoá → `privacy-service` huỷ key trong vault → mọi bản mã hoá (DB, event `OrderPlaced` trong Kafka, backup S3) không giải mã được nữa. Đơn hàng vẫn còn (`total`, `date`) cho kế toán nhưng không còn PII.',
},
{
  cat: 'Dữ liệu',
  q: 'Distributed caching giữa các service — nhất quán thế nào?',
  answer:
    'Nhiều service (hoặc nhiều instance) cache cùng loại dữ liệu → khi nguồn đổi, các bản cache bị stale.\n\n' +
    'Chiến lược:\n' +
    '- **TTL ngắn**: chấp nhận stale trong vài giây/phút — đơn giản nhất, đủ cho phần lớn.\n' +
    '- **Event-driven invalidation**: service sở hữu data phát event `XChanged` → mọi service/instance nghe và xoá key cache tương ứng (Redis pub/sub, hoặc Kafka).\n' +
    '- **Cache-aside + write-through** ở service sở hữu; các service khác gọi API (có cache riêng TTL ngắn).\n' +
    '- **Versioned key** (`product:v{updatedAt}:{id}`): đổi data → key mới, key cũ tự hết hạn.\n\n' +
    'Tránh: nhiều service ghi chung một Redis cache cho cùng data — quay lại shared-database problem.',
  essence:
    'Cache trong microservices là **bản sao có thể sai** của dữ liệu do service khác sở hữu. Nhất quán = TTL ngắn (đơn giản) hoặc invalidation qua event (realtime hơn). Mỗi service cache độc lập, đồng bộ qua event, không chia sẻ cache store cho business data.',
  example:
    '`product-service` sở hữu catalog. `search-service`, `pricing-service` mỗi cái cache tên/thuộc tính sản phẩm (TTL 5 phút) + nghe event `ProductUpdated` để xoá key ngay. Admin sửa tên sản phẩm → event → cả hai service xoá cache trong ~100ms, không chờ hết 5 phút.',
},
{
  cat: 'Bảo mật',
  q: 'Secrets rotation và không có secret nào trong code/image?',
  answer:
    'Nguyên tắc:\n' +
    '- **Không** secret trong: source code, Dockerfile, `env` của image, ConfigMap, git (kể cả private repo).\n' +
    '- Secret sống trong **secret manager** (Vault, AWS Secrets Manager), inject lúc **runtime** (env từ K8s Secret + encryption at rest, CSI Secrets Store, hoặc Vault agent sidecar).\n' +
    '- **Rotation**: secret manager đổi giá trị định kỳ (DB password, API key); app **đọc lại** (poll / watch / restart) — không hardcode một lần lúc startup.\n' +
    '- **Least privilege**: mỗi service chỉ đọc secret của nó (IAM policy / Vault policy theo path).\n' +
    '- **Detect leak**: scan git (gitleaks) trong CI; nếu lộ → xoay ngay.',
  essence:
    'Secret là dữ liệu động, được quản lý bên ngoài artifact và tự xoay. Image và code phải "vô danh" — cùng một image chạy được ở mọi môi trường vì secret được bơm vào lúc chạy.',
  example:
    'RDS password xoay mỗi 30 ngày qua Secrets Manager rotation Lambda. `order-service` dùng AWS JDBC wrapper tự lấy password mới nhất từ Secrets Manager mỗi khi tạo connection → xoay password không cần restart service, không downtime.',
},
{
  cat: 'Testing',
  q: 'Quản lý dữ liệu test khi test xuyên nhiều service?',
  answer:
    'Thách thức: một luồng e2e cần dữ liệu nhất quán ở DB của nhiều service (customer tồn tại ở customer-service, sản phẩm ở catalog-service, tồn kho ở inventory-service).\n\n' +
    'Cách:\n' +
    '- **Test setup qua API công khai**: gọi API của từng service để tạo state (không đụng DB trực tiếp) → dữ liệu đi qua đúng validation, tránh "state bất hợp lệ".\n' +
    '- **Provider state cho contract test**: mỗi provider có endpoint/hook "given X exists" chỉ dùng cho test.\n' +
    '- **Ephemeral environment**: mỗi PR dựng một namespace K8s riêng với đủ service + seed data → test cô lập, xong thì xoá.\n' +
    '- **Data builder / factory** dùng chung, versioned.\n' +
    '- Tránh: một "big shared test DB" — mọi test giẫm chân nhau, giòn.',
  essence:
    'Dữ liệu test phải được tạo qua API/hook chính thức (đảm bảo hợp lệ), cô lập theo test/PR (ephemeral env hoặc tenant riêng), và tái lập được. "Shared golden dataset" là nguồn của flaky test.',
  example:
    'CI cho một PR: tạo namespace `pr-1234`, deploy 6 service + Postgres/Kafka, chạy job seed gọi `POST /customers`, `POST /products` (qua API). Chạy e2e suite. Xoá namespace. Mỗi PR có môi trường sạch, không ảnh hưởng PR khác.',
},
{
  cat: 'Giao tiếp',
  q: 'DTO vs domain model ở ranh giới service — vì sao tách?',
  answer:
    '**Domain model**: các entity/aggregate bên trong service, chứa logic nghiệp vụ, invariant, có thể phức tạp và thay đổi thường xuyên.\n\n' +
    '**DTO (Data Transfer Object)**: cấu trúc phẳng, không logic, dùng cho input/output API và event payload.\n\n' +
    'Tách vì:\n' +
    '- **API contract độc lập với refactor nội bộ**: đổi cấu trúc domain không phá consumer.\n' +
    '- Không lộ chi tiết nội bộ (field kỹ thuật, quan hệ) ra ngoài.\n' +
    '- Tránh vòng lặp serialize với quan hệ hai chiều.\n' +
    '- Mỗi API/event chỉ mang **đúng field cần**, không phải cả entity.\n\n' +
    'Map giữa hai bằng tay hoặc MapStruct.',
  essence:
    'DTO là "hình dạng dữ liệu tại ranh giới"; domain model là "hình dạng dữ liệu để xử lý nghiệp vụ". Chúng tiến hoá với nhịp khác nhau — trộn lẫn khiến mọi refactor nội bộ thành breaking change.',
  example:
    '`Order` entity có `List<OrderLine>`, `AuditInfo`, `PricingStrategy`, quan hệ tới `Customer`. API trả `OrderDto{ id, status, total, itemCount, customerName }`. Đổi `PricingStrategy` thành interface mới → API không đổi, consumer không biết.',
},
{
  cat: 'Dữ liệu',
  q: 'Outbox relay: polling publisher vs CDC (Debezium) — đánh đổi?',
  answer:
    'Cả hai đọc bảng `outbox` (ghi cùng transaction với dữ liệu nghiệp vụ) và publish lên broker.\n\n' +
    '- **Polling publisher**: một job định kỳ `SELECT * FROM outbox WHERE published = false ORDER BY id LIMIT n`, publish, đánh dấu/xoá. Đơn giản, không thêm hạ tầng, nhưng độ trễ = chu kỳ polling, tải thêm lên DB, cần xử lý concurrent poller (`FOR UPDATE SKIP LOCKED`).\n' +
    '- **CDC (Debezium)**: đọc **WAL/binlog**, phát mỗi INSERT vào `outbox` thành sự kiện Kafka. Độ trễ ~ms, không query DB, throughput cao. Nhưng cần vận hành Kafka Connect + Debezium, cấu hình replication slot, xử lý schema.',
  essence:
    'Cùng một pattern outbox, khác cơ chế "chuyển tiếp": polling đơn giản/độ trễ cao/tải DB; CDC realtime/hạ tầng nặng hơn. Hệ nhỏ → polling; hệ nhiều event, cần realtime, đã có Kafka Connect → CDC.',
  example:
    'Startup ~50 event/s, chấp nhận trễ 1–2s: `@Scheduled(fixedDelay=1000)` poll outbox, publish, xoá. Công ty nhiều service cần event realtime: Debezium theo dõi bảng `outbox`, SMT `EventRouter` tách message theo `aggregate_type` sang đúng topic.',
},
{
  cat: 'Nền tảng',
  q: 'Tích hợp giữa các bounded context: Shared Kernel, Customer/Supplier, Published Language?',
  answer:
    'Các kiểu quan hệ giữa bounded context (DDD Context Mapping):\n' +
    '- **Shared Kernel**: hai context chia sẻ một phần model/code chung. Rủi ro coupling — chỉ dùng khi hai team phối hợp chặt.\n' +
    '- **Customer/Supplier**: context downstream (customer) có tiếng nói với upstream (supplier) về nhu cầu; upstream commit hỗ trợ.\n' +
    '- **Conformist**: downstream chấp nhận model của upstream nguyên trạng (không có ACL) — khi upstream không thể ảnh hưởng.\n' +
    '- **Anti-Corruption Layer**: downstream dịch model upstream sang model của mình.\n' +
    '- **Published Language**: một schema chung, được version hoá, làm phương tiện trao đổi (Avro/Protobuf event schema, OpenAPI) — không ai "sở hữu" model của người kia.\n' +
    '- **Open Host Service**: upstream cung cấp một API/protocol ổn định cho mọi downstream.',
  essence:
    'Cách hai service tích hợp phản ánh quan hệ quyền lực & tin cậy giữa hai team. Published Language + Open Host Service (event schema chuẩn + API ổn định) là mô hình lành mạnh nhất cho microservices ở quy mô.',
  example:
    '`order` (downstream) cần dữ liệu từ `pricing` (upstream). Nếu cùng team: có thể Customer/Supplier. Nếu `pricing` là hệ dùng chung nhiều team: `pricing` publish **Published Language** — event `PriceChanged` theo Avro schema trong registry, `order` conform theo schema đó (hoặc ACL nếu schema xấu).',
},
{
  cat: 'Dữ liệu',
  q: 'Data ownership — vì sao "không service nào đọc trực tiếp DB của service khác"?',
  answer:
    'Mỗi mẩu dữ liệu có **đúng một service sở hữu** — service đó là nguồn sự thật, chịu trách nhiệm tính đúng, và là nơi duy nhất ghi.\n\n' +
    'Service khác cần dữ liệu đó thì:\n' +
    '- **Query qua API** của service sở hữu (đồng bộ, dữ liệu mới nhất, nhưng coupling runtime).\n' +
    '- **Giữ bản sao (replica) cập nhật qua event** (bất đồng bộ, có thể stale, nhưng tách rời).\n\n' +
    'Đọc trực tiếp DB của service khác phá vỡ: đóng gói (schema thành API ngầm), khả năng đổi schema/công nghệ, ranh giới trách nhiệm.',
  essence:
    'Ownership rõ ràng = một nguồn sự thật, một nơi ghi, một nơi enforce invariant. Chia sẻ quyền truy cập dữ liệu (dù chỉ đọc) là chia sẻ coupling — và bạn không kiểm soát được ai phụ thuộc gì.',
  example:
    '`analytics-service` muốn số liệu order. Sai: kết nối vào Postgres của `order-service`, `SELECT * FROM orders`. Đúng: đăng ký consumer Kafka topic `orders` (do order-service phát), dựng bảng riêng trong DB analytics. Order-service đổi schema thoải mái, chỉ cần giữ event contract.',
},
]);
