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
},
]);
