# orchestrator.md — Stage 2 (mode router)

Decide which use-case path the request runs on: **UC1** (template), **UC2** (design mode), or **UC3** (data-grounded). Output a routing decision with reasoning.

## Input

The JSON object emitted by `topic_parser.md`.

## Decision tree (apply in order — first match wins)

```
1.  has_uploaded_files == true                 → route UC3
2.  forced_mode != null                        → respect forced_mode
3.  Score every blueprint in template_registry against topic.
    If max(score) >= match_threshold (default 0.7)
      → route UC1 with that blueprint
4.  Otherwise                                  → route UC2
```

### How to score a blueprint match

Read `schemas/template_registry.yaml`. For each blueprint:

1. **Country scope check** — does the parsed `country` fall in the blueprint's `topic_fit.country_scope.countries`? (Or `regions` match a known mapping.)
   - Match → +0.30
   - Adjacent (e.g. APAC blueprint for an Indian topic) → +0.10
   - No match → no points, AND if `required: true` add a penalty of -0.40 (effectively disqualifies)

2. **Industry domain check** — does the parsed `industry` / `industry_normalized` / `sub_industries` overlap with the blueprint's `topic_fit.industry_domains` keywords?
   - Strong overlap (≥3 keyword matches) → +0.35
   - Moderate (1-2 matches) → +0.20
   - Weak (none, but adjacent domain) → +0.05
   - No match → no points

3. **Year scope check** — does parsed `year` and `forecast_horizon_years` fit blueprint's expected shape?
   - Match → +0.15
   - No → no points

4. **Report type alignment** — does `report_type_inferred` match the blueprint's report type?
   - Match → +0.20
   - Generic / unknown → +0.10
   - Different report type → no points

5. **Poor-fit penalty** — check `poor_fit_signals`. If any apply, subtract 0.25 per signal.

Sum the components → blueprint score (typically 0-1 range, can go negative if penalized).

### Worked example (the R0152 case)

Topic: `"Indonesia roofing exterior insulation 2026"` → `country: Indonesia`, `industry_normalized: construction materials`, `sub_industries: ["roofing", "exterior cladding", "insulation"]`, `year: 2026`, `report_type_inferred: market_analysis`.

Against blueprint `market_analysis`:
- Country: Indonesia is in SEA countries list → **+0.30**
- Industry: `roofing` + `insulation` + `cladding` all match `construction` keywords → strong (3 matches) → **+0.35**
- Year scope: 2026 + 5y horizon fits → **+0.15**
- Report type: `market_analysis` matches blueprint id → **+0.20**
- Poor-fit signals: none apply → **0**

Score = **1.00** → well above 0.7 threshold → route **UC1, blueprint=market_analysis**.

### Counter-example

Topic: `"AI applications in legal services Singapore 2026"` → `country: Singapore`, `industry_normalized: services`, `scope: B2B`, `year: 2026`.

Against blueprint `market_analysis`:
- Country: Singapore is in SEA list → **+0.30**
- Industry: `services` / `legal` doesn't match construction/manufacturing/consumer keywords → no points
- Year scope: 2026 fits → **+0.15**
- Report type: market_analysis is generic-ish → **+0.10**
- Poor-fit signals: "Pure services industries (consulting, legal, accounting)" matches → **−0.25**

Score = **0.30** → below threshold → route **UC2**.

## Output

```json
{
  "route": "UC1" | "UC2" | "UC3",
  "blueprint_id": "market_analysis" | null,
  "blueprint_score": 0.95,
  "all_scores": { "market_analysis": 0.95 },
  "next_prompt": "templates/blueprints/market_analysis/manifest.yaml" | "prompts/design_mode_planner.md" | "prompts/data_ingestion.md",
  "default_output_mode": "publish" | "draft",
  "requires_confirm_step": false,
  "reasoning": "Indonesia + construction-materials sub-industries + 2026 — clean match for market_analysis blueprint (1.00). Routing UC1, publish default, no confirm step.",
  "warnings": []
}
```

### Field rules

| Field | Notes |
|---|---|
| `route` | The decided use case |
| `blueprint_id` | Filled only for UC1; null for UC2/UC3 |
| `blueprint_score` | Score of the winning blueprint (UC1) or the best-but-insufficient (UC2 with score < threshold) |
| `all_scores` | Map of every blueprint considered to its score — useful for telemetry |
| `next_prompt` | The file the next stage should read |
| `default_output_mode` | From parsed `output_mode` if explicitly set; else from blueprint manifest (UC1 = `publish`) or `draft` for UC2/UC3 |
| `requires_confirm_step` | UC1: false (unless blueprint manifest overrides). UC2 + UC3: true |
| `reasoning` | 1-3 sentences explaining the routing decision |
| `warnings` | Any flags worth surfacing (e.g. "topic implies multi-locale but Phase 1 is EN only") |

## Edge cases

- **UC1 with forced template that doesn't fit topic well**: respect the user's `forced_template`, but add a warning. Don't override the user.
- **UC3 with topic that ALSO matches a UC1 blueprint well**: still UC3 — user files trump templates. Add a note in `reasoning` that the blueprint would have matched.
- **Forced UC2 (`--design`) when a blueprint would have scored ≥0.7**: respect the user. Note the bypassed blueprint in `warnings`.
- **Confidence in `topic_parser.md` output < 0.5**: add a warning and prefer UC2 even if a blueprint hits threshold — a low-confidence parse on a templated topic is more dangerous than a deliberate design pass.

Return ONLY the JSON object.
