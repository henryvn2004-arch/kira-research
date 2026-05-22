# Claude Code Setup Task — KIRA Pipeline Phase B + F

> Paste this entire prompt vào Claude Code Desktop. It has Vercel MCP + GitHub edit access. Nó sẽ tự làm hết phần Vercel setup + pre-flight test.

---

## CONTEXT

Tao đang setup pipeline cho `kiraresearch.com`. Một Routine sẽ generate reports + cần call HTTP endpoint để convert HTML → PDF. Endpoint này là Vercel serverless function tao chưa deploy.

## YOUR TASK

Hoàn thành 5 bước sau, report progress sau mỗi bước.

### Step 1 — Edit `package.json` trong repo `kiraresearch` (GitHub)

Thêm 2 dependencies (nếu chưa có):

```json
"puppeteer-core": "^21.11.0",
"@sparticuz/chromium": "^121.0.0"
```

Commit message: `Add puppeteer for PDF render endpoint`. Commit directly to `main` branch.

### Step 2 — Create file `api/render-pdf.js` trong repo `kiraresearch`

Nội dung file (copy nguyên xi):

```javascript
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports.config = {
  maxDuration: 60,
  memory: 1024,
};

module.exports.default = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  const expectedKey = process.env.PDF_RENDER_SECRET;
  if (expectedKey && req.headers['x-api-key'] !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { html, filename = 'report.pdf' } = req.body || {};
  if (!html || typeof html !== 'string') return res.status(400).json({ error: 'Missing html' });
  if (html.length > 5_000_000) return res.status(413).json({ error: 'HTML too large (max 5MB)' });

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: [...chromium.args, '--font-render-hinting=none', '--disable-web-security'],
      defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ['load', 'networkidle0'], timeout: 30_000 });
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      width: '1280px', height: '720px',
      printBackground: true, preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
    });

    const overflowReport = await page.evaluate(() => {
      const pages = document.querySelectorAll('.page');
      const overflows = [];
      pages.forEach((p, i) => {
        const actualHeight = p.scrollHeight;
        if (actualHeight > 720) {
          overflows.push({ page_index: i, page_num: i + 1, actual_height_px: actualHeight, overflow_px: actualHeight - 720 });
        }
      });
      return overflows;
    });

    await browser.close();
    browser = null;

    res.status(200).json({
      success: true, filename,
      pdf_base64: pdfBuffer.toString('base64'),
      pdf_size_bytes: pdfBuffer.length,
      page_count: (html.match(/<div class="page/g) || []).length,
      overflow_detected: overflowReport.length > 0,
      overflow_pages: overflowReport,
      rendered_at: new Date().toISOString(),
    });
  } catch (error) {
    if (browser) { try { await browser.close(); } catch (_) {} }
    return res.status(500).json({ success: false, error: error.message });
  }
};
```

Commit message: `Add PDF render endpoint for KIRA pipeline`. Commit directly to `main`.

### Step 3 — Set env var `PDF_RENDER_SECRET` trên Vercel (via Vercel MCP)

- Project: `kiraresearch`
- Key: `PDF_RENDER_SECRET`
- Value: generate random 32-char string (prefix `kira_pdf_`, e.g. `kira_pdf_a8f3b2c9d1e4f6...`)
- Environments: Production + Preview + Development (all 3)

Lưu lại giá trị này vào response để tao paste vào Routine sau.

### Step 4 — Trigger redeploy

Trigger production redeploy của project `kiraresearch`. Wait until status "Ready". Report deployment URL.

### Step 5 — Test endpoint

Sau khi deploy "Ready", test endpoint:

```bash
curl -X POST https://kiraresearch.com/api/render-pdf \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <PDF_RENDER_SECRET>" \
  -d '{"html":"<!DOCTYPE html><html><body><div class=\"page\" style=\"width:1280px;height:720px;background:#1E6FFF;color:white;display:flex;align-items:center;justify-content:center;font-size:48px;\">KIRA TEST</div></body></html>","filename":"test.pdf"}'
```

Report results:
- HTTP status code
- Response `success` field
- `pdf_size_bytes` (should be 30-100 KB for successful render)
- Any errors

Nếu fail, debug và fix. Common issues:
- 404 → check file path `api/render-pdf.js` (case-sensitive) đã commit chưa
- 401 → check env var value matches
- 500 puppeteer error → check Node version trong Vercel project settings (cần Node 20+)
- Build fail trên Vercel → check dependencies version compatibility

## FINAL REPORT

Sau khi xong 5 steps, summarize:

| Item | Status | Detail |
|---|---|---|
| package.json updated | ✅/❌ | commit SHA |
| api/render-pdf.js created | ✅/❌ | commit SHA |
| PDF_RENDER_SECRET set | ✅/❌ | (display value once for paste) |
| Vercel redeployed | ✅/❌ | deployment URL + Ready status |
| Test endpoint | ✅/❌ | HTTP code + pdf_size_bytes |

Nếu tất cả ✅, output PDF_RENDER_SECRET value cho tao paste vào Routine ở bước E.
