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
//
// Vercel runs serverless functions on AWS Lambda compute, but does NOT set
// AWS_EXECUTION_ENV the way native Lambda does. @sparticuz/chromium-min
// uses that env var to decide whether to extract the AL2023 runtime libs
// (libnss3, libdrm, etc.) from chromium-pack into /tmp/lib. Without that
// extraction, chromium itself launches but immediately fails with
// `libnss3.so: cannot open shared object file`. We spoof AWS_EXECUTION_ENV
// before calling executablePath() so the package extracts libs correctly.
// ============================================================

if (!process.env.AWS_EXECUTION_ENV) {
  process.env.AWS_EXECUTION_ENV = 'AWS_Lambda_nodejs20.x';
}

import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

export const config = {
  maxDuration: 60,
};

const CHROMIUM_PACK_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar';

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

    const pdfBuffer = await page.pdf({
      width: '1280px',
      height: '720px',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
    });

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
    });
  }
}
