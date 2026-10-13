#!/usr/bin/env node
// Render a report's cover slide (page 1 of its HTML) to images and put them in
// the public `covers` bucket: reports/<slug>-slide-<locale>.jpg (800x450, list and
// home cards) and reports/<slug>-og-<locale>.jpg (1200x630, link previews, see
// api/report-og.js). api/_lib/cover.js derives both URLs from cover_url, so there
// is no DB column.
//
//   node skills/kira-research-report/scripts/upload-cover-slide.mjs \
//     --slug <slug> --locale en|ja|ko|zh --html <report.html> [--out <dir>]
//   node skills/kira-research-report/scripts/upload-cover-slide.mjs --backfill [--slug <slug>] [--dry-run]
//
// --out: write <slug>-slide-<locale>.jpg and <slug>-og-<locale>.jpg into that directory and upload nothing.
// --backfill: every published translation (of one slug, or of every report with a
// cover) is rendered from its preview HTML in the `reports-html` bucket.
// Prints one JSON line per image. Env: SUPABASE_URL, SUPABASE_SERVICE_KEY;
// optional PW_CHROMIUM_PATH (a specific chromium build, as in render-local.mjs).
import fs from 'node:fs';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { inlineAssets } from './lib/inline-assets.mjs';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const flag = k => process.argv.includes('--' + k);
const slugArg = arg('slug'), locale = arg('locale'), htmlPath = arg('html'), outPath = arg('out');
const backfill = flag('backfill'), dry = flag('dry-run');
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
const LOCALES = ['en', 'ja', 'ko', 'zh'];
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,150}$/;
if (backfill ? slugArg && !SLUG_RE.test(slugArg) : !SLUG_RE.test(slugArg || '') || !LOCALES.includes(locale) || !htmlPath) {
  console.error('usage: upload-cover-slide.mjs --slug <slug> --locale en|ja|ko|zh --html <report.html> [--out <dir>]\n       upload-cover-slide.mjs --backfill [--slug <slug>] [--dry-run]');
  process.exit(2);
}
if (!outPath && !dry && (!URL_ || !KEY)) { console.log(JSON.stringify({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })); process.exit(3); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function sb(path) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
}
async function put(slug, kind, loc, buf) {
  const r = await fetch(`${URL_}/storage/v1/object/covers/reports/${slug}-${kind}-${loc}.jpg`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=86400' },
    body: buf,
  });
  if (!r.ok) throw new Error(`upload ${slug}-${kind}-${loc}: ${r.status} ${await r.text()}`);
}

// First top-level .page, exactly its 1280x720 box (the body is padded and grey around it).
// slide: the whole page at 800x450. og: 1200x630 (cover crop, 22px off top and bottom, inside the page margins).
async function render(browser, html) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });
    try { await page.evaluate(() => document.fonts.ready); } catch (_) { /* render with what loaded */ }
    // Older templates only fix the page height at print time (PDF page = 1280x720); on screen a short cover is as tall as its content.
    const natural = await page.evaluate(() => Math.round(document.querySelector('.page').getBoundingClientRect().height));
    await page.addStyleTag({ content: '.page{width:1280px!important;height:720px!important}' });
    const shot = await page.locator('.page').first().screenshot({ type: 'png' });
    return {
      natural,
      slide: await sharp(shot).resize(800, 450).jpeg({ quality: 80, mozjpeg: true }).toBuffer(),
      og: await sharp(shot).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    };
  } finally { await page.close(); }
}
async function store(slug, loc, img) {
  if (outPath) {
    fs.mkdirSync(outPath, { recursive: true });
    for (const k of ['slide', 'og']) fs.writeFileSync(`${outPath}/${slug}-${k}-${loc}.jpg`, img[k]);
  } else {
    for (const k of ['slide', 'og']) await put(slug, k, loc, img[k]);
  }
}

const launchOpts = { args: ['--font-render-hinting=none'] };
if (process.env.PW_CHROMIUM_PATH) launchOpts.executablePath = process.env.PW_CHROMIUM_PATH;
let browser;
try {
  browser = await chromium.launch(launchOpts);
  if (!backfill) {
    const img = await render(browser, inlineAssets(fs.readFileSync(htmlPath, 'utf8'), htmlPath));
    await store(slugArg, locale, img);
    console.log(JSON.stringify({ ok: true, slug: slugArg, locale, bytes: { slide: img.slide.length, og: img.og.length }, uploaded: !outPath }));
  } else {
    const reports = await sb('living_reports?status=eq.published&cover_url=not.is.null&select=id,slug&limit=2000');
    const tr = await sb('report_translations?status=eq.published&select=report_id,locale&limit=5000');
    const jobs = [];
    for (const r of reports) {
      if (slugArg && r.slug !== slugArg) continue;
      for (const t of tr) if (t.report_id === r.id && LOCALES.includes(t.locale)) jobs.push({ id: r.id, slug: r.slug, locale: t.locale });
    }
    let ok = 0; const failed = []; let next = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        try {
          if (dry) { console.log(JSON.stringify({ dry: true, slug: j.slug, locale: j.locale })); continue; }
          const src = await fetch(`${URL_}/storage/v1/object/reports-html/${j.id}/${j.locale}.html`, { headers: H });
          if (!src.ok) throw new Error(`preview html ${src.status}`);
          const img = await render(browser, await src.text());
          await store(j.slug, j.locale, img);
          ok++;
          console.log(JSON.stringify({ ok: true, slug: j.slug, locale: j.locale, bytes: { slide: img.slide.length, og: img.og.length }, ...(img.natural !== 720 ? { naturalHeight: img.natural } : {}) }));
        } catch (e) {
          failed.push(`${j.slug}/${j.locale}`);
          console.log(JSON.stringify({ ok: false, slug: j.slug, locale: j.locale, error: String(e.message || e) }));
        }
      }
    }));
    console.log(JSON.stringify({ summary: true, jobs: jobs.length, ok, failed }));
    if (failed.length) process.exitCode = 3;
  }
} catch (e) {
  console.log(JSON.stringify({ ok: false, slug: slugArg, locale, error: String(e.message || e) }));
  process.exitCode = 3;
} finally {
  if (browser) await browser.close();
}
