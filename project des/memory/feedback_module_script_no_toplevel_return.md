---
name: feedback-module-script-no-toplevel-return
description: "In <script type=\"module\">, use throw not return at top level — modules have no implicit function wrap"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 17b60c44-4484-4396-bbf1-6b3fb8f7a2a6
---

When writing module scripts (`<script type="module">`) with top-level `await` for early-exit branches (slug missing, 404, fetch failed), use `throw new Error('halt')` instead of `return;`. ES module bodies don't have an implicit function wrap — top-level `return` is a parse-time SyntaxError in V8/Chrome ("Illegal return statement"), which kills the entire script before any code runs.

**Why:** kira-research's `reports/_view.html` and `insights/_view.html` shipped with mixed patterns — `throw new Error('halt')` at the slug check, `return;` at 404 + fetch-catch branches. The `return`s parse-errored in production. The existing smoke tests checked only initial-DOM hydration (the `Loading…` shell that's in static HTML), so a script that crashed at parse left enough DOM behind to look fine to tests. Owner hit "Illegal return statement" in the browser even though smoke CI was green. Fixed in commit `66a59ed`.

**How to apply:**
- For early-exit in a `<script type="module">` body: `throw new Error('halt')` after setting `root.innerHTML = '<error message>'`
- Catch arm: re-throw if `err.message === 'halt'` (already in error state), otherwise render the catch-specific message and throw fresh halt
- Functions inside the module body — regular `return` is fine, those are real function bodies
- Always also add a smoke test that listens for `page.on('pageerror')` and fails on SyntaxError/Illegal return/Unexpected token, so the same class can't slip past initial-DOM-only checks again
