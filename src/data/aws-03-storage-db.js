SS.addQuestions('aws', [
{
  cat: 'S3',
  id: 'aws-1dbcq0r',
  q: 'S3: bucket, object, key và độ bền 11 số 9 nghĩa là gì?',
  answer:
    'S3 là object storage: **bucket** (namespace toàn cầu duy nhất) chứa **object**. Object gồm `key` (chuỗi, "đường dẫn" phẳng — không có thư mục thật), data (tới 5TB), metadata, version id.\n\n' +
    '**11 số 9 durability** (99.999999999%): AWS tự động sao chép mỗi object qua tối thiểu 3 AZ. Xác suất mất một object trong năm cực nhỏ — kỳ vọng mất 1 object nếu bạn lưu 10 triệu object trong ~10.000 năm.\n\n' +
    '**Availability** (99.9–99.99% tuỳ storage class) là chuyện khác — khả năng truy cập tại một thời điểm.',
  essence:
    'Durability = "dữ liệu không mất" (rất cao nhờ replicate đa AZ). Availability = "truy cập được ngay bây giờ" (thấp hơn). S3 gần như không mất dữ liệu, nhưng vẫn có thể tạm không truy cập được.',
  example:
    'Lưu backup DB, ảnh người dùng, log lên S3 Standard: không cần tự lo replicate. Nhưng vẫn nên bật **versioning** + **replication cross-region** để chống *xoá nhầm* và *sự cố region* — durability không cứu bạn khỏi lỗi con người.',
  viz: {
    type: 'compare',
    cols: ['Durability (11 số 9)', 'Availability (99.9–99.99%)'],
    rows: [
      ['Nghĩa', 'dữ liệu KHÔNG mất', 'truy cập được NGAY bây giờ'],
      ['Nhờ đâu', 'replicate mỗi object qua ≥ 3 AZ', 'tuỳ storage class'],
      ['Không cứu khỏi', 'xoá nhầm, sự cố region', '—'],
      ['Bổ sung', 'versioning + replication cross-region', '—'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Cấu trúc phẳng, và ý nghĩa thật của 11 số 9",
      code:
        "# S3 KHÔNG có thư mục. \"Key\" là một chuỗi phẳng; dấu / chỉ là quy ước hiển thị.\n" +
        "aws s3api put-object --bucket my-bucket \\\n" +
        "  --key \"2026/09/04/orders.json\" --body orders.json\n" +
        "# Key ở đây là NGUYÊN chuỗi \"2026/09/04/orders.json\", không phải 3 thư mục lồng nhau.\n" +
        "\n" +
        "aws s3api list-objects-v2 --bucket my-bucket --prefix \"2026/09/\" --delimiter \"/\"\n" +
        "# --delimiter mô phỏng thư mục: trả về CommonPrefixes thay vì liệt kê hết\n" +
        "\n" +
        "# Tên bucket DUY NHẤT TOÀN CẦU (mọi khách hàng AWS chung một không gian tên),\n" +
        "# nhưng dữ liệu nằm ở đúng một region.\n" +
        "aws s3api create-bucket --bucket my-bucket --region ap-southeast-1 \\\n" +
        "  --create-bucket-configuration LocationConstraint=ap-southeast-1\n" +
        "\n" +
        "# ĐỘ BỀN 99,999999999% (11 số 9): kỳ vọng mất 1 object trong 10 triệu object\n" +
        "# sau 10.000 năm. Có được nhờ tự động nhân bản qua ít nhất 3 AZ.\n" +
        "# ĐỘ BỀN KHÔNG PHẢI ĐỘ SẴN SÀNG: availability chỉ 99,99% (S3 Standard) —\n" +
        "# S3 có thể tạm không truy cập được mà dữ liệu vẫn nguyên vẹn.\n" +
        "# VÀ ĐỘ BỀN KHÔNG CHỐNG ĐƯỢC: bạn tự xoá nhầm, hoặc ransomware.\n" +
        "# -> vẫn cần versioning + MFA delete + Object Lock cho dữ liệu quan trọng.",
    },
  ],
},
{
  cat: 'S3',
  id: 'aws-1u0z992',
  q: 'Các storage class của S3 và lifecycle policy?',
  answer:
    '- **Standard**: truy cập thường xuyên, độ trễ ms.\n' +
    '- **Intelligent-Tiering**: tự chuyển object giữa các tier theo pattern truy cập — không phí truy xuất, chỉ phí monitoring nhỏ. Mặc định tốt khi không rõ pattern.\n' +
    '- **Standard-IA / One Zone-IA**: truy cập ít, rẻ hơn lưu trữ nhưng có phí retrieval; One Zone chỉ 1 AZ (rẻ hơn, kém bền hơn).\n' +
    '- **Glacier Instant / Flexible / Deep Archive**: lưu trữ dài hạn, từ ms tới hàng giờ để lấy ra, cực rẻ.\n\n' +
    '**Lifecycle policy**: tự chuyển class hoặc xoá theo tuổi object / version.',
  essence:
    'Đánh đổi: giá lưu trữ ↔ giá + độ trễ truy xuất. Lifecycle policy tự động hoá việc "dữ liệu nguội thì đẩy xuống tier rẻ hơn".',
  example:
    'Log ứng dụng: lifecycle rule — 30 ngày ở Standard → 90 ngày Standard-IA → 1 năm Glacier Flexible → xoá sau 7 năm (tuân thủ). Với dữ liệu không rõ pattern (user upload): Intelligent-Tiering để khỏi đoán.',
  viz: {
    type: 'tree',
    title: 'S3 storage class — giá lưu trữ ↔ giá + độ trễ truy xuất',
    root: {
      label: 'Lifecycle policy tự đẩy dữ liệu nguội xuống tier rẻ hơn',
      children: [
        { label: 'Standard', note: 'truy cập thường xuyên, độ trễ ms' },
        { label: 'Intelligent-Tiering', note: 'tự chuyển tier theo pattern — mặc định tốt khi không rõ' },
        { label: 'Standard-IA / One Zone-IA', note: 'truy cập ít, rẻ lưu nhưng phí retrieval; One Zone kém bền hơn' },
        { label: 'Glacier Instant / Flexible / Deep Archive', note: 'archive dài hạn, ms → hàng giờ để lấy, cực rẻ' },
      ],
    },
  },
  demo: [
    {
      lang: "json",
      title: "Lifecycle: tự chuyển tầng và tự dọn",
      code:
        "{\n" +
        "  \"Rules\": [\n" +
        "    {\n" +
        "      \"ID\": \"chuyen-tang-log\",\n" +
        "      \"Filter\": { \"Prefix\": \"logs/\" },\n" +
        "      \"Status\": \"Enabled\",\n" +
        "      \"Transitions\": [\n" +
        "        { \"Days\": 30,  \"StorageClass\": \"STANDARD_IA\" },\n" +
        "        { \"Days\": 90,  \"StorageClass\": \"GLACIER_IR\" },\n" +
        "        { \"Days\": 365, \"StorageClass\": \"DEEP_ARCHIVE\" }\n" +
        "      ],\n" +
        "      \"Expiration\": { \"Days\": 2555 }\n" +
        "    },\n" +
        "    {\n" +
        "      \"ID\": \"don-multipart-do-dang\",\n" +
        "      \"Filter\": {},\n" +
        "      \"Status\": \"Enabled\",\n" +
        "      \"AbortIncompleteMultipartUpload\": { \"DaysAfterInitiation\": 7 }\n" +
        "    },\n" +
        "    {\n" +
        "      \"ID\": \"don-phien-ban-cu\",\n" +
        "      \"Filter\": {},\n" +
        "      \"Status\": \"Enabled\",\n" +
        "      \"NoncurrentVersionExpiration\": { \"NoncurrentDays\": 90 }\n" +
        "    }\n" +
        "  ]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Các tầng lưu trữ và bẫy chi phí",
      code:
        "# STANDARD          — truy cập thường xuyên, không phí truy xuất\n" +
        "# INTELLIGENT-TIERING — AWS tự chuyển tầng theo thói quen truy cập.\n" +
        "#   Phí giám sát nhỏ mỗi object, KHÔNG có phí truy xuất. Chọn cái này khi\n" +
        "#   không đoán được mẫu truy cập -> gần như luôn là lựa chọn an toàn.\n" +
        "# STANDARD-IA       — rẻ hơn ~45%, CÓ phí truy xuất, tối thiểu 30 ngày lưu trữ\n" +
        "# ONE ZONE-IA       — rẻ hơn nữa nhưng chỉ 1 AZ -> chỉ cho dữ liệu tái tạo được\n" +
        "# GLACIER IR        — truy xuất tức thì, rẻ hơn IA, tối thiểu 90 ngày\n" +
        "# GLACIER FLEXIBLE  — lấy về mất vài phút tới vài giờ\n" +
        "# DEEP ARCHIVE      — rẻ nhất (~$1/TB/tháng), lấy về mất 12-48 giờ, tối thiểu 180 ngày\n" +
        "\n" +
        "aws s3api put-bucket-lifecycle-configuration --bucket my-bucket \\\n" +
        "  --lifecycle-configuration file://lifecycle.json\n" +
        "\n" +
        "# BẪY CHI PHÍ HAY GẶP:\n" +
        "#  - chuyển object NHỎ xuống tầng lạnh: mỗi lần chuyển tốn phí request,\n" +
        "#    và IA/Glacier tính TỐI THIỂU 128KB mỗi object -> file 5KB tốn như 128KB\n" +
        "#  - xoá sớm hơn thời gian tối thiểu vẫn bị tính đủ\n" +
        "#  - multipart upload dở dang KHÔNG hiện trong list nhưng VẪN TÍNH TIỀN\n" +
        "#    -> luôn có rule AbortIncompleteMultipartUpload\n" +
        "aws s3api list-multipart-uploads --bucket my-bucket",
    },
  ],
},
{
  cat: 'S3',
  id: 'aws-1jfa1gc',
  q: 'Mô hình nhất quán (consistency) của S3 hiện nay?',
  answer:
    'Từ tháng 12/2020, S3 cung cấp **strong read-after-write consistency** cho **mọi** thao tác trên mọi region — miễn phí, tự động.\n\n' +
    'Nghĩa là: sau khi `PUT` thành công một object (mới hoặc ghi đè), mọi `GET`/`LIST` ngay sau đó **luôn thấy phiên bản mới nhất**.\n\n' +
    'Trước đây: ghi mới thì strong, nhưng ghi đè và xoá là **eventually consistent** — code cũ có thể còn workaround (retry, chờ) không cần nữa.',
  essence:
    'S3 giờ hành xử trực giác: viết xong đọc lại thấy ngay. Bỏ các hack "sleep sau khi upload" trong codebase cũ.',
  example:
    'Pipeline: Lambda ghi file kết quả lên S3 rồi trigger Lambda tiếp theo `GET` file đó → đảm bảo đọc được nội dung vừa ghi, không còn cảnh "NoSuchKey" ngẫu nhiên như thời eventually consistent.',
  viz: {
    type: 'compare',
    cols: ['Trước 12/2020', 'Từ 12/2020 (hiện nay)'],
    rows: [
      ['Ghi object mới', 'strong', 'strong'],
      ['Ghi đè / xoá', 'eventually consistent', 'strong read-after-write'],
      ['Hệ quả', 'code cũ cần retry / sleep sau upload', 'viết xong đọc lại thấy ngay — bỏ hết hack'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Từ tháng 12/2020: strong read-after-write cho mọi thao tác",
      code:
        "# TRƯỚC 12/2020: ghi đè và xoá chỉ là eventual consistency -> đọc ngay sau khi\n" +
        "# ghi có thể ra dữ liệu CŨ. Rất nhiều code cũ có vòng lặp retry vì lý do này.\n" +
        "\n" +
        "# HIỆN NAY: STRONG read-after-write cho PUT, DELETE và LIST — miễn phí,\n" +
        "# không phải bật gì, không giảm hiệu năng.\n" +
        "aws s3api put-object --bucket my-bucket --key data.json --body v2.json\n" +
        "aws s3api get-object --bucket my-bucket --key data.json out.json\n" +
        "# LUÔN trả về v2. Không cần sleep, không cần retry vì lý do nhất quán.\n" +
        "\n" +
        "# LIST cũng nhất quán: object vừa PUT chắc chắn xuất hiện trong list ngay.\n" +
        "aws s3api list-objects-v2 --bucket my-bucket --prefix data\n" +
        "\n" +
        "# NHỮNG THỨ VẪN LÀ EVENTUAL (hay bị nhầm là đã strong):\n" +
        "#  - Cross-Region Replication / Same-Region Replication: bản sao đến sau\n" +
        "#  - thay đổi bucket policy, ACL, lifecycle configuration\n" +
        "#  - S3 Event Notification: gửi ÍT NHẤT MỘT LẦN và có thể đến muộn/không đúng\n" +
        "#    thứ tự -> consumer phải idempotent\n" +
        "#  - dữ liệu đã cache ở CloudFront -> phải invalidate hoặc dùng version trong key\n" +
        "\n" +
        "# LƯU Ý VỀ VERSIONING: xoá object có versioning chỉ tạo DELETE MARKER.\n" +
        "# Đọc trả 404 ngay (strong), nhưng dữ liệu vẫn còn ở phiên bản cũ.",
    },
  ],
},
{
  cat: 'S3',
  id: 'aws-9rxfrp',
  q: 'Bảo mật S3: bucket policy, Block Public Access, presigned URL?',
  answer:
    '- **Block Public Access (BPA)**: công tắc ở cấp account & bucket **chặn** mọi cấu hình khiến bucket public — nên **bật hết** trừ khi thực sự cần static website public.\n' +
    '- **Bucket policy** (resource-based): kiểm soát ai truy cập gì; dùng `Condition` (`aws:SourceVpce`, `aws:PrincipalOrgID`, `s3:x-amz-server-side-encryption`).\n' +
    '- **ACL**: cơ chế cũ, AWS khuyến nghị tắt (`Object Ownership = Bucket owner enforced`).\n' +
    '- **Presigned URL**: URL có chữ ký + hạn dùng, cho phép client tải lên/xuống **một object** mà không cần credential AWS.',
  essence:
    'Mặc định private + BPA bật. Cấp quyền hẹp qua bucket policy/IAM. Chia sẻ tạm thời với người ngoài qua presigned URL, không phải làm bucket public.',
  example:
    'Cho phép user upload avatar: backend tạo presigned `PUT` URL (hết hạn 5 phút, giới hạn content-type, size) → browser upload thẳng lên S3, không đi qua server. Bucket vẫn hoàn toàn private, BPA bật.',
  viz: {
    type: 'tree',
    title: 'Bảo mật S3 — mặc định private + BPA bật',
    root: {
      label: 'Cấp quyền hẹp; chia sẻ tạm qua presigned URL, KHÔNG làm bucket public',
      children: [
        { label: 'Block Public Access (BPA)', note: 'công tắc account & bucket chặn mọi cấu hình public — bật hết trừ static website' },
        { label: 'Bucket policy (resource-based)', note: 'Condition: aws:SourceVpce, aws:PrincipalOrgID, ép mã hoá' },
        { label: 'ACL', note: 'cơ chế cũ — tắt (Object Ownership = Bucket owner enforced)' },
        { label: 'Presigned URL', note: 'URL có chữ ký + hạn dùng cho MỘT object, không cần credential AWS' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Ba lớp, và lớp nào nên tin",
      code:
        "# 1) BLOCK PUBLIC ACCESS — chốt chặn cứng, BẬT TRƯỚC MỌI THỨ KHÁC.\n" +
        "# Nó ghi đè cả bucket policy lẫn ACL -> dù ai đó lỡ viết policy public,\n" +
        "# object vẫn không lộ ra.\n" +
        "aws s3api put-public-access-block --bucket my-bucket \\\n" +
        "  --public-access-block-configuration \\\n" +
        "  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true\n" +
        "# Nên bật ở CẤP TÀI KHOẢN để áp cho mọi bucket hiện tại và tương lai:\n" +
        "aws s3control put-public-access-block --account-id 123456789012 \\\n" +
        "  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true\n" +
        "\n" +
        "# 2) BUCKET POLICY — phân quyền chính. ACL đã lỗi thời (từ 4/2023 bucket mới\n" +
        "# mặc định TẮT ACL, Object Ownership = BucketOwnerEnforced). Đừng dùng ACL nữa.\n" +
        "aws s3api put-bucket-policy --bucket my-bucket --policy file://policy.json\n" +
        "# Nên thêm điều kiện bắt buộc TLS:\n" +
        "#   \"Condition\": {\"Bool\": {\"aws:SecureTransport\": \"false\"}}, \"Effect\": \"Deny\"\n" +
        "\n" +
        "# 3) PRESIGNED URL — cấp quyền TẠM THỜI cho người không có tài khoản AWS.\n" +
        "# URL mang chữ ký của NGƯỜI TẠO -> nó chỉ mạnh bằng quyền của người đó.\n" +
        "aws s3 presign s3://my-bucket/report.pdf --expires-in 3600\n" +
        "# Upload trực tiếp từ trình duyệt (không đi qua server của bạn):\n" +
        "#   s3.generate_presigned_post(Bucket, Key, Conditions=[[\"content-length-range\",0,10485760]])\n" +
        "# Điều kiện content-length-range rất quan trọng, nếu không ai đó upload 5TB.\n" +
        "\n" +
        "# Bật log truy cập để còn điều tra được:\n" +
        "aws s3api put-bucket-logging --bucket my-bucket --bucket-logging-status file://logging.json",
    },
  ],
},
{
  cat: 'S3',
  id: 'aws-ejlafh',
  q: 'S3 versioning và bảo vệ chống xoá?',
  answer:
    'Bật **versioning**: mỗi `PUT`/`DELETE` tạo version mới thay vì ghi đè. `DELETE` chỉ đặt một **delete marker** (object "biến mất" nhưng version cũ vẫn còn); khôi phục bằng cách xoá delete marker.\n\n' +
    '**MFA Delete**: yêu cầu mã MFA để xoá vĩnh viễn một version hoặc tắt versioning — chống xoá do credential bị lộ.\n\n' +
    '**Object Lock** (WORM): khoá object không cho xoá/sửa trong một khoảng thời gian (compliance) hoặc cho tới khi gỡ (governance) — chống cả ransomware và insider.',
  essence:
    'Versioning = "undo cho S3". Delete marker biến xoá thành một hành động có thể đảo. Object Lock là mức bảo vệ mạnh nhất cho dữ liệu bất biến (audit, backup).',
  example:
    'Bucket backup: versioning + Object Lock (compliance mode, 90 ngày) + lifecycle xoá version cũ hơn 1 năm. Ransomware mã hoá và ghi đè file backup → chỉ tạo version mới, các version sạch vẫn khôi phục được.',
  viz: {
    type: 'flow',
    title: 'S3 versioning = "undo cho S3"',
    nodes: ['bật versioning', 'PUT/DELETE tạo version mới', 'DELETE chỉ đặt delete marker', 'khôi phục: xoá delete marker', 'MFA Delete + Object Lock (WORM)'],
    steps: [
      { to: 2, label: 'object "biến mất" nhưng version cũ vẫn còn' },
      { to: 3, label: 'xoá biến thành hành động có thể đảo' },
      { to: 4, label: 'MFA Delete: cần mã MFA để xoá vĩnh viễn. Object Lock: khoá không cho xoá/sửa — chống ransomware + insider' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba tầng bảo vệ, mạnh dần",
      code:
        "# 1) VERSIONING — mỗi lần ghi đè tạo phiên bản mới, xoá chỉ tạo DELETE MARKER\n" +
        "aws s3api put-bucket-versioning --bucket my-bucket \\\n" +
        "  --versioning-configuration Status=Enabled\n" +
        "# BẬT RỒI KHÔNG TẮT ĐƯỢC, chỉ Suspended (phiên bản cũ vẫn còn).\n" +
        "\n" +
        "aws s3api list-object-versions --bucket my-bucket --prefix data.json\n" +
        "# Khôi phục = xoá delete marker:\n" +
        "aws s3api delete-object --bucket my-bucket --key data.json --version-id $MARKER_ID\n" +
        "\n" +
        "# LƯU Ý CHI PHÍ: mọi phiên bản đều TÍNH TIỀN. Không có lifecycle dọn\n" +
        "# NoncurrentVersion thì bucket phình vô hạn — đây là nguyên nhân rất phổ biến\n" +
        "# của hoá đơn S3 tăng bất thường.\n" +
        "\n" +
        "# 2) MFA DELETE — xoá vĩnh viễn phải có mã MFA. Chỉ ROOT bật được, và\n" +
        "# chỉ bằng CLI (console không làm được):\n" +
        "aws s3api put-bucket-versioning --bucket my-bucket \\\n" +
        "  --versioning-configuration Status=Enabled,MFADelete=Enabled \\\n" +
        "  --mfa \"arn:aws:iam::123:mfa/root-account-mfa-device 123456\"\n" +
        "\n" +
        "# 3) OBJECT LOCK (WORM) — mạnh nhất, chống được cả ransomware và người trong nội bộ.\n" +
        "# CHỈ bật được LÚC TẠO BUCKET, không thêm sau được.\n" +
        "aws s3api put-object-retention --bucket my-bucket --key data.json \\\n" +
        "  --retention \u0027{\"Mode\":\"COMPLIANCE\",\"RetainUntilDate\":\"2027-01-01T00:00:00Z\"}\u0027\n" +
        "# GOVERNANCE — người có quyền đặc biệt vẫn gỡ được (dùng cho nội bộ)\n" +
        "# COMPLIANCE — KHÔNG AI gỡ được, kể cả root, kể cả AWS. Chắc chắn nhưng\n" +
        "#              nhầm lẫn là phải trả tiền lưu trữ tới hết hạn. Cân nhắc kỹ.",
    },
  ],
},
{
  cat: 'S3',
  id: 'aws-14j68ob',
  q: 'Các kiểu mã hoá S3: SSE-S3, SSE-KMS, SSE-C, DSSE-KMS?',
  answer:
    '- **SSE-S3** (`AES256`): AWS quản key hoàn toàn. Đơn giản, miễn phí. Mặc định cho object mới.\n' +
    '- **SSE-KMS**: dùng CMK của bạn trong KMS → **kiểm soát** (key policy, audit qua CloudTrail, xoay vòng), nhưng có phí KMS API và giới hạn request (giảm bằng **S3 Bucket Keys**).\n' +
    '- **SSE-C**: bạn cung cấp key trong mỗi request, AWS mã hoá nhưng không lưu key — bạn tự quản.\n' +
    '- **DSSE-KMS**: mã hoá hai lớp cho yêu cầu tuân thủ khắt khe.',
  essence:
    'SSE-S3 cho "chỉ cần mã hoá at-rest". SSE-KMS khi cần kiểm soát và audit truy cập key (tách quyền: có `s3:GetObject` nhưng thiếu `kms:Decrypt` thì vẫn không đọc được).',
  example:
    'Bucket chứa dữ liệu PII: SSE-KMS với CMK riêng, bật S3 Bucket Keys để giảm chi phí KMS. Bucket policy `Deny` nếu request không có header `x-amz-server-side-encryption: aws:kms` → không ai upload plaintext được.',
  viz: {
    type: 'compare',
    cols: ['SSE-S3 (AES256)', 'SSE-KMS', 'SSE-C', 'DSSE-KMS'],
    rows: [
      ['Ai quản key', 'AWS hoàn toàn', 'CMK của bạn trong KMS', 'bạn cung cấp key mỗi request', 'KMS, mã hoá 2 lớp'],
      ['Kiểm soát / audit', 'không', 'key policy + CloudTrail + xoay vòng', 'tự quản', 'như KMS'],
      ['Chi phí', 'miễn phí', 'phí KMS API (giảm bằng Bucket Keys)', '—', 'cao'],
      ['Dùng khi', 'chỉ cần mã hoá at-rest', 'cần tách quyền (GetObject nhưng thiếu kms:Decrypt)', 'yêu cầu đặc biệt', 'tuân thủ khắt khe'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ai giữ khoá, và cái giá của từng lựa chọn",
      code:
        "# Từ 1/2023, S3 mã hoá MẶC ĐỊNH bằng SSE-S3 cho mọi object mới. Không có\n" +
        "# object không mã hoá nữa.\n" +
        "\n" +
        "# SSE-S3 (AES-256) — AWS quản lý khoá hoàn toàn. Miễn phí, không phải làm gì.\n" +
        "aws s3api put-object --bucket my-bucket --key f.txt --body f.txt \\\n" +
        "  --server-side-encryption AES256\n" +
        "\n" +
        "# SSE-KMS — dùng KMS key của bạn.\n" +
        "#  + kiểm soát policy khoá, có log CloudTrail mỗi lần dùng khoá, xoay vòng được\n" +
        "#  + chia sẻ chéo tài khoản có kiểm soát\n" +
        "#  - MỖI lần đọc/ghi là một API call KMS -> tốn tiền và có thể chạm quota\n" +
        "aws s3api put-object --bucket my-bucket --key f.txt --body f.txt \\\n" +
        "  --server-side-encryption aws:kms --ssekms-key-id alias/app-key\n" +
        "\n" +
        "# S3 BUCKET KEYS — giảm tới 99% số lần gọi KMS bằng cách dùng một khoá trung\n" +
        "# gian ở cấp bucket. Gần như luôn nên bật khi dùng SSE-KMS:\n" +
        "aws s3api put-bucket-encryption --bucket my-bucket \\\n" +
        "  --server-side-encryption-configuration \u0027{\"Rules\":[{\n" +
        "    \"ApplyServerSideEncryptionByDefault\":{\"SSEAlgorithm\":\"aws:kms\",\n" +
        "      \"KMSMasterKeyID\":\"alias/app-key\"},\n" +
        "    \"BucketKeyEnabled\":true}]}\u0027\n" +
        "\n" +
        "# SSE-C — bạn gửi khoá theo từng request, AWS không lưu khoá.\n" +
        "#   Mất khoá là mất dữ liệu vĩnh viễn. Hiếm dùng.\n" +
        "# DSSE-KMS — mã hoá HAI LỚP, cho yêu cầu tuân thủ đặc biệt. Đắt gấp đôi.\n" +
        "\n" +
        "# Ép mọi ghi phải mã hoá bằng đúng khoá của mình (bucket policy):\n" +
        "#   \"Condition\": {\"StringNotEquals\": {\"s3:x-amz-server-side-encryption\": \"aws:kms\"}}",
    },
  ],
},
{
  cat: 'S3',
  id: 'aws-mjrpon',
  q: 'Tối ưu hiệu năng S3: prefix, multipart upload, Transfer Acceleration?',
  answer:
    '- **Prefix scaling**: S3 tự scale ~3.500 PUT/COPY/POST/DELETE và ~5.500 GET/HEAD **mỗi giây mỗi prefix**. Nhiều prefix song song → throughput cộng dồn. (Không còn cần "random hash prefix" như xưa, nhưng phân tán key vẫn giúp.)\n' +
    '- **Multipart upload**: chia file lớn (> 100MB, bắt buộc > 5GB) thành phần, upload **song song**, retry từng phần, resume được.\n' +
    '- **Transfer Acceleration**: upload qua edge location gần nhất rồi đi đường backbone AWS tới bucket — tăng tốc cho client ở xa region.',
  essence:
    'Throughput S3 gần như vô hạn nếu bạn **song song hoá** (nhiều prefix, nhiều part). Nút thắt thường là client đơn luồng, không phải S3.',
  example:
    'Upload file 50GB từ VN lên bucket ở `us-east-1`: multipart (part 100MB, 20 luồng song song) + Transfer Acceleration → từ vài giờ xuống vài chục phút, và nếu mạng rớt chỉ retry vài part.',
  viz: {
    type: 'tree',
    title: 'Tối ưu hiệu năng S3 — nút thắt thường là client đơn luồng',
    root: {
      label: 'Throughput gần vô hạn nếu SONG SONG HOÁ',
      children: [
        { label: 'Prefix scaling', note: '~3500 ghi/s + ~5500 đọc/s MỖI prefix; nhiều prefix → cộng dồn' },
        { label: 'Multipart upload', note: 'file > 100MB (bắt buộc > 5GB): chia phần, upload song song, retry/resume từng phần' },
        { label: 'Transfer Acceleration', note: 'upload qua edge gần nhất rồi đi backbone AWS — cho client ở xa region' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Ba đòn bẩy hiệu năng",
      code:
        "# 1) PREFIX — S3 tự scale theo prefix: 3.500 PUT/s và 5.500 GET/s MỖI PREFIX.\n" +
        "# Cần nhiều hơn -> trải key ra nhiều prefix:\n" +
        "#   logs/2026/09/04/...        <- mọi ghi dồn vào một prefix, dễ bị throttle\n" +
        "#   logs/a3f/2026/09/04/...    <- thêm hash ở đầu -> trải đều\n" +
        "# (Từ 2018 S3 tự chia partition theo prefix nên không cần hash ngẫu nhiên\n" +
        "#  như trước, nhưng khi ghi bùng nổ đột ngột thì vẫn hữu ích.)\n" +
        "\n" +
        "# 2) MULTIPART UPLOAD — bắt buộc với file > 5GB, nên dùng từ ~100MB.\n" +
        "# Tải song song nhiều phần, retry được từng phần riêng.\n" +
        "aws configure set default.s3.multipart_threshold 64MB\n" +
        "aws configure set default.s3.multipart_chunksize 16MB\n" +
        "aws configure set default.s3.max_concurrent_requests 20\n" +
        "aws s3 cp bigfile.tar.gz s3://my-bucket/    # CLI tự dùng multipart\n" +
        "\n" +
        "# Dọn phần dở dang (chúng vẫn tính tiền dù không hiện trong list):\n" +
        "aws s3api list-multipart-uploads --bucket my-bucket\n" +
        "\n" +
        "# 3) TRANSFER ACCELERATION — đi qua edge location của CloudFront rồi vào S3\n" +
        "# qua mạng nội bộ AWS. Chỉ đáng tiền khi upload TỪ XA (khác châu lục).\n" +
        "aws s3api put-bucket-accelerate-configuration --bucket my-bucket \\\n" +
        "  --accelerate-configuration Status=Enabled\n" +
        "aws s3 cp f.zip s3://my-bucket/ --endpoint-url https://my-bucket.s3-accelerate.amazonaws.com\n" +
        "\n" +
        "# Đọc nhiều lần cùng một object -> đặt CloudFront phía trước: rẻ hơn và nhanh hơn.\n" +
        "# Đọc một PHẦN file lớn -> dùng Range request thay vì tải cả file:\n" +
        "aws s3api get-object --bucket my-bucket --key big.csv --range \"bytes=0-1048575\" head.csv",
    },
  ],
},
{
  cat: 'S3',
  id: 'aws-7ame49',
  q: 'S3 Event Notifications dùng để làm gì?',
  answer:
    'S3 phát sự kiện khi có `s3:ObjectCreated:*`, `s3:ObjectRemoved:*`, `s3:ObjectRestore:*`… tới đích: **Lambda**, **SQS**, **SNS**, hoặc **EventBridge** (nhiều tính năng lọc/định tuyến hơn).\n\n' +
    'Nền cho kiến trúc event-driven: upload file → tự động xử lý.\n\n' +
    'Lưu ý: delivery **at-least-once** (có thể trùng), thứ tự không đảm bảo → consumer phải idempotent. Một số cấu hình có thể bỏ sót event hiếm gặp → cân nhắc reconciliation định kỳ cho hệ quan trọng.',
  essence:
    'S3 trở thành nguồn phát sự kiện: "có object mới" kích hoạt pipeline. EventBridge là đích linh hoạt nhất (lọc theo suffix, size, định tuyến nhiều target).',
  example:
    'User upload ảnh → `ObjectCreated` → Lambda tạo thumbnail + trích metadata EXIF + ghi record vào DynamoDB. Upload CSV vào prefix `imports/` → SQS → ECS task xử lý ETL (queue để chịu tải spike).',
  viz: {
    type: 'flow',
    title: 'S3 Event Notifications — nguồn phát sự kiện',
    nodes: ['s3:ObjectCreated / ObjectRemoved / ObjectRestore', 'đích: Lambda / SQS / SNS / EventBridge', 'pipeline event-driven'],
    steps: [
      { to: 1, label: 'EventBridge linh hoạt nhất (lọc theo suffix/size, nhiều target)' },
      { to: 2, label: 'upload ảnh → Lambda tạo thumbnail; upload CSV → SQS → ECS ETL' },
      { to: 2, label: 'delivery at-least-once (có thể trùng), thứ tự không đảm bảo → consumer idempotent' },
    ],
  },
  demo: [
    {
      lang: "json",
      title: "Kích hoạt xử lý khi object thay đổi",
      code:
        "{\n" +
        "  \"Comment\": \"Gửi sự kiện tới Lambda/SQS/SNS/EventBridge khi có object mới\",\n" +
        "  \"LambdaFunctionConfigurations\": [{\n" +
        "    \"LambdaFunctionArn\": \"arn:aws:lambda:ap-southeast-1:123:function:process-upload\",\n" +
        "    \"Events\": [\"s3:ObjectCreated:*\"],\n" +
        "    \"Filter\": {\n" +
        "      \"Key\": { \"FilterRules\": [\n" +
        "        { \"Name\": \"prefix\", \"Value\": \"uploads/\" },\n" +
        "        { \"Name\": \"suffix\", \"Value\": \".jpg\" }\n" +
        "      ]}\n" +
        "    }\n" +
        "  }],\n" +
        "  \"QueueConfigurations\": [{\n" +
        "    \"QueueArn\": \"arn:aws:sqs:ap-southeast-1:123:archive-queue\",\n" +
        "    \"Events\": [\"s3:ObjectRemoved:*\"]\n" +
        "  }]\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Ba đích đến và những đảm bảo cần biết",
      code:
        "aws s3api put-bucket-notification-configuration \\\n" +
        "  --bucket my-bucket --notification-configuration file://notification.json\n" +
        "\n" +
        "# ĐÍCH ĐẾN:\n" +
        "#  Lambda — xử lý ngay, đơn giản nhất. Nhưng lỗi thì phải tự lo retry/DLQ.\n" +
        "#  SQS    — có buffer, chịu được tải đột biến, retry sẵn có. ĐÁNG TIN NHẤT\n" +
        "#           cho khối lượng lớn -> mặc định nên chọn.\n" +
        "#  SNS    — fanout tới nhiều bên.\n" +
        "#  EventBridge — lọc mạnh hơn nhiều, gửi được tới 20+ đích, có archive/replay.\n" +
        "#           Phải bật riêng:\n" +
        "aws s3api put-bucket-notification-configuration --bucket my-bucket \\\n" +
        "  --notification-configuration \u0027{\"EventBridgeConfiguration\": {}}\u0027\n" +
        "\n" +
        "# NHỮNG ĐẢM BẢO PHẢI BIẾT:\n" +
        "#  - AT LEAST ONCE: có thể nhận TRÙNG -> handler bắt buộc idempotent\n" +
        "#  - KHÔNG ĐẢM BẢO THỨ TỰ: hai sự kiện của cùng một key có thể tới ngược nhau\n" +
        "#  - thường trong vài giây, nhưng đôi khi tới muộn hơn nhiều\n" +
        "#  - GIỚI HẠN: mỗi tổ hợp prefix/suffix chỉ có MỘT đích -> chồng chéo cấu hình\n" +
        "#    sẽ báo lỗi. Cần fanout thì đi qua SNS hoặc EventBridge.\n" +
        "#  - VÒNG LẶP CHẾT NGƯỜI: Lambda ghi kết quả vào CHÍNH bucket đó -> tự kích\n" +
        "#    hoạt lại chính nó. Luôn ghi sang bucket/prefix khác.",
    },
  ],
},
{
  cat: 'RDS',
  id: 'aws-d5kfso',
  q: 'RDS Multi-AZ và Read Replica khác nhau thế nào?',
  answer:
    '- **Multi-AZ**: một standby **đồng bộ** ở AZ khác, **không phục vụ traffic**. Mục đích: **HA/failover** — primary chết thì standby lên (đổi DNS endpoint) trong ~60–120s, không mất dữ liệu (sync replication).\n' +
    '- **Read Replica**: bản sao **bất đồng bộ**, **phục vụ read**. Mục đích: **scale đọc**, offload báo cáo/analytics. Có replica lag; có thể promote thủ công thành primary độc lập (DR thô).\n\n' +
    'Kết hợp cả hai: Multi-AZ cho HA + nhiều Read Replica cho scale.',
  essence:
    'Multi-AZ = chống downtime (standby bị động, sync). Read Replica = chống nghẽn đọc (active, async, có lag). Giải quyết hai bài toán khác nhau.',
  example:
    'App thương mại điện tử: RDS Multi-AZ cho OLTP (failover tự động). Thêm 2 Read Replica: 1 cho trang danh mục/tìm kiếm (đọc nặng), 1 cho dashboard BI — writer không bị ảnh hưởng bởi query báo cáo nặng.',
  viz: {
    type: 'compare',
    cols: ['Multi-AZ', 'Read Replica'],
    rows: [
      ['Replication', 'đồng bộ (sync)', 'bất đồng bộ (async, có lag)'],
      ['Phục vụ traffic?', 'KHÔNG — standby bị động', 'CÓ — phục vụ read'],
      ['Mục đích', 'HA / failover (~60–120s, không mất dữ liệu)', 'scale đọc, offload báo cáo'],
      ['Bài toán', 'chống downtime', 'chống nghẽn đọc'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Một cái để sống sót, một cái để mở rộng đọc",
      code:
        "# MULTI-AZ — bản dự phòng ĐỒNG BỘ ở AZ khác. Mục tiêu: TÍNH SẴN SÀNG.\n" +
        "#  - KHÔNG phục vụ đọc (standby \"ẩn\", không có endpoint riêng)\n" +
        "#  - failover tự động 60-120 giây, endpoint DNS giữ nguyên -> ứng dụng không đổi\n" +
        "#  - nhân đôi chi phí\n" +
        "aws rds modify-db-instance --db-instance-identifier prod \\\n" +
        "  --multi-az --apply-immediately\n" +
        "\n" +
        "# READ REPLICA — bản sao BẤT ĐỒNG BỘ, CÓ endpoint riêng. Mục tiêu: MỞ RỘNG ĐỌC.\n" +
        "#  - phục vụ đọc, nhưng có ĐỘ TRỄ nhân bản -> có thể đọc ra dữ liệu cũ\n" +
        "#  - KHÔNG tự failover; phải promote THỦ CÔNG (và mất kết nối replication)\n" +
        "#  - tạo được ở region khác -> dùng cho DR và phục vụ người dùng ở xa\n" +
        "aws rds create-db-instance-read-replica \\\n" +
        "  --db-instance-identifier prod-replica-1 --source-db-instance-identifier prod\n" +
        "aws cloudwatch get-metric-statistics --namespace AWS/RDS \\\n" +
        "  --metric-name ReplicaLag --dimensions Name=DBInstanceIdentifier,Value=prod-replica-1 \\\n" +
        "  --start-time 2026-09-04T00:00:00Z --end-time 2026-09-04T01:00:00Z \\\n" +
        "  --period 300 --statistics Maximum\n" +
        "\n" +
        "# Multi-AZ DB CLUSTER (khác Multi-AZ instance): 2 standby CÓ THỂ ĐỌC,\n" +
        "# failover dưới 35 giây. Đắt hơn nhưng tốt hơn ở cả hai mặt.\n" +
        "\n" +
        "# THỰC TẾ: production cần CẢ HAI. Multi-AZ cho tính sẵn sàng,\n" +
        "# read replica cho tải đọc. Và ứng dụng phải tách được luồng đọc/ghi\n" +
        "# (Spring: @Transactional(readOnly = true) + routing datasource).",
    },
  ],
},
{
  cat: 'RDS',
  id: 'aws-nd1kyj',
  q: 'RDS backup: automated backup, snapshot và Point-in-Time Recovery?',
  answer:
    '- **Automated backups**: bật retention 1–35 ngày. RDS backup toàn bộ hàng ngày + **lưu transaction log mỗi 5 phút** → cho phép **PITR**: khôi phục về **bất kỳ thời điểm** nào trong cửa sổ retention (tạo instance mới).\n' +
    '- **Manual snapshot**: bạn tự tạo, **giữ tới khi xoá** (không theo retention), copy cross-region/cross-account được.\n\n' +
    'Xoá instance: automated backup bị xoá (trừ khi tạo final snapshot); manual snapshot còn lại.',
  essence:
    'Automated backup + transaction log = "tua ngược DB tới bất kỳ phút nào trong 35 ngày". Manual snapshot = ảnh chụp cố định bạn chủ động giữ (trước migration, cho compliance, cho DR cross-region).',
  example:
    'Lúc 14:32 một job chạy `DELETE` thiếu `WHERE` xoá nhầm 50k dòng. PITR: khôi phục instance mới về **14:31:00**, export bảng bị ảnh hưởng, import lại vào production — không mất các giao dịch khác sau 14:32 trên các bảng khác.',
  viz: {
    type: 'compare',
    cols: ['Automated backup', 'Manual snapshot'],
    rows: [
      ['Retention', '1–35 ngày', 'giữ tới khi bạn xoá'],
      ['Đặc biệt', 'backup hàng ngày + transaction log mỗi 5 phút → PITR về bất kỳ phút nào', 'ảnh chụp cố định'],
      ['Copy cross-region/account', '—', 'được'],
      ['Khi xoá instance', 'bị xoá (trừ final snapshot)', 'còn lại'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba cơ chế và điểm khác biệt về vòng đời",
      code:
        "# AUTOMATED BACKUP — sao lưu hàng ngày + lưu transaction log liên tục.\n" +
        "# Đây là thứ cho phép PITR. Giữ 0-35 ngày (0 = TẮT, đừng bao giờ để 0 ở prod).\n" +
        "aws rds modify-db-instance --db-instance-identifier prod \\\n" +
        "  --backup-retention-period 7 --preferred-backup-window \"17:00-18:00\" \\\n" +
        "  --apply-immediately\n" +
        "# QUAN TRỌNG: XOÁ DB INSTANCE là XOÁ luôn automated backup.\n" +
        "\n" +
        "# MANUAL SNAPSHOT — bạn tự tạo, SỐNG MÃI cho tới khi bạn xoá.\n" +
        "# Luôn tạo snapshot thủ công trước khi làm việc nguy hiểm và trước khi xoá DB.\n" +
        "aws rds create-db-snapshot --db-instance-identifier prod \\\n" +
        "  --db-snapshot-identifier prod-truoc-migrate-2026-09-04\n" +
        "aws rds copy-db-snapshot --source-db-snapshot-identifier $SNAP \\\n" +
        "  --target-db-snapshot-identifier dr-copy --source-region ap-southeast-1 \\\n" +
        "  --region ap-northeast-1        # sao chép sang region khác cho DR\n" +
        "\n" +
        "# PITR — khôi phục về BẤT KỲ GIÂY NÀO trong khoảng retention (thường trễ 5 phút).\n" +
        "# Cứu tinh khi lỡ chạy DELETE thiếu WHERE.\n" +
        "aws rds restore-db-instance-to-point-in-time \\\n" +
        "  --source-db-instance-identifier prod \\\n" +
        "  --target-db-instance-identifier prod-restored \\\n" +
        "  --restore-time 2026-09-04T10:15:00Z\n" +
        "\n" +
        "# LƯU Ý QUYẾT ĐỊNH: khôi phục LUÔN tạo instance MỚI (endpoint mới),\n" +
        "# không ghi đè lên instance cũ. Quy trình thật là: khôi phục ra instance mới,\n" +
        "# kiểm tra dữ liệu, rồi đổi endpoint ứng dụng.\n" +
        "# Và: đã sao lưu thì phải DIỄN TẬP khôi phục. Backup chưa từng thử khôi phục\n" +
        "# không phải là backup.",
    },
  ],
},
{
  cat: 'Aurora',
  id: 'aws-1lfekh8',
  q: 'Kiến trúc Aurora khác RDS truyền thống thế nào?',
  answer:
    'Aurora tách **compute** (instance chạy engine MySQL/PostgreSQL) khỏi **storage** — một tầng lưu trữ phân tán, tự mở rộng tới 128TB, sao chép **6 bản qua 3 AZ**, self-healing.\n\n' +
    'Instance chỉ ghi **log records** xuống storage (không ghi cả trang) → nhanh hơn nhiều. Tối đa **15 read replica** chia sẻ cùng storage → replica lag rất thấp (mili giây), thêm replica không cần copy dữ liệu.\n\n' +
    'Failover nhanh (~30s) vì replica đã sẵn sàng trên cùng storage.',
  essence:
    'Aurora = "engine tương thích MySQL/PG + storage layer cloud-native chia sẻ". Replica dùng chung storage nên rẻ, nhanh, lag thấp; failover không cần khôi phục dữ liệu.',
  example:
    'App cần 10 read replica: RDS MySQL mỗi replica là một bản copy đầy đủ (tốn dung lượng + lag do binlog). Aurora: 10 replica cùng trỏ một storage, lag ~10ms, thêm/bớt replica trong 1–2 phút.',
  viz: {
    type: 'compare',
    cols: ['RDS truyền thống', 'Aurora'],
    rows: [
      ['Storage', 'gắn với instance', 'tầng phân tán chia sẻ, tự mở rộng tới 128TB, 6 bản qua 3 AZ'],
      ['Instance ghi', 'cả trang xuống đĩa', 'chỉ log records → nhanh hơn nhiều'],
      ['Read replica', 'mỗi cái là bản copy đầy đủ, lag do binlog', 'tối đa 15, dùng chung storage, lag ~ms, thêm không cần copy'],
      ['Failover', 'khôi phục dữ liệu', '~30s — replica đã sẵn trên cùng storage'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Tách compute khỏi storage",
      code:
        "# RDS truyền thống: một instance + một EBS volume. Replica = sao chép\n" +
        "# transaction log rồi PHÁT LẠI trên instance khác -> tốn CPU, có độ trễ.\n" +
        "\n" +
        "# AURORA: tầng lưu trữ PHÂN TÁN dùng chung, tự nhân 6 BẢN qua 3 AZ.\n" +
        "#  - instance KHÔNG ghi data page, chỉ ghi REDO LOG xuống tầng lưu trữ\n" +
        "#    -> giảm mạnh lưu lượng I/O -> nhanh hơn MySQL/PostgreSQL thường 3-5 lần\n" +
        "#  - MỌI replica đọc CÙNG một tầng lưu trữ -> không phải phát lại log\n" +
        "#    -> độ trễ nhân bản thường dưới 100ms, và tối đa 15 replica\n" +
        "#  - storage TỰ ĐỘNG lớn dần tới 128TB, không cần cấp phát trước\n" +
        "#  - chịu được mất 2 bản sao vẫn GHI được, mất 3 bản vẫn ĐỌC được\n" +
        "aws rds create-db-cluster --db-cluster-identifier prod \\\n" +
        "  --engine aurora-postgresql --engine-version 15.4 \\\n" +
        "  --master-username admin --manage-master-user-password\n" +
        "\n" +
        "# HAI ENDPOINT phải dùng đúng:\n" +
        "#   prod.cluster-xxx.rds.amazonaws.com        -> WRITER (tự trỏ sang node mới khi failover)\n" +
        "#   prod.cluster-ro-xxx.rds.amazonaws.com     -> READER (tự cân bằng tải giữa các replica)\n" +
        "aws rds create-db-instance --db-cluster-identifier prod \\\n" +
        "  --db-instance-identifier prod-reader-1 --db-instance-class db.r6g.large \\\n" +
        "  --engine aurora-postgresql --promotion-tier 1     # thứ tự ưu tiên khi failover\n" +
        "\n" +
        "# Failover thường dưới 30 giây (RDS Multi-AZ là 60-120s).\n" +
        "# Tính năng riêng: Backtrack (tua ngược cụm về quá khứ mà không cần restore),\n" +
        "# Global Database (nhân bản chéo region, độ trễ dưới 1 giây), cloning gần như tức thì.\n" +
        "# ĐÁNH ĐỔI: đắt hơn RDS, và bị khoá vào AWS.",
    },
  ],
},
{
  cat: 'Aurora',
  id: 'aws-17o0ivc',
  q: 'Aurora Serverless v2 dùng khi nào?',
  answer:
    'Aurora Serverless v2 tự động scale compute (ACU — Aurora Capacity Unit) **theo tải, từng nấc nhỏ, trong vài giây**, không gián đoạn kết nối (khác v1). Tỉ lệ 0.5–256 ACU.\n\n' +
    'Hợp với: tải **thất thường/không đoán được**, môi trường dev/test (scale gần 0 khi rảnh), multi-tenant với các tenant tải khác nhau, ứng dụng mới chưa biết capacity.\n\n' +
    'Kém hợp: tải cao **ổn định 24/7** (provisioned + Reserved rẻ hơn).',
  essence:
    'Serverless v2 = "trả đúng lượng compute DB đang cần, thay đổi mượt theo giây". Giá trị nằm ở tải biến động; tải phẳng thì instance cố định vẫn kinh tế hơn.',
  example:
    'SaaS B2B: ban ngày giờ hành chính tải cao, đêm gần như 0. Serverless v2 scale 4→32 ACU lúc cao điểm, co về 2 ACU ban đêm → tiết kiệm ~60% so với provision cho đỉnh.',
  viz: {
    type: 'compare',
    cols: ['Tải biến động / không đoán được', 'Tải cao ổn định 24/7'],
    rows: [
      ['Nên dùng', 'Aurora Serverless v2', 'provisioned + Reserved'],
      ['Serverless v2 làm gì', 'scale 0.5–256 ACU theo giây, không gián đoạn kết nối', '—'],
      ['Ví dụ', 'dev/test, multi-tenant, ứng dụng mới, SaaS B2B giờ hành chính', 'hệ thống tải phẳng'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Co giãn theo ACU, và khác biệt với v1",
      code:
        "# Serverless v2 co giãn liên tục theo ACU (Aurora Capacity Unit ~ 2GB RAM\n" +
        "# và CPU/mạng tương ứng), tăng giảm trong VÀI GIÂY mà KHÔNG ngắt kết nối.\n" +
        "aws rds create-db-cluster --db-cluster-identifier app \\\n" +
        "  --engine aurora-postgresql --engine-version 15.4 \\\n" +
        "  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=16\n" +
        "aws rds create-db-instance --db-cluster-identifier app \\\n" +
        "  --db-instance-identifier app-1 --db-instance-class db.serverless \\\n" +
        "  --engine aurora-postgresql\n" +
        "\n" +
        "# KHÁC v1 (v1 gần như không nên dùng nữa):\n" +
        "#  v1 — scale bằng cách CHUYỂN sang instance khác -> NGẮT kết nối, cần\n" +
        "#       \"điểm scale an toàn\"; về 0 được (dừng hẳn khi không dùng)\n" +
        "#  v2 — scale TẠI CHỖ, không ngắt; tối thiểu 0,5 ACU nên KHÔNG về 0\n" +
        "#       (nghĩa là vẫn tốn tiền tối thiểu ~$43/tháng nếu chạy liên tục)\n" +
        "#       Aurora Serverless v2 \"scale to zero\" đã có từ 2024 cho một số cấu hình.\n" +
        "\n" +
        "# DÙNG KHI:\n" +
        "#  - tải KHÔNG ĐỀU và khó đoán (dev/test, ứng dụng nội bộ theo giờ hành chính)\n" +
        "#  - nhiều database nhỏ dùng chung một cụm\n" +
        "#  - đỉnh tải hiếm nhưng cao -> không phải trả tiền cho đỉnh 24/7\n" +
        "\n" +
        "# KHÔNG NÊN KHI: tải ỔN ĐỊNH và dự đoán được -> instance thường + Reserved\n" +
        "# rẻ hơn đáng kể. Serverless v2 tính theo ACU-giờ, đắt hơn ~30% ở cùng năng lực.",
    },
  ],
},
{
  cat: 'DynamoDB',
  id: 'aws-1r2dd1v',
  q: 'DynamoDB: partition key, sort key và giới hạn item?',
  answer:
    '- **Partition key (hash key)**: DynamoDB hash nó để chọn partition vật lý. Quyết định **phân bố dữ liệu** — key phải có cardinality cao và truy cập đều.\n' +
    '- **Sort key (range key)** (tuỳ chọn): trong một partition key, các item được **sắp xếp** theo sort key → cho phép query theo khoảng, `begins_with`, `between`.\n' +
    '- Primary key = partition key (+ sort key). Phải **duy nhất**.\n' +
    '- **Item tối đa 400KB** (gồm cả tên attribute).',
  essence:
    'Partition key = "dữ liệu nằm ở đâu"; sort key = "thứ tự trong nhóm đó". Thiết kế key = thiết kế access pattern, làm ngay từ đầu vì đổi rất khó.',
  example:
    'Bảng messages: PK = `conversationId`, SK = `timestamp#messageId`. Query "50 tin nhắn mới nhất của hội thoại X" = query PK=X, SK descending, limit 50 — một thao tác, latency ms.',
  viz: {
    type: 'tree',
    title: 'DynamoDB key — thiết kế key = thiết kế access pattern (làm từ đầu)',
    root: {
      label: 'Primary key = partition key (+ sort key) — phải DUY NHẤT',
      children: [
        { label: 'Partition key (hash)', note: '"dữ liệu nằm ở đâu" — cardinality cao, truy cập đều' },
        { label: 'Sort key (range, tuỳ chọn)', note: '"thứ tự trong nhóm" — query theo khoảng, begins_with, between' },
        { label: 'Item tối đa 400KB', note: 'gồm cả tên attribute' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Khoá quyết định mọi thứ về hiệu năng",
      code:
        "# PARTITION KEY (hash key) — quyết định item nằm ở partition vật lý nào.\n" +
        "# SORT KEY (range key) — sắp xếp trong cùng partition, cho phép truy vấn theo dải.\n" +
        "aws dynamodb create-table --table-name Orders \\\n" +
        "  --attribute-definitions AttributeName=customerId,AttributeType=S \\\n" +
        "                          AttributeName=orderDate,AttributeType=S \\\n" +
        "  --key-schema AttributeName=customerId,KeyType=HASH \\\n" +
        "               AttributeName=orderDate,KeyType=RANGE \\\n" +
        "  --billing-mode PAY_PER_REQUEST\n" +
        "\n" +
        "# Query chỉ hoạt động khi biết PARTITION KEY. Đây là ràng buộc lớn nhất\n" +
        "# và phải thiết kế bảng theo MẪU TRUY VẤN, không theo chuẩn hoá như SQL.\n" +
        "aws dynamodb query --table-name Orders \\\n" +
        "  --key-condition-expression \"customerId = :c AND orderDate BETWEEN :a AND :b\" \\\n" +
        "  --expression-attribute-values \u0027{\":c\":{\"S\":\"C-1\"},\":a\":{\"S\":\"2026-01\"},\":b\":{\"S\":\"2026-09\"}}\u0027\n" +
        "\n" +
        "# GIỚI HẠN QUAN TRỌNG:\n" +
        "#  - item tối đa 400KB (kể cả tên thuộc tính) -> dữ liệu lớn để ở S3, lưu con trỏ\n" +
        "#  - partition key tối đa 2048 byte, sort key 1024 byte\n" +
        "#  - mỗi partition chịu 3.000 RCU / 1.000 WCU\n" +
        "#  - Query trả tối đa 1MB mỗi lần -> phải phân trang bằng LastEvaluatedKey\n" +
        "\n" +
        "# HOT PARTITION là vấn đề số một: chọn partition key có lực lượng THẤP\n" +
        "# (ví dụ status = \"ACTIVE\") -> mọi truy cập dồn vào một partition -> throttle\n" +
        "# dù bảng còn thừa capacity. Chọn key phân tán đều (userId, orderId).\n" +
        "# Adaptive capacity giúp giảm nhẹ nhưng không cứu được thiết kế key sai.",
    },
  ],
},
{
  cat: 'DynamoDB',
  id: 'aws-1x7ckat',
  q: 'DynamoDB capacity: on-demand vs provisioned, RCU/WCU?',
  answer:
    '- **WCU**: 1 WCU = 1 ghi/giây cho item ≤ 1KB. **RCU**: 1 RCU = 1 đọc **strongly consistent**/giây cho item ≤ 4KB (hoặc 2 đọc eventually consistent).\n' +
    '- **Provisioned**: bạn đặt RCU/WCU, có auto scaling theo target utilization. Rẻ hơn nếu tải **ổn định/đoán được**; có thể mua reserved capacity.\n' +
    '- **On-demand**: không cần đặt capacity, trả theo request thực tế, chịu spike tức thì. Đắt hơn/đơn vị nhưng không lo throttling; tốt cho tải mới/thất thường.',
  essence:
    'Provisioned = cam kết capacity đổi giá rẻ (hợp tải phẳng). On-demand = trả theo dùng, co giãn tức thì (hợp tải bùng nổ hoặc chưa rõ). Chuyển qua lại được (giới hạn tần suất).',
  example:
    'Bảng session (tải đều theo DAU): provisioned + auto scaling 40–70% utilization. Bảng cho tính năng mới ra mắt: on-demand trong 2 tháng để quan sát pattern, rồi chuyển provisioned nếu ổn định.',
  viz: {
    type: 'compare',
    cols: ['Provisioned', 'On-demand'],
    rows: [
      ['Bạn làm gì', 'đặt RCU/WCU + auto scaling theo target', 'không cần đặt'],
      ['Giá', 'rẻ hơn nếu tải ổn định; mua reserved được', 'đắt hơn/đơn vị, trả theo request thực'],
      ['Spike', 'có thể throttling', 'chịu spike tức thì, không lo throttling'],
      ['Dùng cho', 'tải phẳng, đoán được', 'tải mới / thất thường / chưa rõ'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Cách tính đơn vị và cách chọn chế độ",
      code:
        "# ĐƠN VỊ:\n" +
        "#  1 RCU = 1 lần đọc NHẤT QUÁN MẠNH item 4KB/giây\n" +
        "#        = 2 lần đọc eventually consistent (rẻ một nửa)\n" +
        "#  1 WCU = 1 lần ghi item 1KB/giây\n" +
        "# Item 10KB: đọc mạnh tốn 3 RCU (làm tròn lên 12KB), ghi tốn 10 WCU.\n" +
        "# Transaction tốn GẤP ĐÔI.\n" +
        "\n" +
        "# PROVISIONED — cấp trước, rẻ hơn tới ~7 lần nếu dự đoán đúng\n" +
        "aws dynamodb update-table --table-name Orders \\\n" +
        "  --billing-mode PROVISIONED \\\n" +
        "  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50\n" +
        "# Kèm auto scaling để không bị throttle lúc cao điểm:\n" +
        "aws application-autoscaling register-scalable-target \\\n" +
        "  --service-namespace dynamodb --resource-id \"table/Orders\" \\\n" +
        "  --scalable-dimension \"dynamodb:table:ReadCapacityUnits\" \\\n" +
        "  --min-capacity 50 --max-capacity 1000\n" +
        "\n" +
        "# ON-DEMAND — trả theo request thật, tự scale tức thì, KHÔNG BAO GIỜ throttle\n" +
        "# vì thiếu capacity. Đắt hơn ~7 lần ở cùng lưu lượng ổn định.\n" +
        "aws dynamodb update-table --table-name Orders --billing-mode PAY_PER_REQUEST\n" +
        "\n" +
        "# CHỌN:\n" +
        "#  - mới, chưa biết tải, hoặc tải rất bất thường -> ON-DEMAND\n" +
        "#  - tải ổn định, đã đo được -> PROVISIONED + auto scaling (rẻ hơn nhiều)\n" +
        "#  - đổi qua lại được, nhưng chỉ MỖI 24 GIỜ MỘT LẦN\n" +
        "\n" +
        "# Theo dõi throttle — đây là metric quan trọng nhất của DynamoDB:\n" +
        "aws cloudwatch get-metric-statistics --namespace AWS/DynamoDB \\\n" +
        "  --metric-name ThrottledRequests --dimensions Name=TableName,Value=Orders \\\n" +
        "  --start-time 2026-09-04T00:00:00Z --end-time 2026-09-04T12:00:00Z \\\n" +
        "  --period 300 --statistics Sum",
    },
  ],
},
{
  cat: 'DynamoDB',
  id: 'aws-q9k9l',
  q: 'GSI và LSI khác nhau thế nào?',
  answer:
    '- **LSI (Local Secondary Index)**: cùng partition key, **khác sort key**. Phải tạo **lúc tạo bảng**, tối đa 5, dùng chung capacity với bảng, hỗ trợ strongly consistent read. Giới hạn 10GB item collection mỗi partition key.\n' +
    '- **GSI (Global Secondary Index)**: **partition key và sort key hoàn toàn khác**. Tạo/xoá **bất kỳ lúc nào**, tối đa 20, có **capacity riêng**, chỉ **eventually consistent**. Thực chất là một bảng phái sinh được DynamoDB tự đồng bộ.',
  essence:
    'LSI = "cách sắp xếp khác trong cùng partition" (cố định lúc tạo bảng). GSI = "một access pattern hoàn toàn khác" (linh hoạt, capacity riêng, async). GSI phổ biến hơn nhiều.',
  example:
    'Bảng orders PK=`customerId`, SK=`orderDate`. Cần query "đơn theo trạng thái": GSI PK=`status`, SK=`orderDate`. Cần "đơn của customer sắp theo tổng tiền": LSI SK=`totalAmount` (phải quyết định lúc tạo bảng).',
  viz: {
    type: 'compare',
    cols: ['LSI (Local Secondary Index)', 'GSI (Global Secondary Index)'],
    rows: [
      ['Key', 'cùng partition key, KHÁC sort key', 'partition key và sort key HOÀN TOÀN khác'],
      ['Tạo', 'chỉ lúc tạo bảng, tối đa 5', 'bất kỳ lúc nào, tối đa 20'],
      ['Capacity', 'dùng chung với bảng', 'riêng'],
      ['Consistency', 'strong được', 'chỉ eventually consistent'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Hai loại index, khác nhau ở gần như mọi điểm",
      code:
        "# GSI (Global Secondary Index) — partition key KHÁC bảng gốc.\n" +
        "#  + tạo/xoá BẤT CỨ LÚC NÀO, tối đa 20 GSI mỗi bảng\n" +
        "#  + có capacity RIÊNG (throttle GSI không ảnh hưởng bảng chính, và ngược lại)\n" +
        "#  - chỉ EVENTUALLY CONSISTENT — không đọc mạnh được, không có ngoại lệ\n" +
        "aws dynamodb update-table --table-name Orders \\\n" +
        "  --attribute-definitions AttributeName=status,AttributeType=S \\\n" +
        "  --global-secondary-index-updates \u0027[{\"Create\":{\n" +
        "      \"IndexName\":\"StatusIndex\",\n" +
        "      \"KeySchema\":[{\"AttributeName\":\"status\",\"KeyType\":\"HASH\"}],\n" +
        "      \"Projection\":{\"ProjectionType\":\"INCLUDE\",\"NonKeyAttributes\":[\"total\",\"customerId\"]}}}]\u0027\n" +
        "\n" +
        "# LSI (Local Secondary Index) — CÙNG partition key, khác sort key.\n" +
        "#  + hỗ trợ đọc NHẤT QUÁN MẠNH\n" +
        "#  - CHỈ TẠO ĐƯỢC LÚC TẠO BẢNG, không thêm/xoá sau -> ràng buộc rất nặng\n" +
        "#  - tối đa 5 LSI, và giới hạn 10GB cho mỗi partition key (kể cả bảng + LSI)\n" +
        "#  - dùng chung capacity với bảng chính\n" +
        "\n" +
        "# PROJECTION quyết định chi phí:\n" +
        "#  KEYS_ONLY — nhỏ nhất, nhưng phải đọc lại bảng chính để lấy thuộc tính khác\n" +
        "#  INCLUDE   — chọn đúng thuộc tính cần -> thường là lựa chọn tốt nhất\n" +
        "#  ALL       — tiện nhất, nhưng nhân đôi dung lượng và chi phí ghi\n" +
        "\n" +
        "# THỰC TẾ: gần như luôn dùng GSI. LSI hiếm khi đáng với ràng buộc\n" +
        "# \"chỉ tạo lúc tạo bảng\" và giới hạn 10GB.\n" +
        "# LƯU Ý CHI PHÍ GHI: mỗi lần ghi vào bảng làm cập nhật MỌI GSI liên quan\n" +
        "# -> 5 GSI nghĩa là chi phí ghi gấp khoảng 6 lần.",
    },
  ],
},
{
  cat: 'DynamoDB',
  id: 'aws-1e33qlh',
  q: 'Single-table design trong DynamoDB là gì?',
  answer:
    'Thay vì mỗi entity một bảng (như RDBMS), gom **nhiều loại entity vào một bảng**, dùng PK/SK generic (`PK`, `SK`) với giá trị mang tiền tố loại (`USER#123`, `ORDER#456`).\n\n' +
    'Mục đích: **lấy nhiều entity liên quan trong một query** (không có JOIN). Overload GSI cho các access pattern khác.\n\n' +
    'Đánh đổi: thiết kế khó, khó đọc bằng mắt, phải biết **trước** mọi access pattern, migration phức tạp. Nhiều team dùng "few-table" thực dụng hơn.',
  essence:
    'DynamoDB không có JOIN → single-table "pre-join" dữ liệu bằng cách đặt chung partition. Nó tối ưu cho số lần round-trip, đổi lấy độ phức tạp mô hình hoá.',
  example:
    'PK=`USER#123`: item SK=`PROFILE` (thông tin user), SK=`ORDER#2024-001`, SK=`ORDER#2024-002`. Query PK=`USER#123` một lần → lấy profile + toàn bộ đơn hàng. RDBMS cần 2 query hoặc 1 JOIN.',
  viz: {
    type: 'flow',
    title: 'Single-table design — "pre-join" bằng cách đặt chung partition',
    nodes: ['gom nhiều loại entity vào 1 bảng', 'PK/SK generic + tiền tố loại (USER#123, ORDER#456)', 'overload GSI cho access pattern khác', 'query 1 lần lấy nhiều entity liên quan'],
    steps: [
      { to: 1, label: 'DynamoDB không có JOIN' },
      { to: 3, label: 'tối ưu số round-trip, đổi lấy độ phức tạp mô hình hoá' },
      { to: 3, label: 'phải biết TRƯỚC mọi access pattern; migration phức tạp — nhiều team dùng "few-table" thực dụng hơn' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Gộp nhiều loại thực thể vào một bảng",
      code:
        "# Ý tưởng: DynamoDB không có JOIN. Muốn lấy dữ liệu liên quan trong MỘT\n" +
        "# truy vấn thì phải để chúng CÙNG partition -> gộp nhiều loại thực thể\n" +
        "# vào một bảng với khoá được thiết kế theo mẫu truy vấn.\n" +
        "\n" +
        "# PK = \"CUSTOMER#C1\"    SK = \"PROFILE\"           -> hồ sơ khách hàng\n" +
        "# PK = \"CUSTOMER#C1\"    SK = \"ORDER#2026-09-01\"  -> đơn hàng của khách đó\n" +
        "# PK = \"CUSTOMER#C1\"    SK = \"ADDRESS#HOME\"      -> địa chỉ\n" +
        "# Một Query lấy được TẤT CẢ:\n" +
        "aws dynamodb query --table-name AppTable \\\n" +
        "  --key-condition-expression \"PK = :pk\" \\\n" +
        "  --expression-attribute-values \u0027{\":pk\":{\"S\":\"CUSTOMER#C1\"}}\u0027\n" +
        "\n" +
        "# Lấy riêng đơn hàng: thêm điều kiện begins_with trên sort key\n" +
        "  --key-condition-expression \"PK = :pk AND begins_with(SK, :sk)\" \\\n" +
        "  --expression-attribute-values \u0027{\":pk\":{\"S\":\"CUSTOMER#C1\"},\":sk\":{\"S\":\"ORDER#\"}}\u0027\n" +
        "\n" +
        "# GSI OVERLOADING: một GSI phục vụ nhiều mẫu truy vấn khác nhau bằng cách\n" +
        "# dùng thuộc tính chung GSI1PK/GSI1SK với ý nghĩa khác nhau theo loại item.\n" +
        "\n" +
        "# ƯU: ít truy vấn hơn, độ trễ thấp hơn, rẻ hơn, một bảng dễ vận hành.\n" +
        "# NHƯỢC (thật sự nặng): phải BIẾT TRƯỚC mọi mẫu truy vấn; thêm mẫu mới sau này\n" +
        "# rất tốn công; dữ liệu khó đọc bằng mắt; đường học dốc.\n" +
        "\n" +
        "# THỰC DỤNG: single-table đúng khi mẫu truy vấn ổn định và cần độ trễ thấp\n" +
        "# ở quy mô lớn. Ứng dụng còn đang thay đổi nhanh -> nhiều bảng đơn giản\n" +
        "# vẫn tốt hơn, và AWS cũng không còn khuyến nghị single-table cho mọi trường hợp.",
    },
  ],
},
{
  cat: 'DynamoDB',
  id: 'aws-1wcbec2',
  q: 'DynamoDB Streams và TTL dùng để làm gì?',
  answer:
    '- **Streams**: log thay đổi (INSERT/MODIFY/REMOVE) theo thứ tự per-partition-key, giữ 24 giờ. Trigger Lambda → dùng cho: cập nhật aggregate, đồng bộ sang OpenSearch/S3, audit, phát event, materialized view, replication (Global Tables dùng cơ chế này).\n' +
    '- **TTL**: chỉ định một attribute chứa epoch timestamp; DynamoDB **tự xoá** item sau thời điểm đó (trong vòng ~48h, miễn phí). Item bị xoá qua TTL cũng xuất hiện trong Streams (`userIdentity` = `dynamodb.amazonaws.com`).',
  essence:
    'Streams biến DynamoDB thành nguồn CDC event-driven. TTL là cách dọn dữ liệu hết hạn (session, cache, log) mà không tốn WCU và không cần job xoá.',
  example:
    'Bảng `sessions` với TTL attribute `expiresAt`: item tự biến mất sau 24h. Streams → Lambda: khi item session bị REMOVE, ghi một sự kiện "session ended" vào analytics; khi ORDER được INSERT, cập nhật bộ đếm `dailyOrderCount`.',
  viz: {
    type: 'tree',
    title: 'DynamoDB Streams + TTL',
    root: {
      label: 'Streams biến DynamoDB thành nguồn CDC event-driven',
      children: [
        { label: 'Streams', note: 'log INSERT/MODIFY/REMOVE theo thứ tự per-partition-key, giữ 24h → trigger Lambda' },
        { label: 'Dùng Streams cho', note: 'aggregate, đồng bộ OpenSearch/S3, audit, materialized view, Global Tables' },
        { label: 'TTL', note: 'attribute epoch → DynamoDB tự xoá item (~48h, miễn phí, không tốn WCU)' },
        { label: 'Item xoá qua TTL', note: 'cũng xuất hiện trong Streams (userIdentity = dynamodb.amazonaws.com)' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Nhật ký thay đổi và tự động xoá",
      code:
        "# STREAMS — nhật ký thay đổi có thứ tự, giữ 24 giờ. Đây là cách làm CDC,\n" +
        "# event sourcing, và giữ đồng bộ với hệ thống khác.\n" +
        "aws dynamodb update-table --table-name Orders \\\n" +
        "  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES\n" +
        "# StreamViewType:\n" +
        "#   KEYS_ONLY | NEW_IMAGE | OLD_IMAGE | NEW_AND_OLD_IMAGES\n" +
        "#   NEW_AND_OLD_IMAGES cho phép so sánh trước/sau -> cần cho audit trail\n" +
        "\n" +
        "aws lambda create-event-source-mapping \\\n" +
        "  --function-name process-changes \\\n" +
        "  --event-source-arn $STREAM_ARN \\\n" +
        "  --starting-position LATEST --batch-size 100 \\\n" +
        "  --maximum-retry-attempts 3 \\\n" +
        "  --destination-config \u0027{\"OnFailure\":{\"Destination\":\"\u0027$DLQ_ARN\u0027\"}}\u0027\n" +
        "# Thứ tự được đảm bảo TRONG một partition key. Lambda xử lý theo shard.\n" +
        "\n" +
        "# TTL — tự xoá item hết hạn, MIỄN PHÍ (không tốn WCU)\n" +
        "aws dynamodb update-time-to-live --table-name Sessions \\\n" +
        "  --time-to-live-specification \"Enabled=true,AttributeName=expiresAt\"\n" +
        "# Thuộc tính phải là số NGUYÊN, đơn vị GIÂY epoch (không phải mili giây —\n" +
        "# đây là lỗi hay gặp nhất, item sẽ không bao giờ bị xoá hoặc bị xoá ngay).\n" +
        "\n" +
        "# LƯU Ý: TTL xoá TRONG VÒNG 48 GIỜ sau khi hết hạn, KHÔNG phải ngay lập tức.\n" +
        "# -> truy vấn vẫn có thể trả về item đã hết hạn -> phải LỌC ở tầng ứng dụng:\n" +
        "#    FilterExpression: \"expiresAt > :now\"\n" +
        "# Item bị TTL xoá cũng xuất hiện trong Stream (userIdentity = dynamodb.amazonaws.com)\n" +
        "# -> dùng để lưu trữ dữ liệu cũ sang S3 trước khi mất.",
    },
  ],
},
{
  cat: 'DynamoDB',
  id: 'aws-zjzmfx',
  q: 'Eventually consistent vs strongly consistent read? DynamoDB transactions?',
  answer:
    '- **Eventually consistent read** (mặc định): có thể đọc trúng một replica chưa nhận bản ghi mới nhất (thường trễ < 1s). Rẻ hơn (0.5 RCU).\n' +
    '- **Strongly consistent read**: luôn phản ánh mọi ghi thành công trước đó. Tốn 1 RCU, latency nhỉnh hơn, **không dùng được trên GSI**.\n' +
    '- **Transactions** (`TransactWriteItems`/`TransactGetItems`): tối đa 100 item, all-or-nothing, có điều kiện (`ConditionCheck`). Tốn 2x capacity. Cho thao tác cần nguyên tử đa item (chuyển tiền, đảm bảo tính duy nhất).',
  essence:
    'Mặc định là eventually consistent để nhanh và rẻ; yêu cầu strong khi vừa-ghi-vừa-đọc cùng item. Transactions thêm tính nguyên tử ACID có giới hạn cho các thao tác đa item.',
  example:
    'Đăng ký username duy nhất: `TransactWriteItems` gồm `Put` item user + `Put` item `USERNAME#alice` với `ConditionExpression: attribute_not_exists(PK)` → hoặc cả hai thành công, hoặc fail nếu username đã tồn tại. Đọc lại profile ngay sau khi update: strongly consistent.',
  viz: {
    type: 'compare',
    cols: ['Eventually consistent (mặc định)', 'Strongly consistent', 'Transactions'],
    rows: [
      ['Đọc', 'có thể trúng replica cũ (< 1s)', 'luôn phản ánh mọi ghi trước đó', 'TransactWriteItems/GetItems ≤ 100 item'],
      ['Chi phí', '0.5 RCU', '1 RCU, latency nhỉnh', '2x capacity'],
      ['Giới hạn', '—', 'KHÔNG dùng được trên GSI', 'all-or-nothing, có ConditionCheck'],
      ['Dùng khi', 'nhanh, rẻ', 'vừa-ghi-vừa-đọc cùng item', 'nguyên tử đa item (chuyển tiền, tính duy nhất)'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ba chế độ đọc và transaction",
      code:
        "# EVENTUALLY CONSISTENT (mặc định) — có thể đọc ra dữ liệu CŨ (thường\n" +
        "# chỉ trong vòng dưới một giây). RẺ MỘT NỬA.\n" +
        "aws dynamodb get-item --table-name Orders \\\n" +
        "  --key \u0027{\"customerId\":{\"S\":\"C-1\"},\"orderDate\":{\"S\":\"2026-09-01\"}}\u0027\n" +
        "\n" +
        "# STRONGLY CONSISTENT — luôn thấy bản ghi mới nhất. Tốn gấp đôi RCU,\n" +
        "# độ trễ cao hơn một chút, và KHÔNG dùng được trên GSI.\n" +
        "aws dynamodb get-item --table-name Orders --consistent-read \\\n" +
        "  --key \u0027{\"customerId\":{\"S\":\"C-1\"},\"orderDate\":{\"S\":\"2026-09-01\"}}\u0027\n" +
        "\n" +
        "# TRANSACTION — tối đa 100 item, nguyên tử, tốn GẤP ĐÔI capacity\n" +
        "aws dynamodb transact-write-items --transact-items \u0027[\n" +
        "  {\"Update\":{\"TableName\":\"Accounts\",\"Key\":{\"id\":{\"S\":\"A\"}},\n" +
        "    \"UpdateExpression\":\"SET balance = balance - :amt\",\n" +
        "    \"ConditionExpression\":\"balance >= :amt\",\n" +
        "    \"ExpressionAttributeValues\":{\":amt\":{\"N\":\"100\"}}}},\n" +
        "  {\"Update\":{\"TableName\":\"Accounts\",\"Key\":{\"id\":{\"S\":\"B\"}},\n" +
        "    \"UpdateExpression\":\"SET balance = balance + :amt\",\n" +
        "    \"ExpressionAttributeValues\":{\":amt\":{\"N\":\"100\"}}}}]\u0027\n" +
        "\n" +
        "# CONDITIONAL WRITE — khoá lạc quan, rẻ hơn transaction rất nhiều.\n" +
        "# Dùng cái này trước khi nghĩ tới transaction:\n" +
        "aws dynamodb put-item --table-name Orders --item file://item.json \\\n" +
        "  --condition-expression \"attribute_not_exists(customerId)\"    # chỉ tạo mới\n" +
        "\n" +
        "# CHỌN: đọc mạnh chỉ khi nghiệp vụ THỰC SỰ cần (số dư, tồn kho).\n" +
        "# Phần lớn trường hợp (danh sách, hồ sơ, lịch sử) eventually consistent là đủ\n" +
        "# và tiết kiệm một nửa chi phí đọc.",
    },
  ],
},
{
  cat: 'Cache',
  id: 'aws-1iaxaf9',
  q: 'ElastiCache: Redis và Memcached — chọn cái nào?',
  answer:
    '- **Memcached**: multi-threaded, chỉ key-value string đơn giản, không persistence, không replication, sharding phía client. Cho cache thuần, đơn giản, cần nhiều core.\n' +
    '- **Redis** (hoặc Valkey): single-threaded (per shard), **nhiều kiểu dữ liệu** (list, set, sorted set, hash, stream), replication, cluster mode, snapshot/AOF, pub/sub, Lua, transaction, geo. Cho cache có cấu trúc, leaderboard, rate limit, session, hàng đợi nhẹ.',
  essence:
    'Memcached = cache RAM thuần, đa luồng, không HA. Redis = "cấu trúc dữ liệu qua mạng" + HA + persistence. Gần như luôn chọn Redis trừ khi nhu cầu cực kỳ đơn giản.',
  example:
    'Cache kết quả query DB dạng blob JSON, cần throughput cao trên instance nhiều core, chấp nhận mất khi restart: Memcached. Cần leaderboard (sorted set), phân tán rate limit, session store có failover: Redis.',
  viz: {
    type: 'compare',
    cols: ['Memcached', 'Redis / Valkey'],
    rows: [
      ['Luồng', 'multi-threaded', 'single-threaded per shard'],
      ['Kiểu dữ liệu', 'chỉ key-value string', 'list, set, sorted set, hash, stream'],
      ['HA / persistence', 'không', 'replication, cluster, snapshot/AOF'],
      ['Dùng cho', 'cache thuần, đơn giản, nhiều core', 'leaderboard, rate limit, session, pub/sub — gần như luôn chọn Redis'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Gần như luôn là Redis",
      code:
        "# MEMCACHED — chỉ key-value dạng chuỗi, đa luồng, KHÔNG bền, KHÔNG replication.\n" +
        "#  Ưu điểm duy nhất còn lại: đa luồng nên tận dụng nhiều core tốt hơn cho\n" +
        "#  workload cache thuần rất đơn giản, và scale ngang bằng sharding client-side.\n" +
        "aws elasticache create-cache-cluster --cache-cluster-id mc \\\n" +
        "  --engine memcached --cache-node-type cache.t4g.medium --num-cache-nodes 3\n" +
        "\n" +
        "# REDIS — cấu trúc dữ liệu phong phú (list, set, sorted set, hash, stream),\n" +
        "# persistence, replication, Multi-AZ với tự failover, pub/sub, Lua, transaction.\n" +
        "aws elasticache create-replication-group \\\n" +
        "  --replication-group-id prod --replication-group-description \"prod cache\" \\\n" +
        "  --engine redis --cache-node-type cache.r7g.large \\\n" +
        "  --num-node-groups 3 --replicas-per-node-group 2 \\\n" +
        "  --automatic-failover-enabled --multi-az-enabled \\\n" +
        "  --transit-encryption-enabled --at-rest-encryption-enabled\n" +
        "\n" +
        "# CHỌN REDIS khi cần bất cứ thứ gì sau đây (tức là gần như luôn):\n" +
        "#  - leaderboard/xếp hạng (sorted set), hàng đợi, rate limiting\n" +
        "#  - session store cần sống sót qua restart\n" +
        "#  - pub/sub, khoá phân tán\n" +
        "#  - tính sẵn sàng cao và failover tự động\n" +
        "\n" +
        "# CHẾ ĐỘ REDIS:\n" +
        "#  cluster mode DISABLED — một shard, tối đa 5 replica. Đơn giản, đủ cho\n" +
        "#    hầu hết trường hợp, và hỗ trợ mọi lệnh multi-key.\n" +
        "#  cluster mode ENABLED  — nhiều shard, dữ liệu chia theo hash slot.\n" +
        "#    Cần cho tập dữ liệu lớn, nhưng lệnh multi-key chỉ chạy trong cùng slot.\n" +
        "\n" +
        "# ElastiCache Serverless (2023) tự co giãn, tính theo dung lượng dùng thật —\n" +
        "# đáng cân nhắc khi tải không đều.",
    },
  ],
},
{
  cat: 'Storage',
  id: 'aws-l3i472',
  q: 'EBS, EFS, S3 và FSx — dùng cho tình huống nào?',
  answer:
    '- **EBS**: block storage cho **một** EC2 (io2 hỗ trợ Multi-Attach hạn chế). Như ổ đĩa của server. Cho OS, DB tự quản, ứng dụng cần filesystem POSIX hiệu năng cao.\n' +
    '- **EFS**: NFS được quản lý, **nhiều EC2/Lambda/container mount đồng thời**, tự co giãn, đa AZ. Cho shared content, home directory, CMS, CI workspace.\n' +
    '- **S3**: object storage qua API HTTP, không phải filesystem. Cho backup, media, data lake, static asset, log.\n' +
    '- **FSx**: filesystem chuyên dụng — FSx for Windows (SMB/AD), FSx for Lustre (HPC), FSx for NetApp ONTAP.',
  essence:
    'EBS = đĩa của một máy. EFS = ổ chia sẻ mạng POSIX cho nhiều máy. S3 = kho object qua API. Chọn theo "một hay nhiều client" và "filesystem hay object".',
  example:
    'Cụm 10 web server cần cùng thư mục upload: EFS mount lên cả 10. Mỗi server cần đĩa riêng cho DB local: EBS gp3. Ảnh gốc do người dùng tải lên, phục vụ qua CloudFront: S3.',
  viz: {
    type: 'compare',
    cols: ['EBS', 'EFS', 'S3', 'FSx'],
    rows: [
      ['Kiểu', 'block — đĩa của MỘT máy', 'NFS POSIX — nhiều máy mount đồng thời', 'object qua API HTTP', 'filesystem chuyên dụng'],
      ['Client', '1 EC2 (io2 Multi-Attach hạn chế)', 'nhiều EC2/Lambda/container, đa AZ', 'bất kỳ, qua HTTP', 'Windows (SMB/AD), Lustre (HPC), ONTAP'],
      ['Dùng cho', 'OS, DB tự quản', 'shared content, home dir, CI workspace', 'backup, media, data lake, log', 'khối lượng công việc đặc thù'],
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Bốn kiểu lưu trữ cho bốn nhu cầu khác nhau",
      code:
        "# EBS — khối, gắn vào MỘT instance (trừ io2 Multi-Attach), trong MỘT AZ.\n" +
        "#   Dùng cho: ổ hệ điều hành, database tự quản, bất cứ thứ gì cần filesystem\n" +
        "#   với độ trễ thấp và IOPS ổn định.\n" +
        "aws ec2 create-volume --volume-type gp3 --size 100 --availability-zone ap-southeast-1a\n" +
        "\n" +
        "# EFS — NFS, NHIỀU instance gắn CÙNG LÚC, tự động trải nhiều AZ, tự lớn dần.\n" +
        "#   Dùng cho: thư mục dùng chung giữa nhiều server, CMS, home directory,\n" +
        "#   container cần chia sẻ dữ liệu.\n" +
        "#   Đắt hơn EBS đáng kể và độ trễ cao hơn -> ĐỪNG đặt database lên EFS.\n" +
        "aws efs create-file-system --performance-mode generalPurpose \\\n" +
        "  --throughput-mode elastic --encrypted\n" +
        "# Lifecycle chuyển file ít dùng sang tầng IA -> giảm chi phí rất nhiều:\n" +
        "aws efs put-lifecycle-configuration --file-system-id fs-123 \\\n" +
        "  --lifecycle-policies \u0027[{\"TransitionToIA\":\"AFTER_30_DAYS\"}]\u0027\n" +
        "\n" +
        "# S3 — object, truy cập qua API (không phải filesystem), rẻ nhất, không giới hạn.\n" +
        "#   Dùng cho: file người dùng tải lên, backup, data lake, tài sản tĩnh, log.\n" +
        "#   KHÔNG dùng cho: thứ cần ghi ngẫu nhiên tại chỗ, hoặc cần POSIX semantics.\n" +
        "\n" +
        "# FSx — filesystem chuyên dụng có quản lý:\n" +
        "#   FSx for Windows  — SMB, Active Directory (ứng dụng Windows cũ)\n" +
        "#   FSx for Lustre   — HPC, machine learning, liên kết trực tiếp với S3\n" +
        "#   FSx for NetApp ONTAP / OpenZFS — tính năng doanh nghiệp (snapshot, dedup)\n" +
        "\n" +
        "# CÂU HỎI CHỌN NHANH:\n" +
        "#  Cần nhiều máy ghi cùng lúc?           -> EFS (Linux) / FSx (Windows)\n" +
        "#  Chỉ một máy, cần nhanh và rẻ?          -> EBS\n" +
        "#  Không cần filesystem, truy cập qua API? -> S3 (rẻ nhất, luôn ưu tiên nếu được)",
    },
  ],
},
]);
