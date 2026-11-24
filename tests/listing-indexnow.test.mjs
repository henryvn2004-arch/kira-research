// Unit tests: listing fallback renderer, IndexNow helper, home JSON-LD. Mocked fetch, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listHtml, injectList, listItems, LIMIT } from '../api/_lib/listing.js';
import { submitUrls, indexNowKey, changedUrls, BATCH } from '../api/_lib/indexnow.js';

test('listHtml: links, escaping, cap, locale of the item', () => {
  const items = Array.from({ length: 80 }, (_, i) => ({ slug: `r-${i}`, title: i === 0 ? 'A <b>&"x"' : `Report ${i}`, locale: i === 1 ? 'en' : undefined }));
  const h = listHtml('library', 'ja', items);
  assert.equal((h.match(/<li>/g) || []).length, LIMIT);
  assert.ok(h.includes('href="/ja/reports/r-0"'));
  assert.ok(h.includes('href="/en/reports/r-1"'));
  assert.ok(h.includes('A &lt;b&gt;&amp;&quot;x&quot;'));
  assert.ok(!h.includes('<b>'));
  assert.equal(listHtml('library', 'en', []), '');
  assert.ok(listHtml('transcripts', 'en', [{ slug: 't', title: 'T' }]).includes('/en/experts/transcripts/t'));
});

test('injectList: first child of the page container; unchanged when the container is missing', () => {
  const html = '<body><main class="r-container" id="lib-app" data-x="1"></main></body>';
  const out = injectList(html, 'library', '<nav>L</nav>');
  assert.ok(out.includes('data-x="1"><nav>L</nav></main>'));
  assert.equal(injectList('<body></body>', 'library', '<nav>L</nav>'), '<body></body>');
  assert.equal(injectList(html, 'insights', '<nav>L</nav>'), html);
});

test('listItems: newest first, title in the page language else English', async () => {
  const sb = async (p) => {
    if (p.startsWith('living_reports')) return [{ id: 1, slug: 'a' }, { id: 2, slug: 'b' }, { id: 3, slug: 'c' }];
    return [{ report_id: 1, locale: 'en', title: 'A en' }, { report_id: 1, locale: 'ja', title: 'A ja' }, { report_id: 2, locale: 'en', title: 'B en' }];
  };
  const r = await listItems(sb, 'library', 'ja');
  assert.deepEqual(r.map((x) => [x.slug, x.title, x.locale]), [['a', 'A ja', 'ja'], ['b', 'B en', 'en']]);
});

test('indexNowKey: only a plain key counts', () => {
  assert.equal(indexNowKey({}), '');
  assert.equal(indexNowKey({ INDEXNOW_KEY: 'bad key!' }), '');
  assert.equal(indexNowKey({ INDEXNOW_KEY: 'abcdef1234567890' }), 'abcdef1234567890');
});

test('submitUrls: no key = no call; filters foreign URLs, dedupes, batches', async () => {
  let calls = [];
  const f = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { status: 200 }; };
  assert.equal((await submitUrls(['https://kiraresearch.com/en/x'], { fetchImpl: f, env: {} })).skipped, 'no_key');
  assert.equal(calls.length, 0);
  const env = { INDEXNOW_KEY: 'abcdef1234567890' };
  const many = Array.from({ length: BATCH + 5 }, (_, i) => `https://kiraresearch.com/en/reports/r-${i}`);
  const out = await submitUrls([...many, many[0], 'https://evil.example/x', 'http://kiraresearch.com/en/y'], { fetchImpl: f, env });
  assert.equal(out.submitted, BATCH + 5);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://api.indexnow.org/indexnow');
  assert.equal(calls[0].body.host, 'kiraresearch.com');
  assert.equal(calls[0].body.key, 'abcdef1234567890');
  assert.equal(calls[0].body.keyLocation, 'https://kiraresearch.com/indexnow.txt');
  assert.equal(calls[0].body.urlList.length, BATCH);
  assert.equal(calls[1].body.urlList.length, 5);
});

test('submitUrls: HTTP error or network error is reported, never thrown', async () => {
  const env = { INDEXNOW_KEY: 'abcdef1234567890' };
  const u = ['https://kiraresearch.com/en/a'];
  assert.equal((await submitUrls(u, { fetchImpl: async () => ({ status: 429 }), env })).ok, false);
  assert.equal((await submitUrls(u, { fetchImpl: async () => { throw new Error('net'); }, env })).failed, 1);
});

test('changedUrls: every changed translation plus the listing pages', async () => {
  const sb = async (p) => {
    if (p.startsWith('living_reports')) return [{ slug: 'r1', report_translations: [{ locale: 'en' }, { locale: 'zh' }] }];
    if (p.startsWith('insights')) return [];
    return [{ slug: 't1', expert_transcript_translations: [{ locale: 'en' }] }];
  };
  const u = await changedUrls(sb, '2026-11-23T00:00:00Z');
  assert.ok(u.includes('https://kiraresearch.com/zh/reports/r1'));
  assert.ok(u.includes('https://kiraresearch.com/en/experts/transcripts/t1'));
  assert.ok(u.includes('https://kiraresearch.com/ja/library'));
  assert.ok(!u.some((x) => x.includes('/insights/')));
});

test('home pages carry Organization + WebSite(SearchAction) JSON-LD in every locale', () => {
  for (const l of ['en', 'ja', 'ko', 'zh']) {
    const html = readFileSync(new URL(`../public/${l}/index.html`, import.meta.url), 'utf8');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    assert.ok(blocks.some((b) => b['@type'] === 'Organization' && b.name === 'KIRA Research'));
    const w = blocks.find((b) => b['@type'] === 'WebSite');
    assert.equal(w.potentialAction.target.urlTemplate, `https://kiraresearch.com/${l}/library?q={search_term_string}`);
  }
});
