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
  viz: {
    type: 'quadrant',
    title: 'Vùng bộ nhớ JVM',
    x: ['riêng mỗi thread', 'chia sẻ toàn JVM'],
    y: ['không do GC', 'do GC quản lý'],
    items: [
      { label: 'Heap', qx: 1, qy: 1 },
      { label: 'Metaspace', qx: 1, qy: 0 },
      { label: 'Stack', qx: 0, qy: 0, jy: -1 },
      { label: 'PC Register', qx: 0, qy: 0, jy: 1 },
      { label: 'Native Method Stack', qx: 0, qy: 0, jx: 1, jy: 0 },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Mỗi biến trong đoạn này nằm ở vùng nhớ nào",
      code:
        "public class Demo {                 // metadata của class -> Metaspace (ngoài heap)\n" +
        "    static int counter = 0;         // biến static -> vùng static của Metaspace\n" +
        "    private String name;            // field của instance -> nằm cùng object trên HEAP\n" +
        "\n" +
        "    void run(int n) {               // n là tham số -> STACK của thread đang chạy\n" +
        "        int local = n * 2;          // primitive local -> STACK\n" +
        "        String s = new String(\"x\"); // biến s (tham chiếu) -> STACK\n" +
        "                                    // object String thật sự -> HEAP\n" +
        "        byte[] buf = new byte[1024];// mảng luôn nằm trên HEAP\n" +
        "    }\n" +
        "}\n" +
        "// Mỗi thread có STACK riêng (không chia sẻ) + PC register riêng.\n" +
        "// HEAP và Metaspace dùng chung cho MỌI thread -> đây chính là nơi\n" +
        "// phát sinh mọi vấn đề đồng bộ hoá.",
    },
    {
      lang: "bash",
      title: "Xem và giới hạn từng vùng",
      code:
        "# Xem toàn bộ tham số bộ nhớ JVM đang dùng thực tế\n" +
        "java -XX:+PrintFlagsFinal -version | grep -iE \"heapsize|metaspace|threadstack\"\n" +
        "\n" +
        "java -Xms512m -Xmx512m \\          # heap: min = max để tránh co giãn lúc chạy\n" +
        "     -XX:MaxMetaspaceSize=256m \\  # Metaspace: mặc định KHÔNG giới hạn -> nên chặn\n" +
        "     -Xss512k \\                   # stack mỗi thread (nhiều thread thì giảm xuống)\n" +
        "     -jar app.jar\n" +
        "\n" +
        "# Trong container: để JVM tự tính heap theo memory limit của container\n" +
        "java -XX:MaxRAMPercentage=75.0 -jar app.jar",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Stack', 'Heap'],
    rows: [
      ['Cấp phát / thu hồi', 'LIFO khi vào / ra method — tự dọn', 'động khi new — GC dọn'],
      ['Tốc độ', 'cực nhanh', 'chậm hơn + chi phí GC'],
      ['Kích thước', 'nhỏ, cố định (-Xss)', 'lớn, linh hoạt (-Xmx)'],
      ['Chứa gì', 'primitive cục bộ + reference', 'object và mảng'],
      ['Phạm vi', 'riêng mỗi thread', 'chia sẻ giữa các thread'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Vòng đời khác nhau tạo ra hai loại lỗi khác nhau",
      code:
        "// STACK: cấp phát/thu hồi theo frame, tự động, cực nhanh, không cần GC\n" +
        "void recurse(int n) {\n" +
        "    long[] frameLocal = new long[0];   // biến tham chiếu ở stack\n" +
        "    recurse(n + 1);                    // mỗi lần gọi đẩy thêm 1 frame\n" +
        "}\n" +
        "// -> StackOverflowError: stack của MỘT thread đầy (mặc định ~512KB–1MB)\n" +
        "\n" +
        "// HEAP: cấp phát khi new, thu hồi bởi GC, chậm hơn, dùng chung mọi thread\n" +
        "List<byte[]> keep = new ArrayList<>();\n" +
        "while (true) keep.add(new byte[1_000_000]);   // giữ tham chiếu -> GC không dọn được\n" +
        "// -> OutOfMemoryError: Java heap space\n" +
        "\n" +
        "// Vì sao stack nhanh hơn: chỉ cần dịch con trỏ stack pointer lên/xuống.\n" +
        "// Heap phải tìm chỗ trống, quản lý phân mảnh, rồi GC còn phải quét lại.\n" +
        "// Escape analysis: nếu JIT chứng minh object không \"thoát\" khỏi method,\n" +
        "// nó có thể cấp phát thẳng trên stack (scalar replacement) -> khỏi GC.",
    },
  ],
},
{
  cat: 'JVM & Memory',
  diagram: 'gc-generational',
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
  demo: [
    {
      lang: "java",
      title: "Reachability, generational và cách quan sát GC",
      code:
        "// GC KHÔNG đếm tham chiếu, mà đi từ GC Roots (biến static, biến local trên\n" +
        "// stack, JNI...) tìm mọi object CÒN VỚI TỚI ĐƯỢC. Phần còn lại là rác.\n" +
        "Object a = new Object();\n" +
        "a = null;              // không còn đường đi từ GC Root -> đủ điều kiện thu hồi\n" +
        "System.gc();           // chỉ là GỢI Ý, JVM có quyền phớt lờ. Đừng dùng trong prod.\n" +
        "\n" +
        "// Giả thuyết thế hệ (weak generational hypothesis):\n" +
        "//   \"hầu hết object chết rất trẻ\" -> chia heap thành Young và Old\n" +
        "//   Young (Eden + 2 Survivor): Minor GC chạy thường xuyên, rất nhanh,\n" +
        "//     chỉ copy phần SỐNG sang Survivor -> chi phí tỉ lệ với object sống, không phải rác\n" +
        "//   Object sống sót đủ số lần (MaxTenuringThreshold) -> promote sang Old\n" +
        "//   Old: Major/Full GC, hiếm hơn nhưng đắt hơn nhiều",
    },
    {
      lang: "bash",
      title: "Đọc log GC để biết có vấn đề hay không",
      code:
        "# Bật log GC (Java 9+, thay cho -XX:+PrintGCDetails cũ)\n" +
        "java -Xlog:gc*:file=gc.log:time,uptime -jar app.jar\n" +
        "\n" +
        "# Dấu hiệu XẤU cần tìm trong log:\n" +
        "#   - Full GC lặp lại liên tục mà heap sau GC gần như không giảm -> sắp OOM / leak\n" +
        "#   - pause time > SLA của bạn                                   -> đổi collector\n" +
        "#   - promotion cao bất thường                                   -> Young quá nhỏ\n" +
        "jcmd <pid> GC.heap_info          # xem nhanh tình trạng heap đang chạy\n" +
        "jcmd <pid> GC.class_histogram    # class nào đang chiếm nhiều bộ nhớ nhất",
    },
  ],
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
  viz: {
    type: 'bars',
    title: 'Pause điển hình (log scale, càng ngắn càng tốt)',
    unit: 'ms',
    scale: 'log',
    items: [
      { label: 'Parallel', value: 300, note: 'tối đa throughput, pause dài — hợp batch job' },
      { label: 'Serial', value: 120, note: '1 thread, stop-the-world — app nhỏ, 1 CPU' },
      { label: 'G1 (mặc định)', value: 50, note: 'chia region, nhắm MaxGCPauseMillis — cân bằng' },
      { label: 'ZGC / Shenandoah', value: 1, note: 'gần như concurrent, pause < 1ms bất kể heap lớn' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Chọn collector theo mục tiêu, không theo \"cái nào mới nhất\"",
      code:
        "# Serial — 1 thread, STW dài. Chỉ hợp heap nhỏ (< 100MB), CLI, container tí hon\n" +
        "java -XX:+UseSerialGC -jar app.jar\n" +
        "\n" +
        "# Parallel — nhiều thread, tối ưu THROUGHPUT, chấp nhận pause dài.\n" +
        "# Hợp batch job: tổng thời gian chạy quan trọng hơn độ trễ từng request\n" +
        "java -XX:+UseParallelGC -XX:ParallelGCThreads=4 -jar app.jar\n" +
        "\n" +
        "# G1 — MẶC ĐỊNH từ Java 9. Chia heap thành region, thu region nhiều rác trước\n" +
        "# (\"garbage first\"). Cân bằng, có thể đặt mục tiêu pause:\n" +
        "java -XX:+UseG1GC -XX:MaxGCPauseMillis=200 -Xmx8g -jar app.jar\n" +
        "\n" +
        "# ZGC — pause dưới 1ms gần như không phụ thuộc kích thước heap (hàng TB).\n" +
        "# Đổi lại: tốn CPU và RAM hơn. Hợp dịch vụ nhạy độ trễ, heap lớn\n" +
        "java -XX:+UseZGC -Xmx32g -jar app.jar\n" +
        "\n" +
        "# Quy tắc chọn: heap < 4GB và không nhạy trễ -> cứ để G1 mặc định.\n" +
        "# Chỉ đổi collector khi ĐÃ ĐO được pause là nút thắt thật sự.",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Các dạng leak dù có GC',
    root: {
      label: 'Giữ reference tới object không còn cần',
      children: [
        { label: 'Collection static / singleton chỉ add', note: 'cache không giới hạn' },
        { label: 'Listener / callback không huỷ đăng ký' },
        { label: 'ThreadLocal không remove() trong pool' },
        { label: 'Key HashMap mutable hoặc equals/hashCode sai' },
        { label: 'ClassLoader leak khi redeploy', note: 'giữ cả class + static' },
        { label: 'Inner class không static', note: 'giữ tham chiếu ngầm tới outer' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Bốn dạng leak hay gặp nhất và cách sửa",
      code:
        "// 1) Collection static phình mãi — GC Root giữ vĩnh viễn\n" +
        "static final Map<String, Session> CACHE = new HashMap<>();   // không bao giờ dọn\n" +
        "static final Map<String, Session> OK =\n" +
        "        Caffeine.newBuilder().maximumSize(10_000)\n" +
        "                .expireAfterAccess(Duration.ofMinutes(30)).build().asMap();\n" +
        "\n" +
        "// 2) Listener/callback đăng ký mà không huỷ đăng ký\n" +
        "bus.register(this);          // nếu quên bus.unregister(this) -> object sống mãi\n" +
        "\n" +
        "// 3) Inner class không static giữ tham chiếu ngầm tới outer\n" +
        "class Outer {\n" +
        "    class Inner {}                  // Inner GIỮ tham chiếu Outer.this -> outer không chết\n" +
        "    static class SafeInner {}       // static thì không giữ -> ưu tiên dùng\n" +
        "}\n" +
        "\n" +
        "// 4) ThreadLocal trong thread pool (xem câu về ThreadLocal)\n" +
        "private static final ThreadLocal<Ctx> CTX = new ThreadLocal<>();\n" +
        "try {\n" +
        "    CTX.set(ctx);\n" +
        "    handle();\n" +
        "} finally {\n" +
        "    CTX.remove();               // BẮT BUỘC, vì thread được tái sử dụng\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Quy trình chẩn đoán leak",
      code:
        "# 1) Xác nhận là leak: heap sau mỗi Full GC vẫn tăng dần theo thời gian\n" +
        "jstat -gcutil <pid> 5s\n" +
        "\n" +
        "# 2) Xem class nào phình\n" +
        "jcmd <pid> GC.class_histogram | head -20\n" +
        "\n" +
        "# 3) Chụp heap dump rồi mở bằng Eclipse MAT / VisualVM\n" +
        "jcmd <pid> GC.heap_dump /tmp/heap.hprof\n" +
        "# Trong MAT: dùng \"Leak Suspects\" rồi xem \"Path to GC Roots\" của object nghi ngờ\n" +
        "# -> chính cái path đó chỉ ra AI đang giữ tham chiếu\n" +
        "\n" +
        "# 4) Tự động dump khi OOM (nên bật sẵn ở production)\n" +
        "java -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/var/log/heap.hprof -jar app.jar",
    },
  ],
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
  viz: {
    type: 'tree',
    title: 'Mỗi loại OOM trỏ tới một vùng khác nhau',
    root: {
      label: 'OutOfMemoryError',
      children: [
        { label: 'Java heap space', note: 'heap đầy: leak, cache lớn, hoặc -Xmx quá nhỏ' },
        { label: 'GC overhead limit exceeded', note: '> 98% thời gian cho GC, thu lại < 2% heap' },
        { label: 'Metaspace', note: 'quá nhiều class: leak class loader, proxy/CGLIB động' },
        { label: 'unable to create new native thread', note: 'chạm giới hạn thread OS / hết native memory' },
        { label: 'Direct buffer memory', note: 'allocateDirect / Netty vượt MaxDirectMemorySize' },
      ],
    },
  },
  demo: [
    {
      lang: "bash",
      title: "Mỗi thông báo OOM chỉ về một nguyên nhân khác nhau",
      code:
        "# \"Java heap space\" -> object sống quá nhiều: leak, cache không giới hạn,\n" +
        "# hoặc heap thật sự thiếu. Sửa: tìm leak trước, tăng -Xmx sau.\n" +
        "\n" +
        "# \"GC overhead limit exceeded\" -> tốn > 98% thời gian cho GC mà thu < 2% heap.\n" +
        "# Bản chất vẫn là heap space, chỉ là JVM chết sớm hơn để báo cho bạn biết.\n" +
        "\n" +
        "# \"Metaspace\" -> nạp quá nhiều class: sinh proxy/class động, redeploy nhiều lần,\n" +
        "# classloader bị giữ lại. Tăng -XX:MaxMetaspaceSize chỉ là hoãn, phải tìm nguồn.\n" +
        "\n" +
        "# \"unable to create new native thread\" -> chạm giới hạn thread của OS.\n" +
        "# KHÔNG phải do heap. Thường là tạo thread thủ công thay vì dùng pool.\n" +
        "ulimit -u                        # xem giới hạn process/thread của user\n" +
        "\n" +
        "# \"Direct buffer memory\" -> ByteBuffer.allocateDirect() ngoài heap (Netty, NIO)\n" +
        "java -XX:MaxDirectMemorySize=512m -jar app.jar\n" +
        "\n" +
        "# \"Requested array size exceeds VM limit\" -> xin mảng gần Integer.MAX_VALUE",
    },
  ],
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
  viz: {
    type: 'states',
    title: 'Vòng đời Thread',
    states: ['NEW', 'RUNNABLE', 'WAITING', 'TERMINATED'],
    start: 0,
    transitions: [
      { from: 0, to: 1, label: 'start()' },
      { from: 1, to: 2, label: 'wait / join / sleep / park' },
      { from: 2, to: 1, label: 'notify / hết timeout' },
      { from: 1, to: 3, label: 'run() kết thúc' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "start() vs run() và 6 trạng thái",
      code:
        "Thread t = new Thread(() -> System.out.println(Thread.currentThread().getName()));\n" +
        "\n" +
        "t.run();     // SAI: gọi như method thường -> chạy trên thread HIỆN TẠI, in \"main\"\n" +
        "t.start();   // ĐÚNG: xin OS tạo thread mới -> in \"Thread-0\"\n" +
        "\n" +
        "t.start();   // gọi start() lần thứ hai -> IllegalThreadStateException\n" +
        "             // Thread là đối tượng dùng MỘT LẦN, không tái khởi động được\n" +
        "\n" +
        "// 6 trạng thái trong enum Thread.State:\n" +
        "//   NEW            đã new, chưa start()\n" +
        "//   RUNNABLE       đang chạy HOẶC sẵn sàng chạy, chờ CPU xếp lịch\n" +
        "//   BLOCKED        đang chờ lấy monitor lock để vào khối synchronized\n" +
        "//   WAITING        wait() / join() / LockSupport.park() — chờ vô thời hạn\n" +
        "//   TIMED_WAITING  sleep(n) / wait(n) / join(n) — chờ có hạn\n" +
        "//   TERMINATED     đã chạy xong hoặc chết vì exception\n" +
        "System.out.println(t.getState());\n" +
        "\n" +
        "// Java 21: virtual thread — rẻ tới mức tạo hàng triệu cái được\n" +
        "Thread v = Thread.ofVirtual().start(() -> blockingIoCall());",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Runnable', 'Callable<V>', 'Future<V>'],
    rows: [
      ['Chữ ký', 'void run()', 'V call() throws Exception', '—'],
      ['Trả về', 'không', 'có kết quả V', 'get() lấy kết quả sau'],
      ['Ném checked exception', 'không', 'có', 'get() ném ExecutionException'],
      ['Vai trò', 'làm việc này', 'làm việc này + trả kết quả', 'tay cầm cho kết quả async'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba mảnh ghép của một tác vụ bất đồng bộ",
      code:
        "ExecutorService pool = Executors.newFixedThreadPool(4);\n" +
        "\n" +
        "// Runnable: không trả về gì, KHÔNG ném checked exception được\n" +
        "Runnable r = () -> log.info(\"chạy xong\");\n" +
        "pool.submit(r);\n" +
        "\n" +
        "// Callable: TRẢ VỀ giá trị và được phép ném checked exception\n" +
        "Callable<Integer> c = () -> {\n" +
        "    Thread.sleep(100);          // InterruptedException là checked -> Runnable không cho\n" +
        "    return 42;\n" +
        "};\n" +
        "\n" +
        "// Future: tay cầm để lấy kết quả sau\n" +
        "Future<Integer> f = pool.submit(c);\n" +
        "Integer v = f.get();            // CHẶN cho tới khi xong -> mất hết tính bất đồng bộ\n" +
        "Integer v2 = f.get(2, TimeUnit.SECONDS);   // luôn ưu tiên bản có timeout\n" +
        "f.cancel(true);                 // true = cho phép interrupt thread đang chạy\n" +
        "\n" +
        "// Exception trong task KHÔNG mất, nó được bọc lại và ném ra ở get():\n" +
        "try {\n" +
        "    f.get();\n" +
        "} catch (ExecutionException e) {\n" +
        "    Throwable real = e.getCause();   // lỗi thật nằm trong cause\n" +
        "}\n" +
        "// Hạn chế của Future: không compose được, không callback -> dùng CompletableFuture",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['synchronized method (instance)', 'static synchronized', 'synchronized(obj)'],
    rows: [
      ['Khoá trên', 'this', 'Class object', 'obj tường minh'],
      ['Loại trừ nhau với', 'method instance khác cùng this', 'static method khác', 'ai khoá cùng obj'],
      ['Lưu ý', 'reentrant', 'khác lock với instance method', 'kiểm soát hạt khoá'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Object lock, class lock và tính reentrant",
      code:
        "class Counter {\n" +
        "    private int value;\n" +
        "    private final Object lock = new Object();    // khoá riêng: an toàn hơn khoá this\n" +
        "\n" +
        "    // Khoá trên INSTANCE (this) — hai object khác nhau không chặn nhau\n" +
        "    public synchronized void inc() { value++; }\n" +
        "\n" +
        "    // Khoá trên CLASS (Counter.class) — dùng chung cho MỌI instance\n" +
        "    public static synchronized void resetAll() { }\n" +
        "\n" +
        "    // Khối synchronized: giữ khoá ngắn nhất có thể -> ít tranh chấp hơn\n" +
        "    public void incBlock() {\n" +
        "        prepare();                       // phần không cần khoá thì để ngoài\n" +
        "        synchronized (lock) {\n" +
        "            value++;                     // chỉ bọc đúng phần dùng chung\n" +
        "        }\n" +
        "    }\n" +
        "\n" +
        "    // REENTRANT: thread đang giữ khoá gọi tiếp method synchronized khác\n" +
        "    // của cùng object thì KHÔNG tự khoá chính mình (JVM đếm số lần vào)\n" +
        "    public synchronized void a() { b(); }\n" +
        "    public synchronized void b() { }\n" +
        "}\n" +
        "// synchronized đảm bảo CẢ HAI: loại trừ lẫn nhau + hiển thị bộ nhớ\n" +
        "// (vào khối = đọc mới từ main memory, ra khối = ghi hết xuống main memory).",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['volatile ĐẢM BẢO', 'volatile KHÔNG đảm bảo'],
    rows: [
      ['Visibility', 'ghi flush ngay, đọc lấy giá trị mới nhất', '—'],
      ['Ordering', 'chặn reorder quanh biến (memory barrier)', '—'],
      ['Atomicity thao tác kép', '—', 'count++ (read-modify-write) vẫn race'],
      ['Dùng cho', 'cờ trạng thái, publish an toàn', 'bộ đếm → dùng AtomicLong / LongAdder'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "volatile giải quyết hiển thị, KHÔNG giải quyết nguyên tử",
      code:
        "class Worker {\n" +
        "    private volatile boolean running = true;   // ĐÚNG chỗ dùng volatile\n" +
        "\n" +
        "    void run() {\n" +
        "        while (running) { doWork(); }\n" +
        "        // Không có volatile, JIT được phép cache `running` vào thanh ghi\n" +
        "        // -> vòng lặp không bao giờ thấy giá trị mới -> treo vĩnh viễn\n" +
        "    }\n" +
        "    void stop() { running = false; }           // thread khác gọi\n" +
        "}\n" +
        "\n" +
        "class Broken {\n" +
        "    private volatile int count;\n" +
        "    void inc() { count++; }     // SAI: count++ là 3 lệnh (đọc, cộng, ghi)\n" +
        "}                               // volatile không làm chuỗi đó thành nguyên tử\n" +
        "\n" +
        "// Đúng: dùng atomic hoặc khoá\n" +
        "AtomicInteger ok = new AtomicInteger();\n" +
        "ok.incrementAndGet();\n" +
        "\n" +
        "// volatile đảm bảo:  hiển thị (ghi xong là mọi thread thấy) + cấm sắp xếp lại lệnh\n" +
        "// volatile KHÔNG đảm bảo: nguyên tử của chuỗi đọc-sửa-ghi",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Không happens-before', 'Có happens-before (volatile / synchronized / start-join / final)'],
    rows: [
      ['Compiler / CPU', 'tự do reorder + cache', 'chặn reorder tại điểm đồng bộ'],
      ['Thread khác thấy', 'có thể là giá trị cũ', 'chắc chắn thấy mọi ghi trước điểm đó'],
      ['Ví dụ ready+config', 'B thấy ready=true nhưng config=null', 'ready volatile → B thấy config đã gán'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Các cặp happens-before dùng nhiều nhất",
      code:
        "// JMM không nói \"khi nào ghi xuống RAM\", nó nói: nếu A happens-before B\n" +
        "// thì B CHẮC CHẮN thấy mọi thứ A đã làm. Không có quan hệ đó -> không bảo đảm gì.\n" +
        "\n" +
        "// 1) Mở khoá happens-before lần khoá kế tiếp trên CÙNG monitor\n" +
        "synchronized (lock) { shared = 1; }      // ghi\n" +
        "synchronized (lock) { read(shared); }    // thread khác chắc chắn thấy 1\n" +
        "\n" +
        "// 2) Ghi volatile happens-before mọi lần đọc volatile đó sau này\n" +
        "volatile boolean ready;\n" +
        "data = compute();  ready = true;         // thread A: data ghi TRƯỚC ready\n" +
        "if (ready) use(data);                    // thread B: thấy ready -> chắc chắn thấy data\n" +
        "\n" +
        "// 3) Thread.start() happens-before mọi thứ trong thread mới\n" +
        "config = load();  new Thread(this::run).start();   // run() chắc chắn thấy config\n" +
        "\n" +
        "// 4) Mọi thứ trong thread happens-before join() trả về\n" +
        "t.join();  read(result);                 // chắc chắn thấy kết quả t đã ghi\n" +
        "\n" +
        "// 5) Ghi field final trong constructor happens-before object được công bố\n" +
        "// -> đây là lý do object immutable an toàn khi chia sẻ mà không cần đồng bộ",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'wait() trong vòng while',
    nodes: ['giữ monitor', 'while điều kiện', 'wait()', 'được notify', 'giành lại lock', 'kiểm tra lại'],
    steps: [
      { to: 0, label: 'phải đang giữ monitor của obj, nếu không → IllegalMonitorStateException' },
      { to: 2, label: 'điều kiện chưa thoả → wait(): nhả monitor cho thread khác' },
      { to: 3, label: 'thread khác notify()/notifyAll() (hoặc spurious wakeup)' },
      { to: 4, label: 'phải giành lại monitor mới chạy tiếp' },
      { to: 5, label: 'quay lại while: kiểm tra lại vì có thể bị "cướp" điều kiện hoặc wakeup giả' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Vì sao phải while, và vì sao nên bỏ hẳn wait/notify",
      code:
        "class Queue<T> {\n" +
        "    private final LinkedList<T> items = new LinkedList<>();\n" +
        "    private final int max = 10;\n" +
        "\n" +
        "    public synchronized void put(T x) throws InterruptedException {\n" +
        "        // BẮT BUỘC while, KHÔNG được dùng if:\n" +
        "        //  - spurious wakeup: JVM cho phép wait() tự tỉnh không lý do\n" +
        "        //  - notifyAll() đánh thức nhiều thread, chỉ 1 thread thắng khoá,\n" +
        "        //    các thread còn lại tỉnh dậy khi điều kiện đã sai trở lại\n" +
        "        while (items.size() == max) {\n" +
        "            wait();          // NHẢ khoá rồi mới ngủ -> nếu không giữ khoá:\n" +
        "        }                    // IllegalMonitorStateException\n" +
        "        items.add(x);\n" +
        "        notifyAll();         // đánh thức cả consumer lẫn producer đang chờ\n" +
        "    }\n" +
        "\n" +
        "    public synchronized T take() throws InterruptedException {\n" +
        "        while (items.isEmpty()) wait();\n" +
        "        T x = items.removeFirst();\n" +
        "        notifyAll();\n" +
        "        return x;\n" +
        "    }\n" +
        "}\n" +
        "// Phải giữ khoá vì \"kiểm tra điều kiện\" và \"đi ngủ\" bắt buộc phải nguyên tử —\n" +
        "// nếu không, notify() có thể chen vào đúng giữa hai bước -> ngủ quên mãi mãi.\n" +
        "\n" +
        "// THỰC TẾ: đừng viết tay như trên, dùng sẵn có:\n" +
        "BlockingQueue<T> q = new ArrayBlockingQueue<>(10);\n" +
        "q.put(x);   q.take();",
    },
  ],
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
  viz: {
    type: 'cycle',
    title: 'Circular wait — vòng chờ tròn',
    steps: [
      { label: 'T1 khoá A', note: 'transfer(a, b): giữ lock A' },
      { label: 'T1 chờ B', note: 'nhưng B đang bị T2 giữ' },
      { label: 'T2 khoá B', note: 'transfer(b, a): giữ lock B' },
      { label: 'T2 chờ A', note: 'nhưng A đang bị T1 giữ → deadlock. Phá vòng: luôn khoá theo id tăng dần' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Tạo deadlock, rồi phá nó bằng thứ tự khoá cố định",
      code:
        "// 4 điều kiện phải ĐỒNG THỜI đúng: loại trừ lẫn nhau, giữ-và-chờ,\n" +
        "// không giành lại được, và chờ vòng tròn. Phá 1 trong 4 là hết deadlock.\n" +
        "\n" +
        "// DEADLOCK: hai thread khoá hai object theo thứ tự NGƯỢC nhau\n" +
        "void transferBad(Account a, Account b, long amount) {\n" +
        "    synchronized (a) {              // T1: khoá A rồi chờ B\n" +
        "        synchronized (b) {          // T2: khoá B rồi chờ A  -> chờ vòng tròn\n" +
        "            a.debit(amount); b.credit(amount);\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// CÁCH 1 (tốt nhất): áp một THỨ TỰ TOÀN CỤC -> phá \"chờ vòng tròn\"\n" +
        "void transferOk(Account a, Account b, long amount) {\n" +
        "    Account first  = a.id() < b.id() ? a : b;    // luôn khoá id nhỏ trước\n" +
        "    Account second = a.id() < b.id() ? b : a;\n" +
        "    synchronized (first) {\n" +
        "        synchronized (second) { a.debit(amount); b.credit(amount); }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// CÁCH 2: khoá có timeout -> phá \"giữ-và-chờ\"\n" +
        "if (lockA.tryLock(1, TimeUnit.SECONDS)) {\n" +
        "    try {\n" +
        "        if (lockB.tryLock(1, TimeUnit.SECONDS)) { }\n" +
        "    } finally { lockA.unlock(); }     // nhả hết rồi thử lại sau\n" +
        "}",
    },
    {
      lang: "bash",
      title: "Phát hiện deadlock trên hệ thống đang chạy",
      code:
        "jstack <pid> | grep -A 20 \"Found one Java-level deadlock\"\n" +
        "# jstack in thẳng ra chu trình chờ: thread nào giữ khoá nào, đang chờ khoá nào\n" +
        "jcmd <pid> Thread.print",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'Vì sao ThreadLocal rò rỉ trong thread pool',
    nodes: ['set(user)', 'xử lý request', 'quên remove()', 'trả về pool', 'request sau', 'đọc nhầm user'],
    steps: [
      { to: 1, label: 'đầu request đặt context vào Thread.threadLocals (value là strong ref)' },
      { to: 2, label: 'controller/service đọc context không cần truyền tham số' },
      { to: 3, label: 'nếu không remove() trong finally…' },
      { to: 4, label: 'thread pool không huỷ thread → value không bao giờ bị dọn (leak)' },
      { to: 5, label: 'request kế tiếp chạy trên đúng thread đó' },
      { to: 5, label: 'thấy user của request trước → lỗ hổng bảo mật' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Vì sao thread pool biến ThreadLocal thành nguồn rò rỉ",
      code:
        "// Dùng đúng: mang context theo suốt một request mà không phải truyền tham số\n" +
        "public class RequestContext {\n" +
        "    private static final ThreadLocal<String> TRACE_ID = new ThreadLocal<>();\n" +
        "\n" +
        "    public static void set(String id) { TRACE_ID.set(id); }\n" +
        "    public static String get()        { return TRACE_ID.get(); }\n" +
        "    public static void clear()        { TRACE_ID.remove(); }   // mấu chốt\n" +
        "}\n" +
        "\n" +
        "// Trong filter/interceptor: LUÔN dọn trong finally\n" +
        "try {\n" +
        "    RequestContext.set(traceId);\n" +
        "    chain.doFilter(req, res);\n" +
        "} finally {\n" +
        "    RequestContext.clear();     // thiếu dòng này là rò rỉ + rò rỉ DỮ LIỆU\n" +
        "}\n" +
        "\n" +
        "// Vì sao rò rỉ: mỗi Thread có một ThreadLocalMap, key là WeakReference tới\n" +
        "// ThreadLocal nhưng VALUE là strong reference. Thread trong pool sống mãi\n" +
        "// -> value sống mãi theo. Tệ hơn: request sau dùng lại thread đó và ĐỌC ĐƯỢC\n" +
        "// dữ liệu của request trước (lộ thông tin người dùng khác).\n" +
        "\n" +
        "// Với thread pool + tác vụ con: giá trị KHÔNG tự truyền sang thread khác\n" +
        "// -> dùng InheritableThreadLocal (chỉ lúc tạo thread) hoặc truyền tường minh.",
    },
  ],
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
  viz: {
    type: 'flow',
    title: 'ThreadPoolExecutor nhận một task mới',
    nodes: ['task mới', '< core: tạo thread', 'vào queue', 'queue đầy: tới max', 'vượt max: reject'],
    steps: [
      { to: 1, label: 'số thread < core → tạo thread mới ngay' },
      { to: 2, label: 'đủ core rồi → xếp vào queue' },
      { to: 3, label: 'queue đầy → tạo thêm thread cho tới maximumPoolSize' },
      { to: 4, label: 'vẫn không nhận nổi → handler: AbortPolicy (mặc định) / CallerRunsPolicy / Discard…' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bảy tham số và bẫy của Executors.newFixedThreadPool",
      code:
        "// Đừng dùng Executors.newFixedThreadPool / newCachedThreadPool ở production:\n" +
        "//   - newFixedThreadPool  -> hàng đợi LinkedBlockingQueue KHÔNG GIỚI HẠN -> OOM\n" +
        "//   - newCachedThreadPool -> tạo tới Integer.MAX_VALUE thread -> chết OS\n" +
        "ExecutorService pool = new ThreadPoolExecutor(\n" +
        "        4,                                  // corePoolSize: luôn giữ sống\n" +
        "        16,                                 // maximumPoolSize: trần khi hàng đợi ĐẦY\n" +
        "        60L, TimeUnit.SECONDS,              // keepAlive: thread thừa quá core thì chết\n" +
        "        new ArrayBlockingQueue<>(1000),     // hàng đợi CÓ GIỚI HẠN -> áp lực ngược\n" +
        "        new ThreadFactoryBuilder().setNameFormat(\"order-%d\").build(),  // đặt tên: dễ debug\n" +
        "        new ThreadPoolExecutor.CallerRunsPolicy());   // rejection policy\n" +
        "\n" +
        "// THỨ TỰ QUYẾT ĐỊNH (hay bị hiểu sai): đủ core -> XẾP HÀNG ĐỢI trước,\n" +
        "// hàng đợi đầy rồi MỚI mở thêm thread tới max. Nên hàng đợi vô hạn nghĩa là\n" +
        "// maximumPoolSize không bao giờ có tác dụng.\n" +
        "\n" +
        "// 4 rejection policy:\n" +
        "//   AbortPolicy         (mặc định) ném RejectedExecutionException\n" +
        "//   CallerRunsPolicy    thread gọi tự chạy -> làm chậm producer = áp lực ngược\n" +
        "//   DiscardPolicy       vứt im lặng — gần như luôn sai\n" +
        "//   DiscardOldestPolicy vứt task cũ nhất trong hàng đợi\n" +
        "\n" +
        "pool.shutdown();                                   // không nhận task mới\n" +
        "if (!pool.awaitTermination(30, TimeUnit.SECONDS))  // chờ task đang chạy xong\n" +
        "    pool.shutdownNow();                            // hết kiên nhẫn -> interrupt",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['CPU-bound', 'IO-bound'],
    rows: [
      ['Thread ≈', 'số nhân (hoặc +1)', 'cores × (1 + waitTime/computeTime)'],
      ['Thêm thread nữa', 'chỉ tăng context switch', 'tăng thông lượng tới một mức'],
      ['Bị giới hạn bởi', 'số nhân CPU', 'tài nguyên downstream (pool DB, rate limit)'],
      ['Ví dụ', 'resize ảnh = 4 (số vCPU)', 'gọi API ~40, chặn ở HikariCP 20'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Công thức và cách đo thay vì đoán",
      code:
        "int cores = Runtime.getRuntime().availableProcessors();\n" +
        "\n" +
        "// CPU-bound (tính toán, nén, mã hoá): thêm thread chỉ tổ tốn context switch\n" +
        "ExecutorService cpu = Executors.newFixedThreadPool(cores + 1);\n" +
        "\n" +
        "// IO-bound (gọi HTTP, query DB): thread ngồi chờ, nên cần nhiều hơn nhiều\n" +
        "//   N = cores * targetUtilization * (1 + waitTime / serviceTime)\n" +
        "// Ví dụ: 8 core, chờ 90ms, tính 10ms, muốn dùng 100% CPU:\n" +
        "//   8 * 1 * (1 + 90/10) = 80 thread\n" +
        "int io = cores * 1 * (1 + 90 / 10);\n" +
        "\n" +
        "// TRẦN THỰC TẾ quan trọng hơn công thức: pool gọi DB không được lớn hơn\n" +
        "// connection pool, nếu không thread chỉ xếp hàng chờ connection.\n" +
        "// -> đo p99 latency và mức dùng CPU rồi chỉnh, đừng tin công thức tuyệt đối.\n" +
        "\n" +
        "// Java 21: IO-bound không cần tính nữa — virtual thread rẻ như object thường\n" +
        "try (var ex = Executors.newVirtualThreadPerTaskExecutor()) {\n" +
        "    ex.submit(() -> httpClient.send(req, ofString()));   // chặn thoải mái\n" +
        "}",
    },
  ],
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
  viz: {
    type: 'sequence',
    title: 'allOf: 3 service song song rồi assemble',
    actors: ['Client', 'User', 'Inventory', 'Pricing'],
    messages: [
      { from: 0, to: 1, label: 'supplyAsync getUser' },
      { from: 0, to: 2, label: 'supplyAsync getInventory' },
      { from: 0, to: 3, label: 'supplyAsync getPricing' },
      { from: 1, to: 0, label: 'user', dashed: true },
      { from: 2, to: 0, label: 'inventory', dashed: true },
      { from: 3, to: 0, label: 'pricing', dashed: true },
      { from: 0, to: 0, label: 'allOf(...).thenApply(assemble)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chuỗi, ghép song song và xử lý lỗi",
      code:
        "// Chạy bất đồng bộ trên pool CHỈ ĐỊNH (mặc định là ForkJoinPool.commonPool —\n" +
        "// dùng chung toàn JVM, tác vụ chặn sẽ làm đói các phần khác)\n" +
        "CompletableFuture<User> userF = CompletableFuture.supplyAsync(() -> loadUser(id), pool);\n" +
        "\n" +
        "// thenApply: biến đổi đồng bộ | thenCompose: nối một future khác (tránh lồng nhau)\n" +
        "CompletableFuture<List<Order>> ordersF = userF\n" +
        "        .thenApply(User::id)                         // U -> V\n" +
        "        .thenCompose(uid -> loadOrdersAsync(uid));   // U -> CompletableFuture<V>\n" +
        "\n" +
        "// thenCombine: hai việc chạy SONG SONG rồi gộp kết quả\n" +
        "CompletableFuture<Profile> profile = userF.thenCombine(ordersF, Profile::new);\n" +
        "\n" +
        "// allOf: chờ tất cả (chú ý: allOf trả về Void, phải join lại từng cái)\n" +
        "CompletableFuture.allOf(userF, ordersF).join();\n" +
        "\n" +
        "// Xử lý lỗi: exceptionally (chỉ khi lỗi) / handle (cả hai) / whenComplete (side-effect)\n" +
        "profile.orTimeout(2, TimeUnit.SECONDS)             // Java 9+: tự huỷ khi quá hạn\n" +
        "       .exceptionally(ex -> Profile.empty())       // fallback\n" +
        "       .thenAccept(this::render);\n" +
        "\n" +
        "// BẪY: quên join()/get() thì exception biến mất hoàn toàn, không log gì cả.",
    },
  ],
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
  viz: {
    type: 'cycle',
    title: 'incrementAndGet() = vòng lặp CAS (spin)',
    steps: [
      { label: 'đọc giá trị v', note: 'đọc giá trị hiện tại của ô nhớ' },
      { label: 'tính v + 1', note: 'chuẩn bị giá trị mới' },
      { label: 'CAS(v, v+1)', note: 'nếu ô nhớ vẫn là v thì đặt v+1, nguyên tử ở mức CPU' },
      { label: 'thất bại → lặp lại', note: 'thread khác vừa đổi → đọc lại và thử lại; không thread nào bị chặn' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "CAS, vòng lặp thử lại và ABA",
      code:
        "// CAS = compare-and-swap: một lệnh CPU nguyên tử.\n" +
        "// \"Nếu ô nhớ đang là expected thì đặt thành newValue, trả về có đổi được không\"\n" +
        "AtomicInteger counter = new AtomicInteger(0);\n" +
        "counter.incrementAndGet();          // bên trong là vòng lặp CAS, không dùng khoá\n" +
        "\n" +
        "// Bản chất incrementAndGet():\n" +
        "int prev, next;\n" +
        "do {\n" +
        "    prev = counter.get();\n" +
        "    next = prev + 1;\n" +
        "} while (!counter.compareAndSet(prev, next));   // thua thì đọc lại và thử lại\n" +
        "\n" +
        "// Ưu: không khoá -> không có context switch, không deadlock.\n" +
        "// Nhược: tranh chấp cao thì quay vòng đốt CPU. Khi đó dùng LongAdder:\n" +
        "LongAdder adder = new LongAdder();   // tách thành nhiều ô, cộng dồn khi đọc\n" +
        "adder.increment();\n" +
        "long total = adder.sum();\n" +
        "\n" +
        "// ABA: T1 đọc A; T2 đổi A->B->A; T1 CAS vẫn THÀNH CÔNG dù state đã khác.\n" +
        "// Với int thường vô hại, nhưng với con trỏ/stack thì hỏng. Cách chữa: gắn thêm tem\n" +
        "AtomicStampedReference<Node> head = new AtomicStampedReference<>(node, 0);\n" +
        "int[] stamp = new int[1];\n" +
        "Node cur = head.get(stamp);\n" +
        "head.compareAndSet(cur, next, stamp[0], stamp[0] + 1);   // so cả giá trị lẫn tem",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['Thread.sleep(ms)', 'obj.wait()'],
    rows: [
      ['Thuộc', 'method static của Thread', 'method của Object'],
      ['Giữ monitor?', 'KHÔNG nhả monitor đang giữ', 'NHẢ monitor của obj'],
      ['Điều kiện gọi', 'bất kỳ đâu', 'phải đang giữ monitor của obj'],
      ['Tỉnh khi', 'hết thời gian', 'notify/notifyAll, timeout, spurious wakeup'],
      ['Mục đích', 'trì hoãn theo đồng hồ', 'phối hợp thread theo điều kiện'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Khác biệt cốt lõi: có nhả khoá hay không",
      code:
        "synchronized (lock) {\n" +
        "    Thread.sleep(1000);   // GIỮ NGUYÊN khoá suốt 1 giây\n" +
        "                          // -> mọi thread khác chờ lock đều bị chặn theo\n" +
        "}\n" +
        "\n" +
        "synchronized (lock) {\n" +
        "    lock.wait(1000);      // NHẢ khoá rồi mới ngủ, tỉnh dậy thì giành lại khoá\n" +
        "}\n" +
        "\n" +
        "// Bảng khác biệt:\n" +
        "//   sleep  -> method static của Thread, gọi ở ĐÂU CŨNG ĐƯỢC, không nhả khoá,\n" +
        "//             tự tỉnh khi hết giờ. Dùng để: trì hoãn, giãn nhịp retry.\n" +
        "//   wait   -> method của Object, BẮT BUỘC trong synchronized (không thì\n" +
        "//             IllegalMonitorStateException), nhả khoá, chờ notify/notifyAll.\n" +
        "//             Dùng để: chờ một ĐIỀU KIỆN do thread khác tạo ra.\n" +
        "\n" +
        "// Cả hai đều ném InterruptedException — và cách xử lý đúng là:\n" +
        "try {\n" +
        "    Thread.sleep(1000);\n" +
        "} catch (InterruptedException e) {\n" +
        "    Thread.currentThread().interrupt();   // khôi phục cờ interrupt\n" +
        "    return;                               // rồi thoát sớm, ĐỪNG nuốt im lặng\n" +
        "}",
    },
  ],
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
  viz: {
    type: 'compare',
    cols: ['synchronized', 'ReentrantLock'],
    rows: [
      ['tryLock / timeout', 'không', 'có — tránh chờ vô hạn, tránh deadlock'],
      ['Huỷ khi chờ', 'không', 'lockInterruptibly()'],
      ['Fairness (FIFO)', 'không', 'tuỳ chọn'],
      ['Nhiều điều kiện chờ', 'một wait-set / monitor', 'nhiều Condition trên một lock'],
      ['Nhả khoá', 'tự động khi rời block', 'phải unlock() trong finally'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn thứ ReentrantLock làm được mà synchronized không",
      code:
        "ReentrantLock lock = new ReentrantLock();\n" +
        "\n" +
        "// 1) Khoá có timeout -> tránh chờ vô hạn, phá được deadlock\n" +
        "if (lock.tryLock(500, TimeUnit.MILLISECONDS)) {\n" +
        "    try { doWork(); } finally { lock.unlock(); }   // BẮT BUỘC unlock trong finally\n" +
        "} else {\n" +
        "    log.warn(\"bỏ qua, hệ thống đang bận\");\n" +
        "}\n" +
        "\n" +
        "// 2) Khoá có thể bị interrupt (synchronized thì không)\n" +
        "lock.lockInterruptibly();\n" +
        "\n" +
        "// 3) Khoá công bằng: FIFO, không thread nào bị bỏ đói (đổi lại: chậm hơn)\n" +
        "ReentrantLock fair = new ReentrantLock(true);\n" +
        "\n" +
        "// 4) NHIỀU điều kiện chờ trên cùng một khoá — synchronized chỉ có một hàng chờ\n" +
        "Condition notFull  = lock.newCondition();\n" +
        "Condition notEmpty = lock.newCondition();\n" +
        "notFull.await();        // chỉ đánh thức đúng nhóm cần thiết\n" +
        "notEmpty.signalAll();\n" +
        "\n" +
        "// Điểm trừ: phải tự unlock. Quên finally là treo toàn hệ thống.\n" +
        "// -> mặc định cứ dùng synchronized, chỉ đổi sang ReentrantLock khi cần\n" +
        "// một trong bốn thứ trên. Từ Java 15, hiệu năng hai bên gần như tương đương.",
    },
  ],
},
]);
