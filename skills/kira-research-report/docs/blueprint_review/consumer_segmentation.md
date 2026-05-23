# consumer_segmentation — section-by-section review (v1 persona-led + A+ flex)

> **For Henry to verify.** Mark each section ✏️ to change / ❌ to remove / ➕ to add / ✅ ok. Send back the list, I apply changes.
>
> **Profile:** 16 sections, **16-19 pages** (baseline 16-17 + 0-3 expand pages depending on data richness), B2C-only (F&B, apparel, beauty, mobile, OTT, fintech-consumer, auto-consumer). SEA + JP + KR coverage.
> **Source mix target (Phase L.3 framing):** ~25-35% `[Kira estimates]` / ~65-75% named externals (`[<Source Alias> <Year>]`) — heavier `[Kira estimates]` weight than other blueprints because KIRA synthesizes persona archetypes + WTP bands on top of panel + survey triangulation. Methodology endnote lists every alias.
> **Total query count:** 22 across 6 buckets.

### Source tag system (Phase L.3 — applies to every content page)

Two tag categories only. The deprecated `[primary]` / `[secondary]` / `[estimate]` trio is GONE.

- `[Kira estimates]` — any KIRA-derived figure: persona-cluster synthesis, WTP triangulation, panel cross-tabs the analyst built, model output. Replaces both old `[primary]` AND old `[estimate]`.
- `[<Source Alias> <Year>]` — external citable source. Examples for consumer_segmentation: `[AC Nielsen 2026]`, `[Kantar 2025]`, `[GSO 2024]`, `[BPS 2024]`, `[Statistics Bureau JP 2024]`, `[Statistics Korea 2024]`, `[Sea Group 2025]`, `[Tokopedia 2025]`, `[World Bank HH Survey 2024]`.
- `[user-input]` — UC3 only.

**Source key footer (NEW, every content page):** every page using named-source tags MUST end with a one-line `SOURCE KEY · <alias> = <full citation> · ... · Kira estimates = KIRA in-house analyst triangulation` resolving every alias on that page. Aliases sort alphabetically, `Kira estimates` last. ~280 char cap. Persona pages especially: panel composition disclosure (`n=24 IDI Jakarta + Surabaya, 2025`) goes in the source key footer or methodology endnote, NOT in the page body.

### 3-persona design (NOT 5)

Henry confirmed: **keep 3 personas**, not 5. Cleaner page budget, sharper differentiation. Persona pages cover **largest-value** (Persona 01) · **highest-growth** (Persona 02) · **highest-WTP-or-strategic** (Persona 03). The blueprint enforces `persona_distinctness` as a quality gate — each persona must differ on ≥3 of 8 axes (age band, income tier, geography, frequency, basket size, channel mix, WTP band, dominant value).

### B2C only — poor_fit_signals

Triggers in manifest are F&B / apparel / beauty / personal care / mobile / OTT / fintech-consumer / auto-consumer. **B2B topics route to `market_analysis` blueprint instead** — consumer_segmentation has no B2B firmographic axis, no decision-maker mapping, no procurement-cycle frames. If a topic mixes B2B+B2C (e.g. mobile carriers with both consumer + enterprise plans), the consumer slice routes here, the enterprise slice routes to entry_strategy or market_analysis.

### NEW page type: `persona_profile` (built in Phase I3)

Sections 09 / 10 / 11 use a **brand-new page type** introduced by this blueprint. Single-page deep profile: left rail label strip + 4-block grid on the right (demo stats × 4 / behavior cards × 4 / quote callout / channel-pref horizontal bar / WTP anchor). Slot spec is currently inline in manifest.yaml; will port to `schemas/page_schemas.json` once formalized.

### A+ flex layer (Phase J)

Each section can have up to 3 customization layers:
- **Expand condition** — if data is rich, section grows 1→2 pages. 3 sections have this.
- **Chart options** — 2-3 chart shapes the gen picks based on data. 7 sections have this (persona pages excluded — see below).
- **Overlay emphasis** — vertical-specific bias (fmcg / consumer_durables / services / finserv for consumer banking). Most sections have keys.

**Important:** persona_profile pages have `persona_profile_default` as the **only** chart option. This is by design — the page type has a fixed visual shape (demo stats grid + behavior grid + quote + channel bar + WTP anchor) and the chrome is non-negotiable. No chart-shape branching on persona pages.

---

## §00 Cover — `cover`

**Layout:** Standard KIRA cover — title pattern often `"{country}'s {industry} consumer — segmentation {year}"` + KIRA branding + report ID + confidential tag.

**No A+ flex** (boilerplate).

---

## §01 Methodology (inline) — `methodology_inline`

**Layout:** 2-col overview — panel surveys, statistics bureau anchors, in-depth interviews, NPS / brand-affinity panels, AI-augmented synthesis. **Special callout for WTP triangulation methodology** (since 50% of WTP figures need anchored estimates).

**No A+ flex** (boilerplate).

---

## §02 Contents — `toc`

**Layout:** Auto-generated TOC + page counter.

**No A+ flex** (boilerplate).

---

## §03 Divider — "Consumer segmentation" — `divider`

**Layout:** Dark-mode full-page chapter break. Thesis statement framing the segmentation lens. Example copy: "Three axes, three personas, one decision tree."

**Note (assembly rule):** **Only one divider** in the whole report — persona pages do NOT each get a divider (would push page count over budget). Divider opens the segmentation chapter, then everything from §05 onward flows continuously.

**No A+ flex** (boilerplate).

---

## §04 Executive summary (2 pages) — `exec_summary_p1 + exec_summary_p2_implications`

### Page 1 — exec_summary_p1

**🔍 Synthesized from §05-§14.** No own queries.

**📄 Layout:**
- **4 callouts (top row):** TAM consumers in millions / dominant segment share-of-value / biggest behavioral shift / NPS leader or affinity index
- **2-col narrative:** ~1200 chars, lead with the segmentation thesis
- **1 anchor chart:** segment value share

### Page 2 — exec_summary_p2_implications

**📄 Layout:** 5-card grid — what each segment shift means for market participants. Lead each card with an imperative verb (e.g. "Defend Persona 03 against social-commerce leakage").

### 🎨 A+ Flex

**Chart options for page 1 anchor chart:**
- `share_donut` (default — single-period segment value-share snapshot)
- `segment_bar_horizontal` (if 4+ segments and ranking is clearer than donut)
- `stacked_bar_share_split` (if YoY shift in segment composition is the key story)

**Overlay emphasis keys:** `market_opportunity`, `consumer_behavior`
→ For Vietnam coffee (fmcg): emphasize at-home consumption shift + premium-tier growth
→ For Indonesia mobile (services): emphasize ARPU-tier mix + prepaid-to-postpaid migration
→ For Korea beauty (fmcg): emphasize K-beauty premiumization + global-vs-local NPS gap

**No expand condition** (always 2 pages).

---

## §05 Demographic segmentation — `market_data_chart`

**🔍 Query bucket `01_demographic_anchor`:**
```
1. {country} population by age band {year} {country_stats_bureau}
2. {country} household income distribution {year} consumer expenditure survey
3. {country} urban peri-urban rural population split {year}
```
**Tag mix:** ~80% named externals (national stats bureau aliases — `[BPS 2024]`, `[GSO 2024]`, `[NSO 2024]`, `[PSA 2024]`, `[DOSM 2024]`, `[SingStat 2024]`, `[Statistics Korea 2024]`, `[Statistics Bureau JP 2024]`; `[World Bank HH Survey 2024]`; `[ADB Growth Report 2024]`) / ~20% `[Kira estimates]` (value-cell synthesis on top of raw demo + income cuts)
**Expected sources:** national statistics bureau · central bank household surveys · World Bank household consumption data · ADB inclusive-growth reports

**📄 Layout:**
- **H1:** "Demographic segmentation: age × income × geography"
- **Body:** 2 paragraphs flagging top-2 cells by value contribution
- **Chart:** 3-axis stacked bar OR heatmap (age × income with geo as small-multiples)

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `distinct_demo_clusters >= 5`:
- **Page 1:** keeps consolidated 3-axis chart + top-2-cell narrative
- **Page 2:** adds per-cluster mini-cards (4-5 cards) profiling each distinct demographic cluster with age range, income tier, geography skew, share-of-category-value — buyers see the full demo cube rather than just the top cells
- → For Vietnam coffee with 3-4 dominant cells → stays 1 page
- → For Indonesia mobile with 6+ distinct income-tier × urban-skew clusters → expands to 2 pages

**Chart options:**
- `stacked_bar_share_split` (default — 3-axis demo cube with geo as facet)
- `heatmap_5x5` (when value concentration is uneven, density grid telegraphs hot cells)
- `segment_bar_horizontal` (when 5+ clusters surface — ranked view reads cleaner than cube)

**Overlay emphasis keys:** `consumer_behavior`, `market_opportunity`
→ fmcg: penetration depth × household size framing
→ services: ARPU × age-band framing (Gen Z = mobile-data-heavy, 35+ = bundle-loyal)
→ consumer_durables: nuclear-vs-extended household × replacement cycle framing

---

## §06 Behavioral segmentation — `market_data_chart`

**🔍 Query bucket `02_spending_patterns`:**
```
1. {country} {industry} consumer spending frequency purchase {year}
2. {country} household {industry} share of wallet basket size
3. {country} {industry} purchase frequency repeat rate panel
```
**Tag mix:** ~60% named externals (`[BPS HH Expenditure 2024]` / `[GSO HH Expenditure 2024]`, central bank consumer finance surveys, listed-company investor decks like `[Unilever Q4 2025]` / `[Vinamilk AR 2025]`, academic consumer-behavior papers with disclosed panel n) / ~40% `[Kira estimates]` (frequency × basket cross-tab synthesis typically requires KIRA triangulation)
**Expected sources:** statistics bureau household expenditure survey · central bank consumer finance survey · listed-company quarterly investor decks (basket/frequency disclosures) · academic consumer-behavior papers with disclosed panel n

**📄 Layout:**
- **H1:** "Behavioral segmentation: frequency × spend × loyalty"
- **Chart:** bubble matrix (X=frequency, Y=basket, size=loyalty)
- **4 quadrant callouts** naming each cell
- **Sidebar narrative:** which behavioral cell drives category profit pool

### 🎨 A+ Flex

**Chart options:**
- `bubble_2x2` (default — 3-dim behavioral read with loyalty as bubble size)
- `heatmap_5x5` (when cells are dense — 5×5 grid telegraphs profit-pool faster)
- `segment_bar_horizontal` (when loyalty/NPS data is thin — single-axis ranked view)

**Overlay emphasis keys:** `consumer_behavior`, `pricing`
→ fmcg: repeat-rate × basket-mix framing (private label vs branded)
→ consumer_durables: replacement-cycle × upgrade-frequency framing
→ services: monthly active × ARPU × churn framing

**No expand condition** (always 1 page).

---

## §07 Psychographic segmentation — `market_data_chart`

**🔍 Query bucket `06_cultural_psychographic`:**
```
1. {country} consumer values lifestyle survey {year}
2. {country} {industry} Gen Z millennial consumer behavior
3. {country} sustainability ethical consumption {industry} {year}
```
**Tag mix:** ~55% named externals (consumer values surveys like `[AC Nielsen 2026]` / `[Kantar 2025]`, lifestyle panels with disclosed panel n) / ~45% `[Kira estimates]` (psychographic-cluster placement is largely a KIRA synthesis call)
**Note:** psychographic claims are the highest-risk for stereotype drift. Every values claim needs explicit anchor (named source + year + survey n) or gets tagged `[Kira estimates]` with anchor disclosure in the source key footer.

**📄 Layout:**
- **H1:** "Psychographic segmentation: values × lifestyle clustering"
- **Chart:** 2D cluster scatter with 3 highlighted clusters labeled to match the 3 personas in §08/09/10
- **Body:** bridges into persona pages

**Skip condition:** `topic has no available consumer values data (e.g. ultra-niche B2C with no panel coverage)` → collapse psychographic commentary into behavioral page, drop this section, route one extra persona page in.

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `psychographic_axes >= 4`:
- **Page 1:** keeps 2D values × lifestyle cluster scatter + bridge narrative
- **Page 2:** adds 4+ single-axis profile cards (status-vs-utility, sustainability-orientation, digital-vs-analog, community-anchoring) — each with which-persona-indexes-high read + messaging implication
- → For Vietnam coffee with 2-3 clean axes → stays 1 page
- → For Korea beauty with 5+ values axes (status / clean-beauty / K-pop-affinity / digital-native / minimalism) → expands to 2 pages

**Chart options:**
- `bubble_2x2` (default — values × lifestyle scatter, bubble size = cluster mass)
- `segment_bar_horizontal` (when 2 clean axes don't surface — ranked cluster-by-size)
- `share_donut` (when only 3 well-defined clusters surface)

**Overlay emphasis keys:** `consumer_behavior`
→ fmcg: clean-label / sustainability / convenience-vs-ritual framing
→ services: digital-native / family-anchored / career-first framing
→ consumer_durables: status / utility / heirloom-quality framing

---

## §08 Persona 01 — `persona_profile` ← NEW PAGE TYPE

**🔍 Synthesized from §05-§07** + cluster pass on demo × behavioral × psychographic outputs.

**👤 Profile selection:** largest-value persona (highest share-of-category-value).

**📄 Layout (persona_profile slot spec):**
- **label** (left rail, mono UC, ≤30): persona codename + age band, e.g. `URBAN VALUE-SEEKER · 28-34`
- **headline** (sentence-case, ≤70): persona thesis, e.g. `Buys quality once, refuses subscription churn.`
- **demo_stats_grid:** 4-stat grid (age band / income / location / household) — each stat = `{ number ≤12, unit ≤8, label ≤30 mono UC, source_tag }`
- **behavior_grid:** 4-card grid (purchase frequency / basket size / channel mix / decision driver) — each card = `{ metric ≤14, label ≤30, change_line ≤38, source_tag }`
- **quote_callout:** body ≤180 + attribution ≤40 (e.g. `"F, 31, Jakarta · IDI panel n=24"`)
- **channel_pref_bar:** horizontal stacked-bar SVG, % spend across 5 channels (MT / GT / e-comm / social commerce / direct) + caption ≤110
- **wtp_anchor:** num ≤12 + unit ≤8 + change_line ≤38 + source_tag
- **source_strip:** compressed citation footer ≤110 mono UC

**Char-budget envelope:** ~1400 body chars total. All numerics carry inline source tags.

### 🎨 A+ Flex

**Chart options:** `persona_profile_default` **only** — persona_profile has fixed visual chrome (demo stats + behavior grid + quote + channel bar + WTP anchor). No chart-shape branching. **This is expected behavior** for this page type — keeping the persona triptych visually consistent across all 3 personas is more important than per-persona chart variation.

**Overlay emphasis keys:** `consumer_behavior`, `channel`, `pricing`
→ fmcg: shopper occasion (home / on-premise) + private-label affinity
→ consumer_durables: replacement cycle + financing dependency + warranty sensitivity
→ services: ARPU tier + churn risk + bundle attachment
→ finserv (consumer banking): main-bank loyalty + digital-onboarding tolerance + fee sensitivity

**No expand condition** (always 1 page — keeping persona pages monolithic is part of the design).

**QC rule:** persona must differ from §09 and §10 personas on ≥3 of 8 axes (age band / income / geo / frequency / basket / channel mix / WTP band / dominant value). If not, regen.

---

## §09 Persona 02 — `persona_profile` ← NEW PAGE TYPE

**🔍 Same query buckets as §08** + cluster pass.

**👤 Profile selection:** highest-growth persona (segment expanding fastest in share OR absolute spend).

**📄 Layout:** identical slot spec to §08 (label / headline / demo_stats_grid / behavior_grid / quote_callout / channel_pref_bar / wtp_anchor / source_strip).

### 🎨 A+ Flex

**Chart options:** `persona_profile_default` only (same reason as §08 — page type chrome locked).

**Overlay emphasis keys:** `consumer_behavior`, `channel`, `pricing`
→ fmcg: emerging occasion + new-channel-native behavior (e.g. social commerce repeat buyers)
→ consumer_durables: first-time-buyer cohort + upgrade-path latent demand
→ services: switcher cohort + emerging-tier ARPU
→ finserv (consumer banking): digital-only adoption + neobank trial cohort

**No expand condition.**

**QC rule:** must differ from §08 and §10 on ≥3 axes.

---

## §10 Persona 03 — `persona_profile` ← NEW PAGE TYPE

**🔍 Same query buckets as §08** + cluster pass.

**👤 Profile selection:** highest-WTP-or-most-strategic persona (premium tier / niche-defender / contested segment with structural switching exposure).

**📄 Layout:** identical slot spec to §08.

### 🎨 A+ Flex

**Chart options:** `persona_profile_default` only.

**Overlay emphasis keys:** `consumer_behavior`, `channel`, `pricing`
→ fmcg: premium-tier loyalty + direct-from-brand affinity + experience-buyer behavior
→ consumer_durables: heirloom buyer + service-network sensitivity + brand-equity premium
→ services: top-decile ARPU + cross-product attach rate
→ finserv (consumer banking): wealth/private-banking tier + multi-product household

**No expand condition.**

**QC rule:** must differ from §08 and §09 on ≥3 axes. This is the most "contested" persona slot — orchestrator may swap with §08 if the strategic cluster is also the largest-value cluster (rare but possible in mature markets).

---

## §11 Channel preferences by segment — `market_data_chart`

**🔍 Query bucket `03_channel_preference`:**
```
1. {country} {industry} e-commerce social commerce penetration {year}
2. {country} modern trade traditional trade share {industry}
3. {country} live commerce TikTok Shopee Lazada {industry} share
```
**Tag mix:** ~70% named externals (e-commerce platform investor decks `[Sea Group 2025]` / `[Tokopedia 2025]` / `[Coupang 2025]` / `[GoTo 2025]`, logistics sector reports, industry channel surveys) / ~30% `[Kira estimates]` (per-persona channel-mix attribution typically requires KIRA cross-tab synthesis)
**Expected sources:** e-commerce platform investor decks · logistics & last-mile sector reports · industry trade associations channel surveys · academic retail-channel papers

**📄 Layout:**
- **H1:** "Channel preferences by segment"
- **Chart:** 3 stacked horizontal bars (one per persona) showing % spend across MT / GT / e-comm / social commerce / direct
- **Body:** 2-paragraph narrative on directional shift (typically social commerce vs MT)

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `channel_subtypes_count >= 6`:
- **Page 1:** keeps 3-persona stacked bar + 2-paragraph directional narrative
- **Page 2:** channel-subtype detail view — network diagram of channel touchpoints per persona OR ranked bar of long-tail channels (livestream commerce, group buying, kiosk, vending, agent network) with which-persona-uses-which annotation
- → For Vietnam coffee with 4-5 channels (MT / GT / e-comm / cafe / direct) → stays 1 page
- → For Indonesia mobile with 7+ touchpoints (carrier store / agent / e-comm / social / kiosk / device-bundled / D2C) → expands to 2 pages

**Chart options:**
- `stacked_bar_share_split` (default — per-persona channel-mix stacked bars)
- `segment_bar_horizontal` (when channel-ranking matters more than per-persona composition)
- `network_diagram` (when 6+ subtypes — persona-to-channel touchpoint relationships)

**Overlay emphasis keys:** `channel`, `consumer_behavior`
→ fmcg: MT-vs-GT defensive split + quick-commerce in Tier-1 cities
→ services: app-store-vs-carrier-channel + bundled-vs-standalone
→ consumer_durables: brand-D2C-vs-marketplace + service-network coverage
→ finserv (consumer banking): branch-vs-app + super-app embedded finance penetration

---

## §12 Willingness-to-pay + price sensitivity — `market_data_chart`

**🔍 Query bucket `05_willingness_to_pay`:**
```
1. {country} {industry} price points consumer willingness to pay {year}
2. {country} {industry} premium mass tier price segmentation
3. {country} {industry} Van Westendorp price sensitivity study
```
**Tag mix:** ~50% named externals (academic price-elasticity studies, central bank inflation pass-through research, listed-company ASP disclosures like `[Vinamilk AR 2025]` / `[Masan Q3 2025]`) / ~50% `[Kira estimates]` — WTP is the section most likely to land `[Kira estimates]` because tier-band synthesis layers on top of a published anchor price + elasticity from a comparable category
**Expected sources:** academic price-elasticity studies · central bank inflation pass-through research · industry pricing reports · listed-company ASP and tier-mix disclosures

**WTP triangulation pattern:** anchor on a published median price point × elasticity from a comparable category to back-solve persona WTP bands. **Always disclose anchor in source key footer** (e.g. `SOURCE KEY · Vinamilk AR 2025 = Vinamilk Annual Report 2025 · Kira estimates = KIRA WTP triangulation anchored to Vinamilk gold-tier ASP × Kantar coffee elasticity 2025`).

**📄 Layout:**
- **H1:** "Willingness-to-pay + price sensitivity"
- **Chart:** 3 demand-curve traces (Van Westendorp-style) OR clustered bar of WTP bands per persona
- **4 callouts:** one per persona + one category-wide anchor

### 🎨 A+ Flex

**Chart options:**
- `segment_bar_horizontal` (default — 3 personas × WTP band low/anchor/premium, cleanest comparative when full curves not surfaced)
- `scatter_quality_price` (when quality-perception is paired with WTP — premium-payer geometry)
- `trend_line_3y` (Van Westendorp curves when panel data supplies enough price-acceptance points)

**Overlay emphasis keys:** `pricing`, `consumer_behavior`
→ fmcg: sachet-vs-pack tier + price-pack architecture sensitivity
→ consumer_durables: finance-attach price elasticity + bundle WTP
→ services: ARPU-tier WTP + free-trial-to-paid conversion curves
→ finserv (consumer banking): fee tolerance + interest-rate sensitivity + wealth-tier WTP for advice

**No expand condition** (always 1 page).

**QC rule:** every WTP figure carries either `[<Named Source> <Year>]` OR `[Kira estimates]` with disclosed anchor methodology in the page source key footer.

---

## §13 Brand affinity + switching behavior — `market_data_chart`

**🔍 Query bucket `04_brand_affinity`:**
```
1. {country} {industry} NPS brand affinity survey {year}
2. {country} {industry} brand switching consumer loyalty study
3. {country} {industry} top brands consumer preference panel
```
**Tag mix:** ~65% named externals (`[AC Nielsen 2026]`, `[Kantar 2025]`, listed-company brand-health investor disclosures, industry trade press brand rankings) / ~35% `[Kira estimates]` (NPS / switching-flow synthesis where panel cuts overlap multiple sources)
**Expected sources:** consumer panel providers with methodology disclosure · brand-tracking academic studies · listed-company brand-health investor disclosures · industry trade press brand rankings

**📄 Layout:**
- **H1:** "Brand affinity + switching behavior"
- **Chart:** NPS bars per persona + 3×3 switching-flow Sankey OR top-5 brands affinity table
- **Body:** anchors which persona is most/least loyal
- **3-5 named brands** with disproportionate persona pull

**NOTE:** This is **segment-side analysis, not competitive landscape**. No deep player profiles — those live in `market_analysis` blueprint. Brand mentions here serve persona characterization, not competitor benchmarking.

### 🎨 A+ Flex

**Chart options:**
- `segment_bar_horizontal` (default — NPS/affinity bars per persona)
- `heatmap_5x5` (brand-to-brand switching probability heatmap, when matrix is dense)
- `network_diagram` (Sankey-style switching flow, when specific pathways are named)

**Overlay emphasis keys:** `consumer_behavior`, `competitive_intensity`
→ fmcg: parent-brand-vs-sub-brand NPS + private-label switching
→ consumer_durables: service-network-driven affinity + warranty-period stickiness
→ services: lock-in mechanics (contract / device / loyalty program) + churn pathways
→ finserv (consumer banking): main-bank inertia + neobank trial-to-switch funnel

**No expand condition** (always 1 page).

---

## §14 Implications recap (5 cards) — `exec_summary_p2_implications`

**🔍 Synthesized from §05-§13.**

**📄 Layout:** 5-card grid — one per major persona-anchored move. Each card body ≤360 chars. Lead each card with an imperative verb addressed to market participants.

**Examples:**
- "Price-anchor Persona 01 via [format/SKU/tier]"
- "Defend Persona 03 against social-commerce leakage"
- "Re-platform Persona 02 channel mix toward live commerce"
- "Bundle Persona 01 × Persona 02 to capture cross-occasion frequency"
- "Premiumize Persona 03 with experience-tier SKU"

**Reuses `exec_summary_p2_implications` page type** so we don't invent a third closing format. Mirrors §04 page 2 structure for visual rhythm at report ends.

### 🎨 A+ Flex

**No chart options** (text-heavy implications grid — no chart slot).

**Overlay emphasis keys:** `consumer_behavior`, `market_opportunity`, `channel`, `pricing`
→ fmcg: price-pack + occasion + channel-defense moves
→ consumer_durables: finance-attach + service-network + bundle moves
→ services: ARPU-mix + churn-stop + tier-upsell moves
→ finserv (consumer banking): wallet-share + cross-sell + digital-onboarding moves

**No expand condition** (always 1 page).

---

## §15 Methodology endnote — `methodology_endnote`

**Layout:**
- Source mix breakdown — `[Kira estimates]` share % vs named-external share % (target ~25-35% `[Kira estimates]` — heavier than other blueprints because persona archetypes are KIRA-synthesized)
- **Full alias registry** — every `[<Source Alias> <Year>]` used anywhere in the report resolved to its full citation, sorted alphabetically with `Kira estimates = KIRA in-house analyst triangulation` last
- **Panel composition disclosure:** n=, geography, recruitment method (especially critical — buyers value transparent methodology, doubly so on persona-led work)
- KIRA estimate methodologies disclosed (especially WTP triangulation anchor patterns)
- **Persona-clustering note:** which 3 of 8 axes drove differentiation
- Contact + next research footer

**No A+ flex** (boilerplate).

**Required because:** persona pages live or die on the credibility of the panel disclosure. If a buyer can't see "n=24 IDI Jakarta + Surabaya, 2025" anchored to a quote, the whole persona triptych collapses to fiction.

---

## Summary — page count flex range

| Scenario | Page count |
|---|---|
| **Floor** (no expands trigger, no psychographic skip) | **16 pages** |
| **Baseline** (typical Vietnam coffee / Thailand QSR — 3-4 demo clusters, 4-5 channels, 2-3 psychographic axes) | 16-17 pages |
| **Rich data** (1-2 expands trigger — e.g. Indonesia mobile with 6+ channels, OR Korea beauty with 5+ psychographic axes) | 17-18 pages |
| **Very rich** (all 3 expands trigger — Indonesia mobile or Japan beauty with deep panel + channel + psychographic coverage) | **19 pages** |
| **Skip-psychographic edge case** (ultra-niche B2C with no panel coverage — drops §07 entirely, orchestrator may route a 4th persona in) | 15-16 pages |

## Overlay × blueprint interaction examples

| Topic | Overlay picked | What changes |
|---|---|---|
| Vietnam ready-to-drink coffee consumer segmentation 2026 | `fmcg` | §05 penetration × household-size; §07 ritual-vs-convenience; §11 MT-vs-GT defensive split; §12 sachet-vs-pack price-pack |
| Indonesia mobile consumer segmentation 2026 | `services` | §05 ARPU × age-band; §11 carrier-store-vs-app + bundled-vs-standalone; §12 ARPU-tier WTP + free-trial conversion; §13 churn pathways |
| Korea beauty consumer segmentation 2026 | `fmcg` | §07 K-beauty premiumization + clean-label axes (likely expand to 2 pg); §11 D2C-vs-marketplace; §13 parent-brand vs sub-brand NPS |
| Thailand consumer banking segmentation 2026 | `finserv` | §05 wealth-tier × age; §11 branch-vs-app + super-app embedded; §12 fee-tolerance + interest-rate sensitivity; §13 main-bank inertia + neobank trial funnel |
| Japan compact EV consumer segmentation 2026 | `consumer_durables` | §05 nuclear-vs-extended household × replacement cycle; §11 brand-D2C-vs-dealer + service-network; §12 finance-attach elasticity; §13 warranty-period stickiness |

## Henry's review checklist

For each numbered section, send back ONE of:
- ✅ ok
- ✏️ change: [what to change]
- ❌ remove
- ➕ add new section: [title + brief description + where to insert]
- 🔥 change expand condition: [new condition / drop the expand]
- 📊 change chart options: [add/remove/swap]
- 🎨 change overlay emphasis keys: [add/remove]

Blueprint-level questions:
- 3-persona design final? (Henry confirmed keep 3 — re-confirm before lock)
- Persona slot order: largest-value → highest-growth → highest-WTP-strategic. Swap order? (e.g. lead with strategic instead of largest)
- Section count target (16 base OK? 15-19 page flex range OK?)
- Voice / register OK? (calibrated, persona-driven, anchored)
- B2C-only scope OK? (or should we ➕ thin B2B-consumer crossover for mobile carriers, banking, insurance?)
- `persona_profile` page type slot spec OK? (demo×4 / behavior×4 / quote / channel-bar / WTP-anchor) — anything missing for a buyer to feel the persona is real?
- Overlay vertical assignment OK? (fmcg / consumer_durables / services / finserv — any topic types missing?)
- Quote authenticity rule OK? (must trace to real panel via `[<Panel Alias> <Year>]` OR `[Kira estimates]` composite with anchor disclosed in source key footer — strict enough? too strict?)
- Anything missing for "consumer segmentation" that mày expect from KIRA's POV? (e.g. occasion-based segmentation page? journey-mapping page? cohort-evolution page?)
