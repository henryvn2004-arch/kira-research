// ============================================================
// KIRA RESEARCH — /js/track.js
// First-party funnel events for /en/admin/funnel. Privacy by construction:
//   - no cookies, no IP, no email: only a random per-tab id (sessionStorage) + path + coarse source
//   - respects Do Not Track; does nothing on admin, studio, previews and localhost
// Ad attribution (S17): when a visitor lands from a Google Ads click (gclid / gbraid / wbraid, or utm_source),
//   the click id and campaign tags are kept in this browser for 90 days (localStorage) and added as `attr`
//   to the body of sign-up POSTs, so a sign-up can be traced to its ad click (/api/admin-ads-conversions).
//   Same off-switches as below: Do Not Track, admin, previews, localhost. Outside the EEA/UK only (see /privacy).
// Events: pageview (on load), search (library search with 3+ letters, once per query),
//         request_email / waitlist / lead (a successful form POST) — all detected by watching
//         fetch, so no form on the site needs to be edited.
// ============================================================
(function () {
  'use strict';
  if (window.kiraTrack) return;
  var noop = function () {};
  var loc = window.location;
  var onProd = /^(www\.)?kiraresearch\.com$/.test(loc.hostname);
  var dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
  if (!onProd || dnt || /^\/(en\/)?admin(\/|$)/.test(loc.pathname)) { window.kiraTrack = noop; return; }

  var sid;
  try {
    sid = sessionStorage.getItem('kira_sid');
    if (!sid) { sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); sessionStorage.setItem('kira_sid', sid); }
  } catch (_e) { sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36); }

  var refHost = '';
  try { refHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (_e) { /* ignore */ }
  var utm = '';
  var qs = null;
  try { qs = new URLSearchParams(loc.search); utm = (qs.get('utm_source') || '').slice(0, 40); } catch (_e) { /* ignore */ }

  // Ad click: remember it (last click wins) for 90 days.
  var ATTR_KEY = 'kira_attr', ATTR_TTL = 90 * 86400;
  var ATTR_FIELDS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  function readAttr() {
    try {
      var a = JSON.parse(localStorage.getItem(ATTR_KEY));
      if (a && a.t && (Date.now() / 1000 - a.t) < ATTR_TTL) return a;
    } catch (_e) { /* ignore */ }
    return null;
  }
  if (qs && (qs.get('gclid') || qs.get('gbraid') || qs.get('wbraid') || qs.get('utm_source'))) {
    var fresh = { lp: loc.pathname, t: Math.floor(Date.now() / 1000) };
    ATTR_FIELDS.forEach(function (k) { var v = qs.get(k); if (v) fresh[k] = v.slice(0, 200); });
    try { localStorage.setItem(ATTR_KEY, JSON.stringify(fresh)); } catch (_e) { /* storage blocked: attribution is simply skipped */ }
  }
  var attr = readAttr();
  // A landing with a Google click id but no utm_source is still labelled, so paid visits are not mixed up with
  // organic Google. Only the landing itself is labelled (not later visits that merely remember the click).
  if (!utm && qs && (qs.get('gclid') || qs.get('gbraid') || qs.get('wbraid'))) utm = 'google-ads';

  function send(event, extra) {
    var body = JSON.stringify(Object.assign({ e: event, s: sid, p: loc.pathname, r: refHost, u: utm }, extra || {}));
    try {
      if (!(navigator.sendBeacon && navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' })))) {
        fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, keepalive: true }).catch(noop);
      }
    } catch (_e) { /* tracking must never break the page */ }
  }
  window.kiraTrack = send;

  // Watch fetch: successful signup POSTs and library searches.
  // A moves alert (D7) counts as "left an email to be told", like a topic request.
  var SIGNUP = { '/api/topic-request': 'request_email', '/api/moves-alert': 'request_email', '/api/waitlist': 'waitlist', '/api/leads': 'lead' };
  var seenQueries = {};
  var realFetch = window.fetch;
  if (typeof realFetch === 'function') {
    window.fetch = function (input, init) {
      var args = arguments;
      try {
        // Attach the remembered ad click to sign-up POSTs (JSON bodies only).
        var u0 = String(typeof input === 'string' ? input : (input && input.url) || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];
        var a0 = attr || readAttr();
        if (a0 && SIGNUP[u0] && init && typeof init.body === 'string' && String((init.method || 'GET')).toUpperCase() === 'POST') {
          var b0 = JSON.parse(init.body);
          if (b0 && typeof b0 === 'object' && !b0.attr) {
            b0.attr = a0;
            args = [input, Object.assign({}, init, { body: JSON.stringify(b0) })];
          }
        }
      } catch (_e) { /* never block a sign-up because of attribution */ }
      var p = realFetch.apply(this, args);
      try {
        var url = String(typeof input === 'string' ? input : (input && input.url) || '');
        var path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
        var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (method === 'POST' && SIGNUP[path]) {
          p.then(function (r) {
            if (!(r && r.ok)) return;
            send(SIGNUP[path]);
            // Google Analytics key event: this is what Google Ads imports as a conversion.
            try { if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { lead_type: SIGNUP[path] }); } catch (_e) { /* ignore */ }
          }, noop);
        } else if (method === 'GET' && path === '/api/library-list') {
          var q = (new URLSearchParams(url.split('?')[1] || '').get('q') || '').trim().toLowerCase();
          if (q.length >= 3 && !seenQueries[q]) {
            seenQueries[q] = 1;
            p.then(function (r) {
              if (r && r.ok) r.clone().json().then(function (d) { send('search', { h: (d && d.total || 0) > 0 }); }, noop);
            }, noop);
          }
        }
      } catch (_e) { /* ignore */ }
      return p;
    };
  }

  send('pageview');
})();
