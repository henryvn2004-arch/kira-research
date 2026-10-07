// ============================================================
// KIRA RESEARCH — api/notify-topic-published.js
// Daily Vercel cron (vercel.json). Emails everyone who asked to be told when a
// coming-soon topic got its report. Idempotent: a request is claimed
// (notified_at set) before sending and released again if the send fails.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>`
// (Vercel cron does this automatically). Without it the endpoint is still
// harmless — it only sends mail that is already due, once.
// ============================================================

import { sendTopicPublishedEmail } from './_lib/email.js';
import { logJobRun } from './_lib/jobs.js';
import { getConfig } from './_lib/config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;
const APP_URL              = process.env.APP_URL || 'https://kiraresearch.com';

async function sb(path, method = 'GET', body, prefer) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });

  const startedAt = Date.now();
  try {
    if (!(await getConfig('notify.report_ready_enabled'))) {
      await logJobRun('notify-topic-published', { ok: true, detail: 'paused in /en/admin/config; nobody was emailed', startedAt });
      return res.status(200).json({ ok: true, paused: true });
    }
    const due = await sb('rpc/due_topic_notifications', 'POST', { lim: 50 });
    let sent = 0, failed = 0;
    for (const d of due) {
      // Claim first; if another run got it, the PATCH returns no row.
      const claimed = await sb(`topic_requests?id=eq.${d.request_id}&notified_at=is.null`, 'PATCH',
        { notified_at: new Date().toISOString() }, 'return=representation');
      if (!claimed || !claimed.length) continue;
      const ok = await sendTopicPublishedEmail({
        to: d.email, title: d.topic_title, url: `${APP_URL}/${d.locale}/reports/${d.report_slug}`
      });
      if (ok) sent++;
      else {
        failed++;
        await sb(`topic_requests?id=eq.${d.request_id}`, 'PATCH', { notified_at: null }).catch(() => {});
      }
    }
    await logJobRun('notify-topic-published', { ok: failed === 0, detail: `due ${due.length}, sent ${sent}, failed ${failed}`, startedAt });
    return res.status(200).json({ ok: true, due: due.length, sent, failed });
  } catch (err) {
    console.error('[notify-topic-published]', err.message);
    await logJobRun('notify-topic-published', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
