// ============================================================
// KIRA RESEARCH — api/render-pdf.js
//
// Vercel serverless function: HTML → PDF conversion.
// Called by the kira-research-report skill (Stage 7) to render
// fully-assembled report HTML into a 1280×720 PDF.
//
// POST /api/render-pdf
//   Headers: { 'X-Api-Key': <PDF_RENDER_SECRET> }
//   Body:    { html: string, filename?: string }
//   Returns: { success, filename, pdf_base64, pdf_size_bytes, page_count,
//              overflow_detected, overflow_pages, rendered_at }
// ============================================================

// CRITICAL: @sparticuz/chromium-min runs Lambda-environment detection at
// MODULE LOAD time — its index.js body calls setupLambdaEnvironment() which
// prepends /tmp/al2023/lib to LD_LIBRARY_PATH. Vercel's runtime is
// Lambda-compatible but doesn't set AWS_EXECUTION_ENV the way native Lambda
// does, so without spoofing, that detection fails and LD_LIBRARY_PATH never
// includes the lib directory — chromium then launches but immediately fails
// with `libnss3.so: cannot open shared object file`.
//
// Setting the env var before a static `import` doesn't work in ESM because
// imports are hoisted above all top-level statements. Setting it before a
// dynamic `import()` (or `await import()`) DOES work because evaluation is
// strictly top-down. So we set the env var, then dynamically import.
if (!process.env.AWS_EXECUTION_ENV) {
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
}
const chromium = (await import('@sparticuz/chromium-min')).default;
const puppeteer = (await import('puppeteer-core')).default;

export const config = {
  maxDuration: 60,
};

const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

const RENDER_VERSION = 'render-pdf-v6';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const expectedKey = process.env.PDF_RENDER_SECRET;
  if (!expectedKey || req.headers['x-api-key'] !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { html, filename = 'report.pdf' } = req.body || {};
  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing required field: html (string)' });
  }
  if (html.length > 5_000_000) {
    return res.status(413).json({ error: 'HTML too large (max 5MB)' });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--font-render-hinting=none',
        '--disable-web-security',
      ],
      defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30_000,
    });
    await page.evaluateHandle('document.fonts.ready');

    // puppeteer-core 23+ returns a Uint8Array, not a Node Buffer. Wrap so
    // .toString('base64') actually base64-encodes instead of returning the
    // decimal-byte CSV that Uint8Array.toString() produces by default.
    const pdfBuffer = Buffer.from(await page.pdf({
      width: '1280px',
      height: '720px',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
    }));

    const overflowReport = await page.evaluate(() => {
      const pages = document.querySelectorAll('.page');
      const overflows = [];
      pages.forEach((p, i) => {
        const actualHeight = p.scrollHeight;
        if (actualHeight > 720) {
          overflows.push({
            page_index: i,
            page_num: i + 1,
            actual_height_px: actualHeight,
            overflow_px: actualHeight - 720,
          });
        }
      });
      return overflows;
    });

    await browser.close();
    browser = null;

    return res.status(200).json({
      success: true,
      filename,
      pdf_base64: pdfBuffer.toString('base64'),
      pdf_size_bytes: pdfBuffer.length,
      page_count: (html.match(/<div class="page(?=["\s])(?:[^"]*)?"/g) || []).length,
      overflow_detected: overflowReport.length > 0,
      overflow_pages: overflowReport,
      rendered_at: new Date().toISOString(),
      render_version: RENDER_VERSION,
    });
  } catch (error) {
    console.error('PDF render failed:', error);
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
    return res.status(500).json({
      success: false,
      error: error.message,
      render_version: RENDER_VERSION,
      ld_library_path: process.env.LD_LIBRARY_PATH || null,
    });
  }
}
