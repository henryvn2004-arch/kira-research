#!/usr/bin/env node
// Store planned contents (chapters + page titles) on topics, so the coming-soon page shows them and the
// report runner starts from them (topics.signals.planned, no migration: signals is jsonb).
//
// Usage:
//   node skills/kira-research-report/scripts/publish-planned-contents.mjs <plans.json> [--dry-run]
//
// plans.json = array of { slug, chapters: [{ title, pages: [...] }] }. It is checked with
// check-planned-contents.mjs first; one bad title stops everything. Re-running replaces the stored plan.
// Only topics that are still queued and have no report are touched. Prints one JSON line.
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY. Exit 2 = bad input, 3 = no env or an API error.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const file = process.argv.slice(2).find(a => !a.startsWith('--'));
const dry = process.argv.includes('--dry-run');
if (!file) { console.error('usage: publish-planned-contents.mjs <plans.json> [--dry-run]'); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));
try { execFileSync(process.execPath, [path.join(here, 'check-planned-contents.mjs'), file], { stdio: 'pipe' }); }
catch (e) { console.error(String(e.stdout || e.message)); process.exit(2); }
const plans = JSON.parse(fs.readFileSync(file, 'utf8'));

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.log(JSON.stringify({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })); process.exit(3); }
const db = createClient(URL_, KEY, { auth: { persistSession: false } });

let done = 0; const skipped = [];
try {
  for (const p of plans) {
    const { data: t, error } = await db.from('topics').select('id, signals, status, report_id').eq('slug', p.slug).maybeSingle();
    if (error) throw new Error(`topics: ${error.message}`);
    if (!t || t.status !== 'queued' || t.report_id) { skipped.push(p.slug); continue; }
    const signals = { ...(t.signals || {}), planned: { version: 1, planned_at: new Date().toISOString().slice(0, 10), chapters: p.chapters } };
    if (!dry) {
      const { error: e2 } = await db.from('topics').update({ signals }).eq('id', t.id);
      if (e2) throw new Error(`topics update ${p.slug}: ${e2.message}`);
    }
    done++;
  }
  console.log(JSON.stringify({ ok: true, dry_run: dry, stored: done, skipped }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e.message, stored: done }));
  process.exit(3);
}
