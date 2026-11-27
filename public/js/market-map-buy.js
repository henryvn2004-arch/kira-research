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
    const K = window.kiraCheckout;
    await whenReady();
    const orderId = K.orderFromUrl();
    if (!orderId) { if (K.cancelSeen('list')) history.replaceState({}, '', location.pathname); return; }
    // No sign-in needed: the server files the purchase under the payer's PayPal email and signs this browser in.
    say(M.finalising);
    btn.disabled = true;
    const fin = await K.finish({ endpoint: '/api/list-buy', orderId, item: 'list', id: slug, name: slug });
    history.replaceState({}, '', location.pathname);
    if (fin.ok && fin.body && fin.body.purchase) {
      showResult(fin.body.purchase);
      if (fin.guestEmail) msg.appendChild(document.createTextNode(' ' + K.t('doneGuest', loc).replace('{email}', fin.guestEmail)));
    } else { say(M.couldNot); btn.disabled = false; }
  }

  // Licence picker (single / team / company); the price on the button follows the choice.
  const licBox = document.getElementById('mm-lic');
  if (licBox && window.kiraCheckout) {
    const K = window.kiraCheckout, base = Number(licBox.getAttribute('data-base')) || 0;
    const label = btn.textContent;
    licBox.innerHTML = K.licenceHtml(base, loc);
    K.bindLicence(licBox, (lic) => { btn.textContent = label.replace('$' + base, '$' + K.licencePrice(base, lic)); });
  }

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const res = await window.kiraCheckout.start({ endpoint: '/api/list-buy', body: { slug, loc }, item: 'list', id: slug, name: slug });
    if (res.error) { say(res.error === 'waiver' ? window.kiraCheckout.t('waiverNeeded', loc) : res.error === 'network' ? M.network : M.startFail + ' (' + res.error + ').'); btn.disabled = false; }
  });

  capture().catch(() => say(M.reload));
})();
