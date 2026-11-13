// ============================================================
// /api/render-pdf.js
// 
// Vercel serverless function: HTML → PDF conversion
// Used by KIRA pipeline routine to generate report PDFs.
// 
// Deploy to: kiraresearch repo, in /api/ folder
// Vercel auto-deploys on push to main.
//
// Requires npm packages: puppeteer-core, @sparticuz/chromium
// Add to package.json:
//   "puppeteer-core": "^21.0.0",
//   "@sparticuz/chromium": "^119.0.0"
//
// Vercel function config (add to top of file):
// ============================================================

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Vercel function config
module.exports.config = {
  maxDuration: 60,  // Max 60s for Pro plan
  memory: 1024,     // 1GB for Chromium
};

module.exports.default = async function handler(req, res) {
  // === CORS for routine to call from Anthropic cloud ===
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // === Auth check (simple shared secret) ===
  const expectedKey = process.env.PDF_RENDER_SECRET;
  if (expectedKey && req.headers['x-api-key'] !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // === Parse input ===
  const { html, filename = 'report.pdf' } = req.body || {};

  if (!html || typeof html !== 'string') {
    return res.status(400).json({ error: 'Missing required field: html (string)' });
  }

  if (html.length > 5_000_000) {
    return res.status(413).json({ error: 'HTML too large (max 5MB)' });
  }

  let browser = null;
  try {
    // === Launch headless Chromium ===
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--font-render-hinting=none',  // Cleaner font rendering
        '--disable-web-security',
      ],
      defaultViewport: {
        width: 1280,
        height: 720,
        deviceScaleFactor: 2,  // Retina-quality for PDF
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // === Load HTML ===
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],  // Wait for fonts/images
      timeout: 30_000,
    });

    // === Wait for fonts to fully load ===
    await page.evaluateHandle('document.fonts.ready');

    // === Render PDF ===
    const pdfBuffer = await page.pdf({
      width: '1280px',
      height: '720px',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
    });

    // === Optional: overflow detection ===
    // Measure each .page element rendered height. If any exceeds 720px, flag.
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

    // === Return PDF as base64 + metadata ===
    res.status(200).json({
      success: true,
      filename,
      pdf_base64: pdfBuffer.toString('base64'),
      pdf_size_bytes: pdfBuffer.length,
      page_count: (html.match(/<div class="page/g) || []).length,
      overflow_detected: overflowReport.length > 0,
      overflow_pages: overflowReport,
      rendered_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('PDF render failed:', error);

    if (browser) {
      try { await browser.close(); } catch (_) {}
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};
