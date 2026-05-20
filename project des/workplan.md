# KIRA RESEARCH — Workplan (Research House Pivot + Multi-Locale)

> Pivot từ "AI-powered research platform" → **Southeast Asia research house** with library-first storefront, trilingual (EN/JA/KO), multi-channel distribution.

**Timeline:** 12 weeks to full v1.0 launch (EN), JA + KO added Phase 5.5 + 6.5
**Approach:** EN-first build with i18n-ready architecture. Add JA + KO after EN validates.

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

## 🔵 Phase 2: Brand & Copy Rewrite (Week 2-3) — P0

**Goal:** Rewrite all brand copy in research house voice (EN first, JA/KO later phases)

### Sprint 2.1 — Hero & landing copy
- [ ] Hero H1, subhead, primary CTA, secondary CTA
- [ ] Featured reports section copy
- [ ] Industries covered grid (icons + labels)
- [ ] Trust signals (years experience, countries covered)
- [ ] Methodology summary block

### Sprint 2.2 — About + Methodology pages
- [ ] Rewrite About — research firm narrative
- [ ] NEW Methodology page — primary research + AI augmentation + analyst curation
- [ ] Update Contact copy — "Talk to our research team"

### Sprint 2.3 — Removal cleanup
- [ ] Remove all "AI-powered" / "AI platform" mentions from non-methodology pages
- [ ] Remove all volume claims (1000+ studies, etc.)
- [ ] Remove competitor mentions

### Sprint 2.4 — UI string extraction
- [ ] Extract all UI strings into `/locales/en.json`
- [ ] Set up i18n loader script for client-side text replacement
- [ ] Set up locale switcher component in nav

**Deliverable:** All public copy rewritten (EN) + i18n infrastructure ready for JA/KO

---

## 🔵 Phase 3: Library Infrastructure (Week 3-5) — P0

**Goal:** Build customer-facing library UX + individual report pages

### Sprint 3.1 — `library.html` page
- [ ] Filter sidebar (industry, country, year, type, price)
- [ ] Search bar with debounced query
- [ ] Report grid with cards
- [ ] Empty state, loading state, pagination
- [ ] Locale-aware routing (`/en/library`)

### Sprint 3.2 — Individual report page
- [ ] Template page at `/[locale]/reports/[slug]`
- [ ] Hero + meta (industry, country, year, last updated)
- [ ] Sticky buy box right side với PayPal trigger
- [ ] Preview section (exec summary + 1 chart sample)
- [ ] Full TOC display
- [ ] Related reports footer
- [ ] hreflang tags pointing to JA/KO (when those locale versions exist)

### Sprint 3.3 — Backend integration
- [ ] Activate `living_reports` table
- [ ] Create `report_translations` table
- [ ] PayPal direct purchase flow (separate from credit system)
- [ ] Slug routing với locale awareness
- [ ] Programmatic SEO meta tags per report per locale
- [ ] Sitemap.xml auto-generation (multi-locale)

**Deliverable:** Library + report pages functional with 5-10 sample EN reports

---

## 🔵 Phase 4: Admin Backend Build (Week 3-5, parallel với P3) — P0

**Goal:** Build admin pages so Henry can manage everything qua UI

### Sprint 4.1 — Admin auth + dashboard
- [ ] Email whitelist middleware (env var `ADMIN_EMAILS`)
- [ ] `/admin` dashboard với KPI cards
- [ ] Audit log table

### Sprint 4.2 — Reports management
- [ ] `/admin/reports` list view với filter/search/sort
- [ ] `/admin/reports/new` — upload form (PDF + metadata)
- [ ] `/admin/reports/[id]/edit` — edit form với locale tabs
- [ ] `/admin/reports/[id]/stats` — sales + traffic
- [ ] `/admin/reports/featured` — featured reports drag-drop reorder

### Sprint 4.3 — Transactions + Users
- [ ] `/admin/transactions` list với filter by status
- [ ] `/admin/transactions/[id]` detail + manual refund action
- [ ] `/admin/revenue` dashboard với charts
- [ ] `/admin/users` list
- [ ] `/admin/users/[id]` detail

### Sprint 4.4 — Leads + Aggregators
- [ ] `/admin/leads` Custom Research inquiries
- [ ] `/admin/aggregators` submission tracking
- [ ] `/admin/aggregators/revenue` manual commission entry

**Deliverable:** Full admin backend usable by Henry to manage all data

---

## 🟡 Phase 5: Tool Demotion + Studio Kill (Week 4-5) — P1

**Goal:** Clean up site IA, demote tools, kill Studio products

### Sprint 5.1 — Demote 3 generation tools
- [ ] Move `report.html` → `/custom-research/market-analysis`
- [ ] Move `strategy-builder.html` → `/custom-research/strategy-builder`
- [ ] Update nav: tools no longer in main nav, only under Custom Research dropdown
- [ ] Create `/custom-research` landing explaining when to use custom vs library
- [ ] Add "Talk to our team" lead capture form

### Sprint 5.2 — Kill /studio/
- [ ] Remove all `/studio/` pages from nav
- [ ] Delete `/studio/*` files từ public folder
- [ ] 301 redirects từ `/studio/*` → `/custom-research/`
- [ ] Remove or merge `docreport.html` into Custom Research

### Sprint 5.3 — Credit system scoping
- [ ] Keep credit system functional for `/custom-research/*` only
- [ ] Library purchases use direct PayPal flow (no credit deduction)
- [ ] Update `profile.html`: show library purchases + remaining credits separately

**Deliverable:** Clean site IA, tools demoted, Studio removed entirely

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

## 🟢 Phase 7: SEO + Insights Engine (Week 6-10) — P2

**Goal:** Drive organic traffic to library (EN first)

### Sprint 7.1 — Insights page
- [ ] Build `/en/insights` blog list page
- [ ] Article template page `/en/insights/[slug]`
- [ ] Auto-pagination

### Sprint 7.2 — Auto-insights generation
- [ ] Daily cron generating SEO articles (`/api/cron/insights`)
- [ ] Each article = teaser for a related library report
- [ ] CTA at end: "Get the full report"

### Sprint 7.3 — SEO optimization
- [ ] Schema markup (Article, Product) on every report
- [ ] Open Graph + Twitter Card per report
- [ ] Internal linking strategy
- [ ] Submit sitemap to Google Search Console + Bing

**Deliverable:** Insights engine running EN, SEO traffic begins ramping

---

## 🟢 Phase 8: JA Layer (Week 8-10) — P2 (after EN stable)

**Goal:** Add Japanese locale + first 10 JA reports + GIIResearch submission

### Sprint 8.1 — JA infrastructure
- [ ] Translate `/locales/en.json` → `/locales/ja.json` via Claude chat
- [ ] Native reviewer reviews UI strings (critical for trust)
- [ ] Add Noto Sans JP font loading conditional on locale
- [ ] Set up `/ja/*` route handling
- [ ] hreflang tags activated bidirectionally
- [ ] `/sitemap-ja.xml` generation
- [ ] Set up GSC property for ja.kiraresearch.com sitemap

### Sprint 8.2 — JA report translations
- [ ] Translate first 10 reports EN → JA via Claude chat
- [ ] Native reviewer QA (cultural nuance, tech terms)
- [ ] Upload JA versions to `report_translations` (locale='ja', status='published')
- [ ] JA PDF export with Noto Sans JP

### Sprint 8.3 — JA aggregator distribution
- [ ] Contact GIIResearch publisher program (priority — Tokyo-based)
- [ ] Submit first 5 JA reports
- [ ] Contact Yano Research / Fuji Keizai if applicable
- [ ] Update aggregator_submissions tracking with locale='ja'

### Sprint 8.4 — JA copy rewrites (Henry)
- [ ] About page JA version (manual write, not just translate)
- [ ] Methodology page JA version
- [ ] Hero copy JA version (cultural adaptation)

**Deliverable:** JA locale live with 10 reports + GIIResearch submission

---

## 🟢 Phase 9: KO Layer (Week 10-12) — P2 (after JA validated)

**Goal:** Add Korean locale + first 10 KO reports

### Sprint 9.1 — KO infrastructure
- [ ] Same as Phase 8.1 but for Korean
- [ ] Noto Sans KR font setup
- [ ] `/ko/*` route handling
- [ ] hreflang tags + sitemap + GSC

### Sprint 9.2 — KO report translations
- [ ] Translate first 10 reports EN → KO
- [ ] Native reviewer QA
- [ ] Upload + publish

### Sprint 9.3 — KO aggregator distribution
- [ ] Contact Mordor Korea operations
- [ ] Contact dataintelo
- [ ] Submit first 5 KO reports

**Deliverable:** KO locale live with 10 reports

---

## 🟢 Phase 10: Polish & Launch (Week 10-12) — P2

- [ ] Mobile responsive QA on all pages (3 locales)
- [ ] Performance audit (Lighthouse score targets: 90+ on all)
- [ ] Bug fixes from internal QA
- [ ] Set up Vercel Analytics + Google Search Console (3 properties)
- [ ] Soft launch announcement (LinkedIn, communities, country-specific)
- [ ] Monitor first 30 days metrics: traffic, conversion %, refund rate, aggregator sales per locale

**Deliverable:** Launched v1.0 (EN + JA + KO) with monitoring

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

*Last updated: 2026-05-20*
