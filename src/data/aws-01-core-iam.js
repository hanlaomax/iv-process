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
},
]);
