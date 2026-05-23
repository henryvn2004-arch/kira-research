---
name: sparticuz-chromium-vercel-gotchas
description: Three gotchas getting @sparticuz/chromium-min to render PDFs on Vercel serverless — handoff specs miss all three
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bc7cfba9-ff8b-4a3a-9cd6-670393e7d3c2
---

@sparticuz/chromium-min + puppeteer-core on Vercel needs three non-obvious tweaks beyond the README. Handoff docs we received specified none of them.

**1. Spoof `AWS_EXECUTION_ENV` before the import.** Vercel runs functions on Lambda-compatible compute but does NOT set `AWS_EXECUTION_ENV` the way native Lambda does. The package's `index.js` calls `setupLambdaEnvironment("/tmp/al2023/lib")` at module-load and only prepends that path to `LD_LIBRARY_PATH` if the env var is already set. Without the spoof, the AL2023 lib tarball (`libnss3.so` and friends) downloads into `/tmp/chromium-pack/al2023.tar.br` but never extracts to `/tmp/al2023/lib`, and chromium launches but immediately dies with `libnss3.so: cannot open shared object file`.

```js
if (!process.env.AWS_EXECUTION_ENV) {
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
}
const chromium = (await import('@sparticuz/chromium-min')).default;
```

**2. Use dynamic `import()`, not static `import`.** ESM hoists static imports above all top-level statements, so a `process.env = …` line above the import does NOT actually run first. Dynamic `await import()` is evaluated strictly top-down, so the env spoof actually takes effect before module load.

**3. Wrap `page.pdf()` output in `Buffer.from()` before `.toString('base64')`.** puppeteer-core 23+ returns a `Uint8Array`. Calling `.toString('base64')` on a `Uint8Array` does NOT base64-encode — it returns the default JS `Uint8Array.prototype.toString` output, which is decimal byte values joined by commas. Looks plausible in a JSON response but corrupts every byte downstream.

```js
const pdfBuffer = Buffer.from(await page.pdf({ ... }));
```

**Why:** Sunk ~90 min on KIRA `/api/render-pdf` deploy in the 2026-05-22 session debugging this chain. The handoff `claude_code_setup_prompt.md` specified `puppeteer-core@^21.11.0` + `@sparticuz/chromium@^121.0.0` (CommonJS pattern, version mismatch, no env spoof, no Buffer wrap) — none of it works on Vercel. Working pair: `puppeteer-core@^23.10.4` + `@sparticuz/chromium-min@^131.0.1` + remote pack tarball from GitHub Releases.

**How to apply:** Any future serverless PDF / scraping function on Vercel that wants @sparticuz/chromium. Diagnose by adding a `?debug=1` mode that returns `process.env.LD_LIBRARY_PATH`, `existsSync('/tmp/lib')` (or `/tmp/al2023/lib`), and `readdirSync('/tmp/chromium-pack')` — if the al2023 tarball is present but unextracted, that's symptom #1. Working render endpoint shipped as [api/render-pdf.js](api/render-pdf.js) on kira-research repo. See also [[kira-research-external-resources]] for the PDF_RENDER_SECRET env var lives in Vercel project settings.
