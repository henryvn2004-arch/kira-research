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

## Recovery steps when a fire is found hung

1. **Close the paused Claude Code window** (force-quit if needed) — frees the app to process newer fires.
2. **Reset stuck row**: `git checkout -- data/report_queue.csv` (if change is uncommitted local only) OR manually edit status back to `pending` and commit.
3. **Verify allowlist is at user-level** before next fire window.
4. **Manually trigger one task via "Run now"** to confirm no prompts surface — if any do, add the missing tool to user-level settings.json and try again.

## What's NOT the cause (red herrings checked)

- Missing env vars: batch_runner.md Step 0 would write `missing env, no-op` and exit cleanly without claiming a row. If a row is in `in_progress` but no env-missing comment, env is fine.
- batch_runner.md prompt bugs: when a row is in legacy `in_progress` status (not Q.1's `en_in_progress`), it might LOOK like an old prompt fired — but the actual cause is the fire died MID-claim before writing the correct Q.1 status. Cron uses current prompt file each fire; legacy strings appear only when the model's claim attempt was interrupted.

## Related

See [[project_batch_cron_system]] "Pre-approval gotcha" section for the canonical allowlist content. See [[user_henry]] for the click-through-not-CLI constraint that motivated the auto-approve allowlist in the first place.
