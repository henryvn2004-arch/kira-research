---
name: kira-batch-cron-system
description: "Phase Q.4: 18 daily fires (Q.3 schedule) + auto-recovery of stale `*_in_progress` claims via Step 0.5 audit-queue.mjs (90-min threshold, strike-1/strike-2). Q.1 3-fire pipeline per report. Max gap ~60min anywhere except 06:45→17:00 (daytime by design)."
metadata:
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

## What this is

Henry's KIRA Research has a daily batch report generation system built on top of the `kira-research-report` skill ("[[project_tool_gen_report|tool gen report]]"). Scheduled tasks (`mcp__scheduled-tasks`) fire daily and advance ONE pipeline stage per fire from `data/report_queue.csv` (Phase Q.1+: 3-fire pipeline per report = EN gen → JA translate → KO translate). Auto-publishes to Supabase + commits.

## Current schedule (Phase Q.3 — 2026-05-25)

**18 active tasks** = 3 evening (45-min) + 5 bridge (60-min, NEW Q.3) + 10 overnight (45-min). Max gap ~60min anywhere except 06:45 → 17:00 (10h15m daytime gap by design — Henry uses other machine during day).

Evening: 1700, 1745, 1830
Bridge (Q.3 NEW): 1930, 2030, 2130, 2230, 2330
Overnight: 0000, 0045, 0130, 0215, 0300, 0345, 0430, 0515, 0600, 0645

System auto-applies 0-10 min random jitter. All tasks share same prompt (delegate to `batch_runner.md`).

## Capacity (Phase Q.3 — 18 fires/day)

Q.1 multi-fire split = 1 report needs 3 fires (Stage A/B/C):
- 18 fires ÷ 3 stages = **~6 reports/day fully published** at steady state
- Each report = 3 PDFs (EN+JA+KO) → **~18 PDFs/day**
- 50-topic queue lasts ~8 days
- Per fire: ~150-450K tokens (Stage A heavier). 18 × ~250K avg = 4.5M/day ≈ 32M/week — within Max 5x budget.
- Best-case per-report latency: ~1h30m (claim A at 00:00 → B at 00:45 → C at 01:30)
- Worst-case: ~11h30m (claim A at 06:45 → wait daytime gap → B at 17:00 → C at 17:45)

## Why Q.3 added bridge fires

Pre-Q.3: 13 fires with 5h30m gap between 18:30 → 00:00. At Q.1's 3-fire split, this caused worst-case ~18h latency when Stage A claimed at 18:30. Q.3 added 5 evening bridge fires (19:30/20:30/21:30/22:30/23:30) to close the gap.

## Key constraints

- **App must be running** on at least one machine for crons to fire.
- **1 stage per fire** (post-Q.1). Stage selection order: ja_done > en_done > pending.
- **Status flow**: `pending → en_in_progress → en_done → ja_in_progress → ja_done → ko_in_progress → done` (or `error`). Legacy `in_progress` rows = error skip.
- **Chunked translator output** (Q.1) — per-page Edit via sentinel `<!-- KIRA_BATCH_PAGES_INSERT_HERE -->`. Each Edit ≤ ~7KB avoids ~32K-token output cap.
- **EN-first-then-translate** — JA/KO translated from EN, charts reused.
- **45-min hard timeout per stage**.
- **Machine-agnostic working dir** (Q.1) — uses `git rev-parse --show-toplevel`. Both vnc-f4 + DELL run safely (claim-then-commit prevents double-claim).

## Where to look when things break

- **No new reports overnight:** queue.csv pending rows? Tasks enabled? Claude Code running?
- **Stage stuck:** check `error_log` column. Common: `/api/render-pdf` 500 (chromium boot), 401 (PDF_RENDER_SECRET), translation page-count mismatch.
- **Validation gates (Q.1, parent-side post-subagent):** page count match, source tag superset, anti-positioning grep with katakana/hangul variants (`クロード`, `클로드`).
- **Brand violation:** grep `outputs/batch/*` for Mordor/Frost/Euromonitor/Synovate/Ipsos/IMARC/Claude/McKinsey — must be zero hits.
- **Stuck `*_in_progress`:** **Phase Q.4 (2026-05-28) — auto-recovery now handles this.** Step 0.5 of every fire runs `scripts/audit-queue.mjs` which detects rows where `claimed_at` is empty or > 90 min ago, reverts to prior stage (strike-1) or escalates to `error` (strike-2 — already auto-recovered once). Manual flip is only needed if the audit script itself is broken or if a real bug is surfaced via strike-2 escalation. To force manual: edit CSV, set `status` to prior stage, clear `claimed_at`, append note to `error_log`, commit, push.

## Files involved (committed to repo)

- `data/report_queue.csv` — the queue (Q.4 added `claimed_at` column — ISO UTC timestamp set on claim, cleared on done/error/auto-recover)
- `data/README.md` — schema docs
- `skills/kira-research-report/prompts/batch_runner.md` — orchestrator
- `skills/kira-research-report/prompts/translator_jp.md` · `translator_ko.md` — voice guides + Section 11.5 chunked-Edit rules
- `skills/kira-research-report/scripts/audit-queue.mjs` — Q.4 auto-recovery: idempotent stale-claim reverter, called from batch_runner.md Step 0.5
- `skills/kira-research-report/outputs/batch/<id>/` — per-report output dir (PDFs .gitignored, HTMLs tracked)

## NOT committed (per-machine Claude Code config)

18 task directories: `C:\Users\<user>\.claude\scheduled-tasks\kira-batch-{0000,0045,0130,0215,0300,0345,0430,0515,0600,0645,1700,1745,1830,1930,2030,2130,2230,2330}\SKILL.md`

→ **Machine switch:** scheduled tasks don't follow. Recreate via 18× `mcp__scheduled-tasks__create_scheduled_task` calls. Same prompt body for all (delegate to `batch_runner.md`).

## Per-machine env vars

Source of truth = Vercel project env. Mirror to **Windows User scope** on every machine that runs cron. Restart Claude Code after setting.

| Var | Used for |
|---|---|
| `PDF_RENDER_SECRET` | `X-Api-Key` on POST `/api/render-pdf` |
| `SUPABASE_URL` | `https://iygoynbnscednfzdsflc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Bearer token on Storage upload + signed-URL gen |

Helper scripts in `skills/kira-research-report/scripts/`: `render-one.mjs`, `upload-pdf.mjs`, `_build_*_sql.mjs` (per-topic SQL builders).

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

**Historical note:** Pre-allowlist, the gotcha was: click "Run now" on any task before first auto-fire, approve each tool, hope subsequent fires reuse approvals. Unreliable since fresh sessions don't always inherit approvals. Allowlist file fixes this deterministically.

## Cost / billing

- Runs on Max 5x quota — NOT direct API billing
- ~32M tokens/week — within budget
- If rate-limited, disable mid-block redundant slots first: `kira-batch-0215`, `0345`, `0515`

## Insight pipeline (Phase Q.2)

Separate cron: 4 `kira-insight-XXXX` daily fires (07/11/15/21 ICT) on DELL. Reads `prompts/insight_runner.md`. Same multi-fire pattern (Stage E/J/K). Stage detected by row count in `insight_translations` per `insight_id`. No DB schema change. Cost ~10% of batch quota. See [[project_q_insight_runner]] (in repo memory dir).

## Changelog

- **Q.4 (2026-05-28):** **Auto-recovery for stale `*_in_progress` claims.** Pre-Q.4 a fire that committed `claim` then died left the row stuck forever — only manual unstuck cleared it. Pre-dawn audit found 4 rows stuck 5.5h-21h, burning ~1 day silently. New column `claimed_at` (ISO UTC) in queue.csv + new `scripts/audit-queue.mjs` (90-min threshold, strike-1 reverts to prior stage, strike-2 → `error` for manual review). New Step 0.5 in batch_runner.md runs the audit before stage routing every fire. Idempotent — diff-clean when nothing stale, single `batch: auto-recover N stale claim(s)` commit when something is. Commit `012bb31`.
- **Q.3 (2026-05-25):** +5 evening bridge fires → 18 total. Closes 5h30m gap (Q.1 worst-case latency 18h → 11h30m).
- **Q.2 (2026-05-25):** Insight gen pipeline (4 daily fires, same multi-fire split).
- **Q.1 (2026-05-25):** Multi-fire split (1 report = 3 fires) after `2026-vn-fintech` JA hung at one-shot Write of 67KB. Chunked translator output via sentinel + per-page Edit. Validation gates added.
- **O.13 (2026-05-24):** 4 → 13 tasks (45-min cadence, 2 blocks). +50 SEA topics. Claim-then-commit documented.

See also: [[project_tool_gen_report]] · [[reference_kira_research]] · [[feedback_sparticuz_chromium_vercel]] · [[project_o_studio_credits]]
