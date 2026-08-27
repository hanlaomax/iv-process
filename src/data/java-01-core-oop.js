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
},
]);
