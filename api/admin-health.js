// ============================================================
// KIRA RESEARCH — api/admin-health.js
// One-screen answer to "is the machine running?": database reachability,
// which environment variables the site has (presence only, never values),
// and the last run of every scheduled job.
//
//   GET /api/admin-health → { db, env, jobs, failures }
//
// The batch runner's own environment (OPENAI_API_KEY, brain checkout...) lives in the
// Routine, not in Vercel, so it cannot be checked from here; its health is judged by
// whether stages keep finishing (report_queue_events).
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================

import { ENV_CHECKS } from './_lib/env-checks.js';
import { getConfig } from './_lib/config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const JOBS = [
  { key: 'notify-topic-published', label: 'Daily "your report is ready" emails', schedule: 'Daily 02:00 UTC (09:00 Vietnam)', max_gap_h: 30 },
  { key: 'notify-chain-published', label: 'Daily "your value chain is ready" emails', schedule: 'Daily 02:30 UTC (09:30 Vietnam)', max_gap_h: 30 },
  { key: 'site-events-retention', label: 'Daily cleanup of old visitor events', schedule: 'Daily 03:30 UTC', max_gap_h: 30 },
  { key: 'econ-refresh', label: 'Weekly economic data refresh (World Bank, IMF, national statistics)', schedule: 'Mondays 04:10 UTC', max_gap_h: 192 },
  { key: 'econ-refresh-estat', label: 'Weekly Japan customs trade refresh (e-Stat; waits for ESTAT_APP_ID)', schedule: 'Tuesdays 04:10 UTC', max_gap_h: 192 },
  { key: 'econ-refresh-kr_customs', label: 'Weekly Korea customs trade refresh (waits for DATA_GO_KR_KEY)', schedule: 'Wednesdays 04:10 UTC', max_gap_h: 192 },
  { key: 'econ-refresh-eurostat_comext', label: 'Weekly EU trade by product refresh (Eurostat Comext)', schedule: 'Thursdays 04:10 UTC', max_gap_h: 192 },
  { key: 'econ-refresh-us_census', label: 'Weekly US trade by product refresh (waits for CENSUS_API_KEY)', schedule: 'Fridays 04:10 UTC', max_gap_h: 192 },
  { key: 'topic-planner', label: 'Weekly topic planner (new topics for 15 countries)', schedule: 'Mondays 01:00 UTC (08:00 Vietnam)', max_gap_h: 192 }
];

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function verifyBearer(req) {
  const m = (req.headers['authorization'] || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${m[1]}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? { id: u.id, email: u.email.toLowerCase() } : null;
  } catch (_) { return null; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const hoursSince = (iso) => (iso ? Math.round((Date.now() - Date.parse(iso)) / 36e5) : null);

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    const t0 = Date.now();
    const queue = await sb('report_queue?select=status&limit=10000');
    const db = { ok: true, latency_ms: Date.now() - t0 };

    const env = ENV_CHECKS.map(([name, level, needed_for, showValue]) => ({
      name, level, needed_for,
      set: !!process.env[name],
      value: showValue && process.env[name] ? process.env[name] : undefined
    }));

    const since30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const [runs, failures, lastOk, lastPurchase, mailEvents, mailSuppressed, latePromises, subRows] = await Promise.all([
      sb('job_runs?select=job,ok,detail,at&order=at.desc&limit=200').catch(() => []),
      sb('job_runs?select=job,detail,at&ok=eq.false&order=at.desc&limit=10').catch(() => []),
      sb('report_queue_events?select=at,stage&outcome=eq.ok&order=at.desc&limit=1').catch(() => []),
      sb('purchases?select=created_at&status=eq.completed&order=created_at.desc&limit=1').catch(() => []),
      sb(`email_events?select=type&at=gte.${since30}&limit=10000`).catch(() => null),
      sb('email_suppressions?select=email&limit=10000').catch(() => null),
      // S18: requested reports not published by the date we promised the first reader.
      sb(`topics?select=slug,title,promise_at&promise_at=lt.${encodeURIComponent(new Date().toISOString())}&report_id=is.null&status=neq.rejected&order=promise_at.asc&limit=50`).catch(() => null),
      // S7: Month and Annual subscriptions (migration 052). null = table not there yet.
      sb('subscriptions?select=plan,status,created_at,current_period_end,cancel_requested_at&order=created_at.desc&limit=5000').catch(() => null)
    ]);

    // Subscribers now, subscriptions that renew, ones cancelled but still inside the paid period, and pending ones
    // older than an hour (the reader approved at PayPal but never came back, or PayPal has not confirmed).
    const nowMs = Date.now();
    const subscriptions = subRows === null ? null : {
      active: subRows.filter(r => r.status === 'active' && !r.cancel_requested_at).length,
      active_year: subRows.filter(r => r.status === 'active' && !r.cancel_requested_at && r.plan === 'year').length,
      cancelling: subRows.filter(r => (r.status === 'cancelled' || r.cancel_requested_at) && r.current_period_end && new Date(r.current_period_end).getTime() > nowMs).length,
      suspended: subRows.filter(r => r.status === 'suspended').length,
      stuck_pending: subRows.filter(r => r.status === 'pending' && nowMs - new Date(r.created_at).getTime() > 3600000 && nowMs - new Date(r.created_at).getTime() < 86400000).length
    };

    // Email deliverability (S16): Resend webhook events of the last 30 days. null = table or webhook not set up yet.
    const tally = t => (mailEvents || []).filter(e => e.type === t).length;
    const email = mailEvents === null ? null : {
      delivered: tally('delivered'), bounced: tally('bounced'), complained: tally('complained'),
      delayed: tally('delivery_delayed'), suppressed: mailSuppressed ? mailSuppressed.length : 0,
      webhook_secret_set: !!process.env.RESEND_WEBHOOK_SECRET
    };

    const jobs = JOBS.map(j => {
      const last = runs.find(r => r.job === j.key);
      const h = last ? hoursSince(last.at) : null;
      const status = !last ? 'never_run' : !last.ok ? 'failed' : h > j.max_gap_h ? 'late' : 'ok';
      return { ...j, last_at: last ? last.at : null, hours_since: h, last_ok: last ? last.ok : null, detail: last ? last.detail : null, status };
    });

    // Batch runner: judged by finished stages, not by a heartbeat (see header comment).
    const WORK = new Set(['pending', 'en_done', 'ja_done', 'ko_done', 'zh_backfill', 'en_in_progress', 'ja_in_progress', 'ko_in_progress', 'zh_in_progress']);
    const work_left = queue.filter(r => WORK.has(r.status)).length;
    const runnerH = lastOk[0] ? hoursSince(lastOk[0].at) : null;
    const STALLED_H = await getConfig('pipeline.stalled_hours');
    jobs.unshift({
      key: 'batch-runner', label: 'Report batch runner (cloud Routine)', schedule: '3 fires/day, one stage per fire',
      last_at: lastOk[0] ? lastOk[0].at : null, hours_since: runnerH, last_ok: true,
      detail: `${work_left} report(s) in the work queue` + (lastOk[0] ? `, last finished stage: ${lastOk[0].stage}` : ''),
      status: work_left === 0 ? 'idle' : (runnerH == null ? 'never_run' : runnerH > STALLED_H ? 'late' : 'ok')
    });

    res.status(200).json({
      db, env, jobs, failures,
      info: {
        last_purchase_at: lastPurchase[0] ? lastPurchase[0].created_at : null, email,
        late_promises: latePromises === null ? null : { count: latePromises.length, items: latePromises.slice(0, 5) },
        subscriptions
      }
    });
  } catch (err) {
    console.error('[admin-health] error:', err.message);
    res.status(200).json({ db: { ok: false, error: 'database unreachable' }, env: [], jobs: [], failures: [], info: {} });
  }
}
