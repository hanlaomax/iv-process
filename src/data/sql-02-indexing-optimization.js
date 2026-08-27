SS.addQuestions('sql', [
{
  cat: 'Index',
  diagram: 'btree-index',
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
},
{
  cat: 'Index',
  q: 'Clustered index và non-clustered index khác nhau thế nào?',
  answer:
    '- **Clustered index** (MySQL InnoDB PK, SQL Server): **các hàng dữ liệu được lưu vật lý theo thứ tự của key này**. Một bảng chỉ có một. Tra theo PK là lấy luôn cả hàng (không cần bước phụ).\n' +
    '- **Non-clustered / secondary index**: cấu trúc riêng chứa (key → con trỏ tới hàng). Tra xong phải "nhảy" lấy hàng thật (bookmark lookup). Trong InnoDB, secondary index trỏ tới **PK value** → tra secondary index cần thêm một lần tra clustered index.\n' +
    '- **Postgres**: không có clustered index thật; mọi index là secondary, bảng là "heap" (`CLUSTER` chỉ sắp một lần).',
  essence:
    'Clustered index quyết định thứ tự vật lý của hàng → tra theo nó cực nhanh, nhưng PK to/ngẫu nhiên làm mọi secondary index phình và insert phân mảnh. Non-clustered cần thêm bước lấy hàng.',
  example:
    'InnoDB: PK là UUID v4 (ngẫu nhiên) → insert chèn khắp nơi trong clustered index → page split, phân mảnh, và mọi secondary index lưu UUID 16 byte. Đổi sang BIGINT auto-increment (hoặc UUID v7 tăng dần) → insert tuần tự, index gọn.',
},
{
  cat: 'Index',
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
},
{
  cat: 'Index',
  q: 'Covering index / index-only scan là gì?',
  answer:
    'Nếu **mọi cột** truy vấn cần (trong SELECT, WHERE, ORDER BY) đều nằm trong index, DB trả kết quả **chỉ từ index**, không chạm bảng (heap) → nhanh hơn nhiều (bỏ bước bookmark lookup).\n\n' +
    'Postgres: `CREATE INDEX ... INCLUDE (col)` thêm cột "payload" không tham gia sắp xếp nhưng có trong index. (Postgres còn cần visibility map "sạch" — chạy `VACUUM` — để index-only scan thực sự tránh heap.)',
  essence:
    'Covering index = "index tự trả lời được cả câu hỏi". Đánh đổi: index to hơn, ghi chậm hơn. Dùng cho các truy vấn đọc nóng, chọn ít cột.',
  example:
    '`SELECT status, total FROM orders WHERE customer_id = ?` chạy hàng nghìn lần/s: `CREATE INDEX idx ON orders (customer_id) INCLUDE (status, total)` → index-only scan, không đụng heap, latency giảm rõ.',
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Tối ưu',
  q: 'Nested loop, hash join và merge join — khi nào DB chọn cái nào?',
  answer:
    '- **Nested Loop**: với mỗi hàng bảng ngoài, tra bảng trong (thường qua index). Tốt khi **bảng ngoài nhỏ** và bảng trong có index trên cột join. Tệ khi bảng ngoài lớn (N × chi phí tra trong).\n' +
    '- **Hash Join**: build hash table từ bảng nhỏ hơn, probe bằng bảng lớn. Tốt cho **join hai tập lớn** không có index phù hợp, điều kiện **bằng**. Tốn RAM (spill ra đĩa nếu lớn).\n' +
    '- **Merge Join**: cả hai đầu vào đã **sắp xếp** theo cột join → quét song song. Tốt khi dữ liệu đã sorted (từ index) hoặc cần sort dù sao.',
  essence:
    'Nested loop cho "ít hàng ngoài + index bên trong". Hash join cho "hai tập lớn, join bằng". Merge join cho "đã sắp xếp sẵn". Optimizer chọn theo kích thước ước lượng và index sẵn có.',
  example:
    '`orders JOIN customers ON orders.customer_id = customers.id` khi lọc `orders` còn 50 hàng: nested loop + index PK `customers` — nhanh. Khi join **toàn bộ** 10M orders với 2M customers cho báo cáo: hash join.',
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Tối ưu',
  q: 'Statistics của optimizer là gì? Vì sao "stats cũ" gây plan tệ?',
  answer:
    'DB lưu thống kê về mỗi bảng/cột: số hàng, số giá trị distinct (n_distinct), histogram phân bố, giá trị phổ biến nhất, tỉ lệ NULL. Optimizer dùng chúng để **ước lượng số hàng** mỗi bước → chọn scan/join/order.\n\n' +
    'Stats cũ (sau khi bulk load, sau khi xoá/thêm nhiều) → ước lượng sai → chọn nested loop khi nên hash join, chọn seq scan khi nên index...\n\n' +
    'Cập nhật: `ANALYZE table` (Postgres, tự động qua autovacuum), `ANALYZE TABLE` (MySQL), auto-update stats (SQL Server).',
  essence:
    'Optimizer "nhìn thế giới" qua statistics. Nếu chúng lệch thực tế, mọi quyết định chi phí đều sai. Sau ETL/bulk operation lớn, luôn `ANALYZE`.',
  example:
    'Sau khi import 5 triệu hàng vào bảng vừa tạo, chạy report → cực chậm vì optimizer tưởng bảng có ~0 hàng (chưa ANALYZE) → chọn nested loop. Chạy `ANALYZE orders` → plan chuyển sang hash join, report từ 5 phút xuống 8 giây.',
},
{
  cat: 'Index',
  q: 'Partial index (filtered index) dùng khi nào?',
  answer:
    'Index chỉ trên **tập con hàng** thoả điều kiện: `CREATE INDEX idx ON orders (created_at) WHERE status = \'PENDING\'`.\n\n' +
    'Lợi ích: index **nhỏ hơn nhiều** (chỉ vài % bảng), rẻ để duy trì, cache tốt. Dùng khi truy vấn luôn kèm cùng một điều kiện lọc, hoặc để enforce unique có điều kiện.\n\n' +
    'Postgres và SQL Server hỗ trợ; MySQL không (dùng generated column + index như workaround).',
  essence:
    'Partial index tập trung "sức mạnh index" vào đúng phần dữ liệu bạn hay truy vấn (hàng active, hàng pending, hàng chưa xử lý) thay vì index cả bảng gồm phần bạn không bao giờ hỏi.',
  example:
    'Bảng `jobs` 100M hàng, 99.9% đã `DONE`, worker chỉ query `WHERE status = \'QUEUED\' ORDER BY priority`: `CREATE INDEX ON jobs (priority) WHERE status = \'QUEUED\'` → index chỉ ~100k mục thay vì 100M. Unique có điều kiện: `CREATE UNIQUE INDEX ON users (email) WHERE deleted_at IS NULL` (cho phép trùng email ở hàng đã soft-delete).',
},
{
  cat: 'Tối ưu',
  q: 'Over-indexing: chi phí của việc có quá nhiều index?',
  answer:
    'Mỗi index phải được **cập nhật** khi `INSERT`/`UPDATE`(cột index)/`DELETE` → **write amplification**: một insert vào bảng 10 index = 11 lần ghi cấu trúc.\n\n' +
    'Chi phí khác: tốn dung lượng đĩa/RAM (index cạnh tranh page cache với dữ liệu), làm optimizer chậm hơn (nhiều lựa chọn), index trùng lặp/không dùng.\n\n' +
    'Rà soát: `pg_stat_user_indexes` (idx_scan = 0 → không dùng), `sys.dm_db_index_usage_stats` (SQL Server), `sys.schema_unused_indexes` (MySQL).',
  essence:
    'Index tăng tốc đọc nhưng đánh thuế mọi lần ghi. Bảng ghi nhiều nên có ít index, được chọn lọc. Xoá index không ai dùng là một cách tối ưu ghi.',
  example:
    'Bảng `events` insert 20k/s có 8 index, phần lớn tạo "phòng khi cần": insert latency cao, WAL lớn. Audit cho thấy 3 index `idx_scan = 0` trong 30 ngày → drop → throughput ghi tăng ~40%.',
},
{
  cat: 'Index',
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
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Index',
  q: 'Index bloat và fillfactor là gì?',
  answer:
    '**Bloat**: theo thời gian, `UPDATE`/`DELETE` để lại "khoảng trống" trong index (Postgres: dead tuple; nói chung: page nửa rỗng) → index to hơn dữ liệu thực cần → chậm hơn, tốn cache.\n\n' +
    '**Fillfactor**: % page được điền khi tạo index/bảng (mặc định ~90). Đặt thấp hơn (70) để chừa chỗ cho `UPDATE` tại chỗ (HOT update trong Postgres) → giảm page split và bloat cho bảng update nhiều.\n\n' +
    'Khắc phục bloat: `REINDEX` (Postgres `REINDEX CONCURRENTLY`), `OPTIMIZE TABLE` (MySQL), rebuild index (SQL Server). autovacuum tuning.',
  essence:
    'Index không "tự dọn" hoàn hảo — update/delete tạo bloat làm nó phình dần. Fillfactor thấp giảm bloat cho workload update; REINDEX định kỳ cho index nóng.',
  example:
    'Bảng `sessions` update `last_seen` liên tục: index `(last_seen)` phình gấp 3 lần sau vài tuần → query chậm dần. `REINDEX CONCURRENTLY` + đặt `fillfactor = 70` cho bảng → HOT updates, bloat chậm lại.',
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Index',
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
},
{
  cat: 'Tối ưu',
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
},
{
  cat: 'Index',
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
},
]);
