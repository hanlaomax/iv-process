SS.addQuestions('design-patterns', [
{
  cat: 'Behavioral',
  q: 'Visitor pattern và double dispatch?',
  answer:
    'Visitor tách **thao tác** ra khỏi cấu trúc object mà nó tác động. Mỗi loại object có `accept(Visitor v)` gọi `v.visitConcreteType(this)`.\n\n' +
    '**Double dispatch**: method được chọn dựa trên **hai** runtime type — type của element và type của visitor. Java chỉ có single dispatch (theo receiver), nên Visitor "mô phỏng" double dispatch qua hai lần gọi: `element.accept(visitor)` (dispatch theo element) → `visitor.visit(this)` (dispatch theo visitor, overload theo type element).\n\n' +
    'Đánh đổi: thêm **operation** rẻ (thêm visitor); thêm **element type** đắt (sửa mọi visitor + interface Visitor).',
  essence:
    'Visitor = "tách hàng loạt thao tác khỏi hierarchy ổn định". Double dispatch là cơ chế: hai lần gọi ảo để chọn đúng method theo cả (element type, visitor type). Dùng khi element type ít thay đổi, operation thì tăng.',
  example:
    'AST compiler: element `Literal/BinaryOp/Call` (ổn định). Visitor `TypeChecker`, `Optimizer`, `CodeGen`, `PrettyPrinter` (tăng dần). `node.accept(typeChecker)` → `typeChecker.visit((BinaryOp) node)`. Thêm pass mới = một visitor, không đụng AST.',
  viz: {
    type: 'flow',
    title: 'Double dispatch: chọn method theo cả (element type, visitor type)',
    nodes: ['node.accept(visitor)', 'dispatch theo ELEMENT type (BinaryOp)', 'visitor.visit(this)', 'dispatch theo VISITOR type + overload theo element'],
    steps: [
      { to: 1, label: 'Java chỉ single dispatch (theo receiver) → mô phỏng bằng hai lần gọi' },
      { to: 3, label: 'typeChecker.visit((BinaryOp) node)' },
      { to: 3, label: 'Đánh đổi: thêm OPERATION rẻ (thêm visitor); thêm ELEMENT TYPE đắt (sửa mọi visitor)' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chọn method theo HAI kiểu, không phải một",
      code:
        "// VẤN ĐỀ: Java chỉ có SINGLE DISPATCH — method được chọn theo kiểu thực tế\n" +
        "// của ĐỐI TƯỢNG NHẬN, còn tham số thì chọn theo kiểu KHAI BÁO lúc biên dịch.\n" +
        "void visit(Shape s) { }\n" +
        "void visit(Circle c) { }\n" +
        "Shape s = new Circle();\n" +
        "visit(s);                 // gọi visit(Shape) — KHÔNG phải visit(Circle)\n" +
        "\n" +
        "// DOUBLE DISPATCH — hai lần gọi ảo để chọn được theo CẢ HAI kiểu:\n" +
        "public interface Shape {\n" +
        "    <R> R accept(ShapeVisitor<R> v);        // lần gọi ảo THỨ NHẤT\n" +
        "}\n" +
        "public record Circle(double r) implements Shape {\n" +
        "    public <R> R accept(ShapeVisitor<R> v) { return v.visitCircle(this); }  // THỨ HAI\n" +
        "}\n" +
        "public record Square(double side) implements Shape {\n" +
        "    public <R> R accept(ShapeVisitor<R> v) { return v.visitSquare(this); }\n" +
        "}\n" +
        "\n" +
        "public interface ShapeVisitor<R> {\n" +
        "    R visitCircle(Circle c);\n" +
        "    R visitSquare(Square s);\n" +
        "}\n" +
        "public class AreaVisitor implements ShapeVisitor<Double> {\n" +
        "    public Double visitCircle(Circle c) { return Math.PI * c.r() * c.r(); }\n" +
        "    public Double visitSquare(Square s) { return s.side() * s.side(); }\n" +
        "}\n" +
        "\n" +
        "Shape shape = new Circle(2);\n" +
        "double area = shape.accept(new AreaVisitor());     // chọn đúng visitCircle\n" +
        "\n" +
        "// ĐÁNH ĐỔI CỐT LÕI:\n" +
        "//  + THÊM THAO TÁC dễ (thêm một visitor, không sửa lớp nào)\n" +
        "//  - THÊM LOẠI mới khó (phải sửa MỌI visitor)\n" +
        "// -> chỉ dùng khi tập KIỂU ổn định mà THAO TÁC hay thêm.\n" +
        "\n" +
        "// JAVA 21 — sealed + pattern matching thay thế gọn hơn nhiều:\n" +
        "sealed interface Shape permits Circle, Square { }\n" +
        "double area(Shape s) {\n" +
        "    return switch (s) {\n" +
        "        case Circle c -> Math.PI * c.r() * c.r();\n" +
        "        case Square q -> q.side() * q.side();\n" +
        "    };        // compiler ĐẢM BẢO xử lý hết mọi loại — visitor không làm được\n" +
        "}",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Memento pattern — lưu và khôi phục trạng thái?',
  answer:
    'Lưu một **snapshot** trạng thái nội tại của một object (originator) vào một object **memento**, để **khôi phục** sau này — **mà không lộ chi tiết nội tại** ra bên ngoài.\n\n' +
    'Ba vai:\n' +
    '- **Originator**: object có state cần lưu; tạo memento (`save()`) và khôi phục từ memento (`restore(m)`).\n' +
    '- **Memento**: giữ snapshot; interface hẹp cho caretaker (chỉ lưu/truyền), interface rộng cho originator (đọc/ghi).\n' +
    '- **Caretaker**: giữ danh sách memento (undo stack), không nhìn vào bên trong.',
  essence:
    'Memento = "ảnh chụp trạng thái đóng gói". Điểm mấu chốt: chỉ originator hiểu nội dung memento; caretaker chỉ cầm và trả lại. Nền tảng của undo, checkpoint, snapshot, transaction rollback.',
  example:
    'Editor: `editor.save()` trả `EditorMemento` (nội dung + con trỏ + selection). Undo stack (caretaker) giữ list. Ctrl+Z: `editor.restore(stack.pop())`. Game: quick-save. Kết hợp Command: mỗi command lưu memento để undo thao tác lớn.',
  viz: {
    type: 'tree',
    title: '"Ảnh chụp trạng thái đóng gói" — chỉ originator hiểu nội dung',
    root: {
      label: 'Lưu snapshot state nội tại để khôi phục sau, không lộ chi tiết ra ngoài',
      children: [
        { label: 'Originator', note: 'object có state cần lưu — save() tạo memento, restore(m) khôi phục' },
        { label: 'Memento', note: 'giữ snapshot; interface hẹp cho caretaker, interface rộng cho originator' },
        { label: 'Caretaker', note: 'giữ danh sách memento (undo stack), không nhìn vào bên trong' },
        { label: 'Nền tảng của', note: 'undo, checkpoint, snapshot, transaction rollback' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Chụp ảnh trạng thái mà không phá vỡ đóng gói",
      code:
        "// ORIGINATOR — đối tượng có trạng thái cần lưu\n" +
        "public class TextEditor {\n" +
        "    private String content = \"\";\n" +
        "    private int cursorPosition = 0;\n" +
        "\n" +
        "    // Tạo memento — chỉ NÓ biết cấu trúc bên trong\n" +
        "    public Memento save() { return new Memento(content, cursorPosition); }\n" +
        "\n" +
        "    // Khôi phục từ memento\n" +
        "    public void restore(Memento m) {\n" +
        "        this.content = m.content;\n" +
        "        this.cursorPosition = m.cursor;\n" +
        "    }\n" +
        "\n" +
        "    // MEMENTO: state được ĐÓNG GÓI, bên ngoài không đọc/sửa được\n" +
        "    public static final class Memento {\n" +
        "        private final String content;          // private, không getter public\n" +
        "        private final int cursor;\n" +
        "        private Memento(String content, int cursor) {\n" +
        "            this.content = content; this.cursor = cursor;\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// CARETAKER — giữ memento nhưng KHÔNG hiểu nội dung\n" +
        "public class History {\n" +
        "    private final Deque<TextEditor.Memento> stack = new ArrayDeque<>();\n" +
        "    public void backup(TextEditor e) { stack.push(e.save()); }\n" +
        "    public void undo(TextEditor e)   { if (!stack.isEmpty()) e.restore(stack.pop()); }\n" +
        "}\n" +
        "\n" +
        "// ĐIỂM CỐT LÕI: caretaker lưu trạng thái mà KHÔNG phá vỡ đóng gói của\n" +
        "// originator — nó không biết bên trong memento có gì.\n" +
        "\n" +
        "// SO VỚI COMMAND UNDO: command undo bằng THAO TÁC NGƯỢC (nhẹ nhưng không\n" +
        "// phải việc gì cũng có phép ngược); memento lưu TOÀN BỘ trạng thái\n" +
        "// (luôn đúng nhưng tốn bộ nhớ).\n" +
        "\n" +
        "// TỐI ƯU BỘ NHỚ: lưu snapshot ĐỊNH KỲ + các thay đổi từ snapshot đó\n" +
        "// (đúng cách mà event sourcing và Redis RDB+AOF làm).\n" +
        "// Trong Java hiện đại: record BẤT BIẾN chính là memento tự nhiên.",
    },
  ],
},
{
  cat: 'Behavioral',
  q: 'Null Object pattern — loại bỏ null check?',
  answer:
    'Thay vì trả `null` (buộc client phải `if (x != null)`), trả một object **implements cùng interface** nhưng có hành vi **"không làm gì" / trung tính**.\n\n' +
    '```\ninterface Logger { void log(String msg); }\nclass NoOpLogger implements Logger { public void log(String msg) {} }\n// thay vì: if (logger != null) logger.log(...)\n// chỉ cần: logger.log(...)  — với logger mặc định là NoOpLogger\n```\n\n' +
    'Dùng khi: "không có" là trường hợp hợp lệ và hành vi mặc định rõ ràng (log rỗng, discount 0, danh sách rỗng, khách vãng lai).\n\nKHÔNG dùng khi "không có" là lỗi cần phát hiện (nuốt lỗi âm thầm).',
  essence:
    'Null Object thay "không có → null → NPE/check khắp nơi" bằng "không có → object trung tính → code gọi tự nhiên". Đẩy việc xử lý "vắng mặt" vào một chỗ (nơi tạo object) thay vì mọi call site.',
  example:
    '`CustomerRepository.findById(id)` không tìm thấy → trả `Customer.GUEST` (NullObject: `getDiscountRate()` = 0, `getName()` = "Khách vãng lai") thay vì null. Code `applyDiscount(customer.getDiscountRate())` chạy bình thường. (Cẩn thận: chỉ khi "guest" là ngữ nghĩa đúng.)',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Trả null', 'Null Object'],
    rows: [
      ['Client', 'if (x != null) khắp nơi', 'gọi trực tiếp x.method()'],
      ['Rủi ro', 'NPE nếu quên check', 'không'],
      ['Xử lý "vắng mặt"', 'ở mọi call site', 'một chỗ (nơi tạo object)'],
      ['Dùng khi', '"không có" là lỗi cần phát hiện', '"không có" hợp lệ + hành vi mặc định rõ (log rỗng, discount 0, khách vãng lai)'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Đối tượng \"không làm gì\" thay cho null",
      code:
        "// TRƯỚC — null check rải rác khắp nơi\n" +
        "public void process(Order o) {\n" +
        "    Logger logger = getLogger();\n" +
        "    if (logger != null) logger.log(\"bắt đầu\");     // lặp lại ở MỌI chỗ dùng\n" +
        "    ...\n" +
        "    if (logger != null) logger.log(\"kết thúc\");\n" +
        "}\n" +
        "\n" +
        "// SAU — NULL OBJECT: một cài đặt hợp lệ nhưng không làm gì\n" +
        "public interface Logger { void log(String msg); }\n" +
        "\n" +
        "public class NoOpLogger implements Logger {\n" +
        "    public static final Logger INSTANCE = new NoOpLogger();\n" +
        "    @Override public void log(String msg) { }        // không làm gì\n" +
        "}\n" +
        "\n" +
        "public class OrderService {\n" +
        "    private final Logger logger;\n" +
        "    public OrderService(Logger logger) {\n" +
        "        this.logger = logger != null ? logger : NoOpLogger.INSTANCE;   // MỘT chỗ duy nhất\n" +
        "    }\n" +
        "    public void process(Order o) {\n" +
        "        logger.log(\"bắt đầu\");                        // KHÔNG cần kiểm tra\n" +
        "        logger.log(\"kết thúc\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// VÍ DỤ KHÁC: khách vãng lai thay cho user null\n" +
        "public class GuestUser implements User {\n" +
        "    public String name() { return \"Khách\"; }\n" +
        "    public boolean hasPermission(String p) { return false; }   // không có quyền gì\n" +
        "    public List<Order> orders() { return List.of(); }\n" +
        "}\n" +
        "\n" +
        "// KHI NÀO DÙNG: hành vi \"không có gì\" là HỢP LỆ về mặt nghiệp vụ và lặp\n" +
        "// lại ở nhiều nơi (logger, collector metric, notifier, cache).\n" +
        "\n" +
        "// KHI NÀO KHÔNG DÙNG: khi \"không có\" là một TÌNH HUỐNG CẦN XỬ LÝ.\n" +
        "// Null object có thể CHE GIẤU lỗi — tìm không thấy đơn hàng mà trả về\n" +
        "// NullOrder thì bug sẽ hiện ra ở nơi rất xa nguồn gốc.\n" +
        "// -> Trường hợp đó dùng Optional để BUỘC người gọi xử lý:\n" +
        "Optional<Order> find(String id);\n" +
        "\n" +
        "// Trong JDK: Collections.emptyList(), Optional.empty(), Logger no-op của SLF4J.",
    },
  ],
},
{
  cat: 'SOLID',
  q: 'S — Single Responsibility Principle (SRP)?',
  answer:
    'Một class nên có **một lý do duy nhất để thay đổi** — tức là chịu trách nhiệm trước **một actor/stakeholder**.\n\n' +
    'Không phải "class chỉ làm một việc" (quá hẹp) mà là "class thay đổi khi và chỉ khi **một** nhóm yêu cầu thay đổi".\n\n' +
    'Dấu hiệu vi phạm: class có method phục vụ các bên khác nhau (business rule + DB persistence + report format + email); PR sửa class này vì nhiều lý do không liên quan; tên class có "And"/"Manager"/"Util".',
  essence:
    'SRP là về **cohesion theo lý do thay đổi**. Gom code thay đổi cùng nhau, tách code thay đổi vì lý do khác nhau. Mục tiêu: một thay đổi yêu cầu chỉ chạm một class.',
  example:
    '`Employee` có `calculatePay()` (kế toán quyết định), `save()` (DBA quyết định), `reportHours()` (HR quyết định) → 3 actor, 3 lý do thay đổi. Tách: `PayCalculator`, `EmployeeRepository`, `HoursReporter`. Đổi công thức lương không risk làm hỏng report.',
  viz: {
    type: 'tree',
    title: 'S — cohesion theo lý do thay đổi',
    root: {
      label: 'Một class = một lý do duy nhất để thay đổi (một actor/stakeholder)',
      children: [
        { label: 'Không phải "class chỉ làm một việc"', note: 'mà "thay đổi khi và chỉ khi MỘT nhóm yêu cầu thay đổi"' },
        { label: 'Dấu hiệu vi phạm', note: 'method phục vụ các bên khác nhau (business + DB + report + email); tên có "And"/"Manager"/"Util"' },
        { label: 'Ví dụ', note: 'Employee.calculatePay() + save() + reportHours() → 3 actor → tách PayCalculator, Repository, Reporter' },
        { label: 'Mục tiêu', note: 'một thay đổi yêu cầu chỉ chạm một class' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Một lý do để thay đổi, không phải một việc để làm",
      code:
        "// PHÁT BIỂU CHÍNH XÁC (Robert Martin): \"Một module chỉ nên có MỘT LÝ DO\n" +
        "// để thay đổi\" — hay nói cách khác, chỉ chịu trách nhiệm trước MỘT NHÓM\n" +
        "// NGƯỜI DÙNG NGHIỆP VỤ.\n" +
        "// KHÔNG phải \"một class chỉ làm một việc\" — đó là cách hiểu quá hẹp và sai.\n" +
        "\n" +
        "// VI PHẠM SRP — ba nhóm người có thể yêu cầu thay đổi class này:\n" +
        "public class Employee {\n" +
        "    public Money calculatePay() { }      // phòng KẾ TOÁN quyết định\n" +
        "    public void save() { }               // đội KIẾN TRÚC/DBA quyết định\n" +
        "    public String reportHours() { }      // phòng NHÂN SỰ quyết định\n" +
        "}\n" +
        "// Kế toán đổi công thức lương -> sửa file này -> có nguy cơ làm hỏng\n" +
        "// báo cáo của nhân sự. Ba nhóm giẫm chân nhau trên một file.\n" +
        "\n" +
        "// TUÂN THỦ — tách theo NGUỒN THAY ĐỔI:\n" +
        "public record Employee(EmployeeId id, String name, Money hourlyRate) { }  // dữ liệu\n" +
        "\n" +
        "public class PayCalculator {              // đổi khi KẾ TOÁN đổi quy định\n" +
        "    public Money calculate(Employee e, Timesheet t) { ... }\n" +
        "}\n" +
        "public class EmployeeRepository {         // đổi khi hạ tầng lưu trữ đổi\n" +
        "    public void save(Employee e) { ... }\n" +
        "}\n" +
        "public class HourReporter {               // đổi khi NHÂN SỰ đổi yêu cầu\n" +
        "    public String report(Employee e) { ... }\n" +
        "}\n" +
        "\n" +
        "// DẤU HIỆU VI PHẠM:\n" +
        "//  - mô tả class phải dùng chữ \"VÀ\": \"class này lưu dữ liệu VÀ gửi email\"\n" +
        "//  - class có tên chung chung: Manager, Processor, Handler, Utils, Helper\n" +
        "//  - nhiều đội cùng sửa một file và hay xung đột merge\n" +
        "//  - test cho một tính năng phải mock rất nhiều thứ không liên quan\n" +
        "\n" +
        "// CẢNH BÁO: áp dụng SRP quá đà -> hàng trăm class mỗi cái một method,\n" +
        "// và logic bị xé nhỏ tới mức không đọc được. Tiêu chí là NGUỒN THAY ĐỔI,\n" +
        "// không phải số dòng code.",
    },
  ],
},
{
  cat: 'SOLID',
  q: 'O — Open/Closed Principle (OCP)?',
  answer:
    'Module nên **mở để mở rộng, đóng để sửa đổi**: thêm hành vi mới bằng cách **thêm code**, không **sửa code đã có** (và đã test, đã chạy production).\n\n' +
    'Đạt được qua: abstraction + polymorphism (Strategy, Template Method, plugin), không phải qua `if/else`/`switch` phải sửa mỗi khi có loại mới.\n\n' +
    'Lưu ý: OCP không có nghĩa "không bao giờ sửa" — nghĩa là *thiết kế để điểm mở rộng dự kiến* không cần sửa lõi. Không thể (và không nên) mở mọi hướng.',
  essence:
    'OCP: dự đoán trục thay đổi có khả năng cao (loại thanh toán, định dạng export, loại thông báo) và đặt abstraction ở đó → thêm biến thể = thêm class. Trục ít thay đổi thì đừng over-abstract.',
  example:
    'Vi phạm: `double area(Shape s) { if (s instanceof Circle) ... else if (s instanceof Square) ... }` — thêm Triangle phải sửa hàm này (và mọi hàm tương tự). Tuân thủ: `Shape.area()` abstract, `Triangle implements Shape` — không đụng code cũ.',
  viz: {
    type: 'compare',
    corner: 'O — Open/Closed',
    cols: ['Vi phạm (if instanceof / switch)', 'Tuân thủ (abstraction + polymorphism)'],
    rows: [
      ['Thêm loại mới (Triangle)', 'sửa area() và mọi hàm tương tự', 'thêm class Triangle implements Shape'],
      ['Code đã test/production', 'phải sửa (rủi ro)', 'không đụng'],
      ['Đạt được qua', '—', 'Strategy, Template Method, plugin'],
      ['Lưu ý', 'đặt abstraction ở trục thay đổi khả năng CAO', 'trục ít thay đổi thì đừng over-abstract'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Mở cho mở rộng, đóng cho sửa đổi",
      code:
        "// VI PHẠM — thêm loại mới là phải SỬA code đã chạy tốt\n" +
        "public class DiscountCalculator {\n" +
        "    public Money calculate(Customer c, Money total) {\n" +
        "        if (c.tier() == GOLD)        return total.multiply(0.9);\n" +
        "        else if (c.tier() == SILVER) return total.multiply(0.95);\n" +
        "        else if (c.tier() == VIP)    return total.multiply(0.8);   // sửa MỖI LẦN\n" +
        "        return total;\n" +
        "    }\n" +
        "}\n" +
        "// Mỗi lần thêm hạng khách -> sửa class này -> phải test lại TOÀN BỘ,\n" +
        "// và có nguy cơ làm hỏng logic đang chạy đúng.\n" +
        "\n" +
        "// TUÂN THỦ — thêm loại mới bằng cách THÊM class\n" +
        "public interface DiscountPolicy {\n" +
        "    boolean appliesTo(Customer c);\n" +
        "    Money apply(Money total);\n" +
        "}\n" +
        "@Component\n" +
        "public class GoldDiscount implements DiscountPolicy {\n" +
        "    public boolean appliesTo(Customer c) { return c.tier() == GOLD; }\n" +
        "    public Money apply(Money t) { return t.multiply(0.9); }\n" +
        "}\n" +
        "\n" +
        "@Service\n" +
        "public class DiscountCalculator {\n" +
        "    private final List<DiscountPolicy> policies;      // Spring tiêm TẤT CẢ\n" +
        "\n" +
        "    public Money calculate(Customer c, Money total) {\n" +
        "        return policies.stream()\n" +
        "            .filter(p -> p.appliesTo(c))\n" +
        "            .findFirst()\n" +
        "            .map(p -> p.apply(total))\n" +
        "            .orElse(total);\n" +
        "    }\n" +
        "}\n" +
        "// -> Thêm hạng VIP = thêm MỘT @Component. KHÔNG sửa dòng nào đã có.\n" +
        "\n" +
        "// CƠ CHẾ ĐẠT ĐƯỢC OCP: trừu tượng hoá (interface) + polymorphism,\n" +
        "// hoặc composition, hoặc cấu hình.\n" +
        "\n" +
        "// CẢNH BÁO QUAN TRỌNG: KHÔNG THỂ mở cho MỌI hướng thay đổi. Bạn phải\n" +
        "// ĐOÁN hướng nào sẽ thay đổi, và đoán sai thì trừu tượng đó vừa vô dụng\n" +
        "// vừa cản trở. -> Chỉ áp dụng OCP cho hướng ĐÃ CHỨNG MINH là hay thay đổi.\n" +
        "// Với enum/sealed cố định, switch lại TỐT HƠN vì compiler kiểm tra đủ nhánh.",
    },
  ],
},
{
  cat: 'SOLID',
  q: 'L — Liskov Substitution Principle (LSP)?',
  answer:
    'Object của subclass phải **thay thế được** cho object của superclass **mà không phá vỡ tính đúng** của chương trình. Subtype phải tuân thủ **hợp đồng** của supertype.\n\n' +
    'Vi phạm khi subclass:\n' +
    '- **Thắt chặt precondition** (yêu cầu input hẹp hơn parent).\n' +
    '- **Nới lỏng postcondition** (đảm bảo ít hơn parent).\n' +
    '- **Phá invariant** của parent.\n' +
    '- Ném exception mà parent không ném; hoặc làm method thành no-op / throw `UnsupportedOperationException`.\n\n' +
    'Kinh điển: `Square extends Rectangle` — `setWidth` cũng đổi height → code kỳ vọng Rectangle bị sai.',
  essence:
    'LSP: kế thừa là "là một loại và cư xử đúng như" chứ không chỉ "tái dùng code". Nếu bạn phải kiểm tra `instanceof` để xử lý riêng subclass, hoặc subclass "gãy" một method của parent → vi phạm LSP, có lẽ không nên kế thừa.',
  example:
    '`class ReadOnlyList extends ArrayList` với `add()` throw `UnsupportedOperationException` → code nhận `List` và gọi `add()` sẽ crash. Vi phạm LSP. Đúng: `ReadOnlyList` không kế thừa `ArrayList`, chỉ implements một interface `Collection` read-only, hoặc composition.',
  viz: {
    type: 'tree',
    title: 'L — kế thừa là "là một loại VÀ cư xử đúng như", không chỉ "tái dùng code"',
    root: {
      label: 'Subtype phải thay thế được supertype mà không phá tính đúng',
      children: [
        { label: 'Thắt chặt precondition', note: 'yêu cầu input hẹp hơn parent' },
        { label: 'Nới lỏng postcondition', note: 'đảm bảo ít hơn parent' },
        { label: 'Phá invariant của parent', note: 'Square extends Rectangle — setWidth cũng đổi height' },
        { label: 'Ném exception parent không ném / method thành no-op', note: 'ReadOnlyList.add() throw UnsupportedOperationException' },
        { label: 'Phải instanceof để xử lý riêng subclass?', note: '→ vi phạm LSP, có lẽ không nên kế thừa' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Lớp con phải thay thế được lớp cha mà không phá vỡ gì",
      code:
        "// VI PHẠM KINH ĐIỂN — hình vuông kế thừa hình chữ nhật\n" +
        "public class Rectangle {\n" +
        "    protected int width, height;\n" +
        "    public void setWidth(int w)  { this.width = w; }\n" +
        "    public void setHeight(int h) { this.height = h; }\n" +
        "    public int area() { return width * height; }\n" +
        "}\n" +
        "public class Square extends Rectangle {\n" +
        "    @Override public void setWidth(int w)  { this.width = w; this.height = w; }\n" +
        "    @Override public void setHeight(int h) { this.width = h; this.height = h; }\n" +
        "}\n" +
        "// Code viết cho Rectangle bị VỠ khi nhận Square:\n" +
        "void test(Rectangle r) {\n" +
        "    r.setWidth(5);\n" +
        "    r.setHeight(4);\n" +
        "    assert r.area() == 20;        // Square cho 16 -> SAI\n" +
        "}\n" +
        "// Về mặt toán học hình vuông LÀ hình chữ nhật, nhưng về HÀNH VI thì không.\n" +
        "\n" +
        "// VI PHẠM PHỔ BIẾN HƠN trong code thật:\n" +
        "public class ReadOnlyList<T> extends ArrayList<T> {\n" +
        "    @Override public boolean add(T t) { throw new UnsupportedOperationException(); }\n" +
        "}\n" +
        "// Mọi code nhận List và gọi add() đều vỡ.\n" +
        "\n" +
        "// BA QUY TẮC CỦA LSP:\n" +
        "// 1) TIỀN ĐIỀU KIỆN không được CHẶT HƠN\n" +
        "//    Cha nhận mọi số nguyên, con chỉ nhận số dương -> VI PHẠM\n" +
        "// 2) HẬU ĐIỀU KIỆN không được LỎNG HƠN\n" +
        "//    Cha đảm bảo trả về danh sách đã sắp xếp, con trả về không sắp -> VI PHẠM\n" +
        "// 3) BẤT BIẾN của lớp cha phải được GIỮ NGUYÊN\n" +
        "//    Và: con không được ném exception MỚI mà cha không khai báo\n" +
        "\n" +
        "// CÁCH TRÁNH: ưu tiên COMPOSITION hơn kế thừa; dùng interface hẹp thay vì\n" +
        "// kế thừa class; và nếu lớp con phải ném UnsupportedOperationException\n" +
        "// thì đó là dấu hiệu hệ phân cấp SAI.",
    },
  ],
},
{
  cat: 'SOLID',
  q: 'I — Interface Segregation Principle (ISP)?',
  answer:
    'Client **không nên bị buộc phụ thuộc vào method nó không dùng**. Chia interface "béo" thành nhiều interface nhỏ, tập trung, theo nhóm client.\n\n' +
    'Vi phạm: một interface `Worker` có `work()`, `eat()`, `sleep()` — `RobotWorker` phải implements `eat()`/`sleep()` vô nghĩa. Đổi `eat()` → recompile/ảnh hưởng cả client không quan tâm.\n\n' +
    'Sửa: `Workable`, `Eatable`, `Sleepable` riêng; class chỉ implements cái nó cần.',
  essence:
    'ISP: interface là hợp đồng theo góc nhìn của **client**, không phải danh mục mọi khả năng của implementation. Interface nhỏ → coupling nhỏ, dễ mock, dễ tiến hoá.',
  example:
    'Java `Collection` từng có xu hướng béo. Thiết kế tốt: `Iterable` (chỉ `iterator()`), tách khỏi `Collection` (thêm `size`, `add`…). Repository: thay `CrudRepository` cho service chỉ đọc bằng một interface `OrderReader { Optional<Order> findById(id); }` — service không thấy `save`/`delete`.',
  viz: {
    type: 'compare',
    corner: 'I — Interface Segregation',
    cols: ['Interface béo (Worker: work/eat/sleep)', 'Interface nhỏ (Workable, Eatable, Sleepable)'],
    rows: [
      ['RobotWorker', 'phải implements eat()/sleep() vô nghĩa', 'chỉ implements Workable'],
      ['Đổi eat()', 'recompile/ảnh hưởng cả client không quan tâm', 'chỉ ảnh hưởng client cần eat'],
      ['Interface là hợp đồng theo góc nhìn của', 'implementation (mọi khả năng)', 'client (chỉ cái nó dùng)'],
      ['Coupling / mock', 'lớn', 'nhỏ, dễ mock, dễ tiến hoá'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Đừng ép client phụ thuộc method nó không dùng",
      code:
        "// VI PHẠM — interface \"béo\"\n" +
        "public interface Worker {\n" +
        "    void work();\n" +
        "    void eat();\n" +
        "    void sleep();\n" +
        "    void attendMeeting();\n" +
        "}\n" +
        "public class Robot implements Worker {\n" +
        "    public void work() { }\n" +
        "    public void eat() { throw new UnsupportedOperationException(); }    // vô nghĩa\n" +
        "    public void sleep() { throw new UnsupportedOperationException(); }\n" +
        "    public void attendMeeting() { throw new UnsupportedOperationException(); }\n" +
        "}\n" +
        "// Robot buộc phải cài đặt những thứ nó không có -> vi phạm cả ISP lẫn LSP.\n" +
        "\n" +
        "// TUÂN THỦ — tách thành các interface HẸP theo vai trò\n" +
        "public interface Workable { void work(); }\n" +
        "public interface Feedable { void eat(); }\n" +
        "public interface Sleepable { void sleep(); }\n" +
        "\n" +
        "public class Robot implements Workable { public void work() { } }\n" +
        "public class Human implements Workable, Feedable, Sleepable { ... }\n" +
        "\n" +
        "// VÍ DỤ THỰC TẾ HAY GẶP — repository béo:\n" +
        "public interface UserRepository {\n" +
        "    User findById(String id);\n" +
        "    List<User> findAll();\n" +
        "    void save(User u);\n" +
        "    void delete(String id);\n" +
        "    List<User> searchFullText(String q);      // chỉ màn hình tìm kiếm cần\n" +
        "    byte[] exportToExcel();                    // chỉ chức năng xuất báo cáo cần\n" +
        "}\n" +
        "// -> Test một service chỉ đọc phải mock CẢ 6 method.\n" +
        "\n" +
        "// TÁCH THEO NHU CẦU CỦA CLIENT (đây là điểm mấu chốt — chia theo client,\n" +
        "// không chia theo \"loại method\"):\n" +
        "public interface UserReader { User findById(String id); List<User> findAll(); }\n" +
        "public interface UserWriter { void save(User u); void delete(String id); }\n" +
        "public interface UserSearcher { List<User> searchFullText(String q); }\n" +
        "\n" +
        "@Service\n" +
        "public class ProfileService {\n" +
        "    private final UserReader users;      // chỉ phụ thuộc thứ mình DÙNG\n" +
        "}\n" +
        "// Lợi ích thật: test đơn giản hơn, và đổi phần ghi không ảnh hưởng phần đọc.",
    },
  ],
},
{
  cat: 'SOLID',
  q: 'D — Dependency Inversion Principle (DIP)?',
  answer:
    'a) Module cấp cao **không phụ thuộc** module cấp thấp; **cả hai** phụ thuộc **abstraction**.\n' +
    'b) Abstraction không phụ thuộc chi tiết; chi tiết phụ thuộc abstraction.\n\n' +
    'Điểm mấu chốt: **abstraction (interface) thuộc về tầng cao**, không phải tầng thấp. Tầng cao định nghĩa "tôi cần gì" (`interface NotificationSender`), tầng thấp implements ("tôi là EmailSender").\n\n' +
    'Kết quả: hướng phụ thuộc lúc compile bị "đảo" so với hướng gọi lúc runtime. Tầng cao không import tầng thấp.',
  essence:
    'DIP: "phụ thuộc vào cái ổn định (abstraction do bạn định nghĩa), không phụ thuộc cái hay đổi (implementation cụ thể, thư viện, DB)". Interface đặt cạnh người *dùng* nó, không cạnh người *implements* nó.',
  example:
    '`OrderService` (cao) cần lưu đơn. Sai: `import PostgresOrderDao`. Đúng: `OrderService` định nghĩa `interface OrderRepository` (trong package của nó); `PostgresOrderRepository` (tầng infra) implements nó và *phụ thuộc ngược lên* package domain. Đổi Postgres → Mongo không đụng domain.',
  viz: {
    type: 'flow',
    title: 'D — hướng phụ thuộc lúc compile bị "đảo" so với hướng gọi lúc runtime',
    nodes: ['OrderService (tầng cao) định nghĩa interface OrderRepository', 'Interface nằm TRONG package domain — "tôi cần gì"', 'PostgresOrderRepository (tầng infra) implements', 'Infra phụ thuộc NGƯỢC LÊN domain'],
    steps: [
      { to: 1, label: 'Abstraction thuộc về tầng cao, không phải tầng thấp' },
      { to: 3, label: 'Tầng cao KHÔNG import tầng thấp' },
      { to: 3, label: 'Đổi Postgres → Mongo không đụng domain. "Phụ thuộc cái ổn định, không phụ thuộc cái hay đổi"' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Cả hai cùng phụ thuộc vào trừu tượng",
      code:
        "// VI PHẠM — module cấp cao phụ thuộc TRỰC TIẾP vào cấp thấp\n" +
        "package com.example.domain;\n" +
        "public class OrderService {\n" +
        "    private final PostgresOrderRepository repo;      // phụ thuộc HẠ TẦNG\n" +
        "    private final SmtpEmailSender mailer;\n" +
        "}\n" +
        "// Domain giờ phụ thuộc vào Postgres và SMTP -> không test được nếu không\n" +
        "// có chúng, và đổi hạ tầng là phải sửa domain.\n" +
        "\n" +
        "// TUÂN THỦ — và điểm QUAN TRỌNG NHẤT là interface thuộc về ĐÂU:\n" +
        "package com.example.domain;              // <- interface nằm ở TẦNG DOMAIN\n" +
        "public interface OrderRepository {\n" +
        "    Optional<Order> findById(OrderId id);\n" +
        "    void save(Order order);\n" +
        "}\n" +
        "public class OrderService {\n" +
        "    private final OrderRepository repo;   // phụ thuộc TRỪU TƯỢNG của chính mình\n" +
        "}\n" +
        "\n" +
        "package com.example.infrastructure;      // <- cài đặt nằm ở TẦNG HẠ TẦNG\n" +
        "public class PostgresOrderRepository implements OrderRepository { }\n" +
        "\n" +
        "// -> HƯỚNG PHỤ THUỘC BỊ ĐẢO NGƯỢC: hạ tầng phụ thuộc domain, không phải\n" +
        "//    ngược lại. Đây chính là ý nghĩa của chữ \"Inversion\".\n" +
        "// Nếu interface nằm ở tầng hạ tầng thì domain vẫn phải import hạ tầng ->\n" +
        "// chưa đảo ngược được gì cả. Đây là lỗi rất phổ biến.\n" +
        "\n" +
        "// KIỂM CHỨNG BẰNG TEST KIẾN TRÚC:\n" +
        "@ArchTest\n" +
        "static final ArchRule domain_khong_phu_thuoc_ha_tang =\n" +
        "    noClasses().that().resideInAPackage(\"..domain..\")\n" +
        "        .should().dependOnClassesThat()\n" +
        "        .resideInAnyPackage(\"..infrastructure..\", \"org.springframework..\",\n" +
        "                            \"jakarta.persistence..\");\n" +
        "\n" +
        "// LỢI ÍCH THẬT: domain test được mà không cần database; đổi Postgres sang\n" +
        "// MongoDB chỉ cần viết cài đặt mới. Đây là nền tảng của Hexagonal\n" +
        "// Architecture và Clean Architecture.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'DRY — và khi "DRY" trở thành sai lầm (wrong abstraction)?',
  answer:
    '**DRY** (Don\u2019t Repeat Yourself): mỗi mẩu **kiến thức** nên có một biểu diễn duy nhất, có thẩm quyền. Tránh sửa cùng một logic ở nhiều nơi.\n\n' +
    'Nhưng: "code trông giống nhau" ≠ "cùng một kiến thức". Gộp hai đoạn code **tình cờ giống nhau** (nhưng thay đổi vì lý do khác nhau) tạo ra **wrong abstraction** — sau đó mỗi yêu cầu mới thêm một tham số/flag vào abstraction chung, nó phình thành mớ `if`.\n\n' +
    'Sandi Metz: **"duplication is far cheaper than the wrong abstraction"**. Khi nghi ngờ → chấp nhận lặp, chờ pattern rõ ràng rồi mới trừu tượng hoá.',
  essence:
    'DRY là về **kiến thức trùng lặp**, không phải **ký tự trùng lặp**. Rule of three: thấy lần thứ ba mới trừu tượng hoá. Wrong abstraction khó gỡ hơn duplication nhiều.',
  example:
    'Hai hàm `validateOrderForm` và `validateProfileForm` tình cờ có 5 dòng giống nhau. Gộp thành `validateForm(data, type)` → sau 6 tháng nó có 8 tham số boolean và 40 dòng `if (type == ORDER)`. Đáng ra cứ để trùng 5 dòng.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['DRY đúng (cùng KIẾN THỨC)', 'Wrong abstraction (tình cờ giống)'],
    rows: [
      ['Gộp gì', 'một mẩu kiến thức có nhiều biểu diễn', 'code trông giống nhau nhưng đổi vì lý do khác nhau'],
      ['Sau vài yêu cầu mới', 'ổn định', 'thêm flag/tham số → phình thành mớ if'],
      ['Chi phí gỡ', '—', 'khó hơn duplication nhiều'],
      ['Quy tắc', 'rule of three: lần thứ ba mới trừu tượng hoá', '"duplication is far cheaper than the wrong abstraction"'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Trùng lặp KIẾN THỨC, không phải trùng lặp KÝ TỰ",
      code:
        "// DRY nói về KIẾN THỨC: \"mỗi mẩu kiến thức phải có MỘT biểu diễn duy nhất,\n" +
        "// rõ ràng, có thẩm quyền trong hệ thống.\"\n" +
        "// KHÔNG phải \"hai đoạn code trông giống nhau thì phải gộp lại\".\n" +
        "\n" +
        "// TRÙNG LẶP THẬT (nên gộp) — cùng MỘT quy tắc nghiệp vụ:\n" +
        "if (order.total().isGreaterThan(Money.vnd(1_000_000))) applyDiscount();   // chỗ A\n" +
        "if (order.total().isGreaterThan(Money.vnd(1_000_000))) sendVipEmail();    // chỗ B\n" +
        "// -> Quy tắc \"đơn lớn\" xuất hiện hai chỗ. Đổi ngưỡng phải sửa cả hai.\n" +
        "public boolean isLargeOrder() { return total.isGreaterThan(LARGE_ORDER_THRESHOLD); }\n" +
        "\n" +
        "// TRÙNG LẶP GIẢ (KHÔNG nên gộp) — code giống nhau NGẪU NHIÊN:\n" +
        "class UserValidator    { void validate(User u)    { if (u.name() == null) throw ...; } }\n" +
        "class ProductValidator { void validate(Product p) { if (p.name() == null) throw ...; } }\n" +
        "// Trông giống nhau, nhưng chúng tiến hoá ĐỘC LẬP. Gộp lại thành\n" +
        "// GenericValidator rồi sau này quy tắc user đổi mà product không đổi ->\n" +
        "// phải thêm cờ, thêm điều kiện -> trừu tượng trở thành đống hỗn độn.\n" +
        "\n" +
        "// \"WRONG ABSTRACTION\" (Sandi Metz): \"Duplication is far cheaper than the\n" +
        "// wrong abstraction.\" Trùng lặp thì dễ sửa; trừu tượng sai thì rất khó gỡ,\n" +
        "// vì mọi người tiếp tục thêm tham số vào nó thay vì tách ra.\n" +
        "\n" +
        "// DẤU HIỆU TRỪU TƯỢNG SAI:\n" +
        "//  - method có nhiều tham số boolean điều khiển hành vi\n" +
        "//  - if/else bên trong để phân biệt \"trường hợp của A\" và \"của B\"\n" +
        "//  - đọc tên method không hiểu nó làm gì cho ngữ cảnh của mình\n" +
        "//  - sửa cho một bên dùng thì làm hỏng bên kia\n" +
        "\n" +
        "// QUY TẮC THỰC DỤNG: chờ tới lần thứ BA. Hai lần trùng lặp thì cứ để đó;\n" +
        "// tới lần thứ ba bạn đã đủ dữ liệu để thấy đâu là phần THẬT SỰ chung.\n" +
        "// Và khi trừu tượng đã sai: hãy INLINE nó trở lại rồi tách theo cách khác.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'KISS và YAGNI — ý nghĩa và cách áp dụng?',
  answer:
    '**KISS** (Keep It Simple, Stupid): chọn giải pháp đơn giản nhất **đủ giải quyết vấn đề hiện tại**. Phức tạp phải "kiếm được chỗ đứng" (đo bằng lợi ích cụ thể).\n\n' +
    '**YAGNI** (You Aren\u2019t Gonna Need It): đừng xây tính năng/tính linh hoạt vì "có thể sau này cần". Xây khi thực sự cần. Lý do: dự đoán tương lai thường sai; code thừa vẫn phải bảo trì, test, đọc; refactor khi cần thường rẻ hơn tưởng.\n\n' +
    'Kết hợp với "làm cho refactor rẻ" (test tốt, ranh giới rõ) → bạn dám bắt đầu đơn giản.',
  essence:
    'KISS + YAGNI: xây cho vấn đề bạn *có*, không phải vấn đề bạn *tưởng tượng*. Sự linh hoạt không dùng đến là nợ, không phải tài sản. Đơn giản + test tốt cho phép tiến hoá khi vấn đề thật xuất hiện.',
  example:
    'Yêu cầu: lưu file người dùng upload. YAGNI: dùng local disk / một bucket S3. KHÔNG: xây abstraction `StorageProvider` với 4 implementation (S3/GCS/Azure/local), config phức tạp, "phòng khi đổi cloud". 3 năm sau vẫn dùng S3 — abstraction đó chỉ tốn công.',
  viz: {
    type: 'tree',
    title: 'Xây cho vấn đề bạn CÓ, không phải vấn đề bạn tưởng tượng',
    root: {
      label: 'Sự linh hoạt không dùng đến là nợ, không phải tài sản',
      children: [
        { label: 'KISS', note: 'giải pháp đơn giản nhất đủ giải quyết vấn đề HIỆN TẠI; phức tạp phải kiếm được chỗ đứng' },
        { label: 'YAGNI', note: 'đừng xây "phòng khi sau này cần" — dự đoán tương lai thường sai; code thừa vẫn phải bảo trì/test/đọc' },
        { label: 'Làm cho refactor rẻ', note: 'test tốt + ranh giới rõ → dám bắt đầu đơn giản' },
        { label: 'Ví dụ', note: 'lưu file: dùng S3 trực tiếp, không StorageProvider 4 impl "phòng khi đổi cloud"' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Đơn giản nhất chạy được, và đừng làm thứ chưa cần",
      code:
        "// KISS (Keep It Simple, Stupid) — chọn giải pháp ĐƠN GIẢN NHẤT giải quyết\n" +
        "// được vấn đề HIỆN TẠI.\n" +
        "\n" +
        "// PHỨC TẠP KHÔNG CẦN THIẾT:\n" +
        "public interface UserRepositoryFactory {\n" +
        "    <T extends UserRepository> T create(Class<T> type, RepositoryConfig cfg);\n" +
        "}\n" +
        "// ĐƠN GIẢN:\n" +
        "public interface UserRepository { Optional<User> findById(String id); }\n" +
        "\n" +
        "// YAGNI (You Aren\u0027t Gonna Need It) — đừng xây thứ bạn NGHĨ là sẽ cần\n" +
        "public class OrderService {\n" +
        "    // \"Sau này có thể cần nhiều loại database\" -> viết sẵn abstraction cho\n" +
        "    //  5 loại DB, trong khi 3 năm qua vẫn chỉ dùng Postgres.\n" +
        "    // \"Sau này có thể cần đa ngôn ngữ\" -> hạ tầng i18n phức tạp cho một\n" +
        "    //  sản phẩm chỉ bán trong nước.\n" +
        "}\n" +
        "// CHI PHÍ CỦA CODE KHÔNG DÙNG (thường bị đánh giá thấp):\n" +
        "//  - phải đọc, phải hiểu, phải bảo trì, phải test\n" +
        "//  - cản trở refactor (phải giữ cho nó tiếp tục biên dịch được)\n" +
        "//  - và khi nhu cầu THẬT xuất hiện, nó thường KHÁC với dự đoán\n" +
        "//    -> phải bỏ đi và làm lại\n" +
        "\n" +
        "// ÁP DỤNG:\n" +
        "// 1) Viết cách ĐƠN GIẢN NHẤT trước; refactor khi có áp lực THẬT.\n" +
        "// 2) Quy tắc BA: trừu tượng hoá ở lần thứ ba, không phải lần đầu.\n" +
        "// 3) Trả lời được câu \"hôm nay ai cần cái này\" thì mới làm.\n" +
        "// 4) Phân biệt: YAGNI áp dụng cho TÍNH NĂNG và TRỪU TƯỢNG, KHÔNG áp dụng\n" +
        "//    cho chất lượng nền tảng (test, xử lý lỗi, bảo mật, quan sát được).\n" +
        "\n" +
        "// KISS/YAGNI KHÔNG có nghĩa là viết cẩu thả. Code đơn giản vẫn phải\n" +
        "// đúng, rõ ràng, và có test.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'Composition over inheritance — vì sao?',
  answer:
    'Ưu tiên **ghép object** (has-a) hơn **kế thừa** (is-a) để tái dùng code và tạo biến thể.\n\n' +
    'Vấn đề của kế thừa:\n' +
    '- **Coupling chặt** subclass–superclass; đổi superclass dễ phá subclass ("fragile base class").\n' +
    '- **Tĩnh** — quyết định lúc compile, không đổi runtime.\n' +
    '- **Bùng nổ class** với nhiều trục biến thể.\n' +
    '- **Phá đóng gói** — subclass thấy protected member, phụ thuộc chi tiết impl của parent.\n' +
    '- Ép một hệ phân cấp duy nhất (Java single inheritance).\n\n' +
    'Composition: linh hoạt (đổi runtime), ghép nhiều hành vi, interface rõ ràng, dễ test. Dùng kế thừa chỉ khi thật sự là "is-a" + tuân thủ LSP + hierarchy ổn định.',
  essence:
    'Kế thừa nói "tôi LÀ một loại X và thừa hưởng mọi thứ của X". Composition nói "tôi CÓ một X và dùng đúng cái tôi cần". Composition linh hoạt hơn, ít giòn hơn — đó là mặc định; kế thừa là ngoại lệ có lý do.',
  example:
    'Thay `class Car extends Engine` (vô lý) và `class SportsCar extends Car` (cứng): `class Car { private Engine engine; private Transmission transmission; }` — lắp engine V8 hay điện, hộp số tự động hay sàn, đổi runtime, test với mock engine.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Kế thừa (is-a)', 'Composition (has-a)'],
    rows: [
      ['Coupling', 'chặt subclass–superclass (fragile base class)', 'qua interface rõ ràng'],
      ['Thời điểm', 'tĩnh (compile-time)', 'đổi runtime, ghép nhiều hành vi'],
      ['Nhiều trục biến thể', 'bùng nổ class', 'ghép đúng cái cần'],
      ['Đóng gói', 'subclass thấy protected member của parent', 'chỉ dùng interface công khai'],
      ['Khi nào', 'thật sự "is-a" + LSP + hierarchy ổn định', 'mặc định'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Kế thừa là gắn kết chặt nhất trong lập trình hướng đối tượng",
      code:
        "// KẾ THỪA — vấn đề\n" +
        "public class Stack<E> extends ArrayList<E> {      // SAI\n" +
        "    public void push(E e) { add(e); }\n" +
        "    public E pop() { return remove(size() - 1); }\n" +
        "}\n" +
        "Stack<String> s = new Stack<>();\n" +
        "s.add(0, \"chen ngang\");        // ArrayList lộ ra method PHÁ VỠ ngữ nghĩa stack\n" +
        "// Lớp con thừa hưởng MỌI method của cha, kể cả những cái làm hỏng bất biến.\n" +
        "\n" +
        "// COMPOSITION — chỉ lộ ra cái mình muốn\n" +
        "public class Stack<E> {\n" +
        "    private final List<E> items = new ArrayList<>();     // GIỮ, không kế thừa\n" +
        "    public void push(E e) { items.add(e); }\n" +
        "    public E pop() { return items.remove(items.size() - 1); }\n" +
        "    public boolean isEmpty() { return items.isEmpty(); }\n" +
        "    // KHÔNG có add(index, e) -> không ai phá được ngữ nghĩa\n" +
        "}\n" +
        "\n" +
        "// BỐN VẤN ĐỀ CỦA KẾ THỪA:\n" +
        "// 1) LỘ CHI TIẾT của lớp cha ra qua API của lớp con\n" +
        "// 2) VẤN ĐỀ LỚP CƠ SỞ MONG MANH: sửa lớp cha có thể làm vỡ lớp con\n" +
        "//    một cách âm thầm (ví dụ kinh điển: HashSet.addAll gọi add() bên trong\n" +
        "//    -> lớp con override cả hai sẽ đếm hai lần)\n" +
        "// 3) CHỈ MỘT lớp cha, và cố định LÚC BIÊN DỊCH\n" +
        "// 4) Bùng nổ tổ hợp khi có nhiều chiều biến thiên\n" +
        "\n" +
        "// KHI NÀO KẾ THỪA VẪN ĐÚNG:\n" +
        "//  - quan hệ THẬT SỰ là \"LÀ MỘT\", và ĐÚNG với LSP\n" +
        "//  - bạn SỞ HỮU cả lớp cha lẫn lớp con (cùng một module)\n" +
        "//  - lớp cha được THIẾT KẾ để kế thừa (có tài liệu về hợp đồng, dùng final\n" +
        "//    cho method không được override)\n" +
        "//  - template method: khung cố định, lớp con điền chi tiết\n" +
        "\n" +
        "// \"Ưu tiên composition hơn kế thừa\" — ƯU TIÊN, không phải CẤM.\n" +
        "// Java hiện đại: interface + default method cho phép chia sẻ hành vi mà\n" +
        "// không cần kế thừa class; và record + sealed thay nhiều nhu cầu kế thừa.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'Law of Demeter (Principle of Least Knowledge)?',
  answer:
    'Một method chỉ nên gọi method của: **chính object đó**, **tham số của nó**, **object nó tạo ra**, **field trực tiếp** của nó. **Không** gọi method trên object trả về từ method khác ("không nói chuyện với người lạ").\n\n' +
    'Vi phạm = **train wreck**: `order.getCustomer().getAddress().getCity().getName()` — code này phụ thuộc cấu trúc nội tại của 4 class; đổi bất kỳ cái nào là hỏng.\n\n' +
    'Sửa: thêm method trung gian: `order.getShippingCityName()` — order tự đi lấy, client không cần biết đường đi.',
  essence:
    'LoD giảm coupling với **cấu trúc** của object khác. "Tell, don\u2019t navigate": bảo object làm việc, đừng đi xuyên qua nó để thao tác trên ruột gan của nó. Cân bằng: đừng tạo hàng loạt method uỷ quyền vô nghĩa cho data object thuần (DTO).',
  example:
    'Vi phạm: `if (user.getAccount().getSubscription().getPlan().isPremium())`. Tuân thủ: `if (user.hasPremiumPlan())` — `User` tự trả lời, cấu trúc `Account/Subscription/Plan` được tự do refactor. (LoD ít áp cho DTO/record thuần dữ liệu.)',
  viz: {
    type: 'flow',
    title: '"Tell, don\'t navigate" — bảo object làm việc, đừng đi xuyên qua ruột gan nó',
    nodes: ['Train wreck: order.getCustomer().getAddress().getCity().getName()', 'Phụ thuộc cấu trúc nội tại của 4 class', 'Đổi bất kỳ class nào → hỏng', 'Thêm method trung gian: order.getShippingCityName()'],
    steps: [
      { to: 1, label: 'Method chỉ nên gọi method của: chính nó, tham số, object nó tạo, field trực tiếp' },
      { to: 3, label: 'order tự đi lấy, client không cần biết đường đi' },
      { to: 3, label: 'Cân bằng: đừng tạo hàng loạt method uỷ quyền vô nghĩa cho DTO thuần' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Chỉ nói chuyện với bạn thân",
      code:
        "// QUY TẮC: một method chỉ nên gọi method của\n" +
        "//  1) chính nó, 2) tham số của nó, 3) object nó tự tạo, 4) field của nó.\n" +
        "// KHÔNG gọi method trên object nhận được TỪ một lời gọi khác.\n" +
        "\n" +
        "// VI PHẠM — \"chuỗi tàu hoả\"\n" +
        "public class OrderService {\n" +
        "    public void process(Order order) {\n" +
        "        String city = order.getCustomer().getAddress().getCity().getName();\n" +
        "        // Phụ thuộc vào cấu trúc BÊN TRONG của Customer, Address, City.\n" +
        "        // Đổi Address -> vỡ code ở đây, dù OrderService không liên quan gì\n" +
        "        // tới địa chỉ.\n" +
        "        // Và mỗi mắt xích đều có thể là null.\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// TUÂN THỦ — hỏi cái mình cần, không đi lấy\n" +
        "public class OrderService {\n" +
        "    public void process(Order order) {\n" +
        "        String city = order.shippingCityName();     // Order tự lo phần bên trong\n" +
        "    }\n" +
        "}\n" +
        "public class Order {\n" +
        "    public String shippingCityName() { return customer.cityName(); }\n" +
        "}\n" +
        "public class Customer {\n" +
        "    public String cityName() { return address.cityName(); }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH: giảm gắn kết; đổi cấu trúc nội bộ của Address chỉ ảnh hưởng\n" +
        "// Customer, không lan ra toàn hệ thống.\n" +
        "\n" +
        "// NGOẠI LỆ QUAN TRỌNG — không áp dụng cho:\n" +
        "//  - FLUENT API và builder (mỗi lời gọi trả về CHÍNH nó)\n" +
        "builder.id(\"1\").name(\"a\").build();\n" +
        "//  - STREAM API\n" +
        "list.stream().filter(...).map(...).toList();\n" +
        "//  - cấu trúc dữ liệu THUẦN (DTO, record) — chúng vốn là để đọc dữ liệu\n" +
        "// Quy tắc này nói về đối tượng có HÀNH VI, không nói về dữ liệu.\n" +
        "\n" +
        "// Liên quan chặt với \"Tell, Don\u0027t Ask\": thay vì LẤY dữ liệu ra rồi tự\n" +
        "// quyết định, hãy BẢO đối tượng làm việc đó.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'Tell, Don\u2019t Ask principle?',
  answer:
    'Đừng **hỏi** object về state rồi tự quyết định làm gì (ở ngoài object); thay vào đó **bảo** object làm việc — để logic + data ở cùng chỗ.\n\n' +
    'Vi phạm (feature envy): `if (account.getBalance() >= amount) { account.setBalance(account.getBalance() - amount); }` — logic "trừ tiền" nằm ngoài `Account`.\n\n' +
    'Sửa: `account.withdraw(amount)` — `Account` tự kiểm tra và trừ, enforce invariant (không âm), có thể throw. Logic thuộc về nơi có dữ liệu.',
  essence:
    '"Tell, don\u2019t ask" chống **anemic domain model** (object chỉ có getter/setter, logic ở service). Đặt hành vi cạnh dữ liệu → object bảo vệ được invariant của mình, code gọi ngắn gọn và khó dùng sai.',
  example:
    'Anemic: `OrderService.addItem(order, item) { order.getItems().add(item); order.setTotal(order.getTotal().plus(item.price())); }`. Rich: `order.addItem(item)` — `Order` tự cập nhật total, kiểm tra order chưa bị khoá, giới hạn số item. Không ai quên cập nhật total.',
  viz: {
    type: 'flow',
    title: 'Chống anemic domain model — đặt hành vi cạnh dữ liệu',
    nodes: ['ASK: account.getBalance()', 'Tự quyết định Ở NGOÀI object', 'Logic "trừ tiền" nằm ngoài Account', 'TELL: account.withdraw(amount)'],
    steps: [
      { to: 1, label: 'if (account.getBalance() >= amount) { account.setBalance(...) } — feature envy' },
      { to: 3, label: 'Account tự kiểm tra + trừ, enforce invariant (không âm), có thể throw' },
      { to: 3, label: 'Object bảo vệ được invariant của mình; code gọi ngắn gọn, khó dùng sai' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bảo đối tượng làm, đừng hỏi rồi tự làm hộ nó",
      code:
        "// ASK (hỏi rồi tự xử lý) — logic nghiệp vụ RÒ RỈ ra khỏi đối tượng\n" +
        "public class OrderService {\n" +
        "    public void applyDiscount(Order order) {\n" +
        "        if (order.getStatus() == Status.NEW                     // HỎI\n" +
        "            && order.getTotal().compareTo(THRESHOLD) > 0\n" +
        "            && order.getCustomer().getTier() == Tier.GOLD) {\n" +
        "            order.setTotal(order.getTotal().multiply(0.9));     // rồi TỰ SỬA\n" +
        "        }\n" +
        "    }\n" +
        "}\n" +
        "// Vấn đề: quy tắc nghiệp vụ nằm ở SERVICE, còn dữ liệu nằm ở ORDER.\n" +
        "// Cùng một quy tắc sẽ bị lặp lại ở mọi service cần nó, và Order trở thành\n" +
        "// một túi dữ liệu không có hành vi (anemic domain model).\n" +
        "\n" +
        "// TELL (bảo nó làm) — logic nằm CÙNG dữ liệu\n" +
        "public class Order {\n" +
        "    public void applyDiscountIfEligible() {          // BẢO nó làm\n" +
        "        if (isEligibleForDiscount()) {\n" +
        "            this.total = total.multiply(DISCOUNT_RATE);\n" +
        "        }\n" +
        "    }\n" +
        "    private boolean isEligibleForDiscount() {         // quy tắc nằm Ở ĐÂY\n" +
        "        return status == Status.NEW\n" +
        "            && total.isGreaterThan(THRESHOLD)\n" +
        "            && customer.isGold();\n" +
        "    }\n" +
        "}\n" +
        "public class OrderService {\n" +
        "    public void applyDiscount(Order order) {\n" +
        "        order.applyDiscountIfEligible();              // MỘT dòng\n" +
        "        repo.save(order);\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH:\n" +
        "//  - Order tự bảo vệ được BẤT BIẾN của mình (không ai setTotal bừa)\n" +
        "//  - quy tắc ở MỘT chỗ, đổi một lần\n" +
        "//  - test được Order mà không cần service, không cần database\n" +
        "\n" +
        "// NGOẠI LỆ: DTO, record dùng để truyền dữ liệu — chúng SINH RA để bị \"hỏi\".\n" +
        "// Nguyên tắc này áp dụng cho ĐỐI TƯỢNG NGHIỆP VỤ có hành vi.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'Coupling và Cohesion — hai thước đo chất lượng thiết kế?',
  answer:
    '- **Cohesion** (độ gắn kết *trong* một module): các phần của module có liên quan chặt chẽ với nhau, cùng phục vụ một mục đích không? **Cao là tốt** — module làm một việc rõ ràng.\n' +
    '- **Coupling** (độ phụ thuộc *giữa* các module): module phụ thuộc bao nhiêu vào chi tiết của module khác? **Thấp là tốt** — đổi module này không kéo theo module kia.\n\n' +
    'Mục tiêu: **high cohesion, low coupling**. Hầu hết pattern và nguyên lý (SRP, DIP, interface, event) đều nhằm dịch chuyển theo hướng này.\n\n' +
    'Loại coupling từ tốt tới xấu: qua abstraction/message → qua interface cụ thể → qua class cụ thể → qua shared mutable state / DB schema.',
  essence:
    'Đây là "hai chỉ số vàng". Cohesion cao: mỗi module có lý do tồn tại rõ ràng. Coupling thấp: bạn có thể hiểu/đổi/test một module mà không phải nạp cả hệ thống vào đầu. Mọi refactoring tốt cải thiện ít nhất một trong hai.',
  example:
    'Low cohesion: `UtilManager` với 40 method không liên quan (format date, gọi API, parse XML, tính thuế). High coupling: `OrderService` đọc trực tiếp bảng `inventory` của service khác. Sửa: tách util theo chủ đề; order gọi inventory qua interface/event.',
  viz: {
    type: 'quadrant',
    title: 'Hai chỉ số vàng — mọi refactoring tốt cải thiện ít nhất một',
    x: ['coupling cao', 'coupling thấp'],
    y: ['cohesion thấp', 'cohesion cao'],
    items: [
      { label: 'Mục tiêu', qx: 1, qy: 1 },
      { label: 'God object / UtilManager', qx: 0, qy: 0 },
      { label: 'Module gọn nhưng dính chặt', qx: 0, qy: 1 },
      { label: 'Module cô lập nhưng lộn xộn', qx: 1, qy: 0 },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Gắn kết thấp giữa các module, gắn bó cao bên trong module",
      code:
        "// COHESION CAO — mọi thứ trong class phục vụ MỘT mục đích rõ ràng\n" +
        "public class OrderPriceCalculator {\n" +
        "    public Money subtotal(List<OrderLine> lines) { }\n" +
        "    public Money discount(Customer c, Money subtotal) { }\n" +
        "    public Money tax(Money amount, TaxRegion region) { }\n" +
        "    public Money total(Order o) { }\n" +
        "    // Mọi method đều về TÍNH GIÁ. Đọc tên class là biết tìm gì ở đâu.\n" +
        "}\n" +
        "\n" +
        "// COHESION THẤP — class \"tiện ích\" chứa mọi thứ không biết để đâu\n" +
        "public class Utils {\n" +
        "    public static String formatDate(Date d) { }\n" +
        "    public static Money calculateTax(Money m) { }\n" +
        "    public static void sendEmail(String to) { }\n" +
        "    public static byte[] compress(byte[] data) { }\n" +
        "    // Không có chủ đề chung -> ai cũng import, ai cũng sửa, luôn xung đột merge.\n" +
        "}\n" +
        "\n" +
        "// COUPLING THẤP — phụ thuộc qua TRỪU TƯỢNG, ít và rõ ràng\n" +
        "public class OrderService {\n" +
        "    private final OrderRepository repo;        // interface\n" +
        "    private final PaymentGateway gateway;      // interface\n" +
        "}\n" +
        "\n" +
        "// COUPLING CAO — phụ thuộc vào CHI TIẾT của người khác\n" +
        "public class OrderService {\n" +
        "    public void process(Order o) {\n" +
        "        o.getCustomer().getAddress().getCity();      // biết cấu trúc bên trong\n" +
        "        PostgresConnection conn = ...;               // biết loại database\n" +
        "        new SmtpClient(\"smtp.gmail.com\").send(...);  // biết nhà cung cấp mail\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// MỤC TIÊU: HIGH COHESION, LOW COUPLING. Hai thước đo này thường đi cùng\n" +
        "// nhau — tách đúng theo trách nhiệm thì cả hai đều cải thiện.\n" +
        "\n" +
        "// ĐO ĐƯỢC:\n" +
        "//  - số import của một class (nhiều -> coupling cao)\n" +
        "//  - fan-in / fan-out trong sơ đồ phụ thuộc\n" +
        "//  - LCOM (thiếu gắn bó): method không dùng chung field nào -> cohesion thấp\n" +
        "//  - thực tế nhất: đổi một yêu cầu nghiệp vụ phải sửa BAO NHIÊU file?",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'God Object, Anemic Domain Model, Spaghetti — nhận biết và sửa?',
  answer:
    '- **God Object / God Class**: một class biết/làm quá nhiều (hàng nghìn dòng, chục phụ thuộc, mọi thứ đi qua nó). Sửa: tách theo trách nhiệm (SRP), trích các nhóm method + field liên quan ra class riêng.\n' +
    '- **Anemic Domain Model**: entity chỉ có getter/setter, không hành vi; mọi logic nằm ở "service" → thực chất là lập trình thủ tục đội lốt OOP. Sửa: chuyển invariant + hành vi vào entity/aggregate ("tell, don\u2019t ask").\n' +
    '- **Spaghetti code**: luồng điều khiển rối, không có cấu trúc/ranh giới rõ, copy-paste khắp nơi. Sửa: trích hàm, đặt tên, tách module, thêm test rồi refactor dần.',
  essence:
    'Ba anti-pattern này đều là **thiếu ranh giới / thiếu trách nhiệm rõ ràng**. God object = một chỗ ôm hết; anemic = data và logic bị xé rời; spaghetti = không có chỗ nào rõ ràng. Thuốc chung: xác định trách nhiệm, tách, đặt tên, che chắn bằng test.',
  example:
    'God object `ApplicationManager` (3000 dòng): xử lý user, order, payment, email, report. Tách dần: trích `UserManager`, rồi `OrderProcessor`, rồi... Anemic: `Order` chỉ có setter → gom `addItem/removeItem/applyDiscount/checkout` vào `Order`, service chỉ điều phối.',
  viz: {
    type: 'tree',
    title: 'Thuốc chung: xác định trách nhiệm, tách, đặt tên, che chắn bằng test',
    root: {
      label: 'Ba anti-pattern = thiếu ranh giới / thiếu trách nhiệm rõ ràng',
      children: [
        { label: 'God Object', note: 'một class biết/làm quá nhiều (nghìn dòng, chục phụ thuộc) → tách theo SRP, trích nhóm method+field liên quan' },
        { label: 'Anemic Domain Model', note: 'entity chỉ getter/setter, logic ở "service" → lập trình thủ tục đội lốt OOP. Chuyển invariant + hành vi vào entity ("tell, don\'t ask")' },
        { label: 'Spaghetti code', note: 'luồng rối, không ranh giới, copy-paste khắp nơi → trích hàm, đặt tên, tách module, thêm test rồi refactor dần' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba anti-pattern phổ biến nhất",
      code:
        "// 1) GOD OBJECT — một class biết và làm mọi thứ\n" +
        "public class OrderManager {                    // 3000 dòng\n" +
        "    public void createOrder() { }\n" +
        "    public void calculatePrice() { }\n" +
        "    public void sendEmail() { }\n" +
        "    public void generateInvoice() { }\n" +
        "    public void updateInventory() { }\n" +
        "    public void processPayment() { }\n" +
        "    // ...50 method nữa\n" +
        "}\n" +
        "// NHẬN BIẾT: file rất dài, tên chung chung (Manager/Processor/Handler/Service),\n" +
        "// nhiều đội cùng sửa, mọi thay đổi đều đụng vào nó.\n" +
        "// SỬA: tách theo NGUỒN THAY ĐỔI (SRP), từng bước một, có test bảo vệ.\n" +
        "\n" +
        "// 2) ANEMIC DOMAIN MODEL — entity chỉ có getter/setter, logic ở service\n" +
        "public class Order {\n" +
        "    private Status status;\n" +
        "    public Status getStatus() { return status; }\n" +
        "    public void setStatus(Status s) { this.status = s; }   // ai cũng đặt được\n" +
        "}\n" +
        "public class OrderService {\n" +
        "    public void ship(Order o) {\n" +
        "        if (o.getStatus() != PAID) throw new IllegalStateException();\n" +
        "        o.setStatus(SHIPPED);              // quy tắc nằm Ở ĐÂY, không ở Order\n" +
        "    }\n" +
        "}\n" +
        "// VẤN ĐỀ: Order không tự bảo vệ được bất biến; quy tắc bị lặp ở mọi service.\n" +
        "// SỬA: chuyển hành vi VÀO entity (Tell Don\u0027t Ask):\n" +
        "public class Order {\n" +
        "    public void ship() {\n" +
        "        if (status != PAID) throw new IllegalStateException(\"chưa thanh toán\");\n" +
        "        this.status = SHIPPED;\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// 3) SPAGHETTI CODE — luồng điều khiển rối, if lồng sâu, side effect khắp nơi\n" +
        "// NHẬN BIẾT: độ phức tạp cyclomatic cao, method dài, if lồng 5-6 tầng,\n" +
        "// biến toàn cục, không test được.\n" +
        "// SỬA: guard clause, tách method nhỏ, làm hàm thuần khiết khi có thể,\n" +
        "// và viết test TRƯỚC khi refactor.\n" +
        "\n" +
        "// ĐIỂM CHUNG của cả ba: chúng KHÔNG xuất hiện sau một đêm, mà tích tụ dần.\n" +
        "// Phòng bằng code review, giới hạn độ dài file/method trong linter, và\n" +
        "// dành thời gian định kỳ để trả nợ kỹ thuật.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'Code smell là gì? Vài smell phổ biến và ý nghĩa?',
  answer:
    'Code smell = dấu hiệu **bề mặt** gợi ý có vấn đề thiết kế sâu hơn (Fowler, *Refactoring*). Không phải bug, nhưng làm code khó thay đổi.\n\n' +
    '- **Long Method / Large Class**: làm quá nhiều → trích hàm/class.\n' +
    '- **Long Parameter List**: → gom thành object, hoặc Builder.\n' +
    '- **Feature Envy**: method quan tâm dữ liệu của class khác hơn của chính mình → chuyển method sang class đó.\n' +
    '- **Data Clumps**: cùng nhóm field xuất hiện cùng nhau khắp nơi → tạo một value object.\n' +
    '- **Primitive Obsession**: dùng `String`/`int` cho khái niệm domain (`email`, `money`) → tạo type.\n' +
    '- **Shotgun Surgery**: một thay đổi phải sửa nhiều class → gom trách nhiệm lại.\n' +
    '- **Switch Statements** lặp lại theo type → polymorphism/Strategy.',
  essence:
    'Smell là "linh cảm được đặt tên". Học danh sách smell + refactoring tương ứng cho bạn từ vựng để nhận ra và diễn đạt vấn đề trong code review, và một menu các bước sửa an toàn.',
  example:
    'Thấy `void sendEmail(String to, String from, String subject, String body, String cc, String bcc, boolean html, int priority)` → Long Parameter List + Data Clumps. Refactor: `EmailMessage` value object + `EmailSender.send(EmailMessage)`.',
  viz: {
    type: 'tree',
    title: '"Linh cảm được đặt tên" — smell + refactoring tương ứng',
    root: {
      label: 'Dấu hiệu bề mặt gợi ý vấn đề thiết kế sâu hơn (không phải bug)',
      children: [
        { label: 'Long Method / Large Class', note: '→ trích hàm/class' },
        { label: 'Long Parameter List', note: '→ gom thành object, hoặc Builder' },
        { label: 'Feature Envy', note: 'method quan tâm dữ liệu class khác → chuyển method sang class đó' },
        { label: 'Data Clumps', note: 'nhóm field xuất hiện cùng nhau → value object' },
        { label: 'Primitive Obsession', note: 'String/int cho khái niệm domain (email, money) → tạo type' },
        { label: 'Shotgun Surgery / Switch lặp theo type', note: '→ gom trách nhiệm / polymorphism' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Dấu hiệu, không phải lỗi",
      code:
        "// Code smell = dấu hiệu bề mặt cho thấy CÓ THỂ có vấn đề sâu hơn.\n" +
        "// Nó không phải bug — code vẫn chạy đúng — nhưng nó cản trở thay đổi.\n" +
        "\n" +
        "// 1) LONG METHOD — method dài hàng trăm dòng\n" +
        "//    -> Extract Method. Mỗi method làm một việc ở MỘT mức trừu tượng.\n" +
        "\n" +
        "// 2) LARGE CLASS / GOD OBJECT -> Extract Class theo trách nhiệm\n" +
        "\n" +
        "// 3) LONG PARAMETER LIST\n" +
        "public void createOrder(String id, String customerId, String street,\n" +
        "                        String city, String zip, String country, ...) { }\n" +
        "//    -> gom thành object: createOrder(OrderRequest req)\n" +
        "\n" +
        "// 4) DATA CLUMPS — cùng một nhóm tham số đi cùng nhau ở nhiều nơi\n" +
        "//    (street, city, zip, country) -> chúng muốn trở thành class Address\n" +
        "\n" +
        "// 5) PRIMITIVE OBSESSION — dùng String/int cho mọi thứ\n" +
        "public void transfer(String fromAccount, String toAccount, BigDecimal amount) { }\n" +
        "//    -> AccountId, Money: an toàn kiểu, và mang được quy tắc nghiệp vụ\n" +
        "public void transfer(AccountId from, AccountId to, Money amount) { }\n" +
        "\n" +
        "// 6) FEATURE ENVY — method dùng dữ liệu của class KHÁC nhiều hơn của mình\n" +
        "//    -> Move Method sang class đó\n" +
        "\n" +
        "// 7) SHOTGUN SURGERY — một thay đổi nhỏ phải sửa 10 file\n" +
        "//    -> logic bị rải rác; gom lại\n" +
        "\n" +
        "// 8) DIVERGENT CHANGE — một class phải sửa vì nhiều lý do khác nhau\n" +
        "//    -> vi phạm SRP; tách ra\n" +
        "\n" +
        "// 9) SWITCH STATEMENTS lặp lại ở nhiều nơi -> polymorphism/Strategy\n" +
        "\n" +
        "// 10) COMMENTS giải thích code khó hiểu\n" +
        "//     -> viết lại code cho tự giải thích. Comment nên nói VÌ SAO, không nói LÀM GÌ.\n" +
        "\n" +
        "// CÔNG CỤ: SonarQube, SpotBugs, PMD, IDE inspection.\n" +
        "// LƯU Ý: smell là GỢI Ý để xem xét, không phải mệnh lệnh phải sửa.\n" +
        "// Sửa khi nó THỰC SỰ cản trở công việc, đừng refactor vì linter kêu.",
    },
  ],
},
{
  cat: 'Tổng quan',
  q: 'Design pattern vs anti-pattern vs idiom — phân biệt?',
  answer:
    '- **Design pattern**: giải pháp **tốt, tái sử dụng** cho một vấn đề thiết kế thường gặp trong một ngữ cảnh.\n' +
    '- **Anti-pattern**: một "giải pháp" **thường được dùng nhưng phản tác dụng** — nhìn có vẻ hợp lý, thực tế tạo nhiều vấn đề hơn giải quyết (God Object, Golden Hammer, Premature Optimization, Copy-Paste Programming, Lava Flow).\n' +
    '- **Idiom**: một mẫu **đặc thù ngôn ngữ**, mức thấp hơn pattern (RAII trong C++, try-with-resources trong Java, list comprehension trong Python, `defer` trong Go). "Cách đúng để làm việc X trong ngôn ngữ Y".',
  essence:
    'Pattern = giải pháp tốt, đa ngôn ngữ. Idiom = giải pháp tốt, một ngôn ngữ. Anti-pattern = cái bẫy phổ biến. Biết cả ba: pattern để áp dụng, idiom để viết code "địa phương" tự nhiên, anti-pattern để tránh.',
  example:
    'Pattern: Strategy. Idiom (Java): dùng `Comparator` + method reference cho Strategy so sánh. Anti-pattern: "Golden Hammer" — áp Strategy cho mọi `if` vì "vừa học Strategy". Idiom (Java): `try (var conn = ds.getConnection()) {...}` cho cleanup tài nguyên.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Design pattern', 'Idiom', 'Anti-pattern'],
    rows: [
      ['Chất lượng', 'giải pháp tốt, tái sử dụng', 'giải pháp tốt, mức thấp hơn', 'nhìn hợp lý, thực tế phản tác dụng'],
      ['Phạm vi ngôn ngữ', 'đa ngôn ngữ', 'đặc thù một ngôn ngữ', 'phổ biến (cái bẫy)'],
      ['Ví dụ', 'Strategy, Observer', 'try-with-resources, RAII, list comprehension, defer', 'God Object, Golden Hammer, Premature Optimization'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Ba khái niệm ở ba mức",
      code:
        "// PATTERN — giải pháp ĐÃ ĐƯỢC KIỂM CHỨNG cho một vấn đề LẶP LẠI trong một\n" +
        "// NGỮ CẢNH nhất định. Không phụ thuộc ngôn ngữ.\n" +
        "public interface PaymentStrategy { PaymentResult pay(Money m); }   // Strategy\n" +
        "\n" +
        "// ANTI-PATTERN — giải pháp TRÔNG có vẻ hợp lý nhưng gây hậu quả xấu,\n" +
        "// và ĐÃ CÓ giải pháp tốt hơn được biết đến.\n" +
        "public class GlobalState {\n" +
        "    public static Map<String, Object> DATA = new HashMap<>();    // Singleton\n" +
        "}                                                                 // trạng thái toàn cục\n" +
        "// Các anti-pattern kinh điển: God Object, Golden Hammer (dùng một công cụ\n" +
        "// cho mọi việc), Copy-Paste Programming, Premature Optimization,\n" +
        "// Magic Numbers, Spaghetti Code, Distributed Monolith.\n" +
        "\n" +
        "// IDIOM — cách viết ĐẶC TRƯNG CHO MỘT NGÔN NGỮ, ở mức thấp hơn pattern.\n" +
        "// Ví dụ idiom Java:\n" +
        "try (var conn = ds.getConnection()) { }               // try-with-resources\n" +
        "list.stream().collect(groupingBy(Order::status));     // stream collector\n" +
        "Objects.requireNonNull(param, \"param\");               // kiểm tra null\n" +
        "private static class Holder { static final X I = new X(); }   // holder idiom\n" +
        "if (o instanceof String s && !s.isEmpty()) { }        // pattern matching\n" +
        "\n" +
        "// PHÂN BIỆT THEO PHẠM VI:\n" +
        "//  IDIOM   — mức NGÔN NGỮ, vài dòng code\n" +
        "//  PATTERN — mức THIẾT KẾ, vài class\n" +
        "//  ARCHITECTURAL PATTERN — mức HỆ THỐNG (layered, hexagonal, microservices)\n" +
        "\n" +
        "// ĐIỂM QUAN TRỌNG: cùng một giải pháp có thể là PATTERN trong ngữ cảnh này\n" +
        "// và ANTI-PATTERN trong ngữ cảnh khác. Singleton hợp lý cho logger, tai hại\n" +
        "// cho service có state. NGỮ CẢNH quyết định, không phải bản thân giải pháp.",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'Guard clause / early return vs if lồng nhau sâu?',
  answer:
    'Thay vì lồng `if` nhiều tầng (arrow code), kiểm tra các **điều kiện loại trừ / lỗi trước** và `return`/`throw` ngay → phần thân chính nằm ở mức thụt lề thấp nhất.\n\n' +
    '```\n// thay vì:\nif (user != null) { if (user.isActive()) { if (order.isValid()) { ... } } }\n// dùng:\nif (user == null) throw ...;\nif (!user.isActive()) throw ...;\nif (!order.isValid()) throw ...;\n... // happy path, không lồng\n```\n\n' +
    'Lợi: giảm cognitive load (không phải giữ nhiều điều kiện trong đầu), happy path rõ ràng, dễ thêm điều kiện mới.',
  essence:
    'Guard clause đảo "nếu mọi thứ ổn thì làm" thành "nếu có gì sai thì thoát sớm". Phần chính của hàm không bị chôn dưới 4 tầng ngoặc. Đây là refactoring nhỏ nhưng tác động lớn tới khả năng đọc.',
  example:
    '`processPayment`: guard `amount <= 0` → throw; `account.isFrozen()` → throw; `!hasSufficientFunds()` → throw. Sau 3 guard, phần "trừ tiền + ghi giao dịch + phát event" nằm phẳng, đọc như mô tả nghiệp vụ.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['If lồng sâu (arrow code)', 'Guard clause / early return'],
    rows: [
      ['Cấu trúc', 'if (ok) { if (ok2) { if (ok3) { ... } } }', 'if (!ok) throw; ... happy path phẳng'],
      ['Cognitive load', 'phải giữ nhiều điều kiện trong đầu', 'thoát sớm — quên được điều kiện đã qua'],
      ['Happy path', 'chôn dưới 4 tầng ngoặc', 'ở mức thụt lề thấp nhất, đọc như mô tả nghiệp vụ'],
      ['Thêm điều kiện mới', 'thêm một tầng lồng', 'thêm một guard'],
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Xử lý trường hợp lỗi trước, giữ luồng chính phẳng",
      code:
        "// IF LỒNG SÂU — luồng chính bị đẩy vào trong cùng, khó đọc\n" +
        "public Result process(Order order) {\n" +
        "    if (order != null) {\n" +
        "        if (order.getStatus() == Status.NEW) {\n" +
        "            if (order.getItems() != null && !order.getItems().isEmpty()) {\n" +
        "                if (order.getCustomer().isActive()) {\n" +
        "                    // luồng CHÍNH nằm ở tầng thứ 5\n" +
        "                    return doProcess(order);\n" +
        "                } else {\n" +
        "                    return Result.error(\"khách không hoạt động\");\n" +
        "                }\n" +
        "            } else {\n" +
        "                return Result.error(\"đơn rỗng\");\n" +
        "            }\n" +
        "        } else {\n" +
        "            return Result.error(\"trạng thái sai\");\n" +
        "        }\n" +
        "    } else {\n" +
        "        return Result.error(\"đơn null\");\n" +
        "    }\n" +
        "}\n" +
        "\n" +
        "// GUARD CLAUSE — loại bỏ trường hợp lỗi TRƯỚC, luồng chính nằm PHẲNG\n" +
        "public Result process(Order order) {\n" +
        "    if (order == null)                    return Result.error(\"đơn null\");\n" +
        "    if (order.status() != Status.NEW)     return Result.error(\"trạng thái sai\");\n" +
        "    if (order.items().isEmpty())          return Result.error(\"đơn rỗng\");\n" +
        "    if (!order.customer().isActive())     return Result.error(\"khách không hoạt động\");\n" +
        "\n" +
        "    return doProcess(order);              // luồng CHÍNH, không thụt lề\n" +
        "}\n" +
        "\n" +
        "// LỢI ÍCH:\n" +
        "//  - đọc từ trên xuống, không phải nhảy qua lại tìm else tương ứng\n" +
        "//  - điều kiện lỗi nằm cạnh thông báo lỗi của nó\n" +
        "//  - độ phức tạp cyclomatic giảm; thêm điều kiện mới chỉ là thêm một dòng\n" +
        "//  - luồng thành công luôn ở mức thụt lề thấp nhất\n" +
        "\n" +
        "// TRANH LUẬN \"một điểm ra duy nhất\": quy tắc đó có từ thời C với quản lý\n" +
        "// bộ nhớ thủ công. Trong Java có try-with-resources và finally, nhiều\n" +
        "// điểm return làm code RÕ HƠN nhiều.\n" +
        "\n" +
        "// ÁP DỤNG TƯƠNG TỰ trong vòng lặp: dùng continue để bỏ qua sớm.\n" +
        "for (Order o : orders) {\n" +
        "    if (o.isCancelled()) continue;        // thay cho if lồng cả thân vòng lặp\n" +
        "    process(o);\n" +
        "}",
    },
  ],
},
{
  cat: 'Nguyên lý',
  q: 'Defensive programming: fail-fast, validate ở biên, immutability?',
  answer:
    '- **Fail fast**: kiểm tra tiền điều kiện ngay đầu method (`Objects.requireNonNull`, `if (x < 0) throw`), phát hiện lỗi tại nguồn thay vì `NullPointerException` bí ẩn 10 stack frame sau.\n' +
    '- **Validate ở biên**: dữ liệu bên ngoài (API request, file, message) được validate **một lần tại điểm vào**; dữ liệu bên trong hệ thống được **tin tưởng** (không validate lại khắp nơi).\n' +
    '- **Immutability**: object bất biến không thể bị đưa vào trạng thái xấu sau khi tạo → bớt phải "phòng thủ".\n' +
    '- **Copy phòng thủ**: khi nhận/trả collection mutable từ ngoài, copy để không ai sửa được state nội bộ.',
  essence:
    '"Phòng thủ ở biên, tin tưởng bên trong": validate mạnh tại ranh giới (nơi dữ liệu không đáng tin đi vào), rồi dùng type + immutability để giữ dữ liệu bên trong luôn hợp lệ mà không cần check lại mọi nơi.',
  example:
    'Controller validate `CreateOrderRequest` (`@Valid`, business check) → chuyển thành `Order` aggregate hợp lệ. `OrderService`, `OrderRepository` **không** validate lại "email đúng format không" — chúng nhận `Email` value object đã đảm bảo hợp lệ từ lúc tạo.',
  viz: {
    type: 'tree',
    title: '"Phòng thủ ở biên, tin tưởng bên trong"',
    root: {
      label: 'Validate mạnh tại ranh giới → type + immutability giữ dữ liệu bên trong luôn hợp lệ',
      children: [
        { label: 'Fail fast', note: 'kiểm tiền điều kiện ngay đầu method (Objects.requireNonNull) — lỗi tại nguồn, không NPE bí ẩn 10 frame sau' },
        { label: 'Validate ở biên', note: 'dữ liệu ngoài (API, file, message) validate MỘT LẦN tại điểm vào; dữ liệu trong được tin tưởng' },
        { label: 'Immutability', note: 'object bất biến không thể bị đưa vào trạng thái xấu sau khi tạo' },
        { label: 'Copy phòng thủ', note: 'khi nhận/trả collection mutable từ ngoài — không ai sửa được state nội bộ' },
      ],
    },
  },
  demo: [
    {
      lang: "java",
      title: "Ba kỹ thuật, và chỗ đặt chúng",
      code:
        "// 1) VALIDATE Ở BIÊN — kiểm tra MỘT LẦN ở nơi dữ liệu vào hệ thống,\n" +
        "//    sau đó tin tưởng dữ liệu bên trong.\n" +
        "@PostMapping(\"/orders\")\n" +
        "public Order create(@Valid @RequestBody CreateOrderRequest req) { }   // biên API\n" +
        "\n" +
        "public record CreateOrderRequest(\n" +
        "    @NotBlank String sku,\n" +
        "    @Min(1) @Max(100) int quantity,\n" +
        "    @Email String contactEmail\n" +
        ") { }\n" +
        "// -> Bên trong domain KHÔNG cần kiểm tra lại những thứ này ở mọi tầng.\n" +
        "//    Kiểm tra ở mọi tầng làm code rối và che giấu chỗ nào thật sự chịu trách nhiệm.\n" +
        "\n" +
        "// 2) FAIL FAST — phát hiện sai là dừng NGAY, với thông báo rõ ràng\n" +
        "public Order(OrderId id, Money total) {\n" +
        "    this.id = Objects.requireNonNull(id, \"id không được null\");\n" +
        "    if (total.isNegative()) throw new IllegalArgumentException(\"tổng tiền âm: \" + total);\n" +
        "    this.total = total;\n" +
        "}\n" +
        "// Object KHÔNG BAO GIỜ tồn tại ở trạng thái không hợp lệ.\n" +
        "// Thông báo lỗi phải có GIÁ TRỊ THỰC TẾ, không chỉ tên biến.\n" +
        "\n" +
        "// 3) IMMUTABILITY — object bất biến không thể bị làm hỏng\n" +
        "public record Money(BigDecimal amount, Currency currency) {\n" +
        "    public Money {\n" +
        "        Objects.requireNonNull(amount);\n" +
        "        if (amount.scale() > 2) throw new IllegalArgumentException(\"quá 2 chữ số thập phân\");\n" +
        "    }\n" +
        "    public Money plus(Money other) {                 // trả về object MỚI\n" +
        "        requireSameCurrency(other);\n" +
        "        return new Money(amount.add(other.amount), currency);\n" +
        "    }\n" +
        "}\n" +
        "// + thread-safe MIỄN PHÍ, dùng làm key an toàn, không có tác dụng phụ bất ngờ\n" +
        "\n" +
        "// 4) BẢN SAO PHÒNG THỦ cho collection và mảng\n" +
        "public Order(List<Item> items) {\n" +
        "    this.items = List.copyOf(items);        // caller sửa list gốc không ảnh hưởng\n" +
        "}\n" +
        "public List<Item> items() { return items; }  // đã bất biến, trả thẳng được\n" +
        "\n" +
        "// CÂN BẰNG: đừng kiểm tra lại mọi thứ ở mọi tầng (paranoid programming) —\n" +
        "// nó làm code rối và chậm. Xác định RÕ ranh giới tin cậy: dữ liệu từ\n" +
        "// NGOÀI thì kiểm tra kỹ, dữ liệu đã qua biên thì tin tưởng.",
    },
  ],
},
{
  cat: 'Tổng quan',
  q: 'Cách chọn pattern đúng — quy trình tư duy?',
  answer:
    'Đừng bắt đầu từ "tôi nên dùng pattern nào". Bắt đầu từ:\n\n' +
    '1. **Vấn đề cụ thể**: cái gì đang khó thay đổi? Trục biến thiên nào? Coupling ở đâu?\n' +
    '2. **Giải pháp đơn giản trực tiếp** trước (constructor, if, hàm). Đủ chưa?\n' +
    '3. Nếu có **áp lực thay đổi lặp lại** ở một điểm → tìm pattern **giải quyết đúng vấn đề đó** (không phải pattern bạn thích nhất).\n' +
    '4. So sánh chi phí (số class, gián tiếp) với lợi ích (linh hoạt bạn *đang cần*).\n' +
    '5. Áp dụng phiên bản **nhẹ nhất** đủ dùng (lambda thay class nếu được).\n' +
    '6. Đặt tên theo pattern để giao tiếp.\n\n' +
    'Thường: pattern **xuất hiện qua refactoring** khi code lớn lên, không phải được "thiết kế vào" từ đầu.',
  essence:
    'Pattern là câu trả lời, không phải câu hỏi. Xác định vấn đề (trục thay đổi, coupling, duplication kiến thức) trước; pattern là tên của giải pháp cho lớp vấn đề đó. Áp pattern không có vấn đề tương ứng = over-engineering.',
  example:
    'Không: "dự án mới, hãy dựng Factory + Strategy + Observer cho mọi thứ". Có: viết code đơn giản → sau 2 tháng thấy `switch(paymentType)` lặp ở 4 chỗ và hay thêm loại → refactor sang Strategy + registry. Vấn đề (shotgun surgery + OCP) dẫn tới pattern.',
  viz: {
    type: 'flow',
    title: 'Pattern là câu trả lời, không phải câu hỏi',
    nodes: ['Vấn đề cụ thể (cái gì khó thay đổi? trục biến thiên? coupling ở đâu?)', 'Giải pháp đơn giản trực tiếp trước (constructor, if, hàm) — đủ chưa?', 'Áp lực thay đổi LẶP LẠI ở một điểm', 'Tìm pattern giải quyết đúng vấn đề đó', 'So chi phí (class, gián tiếp) với lợi ích (linh hoạt ĐANG cần)', 'Áp phiên bản nhẹ nhất + đặt tên để giao tiếp'],
    steps: [
      { to: 1, label: 'Đừng bắt đầu từ "tôi nên dùng pattern nào"' },
      { to: 3, label: 'Không phải pattern bạn thích nhất' },
      { to: 5, label: 'Pattern thường XUẤT HIỆN qua refactoring, không "thiết kế vào" từ đầu' },
    ],
  },
  demo: [
    {
      lang: "java",
      title: "Bắt đầu từ vấn đề, không từ danh sách pattern",
      code:
        "// BƯỚC 1: MÔ TẢ VẤN ĐỀ bằng ngôn ngữ thường, KHÔNG dùng tên pattern.\n" +
        "//   \"Tôi có 5 cách tính phí giao hàng, và cách dùng được chọn lúc chạy\n" +
        "//    theo lựa chọn của khách.\"\n" +
        "//   -> Mô tả rõ vấn đề thường đã gợi ra giải pháp.\n" +
        "\n" +
        "// BƯỚC 2: VIẾT CÁCH ĐƠN GIẢN NHẤT trước\n" +
        "public Money shippingCost(Order o, Method m) {\n" +
        "    return switch (m) { case STANDARD -> ...; case EXPRESS -> ...; };\n" +
        "}\n" +
        "// Rất nhiều trường hợp DỪNG ở đây là đúng.\n" +
        "\n" +
        "// BƯỚC 3: HỎI \"cái gì sẽ THAY ĐỔI\" — pattern tồn tại để cô lập thay đổi\n" +
        "//   Thuật toán thay đổi          -> Strategy\n" +
        "//   Loại object cần tạo thay đổi -> Factory\n" +
        "//   Thêm hành vi quanh object    -> Decorator\n" +
        "//   Cần kiểm soát truy cập       -> Proxy\n" +
        "//   Cấu trúc cây, xử lý đồng nhất-> Composite\n" +
        "//   Hành vi đổi theo trạng thái  -> State\n" +
        "//   Nhiều bên quan tâm một sự kiện -> Observer\n" +
        "//   Khung cố định, bước biến thiên -> Template Method / Strategy\n" +
        "\n" +
        "// BƯỚC 4: KIỂM TRA XEM VẤN ĐỀ CÓ THẬT KHÔNG\n" +
        "//   - Đã có ít nhất 3 biến thể chưa, hay mới có 1 và \"dự đoán\" sẽ có thêm?\n" +
        "//   - Đã phải sửa cùng một chỗ nhiều lần chưa?\n" +
        "//   - Có test nào đang khó viết vì thiếu ranh giới không?\n" +
        "//   Chưa có -> ĐỪNG thêm pattern (YAGNI).\n" +
        "\n" +
        "// BƯỚC 5: KIỂM TRA XEM NGÔN NGỮ ĐÃ GIẢI QUYẾT CHƯA\n" +
        "//   lambda thay Strategy/Command; sealed + switch thay Visitor;\n" +
        "//   record thay Value Object; enum thay Singleton; Optional thay Null Object.\n" +
        "\n" +
        "// BƯỚC 6: ĐÁNH GIÁ CÁI GIÁ\n" +
        "//   Thêm bao nhiêu file? Người mới có hiểu được không? Gỡ rối khó hơn bao nhiêu?\n" +
        "//   Lợi ích phải LỚN HƠN cái giá — nếu ngang nhau thì chọn cách đơn giản hơn.\n" +
        "\n" +
        "// SAI LẦM LỚN NHẤT: học pattern rồi đi tìm chỗ để dùng.\n" +
        "// Đúng: gặp vấn đề, nhận ra nó giống một vấn đề đã biết, rồi mượn giải pháp.",
    },
  ],
},
]);
