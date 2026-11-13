// ============================================================
// KIRA RESEARCH — api/admin-queue.js
// Admin control of the report production queue (Supabase tables report_queue +
// report_queue_events, migration 031). The batch runner claims and advances rows
// with scripts/queue.mjs; this endpoint is how the owner steers them.
//
//   GET   /api/admin-queue                       → { rows, events, summary }
//   PATCH /api/admin-queue  body { id, action, to?, priority? } → { ok }
//   PATCH /api/admin-queue  body { action: 'set_price', service, usd_per_m_in, usd_per_m_out } → { ok }  (no id)
//         actions: hold · release · retry (to = pending|en_done|ja_done|ko_done|zh_backfill)
//                  · unstick (in_progress row → prior stage) · top (priority above everyone) · priority
//
// Every change is a compare-and-swap on the row's current status, so a click can never
// clobber a runner that claimed the row a second earlier.
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================
import { logAudit } from './_lib/audit.js';
import { getConfig } from './_lib/config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const WORK = ['pending', 'en_done', 'ja_done', 'ko_done', 'zh_backfill'];
const IN_PROGRESS = ['en_in_progress', 'ja_in_progress', 'ko_in_progress', 'zh_in_progress'];
const PRIOR = { en_in_progress: 'pending', ja_in_progress: 'en_done', ko_in_progress: 'ja_done', zh_in_progress: 'ko_done' };
const RETRY_TARGETS = new Set(WORK);
// stuck / stalled thresholds come from owner settings (pipeline.stale_minutes, pipeline.stalled_hours)

async function sb(path, method = 'GET', body, prefer) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: prefer || (method === 'GET' ? '' : 'return=representation')
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function summarize(rows, events, STALE_MIN, STALLED_H) {
  const by_status = {};
  for (const r of rows) by_status[r.status] = (by_status[r.status] || 0) + 1;
  const work_left = rows.filter(r => WORK.includes(r.status) || IN_PROGRESS.includes(r.status)).length;
  const cutoff = Date.now() - STALE_MIN * 60000;
  const stuck = rows.filter(r => IN_PROGRESS.includes(r.status) && (!r.claimed_at || Date.parse(r.claimed_at) < cutoff)).map(r => r.id);
  const lastOk = events.find(e => e.outcome === 'ok');
  const hours_since = lastOk ? Math.round((Date.now() - Date.parse(lastOk.at)) / 36e5) : null;
  const weekAgo = Date.now() - 7 * 864e5;
  const completed_7d = events.filter(e => e.outcome === 'ok' && e.to_status === 'done' && e.stage !== 'zh_backfill' && Date.parse(e.at) > weekAgo).length;
  const state = work_left === 0 ? 'idle' : (stuck.length || hours_since == null || hours_since > STALLED_H ? 'stalled' : 'running');
  // stage timing: average wall-clock of successful stage runs (last 200 events)
  const timing = {};
  for (const e of events) {
    if (e.outcome !== 'ok' || e.duration_s == null) continue;
    const t = (timing[e.stage] = timing[e.stage] || { n: 0, total: 0, cost: 0 });
    t.n++; t.total += e.duration_s; t.cost += Number(e.cost_usd || 0);
  }
  for (const k of Object.keys(timing)) timing[k] = { runs: timing[k].n, avg_min: Math.round(timing[k].total / timing[k].n / 60), metered_usd: Math.round(timing[k].cost * 100) / 100 };
  return { state, by_status, work_left, stuck, hours_since, completed_7d, errors: by_status.error || 0, timing };
}

// Metered external-API spend. Tokens are facts logged by the runner; dollars exist only once the
// owner has entered a price for that service (so history re-prices when the price changes).
function summarizeCosts(usageRows, prices) {
  const by = {};
  for (const r of usageRows) {
    const u = r.usage || {};
    const svc = (by[u.service || 'unknown'] = by[u.service || 'unknown'] || { service: u.service || 'unknown', calls: 0, input_tokens: 0, output_tokens: 0, reports: new Set() });
    svc.calls++; svc.input_tokens += Number(u.input_tokens || 0); svc.output_tokens += Number(u.output_tokens || 0); svc.reports.add(r.queue_id);
  }
  const services = Object.values(by).map(v => {
    const p = prices.find(x => x.service === v.service);
    const priced = p && p.usd_per_m_in != null && p.usd_per_m_out != null;
    const usd = priced ? (v.input_tokens * Number(p.usd_per_m_in) + v.output_tokens * Number(p.usd_per_m_out)) / 1e6 : null;
    return { service: v.service, calls: v.calls, reports: v.reports.size, input_tokens: v.input_tokens, output_tokens: v.output_tokens,
      price: p ? { usd_per_m_in: p.usd_per_m_in, usd_per_m_out: p.usd_per_m_out } : null,
      usd: usd == null ? null : Math.round(usd * 10000) / 10000,
      usd_per_report: usd == null || !v.reports.size ? null : Math.round(usd / v.reports.size * 10000) / 10000 };
  });
  return { services, known_services: ['openai-image'] };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    if (req.method === 'GET') {
      const [rows, events, usageRows, prices] = await Promise.all([
        sb('report_queue?select=id,topic,country,industry,year,target_languages,status,error_log,claimed_at,priority,attempts,position,date_added,date_completed,updated_at&order=priority.desc,position.asc&limit=1000'),
        sb('report_queue_events?select=id,queue_id,stage,outcome,from_status,to_status,model,duration_s,cost_usd,note,at&order=at.desc&limit=200'),
        sb('report_queue_events?select=queue_id,usage&outcome=eq.usage&limit=5000').catch(() => []),
        sb('service_prices?select=service,usd_per_m_in,usd_per_m_out').catch(() => [])
      ]);
      res.status(200).json({ rows, events: events.slice(0, 60), summary: summarize(rows, events, await getConfig('pipeline.stale_minutes'), await getConfig('pipeline.stalled_hours')), costs: summarizeCosts(usageRows, prices) });
      return;
    }

    if (req.method !== 'PATCH') { res.status(405).json({ error: 'method_not_allowed' }); return; }

    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }
    const { id, action } = body;

    if (action === 'set_price') {
      const svc = String(body.service || '');
      const pin = Number(body.usd_per_m_in), pout = Number(body.usd_per_m_out);
      if (!/^[a-z0-9-]{2,40}$/.test(svc) || !(pin >= 0) || !(pout >= 0) || pin > 100000 || pout > 100000) { res.status(400).json({ error: 'bad_price' }); return; }
      await sb('service_prices?on_conflict=service', 'POST', { service: svc, usd_per_m_in: pin, usd_per_m_out: pout, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal');
      logAudit({ actor: user.email, action: 'update', resourceType: 'service_price', resourceId: svc, resourceLabel: `in ${pin} / out ${pout} USD per 1M tokens`, req });
      res.status(200).json({ ok: true });
      return;
    }
    if (!id || !action) { res.status(400).json({ error: 'id_and_action_required' }); return; }

    const [row] = await sb(`report_queue?id=eq.${encodeURIComponent(id)}&select=*`);
    if (!row) { res.status(404).json({ error: 'not_found' }); return; }

    let patch, to;
    if (action === 'hold') {
      if (!WORK.includes(row.status)) { res.status(409).json({ error: 'only_waiting_rows_can_be_held' }); return; }
      to = 'hold'; patch = { status: 'hold' };
    } else if (action === 'release') {
      if (row.status !== 'hold') { res.status(409).json({ error: 'not_on_hold' }); return; }
      to = 'pending'; patch = { status: 'pending' };
    } else if (action === 'retry') {
      if (row.status !== 'error') { res.status(409).json({ error: 'only_error_rows_can_be_retried' }); return; }
      if (!RETRY_TARGETS.has(body.to)) { res.status(400).json({ error: 'bad_target_stage' }); return; }
      to = body.to; patch = { status: to, error_log: `${row.error_log ? row.error_log + ' · ' : ''}retried from admin ${new Date().toISOString().slice(0, 10)}`, claimed_at: null };
    } else if (action === 'unstick') {
      if (!IN_PROGRESS.includes(row.status)) { res.status(409).json({ error: 'not_in_progress' }); return; }
      to = row.status === 'zh_in_progress' && /\bzh-backfill\b/.test(row.error_log || '') ? 'zh_backfill' : PRIOR[row.status];
      patch = { status: to, claimed_at: null, error_log: `${row.error_log ? row.error_log + ' · ' : ''}unstuck from admin ${new Date().toISOString().slice(0, 10)}` };
    } else if (action === 'top') {
      const [m] = await sb('report_queue?select=priority&order=priority.desc&limit=1');
      to = row.status; patch = { priority: (m ? m.priority : 0) + 1 };
    } else if (action === 'priority') {
      const p = parseInt(body.priority, 10);
      if (!Number.isFinite(p) || p < 0 || p > 100000) { res.status(400).json({ error: 'bad_priority' }); return; }
      to = row.status; patch = { priority: p };
    } else { res.status(400).json({ error: 'unknown_action' }); return; }

    patch.updated_at = new Date().toISOString();
    const upd = await sb(`report_queue?id=eq.${encodeURIComponent(id)}&status=eq.${row.status}`, 'PATCH', patch);
    if (!upd.length) { res.status(409).json({ error: 'row_changed_meanwhile' }); return; }

    await sb('report_queue_events', 'POST', { queue_id: id, stage: 'admin', outcome: 'admin', from_status: row.status, to_status: to, note: `${action} by ${user.email}` }).catch(() => {});
    logAudit({ actor: user.email, action: 'update', resourceType: 'queue', resourceId: id, resourceLabel: `${action}: ${row.status} → ${to}`, req });
    res.status(200).json({ ok: true, row: upd[0] });
  } catch (err) {
    console.error('[admin-queue] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
