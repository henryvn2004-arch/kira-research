// ============================================================
// KIRA RESEARCH — api/_lib/topic-demand.js
// What happens to a topic when a reader leaves an email for it (S18, on-demand reports).
// Shared by api/topic-request.js (the form) and skills/kira-research-report/scripts/interpret-searches.mjs
// (emails left on a search that the Routine files later), so both do exactly the same.
// ============================================================

import { getConfig } from './config.js';

const SUPABASE_URL         = (process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL);
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY);
const H = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };

async function patch(path, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

async function count(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
  return m ? Number(m[1]) : 0;
}

// A topic a reader made up from a search ('requested') or a planner proposal nobody approved yet ('proposed')
// is approved the moment someone leaves an email for it, so it can be produced within the promised time
// (queue.mjs sync-topics then queues it ahead of everything else). Capped per 24 h by the owner setting
// ondemand.auto_approve_per_day because every approved topic costs one full report.
const AUTO_NOTE = 'auto-approved: a reader asked for it';
export async function autoApprove(topic) {
  try {
    if (topic.status !== 'requested' && topic.status !== 'proposed') return;
    const cap = await getConfig('ondemand.auto_approve_per_day');
    if (cap <= 0) return;
    const since = new Date(Date.now() - 864e5).toISOString();
    if (await count(`topics?note=ilike.${encodeURIComponent('*auto-approved*')}&decided_at=gte.${since}&select=id`) >= cap) return;
    await patch(`topics?id=eq.${topic.id}&status=in.(requested,proposed)`, {
      status: 'approved', decided_at: new Date().toISOString(), note: topic.note ? `${topic.note} · ${AUTO_NOTE}` : AUTO_NOTE
    });
  } catch (err) { console.error('[topic-demand] auto-approve failed:', err.message); }
}

// First email request on a topic: record the date we promised, once (the health page flags topics past it).
export async function recordPromise(topic, eta) {
  try {
    if (!eta || topic.promise_at || topic.report_id) return;
    await patch(`topics?id=eq.${topic.id}&promise_at=is.null`, { promise_at: `${eta.date}T23:59:59Z` });
  } catch (err) { console.error('[topic-demand] promise not recorded:', err.message); }
}
