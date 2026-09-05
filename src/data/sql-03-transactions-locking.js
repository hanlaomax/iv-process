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
  viz: {
    type: 'tree',
    title: 'ACID',
    root: {
      label: 'Isolation là tính chất bị "nới lỏng" nhất để đổi lấy hiệu năng',
      children: [
        { label: 'Atomicity — không dở dang', note: 'commit thì mọi thay đổi được áp; lỗi thì không thay đổi nào tồn tại' },
        { label: 'Consistency — luôn hợp lệ', note: 'từ trạng thái thoả mọi constraint sang trạng thái hợp lệ khác' },
        { label: 'Isolation — không giẫm chân nhau', note: 'chạy đồng thời cho kết quả như thể tuần tự (tuỳ level)' },
        { label: 'Durability — commit rồi thì chắc chắn', note: 'không mất kể cả mất điện (WAL/redo ghi đĩa trước)' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Bốn đảm bảo, minh hoạ bằng chuyển tiền",
      code:
        "BEGIN;\n" +
        "  UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n" +
        "  UPDATE accounts SET balance = balance + 100 WHERE id = 2;\n" +
        "COMMIT;\n" +
        "\n" +
        "-- ATOMICITY (nguyên tử): cả hai UPDATE cùng thành công, hoặc KHÔNG cái nào.\n" +
        "--   Sập giữa chừng -> khi khởi động lại, DB tự rollback bằng undo log/WAL.\n" +
        "--   Không có trạng thái \"đã trừ mà chưa cộng\".\n" +
        "\n" +
        "-- CONSISTENCY (nhất quán): transaction đưa DB từ trạng thái hợp lệ này sang\n" +
        "--   trạng thái hợp lệ khác. Mọi CONSTRAINT được tôn trọng.\n" +
        "ALTER TABLE accounts ADD CONSTRAINT chk_balance CHECK (balance >= 0);\n" +
        "-- Vi phạm -> transaction bị huỷ. Lưu ý: consistency phần lớn do BẠN định\n" +
        "-- nghĩa qua constraint; DB chỉ thực thi cái bạn khai báo.\n" +
        "\n" +
        "-- ISOLATION (cô lập): transaction đồng thời không nhìn thấy trạng thái dở\n" +
        "--   dang của nhau. Mức độ do ISOLATION LEVEL quyết định (xem câu sau).\n" +
        "SHOW transaction_isolation;\n" +
        "\n" +
        "-- DURABILITY (bền vững): COMMIT xong là dữ liệu SỐNG SÓT qua mất điện.\n" +
        "--   Cơ chế: WAL được fsync xuống đĩa TRƯỚC khi báo commit thành công.\n" +
        "SHOW synchronous_commit;\n" +
        "SET synchronous_commit = off;   -- nhanh hơn nhiều, nhưng mất tối đa vài\n" +
        "                                -- trăm ms dữ liệu khi sập. Đây là đánh đổi\n" +
        "                                -- có ý thức, không phải mặc định.\n" +
        "\n" +
        "-- TRONG HỆ PHÂN TÁN, ACID rất đắt -> nhiều hệ chọn BASE (Basically Available,\n" +
        "-- Soft state, Eventual consistency) và bù bằng saga/idempotent.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
    rows: [
      ['Dirty read', 'có', 'không', 'không', 'không'],
      ['Non-repeatable read', 'có', 'có', 'không', 'không'],
      ['Phantom', 'có', 'có', 'có (*)', 'không'],
      ['Default', '—', 'Postgres, Oracle', 'MySQL InnoDB', '—'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Bốn mức, và mức nào chặn được gì",
      code:
        "SET TRANSACTION ISOLATION LEVEL READ COMMITTED;\n" +
        "BEGIN ISOLATION LEVEL REPEATABLE READ;\n" +
        "\n" +
        "-- BẢNG CHUẨN SQL (P = cho phép xảy ra):\n" +
        "-- Level             | Dirty read | Non-repeatable | Phantom\n" +
        "-- READ UNCOMMITTED  |     P      |       P        |    P\n" +
        "-- READ COMMITTED    |     -      |       P        |    P\n" +
        "-- REPEATABLE READ   |     -      |       -        |    P\n" +
        "-- SERIALIZABLE      |     -      |       -        |    -\n" +
        "\n" +
        "-- THỰC TẾ KHÁC VỚI CHUẨN:\n" +
        "--  POSTGRES: mặc định READ COMMITTED. Không có READ UNCOMMITTED thật\n" +
        "--    (nó hành xử như READ COMMITTED). REPEATABLE READ của Postgres dùng\n" +
        "--    snapshot nên CHẶN LUÔN phantom read — mạnh hơn chuẩn yêu cầu.\n" +
        "--  MYSQL/InnoDB: mặc định REPEATABLE READ. Nhờ gap lock + next-key lock,\n" +
        "--    nó cũng chặn được phantom trong phần lớn trường hợp.\n" +
        "\n" +
        "-- Kiểm tra và đặt mức:\n" +
        "SELECT current_setting(\u0027transaction_isolation\u0027);\n" +
        "ALTER DATABASE mydb SET default_transaction_isolation = \u0027read committed\u0027;\n" +
        "\n" +
        "-- CHỌN THẾ NÀO:\n" +
        "--  READ COMMITTED  — mặc định tốt cho OLTP. Ít xung đột, throughput cao.\n" +
        "--  REPEATABLE READ — khi một transaction đọc CÙNG dữ liệu nhiều lần và\n" +
        "--                    cần thấy giá trị nhất quán (báo cáo trong transaction).\n" +
        "--  SERIALIZABLE    — khi logic nghiệp vụ phức tạp và bạn không muốn phân\n" +
        "--                    tích từng anomaly. Đổi lại: phải xử lý serialization\n" +
        "--                    failure và retry.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Anomaly — đọc thấy gì vs ghi đồng thời phá tính đúng',
    root: {
      label: 'Serializable ngăn tất cả; level thấp hơn cần bạn tự khoá',
      children: [
        { label: 'Dirty read (ĐỌC)', note: 'đọc dữ liệu transaction khác CHƯA commit' },
        { label: 'Non-repeatable read (ĐỌC)', note: 'đọc cùng hàng 2 lần, giá trị đổi' },
        { label: 'Phantom read (ĐỌC)', note: 'chạy cùng truy vấn phạm vi 2 lần, số hàng đổi' },
        { label: 'Lost update (GHI)', note: 'hai transaction đọc cùng giá trị, cùng ghi đè → mất một cập nhật' },
        { label: 'Write skew (GHI)', note: 'mỗi transaction ghi phần khác nhau, kết quả gộp vi phạm một bất biến ("≥ 1 bác sĩ trực")' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Năm anomaly, mỗi cái một kịch bản cụ thể",
      code:
        "-- DIRTY READ: đọc dữ liệu CHƯA COMMIT của transaction khác.\n" +
        "--   T1: UPDATE accounts SET balance = 0 WHERE id = 1;   (chưa commit)\n" +
        "--   T2: SELECT balance FROM accounts WHERE id = 1;      -> đọc thấy 0\n" +
        "--   T1: ROLLBACK;                                        -> số 0 kia chưa từng tồn tại\n" +
        "--   Chặn từ READ COMMITTED trở lên.\n" +
        "\n" +
        "-- NON-REPEATABLE READ: đọc CÙNG một hàng hai lần, ra hai giá trị khác nhau.\n" +
        "--   T1: SELECT balance FROM accounts WHERE id = 1;      -> 100\n" +
        "--   T2: UPDATE accounts SET balance = 50 WHERE id = 1; COMMIT;\n" +
        "--   T1: SELECT balance FROM accounts WHERE id = 1;      -> 50\n" +
        "--   Chặn từ REPEATABLE READ.\n" +
        "\n" +
        "-- PHANTOM READ: cùng một điều kiện WHERE, lần sau ra THÊM hàng mới.\n" +
        "--   T1: SELECT COUNT(*) FROM orders WHERE amount > 100;  -> 5\n" +
        "--   T2: INSERT INTO orders (amount) VALUES (200); COMMIT;\n" +
        "--   T1: SELECT COUNT(*) FROM orders WHERE amount > 100;  -> 6\n" +
        "--   Chặn ở SERIALIZABLE (và ở REPEATABLE READ của Postgres/MySQL).\n" +
        "\n" +
        "-- LOST UPDATE: hai transaction cùng đọc-sửa-ghi, một bản cập nhật BIẾN MẤT.\n" +
        "--   T1: SELECT balance -> 100        T2: SELECT balance -> 100\n" +
        "--   T1: UPDATE SET balance = 90      T2: UPDATE SET balance = 80\n" +
        "--   Kết quả 80: thay đổi của T1 mất hoàn toàn.\n" +
        "--   CHẶN: SELECT ... FOR UPDATE, hoặc cập nhật nguyên tử, hoặc version column\n" +
        "UPDATE accounts SET balance = balance - 10 WHERE id = 1;   -- nguyên tử, an toàn\n" +
        "\n" +
        "-- WRITE SKEW: mỗi transaction đọc và ghi hàng KHÁC NHAU, mỗi cái đúng riêng\n" +
        "-- lẻ nhưng cùng nhau phá vỡ ràng buộc.\n" +
        "--   Quy tắc: luôn phải có ít nhất 1 bác sĩ trực. Đang có 2 người.\n" +
        "--   T1 (bác sĩ A): thấy 2 người trực -> xin nghỉ -> OK\n" +
        "--   T2 (bác sĩ B): thấy 2 người trực -> xin nghỉ -> OK\n" +
        "--   Kết quả: 0 người trực. CHỈ SERIALIZABLE mới chặn được anomaly này.",
    },
  ],
},
{
  cat: 'MVCC',
  diagram: 'mvcc-snapshot',
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
  demo: [
    {
      lang: "sql",
      title: "Đọc không chặn ghi, ghi không chặn đọc",
      code:
        "-- Thay vì khoá khi đọc, DB giữ NHIỀU PHIÊN BẢN của mỗi hàng. Mỗi transaction\n" +
        "-- nhìn thấy phiên bản phù hợp với SNAPSHOT của nó.\n" +
        "SELECT txid_current();\n" +
        "SELECT xmin, xmax, * FROM accounts WHERE id = 1;\n" +
        "-- xmin = transaction đã TẠO phiên bản này\n" +
        "-- xmax = transaction đã XOÁ/thay thế nó (0 nếu còn hiện hành)\n" +
        "\n" +
        "-- UPDATE trong Postgres KHÔNG sửa tại chỗ: nó CHÈN phiên bản mới và đánh\n" +
        "-- dấu phiên bản cũ là hết hạn.\n" +
        "UPDATE accounts SET balance = 50 WHERE id = 1;\n" +
        "-- -> hàng cũ vẫn nằm đó (dead tuple) cho tới khi VACUUM dọn.\n" +
        "\n" +
        "-- HỆ QUẢ QUAN TRỌNG:\n" +
        "-- 1) ĐỌC KHÔNG BAO GIỜ CHẶN GHI và ngược lại -> throughput cao hơn nhiều\n" +
        "--    so với khoá đọc kiểu cũ.\n" +
        "-- 2) Bảng PHÌNH (bloat) vì dead tuple -> cần VACUUM thường xuyên.\n" +
        "SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables\n" +
        "ORDER BY n_dead_tup DESC LIMIT 10;\n" +
        "-- 3) UPDATE đắt hơn tưởng: phải cập nhật MỌI INDEX trỏ tới hàng\n" +
        "--    (trừ khi là HOT update — cột đổi không nằm trong index nào).\n" +
        "-- 4) Transaction chạy lâu GIỮ snapshot cũ -> VACUUM không dọn được dead\n" +
        "--    tuple mới hơn -> bloat tăng (xem câu về long-running transaction).\n" +
        "\n" +
        "-- MYSQL/InnoDB làm khác: sửa tại chỗ và lưu phiên bản cũ trong UNDO LOG.\n" +
        "-- -> ít bloat ở bảng chính hơn, nhưng undo log có thể phình to.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Shared (S) lock', 'Exclusive (X) lock', 'Row-level vs Table-level'],
    rows: [
      ['Cho', 'nhiều transaction cùng ĐỌC', 'một transaction GHI', 'row: concurrency cao (mặc định DML); table: DDL, LOCK TABLE'],
      ['Tương thích', 'S–S OK', 'S–X và X–X KHÔNG', '—'],
      ['Ngoài ra', '—', '—', 'gap lock / predicate lock cho phantom prevention'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Ai chặn ai",
      code:
        "-- SHARED (S) — nhiều transaction cùng giữ được. Dùng khi đọc và muốn chặn\n" +
        "--   người khác SỬA.\n" +
        "SELECT * FROM accounts WHERE id = 1 FOR SHARE;\n" +
        "\n" +
        "-- EXCLUSIVE (X) — chỉ MỘT transaction giữ, chặn mọi khoá khác trên hàng đó.\n" +
        "SELECT * FROM accounts WHERE id = 1 FOR UPDATE;\n" +
        "UPDATE accounts SET balance = 50 WHERE id = 1;      -- tự lấy khoá X\n" +
        "\n" +
        "-- MA TRẬN TƯƠNG THÍCH:\n" +
        "--        S      X\n" +
        "--   S   OK     chặn\n" +
        "--   X  chặn    chặn\n" +
        "\n" +
        "-- ROW-LEVEL: chỉ khoá hàng liên quan -> song song cao. Là mức dùng chính.\n" +
        "-- TABLE-LEVEL: khoá cả bảng -> hầu như chỉ dùng cho DDL.\n" +
        "LOCK TABLE accounts IN EXCLUSIVE MODE;    -- hiếm khi cần trong code ứng dụng\n" +
        "\n" +
        "-- DDL lấy khoá ACCESS EXCLUSIVE (chặn cả SELECT):\n" +
        "ALTER TABLE orders ADD COLUMN note TEXT;  -- Postgres 11+: thêm cột có DEFAULT\n" +
        "                                          -- không phải viết lại bảng -> rất nhanh\n" +
        "-- Nhưng nó vẫn phải CHỜ lấy được khoá. Một transaction dài đang mở là\n" +
        "-- ALTER TABLE xếp hàng, và MỌI truy vấn tới sau CŨNG xếp hàng theo nó\n" +
        "-- -> bảng bị khoá cứng. Luôn đặt lock_timeout khi chạy DDL:\n" +
        "SET lock_timeout = \u00273s\u0027;\n" +
        "\n" +
        "-- XEM KHOÁ đang giữ và ai đang chờ ai:\n" +
        "SELECT l.pid, l.mode, l.granted, a.query, a.state\n" +
        "FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid\n" +
        "WHERE NOT l.granted;\n" +
        "SELECT pg_blocking_pids(pid), * FROM pg_stat_activity WHERE wait_event_type = \u0027Lock\u0027;",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['FOR UPDATE', 'FOR SHARE'],
    rows: [
      ['Lock', 'exclusive — không ai sửa/khoá cho tới khi commit', 'shared — người khác đọc được, không sửa được'],
      ['Dùng cho', 'pattern đọc-rồi-ghi (pessimistic locking)', 'đảm bảo hàng tham chiếu không đổi khi bạn dựa vào nó'],
      ['Options', 'NOWAIT (lỗi ngay nếu bị khoá), SKIP LOCKED (bỏ qua hàng khoá — cho queue)', 'như trái'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Khoá bi quan ở mức hàng",
      code:
        "-- FOR UPDATE — khoá hàng để ĐỌC RỒI GHI mà không ai chen vào giữa.\n" +
        "BEGIN;\n" +
        "  SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;   -- khoá hàng\n" +
        "  -- tính toán ở phía ứng dụng...\n" +
        "  UPDATE accounts SET balance = 50 WHERE id = 1;\n" +
        "COMMIT;                                                    -- nhả khoá\n" +
        "-- Không có FOR UPDATE thì hai transaction cùng đọc 100 và cùng ghi\n" +
        "-- -> LOST UPDATE.\n" +
        "\n" +
        "-- CÁC BIẾN THỂ:\n" +
        "SELECT * FROM accounts WHERE id = 1 FOR UPDATE NOWAIT;\n" +
        "-- -> LỖI NGAY nếu hàng đang bị khoá. Dùng khi không muốn chờ.\n" +
        "SELECT * FROM jobs WHERE status = \u0027PENDING\u0027\n" +
        "ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED;\n" +
        "-- -> BỎ QUA hàng đang bị khoá. Đây là nền tảng của hàng đợi job trong SQL.\n" +
        "SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id\n" +
        "FOR UPDATE OF o;                                     -- chỉ khoá bảng orders\n" +
        "\n" +
        "-- FOR SHARE — cho phép người khác cùng đọc, nhưng CHẶN sửa. Dùng khi cần\n" +
        "-- đảm bảo hàng tham chiếu không đổi trong lúc mình làm việc.\n" +
        "SELECT * FROM products WHERE id = 1 FOR SHARE;\n" +
        "\n" +
        "-- LUÔN ĐẶT TIMEOUT — khoá chờ vô hạn là công thức gây sự cố dây chuyền:\n" +
        "SET lock_timeout = \u00273s\u0027;\n" +
        "\n" +
        "-- BA CẠM BẪY:\n" +
        "-- 1) Khoá quá NHIỀU hàng (thiếu WHERE chọn lọc) -> chặn cả hệ thống.\n" +
        "-- 2) Giữ khoá QUÁ LÂU: gọi API bên ngoài trong lúc đang giữ khoá.\n" +
        "-- 3) THỨ TỰ khoá không nhất quán giữa các đoạn code -> DEADLOCK.\n" +
        "-- Xung đột hiếm -> dùng optimistic locking thay vì FOR UPDATE.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Deadlock — chờ vòng tròn',
    nodes: ['A giữ lock 1, chờ lock 2', 'B giữ lock 2, chờ lock 1', 'DB deadlock detector: chu trình trong wait-for graph', 'chọn một transaction làm NẠN NHÂN, rollback (error 1213 / "deadlock detected")', 'ứng dụng RETRY'],
    steps: [
      { to: 3, label: 'DB tự phá bằng cách hy sinh một transaction' },
      { to: 4, label: 'phòng: khoá hàng theo CÙNG thứ tự (ORDER BY id), transaction ngắn, khoá ít hàng' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Chờ vòng tròn, và cách phá",
      code:
        "-- KỊCH BẢN: hai transaction khoá hai hàng theo thứ tự NGƯỢC nhau.\n" +
        "--   T1: UPDATE accounts SET ... WHERE id = 1;   -- khoá hàng 1\n" +
        "--   T2: UPDATE accounts SET ... WHERE id = 2;   -- khoá hàng 2\n" +
        "--   T1: UPDATE accounts SET ... WHERE id = 2;   -- chờ T2\n" +
        "--   T2: UPDATE accounts SET ... WHERE id = 1;   -- chờ T1 -> DEADLOCK\n" +
        "\n" +
        "-- DB TỰ PHÁT HIỆN và HUỶ một transaction (nạn nhân):\n" +
        "--   ERROR: deadlock detected\n" +
        "--   Postgres: SQLSTATE 40P01. MySQL: error 1213.\n" +
        "SHOW deadlock_timeout;              -- Postgres kiểm tra sau 1 giây chờ\n" +
        "\n" +
        "-- PHÒNG TRÁNH:\n" +
        "-- 1) THỨ TỰ KHOÁ NHẤT QUÁN — cách hiệu quả nhất. Luôn khoá theo id tăng dần:\n" +
        "UPDATE accounts SET balance = balance + CASE id WHEN 1 THEN -100 ELSE 100 END\n" +
        "WHERE id IN (1, 2);                 -- một câu lệnh, DB tự khoá theo thứ tự\n" +
        "-- Hoặc trong ứng dụng: sắp xếp id trước khi khoá.\n" +
        "SELECT * FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE;\n" +
        "\n" +
        "-- 2) TRANSACTION NGẮN: giữ khoá càng lâu, xác suất deadlock càng cao.\n" +
        "-- 3) Giảm isolation level nếu nghiệp vụ cho phép.\n" +
        "-- 4) Đánh index cột FK — thiếu index làm DB khoá phạm vi rộng hơn cần thiết.\n" +
        "-- 5) RETRY: deadlock là chuyện BÌNH THƯỜNG trong hệ tải cao. Ứng dụng\n" +
        "--    PHẢI có retry cho SQLSTATE 40P01/40001 (xem câu về retry).\n" +
        "\n" +
        "-- ĐIỀU TRA: Postgres ghi chi tiết vào log server\n" +
        "--   log_lock_waits = on\n" +
        "--   deadlock_timeout = \u00271s\u0027\n" +
        "SELECT pg_blocking_pids(pid), query FROM pg_stat_activity\n" +
        "WHERE wait_event_type = \u0027Lock\u0027;\n" +
        "-- MySQL: SHOW ENGINE INNODB STATUS  -> mục LATEST DETECTED DEADLOCK",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Optimistic locking với version column',
    nodes: ['đọc hàng (kèm version)', 'UPDATE ... SET version = version + 1 WHERE id = ? AND version = :đãĐọc', 'rows affected = 0 → ai đó đã sửa từ lúc bạn đọc', 'báo "dữ liệu đã thay đổi" → client tải lại và thử lại'],
    steps: [
      { to: 1, label: '"cứ ghi, kèm điều kiện version chưa đổi"' },
      { to: 3, label: 'dùng khi tranh chấp THẤP (không giữ lock, concurrency cao)' },
      { to: 3, label: 'tranh chấp cao → pessimistic (FOR UPDATE) tránh retry storm' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Không khoá, chỉ kiểm tra lúc ghi",
      code:
        "CREATE TABLE products (\n" +
        "  id      BIGINT PRIMARY KEY,\n" +
        "  stock   INT NOT NULL,\n" +
        "  version INT NOT NULL DEFAULT 0\n" +
        ");\n" +
        "\n" +
        "-- Đọc (KHÔNG khoá gì cả)\n" +
        "SELECT id, stock, version FROM products WHERE id = 1;   -- version = 5\n" +
        "\n" +
        "-- Ghi: chỉ thành công nếu version CHƯA ĐỔI\n" +
        "UPDATE products\n" +
        "SET stock = stock - 1, version = version + 1\n" +
        "WHERE id = 1 AND version = 5;\n" +
        "-- 0 dòng bị ảnh hưởng -> ai đó đã sửa trước -> ứng dụng ĐỌC LẠI và THỬ LẠI.\n" +
        "-- Kiểm tra số dòng ảnh hưởng là BẮT BUỘC, nếu không lỗi sẽ trôi qua im lặng.\n" +
        "\n" +
        "-- JPA làm việc này tự động với @Version -> ném OptimisticLockException.\n" +
        "\n" +
        "-- SO SÁNH VỚI PESSIMISTIC (FOR UPDATE):\n" +
        "--  OPTIMISTIC  — không khoá -> song song cao, không deadlock, không chờ.\n" +
        "--                Chi phí chỉ phát sinh KHI CÓ xung đột (phải thử lại).\n" +
        "--                Hợp khi xung đột HIẾM — tức là đa số trường hợp.\n" +
        "--                BẮT BUỘC cho giao dịch kéo dài qua nhiều request (người\n" +
        "--                dùng mở form sửa rồi lưu sau vài phút).\n" +
        "--  PESSIMISTIC — khoá ngay, người khác chờ. Hợp khi xung đột NHIỀU trên\n" +
        "--                cùng một hàng (retry liên tục còn tệ hơn chờ).\n" +
        "\n" +
        "-- Không muốn thêm cột version: dùng updated_at, hoặc so sánh chính giá trị cũ\n" +
        "UPDATE products SET stock = 9 WHERE id = 1 AND stock = 10;",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Long-running transaction — "đóng băng" khả năng dọn dẹp của cả DB',
    root: {
      label: 'Giữ transaction ngắn; tách công việc lớn thành nhiều transaction nhỏ (batch)',
      children: [
        { label: 'Giữ lock lâu → transaction khác chờ/deadlock' },
        { label: 'Postgres: chặn VACUUM dọn dead tuple', note: '→ bloat bảng/index toàn hệ thống + nguy cơ XID wraparound' },
        { label: 'MySQL: undo log phình (history list length tăng)' },
        { label: 'Replication lag: replica phải giữ snapshot tương ứng' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Một transaction quên đóng có thể làm hỏng cả database",
      code:
        "-- BỐN HẬU QUẢ:\n" +
        "-- 1) GIỮ KHOÁ -> mọi transaction khác cần khoá đó phải chờ. Và trong\n" +
        "--    Postgres, một DDL đang chờ sẽ chặn TOÀN BỘ truy vấn tới sau.\n" +
        "-- 2) CHẶN VACUUM: dead tuple mới hơn snapshot của nó không được dọn\n" +
        "--    -> bảng và index PHÌNH LÊN không kiểm soát.\n" +
        "-- 3) UNDO LOG / WAL tích tụ -> đầy đĩa.\n" +
        "-- 4) Nguy cơ transaction ID wraparound (Postgres).\n" +
        "\n" +
        "-- TÌM TRANSACTION DÀI:\n" +
        "SELECT pid, now() - xact_start AS thoi_gian, state, wait_event_type, query\n" +
        "FROM pg_stat_activity\n" +
        "WHERE state <> \u0027idle\u0027 AND xact_start IS NOT NULL\n" +
        "ORDER BY xact_start LIMIT 10;\n" +
        "\n" +
        "-- ĐẶC BIỆT NGUY HIỂM: \"idle in transaction\" — ứng dụng mở BEGIN rồi đi làm\n" +
        "-- việc khác (gọi API, chờ người dùng) mà không commit.\n" +
        "SELECT pid, now() - state_change AS idle_time, query\n" +
        "FROM pg_stat_activity WHERE state = \u0027idle in transaction\u0027\n" +
        "ORDER BY state_change;\n" +
        "\n" +
        "-- PHÒNG: đặt timeout ở cấp database, đừng trông chờ ứng dụng luôn đúng\n" +
        "ALTER DATABASE mydb SET idle_in_transaction_session_timeout = \u002760s\u0027;\n" +
        "ALTER DATABASE mydb SET statement_timeout = \u002730s\u0027;\n" +
        "ALTER DATABASE mydb SET lock_timeout = \u00275s\u0027;\n" +
        "\n" +
        "SELECT pg_terminate_backend(12345);    -- xử lý khẩn cấp\n" +
        "\n" +
        "-- NGUYÊN TẮC THIẾT KẾ: KHÔNG gọi API bên ngoài, không chờ người dùng,\n" +
        "-- không xử lý file trong khi transaction đang mở. Mở transaction MUỘN nhất\n" +
        "-- và đóng SỚM nhất có thể.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Autocommit / BEGIN-COMMIT / SAVEPOINT',
    root: {
      label: 'Từ "mỗi lệnh độc lập" tới "checkpoint trong transaction"',
      children: [
        { label: 'Autocommit (mặc định)', note: 'mỗi câu lệnh là một transaction tự commit ngay' },
        { label: 'Explicit', note: 'BEGIN → nhiều lệnh → COMMIT (áp dụng) / ROLLBACK (huỷ hết)' },
        { label: 'SAVEPOINT name + ROLLBACK TO SAVEPOINT', note: 'rollback MỘT PHẦN — "thử một bước, sai thì bỏ bước đó, đi tiếp"' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Ranh giới transaction và điểm quay lui",
      code:
        "-- AUTOCOMMIT (mặc định ở hầu hết client): MỖI câu lệnh là một transaction\n" +
        "-- riêng, tự commit ngay.\n" +
        "UPDATE accounts SET balance = 50 WHERE id = 1;   -- commit ngay lập tức\n" +
        "\n" +
        "-- Gom nhiều câu vào MỘT transaction:\n" +
        "BEGIN;                                  -- hoặc START TRANSACTION\n" +
        "  UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n" +
        "  UPDATE accounts SET balance = balance + 100 WHERE id = 2;\n" +
        "COMMIT;                                 -- hoặc ROLLBACK để huỷ tất cả\n" +
        "\n" +
        "-- SAVEPOINT — điểm quay lui BÊN TRONG transaction\n" +
        "BEGIN;\n" +
        "  INSERT INTO orders (id, amount) VALUES (1, 100);\n" +
        "  SAVEPOINT sp1;\n" +
        "  INSERT INTO order_lines (order_id, sku) VALUES (1, \u0027SKU-XX\u0027);   -- có thể lỗi\n" +
        "  ROLLBACK TO SAVEPOINT sp1;            -- huỷ RIÊNG phần sau sp1\n" +
        "  INSERT INTO order_lines (order_id, sku) VALUES (1, \u0027SKU-OK\u0027);\n" +
        "  RELEASE SAVEPOINT sp1;\n" +
        "COMMIT;                                 -- order và line hợp lệ đều được lưu\n" +
        "\n" +
        "-- LƯU Ý QUAN TRỌNG (Postgres): khi một câu lệnh LỖI, transaction chuyển\n" +
        "-- sang trạng thái ABORTED và MỌI câu sau đều lỗi\n" +
        "--   \"current transaction is aborted, commands ignored until end\"\n" +
        "-- -> SAVEPOINT là cách duy nhất để tiếp tục sau lỗi.\n" +
        "-- (Đây cũng là cơ chế Spring dùng cho @Transactional(propagation = NESTED).)\n" +
        "\n" +
        "-- CHI PHÍ: mỗi SAVEPOINT tốn tài nguyên; hàng nghìn savepoint trong một\n" +
        "-- transaction làm hiệu năng giảm rõ rệt. Dùng có chừng mực.\n" +
        "\n" +
        "-- Kiểm tra trạng thái hiện tại:\n" +
        "SELECT txid_current_if_assigned();",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Postgres Read Committed (default)', 'MySQL InnoDB Repeatable Read (default)'],
    rows: [
      ['Snapshot', 'per STATEMENT (mới nhất mỗi lệnh)', 'per TRANSACTION (cố định từ lệnh đọc đầu tiên)'],
      ['Hai SELECT trong một transaction', 'có thể thấy dữ liệu khác nhau', 'thấy như nhau'],
      ['Đánh đổi', 'đơn giản, ít abort — cẩn thận đọc-rồi-ghi', 'đọc nhất quán — dễ gặp serialization/lock conflict + gap lock'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Cùng tên, hành vi khác nhau",
      code:
        "-- POSTGRES — mặc định READ COMMITTED\n" +
        "--   Mỗi CÂU LỆNH lấy một snapshot MỚI -> hai SELECT trong cùng transaction\n" +
        "--   có thể ra kết quả khác nhau.\n" +
        "BEGIN;\n" +
        "  SELECT balance FROM accounts WHERE id = 1;   -- 100\n" +
        "  -- transaction khác commit balance = 50\n" +
        "  SELECT balance FROM accounts WHERE id = 1;   -- 50  (non-repeatable read)\n" +
        "COMMIT;\n" +
        "\n" +
        "-- POSTGRES — REPEATABLE READ\n" +
        "--   Snapshot lấy MỘT LẦN ở câu lệnh đầu tiên, giữ nguyên tới hết transaction.\n" +
        "--   Chặn luôn cả PHANTOM (mạnh hơn chuẩn SQL yêu cầu).\n" +
        "--   Nhưng: ghi vào hàng đã bị transaction khác sửa -> LỖI 40001\n" +
        "--   \"could not serialize access due to concurrent update\" -> phải RETRY.\n" +
        "BEGIN ISOLATION LEVEL REPEATABLE READ;\n" +
        "  SELECT balance FROM accounts WHERE id = 1;   -- 100\n" +
        "  SELECT balance FROM accounts WHERE id = 1;   -- vẫn 100\n" +
        "COMMIT;\n" +
        "\n" +
        "-- MYSQL/InnoDB — mặc định REPEATABLE READ, và hành vi KHÁC HẲN Postgres:\n" +
        "--  1) SELECT thường đọc từ snapshot (consistent read)\n" +
        "--  2) NHƯNG SELECT ... FOR UPDATE và UPDATE đọc bản MỚI NHẤT\n" +
        "--     -> có thể thấy dữ liệu mới hơn snapshot của chính mình (hơi bất ngờ)\n" +
        "--  3) Dùng GAP LOCK + NEXT-KEY LOCK để chặn phantom -> nhiều khoá hơn,\n" +
        "--     dễ deadlock hơn Postgres\n" +
        "--  4) MySQL KHÔNG ném lỗi serialization ở mức này; nó chờ khoá.\n" +
        "\n" +
        "-- HỆ QUẢ THỰC TẾ: code chuyển từ MySQL sang Postgres (hoặc ngược lại)\n" +
        "-- có thể đổi hành vi âm thầm. Luôn kiểm tra lại logic đồng thời khi đổi DB.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Postgres SSI (Serializable Snapshot Isolation)',
    nodes: ['chạy như snapshot isolation, KHÔNG lock đọc', 'theo dõi các phụ thuộc đọc-ghi giữa transaction đồng thời', 'phát hiện "dangerous structure" (kết quả không tuần tự hoá được)', 'abort một transaction: could not serialize access (40001)', 'ứng dụng RETRY'],
    steps: [
      { to: 3, label: 'bắt cả write skew — không cần SELECT ... FOR UPDATE thủ công' },
      { to: 4, label: 'đổi "viết lock thủ công cẩn thận" lấy "viết code retry"' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Serializable mà không cần khoá",
      code:
        "BEGIN ISOLATION LEVEL SERIALIZABLE;\n" +
        "  SELECT COUNT(*) FROM doctors WHERE on_call = true;   -- 2\n" +
        "  UPDATE doctors SET on_call = false WHERE id = 1;\n" +
        "COMMIT;\n" +
        "-- Nếu một transaction khác làm điều tương tự với bác sĩ 2, MỘT trong hai\n" +
        "-- sẽ bị huỷ:\n" +
        "--   ERROR: could not serialize access due to read/write dependencies\n" +
        "--   SQLSTATE 40001\n" +
        "\n" +
        "-- CƠ CHẾ: SSI KHÔNG khoá khi đọc. Nó THEO DÕI phụ thuộc đọc/ghi giữa các\n" +
        "-- transaction và tìm \"dangerous structure\" — mẫu phụ thuộc có thể dẫn tới\n" +
        "-- kết quả không tương đương với việc chạy TUẦN TỰ. Phát hiện được thì\n" +
        "-- huỷ một transaction.\n" +
        "-- -> Đây là mức cô lập DUY NHẤT chặn được WRITE SKEW mà không cần bạn\n" +
        "--    phải tự thêm khoá.\n" +
        "\n" +
        "-- CÁI GIÁ:\n" +
        "--  1) BẮT BUỘC phải có RETRY trong ứng dụng. Không retry thì hệ thống\n" +
        "--     thỉnh thoảng lỗi ngẫu nhiên dưới tải cao.\n" +
        "--  2) Tốn bộ nhớ để theo dõi (predicate lock).\n" +
        "--  3) Tỉ lệ huỷ tăng theo mức độ tranh chấp.\n" +
        "SHOW max_pred_locks_per_transaction;\n" +
        "\n" +
        "-- TỐI ƯU: khai báo transaction chỉ đọc -> SSI bỏ qua theo dõi, gần như\n" +
        "-- không tốn gì:\n" +
        "BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY DEFERRABLE;\n" +
        "\n" +
        "-- KHI NÀO DÙNG: logic nghiệp vụ có ràng buộc phức tạp giữa nhiều hàng\n" +
        "-- (đặt lịch, phân bổ tài nguyên, kế toán) mà việc phân tích từng anomaly\n" +
        "-- quá dễ sai. SSI cho bạn đảm bảo đúng đắn, đổi lại là retry.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Advisory lock — mutex phân tán "miễn phí" dùng Postgres làm coordinator',
    nodes: ['SELECT pg_try_advisory_lock(42) — khoá theo một khoá số bigint', 'pod nào lấy được → chạy migration', 'pod khác nhận false → bỏ qua', 'pg_advisory_unlock(42) khi xong (hoặc _xact_ tự nhả khi transaction kết thúc)'],
    steps: [
      { to: 0, label: 'không gắn với hàng/bảng nào — chỉ là tín hiệu "tôi đang giữ khoá K"' },
      { to: 3, label: 'dùng cho: đảm bảo một instance chạy cron/migration, serialize luồng xử lý — không cần bảng lock riêng' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Khoá do ứng dụng tự định nghĩa, không gắn với hàng nào",
      code:
        "-- Advisory lock không liên quan tới bảng/hàng nào. Nó chỉ là một con số\n" +
        "-- mà ứng dụng tự quy ước -> dùng để đồng bộ giữa các tiến trình.\n" +
        "\n" +
        "-- KHOÁ THEO PHIÊN — giữ tới khi nhả tay hoặc đóng kết nối\n" +
        "SELECT pg_advisory_lock(12345);\n" +
        "SELECT pg_try_advisory_lock(12345);      -- KHÔNG chờ, trả true/false ngay\n" +
        "SELECT pg_advisory_unlock(12345);\n" +
        "SELECT pg_advisory_unlock_all();\n" +
        "\n" +
        "-- KHOÁ THEO TRANSACTION — TỰ ĐỘNG nhả khi COMMIT/ROLLBACK.\n" +
        "-- An toàn hơn nhiều vì không bao giờ quên nhả:\n" +
        "BEGIN;\n" +
        "  SELECT pg_advisory_xact_lock(12345);\n" +
        "  -- làm việc...\n" +
        "COMMIT;                                   -- khoá tự nhả\n" +
        "\n" +
        "-- ỨNG DỤNG THỰC TẾ:\n" +
        "-- 1) Chỉ cho MỘT instance chạy job định kỳ (thay cho ShedLock/Quartz)\n" +
        "SELECT pg_try_advisory_lock(hashtext(\u0027daily-report-job\u0027));\n" +
        "-- false -> instance khác đang chạy -> bỏ qua lần này.\n" +
        "\n" +
        "-- 2) Khoá theo thực thể mà không cần khoá hàng (tránh chặn truy vấn khác)\n" +
        "SELECT pg_advisory_xact_lock(hashtext(\u0027order\u0027), order_id);   -- khoá hai phần\n" +
        "\n" +
        "-- 3) Chống chạy migration đồng thời từ nhiều pod khi khởi động.\n" +
        "\n" +
        "-- ƯU ĐIỂM so với khoá phân tán bằng Redis: nó dùng CHÍNH database đang có\n" +
        "-- (không thêm hạ tầng), và tự nhả khi kết nối đứt -> không kẹt vĩnh viễn.\n" +
        "SELECT * FROM pg_locks WHERE locktype = \u0027advisory\u0027;\n" +
        "\n" +
        "-- LƯU Ý: với PgBouncer ở chế độ transaction pooling, khoá theo PHIÊN không\n" +
        "-- dùng được (kết nối bị chia sẻ) -> chỉ dùng advisory_xact_lock.",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Gap lock', 'Next-key lock'],
    rows: [
      ['Khoá gì', 'khoảng (a, b) — không cho INSERT vào giữa', 'gap lock + record lock trên hàng — (a, b]'],
      ['Mục đích', 'ngăn phantom ở RR', 'ngăn phantom ở RR'],
      ['Hệ quả', 'SELECT ... BETWEEN 10 AND 20 FOR UPDATE có thể chặn INSERT x=15 dù hàng chưa tồn tại', 'nguồn deadlock/blocking "khó hiểu" khi lock một range dựa trên index'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Khoá cả khoảng trống để chặn phantom",
      code:
        "-- InnoDB ở REPEATABLE READ khoá không chỉ HÀNG mà cả KHOẢNG TRỐNG giữa\n" +
        "-- các hàng -> chặn INSERT vào khoảng đó -> không có phantom read.\n" +
        "\n" +
        "-- Bảng có id: 10, 20, 30\n" +
        "BEGIN;\n" +
        "SELECT * FROM t WHERE id BETWEEN 15 AND 25 FOR UPDATE;\n" +
        "-- Khoá: hàng 20 (record lock) + khoảng (10, 20) và (20, 30) (gap lock)\n" +
        "-- -> transaction khác KHÔNG chèn được id = 15, 18, 25 vào các khoảng đó.\n" +
        "-- NEXT-KEY LOCK = record lock + gap lock trước nó.\n" +
        "\n" +
        "-- HỆ QUẢ THỰC TẾ:\n" +
        "-- 1) Nhiều khoá hơn Postgres đáng kể -> DEADLOCK xảy ra thường xuyên hơn.\n" +
        "-- 2) Truy vấn KHÔNG DÙNG INDEX sẽ khoá... TOÀN BỘ BẢNG (vì phải quét hết\n" +
        "--    và khoá mọi khoảng). Đây là lý do index rất quan trọng với MySQL\n" +
        "--    không chỉ vì tốc độ mà còn vì mức độ khoá.\n" +
        "UPDATE t SET x = 1 WHERE non_indexed_col = 5;   -- khoá cả bảng!\n" +
        "\n" +
        "-- 3) INSERT vào khoảng đang bị khoá -> chờ, và dễ deadlock khi nhiều\n" +
        "--    tiến trình cùng chèn giá trị gần nhau.\n" +
        "\n" +
        "-- GIẢM KHOÁ:\n" +
        "SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;\n" +
        "-- READ COMMITTED TẮT gap lock (chỉ còn record lock) -> ít deadlock hơn nhiều.\n" +
        "-- Nhiều hệ thống MySQL tải cao chọn READ COMMITTED chính vì lý do này\n" +
        "-- (và vì nó giống hành vi mặc định của Postgres/Oracle).\n" +
        "\n" +
        "SHOW ENGINE INNODB STATUS;          -- xem khoá đang giữ và deadlock gần nhất\n" +
        "SELECT * FROM performance_schema.data_locks;",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Chuyển tiền an toàn — nguyên tử hoá "kiểm tra rồi trừ"',
    nodes: ['BEGIN', 'SELECT balance ... WHERE id IN (:from, :to) ORDER BY id FOR UPDATE', 'kiểm tra balance[from] >= amount', 'UPDATE ... balance - amount (from); balance + amount (to)', 'COMMIT'],
    steps: [
      { to: 1, label: 'ORDER BY id để tránh deadlock' },
      { to: 3, label: 'hoặc cách 2: UPDATE ... SET balance = balance - :amount WHERE id = :from AND balance >= :amount (0 hàng → không đủ tiền)' },
      { to: 4, label: 'kèm: idempotency key cho request; ghi bảng transactions (audit)' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Bài toán kinh điển, làm đúng từng bước",
      code:
        "-- CÁCH 1 (tốt nhất): cập nhật NGUYÊN TỬ, không cần đọc trước\n" +
        "BEGIN;\n" +
        "  UPDATE accounts SET balance = balance - 100\n" +
        "  WHERE id = 1 AND balance >= 100;               -- điều kiện nằm TRONG câu lệnh\n" +
        "  -- Kiểm tra số dòng ảnh hưởng: 0 -> không đủ tiền -> ROLLBACK\n" +
        "  UPDATE accounts SET balance = balance + 100 WHERE id = 2;\n" +
        "COMMIT;\n" +
        "-- Không có race condition vì DB tự khoá hàng khi UPDATE, và điều kiện\n" +
        "-- được đánh giá trên giá trị mới nhất.\n" +
        "\n" +
        "-- CÁCH 2: khoá bi quan khi cần tính toán phức tạp ở ứng dụng\n" +
        "BEGIN;\n" +
        "  SELECT id, balance FROM accounts WHERE id IN (1, 2)\n" +
        "  ORDER BY id FOR UPDATE;          -- ORDER BY id: THỨ TỰ NHẤT QUÁN -> chống deadlock\n" +
        "  -- tính phí, tỉ giá... ở phía ứng dụng\n" +
        "  UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n" +
        "  UPDATE accounts SET balance = balance + 100 WHERE id = 2;\n" +
        "COMMIT;\n" +
        "\n" +
        "-- LƯỚI AN TOÀN ở tầng schema — đừng chỉ tin vào code:\n" +
        "ALTER TABLE accounts ADD CONSTRAINT chk_balance CHECK (balance >= 0);\n" +
        "\n" +
        "-- GHI SỔ KÉP thay vì chỉ cập nhật số dư — chuẩn mực trong hệ thống tài chính:\n" +
        "CREATE TABLE ledger (\n" +
        "  id          BIGSERIAL PRIMARY KEY,\n" +
        "  transfer_id UUID NOT NULL,\n" +
        "  account_id  BIGINT NOT NULL,\n" +
        "  amount      NUMERIC(18,2) NOT NULL,        -- âm = ghi nợ, dương = ghi có\n" +
        "  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "-- Số dư = SUM(amount). Có LỊCH SỬ đầy đủ, đối soát được, không mất dấu vết.\n" +
        "-- Thêm UNIQUE (transfer_id, account_id) -> idempotent, chống ghi trùng khi retry.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Retry logic cho serialization failure / deadlock',
    nodes: ['DB abort với mã lỗi tạm thời (Postgres 40001/40P01, MySQL 1213)', 'rollback', 'sleep(backoff × 2^attempt + jitter)', 'retry từ đầu (tối đa maxRetries)', 'lỗi khác → rollback + raise'],
    steps: [
      { to: 3, label: 'isolation mạnh đẩy xử lý xung đột về ứng dụng dưới dạng "retry khi bị abort"' },
      { to: 3, label: 'work bên trong phải KHÔNG có side effect ngoài DB (hoặc idempotent) — nó chạy lại từ đầu' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bắt đúng mã lỗi và thử lại có backoff",
      code:
        "// Ở SERIALIZABLE hoặc REPEATABLE READ (Postgres), xung đột là chuyện BÌNH\n" +
        "// THƯỜNG, không phải bug. Ứng dụng BẮT BUỘC phải retry.\n" +
        "@Retryable(\n" +
        "    retryFor = { CannotSerializeTransactionException.class,   // SQLSTATE 40001\n" +
        "                 DeadlockLoserDataAccessException.class },    // SQLSTATE 40P01\n" +
        "    maxAttempts = 3,\n" +
        "    backoff = @Backoff(delay = 50, multiplier = 2, random = true))  // có jitter\n" +
        "@Transactional(isolation = Isolation.SERIALIZABLE)\n" +
        "public void transfer(long from, long to, BigDecimal amount) {\n" +
        "    accountRepo.debit(from, amount);\n" +
        "    accountRepo.credit(to, amount);\n" +
        "}\n" +
        "\n" +
        "@Recover\n" +
        "public void recover(DataAccessException e, long from, long to, BigDecimal amount) {\n" +
        "    log.error(\"chuyển tiền thất bại sau 3 lần thử\", e);\n" +
        "    throw new TransferFailedException(e);\n" +
        "}\n" +
        "\n" +
        "// BỐN NGUYÊN TẮC:\n" +
        "// 1) RETRY PHẢI BAO TRỌN CẢ TRANSACTION — mở transaction MỚI mỗi lần thử.\n" +
        "//    Retry bên trong transaction đã hỏng là vô nghĩa (Postgres đã abort nó).\n" +
        "//    -> Đặt @Retryable Ở NGOÀI @Transactional, đúng như thứ tự trên.\n" +
        "// 2) CÓ JITTER: nhiều client cùng retry đúng lúc -> lại đụng nhau.\n" +
        "// 3) GIỚI HẠN số lần thử và có nhánh xử lý thất bại cuối cùng.\n" +
        "// 4) CHỈ retry lỗi TẠM THỜI. Vi phạm ràng buộc (23505 unique violation)\n" +
        "//    thì retry bao nhiêu lần cũng lỗi.\n" +
        "\n" +
        "// MÃ LỖI CẦN NHỚ (SQLSTATE):\n" +
        "//   40001 — serialization failure       -> retry\n" +
        "//   40P01 — deadlock detected           -> retry\n" +
        "//   55P03 — lock not available          -> retry\n" +
        "//   23505 — unique violation            -> KHÔNG retry (trừ khi do race và\n" +
        "//                                          logic của bạn là upsert)",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Báo cáo nặng không ảnh hưởng OLTP — đẩy nó ra khỏi đường OLTP',
    root: {
      label: 'Report = đọc nhiều, chạy lâu, không cần realtime',
      children: [
        { label: 'SET TRANSACTION READ ONLY + Repeatable Read', note: 'snapshot nhất quán, DB biết không cần chuẩn bị cho ghi' },
        { label: 'Chạy trên read replica', note: 'tách hoàn toàn tải khỏi primary' },
        { label: 'Postgres: hot_standby_feedback / max_standby_streaming_delay', note: 'query dài trên replica có thể bị huỷ khi replica áp WAL' },
        { label: 'statement_timeout; nhu cầu lớn → ETL sang data warehouse (OLAP)' },
      ],
    },
  },
  demo: [
    {
      lang: "sql",
      title: "Tách tải phân tích khỏi tải giao dịch",
      code:
        "-- CÁCH 1: READ REPLICA — cách phổ biến và hiệu quả nhất\n" +
        "-- Trỏ mọi truy vấn báo cáo sang replica; OLTP không bị ảnh hưởng gì.\n" +
        "-- Đánh đổi: replica có ĐỘ TRỄ -> báo cáo có thể thiếu vài giây dữ liệu.\n" +
        "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;   -- trên replica\n" +
        "\n" +
        "-- CÁCH 2: GIỚI HẠN TÀI NGUYÊN cho phiên báo cáo\n" +
        "SET statement_timeout = \u00275min\u0027;\n" +
        "SET work_mem = \u0027256MB\u0027;                 -- báo cáo cần sắp xếp/băm nhiều\n" +
        "SET LOCAL synchronous_commit = off;\n" +
        "\n" +
        "-- CÁCH 3: MATERIALIZED VIEW — tính trước, đọc rất nhanh\n" +
        "CREATE MATERIALIZED VIEW mv_daily_revenue AS\n" +
        "SELECT DATE_TRUNC(\u0027day\u0027, created_at) AS ngay, SUM(amount) AS doanh_thu\n" +
        "FROM orders GROUP BY 1;\n" +
        "CREATE UNIQUE INDEX ON mv_daily_revenue (ngay);        -- cần cho CONCURRENTLY\n" +
        "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;   -- không khoá người đọc\n" +
        "\n" +
        "-- CÁCH 4: TRANSACTION CHỈ ĐỌC — báo cáo không giữ khoá ghi\n" +
        "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;\n" +
        "  -- ...\n" +
        "COMMIT;\n" +
        "-- Nhưng CẢNH BÁO: transaction dài vẫn CHẶN VACUUM trên master. Đây chính\n" +
        "-- là lý do nên đẩy báo cáo sang replica.\n" +
        "-- Trên replica, chỉnh hai tham số này để báo cáo dài không bị huỷ:\n" +
        "--   max_standby_streaming_delay = 300s\n" +
        "--   hot_standby_feedback = on   (đổi lại: replica lại chặn vacuum ở master)\n" +
        "\n" +
        "-- CÁCH 5: khi dữ liệu đủ lớn -> tách hẳn sang DATA WAREHOUSE (ClickHouse,\n" +
        "-- BigQuery, Redshift) qua CDC/ETL. OLTP và OLAP có mô hình lưu trữ khác\n" +
        "-- nhau về bản chất (hàng vs cột).",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Two-phase commit (2PC)', 'Saga / Outbox'],
    rows: [
      ['Cơ chế', 'coordinator: prepare? → commit', 'chuỗi transaction cục bộ + bước bù trừ'],
      ['Khi coordinator chết sau phase 1', 'participant KẸT ở "prepared" (giữ khoá) chờ vô hạn', 'không có coordinator kiểu đó'],
      ['Hiệu năng', 'kém (nhiều round-trip, khoá lâu)', 'tốt (eventual consistency)'],
      ['Hệ hiện đại', 'thường TRÁNH', 'chọn cái này + idempotency'],
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "2PC hoạt động thế nào và cái giá của nó",
      code:
        "-- Postgres có hỗ trợ 2PC:\n" +
        "BEGIN;\n" +
        "  UPDATE accounts SET balance = balance - 100 WHERE id = 1;\n" +
        "PREPARE TRANSACTION \u0027transfer-abc-123\u0027;   -- PHA 1: chuẩn bị, GIỮ KHOÁ, ghi bền\n" +
        "\n" +
        "-- Coordinator hỏi mọi bên; tất cả OK thì:\n" +
        "COMMIT PREPARED \u0027transfer-abc-123\u0027;       -- PHA 2: commit\n" +
        "-- ROLLBACK PREPARED \u0027transfer-abc-123\u0027;\n" +
        "\n" +
        "SELECT * FROM pg_prepared_xacts;          -- transaction đang treo ở pha 1\n" +
        "SHOW max_prepared_transactions;           -- mặc định 0 = TẮT\n" +
        "\n" +
        "-- VÌ SAO TRÁNH:\n" +
        "-- 1) COORDINATOR LÀ ĐIỂM LỖI: nó chết giữa hai pha -> transaction bị TREO,\n" +
        "--    GIỮ KHOÁ VÔ THỜI HẠN. Phải có người vào dọn tay.\n" +
        "--    Transaction prepared bị quên còn CHẶN VACUUM -> bloat và nguy cơ wraparound.\n" +
        "-- 2) KHOÁ suốt cả hai pha -> throughput thấp, độ trễ cao.\n" +
        "-- 3) Mọi bên tham gia phải hỗ trợ 2PC — nhiều API/dịch vụ hiện đại thì không.\n" +
        "-- 4) Không mở rộng được: càng nhiều bên, xác suất một bên chậm/chết càng cao.\n" +
        "\n" +
        "-- THAY THẾ THỰC DỤNG:\n" +
        "--  a) OUTBOX PATTERN — chỉ MỘT transaction database, sự kiện đẩy đi sau\n" +
        "CREATE TABLE outbox (\n" +
        "  id UUID PRIMARY KEY, aggregate_id TEXT, payload JSONB,\n" +
        "  created_at TIMESTAMPTZ DEFAULT now(), published_at TIMESTAMPTZ\n" +
        ");\n" +
        "--  b) SAGA — chuỗi transaction cục bộ + bước bù trừ\n" +
        "--  c) IDEMPOTENT + retry — đơn giản nhất và bền nhất trong thực tế",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Hàng đợi job trong SQL với FOR UPDATE SKIP LOCKED',
    nodes: ['nhiều worker cùng lấy job từ bảng jobs', 'SELECT ... FOR UPDATE (không SKIP) → worker XẾP HÀNG chờ nhau trên hàng đầu tiên', 'SKIP LOCKED: bỏ qua hàng đang khoá, lấy hàng KẾ TIẾP chưa khoá', 'mỗi worker lấy một lô riêng, không giẫm chân'],
    steps: [
      { to: 1, label: 'SELECT id FROM jobs WHERE status = "QUEUED" ORDER BY priority LIMIT 10 FOR UPDATE SKIP LOCKED' },
      { to: 3, label: 'kèm partial index WHERE status = "QUEUED" để quét nhanh' },
      { to: 3, label: 'worker chết → transaction rollback → job về QUEUED, worker khác lấy' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Dùng database làm hàng đợi, đúng cách",
      code:
        "CREATE TABLE jobs (\n" +
        "  id           BIGSERIAL PRIMARY KEY,\n" +
        "  payload      JSONB NOT NULL,\n" +
        "  status       TEXT NOT NULL DEFAULT \u0027PENDING\u0027,\n" +
        "  attempts     INT NOT NULL DEFAULT 0,\n" +
        "  run_after    TIMESTAMPTZ NOT NULL DEFAULT now(),\n" +
        "  locked_at    TIMESTAMPTZ,\n" +
        "  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()\n" +
        ");\n" +
        "-- Partial index: chỉ đánh index việc CHƯA làm -> index luôn nhỏ và nhanh\n" +
        "CREATE INDEX idx_jobs_pending ON jobs (run_after)\n" +
        "WHERE status = \u0027PENDING\u0027;\n" +
        "\n" +
        "-- LẤY VIỆC: SKIP LOCKED là mấu chốt — worker khác BỎ QUA hàng đang bị khoá\n" +
        "-- thay vì xếp hàng chờ.\n" +
        "BEGIN;\n" +
        "  SELECT id, payload FROM jobs\n" +
        "  WHERE status = \u0027PENDING\u0027 AND run_after <= now()\n" +
        "  ORDER BY run_after\n" +
        "  LIMIT 10\n" +
        "  FOR UPDATE SKIP LOCKED;                 -- N worker chạy song song không giẫm nhau\n" +
        "\n" +
        "  UPDATE jobs SET status = \u0027PROCESSING\u0027, locked_at = now(), attempts = attempts + 1\n" +
        "  WHERE id = ANY($1);\n" +
        "COMMIT;\n" +
        "\n" +
        "-- Gộp cả hai bước bằng CTE (một lần round-trip):\n" +
        "UPDATE jobs SET status = \u0027PROCESSING\u0027, locked_at = now()\n" +
        "WHERE id IN (\n" +
        "  SELECT id FROM jobs WHERE status = \u0027PENDING\u0027 AND run_after <= now()\n" +
        "  ORDER BY run_after LIMIT 10 FOR UPDATE SKIP LOCKED\n" +
        ") RETURNING id, payload;\n" +
        "\n" +
        "-- THU HỒI việc treo (worker chết giữa chừng):\n" +
        "UPDATE jobs SET status = \u0027PENDING\u0027\n" +
        "WHERE status = \u0027PROCESSING\u0027 AND locked_at < now() - INTERVAL \u00275 minutes\u0027;\n" +
        "\n" +
        "-- KHI NÀO ĐỦ DÙNG: dưới vài nghìn job/giây, và bạn muốn job nằm CÙNG\n" +
        "-- transaction với dữ liệu nghiệp vụ (không có dual-write).\n" +
        "-- KHI NÀO CẦN MQ THẬT: throughput rất cao, fanout, retention dài, hoặc\n" +
        "-- nhiều consumer group độc lập.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'VACUUM + transaction ID wraparound (Postgres)',
    nodes: ['MVCC tạo dead tuple + đánh dấu version bằng XID 32-bit', 'XID quay vòng sau ~4 tỉ transaction', 'không FREEZE hàng cũ kịp → dữ liệu quá cũ bị coi là "tương lai"', 'mất dữ liệu / DB DỪNG để tự bảo vệ'],
    steps: [
      { to: 1, label: 'VACUUM (autovacuum): dọn dead tuple + cập nhật visibility map + FREEZE hàng cũ' },
      { to: 3, label: 'transaction dài + autovacuum tụt hậu = nguyên nhân chính; theo dõi age(datfrozenxid)' },
    ],
  },
  demo: [
    {
      lang: "sql",
      title: "Dọn dead tuple và một sự cố có thể làm dừng database",
      code:
        "-- MVCC để lại DEAD TUPLE sau mỗi UPDATE/DELETE. VACUUM dọn chúng.\n" +
        "VACUUM orders;                    -- dọn, KHÔNG khoá bảng, KHÔNG trả đĩa về OS\n" +
        "VACUUM ANALYZE orders;            -- dọn + cập nhật statistics\n" +
        "VACUUM FULL orders;               -- viết lại bảng, TRẢ đĩa về OS,\n" +
        "                                  -- nhưng KHOÁ ACCESS EXCLUSIVE -> chỉ làm\n" +
        "                                  -- trong cửa sổ bảo trì. Cân nhắc pg_repack.\n" +
        "\n" +
        "SELECT relname, n_dead_tup, n_live_tup, last_autovacuum, last_autoanalyze\n" +
        "FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;\n" +
        "\n" +
        "-- TRANSACTION ID WRAPAROUND:\n" +
        "-- Postgres dùng transaction id 32 BIT (~4 tỉ). Khi cạn, id quay vòng và\n" +
        "-- transaction CŨ sẽ trông như đến từ TƯƠNG LAI -> dữ liệu cũ \"biến mất\".\n" +
        "-- Để ngăn điều đó, VACUUM \"đóng băng\" (freeze) các hàng đủ cũ.\n" +
        "SELECT datname, age(datfrozenxid) AS tuoi FROM pg_database ORDER BY 2 DESC;\n" +
        "-- autovacuum_freeze_max_age mặc định 200 triệu -> autovacuum khẩn cấp chạy.\n" +
        "-- Tới ~1 tỉ: Postgres CẢNH BÁO liên tục.\n" +
        "-- Tới ~2 tỉ: Postgres TỪ CHỐI MỌI GHI để tự bảo vệ -> database dừng hoạt động.\n" +
        "\n" +
        "-- NGUYÊN NHÂN GỐC thường là: transaction chạy lâu, replication slot bị bỏ\n" +
        "-- quên, hoặc prepared transaction treo — tất cả đều CHẶN việc freeze.\n" +
        "SELECT slot_name, active, age(xmin) FROM pg_replication_slots;\n" +
        "SELECT * FROM pg_prepared_xacts;\n" +
        "SELECT pid, age(backend_xmin), query FROM pg_stat_activity\n" +
        "ORDER BY age(backend_xmin) DESC NULLS LAST LIMIT 5;\n" +
        "\n" +
        "-- PHÒNG: theo dõi age(datfrozenxid), dọn replication slot không dùng,\n" +
        "-- đặt idle_in_transaction_session_timeout, và chỉnh autovacuum cho bảng nóng.\n" +
        "ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05);",
    },
  ],
},
]);
