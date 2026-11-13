---
name: scheduled-task-cwd-parent
description: "Claude Code scheduled tasks launch in the parent dir (cwd from session JSON), not the dir specified in SKILL.md's 'Working directory:' line. Project-level `.claude/settings.json` is NOT loaded for cron fires — settings must live at user level (`~/.claude/settings.json`) to apply."
metadata:
  node_type: memory
  type: feedback
---

## Symptom

Scheduled task fires (eg `kira-batch-0600`) hang waiting for permission approval despite a committed `.claude/settings.json` allowlist in the project root. App stays paused with a permission prompt; subsequent fires don't run because the app instance is blocked. Effect: zero batch commits overnight, one row stuck in claimed state, output dir never created.

## Diagnosis path

1. Check `git log --oneline -10` — no batch commits since last manual session.
2. `git status` shows uncommitted change to `data/report_queue.csv` (one row claimed but not committed).
3. `ls C:\Users\<user>\.claude\sessions\` — find session JSON files modified around the fire time.
4. `cat <pid>.json` — look at the `"cwd"` field. If it's NOT the project dir → settings.json at project level was never loaded.

Example: kira-research's project dir is `C:\Users\vnc-f4\Rira Research\kira-research\`, but a cron-spawned session showed `"cwd": "C:\\Users\\vnc-f4\\Rira Research"` (parent). The scheduled-task SKILL.md telling Claude to `cd` into the project dir doesn't help — settings load happens at session start, before any prompt is read.

## Root cause

Claude Code reads project-level `.claude/settings.json` based on the session's launch cwd, NOT on the working directory hinted in SKILL.md's prompt body. Scheduled tasks (`mcp__scheduled-tasks`) spawn Claude Code with whatever the OS-side default cwd is (typically the parent of the most recently active project) — they do NOT honor SKILL.md's "Working directory:" line for settings loading.

Settings load order (Claude Code docs): user → project → local. With `cwd` outside the project, the "project" tier resolves to nothing (or worse, to a different project's settings).

## Fix

**Mirror the allowlist to user-level settings** at `C:\Users\<user>\.claude\settings.json` (or `~/.claude/settings.json` on POSIX). This applies regardless of launch cwd. The project-level file is still useful as a template + for interactive sessions started inside the project, but it CANNOT be the only safety net for cron.

For kira-research, the canonical allowlist content lives at `kira-research/.claude/settings.json` in the repo. Copy verbatim to user level on each machine that runs the cron. Same content works on Windows + POSIX since the rules are tool-name patterns.

## Second gotcha (2026-05-26): bash variable expansion bypasses allowlist

Even with the user-level allowlist in place, the first prompt encountered on the manual test run was:
```
cd "C:/Users/vnc-f4/Rira Research/kira-research" && echo "PDF_RENDER_SECRET=${PDF_RENDER_SECRET:+SET}" ...
```
UI label: "Contains expansion".

Claude Code treats ANY bash command containing `$VAR` or `${VAR}` expansion as high-risk regardless of allowlist — security feature to prevent allowlist bypass like `Bash(curl *)` allowed → attacker uses `curl $LEAK_VAR` to exfiltrate env. Prefix-match rules in `permissions.allow` do NOT cover commands with expansion.

**Two ways out (we chose both, layered):**

1. **`permissions.defaultMode: "auto"`** in user-level settings — Claude Code uses its built-in LLM classifier to auto-decide instead of prompting. For cron fires running a known-good prompt (batch_runner.md), the classifier auto-approves the predictable command patterns (curl with $PDF_RENDER_SECRET, git commit with $id, etc.). Risky operations still surface prompts. Deny rules in allowlist still take precedence.

2. **Refactor batch_runner.md Step 0** to use `node -e "process.env..."` instead of bash `${VAR:+SET}` — Node reads env vars directly without shell expansion, so the command stays in the auto-approved `Bash(node *)` rule even without `defaultMode: "auto"`. This is the per-command surgical fix; useful when defaultMode is set to `"default"`.

Commit `3ee9043` shipped the Step 0 node refactor. User-level `defaultMode: "auto"` was added 2026-05-26 on vnc-f4. **DELL needs the same: set `defaultMode: "auto"` in `C:\Users\<dell-user>\.claude\settings.json`.**

## Recovery steps when a fire is found hung

1. **Close the paused Claude Code window** (force-quit if needed) — frees the app to process newer fires.
2. **Reset stuck row**: `git checkout -- data/report_queue.csv` (if change is uncommitted local only) OR manually edit status back to `pending` and commit.
3. **Verify allowlist is at user-level** before next fire window.
4. **Manually trigger one task via "Run now"** to confirm no prompts surface — if any do, add the missing tool to user-level settings.json and try again.

## What's NOT the cause (red herrings checked)

- Missing env vars: batch_runner.md Step 0 would write `missing env, no-op` and exit cleanly without claiming a row. If a row is in `in_progress` but no env-missing comment, env is fine.
- batch_runner.md prompt bugs: when a row is in legacy `in_progress` status (not Q.1's `en_in_progress`), it might LOOK like an old prompt fired — but the actual cause is the fire died MID-claim before writing the correct Q.1 status. Cron uses current prompt file each fire; legacy strings appear only when the model's claim attempt was interrupted.

## Third gotcha (2026-05-27): insight cron silently no-op'd for 2 days

Insight SKILL.md (kira-insight-{0700,1100,1500,2100}) carried the line:
```
Working directory: derive via `git rev-parse --show-toplevel`.
If not in git checkout, EXIT cleanly with `not in git, no-op`.
```

Because the cron-launched cwd is the parent dir (not the repo), `git rev-parse` always failed → every fire exited at line 1 of the playbook with `not in git, no-op`. **Insight pipeline never ran from cron on DELL** since Phase Q.2 launched 2026-05-25. The 13 EN insights in prod came from manual fires inside the repo dir (first-run artifacts committed in `4082b96`), not from the schedulers.

Batch SKILL.md didn't have this bug because it hardcoded the DELL paths:
```
Working directory (machine-specific override for batch_runner.md):
- Windows path: C:\Users\DELL\Kira Research\kira-research
- Bash path:    /c/Users/DELL/Kira Research/kira-research
```

**Fix (2026-05-27):** mirror the batch pattern into all 4 insight SKILL.md files. The playbook still says `git rev-parse` but the SKILL.md now tells the session to ignore that step and use the hardcoded paths.

The fix is machine-local — not committed to repo (scheduled-task SKILL.md files live at `C:\Users\<user>\.claude\scheduled-tasks\<task>\SKILL.md`). When setting up cron on a new machine: copy SKILL.md content from this machine, swap the `C:\Users\DELL\…` paths for the new machine's path.

Symptom to look for in future: insight task's "Run now" output ends with `not in git, no-op` and the prod insights list shows no new rows since the last manual fire. Check the SKILL.md "Working directory" block first.

## Related

See [[project_batch_cron_system]] "Pre-approval gotcha" section for the canonical allowlist content. See [[user_henry]] for the click-through-not-CLI constraint that motivated the auto-approve allowlist in the first place. See [[project_q_insight_runner]] for the insight pipeline architecture this gotcha breaks.
