# insight_runner.md — scheduled insight pages built from published reports

Fired by the insight Routine (a separate routine from the batch runner; paused until the owner restarts it). Each fire is a **fresh Claude session with no memory** of any prior conversation, on an empty disk: everything needed is in this prompt and the scripts it names.

---

## Mission (owner, 2026-10-13: replaces the Phase Q.2 / Q.6 design)

For every published report, publish **one insight, the report's own executive-summary page plus its first chart page, in every language the report has** (EN, JA, KO, ZH). The pages are cut out of the finished report HTML as they are: same words, same numbers, same chart, same translation. **No LLM writes or translates anything here.** One report takes seconds, so one fire clears the whole backlog.

Why the old design was retired (3 sections lifted as text + a table-only "key data metrics" insight, then re-translated to JA/KO): the pages carried no conclusion or chart, the tables had no commentary, the translations repeated work the report already has, and nothing was made for ZH. The old insights stay live (see "Old insights").

What is public: the executive-summary page and the next chart page. The implication / "where to compete" pages stay in the paid report. Do not change the page choice per report by hand; the choice is made by the script.

---

## Step 0: Pre-flight

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
for c in "$REPO_ROOT" "$HOME/kira-research" /home/user/kira-research; do
  [ -n "$c" ] && [ -f "$c/skills/kira-research-report/SKILL.md" ] && REPO_ROOT="$c" && break
done
cd "$REPO_ROOT" || { echo "ERROR: cannot find the kira-research checkout"; exit 1; }
git pull --ff-only origin main
[ -d node_modules ] || npm ci --no-audit --no-fund
export KIRA_BRAIN_DIR="$(dirname "$REPO_ROOT")/kira-pipeline/brain"     # the private archive lives next to the brain
export PW_CHROMIUM_PATH="${PW_CHROMIUM_PATH:-/opt/pw-browsers/chromium}"
for v in SUPABASE_URL SUPABASE_SERVICE_KEY; do [ -n "${!v}" ] || echo "MISSING $v"; done
[ -d "$(dirname "$KIRA_BRAIN_DIR")/report-archive" ] || echo "MISSING kira-pipeline report-archive"
```

Any `MISSING` line → EXIT with `missing <what>, no-op`. Re-export the two variables in every later shell call (shell state does not persist). Never `git add` anything under `skills/kira-research-report/outputs/` (git-ignored; the report folders come from the private archive).

---

## Step 1: Make the insights

```bash
node skills/kira-research-report/scripts/make-insight.mjs --pending 20
```

It takes the 20 oldest published reports that have no executive-summary insight yet (or lack a language their report has) and, per report: finds its batch folder, restores it from the private archive (`archive-batch.mjs pull`), checks that page 4 of the folder's English file is exactly the published preview's page 4, cuts the pages (`extract-insight-pages.mjs --pages auto`), upserts `insights` + `insight_translations` (slug `<industry>-<country>-exec-summary-<year>`, or `<report-slug>-exec-summary` when another report already has that one; category `market-analysis`; the report's cover) and renders the cover slides (`upload-insight-slide.mjs`, not fatal). It prints one JSON line per report and a last `{"summary":true,...}` line. Exit code 1 only when a report **failed**.

| `status` | Meaning | What to do |
|---|---|---|
| `published` | insight live in every language that passed its checks (`locales`) | nothing; if `skippedLocales` is not empty or `slides` is `failed…`, mention it in the summary |
| `skipped` | the report cannot be done by script: `extract:` an unusual layout or no chart page (`pages … layout the insight styles do not cover`), or no batch folder for it | nothing now; list it in the summary. It is retried every fire and costs nothing. A report whose layout is new needs CSS in `public/css/kira.css` (`.kp-*`) first |
| `failed` | something broke: archive pull, **page 4 differs from the published preview** (the folder is not the published version of the report), a database error | do not retry in this fire; list the `reason` in the summary |

`notes` are warnings that do not block: "figures in EN not found here" (a translation restated a chart label), "refers to a section/exhibit/page number". Mention at most the count.

`--report <report-slug>` does one report, `--dry-run` builds and checks without writing, `--draft` saves hidden drafts. No other options are needed in a scheduled fire.

---

## Step 2: Verify

For each `published` line (at most 5 per fire, the first ones):

```bash
for loc in en ja ko zh; do curl -s -o /dev/null -w "$loc %{http_code}\n" "https://kiraresearch.com/api/insight?slug=<slug>&locale=$loc&_t=$(date +%s)"; done
```

`en` and every locale in `locales` must be 200 (a locale that is not in `locales` correctly falls back, status 200 with `isFallback`). Any other result → list it in the summary; do not change the database by hand.

---

## Step 3: Summary

```
KIRA insight fire complete.
  Reports checked: <n> · published: <n> · skipped: <n> · failed: <n>
  Skipped (script cannot do these): <slug> (<short reason>), …
  Failed: <slug> (<reason>), …
  Skipped languages: <slug> <loc: reason>, …
```

Exit. No commit is needed (insights live in the database; covers in Storage).

---

## How the script chooses and checks (reference)

- **Pages (`--pages auto`)**: the first page after the contents page(s) that holds a chart, then the next page with a chart (up to page 14). A report with no second chart page gets a one-page insight. Three layouts are styled: `exec` (callout cards + chart card), `classic` (older callout-row + chart-card) and `exhibit` (exhibit + commentary + takeaway, the BRAIN route). Another layout → `skipped`.
- **Per language**: the page count must equal the English file's, the chosen pages must have the same layout, the figures of the English page must still be present (under 75% → that language is left out), and no forbidden term (`Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey`, plus the katakana / hangul spellings of Claude when not part of a longer word) may appear. A language that fails is left out; if English fails nothing is written.
- **Title / lede**: the report's cover title before the colon + the page headline; the page's own sub-headline (or kicker) is the lede. The page's section label is the opening heading.
- **Charts**: chart colours come from `public/css/kira.css`. The block between `BEGIN report-chart-css` and `END report-chart-css` is generated from `templates/master_styles.css` by `scripts/sync-insight-chart-css.mjs`; run it (and commit) whenever the exhibit styles in `master_styles.css` change (`--check` tells whether it is out of date). A few older reports style a chart class in their own `<style>`; the script copies those rules into the insight.
- **Slugs / covers**: the insight uses the report's cover for `cover_url`; its own 800x450 cover slide per language is rendered by `upload-insight-slide.mjs`.

---

## Old insights (decision of 2026-10-13)

The 214 insights made by the old runner (3 lifted sections per report, 25 table-only "key data metrics" pages, a few seed articles) stay as they are, except the table-only pages, which have no commentary or chart and were retired (`status = 'retired'`; to bring one back set `insights.status` and its `insight_translations.status` to `published`). Review the rest with Search Console after 4–6 weeks (which pages get impressions and clicks) before retiring or redirecting more.

---

## Failure-mode reference

| What broke | What to do |
|---|---|
| `MISSING …` in Step 0 | EXIT with `missing <what>, no-op`. |
| `archive pull: kira-pipeline not found` | `KIRA_BRAIN_DIR` is wrong or the repo is not cloned next to this one. Fix the export; do not skip. |
| `skipped … no batch folder` | The report is not in `report_queue.output_paths` and has no `naming.json`: add it to `scripts/lib/report-folders.json` (slug → folder id). |
| `failed … page 4 differs from the published preview` | The folder holds another version than the published one (a refresh, or the wrong folder). Leave it; the owner decides which is right. |
| `skipped … layout the insight styles do not cover` | New template: add its classes to the `.kp-*` block in `public/css/kira.css` and to `familyOf` in `extract-insight-pages.mjs`. |
| Chart renders black / flat | A chart class has no style: `make-insight` notes `chart classes with no style anywhere`; add it to `master_styles.css` and run `sync-insight-chart-css.mjs`. |
| `slides: failed` | Chromium or `sharp` missing. Not fatal (cards fall back to the cover art). Run `node skills/kira-research-report/scripts/upload-insight-slide.mjs --slug <slug>` later. |

---

## What this prompt is NOT

- Not a place to write or rewrite insight text: nothing is generated, every word is the report's.
- Not a place to ask questions: log the result and exit.
- Not a place to touch the old insights, the report pages or the queue.
