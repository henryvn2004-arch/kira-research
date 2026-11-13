// ============================================================
// KIRA RESEARCH — api/cron-pipeline-watch.js
// Vercel cron every 6 hours (vercel.json). Looks at the DATA, from the outside, to see whether the
// content pipelines (claude.ai Routines) are still producing. A Routine that exits early (for example
// because an environment variable was renamed) logs nothing, so it cannot report its own silence.
//
//   reports  : newest report_queue_events row, not counting owner actions (stage 'admin')
//   experts  : newest expert_transcripts.created_at
//   insights : newest insights.created_at with category 'commentary'
//
// Each run writes one job_runs row (job 'pipeline-watch'; ok = false when a stream is idle, so
// /en/admin/health shows it red). An idle stream is emailed to ADMIN_EMAILS at most once per 24 h:
// the streams already emailed are recorded in the row's detail ("emailed: reports,experts").
// Limits and the on/off switch are owner settings (/en/admin/config).
//
// If CRON_SECRET is set, the caller must send `Authorization: Bearer <secret>` (Vercel cron does).
// ============================================================

import { logJobRun } from './_lib/jobs.js';
import { getConfig } from './_lib/config.js';
import { sendPipelineWatchAlert } from './_lib/email.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CRON_SECRET          = process.env.CRON_SECRET;

const EMAIL_EVERY_H = 24;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (CRON_SECRET && req.headers['authorization'] !== `Bearer ${CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });

  const startedAt = Date.now();
  try {
    const [rLim, eLim, iLim, emailOn] = await Promise.all([
      getConfig('watch.reports_idle_hours'), getConfig('watch.experts_idle_hours'),
      getConfig('watch.insights_idle_hours'), getConfig('notify.pipeline_watch_enabled')
    ]);
    const [rep, exp, ins, prev] = await Promise.all([
      sb('report_queue_events?select=at&stage=neq.admin&order=at.desc&limit=1'),
      sb('expert_transcripts?select=created_at&order=created_at.desc&limit=1'),
      sb('insights?select=created_at&category=eq.commentary&order=created_at.desc&limit=1'),
      sb(`job_runs?select=detail,at&job=eq.pipeline-watch&at=gte.${encodeURIComponent(new Date(Date.now() - EMAIL_EVERY_H * 36e5).toISOString())}&order=at.desc&limit=10`)
    ]);

    const streams = [
      { key: 'reports',  label: 'Report generator',  last: rep[0] && rep[0].at,         limit: rLim },
      { key: 'experts',  label: 'Kira Experts',      last: exp[0] && exp[0].created_at, limit: eLim },
      { key: 'insights', label: 'Insights',          last: ins[0] && ins[0].created_at, limit: iLim }
    ].map(s => ({ ...s, hours: s.last ? Math.round((Date.now() - new Date(s.last).getTime()) / 36e5) : null }));
    // never any row at all counts as idle too
    const idle = streams.filter(s => s.hours == null || s.hours > s.limit);

    // streams already emailed in the last 24 h
    const alreadyEmailed = new Set();
    for (const row of prev) {
      const m = String(row.detail || '').match(/emailed: ([a-z,]+)/);
      if (m) m[1].split(',').forEach(k => alreadyEmailed.add(k));
    }
    const toEmail = idle.filter(s => !alreadyEmailed.has(s.key));
    let sent = false;
    if (toEmail.length && emailOn) {
      sent = await sendPipelineWatchAlert({
        idle: toEmail.map(s => ({ label: s.label, last_at: s.last || null, hours: s.hours, limit: s.limit }))
      });
    }

    // keep earlier marks alive for streams still idle, so the 24 h clock does not restart
    const marked = new Set([...alreadyEmailed].filter(k => idle.some(s => s.key === k)));
    if (sent) toEmail.forEach(s => marked.add(s.key));

    const detail = idle.length
      ? 'idle: ' + idle.map(s => `${s.key} ${s.hours == null ? 'never' : s.hours + 'h'} (limit ${s.limit}h)`).join('; ') +
        (marked.size ? ` | emailed: ${[...marked].join(',')}` : '')
      : 'all streams active: ' + streams.map(s => `${s.key} ${s.hours}h`).join(', ');
    await logJobRun('pipeline-watch', { ok: idle.length === 0, detail, startedAt });
    return res.status(200).json({ ok: idle.length === 0, idle: idle.map(s => s.key), emailed: sent ? toEmail.map(s => s.key) : [] });
  } catch (err) {
    console.error('[pipeline-watch] error:', err.message);
    await logJobRun('pipeline-watch', { ok: false, detail: err.message, startedAt });
    return res.status(500).json({ error: 'server_error' });
  }
}
