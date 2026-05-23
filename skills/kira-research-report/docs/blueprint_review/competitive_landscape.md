# competitive_landscape — section-by-section review (v1 + A+ flex)

> **For Henry to verify.** Mark each section ✏️ to change / ❌ to remove / ➕ to add / ✅ ok. Send back the list, I apply changes.
>
> **Profile:** 15 sections, **14-17 pages** (baseline 14-15 + 0-3 expand pages depending on data richness). Competitor-first companion to `market_analysis` — center of gravity is the **named operator set + matrix + 3 deep profiles**, not sizing.
> **Source mix target (Phase L.3 framing):** ~20-30% `[Kira estimates]` / ~70-80% named external sources (`[<Source Alias> <Year>]`). Exec summary skews more KIRA-heavy (synthesized callouts); body sections lean named-external. Methodology endnote lists every alias used.
> **Total query count:** 22 across 6 buckets (note: bucket 02 is iterative — budgets 6 but spends 8-10 in practice).

### Source tag system (Phase L.3 — applies to every content page)

Two tag categories only. The deprecated `[primary]` / `[secondary]` / `[estimate]` trio is GONE.

- `[Kira estimates]` — any KIRA-derived figure (in-house triangulation, share-split synthesis, HHI calc on top of disclosed revenue, model output). Replaces both old `[primary]` AND old `[estimate]`.
- `[<Source Alias> <Year>]` — external citable source. Examples for competitive_landscape: `[IMPC AR 2025]`, `[Vinacafe AR 2025]`, `[Masan Q3 2025]`, `[BPS 2024]`, `[KPPU 2024]`, `[IDX Filings 2025]`, `[DealStreetAsia 2025]`, `[Nikkei Asia 2024]`.
- `[user-input]` — UC3 only.

**Source key footer (NEW, every content page):** every page using named-source tags MUST end with a one-line `SOURCE KEY · <alias> = <full citation> · ... · Kira estimates = KIRA in-house analyst triangulation` resolving every alias appearing on that page. Aliases sort alphabetically, `Kira estimates` last. ~280 char cap. Cross-page consistency: same real source = same alias on every page.

### A+ flex layer (Phase J)

Each section can have up to 3 customization layers:
- **Expand condition** — if data is rich, section grows 1→2 pages. **5 sections have this** (industry structure, competitor matrix, strategic groups, M&A timeline, + the auto-split fallback on matrix).
- **Chart options** — 2-3 chart shapes the gen picks based on data. **9 sections have this.**
- **Overlay emphasis** — vertical-specific bias (fmcg / finserv / industrial / consumer_durables / services / commodity). Most sections have keys.

---

## §00 Cover — `cover`

**Layout:** Standard KIRA cover — title `{{country}} {{industry}} competitive landscape {{year}}` + country/industry/year + KIRA branding + report ID + confidential tag.

**No A+ flex** (boilerplate).

---

## §01 Methodology (inline) — `methodology_inline`

**Layout:** 2-col overview — filings + trade press primary set, secondary cross-checks, KIRA estimate methodology for share splits and pricing tiers, source-tag conventions.

**No A+ flex** (boilerplate).

---

## §02 Contents — `toc`

**Layout:** Auto-generated TOC + page counter.

**No A+ flex** (boilerplate).

---

## §03 Divider — "Competitive landscape" — `divider`

**Layout:** Dark-mode full-page chapter break. Single thesis statement on market structure (consolidating / fragmenting / contested / re-segmenting).

**Note:** Unlike `market_analysis`, **only ONE divider** in the whole report — the competitor matrix is the through-line, không cần chia chapter dividers cho từng phần.

**No A+ flex** (boilerplate).

---

## §03 Executive summary (2 pages) — `exec_summary_snapshot + exec_summary_implications`

### Page 1 — exec_summary_snapshot

**🔍 Synthesized from §04-§11.** No own queries (pulls from bucket 01 + 02 outputs).

**📄 Layout:**
- **H1:** `{{country}}'s {{industry}} competitive map — {{year}} snapshot`
- **4 callouts (top row):** market structure descriptor + HHI / top-3 combined share / biggest mover YoY / disruptor count
  - num_max ≤12 chars · label_max ≤30 chars · change-line ≤38 chars
- **2-col narrative:** ≤1200 chars, anchored on the structural thesis
- **1 anchor chart:** top-10 share bar

### Page 2 — exec_summary_implications

**📄 Layout:** 5-card grid (`Position for consolidation` / `Anticipate the segment fracture` / `Hedge pricing exposure` / `Sequence entry behind the disruptor wave` / `Pace M&A windows`).
- Each card body ≤360 chars · anchored by a number from the body
- **Voice rule:** the ONLY de-cliented advisory voice in the report — keep imperative-verb led.

### 🎨 A+ Flex

**Chart options for page 1 anchor chart:**
- `segment_bar_horizontal` (default — clean share % for top 10)
- `share_donut` (highly concentrated, top-3 narrative dominates)
- `stacked_bar_share_split` (tiered structure — oligopoly with fringe)

**Overlay emphasis keys:**
- Page 1: `competitive_intensity`, `market_opportunity`
- Page 2: `competitive_intensity`, `risk_factors`, `partnership`
→ For Indonesia banking (finserv): page 1 emphasizes top-4 super-app concentration; page 2 implications lead with regulator-pendulum hedge
→ For Vietnam coffee (fmcg): page 1 emphasizes MT vs traditional concentration; page 2 implications lead with channel partner sequencing

**No expand condition** (always 2 pages).

---

## §04 Industry structure — `competitive_structure`

**🔍 Query bucket `01_industry_structure`:**
```
1. {country} {industry} market structure concentration {year}
2. {country} {industry} HHI Herfindahl index OR market concentration ratio
3. {country} {industry} top 10 players combined market share {year}
4. {country} {industry} segment breakdown sub-category split {year}
```
**Expected sources:** competition authority filings (KPPU/KFTC/JFTC/CCS/MyCC) · industry trade associations · listed-company filings · government industry surveys
**Tag mix:** ~70% named externals (competition authority filings `[KPPU 2024]` / `[JFTC 2024]`, trade association reports, exchange filings) / ~30% `[Kira estimates]` (HHI computation + segment-split synthesis on top of disclosed numbers)

**📄 Layout:**
- **H1:** `Industry structure: {{concentration_descriptor}}` (`highly concentrated` HHI>2500 / `moderately concentrated` 1500-2500 / `unconcentrated` <1500 / `fragmenting` HHI down >300 over 5y / `consolidating` HHI up >300 over 5y)
- **HHI index chart + fragmentation index** + segment split sidebar
- **4-card mini-row:** top 4 player headlines (rank, parent, share, single recent move)
- Sidebar body ≤280 chars · stat_lines ≤4 at 35 chars each · mini-cards strengths ≤140 chars

### 🎨 A+ Flex

**🔥 Expand condition:** if `named_competitors_count >= 12`:
- **Page 1:** keeps HHI + fragmentation chart + top 4 mini-cards (unchanged)
- **Page 2 (`07_industry_structure_p2`):** adds full top-12 player ranking strip with rank/parent/share/segment-focus + deeper fragmentation commentary sidebar (mid-tier vs long-tail split)
- → For Vietnam coffee with 6-8 named brands → stays 1 page
- → For Indonesia banking with 12+ named banks → expands to 2 pages

**Chart options:**
- `stacked_bar_share_split` (HHI build-up — when CR4/CR8 is the core read)
- `segment_bar_horizontal` (default — top-N share with HHI badge)
- `share_donut` (CR4 vs rest — highly concentrated headline)

**Overlay emphasis keys:** `competitive_intensity`, `market_opportunity`
→ finserv overlay: KPPU/regulator CR4 framing + super-app concentration
→ fmcg overlay: MT/GT structural split as fragmentation lens
→ commodity overlay: estate-vs-smallholder concentration framing

---

## §05 Top 10 competitor matrix — `competitive_structure`

**🔍 Query bucket `02_competitor_identification_and_financials`:**
```
1. {country} {industry} top companies ranking revenue {year}
2. {country} {industry} largest players market leaders {year}
3. {leading_player_candidate} {country} annual report revenue segment {industry}
4. {leading_player_candidate} {country} market share {year} press release
5. {country} {industry} parent company ownership conglomerate {year}
6. {country} {industry} market share evolution {year-4} {year}
```
**Expected sources:** IDX/SET/SGX/HoSE/BurseMalaysia/PSE filings · TSE + KRX filings (parent groups) · company press releases · industry trade press · regulator disclosures (BI/SBV/BSP/BOT)
**Tag mix:** ~75% named externals (per-player annual reports `[IMPC AR 2025]` / `[Vinacafe AR 2025]` / `[Masan Q3 2025]`, exchange filings `[IDX Filings 2025]` / `[HoSE Filings 2025]`, press releases) / ~25% `[Kira estimates]` (share band synthesis where filings disclose revenue but not share)
**Note:** Iterative bucket — first 2 queries surface the name set, then queries 3-4 re-run per named player. Budgets 6 but expects 8-10 in practice.

**📄 Layout:**
- **H1:** "Top 10 competitor matrix"
- **Table-heavy:** top 10 players with revenue (USD m or local) · share % · parent/ownership · segment focus · 1-line recent move
- **Layout via `player_cards_row` scaled to 2 rows × 5 players**
- **Sidebar:** methodology note for share computation (≤280 chars)
- Player names ≤45 chars · parent ≤55 chars

**Skip if:** fewer than 6 named players identifiable → fall back to 6-row matrix and flag low coverage.

### 🎨 A+ Flex

**🔥 Expand condition:** if `named_competitors_count >= 10`:
- **Page 1 (`08_competitor_matrix`):** ranks 1-5 with full table + methodology sidebar
- **Page 2 (`08_competitor_matrix_p2`):** ranks 6-10 with same table shape + a 'mid-tier vs leaders' contrast sidebar (replaces methodology note — no duplication)
- **Auto-split safety net:** if 10-row page renders over 720px even on the 1-page version, it auto-splits into 08a/08b (same section_num "05"). Page count then floats to 16-18.
- → For most 8-10 player markets (Thailand auto, Vietnam dairy) → expands to 2 pages naturally
- → For thin sets (boutique B2B services with 6 players) → stays 1 page

**Chart options:**
- `segment_bar_horizontal` (top-10 revenue bar — table-leading visual when revenue figures available)
- `stacked_bar_share_split` (share by ownership type — foreign/state/private domestic as structural lens)

**Overlay emphasis keys:** `competitive_intensity`, `partnership`, `pricing`
→ industrial overlay: foreign vs state vs private ownership stack (TKDN / local content lens)
→ finserv overlay: state-bank vs domestic-private vs foreign-bank ownership split
→ consumer_durables overlay: OEM-parent grouping (Toyota Group, Hyundai Group sub-brands)

---

## §06 Market share evolution — `market_data_chart`

**🔍 Bucket: same as §05 (query 6 of bucket 02).**
```
6. {country} {industry} market share evolution {year-4} {year}
```

**📄 Layout:**
- **H1:** `Market share evolution: {{year-4}} to {{year}}`
- **5-year stacked-area or grouped-bar chart** of top-10 share movement (10 series × 5 years, or top-5 + 'others' bucket)
- **Narrative left column:** 3 structural deltas — the winner, the loser, the surprise
- Sections ≤3 · body ≤350 chars each

### 🎨 A+ Flex

**Chart options:**
- `stacked_bar_share_split` (default — 5-year share stack with top-5 + others)
- `trend_line_5y` (when crossovers between specific players are the narrative — lines crossing read clearer)
- `trend_line_3y` (only 3 years of clean share data — short history or recent re-segmentation)

**Overlay emphasis keys:** `competitive_intensity`, `forecast_drivers`
→ fmcg overlay: emphasize MT-channel-driven share shift winners
→ finserv overlay: emphasize super-app-led share migration
→ commodity overlay: emphasize FX + benchmark price as share-shift trigger

**No expand condition** (always 1 page).

---

## §07 Strategic groups map — `market_data_chart`

**🔍 Query bucket `03_strategic_groups_and_positioning`:**
```
1. {country} {industry} distribution model integrated specialist {year}
2. {country} {industry} premium mass value segmentation positioning
3. {country} {industry} digital transformation maturity players {year}
```
**Expected sources:** industry trade press positioning articles · investor day decks · analyst-firm positioning notes (read but not cited) · consumer research with named-brand cuts
**Tag mix:** ~60% named externals (trade press positioning coverage, investor decks, consumer research with named-brand cuts) / ~40% `[Kira estimates]` — KIRA places players on the 2×2 map; quadrant assignment itself is a KIRA call and tagged `[Kira estimates]`

**📄 Layout:**
- **H1:** `Strategic groups: {{x_axis}} vs {{y_axis}}` (axes chosen by analyst — e.g. price tier vs distribution breadth, scale vs digital maturity, premium vs mass, integrated vs specialist)
- **2×2 perceptual map (centerpiece)** placing top 10 players · bubble size = revenue
- **Narrative left:** names the 4 group clusters + player count in each
- Sections ≤3 · body ≤350 chars each · chart title ≤60 chars · subtitle ≤50 chars

**Voice rule:** Generic 'high/low' framing forbidden — use specific strategic descriptors.

### 🎨 A+ Flex

**🔥 Expand condition:** if `strategic_group_count >= 4`:
- **Page 1:** keeps 2×2 bubble map + 3-section narrative naming the quadrants
- **Page 2 (`10_strategic_groups_map_p2`):** adds per-group deep-dive cards (4 cards, one per group) covering shared strategy, representative players, and the group's structural trajectory (`consolidating` / `fading` / `emerging`)
- → For Vietnam coffee with 3 clean groups (premium-cafe / mass-instant / value-traditional) → stays 1 page
- → For Indonesia banking with 4+ groups (super-apps / SOE incumbents / digital-only challengers / niche specialists) → expands to 2 pages

**Chart options:**
- `bubble_2x2` (default — top players cluster cleanly on two strategic axes, revenue as size)
- `scatter_quality_price` (when strategic differentiation collapses to price-quality — mature consumer category)

**Overlay emphasis keys:** `competitive_intensity`, `pricing`, `channel`
→ fmcg overlay: price tier × distribution breadth (MT depth vs GT reach)
→ industrial overlay: scale × digital maturity (legacy OEM vs digital-native)
→ services overlay: integrated vs specialist × geographic reach

---

## §08 Player profile — rank 1 — `competitive_profile_deep`

**🔍 Synthesized from bucket 02 (queries 3-4 re-run per player) + bucket 03 (positioning) + bucket 05 (recent moves field).**

**📄 Layout:**
- **H1:** `{{player_1_name}}` (resolved from bucket 02 output)
- **Hero block:** name, tagline, 3 tags, **4 stats** (revenue, share, growth, segment) — value ≤8 chars, label ≤18 chars
- **2-col body:**
  - Left: positioning + recent moves (body_max 380 chars per section)
  - Right: strengths list (max 5 items × 90 chars) OR prose

**Skip if:** rank-1 player has insufficient public data → substitute next player up and flag.

### 🎨 A+ Flex

**No chart options** (page type is locked to `competitive_profile_deep` shape).

**Overlay emphasis keys:** `competitive_intensity`, `channel`, `partnership`
→ finserv overlay: regulator relationships + super-app partnership history
→ industrial overlay: OEM contracts + distributor exclusivity history
→ fmcg overlay: MT chain agreements + recent SKU launches

**No expand condition** (always 1 page per player).

---

## §08 Player profile — rank 2 — `competitive_profile_deep`

**Same shape as rank-1.**

**📄 Layout:**
- **H1:** `{{player_2_name}}`
- Hero + 2-col body, identical char caps

**Voice rule:** Differentiate from rank-1 by **leading with the strategic contrast** — don't duplicate rank-1 framing.

**Skip if:** rank-2 has insufficient public data.

### 🎨 A+ Flex

**No chart options** (locked page type).

**Overlay emphasis keys:** `competitive_intensity`, `channel`, `partnership`
(same overlay logic as rank-1, but applied to the #2 contrast frame)

**No expand condition** (always 1 page).

---

## §08 Player profile — rank 3 — `competitive_profile_deep`

**Same shape as rank-1 + rank-2.**

**📄 Layout:**
- **H1:** `{{player_3_name}}`
- Hero + 2-col body, identical char caps

**Voice rule:** Often the most interesting profile (the challenger). Lead with the **gap-to-#2 narrative**.

**Skip if:** rank-3 has insufficient public data.

### 🎨 A+ Flex

**No chart options** (locked page type).

**Overlay emphasis keys:** `competitive_intensity`, `channel`, `partnership`, `risk_factors`
→ (rank-3 picks up `risk_factors` because the challenger thesis often hinges on a structural risk to the incumbents)
→ finserv overlay: regulator scrutiny on the challenger model
→ industrial overlay: supply chain dependency exposure for the challenger
→ services overlay: talent-pool fragility for the upstart

**No expand condition** (always 1 page).

---

## §09 Pricing positioning — `market_data_chart`

**🔍 Query bucket `04_pricing_benchmarks`:**
```
1. {country} {industry} price range entry mid premium {year}
2. {country} {industry} pricing benchmark per unit OR per SKU {year}
3. {country} {industry} {leading_player_candidate} pricing strategy product tier
```
**Expected sources:** e-commerce marketplace listings (Tokopedia/Shopee/Lazada/Rakuten/Coupang) · company catalogs + price lists · consumer protection agency price surveys · retail trade press
**Tag mix:** ~60% named externals (marketplace listings `[Shopee VN 2026]` / `[Tokopedia 2026]` / `[Rakuten 2025]`, company catalogs, consumer protection price surveys, trade press) / ~40% `[Kira estimates]` (price-band synthesis where only point prices are surfaced)
**Note:** B2B services often have opaque quoted pricing — if 3+ players have no public band data, swap this page to a buyer-segment positioning chart and reduce bucket to 1 query.

**📄 Layout:**
- **H1:** "Pricing positioning across the top 10"
- **Chart (typically horizontal range bar):** each player's price band (entry/mid/premium) vs reference benchmark
- **Narrative:** reads tier structure (e.g. "three premium, four mid, three value") + the 1-2 outliers
- Sections ≤3 · body ≤350 chars each · chart title ≤60 chars

**Skip if:** industry has opaque pricing (B2B custom-quoted services) → substitute 'positioning by buyer segment' chart.

### 🎨 A+ Flex

**Chart options:**
- `scatter_quality_price` (default — quality proxy + price are both defensible)
- `segment_bar_horizontal` (price-band tier banding — cleaner than continuous quality score)
- `stacked_bar_share_split` (per-player tier-mix stack — when players span multiple price tiers each, SKU-mix is the story)

**Overlay emphasis keys:** `pricing`, `competitive_intensity`, `consumer_behavior`
→ fmcg overlay: shopper price-tier elasticity + private label pressure
→ consumer_durables overlay: financing-bundle pricing (rate × tenor lens)
→ services overlay: ARPU tier × retention frame

**No expand condition** (always 1 page).

---

## §10 M&A + partnership timeline — `market_data_chart`

**🔍 Query bucket `05_ma_partnerships`:**
```
1. {country} {industry} M&A acquisitions {year-2} {year}
2. {country} {industry} partnership joint venture {year-2} {year}
3. {country} {industry} foreign investor stake {year-2} {year}
4. {country} {industry} divestment exit private equity {year-2} {year}
```
**Expected sources:** competition authority merger filings · exchange disclosure feeds · Mergermarket / DealStreetAsia (cited only via primary deal docs) · company press releases · regional business press (Nikkei Asia, The Edge, VnExpress Business, KrAsia)
**Tag mix:** ~80% named externals (merger filings, exchange disclosure feeds, deal-news outlets like `[DealStreetAsia 2025]` / `[Nikkei Asia 2025]` / `[The Edge 2024]`, company press releases) / ~20% `[Kira estimates]` (rationale framing + cross-deal pattern reads)

**📄 Layout:**
- **H1:** "Recent M&A and partnership activity"
- **Timeline chart:** horizontal, 8-15 events across last 24-36 months
- **Narrative:** 3-section read — the consolidator / the divestor / the cross-border buyer
- Sections ≤3 · body ≤350 chars each

### 🎨 A+ Flex

**🔥 Expand condition:** if `m_and_a_events_last_3y >= 6`:
- **Page 1:** keeps timeline chart + 3-section narrative
- **Page 2 (`15_ma_timeline_p2`):** adds deal-by-deal table (acquirer / target / value / rationale / source-tag) for the 6+ events + sidebar reading partnership wave **separately** from M&A
- → For Vietnam coffee with 2-3 deals → stays 1 page
- → For Indonesia fintech with 8+ recent rounds + foreign stakes → expands to 2 pages

**Chart options:**
- `horizontal_timeline` (default — discrete dated events across 24-36 months)
- `network_diagram` (when cross-holdings or repeat-acquirer patterns dominate — one consolidator buying multiple targets)
- `segment_bar_horizontal` (deal value bar — when sizes vary widely and 'who is spending' is the read, not timing)

**Overlay emphasis keys:** `partnership`, `competitive_intensity`, `regulatory`
→ finserv overlay: regulator approval cadence on M&A + stake caps
→ industrial overlay: cross-border strategic stakes (Japan/Korea OEMs into SEA)
→ commodity overlay: ESG-driven divestment + estate roll-ups

---

## §11 Disruptor watch — `market_data_chart`

**🔍 Query bucket `06_disruptors_and_adjacents`:**
```
1. {country} {industry} new entrants startups {year-2} {year}
2. {country} {industry} foreign player market entry {year}
3. {country} {industry} adjacent disruption substitution threat {year}
4. {country} {industry} funding rounds Series A B startups {year}
```
**Expected sources:** regional VC tracker press (Tech in Asia, e27, KrAsia, DealStreetAsia) · startup funding databases (cited via primary press releases) · incumbent commentary on new competition · trade-association new-member announcements
**Tag mix:** ~50% named externals (regional VC press `[Tech in Asia 2025]` / `[e27 2025]` / `[KrAsia 2025]` / `[DealStreetAsia 2025]`, startup press releases) / ~50% `[Kira estimates]` — disruptor scoring + threat-tier is a KIRA synthesis call; most cards land `[Kira estimates]` tagged on the threat-tier figure

**📄 Layout:**
- **H1:** "Disruptor watch: new entrants and adjacent threats"
- **6-card disruptor grid** (use_case_grid-style treatment, ~200 chars per card) profiling 3-6 named disruptors — new entrants (<3 years), adjacent-industry threats, foreign players entering
  - Each card: name, model, funding/parent, share or rev signal, threat-tier
- **Narrative:** 3-section read — the 2-3 credible threats vs the noise
- Sections ≤3 · body ≤350 chars each

**Skip if:** no credible disruptors surfaced → replace with 'demand-side substitution' read on the same page.

### 🎨 A+ Flex

**Chart options:**
- `bubble_2x2` (default — threat-tier vs traction)
- `segment_bar_horizontal` (disruptor funding bar — when funding/backing is the most defensible signal, VC-heavy verticals)
- `heatmap_5x5` (threat heatmap likelihood × impact — when disruptors group into a risk-matrix read rather than individual cards)

**Overlay emphasis keys:** `risk_factors`, `competitive_intensity`, `ai_use_cases`
→ finserv overlay: digital-only challenger banks + super-app embedded finance threats
→ fmcg overlay: D2C/quick-commerce native brands + private-label encroachment
→ industrial overlay: Chinese OEM entry + tech-stack disruption (EV in ICE, software-defined in mechanical)

**No expand condition** (always 1 page).

---

## §12 Methodology endnote — `methodology_endnote`

**Layout:**
- Source mix breakdown — `[Kira estimates]` share % vs named-external share % (target ~20-30% `[Kira estimates]`)
- **Full alias registry** — every `[<Source Alias> <Year>]` used anywhere in the report resolved to its full citation, sorted alphabetically with `Kira estimates = KIRA in-house analyst triangulation` last
- Key data anchors (filings drawn, trade press windows, KIRA share-split + pricing-tier triangulation methodology)
- Contact + next research footer
- Auto-generated from source-tag census of the report (alias registry built up as sections drafted)

**No A+ flex** (boilerplate).

---

## Summary — page count flex range

| Scenario | Page count |
|---|---|
| **Floor** (no expands trigger, all 1-page sections) | **14 pages** |
| **Baseline** (typical Vietnam coffee / Thailand auto market — 1 expand on competitor matrix) | 15 pages |
| **Rich data** (2 expands trigger, e.g. 10+ competitors + 6+ M&A events) | 16 pages |
| **Very rich** (3+ expands trigger, e.g. Indonesia banking — 12+ competitors + 4+ strategic groups + 6+ deals) | **17 pages** |

**Note:** Auto-split safety on §05 can push the ceiling to **18 pages** if matrix overflows even on the 1-page version. Inside envelope per manifest.

## Overlay × blueprint interaction examples

| Topic | Overlay picked | What changes |
|---|---|---|
| Vietnam coffee competitive landscape 2026 | `fmcg` | §05 emphasizes MT/GT ownership stack; §07 price-tier × distribution-breadth axes; §09 private-label pressure; §11 quick-commerce D2C threats |
| Indonesia banking competitive landscape 2026 | `finserv` | §04 super-app concentration HHI framing; §05 state-vs-foreign ownership split; §10 regulator approval cadence on stakes; §11 digital-only challenger banks; **expands to 17 pages** (12+ named banks, 6+ deals, 4+ strategic groups) |
| Thailand auto competitive landscape 2026 | `consumer_durables` (or industrial) | §05 OEM-parent grouping stack (Toyota Group, Hyundai); §07 scale × digital maturity (legacy OEM vs EV native); §11 Chinese OEM entry threat; §09 financing-bundle pricing |
| Malaysia palm oil competitive landscape 2026 | `commodity` | §04 estate vs smallholder concentration; §06 FX + benchmark as share-shift trigger; §10 ESG-driven divestment + estate roll-ups |

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
- Section count target (15 base OK? 14-17 page flex range OK? 18-page ceiling on auto-split also OK?)
- Voice / register OK? (table-heavy + decisive, only §03b implications is de-cliented imperative — rest is observational)
- Overlay vertical assignment OK? (any topic types missing? note: `ai_use_cases` overlay key only appears once, at §11 disruptor watch — intentional or extend?)
- Top-3 deep-profile floor OK? (vs. extending to top-5 if data supports? currently locked at 3 per `player_profiles_target: 3` in manifest)
- "One divider only" rule OK? (différent from `market_analysis` per-chapter dividers — competitor matrix is the through-line)
- Anything missing for "competitive landscape" that mày expect from KIRA's POV? (e.g. supply chain map? customer/buyer side?)
