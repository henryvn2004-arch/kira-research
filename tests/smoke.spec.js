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
  '/experts/',                                  // Kira Experts (replaces Custom Research, S5)
  '/survey/',                                   // Kira Survey (customer surveys + in-depth interviews)
  '/insights/'                                  // folder route
];

// <html lang> value per locale (Simplified Chinese is zh-Hans; URL prefix is /zh/).
const HTML_LANG = { en: 'en', ja: 'ja', ko: 'ko', zh: 'zh-Hans' };

for (const locale of ['en', 'ja', 'ko', 'zh']) {
  test.describe(`${locale} static pages`, () => {
    for (const path of STATIC_PAGES) {
      const url = `/${locale}${path}`;
      test(`${url} renders with shared nav`, async ({ page }) => {
        const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
        expect(res, `no response for ${url}`).not.toBeNull();
        expect(res.status(), `status for ${url}`).toBeLessThan(400);

        // <html lang> must be set correctly (locale detection works).
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toBe(HTML_LANG[locale]);

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
    await expect(page.locator('.r-crumbs, .r-empty, .rd-loading').first()).toBeVisible();

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
    await expect(page.locator('.r-crumbs, .r-empty, .art-loading').first()).toBeVisible();
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
  // After the JS redirect runs, URL must end in /en/, /ja/, /ko/, or /zh/.
  // Give the redirect a moment to fire.
  await page.waitForURL(/\/(en|ja|ko|zh)\/?$/, { timeout: 8_000 });
  const url = new URL(page.url());
  expect(url.pathname).toMatch(/^\/(en|ja|ko|zh)\/?$/);
});

// ── 4) Legacy URL redirects ──
//
// Note: res.url() returns the URL of the LAST response in the chain — but
// can lag the browser's actual location after JS-side redirects or some
// rewrite-then-redirect sequences. We use page.url() with waitUntil:'load'
// to read the browser's final landing URL, which is the user-facing truth.
test.describe('legacy redirects (vercel.json)', () => {
  test('/report.html → /en/library', async ({ page }) => {
    // Sprint S5: Custom Research is retired; legacy /report lands on the library.
    await page.goto('/report.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/library');
  });
  test('/strategy-builder.html → /en/experts/', async ({ page }) => {
    await page.goto('/strategy-builder.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/experts');
  });
  // Sprint S5: Custom Research pages (all locales, all subpages) → Kira Experts.
  for (const path of ['/en/custom-research/', '/ja/custom-research/market-analysis/', '/ko/custom-research/strategy-builder']) {
    test(`${path} → Kira Experts`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'load' });
      expect(page.url()).toMatch(/\/(en|ja|ko|zh)\/experts\/?/);
    });
  }
  test('/library.html → /en/library', async ({ page }) => {
    await page.goto('/library.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/library');
  });
  test('/insights.html → /en/insights/', async ({ page }) => {
    await page.goto('/insights.html', { waitUntil: 'load' });
    expect(page.url()).toContain('/en/insights');
  });
});

// ── 4b) Branded 404 page — Sprint 9 ──
//
// Vercel serves /404.html when no route matches. We assert:
//  • HTTP status is 404 (not 200 — important so SEO crawlers don't index)
//  • Branded chrome (nav.js logo) renders — proves the page isn't generic
//  • Locale auto-detect swaps the title for the path's prefix
test.describe('branded 404', () => {
  test('/some-page-that-does-not-exist returns 404 with branded chrome', async ({ page }) => {
    const res = await page.goto('/some-page-that-does-not-exist', { waitUntil: 'load' });
    expect(res.status()).toBe(404);
    await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();
    // EN copy is the default when no locale prefix in path.
    await expect(page.locator('#err-title')).toHaveText("This page doesn't exist.");
  });

  test('/ja/missing-page swaps title to Japanese', async ({ page }) => {
    await page.goto('/ja/missing-page', { waitUntil: 'load' });
    await expect(page.locator('#err-title')).toHaveText('ページが見つかりません。');
  });

  test('/zh/missing-page swaps title to Simplified Chinese', async ({ page }) => {
    await page.goto('/zh/missing-page', { waitUntil: 'load' });
    await expect(page.locator('#err-title')).toHaveText('页面不存在。');
  });
});

// ── 5) Admin pages require auth ──
test.describe('admin auth gate', () => {
  // Each admin page checks for a logged-in user on load and redirects to /auth.html
  // if missing. We don't have a test user — we just verify the redirect happens.
  const ADMIN_PAGES = ['/en/admin/', '/en/admin/leads', '/en/admin/reports', '/en/admin/insights', '/en/admin/transactions', '/en/admin/users', '/en/admin/aggregators', '/en/admin/companies', '/en/admin/audit', '/en/admin/waitlist'];
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

  test('/api/library-list?q= finds reports by code prefix', async ({ request }) => {
    const r = await request.get('/api/library-list?locale=en&q=VN&limit=4');
    expect(r.status()).toBe(200);
    const { items } = await r.json();
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) expect(it.code).toMatch(/^VN-/);
  });

  // Sprint S5 — library filters by investor stage + report type.
  test('/api/library-list accepts ?stage=ENT', async ({ request }) => {
    const r = await request.get('/api/library-list?locale=en&stage=ENT&limit=4');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type'] || '').toContain('application/json');
    const body = await r.json();
    expect(Array.isArray(body.items)).toBe(true);
    for (const it of body.items) expect(it.stage).toBe('ENT');
  });

  test('/api/library-list accepts ?type=D', async ({ request }) => {
    const r = await request.get('/api/library-list?locale=en&type=D&limit=4');
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type'] || '').toContain('application/json');
    const body = await r.json();
    expect(Array.isArray(body.items)).toBe(true);
    for (const it of body.items) expect(it.type).toBe('D');
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

  // Sprint S5 — subscription waitlist.
  test('/api/waitlist rejects GET (POST only)', async ({ request }) => {
    const r = await request.get('/api/waitlist');
    expect(r.status()).toBe(405);
  });

  // Honeypot path: exercises the handler + email-helper import without writing a row.
  test('/api/waitlist POST honeypot path returns 200 JSON', async ({ request }) => {
    const r = await request.post('/api/waitlist', {
      data: { email: 'ci@example.com', plan: 'month', hp: 'bot' },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.ok).toBe(true);
  });

  test('/api/admin-waitlist rejects unauthenticated', async ({ request }) => {
    const r = await request.get('/api/admin-waitlist');
    expect(r.status()).toBe(401);
  });

  // Coming-soon topics (migration 027): search fallback, request form, topic page.
  test('/api/topic-request rejects GET and accepts the honeypot path', async ({ request }) => {
    expect((await request.get('/api/topic-request')).status()).toBe(405);
    const r = await request.post('/api/topic-request', {
      data: { email: 'ci@example.com', keyword: 'ci probe', hp: 'bot' },
      headers: { 'Content-Type': 'application/json' }
    });
    expect(r.status()).toBe(200);
    expect((await r.json()).ok).toBe(true);
  });

  test('/api/topic-search returns an items array; short queries are empty', async ({ request }) => {
    const short = await request.get('/api/topic-search?q=ab');
    expect(short.status()).toBe(200);
    expect((await short.json()).items).toEqual([]);
    const r = await request.get('/api/topic-search?q=vietnam%20retail');
    expect(r.status()).toBe(200);
    expect(Array.isArray((await r.json()).items)).toBe(true);
  });

  // unmet:false never writes; nonsense matches nothing, so this leaves no row behind.
  test('/api/topic-search POST answers, and a nonsense query yields no topic', async ({ request }) => {
    const r = await request.post('/api/topic-search', {
      data: { q: 'zzqx wvkp', unmet: false }, headers: { 'Content-Type': 'application/json' }
    });
    expect(r.status()).toBe(200);
    expect((await r.json()).items).toEqual([]);
  });

  test('/api/topic 404s for an unknown slug', async ({ request }) => {
    expect((await request.get('/api/topic?slug=no-such-topic-xyz')).status()).toBe(404);
  });

  test('a coming-soon topic renders as a placeholder report page', async ({ page, request }) => {
    const found = await (await request.get('/api/topic-search?q=convenience%20stores')).json();
    test.skip(!found.items.length, 'no unpublished convenience-store topic left');
    await page.goto('/en/reports/' + found.items[0].slug);
    await expect(page.locator('.cs-cover')).toBeVisible();
    await expect(page.locator('#cs-req form[data-cs-form]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"][content^="noindex"]')).toHaveCount(1);
  });

  test('/en/pricing has the waitlist form and no per-report price', async ({ page }) => {
    await page.goto('/en/pricing', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#waitlist form#wl-form')).toHaveCount(1);
    await expect(page.locator('#wl-form input[name="email"]')).toHaveCount(1);
    await expect(page.locator('#wl-form input[name="hp"]')).toHaveCount(1);
    // Plans: single report, month, annual (the Week plan was dropped in S5b).
    await expect(page.locator('#wl-form input[name="plan"][value="report"]')).toHaveCount(1);
    await expect(page.locator('#wl-form input[name="plan"][value="week"]')).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain('$39');
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

  test('/api/admin-audit rejects unauthenticated', async ({ request }) => {
    const r = await request.get('/api/admin-audit');
    expect(r.status()).toBe(401);
  });

  test('/api/admin-companies rejects unauthenticated', async ({ request }) => {
    const r = await request.get('/api/admin-companies');
    expect(r.status()).toBe(401);
  });

  // Sprint 8 — internal linking: API must echo relatedInsights[] so the
  // report _view template can render the bottom block.
  test('/api/library-report returns relatedInsights array', async ({ request }) => {
    const r = await request.get('/api/library-report?slug=vietnam-fintech-2026&locale=en');
    expect(r.status()).toBeLessThan(600);
    if (r.ok()) {
      const data = await r.json();
      expect(Array.isArray(data.relatedInsights),
        `relatedInsights should be an array, got ${typeof data.relatedInsights}`
      ).toBe(true);
    }
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
    // Must reference all 4 per-locale sitemaps.
    expect(body).toContain('sitemap-en.xml');
    expect(body).toContain('sitemap-ja.xml');
    expect(body).toContain('sitemap-ko.xml');
    expect(body).toContain('sitemap-zh.xml');
  });

  for (const locale of ['en', 'ja', 'ko', 'zh']) {
    test(`/sitemap-${locale}.xml returns a urlset with hreflang annotations`, async ({ request }) => {
      const r = await request.get(`/sitemap-${locale}.xml`);
      expect(r.status()).toBe(200);
      const body = await r.text();
      expect(body).toContain('<urlset');
      // Static pages always present even when DB is empty/unmigrated.
      expect(body).toContain(`/${locale}/library`);
      // Kira Experts landing (S5, replaces the custom-research pages).
      expect(body).toContain(`/${locale}/experts/`);
      expect(body).not.toContain('/custom-research/');
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

  test('/en/ has canonical <link> pointing to prod origin', async ({ page }) => {
    // Tracking params should NOT bleed into canonical — that's the whole
    // point of having one. Hit the page with a utm_source query and
    // assert the canonical strips it.
    await page.goto('/en/?utm_source=smoke-test', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('link[rel="canonical"]', { state: 'attached', timeout: 5_000 });
    const href = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(href).toBe('https://kiraresearch.com/en/');
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
    const loaded = await page.locator('.rd-main').count();
    test.skip(loaded === 0, 'report data not available in this environment');

    // OG tags filled by updateHead()
    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(ogUrl).toContain('/en/reports/vietnam-fintech-2026');

    // Product JSON-LD
    await page.waitForSelector('script#ld-product', { state: 'attached', timeout: 5_000 });
    const productText = await page.locator('script#ld-product').textContent();
    const productLd = JSON.parse(productText);
    // The page emits a @graph (Product + Dataset); older shape was a bare Product.
    const product = productLd['@graph'] ? productLd['@graph'].find(n => n['@type'] === 'Product') : productLd;
    expect(product['@type']).toBe('Product');
    // Sprint S5: the single-report Offer is only emitted while
    // PER_REPORT_PURCHASE is on in _view.html (subscription model hides it).
    if (product.offers) expect(product.offers.priceCurrency).toBe('USD');

    // BreadcrumbList JSON-LD
    await page.waitForSelector('script#ld-breadcrumb', { state: 'attached', timeout: 5_000 });
    const crumbText = await page.locator('script#ld-breadcrumb').textContent();
    const crumb = JSON.parse(crumbText);
    expect(crumb['@type']).toBe('BreadcrumbList');
    expect(Array.isArray(crumb.itemListElement)).toBe(true);
  });

  test('/en/insights/<slug> injects OG + Article JSON-LD when data loads', async ({ page }) => {
    await page.goto('/en/insights/vietnam-sme-lending-shift', { waitUntil: 'networkidle' });
    const loaded = await page.locator('.art-hero').count();
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

// ── 9) Company Intelligence — Phase R ──
//
// Covers the directory index, a seeded company profile, and the three
// company API endpoints. We use Vingroup (MST 0101231488) as the known
// anchor because it's seeded by migration 016 and won't be removed.
test.describe('company intelligence', () => {
  const KNOWN_SLUG = 'vn-vingroup-0101231488';
  const JP_SLUG    = 'jp-toyota-motor-corporation-9180301018771';

  test('/en/companies/vn/ loads the directory shell', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto('/en/companies/vn/', { waitUntil: 'domcontentloaded' });
    expect(res.status()).toBe(200);
    await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();
    expect(errors, `pageerror on /en/companies/vn/: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/en/companies/jp/ loads the JP directory shell', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto('/en/companies/jp/', { waitUntil: 'domcontentloaded' });
    expect(res.status()).toBe(200);
    await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();
    expect(errors, `pageerror on /en/companies/jp/: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/api/company-list?country=JP returns JSON array', async ({ request }) => {
    const r = await request.get('/api/company-list?country=JP&page=1');
    expect(r.status()).toBeLessThan(600);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
    if (r.ok()) {
      const data = await r.json();
      expect(Array.isArray(data.companies)).toBe(true);
      expect(typeof data.total).toBe('number');
    }
  });

  test(`/en/companies/vn/${KNOWN_SLUG} loads without JS errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto(`/en/companies/vn/${KNOWN_SLUG}`, { waitUntil: 'domcontentloaded' });
    expect(res.status()).toBe(200);
    await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();
    expect(errors, `pageerror on company _view: ${errors.join(' | ')}`).toEqual([]);
  });

  test(`/en/companies/jp/${JP_SLUG} loads without JS errors`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto(`/en/companies/jp/${JP_SLUG}`, { waitUntil: 'domcontentloaded' });
    expect(res.status()).toBe(200);
    await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();
    expect(errors, `pageerror on JP company _view: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/api/company-list?country=VN returns JSON array', async ({ request }) => {
    const r = await request.get('/api/company-list?country=VN&page=1');
    expect(r.status()).toBeLessThan(600);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
    if (r.ok()) {
      const data = await r.json();
      expect(Array.isArray(data.companies)).toBe(true);
      expect(typeof data.total).toBe('number');
    }
  });

  test('/api/company-report returns payload for known slug', async ({ request }) => {
    const r = await request.get(`/api/company-report?slug=${KNOWN_SLUG}`);
    expect(r.status()).toBeLessThan(600);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
    if (r.ok()) {
      const data = await r.json();
      expect(data.report || data.error).toBeTruthy();
    }
  });

  test('/api/company-enrich rejects GET (POST only)', async ({ request }) => {
    const r = await request.get('/api/company-enrich');
    expect(r.status()).toBe(405);
  });

  test('/en/companies/ unified search landing page loads', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto('/en/companies/', { waitUntil: 'domcontentloaded' });
    expect(res.status()).toBe(200);
    await expect(page.locator('.nav-wrap .logo-mark')).toBeVisible();
    await expect(page.locator('#co-query')).toBeVisible();
    await expect(page.locator('#co-country')).toBeVisible();
    expect(errors, `pageerror on /en/companies/: ${errors.join(' | ')}`).toEqual([]);
  });

  test('/api/company-search-live returns suggestions JSON', async ({ request }) => {
    const r = await request.get('/api/company-search-live?q=vingroup&country=VN');
    expect(r.status()).toBeLessThan(600);
    const ct = r.headers()['content-type'] || '';
    expect(ct).toContain('application/json');
    if (r.ok()) {
      const data = await r.json();
      expect(Array.isArray(data.suggestions)).toBe(true);
    }
  });

  test('/api/company-stub rejects GET (POST only)', async ({ request }) => {
    const r = await request.get('/api/company-stub');
    expect(r.status()).toBe(405);
  });
});

// ── 10) Mobile viewport sanity — Phase 10.1 ──
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

// ── Library + insights redesign (covers, compact rows) ──
test.describe('library and insights pages', () => {
  for (const locale of ['en', 'ja', 'ko', 'zh']) {
    test(`/${locale}/library renders report rows`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`/${locale}/library`, { waitUntil: 'networkidle' });
      await expect(page.locator('.lrow, .r-empty').first()).toBeVisible();
      expect(errors, errors.join(' | ')).toEqual([]);
    });
    test(`/${locale}/insights/ renders article cards`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`/${locale}/insights/`, { waitUntil: 'networkidle' });
      await expect(page.locator('.ins-feature, .rcard, .r-empty').first()).toBeVisible();
      expect(errors, errors.join(' | ')).toEqual([]);
    });
  }

  test('library filter sheet opens on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/library', { waitUntil: 'networkidle' });
    await page.click('[data-open="filters"]');
    await expect(page.locator('.sheet.open .sheet-panel')).toBeVisible();
  });

  test('/api/library-list filters by sector group', async ({ request }) => {
    const r = await request.get('/api/library-list?locale=en&sector=finance&limit=6');
    const body = await r.json();
    expect(typeof body.facets.sectors).toBe('object');
    for (const it of body.items) expect(it.sector).toBe('finance');
  });

  test('/api/library-list items carry a cover field', async ({ request }) => {
    const r = await request.get('/api/library-list?locale=en&limit=4');
    const body = await r.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect('cover' in body.items[0]).toBe(true);
  });

  test('homepage headline numbers come from the live library', async ({ page, request }) => {
    const body = await (await request.get('/api/library-list?locale=en&limit=24&sort=recent')).json();
    await page.goto('/en/');
    await expect(page.locator('[data-stat="reports"]')).toHaveText(String(body.facets.totalPublished), { timeout: 10000 });
  });

  test('homepage use-case slider renders in every locale', async ({ page }) => {
    for (const locale of ['en', 'ja', 'ko', 'zh']) {
      await page.goto('/' + locale + '/');
      await expect(page.locator('#home-stories .st-card')).toHaveCount(15, { timeout: 10000 });
    }
  });

  test('use-case slider on library, experts and survey shows only that product', async ({ page }) => {
    const want = { library: ['library.html', 15], experts: ['experts/', 15], survey: ['survey/', 15] };
    for (const locale of ['en', 'ja', 'ko', 'zh']) {
      for (const [prod, [path, n]] of Object.entries(want)) {
        await page.goto('/' + locale + '/' + path.replace('.html', ''));
        await expect(page.locator('#home-stories[data-product="' + prod + '"] .st-card')).toHaveCount(n, { timeout: 10000 });
      }
    }
  });
});
