// ============================================================
// KIRA RESEARCH — api/cron-geo-econ.js
// Weekly Vercel cron (vercel.json, Sundays 06:10 UTC, after the week's econ refreshes). Turns the stored Kira Data
// into GEO answers (kira_answers, source_kind 'econ') with fixed templates: api/_lib/geo-econ.js. No model.
// Upserts by content_hash, so a run only rewrites what changed; rows of an older year or a revised value are retired.
// Logs one job_runs row ('geo-econ') for /en/admin/health.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>` (Vercel cron does this automatically).
// ============================================================
import { logJobRun } from './_lib/jobs.js';
import { buildRows, syncRows } from './_lib/geo-econ.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });

const read = async (path) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H() });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
};
const write = async (path, method, body, headers = {}) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers: { ...H(), ...headers }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Supabase write ${r.status}: ${await r.text()}`);
  return null;
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  const startedAt = Date.now();
  try {
    const { rows, stats } = await buildRows(read);
    const out = await syncRows(rows, { read, write });
    const detail = `${out.upserted} answers, ${out.retired} retired; ${stats.skipped_no_profile} segments without a data profile, ${stats.skipped_no_data} without data`;
    await logJobRun('geo-econ', { ok: true, detail, startedAt });
    return res.status(200).json({ ok: true, ...out, stats });
  } catch (err) {
    console.error('[geo-econ] error:', err.message);
    await logJobRun('geo-econ', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
