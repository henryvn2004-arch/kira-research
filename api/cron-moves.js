// ============================================================
// KIRA RESEARCH — api/cron-moves.js
// Daily Vercel cron (vercel.json). Kira Data (D4): gathers company moves into company_events (migration 060)
// from GDELT news and, once their keys are set, OpenDART and EDINET filings (api/_lib/moves/).
// New news items are drafts for the owner (/en/admin/moves); a filing whose market and type are known publishes
// itself. A URL already stored is never inserted again; the same story from another outlet is added to `also`.
// Logs one job_runs row ('moves-refresh') for /en/admin/health.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>` (Vercel cron does this).
// ============================================================

import { logJobRun } from './_lib/jobs.js';
import { collect } from './_lib/moves/index.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });

async function sb(path, method = 'GET', body, prefer = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: { ...H(), ...(prefer ? { Prefer: prefer } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
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
    const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const [sources, recent] = await Promise.all([
      sb('data_sources?select=key,env_key'),
      sb(`company_events?event_date=gte.${since}&select=id,url,title,investor_country,host_country,type,also&limit=5000`)
    ]);
    const { events, dupes, errors, waiting, scanned } = await collect({ sources, recent });
    for (let i = 0; i < events.length; i += 500) {
      await sb('company_events?on_conflict=url', 'POST', events.slice(i, i + 500), 'resolution=ignore-duplicates,return=minimal');
    }
    for (const d of dupes) await sb(`company_events?id=eq.${d.id}`, 'PATCH', { also: d.also }, 'return=minimal');

    const ok = errors.length === 0 || scanned > 0;
    const detail = `${scanned} items read, ${events.length} new moves (${events.filter((e) => e.status === 'published').length} published), ${dupes.length} repeats` +
      (waiting.length ? `; waiting for key: ${waiting.join(', ')}` : '') + (errors.length ? `; ${errors.join(' | ')}` : '');
    await logJobRun('moves-refresh', { ok, detail, startedAt });
    return res.status(ok ? 200 : 207).json({ ok, scanned, added: events.length, repeats: dupes.length, waiting, errors });
  } catch (err) {
    console.error('[cron-moves] error:', err.message);
    await logJobRun('moves-refresh', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
