# batch_monitor.md — overnight queue + scheduler health check

Self-contained monitor for the 13-fire batch scheduler ([[project_batch_cron_system]]). Each run is a FRESH Claude session — everything needed is in this prompt.

---

## Mission

1. Pull latest `data/report_queue.csv` from `origin/main`.
2. Parse the queue. Count rows by status.
3. Detect anomalies (stuck `in_progress` rows, fresh `error` rows).
4. Output a structured summary so the owner (Henry) can see overnight progress at a glance when he opens Claude Code in the morning.
5. If anomalies are obvious + safe to auto-fix (stuck `in_progress` from a killed fire) → fix + commit + push.
6. Never block. Never ask for clarification — there is no human in this session.

---

## Working directory

`C:\Users\vnc-f4\Rira Research\kira-research`

Use Bash (forward slashes): `/c/Users/vnc-f4/Rira Research/kira-research`.

---

## Step 1: Pull latest

```bash
git pull --rebase origin main
```

If pull errors (conflict, etc.) → log and skip. Don't bail — we can still read the local CSV.

---

## Step 2: Parse queue

Read `data/report_queue.csv`. Columns:
`id,topic,country,industry,year,target_languages,status,output_paths,date_added,date_completed,error_log`

Count rows by `status`:
- `pending`
- `in_progress`
- `done`
- `error`

---

## Step 3: Detect stuck rows

For each `in_progress` row:
- Run `git log --oneline -1 --pretty=format:"%H|%ai|%s" -- data/report_queue.csv` filtered to commits mentioning the row's `id` (e.g. `batch: claim 2026-vn-fintech for in_progress`).
- Parse the commit's ISO timestamp. If older than **2 hours** from now → row is **stuck** (the fire that claimed it died mid-pipeline, never set status=done or error).

For each stuck row:
- Flip its `status` back to `pending` in the CSV.
- Append `[Auto-reset by monitor at <ISO timestamp>] previous claim stuck` to its `error_log` column (preserve any existing log content).

If at least one stuck row was reset, commit + push:
```bash
git add data/report_queue.csv
git commit -m "monitor: reset N stuck in_progress row(s) → pending"
git push origin main
```

---

## Step 4: List recent errors

For each `error` row where `date_completed` is today (`YYYY-MM-DD` matches `$(date -u +%Y-%m-%d)` or yesterday in ICT), include in the summary:
- `id`
- `topic` (truncated to 60 chars)
- `error_log` (full content)

These are reports the system tried and failed on overnight. Henry needs to know to debug or skip the topic.

---

## Step 5: Output structured summary

Print to stdout in this exact format (Claude Desktop will save the task output, Henry can review in the Scheduled panel):

```
KIRA batch monitor — <ISO timestamp>
─────────────────────────────────
Queue state:
  pending      : <N>
  in_progress  : <N>
  done         : <N> (lifetime)
  error        : <N>

Overnight (since previous monitor run):
  Newly done   : <N> reports → <list of 'id' values>
  Newly errored: <N> reports → <list of 'id' values, with first 100 chars of error_log>
  Stuck reset  : <N> rows  → <list>

Next scheduled batch fire: <use mcp__scheduled-tasks__list_scheduled_tasks to find earliest nextRunAt among kira-batch-* (excluding monitor itself)>

Quota state: cannot verify from inside Claude Code; if recent fires all aborted with empty output, check Anthropic Max plan dashboard for weekly cap.
```

"Newly done" / "newly errored" = rows whose `date_completed` field equals today's UTC date (or matches the window since the last monitor run if you can derive that from git log; otherwise use 'today').

---

## Step 6: Exit

Print summary. Do not commit anything except the optional stuck-row reset from Step 3. Do not modify any other file. Exit cleanly.

---

## What this monitor is NOT

- Not a place to gen reports (that's `batch_runner.md`)
- Not a place to refill the queue (that's a separate task / agent invocation)
- Not a place to make `error` rows go away by force — they need human review (Henry decides: retry, skip, or fix topic)
- Not a place to delete any data — only flip `status` field from `in_progress` → `pending` on stuck rows
