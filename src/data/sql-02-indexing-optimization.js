SS.addQuestions('sql', [
{
  cat: 'Index',
  diagram: 'btree-index',
  id: 'sql-kkkiia',
  q: 'B-tree index hoạt động thế nào? Khi nào được dùng?',
  answer:
    'B-tree là cây cân bằng, các node lá liên kết nhau và chứa (key đã sắp xếp → con trỏ tới hàng). Tra cứu từ root xuống lá là O(log N).\n\n' +
    'Được dùng cho:\n' +
    '- Bằng: `WHERE x = ?`.\n' +
    '- Khoảng: `WHERE x BETWEEN a AND b`, `x > ?`, `x < ?`.\n' +
    '- Prefix chuỗi: `WHERE name LIKE \'abc%\'`.\n' +
    '- `ORDER BY x` (đọc lá theo thứ tự, tránh sort).\n' +
    '- `MIN(x)` / `MAX(x)`.\n\n' +
    'Không giúp: `LIKE \'%abc\'`, `WHERE func(x) = ?`, điều kiện có `OR` giữa các cột không cùng index.',
  essence:
    'B-tree = "danh bạ sắp xếp" cho phép nhảy tới đúng vị trí thay vì đọc tuần tự. Nó phục vụ bằng, khoảng, prefix và sắp xếp — vì dữ liệu trong nó đã có thứ tự.',
  example:
    'Index `(created_at)` phục vụ `WHERE created_at >= \'2024-06-01\'` (khoảng) và `ORDER BY created_at DESC LIMIT 10` (không cần sort). Nhưng `WHERE EXTRACT(year FROM created_at) = 2024` không dùng được index đó.',
  demo: [
    {
      lang: "sql",
      title: "Cây cân bằng, và khi nào optimizer chịu dùng",
      code:
        "CREATE INDEX idx_orders_created ON orders (created_at);\n" +
        "-- Cấu trúc: cây cân bằng, mọi lá cùng độ sâu. Bảng 100 triệu hàng thường\n" +
        "-- chỉ cần 3-4 lần đọc trang để tới đúng hàng -> O(log N).\n" +
        "-- Lá được liên kết đôi -> quét theo KHOẢNG rất rẻ (đọc tuần tự các lá).\n" +
        "\n" +
        "-- B-TREE DÙNG ĐƯỢC cho:\n" +
        "SELECT * FROM orders WHERE created_at = \u00272026-09-05\u0027;                 -- bằng\n" +
        "SELECT * FROM orders WHERE created_at BETWEEN \u00272026-09-01\u0027 AND \u00272026-09-05\u0027;  -- khoảng\n" +
        "SELECT * FROM orders WHERE created_at > \u00272026-09-01\u0027 ORDER BY created_at;     -- sắp xếp\n" +
        "SELECT * FROM orders WHERE customer_name LIKE \u0027Nguyen%\u0027;              -- tiền tố\n" +
        "SELECT MIN(created_at), MAX(created_at) FROM orders;                  -- cực trị\n" +
        "SELECT * FROM orders WHERE created_at IS NULL;                        -- Postgres index cả NULL\n" +
        "\n" +
        "-- KHÔNG DÙNG ĐƯỢC:\n" +
        "SELECT * FROM orders WHERE customer_name LIKE \u0027%Nguyen\u0027;   -- không có tiền tố cố định\n" +
        "SELECT * FROM orders WHERE DATE(created_at) = \u00272026-09-05\u0027; -- hàm bọc cột\n" +
        "SELECT * FROM orders WHERE amount + 10 > 100;               -- biểu thức trên cột\n" +
        "\n" +
        "-- OPTIMIZER TỰ CHỌN không dùng index khi phải lấy quá nhiều hàng (thường\n" +
        "-- trên ~5-20% bảng): đọc tuần tự cả bảng RẺ HƠN việc nhảy ngẫu nhiên\n" +
        "-- từ index sang heap.\n" +
        "EXPLAIN ANALYZE SELECT * FROM orders WHERE created_at > \u00272020-01-01\u0027;\n" +
        "-- -> Seq Scan là ĐÚNG khi điều kiện khớp phần lớn bảng.\n" +
        "\n" +
        "-- Các loại index khác của Postgres: GIN (mảng, jsonb, full-text),\n" +
        "-- GiST (không gian, khoảng), BRIN (dữ liệu tăng dần, bảng rất lớn), Hash (chỉ =).",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-a2wwv2',
  q: 'Clustered index và non-clustered index khác nhau thế nào?',
  answer:
    '- **Clustered index** (MySQL InnoDB PK, SQL Server): **các hàng dữ liệu được lưu vật lý theo thứ tự của key này**. Một bảng chỉ có một. Tra theo PK là lấy luôn cả hàng (không cần bước phụ).\n' +
    '- **Non-clustered / secondary index**: cấu trúc riêng chứa (key → con trỏ tới hàng). Tra xong phải "nhảy" lấy hàng thật (bookmark lookup). Trong InnoDB, secondary index trỏ tới **PK value** → tra secondary index cần thêm một lần tra clustered index.\n' +
    '- **Postgres**: không có clustered index thật; mọi index là secondary, bảng là "heap" (`CLUSTER` chỉ sắp một lần).',
  essence:
    'Clustered index quyết định thứ tự vật lý của hàng → tra theo nó cực nhanh, nhưng PK to/ngẫu nhiên làm mọi secondary index phình và insert phân mảnh. Non-clustered cần thêm bước lấy hàng.',
  example:
    'InnoDB: PK là UUID v4 (ngẫu nhiên) → insert chèn khắp nơi trong clustered index → page split, phân mảnh, và mọi secondary index lưu UUID 16 byte. Đổi sang BIGINT auto-increment (hoặc UUID v7 tăng dần) → insert tuần tự, index gọn.',
  viz: {
    type: 'compare',
    cols: ['Clustered index (InnoDB PK, SQL Server)', 'Non-clustered / secondary'],
    rows: [
      ['Lưu trữ', 'HÀNG dữ liệu lưu vật lý theo thứ tự key này', 'cấu trúc riêng (key → con trỏ)'],
      ['Số lượng', 'một mỗi bảng', 'nhiều'],
      ['Tra cứu', 'lấy luôn cả hàng', 'bookmark lookup (InnoDB: qua PK value → thêm một lần tra)'],
      ['Bẫy', 'PK to/ngẫu nhiên (UUID v4) → secondary index phình, insert phân mảnh', '—'],
      ['Postgres', 'không có clustered thật (CLUSTER chỉ sắp một lần)', 'mọi index là secondary, bảng là heap'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Thứ tự vật lý của dữ liệu",
      code:
        "-- CLUSTERED INDEX: quyết định THỨ TỰ VẬT LÝ của hàng trên đĩa. Lá của index\n" +
        "-- CHÍNH LÀ dữ liệu. Mỗi bảng chỉ có MỘT.\n" +
        "-- MySQL/InnoDB: PRIMARY KEY luôn là clustered index (không đổi được).\n" +
        "CREATE TABLE orders (\n" +
        "  id BIGINT AUTO_INCREMENT PRIMARY KEY,   -- clustered: dữ liệu sắp theo id\n" +
        "  customer_id BIGINT,\n" +
        "  INDEX idx_customer (customer_id)        -- non-clustered (secondary)\n" +
        ") ENGINE=InnoDB;\n" +
        "\n" +
        "-- HỆ QUẢ QUAN TRỌNG TRONG INNODB:\n" +
        "-- 1) Secondary index lưu GIÁ TRỊ PRIMARY KEY chứ không phải con trỏ vật lý\n" +
        "--    -> tra secondary index xong phải tra TIẾP clustered index để lấy hàng\n" +
        "--    (gọi là \"bookmark lookup\"). Đó là lý do PK ngắn rất quan trọng —\n" +
        "--    PK dài (UUID 36 ký tự dạng chuỗi) làm MỌI secondary index phình to.\n" +
        "-- 2) PK NGẪU NHIÊN (UUIDv4) làm hàng chèn vào GIỮA cây -> tách trang,\n" +
        "--    phân mảnh, ghi ngẫu nhiên -> chậm hơn nhiều so với PK tăng dần.\n" +
        "--    -> dùng BIGINT AUTO_INCREMENT hoặc UUIDv7 (có thành phần thời gian).\n" +
        "\n" +
        "-- POSTGRES KHÔNG có clustered index thật sự: dữ liệu nằm trong heap không\n" +
        "-- theo thứ tự, mọi index đều trỏ tới ctid (vị trí vật lý).\n" +
        "CLUSTER orders USING idx_orders_created;   -- sắp xếp lại MỘT LẦN, khoá bảng\n" +
        "-- Thứ tự này KHÔNG được duy trì tự động khi có ghi mới.\n" +
        "\n" +
        "-- Đo mức độ tương quan giữa thứ tự index và thứ tự vật lý (Postgres):\n" +
        "SELECT attname, correlation FROM pg_stats WHERE tablename = \u0027orders\u0027;\n" +
        "-- correlation gần 1 hoặc -1 -> quét theo khoảng rất hiệu quả.",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-khbped',
  q: 'Composite index và quy tắc "leftmost prefix"?',
  answer:
    'Index `(a, b, c)` sắp xếp theo `a`, rồi `b`, rồi `c`. Nó phục vụ được các truy vấn dùng **tiền tố trái liên tục**:\n' +
    '- `WHERE a = ?` ✓\n' +
    '- `WHERE a = ? AND b = ?` ✓\n' +
    '- `WHERE a = ? AND b = ? AND c = ?` ✓\n' +
    '- `WHERE a = ? AND c = ?` → chỉ dùng được phần `a` (bỏ qua `c`).\n' +
    '- `WHERE b = ?` → **không** dùng được index (thiếu `a`).\n\n' +
    'Cột dùng cho **khoảng** nên đặt **sau cùng** trong các cột được so bằng: `(a, b)` với `a =` và `b >` là tốt; đảo lại thì phần sau khoảng vô dụng.',
  essence:
    'Composite index như từ điển sắp theo (họ, tên): tra được "họ", "họ + tên", nhưng không tra được "tên" đơn lẻ. Thứ tự cột = cột lọc-bằng trước, cột khoảng/sort sau.',
  example:
    'Query hay chạy: `WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC`. Index tốt: `(tenant_id, status, created_at)` — lọc bằng hai cột đầu, cột thứ ba cho ORDER BY khỏi sort. Index `(created_at, tenant_id, status)` gần như vô dụng cho query này.',
  viz: {
    type: 'flow',
    title: 'Composite index (a, b, c) — quy tắc "leftmost prefix"',
    nodes: ['sắp theo a, rồi b, rồi c', 'WHERE a = ? ✓', 'WHERE a = ? AND b = ? ✓', 'WHERE b = ? ✗ (thiếu a)', 'WHERE a = ? AND c = ? → chỉ dùng phần a'],
    steps: [
      { to: 1, label: 'như từ điển sắp theo (họ, tên): tra "họ", "họ + tên", không tra được "tên" đơn lẻ' },
      { to: 3, label: 'thứ tự cột = cột lọc-BẰNG trước, cột khoảng/sort SAU' },
      { to: 4, label: '(tenant_id, status, created_at) cho WHERE tenant= AND status= ORDER BY created_at — không cần sort' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Thứ tự cột quyết định index có dùng được hay không",
      code:
        "CREATE INDEX idx_orders ON orders (customer_id, status, created_at);\n" +
        "\n" +
        "-- DÙNG ĐƯỢC (khớp tiền tố TRÁI):\n" +
        "SELECT * FROM orders WHERE customer_id = 1;\n" +
        "SELECT * FROM orders WHERE customer_id = 1 AND status = \u0027PAID\u0027;\n" +
        "SELECT * FROM orders WHERE customer_id = 1 AND status = \u0027PAID\u0027 AND created_at > \u00272026-01-01\u0027;\n" +
        "SELECT * FROM orders WHERE customer_id = 1 ORDER BY status, created_at;   -- cả sắp xếp\n" +
        "\n" +
        "-- KHÔNG DÙNG ĐƯỢC (bỏ qua cột đầu):\n" +
        "SELECT * FROM orders WHERE status = \u0027PAID\u0027;                    -- thiếu customer_id\n" +
        "SELECT * FROM orders WHERE created_at > \u00272026-01-01\u0027;          -- thiếu hai cột đầu\n" +
        "\n" +
        "-- DÙNG MỘT PHẦN: cột KHOẢNG chặn việc dùng các cột SAU nó\n" +
        "SELECT * FROM orders\n" +
        "WHERE customer_id = 1 AND created_at > \u00272026-01-01\u0027 AND status = \u0027PAID\u0027;\n" +
        "-- Index dùng được customer_id (=) rồi tới created_at (khoảng), nhưng\n" +
        "-- status nằm SAU created_at trong index nên chỉ được lọc lại, không dùng\n" +
        "-- để định vị. -> Với truy vấn này, thứ tự (customer_id, status, created_at)\n" +
        "-- vẫn tốt hơn vì status là điều kiện BẰNG.\n" +
        "\n" +
        "-- QUY TẮC THIẾT KẾ:\n" +
        "--  1) cột điều kiện BẰNG (=) đặt TRƯỚC\n" +
        "--  2) cột dùng để SẮP XẾP đặt tiếp theo\n" +
        "--  3) cột điều kiện KHOẢNG (>, <, BETWEEN) đặt CUỐI\n" +
        "--  4) cột chọn lọc cao (nhiều giá trị khác nhau) thường nên đứng trước\n" +
        "-- Một composite index (a, b, c) đã bao gồm luôn (a) và (a, b)\n" +
        "-- -> KHÔNG cần tạo thêm hai index đó.",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-eg9bsc',
  q: 'Covering index / index-only scan là gì?',
  answer:
    'Nếu **mọi cột** truy vấn cần (trong SELECT, WHERE, ORDER BY) đều nằm trong index, DB trả kết quả **chỉ từ index**, không chạm bảng (heap) → nhanh hơn nhiều (bỏ bước bookmark lookup).\n\n' +
    'Postgres: `CREATE INDEX ... INCLUDE (col)` thêm cột "payload" không tham gia sắp xếp nhưng có trong index. (Postgres còn cần visibility map "sạch" — chạy `VACUUM` — để index-only scan thực sự tránh heap.)',
  essence:
    'Covering index = "index tự trả lời được cả câu hỏi". Đánh đổi: index to hơn, ghi chậm hơn. Dùng cho các truy vấn đọc nóng, chọn ít cột.',
  example:
    '`SELECT status, total FROM orders WHERE customer_id = ?` chạy hàng nghìn lần/s: `CREATE INDEX idx ON orders (customer_id) INCLUDE (status, total)` → index-only scan, không đụng heap, latency giảm rõ.',
  viz: {
    type: 'flow',
    title: 'Covering index / index-only scan',
    nodes: ['mọi cột truy vấn cần (SELECT, WHERE, ORDER BY) đều trong index', 'DB trả kết quả CHỈ từ index', 'bỏ bước bookmark lookup (không chạm heap)', 'Postgres: INCLUDE (col) thêm payload không sắp xếp'],
    steps: [
      { to: 2, label: 'nhanh hơn nhiều' },
      { to: 3, label: 'đánh đổi: index to hơn, ghi chậm hơn — dùng cho truy vấn đọc nóng, chọn ít cột' },
      { to: 3, label: 'Postgres còn cần visibility map "sạch" (VACUUM) để thực sự tránh heap' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Trả lời truy vấn mà không đụng vào bảng",
      code:
        "-- Truy vấn thường: tra index -> lấy con trỏ -> đọc HEAP để lấy các cột khác.\n" +
        "-- Bước đọc heap là ngẫu nhiên và đắt.\n" +
        "-- COVERING INDEX chứa ĐỦ mọi cột truy vấn cần -> bỏ hẳn bước đó.\n" +
        "\n" +
        "CREATE INDEX idx_orders_covering ON orders (customer_id, status, amount);\n" +
        "SELECT customer_id, status, amount FROM orders WHERE customer_id = 1;\n" +
        "-- -> Index Only Scan: nhanh hơn nhiều, đặc biệt trên bảng lớn.\n" +
        "\n" +
        "-- POSTGRES: INCLUDE đưa cột vào LÁ mà không đưa vào khoá sắp xếp\n" +
        "-- -> index nhỏ hơn, vẫn covering\n" +
        "CREATE INDEX idx_orders_inc ON orders (customer_id, status) INCLUDE (amount, created_at);\n" +
        "\n" +
        "-- SQL SERVER: cú pháp tương tự\n" +
        "-- CREATE INDEX ix ON orders (customer_id) INCLUDE (amount);\n" +
        "-- MYSQL: không có INCLUDE, phải đưa cột vào khoá index.\n" +
        "\n" +
        "EXPLAIN (ANALYZE, BUFFERS)\n" +
        "SELECT customer_id, amount FROM orders WHERE customer_id = 1;\n" +
        "-- Tìm \"Index Only Scan\" và \"Heap Fetches: 0\"\n" +
        "\n" +
        "-- LƯU Ý RIÊNG CỦA POSTGRES: index-only scan vẫn phải kiểm tra VISIBILITY MAP\n" +
        "-- để biết hàng có hiển thị với transaction hiện tại không. Bảng vừa ghi\n" +
        "-- nhiều mà chưa VACUUM -> Heap Fetches cao -> mất phần lớn lợi ích.\n" +
        "VACUUM ANALYZE orders;\n" +
        "\n" +
        "-- ĐÁNH ĐỔI: index rộng hơn -> tốn đĩa hơn, ghi chậm hơn. Chỉ tạo covering\n" +
        "-- index cho truy vấn NÓNG và quan trọng.",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-gfoxw9',
  q: 'Vì sao index tồn tại nhưng optimizer không dùng?',
  answer:
    'Các lý do phổ biến:\n' +
    '- **Selectivity thấp**: điều kiện khớp phần lớn bảng (ví dụ `status = \'active\'` chiếm 95%) → seq scan rẻ hơn (đọc tuần tự + không random I/O + không bookmark lookup).\n' +
    '- **Predicate không sargable**: `WHERE func(col) = ?`, ép kiểu ngầm, `col + 1 = ?`.\n' +
    '- **Statistics cũ**: optimizer tưởng bảng nhỏ / phân bố khác thực tế → chạy `ANALYZE`.\n' +
    '- **Bảng nhỏ**: seq scan một bảng vài trăm hàng luôn nhanh hơn.\n' +
    '- Kiểu dữ liệu / collation không khớp index.\n' +
    '- Điều kiện `OR` không được index bao phủ hết.',
  essence:
    'Index chỉ có ích khi nó loại được **phần lớn** bảng. Optimizer là dựa trên chi phí — nếu nó bỏ index, thường là nó đúng (selectivity thấp) hoặc predicate của bạn phá index (không sargable / stats cũ).',
  example:
    '`WHERE is_deleted = false` (99% hàng chưa xoá) → optimizer chọn seq scan, đúng. `WHERE lower(email) = ?` không dùng index `(email)` → tạo functional index `(lower(email))` hoặc so sánh đúng case.',
  viz: {
    type: 'tree',
    title: 'Vì sao optimizer KHÔNG dùng index (thường nó đúng)',
    root: {
      label: 'Index chỉ có ích khi nó loại được PHẦN LỚN bảng',
      children: [
        { label: 'Selectivity thấp', note: 'điều kiện khớp phần lớn bảng (status = "active" 95%) → seq scan rẻ hơn' },
        { label: 'Predicate không sargable', note: 'func(col) = ?, ép kiểu ngầm, col + 1 = ?' },
        { label: 'Statistics cũ', note: 'optimizer tưởng bảng nhỏ / phân bố khác → chạy ANALYZE' },
        { label: 'Bảng nhỏ / kiểu-collation không khớp / OR không bao phủ hết' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Tám nguyên nhân, kiểm tra theo thứ tự",
      code:
        "EXPLAIN ANALYZE SELECT * FROM orders WHERE status = \u0027NEW\u0027;\n" +
        "\n" +
        "-- 1) TRẢ VỀ QUÁ NHIỀU HÀNG: khớp trên ~5-20% bảng -> Seq Scan RẺ HƠN.\n" +
        "--    Đây thường KHÔNG phải lỗi — optimizer đang đúng.\n" +
        "\n" +
        "-- 2) HÀM/BIỂU THỨC BỌC CỘT (mất tính sargable)\n" +
        "SELECT * FROM orders WHERE DATE(created_at) = \u00272026-09-05\u0027;       -- không dùng index\n" +
        "SELECT * FROM orders WHERE created_at >= \u00272026-09-05\u0027\n" +
        "                       AND created_at <  \u00272026-09-06\u0027;            -- dùng được\n" +
        "\n" +
        "-- 3) ÉP KIỂU NGẦM: cột TEXT so với số, hoặc join hai cột khác kiểu\n" +
        "\n" +
        "-- 4) STATISTICS CŨ -> optimizer ước lượng sai số hàng\n" +
        "ANALYZE orders;\n" +
        "SELECT last_analyze, last_autoanalyze, n_live_tup, n_dead_tup\n" +
        "FROM pg_stat_user_tables WHERE relname = \u0027orders\u0027;\n" +
        "\n" +
        "-- 5) KHÔNG KHỚP TIỀN TỐ TRÁI của composite index\n" +
        "\n" +
        "-- 6) CỘT CHỌN LỌC KÉM: status chỉ có 3 giá trị và \u0027NEW\u0027 chiếm 60% bảng\n" +
        "--    -> index vô dụng. Cân nhắc PARTIAL INDEX:\n" +
        "CREATE INDEX idx_orders_new ON orders (created_at) WHERE status = \u0027NEW\u0027;\n" +
        "\n" +
        "-- 7) OR giữa các cột khác nhau -> xem câu về OR\n" +
        "\n" +
        "-- 8) THAM SỐ CHI PHÍ sai với phần cứng thật (SSD mà vẫn để mặc định HDD)\n" +
        "SET random_page_cost = 1.1;         -- SSD: nên hạ từ 4.0 xuống ~1.1\n" +
        "SET effective_cache_size = \u002712GB\u0027;  -- báo cho optimizer biết RAM cache thật\n" +
        "\n" +
        "-- Kiểm chứng nhanh: ép tắt seq scan để xem plan dùng index có thật sự nhanh hơn\n" +
        "SET enable_seqscan = off;\n" +
        "EXPLAIN ANALYZE SELECT * FROM orders WHERE status = \u0027NEW\u0027;\n" +
        "SET enable_seqscan = on;            -- CHỈ dùng để CHẨN ĐOÁN, không để trong code",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-15fqxp9',
  q: 'Đọc EXPLAIN / EXPLAIN ANALYZE — chú ý những gì?',
  answer:
    '- `EXPLAIN`: kế hoạch + **ước lượng** (rows, cost).\n' +
    '- `EXPLAIN ANALYZE`: **chạy thật** + số liệu thực (actual rows, actual time, loops, buffers).\n\n' +
    'Đọc từ **lá lên gốc**. Cần soi:\n' +
    '- **Chênh lệch estimated vs actual rows** lớn → stats sai → plan tệ.\n' +
    '- **Seq Scan** trên bảng lớn khi lẽ ra nên Index Scan.\n' +
    '- **Nested Loop** với inner side chạy hàng triệu `loops`.\n' +
    '- **Sort / Hash** tràn ra đĩa (`external merge Disk`).\n' +
    '- Node tốn nhiều thời gian nhất (actual time cộng dồn).\n' +
    '- `Rows Removed by Filter` cao → thiếu index đúng.',
  essence:
    '`EXPLAIN ANALYZE` là sự thật. Điểm chẩn đoán số một: nơi estimated rows lệch xa actual rows — đó là chỗ optimizer "mù" và chọn sai join/scan.',
  example:
    'Plan cho thấy `Nested Loop` với inner `Index Scan` chạy `loops=2,000,000`, mỗi loop 0.01ms → 20s. Optimizer ước lượng outer trả 10 hàng nhưng thực tế 2 triệu (stats cũ). `ANALYZE` bảng → optimizer chuyển sang `Hash Join` → 400ms.',
  viz: {
    type: 'tree',
    title: 'Đọc EXPLAIN ANALYZE (từ lá lên gốc) — EXPLAIN ANALYZE là sự thật',
    root: {
      label: 'Điểm chẩn đoán #1: nơi estimated rows lệch xa actual rows',
      children: [
        { label: 'Chênh lệch estimated vs actual rows lớn', note: 'stats sai → plan tệ' },
        { label: 'Seq Scan trên bảng lớn khi lẽ ra Index Scan' },
        { label: 'Nested Loop với inner chạy hàng triệu loops' },
        { label: 'Sort / Hash tràn ra đĩa (external merge Disk)' },
        { label: 'Rows Removed by Filter cao → thiếu index đúng' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Bốn thứ cần nhìn, theo thứ tự",
      code:
        "EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)\n" +
        "SELECT c.name, COUNT(*) FROM customers c\n" +
        "JOIN orders o ON o.customer_id = c.id\n" +
        "WHERE o.created_at > \u00272026-01-01\u0027 GROUP BY c.name;\n" +
        "\n" +
        "-- EXPLAIN       — chỉ ước lượng, KHÔNG chạy câu lệnh\n" +
        "-- EXPLAIN ANALYZE — THỰC SỰ CHẠY và đo thời gian thật\n" +
        "--   (cẩn thận: ANALYZE trên UPDATE/DELETE sẽ THAY ĐỔI dữ liệu thật!\n" +
        "--    Bọc trong BEGIN; ... ROLLBACK; khi cần)\n" +
        "\n" +
        "-- BỐN THỨ CẦN NHÌN, theo thứ tự ưu tiên:\n" +
        "-- 1) LỆCH ƯỚC LƯỢNG: rows=1000 (ước lượng) vs actual rows=500000\n" +
        "--    -> đây là nguyên nhân gốc của phần lớn plan tệ. Chữa: ANALYZE,\n" +
        "--       tăng statistics target, hoặc tạo extended statistics.\n" +
        "ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;\n" +
        "CREATE STATISTICS stat_orders (dependencies) ON customer_id, status FROM orders;\n" +
        "\n" +
        "-- 2) NODE TỐN THỜI GIAN NHẤT: đọc từ trong ra ngoài, tìm actual time lớn nhất.\n" +
        "--    Nhớ nhân với \"loops\": (actual time=0.5 rows=1 loops=100000) là 50 giây.\n" +
        "\n" +
        "-- 3) LOẠI SCAN: Seq Scan trên bảng lớn với điều kiện chọn lọc -> thiếu index.\n" +
        "--    Nested Loop với loops rất lớn -> thường do ước lượng sai.\n" +
        "\n" +
        "-- 4) BUFFERS: shared hit = đọc từ cache (rẻ), read = đọc từ đĩa (đắt).\n" +
        "--    Đây là thước đo I/O thật sự, đáng tin hơn thời gian (vốn phụ thuộc cache).\n" +
        "\n" +
        "-- Dán plan vào explain.dalibo.com hoặc explain.depesz.com để đọc trực quan.\n" +
        "-- Bật ghi log câu chậm để có plan của truy vấn thật ở production:\n" +
        "--   auto_explain.log_min_duration = \u00271s\u0027",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-3yha27',
  q: 'Nested loop, hash join và merge join — khi nào DB chọn cái nào?',
  answer:
    '- **Nested Loop**: với mỗi hàng bảng ngoài, tra bảng trong (thường qua index). Tốt khi **bảng ngoài nhỏ** và bảng trong có index trên cột join. Tệ khi bảng ngoài lớn (N × chi phí tra trong).\n' +
    '- **Hash Join**: build hash table từ bảng nhỏ hơn, probe bằng bảng lớn. Tốt cho **join hai tập lớn** không có index phù hợp, điều kiện **bằng**. Tốn RAM (spill ra đĩa nếu lớn).\n' +
    '- **Merge Join**: cả hai đầu vào đã **sắp xếp** theo cột join → quét song song. Tốt khi dữ liệu đã sorted (từ index) hoặc cần sort dù sao.',
  essence:
    'Nested loop cho "ít hàng ngoài + index bên trong". Hash join cho "hai tập lớn, join bằng". Merge join cho "đã sắp xếp sẵn". Optimizer chọn theo kích thước ước lượng và index sẵn có.',
  example:
    '`orders JOIN customers ON orders.customer_id = customers.id` khi lọc `orders` còn 50 hàng: nested loop + index PK `customers` — nhanh. Khi join **toàn bộ** 10M orders với 2M customers cho báo cáo: hash join.',
  viz: {
    type: 'compare',
    cols: ['Nested Loop', 'Hash Join', 'Merge Join'],
    rows: [
      ['Cách', 'mỗi hàng ngoài → tra bảng trong (qua index)', 'build hash từ bảng nhỏ, probe bằng bảng lớn', 'cả hai đầu vào đã sắp xếp → quét song song'],
      ['Tốt khi', 'bảng ngoài NHỎ + index bên trong', 'hai tập LỚN, join BẰNG, không index phù hợp', 'dữ liệu đã sorted (từ index)'],
      ['Tệ khi', 'bảng ngoài lớn (N × chi phí tra)', 'tốn RAM (spill đĩa)', '—'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ba thuật toán join và điều kiện phù hợp",
      code:
        "-- NESTED LOOP: với mỗi hàng bảng ngoài, tra bảng trong.\n" +
        "--   Chi phí ~ N * chi phí tra cứu. NHANH khi bảng ngoài NHỎ và bảng trong\n" +
        "--   có INDEX trên cột join. Là lựa chọn duy nhất cho join không phải \"=\".\n" +
        "EXPLAIN SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id\n" +
        "WHERE o.id = 123;                    -- 1 hàng ngoài -> nested loop hoàn hảo\n" +
        "\n" +
        "-- HASH JOIN: dựng bảng băm từ bảng NHỎ HƠN, quét bảng lớn và dò.\n" +
        "--   Chi phí ~ N + M. TỐT NHẤT khi join hai bảng LỚN, không cần index.\n" +
        "--   Chỉ dùng được cho điều kiện BẰNG (=).\n" +
        "EXPLAIN SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id;\n" +
        "SHOW work_mem;    -- bảng băm không vừa work_mem -> tràn ra ĐĨA -> chậm hẳn\n" +
        "SET work_mem = \u002764MB\u0027;\n" +
        "\n" +
        "-- MERGE JOIN: sắp xếp cả hai bên rồi quét song song như trộn hai danh sách.\n" +
        "--   Tốt khi dữ liệu ĐÃ sắp xếp sẵn (có index phù hợp) hoặc kết quả cần\n" +
        "--   sắp xếp sau đó. Xử lý được cả bất đẳng thức.\n" +
        "\n" +
        "-- OPTIMIZER TỰ CHỌN dựa trên ước lượng SỐ HÀNG và statistics.\n" +
        "-- Chọn SAI gần như luôn bắt nguồn từ ƯỚC LƯỢNG SAI, không phải từ thuật toán.\n" +
        "-- Triệu chứng kinh điển: Nested Loop với loops=2.000.000 vì optimizer\n" +
        "-- tưởng bảng ngoài chỉ có 10 hàng.\n" +
        "\n" +
        "-- Chẩn đoán (chỉ để thử nghiệm, đừng để trong code production):\n" +
        "SET enable_hashjoin = off;\n" +
        "EXPLAIN ANALYZE SELECT ...;\n" +
        "RESET enable_hashjoin;\n" +
        "-- Cách chữa đúng là sửa statistics/index, không phải tắt thuật toán.",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-1vrkqib',
  q: 'Predicate "sargable" là gì? Hàm trên cột phá index thế nào?',
  answer:
    'SARGable (Search ARGument able) = predicate mà DB có thể dùng index để định vị. Yêu cầu: **cột đứng một mình một vế**, so sánh với hằng/tham số.\n\n' +
    'Phá SARGability:\n' +
    '- `WHERE YEAR(created_at) = 2024` → bọc hàm quanh cột.\n' +
    '- `WHERE price * 1.1 > 100` → biểu thức trên cột.\n' +
    '- `WHERE amount + 0 = 50`, `WHERE CAST(id AS text) = ?`.\n' +
    '- `WHERE col LIKE \'%abc%\'` (leading wildcard).\n\n' +
    'Sửa: viết lại để cột đứng một mình (`created_at >= \'2024-01-01\' AND < \'2025-01-01\'`), hoặc tạo **functional index** trên biểu thức đó.',
  essence:
    'Index được xây trên **giá trị cột**, không phải trên `f(cột)`. Đưa hàm/biểu thức về vế hằng, hoặc index chính cái biểu thức đó.',
  example:
    '`WHERE lower(email) = \'a@b.com\'` chậm → `CREATE INDEX idx_email_lower ON users (lower(email))` → sargable trở lại. Hoặc chuẩn hoá email về lowercase khi ghi và so sánh trực tiếp.',
  viz: {
    type: 'flow',
    title: 'Predicate "sargable" — cột đứng một mình một vế',
    nodes: ['index xây trên GIÁ TRỊ CỘT, không phải f(cột)', 'WHERE YEAR(created_at) = 2024 → bọc hàm → phá index', 'viết lại: created_at >= "2024-01-01" AND < "2025-01-01"', 'hoặc: functional index CREATE INDEX ON t (YEAR(created_at))'],
    steps: [
      { to: 1, label: 'cũng phá: price * 1.1 > 100, CAST(id AS text) = ?, LIKE "%abc%"' },
      { to: 3, label: 'đưa hàm/biểu thức về vế hằng, hoặc index chính biểu thức đó' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Điều kiện dùng được index",
      code:
        "-- SARGable = Search ARGument able: điều kiện mà DB có thể dùng index để\n" +
        "-- THU HẸP phạm vi tìm kiếm, thay vì phải tính trên từng hàng.\n" +
        "\n" +
        "-- KHÔNG SARGABLE — hàm bọc cột:\n" +
        "SELECT * FROM orders WHERE YEAR(created_at) = 2026;\n" +
        "SELECT * FROM orders WHERE UPPER(email) = \u0027A@X.COM\u0027;\n" +
        "SELECT * FROM orders WHERE amount * 1.1 > 100;\n" +
        "SELECT * FROM orders WHERE CAST(id AS TEXT) = \u0027123\u0027;\n" +
        "SELECT * FROM users  WHERE email LIKE \u0027%@gmail.com\u0027;        -- không có tiền tố\n" +
        "\n" +
        "-- VIẾT LẠI CHO SARGABLE — chuyển phép biến đổi sang phía HẰNG SỐ:\n" +
        "SELECT * FROM orders WHERE created_at >= \u00272026-01-01\u0027\n" +
        "                       AND created_at <  \u00272027-01-01\u0027;\n" +
        "SELECT * FROM orders WHERE amount > 100 / 1.1;\n" +
        "SELECT * FROM orders WHERE id = 123;\n" +
        "\n" +
        "-- KHÔNG viết lại được -> tạo EXPRESSION INDEX (Postgres):\n" +
        "CREATE INDEX idx_users_email_lower ON users (LOWER(email));\n" +
        "SELECT * FROM users WHERE LOWER(email) = \u0027a@x.com\u0027;         -- giờ dùng được index\n" +
        "\n" +
        "-- Hoặc GENERATED COLUMN (MySQL, Postgres 12+):\n" +
        "ALTER TABLE orders ADD COLUMN created_date DATE\n" +
        "  GENERATED ALWAYS AS (created_at::date) STORED;\n" +
        "CREATE INDEX idx_orders_date ON orders (created_date);\n" +
        "\n" +
        "-- Tìm chuỗi ở GIỮA -> B-tree bó tay, dùng trigram index:\n" +
        "CREATE EXTENSION pg_trgm;\n" +
        "CREATE INDEX idx_users_email_trgm ON users USING GIN (email gin_trgm_ops);\n" +
        "SELECT * FROM users WHERE email LIKE \u0027%gmail%\u0027;             -- giờ dùng được\n" +
        "\n" +
        "-- NGUYÊN TẮC: giữ CỘT ở dạng \"trần\" một bên của phép so sánh.",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-80zkjg',
  q: 'Statistics của optimizer là gì? Vì sao "stats cũ" gây plan tệ?',
  answer:
    'DB lưu thống kê về mỗi bảng/cột: số hàng, số giá trị distinct (n_distinct), histogram phân bố, giá trị phổ biến nhất, tỉ lệ NULL. Optimizer dùng chúng để **ước lượng số hàng** mỗi bước → chọn scan/join/order.\n\n' +
    'Stats cũ (sau khi bulk load, sau khi xoá/thêm nhiều) → ước lượng sai → chọn nested loop khi nên hash join, chọn seq scan khi nên index...\n\n' +
    'Cập nhật: `ANALYZE table` (Postgres, tự động qua autovacuum), `ANALYZE TABLE` (MySQL), auto-update stats (SQL Server).',
  essence:
    'Optimizer "nhìn thế giới" qua statistics. Nếu chúng lệch thực tế, mọi quyết định chi phí đều sai. Sau ETL/bulk operation lớn, luôn `ANALYZE`.',
  example:
    'Sau khi import 5 triệu hàng vào bảng vừa tạo, chạy report → cực chậm vì optimizer tưởng bảng có ~0 hàng (chưa ANALYZE) → chọn nested loop. Chạy `ANALYZE orders` → plan chuyển sang hash join, report từ 5 phút xuống 8 giây.',
  viz: {
    type: 'flow',
    title: 'Optimizer statistics — "nhìn thế giới" qua stats',
    nodes: ['DB lưu stats: số hàng, n_distinct, histogram, MCV, tỉ lệ NULL', 'optimizer ước lượng số hàng mỗi bước', 'chọn scan / join / order theo chi phí', 'stats cũ (sau bulk load / xoá nhiều) → ước lượng sai → plan tệ'],
    steps: [
      { to: 3, label: 'chọn nested loop khi nên hash join, seq scan khi nên index' },
      { to: 3, label: 'cập nhật: ANALYZE (Postgres tự qua autovacuum); sau ETL/bulk LUÔN ANALYZE' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Optimizer quyết định dựa trên ước lượng, không phải dữ liệu thật",
      code:
        "-- DB lưu thống kê phân phối dữ liệu: số hàng, số giá trị khác nhau,\n" +
        "-- giá trị phổ biến nhất, histogram, tỉ lệ NULL.\n" +
        "SELECT attname, n_distinct, null_frac, most_common_vals, correlation\n" +
        "FROM pg_stats WHERE tablename = \u0027orders\u0027;\n" +
        "\n" +
        "ANALYZE orders;                     -- cập nhật thủ công\n" +
        "VACUUM ANALYZE orders;              -- dọn dead tuple + cập nhật stats\n" +
        "\n" +
        "SELECT relname, last_analyze, last_autoanalyze, n_mod_since_analyze\n" +
        "FROM pg_stat_user_tables WHERE relname = \u0027orders\u0027;\n" +
        "\n" +
        "-- VÌ SAO STATS CŨ GÂY PLAN TỆ: optimizer tưởng bảng có 1.000 hàng nên chọn\n" +
        "-- Nested Loop; thực tế đã có 10 triệu hàng -> câu lệnh chạy hàng giờ.\n" +
        "-- Kịch bản kinh điển: vừa nạp lượng lớn dữ liệu -> autovacuum chưa kịp chạy\n" +
        "-- -> mọi truy vấn đột nhiên chậm. Cách chữa: ANALYZE ngay sau khi nạp.\n" +
        "\n" +
        "-- TĂNG ĐỘ CHI TIẾT cho cột có phân phối lệch:\n" +
        "ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;   -- mặc định 100\n" +
        "ANALYZE orders;\n" +
        "\n" +
        "-- EXTENDED STATISTICS — cho cột TƯƠNG QUAN với nhau. Optimizer mặc định\n" +
        "-- giả định các cột ĐỘC LẬP, nên ước lượng sai nặng khi chúng liên quan\n" +
        "-- (ví dụ city và district):\n" +
        "CREATE STATISTICS stat_city_district (dependencies, ndistinct)\n" +
        "  ON city, district FROM addresses;\n" +
        "ANALYZE addresses;\n" +
        "\n" +
        "-- AUTOVACUUM: chỉnh riêng cho bảng ghi nhiều\n" +
        "ALTER TABLE orders SET (autovacuum_analyze_scale_factor = 0.02);",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-15vw1ot',
  q: 'Partial index (filtered index) dùng khi nào?',
  answer:
    'Index chỉ trên **tập con hàng** thoả điều kiện: `CREATE INDEX idx ON orders (created_at) WHERE status = \'PENDING\'`.\n\n' +
    'Lợi ích: index **nhỏ hơn nhiều** (chỉ vài % bảng), rẻ để duy trì, cache tốt. Dùng khi truy vấn luôn kèm cùng một điều kiện lọc, hoặc để enforce unique có điều kiện.\n\n' +
    'Postgres và SQL Server hỗ trợ; MySQL không (dùng generated column + index như workaround).',
  essence:
    'Partial index tập trung "sức mạnh index" vào đúng phần dữ liệu bạn hay truy vấn (hàng active, hàng pending, hàng chưa xử lý) thay vì index cả bảng gồm phần bạn không bao giờ hỏi.',
  example:
    'Bảng `jobs` 100M hàng, 99.9% đã `DONE`, worker chỉ query `WHERE status = \'QUEUED\' ORDER BY priority`: `CREATE INDEX ON jobs (priority) WHERE status = \'QUEUED\'` → index chỉ ~100k mục thay vì 100M. Unique có điều kiện: `CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL` (cho phép trùng email ở hàng đã soft-delete).',
  viz: {
    type: 'tree',
    title: 'Partial index — tập trung "sức mạnh index" vào phần dữ liệu hay truy vấn',
    root: {
      label: 'CREATE INDEX ... WHERE status = "PENDING"',
      children: [
        { label: 'Index nhỏ hơn NHIỀU (vài % bảng)', note: 'rẻ duy trì, cache tốt' },
        { label: 'Dùng khi truy vấn luôn kèm cùng một điều kiện lọc', note: 'jobs WHERE status = "QUEUED" — index ~100k thay vì 100M' },
        { label: 'Enforce unique có điều kiện', note: 'UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL' },
        { label: 'Postgres, SQL Server hỗ trợ; MySQL không (dùng generated column)' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Chỉ đánh index phần dữ liệu thật sự được truy vấn",
      code:
        "-- Bảng 100 triệu đơn, nhưng chỉ ~1000 đơn đang PENDING và mọi truy vấn\n" +
        "-- vận hành đều tìm đúng nhóm đó.\n" +
        "CREATE INDEX idx_orders_pending ON orders (created_at)\n" +
        "WHERE status = \u0027PENDING\u0027;\n" +
        "-- Index chỉ chứa 1000 hàng thay vì 100 triệu -> nhỏ hơn hàng nghìn lần,\n" +
        "-- nằm gọn trong cache, và ghi vào bảng cũng rẻ hơn (chỉ cập nhật khi\n" +
        "-- hàng thoả điều kiện).\n" +
        "\n" +
        "SELECT * FROM orders WHERE status = \u0027PENDING\u0027 ORDER BY created_at;   -- dùng index\n" +
        "-- ĐIỀU KIỆN: câu truy vấn phải chứa điều kiện KHỚP với WHERE của index\n" +
        "-- (optimizer phải chứng minh được truy vấn nằm trong tập con đó).\n" +
        "\n" +
        "-- CÁC ỨNG DỤNG PHỔ BIẾN:\n" +
        "-- 1) soft delete — chỉ index bản ghi còn sống\n" +
        "CREATE INDEX idx_users_active ON users (email) WHERE deleted_at IS NULL;\n" +
        "\n" +
        "-- 2) UNIQUE có điều kiện — điều mà UNIQUE constraint thường không làm được\n" +
        "CREATE UNIQUE INDEX uq_users_email_active ON users (email) WHERE deleted_at IS NULL;\n" +
        "-- -> email chỉ cần duy nhất trong số user CHƯA bị xoá.\n" +
        "\n" +
        "-- 3) loại bỏ giá trị phổ biến vô nghĩa\n" +
        "CREATE INDEX idx_orders_note ON orders (note) WHERE note IS NOT NULL;\n" +
        "\n" +
        "-- 4) bảng hàng đợi — chỉ index việc chưa xử lý\n" +
        "CREATE INDEX idx_jobs_todo ON jobs (created_at) WHERE processed_at IS NULL;\n" +
        "\n" +
        "-- MySQL KHÔNG hỗ trợ partial index (chỉ có prefix index trên chuỗi).\n" +
        "-- SQL Server gọi là filtered index, cú pháp tương tự.",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-1s0s1np',
  q: 'Over-indexing: chi phí của việc có quá nhiều index?',
  answer:
    'Mỗi index phải được **cập nhật** khi `INSERT`/`UPDATE`(cột index)/`DELETE` → **write amplification**: một insert vào bảng 10 index = 11 lần ghi cấu trúc.\n\n' +
    'Chi phí khác: tốn dung lượng đĩa/RAM (index cạnh tranh page cache với dữ liệu), làm optimizer chậm hơn (nhiều lựa chọn), index trùng lặp/không dùng.\n\n' +
    'Rà soát: `pg_stat_user_indexes` (idx_scan = 0 → không dùng), `sys.dm_db_index_usage_stats` (SQL Server), `sys.schema_unused_indexes` (MySQL).',
  essence:
    'Index tăng tốc đọc nhưng đánh thuế mọi lần ghi. Bảng ghi nhiều nên có ít index, được chọn lọc. Xoá index không ai dùng là một cách tối ưu ghi.',
  example:
    'Bảng `events` insert 20k/s có 8 index, phần lớn tạo "phòng khi cần": insert latency cao, WAL lớn. Audit cho thấy 3 index `idx_scan = 0` trong 30 ngày → drop → throughput ghi tăng ~40%.',
  viz: {
    type: 'flow',
    title: 'Over-indexing — index đánh thuế MỌI lần ghi',
    nodes: ['mỗi index cập nhật khi INSERT/UPDATE(cột index)/DELETE', 'write amplification: 1 insert vào bảng 10 index = 11 lần ghi', 'tốn đĩa/RAM (cạnh tranh page cache), optimizer chậm hơn', 'rà soát pg_stat_user_indexes (idx_scan = 0) → drop'],
    steps: [
      { to: 2, label: 'bảng ghi nhiều nên có ÍT index, được chọn lọc' },
      { to: 3, label: 'xoá index không ai dùng là một cách tối ưu ghi' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Mỗi index là một cái giá phải trả cho mọi lần ghi",
      code:
        "-- CHI PHÍ:\n" +
        "-- 1) GHI CHẬM: mỗi INSERT/UPDATE/DELETE phải cập nhật MỌI index liên quan.\n" +
        "--    10 index -> một INSERT thành 11 thao tác ghi.\n" +
        "-- 2) ĐĨA: index có thể chiếm nhiều dung lượng hơn cả bảng.\n" +
        "-- 3) BỘ NHỚ: index cạnh tranh cache với dữ liệu thật.\n" +
        "-- 4) OPTIMIZER: nhiều lựa chọn hơn -> lập kế hoạch lâu hơn, và dễ chọn sai.\n" +
        "-- 5) VACUUM/bảo trì lâu hơn.\n" +
        "\n" +
        "-- TÌM INDEX KHÔNG DÙNG (Postgres):\n" +
        "SELECT schemaname, relname, indexrelname, idx_scan,\n" +
        "       pg_size_pretty(pg_relation_size(indexrelid)) AS size\n" +
        "FROM pg_stat_user_indexes\n" +
        "WHERE idx_scan = 0 AND indexrelname NOT LIKE \u0027%_pkey\u0027\n" +
        "ORDER BY pg_relation_size(indexrelid) DESC;\n" +
        "-- idx_scan = 0 sau vài tuần chạy production -> ứng viên để xoá.\n" +
        "-- Lưu ý: thống kê này reset khi restart, và index phục vụ ràng buộc UNIQUE\n" +
        "-- thì không xoá được.\n" +
        "\n" +
        "-- TÌM INDEX TRÙNG LẶP: (a) là thừa nếu đã có (a, b)\n" +
        "SELECT indrelid::regclass, array_agg(indexrelid::regclass)\n" +
        "FROM pg_index GROUP BY indrelid, indkey HAVING COUNT(*) > 1;\n" +
        "\n" +
        "-- So sánh dung lượng index và bảng:\n" +
        "SELECT pg_size_pretty(pg_relation_size(\u0027orders\u0027)) AS bang,\n" +
        "       pg_size_pretty(pg_indexes_size(\u0027orders\u0027)) AS index;\n" +
        "\n" +
        "-- Xoá an toàn: đánh dấu vô hiệu trước, quan sát, rồi mới xoá hẳn\n" +
        "BEGIN; UPDATE pg_index SET indisvalid = false WHERE indexrelid = \u0027idx_x\u0027::regclass; COMMIT;\n" +
        "DROP INDEX CONCURRENTLY idx_x;      -- CONCURRENTLY: không khoá bảng",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-1ml92h2',
  q: 'Tìm kiếm chuỗi: `LIKE \'abc%\'` vs `\'%abc%\'` — index nào giúp?',
  answer:
    '- `LIKE \'abc%\'` (prefix): B-tree index trên cột **dùng được** (là một range scan).\n' +
    '- `LIKE \'%abc%\'` hoặc `\'%abc\'` (infix/suffix): B-tree **vô dụng** → seq scan.\n\n' +
    'Cho infix search:\n' +
    '- **Postgres**: `pg_trgm` extension + **GIN index** trên `gin_trgm_ops` → `LIKE \'%abc%\'` và `ILIKE` dùng được index.\n' +
    '- **Full-text search**: `tsvector` + GIN cho tìm theo từ (không phải substring).\n' +
    '- Hoặc dùng search engine (Elasticsearch, Meilisearch) cho nhu cầu nghiêm túc.',
  essence:
    'B-tree chỉ giúp prefix. Substring search cần cấu trúc index khác (trigram GIN) hoặc một hệ search chuyên dụng — đừng để `LIKE \'%x%\'` scan bảng triệu hàng.',
  example:
    'Ô tìm kiếm "gõ tới đâu lọc tới đó" trên tên sản phẩm 2M hàng: `CREATE INDEX ON products USING gin (name gin_trgm_ops)` → `WHERE name ILIKE \'%\' || :q || \'%\'` dùng index, ~vài ms thay vì full scan.',
  viz: {
    type: 'compare',
    cols: ["LIKE 'abc%' (prefix)", "LIKE '%abc%' (infix/suffix)"],
    rows: [
      ['B-tree index trên cột', 'DÙNG được (range scan)', 'VÔ DỤNG → seq scan'],
      ['Giải pháp', '—', 'Postgres: pg_trgm + GIN index (gin_trgm_ops)'],
      ['Cho nhu cầu nghiêm túc', '—', 'full-text (tsvector + GIN) hoặc search engine (Elasticsearch)'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Tiền tố dùng được B-tree, phần giữa thì không",
      code:
        "-- TIỀN TỐ CỐ ĐỊNH -> B-tree dùng được (quét theo khoảng)\n" +
        "CREATE INDEX idx_users_name ON users (name);\n" +
        "SELECT * FROM users WHERE name LIKE \u0027Nguyen%\u0027;        -- dùng index\n" +
        "\n" +
        "-- KÝ TỰ ĐẠI DIỆN Ở ĐẦU -> B-tree bó tay, phải quét toàn bảng\n" +
        "SELECT * FROM users WHERE name LIKE \u0027%Nguyen%\u0027;       -- Seq Scan\n" +
        "SELECT * FROM users WHERE name LIKE \u0027%Nguyen\u0027;        -- Seq Scan\n" +
        "\n" +
        "-- LƯU Ý về COLLATION (Postgres): index B-tree thường dùng collation\n" +
        "-- của locale nên KHÔNG hỗ trợ LIKE tiền tố. Cần index với text_pattern_ops:\n" +
        "CREATE INDEX idx_users_name_pattern ON users (name text_pattern_ops);\n" +
        "\n" +
        "-- TÌM KIẾM KHÔNG PHÂN BIỆT HOA THƯỜNG:\n" +
        "CREATE INDEX idx_users_name_lower ON users (LOWER(name));\n" +
        "SELECT * FROM users WHERE LOWER(name) LIKE \u0027nguyen%\u0027;\n" +
        "\n" +
        "-- TÌM CHUỖI Ở GIỮA -> TRIGRAM INDEX\n" +
        "CREATE EXTENSION IF NOT EXISTS pg_trgm;\n" +
        "CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);\n" +
        "SELECT * FROM users WHERE name ILIKE \u0027%nguyen%\u0027;      -- giờ dùng được index\n" +
        "SELECT * FROM users WHERE name % \u0027Nguyen Van\u0027;        -- tìm gần đúng (similarity)\n" +
        "\n" +
        "-- TÌM KIẾM HẬU TỐ: đánh index trên chuỗi ĐẢO NGƯỢC\n" +
        "CREATE INDEX idx_users_name_rev ON users (REVERSE(name) text_pattern_ops);\n" +
        "SELECT * FROM users WHERE REVERSE(name) LIKE REVERSE(\u0027%anh\u0027);\n" +
        "\n" +
        "-- TÌM KIẾM TOÀN VĂN (nhiều từ, xếp hạng, stemming) -> dùng tsvector/GIN\n" +
        "-- hoặc search engine chuyên dụng, không dùng LIKE.",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-1mcgf0r',
  q: 'Truy vấn với `OR` — vì sao chậm và viết lại thế nào?',
  answer:
    '`WHERE a = 1 OR b = 2` — nếu `a` và `b` ở hai index khác nhau, DB thường không thể dùng một index cho cả hai vế → seq scan (hoặc bitmap OR nếu hỗ trợ).\n\n' +
    'Viết lại:\n' +
    '- **`UNION`** hai truy vấn, mỗi cái dùng một index: `SELECT ... WHERE a = 1 UNION SELECT ... WHERE b = 2`.\n' +
    '- Postgres: **bitmap index scan** có thể OR nhiều index (kiểm tra EXPLAIN).\n' +
    '- `OR` trên cùng một cột → `IN (...)` (dùng index tốt).',
  essence:
    '`OR` giữa các cột khác nhau chia truy vấn thành hai bài toán index riêng. `UNION` (hoặc `UNION ALL` + dedup) cho phép mỗi nhánh dùng index tối ưu của nó.',
  example:
    '`WHERE email = ? OR phone = ?` (login bằng email hoặc phone) → seq scan. Viết lại: `SELECT * FROM users WHERE email = :x UNION SELECT * FROM users WHERE phone = :x` → mỗi nhánh dùng index tương ứng, nhanh.',
  viz: {
    type: 'flow',
    title: 'OR giữa các cột khác nhau',
    nodes: ['WHERE a = 1 OR b = 2 (a, b ở hai index khác nhau)', 'DB không dùng một index cho cả hai vế → seq scan', 'viết lại: SELECT ... WHERE a = 1 UNION SELECT ... WHERE b = 2', 'mỗi nhánh dùng index tối ưu của nó'],
    steps: [
      { to: 1, label: 'Postgres: bitmap index scan có thể OR nhiều index — kiểm tra EXPLAIN' },
      { to: 3, label: 'OR trên CÙNG một cột → IN (...) (dùng index tốt)' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "OR giữa các cột khác nhau làm optimizer bó tay",
      code:
        "-- Có index riêng trên email và phone, nhưng câu này thường vẫn Seq Scan:\n" +
        "SELECT * FROM users WHERE email = \u0027a@x.com\u0027 OR phone = \u00270901234567\u0027;\n" +
        "-- Lý do: một lần quét index chỉ trả lời được MỘT vế. DB phải hoặc quét\n" +
        "-- toàn bảng, hoặc dùng bitmap kết hợp (không phải lúc nào cũng chọn).\n" +
        "\n" +
        "-- VIẾT LẠI 1: UNION ALL — mỗi vế dùng đúng index của nó\n" +
        "SELECT * FROM users WHERE email = \u0027a@x.com\u0027\n" +
        "UNION\n" +
        "SELECT * FROM users WHERE phone = \u00270901234567\u0027;\n" +
        "-- Dùng UNION (không phải ALL) khi hàng có thể thoả cả hai vế và cần khử trùng.\n" +
        "\n" +
        "-- VIẾT LẠI 2: OR trên CÙNG MỘT CỘT -> đổi thành IN (thường dùng được index)\n" +
        "SELECT * FROM orders WHERE status = \u0027NEW\u0027 OR status = \u0027PENDING\u0027;\n" +
        "SELECT * FROM orders WHERE status IN (\u0027NEW\u0027, \u0027PENDING\u0027);          -- rõ hơn, tốt hơn\n" +
        "\n" +
        "-- VIẾT LẠI 3: OR với NULL -> điều kiện riêng\n" +
        "SELECT * FROM orders WHERE status = \u0027NEW\u0027 OR status IS NULL;\n" +
        "-- Postgres xử lý được tốt; nếu chậm thì tách UNION ALL.\n" +
        "\n" +
        "-- BITMAP INDEX SCAN của Postgres CÓ THỂ kết hợp nhiều index cho OR:\n" +
        "EXPLAIN ANALYZE SELECT * FROM users WHERE email = \u0027a@x.com\u0027 OR phone = \u0027090\u0027;\n" +
        "-- -> \"BitmapOr\" nghĩa là nó đã làm được. Không thấy thì cân nhắc UNION.\n" +
        "\n" +
        "-- OR TRONG ĐIỀU KIỆN JOIN gần như luôn là thảm hoạ:\n" +
        "SELECT * FROM a JOIN b ON a.x = b.x OR a.y = b.y;\n" +
        "-- -> tách thành hai join rồi UNION.\n" +
        "\n" +
        "-- MẪU HAY GẶP TRONG ORM: bộ lọc tuỳ chọn\n" +
        "SELECT * FROM orders WHERE (:status IS NULL OR status = :status);\n" +
        "-- -> plan bị \"đông cứng\" cho mọi trường hợp. Nên dựng câu lệnh ĐỘNG,\n" +
        "-- chỉ thêm điều kiện thật sự có giá trị.",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-7zzjto',
  q: 'Index bloat và fillfactor là gì?',
  answer:
    '**Bloat**: theo thời gian, `UPDATE`/`DELETE` để lại "khoảng trống" trong index (Postgres: dead tuple; nói chung: page nửa rỗng) → index to hơn dữ liệu thực cần → chậm hơn, tốn cache.\n\n' +
    '**Fillfactor**: % page được điền khi tạo index/bảng (mặc định ~90). Đặt thấp hơn (70) để chừa chỗ cho `UPDATE` tại chỗ (HOT update trong Postgres) → giảm page split và bloat cho bảng update nhiều.\n\n' +
    'Khắc phục bloat: `REINDEX` (Postgres `REINDEX CONCURRENTLY`), `OPTIMIZE TABLE` (MySQL), rebuild index (SQL Server). autovacuum tuning.',
  essence:
    'Index không "tự dọn" hoàn hảo — update/delete tạo bloat làm nó phình dần. Fillfactor thấp giảm bloat cho workload update; REINDEX định kỳ cho index nóng.',
  example:
    'Bảng `sessions` update `last_seen` liên tục: index `(last_seen)` phình gấp 3 lần sau vài tuần → query chậm dần. `REINDEX CONCURRENTLY` + đặt `fillfactor = 70` cho bảng → HOT updates, bloat chậm lại.',
  viz: {
    type: 'tree',
    title: 'Index bloat + fillfactor — index không "tự dọn" hoàn hảo',
    root: {
      label: 'UPDATE/DELETE để lại khoảng trống → index to hơn dữ liệu thực cần',
      children: [
        { label: 'Bloat', note: 'Postgres: dead tuple; page nửa rỗng → chậm hơn, tốn cache' },
        { label: 'Fillfactor', note: '% page điền khi tạo (mặc định ~90); đặt 70 → chừa chỗ cho UPDATE tại chỗ (HOT) → giảm page split' },
        { label: 'Khắc phục', note: 'REINDEX CONCURRENTLY (Postgres), OPTIMIZE TABLE (MySQL); autovacuum tuning' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Index phình to vì cập nhật, và cách kiểm soát",
      code:
        "-- Postgres dùng MVCC: UPDATE tạo PHIÊN BẢN MỚI của hàng, phiên bản cũ\n" +
        "-- thành \"dead tuple\". Index vẫn trỏ tới cả hai cho tới khi VACUUM dọn.\n" +
        "-- Bảng cập nhật nhiều -> index phình lên nhiều lần kích thước thật.\n" +
        "\n" +
        "SELECT relname, n_live_tup, n_dead_tup,\n" +
        "       ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,\n" +
        "       last_autovacuum\n" +
        "FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;\n" +
        "\n" +
        "SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid))\n" +
        "FROM pg_stat_user_indexes WHERE relname = \u0027orders\u0027;\n" +
        "\n" +
        "-- CHỮA: dựng lại index KHÔNG khoá bảng\n" +
        "REINDEX INDEX CONCURRENTLY idx_orders_created;      -- Postgres 12+\n" +
        "REINDEX TABLE CONCURRENTLY orders;\n" +
        "\n" +
        "-- FILLFACTOR — chừa chỗ trống trong mỗi trang để cập nhật tại chỗ\n" +
        "ALTER TABLE orders SET (fillfactor = 85);           -- mặc định 100\n" +
        "ALTER INDEX idx_orders_created SET (fillfactor = 80);  -- index mặc định 90\n" +
        "REINDEX TABLE orders;                                -- áp dụng ngay\n" +
        "-- Chỗ trống cho phép HOT update (heap-only tuple): phiên bản mới nằm CÙNG\n" +
        "-- TRANG với bản cũ -> KHÔNG phải cập nhật index -> giảm bloat rất nhiều.\n" +
        "-- Điều kiện HOT: cột được cập nhật KHÔNG nằm trong index nào.\n" +
        "-- ĐÁNH ĐỔI: fillfactor thấp -> bảng chiếm nhiều đĩa hơn, quét tuần tự chậm hơn.\n" +
        "--   bảng chỉ ghi thêm (append-only) -> giữ 100\n" +
        "--   bảng cập nhật nhiều              -> 70-85\n" +
        "\n" +
        "-- CHỈNH AUTOVACUUM cho bảng nóng thay vì chờ ngưỡng mặc định:\n" +
        "ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05);",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-1eo819q',
  q: 'N+1 query problem ở tầng SQL/ORM — nhận diện và sửa?',
  answer:
    'Lấy N hàng cha, rồi vòng lặp chạy một truy vấn con cho **mỗi** hàng → 1 + N truy vấn. Latency = (1 + N) × RTT + N × chi phí query.\n\n' +
    'Sửa:\n' +
    '- **JOIN** lấy cha + con trong một truy vấn.\n' +
    '- **Batch**: `WHERE parent_id IN (:ids)` một lần rồi gom trong app.\n' +
    '- ORM: `JOIN FETCH` / `@EntityGraph` (JPA), `includes`/`preload` (Rails), `select_related`/`prefetch_related` (Django).\n\n' +
    'Phát hiện: log SQL, đếm số query mỗi request, công cụ APM.',
  essence:
    'N+1 là "một câu hỏi lớn bị chia thành N câu hỏi nhỏ". Chi phí không nằm ở mỗi query (nhanh) mà ở **số lượng round-trip**. Gom lại thành 1–2 query.',
  example:
    'Trang 50 bài viết, mỗi bài hiện tên tác giả: ORM lazy load → 1 query bài + 50 query tác giả. `SELECT ... FROM posts p JOIN users u ON u.id = p.author_id` → 1 query. Hoặc `SELECT * FROM users WHERE id IN (<50 author ids>)` → 2 query.',
  viz: {
    type: 'flow',
    title: 'N+1 query — chi phí ở SỐ LƯỢNG round-trip, không phải mỗi query',
    nodes: ['lấy N hàng cha', 'vòng lặp: một truy vấn con cho MỖI hàng', '1 + N truy vấn', 'gom lại thành 1–2 query'],
    steps: [
      { to: 2, label: 'latency = (1 + N) × RTT + N × chi phí query' },
      { to: 3, label: 'JOIN lấy cha + con một truy vấn; hoặc batch WHERE parent_id IN (:ids)' },
      { to: 3, label: 'ORM: JOIN FETCH / @EntityGraph (JPA), select_related (Django)' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Một truy vấn danh sách kéo theo N truy vấn con",
      code:
        "-- TRIỆU CHỨNG trong log: một câu SELECT danh sách, rồi hàng trăm câu\n" +
        "-- SELECT ... WHERE id = ? giống hệt nhau chỉ khác tham số.\n" +
        "SELECT * FROM orders LIMIT 100;                        -- 1 câu\n" +
        "SELECT * FROM customers WHERE id = 1;                  -- rồi 100 câu như thế này\n" +
        "SELECT * FROM customers WHERE id = 2;\n" +
        "\n" +
        "-- SỬA 1: JOIN — lấy tất cả trong một câu\n" +
        "SELECT o.*, c.name AS customer_name\n" +
        "FROM orders o JOIN customers c ON c.id = o.customer_id\n" +
        "LIMIT 100;\n" +
        "\n" +
        "-- SỬA 2: gom thành MỘT câu IN (khi không join được, ví dụ dữ liệu ở service khác)\n" +
        "SELECT * FROM customers WHERE id IN (1, 2, 3, ..., 100);\n" +
        "-- Cẩn thận: danh sách IN quá dài (hàng nghìn) cũng gây vấn đề với plan cache.\n" +
        "-- Postgres: dùng = ANY(ARRAY[...]) hoặc join với VALUES:\n" +
        "SELECT * FROM customers WHERE id = ANY($1::bigint[]);\n" +
        "\n" +
        "-- SỬA 3 (JPA/Hibernate): fetch join hoặc entity graph\n" +
        "--   @Query(\"SELECT o FROM Order o JOIN FETCH o.customer\")\n" +
        "--   @EntityGraph(attributePaths = \"customer\")\n" +
        "--   hibernate.default_batch_fetch_size=50   -> gom N câu thành N/50 câu IN\n" +
        "\n" +
        "-- PHÁT HIỆN SỚM (quan trọng hơn là sửa từng chỗ):\n" +
        "--   spring.jpa.properties.hibernate.generate_statistics=true\n" +
        "--   logging.level.org.hibernate.SQL=DEBUG\n" +
        "-- Postgres: xem câu nào gọi nhiều lần bất thường\n" +
        "SELECT query, calls, total_exec_time, mean_exec_time\n" +
        "FROM pg_stat_statements ORDER BY calls DESC LIMIT 20;\n" +
        "-- calls rất cao + mean_exec_time rất thấp = dấu hiệu N+1 kinh điển.",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-11bnrg5',
  q: 'Vì sao `SELECT *` là anti-pattern trong code production?',
  answer:
    '- Kéo về **cột không cần** → nhiều I/O, nhiều network, nhiều RAM (nhất là cột `text`/`blob`/`jsonb` lớn).\n' +
    '- **Phá covering index**: nếu SELECT chỉ vài cột, một covering index có thể tránh chạm heap; `SELECT *` buộc bookmark lookup.\n' +
    '- **Giòn**: thêm/đổi thứ tự cột làm hỏng code dựa vào vị trí, hoặc bơm dữ liệu mới không mong muốn ra API.\n' +
    '- Khó đọc/khó tối ưu (không rõ query thực sự cần gì).',
  essence:
    'Liệt kê đúng cột cần: giảm dữ liệu truyền tải, cho phép index-only scan, và làm truy vấn trở thành một hợp đồng rõ ràng thay vì "cho tôi tất cả".',
  example:
    '`SELECT * FROM articles WHERE id = ?` khi `articles` có cột `content` (50KB) và `search_vector` (10KB) — trang danh sách chỉ cần `id, title, excerpt` → `SELECT id, title, excerpt` tiết kiệm ~99% dữ liệu và dùng được index `(id) INCLUDE (title, excerpt)`.',
  viz: {
    type: 'tree',
    title: 'SELECT * là anti-pattern trong code production',
    root: {
      label: 'Liệt kê đúng cột = truy vấn thành hợp đồng rõ ràng',
      children: [
        { label: 'Kéo cột không cần', note: 'nhiều I/O, network, RAM (nhất là text/blob/jsonb lớn)' },
        { label: 'Phá covering index', note: 'buộc bookmark lookup dù chỉ cần vài cột' },
        { label: 'Giòn', note: 'thêm/đổi thứ tự cột làm hỏng code, bơm dữ liệu mới ra API' },
        { label: 'Khó đọc / khó tối ưu', note: 'không rõ query thực sự cần gì' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Năm lý do cụ thể",
      code:
        "-- 1) MẤT COVERING INDEX — lý do về hiệu năng lớn nhất\n" +
        "CREATE INDEX idx_orders_cov ON orders (customer_id, status, amount);\n" +
        "SELECT customer_id, status, amount FROM orders WHERE customer_id = 1;  -- Index Only Scan\n" +
        "SELECT * FROM orders WHERE customer_id = 1;                            -- phải đọc heap\n" +
        "\n" +
        "-- 2) TRUYỀN THỪA DỮ LIỆU: bảng có cột TEXT lớn (mô tả, JSON, ảnh base64)\n" +
        "--    -> kéo hàng MB qua mạng cho mỗi hàng dù không dùng tới.\n" +
        "\n" +
        "-- 3) VỠ CODE khi schema đổi: thêm cột -> thứ tự cột đổi -> code đọc theo\n" +
        "--    chỉ số cột sai; hoặc kiểu trả về của ORM đổi ngoài ý muốn.\n" +
        "\n" +
        "-- 4) TRÙNG TÊN CỘT khi join -> kết quả nhập nhằng\n" +
        "SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id;\n" +
        "-- có hai cột \"id\" và hai cột \"created_at\" -> client lấy nhầm.\n" +
        "\n" +
        "-- 5) CHE GIẤU PHỤ THUỘC: không đọc code thì không biết truy vấn thật sự\n" +
        "--    cần cột nào -> không ai dám xoá cột thừa.\n" +
        "\n" +
        "-- VIẾT RÕ RÀNG:\n" +
        "SELECT o.id, o.amount, o.status, c.name\n" +
        "FROM orders o JOIN customers c ON c.id = o.customer_id;\n" +
        "\n" +
        "-- NGOẠI LỆ CHẤP NHẬN ĐƯỢC: khám phá dữ liệu bằng tay, EXISTS (nội dung\n" +
        "-- không quan trọng), COUNT(*), hoặc bảng chỉ có vài cột và chắc chắn cần hết.\n" +
        "SELECT EXISTS (SELECT 1 FROM orders WHERE customer_id = 1);   -- SELECT 1 là đủ",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-15xzhxu',
  q: 'Các mẫu slow query phổ biến và cách sửa nhanh?',
  answer:
    '1. **Hàm trên cột index** → viết lại sargable / functional index.\n' +
    '2. **Ép kiểu ngầm** (param sai kiểu) → truyền đúng kiểu.\n' +
    '3. **`LIKE \'%x%\'`** → trigram GIN / search engine.\n' +
    '4. **OFFSET lớn** → keyset pagination.\n' +
    '5. **Thiếu index trên cột FK** → thêm index.\n' +
    '6. **`SELECT *`** kéo cột lớn → chọn cột.\n' +
    '7. **N+1** → JOIN / batch.\n' +
    '8. **`OR` cross-column** → UNION.\n' +
    '9. **Stats cũ** → ANALYZE.\n' +
    '10. **Correlated subquery trong SELECT** chạy mỗi hàng → LEFT JOIN / window function.',
  essence:
    'Đa số slow query là một trong ~10 mẫu quen thuộc. `EXPLAIN ANALYZE` chỉ ra mẫu nào; phần lớn sửa bằng "đưa predicate về sargable" hoặc "thêm/đổi index cho khớp cách lọc + sort".',
  example:
    'Slow query log: `SELECT (SELECT count(*) FROM comments c WHERE c.post_id = p.id) FROM posts p` — subquery chạy cho mỗi post. Sửa: `SELECT p.id, coalesce(cc.n, 0) FROM posts p LEFT JOIN (SELECT post_id, count(*) n FROM comments GROUP BY post_id) cc ON cc.post_id = p.id`.',
  viz: {
    type: 'tree',
    title: '~10 mẫu slow query quen thuộc',
    root: {
      label: 'EXPLAIN ANALYZE chỉ ra mẫu nào; phần lớn sửa bằng "sargable" hoặc "index khớp lọc + sort"',
      children: [
        { label: 'Hàm trên cột index → sargable / functional index' },
        { label: 'Ép kiểu ngầm → truyền đúng kiểu' },
        { label: 'LIKE "%x%" → trigram GIN; OFFSET lớn → keyset' },
        { label: 'Thiếu index trên cột FK; SELECT * kéo cột lớn' },
        { label: 'N+1 → JOIN/batch; OR cross-column → UNION; stats cũ → ANALYZE' },
        { label: 'Correlated subquery trong SELECT → LEFT JOIN / window function' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Danh sách kiểm tra khi gặp câu chậm",
      code:
        "-- BƯỚC 0: tìm câu chậm thật sự, đừng đoán\n" +
        "SELECT query, calls, mean_exec_time, total_exec_time,\n" +
        "       rows / NULLIF(calls, 0) AS rows_per_call\n" +
        "FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;\n" +
        "-- Sắp theo TOTAL time, không phải mean: câu 5ms chạy 1 triệu lần tệ hơn\n" +
        "-- câu 2 giây chạy 10 lần.\n" +
        "\n" +
        "-- MẪU 1: hàm bọc cột -> mất index\n" +
        "--   DATE(created_at) = ...        -> dùng khoảng thời gian\n" +
        "-- MẪU 2: LIKE \u0027%abc%\u0027            -> trigram index\n" +
        "-- MẪU 3: OFFSET lớn              -> keyset pagination\n" +
        "-- MẪU 4: N+1                     -> JOIN hoặc IN\n" +
        "-- MẪU 5: SELECT * kéo cột lớn    -> chỉ lấy cột cần\n" +
        "-- MẪU 6: thiếu index trên cột FK -> tạo index (Postgres không tự tạo)\n" +
        "-- MẪU 7: OR giữa các cột         -> UNION\n" +
        "-- MẪU 8: ép kiểu ngầm            -> thống nhất kiểu dữ liệu\n" +
        "-- MẪU 9: statistics cũ           -> ANALYZE\n" +
        "-- MẪU 10: sắp xếp/băm tràn đĩa   -> tăng work_mem\n" +
        "SET work_mem = \u002764MB\u0027;           -- theo phiên, không phải toàn cục\n" +
        "\n" +
        "-- MẪU 11: DISTINCT để chữa join nhân bản -> dùng EXISTS\n" +
        "-- MẪU 12: COUNT(*) trên bảng lớn để phân trang -> ước lượng hoặc bỏ tổng số\n" +
        "SELECT reltuples::bigint FROM pg_class WHERE relname = \u0027orders\u0027;\n" +
        "\n" +
        "-- Sau mỗi lần sửa, ĐO LẠI bằng EXPLAIN (ANALYZE, BUFFERS) —\n" +
        "-- đừng tin cảm giác.\n" +
        "SELECT pg_stat_statements_reset();   -- reset để đo lại từ đầu",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-1d59e2x',
  q: 'Index trên cột cardinality thấp (ví dụ boolean, status) có ích không?',
  answer:
    'Thường **ít ích** khi dùng đơn lẻ: nếu `status = \'active\'` khớp 90% bảng → optimizer bỏ index, seq scan.\n\n' +
    'Nhưng có ích khi:\n' +
    '- Giá trị hiếm cần lọc nhanh: `WHERE status = \'ERROR\'` (0.1%) → **partial index** `WHERE status = \'ERROR\'`.\n' +
    '- Là **cột đầu** của composite index cho các query luôn lọc bằng nó: `(tenant_id, status, created_at)`.\n' +
    '- Kết hợp với cột khác trong index để tăng selectivity tổng.',
  essence:
    'Selectivity của một predicate mới là yếu tố quyết định, không phải cardinality của cột. Cột cardinality thấp phát huy khi lọc giá trị hiếm (partial index) hoặc làm thành phần của composite index.',
  example:
    'Bảng `payments` 50M hàng, 0.05% `status = \'FAILED\'`, dashboard hay xem failed: `CREATE INDEX ON payments (created_at) WHERE status = \'FAILED\'` → index ~25k mục, query "failed hôm nay" tức thì. Index thường trên `(status)` sẽ bị bỏ qua cho `status = \'SUCCESS\'`.',
  viz: {
    type: 'tree',
    title: 'Index cột cardinality thấp (boolean, status) — selectivity của PREDICATE mới quyết định',
    root: {
      label: 'Dùng đơn lẻ thường ít ích (status = "active" 90% → seq scan)',
      children: [
        { label: 'Giá trị hiếm cần lọc nhanh', note: 'WHERE status = "ERROR" (0.1%) → PARTIAL INDEX WHERE status = "ERROR"' },
        { label: 'Cột ĐẦU của composite index', note: '(tenant_id, status, created_at) cho query luôn lọc bằng nó' },
        { label: 'Kết hợp cột khác trong index để tăng selectivity tổng' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Thường là không, trừ vài trường hợp cụ thể",
      code:
        "-- Cột status có 3 giá trị, mỗi giá trị chiếm ~33% bảng.\n" +
        "CREATE INDEX idx_orders_status ON orders (status);\n" +
        "SELECT * FROM orders WHERE status = \u0027PAID\u0027;\n" +
        "-- -> optimizer thường BỎ QUA index: đọc 33% bảng qua index (nhảy ngẫu nhiên\n" +
        "-- vào heap) ĐẮT HƠN đọc tuần tự toàn bảng.\n" +
        "\n" +
        "-- NHƯNG CÓ ÍCH trong bốn trường hợp:\n" +
        "-- 1) PHÂN PHỐI RẤT LỆCH: \u0027PENDING\u0027 chỉ chiếm 0,01%\n" +
        "SELECT * FROM orders WHERE status = \u0027PENDING\u0027;   -- index rất hiệu quả ở đây\n" +
        "-- Optimizer biết được điều này nhờ most_common_vals trong statistics.\n" +
        "\n" +
        "-- 2) LÀM CỘT ĐẦU CỦA COMPOSITE INDEX\n" +
        "CREATE INDEX idx_orders_status_created ON orders (status, created_at);\n" +
        "SELECT * FROM orders WHERE status = \u0027PENDING\u0027 ORDER BY created_at LIMIT 20;\n" +
        "-- Vừa lọc vừa cho sẵn thứ tự -> không cần sắp xếp.\n" +
        "\n" +
        "-- 3) PARTIAL INDEX — cách tốt nhất cho cột lệch\n" +
        "CREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = \u0027PENDING\u0027;\n" +
        "-- Index chỉ chứa phần nhỏ -> nhỏ, nhanh, và ghi rẻ.\n" +
        "\n" +
        "-- 4) COVERING: index (status, amount) trả lời được truy vấn mà không đọc heap\n" +
        "SELECT status, SUM(amount) FROM orders GROUP BY status;\n" +
        "\n" +
        "-- KIỂM TRA CARDINALITY THẬT trước khi quyết định:\n" +
        "SELECT attname, n_distinct, most_common_vals, most_common_freqs\n" +
        "FROM pg_stats WHERE tablename = \u0027orders\u0027 AND attname = \u0027status\u0027;\n" +
        "-- n_distinct âm (-0.5) nghĩa là tỉ lệ so với số hàng, không phải số tuyệt đối.",
    },
  ],
},
{
  cat: 'Tối ưu',
  id: 'sql-1rblu8b',
  q: 'Có nên dùng query hint / ép plan không?',
  answer:
    'Hint (`FORCE INDEX`, `/*+ ... */`, `pg_hint_plan`, `OPTION (...)`): ép optimizer chọn index/join cụ thể.\n\n' +
    'Thường **nên tránh** vì:\n' +
    '- Che giấu nguyên nhân gốc (stats cũ, predicate không sargable, index sai).\n' +
    '- Plan "đúng hôm nay" có thể sai khi dữ liệu/phiên bản đổi — hint đóng băng nó lại.\n\n' +
    'Chỉ dùng khi: đã hiểu rõ optimizer sai ở đâu và không sửa được (bug optimizer, plan không ổn định trên hệ quan trọng), như biện pháp tạm.',
  essence:
    'Hint là "vá triệu chứng". Ưu tiên sửa nguyên nhân: ANALYZE, viết lại predicate, thêm index đúng, tăng statistics target. Hint chỉ khi hết cách và có giám sát.',
  example:
    'Query thỉnh thoảng đổi từ hash join (400ms) sang nested loop (30s) do estimate dao động. Sửa gốc: `ALTER TABLE ... ALTER COLUMN x SET STATISTICS 1000` + ANALYZE để estimate ổn định — thay vì `FORCE INDEX` mãi mãi.',
  viz: {
    type: 'tree',
    title: 'Query hint / ép plan — "vá triệu chứng", thường NÊN TRÁNH',
    root: {
      label: 'Ưu tiên sửa nguyên nhân: ANALYZE, viết lại predicate, thêm index đúng',
      children: [
        { label: 'Che giấu nguyên nhân gốc', note: 'stats cũ, predicate không sargable, index sai' },
        { label: 'Plan "đúng hôm nay" có thể sai khi dữ liệu/phiên bản đổi', note: 'hint đóng băng nó lại' },
        { label: 'Chỉ dùng khi', note: 'đã hiểu optimizer sai ở đâu và không sửa được (bug optimizer) — biện pháp tạm có giám sát' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Biện pháp cuối cùng, không phải công cụ hàng ngày",
      code:
        "-- POSTGRES cố tình KHÔNG hỗ trợ hint. Chỉ có công tắc toàn cục để CHẨN ĐOÁN:\n" +
        "SET enable_seqscan = off;\n" +
        "SET enable_nestloop = off;\n" +
        "EXPLAIN ANALYZE SELECT ...;\n" +
        "RESET ALL;\n" +
        "-- Đây là công cụ ĐIỀU TRA để xác nhận giả thuyết, KHÔNG phải cách sửa.\n" +
        "-- (Extension pg_hint_plan cho phép hint kiểu Oracle nếu thật sự cần.)\n" +
        "\n" +
        "-- MYSQL / ORACLE / SQL SERVER có hint trực tiếp:\n" +
        "--   SELECT * FROM orders USE INDEX (idx_created) WHERE ...;\n" +
        "--   SELECT /*+ INDEX(orders idx_created) */ * FROM orders WHERE ...;\n" +
        "--   SELECT * FROM orders WITH (INDEX(idx_created)) WHERE ...;\n" +
        "\n" +
        "-- VÌ SAO NÊN TRÁNH:\n" +
        "-- 1) Hint ĐÓNG BĂNG quyết định theo dữ liệu HÔM NAY. Dữ liệu lớn lên,\n" +
        "--    phân phối đổi -> hint từng đúng trở thành nguyên nhân gây chậm.\n" +
        "-- 2) Che giấu NGUYÊN NHÂN THẬT (thường là statistics sai hoặc thiếu index).\n" +
        "-- 3) Index bị đổi tên/xoá -> hint hỏng hoặc câu lệnh lỗi.\n" +
        "-- 4) Không di chuyển được giữa các hệ quản trị.\n" +
        "\n" +
        "-- LÀM ĐÚNG THỨ TỰ:\n" +
        "--  1) ANALYZE, và tăng statistics target cho cột lệch\n" +
        "--  2) tạo/sửa index cho phù hợp\n" +
        "--  3) viết lại truy vấn cho sargable\n" +
        "--  4) chỉnh tham số chi phí đúng phần cứng (random_page_cost cho SSD)\n" +
        "--  5) tách câu phức tạp, hoặc materialize phần trung gian\n" +
        "--  6) chỉ khi tất cả thất bại và có sức ép production -> hint, kèm COMMENT\n" +
        "--     giải thích và một ticket để quay lại xử lý gốc rễ.",
    },
  ],
},
{
  cat: 'Index',
  id: 'sql-pe6aw2',
  q: 'Expression / functional index và generated column index?',
  answer:
    'Index trên **kết quả một biểu thức** thay vì cột thô:\n' +
    '- Postgres: `CREATE INDEX ON users (lower(email))`, `CREATE INDEX ON events ((data->>\'type\'))`.\n' +
    '- MySQL 8: `CREATE INDEX ON t ((JSON_EXTRACT(doc, \'$.k\')))` hoặc index trên **generated column** (`col AS (...) STORED/VIRTUAL`).\n' +
    '- SQL Server: index trên computed column (cần `PERSISTED` cho một số trường hợp).\n\n' +
    'Truy vấn phải dùng **đúng biểu thức** đó thì mới khớp index.',
  essence:
    'Khi bạn buộc phải lọc/sắp theo `f(col)`, hãy index chính `f(col)`. Đây là cách "hợp thức hoá" một predicate vốn không sargable.',
  example:
    'Lọc theo field trong JSONB: `CREATE INDEX ON orders ((payload->>\'channel\'))` → `WHERE payload->>\'channel\' = \'mobile\'` dùng index. Tìm không phân biệt hoa thường: `CREATE INDEX ON users (lower(email))` + luôn query `WHERE lower(email) = lower(:input)`.',
  viz: {
    type: 'flow',
    title: 'Expression / functional index — "hợp thức hoá" predicate không sargable',
    nodes: ['buộc phải lọc/sắp theo f(col)', 'index chính f(col)', 'Postgres: CREATE INDEX ON users (lower(email)); MySQL 8: index trên generated column', 'truy vấn phải dùng ĐÚNG biểu thức đó mới khớp'],
    steps: [
      { to: 2, label: "lọc theo field JSONB: CREATE INDEX ON orders ((payload->>'channel'))" },
      { to: 3, label: 'luôn query WHERE lower(email) = lower(:input)' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Đánh index trên kết quả tính toán",
      code:
        "-- EXPRESSION INDEX (Postgres) — index trên BIỂU THỨC, không phải cột trần\n" +
        "CREATE INDEX idx_users_email_lower ON users (LOWER(email));\n" +
        "SELECT * FROM users WHERE LOWER(email) = \u0027a@x.com\u0027;       -- dùng được index\n" +
        "-- Điều kiện: biểu thức trong truy vấn phải KHỚP CHÍNH XÁC với biểu thức\n" +
        "-- trong index, và hàm phải IMMUTABLE (cùng input luôn cho cùng output).\n" +
        "\n" +
        "CREATE INDEX idx_orders_year ON orders (EXTRACT(YEAR FROM created_at));\n" +
        "CREATE INDEX idx_users_fullname ON users ((first_name || \u0027 \u0027 || last_name));\n" +
        "CREATE INDEX idx_events_data_type ON events ((data->>\u0027type\u0027));   -- JSONB\n" +
        "\n" +
        "-- GENERATED COLUMN — tính sẵn và LƯU lại, rồi index như cột thường.\n" +
        "-- Dễ đọc hơn expression index, và dùng được ở MySQL (nơi không có\n" +
        "-- expression index cho tới 8.0).\n" +
        "ALTER TABLE orders ADD COLUMN created_date DATE\n" +
        "  GENERATED ALWAYS AS (created_at::date) STORED;\n" +
        "CREATE INDEX idx_orders_created_date ON orders (created_date);\n" +
        "SELECT * FROM orders WHERE created_date = \u00272026-09-05\u0027;\n" +
        "\n" +
        "-- STORED (lưu trên đĩa, index được) vs VIRTUAL (tính lúc đọc, MySQL có,\n" +
        "-- Postgres chưa hỗ trợ VIRTUAL).\n" +
        "\n" +
        "-- SO SÁNH:\n" +
        "--  Expression index — không tốn thêm cột, nhưng truy vấn phải viết ĐÚNG\n" +
        "--                     biểu thức; và biểu thức được tính lại mỗi lần ghi.\n" +
        "--  Generated column — tốn dung lượng, nhưng đọc/viết truy vấn tự nhiên hơn\n" +
        "--                     và dùng lại được ở nhiều truy vấn.\n" +
        "\n" +
        "-- UNIQUE trên biểu thức — rất hữu ích cho ràng buộc không phân biệt hoa thường:\n" +
        "CREATE UNIQUE INDEX uq_users_email_ci ON users (LOWER(email));",
    },
  ],
},
]);
