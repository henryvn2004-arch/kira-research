#!/usr/bin/env node
// Build a Kira Chain from the reports' "who's who" data (migration 033 → 037).
// Run at publish, right after publish-players.mjs.
//
// Usage:
//   node skills/kira-research-report/scripts/build-chain.mjs --id <queue id>   chain of that report's market x industry x segment
//   node skills/kira-research-report/scripts/build-chain.mjs --all             every group in industry_players
//   add --dry to print the chain instead of writing it
//
// A "group" is country_code + industry_code + segment. All reports of a group
// are merged: one hub per value-chain stage (the report's own stage list),
// one dot per company. The chain is written to `chains` (status published,
// stats.auto = true). The arrows are a straight line through the stages: an
// analyst fixes them. A row that was NOT built here (stats.auto not true,
// e.g. the hand-made VN coffee chain) is never touched.
// Prints one JSON line per chain. Env: SUPABASE_URL, SUPABASE_SERVICE_KEY.
// Exit 2 = bad input, 3 = no env or an API error (publish carries on; note it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OWNERSHIP = { local: 'private', private: 'private', foreign: 'fdi', jv: 'fdi', state: 'state', listed: 'listed', cooperative: 'cooperative' };
const MIN_PLAYERS = 8, MIN_STAGES = 3;

export const slugOf = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const sentence = (s) => { const t = String(s || '').trim(); return t ? t[0].toUpperCase() + t.slice(1) : t; };
const singular = (s) => String(s).split(' ').map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)).join(' ');

// rows: industry_players rows joined with entities(canonical_name), one group.
// ctx:  { countryName, segment, industryCode }
export function buildChain(rows, ctx) {
  const region = new Intl.DisplayNames(['en'], { type: 'region' });
  const countryOf = (c) => { try { return c ? region.of(c) : null; } catch { return c; } };

  const stageMap = new Map();
  for (const r of rows) {
    const cur = stageMap.get(r.stage_key);
    if (!cur) stageMap.set(r.stage_key, { id: r.stage_key, label: r.stage_label, order: r.stage_order ?? 0 });
    else cur.order = Math.min(cur.order, r.stage_order ?? 0);
  }
  const stages = [...stageMap.values()].sort((a, b) => a.order - b.order).map(({ id, label }) => ({ id, label, desc: '' }));
  if (rows.length < MIN_PLAYERS || stages.length < MIN_STAGES) return null;

  // A company listed twice (two stages) keeps the origin and ownership given on either row.
  const known = new Map();
  for (const r of rows) { const k = known.get(r.entity_id) || {}; known.set(r.entity_id, { origin: k.origin || r.origin, ownership: k.ownership || r.ownership }); }
  rows = rows.map((r) => ({ ...r, ...known.get(r.entity_id) }));

  const companies = rows.map((r) => ({
    eid: r.entity_id, name: r.entities?.canonical_name || '(unnamed)', name_vi: null,
    stage: r.stage_key, role: r.stage_label, role_detail: r.role || null,
    province: countryOf(r.origin), ownership: OWNERSHIP[String(r.ownership || '').toLowerCase()] || 'unknown',
    tax_id: null, website: null,
    scale_note: [r.scale, r.brands?.length ? 'brands: ' + r.brands.join(', ') : null].filter(Boolean).join(' · ') || null,
    capital_vnd: null, export_markets: [],
    evidence_url: r.url || null, evidence_note: r.source_text || r.source || null,
    confidence: 'medium',
    verification: { status: 'reported', checked: r.as_of || null, source_checked_url: null, note: 'Taken from a KIRA report; the source was cited there and has not been re-opened since.' },
  }));

  const flows = stages.slice(0, -1).map((s, i) => ({
    from_stage: s.id, from_role: s.label, to_stage: stages[i + 1].id, to_role: stages[i + 1].label, label: '', show_label: false
  }));

  const asOf = rows.map((r) => r.as_of).filter(Boolean).sort().pop() || null;
  const reports = new Set(rows.map((r) => r.report_id)).size;
  const name = sentence(ctx.segment || ctx.industryCode);
  const nCompanies = new Set(rows.map((r) => r.entity_id)).size;
  const payload = {
    product: name, country: rows[0].country_code, generated: asOf, auto: true, stages, flows, facts: [], companies,
    method: [
      `This chain was built automatically from the "who's who" chapter of ${reports} KIRA report${reports > 1 ? 's' : ''} (compiled ${asOf || 'date not recorded'}). Each company comes with the source the report cited; we have not re-opened those sources, and no analyst has reviewed the chain.`,
      'The stages are the report\'s own value-chain stages. The arrows are a straight line through them, drawn by default; real chains often branch, so treat them as a first draft.',
      'There are no market estimates yet, and no company-to-company links. Counts are the companies the report named, not the whole market.',
    ],
  };
  const first = stages[0].label.toLowerCase(), last = stages[stages.length - 1].label.toLowerCase();
  const meta = {
    name, aliases: [...new Set([String(ctx.segment || '').toLowerCase(), singular(String(ctx.segment || '').toLowerCase())].filter(Boolean))],
    summary: `${nCompanies} companies across ${stages.length} stages, from ${first} to ${last}.`,
    stats: { companies: nCompanies, stages: stages.length, checked: asOf, auto: true, reports },
  };
  return { meta, payload };
}

// ── CLI ────────────────────────────────────────────────────────────────────────
async function main() {
  const arg = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
  const has = (k) => process.argv.includes('--' + k);
  const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!URL_ || !KEY) { console.log(JSON.stringify({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })); process.exit(3); }
  const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
  const rest = async (method, p, body, prefer = 'return=representation') => {
    const r = await fetch(`${URL_}/rest/v1/${p}`, { method, headers: { ...H, Prefer: prefer }, body: body && JSON.stringify(body) });
    if (!r.ok) throw new Error(`${method} ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
    const t = await r.text();
    return t ? JSON.parse(t) : [];
  };
  const eq = (col, v) => (v == null ? `${col}=is.null` : `${col}=eq.${encodeURIComponent(v)}`);

  let groups = [];
  if (arg('id')) {
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../outputs/batch', arg('id'));
    const read = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) { console.error('missing ' + p); process.exit(2); } return JSON.parse(fs.readFileSync(p, 'utf8')); };
    const players = read('players.json'), naming = fs.existsSync(path.join(dir, 'naming.json')) ? read('naming.json') : {};
    if (!/^[A-Z]{2}$/.test(players.country_code || '')) { console.error('players.json country_code malformed'); process.exit(2); }
    groups = [{ country_code: players.country_code, industry_code: players.industry_code || naming.industry_code || null, segment: players.segment || naming.segment || null }];
  } else if (has('all')) {
    const seen = new Set();
    for (const g of await rest('GET', 'industry_players?select=country_code,industry_code,segment')) {
      const k = JSON.stringify([g.country_code, g.industry_code, g.segment]);
      if (!seen.has(k)) { seen.add(k); groups.push(g); }
    }
  } else { console.error('usage: build-chain.mjs --id <queue id> | --all [--dry]'); process.exit(2); }

  const out = [];
  try {
    for (const g of groups) {
      const rows = await rest('GET', `industry_players?${eq('country_code', g.country_code)}&${eq('industry_code', g.industry_code)}&${eq('segment', g.segment)}`
        + '&select=entity_id,report_id,country_code,stage_key,stage_label,stage_order,role,origin,ownership,brands,scale,source,source_text,url,as_of,entities(canonical_name)&limit=2000');
      const built = buildChain(rows, { segment: g.segment, industryCode: g.industry_code });
      const group = `${g.industry_code || ''}|${g.segment || ''}`;
      if (!built) { out.push({ ok: true, built: false, group, reason: `needs at least ${MIN_PLAYERS} players in ${MIN_STAGES} stages (has ${rows.length})` }); continue; }
      if (has('dry')) { out.push({ ok: true, dry: true, group, meta: built.meta, companies: built.payload.companies.length }); continue; }

      // Pick the slug; never take over a chain that was not built here, and keep two groups apart.
      let slug = slugOf(g.segment) || slugOf(g.industry_code);
      if (!slug) { out.push({ ok: true, built: false, group, reason: 'no segment to name the chain' }); continue; }
      let skipped = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const [existing] = await rest('GET', `chains?country_code=eq.${g.country_code}&slug=eq.${encodeURIComponent(slug)}&select=stats`);
        if (!existing) break;
        if (existing.stats?.auto !== true) { skipped = 'a hand-made chain already uses this name'; break; }
        if (existing.stats.group === group) break;
        slug = `${slug}-${slugOf(g.industry_code)}`.slice(0, 70);
      }
      if (skipped) { out.push({ ok: true, built: false, group, slug, reason: skipped }); continue; }
      const row = { country_code: g.country_code, slug, name: built.meta.name, aliases: built.meta.aliases, summary: built.meta.summary,
        status: 'published', stats: { ...built.meta.stats, group }, payload: built.payload, payload_url: null, updated_at: new Date().toISOString() };
      await rest('POST', 'chains?on_conflict=country_code,slug', row, 'resolution=merge-duplicates,return=minimal');
      out.push({ ok: true, built: true, group, slug, companies: built.meta.stats.companies, stages: built.meta.stats.stages });
    }
    for (const o of out) console.log(JSON.stringify(o));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
    process.exit(3);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await main();
