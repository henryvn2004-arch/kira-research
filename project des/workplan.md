# KIRA RESEARCH — Workplan (Research House Pivot + Multi-Locale)

> Pivot từ "AI-powered research platform" → **Southeast Asia research house** with library-first storefront, trilingual (EN/JA/KO), multi-channel distribution.

**Timeline:** 12 weeks to full v1.0 launch (EN), JA + KO added Phase 5.5 + 6.5
**Approach:** EN-first build with i18n-ready architecture. Add JA + KO after EN validates.

---

## Status snapshot (2026-05-20)

Legend: ✅ done · 🟡 partial · 🔴 not started · ⏸️ owner blocked

| Phase | Title | Status | Notes |
|---|---|---|---|
| 1 | Report unit foundation | ⏸️ | Henry's Claude-chat workflow; outside repo build |
| 2 | Brand & copy rewrite (EN) | ✅ | All 4 sprints done — `b9e28fd`, `4dba4b5`. Removal cleanup finalized in `a8a9206` (29 legacy files gone). |
| 3 | Library infrastructure | ✅ | 3.1 + 3.2 + 3.3 all done (`ffde22e`, `60b00bb`, `1a46491`, `87cd168`, `8bcb6d4`). Sitemap + hreflang shipped. |
| 4 | Admin backend | 🟡 | 4.1 auth + dashboard ✅ (`714375a`, `eb05464`), 4.2 reports CRUD ✅ (`b2174fe`), 4.4 leads ✅. **4.1 audit log deferred, 4.3 transactions+users pending, 4.4 aggregator tracking pending** |
| 5 | Tool demotion + Studio kill | 🟡 | Redirects all wired (`692d907`, `74c21c0`). 5.3 credit-system + profile.html resolved in `a8a9206` (legacy gone, library uses direct PayPal). **Tool pages at `/custom-research/{market-analysis,strategy-builder}` not rebuilt — currently just redirect to landing.** |
| 6 | Report population | ⏸️ | 0 reports seeded beyond migration samples — Henry's content production |
| 7 | SEO + Insights engine | 🟡 | 7.1 templates ✅ (`15e94f2`). 7.3 sitemap ✅ (`6bb331f`+`8bcb6d4`). **7.2 auto-insights cron + 7.3 schema markup/OG + GSC submission pending.** |
| 8 | JA layer | 🟡 | 8.1 infra ✅ + 8.4 copy ✅ (`9147ea2`…`4bea633`) + hreflang/sitemap-ja.xml ✅ (`8bcb6d4`). **8.2 JA report translations + 8.3 GIIResearch submission pending — Henry content work.** |
| 9 | KO layer | 🟡 | 9.1 infra ✅ (same commit range) + sitemap-ko.xml ✅. **9.2 KO translations + 9.3 KO aggregator pending.** |
| 10 | Polish & launch | 🔴 | Not started — depends on Phases 6/8/9 having content |
| ∞ | Infra & quality (unplanned) | ✅ | Smoke CI `7e4e0de`+`87cd168`, security cleanup `09dbc30`, memory `9fde035`+`4d9456a` |

Detailed checkboxes per sprint below. CLAUDE.md at repo root has the
commit-by-commit log if you want to trace what changed when.

---

## Build sequence overview

```
Week 1-2   →  Phase 1: Report Unit Foundation
Week 2-3   →  Phase 2: Brand & Copy Rewrite (EN)
Week 3-5   →  Phase 3: Library Infrastructure (EN, i18n-ready)
Week 3-5   →  Phase 4: Admin Backend Build (parallel with P3)
Week 4-5   →  Phase 5: Tool Demotion + Studio Kill
Week 5-12  →  Phase 6: Report Population (continuous, EN first)
Week 6-10  →  Phase 7: SEO + Insights Engine (EN)
Week 8-10  →  Phase 8: JA Layer (translation + GIIResearch submission)
Week 10-12 →  Phase 9: KO Layer
Week 10-12 →  Phase 10: Polish & Launch
```

---

## 🔵 Phase 1: Report Unit Foundation (Week 1-2) — P0

**Goal:** Lock report template + produce 1 polished sample (English)

### Sprint 1.1 — Template definition (Day 1-3)
- [ ] Henry sends Claude chat 1 old report (industry of his choice)
- [ ] Claude drafts updated version với AI impact section
- [ ] Henry critiques, iterate 2-3 rounds
- [ ] Lock report structure: section count, length norms, chart format

### Sprint 1.2 — Production playbook (Day 4-7)
- [ ] Document the master prompt Henry uses với Claude chat
- [ ] Document diff process (keep / update / remove / add logic)
- [ ] Document QA checklist (citation transparency, AI section quality, hallucination check)
- [ ] Define PDF export format spec for aggregators
- [ ] Define translation prompt for JA + KO (to use Phase 8/9)

**Deliverable:** 1 polished EN sample report + production playbook ready

---

## 🔵 Phase 2: Brand & Copy Rewrite (Week 2-3) — P0 — ✅ DONE

**Goal:** Rewrite all brand copy in research house voice (EN first, JA/KO later phases)

### Sprint 2.1 — Hero & landing copy
- [x] Hero H1, subhead, primary CTA, secondary CTA
- [x] Featured reports section copy
- [x] Industries covered grid (icons + labels)
- [x] Trust signals (years experience, countries covered)
- [x] Methodology summary block

### Sprint 2.2 — About + Methodology pages
- [x] Rewrite About — research firm narrative
- [x] NEW Methodology page — primary research + AI augmentation + analyst curation
- [x] Update Contact copy — "Talk to our research team" (lives at `/en/custom-research/` now, no standalone contact page)

### Sprint 2.3 — Removal cleanup
- [x] Remove all "AI-powered" / "AI platform" mentions from non-methodology pages
- [x] Remove all volume claims (1000+ studies, etc.)
- [x] Remove competitor mentions
- [x] Remove ALL platform-era legacy files at repo root (29 files / 11k+ lines removed in `a8a9206` — see Phase 5 deliverable for full inventory)

### Sprint 2.4 — UI string extraction
- [x] Extract all UI strings into `/locales/en.json`
- [x] Set up i18n loader script for client-side text replacement
- [x] Set up locale switcher component in nav

**Deliverable:** ✅ All public copy rewritten (EN) + i18n infrastructure ready for JA/KO. Commits: `b9e28fd`, `4dba4b5`.

---

## 🔵 Phase 3: Library Infrastructure (Week 3-5) — P0 — 🟡 PARTIAL

**Goal:** Build customer-facing library UX + individual report pages

### Sprint 3.1 — `library.html` page
- [x] Filter sidebar (industry, country, year, type, price)
- [x] Search bar with debounced query
- [x] Report grid with cards
- [x] Empty state, loading state, pagination
- [x] Locale-aware routing (`/en/library`)

### Sprint 3.2 — Individual report page
- [x] Template page at `/[locale]/reports/[slug]` (via `_view.html` rewrite)
- [x] Hero + meta (industry, country, year, last updated)
- [x] Sticky buy box right side với PayPal trigger
- [x] Preview section (exec summary + 1 chart sample)
- [x] Full TOC display
- [x] Related reports footer
- [ ] hreflang tags pointing to JA/KO (when those locale versions exist) — **partial; on dynamic templates only**

### Sprint 3.3 — Backend integration
- [x] Activate `living_reports` table (named `reports` in code)
- [x] Create `report_translations` table
- [x] PayPal direct purchase flow (separate from credit system)
- [x] Slug routing với locale awareness
- [ ] Programmatic SEO meta tags per report per locale — **partial; title/desc done, OG/Twitter/JSON-LD pending** (Sprint 7.3 work)
- [x] Sitemap.xml auto-generation (multi-locale) — sitemap index + 3 per-locale sitemaps via `/api/sitemap`, with sitemap-embedded hreflang. robots.txt published. Commits: `6bb331f`, `2ae51a5`, `8bcb6d4`.

**Deliverable:** ✅ Library + report pages functional with sitemap discovery. Commits: `c953fb4`, `ffde22e`, `1a46491`, `60b00bb`, `87cd168`, `8bcb6d4`. Schema/OG meta tags remaining → Sprint 7.3.

---

## 🔵 Phase 4: Admin Backend Build (Week 3-5, parallel với P3) — P0 — 🟡 PARTIAL

**Goal:** Build admin pages so Henry can manage everything qua UI

### Sprint 4.1 — Admin auth + dashboard
- [x] Email whitelist middleware (env var `ADMIN_EMAILS`)
- [x] `/admin` dashboard với KPI cards — shipped in `eb05464`. `/en/admin/` shows 4 KPI cards (leads / reports / insights / revenue) + recent leads + recent purchases. Powered by `api/admin-stats.js` aggregator.
- [ ] Audit log table — **deferred** (no concurrent admin activity yet to monitor; revisit when there's signal worth tracking)

### Sprint 4.2 — Reports management
- [x] `/admin/reports` list view với filter/search/sort
- [x] `/admin/reports/new` — upload form (PDF + metadata)
- [x] `/admin/reports/[id]/edit` — edit form với locale tabs
- [ ] `/admin/reports/[id]/stats` — sales + traffic — **pending**
- [ ] `/admin/reports/featured` — featured reports drag-drop reorder — **pending**

### Sprint 4.3 — Transactions + Users — 🔴 NOT STARTED
- [ ] `/admin/transactions` list với filter by status
- [ ] `/admin/transactions/[id]` detail + manual refund action
- [ ] `/admin/revenue` dashboard với charts
- [ ] `/admin/users` list
- [ ] `/admin/users/[id]` detail

### Sprint 4.4 — Leads + Aggregators
- [x] `/admin/leads` Custom Research inquiries
- [ ] `/admin/aggregators` submission tracking — **pending**
- [ ] `/admin/aggregators/revenue` manual commission entry — **pending**

**Deliverable:** 🟡 Core admin CRUD usable for reports/insights/leads. Commits: `714375a`, `b2174fe`, `fc9b83b`. Pending: dashboard, audit log, transactions, users, aggregator tracking, report stats/featured.

---

## 🟡 Phase 5: Tool Demotion + Studio Kill (Week 4-5) — P1 — 🟡 PARTIAL

**Goal:** Clean up site IA, demote tools, kill Studio products

### Sprint 5.1 — Demote 3 generation tools
- [ ] Move `report.html` → `/custom-research/market-analysis` — **legacy file DELETED (`74c21c0`); page itself NOT rebuilt at new path. Redirect points to landing.**
- [ ] Move `strategy-builder.html` → `/custom-research/strategy-builder` — **same as above**
- [x] Update nav: tools no longer in main nav, only under Custom Research dropdown
- [x] Create `/custom-research` landing explaining when to use custom vs library
- [x] Add "Talk to our team" lead capture form (`/api/leads` POST)

### Sprint 5.2 — Kill /studio/
- [x] Remove all `/studio/` pages from nav
- [x] Delete `/studio/*` files từ public folder (already gone pre-Order 1; only `studio/index.html` was deleted in `b1ad781`)
- [x] 301 redirects từ `/studio/*` → `/custom-research/`
- [x] Remove or merge `docreport.html` into Custom Research (redirect-only at `/docreport`)

### Sprint 5.3 — Credit system scoping
- [x] Decision made: drop credit system entirely Year 1. `api/credits.js` + `public/profile.html` + 14 other platform-era API endpoints deleted in `a8a9206`.
- [x] Library purchases use direct PayPal flow (no credit deduction) — confirmed
- [x] `profile.html` removed — Year 1 has no user-facing profile UI. Library buyers get the report via session-bound state in `_view.html` after PayPal capture. If a profile page is wanted later it gets a fresh build, not a port.

**Deliverable:** ✅ Site IA cleaned + Studio gone + credit system fully retired. Commits: `692d907`, `74c21c0`, `a8a9206`. Pending: actual tool pages at `/custom-research/{market-analysis,strategy-builder}` — currently those URLs land on the Custom Research landing page; rebuilding the tools is a deferred decision (workplan defers heavy AI-tool builds to later).

---

## 🟡 Phase 6: Report Population (Week 5-12, continuous) — P1

**Goal:** Generate library catalog incrementally. Power law approach.

### Sprint 6.1 — First 20 EN reports
- [ ] Henry picks 20 diverse niches (industry × country)
- [ ] Generate via Claude chat per playbook (Phase 1 deliverable)
- [ ] Upload to `living_reports` + `report_translations` (EN locale)
- [ ] QA each report

### Sprint 6.2 — PDF export pipeline
- [ ] Implement PDF export (Puppeteer or pdfkit)
- [ ] Brand template applied (KIRA dark cover, light body)
- [ ] Locale-specific PDF (font, date format)
- [ ] Test PDFs validated end-to-end

### Sprint 6.3 — EN aggregator submission
- [ ] Contact ResearchAndMarkets.com publisher program
- [ ] Submit first 5 EN reports
- [ ] Contact MarketResearch.com publisher program
- [ ] Submit first 5 EN reports
- [ ] Establish update process & confirm commission terms

### Sprint 6.4+ — Continuous expansion
- Add 5-10 reports per week
- Target: 50-100 EN reports by Week 12
- Track sales data → identify top performers → double down

**Deliverable:** 50-100 EN reports live by Week 12, all on aggregators

---

## 🟢 Phase 7: SEO + Insights Engine (Week 6-10) — P2 — 🟡 PARTIAL

**Goal:** Drive organic traffic to library (EN first)

### Sprint 7.1 — Insights page
- [x] Build `/en/insights` blog list page
- [x] Article template page `/en/insights/[slug]`
- [ ] Auto-pagination — **basic limit param works; UI pagination control NOT built**

### Sprint 7.2 — Auto-insights generation
- [ ] Daily cron generating SEO articles (`/api/cron/insights`) — **`api/cron-insights.js` exists from platform era; not wired to new model. Needs re-design.**
- [ ] Each article = teaser for a related library report
- [ ] CTA at end: "Get the full report"

### Sprint 7.3 — SEO optimization
- [ ] Schema markup (Article, Product) on every report — **NOT STARTED**
- [ ] Open Graph + Twitter Card per report — **partial; static pages have OG, dynamic _view doesn't inject per-report OG yet**
- [ ] Internal linking strategy — **NOT STARTED**
- [x] Multi-locale sitemap.xml generated dynamically (`6bb331f`, `8bcb6d4`) — sitemap index + per-locale + sitemap-embedded hreflang + per-page hreflang via nav.js. Ready for GSC submission.
- [ ] Submit sitemap to Google Search Console + Bing — **owner task — needs domain ownership verification per locale (`google-site-verification` meta or DNS TXT)**

**Deliverable:** 🟡 Insights index + article shells live (`15e94f2`) + sitemap discovery foundation ready. Pending: pagination UI, cron, schema markup, full per-report OG, GSC submission (owner).

---

## 🟢 Phase 8: JA Layer (Week 8-10) — P2 (after EN stable) — 🟡 PARTIAL

**Goal:** Add Japanese locale + first 10 JA reports + GIIResearch submission

### Sprint 8.1 — JA infrastructure
- [x] Translate `/locales/en.json` → `/locales/ja.json` via Claude chat
- [ ] Native reviewer reviews UI strings (critical for trust) — **pending — next-queue item G**
- [x] Add Noto Sans JP font loading conditional on locale
- [x] Set up `/ja/*` route handling
- [x] hreflang tags activated bidirectionally — `nav.js` injects `<link rel="alternate">` for all 3 locales + x-default on every page (`6bb331f`). Sitemap-embedded `xhtml:link` annotations same.
- [x] `/sitemap-ja.xml` generation — dynamic via `/api/sitemap?locale=ja`, includes all published JA reports + insights + 7 static pages (`6bb331f`).
- [ ] Set up GSC property for ja.kiraresearch.com sitemap — **owner task, sitemap now ready to submit**

### Sprint 8.2 — JA report translations
- [ ] Translate first 10 reports EN → JA via Claude chat — **owner task**
- [ ] Native reviewer QA (cultural nuance, tech terms)
- [ ] Upload JA versions to `report_translations` (locale='ja', status='published')
- [ ] JA PDF export with Noto Sans JP — **blocked by PDF pipeline (next-queue item D)**

### Sprint 8.3 — JA aggregator distribution
- [ ] Contact GIIResearch publisher program (priority — Tokyo-based) — **owner task**
- [ ] Submit first 5 JA reports
- [ ] Contact Yano Research / Fuji Keizai if applicable
- [ ] Update aggregator_submissions tracking with locale='ja'

### Sprint 8.4 — JA copy rewrites (Henry)
- [x] About page JA version (manual write, not just translate)
- [x] Methodology page JA version
- [x] Hero copy JA version (cultural adaptation)

**Deliverable:** 🟡 JA shell live. Commits: `9147ea2`…`4bea633`. Pending: native QA, sitemap/hreflang, content, aggregator submission.

---

## 🟢 Phase 9: KO Layer (Week 10-12) — P2 (after JA validated) — 🟡 PARTIAL

**Goal:** Add Korean locale + first 10 KO reports

### Sprint 9.1 — KO infrastructure
- [x] Same as Phase 8.1 but for Korean (locale json, routing, copy rewrites)
- [x] Noto Sans KR font setup
- [x] `/ko/*` route handling
- [x] hreflang tags + sitemap — same mechanism as JA (`6bb331f`, `8bcb6d4`). `/sitemap-ko.xml` live.
- [ ] GSC property — **owner task, sitemap ready**

### Sprint 9.2 — KO report translations
- [ ] Translate first 10 reports EN → KO — **owner task**
- [ ] Native reviewer QA
- [ ] Upload + publish

### Sprint 9.3 — KO aggregator distribution
- [ ] Contact Mordor Korea operations — **owner task**
- [ ] Contact dataintelo
- [ ] Submit first 5 KO reports

**Deliverable:** 🟡 KO shell live. Same commit range as JA. Pending: same as 8.

---

## 🟢 Phase 10: Polish & Launch (Week 10-12) — P2 — 🔴 NOT STARTED

- [ ] Mobile responsive QA on all pages (3 locales)
- [ ] Performance audit (Lighthouse score targets: 90+ on all)
- [x] Bug fixes from internal QA (via smoke CI: legacy redirects, slug rewrites, selectors — `659b81d`, `74c21c0`, `87cd168`)
- [ ] Set up Vercel Analytics + Google Search Console (3 properties)
- [ ] Soft launch announcement (LinkedIn, communities, country-specific)
- [ ] Monitor first 30 days metrics: traffic, conversion %, refund rate, aggregator sales per locale

**Deliverable:** Launched v1.0 (EN + JA + KO) with monitoring

---

## ∞ Infra & Quality (unplanned in original workplan — shipped during build) — ✅ DONE

Cross-cutting work that wasn't in the original 10-phase plan but had to ship to keep the build sustainable:

- [x] **Playwright smoke test suite** — 35 shallow checks across all locales, slug rewrites, redirects, admin gate, public APIs. `tests/smoke.spec.js`. Commits: `7e4e0de`, `659b81d`.
- [x] **GitHub Actions CI workflow** — runs after every push to `main`, waits for Vercel deploy, runs smoke, uploads HTML report + traces on failure. `.github/workflows/post-deploy-smoke.yml`. Commit: `7e4e0de`.
- [x] **Security cleanup** — removed legacy `public/admin.html` with leaked Anthropic API key + admin password. Repo flipped public. Commits: `09dbc30` + Anthropic key revoked by owner.
- [x] **Vercel deploy unblocking** — rewrote all 18 commit authors to match GitHub email (`henryvn2004@gmail.com`) so Vercel auto-deploys instead of blocking.
- [x] **Cross-machine pickup memory** — `CLAUDE.md` at repo root captures sprint progress + gotchas + pickup checklist so a new Claude session continues seamlessly. Commits: `9fde035`, `4d9456a`.
- [x] **vercel.json hardening** — discovered cleanUrls quirks (redirect source `.html` shadowed, rewrite destination `.html` 404s, path-to-regexp negative-lookahead silently dropped). Fixed in `74c21c0` + `87cd168`. Documented in CLAUDE.md gotchas 9-13.

---

## Priority Matrix

| Priority | Phases | Why |
|---|---|---|
| **P0 must-do first** | Phase 1, 2, 3, 4 | Without library + admin no business exists |
| **P1 after P0** | Phase 5, 6 | Clean IA + content fills library |
| **P2 continuous/later** | Phase 7, 8, 9, 10 | Traffic + locales + polish, sequential |

---

## Sub-priorities within phases

| Item | Importance |
|---|---|
| Admin reports upload (Phase 4.2) | Critical — blocks content |
| PayPal flow (Phase 3.3) | Critical — blocks revenue |
| EN library validation | Critical — must work before JA/KO |
| Aggregator submission (EN) | High — alternative to slow SEO |
| Native reviewer (JA/KO) | High — brand quality |
| Insights auto-gen | Medium — long-term SEO play |

---

## Out of Scope (defer or kill)

- ❌ Subscription model — revisit after 6 months per-report data
- ❌ Custom domain for library — kiraresearch.com single domain
- ❌ Mobile app
- ❌ Newsletter / email automation system
- ❌ B2B enterprise sales motion
- ❌ Affiliate program
- ❌ Re-ingestion của RAG library
- ❌ `/studio/*` product line — killed entirely
- ❌ Per-locale pricing differentiation Year 1 (flat $39)
- ❌ Multi-currency native billing — USD via PayPal Year 1
- ❌ Stripe payment — PayPal sole Year 1
- ❌ Aggregator API auto-sync — manual entry
- ❌ Auto-translation API — Claude chat manual

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Aggregators reject AI-augmented reports | Low | Henry confirmed prior relationship; human-led framing |
| Year 1 SEO traffic too slow | High | Multi-channel: aggregators primary, SEO secondary |
| Refund rate >15% | Medium | Quality bar + clear preview + accurate descriptions |
| Henry burnout from production | Medium | Power law approach — ~100 evergreen winners enough |
| AI Overviews / ChatGPT eats top-funnel traffic | High | Lean on aggregator B2B buyer base |
| JA/KO translation quality damages brand | Medium | Native reviewer first 10-20 reports per locale |
| Phased rollout slows JA/KO revenue capture | Low | Better to launch JA/KO right than buggy |

---

## Success Metrics (90-day post-launch)

| Metric | Target |
|---|---|
| EN reports live | 50+ |
| JA reports live | 15+ |
| KO reports live | 10+ |
| Direct site sales (EN) | $2K-5K MRR equivalent |
| Aggregator sales | First 5-10 sales recorded |
| Refund rate | <10% |
| Organic traffic | 5K-10K monthly visits |
| Custom Research leads | 3-5 inquiries |

---

*Last updated: 2026-05-20 (Sprints 2.3, 3.3, 4.1-dashboard, 5.3 all closed today via items C, F, H. Through commit `eb05464`.)*
