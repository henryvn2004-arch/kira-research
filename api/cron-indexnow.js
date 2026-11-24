// ============================================================
// KIRA RESEARCH — api/cron-indexnow.js
// Daily Vercel cron (vercel.json). Pings IndexNow with the report, insight and transcript pages (all
// languages) whose translation was updated in the last 26 hours, plus the listing pages. Catches what
// the report Routine, the Experts routine and the insight runner publish, without touching them.
// Writes one job_runs row (job 'indexnow'). Without INDEXNOW_KEY it records "skipped" and does nothing.
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>` (Vercel cron does).
// ============================================================
import { logJobRun } from './_lib/jobs.js';
import { changedUrls, submitUrls, indexNowKey } from './_lib/indexnow.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const WINDOW_H = 26;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  const startedAt = Date.now();
  try {
    if (!indexNowKey()) {
      await logJobRun('indexnow', { ok: true, detail: 'skipped: INDEXNOW_KEY not set', startedAt });
      return res.status(200).json({ ok: true, skipped: 'no_key' });
    }
    const since = new Date(Date.now() - WINDOW_H * 36e5).toISOString();
    const urls = await changedUrls(sb, since);
    const out = urls.length ? await submitUrls(urls) : { ok: true, submitted: 0 };
    await logJobRun('indexnow', { ok: out.ok, detail: `urls ${urls.length}, submitted ${out.submitted || 0}${out.failed ? `, failed ${out.failed} (HTTP ${out.status})` : ''}`, startedAt });
    return res.status(200).json({ ...out, urls: urls.length });
  } catch (err) {
    console.error('[cron-indexnow]', err.message);
    await logJobRun('indexnow', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
