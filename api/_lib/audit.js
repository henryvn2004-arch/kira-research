// ============================================================
// KIRA RESEARCH — api/_lib/audit.js
// Shared audit-log writer for admin API handlers.
//
// Usage from an admin handler (e.g. admin-reports.js):
//
//   import { logAudit } from './_lib/audit.js';
//   ...
//   await logAudit({
//     actor:        user.email,
//     action:       'update',
//     resourceType: 'report',
//     resourceId:   id,
//     resourceLabel: patch.slug || base.slug,
//     diff:         { before: previous, after: patched },
//     req
//   });
//
// Fire-and-forget — never blocks the API response. Failures get logged
// to stderr but don't surface to the caller. The path lives under
// /api/_lib so Vercel's routing automatically excludes it from public
// routes (underscore-prefixed dirs are skipped).
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const ACTIONS = new Set([
  'create', 'update', 'delete', 'upload', 'refund', 'other'
]);

export async function logAudit(args) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  if (!args || !args.actor || !args.action || !args.resourceType) {
    console.warn('[audit] missing required fields, skipping log');
    return;
  }

  const action = ACTIONS.has(args.action) ? args.action : 'other';

  // Cap diff size — JSONB has a 1GB hard limit but no one needs to keep
  // a 100KB report body in audit history. Stringify + slice + parse
  // gives a quick safety net without computing depth.
  let diff = args.diff || null;
  if (diff) {
    try {
      const serialised = JSON.stringify(diff);
      if (serialised.length > 8000) {
        diff = { truncated: true, size: serialised.length };
      }
    } catch (_) {
      diff = { error: 'unserialisable' };
    }
  }

  const row = {
    actor_email:    String(args.actor).toLowerCase(),
    action,
    resource_type:  String(args.resourceType),
    resource_id:    args.resourceId != null ? String(args.resourceId) : null,
    resource_label: args.resourceLabel ? String(args.resourceLabel).slice(0, 280) : null,
    diff,
    request_path:   args.req ? String(args.req.url || '').slice(0, 500) : null,
    request_method: args.req ? String(args.req.method || '') : null
  };

  // Fire-and-forget. Caller is not awaited in the hot path.
  fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal'
    },
    body: JSON.stringify(row)
  }).catch(err => {
    console.warn('[audit] insert failed:', err.message);
  });
}
