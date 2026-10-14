#!/usr/bin/env node
// Make the "executive summary" insight of a published report, in every language the report has, from the
// report's own pages (extract-insight-pages.mjs). No LLM and no translation: one report takes seconds.
//
//   node make-insight.mjs --pending [N]          the N (default 10) newest published reports that have no
//                                                 insight yet, or lack a language their report has
//   node make-insight.mjs --report <report-slug> one report
//   add --dry-run to change nothing (still builds and checks), --draft to save as hidden drafts,
//   --no-slides to skip the cover slides
//
// Per report: find its batch folder (scripts/lib/report-folders.json, then report_queue.output_paths, then a
// naming.json), restore the folder from the private archive (archive-batch.mjs pull), check it is the right
// report, extract the pages, then upsert `insights` + `insight_translations` (slug
// <industry>-<country>-exec-summary-<year>, category market-analysis, cover of the report) and render the cover
// slides (upload-insight-slide.mjs, not fatal). A language that fails a check is left out; an English failure
// leaves the report untouched. Prints one JSON line per report and a summary line.
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (+ KIRA_BRAIN_DIR for the archive, PW_CHROMIUM_PATH for the slides).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { splitPages, text } from './lib/report-pages.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..');
const BATCH = path.join(ROOT, 'skills', 'kira-research-report', 'outputs', 'batch');
const OVERRIDES = JSON.parse(fs.readFileSync(path.join(HERE, 'lib', 'report-folders.json'), 'utf8'));
const LOCALES = ['en', 'ja', 'ko', 'zh'];

const { values: opt } = parseArgs({
  options: {
    pending: { type: 'string' }, report: { type: 'string' }, 'dry-run': { type: 'boolean', default: false },
    draft: { type: 'boolean', default: false }, 'no-slides': { type: 'boolean', default: false },
  },
});
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if ((opt.pending === undefined) === (opt.report === undefined) || !URL_ || !KEY) {
  console.error('usage: make-insight.mjs --pending [N] | --report <report-slug>  [--dry-run] [--draft] [--no-slides]  (env SUPABASE_URL, SUPABASE_SERVICE_KEY)');
  process.exit(2);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(method, pathQuery, body, prefer) {
  const r = await fetch(`${URL_}/rest/v1/${pathQuery}`, { method, headers: prefer ? { ...H, Prefer: prefer } : H, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${pathQuery.split('?')[0]} -> ${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

const slugify = s => String(s).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// queue id by report uuid (report_queue.output_paths holds reports-pdfs/<report_id>/<locale>.pdf)
let queueIndex;
async function folderFor(report) {
  if (OVERRIDES[report.slug]) return OVERRIDES[report.slug];
  if (!queueIndex) {
    queueIndex = new Map();
    for (const q of await rest('GET', 'report_queue?select=id,output_paths&limit=2000')) {
      for (const p of String(q.output_paths || '').split('|')) {
        const m = p.match(/^reports-pdfs\/([0-9a-f-]{36})\//);
        if (m) queueIndex.set(m[1], q.id);
      }
    }
  }
  if (queueIndex.has(report.id)) return queueIndex.get(report.id);
  for (const d of fs.existsSync(BATCH) ? fs.readdirSync(BATCH) : []) {
    try { if (JSON.parse(fs.readFileSync(path.join(BATCH, d, 'naming.json'), 'utf8')).slug === report.slug) return d; } catch { /* no naming.json */ }
  }
  return null;
}

async function makeOne(slug) {
  const out = { report: slug };
  const [report] = await rest('GET', `living_reports?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=id,slug,country,industry,year,cover_url,cover_thumb_url`);
  if (!report) return { ...out, status: 'skipped', reason: 'report not published' };
  const folder = await folderFor(report);
  if (!folder) return { ...out, status: 'skipped', reason: 'no batch folder found for this report (add it to scripts/lib/report-folders.json)' };
  out.folder = folder;

  const pull = spawnSync('node', [path.join(HERE, 'archive-batch.mjs'), 'pull', folder], { encoding: 'utf8' });
  const dir = path.join(BATCH, folder);
  if (pull.status !== 0 && pull.status !== 3) return { ...out, status: 'failed', reason: `archive pull: ${(pull.stderr || pull.stdout).trim().slice(0, 160)}` };
  if (!fs.existsSync(path.join(dir, 'en.html'))) return { ...out, status: 'failed', reason: 'en.html is neither local nor in the archive' };

  // Right folder, right version? Page 4 of the folder's English file must read exactly like page 4 of the
  // preview that is published (the private reports-html bucket).
  const pr = await fetch(`${URL_}/storage/v1/object/reports-html/${report.id}/en.html`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!pr.ok) return { ...out, status: 'failed', reason: `no published preview to compare against (${pr.status})` };
  const flat = h => text(h || '').replace(/\s+/g, '');
  const published = flat(splitPages(await pr.text())[3]);
  if (!published || published !== flat(splitPages(fs.readFileSync(path.join(dir, 'en.html'), 'utf8'))[3])) {
    return { ...out, status: 'failed', reason: `folder ${folder} is not the published version of this report (page 4 differs from the published preview)` };
  }

  const have = (await rest('GET', `report_translations?report_id=eq.${report.id}&status=eq.published&select=locale`)).map(r => r.locale);
  const files = LOCALES.filter(l => have.includes(l) && fs.existsSync(path.join(dir, `${l}.html`)));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'make-insight-'));
  try {
    const args = [path.join(HERE, 'extract-insight-pages.mjs'), '--pages', 'auto', '--out', tmp, ...files.flatMap(l => [`--${l}`, path.join(dir, `${l}.html`)])];
    const ex = spawnSync('node', args, { encoding: 'utf8' });
    if (ex.status === 4 || ex.status === 2) return { ...out, status: 'skipped', reason: `extract: ${(ex.stderr || ex.stdout).trim().split('\n').pop().slice(0, 140)}` };
    const made = JSON.parse(fs.readFileSync(path.join(tmp, 'insight.json'), 'utf8'));
    out.pages = made.pages; out.layout = made.families.join('+'); out.locales = Object.keys(made.locales);
    out.skippedLocales = Object.entries(made.checks).filter(([l]) => !made.locales[l]).map(([l, c]) => `${l}: ${c.errors[0]}`);
    out.notes = Object.entries(made.checks).flatMap(([l, c]) => c.warnings.map(w => `${l} ${w}`)).slice(0, 4);
    if (!made.locales.en) return { ...out, status: 'skipped', reason: 'English failed a check' };

    const year = (slug.match(/-(\d{4})$/) || [])[1] || String(report.year);
    let insightSlug = `${slugify(report.industry)}-${slugify(report.country)}-exec-summary-${year}`;
    const [taken] = await rest('GET', `insights?slug=eq.${insightSlug}&select=related_report_slugs`);
    if (taken && !(taken.related_report_slugs || []).includes(report.slug)) insightSlug = `${report.slug}-exec-summary`;   // same industry, country and year as another report
    out.slug = insightSlug;
    if (opt['dry-run']) return { ...out, status: 'dry-run' };

    const status = opt.draft ? 'draft' : 'published';
    const now = new Date().toISOString();
    // An insight that exists is never rewritten as a whole (an owner's featured / retired / draft choice stays); only the
    // languages that are new or different are written, so a retry costs nothing and keeps the dates.
    let [row] = await rest('GET', `insights?slug=eq.${insightSlug}&select=id,status`);
    if (!row) {
      [row] = await rest('POST', 'insights?on_conflict=slug', [{
        slug: insightSlug, category: 'market-analysis', country: slugify(report.country), industry: slugify(report.industry),
        featured: false, related_report_slugs: [report.slug], status, published_at: status === 'published' ? now : null,
        cover_url: report.cover_url, cover_thumb_url: report.cover_thumb_url,
      }], 'resolution=merge-duplicates,return=representation');
    }
    const have = new Map((await rest('GET', `insight_translations?insight_id=eq.${row.id}&select=locale,status,body`)).map(t => [t.locale, t]));
    const changed = Object.entries(made.locales).filter(([locale, m]) => { const t = have.get(locale); return !t || t.status !== row.status || t.body !== m.body; });
    if (changed.length) {
      await rest('POST', 'insight_translations?on_conflict=insight_id,locale', changed.map(([locale, m]) => ({
        insight_id: row.id, locale, title: m.title, excerpt: m.excerpt, lede: m.lede, body: m.body, read_time: m.read_time,
        status: row.status, published_at: row.status === 'published' ? now : null,
      })), 'resolution=merge-duplicates,return=minimal');
    }
    out.changed = changed.map(([locale]) => locale);
    out.status = !changed.length ? 'unchanged' : row.status === 'published' ? 'published' : 'draft';

    if (!opt['no-slides'] && row.status === 'published' && changed.length) {
      const sl = spawnSync('node', [path.join(HERE, 'upload-insight-slide.mjs'), '--slug', insightSlug], { encoding: 'utf8', timeout: 240000 });
      out.slides = sl.status === 0 ? 'ok' : `failed (${(sl.stdout + sl.stderr).trim().split('\n').pop().slice(0, 100)})`;
    }
    return out;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

async function pendingSlugs(limit) {
  // Newest first: a report the script cannot do (unusual layout) stays pending for ever and must not use up the limit.
  const reports = await rest('GET', 'living_reports?status=eq.published&select=id,slug,created_at&order=created_at.desc&limit=1000');
  const translations = await rest('GET', 'report_translations?status=eq.published&select=report_id,locale&limit=5000');
  const insights = await rest('GET', 'insights?slug=like.*exec-summary*&select=slug,related_report_slugs,insight_translations(locale,status)&limit=2000');
  const localesOf = new Map();
  for (const t of translations) localesOf.set(t.report_id, (localesOf.get(t.report_id) || new Set()).add(t.locale));
  const done = new Map();
  for (const i of insights) for (const s of i.related_report_slugs || []) {
    const set = done.get(s) || new Set();
    for (const t of i.insight_translations || []) if (t.status === 'published') set.add(t.locale);
    done.set(s, set);
  }
  return reports.filter(r => { const d = done.get(r.slug) || new Set(); return [...(localesOf.get(r.id) || [])].some(l => !d.has(l)); }).map(r => r.slug).slice(0, limit);
}

const slugs = opt.report !== undefined ? [opt.report] : await pendingSlugs(Number(opt.pending) || 10);
const tally = {};
for (const s of slugs) {
  let r;
  try { r = await makeOne(s); } catch (e) { r = { report: s, status: 'failed', reason: String(e.message).slice(0, 200) }; }
  tally[r.status] = (tally[r.status] || 0) + 1;
  console.log(JSON.stringify(r));
}
console.log(JSON.stringify({ summary: true, reports: slugs.length, ...tally }));
process.exitCode = tally.failed ? 1 : 0;
