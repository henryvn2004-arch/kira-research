import test from 'node:test';
import assert from 'node:assert/strict';
import { citeSentence, monthYear } from '../api/_lib/bizdirect-cite.js';
import { listsBlockHtml } from '../api/_lib/bizdirect-lists.js';
import { fallbackTakeaway, sourcePhrase } from '../api/_lib/market-map/render.js';

const f = { n: 1234, built: '2026-11-24T00:00:00+00:00', segment: 'Coffee', country: 'Vietnam', slug: 'vietnam-coffee' };

test('monthYear: 4 languages, bad dates give ""', () => {
  assert.equal(monthYear('2026-11-24', 'en'), 'November 2026');
  assert.equal(monthYear('2026-11-24', 'ja'), '2026年11月');
  assert.equal(monthYear('2026-11-24', 'ko'), '2026년 11월');
  assert.equal(monthYear('2026-11-24', 'zh'), '2026年11月');
  assert.equal(monthYear('', 'en'), '');
  assert.equal(monthYear('2026-13-01', 'en'), '');
});
test('citeSentence: EN sentence has number, source, date; map + BizDirect links', () => {
  const s = citeSentence(f, 'en');
  assert.equal(s.text, "BizDirect Asia's company database lists 1,234 coffee companies in Vietnam (November 2026).");
  assert.match(s.html, /<a href="https:\/\/bizdirectasia\.com\/">BizDirect Asia<\/a>/);
  assert.match(s.html, /href="\/en\/market-maps\/vietnam-coffee"/);
});
test('citeSentence: ja / ko / zh', () => {
  assert.match(citeSentence(f, 'ja').text, /BizDirect Asiaの企業データベースには、Vietnamの.*企業が1,234社.*2026年11月時点/);
  assert.match(citeSentence(f, 'ko').text, /1,234개.*2026년 11월 기준/);
  assert.match(citeSentence(f, 'zh').text, /1,234家.*截至2026年11月/);
  assert.match(citeSentence(f, 'ja').html, /href="\/ja\/market-maps\/vietnam-coffee"/);
});
test('citeSentence: missing number, date, name = null; no slug = no map link', () => {
  assert.equal(citeSentence({ ...f, n: 0 }, 'en'), null);
  assert.equal(citeSentence({ ...f, n: null }, 'en'), null);
  assert.equal(citeSentence({ ...f, built: null }, 'en'), null);
  assert.equal(citeSentence({ ...f, segment: '' }, 'en'), null);
  assert.equal(citeSentence(null, 'en'), null);
  assert.doesNotMatch(citeSentence({ ...f, slug: '' }, 'en').html, /market-maps/);
});
test('citeSentence: HTML in names is escaped; bad slug gets no link', () => {
  const s = citeSentence({ ...f, segment: '<b>x</b>&', country: '"C"', slug: 'a"><script>' }, 'en');
  assert.doesNotMatch(s.html, /<b>|<script>/);
  assert.match(s.html, /&lt;b&gt;x&lt;\/b&gt;&amp;/);
  assert.doesNotMatch(s.html, /market-maps/);
});
test('wording: no banned words', () => {
  for (const l of ['en', 'ja', 'ko', 'zh']) assert.doesNotMatch(citeSentence(f, l).text, /\bAI\b|platform|Claude|McKinsey/);
});
test('listsBlockHtml puts the sentence above the list', () => {
  const rows = [{ url: 'https://bizdirectasia.com/x', title: 'T', n: 3 }];
  const h = listsBlockHtml(rows, 'en', 'bd-lists', '<p class="bd-cite">S</p>');
  assert.ok(h.indexOf('bd-cite') < h.indexOf('<ul>'));
  assert.equal(listsBlockHtml([], 'en', 'bd-lists', '<p>S</p>'), '');
});

const S = { segment: 'Coffee', country: 'Vietnam', companies: 1234, built: '2026-11-24', meta: { mekko: null }, findings: { top_stage: { stage: 'Roasters', pct: 40 }, small_pct: 30, large_pct: 20 }, regions: [], stats: null };
test('market map takeaway names the source of the company count, number unchanged', () => {
  const t = fallbackTakeaway(S, 'en');
  assert.match(t, /^We map 1234 coffee companies in Vietnam \(BizDirect Asia company database, November 2026\)\./);
  assert.match(fallbackTakeaway(S, 'ja'), /1,234.*\(BizDirect Asia企業データベース、2026年11月時点\)/);
  assert.match(fallbackTakeaway(S, 'zh'), /BizDirect Asia企业数据库，截至2026年11月/);
  assert.match(fallbackTakeaway(S, 'ko'), /BizDirect Asia 기업 데이터베이스, 2026년 11월 기준/);
  assert.equal(sourcePhrase({ built: null }, 'en'), '');
  assert.match(fallbackTakeaway({ ...S, built: null }, 'en'), /^We map 1234 coffee companies in Vietnam\./);
});
