// ============================================================
// KIRA RESEARCH — api/_lib/registry/index.js
// Kira Data (D5): registries + GLEIF.
//   enrich(entity, { env })   → patch for entities (lei, legal_name, reg_id, reg_status, founded, parent and
//                               ultimate parent LEI, registry{source: …}); national registry first, then GLEIF
//   detectNew({ groups, hosts, env, log }) → company_events rows (status draft, tier registry) for new companies:
//       Singapore (ACRA, last 14 days) whose name carries a followed group's token, and new legal entities in the
//       15 markets (GLEIF, founded in the last 60 days) whose ultimate parent sits in another country or whose name
//       carries a group token.
// ============================================================

import * as gleif from './gleif.js';
import * as acra from './acra.js';
import * as national from './national.js';
import { matchGroup } from './names.js';

const NATIONAL = { SG: { key: 'acra', search: (n) => acra.search(n) } };
for (const [key, ad] of Object.entries(national)) NATIONAL[ad.country] = { key, search: ad.search, env: true };
const HOST_NAME = { VN: 'Vietnam', TH: 'Thailand', ID: 'Indonesia', MY: 'Malaysia', PH: 'the Philippines', SG: 'Singapore', TW: 'Taiwan',
  AU: 'Australia', NZ: 'New Zealand', KH: 'Cambodia', LA: 'Laos', MM: 'Myanmar', BN: 'Brunei', JP: 'Japan', KR: 'South Korea' };

export async function enrich(entity, { env = {} } = {}) {
  const name = entity.canonical_name, cc = entity.country_code;
  const patch = { registry_checked_at: new Date().toISOString(), registry: { ...(entity.registry || {}) } };
  const nat = NATIONAL[cc];
  if (nat && (!nat.env || env[nat.key])) {
    const r = await nat.search(name, env[nat.key]);
    if (r) {
      patch.registry[nat.key] = { ...r, at: patch.registry_checked_at };
      patch.reg_id = r.reg_id; patch.legal_name = r.legal_name; patch.reg_status = r.status;
      if (r.founded) patch.founded = r.founded;
    }
  }
  const g = await gleif.findLei({ name, country: cc });
  if (g) {
    patch.registry.gleif = { ...g, at: patch.registry_checked_at };
    patch.lei = g.lei; patch.parent_lei = g.parent_lei; patch.ultimate_parent_lei = g.ultimate_parent_lei;
    if (!patch.legal_name) patch.legal_name = g.legal_name;
    if (!patch.reg_status) patch.reg_status = g.status;
    if (!patch.founded && g.founded) patch.founded = g.founded;
    if (!patch.reg_id && g.reg_id) patch.reg_id = g.reg_id;
  }
  return patch;
}

export async function detectNew({ groups = [], hosts = Object.keys(HOST_NAME), log = null, budgetMs = 300000, maxParents = 60 } = {}) {
  const events = [], errors = [];
  const t0 = Date.now();

  // Singapore: new ACRA companies named after a followed group.
  try {
    for (const c of await acra.newSince(14)) {
      const g = matchGroup(c.name, groups);
      if (!g || g.country === 'SG') continue;
      events.push({ source_key: 'acra', url: `https://data.gov.sg/datasets/d_3f960c10fed6145404ca7b821f263b87/view#uen=${c.uen}`,
        title: `${c.name}: new ${c.type.toLowerCase()} registered in Singapore (UEN ${c.uen})`, domain: 'data.gov.sg', lang: 'en', event_date: c.date,
        investor_country: g.country, host_country: 'SG', type: 'subsidiary', company: c.name, value_usd: null, tier: 'registry', status: 'draft', also: [], raw: { group: g.key, uen: c.uen } });
    }
    if (log) log('acra', events.length);
  } catch (err) { errors.push(`acra: ${err.message}`); }

  // The 15 markets: new legal entities in GLEIF with a foreign ultimate parent or a group name.
  const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  let parents = 0;
  for (const h of hosts) {
    if (Date.now() - t0 > budgetMs) { errors.push(`gleif: time budget reached before ${h}`); break; }
    let list;
    try { list = await gleif.newEntities(h, since); } catch (err) { errors.push(`gleif ${h}: ${err.message}`); continue; }
    for (const e of list) {
      let g = matchGroup(e.english_name, groups) || matchGroup(e.legal_name, groups);
      let parent = null;
      if (parents < maxParents && Date.now() - t0 < budgetMs) {
        parents++;
        try { parent = await gleif.ultimateParent(e.lei); } catch (_e) { parent = null; }
      }
      const investor = parent && parent.country && parent.country !== h ? parent.country : g && g.country !== h ? g.country : null;
      if (!investor) continue;
      events.push({ source_key: 'gleif', url: `https://search.gleif.org/#/record/${e.lei}`,
        title: `${e.english_name}: new company in ${HOST_NAME[h]}` + (parent ? ` (ultimate parent: ${parent.name})` : ''), domain: 'gleif.org', lang: 'en',
        event_date: e.founded || since, investor_country: investor, host_country: h, type: 'subsidiary', company: e.english_name, value_usd: null,
        tier: 'registry', status: 'draft', also: [], raw: { lei: e.lei, parent_lei: parent ? parent.lei : null, group: g ? g.key : null } });
    }
    if (log) log(h, list.length);
  }
  return { events, errors };
}
