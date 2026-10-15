// ============================================================
// KIRA RESEARCH — api/cron-moves-alerts.js
// Daily Vercel cron (vercel.json). Kira Data (D7): one email per confirmed "new moves" alert (moves_alerts,
// migration 063) listing the company moves published since its last email that match its market / investor,
// newest first, at most 10. An alert with nothing new is moved forward silently. A failed send leaves the
// alert where it was, so the next run tries again. Only moves from public sources are sent.
// Pausable in /en/admin/config (notify.moves_alerts_enabled): while off, nothing is sent and nothing is moved
// forward, so readers get the moves when it is switched back on. Logs job 'moves-alerts' for /en/admin/health.
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>` (Vercel cron does this).
// ============================================================

import { sendMovesDigest } from './_lib/email.js';
import { logJobRun } from './_lib/jobs.js';
import { getConfig } from './_lib/config.js';
import { alertLabel, alertPath } from './_lib/moves/alerts.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;
const APP_URL              = process.env.APP_URL || 'https://kiraresearch.com';
const PER_EMAIL = 10, MAX_EMAILS = 500;
const TYPE = { acquisition: 'Acquisition', stake: 'Stake', investment: 'Investment', plant: 'New plant', jv: 'Joint venture',
  subsidiary: 'New subsidiary or office', expansion: 'Expansion', exit: 'Exit', other: '' };

async function sb(path, method = 'GET', body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 || !(r.headers.get('content-type') || '').includes('json') ? null : r.json();
}
async function sbAll(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sb(`${path}&limit=1000&offset=${offset}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  const startedAt = Date.now();
  try {
    if (!(await getConfig('notify.moves_alerts_enabled'))) {
      await logJobRun('moves-alerts', { ok: true, detail: 'paused in /en/admin/config: nothing sent', startedAt });
      return res.status(200).json({ ok: true, paused: true });
    }
    const alerts = await sbAll('moves_alerts?status=eq.active&select=id,email,host_country,investor_country,locale,token,last_event_id&order=id.asc');
    const sources = (await sb('data_sources?public=eq.true&select=key')).map((s) => s.key);
    const from = alerts.reduce((m, a) => Math.min(m, a.last_event_id || 0), Infinity);
    const events = alerts.length ? await sbAll(`company_events?status=eq.published&id=gt.${Number.isFinite(from) ? from : 0}` +
      `&source_key=in.(${sources.join(',')})&select=id,url,title,event_date,host_country,investor_country,type&order=id.desc`) : [];
    const maxId = events.length ? events[0].id : null;

    let sent = 0, skipped = 0, failed = 0;
    for (const a of alerts) {
      if (maxId === null || (a.last_event_id || 0) >= maxId) continue;
      const mine = events.filter((e) => e.id > (a.last_event_id || 0) &&
        (!a.host_country || e.host_country === a.host_country) && (!a.investor_country || e.investor_country === a.investor_country));
      if (!mine.length) { await sb(`moves_alerts?id=eq.${a.id}`, 'PATCH', { last_event_id: maxId }); skipped++; continue; }
      if (sent >= MAX_EMAILS) break;
      const ok = await sendMovesDigest({
        to: a.email,
        label: alertLabel(a).replace(/^Company moves: /, ''),
        moves: mine.slice(0, PER_EMAIL).map((e) => ({ title: e.title, url: e.url, date: e.event_date, type: TYPE[e.type] || '' })),
        pageUrl: APP_URL + alertPath(a),
        unsubUrl: `${APP_URL}/api/moves-alert?t=${a.token}&a=unsub`
      });
      if (ok) { await sb(`moves_alerts?id=eq.${a.id}`, 'PATCH', { last_event_id: maxId, last_sent_at: new Date().toISOString() }); sent++; }
      else failed++;
    }
    const detail = `${alerts.length} active alerts: ${sent} emailed, ${skipped} with nothing new` + (failed ? `, ${failed} sends failed (retried tomorrow)` : '');
    await logJobRun('moves-alerts', { ok: failed === 0, detail, startedAt });
    return res.status(200).json({ ok: true, alerts: alerts.length, sent, skipped, failed });
  } catch (err) {
    console.error('[moves-alerts] error:', err.message);
    await logJobRun('moves-alerts', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
