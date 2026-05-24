// ============================================================
// KIRA RESEARCH — api/studio-jobs.js
// Studio job submission + status polling.
//
//   POST /api/studio-jobs
//   Authorization: Bearer <supabase-jwt>
//   Body: { topic_input, uploaded_file_paths?, flags? }
//   → 202 { job_id, status: 'pending' }
//     ↳ kicks off background processing via @vercel/functions waitUntil
//
//   GET  /api/studio-jobs?id=<uuid>
//   Authorization: Bearer <supabase-jwt>
//   → { id, status, progress, current_stage, error_log?, studio_report_id? }
//
//   GET  /api/studio-jobs  (no id)
//   → { jobs: [last 50] }   — user's own jobs only
//
// Worker timeout: 800s (configured per-route in vercel.json). If the
// full gen overruns, the job is marked failed with error_code='timeout'
// from inside the worker (best-effort) — caller should treat any job
// stuck in 'running' for > 15min as effectively failed.
// ============================================================

import { waitUntil } from '@vercel/functions';
import {
  sb, verifyBearer, cors, updateJobProgress
} from './_lib/studio-shared.js';
import { processStudioJob } from './_lib/studio-worker.js';

// ── input validation ───────────────────────────────────────────
const MAX_TOPIC_LEN  = 600;
const MAX_FILES      = 5;

function validatePayload(body) {
  if (!body || typeof body !== 'object') return 'invalid_body';
  const topic = String(body.topic_input || '').trim();
  if (!topic) return 'topic_required';
  if (topic.length > MAX_TOPIC_LEN) return 'topic_too_long';

  if (body.uploaded_file_paths !== undefined) {
    if (!Array.isArray(body.uploaded_file_paths)) return 'invalid_uploaded_file_paths';
    if (body.uploaded_file_paths.length > MAX_FILES) return 'too_many_files';
    for (const p of body.uploaded_file_paths) {
      if (typeof p !== 'string' || !p) return 'invalid_file_path';
      // Defense-in-depth: enforce <user_id>/<...> shape so a logged-in
      // user can't reference another user's uploaded files.
      if (p.includes('..') || p.startsWith('/')) return 'invalid_file_path';
    }
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
          `created_at,started_at,completed_at&limit=1`
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

      // Respond immediately, then continue processing in background.
      // waitUntil keeps the function alive up to maxDuration (800s).
      res.status(202).json({ job_id: job.id, status: 'pending' });

      waitUntil((async () => {
        try {
          await updateJobProgress(job.id, {
            status: 'running',
            started_at: new Date().toISOString(),
            current_stage: 'Starting…',
            progress: 1
          });
          await processStudioJob({ jobId: job.id, userId: user.id });
        } catch (err) {
          console.error('[studio-jobs] worker error:', err);
          await updateJobProgress(job.id, {
            status:        'failed',
            error_code:    'worker_error',
            error_log:     String(err && err.message || err).slice(0, 4000),
            completed_at:  new Date().toISOString()
          });
        }
      })());

      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[studio-jobs] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
