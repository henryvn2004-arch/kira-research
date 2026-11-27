// ============================================================
// KIRA RESEARCH — api/_lib/org-ld.js
// The one Organization JSON-LD for kiraresearch.com. Server-rendered pages put it in the HTML
// (crawlers that do not run JavaScript read it); the static pages (home, about, methodology in
// 4 languages) get the same text from `node scripts/sync-org-ld.mjs`. public/js/nav.js no longer
// builds one.
//
// sameAs: only real profile URLs, one per line. Empty today: no profile URL is on record yet, so
// the property is left out (never guessed). Add them here, run the sync script, commit.
// No parentOrganization / subOrganization, no legal entity, no address: the legal relation with
// BizDirect Asia is not settled (owner decision 2026-11-27).
// ============================================================
const BASE = 'https://kiraresearch.com';

export const SAME_AS = [
  // 'https://www.linkedin.com/company/…',
  // 'https://www.wikidata.org/wiki/Q…',
];

const DESCRIPTION = {
  en: 'Research on the markets, sectors and entry routes of Southeast Asia, Japan, South Korea, Taiwan, Australia and New Zealand, with a source on every figure. Executive summaries are free to read.',
  ja: '東南アジア、日本、韓国、台湾、オーストラリア、ニュージーランドの市場、業界、参入経路に関するリサーチ。すべての数値に出典を付しています。エグゼクティブサマリーは無料で閲覧できます。',
  ko: '동남아시아, 일본, 한국, 대만, 호주, 뉴질랜드의 시장·산업·진출 경로에 관한 리서치입니다. 모든 수치에 출처를 명기하며, 핵심 요약은 무료로 열람할 수 있습니다.',
  zh: '研究东南亚、日本、韩国、中国台湾、澳大利亚与新西兰的市场、行业及进入路径，每项数据均注明来源。执行摘要免费阅读。',
};

export function orgLd(loc = 'en') {
  const o = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE}/#organization`,
    name: 'KIRA Research',
    url: `${BASE}/`,
    logo: `${BASE}/logo.png`,
    description: DESCRIPTION[loc] || DESCRIPTION.en,
  };
  if (SAME_AS.length) o.sameAs = [...SAME_AS];
  return o;
}

// <script> tag, id "ld-organization" (the smoke test and nav.js look for this id). "<" is escaped.
export function orgLdTag(loc = 'en') {
  return `<script type="application/ld+json" id="ld-organization">${JSON.stringify(orgLd(loc)).replace(/</g, '\\u003c')}</script>`;
}
