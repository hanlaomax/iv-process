SS.addQuestions('design-patterns', [
{
  cat: 'Behavioral',
  q: 'Strategy pattern — vấn đề và cấu trúc?',
  answer:
    'Định nghĩa một **họ thuật toán**, đóng gói mỗi cái thành class riêng, cho phép **thay đổi thuật toán độc lập** với client dùng nó.\n\n' +
    '```\ninterface ShippingStrategy { Money cost(Order o); }\nclass StandardShipping implements ShippingStrategy { ... }\nclass ExpressShipping implements ShippingStrategy { ... }\nclass Checkout {\n  private ShippingStrategy strategy;\n  Money total(Order o) { return o.subtotal().plus(strategy.cost(o)); }\n}\n```\n\n' +
    'Dùng khi: có nhiều cách làm một việc, chọn lúc runtime; muốn loại bỏ `if/else`/`switch` lớn phân nhánh theo loại; muốn test từng thuật toán riêng.',
  essence:
    'Strategy = "cắm thuật toán từ ngoài vào". Nó biến `if type == A ... else if type == B ...` thành "chọn strategy phù hợp và gọi nó". Nền tảng của Open-Closed: thêm thuật toán mới = thêm class, không sửa client.',
  example:
    'Nén file: `Compressor` giữ một `CompressionStrategy` (`Zip`, `Gzip`, `Lz4`). `compressor.compress(file)` gọi strategy hiện tại. Thêm `ZstdStrategy` không đụng `Compressor`. `Comparator` trong Java chính là Strategy cho việc so sánh.',
  viz: {
    type: 'flow',
    title: '"Cắm thuật toán từ ngoài vào" — nền tảng của Open-Closed',
    nodes: ['Client (Checkout) giữ một ShippingStrategy', 'gọi strategy.cost(order)', 'Đổi strategy runtime / chọn theo context', 'Thêm thuật toán mới = thêm class'],
    steps: [
      { to: 1, label: 'Biến if type==A ... else if type==B ... thành "chọn strategy và gọi nó"' },
      { to: 2, label: 'StandardShipping, ExpressShipping — mỗi cái một class, test riêng' },
      { to: 3, label: 'Không sửa client. Comparator trong Java chính là Strategy' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Strategy vs chuỗi if/else / switch — khi nào đáng tách?',
  answer:
    'Không phải mọi `switch` đều cần Strategy. Đáng tách khi:\n' +
    '- Mỗi nhánh **phức tạp** (nhiều dòng, có state riêng, phụ thuộc riêng).\n' +
    '- Danh sách nhánh **hay thay đổi/mở rộng** (thêm loại → không muốn sửa file cũ).\n' +
    '- Cần **test từng nhánh riêng**.\n' +
    '- Cùng một `switch` bị **lặp ở nhiều nơi**.\n\n' +
    'KHÔNG tách khi: 2–3 nhánh đơn giản, ổn định, chỉ xuất hiện một chỗ → `switch` (hoặc `Map<Enum, Function>`) rõ ràng hơn và ít file hơn.\n\n' +
    'Trong Java hiện đại: `Map<Type, Function>` hoặc enum có abstract method thường đủ, nhẹ hơn Strategy đầy đủ.',
  essence:
    'Strategy trả tiền bằng số class + gián tiếp; nó "mua" khả năng mở rộng không sửa code cũ và test cô lập. Với logic đơn giản, ổn định, một chỗ → `switch` thắng. Đo bằng "nhánh này có thay đổi/lặp/phức tạp không?".',
  example:
    'Tính phí theo `PlanType` (FREE/PRO/ENTERPRISE), mỗi loại là công thức nhiều bước + tra bảng giá riêng + hay thêm plan mới → Strategy (hoặc enum với abstract `calculateFee()`). Ngược lại, `switch(status) { case ACTIVE -> "green"; ... }` — giữ nguyên switch.',
  viz: {
    type: 'compare',
    corner: 'Tình huống',
    cols: ['Strategy (class / enum abstract method)', 'switch / Map<Enum, Function>'],
    rows: [
      ['Mỗi nhánh phức tạp (state, phụ thuộc riêng)', 'đáng tách', 'không phù hợp'],
      ['Danh sách nhánh hay thay đổi/mở rộng', 'thêm class, không sửa file cũ', 'sửa file mỗi lần'],
      ['Cần test từng nhánh riêng', 'dễ', 'khó'],
      ['2–3 nhánh đơn giản, ổn định, một chỗ', 'quá nặng', 'rõ ràng hơn, ít file'],
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Observer pattern — cấu trúc và use case?',
  answer:
    'Một object (**subject**) duy trì danh sách các **observer** và **tự động thông báo** chúng khi state thay đổi (thường gọi method `update()`).\n\n' +
    '```\ninterface Observer { void onEvent(Event e); }\nclass Subject {\n  private List<Observer> observers = new ArrayList<>();\n  void subscribe(Observer o) { observers.add(o); }\n  void notifyAll(Event e) { observers.forEach(o -> o.onEvent(e)); }\n}\n```\n\n' +
    'Dùng khi: một thay đổi cần kéo theo cập nhật nhiều object mà bạn **không biết trước** là bao nhiêu/loại gì; muốn tách rời "cái phát" khỏi "cái phản ứng".',
  essence:
    'Observer = "publish–subscribe trong một process". Subject không biết observer là ai, chỉ biết "có ai đó muốn được báo". Nền tảng của event handling, reactive, data binding, MVC.',
  example:
    'Excel: ô A1 = `B1 + C1`. Ô A1 (observer) subscribe B1, C1 (subject). Đổi B1 → B1 notify → A1 tính lại. UI framework: nút "Save" observe form state → tự enable/disable. `PropertyChangeListener` trong JavaBeans.',
  viz: {
    type: 'flow',
    title: '"Publish–subscribe trong một process"',
    nodes: ['Observer.subscribe(subject)', 'Subject state thay đổi', 'subject.notifyAll(event)', 'Mỗi observer.onEvent(e) — tự cập nhật'],
    steps: [
      { to: 0, label: 'Subject giữ List<Observer>' },
      { to: 2, label: 'Subject không biết observer là ai, chỉ biết "có ai đó muốn được báo"' },
      { to: 3, label: 'Nền tảng của event handling, reactive, data binding, MVC' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Observer vs Pub/Sub (message bus) vs Event-driven — phân biệt?',
  answer:
    '- **Observer (GoF)**: subject **giữ trực tiếp** danh sách observer; gọi thẳng `observer.update()`. Đồng bộ, trong-process, coupling nhẹ (subject biết interface Observer).\n' +
    '- **Pub/Sub qua event bus / mediator**: publisher và subscriber **không biết nhau**, giao tiếp qua một **broker/bus** trung gian. Có thể async, có thể xuyên process.\n' +
    '- **Event-driven architecture**: kiến trúc ở tầng hệ thống — service phát domain event lên message broker (Kafka), service khác phản ứng. Async, phân tán, bền.\n\n' +
    'Cùng ý tưởng "phản ứng với thay đổi", khác về: ai giữ danh sách, đồng bộ hay async, trong-process hay phân tán.',
  essence:
    'Observer: subject tự quản subscriber, gọi trực tiếp (in-process, sync). Pub/Sub: một bus ở giữa, publisher/subscriber độc lập hoàn toàn. Event-driven: pub/sub ở quy mô hệ thống phân tán với broker bền.',
  example:
    'In-process: `orderService` có `List<OrderListener>`, gọi `listener.onOrderPlaced()` (Observer). Spring: `applicationEventPublisher.publishEvent(new OrderPlaced())` → bất kỳ `@EventListener` nào nhận (Pub/Sub qua ApplicationContext bus). Phân tán: publish `OrderPlaced` lên Kafka (Event-driven).',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Observer (GoF)', 'Pub/Sub (event bus)', 'Event-driven architecture'],
    rows: [
      ['Ai giữ danh sách subscriber', 'subject giữ trực tiếp', 'broker/bus trung gian', 'message broker (Kafka)'],
      ['Đồng bộ / async', 'đồng bộ', 'có thể async', 'async'],
      ['Phạm vi', 'trong-process', 'có thể xuyên process', 'phân tán, bền'],
      ['Coupling', 'nhẹ (subject biết interface Observer)', 'publisher/subscriber không biết nhau', 'service không biết nhau'],
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Template Method pattern — khung xử lý với các bước cắm được?',
  answer:
    'Định nghĩa **bộ khung của một thuật toán** trong một method của superclass, để **một số bước cho subclass override**. Các bước bất biến nằm trong superclass, bước biến thiên là abstract.\n\n' +
    '```\nabstract class DataImporter {\n  final void run() {              // template method (final: không override)\n    var raw = read();            // abstract\n    var valid = validate(raw);    // có default, override được\n    save(valid);                  // abstract\n    notifyDone();                 // hook, mặc định rỗng\n  }\n  abstract List<Row> read();\n  abstract void save(List<Row> rows);\n}\n```',
  essence:
    'Template Method = "khung cố định, chỗ trống cho subclass điền". Nó đảo ngược quyền điều khiển: superclass gọi method của subclass ("Hollywood principle"). Dùng khi nhiều biến thể chia sẻ *cùng một quy trình* nhưng khác vài bước.',
  example:
    'JUnit: `runTest()` (template) gọi `setUp()` → `test method` → `tearDown()`. Bạn override `setUp`/`tearDown`. Spring `AbstractController`, servlet `HttpServlet.service()` gọi `doGet`/`doPost`. `InputStream.read(byte[])` gọi `read()` abstract.',
  viz: {
    type: 'flow',
    title: '"Khung cố định, chỗ trống cho subclass điền" (Hollywood principle)',
    nodes: ['run() — template method (final: không override)', 'read() — abstract (subclass điền)', 'validate() — có default, override được', 'save() — abstract', 'notifyDone() — hook, mặc định rỗng'],
    steps: [
      { to: 0, label: 'Bước bất biến nằm trong superclass' },
      { to: 1, label: 'Superclass GỌI method của subclass' },
      { to: 4, label: 'Dùng khi nhiều biến thể chia sẻ cùng quy trình, khác vài bước' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Template Method vs Strategy — giống mục tiêu, khác cách?',
  answer:
    'Cả hai cho phép **thay đổi một phần hành vi**:\n\n' +
    '- **Template Method**: dùng **kế thừa**. Khung ở superclass, biến thể ở subclass override method. Quan hệ tĩnh (compile-time). Subclass chỉ đổi được các bước được cho phép; không đổi được khung.\n' +
    '- **Strategy**: dùng **composition**. Client giữ một object strategy, có thể **đổi runtime**, tổ hợp linh hoạt. Không cần kế thừa.\n\n' +
    'Strategy linh hoạt hơn (đổi runtime, tránh kế thừa sâu); Template Method gọn hơn khi biến thể ít và cố định, và khi muốn tái dùng nhiều code chung.',
  essence:
    'Template Method: "kế thừa để điền chỗ trống trong quy trình". Strategy: "composition để cắm thuật toán từ ngoài". Cùng bài toán, Strategy thường là lựa chọn hiện đại hơn (favor composition, đổi runtime).',
  example:
    'Xử lý payment với các bước chung (validate → charge → record → notify): Template Method nếu chỉ khác bước `charge` theo provider và số provider cố định. Strategy nếu muốn đổi provider runtime hoặc test từng bước độc lập.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Template Method', 'Strategy'],
    rows: [
      ['Cơ chế', 'kế thừa (subclass override method)', 'composition (client giữ object strategy)'],
      ['Thời điểm', 'tĩnh (compile-time)', 'đổi được runtime'],
      ['Đổi được gì', 'chỉ các bước được cho phép, không đổi khung', 'toàn bộ thuật toán, tổ hợp linh hoạt'],
      ['Hợp khi', 'biến thể ít, cố định, nhiều code chung', 'đổi runtime, tránh kế thừa sâu, test cô lập'],
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Command pattern — đóng gói yêu cầu thành object?',
  answer:
    'Biến một **yêu cầu/thao tác** thành một **object** chứa đủ thông tin để thực hiện nó (receiver + tham số + method). Tách "cái phát lệnh" khỏi "cái thực hiện lệnh".\n\n' +
    '```\ninterface Command { void execute(); }\nclass CreateOrderCommand implements Command {\n  private final OrderService svc; private final OrderData data;\n  void execute() { svc.create(data); }\n}\n```\n\n' +
    'Cho phép: **hàng đợi** lệnh, **log/replay**, **undo/redo** (thêm `undo()`), **transaction** (nhóm lệnh), **macro** (composite command), **retry**, chạy lệnh ở thread khác.',
  essence:
    'Command = "biến động từ thành danh từ". Một khi thao tác là object, bạn có thể lưu, truyền, xếp hàng, hoãn, hoàn tác, ghi log nó — những thứ không làm được với một lời gọi method trực tiếp.',
  example:
    'Editor: mỗi hành động (gõ, xoá, định dạng) là một Command với `execute()` + `undo()`, đẩy vào stack → Ctrl+Z. Task queue: mỗi job là một Command serialize được, đẩy vào Redis/DB, worker `execute()`. GUI: mỗi menu item/nút gắn một Command.',
  viz: {
    type: 'tree',
    title: '"Biến động từ thành danh từ" — thao tác là object',
    root: {
      label: 'Object chứa receiver + tham số + method — tách "phát lệnh" khỏi "thực hiện lệnh"',
      children: [
        { label: 'Hàng đợi lệnh', note: 'job serialize được, đẩy vào Redis/DB, worker execute()' },
        { label: 'Log / replay', note: '' },
        { label: 'Undo/redo', note: 'thêm undo()' },
        { label: 'Transaction (nhóm lệnh), macro (composite command)', note: '' },
        { label: 'Retry, chạy lệnh ở thread khác', note: '' },
      ],
    },
  },
},
{
  cat: 'Behavioral',
  q: 'Command + undo/redo — hiện thực thế nào?',
  answer:
    'Mỗi command lưu **đủ state để tự đảo ngược**:\n' +
    '- `execute()`: thực hiện + lưu thông tin cần cho undo (Memento — giá trị cũ, hoặc thao tác nghịch đảo).\n' +
    '- `undo()`: khôi phục.\n\n' +
    'Quản lý:\n' +
    '- **Undo stack**: mỗi `execute` push command. Ctrl+Z: pop → `undo()` → push sang **redo stack**.\n' +
    '- Ctrl+Y: pop redo stack → `execute()` → push lại undo stack.\n' +
    '- Thao tác mới (không phải redo) → xoá redo stack.\n\n' +
    'Với thao tác lớn: lưu **Memento** (snapshot phần bị ảnh hưởng) thay vì thao tác nghịch đảo.',
  essence:
    'Undo/redo = hai stack + command biết tự đảo ngược. Command đơn giản lưu "giá trị cũ"; command phức tạp lưu Memento (ảnh chụp). Redo stack bị xoá khi có nhánh lịch sử mới.',
  example:
    '`SetCellCommand(cell, newValue)`: `execute()` lưu `oldValue = cell.get()` rồi `cell.set(newValue)`. `undo()`: `cell.set(oldValue)`. Spreadsheet giữ `Deque<Command> undo, redo`. Xoá 100 dòng → `DeleteRowsCommand` lưu Memento của 100 dòng đó để undo.',
  viz: {
    type: 'flow',
    title: 'Hai stack + command biết tự đảo ngược',
    nodes: ['execute() — thực hiện + lưu oldValue / Memento', 'push vào undo stack', 'Ctrl+Z: pop → undo() → push sang redo stack', 'Ctrl+Y: pop redo → execute() → push lại undo', 'Thao tác mới (không phải redo) → xoá redo stack'],
    steps: [
      { to: 1, label: 'Command đơn giản lưu "giá trị cũ"' },
      { to: 2, label: 'Command phức tạp lưu Memento (snapshot phần bị ảnh hưởng)' },
      { to: 4, label: 'Redo stack bị xoá khi có nhánh lịch sử mới' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'State pattern — object đổi hành vi theo trạng thái nội tại?',
  answer:
    'Cho phép một object **thay đổi hành vi khi state nội tại thay đổi** — như thể nó đổi class. Mỗi state là một class implements cùng interface; object (context) uỷ quyền hành vi cho object state hiện tại; state có thể **chuyển context sang state khác**.\n\n' +
    '```\ninterface OrderState { void pay(OrderContext c); void ship(OrderContext c); }\nclass PendingState implements OrderState {\n  void pay(OrderContext c) { ...; c.setState(new PaidState()); }\n  void ship(OrderContext c) { throw new IllegalStateException("chưa trả tiền"); }\n}\n```\n\n' +
    'Thay cho `switch(state)` khổng lồ ở mọi method.',
  essence:
    'State = "state machine hướng đối tượng". Mỗi trạng thái biết: hành vi hợp lệ của nó + chuyển sang trạng thái nào. Thêm trạng thái mới = thêm một class, không sửa `switch` ở 10 method.',
  example:
    'Đơn hàng: `PENDING → PAID → SHIPPED → DELIVERED`, có thể `CANCELLED`. Mỗi state cho phép/cấm các thao tác khác nhau. `PendingState.cancel()` OK; `ShippedState.cancel()` từ chối. Máy bán hàng, TCP connection, document workflow, game character state.',
  viz: {
    type: 'states',
    title: 'State machine hướng đối tượng — mỗi state là một class',
    start: 0,
    states: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    transitions: [
      { from: 0, to: 1, label: 'pay()' },
      { from: 1, to: 2, label: 'ship()' },
      { from: 2, to: 3, label: 'deliver()' },
      { from: 0, to: 4, label: 'cancel() OK' },
      { from: 1, to: 4, label: 'cancel() + refund' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'State vs Strategy — cấu trúc giống hệt, khác gì?',
  answer:
    'Cùng cấu trúc (context uỷ quyền cho một object interface). Khác **ý định** và **ai điều khiển việc đổi**:\n\n' +
    '- **Strategy**: các thuật toán **độc lập, không biết nhau**. **Client** chọn strategy và thường không đổi trong vòng đời object. Client "biết" mình đang chọn cái gì.\n' +
    '- **State**: các state **biết nhau** (state này chuyển sang state kia). Việc chuyển state do **chính các state** (hoặc context) điều khiển dựa trên sự kiện, không phải client. Client không quan tâm state hiện tại.\n\n' +
    'Strategy: "làm việc X bằng cách nào". State: "object đang ở giai đoạn nào của vòng đời và cư xử ra sao".',
  essence:
    'Strategy = thuật toán hoán đổi được, client chọn. State = giai đoạn vòng đời, các state tự chuyển tiếp nhau theo sự kiện. Nếu các "chiến lược" của bạn tự chuyển sang nhau → đó là State.',
  example:
    'Strategy: `PaymentMethod` (Card/PayPal/Crypto) — user chọn, không tự đổi. State: `DraftPost → PublishedPost → ArchivedPost` — `publish()` gọi trên draft tự chuyển sang published; published không cho `publish()` nữa.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Strategy', 'State'],
    rows: [
      ['Các object interface', 'độc lập, không biết nhau', 'biết nhau (state này chuyển sang state kia)'],
      ['Ai điều khiển việc đổi', 'client chọn, thường không đổi trong vòng đời', 'chính các state (hoặc context) theo sự kiện'],
      ['Client', '"biết" mình đang chọn cái gì', 'không quan tâm state hiện tại'],
      ['Câu hỏi', '"làm việc X bằng cách nào"', '"object đang ở giai đoạn nào của vòng đời"'],
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Cách hiện thực một state machine — enum, State pattern, hay thư viện?',
  answer:
    '- **Enum + transition table** (đơn giản): `enum State { PENDING, PAID, SHIPPED }` + `Map<State, Set<State>>` cho phép chuyển; hoặc enum có method `next(Event)`.\n' +
    '- **State pattern** (một class/state): khi mỗi state có **nhiều hành vi phức tạp** + nhiều thao tác được phép/cấm khác nhau.\n' +
    '- **Thư viện state machine** (Spring StateMachine, XState, tinystatemachine): khi cần state phân cấp, parallel region, guard, action, visualization, persistence.\n\n' +
    'Chọn theo độ phức tạp: vài trạng thái + chuyển đơn giản → enum. Nhiều hành vi/thao tác theo trạng thái → State pattern. Workflow phức tạp có nhánh, timer, sub-state → thư viện.',
  essence:
    'Đừng dùng thư viện state machine cho 3 trạng thái (enum đủ), cũng đừng nhồi workflow 20 trạng thái vào `switch` (dùng State pattern hoặc thư viện). Kích thước và độ phức tạp quyết định.',
  example:
    'Trạng thái task đơn giản (`TODO → DOING → DONE`): enum với `Set<Status> allowedNext`. Quy trình phê duyệt đơn nghỉ phép (nhiều cấp duyệt, timeout tự escalate, có thể rút lại): Spring StateMachine hoặc Temporal workflow.',
  viz: {
    type: 'layers',
    title: 'Kích thước và độ phức tạp quyết định',
    dir: 'up',
    layers: [
      { name: 'Enum + transition table', tag: 'đơn giản', note: 'vài trạng thái + chuyển đơn giản — Map<State, Set<State>> hoặc enum.next(Event)' },
      { name: 'State pattern (một class/state)', tag: '', note: 'mỗi state nhiều hành vi phức tạp + thao tác được phép/cấm khác nhau' },
      { name: 'Thư viện state machine', tag: 'Spring StateMachine, XState', note: 'state phân cấp, parallel region, guard, action, visualization, persistence' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Chain of Responsibility — chuỗi handler xử lý request?',
  answer:
    'Cho request đi qua một **chuỗi các handler**; mỗi handler quyết định **xử lý** request hay **chuyển tiếp** cho handler kế tiếp (hoặc cả hai).\n\n' +
    '```\nabstract class Handler {\n  protected Handler next;\n  abstract void handle(Request r);\n}\n```\n\n' +
    'Dùng khi: nhiều đối tượng có thể xử lý request và bạn không muốn hard-code cái nào; muốn thêm/bớt/đổi thứ tự bước xử lý dễ dàng; xử lý theo nhiều bước tuần tự (validate → auth → rate-limit → log → business).',
  essence:
    'CoR = "pipeline handler, mỗi mắt xích tự quyết xử lý hay đẩy tiếp". Tách người gửi khỏi người xử lý; cho phép cấu hình chuỗi linh hoạt. Cẩn thận: request có thể đi hết chuỗi mà không ai xử lý.',
  example:
    'Servlet Filter chain, Spring Security filter chain, middleware trong Express/ASP.NET Core. Xử lý exception: `NullHandler → ValidationHandler → BusinessHandler → DefaultHandler`. Duyệt chi phí: nhân viên < 1tr → trưởng nhóm < 10tr → giám đốc → HĐQT.',
  viz: {
    type: 'flow',
    title: '"Pipeline handler, mỗi mắt xích tự quyết xử lý hay đẩy tiếp"',
    nodes: ['Request', 'Handler 1: xử lý hoặc chuyển tiếp', 'Handler 2', 'Handler 3', 'Default handler'],
    steps: [
      { to: 1, label: 'Duyệt chi phí: nhân viên < 1tr → trưởng nhóm < 10tr → giám đốc' },
      { to: 3, label: 'Thêm/bớt/đổi thứ tự bước dễ dàng; tách người gửi khỏi người xử lý' },
      { to: 4, label: 'Cẩn thận: request có thể đi hết chuỗi mà không ai xử lý' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Chain of Responsibility trong middleware/filter — khác gì bản GoF cổ điển?',
  answer:
    'Bản GoF cổ điển: mỗi handler xử lý **hoặc** chuyển tiếp (một trong hai) — như xử lý exception.\n\n' +
    'Bản **middleware/filter** hiện đại: mỗi handler chạy code **trước** khi gọi `next()`, `next()` chạy phần còn lại của chuỗi, rồi handler chạy code **sau** — cho phép **bọc** (như Decorator around):\n' +
    '```\nvoid handle(Request req, Chain chain) {\n  long start = now();          // before\n  chain.next(req);             // gọi phần còn lại\n  log(now() - start);          // after\n}\n```\n\n' +
    'Mỗi middleware có thể: sửa request/response, dừng chuỗi (không gọi next), xử lý lỗi từ downstream.',
  essence:
    'Middleware = CoR + khả năng chạy logic *sau* khi phần còn lại của chuỗi hoàn tất (nhờ `next()` là lời gọi lồng nhau, không phải "chuyển tiếp rồi quên"). Đây là mô hình pipeline phổ biến nhất trong web framework.',
  example:
    'Express: `app.use(logger)`, `app.use(auth)`, `app.use(bodyParser)`. Mỗi cái gọi `next()`. `auth` middleware: kiểm tra token → không hợp lệ thì `res.status(401)` (dừng chuỗi), hợp lệ thì `next()`. `logger` đo thời gian cả request nhờ code sau `next()`.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['CoR cổ điển (GoF)', 'Middleware / filter'],
    rows: [
      ['Mỗi handler', 'xử lý HOẶC chuyển tiếp (một trong hai)', 'code trước next() → next() → code sau next()'],
      ['Chạy logic SAU khi chuỗi hoàn tất', 'không', 'có (next() là lời gọi lồng nhau)'],
      ['Bọc được (như Decorator around)?', 'không', 'có — đo thời gian cả request'],
      ['Sửa request/response, dừng chuỗi', 'hạn chế', 'có'],
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Iterator pattern — còn ý nghĩa gì khi mọi ngôn ngữ đã có sẵn?',
  answer:
    'Iterator cung cấp cách **duyệt tuần tự** các phần tử của một collection **mà không lộ cấu trúc bên trong** (array, linked list, tree, DB cursor…).\n\n' +
    'Ngày nay ngôn ngữ tích hợp sẵn (`Iterable`/`Iterator` + for-each trong Java, generator/`yield`, `IEnumerable`) — bạn hiếm khi tự viết. Nhưng pattern vẫn quan trọng khi:\n' +
    '- **Custom traversal**: duyệt cây theo BFS/DFS/in-order; duyệt có filter/transform lazy.\n' +
    '- **Lazy / vô hạn**: iterator sinh phần tử theo yêu cầu (đọc file lớn từng dòng, phân trang API, stream vô hạn).\n' +
    '- Ẩn nguồn: cùng interface iterator dù dữ liệu từ RAM, DB, hay network.',
  essence:
    'Iterator tách "cách duyệt" khỏi "cách lưu trữ" và cho phép duyệt **lazy** (không nạp hết vào bộ nhớ). Đó là lý do nó vẫn nền tảng: `Stream`, generator, pagination iterator đều là Iterator.',
  example:
    'Đọc 10GB log: `LogFileIterator implements Iterator<LogLine>` đọc từng dòng khi `next()` được gọi → xử lý được file lớn hơn RAM. API pagination: `PagedIterator` tự động gọi trang tiếp theo khi hết trang hiện tại — client chỉ `for (var item : pagedResults)`.',
  viz: {
    type: 'tree',
    title: 'Tách "cách duyệt" khỏi "cách lưu trữ" + cho phép duyệt lazy',
    root: {
      label: 'Ngôn ngữ có sẵn (Iterable, generator) — nhưng pattern vẫn quan trọng khi:',
      children: [
        { label: 'Custom traversal', note: 'cây theo BFS/DFS/in-order; duyệt có filter/transform lazy' },
        { label: 'Lazy / vô hạn', note: 'đọc file lớn từng dòng, phân trang API, stream vô hạn' },
        { label: 'Ẩn nguồn', note: 'cùng interface iterator dù dữ liệu từ RAM, DB, hay network' },
        { label: 'Vẫn nền tảng', note: 'Stream, generator, pagination iterator đều là Iterator' },
      ],
    },
  },
},
{
  cat: 'Behavioral',
  q: 'Mediator pattern — giảm coupling giữa nhiều object tương tác?',
  answer:
    'Khi **nhiều object tương tác chằng chịt** (mỗi cái giữ tham chiếu tới nhiều cái khác — "many-to-many"), đặt một **Mediator** ở giữa: các object chỉ nói với mediator, mediator điều phối tương tác.\n\n' +
    'Đổi coupling **n×n** thành **n×1**. Logic điều phối tập trung ở mediator thay vì rải khắp các object.\n\n' +
    'Nhược: mediator có thể phình thành "god object" nếu điều phối quá nhiều.',
  essence:
    'Mediator = "trạm điều phối". Thay vì mỗi component biết mọi component khác, tất cả biết mediator. Tương tác trở nên rõ ràng (ở một chỗ) và component tái dùng được (không dính vào nhau).',
  example:
    'Form phức tạp: khi "quốc gia" đổi → cập nhật dropdown "tỉnh", ẩn/hiện field "state", đổi format số điện thoại, revalidate. Không để mỗi field biết mọi field khác — một `FormMediator` xử lý `onCountryChanged()`. Chat room: user gửi message tới room (mediator), room broadcast — user không giữ list user khác.',
  viz: {
    type: 'flow',
    title: '"Trạm điều phối" — đổi coupling n×n thành n×1',
    nodes: ['Nhiều object tương tác chằng chịt (n×n)', 'Đặt một Mediator ở giữa', 'Các object chỉ nói với mediator', 'Mediator điều phối tương tác (logic tập trung)'],
    steps: [
      { to: 0, label: 'Mỗi cái giữ tham chiếu tới nhiều cái khác' },
      { to: 2, label: 'Component tái dùng được (không dính vào nhau)' },
      { to: 3, label: 'Nhược: mediator có thể phình thành "god object"' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Mediator vs Observer — đều giảm coupling, khác gì?',
  answer:
    '- **Observer**: quan hệ **một-nhiều** một chiều. Subject phát, observer nghe. Subject không quan tâm observer làm gì. Dùng cho "thông báo thay đổi".\n' +
    '- **Mediator**: quan hệ **nhiều-nhiều** hai chiều, có **logic điều phối**. Mediator biết cách các thành phần nên phản ứng với nhau, chứa quy tắc tương tác. Dùng cho "điều phối hành vi phức tạp giữa các thành phần ngang hàng".\n\n' +
    'Thực tế thường kết hợp: các thành phần notify mediator (kiểu Observer), mediator điều phối (kiểu Mediator).',
  essence:
    'Observer: "báo cho ai quan tâm" (phi tập trung, không logic điều phối). Mediator: "điều phối tương tác theo quy tắc" (tập trung, có logic). Observer là kênh; Mediator là bộ não.',
  example:
    'Observer: `stockPrice` thay đổi → notify các widget hiển thị. Mediator: trong một dialog, khi checkbox "gửi email" được tick → mediator enable field "email", set field "phương thức" = EMAIL, disable field "SMS" — logic "khi X thì Y, Z" nằm ở mediator.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Observer', 'Mediator'],
    rows: [
      ['Quan hệ', 'một-nhiều, một chiều', 'nhiều-nhiều, hai chiều'],
      ['Logic điều phối', 'không — subject không quan tâm observer làm gì', 'có — chứa quy tắc "khi X thì Y, Z"'],
      ['Vai trò', 'kênh ("báo cho ai quan tâm")', 'bộ não ("điều phối theo quy tắc")'],
      ['Kết hợp', 'component notify mediator (kiểu Observer), mediator điều phối (kiểu Mediator)', ''],
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Observer pattern và rủi ro memory leak (lapsed listener)?',
  answer:
    'Subject giữ **strong reference** tới observer. Nếu observer bị "bỏ quên" mà không **unsubscribe**, nó không bao giờ được GC → **memory leak** (lapsed listener problem). Còn tệ hơn: observer "chết" vẫn nhận event và xử lý sai.\n\n' +
    'Phòng tránh:\n' +
    '- **Luôn unsubscribe** trong `dispose()`/`onDestroy()`/`@PreDestroy`; dùng try-with-resources / lifecycle-aware component.\n' +
    '- **Weak reference** cho observer (subject giữ `WeakReference`) — observer bị GC thì tự rụng khỏi list. Đánh đổi: observer có thể biến mất bất ngờ.\n' +
    '- Dùng framework quản lý lifecycle (Android `LifecycleObserver`, RxJava `CompositeDisposable`, Reactor).',
  essence:
    'Observer tạo một reference ngầm từ subject (thường sống lâu) tới observer (thường sống ngắn). Không unsubscribe = leak. Đây là bug phổ biến nhất khi dùng Observer/listener thủ công.',
  example:
    'Activity Android đăng ký `LocationListener` với `LocationManager` (singleton, sống mãi) nhưng quên gỡ khi Activity destroy → Activity không được GC, cả view tree của nó rò rỉ. Xoay màn hình vài lần → OutOfMemory. Sửa: `removeUpdates(listener)` trong `onDestroy`.',
  viz: {
    type: 'flow',
    title: 'Reference ngầm từ subject (sống lâu) tới observer (sống ngắn)',
    nodes: ['Subject giữ strong reference tới observer', 'Observer bị "bỏ quên", không unsubscribe', 'Observer không bao giờ được GC → memory leak', 'Observer "chết" vẫn nhận event và xử lý sai'],
    steps: [
      { to: 2, label: 'Lapsed listener problem — bug phổ biến nhất với Observer thủ công' },
      { to: 3, label: 'Phòng: luôn unsubscribe trong dispose()/onDestroy/@PreDestroy' },
      { to: 3, label: 'Hoặc: WeakReference; framework lifecycle-aware (LifecycleObserver, CompositeDisposable)' },
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Interpreter pattern — khi nào (hiếm khi) dùng?',
  answer:
    'Định nghĩa **ngữ pháp** cho một ngôn ngữ nhỏ và một **interpreter** duyệt cây cú pháp (AST) để "thực thi" nó. Mỗi luật ngữ pháp = một class; `interpret(context)` đệ quy.\n\n' +
    'Dùng khi: bạn có một **DSL đơn giản, ổn định** cần đánh giá lặp đi lặp lại — biểu thức boolean/số học, rule engine đơn giản, query filter, template.\n\n' +
    'KHÔNG dùng khi: ngữ pháp phức tạp/hay đổi → dùng parser generator (ANTLR) + Visitor, hoặc nhúng một ngôn ngữ script có sẵn (Groovy, JS). Interpreter thủ công không scale với ngữ pháp lớn.',
  essence:
    'Interpreter là pattern **ít dùng nhất** của GoF. Nó hợp lý cho DSL cực nhỏ và cố định. Ngữ pháp thật sự → dùng công cụ chuyên dụng, đừng tự viết một class cho mỗi luật.',
  example:
    'Rule "hiển thị banner": DSL `age > 18 AND (country == "VN" OR isVip)`. Parse thành AST gồm `AndExpr`, `OrExpr`, `GreaterThan`, `Equals`, `Variable`. `expr.interpret(userContext)` → boolean. Đủ nhỏ và ổn định để tự viết. Nếu DSL phình thêm hàm, vòng lặp → chuyển sang nhúng scripting.',
  viz: {
    type: 'tree',
    title: 'Pattern ít dùng nhất của GoF',
    root: {
      label: 'Ngữ pháp cho một ngôn ngữ nhỏ + interpreter duyệt AST',
      children: [
        { label: 'Dùng khi: DSL đơn giản, ỔN ĐỊNH', note: 'biểu thức boolean/số học, rule engine đơn giản, query filter, template' },
        { label: 'Mỗi luật ngữ pháp = một class', note: 'interpret(context) đệ quy' },
        { label: 'KHÔNG dùng khi ngữ pháp phức tạp/hay đổi', note: 'parser generator (ANTLR) + Visitor' },
        { label: 'Hoặc nhúng ngôn ngữ script có sẵn', note: 'Groovy, JS — interpreter thủ công không scale với ngữ pháp lớn' },
      ],
    },
  },
},
{
  cat: 'Behavioral',
  q: 'Observer đồng bộ vs bất đồng bộ trong ứng dụng thực — chọn thế nào?',
  answer:
    '**Đồng bộ** (`notify` gọi thẳng, cùng thread, cùng transaction):\n' +
    '- Đơn giản, dễ debug, observer lỗi thì biết ngay.\n' +
    '- Nhược: observer chậm làm chậm subject; observer lỗi có thể rollback thao tác chính; thứ tự observer ảnh hưởng kết quả.\n\n' +
    '**Bất đồng bộ** (đẩy event vào queue/executor, observer xử lý sau):\n' +
    '- Subject không bị chặn; side-effect tách rời.\n' +
    '- Nhược: eventual, cần xử lý lỗi/retry riêng, khó đảm bảo "đã xử lý", có thể xử lý cả khi transaction chính rollback (trừ khi dùng after-commit).\n\n' +
    'Quy tắc: side-effect **phải thành công cùng** thao tác chính → sync; side-effect **độc lập / ra ngoài** (email, cập nhật cache, analytics) → async (và `AFTER_COMMIT`).',
  essence:
    'Sync observer: hệ quả là một phần của giao dịch. Async observer: hệ quả là phản ứng độc lập, best-effort. Nhầm (gửi email sync trong transaction) → email chậm làm treo request, hoặc email đã gửi rồi transaction rollback.',
  example:
    'Spring: `order.place()` phát `OrderPlaced`. `InventoryHandler` — nếu trừ kho phải nguyên tử với đơn hàng → sync, cùng transaction. `EmailHandler`, `AnalyticsHandler` → `@TransactionalEventListener(AFTER_COMMIT)` + `@Async` — chạy sau khi đơn hàng chắc chắn đã commit, không làm chậm response.',
  viz: {
    type: 'compare',
    corner: 'Khía cạnh',
    cols: ['Observer đồng bộ', 'Observer bất đồng bộ'],
    rows: [
      ['Chặn subject?', 'có — observer chậm làm chậm subject', 'không'],
      ['Cùng transaction?', 'có — observer lỗi có thể rollback thao tác chính', 'không (dùng AFTER_COMMIT)'],
      ['Debug', 'dễ — lỗi biết ngay', 'khó — cần retry/lỗi riêng'],
      ['Dùng cho', 'side-effect phải thành công CÙNG thao tác chính (trừ kho)', 'side-effect độc lập (email, cache, analytics)'],
    ],
  },
},
{
  cat: 'Behavioral',
  q: 'Lambda / first-class function thay thế được pattern nào?',
  answer:
    'Trong ngôn ngữ có function là first-class (Java 8+, Kotlin, JS, Python), nhiều pattern GoF "co lại" thành một hàm:\n' +
    '- **Strategy** → truyền một lambda thay vì class implements interface một-method. `list.sort((a,b) -> ...)`.\n' +
    '- **Command** → `Runnable`/`Supplier`/method reference thay vì class Command.\n' +
    '- **Template Method** → truyền các bước biến thiên làm tham số hàm (higher-order function) thay vì subclass.\n' +
    '- **Observer** → `List<Consumer<Event>>` thay vì interface Observer.\n' +
    '- **Factory Method** → `Supplier<T>` / constructor reference.\n\n' +
    'Pattern không biến mất — **ý định** vẫn đó, chỉ là **hiện thực nhẹ hơn**, ít boilerplate.',
  essence:
    'GoF viết cho ngôn ngữ chỉ có class (C++/Java cũ). Nhiều pattern là "cách mô phỏng first-class function bằng class". Có lambda rồi thì dùng lambda — nhưng vẫn nên biết tên pattern để giao tiếp và để nhận ra khi cần class đầy đủ (state, nhiều method).',
  example:
    'Trước Java 8: `Collections.sort(list, new Comparator<User>() { public int compare(...) {...} })` (Strategy dạng anonymous class). Java 8+: `list.sort(comparing(User::getAge).thenComparing(User::getName))`. Cùng pattern Strategy, ngắn hơn 5 lần.',
  viz: {
    type: 'compare',
    corner: 'Pattern',
    cols: ['GoF cổ điển (class)', 'Lambda / first-class function'],
    rows: [
      ['Strategy', 'class implements interface một-method', 'truyền lambda: list.sort((a,b) -> ...)'],
      ['Command', 'class Command', 'Runnable / Supplier / method reference'],
      ['Template Method', 'subclass override method', 'truyền các bước làm tham số (higher-order function)'],
      ['Observer', 'interface Observer', 'List<Consumer<Event>>'],
      ['Factory Method', 'subclass', 'Supplier<T> / constructor reference'],
    ],
  },
},
]);
