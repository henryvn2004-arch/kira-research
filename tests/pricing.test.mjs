import test from 'node:test';
import assert from 'node:assert/strict';
import { reportPrice, transcriptPrice, listPrice, licencePrice, noNine, freshness, estimateExhibits, pagesFromReadMinutes, fromPrice } from '../api/_lib/pricing.js';

const NOW = new Date('2026-11-27T00:00:00Z');

test('noNine: whole dollars, a 9 becomes an 8', () => {
  assert.equal(noNine(49), 48); assert.equal(noNine(39.4), 38); assert.equal(noNine(40), 40); assert.equal(noNine(58.6), 58);
});

test('freshness uses publish date: 1.0 / 0.9 / 0.8', () => {
  assert.equal(freshness('2026-10-01', NOW), 1.0);
  assert.equal(freshness('2026-03-01', NOW), 0.9);
  assert.equal(freshness('2025-06-01', NOW), 0.8);
  assert.equal(freshness(null, NOW), 1.0);
});

test('report price follows the formula, clamp 31..78, never ends in 9', () => {
  // 44 pages, 26 charts: 18 + 35.2 + 13 = 66.2 -> 66
  assert.equal(reportPrice({ pages: 44, exhibits: 26, publishedAt: '2026-11-01', now: NOW }), 66);
  // 12 pages, no exhibit data -> 7 est: 18 + 9.6 + 3.5 = 31.1 -> 31
  assert.equal(estimateExhibits(12), 7);
  assert.equal(reportPrice({ pages: 12, publishedAt: '2026-11-01', now: NOW }), 31);
  // huge report clamps to 78
  assert.equal(reportPrice({ pages: 118, exhibits: 60, publishedAt: '2026-11-01', now: NOW }), 78);
  // rarity 1.3 raises, older report is cheaper
  assert.ok(reportPrice({ pages: 44, exhibits: 26, rarity: 1.3, now: NOW }) > reportPrice({ pages: 44, exhibits: 26, now: NOW }));
  assert.ok(reportPrice({ pages: 44, exhibits: 26, publishedAt: '2025-01-01', now: NOW }) < 66);
  // rarity outside the range is clamped
  assert.equal(reportPrice({ pages: 44, exhibits: 26, rarity: 5, now: NOW }), reportPrice({ pages: 44, exhibits: 26, rarity: 1.3, now: NOW }));
  for (let p = 5; p <= 130; p++) for (const e of [null, 0, 10, 30]) {
    const v = reportPrice({ pages: p, exhibits: e, rarity: 1.15, publishedAt: '2026-05-23', now: NOW });
    assert.ok(Number.isInteger(v) && v >= 31 && v <= 78 && v % 10 !== 9, `${p}/${e} -> ${v}`);
  }
});

test('transcript price: 14..28, never ending in 9', () => {
  assert.equal(transcriptPrice({ printedPages: pagesFromReadMinutes(25) }), 14);   // 13.2 pages -> 13.6 -> 14
  assert.equal(transcriptPrice({ printedPages: pagesFromReadMinutes(30) }), 15);   // 15.9 pages -> 14.6 -> 15
  assert.equal(transcriptPrice({ printedPages: 100 }), 28);
  for (let p = 0; p <= 80; p++) { const v = transcriptPrice({ printedPages: p, rarity: 1.3 }); assert.ok(v >= 14 && v <= 28 && v % 10 !== 9); }
});

test('list price: 18..38 by log of the company count', () => {
  assert.equal(listPrice(500), 36);
  assert.equal(listPrice(100), 28);
  assert.equal(listPrice(20), 20);
  assert.equal(listPrice(28016), 38);
  assert.equal(listPrice(1), 18);
  for (const n of [0, 5, 50, 300, 800, 810, 5000]) { const v = listPrice(n); assert.ok(v >= 18 && v <= 38 && v % 10 !== 9, `${n} -> ${v}`); }
});

test('licence tiers: team x1.8, company x2.6, whole dollars, never ending in 9', () => {
  assert.equal(licencePrice(40, 'single'), 40);
  assert.equal(licencePrice(40, 'team'), 72);
  assert.equal(licencePrice(40, 'company'), 104);
  assert.equal(licencePrice(55, 'team'), 99 - 1);   // 99 -> 98
  assert.throws(() => licencePrice(40, 'x'));
});

test('fromPrice', () => { assert.equal(fromPrice([66, 31, 48]), 31); assert.equal(fromPrice([]), null); });
