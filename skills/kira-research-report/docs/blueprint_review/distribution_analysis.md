# distribution_analysis — section-by-section review (v1 + A+ flex)

> **For Henry to verify.** Mark each section ✏️ to change / ❌ to remove / ➕ to add / ✅ ok. Send back the list, I apply changes.
>
> **Profile:** 14 sections, **13-16 pages** (baseline 13-14 + 0-3 expand pages depending on data richness). **Physical goods only** — FMCG/CPG, building materials, hardware, durables, B2B industrial supplies with a visible distributor/wholesaler/retailer cascade. **No forecast section** (intentional — country-level channel forecasts too noisy).
> **Source mix target (Phase L.3 framing):** ~25-35% `[Kira estimates]` / ~65-75% named externals (`[<Source Alias> <Year>]`). §07 margin waterfall lands heavier on `[Kira estimates]` (margin scraping is hard); §05/06/08 channel-share lean named-external. Methodology endnote lists every alias.
> **Total query count:** 22 across 7 buckets.
>
> **Center of gravity:** §06 channel mix evolution (5-year stacked) + §07 channel margin waterfall (NEW page type). These two are the report's visual anchors — if either fails the data-coverage gate, regenerate, do NOT skip.
>
> **Poor-fit signals (orchestrator should de-rank):**
> - Pure SaaS / digital / services topics with no physical SKU
> - Direct-only brands with no channel cascade (route to entry_strategy or competitive_landscape instead)
> - Regional / APAC roll-ups — channel mix too heterogeneous to triangulate
> - Buyer wants sizing/forecast as the lead (route to market_analysis)

### Source tag system (Phase L.3 — applies to every content page)

Two tag categories only. The deprecated `[primary]` / `[secondary]` / `[estimate]` trio is GONE.

- `[Kira estimates]` — any KIRA-derived figure: margin synthesis, channel-mix triangulation, distributor revenue band synthesis. Replaces both old `[primary]` AND old `[estimate]`.
- `[<Source Alias> <Year>]` — external citable source. Examples for distribution_analysis: `[Unilever AR 2025]`, `[Indofood AR 2025]`, `[DKSH AR 2024]`, `[Berli Jucker AR 2024]`, `[BPS Retail Census 2024]`, `[GSO 2024]`, `[Sea Group 2025]`, `[Tokopedia 2025]`, `[Momentum Works 2025]`, `[Inside Retail Asia 2025]`, `[Grab Investor Day 2025]`, `[GoTo 2025]`.
- `[user-input]` — UC3 only.

**Source key footer (NEW, every content page):** every page using named-source tags MUST end with a one-line `SOURCE KEY · <alias> = <full citation> · ... · Kira estimates = KIRA in-house analyst triangulation` resolving every alias on that page. Aliases sort alphabetically, `Kira estimates` last. ~280 char cap. §07 waterfall: each margin layer's anchor source goes in the source key — readers will trace every % back.

### A+ flex layer (Phase J)

Each section can have up to 3 customization layers:
- **Expand condition** — if data is rich, section grows 1→2 pages. 4 sections have this.
- **Chart options** — 2-3 chart shapes the gen picks based on data. 9 sections have this. §07 is **locked to `waterfall_horizontal` only** (page type constraint).
- **Overlay emphasis** — vertical-specific bias (fmcg / industrial / consumer_durables emphasized given physical-goods scope).

---

## §00 Cover — `cover`

**Layout:** Standard KIRA cover — title + "distribution analysis" descriptor + country/industry/year + KIRA branding + report ID + confidential tag.

**No A+ flex** (boilerplate).

---

## §01 Methodology (inline) — `methodology_inline`

**Layout:** 2-col overview — primary distributor interviews / portfolio scrape · secondary trade-press + customs + listed-company filings · KIRA margin triangulation · source tagging conventions.

**No A+ flex** (boilerplate).

---

## §02 Contents — `toc`

**Layout:** Auto-generated TOC + page counter.

**No A+ flex** (boilerplate).

---

## §03 Divider — "Distribution analysis" — `divider`

**Layout:** Dark-mode full-page chapter break. Single thesis statement on the dominant channel structure and the biggest channel shift underway.

**No A+ flex** (boilerplate).

---

## §04 Executive summary (2 pages) — `exec_summary_p1 + exec_summary_p2_implications`

### Page 1 — exec_summary_p1

**🔍 Synthesized from §05-§13.** No own queries.

**📄 Layout:**
- **4 callouts (top row):** dominant channel share · biggest channel shift · margin-compression signal · e-commerce penetration. `num_max=12 chars`
- **2-col narrative:** ~1200 chars, lead with channel-strategy verdict
- **1 anchor chart:** channel share donut or top-line mix

### Page 2 — exec_summary_p2_implications

**📄 Layout:** 5-card grid with channel-specific verbs: **Reweight / Disintermediate / Defend / Enter / Sequence**. Each card body ≤360 chars.

### 🎨 A+ Flex

**Chart options for page 1 anchor chart:**
- `share_donut` (default — current-year channel mix is the cleanest summary)
- `stacked_bar_share_split` (compact 3-year channel shift — directional movement)
- `segment_bar_horizontal` (ranked channel value bar — top 4-5 channels stack-rank by absolute value)

**Overlay emphasis keys:** `channel`, `market_opportunity`
→ fmcg: emphasize MT vs GT split + quick-commerce breakout + cafe/away-from-home
→ industrial: emphasize OEM direct vs distributor exclusivity + project channel
→ consumer_durables: emphasize warranty/service network as channel friction + financing-tied retail

**No expand condition** (always 2 pages).

---

## §05 Channel landscape — `market_data_chart`

**🔍 Query bucket `01_channel_share_anchor`:**
```
1. {country} {industry} modern trade share traditional trade {year}
2. {country} {industry} retail channel mix Nielsen scan track
3. {country} {industry} general trade share warung sari-sari mom and pop {year}
```
**Tag mix:** ~60% named externals (listed FMCG ARs `[Unilever AR 2025]` / `[Indofood AR 2025]` / `[Vinamilk AR 2025]`, `[Inside Retail Asia 2025]`, ministry of trade MT licensing data, industry trade associations) / ~40% `[Kira estimates]` (per-channel share synthesis where multiple disclosures triangulate)
**Expected sources:** Listed FMCG annual reports (channel disclosures) · industry trade press · ministry of trade MT licensing data · industry trade associations

**📄 Layout:**
- **H1:** "Channel landscape: who moves volume today"
- **Chart (top 55%):** stacked-area or grouped bar — 3-year share trend per channel
- **Body (bottom 45%, 2 cols):** dominant channel · structural laggard · channel still pulling above-GDP growth

### 🎨 A+ Flex

**Chart options:**
- `stacked_bar_share_split` (default — 3-year channel shift)
- `segment_bar_horizontal` (current-year only — trend data sparse)
- `trend_line_3y` (channels diverge sharply — individual trajectories matter)

**Overlay emphasis keys:** `channel`, `consumer_behavior`
→ fmcg: MT (super/hyper/CVS) vs GT (sari-sari/warung) vs quick-commerce vs cafe occasion
→ industrial: OEM direct sales vs national distributor vs project channel vs trading-house re-export
→ consumer_durables: brand-owned retail vs multi-brand electronics chain vs e-com vs traditional appliance dealer

**No expand condition** (always 1 page).

---

## §06 Channel mix evolution — `market_data_chart` ← **CENTERPIECE #1**

**🔍 Query bucket `01_channel_share_anchor` (cont.):**
```
1. {country} {industry} channel share evolution {year-5} to {year}
2. {country} {industry} modern trade share traditional trade {year}
3. {country} {industry} retail channel mix Nielsen scan track
```
**Tag mix:** ~60% named externals (listed FMCG ARs with 5-year channel disclosures + industry trade press historicals) / ~40% `[Kira estimates]` (per-year channel synthesis where disclosures don't span full 5-year window)

**📄 Layout:**
- **H1:** "Channel mix evolution: {year-5} to {year}"
- **Chart (dominates page):** 100% stacked bar OR stacked area — 5-year channel-share evolution by % of total category value
- **Sidebar narrative:** ≤600 chars + **3 annotated inflection callouts** (each ≤80 chars) — e.g. "instant-delivery breakout 2024", "GT share decline -8pp", "marketplace consolidation"

### 🎨 A+ Flex

**Chart options:**
- `stacked_bar_share_split` (default — 100% stacked 5-year share, inflection annotations land on bar boundaries)
- `trend_line_5y` (per-channel trajectories diverge — inflection points read better on lines)
- `dual_axis_combo` (story is absolute category growth pulling mix sideways, not pure share rotation)

**Overlay emphasis keys:** `channel`, `forecast_drivers`
→ fmcg: emphasize quick-commerce breakout + MT-vs-GT crossover year + cafe/HORECA recovery post-COVID
→ industrial: emphasize OEM exclusivity unwind + e-commerce B2B (Alibaba.com / Bidvine) + project-channel cyclicality
→ consumer_durables: emphasize multi-brand chain consolidation + brand-owned D2C inflection + financing-tied channel stickiness

**No expand condition** (always 1 page — centerpiece must stay focused).

---

## §07 Channel margin waterfall — `channel_waterfall` ← **NEW PAGE TYPE + CENTERPIECE #2**

**🔍 Query bucket `04_margin_economics`:**
```
1. {country} {industry} distributor margin gross percent
2. {country} FMCG channel margin brand distributor retailer breakdown
3. {country} {industry} retailer markup modern trade traditional trade
```
**Tag mix:** ~45% named externals (listed FMCG MD&A `[Unilever AR 2025]` / `[Indofood AR 2025]`, academic papers, trade-press distributor profiles, competition authority filings) / ~55% `[Kira estimates]` (hardest data to source — most margin layers land `[Kira estimates]` with each layer's anchor source disclosed in §13 endnote AND the page source key footer)
**Expected sources:** Listed FMCG MD&A · academic papers on emerging-markets channel economics · trade-press distributor profiles · competition authority filings

**📄 Layout:**
- **H1:** "Channel margin distribution: who keeps the gross"
- **Waterfall (top 55%):** horizontal left-to-right, brand ex-factory (100%) → consumer shelf (100%). 6-9 layers depending on category.
- **Layers (per row, char caps):**
  - `layer_label` ≤24 ("Master distributor")
  - `margin_pct` ≤8 ("8-12%")
  - `margin_pct_unit` ≤4 ("pts" / "%")
  - `take_note` ≤60 ("Exclusive territory, 60d terms")
  - `source_tag` required — either `[Kira estimates]` or `[<Source Alias> <Year>]`; alias must resolve in the page source key footer
- **Commentary (bottom 45%, 2 cols):** structural takeaway (col 1) + 3 anomalies — fattest layer, compression point, disintermediation risk (col 2)

**Standard layer shape (one row per link, brand → consumer):**
1. brand_ex_factory (anchor — 100%)
2. importer_or_principal (optional — drops for domestic mfg)
3. master_distributor (regional/national wholesaler)
4. sub_distributor (provincial/category wholesaler)
5. modern_trade_retailer (super/hyper/CVS — if applicable)
6. traditional_trade (sari-sari/warung/mom-and-pop)
7. e_commerce_platform_take (marketplace fee + payments fee)
8. last_mile_logistics (instant delivery / 3PL slice)
9. consumer_shelf_price (terminal — 100% benchmark)

### 🎨 A+ Flex

**🔥 Expand condition:** if `channel_links_count >= 6`:
- **Page 1:** keeps headline waterfall with all 6-9 layers (unchanged)
- **Page 2:** adds **per-channel split waterfall** (MT lane vs GT lane vs e-com lane side-by-side) + expanded anomaly commentary (3 anomalies → 5-6, each with 1-line strategic read)
- → For Vietnam coffee with importer+master+sub+MT+GT (6 layers) → expands
- → For domestic-mfg Vietnam hardware with master+sub+retailer (4 layers) → stays 1 page

**Chart options:** `waterfall_horizontal` **(only — page type is locked)**

**Overlay emphasis keys:** `channel`, `pricing`, `partnership`
→ fmcg: emphasize MT-retailer back-margin/listing fees + quick-commerce platform take (~15-25%) + traditional-trade payment-cycle drag
→ industrial: emphasize **OEM/distributor exclusivity** structure — distributor margin compressed by long-term volume commitments but compensated via inventory financing + project bidding rights
→ consumer_durables: emphasize **warranty/service network as margin reservoir** — installation + after-sales accounts for 8-15pp of total chain margin; financing partner take (HP-tied retail) another 3-5pp

**QC rule:** Waterfall must have ≥5 layers populated with margin % + source tag (margin_chain_completeness gate).

---

## §08 Geographic distribution coverage — `market_data_chart`

**🔍 Query bucket `07_geographic_coverage`:**
```
1. {country} {industry} distribution rural reach Tier 2 Tier 3 cities
2. {country} retail outlets count modern trade traditional trade by region
3. {country} {industry} last mile rural penetration challenge
```
**Tag mix:** ~60% named externals (national stats bureau retail census aliases `[BPS Retail Census 2024]` / `[GSO Retail Census 2024]` / `[NSO Retail Census 2024]` / `[PSA Retail Census 2024]`, listed FMCG reach disclosures like `[Unilever AR 2025]` / `[Indofood AR 2025]`, ministry of trade outlet registrations) / ~40% `[Kira estimates]` (tier-level outlet coverage synthesis where census + reach disclosures triangulate)
**Expected sources:** National stats bureau retail census · listed FMCG distribution-reach disclosures ("we cover 500k outlets") · ministry of trade outlet registrations

**📄 Layout:**
- **H1:** "Geographic distribution coverage"
- **Chart:** map (choropleth) or 4-tier stacked bar — % outlets reached + % volume per geography tier (Tier 1 / Tier 2 / Tier 3 / rural)
- **Body (2-col below):** where the country's distribution white-space is · which tiers are over-served · which players over-index in each tier. Each tier callout ≤120 chars.

**⏭️ Skip if:** topic is a fully urban category with no rural channel (luxury, B2B-enterprise-only).

### 🎨 A+ Flex

**Chart options:**
- `geographic_choropleth` (coverage data per province/region available)
- `stacked_bar_share_split` (default — 4-tier % outlets vs % volume split)
- `segment_bar_horizontal` (single-metric ranking)

**Overlay emphasis keys:** `channel`, `market_opportunity`
→ fmcg: emphasize **GT outlet count by tier** (Indonesia ~3.6M warungs concentrated outside Java; PH ~1.3M sari-saris) + cold-chain reach
→ industrial: emphasize **industrial estate clusters** (Bekasi/Karawang in ID, Eastern Seaboard in TH) + project-pipeline geography
→ consumer_durables: emphasize **service-center density** as the binding constraint — outlet reach matters less than warranty network reach in Tier 3 / rural

**No expand condition** (always 1 page).

---

## §09 Top distributors & category portfolios — `competitive_structure` (repurposed)

**🔍 Query bucket `03_distributor_landscape`:**
```
1. {country} {industry} top distributors wholesalers list {year}
2. {country} largest FMCG distributors revenue ranking
3. {country} {industry} distributor portfolio principals brands carried
4. {country} {industry} master distributor sub-distributor structure
```
**Tag mix:** ~75% named externals (distributor company websites + LinkedIn, trade directories, listed conglomerate disclosures like `[DKSH AR 2024]` / `[Berli Jucker AR 2024]` / `[PT Enseval AR 2024]` / `[Li & Fung AR 2024]`, chambers of commerce directories) / ~25% `[Kira estimates]` (revenue-band estimates for non-listed distributors)
**Expected sources:** distributor company websites + LinkedIn · trade directories · listed conglomerate disclosures · chambers of commerce

**📄 Layout:**
- **H1:** "Top distributors & category portfolios"
- **Matrix:** 6-8 named distributors. Columns: distributor name (≤30) · ownership/parent (≤30) · category portfolio (3-6 chips, ≤4 chips/row) · geographic reach (≤30) · exclusive principals (≤60) · est. revenue or volume share band (≤20)
- **Sidebar header narrative:** ≤400 chars

**⏭️ Skip if:** fewer than 4 named distributors identifiable from research.

### 🎨 A+ Flex

**🔥 Expand condition:** if `named_distributors_count >= 8`:
- **Page 1:** keeps headline 6-8 distributor matrix (unchanged)
- **Page 2:** adds (a) full 9-12 distributor extended matrix, (b) `network_diagram` sub-chart linking distributors to exclusive principals + geographic anchors, (c) 200-char read on consolidation pressure (who's acquiring whom, who's losing principals)

**Chart options:**
- `network_diagram` (exclusive-principal relationships well-documented; network shape more telling)
- `segment_bar_horizontal` (revenue/volume estimates exist for most named players)
- `bubble_2x2` (reach × portfolio breadth, bubble = revenue)

**Overlay emphasis keys:** `partnership`, `channel`, `competitive_intensity`
→ fmcg: emphasize **multi-principal trading houses** (DKSH, Massimo, PT Enseval) + their MT/GT split — who carries Unilever/P&G/Nestlé and on what exclusivity terms
→ industrial: emphasize **OEM exclusivity histories** — named distributors with 10+ year exclusive territory rights + how those contracts renew; flag any recently-broken exclusivities (signal of channel disruption)
→ consumer_durables: emphasize **warranty/service network depth** — distributor count matters less than which distributors own authorized service centers in Tier 2/3

**QC rule:** distributor_matrix_completeness — 6-8 named distributors with category coverage + payment terms or MOQ where available.

---

## §10 Distributor economics — `market_data_chart`

**🔍 Query bucket `04_margin_economics` (cont.):**
```
1. {country} {industry} payment terms net 30 60 90 trade credit
2. {country} {industry} distributor margin gross percent
3. {country} FMCG channel margin brand distributor retailer breakdown
```
**Tag mix:** ~45% named externals (listed FMCG MD&A, payment-terms surveys, trade press distributor profiles) / ~55% `[Kira estimates]` (margin-band synthesis per tier is largely a KIRA call — anchor disclosed in §13 endnote)

**📄 Layout:**
- **H1:** "Distributor economics: margin, terms, exclusivity"
- **4-card grid (top half):** margin % bands · standard payment terms (net 30/60/90) · MOQ ranges · exclusivity norms (territorial vs category vs none). Each card: label ≤30, body ≤240 chars
- **Bar chart (bottom half):** margin ranges by tier — master distributor vs sub-distributor vs retailer

### 🎨 A+ Flex

**Chart options:**
- `segment_bar_horizontal` (default — margin % per distributor tier)
- `stacked_bar_share_split` (margin + payment-term composition)
- `dual_axis_combo` (margin one direction, payment-term days the other)

**Overlay emphasis keys:** `pricing`, `partnership`, `channel`
→ fmcg: emphasize **MT back-margin/listing-fee** structure + GT credit-cycle risk (60-90 day payment in traditional trade vs 30 in MT)
→ industrial: emphasize **OEM/distributor exclusivity** trade-offs — margin compressed but stabilized by inventory financing + project bidding rights + multi-year volume commitments
→ consumer_durables: emphasize **warranty service network** as economics anchor — service-center ownership shifts 5-10pp of chain margin to the distributor with the network

**No expand condition** (always 1 page).

---

## §11 Channel disruption signals — `market_data_chart`

**🔍 Query buckets `05_instant_delivery_qcommerce` + `06_d2c_social_commerce`:**
```
1. {country} quick commerce instant delivery {industry} GrabMart Foodpanda Shopee Now
2. {country} D2C direct to consumer brands {industry} {year}
3. {country} social commerce TikTok Shop live commerce GMV {year}
4. {country} 15-minute delivery FMCG category coverage {year}
```
**Tag mix:** ~60% named externals (`[Grab Investor Day 2025]` / `[GoTo 2025]`, `[Momentum Works 2025]` quick-commerce reports, `[Tech in Asia 2025]` / `[e27 2025]` / `[Rest of World 2025]`, TikTok Shop platform disclosures) / ~40% `[Kira estimates]` (velocity-vs-impact scoring + per-mode category-coverage synthesis)
**Expected sources:** ride-hailing/super-app investor decks · Momentum Works quick-commerce reports · regional tech press · TikTok Shop platform disclosures

**📄 Layout:**
- **H1:** "Channel disruption signals"
- **4-card grid:** (1) D2C brand penetration · (2) marketplace consolidation + take-rate · (3) social commerce (TikTok Shop / live commerce) volume · (4) instant delivery / quick-commerce category coverage
- **Each card:** metric ≤12 chars · label ≤30 chars · body ≤200 chars (leading metric + 1-line directional read)

### 🎨 A+ Flex

**🔥 Expand condition:** if `disruption_modes_with_evidence >= 4`:
- **Page 1:** keeps 4-card disruption-vector grid (unchanged)
- **Page 2:** adds (a) `bubble_2x2` mapping each disruption mode by velocity × impact, (b) deeper per-mode 250-char reads citing leading players + inflection evidence, (c) 1-line forward signal per mode (12-month outlook)

**Chart options:**
- `bubble_2x2` (each disruption vector has velocity + category-impact estimates)
- `segment_bar_horizontal` (default — each mode has single headline metric)
- `trend_line_3y` (rate of change is the story, not current size)

**Overlay emphasis keys:** `channel`, `consumer_behavior`, `risk_factors`
→ fmcg: emphasize **quick-commerce category coverage** (which SKUs hit the 15-min basket) + TikTok Shop live-commerce velocity in beauty/snacks
→ industrial: emphasize **B2B e-commerce platforms** (Alibaba.com, Bidvine, regional vertical marketplaces) + how OEM direct websites are bypassing legacy distributors
→ consumer_durables: emphasize **brand-owned D2C inflection** (Xiaomi-style direct stores) + financing-platform disintermediation of traditional appliance dealers + warranty-as-a-service unbundling

---

## §12 E-commerce penetration by sub-segment — `market_data_chart`

**🔍 Query bucket `02_ecommerce_penetration`:**
```
1. {country} e-commerce penetration {industry} percent online {year}
2. {country} {industry} online sales share by category sub-segment
3. {country} marketplace share Shopee Lazada Tokopedia TikTok Shop {year}
4. {country} e-commerce GMV {industry} category breakdown
```
**Tag mix:** ~65% named externals (marketplace company filings `[Sea Group 2025]` / `[GoTo 2025]` / `[Lazada Parent 2025]`, `[Momentum Works 2025]`, national e-commerce association data, e-Conomy SEA underlying data sources cited directly) / ~35% `[Kira estimates]` (sub-segment online% synthesis where marketplace disclosures aggregate above sub-segment level)
**Expected sources:** marketplace company filings · industry research with disclosed methodology · national e-commerce association data (avoid citing aggregator report names — cite underlying primary data)

**📄 Layout:**
- **H1:** "E-commerce penetration by sub-segment"
- **Chart:** horizontal bar 6-10 rows — sub-segments ranked by online %, with YoY delta column
- **Body (2-col, ≤800 chars total):** 2 sub-segments crossing 20% online threshold (structural shift) · 2 sub-segments still under 5% (channel-defensible)

**⏭️ Skip if:** topic has no meaningful sub-segment differentiation (collapse into §11 disruption signals).

### 🎨 A+ Flex

**🔥 Expand condition:** if `ecommerce_subsegments_count >= 5`:
- **Page 1:** keeps 6-10 sub-segment penetration bar with YoY delta (unchanged)
- **Page 2:** adds (a) `dual_axis_combo` overlaying penetration % vs absolute USD online value per sub-segment, (b) cluster commentary grouping winners (>20%), middlers (5-20%), defensibles (<5%) with 200-char reads each, (c) 3-year online-share trajectory mini-chart on the top 3 movers

**Chart options:**
- `segment_bar_horizontal` (default — ranked online % with YoY delta)
- `dual_axis_combo` (mixing relative penetration + absolute USD online value)
- `trend_line_5y` (5+ years per-sub-segment online-share; rate of crossing 20% threshold matters)

**Overlay emphasis keys:** `channel`, `consumer_behavior`, `forecast_drivers`
→ fmcg: emphasize **beauty/personal-care** (often 20-30% online already) vs **fresh grocery** (<5%, still GT-dominated)
→ industrial: emphasize **MRO supplies / spare parts** (B2B e-commerce inflection) vs **bulk commodities** (still relationship-sold)
→ consumer_durables: emphasize **small-appliance** (often 30%+ online) vs **large white goods** (sub-15%, installation-tethered)

---

## §13 Methodology endnote — `methodology_endnote`

**Layout:**
- Source mix breakdown — `[Kira estimates]` share % vs named-external share % (target ~25-35% `[Kira estimates]`)
- **Full alias registry** — every `[<Source Alias> <Year>]` used anywhere in the report resolved to its full citation, sorted alphabetically with `Kira estimates = KIRA in-house analyst triangulation` last
- Key data anchors (channel-share series, customs aggregates, listed-company distributor disclosures)
- **KIRA margin-triangulation methodology disclosed** — every `[Kira estimates]` margin % in §07 waterfall traces to an anchor sentence per the template: *"`[Unilever AR 2025]` disclosed 18% gross margin to distributors; sector convention places distributor markup 8-12pp on top → retailer-side margin 22-28% [Kira estimates]"*
- Contact + next research footer

**No A+ flex** (boilerplate).

**QC rule:** Source-tag census must reconcile to the source mix target (~25-35% `[Kira estimates]` / ~65-75% named externals). §07 margin bucket carries the heaviest `[Kira estimates]` share; flag explicitly with per-layer anchor disclosure.

---

## Summary — page count flex range

| Scenario | Page count |
|---|---|
| **Floor** (no expands trigger; §08 geo skipped for urban-only category) | **12 pages** |
| **Baseline** (typical Vietnam coffee / PH FMCG distribution) | **13-14 pages** |
| **Rich data** (1-2 expands trigger — e.g. 6+ channel waterfall layers OR 8+ named distributors) | **14-15 pages** |
| **Very rich** (3-4 expands trigger — e.g. ID FMCG with full margin chain + 10 distributors + 5 disruption modes + 6+ e-com sub-segments) | **16 pages** |

> Note: blueprint is intentionally tight (no internal dividers besides §03, no forecast section). Tighter than entry_strategy because the report leans on 2 heavy visual centerpieces (§06 + §07) rather than narrative coverage breadth.

## Overlay × blueprint interaction examples (channel-angle topics)

| Topic | Overlay picked | What changes |
|---|---|---|
| **Vietnam instant coffee distribution 2026** | `fmcg` | §05 emphasizes MT/GT/quick-commerce/cafe split; §06 quick-commerce breakout 2024 as inflection callout; §07 waterfall includes importer (Trung Nguyên multi-tier) + cafe-channel back-margin; §09 distributor matrix surfaces Masan + Phuc Long parent + DKSH-VN |
| **Indonesia building materials distribution 2026** | `industrial` (closest fit) | §05 OEM direct vs national distributor vs project channel; §06 e-commerce B2B inflection (Bidvine); §07 waterfall emphasizes OEM exclusivity → project-bidding margin reservoir; §09 distributor matrix surfaces PT Enseval-equivalent + named regional building-material trading houses; §11 disruption pulls in vertical marketplaces |
| **Philippines home appliances distribution 2026** | `consumer_durables` | §05 multi-brand chain (Abenson, Anson's) vs brand-owned retail vs e-com vs traditional appliance dealer; §07 waterfall emphasizes warranty/service-network margin reservoir + HP/financing-tied retail take; §09 distributor matrix surfaces SM Appliance + Western Marketing + dealer cooperatives; §11 disruption flags Xiaomi-style D2C + financing platforms |
| **Thailand snacks & confectionery distribution 2026** | `fmcg` | §05 7-Eleven/CP All dominance vs traditional trade vs HORECA; §06 7-Eleven share growth as inflection; §07 waterfall emphasizes CVS back-margin (Thailand is a CVS-heavy outlier) + traditional-trade compression; §09 distributor matrix surfaces Berli Jucker + Thai Beverage portfolio |

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
- Section count target OK? (14 base, 13-16 page flex range, no forecast section)
- Voice / register OK? (margin triangulation discloses estimate methodology in §13 endnote)
- Centerpiece allocation OK? (§06 channel mix evolution + §07 channel margin waterfall as the two visual anchors — both protected by "regenerate, don't skip" rule)
- §07 `channel_waterfall` page-type shape OK? (9-layer canonical shape: brand_ex_factory → importer → master_dist → sub_dist → MT → GT → e_com_take → last_mile → consumer_shelf — does this need any layers added/removed for Henry's typical use cases?)
- Poor-fit signals strict enough? (pure SaaS / direct-only brands / APAC roll-ups all explicitly anti-fit)
- Vertical coverage OK? (fmcg + industrial + consumer_durables — should `commodity` or `building_materials` get explicit overlay keys, or is `industrial` close enough?)
- Anything missing for "distribution analysis" that mày expect from KIRA's POV? (e.g. cold-chain layer for fresh categories, returns-and-reverse-logistics layer, channel-conflict / gray-market section?)
