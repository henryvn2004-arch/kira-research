# A+ Flex Spec — expand slots + chart options + industry overlays

> **Purpose:** Define the 3 customization layers added to UC1 blueprints so reports flex per topic without losing brand consistency. Replaces fixed-shape templating with topic-aware adaptation.

---

## Layer 1: Expand slots (`expand_to_2_pages_if`)

Add this field to 3-4 sections per blueprint where data richness genuinely varies by topic. The field specifies a CONDITION for expanding 1 page → 2 pages.

### Schema

```json
{
  "expand_to_2_pages_if": {
    "condition": "<orchestrator-evaluable expression>",
    "what_changes_on_expand": "<plain-english description of how page 2 differs from page 1>",
    "fallback_to_1_page_if": "<inverse condition or null>"
  }
}
```

### Conditions vocabulary

The condition is evaluated by `orchestrator.md` at gen-time. Use these standardized predicates:

| Predicate | Example | Meaning |
|---|---|---|
| `named_competitors_count >= N` | `>=6` | Section §07 should expand if 6+ named players surface |
| `named_distributors_count >= N` | `>=8` | §10 partnerships, §09 distribution |
| `personas_with_distinct_behavior >= N` | `>=4` | Consumer seg — bonus personas |
| `regulatory_changes_in_last_3y >= N` | `>=4` | Regulatory brief recent changes section |
| `material_segments_count >= N` | `>=4` | Market segment breakdown |
| `channel_subtypes_count >= N` | `>=5` | Distribution channel options |
| `pricing_tiers_with_data >= N` | `>=3` | Pricing strategy tier stack |
| `risks_above_med_severity >= N` | `>=5` | Risk matrix expansion |
| `historical_data_years >= N` | `>=5` | Forecast / trend chart expansion |
| `data_richness_signal == "thick"` | — | Generic fallback: orchestrator scores data thick/thin/sparse |

If the topic doesn't trigger any expand condition, section renders at 1 page. If 3+ sections in a blueprint trigger expand, the total page count grows from baseline (e.g. 14 → 16-17). Acceptable; brand stays consistent because section ORDER + section IDENTITY don't change.

### Which sections to flag as expandable (default rules)

Apply this guidance per blueprint type. Subagents: pick 3-4 sections, NOT more.

**market_analysis** (4 expand slots):
- §05 Sector overview & sizing → expand if `material_segments_count >= 4`
- §07 Competitive landscape → expand if `named_competitors_count >= 8`
- §08 Demand drivers & channels → expand if `channel_subtypes_count >= 5`
- §10 AI impact → expand if `ai_use_cases_validated >= 5`

**competitive_landscape** (3-4 expand slots):
- §06 Industry structure → expand if `named_competitors_count >= 12` (full top-12 instead of top-10)
- §07 Top 10 competitor matrix → expand if `named_competitors_count >= 10` (split into 2 pages of 5 each)
- §08 Strategic groups map → expand if `strategic_group_count >= 4`
- §13 Recent M&A → expand if `m_and_a_events_last_3y >= 6`

**consumer_segmentation** (3 expand slots):
- §05 Demographic segmentation → expand if `distinct_demo_clusters >= 5`
- §07 Psychographic segmentation → expand if `psychographic_axes >= 4`
- §11 Channel preferences → expand if `channel_subtypes_count >= 6`

**regulatory_brief** (3 expand slots):
- §07 Policy timeline → expand if `regulatory_changes_in_last_5y >= 8` (multi-page timeline)
- §08 Recent changes → expand if `regulatory_changes_in_last_3y >= 4`
- §10 Compliance cost & winner/loser → expand if `affected_industries_count >= 5`

**entry_strategy** (3-4 expand slots):
- §07 Competitive intensity → expand if `named_competitors_count >= 6`
- §10 Partnership candidates → expand if `candidate_partner_count >= 8`
- §11 Operating environment → expand if `lenses_with_strong_signal >= 2`
- §12 Risk matrix → expand if `risks_above_med_severity >= 8`

**distribution_analysis** (3-4 expand slots):
- §07 Channel margin distribution → expand if `channel_links_count >= 6`
- §09 Top distributors → expand if `named_distributors_count >= 8`
- §11 Channel disruption signals → expand if `disruption_modes_with_evidence >= 4`
- §12 E-commerce penetration → expand if `ecommerce_subsegments_count >= 5`

**pricing_strategy** (3 expand slots):
- §06 Competitor price bands → expand if `brands_with_band_data >= 10`
- §08 Price elasticity → expand if `segments_with_elasticity_signal >= 4`
- §12 Premium positioning case studies → expand if `case_studies_available >= 4`

---

## Layer 2: Chart type options (`chart_type_options`)

Add this field to chart-bearing sections. Lists 2-3 chart types the content generator can pick based on what data actually surfaces. Removes forced "one-size-fits-all" chart shape.

### Schema

```json
{
  "chart_type_options": [
    {
      "id": "<short-id>",
      "name": "<human-readable name>",
      "use_when": "<plain-english condition>",
      "data_required": ["<field 1>", "<field 2>", ...]
    },
    ...
  ]
}
```

### Catalog of chart types (use these IDs; don't invent new ones unless needed)

| Chart ID | Best for | Slot data needed |
|---|---|---|
| `trend_line_5y` | Time series with 5+ data points | `series_label`, `years[]`, `values[]`, `unit` |
| `trend_line_3y` | Compressed time series | `series_label`, `years[3]`, `values[3]`, `unit` |
| `stacked_bar_share_split` | Composition over time or across categories | `categories[]`, `series_breakdown[][]` |
| `segment_bar_horizontal` | Ranked segments by size | `segment_name[]`, `value[]`, `unit` |
| `addressable_wedge_donut` | TAM/SAM/SOM context | `total_market`, `addressable_pct`, `serviceable_pct` |
| `share_donut` | Single-period share split | `slices[]`, `slice_pct[]` |
| `bubble_2x2` | Position by 2 dimensions + size encoding | `entity_name[]`, `x[]`, `y[]`, `size[]` |
| `scatter_quality_price` | Pricing positioning matrix | `brand_name[]`, `price[]`, `quality_score[]` |
| `heatmap_5x5` | Risk / opportunity grid | `cells[5][5]`, `cell_label`, `severity` |
| `horizontal_timeline` | Policy / event timeline | `dated_markers[]` |
| `waterfall_horizontal` | Margin distribution across links | `link_name[]`, `margin_pct[]` |
| `gantt_horizontal` | Phased plan / rollout | `workstream[]`, `start_month[]`, `end_month[]` |
| `dual_axis_combo` | Two related metrics over time | `years[]`, `series_a[]`, `series_b[]`, `unit_a`, `unit_b` |
| `geographic_choropleth` | Country/region map | `region[]`, `value[]` |
| `network_diagram` | Distribution / partnership relationships | `nodes[]`, `edges[]` |

### Which sections to flag with chart_type_options (default rules)

Apply liberally — most `market_data_chart` page_types benefit. Skip for `cover` / `methodology_inline` / `toc` / `divider` / `methodology_endnote` (no chart slot).

**market_analysis sections that should carry options:**
- §05 Sector overview: `[trend_line_5y, segment_bar_horizontal, stacked_bar_share_split]`
- §06 Segment economics: `[segment_bar_horizontal, share_donut, dual_axis_combo]`
- §08 Channel & distribution: `[stacked_bar_share_split, network_diagram, segment_bar_horizontal]`
- §10 AI impact: `[bubble_2x2, segment_bar_horizontal, share_donut]`
- §11 Forecast: `[trend_line_5y, dual_axis_combo]`

**entry_strategy sections:**
- §05 Market opportunity: `[trend_line_5y, addressable_wedge_donut, segment_bar_horizontal]`
- §06 Target segment: `[segment_bar_horizontal, share_donut, dual_axis_combo]`
- §09 Distribution + GTM: `[bubble_2x2, network_diagram, stacked_bar_share_split]`
- §12 Risk matrix: `[heatmap_5x5]` (only option — page type is `risk_matrix`)
- §13 Phasing: `[gantt_horizontal]` (only option)

(Subagents apply equivalent logic to other 5 blueprints based on each section's purpose.)

---

## Layer 3: Industry overlays

Small YAML files in `skills/kira-research-report/overlays/` that bias gen toward industry-vertical-specific emphasis. Orchestrator detects vertical from topic keywords and merges the overlay into the content gen context.

### Schema

```yaml
overlay_id: <fmcg | finserv | industrial | consumer_durables | services | commodity>
applies_when_keywords:
  - <keyword 1>
  - <keyword 2>
  ...
  # Orchestrator scores topic against this list; max-score overlay wins
  # (or none if all overlays score 0 → blueprint runs vanilla)

# Section emphasis — what content should focus on PER blueprint section
# Keys here match `industry_overlay_emphasis_keys` declared in section_structure.json
section_emphasis:
  <emphasis_key>:
    - "Plain-english instruction 1"
    - "Plain-english instruction 2"

# Chart emphasis — bias chart type selection beyond what chart_type_options offers
chart_emphasis:
  <page_type>:
    - "Preference 1"
    - "Preference 2"

# Voice emphasis — vocabulary / register tweaks specific to this vertical
voice_emphasis:
  - "Use X term for Y concept"
  - "Avoid Z framing"

# Forbidden in this vertical (in addition to standard anti-positioning)
additional_anti_positioning: []   # optional
```

### Required overlays (6 total)

| Overlay | Topics it covers |
|---|---|
| `fmcg.yaml` | FMCG, consumer goods, food, beverage, personal care, household, snacks, dairy, confectionery, coffee, tea, beer, soft drinks |
| `finserv.yaml` | Banking, insurance, fintech, BNPL, payments, wealth management, lending, capital markets, neobank |
| `industrial.yaml` | Manufacturing, building materials, chemicals, steel, cement, industrial supplies, packaging, machinery, automotive components |
| `consumer_durables.yaml` | Appliances, consumer electronics, smartphones, auto-consumer (passenger cars, motorcycles, EV-consumer), furniture |
| `services.yaml` | Telco, OTT, streaming, software-consumer, professional services, education, healthcare-services, ride-hailing |
| `commodity.yaml` | Palm oil, rubber, rice, coal, nickel, crude oil downstream, fisheries, plantation crops |

### Emphasis keys (use these standardized keys in section_structure.json)

- `market_opportunity` — how to frame the demand/sizing read
- `competitive_intensity` — how to frame the competitor matrix
- `channel` — distribution/channel emphasis
- `regulatory` — regulatory hooks specific to vertical
- `consumer_behavior` — for consumer-facing verticals only
- `pricing` — pricing tier / model emphasis
- `partnership` — local partner type emphasis
- `risk_factors` — vertical-specific risks
- `forecast_drivers` — what to anchor forecasts on
- `ai_use_cases` — AI adoption pattern in this vertical (market_analysis §10)

### How orchestrator.md uses overlays

At gen-time:
1. Score topic against `applies_when_keywords` of each overlay (case-insensitive substring match)
2. Pick max-score overlay (must score ≥2 keyword hits to apply; otherwise vanilla)
3. Log overlay choice in `reasoning` field
4. Merge overlay's `section_emphasis` + `chart_emphasis` + `voice_emphasis` into content_per_section.md's runtime context for each affected section

### How content_per_section.md consumes overlays

When generating each section, check:
1. Is `industry_overlay_emphasis_keys` in section_structure.json non-empty for this section?
2. If yes, look up matching keys in active overlay's `section_emphasis`
3. Bias prose / chart picks / vocabulary accordingly
4. Anti-positioning rules from voice_guide.md still apply unconditionally — overlay cannot relax them

---

## Hard rules (apply across all 3 layers)

- Anti-positioning blacklist (Claude, McKinsey, Mordor, Frost, Euromonitor, Synovate, Ipsos, IMARC) preserved at all times — overlays cannot relax
- Char caps in page_schemas.json preserved — expand_to_2_pages does NOT bypass char caps, it splits content across 2 pages
- Section IDs remain stable — expand_to_2_pages adds a `<section_id>_p2` suffix to the second page, never renames the section
- Source tags `[primary]` / `[secondary]` / `[estimate]` / `[user-input]` preserved on every number
- 720px overflow detection still runs per rendered page (1280×720 hard constraint)
- Brand consistency: even with overlays + expand + chart options, two reports of the same blueprint should look like siblings, not strangers. Section order + section identity + page chrome unchanged.

---

## Subagent task spec (for Phase J2)

Each subagent gets ONE blueprint. Adds 2 new fields to existing sections in `section_structure.json`:
- `expand_to_2_pages_if` (only on 3-4 designated sections per the default rules above)
- `chart_type_options` (on all `market_data_chart` / `competitive_structure` / `forecast_outlook` sections; skip on cover/methodology/toc/divider/methodology_endnote)
- `industry_overlay_emphasis_keys` (on every section that's NOT pure boilerplate)

DO NOT touch:
- `id`, `section_num`, `title_pattern`, `page_type`, `page_count`, `purpose`, `char_budget_hint`, `skip_if` — preserve verbatim
- `manifest.yaml` and `query_strategy.json` (parent updates these separately)
- `template_registry.yaml` (parent handles)

Return: file path, count of sections that got expand_slots, count of sections that got chart_type_options, count of sections that got industry_overlay_emphasis_keys, any tradeoffs encountered.
