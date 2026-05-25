# batch_runner.md — self-contained prompt for scheduled batch report generation

Fired by `mcp__scheduled-tasks` crons (currently 13 fires/day, 45-min cadence, in two blocks). Each fire is a **fresh Claude session with no memory** of any prior conversation — everything needed is in this prompt + the files it references.

This prompt is **machine-agnostic**: it derives its working directory from git, so the same prompt runs on any laptop where the repo is cloned (vnc-f4, DELL, future machines).

---

## Mission (Phase Q.1 — 2026-05-25)

**1 fire = 1 stage = 1 row.** Pick the most-advanced row in the queue and advance it ONE stage. Three stages per row before publish:

```
pending → [Fire A: EN gen]    → en_done → [Fire B: JA translate] → ja_done → [Fire C: KO translate + publish] → done
                                                                                                              ↘ error (any fire)
```

Why split: a single fire that did EN + JA + KO + publish was running 60-150 min on heavy topics. JA and KO translation subagents are **output-cap bound** (a 67KB en.html ≈ 18K tokens, sat trên Sonnet's 32K per-response output cap). Splitting per locale + chunking the translation per `.kira-page` (Section 4 + 5 below) makes each fire <30 min and survivable.

Hard cap: **1 row × 1 stage per fire** to stay safely within Sonnet context budget on the Max 5x plan.

---

## Working directory (machine-agnostic)

Derive the repo root every fire:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
```

If `git rev-parse` fails (fire spawned outside a git checkout), EXIT cleanly with `not in a git repo, no-op`. Do not commit anything.

Bash uses forward slashes; for `Read`/`Write` tool calls use the platform-native path (Windows backslashes or POSIX forward slashes).

---

## Step 0: Pre-flight env check

These 3 env vars must be present (set in Windows User scope, mirrored from Vercel project env):

- `PDF_RENDER_SECRET` — `X-Api-Key` header on POST /api/render-pdf
- `SUPABASE_URL` — `https://iygoynbnscednfzdsflc.supabase.co`
- `SUPABASE_SERVICE_KEY` — Bearer token for Supabase Storage + SQL via MCP

If ANY is empty → EXIT CLEANLY with one-line `missing env, no-op`. Do NOT claim any row, do NOT commit. This prevents stuck `in_progress` rows on misconfigured machines.

---

## Step 1: Find work — stage routing

Read `data/report_queue.csv`. Walk it top-down and pick the FIRST row whose status is one of `pending | en_done | ja_done` (in priority order — pick the most-advanced first):

1. If a `ja_done` row exists → branch **Stage C (KO + publish)**
2. Else if an `en_done` row exists → branch **Stage B (JA translate)**
3. Else if a `pending` row exists → branch **Stage A (EN gen)**
4. Else → output `No work in queue` and EXIT cleanly.

**Why most-advanced first**: drains rows toward `done` instead of starting new EN gens while half-done rows sit around. Also gives a natural pipeline — once steady-state, every 3 consecutive fires complete 1 report.

**Status values in queue.csv** (no DB constraint — the CSV is the source of truth; just keep the strings exact):

| status | meaning |
|---|---|
| `pending` | not yet started |
| `en_done` | EN HTML+PDF generated + committed; awaiting JA |
| `ja_done` | JA HTML+PDF generated + committed; awaiting KO + publish |
| `done` | all 3 langs + Supabase published; terminal success |
| `error` | a stage failed; see `error_log`; terminal failure (manual reset to `pending` to retry) |
| `in_progress` | (legacy) treat as `error` and skip — old single-fire-all-stages format |

Extract from the chosen row: `id`, `topic`, `country`, `industry`, `year`, `target_languages`, current `status`.

---

## Step 2: Claim the row (atomic, push immediately)

Update the row in-place — set status to the **next** stage marker that says "I'm working on it":

| Picked status | Set to | Commit message |
|---|---|---|
| `pending` | `en_in_progress` | `batch: claim ${id} for EN gen` |
| `en_done` | `ja_in_progress` | `batch: claim ${id} for JA translate` |
| `ja_done` | `ko_in_progress` | `batch: claim ${id} for KO translate + publish` |

Write CSV back. Commit + push immediately:

```bash
git add data/report_queue.csv
git commit -m "<message above>"
git push origin main
```

If push fails (remote ahead): `git pull --rebase origin main` → re-read CSV (in case someone else claimed) → if our intended row is still in the right pre-claim status, re-write our claim + re-push. Otherwise EXIT (`row claimed elsewhere`).

**Why a separate `*_in_progress` status**: tells other concurrent fires that this row is being worked on; prevents double-claim under the overlap window.

---

## Step 3 (Stage A only): EN gen

Spawn a `general-purpose` subagent with this prompt (substitute `${...}` fields):

> Generate a KIRA Research market analysis report. Load the skill at `skills/kira-research-report/SKILL.md` and follow its standard pipeline: topic_parser → orchestrator → content_per_section → chart_generator → render_and_output. Use UC1 (template) or UC2 (design mode) — whichever the orchestrator selects.
>
> Topic: `${topic}` · Country: `${country}` · Industry: `${industry}` · Year: `${year}`
>
> Write HTML to `skills/kira-research-report/outputs/batch/${id}/en.html`, PDF to `…/en.pdf` (render via `/api/render-pdf` with `PDF_RENDER_SECRET`).
>
> Hard rules (the skill enforces these; mentioning for safety):
> - Never mention `Claude`, `McKinsey`, `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC` in visible copy (also no katakana/hangul transliterations like `クロード`/`클로드`)
> - Never frame KIRA as "AI platform / SaaS / app"
> - All numbers carry source tags: `[Kira estimates]` for KIRA-derived figures, `[<Source Alias>]` for cited externals (full citation in page-bottom source key)
> - Sentence-case headlines
> - **Section gen MUST be sequential** per `content_per_section.md` "Execution pattern" — no parallel sub-subagents per section. Otherwise sections silently drop.
> - **Pre-render validation gate is non-negotiable.** Before any PDF render, assert that every section ID from `section_plan` is present in `generated_sections`. Halt with error if any missing.
> - **Stage 4 dual-language search (Phase M.1 + M.4).** Read `local_language_code`, `local_language_name`, `local_search_priority`, `use_curated_glossary`, `local_language_secondary_code` from topic_parser output. Decision:
>   - `priority == skip` → EN-only
>   - `priority == tier-1` → fire ~8-10 local queries alongside EN baseline
>   - `priority == tier-2` → fire local pass only when EN baseline returns < 6 high-quality sources per HIGH-priority bucket
>   - Merge dedupe-by-URL. Tag any local-source citation with English alias per L.3.
>
> Return: absolute paths to en.html + en.pdf, count of sections planned vs generated (e.g. "14 planned, 14 generated"), count of EN vs local queries fired.

**Hard time cap: 45 minutes** — if the subagent has not returned by then, treat as timeout: jump to failure path (Step 7) with `error_log: EN gen timeout 45m`.

**Parent-side validation (post-return)**:

1. Parse return message for "X planned, Y generated" — if `X != Y` → failure path with `error_log: EN section count mismatch X/Y`
2. `ls -la skills/kira-research-report/outputs/batch/${id}/en.html en.pdf` — both must exist and be non-empty (> 1KB)
3. `grep -E '(Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|클로드)' en.html` — must be zero hits

If all pass → set queue row status to `en_done`, output_paths to (empty for now, populated by Stage C). Commit + push:

```bash
git add data/report_queue.csv skills/kira-research-report/outputs/batch/${id}/en.html
git commit -m "batch: EN done for ${id}"
git push origin main
```

Go to Step 6 (summary) — do NOT proceed to JA in same fire.

---

## Step 4 (Stage B only): JA translate (chunked)

The EN HTML at `skills/kira-research-report/outputs/batch/${id}/en.html` is the input. We split it into pages, translate per-page, and re-assemble. **This avoids the single-Write output-cap that crashed `2026-vn-fintech`.**

### 4.1 — Page split (parent does this, NOT subagent)

Use Read or Bash to count `<div class="kira-page">` occurrences:

```bash
PAGE_COUNT=$(grep -c '<div class="kira-page' skills/kira-research-report/outputs/batch/${id}/en.html)
```

Typical reports have 12-22 pages. Note the count for the validation gate (Step 4.3).

### 4.2 — Chunked translation

Spawn ONE subagent for JA translation. Prompt:

> Translate the KIRA Research EN report at `skills/kira-research-report/outputs/batch/${id}/en.html` to Japanese. Follow `prompts/translator_jp.md` for register / vocabulary / source-tag preservation / anti-positioning rules.
>
> **Chunked output protocol (Phase Q.1 — avoids output overflow on 70KB+ reports):**
>
> 1. Read en.html. Identify the document shell (everything before the first `<div class="kira-page"`) and the document footer (everything after the last `</div>` closing the last kira-page).
> 2. Identify each `<div class="kira-page">…</div>` block. There should be ${PAGE_COUNT} of them.
> 3. Translate the shell `<title>` + any `<meta>` content. Write `ja.html` with: translated shell + opening `<body>` + main wrapper open. **One Write call.**
> 4. For each page block in order: translate it (per translator_jp.md rules), then `Edit` ja.html appending the translated block right before the body-close placeholder marker. **One Edit per page.**
> 5. After the last page, Edit ja.html to remove the placeholder and add the closing wrapper + `</body></html>`.
> 6. Render PDF via POST to `/api/render-pdf` with header `X-Api-Key: $PDF_RENDER_SECRET`, body `{"html": <ja.html content>, "filename": "ja.pdf"}`. Save base64-decoded PDF to `${id}/ja.pdf`.
> 7. Return paths + page count translated + grep result for forbidden terms (`Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|McKinsey`).
>
> Pre-Write each page: confirm no source tag was translated (`[Kira estimates]` must NOT become `[KIRA推計]`; `[BPS 2024]` must NOT become `[インドネシア統計庁 2024]`).

**Hard time cap: 45 minutes.** If subagent has not returned by then → failure path with `error_log: JA translate timeout 45m`. Partial ja.html (if exists) stays on disk for inspection.

### 4.3 — Parent-side validation gate (post-return)

1. `ls -la …/ja.html …/ja.pdf` — both exist + non-empty (> 1KB)
2. `grep -c '<div class="kira-page' ja.html` — must equal `$PAGE_COUNT` from 4.1
3. `grep -E '(Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|클로드)' ja.html` — zero hits
4. `grep -oE '\[[A-Za-z][^]]+\]' ja.html | sort -u` vs same on en.html — JA's set must be a SUPERSET of EN's (translator may add `[出典凡例]` label, must not REMOVE any EN source tag)

If any check fails → failure path. Otherwise:

- Set queue row status to `ja_done`
- Commit + push:

```bash
git add data/report_queue.csv skills/kira-research-report/outputs/batch/${id}/ja.html
git commit -m "batch: JA done for ${id}"
git push origin main
```

Go to Step 6 — do NOT proceed to KO in same fire.

---

## Step 5 (Stage C only): KO translate + auto-publish

### 5.1 — KO chunked translation

Exactly mirror Step 4 but use `translator_ko.md` rules. Subagent prompt is identical to 4.2 except substituting `ja`→`ko` everywhere AND `translator_jp.md` → `translator_ko.md`. Same chunked protocol. Same time cap.

### 5.2 — KO validation gate (same as 4.3 with ja→ko)

If passes, proceed to publish. Do NOT commit yet — publish in same fire.

### 5.3 — Auto-publish to Supabase

This is the original Step 6a/6b/6c/6d from pre-Q.1 — unchanged. Reproduced here for self-containment.

**5.3a — INSERT living_reports + 3 report_translations rows.**

Build the SQL via a per-topic Node script. Reference template: `skills/kira-research-report/scripts/_build_vn_coffee_sql.mjs` — copy to `_build_<id>_sql.mjs` and fill constants + META blocks. Key fields per locale, extracted from each language's HTML:

- `title` ← `<h1 class="cover-title">` text per locale's HTML
- `eyebrow` ← `<p class="cover-eyebrow">` (or rebuild `<COUNTRY UPPER> · <INDUSTRY UPPER> · MARKET ANALYSIS` translated per locale)
- `preview` JSONB: `lede` (~400 chars), `paragraphs` (2 × ~300 chars), `chart` (`{title, subtitle, bars[{pct,label,value}]}` from exec-chart page 4)
- `toc` JSONB array from `.toc-col li` elements

**Slug rule**: `slug = <industry-lower>-<country-full-english>-<year>` (e.g. queue `id=2026-vn-coffee` → `slug=vietnam-coffee-2026`). Country is full English name, not ISO code.

**Pages**: count `.kira-page` divs in EN HTML (already known from Step 4.1 / 5.1).

**`pdf_url` is computed INSIDE the SQL** as `new_report.id::text || '/' || t.locale || '.pdf'` (Supabase Storage path). NEVER emit a GitHub raw URL.

Use dollar-quoted SQL literals (`$kbat$...$kbat$`) for strings with apostrophes/accents/JSON. Execute via Supabase MCP:

```
mcp__763a5dc5-24ea-4c48-8e1b-479961fbeb1d__execute_sql
  project_id: iygoynbnscednfzdsflc
  query: <generated SQL>
```

SQL pattern (CTE + cross-join VALUES, idempotent UPSERT on both tables, returns `report_id`):

```sql
WITH new_report AS (
  INSERT INTO living_reports (slug, country, industry, year, pages, price, currency, status, published_at)
  VALUES ($kbat$<slug>$kbat$, $kbat$<country>$kbat$, $kbat$<industry>$kbat$, <year>, <pages>, 39, 'USD', 'published', now())
  ON CONFLICT (slug) DO UPDATE SET
    updated_at = now(), published_at = now(), pages = EXCLUDED.pages, status = 'published'
  RETURNING id
)
INSERT INTO report_translations (report_id, locale, title, eyebrow, preview, toc, pdf_url, status, published_at)
SELECT new_report.id, t.locale, t.title, t.eyebrow, t.preview::jsonb, t.toc::jsonb,
       new_report.id::text || '/' || t.locale || '.pdf',
       'published', now()
FROM new_report
CROSS JOIN (VALUES ('en', ...), ('ja', ...), ('ko', ...)) AS t(locale, title, eyebrow, preview, toc)
ON CONFLICT (report_id, locale) DO UPDATE SET
  title = EXCLUDED.title, eyebrow = EXCLUDED.eyebrow,
  preview = EXCLUDED.preview, toc = EXCLUDED.toc,
  pdf_url = EXCLUDED.pdf_url, status = 'published', published_at = now()
RETURNING report_id, locale, title;
```

Capture the `report_id` UUID — needed for 5.3b.

**5.3b — Upload 3 PDFs to Supabase Storage bucket `reports-pdfs`.**

Path: `<report_id>/<locale>.pdf`. Use helper:

```bash
for loc in en ja ko; do
  node skills/kira-research-report/scripts/upload-pdf.mjs \
    "skills/kira-research-report/outputs/batch/${id}/${loc}.pdf" \
    "${REPORT_ID}" \
    "${loc}"
done
```

Expects HTTP 200 + `{"Key": "reports-pdfs/<report_id>/<locale>.pdf", "Id": "<uuid>"}`. Any non-200 → bail to failure path.

**5.3c — Verify (2 cache-busted curls):**

1. `curl https://kiraresearch.com/api/library-list?_t=$(date +%s)` — `items[]` contains the new slug
2. `for loc in en ja ko; do curl -o /dev/null -w '%{http_code}\n' "https://kiraresearch.com/$loc/reports/<slug>"; done` — all 200

**5.3d — Finalize queue row + commit + push.**

- status → `done`
- output_paths → `reports-pdfs/<report_id>/en.pdf|reports-pdfs/<report_id>/ja.pdf|reports-pdfs/<report_id>/ko.pdf`
- date_completed → today (YYYY-MM-DD)
- error_log → empty

```bash
git add data/report_queue.csv skills/kira-research-report/outputs/batch/${id}/
git commit -m "batch: complete ${id} (EN+JA+KO, published)"
git push origin main
```

`.gitignore` excludes `outputs/batch/*/*.pdf` so PDFs stay out of the public repo (Supabase Storage is canonical for PDFs).

---

## Step 6: Summary output (success path)

```
KIRA batch fire complete.
  ID: ${id}
  Stage advanced: <pending→en_done | en_done→ja_done | ja_done→done>
  Topic: ${topic}
  Status now: <en_done | ja_done | done>
  Next pending: ${count} pending + ${count} en_done + ${count} ja_done in queue
```

Then exit. Do not start a second stage in the same fire — that's by design.

---

## Step 7: Failure path (any subagent errored or validation failed)

Update queue row:
- status → `error`
- output_paths → any PDFs that DID get generated (partial)
- date_completed → today's ISO date
- error_log → one-line summary including the stage (`EN gen timeout 45m` / `JA section count 15/22` / `KO render-pdf 500` / etc.)

```bash
git add data/report_queue.csv skills/kira-research-report/outputs/batch/${id}/
git commit -m "batch: error on ${id} stage <A|B|C> — see error_log"
git push origin main
```

Print 1-line error summary + exit.

---

## Failure-mode reference

| What broke | What to do |
|---|---|
| Push rejected (remote ahead) | `git pull --rebase origin main` then re-push. If conflict on `data/report_queue.csv`, prefer the version where status is further along. |
| `/api/render-pdf` returns 500 | Vercel function timeout / chromium boot issue. Save HTML, set status=error, record HTTP code. Don't retry in same fire. |
| `/api/render-pdf` returns 401 | PDF_RENDER_SECRET missing or wrong. Set status=error with `render-pdf 401 (check env)`. |
| Skill fails at orchestrator (no blueprint match) | Topic is malformed. status=error with `no route from orchestrator`. |
| Translator overflows page char cap | Per translator_jp/ko.md, trim カタカナ padding + adverbs; if still over, drop a `<strong>` not a number/source tag. Validation gate doesn't enforce char caps — that's the translator's job. |
| Anti-positioning leak found | Validation gate in Step 4.3/5.2 catches this — sets status=error, flag for manual review. |
| EN section count mismatch | Set status=error with `EN section count <Y>/<X>`. Do NOT advance to JA. PDF (if any) stays on disk for inspection. |
| JA/KO page count mismatch | Means subagent dropped pages mid-translation (output cap hit). Set status=error with `<lang> page count <Y>/<X>`. Manually re-run after chunking fix. |
| JA/KO source tag set is not superset of EN | Translator localized a tag (e.g. `[BPS 2024]` → `[インドネシア統計庁 2024]`). status=error with `<lang> source tag drift`. |
| Timeout 45m on any stage | Subagent likely hung on API call. status=error with `<stage> timeout 45m`. |
| Stage B picked but en.html missing | Edge case (someone deleted file). status=error with `en.html missing for ja stage`. |

---

## What this prompt is NOT

- Not a place to add new features — keep it stable so cron behavior is predictable
- Not a place for chitchat — every fire is a fresh session, NO human is present
- Not a place to ask clarifying questions — if the row is malformed, set status=error + exit

---

## When run manually for testing

If Henry clicks "Run now" on a task or runs this prompt manually outside the cron, behavior is identical. To force a single row through all 3 stages back-to-back for testing, click "Run now" on the relevant task 3 times in a row (each fire advances 1 stage as long as it picks the same row).

---

## Phase Q.1 changelog (2026-05-25)

- **Split single-fire-all-stages into 3 fires** (pending→en_done→ja_done→done). Root cause: `2026-vn-fintech` hung 2h24m at JA translate — single subagent tried to Write 70KB ja.html in one call, exceeded Sonnet output cap, returned partial or hung.
- **Chunked translation per `.kira-page`** in Step 4/5 — each page is a separate Edit call, no single Write exceeds ~5-7KB.
- **Validation gates added**: page count match, source tag superset, anti-positioning grep with katakana/hangul variants.
- **Machine-agnostic path**: `git rev-parse --show-toplevel` instead of hardcoded `C:\Users\vnc-f4\…`. Same prompt now runs on any machine.
- **Watchdog**: hard 45-min per-stage timeout; partial output stays for inspection.
- **Status enum extended** in queue.csv: added `en_done`, `ja_done`, `en_in_progress`, `ja_in_progress`, `ko_in_progress`. Old `in_progress` rows treated as error.
- **Legacy single-fire format**: if you encounter an `in_progress` row from before this phase, treat as error and skip.
