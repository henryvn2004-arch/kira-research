#!/usr/bin/env node
// Slice the first N pages out of a full report HTML and upload as a
// preview to the public 'reports-html' Supabase bucket.
//
// Why slice before upload:
//   The bucket is PUBLIC (so the iframe on /<locale>/reports/<slug> can
//   embed it without auth). If we uploaded the full 22-page HTML, anyone
//   could read it via the direct URL and skip the paywall. Sliced files
//   contain only what the marketing preview is supposed to show.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
//   node upload-html.mjs <html-local-path> <report-id> <locale> [page-count]
//
//   page-count defaults to 5.
import fs from 'node:fs';

const [, , localPath, reportId, locale, pageCountArg] = process.argv;
if (!localPath || !reportId || !locale) {
  console.error('usage: upload-html.mjs <html-local-path> <report-id> <locale-en|ja|ko> [page-count]');
  process.exit(2);
}
const pageCount = Number(pageCountArg) || 5;
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL + SUPABASE_SERVICE_KEY env vars required');
  process.exit(2);
}

const fullHtml = fs.readFileSync(localPath, 'utf8');
const preview  = slicePreview(fullHtml, pageCount);
if (!preview) {
  console.error(`could not extract ${pageCount} pages from ${localPath}`);
  process.exit(1);
}
console.log(`sliced ${pageCount} pages: ${fullHtml.length} → ${preview.length} bytes`);

const bucket = 'reports-html';
const storagePath = `${reportId}/${locale}.html`;
const buffer = Buffer.from(preview, 'utf8');
console.log(`uploading to ${bucket}/${storagePath}`);

const r = await fetch(`${url}/storage/v1/object/${bucket}/${storagePath}`, {
  method: 'POST',
  headers: {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'text/html',
    'x-upsert':      'true',
    'cache-control': '3600',
  },
  body: buffer,
});
const text = await r.text();
console.log('status:', r.status);
console.log('body:', text);
if (!r.ok) process.exit(1);
console.log(`✓ uploaded → public URL: ${url}/storage/v1/object/public/${bucket}/${storagePath}`);

// ── HTML slicing ─────────────────────────────────────────────
// Extract <head>...</head> verbatim (preserves all CSS + font links the
// PDF master template injects). Then walk through <body> finding top-level
// <div class="page ..."> blocks. Track <div> depth so nested divs inside
// each page don't fool the matcher. Return reassembled HTML with the
// first N pages.
function slicePreview(html, count) {
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i);
  const head = headMatch ? headMatch[0] : '<head></head>';

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return null;
  const body = bodyMatch[1];

  const pages = [];
  const pageOpenRe = /<div\s+class="page[^"]*"[^>]*>/g;
  let m;

  while ((m = pageOpenRe.exec(body)) !== null && pages.length < count) {
    const startIdx   = m.index;
    let depth        = 1;
    let pos          = m.index + m[0].length;
    const openRe     = /<div\b/g;
    const closeRe    = /<\/div>/g;
    while (depth > 0 && pos < body.length) {
      openRe.lastIndex  = pos;
      closeRe.lastIndex = pos;
      const open  = openRe.exec(body);
      const close = closeRe.exec(body);
      if (!close) break;
      if (open && open.index < close.index) {
        depth++;
        pos = open.index + 4;
      } else {
        depth--;
        pos = close.index + 6;
      }
    }
    pages.push(body.slice(startIdx, pos));
    pageOpenRe.lastIndex = pos;
  }

  if (!pages.length) return null;

  return [
    '<!DOCTYPE html>',
    '<html lang="' + escapeAttr(getLang(html)) + '">',
    head,
    '<body>',
    pages.join('\n\n'),
    '</body>',
    '</html>',
  ].join('\n');
}

function getLang(html) {
  const m = html.match(/<html[^>]*\slang="([^"]+)"/i);
  return m ? m[1] : 'en';
}

function escapeAttr(s) {
  return String(s).replace(/[&"<>]/g, c => ({ '&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;' }[c]));
}
