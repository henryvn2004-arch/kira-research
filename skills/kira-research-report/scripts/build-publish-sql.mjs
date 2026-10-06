#!/usr/bin/env node
// Build the publish SQL (batch_runner.md 5.3a) for one report from its files:
//   outputs/batch/<id>/naming.json + <locale>.html for each locale.
// Replaces the per-topic _build_<id>_sql.mjs scripts.
//
// Usage:
//   node skills/kira-research-report/scripts/build-publish-sql.mjs --id 2026-vn-coffee-chains \
//     [--langs "en ja ko zh"] [--chart-page 18] [--price 39] > /tmp/insert.sql
//
// - title    <- <title> of each locale's HTML
// - eyebrow  <- naming.eyebrow[locale]
// - preview  <- lede (hook page kicker + takeaway), 2 paragraphs (hook page cards),
//               optional chart from --chart-page (a 3-bar exhibit; omitted without it)
// - toc      <- chapter rows of the Contents pages
// - living_reports fields <- naming.json
// pdf_url is computed inside the SQL as <report_id>/<locale>.pdf.
// Prints SQL on stdout and a one-line summary on stderr. Exit 2 = missing input.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const id = arg('id');
if (!id) { console.error('usage: build-publish-sql.mjs --id <queue id> [--langs "en ja ko zh"] [--chart-page N]'); process.exit(2); }
const langs = (arg('langs', 'en ja ko zh')).split(/\s+/).filter(Boolean);
const price = Number(arg('price', 39));
const chartPage = arg('chart-page') ? Number(arg('chart-page')) : null;
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../outputs/batch', id);
const need = f => { const p = path.join(dir, f); if (!fs.existsSync(p)) { console.error('missing ' + p); process.exit(2); } return fs.readFileSync(p, 'utf8'); };

const naming = JSON.parse(need('naming.json'));
// &amp; goes last so that "&amp;lt;" decodes once, to "&lt;", not twice.
const decode = s => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&amp;/g, '&');
const text = h => decode(h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const noTags = s => s.replace(/\s*\[[^\]]*\]/g, '').replace(/\s+([,.;:。、，；：])/g, '$1').trim();
// Japanese and Chinese are set without spaces next to CJK characters or punctuation.
const cjkTight = s => s.replace(/([\u3000-\u9fff\uff00-\uffef])\s+/g, '$1').replace(/\s+([\u3000-\u9fff\uff00-\uffef])/g, '$1');
const q = s => '$kbat$' + s + '$kbat$';
const splitPages = h => h.split(/(?=<div class="page[" ])/).slice(1);

function extract(loc) {
  const html = need(loc + '.html');
  const pages = splitPages(html);
  const title = text((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
  if (!title) throw new Error(loc + ': empty <title>');

  // hook page = first exhibit page (executive summary p1)
  const hook = pages.find(p => /^<div class="page exhibit-page/.test(p));
  if (!hook) throw new Error(loc + ': no exhibit page for the hook');
  const kicker = text((hook.match(/<p class="page-kicker">([\s\S]*?)<\/p>/) || [])[1] || '');
  const take = text((hook.match(/<div class="takeaway">([\s\S]*?)<\/div>/) || [])[1] || '');
  const lede = noTags([kicker, take].filter(Boolean).join(' '));
  const cards = [...hook.matchAll(/<div style="font-size:\s*12\.5px[^"]*">([\s\S]*?)<\/div>/g)].map(m => noTags(text(m[1])));
  const paragraphs = (cards.length >= 3 ? cards.slice(1, 3) : cards.slice(0, 2)).filter(Boolean);

  // contents: chapter rows = number / bold title / page ref
  const toc = [];
  for (const p of pages.slice(0, 8)) {
    if (!/class="page-h1">[^<]*<\/h1>/.test(p) || toc.length && !/Contents|目次|목차|目录/.test((p.match(/class="page-h1">([^<]*)/) || [])[1] || '')) continue;
    for (const m of p.matchAll(/<div class="mono"[^>]*>(\d{2})<\/div>\s*<div style="font-family[^>]*>([\s\S]*?)<\/div>\s*<div class="mono"[^>]*>([^<]*)<\/div>/g))
      toc.push({ num: m[1], name: text(m[2]), pages: text(m[3]) });
  }
  if (!toc.length) throw new Error(loc + ': no contents rows found');
  const firstHook = toc.findIndex(r => parseInt(r.pages.replace(/\D/g, ''), 10) >= pages.indexOf(hook) + 1);
  toc.forEach((r, i) => { r.locked = firstHook >= 0 ? i > firstHook : true; });
  if (firstHook >= 0) for (let i = 0; i < firstHook; i++) toc[i].locked = false;

  let chart = null;
  if (chartPage) {
    const p = pages[chartPage - 1];
    if (!p) throw new Error(loc + ': no page ' + chartPage);
    const svg = (p.match(/<svg[\s\S]*?<\/svg>/) || [''])[0];
    const t = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => decode(m[1]).trim());
    // bar triples: value, label, share line
    const bars = [];
    for (let i = 0; i + 1 < t.length; i++) {
      const num = parseFloat(t[i].replace(/[^\d.]/g, ''));
      if (/^[\d.,]+\s*[kKmM]?$/.test(t[i]) && !isNaN(num) && t[i + 1] && !/^[\d.,]+\s*[kKmM]?$/.test(t[i + 1])) { bars.push({ value: t[i], label: t[i + 1], n: num }); i++; }
    }
    if (bars.length < 2) throw new Error(loc + ': could not read bars on page ' + chartPage);
    const max = Math.max(...bars.map(b => b.n));
    chart = {
      title: text((p.match(/<div class="exhibit-title">([\s\S]*?)<\/div>/) || [])[1] || ''),
      subtitle: text((p.match(/<div class="exhibit-sub">([\s\S]*?)<\/div>/) || [])[1] || ''),
      bars: bars.map(b => ({ pct: Math.round(100 * b.n / max), label: b.label, value: b.value })),
    };
  }
  const tight = /^(ja|zh)/.test(loc) ? cjkTight : x => x;
  return { title, eyebrow: naming.eyebrow[loc], preview: { lede: tight(lede), paragraphs: paragraphs.map(tight), ...(chart ? { chart } : {}) }, toc, pageCount: pages.length };
}

const loc = Object.fromEntries(langs.map(l => [l, extract(l)]));
const pageCount = loc.en ? loc.en.pageCount : Object.values(loc)[0].pageCount;
for (const l of langs) if (loc[l].pageCount !== pageCount) { console.error(`${l}: ${loc[l].pageCount} pages vs ${pageCount}`); process.exit(2); }

const kw = '[' + naming.keywords.map(q).join(',') + ']';
const tuples = langs.map(l => `(${q(l)}, ${q(loc[l].title)}, ${q(loc[l].eyebrow)}, ${q(JSON.stringify(loc[l].preview))}, ${q(JSON.stringify(loc[l].toc))})`).join(',\n  ');
console.log(`WITH new_report AS (
  INSERT INTO living_reports (slug, code, country, industry, industry_code, stage, report_type, segment, keywords, year, pages, price, currency, status, published_at)
  VALUES (${q(naming.slug)}, ${q(naming.code)}, ${q(naming.country)}, ${q(naming.industry)}, ${q(naming.industry_code)}, ${q(naming.stage)}, ${q(naming.type)}, ${q(naming.segment)}, ARRAY${kw}::text[], ${naming.year}, ${pageCount}, ${price}, 'USD', 'published', now())
  ON CONFLICT (slug) DO UPDATE SET
    updated_at = now(), published_at = now(), pages = EXCLUDED.pages, status = 'published',
    code = coalesce(living_reports.code, EXCLUDED.code), keywords = EXCLUDED.keywords
  RETURNING id
)
INSERT INTO report_translations (report_id, locale, title, eyebrow, preview, toc, pdf_url, status, published_at)
SELECT new_report.id, t.locale, t.title, t.eyebrow, t.preview::jsonb, t.toc::jsonb,
       new_report.id::text || '/' || t.locale || '.pdf', 'published', now()
FROM new_report
CROSS JOIN (VALUES
  ${tuples}
) AS t(locale, title, eyebrow, preview, toc)
ON CONFLICT (report_id, locale) DO UPDATE SET
  title = EXCLUDED.title, eyebrow = EXCLUDED.eyebrow, preview = EXCLUDED.preview, toc = EXCLUDED.toc,
  pdf_url = EXCLUDED.pdf_url, status = 'published', published_at = now()
RETURNING report_id, locale, title;`);
console.error(`build-publish-sql: ${naming.slug} (${naming.code}) ${pageCount} pages, locales ${langs.join(',')}, toc ${loc[langs[0]].toc.length} rows${chartPage ? ', chart from page ' + chartPage : ''}`);
