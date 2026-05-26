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

## Current schedule (Phase Q.3 — 2026-05-25)

**18 active tasks** = 3 evening (45-min) + 5 bridge (60-min) + 10 overnight (45-min). Max gap = ~60 min anywhere in 24h.

| Task ID | Cron | Local ICT | Block |
|---|---|---|---|
| `kira-batch-1700` | `0 17 * * *` | 05:00 PM | Evening |
| `kira-batch-1745` | `45 17 * * *` | 05:45 PM | Evening |
| `kira-batch-1830` | `30 18 * * *` | 06:30 PM | Evening |
| `kira-batch-1930` | `30 19 * * *` | 07:30 PM | **Bridge (NEW Q.3)** |
| `kira-batch-2030` | `30 20 * * *` | 08:30 PM | Bridge |
| `kira-batch-2130` | `30 21 * * *` | 09:30 PM | Bridge |
| `kira-batch-2230` | `30 22 * * *` | 10:30 PM | Bridge |
| `kira-batch-2330` | `30 23 * * *` | 11:30 PM | Bridge |
| `kira-batch-0000` | `0 0 * * *` | 12:00 AM | Overnight |
| `kira-batch-0045` | `45 0 * * *` | 12:45 AM | Overnight |
| `kira-batch-0130` | `30 1 * * *` | 01:30 AM | Overnight |
| `kira-batch-0215` | `15 2 * * *` | 02:15 AM | Overnight |
| `kira-batch-0300` | `0 3 * * *` | 03:00 AM | Overnight |
| `kira-batch-0345` | `45 3 * * *` | 03:45 AM | Overnight |
| `kira-batch-0430` | `30 4 * * *` | 04:30 AM | Overnight |
| `kira-batch-0515` | `15 5 * * *` | 05:15 AM | Overnight |
| `kira-batch-0600` | `0 6 * * *` | 06:00 AM | Overnight |
| `kira-batch-0645` | `45 6 * * *` | 06:45 AM | Overnight |

Daytime gap (06:45 → 17:00) still ~10h15m by design — Henry usually works on the other machine during day.

**Disabled (history)**: `kira-batch-01am`, `kira-batch-05am`, `kira-batch-1215pm`, `kira-batch-05pm` — old 4-task schedule, replaced 2026-05-24 with 13-task fan-out (later expanded to 18 in Q.3).

System auto-applies 0-10 min random jitter per task to spread load. All tasks share the same prompt (delegate to `batch_runner.md` in repo).

## Capacity calculation (Phase Q.3 — 18 fires/day)

Post-Q.1 multi-fire split: each report needs 3 fires (Stage A/B/C). So:

- 18 fires/day ÷ 3 stages = **~6 reports/day fully published** (steady-state)
- Each report = 3 PDFs (EN + JA + KO) → **~18 PDFs/day**
- Queue depth needed: 6/day → 50-topic queue lasts ~8 days
- Per fire cost: ~150-450K tokens (Stage A heavier than B/C). On Max 5x: 18 × ~250K avg = 4.5M tokens/day ≈ 32M/week — within Max 5x weekly budget.
- Max wait between stages: ~60 min (Q.3 bridge closed the 5h30m evening↔overnight gap).
- Worst-case per-report latency: claim Stage A at 06:45 (last overnight fire) → wait ~10h15m (daytime gap) → Stage B at 17:00 → Stage C at 17:45 → done in ~11h30m. (Daytime gap still present by design — Henry uses other machine.)
- Best-case: claim Stage A at 00:00 → Stage B at 00:45 → Stage C at 01:30 → done in ~1h30m.

## Pre-Q.3 capacity (history)

Pre-2026-05-25, the schedule was 13 fires/day with a 5h30m gap between block 2 end (18:30) and block 1 start (00:00). At Q.1 (3-fire-per-report), this caused worst-case ~18h latency when Stage A claimed at 18:30. Q.3 added 5 evening bridge fires (19:30/20:30/21:30/22:30/23:30) to close that gap; daytime gap retained.

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

## Pre-approval gotcha — PARTIALLY SOLVED (2026-05-25 → 2026-05-26)

**2026-05-26 update:** Project-level `.claude/settings.json` alone was NOT enough — cron fires launch Claude Code in the parent dir (`C:\Users\<user>\Rira Research`), not the project dir, so the project allowlist never loads. Discovered after 0600 fire hung on a permission prompt overnight. See [[feedback_scheduled_task_cwd_parent]] for full diagnosis path.

**Working fix (must do BOTH):**
1. **Project-level** `.claude/settings.json` (committed to repo) — for interactive sessions and as the source-of-truth template
2. **User-level** `C:\Users\<user>\.claude\settings.json` (per-machine, NOT committed) — same content, applies to cron regardless of launch cwd

**2026-05-25 shipped (project-level):** `.claude/settings.json` committed to the repo with explicit allowlist for the tool set batch_runner + insight_runner need. Travels via git → DELL inherits on pull → no per-machine click-approve for interactive sessions.

What's in the allowlist (commit `07d1a5c`):
- Built-in tools: Read, Glob, Grep, Edit, Write, Agent, ToolSearch, WebSearch, WebFetch
- Bash patterns (prefix-wildcard): `git *`, `node *`, `npm *`, `npx *`, `curl *`, `gh *`, `mkdir/mv/cp/rm/ls/cat/echo/printf/cd/wc/tail/head/grep/find/sed/awk/tr/sort/uniq/date/diff/test/[`
- Deny: `git push --force*`, `git push -f*`, `rm -rf /`, `rm -rf /*`, `rm -rf ~`, `rm -rf ~/*` (deny wins over allow)

**Why this works:** scheduled-task SKILL.md hardcodes working dir to the repo root (`C:\Users\<user>\Rira Research\kira-research` or equivalent). Fresh Claude Code session spawns there → loads `.claude/settings.json` → allowlist applies before first tool call → no prompt.

**What's NOT in the allowlist:** MCP tools (`mcp__<uuid>__*`). MCP server names use machine-specific UUID prefixes (e.g., `mcp__763a5dc5-...__execute_sql` on vnc-f4 may be a different UUID on DELL), so can't be portably committed. batch_runner uses curl + node helper scripts for Supabase (not the MCP), so MCP prompts are rare. If a cron fire does prompt for an MCP tool, click approve once and consider adding a machine-specific rule to `.claude/settings.local.json` (gitignored).

**Per-machine override:** `.claude/settings.local.json` is in `.gitignore` for things like machine-specific MCP allowlists or hooks. Settings load order: user → project → local (later overrides earlier).

**Historical note:** Pre-allowlist (before 2026-05-25), the gotcha was: click "Run now" on any task before first auto-fire, approve each tool, hope subsequent fires reuse approvals. Unreliable since fresh sessions don't always inherit approvals. Allowlist file fixes this deterministically.

## Cost / billing notes

- Runs on Henry's Claude Code Max 5x ($100/mo) plan quota — NOT direct API billing
- Each fire ≈ 450K tokens spread across parent + 3 subagents
- 13 fires/day × 30 days = ~175M tokens/month
- Max 5x weekly limit should comfortably accommodate this; if rate-limited, disable some tasks (start with `kira-batch-0215`, `0345`, `0515` — middle-of-block slots that are most redundant)

## Phase O.13 changelog (2026-05-24)

- Replaced 4 daily tasks with 13 (45-min cadence in 2 blocks). ~3.25x throughput increase.
- Queue bumped +50 SEA topics (10 VN, 8 ID, 7 TH, 5 MY/PH/SG/JP/KR each).
- Documented overlap-safe claim-then-commit pattern (was implicit before).

## Phase Q.1 changelog (2026-05-25) — multi-fire split + chunked translation

**Root cause for split**: `2026-vn-fintech` hung 2h24m at JA translation stage (commit `0b6be26` claimed at 06:31 ICT, no further commits). Outputs/ folder rỗng → confirmed translation subagent failed before any file write. Investigation showed JA subagent was asked to one-shot Write ~67KB ja.html, exceeding Sonnet's ~32K-token per-response output cap → partial truncation or hang.

**What changed**:

- **Status flow extended**: `pending → en_in_progress → en_done → ja_in_progress → ja_done → ko_in_progress → done` (or `error`). Legacy `in_progress` rows treated as error (skip).
- **1 fire = 1 stage = 1 row**: each fire picks the most-advanced row (ja_done first, then en_done, then pending) and advances it ONE stage. Drains pipeline toward `done`.
- **Chunked translator output**: per `translator_jp.md` / `translator_ko.md` Section 11.5 — sentinel `<!-- KIRA_BATCH_PAGES_INSERT_HERE -->` comment, per-page `Edit` instead of one-shot Write. Each Edit ≤ ~7KB → no truncation risk.
- **Machine-agnostic working dir**: `git rev-parse --show-toplevel` instead of hardcoded `C:\Users\vnc-f4\...`. Same prompt runs on any machine.
- **Validation gates added** (parent-side, post-subagent):
  - Page count match (`grep -c '<div class="kira-page'` in ja/ko = en)
  - Source tag superset (every `[…]` in en must appear in ja/ko)
  - Anti-positioning grep with katakana/hangul variants (`クロード`, `클로드`)
- **45-min hard timeout per stage**: failures logged with stage label.
- **Throughput same**: 13 fires/day still = ~13 reports/day at steady state (each report flows through 3 fires but pipeline is parallel).

**Implication for machine setup**: 13 batch tasks now exist on DELL too (recreated from vnc-f4 set 2026-05-25). Both machines can fire safely — claim-then-commit prevents double-claim. Quota cost: ~2x if both run.

**2026-05-27 sync update**: vnc-f4 brought to canonical Q.3 layout — 18 batch (added 5 bridges: 1930/2030/2130/2230/2330) + 2 monitor + 4 insight = 24 tasks total. Mirrors DELL exactly. Achieved via `mcp__scheduled-tasks__create_scheduled_task` × 9 calls.

## Phase Q.2 changelog (2026-05-25) — Insight gen pipeline

New cron added: 4 `kira-insight-XXXX` daily fires (07/11/15/21 ICT) on DELL. Reads `skills/kira-research-report/prompts/insight_runner.md` — extracts 3 strongest sections from each published report's `en.html`, gens 3 insights × 3 locales = 9 `insight_translations` rows.

Multi-fire split same pattern as Q.1:
- Stage E: extract + publish 3 EN insights
- Stage J: translate to JA + publish
- Stage K: translate to KO + publish

Source of truth for stage = row count in `insight_translations` (per `insight_id`): `< 3 EN` → stage_en; `< 3 JA` → stage_ja; `< 3 KO` → stage_ko. No DB schema change.

Question-form H2 per locale via `prompts/question_templates.md`:
- EN allows `?` (e.g. "How large is X?")
- JA/KO use 体言止め / 명사형 (no `？`/`?` — translator anti-pattern rule)
- FAQ JSON-LD restores interrogative form for AI Overviews indexing

Cost: ~4 × 150K tokens/day = 600K/day Insight (~10% of batch quota).

See also: [[project_tool_gen_report]] · [[reference_kira_research]] · [[feedback_sparticuz_chromium_vercel]] · [[project_o_studio_credits]] · [[project_q_insight_runner]]
