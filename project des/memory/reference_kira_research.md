---
name: reference-kira-research
description: "External resources for the kira-research project — repo, Supabase, Vercel, prod URL"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

Cross-cutting external pointers for kira-research. The repo's own `CLAUDE.md` is the authoritative project state — these are the dashboards Henry clicks through to operate it.

- **Production site:** https://kiraresearch.com
- **Repo (public):** https://github.com/henryvn2004-arch/kira-research
- **Repo GitHub raw URL pattern** (for owner copy-paste into Supabase SQL Editor): `https://raw.githubusercontent.com/henryvn2004-arch/kira-research/main/<path>` — has ~5min CDN cache, append `?v=N` to bust if needed
- **GitHub Actions tab:** https://github.com/henryvn2004-arch/kira-research/actions (Playwright smoke suite runs post-deploy on every push to main)
- **Supabase project:** ID `iygoynbnscednfzdsflc` — dashboard at https://supabase.com/dashboard. Has **7** migration files (`supabase/migrations/00{1..7}.sql`) the owner runs manually in SQL Editor. Storage bucket `reports-pdfs` (private) for PDF downloads — dead `frameworks` + `reports` buckets removed 2026-05-21.
- **Vercel project:** `kira-research`, auto-deploys on push to main. Env vars Henry maintains: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PAYPAL_CLIENT_ID/SECRET/MODE`, `APP_URL`, **`ADMIN_EMAILS`** (= henryvn2004@gmail.com), **`RESEND_API_KEY`** (transactional email; emails no-op silently until set).
- **Owner email (also the admin allowlist):** `henryvn2004@gmail.com` — git author email must match this on every machine (`git config user.email henryvn2004@gmail.com`) or Vercel refuses to deploy.

Rich Results test for schema markup verification: https://search.google.com/test/rich-results — use "Test live URL" to bypass its own cache.
