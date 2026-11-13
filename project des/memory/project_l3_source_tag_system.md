---
name: kira-l3-source-tag-system
description: "Phase L.3 source tag overhaul — collapsed [primary]/[secondary]/[estimate] into [Kira estimates] + named-source aliases inline, with page-bottom source key resolving aliases to full citations."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## What changed

Henry's feedback on the VN coffee smoke test (2026-05-23): "ghi rõ ra luôn: [primary] = [Kira estimates], [secondary] = ghi rõ source ra luôn, data đó lấy được từ source tên gì". He wanted readers to see WHO actually said each number, not opaque tag labels.

## The new system

Two tag categories only:

| Tag | When to use |
|---|---|
| `[Kira estimates]` | Any KIRA-derived figure — synthesis, in-house triangulation, model output. Replaces both old `[primary]` AND old `[estimate]`. |
| `[<Source Alias> <Year>]` | External citable source named inline. Short alias for inline use (≤30 chars), full citation in the page-bottom source key. E.g. `[BPS 2024]`, `[Vinacafe AR 2025]`, `[AC Nielsen 2026]`. |
| `[user-input]` | UC3 only — buyer-uploaded file. Unchanged. |

The old `[primary]` / `[secondary]` / `[estimate]` trio is **deprecated**.

## Inline format examples

```
USD 2.0 bn market in 2025 [BPS 2024], rising to USD 3.1 bn by 2030 [Kira estimates].
Fiber cement HHI 8,737 [Kira estimates based on IMPC, KIAS, Saint-Gobain filings].
```

## Page-bottom source key (NEW page element)

Every content page that uses any named-source tag must end with a SOURCE KEY line resolving each alias to its full citation. Format:

```
SOURCE KEY · BPS 2024 = Badan Pusat Statistik Construction Materials Census 2024 · Vinacafe AR 2025 = Vinacafe Annual Report 2025 · Kira estimates = KIRA in-house analyst triangulation
```

CSS class `.source-key` (in `master_styles.css`) with `::before` injecting the "SOURCE KEY ·" prefix, `:empty` hides when no content. Renders just above `.page-footer`.

## Alias picking conventions

- Gov/stats agencies: acronym + year. `BPS 2024`, `GSO 2021`, `BNM 2025`
- Companies: shorthand + doc type + year. `Vinacafe AR 2025`, `Masan Q3 2025`
- Industry pubs: shorthand + year. `Specialty Coffee Assoc 2025`
- Multi-source gov reports: agency + report type + year. `MOIT Coffee Report 2025`
- Max 30 chars (appears in tight inline spots)

## Kira estimates target %

Aim for `[Kira estimates]` to cover **20-30%** of tagged numbers across the report. Below 15% → over-reliant on externals (lose analyst-house voice). Above 40% → too speculative. Per-blueprint variance allowed (regulatory_brief is ~15-20%, consumer_segmentation is ~25-35%).

## Translator behavior (JP + KO)

Source tags + aliases stay in English brackets verbatim. Only the `SOURCE KEY` LABEL gets localized:
- JP: `出典凡例 · BPS 2024 = ...` (citations themselves stay English)
- KO: `출처 범례 · BPS 2024 = ...` (citations themselves stay English)

Translators must NOT translate alias names (they're proper nouns of source documents).

## Files touched in L.3

- `prompts/content_per_section.md` Step 5 (the canonical spec)
- `prompts/voice_guide.md` Numbers + callout schema
- `prompts/render_and_output.md` source-tag rendering
- `prompts/translator_jp.md` + `translator_ko.md` preserve rules
- `prompts/batch_runner.md` subagent prompt references
- `schemas/page_schemas.json` global_rules + methodology_endnote schema
- `templates/master_styles.css` .source-key class
- `templates/page_components.html` SOURCE_KEY_HTML placeholder + header comment
- `docs/blueprint_review/*.md` all 6 updated by subagent (~110 lines)
- `docs/a_plus_flex_spec.md` hard-rules section
- This memory file + `project_a_plus_flex.md` updated

## Gotcha

`methodology_endnote` (last page of report) is the REPORT-LEVEL source roll-up — every unique alias used anywhere, alphabetical, with full citation. Distinct from per-page source_key footer. Don't double-render.

## L.1 + L.2 also landed alongside

- L.1: sequential section gen (no more parallel sub-subagents that dropped sections silently — fixed the VN coffee §4/§5/§6 + §7.2/§7.4 missing bug)
- L.2: methodology_inline page is now boilerplate (default_copy in schema) so subhead always introduces the two-column body correctly

See also: [[project_tool_gen_report]] · [[project_a_plus_flex]] · [[reference_kira_research]]
