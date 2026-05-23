# content_per_section.md — Stage 5 (unified content generation)

For each section in the report plan, draft content that fits the assigned page-type schema, anchors every number in research, applies KIRA voice rules, and respects char budgets.

## Input

For each section to generate:
- The section entry from `section_plan` (from blueprint `section_structure.json` for UC1, or `design_mode_planner.md` output for UC2/UC3)
- The relevant research data (from Stage 4 WebSearch results — call this `research_data`)
- For UC3: the relevant slice of `user_data_extracted.json`
- The page-type schema from `schemas/page_schemas.json`
- The voice rules from `prompts/voice_guide.md` (refresh in context if you've drifted)
- **The active industry overlay** (if any), loaded from `overlays/<id>.yaml` per orchestrator output

## Execution pattern (CRITICAL — do not deviate)

**Iterate through `section_plan` ONE SECTION AT A TIME, sequentially.** Do not fire multiple sections in parallel via sub-subagents — this caused silent section drops in early batch tests (sections 4/5/6 + 7.2/7.4 missing from one Vietnam coffee run because parallel sub-tasks overflowed context and were dropped without surfacing error).

Why sequential matters:
1. **No silent drops** — every section's output is captured back into the parent context immediately; a failure surfaces loudly instead of vanishing into a dropped subagent return
2. **Cross-section memory** — when drafting Section 7, you remember what Section 4 already said (avoids repeated numbers, mismatched company name spellings, contradictory framing)
3. **Source tag consistency** — the `[Kira estimates]` / `[<Source>]` tags accumulate into a single per-report source key; parallel sections would each maintain a separate fragment and reconciliation is fragile
4. **Char budget retries are cheaper** — if a section overflows and needs regen at -15%, the retry is local; parallel runs would have already moved on

### Per-section loop

```
for section in section_plan (in declared order):
    1. Load section entry + schema + research_data slice + overlay (if any)
    2. Execute Steps 0-6 below (full content gen + validation)
    3. Append result to generated_sections[]
    4. IF result has overflow_at_content_gen: true → log to retries_needed[]
    5. IF result is missing (subagent error / no return) → log to missing_sections[]
```

### Validation gate (run AFTER the loop, BEFORE handing off to render)

```
assert len(generated_sections) == len(section_plan)
  → IF mismatch:
       identify missing section IDs
       for each missing: re-run the per-section loop just for that ID (max 2 retries per section)
       IF still missing after retries: HALT — do not render PDF.
       Surface to batch_runner with status=error and missing_sections list.

assert every chart-bearing section has chart_data populated
  → IF any chart_data == null: same halt-and-surface treatment

assert every section's char_counts within budget OR has overflow_at_content_gen flag set
  → IF unflagged overflow: regen that section once more
```

The render stage (`chart_generator.md` + `render_and_output.md`) MUST NOT proceed if this gate fails. A partial report is worse than a failed batch — failed batches retry on the next cron fire; partial reports get committed and look broken to users.

## Process per section

### Step 0 — Resolve A+ flex fields

Before drafting content, inspect the section's three flex fields (added in Phase J):

#### 0a. `expand_to_2_pages_if`

If present, evaluate the `condition` predicate against the available data signals you have for this section:

| Predicate | How to evaluate |
|---|---|
| `named_competitors_count >= N` | Count distinct named players in `research_data` for this section's bucket |
| `named_distributors_count >= N` | Count distinct named distributors |
| `personas_with_distinct_behavior >= N` | For consumer_seg only — distinct behavioral clusters |
| `regulatory_changes_in_last_3y >= N` | Count dated policy events in last 3 years |
| `regulatory_changes_in_last_5y >= N` | Same, 5-year window |
| `material_segments_count >= N` | Count distinct segments with non-trivial size |
| `channel_subtypes_count >= N` | Count distinct named channel subtypes |
| `pricing_tiers_with_data >= N` | Count tiers with at least 1 anchor price |
| `risks_above_med_severity >= N` | Count risks scored MED or HIGH |
| `historical_data_years >= N` | Count years with anchorable historical data |
| `data_richness_signal == "thick"` | Generic — orchestrator-scored data thick/thin/sparse |

- **Condition true** → produce 2 pages. Use the `what_changes_on_expand` field as the design hint for page 2. Page 1 keeps the original section ID; page 2 gets `<section_id>_p2` suffix.
- **Condition false** (or falls under `fallback_to_1_page_if`) → produce 1 page. Standard flow.

Output the decision in the validation block: `"expanded_to_2_pages": true | false`.

#### 0b. `chart_type_options`

If present, pick ONE chart type from the array. Criteria:
1. Check each option's `data_required` array — only consider options where every required field has surfaceable data in `research_data`
2. Among viable options, pick the one whose `use_when` description best matches the data shape
3. Apply industry overlay `chart_emphasis` (if any) for this page_type — overlay preferences are tie-breakers among viable options
4. If multiple options remain equally viable, pick the first listed (it's the default)
5. If NO option is viable (no required data), fall back to a narrative-only page with a small qualitative callout summary instead of a chart

Output: `"chart_type_chosen": "<id>"`.

#### 0c. `industry_overlay_emphasis_keys`

If present AND an industry overlay was picked by orchestrator:
1. Look up each key in `overlays/<active_overlay>.yaml > section_emphasis`
2. If matching emphasis instructions exist, **apply them to your prose framing**:
   - The instructions are plain-english directives ("Emphasize modern trade vs traditional split", "Anchor demand around shopper occasions")
   - They steer WHICH numbers you lead with, WHICH frame you use, WHICH terminology you prefer
   - They do NOT relax char caps, voice rules, or anti-positioning
3. Also apply overlay's `voice_emphasis` items as drafting guides (vocabulary tweaks)
4. Note any `additional_anti_positioning` items — preserve verbatim, add to your zero-tolerance check

Output: `"overlay_applied": "<id>"` (or `null` if no overlay or no matching keys for this section).

### Step 1 — Read the page-type schema
Pull the schema for the assigned page type. Note: H1 max_chars, subhead max_chars, slot-by-slot caps, number of items required per slot (callouts × 4, implication cards × 5, etc.).

**If the schema has `is_boilerplate: true`** (e.g. `methodology_inline`, `cover`, `toc`):
- USE the `default_copy` block from the schema verbatim. Do NOT freelance subhead or column items.
- Substitute any per-section overrides declared in the section_plan entry (e.g. `methodology_items_override` for a vertical with distinctive primary inputs — commodity blueprints might swap "Specialty & operator reads" for "Crop-year & weather reads").
- The schema's `boilerplate_note` explains what may be customized vs what must stay fixed.
- Skip Steps 2-5 for boilerplate pages; jump straight to Step 6 voice check on the resolved copy.

### Step 2 — Triage data for the section
From `research_data`, pick the 3-8 data points most relevant to this section's purpose. Don't pull in everything — exec summary callouts use the 4 most "headline-worthy" numbers; demand-driver section uses urbanization/policy/credit data; competitive section uses share/HHI/players.

For UC3, prioritize user-data data points over web data when both cover the same fact. Tag with `[user-input]` when sourced from user file.

### Step 3 — Draft content slot by slot

Generate text in this order per page:

1. **H1** — sentence-case headline, ≤ schema cap. State the thesis.
2. **Subhead** — 1-3 sentences of context. May embed 1-2 inline-bold phrases.
3. **Body slots** — narrative_left, narrative_right, callouts, implication cards, etc. Per slot, follow the schema's `per_section`/`each` substructure.
4. **Chart data block** — produce data in the form chart_generator.md expects (handed off, not rendered here)

### Step 4 — Validate char counts

For every slot:
- Count actual chars (use the runtime `String.length` equivalent — not word count)
- Compare to `max_chars`
- If over: regenerate the slot at -15% target. Max 3 retries.
- If a slot consistently overflows even at -15% × 3, flag for orchestrator with `overflow_at_content_gen: true` and which slot

### Step 5 — Apply source tags

Every quantitative claim in body text needs an inline tag. Format:

```
... USD 2.0 bn market in 2025 [secondary], rising to USD 3.1 bn by 2030 [estimate].
```

Tag rules:
- Number lifted from a citeable external source → `[secondary]`
- KIRA synthesis (combining several inputs into a primary claim) → `[primary]`
- Triangulated estimate with methodology in chart_source or footnote → `[estimate]`
- Data from a UC3-uploaded user file → `[user-input]`

If a number can't be tagged, **cut it.** Vague numbers without provenance are worse than no numbers.

### Step 6 — Voice check

Re-read `prompts/voice_guide.md` Section 9 (anti-patterns). Scan your draft for:
- Title-cased headlines
- "AI" in headlines outside Section 10
- Untagged numbers
- "Client" / "you" language
- Competitor / `Claude` / `McKinsey` mentions
- Throat-clearing intros

Fix in place.

## Output (per section)

```json
{
  "section_id": "04_exec_summary",
  "page_type": "exec_summary_p1",
  "content_spec": {
    "h1": "Indonesia's roofing, exterior & insulation market — 2026 inflection",
    "subhead": "Urban demand pull, accelerating government build-out, and a consolidating competitive structure are reshaping the USD 2.0 bn category. <strong>The next 24 months decide</strong> which operators capture the next leg of growth.",
    "callouts": [
      {
        "label": "MARKET SIZE 2025",
        "num": "USD 2.0",
        "unit": "bn",
        "change": "+8.3% YoY [secondary]",
        "source_tag": "secondary"
      },
      {
        "label": "FIBER CEMENT HHI 2023",
        "num": "8,737",
        "unit": "idx",
        "change": "2x increase since 2017",
        "source_tag": "secondary"
      },
      { "...": "..." }
    ],
    "narrative_left": [
      {
        "heading": "Structural demand",
        "body": "Urbanization adds 3 million city dwellers a year [secondary]; the housing backlog sits at 9.9-11 million units [secondary]; <strong>the 3 Million Houses Program</strong> directs USD 7.4 bn of VAT-exempt construction through 2027 [secondary]. Even a credit-cycle slowdown would compress, not erase, the demand pull."
      },
      {
        "heading": "Consolidating structure",
        "body": "Fiber cement HHI doubled from 4,171 to 8,737 [secondary]. The top three operators control 71% of category value. New entrants face structural cost-of-capital disadvantage; reposition adjacent or acquire."
      }
    ],
    "chart_right": {
      "title": "Roofing market trajectory",
      "subtitle": "Indonesia · USD bn · 2024-2030F",
      "unit": "USD BN",
      "source": "SOURCE: BPS, BCI ASIA, INDUSTRY FILINGS · KIRA RESEARCH 2026",
      "data": {
        "series": [
          { "label": "Roofing", "values": [1.6, 1.8, 2.0, 2.2, 2.5, 2.9, 3.1], "source_tag": "estimate" }
        ],
        "periods": ["2024", "2025", "2026", "2027", "2028", "2029", "2030F"]
      }
    }
  },
  "char_counts": {
    "h1": 58,
    "subhead": 197,
    "narrative_left_total": 564
  },
  "validation": {
    "all_slots_within_budget": true,
    "all_numbers_tagged": true,
    "voice_check_passed": true,
    "overflows_after_retry": [],
    "expanded_to_2_pages": false,
    "chart_type_chosen": "trend_line_5y",
    "overlay_applied": "industrial",
    "overlay_emphasis_keys_used": ["channel", "competitive_intensity"]
  }
}
```

## Char-budget tactics

When a slot's drafted content overshoots:

1. **Cut adverbs first** (`particularly`, `notably`, `significantly`, `markedly`) — they rarely earn their keep
2. **Compress linking phrases** (`As a result of this dynamic →` becomes `Hence,`)
3. **Drop hedges** (`We believe`, `it appears that`, `tends to be`) — state the claim
4. **Merge sentences with semicolons** when two short claims belong together
5. **Remove duplicated numbers** — if a callout already shows "USD 2.0 bn", body text doesn't need to repeat it
6. **Last resort:** split into a second page (only if blueprint allows — check `section_structure.json` `page_count`)

## Cross-section consistency

After all sections are drafted, run a consistency pass:

- Every callout number that appears in exec summary should also appear (with the same value and tag) somewhere in the body sections
- Source-tag distribution should land near the target in blueprint `manifest.yaml > research.source_mix_target` (e.g. primary 25% / secondary 55% / estimate 20%)
- Same company should be named consistently (e.g. always "PT Impack Pratama Industri (IMPC)", not sometimes "Impack" alone)
- Same time periods used in different charts should be the same (don't have one chart on 2024-2030 and another on 2025-2031 without a reason)

If a consistency issue is fixable in one section, fix it. If it requires regenerating multiple sections, flag to orchestrator with `consistency_issues: [...]`.

## Hard rule

If your draft for any section includes the words `Claude`, `McKinsey`, `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC`, an `R0xxx` archive id, or any "our platform / our SaaS / our app" phrasing — **stop, scrub, regenerate.** These are zero-tolerance brand violations and will fail review.
