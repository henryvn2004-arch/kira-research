#!/usr/bin/env node
// Recompute the curated free preview (api/_lib/preview-pages.js) for published reports from their FULL html
// and, with --apply, replace the preview file in the 'reports-html' bucket.
//
// Where the full html comes from, in this order (first hit wins):
//   1. --local-dir <dir>/<report-id>/<locale>.html   (e.g. a folder restored with archive-batch.mjs pull)
//   2. private bucket 'reports-html-full'  <report-id>/<locale>.html
//   3. the file already in 'reports-html', but only when it is still a whole report (not yet curated)
// A report whose full html cannot be found is listed as MISSING and left untouched (it keeps its current
// preview, which the server still limits through enforcePreview()).
//
// DEFAULT IS A DRY RUN: it only reads (GET) and prints, per report and locale, the pick:
//   slug  locale  total  free pages  types  [FALLBACK]
// Nothing is written unless --apply is given.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node backfill-curated-preview.mjs [--apply]
//        [--slug <slug>] [--locale en|ja|ko|zh] [--local-dir <dir>] [--out report.tsv]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { buildPreview } from '../../../api/_lib/preview-pages.js';
import { inlineAssets } from './lib/inline-assets.mjs';

const { values: o } = parseArgs({ options: {
  apply: { type: 'boolean', default: false }, slug: { type: 'string' }, locale: { type: 'string' },
  'local-dir': { type: 'string' }, out: { type: 'string' },
} });
const url = process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY;
if (!url || !key) { console.error('SUPABASE_URL + SUPABASE_SERVICE_KEY env vars required'); process.exit(2); }
const H = { apikey: key, Authorization: `Bearer ${key}` };

async function rest(p) {
  const r = await fetch(`${url}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${p}: ${r.status}`);
  return r.json();
}
async function object(bucket, p) {
  const r = await fetch(`${url}/storage/v1/object/${bucket}/${p}`, { headers: H });
  return r.ok ? Buffer.from(await r.arrayBuffer()).toString('utf8') : null;
}

const reports = await rest('living_reports?status=eq.published&select=id,slug&order=slug' + (o.slug ? `&slug=eq.${encodeURIComponent(o.slug)}` : ''));
const trans = await rest('report_translations?status=eq.published&select=report_id,locale&limit=2000');
const locales = new Map();
for (const t of trans) { if (!locales.has(t.report_id)) locales.set(t.report_id, []); locales.get(t.report_id).push(t.locale); }

const rows = [['slug', 'locale', 'source', 'total', 'free_pages', 'free_types', 'fallback']];
let done = 0, missing = 0, fell = 0;
for (const rep of reports) {
  for (const loc of (locales.get(rep.id) || ['en']).filter(l => !o.locale || l === o.locale)) {
    let html = null, source = '';
    if (o['local-dir']) {
      const f = path.join(o['local-dir'], rep.id, `${loc}.html`);
      if (fs.existsSync(f)) { html = inlineAssets(fs.readFileSync(f, 'utf8'), f); source = 'local'; }
    }
    if (!html) { html = await object('reports-html-full', `${rep.id}/${loc}.html`); source = 'full-bucket'; }
    if (!html) {
      const cur = await object('reports-html', `${rep.id}/${loc}.html`);
      if (cur && !/data-src-page="/.test(cur) && (cur.match(/class="page[\s"]/g) || []).length > 8) { html = cur; source = 'whole-in-preview-bucket'; }
    }
    if (!html) { rows.push([rep.slug, loc, 'MISSING', '', '', '', '']); missing++; continue; }
    const built = buildPreview(html);
    if (!built) { rows.push([rep.slug, loc, source, '', 'no pages', '', '']); missing++; continue; }
    const types = built.meta.pages.filter(p => built.pick.free.includes(p.i)).map(p => p.t).join('+');
    rows.push([rep.slug, loc, source, built.pick.total, built.pick.free.map(i => i + 1).join(','), types, built.pick.fallback ? 'FALLBACK' : '']);
    if (built.pick.fallback) fell++;
    if (o.apply) {
      const r = await fetch(`${url}/storage/v1/object/reports-html/${rep.id}/${loc}.html`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'text/html', 'x-upsert': 'true', 'cache-control': '3600' },
        body: Buffer.from(built.html, 'utf8'),
      });
      if (!r.ok) { console.error(`UPLOAD FAILED ${rep.slug}/${loc}: ${r.status} ${await r.text()}`); process.exitCode = 1; }
    }
    done++;
  }
}
const tsv = rows.map(r => r.join('\t')).join('\n');
if (o.out) fs.writeFileSync(o.out, tsv + '\n'); else console.log(tsv);
console.error(`${o.apply ? 'APPLIED' : 'DRY RUN'}: ${done} previews computed, ${fell} fell back to first 5 pages, ${missing} missing full html`);
