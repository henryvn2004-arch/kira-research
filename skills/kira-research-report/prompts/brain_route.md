# brain_route.md — Stage 3d (BRAIN route: question-led report plan)

The BRAIN route turns a topic into a **buyer question**, lets the KIRA brain pick the analyses that answer it, and hands a `section_plan.json` to the normal Stage 4–7 pipeline (research → content → charts → render). It replaces blueprint matching (UC1) and design mode (UC2) whenever the brain is available.

## Where the brain lives — and what never leaves it

- The brain is in the **private** repo `kira-pipeline`, folder `brain/`. Path: env `KIRA_BRAIN_DIR` if set, else `<repo root>/../kira-pipeline/brain`. If neither exists, this route is unavailable and the orchestrator falls back to UC1/UC2.
- Write every brain artifact (framing, context pack, plan notes, brain trace) to a scratch folder **outside this repo**: `<os temp dir>/kira-brain/<report_id>/`. Never write them under this repo, never commit them, never paste their contents into a commit message.
- The report itself never mentions the brain, modules, the archive, past projects or clients, framework names, or process reference models. It speaks as "our analysts".

## Step A — Frame the buyer question

Input: Stage 1 topic JSON + the queue row (`id`, `topic`, `country`, `industry`, `year`).

1. If `data/report_framing.json` exists and has an entry for this `id`, use it as-is (owner-reviewed framing) and skip to Step B.
2. Otherwise frame it yourself. **Default buyer:** a Japanese or Korean company (strategy / corporate-development / country-launch lead) deciding whether and how to enter, expand in, invest in or partner in this market. Adjust when the market is the buyer's home: JP market → Korean or other foreign entrant; KR market → Japanese entrant; AU resources → Japanese or Korean offtaker / investor. If the topic is about an incumbent's moves (e.g. "Jollibee dominance"), the buyer is a foreign challenger or a would-be partner of the incumbent.
3. Write the question in one sentence a buyer would actually ask, keeping the topic's angle (e.g. "Philippines FMCG 2026: sari-sari modernization…" → "How should a Japanese FMCG brand win distribution in the Philippines as sari-sari stores modernise and modern trade hits its ceiling?").
4. Classify, using **only** the values defined in `<brain>/modules/selection_matrix.json`:
   - `question_types`: 1 primary (+ at most 1 secondary) from `question_types`
   - `offering`: 1–2 from `offering_overrides`
   - `countries`: ISO-2 (the market), `client`: ISO-2 (buyer's home), `position`: `new_entrant` unless the buyer clearly already operates there
   - `industry`: 1–2 folder names under `<brain>/industry/` (omit to let retrieval match by keywords)
   - `keywords`: 6–12 English terms (industry, sub-categories, channels, regulation names from the topic)
5. Save `framing.json` to the scratch folder:
```json
{"id": "...", "buyer": "Japanese FMCG brand owner", "question": "...", "question_types": ["distribution_channel"],
 "offering": ["fmcg"], "countries": ["PH"], "client": "JP", "position": "new_entrant", "industry": ["consumer_products"],
 "keywords": ["sari-sari", "modern trade", "FMCG", "distributor", "general trade"]}
```

## Step B — Build the context pack

```bash
python3 "<brain>/runner/retrieve.py" --q <question_types...> --offering <offering...> --countries <countries...> \
  --client <client> --position <position> [--industry <slugs...>] --keywords <keywords...> \
  --out "<scratch>/pack.md"
```
Then read `<brain>/runner/expert_prompt.md` and follow its **Procedure steps 1–3** (frame, select modules, plan evidence) on the pack. Keep the spine at 6–10 analyses. Record selections, drops and swaps in `<scratch>/brain_trace.md` (internal only).

## Step C — Turn the spine into a report plan

Produce `section_plan.json` in the **same format as `design_mode_planner.md` output** (so Stages 4–7 run unchanged), with `route: "BRAIN"`, `buyer_question`, `thesis_one_paragraph` (your working answer — a hypothesis to test in research, not a conclusion), `default_output_mode: "publish"` and `requires_confirm_step: false`.

### Storyline (pyramid — answer first)

| # | Section | Page type | Content |
|---|---|---|---|
| 1 | Cover | `cover` | Title = the topic angle; subtitle = the buyer question |
| 2 | Methodology | `methodology_inline` | Standard |
| 3 | Contents | `toc` | Standard |
| 4 | Executive summary | `exec_summary_p1` | The answer (go / no-go / conditional, with the one-line reason), 4 callouts = the numbers that decide it |
| 5 | Why — implications | `exec_summary_p2_implications` | 5 cards: the 3–5 supporting arguments + recommended move |
| 6–N | One chapter per spine analysis (dividers for 3–5 chapter breaks max) | see mapping below | Each section: what it shows, key numbers (sourced, dated), the "so what" for the buyer |
| | What would have to be true | `use_case_grid_6` | 4–6 conditions for success, each with how sure we are and how to test it |
| | Risks | `risk_matrix` | 8–12 risks, qualitative only |
| | Options compared (when the question has real alternatives: entry mode, partner type, format, segment, location) | `decision_scorecard` | 3–5 options × 4–6 criteria, recommended row highlighted |
| | Recommended path | `stage_gate_plan` | 3–4 gates with budget ranges, durations, go/no-go tests + first-90-days actions |
| last | Methodology & sources | `methodology_endnote` | Standard |

Target 17–22 pages total, same as other routes.

### Mapping an analysis to a page type

Pick by what the analysis outputs, not by its name:

| Analysis output | Page type |
|---|---|
| Size, growth, share, a trend over time | `market_data_chart` (forecast → `forecast_outlook`) |
| Who competes, how concentrated, positions | `competitive_structure`; 1–3 key players → `competitive_profile_deep` |
| Segments, personas, buyer needs | `persona_profile` or `use_case_grid_6` |
| Channel structure, margins along the chain | `channel_waterfall` |
| Price tiers, price vs quality positioning | `price_quality_matrix` |
| Regulation, policy changes and dates | `policy_timeline` |
| Partner / distributor / option scoring | `decision_scorecard` |
| How the industry operates (process flow, value chain) | `market_data_chart` with the flow drawn as an SVG diagram (use the pack's process flow; describe today's practice, not the 2010 model) |
| Technology / AI shift | `ai_overview` |

### Section entry

Each body section carries the usual fields plus:
- `analysis_brief`: 2–4 sentences in plain words — the method, the decision rule to apply, the pitfall to avoid, and the facts it needs. Write it in your own words: no module slugs, card IDs or framework names.
- `research_inputs_expected`: the 2–4 facts and where to find them.

### Query strategy

Fill `query_strategy_designed` from the evidence plan (Step B): 20–30 English queries, bucketed by section. Add local-language queries for tier-1 markets using the pack's **industry glossary** (the `vi` / `ja` / `ko` / `zh` practitioner terms) on top of `references/local_lang_query_glossary.md`. If the buyer is an incumbent, add the baseline queries (its filings, local subsidiaries) first.

## Rules carried into Stages 4–7

- Archive analogues in the pack give structure and hypotheses only. **Never** present a number from them as current; every number in the report comes from Stage 4 research and carries a source tag.
- Source tags follow `content_per_section.md` Step 5 (`[Kira estimates]` / `[<Alias> <Year>]`), not the numbered [n] style of the brain's chat format.
- Be decisive where evidence allows; state what is uncertain. Estimates are ranges with the logic shown.

## Checklist before returning

- [ ] `framing.json`, `pack.md`, `brain_trace.md` are in the scratch folder outside the repo
- [ ] Exec summary states the answer to the buyer question, not a market description
- [ ] Every body section has a page type from `schemas/page_schemas.json` and an `analysis_brief`
- [ ] `stage_gate_plan` and `risk_matrix` present; `decision_scorecard` present when options exist
- [ ] No brain-internal names anywhere in `section_plan.json` titles or briefs

Return `section_plan.json`.
