# KIRA RESEARCH SKILL — Build Handoff for Claude Code

> **PASTE THIS ENTIRE DOC INTO CLAUDE CODE DESKTOP.**
>
> Your task: build a self-contained Anthropic Skill that generates KIRA-branded market research reports from topics (and optionally user data files). Skill supports 3 use cases via internal routing.
>
> All architecture decisions are locked. All design files are ready. Your job is implementation, testing, and iteration — not architecture re-litigation.

---

## 0. QUICK ORIENTATION

**What is being built:** An Anthropic Skill (folder format with `SKILL.md` + supporting files) that generates 15-22 page market research reports as styled HTML + PDF, KIRA branded, consulting-grade quality.

**Who uses it:** Henry (founder of KIRA Research) — initially for in-house production of library reports. Later: may be packaged into a separate tool brand for self-service customer use.

**Where it runs:** Anywhere Claude can read skill folders (Claude.ai, Claude Code Desktop, mobile app, API).

**What it produces:**
- HTML report (self-contained, ~150-200 KB, embedded SVG charts, KIRA design system)
- PDF report (via Vercel `/api/render-pdf` endpoint)
- Metadata for Supabase upload (UC1 only)

**Quality target:** Match the Opus baseline sample report at `references/sample_R0152_baseline.html`. This is the visual + structural + voice gold standard.

---

## 1. CONTEXT (read order)

**1.1 Project knowledge (in skill folder `references/`):**
- `brand_guideline.md` — KIRA brand rules, voice, colors, typography
- `claude.md` — strategic positioning of KIRA Research as research house (NOT AI platform)
- `sample_R0152_baseline.html` — visual reference, Opus quality bar
- `research_data_R0152.json` — example structured research data

**1.2 Critical brand rules (NEVER violate):**
- Never use source archive firm names in output (code, copy, comments, UI)
- Never use "Claude" or "McKinsey" in visible report copy
- Never claim volume ("1000+ studies") in marketing copy
- Voice: McKinsey-inspired, inline bolding 1-2 phrases/paragraph max, de-cliented ("Market participants" not "client should")
- Source transparency: every quantitative claim must have a source tag (primary/secondary/estimate/user-input)

---

## 2. LOCKED DECISIONS (do not relitigate)

| Decision | Detail |
|---|---|
| **1 skill, 3 use cases** | UC1 (template), UC2 (design mode), UC3 (data-grounded). Internal routing. Not 3 separate skills. |
| **Visual design system locked** | `master_styles.css` is the single source. Page geometry: 1280×720. Color: #1E6FFF primary. Typography: Satoshi + JetBrains Mono. |
| **Component library = composable** | `page_components.html` has 10 starting components. Skill CAN compose new layouts using CSS utility classes — components are examples, not exhaustive. |
| **Render via Vercel function** | `POST https://kiraresearch.com/api/render-pdf` with HTML, returns base64 PDF + overflow check. |
| **Char budgets enforced** | `page_schemas.json` defines hard char limits per slot. Skill must respect; if over budget, regenerate with -15%. Max 3 retry. |
| **Source tags mandatory** | Every data point tagged: `primary` (KIRA primary research), `secondary` (external source), `estimate` (KIRA estimate w/ anchor), `user-input` (UC3 only — user-provided data). |
| **Output modes** | UC1 default: auto-publish to Supabase + kiraresearch.com. UC2/UC3 default: draft mode (HTML + PDF download only). User overrides via flags. |
| **Confirm step for UC2/UC3** | Skill shows section list + page-type assignment before expensive content generation. User approves/edits. UC1 skips (template validated). |
| **Skill location** | Anthropic Skill format (`SKILL.md` + folder). Deploy to Claude.ai admin upload OR keep in repo for Claude Code. |
| **No tool brand frontend yet** | UC2/UC3 outputs to local download for now. Tool brand decision deferred. Skill stays brand-agnostic; output routing pluggable. |

---

## 3. ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│  USER INVOCATION                                                 │
│  Examples:                                                       │
│    "KIRA: Indonesia roofing 2026"          (UC1 candidate)       │
│    "KIRA: AI in legal services SG 2026"    (UC2 candidate)       │
│    "KIRA: <topic>" + uploaded files        (UC3 candidate)       │
│    "KIRA: <topic> --template market_analysis"  (force UC1)       │
│    "KIRA: <topic> --design"                (force UC2)           │
│    "KIRA: <topic> --draft" / "--publish"   (output override)     │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: INPUT DETECTOR + TOPIC PARSER                          │
│  Prompts: prompts/topic_parser.md                                │
│  Output: {country, industry, scope, year, intent_keywords,       │
│          has_files, forced_mode_flag, output_mode}               │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: ORCHESTRATOR / MODE ROUTER                             │
│  Prompts: prompts/orchestrator.md                                │
│  Logic:                                                           │
│  - Files uploaded? → UC3                                         │
│  - Force flag? → respect                                         │
│  - Match template registry confidence ≥ 0.7? → UC1               │
│  - Confidence < 0.7 + no files? → UC2                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
              ┌──────────┼──────────┐
              ↓          ↓          ↓
        ┌─────────┐ ┌─────────┐ ┌─────────────┐
        │   UC1   │ │   UC2   │ │     UC3     │
        │Template │ │ Design  │ │Data-grounded│
        └────┬────┘ └────┬────┘ └──────┬──────┘
             │           │             │
             │           ↓             ↓
             │    ┌──────────────────────────┐
             │    │ CONFIRM STEP             │
             │    │ Show section list +      │
             │    │ page-type plan           │
             │    │ User approves/edits      │
             │    └──────┬───────────────────┘
             │           │
             └───────────┴─────────────┐
                                       ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: RESEARCH                                               │
│  - UC1: template queries (~25, fixed pattern)                    │
│  - UC2: designed queries (~20-30, custom)                        │
│  - UC3: gap-filling queries (~10-15, supplement user data)       │
│  Web tool: WebSearch (native Claude tool)                        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: CONTENT GENERATION (unified)                           │
│  Prompts: prompts/content_per_section.md + voice_guide.md        │
│  - Generate per section content                                  │
│  - Enforce char budgets from page_schemas.json                   │
│  - Apply voice rules                                             │
│  - Tag every quantitative claim with source                      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: CHART GENERATION                                       │
│  Prompts: prompts/chart_generator.md                             │
│  - Inline SVG charts per section                                 │
│  - Use master_styles.css utility classes (.bar-primary, etc.)    │
│  - Real data from research_data + user_data                      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 6: ASSEMBLY                                               │
│  - Read templates/master_wrapper.html                            │
│  - Read templates/master_styles.css                              │
│  - Read templates/page_components.html OR compose new pages      │
│  - Substitute placeholders, process loops                        │
│  - Concatenate pages → final self-contained HTML                 │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 7: RENDER PDF                                             │
│  POST https://kiraresearch.com/api/render-pdf                    │
│  Headers: X-Api-Key: <PDF_RENDER_SECRET env var>                 │
│  Body: { html, filename }                                        │
│  Response: { pdf_base64, overflow_detected, overflow_pages }     │
│                                                                   │
│  If overflow: regen offending section w/ -15% budget, retry      │
│  Max 3 retries. After 3, publish + flag.                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 8: OUTPUT                                                 │
│  Draft mode (UC2/UC3 default):                                   │
│    - Save HTML + PDF to local /outputs/ folder                   │
│    - Show download links to user                                 │
│                                                                   │
│  Publish mode (UC1 default):                                     │
│    - Upload HTML to Supabase reports-pdfs/<REPORT_ID>/en.html    │
│    - Upload PDF to Supabase reports-pdfs/<REPORT_ID>/en.pdf      │
│    - Insert living_reports row                                   │
│    - Insert report_translations row                              │
│    - Insert audit_log row                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. FILE INVENTORY (existing assets to use)

These files are READY in the project folder. Do not regenerate. Copy into skill folder structure.

| File | Purpose | Status |
|---|---|---|
| `page_schemas.json` | Char budgets per page type (12 types) | ✅ Locked |
| `master_styles.css` | All CSS, single source | ✅ Locked |
| `master_wrapper.html` | HTML doc wrapper with placeholders | ✅ Locked |
| `page_components.html` | 10 page templates with placeholders | ✅ Locked |
| `kira-sample-report-R0152-v3.html` | Opus baseline quality reference | ✅ Locked — visual gold standard |
| `research_data_R0152.json` | Example research data structure | ✅ Reference |
| `render-pdf.js` | Vercel function for HTML→PDF | ✅ To be deployed (see Section 7 prerequisites) |
| `claude_code_setup_prompt.md` | Vercel deploy instructions | ✅ Use to deploy render-pdf.js |
| `KIRARESEARCH_-_BRANDING.md` | Brand colors, fonts, tokens | ✅ Reference |
| `claude.md` | Project strategy + anti-positioning | ✅ Reference |

---

## 5. SKILL FOLDER STRUCTURE TO BUILD

```
kira-skill/
├── SKILL.md                                    ← Main entry, Claude reads first
├── schemas/
│   ├── page_schemas.json                       ← Copy from existing
│   └── template_registry.yaml                  ← NEW: list of blueprints
├── templates/
│   ├── master_styles.css                       ← Copy from existing
│   ├── master_wrapper.html                     ← Copy from existing
│   ├── page_components.html                    ← Copy from existing
│   └── blueprints/
│       └── market_analysis/                    ← First blueprint (R0152-style)
│           ├── manifest.yaml                   ← NEW: blueprint metadata
│           ├── section_structure.json          ← NEW: 19-section list
│           └── query_strategy.json             ← NEW: 25-query pattern
├── prompts/
│   ├── topic_parser.md                         ← NEW
│   ├── orchestrator.md                         ← NEW (mode routing + template match)
│   ├── design_mode_planner.md                  ← NEW (UC2 first-principles)
│   ├── data_ingestion.md                       ← NEW (UC3 file processing)
│   ├── confirm_step.md                         ← NEW (UC2/UC3 user confirm)
│   ├── content_per_section.md                  ← NEW (unified content gen)
│   ├── chart_generator.md                      ← NEW (SVG patterns)
│   ├── voice_guide.md                          ← NEW (McKinsey-inspired voice rules)
│   └── render_and_output.md                    ← NEW (assembly + Vercel + Supabase)
├── references/
│   ├── sample_R0152_baseline.html              ← Copy from existing
│   ├── research_data_R0152.json                ← Copy from existing
│   ├── brand_guideline.md                      ← Copy from existing
│   └── claude_md.md                            ← Copy from existing
└── docs/
    ├── architecture.md                         ← Summary of this handoff doc
    ├── voice_examples.md                       ← 10 example paragraphs in correct voice
    └── chart_patterns.md                       ← 5 example SVG patterns
```

---

## 6. PROMPT CONTENT SPECIFICATIONS

Each prompt below: write as markdown file, Claude reads when skill activates.

### 6.1 SKILL.md (main entry)

Structure:
- `name: kira-research-report`
- `description`: Anthropic Skill trigger description — fires when user wants to generate market research report. Example phrases: "generate a KIRA report", "market analysis of X", "competitive analysis of Y", "research brief on Z". Include UC1/UC2/UC3 patterns.
- **Execution flow:** ordered steps referencing other prompt files
- **Hard rules:** brand voice, char budgets, source tagging, anti-positioning
- **Tool requirements:** WebSearch, file read, fetch (Vercel), Supabase MCP (UC1 publish)

### 6.2 topic_parser.md

Input: Raw user invocation string.
Task: Extract structured metadata.
Output JSON:
```json
{
  "raw_topic": "...",
  "country": "...",
  "country_iso": "...",
  "industry": "...",
  "industry_normalized": "...",
  "sub_industries": [],
  "scope": "B2C|B2B|B2B2C|Mixed",
  "year": 2026,
  "report_type_inferred": "market_analysis|competitive_comparison|...",
  "intent_keywords": [],
  "has_uploaded_files": false,
  "forced_mode": null,
  "forced_template": null,
  "output_mode": "default|draft|publish",
  "confidence": 0.95
}
```

### 6.3 orchestrator.md

Logic flowchart:
1. Read parsed topic.
2. If `has_uploaded_files` = true → route UC3, skip rest.
3. If `forced_mode` set → respect.
4. Read `schemas/template_registry.yaml`. For each blueprint:
   - Compute match score against topic (keyword overlap, industry domain match)
5. If max score ≥ 0.7 → route UC1 with that blueprint.
6. Else → route UC2.
7. Output: `{mode, blueprint_id (UC1 only), reasoning}`.

### 6.4 design_mode_planner.md (UC2)

Task: Given a novel topic, design report structure from first principles.
Process:
1. Analyze topic: industry domain, regulatory intensity, buyer type, geography, competitive concentration.
2. Brainstorm: "What does a senior consultant tell stakeholders about this topic? What insights drive action?"
3. Design section list (typically 12-20 sections):
   - Identify which sections are required (exec summary, methodology, etc.)
   - Identify novel sections topic demands
   - Skip sections topic doesn't need
4. For each section: assign page type (existing component) OR design new layout using design tokens.
5. Design query strategy: list 20-30 web search queries grouped by category, adapted to topic.
6. Output: section_plan.json with structure for confirm step.

### 6.5 data_ingestion.md (UC3)

Task: Process user-uploaded files; extract structured insights for use in report.
Supports file types (claim top 3 based on user — see Open Questions):
- `.txt`, `.md` → plain text extraction
- `.docx` → mammoth.js extraction
- `.pdf` → pdf parsing (text + tables)
- `.csv`, `.xlsx` → tabular data extraction
- `.pptx` → slide text + structure
Process:
1. Read each file via appropriate parser.
2. Classify content type per file: "primary research interview", "survey data", "internal market study", "competitor data", "financial data", "meeting notes", "other".
3. Extract key facts/quotes/data points per file. Tag with source filename.
4. Identify what topics/sections user data covers vs gaps.
5. Output: user_data_extracted.json with structured insights + gap analysis.

### 6.6 confirm_step.md

Task: Present section plan + data integration plan (UC3) to user. Wait for approval/edits.
Format output:
```
[CONFIRM PLAN — KIRA Report]

Topic: <topic>
Mode: UC2 (Design) | UC3 (Data-grounded)
Estimated pages: 18
Estimated time: 45 min

Proposed sections:
01. Executive Summary (existing: exec_summary_p1 + exec_summary_p2_implications)
02. Methodology (existing: methodology_inline)
03. Market context (existing: market_data_chart)
04. <novel section> (new: <layout description>)
...

[UC3 only — Data integration plan]
Section 03: Sourced from "interview_transcripts.docx" (5 quotes) + 2 web queries
Section 05: Hybrid — your "competitor_scrapes.csv" + web research
Section 08: Entirely web research (your data doesn't cover this)

Source tag distribution:
- [user-input]: 12 claims
- [secondary]: 18 claims
- [estimate]: 4 claims
- [primary]: 6 claims (KIRA synthesis)

Reply: APPROVE / EDIT [section list] / REJECT
```

### 6.7 content_per_section.md (unified content gen)

Task: For each section in plan, generate content respecting char budgets + voice rules + source tagging.
Process per section:
1. Read schema for assigned page type from `page_schemas.json`.
2. Pull relevant research data + user data for section.
3. Draft content respecting char budgets.
4. Validate char counts; if over, regenerate -15% target.
5. Embed source tags inline: `[primary]`, `[secondary]`, `[estimate]`, `[user-input]`.
6. Apply voice rules (see voice_guide.md).
7. Output: content_spec.json for the section.

### 6.8 chart_generator.md

Task: Generate inline SVG charts.
Patterns to support:
- Bar chart vertical (market size over years)
- Bar chart horizontal (player market shares)
- Stacked bar (segment breakdowns)
- HHI threshold visualization (with concentrated/moderate/competitive zones)
- CAGR arrow indicator
- Adoption curve (S-curve forecast)
- Use case impact matrix (X: effort, Y: impact)
- Distribution pie/donut (channel mix)
Each pattern: SVG template with placeholders. Use master_styles.css classes (`.bar-primary`, `.axis-line`, etc.). Real data from research.

### 6.9 voice_guide.md

Distilled rules:
- McKinsey-inspired structured analytical prose
- Inline bolding: 1-2 phrases per paragraph max, only for genuinely important phrases
- De-cliented: "Market participants" / "Stakeholders should consider" — never "Client should"
- No filler ("It is worth noting", "In conclusion", etc.) — every sentence carries weight
- Numbers always paired with source tag
- Per-section character budgets (from page_schemas.json) are hard caps
- Headlines use sentence case, not Title Case (e.g., "A market at inflection." not "A Market At Inflection")
- One key insight per paragraph; max 4 paragraphs per section narrative slot
- "Strategic implications" language for action sections
- Example paragraphs: see `docs/voice_examples.md` (10 examples to be authored from `sample_R0152_baseline.html`)

### 6.10 render_and_output.md

Task: Final stage. Assemble + render + output.
Steps:
1. Read master_wrapper.html, master_styles.css.
2. For each section in content_spec: extract template or compose new HTML, substitute placeholders.
3. Concatenate all pages.
4. Substitute into master_wrapper: `{{MASTER_STYLES_CSS}}`, `{{PAGES_HTML}}`.
5. POST to Vercel `/api/render-pdf`. Handle overflow retry.
6. Branch on output mode:
   - Draft: save HTML + PDF to local outputs/, return paths.
   - Publish: upload to Supabase `reports-pdfs` bucket, insert living_reports + report_translations + audit_log rows.

---

## 7. PREREQUISITES TO VERIFY BEFORE STARTING

| Prerequisite | Status | Action if not done |
|---|---|---|
| **Vercel `/api/render-pdf` deployed and tested** | ❓ Pending Henry (see `claude_code_setup_prompt.md`) | Run the setup prompt first. Confirm endpoint returns 200 with test payload. |
| `PDF_RENDER_SECRET` env var set on Vercel | ❓ Pending | Set during Vercel deploy. Capture value for skill use. |
| Supabase project `iygoynbnscednfzdsflc` accessible | ✅ Confirmed via MCP earlier | — |
| Supabase bucket `reports-pdfs` exists | ✅ Confirmed | — |
| Supabase tables `living_reports`, `report_translations`, `audit_log` schemas match Section 12 of `routine_instructions_v2.md` | ✅ Confirmed | — |

**STOP and verify Vercel endpoint before building skill.** Without it, skill cannot complete render stage.

---

## 8. BUILD SEQUENCE

### Phase A — Skeleton (Day 1)

1. Create `kira-skill/` folder structure (Section 5)
2. Copy existing files into correct locations:
   - `schemas/page_schemas.json` ← from project root
   - `templates/master_styles.css`, `master_wrapper.html`, `page_components.html`
   - `references/sample_R0152_baseline.html`, `research_data_R0152.json`, `brand_guideline.md`, `claude_md.md`
3. Write `SKILL.md` (main entry) referencing all sub-prompts (even if not written yet — placeholders OK)
4. Write `schemas/template_registry.yaml` with single entry for Market Analysis
5. Write `templates/blueprints/market_analysis/` 3 files (manifest, section_structure, query_strategy)

### Phase B — Prompts (Day 1-2)

Write each prompt file per Section 6 specs:
1. `topic_parser.md`
2. `orchestrator.md`
3. `voice_guide.md` (write first — informs other prompts)
4. `chart_generator.md`
5. `content_per_section.md`
6. `render_and_output.md`
7. `design_mode_planner.md` (UC2)
8. `data_ingestion.md` (UC3)
9. `confirm_step.md`

### Phase C — Reference docs (Day 2)

10. Write `docs/voice_examples.md` (10 example paragraphs extracted from `sample_R0152_baseline.html`)
11. Write `docs/chart_patterns.md` (5 SVG examples extracted from baseline)
12. Write `docs/architecture.md` (1-page summary)

### Phase D — UC1 test (Day 2-3)

13. Test invocation: "KIRA: Indonesia roofing exterior insulation 2026"
14. Expected route: UC1, Market Analysis template
15. Run full pipeline → verify HTML + PDF output
16. Compare visual output to `sample_R0152_baseline.html`
17. Quality bar: 90%+ visual match, char budgets respected, source tags present
18. Iterate prompts until quality matches

### Phase E — UC2 test (Day 3-4)

19. Test invocation: "KIRA: AI applications in legal services Singapore 2026"
20. Expected route: UC2 (no Market Analysis-fit blueprint)
21. Verify Design Mode planner produces sensible 15-20 section structure
22. Verify confirm step shows plan
23. After approval, verify generation completes
24. Quality bar: 70-80% Opus baseline on first run; iterate

### Phase F — UC3 test (Day 4-5)

25. Test invocation: "KIRA: Vietnam tea market" + upload sample CSV (mock survey data)
26. Verify data ingestion extracts insights correctly
27. Verify confirm step shows data integration plan
28. Verify `[user-input]` source tags appear in output
29. Quality bar: data references correct, no hallucinations contradicting user data

### Phase G — Polish + ship (Day 5-7)

30. Test 3 additional topics across each UC
31. Refine prompts based on failures
32. Document common issues in `docs/troubleshooting.md`
33. Final QA: run skill on 5 diverse topics, check brand consistency
34. Commit skill to repo

---

## 9. SUCCESS CRITERIA

Skill is "shipped" when:

- [ ] UC1 with R0152 topic produces output 90%+ visually matching `sample_R0152_baseline.html`
- [ ] UC2 with novel topic ("AI in legal services") produces 15-20 section report with custom structure, brand-consistent visuals, no broken layouts
- [ ] UC3 with mock data file produces report with proper `[user-input]` source tagging and no hallucinations contradicting input data
- [ ] Char budgets enforced — overflow check passes on all 3 test runs
- [ ] Voice consistent across modes (validated against `voice_examples.md`)
- [ ] PDF render succeeds for all 3 test runs
- [ ] UC1 publish mode successfully inserts Supabase rows + uploads to storage
- [ ] UC2/UC3 draft mode produces accessible local HTML + PDF

---

## 10. OPEN QUESTIONS (Henry to answer)

These don't block Phase A-B-C. But needed before Phase D-E-F testing.

### Q1: UC1 blueprints inventory
**Henry: list 4-5 templates you have from in-house work.** Per template, briefly describe:
- Name + use case
- Approximate section count
- Distinctive sections vs Market Analysis

Default if Henry doesn't answer: skill ships with 1 blueprint (Market Analysis only). Others added later.

### Q2: UC3 file type priority
**Henry: top 3 file types you'll feed into UC3 most often.** Pick from:
- Interview transcripts (.docx/.txt)
- Survey results (.csv/.xlsx)
- Internal PPT decks (.pptx)
- Internal PDFs
- Web scrapes (.csv/.json)
- Financial models (.xlsx)
- Meeting notes (.md/.txt)
- Other

Default if Henry doesn't answer: skill supports .docx, .csv, .pdf (most common).

### Q3: Template registry naming convention
**Henry: confirm template naming.** Proposed: `<report_type>_<domain>` (e.g., `market_analysis_consumer`, `competitive_comparison_tech`). Or alternative?

---

## 11. OUT OF SCOPE (do not build)

- Tool brand frontend (UC2/UC3 customer-facing UI) — deferred
- Subscription billing for UC2/UC3 — deferred
- Multi-locale skill (JA/KO support) — Phase 2 of skill, EN only first
- Routine wrapper (cron-based bulk processing) — comes after skill validated
- PPTX export — deferred (HTML + PDF only for now)
- Custom company branding overlay (UC3 enterprise feature) — deferred
- API for external use — deferred (skill use only)

---

## 12. AFTER SHIP — NEXT PHASES

Roadmap once skill v1 ships:

**Phase 2 (skill v2):**
- Add 3-4 more blueprints based on Henry's actual usage patterns (organic emergence from Design Mode patterns)
- JA + KO locale support
- PPTX export

**Phase 3 (productization):**
- Tool brand decision (KIRA Forge / Studio / standalone)
- Self-service frontend
- Subscription billing
- Multi-tenancy

**Phase 4 (scale):**
- Routine wrapper for bulk processing
- API access
- Enterprise features (white-label, custom templates)

---

## END OF HANDOFF

Start with Phase A. Verify Vercel prerequisite first (Section 7). Refer back to this doc throughout build.

Questions during build: ask Henry directly. Don't relitigate locked decisions (Section 2).

Quality bar: match `sample_R0152_baseline.html`. If skill output looks worse, iterate prompts. If it looks different but equivalent quality, that's OK — variation in novel topics is expected.

Good luck.
