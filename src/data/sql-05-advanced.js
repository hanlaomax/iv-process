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
},
]);
