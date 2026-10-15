// ============================================================
// KIRA RESEARCH — api/_lib/moves/index.js
// Kira Data (D4): gathers company moves from every source, classifies them (rules.js) and drops repeats.
// collect({ sources, recent }) → { events, dupes, errors, waiting }
//   sources  data_sources rows ({ key, env_key }); a source whose key is not set is skipped ("waiting")
//   recent   company_events of the last 14 days ({ id, url, title, investor_country, host_country, type, also })
//   events   new rows for company_events (status draft; a classified filing is published)
//   dupes    { id, also } updates: other outlets' URLs for a story we already have
// ============================================================

import * as gdelt from './gdelt.js';
import * as opendart from './opendart.js';
import * as edinet from './edinet.js';
import { classify, sameStory } from './rules.js';

const ADAPTERS = { gdelt, opendart, edinet };

export async function collect({ sources = [], recent = [] } = {}) {
  const envOf = Object.fromEntries(sources.map((s) => [s.key, s.env_key]));
  const raw = [], errors = [], waiting = [];
  for (const [key, ad] of Object.entries(ADAPTERS)) {
    if (envOf[key] && !process.env[envOf[key]]) { waiting.push(key); continue; }
    try {
      const got = await ad.items({ env: process.env[envOf[key]] });
      raw.push(...got);
      if (got.failed) errors.push(`${key}: no answer for ${got.failed.join(', ')}`);
    }
    catch (err) { errors.push(`${key}: ${err.message}`); }
  }

  const seen = new Set(recent.map((r) => r.url));
  const kept = [...recent.map((r) => ({ ...r, old: true }))];
  const events = [], dupes = new Map();
  for (const it of raw) {
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    const c = classify(it.classify_text || it.title, { lang: it.lang, investor: it.investor || null });
    if (!c) continue;
    const twin = kept.find((k) => k.host_country === c.host_country && k.type === c.type && sameStory(k.title, it.title));
    if (twin) {
      if (twin.old) { const d = dupes.get(twin.id) || { id: twin.id, also: [...(twin.also || [])] }; d.also.push(it.url); dupes.set(twin.id, d); }
      else twin.also.push(it.url);
      continue;
    }
    const row = { source_key: it.source_key, url: it.url, title: it.title, domain: it.domain, lang: it.lang, event_date: it.event_date,
      investor_country: c.investor_country, host_country: c.host_country, type: c.type, company: it.company || null, value_usd: c.value_usd,
      tier: it.tier, status: it.tier === 'filing' ? 'published' : 'draft', also: [], raw: {} };
    events.push(row);
    kept.push(row);
  }
  return { events, dupes: [...dupes.values()], errors, waiting, scanned: raw.length };
}
