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
import { createClient } from '@supabase/supabase-js';
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
const db = createClient(URL_, KEY, { auth: { persistSession: false } });

try {
  const { data: report, error: e1 } = await db.from('living_reports').select('id').eq('slug', naming.slug).maybeSingle();
  if (e1) throw new Error(`living_reports: ${e1.message}`);
  if (!report) throw new Error(`no living_reports row for slug ${naming.slug}`);
  const { error: e2 } = await db.from('report_exhibits').upsert(
    { report_id: report.id, data, exhibit_count: data.exhibits.length, updated_at: new Date().toISOString() },
    { onConflict: 'report_id' });
  if (e2) throw new Error(`report_exhibits: ${e2.message}`);
  console.log(JSON.stringify({ ok: true, slug: naming.slug, report_id: report.id, exhibits: data.exhibits.length }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(3);
}
