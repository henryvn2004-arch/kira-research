#!/usr/bin/env node
// geo-i18n-gate.mjs — code gate (no model) for the ja / ko / zh versions of GEO rows.
//
// Input: a GEO rows file { answers: [...], field_claims: [...] } whose rows carry
//   i18n.<loc>.question + i18n.<loc>.answer_short   (answers)
//   i18n.<loc>.claim_text                           (field claims)
// For each row and locale the translation is kept only if:
//   - every field is present and non-empty;
//   - the numbers in it are exactly the numbers of the English text (same tokens, same count; full-width digits allowed);
//   - an answer still names KIRA as the source (the Latin word "KIRA");
//   - a transcript answer carries the locale's fixed basis-label opening (BASIS_OPEN below).
// Failing locales are removed from the row; the English row itself is never touched.
//
// Usage: node scripts/geo-i18n-gate.mjs --rows geo.json [--out geo.json]

import fs from 'node:fs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

export const LOCALES = ['ja', 'ko', 'zh'];
// One fixed rendering per locale of "KIRA field research (interviews with ... across Asia)".
export const BASIS_OPEN = { ja: 'KIRAフィールドリサーチ', ko: 'KIRA 현장 리서치', zh: 'KIRA实地调研' };

const toAscii = (s) => String(s || '').replace(/[０-９．，]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
const NUM_RE = /\d[\d,.]*\d|\d/g;
const norm = (t) => { let s = t.replace(/,/g, '').replace(/\.$/, ''); if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, ''); return s; };
const nums = (s) => (toAscii(s).match(NUM_RE) || []).map(norm).sort();
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

function check(enText, tr, fields, extra) {
  const reasons = [];
  for (const f of fields) if (!tr?.[f] || !String(tr[f]).trim()) reasons.push(`${f} missing`);
  if (reasons.length) return reasons;
  if (!same(nums(enText), nums(fields.map((f) => tr[f]).join(' ')))) reasons.push('numbers differ from English');
  if (extra) reasons.push(...extra());
  return reasons;
}

const rows = JSON.parse(fs.readFileSync(opt('--rows'), 'utf8'));
const tally = Object.fromEntries(LOCALES.map((l) => [l, { kept: 0, dropped: 0 }]));
const fails = [];

for (const r of rows.answers || []) {
  for (const loc of LOCALES) {
    const tr = r.i18n?.[loc]; if (!tr) continue;
    const reasons = check(`${r.question} ${r.answer_short}`, tr, ['question', 'answer_short'], () => {
      const out = [];
      if (!/KIRA/.test(tr.answer_short)) out.push('source KIRA not named');
      if (r.source_kind === 'transcript' && !tr.answer_short.includes(BASIS_OPEN[loc])) out.push('basis label missing');
      return out;
    });
    if (reasons.length) { delete r.i18n[loc]; tally[loc].dropped++; fails.push(`${loc} ✗ ${r.question.slice(0, 60)} — ${reasons.join('; ')}`); } else tally[loc].kept++;
  }
}
for (const c of rows.field_claims || []) {
  for (const loc of LOCALES) {
    const tr = c.i18n?.[loc]; if (!tr || typeof tr !== 'object') continue;
    const reasons = check(c.claim_text, tr, ['claim_text']);
    if (reasons.length) { delete c.i18n[loc]; tally[loc].dropped++; fails.push(`${loc} ✗ ${c.claim_text.slice(0, 60)} — ${reasons.join('; ')}`); } else tally[loc].kept++;
  }
}

fs.writeFileSync(opt('--out') || opt('--rows'), JSON.stringify(rows, null, 2));
console.log(LOCALES.map((l) => `${l} ${tally[l].kept} kept / ${tally[l].dropped} dropped`).join(' · '));
for (const f of fails) console.log(`  ${f}`);
