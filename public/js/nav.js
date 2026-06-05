/* ============================================================
   KIRA RESEARCH — nav.js
   Injects shared nav + footer into every page.
   Detects current locale and page, marks active links, builds
   locale-aware hrefs. Designed to work standalone, but plays well
   with i18n.js (which swaps text via data-i18n).
   ============================================================ */

(function () {
  // ── Subdomain detection (Phase O.11) ───────────────────────
  // The main site nav points at content paths like /en/insights that
  // ONLY exist on the main domain. When this same nav.js runs on the
  // studio.* subdomain, the relative paths resolve against the studio
  // host and 404 (Studio's vercel.json host-rewrite only serves /studio/*).
  //
  // Fix: detect host. On Studio, emit absolute URLs prefixed with
  // MAIN_ORIGIN so every nav/footer link lands on the right host.
  // Logo + Studio link itself stay subdomain-aware via separate code
  // paths.
  const MAIN_ORIGIN  = 'https://kiraresearch.com';
  const isStudioHost = /^studio\./i.test(window.location.hostname);
  const HOST_PREFIX  = isStudioHost ? MAIN_ORIGIN : '';

  // ── Locale detection ───────────────────────────────────────
  // Pathname format: /<locale>/<page>...
  // Falls back to 'en' if no locale segment.
  //
  // Studio is English-only and its paths (`/library`, `/jobs`, etc.)
  // don't have a locale segment — treat the locale as 'en' and force
  // an empty subPath so locale-switcher links route to the main-domain
  // locale ROOT, not to a non-existent /{locale}/jobs path.
  const SUPPORTED_LOCALES = ['en', 'ja', 'ko'];
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const locale = isStudioHost
    ? 'en'
    : (SUPPORTED_LOCALES.includes(pathParts[0]) ? pathParts[0] : 'en');

  // Remaining path after the locale (e.g. ['library'] or ['reports', 'foo'])
  const subPath = isStudioHost
    ? []
    : (SUPPORTED_LOCALES.includes(pathParts[0]) ? pathParts.slice(1) : pathParts);

  // ── Page detection (for active highlight) ──────────────────
  // Top-level page key: first segment after locale, or 'home' for /<locale>/.
  // On Studio host we have no main-site active state to highlight.
  const pageKey = isStudioHost ? null : (subPath[0] || 'home');

  // ── Helpers ────────────────────────────────────────────────
  // Build a path for the given locale, preserving current subpath.
  // On Studio: emits an absolute URL to the main domain.
  function localeHref(targetLocale) {
    return HOST_PREFIX + '/' + targetLocale + '/' + subPath.join('/');
  }

  // Build a path within the current locale.
  // On Studio: emits an absolute URL to the main domain.
  function localPath(p) {
    return HOST_PREFIX + '/' + locale + (p.startsWith('/') ? p : '/' + p);
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

  const NAV_HTML = `
<div class="nav-wrap">
  <div class="container">
    <nav class="nav">
      <a class="logo" href="${localPath('/')}" aria-label="KIRA RESEARCH home">
        <span class="logo-mark">KIR<span class="a-accent">A</span></span>
        <span class="logo-sub">Research</span>
      </a>
      <div class="nav-right">
        <div class="locale-switcher" aria-label="Language">
          ${localeLinks}
        </div>
        <div class="nav-links" id="kira-nav-links">
          <a href="${localPath('/library')}"          class="${('library'        + activeIf('library')).trim()}"        data-i18n="nav.library">Library</a>
          <a href="${localPath('/insights')}"         class="${('insights'       + activeIf('insights')).trim()}"       data-i18n="nav.insights">Insights</a>
          <a href="${localPath('/custom-research/')}" class="${('nav-dropdown'   + activeIf('custom-research')).trim()}" data-i18n="nav.customResearch">Custom Research</a>
          <a href="${localPath('/profile')}" class="${('kira-my-library'   + activeIf('profile')).trim()}" data-i18n="nav.myLibrary" style="display:none">My Library</a>
          <a href="https://studio.kiraresearch.com/" class="kira-studio" data-i18n="nav.studio" style="display:none">Studio</a>
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
    <a href="${localPath('/custom-research/')}" data-i18n="nav.customResearch">Custom Research</a>
    <a href="${localPath('/profile')}" class="kira-my-library" data-i18n="nav.myLibrary" style="display:none">My Library</a>
    <a href="https://studio.kiraresearch.com/" class="kira-studio" data-i18n="nav.studio" style="display:none">Studio</a>
  </div>
</div>`;

  // ── Footer HTML ────────────────────────────────────────────
  const FOOTER_HTML = `
<footer class="kira-footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-col">
        <a class="logo" href="${localPath('/')}">
          <span class="logo-mark">KIR<span class="a-accent">A</span></span>
          <span class="logo-sub">Research</span>
        </a>
        <p class="footer-tag" data-i18n="footer.tagline">Southeast Asia's specialized market research firm. Senior analysts, modern delivery.</p>
      </div>
      <div class="footer-col">
        <h3 data-i18n="footer.libraryCol">Library</h3>
        <a href="${localPath('/library')}"                       data-i18n="footer.browseAll">Browse All</a>
        <a href="${localPath('/library?filter=country')}"        data-i18n="footer.byCountry">By Country</a>
        <a href="${localPath('/library?filter=industry')}"       data-i18n="footer.byIndustry">By Industry</a>
        <a href="${localPath('/library?sort=recent')}"           data-i18n="footer.latest">Latest</a>
      </div>
      <div class="footer-col">
        <h3 data-i18n="footer.firmCol">Firm</h3>
        <a href="${localPath('/about')}"            data-i18n="footer.about">About</a>
        <a href="${localPath('/methodology')}"      data-i18n="footer.methodology">Methodology</a>
        <a href="${localPath('/custom-research/')}" data-i18n="footer.customResearch">Custom Research</a>
        <a href="${localPath('/contact')}"          data-i18n="footer.contact">Contact</a>
      </div>
      <div class="footer-col">
        <h3 data-i18n="footer.resourcesCol">Resources</h3>
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
  //
  // Skipped on Studio host — Studio pages are private (noindex) and Henry's
  // brief is that Studio is invisible infrastructure (no KIRA branding in
  // output), so we don't want to publish an Organization entity from there.
  function injectOrganizationJsonLd() {
    if (isStudioHost) return;
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
    // Studio host: skip — pages are private/noindex and the path
    // ('/library', '/jobs', etc.) doesn't exist on the main domain, so
    // a naive PROD_ORIGIN+pathname canonical would mislead crawlers.
    // The per-page `<meta name="robots" content="noindex,nofollow">` is
    // the right primary signal.
    if (isStudioHost) return;
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
    // Studio host: skip — Studio is English-only and pages are noindex.
    if (isStudioHost) return;
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

  // ── Favicon injection ──────────────────────────────────────
  // Many static HTML pages were never wired with the `<link rel="icon">`.
  // Inject from one place so every page (51+ across locales + admin + studio)
  // gets the same favicon stack. Idempotent — skip if any rel="icon" exists.
  function injectFavicon() {
    // Idempotent only across nav.js re-runs; pages that hardcoded the SVG
    // <link> in HTML still get the supplementary PNG/ICO/apple/manifest
    // links because we only short-circuit on our own data attribute.
    if (document.querySelector('link[data-kira-favicon]')) return;

    // Primary SVG favicon (modern browsers: Chrome/FF/Edge/Safari 14+).
    // Skip if a hardcoded SVG link is already in the HTML head (the 23 static
    // HTML files have `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`).
    if (!document.querySelector('link[rel="icon"][type="image/svg+xml"]')) {
      const svg = document.createElement('link');
      svg.rel  = 'icon';
      svg.type = 'image/svg+xml';
      svg.href = '/favicon.svg';
      svg.setAttribute('data-kira-favicon', '1');
      document.head.appendChild(svg);
    }

    // PNG variants — crawlers + browsers that prefer raster.
    [
      { size: '32x32', href: '/favicon-32.png' },
      { size: '16x16', href: '/favicon-16.png' },
    ].forEach(p => {
      const l = document.createElement('link');
      l.rel = 'icon';
      l.type = 'image/png';
      l.sizes = p.size;
      l.href = p.href;
      l.setAttribute('data-kira-favicon', '1');
      document.head.appendChild(l);
    });

    // ICO fallback for legacy crawlers + browsers that ignore SVG icons.
    const ico = document.createElement('link');
    ico.rel  = 'icon';
    ico.type = 'image/x-icon';
    ico.href = '/favicon.ico';
    ico.setAttribute('data-kira-favicon', '1');
    document.head.appendChild(ico);

    // Apple touch icon for iOS Safari "Add to Home Screen" + share-sheet.
    const apple = document.createElement('link');
    apple.rel  = 'apple-touch-icon';
    apple.sizes = '180x180';
    apple.href = '/apple-touch-icon.png';
    apple.setAttribute('data-kira-favicon', '1');
    document.head.appendChild(apple);

    // PWA manifest — enables "Add to Home Screen" with proper name/icons.
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.href = '/site.webmanifest';
      manifest.setAttribute('data-kira-favicon', '1');
      document.head.appendChild(manifest);
    }

    // Theme color matches the brand-dark background of the icon — affects
    // mobile browser chrome (Android Chrome address bar, etc.).
    if (!document.querySelector('meta[name="theme-color"]')) {
      const theme = document.createElement('meta');
      theme.name = 'theme-color';
      theme.content = '#0B0D10';
      theme.setAttribute('data-kira-theme-color', '1');
      document.head.appendChild(theme);
    }
  }

  // ── Inject ─────────────────────────────────────────────────
  function inject() {
    // canonical + hreflang first so they're in <head> before <body> work begins.
    injectFavicon();
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

    // Reveal auth-gated nav links if a Supabase session marker is present in
    // localStorage. Cheap heuristic — avoids loading the Supabase SDK on every
    // page just for the nav. If the token is stale, the /profile page itself
    // gates the user to sign in.
    if (isLikelyAuthenticated()) {
      // .kira-studio link is redundant on Studio host (you're already there) — skip.
      const selector = isStudioHost
        ? '.kira-my-library'
        : '.kira-my-library, .kira-studio';
      document.querySelectorAll(selector).forEach(el => { el.style.display = ''; });
    }

    // Notify i18n.js (if loaded) that nav DOM is ready
    document.dispatchEvent(new CustomEvent('kira:nav-ready', { detail: { locale } }));
  }

  function isLikelyAuthenticated() {
    // Phase N.14: auth.js now mirrors the Supabase session to a `.kiraresearch.com`
    // cookie so it's shared across the main domain and the studio subdomain.
    // Check cookies FIRST — when arriving on a sibling subdomain for the first
    // time, localStorage is empty on that origin but the cookie carries the
    // session.
    try {
      if (document.cookie && /(?:^|;\s*)kira-auth(?:\.\d+)?=/.test(document.cookie)) {
        return true;
      }
    } catch (_) { /* document.cookie unavailable → fall through */ }
    try {
      const direct = localStorage.getItem('kira-auth');
      if (direct && direct.length > 20) return true;
      // Fallback: the default Supabase storage key shape, in case the custom
      // `storageKey` is ever removed.
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-.+-auth-token$/.test(k)) {
          const v = localStorage.getItem(k);
          if (v && v.length > 20) return true;
        }
      }
    } catch (_) { /* localStorage blocked → assume signed out */ }
    return false;
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

  // ── Google Analytics 4 ────────────────────────────────────
  // Skip on localhost + admin pages (no point tracking internal traffic).
  // Idempotent via script id.
  function injectGA() {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
    if (isLocal) return;
    if (window.location.pathname.startsWith('/en/admin/')) return;
    if (document.getElementById('kira-ga')) return;
    const GA_ID = 'G-N1891GBDCB';
    const s = document.createElement('script');
    s.id = 'kira-ga';
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_ID);
  }
  injectGA();

  // ── instant.page prefetch ──────────────────────────────────
  // Prefetches pages on hover (~65ms before click), making navigation
  // feel instant. Skip on admin pages (not useful) and Studio host
  // (private, no public nav to prefetch). Idempotent via script id.
  function injectInstantPage() {
    if (isStudioHost) return;
    if (window.location.pathname.startsWith('/en/admin/')) return;
    if (document.getElementById('kira-instant-page')) return;
    const s = document.createElement('script');
    s.id = 'kira-instant-page';
    s.type = 'module';
    s.src = 'https://cdn.jsdelivr.net/npm/instant.page@5.2.0/instantpage.js';
    s.integrity = 'sha384-+oVCYEOCpcTbL4CsQ1hK+6Prt7+Kx2+ER1RSn5iQ0Ua0B1sBuGONp1jKt8dkcd5n';
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }
  injectInstantPage();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
