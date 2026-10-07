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

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// level: critical = site or money breaks · important = a feature silently degrades · optional = nice to have
const ENV_CHECKS = [
  ['SUPABASE_URL',         'critical',  'Everything: database access'],
  ['SUPABASE_SERVICE_KEY', 'critical',  'Everything: database access'],
  ['ADMIN_EMAILS',         'critical',  'Admin login (nobody can open /en/admin without it)'],
  ['PAYPAL_CLIENT_ID',     'critical',  'Checkout'],
  ['PAYPAL_CLIENT_SECRET', 'critical',  'Checkout'],
  ['PAYPAL_MODE',          'critical',  'Checkout: must read "live" in production', true],
  ['RESEND_API_KEY',       'critical',  'Purchase receipts, lead alerts, "report is ready" emails'],
  ['PDF_RENDER_SECRET',    'critical',  'PDF rendering for every report'],
  ['CRON_SECRET',          'important', 'Locks the daily notification cron against outside callers'],
  ['ANTHROPIC_API_KEY',    'important', 'Search: files product searches under an industry; Studio'],
  ['APP_URL',              'important', 'Links inside emails (falls back to kiraresearch.com)'],
  ['TAVILY_API_KEY',       'optional',  'Company enrichment web search'],
  ['SERPER_API_KEY',       'optional',  'Search provider'],
  ['EXA_API_KEY',          'optional',  'Search provider'],
  ['FIRECRAWL_API_KEY',    'optional',  'Page scraping'],
  ['INNGEST_EVENT_KEY',    'optional',  'Background job queue']
];

const JOBS = [
  { key: 'notify-topic-published', label: 'Daily "your report is ready" emails', schedule: 'Daily 02:00 UTC (09:00 Vietnam)', max_gap_h: 30 }
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

    const [runs, failures, lastOk, lastPurchase] = await Promise.all([
      sb('job_runs?select=job,ok,detail,at&order=at.desc&limit=200').catch(() => []),
      sb('job_runs?select=job,detail,at&ok=eq.false&order=at.desc&limit=10').catch(() => []),
      sb('report_queue_events?select=at,stage&outcome=eq.ok&order=at.desc&limit=1').catch(() => []),
      sb('purchases?select=created_at&status=eq.completed&order=created_at.desc&limit=1').catch(() => [])
    ]);

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
    jobs.unshift({
      key: 'batch-runner', label: 'Report batch runner (cloud Routine)', schedule: '3 fires/day, one stage per fire',
      last_at: lastOk[0] ? lastOk[0].at : null, hours_since: runnerH, last_ok: true,
      detail: `${work_left} report(s) in the work queue` + (lastOk[0] ? `, last finished stage: ${lastOk[0].stage}` : ''),
      status: work_left === 0 ? 'idle' : (runnerH == null ? 'never_run' : runnerH > 30 ? 'late' : 'ok')
    });

    res.status(200).json({
      db, env, jobs, failures,
      info: { last_purchase_at: lastPurchase[0] ? lastPurchase[0].created_at : null }
    });
  } catch (err) {
    console.error('[admin-health] error:', err.message);
    res.status(200).json({ db: { ok: false, error: 'database unreachable' }, env: [], jobs: [], failures: [], info: {} });
  }
}
