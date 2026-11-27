// ============================================================
// KIRA RESEARCH — /js/checkout.js
// Guest-friendly checkout helper shared by the report page, the transcript page and the market-map page.
// Needs the Supabase client + /auth.js (window.db) loaded first; /js/track.js (window.kiraTrack) is optional.
//
//   kiraCheckout.start({ endpoint, body, item, name, id })   buy click -> create order -> PayPal
//   kiraCheckout.finish({ endpoint, orderId, item, name, id }) back from PayPal -> capture -> signed in
//   kiraCheckout.orderFromUrl()                               ?paypal=success&token=ORDER -> id, or null
//   kiraCheckout.licenceHtml(base, loc) / .licence()          licence picker (single / team / company)
//   kiraCheckout.t(key, loc)                                  checkout texts in EN/JA/KO/ZH
//
// No account is needed to buy. The server hands a guest a nonce at create time (kept here in localStorage,
// per order); at capture the server finds or creates the account from the payer's PayPal email and returns a
// purchase-scoped access token (never a login session; the payer email is unverified) so the purchase opens at once in this browser. The account is reached through the emailed link. The price is always computed
// on the server; the numbers shown by the licence picker mirror api/_lib/licence.js (display only).
// ============================================================
(function () {
  'use strict';
  var MULT = { single: 1, team: 1.8, company: 2.6 };
  function noNine(n) { var r = Math.round(n); return r % 10 === 9 ? r - 1 : r; }
  function licencePrice(base, lic) { return lic === 'single' || !MULT[lic] ? Number(base) : noNine(Number(base) * MULT[lic]); }

  var TXT = {
    en: {
      licHead: 'Licence', single: 'Single user', team: 'Team (up to 10 people, same company)', company: 'Company-wide',
      guestNote: 'No account needed. After payment we create one from your PayPal email and send your receipt and a sign-in link.',
      finalising: 'Finalising your purchase…', dontClose: 'Please do not close this tab.',
      done: 'Purchase complete.', doneGuest: 'We emailed a sign-in link to {email} to keep this in My Library.',
      failed: 'We could not finish the purchase. If PayPal charged you, email hello@kiraresearch.com with the PayPal receipt and we will fix it.',
      startFail: 'Could not start checkout', network: 'Network error starting checkout. Please retry.', cancelled: 'Checkout cancelled. You were not charged.'
    },
    ja: {
      licHead: 'ライセンス', single: '個人利用(1名)', team: 'チーム(同一企業で最大10名)', company: '全社利用',
      guestNote: 'アカウント登録は不要です。お支払い後、PayPalのメールアドレスでアカウントを作成し、領収書とサインイン用リンクをお送りします。',
      finalising: 'ご購入を確定しています…', dontClose: 'このタブを閉じないでください。',
      done: 'ご購入ありがとうございます。', doneGuest: 'マイライブラリに保存するためのサインイン用リンクを {email} に送信しました。',
      failed: '購入を完了できませんでした。PayPalで請求済みの場合は、PayPalの領収書を添えて hello@kiraresearch.com までご連絡ください。',
      startFail: 'チェックアウトを開始できませんでした', network: '通信エラーが発生しました。もう一度お試しください。', cancelled: 'チェックアウトをキャンセルしました。請求は発生していません。'
    },
    ko: {
      licHead: '라이선스', single: '개인 (1인)', team: '팀 (같은 회사 최대 10명)', company: '전사 라이선스',
      guestNote: '계정이 필요 없습니다. 결제 후 PayPal 이메일로 계정을 만들고 영수증과 로그인 링크를 보내 드립니다.',
      finalising: '구매를 마무리하는 중입니다…', dontClose: '이 탭을 닫지 마세요.',
      done: '구매가 완료되었습니다.', doneGuest: '내 라이브러리에 보관할 수 있도록 로그인 링크를 {email} (으)로 보냈습니다.',
      failed: '구매를 완료하지 못했습니다. PayPal에서 결제되었다면 PayPal 영수증과 함께 hello@kiraresearch.com 으로 문의해 주세요.',
      startFail: '결제를 시작하지 못했습니다', network: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.', cancelled: '결제가 취소되었습니다. 요금은 청구되지 않았습니다.'
    },
    zh: {
      licHead: '授权', single: '个人(1人)', team: '团队(同一公司最多10人)', company: '全公司授权',
      guestNote: '无需注册账号。付款后,我们会用您的PayPal邮箱创建账号,并发送收据和登录链接。',
      finalising: '正在确认您的购买…', dontClose: '请不要关闭此标签页。',
      done: '购买完成。', doneGuest: '我们已向 {email} 发送登录链接,用于将其保存在“我的资料库”。',
      failed: '未能完成购买。如果PayPal已扣款,请把PayPal收据发到 hello@kiraresearch.com,我们会处理。',
      startFail: '无法开始结账', network: '网络错误,请重试。', cancelled: '结账已取消,未产生扣款。'
    }
  };
  function lang(loc) {
    if (loc && TXT[loc]) return loc;
    var m = /^\/(en|ja|ko|zh)(\/|$)/.exec(location.pathname);
    return m ? m[1] : 'en';
  }
  function t(key, loc) { var l = TXT[lang(loc)]; return (l && l[key]) || TXT.en[key] || key; }

  // ── tracking ─────────────────────────────────────────────
  function track(ev, extra) { try { if (typeof window.kiraTrack === 'function') window.kiraTrack(ev, extra || {}); } catch (_e) { /* never block checkout */ } }
  function gtag(ev, params) { try { if (typeof window.gtag === 'function') window.gtag('event', ev, params); } catch (_e) { /* ignore */ } }
  function ls(op, k, v) {
    try { if (op === 'get') return localStorage.getItem(k); if (op === 'set') localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (_e) { /* storage blocked */ }
    return null;
  }
  function attr() {
    try { var a = JSON.parse(localStorage.getItem('kira_attr')); if (a && a.t && (Date.now() / 1000 - a.t) < 90 * 86400) return a; } catch (_e) { /* none */ }
    return null;
  }
  function gaItem(item, id, name, price) { return [{ item_id: id || '', item_name: name || id || '', item_category: item, price: price, quantity: 1 }]; }

  async function ready() { for (var i = 0; i < 100 && !window.kiraAuth; i++) await new Promise(function (r) { setTimeout(r, 20); }); }
  async function session() { await ready(); return window.db ? (await window.db.auth.getSession()).data.session : null; }

  // ── licence picker ───────────────────────────────────────
  // Radio group; selection kept in kiraCheckout.licence(). `base` is the single-user price in USD.
  var chosen = 'single';
  function licenceHtml(base, loc) {
    var l = lang(loc);
    var rows = ['single', 'team', 'company'].map(function (k) {
      return '<label class="kc-lic-row" style="display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:13px;cursor:pointer">' +
        '<input type="radio" name="kc-licence" value="' + k + '"' + (chosen === k ? ' checked' : '') + ' style="margin-top:3px">' +
        '<span style="flex:1">' + TXT[l][k] + '</span><b>$' + licencePrice(base, k) + '</b></label>';
    }).join('');
    return '<fieldset class="kc-lic" style="border:0;padding:0;margin:0 0 12px"><legend style="font-size:12px;opacity:.7;margin-bottom:4px">' + TXT[l].licHead + '</legend>' + rows + '</fieldset>';
  }
  function bindLicence(root, onChange) {
    (root || document).querySelectorAll('input[name="kc-licence"]').forEach(function (el) {
      el.addEventListener('change', function () { if (el.checked) { chosen = el.value; if (onChange) onChange(chosen, el); } });
    });
  }

  // ── start: buy click -> PayPal ───────────────────────────
  async function start(o) {
    track('buy_click', { it: o.item });
    try {
      var s = await session();
      var headers = { 'Content-Type': 'application/json' };
      if (s) headers.Authorization = 'Bearer ' + s.access_token;
      var body = Object.assign({}, o.body || {}, { licence: o.licence || chosen });
      var r = await fetch(o.endpoint + '?action=create', { method: 'POST', headers: headers, body: JSON.stringify(body) });
      var b = await r.json().catch(function () { return {}; });
      if (!r.ok || !b.approveUrl) return { error: b.error || String(r.status) };
      if (b.nonce) ls('set', 'kira_gn_' + b.orderId, b.nonce);
      ls('set', 'kira_po_' + b.orderId, JSON.stringify({ it: o.item, v: b.amount, n: o.name || '', id: o.id || '' }));
      track('begin_checkout', { it: o.item });
      gtag('begin_checkout', { currency: b.currency || 'USD', value: b.amount, items: gaItem(o.item, o.id, o.name, b.amount) });
      location.href = b.approveUrl;
      return { ok: true };
    } catch (_e) { return { error: 'network' }; }
  }

  // ── finish: back from PayPal -> capture -> signed in ──────
  function orderFromUrl() {
    var qs = new URLSearchParams(location.search);
    var id = qs.get('paypal') === 'success' ? qs.get('token') : null;
    return /^[A-Za-z0-9_-]{5,64}$/.test(id || '') ? id : null;
  }
  function cancelSeen(item) {
    if (new URLSearchParams(location.search).get('paypal') === 'cancel') { track('paypal_cancel', { it: item }); return true; }
    return false;
  }

  async function finish(o) {
    var orderId = o.orderId;
    var nonce = ls('get', 'kira_gn_' + orderId);
    var s = await session();
    var headers = { 'Content-Type': 'application/json' };
    if (s && !nonce) headers.Authorization = 'Bearer ' + s.access_token;
    var payload = { orderId: orderId, attr: attr() };
    if (nonce) payload.nonce = nonce;
    var r, b;
    try {
      r = await fetch(o.endpoint + '?action=capture', { method: 'POST', headers: headers, body: JSON.stringify(payload) });
      b = await r.json().catch(function () { return {}; });
    } catch (_e) { return { ok: false, error: 'network' }; }
    if (!r.ok) return { ok: false, error: b.error || String(r.status), body: b };

    // A guest gets a purchase-scoped access token (this item only), never a login session; the account is reached
    // through the link emailed to the payer. Send it as X-Guest-Token (see guestHeaders).
    var guestEmail = null;
    if (b.guest) {
      guestEmail = b.guest.email || null;
      var gslug = o.id;
      if (b.guest.accessToken && gslug) ls('set', 'kira_gt_' + (o.item || '') + '_' + gslug, b.guest.accessToken);
    }
    ls('remove', 'kira_gn_' + orderId);
    // Purchase event once per order (a reload must not count twice).
    if (!ls('get', 'kira_pd_' + orderId)) {
      ls('set', 'kira_pd_' + orderId, '1');
      var po = {}; try { po = JSON.parse(ls('get', 'kira_po_' + orderId) || '{}'); } catch (_e) { /* none */ }
      var value = Number(b.amount != null ? b.amount : po.v);
      var item = o.item || po.it;
      track('purchase', { it: item, v: value });
      gtag('purchase', { transaction_id: orderId, currency: 'USD', value: value, items: gaItem(item, o.id || po.id, o.name || po.n, value) });
    }
    ls('remove', 'kira_po_' + orderId);
    return { ok: true, body: b, guestEmail: guestEmail };
  }

    // Headers for the access endpoints: the guest token of THIS item (kind = report | transcript), if this browser paid as a guest.
  function guestHeaders(kind, slug) {
    var t = ls('get', 'kira_gt_' + kind + '_' + slug);
    return t ? { 'X-Guest-Token': t } : {};
  }

  window.kiraCheckout = {
    guestHeaders: guestHeaders,
    start: start, finish: finish, orderFromUrl: orderFromUrl, cancelSeen: cancelSeen,
    licenceHtml: licenceHtml, bindLicence: bindLicence, licence: function () { return chosen; },
    licencePrice: licencePrice, t: t, track: track, gtag: gtag
  };
})();
