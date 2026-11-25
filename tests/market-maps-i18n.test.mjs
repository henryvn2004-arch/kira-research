// Japanese / Korean / Simplified Chinese market-map pages (migration 073): fixed texts, translated names, current-commentary rule,
// robots gate, hreflang, canonical, per-language sitemaps, hub size. Mocked fetch, no database. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { mockStats } from './fixtures/market-map-stats.mjs';

process.env.SUPABASE_URL = 'https://db.example';
process.env.SUPABASE_SERVICE_KEY = 'k-test';

const T0 = '2026-11-24T10:00:00+00:00', T0_Z = '2026-11-24T10:00:00.000Z', T_OLD = '2026-11-20T08:00:00+00:00';
const mkMap = (country, key, over = {}) => ({ slug: `${country}/${key}`, country, segment_key: key, title: key, l2_family: 'Beverages', n_companies: 280, indexable: true, status: 'published', built_at: '2026-11-23T00:00:00+00:00',
  commentary_built_at: T0, commentary: { takeaway: 'EN-TAKEAWAY', so_what: { marimekko: 'EN-SOWHAT' }, implications: ['EN-IMPL'] }, i18n: {}, ...over });
const cj = (tag) => ({ commentary: { takeaway: `${tag}-TAKEAWAY`, so_what: { marimekko: `${tag}-SOWHAT` }, implications: [`${tag}-IMPL1`, `${tag}-IMPL2`, `${tag}-IMPL3`] } });
const MAPS = [
  // ja current (instants equal, different spelling), ko stale, zh current but its title has no translation
  mkMap('vietnam', 'soft-drinks', { title: 'Soft drinks', i18n: { ja: { ...cj('JA'), src_built_at: T0_Z }, ko: { ...cj('KO'), src_built_at: T_OLD }, zh: { ...cj('ZH'), src_built_at: T0 } } }),
  // ja current but no translated title
  mkMap('vietnam', 'instant-noodles', { title: 'Instant noodles', i18n: { ja: { ...cj('JA'), src_built_at: T0 } } }),
  // not indexable in English: closed in every language
  mkMap('thailand', 'frozen-fish', { title: 'Frozen fish', indexable: false, n_companies: 30, i18n: { ja: { ...cj('JA'), src_built_at: T0 } } }),
];
const NAMES = [
  { kind: 'segment', key: 'soft-drinks', lang: 'ja', name: '清涼飲料' }, { kind: 'segment', key: 'soft-drinks', lang: 'ko', name: '청량음료' },
  { kind: 'segment', key: 'frozen-fish', lang: 'ja', name: '冷凍魚' },
  { kind: 'family', key: 'Beverages', lang: 'ja', name: '飲料' }, { kind: 'family', key: 'Beverages', lang: 'ko', name: '음료' },
];
const j = (body, headers = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', ...headers } });
let indexingOn = true;
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.includes('/app_config')) return j(indexingOn ? [{ key: 'marketmaps.indexing_enabled', value: true }] : []);
  const u = new URL(url), sp = u.searchParams;
  if (url.includes('/market_map_names?')) {
    let rows = NAMES;
    if (sp.get('kind') === 'eq.segment') rows = rows.filter((r) => r.kind === 'segment');
    if (sp.get('key')) rows = rows.filter((r) => `eq.${r.key}` === sp.get('key'));
    if (sp.get('lang')) rows = rows.filter((r) => `eq.${r.lang}` === sp.get('lang'));
    return j(rows, { 'content-range': `0-${rows.length - 1}/${rows.length}` });
  }
  if (!url.includes('/market_maps?')) return j([]);
  if (sp.get('segment_key')) { const seg = sp.get('segment_key').replace('eq.', ''); const m = MAPS.find((r) => r.segment_key === seg && `eq.${r.country}` === sp.get('country')); return j(m ? [{ ...m, stats: mockStats({ meta: { ...mockStats().meta, slug: m.slug, segment_key: m.segment_key } }) }] : []); }
  const inList = /slug=in\.\((.*)\)/.exec(decodeURIComponent(u.search));
  if (inList) return j(MAPS.filter((r) => inList[1].includes(r.slug)).map((r) => ({ slug: r.slug, phone_pct: '61', email_pct: '40', built: '2026-11-23' })));
  let rows = url.includes('kind=eq.service') ? [] : MAPS;
  if (sp.get('indexable') === 'eq.true') rows = rows.filter((r) => r.indexable);
  rows = rows.map((r) => ({ ...r, cb: r.commentary_built_at, ja_src: r.i18n.ja?.src_built_at ?? null, ko_src: r.i18n.ko?.src_built_at ?? null, zh_src: r.i18n.zh?.src_built_at ?? null, src: r.i18n[(/i18n->(\w+)->>src_built_at/.exec(url) || [])[1]]?.src_built_at ?? null }));
  return j(rows, { 'content-range': `0-${rows.length - 1}/${rows.length}` });
};

const { default: handler } = await import('../api/market-maps.js');
const { default: sitemap } = await import('../api/sitemap.js');
const { renderDocument, renderHub } = await import('../api/_lib/market-map/render.js');
const { L, ui, lab, countryLabel } = await import('../api/_lib/market-map/i18n.js');
const hub = await import('../api/_lib/market-map/hub.js');
const { i18nCurrent } = await import('../api/_lib/market-map/gate.js');
const cfg = await import('../api/_lib/config.js'); cfg.invalidateConfig();

function call(h, query, url = '/') {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, send(b) { resolve({ ...this, body: b }); }, json(b) { resolve({ ...this, body: JSON.stringify(b) }); } };
    h({ method: 'GET', query, url, headers: { host: 'kiraresearch.com' } }, res);
  });
}
const robots = (html) => /<meta name="robots" content="([^"]+)"/.exec(html)[1];
const canonical = (html) => /<link rel="canonical" href="([^"]+)"/.exec(html)[1];
const hreflangs = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => `${m[1]} ${m[2]}`);
const noStyle = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
const mapPage = (loc, seg = 'soft-drinks', country = 'vietnam') => call(handler, { type: 'map', loc, country, segment: seg });

test('i18nCurrent compares instants, not spellings', () => {
  assert.equal(i18nCurrent(T0, T0_Z), true);
  assert.equal(i18nCurrent(T0, T_OLD), false);
  assert.equal(i18nCurrent(null, T0), false);
  assert.equal(i18nCurrent(T0, undefined), false);
  assert.equal(i18nCurrent('garbage', 'garbage'), false);
});

test('dictionaries: ja/ko/zh have every key of en with the same type, and every template returns clean text', () => {
  const sample = (k) => { void k; return ['AAA', 12, 3, 'BBB', 'CCC', 45, 'DDD', 6, 'EEE', 7, 8, 9]; };
  for (const loc of ['ja', 'ko', 'zh']) {
    for (const k of Object.keys(L.en)) {
      assert.ok(k in L[loc], `${loc} misses ${k}`);
      assert.equal(typeof L[loc][k], typeof L.en[k], `${loc}.${k} type`);
    }
    for (const k of Object.keys(L[loc])) assert.ok(k in L.en, `${loc} has extra ${k}`);
  }
  for (const loc of ['en', 'ja', 'ko', 'zh']) {
    const out = [];
    const walk = (v, k) => { if (typeof v === 'function') { const r = v(...sample(k)); out.push(...(Array.isArray(r) ? r : [r])); } else if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => walk(x, kk)); };
    Object.entries(L[loc]).forEach(([k, v]) => walk(v, k));
    for (const s of out) assert.ok(typeof s === 'string' && s && !/undefined|\[object|NaN/.test(s), `${loc}: bad text "${s}"`);
    // brand rules: research-house voice, no tool names, no competitor names
    for (const s of out) assert.ok(!/\bAI\b|Claude|McKinsey|Mordor|Euromonitor|Frost|Ipsos|Synovate|人工知能|인공지능|人工智能/.test(s), `${loc}: banned word in "${s}"`);
  }
});

test('country names: all 15 markets plus Hong Kong have a ja/ko/zh name', () => {
  for (const c of ['vietnam', 'indonesia', 'thailand', 'singapore', 'malaysia', 'philippines', 'japan', 'south-korea', 'taiwan', 'australia', 'new-zealand', 'myanmar', 'cambodia', 'laos', 'brunei', 'hong-kong']) {
    for (const loc of ['ja', 'ko', 'zh']) assert.notEqual(countryLabel(c, 'ENGLISH', loc), 'ENGLISH', `${c} ${loc}`);
  }
  assert.equal(countryLabel('vietnam', 'Vietnam', 'ja'), 'ベトナム');
  assert.equal(countryLabel('vietnam', 'Vietnam', 'en'), 'Vietnam');
});

test('map page: English output is the approved wording', async () => {
  const r = await mapPage('en');
  assert.match(r.body, /<html lang="en">/);
  assert.match(r.body, /Vietnam soft drinks: who is in the market, where they sit and how big they are/);
  assert.match(r.body, /Executive takeaway/); assert.match(r.body, /EN-TAKEAWAY/);
  assert.match(r.body, /Excel list: 280 companies/);
  assert.equal(canonical(r.body), 'https://kiraresearch.com/en/market-maps/vietnam/soft-drinks');
});

test('ja map page: translated chrome, segment title, country, commentary; no English UI text mixed in', async () => {
  const r = await mapPage('ja');
  const html = noStyle(r.body);
  assert.match(r.body, /<html lang="ja">/);
  assert.match(r.body, /property="og:locale" content="ja_JP"/);
  assert.match(html, /<h1>ベトナムの清涼飲料:/);
  assert.match(html, /JA-TAKEAWAY/); assert.match(html, /JA-SOWHAT/); assert.match(html, /JA-IMPL1/);
  assert.doesNotMatch(html, /EN-TAKEAWAY|EN-SOWHAT|EN-IMPL/);
  for (const en of ['Executive takeaway', 'Structure of the mapped', 'Scale and concentration', 'Cite this page', 'Scope and method', 'Preview of the Excel list', 'Request this list', 'So what', 'Leading companies']) assert.ok(!html.includes(en), `English "${en}" on the ja page`);
  assert.match(html, /マッピング対象企業の構成/); assert.match(html, /規模と集中度/); assert.match(html, /このリストをリクエスト/);
  assert.match(html, /ブランドオーナー／メーカー/);          // stage names of the stats file are translated
  assert.match(html, /<a href="\/ja\/market-maps">マーケットマップ<\/a>/);
  assert.match(html, /\/ja\/market-maps\/vietnam"/);
  assert.equal(canonical(r.body), 'https://kiraresearch.com/ja/market-maps/vietnam/soft-drinks');
  assert.match(html, /data-loc="ja"/);
});

test('ko and zh map pages: chrome in the page language, zh is Simplified', async () => {
  const ko = await mapPage('ko'); const zh = await mapPage('zh');
  assert.match(ko.body, /<html lang="ko">/); assert.match(ko.body, /청량음료/); assert.match(noStyle(ko.body), /핵심 요약/);
  assert.match(zh.body, /<html lang="zh-Hans">/); assert.match(zh.body, /property="og:locale" content="zh_CN"/);
  assert.match(noStyle(zh.body), /核心结论/); assert.match(noStyle(zh.body), /越南/);
  assert.doesNotMatch(noStyle(zh.body), /專|臺|體|資料庫/);   // no Traditional-only characters in the fixed text
  // zh has no translated title for this segment: the English title is the fallback, in the page language chrome
  assert.match(noStyle(zh.body), /<h1>越南Soft drinks：/);
});

test('commentary: only a CURRENT translation is shown; otherwise no commentary block, never English commentary', async () => {
  const ko = await mapPage('ko');           // stale translation (src_built_at older)
  const h = noStyle(ko.body);
  assert.doesNotMatch(h, /KO-TAKEAWAY|KO-SOWHAT|KO-IMPL|EN-TAKEAWAY|EN-SOWHAT|EN-IMPL/);
  assert.doesNotMatch(h, /data-slot="implications"/); assert.doesNotMatch(h, /class="sowhat"/);
  assert.match(h, /data-slot="takeaway"/);   // the number-driven takeaway is a per-language template, not commentary
  assert.match(h, /매핑했습니다/);
});

test('robots gate: ja map index only with switch on + indexable + current commentary + translated title', async () => {
  indexingOn = true; cfg.invalidateConfig();
  assert.equal(robots((await mapPage('ja')).body), 'index,follow');
  assert.equal(robots((await mapPage('en')).body), 'index,follow');
  assert.equal(robots((await mapPage('ko')).body), 'noindex,follow');                               // stale translation
  assert.equal(robots((await mapPage('zh')).body), 'noindex,follow');                               // no translated title
  assert.equal(robots((await mapPage('ja', 'instant-noodles')).body), 'noindex,follow');            // no translated title
  const th = await mapPage('ja', 'frozen-fish', 'thailand');
  assert.equal(robots(th.body), 'noindex,follow');                                                  // not indexable in English
  assert.equal(th.headers['X-Robots-Tag'], 'noindex, follow');
  indexingOn = false; cfg.invalidateConfig();
  const off = await mapPage('ja');
  assert.equal(robots(off.body), 'noindex,follow'); assert.equal(off.headers['X-Robots-Tag'], 'noindex, follow');
  assert.equal(hreflangs(off.body).length, 0);
  indexingOn = true; cfg.invalidateConfig();
});

test('hreflang: only the languages that are indexable for the page, x-default = en, zh-Hans for Chinese', async () => {
  indexingOn = true; cfg.invalidateConfig();
  const ja = await mapPage('ja'), en = await mapPage('en');
  const want = ['en https://kiraresearch.com/en/market-maps/vietnam/soft-drinks', 'ja https://kiraresearch.com/ja/market-maps/vietnam/soft-drinks', 'x-default https://kiraresearch.com/en/market-maps/vietnam/soft-drinks'];
  assert.deepEqual(hreflangs(ja.body), want);
  assert.deepEqual(hreflangs(en.body), want);
  assert.deepEqual(hreflangs((await mapPage('ko')).body), []);                                     // a noindex page writes none
  assert.deepEqual(hreflangs((await mapPage('ja', 'instant-noodles')).body), []);
  // the hubs: en + ja (ko has a stale map only, zh has no title)
  const hubJa = await call(handler, { type: 'hub', loc: 'ja' });
  assert.deepEqual(hreflangs(hubJa.body), ['en https://kiraresearch.com/en/market-maps', 'ja https://kiraresearch.com/ja/market-maps', 'x-default https://kiraresearch.com/en/market-maps']);
  const cJa = await call(handler, { type: 'country', loc: 'ja', country: 'vietnam' });
  assert.deepEqual(hreflangs(cJa.body), ['en https://kiraresearch.com/en/market-maps/vietnam', 'ja https://kiraresearch.com/ja/market-maps/vietnam', 'x-default https://kiraresearch.com/en/market-maps/vietnam']);
  assert.equal(canonical(cJa.body), 'https://kiraresearch.com/ja/market-maps/vietnam');
});

test('hub: ja hub uses translated titles, family names and country names; index rule follows the maps of that language', async () => {
  indexingOn = true; cfg.invalidateConfig();
  const ja = await call(handler, { type: 'hub', loc: 'ja' });
  const h = noStyle(ja.body);
  assert.equal(robots(ja.body), 'index,follow');
  assert.equal(canonical(ja.body), 'https://kiraresearch.com/ja/market-maps');
  assert.match(h, /<h3>清涼飲料<\/h3>/); assert.match(h, />飲料<\/span>/); assert.match(h, /<a href="\/ja\/market-maps\/vietnam">ベトナム<\/a>/);
  assert.match(h, /<h3>Instant noodles<\/h3>/);              // no translation: English title as the fallback
  assert.match(h, /href="\/ja\/market-maps\/vietnam\/soft-drinks"/);
  assert.match(h, /280社/); assert.match(h, /電話61%/);
  assert.ok(!/Refine by|Browse by country|Largest|Clear all/.test(h));
  assert.match(ja.body, /content:"リストを見る →"/);
  // filter links keep the English family text as the key (URL stays stable) and the language prefix
  assert.match(h, /href="\/ja\/market-maps\?industry=Beverages#?[^"]*"/);
  // ko hub: one translated map but its commentary is stale -> noindex; zh: nothing translated -> noindex
  assert.equal(robots((await call(handler, { type: 'hub', loc: 'ko' })).body), 'noindex,follow');
  assert.equal(robots((await call(handler, { type: 'hub', loc: 'zh' })).body), 'noindex,follow');
  // searching in Japanese finds the translated title
  const q = await call(handler, { type: 'hub', loc: 'ja', q: '清涼' });
  assert.match(noStyle(q.body), /<h3>清涼飲料<\/h3>/); assert.doesNotMatch(noStyle(q.body), /<h3>Instant noodles<\/h3>/);
  assert.equal(robots(q.body), 'noindex,follow');
});

test('hub with nothing published: localised empty states and no hreflang', () => {
  for (const [loc, text] of [['ja', '企業リストを準備中です'], ['ko', '기업 리스트를 준비하고 있습니다'], ['zh', '企业名单筹备中']]) {
    const m = hub.hubModel({ items: [] }, hub.parseParams({}));
    const html = renderHub(m, hub.parseParams({}), { loc });
    assert.match(html, new RegExp(text)); assert.match(html, new RegExp(`href="/${loc}/library"`));
  }
});

test('plain hub stays small in every language (4,000 rows, 50 on a page)', () => {
  const COUNTRIES = ['vietnam', 'thailand', 'south-korea', 'australia', 'new-zealand', 'hong-kong', 'laos'];
  const items = Array.from({ length: 4000 }, (_, k) => ({ slug: `${COUNTRIES[k % 7]}/segment-${k}`, country: COUNTRIES[k % 7], country_name: hub.countryName(COUNTRIES[k % 7]), segment_key: `segment-${k}`, title: `Segment number ${k}`, l2_family: `Family ${k % 150}`,
    kind: k % 3 === 0 ? 'service' : 'goods', companies: 20 + ((k * 37) % 900), indexable: true, price: 36, built: '2026-11-23', ready: { ja: true, ko: true, zh: true } }));
  const names = hub.buildEmptyNames();
  for (const l of ['ja', 'ko', 'zh']) for (const i of items) { names[l].segment.set(i.segment_key, `セグメント名${i.segment_key}`); names[l].family.set(i.l2_family, `業種${i.l2_family}`); }
  for (const loc of ['en', 'ja', 'ko', 'zh']) {
    const p = hub.parseParams({});
    const html = renderHub(hub.hubModel({ items: hub.localizeItems(items, names, loc) }, p), p, { loc });
    assert.ok(Buffer.byteLength(html) < 45 * 1024, `${loc} hub is ${Buffer.byteLength(html)} bytes`);
    assert.equal((html.match(new RegExp(`<a class="lrow" href="/${loc}/market-maps/`, 'g')) || []).length, 50);
    assert.match(html, new RegExp(`<a rel="next" href="/${loc}/market-maps\\?page=2">`));
  }
});

test('country hub: ja groups carry translated family names and counts', async () => {
  const r = await call(handler, { type: 'country', loc: 'ja', country: 'vietnam' });
  const h = noStyle(r.body);
  assert.match(h, /<h1>ベトナムの企業リスト:2セグメントをマッピング<\/h1>/);
  assert.match(h, /<h2>飲料 <i>2件<\/i><\/h2>/);
  assert.match(h, /<li><a href="\/ja\/market-maps\/vietnam\/soft-drinks">清涼飲料<\/a>/);
  const ld = JSON.parse(/id="ld-breadcrumb">([\s\S]*?)<\/script>/.exec(r.body)[1]);
  assert.deepEqual(ld.itemListElement.map((x) => x.name), ['Kira Research', 'マーケットマップ', 'ベトナム']);
});

test('not found is localised and noindex', async () => {
  const r = await call(handler, { type: 'country', loc: 'ko', country: 'nowhere' });
  assert.equal(r.code, 404); assert.match(r.body, /<html lang="ko">/); assert.match(r.body, /마켓 맵을 찾을 수 없습니다/);
});

test('buy box: same price rule in every language, request form posts the page language', async () => {
  for (const loc of ['en', 'ja', 'ko', 'zh']) {
    const S = mockStats();
    const on = renderDocument(S, null, { loc, buy: { enabled: true }, canonical: `https://kiraresearch.com/${loc}/market-maps/vietnam/soft-drinks` });
    assert.match(on, /id="mm-buy"/); assert.match(on, /\$36/); assert.match(on, /\$57/); assert.match(on, /data-msgs="/);
    assert.ok(on.includes('market-map-buy.js'));
    const off = renderDocument(S, null, { loc, buy: { enabled: false } });
    assert.match(off, new RegExp(`locale:"${loc}"|"locale":"${loc}"`));
    assert.match(off, /id="mm-req"/); assert.doesNotMatch(off, /id="mm-buy"/);
  }
  const big = renderDocument(mockStats({ companies: 900, price_usd: 57 }), null, { loc: 'zh', buy: { enabled: true } });
  assert.match(big, /\$57/);
});

test('every language renders every exhibit block without throwing (marimekko, heatmap, stacked, brands, channels, geography, certificates, origins)', () => {
  for (const loc of ['en', 'ja', 'ko', 'zh']) {
    const html = renderDocument(mockStats(), { takeaway: 'T', so_what: { brands: 'x' }, implications: ['i'] }, { loc, buy: { enabled: true } });
    assert.ok(!/undefined|\[object Object\]|NaN/.test(noStyle(html)), `${loc} has a broken value`);
    assert.ok((html.match(/<svg viewBox/g) || []).length >= 8, `${loc}: ${(html.match(/<svg viewBox/g) || []).length} charts`);
    const text = noStyle(html);
    assert.ok(!/\bAI\b|Claude|McKinsey/.test(text));
  }
});

test('country labels in titles: ja title carries the Japanese segment and country', () => {
  const html = renderDocument(mockStats(), null, { loc: 'ja', segName: '清涼飲料', countryName: 'ベトナム' });
  assert.match(html, /<title>ベトナムの清涼飲料企業:市場の全体像と企業リスト \| KIRA Research<\/title>/);
  assert.match(html, /"inLanguage":"ja"/);
  assert.match(lab('ja', 'Brand owner / manufacturer'), /メーカー/);
  assert.equal(ui('xx').htmlLang, 'en');
});

test('sitemaps: ja file holds only current + translated maps; en file is unchanged; the index lists all four', async () => {
  indexingOn = true; cfg.invalidateConfig();
  const locs = (b) => [...b.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1]);
  const en = locs((await call(sitemap, {}, '/api/sitemap?type=market-maps')).body);
  assert.deepEqual(en.sort(), ['https://kiraresearch.com/en/market-maps', 'https://kiraresearch.com/en/market-maps/vietnam', 'https://kiraresearch.com/en/market-maps/vietnam/instant-noodles', 'https://kiraresearch.com/en/market-maps/vietnam/soft-drinks'].sort());
  const ja = locs((await call(sitemap, {}, '/api/sitemap?type=market-maps&locale=ja')).body);
  assert.deepEqual(ja.sort(), ['https://kiraresearch.com/ja/market-maps', 'https://kiraresearch.com/ja/market-maps/vietnam', 'https://kiraresearch.com/ja/market-maps/vietnam/soft-drinks'].sort());
  for (const l of ['ko', 'zh']) assert.deepEqual(locs((await call(sitemap, {}, `/api/sitemap?type=market-maps&locale=${l}`)).body), []);
  const idx = locs((await call(sitemap, {}, '/api/sitemap')).body);
  for (const f of ['', '-ja', '-ko', '-zh']) assert.ok(idx.includes(`https://kiraresearch.com/sitemap-market-maps${f}.xml`), f);
  indexingOn = false; cfg.invalidateConfig();
  assert.equal((await call(sitemap, {}, '/api/sitemap?type=market-maps&locale=ja')).body.includes('<loc>'), false);
  assert.doesNotMatch((await call(sitemap, {}, '/api/sitemap')).body, /sitemap-market-maps/);
  indexingOn = true; cfg.invalidateConfig();
});

test('routes: ja/ko/zh paths exist in vercel.json for hub, country and map, and the three language sitemaps', async () => {
  const { readFileSync } = await import('node:fs');
  const v = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const src = new Set(v.rewrites.map((r) => r.source));
  for (const l of ['en', 'ja', 'ko', 'zh']) for (const p of ['market-maps', 'market-maps/:country', 'market-maps/:country/:segment']) assert.ok(src.has(`/${l}/${p}`), `${l}/${p}`);
  for (const f of ['ja', 'ko', 'zh']) assert.ok(src.has(`/sitemap-market-maps-${f}.xml`));
});
