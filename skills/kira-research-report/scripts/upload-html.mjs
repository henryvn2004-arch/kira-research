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
//   Pages are chosen by rule (exec summary + 1-2 proof pages, never decision
//   pages; see api/_lib/preview-pages.js). A numeric page-count forces the old
//   'first N pages' cut. DRY_RUN=1 prints the pick and uploads nothing.
import fs from 'node:fs';
import { inlineAssets } from './lib/inline-assets.mjs';
import { buildPreview } from '../../../api/_lib/preview-pages.js';

const [, , localPath, reportId, locale, pageCountArg] = process.argv;
if (!localPath || !reportId || !locale) {
  console.error('usage: upload-html.mjs <html-local-path> <report-id> <locale-en|ja|ko|zh> [page-count]');
  process.exit(2);
}
const pageCount = Number(pageCountArg) || 0;
const url = (process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL);
const key = (process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY);
if ((!url || !key) && !process.env.DRY_RUN) {
  console.error('SUPABASE_URL + SUPABASE_SERVICE_KEY env vars required');
  process.exit(2);
}

const fullHtml = inlineAssets(fs.readFileSync(localPath, 'utf8'), localPath);
const built = buildPreview(fullHtml, pageCount ? { firstN: pageCount } : {});
if (!built) {
  console.error(`could not find report pages in ${localPath}`);
  process.exit(1);
}
const preview = built.html;
console.log(`preview: free pages ${built.pick.free.map(i => i + 1).join(',')} of ${built.pick.total}` +
  `${built.pick.fallback ? ' (FALLBACK first pages)' : ''}: ${fullHtml.length} → ${preview.length} bytes`);
if (process.env.DRY_RUN) process.exit(0);

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
