/* Trang /tai-khoan/ — hồ sơ, dashboard cá nhân, cài đặt, xoá dữ liệu.
   Dựa hoàn toàn vào window.IVAuth (assets/auth.js). */
(function () {
  'use strict';
  var page = document.querySelector('.acct-page');
  if (!page) return;
  var $ = function (s) { return page.querySelector(s); };

  var TOPICS = [];
  try { TOPICS = JSON.parse(document.getElementById('acct-topics-data').textContent) || []; } catch (e) {}

  function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }

  var guest = $('[data-acct-guest]'), userBox = $('[data-acct-user]');

  if (!window.IVAuth || !window.IVAuth.enabled) {
    guest.hidden = false;
    var dis = $('[data-acct-disabled]'); if (dis) dis.hidden = false;
    return;
  }

  var signinBtn = document.createElement('button');
  signinBtn.type = 'button';
  signinBtn.className = 'acct-btn';
  signinBtn.textContent = 'Đăng nhập bằng Google';
  signinBtn.addEventListener('click', function () { window.IVAuth.openLogin(); });
  $('[data-acct-signin]').appendChild(signinBtn);

  function streak(log) {
    var n = 0, d = new Date(), t = new Date().toISOString().slice(0, 10);
    if (!log[t]) d.setDate(d.getDate() - 1);
    while (log[d.toISOString().slice(0, 10)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function topicOf(id) {
    var cut = id.lastIndexOf('-');
    return cut > 0 ? id.slice(0, cut) : id;
  }

  function paintStats() {
    var learned = lsGet('iv-questions-learned', {}), srs = lsGet('iv-srs', {}), log = lsGet('iv-practice-log', {});
    var now = Date.now(), due = 0, id;
    for (id in srs) if (!learned[id] && srs[id].due <= now) due++;
    var week = 0, d = new Date();
    for (var i = 0; i < 7; i++) { week += log[d.toISOString().slice(0, 10)] || 0; d.setDate(d.getDate() - 1); }

    set('learned', Object.keys(learned).length);
    set('due', due);
    set('streak', streak(log));
    set('week', week);

    var byTopic = {};
    for (id in learned) { var tp = topicOf(id); byTopic[tp] = (byTopic[tp] || 0) + 1; }
    var host = $('[data-acct-topics]'); host.innerHTML = '';
    TOPICS.forEach(function (t) {
      var got = byTopic[t.id] || 0, pct = t.count ? Math.round((got / t.count) * 100) : 0;
      var row = document.createElement('div');
      row.className = 'acct-topic-row';
      row.innerHTML = '<span class="acct-topic-name">' + (t.icon || '') + ' ' + t.name + '</span>' +
        '<span class="acct-topic-bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="acct-topic-n">' + got + '/' + t.count + '</span>';
      host.appendChild(row);
    });
  }
  function set(k, v) { var el = page.querySelector('[data-acct-stats] [data-k="' + k + '"]'); if (el) el.textContent = v; }

  function render(u) {
    guest.hidden = !!u;
    userBox.hidden = !u;
    if (!u) return;
    $('[data-acct-name]').textContent = u.name || '';
    $('[data-acct-email]').textContent = u.email || '';
    var av = $('[data-acct-avatar]');
    if (u.picture) { av.src = u.picture; av.hidden = false; } else av.hidden = true;
    $('[data-acct-tier]').textContent = u.tier === 'premium' ? '★ Premium' : 'Gói miễn phí';
    $('[data-acct-display]').value = u.displayName || u.name || '';
    $('[data-acct-show]').checked = !!u.showOnLeaderboard;
    paintStats();
  }

  window.addEventListener('iv-progress', function () { if (window.IVAuth.signedIn()) paintStats(); });
  window.IVAuth.onChange(render);

  $('[data-acct-signout]').addEventListener('click', function () { window.IVAuth.signOut(); });

  $('[data-acct-save]').addEventListener('click', function () {
    var btn = this; btn.disabled = true;
    window.IVAuth.api('/settings', {
      method: 'POST',
      body: { displayName: $('[data-acct-display]').value, showOnLeaderboard: $('[data-acct-show]').checked },
    }).then(function (res) {
      btn.disabled = false;
      if (res && res.ok) {
        var s = $('[data-acct-saved]'); s.hidden = false; setTimeout(function () { s.hidden = true; }, 2000);
        window.IVAuth.refresh();
      }
    });
  });

  $('[data-acct-delete]').addEventListener('click', function () {
    if (!confirm('Xoá toàn bộ tài khoản và tiến độ khỏi máy chủ? Không thể hoàn tác.')) return;
    window.IVAuth.api('/account/delete', { method: 'POST' }).then(function (res) {
      if (res && res.ok) {
        try {
          ['iv-session', 'iv-profile', 'iv-srs', 'iv-questions-learned', 'iv-practice-log'].forEach(function (k) {
            localStorage.removeItem(k);
          });
        } catch (e) {}
        window.IVAuth.signOut();
        alert('Đã xoá. Tiến độ trên trình duyệt này cũng đã được dọn.');
        location.reload();
      }
    });
  });
})();
