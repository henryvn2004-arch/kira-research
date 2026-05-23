---
name: feedback-vercel-underscore-private-dirs
description: "Vercel excludes files/dirs starting with `_` from /api routing — use `api/_lib/foo.js` for shared helpers that must NOT become public endpoints"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

In Vercel's filesystem-routed `/api` directory, every `.js` file is normally exposed as a serverless function at the matching URL (e.g. `api/foo.js` → `/api/foo`). The exception: Vercel excludes any file OR directory whose name starts with an underscore. So `api/_lib/email.js` is callable from `api/leads.js` via `import { sendLeadNotification } from './_lib/email.js'` but is NOT reachable at `/api/_lib/email` — that returns 404.

**Why:** In Sprint E (2026-05-21) I needed a shared Resend helper consumable by two endpoints (`api/leads.js` + `api/library-buy.js`). The codebase's existing pattern was per-file copy-paste of helpers (`sb()`, `verifyBearer()`, `cors()` duplicated across every admin endpoint). For email, deduplication mattered more — the helper holds the from-address, the API key handling, the HTML templates, and the failure-absorption contract. Placing it as `api/_email.js` or `api/_lib/email.js` keeps Vercel's auto-routing from accidentally publishing the import-only module as a serverless function. We added a smoke test (`/api/_lib/email is NOT a public route`) that asserts 404 so a future rename or Vercel behavior change can't silently expose the helper.

**How to apply:**
- For NEW shared modules in this codebase: place under `api/_lib/<name>.js`. Files at `api/_<name>.js` also work but `_lib/` keeps them grouped.
- Import with relative path: `import { foo } from './_lib/<name>.js'`.
- If you add ANY new helper that lives under `api/_lib/`, add a smoke assertion `request.get('/api/_lib/<name>')` expects 404 — guards against the underscore convention silently changing in future Vercel updates.
- Don't put endpoint files under `_lib/` — defeats the purpose.
- For one-off helpers used by a single endpoint, keep them inline in that endpoint file (codebase pattern, see `api/library-buy.js` for example). Only promote to `_lib/` when ≥2 endpoints share the code.

Related: this codebase's per-endpoint duplicated `sb()`/`verifyBearer()`/`cors()` boilerplate is intentional Year 1 simplicity. Don't refactor unless explicitly asked — adds review surface without proportional value.
