// ============================================================
// KIRA RESEARCH — api/studio-jobs.js
// Studio job submission + status polling.
//
//   POST /api/studio-jobs
//   Authorization: Bearer <supabase-jwt>
//   Body: { topic_input, uploaded_file_paths?, flags? }
//   → 202 { job_id, status: 'pending' }
//     ↳ fires `studio/job.created` event to Inngest cloud, which then
//       webhooks back into /api/inngest to execute the workflow.
//       See api/_lib/studio-workflow.js for the orchestration.
//
//   GET  /api/studio-jobs?id=<uuid>
//   Authorization: Bearer <supabase-jwt>
//   → { id, status, progress, current_stage, error_log?, studio_report_id? }
//
//   GET  /api/studio-jobs  (no id)
//   → { jobs: [last 50] }   — user's own jobs only
//
// PHASE N.22 — INNGEST MIGRATION
// ------------------------------
// Previously we used Vercel's @vercel/functions `waitUntil()` to keep
// this handler alive after returning 202, then ran the multi-stage
// worker inline. That broke under load because Vercel's `waitUntil`
// background context proved unreliable for sequential outbound
// Anthropic API calls — calls hung indefinitely with no working
// timeout/abort mechanism (see N.16-N.21 commit history).
//
// New model: this endpoint just publishes an event. Inngest cloud
// fans the work out into many short-lived independent invocations,
// each with its own platform-level retry/timeout budget. The webhook
// endpoint lives at /api/inngest.
// ============================================================

import { inngest } from './_lib/inngest-client.js';
import {
  sb, verifyBearer, cors, updateJobProgress, logActivity
} from './_lib/studio-shared.js';
import {
  REPORT_COST, getBalance, holdCredits, refundCredits
} from './_lib/credits.js';

// Per-route override no longer needed for the long worker lifetime —
// Inngest carries that load. We keep a small bump only because the
// initial `inngest.send()` could be slow under cold-start network
// jitter; default 60s is plenty but 30s is the documented Inngest
// publish ceiling so we leave headroom.
export const config = {
  maxDuration: 60
};

// ── input validation ───────────────────────────────────────────
const MAX_TOPIC_LEN  = 600;
const MAX_FILES      = 10;
const MIN_FILES      = 1;

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'invalid_body';
  const topic = String(body.topic_input || '').trim();
  if (!topic) return 'topic_required';
  if (topic.length > MAX_TOPIC_LEN) return 'topic_too_long';

  // Phase N.20: file upload is now REQUIRED. Studio drafts the
  // report from user-curated sources only — autonomous web_search
  // has been removed.
  if (!Array.isArray(body.uploaded_file_paths) || body.uploaded_file_paths.length < MIN_FILES) {
    return 'files_required';
  }
  if (body.uploaded_file_paths.length > MAX_FILES) return 'too_many_files';
  for (const p of body.uploaded_file_paths) {
    if (typeof p !== 'string' || !p) return 'invalid_file_path';
    // Defense-in-depth: enforce <user_id>/<...> shape so a logged-in
    // user can't reference another user's uploaded files.
    if (p.includes('..') || p.startsWith('/')) return 'invalid_file_path';
  }
  if (body.flags !== undefined && (typeof body.flags !== 'object' || Array.isArray(body.flags))) {
    return 'invalid_flags';
  }
  return null;
}

function ownsAllPaths(paths, userId) {
  return paths.every(p => p.startsWith(`${userId}/`));
}

export default async function handler(req, res) {
  cors(res, 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // ── Auth ────────────────────────────────────────────────────
  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const id  = url.searchParams.get('id');

  try {
    // ══════════════════════════════════════════════════════════
    //  GET — list user's jobs OR single job
    // ══════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      if (id) {
        const rows = await sb(
          `studio_jobs?id=eq.${id}&user_id=eq.${user.id}` +
          `&select=id,topic_input,status,progress,current_stage,` +
          `stages_completed,error_code,error_log,studio_report_id,` +
          `activity_log,created_at,started_at,completed_at&limit=1`
        );
        const job = Array.isArray(rows) ? rows[0] : null;
        if (!job) { res.status(404).json({ error: 'not_found' }); return; }
        res.status(200).json({ job });
        return;
      }
      // List
      const rows = await sb(
        `studio_jobs?user_id=eq.${user.id}` +
        `&order=created_at.desc&limit=50` +
        `&select=id,topic_input,status,progress,current_stage,studio_report_id,created_at,completed_at`
      );
      res.status(200).json({ jobs: rows || [] });
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  POST — create + kick off worker
    // ══════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      let body = {};
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      } catch {
        res.status(400).json({ error: 'invalid_json' });
        return;
      }
      const err = validatePayload(body);
      if (err) { res.status(400).json({ error: err }); return; }

      const filePaths = Array.isArray(body.uploaded_file_paths) ? body.uploaded_file_paths : [];
      if (filePaths.length && !ownsAllPaths(filePaths, user.id)) {
        res.status(403).json({ error: 'file_path_not_owned' });
        return;
      }

      // ── Phase O.5: credit pre-flight ─────────────────────
      // Cheap balance read first so we can return 402 instantly without
      // creating a job row + PayPal-style "you need to top up" UX. The
      // atomic hold below is the real guard against concurrent submits.
      const balance = await getBalance(user.id);
      if (balance < REPORT_COST) {
        res.status(402).json({
          error:       'insufficient_credits',
          balance,
          report_cost: REPORT_COST,
          short_by:    REPORT_COST - balance,
          buy_url:     '/billing'
        });
        return;
      }

      // Insert job row.
      const inserted = await sb('studio_jobs', 'POST', {
        user_id:             user.id,
        topic_input:         body.topic_input.trim(),
        uploaded_file_paths: filePaths,
        flags:               body.flags || {},
        status:              'pending',
        progress:            0,
        current_stage:       'Queued — waiting for worker'
      });
      const job = Array.isArray(inserted) ? inserted[0] : inserted;
      if (!job || !job.id) {
        res.status(500).json({ error: 'job_create_failed' });
        return;
      }

      // ── Phase O.5: atomic credit hold ────────────────────
      // Race-safe deduction — `credit_debit()` rejects when balance <
      // REPORT_COST so two concurrent submits with balance=150 can't
      // both succeed. If this fails AFTER the job row was inserted,
      // we soft-archive the orphan job to keep the user's library
      // clean.
      const hold = await holdCredits(user.id, REPORT_COST, job.id);
      if (!hold.ok) {
        // Archive the orphan job (status='cancelled' is the only
        // schema-allowed "don't show this" state).
        await updateJobProgress(job.id, {
          status:       'cancelled',
          error_code:   hold.reason,
          error_log:    'Credit hold failed: ' + hold.reason,
          completed_at: new Date().toISOString()
        }).catch(() => {});
        if (hold.reason === 'insufficient_credits') {
          // Race: balance dropped between pre-flight read and hold.
          res.status(402).json({
            error:       'insufficient_credits',
            balance:     await getBalance(user.id),
            report_cost: REPORT_COST,
            buy_url:     '/billing'
          });
        } else {
          res.status(500).json({ error: 'hold_failed', detail: hold.reason });
        }
        return;
      }

      // Publish event → Inngest cloud will webhook /api/inngest to
      // run the workflow. The workflow itself updates job status,
      // progress, activity_log, etc. — this handler just hands off
      // and returns 202 immediately.
      try {
        await inngest.send({
          name: 'studio/job.created',
          data: { jobId: job.id, userId: user.id }
        });
      } catch (sendErr) {
        // If event dispatch fails, the job is stuck in 'pending'.
        // Mark it failed inline so the user sees an error instead of
        // a hung progress bar. ALSO refund the hold we just placed
        // (the worker never picked the job up, so workflow onFailure
        // won't fire to refund).
        const errMsg = String(sendErr && sendErr.message || sendErr).slice(0, 4000);
        console.error('[studio-jobs] inngest.send failed:', sendErr);
        await updateJobProgress(job.id, {
          status:        'failed',
          error_code:    'dispatch_failed',
          error_log:     errMsg,
          completed_at:  new Date().toISOString()
        }).catch(() => {});
        await logActivity(job.id, {
          ts:     new Date().toISOString(),
          type:   'error',
          stage:  'parse',
          msg:    'Could not dispatch the job to the worker queue',
          detail: { error: errMsg.slice(0, 600) }
        }).catch(() => {});
        await refundCredits(user.id, REPORT_COST, job.id, 'studio_refund').catch(() => {});
        res.status(500).json({ error: 'dispatch_failed', job_id: job.id });
        return;
      }

      res.status(202).json({
        job_id:  job.id,
        status:  'pending',
        balance: hold.newBalance
      });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[studio-jobs] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
