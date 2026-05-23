---
name: kira-blueprint-a-plus-flex-layer
description: "How UC1 blueprints adapt per topic — 3 customization layers: expand_slots, chart_options, industry overlays. Preserves brand consistency."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## What this is

Henry asked: "report customize cho từng product/service thì càng tốt, vì users expect như thế, nó gần giống human consultant làm report hơn" — but also wanted speed + stability. The trade-off was resolved with an "A+" hybrid: section structure stays fixed per blueprint, but 3 layers of in-section flex are added.

Built 2026-05-23 as Phase J of the [[project_tool_gen_report]] skill build.

## The 3 layers

### Layer 1 — `expand_to_2_pages_if` (25 slots across 7 blueprints)

3-4 sections per blueprint can grow 1→2 pages when data is rich. Predicates standardized in `skills/kira-research-report/docs/a_plus_flex_spec.md`:

- `named_competitors_count >= N` — competitive sections
- `named_distributors_count >= N` — channel sections
- `material_segments_count >= N` — sizing sections
- `regulatory_changes_in_last_3y >= N` — policy sections
- `risks_above_med_severity >= N` — risk matrix
- `data_richness_signal == "thick"` — generic catch-all

Result: a 14-section blueprint renders as 12-17 pages depending on data richness. Section order + identity unchanged.

### Layer 2 — `chart_type_options` (62 arrays added)

Chart-bearing sections list 2-3 viable chart shapes from a 15-chart catalog (trend_line_5y, stacked_bar_share_split, bubble_2x2, scatter_quality_price, heatmap_5x5, horizontal_timeline, waterfall_horizontal, gantt_horizontal, etc.). Content gen picks the one whose `data_required` fields actually surface in research.

This removes forced "one-size chart" — if a section needs trend data but only historical share is available, it can pick `segment_bar_horizontal` instead of forcing a `trend_line_5y` with sparse data.

### Layer 3 — Industry overlays (`overlays/*.yaml`)

6 vertical YAML files biasing emphasis:

| Overlay | Topics |
|---|---|
| `fmcg.yaml` | FMCG, consumer goods, food, bev, personal care, household, coffee, tea, snacks |
| `finserv.yaml` | Banking, insurance, fintech, BNPL, payments, wealth, lending, neobank |
| `industrial.yaml` | Manufacturing, building materials, chemicals, steel, cement, OEM, components |
| `consumer_durables.yaml` | Appliances, electronics, smartphones, auto-consumer, furniture |
| `services.yaml` | Telco, OTT, streaming, professional services, education, healthcare-services |
| `commodity.yaml` | Palm oil, rubber, rice, coal, nickel, plantation crops |

Each overlay defines:
- `applies_when_keywords` — scored against topic by orchestrator
- `section_emphasis` — instructions per standardized emphasis_key (channel, competitive_intensity, pricing, etc.)
- `chart_emphasis` — bias chart picks per page_type
- `voice_emphasis` — vocabulary tweaks (e.g. fmcg uses "shopper" for retail, "consumer" for end-use)
- `additional_anti_positioning` — vertical-specific banned terms (e.g. finserv bans "AI-native bank")

## How it flows at gen-time

```
1. orchestrator.md Stage 2 → pick UC1 + blueprint
2. orchestrator.md Stage 2b → score topic against 6 overlays, pick max (≥2 hits)
3. content_per_section.md Step 0 (NEW):
   a. evaluate expand_to_2_pages_if → 1 or 2 pages
   b. pick chart_type from chart_type_options based on available data
   c. apply overlay's section_emphasis + voice_emphasis to prose
4. content_per_section.md Steps 1-6 → standard draft
5. Output includes: expanded_to_2_pages, chart_type_chosen, overlay_applied
```

## What stays constant (brand consistency)

- Section ORDER per blueprint (cover → methodology → toc → divider → exec → ...)
- Section IDENTITY (id, title_pattern, page_type)
- Page chrome (header, footer, source line format)
- 1280×720 canvas geometry
- Anti-positioning blacklist (always enforced; overlays cannot relax)
- Source tag system — Phase L.3: `[Kira estimates]` (KIRA-derived) + `[<Source Alias> <Year>]` (named external, e.g. `[BPS 2024]`) + `[user-input]` (UC3). Page-bottom source key resolves every alias to full citation.
- Voice register (sentence-case headlines, "our analysts" framing)

Two reports from the same blueprint should look like siblings even with different overlays + expand decisions. Like McKinsey decks within a service line — same framework, customized application.

## Files involved (committed)

- `skills/kira-research-report/docs/a_plus_flex_spec.md` — canonical spec
- `skills/kira-research-report/overlays/*.yaml` — 6 vertical overlays (817 lines total)
- `skills/kira-research-report/templates/blueprints/*/section_structure.json` — 7 blueprints with the 3 new fields
- `skills/kira-research-report/prompts/orchestrator.md` — Stage 2b overlay detection
- `skills/kira-research-report/prompts/content_per_section.md` — Step 0 flex resolution

## Adding a new overlay later

When a new industry vertical appears in queue:
1. Copy `overlays/fmcg.yaml` as template
2. Update `overlay_id`, `applies_when_keywords`, emphasis blocks
3. Commit to `overlays/` — no orchestrator code change needed (it auto-scans the directory)

## Adding a new chart type later

1. Add catalog entry in `docs/a_plus_flex_spec.md` Layer 2 catalog table
2. (Optional) Add schema entry in `schemas/page_schemas.json` if it's a full page type
3. (Optional) Add CSS class + HTML stub if rendering requires it
4. Update `chart_type_options` arrays in blueprints that should expose it

## Adding a new expand slot later

1. Pick the section + condition predicate
2. Add `expand_to_2_pages_if` block in that section's entry in `section_structure.json`
3. Document the `what_changes_on_expand` clearly so content_per_section.md knows what page 2 should differ

## Gotcha to remember

When a section has BOTH `expand_to_2_pages_if` AND `skip_if`, evaluate `skip_if` first (might cut section entirely), then `expand_to_2_pages_if`. Documented in `a_plus_flex_spec.md` but worth highlighting since the interaction isn't obvious.

See also: [[project_tool_gen_report]] · [[project_batch_cron_system]] · [[reference_kira_research]]
