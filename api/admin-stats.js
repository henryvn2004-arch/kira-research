// ============================================================
// KIRA RESEARCH — api/admin-stats.js
// Admin landing-page aggregator. Returns counts + recent activity
// across leads / reports / insights / purchases in a single round-trip.
//
// Auth: same as other admin endpoints — Authorization: Bearer <jwt>
// verified against ADMIN_EMAILS whitelist.
//
//   GET /api/admin-stats → {
//     leads:       { total, by_status: { new, contacted, qualified, closed, rejected } },
//     reports:     { total, by_status: { draft, published } },
//     insights:    { total, by_status: { draft, published } },
//     purchases:   { count, revenue_usd },
//     waitlist:    { total, by_plan: { report, week, month, annual, not-sure }, by_status: {...} },
//     recent_leads:     [ { id, name, company, status, created_at }, ... up to 5 ],
//     recent_purchases: [ { id, slug, locale, amount, currency, created_at }, ... up to 5 ],
//     pipeline:    { state, by_status, work_left, completed_7d, last_batch_at, hours_since } | null
//   }
//
// Every section gracefully degrades to zero if its table isn't migrated
// yet — so the dashboard renders cleanly on a fresh DB.
// ============================================================

import { envProblems } from './_lib/env-checks.js';
import { getConfig } from './_lib/config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// ── Supabase helper with count support ──
// PostgREST: Prefer: count=exact + HEAD request gives total in Content-Range.
async function sb(path, { count = false, method = 'GET' } = {}) {
  const headers = {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json'
  };
  if (count) headers['Prefer'] = 'count=exact';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers });
  if (!res.ok) {
    // Don't throw — let caller fall back to zero. Logs the issue server-side.
    console.warn(`[admin-stats] sb ${path}: ${res.status} ${await res.text().catch(() => '')}`);
    return { rows: [], total: 0 };
  }
  const range = res.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1], 10) || 0;
  const rows  = method === 'HEAD' ? [] : await res.json().catch(() => []);
  return { rows, total };
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${m[1]}`
      }
    });
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

// ── Count tally helper — buckets rows by a field (e.g. 'status') ──
function tally(rows, field) {
  const out = {};
  for (const r of rows) {
    const k = r[field] || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// ── Report-pipeline health ──
// The queue lives in Postgres (report_queue + report_queue_events, migration 031);
// the runner logs one event per stage. Returns null if the tables are unreadable so
// the dashboard simply hides the card. Cached 60 s per warm instance.
const WORK_STATES = new Set(['pending', 'en_done', 'ja_done', 'ko_done', 'zh_backfill', 'en_in_progress', 'ja_in_progress', 'ko_in_progress', 'zh_in_progress']);
const IN_PROGRESS = new Set(['en_in_progress', 'ja_in_progress', 'ko_in_progress', 'zh_in_progress']);
// stuck / stalled thresholds come from owner settings (pipeline.stale_minutes, pipeline.stalled_hours)
let pipelineCache = { at: 0, value: null };

async function pipelineHealth() {
  if (Date.now() - pipelineCache.at < 60 * 1000) return pipelineCache.value;
  try {
    const STALE_MIN = await getConfig('pipeline.stale_minutes'), STALLED_H = await getConfig('pipeline.stalled_hours');
    const [rows, events] = await Promise.all([
      sb('report_queue?select=id,status,claimed_at&limit=10000'),
      sb('report_queue_events?select=outcome,to_status,stage,at&outcome=eq.ok&order=at.desc&limit=200')
    ]);
    const by_status = tally(rows.rows, 'status');
    const work_left = rows.rows.filter(r => WORK_STATES.has(r.status)).length;
    const cutoff = Date.now() - STALE_MIN * 60000;
    const stuck = rows.rows.filter(r => IN_PROGRESS.has(r.status) && (!r.claimed_at || Date.parse(r.claimed_at) < cutoff)).length;
    const last = events.rows[0] ? events.rows[0].at : null;
    const hours_since = last ? Math.round((Date.now() - new Date(last).getTime()) / 36e5) : null;
    const weekAgo = Date.now() - 7 * 864e5;
    const completed_7d = events.rows.filter(e => e.to_status === 'done' && e.stage !== 'zh_backfill' && new Date(e.at).getTime() > weekAgo).length;
    // idle = nothing to do (fine); stalled = work waiting but no stage finished for 30h+, or a claim is stuck
    const state = work_left === 0 ? 'idle' : (stuck || hours_since == null || hours_since > STALLED_H ? 'stalled' : 'running');
    pipelineCache = { at: Date.now(), value: { state, by_status, work_left, completed_7d, last_batch_at: last, hours_since, stuck, errors: by_status.error || 0 } };
  } catch (err) {
    console.warn('[admin-stats] pipeline health:', err.message);
    pipelineCache = { at: Date.now(), value: null };
  }
  return pipelineCache.value;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)                           { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)       { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    // Run all queries in parallel — they're independent and reduce wall-clock
    // for the dashboard load. Each gracefully degrades on table-missing errors.
    const [
      leadsAll,
      reportsAll,
      insightsAll,
      purchasesAll,
      recentLeads,
      recentPurchases,
      pipeline,
      waitlistAll,
      topicsProposed
    ] = await Promise.all([
      sb('leads?select=status&limit=10000'),
      sb('living_reports?select=status&limit=10000'),
      sb('insights?select=status&limit=10000'),
      sb('purchases?select=amount,currency,status&status=eq.completed&limit=10000'),
      sb('leads?select=id,name,company,status,created_at,locale&order=created_at.desc&limit=5'),
      sb('purchases?select=id,slug,locale,amount,currency,created_at,status&status=eq.completed&order=created_at.desc&limit=5'),
      pipelineHealth(),
      sb('waitlist?select=plan,status&limit=10000'),   // migration 025; zero until applied
      sb('topics?select=id&status=eq.proposed&limit=10000')   // waiting for the owner's decision
    ]);

    // "Needs you" list for the dashboard top: only things a human has to act on.
    const waitlistNew = waitlistAll.rows.filter(w => w.status === 'new').length;
    const leadsNewCount = leadsAll.rows.filter(l => l.status === 'new').length;
    const attention = [
      ...envProblems().map(p => ({ ...p, href: '/en/admin/health' })),
      pipeline && (pipeline.errors || pipeline.stuck || pipeline.state === 'stalled') && {
        key: 'pipeline', href: '/en/admin/pipeline', severity: 'high',
        label: pipeline.state === 'stalled' && !pipeline.errors && !pipeline.stuck
          ? 'Pipeline stalled: work is waiting but no stage has finished for over 30 hours'
          : `Pipeline: ${pipeline.errors} in error, ${pipeline.stuck} stuck claim(s)`,
        count: (pipeline.errors || 0) + (pipeline.stuck || 0) || 1
      },
      topicsProposed.rows.length && { key: 'topics', href: '/en/admin/topics', severity: 'normal', label: 'Topics waiting for your approval', count: topicsProposed.rows.length },
      leadsNewCount && { key: 'leads', href: '/en/admin/leads', severity: 'normal', label: 'New leads', count: leadsNewCount },
      waitlistNew && { key: 'waitlist', href: '/en/admin/waitlist', severity: 'normal', label: 'New waitlist sign-ups', count: waitlistNew }
    ].filter(Boolean);

    // Aggregate revenue (sum amount of completed purchases). All Year 1 prices
    // are USD so we report a single revenue_usd number; if currency mixing
    // ever happens this aggregate would need per-currency split.
    const revenue = purchasesAll.rows.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    res.status(200).json({
      attention,
      leads: {
        total: leadsAll.rows.length,
        by_status: tally(leadsAll.rows, 'status')
      },
      reports: {
        total: reportsAll.rows.length,
        by_status: tally(reportsAll.rows, 'status')
      },
      insights: {
        total: insightsAll.rows.length,
        by_status: tally(insightsAll.rows, 'status')
      },
      purchases: {
        count:        purchasesAll.rows.length,
        revenue_usd:  Math.round(revenue * 100) / 100   // 2dp
      },
      waitlist: {
        total:   waitlistAll.rows.length,
        by_plan: tally(waitlistAll.rows, 'plan'),
        by_status: tally(waitlistAll.rows, 'status')
      },
      recent_leads:     recentLeads.rows,
      recent_purchases: recentPurchases.rows,
      pipeline,
      // Pass through the caller's email so the page can render "signed in as X"
      // without an extra round-trip to /auth/v1/user.
      admin_email: user.email
    });
  } catch (err) {
    console.error('[admin-stats] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
