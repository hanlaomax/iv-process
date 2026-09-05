SS.addQuestions('sql', [
{
  cat: 'Window functions',
  q: 'Window function là gì? `OVER`, `PARTITION BY`, `ORDER BY`?',
  answer:
    'Window function tính toán trên **một tập hàng liên quan** tới hàng hiện tại, nhưng **không gộp** chúng lại (khác `GROUP BY` — vẫn giữ nguyên số hàng).\n\n' +
    '`func() OVER (PARTITION BY a ORDER BY b)`:\n' +
    '- `PARTITION BY a`: chia thành các nhóm; window reset ở mỗi nhóm.\n' +
    '- `ORDER BY b`: thứ tự trong nhóm (cần cho `ROW_NUMBER`, running total, `LAG`).\n\n' +
    'Ví dụ hàm: `ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`, `SUM()/AVG() OVER`, `LAG()/LEAD()`, `FIRST_VALUE()/LAST_VALUE()`, `NTILE()`.',
  essence:
    'Window function = "aggregate mà không mất hàng chi tiết". Nó cho phép so sánh mỗi hàng với nhóm của nó (xếp hạng, % tổng, so với hàng trước) trong một lần quét.',
  example:
    '"Xếp hạng doanh thu nhân viên trong từng phòng ban": `SELECT name, dept, revenue, RANK() OVER (PARTITION BY dept ORDER BY revenue DESC) AS rank_in_dept FROM sales`. Mỗi nhân viên vẫn là một hàng, kèm thứ hạng.',
  viz: {
    type: 'tree',
    title: 'Aggregate mà không mất hàng chi tiết',
    root: {
      label: 'func() OVER (PARTITION BY a ORDER BY b)',
      children: [
        { label: 'OVER', note: 'khai báo đây là window function — giữ nguyên số hàng, khác GROUP BY' },
        { label: 'PARTITION BY a', note: 'chia thành nhóm; window reset ở mỗi nhóm' },
        { label: 'ORDER BY b', note: 'thứ tự trong nhóm — cần cho ROW_NUMBER, running total, LAG/LEAD' },
        { label: 'Hàm', note: 'ROW_NUMBER/RANK/DENSE_RANK, SUM/AVG OVER, LAG/LEAD, FIRST/LAST_VALUE, NTILE' },
      ],
    },
  },
  code: {
    lang: 'sql',
    prompt:
      'Trả về name, dept, salary và thứ hạng lương TRONG TỪNG phòng ban (cột rnk), lương cao nhất = 1. ' +
      'Dùng window function.',
    tables: 'CREATE TABLE emp (name TEXT, dept TEXT, salary INTEGER);',
    datasets: [
      "INSERT INTO emp VALUES ('An','IT',100),('Binh','IT',120),('Cuong','IT',90),('Dung','HR',80),('Emi','HR',80);",
      "INSERT INTO emp VALUES ('P','A',10),('Q','A',20),('R','B',50),('S','B',40),('T','B',60);",
    ],
    starter: 'SELECT name, dept, salary,\n  RANK() OVER (...) AS rnk\nFROM emp',
    solution:
      'SELECT name, dept, salary, RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rnk FROM emp',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Tính toán trên nhóm mà KHÔNG gộp hàng lại",
      code:
        "-- Khác GROUP BY ở điểm cốt lõi: window function GIỮ NGUYÊN số hàng.\n" +
        "SELECT\n" +
        "  id, customer_id, amount,\n" +
        "  SUM(amount)     OVER (PARTITION BY customer_id)              AS tong_cua_khach,\n" +
        "  AVG(amount)     OVER (PARTITION BY customer_id)              AS tb_cua_khach,\n" +
        "  amount - AVG(amount) OVER (PARTITION BY customer_id)         AS lech_so_voi_tb,\n" +
        "  ROW_NUMBER()    OVER (PARTITION BY customer_id ORDER BY amount DESC) AS thu_tu,\n" +
        "  RANK()          OVER (ORDER BY amount DESC)                  AS hang,\n" +
        "  DENSE_RANK()    OVER (ORDER BY amount DESC)                  AS hang_lien_tuc,\n" +
        "  PERCENT_RANK()  OVER (ORDER BY amount)                       AS phan_vi,\n" +
        "  NTILE(4)        OVER (ORDER BY amount)                       AS nhom_tu_phan\n" +
        "FROM orders;\n" +
        "\n" +
        "-- PARTITION BY — chia thành các \"cửa sổ\" độc lập (giống GROUP BY nhưng không gộp)\n" +
        "-- ORDER BY    — thứ tự TRONG cửa sổ; cần cho ROW_NUMBER, LAG/LEAD, running total\n" +
        "-- Bỏ cả hai -> cửa sổ là TOÀN BỘ kết quả\n" +
        "\n" +
        "-- PHÂN BIỆT BA HÀM XẾP HẠNG (điểm 100, 100, 90):\n" +
        "--   ROW_NUMBER  -> 1, 2, 3   (luôn duy nhất, phá hoà bằng tuỳ ý)\n" +
        "--   RANK        -> 1, 1, 3   (đồng hạng, rồi NHẢY số)\n" +
        "--   DENSE_RANK  -> 1, 1, 2   (đồng hạng, KHÔNG nhảy)\n" +
        "\n" +
        "-- Đặt tên cửa sổ khi dùng lại nhiều lần:\n" +
        "SELECT id, SUM(amount) OVER w, AVG(amount) OVER w\n" +
        "FROM orders WINDOW w AS (PARTITION BY customer_id);\n" +
        "\n" +
        "-- LƯU Ý: window function chạy SAU WHERE/GROUP BY/HAVING -> KHÔNG lọc được\n" +
        "-- theo kết quả của nó trong cùng câu lệnh. Phải bọc subquery hoặc CTE:\n" +
        "SELECT * FROM (\n" +
        "  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) rn\n" +
        "  FROM orders\n" +
        ") t WHERE rn = 1;",
    },
  ],
},
{
  cat: 'Window functions',
  q: 'Window frame (`ROWS`/`RANGE BETWEEN`): running total và moving average?',
  answer:
    'Frame xác định **những hàng nào** trong partition được đưa vào tính toán cho hàng hiện tại:\n' +
    '- `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` → running total (cộng dồn từ đầu).\n' +
    '- `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` → tổng/trung bình 7 hàng gần nhất (moving).\n' +
    '- `RANGE` dựa trên **giá trị** `ORDER BY` (các hàng cùng giá trị coi như một), `ROWS` dựa trên **vị trí vật lý**.\n\n' +
    'Mặc định frame khi có `ORDER BY`: `RANGE UNBOUNDED PRECEDING AND CURRENT ROW` — dễ gây bất ngờ với `LAST_VALUE`.',
  essence:
    'Frame là "cửa sổ trượt" trong partition. `ROWS` cho window theo số hàng cố định (moving average); `UNBOUNDED PRECEDING` cho cộng dồn. Luôn khai báo frame tường minh khi dùng `LAST_VALUE`/`SUM OVER`.',
  example:
    'Doanh thu cộng dồn theo ngày: `SUM(amount) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING)`. Trung bình động 7 ngày: `AVG(amount) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['ROWS', 'RANGE'],
    rows: [
      ['Cơ sở tính frame', 'vị trí vật lý của hàng', 'giá trị ORDER BY (hàng cùng giá trị coi như một)'],
      ['Running total', 'ROWS UNBOUNDED PRECEDING AND CURRENT ROW', 'cũng được nhưng cộng cả nhóm cùng giá trị'],
      ['Moving average N hàng', 'ROWS BETWEEN 6 PRECEDING AND CURRENT ROW', 'không chính xác theo số hàng'],
      ['Mặc định khi có ORDER BY', '—', 'RANGE UNBOUNDED PRECEDING AND CURRENT ROW (bất ngờ với LAST_VALUE)'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Running total và moving average",
      code:
        "-- FRAME xác định những hàng nào trong partition được đưa vào phép tính\n" +
        "-- cho MỖI hàng.\n" +
        "SELECT\n" +
        "  ngay, doanh_thu,\n" +
        "  -- LUỸ KẾ từ đầu tới hàng hiện tại\n" +
        "  SUM(doanh_thu) OVER (ORDER BY ngay\n" +
        "       ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)        AS luy_ke,\n" +
        "  -- TRUNG BÌNH TRƯỢT 7 ngày (6 hàng trước + hàng hiện tại)\n" +
        "  AVG(doanh_thu) OVER (ORDER BY ngay\n" +
        "       ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)                AS tb_7_ngay,\n" +
        "  -- Cửa sổ TRUNG TÂM: 3 trước, 3 sau\n" +
        "  AVG(doanh_thu) OVER (ORDER BY ngay\n" +
        "       ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)                AS tb_trung_tam,\n" +
        "  -- Tổng TOÀN BỘ partition\n" +
        "  SUM(doanh_thu) OVER ()                                         AS tong_tat_ca\n" +
        "FROM daily_revenue;\n" +
        "\n" +
        "-- ROWS vs RANGE — khác biệt quan trọng khi có GIÁ TRỊ TRÙNG:\n" +
        "--   ROWS  đếm theo SỐ HÀNG vật lý\n" +
        "--   RANGE gộp mọi hàng có CÙNG giá trị ORDER BY vào cùng một bậc\n" +
        "SELECT amount,\n" +
        "  SUM(amount) OVER (ORDER BY amount ROWS  BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS theo_rows,\n" +
        "  SUM(amount) OVER (ORDER BY amount RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS theo_range\n" +
        "FROM orders;\n" +
        "-- Hai giá trị 100 giống nhau: ROWS cho hai kết quả khác nhau, RANGE cho\n" +
        "-- cùng một kết quả (đã cộng cả hai).\n" +
        "\n" +
        "-- MẶC ĐỊNH khi có ORDER BY mà không ghi frame:\n" +
        "--   RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n" +
        "-- -> đây là nguồn của nhiều kết quả \"sai khó hiểu\" khi có giá trị trùng.\n" +
        "-- Cần chính xác theo hàng -> LUÔN ghi rõ ROWS.\n" +
        "\n" +
        "-- RANGE theo KHOẢNG GIÁ TRỊ (Postgres 11+): trung bình 7 ngày THẬT\n" +
        "-- (đúng cả khi thiếu ngày, khác với \"7 hàng\"):\n" +
        "SUM(doanh_thu) OVER (ORDER BY ngay RANGE BETWEEN INTERVAL \u00276 days\u0027 PRECEDING AND CURRENT ROW)",
    },
  ],
},
{
  cat: 'Window functions',
  q: '`LAG` / `LEAD` và bài toán so sánh với hàng trước/sau?',
  answer:
    '`LAG(col, n, default) OVER (PARTITION BY ... ORDER BY ...)` — lấy giá trị `col` của hàng **cách n hàng phía trước** (mặc định n=1). `LEAD` = phía sau.\n\n' +
    'Dùng cho: chênh lệch so với kỳ trước (growth), phát hiện thay đổi trạng thái, tính khoảng thời gian giữa hai sự kiện liên tiếp, gap detection.',
  essence:
    '`LAG`/`LEAD` đưa "hàng kế bên" vào cùng hàng hiện tại — biến phép so sánh giữa các hàng (vốn cần self-join) thành một biểu thức đơn giản trong một lần quét.',
  example:
    '"Tăng trưởng doanh thu tháng so với tháng trước": `SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) AS delta, round(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month)) / LAG(revenue) OVER (ORDER BY month), 1) AS pct FROM monthly`.',
  viz: {
    type: 'flow',
    title: 'Đưa "hàng kế bên" vào cùng hàng hiện tại — không cần self-join',
    nodes: ['LAG(col, n): hàng cách n phía trước', 'HÀNG HIỆN TẠI', 'LEAD(col, n): hàng cách n phía sau'],
    steps: [
      { to: 1, label: 'Hàng hiện tại: có col của chính nó' },
      { to: 0, label: 'LAG kéo giá trị hàng trước vào — tính delta, growth, gap' },
      { to: 2, label: 'LEAD kéo giá trị hàng sau vào — khoảng thời gian tới sự kiện kế tiếp' },
    ],
  },
  code: {
    lang: 'sql',
    prompt:
      'Bảng monthly(month, revenue) đã có sẵn theo tháng tăng dần. Trả về month, revenue, và chênh lệch ' +
      'so với tháng liền trước (cột delta). Tháng đầu tiên: delta = NULL.',
    tables: 'CREATE TABLE monthly (month TEXT PRIMARY KEY, revenue INTEGER);',
    datasets: [
      "INSERT INTO monthly VALUES ('2024-01',100),('2024-02',150),('2024-03',120),('2024-04',200);",
      "INSERT INTO monthly VALUES ('2025-01',50),('2025-02',50),('2025-03',80);",
    ],
    starter: 'SELECT month, revenue,\n  revenue - LAG(revenue) OVER (ORDER BY month) AS delta\nFROM monthly',
    solution: 'SELECT month, revenue, revenue - LAG(revenue) OVER (ORDER BY month) AS delta FROM monthly',
    ordered: true,
  },
  demo: [
    {
      lang: "sql",
      title: "Truy cập hàng khác mà không self-join",
      code:
        "SELECT\n" +
        "  ngay, doanh_thu,\n" +
        "  LAG(doanh_thu)     OVER (ORDER BY ngay)          AS hom_truoc,\n" +
        "  LEAD(doanh_thu)    OVER (ORDER BY ngay)          AS hom_sau,\n" +
        "  LAG(doanh_thu, 7)  OVER (ORDER BY ngay)          AS cung_ky_tuan_truoc,\n" +
        "  LAG(doanh_thu, 1, 0) OVER (ORDER BY ngay)        AS hom_truoc_mac_dinh_0,\n" +
        "  doanh_thu - LAG(doanh_thu) OVER (ORDER BY ngay)  AS thay_doi,\n" +
        "  ROUND(100.0 * (doanh_thu - LAG(doanh_thu) OVER (ORDER BY ngay))\n" +
        "        / NULLIF(LAG(doanh_thu) OVER (ORDER BY ngay), 0), 2) AS phan_tram_thay_doi\n" +
        "FROM daily_revenue\n" +
        "ORDER BY ngay;\n" +
        "-- LAG(cột, n, mặc_định): tham số thứ ba tránh NULL ở hàng đầu tiên.\n" +
        "\n" +
        "-- TÍNH KHOẢNG CÁCH giữa hai sự kiện của cùng một người dùng:\n" +
        "SELECT user_id, event_at,\n" +
        "  event_at - LAG(event_at) OVER (PARTITION BY user_id ORDER BY event_at) AS khoang_cach\n" +
        "FROM events;\n" +
        "\n" +
        "-- PHÁT HIỆN KHOẢNG TRỐNG trong dãy (gap detection):\n" +
        "SELECT * FROM (\n" +
        "  SELECT id, LEAD(id) OVER (ORDER BY id) - id AS gap FROM invoices\n" +
        ") t WHERE gap > 1;\n" +
        "\n" +
        "-- CHIA PHIÊN (sessionization) — mẫu rất hay dùng cho phân tích hành vi:\n" +
        "SELECT user_id, event_at,\n" +
        "  SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY event_at) AS session_id\n" +
        "FROM (\n" +
        "  SELECT user_id, event_at,\n" +
        "    CASE WHEN event_at - LAG(event_at) OVER (PARTITION BY user_id ORDER BY event_at)\n" +
        "              > INTERVAL \u002730 minutes\u0027 THEN 1 ELSE 0 END AS is_new_session\n" +
        "  FROM events\n" +
        ") t;\n" +
        "\n" +
        "-- FIRST_VALUE / LAST_VALUE / NTH_VALUE — lấy hàng đầu/cuối trong cửa sổ.\n" +
        "-- CẨN THẬN với LAST_VALUE: frame mặc định kết thúc ở CURRENT ROW ->\n" +
        "-- phải ghi rõ frame mới đúng:\n" +
        "LAST_VALUE(amount) OVER (ORDER BY ngay ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)",
    },
  ],
},
{
  cat: 'CTE',
  q: 'CTE (`WITH`) là gì? Có tối ưu / materialize không?',
  answer:
    'CTE đặt tên cho một truy vấn con, dùng lại trong query chính — giúp **đọc dễ**, tránh lặp subquery, và cho phép **recursive**.\n\n' +
    'Materialization:\n' +
    '- **Postgres < 12**: CTE luôn được **materialize** (chạy một lần, lưu kết quả) → có thể là "optimization fence" (chặn optimizer đẩy predicate vào).\n' +
    '- **Postgres ≥ 12**: CTE không recursive, dùng một lần, không side-effect → được **inline** (như subquery). Ép bằng `WITH x AS MATERIALIZED (...)` / `NOT MATERIALIZED`.\n' +
    '- SQL Server / MySQL 8: thường inline.',
  essence:
    'CTE trước hết là công cụ đọc/tổ chức query. Về hiệu năng: biết DB của bạn inline hay materialize — nếu materialize, một CTE dùng ở nhiều nơi được tính một lần (tốt), nhưng predicate không đẩy xuống được (xấu).',
  example:
    'Postgres ≥ 12: `WITH recent AS MATERIALIZED (SELECT * FROM huge_log WHERE ts > now() - interval \'1 day\')` — ép materialize để `recent` được tính một lần rồi join nhiều bảng, thay vì optimizer chạy lại filter đắt cho mỗi join.',
  viz: {
    type: 'compare',
    corner: 'Hành vi',
    cols: ['Materialize (PG < 12)', 'Inline (PG ≥ 12, SQL Server, MySQL 8)'],
    rows: [
      ['Tính mấy lần', 'một lần, lưu kết quả', 'gộp vào query như subquery'],
      ['Predicate pushdown', 'bị chặn (optimization fence)', 'optimizer đẩy được predicate vào'],
      ['CTE dùng nhiều nơi', 'tính một lần (tốt)', 'có thể tính lại mỗi lần dùng'],
      ['Ép thủ công', '—', 'WITH x AS MATERIALIZED / NOT MATERIALIZED'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Chia nhỏ truy vấn phức tạp",
      code:
        "WITH don_thang_nay AS (\n" +
        "  SELECT customer_id, SUM(amount) AS tong\n" +
        "  FROM orders\n" +
        "  WHERE created_at >= DATE_TRUNC(\u0027month\u0027, now())\n" +
        "  GROUP BY customer_id\n" +
        "),\n" +
        "khach_vip AS (\n" +
        "  SELECT customer_id FROM don_thang_nay WHERE tong > 10000000\n" +
        ")\n" +
        "SELECT c.name, d.tong\n" +
        "FROM khach_vip v\n" +
        "JOIN don_thang_nay d ON d.customer_id = v.customer_id\n" +
        "JOIN customers c ON c.id = v.customer_id;\n" +
        "\n" +
        "-- LỢI ÍCH: đặt tên cho từng bước -> đọc như đọc code, dễ kiểm thử từng phần.\n" +
        "\n" +
        "-- MATERIALIZE HAY KHÔNG — điểm khác biệt lớn giữa các phiên bản:\n" +
        "--  Postgres <= 11: CTE LUÔN được materialize (tính xong, lưu tạm) ->\n" +
        "--    hàng rào tối ưu hoá: điều kiện WHERE bên ngoài KHÔNG đẩy vào trong\n" +
        "--    được -> nhiều truy vấn chậm bất ngờ.\n" +
        "--  Postgres 12+: CTE không đệ quy và chỉ dùng MỘT LẦN sẽ được INLINE\n" +
        "--    (như subquery) -> optimizer tự do hơn.\n" +
        "WITH t AS MATERIALIZED   (SELECT ...)   -- ÉP tính một lần (dùng khi CTE đắt\n" +
        "                                        -- và được tham chiếu nhiều lần)\n" +
        "WITH t AS NOT MATERIALIZED (SELECT ...) -- ÉP inline\n" +
        "\n" +
        "-- MySQL 8+ và SQL Server: CTE thường được inline, không phải hàng rào.\n" +
        "\n" +
        "-- CTE GHI DỮ LIỆU (data-modifying CTE) — rất mạnh, chỉ Postgres có:\n" +
        "WITH deleted AS (\n" +
        "  DELETE FROM orders WHERE created_at < \u00272025-01-01\u0027 RETURNING *\n" +
        ")\n" +
        "INSERT INTO orders_archive SELECT * FROM deleted;\n" +
        "-- Xoá và lưu trữ trong MỘT câu lệnh, nguyên tử.\n" +
        "-- Lưu ý: mọi nhánh của CTE nhìn thấy CÙNG một snapshot -> không thấy\n" +
        "-- thay đổi của nhau.",
    },
  ],
},
{
  cat: 'CTE',
  q: 'Recursive CTE — duyệt cây/đồ thị trong SQL?',
  answer:
    '```\n' +
    'WITH RECURSIVE tree AS (\n' +
    '  SELECT id, parent_id, name, 1 AS depth\n' +
    '  FROM categories WHERE parent_id IS NULL      -- anchor: gốc\n' +
    '  UNION ALL\n' +
    '  SELECT c.id, c.parent_id, c.name, t.depth + 1\n' +
    '  FROM categories c JOIN tree t ON c.parent_id = t.id  -- recursive\n' +
    ')\n' +
    'SELECT * FROM tree;\n' +
    '```\n' +
    'Anchor chạy một lần, phần recursive lặp cho tới khi không sinh hàng mới. Dùng cho: cây danh mục, org chart, BOM, đường đi trong đồ thị, chuỗi phụ thuộc.\n\n' +
    'Chú ý: cần điều kiện dừng (dữ liệu có chu trình → vòng lặp vô hạn; thêm `WHERE depth < 100` hoặc theo dõi visited).',
  essence:
    'Recursive CTE giải bài toán phân cấp/đồ thị (vốn khó trong SQL phẳng) bằng cách lặp: bắt đầu từ anchor, mỗi vòng nối thêm một "tầng". Cần chặn chu trình.',
  example:
    '"Tất cả cấp dưới (mọi tầng) của manager X": recursive CTE từ `WHERE id = X`, join `employees e ON e.manager_id = tree.id`. Kết quả: toàn bộ cây báo cáo, kèm `depth` để biết mấy cấp.',
  viz: {
    type: 'flow',
    title: 'Bắt đầu từ anchor, mỗi vòng nối thêm một "tầng"',
    nodes: ['Anchor: gốc (parent_id IS NULL)', 'UNION ALL', 'Recursive: JOIN tree ON parent_id = tree.id', 'Lặp tới khi không sinh hàng mới', 'Chặn chu trình (WHERE depth < 100)'],
    steps: [
      { to: 0, label: 'Anchor chạy một lần — lấy các hàng gốc' },
      { to: 2, label: 'Phần recursive nối con của tầng vừa có' },
      { to: 3, label: 'Lặp: mỗi vòng thêm một tầng sâu hơn' },
      { to: 4, label: 'Dữ liệu có chu trình → cần điều kiện dừng / theo dõi visited' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Đệ quy để đi qua quan hệ phân cấp",
      code:
        "-- Cấu trúc: phần NEO (anchor) UNION ALL phần ĐỆ QUY\n" +
        "WITH RECURSIVE cay_nhan_vien AS (\n" +
        "  -- NEO: điểm bắt đầu\n" +
        "  SELECT id, name, manager_id, 1 AS cap, name::text AS duong_dan\n" +
        "  FROM employees WHERE manager_id IS NULL\n" +
        "\n" +
        "  UNION ALL\n" +
        "\n" +
        "  -- ĐỆ QUY: tham chiếu chính CTE\n" +
        "  SELECT e.id, e.name, e.manager_id, c.cap + 1, c.duong_dan || \u0027 > \u0027 || e.name\n" +
        "  FROM employees e\n" +
        "  JOIN cay_nhan_vien c ON e.manager_id = c.id\n" +
        "  WHERE c.cap < 10                       -- CHẶN ĐỘ SÂU: bắt buộc, chống vòng lặp\n" +
        ")\n" +
        "SELECT * FROM cay_nhan_vien ORDER BY duong_dan;\n" +
        "\n" +
        "-- Duyệt NGƯỢC: tìm mọi cấp trên của một nhân viên\n" +
        "WITH RECURSIVE chuoi_quan_ly AS (\n" +
        "  SELECT id, name, manager_id FROM employees WHERE id = 42\n" +
        "  UNION ALL\n" +
        "  SELECT e.id, e.name, e.manager_id\n" +
        "  FROM employees e JOIN chuoi_quan_ly c ON e.id = c.manager_id\n" +
        ")\n" +
        "SELECT * FROM chuoi_quan_ly;\n" +
        "\n" +
        "-- SINH DÃY (không cần bảng):\n" +
        "WITH RECURSIVE ngay AS (\n" +
        "  SELECT DATE \u00272026-01-01\u0027 AS d\n" +
        "  UNION ALL\n" +
        "  SELECT d + 1 FROM ngay WHERE d < DATE \u00272026-12-31\u0027\n" +
        ") SELECT * FROM ngay;\n" +
        "-- (Postgres có generate_series() tiện hơn cho việc này.)\n" +
        "\n" +
        "-- CHỐNG VÒNG LẶP trong đồ thị có chu trình — bắt buộc, nếu không truy vấn\n" +
        "-- chạy mãi:\n" +
        "--   giữ mảng đường đi và kiểm tra: WHERE NOT (e.id = ANY(c.path))\n" +
        "--   hoặc Postgres 14+: ... CYCLE id SET is_cycle USING path\n" +
        "\n" +
        "-- CÂN NHẮC: cây rất sâu/rộng -> recursive CTE chậm. Cân nhắc mô hình khác:\n" +
        "-- closure table, materialized path, hoặc nested set.",
    },
  ],
},
{
  cat: 'View',
  q: 'View và materialized view khác nhau thế nào?',
  answer:
    '- **View**: truy vấn được lưu tên; mỗi lần query view, DB chạy lại truy vấn gốc. Không lưu dữ liệu, luôn mới. Dùng để: đóng gói logic phức tạp, kiểm soát truy cập (chỉ expose một số cột/hàng), tương thích ngược khi refactor schema.\n' +
    '- **Materialized view**: **lưu kết quả** như một bảng. Query cực nhanh, nhưng dữ liệu **cũ** cho tới khi `REFRESH MATERIALIZED VIEW` (Postgres — có `CONCURRENTLY` để không khoá đọc, cần unique index). Dùng cho: aggregate/report nặng chạy định kỳ.',
  essence:
    'View = "macro truy vấn" (luôn mới, không tăng tốc). Materialized view = "cache truy vấn dạng bảng" (nhanh, cũ, cần refresh). Chọn theo: cần realtime hay chấp nhận trễ để đổi tốc độ.',
  example:
    'Dashboard "top 100 sản phẩm bán chạy tháng này" — query join + aggregate mất 20s: materialized view refresh mỗi 15 phút bằng cron → dashboard load < 100ms, dữ liệu trễ tối đa 15 phút (chấp nhận được). `REFRESH ... CONCURRENTLY` để không chặn người đang xem.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['View', 'Materialized view'],
    rows: [
      ['Lưu dữ liệu', 'không — chạy lại truy vấn gốc mỗi lần', 'có — lưu kết quả như một bảng'],
      ['Tốc độ query', 'bằng truy vấn gốc', 'cực nhanh (đọc bảng đã tính)'],
      ['Độ mới', 'luôn mới', 'cũ tới lần REFRESH kế tiếp'],
      ['Dùng cho', 'đóng gói logic, kiểm soát truy cập, tương thích ngược', 'aggregate/report nặng chạy định kỳ'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Truy vấn được đặt tên vs kết quả được lưu",
      code:
        "-- VIEW — chỉ là truy vấn được lưu tên. Mỗi lần gọi là chạy LẠI từ đầu.\n" +
        "CREATE VIEW active_orders AS\n" +
        "SELECT * FROM orders WHERE status <> \u0027CANCELLED\u0027;\n" +
        "SELECT * FROM active_orders WHERE customer_id = 1;\n" +
        "-- Optimizer gộp view vào truy vấn ngoài -> điều kiện WHERE được đẩy vào trong.\n" +
        "-- + luôn thấy dữ liệu MỚI NHẤT, không tốn dung lượng\n" +
        "-- + dùng để: đơn giản hoá truy vấn phức tạp, che cột nhạy cảm, tương thích ngược\n" +
        "-- - không tăng tốc gì cả\n" +
        "\n" +
        "-- MATERIALIZED VIEW — kết quả được TÍNH và LƯU thật trên đĩa.\n" +
        "CREATE MATERIALIZED VIEW mv_doanh_thu_ngay AS\n" +
        "SELECT DATE_TRUNC(\u0027day\u0027, created_at) AS ngay,\n" +
        "       COUNT(*) AS so_don, SUM(amount) AS doanh_thu\n" +
        "FROM orders GROUP BY 1;\n" +
        "\n" +
        "CREATE UNIQUE INDEX ON mv_doanh_thu_ngay (ngay);   -- BẮT BUỘC cho CONCURRENTLY\n" +
        "CREATE INDEX ON mv_doanh_thu_ngay (doanh_thu);     -- index được như bảng thường\n" +
        "\n" +
        "REFRESH MATERIALIZED VIEW mv_doanh_thu_ngay;              -- KHOÁ người đọc\n" +
        "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_doanh_thu_ngay; -- không khoá, chậm hơn\n" +
        "-- + đọc CỰC NHANH (tính sẵn), index được\n" +
        "-- - dữ liệu CŨ tới lần refresh sau -> phải có lịch refresh\n" +
        "-- - tốn dung lượng\n" +
        "\n" +
        "-- UPDATABLE VIEW — view đơn giản (một bảng, không aggregate) ghi được:\n" +
        "CREATE VIEW v AS SELECT id, name FROM users WHERE active = true\n" +
        "WITH CHECK OPTION;      -- chặn ghi dữ liệu nằm ngoài điều kiện của view\n" +
        "-- View phức tạp: dùng INSTEAD OF trigger.\n" +
        "\n" +
        "-- CHỌN: cần dữ liệu tươi -> VIEW. Truy vấn tổng hợp nặng chạy thường xuyên\n" +
        "-- và chấp nhận trễ vài phút -> MATERIALIZED VIEW.",
    },
  ],
},
{
  cat: 'Nâng cao',
  q: '`GROUPING SETS`, `ROLLUP`, `CUBE` — tính nhiều mức tổng hợp một lần?',
  answer:
    'Thay vì `UNION ALL` nhiều query `GROUP BY` khác nhau:\n' +
    '- **`GROUPING SETS ((a,b), (a), ())`**: chỉ định chính xác các tổ hợp nhóm cần.\n' +
    '- **`ROLLUP(a, b)`** = `GROUPING SETS ((a,b), (a), ())` — tổng theo cấp bậc (subtotal + grand total).\n' +
    '- **`CUBE(a, b)`** = mọi tổ hợp `((a,b),(a),(b),())`.\n\n' +
    'Hàm `GROUPING(col)` = 1 nếu col bị "gộp toàn bộ" ở hàng đó (phân biệt subtotal với NULL thật).',
  essence:
    '`ROLLUP`/`CUBE` tính nhiều mức aggregate (chi tiết + subtotal + total) trong **một** lần quét bảng — thay cho nhiều query hoặc xử lý ở tầng app.',
  example:
    'Báo cáo doanh thu theo (năm, quý) kèm tổng năm và tổng toàn bộ: `SELECT year, quarter, SUM(amount) FROM sales GROUP BY ROLLUP(year, quarter)` → ra các hàng chi tiết (year, quarter), hàng subtotal mỗi năm (quarter = NULL), và một hàng grand total.',
  viz: {
    type: 'tree',
    title: 'Nhiều mức aggregate trong một lần quét bảng',
    root: {
      label: 'Thay cho UNION ALL nhiều query GROUP BY khác nhau',
      children: [
        { label: 'GROUPING SETS ((a,b),(a),())', note: 'chỉ định chính xác các tổ hợp nhóm cần' },
        { label: 'ROLLUP(a, b)', note: '= ((a,b),(a),()) — tổng theo cấp bậc: subtotal + grand total' },
        { label: 'CUBE(a, b)', note: '= ((a,b),(a),(b),()) — mọi tổ hợp' },
        { label: 'GROUPING(col)', note: '= 1 nếu col bị gộp toàn bộ ở hàng đó — phân biệt subtotal với NULL thật' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Nhiều mức tổng hợp trong MỘT lần quét",
      code:
        "-- Thay vì UNION ALL nhiều câu GROUP BY (quét bảng nhiều lần):\n" +
        "SELECT region, product, SUM(amount) AS tong\n" +
        "FROM sales\n" +
        "GROUP BY GROUPING SETS ((region, product), (region), (product), ());\n" +
        "-- Cho ra: tổng theo (vùng, sản phẩm), theo vùng, theo sản phẩm, và tổng chung.\n" +
        "\n" +
        "-- ROLLUP — phân cấp từ trái sang phải (tổng nhỏ dần)\n" +
        "SELECT nam, quy, thang, SUM(amount)\n" +
        "FROM sales GROUP BY ROLLUP (nam, quy, thang);\n" +
        "-- = GROUPING SETS ((nam,quy,thang), (nam,quy), (nam), ())\n" +
        "-- Đúng cho báo cáo có tiểu tổng theo cấp: năm > quý > tháng.\n" +
        "\n" +
        "-- CUBE — MỌI tổ hợp có thể\n" +
        "SELECT region, product, SUM(amount) FROM sales GROUP BY CUBE (region, product);\n" +
        "-- = GROUPING SETS ((region,product), (region), (product), ())\n" +
        "-- n cột -> 2^n tổ hợp -> cẩn thận với nhiều cột.\n" +
        "\n" +
        "-- GROUPING() phân biệt NULL \"tổng cộng\" với NULL \"dữ liệu thật\" —\n" +
        "-- rất quan trọng khi cột có thể chứa NULL:\n" +
        "SELECT\n" +
        "  CASE WHEN GROUPING(region) = 1 THEN \u0027TẤT CẢ VÙNG\u0027 ELSE region END AS vung,\n" +
        "  CASE WHEN GROUPING(product) = 1 THEN \u0027TẤT CẢ SP\u0027 ELSE product END AS sp,\n" +
        "  SUM(amount)\n" +
        "FROM sales GROUP BY ROLLUP (region, product);\n" +
        "\n" +
        "-- LỢI ÍCH: một lần quét bảng thay vì bốn -> nhanh hơn nhiều trên bảng lớn,\n" +
        "-- và không phải viết UNION ALL dài dòng.",
    },
  ],
},
{
  cat: 'JOIN',
  q: '`LATERAL` join dùng để làm gì?',
  answer:
    '`LATERAL` cho phép một subquery/hàm ở mệnh đề `FROM` **tham chiếu cột của bảng đứng trước** nó — như một "vòng lặp for" trên bảng bên trái.\n\n' +
    'Dùng cho:\n' +
    '- **Top-N per group**: với mỗi khách hàng, lấy 3 đơn hàng mới nhất.\n' +
    '- Gọi hàm trả bảng (`json_array_elements`, `generate_series`) theo từng hàng.\n' +
    '- Tính toán phụ thuộc hàng bên trái mà không viết subquery lồng trong SELECT.',
  essence:
    '`LATERAL` = "cho mỗi hàng bên trái, chạy truy vấn này với giá trị của nó". Giải quyết gọn "top-N mỗi nhóm" và "mở rộng theo hàng" mà JOIN thường không làm được.',
  example:
    '"3 đơn mới nhất của mỗi khách": `SELECT c.name, o.* FROM customers c CROSS JOIN LATERAL (SELECT * FROM orders WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 3) o`. Không có LATERAL phải dùng window function `ROW_NUMBER()` + filter.',
  viz: {
    type: 'flow',
    title: '"Cho mỗi hàng bên trái, chạy truy vấn này với giá trị của nó"',
    nodes: ['Bảng bên trái', 'LATERAL: lặp từng hàng', 'Subquery tham chiếu cột hàng trái', 'Nối kết quả vào hàng đó'],
    steps: [
      { to: 0, label: 'customers c — nguồn của vòng lặp' },
      { to: 2, label: 'Với mỗi c: SELECT ... WHERE customer_id = c.id ORDER BY ... LIMIT 3' },
      { to: 3, label: 'Top-N per group, gọi hàm trả bảng theo từng hàng' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Subquery bên phải được THAM CHIẾU hàng bên trái",
      code:
        "-- Subquery thường KHÔNG thấy được cột của bảng bên trái. LATERAL cho phép\n" +
        "-- điều đó — như một vòng lặp for chạy cho từng hàng.\n" +
        "SELECT c.id, c.name, don.id AS don_moi_nhat, don.amount\n" +
        "FROM customers c\n" +
        "LEFT JOIN LATERAL (\n" +
        "  SELECT id, amount FROM orders o\n" +
        "  WHERE o.customer_id = c.id           -- <- tham chiếu c, chỉ LATERAL mới cho phép\n" +
        "  ORDER BY created_at DESC\n" +
        "  LIMIT 3                              -- TOP 3 đơn của MỖI khách\n" +
        ") don ON true\n" +
        "ORDER BY c.id;\n" +
        "-- Đây là cách sạch nhất cho bài toán \"top N mỗi nhóm\" khi N > 1.\n" +
        "-- LEFT JOIN LATERAL ... ON true để giữ cả khách chưa có đơn.\n" +
        "\n" +
        "-- Gọi HÀM TRẢ VỀ TẬP cho từng hàng:\n" +
        "SELECT o.id, t.tag\n" +
        "FROM orders o, LATERAL unnest(o.tags) AS t(tag);\n" +
        "\n" +
        "-- TÍNH TOÁN NHIỀU BƯỚC mà không lặp lại biểu thức:\n" +
        "SELECT o.id, calc.thue, calc.tong\n" +
        "FROM orders o,\n" +
        "LATERAL (SELECT o.amount * 0.1 AS thue) t,\n" +
        "LATERAL (SELECT t.thue, o.amount + t.thue AS tong) calc;\n" +
        "\n" +
        "-- SO VỚI CORRELATED SUBQUERY: correlated subquery chỉ trả về MỘT giá trị\n" +
        "-- và một cột. LATERAL trả về NHIỀU HÀNG và NHIỀU CỘT.\n" +
        "\n" +
        "-- MySQL 8.0.14+ cũng có LATERAL; SQL Server dùng CROSS/OUTER APPLY\n" +
        "-- (cùng ý nghĩa, khác từ khoá).\n" +
        "\n" +
        "-- HIỆU NĂNG: LATERAL chạy subquery cho TỪNG hàng bên trái -> bảng trái\n" +
        "-- phải nhỏ, hoặc subquery phải có index tốt. Cần \"top 1 mỗi nhóm\" trên\n" +
        "-- bảng lớn thì DISTINCT ON hoặc ROW_NUMBER thường nhanh hơn.",
    },
  ],
},
{
  cat: 'Nâng cao',
  q: 'Greatest-N-per-group: các cách lấy "hàng mới nhất mỗi nhóm"?',
  answer:
    'Bài toán: mỗi `customer_id`, lấy đơn hàng có `created_at` lớn nhất (cả hàng, không chỉ max date).\n\n' +
    '1. **Window function**: `SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) rn FROM orders) t WHERE rn = 1`.\n' +
    '2. **`DISTINCT ON`** (Postgres): `SELECT DISTINCT ON (customer_id) * FROM orders ORDER BY customer_id, created_at DESC` — gọn nhất.\n' +
    '3. **LATERAL** (xem câu trên).\n' +
    '4. **Correlated subquery / anti-join**: `WHERE created_at = (SELECT max(created_at) FROM orders o2 WHERE o2.customer_id = o.customer_id)` — chậm và sai nếu có trùng max.',
  essence:
    'Cách chuẩn: `ROW_NUMBER()` + filter `= 1` (portable) hoặc `DISTINCT ON` (Postgres, ngắn nhất). Tránh correlated subquery so sánh max — chậm và mơ hồ khi trùng.',
  example:
    '"Trạng thái mới nhất của mỗi đơn hàng" từ bảng `order_status_history`: `SELECT DISTINCT ON (order_id) order_id, status, changed_at FROM order_status_history ORDER BY order_id, changed_at DESC`.',
  viz: {
    type: 'compare',
    corner: 'Cách',
    cols: ['ROW_NUMBER() = 1', 'DISTINCT ON', 'LATERAL', 'Correlated subquery = max'],
    rows: [
      ['Portable', 'có', 'Postgres', 'Postgres', 'có'],
      ['Ngắn gọn', 'trung bình', 'ngắn nhất', 'trung bình', 'dài'],
      ['Hiệu năng', 'tốt', 'tốt', 'tốt khi bảng trái nhỏ', 'chậm'],
      ['Đúng khi trùng max', 'có (chọn 1)', 'có (chọn 1)', 'có (LIMIT 1)', 'sai — ra nhiều hàng'],
    ],
  },
  code: {
    lang: 'sql',
    prompt:
      'Với mỗi customer_id, lấy id và amount của đơn hàng MỚI NHẤT (created_at lớn nhất). ' +
      'Mỗi khách đúng một hàng; giả sử không trùng created_at. Trả về: customer_id, id, amount.',
    tables:
      'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER, created_at TEXT);',
    datasets: [
      "INSERT INTO orders VALUES (1,1,100,'2024-01-01'),(2,1,50,'2024-03-01'),(3,2,999,'2024-02-15'),(4,2,10,'2024-02-10');",
      "INSERT INTO orders VALUES (1,7,5,'2025-05-05'),(2,8,1,'2025-01-01'),(3,8,2,'2025-06-06'),(4,8,3,'2025-02-02');",
    ],
    starter:
      'SELECT customer_id, id, amount FROM (\n' +
      '  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) rn\n' +
      '  FROM orders\n) t WHERE rn = 1',
    solution:
      'SELECT customer_id, id, amount FROM (\n' +
      '  SELECT customer_id, id, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) rn\n' +
      '  FROM orders\n) t WHERE rn = 1',
    ordered: false,
  },
  demo: [
    {
      lang: "sql",
      title: "Bốn cách, và cái nào nhanh nhất",
      code:
        "-- CÁCH 1: ROW_NUMBER — chuẩn SQL, chạy ở mọi hệ quản trị\n" +
        "SELECT * FROM (\n" +
        "  SELECT *, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) rn\n" +
        "  FROM orders\n" +
        ") t WHERE rn = 1;\n" +
        "-- Rõ ràng, đổi rn <= 3 là ra top 3. Nhưng phải QUÉT VÀ SẮP XẾP toàn bảng.\n" +
        "\n" +
        "-- CÁCH 2: DISTINCT ON — chỉ Postgres, NGẮN GỌN và thường NHANH NHẤT\n" +
        "SELECT DISTINCT ON (customer_id) *\n" +
        "FROM orders\n" +
        "ORDER BY customer_id, created_at DESC;\n" +
        "-- ORDER BY bắt buộc bắt đầu bằng cột trong DISTINCT ON.\n" +
        "CREATE INDEX idx_orders_cust_created ON orders (customer_id, created_at DESC);\n" +
        "-- Với index này, Postgres đọc lướt và lấy hàng đầu mỗi nhóm -> rất nhanh.\n" +
        "\n" +
        "-- CÁCH 3: LATERAL — tốt khi bảng \"nhóm\" NHỎ và bảng chi tiết LỚN\n" +
        "SELECT c.id, o.*\n" +
        "FROM customers c\n" +
        "LEFT JOIN LATERAL (\n" +
        "  SELECT * FROM orders WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1\n" +
        ") o ON true;\n" +
        "-- Chỉ chạm vào đúng vài hàng mỗi khách -> tốt nhất khi có 1.000 khách\n" +
        "-- nhưng 100 triệu đơn.\n" +
        "\n" +
        "-- CÁCH 4: subquery với MAX — cách cũ, DỄ SAI\n" +
        "SELECT * FROM orders o\n" +
        "WHERE created_at = (SELECT MAX(created_at) FROM orders WHERE customer_id = o.customer_id);\n" +
        "-- BẪY: hai đơn cùng created_at -> trả về CẢ HAI. Và phải quét hai lần.\n" +
        "\n" +
        "-- CHỌN: Postgres -> DISTINCT ON. Đa nền tảng -> ROW_NUMBER.\n" +
        "-- Bảng nhóm nhỏ + bảng chi tiết rất lớn -> LATERAL.\n" +
        "-- Điều quan trọng nhất trong mọi cách: có INDEX (nhóm, thứ tự DESC).",
    },
  ],
},
{
  cat: 'Phân vùng',
  q: 'Partition pruning và constraint exclusion hoạt động thế nào?',
  answer:
    'Khi query lọc theo **khoá partition**, optimizer chỉ quét các partition có thể chứa kết quả, bỏ qua phần còn lại.\n\n' +
    '- Điều kiện phải **sargable trên khoá partition**: `WHERE created_at >= \'2024-06-01\'` → pruning tốt; `WHERE date(created_at) = ...` → có thể phá pruning.\n' +
    '- **Postgres**: pruning lúc plan (`partition_pruning`) và cả lúc chạy (với tham số động, prepared statement).\n' +
    '- Join giữa hai bảng cùng partition scheme → **partition-wise join** (join từng cặp partition).',
  essence:
    'Pruning là lợi ích query lớn nhất của partitioning — nhưng chỉ hoạt động khi predicate lọc trực tiếp trên khoá partition. Bọc hàm quanh khoá partition = quét tất cả.',
  example:
    'Bảng `events` partition theo tuần, 2 năm dữ liệu (~104 partition). `WHERE occurred_at BETWEEN \'2024-06-01\' AND \'2024-06-07\'` → chỉ quét 1–2 partition. `WHERE extract(dow from occurred_at) = 1` (thứ Hai) → quét cả 104 partition.',
  viz: {
    type: 'compare',
    corner: 'Predicate',
    cols: ['Giữ pruning', 'Phá pruning'],
    rows: [
      ['Dạng WHERE', 'occurred_at >= \'2024-06-01\'', 'date(occurred_at) = ... / extract(dow ...)'],
      ['Sargable trên khoá partition', 'có', 'không (bọc hàm quanh khoá)'],
      ['Số partition quét (trên 104)', '1–2', 'tất cả 104'],
      ['Bonus', 'partition-wise join khi cùng scheme', '—'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Bỏ qua phân vùng không liên quan",
      code:
        "CREATE TABLE events (id BIGSERIAL, created_at TIMESTAMPTZ NOT NULL, data JSONB)\n" +
        "PARTITION BY RANGE (created_at);\n" +
        "CREATE TABLE events_2026_09 PARTITION OF events\n" +
        "  FOR VALUES FROM (\u00272026-09-01\u0027) TO (\u00272026-10-01\u0027);\n" +
        "\n" +
        "-- PRUNING HOẠT ĐỘNG: điều kiện trên khoá phân vùng là HẰNG SỐ\n" +
        "EXPLAIN SELECT * FROM events WHERE created_at >= \u00272026-09-01\u0027;\n" +
        "-- -> chỉ quét events_2026_09, các phân vùng khác bị loại ngay khi lập kế hoạch.\n" +
        "\n" +
        "-- PRUNING KHÔNG HOẠT ĐỘNG:\n" +
        "EXPLAIN SELECT * FROM events WHERE data->>\u0027type\u0027 = \u0027click\u0027;   -- không có điều\n" +
        "                                                              -- kiện trên khoá\n" +
        "                                                              -- -> quét MỌI phân vùng\n" +
        "EXPLAIN SELECT * FROM events WHERE DATE(created_at) = \u00272026-09-05\u0027;  -- hàm bọc cột\n" +
        "\n" +
        "-- RUNTIME PRUNING (Postgres 11+): loại phân vùng ngay cả khi giá trị chỉ\n" +
        "-- biết lúc CHẠY (prepared statement, tham số, subquery)\n" +
        "SET enable_partition_pruning = on;      -- mặc định on\n" +
        "EXPLAIN (ANALYZE) SELECT * FROM events WHERE created_at >= $1;\n" +
        "-- Trong plan sẽ thấy \"Subplans Removed: N\".\n" +
        "\n" +
        "-- CONSTRAINT EXCLUSION — cơ chế CŨ, dùng cho kế thừa bảng (inheritance)\n" +
        "-- kiểu trước Postgres 10. Nó dựa vào CHECK constraint trên bảng con.\n" +
        "SET constraint_exclusion = partition;   -- mặc định\n" +
        "-- Chậm hơn pruning và chỉ hoạt động lúc lập kế hoạch. Với partition khai\n" +
        "-- báo (declarative) từ PG10+ thì dùng pruning, không cần cái này.\n" +
        "\n" +
        "-- ĐIỀU QUAN TRỌNG NHẤT: mọi truy vấn NÓNG phải có điều kiện trên KHOÁ\n" +
        "-- PHÂN VÙNG. Nếu không, phân vùng làm hệ thống CHẬM HƠN bảng thường\n" +
        "-- (phải mở và quét hàng trăm bảng con).\n" +
        "EXPLAIN (ANALYZE, BUFFERS) SELECT ...;   -- kiểm tra số phân vùng thực sự bị quét",
    },
  ],
},
{
  cat: 'Sharding',
  q: 'Sharding: hash, range, directory — và bài toán cross-shard?',
  answer:
    'Chia dữ liệu qua **nhiều database instance** theo shard key:\n' +
    '- **Hash**: `shard = hash(key) % N` — phân bố đều, nhưng **thêm shard = resharding đau** (đổi mapping). Consistent hashing giảm bớt.\n' +
    '- **Range**: shard theo khoảng (A–M, N–Z) — dễ thêm shard, nhưng dễ **hot shard**.\n' +
    '- **Directory**: bảng tra cứu `key → shard` — linh hoạt nhất (di chuyển từng key), thêm một lookup + điểm lỗi.\n\n' +
    'Cross-shard: query/join/transaction trải nhiều shard rất khó — cần scatter-gather ở tầng app, hoặc tránh (chọn shard key sao cho truy vấn thường nằm trong một shard).',
  essence:
    'Sharding là biện pháp cuối khi một DB không kham nổi. Shard key quyết định tất cả: chọn sao cho phần lớn query chạm **một shard** (thường theo tenant/user). Cross-shard JOIN và transaction là thứ bạn thiết kế để **không cần**.',
  example:
    'SaaS shard theo `tenant_id` (directory): mọi query của một tenant nằm gọn một shard → không cross-shard. Analytics toàn hệ thống chạy trên data warehouse riêng (ETL từ mọi shard), không query trực tiếp các shard.',
  viz: {
    type: 'compare',
    corner: 'Chiến lược',
    cols: ['Hash', 'Range', 'Directory'],
    rows: [
      ['Phân bố', 'đều', 'lệch được', 'tuỳ mapping'],
      ['Thêm shard', 'resharding đau (consistent hashing giảm bớt)', 'dễ', 'dễ (di chuyển từng key)'],
      ['Hot shard', 'ít', 'dễ bị', 'kiểm soát được'],
      ['Chi phí', 'thấp', 'thấp', 'thêm lookup + điểm lỗi'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Chia dữ liệu ra nhiều database",
      code:
        "-- HASH SHARDING: shard = hash(key) % N\n" +
        "--   + phân bố ĐỀU, không có hot shard\n" +
        "--   - THÊM SHARD phải di chuyển gần như TOÀN BỘ dữ liệu (modulo đổi)\n" +
        "--   -> dùng CONSISTENT HASHING để chỉ di chuyển 1/N dữ liệu\n" +
        "\n" +
        "-- RANGE SHARDING: shard 1 giữ id 1-1tr, shard 2 giữ 1tr-2tr\n" +
        "--   + truy vấn theo KHOẢNG hiệu quả, thêm shard dễ\n" +
        "--   - dễ HOT SHARD: dữ liệu mới luôn đổ vào shard cuối\n" +
        "\n" +
        "-- DIRECTORY SHARDING: một bảng tra cứu ánh xạ key -> shard\n" +
        "CREATE TABLE shard_map (tenant_id BIGINT PRIMARY KEY, shard_id INT NOT NULL);\n" +
        "--   + linh hoạt nhất: di chuyển từng tenant tuỳ ý, tenant lớn cho shard riêng\n" +
        "--   - bảng tra cứu thành điểm nghẽn và điểm lỗi -> phải cache\n" +
        "\n" +
        "-- CHỌN SHARD KEY là quyết định QUAN TRỌNG NHẤT và khó sửa nhất:\n" +
        "--  - phân bố đều\n" +
        "--  - phần lớn truy vấn phải BIẾT được key này (nếu không -> scatter-gather)\n" +
        "--  - dữ liệu cần join thường nằm cùng shard (tenant_id, user_id là ứng viên tốt)\n" +
        "\n" +
        "-- BÀI TOÁN CROSS-SHARD:\n" +
        "-- 1) JOIN giữa các shard -> KHÔNG làm được ở tầng DB. Phải gộp ở ứng dụng,\n" +
        "--    hoặc NHÂN BẢN bảng tra cứu nhỏ sang mọi shard.\n" +
        "-- 2) TRANSACTION xuyên shard -> không có 2PC thực dụng -> dùng saga/outbox.\n" +
        "-- 3) UNIQUE toàn cục -> dùng UUID/snowflake thay vì auto-increment.\n" +
        "-- 4) TỔNG HỢP toàn cục (COUNT, SUM) -> hỏi mọi shard rồi cộng, hoặc duy trì\n" +
        "--    bảng tổng hợp riêng.\n" +
        "-- 5) PHÂN TRANG xuyên shard -> rất khó làm đúng; thường đổi sang keyset.\n" +
        "\n" +
        "-- TRƯỚC KHI SHARD: hãy thử replica đọc, partition, tối ưu truy vấn, và\n" +
        "-- máy lớn hơn. Sharding làm mọi thứ phức tạp lên nhiều lần và rất khó lui.",
    },
  ],
},
{
  cat: 'Vận hành',
  q: 'Read replica và read/write splitting: xử lý replication lag thế nào?',
  answer:
    'Route write → primary, read → replica để scale đọc. Vấn đề: replica **trễ** (async) → "read your own write" fail (user cập nhật xong, load lại thấy dữ liệu cũ).\n\n' +
    'Xử lý:\n' +
    '- **Sticky / read-after-write**: sau khi user ghi, route read của user đó về primary trong X giây.\n' +
    '- **Causal consistency**: primary trả LSN/GTID sau khi ghi; read chờ replica đạt LSN đó (Postgres: `pg_wait_for_lsn`-like ở tầng app; MySQL: `WAIT_FOR_EXECUTED_GTID_SET`).\n' +
    '- Đọc **không nhạy staleness** (feed, search, report) → replica thoải mái.\n' +
    '- Giám sát lag, rút replica khỏi pool nếu lag vượt ngưỡng.',
  essence:
    'Read/write splitting đổi scale đọc lấy tính không nhất quán tạm thời. Phân loại từng read: "cần thấy write vừa rồi" → primary/causal; "chấp nhận trễ vài giây" → replica.',
  example:
    'User đổi avatar → PUT tới primary → response kèm cờ "vừa ghi". App route mọi GET của user này về primary trong 5 giây (cookie/session flag). Feed của người khác đọc replica bình thường.',
  viz: {
    type: 'tree',
    title: 'Phân loại từng read theo nhu cầu nhất quán',
    root: {
      label: 'Read/write splitting đổi scale đọc lấy nhất quán tạm thời',
      children: [
        { label: 'Sticky / read-after-write', note: 'sau khi user ghi, route read của user đó về primary trong X giây' },
        { label: 'Causal consistency', note: 'primary trả LSN/GTID; read chờ replica đạt LSN đó (WAIT_FOR_EXECUTED_GTID_SET)' },
        { label: 'Đọc không nhạy staleness', note: 'feed, search, report → replica thoải mái' },
        { label: 'Giám sát lag', note: 'rút replica khỏi pool nếu lag vượt ngưỡng' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Tách tải đọc, và xử lý độ trễ nhân bản",
      code:
        "-- Ghi vào PRIMARY, đọc từ REPLICA. Nhưng replica LUÔN có độ trễ.\n" +
        "SELECT now() - pg_last_xact_replay_timestamp() AS lag;     -- trên replica\n" +
        "SELECT client_addr, state, replay_lag FROM pg_stat_replication;  -- trên primary\n" +
        "\n" +
        "-- VẤN ĐỀ KINH ĐIỂN \"read-your-own-write\": người dùng lưu hồ sơ rồi tải lại\n" +
        "-- trang, đọc từ replica chưa kịp đồng bộ -> thấy dữ liệu CŨ -> tưởng mất dữ liệu.\n" +
        "\n" +
        "-- CÁCH XỬ LÝ, theo thứ tự nên dùng:\n" +
        "-- 1) STICKY: sau khi GHI, ĐỌC từ primary trong một khoảng ngắn (vài giây)\n" +
        "--    -> đơn giản và hiệu quả nhất trong thực tế.\n" +
        "-- 2) Định tuyến theo NGỮ NGHĨA: mọi truy vấn trong luồng nghiệp vụ quan\n" +
        "--    trọng đọc từ primary; báo cáo/danh sách đọc từ replica.\n" +
        "@Transactional(readOnly = true)     // Spring: đánh dấu để routing datasource\n" +
        "                                    // chuyển sang replica\n" +
        "-- 3) CHỜ ĐỒNG BỘ tới một vị trí LSN cụ thể (chính xác nhất, phức tạp hơn):\n" +
        "SELECT pg_current_wal_lsn();                       -- trên primary sau khi ghi\n" +
        "SELECT pg_wal_replay_wait(\u00270/16B3748\u0027);            -- trên replica (PG 18+)\n" +
        "-- 4) SYNCHRONOUS REPLICATION — không còn độ trễ, nhưng GHI CHẬM HẲN\n" +
        "--    và primary phụ thuộc vào replica:\n" +
        "--    synchronous_commit = on; synchronous_standby_names = \u0027replica1\u0027\n" +
        "\n" +
        "-- CÁC ĐIỂM KHÁC CẦN LƯU Ý:\n" +
        "--  - replica CHỈ ĐỌC: mọi ghi (kể cả session variable ghi vào bảng) sẽ lỗi\n" +
        "--  - truy vấn dài trên replica có thể bị HUỶ do xung đột với replay:\n" +
        "--    max_standby_streaming_delay = 300s\n" +
        "--    hot_standby_feedback = on   (đổi lại: replica chặn vacuum ở primary)\n" +
        "--  - theo dõi replica lag và TỰ ĐỘNG rút replica khỏi pool khi lag quá cao",
    },
  ],
},
{
  cat: 'Vận hành',
  q: 'Connection pooling (PgBouncer) — vì sao cần và các pool mode?',
  answer:
    'Mỗi kết nối Postgres = một **process** (~vài MB RAM + overhead). Vài nghìn app connection → DB sập. App thường mở/đóng connection nhiều, để idle.\n\n' +
    '**PgBouncer** (proxy nhẹ) gom nhiều client connection vào ít server connection:\n' +
    '- **session mode**: một server conn/client trong suốt session — an toàn nhất, ít gom.\n' +
    '- **transaction mode**: server conn được trả về pool **sau mỗi transaction** — gom mạnh nhất, phổ biến. Không dùng được session-level state (prepared statement toàn cục, `SET`, advisory lock session, `LISTEN`).\n' +
    '- **statement mode**: trả sau mỗi câu lệnh — hiếm dùng.',
  essence:
    'Postgres không scale tốt theo số connection (process-per-connection). PgBouncer transaction-mode cho phép hàng nghìn client dùng chung vài chục server connection — gần như bắt buộc ở quy mô.',
  example:
    '200 pod × pool 20 = 4000 connection tới Postgres (`max_connections` thường 100–500) → không khả thi. Thêm PgBouncer transaction mode: 4000 client conn → 50 server conn. App tắt prepared statement cache hoặc dùng protocol tương thích.',
  viz: {
    type: 'compare',
    corner: 'Pool mode',
    cols: ['session', 'transaction', 'statement'],
    rows: [
      ['Trả server conn về pool', 'khi client ngắt session', 'sau mỗi transaction', 'sau mỗi câu lệnh'],
      ['Mức gom', 'ít', 'mạnh nhất (phổ biến)', 'cực mạnh (hiếm dùng)'],
      ['Session-level state', 'dùng được', 'không (prepared toàn cục, SET, advisory lock, LISTEN)', 'không'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Mỗi kết nối Postgres là một tiến trình OS",
      code:
        "-- Postgres tạo MỘT TIẾN TRÌNH cho mỗi kết nối (~5-10MB RAM mỗi cái).\n" +
        "-- 1000 kết nối = 1000 tiến trình -> RAM cạn, context switch khủng khiếp.\n" +
        "SHOW max_connections;                            -- thường 100-200\n" +
        "SELECT count(*), state FROM pg_stat_activity GROUP BY state;\n" +
        "\n" +
        "-- PGBOUNCER đứng giữa: hàng nghìn kết nối từ ứng dụng -> vài chục kết nối thật.\n" +
        "--   [databases]\n" +
        "--   mydb = host=127.0.0.1 port=5432 dbname=mydb\n" +
        "--   [pgbouncer]\n" +
        "--   pool_mode = transaction\n" +
        "--   max_client_conn = 5000\n" +
        "--   default_pool_size = 25\n" +
        "\n" +
        "-- BA POOL MODE:\n" +
        "-- SESSION — kết nối server gán cho client tới khi client ngắt.\n" +
        "--   An toàn nhất (mọi tính năng hoạt động), nhưng gộp được ít nhất.\n" +
        "-- TRANSACTION — trả kết nối về pool sau MỖI transaction. GỘP TỐT NHẤT,\n" +
        "--   là mode dùng phổ biến nhất. NHƯNG KHÔNG dùng được:\n" +
        "--     prepared statement ở cấp phiên (phải tắt hoặc dùng protocol mới),\n" +
        "--     SET/RESET ở cấp phiên, advisory lock theo PHIÊN, LISTEN/NOTIFY,\n" +
        "--     temporary table, cursor giữ qua nhiều transaction.\n" +
        "-- STATEMENT — trả về sau mỗi CÂU LỆNH. Không dùng được transaction nhiều câu.\n" +
        "\n" +
        "-- VỚI TRANSACTION MODE, cấu hình client cho đúng:\n" +
        "--   JDBC: prepareThreshold=0  (tắt server-side prepared statement)\n" +
        "--   hoặc dùng PgBouncer 1.21+ có hỗ trợ prepared statement\n" +
        "\n" +
        "-- CÔNG THỨC KÍCH THƯỚC POOL (điểm hay bị hiểu sai): pool LỚN KHÔNG nhanh hơn.\n" +
        "--   connections ≈ (core_count * 2) + effective_spindle_count\n" +
        "-- Máy 8 core, SSD -> khoảng 20-25 kết nối là tối ưu. Vượt qua đó, throughput\n" +
        "-- GIẢM vì tranh chấp tài nguyên.\n" +
        "SHOW POOLS;   -- trong console pgbouncer: cl_waiting > 0 nghĩa là pool thiếu",
    },
  ],
},
{
  cat: 'Hiệu năng',
  q: 'Bulk insert: `COPY`, multi-row `INSERT`, batching?',
  answer:
    'Từ chậm tới nhanh:\n' +
    '- `INSERT` từng hàng trong vòng lặp (autocommit) — chậm nhất (RTT + fsync mỗi hàng).\n' +
    '- **Multi-row `INSERT`**: `INSERT INTO t VALUES (...), (...), ...` — vài trăm hàng/câu, một transaction.\n' +
    '- **Batch trong một transaction**: gộp nhiều `INSERT` + một `COMMIT`.\n' +
    '- **`COPY`** (Postgres) / `LOAD DATA INFILE` (MySQL): đường nạp dữ liệu chuyên dụng, bỏ qua nhiều overhead parse/plan — nhanh gấp 10–100 lần.\n\n' +
    'Kèm: drop/disable index và FK trong lúc nạp lớn rồi tạo lại; `ANALYZE` sau khi xong.',
  essence:
    'Chi phí insert nằm ở overhead per-statement và fsync per-commit, không phải per-row. Gộp hàng vào ít câu lệnh + ít commit; dùng `COPY` cho nạp dữ liệu thật sự lớn.',
  example:
    'Import 10 triệu hàng: `INSERT` từng dòng ~3 giờ. `COPY orders FROM STDIN` với dữ liệu CSV ~90 giây. Nếu qua ORM: batch 1000 hàng/câu multi-row INSERT + commit mỗi 10k → ~10 phút.',
  viz: {
    type: 'bars',
    title: 'Chi phí nằm ở overhead per-statement + fsync per-commit',
    unit: '× nhanh hơn',
    scale: 'log',
    items: [
      { label: 'INSERT từng hàng (autocommit)', value: 1, note: 'RTT + fsync mỗi hàng — chậm nhất' },
      { label: 'Multi-row INSERT', value: 20, note: 'vài trăm hàng/câu, một transaction' },
      { label: 'Batch trong một transaction', value: 30, note: 'nhiều INSERT + một COMMIT' },
      { label: 'COPY / LOAD DATA INFILE', value: 120, note: 'đường nạp chuyên dụng, bỏ qua overhead parse/plan' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Từ chậm nhất tới nhanh nhất",
      code:
        "-- CHẬM NHẤT: từng câu INSERT, mỗi cái một transaction (autocommit)\n" +
        "INSERT INTO orders (amount) VALUES (100);   -- x 100.000 lần -> rất chậm\n" +
        "-- Mỗi lần là một round-trip mạng + một lần fsync WAL.\n" +
        "\n" +
        "-- NHANH HƠN: gộp nhiều hàng trong MỘT câu\n" +
        "INSERT INTO orders (customer_id, amount) VALUES\n" +
        "  (1, 100), (2, 200), (3, 300), ... ;       -- 500-1000 hàng mỗi câu là hợp lý\n" +
        "-- Nhanh hơn khoảng 5-10 lần. Đừng gộp quá lớn (giới hạn tham số và bộ nhớ).\n" +
        "\n" +
        "-- NHANH NHẤT: COPY — đường nạp dữ liệu chuyên dụng, bỏ qua phần lớn\n" +
        "-- chi phí phân tích câu lệnh\n" +
        "COPY orders (customer_id, amount) FROM \u0027/tmp/orders.csv\u0027 WITH (FORMAT csv, HEADER);\n" +
        "COPY orders (customer_id, amount) FROM STDIN WITH (FORMAT csv);\n" +
        "-- Từ ứng dụng: PostgreSQL JDBC có CopyManager; psql có \\copy (chạy phía client).\n" +
        "-- Nhanh hơn INSERT thường 10-100 lần.\n" +
        "\n" +
        "-- TỐI ƯU THÊM cho lần nạp dữ liệu LỚN (một lần):\n" +
        "BEGIN;\n" +
        "  ALTER TABLE orders SET UNLOGGED;         -- bỏ ghi WAL (MẤT dữ liệu nếu sập!)\n" +
        "  DROP INDEX idx_orders_customer;          -- bỏ index trước khi nạp\n" +
        "  COPY orders FROM STDIN WITH (FORMAT csv);\n" +
        "  CREATE INDEX idx_orders_customer ON orders (customer_id);   -- tạo lại sau\n" +
        "  ALTER TABLE orders SET LOGGED;\n" +
        "COMMIT;\n" +
        "ANALYZE orders;                            -- BẮT BUỘC: cập nhật statistics\n" +
        "-- Tạo index SAU khi nạp nhanh hơn nhiều so với cập nhật index từng hàng.\n" +
        "\n" +
        "-- TRONG ỨNG DỤNG (JDBC): bật batch thật sự\n" +
        "--   reWriteBatchedInserts=true trong URL kết nối (Postgres JDBC)\n" +
        "--   -> driver tự gộp nhiều INSERT thành multi-row -> nhanh hơn nhiều lần.\n" +
        "-- Hibernate: hibernate.jdbc.batch_size=50 + order_inserts=true, và KHÔNG\n" +
        "-- dùng GenerationType.IDENTITY (nó vô hiệu hoá batch hoàn toàn).",
    },
  ],
},
{
  cat: 'Kiến trúc',
  q: 'OLTP vs OLAP — khi nào chuyển sang data warehouse?',
  answer:
    '- **OLTP** (transactional): nhiều truy vấn nhỏ, đọc/ghi vài hàng, index B-tree, chuẩn hoá, latency ms. Postgres/MySQL.\n' +
    '- **OLAP** (analytical): ít truy vấn lớn, quét/aggregate hàng triệu–tỉ hàng, **columnar storage**, denormalized (star schema), throughput. Snowflake, BigQuery, ClickHouse, Redshift.\n\n' +
    'Chuyển sang warehouse khi: query analytics làm chậm OLTP (dù đã dùng replica), cần join dữ liệu từ nhiều nguồn, cần quét lịch sử dài, khối lượng vượt khả năng của DB giao dịch.',
  essence:
    'OLTP tối ưu "tìm và sửa vài hàng nhanh"; OLAP tối ưu "quét và tổng hợp nhiều hàng". Kiến trúc lưu trữ (row vs column) khác nhau căn bản — đừng ép một DB làm tốt cả hai ở quy mô lớn.',
  example:
    'Báo cáo "doanh thu theo sản phẩm × vùng × tháng, 3 năm" quét 500M hàng: trên Postgres mất phút và ngốn I/O. ETL sang ClickHouse (columnar) → cùng query ~1 giây vì chỉ đọc các cột cần và nén tốt.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['OLTP', 'OLAP'],
    rows: [
      ['Mẫu truy vấn', 'nhiều truy vấn nhỏ, đọc/ghi vài hàng', 'ít truy vấn lớn, quét/aggregate triệu–tỉ hàng'],
      ['Lưu trữ', 'row-based, B-tree', 'columnar, nén tốt'],
      ['Mô hình', 'chuẩn hoá', 'denormalized (star schema)'],
      ['Tối ưu cho', 'latency ms', 'throughput'],
      ['Ví dụ', 'Postgres, MySQL', 'Snowflake, BigQuery, ClickHouse, Redshift'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Hai loại tải, hai mô hình lưu trữ",
      code:
        "-- OLTP: nhiều giao dịch nhỏ, đọc/ghi vài hàng, độ trễ mili giây.\n" +
        "SELECT * FROM orders WHERE id = 12345;                       -- điển hình OLTP\n" +
        "UPDATE orders SET status = \u0027PAID\u0027 WHERE id = 12345;\n" +
        "-- Lưu trữ theo HÀNG (row-store): lấy cả một hàng rất rẻ.\n" +
        "\n" +
        "-- OLAP: ít truy vấn nhưng mỗi cái quét hàng triệu hàng, tổng hợp nhiều chiều.\n" +
        "SELECT region, DATE_TRUNC(\u0027month\u0027, created_at), SUM(amount), COUNT(DISTINCT customer_id)\n" +
        "FROM orders WHERE created_at >= \u00272025-01-01\u0027 GROUP BY 1, 2;   -- điển hình OLAP\n" +
        "-- Lưu trữ theo CỘT (column-store): chỉ đọc cột cần, nén rất tốt (dữ liệu\n" +
        "-- cùng cột giống nhau) -> nhanh hơn hàng chục lần cho loại truy vấn này.\n" +
        "\n" +
        "-- DẤU HIỆU CẦN TÁCH RA DATA WAREHOUSE:\n" +
        "--  1) truy vấn phân tích làm chậm OLTP dù đã có replica\n" +
        "--  2) cần join dữ liệu từ NHIỀU nguồn (DB, log, CRM, quảng cáo)\n" +
        "--  3) cần giữ lịch sử dài mà OLTP không nên phình\n" +
        "--  4) người dùng nghiệp vụ cần truy vấn tự do (BI tool)\n" +
        "--  5) bảng vượt vài trăm GB và phần lớn truy vấn là tổng hợp\n" +
        "\n" +
        "-- LỘ TRÌNH TĂNG DẦN (đừng nhảy thẳng tới bước cuối):\n" +
        "--  1) tối ưu truy vấn + index\n" +
        "--  2) materialized view cho báo cáo hay dùng\n" +
        "--  3) READ REPLICA riêng cho phân tích\n" +
        "--  4) partition theo thời gian\n" +
        "--  5) DATA WAREHOUSE (ClickHouse, BigQuery, Snowflake, Redshift) qua CDC/ETL\n" +
        "\n" +
        "-- Postgres có thể làm OLAP ở quy mô vừa nhờ partition + materialized view\n" +
        "-- + extension citus/columnar. Đừng vội chuyển khi chưa cần.",
    },
  ],
},
{
  cat: 'Hiệu năng',
  q: 'Xoá/cập nhật hàng loạt mà không khoá lâu — batching?',
  answer:
    'Một `DELETE FROM t WHERE created_at < :cutoff` trên 50M hàng: giữ lock lâu, WAL khổng lồ, replication lag, bloat, có thể timeout.\n\n' +
    'Batching:\n' +
    '```\n' +
    'LOOP\n' +
    '  DELETE FROM t WHERE id IN (\n' +
    '    SELECT id FROM t WHERE created_at < :cutoff LIMIT 5000\n' +
    '  );\n' +
    '  COMMIT;                 -- nhả lock, cho autovacuum thở\n' +
    '  sleep(short);           -- giảm áp lực I/O / replica\n' +
    '  EXIT WHEN not found;\n' +
    'END LOOP;\n' +
    '```\n' +
    'Cần index trên `created_at`. Với xoá theo thời gian trên bảng lớn → **partition + DROP PARTITION** là tốt hơn hẳn.',
  essence:
    'Thao tác lớn = nhiều thao tác nhỏ có commit. Mỗi batch nhả lock, giới hạn WAL, cho vacuum/replica bắt kịp. Xoá theo tuổi thì partition hoá để `DROP` thay vì `DELETE`.',
  example:
    'Dọn 200M log cũ hàng đêm: script batch 10k hàng, commit + sleep 50ms, dừng khi hết. Chạy trong ~30 phút mà không ảnh hưởng p99 của app. Hoặc: partition theo ngày, `DROP` partition > 30 ngày trong mili giây.',
  viz: {
    type: 'cycle',
    title: 'Thao tác lớn = nhiều thao tác nhỏ có commit',
    steps: [
      { label: 'DELETE LIMIT 5000', note: 'xoá một lô nhỏ theo id (cần index trên created_at)' },
      { label: 'COMMIT', note: 'nhả lock, giới hạn WAL, cho autovacuum thở' },
      { label: 'sleep ngắn', note: 'giảm áp lực I/O, cho replica bắt kịp' },
      { label: 'EXIT khi hết hàng', note: 'lặp tới khi không còn hàng nào khớp' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Chia nhỏ để không khoá và không làm phình WAL",
      code:
        "-- SAI: một câu lệnh động tới hàng chục triệu hàng\n" +
        "DELETE FROM orders WHERE created_at < \u00272024-01-01\u0027;\n" +
        "-- -> transaction chạy hàng giờ, giữ khoá, WAL khổng lồ, replica tụt lại,\n" +
        "--    và nếu lỗi thì rollback cũng mất hàng giờ.\n" +
        "\n" +
        "-- ĐÚNG: chia lô, mỗi lô một transaction riêng\n" +
        "DO $$\n" +
        "DECLARE rows_deleted INT;\n" +
        "BEGIN\n" +
        "  LOOP\n" +
        "    DELETE FROM orders\n" +
        "    WHERE id IN (\n" +
        "      SELECT id FROM orders WHERE created_at < \u00272024-01-01\u0027 LIMIT 10000\n" +
        "    );\n" +
        "    GET DIAGNOSTICS rows_deleted = ROW_COUNT;\n" +
        "    EXIT WHEN rows_deleted = 0;\n" +
        "    COMMIT;                     -- commit từng lô (Postgres 11+ trong DO block)\n" +
        "    PERFORM pg_sleep(0.1);      -- nhường tài nguyên cho tải chính\n" +
        "  END LOOP;\n" +
        "END $$;\n" +
        "\n" +
        "-- Cần index hỗ trợ, nếu không mỗi lô lại quét toàn bảng:\n" +
        "CREATE INDEX CONCURRENTLY idx_orders_created ON orders (created_at);\n" +
        "\n" +
        "-- CẬP NHẬT HÀNG LOẠT theo lô — dùng khoá chính để phân lô:\n" +
        "UPDATE orders SET status = \u0027ARCHIVED\u0027\n" +
        "WHERE id BETWEEN 1 AND 10000 AND status = \u0027OLD\u0027;\n" +
        "\n" +
        "-- XOÁ PHẦN LỚN BẢNG: tạo bảng mới chứa phần GIỮ LẠI, nhanh hơn nhiều\n" +
        "CREATE TABLE orders_new AS SELECT * FROM orders WHERE created_at >= \u00272024-01-01\u0027;\n" +
        "-- tạo index, ràng buộc... rồi:\n" +
        "BEGIN;\n" +
        "  ALTER TABLE orders RENAME TO orders_old;\n" +
        "  ALTER TABLE orders_new RENAME TO orders;\n" +
        "COMMIT;\n" +
        "\n" +
        "-- TỐT NHẤT nếu biết trước: PARTITION theo thời gian -> DROP partition tức thì.\n" +
        "-- Đây là lý do quan trọng để phân vùng bảng có vòng đời dữ liệu rõ ràng.",
    },
  ],
},
{
  cat: 'Kiến trúc',
  q: 'SQL vs NoSQL — chọn theo tiêu chí nào? Polyglot persistence?',
  answer:
    'Chọn **SQL** (RDBMS) khi: dữ liệu có quan hệ rõ, cần transaction ACID đa hàng/bảng, cần constraint/integrity mạnh, truy vấn ad-hoc đa dạng, tính nhất quán quan trọng. (Mặc định hợp lý cho hầu hết ứng dụng.)\n\n' +
    'Cân nhắc **NoSQL** khi: mô hình truy cập đơn giản và cố định (key-value, document theo id), scale ghi/dung lượng vượt một node dễ dàng, schema thực sự linh hoạt, chấp nhận eventual consistency, hoặc nhu cầu đặc thù (graph, time-series, search).\n\n' +
    '**Polyglot persistence**: dùng nhiều loại store cho các phần khác nhau — Postgres cho core transactional, Redis cho cache/session, Elasticsearch cho search, ClickHouse cho analytics, S3 cho blob.',
  essence:
    '"SQL hay NoSQL" là câu hỏi sai — hỏi "workload này cần gì". RDBMS là lựa chọn mặc định vững chắc; thêm store chuyên dụng cho phần mà RDBMS làm kém. Đừng dùng một DB cho mọi thứ, cũng đừng dùng NoSQL vì "nghe hiện đại".',
  example:
    'E-commerce: Postgres (đơn hàng, thanh toán, tồn kho — cần ACID), Redis (giỏ hàng, cache giá, rate limit), Elasticsearch (tìm sản phẩm, autocomplete), ClickHouse (dashboard BI), S3 (ảnh sản phẩm).',
  viz: {
    type: 'tree',
    title: 'Hỏi "workload này cần gì", không phải "SQL hay NoSQL"',
    root: {
      label: 'RDBMS là lựa chọn mặc định; thêm store chuyên dụng cho phần RDBMS làm kém',
      children: [
        { label: 'Chọn SQL khi', note: 'quan hệ rõ, transaction ACID đa bảng, constraint mạnh, truy vấn ad-hoc, nhất quán quan trọng' },
        { label: 'Cân nhắc NoSQL khi', note: 'truy cập đơn giản cố định, scale ghi/dung lượng vượt một node, schema thực sự linh hoạt, chấp nhận eventual' },
        { label: 'Polyglot persistence', note: 'Postgres core + Redis cache + Elasticsearch search + ClickHouse analytics + S3 blob' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Chọn công cụ theo mẫu truy cập, không theo trào lưu",
      code:
        "-- CHỌN SQL KHI (mặc định nên bắt đầu ở đây):\n" +
        "--  - dữ liệu có QUAN HỆ rõ ràng, cần join\n" +
        "--  - cần TRANSACTION nhiều bảng và ràng buộc toàn vẹn\n" +
        "--  - truy vấn ĐA DẠNG và chưa biết hết từ đầu (SQL rất linh hoạt khi đọc)\n" +
        "--  - cần báo cáo, tổng hợp\n" +
        "--  - đội đã quen, hệ sinh thái công cụ trưởng thành\n" +
        "SELECT c.name, SUM(o.amount) FROM customers c\n" +
        "JOIN orders o ON o.customer_id = c.id GROUP BY c.name HAVING SUM(o.amount) > 1000;\n" +
        "\n" +
        "-- CHỌN NoSQL KHI:\n" +
        "--  DOCUMENT (MongoDB): schema thay đổi liên tục, dữ liệu lồng nhau tự nhiên,\n" +
        "--    truy vấn chủ yếu theo một khoá gốc\n" +
        "--  KEY-VALUE (Redis, DynamoDB): truy cập theo khoá, quy mô cực lớn, độ trễ\n" +
        "--    dưới mili giây, mẫu truy vấn BIẾT TRƯỚC\n" +
        "--  COLUMN-FAMILY (Cassandra): ghi rất nhiều, phân tán nhiều vùng, chấp nhận\n" +
        "--    nhất quán cuối cùng\n" +
        "--  GRAPH (Neo4j): quan hệ nhiều tầng là trung tâm (mạng xã hội, phát hiện gian lận)\n" +
        "--  SEARCH (Elasticsearch): tìm kiếm toàn văn, xếp hạng, phân tích log\n" +
        "--  TIME-SERIES (Timescale, InfluxDB): dữ liệu đo lường theo thời gian\n" +
        "\n" +
        "-- POLYGLOT PERSISTENCE — dùng nhiều loại cho từng việc:\n" +
        "--   Postgres  -> nguồn sự thật, giao dịch\n" +
        "--   Redis     -> cache, session, rate limit\n" +
        "--   Elasticsearch -> tìm kiếm\n" +
        "--   ClickHouse    -> phân tích\n" +
        "--   S3        -> file\n" +
        "-- CÁI GIÁ: đồng bộ dữ liệu giữa các hệ (thường qua CDC/Kafka), nhiều thứ\n" +
        "-- phải vận hành, nhiều thứ có thể hỏng.\n" +
        "-- LỜI KHUYÊN: bắt đầu bằng MỘT Postgres. Nó làm được JSONB, full-text,\n" +
        "-- geo, time-series, hàng đợi ở mức đủ tốt. Chỉ thêm hệ mới khi ĐÃ ĐO\n" +
        "-- được rằng Postgres không đáp ứng nổi.",
    },
  ],
},
{
  cat: 'Full-text search',
  q: 'Full-text search trong SQL (`tsvector`/GIN) vs search engine chuyên dụng?',
  answer:
    'Postgres FTS: `to_tsvector(\'english\', body)` → GIN index; `WHERE search_vector @@ to_tsquery(\'quick & fox\')`. Có stemming, ranking (`ts_rank`), highlight.\n\n' +
    'Đủ tốt khi: search là tính năng phụ, tập dữ liệu vừa, không cần typo tolerance / synonym / facet phức tạp, muốn tránh thêm hệ thống + đồng bộ.\n\n' +
    'Dùng **Elasticsearch / OpenSearch / Meilisearch / Typesense** khi: search là tính năng cốt lõi, cần fuzzy/typo, relevance tuning sâu, faceted search, autocomplete tức thời, đa ngôn ngữ, phân tích log/aggregation trên text.',
  essence:
    'Postgres FTS tiết kiệm một hệ thống cho nhu cầu search "vừa đủ". Search chuyên dụng đáng giá khi search là trải nghiệm chính và cần fuzzy/relevance/facet mà SQL FTS không làm tốt.',
  example:
    'Blog nội bộ, tìm bài viết theo từ khoá: Postgres `tsvector` + GIN, không thêm gì. Sàn thương mại điện tử với "gõ sai vẫn ra kết quả", lọc theo brand/price/rating, gợi ý khi gõ: Elasticsearch, đồng bộ từ Postgres qua CDC.',
  viz: {
    type: 'compare',
    corner: 'Nhu cầu',
    cols: ['Postgres FTS (tsvector/GIN)', 'Search engine chuyên dụng'],
    rows: [
      ['Stemming, ranking, highlight', 'có (ts_rank)', 'có'],
      ['Typo / fuzzy tolerance', 'không', 'có'],
      ['Faceted search, relevance tuning sâu', 'hạn chế', 'có'],
      ['Autocomplete tức thời', 'gượng', 'có'],
      ['Thêm hệ thống + đồng bộ', 'không cần', 'cần (CDC từ Postgres)'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Postgres làm được tới đâu",
      code:
        "-- TSVECTOR — chuẩn hoá văn bản thành các từ tố (lexeme) có trọng số\n" +
        "ALTER TABLE articles ADD COLUMN search_vector tsvector\n" +
        "  GENERATED ALWAYS AS (\n" +
        "    setweight(to_tsvector(\u0027simple\u0027, coalesce(title, \u0027\u0027)),   \u0027A\u0027) ||\n" +
        "    setweight(to_tsvector(\u0027simple\u0027, coalesce(body, \u0027\u0027)),    \u0027B\u0027)\n" +
        "  ) STORED;\n" +
        "CREATE INDEX idx_articles_search ON articles USING GIN (search_vector);\n" +
        "\n" +
        "SELECT id, title, ts_rank(search_vector, query) AS diem\n" +
        "FROM articles, to_tsquery(\u0027simple\u0027, \u0027redis & cache\u0027) query\n" +
        "WHERE search_vector @@ query\n" +
        "ORDER BY diem DESC LIMIT 20;\n" +
        "\n" +
        "-- Các toán tử truy vấn: & (và), | (hoặc), ! (không), <-> (kề nhau)\n" +
        "SELECT * FROM articles WHERE search_vector @@ phraseto_tsquery(\u0027simple\u0027, \u0027cơ sở dữ liệu\u0027);\n" +
        "SELECT ts_headline(\u0027simple\u0027, body, query) FROM ...;   -- tô đậm đoạn khớp\n" +
        "\n" +
        "-- TÌM GẦN ĐÚNG / gõ sai chính tả -> trigram\n" +
        "CREATE EXTENSION pg_trgm;\n" +
        "CREATE INDEX idx_articles_title_trgm ON articles USING GIN (title gin_trgm_ops);\n" +
        "SELECT * FROM articles WHERE title % \u0027databse\u0027 ORDER BY similarity(title, \u0027databse\u0027) DESC;\n" +
        "\n" +
        "-- POSTGRES ĐỦ DÙNG KHI: dưới vài triệu bản ghi, tìm kiếm là tính năng phụ,\n" +
        "-- và bạn muốn dữ liệu tìm kiếm LUÔN đồng bộ với dữ liệu gốc (không có\n" +
        "-- độ trễ index, không có dual-write).\n" +
        "\n" +
        "-- CẦN ELASTICSEARCH/OPENSEARCH KHI:\n" +
        "--  - hàng chục triệu bản ghi trở lên, đòi hỏi độ trễ thấp\n" +
        "--  - cần xếp hạng phức tạp (BM25 tuỳ chỉnh, boost theo nhiều tiêu chí)\n" +
        "--  - cần faceted search, gợi ý, autocomplete quy mô lớn\n" +
        "--  - phân tích tiếng Việt tốt hơn (Postgres không có bộ phân tích tiếng Việt sẵn)\n" +
        "--  - tìm kiếm là TÍNH NĂNG CỐT LÕI của sản phẩm\n" +
        "-- CÁI GIÁ: thêm một hệ thống, và bài toán đồng bộ dữ liệu (thường qua CDC).",
    },
  ],
},
{
  cat: 'Hiệu năng',
  q: 'Prepared statements: lợi ích và cạm bẫy (plan caching)?',
  answer:
    'Prepared statement: parse + plan một lần, thực thi nhiều lần với tham số khác nhau → tiết kiệm parse/plan overhead, chống SQL injection.\n\n' +
    'Cạm bẫy — **generic plan vs custom plan**:\n' +
    '- Postgres sau 5 lần thực thi có thể chuyển sang **generic plan** (không nhìn giá trị tham số) → nếu dữ liệu lệch mạnh (skew), plan generic có thể tệ cho một số giá trị.\n' +
    '- Ví dụ `WHERE status = $1`: `status = \'PENDING\'` (0.1%) cần index scan, `status = \'DONE\'` (99%) cần seq scan → một plan không thể tối ưu cả hai.\n\n' +
    'Điều chỉnh: `plan_cache_mode = force_custom_plan`, hoặc không dùng prepared cho query skew mạnh.',
  essence:
    'Prepared statement tốt cho query có plan ổn định bất kể tham số. Với cột phân bố lệch mạnh, một plan cache "trung bình" có thể chậm thảm hại cho các giá trị hiếm — cân nhắc custom plan.',
  example:
    'ORM tự prepare mọi query. Query `WHERE tenant_id = $1` với một tenant chiếm 90% dữ liệu và nghìn tenant nhỏ: generic plan chọn seq scan → tenant nhỏ query chậm 100×. Fix: `force_custom_plan` cho query đó, hoặc partition theo tenant.',
  viz: {
    type: 'flow',
    title: 'Với cột phân bố lệch mạnh, plan cache "trung bình" có thể chậm thảm hại',
    nodes: ['PREPARE: parse + plan 1 lần', 'Custom plan (lần 1–5)', 'Generic plan (sau 5 lần)', 'Dữ liệu skew → plan tệ cho giá trị hiếm'],
    steps: [
      { to: 0, label: 'Tiết kiệm parse/plan overhead, chống SQL injection' },
      { to: 1, label: 'Postgres nhìn giá trị tham số, chọn plan phù hợp từng lần' },
      { to: 2, label: 'Chuyển sang generic plan — không nhìn giá trị tham số nữa' },
      { to: 3, label: 'status=\'PENDING\' (0.1%) cần index; status=\'DONE\' (99%) cần seq — một plan không tối ưu cả hai. Fix: force_custom_plan' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Tách câu lệnh khỏi dữ liệu",
      code:
        "PREPARE get_order (bigint) AS SELECT * FROM orders WHERE id = $1;\n" +
        "EXECUTE get_order(123);\n" +
        "DEALLOCATE get_order;\n" +
        "\n" +
        "-- LỢI ÍCH:\n" +
        "-- 1) CHỐNG SQL INJECTION — quan trọng nhất. Tham số KHÔNG BAO GIỜ được\n" +
        "--    hiểu là mã lệnh, dù nội dung là gì.\n" +
        "--    Nối chuỗi: \"... WHERE id = \" + input  -> lỗ hổng nghiêm trọng.\n" +
        "-- 2) BỎ QUA việc phân tích và lập kế hoạch cho các lần chạy sau -> nhanh hơn\n" +
        "--    khi cùng một câu chạy hàng nghìn lần.\n" +
        "-- 3) Ép kiểu đúng, không phụ thuộc định dạng chuỗi/locale.\n" +
        "\n" +
        "-- CẠM BẪY: GENERIC PLAN\n" +
        "-- Postgres chạy 5 lần đầu với plan RIÊNG cho từng giá trị (custom plan),\n" +
        "-- rồi so sánh chi phí. Nếu plan chung không tệ hơn nhiều, nó chuyển sang\n" +
        "-- GENERIC PLAN — không còn biết giá trị tham số.\n" +
        "-- Với cột có phân phối LỆCH, điều này gây plan tệ:\n" +
        "--   status = \u0027PENDING\u0027  (0,01% bảng)  -> nên dùng index\n" +
        "--   status = \u0027DONE\u0027     (99% bảng)    -> nên seq scan\n" +
        "--   generic plan chỉ chọn được MỘT cách cho cả hai.\n" +
        "SET plan_cache_mode = force_custom_plan;    -- luôn lập kế hoạch lại\n" +
        "SET plan_cache_mode = auto;                 -- mặc định\n" +
        "EXPLAIN (GENERIC_PLAN) SELECT * FROM orders WHERE status = $1;   -- PG 16+\n" +
        "\n" +
        "-- CẠM BẪY 2: prepared statement là theo PHIÊN. Với PgBouncer ở transaction\n" +
        "-- mode, kết nối bị chia sẻ -> lỗi \"prepared statement does not exist\".\n" +
        "--   -> JDBC: prepareThreshold=0, hoặc PgBouncer 1.21+ có hỗ trợ.\n" +
        "\n" +
        "-- CẠM BẪY 3: KHÔNG tham số hoá được tên bảng/cột hay hướng ORDER BY.\n" +
        "--   -> phải kiểm tra bằng danh sách trắng ở ứng dụng, tuyệt đối không nối chuỗi.",
    },
  ],
},
{
  cat: 'Hiệu năng',
  q: 'Các anti-pattern SQL phổ biến nhất trong code production?',
  answer:
    '1. **`SELECT *`** — kéo cột thừa, phá covering index.\n' +
    '2. **N+1 query** — vòng lặp query thay vì JOIN/batch.\n' +
    '3. **Hàm trên cột index** (`WHERE lower(email) = ?` không có functional index) — mất index.\n' +
    '4. **`OFFSET` lớn** cho phân trang sâu — thay bằng keyset.\n' +
    '5. **Correlated subquery trong SELECT** chạy mỗi hàng — thay bằng JOIN/window.\n' +
    '6. **`NOT IN` với subquery có thể chứa NULL** — dùng `NOT EXISTS`.\n' +
    '7. **Ép kiểu ngầm** (param sai kiểu) — mất index, so sánh sai.\n' +
    '8. **Thiếu index trên cột FK**.\n' +
    '9. **Transaction quá dài / "idle in transaction"**.\n' +
    '10. **`LIKE \'%x%\'`** trên bảng lớn không có trigram index.',
  essence:
    'Hầu hết vấn đề SQL trong production là một trong ~10 mẫu này. Rà soát code + slow query log theo checklist; đa số fix là "đưa predicate về sargable" hoặc "gộp N query thành 1".',
  example:
    'Code review checklist cho mọi PR chạm DB: có `SELECT *` không? query trong vòng lặp không? `WHERE` có bọc hàm quanh cột không? phân trang dùng OFFSET không? transaction có bao gồm lời gọi HTTP/chờ không? — bắt được phần lớn sự cố trước khi lên production.',
  viz: {
    type: 'tree',
    title: 'Đa số fix là "đưa predicate về sargable" hoặc "gộp N query thành 1"',
    root: {
      label: '~10 mẫu chiếm hầu hết sự cố SQL production',
      children: [
        { label: 'SELECT *', note: 'kéo cột thừa, phá covering index' },
        { label: 'N+1 query', note: 'vòng lặp query thay vì JOIN/batch' },
        { label: 'Hàm trên cột index', note: 'lower(email) không có functional index → mất index' },
        { label: 'OFFSET lớn cho phân trang sâu', note: 'thay bằng keyset pagination' },
        { label: 'Correlated subquery trong SELECT', note: 'chạy mỗi hàng → thay bằng JOIN/window' },
        { label: 'NOT IN với subquery có NULL', note: 'dùng NOT EXISTS' },
        { label: 'Thiếu index trên cột FK', note: 'JOIN chậm, ON DELETE quét toàn bảng' },
        { label: 'Transaction quá dài / idle in transaction', note: 'giữ lock, chặn vacuum' },
        { label: "LIKE '%x%' trên bảng lớn", note: 'không có trigram index → seq scan' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Danh sách kiểm tra khi review code",
      code:
        "-- 1) SELECT * -> mất covering index, truyền thừa, vỡ khi schema đổi\n" +
        "SELECT id, name, amount FROM orders;                   -- ghi rõ cột\n" +
        "\n" +
        "-- 2) NỐI CHUỖI tạo câu lệnh -> SQL injection\n" +
        "-- \"WHERE id = \" + userInput                           -> dùng tham số\n" +
        "\n" +
        "-- 3) NOT IN với subquery có thể chứa NULL -> kết quả RỖNG âm thầm\n" +
        "SELECT * FROM c WHERE NOT EXISTS (SELECT 1 FROM o WHERE o.customer_id = c.id);\n" +
        "\n" +
        "-- 4) HÀM BỌC CỘT trong WHERE -> mất index\n" +
        "WHERE created_at >= \u00272026-09-05\u0027 AND created_at < \u00272026-09-06\u0027;\n" +
        "\n" +
        "-- 5) OFFSET lớn để phân trang -> dùng keyset pagination\n" +
        "\n" +
        "-- 6) N+1 QUERY -> JOIN hoặc IN\n" +
        "\n" +
        "-- 7) DISTINCT để \"chữa\" kết quả nhân bản do join -> dùng EXISTS\n" +
        "\n" +
        "-- 8) THIẾU INDEX trên cột khoá ngoại (Postgres không tự tạo)\n" +
        "\n" +
        "-- 9) DÙNG FLOAT CHO TIỀN -> NUMERIC hoặc số nguyên đơn vị nhỏ nhất\n" +
        "\n" +
        "-- 10) KHÔNG có transaction cho nhóm thao tác liên quan -> dữ liệu nửa vời\n" +
        "\n" +
        "-- 11) TRANSACTION QUÁ DÀI (gọi API bên ngoài trong transaction) -> khoá,\n" +
        "--     chặn vacuum, cạn connection pool\n" +
        "\n" +
        "-- 12) ORDER BY RANDOM() trên bảng lớn -> sắp xếp toàn bảng\n" +
        "SELECT * FROM orders TABLESAMPLE SYSTEM (1) LIMIT 10;   -- lấy mẫu thay thế\n" +
        "\n" +
        "-- 13) COUNT(*) toàn bảng chỉ để hiển thị tổng số trang\n" +
        "SELECT reltuples::bigint FROM pg_class WHERE relname = \u0027orders\u0027;   -- ước lượng\n" +
        "\n" +
        "-- 14) KHÔNG có timeout -> một câu lệnh treo giữ khoá vô hạn\n" +
        "SET statement_timeout = \u002730s\u0027;\n" +
        "SET lock_timeout = \u00273s\u0027;\n" +
        "SET idle_in_transaction_session_timeout = \u002760s\u0027;\n" +
        "\n" +
        "-- 15) DÙNG TRIGGER cho logic nghiệp vụ phức tạp -> khó debug, khó test,\n" +
        "--     và ẩn tác dụng phụ. Trigger chỉ nên dùng cho audit và duy trì\n" +
        "--     dữ liệu phái sinh đơn giản.",
    },
  ],
},
]);
