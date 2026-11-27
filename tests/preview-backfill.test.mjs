import test from 'node:test';
import assert from 'node:assert/strict';
import { guardUpload, selectPending, isCurated, MAX_UPLOAD_PAGES } from '../skills/kira-research-report/scripts/lib/preview-backfill.mjs';

const pages = (n, stamp) => Array.from({ length: n }, (_, i) => `<div class="page"${stamp ? ` data-src-page="${i}"` : ''}>x</div>`).join('');

test('guardUpload accepts small stamped previews only', () => {
  assert.equal(guardUpload(pages(6, true)).ok, true);
  assert.equal(guardUpload(pages(MAX_UPLOAD_PAGES + 1, true)).ok, false);
  assert.equal(guardUpload(pages(5, false)).ok, false);
  assert.equal(guardUpload('').ok, false);
});
test('isCurated', () => { assert.equal(isCurated(pages(2, true)), true); assert.equal(isCurated(pages(2, false)), false); });
test('selectPending: newest first, skips curated, limits n', () => {
  const reports = [{ id: 'a', slug: 'a', created_at: '2026-01-01' }, { id: 'b', slug: 'b', created_at: '2026-03-01' }, { id: 'c', slug: 'c', created_at: '2026-02-01' }];
  const locales = new Map([['a', ['en', 'ja']], ['b', ['en']], ['c', ['en']]]);
  const curated = new Map([['b', new Set(['en'])], ['a', new Set(['en'])]]);
  const r = selectPending(reports, locales, curated, 5);
  assert.deepEqual(r.map(x => x.slug), ['c', 'a']);
  assert.deepEqual(r[1].todo, ['ja']);
  assert.equal(selectPending(reports, locales, curated, 1).length, 1);
});
