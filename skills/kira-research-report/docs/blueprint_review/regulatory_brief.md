# regulatory_brief — section-by-section review (v1 qualitative + A+ flex)

> **For Henry to verify.** Mark each section ✏️ to change / ❌ to remove / ➕ to add / ✅ ok. Send back the list, I apply changes.
>
> **Profile:** 14 sections, **13-14 pages** (narrower flex than entry_strategy — baseline 13 + 0-1 expand pages from §07 timeline / §08 recent changes / §10 winner-loser depth). Policy + regulation deep dive on 1 country × 1 industry/topic.
> **Source mix target:** 15% primary / 70% secondary / 15% estimate. **Heavier secondary** than other blueprints because policy text is cited verbatim.
> **Total query count:** 20 across 6 buckets.

### A+ flex layer (Phase J)

Each section can have up to 3 customization layers:
- **Expand condition** — if data is rich, section grows 1→2 pages. 3 sections have this (§07 timeline, §08 recent changes, §10 compliance/winner-loser).
- **Chart options** — 2-3 chart shapes the gen picks based on data. 8 sections have this.
- **Overlay emphasis** — vertical-specific bias (fmcg / finserv / industrial / consumer_durables / services / commodity). Regulatory overlay is the dominant key on this blueprint.

### Strict source rule (blueprint-wide)

Every policy citation must name the issuing body inline + statute ID (e.g. `Decree 100/2024/ND-CP [secondary]`, `Halal Product Assurance Law (Law 33/2014) [secondary]`). No floating "recently" / "recently passed" phrasing. Every policy reference includes effective date (or `pending` / `proposed [date]`).

---

## §00 Cover — `cover`

**Layout:** Standard KIRA cover — title foregrounds the policy regime (e.g. "EV subsidy regime — Vietnam 2026"), country/industry/year + KIRA branding + report ID + confidential tag.

**No A+ flex** (boilerplate).

---

## §01 Methodology (inline) — `methodology_inline`

**Layout:** 2-col overview. Left col = primary research approach (gazette tracking, ministry FOI requests, industry counsel interviews). Right col = secondary corpus + source tagging conventions.

**Note:** Left-column items foreground policy-specific sources (national gazette, ministry circulars, parliamentary records) — not the generic primary-research framing used in market_analysis / entry_strategy.

**No A+ flex** (boilerplate).

---

## §02 Contents — `toc`

**Layout:** Auto-generated TOC + page counter.

**No A+ flex** (boilerplate).

---

## §03 Executive summary (2 pages) — `exec_summary_p1 + exec_summary_p2_implications`

### Page 1 — exec_summary_p1

**🔍 Synthesized from §05-§11.** No own queries.

**📄 Layout:**
- **4 callouts (top row):** regime overview metric / biggest recent change / dominant winner industry / compliance cost order-of-magnitude
- **2-col narrative:** ~1200 chars, thesis names regime + most decisive recent shift in one sentence
- **1 anchor chart:** cumulative regulation count OR one headline metric over time

### Page 2 — exec_summary_p2_implications

**📄 Layout:** 5-card grid labeled **"Strategic implications for operators"** (NOT the market_analysis default "for market participants").

### 🎨 A+ Flex

**Chart options for page 1 anchor chart:**
- `trend_line_5y` (default — cumulative regulation count or headline regime metric with 5+ annual points)
- `trend_line_3y` (post-reform window only — 3 years)
- `stacked_bar_share_split` (active vs pending vs sunset bands across years)

**Overlay emphasis keys:** `market_opportunity`, `regulatory`, `risk_factors`
→ Vietnam EV subsidy (industrial overlay): winner callout names "integrated EV OEMs with local assembly", not Vinfast/Tesla
→ Indonesia halal (fmcg overlay): winner callout names "F&B exporters with BPJPH certification", not Indofood/Mayora

**Voice rule:** Winner callout names an industry/sub-segment, NEVER a company. Firm names are banned in exec summary.

**No expand condition** (always 2 pages).

---

## §04 Divider — "Regulatory brief" — `divider`

**Layout:** Dark-mode full-page chapter break. Single thesis statement about the regime's trajectory (e.g. "Tightening, with a one-window carve-out for strategic investors."). Thesis ≤ 90 chars.

**Note:** This is the ONLY divider in the blueprint. Report is short enough that one tonal break suffices — no mid-report divider unlike longer blueprints.

**Overlay emphasis keys:** `regulatory`

---

## §05 Policy context & history — `market_data_chart`

**🔍 Query bucket `01_statute_regulation_text`:**
```
1. {country} {policy_topic} decree law gazette {year}
2. {country} {policy_topic} statute official text {ministry_likely}
3. {country} {policy_topic} regulation amendment {year-2} to {year}
```
**Tag mix:** 90% secondary / 10% primary

**📄 Layout:**
- **H1:** "Policy context & history"
- **Body (left):** 1-2 paragraphs (≤1000 chars) — open with "The regime traces to {anchor_event} {anchor_year}", NOT a date-stamped chronological recap. Reader needs the through-line; the timeline lives in §07.
- **Chart (right):** small chart — cumulative regulation count / enforcement-action count / scope-of-coverage expansion over 5-10 years. ≤ 8 data points. Supporting, not centerpiece.

### 🎨 A+ Flex

**Chart options:**
- `trend_line_5y` (5+ annual data points across the regime window)
- `stacked_bar_share_split` (historical scope decomposes into ministry/sector bands)
- `segment_bar_horizontal` (history reads as ranked snapshot of prior postures)

**Overlay emphasis keys:** `regulatory`, `forecast_drivers`
→ finserv overlay: regulator pendulum framing (tightening cycle vs liberalization cycle)
→ commodity overlay: certification regime expansion (RSPO/EUDR scope creep)
→ industrial overlay: local content rule history (TKDN ratcheting)

**No expand condition** (always 1 page).

---

## §06 Current framework & regulators — `market_data_chart`

**🔍 Query bucket `01_statute_regulation_text` (shared with §05):**
```
1. {country} {policy_topic} statute official text {ministry_likely}
2. {country} {policy_topic} implementing circular guidance notes
```
**Tag mix:** 90% secondary / 10% primary

**📄 Layout:**
- **H1:** "Current framework & regulators"
- **Top half:** key statutes table — 6-10 rows. Columns: statute/decree name (≤50) · year · scope (≤80) · status (active/superseded/pending)
- **Bottom half:** regulator map — 4-6 boxes showing parent ministry → enforcement-arm relationships. Box label ≤ 30 chars.
- **No narrative paragraphs** — table + diagram carry the page.

**Voice rule:** Statute names use OFFICIAL short-form + numeric ID (e.g. "Decree 100/2024/ND-CP", "Halal Product Assurance Law (Law 33/2014)"). Never paraphrase statute names — readers fact-check these.

### 🎨 A+ Flex

**Chart options:**
- `network_diagram` (ministries delegate to enforcement arms in a multi-node tree)
- `segment_bar_horizontal` (flat regulator landscape with ≤4 agencies — statute coverage breadth as the read)

**Overlay emphasis keys:** `regulatory`
→ finserv overlay: central bank + securities regulator + AMLA as parallel enforcement arms
→ commodity overlay: certification body + customs + trade ministry triad
→ industrial overlay: investment board + sector ministry + local content audit arm

**No expand condition** (always 1 page).

---

## §07 Policy timeline — `policy_timeline` ← NEW PAGE TYPE 🆕

**🔍 Query buckets `01_statute_regulation_text` + `06_pending_news_tracking`:**
```
1. {country} {policy_topic} decree law gazette {year}
2. {country} {policy_topic} draft bill pending {year}
3. {country} {policy_topic} proposed amendment consultation {year}
```
**Tag mix:** 85% secondary / 15% estimate

**📄 Layout (FULL-PAGE — this is the structural centerpiece):**
- **H1:** "Policy timeline: {policy_topic}" (≤60 chars)
- **Subhead:** ≤180 chars
- **Horizontal SVG timeline:** 5-8 dated markers across the regime's effective window (typically 5-15 years). Markers ordered chronologically, oldest left.
- **Per marker:** date (YYYY-MM) · label (≤38) · body 1-2 sentences (≤110) · winner/loser indicator chip · source tag
- **Winner/loser chip rendering:** green "WINNER" / amber "MIXED" / red "LOSER" / grey "NEUTRAL"
- **Optional sidebar callout:** anchors the "decisive shift" datapoint (number + label + change-line)
- **Source line:** compressed citation, ≤110 chars, all caps mono
- **NO additional body paragraphs alongside** — h1 + subhead + timeline + source line fills the 454px body height

**Voice rule:** Body sentence explains the SHIFT the policy created, not just restate the policy text. Winner/loser tag = NEUTRAL if outcome contested.

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `regulatory_changes_in_last_5y >= 8`:
- **Page 1:** older 4 markers + opening framing sidebar
- **Page 2:** more recent 4+ markers + "decisive shift" callout
- Both pages keep the same `horizontal_timeline` shape so the centerpiece reads as one extended object across the spread
- → For Vietnam EV subsidy with 3-4 markers since 2022 → stays 1 page
- → For Indonesia halal with 10+ regulatory changes since 2014 (BPJPH transfer + product-category roll-outs + amendments) → expands to 2 pages

**Chart options:** `horizontal_timeline` (ONLY — page_type is LOCKED to this visual shape)

**Overlay emphasis keys:** `regulatory`, `forecast_drivers`
→ finserv: central bank circulars + sector licensing amendments + AMLA crackdowns as marker mix
→ commodity: certification scope expansion + enforcement crackdown + EUDR alignment dates
→ industrial: TKDN ratcheting milestones + investment incentive sunsets + sector reservation list shifts

**Design tradeoff:** This page type does NOT exist in `page_schemas.json` yet — see manifest.yaml comment for proposed shape. If schema authoring slips, fall back to `market_data_chart` with a custom SVG timeline in the chart slot (lose the winner/loser chip rendering).

---

## §08 Recent changes in detail — `market_data_chart`

**🔍 Query bucket `02_enforcement_case_studies`:**
```
1. {country} {policy_topic} enforcement action fine {year-1} {year}
2. {country} {policy_topic} license suspension revocation case
3. {country} {regulator_name} crackdown investigation {year}
4. {country} {policy_topic} court ruling judicial review
```
**Tag mix:** 80% secondary / 20% estimate (enforcement-action counts often need KIRA aggregation from multi-source)

**📄 Layout (BASELINE 2 PAGES):**
- **H1:** "Recent changes in detail"
- **Deep dive on 2-3 specific recent policy changes** (last 18-24 months)
- **Per change:** what changed materially · effective date · scope of operators affected · transition timeline · immediate market response. Per-change narrative ≤ 900 chars.
- Each change opens with **bolded effective date + statute ID** (e.g. "**Effective 2024-08, Decree 100/2024/ND-CP**...")
- **Light viz:** possibly 1 chart total across both pages (e.g. licence-applications volume pre/post change)

**Voice rule:** Lead with what changed materially. NOT "On {date}, the government issued…". The date goes in the bolded opener; the analytical claim leads the sentence.

**Skip condition:** if fewer than 2 substantive policy changes in last 24 months → collapse to a single 1-page section (only 1 change qualifies).

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `regulatory_changes_in_last_3y >= 4`:
- Baseline already 2 pages; on expand, each page holds ONE change at full depth (instead of 2 changes per page at half-depth)
- **Page 1:** change A full narrative + pre/post chart
- **Page 2:** change B full narrative + scope-of-operators-affected callout
- A 3rd change collapses into a comparison row in §10
- **Fallback to 1 page** if `regulatory_changes_in_last_3y < 2`

**Chart options:**
- `dual_axis_combo` (e.g. licence-application volume + approval rate around change date)
- `trend_line_3y` (single metric, clean monthly/quarterly pre/post)
- `segment_bar_horizontal` (ranked list of operator categories affected)

**Overlay emphasis keys:** `regulatory`, `risk_factors`
→ finserv overlay: deposit-insurance threshold shifts + capital adequacy ratchets + KYC tightening as recent-change examples
→ commodity overlay: sustainability cert mandate expansion + export quota policy + smallholder inclusion mandates
→ industrial overlay: local content audit + sector reservation expansion + investment board incentive sunsets

---

## §09 Pending changes & lobby positions — `forecast_outlook` (repurposed)

**🔍 Query buckets `03_industry_comments_lobby` + `06_pending_news_tracking`:**
```
1. {country} {industry} association comment letter {policy_topic} {year}
2. {country} {policy_topic} public consultation submission industry response
3. {country} {policy_topic} draft bill pending {year}
4. {country} {ministry_likely} announcement {policy_topic} {year}
```
**Tag mix:** 70% secondary / 25% estimate / 5% primary

**📄 Layout:**
- **H1:** "Pending changes & lobby positions"
- **3 scenario cards (repurposed forecast_outlook):** as-drafted / industry-amended / further-tightened policy scenarios
- **Each card body:** ≤ 300 chars
- **2-3 lobby positions surfaced** with NAMED trade bodies or industry coalitions (NEVER individual firm names — association level only). Per-position blurb ≤ 200 chars.
- Comment-letter quotes OK if attributed.
- **Status descriptor required:** "draft" / "proposed" / "in-committee" / "pending royal assent" (TH/MY) / "pending issuance" (decree signed but not gazetted)

**Voice rule:** Neutral language for lobby positions — "argues", "has urged", "objects to". Never moralising ("opposes" OK; "unfairly opposes" NOT OK). Coalition naming uses official short-form (KADIN, JCCI, AmCham, VCCI, FTI, etc.).

**Skip condition:** no pending or proposed changes identifiable → collapse and skip section, recompute page counter.

### 🎨 A+ Flex

**Chart options:**
- `trend_line_3y` (projected affected-operator count under each scenario)
- `segment_bar_horizontal` (3 scenarios compared on single anchor — compliance cost / scope / lead time)
- `bubble_2x2` (4+ lobby positions: intensity × alignment quadrant)

**Overlay emphasis keys:** `regulatory`, `risk_factors`, `forecast_drivers`
→ finserv overlay: industry association lobbying for delayed capital adequacy enforcement
→ commodity overlay: smallholder cooperatives pushing back on cert-cost-burden vs estate operators lobbying for stricter cert
→ industrial overlay: foreign-invested OEMs lobbying against TKDN ratchet vs domestic suppliers lobbying for stricter local content

**No expand condition** (always 1 page).

---

## §10 Compliance cost & winner/loser mapping — `market_data_chart`

**🔍 Query bucket `05_compliance_cost_benchmarks`:**
```
1. {country} {policy_topic} compliance cost operator estimate
2. {country} {policy_topic} regulatory impact assessment RIA
3. {policy_topic} compliance burden per-firm cost benchmark ASEAN
4. {country} {industry} {policy_topic} cost of compliance survey
```
**Tag mix:** 50% secondary / 50% estimate (RIAs are rare in SEA outside Singapore/Malaysia)

**📄 Layout (BASELINE 1 PAGE):**
- **H1:** "Compliance cost & winner/loser mapping"
- **Top half:** compliance cost analysis. Cost-per-operator estimate · fixed vs variable split · year-1 vs steady-state. Narrative ≤ 600 chars.
- **Bottom half:** winner/loser mapping — 2-column visual (winners left, losers right). 3-5 entries per side. Per entry: industry/segment + 1-line rationale (≤80) + magnitude chip (high/medium/low impact).

**Voice rule:** Compliance costs tagged `[estimate]` unless a regulator-published RIA exists (then `[secondary]` with citation). Winner/loser entries name INDUSTRIES or operator types ("integrated EV OEMs with local assembly"), NEVER individual firm names.

**Triangulation method:** Anchor on a published number from one source × scale by operator count or industry size for {country}. Document method in chart source line: e.g. "SOURCE: KIRA ESTIMATE — RIA ANCHOR × OPERATOR COUNT. ANCHOR: USD 12K/OPERATOR YR-1 [SECONDARY]".

### 🎨 A+ Flex

**🔥 Expand condition (NEW):** if `affected_industries_count >= 5`:
- **Page 1:** compliance cost analysis at full depth — cost-per-operator by operator size tier + fixed/variable decomposition chart + year-1 vs steady-state callout
- **Page 2:** expanded winner/loser map with 5+ entries per side. Each entry gains a 2-line rationale (instead of 1-line cap) and a per-entry source tag.
- **Fallback to 1 page** if `affected_industries_count < 5`

**Chart options:**
- `stacked_bar_share_split` (fixed vs variable across operator size tiers)
- `segment_bar_horizontal` (cost-per-operator by operator type/size)
- `heatmap_5x5` (winner/loser as industry × impact magnitude grid)

**Overlay emphasis keys:** `regulatory`, `risk_factors`, `competitive_intensity`
→ finserv overlay: tier-1 banks absorb compliance cost (winners by survivor logic) vs sub-scale digital lenders (losers — can't amortize)
→ commodity overlay: RSPO-certified estates (winners — EUDR-ready) vs uncertified smallholders (losers — exclusion risk)
→ industrial overlay: integrated OEMs with in-house local content (winners — TKDN-ready) vs CKD assemblers (losers — sourcing pivot required)

---

## §11 Cross-border comparison: ASEAN peers — `competitive_structure` (repurposed)

**🔍 Query bucket `04_cross_border_comparison`:**
```
1. {policy_topic} ASEAN comparison country regulation overview
2. {policy_topic} regulation {peer_country_1} versus {country}
3. ASEAN harmonization {policy_topic} framework {year}
4. {policy_topic} regional policy convergence Southeast Asia
```
**Tag mix:** 75% secondary / 25% estimate

**📄 Layout:**
- **H1:** "Cross-border comparison: ASEAN peers"
- **4-card grid:** 3-4 ASEAN peer countries' approach to the same policy domain. Each card: country · regime-type label ("Open / Restricted / Hybrid") · 1 anchor metric (≤12 chars + ≤8 unit) · 1-line characterisation (≤90 chars)
- **Sidebar narrative:** ≤ 900 chars on convergence/divergence trajectory + where {country} sits in the regional spectrum + whether convergence is likely

**Voice rule:** Peer selection prefers 3 economically-comparable ASEAN-6 members (ID/VN/TH/PH/MY/SG). AVOID lumping CN/JP/KR — those are reference points, not peers.

**Skip condition:** country-idiosyncratic regime with no meaningful ASEAN peer comparison (e.g. constitutional reform) → collapse and skip.

### 🎨 A+ Flex

**Chart options:**
- `geographic_choropleth` (anchor metric mapped across ASEAN — visual reads as regional map)
- `segment_bar_horizontal` (peer-ranked horizontal bar on anchor metric)
- `bubble_2x2` (regime-type: openness × enforcement intensity)

**Overlay emphasis keys:** `regulatory`, `market_opportunity`, `forecast_drivers`
→ finserv overlay: peer comparison on capital adequacy strictness + foreign ownership caps + branch licensing
→ commodity overlay: certification regime convergence (RSPO/MSPO/ISPO) + EUDR-readiness scoring across peers
→ industrial overlay: local content rule comparison (TKDN/Vietnam-LCR/Thai-LCR) + sector reservation list breadth

**No expand condition** (always 1 page).

---

## §12 Methodology endnote — `methodology_endnote`

**Layout:**
- Source mix breakdown — explicit `[primary] 15% / [secondary] 70% / [estimate] 15%`
- Key anchors: which gazettes / ministry sources / trade associations were tracked
- KIRA estimate methodologies disclosed — especially compliance-cost triangulation method (anchor metric × ratio = output)
- **Explicit note: "No source-archive firms cited"** (transparent anti-positioning vs Mordor/Frost/Euromonitor)
- Contact + next-research footer

**Note:** Policy briefs are especially scrutinised for source provenance — this endnote runs heavier on source enumeration than other blueprints.

**No A+ flex** (boilerplate).

---

## Summary — page count flex range

| Scenario | Page count |
|---|---|
| **Floor** (no expands trigger; lean regime, ≤2 recent changes, ≤4 industries affected) | **13 pages** |
| **Baseline** (typical Vietnam EV subsidy / Thailand FX controls — 1 expand triggers) | **14 pages** |
| **Rich data** (2 expands trigger — e.g. Indonesia halal with 10+ timeline markers OR Philippines data localization with 5+ affected industries) | **14-15 pages** |
| **Very rich** (all 3 expands trigger — exceptional, only for high-velocity regimes like ID halal post-BPJPH or VN EV post-Decree-100) | **15 pages** |

**Narrower range than entry_strategy (13-17)** because:
- Center of gravity is the §07 policy_timeline — a locked full-page centerpiece
- §08 recent changes already runs 2 pages baseline (less headroom)
- Skip conditions on §08 / §09 / §11 can SHRINK the report below baseline if data is thin (minimum surviving section count: 11)

## Overlay × blueprint interaction examples

| Topic | Overlay picked | What changes |
|---|---|---|
| Vietnam EV subsidy regime 2026 | `industrial` | §06 lists MOIT + MOF + investment board; §08 deep-dives Decree 100/2024/ND-CP + Decision 11/2024/QD-TTg; §10 winners = "integrated EV OEMs with local assembly" / losers = "CKD assemblers + battery importers" |
| Indonesia halal certification 2026 | `fmcg` | §06 lists BPJPH + Kemenag + LPH auditors; §07 timeline marks Law 33/2014 → BPJPH transfer 2017 → product roll-out 2019-2024; §10 winners = "BPJPH-certified F&B exporters" / losers = "uncertified SME processors" |
| Thailand FX controls 2026 | `finserv` | §06 lists BOT + SEC + AMLO; §08 deep-dives BOT capital flow circulars; §11 peer comparison vs Malaysia BNM + Singapore MAS; §10 winners = "tier-1 banks with treasury capability" / losers = "sub-scale FX brokers" |
| Philippines data localization 2026 | `services` | §06 lists NPC + DICT + BSP; §07 timeline marks Data Privacy Act 2012 → IRR 2016 → sector circulars 2020-2024; §10 winners = "domestic cloud + data center operators" / losers = "cross-border SaaS without local PoP" |
| Malaysia palm oil sustainability cert 2026 | `commodity` | §06 lists MPOB + MPOCC + RSPO; §07 timeline marks MSPO mandatory 2019 → EUDR alignment 2024; §11 peer comparison vs Indonesia ISPO + Thailand RSPO uptake; §10 winners = "RSPO/MSPO-dual-certified estates" / losers = "uncertified smallholders" |

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
- Section count target (14 base OK? 13-14 page flex range OK? Or should we widen by adding an §08.5 enforcement deep-dive that triggers on `enforcement_actions_in_last_2y >= 5`?)
- Voice / register OK? (calibrated, directional, neutral-analytical; winner/loser language NEVER moralising)
- 15/70/15 source mix OK? (heavier secondary than the 25/55/20 used elsewhere — reflects policy-text citation reality)
- `policy_timeline` page_type new schema OK to author? (or fall back to repurposing `market_data_chart` with custom SVG?)
- Overlay vertical assignment OK? (consumer_durables overlay didn't get worked examples here — does it apply to regulatory_brief at all, or is it primarily a §08 entry_strategy concept?)
- Anything missing for "regulatory brief" that mày expect from KIRA's POV? (e.g. should §11 ASEAN peers add a "regulatory predictability" qualitative tag column?)
