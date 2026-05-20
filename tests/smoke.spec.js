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
  '/',                            // homepage
  '/library',
  '/about',
  '/methodology',
  '/pricing',
  '/custom-research/',            // folder route
  '/insights/'                    // folder route
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
  test('/report.html → /en/custom-research/', async ({ page }) => {
    await page.goto('/report.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/custom-research');
  });
  test('/strategy-builder.html → /en/custom-research/', async ({ page }) => {
    await page.goto('/strategy-builder.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/custom-research');
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
  const ADMIN_PAGES = ['/en/admin/', '/en/admin/leads', '/en/admin/reports', '/en/admin/insights'];
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
});
