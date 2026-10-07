// ============================================================
// KIRA RESEARCH — /js/track.js
// First-party funnel events for /en/admin/funnel. Privacy by construction:
//   - no cookies, no IP, no email: only a random per-tab id (sessionStorage) + path + coarse source
//   - respects Do Not Track; does nothing on admin, studio, previews and localhost
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
  try { utm = (new URLSearchParams(loc.search).get('utm_source') || '').slice(0, 40); } catch (_e) { /* ignore */ }

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
  var SIGNUP = { '/api/topic-request': 'request_email', '/api/waitlist': 'waitlist', '/api/leads': 'lead' };
  var seenQueries = {};
  var realFetch = window.fetch;
  if (typeof realFetch === 'function') {
    window.fetch = function (input, init) {
      var p = realFetch.apply(this, arguments);
      try {
        var url = String(typeof input === 'string' ? input : (input && input.url) || '');
        var path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
        var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (method === 'POST' && SIGNUP[path]) {
          p.then(function (r) { if (r && r.ok) send(SIGNUP[path]); }, noop);
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
