import test from 'node:test';
import assert from 'node:assert/strict';
import { withUtm, mapCtaHtml, emailLine, emailCrosssell, emailCrosssellForSlug } from '../api/_lib/bizdirect-crosssell.js';
import { buildItems, parseParams } from '../api/segment-reports.js';
import { renderMail } from '../api/_lib/email-layout.js';
import { readFileSync } from 'node:fs';

const rows = [{ url: 'https://bizdirectasia.com/vietnam/coffee?x=1', title: 'Coffee', n: 1234 }];

test('withUtm: adds the three tags, refuses foreign hosts', () => {
  const u = new URL(withUtm(rows[0].url, 'crosssell_map'));
  assert.equal(u.searchParams.get('utm_source'), 'kira');
  assert.equal(u.searchParams.get('utm_medium'), 'referral');
  assert.equal(u.searchParams.get('utm_campaign'), 'crosssell_map');
  assert.equal(u.searchParams.get('x'), '1');
  assert.equal(withUtm('https://evil.example.com/a', 'c'), null);
});
test('mapCtaHtml: 4 languages, UTM, empty without list, escaped', () => {
  for (const l of ['en', 'ja', 'ko', 'zh']) {
    const h = mapCtaHtml(rows, l);
    assert.match(h, /utm_campaign=crosssell_map/);
    assert.match(h, /&amp;/);
    assert.ok(h.includes('BizDirect Asia'));
  }
  assert.match(mapCtaHtml(rows, 'en'), /Need contacts, filters and updates\? Open the live list on BizDirect Asia →/);
  assert.equal(mapCtaHtml([], 'en'), '');
  assert.equal(mapCtaHtml(null, 'en'), '');
  assert.equal(mapCtaHtml([{ url: 'https://x.test/a', title: 't', n: 1 }], 'en'), '');
});
test('emailLine: text per language, crosssell_email, null without list or count', () => {
  assert.equal(emailLine(rows, 'en').label, 'Companies in this market: 1,234 on BizDirect Asia →');
  for (const l of ['ja', 'ko', 'zh']) assert.match(emailLine(rows, l).label, /1,234/);
  assert.match(emailLine(rows, 'en').url, /utm_campaign=crosssell_email/);
  assert.equal(emailLine([], 'en'), null);
  assert.equal(emailLine([{ ...rows[0], n: 0 }], 'en'), null);
});
test('emailCrosssell: failures and missing keys give null', async () => {
  assert.equal(await emailCrosssell(null, 'coffee', 'en'), null);
  assert.equal(await emailCrosssell('vietnam', 'coffee', 'en', { getLists: async () => { throw new Error('x'); } }), null);
  assert.deepEqual((await emailCrosssell('vietnam', 'coffee', 'ja', { getLists: async () => rows })).url.startsWith('https://bizdirectasia.com/'), true);
});
test('emailCrosssellForSlug: keys by kind, bad slug / no row = null', async () => {
  const seen = [];
  const sbf = async (q) => { seen.push(q); return q.startsWith('market_maps') ? [{ country: 'vietnam', segment_key: 'coffee' }] : [{ market_map_country: 'vietnam', market_map_segment: 'coffee' }]; };
  const d = { sb: sbf, getLists: async () => rows };
  assert.ok(await emailCrosssellForSlug('list', 'vn-coffee', 'en', d));
  assert.ok(await emailCrosssellForSlug('report', 'vn-coffee-2026', 'en', d));
  assert.ok(await emailCrosssellForSlug('transcript', 'abc', 'en', d));
  assert.ok(seen[0].startsWith('market_maps') && seen[1].startsWith('living_reports') && seen[2].startsWith('expert_transcripts'));
  assert.equal(await emailCrosssellForSlug('report', 'Bad Slug', 'en', d), null);
  assert.equal(await emailCrosssellForSlug('report', 'x', 'en', { sb: async () => [], getLists: async () => rows }), null);
  assert.equal(await emailCrosssellForSlug('report', 'x', 'en', { sb: async () => { throw new Error('x'); } }), null);
});
test('mail layout: link block in html and text, escaped', () => {
  const { html, text } = renderMail({ loc: 'en', blocks: [{ link: { url: 'https://bizdirectasia.com/a?b=1&c=2', label: 'A <b> →' } }] });
  assert.match(html, /href="https:\/\/bizdirectasia.com\/a\?b=1&amp;c=2"/);
  assert.ok(!html.includes('<b>'));
  assert.match(text, /A <b> →: https:\/\/bizdirectasia.com\/a\?b=1&c=2/);
});

test('API params: bad slug, bad limit -> null; limit capped', () => {
  const q = (s) => new URLSearchParams(s);
  assert.equal(parseParams(q('country=vietnam')), null);
  assert.equal(parseParams(q('country=Viet Nam&segment=coffee')), null);
  assert.equal(parseParams(q('country=vietnam&segment=coffee&limit=0')), null);
  assert.equal(parseParams(q('country=vietnam&segment=coffee&limit=abc')), null);
  assert.deepEqual(parseParams(q('country=vietnam&segment=coffee')), { country: 'vietnam', segment: 'coffee', limit: 3 });
  assert.equal(parseParams(q('country=vietnam&segment=coffee&limit=99')).limit, 10);
});
test('API items: reports before transcripts, newest first, price only with switch, no content fields', () => {
  const reports = [{ id: 1, slug: 'old', analysis: 'market_overview', published_at: '2026-01-01', price: 45, body: 'SECRET' }, { id: 2, slug: 'new', analysis: 'competitive_landscape', published_at: '2026-05-01', price: 51 }];
  const transcripts = [{ id: 9, slug: 'tr', interview_type: 'distributor', published_at: '2026-09-01', price: 20 }];
  const base = { reports, transcripts, enTitles: { 1: 'Old', 2: 'New' }, trTitles: { 9: 'Call' } };
  const off = buildItems({ ...base });
  assert.deepEqual(off.map((x) => x.kind + ':' + x.title), ['report:New', 'report:Old', 'transcript:Call']);
  assert.ok(off.every((x) => x.price_usd === null));
  assert.equal(off[0].url, 'https://kiraresearch.com/en/reports/new');
  assert.equal(off[2].url, 'https://kiraresearch.com/en/experts/transcripts/tr');
  const on = buildItems({ ...base, priceReports: true, priceTranscripts: false });
  assert.deepEqual(on.map((x) => x.price_usd), [51, 45, null]);
  assert.equal(buildItems({ ...base, limit: 2 }).length, 2);
  assert.ok(!JSON.stringify(off).includes('SECRET'));
  assert.deepEqual(buildItems({}), []);
  assert.deepEqual(Object.keys(off[0]), ['url', 'title', 'analysis', 'published_at', 'price_usd', 'kind']);
});
test('wiring: renderer, cron, vercel rewrite are connected', () => {
  assert.match(readFileSync('api/_lib/market-map/render.js', 'utf8'), /mapCtaHtml\(opts\.bdLists/);
  assert.match(readFileSync('api/notify-topic-published.js', 'utf8'), /emailCrosssell\(rep\.market_map_country/);
  const v = JSON.parse(readFileSync('vercel.json', 'utf8')).rewrites;
  assert.ok(v.findIndex((r) => r.source === '/api/public/segment-reports') < v.findIndex((r) => r.source === '/api/:path*'));
});
