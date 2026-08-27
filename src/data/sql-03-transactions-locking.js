SS.addQuestions('sql', [
{
  cat: 'Giao dịch',
  q: 'ACID là gì? Mỗi tính chất đảm bảo điều gì?',
  answer:
    '- **Atomicity**: transaction là "tất cả hoặc không" — commit thì mọi thay đổi được áp, rollback/lỗi thì không thay đổi nào tồn tại.\n' +
    '- **Consistency**: transaction đưa DB từ một trạng thái hợp lệ (thoả mọi constraint, FK, trigger) sang trạng thái hợp lệ khác.\n' +
    '- **Isolation**: các transaction chạy đồng thời cho kết quả **như thể** chạy tuần tự (mức độ tuỳ isolation level).\n' +
    '- **Durability**: sau khi commit trả về thành công, dữ liệu **không mất** kể cả khi mất điện (nhờ WAL/redo log ghi xuống đĩa trước).',
  essence:
    'A = không dở dang. C = luôn hợp lệ. I = không giẫm chân nhau. D = commit rồi thì chắc chắn. Isolation là tính chất bị "nới lỏng" nhất trong thực tế để đổi lấy hiệu năng.',
  example:
    'Chuyển tiền: `BEGIN; UPDATE acc SET bal = bal - 100 WHERE id = 1; UPDATE acc SET bal = bal + 100 WHERE id = 2; COMMIT;`. Atomicity đảm bảo không có cảnh "trừ xong nhưng chưa cộng" nếu crash giữa chừng.',
},
{
  cat: 'Isolation',
  q: 'Các isolation level và anomaly mỗi level cho phép?',
  answer:
    'Theo chuẩn SQL, từ lỏng tới chặt:\n' +
    '| Level | Dirty read | Non-repeatable read | Phantom |\n' +
    '|-|-|-|-|\n' +
    '| Read Uncommitted | có | có | có |\n' +
    '| Read Committed | không | có | có |\n' +
    '| Repeatable Read | không | không | có (*) |\n' +
    '| Serializable | không | không | không |\n\n' +
    '(*) Postgres Repeatable Read (snapshot isolation) thực tế **ngăn cả phantom** cho đọc, nhưng có "write skew". MySQL InnoDB RR dùng next-key lock ngăn phantom cho nhiều trường hợp.',
  essence:
    'Isolation level càng cao càng ít anomaly nhưng càng nhiều lock/abort. Mỗi DB "diễn giải" chuẩn hơi khác (nhất là RR). Biết default của DB bạn dùng: Postgres = Read Committed, MySQL = Repeatable Read, Oracle = Read Committed.',
  example:
    'Report tính tổng trong khi có giao dịch chạy: ở Read Committed, hai lần `SELECT SUM` trong cùng transaction có thể ra số khác nhau (non-repeatable). Cần con số nhất quán → chạy report ở Repeatable Read (snapshot cố định).',
},
{
  cat: 'Isolation',
  q: 'Dirty read, non-repeatable read, phantom read, lost update, write skew — giải thích?',
  answer:
    '- **Dirty read**: đọc dữ liệu của transaction khác **chưa commit** (có thể bị rollback).\n' +
    '- **Non-repeatable read**: đọc cùng một hàng hai lần trong một transaction, giá trị **đổi** (transaction khác đã commit UPDATE giữa chừng).\n' +
    '- **Phantom read**: chạy cùng một truy vấn phạm vi hai lần, **số hàng đổi** (transaction khác INSERT/DELETE khớp điều kiện).\n' +
    '- **Lost update**: hai transaction đọc cùng giá trị, cùng tính toán, cùng ghi đè → mất một cập nhật.\n' +
    '- **Write skew**: hai transaction đọc cùng tập dữ liệu, mỗi cái ghi vào phần khác nhau, kết quả gộp vi phạm một bất biến (invariant).',
  essence:
    'Dirty/non-repeatable/phantom là về **đọc** thấy gì. Lost update và write skew là về **ghi** đồng thời phá vỡ tính đúng. Serializable ngăn tất cả; các level thấp hơn cần bạn tự khoá.',
  example:
    'Write skew: quy định "luôn có ≥ 1 bác sĩ trực". Hai bác sĩ cùng xin nghỉ, mỗi transaction thấy "còn người kia trực" → cả hai được duyệt → 0 bác sĩ trực. Snapshot isolation không bắt được; cần `SELECT ... FOR UPDATE` hoặc Serializable.',
},
{
  cat: 'MVCC',
  q: 'MVCC (Multi-Version Concurrency Control) hoạt động thế nào?',
  answer:
    'Thay vì khoá khi đọc, DB giữ **nhiều phiên bản** của mỗi hàng. Mỗi transaction thấy một **snapshot** nhất quán (các version đã commit trước khi nó bắt đầu / trước câu lệnh).\n\n' +
    '- **Đọc không chặn ghi, ghi không chặn đọc**.\n' +
    '- Postgres: `UPDATE` tạo tuple mới, tuple cũ được đánh dấu chết → **VACUUM** dọn sau.\n' +
    '- MySQL InnoDB: version cũ nằm trong **undo log**; đọc snapshot dựng lại từ undo.\n' +
    '- Version nào "hiển thị" quyết định bởi transaction id + snapshot.',
  essence:
    'MVCC = "đọc không cần lock" bằng cách cho reader nhìn một ảnh chụp quá khứ nhất quán, trong khi writer tạo version mới. Cái giá: dọn dẹp version cũ (vacuum/undo/purge).',
  example:
    'Trong khi một job batch `UPDATE` 1 triệu hàng (transaction dài), các query đọc khác vẫn chạy bình thường trên snapshot cũ — không bị chặn. Nhưng version cũ tích tụ → Postgres cần VACUUM kịp, nếu không bảng/index bloat.',
},
{
  cat: 'Locking',
  q: 'Shared lock và exclusive lock, row-level vs table-level?',
  answer:
    '- **Shared (S) lock**: nhiều transaction cùng giữ để **đọc**; chặn ghi (X).\n' +
    '- **Exclusive (X) lock**: một transaction giữ để **ghi**; chặn cả S và X khác.\n\n' +
    'Phạm vi:\n' +
    '- **Row-level**: khoá từng hàng — concurrency cao, mặc định cho DML trong InnoDB/Postgres.\n' +
    '- **Table-level**: khoá cả bảng — dùng cho DDL, `LOCK TABLE`, hoặc khi row lock quá nhiều (lock escalation ở SQL Server).\n' +
    '- Còn có **gap lock / predicate lock** cho phantom prevention.',
  essence:
    'S–S tương thích, S–X và X–X thì không. Row-level tối đa concurrency; table-level đơn giản nhưng nghẽn. DB hiện đại khoá ở mức hàng và chỉ leo lên bảng khi cần.',
  example:
    '`SELECT * FROM accounts WHERE id = 1 FOR UPDATE` lấy X lock trên hàng id=1 → transaction khác `FOR UPDATE` cùng hàng phải chờ, nhưng `SELECT` thường (MVCC) vẫn đọc được snapshot.',
},
{
  cat: 'Locking',
  q: '`SELECT ... FOR UPDATE` và `FOR SHARE` dùng khi nào?',
  answer:
    '`FOR UPDATE`: lấy **exclusive lock** trên các hàng được chọn → không transaction nào khác sửa/khoá chúng cho tới khi bạn commit. Dùng cho pattern **đọc-rồi-ghi** cần đảm bảo giá trị không đổi giữa đọc và ghi.\n\n' +
    '`FOR SHARE` (`FOR SHARE`/`LOCK IN SHARE MODE`): shared lock — người khác đọc được, không sửa được. Dùng khi bạn cần đảm bảo hàng tham chiếu không biến mất/không đổi trong khi bạn dựa vào nó.\n\n' +
    'Options: `NOWAIT` (lỗi ngay nếu bị khoá), `SKIP LOCKED` (bỏ qua hàng đang khoá — dùng cho queue).',
  essence:
    '`FOR UPDATE` biến "đọc" thành "đọc và giữ chỗ để ghi" — cách chính để làm pessimistic locking. `SKIP LOCKED` là chìa khoá cho hàng đợi job trong SQL.',
  example:
    'Trừ tồn kho: `SELECT qty FROM stock WHERE sku = ? FOR UPDATE` → kiểm tra đủ → `UPDATE stock SET qty = qty - ?`. Không có `FOR UPDATE`, hai request đọc cùng qty=5, cùng trừ 3 → qty = 2 thay vì -1 (oversell).',
},
{
  cat: 'Locking',
  q: 'Deadlock trong DB: phát hiện và phòng tránh?',
  answer:
    'Deadlock: transaction A giữ lock 1 chờ lock 2; transaction B giữ lock 2 chờ lock 1.\n\n' +
    '**Phát hiện**: DB có deadlock detector (kiểm tra chu trình trong wait-for graph) → chọn một transaction làm **nạn nhân**, rollback nó (`deadlock detected` / error 1213) → ứng dụng nên **retry**.\n\n' +
    '**Phòng tránh**:\n' +
    '- **Thứ tự khoá nhất quán**: luôn khoá hàng theo cùng thứ tự (ví dụ tăng dần theo id).\n' +
    '- Giữ transaction **ngắn**, khoá **ít hàng**.\n' +
    '- Dùng `FOR UPDATE` một lần cho tất cả hàng cần thay vì rải rác.\n' +
    '- Giảm isolation nếu phù hợp; dùng optimistic locking.',
  essence:
    'Deadlock là chờ vòng tròn. DB tự phá bằng cách hy sinh một transaction. Việc của bạn: khoá theo thứ tự cố định, transaction ngắn, và code retry cho lỗi deadlock/serialization.',
  example:
    '`transfer(1, 2)` khoá hàng 1 rồi 2; `transfer(2, 1)` khoá 2 rồi 1 → deadlock. Sửa: luôn `SELECT ... WHERE id IN (least, greatest) ORDER BY id FOR UPDATE` — cả hai transaction khoá theo cùng thứ tự.',
},
{
  cat: 'Locking',
  q: 'Optimistic locking với version column — hoạt động và khi nào dùng?',
  answer:
    'Thêm cột `version` (int) hoặc `updated_at`. Khi cập nhật:\n' +
    '```\n' +
    'UPDATE items SET qty = :newQty, version = version + 1\n' +
    'WHERE id = :id AND version = :versionĐãĐọc\n' +
    '```\n' +
    'Nếu `rows affected = 0` → ai đó đã sửa hàng này từ lúc bạn đọc → báo lỗi "dữ liệu đã thay đổi", client tải lại và thử lại.\n\n' +
    'Dùng khi **tranh chấp thấp** (hiếm khi hai người sửa cùng hàng): không giữ lock, concurrency cao. Tranh chấp cao → pessimistic (`FOR UPDATE`) tốt hơn (tránh retry storm).',
  essence:
    'Optimistic: "cứ ghi, kèm điều kiện version chưa đổi; thất bại thì thử lại". Không lock, phù hợp UI form nơi xung đột hiếm. Pessimistic: khoá trước, phù hợp hot row.',
  example:
    'Sửa hồ sơ sản phẩm (admin): optimistic — nếu hai admin cùng mở form và lưu, người thứ hai nhận "Sản phẩm đã được cập nhật bởi người khác, vui lòng tải lại". Trừ tồn kho lúc flash sale: pessimistic hoặc UPDATE nguyên tử.',
},
{
  cat: 'Giao dịch',
  q: 'Vấn đề của transaction chạy quá lâu (long-running transaction)?',
  answer:
    '- **Giữ lock lâu** → transaction khác chờ/deadlock.\n' +
    '- **Postgres**: chặn VACUUM dọn dead tuple (mọi hàng chết sau khi transaction này bắt đầu không được dọn) → **bloat** bảng/index toàn hệ thống, và nguy cơ **transaction ID wraparound**.\n' +
    '- **MySQL**: undo log phình (history list length tăng) → đĩa, chậm.\n' +
    '- **Replication lag**: replica phải giữ snapshot tương ứng.\n' +
    '- Nếu rollback → mất toàn bộ công việc, rollback cũng lâu.',
  essence:
    'Transaction dài không chỉ hại chính nó mà "đóng băng" khả năng dọn dẹp của cả DB. Giữ transaction ngắn; tách công việc lớn thành nhiều transaction nhỏ (batch).',
  example:
    'Job cập nhật 50 triệu hàng trong một transaction chạy 2 giờ → autovacuum không dọn được gì trong 2 giờ đó → mọi bảng bloat, query khác chậm dần. Sửa: chia thành batch 10k hàng, commit mỗi batch.',
},
{
  cat: 'Giao dịch',
  q: 'Autocommit, `BEGIN/COMMIT/ROLLBACK`, `SAVEPOINT`?',
  answer:
    '- **Autocommit** (mặc định ở đa số client): mỗi câu lệnh là một transaction tự commit ngay.\n' +
    '- **Explicit transaction**: `BEGIN` (hoặc `START TRANSACTION`) → nhiều câu lệnh → `COMMIT` (áp dụng) hoặc `ROLLBACK` (huỷ hết).\n' +
    '- **`SAVEPOINT name`** + `ROLLBACK TO SAVEPOINT name`: điểm khôi phục **một phần** trong transaction — rollback về savepoint mà không huỷ toàn bộ. Hữu ích khi muốn "thử một bước, sai thì bỏ bước đó, đi tiếp".',
  essence:
    'Autocommit = "mỗi lệnh độc lập". Explicit transaction = "gom nhiều lệnh nguyên tử". Savepoint = "checkpoint trong transaction" để rollback cục bộ.',
  example:
    'Import 1000 dòng trong một transaction, một số dòng có thể lỗi validation: `SAVEPOINT sp` trước mỗi dòng; lỗi → `ROLLBACK TO sp` và ghi dòng vào bảng lỗi, rồi tiếp tục. Cuối cùng `COMMIT` những dòng hợp lệ.',
},
{
  cat: 'Isolation',
  q: 'Read Committed vs Repeatable Read trong thực tế (Postgres vs MySQL)?',
  answer:
    '- **Postgres default = Read Committed**: mỗi **câu lệnh** thấy snapshot mới nhất tại thời điểm nó bắt đầu. Hai `SELECT` trong một transaction có thể thấy dữ liệu khác nhau.\n' +
    '- **MySQL InnoDB default = Repeatable Read**: snapshot cố định từ câu lệnh đọc **đầu tiên** của transaction → mọi `SELECT` thấy như nhau. Kèm gap lock để ngăn phantom cho `SELECT ... FOR UPDATE`.\n\n' +
    'Read Committed đơn giản, ít abort, nhưng cần cẩn thận với đọc-rồi-ghi. Repeatable Read cho đọc nhất quán nhưng dễ gặp serialization/lock conflict hơn.',
  essence:
    'Postgres RC: snapshot per statement (mới nhất mỗi lệnh). MySQL RR: snapshot per transaction (cố định). Biết default của DB để không giả định sai về tính lặp lại của SELECT.',
  example:
    'Chuyển từ MySQL sang Postgres: code cũ dựa vào việc hai `SELECT count(*)` trong một transaction luôn bằng nhau (RR mặc định của MySQL). Trên Postgres RC, giữa hai lệnh có INSERT commit → số khác nhau → bug. Sửa: `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`.',
},
{
  cat: 'Isolation',
  q: 'Serializable Snapshot Isolation (SSI) của Postgres hoạt động thế nào?',
  answer:
    'Postgres `SERIALIZABLE` không dùng lock đọc; nó chạy như snapshot isolation nhưng **theo dõi các phụ thuộc đọc-ghi** giữa transaction đồng thời. Nếu phát hiện một mẫu có thể dẫn tới kết quả không tuần tự hoá được (dangerous structure) → **abort một transaction** với `could not serialize access` (SQLSTATE 40001).\n\n' +
    'Ứng dụng phải **retry** transaction bị abort. Không cần `SELECT ... FOR UPDATE` thủ công — SSI bắt cả write skew.',
  essence:
    'SSI cho tính đúng của Serializable với chi phí của snapshot isolation + một số abort. Đổi "viết lock thủ công cẩn thận" lấy "viết code retry". Rất mạnh cho logic nghiệp vụ phức tạp.',
  example:
    'Bài toán "≥ 1 bác sĩ trực": chạy toàn bộ ở `SERIALIZABLE`. Hai bác sĩ cùng xin nghỉ đồng thời → Postgres phát hiện rw-dependency nguy hiểm → abort một transaction → nó retry, lần này thấy chỉ còn 1 bác sĩ → từ chối. Không cần khoá tay.',
},
{
  cat: 'Locking',
  q: 'Advisory lock trong Postgres dùng để làm gì?',
  answer:
    'Lock **do ứng dụng định nghĩa** (không gắn với hàng/bảng nào), khoá theo một khoá số (bigint). `pg_advisory_lock(key)` / `pg_try_advisory_lock(key)` / `pg_advisory_unlock(key)`; hoặc bản `_xact_` tự nhả khi transaction kết thúc.\n\n' +
    'Dùng cho: đảm bảo chỉ một instance chạy một job (cron, migration), serialize một luồng xử lý logic, phối hợp giữa các process — mà không cần bảng lock riêng.',
  essence:
    'Advisory lock = mutex phân tán "miễn phí" dùng chính Postgres làm coordinator. Không ảnh hưởng dữ liệu, chỉ là tín hiệu "tôi đang giữ khoá K".',
  example:
    'Migration chạy khi app khởi động trên 5 pod: `SELECT pg_try_advisory_lock(42)` — pod nào lấy được thì chạy migration, các pod khác nhận `false` và bỏ qua. `pg_advisory_unlock(42)` khi xong. Không cần Redis/ZooKeeper.',
},
{
  cat: 'Locking',
  q: 'Gap lock và next-key lock trong MySQL InnoDB?',
  answer:
    'Ở Repeatable Read, để ngăn **phantom**, InnoDB khoá không chỉ hàng khớp mà cả **khoảng trống (gap)** giữa các giá trị index.\n\n' +
    '- **Gap lock**: khoá khoảng `(a, b)` — không cho INSERT giá trị mới vào giữa.\n' +
    '- **Next-key lock**: gap lock + record lock trên hàng — khoá `(a, b]`.\n\n' +
    'Hệ quả: `SELECT ... WHERE x BETWEEN 10 AND 20 FOR UPDATE` có thể chặn INSERT `x = 15` dù hàng đó chưa tồn tại. Gây deadlock bất ngờ nếu không lường trước.',
  essence:
    'Next-key lock là cách InnoDB đạt "không phantom" ở RR — bằng cách khoá cả khoảng. Đây là nguồn deadlock/blocking "khó hiểu" khi lock một range dựa trên index.',
  example:
    'Hai session cùng `INSERT ... ON DUPLICATE KEY UPDATE` với giá trị gần nhau trên một unique index → gap lock chồng lấn → deadlock. Read Committed (không gap lock) hoặc thiết kế lại có thể tránh; hoặc chấp nhận và retry.',
},
{
  cat: 'Giao dịch',
  q: 'Chuyển tiền an toàn: dùng transaction + locking thế nào?',
  answer:
    'Vấn đề: đọc số dư, kiểm tra đủ, trừ — nếu không nguyên tử thì hai giao dịch cùng thấy đủ tiền rồi cùng trừ.\n\n' +
    'Cách 1 — **pessimistic**:\n' +
    '```\n' +
    'BEGIN;\n' +
    'SELECT balance FROM accounts WHERE id IN (:from, :to) ORDER BY id FOR UPDATE;\n' +
    '-- kiểm tra balance[from] >= amount\n' +
    'UPDATE accounts SET balance = balance - :amount WHERE id = :from;\n' +
    'UPDATE accounts SET balance = balance + :amount WHERE id = :to;\n' +
    'COMMIT;\n' +
    '```\n' +
    'Cách 2 — **UPDATE có điều kiện nguyên tử**: `UPDATE accounts SET balance = balance - :amount WHERE id = :from AND balance >= :amount` → nếu 0 hàng thì không đủ tiền, rollback.\n\n' +
    'Kèm: `ORDER BY id` để tránh deadlock; idempotency key cho request; ghi vào bảng `transactions` (audit).',
  essence:
    'Nguyên tử hoá phép "kiểm tra rồi trừ": hoặc khoá hàng (`FOR UPDATE` theo thứ tự id), hoặc đưa điều kiện vào chính câu `UPDATE`. Luôn khoá theo thứ tự cố định và có idempotency.',
  example:
    'API chuyển tiền có `Idempotency-Key`: kiểm tra key trong bảng `transfers` (unique) → chưa có thì chạy transaction chuyển tiền + insert bản ghi transfer với key đó, tất cả trong một transaction. Retry cùng key → insert fail unique → trả kết quả cũ.',
},
{
  cat: 'Giao dịch',
  q: 'Retry logic cho serialization failure / deadlock — viết thế nào?',
  answer:
    'Ở isolation cao (Serializable, hoặc gặp deadlock), DB có thể abort transaction với mã lỗi tạm thời (Postgres `40001` serialization_failure, `40P01` deadlock; MySQL 1213).\n\n' +
    'Wrapper:\n' +
    '```\n' +
    'for attempt in 1..maxRetries:\n' +
    '    try: begin; ...work...; commit; return\n' +
    '    except SerializationFailure or Deadlock:\n' +
    '        rollback; sleep(backoff * 2^attempt + jitter)\n' +
    '    except OtherError: rollback; raise\n' +
    'raise TooManyRetries\n' +
    '```\n' +
    'Quan trọng: work bên trong phải **không có side effect ngoài DB** (hoặc idempotent), vì nó chạy lại từ đầu.',
  essence:
    'Isolation mạnh đẩy trách nhiệm xử lý xung đột về ứng dụng dưới dạng "retry khi bị abort". Backoff + jitter + giới hạn số lần + transaction không side-effect-ngoài là công thức.',
  example:
    'Endpoint đặt vé (Serializable): bọc trong `retryOnSerializationFailure(3)`. Hai người đặt ghế cuối cùng đồng thời → một transaction abort → retry → thấy ghế đã hết → trả "hết vé". Người dùng chỉ thấy request chậm thêm vài ms.',
},
{
  cat: 'Giao dịch',
  q: 'Chạy báo cáo nặng mà không ảnh hưởng OLTP — làm thế nào?',
  answer:
    '- **`SET TRANSACTION READ ONLY`** + isolation Repeatable Read → snapshot nhất quán, DB biết không cần chuẩn bị cho ghi.\n' +
    '- Chạy trên **read replica** (route read-only sang replica) → tách hoàn toàn tải khỏi primary.\n' +
    '- Postgres: cẩn thận `max_standby_streaming_delay` (query dài trên replica có thể bị huỷ khi replica áp WAL xoá hàng nó đang đọc) hoặc dùng `hot_standby_feedback`.\n' +
    '- Đặt `statement_timeout` để report chạy điên không giữ tài nguyên mãi.\n' +
    '- Với nhu cầu lớn → ETL sang data warehouse (OLAP).',
  essence:
    'Report = đọc nhiều, chạy lâu, không cần realtime. Đẩy nó ra khỏi đường OLTP: replica read-only, hoặc warehouse. Trên primary thì ít nhất là READ ONLY + timeout.',
  example:
    'Dashboard BI query 30 giây trên bảng `orders` 200M hàng: route sang read replica với `hot_standby_feedback = on`. Primary không thấy tải này; nếu replica lag tăng do query, có thể thêm replica thứ hai dành riêng cho analytics.',
},
{
  cat: 'Giao dịch',
  q: 'Two-phase commit / distributed transaction — vì sao thường tránh?',
  answer:
    '2PC: một coordinator hỏi mọi participant "prepare?" (ghi undo/redo, khoá tài nguyên, trả "yes"), rồi "commit". \n\n' +
    'Vấn đề:\n' +
    '- **Blocking**: nếu coordinator chết sau phase 1, participant kẹt ở trạng thái "prepared" (giữ khoá) chờ vô hạn.\n' +
    '- **Latency & throughput** kém (nhiều round-trip, khoá lâu).\n' +
    '- Khó vận hành, khó phục hồi.\n\n' +
    'Thay thế cho hệ phân tán: **saga** (chuỗi transaction cục bộ + bù trừ), **outbox pattern**, eventual consistency + idempotency.',
  essence:
    '2PC cho atomicity phân tán nhưng đánh đổi availability (blocking) và hiệu năng nghiêm trọng. Hệ hiện đại chọn saga/outbox: chấp nhận eventual consistency, xử lý lỗi bằng bước bù trừ.',
  example:
    'Đặt hàng chạm inventory-service + payment-service + shipping-service: **không** dùng distributed transaction. Saga: `OrderCreated → ReserveInventory → ChargePayment → CreateShipment`; nếu `ChargePayment` fail → phát `ReleaseInventory` (bù trừ).',
},
{
  cat: 'Locking',
  q: 'Hàng đợi job trong SQL với `FOR UPDATE SKIP LOCKED`?',
  answer:
    'Nhiều worker cùng lấy job từ một bảng `jobs`. Nếu dùng `SELECT ... WHERE status = \'QUEUED\' LIMIT 1 FOR UPDATE`, các worker **xếp hàng chờ nhau** trên cùng hàng đầu tiên → tuần tự hoá.\n\n' +
    '`SKIP LOCKED`: bỏ qua hàng đang bị worker khác khoá, lấy hàng **kế tiếp chưa khoá**:\n' +
    '```\n' +
    'BEGIN;\n' +
    'SELECT id FROM jobs WHERE status = \'QUEUED\'\n' +
    '  ORDER BY priority, created_at\n' +
    '  LIMIT 10 FOR UPDATE SKIP LOCKED;\n' +
    '-- xử lý, rồi UPDATE status = \'DONE\'\n' +
    'COMMIT;\n' +
    '```\n' +
    'Mỗi worker lấy một lô riêng, không giẫm chân.',
  essence:
    '`SKIP LOCKED` biến một bảng thành hàng đợi đa consumer: mỗi worker "gắp" phần chưa ai giữ. Kèm partial index `WHERE status = \'QUEUED\'` để quét nhanh.',
  example:
    '10 worker poll bảng `outbox`: mỗi cái `SELECT ... LIMIT 50 FOR UPDATE SKIP LOCKED` → 10 lô 50 job không trùng nhau, xử lý song song, không lock contention. Worker chết giữa chừng → transaction rollback → job về `QUEUED`, worker khác lấy.',
},
{
  cat: 'Vận hành',
  q: 'VACUUM và transaction ID wraparound trong Postgres là gì?',
  answer:
    'Postgres đánh dấu version nào hiển thị bằng **transaction id (XID)** 32-bit. XID quay vòng (wraparound) sau ~4 tỉ transaction. Nếu không "đóng băng" (freeze) các hàng cũ kịp thời, dữ liệu quá cũ có thể bị coi là "tương lai" → **mất dữ liệu / DB dừng để tự bảo vệ**.\n\n' +
    '**VACUUM** (thường tự động — autovacuum): dọn dead tuple (do UPDATE/DELETE + MVCC), cập nhật visibility map, và **FREEZE** các hàng cũ (gán XID đặc biệt "luôn hiển thị").\n\n' +
    'Transaction dài và autovacuum bị tụt hậu là nguyên nhân chính gây nguy cơ wraparound.',
  essence:
    'MVCC của Postgres tạo "rác" (dead tuple) và dùng XID hữu hạn → VACUUM là bắt buộc, không phải tuỳ chọn: nó vừa dọn rác vừa chống wraparound. Theo dõi `age(datfrozenxid)`.',
  example:
    'Alert: `age(relfrozenxid)` của một bảng tiến gần `autovacuum_freeze_max_age` → autovacuum không theo kịp (bảng ghi cực nhiều, hoặc có transaction "idle in transaction" 10 tiếng chặn nó). Kill transaction cũ, tune `autovacuum_vacuum_cost_limit`, hoặc `VACUUM FREEZE` thủ công.',
},
]);
