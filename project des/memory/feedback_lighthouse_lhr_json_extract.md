---
name: lighthouse-lhr-json-extract
description: "Lighthouse temp-storage report URLs are SPA shells — extract the LHR via `window.__LIGHTHOUSE_JSON__` to see exactly which audits + elements failed. WebFetch alone returns no data."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 792ec067-480b-4789-a6f3-98cffbc75d7f
---

When Lighthouse CI fails and uploads to temporary-public-storage (URL pattern `https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/<id>.report.html`), the page is a single-page-app shell. WebFetch / curl on the URL returns the shell HTML with `<h1>Lighthouse Report</h1>` and nothing else — the audit data is injected at runtime via a `window.__LIGHTHOUSE_JSON__ = {...}` blob inside a `<script>` tag.

**Why:** Without the JSON, you can't tell which audit (color-contrast / heading-order / select-name / link-text / etc.) tripped or which DOM nodes were flagged — only the category subtotals (e.g. "accessibility 0.86"). That's not enough to fix the right thing.

**How to apply:** Use this exact extraction pattern when diagnosing an LHCI run.

```bash
# 1. Download the report HTML
curl -sLo /tmp/lh.html "<storage URL from the LHCI log>"

# 2. Parse out the LHR JSON + walk failing audits
node -e "
const fs = require('fs');
const html = fs.readFileSync('/tmp/lh.html', 'utf8');
const m = html.match(/window\.__LIGHTHOUSE_JSON__\s*=\s*({[\s\S]*?});\s*<\/script>/);
const lhr = JSON.parse(m[1]);
for (const catKey of Object.keys(lhr.categories)) {
  const cat = lhr.categories[catKey];
  console.log(catKey, cat.score);
  for (const ref of cat.auditRefs) {
    const a = lhr.audits[ref.id];
    if (a.score === null || a.score >= 1) continue;
    console.log(' FAIL', ref.id, '(weight=' + ref.weight + ')');
    if (a.details?.items) for (const it of a.details.items) {
      if (it.node) console.log('  node:', it.node.selector || it.node.snippet);
    }
  }
}
"
```

Each `details.items[].node.selector` gives you the exact CSS selector lighthouse-axe used to mark a failing element — paste it into Grep/Read to locate the source.

PowerShell equivalent for downloading on Windows: `Invoke-WebRequest -UseBasicParsing <url> -OutFile $env:TEMP\lh.html` then call Node.

This is also the only way to read Lighthouse `link-text` failures — the audit details include the exact `{href, text}` it considered non-descriptive, including locale-specific blocklist hits (e.g. Korean `전체 보기` matched the KO short-link blocklist).

## Related
- [[reference_kira_research]] — `lighthouse.yml` is the workflow that produces these temp report URLs
- [[feedback_kira_aa_contrast_tokens]] — fix that came from a typical LHCI diagnosis cycle
