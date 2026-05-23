# batch_runner.md — self-contained prompt for scheduled batch report generation

This prompt is fired by the daily 4-fire cron (1am / 5am / 12:15pm / 5pm ICT) configured via `mcp__scheduled-tasks`. Each fire starts a **fresh Claude session with no memory** of any prior conversation. Everything you need is in this prompt + the files it references.

---

## Mission

Pick **1** pending row from `data/report_queue.csv`, generate a full KIRA market research report in 3 languages (EN → JA → KO), save outputs to `skills/kira-research-report/outputs/batch/<id>/`, update the queue, and commit.

Hard cap: **1 topic per fire** to stay safely within Sonnet context budget on the Max 5x plan.

---

## Working directory

Repository root: `C:\Users\vnc-f4\Rira Research\kira-research` (use forward slashes in bash, e.g. `/c/Users/vnc-f4/Rira Research/kira-research`).

All paths in this prompt are relative to that root unless absolute.

---

## Step 1: Find work

Read `data/report_queue.csv`. Find the FIRST row with `status=pending` (top-down).

- If no pending row → output a one-line "No pending work in queue" message and EXIT cleanly. Do not commit anything. Do not error.
- If there is a pending row → proceed.

Extract these fields from the row:
- `id` — output folder name
- `topic` — the topic string to pass to the skill
- `country`, `industry`, `year` — metadata
- `target_languages` — should be `en,ja,ko` for standard runs

---

## Step 2: Claim the row

Update the row in-place:
- `status` → `in_progress`
- Keep all other fields

Write the modified CSV back. Then commit immediately:

```bash
git add data/report_queue.csv
git commit -m "batch: claim ${id} for in_progress"
git push origin main
```

This claim-then-commit pattern prevents a second cron fire (if one overlaps) from double-claiming the same row. If push fails due to remote ahead, run `git pull --rebase origin main` then re-push.

---

## Step 3: Generate EN report

Spawn a general-purpose subagent for the EN gen (keeps the parent context lean). Subagent prompt template:

> Generate a KIRA Research market analysis report. Load the skill at `skills/kira-research-report/SKILL.md` and follow its standard pipeline: topic_parser → orchestrator → content_per_section → chart_generator → render_and_output. Use UC1 (template) or UC2 (design mode) routing — whichever the orchestrator selects.
>
> Topic: `${topic}`
> Country: `${country}` · Industry: `${industry}` · Year: `${year}`
>
> Write the final HTML to `skills/kira-research-report/outputs/batch/${id}/en.html` and the rendered PDF to `skills/kira-research-report/outputs/batch/${id}/en.pdf`. Render via the `/api/render-pdf` endpoint (PDF_RENDER_SECRET is in Vercel env).
>
> Hard rules (the skill enforces these; mentioning explicitly for safety):
> - Never mention `Claude`, `McKinsey`, `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC` in visible copy
> - Never frame KIRA as "AI platform / SaaS / app"
> - All numbers must carry source tags: `[Kira estimates]` for KIRA-derived figures, `[<Source Alias>]` for cited externals (full citation in the page-bottom source key)
> - Sentence-case headlines
> - **Section gen MUST be sequential per `content_per_section.md` "Execution pattern" section — no parallel sub-subagents per section.** Otherwise sections silently drop.
> - **Pre-render validation gate is non-negotiable.** Before any PDF render, assert that every section ID from `section_plan` is present in `generated_sections`. Halt with error if any missing.
>
> Return the absolute paths to the generated en.html and en.pdf, AND the count of sections planned vs generated (e.g. "14 planned, 14 generated — gate passed").

If the subagent fails (returns error or no PDF) → jump to Step 6 with error.

**Section-count guard (parent-side double-check):** After the EN subagent returns, parse its return message for the "X planned, Y generated" line. If `X != Y`, treat the run as failed — set status=error with `error_log: section count mismatch (X planned / Y generated) — see <id>/en.html`. Do not proceed to JA/KO translation if EN is incomplete (translating a broken report wastes 2 more subagent runs).

---

## Step 4: Translate to JA

Spawn a separate general-purpose subagent for JA translation. Subagent prompt:

> Translate the KIRA Research EN report at `skills/kira-research-report/outputs/batch/${id}/en.html` to Japanese. Follow the canonical JP translation guide at `skills/kira-research-report/prompts/translator_jp.md` — register, vocabulary, character caps, source-tag preservation, anti-positioning, all defined there.
>
> Read en.html, translate every translatable text node (skip SVG geometry, class names, IDs, source tags `[primary]` etc.), write the result to `skills/kira-research-report/outputs/batch/${id}/ja.html`.
>
> After writing ja.html, render PDF via the same `/api/render-pdf` endpoint as the EN render. PDF path: `skills/kira-research-report/outputs/batch/${id}/ja.pdf`.
>
> Verify: no `Mordor` / `Frost` / `Euromonitor` / `Synovate` / `Ipsos` / `IMARC` / `Claude` / `McKinsey` in the JA HTML (grep). Return absolute paths.

If subagent fails → jump to Step 6 with error.

---

## Step 5: Translate to KO

Spawn a separate general-purpose subagent for KO translation. Subagent prompt:

> Translate the KIRA Research EN report at `skills/kira-research-report/outputs/batch/${id}/en.html` to Korean. Follow the canonical KO translation guide at `skills/kira-research-report/prompts/translator_ko.md` — register (합쇼체), vocabulary, character caps, source-tag preservation, anti-positioning, all defined there.
>
> Read en.html, translate every translatable text node (skip SVG geometry, class names, IDs, source tags `[primary]` etc.), write the result to `skills/kira-research-report/outputs/batch/${id}/ko.html`.
>
> After writing ko.html, render PDF via the same `/api/render-pdf` endpoint. PDF path: `skills/kira-research-report/outputs/batch/${id}/ko.pdf`.
>
> Verify: no forbidden firm names or `Claude` / `McKinsey` in the KO HTML. Return absolute paths.

If subagent fails → jump to Step 6 with error.

---

## Step 6: Auto-publish to Supabase + commit

### Success path (all 3 PDFs generated)

**Step 6a — Insert living_reports + 3 report_translations rows, status=published.**

Owner policy (2026-05-23): batch fires auto-publish on success. The pipeline runs sequentially per section, so any failure aborts the whole report — a successful fire means all sections passed gen + render + anti-positioning grep. If a published report later proves wrong, delete + regen rather than gating on human review.

Build the SQL via a Node script (see `skills/kira-research-report/scripts/_build_vn_coffee_sql.mjs` for the template — copy + adapt per-topic). Key fields per locale:
- `title` — extract from `<h1 class="cover-title">` text in each language's HTML
- `eyebrow` — `<COUNTRY UPPER> · <INDUSTRY UPPER> · MARKET ANALYSIS` pattern (translate per locale)
- `preview` JSONB:
  - `lede` — 1-paragraph summary, ~400 chars, based on cover-subtitle + exec p1 intro
  - `paragraphs` — 2 paragraphs (~300 chars each) summarizing scope + AI section
  - `chart` — `{title, subtitle, bars[{pct, label, value}]}` derived from the exec-chart on page 4 (single bar series, pct relative to max)
- `toc` JSONB array of 12 entries — extract from the `.toc-col li` elements
- `pdf_url` — **GitHub raw URL pattern**: `https://raw.githubusercontent.com/henryvn2004-arch/kira-research/main/skills/kira-research-report/outputs/batch/<id>/<locale>.pdf`. The `library-content.js` `resolvePdfUrl()` passes external URLs straight through. (TODO: replace with Supabase Storage upload when `SUPABASE_SERVICE_KEY` is set on the batch machine — requires anonymous service key, which currently lives only in Vercel env.)

Use dollar-quoted SQL literals (`$kbat$...$kbat$`) for all strings carrying apostrophes, accents, or JSON braces (see `[[feedback_seed_strings_dollar_quoted]]`). Execute via Supabase MCP:

```
mcp__763a5dc5-24ea-4c48-8e1b-479961fbeb1d__execute_sql
  project_id: iygoynbnscednfzdsflc
  query: <generated SQL>
```

SQL pattern (CTE + cross-join values, idempotent on slug):

```sql
WITH new_report AS (
  INSERT INTO living_reports (slug, country, industry, year, pages, price, currency, status, published_at)
  VALUES ($kbat$<slug>$kbat$, $kbat$<country>$kbat$, $kbat$<industry>$kbat$, <year>, <pages>, 39, 'USD', 'published', now())
  ON CONFLICT (slug) DO UPDATE SET updated_at = now()
  RETURNING id
)
INSERT INTO report_translations (report_id, locale, title, eyebrow, preview, toc, pdf_url, status, published_at)
SELECT new_report.id, t.locale, t.title, t.eyebrow, t.preview::jsonb, t.toc::jsonb, t.pdf_url, 'published', now()
FROM new_report
CROSS JOIN (VALUES
  ('en', ...), ('ja', ...), ('ko', ...)
) AS t(locale, title, eyebrow, preview, toc, pdf_url)
ON CONFLICT DO NOTHING
RETURNING report_id, locale, title;
```

Verify with two cache-busted curls:
1. `curl https://kiraresearch.com/api/library-list?_t=$(date +%s)` — `items[]` should contain the new slug with correct title/excerpt
2. `for loc in en ja ko; do curl -o /dev/null -w '%{http_code}\n' "https://kiraresearch.com/$loc/reports/<slug>"; done` — all three return 200

**Step 6b — Update queue + commit + push.**

Update the queue row:
- `status` → `done`
- `output_paths` → `skills/kira-research-report/outputs/batch/<id>/en.pdf|skills/kira-research-report/outputs/batch/<id>/ja.pdf|skills/kira-research-report/outputs/batch/<id>/ko.pdf`
- `date_completed` → today's ISO date (YYYY-MM-DD)
- `error_log` → empty

Commit + push:

```bash
git add data/report_queue.csv skills/kira-research-report/outputs/batch/${id}/
git commit -m "batch: complete ${id} (EN+JA+KO, published)"
git push origin main
```

The git commit must happen AFTER Step 6a's SQL insert succeeds. If the SQL insert fails, jump to the failure path — queue stays at in_progress + no orphan public page exists.

### Failure path (any subagent errored)

Update the row:
- `status` → `error`
- `output_paths` → any PDFs that DID get generated (partial)
- `date_completed` → today's ISO date
- `error_log` → one-line summary (e.g., `JA translation overflow, ko skipped` or `EN render-pdf returned HTTP 500`)

Commit + push:

```bash
git add data/report_queue.csv skills/kira-research-report/outputs/batch/${id}/
git commit -m "batch: error on ${id} — see queue.csv error_log"
git push origin main
```

---

## Step 7: Summary output

Print a one-screen summary for telemetry/notification:

```
KIRA batch fire complete.
  ID: ${id}
  Status: done | error
  Topic: ${topic}
  Outputs: 3 PDFs (or partial count)
  Next pending in queue: ${count} rows
```

Then exit. Do not start a second row in the same fire — that's by design (1 topic / fire ceiling).

---

## Failure-mode reference

| What broke | What to do |
|---|---|
| Push rejected (remote ahead) | `git pull --rebase origin main` then re-push. If a conflict on `data/report_queue.csv`, prefer the version where status was further along (in_progress > pending; done > in_progress). |
| `/api/render-pdf` returns 500 | Likely Vercel function timeout or chromium boot issue. Save HTML, set status=error, record the HTTP code in error_log. Don't retry within this fire. |
| `/api/render-pdf` returns 401 | PDF_RENDER_SECRET env var missing or wrong. Set status=error with `error_log: render-pdf 401 (check env var)`. Notify Henry to fix. |
| Skill fails at orchestrator (no blueprint match, no design mode trigger) | The topic is malformed — set status=error with `error_log: no route from orchestrator (topic ambiguity)`. |
| Translation subagent overflows char caps on JA or KO | Translator subagent should retry with -15% compression (per the EN skill's overflow handling). If 3 retries still overflow, deliver what you have, log the overflow page count in error_log, set status=done (partial). |
| Anti-positioning leak found in any language | Subagent should regex-sweep before returning. If a leak slips through to commit, set status=error and flag for manual review. |
| Section count mismatch (EN subagent returns fewer sections than planned) | The EN gen partially dropped sections (root cause: fired sub-subagents in parallel instead of sequential). Set status=error with `error_log: section count <Y>/<X> — fix sequential gen in content_per_section.md`. Do NOT translate. PDF (if any) is broken — leave it in outputs for inspection. |

---

## What this prompt is NOT

- Not a place to add new features — keep it stable so the cron behavior is predictable
- Not a place for chitchat or "let me think out loud" — every fire is a fresh session, the user (Henry) is NOT in this conversation
- Not a place to ask clarifying questions — there is no human to answer. If the queue row is malformed, set status=error with details and exit.

---

## When this is run manually for testing

If Henry runs this prompt manually outside the cron (Step 5 of the batch system build), the behavior is identical — pick 1 pending row, gen 3 langs, update queue, commit. The only difference is Henry is watching; he may interrupt if he sees something wrong.
