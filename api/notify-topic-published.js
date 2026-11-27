// ============================================================
// KIRA RESEARCH — api/notify-topic-published.js
// Daily Vercel cron (vercel.json). Emails everyone who asked to be told when a
// coming-soon topic got its report. Idempotent: a request is claimed
// (notified_at set) before sending and released again if the send fails.
//
// The caller must (CRON_SECRET is required; unset = always 401) send `Authorization: Bearer <secret>`
// (Vercel cron does this automatically). Without it the endpoint is still
// harmless — it only sends mail that is already due, once.
// ============================================================

import { sendTopicPublishedEmail } from './_lib/email.js';
import { logJobRun } from './_lib/jobs.js';
import { getConfig } from './_lib/config.js';
import { cronAuthorized } from './_lib/cron-auth.js';
import { optoutUrl } from './_lib/sequences.js';
import { optoutsFor } from './_lib/seq-data.js';
import { reasonLine, normLocale } from './_lib/email-i18n.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
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
  if (!cronAuthorized(req)) return res.status(401).json({ error: 'unauthorized' });

  const startedAt = Date.now();
  try {
    if (!(await getConfig('notify.report_ready_enabled'))) {
      await logJobRun('notify-topic-published', { ok: true, detail: 'paused in /en/admin/config; nobody was emailed', startedAt });
      return res.status(200).json({ ok: true, paused: true });
    }
    const due = await sb('rpc/due_topic_notifications', 'POST', { lim: 50 });
    // Sequence A, day 0: price + the reason for it + a direct buy link, only while single-report checkout is on.
    const saleOn = await getConfig('checkout.single_report_enabled');
    const info = new Map();
    if (due.length) {
      const slugs = [...new Set(due.map((d) => d.report_slug))].map((s) => `"${s}"`).join(',');
      for (const r of await sb(`living_reports?slug=in.(${encodeURIComponent(slugs)})&select=slug,price,pages,exhibits`).catch(() => [])) info.set(r.slug, r);
    }
    const optouts = await optoutsFor(due.map((d) => d.email)).catch(() => new Set());
    let sent = 0, failed = 0;
    for (const d of due) {
      // Claim first; if another run got it, the PATCH returns no row.
      const claimed = await sb(`topic_requests?id=eq.${d.request_id}&notified_at=is.null`, 'PATCH',
        { notified_at: new Date().toISOString() }, 'return=representation');
      if (!claimed || !claimed.length) continue;
      if (optouts.has(String(d.email).toLowerCase())) continue;       // opted out of our emails: claimed, not sent
      const loc = normLocale(d.locale), rep = info.get(d.report_slug);
      const ok = await sendTopicPublishedEmail({
        to: d.email, title: d.topic_title, url: `${APP_URL}/${loc}/reports/${d.report_slug}`, locale: loc,
        price: saleOn && rep ? rep.price : null, reason: rep ? reasonLine(loc, 'report', rep) : '', unsubUrl: optoutUrl(APP_URL, d.email)
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
