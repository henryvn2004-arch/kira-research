/* ============================================================
   KIRA RESEARCH — nav.js
   Injects shared nav + footer into every page.
   Detects current locale and page, marks active links, builds
   locale-aware hrefs. Designed to work standalone, but plays well
   with i18n.js (which swaps text via data-i18n).
   ============================================================ */

(function () {
  // ── Locale detection ───────────────────────────────────────
  // Pathname format: /<locale>/<page>...
  // Falls back to 'en' if no locale segment.
  const SUPPORTED_LOCALES = ['en', 'ja', 'ko'];
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const locale = SUPPORTED_LOCALES.includes(pathParts[0]) ? pathParts[0] : 'en';

  // Remaining path after the locale (e.g. ['library'] or ['reports', 'foo'])
  const subPath = SUPPORTED_LOCALES.includes(pathParts[0])
    ? pathParts.slice(1)
    : pathParts;

  // ── Page detection (for active highlight) ──────────────────
  // Top-level page key: first segment after locale, or 'home' for /<locale>/
  const pageKey = subPath[0] || 'home';

  // ── Helpers ────────────────────────────────────────────────
  // Build a path for the given locale, preserving current subpath.
  function localeHref(targetLocale) {
    return '/' + targetLocale + '/' + subPath.join('/');
  }

  // Build a path within the current locale.
  function localPath(p) {
    return '/' + locale + (p.startsWith('/') ? p : '/' + p);
  }

  // ── Locale switcher links ──────────────────────────────────
  const localeLinks = SUPPORTED_LOCALES.map(loc => {
    const labels = { en: 'EN', ja: '日本語', ko: '한국어' };
    const cls = 'lang-' + loc + (loc === locale ? ' active' : '');
    return `<a href="${localeHref(loc)}" class="${cls}" data-locale="${loc}">${labels[loc]}</a>`;
  }).join('');

  // ── Nav HTML ───────────────────────────────────────────────
  // active class is added to the link matching pageKey.
  function activeIf(key) { return key === pageKey ? ' active' : ''; }

  // KIRA wordmark + blue accent — inline SVG so brand glyphs render
  // identically regardless of available webfonts. Letters use
  // `fill="currentColor"` so the CSS color on .logo-mark controls them
  // (white in nav, inherited elsewhere). Accent is the brand blue
  // (#1E6FFF) hardcoded. ViewBox 0 0 130 32 → aspect ~4.06:1.
  const LOGO_MARK_SVG = '<svg viewBox="0 0 130 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path fill="currentColor" d="M0 0 H6 V13 L18 0 H26 L12 16 L26 32 H18 L6 19 V32 H0 Z"/><path fill="currentColor" d="M30 0 H36 V32 H30 Z"/><path fill="currentColor" fill-rule="evenodd" d="M40 0 H58 L64 6 V12 L58 18 H50 L64 32 H56 L46 21 V32 H40 Z M46 6 V13 H56 L58 11 V9 L56 6 Z"/><path fill="currentColor" fill-rule="evenodd" d="M74 32 L84 0 H94 L104 32 H98 L96 24 H82 L80 32 Z M85 8 L83 18 H95 L93 8 Z"/><path fill="#1E6FFF" d="M107 22 H123 L119 30 H103 Z"/></svg>';

  const NAV_HTML = `
<div class="nav-wrap">
  <div class="container">
    <nav class="nav">
      <a class="logo" href="${localPath('/')}" aria-label="KIRA RESEARCH home">
        <span class="logo-mark">${LOGO_MARK_SVG}</span>
        <span class="logo-sub">Research</span>
      </a>
      <div class="nav-right">
        <div class="locale-switcher" aria-label="Language">
          ${localeLinks}
        </div>
        <div class="nav-links" id="kira-nav-links">
          <a href="${localPath('/library')}"          class="${('library'        + activeIf('library')).trim()}"        data-i18n="nav.library">Library</a>
          <a href="${localPath('/insights')}"         class="${('insights'       + activeIf('insights')).trim()}"       data-i18n="nav.insights">Insights</a>
          <a href="${localPath('/about')}"            class="${('about'          + activeIf('about')).trim()}"          data-i18n="nav.about">About</a>
          <a href="${localPath('/methodology')}"      class="${('methodology'    + activeIf('methodology')).trim()}"    data-i18n="nav.methodology">Methodology</a>
          <a href="${localPath('/pricing')}"          class="${('pricing'        + activeIf('pricing')).trim()}"        data-i18n="nav.pricing">Pricing</a>
          <a href="${localPath('/custom-research/')}" class="${('nav-dropdown'   + activeIf('custom-research')).trim()}" data-i18n="nav.customResearch">Custom Research</a>
          <a href="${localPath('/library')}" class="nav-cta" data-i18n="nav.browseCta">Browse Library →</a>
        </div>
        <button class="nav-burger" id="kira-nav-burger" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  </div>
</div>

<div class="mobile-nav" id="kira-mobile-nav">
  <div class="mobile-nav-inner">
    <div class="mobile-locales">
      ${SUPPORTED_LOCALES.map(loc => {
        const labels = { en: 'EN', ja: '日本語', ko: '한국어' };
        const cls = 'lang-' + loc + (loc === locale ? ' active' : '');
        return `<a href="${localeHref(loc)}" class="${cls}">${labels[loc]}</a>`;
      }).join('')}
    </div>
    <a href="${localPath('/library')}"          data-i18n="nav.library">Library</a>
    <a href="${localPath('/insights')}"         data-i18n="nav.insights">Insights</a>
    <a href="${localPath('/about')}"            data-i18n="nav.about">About</a>
    <a href="${localPath('/methodology')}"      data-i18n="nav.methodology">Methodology</a>
    <a href="${localPath('/pricing')}"          data-i18n="nav.pricing">Pricing</a>
    <a href="${localPath('/custom-research/')}" data-i18n="nav.customResearch">Custom Research</a>
  </div>
</div>`;

  // ── Footer HTML ────────────────────────────────────────────
  const FOOTER_HTML = `
<footer class="kira-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <a class="logo" href="${localPath('/')}">
          <span class="logo-mark">${LOGO_MARK_SVG}</span>
          <span class="logo-sub">Research</span>
        </a>
        <p class="footer-tag" data-i18n="footer.tagline">Southeast Asia's specialized market research firm. Senior analysts, modern delivery.</p>
      </div>
      <div class="footer-col">
        <h5 data-i18n="footer.libraryCol">Library</h5>
        <a href="${localPath('/library')}"                       data-i18n="footer.browseAll">Browse All</a>
        <a href="${localPath('/library?filter=country')}"        data-i18n="footer.byCountry">By Country</a>
        <a href="${localPath('/library?filter=industry')}"       data-i18n="footer.byIndustry">By Industry</a>
        <a href="${localPath('/library?sort=recent')}"           data-i18n="footer.latest">Latest</a>
      </div>
      <div class="footer-col">
        <h5 data-i18n="footer.firmCol">Firm</h5>
        <a href="${localPath('/about')}"            data-i18n="footer.about">About</a>
        <a href="${localPath('/methodology')}"      data-i18n="footer.methodology">Methodology</a>
        <a href="${localPath('/custom-research/')}" data-i18n="footer.customResearch">Custom Research</a>
        <a href="${localPath('/contact')}"          data-i18n="footer.contact">Contact</a>
      </div>
      <div class="footer-col">
        <h5 data-i18n="footer.resourcesCol">Resources</h5>
        <a href="${localPath('/insights')}" data-i18n="footer.insights">Insights</a>
        <a href="${localPath('/pricing')}"  data-i18n="footer.pricing">Pricing</a>
        <a href="${localPath('/terms')}"    data-i18n="footer.terms">Terms</a>
        <a href="${localPath('/privacy')}"  data-i18n="footer.privacy">Privacy</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span data-i18n="footer.copyright">© 2026 KIRA RESEARCH</span>
      <span data-i18n="footer.cities">HO CHI MINH CITY · SINGAPORE</span>
    </div>
  </div>
</footer>`;

  // ── Organization JSON-LD ───────────────────────────────────
  // Single global entity block, identifies the publisher to crawlers across
  // every page. Idempotent: skipped if a #ld-organization tag already exists
  // (e.g. dynamic templates may inject their own richer entity).
  function injectOrganizationJsonLd() {
    if (document.getElementById('ld-organization')) return;
    const origin = window.location.origin;
    const payload = {
      '@context': 'https://schema.org',
      '@type':    'Organization',
      name:       'KIRA RESEARCH',
      alternateName: 'KIRA Research',
      url:        origin + '/',
      logo:       origin + '/logo.png',
      description: 'Southeast Asia market intelligence firm. Senior analysts, modern delivery.',
      foundingLocation: {
        '@type': 'Place',
        address: { '@type': 'PostalAddress', addressLocality: 'Ho Chi Minh City', addressCountry: 'VN' }
      },
      sameAs: []
    };
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id   = 'ld-organization';
    el.textContent = JSON.stringify(payload);
    document.head.appendChild(el);
  }

  // ── Canonical injection ────────────────────────────────────
  // Tell crawlers which URL is the "real" address of this page. Pins
  // ranking signals to the prod domain even when the page is served
  // from a Vercel preview URL or hit with tracking params (?utm_*).
  //
  // Skips if a canonical link already exists on the page (e.g. a future
  // SSR build, or admin pages that explicitly set their own).
  function injectCanonical() {
    if (document.querySelector('link[rel="canonical"]')) return;

    const PROD_ORIGIN = 'https://kiraresearch.com';
    // Strip query + hash; keep the locale-aware pathname exactly as is
    // so trailing-slash + cleanUrls quirks aren't re-normalized.
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = PROD_ORIGIN + window.location.pathname;
    link.setAttribute('data-kira-canonical', '1');
    document.head.appendChild(link);
  }

  // ── hreflang injection ─────────────────────────────────────
  // Add <link rel="alternate" hreflang="..."> tags into <head> for each
  // supported locale + an x-default pointer. Lets Google's crawler discover
  // sibling-locale URLs even before the per-page sitemap-based hreflang
  // (in api/sitemap.js) is crawled. Belt-and-suspenders SEO.
  //
  // Idempotent: skips if a kira-hreflang link is already present (e.g.
  // from a server-side render in the future).
  function injectHreflang() {
    if (document.querySelector('link[data-kira-hreflang]')) return;
    const origin = window.location.origin;
    const sub    = subPath.join('/');                // preserves trailing-slash-less form
    const hasTrailingSlash = window.location.pathname.endsWith('/');
    const suffix = hasTrailingSlash && sub ? '/' : '';

    SUPPORTED_LOCALES.forEach(loc => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = loc;
      link.href = `${origin}/${loc}/${sub}${suffix}`;
      link.setAttribute('data-kira-hreflang', '1');
      document.head.appendChild(link);
    });

    // x-default → EN. Convention for "no locale match" buckets (anonymous,
    // unknown Accept-Language, search engines without a regional bias).
    const xd = document.createElement('link');
    xd.rel = 'alternate';
    xd.hreflang = 'x-default';
    xd.href = `${origin}/en/${sub}${suffix}`;
    xd.setAttribute('data-kira-hreflang', '1');
    document.head.appendChild(xd);
  }

  // ── Inject ─────────────────────────────────────────────────
  function inject() {
    // canonical + hreflang first so they're in <head> before <body> work begins.
    injectCanonical();
    injectHreflang();
    injectOrganizationJsonLd();

    // Atmosphere div (decorative background) goes first if not already present.
    if (!document.querySelector('.atmosphere')) {
      const atmo = document.createElement('div');
      atmo.className = 'atmosphere';
      document.body.insertBefore(atmo, document.body.firstChild);
    }

    // Insert nav at top of body (after .atmosphere).
    const navHost = document.createElement('div');
    navHost.innerHTML = NAV_HTML;
    // The string has TWO root nodes (nav-wrap + mobile-nav). Insert both.
    while (navHost.firstChild) {
      document.body.insertBefore(navHost.firstChild, document.body.children[1] || null);
    }

    // Insert footer at end of body, but before any trailing scripts.
    const footerHost = document.createElement('div');
    footerHost.innerHTML = FOOTER_HTML;
    document.body.appendChild(footerHost.firstElementChild);

    // Burger toggle
    const burger = document.getElementById('kira-nav-burger');
    const mnav = document.getElementById('kira-mobile-nav');
    if (burger && mnav) {
      burger.addEventListener('click', () => {
        mnav.classList.toggle('open');
        document.body.style.overflow = mnav.classList.contains('open') ? 'hidden' : '';
      });
      mnav.addEventListener('click', e => {
        if (e.target.tagName === 'A') {
          mnav.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
    }

    // Notify i18n.js (if loaded) that nav DOM is ready
    document.dispatchEvent(new CustomEvent('kira:nav-ready', { detail: { locale } }));
  }

  // Expose locale + helpers for other scripts
  window.kira = window.kira || {};
  window.kira.locale = locale;
  window.kira.localPath = localPath;
  window.kira.localeHref = localeHref;

  // ── Vercel Analytics + Speed Insights ─────────────────────
  // Owner must enable Analytics + Speed Insights in the Vercel dashboard
  // for these endpoints to exist. Until then the scripts 404 silently
  // (Vercel never serves them, the browser just logs a quiet network
  // error) — no functional impact on the page.
  //
  // We skip both on localhost so dev consoles aren't polluted with 404s
  // from `/_vercel/*` paths that only exist on Vercel's edge.
  // Also skip on /en/admin/* — admin traffic isn't meaningful product
  // data and these pages are robots-noindexed anyway.
  function injectVercelScripts() {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
    if (isLocal) return;
    const isAdmin = window.location.pathname.startsWith('/en/admin/');
    if (isAdmin) return;

    // Speed Insights skipped — paid product, owner opted out Year 1.
    const src = '/_vercel/insights/script.js';
    if (document.querySelector(`script[src="${src}"]`)) return;
    const s = document.createElement('script');
    s.defer = true;
    s.src = src;
    document.head.appendChild(s);
  }
  injectVercelScripts();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
