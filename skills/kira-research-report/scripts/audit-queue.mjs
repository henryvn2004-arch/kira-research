#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/audit-queue.mjs — Phase Q.4 (2026-05-28)
//
// Auto-recover stale `*_in_progress` claims in data/report_queue.csv.
//
// Called from batch_runner.md Step 0.5 (before stage routing). Idempotent —
// if nothing is stale, the file is rewritten byte-for-byte (no diff, no
// commit needed).
//
// Recovery rules:
//   - Threshold = 90 minutes (2× the 45-min hard stage timeout).
//   - Strike-1 (first time stuck): revert status to prior stage, clear
//     claimed_at, append `auto-recovered <iso>` note to error_log.
//   - Strike-2 (error_log already contains "auto-recovered"): row already
//     recovered once and got stuck AGAIN → real bug. Set status = `error`,
//     leave for manual inspection.
//
// Also migrates the CSV schema in-place: if the `claimed_at` column is
// missing, append it to the header and pad every row with an empty value.
// Safe to run on a virgin CSV (recovered=0, no semantic change).
//
// Prints `recovered=<N>` on stdout. Caller checks this to decide whether
// to commit the CSV.
// ---------------------------------------------------------------

import fs from 'fs';
import path from 'path';

const QUEUE_PATH = path.resolve('data/report_queue.csv');
const STALE_MINUTES = 90;
const NOW = new Date();

const PRIOR_STAGE = {
  en_in_progress: 'pending',
  ja_in_progress: 'en_done',
  ko_in_progress: 'ja_done',
};

// ---- minimal CSV parser (handles double-quoted fields) ----
function parseLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (c === '"') { q = false; continue; }
      cur += c;
    } else {
      if (c === ',') { out.push(cur); cur = ''; continue; }
      if (c === '"' && cur === '') { q = true; continue; }
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function quote(s) {
  if (s == null) return '';
  const str = String(s);
  // RFC 4180 only requires quoting for [",\n], but the existing CSV style
  // also quotes any field containing `:` (topics + ISO timestamps + recovery
  // notes). Match that convention so re-writes produce minimal diffs.
  return /[",\n:]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function isStale(claimedAt) {
  if (!claimedAt || !claimedAt.trim()) return true;          // empty / legacy
  const t = Date.parse(claimedAt);
  if (Number.isNaN(t)) return true;                           // unparseable
  return (NOW - t) / 60000 > STALE_MINUTES;
}

// ---- read ----
const raw = fs.readFileSync(QUEUE_PATH, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';            // preserve EOL
const lines = raw.split(/\r?\n/);
const header = parseLine(lines[0]);

// Migrate schema: add claimed_at column if missing.
const schemaMigrated = !header.includes('claimed_at');
if (schemaMigrated) header.push('claimed_at');
const idx = Object.fromEntries(header.map((h, i) => [h, i]));

for (const k of ['id', 'status', 'error_log', 'claimed_at']) {
  if (idx[k] === undefined) {
    console.error(`audit-queue: missing required column "${k}"`);
    process.exit(2);
  }
}

let recovered = 0;
const out = [header.map(quote).join(',')];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (line === '') { out.push(''); continue; }

  const f = parseLine(line);
  while (f.length < header.length) f.push('');               // pad to schema

  const status = f[idx.status];
  const recoverable = status && PRIOR_STAGE[status];

  if (recoverable && isStale(f[idx.claimed_at])) {
    const prevLog = f[idx.error_log] || '';
    const strike2 = /auto-recovered/.test(prevLog);
    const nowIso = NOW.toISOString();
    const claimRef = f[idx.claimed_at] || '(no claimed_at)';

    if (strike2) {
      f[idx.status] = 'error';
      f[idx.error_log] = (prevLog ? prevLog + ' · ' : '') +
        `second-strike auto-recover skipped ${nowIso}: ${status} re-stale (claimed ${claimRef}); manual review`;
    } else {
      f[idx.status] = PRIOR_STAGE[status];
      f[idx.error_log] = (prevLog ? prevLog + ' · ' : '') +
        `auto-recovered ${nowIso}: ${status} stale > ${STALE_MINUTES}min (claimed ${claimRef})`;
    }
    f[idx.claimed_at] = '';
    recovered++;
  }

  out.push(f.map(quote).join(','));
}

// Only write back if something actually changed — keeps the CSV diff-clean
// when no recovery is needed, so the cron skips committing a no-op churn.
const next = out.join(eol);
if (next !== raw && (recovered > 0 || schemaMigrated)) {
  fs.writeFileSync(QUEUE_PATH, next);
}
console.log(`recovered=${recovered}`);
