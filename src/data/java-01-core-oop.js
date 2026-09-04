SS.addQuestions('java', [
{
  cat: 'Java Core & OOP',
  q: 'JDK, JRE và JVM khác nhau như thế nào?',
  answer:
    '`JVM` (Java Virtual Machine) là máy ảo thực thi bytecode: nạp class, verify, JIT-compile sang mã máy, quản lý bộ nhớ và GC. JVM là đặc tả (spec), có nhiều hiện thực (HotSpot, OpenJ9).\n\n' +
    '`JRE` (Java Runtime Environment) = JVM + thư viện chuẩn (rt.jar / module java.base…) + file cấu hình. Đủ để **chạy** ứng dụng Java, không biên dịch được.\n\n' +
    '`JDK` (Java Development Kit) = JRE + công cụ phát triển: `javac` (compiler), `jar`, `javadoc`, `jdb`, `jlink`, `jshell`… Đủ để **viết, biên dịch và chạy**.\n\n' +
    'Từ Java 11, Oracle bỏ gói JRE riêng — bạn tải JDK và tự tạo runtime tối giản bằng `jlink`.',
  essence:
    'Quan hệ bao nhau: JDK ⊃ JRE ⊃ JVM. JVM cho tính "write once run anywhere" vì bytecode độc lập nền tảng, chỉ JVM là phụ thuộc OS/CPU.',
  example:
    'Trên CI bạn cần `eclipse-temurin:17-jdk` để `mvn package`. Nhưng image production chỉ cần runtime: dùng `jlink` tạo custom JRE ~40MB chứa đúng module ứng dụng dùng, rồi copy vào `distroless` image — nhỏ hơn nhiều so với đóng gói cả JDK.',
  viz: {
    type: 'layers',
    title: 'JDK ⊃ JRE ⊃ JVM',
    layers: [
      { name: 'JDK', tag: 'viết + biên dịch + chạy', note: 'JRE + công cụ: javac, jar, javadoc, jlink, jshell…' },
      { name: 'JRE', tag: 'chỉ chạy', note: 'JVM + thư viện chuẩn (module java.base…) + file cấu hình' },
      { name: 'JVM', tag: 'thực thi bytecode', note: 'nạp/verify class, JIT, quản lý bộ nhớ + GC. Là spec: HotSpot, OpenJ9' },
    ],
  },
  demo: [
    {
      lang: "bash",
      title: "Ranh giới JDK / JRE / JVM nhìn thấy được trên máy",
      code:
        "# javac chỉ có trong JDK — JRE không biên dịch được\n" +
        "javac -version      # javac 17.0.10   -> đang dùng JDK\n" +
        "java -version       # openjdk 17.0.10 -> phần runtime (JRE) nằm trong JDK\n" +
        "\n" +
        "# Biên dịch: .java -> .class (bytecode, độc lập OS/CPU)\n" +
        "javac App.java\n" +
        "javap -c App.class  # xem bytecode: đây mới là thứ JVM thực sự thực thi\n" +
        "\n" +
        "# jlink cắt runtime tối giản: chỉ lấy đúng module ứng dụng cần\n" +
        "jlink --add-modules java.base,java.logging \\\n" +
        "      --strip-debug --no-man-pages --compress=2 \\\n" +
        "      --output /opt/jre-min\n" +
        "/opt/jre-min/bin/java -version   # ~40MB thay vì ~180MB cả JDK",
    },
    {
      lang: "dockerfile",
      title: "Dockerfile multi-stage: build bằng JDK, chạy bằng runtime",
      code:
        "# Stage 1 cần JDK vì phải chạy javac/maven\n" +
        "FROM eclipse-temurin:17-jdk AS build\n" +
        "COPY . /src\n" +
        "RUN cd /src && ./mvnw -q package\n" +
        "\n" +
        "# Stage 2 chỉ cần runtime -> image nhỏ hơn, ít CVE hơn\n" +
        "FROM eclipse-temurin:17-jre\n" +
        "COPY --from=build /src/target/app.jar /app.jar\n" +
        "ENTRYPOINT [\"java\", \"-jar\", \"/app.jar\"]",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Phân biệt `==` và `equals()`. Hợp đồng giữa `equals()` và `hashCode()` là gì?',
  answer:
    '`==` so sánh **giá trị của biến**: với kiểu nguyên thuỷ là so sánh giá trị, với object là so sánh **địa chỉ tham chiếu** (có cùng trỏ tới một object trên heap không).\n\n' +
    '`equals()` là method, mặc định trong `Object` cũng chỉ so sánh tham chiếu, nhưng được override để so sánh **giá trị logic** (ví dụ `String`, `Integer`, các entity).\n\n' +
    'Hợp đồng bắt buộc:\n' +
    '- Nếu `a.equals(b)` thì `a.hashCode() == b.hashCode()`.\n' +
    '- Ngược lại không bắt buộc: hai object khác nhau có thể trùng hashCode (hash collision).\n' +
    '- `equals` phải phản xạ, đối xứng, bắc cầu, nhất quán.\n\n' +
    'Vi phạm hợp đồng khiến `HashMap`, `HashSet` hoạt động sai: put vào rồi `get`/`contains` trả về null/false vì tìm nhầm bucket.',
  essence:
    'Cấu trúc dữ liệu băm định vị phần tử qua `hashCode()` (chọn bucket) rồi mới dùng `equals()` (so trong bucket). Hai bước phải nhất quán, nên override thì override cả cặp.',
  example:
    'Một `class Money {currency, amount}` chỉ override `equals` mà quên `hashCode`. Khi làm key trong `Map<Money, Integer>`, hai object `Money("USD",10)` được coi là khác nhau → đếm số lượng sai. Sửa bằng `Objects.hash(currency, amount)` và `Objects.equals(...)` trong `equals`.',
  viz: {
    type: 'compare',
    cols: ['==', 'equals()'],
    rows: [
      ['Bản chất', 'toán tử', 'method (override được)'],
      ['So sánh', 'giá trị biến / địa chỉ tham chiếu', 'giá trị logic'],
      ['Mặc định ở Object', '—', 'cũng so sánh tham chiếu'],
      ['Cặp bắt buộc', '—', 'đi cùng hashCode()'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "equals/hashCode đúng hợp đồng — và hậu quả khi làm sai",
      code:
        "public final class Money {\n" +
        "    private final String currency;\n" +
        "    private final long amount;\n" +
        "\n" +
        "    public Money(String currency, long amount) {\n" +
        "        this.currency = currency;\n" +
        "        this.amount = amount;\n" +
        "    }\n" +
        "\n" +
        "    @Override\n" +
        "    public boolean equals(Object o) {\n" +
        "        if (this == o) return true;                 // tối ưu: cùng tham chiếu\n" +
        "        if (!(o instanceof Money)) return false;    // instanceof đã loại null sẵn\n" +
        "        Money m = (Money) o;\n" +
        "        return amount == m.amount && currency.equals(m.currency);\n" +
        "    }\n" +
        "\n" +
        "    @Override\n" +
        "    public int hashCode() {\n" +
        "        // BẮT BUỘC dùng đúng bộ field đã dùng trong equals()\n" +
        "        return Objects.hash(currency, amount);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Vì sao phải override cả hai:\n" +
        "Set<Money> set = new HashSet<>();\n" +
        "set.add(new Money(\"VND\", 1000));\n" +
        "// Nếu chỉ override equals mà quên hashCode -> hai object \"bằng nhau\"\n" +
        "// rơi vào 2 bucket khác nhau -> contains() trả false dù equals() true\n" +
        "System.out.println(set.contains(new Money(\"VND\", 1000))); // true khi có đủ cả hai",
    },
    {
      lang: "java",
      title: "Cạm bẫy: dùng object mutable làm key",
      code:
        "Set<List<String>> set = new HashSet<>();\n" +
        "List<String> key = new ArrayList<>(List.of(\"a\"));\n" +
        "set.add(key);\n" +
        "\n" +
        "key.add(\"b\");                            // đổi state -> hashCode đổi theo\n" +
        "System.out.println(set.contains(key));   // false! object \"mất tích\" trong Set\n" +
        "// Quy tắc: key của Map/Set phải immutable, hoặc ít nhất không đổi\n" +
        "// các field đang tham gia equals()/hashCode().",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Vì sao `String` là immutable? Nêu String pool và StringBuilder vs StringBuffer.',
  answer:
    '`String` immutable: nội dung (`byte[] value`) là `final`, không có setter, mọi thao tác "sửa" đều tạo object mới.\n\n' +
    'Lợi ích: an toàn khi chia sẻ giữa nhiều thread; dùng làm key trong `HashMap` an toàn (hashCode không đổi, còn được cache); an toàn cho tham số nhạy cảm (class name, URL, đường dẫn) tránh bị đổi sau kiểm tra; cho phép **String pool** — literal được intern và tái sử dụng để tiết kiệm bộ nhớ.\n\n' +
    '`new String("a")` tạo object mới trên heap, khác với literal `"a"` nằm trong pool; `.intern()` đưa về pool.\n\n' +
    'Nối chuỗi trong vòng lặp nên dùng `StringBuilder` (không đồng bộ, nhanh) thay vì `+` (tạo nhiều object trung gian). `StringBuffer` là bản `synchronized` của `StringBuilder`, chỉ cần khi nhiều thread cùng ghi một buffer — hiếm gặp.',
  essence:
    'Immutability đổi lấy an toàn và khả năng chia sẻ/cache bằng chi phí tạo object mới khi biến đổi. StringBuilder là "String có thể sửa" cục bộ trong một thread.',
  example:
    'Ghép 10.000 dòng log: `s += line` tạo ~10.000 String và mảng char trung gian → O(n²). Đổi sang `StringBuilder` với `append` → O(n), giảm rõ rệt GC pressure. Trong microservice xử lý batch, đây là điểm tối ưu hay bị bỏ sót.',
  viz: {
    type: 'compare',
    cols: ['String', 'StringBuilder', 'StringBuffer'],
    rows: [
      ['Khả biến', 'không (immutable)', 'có', 'có'],
      ['Đồng bộ', '— (bất biến nên an toàn)', 'không', 'có (synchronized)'],
      ['Nối chuỗi trong vòng lặp', 'O(n²), nhiều rác', 'O(n), nhanh', 'O(n), chậm hơn do khoá'],
      ['Dùng khi', 'giá trị cố định, key map', '1 thread ghép chuỗi', 'nhiều thread ghi 1 buffer (hiếm)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "String pool, intern và ba cách nối chuỗi",
      code:
        "String a = \"hello\";                  // literal -> vào String pool\n" +
        "String b = \"hello\";                  // dùng lại đúng object trong pool\n" +
        "System.out.println(a == b);          // true\n" +
        "\n" +
        "String c = new String(\"hello\");      // ép tạo object mới trên heap\n" +
        "System.out.println(a == c);          // false — khác tham chiếu\n" +
        "System.out.println(a == c.intern()); // true  — intern() đưa về object trong pool\n" +
        "System.out.println(a.equals(c));     // true  — nội dung luôn so bằng equals\n" +
        "\n" +
        "// Nối chuỗi trong vòng lặp: mỗi lần + tạo object mới -> O(n^2) rác\n" +
        "String s = \"\";\n" +
        "for (int i = 0; i < 10_000; i++) s += i;            // RẤT chậm, đừng làm\n" +
        "\n" +
        "// StringBuilder: không đồng bộ, nhanh — mặc định nên dùng\n" +
        "StringBuilder sb = new StringBuilder(10_000);       // cấp sẵn capacity, tránh resize\n" +
        "for (int i = 0; i < 10_000; i++) sb.append(i);\n" +
        "String fast = sb.toString();\n" +
        "\n" +
        "// StringBuffer: mọi method synchronized -> chỉ dùng khi thật sự chia sẻ giữa thread\n" +
        "StringBuffer safe = new StringBuffer();",
    },
    {
      lang: "java",
      title: "Immutable là điều kiện cần để cache hashCode",
      code:
        "// String cache được hashCode CHÍNH VÌ nội dung không bao giờ đổi\n" +
        "public final class String {\n" +
        "    private final byte[] value;\n" +
        "    private int hash;                  // cache: tính một lần, dùng mãi\n" +
        "\n" +
        "    public int hashCode() {\n" +
        "        int h = hash;\n" +
        "        if (h == 0 && value.length > 0) hash = h = computeHash();\n" +
        "        return h;\n" +
        "    }\n" +
        "}\n" +
        "// Hệ quả thực tế: String làm key HashMap rất rẻ, và chia sẻ giữa nhiều\n" +
        "// thread không cần đồng bộ vì không ai sửa được nó.",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Phân biệt `final`, `finally` và `finalize()`.',
  answer:
    '`final` là từ khoá: biến `final` gán một lần; method `final` không override được; class `final` không kế thừa được (ví dụ `String`). Giúp bất biến, an toàn thread và tối ưu inline.\n\n' +
    '`finally` là khối đi kèm `try/catch`, **luôn chạy** dù có exception hay `return` (trừ `System.exit`, JVM crash, deadlock). Dùng để dọn tài nguyên.\n\n' +
    '`finalize()` là method của `Object` được GC gọi trước khi thu hồi object. Đã **deprecated từ Java 9**, bị bỏ dần: thời điểm gọi không xác định, có thể không bao giờ chạy, làm chậm GC, dễ gây resurrection bug.',
  essence:
    'Ba thứ chỉ giống tên. Cơ chế dọn tài nguyên hiện đại là try-with-resources (`AutoCloseable`) và `java.lang.ref.Cleaner`, không phải `finalize`.',
  example:
    'Code cũ đóng `Connection` trong `finalize()` → connection pool cạn kiệt vì GC chạy trễ. Sửa: `try (Connection c = ds.getConnection()) { ... }` đảm bảo `close()` gọi ngay khi rời block, kể cả khi ném exception.',
  viz: {
    type: 'compare',
    cols: ['final', 'finally', 'finalize()'],
    rows: [
      ['Loại', 'từ khoá', 'khối lệnh', 'method của Object'],
      ['Vai trò', 'bất biến: biến / method / class', 'luôn chạy khi rời try', 'GC gọi trước khi thu hồi'],
      ['Thời điểm', 'biên dịch', 'runtime, sau try/catch', 'không xác định, có thể không chạy'],
      ['Khuyến nghị', 'dùng nhiều', 'thay bằng try-with-resources', 'deprecated (Java 9) — tránh'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba thứ tên giống nhau, không liên quan gì nhau",
      code:
        "// 1) final — ràng buộc lúc biên dịch\n" +
        "final class Config {}                  // không cho kế thừa\n" +
        "\n" +
        "class Service {\n" +
        "    private final List<String> hosts = new ArrayList<>();  // không gán lại được...\n" +
        "    void demo() {\n" +
        "        hosts.add(\"a\");                // ...NHƯNG nội dung vẫn sửa được!\n" +
        "        // hosts = new ArrayList<>();  // lỗi biên dịch\n" +
        "    }\n" +
        "    final void step() {}               // không cho override\n" +
        "}\n" +
        "\n" +
        "// 2) finally — luôn chạy, kể cả khi có exception hoặc return\n" +
        "int f() {\n" +
        "    try {\n" +
        "        return 1;\n" +
        "    } finally {\n" +
        "        System.out.println(\"luôn chạy trước khi thoát method\");\n" +
        "        // return 2;  // ĐỪNG: return trong finally nuốt mất exception đang bay\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 3) finalize() — deprecated từ Java 9, bỏ hẳn từ Java 18.\n" +
        "// Không xác định thời điểm chạy, có thể không bao giờ chạy.\n" +
        "// Thay thế: try-with-resources (AutoCloseable) hoặc java.lang.ref.Cleaner\n" +
        "static final Cleaner CLEANER = Cleaner.create();",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Overloading và Overriding khác nhau ra sao? Static vs dynamic dispatch?',
  answer:
    '**Overloading** (nạp chồng): cùng tên method, khác danh sách tham số, trong cùng class hoặc kế thừa. Được phân giải lúc **biên dịch** dựa trên kiểu tĩnh của tham số → *static dispatch*.\n\n' +
    '**Overriding** (ghi đè): lớp con định nghĩa lại method cùng chữ ký của lớp cha. Được phân giải lúc **chạy** dựa trên kiểu thực của object → *dynamic dispatch* (virtual method table).\n\n' +
    'Quy tắc override: chữ ký giống hệt; kiểu trả về covariant được; không thu hẹp access modifier; không ném checked exception rộng hơn; dùng `@Override` để compiler bắt lỗi.',
  essence:
    'Overloading là "chọn method nào" do compiler quyết theo kiểu khai báo. Overriding là "phiên bản nào của method" do JVM quyết theo object thật — nền tảng của đa hình.',
  example:
    'Bug kinh điển: `List<Integer> l; l.remove(1)` gọi `remove(int index)` (overload) chứ không phải `remove(Object)` → xoá nhầm phần tử vị trí 1. Muốn xoá giá trị 1 phải `l.remove(Integer.valueOf(1))`. Đây là overloading resolution lúc compile.',
  viz: {
    type: 'compare',
    cols: ['Overloading', 'Overriding'],
    rows: [
      ['Chữ ký', 'khác danh sách tham số', 'giống hệt lớp cha'],
      ['Phạm vi', 'cùng class / kế thừa', 'lớp con định nghĩa lại của lớp cha'],
      ['Phân giải', 'lúc biên dịch (kiểu tĩnh)', 'lúc chạy (kiểu thực của object)'],
      ['Cơ chế', 'static dispatch', 'dynamic dispatch (virtual method table)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Static dispatch theo kiểu khai báo, dynamic dispatch theo kiểu thực tế",
      code:
        "class Animal {\n" +
        "    void speak() { System.out.println(\"Animal\"); }\n" +
        "    static void info() { System.out.println(\"static Animal\"); }\n" +
        "}\n" +
        "class Dog extends Animal {\n" +
        "    @Override void speak() { System.out.println(\"Dog\"); }   // OVERRIDE\n" +
        "    static void info() { System.out.println(\"static Dog\"); }\n" +
        "}\n" +
        "\n" +
        "class Printer {\n" +
        "    void print(Object o) { System.out.println(\"Object\"); }  // OVERLOAD\n" +
        "    void print(String s) { System.out.println(\"String\"); }\n" +
        "}\n" +
        "\n" +
        "Animal a = new Dog();\n" +
        "a.speak();        // \"Dog\" — dynamic dispatch: chọn theo object THỰC TẾ lúc chạy\n" +
        "Animal.info();    // static method KHÔNG được override, chỉ bị che (hiding)\n" +
        "a.info();         // \"static Animal\" — chọn theo kiểu KHAI BÁO -> đừng viết kiểu này\n" +
        "\n" +
        "Object o = \"xin chào\";\n" +
        "new Printer().print(o);   // \"Object\", KHÔNG phải \"String\"!\n" +
        "// Overload được chốt lúc BIÊN DỊCH theo kiểu khai báo của biến (Object),\n" +
        "// runtime không chọn lại dù object thật là String.",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Abstract class và Interface: chọn cái nào? Default method giải quyết gì?',
  answer:
    '`abstract class`: có state (field), constructor, method có thân, mọi access modifier; một class chỉ extends một abstract class. Dùng khi các lớp con **là một loại** (is-a) và chia sẻ code + state.\n\n' +
    '`interface`: từ Java 8 có `default` và `static` method, từ Java 9 có `private` method; chỉ có hằng `public static final`, không có state khả biến; một class implements nhiều interface. Dùng để mô tả **năng lực/hợp đồng** (can-do), cho phép đa kế thừa hành vi.\n\n' +
    '`default` method ra đời để **tiến hoá interface mà không phá vỡ** hàng loạt hiện thực có sẵn (ví dụ thêm `stream()`, `forEach()` vào `Collection`).',
  essence:
    'Abstract class = khung xương chung (code + state) theo trục "là gì". Interface = hợp đồng theo trục "làm được gì", đa kế thừa. Ưu tiên interface + composition.',
  example:
    'Thiết kế module thanh toán: `interface PaymentGateway { PaymentResult charge(...); }` cho phép `StripeGateway`, `VnpayGateway`, `MockGateway` (test). Một `AbstractHttpGateway` (abstract class) chứa logic retry/timeout dùng chung, các gateway cụ thể extends nó nhưng vẫn implements interface để service phụ thuộc vào hợp đồng.',
  viz: {
    type: 'compare',
    cols: ['abstract class', 'interface'],
    rows: [
      ['State (field khả biến)', 'có', 'không (chỉ hằng public static final)'],
      ['Constructor', 'có', 'không'],
      ['Đa kế thừa', 'chỉ 1 class', 'implements nhiều'],
      ['Method có thân', 'mọi access modifier', 'default / static / private'],
      ['Ý nghĩa', 'is-a — là một loại', 'can-do — năng lực / hợp đồng'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Default method: thêm hành vi mới mà không phá code cũ",
      code:
        "// Trước Java 8: thêm method vào interface = mọi implementation cũ vỡ.\n" +
        "public interface Notifier {\n" +
        "    void send(String msg);                       // abstract: bắt buộc cài đặt\n" +
        "\n" +
        "    // default: có thân hàm -> implementation cũ tự có, không phải sửa gì\n" +
        "    default void sendAll(List<String> msgs) {\n" +
        "        msgs.forEach(this::send);\n" +
        "    }\n" +
        "\n" +
        "    // static: tiện ích gắn với interface, không kế thừa được\n" +
        "    static Notifier noop() { return msg -> {}; }\n" +
        "}\n" +
        "\n" +
        "// Đụng độ khi kế thừa hai default method cùng tên -> BẮT BUỘC override\n" +
        "interface A { default String hi() { return \"A\"; } }\n" +
        "interface B { default String hi() { return \"B\"; } }\n" +
        "class C implements A, B {\n" +
        "    @Override public String hi() { return A.super.hi(); }  // chỉ rõ lấy nhánh nào\n" +
        "}",
    },
    {
      lang: "java",
      title: "Abstract class: khi cần state dùng chung + khung cố định",
      code:
        "public abstract class BaseJob {\n" +
        "    protected final Clock clock;              // interface không giữ state được\n" +
        "    protected BaseJob(Clock clock) {          // interface không có constructor\n" +
        "        this.clock = clock;\n" +
        "    }\n" +
        "\n" +
        "    protected abstract void doRun();          // phần con tự quyết\n" +
        "\n" +
        "    public final void run() {                 // template method: khung không cho đổi\n" +
        "        long t0 = clock.millis();\n" +
        "        doRun();\n" +
        "        log.info(\"mất {}ms\", clock.millis() - t0);\n" +
        "    }\n" +
        "}\n" +
        "// Chọn nhanh: cần \"là một loại X, có state/constructor chung\" -> abstract class.\n" +
        "// Cần \"có khả năng làm được Y\", nhiều nguồn kết hợp -> interface (đa kế thừa được).",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Checked exception và unchecked exception: khác gì, khi nào dùng?',
  answer:
    'Cây kế thừa: `Throwable` → `Error` (lỗi hệ thống, không catch) và `Exception`. `Exception` chia thành `RuntimeException` + con (**unchecked**) và phần còn lại (**checked**).\n\n' +
    '**Checked**: compiler bắt buộc `catch` hoặc khai báo `throws` (`IOException`, `SQLException`). Ý đồ: lỗi có thể phục hồi, caller nên xử lý.\n\n' +
    '**Unchecked**: không bắt buộc khai báo (`NullPointerException`, `IllegalArgumentException`, `IllegalStateException`). Ý đồ: lỗi lập trình hoặc điều kiện không phục hồi được.\n\n' +
    'Xu hướng hiện đại (Spring, nhiều framework): ưu tiên unchecked để tránh "throws lan truyền" và boilerplate, bọc checked thành runtime exception có nghĩa.',
  essence:
    'Checked = "hợp đồng lỗi" nằm trong chữ ký method, ép caller quyết định. Unchecked = lỗi không kỳ vọng caller xử lý ngay. Lựa chọn là về API design, không phải kỹ thuật.',
  example:
    'Spring bọc `SQLException` (checked) thành `DataAccessException` (unchecked) với cây con rõ nghĩa (`DuplicateKeyException`, `DeadlockLoserDataAccessException`). Nhờ đó tầng service không phải `try/catch SQLException` khắp nơi, và code không bị khoá vào JDBC.',
  viz: {
    type: 'tree',
    title: 'Cây Throwable',
    root: {
      label: 'Throwable',
      children: [
        { label: 'Error', note: 'lỗi hệ thống — không catch' },
        {
          label: 'Exception',
          children: [
            { label: 'RuntimeException + con', note: 'UNCHECKED — NPE, IllegalArgument/State; không bắt buộc khai báo' },
            { label: 'các Exception còn lại', note: 'CHECKED — IOException, SQLException; bắt buộc catch hoặc throws' },
          ],
        },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Chọn loại exception và bọc lại cho đúng tầng",
      code:
        "// Unchecked (RuntimeException): lỗi do lập trình sai / vi phạm invariant.\n" +
        "// Không bắt buộc khai báo, và không nên bắt rồi nuốt.\n" +
        "public class InsufficientBalanceException extends RuntimeException {\n" +
        "    public InsufficientBalanceException(String accountId) {\n" +
        "        super(\"Tài khoản \" + accountId + \" không đủ số dư\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Checked: sự cố NGOẠI CẢNH mà caller có thể xử lý được (retry, fallback).\n" +
        "public class PaymentGatewayException extends Exception {\n" +
        "    public PaymentGatewayException(String msg, Throwable cause) {\n" +
        "        super(msg, cause);       // LUÔN giữ cause, đừng làm mất stack trace gốc\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "void charge(String id) throws PaymentGatewayException {\n" +
        "    try {\n" +
        "        gateway.call(id);\n" +
        "    } catch (IOException e) {\n" +
        "        // Bọc lại theo ngôn ngữ nghiệp vụ của tầng mình, giữ nguyên nguyên nhân\n" +
        "        throw new PaymentGatewayException(\"Gọi cổng thanh toán thất bại\", e);\n" +
        "    }\n" +
        "    // catch (Exception ignored) {}   <- anti-pattern tệ nhất: nuốt lỗi im lặng\n" +
        "}",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'try-with-resources hoạt động thế nào? Ưu điểm so với finally?',
  answer:
    'Bất kỳ object nào implements `AutoCloseable` (hoặc `Closeable`) khai báo trong ngoặc `try (...)` sẽ được gọi `close()` tự động khi rời block, kể cả khi có exception hay `return`.\n\n' +
    'Nhiều resource đóng theo **thứ tự ngược** khai báo. Nếu body ném exception và `close()` cũng ném, exception của `close()` được **suppressed** và gắn vào exception chính (`getSuppressed()`), không che mất lỗi gốc.\n\n' +
    'So với `finally` thủ công: không cần kiểm tra null, không lồng nhiều `try/finally`, không nuốt mất exception gốc khi `close()` lỗi.',
  essence:
    'Compiler sinh ra khối `finally` đúng chuẩn (null-safe, đóng ngược thứ tự, suppressed exception) thay cho bạn — loại bỏ cả một lớp bug tài nguyên.',
  example:
    '`try (var in = Files.newInputStream(p); var out = Files.newOutputStream(q)) { in.transferTo(out); }` — cả hai stream đóng đúng, nếu ổ đĩa đầy khi ghi thì `IOException` gốc vẫn hiện, lỗi khi `close()` được đính kèm chứ không thay thế.',
  viz: {
    type: 'flow',
    title: 'Đóng resource theo thứ tự ngược',
    nodes: ['mở A', 'mở B', 'thân try', 'close B', 'close A'],
    steps: [
      { to: 0, label: 'mở resource A (AutoCloseable) trong try (...)' },
      { to: 1, label: 'mở resource B' },
      { to: 2, label: 'chạy thân try — có thể ném exception' },
      { to: 3, label: 'close B trước (ngược thứ tự khai báo)' },
      { to: 4, label: 'close A — lỗi khi close bị suppressed, không che lỗi gốc' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "try-with-resources vs finally thủ công",
      code:
        "// CÁCH CŨ: dài, dễ sai, và exception trong close() NUỐT MẤT exception gốc\n" +
        "InputStream in = null;\n" +
        "try {\n" +
        "    in = new FileInputStream(\"a.txt\");\n" +
        "    read(in);\n" +
        "} finally {\n" +
        "    if (in != null) in.close();   // nếu close() ném lỗi -> mất luôn lỗi của read()\n" +
        "}\n" +
        "\n" +
        "// CÁCH ĐÚNG: compiler tự sinh finally, đóng NGƯỢC thứ tự khai báo\n" +
        "try (InputStream in = new FileInputStream(\"a.txt\");\n" +
        "     OutputStream out = new FileOutputStream(\"b.txt\")) {   // out đóng trước, in đóng sau\n" +
        "    in.transferTo(out);\n" +
        "} catch (IOException e) {\n" +
        "    // Lỗi từ close() không biến mất mà được gắn kèm làm \"suppressed\"\n" +
        "    for (Throwable s : e.getSuppressed()) log.warn(\"lỗi khi đóng\", s);\n" +
        "}",
    },
    {
      lang: "java",
      title: "Điều kiện: resource phải implement AutoCloseable",
      code:
        "class Tx implements AutoCloseable {\n" +
        "    private boolean committed = false;\n" +
        "\n" +
        "    void commit() { committed = true; }\n" +
        "\n" +
        "    @Override\n" +
        "    public void close() {                 // close = dọn dẹp, không chỉ là \"đóng file\"\n" +
        "        if (!committed) rollback();       // chưa commit thì tự rollback\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "try (Tx tx = beginTransaction()) {\n" +
        "    repo.save(order);\n" +
        "    tx.commit();                          // không tới được dòng này -> rollback\n" +
        "}",
    },
  ],
},
{
  cat: 'Collections',
  q: 'Autoboxing/unboxing là gì? Cạm bẫy với Integer cache?',
  answer:
    'Autoboxing: tự chuyển primitive → wrapper (`int` → `Integer`). Unboxing: chiều ngược lại. Xảy ra khi gán, truyền tham số, dùng trong collection (chỉ chứa object).\n\n' +
    'Cạm bẫy:\n' +
    '- `Integer` trong `[-128, 127]` được **cache** (`Integer.valueOf`), nên `Integer a=100, b=100; a==b` là `true`, nhưng `a=200,b=200; a==b` là `false`. Luôn so sánh bằng `.equals()`.\n' +
    '- Unboxing `null` → `NullPointerException` (ví dụ `int x = map.get(key)` khi key không tồn tại).\n' +
    '- Boxing trong vòng lặp nóng tạo rác GC và chậm.',
  essence:
    'Wrapper là object có định danh (identity); primitive chỉ có giá trị. Trộn hai thế giới bằng autobox tiện nhưng che giấu cấp phát heap và nguy cơ NPE.',
  example:
    'Tính tổng: `Long total = 0L; for (long v : values) total += v;` — mỗi vòng lặp unbox `total`, cộng, rồi box lại → hàng triệu `Long`. Đổi `Long` thành `long` giúp nhanh gấp nhiều lần và không sinh rác.',
  viz: {
    type: 'compare',
    cols: ['Integer a=100, b=100', 'Integer a=200, b=200'],
    rows: [
      ['a == b', 'true — nằm trong cache [-128, 127]', 'false — hai object mới trên heap'],
      ['a.equals(b)', 'true', 'true'],
      ['Bài học', 'luôn so sánh wrapper bằng .equals()', 'luôn so sánh wrapper bằng .equals()'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Integer cache [-128, 127] và ba cái bẫy kinh điển",
      code:
        "Integer a = 127, b = 127;\n" +
        "System.out.println(a == b);      // true  — cùng object trong Integer cache\n" +
        "\n" +
        "Integer c = 128, d = 128;\n" +
        "System.out.println(c == d);      // false — ngoài cache, là hai object khác nhau\n" +
        "System.out.println(c.equals(d)); // true  — với wrapper LUÔN dùng equals\n" +
        "\n" +
        "// Bẫy 2: NullPointerException do unboxing ngầm\n" +
        "Map<String, Integer> counts = new HashMap<>();\n" +
        "int n = counts.get(\"thiếu-key\");                  // null.intValue() -> NPE\n" +
        "int safe = counts.getOrDefault(\"thiếu-key\", 0);   // đúng\n" +
        "\n" +
        "// Bẫy 3: boxing trong vòng lặp nóng -> hàng triệu object rác\n" +
        "Long sum = 0L;                                     // Long, không phải long\n" +
        "for (long i = 0; i < 10_000_000L; i++) sum += i;   // mỗi vòng tạo 1 Long mới\n" +
        "long fast = LongStream.range(0, 10_000_000L).sum(); // dùng primitive stream",
    },
  ],
},
{
  cat: 'Collections',
  q: 'ArrayList và LinkedList: cấu trúc, độ phức tạp, khi nào dùng?',
  answer:
    '`ArrayList`: mảng động. `get(i)` O(1); `add` cuối amortized O(1) (đôi khi resize x1.5 và copy); `add/remove` giữa O(n) do dịch phần tử. Bộ nhớ liền mạch → cache-friendly.\n\n' +
    '`LinkedList`: danh sách liên kết đôi. `add/remove` ở hai đầu O(1); `get(i)` O(n) do phải duyệt; mỗi node tốn thêm bộ nhớ cho 2 con trỏ + overhead object; kém cache locality.\n\n' +
    'Thực tế `ArrayList` thắng gần như mọi trường hợp. `LinkedList` chỉ hợp lý khi dùng như `Queue`/`Deque` với thao tác hai đầu liên tục — mà `ArrayDeque` còn tốt hơn.',
  essence:
    'Big-O của LinkedList đẹp trên giấy nhưng hằng số lớn và cache miss khiến nó chậm hơn ArrayList trong hầu hết workload thực.',
  example:
    'Hàng đợi task in-memory: chọn `ArrayDeque` thay `LinkedList` — `offer`/`poll` O(1), mảng vòng liền mạch, ít GC hơn. Chỉ khi cần list truy cập ngẫu nhiên thì `ArrayList`.',
  viz: {
    type: 'compare',
    cols: ['ArrayList', 'LinkedList'],
    rows: [
      ['Cấu trúc', 'mảng động (liền mạch)', 'danh sách liên kết đôi'],
      ['get(i)', 'O(1)', 'O(n) — phải duyệt'],
      ['add/remove cuối', 'amortized O(1)', 'O(1)'],
      ['add/remove giữa', 'O(n) — dịch phần tử', 'O(n) tìm nút + O(1) nối'],
      ['Cache locality', 'tốt', 'kém, tốn con trỏ'],
      ['Thực tế', 'mặc định nên chọn', 'hiếm; cần Deque → ArrayDeque'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Vì sao LinkedList gần như luôn thua trên thực tế",
      code:
        "// ArrayList: mảng liên tục -> get(i) O(1), duyệt rất nhanh nhờ cache CPU\n" +
        "List<Integer> arr = new ArrayList<>(1_000_000);  // cấp sẵn -> tránh copy khi resize\n" +
        "arr.get(500_000);          // O(1)\n" +
        "arr.add(0, x);             // O(n) — phải dịch toàn bộ phần tử phía sau\n" +
        "\n" +
        "// LinkedList: mỗi phần tử là một node riêng, nằm rải rác trong heap\n" +
        "List<Integer> ll = new LinkedList<>();\n" +
        "ll.get(500_000);           // O(n) — phải đi lần lượt từng node\n" +
        "// Thêm giữa danh sách O(1) CHỈ KHI đã có iterator đứng sẵn ở vị trí đó:\n" +
        "ListIterator<Integer> it = ll.listIterator();\n" +
        "while (it.hasNext()) { if (it.next() == 42) it.add(99); }   // chỗ này mới O(1)\n" +
        "\n" +
        "// Cần queue/deque: đừng dùng LinkedList, dùng ArrayDeque (mảng vòng, ít rác hơn)\n" +
        "Deque<Integer> queue = new ArrayDeque<>();\n" +
        "queue.addLast(1);\n" +
        "queue.pollFirst();",
    },
  ],
},
{
  cat: 'Collections',
  q: 'HashMap hoạt động nội bộ thế nào? Load factor, resize, treeify?',
  answer:
    'HashMap là mảng `Node[] table` (bucket). Với mỗi key: tính `hashCode()`, "khuấy" bit (`h ^ (h >>> 16)`) để giảm collision, rồi `index = (n - 1) & hash`.\n\n' +
    'Va chạm cùng bucket tạo danh sách liên kết; từ Java 8, nếu một bucket có ≥ 8 phần tử **và** bảng ≥ 64, nó chuyển thành **cây đỏ-đen** (tra cứu O(log n) thay vì O(n)).\n\n' +
    '`load factor` mặc định 0.75: khi `size > capacity * 0.75`, bảng **resize gấp đôi** và rehash lại toàn bộ. Đặt `initialCapacity` hợp lý nếu biết trước số phần tử để tránh nhiều lần resize.',
  essence:
    'HashMap đánh đổi bộ nhớ (bảng thưa) lấy tốc độ truy cập trung bình O(1). Chất lượng `hashCode` và load factor quyết định nó gần O(1) hay suy biến về O(n)/O(log n).',
  example:
    'Cache 1 triệu bản ghi: khởi tạo `new HashMap<>(1_400_000)` (≈ 1M/0.75) để tránh ~20 lần resize + rehash tốn CPU và tạo rác lúc warm-up. Với key là enum/immutable có hashCode tốt, tra cứu ổn định O(1).',
  viz: {
    type: 'flow',
    title: 'HashMap định vị một key',
    nodes: ['key', 'hashCode()', 'khuấy bit', 'index = (n-1) & hash', 'bucket', 'list → cây đỏ-đen'],
    steps: [
      { to: 1, label: 'tính hashCode() của key' },
      { to: 2, label: 'khuấy bit: h ^ (h >>> 16) để bit cao ảnh hưởng index' },
      { to: 3, label: 'index trong bảng (n = capacity, luỹ thừa 2)' },
      { to: 4, label: 'tới bucket tương ứng' },
      { to: 5, label: '≥ 8 phần tử & bảng ≥ 64 → treeify thành cây O(log n)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bucket, load factor, resize và treeify",
      code:
        "// Cấu trúc: mảng bucket; mỗi bucket là linked list, đủ dài thì thành cây đỏ-đen\n" +
        "Map<String, Integer> map = new HashMap<>();   // capacity 16, load factor 0.75\n" +
        "\n" +
        "// Chỉ số bucket = (n - 1) & hash, với hash được \"khuấy\" để trộn bit cao xuống thấp:\n" +
        "//   static int hash(Object key) { int h = key.hashCode(); return h ^ (h >>> 16); }\n" +
        "// Vì n luôn là luỹ thừa của 2 nên & rẻ hơn %, nhưng chỉ dùng các bit thấp\n" +
        "// -> phải trộn bit cao vào, không thì hashCode kém sẽ dồn hết vào vài bucket.\n" +
        "\n" +
        "// Resize: khi size > capacity * 0.75 -> gấp đôi capacity và rehash TOÀN BỘ.\n" +
        "// 16 -> tới phần tử thứ 13 là resize thành 32. Biết trước số lượng thì cấp sẵn:\n" +
        "Map<String, Integer> sized = new HashMap<>(1000 / 3 * 4 + 1);  // tránh resize nhiều lần\n" +
        "\n" +
        "// Treeify: một bucket có >= 8 node VÀ capacity >= 64 -> chuyển sang cây đỏ-đen\n" +
        "// -> trường hợp xấu nhất từ O(n) xuống O(log n). Tụt xuống dưới 6 thì trả về list.\n" +
        "// Đây là lá chắn chống tấn công cố ý gây đụng độ hash (HashDoS).",
    },
  ],
},
{
  cat: 'Collections',
  q: 'HashMap, Hashtable, ConcurrentHashMap, Collections.synchronizedMap khác nhau?',
  answer:
    '- `HashMap`: không đồng bộ, cho phép 1 key null và nhiều value null, nhanh nhất trong môi trường 1 thread.\n' +
    '- `Hashtable`: legacy, đồng bộ toàn bộ method bằng một khoá → nghẽn cổ chai; không cho null. Không nên dùng nữa.\n' +
    '- `Collections.synchronizedMap(map)`: bọc mọi method trong `synchronized(this)`; vẫn phải tự đồng bộ khi iterate.\n' +
    '- `ConcurrentHashMap`: thiết kế cho concurrency. Java 8 dùng CAS + `synchronized` trên từng bucket, đọc không khoá; iterator weakly-consistent (không ném `ConcurrentModificationException`); không cho null; có method nguyên tử `compute`, `merge`, `computeIfAbsent`.',
  essence:
    'Khác nhau ở **hạt khoá**: Hashtable/synchronizedMap khoá cả map; ConcurrentHashMap khoá theo bucket + đọc lock-free → thông lượng cao khi nhiều thread.',
  example:
    'Bộ đếm truy cập theo endpoint dưới tải cao: `map.merge(path, 1L, Long::sum)` trên `ConcurrentHashMap` là nguyên tử và không khoá toàn cục. Dùng `synchronizedMap` ở đây sẽ khiến mọi request tuần tự hoá qua một lock.',
  viz: {
    type: 'compare',
    cols: ['HashMap', 'Hashtable', 'synchronizedMap', 'ConcurrentHashMap'],
    rows: [
      ['Đồng bộ', 'không', 'khoá toàn map', 'khoá toàn map', 'CAS + khoá theo bucket'],
      ['Đọc', 'không khoá', 'khoá', 'khoá', 'lock-free'],
      ['null key/value', 'cho phép', 'không', 'theo map gốc', 'không'],
      ['Iterator', 'fail-fast', 'fail-fast', 'fail-fast', 'weakly-consistent'],
      ['Dùng', '1 thread', 'đừng dùng nữa', 'ít', 'nhiều thread, thông lượng cao'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bốn lựa chọn, nhưng thực tế chỉ cần nhớ hai",
      code:
        "// 1) HashMap — KHÔNG thread-safe. Ghi đồng thời có thể mất dữ liệu.\n" +
        "Map<String, Integer> plain = new HashMap<>();\n" +
        "\n" +
        "// 2) Hashtable — legacy: synchronized toàn bộ method, không cho null. Đừng dùng nữa.\n" +
        "Map<String, Integer> old = new Hashtable<>();\n" +
        "\n" +
        "// 3) Collections.synchronizedMap — khoá DUY NHẤT một object cho cả map\n" +
        "Map<String, Integer> sync = Collections.synchronizedMap(new HashMap<>());\n" +
        "synchronized (sync) {                 // từng thao tác thì atomic, nhưng DUYỆT\n" +
        "    for (String k : sync.keySet()) {} // thì vẫn phải tự khoá bằng tay\n" +
        "}\n" +
        "\n" +
        "// 4) ConcurrentHashMap — nên dùng. Khoá theo từng bucket (CAS + synchronized node)\n" +
        "ConcurrentMap<String, Integer> chm = new ConcurrentHashMap<>();\n" +
        "chm.putIfAbsent(\"a\", 1);                             // atomic\n" +
        "chm.compute(\"a\", (k, v) -> v == null ? 1 : v + 1);   // atomic read-modify-write\n" +
        "chm.merge(\"a\", 1, Integer::sum);                     // cách đếm gọn nhất\n" +
        "// Lưu ý: KHÔNG cho null key/value — vì get() == null sẽ nhập nhằng giữa\n" +
        "// \"không có key\" và \"value chính là null\" trong môi trường đa luồng.",
    },
  ],
},
{
  cat: 'Collections',
  q: 'Fail-fast và fail-safe iterator? ConcurrentModificationException từ đâu ra?',
  answer:
    'Iterator **fail-fast** (của `ArrayList`, `HashMap`…) theo dõi biến đếm `modCount`. Nếu collection bị sửa cấu trúc trong lúc duyệt (không qua `iterator.remove()`), lần `next()` kế tiếp phát hiện `modCount` lệch và ném `ConcurrentModificationException` ngay — kể cả khi chỉ có một thread.\n\n' +
    'Iterator **fail-safe** (`CopyOnWriteArrayList`, `ConcurrentHashMap`) duyệt trên bản snapshot hoặc weakly-consistent view → không ném exception nhưng có thể không thấy thay đổi mới nhất.',
  essence:
    '`ConcurrentModificationException` là cơ chế phát hiện bug "sửa collection khi đang duyệt", không phải lỗi đa luồng thuần. Sửa đúng: dùng `iterator.remove()`, `removeIf()`, hoặc gom thay đổi rồi áp dụng sau.',
  example:
    '`for (Order o : orders) if (o.isExpired()) orders.remove(o);` → CME. Sửa: `orders.removeIf(Order::isExpired)`. Nếu cần xử lý song song khi duyệt, chuyển sang `ConcurrentHashMap`/`CopyOnWriteArrayList`.',
  viz: {
    type: 'compare',
    cols: ['fail-fast', 'fail-safe'],
    rows: [
      ['Ví dụ', 'ArrayList, HashMap', 'CopyOnWriteArrayList, ConcurrentHashMap'],
      ['Cơ chế', 'theo dõi biến đếm modCount', 'duyệt snapshot / weakly-consistent view'],
      ['Khi sửa lúc duyệt', 'ném ConcurrentModificationException', 'không ném, có thể bỏ sót thay đổi mới'],
      ['Sửa đúng', 'iterator.remove(), removeIf()', '—'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "ConcurrentModificationException đến từ đâu và ba cách tránh",
      code:
        "List<String> list = new ArrayList<>(List.of(\"a\", \"b\", \"c\"));\n" +
        "\n" +
        "// SAI: sửa collection trong khi for-each đang duyệt\n" +
        "for (String s : list) {\n" +
        "    if (s.equals(\"b\")) list.remove(s);   // -> ConcurrentModificationException\n" +
        "}\n" +
        "// Cơ chế: ArrayList giữ biến đếm modCount. Iterator nhớ expectedModCount lúc tạo;\n" +
        "// mỗi lần next() nó so hai giá trị, lệch nhau là ném CME ngay (fail-FAST).\n" +
        "// Đây là cảnh báo lỗi lập trình, KHÔNG phải bảo đảm an toàn luồng.\n" +
        "\n" +
        "// Đúng 1: xoá qua chính iterator (nó tự cập nhật expectedModCount)\n" +
        "Iterator<String> it = list.iterator();\n" +
        "while (it.hasNext()) if (it.next().equals(\"b\")) it.remove();\n" +
        "\n" +
        "// Đúng 2: removeIf — ngắn gọn nhất\n" +
        "list.removeIf(s -> s.equals(\"b\"));\n" +
        "\n" +
        "// Đúng 3: collection fail-SAFE — duyệt trên bản snapshot, không bao giờ ném CME\n" +
        "List<String> safe = new CopyOnWriteArrayList<>(list);  // mỗi lần ghi là copy cả mảng\n" +
        "for (String s : safe) safe.remove(s);   // chạy được, nhưng vòng lặp thấy dữ liệu CŨ\n" +
        "// -> chỉ hợp khi đọc nhiều ghi rất ít (danh sách listener, config)",
    },
  ],
},
{
  cat: 'Collections',
  q: 'Comparable và Comparator: dùng khi nào? Bẫy khi so sánh?',
  answer:
    '`Comparable<T>` định nghĩa thứ tự **tự nhiên** ngay trong class (`compareTo`), một class chỉ có một. `Comparator<T>` là chiến lược so sánh **bên ngoài**, có thể tạo nhiều cái khác nhau, truyền vào `sort`, `TreeMap`, `PriorityQueue`.\n\n' +
    'API tiện: `Comparator.comparing(User::getAge).thenComparing(User::getName).reversed()`; `nullsFirst`, `nullsLast`.\n\n' +
    'Bẫy: `compare` phải nhất quán — phản đối xứng và bắc cầu. Dùng `a - b` với `int` có thể tràn số → sai; nên dùng `Integer.compare(a, b)`. Thứ tự không nhất quán khiến `TreeSet` mất phần tử và `sort` có thể ném `IllegalArgumentException: Comparison method violates its general contract`.',
  essence:
    'Comparable = "thứ tự mặc định của tôi". Comparator = "cách sắp xếp theo ngữ cảnh". Hàm so sánh phải là total order đúng chuẩn, nếu không cấu trúc sắp xếp sẽ hỏng.',
  example:
    'Danh sách sản phẩm: thứ tự tự nhiên theo `sku` (`Comparable`), nhưng màn hình cần sắp theo giá tăng dần rồi tên: `products.sort(comparing(Product::getPrice).thenComparing(Product::getName))`. Không cần sửa class `Product`.',
  viz: {
    type: 'compare',
    cols: ['Comparable<T>', 'Comparator<T>'],
    rows: [
      ['Ở đâu', 'trong chính class — compareTo()', 'lớp / biểu thức bên ngoài'],
      ['Số lượng', '1 thứ tự tự nhiên', 'nhiều, tuỳ ngữ cảnh'],
      ['Truyền vào', '—', 'sort(), TreeMap, PriorityQueue'],
      ['Bẫy', 'a - b tràn số → dùng Integer.compare', 'phải là total order nhất quán'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Thứ tự tự nhiên vs thứ tự tuỳ ngữ cảnh, và bẫy tràn số",
      code:
        "// Comparable: MỘT thứ tự tự nhiên, gắn vào chính class\n" +
        "record Version(int major, int minor) implements Comparable<Version> {\n" +
        "    @Override public int compareTo(Version o) {\n" +
        "        int c = Integer.compare(major, o.major);   // KHÔNG viết major - o.major\n" +
        "        return c != 0 ? c : Integer.compare(minor, o.minor);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Comparator: NHIỀU thứ tự khác nhau, khai báo bên ngoài, ghép nối được\n" +
        "Comparator<User> byAgeThenName = Comparator\n" +
        "        .comparingInt(User::age)\n" +
        "        .thenComparing(User::name, String.CASE_INSENSITIVE_ORDER)\n" +
        "        .reversed();\n" +
        "list.sort(Comparator.comparing(User::name, Comparator.nullsFirst(String::compareTo)));\n" +
        "\n" +
        "// BẪY 1: trừ trực tiếp gây tràn int -> thứ tự sai âm thầm\n" +
        "Comparator<Integer> sai  = (x, y) -> x - y;   // x = Integer.MIN_VALUE là tràn\n" +
        "Comparator<Integer> dung = Integer::compare;\n" +
        "\n" +
        "// BẪY 2: compareTo không nhất quán với equals -> TreeSet coi 2 phần tử là một\n" +
        "// (TreeSet/TreeMap xác định trùng bằng compareTo, KHÔNG dùng equals)",
    },
  ],
},
{
  cat: 'Generics',
  q: 'Type erasure là gì? Giải thích `? extends` và `? super` (PECS).',
  answer:
    'Generics của Java là **compile-time**: sau khi biên dịch, thông tin kiểu bị **xoá** (erasure), `List<String>` và `List<Integer>` đều thành `List` ở runtime. Do đó không thể `new T[]`, `T.class`, `instanceof List<String>`.\n\n' +
    'Wildcard theo nguyên tắc **PECS — Producer Extends, Consumer Super**:\n' +
    '- `List<? extends Number>`: chỉ **đọc** (lấy ra `Number`), không add (trừ null). Nguồn cung cấp dữ liệu.\n' +
    '- `List<? super Integer>`: chỉ **ghi** (`add(Integer)`), đọc ra chỉ chắc là `Object`. Nơi nhận dữ liệu.',
  essence:
    'Erasure giữ tương thích ngược với code trước Java 5. Wildcard cho phép API vừa an toàn kiểu vừa linh hoạt: chọn `extends` hay `super` tuỳ method đang sản xuất hay tiêu thụ phần tử.',
  example:
    '`Collections.copy(List<? super T> dest, List<? extends T> src)`: `src` là producer (đọc phần tử) nên `extends`; `dest` là consumer (ghi phần tử) nên `super`. Nhờ vậy có thể copy `List<Integer>` sang `List<Number>`.',
  viz: {
    type: 'compare',
    cols: ['? extends T — Producer', '? super T — Consumer'],
    rows: [
      ['Đọc ra', 'chắc chắn là T', 'chỉ chắc là Object'],
      ['Ghi vào', 'không (trừ null)', 'add(T) được'],
      ['Vai trò', 'nguồn cung cấp dữ liệu', 'nơi nhận dữ liệu'],
      ['Trong copy(dest, src)', 'src', 'dest'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Những gì biến mất lúc chạy",
      code:
        "// Lúc chạy thông tin generic bị XOÁ: List<String> và List<Integer> cùng là List\n" +
        "List<String> a = new ArrayList<>();\n" +
        "List<Integer> b = new ArrayList<>();\n" +
        "System.out.println(a.getClass() == b.getClass());   // true\n" +
        "\n" +
        "// Hệ quả: những việc sau không làm được\n" +
        "// if (a instanceof List<String>) {}   // lỗi biên dịch\n" +
        "// new T[10];                          // không tạo được mảng generic\n" +
        "// class X<T> { static T field; }      // static không dùng được T\n" +
        "\n" +
        "// Cách lách khi thật sự cần kiểu lúc runtime: truyền Class<T> vào\n" +
        "static <T> T parse(String json, Class<T> type) { return mapper.readValue(json, type); }",
    },
    {
      lang: "java",
      title: "PECS — Producer Extends, Consumer Super",
      code:
        "// extends: chỉ ĐỌC ra (producer). Không add được vì không biết kiểu con cụ thể.\n" +
        "static double sum(List<? extends Number> src) {\n" +
        "    double s = 0;\n" +
        "    for (Number n : src) s += n.doubleValue();   // đọc: OK\n" +
        "    // src.add(1);                               // ghi: lỗi biên dịch\n" +
        "    return s;\n" +
        "}\n" +
        "\n" +
        "// super: chỉ GHI vào (consumer). Đọc ra thì chỉ chắc chắn được là Object.\n" +
        "static void fill(List<? super Integer> dst) {\n" +
        "    dst.add(1);                     // ghi: OK\n" +
        "    Object o = dst.get(0);          // đọc: chỉ được Object\n" +
        "}\n" +
        "\n" +
        "// Cả hai gặp nhau trong chữ ký chuẩn của thư viện:\n" +
        "// static <T> void copy(List<? super T> dst, List<? extends T> src)",
    },
  ],
},
{
  cat: 'Java 8+',
  q: 'Stream API: lazy evaluation, intermediate vs terminal, `map` vs `flatMap`.',
  answer:
    'Stream mô tả **pipeline xử lý** trên nguồn dữ liệu, không lưu dữ liệu.\n\n' +
    '- **Intermediate** (`filter`, `map`, `sorted`, `distinct`): trả về stream mới, **lazy** — chưa chạy gì.\n' +
    '- **Terminal** (`collect`, `forEach`, `reduce`, `count`, `findFirst`): kích hoạt pipeline chạy **một lần**, sau đó stream không tái sử dụng được.\n\n' +
    'Lazy + fusion: các phép được ghép và duyệt nguồn **một lần**; `findFirst`/`limit` cho phép short-circuit.\n\n' +
    '`map`: 1 phần tử → 1 phần tử. `flatMap`: 1 phần tử → 1 stream, rồi **nối phẳng** tất cả lại (dùng để "mở" collection lồng nhau).',
  essence:
    'Stream là "công thức" chứ không phải dữ liệu; không có terminal thì không tính toán. `flatMap` = `map` + làm phẳng, dành cho quan hệ một-nhiều.',
  example:
    'Lấy tất cả line-item của các đơn hàng: `orders.stream().flatMap(o -> o.getItems().stream()).filter(i -> i.getQty() > 0).collect(toList())`. Dùng `map` ở đây sẽ ra `Stream<List<Item>>`, không phải `Stream<Item>`.',
  viz: {
    type: 'flow',
    title: 'Không có terminal thì không tính toán',
    nodes: ['nguồn', 'filter (lazy)', 'map (lazy)', 'collect (terminal)'],
    steps: [
      { to: 2, label: 'xâu chuỗi các phép intermediate — chưa duyệt phần tử nào' },
      { to: 3, label: 'terminal kích hoạt: duyệt nguồn 1 lần, các phép được fusion; limit/findFirst → short-circuit' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Lazy, short-circuit và map vs flatMap",
      code:
        "// Intermediate (map/filter/sorted) LƯỜI: chưa chạy gì tới khi có terminal\n" +
        "Stream<String> s = list.stream().peek(x -> System.out.println(\"thấy \" + x));\n" +
        "// ...tới đây vẫn chưa in ra gì cả\n" +
        "\n" +
        "// Terminal (collect/forEach/reduce/count) mới kích hoạt cả pipeline\n" +
        "List<String> out = s.filter(x -> x.length() > 3).collect(Collectors.toList());\n" +
        "\n" +
        "// Mỗi phần tử chạy HẾT chuỗi toán tử rồi mới tới phần tử sau (không phải xong\n" +
        "// từng tầng), nên findFirst/anyMatch/limit dừng sớm được:\n" +
        "Optional<String> first = Stream.of(\"a\", \"bb\", \"ccc\")\n" +
        "        .peek(x -> System.out.println(\"xét \" + x))\n" +
        "        .filter(x -> x.length() == 2)\n" +
        "        .findFirst();               // chỉ in \"xét a\", \"xét bb\" rồi dừng\n" +
        "\n" +
        "// map: 1 phần tử -> 1 phần tử\n" +
        "List<Integer> lens = words.stream().map(String::length).toList();\n" +
        "\n" +
        "// flatMap: 1 phần tử -> N phần tử, rồi LÀM PHẲNG một tầng\n" +
        "List<List<String>> nested = List.of(List.of(\"a\", \"b\"), List.of(\"c\"));\n" +
        "List<String> flat = nested.stream().flatMap(List::stream).toList();  // [a, b, c]\n" +
        "// map(List::stream) sẽ cho Stream<Stream<String>> — sai kiểu",
    },
  ],
},
{
  cat: 'Java 8+',
  q: '`Optional` dùng đúng cách như thế nào? Những anti-pattern phổ biến?',
  answer:
    '`Optional<T>` là kiểu trả về diễn đạt "có thể không có giá trị", buộc caller xử lý trường hợp rỗng thay vì quên check null.\n\n' +
    'Dùng đúng: `return repo.findById(id);` (kiểu `Optional<User>`), rồi `opt.map(...).orElseThrow(() -> new NotFoundException())` hoặc `.orElseGet(supplier)`.\n\n' +
    'Anti-pattern:\n' +
    '- Dùng `Optional` làm **field** hoặc **tham số method** (nó không `Serializable`, thêm rác).\n' +
    '- `opt.get()` không kiểm tra → ném `NoSuchElementException`, chẳng khác gì NPE.\n' +
    '- `opt.isPresent()` rồi `opt.get()` — quay lại kiểu null-check.\n' +
    '- `Optional` cho collection: trả về list rỗng thay vì `Optional<List>`.',
  essence:
    'Optional là công cụ thiết kế API ở **ranh giới trả về**, không phải để thay thế mọi null trong hệ thống. Giá trị của nó là ép xử lý nhánh rỗng tại compile-time-ish.',
  example:
    '`userRepo.findByEmail(email).map(User::getId).orElseThrow(() -> new BusinessException("Email chưa đăng ký"))` — dòng này vừa gọn vừa không thể quên nhánh "không tìm thấy", khác hẳn `user.getId()` có nguy cơ NPE.',
  viz: {
    type: 'flow',
    title: 'Optional ở ranh giới trả về',
    nodes: ['findByEmail(email)', 'Optional<User>', '.map(User::getId)', '.orElseThrow(...)'],
    steps: [
      { to: 1, label: 'repo trả Optional — không bao giờ trả null' },
      { to: 2, label: 'map: có giá trị thì biến đổi, rỗng thì giữ rỗng' },
      { to: 3, label: 'rỗng → ném BusinessException; không dùng get() trần, không isPresent()+get()' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Dùng đúng chỗ, và bốn anti-pattern hay gặp",
      code:
        "// ĐÚNG: giá trị trả về của method có thể \"không tìm thấy\"\n" +
        "Optional<User> findByEmail(String email);\n" +
        "\n" +
        "String name = findByEmail(e)\n" +
        "        .map(User::name)                          // biến đổi khi có giá trị\n" +
        "        .filter(n -> !n.isBlank())\n" +
        "        .orElseGet(() -> loadDefaultName());      // lười: chỉ chạy khi rỗng\n" +
        "findByEmail(e).ifPresentOrElse(this::send, () -> log.warn(\"không có user\"));\n" +
        "User u = findByEmail(e).orElseThrow(() -> new UserNotFoundException(e));\n" +
        "\n" +
        "// ANTI-PATTERN 1: get() không kiểm tra — chỉ đổi NPE thành NoSuchElementException\n" +
        "String bad = findByEmail(e).get();\n" +
        "\n" +
        "// ANTI-PATTERN 2: if (o.isPresent()) o.get() — dài dòng hơn cả null check\n" +
        "if (findByEmail(e).isPresent()) { }\n" +
        "\n" +
        "// ANTI-PATTERN 3: orElse với biểu thức tốn kém — LUÔN được tính dù có giá trị\n" +
        "String eager = findByEmail(e).map(User::name).orElse(loadDefaultName()); // gọi thừa\n" +
        "// -> dùng orElseGet(...) như ở trên\n" +
        "\n" +
        "// ANTI-PATTERN 4: Optional làm field / tham số / phần tử collection\n" +
        "class User { private Optional<String> phone; }   // không Serializable, tốn bộ nhớ\n" +
        "// -> field cứ để null; chỉ bọc Optional ở ranh giới TRẢ VỀ",
    },
  ],
},
{
  cat: 'Java 8+',
  q: 'Functional interface, lambda và method reference khác nhau thế nào?',
  answer:
    '**Functional interface**: interface có đúng **một** abstract method (SAM), có thể có default/static method; đánh dấu `@FunctionalInterface` để compiler kiểm tra. Ví dụ `Runnable`, `Callable`, `Function<T,R>`, `Predicate<T>`, `Supplier<T>`, `Consumer<T>`.\n\n' +
    '**Lambda**: biểu thức hiện thực SAM đó, `(a, b) -> a + b`. Không phải anonymous class — compile thành `invokedynamic` + method ẩn, không sinh file `$1.class`, không tạo `this` mới (this trỏ tới class bao ngoài).\n\n' +
    '**Method reference**: cú pháp rút gọn của lambda chỉ gọi một method có sẵn: `User::getName` ≈ `u -> u.getName()`; `System.out::println`; `ArrayList::new`.',
  essence:
    'Functional interface là "kiểu" của hành vi; lambda/method reference là hai cách viết một giá trị hành vi. Lambda nhẹ hơn anonymous class về ngữ nghĩa `this` và bytecode.',
  example:
    '`list.forEach(System.out::println)`, `stream.map(String::trim).filter(s -> !s.isBlank())`. Trong Spring: `jdbcTemplate.query(sql, (rs, i) -> new User(rs.getLong("id"), rs.getString("name")))` — `RowMapper` là functional interface.',
  viz: {
    type: 'compare',
    cols: ['Functional interface', 'Lambda', 'Method reference'],
    rows: [
      ['Là gì', 'interface đúng 1 abstract method (SAM)', 'biểu thức hiện thực SAM đó', 'rút gọn lambda chỉ gọi 1 method'],
      ['Ví dụ', 'Function, Predicate, Runnable', '(a, b) -> a + b', 'User::getName, ArrayList::new'],
      ['Bytecode', '—', 'invokedynamic, không sinh $1.class', 'như lambda'],
      ['this', '—', 'trỏ class bao ngoài', 'trỏ class bao ngoài'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba khái niệm và bốn dạng method reference",
      code:
        "// Functional interface = interface đúng MỘT abstract method\n" +
        "@FunctionalInterface                 // không bắt buộc, nhưng nên có: compiler sẽ\n" +
        "interface Validator<T> {             // báo lỗi nếu lỡ thêm abstract method thứ hai\n" +
        "    boolean test(T value);\n" +
        "    default Validator<T> and(Validator<T> other) {\n" +
        "        return v -> this.test(v) && other.test(v);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// Lambda = cách viết ngắn để tạo một instance của interface đó\n" +
        "Validator<String> notBlank = v -> v != null && !v.isBlank();\n" +
        "// Lambda KHÔNG sinh anonymous class: compiler dùng invokedynamic + LambdaMetafactory\n" +
        "// -> ít class file hơn, và `this` trong lambda là `this` của lớp bao ngoài\n" +
        "// (khác anonymous class, nơi `this` trỏ vào chính object ẩn danh).\n" +
        "\n" +
        "// 4 dạng method reference — chỉ là lambda viết gọn\n" +
        "Supplier<List<String>> ctor   = ArrayList::new;        // constructor\n" +
        "Function<String, Integer> stt = Integer::parseInt;     // static method\n" +
        "Function<String, String> inst = String::toUpperCase;   // instance method của tham số\n" +
        "Predicate<String> bound       = prefix::startsWith;    // instance method của object cụ thể\n" +
        "\n" +
        "// Biến bắt vào lambda phải \"effectively final\"\n" +
        "int count = 0;\n" +
        "Runnable r = () -> System.out.println(count);   // OK khi count không bị gán lại\n" +
        "// count++;   // thêm dòng này là lambda ở trên lỗi biên dịch",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Java truyền tham số theo pass-by-value hay pass-by-reference?',
  answer:
    'Java **luôn pass-by-value**. Với primitive, value là chính giá trị đó. Với object, value là **bản sao của tham chiếu** (reference) — không phải bản sao object, cũng không phải chính biến gốc.\n\n' +
    'Hệ quả:\n' +
    '- Trong method, gán lại tham số (`param = new X()`) **không** ảnh hưởng biến ở caller.\n' +
    '- Nhưng gọi method làm thay đổi trạng thái object (`param.setName(...)`) **có** ảnh hưởng, vì cả hai reference trỏ cùng object.\n\n' +
    'Nhiều người nhầm là pass-by-reference vì thấy object bị sửa; thực chất đó là "pass reference by value".',
  essence:
    'Cái được copy khi truyền tham số là ô nhớ chứa reference, không phải object. Sửa xuyên qua reference thì thấy, thay reference thì không.',
  example:
    '`void reset(User u) { u = new User(); }` — sau khi gọi, biến ở ngoài không đổi. `void deactivate(User u) { u.setActive(false); }` — biến ở ngoài thấy `active=false`. Đây là lý do method "swap(a, b)" kiểu C không viết được trong Java.',
  viz: {
    type: 'compare',
    cols: ['param = new User()', 'param.setActive(false)'],
    rows: [
      ['Thao tác', 'gán lại tham số', 'sửa trạng thái qua reference'],
      ['Caller có thấy?', 'KHÔNG', 'CÓ'],
      ['Vì sao', 'chỉ đổi bản sao của reference', 'cả hai reference cùng trỏ 1 object trên heap'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Java LUÔN pass-by-value — kể cả với object",
      code:
        "static void reassign(StringBuilder sb) {\n" +
        "    sb = new StringBuilder(\"mới\");     // chỉ đổi BẢN SAO của tham chiếu\n" +
        "}\n" +
        "static void mutate(StringBuilder sb) {\n" +
        "    sb.append(\" đã sửa\");              // sửa chính object mà tham chiếu trỏ tới\n" +
        "}\n" +
        "\n" +
        "StringBuilder s = new StringBuilder(\"gốc\");\n" +
        "reassign(s);\n" +
        "System.out.println(s);      // \"gốc\"         <- không đổi\n" +
        "mutate(s);\n" +
        "System.out.println(s);      // \"gốc đã sửa\"  <- có đổi\n" +
        "\n" +
        "// Giải thích: Java copy GIÁ TRỊ của biến khi truyền vào method.\n" +
        "// Với object, giá trị của biến chính là \"địa chỉ\" -> copy địa chỉ.\n" +
        "// Sửa object qua địa chỉ đó thì bên ngoài thấy; gán lại địa chỉ thì không.\n" +
        "// Nếu Java thật sự pass-by-reference thì reassign() đã đổi được s.\n" +
        "\n" +
        "int x = 1;\n" +
        "static void inc(int n) { n++; }   // n là bản sao hoàn toàn\n" +
        "inc(x);\n" +
        "System.out.println(x);      // 1",
    },
  ],
},
{
  cat: 'Java Core & OOP',
  q: 'Shallow copy và deep copy? Vấn đề của `Cloneable`/`clone()`?',
  answer:
    '**Shallow copy**: sao chép object ngoài cùng nhưng các field tham chiếu vẫn trỏ chung tới object con → sửa object con ảnh hưởng cả bản gốc lẫn bản sao.\n\n' +
    '**Deep copy**: sao chép đệ quy toàn bộ đồ thị object, hai bản độc lập hoàn toàn.\n\n' +
    '`Object.clone()` mặc định là shallow, lại còn: `Cloneable` là marker interface rỗng khó hiểu; `clone()` là `protected`, không gọi constructor, ép cast, xử lý exception vụng. Josh Bloch khuyên tránh.\n\n' +
    'Thay thế: **copy constructor** `new User(other)`, **static factory** `User.copyOf(other)`, hoặc serialize/deserialize (chậm) cho deep copy.',
  essence:
    'Khác biệt nằm ở việc các tham chiếu con được chia sẻ hay nhân bản. `clone()` là cơ chế cũ nhiều khiếm khuyết; copy constructor rõ ràng và an toàn hơn.',
  example:
    '`class Team { List<Player> players; }`. Shallow copy hai team dùng chung list → thêm cầu thủ vào team A cũng vào team B. Copy constructor: `this.players = new ArrayList<>(other.players)` (và deep-copy từng `Player` nếu `Player` mutable).',
  viz: {
    type: 'compare',
    cols: ['Shallow copy', 'Deep copy'],
    rows: [
      ['Field tham chiếu', 'trỏ chung object con với bản gốc', 'nhân bản đệ quy toàn đồ thị object'],
      ['Sửa object con', 'ảnh hưởng cả bản gốc lẫn bản sao', 'hai bản độc lập hoàn toàn'],
      ['Object.clone()', 'mặc định là shallow', '—'],
      ['Nên dùng', 'copy constructor / static factory', 'copy constructor deep từng field'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Vì sao Cloneable là thiết kế hỏng",
      code:
        "class Order implements Cloneable {\n" +
        "    private String id;\n" +
        "    private List<String> items;\n" +
        "\n" +
        "    @Override\n" +
        "    protected Order clone() throws CloneNotSupportedException {\n" +
        "        Order c = (Order) super.clone();   // SHALLOW: copy từng field theo bit\n" +
        "        // items của bản sao vẫn TRỎ CHUNG list với bản gốc!\n" +
        "        c.items = new ArrayList<>(items);  // phải tự deep copy từng field mutable\n" +
        "        return c;\n" +
        "    }\n" +
        "}\n" +
        "// Vì sao nên tránh Cloneable:\n" +
        "// - Cloneable là marker interface RỖNG, không hề khai báo clone()\n" +
        "// - clone() nằm ở Object và là protected -> caller khó gọi\n" +
        "// - super.clone() không chạy constructor -> field final không gán lại được\n" +
        "// - ném checked CloneNotSupportedException dù gần như không bao giờ xảy ra",
    },
    {
      lang: "java",
      title: "Hai cách thay thế nên dùng",
      code:
        "// THAY THẾ 1: copy constructor / static factory — rõ ràng, không ma thuật\n" +
        "class Order2 {\n" +
        "    private final String id;\n" +
        "    private final List<String> items;\n" +
        "\n" +
        "    Order2(Order2 other) {\n" +
        "        this.id = other.id;\n" +
        "        this.items = new ArrayList<>(other.items);   // deep copy tường minh\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// THAY THẾ 2: làm immutable luôn -> không cần copy nữa\n" +
        "record OrderView(String id, List<String> items) {\n" +
        "    OrderView {\n" +
        "        items = List.copyOf(items);   // chốt bản sao bất biến ngay trong constructor\n" +
        "    }\n" +
        "}",
    },
  ],
},
]);
