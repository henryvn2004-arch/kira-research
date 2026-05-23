# entry_strategy — section-by-section review (v2 qualitative)

> **For Henry to verify.** Mark each section ✏️ to change / ❌ to remove / ➕ to add / ✅ ok. Send back the list, I apply changes.
>
> **Profile:** 14 sections, 13-15 pages, qualitative-only (no P&L, no capex, no opex). Pivot from v1 happened 2026-05-23.
> **Source mix target:** 20% primary / 60% secondary / 20% estimate.
> **Total query count:** 25 across 8 buckets.

---

## §00 Cover — `cover`

**Layout:** Standard KIRA cover — title + "entry strategy" descriptor + country/industry/year + KIRA branding + report ID + confidential tag.

**No research queries** (boilerplate).

---

## §01 Methodology (inline) — `methodology_inline`

**Layout:** 2-column overview — primary sources (operator interviews where available) / secondary sources / KIRA qualitative triangulation. Notes brief is qualitative-only.

**No research queries** (boilerplate).

---

## §02 Contents — `toc`

**Layout:** Auto-generated TOC + page counter.

**No research queries.**

---

## §03 Divider — "Entry strategy" — `divider`

**Layout:** Dark-mode full-page chapter break. Carries a thesis statement, e.g. "A market worth entering, but only on terms."

**No research queries.**

---

## §04 Executive summary (2 pages) — `exec_summary_p1 + exec_summary_p2_implications`

### Page 1 — exec_summary_p1

**🔍 Synthesized from ALL section queries below.** No own queries — pulls anchors from §05-§13.

**📄 Layout:**
- **4 callouts (top row):**
  1. Addressable opportunity directional read (e.g. `MATERIAL · ACCELERATING`)
  2. Recommended entry mode (`PARTNERED · MARKET-MAKING`)
  3. Competitive intensity tag (`CONTESTED · OLIGOPOLISTIC`)
  4. Operating-environment tag (`NEUTRAL · INFRASTRUCTURE-LED`)
- **2-col narrative:** leads with the recommendation, ~1200 chars total
- **1 anchor chart:** compressed opportunity sizing (1 chart, no forecast)

**Char caps:** num_max=12 chars, label_max=30 (mono UC), change_line_max=38, narrative ≤1200 chars total.

### Page 2 — exec_summary_p2_implications

**📄 Layout:** 5-card grid framing the entry decision across **Build / Partner / Acquire / License / Stay out**. One card per pathway, even when one is recommended.

**Char caps:** verb-led headline ≤60, body ≤360 per card. Recommended pathway carries visual marker (border/checkmark).

**Required:** Recommended entry mode MUST appear in 1 callout AND in narrative paragraph 1. Year-3 ambition is qualitative ("top-3 contender" / "niche premium foothold"), no revenue number.

---

## §05 Market opportunity (qualitative read) — `market_data_chart`

**🔍 Query bucket `01_opportunity_sizing_anchor`:**
```
1. {country} {industry} market size {year} USD addressable CAGR {year+5}
2. {country} {industry} historical market value {year-3} to {year}
```
**Expected sources:** industry trade associations · listed-company annual reports · government industry surveys · central bank sector reports
**Tag mix:** 70% secondary / 30% estimate

**📄 Layout:**
- **H1:** "Market opportunity: qualitative read on [industry] in [country]"
- **Body (left):** 2-3 paragraphs of calibrated voice — lead with directional verdict (`material and accelerating` / `modest but steady` / `contested and consolidating` / `fragmenting and contested`)
- **Chart (right):** 1 anchor chart — total market size + addressable wedge
- **Source line:** bottom, mono UC

**Char caps:** 1-2 anchor numbers MAX, no sizing tables, single chart + 1-paragraph interpretation.

---

## §06 Target customer segment — `market_data_chart`

**🔍 Query bucket `02_target_segment_qualitative`:**
```
1. {country} {industry} {candidate_segment} segment size households OR firms
2. {country} {industry} customer demographics income bands {year}
3. {country} middle-class urban households purchasing power {industry}
```
**Expected sources:** national statistics bureau (BPS Indonesia / GSO Vietnam / NSO Thailand / PSA Philippines / DOSM Malaysia / SingStat) · consumer panels · industry consumer surveys · central bank household finance surveys
**Tag mix:** 55% secondary / 45% estimate

**📄 Layout:**
- **H1:** "Target customer segment: definition and qualitative fit"
- **Body answers 3 questions:**
  1. **Who they are** (definition, ≤220 chars)
  2. **How they're growing** (directional, ≤1 anchor number + tag)
  3. **Why first** (rationale, ≤600 chars)
- **Chart:** segment-size-vs-total + growth trajectory, OR qualitative segment-priority map

---

## §07 Competitive intensity — `competitive_structure`

**🔍 Query bucket `03_competitive_intensity`:**
```
1. {country} {industry} top 5 players market share {year} revenue ranking
2. {leading_player_candidate} {country} revenue segment {industry}
3. {country} {industry} new entrant foreign player launch {year-2} to {year}
```
**Expected sources:** listed-company filings (IDX/SET/SGX/HoSE/Bursa/PSE) · company press releases · industry trade reports · competition authority filings
**Tag mix:** 75% secondary / 20% estimate / 5% primary

**📄 Layout:**
- **H1:** "Competitive intensity: who an entrant has to outflank"
- **Intensity tag (top right):** `FRAGMENTED` / `CONTESTED` / `CONSOLIDATING` / `OLIGOPOLY`
- **5 mini player cards (grid):** each card carries:
  - `player_name` (≤30 chars)
  - revenue + share band (≤60 chars, e.g. "USD 800 mn · high single-digit share")
  - segment focus (≤60 chars)
  - structural advantage to outflank (≤110 chars)
- **Sidebar narrative (right rail):** ≤600 chars

**Note:** HHI may appear as 1 anchor number if cleanly sourced, but NOT the centerpiece. Replaces v1's quantitative HHI emphasis.

---

## §08 Regulatory hurdles + licensing — `market_data_chart`

**🔍 Query bucket `04_regulatory_licensing`:**
```
1. {country} {industry} foreign ownership cap FDI rules {year}
2. {country} {industry} regulator {regulator_body} licensing application timeline cost
3. {country} investment promotion {industry} incentives tax holiday
```
**Expected sources:** investment promotion body (BKPM Indonesia · MIC Vietnam · BOI Thailand · MIDA Malaysia · EDB Singapore · BOI Philippines) · ministry filings · law-firm sector guides · trade association FAQs
**Tag mix:** 80% secondary / 20% estimate

**📄 Layout:**
- **H1:** "Regulatory hurdles and licensing path"
- **Body:**
  - foreign ownership cap (specific %)
  - sector licensing requirements (named licenses)
  - qualitative timeline-to-license (`3-6 months` band, not date)
  - ongoing compliance burden (directional)
  - recent regulatory shifts affecting entry
- **Chart:** horizontal band visualization — license timeline phases (qualitative, not costed)

**QC rule:** Must name SPECIFIC regulator + license category. Generic "regulatory environment" framing rejected.

---

## §09 Distribution + GTM channels — `market_data_chart`

**🔍 Query bucket `05_distribution_gtm_channels`:**
```
1. {country} {industry} distribution channels modern trade e-commerce traditional
2. {country} {industry} channel margin distributor markup retailer markup
```
**Expected sources:** industry trade press · logistics-sector reports · listed-retailer filings · e-commerce platform investor docs

**📄 Layout:**
- **H1:** "Distribution and go-to-market: channel options"
- **Chart:** 2×2 bubble plot — `effort-to-establish` (x) vs `reach-ceiling` (y), each channel as a bubble (size band)
- **Body:** 4-5 channel options NAMED for the country:
  - Indonesia example: traditional trade via Alfamart/Indomaret · modern trade via Hypermart · e-commerce via Tokopedia/Shopee · B2B via local distributors · direct via own boutique
- **Per-channel narrative:** directional (setup difficulty, ramp speed, reach ceiling) — not modeled

**QC rule:** Generic channel labels rejected — must NAME specific channels relevant to that country.

---

## §10 Local partnership candidates — `market_data_chart`

**🔍 Query bucket `06_partnership_landscape`:**
```
(queries not detailed in source extract above — search for named conglomerates,
trading houses, distributor groups, agents per industry)
```
**Expected sources:** local M&A press · trading house annual reports · industry distributor directories

**📄 Layout:**
- **H1:** "Local partnership candidates"
- **Scoring matrix (table):** rows = 6-9 candidates, columns = `fit` / `scale` / `track-record` / `ownership-flexibility`
  - Each cell uses qualitative tag (`strong fit` / `good fit` / `partial fit`) NOT numeric scores
- **Each candidate row:** org_name (≤30) · ownership_group (≤30) · segment_footprint (≤60) · revenue_band (≤20, e.g. "USD 200-400 mn") · score_strip (≤30)
- **Anchor narrative beneath table:** ≤600 chars naming top-2 recommended candidates

---

## §11 Operating environment (3 lenses) — `market_data_chart`

**🔍 Query bucket `07_operating_environment`** (NEW in v2, replaces capex+opex from v1):
```
(queries: FX repatriation, tax stability, decision-making cadence, logistics infra,
digital payment rails, talent availability per function)
```
**Expected sources:** central bank capital flow reports · World Bank Doing Business · IMF Article IV reports · global staffing-firm regional outlooks (without naming them in copy)

**📄 Layout:**
- **H1:** "Operating environment: regulatory climate, cultural fit, infrastructure readiness"
- **3 lens cards (horizontal row):**
  1. **Regulatory climate** — beyond the license itself (stability, FX repatriation, tax predictability)
  2. **Cultural fit** — B2B vs B2C norms, decision cadence, working-language reality
  3. **Infrastructure readiness** — logistics backbone, digital + payment rails, talent for the function
- **Each lens card:** lens_name (≤30) · tag (`tailwind` / `neutral` / `headwind`, ≤12 chars) · body (≤240 chars)
- **Narrative beneath cards:** ≤700 chars
- **No quantitative scores.** All claims [secondary] or [estimate].

---

## §12 Entry risk matrix — `risk_matrix` ← NEW PAGE TYPE

**🔍 Synthesized from §05-§11.** No own queries — risks must trace to findings in earlier sections.

**📄 Layout:**
- **H1:** "Entry risk matrix"
- **5×5 heatmap (chart, left ~60%):** likelihood (x-axis) × impact (y-axis). Cells color-coded GREEN/AMBER/RED. **NO numerical scores.**
- **8-12 named risks placed across cells.** Each cell label ≤22 chars.
- **Sidebar (right ~40%):** 3 cards expanding highest-severity risks
  - risk_name (≤30, mono UC) · severity_tag (≤14, e.g. `HIGH · LIKELY`) · body (≤180 chars, qualitative framing + mitigation)

**Required risks (must include at least 1 each):**
- FX/macro risk
- Regulatory risk
- Operational risk
- Competitive-response risk
- (rest are industry-specific)

**QC rule:** Every cell must trace to a finding in §05-§11.

---

## §13 Phased entry plan (12 / 24 / 36 months) — `forecast_outlook` (repurposed)

**🔍 Synthesized from all prior sections.** No own queries.

**📄 Layout:**
- **H1:** "Phased entry plan: 12 / 24 / 36-month milestones"
- **3 phase cards (horizontal row, repurposed forecast_outlook):**
  1. **Phase 1 (0-12 months) — foundation:** license, partner, first hires
  2. **Phase 2 (13-24 months) — commercial launch + first revenue**
  3. **Phase 3 (25-36 months) — scale toward year-3 qualitative ambition**
- **Each phase card:** phase_name (≤22) · milestone_anchor (≤18, e.g. "License granted") · body (≤200 listing 3-4 deliverables)
- **Timeline chart (replaces forecast chart):** horizontal Gantt-style with workstream rows — license / hire / partner / launch

**Milestones are QUALITATIVE only.** No revenue numbers, no headcount targets, no capex figures.

---

## §14 Methodology endnote — `methodology_endnote`

**Layout:**
- Source mix breakdown (`[primary]` / `[secondary]` / `[estimate]` percentages)
- Key data anchors
- KIRA estimate methodologies disclosed (especially around segment sizing + qualitative severity calls)
- **Explicit note: brief is qualitative-only — no P&L scenarios, no capex stacks, no opex ramp curves.**
- Contact + next research footer

---

## Other buckets that feed multiple sections

- **`08_risk_factors`** — feeds §12 risk matrix. Searches for FX swings, political stability, regulatory pendulum, channel disruption events.

---

## Sections / charts / page_types that are NEW vs market_analysis

| New | Where |
|---|---|
| `risk_matrix` page type (5x5 qualitative heatmap) | §12 |
| Operating environment 3-lens card | §11 |
| Competitive intensity grid (compressed 5-card vs deep profiles) | §07 |
| Phased entry plan (repurposes forecast_outlook → 3 phase cards + Gantt) | §13 |

## What's NOT here (intentionally dropped from v1)

- ❌ P&L scenario (bull/base/bear lines)
- ❌ Capex requirements section
- ❌ Opex / staffing model + ramp curve
- ❌ Year-3 numeric revenue ambition
- ❌ Mercer/Robert Walters/Michael Page extension to anti-positioning (Henry confirmed standard blacklist sufficient)
- ❌ `confirm_step` gate (was true in v1; now false since no quantitative commitments)

---

## Henry's review checklist

For each numbered section above, send back ONE of:
- ✅ ok
- ✏️ change: [what to change]
- ❌ remove
- ➕ add new section: [title + brief description + where to insert]

And for the blueprint as a whole:
- Section count target (14 OK? want fewer/more?)
- Voice / register OK? (calibrated, directional, qualitative)
- Anything missing for "entry strategy" that mày expect from KIRA's POV?
