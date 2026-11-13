---
name: feedback-check-project-des-before-destructive-db
description: "Before destructive DB cleanup in kira-research, cross-check `project des/CLAUDE.md` for explicit keep/deprecated annotations — workplan + sprint history can disagree"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

When proposing a destructive DB migration (DROP TABLE, DELETE from storage.buckets, DROP FUNCTION) in the kira-research project, ALWAYS read the `Database Schema` section of `project des/CLAUDE.md` first to see which objects are explicitly marked **keep** vs **deprecated**. That document earmarks tables for deferred features that aren't visible from code-grep alone.

**Why:** In the 2026-05-21 cleanup migration session, I scoped a drop list from (a) Supabase advisor RLS-disabled flags, (b) `git grep` for code references, and (c) Sprint history. All three signals said `user_credits` / `credit_transactions` / `credit_costs` / `custom_reports` were dead — Sprint 5.3 even explicitly said "credit system retired Year 1". But `project des/CLAUDE.md` line ~120 has:

> ### Custom Research backend (keep, scoped to /custom-research/*)
> - `user_credits`, `credit_transactions`, `credit_costs` — for tool gating
> - `custom_reports` — on-demand generated

These tables are kept for the *deferred* `/custom-research/*` tool rebuild — currently the tools redirect to a landing page (per workplan Phase 5 status). Without that doc check, I would have dropped 79 rows (1+28+12+39) of data intended for a future rebuild. Henry caught it via AskUserQuestion and selected "keep" — confirmed the project des doc as authoritative.

Migration 006 was scoped down to drop only the 6 unambiguously deprecated tables (`source_reports`, `report_chunks`, `industry_patterns`, `competency_templates`, `chat_history`, `contacts`) + 2 RAG functions + 2 dead buckets.

**How to apply:**
- Before any `drop table` / `delete from storage.*` migration, grep `project des/CLAUDE.md` for the table/bucket name and read surrounding context — look specifically for "(keep" or "Deprecated" section headings.
- If code-grep + sprint history say "dead" but `project des/CLAUDE.md` says "keep for future X" — the project des wins. Ask Henry before dropping.
- If `project des/CLAUDE.md` and the actual code state diverge (e.g. tools were killed but doc still references them), call it out so Henry can decide which side to update.
- Same principle for [[feedback-clickthrough-not-cli]] destructive ops: surface the plan to Henry FIRST with row counts + object counts, not after the fact.

This complements the existing [[feedback-seed-strings-dollar-quoted]] (migration content correctness) and [[feedback-clickthrough-not-cli]] (delivery channel) memories — those are about HOW to write/run migrations, this is about WHAT to put in them.
