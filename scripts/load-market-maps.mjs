#!/usr/bin/env node
// ============================================================
// KIRA RESEARCH — scripts/load-market-maps.mjs
// Upserts market-map stats (and optional commentary) JSON files into table market_maps (migration 070).
//
//   node scripts/load-market-maps.mjs <dir> [--dry-run] [--publish]
//
// <dir> holds, per map, a stats file and an optional commentary file with the same base name:
//   <base>.stats.json        written by the private pipeline (market_mapping/pilot/page_v2.py <segment> --stats-only)
//   <base>.commentary.json   optional {takeaway, so_what{...}, implications[]}; sets commentary + commentary_built_at
//
// Stats contract (the keys the renderer reads; see api/_lib/market-map/render.js):
//   segment, country, built, companies, price_usd, groups[], left_out_roles[], definition_extra, item_noun,
//   meta{country_code,country_slug,segment_key,slug,kind,l2_family,axis,axis_title,stage_labels[],region_labels[]},
//   kpis[], stages[], regions[], marimekko[], heatmap|null, tiers_by_stage[], tiers{}, brands[], certifications[],
//   origins[], channels[], provinces[]|null, regions[]|null (null = fewer than thresholds.region of companies state a region: the
//   region block is hidden), coverage{field:{n_filled,share_filled}}, thresholds{}, top20[], preview[] (10 rows, no contacts),
//   contacts{with_phone_pct,with_email_pct}, findings{}; meta.mekko{x_title,y_title,y_labels[]}; marimekko[].cells[]{label,n,...}
//
// Default: new rows are saved as draft and an existing row keeps its status; --publish sets status=published.
// `indexable` is always recomputed here with the same gate the route uses (>= 50 companies, >= 2 stages with 5+).
// --dry-run prints what would be written and touches nothing. Env for a real run: SUPABASE_URL, SUPABASE_SERVICE_KEY.
// Safety: a file is refused when any text in it looks like an email address or a phone number, because
// the page data must never hold contacts (the paid list lives only in the private pipeline).
// ============================================================
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { isIndexable } from '../api/_lib/market-map/gate.js';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const publish = args.includes('--publish');
const dir = args.find((a) => !a.startsWith('--'));
if (!dir) { console.error('usage: load-market-maps.mjs <dir> [--dry-run] [--publish]'); process.exit(2); }

const REQUIRED = ['segment', 'country', 'built', 'companies', 'price_usd', 'meta', 'stages', 'regions', 'marimekko', 'tiers_by_stage', 'tiers', 'provinces', 'top20', 'preview', 'contacts', 'findings'];
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const PHONE = /(\+\d[\d\s().-]{7,}\d)|(\b0\d[\d\s.-]{7,}\d\b)|(\b\d{3,4}[\s.-]\d{3,4}[\s.-]\d{3,4}\b)/;

function strings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}
function check(base, S) {
  const missing = REQUIRED.filter((k) => !(k in S));
  if (missing.length) throw new Error(`${base}: stats missing ${missing.join(', ')}`);
  for (const k of ['country_slug', 'segment_key', 'slug', 'stage_labels', 'region_labels']) if (!S.meta[k]) throw new Error(`${base}: meta.${k} missing`);
  if (S.meta.slug !== `${S.meta.country_slug}/${S.meta.segment_key}`) throw new Error(`${base}: meta.slug must be country_slug/segment_key`);
  if (S.preview.length > 10) throw new Error(`${base}: preview has more than 10 rows`);
  if (S.top20.length > 20) throw new Error(`${base}: top20 has more than 20 rows`);
  for (const t of strings(S)) {
    if (EMAIL.test(t) || PHONE.test(t)) throw new Error(`${base}: refused, looks like a contact: "${t.slice(0, 40)}"`);
  }
}

const files = readdirSync(dir).filter((f) => f.endsWith('.stats.json')).sort();
if (!files.length) { console.error(`no *.stats.json in ${dir}`); process.exit(2); }

const rows = [];
for (const f of files) {
  const base = f.replace(/\.stats\.json$/, '');
  const S = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  check(base, S);
  const cf = path.join(dir, `${base}.commentary.json`);
  const C = existsSync(cf) ? JSON.parse(readFileSync(cf, 'utf8')) : null;
  if (C) for (const t of strings(C)) if (EMAIL.test(t) || PHONE.test(t)) throw new Error(`${base}: commentary refused, looks like a contact`);
  const row = {
    country: S.meta.country_slug, segment_key: S.meta.segment_key, slug: S.meta.slug, title: S.segment,
    l2_family: S.meta.l2_family || null, n_companies: S.companies, stats: S, indexable: isIndexable(S),
    built_at: new Date(`${S.built}T00:00:00Z`).toISOString(), updated_at: new Date().toISOString(),
  };
  if (C) { row.commentary = C; row.commentary_built_at = new Date().toISOString(); }
  if (publish) row.status = 'published';
  rows.push(row);
}

for (const r of rows) {
  console.log(`${dry ? '[dry-run] ' : ''}${r.slug}: ${r.n_companies} companies, family "${r.l2_family}", indexable=${r.indexable}, commentary=${r.commentary ? 'yes' : 'no'}, status=${r.status || '(unchanged, new rows draft)'}, stats ${JSON.stringify(r.stats).length} bytes`);
}
if (dry) process.exit(0);

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required (or use --dry-run)'); process.exit(2); }
for (const r of rows) {
  const res = await fetch(`${URL_}/rest/v1/market_maps?on_conflict=country,segment_key`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(r),
  });
  if (!res.ok) { console.error(`${r.slug}: ${res.status} ${await res.text()}`); process.exit(1); }
  console.log(`saved ${r.slug}`);
}
