#!/usr/bin/env node
// Store a report's exhibit data (exhibits.json) so readers who own the report can download it as
// Excel or PowerPoint (S12, migration 053). Run at publish, after living_reports has the report row.
//
// Usage:
//   node skills/kira-research-report/scripts/publish-exhibits.mjs --id <queue id>
//
// Runs the same checks as check-exhibits.mjs first. Re-running replaces the stored data.
// Prints one JSON line. Env: SUPABASE_URL, SUPABASE_SERVICE_KEY.
// Exit 2 = bad input, 3 = no env or an API error (publish carries on; note it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExhibits } from '../../../api/_lib/exhibits.js';

const i = process.argv.indexOf('--id');
const id = i > 0 ? process.argv[i + 1] : null;
if (!id || !/^[A-Za-z0-9._-]+$/.test(id)) { console.error('usage: publish-exhibits.mjs --id <queue id>'); process.exit(2); }
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../outputs/batch', id);
const read = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) { console.error('missing ' + p); process.exit(2); } return JSON.parse(fs.readFileSync(p, 'utf8')); };
const data = read('exhibits.json'), naming = read('naming.json');
const v = validateExhibits(data);
if (!v.ok) { console.error(v.errors.join('\n')); process.exit(2); }
if (!/^[a-z0-9-]{3,120}$/.test(naming.slug || '')) { console.error('naming.json slug malformed'); process.exit(2); }

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.log(JSON.stringify({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })); process.exit(3); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

try {
  const r = await fetch(`${URL_}/rest/v1/living_reports?slug=eq.${encodeURIComponent(naming.slug)}&select=id`, { headers: H });
  if (!r.ok) throw new Error(`living_reports: ${r.status} ${await r.text()}`);
  const [report] = await r.json();
  if (!report) throw new Error(`no living_reports row for slug ${naming.slug}`);
  const w = await fetch(`${URL_}/rest/v1/report_exhibits?on_conflict=report_id`, {
    method: 'POST', headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ report_id: report.id, data, exhibit_count: data.exhibits.length, updated_at: new Date().toISOString() }),
  });
  if (!w.ok) throw new Error(`report_exhibits: ${w.status} ${await w.text()}`);
  console.log(JSON.stringify({ ok: true, slug: naming.slug, report_id: report.id, exhibits: data.exhibits.length }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(3);
}
