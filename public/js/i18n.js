/* ============================================================
   KIRA RESEARCH — i18n.js
   Loads /locales/<locale>.json based on window.kira.locale (set by
   nav.js). Walks the DOM for [data-i18n] / [data-i18n-attr] /
   [data-i18n-html] elements and substitutes text.

   Locale strings use dotted paths (e.g. "footer.copyright") and are
   resolved against the loaded JSON. Missing keys are left as-is so
   the source-language text remains a sane fallback.
   ============================================================ */

(function () {
  // nav.js exposes window.kira.locale; default 'en' if it's missing
  // (i18n.js could load before nav.js if someone reorders scripts).
  const SUPPORTED = ['en', 'ja', 'ko'];
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const locale =
    (window.kira && window.kira.locale) ||
    (SUPPORTED.includes(pathParts[0]) ? pathParts[0] : 'en');

  // <html lang="..."> — keep in sync for screen readers + SEO.
  document.documentElement.setAttribute('lang', locale);

  // ── Dotted-path lookup ────────────────────────────────────
  function lookup(dict, dottedKey) {
    if (!dict || !dottedKey) return undefined;
    const parts = dottedKey.split('.');
    let cur = dict;
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in cur) {
        cur = cur[p];
      } else {
        return undefined;
      }
    }
    return typeof cur === 'string' ? cur : undefined;
  }

  // ── Apply translations ─────────────────────────────────────
  // Three modes:
  //   data-i18n="key"            → textContent
  //   data-i18n-html="key"       → innerHTML (use sparingly)
  //   data-i18n-attr="attr:key;attr:key"
  function applyTranslations(dict) {
    // textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = lookup(dict, key);
      if (val !== undefined) el.textContent = val;
    });

    // innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const val = lookup(dict, key);
      if (val !== undefined) el.innerHTML = val;
    });

    // attributes (e.g. placeholder, aria-label, alt, title)
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(';').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s && s.trim());
        if (!attr || !key) return;
        const val = lookup(dict, key);
        if (val !== undefined) el.setAttribute(attr, val);
      });
    });
  }

  // ── Fetch + cache ──────────────────────────────────────────
  // Cached on window so repeated kira:nav-ready events don't re-fetch.
  let dictPromise = null;
  function loadDict() {
    if (dictPromise) return dictPromise;
    dictPromise = fetch('/locales/' + locale + '.json', { cache: 'force-cache' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('locale ' + locale + ' missing'))))
      .catch(err => {
        // Fall back to English if requested locale is missing
        if (locale !== 'en') {
          console.warn('[i18n]', err.message, '— falling back to en');
          return fetch('/locales/en.json').then(r => (r.ok ? r.json() : {}));
        }
        console.warn('[i18n] could not load en locale:', err);
        return {};
      });
    return dictPromise;
  }

  function runOnce() {
    loadDict().then(applyTranslations);
  }

  // ── Initial apply ──────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runOnce);
  } else {
    runOnce();
  }

  // ── Re-apply after nav.js injects nav + footer ─────────────
  // nav.js dispatches this event once both DOM trees are in place.
  document.addEventListener('kira:nav-ready', runOnce);

  // Expose for debugging / manual re-runs after dynamic content insert.
  window.kira = window.kira || {};
  window.kira.i18n = {
    locale,
    apply: runOnce,
    lookup: key => loadDict().then(d => lookup(d, key))
  };
})();
