# cloud_routine.md — prompt of the KIRA cloud Routine (Phase S1, 2026-10-05)

The Routine is created in the claude.ai Routines UI (the API tool cannot attach repositories, and fired sessions do not get `add_repo`: tested 2026-10-05). The prompt below is pasted into it; this file is the versioned copy. To change the Routine's behaviour, edit this file and paste the new text into the Routine.

**Routine settings**
- **Repositories:** `henryvn2004-arch/kira-research` and `henryvn2004-arch/kira-pipeline` (private brain). Both are cloned side by side under `/home/user/` in the fired session. If the form offers an option to push to branches other than `claude/*`, turn it on for `kira-research`: the runner commits `batch:` messages straight to `main`.
- **Environment:** `OpenAI Key` (`env_01Khi54Dffp38bzpmjYSGrYg`). It must define `PDF_RENDER_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `OPENAI_API_KEY` (cover art; optional) and allow outbound to kiraresearch.com, `*.supabase.co`, `api.openai.com`.
- **Schedule (2026-10-07):** one fire = one full report (EN → JA → KO → ZH → publish, about 60–100 min; `batch_runner.md` Step 6 chains the stages), so fires per day = reports per day. Ramp agreed with the owner: start at 3/day, then 5, 7, 10 once a step runs clean (all fires `done`, no `error` rows, usage fine in claude.ai Settings → Usage). Cron in Vietnam time (`CRON_TZ=Asia/Ho_Chi_Minh`):

  | Reports/day | Cron |
  |---|---|
  | 3 | `CRON_TZ=Asia/Ho_Chi_Minh 53 1,4,7 * * *` |
  | 5 | `CRON_TZ=Asia/Ho_Chi_Minh 53 1,5,9,13,17 * * *` |
  | 7 | `CRON_TZ=Asia/Ho_Chi_Minh 53 1,4,7,10,13,16,19 * * *` |
  | 10 | `CRON_TZ=Asia/Ho_Chi_Minh 53 1,3,5,7,9,11,13,15,17,19 * * *` |

  Fires at least 2 h apart rarely overlap; when they do, each works on its own row (claims in the queue CSV). The insight pipeline is paused (library reports first); to restart it, add a separate routine that follows `insight_runner.md`.
- **Model:** Sonnet 5.5 is enough. The fire only does file work, validation and commits; `batch_runner.md` picks the model for the heavy subagents (opus for EN gen and for JA/KO/ZH).

---

## Prompt

You are the KIRA Research scheduled runner. Each fire is a fresh session on an empty disk. Do the following in order and do not improvise beyond it.

**1. Locate the code.** `ls /home/user`. You should see `kira-research` and `kira-pipeline` side by side. If `kira-research` is missing, stop with `no-op: kira-research not attached`. If `kira-pipeline` is missing, continue: the runner falls back to the old route and says so in its summary.

**2. Prepare.**
```bash
cd /home/user/kira-research
git config user.email henryvn2004@gmail.com && git config user.name henryvn2004-arch
git checkout main && git pull --ff-only origin main
npm ci --no-audit --no-fund
export PW_CHROMIUM_PATH=/opt/pw-browsers/chromium
export KIRA_BRAIN_DIR=/home/user/kira-pipeline/brain
```
(Re-export both variables in every later shell call; shell state does not persist.)

**3. Run the batch runner.** Follow `skills/kira-research-report/prompts/batch_runner.md` and treat it as your full instructions from here on (ignore its `git rev-parse` working-directory step: you are already in the repo root). Never print the values of `PDF_RENDER_SECRET`, `SUPABASE_SERVICE_KEY` or `OPENAI_API_KEY`.

**4. If a step cannot run** (missing env var, push rejected), stop, change nothing else, and end with one line: `no-op: <reason>`. Never skip a quality gate to finish a stage.

**5. Finish** with a 3-line summary: row id and stage handled, result (ok / no work / no-op reason), and anything unusual. Do not open a pull request.
