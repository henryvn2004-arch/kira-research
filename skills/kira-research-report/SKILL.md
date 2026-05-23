---
name: kira-research-report
description: Generates consulting-grade market research reports under the KIRA Research brand — 15-22 page HTML + PDF outputs styled by the KIRA design system (1280×720, Satoshi/JetBrains Mono, #1E6FFF accent). Triggers when the user wants to produce a market research report, market analysis, competitive landscape study, industry brief, or research memo about a specific industry, country, or topic. Supports three modes via internal routing — UC1 (template-driven for canonical report types like SEA market analysis), UC2 (Design Mode, first-principles structure for novel topics), and UC3 (data-grounded, ingests user-uploaded files into the report). Example invocations that should trigger this skill — "KIRA: Indonesia roofing 2026", "generate a KIRA report on AI in Singapore legal services", "market analysis of Vietnam tea 2026", "competitive landscape of Thailand fintech", "research brief on Philippines cold chain logistics", "KIRA: <topic> --draft", "KIRA: <topic> --publish", "KIRA: <topic> + uploaded interview transcripts". Do NOT trigger for generic web research with no report deliverable, blog/article writing, slide-deck creation, or non-KIRA-branded research.
---

# KIRA Research Report — Skill Entrypoint

Generate a KIRA-branded market research report from a topic (and optionally user-uploaded files). Output: self-contained HTML + matching PDF, both styled to the KIRA design system.

> **Quality bar:** match `references/sample_R0152_baseline.html` — that's the gold standard for visual layout, voice, source tagging, and chart density. If your output looks worse, iterate. If different but equivalent quality, that's fine.

---

## Hard rules — read these before doing anything else

Read `references/brand_guideline.md` in full. The bullets below are the absolute non-negotiables; the rest of the brand context lives there.

1. **Never** mention these in any output (HTML, PDF, code, metadata, filenames): `Claude`, `McKinsey`, `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC`, or the internal source-archive R-numbers (R0152 etc.).
2. **Never** position KIRA as an "AI-powered platform / SaaS / app". KIRA is a *research house*. Authorial voice: "our analysts", "our research team", "we" — never "our platform".
3. **Never** lead with "AI" in headlines or marketing copy. AI mentions belong inside dedicated AI-impact sections.
4. **Every quantitative claim carries a source tag** inline: `[primary]`, `[secondary]`, `[estimate]`, or `[user-input]` (UC3 only). The render pipeline will refuse pages with un-tagged numbers.
5. **Headlines use sentence case.** "A market at inflection." not "A Market At Inflection".
6. **Char budgets in `schemas/page_schemas.json` are hard caps.** If content exceeds budget, regenerate the offending section at -15% and retry. Max 3 retries before flagging.
7. **No filler.** Drop "It is worth noting", "In conclusion", "It goes without saying". Every sentence carries weight.
8. **De-cliented voice.** "Market participants face…", "Stakeholders should consider…" — never "Client should…".

---

## Execution flow (8 stages)

Follow the stages in order. Each stage has a dedicated prompt file in `prompts/`. Read the prompt for the current stage before executing it.

### Stage 1 — Input detection + topic parsing
- Prompt: [`prompts/topic_parser.md`](prompts/topic_parser.md)
- Output: structured `{country, country_iso, industry, industry_normalized, scope, year, intent_keywords, has_uploaded_files, forced_mode, forced_template, output_mode, confidence}`

### Stage 2 — Orchestrator / mode router
- Prompt: [`prompts/orchestrator.md`](prompts/orchestrator.md)
- Decides: UC1 (template match), UC2 (design mode), or UC3 (data-grounded)
- Reads `schemas/template_registry.yaml` to score blueprint matches

### Stage 3a — UC1 path: template binding
- Reads `templates/blueprints/<blueprint_id>/manifest.yaml` + `section_structure.json` + `query_strategy.json`
- Phase 1 ships ONE blueprint: `market_analysis` (R0152-style, 19 sections for SEA manufacturing / consumer / construction domains)

### Stage 3b — UC2 path: Design Mode planning
- Prompt: [`prompts/design_mode_planner.md`](prompts/design_mode_planner.md)
- Designs novel section structure from first principles (12-20 sections), adapted to topic

### Stage 3c — UC3 path: data ingestion
- Prompt: [`prompts/data_ingestion.md`](prompts/data_ingestion.md)
- Phase 1 supports `.docx`, `.pdf`, `.csv` / `.xlsx`. Extracts insights, classifies per file, identifies gaps.

### Confirm step (UC2 + UC3 only — UC1 skips)
- Prompt: [`prompts/confirm_step.md`](prompts/confirm_step.md)
- Show user the section plan, estimated pages, source-tag distribution, data-integration plan (UC3). Wait for `APPROVE / EDIT [edits] / REJECT`.

### Stage 4 — Research (dual-language since Phase M.1)
- Use the native WebSearch tool. Don't fabricate citations.
- **Dual-language pattern:** Fire English queries (from `query_strategy.json` etc.) AND local-language queries (constructed via `references/local_lang_query_glossary.md`) in parallel, then merge.
  - Read `local_language_code` + `local_search_priority` from topic_parser output.
  - `tier-1` countries (VN/ID/TH/JP/KR): always fire ~8-10 local queries on top of the EN baseline. Priority buckets: macro, sector overview, demand/regulatory.
  - `tier-2` (MY/PH/TW): fire local pass only when EN pass returns < 6 high-quality sources per bucket.
  - `skip` (SG/HK/EN-default): EN-only.
- Dedupe merged results by source URL. Local-language sources cited via English aliases per L.3 (e.g. `[GSO 2024]` not `[Tổng cục Thống kê 2024]`); page-bottom SOURCE KEY may include the original local-language source name for traceability.
- UC1: run the ~25 EN queries from `query_strategy.json` + ~8-10 localized queries
- UC2: run the ~20-30 EN queries the planner produced + ~6-8 localized
- UC3: run the ~10-15 EN gap-filling queries + ~4-6 localized as needed

### Stage 5 — Content generation (unified across modes)
- Prompt: [`prompts/content_per_section.md`](prompts/content_per_section.md)
- Voice rules: [`prompts/voice_guide.md`](prompts/voice_guide.md)
- Read schema for assigned page type from `schemas/page_schemas.json` before drafting each section
- Tag every quantitative claim inline
- Validate char counts. Over budget → regen at -15%. Max 3 retries.

### Stage 6 — Charts (inline SVG)
- Prompt: [`prompts/chart_generator.md`](prompts/chart_generator.md)
- Use utility classes from `templates/master_styles.css` (`.bar-primary`, `.axis-line`, etc.). Real data only — no placeholders. Patterns documented in [`docs/chart_patterns.md`](docs/chart_patterns.md).

### Stage 7 — Assembly + PDF render + output
- Prompt: [`prompts/render_and_output.md`](prompts/render_and_output.md)
- Compose pages → substitute placeholders in `templates/master_wrapper.html` (`{{MASTER_STYLES_CSS}}`, `{{PAGES_HTML}}`) → POST to `https://kiraresearch.com/api/render-pdf` with `X-Api-Key` header
- Overflow handling: if `overflow_detected: true`, regen offending pages at -15% budget, retry. Max 3 retries.
- Branch on output mode:
  - **Draft** (UC2 + UC3 default): save HTML + PDF locally, return paths
  - **Publish** (UC1 default): upload to Supabase `reports-pdfs/<REPORT_ID>/en.{html,pdf}`, insert `living_reports`, `report_translations`, `audit_log` rows

---

## Mode routing summary

| Trigger | Mode | Default output | Confirm step |
|---|---|---|---|
| User uploaded files | **UC3** | Draft | Yes |
| `--design` flag | **UC2** | Draft | Yes |
| `--template <id>` flag | **UC1** | Publish | No |
| Topic matches a blueprint w/ confidence ≥ 0.7 | **UC1** | Publish | No |
| Otherwise | **UC2** | Draft | Yes |

User can override the default output mode with `--draft` or `--publish`.

---

## Tool requirements

This skill needs these tools available in the host environment:

- **WebSearch** (native Claude tool) — research queries in Stage 4
- **File read** — reading user-uploaded files (UC3), reading skill assets
- **HTTP POST / fetch** — calling `/api/render-pdf` in Stage 7
- **Supabase MCP** — UC1 publish path only (Stage 7). Skip publishing if MCP unavailable; fall back to draft.

If WebSearch isn't available, halt with a clear error before Stage 4 — the skill can't produce a research-grade report without it.

---

## File map

```
SKILL.md                                    ← you are here
schemas/
├── page_schemas.json                       ← char budgets per page type (12 types)
└── template_registry.yaml                  ← blueprint index for UC1 routing
templates/
├── master_styles.css                       ← single source of CSS
├── master_wrapper.html                     ← HTML doc shell with placeholders
├── page_components.html                    ← 10 starter page templates
└── blueprints/
    └── market_analysis/                    ← Phase 1's only blueprint
        ├── manifest.yaml
        ├── section_structure.json          ← 19 sections, page-type assignments
        └── query_strategy.json             ← ~25 query patterns
prompts/
├── topic_parser.md
├── orchestrator.md
├── design_mode_planner.md                  ← UC2
├── data_ingestion.md                       ← UC3
├── confirm_step.md
├── content_per_section.md
├── chart_generator.md
├── voice_guide.md                          ← canonical voice rules
└── render_and_output.md
references/
├── sample_R0152_baseline.html              ← visual gold standard
├── research_data_R0152.json                ← example structured research data
├── brand_guideline.md                      ← distilled brand rules
└── claude_md.md                            ← full project strategy context
docs/
├── architecture.md                         ← skill-internals summary
├── voice_examples.md                       ← 10 example paragraphs from baseline
└── chart_patterns.md                       ← 5 SVG chart templates
```

---

## Phase 1 scope (what ships now)

- 1 blueprint (`market_analysis`) — covers SEA manufacturing / consumer / construction style topics
- EN locale only
- UC1 publish to Supabase + kiraresearch.com; UC2 + UC3 draft to local files
- HTML + PDF outputs only (no PPTX)
- 3 file types for UC3: `.docx`, `.pdf`, `.csv`/`.xlsx`

Out of scope for Phase 1 (deferred): JA/KO locales, additional blueprints, PPTX export, tool-brand frontend, custom-branding overlays. See `docs/architecture.md` for the full roadmap.
