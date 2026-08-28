/* Nạp sql.js (SQLite WASM) khi cần và chạy / chấm bài tập SQL trong trình duyệt.
   window.IVSql.ready()            -> Promise (nạp lười sql-wasm.js + .wasm)
   window.IVSql.preview(code)      -> Promise<[{table, columns, rows}]>  (dữ liệu mẫu)
   window.IVSql.grade(code, query) -> Promise<{ ok, cases:[{pass, error?, expected?, got?}] }> */
(function () {
  'use strict';
  var VENDOR = '../assets/vendor/';
  var loading = null;

  function ready() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (window.initSqlJs) return init(resolve, reject);
      var s = document.createElement('script');
      s.src = VENDOR + 'sql-wasm.js';
      s.onload = function () { init(resolve, reject); };
      s.onerror = function () { reject(new Error('Không tải được sql.js')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function init(resolve, reject) {
    window.initSqlJs({ locateFile: function (f) { return VENDOR + f; } }).then(resolve, reject);
  }

  function lastResult(db, sql) {
    var res = db.exec(sql);
    return res.length ? res[res.length - 1] : { columns: [], values: [] };
  }
  function cell(v) { return v === null || v === undefined ? null : String(v); }
  function rowsOf(r) { return (r.values || []).map(function (row) { return row.map(cell); }); }
  function sortRows(rows) {
    return rows.slice().sort(function (a, b) {
      var s = JSON.stringify(a), t = JSON.stringify(b);
      return s < t ? -1 : s > t ? 1 : 0;
    });
  }
  function sameShape(exp, got, ordered) {
    var a = rowsOf(exp), b = rowsOf(got);
    if ((exp.columns || []).length !== (got.columns || []).length) return false;
    if (!ordered) { a = sortRows(a); b = sortRows(b); }
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function tableNames(tablesSql) {
    var out = [], re = /create\s+table\s+(?:if\s+not\s+exists\s+)?["'`]?(\w+)/gi, m;
    while ((m = re.exec(tablesSql))) out.push(m[1]);
    return out;
  }

  function preview(code) {
    return ready().then(function (SQL) {
      var db = new SQL.Database();
      db.run(code.tables + '\n' + ((code.datasets && code.datasets[0]) || ''));
      var res = tableNames(code.tables).map(function (t) {
        var r;
        try { r = lastResult(db, 'SELECT * FROM ' + t + ' LIMIT 5'); }
        catch (e) { r = { columns: [], values: [] }; }
        return { table: t, columns: r.columns, rows: rowsOf(r) };
      });
      db.close();
      return res;
    });
  }

  function grade(code, query) {
    return ready().then(function (SQL) {
      var sets = code.datasets && code.datasets.length ? code.datasets : [''];
      var cases = sets.map(function (data) {
        var setup = code.tables + '\n' + data, exp, got;
        try {
          var d1 = new SQL.Database(); d1.run(setup);
          exp = lastResult(d1, code.solution); d1.close();
        } catch (e) {
          return { pass: false, error: 'Lời giải mẫu lỗi: ' + e.message };
        }
        try {
          var d2 = new SQL.Database(); d2.run(setup);
          got = lastResult(d2, query); d2.close();
        } catch (e) {
          return { pass: false, error: String(e.message || e) };
        }
        return {
          pass: sameShape(exp, got, code.ordered),
          expected: { columns: exp.columns, rows: rowsOf(exp) },
          got: { columns: got.columns, rows: rowsOf(got) },
        };
      });
      return { ok: cases.every(function (c) { return c.pass; }), cases: cases };
    });
  }

  window.IVSql = { ready: ready, preview: preview, grade: grade, tableNames: tableNames };
})();
