---
name: kira-batch-cron-system
description: "4 daily scheduled tasks fire batch_runner.md to gen 1 topic × EN+JA+KO from data/report_queue.csv"
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## What this is

Henry's KIRA Research has a daily batch report generation system built on top of the `kira-research-report` skill ("[[project_tool_gen_report|tool gen report]]"). 4 scheduled tasks (`mcp__scheduled-tasks`) fire daily and pull 1 pending topic per fire from `data/report_queue.csv`, gen it as a 3-language report (EN + JA + KO), commit results.

## Architecture

```
data/report_queue.csv  ◄────────────── Henry edits this file (Excel/Sheets/text editor)
       │                               Adds rows with status=pending
       ▼
4 scheduled tasks (Claude Code .claude/scheduled-tasks/):
  ├─ kira-batch-01am   (cron: 7 1 * * *, fires ~01:13 AM ICT)
  ├─ kira-batch-05am   (cron: 7 5 * * *, fires ~05:12 AM ICT)
  ├─ kira-batch-1215pm (cron: 15 12 * * *, fires ~12:18 PM ICT)
  └─ kira-batch-05pm   (cron: 7 17 * * *, fires ~17:12 PM ICT)
       │
       │ Each task fires a FRESH Claude session (no memory of past sessions)
       │ The prompt tells it to read + execute:
       ▼
skills/kira-research-report/prompts/batch_runner.md
       │  Self-contained: claim row → spawn subagents → gen EN → translate JA → translate KO → commit
       ▼
skills/kira-research-report/outputs/batch/<id>/
       ├─ en.html · en.pdf
       ├─ ja.html · ja.pdf
       └─ ko.html · ko.pdf
       │
       ▼
Henry opens /en/admin/reports.html on kiraresearch.com → click "Upload PDF" per locale → set status=published
```

## Key constraints

- **App must be running.** Claude Code must be open on Henry's machine for crons to fire. If closed at fire time, task runs on next launch (catches up missed fires).
- **1 topic per fire.** Sonnet on Max 5x: each topic × 3 langs ≈ 450K tokens. Going higher risks context overflow or quota burn.
- **Token budget is the constraint, not API rate limits.** Max 5x message quota is comfortable; the binding limit is Sonnet's context window per conversation.
- **EN-first-then-translate.** JA and KO are translated from EN (charts reused, labels swapped). NOT generated from scratch in each language — that would 3x the token cost and risk number drift across languages.
- **Subagent-per-phase.** batch_runner spawns 3 separate general-purpose subagents (EN gen, JA translate, KO translate) so each gets a fresh 200K context. Parent batch_runner only orchestrates.

## Where to look when things break

- **No new reports overnight:** Check `data/report_queue.csv` — does it have pending rows? Check `.claude/scheduled-tasks/kira-batch-*/SKILL.md` — are tasks still enabled? Check if Claude Code was running at fire time.
- **Reports erroring:** Check `error_log` column in queue.csv. Common: `/api/render-pdf` 500 (chromium boot), 401 (PDF_RENDER_SECRET missing), translation overflow.
- **Brand violation slipped in:** Run the anti-positioning grep from [[sparticuz-chromium-vercel-gotchas]] (or troubleshooting.md item #9) against `outputs/batch/`. Should be zero hits.
- **Fire didn't trigger at scheduled time:** Open Claude Code → check Scheduled section in sidebar → see `nextRunAt` and `lastRunAt`. Use `mcp__scheduled-tasks__list_scheduled_tasks` from any Claude Code session.

## Files involved (committed to repo)

- `data/report_queue.csv` — the queue (Henry edits)
- `data/README.md` — schema docs for queue.csv
- `skills/kira-research-report/prompts/batch_runner.md` — orchestrator prompt fired by cron
- `skills/kira-research-report/prompts/translator_jp.md` — JP voice guide + translation rules
- `skills/kira-research-report/prompts/translator_ko.md` — KO voice guide + translation rules
- `skills/kira-research-report/outputs/batch/` — output directory (each report gets a subdir keyed by `id`)

## Files NOT committed (live in user's Claude Code config)

- `C:\Users\vnc-f4\.claude\scheduled-tasks\kira-batch-01am\SKILL.md`
- `C:\Users\vnc-f4\.claude\scheduled-tasks\kira-batch-05am\SKILL.md`
- `C:\Users\vnc-f4\.claude\scheduled-tasks\kira-batch-1215pm\SKILL.md`
- `C:\Users\vnc-f4\.claude\scheduled-tasks\kira-batch-05pm\SKILL.md`

→ **If Henry switches machines, scheduled tasks won't follow.** They need to be recreated on the new machine. To recreate: call `mcp__scheduled-tasks__create_scheduled_task` 4 times with the cron expressions and prompts from `batch_runner.md` references. Or re-run a setup script.

## Per-machine env vars

Batch fires need 3 env vars set in the **Windows User scope** of every machine that runs the cron. All three live as the source of truth in the **Vercel project env** (kira-research → Settings → Environment Variables). Mirror them locally — they cannot be derived, they must be copied. After setting, restart Claude Code so child processes inherit them.

| Var | Used for | Why both Vercel + local? |
|---|---|---|
| `PDF_RENDER_SECRET` | header `X-Api-Key` on POST `/api/render-pdf` | Vercel server verifies; local client adds to header |
| `SUPABASE_URL` | `https://iygoynbnscednfzdsflc.supabase.co` | Local upload script needs to know where to POST |
| `SUPABASE_SERVICE_KEY` | Bearer token on Supabase Storage upload + signed-URL generation | RLS bypass for writes to `reports-pdfs` bucket |

vnc-f4 setup state (2026-05-23): all 3 env vars set as User-scope. Restart-of-Claude-Code already happened during the smoke run. Process inheritance works.

**Reusable helper scripts** in `skills/kira-research-report/scripts/`:
- `render-one.mjs` — POST HTML to `/api/render-pdf`, decode base64 → write PDF. Sidesteps the Windows PowerShell ConvertTo-Json long-string bug ([[powershell-convertto-json-string-wrap]]) that broke the first manual smoke run.
- `upload-pdf.mjs` — POST PDF to `<SUPABASE_URL>/storage/v1/object/reports-pdfs/<report-id>/<locale>.pdf` with `x-upsert: true`. Returns the storage key on 200.
- `_build_vn_coffee_sql.mjs` — one-off SQL builder template; copy + adapt per-topic for the `INSERT living_reports + INSERT report_translations` CTE.

## Pre-approval gotcha

First time each task fires, Claude Code prompts for tool approvals (Read, Write, Edit, Bash, Agent, ToolSearch). To avoid the cron pausing on these prompts:

> **Henry: click "Run now" on `kira-batch-1215pm` (or any one task) in the Scheduled sidebar BEFORE first auto-fire.** Approve each tool when prompted. Subsequent fires auto-apply the same approvals.

This first manual run also doubles as the smoke test — it'll gen the sample row (Vietnam coffee 2026) and you can verify EN+JA+KO PDFs land correctly before the cron starts unattended.

## Cost / billing notes

- Runs on Henry's Claude Code Max 5x ($100/mo) plan quota — NOT direct API billing
- Each fire ≈ 450K tokens spread across parent + 3 subagents
- 4 fires/day × 30 days = ~54M tokens/month
- Max 5x weekly limit should comfortably accommodate this; if rate-limited, drop to 2 fires/day (1am + 12:15pm) and reduce queue intake

## Future work

- ~~**Auto-upload to Supabase:**~~ ✅ Done 2026-05-23. batch_runner.md Step 6 auto-inserts `living_reports` + 3 `report_translations` (status=published), uploads 3 PDFs to `reports-pdfs/<report-id>/<locale>.pdf`, and verifies via cache-busted curl. Owner decision: "if report is bad, delete and regen, no big deal" — keep flow tight, no human gate.
- ~~**Storage upload:**~~ ✅ Done 2026-05-23 alongside auto-upload. `library-content.js` `resolvePdfUrl()` generates fresh 1-hour signed URLs on every buyer call. Storage paths are private; URL alone doesn't grant access.
- **Cross-machine task sync:** Scheduled tasks live in `.claude/scheduled-tasks/` per machine. A "setup script" that recreates the 4 tasks would help if Henry switches machines mid-week. The same setup script should also set `PDF_RENDER_SECRET`, `SUPABASE_URL`, and `SUPABASE_SERVICE_KEY` as User env vars (all 3 currently set on vnc-f4 only).
- **Better queue UI:** CSV editing works for now. Could add a `/en/admin/queue-builder.html` form later. Henry deferred this to Phase 3 of the original tool gen report build.
- **PDFs in git repo:** Batch still commits PDFs to the public repo alongside Supabase Storage upload. Double-storage works but bloats repo size (3 × ~600 KB per topic). Future optimization: stop committing PDFs to git once Storage is the source of truth (would need .gitignore for `outputs/batch/*/*.pdf` + keep only HTML + logs in repo for archival).

See also: [[project_tool_gen_report]] · [[reference_kira_research]] · [[feedback_sparticuz_chromium_vercel]]
