#!/usr/bin/env node
// Name a report by the rules in docs/naming_convention.md: report code, slug,
// title, SEO title, eyebrow (EN/JA/KO/ZH), cover lines and search keywords.
//
// Usage:
//   node skills/kira-research-report/scripts/report-name.mjs \
//     --country VN --industry "Coffee Chains" --stage ENT --type D --year 2026 \
//     --segment "coffee chains" --angle "how a foreign brand wins the food-led gap" \
//     --keywords "cafe chain,coffee shop,chuỗi cà phê" \
//     --out skills/kira-research-report/outputs/batch/<id>/naming.json
//
// --industry takes a vocabulary name or alias (or use --industry-code FSV).
// Uniqueness: slugs and codes already used are read from Supabase
// (living_reports) when SUPABASE_URL + SUPABASE_SERVICE_KEY are set, plus every
// outputs/batch/*/naming.json in progress. Exit 2 = rule violation (messages on
// stderr); exit 0 prints the naming JSON.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildName } from './lib/naming.mjs';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const here = path.dirname(fileURLToPath(import.meta.url));
const batchDir = path.join(here, '../outputs/batch');
const out = arg('out');

const taken = { slugs: new Set(), codes: new Set() };
const { SUPABASE_URL: url, SUPABASE_SERVICE_KEY: key } = process.env;
if (url && key) {
  try {
    const r = await fetch(`${url}/rest/v1/living_reports?select=slug,code&limit=10000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    for (const row of await r.json()) { taken.slugs.add(row.slug); if (row.code) taken.codes.add(row.code); }
  } catch (e) {
    console.error(`report-name: could not read existing slugs from Supabase (${e.message}); uniqueness is checked locally only`);
  }
} else {
  console.error('report-name: SUPABASE_URL / SUPABASE_SERVICE_KEY not set; uniqueness is checked locally only');
}
if (fs.existsSync(batchDir)) {
  for (const d of fs.readdirSync(batchDir)) {
    const f = path.join(batchDir, d, 'naming.json');
    if (!fs.existsSync(f) || (out && path.resolve(f) === path.resolve(out))) continue;
    try { const n = JSON.parse(fs.readFileSync(f, 'utf8')); taken.slugs.add(n.slug); taken.codes.add(n.code); } catch { /* ignore unreadable */ }
  }
}

const { naming, errors } = buildName({
  country: arg('country'), industry: arg('industry'), industryCode: arg('industry-code'),
  stage: arg('stage'), type: arg('type'), year: arg('year'),
  segment: arg('segment'), angle: arg('angle'),
  keywords: (arg('keywords') || '').split(',').map(s => s.trim()).filter(Boolean),
}, taken);

if (errors.length) { errors.forEach(e => console.error('naming: ' + e)); process.exit(2); }
const json = JSON.stringify(naming, null, 2);
if (out) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, json + '\n'); }
console.log(json);
