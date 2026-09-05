SS.addQuestions('sql', [
{
  cat: 'JOIN',
  diagram: 'sql-joins',
  q: 'Các loại JOIN (INNER, LEFT/RIGHT, FULL, CROSS, SELF) khác nhau thế nào?',
  answer:
    '- **INNER JOIN**: chỉ giữ hàng có khớp ở **cả hai** bảng.\n' +
    '- **LEFT (OUTER) JOIN**: giữ **mọi** hàng bảng trái; cột bảng phải là `NULL` nếu không khớp.\n' +
    '- **RIGHT JOIN**: ngược lại (ít dùng, thường viết lại thành LEFT).\n' +
    '- **FULL OUTER JOIN**: giữ mọi hàng cả hai bên, `NULL` chỗ không khớp.\n' +
    '- **CROSS JOIN**: tích Descartes — mọi cặp hàng (A×B). Không có điều kiện.\n' +
    '- **SELF JOIN**: join một bảng với chính nó (dùng alias) — quan hệ phân cấp, so sánh hàng với hàng.',
  essence:
    'INNER = giao. OUTER (LEFT/RIGHT/FULL) = giữ thêm hàng "mồ côi" một bên và điền NULL. CROSS = tổ hợp mọi cặp. Chọn theo "có muốn giữ hàng không khớp không".',
  example:
    '"Mọi khách hàng và tổng đơn của họ, kể cả khách chưa mua": `LEFT JOIN orders` → khách chưa mua vẫn hiện với `SUM(amount) = NULL` (dùng `COALESCE(..., 0)`). Dùng INNER JOIN sẽ loại mất họ.',
  code: {
    lang: 'sql',
    prompt: 'Trả về tên khách hàng và TỔNG số tiền họ đã đặt (cột total_spent), gồm cả khách chưa có đơn nào (total_spent = 0).',
    tables:
      'CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\n' +
      'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER);',
    datasets: [
      "INSERT INTO customers VALUES (1,'An'),(2,'Binh'),(3,'Cuong');\n" +
        'INSERT INTO orders VALUES (1,1,100),(2,1,50),(3,3,200);',
      "INSERT INTO customers VALUES (1,'Dung'),(2,'Emi');\n" +
        'INSERT INTO orders VALUES (1,2,10),(2,2,20),(3,2,30);',
    ],
    starter: 'SELECT c.name, ...\nFROM customers c\n',
    solution:
      'SELECT c.name, COALESCE(SUM(o.amount), 0) AS total_spent\n' +
      'FROM customers c LEFT JOIN orders o ON o.customer_id = c.id\n' +
      'GROUP BY c.id, c.name',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Cùng dữ liệu, năm kiểu JOIN cho năm kết quả khác nhau",
      code:
        "-- customers: (1,\u0027An\u0027), (2,\u0027Binh\u0027), (3,\u0027Cuong\u0027)\n" +
        "-- orders:    (1, customer_id=1, 100), (2, customer_id=1, 50), (3, customer_id=9, 200)\n" +
        "\n" +
        "-- INNER: chỉ hàng khớp CẢ HAI bên -> An (2 dòng). Binh, Cuong và đơn #3 biến mất.\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c INNER JOIN orders o ON o.customer_id = c.id;\n" +
        "\n" +
        "-- LEFT: giữ MỌI khách, kể cả người chưa mua -> Binh và Cuong hiện với NULL\n" +
        "SELECT c.name, COALESCE(o.amount, 0) AS amount\n" +
        "FROM customers c LEFT JOIN orders o ON o.customer_id = c.id;\n" +
        "\n" +
        "-- RIGHT: giữ mọi đơn, kể cả đơn mồ côi (#3 có customer_id=9 không tồn tại)\n" +
        "-- Ít dùng: viết lại thành LEFT bằng cách đảo thứ tự bảng thì dễ đọc hơn.\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c RIGHT JOIN orders o ON o.customer_id = c.id;\n" +
        "\n" +
        "-- FULL OUTER: giữ mồ côi CẢ HAI bên. MySQL không hỗ trợ -> dùng UNION hai LEFT.\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c FULL OUTER JOIN orders o ON o.customer_id = c.id;\n" +
        "\n" +
        "-- CROSS: tích Descartes, KHÔNG có điều kiện. 3 x 3 = 9 dòng.\n" +
        "-- Hữu ích khi cần sinh tổ hợp (mọi sản phẩm x mọi kích cỡ).\n" +
        "SELECT c.name, o.amount FROM customers c CROSS JOIN orders o;\n" +
        "\n" +
        "-- SELF: join bảng với chính nó -> quan hệ phân cấp, so sánh hàng với hàng\n" +
        "SELECT e.name AS nhan_vien, m.name AS quan_ly\n" +
        "FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;",
    },
  ],
},
{
  cat: 'JOIN',
  q: 'LEFT JOIN mà đặt điều kiện bảng phải ở `WHERE` vs ở `ON` — khác gì?',
  answer:
    'Điều kiện ở **`ON`**: áp dụng **khi ghép** — hàng bảng trái không khớp vẫn được giữ (với NULL bên phải).\n\n' +
    'Điều kiện ở **`WHERE`** (trên cột bảng phải): áp dụng **sau khi ghép** — hàng có NULL bên phải bị loại (vì `NULL = x` là false) → LEFT JOIN **biến thành INNER JOIN** một cách âm thầm.',
  essence:
    'Với OUTER JOIN, `ON` lọc "cái gì được ghép", `WHERE` lọc "kết quả cuối". Đặt filter bảng phải vào `WHERE` vô tình huỷ tính OUTER.',
  example:
    '"Khách hàng và đơn hàng SHIPPED của họ, kể cả khách không có đơn SHIPPED nào": phải là `LEFT JOIN orders o ON o.customer_id = c.id AND o.status = \'SHIPPED\'`. Nếu viết `... LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = \'SHIPPED\'` → mất khách không có đơn SHIPPED.',
  viz: {
    type: 'compare',
    cols: ['Điều kiện bảng phải ở ON', 'Điều kiện bảng phải ở WHERE'],
    rows: [
      ['Áp dụng', 'KHI GHÉP', 'SAU khi ghép'],
      ['Hàng bảng trái không khớp', 'vẫn giữ (NULL bên phải)', 'bị loại (NULL = x là false)'],
      ['Kết quả', 'LEFT JOIN đúng nghĩa', 'LEFT JOIN âm thầm biến thành INNER JOIN'],
    ],
  },
  code: {
    lang: 'sql',
    prompt:
      'Trả về tên khách hàng và số đơn có status = SHIPPED của họ (cột shipped_count), ' +
      'GỒM CẢ khách không có đơn SHIPPED nào (shipped_count = 0).',
    tables:
      'CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\n' +
      'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, status TEXT);',
    datasets: [
      "INSERT INTO customers VALUES (1,'An'),(2,'Binh'),(3,'Cuong');\n" +
        "INSERT INTO orders VALUES (1,1,'SHIPPED'),(2,1,'PENDING'),(3,2,'PENDING');",
      "INSERT INTO customers VALUES (1,'Dung'),(2,'Emi');\n" +
        "INSERT INTO orders VALUES (1,1,'SHIPPED'),(2,1,'SHIPPED'),(3,2,'CANCELLED');",
    ],
    starter: 'SELECT c.name, COUNT(...) AS shipped_count\nFROM customers c\nLEFT JOIN orders o ON ...\n',
    solution:
      "SELECT c.name, COUNT(o.id) AS shipped_count\n" +
      "FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'SHIPPED'\n" +
      'GROUP BY c.id, c.name',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Cùng một điều kiện, hai kết quả hoàn toàn khác",
      code:
        "-- ĐẶT Ở ON: điều kiện áp dụng LÚC GHÉP -> hàng không khớp vẫn được GIỮ với NULL\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c\n" +
        "LEFT JOIN orders o ON o.customer_id = c.id AND o.status = \u0027PAID\u0027;\n" +
        "-- Kết quả: MỌI khách hàng. Khách không có đơn PAID -> amount là NULL.\n" +
        "-- Đây là câu trả lời cho \"danh sách khách hàng kèm doanh thu đã thanh toán\".\n" +
        "\n" +
        "-- ĐẶT Ở WHERE: điều kiện áp dụng SAU KHI ghép -> lọc bỏ luôn cả hàng NULL\n" +
        "SELECT c.name, o.amount\n" +
        "FROM customers c\n" +
        "LEFT JOIN orders o ON o.customer_id = c.id\n" +
        "WHERE o.status = \u0027PAID\u0027;\n" +
        "-- Kết quả: CHỈ khách có đơn PAID. NULL không thoả \u0027PAID\u0027 nên bị loại.\n" +
        "-- LEFT JOIN đã âm thầm biến thành INNER JOIN.\n" +
        "\n" +
        "-- ĐÂY LÀ LỖI RẤT PHỔ BIẾN và khó phát hiện vì câu lệnh vẫn chạy đúng cú pháp.\n" +
        "-- Quy tắc:\n" +
        "--   điều kiện về BẢNG PHẢI  -> đặt ở ON\n" +
        "--   điều kiện về BẢNG TRÁI  -> đặt ở WHERE\n" +
        "--   muốn lọc đúng hàng KHÔNG khớp -> WHERE o.id IS NULL (anti-join)\n" +
        "\n" +
        "SELECT c.name\n" +
        "FROM customers c LEFT JOIN orders o ON o.customer_id = c.id\n" +
        "WHERE o.id IS NULL;          -- khách chưa từng mua",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: 'Thứ tự xử lý logic của một câu SELECT?',
  answer:
    'Thứ tự **logic** (không phải thứ tự viết):\n' +
    '1. `FROM` / `JOIN` — tạo tập hàng nguồn.\n' +
    '2. `WHERE` — lọc hàng (chưa có aggregate, chưa có alias SELECT).\n' +
    '3. `GROUP BY` — gom nhóm.\n' +
    '4. `HAVING` — lọc nhóm.\n' +
    '5. `SELECT` — tính biểu thức, alias, window function.\n' +
    '6. `DISTINCT`.\n' +
    '7. `ORDER BY` — (có thể dùng alias SELECT).\n' +
    '8. `LIMIT` / `OFFSET`.',
  essence:
    'Hiểu thứ tự này giải thích nhiều lỗi: không dùng được alias SELECT trong `WHERE`, không dùng aggregate trong `WHERE` (phải `HAVING`), window function chạy sau `GROUP BY`.',
  example:
    '`SELECT price * qty AS total FROM items WHERE total > 100` → lỗi: `total` chưa tồn tại lúc `WHERE`. Phải lặp lại biểu thức `WHERE price * qty > 100`, hoặc bọc subquery/CTE.',
  viz: {
    type: 'flow',
    title: 'Thứ tự XỬ LÝ LOGIC của SELECT (không phải thứ tự viết)',
    nodes: ['FROM / JOIN', 'WHERE (chưa có aggregate, chưa có alias SELECT)', 'GROUP BY', 'HAVING (lọc nhóm, dùng aggregate)', 'SELECT (biểu thức, alias, window function)', 'DISTINCT → ORDER BY (dùng alias được) → LIMIT/OFFSET'],
    steps: [
      { to: 1, label: 'không dùng được alias SELECT trong WHERE' },
      { to: 3, label: 'không dùng aggregate trong WHERE → phải HAVING' },
      { to: 4, label: 'window function chạy SAU GROUP BY' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Viết một đằng, chạy một nẻo",
      code:
        "-- THỨ TỰ VIẾT:  SELECT -> FROM -> WHERE -> GROUP BY -> HAVING -> ORDER BY -> LIMIT\n" +
        "-- THỨ TỰ CHẠY (logic):\n" +
        "--   1. FROM / JOIN     tạo tập dữ liệu nguồn\n" +
        "--   2. WHERE           lọc TỪNG HÀNG (chưa có nhóm, chưa có aggregate)\n" +
        "--   3. GROUP BY        gom nhóm\n" +
        "--   4. HAVING          lọc TỪNG NHÓM (dùng được aggregate)\n" +
        "--   5. SELECT          tính biểu thức, đặt alias\n" +
        "--   6. DISTINCT\n" +
        "--   7. ORDER BY        sắp xếp (dùng được alias vì SELECT đã chạy)\n" +
        "--   8. LIMIT / OFFSET\n" +
        "\n" +
        "-- HỆ QUẢ 1: WHERE KHÔNG dùng được alias đặt ở SELECT\n" +
        "SELECT amount * 1.1 AS total FROM orders WHERE total > 100;   -- LỖI\n" +
        "SELECT amount * 1.1 AS total FROM orders WHERE amount * 1.1 > 100;  -- đúng\n" +
        "\n" +
        "-- HỆ QUẢ 2: ORDER BY thì DÙNG ĐƯỢC alias (vì chạy sau SELECT)\n" +
        "SELECT amount * 1.1 AS total FROM orders ORDER BY total DESC;   -- chạy được\n" +
        "\n" +
        "-- HỆ QUẢ 3: WHERE không dùng được aggregate (chạy trước GROUP BY)\n" +
        "SELECT customer_id, SUM(amount) FROM orders\n" +
        "WHERE SUM(amount) > 1000 GROUP BY customer_id;                  -- LỖI\n" +
        "SELECT customer_id, SUM(amount) FROM orders\n" +
        "GROUP BY customer_id HAVING SUM(amount) > 1000;                 -- đúng\n" +
        "\n" +
        "-- LƯU Ý: đây là thứ tự LOGIC. Optimizer được phép chạy khác đi (đẩy điều\n" +
        "-- kiện xuống sớm, đổi thứ tự join) miễn là KẾT QUẢ giống nhau.",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: '`WHERE` và `HAVING` khác nhau thế nào?',
  answer:
    '`WHERE` lọc **hàng riêng lẻ** trước khi gom nhóm — không dùng được hàm aggregate.\n\n' +
    '`HAVING` lọc **nhóm** sau `GROUP BY` — dùng được aggregate (`SUM`, `COUNT`...).\n\n' +
    'Nếu có thể lọc ở `WHERE` thì luôn ưu tiên: nó giảm số hàng **trước** khi gom nhóm (nhanh hơn, dùng index được).',
  essence:
    '`WHERE` = "hàng nào tham gia". `HAVING` = "nhóm nào được giữ". Đẩy điều kiện xuống `WHERE` càng nhiều càng tốt cho hiệu năng.',
  example:
    '"Khách hàng năm 2024 chi tiêu > 10 triệu": `WHERE order_date >= \'2024-01-01\'` (lọc hàng, dùng index date) rồi `GROUP BY customer_id HAVING SUM(amount) > 10000000` (lọc nhóm). Đặt điều kiện date vào HAVING sẽ quét cả bảng.',
  viz: {
    type: 'compare',
    cols: ['WHERE', 'HAVING'],
    rows: [
      ['Lọc', 'hàng riêng lẻ TRƯỚC khi gom nhóm', 'nhóm SAU GROUP BY'],
      ['Aggregate', 'KHÔNG dùng được', 'dùng được (SUM, COUNT...)'],
      ['Hiệu năng', 'giảm số hàng trước gom nhóm, dùng index', 'lọc sau khi đã tính'],
      ['Nguyên tắc', 'đẩy điều kiện xuống WHERE càng nhiều càng tốt', '—'],
    ],
  },
  code: {
    lang: 'sql',
    prompt:
      'Trả về customer_id và tổng amount (cột total) của các khách có tổng amount > 100 ' +
      'TÍNH TRÊN các đơn năm 2024 (order_date từ 2024-01-01 tới 2024-12-31).',
    tables:
      'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER, order_date TEXT);',
    datasets: [
      'INSERT INTO orders VALUES ' +
        "(1,1,80,'2024-03-01'),(2,1,50,'2024-06-01'),(3,1,999,'2023-12-31')," +
        "(4,2,40,'2024-01-01'),(5,3,120,'2024-05-05');",
      'INSERT INTO orders VALUES ' +
        "(1,7,200,'2024-02-02'),(2,8,60,'2024-02-02'),(3,8,60,'2024-02-03')," +
        "(4,9,500,'2025-01-01');",
    ],
    starter: 'SELECT customer_id, SUM(amount) AS total\nFROM orders\nWHERE ...\nGROUP BY customer_id\nHAVING ...',
    solution:
      'SELECT customer_id, SUM(amount) AS total\n' +
      "FROM orders WHERE order_date >= '2024-01-01' AND order_date <= '2024-12-31'\n" +
      'GROUP BY customer_id HAVING SUM(amount) > 100',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Lọc hàng vs lọc nhóm",
      code:
        "-- WHERE lọc TỪNG HÀNG, chạy TRƯỚC khi gom nhóm -> không dùng được aggregate\n" +
        "-- HAVING lọc TỪNG NHÓM, chạy SAU GROUP BY      -> dùng được aggregate\n" +
        "\n" +
        "SELECT customer_id, COUNT(*) AS so_don, SUM(amount) AS tong\n" +
        "FROM orders\n" +
        "WHERE created_at >= \u00272026-01-01\u0027      -- 1) loại bỏ hàng cũ TRƯỚC khi gom\n" +
        "GROUP BY customer_id\n" +
        "HAVING SUM(amount) > 1000000          -- 2) loại bỏ NHÓM có tổng nhỏ\n" +
        "ORDER BY tong DESC;\n" +
        "\n" +
        "-- QUAN TRỌNG VỀ HIỆU NĂNG: đặt được điều kiện ở WHERE thì ĐỪNG đặt ở HAVING.\n" +
        "-- WHERE giảm số hàng phải gom nhóm; HAVING chỉ vứt bỏ sau khi đã tính xong.\n" +
        "SELECT customer_id, COUNT(*) FROM orders\n" +
        "GROUP BY customer_id\n" +
        "HAVING customer_id > 100;             -- SAI CHỖ: gom nhóm cả những cái sẽ bỏ\n" +
        "\n" +
        "SELECT customer_id, COUNT(*) FROM orders\n" +
        "WHERE customer_id > 100               -- ĐÚNG: lọc trước, gom nhóm ít hơn\n" +
        "GROUP BY customer_id;\n" +
        "\n" +
        "-- HAVING dùng được KHÔNG CẦN GROUP BY (coi toàn bảng là một nhóm):\n" +
        "SELECT SUM(amount) FROM orders HAVING SUM(amount) > 0;",
    },
  ],
},
{
  cat: 'Subquery',
  q: 'Correlated subquery vs non-correlated? `IN` vs `EXISTS` vs `JOIN`?',
  answer:
    '- **Non-correlated**: subquery chạy **một lần**, độc lập với hàng ngoài. `WHERE id IN (SELECT ...)`.\n' +
    '- **Correlated**: subquery tham chiếu cột từ query ngoài → **chạy lại cho mỗi hàng** (trên lý thuyết; optimizer thường rewrite).\n\n' +
    '- `IN (SELECT ...)`: cẩn thận nếu subquery trả `NULL` → `NOT IN` cho kết quả rỗng bất ngờ.\n' +
    '- `EXISTS`: dừng ngay khi tìm thấy một hàng khớp, an toàn với NULL, thường tốt cho semi-join.\n' +
    '- `JOIN`: có thể nhân bản hàng nếu quan hệ 1-nhiều — dùng `DISTINCT` hoặc `EXISTS` để tránh.',
  essence:
    'Optimizer hiện đại thường biến `IN`/`EXISTS`/`JOIN` semi-join thành cùng một plan. Nhưng `NOT IN` + NULL là bẫy thật; ưu tiên `NOT EXISTS` hoặc anti-join.',
  example:
    '"Khách chưa từng đặt hàng": `WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)`. Viết `WHERE c.id NOT IN (SELECT customer_id FROM orders)` → nếu `orders.customer_id` có NULL, kết quả **rỗng** hoàn toàn.',
  viz: {
    type: 'compare',
    cols: ['IN (SELECT ...)', 'EXISTS', 'JOIN'],
    rows: [
      ['Với NULL trong subquery', 'NOT IN → kết quả RỖNG bất ngờ', 'an toàn với NULL', '—'],
      ['Cách chạy', 'chạy một lần (non-correlated)', 'dừng ngay khi tìm thấy một hàng khớp', 'nhân bản hàng nếu 1-nhiều'],
      ['Dùng cho', 'set nhỏ, cố định', 'semi-join, anti-join (NOT EXISTS)', 'cần cột từ cả hai bảng'],
    ],
  },
  code: {
    lang: 'sql',
    prompt:
      'Trả về tên (cột name) các khách hàng CHƯA TỪNG đặt đơn nào. Lưu ý: orders.customer_id có thể chứa NULL — ' +
      'dùng NOT EXISTS để không bị bẫy NOT IN + NULL.',
    tables:
      'CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);\n' +
      'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);',
    datasets: [
      "INSERT INTO customers VALUES (1,'An'),(2,'Binh'),(3,'Cuong');\n" +
        'INSERT INTO orders VALUES (1,1),(2,1),(3,NULL);',
      "INSERT INTO customers VALUES (1,'Dung'),(2,'Emi'),(3,'Phuc'),(4,'Quyen');\n" +
        'INSERT INTO orders VALUES (1,2),(2,NULL),(3,4);',
    ],
    starter: 'SELECT name\nFROM customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders o WHERE ...\n)',
    solution:
      'SELECT name FROM customers c\n' +
      'WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Chạy một lần hay chạy cho từng hàng",
      code:
        "-- NON-CORRELATED: subquery ĐỘC LẬP, chạy MỘT LẦN, kết quả dùng lại\n" +
        "SELECT * FROM orders\n" +
        "WHERE amount > (SELECT AVG(amount) FROM orders);\n" +
        "\n" +
        "-- CORRELATED: subquery THAM CHIẾU cột của query ngoài -> về mặt logic chạy\n" +
        "-- LẠI cho TỪNG hàng (optimizer hiện đại thường viết lại thành join)\n" +
        "SELECT * FROM orders o\n" +
        "WHERE amount > (SELECT AVG(amount) FROM orders WHERE customer_id = o.customer_id);\n" +
        "\n" +
        "-- IN vs EXISTS vs JOIN — ba cách viết cùng một ý\n" +
        "SELECT * FROM customers c WHERE c.id IN (SELECT customer_id FROM orders);\n" +
        "SELECT * FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);\n" +
        "SELECT DISTINCT c.* FROM customers c JOIN orders o ON o.customer_id = c.id;\n" +
        "\n" +
        "-- KHÁC BIỆT THỰC SỰ QUAN TRỌNG — NULL:\n" +
        "-- NOT IN với danh sách CÓ CHỨA NULL trả về RỖNG, luôn luôn.\n" +
        "SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);\n" +
        "-- orders.customer_id có một NULL -> câu này trả về 0 dòng, dù dữ liệu có.\n" +
        "-- Lý do: id <> NULL cho ra UNKNOWN, không phải TRUE.\n" +
        "\n" +
        "-- NOT EXISTS AN TOÀN với NULL -> luôn ưu tiên dùng nó:\n" +
        "SELECT * FROM customers c\n" +
        "WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);\n" +
        "\n" +
        "-- Về hiệu năng, optimizer hiện đại thường cho plan giống nhau giữa IN/EXISTS/JOIN.\n" +
        "-- Chọn theo NGỮ NGHĨA và độ dễ đọc, và luôn dùng NOT EXISTS thay cho NOT IN.",
    },
  ],
},
{
  cat: 'NULL',
  q: 'Logic ba giá trị (three-valued logic) và các bẫy NULL?',
  answer:
    'SQL có `TRUE`, `FALSE`, `UNKNOWN`. Bất kỳ so sánh nào với `NULL` cho `UNKNOWN`:\n' +
    '- `NULL = NULL` → `UNKNOWN` (không phải TRUE). Phải dùng `IS NULL` / `IS NOT NULL`.\n' +
    '- `NULL <> 5` → `UNKNOWN` → hàng bị loại khỏi `WHERE`.\n' +
    '- `NOT IN (list chứa NULL)` → không bao giờ TRUE.\n' +
    '- `COUNT(col)` bỏ qua NULL; `COUNT(*)` thì không.\n' +
    '- `SUM`/`AVG` bỏ qua NULL.\n' +
    '- `NULL` trong `UNIQUE`: nhiều NULL thường được cho phép (tuỳ DB).\n\n' +
    'Công cụ: `COALESCE(a, b, ...)`, `NULLIF(a, b)`, `IS DISTINCT FROM`.',
  essence:
    'NULL nghĩa là "không biết", nên mọi phép toán với nó ra "không biết" → hàng bị loại. Xử lý NULL tường minh (`IS NULL`, `COALESCE`, `IS DISTINCT FROM`) thay vì để nó âm thầm làm sai kết quả.',
  example:
    '`WHERE status <> \'CANCELLED\'` bỏ sót các hàng `status IS NULL`. Nếu ý bạn là "gồm cả chưa set status": `WHERE status IS DISTINCT FROM \'CANCELLED\'` hoặc `WHERE status <> \'CANCELLED\' OR status IS NULL`.',
  viz: {
    type: 'tree',
    title: 'Logic ba giá trị: TRUE / FALSE / UNKNOWN',
    root: {
      label: 'NULL = "không biết" → mọi phép toán ra "không biết" → hàng bị loại',
      children: [
        { label: 'NULL = NULL → UNKNOWN (không phải TRUE)', note: 'phải dùng IS NULL / IS NOT NULL' },
        { label: 'NULL <> 5 → UNKNOWN → hàng bị loại khỏi WHERE' },
        { label: 'NOT IN (list chứa NULL) → không bao giờ TRUE' },
        { label: 'COUNT(col) bỏ qua NULL; COUNT(*) thì không; SUM/AVG bỏ qua NULL' },
        { label: 'Công cụ', note: 'COALESCE(a, b), NULLIF(a, b), IS DISTINCT FROM' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "NULL không phải giá trị, nó là \"không biết\"",
      code:
        "-- Mọi so sánh với NULL đều cho UNKNOWN, không phải TRUE/FALSE:\n" +
        "SELECT NULL = NULL;        -- NULL (không phải true!)\n" +
        "SELECT NULL <> 1;          -- NULL\n" +
        "SELECT NULL + 1;           -- NULL — mọi phép toán với NULL đều ra NULL\n" +
        "\n" +
        "-- WHERE chỉ giữ hàng có kết quả TRUE. UNKNOWN bị loại như FALSE.\n" +
        "SELECT * FROM users WHERE phone = NULL;      -- LUÔN rỗng\n" +
        "SELECT * FROM users WHERE phone IS NULL;     -- đúng cách\n" +
        "\n" +
        "-- BẪY 1: NOT IN với NULL (xem câu trước) -> luôn rỗng\n" +
        "-- BẪY 2: điều kiện phủ định làm mất hàng NULL\n" +
        "SELECT * FROM users WHERE status <> \u0027ACTIVE\u0027;\n" +
        "-- Hàng có status = NULL KHÔNG được trả về, dù rõ ràng nó \"khác ACTIVE\".\n" +
        "SELECT * FROM users WHERE status IS DISTINCT FROM \u0027ACTIVE\u0027;   -- Postgres: đúng ý\n" +
        "SELECT * FROM users WHERE status <> \u0027ACTIVE\u0027 OR status IS NULL;  -- cách chuẩn\n" +
        "\n" +
        "-- BẪY 3: aggregate BỎ QUA NULL, trừ COUNT(*)\n" +
        "SELECT COUNT(*),           -- đếm MỌI hàng\n" +
        "       COUNT(phone),       -- chỉ đếm hàng phone KHÔNG NULL\n" +
        "       AVG(score)          -- trung bình chỉ trên hàng không NULL (mẫu số khác!)\n" +
        "FROM users;\n" +
        "\n" +
        "-- BẪY 4: UNIQUE cho phép NHIỀU NULL (chuẩn SQL) -> không chống trùng được\n" +
        "--        các hàng chưa có giá trị.\n" +
        "\n" +
        "-- Công cụ xử lý:\n" +
        "SELECT COALESCE(phone, \u0027chưa có\u0027),          -- giá trị đầu tiên không NULL\n" +
        "       NULLIF(amount, 0),                   -- biến 0 thành NULL (tránh chia 0)\n" +
        "       amount / NULLIF(quantity, 0)         -- mẫu chống chia cho 0",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: '`DISTINCT` và `GROUP BY` — khác nhau và khi nào dùng cái nào?',
  answer:
    '`SELECT DISTINCT a, b FROM t` và `SELECT a, b FROM t GROUP BY a, b` cho **cùng kết quả** (các tổ hợp duy nhất) và thường cùng plan.\n\n' +
    'Khác biệt:\n' +
    '- `GROUP BY` cho phép **aggregate** (`COUNT`, `SUM`) trên mỗi nhóm — `DISTINCT` thì không.\n' +
    '- `DISTINCT` áp cho **toàn bộ danh sách SELECT**, không chọn được cột.\n' +
    '- `DISTINCT ON (col)` (Postgres) là chuyện khác — lấy một hàng đại diện mỗi giá trị `col`.',
  essence:
    'Chỉ cần loại trùng → `DISTINCT` (rõ ý). Cần đếm/tổng theo nhóm → `GROUP BY`. Đừng dùng `DISTINCT` để "vá" một JOIN bị nhân bản — sửa JOIN.',
  example:
    '`SELECT DISTINCT customer_id FROM orders` = `SELECT customer_id FROM orders GROUP BY customer_id`. Nhưng "số đơn mỗi khách" bắt buộc `GROUP BY customer_id` + `COUNT(*)`. `SELECT DISTINCT *` sau một LEFT JOIN thường là dấu hiệu JOIN sai.',
  viz: {
    type: 'compare',
    cols: ['DISTINCT', 'GROUP BY'],
    rows: [
      ['Kết quả', 'các tổ hợp duy nhất (thường cùng plan)', 'các tổ hợp duy nhất'],
      ['Aggregate', 'KHÔNG', 'CÓ (COUNT, SUM per nhóm)'],
      ['Phạm vi', 'toàn bộ danh sách SELECT', 'chọn cột group được'],
      ['Đừng làm', 'dùng DISTINCT để "vá" JOIN bị nhân bản — sửa JOIN', '—'],
    ],
  },
  code: {
    lang: 'sql',
    prompt: 'Trả về customer_id và SỐ ĐƠN của mỗi khách (cột order_count), chỉ những khách có từ 2 đơn trở lên.',
    tables: 'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER);',
    datasets: [
      'INSERT INTO orders VALUES (1,10),(2,10),(3,10),(4,20),(5,30),(6,30);',
      'INSERT INTO orders VALUES (1,1),(2,2),(3,2),(4,3),(5,3),(6,3),(7,4);',
    ],
    starter: 'SELECT customer_id, COUNT(*) AS order_count\nFROM orders\nGROUP BY customer_id\n',
    solution: 'SELECT customer_id, COUNT(*) AS order_count FROM orders GROUP BY customer_id HAVING COUNT(*) >= 2',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Khử trùng vs gom nhóm để tính",
      code:
        "-- Chỉ khử trùng -> hai câu sau tương đương và thường cho cùng plan\n" +
        "SELECT DISTINCT customer_id FROM orders;\n" +
        "SELECT customer_id FROM orders GROUP BY customer_id;\n" +
        "\n" +
        "-- GROUP BY mạnh hơn: nó cho phép TÍNH TOÁN trên từng nhóm\n" +
        "SELECT customer_id, COUNT(*), SUM(amount), MAX(created_at)\n" +
        "FROM orders GROUP BY customer_id;\n" +
        "\n" +
        "-- DISTINCT áp dụng cho TOÀN BỘ danh sách cột, không phải cột đầu tiên\n" +
        "SELECT DISTINCT customer_id, status FROM orders;\n" +
        "-- -> các cặp (customer_id, status) duy nhất, KHÔNG phải \"mỗi khách một dòng\".\n" +
        "-- Đây là hiểu nhầm phổ biến nhất về DISTINCT.\n" +
        "\n" +
        "-- Postgres có DISTINCT ON — lấy MỘT hàng đại diện cho mỗi nhóm:\n" +
        "SELECT DISTINCT ON (customer_id) customer_id, id, amount, created_at\n" +
        "FROM orders\n" +
        "ORDER BY customer_id, created_at DESC;    -- đơn MỚI NHẤT của mỗi khách\n" +
        "-- ORDER BY bắt buộc bắt đầu bằng cột trong DISTINCT ON.\n" +
        "\n" +
        "-- DẤU HIỆU XẤU: DISTINCT được thêm vào để \"chữa\" kết quả bị nhân đôi do JOIN.\n" +
        "SELECT DISTINCT c.* FROM customers c JOIN orders o ON o.customer_id = c.id;\n" +
        "-- Cách đúng là dùng EXISTS — vừa rõ nghĩa vừa nhanh hơn (không phải sắp xếp\n" +
        "-- và khử trùng toàn bộ kết quả):\n" +
        "SELECT c.* FROM customers c\n" +
        "WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);",
    },
  ],
},
{
  cat: 'Tập hợp',
  q: '`UNION` vs `UNION ALL`, `INTERSECT`, `EXCEPT`?',
  answer:
    '- **`UNION`**: gộp hai tập kết quả và **loại trùng** (thêm bước sort/hash distinct — tốn kém).\n' +
    '- **`UNION ALL`**: gộp, **giữ trùng** — nhanh hơn nhiều. Dùng nếu bạn biết không có trùng hoặc trùng là chấp nhận được.\n' +
    '- **`INTERSECT`**: hàng có ở **cả hai** tập.\n' +
    '- **`EXCEPT`** (MINUS trong Oracle): hàng ở tập đầu nhưng **không** ở tập sau.\n\n' +
    'Các cột phải tương thích kiểu và cùng số lượng.',
  essence:
    '`UNION ALL` là mặc định nên nghĩ tới; chỉ dùng `UNION` khi thực sự cần khử trùng (và chấp nhận chi phí distinct). `INTERSECT`/`EXCEPT` là phép toán tập hợp trực tiếp thay cho JOIN/NOT EXISTS phức tạp.',
  example:
    'Gộp "đơn hàng active" và "đơn hàng archived" (hai bảng, không thể trùng id): `UNION ALL` — nhanh, không tốn bước distinct thừa. "Sản phẩm có trong kho A nhưng không trong kho B": `SELECT sku FROM stock_a EXCEPT SELECT sku FROM stock_b`.',
  viz: {
    type: 'compare',
    cols: ['UNION', 'UNION ALL', 'INTERSECT / EXCEPT'],
    rows: [
      ['Làm gì', 'gộp + LOẠI TRÙNG (sort/hash distinct)', 'gộp + GIỮ trùng', 'giao / hiệu của hai tập'],
      ['Chi phí', 'tốn (bước distinct)', 'nhanh hơn nhiều', '—'],
      ['Dùng khi', 'thực sự cần khử trùng', 'mặc định nên nghĩ tới; biết không trùng', 'thay JOIN/NOT EXISTS phức tạp'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Phép toán tập hợp trên kết quả truy vấn",
      code:
        "-- UNION: gộp và KHỬ TRÙNG -> phải sắp xếp/băm toàn bộ -> TỐN KÉM\n" +
        "SELECT email FROM customers\n" +
        "UNION\n" +
        "SELECT email FROM subscribers;\n" +
        "\n" +
        "-- UNION ALL: gộp, GIỮ NGUYÊN trùng lặp -> NHANH HƠN NHIỀU\n" +
        "-- Biết chắc không trùng (hoặc trùng cũng không sao) thì LUÔN dùng UNION ALL.\n" +
        "SELECT email FROM customers\n" +
        "UNION ALL\n" +
        "SELECT email FROM subscribers;\n" +
        "\n" +
        "-- INTERSECT: chỉ hàng có ở CẢ HAI\n" +
        "SELECT email FROM customers INTERSECT SELECT email FROM subscribers;\n" +
        "\n" +
        "-- EXCEPT (MySQL: dùng NOT EXISTS thay thế): có ở vế đầu, KHÔNG có ở vế sau\n" +
        "SELECT email FROM customers EXCEPT SELECT email FROM subscribers;\n" +
        "\n" +
        "-- QUY TẮC:\n" +
        "--  - số cột và KIỂU DỮ LIỆU phải tương thích giữa các vế\n" +
        "--  - tên cột lấy từ vế ĐẦU TIÊN\n" +
        "--  - ORDER BY chỉ đặt được ở CUỐI CÙNG, áp cho toàn bộ kết quả\n" +
        "(SELECT email, \u0027khach\u0027 AS loai FROM customers)\n" +
        "UNION ALL\n" +
        "(SELECT email, \u0027dang-ky\u0027 FROM subscribers)\n" +
        "ORDER BY email\n" +
        "LIMIT 100;\n" +
        "\n" +
        "-- UNION ALL còn là công cụ tối ưu: câu OR chậm có thể tách thành hai câu\n" +
        "-- dùng được index rồi UNION ALL lại (xem câu về OR).",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: 'Conditional aggregation (aggregate + CASE / FILTER)?',
  answer:
    'Đếm/tổng có điều kiện trong **một** lần quét, thay vì nhiều subquery:\n' +
    '- Chuẩn SQL / mọi DB: `SUM(CASE WHEN status = \'PAID\' THEN amount ELSE 0 END)`, `COUNT(CASE WHEN status = \'PAID\' THEN 1 END)`.\n' +
    '- Postgres / SQL chuẩn mới: `COUNT(*) FILTER (WHERE status = \'PAID\')`, `SUM(amount) FILTER (WHERE ...)` — sạch hơn.\n\n' +
    'Cho phép "pivot" nhanh: nhiều cột thống kê theo các điều kiện khác nhau trong một hàng kết quả.',
  essence:
    'Conditional aggregation biến "nhiều truy vấn cho nhiều lát cắt" thành một lần quét bảng với nhiều biểu thức aggregate. `FILTER` là cú pháp đẹp cho việc này (Postgres).',
  example:
    'Báo cáo theo tháng: `SELECT date_trunc(\'month\', created_at) AS m, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = \'PAID\') AS paid, SUM(amount) FILTER (WHERE status = \'PAID\') AS revenue FROM orders GROUP BY 1`.',
  viz: {
    type: 'flow',
    title: 'Conditional aggregation — nhiều lát cắt trong MỘT lần quét',
    nodes: ['một lần quét bảng', 'SUM(CASE WHEN status = "PAID" THEN amount ELSE 0 END)', 'hoặc: COUNT(*) FILTER (WHERE status = "PAID") — Postgres', 'nhiều cột thống kê theo điều kiện khác nhau trong một hàng kết quả'],
    steps: [
      { to: 1, label: 'thay vì nhiều subquery cho nhiều điều kiện' },
      { to: 2, label: 'FILTER là cú pháp sạch hơn CASE (Postgres / SQL chuẩn mới)' },
      { to: 3, label: 'cho phép "pivot" nhanh' },
    ],
  },
  code: {
    lang: 'sql',
    prompt:
      'Với mỗi customer_id, trả về: tổng số đơn (total), số đơn PAID (paid), và tổng amount của các đơn PAID (revenue). ' +
      'Dùng conditional aggregation (CASE hoặc SUM/COUNT có điều kiện) — một lần quét.',
    tables:
      'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, status TEXT, amount INTEGER);',
    datasets: [
      "INSERT INTO orders VALUES (1,1,'PAID',100),(2,1,'PENDING',50),(3,1,'PAID',30),(4,2,'PENDING',999);",
      "INSERT INTO orders VALUES (1,5,'PAID',10),(2,5,'PAID',20),(3,6,'CANCELLED',777),(4,6,'PAID',5);",
    ],
    starter: 'SELECT customer_id,\n  COUNT(*) AS total,\n  ... AS paid,\n  ... AS revenue\nFROM orders\nGROUP BY customer_id\n',
    solution:
      'SELECT customer_id, COUNT(*) AS total,\n' +
      "  SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid,\n" +
      "  SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END) AS revenue\n" +
      'FROM orders GROUP BY customer_id',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Xoay bảng và đếm có điều kiện trong MỘT lần quét",
      code:
        "-- Thay vì chạy nhiều câu hoặc join nhiều lần, gộp điều kiện vào aggregate:\n" +
        "SELECT\n" +
        "  customer_id,\n" +
        "  COUNT(*)                                        AS tong_don,\n" +
        "  COUNT(*) FILTER (WHERE status = \u0027PAID\u0027)         AS da_thanh_toan,   -- Postgres\n" +
        "  COUNT(CASE WHEN status = \u0027PAID\u0027 THEN 1 END)     AS da_thanh_toan_2, -- chuẩn SQL\n" +
        "  SUM(CASE WHEN status = \u0027PAID\u0027 THEN amount ELSE 0 END) AS doanh_thu,\n" +
        "  AVG(CASE WHEN status = \u0027PAID\u0027 THEN amount END)  AS tb_don_da_tt\n" +
        "FROM orders\n" +
        "GROUP BY customer_id;\n" +
        "\n" +
        "-- LƯU Ý: CASE không có ELSE thì trả NULL, và aggregate BỎ QUA NULL.\n" +
        "--   COUNT(CASE WHEN ... THEN 1 END)      -> đếm đúng số hàng thoả điều kiện\n" +
        "--   SUM(CASE WHEN ... THEN x ELSE 0 END) -> dùng ELSE 0 để tổng không ra NULL\n" +
        "--   AVG thì ĐỪNG dùng ELSE 0 — nó làm sai mẫu số.\n" +
        "\n" +
        "-- PIVOT: biến hàng thành cột\n" +
        "SELECT\n" +
        "  DATE_TRUNC(\u0027month\u0027, created_at) AS thang,\n" +
        "  SUM(amount) FILTER (WHERE region = \u0027Bắc\u0027)  AS bac,\n" +
        "  SUM(amount) FILTER (WHERE region = \u0027Trung\u0027) AS trung,\n" +
        "  SUM(amount) FILTER (WHERE region = \u0027Nam\u0027)   AS nam\n" +
        "FROM orders\n" +
        "GROUP BY 1\n" +
        "ORDER BY 1;\n" +
        "\n" +
        "-- LỢI ÍCH LỚN NHẤT: chỉ QUÉT BẢNG MỘT LẦN thay vì nhiều subquery hoặc\n" +
        "-- nhiều LEFT JOIN -> nhanh hơn nhiều trên bảng lớn.",
    },
  ],
},
{
  cat: 'DML',
  q: 'Upsert: `INSERT ... ON CONFLICT` / `MERGE` hoạt động thế nào?',
  answer:
    '"Insert nếu chưa có, update nếu đã có" — nguyên tử ở mức câu lệnh.\n\n' +
    '- **Postgres**: `INSERT ... ON CONFLICT (key_cols) DO UPDATE SET col = EXCLUDED.col` (hoặc `DO NOTHING`).\n' +
    '- **MySQL**: `INSERT ... ON DUPLICATE KEY UPDATE ...`.\n' +
    '- **SQL chuẩn / Oracle / SQL Server**: `MERGE`.\n\n' +
    'Cần một **unique constraint / primary key** để xác định "xung đột". `EXCLUDED` (Postgres) tham chiếu hàng lẽ ra được insert.',
  essence:
    'Upsert gộp "kiểm tra tồn tại + insert/update" thành một câu lệnh nguyên tử, tránh race giữa `SELECT` và `INSERT` (hai session cùng thấy "chưa có" rồi cùng insert → lỗi unique).',
  example:
    'Counter theo ngày: `INSERT INTO daily_views (day, views) VALUES (CURRENT_DATE, 1) ON CONFLICT (day) DO UPDATE SET views = daily_views.views + 1`. Nghìn request đồng thời vẫn đếm đúng, không cần lock thủ công.',
  viz: {
    type: 'flow',
    title: 'Upsert (INSERT ... ON CONFLICT / MERGE)',
    nodes: ['INSERT ... VALUES (...)', 'ON CONFLICT (key_cols)', 'DO UPDATE SET col = EXCLUDED.col (hoặc DO NOTHING)', 'nguyên tử ở mức câu lệnh'],
    steps: [
      { to: 1, label: 'cần unique constraint / PK để xác định "xung đột"' },
      { to: 3, label: 'tránh race giữa SELECT và INSERT (hai session cùng thấy "chưa có" rồi cùng insert)' },
      { to: 3, label: 'Postgres: ON CONFLICT + EXCLUDED; MySQL: ON DUPLICATE KEY UPDATE; chuẩn: MERGE' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Chèn hoặc cập nhật, nguyên tử, không cần kiểm tra trước",
      code:
        "-- POSTGRES\n" +
        "INSERT INTO products (sku, name, price, updated_at)\n" +
        "VALUES (\u0027SKU-1\u0027, \u0027Áo\u0027, 100000, now())\n" +
        "ON CONFLICT (sku) DO UPDATE\n" +
        "SET name       = EXCLUDED.name,       -- EXCLUDED = hàng ĐỊNH chèn\n" +
        "    price      = EXCLUDED.price,\n" +
        "    updated_at = now()\n" +
        "WHERE products.price IS DISTINCT FROM EXCLUDED.price;   -- chỉ ghi khi THỰC SỰ đổi\n" +
        "-- Mệnh đề WHERE này tránh ghi vô ích -> giảm bloat và giảm ghi WAL.\n" +
        "\n" +
        "INSERT INTO products (sku, name) VALUES (\u0027SKU-1\u0027, \u0027Áo\u0027)\n" +
        "ON CONFLICT (sku) DO NOTHING;         -- bỏ qua nếu đã có\n" +
        "\n" +
        "-- MYSQL\n" +
        "INSERT INTO products (sku, name, price) VALUES (\u0027SKU-1\u0027, \u0027Áo\u0027, 100000)\n" +
        "ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price);\n" +
        "\n" +
        "-- CHUẨN SQL (Postgres 15+, SQL Server, Oracle)\n" +
        "MERGE INTO products p\n" +
        "USING (VALUES (\u0027SKU-1\u0027, \u0027Áo\u0027, 100000)) AS s(sku, name, price)\n" +
        "ON p.sku = s.sku\n" +
        "WHEN MATCHED THEN UPDATE SET name = s.name, price = s.price\n" +
        "WHEN NOT MATCHED THEN INSERT (sku, name, price) VALUES (s.sku, s.name, s.price);\n" +
        "\n" +
        "-- VÌ SAO KHÔNG TỰ LÀM \"SELECT rồi INSERT/UPDATE\": giữa hai lệnh có RACE\n" +
        "-- CONDITION -> hai transaction cùng thấy \"chưa có\" và cùng INSERT -> lỗi\n" +
        "-- trùng khoá hoặc dữ liệu nhân đôi. Upsert là NGUYÊN TỬ ở mức câu lệnh.\n" +
        "-- ĐIỀU KIỆN: phải có UNIQUE constraint/index trên cột xung đột.",
    },
  ],
},
{
  cat: 'DDL',
  q: 'Khoá ngoại (foreign key) và referential actions (CASCADE, SET NULL, RESTRICT)?',
  answer:
    'FK đảm bảo giá trị cột con **phải tồn tại** ở bảng cha (referential integrity). Khi hàng cha bị xoá/sửa key:\n' +
    '- **RESTRICT / NO ACTION**: chặn thao tác nếu còn hàng con tham chiếu (mặc định an toàn).\n' +
    '- **CASCADE**: xoá/sửa lan sang hàng con.\n' +
    '- **SET NULL / SET DEFAULT**: đặt cột FK của con về NULL/default.\n\n' +
    'FK nên có **index ở phía con** (nhiều DB không tự tạo — MySQL có, Postgres không) để `ON DELETE` và JOIN không quét toàn bảng.',
  essence:
    'FK là "hàng rào" chống dữ liệu mồ côi ở tầng DB. `CASCADE` tiện nhưng nguy hiểm (xoá một hàng cha có thể xoá hàng nghìn hàng con). Luôn index cột FK.',
  example:
    '`order_items.order_id REFERENCES orders(id) ON DELETE CASCADE` — xoá order tự xoá items (hợp lý, item không sống độc lập). Nhưng `orders.customer_id ... ON DELETE CASCADE` → xoá khách hàng xoá luôn lịch sử đơn hàng — thường nên `RESTRICT` hoặc soft delete.',
  viz: {
    type: 'compare',
    cols: ['RESTRICT / NO ACTION', 'CASCADE', 'SET NULL / SET DEFAULT'],
    rows: [
      ['Khi xoá/sửa hàng cha', 'CHẶN nếu còn hàng con', 'xoá/sửa lan sang hàng con', 'đặt cột FK của con về NULL/default'],
      ['An toàn', 'mặc định an toàn', 'nguy hiểm (xoá 1 cha → xoá nghìn con)', 'tuỳ nghiệp vụ'],
      ['Dùng cho', 'orders.customer_id', 'order_items.order_id (item không sống độc lập)', '—'],
      ['Chung', 'LUÔN index cột FK ở phía con (Postgres không tự tạo)', '—', '—'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ràng buộc toàn vẹn và hành vi khi xoá/sửa",
      code:
        "CREATE TABLE orders (\n" +
        "  id          BIGSERIAL PRIMARY KEY,\n" +
        "  customer_id BIGINT NOT NULL\n" +
        "    REFERENCES customers(id)\n" +
        "    ON DELETE RESTRICT      -- không cho xoá khách còn đơn hàng\n" +
        "    ON UPDATE CASCADE,\n" +
        "  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "\n" +
        "CREATE TABLE order_lines (\n" +
        "  id       BIGSERIAL PRIMARY KEY,\n" +
        "  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,\n" +
        "  sku      TEXT NOT NULL\n" +
        ");\n" +
        "-- CASCADE ở đây ĐÚNG: order_line không tồn tại độc lập ngoài order.\n" +
        "\n" +
        "-- CÁC HÀNH VI:\n" +
        "--  RESTRICT   — chặn NGAY, không cho xoá (kiểm tra tức thì)\n" +
        "--  NO ACTION  — chặn, nhưng kiểm tra CUỐI transaction (mặc định chuẩn SQL)\n" +
        "--               -> cho phép xoá rồi chèn lại trong cùng transaction\n" +
        "--  CASCADE    — xoá/sửa lan sang bảng con. MẠNH và NGUY HIỂM: một lệnh DELETE\n" +
        "--               có thể xoá hàng triệu dòng ở nhiều bảng.\n" +
        "--  SET NULL   — đặt cột về NULL (cột phải cho phép NULL)\n" +
        "--  SET DEFAULT— đặt về giá trị mặc định\n" +
        "\n" +
        "-- BẮT BUỘC: đánh index trên cột FK. Postgres KHÔNG tự tạo index cho FK\n" +
        "-- -> mỗi lần xoá hàng cha phải quét toàn bộ bảng con, và dễ gây deadlock.\n" +
        "CREATE INDEX idx_orders_customer ON orders (customer_id);\n" +
        "\n" +
        "-- Kiểm tra hoãn tới cuối transaction (hữu ích khi nạp dữ liệu vòng tròn):\n" +
        "ALTER TABLE orders ADD CONSTRAINT fk_customer\n" +
        "  FOREIGN KEY (customer_id) REFERENCES customers(id) DEFERRABLE INITIALLY DEFERRED;",
    },
  ],
},
{
  cat: 'DML',
  q: '`DELETE`, `TRUNCATE`, `DROP` khác nhau thế nào?',
  answer:
    '- **`DELETE FROM t WHERE ...`**: DML, xoá từng hàng, ghi log từng hàng (WAL/redo), kích hoạt trigger, có thể rollback, giữ nguyên bảng + cấu trúc. Chậm cho bảng lớn, để lại "xác" cần vacuum (Postgres).\n' +
    '- **`TRUNCATE t`**: DDL, xoá **toàn bộ** hàng cực nhanh (deallocate pages), reset identity/sequence tuỳ DB, thường **không** kích hoạt trigger, ít log hơn. Trong Postgres nó transactional (rollback được); MySQL thì không.\n' +
    '- **`DROP TABLE t`**: xoá luôn cả bảng, index, constraint.',
  essence:
    '`DELETE` cho xoá có điều kiện, có thể rollback, kích hoạt logic. `TRUNCATE` cho "làm sạch nhanh cả bảng". `DROP` cho "xoá luôn định nghĩa". Chọn theo phạm vi và nhu cầu trigger/rollback.',
  example:
    'Dọn bảng staging trước mỗi lần import: `TRUNCATE staging_orders` — mili giây, thay vì `DELETE FROM staging_orders` mất phút + bloat. Xoá đơn hàng test của một khách: `DELETE ... WHERE customer_id = 999` (cần điều kiện + trigger audit).',
  viz: {
    type: 'compare',
    cols: ['DELETE FROM t WHERE ...', 'TRUNCATE t', 'DROP TABLE t'],
    rows: [
      ['Loại', 'DML — xoá từng hàng', 'DDL — deallocate pages', 'xoá cả bảng + index + constraint'],
      ['Tốc độ', 'chậm cho bảng lớn, để lại "xác" (vacuum)', 'cực nhanh, ít log', 'nhanh'],
      ['Trigger', 'kích hoạt', 'thường KHÔNG', '—'],
      ['Rollback', 'được', 'Postgres được, MySQL không', 'tuỳ DB'],
      ['Dùng cho', 'xoá có điều kiện, cần logic', 'làm sạch nhanh cả bảng staging', 'xoá luôn định nghĩa'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ba mức độ, ba hệ quả rất khác nhau",
      code:
        "-- DELETE — DML, xoá TỪNG HÀNG, có WHERE, ghi WAL/undo log cho mỗi hàng\n" +
        "DELETE FROM orders WHERE created_at < \u00272025-01-01\u0027;\n" +
        "--  + rollback được, kích hoạt TRIGGER, tôn trọng FK\n" +
        "--  - CHẬM trên bảng lớn, ghi log rất nhiều, để lại dead tuple (Postgres cần VACUUM)\n" +
        "--  - KHÔNG giải phóng dung lượng đĩa ngay\n" +
        "\n" +
        "-- TRUNCATE — DDL, xoá TOÀN BỘ bảng bằng cách cấp lại vùng lưu trữ\n" +
        "TRUNCATE TABLE orders RESTART IDENTITY CASCADE;\n" +
        "--  + CỰC NHANH (không quan tâm số hàng), giải phóng đĩa ngay\n" +
        "--  + RESTART IDENTITY đặt lại bộ đếm sequence\n" +
        "--  - KHÔNG có WHERE, KHÔNG kích hoạt trigger DELETE\n" +
        "--  - cần khoá ACCESS EXCLUSIVE -> chặn MỌI truy cập vào bảng\n" +
        "--  - bị chặn nếu có FK trỏ tới (trừ khi dùng CASCADE — và CASCADE ở đây\n" +
        "--    nghĩa là TRUNCATE luôn các bảng con, rất dễ mất dữ liệu ngoài ý muốn)\n" +
        "--  - Postgres: rollback được trong transaction. MySQL/Oracle: KHÔNG.\n" +
        "\n" +
        "-- DROP — DDL, xoá luôn ĐỊNH NGHĨA bảng\n" +
        "DROP TABLE orders;\n" +
        "DROP TABLE IF EXISTS orders CASCADE;    -- CASCADE xoá cả view/FK phụ thuộc\n" +
        "\n" +
        "-- CHỌN:\n" +
        "--  xoá một phần dữ liệu        -> DELETE (theo lô nếu nhiều, xem câu batching)\n" +
        "--  làm sạch bảng (test, staging) -> TRUNCATE\n" +
        "--  bỏ hẳn bảng                 -> DROP\n" +
        "-- Xoá phần LỚN của bảng lớn: nhanh hơn nhiều nếu tạo bảng mới chứa phần\n" +
        "-- GIỮ LẠI, rồi đổi tên — thay vì DELETE hàng chục triệu dòng.",
    },
  ],
},
{
  cat: 'DDL',
  q: 'Primary key, UNIQUE và NOT NULL — vai trò mỗi ràng buộc?',
  answer:
    '- **NOT NULL**: cột bắt buộc có giá trị.\n' +
    '- **UNIQUE**: không hai hàng trùng giá trị (thường cho phép nhiều NULL vì `NULL ≠ NULL`). Tạo index để enforce.\n' +
    '- **PRIMARY KEY** = UNIQUE + NOT NULL + (một PK mỗi bảng) + thường là **clustered** (MySQL InnoDB) hoặc chỉ là unique index (Postgres). Là định danh chính của hàng, đích của FK.\n\n' +
    'Có thể có nhiều UNIQUE constraint (candidate keys) nhưng chỉ một PK.',
  essence:
    'PK là "danh tính" của hàng (ổn định, không đổi, không NULL). UNIQUE là "không trùng" cho các thuộc tính khác (email, mã SKU). NOT NULL là "phải có". Ba lớp bảo vệ tính toàn vẹn.',
  example:
    'Bảng `users`: PK `id` (bigint identity — danh tính bất biến), `UNIQUE(email)` (email có thể đổi nhưng không trùng), `NOT NULL` cho `email`, `created_at`. FK từ `orders.user_id` trỏ vào `users.id` chứ không phải `email`.',
  viz: {
    type: 'compare',
    cols: ['NOT NULL', 'UNIQUE', 'PRIMARY KEY'],
    rows: [
      ['Đảm bảo', 'cột bắt buộc có giá trị', 'không hai hàng trùng (thường cho phép nhiều NULL)', 'UNIQUE + NOT NULL, một PK mỗi bảng'],
      ['Index', '—', 'tạo index để enforce', 'clustered (InnoDB) / unique index (Postgres)'],
      ['Vai trò', 'phải có', 'không trùng (email, SKU)', 'định danh chính của hàng, đích của FK'],
      ['Số lượng', '—', 'nhiều (candidate keys)', 'một'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ba ràng buộc, ba mục đích không thay thế nhau",
      code:
        "CREATE TABLE users (\n" +
        "  id         BIGSERIAL PRIMARY KEY,        -- = UNIQUE + NOT NULL + khoá chính\n" +
        "  email      TEXT NOT NULL UNIQUE,         -- định danh nghiệp vụ\n" +
        "  username   TEXT UNIQUE,                  -- cho phép NULL (chưa đặt tên)\n" +
        "  tenant_id  BIGINT NOT NULL,\n" +
        "  code       TEXT,\n" +
        "  CONSTRAINT uq_tenant_code UNIQUE (tenant_id, code)   -- unique tổ hợp\n" +
        ");\n" +
        "\n" +
        "-- PRIMARY KEY:\n" +
        "--  - MỘT bảng chỉ có MỘT\n" +
        "--  - tự động NOT NULL + UNIQUE\n" +
        "--  - là mục tiêu mặc định của khoá ngoại\n" +
        "--  - trong MySQL/InnoDB nó còn quyết định THỨ TỰ VẬT LÝ của dữ liệu\n" +
        "--    (clustered index) -> chọn PK tăng dần rất quan trọng cho hiệu năng ghi\n" +
        "\n" +
        "-- UNIQUE:\n" +
        "--  - có bao nhiêu cũng được\n" +
        "--  - CHO PHÉP NULL, và theo chuẩn SQL thì NHIỀU NULL đều hợp lệ\n" +
        "--    (vì NULL <> NULL) -> không chống trùng được các hàng chưa có giá trị\n" +
        "INSERT INTO users (email, username, tenant_id) VALUES (\u0027a@x.com\u0027, NULL, 1);\n" +
        "INSERT INTO users (email, username, tenant_id) VALUES (\u0027b@x.com\u0027, NULL, 1);  -- OK!\n" +
        "--  - Postgres 15+ có: UNIQUE NULLS NOT DISTINCT -> coi các NULL là trùng nhau\n" +
        "\n" +
        "-- NOT NULL:\n" +
        "--  - ràng buộc rẻ nhất và có giá trị nhất. Nó loại bỏ cả một lớp bug NULL.\n" +
        "--  - mặc định nên là NOT NULL; chỉ cho phép NULL khi \"không biết\" là\n" +
        "--    trạng thái hợp lệ có ý nghĩa nghiệp vụ.\n" +
        "\n" +
        "-- Cả PK lẫn UNIQUE đều tự tạo INDEX -> chúng vừa là ràng buộc vừa là index.",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: '`CASE` expression dùng để làm gì? `COALESCE` vs `CASE`?',
  answer:
    '`CASE` là biểu thức điều kiện, dùng ở `SELECT`, `WHERE`, `ORDER BY`, `GROUP BY`, aggregate:\n' +
    '- Dạng searched: `CASE WHEN x > 10 THEN \'high\' WHEN x > 0 THEN \'low\' ELSE \'zero\' END`.\n' +
    '- Dạng simple: `CASE status WHEN 1 THEN \'active\' ELSE \'inactive\' END`.\n\n' +
    '`COALESCE(a, b, c)` = trả giá trị non-NULL đầu tiên = `CASE WHEN a IS NOT NULL THEN a WHEN b IS NOT NULL THEN b ELSE c END` (viết gọn).',
  essence:
    '`CASE` là "if/else của SQL" cho mọi logic phân nhánh trong truy vấn. `COALESCE`/`NULLIF` là các case đặc biệt phổ biến được viết gọn.',
  example:
    'Sắp xếp tuỳ biến: `ORDER BY CASE status WHEN \'URGENT\' THEN 0 WHEN \'NORMAL\' THEN 1 ELSE 2 END, created_at`. Hiển thị: `COALESCE(nickname, full_name, \'Ẩn danh\') AS display_name`.',
  viz: {
    type: 'tree',
    title: 'CASE — "if/else của SQL"',
    root: {
      label: 'Dùng ở SELECT, WHERE, ORDER BY, GROUP BY, aggregate',
      children: [
        { label: 'Searched', note: 'CASE WHEN x > 10 THEN "high" WHEN x > 0 THEN "low" ELSE "zero" END' },
        { label: 'Simple', note: 'CASE status WHEN 1 THEN "active" ELSE "inactive" END' },
        { label: 'COALESCE(a, b, c)', note: '= trả giá trị non-NULL đầu tiên (viết gọn của CASE)' },
        { label: 'NULLIF(a, b)', note: 'trả NULL nếu a = b' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Rẽ nhánh trong truy vấn",
      code:
        "-- SEARCHED CASE — điều kiện tuỳ ý, khớp cái ĐẦU TIÊN rồi dừng\n" +
        "SELECT id, amount,\n" +
        "  CASE\n" +
        "    WHEN amount >= 10000000 THEN \u0027VIP\u0027\n" +
        "    WHEN amount >= 1000000  THEN \u0027Thường\u0027\n" +
        "    ELSE \u0027Nhỏ\u0027                          -- không có ELSE -> trả NULL\n" +
        "  END AS phan_loai\n" +
        "FROM orders;\n" +
        "\n" +
        "-- SIMPLE CASE — so sánh bằng với một biểu thức\n" +
        "SELECT CASE status WHEN \u0027NEW\u0027 THEN \u0027Mới\u0027 WHEN \u0027PAID\u0027 THEN \u0027Đã trả\u0027 ELSE \u0027?\u0027 END\n" +
        "FROM orders;\n" +
        "\n" +
        "-- COALESCE — trả về giá trị ĐẦU TIÊN KHÔNG NULL. Ngắn gọn hơn CASE cho\n" +
        "-- đúng bài toán đó:\n" +
        "SELECT COALESCE(nickname, username, email, \u0027Ẩn danh\u0027) AS ten_hien_thi FROM users;\n" +
        "-- Tương đương CASE WHEN nickname IS NOT NULL THEN nickname WHEN ... END\n" +
        "\n" +
        "-- Khi nào dùng CASE thay COALESCE: điều kiện KHÁC \"IS NOT NULL\"\n" +
        "SELECT CASE WHEN phone <> \u0027\u0027 THEN phone ELSE email END FROM users;\n" +
        "-- COALESCE không xử lý được chuỗi rỗng (nó không phải NULL).\n" +
        "\n" +
        "-- CASE trong ORDER BY — sắp xếp theo thứ tự nghiệp vụ tuỳ ý\n" +
        "SELECT * FROM orders\n" +
        "ORDER BY CASE status WHEN \u0027URGENT\u0027 THEN 1 WHEN \u0027NEW\u0027 THEN 2 ELSE 3 END, created_at;\n" +
        "\n" +
        "-- CASE trong aggregate -> conditional aggregation (xem câu riêng)\n" +
        "-- CẢNH BÁO HIỆU NĂNG: CASE trên cột trong WHERE làm MẤT INDEX.",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: 'Semi-join, anti-join và "tìm hàng không có cặp khớp"?',
  answer:
    '- **Semi-join**: "có tồn tại ít nhất một hàng khớp bên kia" — trả về hàng bảng trái, không nhân bản. Viết bằng `EXISTS` hoặc `IN`.\n' +
    '- **Anti-join**: "không có hàng nào khớp bên kia". Viết bằng `NOT EXISTS`, hoặc `LEFT JOIN ... WHERE right.key IS NULL`.\n\n' +
    'Optimizer nhận diện các mẫu này và thực thi hiệu quả (hash semi/anti join).',
  essence:
    'Semi/anti-join trả lời "có/không có quan hệ" mà không nhân đôi hàng như INNER JOIN. `NOT EXISTS` và `LEFT JOIN + IS NULL` là hai cách viết anti-join tiêu chuẩn.',
  example:
    '"Sản phẩm chưa bao giờ được đặt": `SELECT p.* FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)` — hoặc `LEFT JOIN order_items oi ON oi.product_id = p.id WHERE oi.product_id IS NULL`.',
  viz: {
    type: 'compare',
    cols: ['Semi-join', 'Anti-join'],
    rows: [
      ['Trả về', 'hàng bảng trái CÓ ít nhất một hàng khớp bên kia', 'hàng bảng trái KHÔNG có hàng nào khớp'],
      ['Không nhân bản hàng', 'đúng — khác INNER JOIN', 'đúng'],
      ['Viết bằng', 'EXISTS hoặc IN', 'NOT EXISTS, hoặc LEFT JOIN ... WHERE right.key IS NULL'],
    ],
  },
  code: {
    lang: 'sql',
    prompt: 'Trả về tên (cột name) các sản phẩm CHƯA TỪNG xuất hiện trong order_items (chưa bao giờ được đặt).',
    tables:
      'CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT);\n' +
      'CREATE TABLE order_items (id INTEGER PRIMARY KEY, product_id INTEGER, qty INTEGER);',
    datasets: [
      "INSERT INTO products VALUES (1,'Ban phim'),(2,'Chuot'),(3,'Man hinh'),(4,'Tai nghe');\n" +
        'INSERT INTO order_items VALUES (1,1,2),(2,2,1),(3,1,1);',
      "INSERT INTO products VALUES (1,'Cap'),(2,'Sac'),(3,'Op lung');\n" +
        'INSERT INTO order_items VALUES (1,2,5);',
    ],
    starter: 'SELECT name\nFROM products p\nWHERE NOT EXISTS (\n  SELECT 1 FROM order_items oi WHERE ...\n)',
    solution:
      'SELECT name FROM products p\n' +
      'WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Ba cách viết, và cái nào an toàn nhất",
      code:
        "-- SEMI-JOIN: \"có tồn tại ít nhất một hàng khớp\" — KHÔNG nhân bản hàng\n" +
        "SELECT c.* FROM customers c\n" +
        "WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);\n" +
        "-- Ưu điểm so với JOIN: không cần DISTINCT, và DB dừng ngay khi tìm thấy\n" +
        "-- hàng khớp đầu tiên (short-circuit).\n" +
        "\n" +
        "-- ANTI-JOIN: \"không có hàng nào khớp\" — ba cách viết\n" +
        "-- 1) NOT EXISTS — AN TOÀN NHẤT, luôn nên dùng\n" +
        "SELECT c.* FROM customers c\n" +
        "WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);\n" +
        "\n" +
        "-- 2) LEFT JOIN ... IS NULL — tương đương, plan thường giống\n" +
        "SELECT c.* FROM customers c\n" +
        "LEFT JOIN orders o ON o.customer_id = c.id\n" +
        "WHERE o.id IS NULL;\n" +
        "-- Lưu ý: cột kiểm tra IS NULL phải là cột KHÔNG BAO GIỜ NULL trong bảng\n" +
        "-- phải (thường là khoá chính), nếu không kết quả sẽ sai.\n" +
        "\n" +
        "-- 3) NOT IN — NGUY HIỂM, tránh dùng\n" +
        "SELECT * FROM customers\n" +
        "WHERE id NOT IN (SELECT customer_id FROM orders);\n" +
        "-- Chỉ cần MỘT customer_id là NULL -> toàn bộ kết quả RỖNG. Và lỗi này im lặng.\n" +
        "\n" +
        "-- ỨNG DỤNG thực tế:\n" +
        "--  - khách chưa từng mua (chiến dịch marketing)\n" +
        "--  - sản phẩm chưa có đánh giá\n" +
        "--  - đơn hàng chưa có thanh toán -> đối soát dữ liệu\n" +
        "--  - tìm bản ghi mồ côi sau khi migrate",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Ép kiểu ngầm (implicit coercion) gây bug và mất index như thế nào?',
  answer:
    'Khi so sánh hai kiểu khác nhau, DB ép một bên. Hậu quả:\n' +
    '- **Mất index**: `WHERE phone = 123456` khi `phone` là `varchar` → DB có thể ép **cột** sang số (hoặc ngược lại) → index trên `phone` không dùng được, full scan.\n' +
    '- **Kết quả sai/lỗi**: so sánh chuỗi `\'10\'` với `\'9\'` theo thứ tự từ điển; `\'2024-13-01\'` ép date lỗi.\n' +
    '- **MySQL** đặc biệt "dễ dãi": `WHERE id = \'5abc\'` có thể khớp `id = 5`.',
  essence:
    'Luôn so sánh cùng kiểu và truyền tham số đúng kiểu. Ép ngầm hoặc để bên cột bị ép = index vô hiệu + rủi ro so sánh sai.',
  example:
    '`WHERE created_date = \'2024-06-01\'` khi `created_date` là `timestamp` → so sánh với `2024-06-01 00:00:00`, bỏ sót cả ngày. Đúng: `WHERE created_date >= \'2024-06-01\' AND created_date < \'2024-06-02\'` (sargable, dùng index).',
  viz: {
    type: 'flow',
    title: 'Ép kiểu ngầm → mất index',
    nodes: ['WHERE phone = 123456 (phone là varchar)', 'DB ép CỘT sang số (hoặc ngược lại)', 'index trên phone không dùng được', 'full scan'],
    steps: [
      { to: 1, label: 'so sánh hai kiểu khác nhau → DB ép một bên' },
      { to: 3, label: 'luôn so sánh cùng kiểu; truyền tham số đúng kiểu' },
      { to: 3, label: 'MySQL đặc biệt dễ dãi: WHERE id = "5abc" có thể khớp id = 5' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "So sánh khác kiểu là index biến mất",
      code:
        "-- Cột id kiểu BIGINT, truyền vào chuỗi -> DB phải ép kiểu\n" +
        "SELECT * FROM users WHERE id = \u0027123\u0027;        -- thường vẫn dùng được index\n" +
        "                                             -- (ép hằng số sang BIGINT)\n" +
        "\n" +
        "-- Nhưng NGƯỢC LẠI thì hỏng: cột TEXT so với số -> phải ép TỪNG HÀNG\n" +
        "SELECT * FROM users WHERE phone = 84901234567;\n" +
        "-- -> DB phải chuyển phone của MỌI HÀNG sang số -> SEQ SCAN, index vô dụng.\n" +
        "SELECT * FROM users WHERE phone = \u002784901234567\u0027;   -- đúng kiểu -> dùng index\n" +
        "\n" +
        "-- BUG THỰC SỰ NGUY HIỂM trong MySQL — so sánh chuỗi với số:\n" +
        "--   SELECT * FROM users WHERE code = 0;\n" +
        "--   MySQL ép mọi chuỗi không phải số thành 0 -> TRẢ VỀ GẦN NHƯ TOÀN BỘ BẢNG.\n" +
        "--   Đây là một vector tấn công thật (SQL injection kiểu type juggling).\n" +
        "\n" +
        "-- Ép kiểu ngầm khi JOIN hai cột khác kiểu -> mất index trên cả hai\n" +
        "SELECT * FROM orders o JOIN customers c ON o.customer_id = c.id;\n" +
        "-- customer_id là VARCHAR còn c.id là BIGINT -> join cực chậm.\n" +
        "-- -> Thống nhất kiểu dữ liệu giữa các bảng NGAY TỪ THIẾT KẾ.\n" +
        "\n" +
        "-- Kiểm tra bằng EXPLAIN: thấy cast hoặc \"Seq Scan\" ở chỗ đáng lẽ có index\n" +
        "EXPLAIN ANALYZE SELECT * FROM users WHERE phone = 84901234567;\n" +
        "\n" +
        "-- Trong ứng dụng: dùng PREPARED STATEMENT với tham số đúng kiểu — nó vừa\n" +
        "-- chống SQL injection vừa tránh ép kiểu ngoài ý muốn.",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: '`LIMIT` / `OFFSET` cho phân trang — hoạt động và hạn chế?',
  answer:
    '`ORDER BY x LIMIT 20 OFFSET 10000`: DB phải **tạo ra và bỏ đi** 10.000 hàng đầu trước khi trả 20 hàng → càng trang sau càng chậm (O(offset)).\n\n' +
    'Vấn đề khác: nếu dữ liệu thay đổi giữa các lần gọi (thêm/xoá hàng), trang tiếp theo có thể **lặp** hoặc **bỏ sót** hàng.\n\n' +
    '`ORDER BY` **bắt buộc** và phải **định danh duy nhất** (thêm PK làm tie-breaker) để kết quả ổn định.',
  essence:
    'OFFSET phân trang đơn giản nhưng chi phí tuyến tính theo số trang và không ổn định khi dữ liệu đổi. Ổn cho vài trang đầu; sâu hơn thì dùng keyset pagination.',
  example:
    'Trang 500 của kết quả tìm kiếm: `OFFSET 10000` mất vài giây mỗi lần. Keyset: `WHERE (created_at, id) < (:lastCreatedAt, :lastId) ORDER BY created_at DESC, id DESC LIMIT 20` — luôn nhanh, dùng index, không nhảy/lặp hàng.',
  viz: {
    type: 'compare',
    cols: ['LIMIT / OFFSET', 'Keyset pagination'],
    rows: [
      ['Chi phí theo trang', 'DB tạo ra & bỏ đi OFFSET hàng → O(offset)', 'luôn nhanh (range trên index)'],
      ['Khi dữ liệu đổi giữa các lần gọi', 'trang tiếp có thể LẶP hoặc BỎ SÓT hàng', 'ổn định'],
      ['ORDER BY', 'bắt buộc + tie-breaker (PK)', 'WHERE (created_at, id) < (:last...) ORDER BY ... LIMIT'],
      ['Dùng cho', 'vài trang đầu', 'trang sâu, feed, export lớn'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Vì sao trang sâu càng lúc càng chậm",
      code:
        "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 0;      -- nhanh\n" +
        "SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 100000; -- rất chậm\n" +
        "-- DB phải ĐỌC RỒI VỨT BỎ 100.000 hàng để trả về 20 hàng.\n" +
        "-- Chi phí tăng TUYẾN TÍNH theo độ sâu trang.\n" +
        "\n" +
        "-- VẤN ĐỀ THỨ HAI, ít người để ý: dữ liệu thay đổi giữa các trang.\n" +
        "-- Có bản ghi mới chèn vào -> hàng ở ranh giới bị LẶP hoặc BỊ NHẢY QUA.\n" +
        "\n" +
        "-- KEYSET PAGINATION (seek method) — giải quyết cả hai:\n" +
        "SELECT * FROM orders\n" +
        "WHERE (created_at, id) < (\u00272026-09-01 10:00:00\u0027, 12345)   -- con trỏ trang trước\n" +
        "ORDER BY created_at DESC, id DESC\n" +
        "LIMIT 20;\n" +
        "-- Luôn chỉ đọc 20 hàng, trang thứ 1 hay thứ 100.000 đều nhanh như nhau.\n" +
        "CREATE INDEX idx_orders_created_id ON orders (created_at DESC, id DESC);\n" +
        "-- Phải thêm cột UNIQUE (id) vào khoá sắp xếp để không nhập nhằng khi\n" +
        "-- created_at trùng nhau.\n" +
        "\n" +
        "-- ĐÁNH ĐỔI: không nhảy tới \"trang 57\" được, không hiện tổng số trang.\n" +
        "-- -> Hợp cho infinite scroll, API công khai, bảng dữ liệu lớn.\n" +
        "-- OFFSET vẫn ổn cho: trang admin ít dữ liệu, hoặc cần nhảy trang tuỳ ý.\n" +
        "\n" +
        "-- COUNT(*) để hiện tổng số trang cũng RẤT ĐẮT trên bảng lớn.\n" +
        "-- Ước lượng nhanh trong Postgres:\n" +
        "SELECT reltuples::bigint FROM pg_class WHERE relname = \u0027orders\u0027;",
    },
  ],
},
{
  cat: 'DDL',
  q: 'DDL, DML, DCL, TCL là gì?',
  answer:
    '- **DDL (Data Definition)**: `CREATE`, `ALTER`, `DROP`, `TRUNCATE` — định nghĩa cấu trúc. Nhiều DB **auto-commit** DDL (không rollback được — trừ Postgres có DDL transactional).\n' +
    '- **DML (Data Manipulation)**: `SELECT`, `INSERT`, `UPDATE`, `DELETE` — thao tác dữ liệu.\n' +
    '- **DCL (Data Control)**: `GRANT`, `REVOKE` — phân quyền.\n' +
    '- **TCL (Transaction Control)**: `BEGIN`, `COMMIT`, `ROLLBACK`, `SAVEPOINT` — quản lý giao dịch.',
  essence:
    'DDL đổi schema, DML đổi dữ liệu, DCL đổi quyền, TCL gom DML thành đơn vị nguyên tử. Điểm cần nhớ: DDL trong MySQL/Oracle không nằm trong transaction — một `ALTER` giữa chừng migration không tự hoàn tác.',
  example:
    'Postgres: bọc cả migration `ALTER TABLE ... ADD COLUMN` + `UPDATE` backfill trong một transaction → lỗi thì rollback sạch. MySQL: `ALTER` tự commit → nếu bước sau fail, cột đã thêm rồi, phải viết migration đảo ngược.',
  viz: {
    type: 'tree',
    title: 'DDL / DML / DCL / TCL',
    root: {
      label: 'DDL đổi schema · DML đổi dữ liệu · DCL đổi quyền · TCL gom DML nguyên tử',
      children: [
        { label: 'DDL', note: 'CREATE, ALTER, DROP, TRUNCATE — nhiều DB AUTO-COMMIT (Postgres có DDL transactional)' },
        { label: 'DML', note: 'SELECT, INSERT, UPDATE, DELETE' },
        { label: 'DCL', note: 'GRANT, REVOKE' },
        { label: 'TCL', note: 'BEGIN, COMMIT, ROLLBACK, SAVEPOINT' },
        { label: 'Nhớ', note: 'DDL trong MySQL/Oracle không nằm trong transaction — ALTER giữa chừng migration không tự hoàn tác' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Bốn nhóm lệnh SQL",
      code:
        "-- DDL (Data Definition Language) — định nghĩa cấu trúc\n" +
        "CREATE TABLE orders (id BIGSERIAL PRIMARY KEY, amount NUMERIC(12,2));\n" +
        "ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT \u0027NEW\u0027;\n" +
        "DROP TABLE orders;\n" +
        "TRUNCATE TABLE orders;\n" +
        "-- Postgres: DDL nằm trong transaction được (rollback được) — rất mạnh cho migration.\n" +
        "-- MySQL/Oracle: DDL tự COMMIT ngầm -> không rollback được.\n" +
        "\n" +
        "-- DML (Data Manipulation Language) — thao tác dữ liệu\n" +
        "INSERT INTO orders (amount) VALUES (100);\n" +
        "UPDATE orders SET status = \u0027PAID\u0027 WHERE id = 1;\n" +
        "DELETE FROM orders WHERE id = 1;\n" +
        "SELECT * FROM orders;              -- có tài liệu xếp SELECT vào nhóm riêng (DQL)\n" +
        "\n" +
        "-- DCL (Data Control Language) — phân quyền\n" +
        "GRANT SELECT, INSERT ON orders TO app_user;\n" +
        "REVOKE DELETE ON orders FROM app_user;\n" +
        "CREATE ROLE readonly;\n" +
        "GRANT USAGE ON SCHEMA public TO readonly;\n" +
        "GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;\n" +
        "\n" +
        "-- TCL (Transaction Control Language) — điều khiển giao dịch\n" +
        "BEGIN;\n" +
        "  UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n" +
        "  SAVEPOINT sp1;\n" +
        "  UPDATE accounts SET balance = balance + 100 WHERE id = 2;\n" +
        "  -- ROLLBACK TO SAVEPOINT sp1;    -- quay lui một phần\n" +
        "COMMIT;\n" +
        "-- ROLLBACK;\n" +
        "\n" +
        "-- Ý NGHĨA THỰC TẾ: phân biệt nhóm giúp hiểu quyền hạn (app chỉ nên có DML,\n" +
        "-- không có DDL) và hiểu cái gì rollback được.",
    },
  ],
},
{
  cat: 'Kiểu dữ liệu',
  q: 'Số học ngày tháng cơ bản (date arithmetic) và múi giờ?',
  answer:
    '- Trừ hai ngày → khoảng (`interval` trong Postgres, số ngày trong MySQL `DATEDIFF`).\n' +
    '- Cộng khoảng: `created_at + INTERVAL \'7 days\'`, `DATE_ADD(d, INTERVAL 1 MONTH)`.\n' +
    '- Cắt/nhóm: `DATE_TRUNC(\'month\', ts)` (Postgres), `DATE_FORMAT` (MySQL).\n' +
    '- **`timestamp` vs `timestamptz`**: `timestamptz` (Postgres) lưu theo UTC, chuyển đổi theo session timezone khi đọc — dùng cái này cho sự kiện thực. `timestamp` (không tz) là "wall clock" mơ hồ.',
  essence:
    'Lưu thời điểm thực bằng `timestamptz`/UTC, chỉ chuyển sang giờ địa phương ở tầng hiển thị. Trộn `timestamp` không tz với nhiều múi giờ là nguồn bug kinh niên.',
  example:
    '"Đơn hàng trong 24h qua": `WHERE created_at >= now() - INTERVAL \'24 hours\'`. "Doanh thu theo tháng (giờ VN)": `GROUP BY date_trunc(\'month\', created_at AT TIME ZONE \'Asia/Ho_Chi_Minh\')`.',
  viz: {
    type: 'tree',
    title: 'Số học ngày tháng — lưu UTC, chỉ chuyển giờ địa phương ở tầng hiển thị',
    root: {
      label: 'Trộn timestamp không tz với nhiều múi giờ = bug kinh niên',
      children: [
        { label: 'Trừ hai ngày → khoảng', note: 'interval (Postgres) / DATEDIFF (MySQL)' },
        { label: 'Cộng khoảng', note: "created_at + INTERVAL '7 days'" },
        { label: 'Cắt/nhóm', note: "DATE_TRUNC('month', ts) (Postgres) / DATE_FORMAT (MySQL)" },
        { label: 'timestamptz vs timestamp', note: 'timestamptz lưu UTC, chuyển theo session tz — dùng cho sự kiện thực; timestamp là "wall clock" mơ hồ' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "timestamptz và các bẫy múi giờ",
      code:
        "-- KIỂU DỮ LIỆU (Postgres):\n" +
        "--   timestamp      — KHÔNG có múi giờ. Chỉ dùng khi thời điểm không gắn\n" +
        "--                    với một mốc tuyệt đối (ví dụ \"9 giờ sáng theo giờ địa phương\").\n" +
        "--   timestamptz    — CÓ múi giờ. Lưu nội bộ dưới dạng UTC, tự chuyển đổi\n" +
        "--                    khi đọc theo TimeZone của phiên. GẦN NHƯ LUÔN dùng cái này.\n" +
        "--   date, time, interval\n" +
        "\n" +
        "CREATE TABLE events (\n" +
        "  id         BIGSERIAL PRIMARY KEY,\n" +
        "  happened_at TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "\n" +
        "SHOW timezone;\n" +
        "SET TIME ZONE \u0027Asia/Ho_Chi_Minh\u0027;\n" +
        "SELECT happened_at AT TIME ZONE \u0027Asia/Ho_Chi_Minh\u0027 FROM events;\n" +
        "\n" +
        "-- SỐ HỌC\n" +
        "SELECT now() - INTERVAL \u00277 days\u0027;\n" +
        "SELECT now() + INTERVAL \u00271 month 3 hours\u0027;\n" +
        "SELECT AGE(now(), created_at) FROM users;              -- khoảng cách dạng interval\n" +
        "SELECT EXTRACT(EPOCH FROM (now() - created_at)) / 3600 AS gio_truoc FROM users;\n" +
        "SELECT DATE_TRUNC(\u0027month\u0027, created_at) AS thang FROM orders;   -- gom theo tháng\n" +
        "\n" +
        "-- BẪY QUAN TRỌNG: hàm trên CỘT làm MẤT INDEX\n" +
        "SELECT * FROM orders WHERE DATE(created_at) = \u00272026-09-05\u0027;    -- SEQ SCAN\n" +
        "SELECT * FROM orders                                            -- dùng được index\n" +
        "WHERE created_at >= \u00272026-09-05\u0027 AND created_at < \u00272026-09-06\u0027;\n" +
        "-- Dùng khoảng NỬA MỞ [từ, đến) — tránh sai sót với giây/mili giây cuối ngày.\n" +
        "\n" +
        "-- BẪY MÚI GIỜ: \"hôm nay\" của người dùng khác \"hôm nay\" theo UTC.\n" +
        "-- Báo cáo theo ngày phải chuyển múi giờ TRƯỚC khi cắt ngày:\n" +
        "SELECT DATE_TRUNC(\u0027day\u0027, created_at AT TIME ZONE \u0027Asia/Ho_Chi_Minh\u0027) AS ngay,\n" +
        "       COUNT(*)\n" +
        "FROM orders GROUP BY 1;",
    },
  ],
},
{
  cat: 'Truy vấn',
  q: '`GROUP BY` semantics: cột nào được phép trong SELECT?',
  answer:
    'Chuẩn SQL: mọi cột trong `SELECT` (không nằm trong aggregate) **phải** xuất hiện trong `GROUP BY` — vì mỗi nhóm chỉ trả một hàng, cột không gom thì "chọn giá trị nào?".\n\n' +
    '- **Postgres / SQL Server / Oracle**: enforce nghiêm (lỗi nếu vi phạm), nhưng cho phép cột **phụ thuộc hàm** vào PK đã group.\n' +
    '- **MySQL** (mặc định `ONLY_FULL_GROUP_BY` từ 5.7): cũng enforce; tắt chế độ này cho phép chọn giá trị "bất kỳ" của nhóm → nguồn bug (giá trị không xác định).',
  essence:
    '`GROUP BY` biến nhiều hàng thành một hàng/nhóm — mọi cột không aggregate phải xác định được (nằm trong GROUP BY hoặc phụ thuộc hàm). MySQL với `ONLY_FULL_GROUP_BY` tắt là "bom hẹn giờ".',
  example:
    '`SELECT customer_id, customer_name, SUM(amount) FROM orders GROUP BY customer_id` → Postgres lỗi (`customer_name` không group). Sửa: `GROUP BY customer_id, customer_name`, hoặc `MAX(customer_name)`, hoặc JOIN bảng customers sau khi aggregate.',
  viz: {
    type: 'flow',
    title: 'GROUP BY semantics',
    nodes: ['GROUP BY biến nhiều hàng → một hàng/nhóm', 'mọi cột không aggregate phải xác định được (trong GROUP BY hoặc phụ thuộc hàm PK)', 'Postgres/SQL Server/Oracle: enforce nghiêm (lỗi nếu vi phạm)', 'MySQL: ONLY_FULL_GROUP_BY (mặc định 5.7+); tắt → chọn giá trị "bất kỳ" của nhóm = bom hẹn giờ'],
    steps: [
      { to: 1, label: 'cột không gom thì "chọn giá trị nào?"' },
      { to: 2, label: 'sửa: thêm vào GROUP BY, dùng MAX(...), hoặc JOIN sau khi aggregate' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Quy tắc phụ thuộc hàm",
      code:
        "-- QUY TẮC CHUẨN: mọi cột trong SELECT phải HOẶC nằm trong GROUP BY,\n" +
        "-- HOẶC nằm trong một hàm aggregate.\n" +
        "SELECT customer_id, status, COUNT(*)\n" +
        "FROM orders GROUP BY customer_id;              -- LỖI: status không thuộc nhóm nào\n" +
        "-- Lý do: mỗi nhóm có NHIỀU giá trị status khác nhau -> DB biết chọn cái nào?\n" +
        "\n" +
        "SELECT customer_id, status, COUNT(*)\n" +
        "FROM orders GROUP BY customer_id, status;      -- đúng\n" +
        "SELECT customer_id, MAX(status), COUNT(*)\n" +
        "FROM orders GROUP BY customer_id;              -- đúng: dùng aggregate\n" +
        "\n" +
        "-- PHỤ THUỘC HÀM (Postgres, chuẩn SQL): nếu đã GROUP BY khoá CHÍNH của bảng\n" +
        "-- thì mọi cột khác của bảng đó là xác định -> được phép:\n" +
        "SELECT c.id, c.name, c.email, COUNT(o.id)\n" +
        "FROM customers c LEFT JOIN orders o ON o.customer_id = c.id\n" +
        "GROUP BY c.id;                                 -- hợp lệ vì c.id là PRIMARY KEY\n" +
        "\n" +
        "-- MYSQL: mặc định BẬT ONLY_FULL_GROUP_BY từ 5.7. Trước đó nó cho phép chọn\n" +
        "-- cột bất kỳ và trả về giá trị NGẪU NHIÊN từ nhóm -> nguồn của rất nhiều\n" +
        "-- bug âm thầm trong code cũ.\n" +
        "-- SET sql_mode = \u0027ONLY_FULL_GROUP_BY\u0027;   -- nên giữ BẬT\n" +
        "\n" +
        "-- GROUP BY theo VỊ TRÍ hoặc theo BIỂU THỨC:\n" +
        "SELECT DATE_TRUNC(\u0027month\u0027, created_at) AS thang, SUM(amount)\n" +
        "FROM orders GROUP BY 1 ORDER BY 1;             -- 1 = cột đầu trong SELECT\n" +
        "\n" +
        "-- GROUP BY trên tập RỖNG trả về MỘT hàng (với aggregate) hoặc KHÔNG hàng nào:\n" +
        "SELECT COUNT(*) FROM orders WHERE 1 = 0;                    -- trả về 0\n" +
        "SELECT customer_id, COUNT(*) FROM orders WHERE 1 = 0 GROUP BY customer_id;  -- rỗng",
    },
  ],
},
]);
