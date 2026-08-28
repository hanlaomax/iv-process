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
},
]);
