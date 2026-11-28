// ============================================================
// KIRA RESEARCH — /js/consent.js
// Google Consent Mode v2 + a small cookie banner + audience events for Google Ads remarketing (W5, 2026-11-28).
//   - EEA + UK + CH: ad_storage / ad_user_data / ad_personalization / analytics_storage start DENIED until the
//     visitor accepts. Everywhere else they start GRANTED, except ad_* when the browser sends Global Privacy
//     Control or Do Not Track (then ad_* stay denied whatever was chosen before).
//   - The choice is kept in this browser (localStorage `kira_consent`) and sent with gtag('consent','update').
//   - Banner (Accept / Reject / Settings) only where consent is needed. Footer link "Cookie settings" everywhere.
//   - Region comes from Google's own `region` default (no wait) and, for the banner, from /api/consent-region
//     (Vercel's x-vercel-ip-country header), cached one day in the browser.
//   - Pure logic is exported for tests (node: require / import). Loaded by nav.js only, never by auth.html.
// ============================================================
/* global module */
(function (root) {
  'use strict';
  var EEA = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO'];
  var REGIONS = EEA.concat(['GB', 'CH']);
  var KEY = 'kira_consent', CC_KEY = 'kira_cc', CC_TTL = 86400000;
  var AUD_KEYS = ['page_type', 'country', 'segment', 'analysis'];

  function needsConsent(cc) { return !!cc && REGIONS.indexOf(String(cc).toUpperCase()) >= 0; }
  function gpcOn(nav, win) {
    nav = nav || {}; win = win || {};
    return nav.globalPrivacyControl === true || nav.doNotTrack === '1' || nav.doNotTrack === 'yes' ||
      nav.msDoNotTrack === '1' || win.doNotTrack === '1';
  }
  function parseChoice(raw) {
    try {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object' && typeof o.ad === 'boolean' && typeof o.an === 'boolean') return { ad: o.ad, an: o.an };
    } catch (_e) { /* no or bad value */ }
    return null;
  }
  function readChoice(storage) { try { return parseChoice(storage.getItem(KEY)); } catch (_e) { return null; } }
  function saveChoice(storage, c) { try { storage.setItem(KEY, JSON.stringify({ ad: !!c.ad, an: !!c.an, t: Date.now() })); } catch (_e) { /* blocked: choice lasts this page only */ } }
  function g(b) { return b ? 'granted' : 'denied'; }
  // The four Consent Mode signals. choice = saved choice or null; needs = visitor is in a region that requires consent.
  function stateFor(choice, gpc, needs) {
    var ad, an;
    if (choice) { ad = choice.ad; an = choice.an; } else { ad = !needs; an = !needs; }
    if (gpc) ad = false;
    return { ad_storage: g(ad), ad_user_data: g(ad), ad_personalization: g(ad), analytics_storage: g(an) };
  }
  // Allowed audience params from the page's <meta name="kira-audience" content="page_type=report&country=vietnam&...">.
  function parseAudience(content) {
    var out = {};
    String(content || '').split('&').forEach(function (kv) {
      var i = kv.indexOf('='); if (i < 1) return;
      var k = kv.slice(0, i), v = kv.slice(i + 1);
      try { v = decodeURIComponent(v); } catch (_e) { return; }
      if (AUD_KEYS.indexOf(k) >= 0 && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(v)) out[k] = v.toLowerCase();
    });
    return out.page_type ? out : null;
  }

  var T = {
    en: { t: 'Cookies', m: 'We use cookies to measure visits and, with your OK, to show relevant ads to people who visited this site, including ads from our sister company BizDirect Asia.', a: 'Accept', r: 'Reject', s: 'Settings', an: 'Analytics (visit statistics)', ad: 'Advertising and personalisation', save: 'Save', p: 'Privacy', c: 'Close' },
    ja: { t: 'Cookie', m: '当サイトでは、訪問の計測のほか、同意いただいた場合に限り、当サイトを訪問した方へ関連する広告（姉妹会社 BizDirect Asia の広告を含む）を表示するために Cookie を使用します。', a: '同意する', r: '拒否する', s: '設定', an: '分析（訪問統計）', ad: '広告とパーソナライズ', save: '保存', p: 'プライバシー', c: '閉じる' },
    ko: { t: '쿠키', m: '방문 측정을 위해, 그리고 동의하신 경우에 한해 이 사이트를 방문한 분께 관련 광고(자매회사 BizDirect Asia 광고 포함)를 보여 드리기 위해 쿠키를 사용합니다.', a: '동의', r: '거부', s: '설정', an: '분석(방문 통계)', ad: '광고 및 맞춤 설정', save: '저장', p: '개인정보', c: '닫기' },
    zh: { t: 'Cookie', m: '我们使用 Cookie 统计访问；经您同意，还会向访问过本站的人展示相关广告（包括姐妹公司 BizDirect Asia 的广告）。', a: '接受', r: '拒绝', s: '设置', an: '分析（访问统计）', ad: '广告与个性化', save: '保存', p: '隐私', c: '关闭' }
  };

  var api = { REGIONS: REGIONS, needsConsent: needsConsent, gpcOn: gpcOn, parseChoice: parseChoice, readChoice: readChoice, saveChoice: saveChoice, stateFor: stateFor, parseAudience: parseAudience, KEY: KEY };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;   // node (tests): logic only

  var doc = root.document, nav = root.navigator || {}, ls = null, gaId = '', locale = 'en', bannerEl = null;
  try { ls = root.localStorage; } catch (_e) { ls = null; }
  var store = ls || { getItem: function () { return null; }, setItem: function () {} };
  function gtag() { root.dataLayer.push(arguments); }

  function apply(choice, needs) {
    var st = stateFor(choice, gpcOn(nav, root), needs);
    gtag('consent', 'update', st);
    var ads = st.ad_storage === 'granted';
    gtag('set', 'allow_google_signals', ads);
    gtag('set', 'allow_ad_personalization_signals', ads);
  }

  function getCountry(cb) {
    try {
      var c = JSON.parse(store.getItem(CC_KEY) || 'null');
      if (c && c.cc !== undefined && Date.now() - c.t < CC_TTL) { cb(c.cc); return; }
    } catch (_e) { /* refetch */ }
    root.fetch('/api/consent-region', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (j) {
      var cc = j && j.country ? String(j.country).toUpperCase() : '';
      try { store.setItem(CC_KEY, JSON.stringify({ cc: cc, t: Date.now() })); } catch (_e) { /* ignore */ }
      cb(cc);
    }).catch(function () { cb(null); });
  }

  function css() {
    if (doc.getElementById('kira-consent-css')) return;
    var s = doc.createElement('style'); s.id = 'kira-consent-css';
    s.textContent = '#kira-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:560px;margin:0 auto;background:var(--surface,#fff);color:var(--text,#111);border:1px solid var(--border,#d5d5d5);border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:14px 16px;font:14px/1.45 system-ui,sans-serif}' +
      '#kira-consent p{margin:0 0 10px}#kira-consent a{color:inherit;text-decoration:underline}' +
      '#kira-consent .kc-row{display:flex;gap:8px;flex-wrap:wrap}#kira-consent button{font:inherit;cursor:pointer;border-radius:8px;padding:7px 14px;border:1px solid var(--border,#bbb);background:transparent;color:inherit}' +
      '#kira-consent button.kc-p{background:var(--primary,#111);color:var(--on-primary,#fff);border-color:transparent}' +
      '#kira-consent label{display:flex;gap:8px;align-items:center;margin:6px 0}';
    doc.head.appendChild(s);
  }
  function close() { if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl); bannerEl = null; }
  function choose(ad, an) { var c = { ad: ad, an: an }; saveChoice(store, c); apply(c, true); close(); }
  function mk(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function open(settingsView) {
    css(); close();
    var x = T[locale] || T.en, saved = readChoice(store);
    var box = mk('div'); box.id = 'kira-consent'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', x.t);
    var p = mk('p', '', x.m); box.appendChild(p);
    var priv = mk('a', '', x.p); priv.href = '/' + locale + '/privacy'; p.appendChild(doc.createTextNode(' ')); p.appendChild(priv);
    var row = mk('div', 'kc-row');
    if (!settingsView) {
      var a = mk('button', 'kc-p', x.a), r = mk('button', '', x.r), s = mk('button', '', x.s);
      a.onclick = function () { choose(true, true); }; r.onclick = function () { choose(false, false); }; s.onclick = function () { open(true); };
      row.appendChild(a); row.appendChild(r); row.appendChild(s);
    } else {
      var lan = mk('label'), cbA = mk('input'); cbA.type = 'checkbox'; cbA.checked = saved ? saved.an : true; lan.appendChild(cbA); lan.appendChild(doc.createTextNode(x.an));
      var lad = mk('label'), cbD = mk('input'); cbD.type = 'checkbox'; cbD.checked = saved ? saved.ad : true; lad.appendChild(cbD); lad.appendChild(doc.createTextNode(x.ad));
      if (gpcOn(nav, root)) { cbD.checked = false; cbD.disabled = true; }
      box.appendChild(lan); box.appendChild(lad);
      var sv = mk('button', 'kc-p', x.save), cl = mk('button', '', x.c);
      sv.onclick = function () { choose(cbD.checked, cbA.checked); }; cl.onclick = close;
      row.appendChild(sv); row.appendChild(cl);
    }
    box.appendChild(row); doc.body.appendChild(box); bannerEl = box;
  }

  // Called by nav.js once this file has loaded: sets consent defaults BEFORE gtag.js starts, then config + audience event.
  function boot(id, loc) {
    if (gaId) return; gaId = id; locale = T[loc] ? loc : 'en';
    root.dataLayer = root.dataLayer || [];
    var gpc = gpcOn(nav, root), saved = readChoice(store);
    if (saved) {
      gtag('consent', 'default', stateFor(saved, gpc, true));
    } else {
      gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', region: REGIONS, wait_for_update: 500 });
      gtag('consent', 'default', stateFor(null, gpc, false));
    }
    var s = doc.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id; doc.head.appendChild(s);
    var ads = stateFor(saved, gpc, false).ad_storage === 'granted';
    gtag('js', new Date());
    gtag('config', id, { allow_google_signals: ads, allow_ad_personalization_signals: ads });
    var m = doc.querySelector('meta[name="kira-audience"]'), aud = m ? parseAudience(m.getAttribute('content')) : null;
    if (aud) gtag('event', 'view_item', aud);
    if (!saved) getCountry(function (cc) { if (needsConsent(cc) && !readChoice(store)) open(false); });
  }

  root.kiraConsent = { boot: boot, open: function () { open(true); } };
  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-kira-cookie-settings]') : null;
    if (t) { e.preventDefault(); open(true); }
  });
})(typeof window !== 'undefined' ? window : null);
