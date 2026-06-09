# insight_runner.md — self-contained prompt for scheduled Insight generation from published reports

Fired by `kira-insight-XXXX` scheduled tasks (4 fires/day @ 07:00 / 11:00 / 15:00 / 21:00 ICT). Each fire is a **fresh Claude session with no memory** of prior conversations.

This prompt picks 1 `living_reports` row and advances its Insight pipeline by 1 stage. Mirrors the multi-stage pattern in `batch_runner.md` (Phase Q.1).

---

## Mission (Phase Q.6 — 2026-06-09, updated)

For every published report, produce **4 insights × 3 languages = 12 insight_translations rows** in up to 6 fires:

```
[report published]
  → Fire 1 (Stage E):  extract 3 narrative insights from en.html → 3 EN translations
  → Fire 2 (Stage J):  translate to JA → 3 JA translations
  → Fire 3 (Stage K):  translate to KO → 3 KO translations
  → Fire 4 (Stage T):  generate 4th data-table insight (EN) → 1 EN translation
  → Fire 5 (Stage TJ): translate 4th insight to JA → 1 JA translation
  → Fire 6 (Stage TK): translate 4th insight to KO → 1 KO translation
```

The 4th insight (`slug: <industry>-<country>-key-data-metrics-<year>`) contains 2–3 HTML comparison tables with `class="kira-data-table"` — pure data, no prose — designed for AI engine citation and infographic creation.

---

## Mission (Phase Q.2 — 2026-05-25, original)

For every published report, produce **3 insights × 3 languages = 9 insight_translations rows** in 3 fires:

```
[report published, no insights yet]
  → Fire 1 (Stage E): extract 3 insights from en.html → INSERT 3 insights + 3 EN translations (status=published)
  → Fire 2 (Stage J): translate the 3 insights to JA → INSERT 3 JA translations (status=published)
  → Fire 3 (Stage K): translate the 3 insights to KO → INSERT 3 KO translations (status=published)
```

Why split: same root cause as batch — translation subagent output-cap risk. Each insight body is ~3-5KB (small), but doing 3 insights × 3 langs in one fire = 9 Write calls + 600K+ tokens. Splitting per language keeps each fire <20 min.

Hard cap: 1 report × 1 stage per fire.

---

## Model routing (Phase Q.5 — 2026-05-29)

Insight articles are SEO/AEO marketing content derived from already-published reports — not the sellable report itself. **All spawned `general-purpose` subagents in this pipeline (extraction + JA + KO) run on `model: "sonnet"`** via the `Agent` tool's `model` parameter. The orchestrating cron session runs on the account default (only does validation + SQL + commits — lightweight). Wherever a step says "spawn `general-purpose`", pass `model: "sonnet"`. If the `model` param is unavailable for any reason, proceed on the default model (do NOT fail the fire) and note it in the summary.

---

## Working directory (machine-agnostic)

```bash
# Try git rev-parse first; if cron fired from parent dir it will fail — use fallback.
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$REPO_ROOT" ]; then
  for _CANDIDATE in \
    "$HOME/kira-research" \
    "/home/user/kira-research" \
    "/home/henry/kira-research" \
    "$(pwd)/kira-research" \
    "$(dirname "$(pwd)")/kira-research"; do
    if [ -f "$_CANDIDATE/skills/kira-research-report/SKILL.md" ]; then
      REPO_ROOT="$_CANDIDATE"
      break
    fi
  done
fi
if [ -z "$REPO_ROOT" ]; then
  echo "ERROR: Cannot find repo root. PWD=$PWD. Tried git rev-parse + 5 fallback paths."
  exit 1
fi
cd "$REPO_ROOT"
```

If all paths fail → EXIT with the error above (cron will log it). **Do NOT silently no-op — log the failure so it surfaces in the cron output.**

---

## Step 0: Pre-flight env check

Same as batch_runner — needs `PDF_RENDER_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`. If missing → EXIT `missing env, no-op`. (PDF_RENDER_SECRET not strictly used by Insights; checked anyway for consistency.)

---

## Step 1: Find work — query Supabase

Run via `mcp__763a5dc5-24ea-4c48-8e1b-479961fbeb1d__execute_sql`:

```sql
WITH reports AS (
  SELECT lr.id, lr.slug, lr.country, lr.industry, lr.year, lr.created_at
  FROM living_reports lr
  WHERE lr.status = 'published'
),
insight_counts AS (
  SELECT i.related_report_slugs[1] AS report_slug,
         COUNT(*) FILTER (WHERE it.locale = 'en') AS en_count,
         COUNT(*) FILTER (WHERE it.locale = 'ja') AS ja_count,
         COUNT(*) FILTER (WHERE it.locale = 'ko') AS ko_count
  FROM insights i
  LEFT JOIN insight_translations it ON it.insight_id = i.id AND it.status = 'published'
  WHERE i.status = 'published'
    AND array_length(i.related_report_slugs, 1) > 0
  GROUP BY i.related_report_slugs[1]
)
SELECT r.id, r.slug, r.country, r.industry, r.year,
       COALESCE(ic.en_count, 0) AS en_count,
       COALESCE(ic.ja_count, 0) AS ja_count,
       COALESCE(ic.ko_count, 0) AS ko_count,
       CASE
         WHEN COALESCE(ic.en_count, 0) < 3 THEN 'stage_en'
         WHEN COALESCE(ic.ja_count, 0) < 3 THEN 'stage_ja'
         WHEN COALESCE(ic.ko_count, 0) < 3 THEN 'stage_ko'
         -- Phase Q.6: data-table enrichment stages (4th insight per report)
         WHEN COALESCE(ic.en_count, 0) < 4 THEN 'stage_t'
         WHEN COALESCE(ic.ja_count, 0) < 4 THEN 'stage_tj'
         WHEN COALESCE(ic.ko_count, 0) < 4 THEN 'stage_tk'
         ELSE 'done'
       END AS next_stage
FROM reports r
LEFT JOIN insight_counts ic ON ic.report_slug = r.slug
WHERE NOT (COALESCE(ic.en_count, 0) >= 4
       AND COALESCE(ic.ja_count, 0) >= 4
       AND COALESCE(ic.ko_count, 0) >= 4)
ORDER BY
  CASE
    -- Finish nearly-complete reports first
    WHEN COALESCE(ic.ko_count, 0) >= 3 AND COALESCE(ic.en_count, 0) >= 4 THEN 1  -- stage_tk
    WHEN COALESCE(ic.ja_count, 0) >= 3 AND COALESCE(ic.en_count, 0) >= 4 THEN 2  -- stage_tj
    WHEN COALESCE(ic.ko_count, 0) >= 3 THEN 3  -- stage_t (all 3 langs done, needs 4th)
    WHEN COALESCE(ic.ko_count, 0) > 0 THEN 4   -- stage_ko
    WHEN COALESCE(ic.ja_count, 0) > 0 THEN 5   -- stage_ja
    WHEN COALESCE(ic.en_count, 0) > 0 THEN 6   -- stage_en (continuing)
    ELSE 7
  END,
  r.created_at ASC
LIMIT 1;
```

If 0 rows → output `No insight work in queue` + EXIT.

Pick the single returned row — note `slug`, `country`, `industry`, `year`, `next_stage`.

---

## Step 2: Locate the EN report HTML

The en.html file is the source-of-truth content for extraction. Find it:

```bash
# Convention: report slug "vietnam-coffee-2026" maps to queue id "2026-vn-coffee"
# Reverse-derive: pull country/industry/year from slug, search for matching id in queue.csv
```

Faster path: just scan `skills/kira-research-report/outputs/batch/*/en.html` and grep for `<h1 class="cover-title">` matching the report title in DB (you queried it in Step 1).

Or simpler: read `data/report_queue.csv`, find the row whose `<industry>-<country>-<year>` matches the slug, get the `id` field, then en.html lives at `skills/kira-research-report/outputs/batch/${id}/en.html`.

If en.html doesn't exist locally → EXIT with error log. (Edge case: published report but file was never committed. Means the batch worker on the OTHER machine has it. Skip for now; will be picked up on the machine that has the file.)

---

## Step 3 (Stage E only): extract 3 insights → EN published

### 3.1 — Spawn extraction subagent

Spawn `general-purpose` **with `model: "sonnet"`** (insight pipeline → Sonnet per Model routing) and this prompt (substitute fields):

> Read the KIRA Research EN report at `skills/kira-research-report/outputs/batch/${id}/en.html`.
>
> Extract THE 3 STRONGEST sections that work as standalone Insight articles. Strong = (a) has a specific data point or chart, (b) addresses a question a strategy lead would actually search for, (c) self-contained (doesn't reference earlier sections by number).
>
> For each chosen section, output JSON with this exact shape:
>
> ```json
> {
>   "insights": [
>     {
>       "section_h2": "<original section H2 from en.html>",
>       "question_h2_en": "<convert original H2 to question form per question_templates.md table>",
>       "slug_key": "<short URL-safe phrase, e.g. 'market-size', 'top-players', 'ai-impact'>",
>       "title_en": "<full Insight title, question-form, 60-90 chars, case-sentence>",
>       "excerpt_en": "<280 char teaser for cards>",
>       "lede_en": "<400 char opening paragraph rendered larger>",
>       "body_en": "<HTML body: include the source section's paragraphs verbatim (preserving numbers and source tags in English brackets like [BPS 2024], [Kira estimates]). Convert section sub-H3 to question form too. Include 1 inline chart SVG if the section had one (copy verbatim from en.html). End with a 'Methodology note' paragraph styled per the seed insight pattern.>",
>       "read_time": "<X min read, estimate from word count: ~200 wpm>"
>     },
>     { … insight 2 … },
>     { … insight 3 … }
>   ]
> }
> ```
>
> Rules:
> - Lift body content **verbatim** from en.html — do NOT rewrite. Only the H2 changes (to question form) and the lede may be lightly adapted from the section's first paragraph. Numbers + source tags MUST stay intact.
> - Source tags stay in English brackets: `[Kira estimates]`, `[BPS 2024]`, etc. NEVER translate or strip.
> - Anti-positioning: no Mordor/Frost/Euromonitor/Synovate/Ipsos/IMARC/Claude/McKinsey in any output field.
> - Slug rule: final slug will be `<industry-lower>-<country-lower>-<slug_key>-<year>`. Make `slug_key` 2-4 words, kebab-case.
> - Question H2 templates per `prompts/question_templates.md` Section A.
> - Charts: if you include an SVG, copy the entire `<svg>…</svg>` element verbatim including styles. Do not modify dimensions.
>
> Return ONLY the JSON. No markdown fences, no commentary.

**Hard time cap: 30 minutes** (extraction is faster than full report gen).

### 3.2 — Parent-side validation

1. Parse return as JSON. If fails → failure path with `error_log: extraction subagent returned non-JSON`.
2. Must have exactly 3 insights. If not → failure.
3. For each insight: required fields all non-empty (`question_h2_en`, `slug_key`, `title_en`, `excerpt_en`, `lede_en`, `body_en`, `read_time`).
4. Grep all 3 body_en for forbidden terms (`Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey`). Zero hits required.
5. Char limits: `excerpt_en` ≤ 320 chars, `lede_en` ≤ 500 chars, `title_en` ≤ 100 chars. Warn but don't fail on over.

### 3.3 — Build slugs and check uniqueness

For each insight: `slug = ${industry-lower}-${country-lower}-${slug_key}-${year}` (e.g. `coffee-vietnam-market-size-2026`).

Verify uniqueness in DB:

```sql
SELECT slug FROM insights WHERE slug = ANY($1::text[]);
```

If any slug already exists → append `-2`, `-3` until unique. (Rare edge case; happens if same report regenerates with different section choices.)

### 3.4 — INSERT insights + insight_translations EN (3 + 3 rows, idempotent)

Build and execute SQL via Supabase MCP:

```sql
WITH new_insights AS (
  INSERT INTO insights (slug, category, country, industry, featured, related_report_slugs, status, published_at)
  VALUES
    ($kbat$<slug1>$kbat$, 'data-explainer', $kbat$<country-lower>$kbat$, $kbat$<industry-lower>$kbat$, false, ARRAY[$kbat$<report-slug>$kbat$], 'published', now()),
    ($kbat$<slug2>$kbat$, 'data-explainer', $kbat$<country-lower>$kbat$, $kbat$<industry-lower>$kbat$, false, ARRAY[$kbat$<report-slug>$kbat$], 'published', now()),
    ($kbat$<slug3>$kbat$, 'data-explainer', $kbat$<country-lower>$kbat$, $kbat$<industry-lower>$kbat$, false, ARRAY[$kbat$<report-slug>$kbat$], 'published', now())
  ON CONFLICT (slug) DO UPDATE SET
    updated_at = now(),
    published_at = now(),
    status = 'published',
    related_report_slugs = EXCLUDED.related_report_slugs
  RETURNING id, slug
)
INSERT INTO insight_translations (insight_id, locale, title, excerpt, lede, body, read_time, status, published_at)
SELECT ni.id, 'en', t.title, t.excerpt, t.lede, t.body, t.read_time, 'published', now()
FROM new_insights ni
JOIN (VALUES
  ($kbat$<slug1>$kbat$, $kbat$<title_en_1>$kbat$, $kbat$<excerpt_en_1>$kbat$, $kbat$<lede_en_1>$kbat$, $kbat$<body_en_1>$kbat$, $kbat$<read_time_1>$kbat$),
  ($kbat$<slug2>$kbat$, $kbat$<title_en_2>$kbat$, $kbat$<excerpt_en_2>$kbat$, $kbat$<lede_en_2>$kbat$, $kbat$<body_en_2>$kbat$, $kbat$<read_time_2>$kbat$),
  ($kbat$<slug3>$kbat$, $kbat$<title_en_3>$kbat$, $kbat$<excerpt_en_3>$kbat$, $kbat$<lede_en_3>$kbat$, $kbat$<body_en_3>$kbat$, $kbat$<read_time_3>$kbat$)
) AS t(slug, title, excerpt, lede, body, read_time)
  ON ni.slug = t.slug
ON CONFLICT (insight_id, locale) DO UPDATE SET
  updated_at = now(), published_at = now(),
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, lede = EXCLUDED.lede,
  body = EXCLUDED.body, read_time = EXCLUDED.read_time, status = 'published'
RETURNING insight_id, locale, title;
```

If 0 rows returned → failure path with `error_log: insight INSERT returned 0 rows`.

### 3.5 — Verify + commit memo

```bash
curl -s "https://kiraresearch.com/api/insights-list?_t=$(date +%s)" | grep -o "<slug_key>" | head -1
```

Should return at least 1 match for each slug_key. Soft check; warn but don't fail.

No git commit needed for Stage E (insights live in DB, not files). Just print summary + exit.

---

## Step 4 (Stage J only): translate 3 insights to JA

### 4.1 — Fetch the 3 EN insights to translate

```sql
SELECT i.id, i.slug, it.title, it.excerpt, it.lede, it.body, it.read_time
FROM insights i
JOIN insight_translations it ON it.insight_id = i.id AND it.locale = 'en' AND it.status = 'published'
WHERE i.related_report_slugs && ARRAY[$1]::text[]
  AND NOT EXISTS (
    SELECT 1 FROM insight_translations it2
    WHERE it2.insight_id = i.id AND it2.locale = 'ja' AND it2.status = 'published'
  )
ORDER BY i.slug
LIMIT 3;
```

Where `$1` is the report slug from Step 1. Should return 3 rows. If returns 0 → already done, somehow. If 1 or 2 → partial done; still translate what's there.

### 4.2 — Spawn JA translation subagent (1 call, 3 insights)

Insight bodies are ~3-5KB each, so 3 × 5KB = 15KB total — well within Sonnet output cap. One subagent can do all 3. Spawn it **with `model: "sonnet"`** (per Model routing).

Subagent prompt:

> Translate 3 KIRA Research Insight articles from EN to JP. Follow `prompts/translator_jp.md` for register / vocabulary / source-tag preservation / anti-positioning rules.
>
> Per insight, translate: `title`, `excerpt`, `lede`, `body`, `read_time` (read_time: just translate "min read" → "分で読了").
>
> Question-form titles per `prompts/question_templates.md` Section B (JA register: NO `？` ending, use compact noun-phrase form like `「市場規模」` not `「市場規模はどうか？」`).
>
> Preserve in body: source tags in English brackets (`[Kira estimates]`, `[BPS 2024]` etc.), HTML tags + classes, inline SVG charts verbatim (only translate `<text>` content inside SVG).
>
> Anti-positioning grep before returning: no `Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード`.
>
> Input (3 insights as JSON):
>
> ```json
> [
>   {"slug": "<slug1>", "title": "<en>", "excerpt": "<en>", "lede": "<en>", "body": "<en HTML>", "read_time": "<en>"},
>   {"slug": "<slug2>", …},
>   {"slug": "<slug3>", …}
> ]
> ```
>
> Output: JSON array of 3 objects with same shape, all fields translated to JA. Return ONLY the JSON.

**Hard time cap: 25 minutes.**

### 4.3 — Validation gate

1. Parse return as JSON, must be array of 3.
2. Each must have all 5 translated fields, all non-empty.
3. Source tag superset check: every `[…]` tag present in EN body must also appear in JA body.
4. Anti-positioning grep on all 3 bodies — zero hits for forbidden terms + katakana variants.
5. Title char limit: ≤ 90 chars (JA compresses ~0.7x). Warn but don't fail.

### 4.4 — INSERT 3 JA translations

```sql
INSERT INTO insight_translations (insight_id, locale, title, excerpt, lede, body, read_time, status, published_at)
VALUES
  ((SELECT id FROM insights WHERE slug = $kbat$<slug1>$kbat$), 'ja', $kbat$<title_ja_1>$kbat$, $kbat$<excerpt_ja_1>$kbat$, $kbat$<lede_ja_1>$kbat$, $kbat$<body_ja_1>$kbat$, $kbat$<read_time_ja_1>$kbat$, 'published', now()),
  ((SELECT id FROM insights WHERE slug = $kbat$<slug2>$kbat$), 'ja', ...),
  ((SELECT id FROM insights WHERE slug = $kbat$<slug3>$kbat$), 'ja', ...)
ON CONFLICT (insight_id, locale) DO UPDATE SET
  updated_at = now(), published_at = now(),
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, lede = EXCLUDED.lede,
  body = EXCLUDED.body, read_time = EXCLUDED.read_time, status = 'published'
RETURNING insight_id, locale, title;
```

If 0 rows → failure path.

### 4.5 — Verify + exit

```bash
curl -s "https://kiraresearch.com/api/insights-list?_t=$(date +%s)&locale=ja" | head -c 500
```

Print summary + exit.

---

## Step 5 (Stage K only): translate 3 insights to KO

Exactly mirror Step 4 but with `translator_ko.md` rules + KO question templates from `question_templates.md` Section C. Same chunked approach (1 subagent **with `model: "sonnet"`**, 3 insights).

After successful INSERT → this report's insight pipeline is **fully done** (9 insight_translations rows: 3 insights × 3 locales).

---

---

## Step 3T (Stage T only — Phase Q.6): generate 4th data-table insight (EN)

This stage runs after all 3 core insights are done in all 3 languages (en≥3, ja≥3, ko≥3). It generates ONE additional insight per report whose body is **pure HTML comparison tables** — no narrative prose — designed as source material for infographics and AI citation.

### 3T.1 — Locate en.html (same as Stage E, Step 2)

Use the same en.html lookup logic from Step 2. If not found locally → EXIT `en.html not found, skip stage_t`.

### 3T.2 — Spawn data-table extraction subagent

Spawn `general-purpose` **with `model: "sonnet"`** and this prompt (substitute fields):

> Read the KIRA Research EN report at `skills/kira-research-report/outputs/batch/${id}/en.html`.
>
> Generate ONE new Insight article that is a **pure data compilation** — 2–3 HTML comparison tables covering the report's most citable numbers. This article is specifically designed as infographic source material and for AI engine citation.
>
> **Structure (strict):**
> - `title_en`: "[Industry] [Country] [Year]: Key Market Data and Metrics" — sentence case, 60–90 chars
> - `excerpt_en`: "A data reference covering market size, competitive landscape, and key metrics for [industry] in [country]." (max 280 chars)
> - `lede_en`: 1–2 sentence introduction only. "Key market metrics from Kira Research's [Industry] [Country] [Year] analysis." (max 300 chars)
> - `body_en`: Exactly 2 or 3 HTML `<table class="kira-data-table">` blocks. No prose between tables except a short 1-line `<h3>` header for each table. Each table has `<thead>` and `<tbody>`. After the last table, add one `<p class="data-source"><em>Source: Kira Research analysis, [Country] [Industry] [Year]. See full report for methodology.</em></p>`.
> - `slug_key`: always `"key-data-metrics"`
> - `read_time`: "3 min read"
> - `category`: "data-explainer"
>
> **Table requirements:**
> 1. **Market metrics table** — rows: market size (USD), CAGR %, key volume metric (units/tonnes/users), penetration rate. Columns: metric name | 2023 or 2024 | 2025 | 2026E or 2027E. Use data from the report's market sizing and forecast sections. Source tag every number: `[Kira estimates]` or named source in brackets.
> 2. **Competitive landscape table** — rows: top 3–5 players. Columns: company | est. market share (%) | key strength/segment | headquarters country. If the report has no market share data, use qualitative "Leader / Challenger / Niche" classification.
> 3. *(Optional)* **Regulatory / supply chain table** — only include if the report has ≥3 data points for this (e.g. tariff rates, compliance deadlines, production capacity). Skip if thin.
>
> **Hard rules:**
> - `<table class="kira-data-table">` — this exact class on every table (used by the CSS + infographic pipeline)
> - Every number in a table must have a source tag in its cell: append `<span class="src-tag">[Kira estimates]</span>` or `<span class="src-tag">[Source name]</span>`
> - No Mordor/Frost/Euromonitor/Synovate/Ipsos/IMARC/Claude/McKinsey
> - No section numbers or references to "Section X" — the article must be standalone
> - Do NOT rewrite numbers — lift them verbatim from en.html
>
> Output JSON with this exact shape (no markdown fences):
> ```json
> {
>   "title_en": "...",
>   "excerpt_en": "...",
>   "lede_en": "...",
>   "body_en": "<h3>Market Metrics</h3><table class=\"kira-data-table\">...</table>...",
>   "slug_key": "key-data-metrics",
>   "read_time": "3 min read",
>   "category": "data-explainer"
> }
> ```

**Hard time cap: 20 minutes.**

### 3T.3 — Validation

1. Parse as JSON. Must have all required fields, all non-empty.
2. `body_en` must contain at least 2 `<table class="kira-data-table">` blocks. If only 1 → fail.
3. Check `body_en` contains at least 5 `<span class="src-tag">` (source tags on numbers).
4. Anti-positioning grep: zero hits for forbidden terms.
5. `slug_key` must be `"key-data-metrics"`.

### 3T.4 — Build slug and check uniqueness

`slug = ${industry-lower}-${country-lower}-key-data-metrics-${year}`
e.g. `fintech-vietnam-key-data-metrics-2026`

Check uniqueness:
```sql
SELECT slug FROM insights WHERE slug = $kbat$<slug>$kbat$;
```
If exists → this stage already ran (idempotent). EXIT with `stage_t already done for <report-slug>`.

### 3T.5 — INSERT 4th insight (EN only)

```sql
WITH new_insight AS (
  INSERT INTO insights (slug, category, country, industry, featured, related_report_slugs, status, published_at)
  VALUES (
    $kbat$<slug>$kbat$,
    'data-explainer',
    $kbat$<country-lower>$kbat$,
    $kbat$<industry-lower>$kbat$,
    false,
    ARRAY[$kbat$<report-slug>$kbat$],
    'published',
    now()
  )
  ON CONFLICT (slug) DO UPDATE SET updated_at = now()
  RETURNING id, slug
)
INSERT INTO insight_translations (insight_id, locale, title, excerpt, lede, body, read_time, status, published_at)
SELECT ni.id, 'en',
  $kbat$<title_en>$kbat$,
  $kbat$<excerpt_en>$kbat$,
  $kbat$<lede_en>$kbat$,
  $kbat$<body_en>$kbat$,
  '3 min read',
  'published',
  now()
FROM new_insight ni
ON CONFLICT (insight_id, locale) DO UPDATE SET
  updated_at = now(), published_at = now(),
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt,
  lede = EXCLUDED.lede, body = EXCLUDED.body, status = 'published'
RETURNING insight_id, locale, title;
```

Print summary + exit.

---

## Step 4T (Stage TJ only — Phase Q.6): translate 4th insight to JA

### 4T.1 — Fetch the 4th EN insight

```sql
SELECT i.id, i.slug, it.title, it.excerpt, it.lede, it.body, it.read_time
FROM insights i
JOIN insight_translations it ON it.insight_id = i.id AND it.locale = 'en' AND it.status = 'published'
WHERE i.related_report_slugs && ARRAY[$kbat$<report-slug>$kbat$]::text[]
  AND i.slug LIKE '%-key-data-metrics-%'
  AND NOT EXISTS (
    SELECT 1 FROM insight_translations it2
    WHERE it2.insight_id = i.id AND it2.locale = 'ja' AND it2.status = 'published'
  )
LIMIT 1;
```

If 0 rows → already done. EXIT.

### 4T.2 — Spawn JA translation subagent (with `model: "sonnet"`)

Same translator_jp.md rules as Step 4.2, but **special instruction for data tables:**

> Translate KIRA Research data-table insight from EN to JA.
>
> Special rules for this data-table article:
> - Translate `<h3>` headers and table `<thead>` column labels to JA
> - Translate table `<tbody>` row labels (left column) to JA
> - Keep all numbers, percentages, and year values EXACTLY as-is (do not translate digits)
> - Keep all `<span class="src-tag">[...]</span>` source tags in English brackets — do NOT translate
> - Keep `class="kira-data-table"` and `class="src-tag"` attributes unchanged
> - Translate `title`, `excerpt`, `lede` per translator_jp.md register rules
> - `read_time`: "3分で読了"
>
> Follow `prompts/translator_jp.md` for general register, anti-positioning, and source-tag rules.

### 4T.3 — Validation + INSERT JA

Same validation as Step 4.3. Then INSERT:

```sql
INSERT INTO insight_translations (insight_id, locale, title, excerpt, lede, body, read_time, status, published_at)
VALUES (
  (SELECT id FROM insights WHERE slug = $kbat$<slug>$kbat$),
  'ja',
  $kbat$<title_ja>$kbat$,
  $kbat$<excerpt_ja>$kbat$,
  $kbat$<lede_ja>$kbat$,
  $kbat$<body_ja>$kbat$,
  '3分で読了',
  'published',
  now()
)
ON CONFLICT (insight_id, locale) DO UPDATE SET
  updated_at = now(), published_at = now(),
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt,
  lede = EXCLUDED.lede, body = EXCLUDED.body, status = 'published'
RETURNING insight_id, locale, title;
```

---

## Step 5T (Stage TK only — Phase Q.6): translate 4th insight to KO

Mirror Step 4T exactly but with `translator_ko.md` rules. `read_time` → "3분 읽기".

After successful INSERT → this report's full insight pipeline is **complete** (12 insight_translations rows: 4 insights × 3 locales).

---

## Step 6: Summary output

```
KIRA insight fire complete.
  Report: <slug> (<country>, <industry>, <year>)
  Stage advanced: <stage_en | stage_ja | stage_ko | stage_t | stage_tj | stage_tk>
  Insights now: <en_count>/4 EN · <ja_count>/4 JA · <ko_count>/4 KO
  Next pending reports: <count> need stage_en · <count> stage_ja · <count> stage_ko
                        <count> stage_t · <count> stage_tj · <count> stage_tk
```

Exit. No second report in same fire.

---

## Step 7: Failure path

For Insight gen, "failure" is logical (validation gate failed, subagent timeout, SQL error). Unlike batch_runner there's no queue.csv to update — failures are tracked by NOT INSERT'ing the rows + printing a clear error message.

If a SQL INSERT partially succeeded (e.g. INSERT'd insights rows but failed on insight_translations) → MANUAL CLEANUP needed: delete the orphan insights rows so the next fire's "Find work" query re-picks the report.

Print:

```
KIRA insight fire FAILED.
  Report: <slug>
  Stage attempted: <stage_en | stage_ja | stage_ko>
  Failure: <reason>
  Cleanup needed: <none | DELETE FROM insights WHERE slug IN (...)>
```

Exit non-zero.

---

## Failure-mode reference

| What broke | What to do |
|---|---|
| en.html missing locally | Skip silently — wait for the machine that has it (or commit it from there). Print `en.html not found locally, skipping`. |
| Extraction subagent returns non-JSON | status=error, log raw return for inspection. |
| Extraction returns < 3 insights | Subagent followed the prompt poorly. status=error. |
| Slug collision (rare) | Append `-2`/`-3` to slug. Don't fail. |
| Translation subagent returns < 3 insights | status=error. Manually re-trigger. |
| Stage T: body has < 2 tables | status=error. Subagent didn't follow table instructions. Re-trigger. |
| Stage T: < 5 src-tag spans in body | Warn but don't fail — tables may legitimately have few tagged numbers. |
| Stage T: slug already exists | Idempotent exit — stage_t already completed. Move to stage_tj. |
| Source tag drift (EN tags missing in JA/KO) | status=error with `<lang> source tag drift on <slug>`. |
| SQL INSERT returns 0 rows | status=error. Manual SQL cleanup may be needed. |
| anti-positioning leak | status=error. Manual review of the source en.html — leak likely originated there. |
| Subagent timeout | status=error with `<stage> timeout XXm`. Re-trigger after diagnosing. |

---

## What this prompt is NOT

- Not a place to add new features — keep it stable so cron behavior is predictable
- Not a place for chitchat — every fire is fresh, no human present
- Not a place to ask clarifying questions — log error + exit

---

## Phase Q.6 changelog (2026-06-09)

- **Stage T** added: after all 3 core insights complete (en≥3, ja≥3, ko≥3), generate a 4th insight per report whose body is 2–3 HTML comparison tables with `class="kira-data-table"`. Purpose: AI citation source + infographic raw material. Slug pattern: `<industry>-<country>-key-data-metrics-<year>`.
- **Stage TJ / TK** added: translate 4th data-table insight to JA and KO. Special translator instruction preserves table structure (column headers translated, numbers unchanged, src-tag spans in EN).
- Done condition changed from `en≥3 AND ja≥3 AND ko≥3` → `en≥4 AND ja≥4 AND ko≥4`. Existing reports with 3/3/3 will get the 4th insight on next fire.
- Priority ORDER BY updated: stage_t/tj/tk reports sorted ahead of fresh stage_en reports so enrichment backlogs drain before new extraction starts.
- No schema change. State tracked by counting insight_translations rows per locale.

## Phase Q.2 changelog (2026-05-25)

- New skill — first version. Mirrors batch_runner.md (Phase Q.1) split pattern.
- Source of truth for stage = row count in `insight_translations` (`< 3 EN` → stage_en; `< 3 JA` → stage_ja; `< 3 KO` → stage_ko). No schema change to the existing insights/insight_translations tables.
- Cadence: 4 fires/day. With ~3-4 reports/day published by batch, queue should drain within 24-36h of report publish.
