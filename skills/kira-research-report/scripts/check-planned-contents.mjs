#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/check-planned-contents.mjs — "Planned contents" for coming-soon pages
//
//   node scripts/check-planned-contents.mjs <plans.json> [--input <topics.json>]
//
// plans.json is an array of { slug, chapters: [{ title, pages: [title, ...] }] }.
// The titles are shown to readers on the coming-soon page BEFORE any research is done, so they must
// say what a page will show, never what it will find: no numbers, no claims, no brain-internal names.
// Optional --input is the topic list the plans were written from (array of { slug, guiding_questions });
// every slug must be planned once and the chapter count must match its guiding questions.
// Prints one JSON line; exit 0 = ok, 1 = problems (listed).
// ---------------------------------------------------------------
import fs from 'node:fs';

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
const ii = args.indexOf('--input');
const inputFile = ii >= 0 ? args[ii + 1] : null;
if (!file) { console.error('usage: check-planned-contents.mjs <plans.json> [--input topics.json]'); process.exit(2); }

const plans = JSON.parse(fs.readFileSync(file, 'utf8'));
const input = inputFile ? JSON.parse(fs.readFileSync(inputFile, 'utf8')) : null;
const bad = [];

// Words that never appear in reader-facing copy (project hard constraints) plus framework names.
const DENY = /\b(AI|A\.I\.|Claude|Anthropic|McKinsey|Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Statista|SWOT|PESTLE?|PESTEL|Porter|BCG|Ansoff|Bain|Gartner|Forrester|Deloitte|PwC|KPMG|EY|brain|module|framework|playbook)\b/i;
const FORBIDDEN_CHARS = /[<>{}\[\]`\\|]/;
const DIGITS = /\d+/g;
const ALLOWED_NUM = /^(20(19|2\d|3[01]))$/;   // a year only; no figures, shares or amounts
const CLAIMS = /(%|\$|¥|€|£|\bbillion\b|\bmillion\b|\bfastest\b|\blargest\b|\bbiggest\b|\bleading\b|\bsurge|\bboom\b|\bdominat)/i;

function checkTitle(where, t, max) {
  if (typeof t !== 'string') return bad.push(`${where}: not a string`);
  const s = t.trim();
  if (s.length < 8 || s.length > max) bad.push(`${where}: length ${s.length} (need 8-${max}): "${s}"`);
  if (s !== t || /\s{2}/.test(s)) bad.push(`${where}: stray spaces: "${t}"`);
  if (FORBIDDEN_CHARS.test(s)) bad.push(`${where}: forbidden character: "${s}"`);
  if (DENY.test(s)) bad.push(`${where}: forbidden word (${s.match(DENY)[0]}): "${s}"`);
  if (CLAIMS.test(s)) bad.push(`${where}: reads as a claim or a figure (${s.match(CLAIMS)[0]}): "${s}"`);
  for (const n of s.match(DIGITS) || []) if (!ALLOWED_NUM.test(n)) bad.push(`${where}: number "${n}" (only years allowed): "${s}"`);
  if (/[.!?]$/.test(s)) bad.push(`${where}: ends with punctuation: "${s}"`);
  if (/[A-Z]/.test(s.slice(1).replace(/\b[A-Z]{2,}\b/g, '').replace(/(^|[ (/-])[A-Z][a-z]+/g, '$1'))) {
    // Sentence case: capitals only on the first word, proper nouns and acronyms. Loose check, warns only.
  }
}

if (!Array.isArray(plans)) { console.log(JSON.stringify({ ok: false, problems: ['file is not an array'] })); process.exit(1); }
const seen = new Set();
const want = input ? new Map(input.map(t => [t.slug, t])) : null;
for (const p of plans) {
  const w = `[${p && p.slug}]`;
  if (!p || typeof p.slug !== 'string') { bad.push(`${w}: no slug`); continue; }
  if (seen.has(p.slug)) bad.push(`${w}: planned twice`);
  seen.add(p.slug);
  if (want && !want.has(p.slug)) bad.push(`${w}: not in the input list`);
  if (!Array.isArray(p.chapters) || p.chapters.length < 4 || p.chapters.length > 6) { bad.push(`${w}: need 4-6 chapters`); continue; }
  const gq = want && want.get(p.slug) && want.get(p.slug).guiding_questions;
  if (gq && gq.length !== p.chapters.length) bad.push(`${w}: ${p.chapters.length} chapters for ${gq.length} guiding questions`);
  let pages = 0; const titles = new Set();
  p.chapters.forEach((c, i) => {
    checkTitle(`${w} chapter ${i + 1}`, c && c.title, 70);
    if (!c || !Array.isArray(c.pages) || c.pages.length < 2 || c.pages.length > 4) { bad.push(`${w} chapter ${i + 1}: need 2-4 pages`); return; }
    c.pages.forEach((t, j) => {
      checkTitle(`${w} chapter ${i + 1} page ${j + 1}`, t, 95);
      const k = String(t).toLowerCase();
      if (titles.has(k)) bad.push(`${w}: page title repeated: "${t}"`);
      titles.add(k); pages++;
    });
  });
  if (pages < 10 || pages > 18) bad.push(`${w}: ${pages} pages in total (need 10-18)`);
}
if (want) for (const s of want.keys()) if (!seen.has(s)) bad.push(`[${s}]: missing from the plans`);

console.log(JSON.stringify({ ok: bad.length === 0, plans: plans.length, problems: bad.slice(0, 60), problem_count: bad.length }));
process.exit(bad.length ? 1 : 0);
