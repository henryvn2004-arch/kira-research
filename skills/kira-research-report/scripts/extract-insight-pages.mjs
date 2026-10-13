#!/usr/bin/env node
// Cut whole pages out of the finished report HTML (EN / JA / KO / ZH) and turn
// them into insight article bodies. The pages already exist in every language,
// so nothing is rewritten or translated: same words, same numbers, same chart.
//
// Usage:
//   node extract-insight-pages.mjs --pages 4,7 --out <dir> \
//        --en <en.html> [--ja <ja.html>] [--ko <ko.html>] [--zh <zh.html>]
//
//   --pages  1-based page numbers in the report HTML (cover = 1; the page
//            counter printed in the page header uses the same numbering).
//            The first page becomes the opening block: its section label is the
//            h2, its sub-headline is the lede (the page hero shows both).
//
// Writes <dir>/<locale>.body.html and <dir>/insight.json (title, excerpt, lede,
// body, read_time per locale + the checks that ran). Does not touch the database.
//
// A locale is skipped (exit code 1) when its page count differs from EN or when
// it contains a forbidden term, so a misaligned translation never goes out.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const LOCALES = ['en', 'ja', 'ko', 'zh'];
const FORBIDDEN = /Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|クロード/i;
const READ_TIME = { en: n => `${n} min read`, ja: n => `${n}分で読了`, ko: n => `${n}분 읽기`, zh: n => `${n}分钟阅读` };
const COLON = { en: ': ', ko: ': ', ja: '：', zh: '：' };

const { values: arg } = parseArgs({
  options: {
    pages: { type: 'string' }, out: { type: 'string' },
    en: { type: 'string' }, ja: { type: 'string' }, ko: { type: 'string' }, zh: { type: 'string' },
  },
});
const wanted = (arg.pages || '').split(',').map(Number).filter(n => n > 0);
if (!wanted.length || !arg.out || !arg.en) {
  console.error('usage: extract-insight-pages.mjs --pages 4,7 --out <dir> --en <en.html> [--ja ..] [--ko ..] [--zh ..]');
  process.exit(2);
}

// ── HTML helpers (balanced-tag scan; report HTML is generated, not hand-written) ──
function elementEnd(html, start, tag) {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

function splitPages(html) {
  const re = /<(div|section)\s+class="page(?:\s[^"]*)?"[^>]*>/g;
  re.lastIndex = Math.max(html.search(/<body\b/i), 0);
  const pages = [];
  let m;
  while ((m = re.exec(html))) {
    const end = elementEnd(html, m.index, m[1]);
    if (end < 0) break;
    pages.push(html.slice(m.index, end));
    re.lastIndex = end;
  }
  return pages;
}

function pageInner(page) {
  const m = page.match(/<div\s+class="page-inner"[^>]*>/);
  if (!m) return null;
  return page.slice(m.index + m[0].length, elementEnd(page, m.index, 'div') - '</div>'.length);
}

function removeDiv(html, cls) {
  const re = new RegExp(`<div\\s+class="${cls}"[^>]*>`);
  let m;
  while ((m = re.exec(html))) html = html.slice(0, m.index) + html.slice(elementEnd(html, m.index, 'div'));
  return html;
}

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", mdash: '—', ndash: '–', hellip: '…' };
const text = h => h
  .replace(/<[^>]+>/g, ' ')
  .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  })
  .replace(/\s+/g, ' ').trim();

const grab = (html, re) => (html.match(re) || [])[1];

// Report classes get a kp- prefix so they cannot collide with site CSS; SVG
// classes are left alone (kira.css already styles them under .article-body svg).
function prefixClasses(html) {
  return html.split(/(<svg[\s\S]*?<\/svg>)/).map((part, i) => i % 2 ? part :
    part.replace(/class="([^"]*)"/g, (_, c) => 'class="' + c.trim().split(/\s+/).map(t => 'kp-' + t).join(' ') + '"')).join('');
}

function buildPage(page, first) {
  let h = pageInner(page);
  if (h == null) throw new Error('page has no .page-inner');
  h = h.replace(/<!--[\s\S]*?-->/g, '');
  const tag = text(grab(h, /<div\s+class="page-section-tag"[^>]*>([\s\S]*?)<\/div>/) || '');
  const h1 = text(grab(h, /<h1\s+class="page-h1"[^>]*>([\s\S]*?)<\/h1>/) || '');
  const sub = grab(h, /<p\s+class="page-subhead"[^>]*>([\s\S]*?)<\/p>/);
  h = removeDiv(removeDiv(h, 'page-header'), 'page-footer');
  h = h.replace(/<h1\s+class="page-h1"[\s\S]*?<\/h1>/, '');
  if (first) h = h.replace(/<p\s+class="page-subhead"[\s\S]*?<\/p>/, '');
  const heading = first ? (tag.split('·').pop().trim() || h1) : h1;
  return {
    h1, sub: sub ? text(sub) : '',
    html: `<section class="kp-page">\n<h2>${heading}</h2>\n${prefixClasses(h.trim())}\n</section>`,
  };
}

const nums = t => new Set((t.match(/\d[\d.,]*\d|\d/g) || []).filter(x => x.length > 1));

// ── Run ──
const parsed = {};
for (const loc of LOCALES) {
  if (!arg[loc]) continue;
  const html = fs.readFileSync(arg[loc], 'utf8');
  parsed[loc] = { html, pages: splitPages(html) };
}
const enPages = parsed.en.pages;
if (wanted.some(n => n > enPages.length)) {
  console.error(`EN has ${enPages.length} pages; asked for ${wanted.join(',')}`);
  process.exit(2);
}

fs.mkdirSync(arg.out, { recursive: true });
const result = { pages: wanted, locales: {}, checks: {} };
let failed = false;
let minutes = 1; // reading time comes from the EN body, so every language shows the same number

for (const loc of Object.keys(parsed)) {
  const { html, pages } = parsed[loc];
  const log = result.checks[loc] = { errors: [], warnings: [] };

  if (pages.length !== enPages.length) {
    log.errors.push(`page count ${pages.length} differs from EN ${enPages.length}`);
    failed = true;
    continue;
  }

  let built;
  try { built = wanted.map((n, i) => buildPage(pages[n - 1], i === 0)); }
  catch (e) { log.errors.push(e.message); failed = true; continue; }

  const body = built.map(b => b.html).join('\n');
  const plain = text(body);

  if (FORBIDDEN.test(plain)) { log.errors.push('forbidden term in body'); failed = true; continue; }

  // Integrity vs EN: same charts, same callouts, every EN figure present.
  wanted.forEach((n, i) => {
    const en = enPages[n - 1], lo = pages[n - 1];
    const cnt = (s, re) => (s.match(re) || []).length;
    if (cnt(en, /<svg/g) !== cnt(lo, /<svg/g)) log.warnings.push(`page ${n}: chart count differs from EN`);
    if (cnt(en, /class="callout/g) !== cnt(lo, /class="callout/g)) log.warnings.push(`page ${n}: callout count differs from EN`);
    const lost = [...nums(text(en))].filter(x => !nums(text(lo)).has(x));
    if (lost.length) log.warnings.push(`page ${n}: figures in EN not found here: ${lost.join(' ')}`);
    if (/\b(Section|Exhibit|page)\s*\d+/i.test(text(built[i].html))) log.warnings.push(`page ${n}: refers to a section/exhibit/page number`);
  });

  const cover = text(grab(html, /<h1[^>]*class="cover-title"[^>]*>([\s\S]*?)<\/h1>/) || grab(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) || '');
  const prefix = cover.split(/[:：]/)[0].trim();
  if (loc === 'en') minutes = Math.max(1, Math.round(plain.split(' ').length / 200));
  const lede = built[0].sub;
  if (lede.length > 500) log.warnings.push(`lede ${lede.length} chars (limit 500)`);

  result.locales[loc] = {
    title: `${prefix}${COLON[loc]}${built[0].h1}`,
    excerpt: lede.slice(0, 320),
    lede,
    body,
    read_time: READ_TIME[loc](minutes),
  };
  fs.writeFileSync(path.join(arg.out, `${loc}.body.html`), body + '\n');
}

fs.writeFileSync(path.join(arg.out, 'insight.json'), JSON.stringify(result, null, 2) + '\n');
for (const [loc, c] of Object.entries(result.checks)) {
  const ok = result.locales[loc] ? 'ok ' : 'SKIPPED';
  console.log(`${loc} ${ok} ${c.errors.map(e => 'ERROR ' + e).concat(c.warnings.map(w => 'warn ' + w)).join(' | ')}`);
}
process.exit(failed ? 1 : 0);
