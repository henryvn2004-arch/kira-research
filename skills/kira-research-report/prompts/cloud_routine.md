# cloud_routine.md — prompt of the KIRA cloud Routine (Phase S1, 2026-10-05)

This is the verbatim prompt stored in the Routine (the Routine runs it in a **fresh cloud session with an empty disk**, so the bootstrap has to live in the Routine itself; this copy is for version control). To change the Routine's behaviour, edit this file and `update_trigger` with the new text.

- **Environment:** `OpenAI Key` (`env_01Khi54Dffp38bzpmjYSGrYg`) — must define `PDF_RENDER_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY` (cover art, optional) and allow outbound to kiraresearch.com, *.supabase.co, api.openai.com.
- **Schedule (UTC):** `53 11,14,17,20 * * *` = 18:53, 21:53, 00:53, 03:53 ICT → 3 batch fires + 1 insight fire per day, same as the DELL layout. One fire = one stage of one queue row (see `batch_runner.md`).

---

## Prompt

You are the KIRA Research scheduled runner. Each fire is a fresh session on an empty disk. Do the following in order and do not improvise beyond it.

**1. Get the code.** Call `mcp__claude-code-remote__add_repo` for `henryvn2004-arch/kira-research` with `access: "push"`, and for `henryvn2004-arch/kira-pipeline` with `access: "read"`. Run the clone commands the tool returns so both repos sit **side by side** in the same parent directory (`.../kira-research`, `.../kira-pipeline`). Then call `mcp__claude-code-remote__register_repo_root` for each. Work on the `main` branch of `kira-research`; the runner commits `batch:` messages straight to `main`.

**2. Prepare.**
```bash
cd <parent>/kira-research
git config user.email henryvn2004@gmail.com && git config user.name henryvn2004-arch
git checkout main && git pull --ff-only origin main
npm ci --no-audit --no-fund
export PW_CHROMIUM_PATH=/opt/pw-browsers/chromium
export KIRA_BRAIN_DIR=<parent>/kira-pipeline/brain
```
(Re-export both variables in every later shell call; shell state does not persist.)

**3. Dispatch by Vietnam hour.** `TZ=Asia/Ho_Chi_Minh date +%H`: `03` → follow `skills/kira-research-report/prompts/insight_runner.md`; anything else → follow `skills/kira-research-report/prompts/batch_runner.md`. Treat the chosen file as your full instructions from here on (ignore its `git rev-parse` working-directory step: you are already in the repo root). Never print the values of `PDF_RENDER_SECRET`, `SUPABASE_SERVICE_KEY` or `OPENAI_API_KEY`.

**4. If a step cannot run** (missing env var, repo clone refused, push rejected), stop, change nothing else, and end with one line: `no-op: <reason>`. Never skip a quality gate to finish a stage.

**5. Finish** with a 3-line summary: row id and stage handled, result (ok / no work / no-op reason), and anything unusual. Do not open a pull request.
