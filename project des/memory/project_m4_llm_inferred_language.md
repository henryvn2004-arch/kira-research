---
name: kira-m4-llm-inferred-language
description: "Phase M.4 — topic parser LLM-infers local_language_code from country (any ISO 639-1, not just SEA). Small business-tier override table only for KIRA strategic markets + curated-glossary list."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## Why this exists

M.1 shipped dual-language search with a HARDCODED country → language lookup table covering only SEA + JP/KR. Henry caught it on the M.1 review (2026-05-23): "hiện giờ, local language theo country, mày hardcode luôn ah? có cách nào mày làm nó flexible detect dc từ user input ko? ví dụ: 'EV market in South Korea' → detect local market = South Korea, local language = Korean".

Right. M.1's static enum (`"vi" | "id" | "th" | "ja" | "ko" | "ms" | "tl" | "zh-TW" | "en"`) only covers ~10 countries. Topics for Brazil/India/France/Egypt all fell back to `en` → missed local-language sources.

## The M.4 fix

Drop the enum + static lookup. Let topic_parser **LLM-infer** the local language from the country during the parse step. The LLM was already running anyway — just removing the constraint lets it cover the whole world.

### What the parser now emits

```json
{
  "country": "South Korea",
  "country_iso": "KR",
  "local_language_code": "ko",
  "local_language_name": "Korean",
  "local_language_secondary_code": null,
  "local_search_priority": "tier-1",
  "use_curated_glossary": true,
  ...
}
```

New fields (M.4):
- `local_language_name` — full English name. Helps debugging + lets parse_notes surface intent clearly.
- `local_language_secondary_code` — set for multi-lingual countries (CH: `de` + `fr`; BE: `nl` + `fr`; CA: `en` + `fr`). Stage 4 fires queries in both.
- `use_curated_glossary` — boolean. `true` for 5 priority languages (vi/id/th/ja/ko) with hand-vetted term tables. `false` → Stage 4 subagent translates inline using LLM knowledge.

### Inference principles (in topic_parser.md)

1. Pick **business press language**, not "official language". India officially has 22 languages but business press is EN-dominant → emit `en`. Singapore EN, HK EN, IN EN.
2. **Multi-lingual countries**: pick primary + secondary by business press footprint. Switzerland → `de` primary, `fr` secondary (skip Italian/Romansh — too thin). Belgium → `nl` primary, `fr` secondary. Canada → `en` primary, `fr` secondary (treat as English-dominant overall).
3. **ISO 639-1 / BCP-47 constraint**: never invent codes. Brazil = `pt`, name = "Portuguese (Brazil)" to distinguish from Iberian Portuguese. Egypt = `ar` with name "Arabic (Egyptian press)". Mexico = `es` with name "Spanish (Mexico)".
4. **Surface reasoning** in `parse_notes` so the next stage (and Henry reviewing telemetry) can see why a language was picked.

### Only remaining hardcoded table — the BUSINESS tier override

In `references/local_lang_query_glossary.md`:

| `local_language_code` | `local_search_priority` | `use_curated_glossary` | Rationale |
|---|---|---|---|
| vi / id / th / ja / ko | tier-1 | true | KIRA strategic markets w/ curated glossary |
| ms / tl / zh-TW | tier-2 | false | Adjacent markets, no curated glossary yet |
| en | skip | false | English-dominant business press |
| *any other* (default) | tier-2 | false | LLM-inline, fire if EN sparse |

This is a **business decision** (which markets KIRA prioritizes), not a language inference. It stays static and small. When KIRA expands to a new strategic market (say Phase 10: Brazil), add a row + write a curated term-glossary column for `pt`.

## Worked examples

| Topic | Country | Inference output |
|---|---|---|
| `"EV market in South Korea"` | KR | `ko`, "Korean", tier-1, curated, no secondary |
| `"Coffee market Brazil 2027"` | BR | `pt`, "Portuguese (Brazil)", tier-2 default, inline |
| `"Banking in Switzerland"` | CH | `de` primary + `fr` secondary, "German" / "French", tier-2 default, inline |
| `"SaaS in India"` | IN | `en`, "English", skip — IN business press is EN-dominant |
| `"Logistics Hong Kong"` | HK | `en`, "English", skip — Cantonese reserved for cultural topics, not business |
| `"Roofing Indonesia 2026"` | ID | `id`, "Indonesian (Bahasa Indonesia)", tier-1, curated |
| `"Solar Egypt 2027"` | EG | `ar`, "Arabic (Egyptian press, MSA for industry)", tier-2 default, inline |
| `"Telco Mexico 2026"` | MX | `es`, "Spanish (Mexico)", tier-2 default, inline |
| `"Fintech Vietnam"` | VN | `vi`, "Vietnamese", tier-1, curated |

## Files touched in M.4

- `prompts/topic_parser.md` — output schema gets 3 new fields; M.1's static lookup table replaced with "Language inference rules" + worked examples; tier override table relocated as the only hardcoded list.
- `references/local_lang_query_glossary.md` — old "Country → local_language_code mapping" table removed; new "Tier override table" section + clearer curated-vs-inline split; non-curated country name examples added (BR/CH/EG/MX/IN/BE).
- `prompts/batch_runner.md` — EN subagent prompt updated to handle inline translation + multi-lingual countries.
- `SKILL.md` Stage 4 — description updated.

## What stays unchanged

- The 24-term × 5-language curated glossary tables (vi/id/th/ja/ko)
- Tier-1 designation for the 5 curated languages (KIRA's strategic markets)
- Source tag system from L.3 (English aliases inline, page-bottom SOURCE KEY for full citations)
- Stage 4 dedupe + merge logic
- WebSearch tool itself

## When the LLM might guess wrong

The LLM inference is robust for well-known countries, but edge cases:
- **Disputed territories**: e.g. Kosovo (`sq` or `sr`?). Parser should pick the de facto business press leader + surface the ambiguity in parse_notes. Default: lower `confidence` to ~0.6.
- **Diaspora countries**: Israel has both `he` and `ar`. Business press is `he`-dominant. EN also significant. Pick `he` primary, EN doesn't need a secondary (handled by baseline).
- **Caribbean / Pacific small states**: often EN or FR colonial legacy. Default to `en` unless explicit local language industry exists.
- **Mainland China**: `zh-CN` (Simplified). NOT in scope Year 1.

When ambiguous: surface in parse_notes. Henry can review + correct in queue.csv if a misroute happens.

## Reverting to hardcoded

If LLM inference proves unreliable (e.g. inconsistent codes across same country across fires), the fallback is: re-add the M.1 static table to topic_parser.md as a "if you're unsure, use this lookup" section. The tier override table already exists — only the country → code mapping would need restoration. Keep the LLM-inferred path as primary; static as guard rail.

See also: [[project_m1_dual_language_search]] · [[project_l3_source_tag_system]] · [[project_tool_gen_report]] · [[reference_kira_research]]
