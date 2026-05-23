#!/usr/bin/env node
// Render one HTML file to PDF via the Vercel /api/render-pdf endpoint.
// Usage: PDF_RENDER_SECRET=... node skills/kira-research-report/scripts/render-one.mjs <html-path> <pdf-out-path> [filename-for-response]
import fs from 'node:fs';

const [, , htmlPath, pdfPath, filename] = process.argv;
if (!htmlPath || !pdfPath) {
  console.error('usage: render-one.mjs <html-path> <pdf-out-path> [filename]');
  process.exit(2);
}
const secret = process.env.PDF_RENDER_SECRET;
if (!secret) {
  console.error('PDF_RENDER_SECRET env var is required');
  process.exit(2);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const r = await fetch('https://kiraresearch.com/api/render-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Api-Key': secret },
  body: JSON.stringify({ html, filename: filename || 'report.pdf' }),
});
console.log('status:', r.status);
const j = await r.json();
console.log(JSON.stringify({
  success: j.success,
  page_count: j.page_count,
  pdf_size_bytes: j.pdf_size_bytes,
  overflow_detected: j.overflow_detected,
  overflow_pages: j.overflow_pages,
  render_version: j.render_version,
}, null, 2));
if (!j.success) {
  console.error('render failed:', j.error);
  process.exit(1);
}
fs.writeFileSync(pdfPath, Buffer.from(j.pdf_base64, 'base64'));
console.log('wrote', fs.statSync(pdfPath).size, 'bytes to', pdfPath);
