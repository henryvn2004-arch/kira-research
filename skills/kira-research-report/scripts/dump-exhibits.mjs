#!/usr/bin/env node
// Print what an existing report's exhibits show, so their numbers can be written into exhibits.json (S12 backfill).
//
// Usage:
//   node skills/kira-research-report/scripts/dump-exhibits.mjs --id <queue id>
//
// Reads outputs/batch/<id>/en.html. For every exhibit frame it prints the page number, title, subtitle, source
// line, and either the tables (rows separated by " | ") or every SVG label in document order as
// "[class @x,y] text" (x,y help to match a value with its label: a bar's value sits beside its label's row,
// a column's value sits above its year). Nothing is guessed: this is only what is printed on the page.
// Format of exhibits.json: header of api/_lib/exhibits.js. Check with check-exhibits.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const i = process.argv.indexOf('--id');
const id = i > 0 ? process.argv[i + 1] : null;
if (!id || !/^[A-Za-z0-9._-]+$/.test(id)) { console.error('usage: dump-exhibits.mjs --id <queue id>'); process.exit(2); }
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '../outputs/batch', id, 'en.html');
if (!fs.existsSync(file)) { console.error('missing ' + file); process.exit(2); }
const html = fs.readFileSync(file, 'utf8');

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
const plain = (s) => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const inner = (block, cls) => { const m = block.match(new RegExp(`class="${cls}">([\\s\\S]*?)</div>`)); return m ? plain(m[1]) : ''; };

const starts = [...html.matchAll(/<div class="exhibit[ "]/g)].map((m) => m.index);
const counters = [...html.matchAll(/page-section-counter">\s*(\d+)\s*\//g)].map((m) => ({ at: m.index, page: +m[1] }));
const pageAt = (pos) => { let p = null; for (const c of counters) { if (c.at < pos) p = c.page; else break; } return p; };

starts.forEach((s, k) => {
  const block = html.slice(s, k + 1 < starts.length ? starts[k + 1] : html.length);
  console.log(`=== EXHIBIT ${k + 1} · page ${pageAt(s)} · ${inner(block, 'exhibit-title')}`);
  console.log(`  subtitle: ${inner(block, 'exhibit-sub')}`);
  console.log(`  source: ${inner(block, 'exhibit-note')}`);
  const tables = [...block.matchAll(/<table[\s\S]*?<\/table>/g)].map((m) => m[0]);
  if (tables.length) {
    tables.forEach((t, n) => {
      console.log(`  TABLE ${n + 1}:`);
      for (const r of t.match(/<tr[\s\S]*?<\/tr>/g) || []) console.log('   ' + [...r.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => plain(c[1])).join(' | '));
    });
    return;
  }
  const texts = [...block.matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)].map((m) => {
    const a = m[1], cls = (a.match(/class="([^"]*)"/) || [])[1] || '-', x = (a.match(/\bx="([\d.]+)"/) || [])[1], y = (a.match(/\by="([\d.]+)"/) || [])[1];
    return `[${cls} @${x ? Math.round(x) : '?'},${y ? Math.round(y) : '?'}] ${plain(m[2])}`;
  }).filter((t) => !t.endsWith('] '));
  if (texts.length) console.log('  SVG labels:\n   ' + texts.join('\n   '));
  else console.log('  TEXT: ' + plain(block.replace(/<div class="exhibit-(title|sub|note)">[\s\S]*?<\/div>/g, '')).slice(0, 1500));
});
