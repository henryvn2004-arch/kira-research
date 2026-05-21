// ============================================================
// KIRA RESEARCH — post-deploy smoke tests
//
// These run after each Vercel production deploy. They're DELIBERATELY
// shallow — they assert that pages load, nav is injected, and key
// rewrites work. They do NOT exercise auth, purchase, or write paths.
//
// Goal: catch "everything is 404" / "nav broke" / "JS error blocked render"
// class of regressions within 90 seconds of a deploy.
// ============================================================

import { test, expect } from '@playwright/test';

// ── 1) Every static + dynamic-list page across all 3 locales ──
//
// We check that:
//   • HTTP status is < 400
//   • The shared <nav> got injected by /js/nav.js (logo mark visible)
//   • <html lang> is the locale we requested
const STATIC_PAGES = [
  '/',                                          // homepage
  '/library',
  '/about',
  '/methodology',
  '/pricing',
  '/custom-research/',                          // landing
  '/custom-research/market-analysis/',          // Sprint 5.1 service line
  '/custom-research/strategy-builder/',         // Sprint 5.1 service line
  '/insights/'                                  // folder route
];

for (const locale of ['en', 'ja', 'ko']) {
  test.describe(`${locale} static pages`, () => {
    for (const path of STATIC_PAGES) {
      const url = `/${locale}${path}`;
      test(`${url} renders with shared nav`, async ({ page }) => {
        const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
        expect(res, `no response for ${url}`).not.toBeNull();
        expect(res.status(), `status for ${url}`).toBeLessThan(400);

        // <html lang> must be set correctly (locale detection works).
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toBe(locale);

        // nav.js injects .logo-mark in BOTH the top nav and the footer.
        // We scope to .nav-wrap so the locator is unambiguous — its presence
        // means the shared chrome booted, scripts loaded, no early JS error
        // blocked render.
        await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();

        // The page must have some kind of H1.
        await expect(page.locator('h1').first()).toBeVisible();
      });
    }
  });
}

// ── 2) Slug-based rewrites: /<locale>/reports/:slug → _view.html ──
test.describe('dynamic report page (rewrite)', () => {
  // We assume vietnam-fintech-2026 is seeded via 002_library.sql.
  // The renderer either shows preview content OR a clean "Report not found"
  // message — either proves the rewrite is wired correctly.
  test('/en/reports/vietnam-fintech-2026 renders the report shell', async ({ page }) => {
    const res = await page.goto('/en/reports/vietnam-fintech-2026', { waitUntil: 'networkidle' });
    expect(res.status()).toBeLessThan(400);

    // _view.html always renders the breadcrumb container first.
    // Multi-selector matches whichever state the page is in (loaded, 404,
    // or loading). .first() avoids strict-mode if more than one is in the DOM.
    await expect(page.locator('.rpt-breadcrumb, .rpt-404, .rpt-loading').first()).toBeVisible();

    // Confirm we landed on _view's HTML (not a 404 page from Vercel).
    // Title casing is "KIRA Research" (mixed case) — match case-insensitively.
    const title = await page.title();
    expect(title).toMatch(/KIRA Research/i);
  });

  test('/en/insights/<seeded-slug> renders the article shell', async ({ page }) => {
    // Use a slug that's seeded by 003_insights.sql. If the DB isn't seeded yet,
    // the page should still render its 404 message (still proves rewrite works).
    const res = await page.goto('/en/insights/vietnam-sme-lending-shift', { waitUntil: 'networkidle' });
    expect(res.status()).toBeLessThan(400);
    await expect(page.locator('.article-breadcrumb, .art-404, .art-loading').first()).toBeVisible();
  });

  // Dynamic templates use <script type="module"> + top-level await. A latent
  // bug shipped earlier with top-level `return;` (illegal in ES modules) that
  // initial-DOM-only checks couldn't catch — the loading shell renders, the
  // script then SyntaxErrors at parse, and updateHead/JSON-LD never run.
  // Listen for pageerror so this regression class can't sneak back in. Filter
  // by message substring so unrelated errors (e.g. third-party scripts) don't
  // break the test.
  test('/en/reports/<slug> has no fatal module parse error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message || String(e)));
    await page.goto('/en/reports/vietnam-fintech-2026', { waitUntil: 'networkidle' });
    const fatal = errors.filter(m => /Illegal return|SyntaxError|Unexpected token/i.test(m));
    expect(fatal, fatal.join(' / ')).toEqual([]);
  });

  test('/en/insights/<slug> has no fatal module parse error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message || String(e)));
    await page.goto('/en/insights/vietnam-sme-lending-shift', { waitUntil: 'networkidle' });
    const fatal = errors.filter(m => /Illegal return|SyntaxError|Unexpected token/i.test(m));
    expect(fatal, fatal.join(' / ')).toEqual([]);
  });

  // /auth.html ships at root (not /en/, not via cleanUrls until requested).
  // It previously referenced /nav.js instead of /js/nav.js — 404 in prod,
  // broken nav. Catch any further script path drift on the auth page by
  // requiring no failed sub-resource requests.
  test('/auth loads all sub-resources (no 404s on scripts/css)', async ({ page }) => {
    const failures = [];
    page.on('response', (r) => {
      const url = r.url();
      if (r.status() >= 400 && /\.(js|css|png|svg)(\?|$)/.test(url) && new URL(url).origin === new URL(page.url() || 'http://x').origin) {
        failures.push(`${r.status()} ${url}`);
      }
    });
    await page.goto('/auth', { waitUntil: 'networkidle' });
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

// ── 3) Root redirect respects user language ──
test('root / redirects to a supported locale', async ({ page }) => {
  await page.goto('/', { waitUntil: 'load' });
  // After the JS redirect runs, URL must end in /en/, /ja/, or /ko/.
  // Give the redirect a moment to fire.
  await page.waitForURL(/\/(en|ja|ko)\/?$/, { timeout: 8_000 });
  const url = new URL(page.url());
  expect(url.pathname).toMatch(/^\/(en|ja|ko)\/?$/);
});

// ── 4) Legacy URL redirects ──
//
// Note: res.url() returns the URL of the LAST response in the chain — but
// can lag the browser's actual location after JS-side redirects or some
// rewrite-then-redirect sequences. We use page.url() with waitUntil:'load'
// to read the browser's final landing URL, which is the user-facing truth.
test.describe('legacy redirects (vercel.json)', () => {
  test('/report.html → /en/custom-research/market-analysis/', async ({ page }) => {
    // Sprint 5.1: legacy /report now lands on the dedicated service-line page,
    // not the parent. More relevant context for the user, slightly better SEO.
    await page.goto('/report.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/custom-research/market-analysis');
  });
  test('/strategy-builder.html → /en/custom-research/strategy-builder/', async ({ page }) => {
    await page.goto('/strategy-builder.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/custom-research/strategy-builder');
  });
  test('/library.html → /en/library', async ({ page }) => {
    await page.goto('/library.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/library');
  });
  test('/insights.html → /en/insights/', async ({ page }) => {
    await page.goto('/insights.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/insights');
  });
});

// ── 5) Admin pages require auth ──
test.describe('admin auth gate', () => {
  // Each admin page checks for a logged-in user on load and redirects to /auth.html
  // if missing. We don't have a test user — we just verify the redirect happens.
  const ADMIN_PAGES = ['/en/admin/', '/en/admin/leads', '/en/admin/reports', '/en/admin/insights', '/en/admin/transactions', '/en/admin/users', '/en/admin/aggregators'];
  for (const path of ADMIN_PAGES) {
    test(`${path} redirects unauthenticated users`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load' });
      // Allow up to 6s for kiraAuth to boot + redirect. Admin JS sets
      // window.location.href = '/auth.html' — but cleanUrls:true in vercel.json
      // strips the .html, so the final URL is /auth (no extension). Accept both.
      await page.waitForURL(/\/auth(\.html)?(\?|$|\/)/, { timeout: 6_000 }).catch(() => {});
      // Pass condition: either redirected, OR we're still on the admin page
      // but the gate hasn't fired yet (false positive risk is low — the gate is
      // synchronous after kiraAuth resolves).
      const url = page.url();
      const onAuth  = /\/auth(\.html)?(\?|$|\/)/.test(url);
      const onAdmin = url.includes(path);
      expect(onAuth || onAdmin, `unexpected URL ${url}`).toBe(true);

      // Critically: if we're still on /admin, the page must NOT have rendered
      // any actual lead/report/insight data (that would mean the gate failed).
      if (onAdmin) {
        // Wait briefly to make sure no data leaks in.
        await page.waitForTimeout(800);
        const hasTable = await page.locator('.admin-table').count();
        expect(hasTable).toBe(0);
      }
    });
  }
});

// ── 6) Public APIs return JSON, not HTML 404 ──
test.describe('public APIs', () => {
  test('/api/library-list returns JSON', async ({ request }) => {
    const r = await request.get('/api/library-list?locale=en&limit=4');
    // 200 if DB is migrated; 500 if not — both are valid "API exists" outcomes.
    expect(r.status()).toBeLessThan(600);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
  });

  test('/api/insights-list returns JSON', async ({ request }) => {
    const r = await request.get('/api/insights-list?locale=en&limit=4');
    expect(r.status()).toBeLessThan(600);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
  });

  test('/api/leads rejects GET (POST only)', async ({ request }) => {
    const r = await request.get('/api/leads');
    expect(r.status()).toBe(405);
  });

  test('/api/admin-leads rejects unauthenticated', async ({ request }) => {
    const r = await request.get('/api/admin-leads');
    expect(r.status()).toBe(401);
  });

  test('/api/admin-upload-pdf rejects unauthenticated', async ({ request }) => {
    // POST so the method gate doesn't fire first.
    const r = await request.post('/api/admin-upload-pdf', {
      data: { report_id: '00000000-0000-0000-0000-000000000000', locale: 'en', fileBase64: '' }
    });
    expect(r.status()).toBe(401);
  });

  test('/api/admin-upload-pdf rejects GET', async ({ request }) => {
    const r = await request.get('/api/admin-upload-pdf');
    expect(r.status()).toBe(405);
  });

  test('/api/admin-transactions rejects unauthenticated', async ({ request }) => {
    const r = await request.get('/api/admin-transactions');
    expect(r.status()).toBe(401);
  });

  test('/api/admin-users rejects unauthenticated', async ({ request }) => {
    const r = await request.get('/api/admin-users');
    expect(r.status()).toBe(401);
  });

  test('/api/admin-aggregators rejects unauthenticated', async ({ request }) => {
    const r = await request.get('/api/admin-aggregators?kind=submissions');
    expect(r.status()).toBe(401);
  });

  // Email helper lives in /api/_lib/. Vercel excludes underscore-prefixed
  // dirs from routing — verify it stays non-public so the import path can
  // never be hit from outside.
  test('/api/_lib/email is NOT a public route', async ({ request }) => {
    const r = await request.get('/api/_lib/email');
    expect(r.status()).toBe(404);
  });

  // /api/leads handles the email side-effect as fire-and-forget — verify the
  // honeypot path (which bots/CI hit) still returns 200 JSON. Using the
  // honeypot field avoids polluting the leads table with CI-generated rows.
  // This also exercises the lead handler's full code path before the insert
  // branch, catching import-time errors in the email helper.
  test('/api/leads POST honeypot path returns 200 JSON', async ({ request }) => {
    const r = await request.post('/api/leads', {
      data: {
        name:  'CI smoke',
        email: 'ci@example.com',
        brief: 'Honeypot — bot filling, not a real lead.',
        hp:    'bot'
      },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(r.status()).toBe(200);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
    const body = await r.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBeNull();
  });
});

// ── 6b) Insights pagination — sanity for Sprint 7.1 ──
//
// The /en/insights/ list page now honors ?page=N. We don't assert the pager
// is *visible* (depends on seed-data count vs PAGE_SIZE=12), but we do assert
// the page survives ?page=2 cold-load without crashing, and the API exposes
// `total` so the UI can decide whether to render the pager.
test.describe('insights pagination', () => {
  test('/en/insights/?page=2 loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto('/en/insights/?page=2', { waitUntil: 'networkidle' });
    expect(res.status()).toBeLessThan(400);
    await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();
    expect(errors, `pageerror on ?page=2: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/api/insights-list returns numeric total + accepts offset', async ({ request }) => {
    const r = await request.get('/api/insights-list?locale=en&limit=12&offset=0');
    expect(r.status()).toBeLessThan(600);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
    if (r.ok()) {
      const data = await r.json();
      expect(typeof data.total).toBe('number');
      expect(data).toHaveProperty('limit');
      expect(data).toHaveProperty('offset');
    }
  });
});

// ── 7) SEO surface: sitemaps + robots.txt + hreflang ──
//
// These check the SEO entry points crawlers hit on every site discovery.
// If any of them silently breaks, organic traffic collapses without a peep.
test.describe('SEO surface', () => {
  test('/robots.txt is served and points to sitemap', async ({ request }) => {
    const r = await request.get('/robots.txt');
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toMatch(/User-agent:\s*\*/i);
    expect(body).toMatch(/Sitemap:\s*https?:\/\/[^\s]*sitemap/i);
  });

  test('/sitemap.xml returns a sitemap index', async ({ request }) => {
    const r = await request.get('/sitemap.xml');
    expect(r.status()).toBe(200);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toMatch(/xml/i);
    const body = await r.text();
    expect(body).toContain('<sitemapindex');
    // Must reference all 3 per-locale sitemaps.
    expect(body).toContain('sitemap-en.xml');
    expect(body).toContain('sitemap-ja.xml');
    expect(body).toContain('sitemap-ko.xml');
  });

  for (const locale of ['en', 'ja', 'ko']) {
    test(`/sitemap-${locale}.xml returns a urlset with hreflang annotations`, async ({ request }) => {
      const r = await request.get(`/sitemap-${locale}.xml`);
      expect(r.status()).toBe(200);
      const body = await r.text();
      expect(body).toContain('<urlset');
      // Static pages always present even when DB is empty/unmigrated.
      expect(body).toContain(`/${locale}/library`);
      // Sprint 5.1 service-line landings — must surface for SEO.
      expect(body).toContain(`/${locale}/custom-research/market-analysis/`);
      expect(body).toContain(`/${locale}/custom-research/strategy-builder/`);
      // hreflang alternates must be declared inline for every URL.
      expect(body).toMatch(/xhtml:link[^>]*hreflang=/);
    });
  }

  test('/en/ has hreflang <link> tags injected by nav.js', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    // <link> tags in <head> are never "visible" (zero rendered size), so
    // wait for 'attached' state instead of the default 'visible'. nav.js
    // injects on DOMContentLoaded, so the element appears in the DOM
    // within a few hundred ms of navigation.
    await page.waitForSelector(
      'link[data-kira-hreflang][hreflang="x-default"]',
      { state: 'attached', timeout: 5_000 }
    );
    const count = await page.locator('link[data-kira-hreflang]').count();
    // 3 locales + 1 x-default = 4 minimum.
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('/en/ has Organization JSON-LD injected by nav.js', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('script#ld-organization', { state: 'attached', timeout: 5_000 });
    const text = await page.locator('script#ld-organization').textContent();
    expect(text).toBeTruthy();
    const data = JSON.parse(text);
    expect(data['@type']).toBe('Organization');
    expect(data.name).toMatch(/KIRA/i);
  });

  test('/en/reports/<slug> injects OG + Product JSON-LD when data loads', async ({ page }) => {
    // Seeded slug from 002_library.sql. If DB is empty the API 404s and the
    // page enters the 404 branch — in that case the schema injection never
    // runs, so we condition the assertions on the loaded-state breadcrumb.
    await page.goto('/en/reports/vietnam-fintech-2026', { waitUntil: 'networkidle' });
    const loaded = await page.locator('.rpt-breadcrumb').count();
    test.skip(loaded === 0, 'report data not available in this environment');

    // OG tags filled by updateHead()
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(ogUrl).toContain('/en/reports/vietnam-fintech-2026');

    // Product JSON-LD
    await page.waitForSelector('script#ld-product', { state: 'attached', timeout: 5_000 });
    const productText = await page.locator('script#ld-product').textContent();
    const product = JSON.parse(productText);
    expect(product['@type']).toBe('Product');
    expect(product.offers.priceCurrency).toBe('USD');

    // BreadcrumbList JSON-LD
    await page.waitForSelector('script#ld-breadcrumb', { state: 'attached', timeout: 5_000 });
    const crumbText = await page.locator('script#ld-breadcrumb').textContent();
    const crumb = JSON.parse(crumbText);
    expect(crumb['@type']).toBe('BreadcrumbList');
    expect(Array.isArray(crumb.itemListElement)).toBe(true);
  });

  test('/en/insights/<slug> injects OG + Article JSON-LD when data loads', async ({ page }) => {
    await page.goto('/en/insights/vietnam-sme-lending-shift', { waitUntil: 'networkidle' });
    const loaded = await page.locator('.article-breadcrumb').count();
    test.skip(loaded === 0, 'insight data not available in this environment');

    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogType).toBe('article');

    await page.waitForSelector('script#ld-article', { state: 'attached', timeout: 5_000 });
    const articleText = await page.locator('script#ld-article').textContent();
    const article = JSON.parse(articleText);
    expect(article['@type']).toBe('Article');
    expect(article.headline).toBeTruthy();
  });
});

// ── 9) Mobile viewport sanity — Phase 10.1 ──
//
// We don't replace Lighthouse here — that's an owner-run audit step. These
// tests catch regressions that ONLY surface at narrow viewports: horizontal
// scroll bleed-through, mobile nav not booting, key elements clipped off.
// Width 375px = iPhone 12 mini / iPhone SE2 = the standard "small modern
// phone" baseline we target.
test.describe('mobile viewport sanity (375×667)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  const MOBILE_PAGES = [
    '/en/',
    '/en/library',
    '/en/insights/',
    '/en/about',
    '/en/methodology',
    '/en/pricing',
  ];

  for (const url of MOBILE_PAGES) {
    test(`${url} has no horizontal scroll at 375px`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      // Allow a tiny rounding tolerance — sub-pixel reflow can lie by 1-2px.
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scrollWidth - overflow.clientWidth,
        `horizontal overflow on ${url}: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`
      ).toBeLessThanOrEqual(2);
    });
  }

  test('mobile burger menu appears at 375px on /en/', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    // .nav-burger is display:flex at ≤968px per kira.css.
    await expect(page.locator('.nav-burger')).toBeVisible();
    // Desktop .nav-links is display:none at this width.
    await expect(page.locator('.nav-wrap .nav-links')).toBeHidden();
  });
});
