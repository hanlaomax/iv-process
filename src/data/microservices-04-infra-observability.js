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
  demo: [
    {
      lang: "yaml",
      title: "Điểm vào duy nhất và các mối quan tâm chung",
      code:
        "apiVersion: networking.k8s.io/v1\n" +
        "kind: Ingress\n" +
        "metadata:\n" +
        "  name: api-gateway\n" +
        "  annotations:\n" +
        "    nginx.ingress.kubernetes.io/limit-rps: \"100\"\n" +
        "    nginx.ingress.kubernetes.io/enable-cors: \"true\"\n" +
        "spec:\n" +
        "  rules:\n" +
        "    - host: api.example.com\n" +
        "      http:\n" +
        "        paths:\n" +
        "          - path: /orders\n" +
        "            pathType: Prefix\n" +
        "            backend: { service: { name: order-service, port: { number: 8080 } } }\n" +
        "          - path: /payments\n" +
        "            pathType: Prefix\n" +
        "            backend: { service: { name: payment-service, port: { number: 8080 } } }",
    },
    {
      lang: "bash",
      title: "Gateway lo gì, và khi nào KHÔNG cần",
      code:
        "# GATEWAY LO CÁC MỐI QUAN TÂM CHUNG — để service không phải làm lại N lần:\n" +
        "#  - ĐỊNH TUYẾN theo path/host/header\n" +
        "#  - XÁC THỰC: verify JWT một lần ở biên, truyền danh tính xuống dưới\n" +
        "#  - RATE LIMITING và quota theo API key/tenant\n" +
        "#  - TLS termination, CORS, nén\n" +
        "#  - LOG và METRIC tập trung cho mọi request vào hệ thống\n" +
        "#  - biến đổi request/response, hợp nhất API cho client\n" +
        "#  - CANARY: chia traffic theo trọng số\n" +
        "\n" +
        "# KHI NÀO CẦN:\n" +
        "#  - có nhiều service và client bên ngoài (web, mobile, đối tác)\n" +
        "#  - cần một điểm áp dụng chính sách bảo mật thống nhất\n" +
        "#  - muốn giấu cấu trúc nội bộ (client không cần biết có bao nhiêu service)\n" +
        "\n" +
        "# KHI NÀO KHÔNG CẦN:\n" +
        "#  - chỉ có 2-3 service, dùng nội bộ -> Ingress đơn giản là đủ\n" +
        "#  - giao tiếp GIỮA CÁC SERVICE nội bộ -> gọi trực tiếp hoặc qua service\n" +
        "#    mesh, ĐỪNG đi vòng qua gateway (thêm chặng, thêm điểm lỗi)\n" +
        "\n" +
        "# CẠM BẪY LỚN NHẤT: gateway phình thành nơi chứa LOGIC NGHIỆP VỤ\n" +
        "# -> nó trở thành điểm nghẽn về tổ chức (mọi đội phải chờ đội gateway)\n" +
        "#    và một monolith mới. Gateway chỉ nên làm những việc CHUNG cho mọi service.\n" +
        "kubectl get ingress -A",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Trong Kubernetes, DNS đã là service discovery",
      code:
        "# Kubernetes có sẵn: Service tạo một bản ghi DNS ổn định, kube-proxy\n" +
        "# cân bằng tải tới các pod đang READY.\n" +
        "apiVersion: v1\n" +
        "kind: Service\n" +
        "metadata:\n" +
        "  name: payment-service\n" +
        "spec:\n" +
        "  selector: { app: payment-service }\n" +
        "  ports: [{ port: 8080, targetPort: 8080 }]\n" +
        "# -> gọi http://payment-service:8080 từ bất kỳ pod nào trong namespace.\n" +
        "# Pod chết/scale thì endpoint tự cập nhật, ứng dụng không phải làm gì.\n" +
        "---\n" +
        "apiVersion: v1\n" +
        "kind: Service\n" +
        "metadata: { name: payment-headless }\n" +
        "spec:\n" +
        "  clusterIP: None            # headless: DNS trả về IP CỦA TỪNG POD\n" +
        "  selector: { app: payment-service }\n" +
        "# -> dùng khi client muốn tự chọn instance (client-side load balancing)",
    },
    {
      lang: "java",
      title: "Registry ngoài Kubernetes",
      code:
        "// SERVER-SIDE (K8s Service, AWS ALB): client gọi một địa chỉ, hạ tầng chọn\n" +
        "// instance. Đơn giản nhất, không phụ thuộc ngôn ngữ.\n" +
        "\n" +
        "// CLIENT-SIDE: client hỏi registry rồi tự chọn\n" +
        "@Bean\n" +
        "@LoadBalanced                      // Spring Cloud LoadBalancer\n" +
        "RestClient.Builder builder() { return RestClient.builder(); }\n" +
        "\n" +
        "restClient.get().uri(\"http://payment-service/payments/{id}\", id);\n" +
        "// Tên \"payment-service\" được phân giải từ registry (Eureka/Consul/Nacos),\n" +
        "// client tự chọn instance -> không thêm chặng mạng, và chọn được theo vùng.\n" +
        "\n" +
        "// CÁC REGISTRY:\n" +
        "//  Kubernetes DNS — mặc định nếu đã ở K8s; không cần gì thêm\n" +
        "//  Consul   — đa nền tảng, có health check, KV store, hỗ trợ đa DC\n" +
        "//  Eureka   — hệ sinh thái Spring Cloud, giờ ít dùng hơn (Netflix đã ngừng phát triển)\n" +
        "//  Nacos    — phổ biến trong hệ sinh thái Alibaba, có cả config\n" +
        "//  etcd/Zookeeper — thường là hạ tầng bên dưới, không dùng trực tiếp\n" +
        "\n" +
        "// LỜI KHUYÊN: đã ở Kubernetes thì DÙNG Service, đừng thêm Eureka.\n" +
        "// Thêm một registry nữa là thêm một thứ để hỏng mà không đổi lại gì.",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Chuyển việc mạng ra khỏi ứng dụng",
      code:
        "# Mesh chèn một SIDECAR PROXY (Envoy) cạnh mỗi pod. Mọi traffic vào/ra đi\n" +
        "# qua nó -> retry, timeout, mTLS, tracing, load balancing được xử lý ở đó,\n" +
        "# ứng dụng KHÔNG cần thư viện gì.\n" +
        "apiVersion: networking.istio.io/v1beta1\n" +
        "kind: VirtualService\n" +
        "metadata: { name: payment }\n" +
        "spec:\n" +
        "  hosts: [payment-service]\n" +
        "  http:\n" +
        "    - retries:\n" +
        "        attempts: 3\n" +
        "        perTryTimeout: 500ms\n" +
        "        retryOn: 5xx,reset,connect-failure\n" +
        "      timeout: 2s\n" +
        "      route:\n" +
        "        - destination: { host: payment-service, subset: v1 }\n" +
        "          weight: 90                      # CANARY không cần sửa code\n" +
        "        - destination: { host: payment-service, subset: v2 }\n" +
        "          weight: 10\n" +
        "---\n" +
        "apiVersion: networking.istio.io/v1beta1\n" +
        "kind: DestinationRule\n" +
        "metadata: { name: payment }\n" +
        "spec:\n" +
        "  host: payment-service\n" +
        "  trafficPolicy:\n" +
        "    connectionPool:\n" +
        "      http: { http2MaxRequests: 100, maxRequestsPerConnection: 10 }\n" +
        "    outlierDetection:                     # circuit breaker ở tầng hạ tầng\n" +
        "      consecutive5xxErrors: 5\n" +
        "      interval: 30s\n" +
        "      baseEjectionTime: 30s",
    },
    {
      lang: "bash",
      title: "Lợi ích và cái giá thật sự",
      code:
        "# LỢI ÍCH:\n" +
        "#  - mTLS TỰ ĐỘNG giữa mọi service, không sửa code\n" +
        "#  - retry/timeout/circuit breaker thống nhất, không phụ thuộc ngôn ngữ\n" +
        "#    -> rất đáng khi hệ thống POLYGLOT\n" +
        "#  - traffic shifting (canary, blue-green, mirroring) bằng cấu hình\n" +
        "#  - metric và trace tự động cho mọi lời gọi giữa service\n" +
        "#  - chính sách phân quyền theo danh tính service\n" +
        "\n" +
        "# CÁI GIÁ (thường bị đánh giá thấp):\n" +
        "#  - MỖI POD thêm một container -> tốn RAM/CPU (Envoy ~50-100MB mỗi pod)\n" +
        "#  - thêm ~1-3ms độ trễ mỗi chặng (hai lần qua proxy)\n" +
        "#  - control plane là hệ thống phức tạp phải vận hành và nâng cấp\n" +
        "#  - gỡ rối khó hơn: lỗi có thể nằm ở ứng dụng HOẶC ở sidecar\n" +
        "#  - đường học dốc, cần người chuyên trách\n" +
        "\n" +
        "# KHI NÀO ĐÁNG: nhiều ngôn ngữ, nhiều chục service, yêu cầu bảo mật\n" +
        "# zero-trust, cần traffic management tinh vi.\n" +
        "# KHI NÀO KHÔNG: dưới ~10 service cùng một ngôn ngữ -> dùng thư viện\n" +
        "# (Resilience4j) đơn giản hơn nhiều.\n" +
        "# Linkerd nhẹ và dễ hơn Istio đáng kể — cân nhắc trước khi chọn Istio.",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Container phụ chạy cạnh container chính",
      code:
        "apiVersion: v1\n" +
        "kind: Pod\n" +
        "spec:\n" +
        "  containers:\n" +
        "    - name: app                       # CONTAINER CHÍNH: chỉ lo nghiệp vụ\n" +
        "      image: order-service:1.0\n" +
        "      ports: [{ containerPort: 8080 }]\n" +
        "      volumeMounts:\n" +
        "        - { name: logs, mountPath: /var/log/app }\n" +
        "\n" +
        "    - name: log-shipper               # SIDECAR: đẩy log đi\n" +
        "      image: fluent-bit:2.2\n" +
        "      volumeMounts:\n" +
        "        - { name: logs, mountPath: /var/log/app, readOnly: true }\n" +
        "\n" +
        "    - name: envoy                     # SIDECAR: proxy mạng (service mesh)\n" +
        "      image: envoyproxy/envoy:v1.29\n" +
        "  volumes:\n" +
        "    - name: logs\n" +
        "      emptyDir: {}                    # chia sẻ filesystem giữa các container",
    },
    {
      lang: "bash",
      title: "Vì sao dùng sidecar và khi nào không",
      code:
        "# Ý TƯỞNG: các container trong CÙNG POD chia sẻ network namespace\n" +
        "# (gọi nhau qua localhost) và có thể chia sẻ volume -> tách được các\n" +
        "# mối quan tâm hạ tầng ra khỏi ứng dụng.\n" +
        "\n" +
        "# CÁC SIDECAR PHỔ BIẾN:\n" +
        "#  - service mesh proxy (Envoy, linkerd-proxy)\n" +
        "#  - thu thập log (Fluent Bit, Vector)\n" +
        "#  - đồng bộ config/secret (Vault Agent, config reloader)\n" +
        "#  - metric exporter (chuyển metric của ứng dụng sang định dạng Prometheus)\n" +
        "#  - cloud SQL proxy, database proxy\n" +
        "\n" +
        "# LỢI ÍCH:\n" +
        "#  - ứng dụng KHÔNG cần thư viện cho việc hạ tầng -> dùng được với MỌI ngôn ngữ\n" +
        "#  - nâng cấp sidecar độc lập với ứng dụng\n" +
        "#  - đội platform sở hữu sidecar, đội sản phẩm sở hữu ứng dụng\n" +
        "\n" +
        "# CÁI GIÁ:\n" +
        "#  - tốn tài nguyên: N pod = N bản sao sidecar (đáng kể ở quy mô lớn)\n" +
        "#  - vòng đời phức tạp: sidecar phải khởi động TRƯỚC và tắt SAU app\n" +
        "#    (Kubernetes 1.29+ có native sidecar bằng initContainer + restartPolicy: Always\n" +
        "#     — giải quyết đúng vấn đề này)\n" +
        "#  - gỡ rối khó hơn: phải xem log của nhiều container\n" +
        "kubectl logs pod-name -c envoy\n" +
        "\n" +
        "# XU HƯỚNG MỚI: \"ambient mesh\" (Istio) bỏ sidecar cho phần lớn chức năng,\n" +
        "# dùng node-level proxy -> giảm mạnh chi phí tài nguyên.",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Tách config khỏi image, tách secret khỏi config",
      code:
        "apiVersion: v1\n" +
        "kind: ConfigMap\n" +
        "metadata: { name: order-service-config }\n" +
        "data:\n" +
        "  LOG_LEVEL: \"INFO\"\n" +
        "  FEATURE_NEW_CHECKOUT: \"true\"\n" +
        "  PAYMENT_TIMEOUT_MS: \"2000\"\n" +
        "---\n" +
        "apiVersion: v1\n" +
        "kind: Secret\n" +
        "metadata: { name: order-service-secret }\n" +
        "type: Opaque\n" +
        "stringData:\n" +
        "  DB_PASSWORD: \"...\"          # base64 KHÔNG phải mã hoá — Secret của K8s\n" +
        "                              # chỉ là encode. Cần bật encryption-at-rest\n" +
        "                              # và RBAC chặt, hoặc dùng External Secrets.\n" +
        "---\n" +
        "apiVersion: apps/v1\n" +
        "kind: Deployment\n" +
        "spec:\n" +
        "  template:\n" +
        "    spec:\n" +
        "      containers:\n" +
        "        - name: app\n" +
        "          envFrom:\n" +
        "            - configMapRef: { name: order-service-config }\n" +
        "            - secretRef:    { name: order-service-secret }",
    },
    {
      lang: "bash",
      title: "Ba nguyên tắc và các công cụ",
      code:
        "# NGUYÊN TẮC 1: CÙNG MỘT IMAGE chạy được ở mọi môi trường; chỉ config đổi.\n" +
        "#   -> KHÔNG build image riêng cho dev/staging/prod.\n" +
        "\n" +
        "# NGUYÊN TẮC 2: SECRET KHÔNG BAO GIỜ nằm trong code, image, hay git.\n" +
        "#   Quét để chắc chắn:\n" +
        "gitleaks detect --source . --verbose\n" +
        "trufflehog filesystem .\n" +
        "\n" +
        "# NGUYÊN TẮC 3: secret phải XOAY VÒNG được mà không cần rebuild.\n" +
        "\n" +
        "# CÔNG CỤ:\n" +
        "#  - External Secrets Operator: đồng bộ từ Vault/AWS Secrets Manager vào K8s Secret\n" +
        "#  - Sealed Secrets: mã hoá secret để commit ĐƯỢC vào git (chỉ cluster giải mã được)\n" +
        "#  - Vault Agent sidecar: tiêm secret vào file, tự làm mới\n" +
        "#  - SOPS: mã hoá file YAML bằng KMS/age\n" +
        "\n" +
        "# CONFIG ĐỘNG (đổi mà không restart):\n" +
        "#  - Spring Cloud Config + @RefreshScope + /actuator/refresh\n" +
        "#  - Consul/Nacos watch\n" +
        "#  - reloader: tự restart pod khi ConfigMap đổi\n" +
        "kubectl rollout restart deployment/order-service\n" +
        "\n" +
        "# BẪY: đưa QUÁ NHIỀU thứ vào config -> không ai biết giá trị thật đang là gì.\n" +
        "# Chỉ những thứ KHÁC NHAU giữa các môi trường mới cần là config.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Sợi chỉ xuyên suốt một request qua mọi service",
      code:
        "// Không có nó, một request lỗi đi qua 6 service là 6 tập log không liên\n" +
        "// quan gì tới nhau -> không điều tra được.\n" +
        "@Component\n" +
        "@Order(Ordered.HIGHEST_PRECEDENCE)\n" +
        "public class CorrelationIdFilter extends OncePerRequestFilter {\n" +
        "    private static final String HEADER = \"X-Correlation-Id\";\n" +
        "\n" +
        "    @Override\n" +
        "    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,\n" +
        "                                    FilterChain chain) throws ServletException, IOException {\n" +
        "        String id = req.getHeader(HEADER);\n" +
        "        if (id == null || id.isBlank()) id = UUID.randomUUID().toString();\n" +
        "        MDC.put(\"correlationId\", id);          // đưa vào ngữ cảnh log\n" +
        "        res.setHeader(HEADER, id);             // trả về cho client\n" +
        "        try {\n" +
        "            chain.doFilter(req, res);\n" +
        "        } finally {\n" +
        "            MDC.clear();                       // BẮT BUỘC: thread được tái sử dụng\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// TRUYỀN XUỐNG mọi lời gọi ra ngoài — quên chỗ này là đứt sợi chỉ:\n" +
        "@Bean\n" +
        "RestClient client() {\n" +
        "    return RestClient.builder()\n" +
        "        .requestInterceptor((req, body, ex) -> {\n" +
        "            req.getHeaders().add(\"X-Correlation-Id\", MDC.get(\"correlationId\"));\n" +
        "            return ex.execute(req, body);\n" +
        "        }).build();\n" +
        "}\n" +
        "// Với message: đưa vào HEADER của message, không phải vào payload.\n" +
        "record.headers().add(\"correlationId\", MDC.get(\"correlationId\").getBytes(UTF_8));\n" +
        "\n" +
        "// MẤT NGỮ CẢNH khi sang thread khác (@Async, thread pool) -> phải truyền tay:\n" +
        "String cid = MDC.get(\"correlationId\");\n" +
        "executor.submit(() -> { MDC.put(\"correlationId\", cid); try { work(); } finally { MDC.clear(); } });\n" +
        "\n" +
        "// THỰC TẾ HIỆN NAY: dùng OpenTelemetry/Micrometer Tracing — chúng tự làm\n" +
        "// việc này (traceId/spanId) và tích hợp sẵn với mọi thư viện phổ biến.",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Trace, span và lấy mẫu",
      code:
        "management:\n" +
        "  tracing:\n" +
        "    enabled: true\n" +
        "    sampling:\n" +
        "      probability: 0.1              # lấy mẫu 10% — 1.0 ở production RẤT tốn\n" +
        "    propagation:\n" +
        "      type: w3c                     # chuẩn traceparent (thay cho B3 của Zipkin)\n" +
        "  otlp:\n" +
        "    tracing:\n" +
        "      endpoint: http://otel-collector:4318/v1/traces\n" +
        "logging:\n" +
        "  pattern:\n" +
        "    level: \"%5p [${spring.application.name},%X{traceId:-},%X{spanId:-}]\"\n" +
        "# Dòng cuối là mấu chốt: traceId nằm TRONG LOG -> từ trace nhảy sang log\n" +
        "# và ngược lại.",
    },
    {
      lang: "java",
      title: "Span tuỳ chỉnh và các loại sampling",
      code:
        "// TRACE = toàn bộ hành trình của một request.\n" +
        "// SPAN  = một đơn vị công việc (một lời gọi HTTP, một truy vấn DB).\n" +
        "// Span có parent -> tạo thành cây. Context được truyền qua HEADER\n" +
        "// traceparent: 00-<traceId>-<spanId>-<flags>\n" +
        "@Observed(name = \"order.place\", contextualName = \"place-order\")\n" +
        "public Order place(CreateOrder req) { return doPlace(req); }\n" +
        "\n" +
        "// Span thủ công khi cần đo một đoạn cụ thể:\n" +
        "Span span = tracer.nextSpan().name(\"validate-inventory\").start();\n" +
        "try (var ws = tracer.withSpan(span)) {\n" +
        "    span.tag(\"order.id\", orderId);          // TAG có lực lượng THẤP\n" +
        "    span.tag(\"item.count\", String.valueOf(items.size()));\n" +
        "    validate(items);\n" +
        "} catch (Exception e) {\n" +
        "    span.error(e);\n" +
        "    throw e;\n" +
        "} finally {\n" +
        "    span.end();\n" +
        "}\n" +
        "\n" +
        "// SAMPLING — không thể lưu 100% trace ở quy mô lớn (tốn tiền và băng thông):\n" +
        "//  HEAD-BASED  — quyết định NGAY ĐẦU trace (probability ở trên). Đơn giản,\n" +
        "//                nhưng có thể bỏ lỡ đúng những request lỗi.\n" +
        "//  TAIL-BASED  — thu thập hết rồi mới quyết định giữ gì Ở CUỐI\n" +
        "//                -> giữ ĐƯỢC 100% trace LỖI và trace CHẬM, chỉ lấy mẫu\n" +
        "//                trace bình thường. Cần OTel Collector, tốn bộ nhớ hơn.\n" +
        "//  -> Tail-based gần như luôn là lựa chọn đúng cho production.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Hai bộ chỉ số cho hai góc nhìn",
      code:
        "// RED — cho DỊCH VỤ (góc nhìn người dùng): Rate, Errors, Duration\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    private final Counter requests;      // RATE\n" +
        "    private final Counter errors;        // ERRORS\n" +
        "    private final Timer latency;         // DURATION\n" +
        "\n" +
        "    public OrderService(MeterRegistry reg) {\n" +
        "        this.requests = Counter.builder(\"orders.requests\").register(reg);\n" +
        "        this.errors   = Counter.builder(\"orders.errors\").register(reg);\n" +
        "        this.latency  = Timer.builder(\"orders.latency\")\n" +
        "                             .publishPercentiles(0.5, 0.95, 0.99)\n" +
        "                             .register(reg);\n" +
        "    }\n" +
        "    public Order place(CreateOrder req) {\n" +
        "        requests.increment();\n" +
        "        return latency.record(() -> {\n" +
        "            try { return doPlace(req); }\n" +
        "            catch (Exception e) { errors.increment(); throw e; }\n" +
        "        });\n" +
        "    }\n" +
        "}\n" +
        "// Spring Boot đã có sẵn http.server.requests với đủ ba chỉ số này.\n" +
        "\n" +
        "// USE — cho TÀI NGUYÊN (góc nhìn hệ thống): Utilization, Saturation, Errors\n" +
        "//  CPU:       % sử dụng | load average | lỗi phần cứng\n" +
        "//  Memory:    % dùng    | swap/OOM     | lỗi cấp phát\n" +
        "//  Disk:      % dùng    | độ sâu hàng đợi I/O | lỗi I/O\n" +
        "//  Network:   băng thông| gói tin bị bỏ | lỗi\n" +
        "//  Threadpool:% bận     | độ dài hàng đợi | task bị từ chối\n" +
        "//  DB pool:   % dùng    | số thread đang chờ | timeout\n" +
        "\n" +
        "// DÙNG KHI NÀO: RED trả lời \"người dùng có đang gặp vấn đề không\" ->\n" +
        "// dùng để CẢNH BÁO. USE trả lời \"tài nguyên nào là nút thắt\" ->\n" +
        "// dùng để CHẨN ĐOÁN sau khi cảnh báo kêu.\n" +
        "\n" +
        "// TAG phải có LỰC LƯỢNG THẤP — tuyệt đối không tag orderId/userId:\n" +
        "//   mỗi tổ hợp tag là một chuỗi thời gian riêng -> nổ cardinality -> sập Prometheus.\n" +
        "Counter.builder(\"orders\").tag(\"status\", status).tag(\"channel\", channel).register(reg);",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Từ chỉ số tới cam kết và ngân sách lỗi",
      code:
        "# SLI (Indicator) — CHỈ SỐ đo được: tỉ lệ request thành công, độ trễ p99\n" +
        "# SLO (Objective) — MỤC TIÊU nội bộ: \"99,9% request thành công trong 30 ngày\"\n" +
        "# SLA (Agreement)  — CAM KẾT với khách hàng, có ĐỀN BÙ. Luôn LỎNG HƠN SLO.\n" +
        "#   Ví dụ: SLO 99,9% nội bộ, SLA 99,5% với khách -> có biên an toàn.\n" +
        "groups:\n" +
        "  - name: slo\n" +
        "    rules:\n" +
        "      - record: sli:availability:ratio_5m\n" +
        "        expr: |\n" +
        "          sum(rate(http_server_requests_seconds_count{status!~\"5..\"}[5m]))\n" +
        "          / sum(rate(http_server_requests_seconds_count[5m]))\n" +
        "      - alert: ErrorBudgetBurnFast\n" +
        "        expr: |\n" +
        "          (1 - sli:availability:ratio_5m) > (14.4 * 0.001)\n" +
        "        for: 2m\n" +
        "        labels: { severity: page }\n" +
        "        annotations:\n" +
        "          summary: \"Đốt error budget nhanh gấp 14 lần — hết budget trong 2 ngày\"",
    },
    {
      lang: "bash",
      title: "Error budget và ý nghĩa quản trị của nó",
      code:
        "# ERROR BUDGET = 100% - SLO. Đây là lượng lỗi được PHÉP.\n" +
        "#   SLO 99,9% trong 30 ngày -> budget = 0,1% = 43 phút 12 giây downtime\n" +
        "#   SLO 99,99%              -> chỉ 4 phút 19 giây -> đắt hơn RẤT nhiều\n" +
        "\n" +
        "# Ý NGHĨA THỰC SỰ: budget là công cụ RA QUYẾT ĐỊNH, không phải chỉ số báo cáo.\n" +
        "#   Còn nhiều budget  -> deploy thoải mái, thử nghiệm, chạy chaos\n" +
        "#   Sắp hết budget    -> ĐÓNG BĂNG tính năng mới, tập trung vào độ ổn định\n" +
        "# -> Nó chấm dứt tranh cãi \"tốc độ hay chất lượng\" bằng một con số\n" +
        "#    mà cả dev lẫn ops đều đồng ý trước.\n" +
        "\n" +
        "# BURN RATE ALERTING (thay cho cảnh báo theo ngưỡng cứng):\n" +
        "#  đốt nhanh gấp 14,4 lần -> hết budget trong 2 ngày -> BÁO ĐỘNG NGAY\n" +
        "#  đốt nhanh gấp 6 lần    -> hết trong 5 ngày        -> cảnh báo\n" +
        "#  đốt nhanh gấp 1 lần    -> đúng kế hoạch           -> không báo\n" +
        "# Cách này giảm mạnh báo động giả so với \"cảnh báo khi tỉ lệ lỗi > 1%\".\n" +
        "\n" +
        "# CHỌN SLO: đừng đặt 99,99% cho mọi thứ. Hỏi \"người dùng có nhận ra\n" +
        "# không\" và \"chi phí thêm một số 9 là bao nhiêu\". Với hầu hết hệ thống\n" +
        "# nội bộ, 99,9% là đủ.",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Hai chiến lược giảm rủi ro khi deploy",
      code:
        "# CANARY: chuyển dần một phần traffic sang bản mới\n" +
        "apiVersion: argoproj.io/v1alpha1\n" +
        "kind: Rollout\n" +
        "metadata: { name: order-service }\n" +
        "spec:\n" +
        "  replicas: 10\n" +
        "  strategy:\n" +
        "    canary:\n" +
        "      steps:\n" +
        "        - setWeight: 5\n" +
        "        - pause: { duration: 5m }        # quan sát 5 phút\n" +
        "        - analysis:                       # TỰ ĐỘNG kiểm tra chỉ số\n" +
        "            templates: [{ templateName: success-rate }]\n" +
        "        - setWeight: 25\n" +
        "        - pause: { duration: 10m }\n" +
        "        - setWeight: 50\n" +
        "        - pause: { duration: 10m }\n" +
        "      trafficRouting:\n" +
        "        istio:\n" +
        "          virtualService: { name: order-vsvc }\n" +
        "---\n" +
        "apiVersion: argoproj.io/v1alpha1\n" +
        "kind: AnalysisTemplate\n" +
        "metadata: { name: success-rate }\n" +
        "spec:\n" +
        "  metrics:\n" +
        "    - name: success-rate\n" +
        "      interval: 1m\n" +
        "      successCondition: result[0] >= 0.99\n" +
        "      failureLimit: 2                     # 2 lần thất bại -> TỰ ĐỘNG rollback\n" +
        "      provider:\n" +
        "        prometheus:\n" +
        "          query: |\n" +
        "            sum(rate(http_server_requests_seconds_count{status!~\"5..\",app=\"order-service\",version=\"canary\"}[2m]))\n" +
        "            / sum(rate(http_server_requests_seconds_count{app=\"order-service\",version=\"canary\"}[2m]))",
    },
    {
      lang: "bash",
      title: "So sánh và điều kiện bắt buộc",
      code:
        "# BLUE-GREEN: dựng môi trường MỚI hoàn chỉnh song song, kiểm tra, rồi\n" +
        "# chuyển TOÀN BỘ traffic một lần.\n" +
        "#  + rollback TỨC THÌ (chuyển ngược), test được trên môi trường thật trước\n" +
        "#  - tốn GẤP ĐÔI tài nguyên; lỗi ảnh hưởng 100% người dùng ngay khi chuyển\n" +
        "\n" +
        "# CANARY: chuyển dần 5% -> 25% -> 50% -> 100%\n" +
        "#  + lỗi chỉ ảnh hưởng phần nhỏ; có dữ liệu thật để đánh giá\n" +
        "#  + tự động rollback theo chỉ số\n" +
        "#  - deploy lâu hơn; hai phiên bản chạy SONG SONG trong thời gian dài\n" +
        "\n" +
        "# ĐIỀU KIỆN BẮT BUỘC cho cả hai (rất hay bị bỏ qua):\n" +
        "#  1) TƯƠNG THÍCH NGƯỢC về API và SCHEMA DATABASE — hai phiên bản cùng\n" +
        "#     đọc/ghi một database. Migration phải theo mẫu expand/contract.\n" +
        "#  2) Không có state trong bộ nhớ pod (session, cache cục bộ quan trọng)\n" +
        "#  3) Message/event phải xử lý được bởi CẢ HAI phiên bản\n" +
        "#  4) Có metric đủ tốt để đánh giá canary trong vài phút",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Tách \"deploy\" khỏi \"release\"",
      code:
        "// Ý tưởng cốt lõi: đưa code lên production KHÔNG có nghĩa là bật tính năng.\n" +
        "@Service\n" +
        "public class CheckoutService {\n" +
        "    private final FeatureFlags flags;\n" +
        "\n" +
        "    public CheckoutResult checkout(Cart cart, User user) {\n" +
        "        if (flags.isEnabled(\"new-checkout-flow\", user)) {\n" +
        "            return newCheckout(cart);          // code mới, đang tắt với đa số\n" +
        "        }\n" +
        "        return legacyCheckout(cart);           // đường cũ vẫn nguyên\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// PHÂN LOẠI CỜ — vòng đời rất khác nhau:\n" +
        "//  RELEASE FLAG     — bật dần tính năng mới. XOÁ sau khi ra mắt xong.\n" +
        "//  EXPERIMENT FLAG  — A/B testing. Xoá sau khi có kết luận.\n" +
        "//  OPS FLAG         — tắt khẩn cấp một chức năng nặng khi quá tải. Giữ lâu dài.\n" +
        "//  PERMISSION FLAG  — bật tính năng theo gói dịch vụ. Giữ vĩnh viễn.\n" +
        "\n" +
        "// BẬT DẦN theo tỉ lệ hoặc theo nhóm người dùng:\n" +
        "//   flags.isEnabled(\"new-checkout\", user)  -> 5% user, hoặc user nội bộ,\n" +
        "//   hoặc theo quốc gia/tenant.\n" +
        "\n" +
        "// LỢI ÍCH VỚI TRUNK-BASED DEVELOPMENT:\n" +
        "//  - merge vào main HÀNG NGÀY, không có nhánh sống nhiều tuần\n" +
        "//  - không còn \"merge hell\", không còn tích hợp đau đớn cuối sprint\n" +
        "//  - tính năng chưa xong vẫn merge được (chỉ cần cờ đang tắt)\n" +
        "//  - tắt tính năng lỗi TỨC THÌ, không cần rollback deploy\n" +
        "\n" +
        "// NỢ KỸ THUẬT PHẢI TRẢ: cờ tích tụ -> tổ hợp trạng thái bùng nổ, code\n" +
        "// đầy nhánh chết, và không ai dám xoá.\n" +
        "// -> Đặt HẠN SỬ DỤNG cho mỗi release flag (ví dụ 30 ngày), có báo cáo\n" +
        "//    cờ quá hạn, và coi việc xoá cờ là một phần của định nghĩa \"hoàn thành\".\n" +
        "// Công cụ: LaunchDarkly, Unleash, Flagsmith, hoặc bảng config đơn giản.",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Deployment, Service, Ingress, HPA",
      code:
        "apiVersion: apps/v1\n" +
        "kind: Deployment\n" +
        "metadata: { name: order-service }\n" +
        "spec:\n" +
        "  replicas: 3\n" +
        "  strategy:\n" +
        "    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }   # không giảm năng lực\n" +
        "  selector: { matchLabels: { app: order-service } }\n" +
        "  template:\n" +
        "    metadata: { labels: { app: order-service } }\n" +
        "    spec:\n" +
        "      containers:\n" +
        "        - name: app\n" +
        "          image: registry/order-service:1.4.0\n" +
        "          ports: [{ containerPort: 8080 }]\n" +
        "          resources:\n" +
        "            requests: { memory: 512Mi, cpu: 250m }   # dùng để XẾP LỊCH\n" +
        "            limits:   { memory: 512Mi, cpu: \"1\" }    # trần cứng; vượt RAM -> OOMKill\n" +
        "          readinessProbe:\n" +
        "            httpGet: { path: /actuator/health/readiness, port: 8080 }\n" +
        "          livenessProbe:\n" +
        "            httpGet: { path: /actuator/health/liveness, port: 8080 }\n" +
        "            failureThreshold: 3\n" +
        "          lifecycle:\n" +
        "            preStop: { exec: { command: [\"sh\", \"-c\", \"sleep 5\"] } }\n" +
        "      terminationGracePeriodSeconds: 45\n" +
        "---\n" +
        "apiVersion: v1\n" +
        "kind: Service                      # tên DNS ổn định + cân bằng tải\n" +
        "metadata: { name: order-service }\n" +
        "spec:\n" +
        "  selector: { app: order-service }\n" +
        "  ports: [{ port: 8080, targetPort: 8080 }]\n" +
        "---\n" +
        "apiVersion: autoscaling/v2\n" +
        "kind: HorizontalPodAutoscaler\n" +
        "metadata: { name: order-service }\n" +
        "spec:\n" +
        "  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: order-service }\n" +
        "  minReplicas: 3\n" +
        "  maxReplicas: 20\n" +
        "  metrics:\n" +
        "    - type: Resource\n" +
        "      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }\n" +
        "  behavior:\n" +
        "    scaleDown:\n" +
        "      stabilizationWindowSeconds: 300      # tránh scale lên xuống liên tục",
    },
    {
      lang: "bash",
      title: "Những điểm hay sai",
      code:
        "# 1) KHÔNG đặt resource requests/limits -> pod bị xếp lịch bừa, và một pod\n" +
        "#    có thể ăn hết CPU của node.\n" +
        "# 2) memory limit đặt bằng -Xmx của JVM -> OOMKill vì JVM còn dùng bộ nhớ\n" +
        "#    ngoài heap. Dùng -XX:MaxRAMPercentage=75 thay vì -Xmx cố định.\n" +
        "# 3) Thiếu preStop sleep -> có khoảng ngắn kube-proxy vẫn gửi traffic vào\n" +
        "#    pod đang tắt -> lỗi 502 khi deploy.\n" +
        "# 4) terminationGracePeriodSeconds ngắn hơn thời gian xử lý request -> cắt giữa chừng.\n" +
        "# 5) Dùng Deployment cho service CÓ TRẠNG THÁI -> phải dùng StatefulSet.\n" +
        "kubectl describe pod <name>        # xem lý do pod không lên được\n" +
        "kubectl top pods",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Phối hợp giữa ứng dụng và Kubernetes",
      code:
        "server:\n" +
        "  shutdown: graceful                       # mặc định là immediate — cắt phăng\n" +
        "spring:\n" +
        "  lifecycle:\n" +
        "    timeout-per-shutdown-phase: 30s\n" +
        "---\n" +
        "# Phía Kubernetes\n" +
        "lifecycle:\n" +
        "  preStop:\n" +
        "    exec: { command: [\"sh\", \"-c\", \"sleep 5\"] }\n" +
        "terminationGracePeriodSeconds: 45          # PHẢI > preStop + timeout của app",
    },
    {
      lang: "bash",
      title: "Trình tự tắt và cái bẫy race condition",
      code:
        "# KHI POD BỊ XOÁ, hai việc xảy ra SONG SONG (không theo thứ tự):\n" +
        "#   a) kubelet gửi SIGTERM cho container\n" +
        "#   b) endpoint controller gỡ pod khỏi Service -> kube-proxy cập nhật quy tắc\n" +
        "# -> Có một khoảng ngắn pod đã bắt đầu tắt NHƯNG vẫn nhận traffic -> lỗi 502.\n" +
        "# preStop sleep 5s giải quyết đúng điều này: hoãn SIGTERM để (b) kịp lan ra\n" +
        "# toàn cụm trước khi ứng dụng bắt đầu tắt.\n" +
        "\n" +
        "# ỨNG DỤNG NHẬN SIGTERM PHẢI:\n" +
        "#  1) đánh dấu readiness = DOWN (ngừng nhận request mới)\n" +
        "#  2) hoàn tất các request ĐANG xử lý\n" +
        "#  3) đóng consumer Kafka/queue cho tử tế (commit offset, rời group)\n" +
        "#  4) đóng connection pool, flush log và metric\n" +
        "#  5) thoát với mã 0\n" +
        "\n" +
        "# KIỂM CHỨNG bằng cách chạy tải trong lúc deploy — đây là cách DUY NHẤT\n" +
        "# để biết chắc:\n" +
        "kubectl rollout restart deployment/order-service &\n" +
        "hey -z 60s -c 50 https://api.example.com/orders\n" +
        "# Tỉ lệ lỗi phải là 0. Có lỗi -> thiếu preStop, hoặc grace period quá ngắn,\n" +
        "# hoặc ứng dụng không xử lý SIGTERM.\n" +
        "\n" +
        "kubectl rollout status deployment/order-service\n" +
        "kubectl rollout undo deployment/order-service     # rollback",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Cảnh báo theo TRIỆU CHỨNG, không theo nguyên nhân",
      code:
        "groups:\n" +
        "  - name: symptom-based          # NÊN DÙNG: phản ánh trải nghiệm người dùng\n" +
        "    rules:\n" +
        "      - alert: HighErrorRate\n" +
        "        expr: |\n" +
        "          sum(rate(http_server_requests_seconds_count{status=~\"5..\"}[5m]))\n" +
        "          / sum(rate(http_server_requests_seconds_count[5m])) > 0.01\n" +
        "        for: 5m\n" +
        "        labels: { severity: page }\n" +
        "        annotations:\n" +
        "          summary: \"Tỉ lệ lỗi 5xx vượt 1% trong 5 phút\"\n" +
        "          runbook: \"https://wiki/runbooks/high-error-rate\"     # BẮT BUỘC có\n" +
        "      - alert: HighLatency\n" +
        "        expr: histogram_quantile(0.99,\n" +
        "                sum(rate(http_server_requests_seconds_bucket[5m])) by (le)) > 2\n" +
        "        for: 5m\n" +
        "        labels: { severity: page }\n" +
        "\n" +
        "  - name: cause-based            # chỉ để CHẨN ĐOÁN, KHÔNG gọi người dậy\n" +
        "    rules:\n" +
        "      - alert: HighCpuUsage\n" +
        "        expr: rate(container_cpu_usage_seconds_total[5m]) > 0.9\n" +
        "        labels: { severity: ticket }     # -> vào ticket, không page",
    },
    {
      lang: "bash",
      title: "Vì sao và cách tránh mệt mỏi vì cảnh báo",
      code:
        "# SYMPTOM-BASED: \"người dùng đang gặp lỗi\", \"trang chậm\"\n" +
        "#  + ít cảnh báo hơn nhiều, mỗi cái đều CÓ Ý NGHĨA\n" +
        "#  + không bỏ sót lỗi do nguyên nhân bạn chưa nghĩ tới\n" +
        "# CAUSE-BASED: \"CPU 90%\", \"pod restart\"\n" +
        "#  - CPU 90% mà người dùng không bị ảnh hưởng thì KHÔNG phải sự cố\n" +
        "#  - tạo ra hàng chục cảnh báo cho một sự cố -> nhiễu\n" +
        "\n" +
        "# NĂM QUY TẮC CHỐNG ALERT FATIGUE:\n" +
        "# 1) MỖI CẢNH BÁO PHẢI CÓ HÀNH ĐỘNG. Không biết phải làm gì -> xoá nó đi\n" +
        "#    hoặc chuyển thành dashboard.\n" +
        "# 2) MỖI CẢNH BÁO PHẢI CÓ RUNBOOK: triệu chứng, cách chẩn đoán, cách xử lý.\n" +
        "# 3) Chỉ PAGE khi cần hành động NGAY (nửa đêm). Còn lại -> ticket/Slack.\n" +
        "# 4) DÙNG \"for:\" để bỏ qua đột biến ngắn.\n" +
        "# 5) GỘP cảnh báo liên quan (Alertmanager inhibit_rules): một sự cố hạ tầng\n" +
        "#    không nên tạo 50 thông báo.\n" +
        "#   inhibit_rules:\n" +
        "#     - source_matchers: [severity=\"critical\"]\n" +
        "#       target_matchers: [severity=\"warning\"]\n" +
        "#       equal: [cluster, service]\n" +
        "\n" +
        "# ĐO LƯỜNG chính việc cảnh báo: bao nhiêu % cảnh báo dẫn tới hành động thật?\n" +
        "# Dưới 50% nghĩa là hệ thống cảnh báo đang có vấn đề.",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Git là nguồn sự thật cho trạng thái hệ thống",
      code:
        "apiVersion: argoproj.io/v1alpha1\n" +
        "kind: Application\n" +
        "metadata: { name: order-service }\n" +
        "spec:\n" +
        "  project: default\n" +
        "  source:\n" +
        "    repoURL: https://github.com/company/k8s-manifests\n" +
        "    targetRevision: main\n" +
        "    path: apps/order-service/production\n" +
        "  destination:\n" +
        "    server: https://kubernetes.default.svc\n" +
        "    namespace: production\n" +
        "  syncPolicy:\n" +
        "    automated:\n" +
        "      prune: true          # xoá tài nguyên không còn trong git\n" +
        "      selfHeal: true       # ai sửa tay trên cluster -> TỰ ĐỘNG khôi phục\n" +
        "    syncOptions: [CreateNamespace=true]",
    },
    {
      lang: "bash",
      title: "Pipeline hai kho và vì sao tách",
      code:
        "# NGUYÊN TẮC GITOPS:\n" +
        "# 1) Trạng thái mong muốn của hệ thống được KHAI BÁO trong git\n" +
        "# 2) Git là NGUỒN SỰ THẬT DUY NHẤT\n" +
        "# 3) Agent (ArgoCD/Flux) KÉO thay đổi về, thay vì CI đẩy vào cluster\n" +
        "# 4) Lệch khỏi git được PHÁT HIỆN và TỰ SỬA\n" +
        "\n" +
        "# TÁCH HAI KHO — quan trọng:\n" +
        "#   kho CODE      -> build, test, đẩy image\n" +
        "#   kho MANIFEST  -> trạng thái mong muốn của từng môi trường\n" +
        "# Pipeline code KHÔNG có quyền vào cluster; nó chỉ cập nhật tag image\n" +
        "# trong kho manifest -> giảm mạnh bề mặt tấn công.\n" +
        "\n" +
        "# LUỒNG ĐẦY ĐỦ:\n" +
        "#  1) push code -> CI: test, build, quét bảo mật, đẩy image có tag = git sha\n" +
        "#  2) CI mở PR vào kho manifest, đổi image tag\n" +
        "#  3) review + merge (đây là cổng phê duyệt, có dấu vết đầy đủ)\n" +
        "#  4) ArgoCD phát hiện thay đổi -> đồng bộ vào cluster\n" +
        "#  5) theo dõi chỉ số; lỗi -> revert commit trong git là rollback\n" +
        "\n" +
        "# LỢI ÍCH: mọi thay đổi đều có lịch sử, review được, rollback = git revert,\n" +
        "# và môi trường mới dựng lại được hoàn toàn từ git.\n" +
        "\n" +
        "argocd app get order-service\n" +
        "argocd app diff order-service          # cluster khác git ở đâu\n" +
        "argocd app rollback order-service 5",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Metrics, logs, traces nối với nhau bằng traceId",
      code:
        "// Mỗi trụ cột trả lời một câu hỏi khác nhau, và chúng chỉ HỮU DỤNG khi\n" +
        "// NỐI ĐƯỢC VỚI NHAU.\n" +
        "@Service\n" +
        "public class OrderService {\n" +
        "    public Order place(CreateOrder req) {\n" +
        "        // METRICS — \"CÓ vấn đề không?\" (tổng hợp, rẻ, dùng để cảnh báo)\n" +
        "        return Timer.builder(\"orders.place\").register(registry).record(() -> {\n" +
        "            // TRACES — \"vấn đề Ở ĐÂU trong chuỗi?\"\n" +
        "            Span span = tracer.nextSpan().name(\"place-order\").start();\n" +
        "            try (var ws = tracer.withSpan(span)) {\n" +
        "                span.tag(\"order.channel\", req.channel());\n" +
        "                // LOGS — \"chuyện gì ĐÃ XẢY RA cụ thể?\"\n" +
        "                // traceId tự có trong MDC nhờ Micrometer Tracing\n" +
        "                log.info(\"đặt hàng sku={} qty={}\", req.sku(), req.qty());\n" +
        "                return doPlace(req);\n" +
        "            } catch (Exception e) {\n" +
        "                span.error(e);\n" +
        "                log.error(\"đặt hàng thất bại\", e);\n" +
        "                registry.counter(\"orders.errors\", \"reason\", e.getClass().getSimpleName())\n" +
        "                        .increment();\n" +
        "                throw e;\n" +
        "            } finally { span.end(); }\n" +
        "        });\n" +
        "    }\n" +
        "}",
    },
    {
      lang: "yaml",
      title: "Cấu hình để ba trụ cột nối được với nhau",
      code:
        "logging:\n" +
        "  pattern:\n" +
        "    level: \"%5p [${spring.application.name},%X{traceId:-},%X{spanId:-}]\"\n" +
        "# ĐÂY LÀ DÒNG QUAN TRỌNG NHẤT: traceId trong log cho phép nhảy từ trace\n" +
        "# sang log và ngược lại. Thiếu nó, ba trụ cột là ba hòn đảo.\n" +
        "\n" +
        "management:\n" +
        "  tracing: { sampling: { probability: 0.1 } }\n" +
        "  metrics:\n" +
        "    tags: { application: ${spring.application.name} }\n" +
        "  endpoints:\n" +
        "    web: { exposure: { include: health,metrics,prometheus } }\n" +
        "\n" +
        "# QUY TRÌNH ĐIỀU TRA THỰC TẾ:\n" +
        "#  1) METRIC cảnh báo: tỉ lệ lỗi tăng    -> BIẾT CÓ vấn đề\n" +
        "#  2) TRACE của request lỗi              -> BIẾT service nào, bước nào\n" +
        "#  3) LOG lọc theo traceId đó            -> BIẾT lỗi cụ thể là gì\n" +
        "# Ba bước này chỉ mất vài phút NẾU đã nối được chúng với nhau;\n" +
        "# không nối được thì có thể mất hàng giờ.",
    },
  ],
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
  demo: [
    {
      lang: "java",
      title: "Log dạng JSON, có ngữ cảnh, không có dữ liệu nhạy cảm",
      code:
        "// LOG CÓ CẤU TRÚC (JSON) — bắt buộc trong hệ phân tán: log dạng văn bản\n" +
        "// tự do không truy vấn và tổng hợp được.\n" +
        "log.atInfo()\n" +
        "   .setMessage(\"đơn hàng đã đặt\")\n" +
        "   .addKeyValue(\"orderId\", order.id())\n" +
        "   .addKeyValue(\"customerId\", order.customerId())\n" +
        "   .addKeyValue(\"amount\", order.total())\n" +
        "   .addKeyValue(\"channel\", \"mobile\")\n" +
        "   .log();\n" +
        "// -> {\"ts\":\"...\",\"level\":\"INFO\",\"msg\":\"đơn hàng đã đặt\",\"orderId\":\"O-1\",\n" +
        "//     \"traceId\":\"abc...\",\"service\":\"order-service\"}\n" +
        "\n" +
        "// MỨC LOG dùng đúng:\n" +
        "//  ERROR — cần CON NGƯỜI xử lý. Kèm exception đầy đủ.\n" +
        "//  WARN  — bất thường nhưng đã tự xử lý (rơi vào fallback, retry thành công)\n" +
        "//  INFO  — sự kiện nghiệp vụ quan trọng (đặt hàng, thanh toán, đăng nhập)\n" +
        "//  DEBUG — chi tiết để gỡ rối, TẮT ở production\n" +
        "//  TRACE — rất chi tiết, chỉ bật tạm khi điều tra\n" +
        "\n" +
        "// PII — TUYỆT ĐỐI KHÔNG log:\n" +
        "log.info(\"user {}\", user);                   // toString() lộ HẾT mọi field\n" +
        "log.info(\"user id={} tier={}\", user.id(), user.tier());   // chỉ log thứ CẦN\n" +
        "// Không log: mật khẩu, token, số thẻ, CMND/CCCD, địa chỉ đầy đủ,\n" +
        "// số điện thoại, email (tuỳ quy định), dữ liệu sức khoẻ.\n" +
        "\n" +
        "// CHE DỮ LIỆU tự động ở tầng logging — đừng chỉ dựa vào kỷ luật của người viết:\n" +
        "public class MaskingConverter extends MessageConverter {\n" +
        "    private static final Pattern CARD = Pattern.compile(\"\\\\b\\\\d{13,19}\\\\b\");\n" +
        "    @Override public String convert(ILoggingEvent e) {\n" +
        "        return CARD.matcher(super.convert(e)).replaceAll(\"****\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// GHI RA STDOUT, để hạ tầng thu thập (12-factor). KHÔNG tự ghi file,\n" +
        "// không tự xoay vòng log.\n" +
        "// Và đặt RETENTION: log là khoản chi phí lớn và tăng rất nhanh.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Từ báo cáo lỗi tới nguyên nhân gốc",
      code:
        "# BƯỚC 1: LẤY ĐỊNH DANH. Không có nó thì không điều tra được.\n" +
        "#   -> API phải TRẢ VỀ correlation/trace id trong response và trong trang lỗi:\n" +
        "#      {\"error\":\"...\", \"traceId\":\"4bf92f3577b34da6a3ce929d0e0e4736\"}\n" +
        "\n" +
        "# BƯỚC 2: XEM TRACE — thấy ngay service nào lỗi và bước nào chậm\n" +
        "curl \"http://jaeger:16686/api/traces/4bf92f3577b34da6a3ce929d0e0e4736\"\n" +
        "\n" +
        "# BƯỚC 3: LỌC LOG THEO traceId, xuyên MỌI service\n" +
        "#   Loki:          {app=~\".+\"} |= \"4bf92f3577b34da6a3ce929d0e0e4736\"\n" +
        "#   Elasticsearch: traceId:\"4bf92f3577b34da6a3ce929d0e0e4736\"\n" +
        "#   CloudWatch:    fields @message | filter @message like /4bf92f35/\n" +
        "\n" +
        "# BƯỚC 4: KHOANH VÙNG — lỗi riêng lẻ hay lỗi hệ thống?\n" +
        "#   Prometheus: sum(rate(http_server_requests_seconds_count{status=~\"5..\"}[5m])) by (app)\n" +
        "#   -> chỉ một request lỗi (dữ liệu xấu?) hay tỉ lệ lỗi tăng chung?\n" +
        "\n" +
        "# BƯỚC 5: TƯƠNG QUAN THỜI GIAN — có gì thay đổi đúng lúc đó không?\n" +
        "kubectl rollout history deployment/order-service\n" +
        "argocd app history order-service\n" +
        "#   deploy? đổi config? bật feature flag? tăng traffc? sự cố nhà cung cấp?\n" +
        "#   -> Phần lớn sự cố production bắt nguồn từ MỘT THAY ĐỔI gần đó.\n" +
        "\n" +
        "# BƯỚC 6: XEM TÀI NGUYÊN của service nghi ngờ\n" +
        "kubectl top pods -l app=payment-service\n" +
        "kubectl describe pod <pod> | grep -A5 \"Last State\"     # OOMKilled? restart?\n" +
        "kubectl logs <pod> --previous                          # log của lần chết trước\n" +
        "\n" +
        "# BƯỚC 7: GHI LẠI. Postmortem KHÔNG ĐỔ LỖI, tập trung vào hệ thống:\n" +
        "#   dòng thời gian, ảnh hưởng, nguyên nhân gốc, và các hành động cụ thể\n" +
        "#   để lần sau phát hiện nhanh hơn hoặc không tái diễn.",
    },
  ],
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
  demo: [
    {
      lang: "bash",
      title: "Microservices tốn tài nguyên hơn, và vì sao",
      code:
        "# VÌ SAO TỐN HƠN MONOLITH ở cùng khối lượng việc:\n" +
        "#  - mỗi service một runtime (JVM ~200-500MB chỉ để khởi động)\n" +
        "#  - mỗi service một connection pool tới database\n" +
        "#  - sidecar (service mesh, log shipper) nhân với số pod\n" +
        "#  - dữ liệu bị tuần tự hoá/giải tuần tự hoá ở mỗi chặng mạng\n" +
        "#  - dự phòng: mỗi service cần tối thiểu 2-3 instance -> N service × 3\n" +
        "\n" +
        "# ĐO TRƯỚC KHI TỐI ƯU:\n" +
        "kubectl top pods --all-namespaces --sort-by=memory | head -20\n" +
        "kubectl get pods -o custom-columns=\\\n" +
        "\u0027NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu\u0027\n" +
        "\n" +
        "# CÁC KHOẢN TỐI ƯU, theo hiệu quả:\n" +
        "# 1) RIGHT-SIZING: phần lớn service được cấp dư 2-3 lần. So sánh usage\n" +
        "#    thực tế với requests. VPA (Vertical Pod Autoscaler) gợi ý được.\n" +
        "# 2) HPA để không phải cấp cho đỉnh tải 24/7\n" +
        "# 3) SPOT/preemptible node cho workload chịu gián đoạn (batch, CI)\n" +
        "# 4) Giảm bộ nhớ JVM: -XX:MaxRAMPercentage=75, cân nhắc GraalVM native\n" +
        "#    (khởi động ~50ms, RAM ~1/5) cho service nhỏ\n" +
        "# 5) Tắt môi trường dev/staging ngoài giờ làm việc\n" +
        "# 6) Gộp các service quá nhỏ lại\n" +
        "# 7) Cân nhắc bỏ sidecar mesh nếu không thật sự dùng tính năng của nó\n" +
        "\n" +
        "# ĐỪNG QUÊN CHI PHÍ CON NGƯỜI: nó thường LỚN HƠN chi phí hạ tầng.\n" +
        "# 10 service cần CI, monitoring, on-call, nâng cấp dependency — đó mới là\n" +
        "# khoản đắt nhất, và là lý do chính để không chia quá nhỏ.\n" +
        "kubectl cost namespace     # kubecost/opencost: chi phí theo namespace/đội",
    },
  ],
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
  demo: [
    {
      lang: "yaml",
      title: "Không tin ai chỉ vì họ ở trong mạng nội bộ",
      code:
        "# MÔ HÌNH CŨ (perimeter security): firewall ở biên, bên trong tin nhau.\n" +
        "# -> Kẻ tấn công vào được một pod là đi ngang khắp hệ thống.\n" +
        "# ZERO-TRUST: mọi kết nối đều phải XÁC THỰC và ĐƯỢC PHÉP, kể cả nội bộ.\n" +
        "apiVersion: security.istio.io/v1beta1\n" +
        "kind: PeerAuthentication\n" +
        "metadata: { name: default, namespace: production }\n" +
        "spec:\n" +
        "  mtls: { mode: STRICT }        # BẮT BUỘC mTLS cho mọi traffic\n" +
        "---\n" +
        "apiVersion: security.istio.io/v1beta1\n" +
        "kind: AuthorizationPolicy\n" +
        "metadata: { name: payment-policy, namespace: production }\n" +
        "spec:\n" +
        "  selector: { matchLabels: { app: payment-service } }\n" +
        "  action: ALLOW\n" +
        "  rules:\n" +
        "    - from:\n" +
        "        - source:\n" +
        "            principals: [\"cluster.local/ns/production/sa/order-service\"]\n" +
        "      to:\n" +
        "        - operation: { methods: [\"POST\"], paths: [\"/payments\"] }\n" +
        "# Mặc định là TỪ CHỐI: chỉ order-service được gọi POST /payments.\n" +
        "---\n" +
        "apiVersion: networking.k8s.io/v1\n" +
        "kind: NetworkPolicy               # tầng mạng L3/L4, độc lập với mesh\n" +
        "metadata: { name: payment-ingress }\n" +
        "spec:\n" +
        "  podSelector: { matchLabels: { app: payment-service } }\n" +
        "  policyTypes: [Ingress]\n" +
        "  ingress:\n" +
        "    - from: [{ podSelector: { matchLabels: { app: order-service } } }]\n" +
        "      ports: [{ protocol: TCP, port: 8080 }]",
    },
    {
      lang: "bash",
      title: "Năm nguyên tắc zero-trust",
      code:
        "# 1) XÁC THỰC MỌI KẾT NỐI — mTLS, danh tính dựa trên CHỨNG CHỈ chứ không\n" +
        "#    phải địa chỉ IP (IP giả mạo được).\n" +
        "# 2) QUYỀN TỐI THIỂU — mặc định từ chối, chỉ mở đúng đường cần thiết.\n" +
        "# 3) MÃ HOÁ MỌI THỨ, cả traffic nội bộ.\n" +
        "# 4) XOAY VÒNG CHỨNG CHỈ tự động, thời hạn ngắn (Istio: 24 giờ).\n" +
        "# 5) GHI NHẬT KÝ mọi truy cập để còn kiểm toán được.\n" +
        "\n" +
        "# KIỂM CHỨNG mTLS thật sự đang bật:\n" +
        "istioctl x describe pod <pod-name>\n" +
        "kubectl exec <pod> -c istio-proxy -- openssl s_client -connect payment-service:8080\n" +
        "\n" +
        "# LỢI ÍCH LỚN NHẤT: một pod bị chiếm KHÔNG cho phép đi ngang sang service\n" +
        "# khác — thiệt hại được giới hạn tại chỗ.\n" +
        "# CÁI GIÁ: thêm độ trễ (~1ms mỗi chặng), thêm CPU cho mã hoá, và phải\n" +
        "# quản lý chính sách (chính sách sai là service không gọi được nhau).",
    },
  ],
},
]);
