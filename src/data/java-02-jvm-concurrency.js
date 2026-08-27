SS.addQuestions('java', [
{
  cat: 'JVM & Memory',
  q: 'JVM có những vùng bộ nhớ nào (runtime data areas)?',
  answer:
    '- **Heap**: nơi chứa mọi object và mảng, chia sẻ giữa các thread, do GC quản lý. Gồm Young (Eden + 2 Survivor) và Old gen.\n' +
    '- **Stack** (mỗi thread một cái): các stack frame cho method đang chạy — biến cục bộ, tham số, địa chỉ trả về. `StackOverflowError` khi tràn.\n' +
    '- **Metaspace** (thay PermGen từ Java 8): metadata class, nằm ở native memory, tự co giãn.\n' +
    '- **PC Register**: con trỏ lệnh của mỗi thread.\n' +
    '- **Native Method Stack**: cho method JNI.\n\n' +
    'String pool nằm trong heap (từ Java 7). Biến static và class object nằm ở Metaspace/heap.',
  essence:
    'Chia theo tiêu chí chia sẻ: heap và metaspace dùng chung toàn JVM; stack, PC, native stack là riêng từng thread. Object luôn ở heap, tham chiếu tới nó có thể nằm ở stack.',
  example:
    'Tinh chỉnh container: `-Xms512m -Xmx512m` cố định heap tránh resize; `-XX:MaxMetaspaceSize=256m` chặn class loader rò rỉ làm phình native memory; số thread cao thì mỗi thread ~512KB–1MB stack (`-Xss`) cần tính vào RAM pod.',
},
{
  cat: 'JVM & Memory',
  q: 'Stack và heap khác nhau thế nào về vòng đời và tốc độ?',
  answer:
    '**Stack**: cấp phát/thu hồi theo LIFO khi vào/ra method — cực nhanh, không cần GC. Kích thước nhỏ, cố định. Chứa primitive cục bộ và **reference** tới object.\n\n' +
    '**Heap**: cấp phát động khi `new`, sống đến khi không còn reference nào tới và GC thu hồi. Lớn, linh hoạt, truy cập chậm hơn và có chi phí GC.\n\n' +
    'Một object luôn nằm trên heap (trừ khi JIT làm **escape analysis** và scalar-replace nó trên stack). Biến `int i` trong method nằm trên stack; `Integer i` là reference trên stack trỏ tới object trên heap.',
  essence:
    'Stack = bộ nhớ tạm bám theo lời gọi method, tự dọn. Heap = bộ nhớ chia sẻ cho dữ liệu sống lâu, GC dọn. Escape analysis là cầu nối tối ưu.',
  example:
    'Vòng lặp nóng tạo `new Point(x,y)` chỉ dùng trong method: JIT phát hiện `Point` "không thoát" khỏi method → cấp phát các field trực tiếp trên stack, loại bỏ áp lực GC. Đây là lý do đừng vội cache object nhỏ thủ công.',
},
{
  cat: 'JVM & Memory',
  q: 'Garbage Collection hoạt động thế nào? Generational GC là gì?',
  answer:
    'GC xác định object "rác" bằng **reachability**: bắt đầu từ GC roots (biến static, biến cục bộ trên stack, JNI ref…), object nào không đến được coi là rác.\n\n' +
    '**Giả thuyết thế hệ**: phần lớn object chết trẻ. Nên heap chia Young và Old:\n' +
    '- Object mới vào **Eden**. Eden đầy → **Minor GC**: copy object còn sống sang Survivor, phần còn lại xoá nhanh.\n' +
    '- Sống qua nhiều lần → thăng cấp lên **Old**. Old đầy → **Major/Full GC** (chậm, thường stop-the-world lâu hơn).\n\n' +
    'Nhờ đó đa số lần GC chỉ quét vùng Young nhỏ → nhanh.',
  essence:
    'GC không đếm reference mà truy vết từ root. Chia thế hệ để tận dụng việc "object chết trẻ": quét vùng nhỏ thường xuyên, quét vùng lớn hiếm khi.',
  example:
    'Service tạo nhiều DTO ngắn hạn cho mỗi request: chúng sinh-diệt trong Young, Minor GC dọn sạch với pause vài ms. Nếu vô tình giữ chúng trong một `static List` (cache sai), chúng thăng lên Old → Full GC dài, p99 latency tăng vọt.',
},
{
  cat: 'JVM & Memory',
  q: 'Các GC collector phổ biến (Serial, Parallel, G1, ZGC) — chọn khi nào?',
  answer:
    '- **Serial GC**: một thread, stop-the-world. Phù hợp app nhỏ, heap < ~100MB, môi trường 1 CPU.\n' +
    '- **Parallel GC** (throughput): nhiều thread GC, tối ưu tổng thông lượng, pause có thể dài. Tốt cho batch job.\n' +
    '- **G1 GC** (mặc định từ Java 9): chia heap thành region, thu gom tăng dần, nhắm mục tiêu pause (`-XX:MaxGCPauseMillis`). Cân bằng cho hầu hết service.\n' +
    '- **ZGC / Shenandoah**: pause < 1ms gần như không phụ thuộc kích thước heap (heap hàng chục–trăm GB), concurrent gần hết. Cho ứng dụng nhạy latency, heap lớn.',
  essence:
    'Đánh đổi throughput ↔ latency ↔ footprint. Parallel tối đa throughput; G1 cân bằng; ZGC tối thiểu pause. Chọn theo SLA độ trễ và kích thước heap.',
  example:
    'API tài chính p99 < 50ms, heap 32GB: chuyển từ G1 sang ZGC (`-XX:+UseZGC`) loại bỏ các pause 200–500ms lúc Full GC. Ngược lại, job ETL chạy đêm thì Parallel GC xử lý xong nhanh hơn.',
},
{
  cat: 'JVM & Memory',
  q: 'Có GC rồi vẫn bị memory leak — vì sao? Các dạng thường gặp?',
  answer:
    'GC chỉ thu hồi object **không còn reachable**. Leak trong Java = giữ reference tới object không còn cần → GC không dám xoá.\n\n' +
    'Các dạng kinh điển:\n' +
    '- Collection static/singleton chỉ add mà không remove (cache không giới hạn).\n' +
    '- Listener/callback đăng ký mà không huỷ đăng ký.\n' +
    '- `ThreadLocal` không `remove()` trong thread pool.\n' +
    '- Key trong `HashMap` là object có `equals/hashCode` sai hoặc mutable.\n' +
    '- `ClassLoader` leak (redeploy web app) giữ cả class + static.\n' +
    '- Inner class không static giữ tham chiếu ngầm tới outer.',
  essence:
    'Leak trong ngôn ngữ có GC là "leak logic": reference còn sống nhưng ý nghĩa nghiệp vụ đã chết. Phát hiện bằng heap dump + phân tích dominator tree.',
  example:
    'Một `@Component` giữ `Map<String, Session>` để "tối ưu", session hết hạn nhưng không bị xoá khỏi map. Sau vài ngày Old gen đầy → Full GC liên tục → OOM. Sửa: dùng `Caffeine`/`Guava Cache` có TTL + max size, hoặc `WeakHashMap` khi phù hợp.',
},
{
  cat: 'JVM & Memory',
  q: 'Phân biệt các loại `OutOfMemoryError`.',
  answer:
    '- **Java heap space**: heap thật sự đầy (leak, cache lớn, hoặc `-Xmx` quá nhỏ so với tải).\n' +
    '- **GC overhead limit exceeded**: JVM dành > 98% thời gian cho GC mà thu lại < 2% heap — dấu hiệu sắp hết heap.\n' +
    '- **Metaspace**: quá nhiều class được nạp (leak class loader, sinh proxy/CGLIB động vô hạn).\n' +
    '- **unable to create new native thread**: chạm giới hạn thread của OS hoặc hết native memory (mỗi thread tốn stack riêng).\n' +
    '- **Direct buffer memory**: `ByteBuffer.allocateDirect` / Netty vượt `-XX:MaxDirectMemorySize`.',
  essence:
    'OOM không chỉ là "hết heap". Mỗi loại chỉ tới một vùng bộ nhớ hoặc tài nguyên OS khác nhau — đọc đúng message để tìm đúng nguyên nhân.',
  example:
    '"unable to create native thread" trên pod có `-Xmx` cao: heap chiếm gần hết RAM container, không còn chỗ cho thread stack. Giảm `-Xmx` hoặc dùng thread pool giới hạn thay vì tạo thread không kiểm soát.',
},
{
  cat: 'Concurrency',
  q: 'Vòng đời của một Thread? `start()` khác `run()` thế nào?',
  answer:
    'Trạng thái: `NEW` → `RUNNABLE` (đang chạy hoặc sẵn sàng) → `BLOCKED` (chờ monitor lock) / `WAITING` / `TIMED_WAITING` (chờ `wait`, `join`, `sleep`, `park`) → `TERMINATED`.\n\n' +
    '`start()`: yêu cầu JVM tạo một **thread OS mới** và chạy `run()` trên đó. Gọi `start()` hai lần → `IllegalThreadStateException`.\n\n' +
    '`run()`: chỉ là một method thường. Gọi trực tiếp `run()` sẽ chạy **trên thread hiện tại**, không có song song.',
  essence:
    '`start()` mới tạo luồng thực thi mới; `run()` chỉ là nội dung công việc. Nhầm hai cái là mất toàn bộ tính đồng thời.',
  example:
    '`new Thread(task).run()` trong code review là red flag: toàn bộ task chạy tuần tự trên thread gọi. Đúng phải `.start()`, hoặc tốt hơn là submit vào `ExecutorService`.',
},
{
  cat: 'Concurrency',
  q: '`Runnable`, `Callable` và `Future` khác nhau ra sao?',
  answer:
    '`Runnable`: `void run()`, không trả về, không ném checked exception.\n\n' +
    '`Callable<V>`: `V call() throws Exception`, trả về kết quả và cho phép ném checked exception.\n\n' +
    '`Future<V>`: tay cầm cho kết quả bất đồng bộ — `get()` (blocking, có timeout), `isDone()`, `cancel()`. Khi submit `Callable` vào `ExecutorService` bạn nhận `Future`.\n\n' +
    '`CompletableFuture<V>` (Java 8): `Future` có khả năng compose (`thenApply`, `thenCompose`, `thenCombine`) và xử lý lỗi phi blocking.',
  essence:
    'Runnable = "làm việc này". Callable = "làm việc này và trả kết quả (có thể lỗi)". Future = "chỗ nhận kết quả sau này".',
  example:
    '`Future<Report> f = executor.submit(() -> buildReport(id));` rồi làm việc khác, sau đó `f.get(5, SECONDS)` để lấy report hoặc timeout. Nếu cần ghép nhiều lời gọi service song song thì `CompletableFuture.allOf(...)`.',
},
{
  cat: 'Concurrency',
  q: '`synchronized` hoạt động thế nào? Object lock vs class lock, reentrancy?',
  answer:
    '`synchronized` dùng **monitor** gắn với một object. Chỉ một thread giữ monitor tại một thời điểm; thread khác vào `BLOCKED`.\n\n' +
    '- `synchronized method` (instance) → khoá trên `this`.\n' +
    '- `synchronized static method` → khoá trên `Class` object → khác lock với instance.\n' +
    '- `synchronized(obj) { }` → khoá tường minh trên `obj`.\n\n' +
    'Là **reentrant**: thread đang giữ lock có thể vào lại block/synchronized method khác cùng lock mà không tự deadlock. Vào/ra `synchronized` tạo quan hệ happens-before → đảm bảo cả visibility lẫn atomicity của vùng bảo vệ.',
  essence:
    'Khoá là trên object, không phải trên đoạn code. Muốn loại trừ lẫn nhau, các thread phải đồng bộ trên **cùng một** object.',
  example:
    'Hai method `synchronized` khoá `this` sẽ loại trừ nhau. Nhưng nếu một cái là `static synchronized`, nó khoá `Class` → hai method chạy song song, dữ liệu chung vẫn bị race. Lỗi hay gặp khi mix static/instance.',
},
{
  cat: 'Concurrency',
  q: '`volatile` đảm bảo gì và KHÔNG đảm bảo gì?',
  answer:
    '`volatile` đảm bảo:\n' +
    '- **Visibility**: ghi vào biến volatile được flush về main memory ngay, đọc luôn lấy giá trị mới nhất (không đọc từ cache/register của thread).\n' +
    '- **Ordering**: chặn reorder quanh biến volatile (memory barrier); mọi ghi trước điểm ghi volatile hiển thị cho thread đọc volatile đó (happens-before).\n\n' +
    'KHÔNG đảm bảo **atomicity của thao tác kép**: `count++` là read-modify-write, hai thread vẫn ghi đè nhau.',
  essence:
    '`volatile` là cơ chế visibility/ordering nhẹ, không phải khoá. Dùng cho cờ trạng thái và mẫu publish an toàn, không dùng cho bộ đếm.',
  example:
    '`private volatile boolean running = true;` cho vòng lặp worker để thread khác `running = false` dừng nó — không cần lock. Nhưng `volatile long counter; counter++` dưới tải cao sẽ mất số đếm; phải dùng `AtomicLong` hoặc `LongAdder`.',
},
{
  cat: 'Concurrency',
  q: 'Java Memory Model và quan hệ happens-before là gì?',
  answer:
    'JMM định nghĩa khi nào một ghi của thread này **chắc chắn nhìn thấy** bởi thread khác. Không có quan hệ happens-before thì compiler/CPU được tự do reorder và cache → thread khác có thể thấy giá trị cũ.\n\n' +
    'Các quy tắc happens-before chính:\n' +
    '- Trong một thread: theo thứ tự chương trình.\n' +
    '- Mở khoá `synchronized` HB với lần khoá sau đó trên cùng monitor.\n' +
    '- Ghi `volatile` HB với đọc `volatile` sau đó.\n' +
    '- `Thread.start()` HB với mọi hành động trong thread con; mọi hành động trong thread HB với `join()` trả về.\n' +
    '- Khởi tạo `final` field HB với việc đọc reference object đã khởi tạo xong.',
  essence:
    'Happens-before là "hợp đồng nhìn thấy" giữa các thread. Không nằm trong chuỗi HB nào thì mọi giả định về thứ tự/giá trị đều không an toàn.',
  example:
    'Mẫu sai: thread A set `config` rồi set `ready=true` (không volatile); thread B thấy `ready==true` nhưng vẫn đọc `config==null` do reorder/visibility. Sửa: khai báo `ready` là `volatile` → tạo HB, B thấy cả `config` đã gán.',
},
{
  cat: 'Concurrency',
  q: 'Vì sao `wait()`/`notify()` phải gọi trong khối `synchronized`? Vì sao dùng `while` chứ không `if`?',
  answer:
    '`wait()`/`notify()` thao tác trên monitor của object, nên thread gọi **phải đang giữ** monitor đó — nếu không sẽ `IllegalMonitorStateException`. `wait()` nhả monitor và chờ; khi được `notify` nó phải **giành lại** monitor mới chạy tiếp.\n\n' +
    'Phải kiểm tra điều kiện bằng `while` chứ không `if` vì:\n' +
    '- **Spurious wakeup**: thread có thể tỉnh dậy dù không ai notify.\n' +
    '- Sau khi tỉnh, thread khác có thể đã "cướp" điều kiện trước khi mình chạy.\n' +
    'Nên: `while (!condition) lock.wait();` để kiểm tra lại điều kiện sau khi tỉnh.',
  essence:
    'wait/notify là giao thức trên monitor; giữ lock là điều kiện tiên quyết. `while` bảo vệ trước wakeup giả và race giành điều kiện.',
  example:
    'Bounded buffer: producer `while (buffer.isFull()) notFull.wait();` rồi thêm phần tử và `notEmpty.notifyAll()`. Dùng `if` thay `while` → khi hai consumer cùng tỉnh, cái thứ hai lấy từ buffer rỗng → lỗi. Thực tế nên dùng `BlockingQueue` có sẵn.',
},
{
  cat: 'Concurrency',
  q: 'Deadlock: 4 điều kiện cần và cách phòng tránh?',
  answer:
    'Deadlock xảy ra khi đủ 4 điều kiện Coffman: **mutual exclusion**, **hold and wait**, **no preemption**, **circular wait**.\n\n' +
    'Phòng tránh (phá vỡ một điều kiện):\n' +
    '- **Thứ tự khoá toàn cục**: luôn lấy các lock theo cùng một thứ tự (ví dụ theo id tăng dần).\n' +
    '- **Lock timeout**: `tryLock(timeout)` rồi nhả và thử lại nếu không lấy đủ.\n' +
    '- **Giảm phạm vi lock**, tránh gọi code lạ khi đang giữ lock.\n' +
    '- Dùng cấu trúc lock-free / `java.util.concurrent` thay khoá thủ công.',
  essence:
    'Deadlock cần vòng chờ vòng tròn. Áp một thứ tự tổng lên việc lấy khoá là cách phổ biến và hiệu quả nhất để loại bỏ vòng đó.',
  example:
    'Chuyển tiền giữa 2 tài khoản: `transfer(a,b)` khoá `a` rồi `b`; `transfer(b,a)` khoá `b` rồi `a` → deadlock. Sửa: sắp xếp theo `accountId`, luôn khoá id nhỏ trước. Phát hiện lúc chạy bằng `jstack` (tìm "Found one Java-level deadlock").',
},
{
  cat: 'Concurrency',
  q: '`ThreadLocal` dùng để làm gì? Vì sao dễ rò rỉ bộ nhớ với thread pool?',
  answer:
    '`ThreadLocal<T>` cho mỗi thread một bản sao biến riêng, truy cập không cần đồng bộ. Dùng để mang context xuyên suốt lời gọi mà không truyền tham số: user hiện tại (Spring Security), transaction/EntityManager, `SimpleDateFormat` (không thread-safe), traceId.\n\n' +
    'Rủi ro: giá trị lưu trong `Thread.threadLocals` (map với key là WeakReference tới ThreadLocal, **value là strong reference**). Thread trong pool **sống mãi**, nếu không `remove()` thì value không bao giờ bị dọn → leak, và request sau có thể **đọc nhầm** context của request trước.',
  essence:
    'ThreadLocal gắn dữ liệu vào vòng đời của thread. Trong pool, thread không chết nên bạn phải tự xoá — thường trong `finally`.',
  example:
    'Filter đặt `UserContext.set(user)` đầu request; nếu quên `UserContext.remove()` trong `finally`, request kế tiếp trên cùng thread pool có thể thấy user cũ → lỗ hổng bảo mật. Spring `RequestContextHolder` cũng dọn theo cơ chế này.',
},
{
  cat: 'Concurrency',
  q: 'Thread pool (`ThreadPoolExecutor`): các tham số và rejection policy?',
  answer:
    'Tham số cốt lõi: `corePoolSize`, `maximumPoolSize`, `keepAliveTime`, `workQueue`, `threadFactory`, `handler`.\n\n' +
    'Luồng xử lý task mới: nếu < core → tạo thread; nếu ≥ core → **vào queue**; queue đầy → tạo thread tới max; vượt max → **rejection**.\n\n' +
    'Rejection policy: `AbortPolicy` (ném `RejectedExecutionException` — mặc định), `CallerRunsPolicy` (caller tự chạy → tạo backpressure), `DiscardPolicy`, `DiscardOldestPolicy`.\n\n' +
    'Cạm bẫy: `Executors.newFixedThreadPool` dùng queue **không giới hạn** → task dồn vô hạn, OOM thay vì reject.',
  essence:
    'Hành vi phụ thuộc chủ yếu vào loại queue. Queue unbounded khiến maxPoolSize và rejection trở nên vô nghĩa. Tự tạo `ThreadPoolExecutor` với bounded queue để kiểm soát.',
  example:
    'Service gọi downstream: `new ThreadPoolExecutor(10, 20, 60s, new ArrayBlockingQueue<>(200), new CallerRunsPolicy())`. Khi downstream chậm, queue đầy → caller tự chạy → tự động giảm tốc nhận request thay vì sập.',
},
{
  cat: 'Concurrency',
  q: 'Cách chọn kích thước thread pool cho tác vụ CPU-bound và IO-bound?',
  answer:
    '**CPU-bound** (tính toán thuần): số thread ≈ số nhân (`Runtime.getRuntime().availableProcessors()`), hoặc +1 để bù cache miss. Thêm thread chỉ tăng context switch, không tăng thông lượng.\n\n' +
    '**IO-bound** (chờ DB, HTTP): thread dành phần lớn thời gian chờ, nên cần nhiều hơn. Công thức Little: `threads ≈ cores × (1 + waitTime/computeTime)`. Nếu 90% thời gian là chờ, có thể cần gấp 10 lần số nhân.\n\n' +
    'Thực tế: đo bằng load test, giới hạn theo tài nguyên downstream (connection pool DB thường là trần thật sự).',
  essence:
    'CPU-bound bị giới hạn bởi số nhân. IO-bound bị giới hạn bởi tài nguyên phía sau (pool DB, rate limit API), không phải bởi CPU.',
  example:
    'Pool xử lý ảnh (resize) đặt = số vCPU của pod (ví dụ 4). Pool gọi API đối tác (mỗi call ~200ms chờ) đặt ~40, nhưng chặn ở HikariCP `maximumPoolSize=20` để không làm quá tải DB.',
},
{
  cat: 'Concurrency',
  q: '`CompletableFuture`: compose, combine và xử lý exception thế nào?',
  answer:
    'Tạo: `supplyAsync(() -> ..., executor)`.\n\n' +
    '- `thenApply(fn)`: biến đổi kết quả (đồng bộ trên thread hoàn thành).\n' +
    '- `thenCompose(fn)`: nối một future khác (tránh `CompletableFuture<CompletableFuture<T>>` — giống flatMap).\n' +
    '- `thenCombine(other, bi)`: gộp kết quả hai future độc lập.\n' +
    '- `allOf` / `anyOf`: chờ tất cả / cái đầu tiên.\n\n' +
    'Lỗi: `exceptionally(ex -> fallback)`, `handle((res, ex) -> ...)`, `whenComplete`. Exception được bọc trong `CompletionException`. Luôn truyền `Executor` riêng, đừng để đầy common ForkJoinPool.',
  essence:
    '`CompletableFuture` là pipeline bất đồng bộ khai báo: `thenCompose` cho phụ thuộc tuần tự, `thenCombine`/`allOf` cho song song, `handle/exceptionally` cho lỗi — tất cả không blocking.',
  example:
    'Trang chi tiết đơn hàng cần user + inventory + pricing từ 3 service: `allOf(fUser, fInv, fPrice).thenApply(v -> assemble(fUser.join(), fInv.join(), fPrice.join()))`. Ba call chạy song song, tổng thời gian ≈ call chậm nhất thay vì tổng ba call.',
},
{
  cat: 'Concurrency',
  q: 'CAS là gì? `AtomicInteger` hoạt động thế nào và ABA problem?',
  answer:
    '**CAS (Compare-And-Swap)**: lệnh CPU nguyên tử — "nếu ô nhớ đang là giá trị kỳ vọng thì đặt giá trị mới, trả về thành công/thất bại". Là nền tảng đồng bộ **lock-free**.\n\n' +
    '`AtomicInteger.incrementAndGet()` = vòng lặp: đọc giá trị `v`, tính `v+1`, CAS(`v`, `v+1`); nếu thất bại (thread khác vừa đổi) thì đọc lại và thử lại (spin).\n\n' +
    '**ABA**: giá trị đổi A→B→A; CAS thấy "vẫn là A" nên tưởng không có gì thay đổi. Khắc phục bằng `AtomicStampedReference` (kèm version/stamp).',
  essence:
    'CAS thay khoá bằng "thử và lặp lại": không thread nào bị chặn, nhưng tranh chấp cao thì tốn CPU vì spin. ABA là bẫy khi chỉ so sánh giá trị mà không so sánh lịch sử.',
  example:
    'Bộ đếm request dưới tải cao: `LongAdder` (chia ô đếm theo thread rồi cộng khi đọc) nhanh hơn `AtomicLong` vì giảm tranh chấp CAS. ABA quan trọng khi làm lock-free stack/queue với con trỏ node được tái sử dụng.',
},
{
  cat: 'Concurrency',
  q: '`Thread.sleep()` và `Object.wait()` khác nhau thế nào?',
  answer:
    '`Thread.sleep(ms)`: method static, tạm dừng thread **hiện tại**, **không nhả** monitor nào đang giữ. Dùng để trì hoãn theo thời gian.\n\n' +
    '`obj.wait()`: method của `Object`, phải gọi khi **đang giữ monitor của `obj`**; nó **nhả** monitor đó và chờ tới khi `obj.notify()/notifyAll()` (hoặc timeout, hoặc spurious wakeup). Dùng để phối hợp giữa các thread theo điều kiện.\n\n' +
    'Cả hai đều ném `InterruptedException` khi bị `interrupt()`.',
  essence:
    '`sleep` là "nghỉ theo đồng hồ, vẫn ôm khoá". `wait` là "nghỉ theo tín hiệu, nhả khoá cho thread khác vào thay đổi điều kiện".',
  example:
    'Polling ngây thơ: `while(!ready) Thread.sleep(100)` lãng phí CPU và trễ. Phối hợp đúng: consumer `synchronized(lock){ while(queue.isEmpty()) lock.wait(); }`, producer `synchronized(lock){ queue.add(x); lock.notifyAll(); }` — hoặc dùng `BlockingQueue`.',
},
{
  cat: 'Concurrency',
  q: '`ReentrantLock` khác `synchronized` ở điểm nào?',
  answer:
    '`ReentrantLock` (explicit lock) cho thêm:\n' +
    '- `tryLock()` / `tryLock(timeout)`: không chờ vô hạn → tránh deadlock.\n' +
    '- `lockInterruptibly()`: có thể huỷ khi chờ.\n' +
    '- **Fairness** tuỳ chọn (FIFO) thay vì tranh chấp tự do.\n' +
    '- Nhiều `Condition` trên một lock (`newCondition()`) — như nhiều hàng đợi wait/notify.\n\n' +
    'Đổi lại phải `unlock()` trong `finally` thủ công. `synchronized` gọn hơn, tự nhả khi rời block, JIT tối ưu tốt (biased/lightweight locking), và hiện tại hiệu năng tương đương trong đa số trường hợp.',
  essence:
    '`synchronized` = khoá nội tại đơn giản, an toàn khi thoát. `ReentrantLock` = khoá linh hoạt (timeout, interrupt, fairness, nhiều condition) đổi lấy trách nhiệm tự quản lý.',
  example:
    'Xử lý job cần "thử lấy lock trong 100ms, không được thì bỏ qua vòng này": chỉ `ReentrantLock.tryLock(100, MILLIS)` làm được. Nếu chỉ cần loại trừ lẫn nhau đơn giản, `synchronized` là đủ và rõ ràng hơn.',
},
]);
