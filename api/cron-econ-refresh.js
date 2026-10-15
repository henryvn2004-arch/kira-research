// ============================================================
// KIRA RESEARCH — api/cron-econ-refresh.js
// Weekly Vercel cron (vercel.json). Kira Data: refreshes econ_series (migration 057) and econ_flows (058)
// from every source adapter in api/_lib/econ/. Upserts, so a re-run only rewrites the same rows.
// Sources whose API key is not set yet are skipped and named in the log line.
// Logs one job_runs row ('econ-refresh', or 'econ-refresh-<source>' for a source's own slot) for /en/admin/health.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>`
// (Vercel cron does this automatically).
// ============================================================

import { logJobRun } from './_lib/jobs.js';
import { collect } from './_lib/econ/index.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });

  const startedAt = Date.now();
  try {
    const read = async (path) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H() });
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
      return r.json();
    };
    const [indicators, sources, map] = await Promise.all([
      read('econ_indicators?active=eq.true&select=key,source_key,source_code,country_code,params,freq'),
      read('data_sources?select=key,env_key'),
      read('segment_data_map?select=hs')
    ]);
    const hs = [...new Set(map.flatMap((m) => m.hs || []))].sort();

    const only = /^[a-z_]{2,40}$/.test(String(req.query.source || '')) ? String(req.query.source) : null;
    const { rows, flows, errors, waiting } = await collect(indicators, sources, { only, hs });
    const now = new Date().toISOString();
    const write = async (table, conflict, list) => {
      for (let i = 0; i < list.length; i += 1000) {
        const chunk = list.slice(i, i + 1000).map((r) => ({ ...r, retrieved_at: now }));
        const w = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`, {
          method: 'POST',
          headers: { ...H(), Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(chunk)
        });
        if (!w.ok) throw new Error(`Supabase write ${table} ${w.status}: ${await w.text()}`);
      }
    };
    await write('econ_series', 'indicator_key,country_code,period', rows);
    await write('econ_flows', 'source_key,reporter,partner,product,flow,freq,period', flows);

    const ok = errors.length === 0 && (rows.length > 0 || flows.length > 0 || (only && waiting.includes(only)));
    const detail = `${rows.length} values, ${flows.length} trade flows` +
      (waiting.length ? `; waiting for key: ${waiting.join(', ')}` : '') +
      (errors.length ? `; failed: ${errors.join(' | ')}` : '');
    await logJobRun(only ? `econ-refresh-${only}` : 'econ-refresh', { ok, detail, startedAt });
    return res.status(ok ? 200 : 207).json({ ok, rows: rows.length, flows: flows.length, waiting, errors });
  } catch (err) {
    console.error('[econ-refresh] error:', err.message);
    await logJobRun(/^[a-z_]{2,40}$/.test(String(req.query.source || '')) ? `econ-refresh-${req.query.source}` : 'econ-refresh', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
