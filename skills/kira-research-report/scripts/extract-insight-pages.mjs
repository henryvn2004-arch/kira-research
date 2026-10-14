#!/usr/bin/env node
// Cut whole pages out of the finished report HTML (EN / JA / KO / ZH) and turn
// them into insight article bodies. The pages already exist in every language,
// so nothing is rewritten or translated: same words, same numbers, same chart.
//
// Usage:
//   node extract-insight-pages.mjs --pages auto --out <dir> \
//        --en <en.html> [--ja <ja.html>] [--ko <ko.html>] [--zh <zh.html>]
//
//   --pages  `auto` picks them from the EN file: the first page after the contents that holds a chart
//            (the executive summary / answer page) and, when there is one, the next page with a chart.
//            Or 1-based page numbers (`4,7`; cover = 1, the page counter in the header uses the same
//            numbering). The first page becomes the opening block: its section label is the h2, its
//            sub-headline is the lede (the page hero shows both).
//
// Writes <dir>/<locale>.body.html and <dir>/insight.json (title, excerpt, lede, body, read_time per
// locale + the checks that ran). Does not touch the database.
//
// Three page layouts are known (`exec`, `classic`, `exhibit`: see familyOf); their classes are styled by
// public/css/kira.css under `.article-body .kp-page`, and chart colours come from the block that
// sync-insight-chart-css.mjs generates there. A page in any other layout is not extracted.
//
// A locale is skipped (exit code 1) when its page count differs from EN, its page has another layout than
// the EN one, or it contains a forbidden term, so a misaligned translation never goes out. Exit code 4 =
// auto mode found no usable page, or the layout is unknown; nothing is written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { svgClassRules } from './lib/css-rules.mjs';
import { elementEnd, splitPages, text } from './lib/report-pages.mjs';

const LOCALES = ['en', 'ja', 'ko', 'zh'];
// クロード / 클로드 only when not part of a longer word (ワークロード = workload).
const FORBIDDEN = /Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|(?<![\u30A0-\u30FF])クロード|(?<![가-힣])클로드/i;
const READ_TIME = { en: n => `${n} min read`, ja: n => `${n}分で読了`, ko: n => `${n}분 읽기`, zh: n => `${n}分钟阅读` };
const COLON = { en: ': ', ko: ': ', ja: '：', zh: '：' };
// h2 of the opening block when the page has no section label of its own.
const SUMMARY = { en: 'Executive summary', ja: 'エグゼクティブ・サマリー', ko: '핵심 요약', zh: '执行摘要' };
const TOC_CLASSES = ['toc-list', 'toc-row', 'toc-col', 'toc-title', 'toc-num'];

const { values: arg } = parseArgs({
  options: {
    pages: { type: 'string' }, out: { type: 'string' },
    en: { type: 'string' }, ja: { type: 'string' }, ko: { type: 'string' }, zh: { type: 'string' },
  },
});
if (!arg.pages || !arg.out || !arg.en) {
  console.error('usage: extract-insight-pages.mjs --pages auto|4,7 --out <dir> --en <en.html> [--ja ..] [--ko ..] [--zh ..]');
  process.exit(2);
}

// ── HTML helpers (balanced-tag scan; report HTML is generated, not hand-written) ──
// Content of the page: inside .page-inner when the template has one, else inside the page element itself.
function pageInner(page) {
  const m = page.match(/<div\s+class="page-inner"[^>]*>/);
  if (m) return page.slice(m.index + m[0].length, elementEnd(page, m.index, 'div') - '</div>'.length);
  const open = page.match(/^<(div|section)[^>]*>/);
  return open ? page.slice(open[0].length, page.lastIndexOf('</')) : null;
}

function removeDiv(html, cls) {
  const re = new RegExp(`<div\\s+class="${cls}"[^>]*>`);
  let m;
  while ((m = re.exec(html))) html = html.slice(0, m.index) + html.slice(elementEnd(html, m.index, 'div'));
  return html;
}

// Scan instead of one regex pass: removing a comment can join the pieces around it into a new one,
// and the loop only ends when no comment opener is left (an unclosed one drops the rest).
function stripComments(html) {
  for (let i; (i = html.indexOf('<!--')) >= 0;) {
    const j = html.indexOf('-->', i + 2);
    html = html.slice(0, i) + (j < 0 ? '' : html.slice(j + 3));
  }
  return html;
}

const grab = (html, re) => (html.match(re) || [])[1];

// Report classes get a kp- prefix so they cannot collide with site CSS; SVG
// classes are left alone (kira.css styles them under .article-body svg).
function prefixClasses(html) {
  return html.split(/(<svg[\s\S]*?<\/svg>)/).map((part, i) => i % 2 ? part :
    part.replace(/class="([^"]*)"/g, (_, c) => 'class="' + c.trim().split(/\s+/).map(t => 'kp-' + t).join(' ') + '"')).join('');
}

// Chart classes public/css/kira.css already styles (`.article-body svg .x`: the hand-made ones + the block
// generated from master_styles.css). Older reports style a few more in their own <style>; those are copied.
const SITE_CSS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'public', 'css', 'kira.css');
const SITE_SVG = new Set(fs.existsSync(SITE_CSS) ? [...fs.readFileSync(SITE_CSS, 'utf8').matchAll(/\.article-body svg \.([\w-]+)/g)].map(m => m[1]) : []);
const ownStyle = html => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const svgClasses = html => new Set([...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].flatMap(m => [...m[0].matchAll(/class="([^"]*)"/g)].flatMap(c => c[1].split(/\s+/))).filter(Boolean));

// ── Layouts and page picking ──
const tokens = page => new Set([...page.replace(/<svg[\s\S]*?<\/svg>/g, '').matchAll(/class="([^"]*)"/g)].flatMap(m => m[1].split(/\s+/)));
const charts = page => (page.match(/<svg/g) || []).length;

// exec = Executive-summary template (callout cards + chart card); classic = the older template with
// callout-row / chart-card; exhibit = the BRAIN-route exhibit page (exhibit + commentary + takeaway).
function familyOf(page) {
  const t = tokens(page);
  if (t.has('exec-callouts') || t.has('exec-chart')) return 'exec';
  if (t.has('exhibit')) return 'exhibit';
  if (t.has('callout-row') || t.has('chart-card')) return 'classic';
  return null;
}

// First content page after the contents that holds a chart, then the next page with a chart.
function pickPages(pages) {
  let start = 3;
  pages.slice(0, 8).forEach((p, i) => { if (TOC_CLASSES.some(c => tokens(p).has(c))) start = i + 1; });
  const open = pages.findIndex((p, i) => i >= start && i < start + 4 && charts(p) > 0);
  if (open < 0) return null;
  const second = pages.findIndex((p, i) => i > open && i < 14 && charts(p) > 0 && familyOf(p));
  return second < 0 ? [open + 1] : [open + 1, second + 1];
}

const LEDE = /<(p|div)\s+class="(?:page-subhead|subhead|page-kicker)"[^>]*>([\s\S]*?)<\/\1>/;

function buildPage(page, first, loc) {
  let h = pageInner(page);
  if (h == null) throw new Error('page has no content');
  h = stripComments(h);
  const tag = text(grab(h, /<div\s+class="(?:page-section-tag|section-tag)"[^>]*>([\s\S]*?)<\/div>/) || '');
  const h1 = text(grab(h, /<h1\s+class="page-h1"[^>]*>([\s\S]*?)<\/h1>/) || '');
  const sub = (h.match(LEDE) || [])[2];
  h = removeDiv(removeDiv(h, 'page-header'), 'page-footer');
  h = h.replace(/<h1\s+class="page-h1"[\s\S]*?<\/h1>/, '');
  if (first) h = h.replace(LEDE, '');
  const heading = first ? (tag.split('·').pop().trim() || SUMMARY[loc]) : (h1 || tag.split('·').pop().trim());
  return {
    h1, sub: sub ? text(sub) : '',
    html: `<section class="kp-page">\n<h2>${heading}</h2>\n${prefixClasses(h.trim())}\n</section>`,
  };
}

const nums = t => new Set((t.match(/\d[\d.,]*\d|\d/g) || []).filter(x => x.length > 1));
const clip = (s, n) => s.length <= n ? s : (s.slice(0, n - 1).replace(/\s+\S*$/, '') || s.slice(0, n - 1)) + '…';

// ── Run ──
const parsed = {};
for (const loc of LOCALES) {
  if (!arg[loc]) continue;
  const html = fs.readFileSync(arg[loc], 'utf8');
  parsed[loc] = { html, pages: splitPages(html) };
}
const enPages = parsed.en.pages;
const wanted = arg.pages === 'auto' ? pickPages(enPages) : arg.pages.split(',').map(Number).filter(n => n > 0);
if (!wanted || !wanted.length) { console.error('auto: no page with a chart after the contents'); process.exit(4); }
if (wanted.some(n => n > enPages.length)) {
  console.error(`EN has ${enPages.length} pages; asked for ${wanted.join(',')}`);
  process.exit(2);
}
const families = wanted.map(n => familyOf(enPages[n - 1]));
if (families.some(f => !f)) {
  console.error(`page ${wanted[families.indexOf(null)]} has a layout the insight styles do not cover`);
  process.exit(4);
}
console.log(`pages ${wanted.join(',')} of ${enPages.length} (${families.join(', ')}): ${wanted.map(n => JSON.stringify(text(grab(enPages[n - 1], /<h1\s+class="page-h1"[^>]*>([\s\S]*?)<\/h1>/) || '').slice(0, 60))).join(' · ')}`);

fs.mkdirSync(arg.out, { recursive: true });
const result = { pages: wanted, families, locales: {}, checks: {} };
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
  const other = wanted.find((n, i) => familyOf(pages[n - 1]) !== families[i]);
  if (other) { log.errors.push(`page ${other} has another layout than EN`); failed = true; continue; }

  let built;
  try { built = wanted.map((n, i) => buildPage(pages[n - 1], i === 0, loc)); }
  catch (e) { log.errors.push(e.message); failed = true; continue; }

  const body = built.map(b => b.html).join('\n');
  const plain = text(body);

  // Chart classes the site CSS lacks: copy their rules from the report's own <style>.
  const need = [...svgClasses(body)].filter(c => !SITE_SVG.has(c));
  let style = '';
  if (need.length) {
    const rules = svgClassRules(ownStyle(html)).map(r => ({ ...r, selectors: r.selectors.filter(sel => sel.slice(1).split('.').some(c => need.includes(c))) })).filter(r => r.selectors.length);
    const covered = new Set(rules.flatMap(r => r.selectors.flatMap(sel => sel.slice(1).split('.'))));
    const lacking = need.filter(c => !covered.has(c));
    if (lacking.length) log.warnings.push(`chart classes with no style anywhere: ${lacking.join(' ')}`);
    if (rules.length) style = `<style>\n${rules.map(r => `${r.selectors.map(sel => '.article-body .kp-page svg ' + sel).join(', ')} { ${r.decls.map(([k, v]) => `${k}: ${v}`).join('; ')}; }`).join('\n')}\n</style>\n`;
  }

  if (FORBIDDEN.test(plain)) { log.errors.push('forbidden term in body'); failed = true; continue; }

  // Integrity vs EN: same charts, and the figures of the EN page are still on the page. A translation may
  // restate a chart label, so a few missing figures are only noted; under 75% of them means the page is not
  // the same page (or its numbers changed) and the locale is skipped.
  wanted.forEach((n, i) => {
    const en = enPages[n - 1], lo = pages[n - 1];
    if (charts(en) !== charts(lo)) log.warnings.push(`page ${n}: chart count differs from EN`);
    const want = [...nums(text(en))], have = nums(text(lo));
    const lost = want.filter(x => !have.has(x));
    const recall = want.length ? 1 - lost.length / want.length : 1;
    if (want.length >= 4 && recall < 0.75) log.errors.push(`page ${n}: only ${Math.round(recall * 100)}% of the EN figures are present (missing ${lost.slice(0, 6).join(' ')})`);
    else if (lost.length) log.warnings.push(`page ${n}: figures in EN not found here: ${lost.slice(0, 6).join(' ')}`);
    if (/\b(Section|Exhibit|page)s?\s*\d+/i.test(text(built[i].html))) log.warnings.push(`page ${n}: refers to a section/exhibit/page number`);
  });
  if (log.errors.length) { failed = true; continue; }

  const cover = text(grab(html, /<h1[^>]*class="cover-title"[^>]*>([\s\S]*?)<\/h1>/) || grab(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) || '');
  const prefix = cover.split(/[:：]/)[0].trim();
  if (loc === 'en') minutes = Math.max(1, Math.round(plain.split(' ').length / 200));
  // The page's own sub-headline; failing that, the first paragraph of its commentary.
  const lede = built[0].sub || text(grab(body, /<p>([\s\S]*?)<\/p>/) || '');
  if (lede.length > 500) log.warnings.push(`lede ${lede.length} chars (limit 500)`);
  const joined = `${prefix}${COLON[loc]}${built[0].h1}`;

  result.locales[loc] = {
    title: !prefix || joined.length > 120 ? built[0].h1 : joined,
    excerpt: clip(lede, 320),
    lede,
    body: style + body,
    read_time: READ_TIME[loc](minutes),
  };
  fs.writeFileSync(path.join(arg.out, `${loc}.body.html`), style + body + '\n');
}

fs.writeFileSync(path.join(arg.out, 'insight.json'), JSON.stringify(result, null, 2) + '\n');
for (const [loc, c] of Object.entries(result.checks)) {
  const ok = result.locales[loc] ? 'ok ' : 'SKIPPED';
  console.log(`${loc} ${ok} ${c.errors.map(e => 'ERROR ' + e).concat(c.warnings.map(w => 'warn ' + w)).join(' | ')}`);
}
process.exit(failed ? 1 : 0);
