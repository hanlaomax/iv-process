SS.addQuestions('microservices', [
{
  cat: 'Nền tảng',
  id: 'microservices-pxr21h',
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Monolith', 'Microservices'],
    rows: [
      ['Đơn vị build/deploy', 'một đơn vị duy nhất', 'mỗi service deploy độc lập'],
      ['Database', 'một DB chung', 'DB riêng mỗi service'],
      ['Giao tiếp nội bộ', 'gọi hàm trong process', 'API / message qua mạng'],
      ['Ownership', 'cả hệ thống', 'một team nhỏ trọn vòng đời (build–run–on-call)'],
      ['Đổi lấy', 'đơn giản, nhất quán mạnh', 'linh hoạt scale/deploy/công nghệ ↔ phức tạp phân tán'],
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Khác biệt nằm ở ĐƠN VỊ TRIỂN KHAI, không phải ở code",
      code:
        "# MONOLITH: một artifact, một lần deploy, một database\n" +
        "# app.jar chứa order + payment + inventory, tất cả gọi nhau bằng lời gọi hàm\n" +
        "\n" +
        "# MICROSERVICES: mỗi service là một tiến trình, deploy độc lập, DB riêng\n" +
        "services:\n" +
        "  order-service:\n" +
        "    image: order-service:1.4.0\n" +
        "    environment:\n" +
        "      DB_URL: jdbc:postgresql://order-db:5432/orders   # DB RIÊNG\n" +
        "      PAYMENT_URL: http://payment-service:8080         # gọi qua MẠNG\n" +
        "  payment-service:\n" +
        "    image: payment-service:2.1.0                       # version ĐỘC LẬP\n" +
        "    environment:\n" +
        "      DB_URL: jdbc:postgresql://payment-db:5432/payments\n" +
        "  order-db:\n" +
        "    image: postgres:16\n" +
        "  payment-db:\n" +
        "    image: postgres:16",
    },
    {
      lang: "java",
      title: "Cùng một logic, hai chi phí rất khác nhau",
      code:
        "// MONOLITH: lời gọi hàm — nhanh (nano giây), luôn thành công hoặc ném exception,\n" +
        "// và nằm trong CÙNG một transaction.\n" +
        "@Transactional\n" +
        "public void placeOrder(Order o) {\n" +
        "    orderRepo.save(o);\n" +
        "    paymentService.charge(o);        // cùng tiến trình, cùng transaction\n" +
        "    inventoryService.reserve(o);     // lỗi -> rollback TẤT CẢ\n" +
        "}\n" +
        "\n" +
        "// MICROSERVICES: lời gọi MẠNG — chậm hơn hàng nghìn lần, có thể TIMEOUT,\n" +
        "// có thể thành công mà không nhận được phản hồi, và KHÔNG có transaction chung.\n" +
        "public void placeOrder(Order o) {\n" +
        "    orderRepo.save(o);                          // DB của mình\n" +
        "    paymentClient.charge(o);                    // HTTP: có thể lỗi/timeout\n" +
        "    inventoryClient.reserve(o);                 // lỗi ở đây -> payment ĐÃ trừ tiền\n" +
        "}\n" +
        "// -> Bài toán mới xuất hiện: timeout, retry, idempotent, saga, bù trừ.\n" +
        "// Đây chính là cái giá thật sự của microservices, không phải việc chia code.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-1i74n22',
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
  viz: {
    type: 'quadrant',
    title: 'Microservices giải vấn đề quy mô tổ chức + scale không đồng đều',
    x: ['team nhỏ', 'nhiều team'],
    y: ['domain chưa rõ', 'domain ổn định'],
    items: [
      { label: 'Monolith', qx: 0, qy: 0 },
      { label: 'Modular monolith', qx: 0, qy: 1 },
      { label: 'Tách dần vài service', qx: 1, qy: 0 },
      { label: 'Microservices', qx: 1, qy: 1 },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Danh sách kiểm tra trước khi chia",
      code:
        "# KHÔNG NÊN khi:\n" +
        "# 1) ĐỘI NHỎ (dưới ~15-20 người). Chia 10 service cho 5 người nghĩa là\n" +
        "#    mỗi người ôm 2 service và không ai hiểu toàn hệ thống.\n" +
        "# 2) NGHIỆP VỤ CHƯA RÕ. Ranh giới service sai còn tệ hơn không chia —\n" +
        "#    sửa ranh giới trong monolith là refactor, trong microservices là\n" +
        "#    một dự án migrate dữ liệu.\n" +
        "# 3) CHƯA CÓ NỀN TẢNG VẬN HÀNH:\n" +
        "which kubectl helm    # điều phối container\n" +
        "# cần sẵn: CI/CD tự động, log tập trung, metrics, tracing, alerting,\n" +
        "#          quản lý secret, môi trường staging giống production\n" +
        "# Thiếu những thứ này thì microservices là 10 hệ thống không quan sát được.\n" +
        "# 4) SẢN PHẨM CHƯA CÓ NGƯỜI DÙNG. Tối ưu hoá cho quy mô chưa tồn tại.\n" +
        "# 5) TẢI THẤP và ĐỀU. Không cần scale riêng từng phần.\n" +
        "# 6) Yêu cầu NHẤT QUÁN MẠNH xuyên nhiều nghiệp vụ (ngân hàng lõi, kế toán).\n" +
        "\n" +
        "# NÊN LÀM THAY THẾ: MODULAR MONOLITH\n" +
        "# - một deployment, nhưng module có ranh giới rõ ràng trong code\n" +
        "# - mỗi module một schema riêng trong cùng database\n" +
        "# - giao tiếp giữa module qua interface, không gọi thẳng vào bảng của nhau\n" +
        "# -> Giữ được lợi ích về tổ chức code, mà không trả giá về vận hành.\n" +
        "# Khi thật sự cần, tách một module ra thành service là việc khả thi.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-1yfkza7',
  q: 'Bounded Context (DDD) là gì và vai trò khi phân rã service?',
  answer:
    '**Bounded Context** là ranh giới trong đó một mô hình domain (thuật ngữ, quy tắc, dữ liệu) **nhất quán và có nghĩa duy nhất**. Cùng một từ có thể mang nghĩa khác ở context khác.\n\n' +
    'Vai trò: bounded context là **ứng viên tự nhiên cho ranh giới service**. Mỗi service = một bounded context → mô hình bên trong độc lập, không phải "thoả hiệp" với nhu cầu của phần khác.\n\n' +
    'Tránh chia service theo **entity** hay **layer** (UI service, DB service) — chia theo **subdomain nghiệp vụ**.',
  essence:
    '"Customer" trong context Bán hàng (địa chỉ giao, lịch sử mua) khác "Customer" trong context Hỗ trợ (ticket, SLA). Bounded context cho phép mỗi service mô hình hoá thứ nó cần mà không kéo theo mọi thuộc tính.',
  example:
    'Hệ đặt phòng: `booking-context` (Room = phòng còn trống + giá theo ngày), `housekeeping-context` (Room = trạng thái dọn dẹp), `pricing-context` (Room = quy tắc giá). Ba service, ba mô hình "Room" khác nhau, liên kết qua `roomId` + event.',
  viz: {
    type: 'tree',
    title: 'Chia theo subdomain nghiệp vụ, không theo entity/layer',
    root: {
      label: 'Bounded Context = ranh giới một mô hình domain nhất quán, có nghĩa duy nhất',
      children: [
        { label: 'booking-context', note: 'Room = phòng còn trống + giá theo ngày' },
        { label: 'housekeeping-context', note: 'Room = trạng thái dọn dẹp' },
        { label: 'pricing-context', note: 'Room = quy tắc giá' },
        { label: 'Liên kết', note: 'cùng roomId + event — mỗi service mô hình hoá đúng thứ nó cần' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Cùng một từ, hai ý nghĩa khác nhau ở hai context",
      code:
        "// \"Customer\" trong context BÁN HÀNG:\n" +
        "package sales.domain;\n" +
        "public class Customer {\n" +
        "    private CustomerId id;\n" +
        "    private String name;\n" +
        "    private CreditLimit creditLimit;      // sales quan tâm hạn mức tín dụng\n" +
        "    private List<Order> orderHistory;\n" +
        "    public boolean canPlaceOrder(Money amount) { ... }\n" +
        "}\n" +
        "\n" +
        "// \"Customer\" trong context GIAO HÀNG — KHÁC HẲN:\n" +
        "package shipping.domain;\n" +
        "public class Customer {\n" +
        "    private CustomerId id;                // chỉ chung nhau ĐỊNH DANH\n" +
        "    private Address deliveryAddress;      // shipping quan tâm địa chỉ\n" +
        "    private DeliveryPreference preference;\n" +
        "    private List<Shipment> shipments;\n" +
        "}\n" +
        "\n" +
        "// Ý TƯỞNG CỐT LÕI: đừng cố tạo MỘT model \"Customer\" đúng cho mọi phòng ban.\n" +
        "// Mô hình chung đó sẽ phình to, chứa field mà nửa hệ thống không dùng,\n" +
        "// và mọi thay đổi đều ảnh hưởng tất cả.\n" +
        "\n" +
        "// BOUNDED CONTEXT = ranh giới mà một mô hình và một NGÔN NGỮ CHUNG\n" +
        "// (ubiquitous language) có ý nghĩa nhất quán.\n" +
        "// -> Đây là ứng viên TỐT NHẤT cho ranh giới service, vì bên trong nó\n" +
        "//    các khái niệm gắn chặt với nhau, còn giữa các context thì lỏng lẻo.\n" +
        "\n" +
        "// CONTEXT MAP mô tả quan hệ giữa các context:\n" +
        "//   Shared Kernel      — chia sẻ một phần model (dùng hạn chế, gây phụ thuộc)\n" +
        "//   Customer/Supplier  — upstream/downstream có thoả thuận\n" +
        "//   Conformist         — downstream chấp nhận model của upstream\n" +
        "//   Anti-Corruption Layer — dịch model bên ngoài sang model của mình",
    },
  ],
},
{
  cat: 'Phân rã',
  id: 'microservices-18kdxoc',
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
  viz: {
    type: 'compare',
    corner: 'Chia theo',
    cols: ['Business capability (nên)', 'Layer kỹ thuật', 'Entity'],
    rows: [
      ['Ví dụ', 'đặt hàng, thanh toán, giao vận', 'api-service, logic-service, data-service', 'user-service, product-service'],
      ['Thay đổi nghiệp vụ điển hình', 'nằm gọn 1 service', 'chạm cả 3 (coupling ngang)', 'orchestrate nhiều nano-service'],
      ['Rủi ro', 'thấp', 'distributed monolith', 'nano-service'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chia theo NĂNG LỰC NGHIỆP VỤ, không theo tầng hay entity",
      code:
        "// SAI 1 — CHIA THEO TẦNG KỸ THUẬT:\n" +
        "//   controller-service / business-service / data-service\n" +
        "// -> Mỗi tính năng mới phải sửa CẢ BA và deploy đồng bộ. Đây là\n" +
        "//    distributed monolith, và tệ hơn monolith thường về mọi mặt.\n" +
        "\n" +
        "// SAI 2 — CHIA THEO ENTITY:\n" +
        "//   user-service / order-service / product-service / address-service\n" +
        "// -> Nghe hợp lý nhưng dẫn tới service quá nhỏ, và một thao tác nghiệp vụ\n" +
        "//    (\"đặt hàng\") phải gọi qua 5 service -> chuỗi call dài, khó đảm bảo\n" +
        "//    nhất quán, và thay đổi nghiệp vụ vẫn phải sửa nhiều service.\n" +
        "\n" +
        "// ĐÚNG — CHIA THEO NĂNG LỰC NGHIỆP VỤ (business capability):\n" +
        "//   order-management   — nhận đơn, xác nhận, huỷ (SỞ HỮU trọn vòng đời đơn)\n" +
        "//   payment            — thanh toán, hoàn tiền, đối soát\n" +
        "//   inventory          — tồn kho, đặt giữ, nhập/xuất\n" +
        "//   shipping           — vận chuyển, theo dõi\n" +
        "//   notification       — email, SMS, push\n" +
        "// Mỗi service làm TRỌN một năng lực, từ API tới database.\n" +
        "@RestController\n" +
        "@RequestMapping(\"/orders\")\n" +
        "class OrderController {           // order-service làm hết vòng đời đơn hàng\n" +
        "    @PostMapping        Order create(@RequestBody CreateOrder req) { }\n" +
        "    @PostMapping(\"/{id}/confirm\") void confirm(@PathVariable String id) { }\n" +
        "    @PostMapping(\"/{id}/cancel\")  void cancel(@PathVariable String id) { }\n" +
        "}\n" +
        "\n" +
        "// KIỂM CHỨNG RANH GIỚI: một yêu cầu nghiệp vụ điển hình có sửa được trong\n" +
        "// MỘT service không? Nếu thường phải sửa 3-4 service cùng lúc -> ranh giới sai.",
    },
  ],
},
{
  cat: 'Phân rã',
  id: 'microservices-1d343a5',
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
  viz: {
    type: 'tree',
    title: '"Micro" không phải "ít dòng code"',
    root: {
      label: 'Kích thước đúng = 1 team làm chủ hoàn toàn + đổi mà không hỏi ai',
      children: [
        { label: 'Two-pizza team', note: '~5–8 người sở hữu được toàn bộ' },
        { label: 'Thay đổi độc lập', note: 'deploy không cần phối hợp service khác' },
        { label: 'Một bounded context, một lý do để thay đổi', note: '' },
        { label: 'Bắt đầu to hơn', note: 'tách nhỏ khi có bằng chứng: bottleneck deploy/scale/team' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Kích thước đo bằng ranh giới, không bằng số dòng code",
      code:
        "# \"Micro\" KHÔNG có nghĩa là ít dòng code. Nó nói về PHẠM VI TRÁCH NHIỆM.\n" +
        "# Một service 20.000 dòng phụ trách trọn vẹn nghiệp vụ thanh toán là hợp lý.\n" +
        "# Mười service mỗi cái 500 dòng phải deploy cùng nhau thì không.\n" +
        "\n" +
        "# NANOSERVICE (quá nhỏ) — dấu hiệu:\n" +
        "#  - service chỉ có CRUD một bảng\n" +
        "#  - mỗi thay đổi nghiệp vụ phải sửa 4-5 service\n" +
        "#  - chuỗi call sâu 5-6 tầng cho một request\n" +
        "#  - chi phí vận hành (CI, monitoring, on-call) vượt giá trị của service\n" +
        "#  - nhiều mã \"keo dán\" giữa các service hơn là logic nghiệp vụ\n" +
        "\n" +
        "# SERVICE QUÁ TO — dấu hiệu:\n" +
        "#  - nhiều đội cùng sửa và giẫm chân nhau khi release\n" +
        "#  - một phần cần scale nhưng phải scale cả service\n" +
        "#  - build/test chậm tới mức không ai muốn chạy\n" +
        "#  - schema database phình và không ai hiểu hết\n" +
        "\n" +
        "# THƯỚC ĐO THỰC DỤNG:\n" +
        "#  - MỘT ĐỘI (5-9 người) sở hữu và hiểu trọn vẹn được service\n" +
        "#  - viết lại từ đầu trong vài tuần nếu cần\n" +
        "#  - deploy được ĐỘC LẬP, không cần điều phối với đội khác\n" +
        "#  - có ranh giới dữ liệu rõ ràng (database riêng)\n" +
        "\n" +
        "# LỜI KHUYÊN: bắt đầu với ít service TO, tách nhỏ khi thấy đau cụ thể.\n" +
        "# Gộp hai service lại dễ hơn nhiều so với tách một service đang chạy.",
    },
  ],
},
{
  cat: 'Anti-pattern',
  id: 'microservices-1qw458g',
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
  viz: {
    type: 'tree',
    title: 'Kết quả tệ nhất: phức tạp mạng + không deploy độc lập',
    root: {
      label: 'Nguyên nhân gốc gần như luôn là ranh giới service sai (theo entity/layer, chia quá sớm)',
      children: [
        { label: 'Deploy dây chuyền', note: 'đổi A phải deploy B, C cùng lúc' },
        { label: 'Shared database', note: 'giữa nhiều service' },
        { label: 'Chuỗi call đồng bộ sâu', note: 'A→B→C→D cho mọi request' },
        { label: 'API breaking change lan khắp', note: '' },
        { label: 'Không thể test/chạy một service riêng lẻ', note: 'release chung theo lịch cố định' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Tệ hơn cả monolith lẫn microservices",
      code:
        "// Distributed monolith = chi phí vận hành của microservices + độ cứng\n" +
        "// nhắc của monolith. Đây là kết cục phổ biến nhất của việc chia sai.\n" +
        "\n" +
        "// DẤU HIỆU 1: phải deploy nhiều service CÙNG LÚC theo đúng thứ tự\n" +
        "// -> \"release train\" mỗi thứ ba, ai lỡ chuyến thì chờ hai tuần.\n" +
        "\n" +
        "// DẤU HIỆU 2: DÙNG CHUNG DATABASE\n" +
        "@Entity\n" +
        "@Table(name = \"orders\")          // order-service VÀ shipping-service\n" +
        "class Order { }                  // cùng map vào một bảng\n" +
        "// -> đổi schema là phải sửa và deploy cả hai. Đây là dấu hiệu nặng nhất.\n" +
        "\n" +
        "// DẤU HIỆU 3: thư viện dùng chung chứa MODEL NGHIỆP VỤ\n" +
        "// common-lib 2.3.0 chứa class Order, Customer, Payment\n" +
        "// -> nâng cấp common-lib là phải nâng cấp mọi service.\n" +
        "// (Thư viện chung cho LOGGING, TRACING thì bình thường; cho MODEL thì không.)\n" +
        "\n" +
        "// DẤU HIỆU 4: chuỗi call ĐỒNG BỘ sâu\n" +
        "// A -> B -> C -> D, và D chết là A chết theo.\n" +
        "\n" +
        "// DẤU HIỆU 5: không service nào deploy được một mình mà không sợ vỡ cái khác.\n" +
        "\n" +
        "// CÁCH THOÁT:\n" +
        "//  1) TÁCH DATABASE trước tiên — đây là việc khó nhất và quan trọng nhất\n" +
        "//  2) bỏ model dùng chung, mỗi service có DTO riêng ở ranh giới\n" +
        "//  3) chuyển call đồng bộ sang bất đồng bộ (event) ở những chỗ chịu được\n" +
        "//  4) hợp đồng API có version, tương thích ngược -> deploy độc lập được\n" +
        "//  5) contract test thay cho end-to-end test phải chạy mọi service",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-9fsf2v',
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
  viz: {
    type: 'flow',
    title: 'Nếu chia sẻ DB → schema thành API ngầm → mất lợi ích microservices',
    nodes: ['Shared database', 'Schema thành API ngầm', 'Đổi bảng → hỏng service khác', 'Không deploy/scale/chọn storage độc lập', 'Database riêng bắt buộc'],
    steps: [
      { to: 2, label: 'Nhiều service đọc cùng bảng → mọi ALTER là breaking change' },
      { to: 3, label: 'Coupling qua storage giết tính độc lập' },
      { to: 4, label: 'Cái giá: không JOIN xuyên service, không ACID xuyên service, trùng lặp dữ liệu (đồng bộ qua event), analytics cần ETL' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Mỗi service một database, không chia sẻ",
      code:
        "services:\n" +
        "  order-service:\n" +
        "    environment:\n" +
        "      DB_URL: jdbc:postgresql://order-db:5432/orders\n" +
        "  payment-service:\n" +
        "    environment:\n" +
        "      DB_URL: jdbc:postgresql://payment-db:5432/payments\n" +
        "  order-db:   { image: postgres:16 }\n" +
        "  payment-db: { image: postgres:16 }\n" +
        "# Rẻ hơn: cùng một cụm Postgres nhưng KHÁC SCHEMA và KHÁC USER,\n" +
        "# và user của service này KHÔNG có quyền trên schema của service kia.",
    },
    {
      lang: "sql",
      title: "Vì sao bắt buộc, và ba thách thức",
      code:
        "-- VÌ SAO BẮT BUỘC:\n" +
        "-- 1) Chia sẻ DB = chia sẻ SCHEMA = không deploy độc lập được. Đổi một cột\n" +
        "--    là phải phối hợp với mọi service đang đọc bảng đó.\n" +
        "-- 2) Không có ranh giới -> service nào cũng đọc/ghi bảng của nhau ->\n" +
        "--    mọi ràng buộc nghiệp vụ bị phá từ nhiều phía.\n" +
        "-- 3) Không chọn được công nghệ lưu trữ phù hợp cho từng service.\n" +
        "GRANT USAGE ON SCHEMA orders TO order_service;\n" +
        "REVOKE ALL ON SCHEMA orders FROM payment_service;   -- ranh giới được THỰC THI\n" +
        "\n" +
        "-- BA THÁCH THỨC (và cách xử lý):\n" +
        "-- 1) KHÔNG JOIN được xuyên service\n" +
        "--    -> API composition (gọi từng service rồi gộp ở tầng trên)\n" +
        "--    -> hoặc CQRS: dựng read model tổng hợp từ event\n" +
        "-- 2) KHÔNG có transaction xuyên service\n" +
        "--    -> Saga + compensating transaction; Outbox để không mất event\n" +
        "-- 3) DỮ LIỆU TRÙNG LẶP có kiểm soát: shipping giữ bản sao địa chỉ khách\n" +
        "--    -> chấp nhận nhất quán cuối cùng, và định rõ ai là NGUỒN SỰ THẬT\n" +
        "CREATE TABLE outbox (\n" +
        "  id UUID PRIMARY KEY, aggregate_id TEXT NOT NULL,\n" +
        "  event_type TEXT NOT NULL, payload JSONB NOT NULL,\n" +
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), published_at TIMESTAMPTZ\n" +
        ");",
    },
  ],
},
{
  cat: 'Dữ liệu',
  id: 'microservices-1lw1mmo',
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
  viz: {
    type: 'sequence',
    title: 'Eventual consistency: đồng bộ trong khoảng ngắn, không tức thì',
    actors: ['order-svc', 'broker', 'inventory-svc'],
    messages: [
      { from: 0, to: 0, label: 'tạo đơn (COMMIT local)' },
      { from: 0, to: 1, label: 'phát OrderPlaced (transactional outbox)' },
      { from: 1, to: 2, label: 'giao event' },
      { from: 2, to: 2, label: 'trừ kho (local txn) — idempotent' },
      { from: 2, to: 1, label: 'StockUnavailable nếu hết hàng' },
      { from: 1, to: 0, label: 'compensation: chuyển "chờ nhập hàng" / huỷ' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Nhất quán cuối cùng, và các công cụ để đạt được nó",
      code:
        "// Không có 2PC thực dụng -> chấp nhận NHẤT QUÁN CUỐI CÙNG và thiết kế\n" +
        "// để hệ thống TỰ HỘI TỤ về trạng thái đúng.\n" +
        "\n" +
        "// 1) OUTBOX — ghi dữ liệu và event trong CÙNG một transaction database\n" +
        "@Transactional\n" +
        "public void placeOrder(Order o) {\n" +
        "    orderRepo.save(o);\n" +
        "    outboxRepo.save(new OutboxEvent(UUID.randomUUID(), \"Order\", o.id(),\n" +
        "                                    \"OrderPlaced\", toJson(o)));\n" +
        "}   // cả hai cùng commit -> KHÔNG BAO GIỜ mất event\n" +
        "\n" +
        "// 2) IDEMPOTENT CONSUMER — event có thể tới nhiều lần\n" +
        "@KafkaListener(topics = \"order-placed\")\n" +
        "@Transactional\n" +
        "public void on(OrderPlaced e) {\n" +
        "    if (processedRepo.existsById(e.eventId())) return;   // đã xử lý\n" +
        "    processedRepo.save(new Processed(e.eventId()));\n" +
        "    inventoryService.reserve(e.orderId(), e.items());    // cùng transaction\n" +
        "}\n" +
        "\n" +
        "// 3) SAGA — chuỗi bước có bù trừ khi thất bại (xem câu riêng)\n" +
        "\n" +
        "// 4) ĐỐI SOÁT ĐỊNH KỲ — lưới an toàn cuối cùng, thường bị bỏ quên\n" +
        "@Scheduled(cron = \"0 0 2 * * *\")\n" +
        "public void reconcile() {\n" +
        "    // So sánh trạng thái giữa hai service, tìm bản ghi lệch và tự sửa/báo động\n" +
        "    var orphans = orderRepo.findPaidWithoutShipment(Duration.ofHours(1));\n" +
        "    orphans.forEach(alertService::raise);\n" +
        "}\n" +
        "// Trong hệ phân tán, lệch dữ liệu SẼ xảy ra. Câu hỏi không phải \"làm sao\n" +
        "// để không bao giờ lệch\" mà là \"làm sao PHÁT HIỆN và SỬA được khi lệch\".",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-12ykp8j',
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
  viz: {
    type: 'tree',
    title: 'Ranh giới service luôn "trôi" về khớp ranh giới team',
    root: {
      label: 'Conway’s Law: hệ thống phản chiếu cấu trúc giao tiếp của tổ chức',
      children: [
        { label: 'Tổ chức theo layer (FE/BE/DBA)', note: '→ kiến trúc theo layer, không theo domain' },
        { label: 'Cần team cross-functional độc lập', note: '"you build it, you run it" — mỗi team sở hữu trọn vài service' },
        { label: 'Inverse Conway Maneuver', note: 'chủ động thiết kế cấu trúc team theo kiến trúc mong muốn' },
        { label: 'Team Topologies', note: 'Stream-aligned, Platform, Enabling, Complicated-subsystem' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Kiến trúc phản chiếu cấu trúc tổ chức",
      code:
        "# \"Tổ chức thiết kế hệ thống sẽ tạo ra thiết kế sao chép cấu trúc giao tiếp\n" +
        "#  của chính tổ chức đó.\"  — Melvin Conway, 1967\n" +
        "\n" +
        "# HỆ QUẢ THỰC TẾ:\n" +
        "# Tổ chức chia theo CHUYÊN MÔN (đội frontend, đội backend, đội DBA)\n" +
        "#   -> kiến trúc chia theo TẦNG: UI service / API service / data service\n" +
        "#   -> mỗi tính năng cần ba đội phối hợp -> chậm, nhiều cuộc họp\n" +
        "#\n" +
        "# Tổ chức chia theo SẢN PHẨM (đội đặt hàng, đội thanh toán, đội giao vận)\n" +
        "#   -> kiến trúc chia theo NĂNG LỰC NGHIỆP VỤ\n" +
        "#   -> mỗi đội tự làm trọn một tính năng -> nhanh, ít phụ thuộc\n" +
        "\n" +
        "# INVERSE CONWAY MANEUVER: muốn kiến trúc nào thì TỔ CHỨC ĐỘI theo hình\n" +
        "# dạng đó trước. Đây là công cụ quản trị mạnh hơn mọi tài liệu kiến trúc.\n" +
        "\n" +
        "# ĐỘI HÌNH HAI PIZZA (5-9 người) — đủ nhỏ để giao tiếp hiệu quả, đủ lớn\n" +
        "# để sở hữu trọn một service:\n" +
        "#   1 product owner, 1 tech lead, 3-5 engineer, 1 QA (hoặc QA nhúng)\n" +
        "#   Đội tự làm: phát triển, kiểm thử, deploy, on-call.\n" +
        "\n" +
        "# TEAM TOPOLOGIES đưa ra bốn dạng đội:\n" +
        "#   Stream-aligned — bám theo luồng giá trị nghiệp vụ (đội chính)\n" +
        "#   Platform       — cung cấp nền tảng tự phục vụ cho các đội trên\n" +
        "#   Enabling       — giúp đội khác nâng năng lực rồi rút đi\n" +
        "#   Complicated-subsystem — mảng cần chuyên môn sâu (ML, codec)",
    },
  ],
},
{
  cat: 'Chuyển đổi',
  id: 'microservices-9tlc9d',
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
  viz: {
    type: 'flow',
    title: 'Migrate tăng dần — luôn giữ hệ thống chạy được, dừng/quay lui được',
    nodes: ['Proxy/gateway trước monolith', 'Tách 1 capability ranh giới rõ', 'Route request đó sang service mới', 'Lặp — bóc từng mảng', 'Monolith teo lại đủ nhỏ / hết'],
    steps: [
      { to: 0, label: 'Mọi traffic đi qua gateway' },
      { to: 2, label: 'Chọn capability dễ cô lập (search), route /search/* sang service mới' },
      { to: 3, label: 'Giai đoạn đầu service mới có thể vẫn đọc DB cũ, rồi tách dần' },
      { to: 4, label: 'Không "big bang rewrite" — mỗi bước tạo giá trị' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Thay thế dần từng phần, không viết lại từ đầu",
      code:
        "# Ý tưởng: đặt một lớp định tuyến phía trước, chuyển dần từng đường dẫn\n" +
        "# sang service mới, cho tới khi monolith không còn nhận traffic nào.\n" +
        "# Tên lấy từ cây đa bóp nghẹt: mọc quanh cây chủ rồi thay thế hoàn toàn.\n" +
        "apiVersion: networking.k8s.io/v1\n" +
        "kind: Ingress\n" +
        "metadata:\n" +
        "  name: strangler\n" +
        "spec:\n" +
        "  rules:\n" +
        "    - http:\n" +
        "        paths:\n" +
        "          - path: /api/orders            # ĐÃ tách -> service mới\n" +
        "            pathType: Prefix\n" +
        "            backend: { service: { name: order-service, port: { number: 8080 } } }\n" +
        "          - path: /                      # phần còn lại -> monolith\n" +
        "            pathType: Prefix\n" +
        "            backend: { service: { name: monolith, port: { number: 8080 } } }",
    },
    {
      lang: "bash",
      title: "Quy trình từng bước và cách giảm rủi ro",
      code:
        "# 1) CHỌN phần dễ tách trước: ít phụ thuộc, ranh giới dữ liệu rõ,\n" +
        "#    giá trị nghiệp vụ cao (ví dụ notification, report, search).\n" +
        "# 2) DỰNG service mới, CHẠY SONG SONG với monolith.\n" +
        "# 3) SHADOW TRAFFIC: gửi bản sao request sang service mới, SO SÁNH kết quả,\n" +
        "#    KHÔNG dùng phản hồi của nó. Đây là bước giảm rủi ro quan trọng nhất.\n" +
        "# 4) CHUYỂN DẦN theo tỉ lệ: 1% -> 10% -> 50% -> 100%, theo dõi lỗi và độ trễ.\n" +
        "# 5) TÁCH DỮ LIỆU: đây là phần khó nhất — thường dùng CDC để đồng bộ hai\n" +
        "#    chiều trong giai đoạn chuyển tiếp, rồi cắt hẳn.\n" +
        "# 6) XOÁ code cũ trong monolith. Bước này HAY BỊ BỎ QUÊN, và bỏ quên nó\n" +
        "#    nghĩa là phải bảo trì hai bản triển khai mãi mãi.\n" +
        "\n" +
        "# VÌ SAO KHÔNG \"BIG BANG REWRITE\":\n" +
        "#  - nghiệp vụ vẫn chạy và vẫn thay đổi trong lúc bạn viết lại\n" +
        "#  - không có mốc giao hàng trung gian -> rủi ro dồn hết vào ngày cuối\n" +
        "#  - kiến thức nghiệp vụ nằm trong code cũ, viết lại là mất\n" +
        "#  - lịch sử cho thấy phần lớn dự án viết lại toàn bộ đều thất bại",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-17oreg3',
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
  viz: {
    type: 'tree',
    title: 'Phải đầu tư nền tảng TRƯỚC khi lợi ích vượt chi phí',
    root: {
      label: 'Microservices không "miễn phí về kiến trúc"',
      children: [
        { label: 'Vận hành', note: 'N pipeline CI/CD, N dashboard, N alert, on-call cho N service' },
        { label: 'Network', note: 'call trong process → call qua mạng: latency, timeout, retry, serialization' },
        { label: 'Nhất quán dữ liệu', note: 'saga, outbox, eventual consistency — code phức tạp hơn nhiều' },
        { label: 'Debug xuyên service', note: 'cần distributed tracing, correlation id' },
        { label: 'Testing', note: 'contract/integration/e2e; staging đủ N service' },
        { label: 'Cognitive load + duplication', note: 'hiểu bức tranh phân tán; shared model trùng lặp' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Những khoản không ai nói lúc bắt đầu",
      code:
        "# 1) HẠ TẦNG BẮT BUỘC (không có thì không vận hành nổi):\n" +
        "#    - CI/CD cho N repo, container registry, quản lý image\n" +
        "#    - log tập trung (ELK/Loki), metrics (Prometheus), tracing (Jaeger)\n" +
        "#    - service discovery, API gateway, quản lý secret\n" +
        "#    - môi trường staging giống production\n" +
        "#    -> Thường mất 3-6 tháng của một đội chỉ để dựng nền tảng.\n" +
        "\n" +
        "# 2) ĐỘ TRỄ MẠNG cộng dồn: lời gọi hàm ~1 nano giây, HTTP nội bộ ~1-5 mili giây.\n" +
        "#    Chuỗi 5 service = ít nhất 25ms chỉ riêng mạng, chưa tính xử lý.\n" +
        "\n" +
        "# 3) GỠ RỐI KHÓ HƠN NHIỀU: một request đi qua 6 service, lỗi ở đâu?\n" +
        "#    Không có distributed tracing thì gần như không điều tra được.\n" +
        "\n" +
        "# 4) KIỂM THỬ: end-to-end test cần dựng cả hệ -> chậm, không ổn định.\n" +
        "#    Phải đầu tư vào contract testing.\n" +
        "\n" +
        "# 5) NHẤT QUÁN DỮ LIỆU: mọi thứ trước đây một transaction lo, giờ phải tự\n" +
        "#    viết saga, outbox, idempotent, đối soát.\n" +
        "\n" +
        "# 6) TÀI NGUYÊN: mỗi service một JVM/runtime, một connection pool,\n" +
        "#    một sidecar -> tốn RAM/CPU hơn monolith đáng kể ở cùng khối lượng việc.\n" +
        "kubectl top pods --all-namespaces | head\n" +
        "\n" +
        "# 7) NHẬN THỨC: không ai còn hiểu toàn hệ thống. Cần tài liệu, service\n" +
        "#    catalog, và quy ước nghiêm túc.\n" +
        "\n" +
        "# 8) ON-CALL: N service nghĩa là N nguồn cảnh báo.\n" +
        "\n" +
        "# -> Microservices đổi ĐỘ PHỨC TẠP TRONG CODE lấy ĐỘ PHỨC TẠP TRONG VẬN HÀNH.\n" +
        "# Chỉ đáng khi lợi ích (deploy độc lập, scale riêng, đội tự chủ) lớn hơn.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-a6rge2',
  q: 'Modular Monolith là gì? Khi nào chọn thay vì microservices?',
  answer:
    'Một deployable duy nhất, nhưng bên trong chia thành **module có ranh giới rõ**: mỗi module có API công khai, không truy cập nội bộ module khác, lý tưởng là schema/bảng riêng trong cùng DB.\n\n' +
    'Ưu: có được **tách bạch domain và ownership** mà **không** chịu chi phí phân tán (một deploy, transaction ACID, gọi hàm thay vì network, debug dễ).\n\n' +
    'Chọn modular monolith khi: team nhỏ–vừa, domain còn tiến hoá, chưa cần scale khác nhau. Nó cũng là **bước đệm lý tưởng**: module có ranh giới tốt → sau này tách thành service rất rẻ.',
  essence:
    'Phần lớn lợi ích của microservices đến từ **ranh giới module tốt**, không phải từ việc chạy trên nhiều process. Modular monolith cho bạn cái đầu tiên mà không tốn cái thứ hai.',
  example:
    'Shopify chạy một Rails monolith khổng lồ nhưng chia thành hàng chục "component" với ranh giới enforce bằng công cụ. Họ có tốc độ phát triển cao mà không có "microservices hell".',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Modular Monolith', 'Microservices'],
    rows: [
      ['Đơn vị deploy', 'một deployable', 'nhiều, độc lập'],
      ['Transaction', 'ACID trong một DB', 'saga + eventual consistency'],
      ['Giao tiếp giữa module', 'gọi hàm', 'network call'],
      ['Debug', 'dễ (một process, stack trace)', 'cần tracing phân tán'],
      ['Chọn khi', 'team nhỏ–vừa, domain còn tiến hoá', 'nhiều team, cần scale khác nhau'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ranh giới rõ ràng trong MỘT deployment",
      code:
        "// Module có ranh giới như service, nhưng chạy trong cùng tiến trình.\n" +
        "// com.example.order      — public API: OrderFacade\n" +
        "// com.example.payment    — public API: PaymentFacade\n" +
        "// com.example.inventory  — public API: InventoryFacade\n" +
        "\n" +
        "// Mỗi module chỉ lộ ra MỘT interface; phần còn lại là package-private:\n" +
        "package com.example.payment;\n" +
        "public interface PaymentFacade {              // duy nhất được public\n" +
        "    PaymentResult charge(ChargeCommand cmd);\n" +
        "}\n" +
        "class PaymentServiceImpl implements PaymentFacade { }   // package-private\n" +
        "class PaymentRepository { }                             // package-private\n" +
        "\n" +
        "// Module KHÁC chỉ được gọi qua facade, KHÔNG đụng vào repository/entity:\n" +
        "package com.example.order;\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final PaymentFacade payment;      // phụ thuộc INTERFACE\n" +
        "    // KHÔNG được: private final PaymentRepository repo;   <- không truy cập được\n" +
        "}\n" +
        "\n" +
        "// THỰC THI RANH GIỚI bằng công cụ, đừng chỉ dựa vào quy ước:\n" +
        "// ArchUnit:\n" +
        "//   noClasses().that().resideInAPackage(\"..order..\")\n" +
        "//     .should().dependOnClassesThat().resideInAPackage(\"..payment.internal..\")\n" +
        "// Hoặc Spring Modulith, Java Module System (JPMS), hoặc chia Maven module.\n" +
        "\n" +
        "// MỖI MODULE MỘT SCHEMA trong cùng database -> ranh giới dữ liệu vẫn rõ:\n" +
        "//   order.orders, payment.payments — không join xuyên schema.\n" +
        "\n" +
        "// LỢI ÍCH: deploy đơn giản, transaction thật, gỡ rối dễ, không có độ trễ mạng.\n" +
        "// VÀ khi cần tách một module ra thành service thì đã có sẵn ranh giới.\n" +
        "// -> Đây gần như luôn là điểm khởi đầu đúng.",
    },
  ],
},
{
  cat: 'Phân rã',
  id: 'microservices-95xqqw',
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
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Polyglot cho phép', 'Cái giá'],
    rows: [
      ['Công cụ', 'đúng tool: ML→Python, throughput→Go, nghiệp vụ→Java', 'N runtime, N cách build, N bộ vá security'],
      ['Nhân sự', 'team tự chủ, thử nghiệm phạm vi hẹp', 'khó luân chuyển người, tuyển dụng khó'],
      ['Thư viện chung', '—', 'logging/tracing/auth viết lại mỗi ngôn ngữ'],
      ['Thực tế', '', 'đa số giới hạn 2–3 stack "được duyệt"'],
    ],
  },
  demo: [
    {
      lang: "dockerfile",
      title: "Tự do chọn công nghệ, và cái giá của nó",
      code:
        "# Mỗi service đóng gói runtime riêng -> về mặt kỹ thuật, chọn gì cũng được.\n" +
        "FROM eclipse-temurin:21-jre\n" +
        "COPY app.jar /app.jar\n" +
        "ENTRYPOINT [\"java\", \"-jar\", \"/app.jar\"]\n" +
        "# service khác có thể là:\n" +
        "#   FROM golang:1.22    (service cần độ trễ thấp, ít RAM)\n" +
        "#   FROM python:3.12    (service ML)\n" +
        "#   FROM node:20        (BFF cho frontend)",
    },
    {
      lang: "bash",
      title: "Khi nào đáng, khi nào không",
      code:
        "# LỢI:\n" +
        "#  - chọn công cụ ĐÚNG cho từng bài toán: Go cho gateway độ trễ thấp,\n" +
        "#    Python cho ML, Java cho nghiệp vụ phức tạp\n" +
        "#  - đội tự chủ, dùng được thế mạnh sẵn có\n" +
        "#  - thử công nghệ mới trong phạm vi HẸP, rủi ro thấp\n" +
        "\n" +
        "# HẠI (thường bị đánh giá thấp):\n" +
        "#  1) KHÔNG LUÂN CHUYỂN được người giữa các đội\n" +
        "#  2) Phải nhân bản HẠ TẦNG CHUNG cho mỗi ngôn ngữ: thư viện logging,\n" +
        "#     tracing, client chuẩn, retry, circuit breaker, xác thực\n" +
        "#  3) N hệ sinh thái để vá lỗi bảo mật và nâng cấp\n" +
        "#  4) On-call phải hiểu nhiều runtime khác nhau\n" +
        "#  5) Người viết service Elixir nghỉ việc -> không ai bảo trì nổi\n" +
        "\n" +
        "# QUY TẮC THỰC DỤNG:\n" +
        "#  - chọn MỘT ngôn ngữ chính cho ~80% service\n" +
        "#  - cho phép ngôn ngữ khác khi có LÝ DO KỸ THUẬT RÕ RÀNG, không phải\n" +
        "#    vì sở thích cá nhân\n" +
        "#  - giới hạn số ngôn ngữ được hỗ trợ chính thức (2-3 là hợp lý)\n" +
        "#  - SERVICE MESH giúp giảm gánh nặng: retry, mTLS, tracing, load balancing\n" +
        "#    được xử lý ở sidecar -> không phải viết lại thư viện cho mỗi ngôn ngữ",
    },
  ],
},
{
  cat: 'Giao tiếp',
  id: 'microservices-935v8u',
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
  viz: {
    type: 'flow',
    title: 'Biến "hợp đồng ngầm" thành artifact được version, review, test',
    nodes: ['Định nghĩa contract (OpenAPI/Protobuf)', 'Review provider + consumer', 'Code song song (consumer dùng mock)', 'Contract testing (Pact)', 'Ghép — khớp ngay'],
    steps: [
      { to: 1, label: 'Contract là nguồn sự thật: sinh SDK, server stub, docs' },
      { to: 2, label: 'Consumer chạy Prism mock từ schema, không chờ provider' },
      { to: 3, label: 'CI kiểm cả hai phía không lệch hợp đồng' },
      { to: 4, label: 'Đổi API phải qua review contract → không "vô tình" phá consumer' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Viết hợp đồng trước, sinh code sau",
      code:
        "openapi: 3.0.3\n" +
        "info: { title: Order API, version: 1.2.0 }\n" +
        "paths:\n" +
        "  /orders/{id}:\n" +
        "    get:\n" +
        "      operationId: getOrder\n" +
        "      parameters:\n" +
        "        - name: id\n" +
        "          in: path\n" +
        "          required: true\n" +
        "          schema: { type: string, format: uuid }\n" +
        "      responses:\n" +
        "        \u0027200\u0027:\n" +
        "          description: OK\n" +
        "          content:\n" +
        "            application/json:\n" +
        "              schema: { $ref: \u0027#/components/schemas/Order\u0027 }\n" +
        "        \u0027404\u0027:\n" +
        "          description: Không tìm thấy\n" +
        "          content:\n" +
        "            application/problem+json:\n" +
        "              schema: { $ref: \u0027#/components/schemas/Problem\u0027 }\n" +
        "components:\n" +
        "  schemas:\n" +
        "    Order:\n" +
        "      type: object\n" +
        "      required: [id, status, total]\n" +
        "      properties:\n" +
        "        id:     { type: string, format: uuid }\n" +
        "        status: { type: string, enum: [NEW, PAID, SHIPPED, CANCELLED] }\n" +
        "        total:  { type: number, format: double }\n" +
        "        note:   { type: string, nullable: true }   # field MỚI phải nullable",
    },
    {
      lang: "bash",
      title: "Quy trình và lợi ích",
      code:
        "# 1) Hai đội THỐNG NHẤT hợp đồng TRƯỚC khi viết code\n" +
        "# 2) Sinh code từ hợp đồng — server stub và client, cả hai phía\n" +
        "openapi-generator-cli generate -i openapi.yaml -g spring       -o server/\n" +
        "openapi-generator-cli generate -i openapi.yaml -g java -o client/\n" +
        "# 3) Consumer có thể dùng MOCK ngay, không phải chờ provider xong\n" +
        "prism mock openapi.yaml\n" +
        "# 4) Kiểm tra TƯƠNG THÍCH NGƯỢC trong CI — chặn thay đổi phá vỡ client\n" +
        "oasdiff breaking old.yaml new.yaml\n" +
        "\n" +
        "# VÌ SAO QUAN TRỌNG:\n" +
        "#  - hai đội làm SONG SONG thay vì tuần tự\n" +
        "#  - hợp đồng là nguồn sự thật duy nhất, không phải tài liệu Wiki đã lỗi thời\n" +
        "#  - thay đổi phá vỡ bị phát hiện lúc BUILD, không phải lúc chạy production\n" +
        "#  - tài liệu API luôn khớp với thực tế\n" +
        "\n" +
        "# Với gRPC thì contract-first là BẮT BUỘC: file .proto chính là hợp đồng.\n" +
        "protoc --java_out=. --grpc-java_out=. order.proto",
    },
  ],
},
{
  cat: 'Giao tiếp',
  id: 'microservices-mt4fxo',
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
  viz: {
    type: 'tree',
    title: 'Cách rẻ nhất để version là không cần version',
    root: {
      label: 'Tiến hoá API tương thích ngược',
      children: [
        { label: 'Backward-compatible evolution (~90% thay đổi)', note: 'chỉ thêm field optional; không xoá/đổi nghĩa/đổi kiểu' },
        { label: 'Versioned endpoint /v1 /v2', note: 'chạy song song, deprecate dần — biện pháp cuối cho breaking change' },
        { label: 'Content negotiation', note: 'Accept: application/vnd.acme.v2+json' },
        { label: 'Tolerant Reader', note: 'consumer chỉ đọc field mình cần, bỏ qua field lạ' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba cách đặt version và quy tắc thay đổi",
      code:
        "// 1) VERSION TRONG ĐƯỜNG DẪN — rõ ràng nhất, dễ định tuyến ở gateway\n" +
        "@RestController\n" +
        "@RequestMapping(\"/api/v2/orders\")\n" +
        "class OrderV2Controller { }\n" +
        "// + nhìn URL là biết version; cache/gateway phân biệt dễ\n" +
        "// - URL của cùng một tài nguyên bị nhân đôi\n" +
        "\n" +
        "// 2) VERSION TRONG HEADER — URL sạch, nhưng khó test bằng trình duyệt\n" +
        "@GetMapping(value = \"/orders/{id}\", headers = \"X-API-Version=2\")\n" +
        "// hoặc content negotiation:\n" +
        "@GetMapping(value = \"/orders/{id}\", produces = \"application/vnd.company.order.v2+json\")\n" +
        "\n" +
        "// 3) KHÔNG ĐẶT VERSION — chỉ thay đổi TƯƠNG THÍCH NGƯỢC. Đây là mục tiêu\n" +
        "//    lý tưởng và nên cố đạt được càng lâu càng tốt.\n" +
        "\n" +
        "// THAY ĐỔI AN TOÀN (không cần version mới):\n" +
        "//  - THÊM field TUỲ CHỌN vào response\n" +
        "//  - THÊM field TUỲ CHỌN có mặc định vào request\n" +
        "//  - THÊM endpoint mới, thêm giá trị enum mới (nếu client xử lý được giá trị lạ)\n" +
        "\n" +
        "// THAY ĐỔI PHÁ VỠ (cần version mới):\n" +
        "//  - XOÁ hoặc ĐỔI TÊN field, ĐỔI KIỂU dữ liệu\n" +
        "//  - làm field tuỳ chọn thành BẮT BUỘC\n" +
        "//  - đổi ngữ nghĩa của field (đơn vị tiền, múi giờ)\n" +
        "//  - đổi mã lỗi hoặc mã trạng thái HTTP\n" +
        "\n" +
        "// QUY TRÌNH NGỪNG HỖ TRỢ VERSION CŨ:\n" +
        "//  1) thông báo trước (3-6 tháng), thêm header cảnh báo\n" +
        "@GetMapping(\"/api/v1/orders/{id}\")\n" +
        "ResponseEntity<Order> getV1(@PathVariable String id) {\n" +
        "    return ResponseEntity.ok()\n" +
        "        .header(\"Deprecation\", \"true\")\n" +
        "        .header(\"Sunset\", \"Wed, 01 Apr 2026 00:00:00 GMT\")\n" +
        "        .body(order);\n" +
        "}\n" +
        "//  2) ĐO xem còn ai dùng (metric theo version + client id)\n" +
        "//  3) \"brownout\": tạm tắt vài giờ để client phát hiện\n" +
        "//  4) tắt hẳn",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-39bo23',
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
  viz: {
    type: 'tree',
    title: 'Service = đơn vị có thể thay thế, scale, deploy tuỳ ý',
    root: {
      label: '12-Factor: các điểm quan trọng cho microservices',
      children: [
        { label: 'Config trong biến môi trường', note: 'không hard-code trong code' },
        { label: 'Backing services gắn qua URL', note: 'DB, cache, broker thay được không sửa code' },
        { label: 'Stateless processes', note: 'state ở backing service → scale ngang, restart tự do' },
        { label: 'Disposability', note: 'khởi động nhanh, shutdown graceful' },
        { label: 'Logs là event stream ra stdout', note: 'không tự quản file' },
      ],
    },
  },
  demo: [
    {
      lang: "yaml",
      title: "Các factor quan trọng nhất, thể hiện bằng cấu hình",
      code:
        "apiVersion: apps/v1\n" +
        "kind: Deployment\n" +
        "spec:\n" +
        "  template:\n" +
        "    spec:\n" +
        "      containers:\n" +
        "        - name: order-service\n" +
        "          image: registry/order-service:1.4.0    # V. Build/Release/Run: image\n" +
        "                                                 # bất biến, tách khỏi config\n" +
        "          env:                                   # III. Config nằm trong MÔI TRƯỜNG\n" +
        "            - name: DB_URL\n" +
        "              valueFrom: { secretKeyRef: { name: db-secret, key: url } }\n" +
        "            - name: LOG_LEVEL\n" +
        "              value: INFO\n" +
        "          ports:\n" +
        "            - containerPort: 8080                # VII. Port binding: tự phục vụ HTTP\n" +
        "          resources:\n" +
        "            requests: { memory: 512Mi, cpu: 250m }\n" +
        "            limits:   { memory: 512Mi, cpu: \"1\" }\n" +
        "          lifecycle:\n" +
        "            preStop: { exec: { command: [\"sh\", \"-c\", \"sleep 5\"] } }\n" +
        "      terminationGracePeriodSeconds: 45          # IX. Disposability: tắt êm\n" +
        "  replicas: 3                                    # VIII. Concurrency: scale ngang",
    },
    {
      lang: "bash",
      title: "Mười hai factor và cái nào quan trọng nhất",
      code:
        "# I.    Codebase      — một repo, nhiều lần deploy\n" +
        "# II.   Dependencies  — khai báo tường minh (pom.xml, go.mod), không dựa vào máy\n" +
        "# III.  Config        — trong BIẾN MÔI TRƯỜNG, không hardcode, không đóng vào image\n" +
        "#                       -> quan trọng nhất: cùng một image chạy được mọi môi trường\n" +
        "# IV.   Backing services — DB/queue/cache là TÀI NGUYÊN GẮN THÊM, đổi bằng config\n" +
        "# V.    Build/release/run — tách bạch ba giai đoạn, release là bất biến\n" +
        "# VI.   Processes     — STATELESS, không lưu gì trong bộ nhớ giữa các request\n" +
        "#                       -> điều kiện tiên quyết để scale ngang và thay pod tuỳ ý\n" +
        "# VII.  Port binding  — service tự phục vụ HTTP, không cần app server bên ngoài\n" +
        "# VIII. Concurrency   — scale bằng cách thêm TIẾN TRÌNH, không phải thêm thread\n" +
        "# IX.   Disposability — khởi động nhanh, tắt êm (xử lý SIGTERM)\n" +
        "# X.    Dev/prod parity — môi trường giống nhau (container giúp rất nhiều)\n" +
        "# XI.   Logs          — ghi ra STDOUT, để hạ tầng thu thập\n" +
        "#                       -> KHÔNG tự ghi file, không tự xoay vòng log\n" +
        "# XII.  Admin processes — task quản trị chạy trong CÙNG môi trường\n" +
        "\n" +
        "# Ba factor quan trọng nhất với microservices: III (config), VI (stateless),\n" +
        "# XI (logs). Vi phạm chúng là không chạy được trên Kubernetes.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-1syeq92',
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
  viz: {
    type: 'flow',
    title: 'Feedback loop chặt: viết tệ thì chính mình bị gọi lúc 2h sáng',
    nodes: ['Team viết service', 'Team đó on-call production', 'Bị gọi khi service lỗi', 'Động lực: observability + resilience + alert', 'Sự cố giảm'],
    steps: [
      { to: 1, label: '"You build it, you run it" — không "ném qua tường" cho ops' },
      { to: 3, label: 'Thêm circuit breaker + queue + alert theo p99' },
      { to: 4, label: 'Cần platform team cung cấp "paved road" để không tự xây lại hạ tầng' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Đội viết code cũng là đội trực sự cố",
      code:
        "# Werner Vogels (Amazon): \"You build it, you run it.\"\n" +
        "# Đội tự chịu trách nhiệm TRỌN VÒNG ĐỜI: thiết kế, code, test, deploy,\n" +
        "# vận hành, on-call, và sửa lỗi production.\n" +
        "\n" +
        "# Thể hiện bằng metadata trên chính service — không phải bằng tài liệu:\n" +
        "apiVersion: backstage.io/v1alpha1\n" +
        "kind: Component\n" +
        "metadata:\n" +
        "  name: order-service\n" +
        "  annotations:\n" +
        "    pagerduty.com/service-id: PXXXXX\n" +
        "    github.com/project-slug: company/order-service\n" +
        "spec:\n" +
        "  type: service\n" +
        "  owner: team-orders               # AI sở hữu — bắt buộc\n" +
        "  lifecycle: production\n" +
        "  system: ecommerce\n" +
        "  providesApis: [order-api]\n" +
        "  consumesApis: [payment-api, inventory-api]",
    },
    {
      lang: "bash",
      title: "Vì sao mô hình này thay đổi hành vi",
      code:
        "# VÌ SAO HIỆU QUẢ: người bị đánh thức lúc 3 giờ sáng vì log thiếu thông tin\n" +
        "# sẽ tự động viết log tốt hơn. Vòng phản hồi ngắn lại, và chất lượng\n" +
        "# vận hành trở thành mối quan tâm của chính người viết code.\n" +
        "# Mô hình cũ (dev viết, ops chạy) tách rời trách nhiệm khỏi hậu quả.\n" +
        "\n" +
        "# ĐỘI SỞ HỮU CẦN CÓ:\n" +
        "#  - QUYỀN deploy bất cứ lúc nào, không xin phép\n" +
        "#  - QUYỀN chọn kỹ thuật trong khuôn khổ đã thống nhất\n" +
        "#  - TRÁCH NHIỆM về SLO, chi phí hạ tầng, và bảo mật của service\n" +
        "#  - on-call rotation riêng\n" +
        "\n" +
        "# ĐIỀU KIỆN ĐỂ KHÔNG KIỆT SỨC:\n" +
        "#  - đội đủ lớn để chia ca (tối thiểu 5-6 người)\n" +
        "#  - cảnh báo phải CÓ HÀNH ĐỘNG kèm theo (actionable), không phải nhiễu\n" +
        "#  - có runbook cho mọi cảnh báo\n" +
        "#  - PLATFORM TEAM lo phần hạ tầng chung (CI, monitoring, K8s) để đội\n" +
        "#    sản phẩm không phải tự dựng lại từng cái\n" +
        "#  - blameless postmortem: tập trung vào hệ thống, không vào cá nhân\n" +
        "#  - có ngân sách thời gian cho việc trả nợ kỹ thuật vận hành",
    },
  ],
},
{
  cat: 'Anti-pattern',
  id: 'microservices-19uakyf',
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
  viz: {
    type: 'tree',
    title: 'Hầu hết thất bại do ranh giới sai + thiếu nền tảng, không do công nghệ',
    root: {
      label: 'Anti-pattern khi mới bắt đầu',
      children: [
        { label: 'Tách quá sớm / quá nhỏ', note: 'chưa hiểu domain đã chia 15 service' },
        { label: 'Shared database', note: 'coupling qua schema' },
        { label: 'Chuỗi call đồng bộ sâu', note: 'latency cộng dồn, một lỗi sập cả chuỗi' },
        { label: 'Không có API gateway / cross-cutting', note: 'mỗi service tự làm auth/rate limit khác nhau' },
        { label: 'Thiếu observability', note: 'debug bằng "grep 8 service"' },
        { label: 'Shared library / common-service chứa business logic', note: 'đổi phải deploy hết' },
        { label: 'Entity service', note: 'user-service chỉ là CRUD bảng, không phải capability' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Mười sai lầm hay gặp nhất",
      code:
        "# 1) BẮT ĐẦU BẰNG MICROSERVICES khi chưa hiểu nghiệp vụ\n" +
        "#    -> ranh giới sai, và sửa ranh giới sau này rất đắt.\n" +
        "\n" +
        "# 2) CHIA THEO TẦNG KỸ THUẬT thay vì năng lực nghiệp vụ\n" +
        "\n" +
        "# 3) DÙNG CHUNG DATABASE -> distributed monolith\n" +
        "\n" +
        "# 4) THƯ VIỆN CHUNG chứa model nghiệp vụ -> mọi service phải nâng cấp cùng nhau\n" +
        "\n" +
        "# 5) CHUỖI CALL ĐỒNG BỘ SÂU: A -> B -> C -> D\n" +
        "#    Độ khả dụng NHÂN LÊN: bốn service 99,9% -> chuỗi chỉ còn 99,6%.\n" +
        "\n" +
        "# 6) KHÔNG CÓ TIMEOUT hoặc để timeout mặc định (thường là vô hạn)\n" +
        "#    -> một service chậm làm cạn thread pool của mọi service gọi nó.\n" +
        "\n" +
        "# 7) BỎ QUA OBSERVABILITY tới khi có sự cố -> không điều tra nổi\n" +
        "\n" +
        "# 8) SERVICE QUÁ NHỎ -> chi phí vận hành vượt giá trị\n" +
        "\n" +
        "# 9) DÙNG CHUNG một repo và một pipeline cho mọi service\n" +
        "#    -> không deploy độc lập được, mất lợi ích chính\n" +
        "\n" +
        "# 10) KHÔNG có contract testing -> chỉ phát hiện thay đổi phá vỡ ở production\n" +
        "\n" +
        "# CÁCH TRÁNH — theo thứ tự:\n" +
        "#  1) bắt đầu bằng MODULAR MONOLITH\n" +
        "#  2) tách service đầu tiên khi có LÝ DO CỤ THỂ (scale riêng, đội riêng,\n" +
        "#     công nghệ riêng), không phải vì kiến trúc \"nên như vậy\"\n" +
        "#  3) dựng nền tảng vận hành TRƯỚC service thứ ba\n" +
        "#  4) mỗi service: một repo, một pipeline, một database, một đội sở hữu",
    },
  ],
},
{
  cat: 'Phân rã',
  id: 'microservices-ckvr3l',
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
  viz: {
    type: 'compare',
    corner: 'Tín hiệu',
    cols: ['Ranh giới tốt', 'Ranh giới xấu'],
    rows: [
      ['% PR chạm nhiều repo', 'thấp (thay đổi cục bộ hoá)', 'cao (mỗi feature là cross-team epic)'],
      ['Deploy', 'không cần phối hợp lịch', 'nhiều service release cùng nhau'],
      ['Giao tiếp chéo', 'chủ yếu event bất đồng bộ', 'nhiều call đồng bộ'],
      ['Scale', 'mỗi service theo lý do riêng', 'phải scale cùng nhau'],
      ['API breaking change', 'hiếm', 'thường xuyên'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Các dấu hiệu đo được",
      code:
        "# DẤU HIỆU RANH GIỚI ĐÚNG:\n" +
        "# 1) Một yêu cầu nghiệp vụ điển hình sửa được trong MỘT service.\n" +
        "#    Đo bằng git: bao nhiêu % pull request chạm nhiều hơn một repo?\n" +
        "git log --since=\"3 months ago\" --name-only --pretty=format:\"%H\" | \\\n" +
        "  awk \u0027/^[0-9a-f]{40}$/{c=$0} /^services\\//{split($0,a,\"/\"); print c, a[2]}\u0027 | \\\n" +
        "  sort -u | awk \u0027{print $1}\u0027 | uniq -c | awk \u0027$1 > 1\u0027 | wc -l\n" +
        "#    Trên 30% commit chạm nhiều service -> ranh giới có vấn đề.\n" +
        "\n" +
        "# 2) Deploy ĐỘC LẬP được, không cần điều phối thứ tự.\n" +
        "# 3) Chuỗi call đồng bộ NÔNG (1-2 tầng cho phần lớn request).\n" +
        "# 4) Mỗi service có DATABASE riêng và không ai đọc DB của người khác.\n" +
        "# 5) Đội sở hữu hiểu trọn service; không cần hỏi đội khác để sửa một bug.\n" +
        "\n" +
        "# DẤU HIỆU RANH GIỚI SAI:\n" +
        "# - \"chatty\": hai service gọi nhau hàng chục lần cho một thao tác\n" +
        "#   -> chúng nên là MỘT service\n" +
        "# - luôn phải deploy cùng nhau -> nên gộp\n" +
        "# - một service chỉ làm CRUD cho service khác -> đó là repository, không\n" +
        "#   phải service\n" +
        "# - phải hỏi đội khác mỗi khi sửa một tính năng\n" +
        "\n" +
        "# ĐO ĐỘ GẮN KẾT bằng tracing: hai service nào gọi nhau nhiều nhất?\n" +
        "# Service map trong Jaeger/Datadog cho thấy ngay các cụm gắn chặt.\n" +
        "\n" +
        "# SỬA RANH GIỚI SAI: GỘP hai service lại (dễ) trước khi nghĩ tới việc\n" +
        "# chia lại theo cách khác (khó). Gộp không phải là thất bại — nó là\n" +
        "# phản hồi đúng với dữ liệu thực tế.",
    },
  ],
},
{
  cat: 'Nền tảng',
  id: 'microservices-fg9wby',
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
  viz: {
    type: 'tree',
    title: 'Quyết định socio-technical — tổ chức phù hợp thì thành công',
    root: {
      label: 'Cần thay đổi kèm theo, không chỉ code',
      children: [
        { label: 'Stream-aligned team cross-functional', note: 'mỗi team sở hữu vài service' },
        { label: 'Platform/Enabling team', note: '"paved road": template service, CI/CD, observability chuẩn, IaC module' },
        { label: 'Quy trình', note: 'trunk-based + feature flag + CD; decentralized decision' },
        { label: 'Governance nhẹ', note: 'chuẩn tối thiểu: health check, tracing header, security baseline' },
        { label: 'On-call & incident', note: 'mỗi team on-call service mình; runbook; blameless postmortem' },
      ],
    },
  },
  demo: [
    {
      lang: "yaml",
      title: "Mỗi service một pipeline độc lập",
      code:
        "# .github/workflows/order-service.yml\n" +
        "name: order-service\n" +
        "on:\n" +
        "  push:\n" +
        "    branches: [main]\n" +
        "    paths: [\u0027services/order-service/**\u0027]   # CHỈ build khi service này đổi\n" +
        "jobs:\n" +
        "  build-deploy:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - uses: actions/checkout@v4\n" +
        "      - name: Unit + contract test\n" +
        "        run: cd services/order-service && ./mvnw verify\n" +
        "      - name: Publish contract\n" +
        "        run: ./mvnw pact:publish              # công bố hợp đồng cho provider\n" +
        "      - name: Build & push image\n" +
        "        run: docker build -t $REG/order-service:${{ github.sha }} . && docker push ...\n" +
        "      - name: Deploy canary\n" +
        "        run: kubectl set image deploy/order-service app=$REG/order-service:${{ github.sha }}",
    },
    {
      lang: "bash",
      title: "Thay đổi về quy trình và văn hoá",
      code:
        "# THAY ĐỔI VỀ QUY TRÌNH:\n" +
        "# 1) DEPLOY ĐỘC LẬP và THƯỜNG XUYÊN: từ \"release train mỗi 2 tuần\" sang\n" +
        "#    \"mỗi đội deploy nhiều lần một ngày\". Đây là lợi ích chính; không đạt\n" +
        "#    được nó thì microservices chỉ còn chi phí.\n" +
        "# 2) MỘT REPO MỘT SERVICE (hoặc monorepo có path filter như trên) —\n" +
        "#    pipeline phải chạy độc lập.\n" +
        "# 3) TRUNK-BASED + FEATURE FLAG thay cho nhánh dài ngày.\n" +
        "# 4) CONTRACT TEST thay cho end-to-end test khổng lồ.\n" +
        "# 5) BACKWARD COMPATIBILITY là bắt buộc: trong lúc deploy, hai phiên bản\n" +
        "#    chạy song song.\n" +
        "\n" +
        "# THAY ĐỔI VỀ TỔ CHỨC:\n" +
        "# - đội theo SẢN PHẨM, không theo chuyên môn\n" +
        "# - đội tự chủ: tự quyết kỹ thuật trong khuôn khổ, tự deploy, tự on-call\n" +
        "# - cần PLATFORM TEAM lo hạ tầng chung, nếu không mỗi đội tự dựng lại\n" +
        "# - cần SERVICE CATALOG (Backstage) để biết ai sở hữu cái gì\n" +
        "# - cần quy ước chung được THỰC THI bằng công cụ: logging, tracing,\n" +
        "#   health check, versioning API — không phải bằng tài liệu\n" +
        "\n" +
        "# ĐO LƯỜNG (DORA metrics): tần suất deploy, thời gian từ commit tới\n" +
        "# production, tỉ lệ thay đổi gây lỗi, thời gian khôi phục.\n" +
        "# Bốn chỉ số này nói lên microservices có đang mang lại giá trị hay không.",
    },
  ],
},
]);
