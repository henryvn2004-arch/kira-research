---
name: tool-gen-report-naming
description: "Henry calls the kira-research-report skill \"tool gen report\" in conversation — internal shorthand"
metadata: 
  node_type: memory
  type: project
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

When Henry says **"tool gen report"** (lowercase, casual), he's referring to the `kira-research-report` Anthropic Skill at [skills/kira-research-report/](skills/kira-research-report/) in the kira-research repo. Built 2026-05-22. Produces consulting-grade KIRA market research reports as styled HTML + PDF via `/api/render-pdf`.

**Why:** Henry was asked to pick a brand name (KIRA Atelier / Press / Foundry / Bench) but clarified he didn't want a commercial brand — just an internal shorthand he and Claude can use in conversation. "Tool gen report" is that shorthand. NOT a customer-facing name; NOT to appear in any rendered report copy, UI, or marketing.

**How to apply:**
- When Henry says "tool gen report" or "thằng tool gen report" → he means this skill
- When Henry asks "chạy tool gen report" → he wants the skill invoked on a topic
- Don't propose alternative names or push branding unless he explicitly asks for it
- The skill folder name (`kira-research-report`) stays as-is for the Claude skill loader

**Batch UI — RESOLVED (2026-05-23):**
Henry picked an Option D not originally on the table: **Claude Code scheduled tasks** running the skill on a 4-fire/day cron. Pulls topics from `data/report_queue.csv`, gens 1 topic × EN+JA+KO per fire. Sonnet on Max 5x. See [[project_batch_cron_system]] for full architecture.

See [[feedback_sparticuz_chromium_vercel]] for the render-pipeline gotchas. See [[reference_kira_research]] for repo + Supabase + Vercel pointers.
