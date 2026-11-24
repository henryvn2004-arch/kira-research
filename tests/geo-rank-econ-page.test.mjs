// Unit tests: KIRA-own figures first (geo-rank), the answer label, the server-rendered market-data page. No database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ownKind, rankAnswers, isOwn } from '../api/_lib/geo-rank.js';
import { answerBlock } from '../api/_lib/geo-html.js';
import { T } from '../api/_lib/geo-i18n.js';
import { econPage } from '../api/_lib/econ/page.js';
import { fillEcon } from '../api/econ-page.js';

const A = (id, o) => ({ id, question: `Q${id}`, answer_short: `A${id}`, source_kind: 'report', source_ref: { slug: 'r' }, updated_at: '2026-11-01T00:00:00Z', year: 2025, primary_source: 'World Bank 2025', ...o });

test('ownKind: estimate, field, econ, third', () => {
  assert.equal(ownKind(A(1, { primary_source: 'Kira estimates' })), 'estimate');
  assert.equal(ownKind(A(2, { source_kind: 'transcript', primary_source: null })), 'field');
  assert.equal(ownKind(A(3, { primary_source: 'KIRA field interviews, Seoul' })), 'field');
  assert.equal(ownKind(A(4, { source_kind: 'econ' })), 'econ');
  assert.equal(ownKind(A(5, { primary_source: null })), 'third');
  assert.ok(isOwn(A(1, { primary_source: 'Kira estimates' })) && !isOwn(A(4, { source_kind: 'econ' })));
});

test('rankAnswers: estimates, field, outside sources, Kira Data; order kept inside a tier', () => {
  const list = [A(1, { source_kind: 'econ' }), A(2, {}), A(3, { primary_source: 'Kira estimates' }), A(4, { source_kind: 'transcript', primary_source: null }),
    A(5, { primary_source: 'Kira estimates' }), A(6, {})];
  assert.deepEqual(rankAnswers(list).map((a) => a.id), [3, 5, 4, 2, 6, 1]);
  assert.deepEqual(list.map((a) => a.id), [1, 2, 3, 4, 5, 6]);   // input untouched
});

test('answerBlock: own estimate is labelled "KIRA Research estimate" in 4 languages; outside figure keeps its source', () => {
  const titles = { reports: new Map([['r', 'Rep']]), transcripts: new Map() };
  for (const loc of ['en', 'ja', 'ko', 'zh']) {
    const h = answerBlock(A(1, { primary_source: 'Kira estimates' }), titles, T[loc], loc);
    assert.ok(h.includes(T[loc].srcEstimate), loc);
    assert.ok(!h.includes('Kira estimates'), loc);
    assert.ok(h.includes('KIRA Research'), loc);
  }
  const o = answerBlock(A(2, {}), titles, T.en, 'en');
  assert.ok(o.includes('citing World Bank 2025') && o.includes('Source: World Bank 2025, 2025'));
});

const data = (indexable) => ({
  country: { code: 'VN', name: 'Vietnam', slug: 'vietnam' }, updated_at: '2026-11-20T00:00:00Z', indexable,
  names: { VN: 'Vietnam', JP: 'Japan' },
  sources: [{ key: 'wb', name: 'World Bank', url: 'https://data.worldbank.org', attribution: 'World Bank, WDI' }],
  indicators: [
    { key: 'gdp_growth', source_key: 'wb', label: { en: 'Real GDP growth' }, unit: 'pct', freq: 'A', series: [['2023', 5.1, false], ['2024', 7.1, false]] },
    { key: 'gdp_usd', source_key: 'wb', label: { en: 'GDP' }, unit: 'usd', freq: 'A', series: [['2024', 476e9, false]] },
  ],
  flows: [{ source_key: 'wb', reporter: 'VN', partner: 'JP', product: 'TOTAL', flow: 'X', freq: 'M', period: '2026-09', from: '2025-10', value: 2e10, prev: 1.8e10, currency: 'USD' }],
});

test('econPage: figures, lead, tables, cite box in the HTML; Dataset only when indexable', () => {
  const p = econPage(data(true), 'en');
  assert.ok(p.content.includes('Vietnam: market data'));
  assert.ok(p.content.includes('7.1%') && p.content.includes('US$476B'));
  assert.ok(p.content.includes('According to KIRA Research (November 2026), citing World Bank'));
  assert.ok(p.content.includes('Vietnam exports to Japan'));
  assert.ok(p.content.includes('kira-cite'));
  assert.equal(p.robots, 'index, follow');
  assert.ok(p.ld && JSON.parse(p.ld)['@type'] === 'Dataset' && JSON.parse(p.ld).url === 'https://kiraresearch.com/en/data/vietnam');
  const n = econPage(data(false), 'ja');
  assert.equal(n.robots, 'noindex, nofollow');
  assert.equal(n.ld, null);
  assert.ok(n.content.includes('ベトナム：市場データ'));
});

test('fillEcon: title, robots, canonical, JSON-LD and body go into the template', () => {
  const tpl = '<!DOCTYPE html><html lang="en"><head><title>x</title><meta name="robots" content="noindex, nofollow" /><meta name="description" content="d" /></head><body><a href="/en/data/" id="ed-crumb-data">DATA</a><span id="ed-crumb-country"></span><main class="r-container" id="ed-root">\n<div>…</div>\n</main><script></script></body></html>';
  const out = fillEcon(tpl, 'ko', 'vietnam', econPage(data(true), 'ko'));
  assert.ok(out.includes('<html lang="ko"'));
  assert.ok(out.includes('content="index, follow"'));
  assert.ok(out.includes('rel="canonical" href="https://kiraresearch.com/ko/data/vietnam"'));
  assert.ok(out.includes('hreflang="zh-Hans"') && out.includes('id="ld-dataset"'));
  assert.ok(out.includes('id="ed-root" data-ssr="1"><div class="ed-main">') && !out.includes('<div>…</div>'));
  assert.ok(out.includes('href="/ko/data/" id="ed-crumb-data"') && out.includes('id="ed-crumb-country">베트남</span>'));
  const noidx = fillEcon(tpl, 'en', 'vietnam', econPage(data(false), 'en'));
  assert.ok(noidx.includes('content="noindex, nofollow"') && !noidx.includes('hreflang') && !noidx.includes('ld-dataset'));
});
