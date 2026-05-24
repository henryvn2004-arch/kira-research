---
name: kira-batch-cron-system
description: "13 daily scheduled tasks fire batch_runner.md to gen 1 topic × EN+JA+KO from data/report_queue.csv (45-min cadence, 12am-7am + 5pm-7pm ICT)"
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## What this is

Henry's KIRA Research has a daily batch report generation system built on top of the `kira-research-report` skill ("[[project_tool_gen_report|tool gen report]]"). Scheduled tasks (`mcp__scheduled-tasks`) fire daily and pull 1 pending topic per fire from `data/report_queue.csv`, gen it as a 3-language report (EN + JA + KO), auto-publish to Supabase, commit results.

## Current schedule (Phase O.13 — 2026-05-24)

**13 active tasks, 45-min cadence:**

| Task ID | Cron | Local ICT |
|---|---|---|
| `kira-batch-0000` | `0 0 * * *` | 12:00 AM |
| `kira-batch-0045` | `45 0 * * *` | 12:45 AM |
| `kira-batch-0130` | `30 1 * * *` | 01:30 AM |
| `kira-batch-0215` | `15 2 * * *` | 02:15 AM |
| `kira-batch-0300` | `0 3 * * *` | 03:00 AM |
| `kira-batch-0345` | `45 3 * * *` | 03:45 AM |
| `kira-batch-0430` | `30 4 * * *` | 04:30 AM |
| `kira-batch-0515` | `15 5 * * *` | 05:15 AM |
| `kira-batch-0600` | `0 6 * * *` | 06:00 AM |
| `kira-batch-0645` | `45 6 * * *` | 06:45 AM |
| `kira-batch-1700` | `0 17 * * *` | 05:00 PM |
| `kira-batch-1745` | `45 17 * * *` | 05:45 PM |
| `kira-batch-1830` | `30 18 * * *` | 06:30 PM |

**Disabled (history)**: `kira-batch-01am`, `kira-batch-05am`, `kira-batch-1215pm`, `kira-batch-05pm` — old 4-task schedule, replaced 2026-05-24 with 13-task fan-out.

System auto-applies 0-10 min random jitter per task to spread load. All tasks share the same prompt (delegate to `batch_runner.md` in repo).

## Capacity calculation

- 13 fires/day × 1 topic each = 13 topics processed/day
- Each topic produces 3 reports (EN + JA + KO) → **~39 reports published/day**
- Queue depth needed: 13/day → 50-topic queue lasts ~4 days
- Per fire cost: ~450K tokens (parent + 3 subagents). On Max 5x: 13 fires × 450K = 5.85M tokens/day ≈ 41M/week — well within Max 5x weekly budget.

## Architecture

```
data/report_queue.csv  ◄────────────── Henry edits this file (or Claude auto-gens topics)
       │                               Adds rows with status=pending
       ▼
13 scheduled tasks (Claude Code .claude/scheduled-tasks/):
  kira-batch-HHMM × 13 (45-min cadence in two blocks)
       │
       │ Each fires a FRESH Claude session (no memory of past sessions)
       │ The prompt tells it to read + execute:
       ▼
skills/kira-research-report/prompts/batch_runner.md
       │  Self-contained: claim row → spawn subagents → gen EN → translate JA → translate KO
       │                  → auto-publish (Supabase upsert + Storage upload) → commit
       ▼
skills/kira-research-report/outputs/batch/<id>/
       ├─ en.html · en.pdf  (PDF only in Storage, .gitignored in repo)
       ├─ ja.html · ja.pdf
       └─ ko.html · ko.pdf
       │
       ▼
kiraresearch.com/en/library/<slug>  (auto-published, status='published')
```

## Concurrency / overlap behavior

45-min gap is shorter than typical batch fire duration (30-90 min). Two fires can overlap — but the **claim-then-commit** pattern in batch_runner.md Step 2 makes this safe:

- Fire A at 00:00 → claims first pending row → set `in_progress` → commits within 10s
- Fire B at 00:45 → reads queue → row A is already `in_progress` → claims NEXT pending row
- No double-claim possible

If queue is empty when a fire triggers → fire exits cleanly with "No pending work" message, ~1 prompt of quota burned.

## Key constraints

- **App must be running.** Claude Code must be open on Henry's machine for crons to fire. If closed at fire time, task runs on next launch (catches up missed fires).
- **1 topic per fire.** Sonnet on Max 5x: each topic × 3 langs ≈ 450K tokens. Going higher risks context overflow.
- **Token budget is the constraint, not API rate limits.** Max 5x message quota is comfortable at 13 fires/day; the binding limit is Sonnet's context window per conversation.
- **EN-first-then-translate.** JA and KO are translated from EN (charts reused, labels swapped). NOT generated from scratch in each language — would 3x cost + risk number drift across languages.
- **Subagent-per-phase.** batch_runner spawns 3 separate general-purpose subagents (EN gen, JA translate, KO translate) so each gets a fresh 200K context. Parent batch_runner only orchestrates.

## Where to look when things break

- **No new reports overnight:** Check `data/report_queue.csv` — does it have pending rows? Check `.claude/scheduled-tasks/kira-batch-*/SKILL.md` — are tasks still enabled? Check if Claude Code was running at fire time.
- **Reports erroring:** Check `error_log` column in queue.csv. Common: `/api/render-pdf` 500 (chromium boot), 401 (PDF_RENDER_SECRET missing), translation overflow, section-count mismatch.
- **Brand violation slipped in:** Run anti-positioning grep on `outputs/batch/*` — should be zero hits for Mordor/Frost/Euromonitor/Synovate/Ipsos/IMARC/Claude/McKinsey.
- **Fire didn't trigger at scheduled time:** Open Claude Code → check Scheduled section in sidebar → see `nextRunAt` and `lastRunAt`. Use `mcp__scheduled-tasks__list_scheduled_tasks` from any Claude Code session.
- **Stuck `in_progress` row:** Fire was killed mid-run (Claude Code closed, OS crash). Manually edit CSV to flip status back to `pending`, commit, push — next fire picks it up. The orphan output dir under `outputs/batch/<id>/` can stay for inspection.

## Files involved (committed to repo)

- `data/report_queue.csv` — the queue (Henry edits, or auto-bumped via agent)
- `data/README.md` — schema docs for queue.csv
- `skills/kira-research-report/prompts/batch_runner.md` — orchestrator prompt fired by cron
- `skills/kira-research-report/prompts/translator_jp.md` — JP voice guide + translation rules
- `skills/kira-research-report/prompts/translator_ko.md` — KO voice guide + translation rules
- `skills/kira-research-report/outputs/batch/` — output directory (each report gets a subdir keyed by `id`; PDFs .gitignored, HTMLs tracked)

## Files NOT committed (live in user's Claude Code config)

13 task directories: `C:\Users\vnc-f4\.claude\scheduled-tasks\kira-batch-{0000,0045,0130,0215,0300,0345,0430,0515,0600,0645,1700,1745,1830}\SKILL.md`

→ **If Henry switches machines, scheduled tasks won't follow.** They need to be recreated on the new machine. To recreate: call `mcp__scheduled-tasks__create_scheduled_task` 13 times with the cron expressions above. The prompt body is identical for all 13 — just delegate to `batch_runner.md` in repo.

## Per-machine env vars

Batch fires need 3 env vars set in the **Windows User scope** of every machine that runs the cron. All three live as source of truth in **Vercel project env** (kira-research → Settings → Environment Variables). Mirror them locally — they cannot be derived. After setting, restart Claude Code so child processes inherit them.

| Var | Used for |
|---|---|
| `PDF_RENDER_SECRET` | header `X-Api-Key` on POST `/api/render-pdf` |
| `SUPABASE_URL` | `https://iygoynbnscednfzdsflc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Bearer token on Supabase Storage upload + signed-URL generation |

**Reusable helper scripts** in `skills/kira-research-report/scripts/`:
- `render-one.mjs` — POST HTML to `/api/render-pdf`, decode base64 → write PDF.
- `upload-pdf.mjs` — POST PDF to Supabase Storage bucket `reports-pdfs/<report-id>/<locale>.pdf`.
- `_build_vn_coffee_sql.mjs` — one-off SQL builder template; copy + adapt per-topic.

## Pre-approval gotcha

First time each task fires, Claude Code prompts for tool approvals (Read, Write, Edit, Bash, Agent, ToolSearch). To avoid the cron pausing on these prompts:

> **Henry: click "Run now" on `kira-batch-0000` (or any one task) in the Scheduled sidebar BEFORE first auto-fire.** Approve each tool when prompted. Subsequent fires auto-apply.

OR enable auto-approve for tools in Claude Code settings — Henry's preferred path.

## Cost / billing notes

- Runs on Henry's Claude Code Max 5x ($100/mo) plan quota — NOT direct API billing
- Each fire ≈ 450K tokens spread across parent + 3 subagents
- 13 fires/day × 30 days = ~175M tokens/month
- Max 5x weekly limit should comfortably accommodate this; if rate-limited, disable some tasks (start with `kira-batch-0215`, `0345`, `0515` — middle-of-block slots that are most redundant)

## Phase O.13 changelog (2026-05-24)

- Replaced 4 daily tasks with 13 (45-min cadence in 2 blocks). ~3.25x throughput increase.
- Queue bumped +50 SEA topics (10 VN, 8 ID, 7 TH, 5 MY/PH/SG/JP/KR each).
- Documented overlap-safe claim-then-commit pattern (was implicit before).

See also: [[project_tool_gen_report]] · [[reference_kira_research]] · [[feedback_sparticuz_chromium_vercel]] · [[project_o_studio_credits]]
