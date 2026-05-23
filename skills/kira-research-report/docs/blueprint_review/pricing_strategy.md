# pricing_strategy — section-by-section review (v2 general market view + A+ flex)

> **For Henry to verify.** Mark each section ✏️ to change / ❌ to remove / ➕ to add / ✅ ok. Send back the list, I apply changes.
>
> **Henry's v2 brief (2026-05-23):** *"làm chung chung thông tin thị trường thôi, ko cần chi tiết quá."* — this blueprint is now a **general market pricing overview**, not a per-SKU pricing-committee deliverable. Tier-band indicative reads + qualitative directional commentary > exhaustive scraping.
>
> **Profile:** 13 sections, **13-15 pages** (baseline 13 + 0-3 expand pages depending on data richness), qualitative + tier-band only (no per-SKU price points, no full P&L). Pivot from v1 happened 2026-05-23.
> **Source mix target (Phase L.3 framing):** ~20-30% `[Kira estimates]` / ~70-80% named externals (`[<Source Alias> <Year>]`). v1 / v2 framing had primary 25-35% — that bucket has been merged into `[Kira estimates]` since KIRA's channel-scan observations now read as KIRA-derived synthesis. Methodology endnote lists every alias used.
> **Total query count:** 20 across 6 buckets (v1 was deeper per bucket).

### What changed v1 → v2 (call-outs)

- **Dropped B2B halt rule** — if per-SKU pricing is opaque (contact-sales B2B, regulated single-price), blueprint now **proceeds on partial data** with tier-level indicative bands + methodology disclosure. No pipeline halt.
- **Per-SKU price-point table → indicative price bands** — §06 now 5-6 brands × tier label + low-high band + directional change. No per-SKU pack-size columns.
- **Quantitative promo norms → qualitative directional matrix** — §11 promo patterns are now `rare / occasional / frequent / dominant` qualitative cells, not frequency × depth quant tables.
- **Failure case study optional** — §12 ships with 2 successes + 1 failure if a credible failure surfaces; if not, 2 successes only. No invention.
- **Source mix shifted** — less per-SKU scraping, more disclosure + survey lean. In Phase L.3 framing: ~70-80% named externals (listed-company tier disclosures, WTP surveys, marketplace listings), ~20-30% `[Kira estimates]` (band synthesis on top of disclosed point prices). The old `[primary]` bucket is gone — KIRA-conducted channel scans now read as `[Kira estimates]`.
- **NEW page type `price_quality_matrix`** — §07 is the centerpiece (was buried mid-deck in v1).

### Source tag system (Phase L.3 — applies to every content page)

Two tag categories only. The deprecated `[primary]` / `[secondary]` / `[estimate]` trio is GONE.

- `[Kira estimates]` — any KIRA-derived figure: KIRA channel-scan tier-band observations, WTP triangulation, price-quality scoring composite, elasticity coefficients calibrated to anchor studies. Replaces both old `[primary]` AND old `[estimate]`.
- `[<Source Alias> <Year>]` — external citable source. Examples for pricing_strategy: `[Shopee VN 2026]`, `[Tokopedia 2026]`, `[Lazada TH 2026]`, `[Rakuten JP 2025]`, `[Coupang KR 2026]`, `[Vinamilk AR 2025]`, `[Masan Q3 2025]`, `[Viettel AR 2025]`, `[AC Nielsen 2026]`, `[Kantar WTP Study 2025]`, `[BOT FX Pass-through 2024]`.
- `[user-input]` — UC3 only.

**Source key footer (NEW, every content page):** every page using named-source tags MUST end with a one-line `SOURCE KEY · <alias> = <full citation> · ... · Kira estimates = KIRA in-house analyst triangulation` resolving every alias on that page. Aliases sort alphabetically, `Kira estimates` last. ~280 char cap. WTP + elasticity pages especially: anchor study + triangulation method disclosed in the source key footer.

### A+ flex layer (Phase J)

Each section can have up to 3 customization layers:
- **Expand condition** — if data is rich, section grows 1→2 pages. 3 sections have this.
- **Chart options** — 2-3 chart shapes the gen picks based on data. 8 sections have this (§07 locked to one).
- **Overlay emphasis** — vertical-specific bias (fmcg / finserv / industrial / consumer_durables / services / commodity). Most sections have keys; **pricing overlays lean fmcg / finserv / services**.

---

## §00 Cover — `cover`

**Layout:** Standard KIRA cover — title pattern `{country} {industry} pricing strategy — {year}` + KIRA branding + report ID + confidential tag.

**No A+ flex** (boilerplate).

---

## §01 Methodology (inline) — `methodology_inline`

**Layout:** 2-col overview — left = channel scans + tier-band observation method; right = secondary sources (WTP surveys, regulator filings, listed-company tier disclosure) + KIRA estimate methods.

**Voice note:** frame method as a *general market pricing read* — do NOT over-promise per-SKU weekly scraping.

**No A+ flex** (boilerplate).

---

## §02 Contents — `toc`

**Layout:** Auto-generated TOC + page counter.

**No A+ flex** (boilerplate).

---

## §03 Divider — "Pricing strategy" — `divider`

**Layout:** Dark-mode full-page chapter break. Single thesis statement on pricing inflection (e.g. *"Premium is pulling away. Mass is fragmenting."*). Mini-toc pills preview: Tier stack · Price bands · Price-quality map · WTP by segment.

**No A+ flex** (boilerplate).

---

## §04 Executive summary (2 pages) — `exec_summary_p1 + exec_summary_p2_implications`

### Page 1 — exec_summary_p1

**🔍 Synthesized from §05-§12.** No own queries.

**📄 Layout:**
- **4 callouts (top row):** dominant tier share / biggest pricing move 2024-2026 / premium opportunity signal / prevailing promo direction (each num_max ≤ 12 chars)
- **2-col narrative:** ~1200 chars, lead with directional pricing read
- **1 anchor chart:** tier stack composition

### Page 2 — exec_summary_p2_implications

**📄 Layout:** 5-card grid framed as pricing actions — **HOLD / DISCOUNT / PREMIUMIZE / FRAGMENT / EXIT** (uppercase tags ≤ 18 chars, body ≤ 360 chars each).

### 🎨 A+ Flex

**Chart options for page 1 anchor chart:**
- `stacked_bar_share_split` (default — 4 tiers as composition at single point)
- `segment_bar_horizontal` (when value share + directional growth read both available)
- `trend_line_3y` (3-year tier-share migration story)

**Overlay emphasis keys:** `market_opportunity`, `pricing`, `consumer_behavior`
→ For Vietnam coffee (fmcg): emphasizes premium-tier share gain + GT promo cadence + WTP gap on premium occasion
→ For Indonesia mobile telco (services): emphasizes ARPU tier mix + subscription vs prepaid migration + dynamic-pricing signals
→ For Thailand BNPL (finserv): emphasizes MDR positioning + subscription-fee floor + freemium conversion

**No expand condition** (always 2 pages).

**Anchor rule:** every implication card must anchor to a number or directional read from the body — premium share %, WTP gap, promo direction, tier momentum — not generic advice. Ranges OK; point precision not required.

---

## §05 Pricing landscape: 4-tier stack — `market_data_chart`

**🔍 Query bucket `01_market_price_bands` (shared with §06, §11):**
```
1. {country} {industry} leading brands price range {year}
2. {country} {industry} shelf price modern trade {year} tier comparison
3. {country} {industry} pack size price tier premium mid mass {year}
```
**Tag mix:** ~50% named externals (marketplace listings `[Shopee VN 2026]` / `[Tokopedia 2026]` / `[Lazada TH 2026]`, listed-company tier disclosures like `[Vinamilk AR 2025]` / `[Masan Q3 2025]`) / ~50% `[Kira estimates]` — KIRA's own channel-scan observations + tier-band synthesis read as `[Kira estimates]` (the v1 `[primary]` bucket folded in)

**📄 Layout:**
- **H1:** "Pricing landscape: 4-tier stack"
- **Chart:** stacked horizontal bar OR 4-row tier card stack (premium / mid / mass / value), each tier value share + volume share + 2-year directional growth
- **Body (left):** 3 sub-sections (each ≤ 350 chars) — where value is migrating · which tier is squeezed · where new entry is viable

### 🎨 A+ Flex

**Chart options:**
- `stacked_bar_share_split` (default — value + volume composition both populated)
- `segment_bar_horizontal` (tier card stack — only value share available)
- `dual_axis_combo` (value share vs 2-year growth — emphasizes migration)

**Overlay emphasis keys:** `pricing`, `market_opportunity`, `consumer_behavior`
→ fmcg overlay: premium tier sized in USD/unit band (e.g. *"Premium = USD 12+ per 500g"*); GT vs MT tier price gap framing
→ services overlay: ARPU tiers (e.g. *"Premium postpaid = USD 25+/mo"*); subscription stickiness as tier protection
→ finserv overlay: subscription/MDR tiers; BNPL fee structure as mass-tier entry

**No expand condition** (always 1 page).

**Tier definitions must be band-anchored**, not abstract (e.g. *"Premium = USD 12+ per unit"* — ranges fine, point precision NOT required).

---

## §06 Competitor price bands — `market_data_chart`

**🔍 Query bucket `01_market_price_bands` (shared with §05):**
```
1. {country} {industry} {leading_player_candidate} price {ecommerce_anchor} {year}
2. {country} {industry} price trend {year-2} {year} direction
```
**Tag mix:** ~50% named externals (per-brand marketplace listing aliases + company catalogs) / ~50% `[Kira estimates]` — indicative price bands per brand are largely KIRA synthesis on top of point-price observations

**📄 Layout:**
- **H1:** "Competitor price bands: indicative view"
- **Table replaces chart slot:** 5-6 rows × 4 columns — brand · tier label · indicative price band (low-high range) · directional change (`up` / `stable` / `down`). Each cell ≤ 22 chars.
- **Sidebar narrative:** ≤ 350 chars interpreting spread — who's drifting upmarket, who's holding band, who's discounting into a lower tier

**v2 critical note:** Supporting page, **NOT a per-SKU pricing-committee table**. Price bands are indicative ranges; per-SKU pack-size detail intentionally omitted. Directional change is qualitative — no 2-year % change column.

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `brands_with_band_data >= 10`:
- **Page 1:** top 5-6 brands in canonical 4-col table (unchanged)
- **Page 2 (`06_competitor_price_bands_p2`):** brands 7-10+ in same table format, grouped by tier so reader scans within-tier spread; sidebar narrative shifts from *"who is drifting"* to *"within-tier dispersion and entry-band white space"*
- → For Vietnam coffee with 5-6 named brands → stays 1 page
- → For Indonesia banking with 10+ named players → expands to 2 pages

**Chart options:**
- `segment_bar_horizontal` (default — low-high band bars per brand, spread visible)
- `scatter_quality_price` (only if quality scoring NOT yet ready and page wants to preview §07 lens)

**Overlay emphasis keys:** `pricing`, `competitive_intensity`
→ fmcg: brand price drift on shelf (premium incumbents holding band vs value challengers narrowing gap)
→ finserv: subscription/fee positioning bands (BNPL fee tier, neobank vs incumbent MDR)
→ services: ARPU band per brand + bundle price compression
→ industrial: B2B contract band (where disclosed) — flag thin coverage in endnote, do NOT halt

**QC rule:** per-SKU prices REJECTED. Tier-band granularity only.

---

## §07 Price-quality positioning map — `price_quality_matrix` ← NEW PAGE TYPE

**🔍 Synthesized from §05-§06 + bucket `02_willingness_to_pay`:**
```
1. {country} {industry} brand premium index survey {year}
2. {country} {industry} consumer price sensitivity segment {year}
```
**Tag mix:** ~55% named externals (brand premium index surveys `[AC Nielsen 2026]` / `[Kantar Brand Index 2025]`, consumer price-sensitivity studies) / ~45% `[Kira estimates]` — quality-score composite + brand placement on the 2×2 is a KIRA synthesis call

**📄 Layout (NEW page_type):**
- **H1:** "Price-quality positioning map" (≤ 80 chars, 1 line)
- **Subhead:** quality-score methodology disclosure (≤ 220 chars, allow inline bold)
- **Matrix chart (380px tall):** 2×2 scatter — x = indicative price band, y = perceived quality score 0-100 (KIRA composite OR survey perception index)
- **6-12 brand points**, label ≤ 18 chars each, dot size optionally encodes share/revenue
- **4 quadrant labels (≤ 24 chars each):** category-specific, not generic — e.g. *"Premium fortress" / "Aspirational" / "Mass-market core" / "Value trap"*
- **Sidebar narrative:** heading ≤ 30 chars + body ≤ 380 chars (2-3 sentences interpreting placement — overcrowded quadrant, white space, migrations)
- **Footer source line:** ≤ 110 chars

**CENTERPIECE.** This is the load-bearing page of the blueprint.

### 🎨 A+ Flex

**Chart options:** `scatter_quality_price` (only — page type is LOCKED to this shape per A+ flex spec)

**Overlay emphasis keys:** `pricing`, `competitive_intensity`, `consumer_behavior`
→ fmcg: premium positioning case (Vinamilk gold vs TH True Milk vs imported premium); aspirational vs mass-market core split
→ finserv: neobank/super-app aspirational positioning vs incumbent premium fortress vs BNPL value-trap risk
→ services: subscription tier brands placed on price × perceived service quality (telco postpaid, streaming SVOD)
→ industrial: only where brand-level perception scoring exists (rare) — fall back to §06 if survey data absent
→ consumer_durables: warranty/service backing as quality dim; financing terms as price-band proxy

**No expand condition** for §07 itself, but: if category has **>12 plottable brands**, split into 2 matrix pages by segment (prepaid vs postpaid, mass vs premium) and bump section_count to 14 — handled by assembly rules, not flex.

**QC rule:** quadrant labels MUST be specific to category (not generic *"High price / high quality"*). Brand placement is qualitative — tier-level band on x-axis is acceptable, per-SKU price points NOT required.

---

## §08 Price elasticity by segment — `market_data_chart`

**🔍 Query bucket `03_price_elasticity`:**
```
1. {country} {industry} price elasticity demand coefficient {year}
2. {industry} price elasticity emerging market consumer study
3. {country} {industry} VAT pass-through demand response
```
**Tag mix:** ~50% named externals (price-elasticity academic studies, central bank inflation pass-through research `[BOT FX Pass-through 2024]` / `[BSP Inflation Report 2025]`, listed-company ASP disclosures) / ~50% `[Kira estimates]` — elasticity coefficients are largely calibrated to anchor studies + scaled to segment, so most coefficients land `[Kira estimates]` with anchor disclosed in source key footer

**📄 Layout:**
- **H1:** "Price elasticity by segment"
- **Chart:** horizontal bar of elasticity coefficients with confidence ranges, up to 6 segments (urban/suburban/rural OR mass/mid/aspirational OR age cohort — pick category-appropriate cut)
- **Narrative:** up to 3 sub-sections explaining where elasticity inverts (luxury inversion, status goods)

**Skip rule:** if category has no published elasticity studies AND KIRA has no panel data → collapse into §05 tier-stack narrative as side-note.

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `segments_with_elasticity_signal >= 4`:
- **Page 1:** headline elasticity-by-segment chart + "where elasticity inverts" narrative
- **Page 2 (`08_elasticity_p2`):** second cut — category-occasion OR price-tier-within-segment — plus table of confidence ranges + anchor studies per cell

**Chart options:**
- `segment_bar_horizontal` (default — elasticity bars with error whiskers)
- `dual_axis_combo` (elasticity vs current price index — inversion read)
- `heatmap_5x5` (segment × occasion grid — conditional view)

**Overlay emphasis keys:** `pricing`, `consumer_behavior`, `forecast_drivers`
→ fmcg: urban premium occasion (gifting, on-premise) shows inversion vs daily-home elastic
→ finserv: rate sensitivity by income tier (mass-affluent BNPL elasticity vs HNW retail-banking flat)
→ services: ARPU sensitivity by tenure cohort (new subscriber elastic vs locked-in subscriber inelastic)

**Anchor disclosure rule:** elasticity coefficients are typically `[Kira estimates]` calibrated to a named anchor study — disclose anchor in subhead (e.g. *"KIRA estimate calibrated to `[Kantar Elasticity Study 2024]`"*) and resolve the alias in the page source key footer. Qualitative ranges acceptable at overview level.

---

## §09 Willingness-to-pay by segment — `market_data_chart`

**🔍 Query bucket `02_willingness_to_pay`:**
```
1. {country} {industry} willingness to pay consumer survey {year}
2. {country} {industry} consumer price sensitivity segment {year}
3. {country} {industry} premium consumer segment income tier {year}
```
**Tag mix:** ~55% named externals (WTP surveys `[Kantar WTP Study 2025]` / `[AC Nielsen 2026]`, income-tier studies from stats bureaus, premium-segment research) / ~45% `[Kira estimates]` (WTP midpoint synthesis per segment is largely a KIRA triangulation; anchor disclosed in source key footer)

**📄 Layout:**
- **H1:** "Willingness-to-pay by consumer segment"
- **Chart:** WTP bar chart with 4-6 segments, each bar = WTP midpoint + range whiskers + current market price reference line
- **Narrative:** up to 3 sub-sections — highlights WTP gap (positive = pricing power untapped; negative = churn risk)

### 🎨 A+ Flex

**Chart options:**
- `segment_bar_horizontal` (default — WTP bars vs current price reference line)
- `dual_axis_combo` (WTP + current price as comparable series)
- `bubble_2x2` (WTP gap × segment size — large gap on small segment ≠ same gap on large segment)

**Overlay emphasis keys:** `consumer_behavior`, `pricing`, `market_opportunity`
→ **fmcg overlay:** rising-middle-class WTP for premium positioning (e.g. coffee gold-tier WTP vs current shelf price) — highlights premium opportunity sizing
→ **finserv overlay:** WTP for fee-based services (wealth advisory, premium card AF) vs current pricing — subscription/MDR vertical example
→ **services overlay:** ARPU+retention vertical — WTP for bundle tiers (telco premium postpaid, streaming ad-free, food-delivery+) vs current; retention as WTP-realization proxy

**No expand condition** (always 1 page).

**Tag rule:** WTP data quality varies wildly — if only 1 source surfaces a figure, tag `[Kira estimates]` with that source as the disclosed anchor in the page source key footer. Qualitative ranges OK. Anti-positioning still applies — never name-drop forbidden firms even if they published the survey.

---

## §10 Pricing models — `market_data_chart`

**🔍 Query bucket `06_pricing_model_case_studies`:**
```
1. {country} {industry} subscription model launch outcome {year-2} {year}
2. {country} {industry} freemium tier conversion rate {year}
3. {country} {industry} dynamic pricing surge {year}
```
**Tag mix:** ~75% named externals (company press releases on subscription launches, listed-company investor decks like `[Viettel AR 2025]` / `[Sea Group 2025]`, trade-press coverage of pricing-model shifts) / ~25% `[Kira estimates]` (adoption % synthesis + momentum scoring)

**📄 Layout:**
- **H1:** "Pricing models: subscription, one-time, freemium, tiered"
- **Table or matrix:** 4-5 model rows × 4 columns (segment fit / adoption % / typical price point / momentum)
- **Sidebar narrative:** ≤ 350 chars on which model is gaining share and why

**Skip rule:** if category has only one viable pricing model (commodity goods one-time only) → collapse into §05 tier-stack narrative.

### 🎨 A+ Flex

**Chart options:**
- `stacked_bar_share_split` (model-by-segment adoption when ≥3 of 4-5 models have adoption %)
- `heatmap_5x5` (model × segment fit when qualitative `rare/occasional/frequent/dominant`)
- `segment_bar_horizontal` (revenue contribution by model — services lead)

**Overlay emphasis keys:** `pricing`, `consumer_behavior`, `channel`
→ **services overlay (load-bearing here):** subscription + freemium are first-class — telco MVNO model, streaming SVOD/AVOD, food-delivery+ subscription. ARPU + retention as the metric pair.
→ **finserv overlay:** subscription (premium card AF) + freemium (neobank free → paid tier) + MDR-as-pricing-model (BNPL fees as % vs flat). Page is load-bearing for finserv too.
→ **fmcg overlay:** one-time dominant; section may collapse unless category has subscription convention (coffee subscription, beauty box). If collapses, lesson moves to §05 narrative.

**No expand condition** (always 1 page, or skipped entirely per skip_if rule).

---

## §11 Promotional patterns by tier and channel — `market_data_chart`

**🔍 Query bucket `04_promo_patterns`:**
```
1. {country} {industry} promotional discount pattern e-commerce {year}
2. {country} {industry} sale frequency channel {year}
3. {country} {industry} {ecommerce_anchor} flash sale tier
```
**Tag mix:** ~50% named externals (e-commerce flash-sale coverage `[Shopee VN 2026]` / `[Tokopedia 2026]`, trade-press promo coverage) / ~50% `[Kira estimates]` — KIRA's own channel-scan observations of promo cadence fold into `[Kira estimates]`, severity tags (`rare / occasional / frequent / dominant`) are KIRA synthesis calls

**📄 Layout:**
- **H1:** "Promotional patterns by tier and channel"
- **Chart:** matrix of 4 tiers × 4 channels, each cell carries qualitative severity tag `rare / occasional / frequent / dominant`
- **Narrative:** up to 3 sub-sections on channel asymmetry + tier-specific norms

**v2 critical note:** **Directional read, NOT quantitative depth + frequency table** (this was v1's per-SKU promo audit; killed for v2). Source tags still required — `[Kira estimates]` for KIRA channel observation, `[<Source Alias> <Year>]` for trade-press / marketplace promo coverage.

**Skip rule:** if category has no promotional convention (utilities, regulated insurance) → skip and bump section_count to 12.

### 🎨 A+ Flex

**Chart options:**
- `heatmap_5x5` (default — tier × channel qualitative severity cells)
- `stacked_bar_share_split` (promo share by channel within each tier — channel asymmetry as composition)

**Overlay emphasis keys:** `channel`, `pricing`, `consumer_behavior`
→ **fmcg overlay (load-bearing):** premium rarely discounts (gift-with-purchase only); mass tier flash-sale weekly on e-commerce; mid tier seasonal MT discounts → classic FMCG premium-positioning frame
→ **services overlay:** telco prepaid top-up promos vs postpaid bundle locks; streaming free-month-trial cadence
→ **finserv overlay:** BNPL zero-fee-intro promos vs steady-state MDR; credit card sign-up bonus vs ongoing rewards

---

## §12 Premium positioning case studies — `competitive_profile_deep`

**🔍 Query bucket `06_pricing_model_case_studies` (shared with §10):**
```
1. {country} {industry} brand premium repositioning success {year-2} {year}
2. ({country} {industry} brand premium repositioning failed OR discontinued — 1 query)
```
**Tag mix:** ~75% named externals (case-brand annual reports `[Vinamilk AR 2025]` / `[Masan Q3 2025]`, trade-press case coverage, investor day decks) / ~25% `[Kira estimates]` (outcome-stat synthesis + lesson framing on top of disclosed share/price moves)

**📄 Layout (compressed competitive_profile_deep):**
- **H1:** "Premium positioning: case studies"
- **2 success cases + 1 failure case** (failure optional) on a shared template page, each case ~33-50% of the page
- **Per case:** brand name ≤ 45 chars · summary body 300-380 chars · outcome stats 3-4 rows (share +/-, price realization +/-) · 1-line lesson

**Skip rule:** if no clear premium-move case studies surface → collapse lesson into §07 sidebar.

**v2 change:** failure case is **OPTIONAL** (was mandatory in v1). If a credible failure surfaces, include it (premium coverage that only shows winners reads as marketing copy). If no failure surfaces, ship with 2 successes — **do NOT invent or stretch a weak example.**

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `case_studies_available >= 4`:
- **Page 1:** canonical 2 successes + 1 failure compressed layout
- **Page 2 (`12_premium_case_studies_p2`):** 1-2 further cases (contrasting geography or sub-segment) + small comparison strip across all cases showing starting tier, move direction, outcome metric

**Chart options:**
- `bubble_2x2` (page-2 case comparison — price move × share move, size = pre-move revenue base)
- `segment_bar_horizontal` (outcome metric bars per case — share point change or price-realization change)

**Overlay emphasis keys:** `competitive_intensity`, `pricing`, `market_opportunity`
→ **fmcg overlay (load-bearing):** premium-positioning case classics — coffee gold-tier launch, milk premium-protein line, beauty masstige-to-prestige move
→ **finserv overlay:** subscription-tier launches (premium card AF moves, neobank paid-tier conversion), MDR repositioning
→ **services overlay:** telco ARPU-uplift via bundle premiumization; streaming ad-free tier conversion — retention as the success metric

---

## §13 Methodology endnote — `methodology_endnote`

**Layout:**
- Source mix breakdown — `[Kira estimates]` share % vs named-external share % (target ~20-30% `[Kira estimates]`, disclose actual)
- **Full alias registry** — every `[<Source Alias> <Year>]` used anywhere in the report resolved to its full citation, sorted alphabetically with `Kira estimates = KIRA in-house analyst triangulation` last
- Channel-scan protocol disclosed (channels sampled, brand count, sampling window) — channel-scan observations land as `[Kira estimates]` so the protocol is doubly important
- WTP / elasticity anchor studies disclosed (named source + year + triangulation method)
- **Partial-data acknowledgement** where coverage was thin (e.g. opaque B2B-style pricing, contact-sales-only listings) — required, not optional
- **Explicit note: brief is general-market pricing overview — tier-band indicative, not per-SKU exhaustive**
- Contact + next research footer

**No A+ flex** (boilerplate).

---

## Summary — page count flex range

| Scenario | Page count |
|---|---|
| **Floor** (skip_if's trigger — e.g. no elasticity data + no promo convention) | **11 pages** |
| **Baseline** (typical Vietnam coffee / Thailand QSR / Indonesia mobile) | **13 pages** |
| **Rich data** (1 expand triggers, e.g. 10+ brands → §06 p2 OR 4+ elasticity segments → §08 p2) | 14 pages |
| **Very rich** (matrix splits by segment + 1-2 other expands) | **15 pages** |

Note: assembly rules cap at 14 sections (matrix split = +1). Page count flex is 11-15.

## Overlay × blueprint interaction examples

| Topic | Overlay picked | What changes |
|---|---|---|
| **Vietnam coffee pricing strategy 2026** | `fmcg` | §05 premium tier in USD/500g bands; §07 matrix anchors gold-tier vs mass instant; §09 WTP gap on gifting occasion; §11 premium rarely discounts (GWP only); §12 Vinamilk-style premium-line case |
| **Indonesia mobile telco pricing strategy 2026** | `services` | §05 ARPU tiers (prepaid/postpaid/premium postpaid); §07 matrix on price × perceived network quality; §09 ARPU+retention frame; §10 subscription as load-bearing page; §12 ARPU-uplift case study |
| **Thailand BNPL pricing strategy 2026** | `finserv` | §05 fee/MDR tiers; §06 BNPL fee structure spread; §07 matrix on price × perceived trust/quality; §10 subscription + MDR-as-pricing-model load-bearing; §12 incumbent-bank-vs-neobank repositioning case |
| **Singapore wealth management pricing strategy 2026** | `finserv` | §05 AUM-fee tiers; §07 matrix on fee level × service quality perception; §09 WTP for fee-based advisory by HNW segment; §10 subscription/AUM-fee hybrid models; §12 premium repositioning case |

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
- Section count target (13 base OK? 11-15 page flex range OK?)
- Voice / register OK? (general market overview, directional, qualitative-band)
- Source mix OK? (Phase L.3 framing: ~20-30% `[Kira estimates]` / ~70-80% named externals. v1 / v2 trichotomy collapsed — KIRA channel-scan now folds into `[Kira estimates]`.)
- Centerpiece position OK? (§07 price-quality matrix as load-bearing — was buried mid-deck in v1)
- Overlay vertical assignment OK? (fmcg / finserv / services lean — anything missing for pricing POV?)
- v2 pivots OK? (B2B halt dropped, per-SKU table → indicative bands, promo qualitative, failure optional)
- Anything missing for "pricing strategy" general-market view that mày expect from KIRA's POV?
