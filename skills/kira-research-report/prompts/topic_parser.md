# topic_parser.md — Stage 1

Parse the user's raw invocation string into structured metadata that downstream stages can route on.

## Input

The complete user message that invoked the skill. May include:
- A natural-language topic ("Indonesia roofing 2026", "AI in legal services Singapore")
- Optional flags: `--template <id>`, `--design`, `--draft`, `--publish`, `--locale <iso>`
- Optional attached files (UC3 trigger)
- A leading marker like `KIRA:` (strip it)

## Task

Extract metadata. Don't fabricate — if a field can't be confidently inferred, set it to `null` and lower the `confidence` score accordingly.

## Output (JSON, single object)

```json
{
  "raw_topic": "Indonesia roofing exterior insulation 2026",
  "country": "Indonesia",
  "country_iso": "ID",
  "industry": "Roofing, exterior cladding & insulation materials",
  "industry_normalized": "construction materials",
  "sub_industries": ["roofing", "exterior cladding", "insulation"],
  "scope": "B2B",
  "year": 2026,
  "forecast_horizon_years": 5,
  "report_type_inferred": "market_analysis",
  "intent_keywords": ["market size", "competitive structure", "AI impact", "forecast"],
  "has_uploaded_files": false,
  "uploaded_file_names": [],
  "forced_mode": null,
  "forced_template": null,
  "output_mode": "default",
  "locale": "en",
  "confidence": 0.92,
  "parse_notes": "Topic falls squarely in SEA construction-materials domain; year explicit; sub-industries enumerated in topic string."
}
```

### Field rules

| Field | Type | Rules |
|---|---|---|
| `raw_topic` | string | Original topic with `KIRA:` marker and flags stripped |
| `country` | string \| null | Canonical English country name. Map common variants (PH → Philippines, VN → Vietnam, ID → Indonesia, KR → South Korea, etc.) |
| `country_iso` | ISO 3166-1 alpha-2 \| null | "ID", "VN", "TH", "PH", "MY", "SG", "JP", "KR" — must match country |
| `industry` | string \| null | Free-form descriptive name as it appears in the topic |
| `industry_normalized` | string \| null | Map to one of: `construction materials`, `consumer goods`, `manufacturing`, `services`, `technology`, `financial services`, `healthcare`, `energy`, `agriculture`, `logistics`, `retail`, `pharma`, `media` |
| `sub_industries` | string[] | Specific segments mentioned (≤5 items) |
| `scope` | "B2B" \| "B2C" \| "B2B2C" \| "Mixed" \| null | Inferred from industry context |
| `year` | integer | Explicit year from topic. If absent, default to **current year** (2026 at time of writing — pull from system date when running) |
| `forecast_horizon_years` | integer | Default 5; override if topic includes a longer horizon |
| `report_type_inferred` | string | Best guess at blueprint id: `market_analysis`, `competitive_comparison`, `regulatory_landscape`, `tech_adoption`, `channel_distribution`. Phase 1: only `market_analysis` matters |
| `intent_keywords` | string[] | 3-6 phrases capturing what the user wants to understand |
| `has_uploaded_files` | boolean | True if files were attached to the invocation |
| `uploaded_file_names` | string[] | If files present, list their filenames |
| `forced_mode` | "UC1" \| "UC2" \| "UC3" \| null | Set ONLY if user explicitly forced mode via flag |
| `forced_template` | string \| null | Set if `--template <id>` was passed |
| `output_mode` | "default" \| "draft" \| "publish" | Default = let orchestrator decide. Override with `--draft` or `--publish` flags |
| `locale` | "en" \| "ja" \| "ko" | Phase 1 always "en". Hint extraction only; do not actually localize. |
| `confidence` | float 0-1 | Your overall confidence in this parse |
| `parse_notes` | string | One-sentence rationale, especially noting ambiguities |

### Flag handling

| Flag | Effect |
|---|---|
| `--template <id>` | Set `forced_mode: "UC1"`, `forced_template: <id>` |
| `--design` | Set `forced_mode: "UC2"` |
| `--draft` | Set `output_mode: "draft"` |
| `--publish` | Set `output_mode: "publish"` |
| `--locale ja` / `--locale ko` | Phase 1: refuse politely and explain only EN ships in v1; halt before Stage 2 |

### Ambiguity examples

| Raw input | Notable handling |
|---|---|
| `"KIRA: Indonesia roofing 2026"` | Confident parse → market_analysis candidate |
| `"KIRA: AI in Singapore legal services 2026"` | `industry_normalized: services`, scope B2B; flag in `parse_notes` that this is poor fit for market_analysis blueprint → UC2 likely |
| `"market analysis of Vietnam tea"` | Year missing → default to current year, lower confidence to ~0.7 |
| `"competitive landscape Thailand fintech"` | `report_type_inferred: competitive_comparison`. Phase 1 has no such blueprint, so UC2 likely |
| `"KIRA: <topic> + 3 .docx files attached"` | `has_uploaded_files: true` → UC3 routing in Stage 2 regardless of topic shape |
| `"refresh R0152"` | **Refuse**. R-numbers are internal archive; explain we never reference them externally and ask for a topic name instead |
| Empty topic / single word | Ask the user a clarifying question before producing JSON. Don't guess. |

## Self-check before returning

- [ ] Did I default `year` to the current year if not specified?
- [ ] Is `country_iso` correct for the country?
- [ ] If `has_uploaded_files: true`, did I list filenames?
- [ ] Did flag overrides set `forced_mode` / `output_mode`?
- [ ] Is `confidence` honest (lower for ambiguous topics)?

Return ONLY the JSON object. No commentary, no markdown wrapper.
