/* Trang tài khoản, bảng xếp hạng, chính sách bảo mật.
   Khung tĩnh — dữ liệu do assets/account.js & assets/leaderboard.js nạp từ Worker. */
import { head, header, footer, breadcrumb, page } from './templates.mjs';

const common = (o) => ({ root: '../', analyticsUrl: o.analyticsUrl, googleClientId: o.googleClientId });

/* /tai-khoan/ — hồ sơ + dashboard cá nhân + cài đặt + xoá dữ liệu */
export function renderAccountPage(o) {
  const url = `${o.siteUrl}tai-khoan/`;
  const body = `${header({ root: '../', topics: o.topics, current: null })}
<main id="main" class="acct-page">
  <div class="wrap acct-wrap">
    ${breadcrumb([{ name: 'Trang chủ', href: '../' }, { name: 'Tài khoản' }])}
    <h1 class="topic-h1"><span class="topic-h1-icon" aria-hidden="true">👤</span>Tài khoản</h1>

    <section class="acct-guest" data-acct-guest hidden>
      <p class="lede">Đăng nhập bằng Google để <strong>đồng bộ tiến độ học</strong> giữa các thiết bị,
        tham gia <strong>bảng xếp hạng</strong> và mở khoá nội dung premium (khi có).</p>
      <div data-acct-signin></div>
      <p class="acct-note muted" data-acct-disabled hidden>Đăng nhập chưa được cấu hình trên bản deploy này.</p>
    </section>

    <section class="acct-user" data-acct-user hidden>
      <div class="acct-id">
        <img class="acct-avatar" data-acct-avatar alt="" width="56" height="56">
        <div>
          <p class="acct-name" data-acct-name></p>
          <p class="acct-email muted" data-acct-email></p>
          <p class="acct-tier" data-acct-tier></p>
        </div>
        <button type="button" class="btn-ghost" data-acct-signout>Đăng xuất</button>
      </div>

      <div class="acct-stats" data-acct-stats>
        <div class="acct-stat"><b data-k="learned">0</b><span>câu đã thuộc</span></div>
        <div class="acct-stat"><b data-k="due">0</b><span>câu cần ôn</span></div>
        <div class="acct-stat"><b data-k="streak">0</b><span>ngày liên tục</span></div>
        <div class="acct-stat"><b data-k="week">0</b><span>câu luyện / 7 ngày</span></div>
      </div>

      <section class="acct-block">
        <h2>Tiến độ theo chủ đề</h2>
        <div class="acct-topics" data-acct-topics></div>
      </section>
      <script type="application/json" id="acct-topics-data">${JSON.stringify(
        o.topics.map((t) => ({ id: t.id, name: t.name, icon: t.icon, count: (o.counts || {})[t.id] || 0 }))
      ).replace(/</g, '\\u003c')}</script>

      <section class="acct-block">
        <h2>Cài đặt bảng xếp hạng</h2>
        <label class="acct-field">
          <span>Tên hiển thị</span>
          <input type="text" maxlength="32" data-acct-display placeholder="Tên trên bảng xếp hạng">
        </label>
        <label class="acct-check">
          <input type="checkbox" data-acct-show>
          <span>Hiện tôi trên <a href="../bang-xep-hang/">bảng xếp hạng công khai</a> (chỉ tên hiển thị + số câu luyện)</span>
        </label>
        <button type="button" class="btn-ghost" data-acct-save>Lưu cài đặt</button>
        <p class="acct-saved muted" data-acct-saved hidden>Đã lưu.</p>
      </section>

      <section class="acct-block acct-danger">
        <h2>Dữ liệu của bạn</h2>
        <p class="muted">Chúng tôi lưu: email, tên, ảnh đại diện Google, và tiến độ học (câu đã thuộc,
          lịch ôn tập). Lượt xem trang <strong>không</strong> gắn với danh tính của bạn.</p>
        <button type="button" class="btn-danger" data-acct-delete>Xoá tài khoản &amp; toàn bộ dữ liệu</button>
      </section>
    </section>
  </div>
</main>
${footer('../')}`;

  return page({
    root: '../',
    scripts: ['assets/account.js'],
    head: head({
      ...common(o),
      title: 'Tài khoản — Interview Vault',
      description: 'Đăng nhập Google để đồng bộ tiến độ luyện tập giữa các thiết bị.',
      canonical: url,
      robots: 'noindex, follow',
    }),
    body,
  });
}

/* /bang-xep-hang/ — top người luyện nhiều nhất 7 ngày (công khai) */
export function renderLeaderboardPage(o) {
  const url = `${o.siteUrl}bang-xep-hang/`;
  const body = `${header({ root: '../', topics: o.topics, current: null })}
<main id="main" class="lb-page">
  <div class="wrap lb-wrap">
    ${breadcrumb([{ name: 'Trang chủ', href: '../' }, { name: 'Bảng xếp hạng' }])}
    <h1 class="topic-h1"><span class="topic-h1-icon" aria-hidden="true">🏆</span>Bảng xếp hạng</h1>
    <p class="lede">Số câu luyện tập trong 7 ngày gần nhất. Chỉ hiện những người tự bật hiển thị
      trong <a href="../tai-khoan/">Tài khoản</a>.</p>
    <p class="lb-state" data-lb-state>Đang tải…</p>
    <ol class="lb-list" data-lb-list hidden></ol>
  </div>
</main>
${footer('../')}`;

  return page({
    root: '../',
    scripts: ['assets/leaderboard.js'],
    head: head({
      ...common(o),
      title: 'Bảng xếp hạng luyện tập — Interview Vault',
      description: 'Top người luyện tập câu hỏi phỏng vấn nhiều nhất trong 7 ngày trên Interview Vault.',
      canonical: url,
    }),
    body,
  });
}

/* /privacy/ — bắt buộc cho OAuth consent screen của Google */
export function renderPrivacyPage(o) {
  const url = `${o.siteUrl}privacy/`;
  const body = `${header({ root: '../', topics: o.topics, current: null })}
<main id="main" class="prose-page">
  <div class="wrap prose-wrap">
    ${breadcrumb([{ name: 'Trang chủ', href: '../' }, { name: 'Chính sách bảo mật' }])}
    <h1 class="topic-h1"><span class="topic-h1-icon" aria-hidden="true">🔒</span>Chính sách bảo mật</h1>
    <p class="muted">Cập nhật: ${new Date().toISOString().slice(0, 10)}</p>

    <h2>Thống kê truy cập (mọi khách)</h2>
    <p>Chúng tôi đếm lượt xem trang bằng một mã ngẫu nhiên lưu trong <code>localStorage</code> của
      trình duyệt bạn. <strong>Không cookie, không lưu địa chỉ IP, không dịch vụ theo dõi bên thứ ba.</strong>
      Chúng tôi tôn trọng tín hiệu <em>Do Not Track</em>. Xem số liệu tổng hợp tại
      <a href="../stats/">trang Thống kê</a>.</p>

    <h2>Tài khoản Google (tuỳ chọn)</h2>
    <p>Bạn có thể đăng nhập bằng Google. Khi đó chúng tôi nhận và lưu từ hồ sơ Google của bạn:
      <strong>mã định danh (sub), địa chỉ email, tên, và ảnh đại diện</strong>. Chúng tôi dùng các
      thông tin này chỉ để:</p>
    <ul>
      <li>Đồng bộ tiến độ học của bạn (câu đã thuộc, lịch ôn tập) giữa các thiết bị;</li>
      <li>Hiển thị tên bạn chọn trên bảng xếp hạng — <strong>chỉ khi bạn tự bật</strong>;</li>
      <li>Xác định quyền truy cập nội dung premium (nếu bạn được cấp).</li>
    </ul>
    <p>Chúng tôi <strong>không</strong> gắn lượt xem trang của bạn với danh tính Google, không bán
      dữ liệu, không dùng cho quảng cáo, và không chia sẻ với bên thứ ba. Dữ liệu lưu trên
      Cloudflare D1 (khu vực do Cloudflare quản lý).</p>

    <h2>Xoá dữ liệu</h2>
    <p>Vào <a href="../tai-khoan/">Tài khoản → Xoá tài khoản</a> để xoá ngay toàn bộ hồ sơ và tiến độ
      khỏi máy chủ. Bạn cũng có thể thu hồi quyền truy cập tại
      <a href="https://myaccount.google.com/permissions" rel="noopener">Google Account → Bên thứ ba</a>.</p>

    <h2>Liên hệ</h2>
    <p>Thắc mắc về dữ liệu: mở issue tại kho mã nguồn của dự án.</p>
  </div>
</main>
${footer('../')}`;

  return page({
    root: '../',
    head: head({
      ...common(o),
      title: 'Chính sách bảo mật — Interview Vault',
      description: 'Cách Interview Vault xử lý dữ liệu: thống kê ẩn danh, đăng nhập Google tuỳ chọn, quyền xoá dữ liệu.',
      canonical: url,
    }),
    body,
  });
}
