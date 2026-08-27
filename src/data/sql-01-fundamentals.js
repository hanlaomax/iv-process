SS.addQuestions('sql', [
{
  cat: 'JOIN',
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
},
]);
