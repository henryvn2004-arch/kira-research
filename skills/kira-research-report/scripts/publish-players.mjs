#!/usr/bin/env node
// Store a report's "who's who" list in the company database (Kira Chain seed,
// migration 033). Run at publish, after living_reports has the report row.
//
// Usage:
//   node skills/kira-research-report/scripts/publish-players.mjs --id <queue id>
//
// Reads outputs/batch/<id>/players.json + naming.json (slug). For each player:
// finds the company in `entities` (same country, same normalised name, legal or
// trading) or creates it, then replaces this report's rows in `industry_players`.
// Prints one JSON line. Env: SUPABASE_URL, SUPABASE_SERVICE_KEY.
// Exit 2 = bad input, 3 = no env or an API error (publish carries on; note it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normaliseName } from '../../../api/_lib/company/normalize.js';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const id = arg('id');
if (!id) { console.error('usage: publish-players.mjs --id <queue id>'); process.exit(2); }
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../outputs/batch', id);
const read = f => { const p = path.join(dir, f); if (!fs.existsSync(p)) { console.error('missing ' + p); process.exit(2); } return JSON.parse(fs.readFileSync(p, 'utf8')); };
const data = read('players.json'), naming = read('naming.json');
// Values that go into request URLs must have the expected shape (run render-players --check first).
if (!/^[A-Z]{2}$/.test(data.country_code || '') || !/^[a-z0-9-]{3,120}$/.test(naming.slug || '')) {
  console.error('players.json country_code or naming.json slug malformed'); process.exit(2);
}

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.log(JSON.stringify({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })); process.exit(3); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(method, p, body) {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { method, headers: { ...H, Prefer: 'return=representation' }, body: body && JSON.stringify(body) });
  if (!r.ok) throw new Error(`${method} ${p.split('?')[0]}: ${r.status} ${await r.text()}`);
  return r.status === 204 ? [] : r.json();
}

try {
  const cc = data.country_code;
  const [report] = await rest('GET', `living_reports?slug=eq.${encodeURIComponent(naming.slug)}&select=id`);
  if (!report) throw new Error(`no living_reports row for slug ${naming.slug}`);

  const order = Object.fromEntries(data.stages.map((s, i) => [s.key, i + 1]));
  const label = Object.fromEntries(data.stages.map(s => [s.key, s.label]));
  // normaliseName drops non-Latin scripts; keep such names as lower-case text.
  const norms = p => [...new Set([p.legal_name, p.name].filter(Boolean).map(n => normaliseName(n, cc) || n.toLowerCase().trim()))];
  const entityOf = new Map();
  let created = 0;
  for (const p of data.players) {
    const names = norms(p);
    const key = names.join('|');
    if (entityOf.has(key)) continue;
    const found = await rest('GET', `entities?country_code=eq.${cc}&type=eq.company&name_norm=in.(${encodeURIComponent(names.map(n => `"${n.replace(/"/g, '')}"`).join(','))})&select=id&limit=1`);
    let eid = found[0]?.id;
    if (!eid) {
      [{ id: eid }] = await rest('POST', 'entities', { type: 'company', country_code: cc, canonical_name: p.legal_name || p.name, name_norm: names[0] });
      created++;
    }
    entityOf.set(key, eid);
  }

  const rows = new Map();
  for (const p of data.players) {
    const eid = entityOf.get(norms(p).join('|'));
    rows.set(`${eid}|${p.stage}`, {
      entity_id: eid, report_id: report.id, country_code: cc,
      industry_code: data.industry_code || naming.industry_code || null, segment: data.segment || naming.segment || null,
      stage_key: p.stage, stage_label: label[p.stage], stage_order: order[p.stage],
      role: p.role || null, origin: p.origin || null, ownership: p.ownership ? String(p.ownership).toLowerCase() : null,
      brands: p.brands || [], scale: p.scale || null, source: p.source, source_text: (data.sources || {})[p.source] || null,
      url: p.url || null, as_of: data.as_of || null,
    });
  }
  await rest('DELETE', `industry_players?report_id=eq.${report.id}`);
  await rest('POST', 'industry_players', [...rows.values()]);
  console.log(JSON.stringify({ ok: true, slug: naming.slug, report_id: report.id, players: rows.size, entities_created: created }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e) }));
  process.exit(3);
}
