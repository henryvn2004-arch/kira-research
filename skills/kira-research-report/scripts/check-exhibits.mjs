#!/usr/bin/env node
// Check a report's exhibits.json (the numbers behind each exhibit, S12) against its en.html.
//
// Usage:
//   node skills/kira-research-report/scripts/check-exhibits.mjs --id <queue id>
//
// Fails (exit 1, problems printed) when exhibits.json is malformed (api/_lib/exhibits.js
// validateExhibits), when an exhibit printed in en.html is in neither "exhibits" nor "skipped",
// or when an entry's title is not printed in en.html (usually a typo in the title).
// Exit 2 = missing file. Format and rules: header of api/_lib/exhibits.js and prompts/brain_route.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateExhibits } from '../../../api/_lib/exhibits.js';

const i = process.argv.indexOf('--id');
const id = i > 0 ? process.argv[i + 1] : null;
if (!id || !/^[A-Za-z0-9._-]+$/.test(id)) { console.error('usage: check-exhibits.mjs --id <queue id>'); process.exit(2); }
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../outputs/batch', id);
const need = (f) => { const p = path.join(dir, f); if (!fs.existsSync(p)) { console.error('missing ' + p); process.exit(2); } return fs.readFileSync(p, 'utf8'); };

const decode = (s) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

let data;
try { data = JSON.parse(need('exhibits.json')); } catch (e) { console.error('exhibits.json is not valid JSON: ' + e.message); process.exit(1); }
const problems = [...validateExhibits(data).errors];

const html = need('en.html');
const printed = [...html.matchAll(/class="exhibit-title">([\s\S]*?)<\/div>/g)].map((m) => decode(m[1]));
const listed = new Set([...(data.exhibits || []).map((x) => x && x.title), ...(data.skipped || []).map((x) => x && x.title)]);
for (const t of printed) if (!listed.has(t)) problems.push(`exhibit printed in en.html but missing from exhibits.json: "${t.slice(0, 70)}"`);
const printedSet = new Set(printed);
for (const x of data.exhibits || []) if (x && x.title && !printedSet.has(x.title)) problems.push(`title not printed in en.html (typo?): "${String(x.title).slice(0, 70)}"`);

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`exhibits.json ok: ${data.exhibits.length} exhibits, ${(data.skipped || []).length} skipped, ${printed.length} printed`);
