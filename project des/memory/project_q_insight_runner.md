---
name: kira-q-insight-runner
description: "Phase Q.2 — separate 4-fires/day insight cron extracts 3 sections from each published report's en.html, gens trilingual Insight articles for AEO/GEO"
metadata:
  node_type: memory
  type: project
---

## What this is

Phase Q.2 (2026-05-25) added an **Insight generation pipeline** on top of the existing batch report cron. After a report is published (via `batch_runner.md` Stage C), a separate `insight_runner.md` cron picks it up, extracts 3 strongest sections, converts H2s to question form (5W1H), and publishes 9 rows to `insight_translations` (3 insights × EN/JA/KO).

Goal: each `living_reports` row → 3 published `insights` cross-linked back, trilingual, optimized for **AEO** (Answer Engine Optimization — AI Overviews, Perplexity, ChatGPT browsing) and **GEO** (Generative Engine Optimization — FAQPage JSON-LD, Speakable schema).

## Cadence

4 daily fires on DELL machine: `kira-insight-{0700, 1100, 1500, 2100}` ICT.

| Task | Cron | Stage handled per fire |
|---|---|---|
| any | each fire picks most-advanced pending report | 1 stage (E or J or K) for 1 report |

With ~3-4 reports/day published by batch, 4 insight fires drain the pipeline within 24-36h of report publish.

## Pipeline (mirrors Q.1 multi-fire pattern)

```
[batch_runner publishes report] → living_reports row INSERT

[insight cron fire scans living_reports without 9 insight_translations rows]
  ↓
  Pick 1 report → determine next_stage via row count in insight_translations
  ↓
Stage E (en_count < 3):
  Read outputs/batch/<id>/en.html
  Spawn subagent: extract 3 strongest sections as JSON
  INSERT 3 insights rows + 3 insight_translations EN, status=published

Stage J (en_count = 3 AND ja_count < 3):
  Fetch 3 EN insights for this report
  Spawn subagent: translate all 3 to JA (one call, ~15KB total — within cap)
  INSERT 3 insight_translations JA, status=published

Stage K (en_count = 3 AND ja_count = 3 AND ko_count < 3):
  Same as J but for KO
```

## State machine — no DB schema change

Stage detection is purely via row count per `insight_id`:

```sql
COUNT(*) FILTER (WHERE locale = 'en') AS en_count
COUNT(*) FILTER (WHERE locale = 'ja') AS ja_count
COUNT(*) FILTER (WHERE locale = 'ko') AS ko_count
```

This avoids adding a `pipeline_stage` column. Sentinel: 0/1/2/3 EN means stage_en; 3/<3 JA means stage_ja; 3/3/<3 KO means stage_ko. All 3/3/3 → done.

## Question form (AEO core)

Per locale, headlines converted from report H2 → AEO-friendly form via `prompts/question_templates.md`:

| Report section | EN headline | JA (体言止め) | KO (명사형) |
|---|---|---|---|
| Market size | "How large is X in [year]?" | `[country]・X市場の規模 — [year]年実績と予測` | `[country]・X시장 규모 — [year]년 실적 및 전망` |
| Top players | "Who are the top players in X?" | `[country]・Xの主要事業者 — [year]年` | `[country]・X의 주요 사업자 — [year]년` |
| Drivers | "What's driving X growth?" | `[country]・X市場の成長牽引要因` | `[country]・X시장 성장 견인 요인` |
| Outlook | "What's the outlook for X?" | `[country]・X市場の[year]年以降の見通し` | `[country]・X시장의 [year]년 이후 전망` |

**JA/KO headline rule**: NEVER `？`/`?` ending (per `translator_jp.md` Section 9 anti-pattern). Use compact noun-phrase form. For FAQ JSON-LD `Question` field, restore interrogative form (invisible to readers, indexed by AI Overviews).

## Slug rule

`<industry-lower>-<country-lower>-<slug_key>-<year>` (e.g. `coffee-vietnam-market-size-2026`).

Same slug across all 3 locales — routing via `/<locale>/insights/<slug>` happens at Vercel rewrite layer.

If collision: append `-2`, `-3`.

## AEO/GEO surface

Each Insight body includes (in addition to existing `Article` JSON-LD):

```html
<script type="application/ld+json" id="ld-faq-insight">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "<question form of H2>",
    "acceptedAnswer": {"@type": "Answer", "text": "<first paragraph plain text>"}
  }]
}
</script>
```

Embedded by subagent at top of `body` field. Per locale.

## Cost

- Stage E (extraction): ~1 subagent × ~100K tokens (read 70KB en.html + emit 3 JSON insights)
- Stage J (JA translate): ~1 subagent × ~80K tokens
- Stage K (KO translate): ~1 subagent × ~80K tokens
- 4 fires/day × ~100K avg = **400K tokens/day** ≈ 10% of batch quota.

## Charts as images (deferred to Tier 2)

Current implementation (Tier 1): inline SVG charts copied verbatim from report into insight body. SVG text content is crawlable; sufficient for baseline AEO.

Future (Tier 2): generate PNG hero per insight via reused chromium endpoint, upload to Supabase Storage bucket `insight-heroes/`, use for `og:image` + JSON-LD `image` field. Defer until traffic justifies the chromium cost.

## Failure modes

| What breaks | Recovery |
|---|---|
| en.html missing locally (machine doesn't have the file) | Skip silently, wait for other machine to commit |
| Extraction subagent returns non-JSON | Log raw return, manual review |
| Slug collision | Auto-append `-2` / `-3` |
| Source tag drift in translation | Validation gate fails, status=error, manual re-trigger |
| Partial INSERT (insights succeeded, insight_translations failed) | Manual cleanup: `DELETE FROM insights WHERE slug IN (...)` to reset |

## Verify it's working

- `https://kiraresearch.com/api/insights-list?_t=$(date +%s)` should show new slugs after each EN stage publish
- Same URL with `?locale=ja` should show JA after Stage J
- View source on `/<locale>/insights/<slug>` → check `<script id="ld-faq-insight">` present

## Files involved

- `skills/kira-research-report/prompts/insight_runner.md` — canonical playbook
- `skills/kira-research-report/prompts/question_templates.md` — H2→question mapping per locale
- `supabase/migrations/003_insights.sql` — `insights` + `insight_translations` schema (unchanged)
- 4 scheduled-task SKILL.md files in `C:\Users\DELL\.claude\scheduled-tasks\kira-insight-*\` (machine-local, not committed)

## Per-machine prerequisites

Same env vars as batch (PDF_RENDER_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY). PDF_RENDER_SECRET not strictly used by insight gen but checked for consistency.

## Surface polish shipped 2026-05-27 (commit cc3124c)

Three improvements to the public insights surface, orthogonal to the gen pipeline:

1. **Chart CSS fix in `kira.css`** — inline SVGs in insight bodies use class-based fills (`.bar-primary`, `.bar-secondary`, `.label-data`, `.axis-text`, `.axis-line`) defined only inside the report template's `<style>`. Mirrored those classes into `kira.css` scoped to `.article-body svg`. Without this, all bars/labels defaulted to black fill on insight pages — a serious visual bug found by Henry on `/en/insights/coffee-vietnam-top-players-2026`.

2. **Server-side keyword search** on `/api/insights-list` via new `?q=` param. Two-phase lookup: ILIKE on `insight_translations.title|excerpt` + ILIKE on `insights.slug|country|industry|category`, union IDs, then filter main query. Frontend adds debounced search input to all 3 locale index pages (en/ja/ko) with URL persistence.

3. **Related insights** via new `relatedInsights` field on `/api/insight`. Scoring mirrors library-report's `relatedReports`: same country (+3), same industry (+2), published <90d (+1). `_view.html` renders top 3 in a 3-card grid below the existing related-reports block. SEO/AEO win via internal-link density + dwell time.

All 3 are AEO-adjacent — the chart fix unblocks visual quality of insights that AI Overviews crawl; search aids in-site discovery; related insights compound crawl depth. Compatible with future Phase R companies directory.

See also: [[project_batch_cron_system]] · [[project_tool_gen_report]] · [[reference_kira_research]] · [[project_r_seo_companies_directory]]
