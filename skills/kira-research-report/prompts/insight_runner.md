# insight_runner.md — self-contained prompt for scheduled Insight generation from published reports

Fired by `kira-insight-XXXX` scheduled tasks (4 fires/day @ 07:00 / 11:00 / 15:00 / 21:00 ICT). Each fire is a **fresh Claude session with no memory** of prior conversations.

This prompt picks 1 `living_reports` row and advances its Insight pipeline by 1 stage. Mirrors the multi-stage pattern in `batch_runner.md` (Phase Q.1).

---

## Mission (Phase Q.2 — 2026-05-25)

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
         ELSE 'done'
       END AS next_stage
FROM reports r
LEFT JOIN insight_counts ic ON ic.report_slug = r.slug
WHERE NOT (COALESCE(ic.en_count, 0) >= 3
       AND COALESCE(ic.ja_count, 0) >= 3
       AND COALESCE(ic.ko_count, 0) >= 3)
ORDER BY
  CASE
    WHEN COALESCE(ic.ko_count, 0) > 0 THEN 1  -- nearly-done first (finish them)
    WHEN COALESCE(ic.ja_count, 0) > 0 THEN 2
    WHEN COALESCE(ic.en_count, 0) > 0 THEN 3
    ELSE 4
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

## Step 6: Summary output

```
KIRA insight fire complete.
  Report: <slug> (<country>, <industry>, <year>)
  Stage advanced: <stage_en | stage_ja | stage_ko>
  Insights now: <en_count>/3 EN · <ja_count>/3 JA · <ko_count>/3 KO
  Next pending reports: <count> need stage_en + <count> need stage_ja + <count> need stage_ko
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

## Phase Q.2 changelog (2026-05-25)

- New skill — first version. Mirrors batch_runner.md (Phase Q.1) split pattern.
- Source of truth for stage = row count in `insight_translations` (`< 3 EN` → stage_en; `< 3 JA` → stage_ja; `< 3 KO` → stage_ko). No schema change to the existing insights/insight_translations tables.
- Cadence: 4 fires/day. With ~3-4 reports/day published by batch, queue should drain within 24-36h of report publish.
