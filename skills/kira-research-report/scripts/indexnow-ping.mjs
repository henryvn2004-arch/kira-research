#!/usr/bin/env node
// Tell IndexNow that report / insight / transcript pages were published or changed.
//   node skills/kira-research-report/scripts/indexnow-ping.mjs --report <slug>
//   node skills/kira-research-report/scripts/indexnow-ping.mjs --insight <slug> --transcript <slug>
//   node skills/kira-research-report/scripts/indexnow-ping.mjs --url https://kiraresearch.com/en/...
// Needs env INDEXNOW_KEY; without it prints {"skipped":"no_key"} and exits 0 (the daily cron
// /api/cron-indexnow catches the same pages anyway). Never fails a publish.
import { submitUrls } from '../../../api/_lib/indexnow.js';
import { BASE, LOCALES } from '../../../api/_lib/ssr.js';

const a = process.argv.slice(2);
const urls = [];
for (let i = 0; i < a.length; i += 2) {
  const [k, v] = [a[i], a[i + 1]];
  if (!v) continue;
  const slug = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (k === '--report') { LOCALES.forEach((l) => urls.push(`${BASE}/${l}/reports/${slug}`)); LOCALES.forEach((l) => urls.push(`${BASE}/${l}/library`)); }
  else if (k === '--insight') { LOCALES.forEach((l) => urls.push(`${BASE}/${l}/insights/${slug}`)); LOCALES.forEach((l) => urls.push(`${BASE}/${l}/insights/`)); }
  else if (k === '--transcript') { LOCALES.forEach((l) => urls.push(`${BASE}/${l}/experts/transcripts/${slug}`)); urls.push(`${BASE}/en/experts/transcripts/`); }
  else if (k === '--url') urls.push(v);
}
console.log(JSON.stringify(await submitUrls(urls)));
