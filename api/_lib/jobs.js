// ============================================================
// KIRA RESEARCH — api/_lib/jobs.js
// Records one row per run of a scheduled job in job_runs (migration 032);
// /en/admin/health reads it. Best-effort: a logging failure never breaks the job.
// ============================================================
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function logJobRun(job, { ok, detail, startedAt }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/job_runs`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ job, ok: !!ok, detail: detail ? String(detail).slice(0, 500) : null, duration_ms: startedAt ? Date.now() - startedAt : null })
    });
  } catch (err) {
    console.warn('[jobs] log failed:', err.message);
  }
}
