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

## Current state (2026-05-21 — late session)

- **Latest commit on `main`:** `3f250e5` — feat(admin): Sprint 4.1 admin audit log (close last Phase 4 deferred item). Session shipped 10 sprints: migration 008 security hardening · Sprint 7.1 insights pagination · Phase 10.1 mobile smoke + Lighthouse runbook · Sprint 5.1 custom-research subpages (EN/JA/KO × market-analysis + strategy-builder) · Sprint 7.2 content production admin (re-scoped from auto-gen) · Vercel Analytics wiring · Sprint 4.2 report stats · internal linking (related insights on report pages) · branded 404 EN/JA/KO · Sprint 4.1 audit log.
- **Production:** live, Vercel auto-deploys on every push to main
- **Last fully-verified green CI run:** verify `3f250e5` in Actions tab. 78 smoke checks should pass on prod (was 58 at session start).
- **CI:** smoke test workflow at `.github/workflows/post-deploy-smoke.yml` — runs on every push to main + manual via Actions UI
- **Smoke tests:** 78 shallow checks at `tests/smoke.spec.js` covering static pages × 3 locales (incl. 2 new custom-research subpages = 6 routes), slug rewrites, root redirect, legacy redirects (now retargeted to specific subpages), admin auth gates (incl. new `/en/admin/audit`), public APIs (incl. relatedInsights field on library-report), **SEO surface (robots.txt + sitemap.xml + sitemap-{locale}.xml + hreflang + Organization JSON-LD + per-report Product JSON-LD + per-article Article JSON-LD + 2 new custom-research subpages in sitemap)**, **dynamic templates have no fatal module parse error**, **/auth has no sub-resource 404s**, **/api/_lib/email is not a public route**, **lead honeypot path returns 200 JSON**, **insights pagination (`?page=2` survives)**, **mobile viewport 375×667 has no horizontal scroll across 6 key pages + nav burger visible**, **branded 404 returns status 404 + locale-swapped title for /ja/missing-path**.
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
| **4.1** | Admin auth + dashboard + audit | ✅ | `714375a` auth + `eb05464` dashboard + this session audit log (migration 009 + `_lib/audit.js` helper + `/en/admin/audit` viewer; wired into reports/insights/transactions/aggregators/upload-pdf) |
| **4.2** | Reports management CRUD + stats | ✅ | `b2174fe`, `fc9b83b` + PDF upload (item D) + per-report sales/revenue/refund stats (this session) · featured drag-drop deferred |
| **4.3** | Transactions + Users admin | ✅ | this session · `/api/admin-transactions` (list/detail/refund PATCH), `/api/admin-users` (aggregates), `/en/admin/transactions.html` + `/en/admin/users.html`, also fixed pre-existing `admin-stats.js` column-name bug (revenue was always 0) |
| **4.4** | Leads + Aggregators admin | ✅ | `714375a` leads · this session aggregators (`/api/admin-aggregators` + `/en/admin/aggregators` covers submissions + sales + summary; migration 007 adds the 2 tables) |
| **5.1** | Demote 3 generation tools | ✅ | `692d907`, `74c21c0` redirects + this session: 6 service-line landings (EN/JA/KO × market-analysis, strategy-builder) rebuilt as analyst-led service pages |
| **5.2** | Kill /studio/ | ✅ | `692d907` |
| **5.3** | Credit system scoping | ✅ | `a8a9206` · credit system retired entirely Year 1, all platform-era APIs + profile.html removed |
| **6** | Report population (50+ EN reports) | ⏸️ | Henry's content production work |
| **7.1** | Insights blog + article templates | 🟡 | `15e94f2` · UI pagination pending |
| **7.2** | Content production admin (re-scoped) | ✅ | Year 1 decision: skip LLM auto-gen (brand voice conflict). Built scheduling (published_at gate) + status flow + related-report CTA in admin + improved "Get the full report" copy on `_view.html` |
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

api/                                # 16 Vercel serverless functions (all active)
├── leads.js                        # public POST — form submissions (+ admin notify email via _lib/email)
├── library-list.js  insights-list.js  insight.js  library-report.js  # public reads
├── library-buy.js                  # PayPal create + capture (+ receipt email via _lib/email)
├── library-verify.js               # check purchase state
├── library-content.js              # JWT-gated full content + PDF URL
├── admin-leads.js  admin-reports.js  admin-insights.js  # JWT + ADMIN_EMAILS whitelist
├── admin-transactions.js           # admin purchase ledger + manual refund flag (Sprint 4.3)
├── admin-users.js                  # admin buyer roll-up — email/spend/count/locales (Sprint 4.3)
├── admin-aggregators.js            # admin CRUD for aggregator_submissions + aggregator_sales (Sprint 4.4)
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
├── 006_drop_legacy.sql             # drop 6 deprecated tables + 2 fns + 2 buckets (Sprint F finish; keeps credit tables)
├── 007_aggregators.sql             # aggregator_submissions + aggregator_sales tables (Sprint 4.4)
├── 008_security_hardening.sql      # close advisor flags: RLS credit_costs, REVOKE EXECUTE add/spend_credits, pin search_path
└── 009_audit_log.sql               # audit_log table — append-only record of admin write actions (Sprint 4.1 close)

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

1. ☐ **Run `supabase/migrations/008_security_hardening.sql`** in dashboard SQL Editor — closes 3 Supabase advisor findings left over after 001-007:
   - (a) ERROR: `credit_costs` had RLS disabled (anon could read 12 rows). Migration enables RLS with no policies → deny-all for anon/authenticated, service-key bypasses (so the deferred Custom Research rebuild can still query).
   - (b) WARN: `add_credits` + `spend_credits` SECURITY DEFINER functions were callable by anon/authenticated via `/rest/v1/rpc/*`. Migration revokes EXECUTE from public/anon/authenticated. Functions remain in the DB for the deferred rebuild.
   - (c) WARN: 3 functions (`add_credits`, `spend_credits`, `set_updated_at`) had mutable search_path. Migration pins to empty.
   - Idempotent. Run after confirming 001-007 are all applied (they are, per 2026-05-21 verification).
2. ☐ **Enable Leaked Password Protection** — Supabase dashboard → Authentication → Settings → toggle "Leaked password protection" ON. Auth feature, no SQL path.
2b. ☐ **Run `supabase/migrations/009_audit_log.sql`** — adds the `audit_log` table that backs `/en/admin/audit`. All admin write paths (`admin-reports`, `admin-insights`, `admin-transactions`, `admin-aggregators`, `admin-upload-pdf`) now `logAudit()` to this table fire-and-forget. Without the table, those logAudit calls 404 silently — no functional impact, but the audit viewer stays empty. Run after 001-008.
3. ☐ **Enable Vercel Analytics + Speed Insights** — Vercel dashboard → kira-research → **Analytics** tab → click "Enable". Same for **Speed Insights** tab. Free tier: 2,500 events/month (plenty for Year 1). `nav.js` already injects `/_vercel/insights/script.js` + `/_vercel/speed-insights/script.js` on every public page; scripts 404 silently until owner flips the toggle. After enabling, real-user data shows up in the dashboard within ~30 min.
4. ☐ **Lighthouse perf audit on prod** (Phase 10.1) — run before soft launch. Two paths:
   - **Quick path (recommended):** PageSpeed Insights — go to https://pagespeed.web.dev/, paste each of the 6 URLs below, screenshot scores. Target ≥90 on all 4 categories (Performance / Accessibility / Best Practices / SEO):
     - `https://kiraresearch.com/en/`
     - `https://kiraresearch.com/en/library`
     - `https://kiraresearch.com/en/insights/`
     - `https://kiraresearch.com/en/methodology`
     - `https://kiraresearch.com/ja/`
     - `https://kiraresearch.com/ko/`
   - **Detailed path:** Chrome DevTools → Lighthouse panel → Mobile + Desktop runs per URL. Captures filmstrip + suggestions.
   - Send any score < 90 back here — Claude can fix render-blocking resources / preload hints / image sizing / unused CSS in code; perf hits from external services (Supabase, Fontshare) are mostly unfixable from our side and acceptable.

### Done (no further action needed)

- ✅ **Migrations 001-007 applied** (verified via MCP 2026-05-21): leads, living_reports + report_translations, insights + insight_translations, purchases + downloads tables present; 6 legacy tables dropped; `aggregator_submissions` + `aggregator_sales` exist with RLS enabled.
- ✅ **Legacy Storage buckets deleted** (owner confirmed 2026-05-21): `frameworks` (23 obj) + `reports` (132 obj, ~38MB) removed via Dashboard → Storage UI. Active bucket `reports-pdfs` (private, 32MB cap, application/pdf) remains for PDF uploads.
- ✅ **Vercel env vars set**: `ADMIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `APP_URL`, `RESEND_API_KEY` (+ optional `RESEND_FROM`).
- ✅ **Resend domain verified + API key live** — purchase receipts + lead notifications go out for real (no longer no-op).
- ✅ **GSC sitemaps submitted** — `sitemap-{en,ja,ko}.xml` added per locale property.
- ✅ Repo is public, GitHub Actions running free
- ✅ Smoke CI workflow live and green (60 checks)
- ✅ `/en/reports/<slug>` + `/en/insights/<slug>` rewrites verified by CI
- ✅ Legacy URL redirects (`/library.html`, `/report.html`, etc.) verified by CI
- ✅ Admin auth gate on `/en/admin/*` verified — unauthenticated users redirected
- ✅ Public API endpoints respond with JSON, leads endpoint rejects GET, admin-leads rejects unauth
- ✅ SEO surface live: `/robots.txt`, `/sitemap.xml` (index), `/sitemap-{en,ja,ko}.xml` (per-locale with embedded hreflang). Per-page `<link rel="alternate">` injected by nav.js on every page load.

---

## Open verification items (do these BEFORE picking next sprint)

End of 2026-05-20 session: code is shipped, owner has owner-blocker items still in progress. New session should confirm these are green before starting any new sprint, since several next-queue items depend on this infra being live.

Status as of 2026-05-21 late session:

1. ✅ **CI green** — verify on commit `3f250e5`. 78 smoke checks should all pass.
2. ✅ **Supabase tables + storage buckets verified via MCP** — all 7 migrations 001-007 applied. Migration 008 verified (credit_costs RLS=true, EXECUTE grants=0, search_path pinned). Legacy buckets (`frameworks`, `reports`) deleted. `reports-pdfs` private bucket remains.
3. ☐ **Bug #1 admin redirect (Year 1 test)** — owner-side smoke. Henry must sign in at `/auth` (email+password, not just email-verify), then visit `/en/admin/`. Confirm KPI dashboard renders. If still bounced, check `ADMIN_EMAILS` Vercel env value matches account email. Note: Henry confirmed ADMIN_EMAILS is set, so should work on next attempt.
4. ✅ **Schema markup / Article JSON-LD verified by CI** — smoke tests cover `script#ld-product`, `#ld-breadcrumb`, `#ld-article`, `#ld-organization` selectors + `pageerror` filter on `/en/reports/vietnam-fintech-2026` and `/en/insights/vietnam-sme-lending-shift`.
5. ☐ **End-to-end PDF upload + purchase (Year 1 test)** — owner-side. Once admin works (item 3), upload test PDF via `/en/admin/reports` → buy in incognito with non-admin PayPal sandbox account → download via post-purchase link.
6. ☐ **Migration 009 run** — owner runs `supabase/migrations/009_audit_log.sql` to create `audit_log` table. Until then, `/en/admin/audit` viewer shows empty + all `logAudit()` calls in admin endpoints fail silently (no functional impact, but no audit trail captured).
7. ☐ **Vercel Analytics + Speed Insights enabled** — owner toggles both in Vercel dashboard. Scripts already injected by nav.js, just need the products turned on to receive data.

## Next queue

All sprints with a code-side deliverable are now SHIPPED. Phase status:

**Code blocker = 0.** What's left is either owner-side (content + outreach)
or polish that can wait for actual signal from production traffic.

**Owner-side (does NOT need Claude):**
- **Content production (Phases 1 + 6)** — produce 50+ EN reports via Henry's Claude-chat workflow (Max sub). Each report: pick from 1000-report archive → Claude refresh → translate to JA + KO → native reviewer QA → upload via `/en/admin/reports`.
- **Sprint 8.2 — JA report translations** — same workflow, paste EN into Claude chat → JA.
- **Sprint 9.2 — KO report translations** — same workflow, KO.
- **Sprint 8.3 — JA aggregator distribution (GIIResearch)** — Henry's outreach work, fully manual Year 1.
- **Sprint 9.3 — KO aggregator distribution** — same pattern as JA.
- **G — Native reviewer QA pass on JA/KO** — first 10-20 reports per locale, $50-100/locale on Upwork.
- **Phase 10 — Polish & launch** — Lighthouse audit (runbook in CLAUDE.md owner action 4), mobile visual QA on real iOS/Android, soft launch announcement, 30-day metrics monitoring.

**Possible future code work (only when signal justifies):**
- **Sprint 4.2 — featured ranking drag-drop** — needs `featured` + `featured_rank` columns on `living_reports`. Build when Henry wants manual library curation.
- **Phase 7.3 — internal linking expansion** — Sprint 8 shipped insights-on-report. Could extend to insights-cross-link-insights, or reports-cross-link-reports. Defer until content corpus grows.
- **Vercel Analytics → admin dashboard** — once owner enables Analytics + Speed Insights, the API exposes per-page view counts. Could surface in `/en/admin/reports` Stats column. Defer until there's data.

### Done backlog (this 2026-05-21 session — 10 sprints)

- ✅ **Migration 008 — security hardening** (`714b9f0`) — RLS credit_costs + REVOKE add/spend_credits + pin search_path. Verified live via MCP.
- ✅ **Sprint 7.1 — Insights pagination** (`8aa3b82`) — PAGE_SIZE=12, `?page=N`, pushState, EN/JA/KO localized.
- ✅ **Phase 10.1 — Mobile smoke + Lighthouse runbook** (`e416629`) — 7 new smoke tests at 375×667; PageSpeed Insights runbook for owner.
- ✅ **Sprint 5.1 — Custom-research subpages** (`1185709`) — 6 new pages EN/JA/KO × market-analysis/strategy-builder. Legacy /report + /strategy-builder redirects retargeted.
- ✅ **Sprint 7.2 — Content production admin** (`07d0af8`) — re-scoped: no LLM auto-gen. `published_at` schedule gate. "Get the full report" CTA upgrade.
- ✅ **Vercel Analytics + Speed Insights** (`b7f0441`) — script injection via nav.js. Owner enables in dashboard.
- ✅ **Sprint 4.2 — Report sales stats** (`c601213`) — per-report completed/refunded/revenue in admin list + summary strip.
- ✅ **Internal linking — related insights on reports** (`49fa73a`) — scored match by country/industry/explicit_related. Up to 3 cards at bottom of report page.
- ✅ **Branded 404** (`8c96ed1`) — single file, locale auto-detect from URL path. EN/JA/KO copy + 3 action cards.
- ✅ **Sprint 4.1 — Admin audit log** (`3f250e5`) — migration 009 + `_lib/audit.js` helper + 5 admin endpoints wired + `/en/admin/audit` viewer with filter chips + per-row diff toggle.

### Done backlog (prior sessions)

- ~~**C — Sitemap.xml + robots.txt + full hreflang**~~ ✅ (`6bb331f`…`8bcb6d4`)
- ~~**D — PDF upload via Supabase Storage**~~ ✅
- ~~**E — Transactional email**~~ ✅ — Resend wired, domain verified
- ~~**7.3-remainder — Per-report schema markup + OG + JSON-LD**~~ ✅
- ~~**4.3 — Transactions + Users admin**~~ ✅ — also fixed `admin-stats.js` revenue $0 bug
- ~~**4.4 — Aggregators admin**~~ ✅ (`e7d5372` + migration 007)
- ~~**F — Legacy file cleanup**~~ ✅ (`a8a9206`)
- ~~**H — KPI dashboard**~~ ✅ (`eb05464`)

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

*Last updated: 2026-05-21 late session — owner switching machines. Big batch shipped: 10 sprints sequential per owner request. Migration 008 (security hardening) confirmed applied via MCP — credit_costs RLS enabled, REVOKE EXECUTE confirmed, search_path pinned. Migration 009 (audit log) **NOT YET RUN** — owner action remaining. Leaked Password Protection toggled ON in Auth (verified via advisor — flag cleared). Vercel Analytics + Speed Insights scripts wired in nav.js — owner needs to flip Enable toggles in Vercel dashboard. Phase 4 admin backend now fully closed (audit log was last deferred item). Phase 5 done (custom-research subpages live). Phase 7.2 re-scoped (no LLM auto-gen, content-production admin instead). Branded 404 + internal linking shipped. Latest commit `3f250e5`. **Code blocker = 0** — only owner-side content production (Phases 1, 6, 8.2, 8.3, 9.2, 9.3) + outreach (G) remaining for full launch.)*
