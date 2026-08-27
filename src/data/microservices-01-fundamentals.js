SS.addQuestions('microservices', [
{
  cat: 'Nền tảng',
  q: 'Microservices là gì? Khác kiến trúc monolith ở đâu?',
  answer:
    '**Monolith**: toàn bộ ứng dụng là một đơn vị build/deploy duy nhất, dùng chung một codebase, một database, một process.\n\n' +
    '**Microservices**: hệ thống chia thành nhiều service nhỏ, mỗi service:\n' +
    '- Sở hữu một **business capability** rõ ràng, có ranh giới riêng.\n' +
    '- **Deploy độc lập** (không cần build/release cả hệ thống).\n' +
    '- Có **database riêng**, chỉ giao tiếp qua API/message (không truy cập DB của nhau).\n' +
    '- Do một team nhỏ sở hữu toàn bộ vòng đời (build – run – on-call).\n\n' +
    'Đánh đổi: linh hoạt scale/deploy/công nghệ theo từng phần, đổi lấy độ phức tạp vận hành phân tán (network, nhất quán dữ liệu, observability).',
  essence:
    'Microservices là về **ranh giới deploy và ownership độc lập**, không phải về kích thước code. Bạn đổi độ phức tạp *trong* một process lấy độ phức tạp *giữa* các process.',
  example:
    'Sàn TMĐT monolith: sửa module khuyến mãi phải deploy lại cả hệ thống (gồm thanh toán, kho, tìm kiếm), rủi ro cao. Tách thành `promotion-service`, `order-service`, `inventory-service` → team khuyến mãi deploy nhiều lần/ngày mà không ảnh hưởng thanh toán.',
},
{
  cat: 'Nền tảng',
  q: 'Khi nào KHÔNG nên dùng microservices?',
  answer:
    'Tránh microservices khi:\n' +
    '- **Sản phẩm còn non**: domain chưa rõ, ranh giới còn thay đổi liên tục → tách sai sẽ phải "vá" bằng các call chéo → distributed monolith.\n' +
    '- **Team nhỏ** (< ~10–15 kỹ sư): chi phí vận hành N service (CI/CD, monitoring, on-call) vượt lợi ích.\n' +
    '- **Chưa có nền tảng**: thiếu CI/CD tự động, observability, infra as code → mỗi service thành gánh nặng thủ công.\n' +
    '- **Tải thấp / không cần scale khác nhau** giữa các phần.\n\n' +
    'Lời khuyên phổ biến (Fowler): **"Monolith First"** — bắt đầu bằng modular monolith, tách service khi ranh giới đã ổn định và có lý do thực sự.',
  essence:
    'Microservices giải quyết vấn đề của **quy mô tổ chức** (nhiều team cần deploy độc lập) và **scale không đồng đều**, không phải vấn đề "code sạch". Chưa có hai lý do đó thì monolith rẻ hơn nhiều.',
  example:
    'Startup 4 người tách ngay thành 12 microservices: mỗi thay đổi nghiệp vụ chạm 3–4 service, phải điều phối deploy, debug xuyên service, tốn 60% thời gian cho hạ tầng. Gộp lại thành modular monolith → tốc độ phát triển tăng gấp đôi.',
},
{
  cat: 'Nền tảng',
  q: 'Bounded Context (DDD) là gì và vai trò khi phân rã service?',
  answer:
    '**Bounded Context** là ranh giới trong đó một mô hình domain (thuật ngữ, quy tắc, dữ liệu) **nhất quán và có nghĩa duy nhất**. Cùng một từ có thể mang nghĩa khác ở context khác.\n\n' +
    'Vai trò: bounded context là **ứng viên tự nhiên cho ranh giới service**. Mỗi service = một bounded context → mô hình bên trong độc lập, không phải "thoả hiệp" với nhu cầu của phần khác.\n\n' +
    'Tránh chia service theo **entity** hay **layer** (UI service, DB service) — chia theo **subdomain nghiệp vụ**.',
  essence:
    '"Customer" trong context Bán hàng (địa chỉ giao, lịch sử mua) khác "Customer" trong context Hỗ trợ (ticket, SLA). Bounded context cho phép mỗi service mô hình hoá thứ nó cần mà không kéo theo mọi thuộc tính.',
  example:
    'Hệ đặt phòng: `booking-context` (Room = phòng còn trống + giá theo ngày), `housekeeping-context` (Room = trạng thái dọn dẹp), `pricing-context` (Room = quy tắc giá). Ba service, ba mô hình "Room" khác nhau, liên kết qua `roomId` + event.',
},
{
  cat: 'Phân rã',
  q: 'Chia service theo tiêu chí nào? Vì sao không chia theo entity/layer?',
  answer:
    'Nên chia theo **business capability** / **subdomain** — một nhóm chức năng phục vụ một mục tiêu nghiệp vụ (đặt hàng, thanh toán, giao vận, catalog).\n\n' +
    'KHÔNG nên chia theo:\n' +
    '- **Layer kỹ thuật** (`api-service`, `logic-service`, `data-service`) → mọi thay đổi nghiệp vụ chạm cả 3, coupling ngang.\n' +
    '- **Entity** (`user-service`, `product-service`, `order-service` tách rời mọi bảng) → dễ tạo nano-service, một use case cần orchestrate 5 service.\n\n' +
    'Kiểm tra tốt: một thay đổi nghiệp vụ điển hình có nằm gọn trong **một** service không?',
  essence:
    'Ranh giới đúng = thay đổi thường xuyên đi cùng nhau thì ở cùng service; thay đổi vì lý do khác nhau thì tách ra (Single Responsibility ở cấp service).',
  example:
    '"Áp mã giảm giá khi checkout": nếu logic mã giảm giá nằm ở `promotion-service`, tính tiền ở `pricing-service`, tạo đơn ở `order-service` → một feature nhỏ cần đổi 3 repo + điều phối. Gộp promotion + pricing vào `checkout-service` nếu chúng luôn đổi cùng nhau.',
},
{
  cat: 'Phân rã',
  q: '"Micro" nghĩa là gì? Service nên to hay nhỏ?',
  answer:
    '"Micro" **không** phải "ít dòng code". Kích thước hợp lý được đo bằng:\n' +
    '- **Two-pizza team**: một team nhỏ (~5–8 người) sở hữu được toàn bộ.\n' +
    '- **Thay đổi độc lập**: deploy được mà không phối hợp với service khác.\n' +
    '- **Một bounded context**, một lý do để thay đổi.\n\n' +
    'Quá nhỏ (nano-service): overhead network/vận hành lấn át; nhiều call chéo. Quá to: mất lợi ích deploy độc lập, thành mini-monolith.\n\n' +
    'Bắt đầu **to hơn**, tách nhỏ khi có bằng chứng (bottleneck deploy, scale, team).',
  essence:
    'Kích thước đúng là kích thước cho phép **một team làm chủ hoàn toàn** và **thay đổi mà không hỏi ai**. Đó là mục tiêu; số dòng code là hệ quả.',
  example:
    '`order-service` xử lý toàn bộ vòng đời đơn hàng (tạo, sửa, huỷ, trạng thái) là "micro" đúng nghĩa dù ~15k dòng. Tách `order-create-service`, `order-cancel-service` riêng là nano-service — chúng luôn đổi cùng nhau.',
},
{
  cat: 'Anti-pattern',
  q: 'Distributed monolith là gì? Dấu hiệu nhận biết?',
  answer:
    'Distributed monolith = hệ thống có nhiều service nhưng **coupling chặt** như monolith, cộng thêm mọi nhược điểm của phân tán.\n\n' +
    'Dấu hiệu:\n' +
    '- **Deploy dây chuyền**: đổi service A thì phải deploy B, C cùng lúc.\n' +
    '- **Shared database** giữa nhiều service.\n' +
    '- **Chuỗi call đồng bộ sâu** cho mọi request (A→B→C→D).\n' +
    '- Thay đổi API là breaking change lan khắp.\n' +
    '- Không thể test/chạy một service riêng lẻ.\n' +
    '- Release chung theo lịch cố định cho tất cả service.',
  essence:
    'Distributed monolith là kết quả tệ nhất: độ phức tạp mạng + không có deploy độc lập. Nguyên nhân gốc gần như luôn là **ranh giới service sai** (chia theo entity/layer, chia quá sớm).',
  example:
    'Mỗi request "xem trang sản phẩm" gọi `product` → `inventory` → `pricing` → `review` → `recommendation` đồng bộ; một service chậm/lỗi làm hỏng cả trang; deploy `pricing` yêu cầu regression toàn hệ thống. Đây là monolith bị "xé" ra mạng.',
},
{
  cat: 'Dữ liệu',
  q: 'Database per service — vì sao bắt buộc? Thách thức gì?',
  answer:
    'Mỗi service sở hữu database riêng, **không service nào truy cập DB của service khác** (chỉ qua API/event).\n\n' +
    'Vì sao: nếu chia sẻ DB → schema trở thành API ngầm, đổi bảng làm hỏng service khác, không thể deploy/scale/chọn công nghệ lưu trữ độc lập → mất toàn bộ lợi ích microservices.\n\n' +
    'Thách thức:\n' +
    '- **Không có JOIN xuyên service** → phải API composition hoặc read model.\n' +
    '- **Không có transaction ACID xuyên service** → saga + eventual consistency.\n' +
    '- **Trùng lặp dữ liệu** (mỗi service giữ bản sao thứ nó cần) → phải đồng bộ qua event.\n' +
    '- Báo cáo/analytics cần data từ nhiều service → ETL sang data warehouse.',
  essence:
    'Database riêng là điều kiện cần để service thực sự độc lập. Cái giá là bạn phải giải quyết "consistency và query" ở tầng ứng dụng thay vì để DB lo.',
  example:
    '`order-service` cần hiện tên khách + sản phẩm. Thay vì JOIN sang DB của `customer` và `catalog`: order-service lắng nghe event `CustomerUpdated`, `ProductUpdated` và lưu bản sao `customerName`, `productName` cần thiết trong DB của mình.',
},
{
  cat: 'Dữ liệu',
  q: 'Nhất quán dữ liệu giữa các service khi không có distributed transaction?',
  answer:
    'Chấp nhận **eventual consistency**: sau một thao tác, các service sẽ đồng bộ trạng thái *trong một khoảng thời gian ngắn*, không phải tức thì.\n\n' +
    'Công cụ:\n' +
    '- **Saga**: chuỗi local transaction + compensating action khi lỗi.\n' +
    '- **Event-driven**: service phát event khi state đổi; service khác cập nhật bản sao của mình.\n' +
    '- **Transactional outbox**: ghi state + event trong một local transaction, relay ra broker sau.\n' +
    '- **Idempotency + retry**: đảm bảo xử lý lặp lại không sai.\n\n' +
    'Thiết kế nghiệp vụ chấp nhận được: "đơn hàng tạo xong, kho trừ sau vài giây" thường ổn.',
  essence:
    'Microservices đánh đổi "nhất quán mạnh tức thì" (dễ với 1 DB) lấy "nhất quán cuối cùng" (cần với N DB). Việc của bạn là thiết kế nghiệp vụ và UX chịu được cửa sổ không nhất quán đó.',
  example:
    'Đặt hàng: `order-service` tạo đơn (COMMIT local) + phát `OrderPlaced`. `inventory-service` nhận event, trừ kho; nếu hết hàng → phát `StockUnavailable` → `order-service` chuyển đơn sang trạng thái "chờ nhập hàng" hoặc huỷ (compensation). Người dùng thấy "đang xử lý" trong 2–3 giây.',
},
{
  cat: 'Nền tảng',
  q: 'Conway\u2019s Law ảnh hưởng thế nào tới kiến trúc microservices?',
  answer:
    '**Conway\u2019s Law**: "hệ thống phần mềm phản chiếu cấu trúc giao tiếp của tổ chức xây ra nó".\n\n' +
    'Hệ quả cho microservices:\n' +
    '- Nếu tổ chức chia theo layer (team FE, team BE, team DBA) → sẽ ra kiến trúc theo layer, không phải theo domain.\n' +
    '- Muốn service độc lập → cần **team cross-functional độc lập**, mỗi team sở hữu trọn vẹn một hoặc vài service ("you build it, you run it").\n' +
    '- **Inverse Conway Maneuver**: chủ động thiết kế cấu trúc team theo kiến trúc mong muốn.\n\n' +
    'Sách *Team Topologies*: Stream-aligned team, Platform team, Enabling team, Complicated-subsystem team.',
  essence:
    'Ranh giới service sẽ luôn "trôi" về khớp với ranh giới team. Nếu team và service không khớp, bạn chống lại Conway\u2019s Law và sẽ thua.',
  example:
    'Công ty có 1 team "backend" 20 người sở hữu 15 service: mọi service chạm bởi mọi người, không ai thực sự sở hữu, coupling tăng dần. Chia thành 4 stream-aligned team, mỗi team 3–4 service theo domain → ownership rõ, coupling giảm.',
},
{
  cat: 'Chuyển đổi',
  q: 'Strangler Fig pattern để migrate monolith sang microservices?',
  answer:
    'Không viết lại từ đầu ("big bang rewrite" hầu như luôn thất bại). Thay vào đó **bóp nghẹt dần** monolith:\n\n' +
    '1. Đặt một **proxy/gateway** trước monolith.\n' +
    '2. Chọn một capability có ranh giới rõ, tách thành service mới.\n' +
    '3. Route request của capability đó sang service mới; phần còn lại vẫn vào monolith.\n' +
    '4. Lặp lại, mỗi lần bóc một mảng.\n' +
    '5. Khi monolith teo lại đủ nhỏ (hoặc hết) → xong.\n\n' +
    'Xử lý dữ liệu: giai đoạn đầu service mới có thể vẫn đọc DB cũ (read), rồi dần dần tách DB.',
  essence:
    'Strangler Fig = migrate tăng dần, luôn giữ hệ thống chạy được, mỗi bước tạo giá trị. Rủi ro thấp hơn rewrite vô cùng nhiều vì bạn có thể dừng/quay lui bất cứ lúc nào.',
  example:
    'Monolith bán lẻ: tách `search` ra trước (ít coupling, dễ cô lập) → gateway route `/search/*` sang `search-service` dùng Elasticsearch. Tháng sau tách `recommendation`. Sáu tháng sau monolith chỉ còn checkout + admin.',
},
{
  cat: 'Nền tảng',
  q: 'Chi phí ẩn của microservices là gì?',
  answer:
    '- **Vận hành**: N pipeline CI/CD, N dashboard, N alert, on-call cho N service.\n' +
    '- **Network**: mọi call trong process → call qua mạng (latency, timeout, retry, serialization).\n' +
    '- **Nhất quán dữ liệu**: saga, outbox, eventual consistency — code phức tạp hơn nhiều.\n' +
    '- **Debug xuyên service**: cần distributed tracing, correlation id; tái hiện bug khó.\n' +
    '- **Testing**: integration/contract/e2e test tốn kém; môi trường staging đủ N service.\n' +
    '- **Cognitive load**: kỹ sư mới cần hiểu bức tranh phân tán.\n' +
    '- **Duplication** dữ liệu + code (shared model).',
  essence:
    'Microservices không "miễn phí về mặt kiến trúc". Bạn phải đầu tư nền tảng (platform team, observability, IaC, tự động hoá) *trước* khi lợi ích vượt chi phí.',
  example:
    'Team chuyển 1 monolith → 8 service mà không đầu tư nền tảng: thời gian từ commit tới production tăng từ 20 phút lên 2 giờ (deploy thủ công nhiều service), MTTR sự cố tăng gấp 3 vì không có tracing. Lợi bất cập hại.',
},
{
  cat: 'Nền tảng',
  q: 'Modular Monolith là gì? Khi nào chọn thay vì microservices?',
  answer:
    'Một deployable duy nhất, nhưng bên trong chia thành **module có ranh giới rõ**: mỗi module có API công khai, không truy cập nội bộ module khác, lý tưởng là schema/bảng riêng trong cùng DB.\n\n' +
    'Ưu: có được **tách bạch domain và ownership** mà **không** chịu chi phí phân tán (một deploy, transaction ACID, gọi hàm thay vì network, debug dễ).\n\n' +
    'Chọn modular monolith khi: team nhỏ–vừa, domain còn tiến hoá, chưa cần scale khác nhau. Nó cũng là **bước đệm lý tưởng**: module có ranh giới tốt → sau này tách thành service rất rẻ.',
  essence:
    'Phần lớn lợi ích của microservices đến từ **ranh giới module tốt**, không phải từ việc chạy trên nhiều process. Modular monolith cho bạn cái đầu tiên mà không tốn cái thứ hai.',
  example:
    'Shopify chạy một Rails monolith khổng lồ nhưng chia thành hàng chục "component" với ranh giới enforce bằng công cụ. Họ có tốc độ phát triển cao mà không có "microservices hell".',
},
{
  cat: 'Phân rã',
  q: 'Polyglot (mỗi service một công nghệ) — lợi và hại?',
  answer:
    'Microservices cho phép mỗi service chọn ngôn ngữ/DB/framework phù hợp nhất.\n\n' +
    'Lợi: dùng đúng công cụ (service ML dùng Python, service throughput cao dùng Go, service nghiệp vụ phức tạp dùng Java); team tự chủ; thử nghiệm công nghệ mới trong phạm vi hẹp.\n\n' +
    'Hại: **chi phí vận hành nhân lên** (N runtime, N cách build, N bộ thư viện security cần vá); **khó luân chuyển người** giữa team; **khó chia sẻ thư viện chung** (logging, tracing, auth phải viết lại cho mỗi ngôn ngữ); tuyển dụng khó.\n\n' +
    'Thực tế: đa số công ty giới hạn ở **2–3 stack "được duyệt"**, không polyglot vô hạn.',
  essence:
    'Polyglot là quyền chọn, không phải nghĩa vụ. Sự đa dạng công nghệ tính bằng chi phí platform (mỗi stack cần "golden path" riêng). Chuẩn hoá 80%, cho phép ngoại lệ có lý do.',
  example:
    'Netflix chủ yếu JVM (Java/Kotlin) + một số Node cho edge; không phải "mỗi service một ngôn ngữ". Một startup cho phép Java, Go, Python — service thứ 20 viết bằng Elixir vì một dev thích → 6 tháng sau dev đó nghỉ, không ai bảo trì được.',
},
{
  cat: 'Giao tiếp',
  q: 'API contract-first design nghĩa là gì và vì sao quan trọng?',
  answer:
    'Định nghĩa **hợp đồng API trước** (OpenAPI/Protobuf/AsyncAPI schema), review và thống nhất giữa provider và consumer, rồi mới code cả hai phía song song.\n\n' +
    'Lợi ích:\n' +
    '- Provider và consumer làm việc **song song** (consumer dùng mock từ schema).\n' +
    '- Contract là **nguồn sự thật**, sinh client SDK, server stub, tài liệu tự động.\n' +
    '- **Contract testing** kiểm tra cả hai phía không lệch hợp đồng.\n' +
    '- Thay đổi API phải qua review contract → không "vô tình" phá consumer.',
  essence:
    'Trong hệ phân tán, API là ranh giới cứng nhất và tốn nhất khi phá vỡ. Contract-first biến "hợp đồng ngầm" thành artifact được version hoá, review và test.',
  example:
    'Team A và team B cùng làm tính năng mới: định nghĩa `order-api.yaml` (OpenAPI) → team B code UI với Prism mock server, team A code backend. Khi ghép, khớp ngay vì cả hai theo cùng contract. CI chạy `spectral` lint + Pact verify.',
},
{
  cat: 'Giao tiếp',
  q: 'Versioning service và API — các chiến lược?',
  answer:
    '- **Backward-compatible evolution** (ưu tiên): chỉ **thêm** field optional, không xoá/đổi nghĩa field cũ, không đổi kiểu → consumer cũ vẫn chạy. Áp dụng cho ~90% thay đổi.\n' +
    '- **Versioned endpoint**: `/v1/orders`, `/v2/orders` — chạy song song, deprecate dần v1. Tốn công duy trì 2 phiên bản.\n' +
    '- **Content negotiation**: `Accept: application/vnd.acme.v2+json`.\n' +
    '- **Event schema**: dùng Schema Registry + compatibility mode (backward), thêm field có default.\n\n' +
    'Nguyên tắc **Tolerant Reader**: consumer chỉ đọc field mình cần, bỏ qua field lạ → provider thêm field không phá ai.',
  essence:
    'Cách rẻ nhất để version là **không cần version**: tiến hoá API tương thích ngược. Versioned endpoint là biện pháp cuối cho breaking change không tránh được, kèm kế hoạch deprecate.',
  example:
    'Thêm `estimatedDelivery` vào response `/orders/{id}`: consumer cũ bỏ qua field mới, không cần gì. Nhưng đổi `status` từ string `"SHIPPED"` sang object `{code, label}` là breaking → phải `/v2` + migrate consumer + tắt `/v1` sau 3 tháng.',
},
{
  cat: 'Nền tảng',
  q: 'Nguyên tắc 12-Factor App liên quan gì tới microservices?',
  answer:
    '12-Factor là bộ nguyên tắc để app "cloud-native", rất phù hợp microservices. Các điểm quan trọng:\n' +
    '- **Config** trong biến môi trường, không trong code.\n' +
    '- **Backing services** (DB, cache, broker) là resource gắn qua URL — thay được không sửa code.\n' +
    '- **Stateless processes** — state ở backing service, không ở bộ nhớ process → scale ngang, restart tự do.\n' +
    '- **Port binding** — service tự expose HTTP, không phụ thuộc app server bên ngoài.\n' +
    '- **Disposability** — khởi động nhanh, shutdown graceful.\n' +
    '- **Logs** là event stream ra stdout, không tự quản file.\n' +
    '- **Dev/prod parity** — môi trường giống nhau.',
  essence:
    '12-Factor biến service thành đơn vị **có thể thay thế, scale, và deploy tuỳ ý**. Vi phạm (state trong RAM, config hard-code, tự quản log file) làm service khó vận hành trong cluster.',
  example:
    'Service lưu session trong bộ nhớ (`HashMap`) → không scale được (mỗi instance thấy session khác nhau), restart mất hết session. Sửa: đẩy session sang Redis (backing service) → stateless → chạy 20 instance sau load balancer thoải mái.',
},
{
  cat: 'Nền tảng',
  q: '"You build it, you run it" và service ownership nghĩa là gì?',
  answer:
    'Team viết service cũng chịu trách nhiệm **vận hành nó trong production**: on-call, xử lý sự cố, monitoring, capacity, cost.\n\n' +
    'Hệ quả tích cực:\n' +
    '- Feedback loop chặt: viết code tệ thì chính mình bị gọi lúc 2h sáng → động lực làm tốt observability, resilience, alert.\n' +
    '- Không "ném qua tường" cho team ops.\n' +
    '- Team hiểu trọn vẹn hành vi thật của service.\n\n' +
    'Cần: platform team cung cấp "paved road" (CI/CD, monitoring, logging chuẩn) để mỗi team không tự xây lại hạ tầng.',
  essence:
    'Ownership đầy đủ (dev + run) là điều kiện để microservices hoạt động. Tách "team viết" khỏi "team chạy" tái tạo lại vấn đề của mô hình cũ, chỉ phân tán hơn.',
  example:
    'Service `notification` hay timeout lúc cao điểm. Nếu team ops chịu trận, họ chỉ restart. Khi chính team dev on-call, họ thêm circuit breaker + queue + alert dựa trên p99 → sự cố giảm 80% sau một sprint.',
},
{
  cat: 'Anti-pattern',
  q: 'Các anti-pattern phổ biến khi mới bắt đầu microservices?',
  answer:
    '- **Tách quá sớm / quá nhỏ**: chưa hiểu domain đã chia 15 service → distributed monolith.\n' +
    '- **Shared database**: nhiều service dùng chung DB → coupling qua schema.\n' +
    '- **Chuỗi call đồng bộ sâu**: mọi request A→B→C→D → latency cộng dồn, một service lỗi sập cả chuỗi.\n' +
    '- **Không có API gateway / cross-cutting**: mỗi service tự làm auth, rate limit, logging khác nhau.\n' +
    '- **Thiếu observability**: không có correlation id / tracing → debug bằng "grep 8 service".\n' +
    '- **Shared library quá lớn**: "common" lib chứa business logic → đổi lib phải deploy hết.\n' +
    '- **Entity service** (`user-service` chỉ là CRUD bảng users) thay vì capability service.',
  essence:
    'Hầu hết thất bại microservices không phải do công nghệ mà do **ranh giới sai** và **thiếu nền tảng vận hành**. Sửa ranh giới rất đắt sau khi đã chạy production.',
  example:
    'Team đặt `common-service` chứa "logic dùng chung" (validate, tính thuế, format). Mọi service phụ thuộc nó qua REST call. Đổi công thức thuế → phải deploy `common-service` + kiểm tra 10 service gọi nó → chính là monolith với extra latency.',
},
{
  cat: 'Phân rã',
  q: 'Làm sao biết ranh giới service đã đúng?',
  answer:
    'Các tín hiệu của ranh giới **tốt**:\n' +
    '- Thay đổi nghiệp vụ điển hình nằm gọn trong **một** service (đo bằng: bao nhiêu % PR chạm nhiều repo?).\n' +
    '- Deploy service này **không** cần phối hợp lịch với service khác.\n' +
    '- Ít call đồng bộ chéo; giao tiếp chủ yếu là event bất đồng bộ.\n' +
    '- Mỗi service scale theo lý do riêng.\n' +
    '- Team sở hữu service hiểu và tự quyết được toàn bộ.\n\n' +
    'Tín hiệu **xấu**: "coupling metric" cao — mỗi feature là một "cross-team epic", nhiều service phải release cùng nhau, API breaking change thường xuyên.',
  essence:
    'Ranh giới đúng làm cho **thay đổi cục bộ hoá**. Nếu bạn liên tục phải điều phối nhiều team/service cho một thay đổi, ranh giới đang cắt ngang một concept nên ở cùng nhau.',
  example:
    'Đo: trong 3 tháng, 70% PR chạm ≥ 2 repo, 40% feature cần deploy phối hợp. → ranh giới sai. Sau khi gộp `pricing` + `promotion` + `tax` thành `checkout-pricing-service`: 85% PR chỉ chạm 1 repo.',
},
{
  cat: 'Nền tảng',
  q: 'Microservices ảnh hưởng thế nào tới tổ chức và quy trình phát triển?',
  answer:
    'Cần thay đổi kèm theo, không chỉ code:\n' +
    '- **Cấu trúc team**: stream-aligned team cross-functional, mỗi team sở hữu vài service.\n' +
    '- **Platform/Enabling team**: cung cấp "paved road" (template service, CI/CD, observability chuẩn, IaC module).\n' +
    '- **Quy trình**: trunk-based + feature flag + CD; decentralized decision (mỗi team chọn được trong khuôn khổ).\n' +
    '- **Governance nhẹ**: chuẩn chung tối thiểu (health check, tracing header, security baseline), còn lại tự do.\n' +
    '- **On-call & incident**: mỗi team on-call service của mình; runbook; blameless postmortem.',
  essence:
    'Microservices là quyết định **socio-technical**. Cùng một kiến trúc, tổ chức phù hợp thì thành công, tổ chức tập trung/silo thì tạo ra distributed monolith. Đầu tư platform team là bắt buộc.',
  example:
    'Công ty lập "Developer Platform" team: cung cấp `create-service` CLI sinh service mới đã có sẵn Dockerfile, pipeline, dashboard Grafana, tracing, health endpoint. Team sản phẩm tạo service mới trong 1 giờ thay vì 1 tuần dựng hạ tầng.',
},
]);
