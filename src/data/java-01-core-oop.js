SS.addQuestions('java', [
{
  cat: 'Java Core & OOP',
  id: 'java-sb2w3j',
  q: 'JDK, JRE và JVM khác nhau như thế nào?',
  answer:
    '`JVM` (Java Virtual Machine) là máy ảo thực thi bytecode: nó nạp class, verify, JIT-compile sang mã máy, đồng thời quản lý bộ nhớ và GC. Bản thân JVM chỉ là một đặc tả (spec) và có nhiều hiện thực khác nhau như HotSpot hay OpenJ9.\n' +
    '\n' +
    '`JRE` (Java Runtime Environment) gồm JVM cộng thư viện chuẩn (rt.jar / module java.base…) và các file cấu hình. Chừng đó đủ để **chạy** một ứng dụng Java, nhưng không biên dịch được.\n' +
    '\n' +
    '`JDK` (Java Development Kit) là JRE cộng thêm bộ công cụ phát triển: `javac` (compiler), `jar`, `javadoc`, `jdb`, `jlink`, `jshell`… Có JDK là đủ để **viết, biên dịch và chạy**.\n' +
    '\n' +
    'Từ Java 11, Oracle không phát hành gói JRE riêng nữa — bạn tải JDK rồi tự cắt một runtime tối giản bằng `jlink`.',
  essence:
    'Ba thứ lồng trong nhau: JDK chứa JRE, JRE chứa JVM. JVM là thứ tạo nên tính "write once run anywhere", vì bytecode không phụ thuộc nền tảng còn phần phụ thuộc OS/CPU đã được JVM gánh hết.',
  example:
    'Trên CI bạn cần `eclipse-temurin:17-jdk` để chạy `mvn package`. Nhưng image production chỉ cần phần runtime, nên hãy dùng `jlink` tạo một custom JRE khoảng 40MB chứa đúng những module ứng dụng dùng, rồi copy vào image `distroless` — nhẹ hơn rất nhiều so với đóng gói cả JDK.',
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
  id: 'java-10mtiyy',
  q: '`==` và `equals()` khác nhau ở đâu, và giữa `equals()` với `hashCode()` có hợp đồng gì?',
  answer:
    '`==` so sánh **giá trị của biến**: với kiểu nguyên thuỷ đó là so sánh giá trị, còn với object đó là so sánh **địa chỉ tham chiếu** — tức là hỏi xem hai biến có cùng trỏ tới một object trên heap hay không.\n' +
    '\n' +
    '`equals()` là một method. Bản mặc định trong `Object` cũng chỉ so sánh tham chiếu, nhưng nó được sinh ra để các class override lại mà so sánh **giá trị logic**, như `String`, `Integer` hay các entity vẫn làm.\n' +
    '\n' +
    'Hợp đồng bắt buộc giữa hai method này gồm:\n' +
    '- Nếu `a.equals(b)` thì `a.hashCode() == b.hashCode()`.\n' +
    '- Chiều ngược lại không bắt buộc: hai object khác nhau vẫn có thể trùng hashCode (hash collision).\n' +
    '- `equals` phải phản xạ, đối xứng, bắc cầu và nhất quán.\n' +
    '\n' +
    'Vi phạm hợp đồng sẽ khiến `HashMap` và `HashSet` hoạt động sai: bạn put vào rồi `get`/`contains` lại trả về null hoặc false, vì nó tìm nhầm bucket.',
  essence:
    'Các cấu trúc dữ liệu băm định vị phần tử qua `hashCode()` để chọn bucket, rồi mới dùng `equals()` để so trong bucket đó. Hai bước phải nhất quán với nhau, nên đã override một cái thì phải override cả cặp.',
  example:
    'Giả sử `class Money {currency, amount}` chỉ override `equals` mà quên `hashCode`. Khi dùng làm key trong `Map<Money, Integer>`, hai object `Money("USD",10)` bị coi là khác nhau nên số lượng đếm ra sai. Cách sửa là dùng `Objects.hash(currency, amount)` cho `hashCode` và `Objects.equals(...)` bên trong `equals`.',
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
  id: 'java-15pc62z',
  q: 'Vì sao `String` là immutable, và điều đó liên quan gì tới String pool, `StringBuilder` và `StringBuffer`?',
  answer:
    '`String` là immutable vì nội dung của nó (`byte[] value`) được khai báo `final`, class không có setter nào, và mọi thao tác trông như "sửa" thực chất đều tạo ra object mới.\n' +
    '\n' +
    'Cách thiết kế này đem lại nhiều lợi ích: chuỗi an toàn khi chia sẻ giữa nhiều thread; dùng làm key trong `HashMap` rất an toàn vì hashCode không đổi và còn được cache; các tham số nhạy cảm như class name, URL hay đường dẫn không thể bị đổi sau khi đã kiểm tra; và nó mở đường cho **String pool**, nơi các literal được intern rồi tái sử dụng để tiết kiệm bộ nhớ.\n' +
    '\n' +
    'Lưu ý `new String("a")` tạo một object mới trên heap, khác với literal `"a"` vốn nằm sẵn trong pool; muốn đưa về pool thì gọi `.intern()`.\n' +
    '\n' +
    'Khi nối chuỗi trong vòng lặp, hãy dùng `StringBuilder` (không đồng bộ nên nhanh) thay cho toán tử `+`, vì `+` tạo ra rất nhiều object trung gian. `StringBuffer` là bản `synchronized` của `StringBuilder`, chỉ cần đến khi nhiều thread cùng ghi vào một buffer — trường hợp hiếm gặp trong thực tế.',
  essence:
    'Immutability đánh đổi chi phí tạo object mới mỗi lần biến đổi để lấy sự an toàn và khả năng chia sẻ, cache. `StringBuilder` chính là phần bù: một "String sửa được" dùng cục bộ trong một thread.',
  example:
    'Khi ghép 10.000 dòng log, cách viết `s += line` sinh ra khoảng 10.000 String cùng chừng ấy mảng char trung gian, tức là O(n²). Đổi sang `StringBuilder` với `append` thì còn O(n) và giảm hẳn GC pressure. Trong các microservice xử lý batch, đây là điểm tối ưu rất hay bị bỏ sót.',
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
  id: 'java-3xqfag',
  q: '`final`, `finally` và `finalize()` khác nhau thế nào?',
  answer:
    '`final` là một từ khoá: biến `final` chỉ gán được một lần, method `final` không override được, còn class `final` thì không kế thừa được — `String` là ví dụ. Nó giúp giữ tính bất biến, an toàn thread và tạo điều kiện cho compiler tối ưu inline.\n' +
    '\n' +
    '`finally` là khối đi kèm `try/catch` và **luôn chạy**, bất kể có exception hay `return`, trừ khi gặp `System.exit`, JVM crash hoặc deadlock. Vai trò của nó là dọn tài nguyên.\n' +
    '\n' +
    '`finalize()` là method của `Object`, được GC gọi trước khi thu hồi object. Nó đã **deprecated từ Java 9** và đang bị loại bỏ dần, vì thời điểm gọi không xác định, có thể không bao giờ chạy, làm chậm GC và dễ sinh resurrection bug.',
  essence:
    'Ba thứ này chỉ giống nhau ở cái tên. Cơ chế dọn tài nguyên hiện đại là try-with-resources (`AutoCloseable`) và `java.lang.ref.Cleaner`, chứ không phải `finalize`.',
  example:
    'Có những đoạn code cũ đóng `Connection` ngay trong `finalize()`, và hậu quả là connection pool cạn kiệt vì GC chạy quá trễ. Cách sửa là `try (Connection c = ds.getConnection()) { ... }`, nhờ đó `close()` được gọi ngay khi rời khỏi block, kể cả khi có exception ném ra.',
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
  id: 'java-ls9e9k',
  q: 'Overloading và Overriding khác nhau ra sao, và mỗi loại được phân giải bằng static hay dynamic dispatch?',
  answer:
    '**Overloading** (nạp chồng) là nhiều method trùng tên nhưng khác danh sách tham số, nằm trong cùng một class hoặc trong quan hệ kế thừa. Compiler phân giải chúng ngay lúc **biên dịch**, dựa trên kiểu tĩnh của tham số — đây là *static dispatch*.\n' +
    '\n' +
    '**Overriding** (ghi đè) là khi lớp con định nghĩa lại method có cùng chữ ký của lớp cha. Việc chọn phiên bản nào diễn ra lúc **chạy**, dựa trên kiểu thực của object — đây là *dynamic dispatch*, thực hiện qua virtual method table.\n' +
    '\n' +
    'Khi override, bạn phải giữ chữ ký giống hệt; kiểu trả về được phép covariant; không được thu hẹp access modifier; không được ném checked exception rộng hơn; và nên đánh dấu `@Override` để compiler bắt lỗi giúp.',
  essence:
    'Overloading trả lời câu hỏi "gọi method nào" và do compiler quyết dựa trên kiểu khai báo. Overriding trả lời "chạy phiên bản nào của method đó" và do JVM quyết dựa trên object thật — đây chính là nền tảng của đa hình.',
  example:
    'Có một bug kinh điển: với `List<Integer> l`, lời gọi `l.remove(1)` thực ra chạy `remove(int index)` (overload) chứ không phải `remove(Object)`, nên nó xoá nhầm phần tử ở vị trí 1. Muốn xoá giá trị 1 thì phải viết `l.remove(Integer.valueOf(1))`. Đây đúng là overloading được phân giải lúc compile.',
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
  id: 'java-12r0r0u',
  q: 'Khi nào nên chọn abstract class, khi nào chọn interface, và `default` method sinh ra để giải quyết vấn đề gì?',
  answer:
    '`abstract class` có state (field), có constructor, có method với phần thân và dùng được mọi access modifier, nhưng một class chỉ được extends đúng một abstract class. Hãy chọn nó khi các lớp con thật sự **là một loại** (is-a) và chia sẻ chung cả code lẫn state.\n' +
    '\n' +
    '`interface` từ Java 8 đã có `default` và `static` method, từ Java 9 có thêm `private` method; nó chỉ chứa hằng `public static final` chứ không có state khả biến, bù lại một class implements được nhiều interface cùng lúc. Hãy chọn nó để mô tả **năng lực hoặc hợp đồng** (can-do) và để đa kế thừa hành vi.\n' +
    '\n' +
    'Riêng `default` method ra đời nhằm **tiến hoá interface mà không phá vỡ** hàng loạt hiện thực có sẵn — nhờ nó mà `Collection` thêm được `stream()` và `forEach()`.',
  essence:
    'Abstract class là khung xương chung gồm cả code lẫn state, đi theo trục "là gì". Interface là hợp đồng đi theo trục "làm được gì" và cho phép đa kế thừa. Mặc định nên ưu tiên interface kết hợp composition.',
  example:
    'Hãy hình dung module thanh toán: khai báo `interface PaymentGateway { PaymentResult charge(...); }` cho phép có `StripeGateway`, `VnpayGateway` và cả `MockGateway` dùng khi test. Bên cạnh đó, một `AbstractHttpGateway` (abstract class) giữ phần logic retry/timeout dùng chung để các gateway cụ thể extends, nhưng chúng vẫn implements interface để tầng service chỉ phụ thuộc vào hợp đồng.',
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
  id: 'java-1ixi33r',
  q: 'Checked exception khác unchecked exception ở đâu, và khi nào nên dùng loại nào?',
  answer:
    'Cây kế thừa bắt đầu từ `Throwable`, chia thành `Error` (lỗi hệ thống, không nên catch) và `Exception`. Bản thân `Exception` lại tách thành `RuntimeException` cùng các lớp con của nó (**unchecked**) và toàn bộ phần còn lại (**checked**).\n' +
    '\n' +
    'Với **checked**, compiler bắt buộc bạn `catch` hoặc khai báo `throws`, như `IOException` và `SQLException`. Ý đồ của nhóm này là những lỗi có thể phục hồi và caller nên xử lý.\n' +
    '\n' +
    'Với **unchecked**, bạn không phải khai báo gì, như `NullPointerException`, `IllegalArgumentException` hay `IllegalStateException`. Ý đồ là những lỗi do lập trình sai hoặc những điều kiện không phục hồi được.\n' +
    '\n' +
    'Xu hướng hiện đại — Spring và nhiều framework khác — là ưu tiên unchecked để tránh cảnh `throws` lan truyền khắp nơi cùng đống boilerplate, rồi bọc checked exception thành runtime exception có nghĩa hơn.',
  essence:
    'Checked là "hợp đồng lỗi" được ghi thẳng vào chữ ký method, ép caller phải quyết định. Unchecked là loại lỗi mà ta không kỳ vọng caller xử lý ngay tại chỗ. Chọn loại nào là quyết định về thiết kế API chứ không thuần tuý kỹ thuật.',
  example:
    'Spring bọc `SQLException` (checked) thành `DataAccessException` (unchecked) với một cây con rõ nghĩa như `DuplicateKeyException` hay `DeadlockLoserDataAccessException`. Nhờ vậy tầng service không phải rải `try/catch SQLException` khắp nơi, và code cũng không bị khoá chặt vào JDBC.',
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
  id: 'java-1cfgdaw',
  q: 'try-with-resources hoạt động thế nào, và hơn gì so với tự dọn tài nguyên trong `finally`?',
  answer:
    'Mọi object implements `AutoCloseable` (hoặc `Closeable`) mà bạn khai báo trong ngoặc `try (...)` đều được gọi `close()` tự động khi rời khỏi block, kể cả khi có exception hay `return`.\n' +
    '\n' +
    'Nếu khai báo nhiều resource, chúng được đóng theo **thứ tự ngược** với lúc khai báo. Trường hợp thân `try` ném exception mà `close()` cũng ném, exception của `close()` sẽ bị **suppressed** và gắn kèm vào exception chính (đọc qua `getSuppressed()`), nên lỗi gốc không bị che mất.\n' +
    '\n' +
    'So với `finally` viết tay, cách này giúp bạn khỏi phải kiểm tra null, khỏi lồng nhiều tầng `try/finally`, và không vô tình nuốt mất exception gốc mỗi khi `close()` lỗi.',
  essence:
    'Compiler sinh sẵn cho bạn một khối `finally` đúng chuẩn — null-safe, đóng ngược thứ tự, giữ lại suppressed exception — và nhờ đó xoá bỏ cả một lớp bug về tài nguyên.',
  example:
    'Với `try (var in = Files.newInputStream(p); var out = Files.newOutputStream(q)) { in.transferTo(out); }`, cả hai stream đều được đóng đúng cách. Nếu ổ đĩa đầy lúc ghi, `IOException` gốc vẫn hiện ra, còn lỗi phát sinh khi `close()` chỉ được đính kèm chứ không thay thế nó.',
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
  id: 'java-s79rd3',
  q: 'Autoboxing/unboxing là gì, và vì sao Integer cache lại thành cạm bẫy?',
  answer:
    'Autoboxing là việc tự chuyển primitive sang wrapper (`int` thành `Integer`), còn unboxing là chiều ngược lại. Chúng xảy ra khi bạn gán, truyền tham số, hay đưa giá trị vào collection — vì collection chỉ chứa được object.\n' +
    '\n' +
    'Mấy cạm bẫy cần nhớ:\n' +
    '- `Integer` trong khoảng `[-128, 127]` được **cache** bởi `Integer.valueOf`, nên `Integer a=100, b=100; a==b` cho `true`, trong khi `a=200,b=200; a==b` lại cho `false`. Vì vậy luôn so sánh bằng `.equals()`.\n' +
    '- Unbox một giá trị `null` sẽ ném `NullPointerException`, chẳng hạn `int x = map.get(key)` khi key không tồn tại.\n' +
    '- Boxing trong vòng lặp nóng vừa tạo rác cho GC vừa làm chậm chương trình.',
  essence:
    'Wrapper là object nên có định danh (identity), còn primitive thì chỉ có giá trị. Autoboxing giúp trộn hai thế giới đó rất tiện, nhưng đồng thời che giấu việc cấp phát trên heap và nguy cơ NPE.',
  example:
    'Xét đoạn tính tổng `Long total = 0L; for (long v : values) total += v;` — mỗi vòng lặp phải unbox `total`, cộng, rồi box lại, sinh ra hàng triệu object `Long`. Chỉ cần đổi `Long` thành `long` là nhanh hơn gấp nhiều lần và không còn sinh rác.',
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
  id: 'java-rogkmj',
  q: 'ArrayList và LinkedList khác nhau thế nào về cấu trúc lẫn độ phức tạp, và khi nào nên dùng cái nào?',
  answer:
    '`ArrayList` là một mảng động. `get(i)` tốn O(1); `add` vào cuối là amortized O(1), thỉnh thoảng phải resize gấp 1.5 lần rồi copy; `add/remove` ở giữa tốn O(n) vì phải dịch phần tử. Bù lại bộ nhớ liền mạch nên rất cache-friendly.\n' +
    '\n' +
    '`LinkedList` là danh sách liên kết đôi. Thêm/xoá ở hai đầu tốn O(1), nhưng `get(i)` tốn O(n) vì phải duyệt; mỗi node còn tốn thêm bộ nhớ cho hai con trỏ cộng overhead object, và cache locality thì kém.\n' +
    '\n' +
    'Trên thực tế `ArrayList` thắng gần như mọi trường hợp. `LinkedList` chỉ hợp lý khi bạn dùng nó như `Queue`/`Deque` với thao tác liên tục ở hai đầu — mà ngay cả khi đó `ArrayDeque` vẫn tốt hơn.',
  essence:
    'Big-O của LinkedList trông đẹp trên giấy, nhưng hằng số lớn cùng chuyện cache miss khiến nó chậm hơn ArrayList trong hầu hết workload thực tế.',
  example:
    'Với một hàng đợi task in-memory, hãy chọn `ArrayDeque` thay vì `LinkedList`: `offer`/`poll` đều O(1), mảng vòng nằm liền mạch trong bộ nhớ và sinh ít rác hơn. Chỉ khi cần một list truy cập ngẫu nhiên thì mới quay lại `ArrayList`.',
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
  id: 'java-hsfmwp',
  q: 'HashMap hoạt động nội bộ thế nào, và load factor, resize, treeify đóng vai trò gì?',
  answer:
    'HashMap là một mảng `Node[] table`, mỗi ô gọi là một bucket. Với mỗi key, nó tính `hashCode()`, "khuấy" bit bằng `h ^ (h >>> 16)` để giảm collision, rồi lấy `index = (n - 1) & hash`.\n' +
    '\n' +
    'Các key va chạm vào cùng bucket được nối thành danh sách liên kết. Từ Java 8, nếu một bucket chứa từ 8 phần tử trở lên **và** bảng đã đạt ít nhất 64 ô, bucket đó chuyển thành **cây đỏ-đen**, đưa tra cứu từ O(n) về O(log n).\n' +
    '\n' +
    '`load factor` mặc định là 0.75: khi `size > capacity * 0.75`, bảng **resize gấp đôi** và rehash lại toàn bộ. Nếu biết trước số phần tử, hãy đặt `initialCapacity` hợp lý để tránh phải resize nhiều lần.',
  essence:
    'HashMap đánh đổi bộ nhớ — dưới dạng một bảng thưa — để lấy tốc độ truy cập trung bình O(1). Chất lượng của `hashCode` và load factor quyết định nó giữ được gần O(1) hay suy biến về O(n)/O(log n).',
  example:
    'Muốn cache 1 triệu bản ghi, hãy khởi tạo `new HashMap<>(1_400_000)` (xấp xỉ 1M chia 0.75) để khỏi phải trải qua khoảng 20 lần resize kèm rehash vốn rất tốn CPU và sinh rác lúc warm-up. Nếu key là enum hoặc kiểu immutable có hashCode tốt, tra cứu sẽ ổn định ở mức O(1).',
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
  id: 'java-hcocxm',
  q: 'HashMap, Hashtable, ConcurrentHashMap và Collections.synchronizedMap khác nhau ở chỗ nào?',
  answer:
    '- `HashMap` không đồng bộ, cho phép một key null cùng nhiều value null, và là lựa chọn nhanh nhất trong môi trường một thread.\n' +
    '- `Hashtable` là lớp legacy, đồng bộ mọi method bằng chung một khoá nên tạo nghẽn cổ chai, lại không cho null. Ngày nay không nên dùng nữa.\n' +
    '- `Collections.synchronizedMap(map)` bọc mọi method trong `synchronized(this)`, và bạn vẫn phải tự đồng bộ mỗi khi iterate.\n' +
    '- `ConcurrentHashMap` được thiết kế riêng cho concurrency. Từ Java 8 nó dùng CAS kết hợp `synchronized` trên từng bucket, đọc thì không cần khoá; iterator của nó weakly-consistent nên không ném `ConcurrentModificationException`; nó không cho null; và nó cung cấp các method nguyên tử như `compute`, `merge`, `computeIfAbsent`.',
  essence:
    'Chúng khác nhau ở **hạt khoá**: Hashtable và synchronizedMap khoá cả map, còn ConcurrentHashMap khoá theo từng bucket và cho phép đọc lock-free, nhờ đó thông lượng cao hơn hẳn khi có nhiều thread.',
  example:
    'Với bộ đếm truy cập theo endpoint dưới tải cao, `map.merge(path, 1L, Long::sum)` trên `ConcurrentHashMap` vừa nguyên tử vừa không cần khoá toàn cục. Nếu dùng `synchronizedMap` ở đây, mọi request sẽ bị tuần tự hoá qua một lock duy nhất.',
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
  id: 'java-1f1t11f',
  q: 'Iterator fail-fast khác fail-safe thế nào, và `ConcurrentModificationException` sinh ra từ đâu?',
  answer:
    'Iterator **fail-fast** — của `ArrayList`, `HashMap`… — theo dõi một biến đếm tên `modCount`. Nếu collection bị sửa cấu trúc giữa lúc duyệt mà không thông qua `iterator.remove()`, lần gọi `next()` kế tiếp sẽ thấy `modCount` lệch và ném `ConcurrentModificationException` ngay lập tức, kể cả khi chỉ có một thread duy nhất.\n' +
    '\n' +
    'Iterator **fail-safe** — của `CopyOnWriteArrayList`, `ConcurrentHashMap` — lại duyệt trên một bản snapshot hoặc một weakly-consistent view, nên nó không ném exception nhưng đổi lại có thể không thấy được thay đổi mới nhất.',
  essence:
    '`ConcurrentModificationException` là cơ chế phát hiện lỗi "sửa collection khi đang duyệt" chứ không phải một lỗi đa luồng thuần tuý. Cách sửa đúng là dùng `iterator.remove()`, `removeIf()`, hoặc gom thay đổi lại rồi áp dụng sau khi duyệt xong.',
  example:
    'Đoạn `for (Order o : orders) if (o.isExpired()) orders.remove(o);` sẽ ném CME. Hãy sửa thành `orders.removeIf(Order::isExpired)`. Còn nếu bạn thật sự cần xử lý song song trong lúc duyệt thì chuyển sang `ConcurrentHashMap` hoặc `CopyOnWriteArrayList`.',
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
  id: 'java-be4ngb',
  q: 'Nên dùng Comparable hay Comparator, và có những bẫy nào khi viết hàm so sánh?',
  answer:
    '`Comparable<T>` định nghĩa thứ tự **tự nhiên** ngay bên trong class qua `compareTo`, và mỗi class chỉ có duy nhất một thứ tự như vậy. `Comparator<T>` thì là chiến lược so sánh nằm **bên ngoài**, bạn tạo bao nhiêu cái cũng được rồi truyền vào `sort`, `TreeMap` hay `PriorityQueue`.\n' +
    '\n' +
    'API đi kèm khá tiện: `Comparator.comparing(User::getAge).thenComparing(User::getName).reversed()`, cùng với `nullsFirst` và `nullsLast`.\n' +
    '\n' +
    'Bẫy nằm ở chỗ `compare` phải nhất quán, tức là phản đối xứng và bắc cầu. Viết `a - b` với `int` có thể tràn số và cho kết quả sai, nên hãy dùng `Integer.compare(a, b)`. Một thứ tự không nhất quán sẽ khiến `TreeSet` làm mất phần tử, còn `sort` thì ném `IllegalArgumentException: Comparison method violates its general contract`.',
  essence:
    'Comparable nói "đây là thứ tự mặc định của tôi", còn Comparator nói "đây là cách sắp xếp cho ngữ cảnh này". Dù chọn cái nào, hàm so sánh vẫn phải là một total order đúng chuẩn, nếu không các cấu trúc sắp xếp sẽ hỏng.',
  example:
    'Danh sách sản phẩm có thứ tự tự nhiên theo `sku` khai báo bằng `Comparable`, nhưng màn hình lại cần sắp theo giá tăng dần rồi mới tới tên. Chỉ cần `products.sort(comparing(Product::getPrice).thenComparing(Product::getName))` là xong, không phải đụng vào class `Product`.',
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
  id: 'java-1lvyiqn',
  q: 'Type erasure là gì, và `? extends` khác `? super` thế nào (nguyên tắc PECS)?',
  answer:
    'Generics của Java chỉ tồn tại ở mức **compile-time**: sau khi biên dịch, thông tin kiểu bị **xoá** đi (erasure), nên `List<String>` và `List<Integer>` đều trở thành `List` ở runtime. Chính vì vậy bạn không viết được `new T[]`, `T.class` hay `instanceof List<String>`.\n' +
    '\n' +
    'Wildcard đi theo nguyên tắc **PECS — Producer Extends, Consumer Super**:\n' +
    '- `List<? extends Number>` chỉ để **đọc** (lấy ra `Number`), không add được gì ngoài null. Đây là nguồn cung cấp dữ liệu.\n' +
    '- `List<? super Integer>` chỉ để **ghi** (`add(Integer)`), còn đọc ra thì chỉ chắc chắn được kiểu `Object`. Đây là nơi nhận dữ liệu.',
  essence:
    'Erasure tồn tại để giữ tương thích ngược với code viết trước Java 5. Wildcard bù lại cho phép API vừa an toàn kiểu vừa linh hoạt: chọn `extends` hay `super` tuỳ theo method đang sản xuất hay tiêu thụ phần tử.',
  example:
    'Hãy nhìn `Collections.copy(List<? super T> dest, List<? extends T> src)`: `src` là producer vì ta đọc phần tử từ nó nên dùng `extends`, còn `dest` là consumer vì ta ghi phần tử vào nên dùng `super`. Nhờ cách khai báo này mà bạn copy được `List<Integer>` sang `List<Number>`.',
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
  id: 'java-x6nh74',
  q: 'Stream API lazy ở chỗ nào, intermediate khác terminal ra sao, và `map` khác `flatMap` thế nào?',
  answer:
    'Stream mô tả một **pipeline xử lý** đặt trên nguồn dữ liệu, bản thân nó không lưu dữ liệu.\n' +
    '\n' +
    '- Các phép **intermediate** như `filter`, `map`, `sorted`, `distinct` trả về một stream mới và hoàn toàn **lazy** — tới đây chưa có gì chạy cả.\n' +
    '- Các phép **terminal** như `collect`, `forEach`, `reduce`, `count`, `findFirst` mới kích hoạt pipeline, và chỉ chạy được **một lần**; sau đó stream không tái sử dụng được nữa.\n' +
    '\n' +
    'Nhờ lazy cộng với fusion, các phép được ghép lại và nguồn dữ liệu chỉ bị duyệt **một lần**; riêng `findFirst` và `limit` còn cho phép short-circuit.\n' +
    '\n' +
    'Về hai phép biến đổi: `map` biến một phần tử thành một phần tử, còn `flatMap` biến một phần tử thành một stream rồi **nối phẳng** tất cả lại — đây là cách để "mở" các collection lồng nhau.',
  essence:
    'Stream là một công thức xử lý chứ không phải dữ liệu, nên chưa có terminal thì chưa có gì được tính. Còn `flatMap` chính là `map` cộng thêm bước làm phẳng, dành cho quan hệ một-nhiều.',
  example:
    'Muốn lấy toàn bộ line-item của các đơn hàng, hãy viết `orders.stream().flatMap(o -> o.getItems().stream()).filter(i -> i.getQty() > 0).collect(toList())`. Nếu dùng `map` ở vị trí đó, kết quả sẽ là `Stream<List<Item>>` chứ không phải `Stream<Item>`.',
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
  id: 'java-ot9o23',
  q: 'Dùng `Optional` thế nào cho đúng, và đâu là những anti-pattern phổ biến?',
  answer:
    '`Optional<T>` là kiểu trả về diễn đạt ý "có thể không có giá trị", buộc caller phải xử lý trường hợp rỗng thay vì quên mất việc check null.\n' +
    '\n' +
    'Cách dùng đúng là trả về nó từ tầng dữ liệu, ví dụ `return repo.findById(id);` với kiểu `Optional<User>`, rồi phía gọi xử lý bằng `opt.map(...).orElseThrow(() -> new NotFoundException())` hoặc `.orElseGet(supplier)`.\n' +
    '\n' +
    'Còn đây là những anti-pattern hay gặp:\n' +
    '- Dùng `Optional` làm **field** hoặc **tham số method**, trong khi nó không `Serializable` và chỉ thêm rác.\n' +
    '- Gọi `opt.get()` mà không kiểm tra, dẫn tới `NoSuchElementException` — chẳng khá hơn NPE là bao.\n' +
    '- Viết `opt.isPresent()` rồi mới `opt.get()`, tức là quay về đúng kiểu null-check cũ.\n' +
    '- Bọc collection trong `Optional`, trong khi trả về một list rỗng vẫn tốt hơn `Optional<List>`.',
  essence:
    'Optional là công cụ thiết kế API ở **ranh giới giá trị trả về**, không phải thứ để thay thế mọi null trong hệ thống. Giá trị của nó nằm ở chỗ ép người gọi phải xử lý nhánh rỗng.',
  example:
    'Dòng `userRepo.findByEmail(email).map(User::getId).orElseThrow(() -> new BusinessException("Email chưa đăng ký"))` vừa gọn vừa không cho phép bạn quên nhánh "không tìm thấy", khác hẳn cách viết `user.getId()` luôn tiềm ẩn NPE.',
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
  id: 'java-22uu33',
  q: 'Functional interface, lambda và method reference khác nhau thế nào?',
  answer:
    '**Functional interface** là interface có đúng **một** abstract method (viết tắt là SAM), bên cạnh đó vẫn được phép có default hoặc static method; đánh dấu `@FunctionalInterface` để compiler kiểm tra giúp. Quen thuộc nhất là `Runnable`, `Callable`, `Function<T,R>`, `Predicate<T>`, `Supplier<T>` và `Consumer<T>`.\n' +
    '\n' +
    '**Lambda** là biểu thức hiện thực chính cái SAM đó, chẳng hạn `(a, b) -> a + b`. Nó không phải anonymous class: compiler dịch nó thành `invokedynamic` cộng một method ẩn, nên không sinh file `$1.class` và cũng không tạo ra `this` mới — `this` bên trong lambda vẫn trỏ tới class bao ngoài.\n' +
    '\n' +
    '**Method reference** là cách viết rút gọn của những lambda chỉ gọi lại một method có sẵn: `User::getName` tương đương `u -> u.getName()`, tương tự có `System.out::println` hay `ArrayList::new`.',
  essence:
    'Functional interface đóng vai trò "kiểu" của một hành vi, còn lambda và method reference là hai cách viết ra giá trị hành vi đó. So với anonymous class, lambda nhẹ hơn cả về ngữ nghĩa `this` lẫn bytecode sinh ra.',
  example:
    'Bạn gặp chúng khắp nơi: `list.forEach(System.out::println)` hay `stream.map(String::trim).filter(s -> !s.isBlank())`. Trong Spring cũng vậy — `jdbcTemplate.query(sql, (rs, i) -> new User(rs.getLong("id"), rs.getString("name")))` viết được như thế vì `RowMapper` là một functional interface.',
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
  id: 'java-fzjkh0',
  q: 'Java truyền tham số theo pass-by-value hay pass-by-reference?',
  answer:
    'Java **luôn pass-by-value**. Với primitive, cái value đó chính là giá trị. Với object, value là **bản sao của tham chiếu** — không phải bản sao object, cũng không phải chính biến gốc.\n' +
    '\n' +
    'Từ đó suy ra hai hệ quả:\n' +
    '- Gán lại tham số bên trong method (`param = new X()`) **không** ảnh hưởng gì tới biến ở caller.\n' +
    '- Nhưng gọi method làm thay đổi trạng thái object (`param.setName(...)`) thì **có** ảnh hưởng, vì cả hai reference cùng trỏ tới một object.\n' +
    '\n' +
    'Nhiều người nhầm đây là pass-by-reference chỉ vì thấy object bị sửa; thực chất nó là "pass reference by value".',
  essence:
    'Thứ được copy khi truyền tham số là ô nhớ chứa reference chứ không phải bản thân object. Vì vậy sửa xuyên qua reference thì caller thấy, còn thay hẳn reference thì caller không thấy.',
  example:
    'Với `void reset(User u) { u = new User(); }`, sau khi gọi xong biến ở ngoài vẫn nguyên. Nhưng với `void deactivate(User u) { u.setActive(false); }`, biến ở ngoài sẽ thấy `active=false`. Đây cũng chính là lý do bạn không viết được method `swap(a, b)` kiểu C trong Java.',
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
  id: 'java-rwtq02',
  q: 'Shallow copy khác deep copy thế nào, và `Cloneable`/`clone()` có vấn đề gì?',
  answer:
    '**Shallow copy** sao chép object ngoài cùng nhưng các field tham chiếu vẫn trỏ chung tới object con, nên sửa object con là ảnh hưởng cả bản gốc lẫn bản sao.\n' +
    '\n' +
    '**Deep copy** thì sao chép đệ quy toàn bộ đồ thị object, cho ra hai bản độc lập hoàn toàn.\n' +
    '\n' +
    '`Object.clone()` mặc định chỉ là shallow, và còn kèm một loạt vấn đề: `Cloneable` là marker interface rỗng khó hiểu, `clone()` lại `protected`, nó không gọi constructor, bắt bạn phải ép cast và xử lý exception một cách vụng về. Chính Josh Bloch khuyên nên tránh.\n' +
    '\n' +
    'Các lựa chọn thay thế gồm **copy constructor** kiểu `new User(other)`, **static factory** kiểu `User.copyOf(other)`, hoặc serialize rồi deserialize khi cần deep copy — tuy cách này chậm.',
  essence:
    'Khác biệt nằm ở chỗ các tham chiếu con được chia sẻ hay được nhân bản. Riêng `clone()` là cơ chế cũ với nhiều khiếm khuyết, nên copy constructor vừa rõ ràng vừa an toàn hơn.',
  example:
    'Xét `class Team { List<Player> players; }`. Nếu shallow copy, hai team dùng chung một list, nên thêm cầu thủ vào team A thì team B cũng có. Copy constructor giải quyết chuyện đó bằng `this.players = new ArrayList<>(other.players)`, và nếu `Player` là mutable thì phải deep-copy từng `Player` nữa.',
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
