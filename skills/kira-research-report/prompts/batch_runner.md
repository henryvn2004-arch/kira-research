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

Why split: a single fire that did EN + JA + KO + publish was running 60-150 min on heavy topics. JA and KO translation subagents are **output-cap bound** (a 67KB en.html ≈ 18K tokens, sat trên Sonnet's 32K per-response output cap). Splitting per locale + chunking the translation per top-level `<div class="page">` (Section 4 + 5 below) makes each fire <30 min and survivable.

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

**Use Node for the check, NOT bash `${VAR:+SET}` expansion** — bash variable expansion triggers Claude Code's "Contains expansion" permission prompt every fire even when `Bash(node *)` and `Bash(cd *)` are pre-approved. Node reads `process.env` directly without shell expansion, so the command stays in the auto-approved allowlist.

```bash
node -e "['PDF_RENDER_SECRET','SUPABASE_URL','SUPABASE_SERVICE_KEY'].forEach(k=>{const v=process.env[k];console.log(k+'='+(v&&v.length?'SET':'MISSING'))})"
```

If ANY prints `MISSING` → EXIT CLEANLY with one-line `missing env, no-op`. Do NOT claim any row, do NOT commit. This prevents stuck `in_progress` rows on misconfigured machines.

---

## Step 0.5: Auto-recover stale claims (Phase Q.4 — 2026-05-28)

Cron fires sometimes die AFTER committing the claim but BEFORE producing
output (Claude session crash, machine sleep, network reset, sub-agent
hang past timeout, anti-positioning retry-loop hard-stop). The status
stays `*_in_progress` forever, silently stalling the queue. Pre-Q.4 the
only recovery was manual.

This step runs BEFORE stage routing every fire, so the next available
fire automatically reclaims any orphaned slug.

### How it works

`scripts/audit-queue.mjs` scans `data/report_queue.csv` for rows where
`status` ends in `_in_progress` AND `claimed_at` is empty OR older than
**90 minutes** ago (2× the 45-min hard stage timeout — wide margin to
never kill a legitimately-running stage).

For each stale row:

- **Strike-1** (error_log does NOT contain `auto-recovered`): revert
  status to the prior stage, clear `claimed_at`, append
  `auto-recovered <iso>` to `error_log`.
  - `en_in_progress` → `pending`
  - `ja_in_progress` → `en_done`
  - `ko_in_progress` → `ja_done`
- **Strike-2** (already auto-recovered once and got stuck again): real
  bug, do NOT auto-recover again. Set status = `error`, append
  `second-strike auto-recover skipped` to error_log for manual review.

The script is **idempotent**: if nothing is stale, the CSV is not
touched on disk (script prints `recovered=0` and exits; the caller's
`git status` will show no diff). It also migrates the schema (adds
`claimed_at` column) on first run.

### Call from the fire

```bash
RECOVERED=$(node skills/kira-research-report/scripts/audit-queue.mjs | awk -F= '/^recovered=/{print $2}')
if [ "${RECOVERED:-0}" -gt 0 ]; then
  git add data/report_queue.csv
  git commit -m "batch: auto-recover ${RECOVERED} stale claim(s)"
  git pull --rebase origin main 2>/dev/null || true
  git push origin main
fi
```

If push fails (remote ahead even after rebase), EXIT with
`recovery commit collided, no-op` — next fire will retry the audit
fresh. Do NOT proceed to Step 1 with un-pushed recovery state.

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
| `en_in_progress` | a fire is generating EN (or claimed and died — see `claimed_at`) |
| `en_done` | EN HTML+PDF generated + committed; awaiting JA |
| `ja_in_progress` | a fire is translating JA (or claimed and died) |
| `ja_done` | JA HTML+PDF generated + committed; awaiting KO + publish |
| `ko_in_progress` | a fire is translating KO + publishing (or claimed and died) |
| `done` | all 3 langs + Supabase published; terminal success |
| `error` | a stage failed (or strike-2 auto-recovery escalated); see `error_log`; terminal failure (manual reset to `pending` / `en_done` / `ja_done` to retry) |
| `in_progress` | (legacy) treat as `error` and skip — old single-fire-all-stages format |

**Companion column `claimed_at`** (Phase Q.4): ISO 8601 UTC timestamp set
at claim time, cleared on success / failure / auto-recovery. If a row
has `*_in_progress` status with a `claimed_at` more than 90 minutes ago
(or empty), Step 0.5 of the next fire automatically reverts it.

Extract from the chosen row: `id`, `topic`, `country`, `industry`, `year`, `target_languages`, current `status`.

---

## Step 2: Claim the row (atomic, push immediately)

Update the row in-place — set TWO fields:

1. `status` → next stage marker (`I'm working on it`):

   | Picked status | Set to | Commit message |
   |---|---|---|
   | `pending` | `en_in_progress` | `batch: claim ${id} for EN gen` |
   | `en_done` | `ja_in_progress` | `batch: claim ${id} for JA translate` |
   | `ja_done` | `ko_in_progress` | `batch: claim ${id} for KO translate + publish` |

2. `claimed_at` → current UTC ISO 8601 timestamp. Compute with:

   ```bash
   CLAIMED_AT=$(node -e "process.stdout.write(new Date().toISOString())")
   ```

   This timestamp is what Step 0.5 of the NEXT fire uses to detect a
   stale claim if this fire dies mid-stage. Always quote when written
   to CSV (ISO timestamps contain `:`).

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

**Step 3 retry path** (anti-positioning leaks specifically — not the other failures): if grep returns hits, do NOT immediately fail. Instead, spawn one more `general-purpose` subagent fire with this prompt:

> The EN HTML at `skills/kira-research-report/outputs/batch/${id}/en.html` contains a forbidden competitor reference. Offending matches:
> ```
> ${grep output, file:line:match}
> ```
> Rewrite the file **in place**, replacing every flagged citation with either the underlying primary source (gov stats, operator filings, industry association the competitor itself synthesized from) or `[Kira estimates]`. See `prompts/voice_guide.md` § "Forbidden (anti-positioning)" for the worked examples. Do NOT regenerate other sections. Do NOT re-render the PDF (parent will do that). Return when grep is clean.

After the retry returns, re-run grep. If still dirty → failure path with `error_log: EN gen anti-positioning leak persisted after retry: ${first match}`. If clean → re-render the PDF via `node skills/kira-research-report/scripts/render-one.mjs <html> <pdf>` and proceed to commit. Only one retry — second leak means manual review.

If all pass → set queue row status to `en_done`, **clear `claimed_at`** (this fire succeeded; Step 0.5 should never see this row as stale), leave `output_paths` empty (populated by Stage C). Commit + push:

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

Top-level page containers in the rendered HTML use **`class="page"` or `class="page cover-page"`** (not `kira-page` — that was the planned class name; actual render uses `page`). Inner divs (`page-inner`, `page-header`, `page-footer`, `page-h1`, `page-section-tag`, etc.) are NOT page boundaries — they live inside each page.

Count top-level page containers via the Grep tool with this regex (matches `page"` or `page ` but excludes `page-`):

```
pattern: <div class="page[" ]
```

Equivalent shell (use Bash, NOT PowerShell — the `[" ]` character class trips PS):

```bash
PAGE_COUNT=$(grep -cE '<div class="page[" ]' skills/kira-research-report/outputs/batch/${id}/en.html)
```

Typical reports have 12-30 pages (cover + methodology + contents + exec + sections + dividers + endnote). Note the count for the validation gate (Step 4.3). If the count is < 8 or > 40, something is wrong — bail to failure path with `unexpected page count <N>`.

### 4.2 — Chunked translation

Spawn ONE subagent for JA translation. Prompt:

> Translate the KIRA Research EN report at `skills/kira-research-report/outputs/batch/${id}/en.html` to Japanese. Follow `prompts/translator_jp.md` for register / vocabulary / source-tag preservation / anti-positioning rules.
>
> **Top-level page containers use `<div class="page">` and `<div class="page cover-page">`.** Subdivs (`page-inner`, `page-header`, `page-footer`, `page-h1`, `page-section-tag`, etc.) are NOT page boundaries — they live inside each page. Match the regex `<div class="page[" ]` to find tops; excludes `page-*` subdivs. Confirmed top-level count for this report: **${PAGE_COUNT}**.
>
> **Chunked output protocol (Phase Q.1 — avoids output overflow on 70KB+ reports):**
>
> 1. Read en.html. Identify the document shell = everything before the FIRST top-level `<div class="page` (with closing quote or space after — NOT `<div class="page-`). Identify the document footer = everything after the LAST top-level `</div>` closing the last page.
> 2. Identify each top-level `<div class="page...">…</div>` block. There should be ${PAGE_COUNT} of them.
> 3. Translate the shell `<title>` + `<meta>` content (description, og:title; anti-positioning applies to meta as well). Write `ja.html` with: translated shell (through `<body>` + any pre-page wrappers) + placeholder marker `<!-- KIRA_PAGES_INSERT_HERE -->` + closing `</body></html>`. **One Write call.**
> 4. For each top-level page block in order: translate it (per translator_jp.md rules), then `Edit` ja.html replacing the placeholder with: translated_page + new placeholder. **One Edit per page.**
> 5. After the last page, Edit ja.html to remove the placeholder entirely.
> 6. Render PDF via POST to `https://kiraresearch.com/api/render-pdf` with header `X-Api-Key: $PDF_RENDER_SECRET`, body `{"html": <ja.html content>, "filename": "ja.pdf"}`. Save base64-decoded PDF to `${id}/ja.pdf`. Use Node one-liner via Bash, NOT PowerShell — `ConvertTo-Json` wraps long strings (see `feedback_powershell_convertto_json_string_wrap`).
> 7. Return paths + page count translated + grep result for forbidden terms (`Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|マッキンゼー|モルドール`).
>
> Pre-Write each page: confirm publisher aliases inside source tags are NOT translated (`[Kira estimates]` must NOT become `[KIRA推計]`; `[BPS 2024]` must NOT become `[インドネシア統計庁 2024]`). Inline English descriptive clauses inside tags (e.g. `[Kira estimates · computed from active-user-share above]`) MAY have the descriptive tail translated to Japanese while preserving the `[<Alias>` prefix — the alias still resolves against the SOURCE KEY.

**Hard time cap: 45 minutes.** If subagent has not returned by then → failure path with `error_log: JA translate timeout 45m`. Partial ja.html (if exists) stays on disk for inspection.

### 4.3 — Parent-side validation gate (post-return)

1. `ls -la …/ja.html …/ja.pdf` — both exist + non-empty (> 1KB)
2. Top-level page count in ja.html (regex `<div class="page[" ]` via Grep tool) must equal `$PAGE_COUNT` from 4.1
3. `grep -E '(Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|클로드|マッキンゼー|モルドール)' ja.html` — zero hits
4. `grep -oE '\[[A-Za-z][^]]+\]' ja.html | sort -u` vs same on en.html — JA's set must be a SUPERSET of EN's (translator may add `[出典凡例]` label, must not REMOVE any EN publisher alias).
   - **Acceptable diff**: a single tag with the same publisher alias but a translated descriptive tail (e.g. EN `[Kira estimates · computed from active-user-share above]` ≠ JA `[Kira estimates · 上記アクティブ利用者シェアから算出]`). The publisher alias `Kira estimates` is preserved → SOURCE KEY cross-reference still resolves. Log it in the commit message but do NOT fail the gate.
   - **Fail-gate**: a publisher alias itself was Japanized (e.g. `[BPS 2024]` → `[インドネシア統計庁 2024]`), or any EN alias disappeared entirely.

If any check fails → failure path. Otherwise:

- Set queue row status to `ja_done`
- **Clear `claimed_at`** (this fire succeeded; next fire's audit must not see it as stale)
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

Exactly mirror Step 4 but use `translator_ko.md` rules. Subagent prompt is identical to 4.2 except substituting `ja`→`ko` everywhere AND `translator_jp.md` → `translator_ko.md`. Same chunked protocol. Same time cap. **Reminder**: top-level page class is `page` / `page cover-page` (not `kira-page`) — see §4.1.

Forbidden-term grep for KO swaps the JP-specific transliterations for KO-specific ones: `Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|클로드|クロード|맥킨지|모르도르`.

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

**Pages**: top-level page count from EN HTML (already known from Step 4.1 / 5.1 via regex `<div class="page[" ]`).

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

**5.3b-2 — Upload 3 preview HTML files to Supabase Storage bucket `reports-html`.**

The report page on /<locale>/reports/<slug> embeds an iframe showing the first 5 pages of the source HTML. Without this step, the iframe loads empty and the page looks broken.

Path: `<report_id>/<locale>.html`. The script slices the first 5 `<div class="page">` blocks before upload, so only preview-safe content lands in the bucket.

```bash
for loc in en ja ko; do
  node skills/kira-research-report/scripts/upload-html.mjs \
    "skills/kira-research-report/outputs/batch/${id}/${loc}.html" \
    "${REPORT_ID}" \
    "${loc}"
done
```

Expects HTTP 200 + `{"Key": "reports-html/<report_id>/<locale>.html", "Id": "<uuid>"}`. Any non-200 → bail to failure path.

**5.3c — Verify (3 cache-busted curls):**

1. `curl https://kiraresearch.com/api/library-list?_t=$(date +%s)` — `items[]` contains the new slug
2. `for loc in en ja ko; do curl -o /dev/null -w '%{http_code}\n' "https://kiraresearch.com/$loc/reports/<slug>"; done` — all 200
3. `for loc in en ja ko; do curl -o /dev/null -w '%{http_code}\n' "https://kiraresearch.com/api/preview-html?slug=<slug>&locale=$loc&_t=$(date +%s)"; done` — all 200, confirms the preview iframe HTML is uploaded for every locale

**5.3d — Finalize queue row + commit + push.**

- status → `done`
- output_paths → `reports-pdfs/<report_id>/en.pdf|reports-pdfs/<report_id>/ja.pdf|reports-pdfs/<report_id>/ko.pdf`
- date_completed → today (YYYY-MM-DD)
- error_log → empty
- `claimed_at` → empty (terminal success; clears the in-flight marker)

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
- `claimed_at` → empty (terminal failure; clears the in-flight marker so Step 0.5 doesn't try to re-recover an `error` row)

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

## Page-class fix (2026-05-25, post-first-Q.1-run)

Discovered during `2026-vn-fintech` manual run: the playbook referenced `<div class="kira-page">` but the actual rendered HTML (from `render_and_output.md` skill output) uses `<div class="page">` for body pages and `<div class="page cover-page">` for the cover. Subdivs (`page-inner`, `page-header`, etc.) are NOT page boundaries.

Fixed in §4.1 (count), §4.2 (subagent prompt), §4.3 (validation regex), §5.1 (KO inheritance), §5.3a (publish step pages count), and this changelog. Use regex `<div class="page[" ]` — character class `[" ]` excludes subdivs like `<div class="page-inner">`.

Also clarified §4.3 validation #4 (source-tag superset) — a descriptive tail translation inside a tag that preserves the publisher alias is acceptable; only a localized publisher alias or a missing alias entirely fails the gate. Real example: `[Kira estimates · computed from active-user-share above]` → `[Kira estimates · 上記アクティブ利用者シェアから算出]` is acceptable.

---

## Phase Q.4 changelog (2026-05-28)

- **Auto-recovery for stale `*_in_progress` claims.** Pre-Q.4 a fire that
  committed `claim` then died (Claude session crash, machine sleep,
  network blip, sub-agent hang past timeout) left the row stuck forever
  until manual unstuck. Discovered after a queue audit found 4 rows stuck
  for 5.5h-21h, burning ~1 day of queue capacity silently.
- **New column `claimed_at`** in `data/report_queue.csv` (ISO 8601 UTC).
  Set at claim, cleared on success/failure/auto-recover.
- **New script** `skills/kira-research-report/scripts/audit-queue.mjs`.
  Idempotent CSV migration + 90-min stale-claim detector. Strike-1 reverts
  to prior stage; strike-2 (row already auto-recovered once) escalates
  to `error` so manual review surfaces real bugs.
- **New Step 0.5** in this prompt runs the audit before stage routing.
  Adds at most one extra `batch: auto-recover N stale claim(s)` commit
  per fire that finds stale rows; zero overhead when queue is clean.
- **Steps 2, 3, 4, 5.3d, 7 updated** to set/clear `claimed_at` alongside
  status transitions.

## Phase Q.1 changelog (2026-05-25)

- **Split single-fire-all-stages into 3 fires** (pending→en_done→ja_done→done). Root cause: `2026-vn-fintech` hung 2h24m at JA translate — single subagent tried to Write 70KB ja.html in one call, exceeded Sonnet output cap, returned partial or hung.
- **Chunked translation per top-level `<div class="page">`** in Step 4/5 — each page is a separate Edit call, no single Write exceeds ~5-7KB. (Spec previously said `kira-page`; corrected 2026-05-25 — actual render uses `page` / `page cover-page`.)
- **Validation gates added**: page count match, source tag superset, anti-positioning grep with katakana/hangul variants.
- **Machine-agnostic path**: `git rev-parse --show-toplevel` instead of hardcoded `C:\Users\vnc-f4\…`. Same prompt now runs on any machine.
- **Watchdog**: hard 45-min per-stage timeout; partial output stays for inspection.
- **Status enum extended** in queue.csv: added `en_done`, `ja_done`, `en_in_progress`, `ja_in_progress`, `ko_in_progress`. Old `in_progress` rows treated as error.
- **Legacy single-fire format**: if you encounter an `in_progress` row from before this phase, treat as error and skip.
