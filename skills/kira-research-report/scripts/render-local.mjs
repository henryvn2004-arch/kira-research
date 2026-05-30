#!/usr/bin/env node
// Local PDF renderer — fallback for when the Vercel /api/render-pdf host is
// unreachable (e.g. sandboxed CI/agent environments where kiraresearch.com is
// not in the network allowlist). Replicates api/render-pdf.js print settings
// (1280x720px, printBackground, zero margins, wait for fonts) using the
// Playwright-bundled chromium so output matches the production endpoint.
//
// Usage: node skills/kira-research-report/scripts/render-local.mjs <html-path> <pdf-out-path>
import fs from 'node:fs';
import { chromium } from 'playwright';

const [, , htmlPath, pdfPath] = process.argv;
if (!htmlPath || !pdfPath) {
  console.error('usage: render-local.mjs <html-path> <pdf-out-path>');
  process.exit(2);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const pageCount = (html.match(/<div class="page(?=["\s])(?:[^"]*)?"/g) || []).length;

const launchOpts = { args: ['--font-render-hinting=none', '--disable-web-security'] };
// Allow pointing at a specific chromium build (sandboxed envs may have a
// version-mismatched bundle without the headless_shell variant).
if (process.env.PW_CHROMIUM_PATH) launchOpts.executablePath = process.env.PW_CHROMIUM_PATH;
const browser = await chromium.launch(launchOpts);
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720, deviceScaleFactor: 2 } });
  await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 });
  try { await page.evaluate(() => document.fonts.ready); } catch (_) {}

  const overflows = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.page').forEach((p, i) => {
      if (p.scrollHeight > 720) out.push({ page_num: i + 1, actual_height_px: p.scrollHeight, overflow_px: p.scrollHeight - 720 });
    });
    return out;
  });

  const pdf = await page.pdf({
    width: '1280px',
    height: '720px',
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    displayHeaderFooter: false,
  });
  fs.writeFileSync(pdfPath, pdf);

  console.log(JSON.stringify({
    success: true,
    page_count: pageCount,
    pdf_size_bytes: pdf.length,
    overflow_detected: overflows.length > 0,
    overflow_pages: overflows,
    render_version: 'render-local-pw',
  }, null, 2));
  console.log('wrote', fs.statSync(pdfPath).size, 'bytes to', pdfPath);
} finally {
  await browser.close();
}
