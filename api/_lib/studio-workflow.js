// ============================================================
// KIRA RESEARCH — api/_lib/studio-workflow.js
// Inngest function that orchestrates Studio report generation.
//
// HOW IT WORKS (Phase N.22)
// -------------------------
//   1. /api/studio-jobs POST creates a `studio_jobs` row, then
//      `inngest.send({ name: 'studio/job.created', data: { jobId, userId } })`.
//   2. Inngest cloud invokes our /api/inngest webhook with this event.
//   3. This function body runs — but each `step.run(...)` is hoisted
//      into an INDEPENDENT serverless invocation. Inngest persists each
//      step's return value; subsequent invocations replay the function
//      and skip already-cached steps.
//
//   The big win: parallel section drafting (`Promise.all(plan.sections
//   .map(s => step.run(...)))`) becomes N parallel Vercel function
//   invocations instead of one long-lived call hitting the waitUntil
//   bug that killed N.16-N.21.
//
// FAILURE MODEL
// -------------
//   Each step.run() has Inngest's built-in retry (3 retries default,
//   exponential backoff). If a step exhausts retries, `onFailure` is
//   invoked once with the original event + the final error — we use
//   that to mark the job failed.
//
//   Function-level `retries: 2` is intentional: an individual step's
//   retries should usually be enough; function-level retry is rare
//   (only for orchestration glitches, not the work itself).
// ============================================================

import { inngest } from './inngest-client.js';
import {
  stage1ParseTopic,
  stage2ExtractFiles,
  stage3PlanSections,
  stage5DraftSection,
  stage7AssembleAndRender,
  MAX_SECTIONS
} from './studio-worker.js';
import {
  sb, updateJobProgress, logActivity, slugify
} from './studio-shared.js';
import { refundCredits, REPORT_COST } from './credits.js';

// Tiny logActivity wrapper — most events share `ts: now`.
function logEv(jobId, type, stage, msg, detail) {
  return logActivity(jobId, {
    ts: new Date().toISOString(),
    type, stage, msg,
    ...(detail !== undefined ? { detail } : {})
  });
}

async function loadJob(jobId, userId) {
  const rows = await sb(
    `studio_jobs?id=eq.${jobId}&user_id=eq.${userId}&select=*&limit=1`
  );
  const job = Array.isArray(rows) ? rows[0] : null;
  if (!job) throw new Error('job_not_found');
  if (job.status === 'cancelled') throw new Error('job_cancelled');
  return job;
}

export const studioGen = inngest.createFunction(
  {
    id:      'studio-gen',
    name:    'KIRA Studio report generation',
    retries: 2,
    onFailure: async ({ event, error }) => {
      // `event` here is the synthetic `inngest/function.failed` event
      // whose data.event field carries the original trigger.
      const original = event?.data?.event;
      const jobId    = original?.data?.jobId;
      const userId   = original?.data?.userId;
      if (!jobId) return;
      const msg = String(error?.message || error || 'unknown').slice(0, 4000);
      try {
        await updateJobProgress(jobId, {
          status:       'failed',
          error_code:   'workflow_error',
          error_log:    msg,
          completed_at: new Date().toISOString()
        });
        await logEv(jobId, 'error', 'render',
          'Workflow failed after retries — see error log for details',
          { error: msg.slice(0, 600) });

        // Phase O.6: refund the credit hold so the user isn't charged
        // for a failed gen. The unique-index on (studio_job_id, kind=
        // 'studio_refund') makes this idempotent — Inngest may invoke
        // onFailure more than once under exotic conditions.
        if (userId) {
          const newBalance = await refundCredits(
            userId, REPORT_COST, jobId, 'studio_refund'
          );
          if (newBalance !== null) {
            await logEv(jobId, 'info', 'render',
              `Refunded ${REPORT_COST} credits — balance restored to ${newBalance}`);
          }
        }
      } catch (writeErr) {
        console.error('[studio-workflow] onFailure write failed:', writeErr.message);
      }
    }
  },
  { event: 'studio/job.created' },
  async ({ event, step }) => {
    const { jobId, userId } = event.data;

    // ═══════════════════════════════════════════════════════════
    //  STEP 0 — load job, mark running, capture inputs
    // ═══════════════════════════════════════════════════════════
    const job = await step.run('load-job', async () => {
      const j = await loadJob(jobId, userId);
      await updateJobProgress(jobId, {
        status:        'running',
        started_at:    new Date().toISOString(),
        current_stage: 'Starting…',
        progress:      1
      });
      await logEv(jobId, 'info', 'parse',
        `Worker picked up the job — starting: "${(j.topic_input || '').slice(0, 200)}"`);
      // Only return the small subset we need downstream — Inngest
      // serialises each step's return so let's not bloat it with the
      // full job row.
      return {
        topic_input:         j.topic_input,
        uploaded_file_paths: j.uploaded_file_paths || []
      };
    });

    // ═══════════════════════════════════════════════════════════
    //  STEP 1 — classify intent (Phase N.23: free-form)
    // ═══════════════════════════════════════════════════════════
    const s1 = await step.run('parse', async () => {
      await updateJobProgress(jobId, {
        current_stage: 'Reading your brief…',
        progress:      5
      });
      await logEv(jobId, 'stage', 'parse',
        'Reading the brief + uploaded filenames to understand what you want…');
      const result = await stage1ParseTopic({
        topic_input:         job.topic_input,
        uploaded_file_paths: job.uploaded_file_paths
      });
      await updateJobProgress(jobId, {
        progress:         12,
        stages_completed: ['parse']
      });
      const p = result.parsed || {};
      const titlePart = p.working_title || p.primary_subject || '—';
      const kindPart  = p.report_kind   ? ` (${p.report_kind})` : '';
      await logEv(jobId, 'done', 'parse',
        `Locked intent: ${titlePart}${kindPart}`);
      return result;
    });

    // ═══════════════════════════════════════════════════════════
    //  STEP 2 — extract uploaded files (BEFORE plan, per N.21)
    // ═══════════════════════════════════════════════════════════
    const s2 = await step.run('extract', async () => {
      const fileCount = job.uploaded_file_paths.length;
      await updateJobProgress(jobId, {
        current_stage: 'Extracting source files…',
        progress:      15
      });
      await logEv(jobId, 'stage', 'search',
        `Extracting ${fileCount} uploaded source file${fileCount === 1 ? '' : 's'}…`);
      const result = await stage2ExtractFiles({
        jobId, userId,
        uploaded_file_paths: job.uploaded_file_paths,
        log: (type, stage, msg) => logEv(jobId, type, stage, msg)
      });
      await updateJobProgress(jobId, {
        progress:         30,
        stages_completed: ['parse', 'search']
      });
      await logEv(jobId, 'done', 'search',
        `Source extraction complete · ${result.extracted.length} file${result.extracted.length === 1 ? '' : 's'} · ${result.total_chars.toLocaleString()} total chars`);
      return result;
    });

    // ═══════════════════════════════════════════════════════════
    //  STEP 3 — plan sections (free-form, content + intent driven)
    // ═══════════════════════════════════════════════════════════
    const s3 = await step.run('plan', async () => {
      await updateJobProgress(jobId, {
        current_stage: 'Designing the structure…',
        progress:      32
      });
      await logEv(jobId, 'stage', 'plan',
        `Designing the structure for a ${s1.parsed?.report_kind || 'deliverable'} based on your brief + uploaded content…`);
      const result = await stage3PlanSections({
        parsed:      s1.parsed,
        extracted:   s2.extracted,
        topic_input: job.topic_input
      });
      const titles = (result.plan?.sections || []).map(x => x.title);
      await updateJobProgress(jobId, {
        progress:         40,
        stages_completed: ['parse', 'search', 'plan']
      });
      await logEv(jobId, 'done', 'plan',
        `Planned ${titles.length} sections` + (result.plan?.rationale ? ` · ${result.plan.rationale}` : ''),
        { titles });
      return result;
    });

    // ═══════════════════════════════════════════════════════════
    //  STEP 4 — draft each section IN PARALLEL via step.run
    //
    //  This is the N.22 win: Promise.all over step.run produces
    //  N parallel Vercel function invocations. Each section has
    //  its own ~90s timeout budget; no shared fetch state can
    //  hang the others. Anthropic API rate-limits will throttle
    //  parallelism naturally — but Inngest auto-retries each step
    //  on retryable errors so 429s self-heal.
    // ═══════════════════════════════════════════════════════════
    const sections = (s3.plan?.sections || []).slice(0, MAX_SECTIONS);
    const total    = sections.length;

    await step.run('draft-start', async () => {
      await updateJobProgress(jobId, {
        current_stage: `Drafting sections (0/${total})…`,
        progress:      42
      });
      await logEv(jobId, 'stage', 'content',
        `Drafting ${total} sections in parallel (each is an independent invocation) using uploaded sources…`);
      return { total };
    });

    const drafts = await Promise.all(
      sections.map((section, idx) => {
        // Step ID must be unique + deterministic across replays. The
        // index alone would do; appending a slug makes Inngest's UI
        // readable. Capped at 40 chars to stay well within Inngest's
        // 256-char id limit.
        const stepId = `draft-${idx}-${slugify(section.title).slice(0, 40)}`;
        return step.run(stepId, async () => {
          await logEv(jobId, 'info', 'content', `Drafting: ${section.title}`);
          const draft = await stage5DraftSection({
            section,
            parsed:    s1.parsed,
            extracted: s2.extracted
          });
          await logEv(jobId, 'done', 'content',
            `Finished: ${section.title}`);
          return draft;
        });
      })
    );

    await step.run('draft-end', async () => {
      await updateJobProgress(jobId, {
        progress:         90,
        current_stage:    'All sections drafted',
        stages_completed: ['parse', 'search', 'plan', 'content']
      });
      await logEv(jobId, 'done', 'content', `All ${total} sections drafted`);
      return { total };
    });

    // ═══════════════════════════════════════════════════════════
    //  STEP 5 — assemble HTML + render PDF + upload to storage
    // ═══════════════════════════════════════════════════════════
    const reportId = await step.run('render', async () => {
      await updateJobProgress(jobId, {
        current_stage: 'Rendering PDF + uploading…',
        progress:      93
      });
      await logEv(jobId, 'stage', 'render',
        'Assembling pages, rendering PDF, uploading to storage…');

      const tokIn  = (s1.tokens_in  || 0) + (s3.tokens_in  || 0)
                   + drafts.reduce((a, d) => a + (d?.tokens_in  || 0), 0);
      const tokOut = (s1.tokens_out || 0) + (s3.tokens_out || 0)
                   + drafts.reduce((a, d) => a + (d?.tokens_out || 0), 0);

      const rid = await stage7AssembleAndRender({
        jobId, userId,
        parsed:      s1.parsed,
        plan:        s3.plan,
        extracted:   s2.extracted,
        sectionsOut: { sections: drafts }
      });

      // Sonnet 4.5 ballpark pricing: $3/MTok in, $15/MTok out.
      const cost = (tokIn / 1_000_000) * 3 + (tokOut / 1_000_000) * 15;
      await updateJobProgress(jobId, {
        status:             'completed',
        progress:           100,
        current_stage:      'Done',
        studio_report_id:   rid,
        tokens_input:       tokIn,
        tokens_output:      tokOut,
        estimated_cost_usd: Number(cost.toFixed(4)),
        stages_completed:   ['parse', 'plan', 'search', 'content', 'render'],
        completed_at:       new Date().toISOString()
      });
      await logEv(jobId, 'done', 'render', 'PDF rendered and uploaded');
      await logEv(jobId, 'done', 'complete',
        `Report ready · ${tokIn.toLocaleString()} input + ${tokOut.toLocaleString()} output tokens · est $${cost.toFixed(2)}`);
      return rid;
    });

    return { jobId, reportId };
  }
);
