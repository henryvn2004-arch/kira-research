# data_ingestion.md — Stage 3c (UC3 — user-data ingestion)

When the user attaches files to their invocation, this prompt processes them: extracts structured insights, classifies content, identifies gaps, and produces `user_data_extracted.json` for downstream stages.

## When this runs

- `route == "UC3"` from orchestrator (`has_uploaded_files: true` triggers this automatically)

## Phase 1 supported file types

Top-3 priority based on owner spec:

| Extension | Parser approach | Typical content type |
|---|---|---|
| `.docx` | extract paragraphs + headings + tables (use mammoth-style extraction; preserve heading hierarchy) | Interview transcripts, internal reports, meeting notes |
| `.pdf` | text + table extraction (use pdf-parse-style; chunk by page if structure unclear) | Internal research, decks-as-PDF, supplier proposals |
| `.csv` / `.xlsx` | parse to tabular structure; preserve header row | Survey data, financial models, scraped competitor data |

Out of scope for Phase 1 (refuse politely if uploaded):
- `.pptx`, `.txt`, `.md`, `.json`, `.html`, image files

If a file type is out of scope, list it in `warnings` and continue processing the supported files.

## Process per file

### Step 1 — Extract raw content

Use the appropriate parser. Output a normalized intermediate form:

```json
{
  "filename": "buyer_interview_2026_q1.docx",
  "format": "docx",
  "extracted_chars": 18420,
  "structure": {
    "headings": ["Background", "Pain points", "Spend drivers", "Decision criteria"],
    "tables_count": 1,
    "paragraphs_count": 47
  },
  "raw_text_sections": [
    { "heading": "Background", "text": "..." },
    { "heading": "Pain points", "text": "..." }
  ],
  "tables": [
    {
      "title_inferred": "Spend by category",
      "headers": ["Category", "2024", "2025", "YoY"],
      "rows": [["Cement", 4.2, 4.7, "+12%"], ["..."]]
    }
  ]
}
```

### Step 2 — Classify file

Pick the BEST category — don't multi-classify unless genuinely mixed:

| Category | Typical signals |
|---|---|
| `primary_research_interview` | Q&A format, named informants (anonymized OK), narrative answers, one perspective per session |
| `survey_data` | Tabular, Likert-style responses, N respondents, % breakdowns |
| `internal_market_study` | Long-form analytical doc the user/their team produced, mix of narrative + numbers |
| `competitor_data` | Web-scraped or compiled facts about competitor X, often tabular |
| `financial_data` | P&L, balance sheet, KPIs in tabular form |
| `meeting_notes` | Date-stamped agenda + decisions + action items |
| `industry_report` | Published external report user is asking us to incorporate (treat as `[secondary]` source, not `[user-input]`) |
| `other` | Doesn't fit cleanly — describe in `notes` |

**Important distinction:** content classified as `industry_report` gets tagged `[secondary]` when its data points appear in the final report. Everything else (the genuinely user-originated content) tags as `[user-input]`.

### Step 3 — Extract key facts

For each file, pull 10-30 most consequential facts. Each fact:

```json
{
  "fact_id": "f-buyer-interview-2026-q1--p014",
  "claim": "Mid-tier developers cite logistics cost as the #1 reason for switching from imported to domestic roofing in 2025",
  "source_file": "buyer_interview_2026_q1.docx",
  "source_location": "p.4, Pain points section, paragraph 3",
  "type": "qualitative_quote" | "quantitative_data" | "ranking" | "trend_observation",
  "data_point": { "value": null, "unit": null, "period": null } | { "value": 18, "unit": "%", "period": "2025" },
  "relevance_tags": ["demand_drivers", "channel_economics"],
  "extracted_quote": "When logistics added 12% to imported roofing landed cost, we moved 30% of volume domestic within six months." | null,
  "downstream_source_tag": "user-input"
}
```

`relevance_tags` are the section IDs (or topic-keywords) that this fact could feed. Be permissive — the content_per_section.md stage will pick what it needs.

### Step 4 — Gap analysis

After extracting facts from all files, summarize:

- **What user data covers well** — which planned report sections have ample user-source material
- **What user data covers partially** — sections with some user facts but gaps to fill via web research
- **What user data doesn't cover at all** — sections that need to be filled entirely by web research

Map this against either:
- The blueprint structure (if UC3 + blueprint match — rare; usually UC3 routes to design mode anyway)
- The design-mode `section_plan` (most common)

Don't decide here whether to keep / cut / merge sections — that's confirm_step's call after showing the gap analysis to the user.

### Step 5 — Anti-hallucination integrity

Two safeguards:

1. **Numeric integrity:** If a number appears in the final report sourced from user data, the report should NOT hallucinate adjacent context. If the user gave "logistics cost added 12% to landed cost", the report can quote that fact. It should NOT extrapolate to "logistics cost rose 12% nationally" or "logistics cost will continue rising at 12% per year" without separate corroboration tagged `[secondary]` or `[estimate]` with clear methodology.

2. **Quote integrity:** Direct quotes from user interview files keep their original phrasing exactly. Use double quotes + italic styling. Source line cites: `Internal interview, Q1 2026 [user-input]`.

## Output — `user_data_extracted.json`

```json
{
  "ingest_version": 1,
  "files_processed": [
    {
      "filename": "buyer_interview_2026_q1.docx",
      "size_kb": 36,
      "category": "primary_research_interview",
      "facts_extracted": 18,
      "parse_quality": "complete",
      "issues": []
    },
    {
      "filename": "competitor_pricing_q1.xlsx",
      "size_kb": 14,
      "category": "competitor_data",
      "facts_extracted": 27,
      "parse_quality": "complete",
      "issues": []
    },
    {
      "filename": "industry_landscape_2025.pdf",
      "size_kb": 412,
      "category": "industry_report",
      "facts_extracted": 12,
      "parse_quality": "partial",
      "issues": ["3 chart pages were image-only; figures not extractable"]
    }
  ],
  "all_facts": [
    { "...fact objects from Step 3..." }
  ],
  "fact_count_total": 57,
  "fact_count_by_source_tag": {
    "user-input": 45,
    "secondary": 12
  },
  "gap_analysis": {
    "well_covered_sections": ["07_competitive_structure", "08_demand_channels"],
    "partial_coverage_sections": ["04_exec_summary", "05_macro_context"],
    "not_covered_sections": ["10_ai_impact", "11_forecast_outlook"],
    "recommended_web_query_count": 11
  },
  "warnings": [
    "1 .pptx file uploaded — not processed in Phase 1. List of unsupported uploads: ['Q4_review_deck.pptx']"
  ]
}
```

## After producing this output

Hand off to `confirm_step.md`. The confirm step will show the user:
- Files processed + fact count per file
- Gap analysis (what user data covers vs needs web research)
- Source tag distribution (so user knows the mix between `[user-input]` and other tags)
- Section plan (from the blueprint or design-mode planner)

User approves → Stage 4 (Research) runs to fill gaps.

## Edge cases

- **All user files were `industry_report` (external)**: surface a warning — user thought they were uploading primary research, actually uploaded published reports. The skill can still use those, but downstream tagging is `[secondary]`, not `[user-input]`, which changes the source-mix distribution. Confirm step should make this explicit.
- **User files contradict each other**: don't silently pick one. Note the conflict in the relevant fact entry with `conflict: true`, both values, and let confirm_step ask the user which to trust.
- **User files contradict authoritative public data found in Stage 4**: tag both, let content_per_section.md show both in the final report with attribution. Owner reviews + can flip status from draft.
- **A file is locked / encrypted / corrupt**: surface in `warnings`, continue with the other files. Don't halt unless ALL files fail.
