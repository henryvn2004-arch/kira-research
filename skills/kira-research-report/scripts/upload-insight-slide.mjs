#!/usr/bin/env node
// Render an insight's cover slide (the report cover look: logo, title, excerpt, year, tagline, with the
// insight's own title) to an image and put it in the public `covers` bucket as
// insights/<slug>-slide-<locale>.jpg (800x450). The insight cards on the home page, the insights list
// and "continue reading" show it; api/_lib/cover.js (insightCoverUrls) derives the URL, so there is no DB column.
//
//   node skills/kira-research-report/scripts/upload-insight-slide.mjs --slug <slug> [--locale en|ja|ko|zh]
//   node skills/kira-research-report/scripts/upload-insight-slide.mjs --all [--dry-run]
//   add --out <dir> to write the images there and upload nothing
//
// --slug renders every published language of that insight (or just --locale). The art is the insight's
// cover_url (its own, or the linked report's); art with a white right edge is mirrored so the text side stays white.
// Title text shrinks until it fits. Prints one JSON line per image. Env: SUPABASE_URL, SUPABASE_SERVICE_KEY;
// optional PW_CHROMIUM_PATH (a specific chromium build, as in render-local.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { resolveCountry, VOCAB } from './lib/naming.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES = path.resolve(here, '..', 'templates');
const CSS = fs.readFileSync(path.join(TEMPLATES, 'master_styles.css'), 'utf8');
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(TEMPLATES, 'brand', 'logo.png')).toString('base64');

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const flag = k => process.argv.includes('--' + k);
const slugArg = arg('slug'), localeArg = arg('locale'), outDir = arg('out');
const all = flag('all'), dry = flag('dry-run');
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
const LOCALES = ['en', 'ja', 'ko', 'zh'];
if ((!all && !/^[a-z0-9][a-z0-9-]{1,150}$/.test(slugArg || '')) || (localeArg && !LOCALES.includes(localeArg))) {
  console.error('usage: upload-insight-slide.mjs --slug <slug> [--locale en|ja|ko|zh] [--out <dir>]\n       upload-insight-slide.mjs --all [--dry-run] [--out <dir>]');
  process.exit(2);
}
if (!URL_ || !KEY) { console.log(JSON.stringify({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })); process.exit(3); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const META = { en: 'Market intelligence', ja: '市場インテリジェンス', ko: '시장 인텔리전스', zh: '市场情报' };
const KIND = {
  'market-analysis': { en: 'Market analysis', ja: '市場分析', ko: '시장 분석', zh: '市场分析' },
  'data-explainer':  { en: 'Data explainer', ja: 'データ解説', ko: '데이터 해설', zh: '数据解读' },
  'field-note':      { en: 'Field note', ja: 'フィールドノート', ko: '현장 노트', zh: '实地笔记' },
  'methodology':     { en: 'Methodology', ja: '方法論', ko: '방법론', zh: '方法论' },
  _:                 { en: 'Insight', ja: 'インサイト', ko: '인사이트', zh: '洞察' },
};
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function sb(p) {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
}
async function put(slug, loc, buf) {
  const r = await fetch(`${URL_}/storage/v1/object/covers/insights/${slug}-slide-${loc}.jpg`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=86400' },
    body: buf,
  });
  if (!r.ok) throw new Error(`upload ${slug}-slide-${loc}: ${r.status} ${await r.text()}`);
}

// The art as a data URI (1100px wide), and whether to mirror it (white right edge = the L2 layout of the report covers).
async function loadArt(coverUrl) {
  const r = await fetch(coverUrl);
  if (!r.ok) throw new Error(`cover ${r.status}`);
  const src = sharp(Buffer.from(await r.arrayBuffer()));
  const px = await src.clone().resize(48, 48, { fit: 'fill' }).greyscale().raw().toBuffer();
  const band = (x0, x1) => { let t = 0; for (let y = 0; y < 48; y++) for (let x = x0; x < x1; x++) t += px[y * 48 + x]; return t / (48 * (x1 - x0)); };
  const bl = band(0, 12), br = band(36, 48);
  const jpg = await src.resize({ width: 1100, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return { uri: 'data:image/jpeg;base64,' + jpg.toString('base64'), flip: br > 232 && br - bl > 12 };
}

// "Vietnam coffee 2026: the headline" -> blue lead-in up to the colon, black rest (as a report cover accents its middle line).
function titleHtml(title) {
  const m = String(title).match(/^(.{4,60}?[:：])\s*(.+)$/);
  return m ? `<span style="color:var(--primary)">${esc(m[1])}</span> ${esc(m[2])}` : esc(title);
}
function coverHtml({ loc, kind, country, title, excerpt, year, art }) {
  const meta = esc(META[loc]) + (country ? ' &nbsp;|&nbsp; ' + esc(country) : '');
  return `<!DOCTYPE html><html lang="${loc}"><head><meta charset="UTF-8">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap">
<style>${CSS}
/* A report cover keeps each short title line whole (word-break: keep-all); an insight title is a sentence, so ja/zh wrap normally (numbers stay together). */
.cover2 .cv-title:lang(ja), .cover2 .cv-title:lang(zh) { word-break: normal !important; overflow-wrap: break-word !important; }</style></head><body>
<div class="page cover2 cv-L1">
  <img class="cv-art" src="${art.uri}" alt=""${art.flip ? ' style="transform:scaleX(-1)"' : ''}>
  <div class="cv-wrap">
    <div class="cv-top"><img class="cv-logo" src="${LOGO}" alt="KIRA Research"><div class="cv-meta">${meta}</div></div>
    <div class="cv-main">
      <div class="cv-eyebrow">${esc(kind)}</div>
      <h1 class="cv-title">${titleHtml(title)}</h1>
      ${excerpt ? `<p class="cv-sub" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:470px">${esc(excerpt)}</p>` : ''}
    </div>
    <div class="cv-bottom"><div class="cv-year-row"><div class="cv-year">${esc(year)}</div><div class="cv-tag">Know first.<br>Move first.</div></div></div>
  </div>
</div></body></html>`;
}

async function render(browser, html) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });
    try { await page.evaluate(() => document.fonts.ready); } catch (_) { /* render with what loaded */ }
    // Shrink the title until the text block clears the year row.
    const px = await page.evaluate(() => {
      const t = document.querySelector('.cv-title'), main = document.querySelector('.cv-main'), bottom = document.querySelector('.cv-bottom');
      for (const size of [74, 66, 58, 52, 46, 42, 38, 34, 30]) {
        t.style.fontSize = size + 'px';
        if (main.getBoundingClientRect().bottom <= bottom.getBoundingClientRect().top - 24) return size;
      }
      return 30;
    });
    const shot = await page.locator('.page').first().screenshot({ type: 'png' });
    return { px, jpg: await sharp(shot).resize(800, 450).jpeg({ quality: 80, mozjpeg: true }).toBuffer() };
  } finally { await page.close(); }
}

const launchOpts = { args: ['--font-render-hinting=none'] };
if (process.env.PW_CHROMIUM_PATH) launchOpts.executablePath = process.env.PW_CHROMIUM_PATH;
let browser;
try {
  const insights = await sb(`insights?status=eq.published${all ? '' : `&slug=eq.${slugArg}`}&select=id,slug,category,country,published_at,cover_url&limit=2000`);
  const ids = insights.map(i => i.id);
  const translations = ids.length
    ? await sb(`insight_translations?status=eq.published&insight_id=in.(${ids.join(',')})&select=insight_id,locale,title,excerpt&limit=5000`)
    : [];
  const jobs = [];
  for (const i of insights) {
    if (!i.cover_url) continue;
    for (const t of translations) {
      if (t.insight_id === i.id && LOCALES.includes(t.locale) && (!localeArg || t.locale === localeArg) && t.title) jobs.push({ i, t });
    }
  }
  if (!jobs.length) { console.log(JSON.stringify({ ok: false, error: 'nothing to render (no published insight with a cover and a translation)' })); process.exit(3); }

  browser = dry ? null : await chromium.launch(launchOpts);
  const arts = new Map();
  const artOf = i => { if (!arts.has(i.id)) arts.set(i.id, loadArt(i.cover_url)); return arts.get(i.id); };
  let ok = 0, next = 0; const failed = [];
  if (outDir) fs.mkdirSync(outDir, { recursive: true });
  await Promise.all(Array.from({ length: all ? 3 : 1 }, async () => {
    while (next < jobs.length) {
      const { i, t } = jobs[next++];
      try {
        if (dry) { console.log(JSON.stringify({ dry: true, slug: i.slug, locale: t.locale })); continue; }
        const cc = resolveCountry(String(i.country || '').replace(/-/g, ' '));
        const html = coverHtml({
          loc: t.locale, kind: (KIND[i.category] || KIND._)[t.locale],
          country: cc ? VOCAB.countries[cc][t.locale] : '', title: t.title, excerpt: t.excerpt,
          year: i.published_at ? new Date(i.published_at).getUTCFullYear() : new Date().getUTCFullYear(), art: await artOf(i),
        });
        const { px, jpg } = await render(browser, html);
        if (outDir) fs.writeFileSync(path.join(outDir, `${i.slug}-slide-${t.locale}.jpg`), jpg); else await put(i.slug, t.locale, jpg);
        ok++;
        console.log(JSON.stringify({ ok: true, slug: i.slug, locale: t.locale, bytes: jpg.length, titlePx: px, uploaded: !outDir }));
      } catch (e) {
        failed.push(`${i.slug}/${t.locale}`);
        console.log(JSON.stringify({ ok: false, slug: i.slug, locale: t.locale, error: String(e.message || e) }));
      }
    }
  }));
  console.log(JSON.stringify({ summary: true, jobs: jobs.length, ok, failed }));
  if (failed.length) process.exitCode = 3;
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exitCode = 3;
} finally {
  if (browser) await browser.close();
}
