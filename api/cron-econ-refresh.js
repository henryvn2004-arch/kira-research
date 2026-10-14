// ============================================================
// KIRA RESEARCH — api/cron-econ-refresh.js
// Weekly Vercel cron (vercel.json). Kira Data D1: refreshes econ_series (migration 057) from the
// World Bank and IMF APIs for the 15 markets. Upserts, so a re-run only rewrites the same rows.
// Logs one job_runs row ('econ-refresh') for /en/admin/health.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>`
// (Vercel cron does this automatically).
// ============================================================

import { logJobRun } from './_lib/jobs.js';
import { collect } from './_lib/econ.js';

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
    const ir = await fetch(`${SUPABASE_URL}/rest/v1/econ_indicators?active=eq.true&select=key,source_key,source_code`, { headers: H() });
    if (!ir.ok) throw new Error(`Supabase ${ir.status}: ${await ir.text()}`);
    const indicators = await ir.json();

    const { rows, errors } = await collect(indicators);
    const now = new Date().toISOString();
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000).map((r) => ({ ...r, retrieved_at: now }));
      const w = await fetch(`${SUPABASE_URL}/rest/v1/econ_series?on_conflict=indicator_key,country_code,period`, {
        method: 'POST',
        headers: { ...H(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(chunk)
      });
      if (!w.ok) throw new Error(`Supabase write ${w.status}: ${await w.text()}`);
    }

    const ok = errors.length === 0 && rows.length > 0;
    const detail = `${rows.length} values from ${indicators.length} indicators` + (errors.length ? `; failed: ${errors.join(' | ')}` : '');
    await logJobRun('econ-refresh', { ok, detail, startedAt });
    return res.status(ok ? 200 : 207).json({ ok, rows: rows.length, errors });
  } catch (err) {
    console.error('[econ-refresh] error:', err.message);
    await logJobRun('econ-refresh', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
