# architecture.md — skill internals at a glance

A one-page mental model for engineers maintaining or extending this skill. For the user-facing trigger documentation, see `SKILL.md`. For brand and voice rules, see `references/brand_guideline.md` + `prompts/voice_guide.md`.

---

## Three modes, one pipeline

| Mode | Trigger | Path before generation | Confirm step | Default output |
|---|---|---|---|---|
| **UC1** Template | Topic matches a registered blueprint with score ≥ 0.7 | Stage 3a: bind to blueprint | Skip | Publish (Supabase + kiraresearch.com) |
| **UC2** Design | Forced `--design`, OR no blueprint match | Stage 3b: planner authors section structure from first principles | Required | Draft (local files) |
| **UC3** Data-grounded | User uploaded files | Stage 3c: data ingestion → blueprint or planner | Required | Draft (local files) |

All three modes share Stages 4-7. The mode-specific paths converge at the section_plan handoff into Stage 4 Research.

---

## Stage diagram

```
                              ┌─────────────────┐
                              │   Invocation    │
                              │  + flags        │
                              │  + files (UC3)  │
                              └────────┬────────┘
                                       ▼
                       Stage 1 — topic_parser.md (extract structured JSON)
                                       │
                                       ▼
                       Stage 2 — orchestrator.md (score blueprints, pick UC)
                              ┌────────┼────────┐
                              ▼        ▼        ▼
                       Stage 3a    3b: design  3c: ingest
                       (bind        plan from   user files →
                       blueprint)   scratch     plan + gap
                              │        │        │
                              │        ▼        ▼
                              │  ┌─────────────────┐
                              │  │  Confirm step   │
                              │  │  (UC2 + UC3)    │
                              │  │  user APPROVES  │
                              │  └────────┬────────┘
                              ▼           ▼
                       Stage 4 — Research (WebSearch, blueprint-/plan-driven)
                                       │
                                       ▼
                       Stage 5 — content_per_section.md (schema-driven, voice-checked)
                                       │
                                       ▼
                       Stage 6 — chart_generator.md (inline SVG per section)
                                       │
                                       ▼
                       Stage 7 — render_and_output.md (assemble → POST /api/render-pdf
                                       → overflow retry × 3 → draft or publish)
```

---

## File-by-file responsibility map

```
SKILL.md                                  ← entry; YAML frontmatter triggers Claude
schemas/page_schemas.json                 ← 12 page types, char budgets, slot defs
schemas/template_registry.yaml            ← UC1 blueprint catalog (Phase 1: 1 entry)
templates/master_styles.css               ← single CSS source (R0152 design tokens)
templates/master_wrapper.html             ← HTML doc shell, 2 placeholders
templates/page_components.html            ← 10 ready-to-use page <div>s
templates/blueprints/<id>/
  manifest.yaml                           ← shape, page-type mix, quality gates
  section_structure.json                  ← N-section breakdown w/ skip rules
  query_strategy.json                     ← ~N web queries × buckets
prompts/topic_parser.md                   ← Stage 1
prompts/orchestrator.md                   ← Stage 2
prompts/design_mode_planner.md            ← Stage 3b (UC2)
prompts/data_ingestion.md                 ← Stage 3c (UC3)
prompts/confirm_step.md                   ← UC2 + UC3 gate
prompts/content_per_section.md            ← Stage 5
prompts/chart_generator.md                ← Stage 6 (references docs/chart_patterns.md)
prompts/voice_guide.md                    ← read by all content-producing prompts
prompts/render_and_output.md              ← Stage 7
references/sample_R0152_baseline.html     ← gold-standard reference, never edited
references/research_data_R0152.json       ← shape of Stage 4 research-data output
references/brand_guideline.md             ← distilled brand rules + design tokens
references/claude_md.md                   ← full project strategy (positioning, IA, schema)
docs/voice_examples.md                    ← 10 worked passages from baseline
docs/chart_patterns.md                    ← 5 canonical SVG patterns
docs/architecture.md                      ← (this file)
```

---

## Quality gates per stage

| Stage | Gate | Failure handling |
|---|---|---|
| 1 — topic_parser | `confidence ≥ 0.5` | Below 0.5: ask user clarifying question, don't proceed blind |
| 2 — orchestrator | At least one routing decision (UC1/2/3) | Falls back to UC2 if blueprint scores all < threshold |
| 3a/3b/3c | section_plan.json with ≥ 12 sections | Below 12: planner re-runs with explicit "add more sections" guidance |
| Confirm | User must APPROVE before Stage 4 | EDIT loop capped at 4 cycles |
| 4 — Research | Sources collected for every section's research_inputs_expected | Sparse sections downgrade to `[estimate]` heavy with methodology disclosure |
| 5 — Content gen | All slots within char budget after ≤ 3 -15% retries | If 3 retries fail, flag section for owner review, continue |
| 5 — Content gen | All numbers tagged | Untagged numbers → cut from draft (rule over preservation) |
| 5 — Content gen | Zero brand violations | Pre-render scan; regenerate offending sections on hit |
| 6 — Charts | Each chart self-contained, KIRA palette only | Inline-style hex audit; replace anything off-palette |
| 7 — Render | HTTP 200, overflow_detected=false (or ≤3 retries to clear) | After 3 retries, publish with `quality_flag: overflow_unresolved` |
| 7 — Publish (UC1 only) | Supabase rows insert clean, storage uploads complete | Failure → fall back to draft output, surface error to user |

---

## State carried between stages

Each stage emits a single JSON object that the next stage consumes. The full report-build state at completion includes:

```
{
  topic_parser:        <Stage 1 output>,
  orchestrator:        <Stage 2 output>,
  section_plan:        <Stage 3a/3b/3c output>,
  confirm_outcome:     "APPROVED" | "EDITED <N times>" | "SKIPPED (UC1)",
  research_data:       <Stage 4 collected facts, keyed by section + tag>,
  user_data_extracted: <Stage 3c output, UC3 only>,
  content_specs:       <Stage 5 output, one per section>,
  chart_svgs:          <Stage 6 output, one per chart>,
  assembled_html:      <Stage 7 intermediate>,
  render_response:     <from /api/render-pdf>,
  output_paths:        { html, pdf, supabase_*, draft_url, buyer_url? }
}
```

This state is conceptual — there's no persistent storage between stages within a single run. If a stage fails mid-way, the next attempt starts from Stage 1 (with cached research_data if available to skip Stage 4).

---

## External dependencies

| Dependency | Used in | Failure mode |
|---|---|---|
| WebSearch (native Claude tool) | Stage 4 | Halt with clear error if unavailable — skill cannot produce research-grade output without it |
| `/api/render-pdf` Vercel endpoint | Stage 7 | Retry once on transient; halt + surface error if persistent. HTML still saved locally. |
| `PDF_RENDER_SECRET` env var | Stage 7 (auth) | Halt at Stage 7 start with clear error if unset |
| Supabase MCP | Stage 7 (publish path only) | Fall back to draft mode, warn user |
| Node-side: chromium-min runtime in /api/render-pdf | Stage 7 (handled inside Vercel) | Vercel-side error surfaces in response.error |

---

## What's out of scope in Phase 1 (intentionally)

- JA + KO locale output (skill ships EN only — Phase 2)
- PPTX export (HTML + PDF only)
- Additional blueprints beyond `market_analysis` (organic emergence from UC2 usage signals)
- Routine wrapper for bulk processing (will come after UC1 validates)
- Tool-brand frontend / customer-facing UI (deferred until productization decision)
- Custom-branding overlay for UC3 enterprise (deferred)
- API for external use (skill use only)

See `references/claude_md.md` "Out of Scope" section for the full project-level deferral list.

---

## Extension points (Phase 2+)

When extending the skill, the lowest-friction extension points are:

1. **Add a blueprint**: drop a new folder under `templates/blueprints/<id>/`, add an entry to `schemas/template_registry.yaml`. No prompt changes needed.
2. **Add a page type**: append to `schemas/page_schemas.json`, add an HTML scaffold to `templates/page_components.html`, optionally add an SVG pattern to `docs/chart_patterns.md`. `content_per_section.md` reads the schema directly.
3. **Add a UC3 file format**: extend the parser table in `prompts/data_ingestion.md` and add an entry to its "supported types" matrix.
4. **Tighten voice**: add bullets to `prompts/voice_guide.md` and worked passages to `docs/voice_examples.md`. The other prompts will pick up the change at next invocation.
5. **Locale expansion (EN → JA → KO)**: Phase 2 work. Requires per-locale font-stack tweaks in master_styles.css + locale-aware prompts (the existing prompts assume EN register).
