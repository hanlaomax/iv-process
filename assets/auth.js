/* Đăng nhập Google (tuỳ chọn) + đồng bộ tiến độ học qua Worker.
   Site vẫn chạy đầy đủ khi tắt JS hoặc khi chưa cấu hình GOOGLE_CLIENT_ID. */
(function () {
  'use strict';

  var CLIENT_ID = window.IV_GOOGLE_CLIENT_ID || '';
  var API = (window.IV_ANALYTICS || '').replace(/\/+$/, '');
  var ROOT = window.IV_ROOT || '';
  var ENABLED = !!(CLIENT_ID && API);

  var K_SESSION = 'iv-session', K_PROFILE = 'iv-profile';
  var K_SRS = 'iv-srs', K_LEARNED = 'iv-questions-learned', K_LOG = 'iv-practice-log';
  var today = new Date().toISOString().slice(0, 10);

  function lsGet(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var session = null, user = null, listeners = [];
  try { session = localStorage.getItem(K_SESSION) || null; } catch (e) {}
  user = lsGet(K_PROFILE, null);

  function fire() {
    renderHeader();
    for (var i = 0; i < listeners.length; i++) try { listeners[i](user); } catch (e) {}
  }

  function setSession(tok, u) {
    session = tok; user = u;
    try {
      if (tok) localStorage.setItem(K_SESSION, tok); else localStorage.removeItem(K_SESSION);
    } catch (e) {}
    if (u) lsSet(K_PROFILE, u); else { try { localStorage.removeItem(K_PROFILE); } catch (e) {} }
    fire();
  }

  /* ---------- gọi API ---------- */
  function api(path, opts) {
    opts = opts || {};
    var headers = opts.headers || {};
    if (session) headers.Authorization = 'Bearer ' + session;
    if (opts.body && typeof opts.body !== 'string') {
      opts.body = JSON.stringify(opts.body);
      headers['Content-Type'] = 'text/plain;charset=UTF-8';
    }
    return fetch(API + path, {
      method: opts.method || 'GET', headers: headers, body: opts.body || undefined,
      credentials: 'omit', mode: 'cors',
    }).then(function (r) {
      if (r.status === 401 && session) { setSession(null, null); }
      return r.json().catch(function () { return { ok: false }; });
    });
  }

  /* ---------- đồng bộ tiến độ ---------- */
  function localBlob() {
    return { srs: lsGet(K_SRS, {}), learned: lsGet(K_LEARNED, {}), log: lsGet(K_LOG, {}) };
  }

  function merge(server) {
    var loc = localBlob(), s = server || {};
    var srs = {}, learned = {}, log = {};
    var a = s.srs || {}, b = loc.srs, id;
    for (id in a) srs[id] = a[id];
    for (id in b) {
      var x = srs[id], y = b[id];
      if (!x || (y.reps || 0) > (x.reps || 0) || ((y.reps || 0) === (x.reps || 0) && (y.due || 0) > (x.due || 0))) srs[id] = y;
    }
    var la = s.learned || {}, lb = loc.learned;
    for (id in la) learned[id] = 1;
    for (id in lb) learned[id] = 1;
    var ga = s.log || {}, gb = loc.log, d;
    for (d in ga) log[d] = ga[d];
    for (d in gb) log[d] = Math.max(log[d] || 0, gb[d]);

    var before = JSON.stringify(loc);
    lsSet(K_SRS, srs); lsSet(K_LEARNED, learned); lsSet(K_LOG, log);
    var after = JSON.stringify({ srs: srs, learned: learned, log: log });
    if (before !== after) window.dispatchEvent(new Event('iv-progress'));
    return { srs: srs, learned: learned, log: log };
  }

  var pushTimer = null;
  function pushProgress() {
    if (!session) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      var b = localBlob();
      api('/progress', { method: 'POST', body: { data: b, todayReviews: b.log[today] || 0 } });
    }, 2500);
  }

  function pullAndMerge() {
    if (!session) return;
    api('/progress').then(function (res) {
      if (!res || !res.ok) return;
      var merged = merge(res.data || {});
      var localCount = Object.keys(merged.learned).length;
      var serverCount = Object.keys((res.data && res.data.learned) || {}).length;
      if (localCount !== serverCount || JSON.stringify(merged) !== JSON.stringify(res.data)) pushNow(merged);
    });
  }
  function pushNow(b) {
    api('/progress', { method: 'POST', body: { data: b, todayReviews: b.log[today] || 0 } });
  }

  /* ---------- Google Identity Services ---------- */
  var gisPromise = null;
  function loadGis() {
    if (gisPromise) return gisPromise;
    gisPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    return gisPromise;
  }

  function onCredential(resp) {
    if (!resp || !resp.credential) return;
    api('/auth', { method: 'POST', body: { credential: resp.credential } }).then(function (res) {
      if (res && res.ok && res.token) {
        setSession(res.token, res.user);
        closeModal();
        pullAndMerge();
      } else {
        var e = modal && modal.querySelector('[data-auth-err]');
        if (e) { e.hidden = false; e.textContent = 'Đăng nhập thất bại. Thử lại.'; }
      }
    });
  }

  function renderGisButton(container) {
    loadGis().then(function () {
      /* global google */
      google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, ux_mode: 'popup' });
      container.innerHTML = '';
      google.accounts.id.renderButton(container, { theme: 'filled_blue', size: 'large', text: 'signin_with', locale: 'vi', width: 260 });
    }).catch(function () {
      container.textContent = 'Không tải được Google Sign-In (kiểm tra kết nối).';
    });
  }

  /* ---------- modal đồng ý ---------- */
  var modal = null;
  function buildModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-h">' +
        '<button type="button" class="auth-close" data-auth-close aria-label="Đóng">×</button>' +
        '<h2 id="auth-h">Đăng nhập bằng Google</h2>' +
        '<p class="auth-lead">Đăng nhập để đồng bộ tiến độ học giữa các thiết bị, tham gia bảng xếp hạng và mở khoá nội dung premium.</p>' +
        '<ul class="auth-list">' +
          '<li>Chúng tôi lưu: <b>email, tên, ảnh đại diện Google</b> và tiến độ học của bạn.</li>' +
          '<li>Lượt xem trang <b>không</b> bị gắn với danh tính của bạn — thống kê vẫn ẩn danh.</li>' +
          '<li>Tên chỉ lên bảng xếp hạng nếu bạn tự bật. Xoá dữ liệu bất cứ lúc nào ở trang Tài khoản.</li>' +
        '</ul>' +
        '<label class="auth-consent"><input type="checkbox" data-auth-agree> ' +
          'Tôi đã đọc và đồng ý với <a href="' + ROOT + 'privacy/" target="_blank" rel="noopener">Chính sách bảo mật</a>.</label>' +
        '<div class="auth-gis" data-auth-gis hidden></div>' +
        '<p class="auth-err" data-auth-err hidden></p>' +
      '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.hasAttribute('data-auth-close')) closeModal();
    });
    var agree = modal.querySelector('[data-auth-agree]');
    var gis = modal.querySelector('[data-auth-gis]');
    agree.addEventListener('change', function () {
      gis.hidden = !agree.checked;
      if (agree.checked) renderGisButton(gis); else gis.innerHTML = '';
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
    return modal;
  }
  function openModal() { buildModal(); modal.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeModal() { if (modal) modal.hidden = true; document.body.style.overflow = ''; }

  /* ---------- header ---------- */
  function renderHeader() {
    var slots = document.querySelectorAll('[data-acct]');
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i];
      if (!ENABLED) { el.hidden = true; continue; }
      el.hidden = false;
      if (user) {
        el.innerHTML = '<a class="acct-btn acct-btn-in" href="' + ROOT + 'tai-khoan/">' +
          (user.picture ? '<img src="' + user.picture + '" alt="" width="24" height="24">' : '<span class="acct-ava-fb">' + (user.name || '?').charAt(0) + '</span>') +
          '<span class="acct-btn-name">' + (user.name || 'Tài khoản') + '</span></a>';
      } else {
        el.innerHTML = '<button type="button" class="acct-btn" data-acct-login>Đăng nhập</button>';
        el.querySelector('[data-acct-login]').addEventListener('click', openModal);
      }
    }
  }

  /* ---------- API công khai ---------- */
  window.IVAuth = {
    enabled: ENABLED,
    get user() { return user; },
    get token() { return session; },
    signedIn: function () { return !!session; },
    onChange: function (fn) { listeners.push(fn); try { fn(user); } catch (e) {} },
    api: api,
    openLogin: openModal,
    signOut: function () {
      try { if (window.google && google.accounts) google.accounts.id.disableAutoSelect(); } catch (e) {}
      setSession(null, null);
    },
    pushProgress: pushProgress,
    refresh: function () {
      if (!session) return Promise.resolve(null);
      return api('/me').then(function (r) {
        if (r && r.ok) { user = r.user; lsSet(K_PROFILE, user); fire(); }
        return r;
      });
    },
  };

  renderHeader();
  if (session) { pullAndMerge(); window.IVAuth.refresh(); }
})();
