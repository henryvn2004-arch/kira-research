// ============================================================
// KIRA RESEARCH — api/_lib/eta.js
// "Ready by" date for a coming-soon report.
//   days = max(ondemand.target_days, ceil((reports ahead + 1) / ondemand.reports_per_day))
// "Ahead" = requested topics that asked earlier and are not published, plus planner reports in production
// (SQL function topic_queue_ahead, migration 049). With nobody ahead this is simply the target (3 days);
// when many readers ask at once the date moves out by itself, so the page never promises more than the
// runner can make. The owner raises ondemand.reports_per_day when runner fires are added.
// ============================================================

import { getConfig } from './config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// → { days, date: 'YYYY-MM-DD' (UTC), ahead } or null when the numbers can not be read.
export async function topicEta(topicId) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/topic_queue_ahead`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_topic: topicId })
    });
    if (!r.ok) return null;
    const ahead = Number(await r.json());
    if (!Number.isFinite(ahead)) return null;
    const target = await getConfig('ondemand.target_days');
    const perDay = Math.max(1, await getConfig('ondemand.reports_per_day'));
    const days = Math.max(target, Math.ceil((ahead + 1) / perDay));
    return { days, date: new Date(Date.now() + days * 864e5).toISOString().slice(0, 10), ahead };
  } catch (_e) { return null; }
}

export const formatEtaEn = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
