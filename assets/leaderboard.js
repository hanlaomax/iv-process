/* Trang /bang-xep-hang/ — top người luyện nhiều nhất 7 ngày (công khai). */
(function () {
  'use strict';
  var page = document.querySelector('.lb-page');
  if (!page) return;
  var state = page.querySelector('[data-lb-state]');
  var list = page.querySelector('[data-lb-list]');
  var API = (window.IV_ANALYTICS || '').replace(/\/+$/, '');

  if (!API) { state.textContent = 'Bảng xếp hạng chưa được cấu hình trên bản deploy này.'; return; }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  fetch(API + '/leaderboard', { credentials: 'omit', mode: 'cors' })
    .then(function (r) { return r.json(); })
    .then(function (res) {
      if (!res || !res.ok) throw 0;
      if (!res.entries.length) {
        state.textContent = 'Chưa có ai bật hiển thị trên bảng xếp hạng. Hãy là người đầu tiên — vào Tài khoản để bật.';
        return;
      }
      state.hidden = true;
      list.hidden = false;
      list.innerHTML = res.entries.map(function (e) {
        var medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank;
        return '<li class="lb-row"><span class="lb-rank">' + medal + '</span>' +
          '<span class="lb-name">' + esc(e.name) + '</span>' +
          '<span class="lb-score">' + e.reviews + ' câu</span></li>';
      }).join('');
    })
    .catch(function () { state.textContent = 'Không tải được bảng xếp hạng.'; });
})();
