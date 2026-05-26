#!/usr/bin/env node
// One-off backfill: upload preview HTML for every report that already has
// a published translation, by slicing the local batch HTML and posting it
// to the public 'reports-html' bucket.
//
// Why this is a one-off:
//   New reports get their HTML uploaded by run_publish.mjs as part of the
//   normal batch workflow (see workflow.md). This script exists only to
//   catch up the reports that landed before that step existed.
//
// Run:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//   node skills/kira-research-report/scripts/_backfill_html_previews.mjs
//
// Safe to re-run — upload-html.mjs uses x-upsert=true, so it overwrites
// rather than erroring on duplicates.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, 'upload-html.mjs');
const BATCH_ROOT = path.join(__dirname, '..', 'outputs', 'batch');

// DB slug → local batch folder name. The naming was inconsistent in the
// early batches (industry_short, suffix counters, etc.), so we map by hand.
// New rows will be added by run_publish; this list is frozen.
const REPORTS = [
  { id: '88361c4a-c81b-4d92-b9c4-6c75a5e7e218', slug: 'vietnam-aquaculture-2027',     folder: '2027-vn-aquaculture' },
  { id: 'fc71427c-57d9-4cfb-b7b0-5bdd4aca65c3', slug: 'vietnam-coffee-2026',          folder: '2026-vn-coffee' },
  { id: '29c48831-2d45-42a5-8188-ebb6c2d0da28', slug: 'vietnam-e-commerce-2026',      folder: '2026-vn-ecommerce' },
  { id: 'a39cd8ef-d782-4839-9ea9-c6f1310b8961', slug: 'vietnam-ev-2027',              folder: '2027-vn-ev' },
  { id: 'ddabb646-e226-4892-a49f-dfbef8c00d8a', slug: 'vietnam-fintech-2026',         folder: '2026-vn-fintech' },
  { id: 'b82b5e63-e071-45c3-aafd-e61a43863c36', slug: 'vietnam-specialty-coffee-2026', folder: '2026-vn-coffee-2' },
];
const LOCALES = ['en', 'ja', 'ko'];

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL + SUPABASE_SERVICE_KEY env vars required');
  process.exit(2);
}

let ok = 0, skipped = 0, failed = 0;
for (const r of REPORTS) {
  for (const loc of LOCALES) {
    const file = path.join(BATCH_ROOT, r.folder, `${loc}.html`);
    if (!fs.existsSync(file)) {
      console.warn(`SKIP (no file): ${r.slug} / ${loc} → ${file}`);
      skipped++;
      continue;
    }
    console.log(`\n→ ${r.slug} / ${loc}`);
    try {
      execFileSync('node', [SCRIPT, file, r.id, loc], {
        stdio: 'inherit',
        env: process.env,
      });
      ok++;
    } catch (e) {
      console.error(`FAIL ${r.slug} / ${loc}:`, e.message);
      failed++;
    }
  }
}

console.log(`\n────────────────────────────`);
console.log(`uploaded: ${ok}, skipped: ${skipped}, failed: ${failed}`);
process.exit(failed ? 1 : 0);
