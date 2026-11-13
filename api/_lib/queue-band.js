// ============================================================
// KIRA RESEARCH — api/_lib/queue-band.js
// Topics that a reader asked for by email ("email me when it is ready") are made before every other topic,
// in the order they were first asked for, so the date we promised each reader is kept.
// report_queue.priority for such a topic = REQ_BASE minus the 10-minute slot of its first request, so an
// earlier request has a higher number. Everything planner-made stays below BAND_MIN (demand points x 100 +
// planner score, in practice under 1,000). The owner's "Run first" button sets max + 1, i.e. above this band.
// Used by queue.mjs (sync-topics). 10-minute slots keep the band valid for about 480 days.
// ============================================================

export const REQ_BASE = 90000;
export const BAND_MIN = 20000;
const T0 = Date.UTC(2026, 9, 1);          // 2026-10-01

export function requestedPriority(firstRequestIso) {
  const slot = Math.max(0, Math.floor((Date.parse(firstRequestIso) - T0) / 600000));
  return Math.max(BAND_MIN, REQ_BASE - slot);
}
