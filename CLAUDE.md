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

## Current state (2026-05-20)

- **Latest commit on `main`:** `659b81d` — fix(smoke): scope selectors to avoid strict-mode collisions
- **Production:** live, latest Vercel deploy from `659b81d`
- **CI:** smoke test workflow at `.github/workflows/post-deploy-smoke.yml` — runs on every push to main + manual via Actions UI
- **Smoke tests:** 30 shallow checks at `tests/smoke.spec.js` covering static pages × 3 locales, slug rewrites, root redirect, legacy redirects, admin auth gates, public APIs
- **First CI run (commit `7e4e0de`):** 30 failed / 5 passed — all 30 failures were over-broad selectors in the test suite, not site bugs. Fixed in `659b81d`. Awaiting next run for confirmation.

---

## Sprint history

Each sprint = a coherent chunk of work shipped to production. Commit hashes
link execution back to git log.

| # | Sprint | Status | Range |
|---|---|---|---|
| 1 | Foundation: shared assets + EN brand pages | ✅ | `b9e28fd` |
| 2 | i18n scaffold + root redirect | ✅ | `4dba4b5` |
| 3 | Library + Report template | ✅ | `c953fb4` |
| 4 | Custom Research + 13 legacy redirects | ✅ | `692d907` |
| 5 | `/api/leads` + Insights + form hardening | ✅ | `15e94f2` |
| 6 | Admin leads page + secure API + migrations | ✅ | `714375a` |
| 7 | Dynamic report page via Supabase rewrites | ✅ | `1a46491` |
| 8 | Library + Insights wired to DB | ✅ | `ffde22e` |
| 9 | Purchase flow (PayPal create + capture + verify) | ✅ | `60b00bb` |
| 10 | Admin CRUD for reports + insights | ✅ | `b2174fe` |
| 11 | Sample content templates + Load example UX | ✅ | `fc9b83b` |
| 12 | JA + KO locale page mirrors (14 files) | ✅ | `9147ea2`…`4bea633` |
| 13 | Vercel Clean URLs (fix /en/library 404) | ✅ | `7cfd980` |
| 14 | Rewrite pattern fix (slug 404) | ✅ | `3895ad4` |
| 15 | Playwright smoke tests + GH Actions workflow | ✅ | `7e4e0de` |
| 16 | Security cleanup: remove leaked secrets, repo→public | ✅ | `09dbc30` |
| 17 | Cross-machine pickup guide (CLAUDE.md at root) | ✅ | `9fde035` |
| 18 | Smoke selector fixes (logo-mark + title + auth + redirects) | ✅ | `659b81d` |

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
├── assets/                         # kira.css, fonts, images
└── js/                             # nav.js, auth.js, i18n loader

api/                                # Vercel serverless functions
├── leads.js                        # public POST — form submissions
├── library-list.js  insights-list.js  insight.js  library-report.js  # public reads
├── library-buy.js                  # PayPal create + capture
├── library-verify.js               # check purchase state
├── library-content.js              # JWT-gated full content + PDF URL
├── admin-leads.js  admin-reports.js  admin-insights.js  # JWT + ADMIN_EMAILS whitelist

supabase/migrations/                # idempotent schema
├── 001_leads.sql                   # leads table + RLS
├── 002_library.sql                 # reports + report_translations + seed
├── 003_insights.sql                # insights + insight_translations + seed
└── 004_purchases.sql               # purchases + downloads + RLS

tests/smoke.spec.js                 # 30 Playwright tests
.github/workflows/post-deploy-smoke.yml  # CI workflow
playwright.config.js                # chromium-only, github reporter
vercel.json                         # cleanUrls + 13 redirects + 7 rewrites
```

Key Vercel rewrite pattern (was fragile, now stable):
```
/<locale>/reports/:slug((?!_view$|template$).+) → /en/reports/_view.html
```
The negative-lookahead avoids the path-to-regexp parser quirk that broke
hyphenated slugs in earlier iterations.

---

## Owner action items (BLOCKING — owner must click through)

These are tasks only the owner can do (involve dashboards, not git):

1. ☐ **Run 4 Supabase migrations** in dashboard SQL Editor, in order:
   - `supabase/migrations/001_leads.sql`
   - `supabase/migrations/002_library.sql`
   - `supabase/migrations/003_insights.sql`
   - `supabase/migrations/004_purchases.sql`
2. ☐ **Set Vercel env var** `ADMIN_EMAILS=henryvn2004@gmail.com`
3. ☐ **Verify Vercel env vars exist** (Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (server-only — never expose to client)
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
   - `PAYPAL_MODE` (= `sandbox` or `live`)
   - `APP_URL` (= `https://kiraresearch.com`)
4. ☐ **Verify** `https://kiraresearch.com/en/reports/vietnam-fintech-2026` renders preview (no 404) — confirms last rewrite fix
5. ☐ **Confirm first smoke workflow run passes** — Actions tab → post-deploy smoke

---

## Next queue (pick one)

When picking up, ask Henry which to do next. Recommended order:

- **C — sitemap.xml + robots.txt + hreflang headers**
  SEO foundation. 3 sitemaps per locale + index sitemap + hreflang per page.
- **D — PDF upload via Supabase Storage**
  Wire `library-content.js` to return real signed URL from Storage bucket
  instead of the current placeholder. Add admin upload UI.
- **E — Transactional email** (purchase receipt + lead notify)
  Pick provider (Resend recommended). Year 1 = simple sends only.
- **F — Legacy file cleanup**
  Files still in repo from "AI platform" era — candidates for removal:
  - `public/pdf-to-md.html`
  - `api/ingest-save.js`, `api/browser-research.js`, `api/chat.js`,
    `api/claude-proxy.js`, `api/credits.js`, `api/cron-insights.js`,
    `api/doc-report.js`, `api/embed.js`, `api/extract-visuals.js`,
    `api/export-pptx.js`, `api/generate-report.js`, `api/generate-section.js`,
    `api/get-report.js`, `api/payment.js`, `api/research.js`,
    `api/strategy-builder.js`
  - Verify nothing references these before deleting.
- **G — Native reviewer QA pass on JA/KO copy**
  Ship JA/KO drafts to a native Upwork reviewer ($50-100/locale), fold
  fixes back in. First 10-20 reports per locale per `project des/CLAUDE.md`.

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

3. **Path-to-regexp slug constraints with hyphens are fragile.**
   - Use Vercel docs pattern: `:slug((?!_view$|template$).+)`
   - Do NOT use `:slug([a-z0-9][a-z0-9-]+)` — the inner hyphen-char class breaks slugs containing hyphens (e.g. `vietnam-fintech-2026`).

4. **`npm install` not `npm ci` in CI workflow** — no `package-lock.json` committed yet. When/if one is added, switch to `npm ci`.

5. **No hardcoded secrets in `public/`** — that folder is publicly served. Anon Supabase keys are OK (they're meant to be public, protected by RLS). Anything else = leak.

6. **Reading file from wrong shell cwd** — after `cd kira-research && ...`, the shell stays inside `kira-research/`. Subsequent `cd kira-research` errors. Always `pwd` first or use absolute paths.

7. **`.logo-mark` exists in TWO places** — `nav.js` injects it in the top nav AND in the footer. Playwright strict-mode (default) errors when a `locator('.logo-mark')` matches both. Always scope to `.nav-wrap .logo-mark` (or `.kira-footer .logo-mark` for the footer check) — or use `.first()` for quick triage.

8. **Page titles use mixed case `"KIRA Research"`**, not all-caps `"KIRA RESEARCH"`. Brand mark in nav is rendered all-caps via the CSS class `.logo-mark`, but `<title>` text is mixed case. Test with `/KIRA Research/i` or just `/KIRA/i`.

9. **`cleanUrls: true` strips `.html` from URLs** — admin JS redirects to `/auth.html` but the browser lands on `/auth`. Any URL assertion involving HTML files must accept both forms: `/\/auth(\.html)?(\?|$|\/)/`.

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
- After completing a sprint: append a row to the Sprint history table above + bump "Current state" date

---

*Last updated: 2026-05-20 (Sprint 18 complete — smoke selector fixes pushed, awaiting CI re-run)*
