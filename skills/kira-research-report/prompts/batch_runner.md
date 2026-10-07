# batch_runner.md — self-contained prompt for scheduled batch report generation

> **Queue storage (2026-10-07):** the queue lives in Supabase (`report_queue` + `report_queue_events`, migration 031), NOT in `data/report_queue.csv` (frozen archive, never edit). Every queue read/write goes through `node skills/kira-research-report/scripts/queue.mjs` (`recover` · `sync-topics` · `next` · `advance` · `fail`). The owner steers the queue from `/en/admin/pipeline` (hold, release, retry, priority). Wherever older text below says "set the CSV row to X", run `queue.mjs advance <id> X` AFTER the artifacts are committed and pushed; queue changes are never git commits.

Fired by a **cloud Routine** (Phase S1, 2026-10-05; before that by `mcp__scheduled-tasks` crons on the DELL). Each fire is a **fresh Claude session with no memory** of any prior conversation — everything needed is in this prompt + the files it references.

This prompt is **machine-agnostic**: it derives its working directory from git, so the same prompt runs on any machine or cloud session where the repo is cloned. In a cloud Routine session the repos are not checked out yet: the Routine prompt clones `kira-research` and `kira-pipeline` (brain) side by side, runs `npm ci`, and exports `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` before handing over to this file.

---

## Mission (Phase Q.1 — 2026-05-25)

**1 fire = 1 stage = 1 row.** Pick the most-advanced row in the queue and advance it ONE stage. Three stages per row before publish (four when `target_languages` includes `zh` — Phase S4):

```
target_languages without zh (legacy "en,ja,ko"):
pending → [Fire A: EN gen] → en_done → [Fire B: JA translate] → ja_done → [Fire C: KO translate + publish] → done

target_languages with zh (default "en,ja,ko,zh" since 2026-10-05):
pending → [Fire A] → en_done → [Fire B] → ja_done → [Fire C: KO translate, NO publish] → ko_done → [Fire D: ZH translate + publish all 4] → done

ZH backfill of an already-published report (owner sets status zh_backfill):
zh_backfill → [Fire E: ZH translate + publish ZH only, en/ja/ko untouched] → done
                                                                              ↘ error (any fire)
```

Why split: a single fire that did EN + JA + KO + publish was running 60-150 min on heavy topics. JA and KO translation subagents are **output-cap bound** (a 67KB en.html ≈ 18K tokens, sat trên Sonnet's 32K per-response output cap). Splitting per locale + chunking the translation per top-level `<div class="page">` (Section 4 + 5 below) makes each fire <30 min and survivable.

Hard cap: **1 row × 1 stage per fire** to stay safely within Sonnet context budget on the Max 5x plan.

---

## Model routing (Phase Q.5 — 2026-05-29)

The cron fire itself (this orchestrating session) runs on the account-default model — it only does file ops, claims, validation greps, and commits, so its model doesn't matter much. **The token-heavy work is the spawned `general-purpose` subagent, and THAT is where the model is chosen explicitly via the `Agent` tool's `model` parameter.** Policy:

| Stage | Subagent work | `model` to pass | Time cap | Why |
|---|---|---|---|---|
| A (EN gen) | Step 3 | **`opus`** | 90 min | EN report is the sellable product — synthesis depth matters, keep top model |
| B (JA translate) | Step 4 | **`sonnet`** | 75 min | Translation is mechanical; Sonnet is near-parity and the chunked protocol was designed for its output cap |
| C (KO translate) | Step 5 | **`sonnet`** | 75 min | Same as JA |
| D (ZH translate + publish) / E (ZH backfill) | Step 5Z | **`sonnet`** | 75 min | Same as JA; same chunked per-page protocol and output-cap reasoning |

Stale-claim threshold (Step 0.5) stays 150 min — above every cap.

When the spawn step below says "spawn a `general-purpose` subagent", pass the `model` from this table in the `Agent` tool call. If for any reason the `model` param is unavailable, proceed with the default model (do NOT fail the fire over it) and note it in the summary.

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

These 3 env vars must be present (cloud: the Routine environment's variables; local Windows: User scope; both mirrored from the Vercel project env):

- `PDF_RENDER_SECRET` — `X-Api-Key` header on POST /api/render-pdf
- `SUPABASE_URL` — `https://iygoynbnscednfzdsflc.supabase.co`
- `SUPABASE_SERVICE_KEY` — Bearer token for Supabase Storage + SQL via MCP

**Use Node for the check, NOT bash `${VAR:+SET}` expansion** — bash variable expansion triggers Claude Code's "Contains expansion" permission prompt every fire even when `Bash(node *)` and `Bash(cd *)` are pre-approved. Node reads `process.env` directly without shell expansion, so the command stays in the auto-approved allowlist.

```bash
node -e "['PDF_RENDER_SECRET','SUPABASE_URL','SUPABASE_SERVICE_KEY'].forEach(k=>{const v=process.env[k];console.log(k+'='+(v&&v.length?'SET':'MISSING'))})"
```

Also check the brain (private repo `kira-pipeline`, cloned next to this repo or at env `KIRA_BRAIN_DIR`): `node -e "const p=require('path'),f=require('fs');const b=process.env.KIRA_BRAIN_DIR||p.resolve('..','kira-pipeline','brain');console.log('BRAIN='+(f.existsSync(p.join(b,'runner','retrieve.py'))?b:'MISSING'))"`. A missing brain is NOT fatal: Stage A falls back to UC1/UC2. Note it in the fire summary.

Cover art needs `OPENAI_API_KEY` (optional `OPENAI_IMAGE_MODEL`, default `gpt-image-2`; 15 house styles rotate by report id). Missing key is NOT fatal either: the cover renders without an illustration (`plain` variant). Note it in the fire summary.

If ANY of the 3 env vars prints `MISSING` → EXIT CLEANLY with one-line `missing env, no-op`. Do NOT claim any row, do NOT commit. This prevents stuck `in_progress` rows on misconfigured machines.

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

`queue.mjs recover` finds rows whose status ends in `_in_progress` AND `claimed_at` is empty OR older than **150 minutes** (well above the 90-min EN stage timeout).

- **Strike-1** (error_log does NOT contain `auto-recovered`): revert to the prior stage (`en_in_progress`→`pending`, `ja_in_progress`→`en_done`, `ko_in_progress`→`ja_done`, `zh_in_progress`→`ko_done`, or `zh_backfill` when the row carries the `zh-backfill` token / a filled `output_paths`), clear `claimed_at`, append `auto-recovered <iso>` to `error_log`.
- **Strike-2** (already recovered once, stuck again): real bug. Status → `error`, note `second-strike auto-recover skipped`, left for manual review.

Idempotent: nothing stale → `recovered=0`. No commit is involved.

```bash
node skills/kira-research-report/scripts/queue.mjs recover
```

If the script exits non-zero (Supabase unreachable / env missing), EXIT with `no-op: queue unreachable`; do not touch any file.

---

## Step 0.6: Pull approved topics into the queue (Phase S — Sprint S3)

Topics the owner approved in `/en/admin/topics` live in Supabase (`topics.status = 'approved'`). Move them into the queue as `pending` rows (reader demand becomes the row `priority`, so requested topics are produced first):

```bash
node skills/kira-research-report/scripts/queue.mjs sync-topics
```

Idempotent. A failure here never blocks the fire: log it and continue to Step 1.

---

## Step 1: Find work — stage routing

Step 1 and Step 2 are ONE command, because claiming is an atomic compare-and-swap in the database:

```bash
node skills/kira-research-report/scripts/queue.mjs next --model <opus|sonnet>
```

It picks the most-advanced row (`ko_done` > `ja_done` > `en_done` > `pending` > `zh_backfill`; inside a status: highest `priority`, then oldest) and prints ONE JSON line `{id, topic, country, industry, year, target_languages, stage, picked_status, claim_status, output_paths, error_log, has_zh}`, or `none`.

1. `none` → output `No work in queue` and EXIT cleanly.
2. `stage` = `zh` with `picked_status` `ko_done` → **Stage D**; `zh_backfill` → **Stage E**; `ko` → **Stage C**; `ja` → **Stage B**; `en` → **Stage A**.
3. `has_zh` is `HAS_ZH` (Stage C branches on it).

The row is already claimed (`claim_status`, `claimed_at` set, an event logged); skip the old Step 2 below. Pass the model the stage will use (see Model routing) so the Pipeline page shows it.

**Why most-advanced first**: drains rows toward `done` instead of starting new EN gens while half-done rows sit around. Also gives a natural pipeline — once steady-state, every 4 consecutive fires complete 1 four-language report (3 for legacy `en,ja,ko` rows). Backfill is lowest priority: it only uses fires the new-report pipeline leaves idle.

**`zh` in `target_languages`** = the comma-split list contains `zh` (e.g. `"en,ja,ko,zh"`). Read it once here as `HAS_ZH=true|false`; Stage C branches on it.

**Status values in `report_queue`** (no DB constraint; keep the strings exact):

| status | meaning |
|---|---|
| `pending` | not yet started |
| `hold` | parked by the owner; the runner never picks it. Flip to `pending` to release |
| `en_in_progress` | a fire is generating EN (or claimed and died — see `claimed_at`) |
| `en_done` | EN HTML+PDF generated + committed; awaiting JA |
| `ja_in_progress` | a fire is translating JA (or claimed and died) |
| `ja_done` | JA HTML+PDF generated + committed; awaiting KO (+ publish when no `zh`) |
| `ko_in_progress` | a fire is translating KO (+ publishing when no `zh`) (or claimed and died) |
| `ko_done` | (`zh` rows only) KO HTML generated + committed, nothing published yet; awaiting ZH + publish |
| `zh_in_progress` | a fire is translating ZH + publishing (Fire D), or backfilling ZH (Fire E) (or claimed and died) |
| `zh_backfill` | already-published report queued for a ZH-only backfill (set by the owner; `target_languages` gets `,zh` appended, `error_log` gets the `zh-backfill` marker, `output_paths` stays filled; `queue.mjs next` adds the marker itself) |
| `done` | every language in `target_languages` + Supabase published; terminal success |
| `error` | a stage failed (or strike-2 auto-recovery escalated); see `error_log`; terminal failure (manual reset to `pending` / `en_done` / `ja_done` / `ko_done` / `zh_backfill` to retry) |
| `in_progress` | (legacy) treat as `error` and skip — old single-fire-all-stages format |

**Companion column `claimed_at`** (Phase Q.4): ISO 8601 UTC timestamp set
at claim time, cleared on success / failure / auto-recovery. If a row
has `*_in_progress` status with a `claimed_at` more than 150 minutes ago
(or empty), Step 0.5 of the next fire automatically reverts it.

Extract from the chosen row: `id`, `topic`, `country`, `industry`, `year`, `target_languages`, current `status` (and `output_paths` for a `zh_backfill` row — it holds the published `report_id`).

---

## Step 2: Claim the row — done by `queue.mjs next` in Step 1

Nothing to do here. The claim is atomic (`UPDATE … WHERE status = <picked status>`), so two overlapping fires cannot claim the same row; a lost race makes `next` try the following candidate. If this fire dies after claiming, Step 0.5 of a later fire reverts the row once it is 150 minutes stale.

---

## Step 3 (Stage A only): EN gen

Spawn a `general-purpose` subagent **with `model: "opus"`** (EN gen is the sellable core — see Model routing) and this prompt (substitute `${...}` fields):

> Generate a KIRA Research report. Load the skill at `skills/kira-research-report/SKILL.md` and follow its standard pipeline: topic_parser → orchestrator → (brain_route | blueprint | design mode) → research → content_per_section → chart_generator → render_and_output. Use the route the orchestrator selects (BRAIN when the brain is available at `${brain_dir}`).
>
> Queue id: `${id}` · Topic: `${topic}` · Country: `${country}` · Industry: `${industry}` · Year: `${year}`
>
> BRAIN route: keep framing, context pack and brain trace in `<os temp dir>/kira-brain/${id}/` — never inside this repo.
>
> Cover art: run `scripts/gen-cover.mjs` (render_and_output Step 1b) writing `outputs/batch/${id}/cover.jpg`; end the report with the `closing` page. Keep image `src` values relative (`cover.jpg`, `brand/logo.png`).
>
> Naming: run `scripts/report-name.mjs` (SKILL.md Stage 3e, `docs/naming_convention.md`) and save `skills/kira-research-report/outputs/batch/${id}/naming.json`. Cover lines, report kind, `<title>` and closing short title come from it.
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

**Hard time cap: 90 minutes** (BRAIN-route reports have no page cap and run longer) — if the subagent has not returned by then, treat as timeout: jump to failure path (Step 7) with `error_log: EN gen timeout 90m`.

**Parent-side validation (post-return)**:

1. Parse return message for "X planned, Y generated" — if `X != Y` → failure path with `error_log: EN section count mismatch X/Y`
2. `ls -la skills/kira-research-report/outputs/batch/${id}/en.html en.pdf naming.json` — all must exist; HTML and PDF non-empty (> 1KB); `naming.json` parses and its `title` equals the `<title>` of `en.html`
3. `grep -E '(Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|클로드)' en.html` — must be zero hits
4. Brain leak check (BRAIN route): `grep -iE '(brain trace|context pack|archive card|selection matrix|module_library|industryprint|P3-[0-9]{4})' en.html` must be zero hits, and `git status --porcelain` must show nothing outside `outputs/batch/${id}/`. A hit → failure path with `error_log: brain leak: ${first match}` (no retry).

**Step 3 retry path** (anti-positioning leaks specifically — not the other failures): if grep returns hits, do NOT immediately fail. Instead, spawn one more `general-purpose` subagent fire with this prompt:

> The EN HTML at `skills/kira-research-report/outputs/batch/${id}/en.html` contains a forbidden competitor reference. Offending matches:
> ```
> ${grep output, file:line:match}
> ```
> Rewrite the file **in place**, replacing every flagged citation with either the underlying primary source (gov stats, operator filings, industry association the competitor itself synthesized from) or `[Kira estimates]`. See `prompts/voice_guide.md` § "Forbidden (anti-positioning)" for the worked examples. Do NOT regenerate other sections. Do NOT re-render the PDF (parent will do that). Return when grep is clean.

After the retry returns, re-run grep. If still dirty → failure path with `error_log: EN gen anti-positioning leak persisted after retry: ${first match}`. If clean → re-render the PDF via `node skills/kira-research-report/scripts/render-one.mjs <html> <pdf>` and proceed to commit. Only one retry — second leak means manual review.

If all pass → commit + push the files, THEN advance the queue (files first: a status never gets ahead of its artifacts):

```bash
git add skills/kira-research-report/outputs/batch/${id}/en.html
git add skills/kira-research-report/outputs/batch/${id}/naming.json
git add skills/kira-research-report/outputs/batch/${id}/cover.jpg 2>/dev/null || true
git commit -m "batch: EN done for ${id}"
git push origin main
node skills/kira-research-report/scripts/queue.mjs advance ${id} en_done --model opus
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

Spawn ONE subagent for JA translation **with `model: "sonnet"`** (translation → Sonnet per Model routing). Prompt:

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

**Hard time cap: 75 minutes** (longer reports = more page chunks). If subagent has not returned by then → failure path with `error_log: JA translate timeout 75m`. Partial ja.html (if exists) stays on disk for inspection.

### 4.3 — Parent-side validation gate (post-return)

1. `ls -la …/ja.html …/ja.pdf` — both exist + non-empty (> 1KB)
2. Top-level page count in ja.html (regex `<div class="page[" ]` via Grep tool) must equal `$PAGE_COUNT` from 4.1
3. `grep -E '(Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|클로드|マッキンゼー|モルドール)' ja.html` — zero hits
4. `grep -oE '\[[A-Za-z][^]]+\]' ja.html | sort -u` vs same on en.html — JA's set must be a SUPERSET of EN's (translator may add `[出典凡例]` label, must not REMOVE any EN publisher alias).
   - **Acceptable diff**: a single tag with the same publisher alias but a translated descriptive tail (e.g. EN `[Kira estimates · computed from active-user-share above]` ≠ JA `[Kira estimates · 上記アクティブ利用者シェアから算出]`). The publisher alias `Kira estimates` is preserved → SOURCE KEY cross-reference still resolves. Log it in the commit message but do NOT fail the gate.
   - **Fail-gate**: a publisher alias itself was Japanized (e.g. `[BPS 2024]` → `[インドネシア統計庁 2024]`), or any EN alias disappeared entirely.

If any check fails → failure path. Otherwise:

- Commit + push, then advance the queue to `ja_done` (this also clears `claimed_at`):

```bash
git add skills/kira-research-report/outputs/batch/${id}/ja.html
git commit -m "batch: JA done for ${id}"
git push origin main
node skills/kira-research-report/scripts/queue.mjs advance ${id} ja_done --model sonnet
```

Go to Step 6 — do NOT proceed to KO in same fire.

---

## Step 5 (Stage C only): KO translate (+ auto-publish when no `zh`)

### 5.1 — KO chunked translation

Exactly mirror Step 4 but use `translator_ko.md` rules. Spawn the subagent **with `model: "sonnet"`** (translation → Sonnet per Model routing). Subagent prompt is identical to 4.2 except substituting `ja`→`ko` everywhere AND `translator_jp.md` → `translator_ko.md`. Same chunked protocol. Same time cap. **Reminder**: top-level page class is `page` / `page cover-page` (not `kira-page`) — see §4.1.

Forbidden-term grep for KO swaps the JP-specific transliterations for KO-specific ones: `Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|클로드|クロード|맥킨지|모르도르`.

### 5.2 — KO validation gate (same as 4.3 with ja→ko)

If it fails → failure path. If it passes:

- **`HAS_ZH` (row's `target_languages` contains `zh`)** → Fire C ends here, **nothing is published** (all 4 languages go live together in Fire D). Commit + push, advance the queue to `ko_done`, go to Step 6:

  ```bash
  git add skills/kira-research-report/outputs/batch/${id}/ko.html
  git commit -m "batch: KO done for ${id}"
  git push origin main
  node skills/kira-research-report/scripts/queue.mjs advance ${id} ko_done --model sonnet
  ```

- **No `zh`** (legacy `en,ja,ko` rows) → proceed to 5.3 publish with `PUBLISH_LANGS="en ja ko"`. Do NOT commit yet — publish in same fire.

### 5.3 — Auto-publish to Supabase

This is the original Step 6a/6b/6c/6d from pre-Q.1, generalized to a locale list (Phase S4). Reproduced here for self-containment. Used by Fire C (no `zh`, `PUBLISH_LANGS="en ja ko"`) and Fire D (`PUBLISH_LANGS="en ja ko zh"`). Fire E (ZH backfill) publishes through **5Z.4** instead — it must not touch `living_reports` or the other locales.

Every write below is idempotent per `(report, locale)`: the SQL upserts on `living_reports.slug` and `report_translations (report_id, locale)`, and the Storage uploads use `x-upsert: true`. Re-running a publish (after a partial failure, or for one extra locale) overwrites, never duplicates.

**5.3a — INSERT living_reports + one report_translations row per locale in `PUBLISH_LANGS`.**

Build the SQL with `node skills/kira-research-report/scripts/build-publish-sql.mjs --id ${id} --langs "${PUBLISH_LANGS}" [--chart-page N] > /tmp/insert.sql` (no per-topic script needed; `--chart-page N` takes the preview chart from a 3-bar exhibit page, and without it the preview has no chart). It reads `naming.json` and each locale's HTML and prints the statement below. Read the output before running it. Key fields per locale, extracted from each language's HTML:

- `title` ← the `<title>` element of each locale's HTML (EN = `naming.title`; translators translate it)
- `eyebrow` ← `naming.eyebrow.<locale>` from `outputs/batch/${id}/naming.json`
- `preview` JSONB: `lede` (~400 chars), `paragraphs` (2 × ~300 chars), `chart` (`{title, subtitle, bars[{pct,label,value}]}` from exec-chart page 4)
- `toc` JSONB array from `.toc-col li` elements

**Naming**: slug, code, country (English name), industry, stage, report type, segment and keywords all come from `outputs/batch/${id}/naming.json` (`docs/naming_convention.md`). Never derive a slug from the queue id. If `naming.json` is missing (a row started before the convention), create it with `scripts/report-name.mjs` before publishing.

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
  INSERT INTO living_reports (slug, code, country, industry, industry_code, stage, report_type, segment, keywords, year, pages, price, currency, status, published_at)
  VALUES ($kbat$<slug>$kbat$, $kbat$<code>$kbat$, $kbat$<country>$kbat$, $kbat$<industry>$kbat$, $kbat$<industry_code>$kbat$, $kbat$<stage>$kbat$, $kbat$<type>$kbat$, $kbat$<segment>$kbat$, ARRAY[<keywords as $kbat$…$kbat$ literals>]::text[], <year>, <pages>, 39, 'USD', 'published', now())
  ON CONFLICT (slug) DO UPDATE SET
    updated_at = now(), published_at = now(), pages = EXCLUDED.pages, status = 'published',
    code = coalesce(living_reports.code, EXCLUDED.code), keywords = EXCLUDED.keywords
  RETURNING id
)
INSERT INTO report_translations (report_id, locale, title, eyebrow, preview, toc, pdf_url, status, published_at)
SELECT new_report.id, t.locale, t.title, t.eyebrow, t.preview::jsonb, t.toc::jsonb,
       new_report.id::text || '/' || t.locale || '.pdf',
       'published', now()
FROM new_report
CROSS JOIN (VALUES ('en', ...), ('ja', ...), ('ko', ...), ('zh', ...)) AS t(locale, title, eyebrow, preview, toc)  -- one tuple per locale in PUBLISH_LANGS ('zh' only in Fire D)
ON CONFLICT (report_id, locale) DO UPDATE SET
  title = EXCLUDED.title, eyebrow = EXCLUDED.eyebrow,
  preview = EXCLUDED.preview, toc = EXCLUDED.toc,
  pdf_url = EXCLUDED.pdf_url, status = 'published', published_at = now()
RETURNING report_id, locale, title;
```

Capture the `report_id` UUID — needed for 5.3b.

**Link the topic to its report** (so readers who asked for the topic get the "now published" email and its coming-soon page redirects). Run once right after the upsert; a row that did not come from a topic simply updates 0 rows:

```sql
UPDATE topics SET report_id = '<report_id>' WHERE slug = $kbat$<id>$kbat$ AND report_id IS NULL;
```

**5.3b — Upload one PDF per locale to Supabase Storage bucket `reports-pdfs`.**

Path: `<report_id>/<locale>.pdf`. PDFs are gitignored, so a fresh (cloud) session only has the PDF rendered in THIS fire. Re-render any missing one from its committed HTML first (same endpoint, idempotent):

```bash
for loc in ${PUBLISH_LANGS}; do
  D=skills/kira-research-report/outputs/batch/${id}
  [ -s "$D/${loc}.pdf" ] || node skills/kira-research-report/scripts/render-one.mjs "$D/${loc}.html" "$D/${loc}.pdf" "${loc}.pdf"
done
```

Then upload with the helper:

```bash
for loc in ${PUBLISH_LANGS}; do   # "en ja ko" (Fire C) or "en ja ko zh" (Fire D)
  node skills/kira-research-report/scripts/upload-pdf.mjs \
    "skills/kira-research-report/outputs/batch/${id}/${loc}.pdf" \
    "${REPORT_ID}" \
    "${loc}"
done
```

Expects HTTP 200 + `{"Key": "reports-pdfs/<report_id>/<locale>.pdf", "Id": "<uuid>"}`. Any non-200 → bail to failure path.

**5.3b-2 — Upload one preview HTML file per locale to Supabase Storage bucket `reports-html`.**

The report page on /<locale>/reports/<slug> embeds an iframe showing the first 5 pages of the source HTML. Without this step, the iframe loads empty and the page looks broken.

Path: `<report_id>/<locale>.html`. The script slices the first 5 `<div class="page">` blocks before upload, so only preview-safe content lands in the bucket.

```bash
for loc in ${PUBLISH_LANGS}; do
  node skills/kira-research-report/scripts/upload-html.mjs \
    "skills/kira-research-report/outputs/batch/${id}/${loc}.html" \
    "${REPORT_ID}" \
    "${loc}"
done
```

Expects HTTP 200 + `{"Key": "reports-html/<report_id>/<locale>.html", "Id": "<uuid>"}`. Any non-200 → bail to failure path.

**5.3b-3 — Upload the cover image (library thumbnail + report page).**

The library list and the report page show the cover illustration from the public `covers` bucket (migration 026). `upload-cover.mjs` writes the full image, a portrait thumbnail and a wide crop, sets `living_reports.cover_url` / `cover_thumb_url`, and gives the same cover to insights linked to this report:

```bash
C=skills/kira-research-report/outputs/batch/${id}/cover.jpg
if [ -s "$C" ]; then
  node skills/kira-research-report/scripts/upload-cover.mjs --kind report --slug "<slug>" --in "$C"
else
  # No cover (OPENAI_API_KEY was missing at EN gen): generate one now, then upload.
  node skills/kira-research-report/scripts/gen-cover.mjs --id "<slug>" --country "<country>" --industry "<industry>" \
    --angle "<title>" --out "$C" --quality high \
    && node skills/kira-research-report/scripts/upload-cover.mjs --kind report --slug "<slug>" --in "$C"
fi
```

Prints one JSON line; `"ok": true` expected. A cover failure is NOT fatal (the page falls back to a plain thumbnail): note it in the fire summary and continue.

**5.3c — Verify (3 cache-busted curls):**

1. `curl https://kiraresearch.com/api/library-list?_t=$(date +%s)` — `items[]` contains the new slug
2. `for loc in ${PUBLISH_LANGS}; do curl -o /dev/null -w '%{http_code}\n' "https://kiraresearch.com/$loc/reports/<slug>"; done` — all 200
3. `for loc in ${PUBLISH_LANGS}; do curl -o /dev/null -w '%{http_code}\n' "https://kiraresearch.com/api/preview-html?slug=<slug>&locale=$loc&_t=$(date +%s)"; done` — all 200, confirms the preview iframe HTML is uploaded for every locale

**5.3d — Commit + push, then finalize the queue row.**

```bash
git add skills/kira-research-report/outputs/batch/${id}/
git commit -m "batch: complete ${id} (EN+JA+KO, published)"      # Fire C
git commit -m "batch: complete ${id} (EN+JA+KO+ZH, published)"   # Fire D (use instead)
git push origin main
# --paths = one reports-pdfs/<report_id>/<locale>.pdf per locale in PUBLISH_LANGS, pipe-separated
node skills/kira-research-report/scripts/queue.mjs advance ${id} done --paths "reports-pdfs/<report_id>/en.pdf|reports-pdfs/<report_id>/ja.pdf|reports-pdfs/<report_id>/ko.pdf|reports-pdfs/<report_id>/zh.pdf" --model sonnet
```

`advance … done` sets `date_completed` to today, empties `error_log` and `claimed_at`.

Keep the `batch: complete ${id} (` prefix exactly: throughput is measured with `git log | grep -c 'batch: complete'`.

---

## Step 5Z (Stage D and Stage E): ZH translate + publish

Stage D = a `ko_done` row (new report; EN/JA/KO are committed, nothing published yet) → translate ZH, then publish all four languages via 5.3. Stage E = a `zh_backfill` row (report already published in EN/JA/KO) → translate ZH, then publish ZH only via 5Z.4. **Steps 5Z.0-5Z.2 (inputs, translation, validation) are identical for D and E; only the publish branch (5Z.3) differs.**

### 5Z.0 — Inputs (Stage E pre-checks)

- `skills/kira-research-report/outputs/batch/${id}/en.html` must exist (committed). Missing → failure path with `error_log: en.html missing for zh stage`.
- Stage E only: `REPORT_ID` = the UUID segment of the first path in the row's `output_paths` (`reports-pdfs/<report_id>/en.pdf`). If `output_paths` is empty, look the report up by `naming.json`'s `slug` (`SELECT id FROM living_reports WHERE slug = …`). Neither available → failure path with `error_log: zh backfill: report_id unknown`. Never create a new `living_reports` row in Stage E.
- Count `PAGE_COUNT` on en.html exactly as §4.1 (same 8-40 bounds).

### 5Z.1 — ZH chunked translation

Spawn ONE `general-purpose` subagent **with `model: "sonnet"`** (translation → Sonnet per Model routing). Prompt = the §4.2 prompt with `ja` → `zh` everywhere, `translator_jp.md` → **`translator_zh.md`**, "to Japanese" → "to Simplified Chinese (简体中文)", and these additions:

> - In the shell Write, set `<html lang="zh-Hans">`, add the Noto Sans SC Google Fonts `<link>`, set `.source-key::before` to `来源说明 · `, and if the inlined CSS has no `--font-cjk`, add `'Noto Sans SC', ` after every `'Satoshi', ` / `'JetBrains Mono', ` in font stacks (translator_zh.md §0).
> - Translate the `<title>`; keep it a question when the EN title is a question.
> - Forbidden-term grep to report back: `Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|클로드|麦肯锡|克劳德|弗若斯特|欧睿|益普索`.
> - Source tags: `[Kira estimates]` must NOT become `[KIRA估算]`; `[BPS 2024]` must NOT become `[印尼统计局 2024]`.

Same chunked protocol (one Write for the shell, one Edit per top-level page, `<div class="page[" ]`), same PDF render (body `{"html": <zh.html>, "filename": "zh.pdf"}` via `scripts/render-one.mjs`), output `${id}/zh.html` + `${id}/zh.pdf`.

**Hard time cap: 75 minutes.** Not returned by then → failure path with `error_log: ZH translate timeout 75m`. Partial zh.html stays on disk.

### 5Z.2 — ZH validation gate (post-return)

1. `ls -la …/zh.html …/zh.pdf` — both exist + non-empty (> 1KB)
2. Top-level page count in zh.html (regex `<div class="page[" ]`) == `$PAGE_COUNT` of en.html
3. Competitor / name grep — zero hits:
   `grep -E '(Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード|클로드|麦肯锡|克劳德|弗若斯特|欧睿|益普索)' zh.html`
4. Anti-positioning grep (ZH) — zero hits:
   `grep -E '(本平台|我们的平台|KIRA ?平台|研究平台|AI ?驱动|人工智能驱动|AI ?赋能|人工智能赋能|贵公司|贵司|亲们|亲，)' zh.html`
   (A bare `平台` is NOT a hit — e-commerce / payment platforms are legitimate report subjects.)
5. Source-tag superset — same rule as §4.3 #4 with ja→zh (aliases untranslated; translated descriptive tails OK, log them).
6. `<title>` translated: `node -e "const f=require('fs');const t=p=>(f.readFileSync(p,'utf8').match(/<title>([\s\S]*?)<\/title>/)||[])[1]||'';const e=t(process.argv[1]),z=t(process.argv[2]);if(!/[一-鿿]/.test(z)||z===e){console.log('title_fail');process.exit(1)}" skills/kira-research-report/outputs/batch/${id}/en.html skills/kira-research-report/outputs/batch/${id}/zh.html` — prints `title_fail` and exits 1 when the zh `<title>` has no Han characters or equals the EN title
7. Shell: `<html lang="zh-Hans"` present and `Noto+Sans+SC` link present.
8. Script hygiene — no kana / hangul, and at most 5 Traditional-only characters (a handful can survive inside official HK names in citations; more means the translator drifted — fail). Use Node, not `grep -P` (fails on non-UTF-8 locales):

   ```bash
   node -e "const h=require('fs').readFileSync(process.argv[1],'utf8');const k=(h.match(/[぀-ヿ가-힯]/g)||[]).length,t=(h.match(/[們這為國經產業資場發關說戰與來會對學]/g)||[]).length;console.log('kana_hangul='+k+' traditional='+t);process.exit(k>0||t>5?1:0)" skills/kira-research-report/outputs/batch/${id}/zh.html
   ```
9. Leftover English sentences — strip `<style>`, `<script>`, `.source-key` and `.chart-source` blocks, all tags and all `[…]` tags, then flag runs of 8+ consecutive Latin words:

   ```bash
   node -e "const h=require('fs').readFileSync(process.argv[1],'utf8').replace(/<(style|script)[\s\S]*?<\/\1>/gi,' ').replace(/<div class=\"(source-key|chart-source)\"[\s\S]*?<\/div>/g,' ').replace(/<[^>]+>/g,' ').replace(/\[[^\]]*\]/g,' ').replace(/&[a-z#0-9]+;/gi,' ');const m=h.match(/(?:[A-Za-z][A-Za-z'’.-]*[ ,]+){7,}[A-Za-z][A-Za-z'’.-]*/g)||[];console.log('latin_runs='+m.length);m.slice(0,5).forEach(x=>console.log('  '+x.slice(0,120)))" skills/kira-research-report/outputs/batch/${id}/zh.html
   ```

   `latin_runs` 0-3 → pass (long English law / company names, contact lines); list them in the commit message. `> 3` → failure path with `error_log: zh untranslated English (${latin_runs} runs)`.

Any other check failing → failure path (`error_log: zh page count Y/X`, `zh source tag drift`, `zh anti-positioning: <match>`, `zh title untranslated`, …).

### 5Z.3 — Publish branch

- **Stage D** → run **5.3** (5.3a-5.3d) with `PUBLISH_LANGS="en ja ko zh"`. The ZH tuple: `title` ← zh `<title>`, `eyebrow` ← `naming.eyebrow.zh`, `preview` / `toc` from zh.html, exactly like the other locales. Commit message `batch: complete ${id} (EN+JA+KO+ZH, published)`.
- **Stage E** → run **5Z.4** below.

### 5Z.4 — ZH-only publish (Stage E backfill)

`PUBLISH_LANGS="zh"`. Touches only the `zh` translation, the zh PDF and the zh preview; `living_reports` and the en/ja/ko rows stay exactly as they are (no `published_at` bump).

**a — Upsert the single `report_translations` row** (Supabase MCP `execute_sql`, same project; build it with a per-topic script like 5.3a):

```sql
INSERT INTO report_translations (report_id, locale, title, eyebrow, preview, toc, pdf_url, status, published_at)
SELECT lr.id, 'zh', $kbat$<zh title>$kbat$, $kbat$<zh eyebrow>$kbat$, $kbat$<preview json>$kbat$::jsonb, $kbat$<toc json>$kbat$::jsonb,
       lr.id::text || '/zh.pdf', 'published', now()
FROM living_reports lr
WHERE lr.id = '<REPORT_ID>'::uuid
ON CONFLICT (report_id, locale) DO UPDATE SET
  title = EXCLUDED.title, eyebrow = EXCLUDED.eyebrow,
  preview = EXCLUDED.preview, toc = EXCLUDED.toc,
  pdf_url = EXCLUDED.pdf_url, status = 'published', published_at = now()
RETURNING report_id, locale, title;
```

Zero rows returned → the report id does not exist → failure path (`zh backfill: report not found`). Eyebrow: `naming.eyebrow.zh` when `naming.json` exists; otherwise build `<country> · <industry> · <report kind>` from the `zh` labels in `references/naming_vocab.json`, matching the EN eyebrow of the published `en` row.

**b — Upload** `zh.pdf` and the zh preview: the 5.3b / 5.3b-2 loops with `PUBLISH_LANGS="zh"`.

**c — Verify**: 5.3c curls 2 + 3 with `loc=zh` only (`/zh/reports/<slug>` and `preview-html?…&locale=zh` → 200).

**d — Finalize**: commit + push the zh files, then advance. `--paths` must be the EXISTING `output_paths` from the `next` JSON with `|reports-pdfs/<report_id>/zh.pdf` appended (unless already present); `date_completed` is not touched for a backfill (it records the first publish).

```bash
git add skills/kira-research-report/outputs/batch/${id}/zh.html
git commit -m "batch: ZH backfill published for ${id}"
git push origin main
node skills/kira-research-report/scripts/queue.mjs advance ${id} done --paths "<existing output_paths>|reports-pdfs/<report_id>/zh.pdf" --model sonnet
```

(Deliberately not `batch: complete` — a backfill is not a new report and must not inflate the throughput count.)

`.gitignore` excludes `outputs/batch/*/*.pdf` so PDFs stay out of the public repo (Supabase Storage is canonical for PDFs).

---

## Step 6: Summary output (success path)

```
KIRA batch fire complete.
  ID: ${id}
  Stage advanced: <pending→en_done | en_done→ja_done | ja_done→done | ja_done→ko_done | ko_done→done | zh_backfill→done>
  Topic: ${topic}
  Status now: <en_done | ja_done | ko_done | done>
  Published locales: <none | en ja ko | en ja ko zh | zh (backfill)>
  Next pending: ${count} pending + ${count} en_done + ${count} ja_done + ${count} ko_done + ${count} zh_backfill in queue
```

Then exit. Do not start a second stage in the same fire — that's by design.

---

## Step 7: Failure path (any subagent errored or validation failed)

Mark the row failed (status `error`, `claimed_at` cleared, `error_log` set, a failure event logged with the stage duration). Commit generated files first only if there are any worth keeping:

```bash
node skills/kira-research-report/scripts/queue.mjs fail ${id} "<stage + one-line reason>" --model <model>
# e.g. "EN gen timeout 90m" · "JA section count 15/22" · "KO render-pdf 500" · "ZH translate timeout 75m"
```

For a Stage E row the existing `zh-backfill` token is kept automatically and `output_paths` is untouched (the EN/JA/KO paths are still live); for a partial failure that DID produce PDFs, add `--paths "<what exists>"`. Optionally `git add skills/kira-research-report/outputs/batch/${id}/ && git commit -m "batch: error on ${id} stage <A|B|C|D|E>" && git push origin main` to keep the partial HTML for inspection.

Print 1-line error summary + exit.

---

## Failure-mode reference

| What broke | What to do |
|---|---|
| Push rejected (remote ahead) | `git pull --rebase origin main` then re-push. Queue state is not in git, so conflicts can only touch `outputs/batch/${id}/`. |
| `/api/render-pdf` returns 500 | Vercel function timeout / chromium boot issue. Save HTML, set status=error, record HTTP code. Don't retry in same fire. |
| `/api/render-pdf` returns 401 | PDF_RENDER_SECRET missing or wrong. Set status=error with `render-pdf 401 (check env)`. |
| Skill fails at orchestrator (no blueprint match) | Topic is malformed. status=error with `no route from orchestrator`. |
| Translator overflows page char cap | Per translator_jp/ko/zh.md, trim padding + adverbs; if still over, drop a `<strong>` not a number/source tag. Validation gate doesn't enforce char caps — that's the translator's job. |
| Anti-positioning leak found | Validation gate in Step 4.3/5.2/5Z.2 catches this — sets status=error, flag for manual review. |
| EN section count mismatch | Set status=error with `EN section count <Y>/<X>`. Do NOT advance to JA. PDF (if any) stays on disk for inspection. |
| JA/KO/ZH page count mismatch | Means subagent dropped pages mid-translation (output cap hit). Set status=error with `<lang> page count <Y>/<X>`. Manually re-run after chunking fix. |
| JA/KO/ZH source tag set is not superset of EN | Translator localized a tag (e.g. `[BPS 2024]` → `[インドネシア統計庁 2024]` / `[印尼统计局 2024]`). status=error with `<lang> source tag drift`. |
| ZH renders as boxes / Japanese glyph shapes | zh.html is missing `lang="zh-Hans"` or the Noto Sans SC `<link>` (translator_zh.md §0). Gate 5Z.2 #7 should have caught it; fix the shell and re-render. |
| Timeout (90m EN, 75m JA/KO/ZH) | Subagent likely hung on API call. status=error with `<stage> timeout <N>m`. |
| Stage B/D/E picked but en.html missing | Edge case (someone deleted file). status=error with `en.html missing for <ja|zh> stage`. |
| Stage D picked but ko.html missing | status=error with `ko.html missing for zh stage`; reset to `ja_done` after checking. |

---

## What this prompt is NOT

- Not a place to add new features — keep it stable so cron behavior is predictable
- Not a place for chitchat — every fire is a fresh session, NO human is present
- Not a place to ask clarifying questions — if the row is malformed, set status=error + exit

---

## When run manually for testing

If Henry clicks "Run now" on a task or runs this prompt manually outside the cron, behavior is identical. To force a single row through all stages back-to-back for testing, click "Run now" on the relevant task 4 times in a row (3 for a legacy `en,ja,ko` row; each fire advances 1 stage as long as it picks the same row).

---

## Page-class fix (2026-05-25, post-first-Q.1-run)

Discovered during `2026-vn-fintech` manual run: the playbook referenced `<div class="kira-page">` but the actual rendered HTML (from `render_and_output.md` skill output) uses `<div class="page">` for body pages and `<div class="page cover-page">` for the cover. Subdivs (`page-inner`, `page-header`, etc.) are NOT page boundaries.

Fixed in §4.1 (count), §4.2 (subagent prompt), §4.3 (validation regex), §5.1 (KO inheritance), §5.3a (publish step pages count), and this changelog. Use regex `<div class="page[" ]` — character class `[" ]` excludes subdivs like `<div class="page-inner">`.

Also clarified §4.3 validation #4 (source-tag superset) — a descriptive tail translation inside a tag that preserves the publisher alias is acceptable; only a localized publisher alias or a missing alias entirely fails the gate. Real example: `[Kira estimates · computed from active-user-share above]` → `[Kira estimates · 上記アクティブ利用者シェアから算出]` is acceptable.

---

## Phase S4 changelog (2026-10-05) — Simplified Chinese (`zh`)

- **4th language.** New rows default to `target_languages = "en,ja,ko,zh"` (`sync-approved-topics.mjs`, env `QUEUE_TARGET_LANGUAGES` overrides). Rows without `zh` keep the 3-fire flow unchanged.
- **New statuses:** `ko_done` (zh rows: KO committed, nothing published), `zh_in_progress`, `zh_backfill`.
- **Fire C** for a zh row ends at `ko_done` and does NOT publish. **Fire D** (`ko_done`) translates ZH with `translator_zh.md` (sonnet, 75 min, same chunked per-page protocol) and publishes all four languages (5.3 with `PUBLISH_LANGS="en ja ko zh"`).
- **Fire E** (`zh_backfill`) translates ZH for an already-published report and publishes only the `zh` translation + zh PDF + zh preview (5Z.4, idempotent upsert), leaving `living_reports` and en/ja/ko untouched. Lowest priority.
- **Routing:** `ko_done > ja_done > en_done > pending > zh_backfill`.
- **ZH gate (5Z.2):** page count == EN, competitor grep incl. Chinese names, ZH anti-positioning grep (本平台, AI驱动, 贵公司 …), source-tag superset, `<title>` translated, `lang="zh-Hans"` + Noto Sans SC link, no kana/hangul, ≤ 5 Traditional characters, ≤ 3 leftover 8+-word English runs.
- **Auto-recovery:** `zh_in_progress` → `ko_done`, or → `zh_backfill` when `error_log` carries the `zh-backfill` token or `output_paths` is filled.
- **Fonts:** `master_styles.css` puts `var(--font-cjk)` in every font stack; `html:lang(ja|ko|zh)` sets Noto Sans JP / KR / SC. Each translated file still loads its Noto webfont via a Google Fonts `<link>`.

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
