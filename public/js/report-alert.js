// "Email me new reports on <country> / <industry>" — one small form for report, insight and market-map pages.
// Double opt-in by /api/report-alert (a confirmation email with one free sample). No account, no payment.
//   Static pages: <div id="report-alert" data-country="vietnam" data-industry="fintech"></div> (auto-mounted).
//   Script-rendered pages: kiraReportAlert.mount(parentElement, { country, industry }) appends the box.
// EN / JA / KO / ZH by the page language (first path segment).
(function () {
  var parts = location.pathname.split('/').filter(Boolean);
  var L = ['en', 'ja', 'ko', 'zh'].indexOf(parts[0]) >= 0 ? parts[0] : 'en';
  var T = {
    en: { h: 'New reports on {w}', p: 'One short email a week, only when we publish something new. Confirm once by email; we include a free sample.', ph: 'Your work email', b: 'Email me', ok: 'Check your inbox and confirm. The free sample is in that email.', bad: 'Please enter a valid email address.', err: 'Something went wrong. Please try again.', paused: 'Sign-ups are paused right now. Please try again later.', all: 'all industries' },
    ja: { h: '{w}の新着レポート', p: '新しい資料を公開したときだけ、週に1通お送りします。メールで1回確認いただくと、無料サンプルもお届けします。', ph: '勤務先のメールアドレス', b: 'メールで受け取る', ok: '確認メールをお送りしました。無料サンプルも同じメールに入っています。', bad: 'メールアドレスを正しく入力してください。', err: 'エラーが発生しました。もう一度お試しください。', paused: '現在、受付を一時停止しています。後ほどお試しください。', all: '全業種' },
    ko: { h: '{w} 신규 보고서', p: '새 자료를 게시할 때만 주 1회 짧은 메일을 보내드립니다. 이메일로 한 번 확인하시면 무료 샘플도 함께 드립니다.', ph: '업무용 이메일', b: '이메일로 받기', ok: '받은편지함에서 확인해 주세요. 무료 샘플이 그 메일에 들어 있습니다.', bad: '올바른 이메일 주소를 입력해 주세요.', err: '문제가 발생했습니다. 다시 시도해 주세요.', paused: '현재 신청을 일시 중단했습니다. 나중에 다시 시도해 주세요.', all: '전 산업' },
    zh: { h: '{w}新报告', p: '仅在有新内容发布时，每周发送一封简短邮件。邮件确认一次即可，并附免费样本。', ph: '工作邮箱', b: '邮件通知我', ok: '请查收邮件并确认，免费样本在该邮件中。', bad: '请输入有效的邮箱地址。', err: '出错了，请重试。', paused: '目前暂停接受订阅，请稍后再试。', all: '全部行业' }
  }[L];
  var slug = function (s) { return String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var nice = function (s) { return String(s).replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); };

  function build(box, opts) {
    var country = slug(opts.country), industry = slug(opts.industry);
    if (!country) return;
    var who = nice(country) + (industry ? ' · ' + nice(industry) : '');
    box.innerHTML = '<div style="border:1px solid var(--border,#ddd);border-radius:10px;padding:18px 20px;margin:28px 0;background:var(--surface,transparent)">' +
      '<h3 style="margin:0 0 6px;font-size:16px">' + esc(T.h.replace('{w}', who)) + '</h3>' +
      '<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:var(--muted,#666)">' + esc(T.p) + '</p>' +
      '<form novalidate style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input type="email" name="email" required autocomplete="email" placeholder="' + esc(T.ph) + '" aria-label="' + esc(T.ph) + '" style="flex:1 1 200px;min-width:0;padding:10px 12px;font-size:14px;border:1px solid var(--border-strong,#bbb);border-radius:6px">' +
      '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">' +
      '<button type="submit" style="padding:10px 18px;font-size:14px;font-weight:600;border:0;border-radius:6px;background:var(--primary,#111);color:#fff;cursor:pointer">' + esc(T.b) + '</button></form>' +
      '<p role="status" aria-live="polite" class="ra-msg" style="margin:10px 0 0;font-size:13px"></p></div>';
    var form = box.querySelector('form'), msg = box.querySelector('.ra-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = form.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { msg.textContent = T.bad; return; }
      var btn = form.querySelector('button'); btn.disabled = true;
      fetch('/api/report-alert', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, country: country, industry: industry || '', locale: L, path: location.pathname, hp: form.elements.hp.value }) })
        .then(function (r) { if (r.status === 503) { msg.textContent = T.paused; btn.disabled = false; return; } if (!r.ok) throw new Error(r.status); form.remove(); msg.textContent = T.ok; })
        .catch(function () { msg.textContent = T.err; btn.disabled = false; });
    });
  }

  window.kiraReportAlert = {
    mount: function (parent, opts) {
      if (!parent || !opts || !opts.country || parent.querySelector('.ra-box')) return;
      var box = document.createElement('section'); box.className = 'ra-box r-container'; parent.appendChild(box); build(box, opts);
    }
  };
  function auto() {
    var el = document.getElementById('report-alert');
    if (el && !el.firstChild) build(el, { country: el.getAttribute('data-country'), industry: el.getAttribute('data-industry') });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})();
