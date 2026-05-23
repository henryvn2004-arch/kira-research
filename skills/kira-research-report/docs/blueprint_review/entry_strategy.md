# entry_strategy — section-by-section review (v2 qualitative + A+ flex)

> **For Henry to verify.** Mark each section ✏️ to change / ❌ to remove / ➕ to add / ✅ ok. Send back the list, I apply changes.
>
> **Profile:** 14 sections, **13-17 pages** (baseline 13-15 + 0-4 expand pages depending on data richness), qualitative-only (no P&L, no capex, no opex). Pivot from v1 happened 2026-05-23.
> **Source mix target (Phase L.3 framing):** ~20-30% `[Kira estimates]` / ~70-80% named external sources (`[<Source Alias> <Year>]`). Methodology endnote lists every alias used across the report.
> **Total query count:** 25 across 8 buckets.

### Source tag system (Phase L.3 — applies to every content page)

Two tag categories only. The deprecated `[primary]` / `[secondary]` / `[estimate]` trio is GONE.

- `[Kira estimates]` — any KIRA-derived figure (in-house triangulation, synthesis across multiple inputs, model output). Replaces both old `[primary]` AND old `[estimate]`.
- `[<Source Alias> <Year>]` — external citable source named inline. Examples for entry_strategy topics: `[BPS 2024]`, `[GSO 2024]`, `[BNM Circular 2025]`, `[OJK Reg No. 12/2024]`, `[Vinacafe AR 2025]`, `[World Bank DB 2024]`, `[IMF Article IV 2025]`.
- `[user-input]` — UC3 only.

**Source key footer (NEW, every content page):** every page using named-source tags MUST end with a one-line `SOURCE KEY · <alias> = <full citation> · ... · Kira estimates = KIRA in-house analyst triangulation` resolving every alias appearing on that page. Aliases sort alphabetically, `Kira estimates` last. ~280 char cap.

### A+ flex layer (Phase J)

Each section can have up to 3 customization layers:
- **Expand condition** — if data is rich, section grows 1→2 pages. 4 sections have this.
- **Chart options** — 2-3 chart shapes the gen picks based on data. 10 sections have this.
- **Overlay emphasis** — vertical-specific bias (fmcg / finserv / industrial / consumer_durables / services / commodity). Most sections have keys.

---

## §00 Cover — `cover`

**Layout:** Standard KIRA cover — title + "entry strategy" descriptor + country/industry/year + KIRA branding + report ID + confidential tag.

**No A+ flex** (boilerplate).

---

## §01 Methodology (inline) — `methodology_inline`

**Layout:** 2-col overview, qualitative-only note.

**No A+ flex** (boilerplate).

---

## §02 Contents — `toc`

**Layout:** Auto-generated TOC + page counter.

**No A+ flex** (boilerplate).

---

## §03 Divider — "Entry strategy" — `divider`

**Layout:** Dark-mode full-page chapter break. Thesis statement.

**No A+ flex** (boilerplate).

---

## §04 Executive summary (2 pages) — `exec_summary_p1 + exec_summary_p2_implications`

### Page 1 — exec_summary_p1

**🔍 Synthesized from §05-§13.** No own queries.

**📄 Layout:**
- **4 callouts (top row):** addressable opportunity directional / recommended entry mode / competitive intensity tag / operating-environment tag
- **2-col narrative:** ~1200 chars, lead with recommendation
- **1 anchor chart:** compressed opportunity sizing

### Page 2 — exec_summary_p2_implications

**📄 Layout:** 5-card grid (Build / Partner / Acquire / License / Stay out). One card per pathway.

### 🎨 A+ Flex

**Chart options for page 1 anchor chart:**
- `addressable_wedge_donut` (default — if focusing on TAM/SAM/SOM context)
- `trend_line_3y` (if 3+ years of historical data anchors)
- `segment_bar_horizontal` (if segment split is the lead story)

**Overlay emphasis keys:** `market_opportunity`, `competitive_intensity`, `partnership`, `risk_factors`
→ For Vietnam coffee (fmcg): emphasizes shopper occasions + MT vs traditional + cafe channel
→ For Indonesia EV battery (industrial): emphasizes capex cycle + OEM relationships + local content

**No expand condition** (always 2 pages).

---

## §05 Market opportunity (qualitative read) — `market_data_chart`

**🔍 Query bucket `01_opportunity_sizing_anchor`:**
```
1. {country} {industry} market size {year} USD addressable CAGR {year+5}
2. {country} {industry} historical market value {year-3} to {year}
```
**Tag mix:** ~70% named externals (`[<Stats Bureau> <year>]`, `[<Central Bank> <year>]`, `[World Bank DB 2024]`) / ~30% `[Kira estimates]` for synthesized addressable wedge / CAGR triangulation

**📄 Layout:**
- **H1:** "Market opportunity: qualitative read on [industry] in [country]"
- **Body (left):** 2-3 paragraphs calibrated voice — directional verdict (`material and accelerating` / `modest but steady` / `contested and consolidating`)
- **Chart (right):** anchor chart of total + addressable wedge

### 🎨 A+ Flex

**Chart options:**
- `trend_line_5y` (5+ years of historical data)
- `addressable_wedge_donut` (TAM/SAM/SOM-focused)
- `segment_bar_horizontal` (segment-split-focused)

**Overlay emphasis keys:** `market_opportunity`, `forecast_drivers`
→ fmcg overlay: emphasize shopper occasions (home consumption vs on-premise)
→ commodity overlay: emphasize benchmark price + FX as twin demand levers

**No expand condition** (always 1 page).

---

## §06 Target customer segment — `market_data_chart`

**🔍 Query bucket `02_target_segment_qualitative`:**
```
1. {country} {industry} {candidate_segment} segment size households OR firms
2. {country} {industry} customer demographics income bands {year}
3. {country} middle-class urban households purchasing power {industry}
```
**Tag mix:** ~55% named externals (stats bureau, household income survey, central bank consumer finance) / ~45% `[Kira estimates]` (KIRA tends to do the segment-size math on top of raw demo + income tables)

**📄 Layout:**
- **H1:** "Target customer segment: definition and qualitative fit"
- **Body answers 3 questions:** who they are (≤220) · how growing (≤1 anchor + tag) · why first (≤600)
- **Chart:** segment-size vs total / growth trajectory / qualitative priority map

### 🎨 A+ Flex

**Chart options:**
- `segment_bar_horizontal` (ranked segments by size)
- `share_donut` (single-period composition)
- `dual_axis_combo` (size + growth on two axes)

**Overlay emphasis keys:** `market_opportunity`, `consumer_behavior`, `forecast_drivers`
→ fmcg: NPD cycle + household penetration framing
→ services: ARPU × retention framing
→ industrial: B2B firm count + project pipeline framing

**No expand condition** (always 1 page).

---

## §07 Competitive intensity — `competitive_structure`

**🔍 Query bucket `03_competitive_intensity`:**
```
1. {country} {industry} top 5 players market share {year} revenue ranking
2. {leading_player_candidate} {country} revenue segment {industry}
3. {country} {industry} new entrant foreign player launch {year-2} to {year}
```
**Tag mix:** ~75% named externals (company AR aliases like `[Vinacafe AR 2025]`, exchange filings, competition authority filings) / ~25% `[Kira estimates]` for share-band synthesis

**📄 Layout:**
- **H1:** "Competitive intensity: who an entrant has to outflank"
- **Intensity tag:** `FRAGMENTED` / `CONTESTED` / `CONSOLIDATING` / `OLIGOPOLY`
- **5 mini player cards:** player_name (≤30) · revenue+share band (≤60) · segment focus (≤60) · structural advantage (≤110)
- **Sidebar narrative (right rail):** ≤600 chars

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `named_competitors_count >= 6`:
- **Page 1:** intensity tag + top-5 mini-grid (unchanged)
- **Page 2:** adds "next tier" grid of 4-6 additional players (challengers / niche specialists / recent entrants) + extended sidebar calling out 1-2 structural-group dynamics (e.g. premium incumbents vs value disruptors)
- → For Vietnam coffee with 4-5 named brands → stays 1 page
- → For Indonesia banking with 12+ named banks → expands to 2 pages

**Chart options:**
- `share_donut` (single-period top-5 share)
- `bubble_2x2` (positioning on 2 dimensions)
- `segment_bar_horizontal` (ranked revenue)

**Overlay emphasis keys:** `competitive_intensity`, `partnership`
→ finserv overlay: super-app concentration framing
→ commodity overlay: smallholder vs estate split framing
→ industrial overlay: OEM/Tier-1 supplier relationships

---

## §08 Regulatory hurdles + licensing — `market_data_chart`

**🔍 Query bucket `04_regulatory_licensing`:**
```
1. {country} {industry} foreign ownership cap FDI rules {year}
2. {country} {industry} regulator {regulator_body} licensing application timeline cost
3. {country} investment promotion {industry} incentives tax holiday
```
**Tag mix:** ~80% named externals (named regulator circulars + statute IDs, e.g. `[BNM Circular 2025]`, `[OJK Reg No. 12/2024]`, `[MOIT Decree 100/2024]`) / ~20% `[Kira estimates]` on timeline-band synthesis

**📄 Layout:**
- **H1:** "Regulatory hurdles and licensing path"
- **Body:** foreign ownership cap · sector licensing · timeline bands · compliance burden · recent shifts
- **Chart:** horizontal band visualization — license timeline phases (qualitative)

### 🎨 A+ Flex

**Chart options:**
- `horizontal_timeline` (single license track with phases)
- `gantt_horizontal` (parallel tracks: FDI + sector license + tax registration)

**Overlay emphasis keys:** `regulatory`, `risk_factors`
→ finserv overlay: central bank + securities regulator as first-class actors
→ commodity overlay: RSPO/EUDR sustainability cert pressure
→ industrial overlay: local content rules (TKDN, FTA implications)

**No expand condition** (always 1 page).

**QC rule:** Must name SPECIFIC regulator + license category.

---

## §09 Distribution + GTM channels — `market_data_chart`

**🔍 Query bucket `05_distribution_gtm_channels`:**
```
1. {country} {industry} distribution channels modern trade e-commerce traditional
2. {country} {industry} channel margin distributor markup retailer markup
```

**📄 Layout:**
- **H1:** "Distribution and go-to-market: channel options"
- **Chart:** 2×2 bubble — effort-to-establish vs reach-ceiling, each channel as bubble
- **Body:** 4-5 channel options NAMED for the country
- **Per-channel narrative:** directional, not modeled

### 🎨 A+ Flex

**Chart options:**
- `bubble_2x2` (effort × reach with bubble size = capacity)
- `network_diagram` (channel relationships)
- `stacked_bar_share_split` (channel mix share over time)

**Overlay emphasis keys:** `channel`, `partnership`
→ fmcg: MT vs GT split, quick commerce in Tier-1, cafe for premium
→ finserv: super-app embedded finance + agent network
→ industrial: distributor exclusivity + OEM direct sales

**No expand condition** (always 1 page).

**QC rule:** Generic channel labels rejected.

---

## §10 Local partnership candidates — `market_data_chart`

**🔍 Query bucket `06_partnership_landscape`:**
```
(search for named conglomerates, trading houses, distributor groups, agents per industry)
```

**📄 Layout:**
- **H1:** "Local partnership candidates"
- **Scoring matrix:** rows = 6-9 candidates, columns = fit / scale / track-record / ownership-flexibility (qualitative tags, no numbers)
- **Per row:** org_name (≤30) · ownership_group (≤30) · segment_footprint (≤60) · revenue_band (≤20) · score_strip (≤30)
- **Narrative beneath:** ≤600 chars naming top-2

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `candidate_partner_count >= 8`:
- **Page 1:** top-6 candidate scoring matrix + top-2 narrative (unchanged)
- **Page 2:** 3-5 additional second-tier candidates in same matrix + typology sidebar grouping candidates by archetype (conglomerate trading arm / pure-play distributor / family-owned regional / digital-native marketplace)

**Chart options:**
- `network_diagram` (partner-segment relationships)
- `bubble_2x2` (fit × scale, bubble = revenue band)
- `segment_bar_horizontal` (ranked by composite fit)

**Overlay emphasis keys:** `partnership`, `channel`, `competitive_intensity`
→ industrial: named distributors with OEM exclusivity histories
→ services: licensing partners (telco-MVNO, broker-tied agents)
→ commodity: smallholder cooperatives + estate operators + RSPO-certified mills

---

## §11 Operating environment (3 lenses) — `market_data_chart`

**🔍 Query bucket `07_operating_environment` (NEW in v2):**
```
(FX repatriation, tax stability, decision-making cadence, logistics infra,
digital payment rails, talent availability per function)
```
**Sources:** central bank capital flow reports · World Bank Doing Business · IMF Article IV reports

**📄 Layout:**
- **H1:** "Operating environment: regulatory climate, cultural fit, infrastructure readiness"
- **3 lens cards:**
  1. Regulatory climate (stability, FX, tax)
  2. Cultural fit (B2B vs B2C, decision cadence, working language)
  3. Infrastructure readiness (logistics, digital + payment rails, talent)
- **Each card:** lens_name (≤30) · tag `tailwind/neutral/headwind` (≤12) · body (≤240)
- **Narrative beneath:** ≤700 chars

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `lenses_with_strong_signal >= 2`:
- **Page 1:** keeps 3-lens summary + 1-paragraph synthesis
- **Page 2:** drills into the 2+ lenses with strongest signal — one half-page per drilled lens with named anchors (specific regulators, corridor lanes, universities/talent pools, payment rails) + "what this means for entry plan" callout per drilled lens

**Chart options:**
- `heatmap_5x5` (3-row variant for tailwind/neutral/headwind across 3 lenses + 5 dimensions — note: shared family with §13 risk matrix renderer)
- `segment_bar_horizontal` (ranked bar fallback)

**Overlay emphasis keys:** `regulatory`, `risk_factors`, `consumer_behavior`, `channel`
→ services: talent licensing + working-language reality + digital infra
→ commodity: weather/yield + FX + smallholder logistics
→ finserv: regulator scrutiny + KYC/AML overhead + payment rail maturity

---

## §12 Entry risk matrix — `risk_matrix` ← NEW PAGE TYPE

**🔍 Synthesized from §05-§11.**

**📄 Layout:**
- **H1:** "Entry risk matrix"
- **5×5 heatmap (left ~60%):** likelihood × impact, cells GREEN/AMBER/RED. **NO numerical scores.**
- **8-12 named risks placed** across cells, each ≤22 chars
- **Sidebar (right ~40%):** 3 cards expanding highest-severity risks
  - risk_name (≤30, mono UC) · severity_tag (≤14) · body (≤180)

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `risks_above_med_severity >= 8`:
- **Page 1:** keeps 5×5 heatmap + 3 highest-severity mitigation cards
- **Page 2:** stacked mitigation card grid (5-6 additional HIGH/MED risks) + "risk concentration" callout (does the bulk of HIGH risks cluster in one finding area? — e.g. "partner-dependency cluster" vs "regulatory cluster" vs "FX cluster")
- **No new heatmap on page 2** — page 1's is the single source of placement

**Chart options:** `heatmap_5x5` (only — page type is locked)

**Overlay emphasis keys:** `risk_factors`, `regulatory`, `competitive_intensity`, `partnership`
→ finserv: KYC/AML risk + regulator pendulum risk + super-app competition
→ commodity: weather yield + ESG cert + FX exposure
→ consumer_durables: warranty/service network gap + financing dependency

**Required risks (must include ≥1 each):** FX/macro · regulatory · operational · competitive-response · (rest industry-specific)

**QC rule:** Every cell traces to a finding in §05-§11.

---

## §13 Phased entry plan (12 / 24 / 36 months) — `forecast_outlook` (repurposed)

**🔍 Synthesized from all prior sections.**

**📄 Layout:**
- **H1:** "Phased entry plan: 12 / 24 / 36-month milestones"
- **3 phase cards (repurposed forecast_outlook):**
  1. Phase 1 (0-12 mo) — foundation: license, partner, first hires
  2. Phase 2 (13-24 mo) — commercial launch + first revenue
  3. Phase 3 (25-36 mo) — scale toward year-3 qualitative ambition
- **Each card:** phase_name (≤22) · milestone_anchor (≤18) · body (≤200 listing 3-4 deliverables)
- **Timeline chart:** horizontal Gantt-style — license / hire / partner / launch workstreams

### 🎨 A+ Flex

**Chart options:** `gantt_horizontal` (only — page type is locked)

**Overlay emphasis keys:** `partnership`, `channel`, `regulatory`, `forecast_drivers`
→ industrial: project pipeline alignment (construction wave, infrastructure cycle)
→ finserv: license sequencing (FDI → sector → product launch)
→ services: talent ramp + certification timing

**No expand condition** (always 1 page).

**Milestones are QUALITATIVE only.** No revenue numbers, no headcount targets, no capex figures.

---

## §14 Methodology endnote — `methodology_endnote`

**Layout:**
- Source mix breakdown — `[Kira estimates]` share % vs named-external share % (target ~20-30% `[Kira estimates]`, rest named externals)
- **Full alias registry** — every `[<Source Alias> <Year>]` used anywhere in the report resolved to its full citation, sorted alphabetically with `Kira estimates = KIRA in-house analyst triangulation` last
- Key data anchors (which named sources carried the load per bucket)
- KIRA estimate methodologies disclosed (triangulation patterns for synthesized figures)
- **Explicit note: brief is qualitative-only — no P&L, no capex, no opex**
- Contact + next research footer

**No A+ flex** (boilerplate).

---

## Summary — page count flex range

| Scenario | Page count |
|---|---|
| **Floor** (no expands trigger) | **13 pages** |
| **Baseline** (typical Vietnam coffee / Thailand auto market) | 14-15 pages |
| **Rich data** (1-2 expands trigger, e.g. 6+ competitors OR 8+ partners) | 15-16 pages |
| **Very rich** (3+ expands trigger, e.g. Indonesia banking + many regulators + many risks) | **17 pages** |

## Overlay × blueprint interaction examples

| Topic | Overlay picked | What changes |
|---|---|---|
| Vietnam coffee entry strategy 2026 | `fmcg` | §05 emphasizes shopper occasions; §09 MT vs GT split; §07 NPD cycle competitive frame |
| Indonesia EV battery entry strategy 2026 | `industrial` | §05 emphasizes capex cycle; §09 OEM relationships; §10 distributor-with-exclusivity |
| Singapore wealth management entry strategy 2026 | `finserv` | §08 central bank + securities regulator first; §10 license-tied broker partners; §12 KYC/AML risk |
| Malaysia palm oil entry strategy 2026 | `commodity` | §05 benchmark price + FX twin levers; §08 RSPO/EUDR cert pressure; §11 smallholder logistics |

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
- Section count target (14 base OK? 13-17 page flex range OK?)
- Voice / register OK? (calibrated, directional, qualitative)
- Overlay vertical assignment OK? (any topic types missing?)
- Anything missing for "entry strategy" that mày expect from KIRA's POV?
