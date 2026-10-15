# KIRA RESEARCH — Workplan (Research House Pivot + Multi-Locale)

> Pivot từ "AI-powered research platform" → **Southeast Asia research house** with library-first storefront, trilingual (EN/JA/KO), multi-channel distribution.

**Timeline:** 12 weeks to full v1.0 launch (EN), JA + KO added Phase 5.5 + 6.5
**Approach:** EN-first build with i18n-ready architecture. Add JA + KO after EN validates.

---

## 🟣 Phase S — Library + Expert platform (decided 2026-10-05, revised 2026-10-06) — CURRENT

**Goal (owner, 2026-10-06):** a business that runs itself. Machines run the production loop; the owner approves and handles exceptions. Only a self-running model can scale.

**Positioning:** ASEAN market-entry intelligence for foreign companies entering ASEAN domestic markets (JP/KR/CN/TW first) and the teams that serve them (industrial-park sales, FDI law/accounting, banks' FDI desks, consultants, M&A/PE scouts, investment-promotion agencies). Not a custom-research shop, not an AI tool.

**Competitive view (2026-10-06):**
- Buyers accept $2,000–3,000 syndicated studies because project-based research (JETRO, KOTRA, local agencies) is slow, expensive and not much more accurate.
- The weakness of syndicated studies is fit: it is hard to find the exact product × market × country.
- AI deep research (ChatGPT, Claude) solves fit. **It is KIRA Library's main competitor**, more than other research houses.

**Why a buyer picks KIRA over their own deep research:**
1. **Citable.** "Source: KIRA Research 2026" can go in a board deck or ringi (稟議) approval paper; "Source: ChatGPT" cannot.
2. **Exact fit, fast.** A search with no report lands on a coming-soon page; the report is produced on demand.
3. **No effort.** No prompting, no fact-checking. Exhibits download to PPT/Excel.
4. **Data their AI cannot reach.** Vietnamese-language and provincial/ministry sources, customs data, Kira Chain.
5. **Native JA/KO/ZH**, refreshed on a schedule.

**Trust:**
- Early trust comes from the brand plus visible proof: sample pages, every number sourced and dated, a methodology page, partners and press. Named analysts are not needed.
- Do not look like a "report mill" (high-volume template publishers selling $3–7k list-price reports through aggregators).

**Decisions locked with Henry:**

General (2026-10-05)
- Business: subscription library + expert platform. Custom research is parked as a separate product; within the library it is replaced by on-demand reports. Studio (self-serve generation) is frozen as a product; its code is kept for the expert-interview tool.
- Hard constraints "no subscription" and "never claim volume" are **dropped**.
- Locales: EN + JA + KO + **ZH (Simplified)**.
- Countries: 10 ASEAN + Australia + New Zealand + Taiwan (extensible; site shows 15 markets). Each country has its own industry list, sized and prioritised by market (big/hot markets many industries, small ones a few).
- Industry = **market-seeking FDI** only: sectors where foreign firms want to sell into the *domestic* market. Export-oriented FDI is out of scope.

Topics and content (2026-10-05, updated 2026-10-06)
- Competency follows industry and investor stage (explore → enter → expand).
- The **Topic Planner** proposes topics + guiding questions. Reader demand also creates topics automatically (see the self-running loop below). The owner approves before anything enters the queue.
- Industry levels: level 1 = the 171 industries; **level 2 = narrower segments**, added where demand justifies, proposed by the planner and approved by the owner.
- Content layers: Deep report · Industry snapshot · Company data (Kira Chain).
- Old queue: 16 `error` rows deleted, 57 `pending` rows set to `hold`. Reports already published stay.

Pricing (revised 2026-10-06; validate with the waitlist before S7)

| Plan | Price | Includes |
|---|---|---|
| Single report | **$299** | 1 PDF + Excel data |
| Month | **$149** | Unlimited online reading + **5 PDF/month** |
| Annual | **$1,190** | Unlimited online reading + **60 PDF/year** + **Kira Chain** |
| Expert call (S9) | **$500–800/hour** | — |

- Week plan and the $39 single report are dropped.
- The single price anchors value, so buyers needing 2+ reports choose Month. Download caps stop "subscribe, download everything, cancel".
- Kira Chain sits in Annual as the retention reason.
- Live on the pricing pages (EN/JA/KO/ZH, waitlist only) since S5b (PR #66). Waitlist plan values: `report` · `month` · `annual` · `not-sure` (`week` kept for old rows, migration 042).

Distribution (2026-10-05)
- KDP (US + JP), Google Play Books, Apple Books via EPUB export.
- Do NOT enrol in KDP Select (exclusivity).

### Three products

| Product | What | How it runs |
|---|---|---|
| **Kira Library** | Deep reports + snapshots in 4 languages, coming-soon pages, on-demand production | Self-running: demand → topic → pipeline → translate → publish → email requesters. Owner approves topics |
| **Kira Chain** | Product explorer company database, Capital IQ / Bloomberg style | Collection and refresh automated; owner spot-checks samples |
| **Kira Experts** | (a) Private expert calls: page live since S5, priced per engagement. (b) **New:** KIRA-owned transcript library | See expert decisions below |

**Kira Chain** (name chosen 2026-10-06; "Kira Explore" kept as an alternative):
- A company database organised by a product's value chain.
- Example: a user searches "laptop" in Vietnam and sees the manufacturers, importers, distributors and retailers, shown as a linked map.
- Built on the Phase R tables (`entities`, `relationships`, `company_graph_bfs()`, 250 companies).
- Candidate sources: customs import/export data, business registry, distributor websites, e-commerce shops.
- Linked from reports (a click on a product or company name opens its chain).

**Kira Chain UX: decided 2026-10-07** after a coffee × Vietnam prototype (PR #73, files in `public/en/chain/vn/`, not linked from the site):
- **Network view.** Each value-chain stage holds hubs (groups of companies, e.g. "Vietnamese exporters"). Arrows between hubs show how the product moves along the chain. Dots are companies, coloured by ownership. Click a hub for its company list and its inflows and outflows; click a dot for the company detail with its source link. The bubble-column map view was dropped (owner, 2026-10-07): one page, with a toggle **Kira Data** (companies found, hubs and dots) / **Market Estimate** (one circle per stage sized by a sourced stage-level figure, same flow arrows, click for the sourced facts).
- **The arrows are a chain template, one per product, written by KIRA analysts** and reviewed by an analyst. There are **no company-to-company links**: no data source exists for them, so the product does not promise them.
- **Size:** hub size = companies in the KIRA database. Official estimates are a separate toggle, shown only where a sourced number exists (the unit differs per stage: households, dealers, factories, shops).
- **Concentration:** only from sourced figures (a stage-level top-N share from industry statistics, or registered capital once registry data exists). Never estimated by us.
- **Prototype findings:** first desk-research pass: 121 company rows and 56 sourced statistics, mostly read from search snippets. A verification pass on 2026-10-07 (every source re-opened) left 111 rows = 95 distinct companies (13 at several stages: Intimex, Olam, Louis Dreyfus, Trung Nguyên…) and 51 statistics. 88 rows were source-checked, 18 corrected, 5 could not be checked, and 7 were dropped as unsupported (for example the Japanese/Korean buyers, whose pages do not say they buy Vietnamese coffee). A website pass found a page we opened and matched for 41 of the 95 companies (25 their own site, 11 a group site, 5 a brand site); about a dozen more likely have sites that block automated fetching (Highlands, Louis Dreyfus, Vinacafé Biên Hòa, Tín Nghĩa…). Weakest stages: collection (11), distribution (7), buyers (3). Many "confirmed" rows confirm only that the company exists at that stage, not its province or ownership.
- **v1 data model (proposed):** new tables `chains`, `chain_stages`, `chain_flows` (the template arrows) and `chain_memberships` (company × chain × stage × role, with `evidence_url`, `confidence` and `status` ai_draft → registry_confirmed → analyst_verified). Reuses `entities`, `facts`, `sources`.
- **One generic page for every product (owner, 2026-10-07; built, prototype, noindex).** `/en/chain/` is a search box: the reader types a product or service, `/api/chain-search` finds the chain (forgives typos, accents and filler words; a query that names a market only returns that market's chains), and `/en/chain/<country>/<product>` draws it with one shared page (`public/en/chain/_view.html`, data from `/api/chain`). Per-product work is data only. A query with no chain shows a request form (`/api/chain-request`, table `chain_requests`; email optional) as demand signal.
  - **Data:** migration 037, table `chains` (country × slug, name, aliases, `payload` jsonb or `payload_url` to a static file, status draft/published). VN coffee is the first row, its data in `public/chain-data/vn-coffee.json`. `payload` has the shape the page reads: `stages`, `flows`, `companies`, `facts`, `method`.
  - **Auto-chain builder ✅ (2026-10-07):** `skills/kira-research-report/scripts/build-chain.mjs` (`--id <queue id>` | `--all` | `--dry`) turns `industry_players` rows of one country x industry x segment into a published chain (`stats.auto = true`, `stats.group`), one hub per stage, straight-line arrows, confidence medium, verification "From a KIRA report". Needs >= 8 players in >= 3 stages. Never overwrites a chain without `stats.auto` (hand-made coffee). Runs at publish (`batch_runner.md` step 5.3b-5, non-fatal). First auto chain: VN convenience store licensing (23 companies, 5 stages). The page shows an "Automatic draft" banner and disables Market Estimate when no stage has an estimate. Still to do: analyst fixes the arrows and adds stage estimates (the pipeline does not produce them), request-email sender, plan gating. Admin publish/unpublish page ✅ (`/en/admin/chains`, `api/admin-chains.js`, also lists unmatched searches).
  - **Not built yet:** the plan gating (map and counts public, company lists for Annual). (The `chain_requests` email cron, #96, and the admin page, #90, are built.)
- **Owner decision 2026-10-07: tax ID and registered capital are not needed.** A company's identity in v1 is its name, a source link and its website (shown as a link, labelled "group site" or "brand site" when the page belongs to the parent or brand). Concentration rings then rely only on sourced stage-level figures.
- **Rules:** company-level public information only, no personal data. Every analyst upload records its source and licence (paid databases usually forbid redistribution).
- **Open before the S10 build:** (1) coffee verification and website passes are done (2026-10-07); still to do: fill the ~12 websites that block automated fetching and the 3 weakest stages through analyst upload; (2) analyst review of the coffee chain template; (3) wording of the Kira Chain line on the pricing pages.

**Expert transcript library** (proposed 2026-10-06; confirm at S9 start):
- KIRA runs the interviews itself and owns the transcripts (Third Bridge / Arches model).
- Client calls stay private, as with standard expert networks, and are never published.
- Order: **AI-led interviews first** (pilot ~20 transcripts, transcribed + translated into 4 languages). Then a **self-matching marketplace**, VisasQ-lite style: the client posts a question, experts apply, the client picks, and KIRA keeps ~30% of the fee.
- Expert pay: one-off fee per call (~$100–300/hour for VN/ASEAN mid-senior), no revenue share.
- Transcripts: about 60 min, 8–12k words. Expert anonymised by role, the company discussed is named, published after an embargo.
- Compliance:
  - Recorded consent; no material non-public information (MNPI).
  - No serving officials and no current SOE staff.
  - Vietnam personal data protection law (Law 91/2025, Decree 356/2025, in force 2026-01-01).
- Estimated cost: ~$250–500 per transcript in EN, +$120–300 for JA/KO/ZH; ~15–30 transcripts per industry for a useful library.

### Self-running loop (live, PRs #62 + #64)

```
reader searches → published report?            → report page
                → planned topic?                → coming-soon page + "email me when published"
                → covered market + industry?    → auto placeholder topic (proposed) → coming-soon page
                → anything else                 → counted in search_misses (keywords shown in admin)
demand = 3 per email request + 1 per search → /en/admin/topics → owner approves
→ sync-approved-topics.mjs orders the queue by demand → batch runner (EN → JA → KO → ZH → publish)
→ topics.report_id linked → daily cron emails requesters
```

- Topics are filtered automatically: one placeholder per active market × industry pair, so typed strings cannot create pages. The queue is ordered by demand automatically.
- Remaining manual steps:
  - Owner approval of topics (one click; could become automatic above a demand threshold).
  - Kira Chain sample checks.
  - Expert compliance.
  - B2B selling.

### Progress snapshot (2026-10-14, measured in the database and git)

| | |
|---|---|
| Published reports | **127** (+4 retired), EN, JA, KO and ZH on every one |
| New reports since 2026-10-06 | 16 with all 4 languages (10-06: 2 · 10-07: 4 · 10-11: 1 · 10-12: 3 · 10-13: 3 · 10-14: 3). **None between 2026-10-08 and 2026-10-10** (cause not confirmed, likely the account usage limit). Since 10-12 the Routine makes 3 a day, as planned |
| Queue | 1,878 pending · 376 hold · 124 done · 2 in progress |
| Topics | 1,894 queued · 1 requested · 501 rejected. Weekly planner built, **paused** (`planner.weekly_enabled` off) until the owner reviews the queue |
| Company data (`entities`) | **1,131** (250 in May), fed by each report's "Who's who" chapter |
| Kira Chain | 12 chains in the database (auto drafts made at publish). **Paused by the owner since 2026-10-11** (new direction, `project des/memory/project_kira_chain.md`) |
| Kira Experts transcripts | **20** published. Daily runner live in `kira-pipeline` since 2026-10-11 (3 a day) |
| Insights | 310 published (264 cut from report pages, 37 data explainers, 9 older articles); 25 retired. Commentary columns (Insights v2) built, not run yet |
| Exhibit data (Excel/PPT) | 15 reports have data (the 9 backfilled + new reports) |
| Money side | Single report $39–49 (by length), transcript $29, Month $149, Annual $1,190: **all switched on 2026-10-14**. 0 subscriptions yet; 2 old purchases |
| Demand signals | waitlist **0** · topic requests **1** · chain requests **0** · leads 2. Little real demand yet |

### Summary for the owner (2026-10-14)

**Done (in the plan):** S1, S2, S3, S3b, S3c, S4, S5, S5b, S11, S13, S14 (built, paused), S15, S16, S20 (closed by the measurement + 195-page SEO test).

**Live since 2026-10-14 (owner test purchase open):** S7 (Month + Annual), S19 (report $39–49, transcript $29), S12 (Excel/PPT download for buyers).

**Code done, waiting for the owner's go:** S17 (Google Ads tracking), S18 (2–3 day promise), S21 (Ads campaign file, paused).

**Started, not finished:** S9 Kira Experts (20 transcripts, daily runner; marketplace not started) · S10 Kira Chain (prototype, auto drafts, admin; paused by the owner).

**Not started:** S6 Snapshot layer · S8 EPUB / KDP / Google Play / Apple Books · Kira List purchase ($39).

**Done but outside the original plan:** SA owner admin platform · SQ report quality + cover slides · SI insights cut from report pages · SI2 insights v2 commentary columns · SP report files moved to the private archive · SL library and site refresh (coming-soon showcase, coming-soon in the library, filter by analysis, About redesign, new nav). Detail in the table below.

**Owner decisions 2026-10-14:** terms + privacy read ✅ · selling switched on (single report, transcript, Month, Annual) ✅ · single report priced by length: under 20 pages $39 (70 reports), 20–29 pages $45 (41), 30+ pages $49 (16) ✅ · weekly planner on ✅ · commentary columns publish without a draft review (kira-pipeline PR) ✅ · Google Ads: not yet, the owner will say go · Kira Chain: direction still open, parked.

**Owner to-do:** one live test purchase of each (a report, a transcript, Month; Annual is optional since PayPal charges the whole year), check the receipt email, then refund the tests in PayPal.

### Sprints

| Sprint | Scope | Status |
|---|---|---|
| **S1** | Pipeline to cloud routine; queue cleanup; admin "Pipeline health" | ✅ merged (#46, #50); routine "Kira Report Generator" runs 3 times a day (08:53, 10:53, 12:53 Vietnam time) and has published reports since 2026-10-06 |
| **S2** | Taxonomy: countries, per-country market-seeking industries, competency × stage | ✅ approved 2026-10-05 (13 countries, 171 industries, 15 competencies; private `kira-pipeline/taxonomy`) |
| **S3** | Topic Planner + `/en/admin/topics` approval; approved topics flow into the queue | ✅ merged (#48); first lot of 18 topics + 13 level-2 splits approved |
| **S3b** | Self-running loop: coming-soon pages, notify-me, auto placeholder topics, demand-ordered queue | ✅ merged (#62, #64; migrations 027–029) |
| **S4** | Chinese (Simplified): translator step, DB locale constraints, `/zh/` site | ✅ merged (#51); backfill of every older report to ZH done (121 of 121) |
| **S3c** | **Search in 3 layers** (published → planned topic → auto placeholder → Claude Haiku files unknown product searches under a covered industry) | ✅ merged (#62, #64, #69, #89) |
| **SA** | **Owner admin platform** (built 2026-10-07 → 10-11, not in the original plan): report queue and `/en/admin/pipeline` in Supabase (#72), "Needs you today" dashboard card (#75), Health page + metered cost tracking (#77), dashboard warnings (#78), Settings page for values that change without a deploy (#81), Funnel of first-party visitor events (#87, #94 daily cleanup), CRM with one row per email and an owner-sent email (#92, #98), Chains admin (#90) | ✅ merged |
| **SQ** | **Report quality + preview** (2026-10-06 → 10-11): "Who's who" closing chapter feeding the company data (#76), edition year + Opus translation + one full report per fire (#74), 9 cover layouts (#70), PDF overflow fixes (#86), publish reads the new contents and commentary hooks (#83, #97), preview works on iPhone (#93) | ✅ merged |
| **S5** | Website repositioning, Kira Experts + Kira Survey pages, pricing + waitlist, library filters, redesign | ✅ merged (#52–#61) |
| **S5b** | New pricing on the site + waitlist ✅ · "why KIRA" section (5 reasons) on the pricing page ✅ · "Cite this report" box on report pages ✅ (published/updated dates and per-table sources were already shown). **Left:** PPT/Excel exhibit download (needs the pipeline to emit exhibit data; moved to S12) | ✅ merged (#66); PPT/Excel left for S12 |
| **S12** | PPT/Excel download of a report's exhibits: pipeline writes each exhibit's data, export endpoint, button on report pages for subscribers | 🟡 built 2026-10-12; 15 reports have data (9 new-layer reports backfilled + new reports from the runner); ~112 older reports have none (different chart style) |
| **S10** | **Kira Chain v1** (owner, 2026-10-06: build last). **UX decided 2026-10-07**: network view of value-chain groups joined by flow arrows (prototype PR #73). Left: data model (`chains`, `chain_stages`, `chain_flows`, `chain_memberships`) on the Phase R tables, registry + analyst-upload ingestion, ~10 priority VN industries, links from reports | 🟡 last (UX ✅; generic search + chain page prototype built, see notes) **2026-10-11: owner changed direction (searchable, downloadable partner lists, shown on a country map) and paused the work.** The daily email to readers whose requested chain is published is built (#96), auto drafts are made at publish (12 chains in the database), admin page `/en/admin/chains` built. Details in the Kira Chain memory note and PR #99 |
| **S11** | On-demand production, revised 2026-10-06 (owner: no delivery date on pages; reader-requested topics approve themselves, no human step). Mine: coming-soon pages and the topic API show no ETA, and every status maps to an explicit state (a reader-created `requested` topic was wrongly shown as "in production"). **Owned by the session "Report search with placeholders":** auto-approval of reader topics and the `requested` / `source` schema | ✅ PR #68 (rest with the search session) |
| **S13** | **Topic queue review** (owner, 2026-10-06): current topics are too high level, so reports read as generic and nobody opens them. For every country × industry, break the topic down one more level, and build topics from the keywords readers search most. Inputs: `topics.search_count`, `search_misses`, `topic_requests` (almost empty today, so keyword research outside the site is needed at first), the 18 queued and 57 held topics. Output: a re-planned queue the owner approves. Starts once the search session's auto-approval has landed. **Done 2026-10-07 for all 15 countries (v2).** A topic is one market segment in one country + one lens (a KIRA brain question type), with a decision-level buyer question, 4-6 guiding questions (the chapters) and a "must cover" list of deals, rules and dates. 375 approved topics replace 516 narrow ones (merged ones are `rejected` with `signals.merged_into`). `topics.priority_score` (migration 038) orders the queue after demand. The topic brief passes `lens`, `segment` and `must_cover` to the BRAIN route; the queue sync refreshes pending titles and drops pending rows of merged topics. Facts flagged VERIFY need a check before writing| ✅ |
| **S14** | **Weekly topic planner** (owner, 2026-10-07): every Monday a Routine adds ~6 segment-level topics per country (15 countries) from reader demand first (placeholders, email requests, empty searches), then fresh research; same topic rules as S13 v2. **v2 (2026-10-12): trend-driven.** Scans the last 14 days of news per country/industry, then boosts a live topic whose subject is in the news (priority base + 40 + 20 x strength; expires after `planner.trend_days`, default 28) or adds a new topic where a segment/analysis is missing; quota per country = `planner.topics_per_country` +1 core / -1 small market. Procedure + scripts in private `kira-pipeline/taxonomy/planner*`; owner settings `planner.*` on `/en/admin/config`; each run on `/en/admin/health` | ✅ built (kira-pipeline #5, routine created; first run 2026-10-12) |
| **S15** | **Topic reframe: segment × standard analysis** (owner, 2026-10-12): topics read too narrow (one event-led question each, from buyer questions found on JP/KR/TW business-association sites). Kept the level-2 segments; each topic is now one segment × one standard analysis (market overview, competitive landscape, customer insight analysis, distribution analysis, pricing, value proposition, market entry strategy, partner landscape, investment analysis, M&A landscape, regulatory landscape, growth strategy), keyed to the brain question type so its storyline is the spine. Title = `Country segment analysis`; buyer question and chapters come from private `kira-pipeline/taxonomy/analysis_types.json`; report title = `Country segment year: analysis`. Market overview first: 296 overviews added, so the queue holds 336 overviews (priority 70-100) ahead of the other analyses (about 10-50). Round 2: the five core analyses added per segment by parent industry, live queue 1,892 topics. 30 cross-industry rule topics (FDI screening, visas, tax, sanctions, data law, RHQ) parked; 2 duplicates merged. One-line hook per topic (all 1,887 written individually): cover subtitle, line under the report title and under the library-card title (`preview.hook`, no migration; see CLAUDE.md). Weekly planner (S14) follows the same rules; it stays paused until the owner has reviewed the queue | ✅ |
| **S7** | Subscription billing (PayPal Subscriptions, entitlements, download caps): only if the waitlist shows demand | 🟡 code done: Month $149 (#113) and Annual $1,190 (#116) built, both switched off; owner test purchase open |
| **S9** | Kira Experts transcript library: AI-led interview pilot (~20) → library → self-matching marketplace | 🟡 started 2026-10-07/11: transcript library in Supabase with listing, free opening and paywall (EN, #84); 20 transcripts published; daily runner live in the private repo since 2026-10-11 (3 a day, ja/ko/zh, listing thumbnails #120). Admin page `/en/admin/transcripts` (#125). $29 purchase built, switched off (S19). Left: `OPENAI_API_KEY` secret for thumbnails, owner review of the daily batches, self-matching marketplace |
| **S6** | Snapshot layer (3–5 page template) | 🔴 later |
| **S8** | Distribution: EPUB export, KDP/Google Play/Apple Books | 🔴 later |

| **S16** | Email deliverability (paid search prerequisite) | ✅ done 2026-10-12 (#106): DNS verified, instant confirmation email, bounce/complaint webhook |
| **S17** | Google Ads attribution: click id → sign-up → conversions back to Google; privacy page | 🟡 code done (#107), owner steps open (link GA4 ↔ Ads, auto-tagging, review `/en/privacy`) |
| **S18** | Coming-soon pages promise delivery in 2–3 days; requested topics jump the queue; promised-date alert | 🟡 code done (#108); owner decides whether to add runner fires |
| **S19** | Impulse pricing ($49 report · $29 transcript · $39 list · $149 month) + single-report checkout on | 🟡 code done (#109, #112): $49 report and $29 transcript checkout, `/en/terms` draft; both switched off (owner reads terms, turns on, one live test). Kira List $39 not built |
| **S20** | Topic expansion to ~10,000 coming-soon pages, no LLM; pilot + thin-content test before indexing | ✅ closed 2026-10-12: measured, template pages would be >70% duplicate; owner chose the 1,892 real topics as the ad landing set |
| **S21** | Google Ads launch: Ads Editor CSV, price in the ad, negatives, 3–4 week measured test | 🟡 campaign file + negatives built (paused); Google Ads steps and the test wait for the owner |
| **D1–D7** | **Kira Data: free open data by API** (owner, 2026-10-14): macro / trade / FDI series + company moves (investment, new subsidiary, M&A) for the 15 markets; every free source, no paid ones. See "Open data" below | 🟡 D1 built 2026-10-14, D2 built 2026-10-15 (see blocks); D3–D7 next |

Work done outside the original sprint list (2026-10-12 → 10-14):

| Sprint | Scope | Status |
|---|---|---|
| **SI** | **Insights cut from report pages** (owner, 2026-10-13): each published report gives one insight = its executive summary + first chart page, in EN/JA/KO/ZH, no model writing (`scripts/make-insight.mjs`); runs after every publish; 118 backfilled; 25 table-only "key data metrics" insights retired; insight cover slides | ✅ merged (#122, #126, #130, #131) |
| **SI2** | **Insights v2 = trending commentary columns** (owner, 2026-10-14: report extracts do not help SEO/AEO/GEO): daily scout → write 3–5 columns with KIRA's view, winners/losers, predictions, FAQ, dated sources → fact-check → ja/ko/zh; saved as **draft** | 🟡 built (#134 + kira-pipeline runner), not run yet; owner sets `INSIGHTS_PUBLISH_STATUS=published` after reviewing the first batch |
| **SP** | **Paid report files kept private** (owner, 2026-10-13): full report HTML/JSON moved from this public repo to private `kira-pipeline/report-archive/` (`scripts/archive-batch.mjs`), `outputs/` git-ignored; free preview sliced to 5 pages at upload and again on every response | ✅ merged (#122, #128). Old files are still in this repo's git history (purging it is a separate owner decision) |
| **SL** | **Library + site refresh**: report cover slide on report page, library, home and link previews (#118, #121); coming-soon showcase (CSS covers, sample slides, planned contents for 195 topics, #123); coming-soon topics in the same library list with a Status filter (#124); home counts include coming-soon (#127); library filter by **analysis** instead of investor stage (migration 056, #132); About page redesign + company history (#129); nav + footer reorganised around the current products (#133) | ✅ merged |
| **SX** | **Small fixes**: competitor names removed from 2 reports (`7b64f9a`); S12 PowerPoint charts keep negative values (#119) | ✅ merged |

#### S7 — Month subscription ($149 / month, PayPal Subscriptions) — built 2026-10-12, switched OFF
Owner decision: the Month plan = every report in full online + every transcript + 5 PDF downloads per billing period. Annual ($1,190, 60 PDF + Kira Chain) was built the same day (see below), also switched off.
- [x] Migration 052 (applied): `billing_plans` (the PayPal product/plan, created once on the first checkout and remembered), `subscriptions` (one row per PayPal subscription; mirrors PayPal status; `welcomed_at` for the one welcome email), `subscription_pdf_downloads` (one row per reader, report, language, billing period).
- [x] `api/_lib/subscription.js` + `api/_lib/paypal.js`: plan setup, refresh from PayPal (no webhook needed: a row is re-checked when it is older than 10 minutes, a just-approved one every 15 seconds), `activeSubscription()`, period dates from PayPal (`last_payment` / `next_billing_time`), the PDF allowance (`claimPdf`: the same PDF again in the same period is free).
- [x] `api/subscription.js`: `GET` status (settles a just-approved subscription, sends the welcome email once), `POST ?action=create` (403 `checkout_closed` while the switch is off, 409 if already subscribed), `POST ?action=cancel` (stops the next charge; access continues to the end of the paid period).
- [x] Entitlements: `library-verify` (a subscriber owns every report), `library-content` (full text; no PDF link, shows `pdf { used, limit }`), new `library-pdf` (counted PDF link; 429 `pdf_limit_reached`), `isEntitled()` for transcripts. A reader who bought the single report still gets its PDF without counting.
- [x] Settings (`/en/admin/config` → Checkout): `checkout.subscription_enabled` (default **off**) and `subscription.pdf_per_month` (default 5).
- [x] Pages: `/<locale>/subscription` (EN/JA/KO/ZH: offer, status, PDF usage, cancel, return from PayPal), report page (Subscribe button, counted PDF button, all "get access" buttons point to the subscription page while it is on sale), transcript lock card, pricing pages (Month card becomes "Subscribe"), `/en/terms` has a subscription section, `/en/admin/health` shows active / cancelling / stuck subscribers.
- [ ] **Owner:** read `/en/terms` (subscription section), switch on "Sell the Month subscription" in `/en/admin/config`, then make **one live $149 subscription yourself** and check: the PayPal approval, the welcome email, reading a report in full, one PDF download (the counter goes 0 → 1), and cancelling (the PayPal side shows it cancelled; access stays to the end of the period). Cancel your test subscription afterwards, or ask PayPal to refund the month.
- [x] **Annual ($1,190 a year) built 2026-10-12, switched OFF.** Same machinery as Month, no migration (`subscriptions.plan` already existed): `PLANS` in `api/_lib/subscription.js` (PayPal plan `year-1190-usd`, interval YEAR; one PayPal product serves both plans), `POST /api/subscription?action=create` takes `plan: 'month' | 'year'` (default month; 400 `unknown_plan`; 403 while that plan's switch is off), `GET /api/subscription` returns `plans { month, year }` and the reader's `plan`. Settings: `checkout.annual_enabled` (default off, separate from the Month switch) and `subscription.pdf_per_year` (default 60, counted per yearly billing period). A reader holds **one** subscription at a time (the existing unique index): Month → Annual means cancelling Month and subscribing when its paid period ends (no upgrade button; no proration). The subscription page shows both plans; the pricing page's Annual card becomes "Subscribe" and the lead line lists what is on sale; the welcome email and `/en/admin/health` name the plan; `/en/terms` covers Annual (a started year is not refunded, except a broken promise: fix or refund the part still to run; draft for the owner). The Annual card says transcripts are included (like Month). Report and transcript pages still promote Month only.
- [ ] **Owner (Annual):** read `/en/terms` again (the Annual wording and the refund line are my draft); decide whether to keep the "Kira Chain, as it launches" line on the Annual card while Kira Chain is unbuilt (it is also in the terms); switch on "Sell the Annual subscription"; make one live $1,190 test purchase and cancel it (PayPal charges the full year at once; refund it in PayPal).
- [ ] Not built: upgrade from Month to Annual with credit; a webhook (renewals and lapses are noticed the next time the subscriber or an access check looks, so a lapsed subscriber can keep reading until the first check after the lapse, at most about 10 minutes after PayPal ends the subscription); an admin button to cancel or refund (do it in the PayPal dashboard); coupons; team seats.

Build order (owner, 2026-10-06): S5b ✅ → S11 ✅ → S13 ✅ → S14 ✅ → S15 ✅ → S7 🟡 (code done) → S9 🟡 → S12 🟡 (code done) → S6 → S8 → **S10 Kira Chain last** (paused).
Paid search track (owner, 2026-10-12): **S16 ✅ → S17 🟡 → S18 🟡 → S19 🟡 → S20 ✅ → S21 🟡**: all code is done; what is left is owner steps (terms, switches, Google Ads).

### Open data: Kira Data (planned 2026-10-14, owner: "làm hết trừ các nguồn trả phí")

**Goal.** Pull free economic data and company moves for the 15 markets by API, store them in Supabase, and show them where readers already are: report pages, coming-soon pages, company pages, plus a few new data pages. Paid sources (Panjiva, Volza, fDi Markets, OpenCorporates, Toyo Keizai) are out. Sample proposal with real Vietnam data (private page, owner only): https://claude.ai/artifact/FfRC6a4LVriStMnpJ3TWuW

**Research (2026-10-14, 4 checks, official pages read where reachable).**
- Global, all 15 markets: World Bank WDI, IMF (WEO / DataMapper / SDMX), UN Comtrade, ADB KIDB, ASEANstats, UNCTADstat, WITS, OECD, BIS, ILOSTAT, FAOSTAT.
- National APIs that work today (no key, or a free key): ABS (AU, SDMX, CC BY 4.0), Korea Customs on data.go.kr (HS 10-digit × country, monthly, unrestricted use), e-Stat (JP, incl. customs HS 9-digit × country; credit mandatory), BOJ API (launched Feb 2026), KOSIS + ECOS (KR), Stats NZ ADE (Infoshare retires early 2027), OpenDOSM + BNM (MY; OpenDOSM limit 4 calls/min; no HS × partner trade), PSA OpenSTAT (PH, PXWeb; trade by commodity × country and approved FDI by investor country), SingStat Table Builder + data.gov.sg (SG Open Data Licence), BPS WebAPI (ID, free key; trade by HS), BOT gateway (TH, token) and MOC "API Data Exchange" (TH, HS × country, parameters to test), Vietnam NSO PXWeb (`pxweb.nso.gov.vn/api/v1/vi/`, annual yearbook tables only).
- Files or web only (scrape or download): VN Customs, SBV, FIA monthly FDI; BOI (TH), MIDA (MY), BKPM (ID); JETRO + MOF outward FDI (JP), Korea Eximbank ODI (KR), Taiwan MOEA / data.gov.tw CSV; Cambodia, Laos, Myanmar, Brunei (CamStat may have SDMX, to test).
- Company names, free API: OpenDART (KR: share acquisitions, overseas subsidiaries, mergers), EDINET v2 (JP: 5% holdings, tender offers, affiliate lists; PDL 1.0), SEC EDGAR full-text (US: 8-K deals, Ex-21 subsidiaries), GDELT DOC API (news, all 15; max 1 call / 5 s), GLEIF (CC0, parent links). Registries: Houjin Bangou + gBizINFO (JP), GCIS (TW, directors and shareholdings), ACRA (SG), ABN + ASIC (AU), NZBN (NZ). VN, ID, PH, MY, TH, KH, LA, MM, BN have no free registry API.
- Importer/exporter names by shipment exist only at paid vendors whose licences forbid republishing: out of scope.

**Licence rules (decide what may be shown publicly).**
- UN Comtrade free tier is for internal use; republishing needs a paid re-dissemination licence. So Comtrade feeds the report pipeline and internal checks only. **Trade numbers on the site come from national customs APIs** (KR customs, JP e-Stat, SingStat, PSA, BPS…), which allow commercial reuse with credit; partner-reported ("mirror") data covers the hosts without an API.
- IMF: commercial reuse needs written permission (copyright@imf.org) → owner action before IMF forecasts go on the site. World Bank WDI: CC BY 4.0 per dataset (confirm per dataset in the Data Catalog).
- Each source gets a row in a licence register (`data_sources`: licence, attribution text, public yes/no); a block renders only sources marked public and prints the credit line the source requires.

**Organisation (benchmarked against Trading Economics, OEC, Statista, Crunchbase/DealStreetAsia, JETRO/KOTRA).**
- One taxonomy everywhere: country × industry/segment (existing `tax_*`, `topics`) × company (`entities`). A segment maps to HS codes (`hs_segment_map`) so trade data attaches to reports and coming-soon pages.
- Do not compete with Trading Economics on "Vietnam GDP". KIRA's own value is the join: macro + Japanese/Korean/Taiwanese company moves + KIRA segments + report findings, in JA/KO/ZH.
- Page types:
  - Country data hub `/<loc>/data/<country>` (15): ~12 headline indicators with sparklines, FDI by source country, trade partners, latest moves, reports.
  - **Investor corridor** `/<loc>/data/<investor>-in-<host>` (flagship, ~40: JP/KR/TW × hosts): investment flow and stock, bilateral trade by top HS chapters (partner customs), timeline of company moves, companies present, related reports. The page a Japanese or Korean buyer searches for (ベトナム 日系企業 進出).
  - Moves feed `/<loc>/data/moves` with filters (host, investor, industry, type); no page per event, events live on company pages.
  - Embedded blocks (no URL): "Market data" + "Recent moves" panel on report pages, coming-soon pages (gives the 1,892 placeholders unique, updating content) and company pages.
  - A few indicator pages only where they help market entry (FDI, wages, retail, trade); index only pages that pass a data-sufficiency check, the rest `noindex`.
- Every block: one dated, sourced lead sentence (template + numbers, no model), chart, period covered, "updated" and source line.
- Free vs paid: charts, latest values, 5-year view, last 10 moves per corridor are free; full history, Excel/PPT export (reuse S12), full moves history and alerts are for Month/Annual. Before checkout is on: "Email me new Japanese investments in Vietnam" captures leads.
- Moves come in tiers: filing (DART/EDINET/EDGAR) > official release > news (GDELT). News-only moves are drafts until a rule or the owner confirms them.

**Data model (proposed).** `data_sources` (licence register), `econ_series` (source, country, indicator, partner, product_code, freq, period, value, unit, release_date, retrieved_at), `econ_indicators` (catalogue, labels in 4 languages), `hs_segment_map`, `company_events` (entity, counterpart, host country, investor country, type, stake, value, date, source_url, tier, status draft/published). Fetchers run as scheduled GitHub Actions jobs (daily filings, weekly/monthly series), write through the service key, and log to `job_runs` so `/en/admin/health` shows stale series.

**Sprints (each starts when the owner says go).**
| Sprint | Scope |
|---|---|
| **D1** | Data layer (tables above, licence register) + World Bank + IMF (internal until permission) + ABS/KR customs/e-Stat; country data hub for the 15 markets (noindex until reviewed) |
| **D2** | Remaining national APIs: OpenDOSM, BNM, PSA, SingStat/data.gov.sg, BPS, BOT, Thai MOC, KOSIS/ECOS, BOJ, Stats NZ, VN NSO PXWeb |
| **D3** | Segment ↔ HS map; "Market data" panel on report and coming-soon pages; the report pipeline reads the same series (Comtrade allowed there) |
| **D4** | Company moves: OpenDART, EDINET, EDGAR, GDELT → `company_events`, rules + review queue in admin; moves feed + corridor pages |
| **D5** | Registries + GLEIF: Houjin Bangou/gBizINFO, GCIS, ACRA, ABN/ASIC, NZBN → enrich `entities` (legal name, status, parent), detect new subsidiaries of JP/KR/TW groups |
| **D6** | File/scrape sources: VN Customs, SBV, FIA, BOI, MIDA, BKPM, ASEANstats FDI, JETRO/MOF, Korea Eximbank, Taiwan MOEA, CLMB national files |
| **D7** | Paid layer: full history + Excel export + moves alerts for subscribers; "email me new moves" lead form; JA/KO/ZH lead-sentence templates; sitemap for pages that pass the data check |

#### D1 — data layer + country data pages (built 2026-10-14)
- [x] Migration 057 (applied): `data_sources` (licence register, `public` flag), `econ_indicators` (18 series, labels EN/JA/KO/ZH), `econ_series` (one row per indicator × country × period). RLS on, no policies; only the server reads and writes.
- [x] Sources: World Bank WDI (13 indicators, 14 markets, 2000–2025; CC BY 4.0 read on the data catalog page; **public**). IMF WEO through the official SDMX API `api.imf.org` (5 indicators incl. Taiwan and projections; **not public** until the IMF agrees). The IMF DataMapper URL refuses server requests (bot protection), so it is not used.
- [x] Backfill 2026-10-14: 4,587 World Bank values + 2,400 IMF values, loaded inside Supabase with `pg_net` (same parsing as the code).
- [x] Weekly refresh: Vercel cron `/api/cron-econ-refresh` (Mondays 04:10 UTC, `api/_lib/econ.js`), logs `econ-refresh` in `job_runs`, shown on `/en/admin/health`.
- [x] `GET /api/econ` (15 markets with headline values) and `GET /api/econ?country=vietnam` (all public indicators); rows from non-public sources never leave the server.
- [x] Pages (noindex, not in nav or sitemap): `/<loc>/data/` (15 market cards) and `/<loc>/data/<country>` (template lead sentence, 8 tiles with sparklines, growth chart, 6-year table, source line, link to the library filtered by country), EN/JA/KO/ZH. Files `public/en/data/{index,_view}.html`, `public/js/econ-view.js`, `public/css/data.css`.
- Taiwan has no World Bank data; its page says the national statistics office is being added (D2: DGBAS), or shows IMF once permission arrives.
- Moved to D2: ABS (its CPI moved to a new monthly dataflow; Australia already has the World Bank annual series), Korea customs and e-Stat (need the owner's free keys).

#### D2 — national APIs (built 2026-10-15)
- [x] Migration 058 (applied): `data_sources.env_key` (a source whose key is not in Vercel yet is skipped and named "waiting for key" on `/en/admin/health`), `econ_indicators.country_code` + `params` (`params.group` = same kind of series across markets, `params.currency` for local-currency values), new table `econ_flows` (reporter × partner × product × flow × period: trade, direct investment, visitors).
- [x] No key, live: PSA OpenSTAT (PH quarterly GDP, monthly CPI, trade by partner, approved FDI by investor country), Bank of Japan (yen per US$, call rate, Japan's direct investment in and from 10 of our markets + ASEAN, monthly), VN NSO PXWeb (industrial production, wages incl. foreign-owned firms, urban population), OpenDOSM (MY quarterly GDP, CPI, IPI, exports/imports, visitor arrivals by country), BNM (ringgit rate, OPR), SingStat (SG quarterly GDP, CPI, exports/imports by market, visitor arrivals by country).
- [x] Built, waiting for the owner's key: e-Stat (`ESTAT_APP_ID`, Japan trade by partner and HS2, own cron Tuesday), Korea customs via data.go.kr (`DATA_GO_KR_KEY`, own cron Wednesday), Bank of Korea ECOS (`ECOS_API_KEY`), Bank of Thailand (`BOT_API_TOKEN`). ECOS and BoT stay `public = false` until their terms are read at key sign-up.
- [x] `GET /api/econ?country=` adds national series and `flows`: each link summed over the last 12 months / 4 quarters / latest year, with the window before it for the change. HS-level rows stay for D3.
- [x] Country page: "Latest monthly and quarterly figures" tiles and a "Trade, investment and visitor links" table (from either side's statistics, e.g. Japan's direct investment in Vietnam from the BoJ), EN/JA/KO/ZH.
- Not built: BPS Indonesia (site blocks automated reads; build when the key exists), KOSIS and Stats NZ (not needed: ECOS has Korean CPI, Stats NZ's API has no CPI/GDP), ABS (World Bank covers Australia annually), Thai MOC, DGBAS Taiwan (moved to D6, files).
- Owner: BoJ asks to be told when a service using its API goes public: email post.rsd17@boj.or.jp when the data pages are linked.

**Owner actions (click-through).** Register free keys: OpenDART, EDINET, e-Stat, data.go.kr, KOSIS, ECOS, BPS, BOT, Stats NZ, Houjin Bangou (takes 2–4 weeks: start first). Email copyright@imf.org for IMF reuse. Claude prepares each form's text.

### Paid search: Google Ads on long-tail, buyer-intent queries (discussed 2026-10-11/12)

**Goal (owner):** spend only on searches from people who want to buy now. High conversion rate matters more than traffic.

**Findings that shaped the plan**
- Past site traffic is mostly bots (owner, 2026-10-12). It is not used as a baseline, so the first ad weeks are a measurement test, not a revenue plan.
- **Long-tail search converts better; "cheap CPC, very high conversion rate" is not proven.**
  - NP Digital (40 companies, branded terms excluded): 1-word keywords convert at 0.17%, 3 words at 1.02%, 6 words at 1.94%.
  - Search Engine Land (~500k keywords): the most profitable keywords are 15–30 characters, not the longest.
  - DSA evidence is vendor case studies only (ForRent CPC −30%, TUI conversion rate +50%), with no independent controlled study.
  - Gemini's claim that Shopee, Amazon and Euromonitor run this exact setup could not be confirmed.
- **Dynamic Search Ads are being retired:** Google moves them to AI Max for Search; the automatic upgrade starts February 2027. KIRA does not build on DSA. It uses keyword ad groups generated from our own topics (CSV import with Google Ads Editor), plus AI Max with URL inclusions later if wanted.
- **One ad group per exact title with exact match is mostly unservable** ("Low search volume"). Ad groups therefore use the search-style name of the topic (phrase + exact), not the full title.
- **The ad's landing page needs no Google indexing.** Ads can point at noindex pages, so the ad landing pages (S20) and SEO indexing are decided separately.
- **Scaled content abuse:** Google has issued manual actions since June 2025 against mass template pages that add no value. A penalty could also pull down the real reports, so the 10,000 pages are tested before they are indexed (S20).
- **Break-even math:** at $49 and about $1.50 per click, at least 3% of clicks must buy just to cover the ad spend, before production cost.
- **Email deliverability is broken today** (DNS checked 2026-10-12):
  - `kiraresearch.com` SPF only includes Google (`include:_spf.google.com`), not the sender Resend uses.
  - No DKIM record for Resend was found at `resend._domainkey`, and there is no DMARC record.
  - Mail from `noreply@kiraresearch.com` is therefore likely to land in spam or be rejected by Gmail/Yahoo bulk-sender rules. The "email me when published" promise depends on it, hence S16 first.
- **Topic titles (updated 2026-10-12):** S15 renamed the queue topics to `Country segment analysis` (e.g. "Vietnam coffee chains market overview"), which already reads like a search query. S20 and S21 still check a sample of titles against Search Console queries and alert the owner if they do not fit.

**Decisions locked (owner, 2026-10-12)**
- **Price in the ad text**, e.g. "Vietnam Coffee Market Report 2026 · $49". Readers looking for free data skip the ad, which filters intent for free. The landing page must show the same price.
- **Impulse pricing** replaces the 2026-10-06 table, so a reader can buy without a company approval step:

  | Item | Price |
  |---|---|
  | Report | **$49** (range $39–49) |
  | Expert interview transcript | **$29** (range $19–29) |
  | Company list (Kira List) | **$39** (range $29–39) |
  | Monthly subscription | **$149** |
  | Annual subscription | to be decided |

  Reference: HBR case studies sell at ~$8.95 each to individuals and ~$4.25 inside coursepacks; HBR earns on volume.
  **Open:** what the $149 month includes so that it beats buying 3 reports (proposal: whole library online + 5 PDF + transcripts).
- **Coming-soon pages collect email only.** No paid pre-order.
- **Delivery promise: 2–3 days** from the first request, not 10. The promise lengthens automatically when requests pile up. Throughput (reports per day) is a setting the owner can raise.
  - Measured 2026-10-12: about 5 reports **per week** (5 `done` events in the week of 2026-10-05), with 388 pending in the queue.
  - Holding 2–3 days means requested topics jump the queue and the runner fires often enough.
- **10,000 topics:** generate them without an LLM from the taxonomy (1,175 active country × industry pairs × lenses). Index them only if the thin-content test passes; otherwise keep noindex and index gradually by demand.
- **Search with no result → placeholder → email** (S3b) is the same system as the ad landing pages. Everything below applies to both.

**Already working (checked 2026-10-12)**
- A coming-soon URL `/<locale>/reports/<topic-slug>` turns into the report once it is published. `api/topic.js` returns `{ published: <report slug> }` when `topics.report_id` points to a published report, and `reports/_view.html` redirects with JS.
- **Gap:** the report slug differs from the topic slug (e.g. `2027-id-ev-charging-market-assessment` → `indonesia-ev-charging-2026`), and the redirect is client-side only. An ad URL or an indexed coming-soon URL therefore does not pass a server-side 301. S18 fixes this.
- `topic_requests` (3 points) and searches (1 point) already raise queue priority, and the daily cron `/api/notify-topic-published` emails requesters at publish.

#### S16 — Email deliverability (owner DNS clicks + small code) — ✅ done 2026-10-12 (PR #106)
DNS check on 2026-10-12 (public lookups): no Resend records at the usual names (`resend._domainkey`, `send` MX/TXT) and no `_dmarc` record; the root SPF only includes Google; Google's own DKIM (`google._domainkey`) exists. The Resend dashboard is the source of truth for the exact records, so the owner reads them there.
- [x] Owner, Namecheap → Domain List → Manage → Advanced DNS (click-through guide in chat):
  - open Resend → Domains → kiraresearch.com and add every record it lists (DKIM TXT at `resend._domainkey`, SPF TXT and MX at `send`), then press Verify until it reads Verified;
  - add a DMARC TXT record: host `_dmarc`, value `v=DMARC1; p=none; rua=mailto:<owner inbox>` (monitor first, tighten later);
  - leave the root SPF (`v=spf1 include:_spf.google.com ~all`) as it is: Resend sends from the `send` subdomain.
- [x] Owner: Resend → Webhooks → Add endpoint `https://kiraresearch.com/api/email-webhook`, events `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`; copy its signing secret into Vercel as `RESEND_WEBHOOK_SECRET`, redeploy.
- [x] Verify with a test send to Gmail: "Show original" shows SPF pass (`send.kiraresearch.com`), DKIM pass (`d=kiraresearch.com`, selector `resend`) and DMARC pass (p=none); the webhook stored the `delivered` event 2 s after sending and the request row was marked confirmed (2026-10-12). Outlook not tested.
- [x] Instant "we got your request" email when a reader leaves an email on a coming-soon page (`sendTopicRequestConfirmation`, plain text + one link, Reply-To = first `ADMIN_EMAILS` address). Capped so the form cannot mail strangers: 3 per address per 24 h, 10 per IP per hour (`topic_requests.confirmed_at`, migration 047); the request itself is always saved. The expected date is added by S18.
- [x] On-page message after sign-up in EN/JA/KO/ZH: check the inbox and spam, add noreply@kiraresearch.com to contacts.
- [x] A returning reader sees "you asked" on the same URL instead of the form (the browser remembers, `localStorage`); the URL itself becomes the report when published, so the page never depends on email alone.
- [x] Resend webhook `api/email-webhook.js` (Svix signature check, stale/forged calls refused): events go to `email_events`, hard bounces and spam complaints to `email_suppressions` and `api/_lib/email.js` never mails them again. `/en/admin/health` shows delivered / bounced / spam counts for 30 days and turns red above a 5% problem rate or any complaint. Migration 047 applied.
- Email text is English only for now (same as the "report ready" email); JA/KO/ZH copy can follow when real readers from those markets arrive.

#### S17 — Google Ads attribution — 🟡 code done 2026-10-12, owner steps open
Found on the way: the footer links **/privacy and /terms returned 404 on every page** (no such files). Google Ads and any page that collects emails need a working privacy notice, so S17 adds `/en/privacy` (ja/ko/zh rewrite to it). **Terms is still missing** and needs the owner's commercial decisions (refunds, licence of a report), so it was not drafted.
- [x] `public/js/track.js`: on a landing with `gclid` / `gbraid` / `wbraid` or `utm_source`, the click is kept in `localStorage` (`kira_attr`, 90 days, last click wins) and added as `attr` to the JSON body of `/api/topic-request`, `/api/waitlist` and `/api/leads` (by wrapping `fetch`, so no form was edited). Off for Do Not Track, admin, previews, localhost. A landing with a click id but no `utm_source` is labelled source `google-ads` in the funnel (separate from organic `google`).
- [x] Server: `api/_lib/attribution.js` keeps only known keys with length limits; stored in `attribution jsonb` on `topic_requests`, `waitlist`, `leads` (migration 048, applied). Purchases get the same when checkout is switched on (S19).
- [x] GA4 key event `generate_lead` (`lead_type` = request_email / waitlist / lead) fires after each successful sign-up through `window.gtag` (exposed by `nav.js`).
- [x] `GET /api/admin-ads-conversions` (admin): Google Ads offline-conversion CSV (click id / GBRAID / WBRAID, conversion name, UTC time, value, USD) from tagged sign-ups, last 1-90 days. Conversion names: `KIRA email request`, `KIRA waitlist`, `KIRA enquiry`. Values are owner settings on `/en/admin/config` → Google Ads (`ads.value_request` 5, `ads.value_waitlist` 15, `ads.value_lead` 100 USD; placeholders, the owner sets what a sign-up is worth).
- [x] `/en/admin/funnel`: "From Google Ads" block (tagged sign-ups per type and per campaign tag) and the CSV download button; source label "Google Ads (paid)".
- [x] `/en/privacy` written from what the site really does (draft for the owner to review: legal entity name, retention promises, contact route; EN only).
- [ ] Owner (Claude in Chrome prompt in chat): link GA4 property `G-N1891GBDCB` to the Google Ads account; turn on auto-tagging; create the Google Ads conversion by importing the GA4 key event `generate_lead` as the primary conversion. The CSV conversions are a cross-check (create them as separate secondary actions with the three names above) so one sign-up is never counted twice as primary.
- [ ] Owner: add a final-URL suffix in Google Ads `utm_source=google&utm_medium=cpc&utm_campaign={campaignid}` (S21 sets it per campaign).
- [ ] Owner decisions: review `/en/privacy`; decide Terms (S19 needs it before taking payment from ad traffic).
- Known gap: Google Analytics already loads for every visitor with no consent banner. Ads must target outside the EEA/UK (S21) until a consent banner exists.
- Not done: cost per sign-up (needs ad spend: enter it by hand or read it from the Ads API in S21).

#### S18 — On-demand delivery in 2–3 days — 🟡 code done 2026-10-12 (migration 049)
Findings that shaped it: one runner fire already makes a whole report (EN → JA → KO → ZH → publish, about 60–100 min), so no "EN first" step is needed. The Routine "Kira Report Generator" has cron `53 1,3,5 * * *` UTC = **3 reports/day** today; the "ready by" date follows that capacity. A reader-made placeholder topic (`requested`) never entered the queue without the owner's approval, and queue priority did not honour first-asked-first-made.
- [x] Owner settings on `/en/admin/config` → "On-demand reports": `ondemand.target_days` (3), `ondemand.reports_per_day` (3: tell the site the real speed; it does NOT change the Routine, raise the cron first), `ondemand.auto_approve_per_day` (10).
- [x] "Ready by" date: `api/_lib/eta.js` = today + max(target days, ceil((reports ahead + 1) / reports per day)); "ahead" = requested topics that asked earlier and are not published + planner reports being made right now (SQL `topic_queue_ahead`, migration 049). With nobody ahead it is exactly the target; when many readers ask, the date moves out by itself. Shown on the coming-soon page in EN/JA/KO/ZH (`/api/topic` returns `eta`) and in the confirmation email ("We expect to publish it by 15 October 2026").
- [x] Queue: a topic with at least one email request goes to a "requested band" (`api/_lib/queue-band.js`: priority 90000 minus the 10-minute slot of its first request) so it is made before every planner topic, in the order first asked (the promise to each reader holds). `queue.mjs sync-topics` applies it on every fire. Owner's "Run first" (max + 1) still goes above it. Tested with mocked data: early request > later request > planner topic.
- [x] A reader-made placeholder (`requested`) or an unapproved planner proposal approves itself when someone leaves an email, up to `ondemand.auto_approve_per_day` per 24 h (each one costs a full report); the next fire queues it.
- [x] First request records `topics.promise_at` (once). `/en/admin/health` → "Promised dates" turns red when a requested report is past its date, with the names and what to do (more fires, then raise "reports per day").
- [x] Same URL after publish: the coming-soon URL still redirects to the report in the browser, and now **keeps the query string** (`gclid`, `utm_*`). A server-side 301 would need edge middleware on every page; not worth it. Ads that point at a topic page still land correctly, and S21 builds final URLs from the current state (published → report URL).
- [ ] Owner: decide whether to add runner fires (Routine "Kira Report Generator", cron in claude.ai Routines; guide in `cloud_routine.md`), then set "reports per day" to match. Until then 3 reports/day means a 3-day promise holds for the first ~2 requested topics in line; beyond that the date moves out (about 1 day per 3 extra requests).
- Moved to S19: showing "$49 on publication" on the coming-soon page. The pricing pages still say $299 and checkout is off, so a price on that page now would contradict the rest of the site.
- Known: the one test request made on 2026-10-12 (Laos data centres) is a real request, so that report will be made first at the next fire.

#### S19 — Impulse pricing + checkout
- [x] Price on the coming-soon page ("Price when published: $49", EN/JA/KO/ZH, `api/topic.js` returns `price`). Shown only while checkout is on, so the page never advertises something that cannot be bought.
- [x] Pricing pages (EN/JA/KO/ZH) and locale files: single report $49; Month $149 now includes expert transcripts (owner decision 2026-10-12: whole library online + 5 PDF + transcripts); note that a transcript is $29 outside a plan. Annual stays $1,190.
- [x] Migration 050 (applied): `living_reports.price` default 49 and the 125 published reports moved from 39 to 49; `build-publish-sql.mjs` default 49; `api/_lib/pricing.js` holds the fallback.
- [x] Single-report checkout behind a setting: `checkout.single_report_enabled` on `/en/admin/config` → "Checkout" (default **off**). `/api/library-report` returns `purchaseEnabled`; `reports/_view.html` reads it instead of a hard-coded constant; `/api/library-buy?action=create` answers 403 `checkout_closed` while off (a capture of an order already started still completes).
- [x] `/en/terms` (draft; ja/ko/zh rewrite to EN): licence for internal use, 7-day refund if the PDF was not downloaded, refund if the report is not as described, desk-research limits, liability capped at the price paid. Governing law and legal entity name left out on purpose.
- [ ] **Owner:** read `/en/terms`, then switch on "Sell single reports" in `/en/admin/config`. Do one live $49 test purchase and check the receipt email (S16) before any ad money.
- [x] Pricing page CTAs: when `checkout.single_report_enabled` is on, the single-report card says "Browse the library" and links to `/<locale>/library`, and the lead line says single reports are on sale (`js/pricing-live.js`, reads the new public `GET /api/checkout-status`; off = unchanged).
- [x] Transcript purchase ($29, one purchase = every language): migration 051 `transcript_purchases` (applied), `api/transcript-buy.js` (PayPal create/capture, receipt email), `isEntitled(user, transcriptId)` = admin or a completed purchase, lock card on `/<locale>/experts/transcripts/<slug>` offers "Buy full transcript — $29" and finishes the capture when PayPal returns. Behind its own switch `checkout.transcript_enabled` (default **off**). `/en/terms` now covers transcripts (refund only if not as described, since the text opens at once).
- [ ] **Owner:** switch on "Sell expert-interview transcripts" after reading `/en/terms`; test with one live $29 purchase (a double purchase of the same transcript is logged as `DOUBLE PURCHASE` in the function logs, refund it by hand).
- [ ] Kira List purchase ($39): when Kira List ships.

#### S12 — Exhibit data download (Excel + PowerPoint), built 2026-10-12
- [x] **Data:** each new report writes `outputs/batch/<id>/exhibits.json` with the numbers behind every exhibit (format in the header of `api/_lib/exhibits.js`; instructions in `prompts/brain_route.md` → "Exhibit data"; runner `batch_runner.md` step 2b check + 5.3b-4b publish). Stored in table `report_exhibits` (migration 053, applied; RLS on, no policies, service key only).
- [x] **Checks:** `scripts/check-exhibits.mjs --id` fails on a malformed entry, an exhibit printed in `en.html` that is neither listed nor `skipped` (with a reason), or a title that is not printed. `scripts/publish-exhibits.mjs --id` re-checks and stores. Both are **not fatal** in the runner: a report without exhibit data just has no download buttons.
- [x] **Download:** `GET /api/library-exhibits?slug=&format=xlsx|pptx` (signed in; bought the report, Month subscriber or admin; nothing is counted). Excel = a contents sheet + one sheet per exhibit. PowerPoint = a cover + one slide per exhibit: native, editable PowerPoint charts (bar, column, stacked, line, pie; bars start at zero) or a table; source line and page on each slide. Over 4.3 MB it answers 413 (use Excel); at most 60 exhibits per report.
- [x] **Page:** `/api/library-content` returns `exhibits` (count); the report page shows "Exhibit data" with the two buttons in the owner's box (buyer and subscriber), in 4 languages. Text inside the files is English.
- [x] **First real data:** `indonesia-ev-charging-2026` (20 exhibits, 1 skipped bubble chart), written by hand from the published report as the format test; the other published reports have none.
- [x] **Backfill trial (2026-10-13):** `scripts/dump-exhibits.mjs --id` prints what an existing report's exhibits show (tables, SVG labels with x,y); an agent turns it into `exhibits.json` (rules in the brief: only printed numbers, tables copied, no-value diagrams under `skipped`, `check-exhibits.mjs` must pass). Done for 3 reports: VN coffee chains (24 exhibits + 3 skipped), TH data centres (19 + 1), SG Employment Pass (18 + 0); with the first report, **4 of 121 published reports have data**. Spot-checks against the page matched (stacked outlets 2019 split, payback sensitivity, colocation split, salary-threshold bars). Cost per report: about 2 minutes of agent time. Findings the agents made while reading: TH "Data centres by operator" bars add to 57 sites but the text says "of 60" (13 for "Unlisted others" may be 16); TH p7 nested pools (cloud ~67 + colocation ~7-10 = 74-77) exceed the printed 73; SG COMPASS table rows C5/C6 look garbled (20-point cells).
- [x] **Backfill of the other 5 new-layer reports (2026-10-13, owner: "chạy nốt")**: `indonesia-ev-charging-market-entry-2026` (15 exhibits + 2 skipped), `indonesia-imported-food-2026` (22 + 1), `malaysia-online-marketplaces-2026` (21 + 2), `vietnam-convenience-stores-2027` (23 + 1), `vietnam-convenience-store-licensing-2026` (14 + 2). **All 9 reports that use the new exhibit layer now have data (176 exhibits).** Exporter fix found on the way: PowerPoint column/bar charts were forced to start at 0, which clipped negative values (P&L costs, GS25 loss, import-value declines); the zero baseline is now forced only when every value is non-negative, and category labels move to the low side when a value is negative.
- [ ] **Content issues the agents found in published reports (owner decision 2026-10-13: do not edit published text now; none of the true figures could be verified from here, and a fix means 4 languages + PDF + preview). Check against the cited source at the next refresh of each report:**
  - `thailand-data-centres-2026`: "Data centres by operator" bars add to 57 sites (13+8+4+3+3+3+10+13) but the text says "of 60 sites" (NT 13 + AIS 8 + True 4 = 25 of 60); "Unlisted others" may be 16. p7 nested pools: cloud ~67 + colocation ~7-10 = 74-77, above the printed 73.
  - `singapore-ep-salary-benchmarks-2026`: COMPASS points table, rows C5 and C6 (the 20-point cells) read as garbled (C5's 20/10 depend on nationality share; C6 has no 20-point case).
  - `indonesia-ev-charging-market-entry-2026`: speed-class exhibit says "4,655 units, end-2025" while its own footnote and the province exhibit say 4,778 (two sources: Kontan Jan 2026 vs ESDM Feb 2026); first exhibit prints 103,300 for Jan-Aug 2026 against 103,931 for all of 2025 (a data point, not an error).
  - `indonesia-imported-food-2026`: halal deadline printed as 17 Oct 2026 on one marker and 18 Oct 2026 on another (p23) and "18 Oct" on p24; p18 says +35.5% in 2025 but the printed bars give about +36.2%; p30 subtitle mentions a "brand edge" score that the p29 table does not have.
  - `vietnam-convenience-store-licensing-2026`: "9,703 stores counted" does not equal the nine listed chains (9,393, so about 310 stores sit in unnamed chains); 9,703 minus 1,322 foreign = 8,381, not the printed ~8,100.
  - `vietnam-convenience-stores-2027`: the summary says ~0.25% of retail goods sales, the exhibit prints 0.2-0.25% (its own figures give 0.19-0.26%); "Net new stores: All convenience chains +120" equals the five foreign chains' change (1,322 minus 1,202), not the census total (1,450), so the label may overstate its scope; Hanoi prime rent is 120-180 USD/m² in one exhibit and "USD 100" in the break-even exhibit.
- [ ] **Not yet backfilled:** About 112 older reports use the previous chart style (`chart-title` / `class="chart"` markup, no `exhibit-title`), and most of their folders have no `naming.json`; they need a different dump and a slug mapping first.
- [ ] **Not built (older note):** backfill for the ~100 older reports (their charts are drawn SVG with no data behind them; each would need its numbers re-entered, a Routine could do it from `en.html`); exhibit text in JA/KO/ZH; a table with more than one table inside one exhibit keeps only the first (the sample's last exhibit); exhibit data for a report that is later re-generated is replaced only when `publish-exhibits.mjs` runs again.
- [ ] **Owner:** after the next report is generated by the runner, check that `exhibits.json` exists in its folder and that `check-exhibits` passed (fire summary). Try the buttons on `/en/reports/indonesia-ev-charging-2026` as a subscriber or buyer (the admin account also works).

#### S20 — Topic expansion to ~10,000 (no LLM) + thin-content test
**Measured first (2026-10-12, before generating anything), on the 1,892 live topic pages:**
- Frame text (the 4–5 guiding questions) is shared: a lens has only 1–4 distinct question sets across all its pages (e.g. 339 market-entry pages use 3 sets). It is ~400 characters per page.
- What is unique per page: title + buyer question ≈ 145 characters (27% of the page); with the written hook and the 2–3 "must cover" facts ≈ 410 characters (50%, about 60 words). 40 pages have no must-cover facts.
- Real per-pair data is almost empty: `tax_country_industry.why_domestic` is null, `evidence` is a one-line note, `signals` is `{}`; the companies table covers only VN and JP.
- So a generated page for the other ~8,000 pair × lens combinations would carry only a title and a templated buyer question: about 100–150 characters (<30%) of its own text, 70%+ shared with its siblings. That is the thin / near-duplicate pattern Google's scaled-content policy targets, and it would not pass the ">~80% shared = merge or drop" rule below.

**Decided by the owner 2026-10-12: proposal accepted. No template pages are generated; S20 is closed by the measurement. The ~200-page SEO test (second bullet) stays optional and unscheduled.**

**Proposal (replaces the 10,000-page plan):**
- [ ] Do **not** generate ~8,000 template pages. Ads do not need pages to be indexed, so the pages only have to exist for the topics we advertise; the 1,892 real topics (plus anything readers request) already are that set.
- [ ] S21 builds ad groups from those 1,892 topics (one ad group each, search-style names); no new pages needed.
- [x] **SEO test built 2026-10-12 (owner: "SEO thử ~200 trang").** ~195 English coming-soon pages are indexable; every other placeholder stays `noindex`.
  - Which pages: the flag `topics.signals.seo_test = true` (no migration). Chosen as one **market overview per segment**, so no two test pages share their "must cover" facts: status `queued`, no report yet, hook and must-cover present, at most 14 per country by score (BN 8, KH 13, LA 11, MM 9 are all they have) = 195. Remove the flag to take a page out.
  - What changes on a flagged page: `api/topic.js` returns `index: true` + `hook`; `js/coming-soon.js` skips `noindex`, sets the meta description (hook + buyer question) and drops the hreflang links (JA/KO/ZH twins stay `noindex`); `sitemap-en.xml` lists the page without hreflang (`api/sitemap.js`, block 3c); once the topic has a report it leaves the sitemap and the page redirects to the report.
  - **Limit, said plainly:** the title, description and text are set by JavaScript (like every report page today), not in the raw HTML. Google renders JavaScript, but if the pages come back "Crawled – currently not indexed" it can mean thin content OR slow rendering; the two cannot be told apart from this test alone.
  - Read-out (owner, Search Console, EN property): after 4–6 weeks open Indexing → Pages and filter by the sitemap-en.xml URLs. Many "Indexed" and some impressions = the pattern works, a larger set can follow. Mostly "Crawled – currently not indexed" = stop, keep ads as the only traffic. Do not add pages in the meantime.
- [ ] If the owner still wants more pages: only where the DB has real data for that pair (published report, companies, transcript), measured with the shingle test below.
- [x] **Coming-soon showcase (2026-10-13, owner: "làm bước 1 và 2, thêm tab Coming soon").** Every unpublished topic page now looks like a report that is about to land:
  - **Step 1 (free, no image generated):** the page cover is one of six CSS designs picked by a stable hash of the slug; "A look inside" shows five grey sample slides (layout only, labelled "Preview on publication", captions = the planned page titles, or the guiding questions when nothing is planned); the waitlist form and the "ready by" date are unchanged. 4 locales (`js/coming-soon.js`, `css/research.css`).
  - **Step 2 (planned contents for the 195 SEO-test topics):** 15 parallel writers (one per 13 topics) produced 5 chapters with 2–4 page titles each (14–18 pages per topic, 4,123 titles), checked by `scripts/check-planned-contents.mjs` (descriptive titles only: no figures except years, no claims, no framework or brain-internal names, chapter count = guiding questions) and stored in `topics.signals.planned` by `scripts/publish-planned-contents.mjs` (no migration; re-running replaces). `api/topic.js` returns `planned`; the page shows "Planned contents" with the note that titles can change. Wording is plain data, never a finding.
  - **The runner picks it up:** `fetch-topic-brief.mjs` puts `planned_contents` in the topic brief and `brain_route.md` (Step A.0 and Step C) starts the page plan from it: chapters kept in order, every listed page covered, titles turned into action titles once the evidence is in, free to add/merge/drop. Nothing from it counts as evidence.
  - **Library: coming-soon topics in the same list (owner, 2026-10-13: "tag report coming soon, đưa vào bộ filter, list chung hết").** No tab. `GET /api/library-list?status=all|soon|published` (default published only, so the home page and live-counts are untouched; an explicit status also folds the queue into the sidebar counts). Published reports come first, then topics by priority; the page boundary is computed server-side. Sidebar group **Status** (Published / Coming soon) plus the usual market, sector, year and stage filters, which now cover topics too: sector through `tax_industries.sector` (migration 055: 36 level-1 industries mapped to the 12 library sectors, children inherit; a new industry stays NULL until someone sets it), stage through the competency stage (explore/enter/expand = XPL/ENT/XPN), year, text in the title. Snapshot type (S) has no topics. Rows: ribbon cover, "Coming soon" chip, hook, "Contents planned" chip, "Get notified". Code in `api/_lib/soon.js` + `js/library.js`; an empty text search still shows the request forms of `/api/topic-search`.
  - Not done on purpose: AI cover images for placeholder pages (the CSS cover is free; a medium-quality image is roughly $0.06 each at the old model's rate, to be priced on `/en/admin/pipeline`). Planned contents for the other ~1,690 topics (same procedure: `in_NN.json` batches of 13 → writers → check → publish; about 2 minutes and ~110k tokens per batch of 13).

Original plan, kept for reference (not started):
- [ ] Generator from the taxonomy: active country × industry pairs × lenses (market assessment, market entry, regulatory, competitors, distribution…). Template text only, no model calls; `source = 'generator'`, outside the production queue until requested.
- [ ] Pilot 500 first (noindex); near-duplicate share (shingle similarity), unique words per page, share of real data; pages sharing >~80% with a sibling are merged or dropped.
- [ ] Google's verdict: index a cohort of ~200 pilot pages for 4–6 weeks and read Search Console → Pages ("Crawled – currently not indexed" = stop).
- [ ] Full run only after the pilot passes. Sitemap split by 5,000 URLs.

#### S21 — Google Ads launch (measured test)
Owner 2026-10-12: set up only, do not run ads yet. Everything below that touches Google is prepared paused.
- [x] Campaign file for Google Ads Editor (`api/admin-ads-campaign.js`, `api/_lib/ads-campaign.js`; button on `/en/admin/funnel`): one ad group per topic page (the 1,892 live topics, best score first, 100 per file via `?offset=`), 4 phrase + 4 exact keywords each, one responsive search ad each, final URL = the coming-soon or published page. Campaign, ad groups, keywords and ads are all **Paused**; daily budget and max CPC are parameters (`budget`, `cpc`, defaults $20 and $1.00).
  - Headlines ≤30 characters, descriptions ≤90 (Google's limits), checked in code.
  - "Ready in about N days" uses `ondemand.target_days`; the "Report from $49" headline is written only while `checkout.single_report_enabled` is on.
  - **Not verified against a real Ads Editor import** (no account access from here): if Editor rejects a column, send me the error text.
- [x] Shared negative keyword list (`?kind=negatives`, 36 phrases: free, pdf free, wikipedia, ppt, thesis, assignment, jobs, salary, "what is", definition…). Paste into one shared list in Ads and attach it to the campaign.
- [ ] Owner, in Google Ads (when the owner says go): import the file; set location (JP, KR, SG, TW, US… outside the EEA/UK first) and review language; attach the negative list; link GA4 and import `generate_lead` as the primary conversion; enable auto-tagging.
- [ ] Bidding: Manual CPC with a cap. Move to Maximize conversions only after ~15–30 conversions per month from S17.
- [ ] 3–4 week test at a small daily budget. Review the search terms report every week and add negatives.
- [ ] Read-out by product and lens: CPC, CTR, cost per email, cost per purchase.

Open issue (found 2026-10-06): the production database has a `topics.source` column (`planner` | `reader`) and a `requested` topic status that no migration in `main` defines; main's code only knows `proposed`. The session "Report search with placeholders" owns this work and must commit that migration and teach `admin-topics`, `sync-approved-topics` and `topic-search` about `requested`.

Note: the Annual plan on the pricing pages says "Kira Chain, as it launches"; with Kira Chain last, revisit that line.

**Parallel owner work:**
- Ask ~10 corporate-planning (経営企画) / new-business staff at JP/KR firms looking at Vietnam whether they would pay $299 per report and $149/month, and which products they would look up in Kira Chain.
- Recruit experts (manager/director level is fine).
- Cheap checks:
  - A free AlphaSense / Third Bridge trial to count existing Vietnam transcripts.
  - Price requests to Arches and Konnect.

### Market evidence (research 2026-10-06)

Prices are list prices found online; many are secondary sources.

| Channel | Price |
|---|---|
| JETRO / KOTRA / MOFCOM country and industry reports | Free |
| JETRO mini survey | ¥11,000/unit, ~2 months |
| KOTRA market research | ₩150,000 per item |
| VIRAC VN quarterly industry report | $260–460 |
| B&Company 10–20 pp report | ~VND 15M, made to order |
| FiinResearch sector report | $2,500–3,000 |
| Yano ASEAN-4 food (JA) | ¥198,000 |
| Mordor / IRL / BRG VN titles via GII (JA storefront) | ¥330k–1M ($2,100–6,350) |
| NNA POWER ASIA, Vietnam edition (news only) | ¥21,800/month |
| SPEEDA | ~¥1.6M/ID/year |
| Statista | $2,388–7,788/year |
| Custom VN desk research for JP firms | ¥100k–1M ("over ¥1M is expensive") |
| Expert calls | GLG / AlphaSights / Guidepoint ~$1,200–1,450/hour; VisasQ ~¥100k/hour full service, ~¥30k/hour self-matching (lite, 70% to the expert) |
| Transcript library seats (Tegus / AlphaSense) | $13–65k/user/year |

- Japanese SMEs (SMRJ 2024, n=310) rank "no reliable local partner" (32%) and "sales channels" (27%) above "don't know demand" (16%). This supports Kira Chain.
- Syndicated research and advisory are under AI pressure: Forrester revenue −8% in 2025, Gartner stock −71% from its peak.
- Vietnam transcripts on the global libraries look very thin. Arches (Tokyo, HCMC office) sells a transcript library on Bloomberg, focused on Japan.

---

## Status snapshot, original phases 1–10 (written 2026-05-20, statuses refreshed 2026-10-14)

Legend: ✅ done · 🟡 partial · 🔴 not started · ⏸️ owner blocked

| Phase | Title | Status | Notes |
|---|---|---|---|
| 1 | Report unit foundation | ⏸️ | Henry's Claude-chat workflow; outside repo build |
| 2 | Brand & copy rewrite (EN) | ✅ | All 4 sprints done — `b9e28fd`, `4dba4b5`. Removal cleanup finalized in `a8a9206` (29 legacy files gone). |
| 3 | Library infrastructure | ✅ | 3.1 + 3.2 + 3.3 all done (`ffde22e`, `60b00bb`, `1a46491`, `87cd168`, `8bcb6d4`). Sitemap + hreflang shipped. |
| 4 | Admin backend | ✅ | 4.1–4.4 all done (audit log, transactions, users, aggregators: May 2026). Grown far beyond the plan in Phase S (SA: pipeline, health, config, funnel, CRM, chains, transcripts) |
| 5 | Tool demotion + Studio kill | ✅ | Redirects all wired (`692d907`, `74c21c0`). 5.3 credit-system + profile.html resolved in `a8a9206`. Sprint 5.1 service-line subpages rebuilt EN/JA/KO this session — `/custom-research/{market-analysis,strategy-builder}` now live as senior-analyst-led service landings (no functional AI tool). |
| 6 | Report population | ✅ | 127 published (target 50+), made by the cloud Routine, 3 a day. 6.3 aggregator submission not done (owner) |
| 7 | SEO + Insights engine | 🟡 | 7.1 ✅, 7.2 ✅ (insights from report pages, SI; commentary columns SI2 built), 7.3 sitemap + schema/OG + GSC sitemaps ✅. Left: internal linking beyond related insights; read the S20 SEO test in Search Console (~late Nov 2026) |
| 8 | JA layer | 🟡 | 8.1 ✅, 8.2 ✅ (every report has JA), 8.4 ✅. Left: 8.3 GIIResearch submission (owner), native QA |
| 9 | KO layer | 🟡 | 9.1 ✅, 9.2 ✅ (every report has KO). ZH added on top (S4). Left: 9.3 KO aggregator (owner), native QA |
| 10 | Polish & launch | 🟡 | Mobile check at 390px + image weight done (2026-10-06). Left: Lighthouse run, real-phone check, turning payments on, soft launch |
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
- [x] Remove platform-era DB tables + buckets + RAG functions (Supabase advisor RLS-leak cleanup) — migration `006_drop_legacy.sql` written 2026-05-21, drops 6 tables + 2 functions + 2 storage buckets (~155 objects / ~38 MB). Keeps `user_credits`/`credit_transactions`/`credit_costs`/`custom_reports` per Custom Research backend earmark in `project des/CLAUDE.md`.

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
- [x] Audit log table — shipped this session. Migration `009_audit_log.sql` creates `audit_log` (actor_email + action + resource_type + resource_id + diff jsonb + request_path/method, indexed by created_at/actor/resource). `api/_lib/audit.js` exposes `logAudit()` — fire-and-forget, never blocks the response, diff truncated past 8KB. Wired into `admin-reports`, `admin-insights`, `admin-transactions`, `admin-aggregators`, `admin-upload-pdf`. `/en/admin/audit` viewer at `api/admin-audit.js` — filters by actor/resource_type/action, expandable per-row diff, append-only by design. Audit sub-nav link added to all 7 admin pages.

### Sprint 4.2 — Reports management
- [x] `/admin/reports` list view với filter/search/sort
- [x] `/admin/reports/new` — upload form (PDF + metadata)
- [x] `/admin/reports/[id]/edit` — edit form với locale tabs
- [x] Per-report sales stats — `/api/admin-reports` GET list now joins purchases and returns `stats: { completed, refunded, revenue }` per report. List view shows Sales · Revenue column + summary strip (total sold / gross / refunded). Traffic (page views) deferred until Vercel Analytics has data.
- [ ] `/admin/reports/featured` — featured reports drag-drop reorder — **deferred** (needs `featured` + `featured_rank` columns on living_reports; revisit when Henry wants to manually curate the library landing)

### Sprint 4.3 — Transactions + Users — ✅ DONE (2026-05-21 session)
- [x] `/en/admin/transactions` list với filter chips by status (all/completed/refunded/pending/failed) + locale + slug query params
- [x] `/en/admin/transactions` click-to-expand detail (buyer email, report title, PayPal order id, captured timestamp, download history)
- [x] Manual refund action — Year 1 flips DB status to `refunded` (actual PayPal money refund still manual via PayPal dashboard; UI labels this caveat explicitly)
- [x] `/en/admin/users` list (read-only roll-up: email, total_spend, completed/refunded counts, locales_bought, first/last purchase)
- [ ] `/admin/revenue` dashboard với charts — **deferred**, partly covered by Sprint 4.1 dashboard KPI cards
- [ ] `/admin/users/[id]` per-user detail — **deferred**, low Year 1 value

### Sprint 4.4 — Leads + Aggregators
- [x] `/admin/leads` Custom Research inquiries
- [x] `/admin/aggregators` submission tracking — Sprint 4.4 (this session). `/en/admin/aggregators` has Submissions + Sales tabs with add-row forms, per-aggregator + per-status filters, KPI summary cards (submissions by status, sales count, net revenue), inline status edit + delete. Backed by `aggregator_submissions` + `aggregator_sales` tables (migration 007).
- [x] `/admin/aggregators/revenue` manual commission entry — merged into the Sales tab above (gross + commission% + net fields per sale, currency, buyer country, notes). Per-aggregator net revenue surfaced in the summary cards. No dedicated revenue charts page (deferred — Year 1 doesn't need viz yet).

**Deliverable:** 🟢 Core admin CRUD usable for reports/insights/leads/transactions/users/aggregators. Commits: `714375a`, `b2174fe`, `fc9b83b`, Sprint 4.3 + 4.4 (this session). Pending: audit log, report stats/featured, revenue charts.

---

## 🟡 Phase 5: Tool Demotion + Studio Kill (Week 4-5) — P1 — 🟡 PARTIAL

**Goal:** Clean up site IA, demote tools, kill Studio products

### Sprint 5.1 — Demote 3 generation tools
- [x] Move `report.html` → `/custom-research/market-analysis` — service-line landing page rebuilt across EN/JA/KO. 6 new files at `public/{en,ja,ko}/custom-research/market-analysis/index.html`. Hero + when-to-commission + what-we-cover + typical deliverable + CTA → parent form anchor. Sitemap entries added. Legacy `/report` redirect retargeted from landing → this subpage.
- [x] Move `strategy-builder.html` → `/custom-research/strategy-builder` — same treatment. 6 new files. Legacy `/strategy-builder` redirect retargeted.
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
- [x] **PDF upload + Storage delivery pipeline (item D)** — admin uploads PDF via `/en/admin/reports` → `/api/admin-upload-pdf` writes to private bucket `reports-pdfs/{report_id}/{locale}.pdf` and stores the path in `report_translations.pdf_url`. `/api/library-content` resolves storage paths into 1-hour signed URLs at delivery time; external URLs pass through for aggregator-hosted reports.
- [ ] Implement PDF export (Puppeteer or pdfkit) — owner produces PDFs from Claude chat output for Year 1; in-platform generation deferred
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

### Sprint 6.E — Transactional email (added 2026-05-21, out of original workplan)
- [x] Resend integration via `api/_lib/email.js` (`sendPurchaseReceipt` + `sendLeadNotification`)
- [x] Purchase receipt sent after PayPal capture (fire-and-forget, never blocks the 200 response)
- [x] Admin lead notification sent after `/api/leads` insert (fire-and-forget, reply-to = lead's email)
- [x] Silent no-op when `RESEND_API_KEY` is unset (lets the site run pre-config)
- [x] Smoke tests guard email-import errors + `/api/_lib/` route exclusion
- [ ] Owner: create Resend account + verify `kiraresearch.com` domain via Vercel DNS + add `RESEND_API_KEY` env var (CLAUDE.md owner action 5)

**Deliverable:** 50-100 EN reports live by Week 12, all on aggregators. Receipts + lead notifications flowing once Resend is wired in.

---

## 🟢 Phase 7: SEO + Insights Engine (Week 6-10) — P2 — 🟡 PARTIAL

**Goal:** Drive organic traffic to library (EN first)

### Sprint 7.1 — Insights page
- [x] Build `/en/insights` blog list page
- [x] Article template page `/en/insights/[slug]`
- [x] Auto-pagination — PAGE_SIZE=12, `?page=N` URL param, Prev/Next pager (disabled-edge states), pushState + popstate wired so back/forward works, category change resets to page 1. Pager only renders when total > PAGE_SIZE. EN/JA/KO inline-localized labels. 2 new smoke tests.

### Sprint 7.2 — Content production admin (re-scoped 2026-05-21)
- [x] **Decision: no auto-generation Year 1.** Owner's Claude-chat workflow already produces analyst-voiced content; cron LLM-generation conflicts with "research house, no AI-platform" brand voice. Re-scoped to a content-production admin instead.
- [x] Schedule publish-date — `published_at` datetime input in `/en/admin/insights` editor; future date = scheduled (stays hidden from public until clock catches up). No cron needed: public API filters `published_at <= now()`.
- [x] Draft mode — `status='draft'/'review'/'published'/'retired'` already in schema; admin UI exposes all four. Schedule badge in list view shows "scheduled" + future date when status='published' + published_at > now.
- [x] Each article = teaser for a related library report — `related_report_slugs[]` already in schema + admin UI. Insight `_view.html` renders related-report cards at bottom.
- [x] CTA at end: "Get the full report" — copy upgrade in `_view.html` (was "Reports referenced" + "View →"; now "Get the full report" headline + intro paragraph + per-card "Get the full report →" CTA).

### Sprint 7.3 — SEO optimization
- [x] Schema markup (Article, Product) on every report — Product + BreadcrumbList JSON-LD injected on `/[locale]/reports/[slug]`; Article + BreadcrumbList injected on `/[locale]/insights/[slug]`; Organization JSON-LD injected globally by `nav.js`. Item 7.3-remainder.
- [x] Open Graph + Twitter Card per report — dynamic `_view.html` templates now fill OG (title/description/url/locale/site_name/image) + Twitter Card (summary_large_image) per-report on data load; static pages had OG already.
- [ ] Internal linking strategy — **NOT STARTED**
- [x] Multi-locale sitemap.xml generated dynamically (`6bb331f`, `8bcb6d4`) — sitemap index + per-locale + sitemap-embedded hreflang + per-page hreflang via nav.js. Ready for GSC submission.
- [ ] Submit sitemap to Google Search Console + Bing — **owner task — needs domain ownership verification per locale (`google-site-verification` meta or DNS TXT)**

**Deliverable:** 🟢 Insights index + article shells live (`15e94f2`) + sitemap discovery foundation ready + per-report/article schema markup live. Pending: pagination UI, cron (7.2), internal linking, GSC submission (owner).

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

- [x] Mobile responsive QA on all pages (3 locales) — **code-side:** 7 new mobile-viewport smoke tests at 375×667 (no-horizontal-scroll across `/en/` `/en/library` `/en/insights/` `/en/about` `/en/methodology` `/en/pricing` + nav-burger presence). CI catches regressions on every push. **Owner manual QA** (visual review across iOS/Android Safari/Chrome) still recommended pre-launch.
- [ ] Performance audit (Lighthouse score targets: 90+ on all) — **runbook in CLAUDE.md owner action item 3**: PageSpeed Insights pass on 6 prod URLs.
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

*Last updated: 2026-05-20 (Sprints 2.3, 3.3, 4.1-dashboard, 5.3 closed earlier today via items C, F, H. Item 7.3-remainder shipped this evening — per-report/article schema markup + OG/Twitter + Organization JSON-LD.)*
