SS.addQuestions('sql', [
{
  cat: 'Chuẩn hoá',
  q: 'Chuẩn hoá 1NF, 2NF, 3NF, BCNF — tóm tắt?',
  answer:
    '- **1NF**: mỗi ô chứa **một giá trị nguyên tử** (không mảng, không danh sách CSV trong một cột), mỗi hàng duy nhất.\n' +
    '- **2NF**: 1NF + không có cột nào phụ thuộc vào **một phần** của khoá tổ hợp (chỉ quan trọng khi PK gồm nhiều cột).\n' +
    '- **3NF**: 2NF + không có **phụ thuộc bắc cầu** (cột non-key phụ thuộc cột non-key khác). Ví dụ `zip → city` mà `zip` không phải key → tách ra.\n' +
    '- **BCNF**: chặt hơn 3NF một chút — mọi phụ thuộc hàm đều có vế trái là superkey.',
  essence:
    'Chuẩn hoá = "mỗi sự thật lưu đúng một chỗ" → không có anomaly khi INSERT/UPDATE/DELETE. 3NF là mục tiêu thực dụng cho hầu hết schema OLTP.',
  example:
    'Bảng `orders` có `customer_name`, `customer_email` lặp lại mỗi đơn → sửa email khách phải update mọi đơn (update anomaly). 3NF: tách `customers`, `orders` chỉ giữ `customer_id`.',
  viz: {
    type: 'layers',
    title: 'Mỗi mức bao trong mức trước, chặt dần',
    dir: 'up',
    layers: [
      { name: '1NF', tag: 'nguyên tử', note: 'mỗi ô một giá trị nguyên tử, mỗi hàng duy nhất — không mảng/CSV trong cột' },
      { name: '2NF', tag: '1NF + …', note: 'không cột nào phụ thuộc một phần của khoá tổ hợp (chỉ quan trọng khi PK nhiều cột)' },
      { name: '3NF', tag: '2NF + …', note: 'không phụ thuộc bắc cầu: non-key không phụ thuộc non-key khác (zip → city → tách)' },
      { name: 'BCNF', tag: '3NF + …', note: 'mọi phụ thuộc hàm có vế trái là superkey — mục tiêu thực dụng là 3NF' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Từ bảng lộn xộn tới bảng chuẩn",
      code:
        "-- CHƯA CHUẨN HOÁ — mọi thứ nhét vào một bảng\n" +
        "CREATE TABLE orders_bad (\n" +
        "  order_id    BIGINT,\n" +
        "  customer_name TEXT,\n" +
        "  customer_city TEXT,      -- phụ thuộc vào KHÁCH, không phải vào đơn\n" +
        "  products    TEXT,        -- \u0027SKU-1, SKU-2, SKU-3\u0027  <- vi phạm 1NF\n" +
        "  product_price NUMERIC    -- giá của sản phẩm nào?\n" +
        ");\n" +
        "\n" +
        "-- 1NF: mỗi ô chứa MỘT giá trị nguyên tử, không có nhóm lặp\n" +
        "--   -> tách products thành bảng order_lines riêng.\n" +
        "-- 2NF: 1NF + mọi cột không khoá phụ thuộc TOÀN BỘ khoá chính\n" +
        "--   -> với khoá (order_id, sku), product_price chỉ phụ thuộc sku\n" +
        "--      -> tách sang bảng products.\n" +
        "-- 3NF: 2NF + không có phụ thuộc BẮC CẦU (cột không khoá phụ thuộc cột không khoá)\n" +
        "--   -> customer_city phụ thuộc customer_name, không phụ thuộc order_id\n" +
        "--      -> tách sang bảng customers.\n" +
        "-- BCNF: chặt hơn 3NF — MỌI phụ thuộc hàm đều có vế trái là siêu khoá.\n" +
        "--   Khác 3NF chỉ trong trường hợp hiếm (nhiều khoá dự tuyển chồng lấn).\n" +
        "\n" +
        "CREATE TABLE customers (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL, city TEXT);\n" +
        "CREATE TABLE products  (sku TEXT PRIMARY KEY, name TEXT NOT NULL, price NUMERIC(12,2));\n" +
        "CREATE TABLE orders (\n" +
        "  id BIGSERIAL PRIMARY KEY,\n" +
        "  customer_id BIGINT NOT NULL REFERENCES customers(id),\n" +
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "CREATE TABLE order_lines (\n" +
        "  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,\n" +
        "  sku      TEXT   NOT NULL REFERENCES products(sku),\n" +
        "  quantity INT    NOT NULL CHECK (quantity > 0),\n" +
        "  unit_price NUMERIC(12,2) NOT NULL,   -- CHỤP LẠI giá lúc mua — cố ý dư thừa,\n" +
        "  PRIMARY KEY (order_id, sku)          -- vì giá sản phẩm sẽ thay đổi sau này\n" +
        ");\n" +
        "-- Ghi nhớ: 3NF là mục tiêu thực dụng cho OLTP. Vượt quá đó thường không đáng.",
    },
  ],
},
{
  cat: 'Chuẩn hoá',
  q: 'Khi nào nên denormalize (phi chuẩn hoá)?',
  answer:
    'Cân nhắc denormalize khi:\n' +
    '- **JOIN quá nhiều bảng** cho một truy vấn nóng, đã tối ưu index mà vẫn chậm.\n' +
    '- **Đọc >> ghi** và dữ liệu ít thay đổi.\n' +
    '- Cần **giá trị tính sẵn** (aggregate): `order_count`, `total_spent` trên `customers`.\n' +
    '- Báo cáo / analytics (dùng bảng tổng hợp, materialized view).\n\n' +
    'Cái giá: dữ liệu trùng lặp cần **giữ đồng bộ** (trigger, application code, CDC, job) → rủi ro không nhất quán. Chỉ denormalize khi đo được lợi ích và có cơ chế sync rõ ràng.',
  essence:
    'Chuẩn hoá là mặc định (đúng đắn dễ, hiệu năng sau). Denormalize là tối ưu có chủ đích: chấp nhận trùng lặp + trách nhiệm đồng bộ để đổi lấy tốc độ đọc. Đo trước, đừng đoán.',
  example:
    'Feed mạng xã hội hiển thị số like mỗi post: `SELECT count(*) FROM likes WHERE post_id = ?` cho mỗi post = chậm. Denormalize: cột `like_count` trên `posts`, cập nhật bằng trigger hoặc `UPDATE ... SET like_count = like_count + 1` khi like.',
  viz: {
    type: 'tree',
    title: 'Chuẩn hoá là mặc định — denormalize là tối ưu có chủ đích',
    root: {
      label: 'Cân nhắc denormalize khi…',
      children: [
        { label: 'JOIN quá nhiều bảng cho query nóng', note: 'đã tối ưu index mà vẫn chậm' },
        { label: 'Đọc >> ghi, dữ liệu ít đổi', note: 'trùng lặp ít bị lệch vì hiếm cập nhật' },
        { label: 'Cần giá trị tính sẵn', note: 'order_count, total_spent, like_count trên bảng cha' },
        { label: 'Báo cáo / analytics', note: 'bảng tổng hợp, materialized view' },
        { label: 'Cái giá: phải giữ đồng bộ', note: 'trigger / app code / CDC / job — đo lợi ích trước, đừng đoán' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Đánh đổi đúng đắn khi ĐÃ ĐO được vấn đề",
      code:
        "-- Chuẩn hoá tốt cho GHI (không trùng lặp, không bất nhất).\n" +
        "-- Phi chuẩn hoá tốt cho ĐỌC (ít join, ít truy vấn).\n" +
        "\n" +
        "-- 1) CHỤP LẠI GIÁ TRỊ LỊCH SỬ — đây không thực sự là phi chuẩn hoá,\n" +
        "--    mà là mô hình đúng: giá lúc mua KHÁC giá hiện tại.\n" +
        "ALTER TABLE order_lines ADD COLUMN unit_price NUMERIC(12,2) NOT NULL;\n" +
        "\n" +
        "-- 2) CỘT TỔNG HỢP TÍNH SẴN — khi COUNT/SUM chạy quá nhiều lần\n" +
        "ALTER TABLE posts ADD COLUMN comment_count INT NOT NULL DEFAULT 0;\n" +
        "CREATE OR REPLACE FUNCTION bump_comment_count() RETURNS TRIGGER AS $$\n" +
        "BEGIN\n" +
        "  UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;\n" +
        "  RETURN NEW;\n" +
        "END; $$ LANGUAGE plpgsql;\n" +
        "CREATE TRIGGER trg_comment_count AFTER INSERT ON comments\n" +
        "FOR EACH ROW EXECUTE FUNCTION bump_comment_count();\n" +
        "-- Rủi ro: trigger có thể sai lệch -> cần job đối soát định kỳ.\n" +
        "\n" +
        "-- 3) NHÂN BẢN CỘT ĐỂ TRÁNH JOIN NÓNG\n" +
        "ALTER TABLE orders ADD COLUMN customer_name TEXT;   -- tránh join customers\n" +
        "-- Bắt buộc: cập nhật khi tên khách đổi, hoặc chấp nhận đây là \"tên lúc đặt hàng\".\n" +
        "\n" +
        "-- 4) MATERIALIZED VIEW — phi chuẩn hoá mà KHÔNG đụng vào schema gốc.\n" +
        "--    Đây thường là lựa chọn tốt nhất: dữ liệu gốc vẫn chuẩn hoá.\n" +
        "CREATE MATERIALIZED VIEW mv_order_summary AS\n" +
        "SELECT o.id, c.name, SUM(l.quantity * l.unit_price) AS total\n" +
        "FROM orders o JOIN customers c ON c.id = o.customer_id\n" +
        "JOIN order_lines l ON l.order_id = o.id GROUP BY o.id, c.name;\n" +
        "\n" +
        "-- QUY TẮC: chuẩn hoá TRƯỚC, đo, rồi mới phi chuẩn hoá ĐÚNG CHỖ ĐAU.\n" +
        "-- Phi chuẩn hoá sớm là nguồn của dữ liệu bất nhất mà không đổi lại được gì.",
    },
  ],
},
{
  cat: 'Khoá',
  q: 'Surrogate key vs natural key? UUID vs auto-increment?',
  answer:
    '- **Natural key**: khoá từ dữ liệu thật (email, SSN, mã ISBN). Có nghĩa nhưng có thể đổi, có thể to, có thể không thật sự duy nhất/ổn định.\n' +
    '- **Surrogate key**: khoá nhân tạo không nghĩa (auto-increment id, UUID). Ổn định, nhỏ (bigint), không lộ thông tin.\n\n' +
    '**Auto-increment BIGINT**: nhỏ (8 byte), tuần tự → index locality tốt, insert ở cuối B-tree. Nhược: lộ số lượng, khó merge dữ liệu từ nhiều nguồn, cần DB round-trip để biết id.\n\n' +
    '**UUID v4** (ngẫu nhiên): sinh ở client, không đụng nhau khi merge, không lộ đếm. Nhược: 16 byte, **ngẫu nhiên → phá index locality** (page split, bloat, cache miss), nhất là làm clustered PK trong InnoDB.\n\n' +
    '**UUID v7 / ULID**: có phần timestamp ở đầu → **tăng dần theo thời gian** → giữ được locality. Lựa chọn tốt nếu cần UUID.',
  essence:
    'Dùng surrogate key làm PK; natural key làm UNIQUE constraint. Nếu cần id sinh phía client / merge nhiều nguồn → UUID **v7/ULID** (tăng dần), tránh v4 làm PK.',
  example:
    'Bảng `events` 1 tỉ hàng, PK UUID v4 trong InnoDB: insert phân tán khắp clustered index → 3–4× write amplification, index bloat. Đổi sang UUID v7 → insert gần cuối như auto-increment, throughput ghi tăng đáng kể.',
  viz: {
    type: 'compare',
    corner: 'Tiêu chí',
    cols: ['Auto-inc BIGINT', 'UUID v4', 'UUID v7 / ULID'],
    rows: [
      ['Kích thước', '8 byte', '16 byte', '16 byte'],
      ['Index locality', 'tốt (tuần tự)', 'kém (ngẫu nhiên → page split)', 'tốt (timestamp ở đầu)'],
      ['Sinh ở client', 'không (cần round-trip)', 'có', 'có'],
      ['Lộ số lượng / đếm', 'có', 'không', 'không'],
      ['Làm PK bảng lớn', 'tốt', 'tránh', 'tốt'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Chọn khoá chính",
      code:
        "-- NATURAL KEY — dùng dữ liệu nghiệp vụ làm khoá (email, số CMND, mã sản phẩm)\n" +
        "CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT NOT NULL);\n" +
        "-- + không cần cột thừa, join bằng giá trị có nghĩa\n" +
        "-- - nghiệp vụ ĐỔI thì khoá đổi -> phải cập nhật mọi bảng tham chiếu\n" +
        "-- - thường dài -> mọi index phụ đều phình theo\n" +
        "\n" +
        "-- SURROGATE KEY — số/UUID không mang ý nghĩa nghiệp vụ. Mặc định nên dùng.\n" +
        "CREATE TABLE products (\n" +
        "  id  BIGSERIAL PRIMARY KEY,\n" +
        "  sku TEXT NOT NULL UNIQUE,        -- natural key vẫn giữ, dưới dạng UNIQUE\n" +
        "  name TEXT NOT NULL\n" +
        ");\n" +
        "-- Đây là cách tốt nhất: ổn định để tham chiếu, VÀ vẫn có ràng buộc nghiệp vụ.\n" +
        "\n" +
        "-- BIGSERIAL / AUTO_INCREMENT\n" +
        "-- + nhỏ (8 byte), TĂNG DẦN -> chèn vào cuối B-tree, ít tách trang, ít bloat\n" +
        "-- + đọc/debug dễ\n" +
        "-- - lộ thông tin (id = 1000 cho biết quy mô hệ thống)\n" +
        "-- - phải hỏi DB mới có id -> khó gộp dữ liệu từ nhiều nguồn\n" +
        "\n" +
        "-- UUID\n" +
        "CREATE TABLE events (id UUID PRIMARY KEY DEFAULT gen_random_uuid());\n" +
        "-- + sinh được ở CLIENT trước khi ghi DB -> hợp hệ phân tán, offline-first\n" +
        "-- + không lộ thông tin, không đụng độ khi gộp dữ liệu\n" +
        "-- - 16 byte (36 nếu lưu dạng TEXT — ĐỪNG làm vậy, dùng kiểu UUID)\n" +
        "-- - UUIDv4 NGẪU NHIÊN -> chèn vào GIỮA index -> tách trang, phân mảnh,\n" +
        "--   ghi ngẫu nhiên. Ảnh hưởng rất rõ trong MySQL/InnoDB (clustered index).\n" +
        "\n" +
        "-- UUIDv7 (2024) — có tiền tố THỜI GIAN nên tăng dần, giữ được ưu điểm của\n" +
        "-- cả hai. Đây là lựa chọn tốt nhất hiện nay khi cần id sinh ở client.\n" +
        "-- Postgres 18 có uuidv7(); trước đó dùng extension hoặc sinh ở ứng dụng.",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Chọn kiểu dữ liệu: int vs bigint, varchar vs text, tiền tệ, timestamp?',
  answer:
    '- **Số nguyên**: `int` (±2.1 tỉ) đủ cho hầu hết đếm; nhưng **PK/FK dùng `bigint`** (một bảng "chỉ vài triệu" hôm nay có thể tràn int sau vài năm — migrate PK là ác mộng).\n' +
    '- **Chuỗi**: Postgres `text` = `varchar` về hiệu năng; đặt `varchar(n)` chỉ khi thật sự cần giới hạn nghiệp vụ. MySYQL: `varchar` (in-row) vs `text` (có thể off-page).\n' +
    '- **Tiền tệ**: `numeric`/`decimal(19,4)` — **không bao giờ `float`/`double`** (0.1 + 0.2 ≠ 0.3). Hoặc lưu số nguyên nhỏ nhất (cents).\n' +
    '- **Thời gian**: `timestamptz` (Postgres) lưu UTC; tránh `timestamp` không tz. `date` cho ngày thuần.',
  essence:
    'Kiểu dữ liệu là ràng buộc + hiệu năng + tính đúng. Bigint cho khoá; decimal (không float) cho tiền; timestamptz cho thời điểm. Chọn hẹp nhất đủ dùng, trừ khoá thì rộng rãi.',
  example:
    'Cột `amount` là `double`: báo cáo tài chính lệch vài xu do lỗi làm tròn nhị phân, kế toán không chấp nhận. Migrate sang `numeric(19,4)`. Cột `id` là `int`, bảng `order_items` đạt 2 tỉ hàng → tràn → downtime để `ALTER` sang bigint.',
  viz: {
    type: 'compare',
    corner: 'Loại dữ liệu',
    cols: ['Nên dùng', 'Tránh'],
    rows: [
      ['Khoá PK / FK', 'bigint', 'int (tràn sau vài năm → ALTER đau)'],
      ['Chuỗi', 'text / varchar(n) khi có giới hạn nghiệp vụ', 'varchar ngắn tuỳ tiện'],
      ['Tiền tệ', 'numeric/decimal(19,4) hoặc cents nguyên', 'float / double (0.1+0.2 ≠ 0.3)'],
      ['Thời điểm', 'timestamptz (lưu UTC)', 'timestamp không tz'],
      ['Ngày thuần', 'date', 'timestamp cho ngày sinh'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Chọn đúng kiểu là tối ưu rẻ nhất",
      code:
        "CREATE TABLE orders (\n" +
        "  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n" +
        "  -- INT hết ở ~2,1 tỉ. Đổi INT sang BIGINT trên bảng lớn ở production\n" +
        "  -- là một cuộc migration đau đớn -> dùng BIGINT ngay từ đầu cho khoá.\n" +
        "\n" +
        "  amount      NUMERIC(18,2) NOT NULL,\n" +
        "  -- TIỀN BẠC: LUÔN dùng NUMERIC/DECIMAL. FLOAT/DOUBLE là nhị phân,\n" +
        "  -- không biểu diễn chính xác 0.1 -> sai số tích luỹ.\n" +
        "  -- Hoặc lưu số nguyên đơn vị nhỏ nhất (đồng, cent) trong BIGINT.\n" +
        "  SELECT 0.1::float + 0.2::float = 0.3::float;   -- false!\n" +
        "\n" +
        "  status      TEXT NOT NULL,\n" +
        "  -- Postgres: TEXT và VARCHAR(n) LƯU GIỐNG HỆT nhau, không khác hiệu năng.\n" +
        "  -- VARCHAR(n) chỉ thêm ràng buộc độ dài (và đổi n sau này cần ALTER).\n" +
        "  -- MySQL thì khác: VARCHAR có giới hạn và ảnh hưởng index/row format.\n" +
        "\n" +
        "  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),\n" +
        "  -- LUÔN timestamptz, KHÔNG dùng timestamp. Lưu UTC, hiển thị theo múi giờ.\n" +
        "\n" +
        "  is_paid     BOOLEAN NOT NULL DEFAULT false,\n" +
        "  metadata    JSONB,               -- JSONB (nhị phân, index được), không JSON\n" +
        "  tags        TEXT[]               -- mảng: tiện, nhưng cân nhắc bảng riêng\n" +
        ");\n" +
        "\n" +
        "-- Kích thước quan trọng hơn tưởng: hàng nhỏ -> nhiều hàng trên một trang\n" +
        "-- -> ít I/O -> nhanh hơn. Thứ tự cột cũng ảnh hưởng (Postgres căn lề):\n" +
        "-- đặt cột 8 byte trước, rồi 4 byte, rồi 1 byte, cuối cùng là kiểu độ dài thay đổi.\n" +
        "SELECT pg_column_size(row(1::bigint, true, \u0027x\u0027::text));",
    },
  ],
},
{
  cat: 'Quan hệ',
  q: 'Many-to-many: bảng nối (junction table) thiết kế thế nào?',
  answer:
    'Quan hệ N–N (`students` ↔ `courses`) cần **bảng nối** chứa cặp khoá:\n' +
    '```\n' +
    'CREATE TABLE enrollments (\n' +
    '  student_id BIGINT REFERENCES students(id),\n' +
    '  course_id  BIGINT REFERENCES courses(id),\n' +
    '  enrolled_at TIMESTAMPTZ DEFAULT now(),\n' +
    '  grade SMALLINT,\n' +
    '  PRIMARY KEY (student_id, course_id)\n' +
    ');\n' +
    'CREATE INDEX ON enrollments (course_id);  -- cho query ngược\n' +
    '```\n' +
    'PK tổ hợp chống trùng cặp; **cần index trên cột thứ hai** (`course_id`) để query "sinh viên của một khoá" nhanh (PK chỉ giúp chiều `student_id` trước).',
  essence:
    'Bảng nối biến N–N thành hai quan hệ 1–N. PK tổ hợp = chống trùng + index cho một chiều; thêm index riêng cho chiều còn lại. Bảng nối cũng là nơi lưu thuộc tính của mối quan hệ.',
  example:
    '`enrollments` với `grade`, `enrolled_at` — thuộc tính "sinh viên X học khoá Y". Query "khoá CS101 có ai": cần `CREATE INDEX ON enrollments (course_id)`, nếu không sẽ full scan bảng nối.',
  viz: {
    type: 'flow',
    title: 'Bảng nối biến N–N thành hai quan hệ 1–N',
    nodes: ['students', 'enrollments\n(student_id, course_id)', 'courses'],
    steps: [
      { to: 0, label: 'students: mỗi sinh viên một hàng' },
      { to: 1, label: 'enrollments: PK (student_id, course_id) chống trùng cặp + lưu grade, enrolled_at' },
      { to: 2, label: 'courses: mỗi khoá một hàng — thêm INDEX (course_id) cho query chiều ngược' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Bảng nối và các quyết định thiết kế",
      code:
        "CREATE TABLE students (id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL);\n" +
        "CREATE TABLE courses  (id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL);\n" +
        "\n" +
        "CREATE TABLE enrollments (\n" +
        "  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,\n" +
        "  course_id  BIGINT NOT NULL REFERENCES courses(id)  ON DELETE RESTRICT,\n" +
        "  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),   -- thuộc tính của QUAN HỆ\n" +
        "  grade      NUMERIC(4,2),\n" +
        "  PRIMARY KEY (student_id, course_id)               -- khoá tổ hợp: chống trùng\n" +
        ");\n" +
        "-- Index cho chiều NGƯỢC LẠI — rất hay bị quên:\n" +
        "CREATE INDEX idx_enrollments_course ON enrollments (course_id);\n" +
        "-- PK (student_id, course_id) chỉ phục vụ truy vấn bắt đầu bằng student_id.\n" +
        "-- Muốn \"khoá học này có ai học\" thì cần index trên course_id.\n" +
        "\n" +
        "-- KHOÁ TỔ HỢP hay ID RIÊNG?\n" +
        "--  Khoá tổ hợp: tự nhiên, chống trùng miễn phí, không cột thừa. Nên mặc định.\n" +
        "--  ID riêng (id BIGSERIAL) + UNIQUE (student_id, course_id): cần khi\n" +
        "--   - bảng nối được bảng KHÁC tham chiếu tới\n" +
        "--   - ORM/framework yêu cầu khoá đơn (một số công cụ cũ)\n" +
        "--   - cho phép nhiều bản ghi cho cùng cặp (ví dụ đăng ký lại nhiều học kỳ)\n" +
        "--     -> khi đó thêm cột semester vào khoá thay vì bỏ ràng buộc.\n" +
        "\n" +
        "-- Truy vấn hai chiều:\n" +
        "SELECT c.title FROM courses c\n" +
        "JOIN enrollments e ON e.course_id = c.id WHERE e.student_id = 1;\n" +
        "SELECT s.name FROM students s\n" +
        "JOIN enrollments e ON e.student_id = s.id WHERE e.course_id = 10;\n" +
        "\n" +
        "-- ON DELETE: CASCADE cho phía \"sở hữu\" (xoá sinh viên -> xoá đăng ký),\n" +
        "-- RESTRICT cho phía tham chiếu (không cho xoá khoá học còn người học).",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Soft delete vs hard delete — đánh đổi và cạm bẫy?',
  answer:
    '**Soft delete**: `deleted_at TIMESTAMPTZ` (hoặc `is_deleted`), hàng vẫn ở lại. Giữ lịch sử, "undo", audit.\n\n' +
    'Cạm bẫy:\n' +
    '- Mọi query phải nhớ `WHERE deleted_at IS NULL` → quên một chỗ là lộ dữ liệu đã xoá.\n' +
    '- Unique constraint: `UNIQUE(email)` chặn tạo lại user với email đã "xoá" → cần **partial unique** `WHERE deleted_at IS NULL`.\n' +
    '- FK: hàng "đã xoá" vẫn được tham chiếu.\n' +
    '- Bảng phình mãi → cần archiving.\n\n' +
    '**Hard delete**: sạch sẽ, đơn giản, nhưng mất dữ liệu (cần backup/audit log riêng nếu cần khôi phục).',
  essence:
    'Soft delete = "ẩn thay vì xoá" — mạnh cho audit/undo nhưng nhiễm mọi query và constraint. Dùng view hoặc row-level security để không quên filter; partial unique index để tránh xung đột.',
  example:
    'Tạo view `active_users AS SELECT * FROM users WHERE deleted_at IS NULL` và code chỉ query view. Unique: `CREATE UNIQUE INDEX ON users (lower(email)) WHERE deleted_at IS NULL` → user xoá rồi đăng ký lại bằng email cũ được.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Soft delete', 'Hard delete'],
    rows: [
      ['Lịch sử / undo / audit', 'giữ được', 'mất (cần backup/log riêng)'],
      ['Query', 'phải nhớ WHERE deleted_at IS NULL mọi nơi', 'đơn giản'],
      ['Unique constraint', 'cần partial unique WHERE deleted_at IS NULL', 'không vướng'],
      ['FK', 'hàng "đã xoá" vẫn được tham chiếu', 'sạch'],
      ['Kích thước bảng', 'phình mãi → cần archiving', 'ổn định'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Xoá mềm tiện, nhưng lan ra toàn hệ thống",
      code:
        "ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;\n" +
        "UPDATE users SET deleted_at = now() WHERE id = 1;      -- soft delete\n" +
        "-- Dùng timestamp thay vì boolean is_deleted: biết luôn XOÁ KHI NÀO.\n" +
        "\n" +
        "-- BỐN CẠM BẪY:\n" +
        "-- 1) MỌI truy vấn phải nhớ lọc — quên MỘT chỗ là lộ dữ liệu đã xoá\n" +
        "SELECT * FROM users WHERE deleted_at IS NULL;\n" +
        "-- -> Dùng VIEW để không phải nhớ:\n" +
        "CREATE VIEW active_users AS SELECT * FROM users WHERE deleted_at IS NULL;\n" +
        "-- Hoặc Row Level Security, hoặc @Where của Hibernate.\n" +
        "\n" +
        "-- 2) UNIQUE constraint VỠ: xoá user email a@x.com rồi đăng ký lại -> trùng\n" +
        "CREATE UNIQUE INDEX uq_users_email_active ON users (email)\n" +
        "WHERE deleted_at IS NULL;                    -- partial unique index: giải pháp đúng\n" +
        "\n" +
        "-- 3) KHOÁ NGOẠI: hàng \"đã xoá\" vẫn tồn tại nên FK vẫn hợp lệ -> bảng con\n" +
        "--    vẫn trỏ tới bản ghi đã xoá. Phải tự xử lý ở tầng ứng dụng.\n" +
        "\n" +
        "-- 4) BẢNG PHÌNH: dữ liệu xoá tích tụ mãi -> index lớn, truy vấn chậm dần.\n" +
        "--    -> job định kỳ chuyển sang bảng lưu trữ:\n" +
        "INSERT INTO users_archive SELECT * FROM users\n" +
        "WHERE deleted_at < now() - INTERVAL \u00271 year\u0027;\n" +
        "DELETE FROM users WHERE deleted_at < now() - INTERVAL \u00271 year\u0027;\n" +
        "\n" +
        "-- KHI NÀO DÙNG SOFT DELETE: cần khôi phục, cần audit trail, có ràng buộc\n" +
        "-- pháp lý về lưu trữ, hoặc dữ liệu được nhiều nơi tham chiếu.\n" +
        "-- KHI NÀO HARD DELETE: yêu cầu quyền riêng tư (GDPR \"quyền được quên\"),\n" +
        "-- dữ liệu tạm/log, hoặc bảng có khối lượng ghi rất lớn.\n" +
        "-- KẾT HỢP: soft delete ngắn hạn (30 ngày) rồi hard delete thật.",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Lưu enum: cột enum, lookup table, hay check constraint?',
  answer:
    '- **Native ENUM** (Postgres `CREATE TYPE`, MySQL `ENUM`): gọn, ràng buộc chặt, nhưng **thêm/xoá giá trị cần ALTER** (MySQL rebuild bảng; Postgres `ADD VALUE` không xoá được), không lưu metadata (label, thứ tự, active).\n' +
    '- **CHECK constraint** trên `varchar`: `CHECK (status IN (\'DRAFT\', \'PUBLISHED\', \'ARCHIVED\'))` — linh hoạt hơn ENUM, dễ đọc, nhưng đổi vẫn cần ALTER constraint.\n' +
    '- **Lookup table** + FK: `statuses(code, label, sort_order, is_active)`. Thêm giá trị = INSERT (không ALTER), lưu được metadata, join để hiển thị. Nhược: thêm một JOIN.',
  essence:
    'Tập giá trị **cố định, ít đổi** (giới tính, boolean-like) → ENUM/CHECK. Tập **có thể mở rộng, cần metadata/quản trị** (loại sản phẩm, trạng thái workflow) → lookup table + FK.',
  example:
    '`order_status` thay đổi theo nghiệp vụ (thêm "REFUND_PENDING", "PARTIALLY_SHIPPED"): lookup table `order_statuses` → thêm trạng thái mới bằng INSERT + deploy code, không downtime ALTER. `gender` (M/F/X/null): CHECK constraint là đủ.',
  viz: {
    type: 'compare',
    corner: 'Tiêu chí',
    cols: ['Native ENUM', 'CHECK constraint', 'Lookup table + FK'],
    rows: [
      ['Thêm / xoá giá trị', 'ALTER (MySQL rebuild; PG không xoá được)', 'ALTER constraint', 'INSERT — không ALTER'],
      ['Lưu metadata (label, thứ tự, active)', 'không', 'không', 'có'],
      ['Chi phí đọc', 'không JOIN', 'không JOIN', 'thêm một JOIN'],
      ['Hợp với', 'tập cố định (giới tính)', 'tập ít đổi, cần dễ đọc', 'tập mở rộng, cần quản trị'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ba cách, ba mức linh hoạt",
      code:
        "-- CÁCH 1: CHECK CONSTRAINT — đơn giản nhất, đủ cho tập giá trị ỔN ĐỊNH\n" +
        "CREATE TABLE orders (\n" +
        "  id     BIGSERIAL PRIMARY KEY,\n" +
        "  status TEXT NOT NULL CHECK (status IN (\u0027NEW\u0027,\u0027PAID\u0027,\u0027SHIPPED\u0027,\u0027CANCELLED\u0027))\n" +
        ");\n" +
        "ALTER TABLE orders DROP CONSTRAINT orders_status_check;\n" +
        "ALTER TABLE orders ADD CONSTRAINT orders_status_check\n" +
        "  CHECK (status IN (\u0027NEW\u0027,\u0027PAID\u0027,\u0027SHIPPED\u0027,\u0027CANCELLED\u0027,\u0027REFUNDED\u0027)) NOT VALID;\n" +
        "ALTER TABLE orders VALIDATE CONSTRAINT orders_status_check;   -- không khoá lâu\n" +
        "-- + dễ đọc, dễ đổi, giá trị hiện nguyên văn trong truy vấn\n" +
        "-- - không kèm được metadata (nhãn hiển thị, thứ tự, màu)\n" +
        "\n" +
        "-- CÁCH 2: KIỂU ENUM (Postgres)\n" +
        "CREATE TYPE order_status AS ENUM (\u0027NEW\u0027,\u0027PAID\u0027,\u0027SHIPPED\u0027,\u0027CANCELLED\u0027);\n" +
        "CREATE TABLE orders (id BIGSERIAL PRIMARY KEY, status order_status NOT NULL);\n" +
        "ALTER TYPE order_status ADD VALUE \u0027REFUNDED\u0027;       -- chỉ THÊM được\n" +
        "-- + tiết kiệm (4 byte), có THỨ TỰ tự nhiên để sắp xếp\n" +
        "-- - XOÁ hoặc ĐỔI TÊN giá trị rất khó (phải tạo type mới và chuyển cột)\n" +
        "-- - ADD VALUE không chạy được trong transaction ở Postgres cũ\n" +
        "\n" +
        "-- CÁCH 3: LOOKUP TABLE — linh hoạt nhất\n" +
        "CREATE TABLE order_statuses (\n" +
        "  code       TEXT PRIMARY KEY,\n" +
        "  label_vi   TEXT NOT NULL,\n" +
        "  sort_order INT  NOT NULL,\n" +
        "  is_final   BOOLEAN NOT NULL DEFAULT false\n" +
        ");\n" +
        "ALTER TABLE orders ADD CONSTRAINT fk_status\n" +
        "  FOREIGN KEY (status) REFERENCES order_statuses(code);\n" +
        "-- + thêm giá trị mới KHÔNG cần migration, kèm được metadata,\n" +
        "--   người vận hành tự quản lý được\n" +
        "-- - thêm một join khi cần nhãn\n" +
        "\n" +
        "-- CHỌN: tập giá trị gắn với LOGIC CODE (switch/case) và ít đổi -> CHECK.\n" +
        "-- Tập giá trị do NGƯỜI DÙNG quản lý, có metadata -> LOOKUP TABLE.\n" +
        "-- Enum type: cân nhắc kỹ vì khó sửa về sau.",
    },
  ],
},
{
  cat: 'JSON',
  q: 'Lưu JSON (JSONB) trong SQL — khi nào nên và cạm bẫy?',
  answer:
    'JSONB (Postgres) / JSON (MySQL) lưu document bán cấu trúc, query được (`->`, `->>`, `@>`, `jsonb_path_query`), index được (GIN).\n\n' +
    'Nên dùng cho: thuộc tính **thưa/thay đổi theo loại** (product attributes khác nhau mỗi category), payload webhook/event, config, dữ liệu từ API bên thứ ba.\n\n' +
    'Cạm bẫy:\n' +
    '- **Không có schema** → dữ liệu rác len vào, khó validate (dùng CHECK / JSON Schema).\n' +
    '- Query field trong JSON chậm hơn cột thật; cần GIN index hoặc expression index.\n' +
    '- Không FK vào giá trị bên trong JSON.\n' +
    '- Update một field = rewrite cả document (bloat).\n' +
    '- Lạm dụng → "database trong database", mất lợi ích của quan hệ.',
  essence:
    'JSONB cho phần dữ liệu **thực sự không có schema cố định**. Cái gì bạn query/join/constrain thường xuyên thì phải là **cột thật**. Đừng nhét cả entity vào một cột jsonb.',
  example:
    'Sản phẩm: `id, name, price, category_id` là cột thật (index, FK, aggregate); `attributes jsonb` chứa `{"ram": "16GB", "color": "black"}` khác nhau mỗi loại. `CREATE INDEX ON products USING gin (attributes)` cho `WHERE attributes @> \'{"color":"black"}\'`.',
  viz: {
    type: 'tree',
    title: 'JSONB cho phần thực sự không có schema cố định',
    root: {
      label: 'JSONB / JSON: document bán cấu trúc, query & index (GIN) được',
      children: [
        { label: 'Nên dùng', note: 'thuộc tính thưa/khác theo loại, payload webhook/event, config, dữ liệu API bên thứ ba' },
        { label: 'Cạm bẫy: không schema', note: 'dữ liệu rác len vào — cần CHECK / JSON Schema' },
        { label: 'Cạm bẫy: query chậm', note: 'field trong JSON chậm hơn cột thật; cần GIN / expression index' },
        { label: 'Cạm bẫy: không FK, update = rewrite cả document', note: 'bloat; cái gì query/join/constrain thường xuyên → phải là cột thật' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Linh hoạt có kiểm soát",
      code:
        "CREATE TABLE events (\n" +
        "  id         BIGSERIAL PRIMARY KEY,\n" +
        "  type       TEXT NOT NULL,                  -- cột THẬT cho thứ luôn cần truy vấn\n" +
        "  user_id    BIGINT NOT NULL,\n" +
        "  payload    JSONB NOT NULL,                 -- phần thay đổi theo loại sự kiện\n" +
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "-- JSONB (nhị phân, đã phân tích, index được) chứ KHÔNG dùng JSON (chỉ là text).\n" +
        "\n" +
        "-- TRUY VẤN\n" +
        "SELECT payload->>\u0027browser\u0027 FROM events WHERE payload @> \u0027{\"os\":\"iOS\"}\u0027;\n" +
        "SELECT payload->\u0027items\u0027->0->>\u0027sku\u0027 FROM events;\n" +
        "SELECT * FROM events WHERE payload ? \u0027coupon\u0027;           -- có khoá này không\n" +
        "SELECT * FROM events WHERE (payload->>\u0027amount\u0027)::numeric > 100;\n" +
        "\n" +
        "-- INDEX\n" +
        "CREATE INDEX idx_events_payload ON events USING GIN (payload);          -- mọi khoá\n" +
        "CREATE INDEX idx_events_payload_path ON events USING GIN (payload jsonb_path_ops);\n" +
        "CREATE INDEX idx_events_os ON events ((payload->>\u0027os\u0027));                -- một trường\n" +
        "\n" +
        "-- KHI NÀO NÊN:\n" +
        "--  - dữ liệu THỰC SỰ không có cấu trúc cố định (payload webhook, log, cấu hình)\n" +
        "--  - thuộc tính thưa thớt, mỗi loại một tập khác nhau\n" +
        "--  - lưu bản gốc từ API bên ngoài để đối chiếu\n" +
        "\n" +
        "-- CẠM BẪY:\n" +
        "--  1) KHÔNG có ràng buộc kiểu — dữ liệu rác lọt vào lúc nào không biết.\n" +
        "--     Bù bằng CHECK: CHECK (jsonb_typeof(payload->\u0027amount\u0027) = \u0027number\u0027)\n" +
        "--  2) Truy vấn và index kém hiệu quả hơn cột thật rõ rệt.\n" +
        "--  3) Cập nhật MỘT trường phải ghi lại TOÀN BỘ document -> bloat.\n" +
        "--  4) Không có FK, không join tự nhiên, khó thống kê.\n" +
        "--  5) Trường được truy vấn thường xuyên mà để trong JSON là sai thiết kế.\n" +
        "\n" +
        "-- QUY TẮC: cái gì bạn LỌC/SẮP XẾP/JOIN theo -> CỘT THẬT.\n" +
        "-- Cái gì chỉ đọc ra rồi hiển thị -> JSONB.",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Audit columns và temporal/history table?',
  answer:
    '- **Audit columns cơ bản**: `created_at`, `updated_at` (trigger `BEFORE UPDATE` set `now()`), `created_by`, `updated_by`.\n' +
    '- **History table**: bảng `_history` song song, trigger ghi bản cũ mỗi khi UPDATE/DELETE — trả lời "hàng này trông thế nào lúc T".\n' +
    '- **System-versioned temporal tables** (SQL Server, MariaDB, chuẩn SQL:2011): DB tự quản history, query `FOR SYSTEM_TIME AS OF ...`.\n' +
    '- **Postgres**: extension như `temporal_tables`, hoặc audit qua trigger, hoặc CDC (Debezium) sang event store.',
  essence:
    'Audit columns cho "khi nào / ai" ở mức tối thiểu. History/temporal table cho "trạng thái tại một thời điểm quá khứ" — cần cho compliance, điều tra, hoặc UI "xem lịch sử thay đổi".',
  example:
    'Hồ sơ bệnh nhân cần audit đầy đủ: trigger ghi mọi thay đổi vào `patient_records_history` (bản cũ + `valid_from`, `valid_to`, `changed_by`). "Đơn thuốc ngày 3/6 là gì?" → query history table `WHERE \'2024-06-03\' BETWEEN valid_from AND valid_to`.',
  viz: {
    type: 'layers',
    title: 'Từ "khi nào/ai" đến "trạng thái tại thời điểm quá khứ"',
    dir: 'up',
    layers: [
      { name: 'Audit columns', tag: 'tối thiểu', note: 'created_at/updated_at (trigger BEFORE UPDATE), created_by/updated_by' },
      { name: 'History table', tag: '_history', note: 'trigger ghi bản cũ mỗi UPDATE/DELETE → "hàng này trông thế nào lúc T"' },
      { name: 'System-versioned temporal', tag: 'SQL:2011', note: 'DB tự quản history, query FOR SYSTEM_TIME AS OF … (SQL Server, MariaDB)' },
      { name: 'CDC → event store', tag: 'Debezium', note: 'Postgres: extension temporal_tables, hoặc audit qua trigger, hoặc CDC' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ai đổi gì, khi nào",
      code:
        "-- MỨC 1: audit column — rẻ, đủ cho phần lớn trường hợp\n" +
        "ALTER TABLE orders\n" +
        "  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n" +
        "  ADD COLUMN created_by BIGINT,\n" +
        "  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n" +
        "  ADD COLUMN updated_by BIGINT;\n" +
        "\n" +
        "CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$\n" +
        "BEGIN\n" +
        "  NEW.updated_at = now();\n" +
        "  RETURN NEW;\n" +
        "END; $$ LANGUAGE plpgsql;\n" +
        "CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON orders\n" +
        "FOR EACH ROW EXECUTE FUNCTION touch_updated_at();\n" +
        "-- Đặt ở TRIGGER chứ không ở ứng dụng: mọi đường ghi đều được áp dụng,\n" +
        "-- kể cả migration và sửa tay.\n" +
        "\n" +
        "-- MỨC 2: HISTORY TABLE — giữ TOÀN BỘ lịch sử thay đổi\n" +
        "CREATE TABLE orders_history (\n" +
        "  history_id BIGSERIAL PRIMARY KEY,\n" +
        "  order_id   BIGINT NOT NULL,\n" +
        "  data       JSONB NOT NULL,        -- ảnh chụp toàn bộ hàng\n" +
        "  operation  TEXT NOT NULL,         -- INSERT / UPDATE / DELETE\n" +
        "  changed_by BIGINT,\n" +
        "  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "CREATE OR REPLACE FUNCTION log_order_change() RETURNS TRIGGER AS $$\n" +
        "BEGIN\n" +
        "  INSERT INTO orders_history (order_id, data, operation, changed_at)\n" +
        "  VALUES (COALESCE(NEW.id, OLD.id), to_jsonb(COALESCE(NEW, OLD)), TG_OP, now());\n" +
        "  RETURN COALESCE(NEW, OLD);\n" +
        "END; $$ LANGUAGE plpgsql;\n" +
        "CREATE TRIGGER trg_orders_history AFTER INSERT OR UPDATE OR DELETE ON orders\n" +
        "FOR EACH ROW EXECUTE FUNCTION log_order_change();\n" +
        "\n" +
        "-- MỨC 3: TEMPORAL TABLE (SQL:2011) — truy vấn \"dữ liệu tại thời điểm X\"\n" +
        "ALTER TABLE orders ADD COLUMN valid_from TIMESTAMPTZ NOT NULL DEFAULT now();\n" +
        "ALTER TABLE orders ADD COLUMN valid_to   TIMESTAMPTZ;\n" +
        "-- Hàng hiện hành có valid_to IS NULL; cập nhật = đóng hàng cũ + chèn hàng mới.\n" +
        "\n" +
        "-- CÂN NHẮC: history table phình rất nhanh -> partition theo tháng và có\n" +
        "-- chính sách lưu trữ. Cần audit nghiêm túc -> cân nhắc CDC (Debezium)\n" +
        "-- thay vì trigger (không ảnh hưởng hiệu năng ghi).",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Polymorphic association (một cột trỏ tới nhiều bảng) — các cách làm?',
  answer:
    'Ví dụ: `comments` có thể thuộc `posts`, `photos`, hoặc `videos`.\n\n' +
    '- **Cách Rails** (`commentable_type`, `commentable_id`): một cặp cột. Đơn giản nhưng **không FK được** → mất referential integrity, cần index tổ hợp.\n' +
    '- **Nhiều cột FK nullable** (`post_id`, `photo_id`, `video_id`, CHECK "đúng một cái not null"): giữ được FK, nhưng thêm cột mỗi khi có loại mới.\n' +
    '- **Bảng cha chung** (`commentables` với các bảng con `posts`/... trỏ vào nó qua FK): "class table inheritance". Đúng đắn nhất nhưng phức tạp.\n' +
    '- **Bảng nối riêng cho mỗi loại** (`post_comments`, `photo_comments`).',
  essence:
    'Polymorphic FK "kiểu + id" tiện nhưng hy sinh integrity. Nếu tính toàn vẹn quan trọng: nhiều cột FK nullable + CHECK, hoặc bảng cha chung. Chọn theo số loại và mức độ cần FK.',
  example:
    'Ít loại (post/photo), cần FK: `comments (post_id BIGINT NULL REFERENCES posts, photo_id BIGINT NULL REFERENCES photos, CHECK ((post_id IS NOT NULL)::int + (photo_id IS NOT NULL)::int = 1))`. Nhiều loại, tích hợp nhanh: kiểu Rails + chấp nhận rủi ro, kèm job kiểm tra tính nhất quán.',
  viz: {
    type: 'compare',
    corner: 'Cách làm',
    cols: ['FK integrity', 'Thêm loại mới', 'Độ phức tạp'],
    rows: [
      ['Kiểu Rails (type + id)', 'không FK được', 'không đổi schema', 'thấp'],
      ['Nhiều cột FK nullable + CHECK', 'giữ được FK', 'thêm cột mỗi loại', 'trung bình'],
      ['Bảng cha chung (class table)', 'đầy đủ', 'thêm bảng con', 'cao'],
      ['Bảng nối riêng mỗi loại', 'đầy đủ', 'thêm bảng nối', 'trung bình'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Một cột trỏ tới nhiều bảng",
      code:
        "-- BÀI TOÁN: comment có thể thuộc về post, photo, hoặc video.\n" +
        "\n" +
        "-- CÁCH 1: hai cột (type + id) — kiểu Rails. ĐƠN GIẢN nhưng KHÔNG có FK.\n" +
        "CREATE TABLE comments (\n" +
        "  id BIGSERIAL PRIMARY KEY,\n" +
        "  commentable_type TEXT NOT NULL,     -- \u0027post\u0027 | \u0027photo\u0027 | \u0027video\u0027\n" +
        "  commentable_id   BIGINT NOT NULL,\n" +
        "  body TEXT NOT NULL\n" +
        ");\n" +
        "CREATE INDEX idx_comments_target ON comments (commentable_type, commentable_id);\n" +
        "-- - KHÔNG có toàn vẹn tham chiếu: xoá post là comment thành mồ côi.\n" +
        "-- - Không join tự nhiên được, phải xử lý ở ứng dụng.\n" +
        "\n" +
        "-- CÁCH 2: NHIỀU CỘT FK, mỗi loại một cột — GIỮ ĐƯỢC FK\n" +
        "CREATE TABLE comments (\n" +
        "  id BIGSERIAL PRIMARY KEY,\n" +
        "  post_id  BIGINT REFERENCES posts(id)  ON DELETE CASCADE,\n" +
        "  photo_id BIGINT REFERENCES photos(id) ON DELETE CASCADE,\n" +
        "  video_id BIGINT REFERENCES videos(id) ON DELETE CASCADE,\n" +
        "  body TEXT NOT NULL,\n" +
        "  CHECK (num_nonnulls(post_id, photo_id, video_id) = 1)   -- đúng MỘT cột có giá trị\n" +
        ");\n" +
        "-- + toàn vẹn đầy đủ, cascade hoạt động\n" +
        "-- - thêm loại mới phải ALTER TABLE; nhiều cột NULL\n" +
        "\n" +
        "-- CÁCH 3: BẢNG NỐI RIÊNG cho từng loại — sạch nhất về mặt quan hệ\n" +
        "CREATE TABLE comments (id BIGSERIAL PRIMARY KEY, body TEXT NOT NULL);\n" +
        "CREATE TABLE post_comments (\n" +
        "  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,\n" +
        "  comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,\n" +
        "  PRIMARY KEY (post_id, comment_id)\n" +
        ");\n" +
        "-- + toàn vẹn hoàn hảo. - nhiều bảng, truy vấn \"mọi comment\" phải UNION.\n" +
        "\n" +
        "-- CÁCH 4: BẢNG CHA CHUNG (class table inheritance)\n" +
        "CREATE TABLE commentables (id BIGSERIAL PRIMARY KEY, kind TEXT NOT NULL);\n" +
        "-- posts/photos/videos đều REFERENCES commentables(id); comment trỏ vào bảng cha.\n" +
        "-- + FK đầy đủ VÀ chỉ một cột. - thêm một tầng gián tiếp.\n" +
        "\n" +
        "-- CHỌN: dưới 3-4 loại và cần toàn vẹn -> CÁCH 2. Nhiều loại, chấp nhận\n" +
        "-- kiểm tra ở ứng dụng -> CÁCH 1. Hệ thống nghiêm ngặt -> CÁCH 4.",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'EAV (Entity-Attribute-Value) — ưu nhược điểm?',
  answer:
    'EAV: thay vì cột cho mỗi thuộc tính, có bảng `attributes (entity_id, attribute_name, value)` — mỗi thuộc tính là một hàng.\n\n' +
    '**Ưu**: thêm thuộc tính không cần ALTER, xử lý được entity có hàng nghìn thuộc tính tuỳ biến (medical, catalog cực đa dạng).\n\n' +
    '**Nhược** (nghiêm trọng):\n' +
    '- Query "lấy entity với 5 thuộc tính" cần 5 self-join hoặc pivot → chậm, khó viết.\n' +
    '- Không kiểu dữ liệu (value là text), không constraint, không FK.\n' +
    '- Optimizer "mù" (không có stats theo attribute).\n' +
    '- Thường là dấu hiệu "dùng sai công cụ".',
  essence:
    'EAV đổi tính linh hoạt schema lấy gần như mọi lợi ích của RDBMS (kiểu, constraint, query đơn giản, hiệu năng). Ngày nay **JSONB thường tốt hơn EAV** cho cùng nhu cầu.',
  example:
    'Catalog cần thuộc tính tuỳ biến mỗi category: thay vì EAV (`product_attributes` bảng 200M hàng, query khủng khiếp), dùng cột `attributes jsonb` + GIN index. Nếu buộc dùng SQL thuần cho product configurator siêu phức tạp → cân nhắc document DB.',
  viz: {
    type: 'compare',
    corner: 'Tiêu chí',
    cols: ['EAV', 'JSONB', 'Cột thật'],
    rows: [
      ['Thêm thuộc tính', 'INSERT (không ALTER)', 'set key (không ALTER)', 'ALTER'],
      ['Kiểu & constraint', 'không (value là text)', 'một phần (CHECK)', 'đầy đủ'],
      ['Lấy entity với 5 thuộc tính', '5 self-join / pivot', '1 truy vấn', '1 truy vấn'],
      ['Optimizer stats', 'mù', 'hạn chế', 'đầy đủ'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Linh hoạt tối đa, đánh đổi tối đa",
      code:
        "CREATE TABLE entity_attributes (\n" +
        "  entity_id BIGINT NOT NULL,\n" +
        "  attribute TEXT   NOT NULL,\n" +
        "  value     TEXT,\n" +
        "  PRIMARY KEY (entity_id, attribute)\n" +
        ");\n" +
        "INSERT INTO entity_attributes VALUES\n" +
        "  (1, \u0027color\u0027, \u0027đỏ\u0027), (1, \u0027size\u0027, \u0027XL\u0027), (1, \u0027weight\u0027, \u0027500\u0027);\n" +
        "\n" +
        "-- Lấy lại thành \"hàng\" phải PIVOT — dài dòng và chậm:\n" +
        "SELECT entity_id,\n" +
        "  MAX(value) FILTER (WHERE attribute = \u0027color\u0027)  AS color,\n" +
        "  MAX(value) FILTER (WHERE attribute = \u0027size\u0027)   AS size,\n" +
        "  MAX(value) FILTER (WHERE attribute = \u0027weight\u0027) AS weight\n" +
        "FROM entity_attributes GROUP BY entity_id;\n" +
        "\n" +
        "-- NHƯỢC ĐIỂM (nghiêm trọng):\n" +
        "--  1) MẤT KIỂU DỮ LIỆU: mọi thứ là TEXT -> không so sánh số/ngày đúng được\n" +
        "--     WHERE value > \u0027100\u0027 so sánh CHUỖI, \u00279\u0027 > \u0027100\u0027 là true.\n" +
        "--  2) MẤT RÀNG BUỘC: không NOT NULL, không CHECK, không FK cho từng thuộc tính.\n" +
        "--  3) Truy vấn nhiều thuộc tính -> nhiều self-join -> rất chậm.\n" +
        "--  4) Optimizer không ước lượng nổi -> plan tệ.\n" +
        "--  5) Không index hiệu quả được theo thuộc tính cụ thể.\n" +
        "\n" +
        "-- KHI NÀO CHẤP NHẬN ĐƯỢC: thuộc tính do NGƯỜI DÙNG tự định nghĩa lúc chạy\n" +
        "-- (form builder, CMS custom field), và KHÔNG cần truy vấn/lọc theo chúng.\n" +
        "\n" +
        "-- THAY THẾ TỐT HƠN gần như mọi lúc: JSONB\n" +
        "ALTER TABLE products ADD COLUMN attributes JSONB;\n" +
        "CREATE INDEX idx_products_attrs ON products USING GIN (attributes);\n" +
        "SELECT * FROM products WHERE attributes @> \u0027{\"color\":\"đỏ\"}\u0027;\n" +
        "-- Giữ được linh hoạt, mà vẫn có index, vẫn giữ kiểu dữ liệu trong JSON,\n" +
        "-- và truy vấn ngắn gọn hơn nhiều.",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Constraint (CHECK, NOT NULL, UNIQUE, FK) như "hàng rào toàn vẹn" — vì sao quan trọng?',
  answer:
    'Constraint đảm bảo dữ liệu **luôn hợp lệ** ở tầng DB, bất kể ứng dụng nào ghi (app chính, migration, script thủ công, job, DBA).\n\n' +
    '- Application validation có thể bị **bỏ qua** (bug, đường ghi khác, race condition).\n' +
    '- Constraint là "single source of truth" cho quy tắc dữ liệu → không thể tạo hàng vi phạm.\n' +
    '- Bắt lỗi **sớm** (lúc INSERT) thay vì phát hiện dữ liệu bẩn nhiều tháng sau.\n\n' +
    'Ví dụ: `CHECK (price >= 0)`, `CHECK (end_date > start_date)`, `UNIQUE(order_id, line_no)`, `FK ON DELETE RESTRICT`.',
  essence:
    'Validation ở app là UX (báo lỗi đẹp); constraint ở DB là tính đúng đắn (không thể vi phạm). Làm cả hai, nhưng constraint là lớp không được thiếu — nó là hợp đồng cuối cùng.',
  example:
    'Không có `CHECK (quantity > 0)`: một bug trong bulk import ghi `quantity = -3` → báo cáo tồn kho sai, phát hiện sau 2 tháng, không biết dòng nào bị ảnh hưởng. Có constraint: import fail ngay dòng đó, sửa ngay.',
  viz: {
    type: 'flow',
    title: 'Constraint bắt lỗi sớm — lúc INSERT, không phải nhiều tháng sau',
    nodes: ['INSERT / UPDATE', 'NOT NULL', 'CHECK', 'UNIQUE', 'FK', 'hàng hợp lệ'],
    steps: [
      { to: 1, label: 'NOT NULL: cột bắt buộc phải có giá trị' },
      { to: 2, label: 'CHECK: price ≥ 0, end_date > start_date' },
      { to: 3, label: 'UNIQUE: (order_id, line_no) không trùng' },
      { to: 4, label: 'FK ON DELETE RESTRICT: tham chiếu phải tồn tại' },
      { to: 5, label: 'qua hết → hàng vào bảng; vi phạm bất kỳ → INSERT fail ngay' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Database là tuyến phòng thủ cuối cùng",
      code:
        "CREATE TABLE orders (\n" +
        "  id          BIGSERIAL PRIMARY KEY,\n" +
        "  customer_id BIGINT NOT NULL REFERENCES customers(id),\n" +
        "  status      TEXT NOT NULL CHECK (status IN (\u0027NEW\u0027,\u0027PAID\u0027,\u0027CANCELLED\u0027)),\n" +
        "  amount      NUMERIC(18,2) NOT NULL CHECK (amount >= 0),\n" +
        "  discount    NUMERIC(18,2) NOT NULL DEFAULT 0\n" +
        "              CHECK (discount >= 0 AND discount <= amount),   -- ràng buộc GIỮA CÁC CỘT\n" +
        "  email       TEXT NOT NULL,\n" +
        "  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),\n" +
        "  CONSTRAINT uq_customer_email UNIQUE (customer_id, email)\n" +
        ");\n" +
        "\n" +
        "-- VÌ SAO KHÔNG CHỈ KIỂM TRA Ở ỨNG DỤNG:\n" +
        "-- 1) NHIỀU ĐƯỜNG GHI: API, job nền, script migration, sửa tay trên console,\n" +
        "--    dịch vụ khác dùng chung DB. Chỉ constraint mới bao được TẤT CẢ.\n" +
        "-- 2) RACE CONDITION: kiểm tra ở ứng dụng rồi mới ghi -> có khe hở. UNIQUE\n" +
        "--    constraint là NGUYÊN TỬ.\n" +
        "-- 3) BUG TRONG CODE là chuyện chắc chắn xảy ra. Constraint biến \"dữ liệu\n" +
        "--    hỏng âm thầm\" thành \"lỗi ồn ào ngay lập tức\" — rẻ hơn nhiều để sửa.\n" +
        "-- 4) Constraint là TÀI LIỆU sống về quy tắc nghiệp vụ.\n" +
        "-- 5) Optimizer DÙNG constraint để tối ưu (NOT NULL, UNIQUE, CHECK).\n" +
        "\n" +
        "-- THÊM CONSTRAINT VÀO BẢNG LỚN mà không khoá lâu:\n" +
        "ALTER TABLE orders ADD CONSTRAINT chk_amount CHECK (amount >= 0) NOT VALID;\n" +
        "ALTER TABLE orders VALIDATE CONSTRAINT chk_amount;   -- quét nền, khoá nhẹ hơn\n" +
        "\n" +
        "-- EXCLUSION CONSTRAINT (Postgres) — chống chồng lấn khoảng thời gian:\n" +
        "CREATE EXTENSION btree_gist;\n" +
        "ALTER TABLE bookings ADD CONSTRAINT no_overlap\n" +
        "  EXCLUDE USING GIST (room_id WITH =, during WITH &&);\n" +
        "-- Không thể làm điều này ở tầng ứng dụng mà không có race condition.",
    },
  ],
},
{
  cat: 'Phân vùng',
  q: 'Partitioning (range/list/hash) — khi nào dùng và lợi ích?',
  answer:
    'Chia một bảng logic thành nhiều **partition** vật lý theo một khoá:\n' +
    '- **Range**: theo khoảng (`created_at` theo tháng) — phổ biến nhất cho time-series.\n' +
    '- **List**: theo tập giá trị (`region IN (...)`).\n' +
    '- **Hash**: rải đều theo hash(khoá) — cân bằng khi không có khoá tự nhiên.\n\n' +
    'Lợi ích:\n' +
    '- **Partition pruning**: query lọc theo khoá partition chỉ quét partition liên quan.\n' +
    '- **Bảo trì**: `DROP PARTITION` cho dữ liệu cũ (tức thì, thay vì `DELETE` hàng triệu hàng + vacuum).\n' +
    '- Index nhỏ hơn mỗi partition, autovacuum song song.',
  essence:
    'Partitioning giúp khi bảng **rất lớn** và có một trục truy vấn/bảo trì tự nhiên (thời gian). Giá trị lớn nhất thường là "xoá dữ liệu cũ bằng DROP PARTITION" chứ không phải tốc độ query.',
  example:
    'Bảng `events` 2 tỉ hàng, giữ 90 ngày: partition RANGE theo tuần. Cron mỗi tuần: `CREATE` partition tuần tới, `DROP` partition > 90 ngày (mili giây). Query "events tuần này" chỉ chạm 1 partition. Không partition: `DELETE WHERE created_at < ...` mỗi đêm gây bloat + lock.',
  viz: {
    type: 'tree',
    title: 'Giá trị lớn nhất thường là DROP PARTITION, không phải tốc độ query',
    root: {
      label: 'Chia một bảng logic thành nhiều partition vật lý theo khoá',
      children: [
        { label: 'Range', note: 'theo khoảng (created_at theo tháng) — phổ biến nhất cho time-series' },
        { label: 'List', note: 'theo tập giá trị (region IN (...))' },
        { label: 'Hash', note: 'rải đều theo hash(khoá) khi không có khoá tự nhiên' },
        { label: 'Lợi ích', note: 'partition pruning; DROP PARTITION cho dữ liệu cũ (tức thì); index nhỏ hơn, autovacuum song song' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Chia bảng lớn thành nhiều phần vật lý",
      code:
        "-- RANGE — phổ biến nhất, chia theo thời gian\n" +
        "CREATE TABLE events (\n" +
        "  id BIGSERIAL, created_at TIMESTAMPTZ NOT NULL, data JSONB\n" +
        ") PARTITION BY RANGE (created_at);\n" +
        "\n" +
        "CREATE TABLE events_2026_09 PARTITION OF events\n" +
        "  FOR VALUES FROM (\u00272026-09-01\u0027) TO (\u00272026-10-01\u0027);\n" +
        "CREATE TABLE events_2026_10 PARTITION OF events\n" +
        "  FOR VALUES FROM (\u00272026-10-01\u0027) TO (\u00272026-11-01\u0027);\n" +
        "\n" +
        "-- LIST — chia theo giá trị rời rạc (tenant, khu vực)\n" +
        "CREATE TABLE orders (id BIGINT, region TEXT) PARTITION BY LIST (region);\n" +
        "CREATE TABLE orders_north PARTITION OF orders FOR VALUES IN (\u0027BAC\u0027,\u0027TRUNG\u0027);\n" +
        "\n" +
        "-- HASH — chia đều khi không có tiêu chí tự nhiên\n" +
        "CREATE TABLE users (id BIGINT) PARTITION BY HASH (id);\n" +
        "CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);\n" +
        "\n" +
        "-- LỢI ÍCH:\n" +
        "-- 1) PARTITION PRUNING: truy vấn có điều kiện trên khoá phân vùng chỉ quét\n" +
        "--    đúng phân vùng liên quan.\n" +
        "EXPLAIN SELECT * FROM events WHERE created_at >= \u00272026-09-01\u0027;   -- chỉ 1 partition\n" +
        "\n" +
        "-- 2) XOÁ DỮ LIỆU CŨ TỨC THÌ — đây thường là lý do chính:\n" +
        "DROP TABLE events_2025_09;                        -- tức thì\n" +
        "ALTER TABLE events DETACH PARTITION events_2025_09;\n" +
        "-- so với DELETE hàng trăm triệu dòng (hàng giờ, bloat, WAL khổng lồ).\n" +
        "\n" +
        "-- 3) VACUUM/REINDEX từng phần -> bảo trì khả thi trên bảng rất lớn.\n" +
        "\n" +
        "-- CẠM BẪY:\n" +
        "--  - KHOÁ CHÍNH phải CHỨA cột phân vùng -> UNIQUE toàn cục là không thể.\n" +
        "--  - Truy vấn KHÔNG có điều kiện trên khoá phân vùng -> quét MỌI phân vùng\n" +
        "--    -> CHẬM HƠN bảng thường.\n" +
        "--  - Quá nhiều phân vùng (hàng nghìn) làm chậm việc lập kế hoạch.\n" +
        "--  - Phải TỰ TẠO phân vùng tương lai (dùng pg_partman hoặc cron).\n" +
        "-- Ngưỡng thực dụng: cân nhắc khi bảng vượt vài chục GB.",
    },
  ],
},
{
  cat: 'Multi-tenancy',
  q: 'Multi-tenancy: shared schema, schema-per-tenant, hay DB-per-tenant?',
  answer:
    '- **Shared schema** (`tenant_id` trên mọi bảng): rẻ nhất, dễ vận hành/migrate một lần, dễ query cross-tenant (analytics). Rủi ro: quên `WHERE tenant_id` = **rò rỉ dữ liệu**; noisy neighbor; giới hạn tuỳ biến per-tenant. Dùng **Row-Level Security** để ép cô lập.\n' +
    '- **Schema-per-tenant**: cô lập tốt hơn, backup/restore per-tenant, nhưng migration phải chạy N lần, N tăng thì connection/metadata nặng.\n' +
    '- **DB-per-tenant**: cô lập tối đa (bảo mật, tuỳ biến, giới hạn tài nguyên, tuân thủ), nhưng vận hành N database — chỉ hợp số ít tenant lớn / enterprise.',
  essence:
    'Trục đánh đổi: chi phí vận hành (shared thấp) ↔ mức cô lập (DB-per-tenant cao). Nhiều SaaS: shared schema + RLS cho phần lớn tenant, DB riêng cho vài khách enterprise yêu cầu.',
  example:
    'SaaS B2B 5000 tenant nhỏ + 10 tenant lớn: shared schema với `tenant_id` + Postgres RLS (`CREATE POLICY ... USING (tenant_id = current_setting(\'app.tenant\')::bigint)`) cho 5000 tenant; DB riêng cho 10 khách lớn có yêu cầu compliance/isolation.',
  viz: {
    type: 'compare',
    corner: 'Tiêu chí',
    cols: ['Shared schema', 'Schema-per-tenant', 'DB-per-tenant'],
    rows: [
      ['Chi phí vận hành', 'thấp nhất', 'trung bình', 'cao (vận hành N DB)'],
      ['Mức cô lập', 'thấp — quên WHERE tenant_id = rò rỉ', 'khá', 'tối đa'],
      ['Migration', 'một lần', 'chạy N lần', 'chạy N lần'],
      ['Backup / restore per-tenant', 'khó', 'được', 'dễ'],
      ['Query cross-tenant (analytics)', 'dễ', 'khó', 'khó'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ba mức cách ly, ba mức chi phí vận hành",
      code:
        "-- 1) SHARED SCHEMA — mọi tenant chung bảng, phân biệt bằng tenant_id\n" +
        "CREATE TABLE orders (\n" +
        "  id BIGSERIAL PRIMARY KEY,\n" +
        "  tenant_id BIGINT NOT NULL,\n" +
        "  amount NUMERIC(18,2) NOT NULL\n" +
        ");\n" +
        "CREATE INDEX idx_orders_tenant ON orders (tenant_id, id);\n" +
        "-- tenant_id phải là cột ĐẦU TIÊN của MỌI index — nếu không, mọi truy vấn\n" +
        "-- đều quét dữ liệu của tenant khác.\n" +
        "\n" +
        "-- Bảo vệ bằng ROW LEVEL SECURITY để không phụ thuộc vào việc code nhớ WHERE:\n" +
        "ALTER TABLE orders ENABLE ROW LEVEL SECURITY;\n" +
        "CREATE POLICY tenant_isolation ON orders\n" +
        "  USING (tenant_id = current_setting(\u0027app.tenant_id\u0027)::bigint);\n" +
        "SET app.tenant_id = \u002742\u0027;        -- đặt ở đầu mỗi request\n" +
        "-- + rẻ nhất, dễ vận hành, migration một lần cho tất cả\n" +
        "-- - RỦI RO RÒ RỈ DỮ LIỆU nếu quên lọc; tenant lớn ảnh hưởng tenant nhỏ\n" +
        "--   (\"noisy neighbour\"); khó backup/khôi phục riêng một tenant\n" +
        "\n" +
        "-- 2) SCHEMA-PER-TENANT\n" +
        "CREATE SCHEMA tenant_42;\n" +
        "SET search_path TO tenant_42;\n" +
        "-- + cách ly tốt hơn, backup/khôi phục riêng được, tuỳ biến schema từng tenant\n" +
        "-- - migration phải chạy trên TỪNG schema; hàng nghìn schema làm chậm\n" +
        "--   catalog của Postgres\n" +
        "\n" +
        "-- 3) DATABASE-PER-TENANT\n" +
        "-- + cách ly MẠNH NHẤT, giới hạn tài nguyên riêng, đáp ứng yêu cầu tuân thủ\n" +
        "-- - tốn kém nhất, connection pool nhân lên, vận hành phức tạp\n" +
        "\n" +
        "-- CHỌN: SaaS nhiều tenant nhỏ (B2C, self-serve) -> SHARED SCHEMA + RLS.\n" +
        "-- Khách hàng doanh nghiệp lớn, yêu cầu tuân thủ -> DB-PER-TENANT.\n" +
        "-- Mô hình lai rất phổ biến: shared cho gói nhỏ, DB riêng cho gói enterprise.",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Chiến lược index ngay từ lúc thiết kế schema?',
  answer:
    'Index cần có sẵn khi bảng ra đời:\n' +
    '- **PK**: tự có (unique + not null).\n' +
    '- **Mọi cột FK**: index (nhiều DB không tự tạo — Postgres) → JOIN nhanh, `ON DELETE` không quét toàn bảng.\n' +
    '- **UNIQUE constraint** cho candidate key nghiệp vụ (email, SKU, slug).\n' +
    '- **Cột hay lọc/sắp trong query đã biết**: composite index theo (cột lọc bằng, cột sort).\n' +
    '- **Partial index** cho query luôn kèm điều kiện (status = active).\n\n' +
    'Đừng index "mọi cột phòng khi cần" — thêm sau khi có query thật và `EXPLAIN`.',
  essence:
    'Index bắt buộc lúc design: PK, tất cả FK, unique nghiệp vụ. Index cho pattern query đã biết. Index đầu cơ thì để lại — over-indexing đánh thuế mọi lần ghi.',
  example:
    'Tạo `orders (id PK, customer_id FK, status, created_at)`: ngay lập tức thêm `INDEX (customer_id)` (FK), `INDEX (customer_id, created_at DESC)` (query "đơn của tôi mới nhất"), `INDEX (status, created_at) WHERE status = \'PENDING\'` (job xử lý đơn chờ).',
  viz: {
    type: 'tree',
    title: 'Index bắt buộc lúc design vs index đầu cơ để lại',
    root: {
      label: 'Index cần có sẵn khi bảng ra đời',
      children: [
        { label: 'PK', note: 'tự có (unique + not null)' },
        { label: 'Mọi cột FK', note: 'nhiều DB không tự tạo (Postgres) → JOIN nhanh, ON DELETE không quét toàn bảng' },
        { label: 'UNIQUE cho candidate key nghiệp vụ', note: 'email, SKU, slug' },
        { label: 'Composite theo query đã biết', note: '(cột lọc bằng, cột sort)' },
        { label: 'Partial index', note: 'query luôn kèm điều kiện (status = active)' },
        { label: 'Đừng index "mọi cột phòng khi"', note: 'thêm sau khi có query thật + EXPLAIN — over-index đánh thuế mọi lần ghi' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Index nào nên có ngay, index nào chờ đo",
      code:
        "-- TẠO NGAY TỪ ĐẦU (gần như luôn cần):\n" +
        "CREATE TABLE orders (\n" +
        "  id BIGSERIAL PRIMARY KEY,                  -- index tự động\n" +
        "  customer_id BIGINT NOT NULL REFERENCES customers(id),\n" +
        "  status TEXT NOT NULL,\n" +
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "-- 1) MỌI cột khoá ngoại — Postgres KHÔNG tự tạo index cho FK.\n" +
        "--    Thiếu nó: xoá hàng cha phải quét toàn bộ bảng con, và dễ deadlock.\n" +
        "CREATE INDEX idx_orders_customer ON orders (customer_id);\n" +
        "\n" +
        "-- 2) Cột dùng để LỌC + SẮP XẾP trong truy vấn chính của màn hình\n" +
        "CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at DESC);\n" +
        "\n" +
        "-- 3) Ràng buộc nghiệp vụ duy nhất\n" +
        "CREATE UNIQUE INDEX uq_orders_number ON orders (order_number);\n" +
        "\n" +
        "-- CHỜ ĐO RỒI MỚI TẠO:\n" +
        "--  - index trên cột chọn lọc kém (status, boolean)\n" +
        "--  - covering index (chỉ khi biết chính xác truy vấn nóng)\n" +
        "--  - index cho báo cáo ad-hoc\n" +
        "\n" +
        "-- NGUYÊN TẮC:\n" +
        "--  - composite (a, b, c) đã bao gồm (a) và (a, b) -> đừng tạo trùng\n" +
        "--  - cột điều kiện BẰNG trước, SẮP XẾP giữa, KHOẢNG cuối\n" +
        "--  - mỗi index làm mọi lần GHI chậm đi -> đừng tạo \"phòng hờ\"\n" +
        "\n" +
        "-- TẠO INDEX TRÊN BẢNG ĐANG CHẠY — bắt buộc dùng CONCURRENTLY:\n" +
        "CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);\n" +
        "-- Không khoá ghi, nhưng chậm hơn và có thể thất bại -> kiểm tra và dọn:\n" +
        "SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Migration schema an toàn (backward-compatible, tránh lock lâu)?',
  answer:
    'Nguyên tắc **expand–contract**:\n' +
    '1. **Expand**: thêm cột/bảng/index mới (backward-compatible), deploy.\n' +
    '2. Backfill dữ liệu **theo batch** (không một `UPDATE` khổng lồ).\n' +
    '3. Deploy code dùng cấu trúc mới (đọc cả cũ + mới).\n' +
    '4. **Contract**: sau khi chắc chắn, xoá cột/bảng cũ.\n\n' +
    'Tránh lock lâu:\n' +
    '- Postgres: `ADD COLUMN` không default là nhanh (metadata); `CREATE INDEX CONCURRENTLY`; `ADD CONSTRAINT ... NOT VALID` rồi `VALIDATE CONSTRAINT` (không khoá write).\n' +
    '- MySQL: online DDL / `pt-online-schema-change` / `gh-ost`.\n' +
    '- Không `ALTER` đổi kiểu cột trên bảng lớn giờ cao điểm.',
  essence:
    'Migration là "nhiều bước tương thích ngược" chứ không phải một `ALTER` to. Tách thay đổi schema khỏi thay đổi code; backfill theo lô; dùng công cụ DDL online cho bảng lớn.',
  example:
    'Đổi `status varchar` sang FK `status_id`: (1) thêm `status_id` nullable + bảng `statuses`; (2) backfill 10k hàng/batch; (3) code ghi cả hai, đọc `status_id` fallback `status`; (4) sau 1 tuần, drop `status`. Không có bước nào khoá bảng > vài ms.',
  viz: {
    type: 'flow',
    title: 'Expand–contract: nhiều bước tương thích ngược, không một ALTER to',
    nodes: ['Expand', 'Backfill theo batch', 'Deploy code mới', 'Contract'],
    steps: [
      { to: 0, label: 'Thêm cột/bảng/index mới (backward-compatible), deploy' },
      { to: 1, label: 'Backfill dữ liệu theo lô — không một UPDATE khổng lồ' },
      { to: 2, label: 'Code dùng cấu trúc mới, đọc cả cũ + mới' },
      { to: 3, label: 'Sau khi chắc chắn: xoá cột/bảng cũ (CREATE INDEX CONCURRENTLY, ADD CONSTRAINT NOT VALID → VALIDATE)' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Deploy không downtime: mở rộng rồi mới thu hẹp",
      code:
        "-- NGUYÊN TẮC \"EXPAND / CONTRACT\": mỗi bước phải tương thích với CẢ code cũ\n" +
        "-- lẫn code mới, vì trong lúc deploy hai phiên bản chạy song song.\n" +
        "\n" +
        "-- ĐỔI TÊN CỘT (KHÔNG BAO GIỜ đổi trực tiếp — code cũ sẽ vỡ ngay):\n" +
        "-- Bước 1: THÊM cột mới, cho phép NULL\n" +
        "ALTER TABLE users ADD COLUMN full_name TEXT;\n" +
        "-- Bước 2: deploy code GHI CẢ HAI cột, ĐỌC cột cũ\n" +
        "-- Bước 3: chép dữ liệu THEO LÔ (tránh khoá lâu và WAL khổng lồ)\n" +
        "UPDATE users SET full_name = name WHERE full_name IS NULL AND id BETWEEN 1 AND 10000;\n" +
        "-- Bước 4: deploy code ĐỌC cột mới\n" +
        "-- Bước 5: NGỪNG ghi cột cũ, rồi mới DROP COLUMN name\n" +
        "\n" +
        "-- CÁC THAO TÁC AN TOÀN (Postgres 11+):\n" +
        "ALTER TABLE orders ADD COLUMN note TEXT;                      -- nhanh\n" +
        "ALTER TABLE orders ADD COLUMN flag BOOLEAN DEFAULT false;     -- nhanh (11+)\n" +
        "CREATE INDEX CONCURRENTLY idx_orders_note ON orders (note);\n" +
        "ALTER TABLE orders ADD CONSTRAINT chk CHECK (...) NOT VALID;\n" +
        "ALTER TABLE orders VALIDATE CONSTRAINT chk;\n" +
        "\n" +
        "-- CÁC THAO TÁC NGUY HIỂM (viết lại cả bảng hoặc khoá lâu):\n" +
        "-- ALTER TABLE ... ALTER COLUMN TYPE          -> viết lại toàn bảng\n" +
        "-- ALTER TABLE ... SET NOT NULL               -> quét toàn bảng (12+ dùng được\n" +
        "--                                               CHECK NOT VALID rồi chuyển)\n" +
        "-- CREATE INDEX (không CONCURRENTLY)          -> khoá ghi\n" +
        "-- ADD COLUMN ... NOT NULL không DEFAULT      -> lỗi nếu bảng có dữ liệu\n" +
        "\n" +
        "-- LUÔN đặt timeout khi chạy migration ở production:\n" +
        "SET lock_timeout = \u00273s\u0027;\n" +
        "SET statement_timeout = \u002730s\u0027;\n" +
        "-- Thiếu lock_timeout: DDL chờ khoá, và MỌI truy vấn tới sau xếp hàng\n" +
        "-- phía sau nó -> bảng bị khoá cứng dù DDL chưa chạy dòng nào.",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Thiết kế schema cho dữ liệu time-series?',
  answer:
    '- **Bảng hẹp**: `(entity_id, ts, metric, value)` hoặc `(entity_id, ts, value1, value2, ...)` — tránh cột thừa.\n' +
    '- **Partition theo thời gian** (range, theo ngày/tuần/tháng) → pruning + drop dữ liệu cũ dễ.\n' +
    '- **Index** `(entity_id, ts DESC)` cho "dữ liệu gần nhất của entity X".\n' +
    '- **Downsampling / rollup**: giữ raw ngắn hạn, aggregate (1m → 1h → 1d) cho dài hạn.\n' +
    '- Cân nhắc extension/DB chuyên dụng: **TimescaleDB** (hypertable, continuous aggregate, compression), InfluxDB, ClickHouse.',
  essence:
    'Time-series = ghi nhiều, ít update, query theo (entity, khoảng thời gian), xoá theo tuổi. Partition theo thời gian + rollup + (thường) một engine chuyên dụng là công thức.',
  example:
    'Metric server: raw `(host_id, ts, cpu, mem, disk)` partition theo ngày, giữ 7 ngày. Continuous aggregate 5 phút giữ 90 ngày, 1 giờ giữ 2 năm. Dashboard "CPU host X 24h" đọc từ bảng 5 phút, không đụng raw.',
  viz: {
    type: 'tree',
    title: 'Ghi nhiều, ít update, query theo (entity, khoảng), xoá theo tuổi',
    root: {
      label: 'Công thức schema time-series',
      children: [
        { label: 'Bảng hẹp', note: '(entity_id, ts, metric, value) hoặc (entity_id, ts, v1, v2, …) — tránh cột thừa' },
        { label: 'Partition theo thời gian', note: 'range theo ngày/tuần/tháng → pruning + drop dữ liệu cũ dễ' },
        { label: 'Index (entity_id, ts DESC)', note: '"dữ liệu gần nhất của entity X"' },
        { label: 'Downsampling / rollup', note: 'giữ raw ngắn hạn; aggregate 1m → 1h → 1d cho dài hạn' },
        { label: 'DB chuyên dụng', note: 'TimescaleDB (hypertable, continuous aggregate, compression), InfluxDB, ClickHouse' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Ghi rất nhiều, đọc theo khoảng thời gian",
      code:
        "CREATE TABLE metrics (\n" +
        "  device_id  BIGINT      NOT NULL,\n" +
        "  ts         TIMESTAMPTZ NOT NULL,\n" +
        "  metric     TEXT        NOT NULL,\n" +
        "  value      DOUBLE PRECISION NOT NULL,\n" +
        "  PRIMARY KEY (device_id, metric, ts)     -- thứ tự cột khớp mẫu truy vấn\n" +
        ") PARTITION BY RANGE (ts);\n" +
        "\n" +
        "CREATE TABLE metrics_2026_09 PARTITION OF metrics\n" +
        "  FOR VALUES FROM (\u00272026-09-01\u0027) TO (\u00272026-10-01\u0027);\n" +
        "\n" +
        "-- BRIN INDEX — cực nhỏ, hoàn hảo cho dữ liệu TĂNG DẦN theo thời gian.\n" +
        "-- Nó lưu min/max cho mỗi khối trang thay vì từng hàng.\n" +
        "CREATE INDEX idx_metrics_ts_brin ON metrics USING BRIN (ts) WITH (pages_per_range = 32);\n" +
        "-- Index BRIN trên bảng 100GB có thể chỉ vài MB (B-tree sẽ là hàng GB).\n" +
        "\n" +
        "-- NGUYÊN TẮC THIẾT KẾ:\n" +
        "-- 1) PHÂN VÙNG THEO THỜI GIAN -> pruning khi đọc, DROP tức thì khi hết hạn\n" +
        "DROP TABLE metrics_2025_09;\n" +
        "-- 2) DỮ LIỆU CHỈ GHI THÊM (append-only), KHÔNG UPDATE -> tránh bloat hoàn toàn\n" +
        "-- 3) TỔNG HỢP TRƯỚC (rollup): giữ dữ liệu thô ngắn hạn, dữ liệu tổng hợp dài hạn\n" +
        "CREATE MATERIALIZED VIEW metrics_hourly AS\n" +
        "SELECT device_id, metric, DATE_TRUNC(\u0027hour\u0027, ts) AS hour,\n" +
        "       AVG(value) AS avg_v, MAX(value) AS max_v, MIN(value) AS min_v, COUNT(*) AS n\n" +
        "FROM metrics GROUP BY 1, 2, 3;\n" +
        "-- 4) NÉN dữ liệu cũ (TimescaleDB nén tới 10-20 lần)\n" +
        "\n" +
        "-- KHI NÀO DÙNG DATABASE CHUYÊN DỤNG:\n" +
        "--  TimescaleDB (extension của Postgres) — giữ được SQL và hệ sinh thái,\n" +
        "--    thêm nén, continuous aggregate, quản lý phân vùng tự động.\n" +
        "--  InfluxDB/ClickHouse/Prometheus — khi khối lượng rất lớn và truy vấn\n" +
        "--    chủ yếu là tổng hợp theo thời gian.\n" +
        "-- Postgres thuần đủ dùng tới hàng chục triệu điểm dữ liệu mỗi ngày nếu\n" +
        "-- phân vùng và index đúng.",
    },
  ],
},
{
  cat: 'Thiết kế',
  q: 'Quy ước đặt tên (naming convention) cho bảng, cột, index?',
  answer:
    'Chọn một quy ước và **nhất quán tuyệt đối**:\n' +
    '- **Bảng**: số nhiều hay số ít (`users` vs `user`) — chọn một; `snake_case`; bảng nối `student_courses` / `enrollments`.\n' +
    '- **Cột**: `snake_case`; PK là `id`; FK là `<bảng_số_ít>_id` (`customer_id`); boolean có tiền tố `is_`/`has_` (`is_active`); thời gian `_at` (`created_at`).\n' +
    '- **Index**: `idx_<table>_<cols>` hoặc `<table>_<cols>_idx`; unique `uq_...`; FK constraint `fk_...`.\n' +
    '- Tránh **từ khoá SQL** làm tên (`order`, `user`, `group` → phải quote).\n' +
    '- Không viết tắt khó hiểu; tên nói đúng nội dung.',
  essence:
    'Quy ước tên không có "đúng/sai" tuyệt đối — có "nhất quán / không nhất quán". Nhất quán giúp đoán được tên cột/FK/index mà không cần tra, và giúp ORM/tooling hoạt động trơn.',
  example:
    'Nhất quán: `orders.id`, `orders.customer_id` → `customers.id`, `order_items.order_id`, index `idx_orders_customer_id_created_at`. Không nhất quán: `Order.OrderID`, `orders.cust`, `tbl_order_item.fk_ord` → mỗi query phải tra schema.',
  viz: {
    type: 'tree',
    title: 'Không có "đúng/sai" tuyệt đối — có "nhất quán / không nhất quán"',
    root: {
      label: 'Chọn một quy ước và nhất quán tuyệt đối',
      children: [
        { label: 'Bảng', note: 'số nhiều hay số ít — chọn một; snake_case; tránh từ khoá SQL (order, user, group)' },
        { label: 'Cột', note: 'snake_case; PK = id; FK = <bảng_số_ít>_id; boolean is_/has_; thời gian _at' },
        { label: 'Index', note: 'idx_<table>_<cols>; unique uq_…; FK constraint fk_…' },
        { label: 'Chung', note: 'không viết tắt khó hiểu; tên nói đúng nội dung → đoán được mà không cần tra' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Nhất quán quan trọng hơn chọn kiểu nào",
      code:
        "-- BẢNG: snake_case, SỐ NHIỀU (hoặc số ít — chọn MỘT và giữ nguyên)\n" +
        "CREATE TABLE order_lines (...);       -- không phải OrderLines, orderLines\n" +
        "\n" +
        "-- CỘT: snake_case; khoá chính là id; khoá ngoại là <bảng_số_ít>_id\n" +
        "CREATE TABLE orders (\n" +
        "  id           BIGSERIAL PRIMARY KEY,\n" +
        "  customer_id  BIGINT NOT NULL,       -- rõ ràng nó trỏ tới customers.id\n" +
        "  total_amount NUMERIC(18,2) NOT NULL,\n" +
        "  is_paid      BOOLEAN NOT NULL DEFAULT false,   -- boolean: is_/has_/can_\n" +
        "  created_at   TIMESTAMPTZ NOT NULL,             -- thời gian: _at\n" +
        "  order_date   DATE                              -- ngày: _date\n" +
        ");\n" +
        "\n" +
        "-- INDEX/CONSTRAINT: có TIỀN TỐ chỉ loại + bảng + cột\n" +
        "CREATE INDEX idx_orders_customer_id ON orders (customer_id);\n" +
        "CREATE UNIQUE INDEX uq_orders_number ON orders (order_number);\n" +
        "ALTER TABLE orders ADD CONSTRAINT fk_orders_customer\n" +
        "  FOREIGN KEY (customer_id) REFERENCES customers(id);\n" +
        "ALTER TABLE orders ADD CONSTRAINT chk_orders_amount CHECK (total_amount >= 0);\n" +
        "-- Đặt tên constraint TƯỜNG MINH: tên tự sinh khó đọc, và thông báo lỗi\n" +
        "-- hiện tên constraint -> tên tốt giúp gỡ rối nhanh hơn nhiều.\n" +
        "\n" +
        "-- QUY TẮC:\n" +
        "-- 1) TRÁNH TỪ KHOÁ SQL: order, user, group, table, from -> orders, users, user_groups\n" +
        "--    (nếu không sẽ phải bọc dấu nháy kép ở khắp nơi)\n" +
        "-- 2) KHÔNG viết tắt khó hiểu: cust_nm -> customer_name\n" +
        "-- 3) KHÔNG nhắc lại tên bảng trong cột: orders.order_date -> orders.order_date\n" +
        "--    chấp nhận được, nhưng orders.order_id cho khoá chính thì thừa -> id\n" +
        "-- 4) Postgres tự HẠ CHỮ THƯỜNG mọi định danh không có dấu nháy kép\n" +
        "--    -> đừng bao giờ dùng \"CamelCase\" trong DDL, sẽ phải quote mãi mãi.\n" +
        "-- 5) Giới hạn 63 ký tự (Postgres) — tên index dài bị cắt âm thầm.",
    },
  ],
},
{
  cat: 'Quan hệ',
  q: 'Quan hệ 1–1: khi nào tách thành bảng riêng?',
  answer:
    'Một quan hệ 1–1 (`user` ↔ `user_settings`) **có thể** gộp vào một bảng. Tách khi:\n' +
    '- **Cột thưa/tuỳ chọn**: chỉ 5% user có `verified_business_info` → tách để bảng chính gọn.\n' +
    '- **Truy cập tách biệt**: `user_auth` (password hash, 2FA secret — nhạy cảm, truy cập hiếm) tách khỏi `users` (profile, đọc thường xuyên) → phân quyền, cache khác nhau.\n' +
    '- **Cột nặng**: blob, text lớn (xem câu bảng rộng/hẹp).\n' +
    '- **Vòng đời khác nhau**: dữ liệu tạo sau, bởi hệ thống khác.\n\n' +
    'Bảng con dùng **PK = FK** tới bảng cha (`user_settings.user_id PRIMARY KEY REFERENCES users(id)`).',
  essence:
    '1–1 mặc định gộp chung; tách khi cột thưa, nặng, nhạy cảm, hoặc có vòng đời/quyền truy cập riêng. Bảng con chia sẻ PK với cha để enforce 1–1.',
  example:
    '`users` (email, name, avatar_url — đọc mọi request) + `user_security` (password_hash, totp_secret, backup_codes — chỉ chạm lúc login/đổi mật khẩu). Tách giúp: query profile không kéo secret, và cấp quyền `SELECT` trên `user_security` cực hạn chế.',
  viz: {
    type: 'tree',
    title: '1–1 mặc định gộp chung; bảng con chia sẻ PK với cha để enforce 1–1',
    root: {
      label: 'Tách quan hệ 1–1 thành bảng riêng khi…',
      children: [
        { label: 'Cột thưa / tuỳ chọn', note: 'chỉ 5% user có verified_business_info → tách để bảng chính gọn' },
        { label: 'Truy cập tách biệt', note: 'user_auth (nhạy cảm, hiếm) tách khỏi users (profile, đọc thường xuyên) → phân quyền, cache khác' },
        { label: 'Cột nặng', note: 'blob, text lớn' },
        { label: 'Vòng đời khác nhau', note: 'dữ liệu tạo sau, bởi hệ thống khác' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Cùng một thực thể, hai bảng",
      code:
        "CREATE TABLE users (\n" +
        "  id BIGSERIAL PRIMARY KEY,\n" +
        "  email TEXT NOT NULL UNIQUE,\n" +
        "  password_hash TEXT NOT NULL\n" +
        ");\n" +
        "CREATE TABLE user_profiles (\n" +
        "  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,\n" +
        "  bio     TEXT,\n" +
        "  avatar  BYTEA,\n" +
        "  preferences JSONB\n" +
        ");\n" +
        "-- PRIMARY KEY chính là FK -> đảm bảo đúng quan hệ 1-1 (không cần UNIQUE thêm).\n" +
        "\n" +
        "-- LÝ DO TÁCH:\n" +
        "-- 1) CỘT LỚN ÍT DÙNG: bio, avatar, blob. Tách ra giúp bảng chính GỌN\n" +
        "--    -> nhiều hàng hơn trên mỗi trang -> quét nhanh hơn.\n" +
        "--    (Postgres có TOAST tự đẩy giá trị lớn ra ngoài, nên lợi ích ít hơn\n" +
        "--     so với MySQL, nhưng vẫn có.)\n" +
        "-- 2) BẢO MẬT: tách dữ liệu nhạy cảm để cấp quyền riêng\n" +
        "GRANT SELECT ON users TO app_readonly;      -- không cấp quyền trên bảng nhạy cảm\n" +
        "-- 3) TẦN SUẤT TRUY CẬP KHÁC NHAU: bảng đăng nhập đọc mỗi request,\n" +
        "--    profile chỉ đọc khi xem trang cá nhân.\n" +
        "-- 4) THUỘC TÍNH TUỲ CHỌN: chỉ 5% user có dữ liệu -> tránh bảng đầy NULL.\n" +
        "-- 5) Vòng đời khác nhau (dữ liệu xoá theo GDPR tách riêng thì dễ xử lý).\n" +
        "\n" +
        "-- LÝ DO KHÔNG TÁCH: luôn phải join -> chậm hơn và code phức tạp hơn.\n" +
        "-- Mặc định là GỘP; chỉ tách khi có một trong các lý do trên.\n" +
        "\n" +
        "-- Truy vấn: dùng LEFT JOIN vì profile có thể chưa tồn tại\n" +
        "SELECT u.email, p.bio FROM users u\n" +
        "LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = 1;",
    },
  ],
},
{
  cat: 'Chuẩn hoá',
  q: 'Bảng "rộng" (nhiều cột) vs "hẹp" — cân nhắc gì?',
  answer:
    '**Bảng rộng** (50+ cột): ít JOIN, lấy hết trong một hàng. Nhưng:\n' +
    '- `SELECT *` kéo nhiều dữ liệu không cần.\n' +
    '- Cột nullable/thưa lãng phí.\n' +
    '- Cột `text`/`jsonb` lớn làm mọi hàng nặng (Postgres TOAST giảm bớt; MySQL off-page).\n' +
    '- Update một cột phải rewrite cả hàng (Postgres MVCC).\n' +
    '- Giới hạn số cột (Postgres ~1600).\n\n' +
    '**Tách bảng** (vertical partitioning): nhóm cột "nóng" (hay đọc/ghi) tách khỏi cột "lạnh" (metadata, blob) → hàng nóng nhỏ, cache tốt, ít bloat.',
  essence:
    'Số cột không phải vấn đề tự thân; **dữ liệu lớn/thưa/lạnh trộn với dữ liệu nóng** mới là. Tách cột hiếm dùng và cột nặng sang bảng phụ 1–1 với PK chung.',
  example:
    '`users` có `bio text`, `preferences jsonb`, `avatar_data bytea` cùng với `email`, `last_login`: mỗi lần update `last_login` (thường xuyên) rewrite cả blob → bloat. Tách `user_profiles (user_id PK, bio, preferences)` và lưu avatar ở object storage.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Bảng rộng (50+ cột)', 'Tách bảng (vertical partitioning)'],
    rows: [
      ['JOIN', 'ít — lấy hết trong một hàng', 'thêm JOIN cho cột "lạnh"'],
      ['SELECT *', 'kéo nhiều dữ liệu không cần', 'hàng nóng nhỏ, cache tốt'],
      ['Update một cột', 'rewrite cả hàng (Postgres MVCC) → bloat', 'chỉ rewrite hàng nóng nhỏ'],
      ['Cột text/jsonb/blob lớn', 'làm mọi hàng nặng', 'tách sang bảng phụ 1–1 (PK chung)'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Số cột ảnh hưởng tới I/O và bảo trì",
      code:
        "-- BẢNG RỘNG: 100+ cột trong một bảng\n" +
        "-- + không cần join -> truy vấn đơn giản\n" +
        "-- - mỗi hàng LỚN -> ÍT hàng trên một trang 8KB -> quét tuần tự đọc nhiều\n" +
        "--   trang hơn -> chậm hơn\n" +
        "-- - SELECT * kéo dữ liệu khổng lồ\n" +
        "-- - ALTER TABLE trên bảng rộng đắt hơn\n" +
        "-- - khó hiểu, dễ có cột không ai biết dùng làm gì\n" +
        "\n" +
        "-- BẢNG HẸP: tách theo nhóm chức năng\n" +
        "-- + hàng nhỏ, cache hiệu quả, quét nhanh\n" +
        "-- - phải join\n" +
        "\n" +
        "-- ĐO KÍCH THƯỚC HÀNG THẬT:\n" +
        "SELECT pg_size_pretty(pg_relation_size(\u0027orders\u0027)) AS bang,\n" +
        "       (SELECT COUNT(*) FROM orders) AS so_hang,\n" +
        "       pg_relation_size(\u0027orders\u0027) / NULLIF((SELECT COUNT(*) FROM orders), 0) AS byte_moi_hang;\n" +
        "\n" +
        "-- POSTGRES: giới hạn 1600 cột, và TOAST tự đẩy giá trị lớn (> ~2KB) sang\n" +
        "-- vùng lưu trữ riêng -> cột TEXT lớn ít ảnh hưởng tới kích thước hàng chính.\n" +
        "-- Nhưng cột SỐ và ngày tháng thì nằm trực tiếp trong hàng.\n" +
        "\n" +
        "-- THỨ TỰ CỘT có ảnh hưởng thật (do căn lề bộ nhớ):\n" +
        "-- đặt cột 8 byte (bigint, timestamptz, double) TRƯỚC, rồi 4 byte (int),\n" +
        "-- rồi 2/1 byte (smallint, boolean), cuối cùng là kiểu độ dài thay đổi.\n" +
        "-- Sắp xếp lại có thể tiết kiệm 10-20% dung lượng trên bảng nhiều cột.\n" +
        "SELECT pg_column_size(row(1::bigint, true, 1::int));\n" +
        "SELECT pg_column_size(row(true, 1::bigint, 1::int));   -- lớn hơn do padding\n" +
        "\n" +
        "-- QUY TẮC: nhóm cột theo VÒNG ĐỜI và TẦN SUẤT TRUY CẬP, không theo số lượng.\n" +
        "-- Cột luôn đọc cùng nhau thì để cùng bảng.",
    },
  ],
},
]);
