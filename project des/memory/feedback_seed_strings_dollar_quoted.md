---
name: feedback-seed-strings-dollar-quoted
description: "Long SQL seed strings must use dollar quoting ($tag$...$tag$) — '' escape gets mangled in Supabase SQL Editor paste pipeline"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

When writing seed `INSERT` statements that contain multi-sentence text with apostrophes (any string with `'s`, `isn't`, `it's` patterns), use Postgres dollar-quoted string literals (`$body$...$body$`, `$lede$...$lede$`, etc.) instead of `''`-escaped single-quoted strings.

**Why:** Owner ran a 003_insights.sql seed with ~20 `''` escapes in a long article body. Postgres rejected it with `42P01: relation "their" does not exist` — the parser had terminated the string literal early because something in the file → clipboard → Supabase SQL Editor → server pipeline mangled one of the doubled apostrophes (likely smart-quote autocorrect or Unicode normalization). Single-quote escaping is fragile; dollar quoting is parser-proof because the delimiter is a unique tag string that doesn't appear in the content. Empirically this is what survived the paste roundtrip on this owner's setup.

**How to apply:**
- Multi-paragraph HTML bodies, long narratives, JSONB string args with apostrophes → use `$body$...content...$body$` or `$$...content...$$`
- Short labels without apostrophes → regular `'...'` is fine
- Pick unique tags ($title$, $lede$, $excerpt$, $body$, $p1$) when nested dollar-quoted strings appear, so the parser can tell them apart
- This applies to the kira-research migrations specifically but is generally good practice for any seed in this codebase. Migrations 002 + 003 already converted in commit `7849d3d`.

Don't preemptively rewrite short literals — only the apostrophe-heavy ones. Keep diff minimal.
