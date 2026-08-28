SS.addQuestions('microservices', [
{
  cat: 'Hạ tầng',
  q: 'API Gateway làm gì? Khi nào cần?',
  answer:
    'Một điểm vào duy nhất cho client, đứng trước các service. Chức năng:\n' +
    '- **Routing**: `/orders/*` → order-service, `/users/*` → user-service.\n' +
    '- **Cross-cutting**: xác thực/uỷ quyền, rate limiting, quota, CORS, request/response transform.\n' +
    '- **Aggregation** đơn giản (hoặc để BFF lo).\n' +
    '- **TLS termination**, nén, cache response.\n' +
    '- Che giấu cấu trúc microservices; đổi service bên trong không ảnh hưởng client.\n\n' +
    'Cần khi có client bên ngoài (mobile, đối tác). Không cần đặt gateway *giữa các service nội bộ* (đó là việc của service mesh / gọi trực tiếp).',
  essence:
    'API Gateway gom các mối quan tâm chung ở biên (auth, rate limit, routing) để mỗi service không tự làm lại. Nó là ranh giới giữa "thế giới bên ngoài" và "mạng service nội bộ".',
  example:
    'Kong/Spring Cloud Gateway: client mobile gọi `api.acme.com/v1/orders` → gateway verify JWT, kiểm tra rate limit (100/phút/user), route tới `order-service` trong VPC. `order-service` không cần biết gì về JWT verification hay rate limit.',
  viz: {
    type: 'tree',
    title: 'Ranh giới giữa "thế giới bên ngoài" và "mạng service nội bộ"',
    root: {
      label: 'Một điểm vào duy nhất cho client — gom mối quan tâm chung ở biên',
      children: [
        { label: 'Routing', note: '/orders/* → order-service, /users/* → user-service' },
        { label: 'Cross-cutting', note: 'xác thực/uỷ quyền, rate limiting, quota, CORS, transform' },
        { label: 'TLS termination, nén, cache response', note: '' },
        { label: 'Che giấu cấu trúc microservices', note: 'đổi service bên trong không ảnh hưởng client' },
        { label: 'Không đặt giữa các service nội bộ', note: 'đó là việc của service mesh / gọi trực tiếp' },
      ],
    },
  },
},
{
  cat: 'Hạ tầng',
  q: 'Service Discovery: client-side vs server-side, các registry?',
  answer:
    'Service instance đến/đi liên tục (scale, deploy, crash) → cần cơ chế tìm "instance nào của service X đang sống ở đâu".\n\n' +
    '- **Self-registration + client-side discovery**: instance tự đăng ký vào registry (Eureka, Consul); client hỏi registry lấy danh sách rồi tự load balance.\n' +
    '- **Server-side discovery**: client gọi một địa chỉ ổn định (LB/DNS); hạ tầng lo việc tìm instance. Ví dụ **Kubernetes**: `http://order-service` → kube-dns → ClusterIP → kube-proxy chọn pod.\n\n' +
    'Kubernetes làm discovery "trong suốt" qua DNS + Service object → phần lớn hệ mới không cần Eureka/Consul riêng.',
  essence:
    'Discovery giải bài toán "địa chỉ động". Trên K8s nó gần như miễn phí (DNS + Service). Ngoài K8s hoặc cần load balancing thông minh hơn → registry riêng + client-side LB.',
  example:
    'K8s: `order-service` gọi `http://inventory-service.default.svc.cluster.local:8080` — DNS resolve thành ClusterIP, kube-proxy route tới một trong các pod healthy. Pod inventory scale từ 3→10 → không ai phải cấu hình gì.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Client-side discovery', 'Server-side discovery'],
    rows: [
      ['Cơ chế', 'instance tự đăng ký registry (Eureka/Consul); client hỏi + tự LB', 'client gọi địa chỉ ổn định (LB/DNS); hạ tầng tìm instance'],
      ['Trên Kubernetes', '—', 'http://order-service → kube-dns → ClusterIP → kube-proxy chọn pod'],
      ['Load balancing', 'thông minh (zone-aware, health)', 'cơ bản'],
      ['Khi nào chọn', 'ngoài K8s, cần LB tinh vi', 'trên K8s — gần như miễn phí'],
    ],
  },
},
{
  cat: 'Hạ tầng',
  q: 'Service Mesh (Istio/Linkerd) là gì? Khi nào đáng dùng?',
  answer:
    'Một lớp hạ tầng xử lý **giao tiếp service-to-service**, cài dưới dạng **sidecar proxy** (Envoy) cạnh mỗi service. Sidecar chặn mọi traffic vào/ra và cung cấp:\n' +
    '- **mTLS tự động** (mã hoá + xác thực giữa service, xoay cert).\n' +
    '- **Traffic management**: retry, timeout, circuit breaking, load balancing, canary (split % traffic), fault injection — **cấu hình bằng YAML, không sửa code**.\n' +
    '- **Observability**: metrics, distributed tracing, access log tự động cho mọi call.\n' +
    '- **Policy**: authorization giữa service, rate limit.\n\n' +
    'Đáng dùng khi: nhiều service, đa ngôn ngữ (không muốn viết lại thư viện resilience cho mỗi ngôn ngữ), cần mTLS toàn cụm, cần canary/traffic-shaping tinh vi. Nhược: thêm độ phức tạp, latency sidecar (~ms), tốn tài nguyên, đường cong học dốc.',
  essence:
    'Service mesh chuyển các mối quan tâm về "networking giữa service" (bảo mật, resilience, quan sát) từ **thư viện trong code** sang **hạ tầng bên ngoài** → nhất quán, không phụ thuộc ngôn ngữ. Đổi lại một tầng vận hành mới.',
  example:
    'Đội có service Java, Go, Python, Node. Không mesh: mỗi ngôn ngữ cần thư viện riêng cho mTLS + retry + tracing, cấu hình lệch nhau. Với Linkerd: cài sidecar → tất cả tự có mTLS, golden metrics, retry — cấu hình một chỗ.',
  viz: {
    type: 'flow',
    title: 'Chuyển "networking giữa service" từ thư viện trong code sang hạ tầng',
    nodes: ['Mọi traffic vào/ra service', 'Sidecar proxy (Envoy) chặn', 'mTLS + retry/timeout/circuit-break + LB + canary', 'Metrics + tracing + access log tự động', 'Cấu hình bằng YAML — không sửa code'],
    steps: [
      { to: 1, label: 'Cài cạnh mỗi service, không phụ thuộc ngôn ngữ' },
      { to: 2, label: 'Traffic management nhất quán cho Java/Go/Python/Node' },
      { to: 4, label: 'Đổi lại: một tầng vận hành mới, latency sidecar ~ms, đường cong học dốc' },
    ],
  },
},
{
  cat: 'Hạ tầng',
  q: 'Sidecar pattern là gì?',
  answer:
    'Chạy một **container/process phụ** cạnh service chính, trong cùng pod/host, chia sẻ vòng đời và network. Sidecar lo các chức năng phụ trợ để service chính chỉ tập trung nghiệp vụ:\n' +
    '- **Proxy** (Envoy trong service mesh) — mTLS, retry, LB, telemetry.\n' +
    '- **Log shipper** (Fluent Bit) — thu thập và gửi log.\n' +
    '- **Config sync** — kéo config mới nhất từ store.\n' +
    '- **Secrets agent** (Vault agent) — inject secret.\n\n' +
    'Ưu: tách biệt, tái dùng cho mọi service bất kể ngôn ngữ, nâng cấp độc lập. Nhược: tốn thêm tài nguyên mỗi pod, thêm độ phức tạp khởi động/tắt.',
  essence:
    'Sidecar = "trợ lý" đi kèm service, gánh các việc hạ tầng chung. Nó cho phép chuẩn hoá cross-cutting concern mà không nhét chúng vào codebase của từng service.',
  example:
    'Pod `order-service` có 2 container: `order-service` (nghiệp vụ) + `istio-proxy` (sidecar). Mọi HTTP call của order-service thực ra đi qua istio-proxy → được mTLS hoá, retry, đo latency, gắn trace header — code order-service không biết gì.',
  viz: {
    type: 'tree',
    title: '"Trợ lý" đi kèm service, gánh việc hạ tầng chung',
    root: {
      label: 'Container/process phụ trong cùng pod — chia sẻ vòng đời & network',
      children: [
        { label: 'Proxy (Envoy)', note: 'mTLS, retry, LB, telemetry' },
        { label: 'Log shipper (Fluent Bit)', note: 'thu thập và gửi log' },
        { label: 'Config sync', note: 'kéo config mới nhất từ store' },
        { label: 'Secrets agent (Vault agent)', note: 'inject secret lúc runtime' },
        { label: 'Đổi lại', note: 'tốn tài nguyên mỗi pod, thêm phức tạp khởi động/tắt' },
      ],
    },
  },
},
{
  cat: 'Hạ tầng',
  q: 'Quản lý config và secrets cho nhiều service?',
  answer:
    '**Config** (không nhạy cảm): biến môi trường, K8s **ConfigMap**, hoặc config server (Spring Cloud Config, Consul KV). Nên: config theo môi trường, hot-reload được, có version/audit, không nằm trong image.\n\n' +
    '**Secrets** (DB password, API key, cert): KHÔNG để trong ConfigMap/env plaintext/git. Dùng:\n' +
    '- **Vault** / **AWS Secrets Manager** / **K8s Secrets** (bật encryption at rest) + **External Secrets Operator**.\n' +
    '- **Rotation tự động** (đổi định kỳ, app đọc lại).\n' +
    '- Inject lúc runtime (sidecar agent, CSI driver), không build vào image.\n' +
    '- Least privilege: mỗi service chỉ đọc được secret của nó.',
  essence:
    'Config tách khỏi code (12-factor); secrets tách khỏi cả config thường và git, được mã hoá, phân quyền hẹp, xoay vòng. "Secret trong biến môi trường của Dockerfile" là lỗi bảo mật phổ biến.',
  example:
    'K8s + External Secrets Operator: `order-service` khai báo `ExternalSecret` trỏ tới `secret/prod/order/db-password` trong Vault. Operator đồng bộ thành K8s Secret, mount vào pod. Vault xoay password RDS mỗi 30 ngày → operator cập nhật → pod đọc lại.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Config (không nhạy cảm)', 'Secrets (password, API key, cert)'],
    rows: [
      ['Nơi lưu', 'env, ConfigMap, config server', 'Vault / Secrets Manager / K8s Secret (encryption at rest)'],
      ['Trong git?', 'được (theo môi trường)', 'KHÔNG — không plaintext, không git'],
      ['Rotation', 'ít cần', 'tự động, định kỳ, app đọc lại'],
      ['Phân quyền', 'thoáng', 'least privilege — mỗi service chỉ đọc secret của nó'],
      ['Inject', 'build/env', 'runtime (sidecar agent, CSI driver), không build vào image'],
    ],
  },
},
{
  cat: 'Quan sát',
  q: 'Correlation ID / Trace ID — vì sao bắt buộc trong microservices?',
  answer:
    'Một request người dùng đi qua N service, sinh ra log ở N nơi. Không có id chung → không thể ghép các mảnh log của **cùng một** request.\n\n' +
    'Cơ chế:\n' +
    '- Gateway/entry point sinh `traceId` (và `spanId`) nếu request chưa có.\n' +
    '- **Truyền qua mọi hop** trong header (`traceparent` của W3C Trace Context, hoặc `X-B3-*`).\n' +
    '- Mỗi service đưa `traceId` vào **mọi dòng log** (qua MDC / context) và mỗi span tracing.\n' +
    '- Truyền cả qua message (header của Kafka/RabbitMQ) để nối luồng async.\n\n' +
    'Khi điều tra sự cố: lọc log toàn hệ thống theo `traceId=abc` → thấy toàn bộ hành trình request.',
  essence:
    'Correlation ID là "sợi chỉ đỏ" xuyên qua kiến trúc phân tán. Không có nó, debug microservices = ghép hình mù. Đây là thứ đầu tiên phải làm khi bắt đầu microservices.',
  example:
    'User báo "đặt hàng lỗi lúc 14:32". Lấy `traceId` từ response error → Kibana query `traceId: "7f3a..."` → thấy: gateway OK → order-service OK → gọi payment-service → payment gọi bank-adapter → bank-adapter timeout 3s. Khoanh vùng trong 1 phút.',
  viz: {
    type: 'sequence',
    title: '"Sợi chỉ đỏ" xuyên qua kiến trúc phân tán',
    actors: ['gateway', 'order-svc', 'payment-svc', 'bank-adapter'],
    messages: [
      { from: 0, to: 1, label: 'sinh traceId nếu chưa có; header traceparent (W3C)' },
      { from: 1, to: 2, label: 'truyền traceId qua mọi hop' },
      { from: 2, to: 3, label: 'truyền cả qua header message Kafka/RabbitMQ (nối luồng async)' },
      { from: 3, to: 3, label: 'mỗi service ghi traceId vào MỌI dòng log (qua MDC)' },
      { from: 0, to: 0, label: 'điều tra: lọc log toàn hệ theo traceId=abc → toàn bộ hành trình' },
    ],
  },
},
{
  cat: 'Quan sát',
  q: 'Distributed tracing hoạt động thế nào? Sampling là gì?',
  answer:
    'Một **trace** = toàn bộ hành trình một request; gồm nhiều **span** (mỗi span = một đơn vị công việc: một HTTP call, một query DB, một xử lý). Span có `traceId` chung, `spanId` riêng, `parentSpanId`, thời gian bắt đầu/kết thúc, tags, events.\n\n' +
    'Context (`traceId`, `spanId`) được **propagate** qua header HTTP / metadata gRPC / header message. Mỗi service tạo span con, gửi về collector (Jaeger, Tempo, X-Ray) → dựng cây span + service map + timeline.\n\n' +
    '**Sampling**: chỉ lưu một phần trace (ví dụ 1–10%) vì lưu 100% quá tốn. Head-based (quyết định lúc bắt đầu) hoặc tail-based (giữ lại trace có lỗi/chậm).',
  essence:
    'Tracing trả lời "request này chậm/lỗi ở service nào, bước nào" — thứ metric và log riêng lẻ không làm được. Sampling giữ chi phí lưu trữ hợp lý; tail-based sampling đảm bảo không bỏ sót trace lỗi.',
  example:
    'p99 API `/checkout` tăng. Mở Jaeger, lọc `checkout` p99 → thấy span `inventory.reserve` chiếm 800/900ms, bên trong là span `SELECT ... FOR UPDATE` chờ lock. → vấn đề là contention lock ở inventory DB, không phải mạng.',
  viz: {
    type: 'tree',
    title: 'Trả lời "request chậm/lỗi ở service nào, bước nào"',
    root: {
      label: 'Trace = hành trình một request; span = một đơn vị công việc',
      children: [
        { label: 'Span có traceId chung + spanId + parentSpanId', note: 'thời gian bắt đầu/kết thúc, tags, events' },
        { label: 'Context propagate qua header/metadata', note: 'HTTP, gRPC, header message' },
        { label: 'Collector dựng cây span', note: 'Jaeger/Tempo/X-Ray → service map + timeline' },
        { label: 'Sampling', note: 'head-based (lúc bắt đầu) hoặc tail-based (giữ trace lỗi/chậm) — lưu 100% quá tốn' },
      ],
    },
  },
},
{
  cat: 'Quan sát',
  q: 'Metrics: RED và USE method là gì?',
  answer:
    '**RED** (cho service / request-driven):\n' +
    '- **Rate**: số request/giây.\n' +
    '- **Errors**: số/tỉ lệ request lỗi.\n' +
    '- **Duration**: phân bố latency (p50/p95/p99).\n\n' +
    '**USE** (cho tài nguyên: CPU, memory, disk, network, connection pool):\n' +
    '- **Utilization**: % thời gian tài nguyên bận.\n' +
    '- **Saturation**: mức độ "xếp hàng" (queue length, load).\n' +
    '- **Errors**: lỗi của tài nguyên.\n\n' +
    'Dashboard mỗi service nên có RED ở trên (sức khoẻ dịch vụ) và USE ở dưới (tài nguyên).',
  essence:
    'RED nhìn từ góc người dùng ("dịch vụ có đang phục vụ tốt không"). USE nhìn từ góc tài nguyên ("cái gì sắp cạn"). Kết hợp: RED phát hiện triệu chứng, USE chỉ ra nguyên nhân.',
  example:
    'Alert: RED cho `order-service` — error rate 5%, p99 tăng gấp 3. Nhìn USE: `db-connection-pool` saturation 100% (mọi connection đang dùng, request xếp hàng). Nguyên nhân: một query mới thiếu index giữ connection lâu. Thêm index → cả RED và USE trở lại bình thường.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['RED (service / request)', 'USE (tài nguyên)'],
    rows: [
      ['Chỉ số', 'Rate, Errors, Duration (p50/p95/p99)', 'Utilization, Saturation, Errors'],
      ['Góc nhìn', 'người dùng — "dịch vụ phục vụ tốt không"', 'tài nguyên — "cái gì sắp cạn"'],
      ['Vai trò', 'phát hiện triệu chứng', 'chỉ ra nguyên nhân'],
      ['Vị trí dashboard', 'ở trên', 'ở dưới'],
    ],
  },
},
{
  cat: 'Quan sát',
  q: 'SLI, SLO, SLA và Error Budget?',
  answer:
    '- **SLI** (Indicator): thước đo cụ thể về chất lượng dịch vụ. Ví dụ: "tỉ lệ request `/checkout` trả 2xx trong < 500ms".\n' +
    '- **SLO** (Objective): mục tiêu nội bộ cho SLI. Ví dụ: "99.9% trong 30 ngày".\n' +
    '- **SLA** (Agreement): cam kết với khách hàng, thường lỏng hơn SLO, kèm hậu quả (hoàn tiền) nếu vi phạm.\n' +
    '- **Error Budget** = 100% − SLO. SLO 99.9% → budget = 0.1% request được phép fail (~43 phút/tháng).\n\n' +
    'Dùng error budget để **cân bằng tốc độ và ổn định**: còn budget → cứ deploy tính năng mới nhanh; hết budget → freeze feature, tập trung fix độ tin cậy.',
  essence:
    'SLO biến "độ tin cậy" từ khái niệm mơ hồ thành con số có thể quản lý. Error budget là công cụ ra quyết định: nó cho phép chấp nhận rủi ro *có kiểm soát* thay vì đòi "100% uptime" (bất khả thi và vô cùng đắt).',
  example:
    'SLO `payment-service` = 99.95% success. Tháng này đã tiêu 80% error budget vì một sự cố. Quyết định: hoãn ra mắt tính năng "split payment" (rủi ro), dành 2 tuần fix retry logic + thêm circuit breaker. Tháng sau budget hồi → tiếp tục.',
  viz: {
    type: 'layers',
    title: 'Biến "độ tin cậy" thành con số quản lý được',
    dir: 'up',
    layers: [
      { name: 'SLI (Indicator)', tag: 'thước đo', note: '"tỉ lệ request /checkout trả 2xx trong < 500ms"' },
      { name: 'SLO (Objective)', tag: 'mục tiêu nội bộ', note: '"99.9% trong 30 ngày"' },
      { name: 'SLA (Agreement)', tag: 'cam kết khách hàng', note: 'lỏng hơn SLO, kèm hậu quả (hoàn tiền) nếu vi phạm' },
      { name: 'Error Budget = 100% − SLO', tag: '0.1% ≈ 43 phút/tháng', note: 'còn budget → deploy nhanh; hết budget → freeze feature, fix độ tin cậy' },
    ],
  },
},
{
  cat: 'Triển khai',
  q: 'Blue-green và Canary deployment cho microservices?',
  answer:
    '- **Blue-green**: dựng môi trường mới (green) song song với cũ (blue), chạy đủ N service phiên bản mới, test, rồi **chuyển toàn bộ traffic** sang green. Rollback = trỏ lại blue **tức thì**. Tốn 2x tài nguyên tạm thời.\n' +
    '- **Canary**: chuyển **một phần nhỏ** traffic (1% → 5% → 25% → 100%) sang phiên bản mới, quan sát metric (error rate, latency, business KPI) mỗi bước; lỗi → tự rollback. Blast radius nhỏ.\n\n' +
    'Với K8s + service mesh: canary bằng cách split % traffic ở VirtualService; với chỉ K8s: nhiều Deployment + điều chỉnh replica; hoặc Argo Rollouts / Flagger tự động hoá.',
  essence:
    'Blue-green cho rollback tức thì (đổi một công tắc). Canary cho phát hiện lỗi sớm với ít người dùng bị ảnh hưởng. Canary + phân tích metric tự động + auto-rollback là tiêu chuẩn vàng cho CD.',
  example:
    'Flagger + Istio: deploy `order-service:v2`. Flagger route 5% traffic sang v2, so sánh error rate & p99 với v1 trong 5 phút. OK → tăng 10%, 25%… tới 100%. Nếu error rate v2 > 1% → tự động route về v1 100%, alert team.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Blue-green', 'Canary'],
    rows: [
      ['Chuyển traffic', 'toàn bộ một lần (sau khi test green)', 'từng phần: 1% → 5% → 25% → 100%'],
      ['Rollback', 'tức thì — trỏ lại blue', 'tự route về v1 khi metric xấu'],
      ['Blast radius nếu lỗi lọt', 'lớn (100% user)', 'nhỏ (vài % user)'],
      ['Tài nguyên', '2x tạm thời', 'gần 1x'],
    ],
  },
},
{
  cat: 'Triển khai',
  q: 'Feature Flags và trunk-based development trong microservices?',
  answer:
    '**Feature flag**: bọc code tính năng mới trong điều kiện bật/tắt runtime (không cần deploy để bật/tắt).\n\n' +
    'Lợi ích với microservices:\n' +
    '- **Tách deploy khỏi release**: deploy code tắt flag → bật sau khi sẵn sàng, hoặc bật dần theo % user / cohort.\n' +
    '- **Kill switch**: tính năng gây sự cố → tắt flag ngay, không cần rollback deploy.\n' +
    '- Cho phép **trunk-based** (merge vào main liên tục, không long-lived branch) — code chưa xong nằm sau flag tắt.\n' +
    '- A/B test, gradual rollout.\n\n' +
    'Rủi ro: flag tích tụ (tech debt) → cần quy trình dọn flag cũ; test cả hai nhánh.',
  essence:
    'Feature flag biến "release" từ sự kiện rủi ro (deploy) thành thao tác cấu hình có thể đảo ngược tức thì. Là mảnh ghép cho continuous deployment an toàn.',
  example:
    'Tính năng "thanh toán trả góp" chạm 3 service. Merge code từng phần vào main sau flag `installment.enabled=false`. Khi cả 3 service đã deploy → bật flag cho 5% user nội bộ → 100% khách VIP → toàn bộ. Phát hiện bug tính lãi → tắt flag trong 5 giây.',
  viz: {
    type: 'flow',
    title: 'Tách "release" khỏi "deploy" — đảo ngược tức thì',
    nodes: ['Merge code vào main sau flag TẮT', 'Deploy (flag vẫn tắt)', 'Bật flag dần: 5% nội bộ → VIP → toàn bộ', 'Bug → tắt flag ngay (kill switch)'],
    steps: [
      { to: 0, label: 'Trunk-based: không long-lived branch, code chưa xong nằm sau flag' },
      { to: 2, label: 'Gradual rollout theo % user / cohort; A/B test' },
      { to: 3, label: 'Không cần rollback deploy — chỉ đổi cấu hình. Rủi ro: flag tích tụ → cần quy trình dọn' },
    ],
  },
},
{
  cat: 'Hạ tầng',
  q: 'Kubernetes cơ bản cho microservices: Deployment, Service, Ingress, HPA?',
  answer:
    '- **Deployment**: khai báo "muốn N replica của image X", K8s duy trì, rolling update, rollback.\n' +
    '- **Service**: địa chỉ ảo ổn định (ClusterIP) + load balancing tới các pod của một Deployment. Là service discovery nội cụm (qua DNS).\n' +
    '- **Ingress** (hoặc Gateway API): route HTTP từ ngoài vào các Service theo host/path, TLS termination.\n' +
    '- **HPA** (Horizontal Pod Autoscaler): tự tăng/giảm replica theo CPU/memory/custom metric (RPS, queue length).\n' +
    '- **ConfigMap/Secret**: config & secret. **PodDisruptionBudget**: giữ tối thiểu pod khi bảo trì node.',
  essence:
    'K8s cung cấp sẵn các nền tảng cốt lõi cho microservices: scaling, self-healing, rolling deploy, service discovery, config. Đó là lý do nó gần như mặc định cho microservices.',
  example:
    '`order-service`: Deployment 3 replica; Service `order-service:8080`; HPA scale 3→20 khi CPU > 70%; Ingress route `api.acme.com/orders` → Service; PDB `minAvailable: 2` để nâng cấp node không làm mất hết pod.',
  viz: {
    type: 'tree',
    title: 'K8s cung cấp sẵn nền tảng cốt lõi cho microservices',
    root: {
      label: 'Scaling, self-healing, rolling deploy, discovery, config',
      children: [
        { label: 'Deployment', note: '"muốn N replica của image X" — duy trì, rolling update, rollback' },
        { label: 'Service', note: 'ClusterIP ổn định + LB tới pod; discovery nội cụm qua DNS' },
        { label: 'Ingress / Gateway API', note: 'route HTTP từ ngoài theo host/path, TLS termination' },
        { label: 'HPA', note: 'tự tăng/giảm replica theo CPU/memory/custom metric' },
        { label: 'ConfigMap/Secret + PodDisruptionBudget', note: 'config & secret; giữ tối thiểu pod khi bảo trì node' },
      ],
    },
  },
},
{
  cat: 'Triển khai',
  q: 'Zero-downtime deployment và graceful shutdown cho một service?',
  answer:
    'Rolling update: K8s tạo pod mới, chờ **readiness** pass, rồi mới tắt pod cũ. Để không rớt request:\n' +
    '1. Pod cũ nhận `SIGTERM` → **readiness fail ngay** (LB ngừng gửi request mới).\n' +
    '2. Chờ `terminationGracePeriodSeconds` để xử lý nốt request đang chạy.\n' +
    '3. App: `server.shutdown=graceful` — ngừng nhận request mới, chờ in-flight xong, đóng connection pool, commit/flush.\n' +
    '4. Consumer message: dừng poll, xử lý & ack nốt batch hiện tại, commit offset, rời group sạch.\n\n' +
    'DB migration: chỉ dùng thay đổi **tương thích ngược** (expand-contract) để phiên bản cũ và mới cùng chạy được trong lúc rollover.',
  essence:
    'Zero-downtime deploy là sự phối hợp: orchestrator (chờ readiness, gửi SIGTERM) + app (graceful shutdown) + schema (backward-compatible). Thiếu một mắt xích → mỗi lần deploy là một đợt lỗi 5xx nhỏ.',
  example:
    'Deploy `order-service`: `preStop` hook sleep 5s (cho endpoints controller cập nhật), readiness fail on SIGTERM, `terminationGracePeriodSeconds: 30`, Spring `graceful` shutdown. Kết quả: 12 request đang xử lý hoàn tất, 0 lỗi 5xx trong suốt rollout.',
  viz: {
    type: 'states',
    title: 'Phối hợp: orchestrator + app graceful shutdown + schema backward-compatible',
    start: 0,
    states: ['Running', 'SIGTERM', 'Draining', 'Stopped'],
    transitions: [
      { from: 0, to: 1, label: 'K8s tạo pod mới, readiness pass, rồi gửi SIGTERM' },
      { from: 1, to: 2, label: 'readiness fail ngay → LB ngừng gửi request mới' },
      { from: 2, to: 3, label: 'chờ in-flight xong, đóng pool, commit; consumer ack nốt batch, rời group' },
    ],
  },
},
{
  cat: 'Quan sát',
  q: 'Alerting: symptom-based vs cause-based, cách tránh alert fatigue?',
  answer:
    '**Cause-based alert**: "CPU của pod X > 90%", "disk 80%". Nhiều, ồn, thường không actionable (CPU cao có thể hoàn toàn bình thường).\n\n' +
    '**Symptom-based alert** (khuyến nghị): alert vào thứ **người dùng cảm nhận** — SLO bị đe doạ: "error rate `/checkout` > 1% trong 5 phút", "p99 > 1s", "error budget burn rate cao".\n\n' +
    'Chống alert fatigue:\n' +
    '- Chỉ alert (page) khi **cần con người hành động ngay**; còn lại → ticket/dashboard.\n' +
    '- Dùng **burn-rate alert** đa cửa sổ (nhanh + chậm) thay vì ngưỡng tĩnh.\n' +
    '- Gộp alert liên quan; có runbook cho mỗi alert.\n' +
    '- Review định kỳ: alert nào chưa từng dẫn tới hành động → xoá.',
  essence:
    'Alert dựa trên triệu chứng (SLO) ít hơn, có ý nghĩa hơn, và trực tiếp phản ánh trải nghiệm người dùng. Alert dựa trên nguyên nhân dùng để *chẩn đoán sau khi đã có triệu chứng*, không phải để đánh thức người ta.',
  example:
    'Bỏ 40 alert kiểu "pod CPU cao", "GC pause > 200ms". Thay bằng: 1 alert/service dựa trên "SLO error budget burn rate > 14.4x trong 1h AND > 6x trong 6h". Số lần bị page giảm từ ~15/tuần xuống ~2/tuần, mỗi lần đều là sự cố thật.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Cause-based alert', 'Symptom-based alert (khuyến nghị)'],
    rows: [
      ['Ví dụ', 'CPU pod > 90%, disk 80%', 'error rate /checkout > 1% / 5 phút, p99 > 1s'],
      ['Đặc điểm', 'nhiều, ồn, thường không actionable', 'ít hơn, phản ánh trải nghiệm người dùng'],
      ['Vai trò', 'chẩn đoán SAU khi có triệu chứng', 'đánh thức người khi cần hành động ngay'],
      ['Kỹ thuật', 'ngưỡng tĩnh', 'burn-rate alert đa cửa sổ (nhanh + chậm)'],
    ],
  },
},
{
  cat: 'Hạ tầng',
  q: 'GitOps và CI/CD pipeline cho microservices?',
  answer:
    '**CI per service**: mỗi repo service có pipeline riêng — build, unit + contract test, security scan, build image, push registry. Deploy độc lập.\n\n' +
    '**GitOps** (Argo CD / Flux): trạng thái cluster mong muốn được khai báo trong **git** (manifest K8s / Helm / Kustomize). Một agent trong cluster **đồng bộ** git → cluster liên tục.\n' +
    '- Git là nguồn sự thật duy nhất; mọi thay đổi qua PR → review + audit trail.\n' +
    '- Rollback = git revert.\n' +
    '- Drift detection: cluster bị sửa tay → agent tự đưa về đúng git.\n\n' +
    'Luồng: CI build image `v1.2.3` → cập nhật tag trong repo manifest (tự động qua PR) → Argo CD thấy → apply → deploy.',
  essence:
    'GitOps biến "deploy" thành "merge một PR". Toàn bộ trạng thái hệ thống được version hoá, review được, revert được. Mỗi service có pipeline riêng → deploy độc lập là mặc định.',
  example:
    'Dev merge feature vào `order-service` → GitHub Actions build & test & push `order-service:sha-abc` → tự tạo PR vào repo `deploy-manifests` sửa image tag → team lead approve → Argo CD sync → K8s rolling update. Sự cố → revert PR manifest → Argo đưa về v cũ.',
  viz: {
    type: 'flow',
    title: '"Deploy" trở thành "merge một PR"',
    nodes: ['CI per service: build + test + scan + push image', 'Cập nhật image tag trong git manifest (PR)', 'Agent (Argo CD/Flux) thấy thay đổi', 'Sync git → cluster', 'Deploy (rolling update)'],
    steps: [
      { to: 1, label: 'Mỗi repo service pipeline riêng → deploy độc lập là mặc định' },
      { to: 2, label: 'Git là nguồn sự thật duy nhất; mọi thay đổi qua PR → review + audit' },
      { to: 4, label: 'Rollback = git revert; drift detection: sửa tay → agent kéo về đúng git' },
    ],
  },
},
{
  cat: 'Quan sát',
  q: 'Ba trụ cột observability (metrics, logs, traces) phối hợp thế nào?',
  answer:
    'Không phải chọn một — chúng bổ sung nhau, nối bằng **trace/correlation id**:\n\n' +
    '1. **Metrics** (rẻ, lưu lâu, tổng hợp): phát hiện "có vấn đề" — alert khi SLO bị đe doạ, xem xu hướng.\n' +
    '2. **Traces** (mẫu, có cấu trúc): khoanh vùng "ở service/bước nào" — mở trace của request chậm, thấy span nào tốn thời gian.\n' +
    '3. **Logs** (chi tiết, đắt): giải thích "tại sao" — lọc log theo `traceId` của request đó, đọc error message, stack trace, giá trị biến.\n\n' +
    'Quy trình điều tra: metric alert → nhảy sang exemplar trace → từ trace nhảy sang log cùng traceId. OpenTelemetry chuẩn hoá cả ba.',
  essence:
    'Metrics = "có gì đó sai" (khi nào). Traces = "sai ở đâu". Logs = "tại sao". Một quy trình điều tra tốt đi qua cả ba theo thứ tự đó, được liên kết bằng id chung.',
  example:
    'Alert: `error_rate{service="payment"}` tăng. Grafana có exemplar → click vào điểm dữ liệu lỗi → mở trace trong Tempo → span `bank-adapter.charge` báo error → copy `traceId` → Loki `{service="bank-adapter"} |= "7f3a"` → log: "TLS handshake failed: certificate expired". Nguyên nhân rõ trong 3 phút.',
  viz: {
    type: 'flow',
    title: 'Nối bằng id chung — OpenTelemetry chuẩn hoá cả ba',
    nodes: ['Metrics: "có gì đó sai" (khi nào)', 'Traces: "sai ở service/bước nào"', 'Logs: "tại sao"'],
    steps: [
      { to: 0, label: 'Rẻ, lưu lâu, tổng hợp — alert khi SLO bị đe doạ' },
      { to: 1, label: 'Từ exemplar nhảy sang trace của request chậm → span nào tốn thời gian' },
      { to: 2, label: 'Lọc log theo traceId → error message, stack trace, giá trị biến' },
    ],
  },
},
{
  cat: 'Quan sát',
  q: 'Structured logging: log gì, mức nào, xử lý PII thế nào?',
  answer:
    '**Structured** (JSON) thay vì text tự do → parse/query/aggregate được (Loki, ELK).\n\n' +
    'Mỗi log line nên có: `timestamp`, `level`, `service`, `traceId`/`spanId`, `message`, và context (`userId`, `orderId`…) dưới dạng field riêng, không nhét vào message.\n\n' +
    'Mức: `ERROR` (cần xem, có thể alert), `WARN` (bất thường nhưng xử lý được), `INFO` (sự kiện nghiệp vụ quan trọng), `DEBUG` (tắt ở prod, bật tạm khi điều tra).\n\n' +
    'PII: **không log** mật khẩu, token, số thẻ, CVV; mask/hash email, phone (`a***@x.com`); tuân thủ GDPR về retention log.',
  essence:
    'Log là event stream có cấu trúc, ra stdout, gắn traceId, không chứa PII/secret. "Log để grep" đã lỗi thời — log để query và tương quan với trace/metric.',
  example:
    '`{"ts":"...","level":"ERROR","service":"payment","traceId":"7f3a","event":"charge_failed","orderId":123,"provider":"stripe","errorCode":"card_declined"}` — query được "tất cả charge_failed của provider stripe hôm nay", nối được với trace 7f3a. KHÔNG có số thẻ trong đó.',
  viz: {
    type: 'tree',
    title: 'Log để query và tương quan với trace/metric — không phải "để grep"',
    root: {
      label: 'Structured (JSON) thay vì text tự do',
      children: [
        { label: 'Field bắt buộc', note: 'timestamp, level, service, traceId/spanId, message' },
        { label: 'Context là field riêng', note: 'userId, orderId… không nhét vào message' },
        { label: 'Mức', note: 'ERROR (alert được), WARN (bất thường xử lý được), INFO (sự kiện nghiệp vụ), DEBUG (tắt ở prod)' },
        { label: 'PII', note: 'KHÔNG log mật khẩu/token/số thẻ/CVV; mask email/phone; tuân thủ GDPR retention' },
      ],
    },
  },
},
{
  cat: 'Quan sát',
  q: 'Quy trình điều tra một request lỗi trong hệ microservices?',
  answer:
    '1. **Lấy định danh**: từ user/support lấy `traceId` (nên đưa vào error response & UI) hoặc thời điểm + endpoint + userId.\n' +
    '2. **Metric**: xác nhận phạm vi — chỉ một request hay error rate tăng chung? Bắt đầu từ khi nào? Trùng với deploy nào?\n' +
    '3. **Trace**: mở trace theo `traceId` → service map + timeline → span nào lỗi/chậm.\n' +
    '4. **Log**: lọc log toàn hệ theo `traceId` → error message, stack trace, giá trị input.\n' +
    '5. **Reproduce** nếu cần: gọi lại với input đó ở staging.\n' +
    '6. **Fix + postmortem** (blameless): thêm test, cải thiện alert/observability để lần sau nhanh hơn.',
  essence:
    'Điều tra hiệu quả = đi từ tổng quan (metric: phạm vi & thời điểm) → khoanh vùng (trace: service/bước) → chi tiết (log: nguyên nhân), tất cả nối bằng traceId. Không có traceId thì bước 3–4 bất khả thi.',
  example:
    'Support forward `traceId=9c2f` từ màn hình lỗi của khách. Grafana: error rate `checkout` bình thường → chỉ request này. Jaeger 9c2f: span `inventory.reserve` → error. Loki `9c2f`: "OptimisticLockException on stock row sku=X". → hai người mua cái cuối cùng cùng lúc; cần retry hoặc pessimistic lock cho hàng khan hiếm.',
  viz: {
    type: 'flow',
    title: 'Tổng quan → khoanh vùng → chi tiết, nối bằng traceId',
    nodes: ['Lấy định danh (traceId từ error response/UI)', 'Metric: phạm vi & thời điểm (1 request hay tăng chung? trùng deploy nào?)', 'Trace: service map + timeline → span nào lỗi/chậm', 'Log: lọc theo traceId → error message, stack, input', 'Reproduce ở staging nếu cần', 'Fix + postmortem (blameless): thêm test, cải thiện alert'],
    steps: [
      { to: 1, label: 'Không có traceId thì bước 3–4 bất khả thi' },
      { to: 2, label: 'Xác nhận phạm vi trước khi đào sâu' },
      { to: 3, label: 'Khoanh vùng service/bước' },
      { to: 5, label: 'Lần sau nhanh hơn' },
    ],
  },
},
{
  cat: 'Hạ tầng',
  q: 'Chi phí và hiệu quả tài nguyên của hạ tầng microservices?',
  answer:
    'Microservices tốn hơn monolith cùng tải vì:\n' +
    '- **Overhead cố định mỗi service**: JVM/runtime baseline memory, sidecar (Envoy ~50–100MB), health check, min replica (thường ≥ 2 cho HA) → N service × overhead.\n' +
    '- **Network**: serialization, TLS, nhiều hop.\n' +
    '- **Duplication**: mỗi service bản sao dữ liệu + cache.\n\n' +
    'Tối ưu:\n' +
    '- Right-size requests/limits (đừng để mỗi pod xin 2GB "cho chắc").\n' +
    '- **Scale-to-zero** cho service ít dùng (Knative, KEDA).\n' +
    '- Runtime nhẹ (GraalVM native, Go) cho service nhỏ.\n' +
    '- Gộp service quá nhỏ; bin-packing pod lên node hiệu quả; Spot instance cho workload chịu gián đoạn.',
  essence:
    'Mỗi service có "thuế cố định" (overhead runtime + sidecar + min replica). 30 nano-service có thể tốn gấp 3 lần một service hợp lý cùng chức năng. Right-sizing và gộp service nhỏ là đòn bẩy chi phí lớn.',
  example:
    'Audit cluster: 40 service, mỗi cái xin 1GB RAM / 0.5 vCPU nhưng thực dùng 200MB / 0.05 vCPU → cluster to gấp 5 lần cần thiết. Giảm requests theo số liệu thật + gộp 12 nano-service thành 4 → hoá đơn K8s giảm 55%.',
  viz: {
    type: 'tree',
    title: 'Mỗi service có "thuế cố định" — 30 nano-service tốn gấp 3 lần một service hợp lý',
    root: {
      label: 'Microservices tốn hơn monolith cùng tải',
      children: [
        { label: 'Overhead cố định mỗi service', note: 'runtime baseline memory, sidecar (~50–100MB), health check, min replica ≥ 2 → N × overhead' },
        { label: 'Network', note: 'serialization, TLS, nhiều hop' },
        { label: 'Duplication', note: 'mỗi service bản sao dữ liệu + cache' },
        { label: 'Tối ưu', note: 'right-size requests/limits, scale-to-zero (Knative/KEDA), runtime nhẹ (GraalVM/Go), gộp service nhỏ, Spot instance' },
      ],
    },
  },
},
{
  cat: 'Hạ tầng',
  q: 'mTLS và zero-trust networking cho microservices?',
  answer:
    '**Zero-trust**: không tin request chỉ vì nó ở trong mạng nội bộ ("perimeter security" không đủ — kẻ tấn công vào được một pod là đi khắp nơi).\n\n' +
    '**mTLS** (mutual TLS): cả client và server đều trình cert và verify lẫn nhau cho mọi call service-to-service → mã hoá + xác thực danh tính hai chiều.\n\n' +
    'Thực hiện qua **service mesh**: sidecar tự cấp cert ngắn hạn (SPIFFE identity), tự xoay, tự verify. Kèm **authorization policy**: "chỉ `order-service` được gọi `payment-service`, không service nào khác".',
  essence:
    'Trong microservices, "mạng nội bộ" không phải vùng an toàn. mTLS + policy khiến mỗi call phải chứng minh danh tính và được phép — một pod bị chiếm không tự động truy cập được service khác.',
  example:
    'Istio `PeerAuthentication: STRICT` (bắt buộc mTLS) + `AuthorizationPolicy` cho `payment-service`: chỉ chấp nhận call từ service account `order-service`. Kẻ tấn công chiếm được pod `notification-service` → không gọi được `payment-service` (policy từ chối) và không giải mã được traffic (mTLS).',
  viz: {
    type: 'tree',
    title: '"Mạng nội bộ" không phải vùng an toàn',
    root: {
      label: 'Một pod bị chiếm không tự động truy cập được service khác',
      children: [
        { label: 'Zero-trust', note: 'không tin request chỉ vì nó ở mạng nội bộ — perimeter security không đủ' },
        { label: 'mTLS hai chiều', note: 'client + server đều trình cert và verify lẫn nhau cho mọi call → mã hoá + xác thực' },
        { label: 'Service mesh cấp cert ngắn hạn', note: 'SPIFFE identity, tự xoay, tự verify' },
        { label: 'Authorization policy', note: '"chỉ order-service được gọi payment-service, không service nào khác"' },
      ],
    },
  },
},
]);
