// ============================================================
// KIRA RESEARCH — api/_lib/inngest-client.js
// Singleton Inngest client used by:
//   • api/studio-jobs.js (POST → inngest.send to trigger gen)
//   • api/inngest.js     (serve() webhook → executes workflow)
//   • api/_lib/studio-workflow.js (defines the workflow function)
//
// WHY INNGEST (Phase N.22)
// ------------------------
// Vercel `waitUntil()` background context proved unreliable for our
// multi-step worker — sequential outbound Anthropic API calls
// repeatedly hung indefinitely with no working interrupt (AbortController,
// Promise.race timeout, SDK timeout option all failed to fire). See
// N.16-N.21 history.
//
// Inngest's model: each `step.run()` inside a function is an
// INDEPENDENT serverless invocation. Inngest cloud calls our
// /api/inngest webhook once per step, persists the result, then calls
// back for the next step. Long-running orchestration becomes a series
// of short HTTP calls, each with its own timeout/retry budget at the
// platform layer — not at the JS layer where the bug lives.
//
// CREDENTIALS
// -----------
// Both keys are auto-injected by the Vercel↔Inngest integration:
//   INNGEST_EVENT_KEY   — used by inngest.send() to publish events
//   INNGEST_SIGNING_KEY — used by serve() to verify webhook signatures
// No need to read them explicitly; the SDK picks them up from env.
// ============================================================

import { Inngest } from 'inngest';

// App id binds this code to a specific app entry in the Inngest cloud
// dashboard. Must match what's shown in the Inngest UI.
export const inngest = new Inngest({
  id: 'kira-research',
  // Event key auto-read from process.env.INNGEST_EVENT_KEY by default.
  // Explicit so the dev-server scenario (no env) doesn't silently noop.
  eventKey: process.env.INNGEST_EVENT_KEY
});
