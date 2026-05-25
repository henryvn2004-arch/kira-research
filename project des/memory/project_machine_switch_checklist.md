---
name: kira-machine-switch-checklist
description: "Single source of truth for switching kira-research work to a new machine (vnc-f4 ↔ DELL). Covers git config, env vars, user-level Claude Code settings (allowlist + defaultMode auto), memory mirror, scheduled-tasks recreate. Last verified: 2026-05-26 on vnc-f4."
metadata:
  node_type: memory
  type: project
---

## Why this exists

Henry switches between vnc-f4 and DELL during the day. Some setup travels via git (project files, repo memory, .claude/settings.json for interactive use). Some does NOT travel (user-level settings, env vars, scheduled tasks, user memory). This checklist captures the not-travelling parts so the cron keeps firing on whichever machine is active.

**Critical:** Close Claude Code on the OLD machine before working on the NEW one. Otherwise both machines fire crons simultaneously → 2x quota burn (claim-then-commit prevents double-claim but wastes resources).

---

## On the NEW machine — checklist in order

### 1. Git pull + verify config

Open the kira-research repo dir in a terminal (or Claude Code):
```
cd "C:\Users\<new-user>\Rira Research\kira-research"
git pull
git config user.email   # should print: henryvn2004@gmail.com
git config user.name    # should print: henryvn2004-arch
```

If config is wrong → Vercel will reject deploys. Fix:
```
git config user.email henryvn2004@gmail.com
git config user.name henryvn2004-arch
```

### 2. Set 3 env vars (Windows User scope)

Source of truth: Vercel project env (kira-research → Settings → Environment Variables). Mirror locally — they cannot be derived.

| Var | Used for |
|---|---|
| `PDF_RENDER_SECRET` | `X-Api-Key` on POST /api/render-pdf |
| `SUPABASE_URL` | `https://iygoynbnscednfzdsflc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Bearer token for Supabase Storage + signed-URL gen |

**Set via Windows UI (click-through):**
1. Start menu → search "environment variables" → "Edit environment variables for your account"
2. New → enter name + value for each of the 3
3. OK → Restart Claude Code so child processes inherit

### 3. User-level Claude Code settings — CRITICAL for cron auto-approve

Project-level `.claude/settings.json` is committed in the repo, but scheduled-task cron fires launch Claude Code in the PARENT dir (`Rira Research`), not project dir. So project settings don't load for cron. Settings must be at user level.

**Click-through:**
1. Open File Explorer → navigate to `C:\Users\<new-user>\.claude\`
   - If `.claude\` doesn't exist, Claude Code creates it on first launch
2. Open `kira-research/.claude/settings.json` (from the repo) — this is the canonical template
3. Copy entire content
4. Create new file `C:\Users\<new-user>\.claude\settings.json` and paste
5. **IMPORTANT addition** — inside the `"permissions"` object, add this line at the top:
   ```json
   "defaultMode": "auto",
   ```
   The repo version doesn't have it (because it's per-machine), but cron needs it to auto-approve commands with bash variable expansion (`$VAR`, `${VAR}`). Without `auto`, those commands prompt every fire even when other rules allow.

Final structure should look like:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "auto",
    "allow": [ ... ],
    "deny": [ ... ]
  }
}
```

Save. No restart needed — next session (and next cron fire) loads it.

### 4. Mirror repo memory → user memory

The `project des/memory/*.md` files in the repo travel via git, but Claude Code reads project memory from `C:\Users\<user>\.claude\projects\<sanitized-cwd>\memory\`. Need to mirror.

**Click-through:**
1. File Explorer → navigate to `C:\Users\<new-user>\Rira Research\kira-research\project des\memory\`
2. Select all .md files (Ctrl+A) + copy (Ctrl+C)
3. Navigate to `C:\Users\<new-user>\.claude\projects\C--Users-<new-user>-Rira-Research\memory\`
   - Path might differ if Henry's username differs — the sanitized-cwd portion replaces `\` with `-`
   - If folder doesn't exist, create it: right-click → New → Folder, name it exactly as the path above
4. Paste all .md files (Ctrl+V). Overwrite if prompted.

See `project des/memory/README.md` in the repo for the canonical sync rationale.

### 5. Verify 18 scheduled tasks exist (Phase Q.3)

vnc-f4 had **13 tasks** as of 2026-05-26 (missing the 5 Q.3 bridge fires: 1930/2030/2130/2230/2330). DELL state TBD. Check on the new machine:

**Click-through:**
1. Open File Explorer → `C:\Users\<new-user>\.claude\scheduled-tasks\`
2. Count `kira-batch-*` folders. Should be 18 of these:
   - Evening (3): `kira-batch-1700`, `1745`, `1830`
   - Bridge (5): `kira-batch-1930`, `2030`, `2130`, `2230`, `2330`
   - Overnight (10): `kira-batch-0000`, `0045`, `0130`, `0215`, `0300`, `0345`, `0430`, `0515`, `0600`, `0645`
3. PLUS the 4 insight tasks (Q.2): `kira-insight-0700`, `1100`, `1500`, `2100`
4. Disabled history (can ignore or delete): `kira-batch-01am`, `05am`, `05pm`, `1215pm`

**If any missing:** in Claude Code → ask Claude something like "create scheduled task kira-batch-1930 with cron `30 19 * * *`, prompt body identical to kira-batch-0000 (delegate to batch_runner.md)". Claude uses `mcp__scheduled-tasks__create_scheduled_task`. Cron list from [[project_batch_cron_system]].

### 6. Open Claude Code → click "Run now" on 1 task → verify no prompts

This is the final smoke test. If a permission prompt appears:
- Note the exact tool/command shown
- Ask Claude (this chat) to add it to user-level settings.json
- Try again

If no prompts → cron will run unattended overnight. Done.

---

## Common pitfalls (verified mistakes on vnc-f4 2026-05-26)

1. **Project-level `.claude/settings.json` alone is NOT enough.** Cron launches in parent dir, doesn't see it. User-level required. [[feedback_scheduled_task_cwd_parent]]
2. **Bash `${VAR}` expansion bypasses allowlist** unless `defaultMode: "auto"` is set. Step 0 env check is the canonical failure case. [[feedback_scheduled_task_cwd_parent]]
3. **Claude Code window paused on prompt blocks ALL subsequent cron fires.** If you suspect this, force-close the paused window (Task Manager → claude-desktop.exe). [[feedback_scheduled_task_cwd_parent]] recovery section.
4. **Both machines running Claude Code simultaneously** doubles quota burn. Always close Claude Code on the OLD machine before opening it on the NEW one.

---

## Quick diagnostic if cron didn't run overnight

```bash
cd "C:\Users\<user>\Rira Research\kira-research"
git log --oneline -10                     # any "batch: ..." commits?
git status                                # uncommitted queue.csv?
node -e "...status counts..."             # see how many pending/error/in_progress
ls C:\Users\<user>\.claude\sessions\      # latest session JSON mtimes
cat <pid>.json                            # check cwd field — should be project dir
```

If no batch commits + queue has a row stuck in `*_in_progress`:
1. Close any paused Claude Code window
2. `git checkout -- data/report_queue.csv` (if uncommitted) OR manual edit row back to `pending` then commit
3. Verify user-level settings.json has `defaultMode: "auto"`
4. Manual "Run now" on 1 task to confirm fix

See [[project_batch_cron_system]] for the full cron architecture + [[feedback_scheduled_task_cwd_parent]] for the cwd diagnostic flow.

---

## Files that DO travel via git (no manual setup needed)

- `data/report_queue.csv` — 99 pending as of 2026-05-25 top-up
- `skills/kira-research-report/prompts/batch_runner.md` — Q.3 schedule + Q.1 multi-fire + Step 0 node fix
- `skills/kira-research-report/prompts/insight_runner.md` — Q.2 insight pipeline
- `.claude/settings.json` — project allowlist (used by interactive sessions started inside the project)
- `project des/memory/*.md` — repo-tracked memory; mirror to user memory dir manually (Step 4)

## Files that DON'T travel (manual setup on each machine)

- `C:\Users\<user>\.claude\settings.json` — user-level allowlist + defaultMode auto (Step 3)
- `C:\Users\<user>\.claude\projects\<sanitized>\memory\` — mirrored from repo (Step 4)
- `C:\Users\<user>\.claude\scheduled-tasks\kira-*\SKILL.md` — 22 tasks total (Step 5)
- Windows User-scope env vars (Step 2)
- Git config (Step 1 sub-step)

See also: [[project_batch_cron_system]] · [[feedback_scheduled_task_cwd_parent]] · [[user_henry]] · [[reference_kira_research]]
