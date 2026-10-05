# Report naming convention

Every report gets its names from one script, `scripts/report-name.mjs`, and never from free writing. The script turns seven inputs into a **report code**, a **slug**, a **title** and the search metadata, and it refuses names that break the rules below. The vocabulary it uses (countries, industries, stages, report types, with JA/KO labels) is `references/naming_vocab.json`.

## What a name is made of

| Input | Rule | Example |
|---|---|---|
| Country | From the vocabulary (ISO-2 or English name) | `VN` |
| Industry | One of the 32 vocabulary industries; free text is mapped through its aliases | `Coffee Chains` → `FSV` Food service |
| Stage | `XPL` market scan · `ENT` market entry · `XPN` expansion (the investor's stage, Phase S) | `ENT` |
| Type | `D` deep report · `S` industry snapshot | `D` |
| Year | 4 digits | `2026` |
| Segment | 1–4 words, sentence case, ≤ 28 chars, the noun a buyer would type | `coffee chains` |
| Angle | ≤ 60 chars, no hype words. A question the report answers is preferred (owner preference, not a rule): `How to win…?` · `Where to play…?` · `How to enter…?` · `How to expand…?` · `What are the key impacts of…?`. A statement (the answer or the tension) is also accepted | `how can a foreign brand win the food-led gap?` |

## What the script produces

| Output | Pattern | Example |
|---|---|---|
| **Code** | `CC-IND-STG-TYY-NN` | `VN-FSV-ENT-D26-01` |
| **Slug** | `country-segment-year`; if taken, `country-segment-stage-year`; then `-2`, `-3` | `vietnam-coffee-chains-2026` |
| **Title** | `Country segment year: angle` (≤ 95 chars) | `Vietnam coffee chains 2026: how a foreign brand wins the food-led gap` |
| Canonical title | `Country segment year` (≤ 45 chars) | `Vietnam coffee chains 2026` |
| SEO title | Canonical + report kind + brand, cut from the right to fit 60 chars | `Vietnam coffee chains 2026 — Market entry brief` |
| Eyebrow (EN/JA/KO) | `COUNTRY · INDUSTRY · REPORT KIND` | `VIETNAM · FOOD SERVICE · MARKET ENTRY BRIEF` |
| Cover lines | Line 1 country, line 2 (accent) segment, optional line 3 ≤ 18 chars | Vietnam / Coffee chains |
| Short title | `Country segment` (closing page) | `Vietnam coffee chains` |
| Keywords | Country + segment, industry, report kind, plus the synonyms and local-language terms passed with `--keywords` | `chuỗi cà phê`, `cafe chain` |

## Why this shape

1. **Keywords first.** Searchers type the market as country plus product ("vietnam coffee chain"), and readers scanning a list read only the first two or three words of each line. The title therefore opens with country and segment and puts the insight after the colon. Search results cut titles at about 60 characters, which is why the canonical part stays ≤ 45 and the SEO title ≤ 60.
2. **Two-part title (descriptive: declarative).** The part before the colon says what the report covers and is predictable, so it can be searched and sorted. The part after the colon says what the report concludes, which is what makes someone open it. Academic and strategy-firm publishing use the same split.
3. **Faceted classification.** A library is browsed by facets (country, industry, investor stage, type, year), not by one hierarchy. Each facet has a fixed vocabulary, so "Cosmetics", "Beauty" and "Beauty & Personal Care" become one industry (`BTY`) instead of three, and filters and counts stay correct.
4. **An identifier separate from the title.** As with an ISBN or a DOI, the code never changes even if the title is edited. Its parts are fixed-width and ordered from broad to narrow, so a prefix search finds a group: `VN-` all Vietnam, `VN-FSV` Vietnamese food service, `-ENT-` every entry brief, `-D26-` every 2026 deep report.
5. **Stable URLs.** A published slug is never changed (links and search rankings depend on it). New slugs follow one order, country first, so related reports sit together.

## Rules the script enforces

- Country and industry must be in the vocabulary. To cover a new one, add it to `naming_vocab.json` (code + EN/JA/KO labels + aliases); never invent a code in a title. Codes are never reused or renamed.
- Segment: 1–4 words, sentence case (acronyms and proper nouns allowed), must not repeat the country.
- Angle: required, ≤ 60 characters (a trailing `?` counts), no hype words (`voice_guide.md`). Question form preferred, statement allowed.
- Slugs and codes are unique against Supabase `living_reports` (when `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set) and every `outputs/batch/*/naming.json` in progress.

## Where it is used in the pipeline

1. **Planning** (`brain_route.md` Step C, or the orchestrator for the other routes): pick stage, segment and angle; run the script; save `outputs/batch/<id>/naming.json`.
2. **Render** (`render_and_output.md`): cover lines, report kind, `<title>` and closing short title come from `naming.json`.
3. **Translation**: translators translate `<title>`; eyebrows come pre-translated from the vocabulary.
4. **Publish** (`batch_runner.md` 5.3a): slug, code, stage, type, segment, keywords and the EN eyebrow come from `naming.json`; the JA/KO title is the translated `<title>`.

## Search

- Supabase `living_reports` stores `code`, `industry_code`, `stage`, `report_type`, `segment` and `keywords` (migration 023).
- `/api/library-list?q=` matches a code prefix (`VN-FSV`), or text in the slug, segment or keywords.
- Reports published before this convention were given codes by the backfill in migration 023. Their slugs and titles are unchanged.

## Examples

| Stage | Title | Code |
|---|---|---|
| XPL | Indonesia halal cosmetics 2027: the certification deadline reshapes the shelf | `ID-BTY-XPL-D27-01` |
| ENT | Thailand convenience stores 2026: a franchise route past the 7-Eleven wall | `TH-RTL-ENT-D26-01` |
| XPN | Philippines cold chain 2026: three corridors for a second warehouse | `PH-LOG-XPN-D26-01` |
