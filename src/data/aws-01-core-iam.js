SS.addQuestions('aws', [
{
  cat: 'Hạ tầng toàn cầu',
  q: 'Region, Availability Zone và Edge Location khác nhau thế nào?',
  answer:
    '- **Region**: một vùng địa lý (ví dụ `ap-southeast-1` Singapore), độc lập về mặt vận hành và dữ liệu. Bạn chọn region theo độ trễ tới người dùng, yêu cầu tuân thủ (data residency), giá, và tính khả dụng của dịch vụ.\n' +
    '- **Availability Zone (AZ)**: một hoặc nhiều data center riêng biệt trong region, có nguồn điện/làm mát/mạng độc lập, nối với nhau bằng link độ trễ thấp. Một region thường có 3+ AZ.\n' +
    '- **Edge Location**: điểm hiện diện của CloudFront/Route 53 (hàng trăm nơi), gần người dùng cuối, để cache nội dung và kết thúc TLS.',
  essence:
    'Region = phạm vi dữ liệu & tuân thủ. AZ = đơn vị cách ly lỗi để thiết kế HA. Edge = lớp phân phối gần người dùng. Kiến trúc HA nghĩa là trải tài nguyên qua nhiều AZ.',
  example:
    'Web app cho khách VN: chọn region `ap-southeast-1`, chạy EC2/RDS trên **2–3 AZ** (mất 1 AZ vẫn sống), đặt CloudFront trước để người dùng tải ảnh/JS từ edge location tại TP.HCM/Hà Nội.',
  viz: {
    type: 'tree',
    title: 'Hạ tầng toàn cầu AWS',
    root: {
      label: 'Kiến trúc HA = trải tài nguyên qua nhiều AZ',
      children: [
        { label: 'Region', note: 'vùng địa lý — phạm vi dữ liệu & tuân thủ (ap-southeast-1)' },
        { label: 'Availability Zone (3+ mỗi region)', note: 'data center riêng biệt: điện/làm mát/mạng độc lập — đơn vị cách ly lỗi' },
        { label: 'Edge Location (hàng trăm)', note: 'CloudFront / Route 53 — cache + kết thúc TLS gần người dùng' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Ba tầng địa lý và hệ quả về chi phí/độ trễ",
      code:
        "# REGION: một vùng địa lý độc lập (ap-southeast-1 = Singapore). Dữ liệu KHÔNG\n" +
        "# tự rời region. Mỗi region có bảng giá riêng và tập dịch vụ riêng.\n" +
        "aws ec2 describe-regions --query \u0027Regions[].RegionName\u0027 --output table\n" +
        "\n" +
        "# AZ: một hoặc nhiều trung tâm dữ liệu TÁCH BIỆT về điện/mạng trong cùng region.\n" +
        "# Độ trễ giữa các AZ ~1-2ms -> đủ nhanh để chạy đồng bộ (RDS Multi-AZ).\n" +
        "aws ec2 describe-availability-zones --region ap-southeast-1 \\\n" +
        "  --query \u0027AvailabilityZones[].[ZoneName,ZoneId]\u0027 --output table\n" +
        "\n" +
        "# LƯU Ý QUAN TRỌNG: tên AZ (ap-southeast-1a) được ÁNH XẠ NGẪU NHIÊN theo từng\n" +
        "# tài khoản. \"1a\" của bạn có thể là \"1c\" của tôi. So sánh giữa các tài khoản\n" +
        "# phải dùng ZoneId (apse1-az1) chứ không phải ZoneName.\n" +
        "\n" +
        "# EDGE LOCATION: hàng trăm điểm hiện diện cho CloudFront/Route 53/Global\n" +
        "# Accelerator. Chỉ để cache và kết thúc kết nối, KHÔNG chạy workload.\n" +
        "\n" +
        "# TIỀN: cùng AZ thường miễn phí; khác AZ tính phí hai chiều; khác region đắt hơn;\n" +
        "# ra Internet đắt nhất. Đây là khoản chi phí bị bỏ sót nhiều nhất trên AWS.",
    },
  ],
},
{
  cat: 'IAM',
  q: 'IAM user, group, role và policy là gì?',
  answer:
    '- **Policy**: tài liệu JSON định nghĩa quyền — `Effect` (Allow/Deny), `Action`, `Resource`, `Condition`.\n' +
    '- **User**: danh tính lâu dài cho người/ứng dụng, có credential cố định (password, access key).\n' +
    '- **Group**: tập hợp user, gắn policy chung — quản lý quyền theo vai trò công việc.\n' +
    '- **Role**: danh tính **không có credential cố định**, được "assume" bởi principal đáng tin (EC2, Lambda, user khác, account khác) → nhận **credential tạm thời** từ STS.',
  essence:
    'Policy là quyền; user/group là danh tính con người; role là danh tính tạm dùng cho máy móc và truy cập chéo. Nguyên tắc: ưu tiên role + credential tạm, hạn chế access key vĩnh viễn.',
  example:
    'Team dev: group `Developers` gắn policy read-only production + full quyền dev account. Ứng dụng trên EC2: gắn **instance role** `app-role` cho phép đọc một bucket S3 — không nhúng access key vào code.',
  viz: {
    type: 'tree',
    title: 'IAM — quyền vs danh tính',
    root: {
      label: 'Ưu tiên role + credential tạm, hạn chế access key vĩnh viễn',
      children: [
        { label: 'Policy', note: 'JSON: Effect, Action, Resource, Condition — là QUYỀN' },
        { label: 'User', note: 'danh tính lâu dài cho người/ứng dụng, có credential cố định' },
        { label: 'Group', note: 'tập user, gắn policy chung theo vai trò công việc' },
        { label: 'Role', note: 'danh tính KHÔNG có credential cố định — được "assume" → credential tạm từ STS' },
      ],
    },
  },
  demo: [
    {
      lang: "json",
      title: "Bốn khái niệm và quan hệ giữa chúng",
      code:
        "{\n" +
        "  \"Comment\": \"POLICY: tài liệu JSON mô tả được/không được làm gì. Gắn vào user, group hoặc role.\",\n" +
        "  \"Version\": \"2012-10-17\",\n" +
        "  \"Statement\": [\n" +
        "    {\n" +
        "      \"Sid\": \"DocDinhSanPham\",\n" +
        "      \"Effect\": \"Allow\",\n" +
        "      \"Action\": [\"s3:GetObject\", \"s3:ListBucket\"],\n" +
        "      \"Resource\": [\"arn:aws:s3:::my-bucket\", \"arn:aws:s3:::my-bucket/*\"],\n" +
        "      \"Condition\": { \"IpAddress\": { \"aws:SourceIp\": \"203.0.113.0/24\" } }\n" +
        "    }\n" +
        "  ]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "User vs Group vs Role",
      code:
        "# USER: danh tính LÂU DÀI cho một con người. Có access key/mật khẩu cố định.\n" +
        "#   -> chỉ dùng cho người, và nên tiến tới bỏ hẳn (dùng IAM Identity Center/SSO).\n" +
        "aws iam create-user --user-name alice\n" +
        "\n" +
        "# GROUP: túi chứa user để gắn policy chung. KHÔNG phải danh tính —\n" +
        "#   không assume được, không có credential riêng.\n" +
        "aws iam create-group --group-name developers\n" +
        "aws iam attach-group-policy --group-name developers \\\n" +
        "  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess\n" +
        "aws iam add-user-to-group --user-name alice --group-name developers\n" +
        "\n" +
        "# ROLE: danh tính TẠM THỜI, KHÔNG có credential cố định. Ai đó \"assume\" nó\n" +
        "#   và nhận credential hết hạn sau 15 phút - 12 giờ.\n" +
        "#   -> dùng cho EC2/Lambda/ECS, cho truy cập chéo tài khoản, cho liên kết SSO.\n" +
        "aws iam create-role --role-name app-role \\\n" +
        "  --assume-role-policy-document file://trust-policy.json   # AI được assume\n" +
        "\n" +
        "# Khác biệt cốt lõi: policy nói ĐƯỢC LÀM GÌ; trust policy của role nói AI ĐƯỢC DÙNG.",
    },
  ],
},
{
  cat: 'IAM',
  q: 'Khi nào dùng IAM Role thay vì IAM User?',
  answer:
    'Dùng **Role** khi:\n' +
    '- **Workload trên AWS** (EC2, Lambda, ECS, EKS pod) cần gọi API AWS → gắn role, SDK tự lấy credential tạm, tự xoay vòng.\n' +
    '- **Truy cập chéo account** — account A assume role ở account B.\n' +
    '- **Federated identity** — nhân viên đăng nhập qua SSO/SAML/OIDC rồi assume role.\n\n' +
    'Dùng **User** chỉ khi thực sự cần credential lâu dài (một số công cụ CI cũ, on-prem không federate được) — và nên thay bằng OIDC federation nếu có thể.',
  essence:
    'Role loại bỏ credential lâu dài: không có key để rò rỉ, credential hết hạn sau vài giờ, quyền gắn theo ngữ cảnh. Access key vĩnh viễn là "nợ bảo mật".',
  example:
    'GitHub Actions deploy lên AWS: cấu hình **OIDC trust** giữa GitHub và một IAM role, workflow assume role đó → không còn lưu `AWS_ACCESS_KEY_ID` trong secrets, không có key để bị lộ.',
  viz: {
    type: 'compare',
    cols: ['IAM Role', 'IAM User'],
    rows: [
      ['Credential', 'tạm thời, tự xoay vòng (STS)', 'lâu dài (access key)'],
      ['Dùng cho', 'workload AWS, cross-account, federated SSO/OIDC', 'chỉ khi thực sự cần credential lâu dài'],
      ['Rủi ro key rò rỉ', 'gần như không', '"nợ bảo mật"'],
      ['Ví dụ', 'EC2/Lambda role, GitHub Actions OIDC', 'CI cũ không federate được'],
    ],
  },
  demo: [
    {
      lang: "json",
      title: "Gần như luôn dùng role — user chỉ còn cho con người",
      code:
        "{\n" +
        "  \"Comment\": \"Trust policy: cho phép EC2 assume role này\",\n" +
        "  \"Version\": \"2012-10-17\",\n" +
        "  \"Statement\": [{\n" +
        "    \"Effect\": \"Allow\",\n" +
        "    \"Principal\": { \"Service\": \"ec2.amazonaws.com\" },\n" +
        "    \"Action\": \"sts:AssumeRole\"\n" +
        "  }]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Vì sao access key cố định là rủi ro lớn nhất",
      code:
        "# SAI: nhét access key vào EC2/container/code\n" +
        "export AWS_ACCESS_KEY_ID=AKIA...          # key này KHÔNG BAO GIỜ hết hạn\n" +
        "export AWS_SECRET_ACCESS_KEY=...          # lộ lên GitHub là mất tài khoản\n" +
        "# Đây là nguyên nhân số một của các vụ lộ tài khoản AWS.\n" +
        "\n" +
        "# ĐÚNG: gắn instance profile, SDK tự lấy credential TẠM THỜI qua IMDS\n" +
        "aws ec2 associate-iam-instance-profile \\\n" +
        "  --instance-id i-1234 --iam-instance-profile Name=app-profile\n" +
        "# Credential tự xoay vòng, hết hạn sau vài giờ, không bao giờ nằm trên đĩa.\n" +
        "\n" +
        "# DÙNG ROLE khi:\n" +
        "#  - workload chạy trên AWS (EC2, Lambda, ECS, EKS qua IRSA)\n" +
        "#  - truy cập chéo tài khoản\n" +
        "#  - liên kết danh tính (SSO, OIDC, GitHub Actions)\n" +
        "#  - cấp quyền tạm thời cho một thao tác nhất định\n" +
        "\n" +
        "# DÙNG USER chỉ khi: hệ thống bên ngoài KHÔNG hỗ trợ OIDC/role và bắt buộc\n" +
        "# cần key dài hạn. Khi đó: xoay key định kỳ và giới hạn quyền tối đa.\n" +
        "\n" +
        "# GitHub Actions -> dùng OIDC, KHÔNG lưu access key trong secret:\n" +
        "#   Trust policy với Principal Federated: token.actions.githubusercontent.com",
    },
  ],
},
{
  cat: 'IAM',
  q: 'Logic đánh giá quyền của IAM (policy evaluation)?',
  answer:
    'Khi một principal gọi API, AWS gộp mọi policy áp dụng (identity-based, resource-based, permission boundary, SCP, session policy) và đánh giá:\n' +
    '1. Mặc định: **implicit deny**.\n' +
    '2. Có **explicit Deny** ở bất kỳ policy nào → **từ chối**, dừng.\n' +
    '3. Có **explicit Allow** (và không bị chặn bởi boundary/SCP) → **cho phép**.\n' +
    '4. Không Allow nào → implicit deny.\n\n' +
    'SCP và permission boundary chỉ **giới hạn** (không cấp quyền): quyền hiệu dụng = giao của tất cả.',
  essence:
    'Deny luôn thắng. Allow phải xuất hiện tường minh. Các "hàng rào" (SCP, boundary) chỉ thu hẹp, không mở rộng. Quyền cuối cùng là phần giao.',
  example:
    'Developer có policy Allow `s3:*`, nhưng SCP ở Organizations Deny `s3:DeleteBucket`. Kết quả: xoá bucket bị chặn dù identity policy cho phép — SCP là trần không vượt qua được.',
  viz: {
    type: 'flow',
    title: 'Đánh giá quyền IAM — Deny luôn thắng',
    nodes: ['gộp mọi policy áp dụng', 'có explicit Deny?', 'có explicit Allow (không bị boundary/SCP chặn)?', 'implicit deny'],
    steps: [
      { to: 0, label: 'identity-based + resource-based + boundary + SCP + session policy' },
      { to: 1, label: 'bất kỳ policy nào Deny → TỪ CHỐI, dừng' },
      { to: 2, label: 'không Deny + có Allow tường minh → CHO PHÉP' },
      { to: 3, label: 'không Allow nào → implicit deny. SCP/boundary chỉ GIỚI HẠN, không cấp quyền' },
    ],
  },
  demo: [
    {
      lang: "json",
      title: "Thứ tự đánh giá: Deny thắng tất cả",
      code:
        "{\n" +
        "  \"Comment\": \"Explicit Deny luôn thắng, kể cả khi có Allow ở chỗ khác\",\n" +
        "  \"Version\": \"2012-10-17\",\n" +
        "  \"Statement\": [\n" +
        "    {\n" +
        "      \"Sid\": \"ChoPhepRong\",\n" +
        "      \"Effect\": \"Allow\",\n" +
        "      \"Action\": \"s3:*\",\n" +
        "      \"Resource\": \"*\"\n" +
        "    },\n" +
        "    {\n" +
        "      \"Sid\": \"CamTuyetDoi\",\n" +
        "      \"Effect\": \"Deny\",\n" +
        "      \"Action\": \"s3:DeleteBucket\",\n" +
        "      \"Resource\": \"*\",\n" +
        "      \"Condition\": { \"BoolIfExists\": { \"aws:MultiFactorAuthPresent\": \"false\" } }\n" +
        "    }\n" +
        "  ]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Thứ tự đầy đủ và cách gỡ rối",
      code:
        "# THỨ TỰ ĐÁNH GIÁ (dừng ngay khi có kết quả):\n" +
        "#  1) Explicit DENY ở BẤT KỲ đâu -> TỪ CHỐI. Không gì ghi đè được.\n" +
        "#  2) SCP (Organizations) không cho phép -> từ chối\n" +
        "#  3) Resource-based policy cho phép -> CHO PHÉP (có thể bỏ qua bước sau\n" +
        "#     với một số service, ví dụ S3 bucket policy cấp quyền chéo tài khoản)\n" +
        "#  4) Permission boundary không cho phép -> từ chối\n" +
        "#  5) Session policy không cho phép -> từ chối\n" +
        "#  6) Identity-based policy cho phép -> CHO PHÉP\n" +
        "#  7) Không có gì cho phép -> TỪ CHỐI NGẦM (mặc định)\n" +
        "\n" +
        "# Mô phỏng TRƯỚC khi deploy — tiết kiệm rất nhiều thời gian:\n" +
        "aws iam simulate-principal-policy \\\n" +
        "  --policy-source-arn arn:aws:iam::123456789012:role/app-role \\\n" +
        "  --action-names s3:GetObject \\\n" +
        "  --resource-arns arn:aws:s3:::my-bucket/file.txt\n" +
        "\n" +
        "# \"Access denied\" mà không hiểu vì sao -> bật CloudTrail và xem sự kiện:\n" +
        "aws cloudtrail lookup-events --lookup-attributes \\\n" +
        "  AttributeKey=EventName,AttributeValue=GetObject --max-items 5\n" +
        "# IAM Access Analyzer chỉ ra quyền dư thừa và truy cập ngoài ý muốn.",
    },
  ],
},
{
  cat: 'IAM',
  q: 'STS và AssumeRole hoạt động thế nào?',
  answer:
    'STS (Security Token Service) cấp **credential tạm thời**: access key id + secret + **session token**, có thời hạn (15 phút–12 giờ).\n\n' +
    '`sts:AssumeRole`: principal gọi, nếu **trust policy** của role cho phép principal đó, STS trả credential tạm mang quyền của role.\n\n' +
    'Biến thể: `AssumeRoleWithSAML` (SSO doanh nghiệp), `AssumeRoleWithWebIdentity` (OIDC — Cognito, GitHub, EKS IRSA).\n\n' +
    'Role có **hai** policy: **trust policy** (ai được assume) và **permission policy** (assume xong làm được gì).',
  essence:
    'AssumeRole = "đổi danh tính tạm thời để lấy một bộ quyền khác". Trust policy kiểm soát *ai vào được*, permission policy kiểm soát *vào rồi làm gì*.',
  example:
    'Account `security` chạy tool audit: assume role `AuditRole` ở 50 account con (mỗi account có trust policy cho phép `security` account). Tool nhận credential tạm 1 giờ cho từng account, quét cấu hình, rồi credential tự hết hạn.',
  viz: {
    type: 'flow',
    title: 'STS AssumeRole',
    nodes: ['principal gọi sts:AssumeRole', 'trust policy của role cho phép?', 'STS trả credential tạm (15 phút–12 giờ)', 'principal dùng quyền của role'],
    steps: [
      { to: 1, label: 'trust policy = "AI được assume"' },
      { to: 2, label: 'access key + secret + session token, có thời hạn' },
      { to: 3, label: 'permission policy = "assume xong LÀM ĐƯỢC GÌ". Biến thể: WithSAML (SSO), WithWebIdentity (OIDC)' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Đổi danh tính lấy credential tạm thời",
      code:
        "# STS cấp credential có HẠN. Đây là nền tảng của mọi thứ trong IAM hiện đại.\n" +
        "aws sts assume-role \\\n" +
        "  --role-arn arn:aws:iam::222222222222:role/CrossAccountRead \\\n" +
        "  --role-session-name alice-debug \\\n" +
        "  --duration-seconds 3600 \\\n" +
        "  --external-id \"ma-bi-mat-doi-tac\"      # chống confused deputy khi làm việc với bên thứ ba\n" +
        "\n" +
        "# Trả về ba thứ — thiếu SessionToken là dùng không được:\n" +
        "#   AccessKeyId, SecretAccessKey, SessionToken (hết hạn sau duration-seconds)\n" +
        "\n" +
        "# Cách dùng thực tế: khai profile trong ~/.aws/config, CLI/SDK tự assume và tự gia hạn\n" +
        "#   [profile prod]\n" +
        "#   role_arn = arn:aws:iam::222222222222:role/Admin\n" +
        "#   source_profile = default\n" +
        "#   mfa_serial = arn:aws:iam::111111111111:mfa/alice\n" +
        "aws s3 ls --profile prod\n" +
        "\n" +
        "aws sts get-caller-identity           # đang là AI? Lệnh debug quan trọng nhất\n" +
        "\n" +
        "# CÁC API KHÁC CỦA STS:\n" +
        "#  AssumeRoleWithWebIdentity  — từ OIDC (Google, GitHub Actions, EKS IRSA)\n" +
        "#  AssumeRoleWithSAML         — từ IdP doanh nghiệp (AD FS, Okta)\n" +
        "#  GetSessionToken            — thêm MFA cho user hiện tại\n" +
        "\n" +
        "# ROLE CHAINING: assume role rồi từ đó assume tiếp -> giới hạn CỨNG 1 giờ,\n" +
        "# không nới được dù role cho phép 12 giờ.",
    },
  ],
},
{
  cat: 'IAM',
  q: 'Identity-based policy và resource-based policy khác nhau thế nào?',
  answer:
    '- **Identity-based**: gắn vào user/group/role. Nói "danh tính này được làm gì, ở đâu".\n' +
    '- **Resource-based**: gắn trực tiếp vào **tài nguyên** (S3 bucket policy, SQS queue policy, Lambda resource policy, KMS key policy). Có trường `Principal` — nói "ai được làm gì với tài nguyên này".\n\n' +
    'Resource-based policy cho phép **truy cập chéo account không cần AssumeRole**: bucket ở account A cho phép principal của account B đọc trực tiếp.',
  essence:
    'Identity policy đi theo "người"; resource policy đi theo "đồ vật". Với cùng account, chỉ cần một trong hai Allow. Cross-account thường cần cả hai phía đồng ý.',
  example:
    'S3 bucket `shared-data` (account A) có bucket policy Allow `s3:GetObject` cho `arn:aws:iam::B:role/analytics`. Role `analytics` ở account B cũng cần identity policy Allow `s3:GetObject` trên bucket đó. Cả hai khớp → đọc được.',
  viz: {
    type: 'compare',
    cols: ['Identity-based policy', 'Resource-based policy'],
    rows: [
      ['Gắn vào', 'user / group / role', 'tài nguyên (S3 bucket, SQS, Lambda, KMS key)'],
      ['Trường Principal', 'không', 'có — "ai được làm gì với tài nguyên này"'],
      ['Cross-account', 'cần AssumeRole', 'cho phép truy cập trực tiếp không cần AssumeRole'],
      ['Cùng account', 'chỉ cần một trong hai Allow', 'chỉ cần một trong hai Allow'],
    ],
  },
  demo: [
    {
      lang: "json",
      title: "Gắn vào AI vs gắn vào CÁI GÌ",
      code:
        "{\n" +
        "  \"Comment\": \"RESOURCE-BASED: gắn TRÊN tài nguyên, nêu rõ Principal nào được truy cập. Đây là S3 bucket policy.\",\n" +
        "  \"Version\": \"2012-10-17\",\n" +
        "  \"Statement\": [{\n" +
        "    \"Effect\": \"Allow\",\n" +
        "    \"Principal\": { \"AWS\": \"arn:aws:iam::222222222222:role/PartnerRole\" },\n" +
        "    \"Action\": \"s3:GetObject\",\n" +
        "    \"Resource\": \"arn:aws:s3:::shared-bucket/*\",\n" +
        "    \"Condition\": { \"StringEquals\": { \"aws:PrincipalOrgID\": \"o-abc123\" } }\n" +
        "  }]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Khác biệt thực tế quan trọng nhất: truy cập chéo tài khoản",
      code:
        "# IDENTITY-BASED: gắn vào user/group/role. KHÔNG có trường Principal\n" +
        "# (principal chính là cái nó được gắn vào).\n" +
        "\n" +
        "# RESOURCE-BASED: gắn vào tài nguyên. BẮT BUỘC có Principal.\n" +
        "#   Chỉ một số service hỗ trợ: S3, SQS, SNS, Lambda, KMS, Secrets Manager,\n" +
        "#   ECR, API Gateway, EventBridge, Glue.\n" +
        "\n" +
        "# KHÁC BIỆT QUYẾT ĐỊNH:\n" +
        "#  - Cùng tài khoản: CHỈ CẦN MỘT trong hai cho phép là đủ.\n" +
        "#  - CHÉO TÀI KHOẢN: phải CẢ HAI. Tài khoản A cho phép role gọi sang,\n" +
        "#    và tài khoản B cho phép principal đó truy cập.\n" +
        "#    (Ngoại lệ: S3, KMS và vài service cho phép resource policy tự cấp đủ quyền.)\n" +
        "\n" +
        "aws s3api put-bucket-policy --bucket shared-bucket --policy file://policy.json\n" +
        "aws lambda add-permission --function-name my-fn \\\n" +
        "  --statement-id s3-invoke --action lambda:InvokeFunction \\\n" +
        "  --principal s3.amazonaws.com --source-arn arn:aws:s3:::my-bucket\n" +
        "\n" +
        "# Vì sao KMS quan trọng ở đây: chia sẻ object S3 mã hoá bằng SSE-KMS chéo\n" +
        "# tài khoản thì phải cấp quyền TRÊN CẢ KMS KEY, nếu không vẫn AccessDenied\n" +
        "# dù bucket policy đã đúng. Đây là lỗi rất hay gặp.",
    },
  ],
},
{
  cat: 'IAM',
  q: 'Permission boundary dùng để làm gì?',
  answer:
    'Permission boundary là một **managed policy** gắn vào user/role, đặt **trần quyền tối đa** mà identity đó có thể có — dù identity policy cấp rộng hơn.\n\n' +
    'Quyền hiệu dụng = **giao** của (identity policy) và (permission boundary).\n\n' +
    'Dùng để **uỷ quyền an toàn**: cho phép team tự tạo role/user cho ứng dụng của họ, nhưng mọi role họ tạo bắt buộc có boundary → không thể tự cấp quyền vượt giới hạn (ví dụ không thể tạo role có `iam:*`).',
  essence:
    'Boundary là "trần" cho một identity; SCP là "trần" cho cả account. Cả hai chỉ giới hạn. Chúng cho phép phân quyền quản trị mà không sợ leo thang đặc quyền.',
  example:
    'Platform team cấp cho product team quyền `iam:CreateRole` nhưng kèm điều kiện `iam:PermissionsBoundary` phải = `dev-boundary`. Product team tạo role cho app của họ thoải mái, nhưng role đó không bao giờ đụng được tới billing hay IAM admin.',
  viz: {
    type: 'compare',
    cols: ['Permission boundary', 'SCP (Service Control Policy)'],
    rows: [
      ['Trần cho', 'một identity (user/role)', 'cả account / OU — kể cả root'],
      ['Cấp quyền?', 'không — chỉ giới hạn', 'không — chỉ giới hạn'],
      ['Quyền hiệu dụng', 'giao(identity policy, boundary)', 'giao(mọi policy, SCP)'],
      ['Dùng để', 'uỷ quyền tạo role an toàn (không leo thang đặc quyền)', 'chặn region, chặn tắt CloudTrail, tách prod/dev'],
    ],
  },
  demo: [
    {
      lang: "json",
      title: "Trần quyền — không cấp quyền, chỉ giới hạn",
      code:
        "{\n" +
        "  \"Comment\": \"Boundary: role tạo bởi developer KHÔNG BAO GIỜ vượt quá tập này\",\n" +
        "  \"Version\": \"2012-10-17\",\n" +
        "  \"Statement\": [{\n" +
        "    \"Effect\": \"Allow\",\n" +
        "    \"Action\": [\"s3:*\", \"dynamodb:*\", \"logs:*\", \"lambda:*\"],\n" +
        "    \"Resource\": \"*\"\n" +
        "  }]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Bài toán: cho developer tự tạo role mà không tự nâng quyền",
      code:
        "# Không có boundary, cấp iam:CreateRole cho developer nghĩa là cấp quyền\n" +
        "# ADMIN — họ tạo một role AdministratorAccess rồi assume vào.\n" +
        "\n" +
        "# Boundary đặt TRẦN: quyền hiệu lực = giao của (identity policy) và (boundary).\n" +
        "aws iam put-role-permissions-boundary \\\n" +
        "  --role-name dev-created-role \\\n" +
        "  --permissions-boundary arn:aws:iam::123456789012:policy/DevBoundary\n" +
        "\n" +
        "# Và bắt buộc developer PHẢI gắn boundary khi tạo role mới:\n" +
        "#   Condition: { \"StringEquals\":\n" +
        "#     { \"iam:PermissionsBoundary\": \"arn:aws:iam::123:policy/DevBoundary\" } }\n" +
        "# Thiếu điều kiện này thì boundary vô nghĩa — họ tạo role không boundary.\n" +
        "\n" +
        "# PHÂN BIỆT VỚI SCP:\n" +
        "#   SCP      -> áp cho cả TÀI KHOẢN, do Organizations quản lý\n" +
        "#   Boundary -> áp cho MỘT principal, do IAM quản lý\n" +
        "#   Cả hai đều KHÔNG cấp quyền, chỉ giới hạn.",
    },
  ],
},
{
  cat: 'Organizations',
  q: 'AWS Organizations và SCP là gì?',
  answer:
    '**AWS Organizations**: quản lý nhiều AWS account tập trung, gộp billing, tổ chức account thành cây **OU (Organizational Unit)**.\n\n' +
    '**SCP (Service Control Policy)**: gắn vào OU hoặc account, đặt **trần quyền cho toàn bộ account** đó — kể cả root user của account. SCP **không cấp** quyền, chỉ giới hạn.\n\n' +
    'Dùng: chặn region không cho phép, chặn tắt CloudTrail, chặn xoá log, ép dùng tag, tách môi trường prod/dev bằng OU với SCP khác nhau.',
  essence:
    'Organizations là cấu trúc quản trị nhiều account; SCP là "luật liên bang" áp lên từng account, không ai trong account vượt qua được — kể cả admin.',
  example:
    'OU `Production` có SCP: chỉ cho phép region `ap-southeast-1` và `us-east-1`, Deny `cloudtrail:StopLogging`, Deny `ec2:*` với instance type không nằm trong danh sách duyệt. Dev nghịch ngợm cũng không mở được region lạ hay tắt audit.',
  viz: {
    type: 'tree',
    title: 'AWS Organizations + SCP',
    root: {
      label: 'SCP = "luật liên bang" — không ai trong account vượt qua, kể cả admin',
      children: [
        { label: 'Organizations', note: 'quản lý nhiều account, gộp billing, cây OU' },
        { label: 'SCP gắn vào OU/account', note: 'trần quyền cho toàn account — KHÔNG cấp quyền, chỉ giới hạn' },
        { label: 'Ví dụ dùng', note: 'chặn region, chặn cloudtrail:StopLogging, ép tag, tách prod/dev bằng OU' },
      ],
    },
  },
  demo: [
    {
      lang: "json",
      title: "SCP là trần quyền cho cả tài khoản",
      code:
        "{\n" +
        "  \"Comment\": \"Chặn mọi thao tác ngoài các region được duyệt, trừ global service\",\n" +
        "  \"Version\": \"2012-10-17\",\n" +
        "  \"Statement\": [{\n" +
        "    \"Effect\": \"Deny\",\n" +
        "    \"NotAction\": [\"iam:*\", \"cloudfront:*\", \"route53:*\", \"support:*\", \"organizations:*\"],\n" +
        "    \"Resource\": \"*\",\n" +
        "    \"Condition\": {\n" +
        "      \"StringNotEquals\": { \"aws:RequestedRegion\": [\"ap-southeast-1\", \"us-east-1\"] }\n" +
        "    }\n" +
        "  }]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Cấu trúc OU và các SCP nên có",
      code:
        "# Organizations gom nhiều tài khoản dưới một management account:\n" +
        "#   - gộp hoá đơn (và chia sẻ Reserved Instance/Savings Plans giữa các tài khoản)\n" +
        "#   - SCP áp trần quyền cho cả tài khoản\n" +
        "#   - tạo tài khoản mới bằng API\n" +
        "\n" +
        "aws organizations create-organizational-unit \\\n" +
        "  --parent-id r-abc1 --name Production\n" +
        "aws organizations attach-policy \\\n" +
        "  --policy-id p-xyz --target-id ou-abc1-def2\n" +
        "\n" +
        "# SCP KHÔNG cấp quyền — chỉ giới hạn. Quyền hiệu lực = giao của SCP và IAM policy.\n" +
        "# SCP KHÔNG áp dụng cho management account -> đừng chạy workload ở đó.\n" +
        "\n" +
        "# BỘ SCP NÊN CÓ NGAY TỪ ĐẦU:\n" +
        "#  - chặn region không dùng (giảm bề mặt tấn công và chi phí ngoài ý muốn)\n" +
        "#  - cấm tắt CloudTrail/Config/GuardDuty\n" +
        "#  - cấm xoá log\n" +
        "#  - cấm tạo IAM user (ép dùng SSO)\n" +
        "#  - bắt buộc mã hoá khi tạo EBS/S3\n" +
        "\n" +
        "# CẢNH BÁO: SCP sai làm KHOÁ CỨNG cả tài khoản. Luôn thử ở OU sandbox trước.",
    },
  ],
},
{
  cat: 'Bảo mật',
  q: 'Shared Responsibility Model của AWS nói gì?',
  answer:
    'AWS chịu trách nhiệm **security OF the cloud**: hạ tầng vật lý, phần cứng, mạng nền, virtualization, và với dịch vụ managed thì cả patching OS/engine.\n\n' +
    'Khách hàng chịu trách nhiệm **security IN the cloud**: cấu hình IAM, security group, mã hoá dữ liệu, patch OS (với EC2), bảo mật ứng dụng, quản lý credential, phân loại dữ liệu.\n\n' +
    'Ranh giới **dịch chuyển theo dịch vụ**: EC2 (khách patch OS) → RDS (AWS patch engine, khách quản schema/quyền) → S3/DynamoDB (khách chỉ lo IAM + cấu hình + dữ liệu).',
  essence:
    'AWS lo phần "cloud"; bạn lo phần "trong cloud". Càng dùng dịch vụ managed cao cấp, phần bạn phải lo càng nhỏ — nhưng cấu hình sai (bucket public) luôn là lỗi của khách.',
  example:
    'Rò rỉ dữ liệu S3 gần như luôn do khách hàng đặt bucket public hoặc IAM policy quá rộng — không phải AWS bị hack. Với RDS, khách không cần patch MySQL nhưng vẫn phải đặt mật khẩu mạnh và không mở security group ra 0.0.0.0/0.',
  viz: {
    type: 'compare',
    cols: ['AWS — security OF the cloud', 'Khách — security IN the cloud'],
    rows: [
      ['Lo gì', 'hạ tầng vật lý, phần cứng, mạng nền, virtualization', 'IAM, security group, mã hoá dữ liệu, bảo mật ứng dụng'],
      ['EC2', 'hypervisor, host', 'patch OS, cấu hình'],
      ['RDS', 'patch engine', 'schema, quyền, mật khẩu'],
      ['S3/DynamoDB', 'tất cả trừ dưới đây', 'chỉ IAM + cấu hình + phân loại dữ liệu'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ranh giới trách nhiệm, nhìn qua từng dịch vụ",
      code:
        "# AWS lo BẢO MẬT CỦA đám mây: trung tâm dữ liệu, phần cứng, hypervisor,\n" +
        "# mạng vật lý, hạ tầng dịch vụ managed.\n" +
        "# BẠN lo BẢO MẬT TRONG đám mây: dữ liệu, phân quyền, cấu hình, mã hoá,\n" +
        "# vá lỗi phần bạn kiểm soát.\n" +
        "\n" +
        "# Ranh giới DỊCH CHUYỂN theo mô hình dịch vụ:\n" +
        "# EC2 (IaaS)    -> bạn lo: OS, vá lỗi, firewall, mã hoá, ứng dụng\n" +
        "sudo yum update -y                       # việc của BẠN\n" +
        "aws ec2 modify-instance-attribute --groups sg-123    # việc của BẠN\n" +
        "\n" +
        "# RDS (PaaS)    -> AWS lo: OS, vá engine, sao lưu\n" +
        "#                  bạn lo:  schema, phân quyền DB, mã hoá, security group\n" +
        "aws rds modify-db-instance --db-instance-identifier prod \\\n" +
        "  --auto-minor-version-upgrade                        # AWS vá, BẠN bật\n" +
        "\n" +
        "# S3 / Lambda   -> AWS lo gần hết hạ tầng\n" +
        "#                  bạn lo:  bucket policy, mã hoá, code, IAM role\n" +
        "aws s3api put-public-access-block --bucket my-bucket \\\n" +
        "  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true\n" +
        "\n" +
        "# THỰC TẾ: gần như mọi sự cố rò rỉ dữ liệu trên AWS đều nằm ở phía KHÁCH HÀNG —\n" +
        "# bucket để public, security group mở 0.0.0.0/0, access key lộ lên GitHub.\n" +
        "# Hạ tầng AWS hiếm khi là vấn đề.",
    },
  ],
},
{
  cat: 'Well-Architected',
  q: 'Well-Architected Framework có những trụ cột nào?',
  answer:
    'Sáu trụ cột:\n' +
    '1. **Operational Excellence**: IaC, observability, runbook, cải tiến liên tục.\n' +
    '2. **Security**: least privilege, mã hoá, phát hiện, bảo vệ theo lớp.\n' +
    '3. **Reliability**: multi-AZ, auto scaling, tự phục hồi, kiểm thử DR.\n' +
    '4. **Performance Efficiency**: chọn đúng loại tài nguyên, serverless, đo và điều chỉnh.\n' +
    '5. **Cost Optimization**: right-sizing, mua Reserved/Savings Plans/Spot, tắt cái không dùng.\n' +
    '6. **Sustainability**: giảm lượng tài nguyên và năng lượng tiêu thụ.',
  essence:
    'Một bộ câu hỏi review kiến trúc theo 6 góc nhìn. Không phải checklist bắt buộc mà là khung để nhận ra đánh đổi và nợ kiến trúc trước khi nó thành sự cố.',
  example:
    'Well-Architected Review phát hiện: RDS single-AZ (Reliability), security group mở 22 ra internet (Security), instance m5.4xlarge dùng 8% CPU (Cost). Ba việc cần làm rõ ràng, xếp ưu tiên theo rủi ro.',
  viz: {
    type: 'tree',
    title: 'Well-Architected Framework — 6 trụ cột',
    root: {
      label: 'Khung để nhận ra đánh đổi và nợ kiến trúc trước khi thành sự cố',
      children: [
        { label: 'Operational Excellence', note: 'IaC, observability, runbook' },
        { label: 'Security', note: 'least privilege, mã hoá, phát hiện, bảo vệ theo lớp' },
        { label: 'Reliability', note: 'multi-AZ, auto scaling, tự phục hồi, DR' },
        { label: 'Performance Efficiency', note: 'chọn đúng tài nguyên, serverless, đo & điều chỉnh' },
        { label: 'Cost Optimization', note: 'right-sizing, Reserved/Savings/Spot, tắt cái không dùng' },
        { label: 'Sustainability', note: 'giảm tài nguyên và năng lượng' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Sáu trụ cột và câu hỏi kiểm tra thực tế",
      code:
        "# 1) OPERATIONAL EXCELLENCE — vận hành bằng code, cải tiến liên tục\n" +
        "#    \"Deploy có tự động không? Rollback mất bao lâu? Có runbook không?\"\n" +
        "aws cloudformation deploy --template-file infra.yml --stack-name prod\n" +
        "\n" +
        "# 2) SECURITY — quyền tối thiểu, mã hoá, truy vết\n" +
        "#    \"Còn IAM user nào không? Dữ liệu có mã hoá cả khi nghỉ lẫn khi truyền?\"\n" +
        "aws accessanalyzer list-findings --analyzer-arn $ANALYZER\n" +
        "\n" +
        "# 3) RELIABILITY — chịu lỗi, tự phục hồi\n" +
        "#    \"Mất một AZ thì sao? RTO/RPO là bao nhiêu? Đã DIỄN TẬP khôi phục chưa?\"\n" +
        "\n" +
        "# 4) PERFORMANCE EFFICIENCY — chọn đúng loại tài nguyên\n" +
        "#    \"Instance type có còn phù hợp? Đã thử Graviton chưa? Có cache chưa?\"\n" +
        "\n" +
        "# 5) COST OPTIMIZATION — trả đúng thứ đang dùng\n" +
        "#    \"Còn tài nguyên nào chạy không tải? Có Savings Plans chưa? Lifecycle S3?\"\n" +
        "aws ce get-cost-and-usage --time-period Start=2026-08-01,End=2026-09-01 \\\n" +
        "  --granularity MONTHLY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE\n" +
        "\n" +
        "# 6) SUSTAINABILITY — giảm tác động môi trường (thêm năm 2021)\n" +
        "\n" +
        "# Công cụ tự đánh giá miễn phí, sinh ra danh sách rủi ro có mức ưu tiên:\n" +
        "aws wellarchitected create-workload --workload-name prod --environment PRODUCTION",
    },
  ],
},
{
  cat: 'Bảo mật',
  q: 'KMS và envelope encryption hoạt động thế nào?',
  answer:
    'KMS quản lý **CMK (Customer Master Key)** — key gốc không bao giờ rời KMS.\n\n' +
    '**Envelope encryption**: để mã hoá dữ liệu lớn, dịch vụ xin KMS một **data key**: KMS trả về (data key dạng plaintext) + (data key đã mã hoá bằng CMK). Dịch vụ dùng plaintext data key mã hoá dữ liệu, rồi **vứt plaintext**, lưu data key đã mã hoá cạnh dữ liệu. Giải mã: gửi data key mã hoá cho KMS → nhận lại plaintext data key.\n\n' +
    'Ưu điểm: không gọi KMS cho từng byte, giảm chi phí/độ trễ, vẫn kiểm soát qua CMK.',
  essence:
    'CMK mã hoá các data key; data key mã hoá dữ liệu. Xoay CMK hoặc thu hồi quyền dùng CMK là vô hiệu hoá mọi dữ liệu — điểm kiểm soát tập trung.',
  example:
    'S3 SSE-KMS: mỗi object được mã hoá bằng một data key riêng, data key đó mã hoá bằng CMK của bạn. Xoá quyền `kms:Decrypt` trên CMK khỏi một role → role đó không đọc được object nào trong bucket, dù có `s3:GetObject`.',
  viz: {
    type: 'flow',
    title: 'Envelope encryption',
    nodes: ['xin data key từ KMS', 'nhận plaintext key + encrypted key (bằng CMK)', 'mã hoá dữ liệu bằng plaintext key', 'vứt plaintext, lưu encrypted key cạnh dữ liệu', 'giải mã: gửi encrypted key cho KMS'],
    steps: [
      { to: 2, label: 'CMK không bao giờ rời KMS; CMK mã hoá các data key, data key mã hoá dữ liệu' },
      { to: 3, label: 'không gọi KMS cho từng byte → giảm chi phí/độ trễ' },
      { to: 4, label: 'xoay CMK hoặc thu hồi kms:Decrypt = vô hiệu hoá mọi dữ liệu' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Khoá mã hoá khoá — vì sao không mã hoá thẳng bằng KMS",
      code:
        "# KMS chỉ mã hoá trực tiếp được tối đa 4KB, và mỗi lần gọi là một API call.\n" +
        "# ENVELOPE ENCRYPTION giải quyết cả hai:\n" +
        "#   1) xin KMS một data key -> nhận về BẢN RÕ + BẢN ĐÃ MÃ HOÁ của cùng khoá đó\n" +
        "#   2) mã hoá dữ liệu bằng bản rõ (nhanh, cục bộ, không giới hạn kích thước)\n" +
        "#   3) XOÁ bản rõ khỏi bộ nhớ, lưu bản đã mã hoá KÈM dữ liệu\n" +
        "#   4) khi giải mã: gửi bản đã mã hoá cho KMS -> nhận lại bản rõ\n" +
        "\n" +
        "aws kms generate-data-key --key-id alias/app-key --key-spec AES_256\n" +
        "# Plaintext: (dùng rồi vứt)   CiphertextBlob: (lưu cùng file dữ liệu)\n" +
        "\n" +
        "# CMK (khoá gốc) KHÔNG BAO GIỜ rời khỏi KMS/HSM. Đây là điểm mấu chốt.\n" +
        "\n" +
        "# Ba loại khoá:\n" +
        "#  AWS managed (aws/s3)  — miễn phí, tự xoay vòng, KHÔNG kiểm soát policy\n" +
        "#  Customer managed      — $1/tháng, tự đặt policy, tự bật xoay vòng, XOÁ được\n" +
        "#  Customer provided     — bạn tự mang khoá vào\n" +
        "aws kms create-key --description \"app data key\"\n" +
        "aws kms enable-key-rotation --key-id $KEY_ID     # xoay hàng năm, tự động\n" +
        "\n" +
        "# XOÁ KHOÁ = XOÁ VĨNH VIỄN DỮ LIỆU. Bắt buộc chờ 7-30 ngày:\n" +
        "aws kms schedule-key-deletion --key-id $KEY_ID --pending-window-in-days 30\n" +
        "\n" +
        "# CHI PHÍ: mỗi lần giải mã là một API call có tính tiền. Hệ thống đọc nhiều\n" +
        "# nên bật data key caching, nếu không hoá đơn KMS sẽ gây bất ngờ.",
    },
  ],
},
{
  cat: 'Bảo mật',
  q: 'Secrets Manager và SSM Parameter Store — chọn cái nào?',
  answer:
    '- **Parameter Store** (SSM): lưu config & secret, phân cấp theo path, `String`/`StringList`/`SecureString` (mã hoá KMS). **Standard tier miễn phí**, không tự xoay vòng.\n' +
    '- **Secrets Manager**: chuyên cho secret, có **automatic rotation** (Lambda xoay mật khẩu RDS/Redshift/DocumentDB tích hợp sẵn), cross-region replication, resource policy. **Tính phí theo secret + API call**.',
  essence:
    'Parameter Store cho config và secret đơn giản, rẻ. Secrets Manager khi cần xoay vòng tự động và quản lý vòng đời secret nghiêm ngặt (DB credential, API key đối tác).',
  example:
    'Feature flag, endpoint URL, log level → Parameter Store (`/myapp/prod/...`). Mật khẩu DB production cần xoay 30 ngày/lần → Secrets Manager với rotation Lambda, ứng dụng đọc secret mỗi lần tạo connection pool.',
  viz: {
    type: 'compare',
    cols: ['SSM Parameter Store', 'Secrets Manager'],
    rows: [
      ['Mục đích', 'config & secret đơn giản', 'chuyên cho secret'],
      ['Automatic rotation', 'không', 'có (Lambda xoay RDS/Redshift/DocumentDB)'],
      ['Chi phí', 'Standard tier miễn phí', 'phí theo secret + API call'],
      ['Dùng cho', 'feature flag, endpoint, log level', 'DB credential, API key đối tác'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Chọn theo nhu cầu xoay vòng và ngân sách",
      code:
        "# SECRETS MANAGER — $0.40/secret/tháng + phí API\n" +
        "#  + TỰ ĐỘNG XOAY VÒNG (tích hợp sẵn RDS/Redshift/DocumentDB qua Lambda)\n" +
        "#  + nhân bản chéo region\n" +
        "#  + resource policy riêng cho từng secret\n" +
        "aws secretsmanager create-secret --name prod/db/password \\\n" +
        "  --secret-string \u0027{\"username\":\"admin\",\"password\":\"...\"}\u0027\n" +
        "aws secretsmanager rotate-secret --secret-id prod/db/password \\\n" +
        "  --rotation-lambda-arn $LAMBDA --rotation-rules AutomaticallyAfterDays=30\n" +
        "aws secretsmanager get-secret-value --secret-id prod/db/password --query SecretString\n" +
        "\n" +
        "# PARAMETER STORE — Standard MIỄN PHÍ (tới 10.000 tham số)\n" +
        "#  + lưu cả cấu hình thường lẫn bí mật (SecureString mã hoá bằng KMS)\n" +
        "#  + phân cấp theo đường dẫn, tích hợp sẵn nhiều dịch vụ\n" +
        "#  - KHÔNG tự xoay vòng (phải tự viết)\n" +
        "aws ssm put-parameter --name /prod/db/password --value \"...\" \\\n" +
        "  --type SecureString --key-id alias/app-key\n" +
        "aws ssm get-parameters-by-path --path /prod/ --recursive --with-decryption\n" +
        "\n" +
        "# CHỌN:\n" +
        "#  - cần xoay vòng tự động, hoặc là credential DB -> Secrets Manager\n" +
        "#  - cấu hình thường, hoặc bí mật ít thay đổi, ngân sách chặt -> Parameter Store\n" +
        "#  - hàng nghìn bí mật -> Parameter Store rẻ hơn rất nhiều\n" +
        "# TUYỆT ĐỐI KHÔNG để bí mật trong biến môi trường của Lambda/ECS task definition:\n" +
        "# chúng hiện nguyên văn trong console và CloudTrail.",
    },
  ],
},
{
  cat: 'Quan sát & tuân thủ',
  q: 'CloudTrail, CloudWatch và AWS Config khác nhau thế nào?',
  answer:
    '- **CloudTrail**: nhật ký **API call** — ai gọi API gì, khi nào, từ IP nào. Dùng cho audit bảo mật, điều tra sự cố ("ai xoá bucket này?").\n' +
    '- **CloudWatch**: **metrics, logs, alarms, dashboards** — sức khoẻ và hiệu năng vận hành ("CPU bao nhiêu?", "có lỗi 5xx không?").\n' +
    '- **AWS Config**: **lịch sử cấu hình tài nguyên** và đánh giá tuân thủ theo rule ("security group nào mở port 22?", "cấu hình này thay đổi lúc nào, từ gì sang gì?").',
  essence:
    'CloudTrail = ai làm gì (hành động). CloudWatch = hệ thống đang thế nào (trạng thái). Config = tài nguyên được cấu hình ra sao theo thời gian (cấu trúc). Ba góc nhìn bổ sung nhau.',
  example:
    'Sự cố "port DB bỗng mở ra internet": Config cho biết security group đổi lúc 3:14 sáng; CloudTrail cho biết `ec2:AuthorizeSecurityGroupIngress` được gọi bởi role CI; CloudWatch cho thấy sau đó có lưu lượng lạ tới cổng 3306.',
  viz: {
    type: 'compare',
    cols: ['CloudTrail', 'CloudWatch', 'AWS Config'],
    rows: [
      ['Trả lời', 'AI làm gì (API call, IP, khi nào)', 'hệ thống đang thế nào (CPU, lỗi 5xx)', 'tài nguyên cấu hình ra sao theo thời gian'],
      ['Dùng cho', 'audit bảo mật, điều tra "ai xoá bucket?"', 'sức khoẻ, hiệu năng, alarm', 'tuân thủ, lịch sử cấu hình'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "AI làm gì / Hệ thống thế nào / Cấu hình có đúng không",
      code:
        "# CLOUDTRAIL — nhật ký API: AI gọi gì, lúc nào, từ IP nào. Dùng để ĐIỀU TRA.\n" +
        "aws cloudtrail lookup-events \\\n" +
        "  --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteBucket \\\n" +
        "  --start-time 2026-09-01T00:00:00Z\n" +
        "# Mặc định chỉ giữ 90 ngày trong Event history -> tạo trail ghi ra S3 để giữ lâu.\n" +
        "# Data events (S3 GetObject, Lambda Invoke) KHÔNG bật mặc định và tốn tiền.\n" +
        "\n" +
        "# CLOUDWATCH — số liệu và log VẬN HÀNH: CPU, độ trễ, lỗi, log ứng dụng.\n" +
        "# Dùng để CẢNH BÁO và GỠ RỐI hiệu năng.\n" +
        "aws cloudwatch put-metric-alarm --alarm-name high-cpu \\\n" +
        "  --metric-name CPUUtilization --namespace AWS/EC2 \\\n" +
        "  --statistic Average --period 300 --threshold 80 \\\n" +
        "  --comparison-operator GreaterThanThreshold --evaluation-periods 2\n" +
        "\n" +
        "# AWS CONFIG — TRẠNG THÁI CẤU HÌNH theo thời gian và mức tuân thủ.\n" +
        "# Dùng để trả lời \"tài nguyên này đã đổi gì trong 6 tháng qua\" và\n" +
        "# \"có bao nhiêu bucket đang public\".\n" +
        "aws configservice get-resource-config-history \\\n" +
        "  --resource-type AWS::S3::Bucket --resource-id my-bucket\n" +
        "aws configservice put-config-rule --config-rule file://rule.json\n" +
        "\n" +
        "# Phân biệt nhanh:\n" +
        "#   CloudTrail = AI đã LÀM GÌ        (kiểm toán, bảo mật)\n" +
        "#   CloudWatch = hệ thống ĐANG SAO   (vận hành, hiệu năng)\n" +
        "#   Config     = cấu hình ĐANG THẾ NÀO và ĐÃ ĐỔI RA SAO (tuân thủ)",
    },
  ],
},
{
  cat: 'IAM',
  q: 'Chuỗi tìm credential (credential provider chain) của AWS SDK/CLI?',
  answer:
    'SDK tìm credential theo thứ tự (rút gọn):\n' +
    '1. Tham số truyền trực tiếp trong code.\n' +
    '2. Biến môi trường (`AWS_ACCESS_KEY_ID`, `AWS_SESSION_TOKEN`).\n' +
    '3. File `~/.aws/credentials` / `~/.aws/config` (profile, SSO, assume-role).\n' +
    '4. Container credentials (ECS task role qua endpoint metadata).\n' +
    '5. **Instance profile** (EC2 IMDS) / **IRSA** (EKS web identity token).\n\n' +
    'Dừng ở nguồn đầu tiên tìm thấy.',
  essence:
    'Cùng một dòng code chạy được ở laptop (profile), CI (env var/OIDC) và production (instance/task role) mà không đổi — SDK tự dò. Mục tiêu: production không bao giờ tới nhánh "access key".',
  example:
    'Local: `aws sso login` → SDK dùng SSO profile. Trên ECS: không có env var, không có file → SDK lấy task role qua container credential endpoint. Không nhánh nào cần key vĩnh viễn.',
  viz: {
    type: 'layers',
    title: 'Credential provider chain (dừng ở nguồn đầu tiên tìm thấy)',
    layers: [
      { name: 'Tham số trong code', tag: 'ưu tiên cao' },
      { name: 'Biến môi trường', note: 'AWS_ACCESS_KEY_ID, AWS_SESSION_TOKEN' },
      { name: '~/.aws/credentials & config', note: 'profile, SSO, assume-role' },
      { name: 'Container credentials', note: 'ECS task role qua endpoint metadata' },
      { name: 'Instance profile (EC2 IMDS) / IRSA (EKS)', tag: 'production' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Thứ tự tìm và cách gỡ rối \"nhầm credential\"",
      code:
        "# SDK/CLI tìm credential theo THỨ TỰ, dừng ở cái đầu tiên tìm thấy:\n" +
        "#  1) tham số dòng lệnh / tham số truyền vào code\n" +
        "#  2) BIẾN MÔI TRƯỜNG\n" +
        "export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... AWS_SESSION_TOKEN=...\n" +
        "#  3) ~/.aws/credentials  (profile, mặc định là [default])\n" +
        "#  4) ~/.aws/config       (role_arn + source_profile, SSO)\n" +
        "#  5) container credential (ECS/Fargate: biến AWS_CONTAINER_CREDENTIALS_RELATIVE_URI)\n" +
        "#  6) IMDS trên EC2 (instance profile)  <- chậm nhất vì phải gọi mạng\n" +
        "\n" +
        "# BẪY KINH ĐIỂN: biến môi trường cũ còn sót trong shell che mất instance profile\n" +
        "# -> \"vì sao trên máy tôi chạy được mà trên EC2 thì AccessDenied\", hoặc ngược lại.\n" +
        "env | grep AWS_          # kiểm tra ĐẦU TIÊN khi gặp lỗi quyền\n" +
        "unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN\n" +
        "\n" +
        "aws sts get-caller-identity        # đang là AI? Luôn chạy lệnh này trước khi đoán\n" +
        "\n" +
        "# Xem thứ tự đã thử ở mức chi tiết:\n" +
        "aws s3 ls --debug 2>&1 | grep -i \"credential\"\n" +
        "\n" +
        "# Trên EC2, luôn bật IMDSv2 (bắt buộc dùng token -> chống SSRF đánh cắp credential):\n" +
        "aws ec2 modify-instance-metadata-options --instance-id i-123 \\\n" +
        "  --http-tokens required --http-endpoint enabled",
    },
  ],
},
{
  cat: 'Hạ tầng toàn cầu',
  q: 'Global service và regional service — phân biệt và ví dụ?',
  answer:
    'Hầu hết dịch vụ là **regional**: tài nguyên tồn tại trong một region, endpoint có tên region (`ec2.ap-southeast-1.amazonaws.com`), dữ liệu không tự rời region.\n\n' +
    '**Global** (hoặc edge): IAM, Route 53, CloudFront, WAF (cho CloudFront), AWS Organizations, Shield. Chúng không gắn với một region cụ thể.\n\n' +
    'S3 bucket là regional nhưng namespace tên là global (tên bucket duy nhất toàn thế giới).',
  essence:
    'Regional là mặc định và là ranh giới cách ly lỗi + tuân thủ. Chỉ một nhóm nhỏ dịch vụ điều khiển/phân phối là global. Thiết kế DR nghĩa là nhân bản tài nguyên regional sang region khác.',
  example:
    'Sự cố region `us-east-1`: IAM và Route 53 (global) vẫn hoạt động, bạn có thể đổi Route 53 failover trỏ sang region dự phòng nơi bạn đã nhân bản EC2/RDS/S3.',
  viz: {
    type: 'compare',
    cols: ['Regional (mặc định)', 'Global / edge'],
    rows: [
      ['Tài nguyên tồn tại', 'trong một region, endpoint có tên region', 'không gắn region cụ thể'],
      ['Dữ liệu', 'không tự rời region (ranh giới tuân thủ)', '—'],
      ['Ví dụ', 'EC2, RDS, S3 (bucket regional, tên global)', 'IAM, Route 53, CloudFront, Organizations, Shield'],
      ['Khi region us-east-1 sự cố', 'phải có DR ở region khác', 'IAM & Route 53 vẫn hoạt động'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Vì sao us-east-1 luôn xuất hiện",
      code:
        "# GLOBAL — không thuộc region nào, và endpoint thường nằm ở us-east-1:\n" +
        "#   IAM, Route 53, CloudFront, WAF (cho CloudFront), Organizations,\n" +
        "#   Billing, Health Dashboard, S3 (tên bucket global, dữ liệu thì regional)\n" +
        "aws iam list-users                     # không cần --region\n" +
        "aws cloudfront list-distributions\n" +
        "\n" +
        "# REGIONAL — mọi thứ còn lại. Tài nguyên chỉ tồn tại trong region của nó:\n" +
        "#   EC2, VPC, RDS, Lambda, SQS, DynamoDB, ECS, CloudWatch\n" +
        "aws ec2 describe-instances --region ap-southeast-1\n" +
        "# Đổi region là thấy danh sách trống -> \"instance của tôi biến mất đâu rồi\"\n" +
        "# gần như luôn là do đang xem nhầm region.\n" +
        "\n" +
        "# NHỮNG THỨ BẮT BUỘC PHẢI Ở us-east-1 (rất hay vướng):\n" +
        "#  - chứng chỉ ACM dùng cho CloudFront\n" +
        "#  - WAF Web ACL gắn vào CloudFront\n" +
        "#  - metric của CloudFront/Route 53 trong CloudWatch\n" +
        "#  - Billing alarm\n" +
        "aws acm request-certificate --domain-name example.com \\\n" +
        "  --validation-method DNS --region us-east-1     # BẮT BUỘC us-east-1\n" +
        "\n" +
        "# S3 là trường hợp lai: tên bucket là DUY NHẤT TOÀN CẦU, nhưng dữ liệu\n" +
        "# nằm ở đúng một region -> chọn region gần người dùng để giảm độ trễ.",
    },
  ],
},
{
  cat: 'Bảo mật',
  q: 'Bảo vệ root account như thế nào?',
  answer:
    '- **Bật MFA** cho root (ưu tiên hardware key).\n' +
    '- **Không tạo access key** cho root; nếu có thì xoá.\n' +
    '- Không dùng root cho việc hằng ngày — tạo IAM user/role admin riêng.\n' +
    '- Đặt email root là distribution list, mật khẩu mạnh lưu trong password manager.\n' +
    '- Bật CloudTrail + alarm cho **mọi hành động root**.\n' +
    '- Trong Organizations, dùng SCP để giới hạn cả root của account con.',
  essence:
    'Root là "chìa khoá vạn năng" của một account — chỉ dùng cho vài tác vụ bắt buộc (đóng account, đổi support plan, một số cấu hình billing). Còn lại khoá kỹ và giám sát.',
  example:
    'EventBridge rule: bất kỳ CloudTrail event nào có `userIdentity.type = Root` → SNS gửi cảnh báo tới team security ngay lập tức. Root chỉ nên xuất hiện vài lần mỗi năm.',
  viz: {
    type: 'tree',
    title: 'Bảo vệ root account — "chìa khoá vạn năng"',
    root: {
      label: 'Chỉ dùng cho vài tác vụ bắt buộc (đóng account, đổi support plan)',
      children: [
        { label: 'Bật MFA (ưu tiên hardware key)' },
        { label: 'KHÔNG tạo access key cho root; có thì xoá' },
        { label: 'Không dùng root hằng ngày — tạo IAM admin riêng' },
        { label: 'CloudTrail + alarm cho MỌI hành động root' },
        { label: 'Trong Organizations: SCP giới hạn cả root của account con' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Root là tài khoản duy nhất không giới hạn được",
      code:
        "# Root có quyền TUYỆT ĐỐI: IAM policy và SCP đều KHÔNG chặn được nó.\n" +
        "# Nguyên tắc: dùng một lần lúc thiết lập, rồi khoá lại và không đụng tới nữa.\n" +
        "\n" +
        "# 1) BẬT MFA — ưu tiên khoá phần cứng (YubiKey), không dùng SMS\n" +
        "aws iam get-account-summary --query \u0027SummaryMap.AccountMFAEnabled\u0027   # phải = 1\n" +
        "\n" +
        "# 2) XOÁ access key của root (nếu có) — root KHÔNG BAO GIỜ cần access key\n" +
        "aws iam list-access-keys        # với credential root: phải TRỐNG\n" +
        "\n" +
        "# 3) Đặt mật khẩu mạnh, lưu trong két bảo mật của công ty, không lưu trên máy cá nhân\n" +
        "# 4) Dùng email nhóm (aws-root@congty.com), không dùng email cá nhân —\n" +
        "#    người đó nghỉ việc là mất quyền khôi phục tài khoản\n" +
        "# 5) Cảnh báo mỗi khi root ĐĂNG NHẬP:\n" +
        "aws cloudwatch put-metric-alarm --alarm-name root-login \\\n" +
        "  --metric-name RootAccountUsage --namespace CloudTrailMetrics \\\n" +
        "  --statistic Sum --period 300 --threshold 1 \\\n" +
        "  --comparison-operator GreaterThanOrEqualToThreshold --evaluation-periods 1\n" +
        "\n" +
        "# NHỮNG VIỆC CHỈ ROOT LÀM ĐƯỢC (lý do duy nhất phải đăng nhập lại):\n" +
        "#  - đổi tên/email tài khoản, đổi thông tin thanh toán\n" +
        "#  - đóng tài khoản AWS\n" +
        "#  - khôi phục quyền khi lỡ khoá hết IAM\n" +
        "#  - đăng ký bán trên AWS Marketplace, đổi chính sách hỗ trợ\n" +
        "\n" +
        "# Trong Organizations: bật root access management để khoá hẳn root\n" +
        "# của các tài khoản thành viên.",
    },
  ],
},
{
  cat: 'Vận hành',
  q: 'Service quotas (limits) là gì và xử lý thế nào?',
  answer:
    'Mỗi dịch vụ có quota mặc định theo account/region: số VPC, số EC2 vCPU theo family, Lambda concurrent executions, số rule EventBridge...\n\n' +
    'Có loại **tăng được** (mở ticket / Service Quotas console) và loại **cứng** (không đổi).\n\n' +
    'Chạm quota gây lỗi khó đoán (`LimitExceeded`, throttling). Nên: theo dõi bằng CloudWatch + Service Quotas, xin tăng **trước** khi launch lớn, thiết kế để không phụ thuộc vào một tài nguyên đơn.',
  essence:
    'Quota là ràng buộc thật ảnh hưởng khả năng scale. Coi nó như một phần capacity planning — biết quota hiện tại, mức tiêu thụ, và lead time xin tăng.',
  example:
    'Chuẩn bị sự kiện flash sale: Lambda concurrency mặc định 1.000/region. Dự kiến 5.000 concurrent → xin tăng lên 10.000 trước 2 tuần, đồng thời đặt **reserved concurrency** cho function quan trọng để không bị function khác "ăn" hết quota.',
  viz: {
    type: 'tree',
    title: 'Service quotas — một phần của capacity planning',
    root: {
      label: 'Biết quota hiện tại, mức tiêu thụ, và lead time xin tăng',
      children: [
        { label: 'Loại tăng được', note: 'mở ticket / Service Quotas console' },
        { label: 'Loại cứng', note: 'không đổi — thiết kế để không phụ thuộc' },
        { label: 'Theo dõi', note: 'CloudWatch + Service Quotas' },
        { label: 'Trước launch lớn', note: 'xin tăng TRƯỚC 1–2 tuần; reserved concurrency cho function quan trọng' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Quota là nguyên nhân sự cố hay bị bỏ sót nhất",
      code:
        "# Mọi dịch vụ AWS đều có quota. Nhiều quota tăng được, một số thì KHÔNG.\n" +
        "aws service-quotas list-service-quotas --service-code ec2 \\\n" +
        "  --query \u0027Quotas[?Adjustable==`true`].[QuotaName,Value]\u0027 --output table\n" +
        "\n" +
        "aws service-quotas get-service-quota \\\n" +
        "  --service-code lambda --quota-code L-B99A9384    # concurrent executions\n" +
        "\n" +
        "# Xin tăng — có thể mất VÀI NGÀY, nên phải xin TRƯỚC sự kiện lớn:\n" +
        "aws service-quotas request-service-quota-increase \\\n" +
        "  --service-code ec2 --quota-code L-1216C47A --desired-value 500\n" +
        "\n" +
        "# QUOTA HAY GÂY SỰ CỐ TRONG THỰC TẾ:\n" +
        "#  - Lambda concurrent executions (mặc định 1000 cho CẢ TÀI KHOẢN, mọi function\n" +
        "#    dùng chung) -> một function chạy loạn làm chết mọi function khác\n" +
        "#  - EC2 vCPU theo họ instance\n" +
        "#  - Elastic IP: 5 mỗi region\n" +
        "#  - VPC: 5 mỗi region; security group rule: 60 mỗi SG\n" +
        "#  - S3: 3.500 PUT/s và 5.500 GET/s MỖI PREFIX (tự scale nhưng cần thời gian)\n" +
        "\n" +
        "# CẢNH BÁO TRƯỚC KHI CHẠM TRẦN — quan trọng hơn là xin tăng lúc đã sự cố:\n" +
        "aws cloudwatch put-metric-alarm --alarm-name lambda-concurrency \\\n" +
        "  --namespace AWS/Lambda --metric-name ConcurrentExecutions \\\n" +
        "  --statistic Maximum --period 60 --threshold 800 \\\n" +
        "  --comparison-operator GreaterThanThreshold --evaluation-periods 1",
    },
  ],
},
{
  cat: 'Organizations',
  q: 'Chiến lược multi-account (landing zone) mang lại lợi ích gì?',
  answer:
    'Thay vì một account khổng lồ, tách theo ranh giới: theo môi trường (prod/staging/dev), theo team/sản phẩm, theo chức năng (security, logging, shared services).\n\n' +
    'Lợi ích:\n' +
    '- **Blast radius**: sự cố/nhầm lẫn ở dev không đụng prod.\n' +
    '- **Bảo mật & tuân thủ**: SCP khác nhau theo OU; account bị xâm nhập được cô lập.\n' +
    '- **Billing rõ ràng** theo account.\n' +
    '- **Quota** riêng mỗi account.\n\n' +
    'Công cụ: AWS Control Tower / Landing Zone Accelerator tự dựng cấu trúc chuẩn.',
  essence:
    'Account là ranh giới cách ly mạnh nhất trên AWS (mạnh hơn IAM, VPC, tag). Multi-account = dùng ranh giới đó để phân tách rủi ro, chi phí và quyền hạn.',
  example:
    'Cấu trúc: account `management` (billing, Organizations), `log-archive` (CloudTrail tập trung, chỉ ghi), `security` (GuardDuty, audit), rồi `prod`/`staging`/`dev` cho mỗi sản phẩm. Kỹ sư không có quyền trực tiếp vào `prod` — deploy qua pipeline.',
  viz: {
    type: 'tree',
    title: 'Multi-account (landing zone)',
    root: {
      label: 'Account = ranh giới cách ly mạnh nhất trên AWS (hơn IAM/VPC/tag)',
      children: [
        { label: 'Blast radius', note: 'sự cố/nhầm lẫn ở dev không đụng prod' },
        { label: 'Bảo mật & tuân thủ', note: 'SCP khác theo OU; account bị xâm nhập được cô lập' },
        { label: 'Billing rõ ràng theo account' },
        { label: 'Quota riêng mỗi account' },
        { label: 'Công cụ: Control Tower / Landing Zone Accelerator' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Vì sao nhiều tài khoản tốt hơn nhiều VPC",
      code:
        "# Ranh giới TÀI KHOẢN là ranh giới cách ly MẠNH NHẤT trên AWS — mạnh hơn\n" +
        "# IAM policy hay VPC nhiều. Một tài khoản bị chiếm không lan sang tài khoản khác.\n" +
        "\n" +
        "# Cấu trúc điển hình:\n" +
        "#   Root\n" +
        "#   ├── Security OU     -> log-archive (CloudTrail tập trung), security-tooling\n" +
        "#   ├── Infrastructure  -> network (Transit Gateway dùng chung), shared-services\n" +
        "#   ├── Workloads OU    -> prod, staging, dev  (mỗi môi trường một TÀI KHOẢN)\n" +
        "#   └── Sandbox OU      -> tài khoản thử nghiệm, có giới hạn chi tiêu\n" +
        "\n" +
        "aws organizations create-account \\\n" +
        "  --email aws-prod@congty.com --account-name \"Production\"\n" +
        "\n" +
        "# LỢI ÍCH:\n" +
        "#  1) Cách ly bùng nổ: lỗi ở dev không thể chạm vào prod\n" +
        "#  2) Quota RIÊNG mỗi tài khoản -> dev không ăn hết Lambda concurrency của prod\n" +
        "#  3) Chi phí tách bạch tự nhiên, không cần tag cầu kỳ\n" +
        "#  4) SCP khác nhau cho từng môi trường\n" +
        "#  5) Bề mặt tấn công nhỏ hơn\n" +
        "\n" +
        "# GIÁ PHẢI TRẢ: kết nối mạng phức tạp hơn (cần Transit Gateway/PrivateLink),\n" +
        "# phải quản lý tập trung, chia sẻ tài nguyên khó hơn.\n" +
        "\n" +
        "# Control Tower dựng sẵn toàn bộ landing zone (Organizations + SSO + guardrail +\n" +
        "# log tập trung) trong vài giờ — nên dùng thay vì tự dựng từ đầu.",
    },
  ],
},
{
  cat: 'Vận hành',
  q: 'Tag trên AWS dùng để làm gì? Cost allocation tag?',
  answer:
    'Tag là cặp key-value gắn vào tài nguyên. Dùng cho:\n' +
    '- **Phân bổ chi phí**: kích hoạt "cost allocation tags" → Cost Explorer/CUR nhóm chi phí theo `team`, `environment`, `project`, `cost-center`.\n' +
    '- **Kiểm soát truy cập** (ABAC): IAM policy với `Condition` trên tag (`aws:ResourceTag/team`) → chỉ sửa được tài nguyên có `team = mine`.\n' +
    '- **Tự động hoá**: script tắt EC2 có tag `auto-stop = true` ngoài giờ; backup theo tag.\n\n' +
    'Ép tag bằng SCP hoặc AWS Config rule (`required-tags`).',
  essence:
    'Tag biến "một đống tài nguyên" thành dữ liệu có cấu trúc để tính tiền, phân quyền và tự động hoá. Không có chiến lược tag nhất quán thì cost report và ABAC đều vô dụng.',
  example:
    'Bắt buộc mọi tài nguyên có `team`, `env`, `app`. Cuối tháng: Cost Explorer group by `team` → hoá đơn 12.000$ trong đó team A 7.000$, team B 5.000$ — trách nhiệm chi phí rõ ràng thay vì một con số chung.',
  viz: {
    type: 'tree',
    title: 'Tag — biến "đống tài nguyên" thành dữ liệu có cấu trúc',
    root: {
      label: 'Cần chiến lược tag nhất quán, ép bằng SCP / Config rule',
      children: [
        { label: 'Phân bổ chi phí', note: 'cost allocation tags → Cost Explorer group by team/env/project' },
        { label: 'Kiểm soát truy cập (ABAC)', note: 'Condition aws:ResourceTag/team → chỉ sửa tài nguyên team mình' },
        { label: 'Tự động hoá', note: 'tắt EC2 có auto-stop=true ngoài giờ; backup theo tag' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Tag là nền tảng cho chi phí, tự động hoá và phân quyền",
      code:
        "# 1) PHÂN BỔ CHI PHÍ — phải KÍCH HOẠT trong Billing thì mới xuất hiện trong báo cáo\n" +
        "aws ec2 create-tags --resources i-1234 --tags \\\n" +
        "  Key=Environment,Value=prod Key=Team,Value=payments Key=CostCenter,Value=CC-1001\n" +
        "# Kích hoạt (làm ở management account, dữ liệu xuất hiện sau ~24h):\n" +
        "aws ce list-cost-allocation-tags --status Active\n" +
        "\n" +
        "aws ce get-cost-and-usage --time-period Start=2026-08-01,End=2026-09-01 \\\n" +
        "  --granularity MONTHLY --metrics UnblendedCost \\\n" +
        "  --group-by Type=TAG,Key=Team          # chi phí theo từng đội\n" +
        "\n" +
        "# 2) PHÂN QUYỀN (ABAC) — cấp quyền theo tag thay vì liệt kê từng ARN\n" +
        "#    Condition: { \"StringEquals\":\n" +
        "#      { \"aws:ResourceTag/Team\": \"${aws:PrincipalTag/Team}\" } }\n" +
        "#    -> một policy duy nhất phục vụ mọi đội, không phải sửa khi thêm tài nguyên.\n" +
        "\n" +
        "# 3) TỰ ĐỘNG HOÁ — tìm và thao tác theo tag\n" +
        "aws ec2 describe-instances --filters \"Name=tag:Environment,Values=dev\" \\\n" +
        "  --query \u0027Reservations[].Instances[].InstanceId\u0027\n" +
        "# Ví dụ: tắt mọi instance dev ngoài giờ làm -> tiết kiệm ~65% chi phí dev\n" +
        "\n" +
        "# BẮT BUỘC gắn tag bằng Tag Policy hoặc SCP, nếu không sẽ luôn có tài nguyên\n" +
        "# vô chủ không ai dám xoá:\n" +
        "aws organizations create-policy --type TAG_POLICY --name required-tags \\\n" +
        "  --content file://tag-policy.json\n" +
        "\n" +
        "# Giới hạn: 50 tag mỗi tài nguyên; tag PHÂN BIỆT HOA THƯỜNG (Env khác env)\n" +
        "# -> thống nhất quy ước đặt tên ngay từ đầu.",
    },
  ],
},
{
  cat: 'Bảo mật',
  q: 'IRSA (IAM Roles for Service Accounts) trên EKS là gì?',
  answer:
    'Trước IRSA, pod trên EKS dùng chung **instance role của node** → mọi pod có cùng quyền (quá rộng).\n\n' +
    'IRSA: EKS chạy một **OIDC provider**. Bạn map một **Kubernetes ServiceAccount** với một **IAM role** (qua annotation `eks.amazonaws.com/role-arn`). Pod dùng service account đó nhận một **web identity token**, SDK tự `AssumeRoleWithWebIdentity` → credential tạm mang đúng quyền của role đó.\n\n' +
    'EKS Pod Identity (mới hơn) là cách làm tương tự, cấu hình đơn giản hơn.',
  essence:
    'IRSA đưa least-privilege xuống tận cấp pod: mỗi workload có role riêng, không chia sẻ quyền qua node. Là chuẩn để pod truy cập S3/DynamoDB/SQS an toàn.',
  example:
    'Pod `image-processor` cần ghi vào bucket `thumbnails`: tạo IAM role chỉ có `s3:PutObject` trên bucket đó, gắn vào service account `image-processor-sa`, pod dùng SA đó. Pod khác cùng node không có quyền này.',
  viz: {
    type: 'flow',
    title: 'IRSA — least-privilege xuống tận cấp pod',
    nodes: ['pod dùng ServiceAccount (annotation role-arn)', 'nhận web identity token', 'SDK AssumeRoleWithWebIdentity', 'credential tạm đúng quyền của role đó'],
    steps: [
      { to: 0, label: 'trước IRSA: mọi pod dùng chung instance role của node (quá rộng)' },
      { to: 1, label: 'EKS chạy một OIDC provider; map SA ↔ IAM role' },
      { to: 3, label: 'pod khác cùng node không có quyền này. EKS Pod Identity là cách mới đơn giản hơn' },
    ],
  },
  demo: [
    {
      lang: "yaml",
      title: "Cấp quyền AWS cho từng pod, không phải cho cả node",
      code:
        "# VẤN ĐỀ: không có IRSA, mọi pod trên node đều dùng CHUNG instance role của node\n" +
        "# -> pod nào cũng có mọi quyền của node. Vi phạm nguyên tắc quyền tối thiểu.\n" +
        "apiVersion: v1\n" +
        "kind: ServiceAccount\n" +
        "metadata:\n" +
        "  name: order-service\n" +
        "  annotations:\n" +
        "    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/order-service-role\n" +
        "---\n" +
        "apiVersion: apps/v1\n" +
        "kind: Deployment\n" +
        "metadata:\n" +
        "  name: order-service\n" +
        "spec:\n" +
        "  template:\n" +
        "    spec:\n" +
        "      serviceAccountName: order-service   # pod nhận credential của ĐÚNG role này\n" +
        "      containers:\n" +
        "        - name: app\n" +
        "          image: order-service:1.0\n" +
        "          # SDK tự đọc AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE\n" +
        "          # (được webhook của EKS tiêm vào tự động)",
    },
    {
      lang: "bash",
      title: "Thiết lập và cơ chế bên dưới",
      code:
        "# EKS chạy một OIDC provider. Pod nhận một service account token (JWT),\n" +
        "# SDK đổi token đó lấy credential AWS qua sts:AssumeRoleWithWebIdentity.\n" +
        "eksctl utils associate-iam-oidc-provider --cluster prod --approve\n" +
        "\n" +
        "eksctl create iamserviceaccount \\\n" +
        "  --cluster prod --namespace default --name order-service \\\n" +
        "  --attach-policy-arn arn:aws:iam::123456789012:policy/OrderServicePolicy \\\n" +
        "  --approve\n" +
        "\n" +
        "# Trust policy khoá chặt đúng namespace + service account:\n" +
        "#   \"Condition\": { \"StringEquals\": {\n" +
        "#      \"oidc...:sub\": \"system:serviceaccount:default:order-service\",\n" +
        "#      \"oidc...:aud\": \"sts.amazonaws.com\" }}\n" +
        "# Thiếu điều kiện \"sub\" thì MỌI pod trong cụm đều assume được role này.\n" +
        "\n" +
        "# Credential tự xoay vòng, không có secret nào nằm trong cụm.\n" +
        "# EKS Pod Identity (2023) là cách mới, đơn giản hơn: không cần OIDC provider,\n" +
        "# chỉ cần cài addon và tạo association — nên dùng cho cụm mới.",
    },
  ],
},
]);
