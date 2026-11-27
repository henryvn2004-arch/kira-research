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
//   node backfill-curated-preview.mjs --pending N [--apply]
//        the N newest published reports whose preview in 'reports-html' is not curated yet (no data-src-page);
//        each folder is restored from the private archive (archive-batch.mjs pull, like make-insight.mjs), the
//        preview rebuilt for every uncurated locale and, with --apply, uploaded. One JSON line per report + a
//        summary line; any failure skips that report (never fatal). Prints `nothing pending` when all are done.
//        Never uploads whole HTML: an output that is unstamped or has more than 8 pages is refused.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { guardUpload, isCurated, selectPending } from './lib/preview-backfill.mjs';
import { splitPages as splitPagesText, text as pageText } from './lib/report-pages.mjs';
import { buildPreview } from '../../../api/_lib/preview-pages.js';
import { inlineAssets } from './lib/inline-assets.mjs';

const { values: o } = parseArgs({ options: {
  apply: { type: 'boolean', default: false }, slug: { type: 'string' }, locale: { type: 'string' },
  'local-dir': { type: 'string' }, out: { type: 'string' }, pending: { type: 'string' },
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

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const BATCH = path.join(ROOT, 'skills', 'kira-research-report', 'outputs', 'batch');
const LOCALES = ['en', 'ja', 'ko', 'zh'];

async function upload(id, loc, html) {
  const g = guardUpload(html);
  if (!g.ok) return { ok: false, reason: g.reason };
  const r = await fetch(`${url}/storage/v1/object/reports-html/${id}/${loc}.html`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'text/html', 'x-upsert': 'true', 'cache-control': '3600' }, body: Buffer.from(html, 'utf8'),
  });
  return r.ok ? { ok: true } : { ok: false, reason: `upload ${r.status}` };
}

async function pendingMode(limit) {
  const overrides = JSON.parse(fs.readFileSync(path.join(HERE, 'lib', 'report-folders.json'), 'utf8'));
  const reports = await rest('living_reports?status=eq.published&select=id,slug,created_at&order=created_at.desc&limit=1000');
  const trans = await rest('report_translations?status=eq.published&select=report_id,locale&limit=3000');
  const locales = new Map();
  for (const t of trans) { if (!locales.has(t.report_id)) locales.set(t.report_id, []); locales.get(t.report_id).push(t.locale); }
  // Which locale previews are curated already: read the files, newest report first, stop once `limit` pending reports are known.
  const curated = new Map(), previews = new Map();
  const picked = [];
  for (const rep of reports) {
    const have = new Set();
    for (const loc of locales.get(rep.id) || ['en']) {
      const cur = await object('reports-html', `${rep.id}/${loc}.html`);
      if (cur && isCurated(cur)) have.add(loc);
      if (cur) previews.set(`${rep.id}/${loc}`, cur);
    }
    curated.set(rep.id, have);
    if (selectPending([rep], locales, curated, 1).length && picked.push(rep) >= limit) break;
  }
  if (!picked.length) { console.log('nothing pending'); return; }

  let queueIndex;
  const folderFor = async rep => {
    if (overrides[rep.slug]) return overrides[rep.slug];
    if (!queueIndex) {
      queueIndex = new Map();
      for (const q of await rest('report_queue?select=id,output_paths&limit=2000')) {
        for (const p of String(q.output_paths || '').split('|')) { const m = p.match(/^reports-pdfs\/([0-9a-f-]{36})\//); if (m) queueIndex.set(m[1], q.id); }
      }
    }
    return queueIndex.get(rep.id) || null;
  };
  const tally = { reports: picked.length, done: 0, failed: 0, skipped: 0 };
  const flat = h => pageText(h || '').replace(/\s+/g, '');
  for (const rep of selectPending(picked, locales, curated, limit)) {
    const out = { report: rep.slug };
    try {
      const folder = await folderFor(rep);
      if (!folder) { console.log(JSON.stringify({ ...out, status: 'skipped', reason: 'no batch folder found (add to scripts/lib/report-folders.json)' })); tally.skipped++; continue; }
      const pull = spawnSync('node', [path.join(HERE, 'archive-batch.mjs'), 'pull', folder], { encoding: 'utf8' });
      if (pull.status !== 0 && pull.status !== 3) throw new Error(`archive pull: ${(pull.stderr || pull.stdout).trim().slice(0, 160)}`);
      const dir = path.join(BATCH, folder);
      if (!fs.existsSync(path.join(dir, 'en.html'))) throw new Error('en.html is neither local nor in the archive');
      // Right folder, right version: page 4 of the archived English file must equal page 4 of the old (uncurated) preview.
      const oldEn = previews.get(`${rep.id}/en`);
      if (oldEn && !isCurated(oldEn)) {
        const a = flat(splitPagesText(oldEn)[3]), b = flat(splitPagesText(fs.readFileSync(path.join(dir, 'en.html'), 'utf8'))[3]);
        if (!a || a !== b) throw new Error(`folder ${folder} is not the published version (page 4 differs)`);
      }
      const results = {};
      for (const loc of rep.todo.filter(l => LOCALES.includes(l))) {
        const f = path.join(dir, `${loc}.html`);
        if (!fs.existsSync(f)) { results[loc] = 'no full html'; continue; }
        const built = buildPreview(inlineAssets(fs.readFileSync(f, 'utf8'), f));
        if (!built) { results[loc] = 'no pages'; continue; }
        const g = guardUpload(built.html);
        if (!g.ok) { results[loc] = `refused: ${g.reason}`; continue; }
        if (o.apply) { const u = await upload(rep.id, loc, built.html); results[loc] = u.ok ? `uploaded ${g.pages}p` : `failed: ${u.reason}`; }
        else results[loc] = `dry-run ${g.pages}p${built.pick.fallback ? ' FALLBACK' : ''}`;
      }
      const bad = Object.values(results).some(v => /^(failed|refused|no )/.test(v));
      console.log(JSON.stringify({ ...out, folder, status: bad ? 'partial' : 'ok', locales: results }));
      bad ? tally.failed++ : tally.done++;
    } catch (e) { console.log(JSON.stringify({ ...out, status: 'failed', reason: String(e.message).slice(0, 200) })); tally.failed++; }
  }
  console.log(JSON.stringify({ summary: true, apply: o.apply, ...tally }));
}

if (o.pending !== undefined) { await pendingMode(Number(o.pending) || 5); process.exit(0); }

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
