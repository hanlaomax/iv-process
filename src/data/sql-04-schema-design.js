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
},
]);
