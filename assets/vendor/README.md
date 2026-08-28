# assets/vendor/

Thư viện bên thứ ba, nhúng nguyên trạng (site không dùng bundler).

## sql.js — `sql-wasm.js` + `sql-wasm.wasm`

- SQLite biên dịch sang WebAssembly, chạy hoàn toàn trong trình duyệt.
- Nguồn: <https://github.com/sql-js/sql.js> — phiên bản `1.12.0`
  (`https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/`).
- Giấy phép: **MIT** (sql.js) · SQLite: **public domain**.
- Dùng cho: bài tập SQL trong `/luyen-tap/` (chấm bằng testcase, so result set).
- Chỉ tải khi người dùng mở một bài code SQL (`assets/sql-run.js` nạp lười).

Cập nhật: tải lại 2 file từ cùng phiên bản trên jsDelivr, giữ nguyên tên.
