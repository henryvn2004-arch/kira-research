// ============================================================
// KIRA RESEARCH — api/cron-site-events-retention.js
// Daily Vercel cron (vercel.json). Deletes visitor events (site_events, migration 043)
// older than the owner's setting `retention.site_events_days` (default 180, /en/admin/config).
// Idempotent: running it twice deletes nothing the first run did not.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>`
// (Vercel cron does this automatically).
// ============================================================

import { logJobRun } from './_lib/jobs.js';
import { getConfig } from './_lib/config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });

  const startedAt = Date.now();
  try {
    const days = await getConfig('retention.site_events_days');
    const cutoff = new Date(Date.now() - days * 864e5).toISOString();
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_events?at=lt.${encodeURIComponent(cutoff)}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, Prefer: 'return=minimal,count=exact' }
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    const deleted = parseInt((r.headers.get('content-range') || '').split('/')[1], 10) || 0;
    await logJobRun('site-events-retention', { ok: true, detail: `kept ${days} days, deleted ${deleted}`, startedAt });
    return res.status(200).json({ ok: true, days, deleted });
  } catch (err) {
    console.error('[site-events-retention] error:', err.message);
    await logJobRun('site-events-retention', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
