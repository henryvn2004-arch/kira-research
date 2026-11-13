// ============================================================
// KIRA RESEARCH — api/inngest.js
// Webhook endpoint that Inngest cloud calls to:
//   • introspect our app + registered functions (GET)
//   • execute a function step          (POST)
//   • sync app metadata after deploy   (PUT)
//
// This is the URL the Inngest dashboard's "Sync" button hits:
//   https://kiraresearch.com/api/inngest
//   https://kiraresearch.com/api/inngest?fnId=studio-gen  (per-fn)
//
// IMPORTANT — DO NOT CHANGE THE PATH
// ----------------------------------
// The Vercel ↔ Inngest integration registers this exact URL as the
// sync target. If you ever move the file, also update the URL in the
// Inngest dashboard → App settings → "Vercel URL".
//
// EXPRESS ADAPTER NOTE
// --------------------
// We use `inngest/express` because Vercel non-Next.js serverless
// functions expose Express-style `(req, res)` handlers. The adapter
// returns a request handler that introspects/executes per Inngest's
// protocol, calls `inngest.send()` events, and verifies the signing
// key signature on incoming webhook calls.
//
// If you ever migrate to Next.js, swap to `inngest/next` instead and
// move this file to `app/api/inngest/route.js`.
// ============================================================

import { serve } from 'inngest/express';
import { inngest } from './_lib/inngest-client.js';
import { studioGen } from './_lib/studio-workflow.js';

// Per-route override — each step.run() body runs inside one webhook
// invocation. The longest single step is the PDF render (which calls
// out to /api/render-pdf and can take 60-90s on cold start + image
// rendering). Default Vercel maxDuration is 60s, so we bump.
//
// We don't need 800s here (unlike old waitUntil orchestrator) because
// each step is short — the whole 8-14 min generation is sliced across
// MANY independent invocations, not one long one.
export const config = {
  maxDuration: 300
};

export default serve({
  client:    inngest,
  functions: [studioGen]
});
