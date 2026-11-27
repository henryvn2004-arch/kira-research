// ============================================================
// KIRA RESEARCH — api/_lib/bizdirect-cite.js
// One citable sentence for a report / transcript that has a market-map key (migration 077):
//   "BizDirect Asia's company database lists 1,234 coffee companies in Vietnam (November 2026)."  + link to the KIRA market map.
// Number = market_maps.n_companies, date = market_maps.built_at (month + year), names as the market-map page uses them.
// Nothing is shown unless the map is published and indexable (same gate as the page) and has a number. One DB read per
// (country, segment), kept 30 minutes in memory like the other slots; any error = '' (the slot is unchanged).
// ============================================================
import { sb } from './geo.js';
import { isIndexable } from './market-map/gate.js';
import { nfLoc, countryLabel, monthYear } from './market-map/i18n.js';
export { monthYear };

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const TTL = 30 * 60 * 1000;
const MAX = 2000;
const cache = new Map();
export const BD_URL = 'https://bizdirectasia.com/';
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');


// Fixed wording, 4 languages. bd / map are the already-built link anchors (HTML) so the sentence stays one string.
const S = {
  en: { sent: (bd, n, seg, cn, dt) => `${bd}'s company database lists ${n} ${seg} companies in ${cn} (${dt}).`, mapText: 'KIRA market map for this segment' },
  ja: { sent: (bd, n, seg, cn, dt) => `${bd}の企業データベースには、${cn}の${seg}企業が${n}社掲載されています(${dt}時点)。`, mapText: 'このセグメントのKIRAマーケットマップ' },
  ko: { sent: (bd, n, seg, cn, dt) => `${bd}의 기업 데이터베이스에는 ${cn}의 ${seg} 기업 ${n}개가 등재되어 있습니다(${dt} 기준).`, mapText: '이 세그먼트의 KIRA 마켓 맵' },
  zh: { sent: (bd, n, seg, cn, dt) => `${bd}企业数据库收录了${cn}${seg}企业${n}家（截至${dt}）。`, mapText: '该细分市场的KIRA市场地图' },
};

// Pure. facts = { n, built, segment, country, slug }; returns { text, html } or null when a piece is missing.
// text = plain sentence (used in prompts / tests); html = sentence with the BizDirect Asia link + the map link.
export function citeSentence(facts, loc = 'en') {
  if (!facts) return null;
  const n = Number(facts.n), dt = monthYear(facts.built, loc);
  const seg = String(facts.segment || '').trim(), cn = String(facts.country || '').trim();
  if (!Number.isFinite(n) || n <= 0 || !dt || !seg || !cn) return null;
  const t = S[loc] || S.en, l = S[loc] ? loc : 'en';
  const segT = l === 'en' ? seg.toLowerCase() : seg;
  const nf = nfLoc(n, l);
  const text = t.sent('BizDirect Asia', nf, segT, cn, dt);
  const bd = `<a href="${BD_URL}">BizDirect Asia</a>`;
  let html = t.sent(bd, esc(nf), esc(segT), esc(cn), esc(dt));
  // the pure sentence is built from escaped parts; the two anchors are ours
  if (facts.slug && SLUG.test(facts.slug)) html += ` <a href="/${l}/market-maps/${esc(facts.slug)}">${esc(t.mapText)}</a>`;
  return { text, html, lang: l };
}

// Facts of one published, indexable market map, in the page language. null when none / not indexable / no number.
export async function getMapFacts(country, segment, loc = 'en') {
  if (!SLUG.test(String(country || '')) || !SLUG.test(String(segment || ''))) return null;
  const key = `${country}/${segment}`;
  let hit = cache.get(key);
  if (!hit || hit.exp < Date.now()) {
    let val = null;
    try {
      const [rows, names] = await Promise.all([
        sb(`market_maps?country=eq.${encodeURIComponent(country)}&segment_key=eq.${encodeURIComponent(segment)}&status=eq.published&select=slug,n_companies,built_at,indexable,seg:stats->>segment,cn:stats->>country,stages:stats->stages&limit=1`),
        sb(`market_map_names?kind=eq.segment&key=eq.${encodeURIComponent(segment)}&select=lang,name`),
      ]);
      const r = rows && rows[0];
      if (r && r.indexable === true && Number(r.n_companies) > 0 && isIndexable({ companies: r.n_companies, stages: r.stages })) {
        val = { slug: r.slug, country: country, n: Number(r.n_companies), built: r.built_at, seg: r.seg, cn: r.cn,
          names: Object.fromEntries((names || []).filter((x) => x && x.name).map((x) => [x.lang, String(x.name)])) };
      }
    } catch (_e) { val = null; }
    if (cache.size >= MAX) cache.clear();
    hit = { val, exp: Date.now() + TTL };
    cache.set(key, hit);
  }
  const v = hit.val;
  if (!v || !v.seg || !v.cn) return null;
  return { slug: v.slug, n: v.n, built: v.built, segment: loc === 'en' ? v.seg : (v.names[loc] || v.seg), country: countryLabel(v.country, v.cn, loc) };
}
export const _clearCache = () => cache.clear();

// The sentence for a join key, in the page language ('' when nothing to say). Falls back to the English segment name when a
// language has no translated title (the number, date and sources are the same).
export async function citeHtml(country, segment, loc = 'en') {
  const f = await getMapFacts(country, segment, loc);
  const s = citeSentence(f, loc);
  return s ? `<p class="bd-cite" lang="${s.lang === 'zh' ? 'zh-Hans' : s.lang}">${s.html}</p>` : '';
}
