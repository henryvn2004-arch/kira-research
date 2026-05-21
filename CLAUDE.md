# KIRA RESEARCH — Sprint Progress & Pickup Guide

> **Purpose of this file:** Single source of truth for a new Claude Code session
> to pick up this project from where the last session left off.
>
> **For project context** (brand, positioning, IA, schema, decision log) →
> read `project des/CLAUDE.md` after this one.

---

## Quick facts

| | |
|---|---|
| Site | https://kiraresearch.com |
| Repo | https://github.com/henryvn2004-arch/kira-research (public) |
| Owner | Henry — email `henryvn2004@gmail.com` |
| Communication | Vietnamese + English technical mix; owner is **non-technical** |
| Hosting | Vercel static (no SSR, no Next.js) |
| Backend | Supabase Postgres + Auth + Storage |
| Payments | PayPal (USD, Year 1 sole) |
| CI | GitHub Actions + Playwright smoke tests (free since repo is public) |
| Locales | EN (default) · JA · KO — all live |

---

## Current state (2026-05-21)

- **Latest commit on `main`:** `e179154` — feat(email): Sprint E (Resend purchase receipts + lead notifications). Owner runs domain verify + adds `RESEND_API_KEY` env var to enable live sends; until then sends no-op silently.
- **Production:** live, Vercel auto-deploys on every push to main
- **Last fully-verified green CI run:** verify `e179154` in Actions tab. 52 smoke checks should pass on prod.
- **CI:** smoke test workflow at `.github/workflows/post-deploy-smoke.yml` — runs on every push to main + manual via Actions UI
- **Smoke tests:** 52 shallow checks at `tests/smoke.spec.js` covering static pages × 3 locales, slug rewrites, root redirect, legacy redirects, admin auth gates (incl. upload-pdf), public APIs, **SEO surface (robots.txt + sitemap.xml + sitemap-{locale}.xml + hreflang `<link>` + Organization JSON-LD + per-report Product JSON-LD + per-article Article JSON-LD)**, **dynamic templates have no fatal module parse error** (catches top-level-return / SyntaxError regressions that initial-DOM checks miss), **/auth has no sub-resource 404s** (catches nav.js path drift), **/api/_lib/email is not a public route** (catches Vercel routing-leak regressions), **lead honeypot path returns 200 JSON** (catches email-import errors in leads handler).
- **SEO surface verified in prod** (curl ground truth): `/robots.txt` ✅, `/sitemap.xml` returns sitemap index ✅, `/sitemap-{en,ja,ko}.xml` return urlsets with hreflang annotations ✅. Schema markup verification by post-deploy smoke.
- **Open warning:** GitHub Actions Node.js 20 deprecation. Forced migration to Node 24 by 2026-06-02. Non-blocking — action authors will update before then.

---

## Workplan progress by phase

Source of truth for phase/sprint structure is `project des/workplan.md`
(10 phases × multiple sprints per phase). Below is a status matrix mapped
to that structure, with commits as evidence.

Legend: ✅ done · 🟡 partial · 🔴 not started · ⏸️ owner content/manual work

| Phase | Title | Status | Key commits |
|---|---|---|---|
| **1** | Report unit foundation (template + playbook) | ⏸️ | Henry's Claude-chat workflow; outside repo |
| **2** | Brand & copy rewrite (EN) — 4 sprints | ✅ | `b9e28fd`, `4dba4b5` |
| **3.1** | `library.html` page | ✅ | `c953fb4` |
| **3.2** | Individual report page (`_view.html` rewrite) | ✅ | `c953fb4`, `1a46491`, `87cd168` |
| **3.3** | Backend integration (DB + PayPal + slug routing + sitemap) | ✅ | `ffde22e`, `60b00bb`, `87cd168`, `8bcb6d4` · sitemap + hreflang shipped, per-report OG/JSON-LD → 7.3 |
| **4.1** | Admin auth + dashboard | 🟡 | `714375a` auth + `eb05464` dashboard · **audit log deferred** |
| **4.2** | Reports management CRUD | ✅ | `b2174fe`, `fc9b83b` + PDF upload UI (item D) · stats/featured pending |
| **4.3** | Transactions + Users admin | 🔴 | **not started** |
| **4.4** | Leads + Aggregators admin | 🟡 | `714375a` leads only · **aggregator tracking pending** |
| **5.1** | Demote 3 generation tools | 🟡 | `692d907`, `74c21c0` redirects only · **tool pages at /custom-research/{...} not rebuilt — deferred** |
| **5.2** | Kill /studio/ | ✅ | `692d907` |
| **5.3** | Credit system scoping | ✅ | `a8a9206` · credit system retired entirely Year 1, all platform-era APIs + profile.html removed |
| **6** | Report population (50+ EN reports) | ⏸️ | Henry's content production work |
| **7.1** | Insights blog + article templates | 🟡 | `15e94f2` · UI pagination pending |
| **7.2** | Auto-insights cron + SEO articles | 🔴 | `api/cron-insights.js` legacy, needs re-design |
| **7.3** | Schema markup + OG + sitemap + GSC | 🟡 | sitemap ✅ (`6bb331f`+`8bcb6d4`) · per-report/article schema + OG/Twitter ✅ (item 7.3-remainder) · GSC submission + internal linking pending |
| **8.1** | JA infrastructure | ✅ | `9147ea2`…`4bea633`, `8bcb6d4` · sitemap-ja.xml live; native QA + GSC = next-queue item G + owner |
| **8.2** | JA report translations | ⏸️ | Henry content work |
| **8.3** | JA aggregator distribution (GIIResearch) | ⏸️ | Henry outreach work |
| **8.4** | JA copy rewrites (About/Methodology/Hero) | ✅ | `9147ea2`…`4bea633` |
| **9.1** | KO infrastructure | ✅ | same commit range + `8bcb6d4` · sitemap-ko.xml live; native QA + GSC = next-queue item G + owner |
| **9.2** | KO report translations | ⏸️ | Henry content work |
| **9.3** | KO aggregator distribution | ⏸️ | Henry outreach work |
| **10** | Polish & launch | 🔴 | Mobile QA + perf audit + GSC + soft launch pending |
| **∞** | **Infra & quality (unplanned)** | ✅ | Smoke CI `7e4e0de`+`87cd168`, security `09dbc30`, memory `9fde035`+`4d9456a` |

**Detail per checkbox:** `project des/workplan.md` has the full
sprint-by-sprint task list with [x] ticked for completed items and
inline notes for partials.

---

## What's built (architecture)

```
public/
├── en/ ja/ ko/                     # locale roots (full mirrors)
│   ├── index.html                  # homepage per locale
│   ├── about.html  methodology.html  pricing.html  library.html
│   ├── reports/_view.html          # single dynamic template, rewritten from /:locale/reports/:slug
│   ├── insights/index.html         # insights list
│   ├── insights/_view.html         # single article template
│   ├── custom-research/index.html  # contact + research-on-demand
│   └── admin/                      # EN-only admin (auth-gated)
│       ├── leads.html  reports.html  insights.html
├── css/                            # kira.css
├── js/                             # nav.js + i18n
├── locales/                        # en.json, ja.json, ko.json
├── auth.html  auth.js              # Supabase Auth sign-in
├── index.html                      # root: locale auto-redirect
└── robots.txt                      # crawler directives

api/                                # 14 Vercel serverless functions (all active)
├── leads.js                        # public POST — form submissions (+ admin notify email via _lib/email)
├── library-list.js  insights-list.js  insight.js  library-report.js  # public reads
├── library-buy.js                  # PayPal create + capture (+ receipt email via _lib/email)
├── library-verify.js               # check purchase state
├── library-content.js              # JWT-gated full content + PDF URL
├── admin-leads.js  admin-reports.js  admin-insights.js  # JWT + ADMIN_EMAILS whitelist
├── admin-stats.js                  # admin dashboard aggregator (KPI cards)
├── admin-upload-pdf.js             # admin PDF upload to Supabase Storage (item D)
├── sitemap.js                      # dynamic sitemap (index + per-locale)
└── _lib/email.js                   # shared Resend send helper — purchase receipts + lead notifications (Sprint E). NOT a route (Vercel skips `_` dirs).

supabase/migrations/                # idempotent schema
├── 001_leads.sql                   # leads table + RLS
├── 002_library.sql                 # reports + report_translations + seed
├── 003_insights.sql                # insights + insight_translations + seed
├── 004_purchases.sql               # purchases + downloads + RLS
├── 005_storage.sql                 # private bucket reports-pdfs + RLS (item D)
└── 006_drop_legacy.sql             # drop 6 deprecated tables + 2 fns + 2 buckets (Sprint F finish; keeps credit tables)

tests/smoke.spec.js                 # 41 Playwright tests (CI green)
.github/workflows/post-deploy-smoke.yml  # CI workflow
playwright.config.js                # chromium-only, github reporter
vercel.json                         # cleanUrls + 13 redirects + 11 rewrites (all sources/destinations no-extension form)
```

Key Vercel rewrite pattern (final, stable):
```
/<locale>/reports/:slug  → /en/reports/_view
/<locale>/insights/:slug → /en/insights/_view
```
Two things matter here:
- `:slug` is plain (no inline regex). Vercel's path-to-regexp silently
  drops complex patterns; filesystem check runs before rewrites so
  concrete files (`_view.html`, `template.html`) still serve directly.
- Destination uses **no-extension form**. `cleanUrls` strips `.html`
  from rewrite destinations internally, so writing `_view.html` makes
  Vercel look for a file literally named `_view` (no extension) → 404.
  Writing `_view` lets cleanUrls forward-map to `_view.html` correctly.

---

## Owner action items (BLOCKING — owner must click through)

These are tasks only the owner can do (involve dashboards, not git):

1. ☐ **Run 6 Supabase migrations** in dashboard SQL Editor, in order:
   - `supabase/migrations/001_leads.sql`
   - `supabase/migrations/002_library.sql`
   - `supabase/migrations/003_insights.sql`
   - `supabase/migrations/004_purchases.sql`
   - `supabase/migrations/005_storage.sql` — creates private `reports-pdfs` bucket for PDF uploads. Alternative: Dashboard → Storage → New bucket → name `reports-pdfs`, **uncheck Public**, MIME `application/pdf`, size 32MB.
   - `supabase/migrations/006_drop_legacy.sql` — **destructive, two-step.** SQL step drops 6 unambiguously-deprecated tables (`source_reports`, `report_chunks`, `industry_patterns`, `competency_templates`, `chat_history`, `contacts`) + 2 RAG/search functions. Storage buckets (`frameworks` 23 obj, `reports` 132 obj ~38MB) must be removed separately via Dashboard → Storage UI (Supabase's `storage.protect_delete()` trigger blocks direct SQL deletes from `storage.objects`/`storage.buckets`). **Intentionally keeps** `user_credits`, `credit_transactions`, `credit_costs`, `custom_reports` + paired `spend_credits`/`add_credits` functions per `project des/CLAUDE.md` Custom Research backend earmark. Run only after 001-005 are confirmed applied.
2. ☐ **Set Vercel env var** `ADMIN_EMAILS=henryvn2004@gmail.com`
3. ☐ **Verify Vercel env vars exist** (Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (server-only — never expose to client)
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_MODE` (= `sandbox` or `live`)
   - `APP_URL` (= `https://kiraresearch.com`)
5. ☐ **Set up Resend for transactional email** (Sprint E, shipped 2026-05-21):
   - Create account at https://resend.com — sign up with `henryvn2004@gmail.com`, free tier (3K emails/month) is plenty for Year 1
   - Resend dashboard → Domains → "Add Domain" → `kiraresearch.com`
   - Resend shows 3 DNS records (MX, SPF TXT, DKIM TXT). Open a 2nd tab → Vercel → kira-research → Settings → Domains → click `kiraresearch.com` → DNS Records → add the 3 records exactly as shown by Resend. Wait a few minutes, then click "Verify" in Resend.
   - Resend → API Keys → "Create API Key" → name "kira-prod" → permission "Full access" → copy the `re_...` key
   - Vercel → kira-research → Settings → Environment Variables → add **`RESEND_API_KEY`** = `re_...` to all 3 scopes (Production, Preview, Development), then go to Deployments → latest → ⋯ → Redeploy
   - (Optional) Override the From address by setting **`RESEND_FROM`** = `"KIRA RESEARCH <noreply@kiraresearch.com>"` — defaults to that string if unset.
   - **Until domain is verified**, the `RESEND_API_KEY` can still be set but live sends will fail; receipts + lead notifications no-op silently. The site still works — emails just don't go out.

### Done (no further action needed)

- ✅ Repo is public, GitHub Actions running free
- ✅ Smoke CI workflow live and green (41 checks)
- ✅ `/en/reports/<slug>` + `/en/insights/<slug>` rewrites verified by CI
- ✅ Legacy URL redirects (`/library.html`, `/report.html`, etc.) verified by CI
- ✅ Admin auth gate on `/en/admin/*` verified — unauthenticated users redirected
- ✅ Public API endpoints respond with JSON, leads endpoint rejects GET, admin-leads rejects unauth
- ✅ SEO surface live: `/robots.txt`, `/sitemap.xml` (index), `/sitemap-{en,ja,ko}.xml` (per-locale with embedded hreflang). Per-page `<link rel="alternate">` injected by nav.js on every page load.

### New owner action (unblocked by SEO sprint)

4. ☐ **Submit sitemap to Google Search Console** — once per locale property:
   - GSC → Property → Sitemaps → add `https://kiraresearch.com/sitemap-en.xml`, same for `ja` and `ko`
   - Requires domain ownership verification first (DNS TXT or `google-site-verification` meta tag on `index.html`)
   - Optional: submit `https://kiraresearch.com/sitemap.xml` (the index) once for any property

---

## Open verification items (do these BEFORE picking next sprint)

End of 2026-05-20 session: code is shipped, owner has owner-blocker items still in progress. New session should confirm these are green before starting any new sprint, since several next-queue items depend on this infra being live.

Status as of 2026-05-21:

1. ✅ **CI green on `2914317`** — last 5 GitHub Actions runs all success (per API check). All 50 smoke checks pass on prod.
2. ✅ **Supabase tables + storage bucket verified via MCP** — `living_reports` (8 rows), `report_translations` (1), `insights` (7), `insight_translations` (7), `purchases` (1), `downloads` (0), `leads` (0). Storage bucket `reports-pdfs` exists (private, 32MB cap, `application/pdf` only).
3. ☐ **Bug #1 admin redirect** — still owner-side. Henry must sign in properly at `/auth` (email+password, not just email-verify), then visit `/en/admin/`. Confirm KPI dashboard renders. If still bounced, check `ADMIN_EMAILS` Vercel env value matches his account email and Vercel redeployed after adding the var.
4. ✅ **Bug #2 + #4 verified by CI** — smoke tests on commit `2914317` exercise the exact `script#ld-product`, `#ld-breadcrumb`, `#ld-article`, `#ld-organization` selectors AND `pageerror` SyntaxError filter on `/en/reports/vietnam-fintech-2026` and `/en/insights/vietnam-sme-lending-shift`. Both API endpoints confirmed serving seed data (8 reports, 7 insights), so the data-conditional tests in the suite actually ran the assertions rather than skipping. Optional Rich Results "Test live URL" can re-confirm in Google's eyes.
5. ☐ **End-to-end PDF upload + purchase** — still owner-side. Once admin works (item 3), upload test PDF via `/en/admin/reports` → buy in incognito with non-admin PayPal sandbox account → download via post-purchase link.

**Newly surfaced + addressed (2026-05-21 session):** Supabase advisor flagged 5 platform-era tables with RLS disabled and 0 code refs (`source_reports` 204 rows, `report_chunks` 2436, `competency_templates` 10, `industry_patterns` 925, `credit_costs` 12) plus 4 more dead tables (`custom_reports` 39, `user_credits` 1, `credit_transactions` 28, `chat_history` 0, `contacts` 0) + 2 dead storage buckets (`reports` 132 objects ~38MB, `frameworks` 23 objects ~650KB) + 5 dead functions. **Cleanup migration `006_drop_legacy.sql` written + pushed this session** — scoped to drop 6 unambiguously-deprecated tables + 2 buckets + 2 RAG functions. The 4 credit/`custom_reports` tables + their paired functions are kept per `project des/CLAUDE.md` Custom Research backend earmark. Owner runs migration 006 via Supabase SQL Editor (item 6 above). After applied, re-check Supabase advisor — RLS-disabled count should drop from 5 to 1 (only `credit_costs` remaining; addressable separately with a `enable row level security` + deny-all policy if it stays unused).

## Next queue (pick one)

Aligned with the workplan phase/sprint structure. Each item maps to one or
more pending sprints in `project des/workplan.md`. Recommended order:

- ~~**C — Sitemap.xml + robots.txt + full hreflang**~~ ✅ **DONE** (`6bb331f`…`8bcb6d4`). Closed Sprint 3.3, ~70% of 8.1+9.1; 7.3 partial.
- ~~**D — PDF upload via Supabase Storage**~~ ✅ **DONE** (this session). New `api/admin-upload-pdf.js` accepts base64 PDF + report_id + locale, writes to private bucket `reports-pdfs/{id}/{locale}.pdf`, patches `report_translations.pdf_url` to the path. `api/library-content.js` resolves paths → 1-hour signed URLs; external URLs pass through. Admin UI on `/en/admin/reports` edit pane has file picker + Upload button. Migration `005_storage.sql` creates the bucket. Closes 6.2 upload/delivery half.
- ~~**E — Transactional email**~~ ✅ **DONE** (this session). `api/_lib/email.js` exposes `sendPurchaseReceipt` + `sendLeadNotification`, posts to Resend. Wired into `library-buy.js` (capture step) and `leads.js` (post-insert) as fire-and-forget — never blocks the API response, no-ops silently when `RESEND_API_KEY` is unset. Owner runs Resend domain-verify + adds env var (action item 5). 2 new smoke tests.
- ~~**7.3-remainder — Per-report schema markup + Open Graph + JSON-LD**~~ ✅ **DONE** (this session). `_view.html` for reports + insights inject per-page OG/Twitter Card + Product/Article JSON-LD + BreadcrumbList. `nav.js` injects Organization JSON-LD globally. 4 new smoke tests cover it (45 total now).
- **4.3 — Transactions + Users admin** → revenue tracking UX.
  `/en/admin/transactions` list view + detail + manual refund button. Reuses `purchases` table. ~1 day.
- ~~**F — Legacy file cleanup**~~ ✅ **DONE** (`a8a9206`). 29 files / 11,138 lines removed. Closed Sprints 2.3 + 5.3.
- ~~**H — KPI dashboard + audit log**~~ ✅ **DONE — dashboard shipped** (`eb05464`). Closed Sprint 4.1 dashboard half. Audit log deferred.
- **G — Native reviewer QA pass on JA/KO copy** → fills Sprint **8.1** + **9.1** native reviewer items.
  Ship JA/KO drafts to a native Upwork reviewer ($50-100/locale), fold fixes back in. First 10-20 reports per locale per `project des/CLAUDE.md`.

---

## Hard constraints (do NOT violate)

From `project des/CLAUDE.md` — repeated here so a new session sees them immediately:

- ❌ Never position as "AI-powered platform / SaaS / app" — we are a **research house**
- ❌ Never claim volume ("1000+ reports", "thousands of studies")
- ❌ Never lead with "AI" in marketing copy — only mentioned on `/methodology`
- ❌ Never use competitor names in copy: Mordor, Frost, Euromonitor, Synovate, Ipsos
- ❌ Never use "Claude" or "McKinsey" in UI copy
- ❌ Never give CLI instructions to owner — always click-through (Vercel/Supabase/GitHub UI)
- ❌ Never use Next.js syntax in `vercel.json` (no `beforeFiles` / `afterFiles`)
- ✅ Brand voice: "our analysts" / "our research team" / "we" — never "our platform"
- ✅ Trilingual EN/JA/KO from Day 1, flat $39 pricing Year 1

---

## Gotchas learned the hard way

1. **Vercel blocks deploys if commit author email isn't matched to a GitHub account.**
   - First-time setup on a new machine, MUST run:
     ```
     git config user.email henryvn2004@gmail.com
     git config user.name  henryvn2004-arch
     ```
   - If already pushed bad commits, rewrite history with `git filter-branch --env-filter` then `git push --force-with-lease`.

2. **Vercel `cleanUrls: true` is required** or `/en/library` (file: `library.html`) 404s.

3. **Vercel rewrite slug patterns: keep them plain.** See gotchas #11 and #13 below — `:slug` (no inline regex) + no-extension destination is the only combination that reliably works with cleanUrls. The negative-lookahead pattern `:slug((?!_view$|template$).+)` that worked in earlier Vercel docs is silently dropped by their current parser.

4. **`npm install` not `npm ci` in CI workflow** — no `package-lock.json` committed yet. When/if one is added, switch to `npm ci`.

5. **No hardcoded secrets in `public/`** — that folder is publicly served. Anon Supabase keys are OK (they're meant to be public, protected by RLS). Anything else = leak.

6. **Reading file from wrong shell cwd** — after `cd kira-research && ...`, the shell stays inside `kira-research/`. Subsequent `cd kira-research` errors. Always `pwd` first or use absolute paths.

7. **`.logo-mark` exists in TWO places** — `nav.js` injects it in the top nav AND in the footer. Playwright strict-mode (default) errors when a `locator('.logo-mark')` matches both. Always scope to `.nav-wrap .logo-mark` (or `.kira-footer .logo-mark` for the footer check) — or use `.first()` for quick triage.

8. **Page titles use mixed case `"KIRA Research"`**, not all-caps `"KIRA RESEARCH"`. Brand mark in nav is rendered all-caps via the CSS class `.logo-mark`, but `<title>` text is mixed case. Test with `/KIRA Research/i` or just `/KIRA/i`.

9. **`cleanUrls: true` strips `.html` from URLs** — admin JS redirects to `/auth.html` but the browser lands on `/auth`. Any URL assertion involving HTML files must accept both forms: `/\/auth(\.html)?(\?|$|\/)/`.

10. **`cleanUrls` BREAKS redirects whose source ends in `.html`** — Vercel normalizes `.html` requests FIRST (308 to no-extension), then matches redirects against the normalized path. So `{ "source": "/library.html", ... }` never fires because by the time the redirect runs, the path is already `/library`. Always write redirect sources in the no-extension form (`/library`, `/about`, etc.).

11. **`cleanUrls` ALSO breaks rewrites whose `destination` ends in `.html`** — when the destination is `/foo/_view.html`, Vercel applies cleanUrls to the rewrite destination and looks for a file at `/foo/_view` (no extension), which doesn't literally exist on disk → 404. Write rewrite destinations in the no-extension form too (`/foo/_view`). The cleanUrls forward map handles serving `_view.html` from there.

12. **Legacy root HTML files SHADOW redirects** — `public/library.html`, `report.html`, etc. (from the platform era) make their corresponding redirects no-op because filesystem lookup wins. When adding a redirect for a path, ALSO delete the file at that path if it exists.

13. **Rewrite slug patterns: keep them simple.** Vercel's path-to-regexp silently rejects complex inline patterns like `:slug((?!_view$|template$).+)` — the rule loads but never matches. Use plain `:slug` (single segment). Filesystem check runs before rewrites, so concrete files like `_view.html` and `template.html` still serve directly.

---

## Pickup checklist for new Claude session

When this conversation continues on a different machine:

1. ✅ Read this file (you just did)
2. ✅ Read `project des/CLAUDE.md` for full project context (brand, schema, decisions)
3. ✅ Skim `project des/site-architecture.md` if working on routing/pages
4. ✅ Skim `project des/workplan.md` if planning multi-sprint work
5. ✅ Run `git log --oneline -10` to see what's freshest
6. ✅ Check **Actions** tab on GitHub — latest smoke run pass/fail
7. ✅ Ask Henry: which next-queue item to pick, or any new bug surfaced
8. ✅ Before any commit: verify `git config user.email` = `henryvn2004@gmail.com`
9. ✅ Before any push: run `npm run test:smoke:local` if change touches routing/pages/forms

---

## Communication style

- Owner speaks Vietnamese mixed with English technical terms
- Mirror that register — informal Vietnamese for tone, English for system/code/UI terms
- Owner is non-technical: explain **why** + **click-through how**, never CLI to owner
- Be honest about tradeoffs and risks; flag blockers explicitly
- Use TaskCreate/TaskUpdate for multi-step work; one-off small tasks can skip
- After completing a workplan sprint: tick its checkbox in `project des/workplan.md`, update the Workplan-progress matrix in this file, and bump "Current state" date

---

*Last updated: 2026-05-20 evening (items C + F + H + 7.3-remainder + D shipped — sitemap, legacy cleanup, admin dashboard, per-page schema/OG, PDF Storage upload pipeline. Also: 4 migration robustness fixes for legacy schema collision, 2 production bug fixes (module parse error + nav.js 404 on /auth). Sprints 2.3, 3.3, 4.1-dashboard, 5.3 closed; 7.3 + 6.2 advanced to mostly-done. Latest commit `7c2112b`. Owner switched machines at end of session — see "Open verification items" above for handover.)*
