// ============================================================
// KIRA RESEARCH — api/cron-registry.js
// Daily Vercel cron (vercel.json). Kira Data (D5): registries + GLEIF (api/_lib/registry/).
//   1. New companies: Singapore (ACRA) named after a followed group, and new legal entities in the 15 markets
//      (GLEIF) with a foreign ultimate parent → company_events drafts (tier registry) for /en/admin/moves.
//   2. Enrichment: the entities checked longest ago (never-checked first) get LEI, national number, legal name,
//      status, founding date and parent LEIs; keyed national registries join once their key is set.
// Logs one job_runs row ('registry-refresh') for /en/admin/health.
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>` (Vercel cron does this).
// ============================================================

import { logJobRun } from './_lib/jobs.js';
import { detectNew, enrich } from './_lib/registry/index.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;
const BATCH = 60;            // entities per run
const ENRICH_BUDGET = 420000; // ms, keeps the run inside maxDuration with detection first

async function sb(path, method = 'GET', body, prefer = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method, headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });

  const startedAt = Date.now();
  try {
    const [sources, groups, entities] = await Promise.all([
      sb('data_sources?select=key,env_key'),
      sb('company_groups?active=eq.true&select=key,name,country,tokens'),
      sb(`entities?select=id,canonical_name,country_code,registry&order=registry_checked_at.asc.nullsfirst&limit=${BATCH}`)
    ]);
    const env = Object.fromEntries(sources.filter((s) => s.env_key && process.env[s.env_key]).map((s) => [s.key, process.env[s.env_key]]));
    const waiting = sources.filter((s) => ['houjin_bangou', 'abn_lookup', 'nzbn'].includes(s.key) && !env[s.key]).map((s) => s.key);

    const { events, errors } = await detectNew({ groups });
    if (events.length) await sb('company_events?on_conflict=url', 'POST', events, 'resolution=ignore-duplicates,return=minimal');

    let done = 0, found = 0;
    const t0 = Date.now();
    for (const e of entities) {
      if (Date.now() - t0 > ENRICH_BUDGET) break;
      try {
        const patch = await enrich(e, { env });
        if (patch.lei) {
          // another entity may already hold this LEI (a duplicate row): keep the LEI on the first one only
          const dupe = await sb(`entities?lei=eq.${patch.lei}&id=neq.${e.id}&select=id&limit=1`);
          if (dupe.length) { patch.registry.gleif.duplicate_of = dupe[0].id; delete patch.lei; }
        }
        await sb(`entities?id=eq.${e.id}`, 'PATCH', patch, 'return=minimal');
        done++;
        if (patch.lei || patch.reg_id) found++;
      } catch (err) { errors.push(`${e.canonical_name}: ${err.message}`); }
    }

    const ok = errors.length === 0 || done > 0;
    const detail = `${events.length} new-company moves (drafts); ${done} companies checked, ${found} matched a registry` +
      (waiting.length ? `; waiting for key: ${waiting.join(', ')}` : '') + (errors.length ? `; ${errors.slice(0, 5).join(' | ')}` : '');
    await logJobRun('registry-refresh', { ok, detail, startedAt });
    return res.status(ok ? 200 : 207).json({ ok, moves: events.length, checked: done, matched: found, waiting, errors });
  } catch (err) {
    console.error('[cron-registry] error:', err.message);
    await logJobRun('registry-refresh', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
