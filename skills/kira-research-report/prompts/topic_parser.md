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
  "local_language_code": "id",
  "local_language_name": "Indonesian (Bahasa Indonesia)",
  "local_language_secondary_code": null,
  "local_search_priority": "tier-1",
  "use_curated_glossary": true,
  "confidence": 0.92,
  "parse_notes": "Topic falls squarely in SEA construction-materials domain; year explicit; sub-industries enumerated. Indonesia → Bahasa Indonesia primary business language (ISO 639-1: id). KIRA tier-1 strategic market with curated glossary."
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
| `local_language_code` | ISO 639-1 (2-letter) or BCP-47 (`zh-TW`-style) | Phase M.4: **LLM-infer** the primary business research language for the topic's country. See "Language inference rules" below. Constraint: must be a valid ISO 639-1 code or recognized BCP-47 tag — never free-form. `en` when the country's business press is English-dominant (SG, HK, IN). |
| `local_language_name` | string | Full English name of the inferred language for human readability and downstream debugging. Examples: `"Korean"`, `"Vietnamese"`, `"Portuguese (Brazil)"`, `"Arabic (Egyptian dialect)"`. |
| `local_language_secondary_code` | ISO 639-1 \| null | Phase M.4: optional second language for **multi-lingual countries** where business press splits across multiple languages (Switzerland, Belgium, Canada). Stage 4 fires queries in both. `null` if monolingual or no significant second business language. |
| `local_search_priority` | "tier-1" \| "tier-2" \| "skip" | KIRA strategic-market tier (business decision, not language inference). See "Tier override table" below. |
| `use_curated_glossary` | boolean | Phase M.4: `true` if `local_language_code` ∈ {vi, id, th, ja, ko} — those 5 have curated term tables in `references/local_lang_query_glossary.md`. `false` for all others — Stage 4 subagent translates query terms inline using LLM knowledge. |
| `confidence` | float 0-1 | Your overall confidence in this parse |
| `parse_notes` | string | One-sentence rationale, especially noting ambiguities. **Always surface the language inference reasoning** (e.g. "South Korea → Korean primary business press → ko, tier-1, curated glossary"). |

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

### Language inference rules (Phase M.4 — replaces M.1 hardcoded table)

You (the parser LLM) **infer** the local language from the country instead of looking it up in a static table. This handles any country in the world, including ones we haven't yet processed.

#### Inference procedure

1. **Identify country** from topic → set `country_iso` first.
2. **Reason about business press language** for that country (not "official language" — they often differ):
   - South Korea → Korean (`ko`)
   - Vietnam → Vietnamese (`vi`)
   - Indonesia → Bahasa Indonesia (`id`)
   - Brazil → Portuguese, ISO 639-1 `pt`. Specify `Portuguese (Brazil)` in `local_language_name` to distinguish from Iberian Portuguese.
   - Egypt → Modern Standard Arabic for press, `ar`. Note dialect (Egyptian) in `local_language_name`.
   - Mexico → Spanish, `es`. Specify `Spanish (Mexico)` for clarity.
3. **English-dominant business markets** — emit `en` even if the country has a different official language:
   - Singapore, Hong Kong, India, Philippines (business press leads in English), Malaysia (business press is bilingual EN+MS but EN dominates), South Africa, UAE (business press EN-dominant)
4. **Multi-lingual countries** — emit primary + secondary:
   - Switzerland → primary `de`, secondary `fr` (skip `it` and `rm` — too thin for business)
   - Belgium → primary `nl` (Dutch/Flemish), secondary `fr`
   - Canada → primary `en`, secondary `fr` (treat as English-dominant)
   - Indonesia (regional sub-topics like Sumatra/Java) → still `id` only — Javanese/Sundanese business press is negligible
5. **Constraint** — `local_language_code` MUST be a valid ISO 639-1 (2-letter) code or a recognized BCP-47 tag like `zh-TW` / `zh-CN` / `pt-BR` / `pt-PT`. Never invent codes. If unsure between two, pick the one with stronger business press footprint.
6. **Surface reasoning** in `parse_notes` so the next stage (and Henry) can see why you picked what you did.

#### Tier override table (KIRA business priorities — NOT language inference)

This is the *only* hardcoded list. It captures KIRA's strategic-market focus + which 5 languages have curated term glossaries. Update this table when KIRA expands to a new strategic market.

| `local_language_code` | `local_search_priority` | `use_curated_glossary` | Rationale |
|---|---|---|---|
| `vi` | tier-1 | true | KIRA strategic SEA market |
| `id` | tier-1 | true | KIRA strategic SEA market |
| `th` | tier-1 | true | KIRA strategic SEA market |
| `ja` | tier-1 | true | KIRA Phase 8 expansion market |
| `ko` | tier-1 | true | KIRA Phase 9 expansion market |
| `ms` | tier-2 | false | Malaysia has bilingual EN+MS business press |
| `tl` | tier-2 | false | Philippines EN-dominant; Tagalog niche |
| `zh-TW` | tier-2 | false | Taiwan |
| `en` | skip | false | English-primary markets — EN baseline covers |
| *(other code, KIRA not strategic here)* | tier-2 | false | Default: fire inline-translated queries if EN baseline sparse |

#### Worked examples

| Topic | Inference path |
|---|---|
| `"EV market in South Korea"` | KR → Korean business press → `ko`. tier-1 (KIRA strategic). curated_glossary=true. notes: "South Korea → Korean primary business press; KIRA tier-1 strategic market." |
| `"Coffee market Brazil 2027"` | BR → Portuguese (Brazilian) → `pt`, name `"Portuguese (Brazil)"`. Tier-2 (not in KIRA table). curated_glossary=false → inline translation. |
| `"Banking in Switzerland"` | CH → multilingual; primary `de` (German), secondary `fr` (French). Tier-2. inline translation. notes: "Switzerland multilingual; business press split DE+FR; Italian + Romansh too thin to fire." |
| `"SaaS in India"` | IN → English-dominant business press (Economic Times, Mint, LiveMint) → `en`, name `"English"`. tier-skip. notes: "India officially multilingual (22 languages) but business press is English-dominant — Hindi business coverage thinner than EN. Local pass skipped." |
| `"Fintech Singapore"` | SG → `en`, skip. notes: "Singapore EN-primary business market." |
| `"Logistics Hong Kong"` | HK → primary `en`, secondary `yue` (Cantonese) — but `en` dominates business; emit `en`, skip local pass. (Reserve Cantonese for cultural/consumer topics, not business research.) |
| `"Roofing Indonesia 2026"` | ID → `id`, name `"Indonesian (Bahasa Indonesia)"`, tier-1, curated_glossary=true. |
| `"Solar power Egypt 2027"` | EG → `ar`, name `"Arabic (Egyptian dialect for press)"`, tier-2, inline translation. notes: "Egypt → Modern Standard Arabic for industry press; Egyptian Arabic for consumer media. Use MSA for business search." |

## Self-check before returning

- [ ] Did I default `year` to the current year if not specified?
- [ ] Is `country_iso` correct for the country?
- [ ] Is `local_language_code` a valid ISO 639-1 or BCP-47 code (not a free-form invention)?
- [ ] Did I reason about *business press* language, not just official language (e.g. India → `en`, not `hi`)?
- [ ] Did I check the tier override table for `local_search_priority` + `use_curated_glossary`?
- [ ] Did I surface the language inference reasoning in `parse_notes`?
- [ ] For multi-lingual countries, did I set `local_language_secondary_code` if a second language has meaningful business press?
- [ ] If `has_uploaded_files: true`, did I list filenames?
- [ ] Did flag overrides set `forced_mode` / `output_mode`?
- [ ] Is `confidence` honest (lower for ambiguous topics)?

Return ONLY the JSON object. No commentary, no markdown wrapper.
