# KICKOFF PROMPT v2 (paste this into Claude Code Desktop)

Tao build Anthropic Skill cho KIRA Research — generate consulting-grade market research reports.

Architecture đã locked. Implementation thôi.

## Your task

Read `CLAUDE_CODE_HANDOFF.md` (comprehensive build spec). Build the skill.

## Build location

**Skill lives inside existing `kiraresearch` repo at `/skills/kira-research-report/`.**

Folder structure to create:

```
kiraresearch/                       (existing repo)
├── api/
│   └── render-pdf.js              (Phase 0 — deploy first)
├── skills/                         (NEW — create folder)
│   └── kira-research-report/      (THE SKILL)
│       ├── SKILL.md
│       ├── schemas/
│       ├── templates/
│       ├── prompts/
│       ├── references/
│       └── docs/
└── ... (existing site files unchanged)
```

Commit incrementally to `main` after each phase.

## Skill format requirements

Tao chưa familiar với Anthropic Skill format — research it trước khi build:

**Key requirements for `SKILL.md`:**
- YAML frontmatter at top with `name:` and `description:` fields (mandatory)
- `description` is critical — Claude uses this to decide WHEN to trigger skill. Must include example phrases users might say.
- Skill folder can include supporting files (other .md, .json, .css, .html, etc.) — skill references them
- Supporting files load on demand when SKILL.md instructs

**Check official docs first:**
- https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
- Read example skills at `/mnt/skills/public/` or `/mnt/skills/examples/` if accessible

Make sure SKILL.md format is correct before testing. Wrong YAML = skill never triggers.

## Phase 0 (do FIRST, before skill build)

Deploy Vercel `/api/render-pdf` endpoint per `claude_code_setup_prompt.md`:

1. Add `puppeteer-core` + `@sparticuz/chromium` to `kiraresearch/package.json`
2. Create `kiraresearch/api/render-pdf.js` with content from `render-pdf.js` file
3. Set `PDF_RENDER_SECRET` env var on Vercel (random 32-char string, prefix `kira_pdf_`)
4. Trigger redeploy → wait until "Ready"
5. Test endpoint with sample payload → confirm 200 + valid PDF base64

**Phase 0 must succeed before skill build. Skill cannot complete render stage without this endpoint.**

Mày có Vercel MCP — use it.

## After Phase 0 → Skill build (Phase A-G per handoff)

Read `CLAUDE_CODE_HANDOFF.md` Section 8 for full sequence:
- Phase A: Skeleton (folder + copy existing files + initial SKILL.md draft)
- Phase B: Prompts (9 .md files in `prompts/`)
- Phase C: Reference docs (voice examples, chart patterns, architecture)
- Phase D: UC1 test (Indonesia roofing R0152)
- Phase E: UC2 test (AI in legal services Singapore)
- Phase F: UC3 test (mock data file)
- Phase G: Polish + commit

## My answers to Open Questions (Section 10 of handoff)

**Q1: UC1 blueprints inventory**

Phase 1 ship với 1 blueprint duy nhất: **Market Analysis** (R0152-style, 19 sections, manufacturing/consumer/construction domains).

Sau khi UC1 validate xong → tao sẽ decide thêm blueprints nào dựa trên UC2 Design Mode patterns lặp lại. Don't build other blueprints trong Phase 1.

**Q2: UC3 file type priority top 3**

Top 3:
- `.docx` (interview transcripts, internal reports)
- `.pdf` (internal research, decks-as-PDF)
- `.csv` / `.xlsx` (survey data, financial models)

Other formats: deferred to Phase 2.

**Q3: Template registry naming**

Use proposed format: `<report_type>_<domain>` (e.g., `market_analysis_consumer`).

Phase 1 registry has 1 entry: `market_analysis` (no domain suffix needed since only 1 blueprint).

## Mode setup

- **Model:** Opus 4.7
- **Reasoning:** Extra high
- **Context:** 1M (whole skill folder fits easily)
- **Commits:** After each Phase (A, B, C, D, E, F, G) — separate commits
- **Branch:** Direct to `main` (Henry is solo dev, no PR overhead)

## Workflow rules

- Test as mày build (don't write all 9 prompts then test once at end)
- If stuck or spec ambiguous → ask Henry, don't relitigate locked decisions (Handoff Section 2)
- Quality bar: match `kira-sample-report-R0152-v3.html` baseline (90%+ visual match for UC1)
- Commit messages: clear, scoped (e.g., "Skill Phase B: add topic_parser + orchestrator prompts")

## Start now

1. Confirm mày can see all files in folder
2. Verify Anthropic Skill format from docs
3. Begin Phase 0 (Vercel deploy)
4. After Phase 0 success → begin Phase A

Report progress after each phase. Stop and ask Henry if blocked.
