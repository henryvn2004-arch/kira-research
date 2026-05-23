#!/usr/bin/env node
// Upload one PDF to the Supabase Storage `reports-pdfs` bucket at <report_id>/<locale>.pdf.
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node upload-pdf.mjs <pdf-local-path> <report-id> <locale>
import fs from 'node:fs';

const [, , localPath, reportId, locale] = process.argv;
if (!localPath || !reportId || !locale) {
  console.error('usage: upload-pdf.mjs <pdf-local-path> <report-id> <locale-en|ja|ko>');
  process.exit(2);
}
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL + SUPABASE_SERVICE_KEY env vars required');
  process.exit(2);
}

const bucket = 'reports-pdfs';
const storagePath = `${reportId}/${locale}.pdf`;
const buffer = fs.readFileSync(localPath);
console.log(`uploading ${buffer.length} bytes to ${bucket}/${storagePath}`);

const r = await fetch(`${url}/storage/v1/object/${bucket}/${storagePath}`, {
  method: 'POST',
  headers: {
    'apikey':        key,
    'Authorization': `Bearer ${key}`,
    'Content-Type':  'application/pdf',
    'x-upsert':      'true',
    'cache-control': '3600',
  },
  body: buffer,
});
const text = await r.text();
console.log('status:', r.status);
console.log('body:', text);
if (!r.ok) process.exit(1);
console.log(`✓ uploaded → storage path: ${storagePath}`);
