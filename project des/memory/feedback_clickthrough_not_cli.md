---
name: feedback-clickthrough-not-cli
description: "Owner instructions must be UI click-through, never CLI — Henry doesn't use terminals"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

Every action item handed to the owner must be expressed as dashboard click-through: button names, sidebar locations, copy-paste URLs to paste into Supabase SQL Editor / Vercel Settings / GitHub Actions tab. Never instruct CLI commands.

**Why:** Henry is non-technical (see [[user-henry]]) and doesn't have a working terminal flow. CLI instructions get ignored or done wrong. The kira-research project explicitly enshrines this in its CLAUDE.md hard constraints — "Never give CLI instructions to owner — always click-through (Vercel/Supabase/GitHub UI)".

**How to apply:**
- Supabase work → "Vào Supabase → SQL Editor → paste this → Run" (with the SQL inline or via a GitHub raw URL)
- Vercel env vars → "Vercel → project → Settings → Environment Variables → check this var exists"
- File content review → paste content directly in chat OR link to GitHub raw URL
- Git operations on owner's behalf — Claude does them via Bash tool, owner doesn't run git
- Migration files → owner copies content from GitHub raw URL into Supabase SQL Editor

If a fix genuinely needs a CLI step there's no UI alternative for, surface that as a blocker and propose a code/automation change that removes the CLI step rather than asking owner to run it.
