---
name: user-henry
description: "Owner of kira-research — non-technical, Vietnamese+English, single-operator research house, switches machines mid-work"
metadata: 
  node_type: memory
  type: user
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

Henry is the sole owner-operator of KIRA Research (kiraresearch.com), a Southeast Asia market intelligence research house. He's the only person who'll ever touch this codebase or its Supabase/Vercel dashboards.

**Role:** product owner, content producer (drafts reports via Claude Max chat), customer-facing brand. Not an engineer.

**Technical level:** non-technical. Has working mental model of git, Vercel, Supabase dashboards — clicks through UIs fluently. Does NOT use CLIs. Does not read code. Will paste error messages verbatim and expect a fix.

**Communication style:** casual Vietnamese mixed with English technical terms. Mirror that register — informal Vietnamese for tone ("mày/tao", "rồi", "ok") with English for system/code terms (commit, push, deploy, env var, etc.). Don't switch to formal Vietnamese.

**Multi-machine workflow:** switches between machines mid-project. The repo's `CLAUDE.md` + `project des/CLAUDE.md` are the cross-machine pickup state — keep them current at session end so the next machine's Claude continues seamlessly. See [[feedback-clickthrough-not-cli]] for the related guideline that owner action items must be UI click-through.

**Pace:** ships fast, accepts honest tradeoffs, won't be precious about destructive migrations on empty tables. Will explicitly ask "xong chưa? push merge deploy đi" when impatient — translate that as "ship the increment, don't gold-plate."
