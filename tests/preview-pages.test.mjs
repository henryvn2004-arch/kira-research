import test from 'node:test';
import assert from 'node:assert/strict';
import { splitPages, pickPreviewPages, buildPreview, enforcePreview, previewCap } from '../api/_lib/preview-pages.js';

const page = (cls, tag, h1, inner = '') =>
  `<div class="page ${cls}"><div class="page-inner"><div class="page-header"><div class="page-section-tag">${tag}</div></div>` +
  `<h1 class="page-h1">${h1}</h1>${inner}</div></div>`;
const SVG = '<svg viewBox="0 0 10 10" aria-label="Bar chart"></svg>';
const MATRIX = '<svg viewBox="0 0 10 10" aria-label="Bubble matrix of options"></svg>';
const TABLE = '<table class="kira-table"><tr><td>x</td></tr></table>';

function report(extra = 0) {
  const body = [
    '<div class="page cover3 cv-L2"><h1 class="cv-title">Vietnam Coffee</h1></div>',
    page('', 'Section 02 · Methodology', 'How we built this'),
    page('', 'Section 03 · Table of Contents', 'Contents'),
    page('', 'Executive summary', 'Go, with conditions', '<div class="exec-callouts"></div>'),
    page('exhibit-page', 'Executive summary', 'Why the answer holds', TABLE),
    '<div class="page divider-page"><h1 class="divider-title">Market</h1></div>',
    page('exhibit-page', 'Exhibit · bar', 'Demand grows 8% a year', SVG),
    page('exhibit-page', 'Market sizing', 'Text only page', '<p>words</p>'),
    page('exhibit-page', 'Exhibit · matrix 2x2', 'Players cluster in two corners', MATRIX),
    ...Array.from({ length: extra }, (_, i) => page('exhibit-page', 'Exhibit · line', 'Filler ' + i, SVG)),
    page('risk-matrix-page', 'Risks', 'Three risks matter most'),
    page('decision-scorecard-page', 'Options', 'Option B scores highest'),
    page('stage-gate-page', 'Recommended path', 'Enter in three gates'),
    '<div class="page players-page"><div class="page-header"><div class="page-section-tag">Who\'s who</div></div><h1 class="page-h1">Players</h1></div>',
    page('', 'Section 19 · Methodology & Sources', 'Sources'),
    '<div class="page closing-page"><h1>KIRA</h1></div>',
  ];
  return `<!DOCTYPE html><html lang="en"><head><title>t</title></head><body>${body.join('\n')}</body></html>`;
}
const titles = html => splitPages(html).pages.map(p => p.title);

test('classifies page types from classes and section tags', () => {
  const types = splitPages(report()).pages.map(p => p.type);
  assert.deepEqual(types, ['cover', 'methodology', 'toc', 'exec', 'exec', 'divider', 'chart', 'body', 'comparison',
    'risk', 'scorecard', 'stage_gate', 'players', 'methodology', 'closing']);
});

test('picks exec + chart + comparison, never decision pages, cover as thumbnail only', () => {
  const pick = pickPreviewPages(splitPages(report()).pages);
  assert.equal(pick.fallback, false);
  assert.equal(pick.cover, 0);
  assert.deepEqual(pick.free, [3, 4, 6, 8]);
});

test('cap is 20% of pages, min 4, max 7', () => {
  assert.equal(previewCap(10), 4);
  assert.equal(previewCap(30), 6);
  assert.equal(previewCap(80), 7);
});

test('short list is padded to 4 with body pages only', () => {
  const html = report().replace(page('exhibit-page', 'Exhibit · matrix 2x2', 'Players cluster in two corners', MATRIX), '');
  const pick = pickPreviewPages(splitPages(html).pages);
  assert.equal(pick.free.length, 4);
  assert.ok(pick.free.every(i => !['risk', 'scorecard', 'stage_gate', 'players', 'closing'].includes(splitPages(html).pages[i].type)));
});

test('no executive summary found: fall back to the first 5 pages', () => {
  const html = '<html><head></head><body>' + Array.from({ length: 12 }, (_, i) => page('', 'Misc', 'P' + i)).join('') + '</body></html>';
  const pick = pickPreviewPages(splitPages(html).pages);
  assert.equal(pick.fallback, true);
  assert.deepEqual(pick.free, [0, 1, 2, 3, 4]);
});

test('buildPreview keeps only allowed pages, stamps them and lists every title', () => {
  const full = report();
  const { html, meta } = buildPreview(full);
  const out = splitPages(html);
  assert.deepEqual(out.pages.map(p => p.src), [0, 3, 4, 6, 8]);
  assert.equal(meta.pages.length, 15);
  for (const locked of ['Option B scores highest', 'Enter in three gates', 'Three risks matter most']) {
    assert.ok(!html.includes('<h1 class="page-h1">' + locked), 'locked page leaked: ' + locked);
  }
  assert.ok(html.includes('kira-preview-meta'));
  assert.ok(meta.pages.some(p => p.h === 'Option B scores highest'));   // title only
});

test('meta cannot break out of its script tag', () => {
  const full = report().replace('Go, with conditions', '</script><b>x</b> & more');
  const { html } = buildPreview(full);
  const metaBlock = html.match(/id="kira-preview-meta">([\s\S]*?)<\/script>/)[1];
  assert.ok(!metaBlock.includes('<'));
  assert.ok(JSON.parse(metaBlock).pages.some(p => p.h.includes('& more')));
});

test('enforcePreview: a whole report is cut to the allow-list', () => {
  const out = enforcePreview(report(5));
  assert.ok(!out.includes('<h1 class="page-h1">Option B scores highest'));
  assert.ok(!out.includes('<h1 class="page-h1">Three risks matter most'));
  assert.ok(splitPages(out).pages.length <= 8);
});

test('enforcePreview: a stamped file cannot carry a forbidden page', () => {
  const stamped = buildPreview(report()).html.replace('</body>',
    '<div class="page decision-scorecard-page" data-src-page="10"><h1 class="page-h1">Option B scores highest</h1></div></body>');
  const out = enforcePreview(stamped);
  assert.ok(!out.includes('<h1 class="page-h1">Option B scores highest'));
  assert.deepEqual(splitPages(out).pages.map(p => p.src), [0, 3, 4, 6, 8]);
});

test('enforcePreview: no pages found gives an empty shell, never the raw html', () => {
  const out = enforcePreview('<html><head></head><body><main>SECRET FULL TEXT</main></body></html>');
  assert.ok(!out.includes('SECRET'));
});

test('forced first-N keeps the old behaviour', () => {
  const { pick } = buildPreview(report(), { firstN: 5 });
  assert.deepEqual(pick.free, [0, 1, 2, 3, 4]);
  assert.equal(titles(report()).length, 15);
});
