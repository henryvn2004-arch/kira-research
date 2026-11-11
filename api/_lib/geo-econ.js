// ============================================================
// KIRA RESEARCH — api/_lib/geo-econ.js
// Kira Data → GEO answers, written by code (no model). Reads the stored economic data (econ_flows, econ_series,
// econ_indicators, segment_data_map, hs_codes; only data_sources marked public) and builds kira_answers rows
// (source_kind 'econ', home 'kira') from fixed English templates, with ja / ko / zh versions from fixed templates.
//
//   buildRows(read) → { rows, stats }            read(path) → Promise<rows> (Supabase REST GET, paged here)
//   syncRows(rows, { write, read }) → counts      upsert by content_hash; rows of an older year/value → 'retired'
//
// Rules: numbers are the stored values with one fixed format (3 significant figures + k / m / bn / tn; percentages
// with up to 2 decimals); only complete years (annual < current year, monthly windows of 12 consecutive months);
// zero / null values are skipped; a segment comes from segment_data_map via the existing resolver (no match = skipped).
// ============================================================
import crypto from 'node:crypto';
import { resolveProfile } from './market-map.js';
import { countryName } from './geo-i18n.js';

export const LOCS = ['ja', 'ko', 'zh'];
const ALL = ['en', ...LOCS];

// ── number formats (fixed) ───────────────────────────────
const sig3 = (x) => String(Number(Math.abs(x).toPrecision(3)));
export function fmtAmount(v, ccy) {
  const a = Math.abs(v);
  const [d, s] = a >= 1e12 ? [1e12, ' tn'] : a >= 1e9 ? [1e9, ' bn'] : a >= 1e6 ? [1e6, ' m'] : a >= 1e3 ? [1e3, ' k'] : [1, ''];
  return `${ccy ? ccy + ' ' : ''}${v < 0 ? '-' : ''}${sig3(a / d)}${s}`;
}
export const fmtNum2 = (v) => String(Math.round(v * 100) / 100);
export const fmtPct = (v) => `${fmtNum2(v)}%`;
export const fmtChg = (v, prev) => { const c = (v / prev - 1) * 100; return `${c >= 0 ? '+' : '-'}${Math.abs(c).toFixed(1)}%`; };
export const lc = (s) => (/^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

// ── names in four languages ──────────────────────────────
const region = Object.fromEntries(ALL.map((l) => [l, new Intl.DisplayNames([l === 'zh' ? 'zh-Hans' : l], { type: 'region' })]));
const EN_THE = { PH: 'the Philippines', NL: 'the Netherlands', GB: 'the United Kingdom', AE: 'the United Arab Emirates' };
const SPECIAL = { HK: { en: 'Hong Kong', ja: '香港', ko: '홍콩', zh: '香港' }, MO: { en: 'Macao', ja: 'マカオ', ko: '마카오', zh: '澳门' }, EU: { en: 'the EU', ja: 'EU', ko: 'EU', zh: '欧盟' }, ASEAN: { en: 'ASEAN', ja: 'ASEAN', ko: 'ASEAN', zh: '东盟' }, US: { en: 'the United States' } };
const AGGREGATES = new Set(['WLD', 'ASEAN', 'EU']);
export function partnerName(code, loc, countries) {
  if (SPECIAL[code] && SPECIAL[code][loc]) return SPECIAL[code][loc];
  if (loc === 'en' && EN_THE[code]) return EN_THE[code];
  const c = countries.find((x) => x.code === code);
  if (c) return countryName(c, loc);
  try { return region[loc].of(code) || code; } catch (_e) { return code; }
}
const cap = (s) => s[0].toUpperCase() + s.slice(1);

const VIA = { en: 'via KIRA Data', ja: 'KIRA Data 経由', ko: 'KIRA Data 제공', zh: '经 KIRA Data' };
const SRC_SHORT = {
  eurostat_comext: 'Eurostat', estat: 'e-Stat (Japan)', kr_customs: 'Korea Customs Service', us_census: 'U.S. Census Bureau',
  worldbank_wdi: 'World Bank', vn_customs: 'Viet Nam Customs', singstat: 'SingStat', psa_openstat: 'Philippine Statistics Authority',
  aseanstats: 'ASEANstats', bkpm: 'BKPM (Indonesia)', vn_nso: 'National Statistics Office of Viet Nam', opendosm: 'OpenDOSM',
  bnm: 'Bank Negara Malaysia', boj: 'Bank of Japan',
};
const srcName = (key, sources) => SRC_SHORT[key] || (sources.find((s) => s.key === key) || {}).name || key;

// ── text templates ───────────────────────────────────────
// Every template gets the same numbers in every language (the ja / ko / zh gate compares number tokens).
const T = {
  en: {
    tradeQ: (rep, flow, label, c) => (flow === 'M' ? `How much ${label} does ${rep} import from ${c}?` : `How much ${label} does ${rep} export to ${c}?`),
    tradeA: (rep, flow, label, c, amt, y, chg, src) => `${cap(rep)} ${flow === 'M' ? 'imported' : 'exported'} ${amt} of ${label} ${flow === 'M' ? 'from' : 'to'} ${c} in ${y}, ${chg} on ${y - 1} (${src}, ${VIA.en}).`,
    readQ: (label, c) => `What is the latest ${lc(label)} in ${c}?`,
    readA: (label, c, val, per, src) => `${cap(lc(label))} in ${c} came to ${val} in ${per} (${src}, ${VIA.en}).`,
    levelQ: (label, c) => `What was the level of ${lc(label)} in ${c}?`,
    levelA: (label, c, val, y, chg, src) => `${cap(lc(label))} in ${c} came to ${val} in ${y}${chg ? `, ${chg} on ${y - 1}` : ''} (${src}, ${VIA.en}).`,
    topQ: (flow, c) => (flow === 'M' ? `Which countries does ${c} import the most from?` : `Which countries does ${c} export the most to?`),
    topA: (flow, c, win, list, src) => `${win}, the largest ${flow === 'M' ? 'import sources' : 'export markets'} of ${c} were ${list} (${src}, ${VIA.en}).`,
    win12: (per) => `In the 12 months to ${per}`, winY: (y) => `In ${y}`,
    fdiQ: (c) => `Which countries invest the most in ${c}?`,
    fdiA: (kind, c, y, list, src) => `In ${y}, the largest sources of ${kind} foreign direct investment in ${c} were ${list} (${src}, ${VIA.en}).`,
    kind: { registered: 'registered', realised: 'realised', net: 'net' },
    jpQ: (c) => `How much has Japan invested directly in ${c}?`,
    jpA: (c, amt, per, src) => `Japan's net direct investment in ${c} came to ${amt} in the 12 months to ${per} (${src}, ${VIA.en}).`,
    visQ: (c) => `How many international visitors does ${c} receive?`,
    visA: (c, amt, per, chg, prev, src) => `${cap(c)} received ${amt} international visitors in the 12 months to ${per}, ${chg} on the 12 months to ${prev} (${src}, ${VIA.en}).`,
  },
  ja: {
    tradeQ: (rep, flow, label, c) => (flow === 'M' ? `${rep}は${c}から${label}をどれだけ輸入していますか？` : `${rep}は${c}へ${label}をどれだけ輸出していますか？`),
    tradeA: (rep, flow, label, c, amt, y, chg, src) => `${y}年の${rep}の${c}${flow === 'M' ? 'からの' : 'への'}${label}${flow === 'M' ? '輸入' : '輸出'}額は${amt}で、${y - 1}年比${chg}でした（${src}、${VIA.ja}）。`,
    readQ: (label, c) => `${c}の最新の${label}はいくつですか？`,
    readA: (label, c, val, per, src) => `${c}の${label}は${per}時点で${val}でした（${src}、${VIA.ja}）。`,
    levelQ: (label, c) => `${c}の${label}はいくつでしたか？`,
    levelA: (label, c, val, y, chg, src) => `${y}年の${c}の${label}は${val}${chg ? `で、${y - 1}年比${chg}` : ''}でした（${src}、${VIA.ja}）。`,
    topQ: (flow, c) => (flow === 'M' ? `${c}の主な輸入元はどこですか？` : `${c}の主な輸出先はどこですか？`),
    topA: (flow, c, win, list, src) => `${win}、${c}の主な${flow === 'M' ? '輸入元' : '輸出先'}は${list}でした（${src}、${VIA.ja}）。`,
    win12: (per) => `${per}までの12か月間`, winY: (y) => `${y}年`,
    fdiQ: (c) => `${c}に最も多く投資している国はどこですか？`,
    fdiA: (kind, c, y, list, src) => `${y}年の${c}への${kind}外国直接投資の主な出し手は${list}でした（${src}、${VIA.ja}）。`,
    kind: { registered: '認可ベースの', realised: '実行ベースの', net: 'ネットの' },
    jpQ: (c) => `日本は${c}にどれだけ直接投資していますか？`,
    jpA: (c, amt, per, src) => `${per}までの12か月間の日本の${c}向けネット直接投資は${amt}でした（${src}、${VIA.ja}）。`,
    visQ: (c) => `${c}を訪れる外国人旅行者は何人ですか？`,
    visA: (c, amt, per, chg, prev, src) => `${per}までの12か月間に${c}を訪れた外国人旅行者は${amt}で、${prev}までの12か月間比${chg}でした（${src}、${VIA.ja}）。`,
  },
  ko: {
    tradeQ: (rep, flow, label, c) => (flow === 'M' ? `${rep}은(는) ${c}에서 ${label}을(를) 얼마나 수입합니까?` : `${rep}은(는) ${c}(으)로 ${label}을(를) 얼마나 수출합니까?`),
    tradeA: (rep, flow, label, c, amt, y, chg, src) => `${y}년 ${rep}의 ${c} ${flow === 'M' ? '수입' : '수출'} ${label} 금액은 ${amt}로, ${y - 1}년 대비 ${chg}였습니다(${src}, ${VIA.ko}).`,
    readQ: (label, c) => `${c}의 최신 ${label}은(는) 얼마입니까?`,
    readA: (label, c, val, per, src) => `${c}의 ${label}은(는) ${per} 기준 ${val}였습니다(${src}, ${VIA.ko}).`,
    levelQ: (label, c) => `${c}의 ${label}은(는) 얼마였습니까?`,
    levelA: (label, c, val, y, chg, src) => `${y}년 ${c}의 ${label}은(는) ${val}${chg ? `로, ${y - 1}년 대비 ${chg}` : ''}였습니다(${src}, ${VIA.ko}).`,
    topQ: (flow, c) => (flow === 'M' ? `${c}의 주요 수입 상대국은 어디입니까?` : `${c}의 주요 수출 상대국은 어디입니까?`),
    topA: (flow, c, win, list, src) => `${win} ${c}의 주요 ${flow === 'M' ? '수입 상대국' : '수출 상대국'}은 ${list}였습니다(${src}, ${VIA.ko}).`,
    win12: (per) => `${per}까지 12개월간`, winY: (y) => `${y}년`,
    fdiQ: (c) => `${c}에 가장 많이 투자하는 나라는 어디입니까?`,
    fdiA: (kind, c, y, list, src) => `${y}년 ${c}에 대한 ${kind} 외국인 직접투자의 주요 투자국은 ${list}였습니다(${src}, ${VIA.ko}).`,
    kind: { registered: '신고 기준', realised: '실행 기준', net: '순' },
    jpQ: (c) => `일본은 ${c}에 얼마나 직접투자했습니까?`,
    jpA: (c, amt, per, src) => `${per}까지 12개월간 일본의 ${c} 순직접투자는 ${amt}였습니다(${src}, ${VIA.ko}).`,
    visQ: (c) => `${c}을(를) 찾는 외국인 방문객은 몇 명입니까?`,
    visA: (c, amt, per, chg, prev, src) => `${per}까지 12개월간 ${c}을(를) 찾은 외국인 방문객은 ${amt}로, ${prev}까지 12개월 대비 ${chg}였습니다(${src}, ${VIA.ko}).`,
  },
  zh: {
    tradeQ: (rep, flow, label, c) => (flow === 'M' ? `${rep}从${c}进口了多少${label}？` : `${rep}向${c}出口了多少${label}？`),
    tradeA: (rep, flow, label, c, amt, y, chg, src) => `${y}年${rep}${flow === 'M' ? '从' : '向'}${c}${flow === 'M' ? '进口' : '出口'}${label}${amt}，较${y - 1}年${chg}（${src}，${VIA.zh}）。`,
    readQ: (label, c) => `${c}最新的${label}是多少？`,
    readA: (label, c, val, per, src) => `${c}的${label}在${per}为${val}（${src}，${VIA.zh}）。`,
    levelQ: (label, c) => `${c}的${label}是多少？`,
    levelA: (label, c, val, y, chg, src) => `${y}年${c}的${label}为${val}${chg ? `，较${y - 1}年${chg}` : ''}（${src}，${VIA.zh}）。`,
    topQ: (flow, c) => (flow === 'M' ? `${c}的主要进口来源国有哪些？` : `${c}的主要出口目的地有哪些？`),
    topA: (flow, c, win, list, src) => `${win}，${c}的主要${flow === 'M' ? '进口来源' : '出口市场'}为${list}（${src}，${VIA.zh}）。`,
    win12: (per) => `截至${per}的12个月`, winY: (y) => `${y}年`,
    fdiQ: (c) => `哪些国家对${c}的投资最多？`,
    fdiA: (kind, c, y, list, src) => `${y}年，${c}${kind}外国直接投资的主要来源为${list}（${src}，${VIA.zh}）。`,
    kind: { registered: '登记', realised: '实际到位', net: '净' },
    jpQ: (c) => `日本对${c}直接投资了多少？`,
    jpA: (c, amt, per, src) => `截至${per}的12个月，日本对${c}的净直接投资为${amt}（${src}，${VIA.zh}）。`,
    visQ: (c) => `${c}接待了多少国际游客？`,
    visA: (c, amt, per, chg, prev, src) => `截至${per}的12个月，${c}接待国际游客${amt}，较截至${prev}的12个月${chg}（${src}，${VIA.zh}）。`,
  },
};
const REP = {
  EU: { en: 'the EU', ja: 'EU', ko: 'EU', zh: '欧盟' }, JP: { en: 'Japan', ja: '日本', ko: '일본', zh: '日本' },
  KR: { en: 'South Korea', ja: '韓国', ko: '한국', zh: '韩国' }, US: { en: 'the United States', ja: '米国', ko: '미국', zh: '美国' },
};
const REP_ORDER = ['EU', 'JP', 'KR', 'US'];
const ENUM_JOIN = { en: (a) => (a.length < 3 ? a.join(' and ') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`), ja: (a) => a.join('、'), ko: (a) => a.join(', '), zh: (a) => a.join('、') };

// ── periods ──────────────────────────────────────────────
// Trade rows below this value (in the reporter's currency) say little and change a lot year on year: left out.
export const MIN_TRADE_VALUE = 1e6;
const THIS_YEAR = () => new Date().getUTCFullYear();
const monthEnd = (p) => { const [y, m] = p.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); };
const periodEnd = (p) => (/^\d{4}$/.test(p) ? `${p}-12-31` : /^\d{4}-\d{2}$/.test(p) ? monthEnd(p) : /^(\d{4})-Q([1-4])$/.test(p) ? monthEnd(`${p.slice(0, 4)}-${String(Number(p.slice(-1)) * 3).padStart(2, '0')}`) : null);
const addMonths = (p, n) => { const [y, m] = p.split('-').map(Number); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
// The 12 months ending at `end`, or null when any month is missing from `have` (a Set of 'YYYY-MM').
const window12 = (end, have) => { const m = Array.from({ length: 12 }, (_x, i) => addMonths(end, -i)); return m.every((x) => have.has(x)) ? m : null; };

const hash = (...p) => crypto.createHash('sha1').update(p.map((x) => (typeof x === 'string' ? x : JSON.stringify(x ?? ''))).join('␟')).digest('hex');

// One row from per-language question / answer builders: q(loc), a(loc) → text.
function mk({ country, segment, intent, metric, q, a, value, unit, year, asOf, source, sources, ref }) {
  const row = {
    question: q('en'), intent, country_code: country, segment_key: segment || null, metric, answer_short: a('en'),
    value: Number.isFinite(value) ? value : null, unit, year, as_of: asOf, primary_source: srcName(source, sources),
    source_kind: 'econ', source_ref: { slug: `kira-data-${source}`, source, ...ref }, home: 'kira',
    i18n: Object.fromEntries(LOCS.map((l) => [l, { question: q(l), answer_short: a(l) }])),
  };
  row.content_hash = hash(row.question, row.answer_short, row.source_ref, row.country_code, row.segment_key);
  return row;
}

// ── the builder ──────────────────────────────────────────
// read(path) → rows. Paged here, so a table of any size works.
export async function buildRows(read) {
  const page = async (path) => {
    const out = [];
    for (let off = 0; ; off += 1000) {
      const r = await read(`${path}${path.includes('?') ? '&' : '?'}limit=1000&offset=${off}`);
      out.push(...r);
      if (r.length < 1000) return out;
    }
  };
  const [countries, sources, map, hs, inds, links, industries] = await Promise.all([
    page('tax_countries?select=code,name&order=code'),
    page('data_sources?public=eq.true&select=key,name&order=key'),
    page('segment_data_map?select=key,hs,groups,industry_slugs,keywords,ord&order=key'),
    page('hs_codes?select=code,label&order=code'),
    page('econ_indicators?active=eq.true&select=key,source_key,country_code,label,unit,freq,params&order=key'),
    page('tax_country_industry?status=neq.rejected&select=country_code,industry_id&order=country_code,industry_id'),
    page('tax_industries?select=id,slug,level,parent_id&order=id'),
  ]);
  const pub = new Set(sources.map((s) => s.key));
  const hsLabel = Object.fromEntries(hs.map((h) => [h.code, h.label]));
  const stats = { skipped_no_profile: 0, skipped_no_data: 0 };
  const cn = (code, loc) => partnerName(code, loc, countries);
  const rows = [];

  // ---- data ----
  const pubIn = `in.(${[...pub].join(',')})`;
  const series = await page(`econ_series?is_forecast=eq.false&source_key=${pubIn}&select=indicator_key,country_code,period,value&order=indicator_key,country_code,period`);
  const serByKey = new Map();
  for (const s of series) { const k = `${s.indicator_key}|${s.country_code}`; if (!serByKey.has(k)) serByKey.set(k, []); serByKey.get(k).push(s); }
  const flows = await page(`econ_flows?source_key=${pubIn}&partner=neq.WLD&select=source_key,reporter,partner,product,flow,freq,period,value,currency&order=source_key,reporter,partner,product,flow,freq,period`);
  const num = (x) => Number(x);
  const hsFlows = new Map();   // `${reporter}|${partner}|${product}|${flow}` → { source, ccy, byYear: Map }
  for (const r of flows) {
    if (r.freq !== 'A' || !/^\d{2,6}$/.test(r.product) || !REP[r.reporter]) continue;
    const k = `${r.reporter}|${r.partner}|${r.product}|${r.flow}`;
    if (!hsFlows.has(k)) hsFlows.set(k, { source: r.source_key, ccy: r.currency, byYear: new Map() });
    hsFlows.get(k).byYear.set(Number(r.period), num(r.value));
  }

  // The latest complete year with a positive value and a positive value the year before.
  const latestPair = (byYear) => {
    const ys = [...byYear.keys()].filter((y) => y < THIS_YEAR()).sort((a, b) => b - a);
    for (const y of ys) { const v = byYear.get(y), p = byYear.get(y - 1); if (v >= MIN_TRADE_VALUE && p > 0) return { y, v, p }; }
    return null;
  };

  // A national or World Bank series reading → row (latest actual value; annual series only up to last year).
  const indicatorRow = (ind, country, segment) => {
    const pts = serByKey.get(`${ind.key}|${country}`) || [];
    const ok = pts.filter((p) => (ind.freq !== 'A' || Number(p.period) < THIS_YEAR()) && Number.isFinite(num(p.value))).sort((a, b) => (a.period < b.period ? -1 : 1));
    if (!ok.length) return null;
    const last = ok.at(-1), v = num(last.value);
    if (!v) return null;
    const unit = ind.unit, cur = (ind.params || {}).currency;
    const val = () => ({ pct: fmtPct(v), usd: fmtAmount(v, 'USD'), usd_per_person: fmtAmount(v, 'USD'), people: fmtAmount(v, ''), lcu: fmtAmount(v, cur || ''), lcu_per_usd: fmtNum2(v) }[unit] ?? fmtNum2(v));
    const label = (loc) => (ind.label && ind.label[loc]) || ind.label.en;
    const src = () => srcName(ind.source_key, sources);
    const intent = { cpi_yoy: 'trends', policy_rate: 'trends', fx_usd: 'trends', urban_pop: 'consumer', wage: 'consumer', wage_foreign: 'consumer', exports_m: 'trade_flow', imports_m: 'trade_flow', ipi_growth: 'growth', gdp_growth_q: 'growth' }[(ind.params || {}).group] || 'other';
    const annual = ind.freq === 'A';
    const prev = annual ? ok.find((p) => Number(p.period) === Number(last.period) - 1) : null;
    const chg = annual && ['usd', 'usd_per_person', 'people', 'lcu'].includes(unit) && prev && num(prev.value) > 0 ? fmtChg(v, num(prev.value)) : null;
    const y = Number(String(last.period).slice(0, 4));
    return mk({
      country, segment, intent, metric: `series_${ind.key}`, source: ind.source_key, sources,
      q: (loc) => (annual ? T[loc].levelQ(label(loc), cn(country, loc)) : T[loc].readQ(label(loc), cn(country, loc))),
      a: (loc) => (annual ? T[loc].levelA(label(loc), cn(country, loc), val(), y, chg, src()) : T[loc].readA(label(loc), cn(country, loc), val(loc), last.period, src(loc))),
      value: v, unit, year: y, asOf: periodEnd(String(last.period)), ref: { series: ind.key, period: String(last.period) },
    });
  };

  // ---- segment rows ----
  const indById = new Map(industries.map((i) => [i.id, i]));
  const seen = new Set();
  const countrySet = new Set(countries.map((c) => c.code));
  const natInds = inds.filter((i) => i.country_code && pub.has(i.source_key));
  const wbInds = inds.filter((i) => !i.country_code && i.source_key === 'worldbank_wdi');

  for (const l of links) {
    const ind = indById.get(l.industry_id);
    if (!ind || ind.level !== 2 || !countrySet.has(l.country_code)) continue;
    const key = `${l.country_code}|${ind.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const parent = indById.get(ind.parent_id);
    const profile = resolveProfile(map, { slug: ind.slug, parentSlug: parent ? parent.slug : null });
    if (!profile) { stats.skipped_no_profile++; continue; }
    const C = l.country_code, seg = ind.slug;
    const mine = [];

    // trade by HS code: top imports and one export per reporter that has data on this market
    const codes = (profile.hs || []).filter((c) => hsLabel[c]);
    let n = 0;
    for (const rep of REP_ORDER) {
      const cand = [];
      for (const code of codes) for (const flow of ['M', 'X']) {
        const f = hsFlows.get(`${rep}|${C}|${code}|${flow}`);
        const p = f && latestPair(f.byYear);
        if (p) cand.push({ code, flow, f, ...p });
      }
      const pick = [...cand.filter((c) => c.flow === 'M').sort((a, b) => b.v - a.v).slice(0, 2), ...cand.filter((c) => c.flow === 'X').sort((a, b) => b.v - a.v).slice(0, 1)];
      for (const c of pick) {
        if (n >= 5) break;
        const amt = fmtAmount(c.v, c.f.ccy), chg = fmtChg(c.v, c.p);
        mine.push(mk({
          country: C, segment: seg, intent: 'trade_flow', metric: `trade_hs_${c.code}_${c.flow}`, source: c.f.source, sources,
          q: (loc) => T[loc].tradeQ(REP[rep][loc], c.flow, lc(hsLabel[c.code][loc] || hsLabel[c.code].en), cn(C, loc)),
          a: (loc) => T[loc].tradeA(REP[rep][loc], c.flow, lc(hsLabel[c.code][loc] || hsLabel[c.code].en), cn(C, loc), amt, c.y, chg, srcName(c.f.source, sources)),
          value: c.v, unit: c.f.ccy, year: c.y, asOf: `${c.y}-12-31`, ref: { reporter: rep, hs: c.code, flow: c.flow, period: String(c.y) },
        }));
        n++;
      }
    }
    // national indicators named in the profile's groups (not visitors, built below)
    for (const g of (profile.groups || []).filter((x) => x !== 'visitors').slice(0, 3)) {
      const i = natInds.find((x) => x.country_code === C && (x.params || {}).group === g);
      const r = i && indicatorRow(i, C, seg);
      if (r) mine.push(r);
    }
    if ((profile.groups || []).includes('visitors')) { const v = visitorRow(C, seg); if (v) mine.push(v); }
    if (!mine.length) { stats.skipped_no_data++; continue; }
    rows.push(...mine.slice(0, 8));
  }

  // ---- visitors (monthly arrivals, 12-month windows) ----
  function visitorRow(C, seg) {
    const v = flows.filter((r) => r.reporter === C && r.product === 'VISITORS' && r.flow === 'M' && r.freq === 'M');
    if (!v.length) return null;
    const src = v[0].source_key;
    const byM = new Map();
    for (const r of v) byM.set(r.period, (byM.get(r.period) || 0) + num(r.value));
    const have = new Set(byM.keys());
    const end = [...have].sort().at(-1);
    const w = window12(end, have), pw = w && window12(addMonths(end, -12), have);
    if (!w || !pw) return null;
    const cur = w.reduce((t, m) => t + byM.get(m), 0), prev = pw.reduce((t, m) => t + byM.get(m), 0);
    if (!(cur > 0 && prev > 0)) return null;
    const amt = fmtAmount(cur, ''), chg = fmtChg(cur, prev), pe = addMonths(end, -12);
    return mk({
      country: C, segment: seg, intent: 'consumer', metric: 'visitors_12m', source: src, sources,
      q: (loc) => T[loc].visQ(cn(C, loc)), a: (loc) => T[loc].visA(cn(C, loc), amt, end, chg, pe, srcName(src, sources)),
      value: cur, unit: 'persons', year: Number(end.slice(0, 4)), asOf: monthEnd(end), ref: { period: end },
    });
  }

  // ---- country-level rows (no segment) ----
  for (const c of countries) {
    const C = c.code;
    // World Bank levels
    for (const key of ['gdp_usd', 'gdp_per_capita', 'population', 'gdp_growth', 'inflation', 'imports_usd', 'exports_usd', 'fdi_inflow', 'internet_users', 'urban_share']) {
      const i = wbInds.find((x) => x.key === key);
      const r = i && indicatorRow(i, C, null);
      if (r) { r.intent = { gdp_usd: 'market_size', gdp_per_capita: 'market_size', population: 'consumer', gdp_growth: 'growth', inflation: 'trends', imports_usd: 'trade_flow', exports_usd: 'trade_flow', fdi_inflow: 'investment', internet_users: 'consumer', urban_share: 'consumer' }[key]; rows.push(r); }
    }
    // national readings (policy rate, inflation, exchange rate, quarterly growth, monthly trade)
    for (const i of natInds.filter((x) => x.country_code === C && ['cpi_yoy', 'policy_rate', 'fx_usd', 'gdp_growth_q', 'ipi_growth', 'exports_m', 'imports_m'].includes((x.params || {}).group))) {
      const r = indicatorRow(i, C, null);
      if (r) rows.push(r);
    }
    // visitors
    if (['MY', 'SG'].includes(C)) { const v = visitorRow(C, null); if (v) rows.push(v); }

    // top 3 trade partners (monthly: 12 months; annual: latest complete year)
    for (const flow of ['M', 'X']) {
      const set = flows.filter((r) => r.reporter === C && r.product === 'TOTAL' && r.flow === flow && !AGGREGATES.has(r.partner));
      if (!set.length) continue;
      const src = set[0].source_key, ccy = set[0].currency, freq = set[0].freq;
      let per, year;
      const sums = new Map();
      if (freq === 'M') {
        const have = new Set(set.map((r) => r.period)), end = [...have].sort().at(-1), w = window12(end, have);
        if (!w) continue;
        const ws = new Set(w);
        for (const r of set) if (ws.has(r.period)) sums.set(r.partner, (sums.get(r.partner) || 0) + num(r.value));
        per = end; year = Number(end.slice(0, 4));
      } else {
        const ys = [...new Set(set.map((r) => r.period))].filter((p) => /^\d{4}$/.test(p) && Number(p) < THIS_YEAR()).sort();
        if (!ys.length) continue;
        year = Number(ys.at(-1));
        for (const r of set) if (r.period === String(year)) sums.set(r.partner, num(r.value));
      }
      const top = [...sums.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top.length < 3) continue;
      const s = srcName(src, sources);
      rows.push(mk({
        country: C, segment: null, intent: 'trade_flow', metric: `top_partners_${flow}`, source: src, sources,
        q: (loc) => T[loc].topQ(flow, cn(C, loc)),
        a: (loc) => T[loc].topA(flow, cn(C, loc), freq === 'M' ? T[loc].win12(per) : T[loc].winY(year), ENUM_JOIN[loc](top.map(([p, v]) => `${cn(p, loc)} (${fmtAmount(v, ccy)})`)), s),
        value: top[0][1], unit: ccy, year, asOf: freq === 'M' ? monthEnd(per) : `${year}-12-31`,
        ref: { flow, period: freq === 'M' ? per : String(year), partners: top.map(([p]) => p) },
      }));
    }

    // FDI by investor country: national source first, ASEANstats otherwise
    const fdi = (src, product, period) => flows.filter((r) => r.source_key === src && r.reporter === C && r.product === product && r.flow === 'M' && !AGGREGATES.has(r.partner) && period(r));
    let sel = null;
    const bk = fdi('bkpm', 'FDI_REALISED', () => true);
    if (bk.length) {
      const ys = [...new Set(bk.map((r) => r.period.slice(0, 4)))].filter((y) => Number(y) < THIS_YEAR() && new Set(bk.filter((r) => r.period.startsWith(y)).map((r) => r.period)).size === 4).sort();
      if (ys.length) { const y = ys.at(-1), sums = new Map(); for (const r of bk.filter((r) => r.period.startsWith(y))) sums.set(r.partner, (sums.get(r.partner) || 0) + num(r.value)); sel = { src: 'bkpm', kind: 'realised', y: Number(y), sums, ccy: 'USD' }; }
    }
    if (!sel) {
      const vn = fdi('vn_nso', 'FDI_REG_YTD', (r) => /^\d{4}-12$/.test(r.period) && Number(r.period.slice(0, 4)) < THIS_YEAR());
      if (vn.length) { const y = Math.max(...vn.map((r) => Number(r.period.slice(0, 4)))); sel = { src: 'vn_nso', kind: 'registered', y, sums: new Map(vn.filter((r) => r.period.startsWith(String(y))).map((r) => [r.partner, num(r.value)])), ccy: 'USD' }; }
    }
    if (!sel) {
      const as = fdi('aseanstats', 'FDI_NET', (r) => /^\d{4}$/.test(r.period) && Number(r.period) < THIS_YEAR());
      if (as.length) { const y = Math.max(...as.map((r) => Number(r.period))); sel = { src: 'aseanstats', kind: 'net', y, sums: new Map(as.filter((r) => r.period === String(y)).map((r) => [r.partner, num(r.value)])), ccy: 'USD' }; }
    }
    if (sel) {
      const top = [...sel.sums.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top.length === 3) {
        rows.push(mk({
          country: C, segment: null, intent: 'investment', metric: `fdi_investors_${sel.kind}`, source: sel.src, sources,
          q: (loc) => T[loc].fdiQ(cn(C, loc)),
          a: (loc) => T[loc].fdiA(T[loc].kind[sel.kind], cn(C, loc), sel.y, ENUM_JOIN[loc](top.map(([p, v]) => `${cn(p, loc)} (${fmtAmount(v, sel.ccy)})`)), srcName(sel.src, sources)),
          value: top[0][1], unit: sel.ccy, year: sel.y, asOf: `${sel.y}-12-31`, ref: { period: String(sel.y), investors: top.map(([p]) => p) },
        }));
      }
    }

    // Japan's direct investment in this market (Bank of Japan, monthly net outflow)
    if (C !== 'JP') {
      const bj = flows.filter((r) => r.source_key === 'boj' && r.reporter === 'JP' && r.partner === C && r.product === 'FDI_NET' && r.flow === 'X' && r.freq === 'M');
      if (bj.length) {
        const byM = new Map(bj.map((r) => [r.period, num(r.value)])), have = new Set(byM.keys()), end = [...have].sort().at(-1), w = window12(end, have);
        const tot = w ? w.reduce((t, m) => t + byM.get(m), 0) : 0;
        if (w && tot > 0) {
          rows.push(mk({
            country: C, segment: null, intent: 'investment', metric: 'fdi_japan_12m', source: 'boj', sources,
            q: (loc) => T[loc].jpQ(cn(C, loc)), a: (loc) => T[loc].jpA(cn(C, loc), fmtAmount(tot, 'JPY'), end, srcName('boj', sources)),
            value: tot, unit: 'JPY', year: Number(end.slice(0, 4)), asOf: monthEnd(end), ref: { period: end },
          }));
        }
      }
    }
  }
  // One row per content_hash (the same text can come up twice, e.g. a segment listed under two parents).
  const uniq = [...new Map(rows.map((r) => [r.content_hash, r])).values()];
  stats.rows = uniq.length;
  return { rows: uniq, stats };
}

// ── write ────────────────────────────────────────────────
// write(path, method, body, headers?) → parsed JSON or null. Upsert by content_hash; rows of this source that are no
// longer produced (an older year or a revised value) are set to 'retired'. Returns counts.
export async function syncRows(rows, { read, write }) {
  const now = new Date().toISOString();
  const keep = new Set(rows.map((r) => r.content_hash));
  const body = rows.map((r) => ({ ...r, status: 'published', gate: { ok: true, reasons: [], by: 'geo-econ' }, checked_at: now, updated_at: now }));
  for (let i = 0; i < body.length; i += 200) await write('kira_answers?on_conflict=content_hash', 'POST', body.slice(i, i + 200), { Prefer: 'resolution=merge-duplicates,return=minimal' });
  const old = [];
  for (let off = 0; ; off += 1000) {
    const r = await read(`kira_answers?source_kind=eq.econ&home=eq.kira&status=eq.published&select=id,content_hash&order=id&limit=1000&offset=${off}`);
    old.push(...r);
    if (r.length < 1000) break;
  }
  const stale = old.filter((r) => !keep.has(r.content_hash)).map((r) => r.id);
  for (let i = 0; i < stale.length; i += 100) {
    await write(`kira_answers?id=in.(${stale.slice(i, i + 100).join(',')})`, 'PATCH', { status: 'retired', updated_at: now }, { Prefer: 'return=minimal' });
  }
  return { upserted: rows.length, retired: stale.length };
}
