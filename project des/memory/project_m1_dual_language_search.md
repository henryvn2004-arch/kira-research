---
name: kira-m1-dual-language-search
description: "Phase M.1 dual-language web search — Stage 4 fires EN baseline + local-language pass (vi/id/th/ja/ko) for tier-1 countries to capture richer in-country sources (GSO/BPS/MAFF/etc.). Source tags stay English per L.3."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## Why this exists

Henry caught it on the VN coffee L.4 standby (2026-05-23): "phần web search, mày đang search bằng ngôn ngữ nào thế? tiếng Anh ah? nếu search bằng local language thì sẽ ra được kết quả nhiều hơn và chính xác hơn đó."

Right. Stage 4 was firing English-only queries → Google ranked English-press picks → local primary sources (GSO Vietnam, BPS Indonesia, MAFF Japan, KOSIS Korea) were largely missing from research_data. The L.3 source-alias system makes citing local sources easy, but if we never *find* them, the depth gap shows up in the report (thinner segment data, missing recent policy events, no specialty operator coverage).

## The fix — dual-language Stage 4

For tier-1 countries (VN/ID/TH/JP/KR), fire both EN queries AND ~8-10 local-language queries in parallel. Merge results dedupe-by-URL.

### Country → local code mapping

| ISO | Country | Code | Priority |
|---|---|---|---|
| VN | Vietnam | `vi` | tier-1 (always fire) |
| ID | Indonesia | `id` | tier-1 |
| TH | Thailand | `th` | tier-1 |
| JP | Japan | `ja` | tier-1 |
| KR | South Korea | `ko` | tier-1 |
| MY | Malaysia | `ms` | tier-2 (fire if EN < 6 sources/bucket) |
| PH | Philippines | `tl` | tier-2 |
| TW | Taiwan | `zh-TW` | tier-2 |
| SG | Singapore | `en` | skip |
| HK | Hong Kong | `en` | skip |
| *other* | — | `en` | skip |

`topic_parser.md` now emits `local_language_code` + `local_search_priority` (tier-1 / tier-2 / skip).

### Query construction pattern

Given EN template `"{{country}} {{industry}} market size {{year}} USD"`:

- EN pass (existing): `"Vietnam coffee market size 2026 USD"`
- VI pass (new): `"Việt Nam cà phê quy mô thị trường 2026"` (drop USD — VN stats use VND)
- Optional currency variant: `"Việt Nam cà phê quy mô thị trường 2026 tỷ VND"`

Translations come from `references/local_lang_query_glossary.md` — single source of truth for term mappings across 24 query terms × 5 languages. Industry names translated inline by subagent using LLM knowledge (no enumeration in glossary).

### Per-bucket priority hint

Not every bucket benefits equally. The glossary's priority table:

| Bucket type | Local pass priority |
|---|---|
| macro / sector overview / sizing / demand / regulatory / channel / pricing | HIGH |
| competitive / M&A / forecast / spending / cultural / willingness | MEDIUM |
| ai_impact / disruptors / d2c | LOW (skip unless EN sparse) |

Subagent uses this to budget the ~10 local queries — concentrate on HIGH buckets first.

### Source tagging (unchanged from L.3)

- Local source still cited via English alias: `[GSO 2024]` not `[Tổng cục Thống kê 2024]`
- Page-bottom SOURCE KEY may include local-lang full name for traceability:
  ```
  SOURCE KEY · GSO 2024 = Tổng cục Thống kê Việt Nam — Niên giám Thống kê Cà phê 2024
  ```
- Alias picking conventions from L.3 still apply (acronym + year for gov; shorthand + doc type + year for companies)

## Files touched in M.1

- `references/local_lang_query_glossary.md` (NEW) — canonical term mapping for 5 languages, country mapping table, per-bucket priority hints, query construction pattern
- `prompts/topic_parser.md` — emit `local_language_code` + `local_search_priority`, country→code mechanical lookup table, self-check checklist
- `prompts/batch_runner.md` — EN subagent prompt mentions dual-language fire requirement + returns query count breakdown ("27 EN + 10 VI queries")
- `SKILL.md` — Stage 4 description rewritten with dual-language flow
- `templates/blueprints/*/query_strategy.json` × 7 — added `localized_search` block (pointer to glossary + priority hints)

## What stays unchanged

- EN query templates in each blueprint (still the baseline)
- Source tag system from L.3 (`[Kira estimates]` + English aliases)
- Translator JP/KO behavior (preserve aliases verbatim)
- WebSearch tool itself — same native Claude tool, just fired with more diverse queries

## Cost

- ~1.5-2x WebSearch quota per tier-1 report (8-10 local queries on top of ~25 EN baseline)
- Tier-2 reports: ~1x to 1.3x (fire only if EN sparse)
- Skip countries: 1x (no change)

## Edge cases

- **Singlish vs English in SG**: SG is `en` only — Singlish-flavored search adds noise without value
- **Bahasa Malaysia vs Bahasa Indonesia**: overlap ~70% but enough divergence (e.g. "kerajaan" MY = "pemerintah" ID for "government") that we keep separate codes
- **Mandarin TW vs CN**: TW uses Traditional, code `zh-TW`. China not in scope Year 1.
- **Esoteric industries** (no clean local translation, e.g. "embedded finance"): keep English term in local-lang query — search engines tolerate code-switching ("Việt Nam embedded finance quy mô thị trường 2026" works fine)

## How a subagent runs Stage 4 (operational flow)

1. Read topic_parser output → get `local_language_code`, `local_search_priority`
2. If priority = skip → fire EN queries only, done
3. If priority = tier-1:
   - Load `references/local_lang_query_glossary.md`
   - Load blueprint's `query_strategy.json` — note `localized_search` block + bucket priorities
   - For HIGH-priority buckets: construct local-lang query variant per EN template using glossary
   - Fire ~8-10 local queries in parallel with the EN fire
   - Merge results dedupe-by-URL
4. If priority = tier-2:
   - Fire EN queries first, count high-quality sources per bucket
   - For buckets with < 6 sources, fire 2-3 local-lang queries to fill
5. Aggregate into research_data, hand to content_per_section.md

## Gotcha

When citing a local-language source in the inline tag, **always translate the source's title to its canonical English alias** before using it. Reader sees `[GSO 2024]` everywhere consistently — never `[GSO 2024]` in one section + `[General Statistics Office 2024]` somewhere else + `[Tổng cục Thống kê 2024]` in another. The alias is the citation; the local-lang full name is footer-only.

See also: [[project_l3_source_tag_system]] · [[project_tool_gen_report]] · [[project_a_plus_flex]] · [[reference_kira_research]]
