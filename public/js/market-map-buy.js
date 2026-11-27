// Market map page: buy the Excel list (PayPal, same flow as the transcript purchase). Only loaded while
// checkout.list_enabled is on. Needs the Supabase client and /auth.js (window.db) loaded first.
(function () {
  const root = document.getElementById('mm-root');
  const btn = document.getElementById('mm-buy');
  const msg = document.getElementById('mm-msg');
  if (!root || !btn || !msg) return;
  const slug = root.getAttribute('data-slug');
  const loc = root.getAttribute('data-loc') || 'en';
  // texts of the page language (server-rendered into data-msgs, api/_lib/market-map/i18n.js); English when missing
  const EN = {
    download: 'Download your Excel list', linkNote: ' The link works for 7 days and 5 downloads. It is also under My Library in your profile.',
    prepared: 'Thank you. Your file is being prepared and we will email you the download link. It will also appear under My Library in your profile.',
    finalising: 'Finalising your purchase. Please do not close this tab.', signInFinish: 'Sign in to finish your purchase', signInBuy: 'Sign in to buy this list',
    couldNot: 'We could not finish the purchase. If PayPal charged you, reply to your PayPal receipt and we will fix it.',
    startFail: 'Could not start checkout', network: 'Network error starting checkout. Please retry.', reload: 'Something went wrong. Please reload the page.',
  };
  let M = EN;
  try { M = Object.assign({}, EN, JSON.parse(root.getAttribute('data-msgs') || '{}')); } catch (_e) { /* English */ }
  const say = (t) => { msg.textContent = t; };
  const whenReady = async () => { for (let i = 0; i < 100 && !window.kiraAuth; i++) await new Promise((r) => setTimeout(r, 20)); };
  const ORDER_RE = /^[A-Za-z0-9_-]{5,64}$/;

  function showResult(p) {
    msg.textContent = '';
    if (p.status === 'ready' && p.downloadUrl) {
      const a = document.createElement('a');
      a.href = p.downloadUrl; a.textContent = M.download; a.className = 'btn'; a.style.marginTop = '8px';
      msg.appendChild(a);
      msg.appendChild(document.createTextNode(M.linkNote));
    } else {
      say(M.prepared);
    }
  }

  async function capture() {
    const qs = new URLSearchParams(location.search);
    let orderId = qs.get('paypal') === 'success' ? qs.get('token') : null;
    if (!orderId) { try { orderId = sessionStorage.getItem('kira_pending_lcapture'); } catch (_e) { /* storage blocked */ } }
    if (!ORDER_RE.test(orderId || '')) { if (qs.get('paypal') === 'cancel') history.replaceState({}, '', location.pathname); return; }
    await whenReady();
    const s0 = window.db ? (await window.db.auth.getSession()).data.session : null;
    if (!s0) {
      try { sessionStorage.setItem('kira_pending_lcapture', orderId); sessionStorage.setItem('kira_redirect_after_login', location.pathname); } catch (_e) { /* storage blocked */ }
      location.href = '/auth.html?msg=' + encodeURIComponent(M.signInFinish);
      return;
    }
    say(M.finalising);
    btn.disabled = true;
    const r = await fetch('/api/list-buy?action=capture', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s0.access_token }, body: JSON.stringify({ orderId }) });
    try { sessionStorage.removeItem('kira_pending_lcapture'); } catch (_e) { /* storage blocked */ }
    history.replaceState({}, '', location.pathname);
    const b = await r.json().catch(() => ({}));
    if (r.ok && b.purchase && b.order && window.kiraPurchase) window.kiraPurchase({ id: b.order.id, value: b.order.amount, currency: b.order.currency, slug: b.purchase.slug, name: b.purchase.slug, kind: 'list' });
    if (r.ok && b.purchase) showResult(b.purchase); else { say(M.couldNot); btn.disabled = false; }
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await whenReady();
      const session = window.db ? (await window.db.auth.getSession()).data.session : null;
      if (!session) {
        try { sessionStorage.setItem('kira_redirect_after_login', location.pathname); } catch (_e) { /* storage blocked */ }
        location.href = '/auth.html?msg=' + encodeURIComponent(M.signInBuy);
        return;
      }
      const r = await fetch('/api/list-buy?action=create', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ slug, loc }) });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !b.approveUrl) { say(M.startFail + ' (' + (b.error || r.status) + ').'); btn.disabled = false; return; }
      location.href = b.approveUrl;
    } catch (_e) { say(M.network); btn.disabled = false; }
  });

  capture().catch(() => say(M.reload));
})();
