# troubleshooting.md — known issues and their fixes

A running log of issues encountered building or running this skill, with the fix that worked. Add new entries at the top as you find more.

---

## Render-side issues (Stage 7 / `/api/render-pdf`)

### 1. `libnss3.so: cannot open shared object file` on first deploy

**Symptom:** `/api/render-pdf` returns HTTP 500 with chromium error `Failed to launch the browser process! /tmp/chromium: error while loading shared libraries: libnss3.so`.

**Root cause:** `@sparticuz/chromium-min` extracts the chromium binary but does NOT extract its companion runtime libraries (AL2023 tarball containing libnss3, libdrm, etc.) unless it detects an AWS Lambda environment via the `AWS_EXECUTION_ENV` env var. Vercel's serverless runtime is Lambda-compatible but doesn't set that variable.

**Fix:** Spoof the env var BEFORE the package's module-load init runs. Static ESM imports are hoisted above all top-level statements, so a `process.env.AWS_EXECUTION_ENV = …` line above an `import` statement doesn't actually run first. Use dynamic import:

```js
if (!process.env.AWS_EXECUTION_ENV) {
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
}
const chromium = (await import('@sparticuz/chromium-min')).default;
const puppeteer = (await import('puppeteer-core')).default;
```

See [api/render-pdf.js](../../api/render-pdf.js) for the working pattern. Also saved as a user-memory entry so future sessions don't repeat the chase.

### 2. `pdf_base64` field contains comma-separated decimals, not base64

**Symptom:** Response is `success: true` but `pdf_base64` looks like `"37,80,68,70,45,49,..."` (raw byte values joined). Decode fails downstream.

**Root cause:** `puppeteer-core@23+` returns a `Uint8Array` from `page.pdf()`, not a Node `Buffer`. Calling `.toString('base64')` on a `Uint8Array` ignores the encoding argument and returns the default `Uint8Array.prototype.toString` output (CSV of decimal byte values).

**Fix:** Wrap in `Buffer.from()` before encoding:

```js
const pdfBuffer = Buffer.from(await page.pdf({ ... }));
const pdfBase64 = pdfBuffer.toString('base64');
```

### 3. `page_count` over-reports

**Symptom:** Response shows `page_count: 57` for a 12-page report.

**Root cause:** The original regex `<div class="page` was matching `class="page-inner"`, `class="page-header"`, `class="page-footer"`, etc. — anything starting with "page".

**Fix:** Tighten the regex so the class attribute must terminate after "page" with a space or quote:

```js
page_count: (html.match(/<div class="page(?=["\s])(?:[^"]*)?"/g) || []).length,
```

`overflow_detected` is unaffected by this regex — it's computed from `.scrollHeight` on the actually rendered DOM via Puppeteer, so it's always reliable.

### 4. Function deploy looks successful but old code keeps running

**Symptom:** Vercel deployment shows "Production" success but the function returns the same error as the prior deploy.

**Root cause:** Vercel sometimes serves stale function code for ~30-60s after deploy completion. The deployment is "ready" before the edge caches have invalidated.

**Fix:** Add a `RENDER_VERSION` constant in the function and return it in the response. When iterating, change the version string on each commit. Poll the endpoint until the returned `render_version` matches the latest commit's expected value.

---

## Layout overflow issues (Stage 6 / chart_generator + Stage 7 / overflow retry)

### 5. 6-card grid using `imp-grid` overflows

**Symptom:** `overflow_detected: true` with `overflow_px: ~25-30px` on a page that uses `imp-grid` with 6 cards.

**Root cause:** `imp-grid` is defined as `grid-template-columns: repeat(5, 1fr)` — it's the 5-card strategic-implications grid. Putting 6 cards in it wraps the 6th to a second row, pushing total height to ~746px.

**Fix:** If your section needs a 6-card layout (e.g. AI use cases), use `ai-usecase-grid` (which is defined as `repeat(3, 1fr) / repeat(2, 1fr)`) OR inline-override the grid template:

```html
<div class="imp-grid" style="grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(2,1fr);">
```

For Phase 2: consider promoting this to a named class like `imp-grid-2x3` if it recurs.

### 6. Long verbatim quote in callout overflows

**Symptom:** Single callout card overflows its 100px min-height; total page height crosses 720px.

**Root cause:** A direct quote from a UC3 user-input file was placed in a callout slot that has a 30-char label cap. Quotes should never go in callouts.

**Fix:** Move long quotes to `.quote-block` elements (defined in UC3 test output's CSS — uses a violet left-border for user-input source). Callouts hold numbers + units + a 30-char label + change line, nothing more.

---

## Voice + content issues (Stage 5)

### 7. Headlines drifting to Title Case

**Symptom:** A drafted headline looks like "Market Structure: Consolidating To Highly Concentrated" instead of "Market structure: consolidating to highly concentrated".

**Root cause:** Default LLM tendency, especially when the topic includes proper nouns or industry-standard caps (HHI, IKN).

**Fix:** Lowercase the headline before output, then manually re-capitalise:
- First word of the sentence: cap
- Proper nouns: cap (Indonesia, Etex, Mitra10, IKN, HHI as the acronym)
- Everything else: lowercase

This is in `prompts/voice_guide.md` Section 2 and `docs/voice_examples.md`. Refer back if drift recurs.

### 8. Numbers without source tags

**Symptom:** Body text contains "USD 1.8 bn" with no `[primary]` / `[secondary]` / `[estimate]` tag.

**Root cause:** Especially common when the draft was copied from a research_data file that had source metadata in a separate field — the metadata gets dropped during the prose flow.

**Fix:** After drafting a section, do a regex sweep: every `\d+(\.\d+)?\s*(bn|m|%|ton|year)` needs a tag within 30 chars. Untagged numbers get cut, not "kept and improved later".

### 9. Anti-positioning leak — competitor firm name slipped through

**Symptom:** Body or chart-source line contains `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC`, `McKinsey`, or `Claude`.

**Root cause:** Common in chart-source lines where the temptation is to cite the named research firm that anchored a number. The brand rule forbids these in visible copy.

**Fix:** Compressed citation format. Replace named firm with generic descriptor + KIRA attribution:
- Instead of: `Source: Mordor Intelligence, KIRA analysis`
- Write: `SOURCE: industry research firms (anonymised), KIRA analysis`

OR use the underlying primary source the firm aggregated from:
- Instead of: `Source: Euromonitor 2025`
- Write: `SOURCE: BPS, industry trade press, KIRA RESEARCH 2026`

Pre-commit scan command (run from repo root):
```bash
grep -rni "mordor\|frost\|euromonitor\|synovate\|ipsos\|imarc\|\bmckinsey\b\|\bclaude\b" \
  skills/kira-research-report/outputs/ \
  --include="*.html"
```

---

## Mode-routing issues (Stage 2)

### 10. UC1 forced template doesn't fit topic well

**Symptom:** User passes `--template market_analysis` for a topic like "AI agents in B2B SaaS" that scores poorly against the blueprint.

**Root cause:** User flag overrides blueprint match score by design.

**Fix:** Respect the user's override, but add a `warnings` entry to the orchestrator output noting the score mismatch. Don't silently downgrade their request to UC2.

### 11. UC2 forced (`--design`) when a blueprint would have scored ≥ 0.7

**Symptom:** User passes `--design` on a topic that fits the market_analysis blueprint cleanly.

**Root cause:** User explicitly chose design mode.

**Fix:** Respect it. Note the bypassed blueprint in `warnings` so the user sees they had an alternative.

### 12. UC3 user uploaded files but topic is generic

**Symptom:** User attaches files but the topic string is something like "competitive comparison of X" — orchestrator might want to route via blueprint match if `has_uploaded_files` weren't true.

**Root cause:** None — UC3 is the correct route. Files trump blueprint match by design.

**Fix:** Always UC3 when files are present. Note in `reasoning` that a blueprint would have scored well if the user intended a templated structure without their data — they can re-invoke without files if that's what they want.

---

## Build / CI issues

### 13. `git push` rejected: divergent local vs remote main

**Symptom:** `! [rejected]        main -> main (fetch first)`.

**Root cause:** Henry switches machines mid-work (saved in user memory). Another machine pushed commits in the meantime.

**Fix:** `git pull --rebase origin main` before push. The skill build's commits are additive (new files in `skills/`, `api/`), so conflicts are rare. If a conflict arises, prefer Henry's machine state for code paths he touched directly.

### 14. Smoke tests run on every deploy — make sure render-pdf doesn't break them

**Symptom:** Hypothetically: smoke test failures after deploying skill-side changes.

**Root cause:** `tests/smoke.spec.js` runs 79 Playwright checks against prod after every `deployment_status` success event. Adding a new API endpoint can interact with `vercel.json` rewrites if you're not careful.

**Fix:** Don't add wildcard rewrites that catch the new endpoint path; the `api/*.js` glob in `vercel.json` already covers function routing. If a smoke test breaks, check if a redirect or rewrite is accidentally catching the new endpoint URL. There's a smoke test that asserts `/api/_lib/email` is NOT a public route — same principle should hold for any new `_`-prefixed helper.

---

## When in doubt

1. Read [SKILL.md](../SKILL.md) Section "Hard rules" first — most issues trace back to one of those eight rules.
2. Refer to [docs/voice_examples.md](voice_examples.md) for voice anchors — copy the rhythm, not the words.
3. Refer to [docs/chart_patterns.md](chart_patterns.md) before composing a new chart from scratch.
4. If render fails on Vercel, the user-memory entry "@sparticuz/chromium on Vercel: 3 non-obvious tweaks" has the chain of fixes documented.
5. Brand rule violations are zero-tolerance. Scan for them with the grep above before committing test outputs.
