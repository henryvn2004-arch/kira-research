// Kira Data (D4): rules that turn a headline or a filing title into a company move.
// classify(title, { lang, investor }) → { investor_country, host_country, type, value_usd } or null.
// No model: country names, demonyms and verbs only. A news item still needs the owner's review (status draft).

// One entry per country we can name: our 15 markets (possible hosts) plus the usual home countries of investors.
const COUNTRIES = {
  VN: { name: ['vietnam', 'viet nam'], dem: ['vietnamese'], ko: ['베트남'], ja: ['ベトナム'] },
  TH: { name: ['thailand'], dem: ['thai'], ko: ['태국'], ja: ['タイ王国', 'タイ国', 'タイの', 'タイに', 'タイで', 'タイ・'] },
  ID: { name: ['indonesia'], dem: ['indonesian'], ko: ['인도네시아'], ja: ['インドネシア'] },
  MY: { name: ['malaysia'], dem: ['malaysian'], ko: ['말레이시아'], ja: ['マレーシア'] },
  PH: { name: ['philippines'], dem: ['philippine', 'filipino'], ko: ['필리핀'], ja: ['フィリピン'] },
  SG: { name: ['singapore'], dem: ['singaporean', 'singapore-based'], ko: ['싱가포르'], ja: ['シンガポール'] },
  TW: { name: ['taiwan'], dem: ['taiwanese'], ko: ['대만'], ja: ['台湾'] },
  AU: { name: ['australia'], dem: ['australian'], ko: ['호주'], ja: ['オーストラリア', '豪州'] },
  NZ: { name: ['new zealand'], dem: ['new zealand-based', 'kiwi'], ko: ['뉴질랜드'], ja: ['ニュージーランド'] },
  KH: { name: ['cambodia'], dem: ['cambodian'], ko: ['캄보디아'], ja: ['カンボジア'] },
  LA: { name: ['laos', 'lao pdr'], dem: ['lao', 'laotian'], ko: ['라오스'], ja: ['ラオス'] },
  MM: { name: ['myanmar', 'burma'], dem: ['myanmar-based', 'burmese'], ko: ['미얀마'], ja: ['ミャンマー'] },
  BN: { name: ['brunei'], dem: ['bruneian'], ko: ['브루나이'], ja: ['ブルネイ'] },
  JP: { name: ['japan'], dem: ['japanese'], ko: ['일본'], ja: [] },
  KR: { name: ['south korea', 'korea'], dem: ['korean', 'south korean'], ko: [], ja: ['韓国'] },
  CN: { name: ['china'], dem: ['chinese'], ko: [], ja: [] },
  HK: { name: ['hong kong'], dem: ['hong kong-based'], ko: [], ja: [] },
  US: { name: ['united states', 'u.s.', 'usa'], dem: ['american', 'us-based', 'u.s.-based'], ko: [], ja: [] },
  IN: { name: ['india'], dem: ['indian'], ko: [], ja: [] },
  DE: { name: ['germany'], dem: ['german'], ko: [], ja: [] },
  FR: { name: ['france'], dem: ['french'], ko: [], ja: [] },
  GB: { name: ['britain', 'united kingdom', 'uk'], dem: ['british', 'uk-based'], ko: [], ja: [] }
};
export const HOSTS = ['VN', 'TH', 'ID', 'MY', 'PH', 'SG', 'TW', 'AU', 'NZ', 'KH', 'LA', 'MM', 'BN', 'JP', 'KR'];
export const HOST_NAME = { VN: 'Vietnam', TH: 'Thailand', ID: 'Indonesia', MY: 'Malaysia', PH: 'Philippines', SG: 'Singapore', TW: 'Taiwan',
  AU: 'Australia', NZ: 'New Zealand', KH: 'Cambodia', LA: 'Laos', MM: 'Myanmar', BN: 'Brunei', JP: 'Japan', KR: 'South Korea' };

// First match wins, so the most specific type comes first.
const TYPES = {
  en: [
    ['exit', /\b(divest\w*|exits?|exiting|sells? (its |a )?(entire |whole )?stake|pulls? out|withdraws? from)\b/],
    ['jv', /\b(joint venture|jv)\b/],
    ['acquisition', /\b(acquir\w*|acquisitions?|takeover|take over|buyout|buys?|bought|merger|merges?)\b/],
    ['stake', /\bstakes?\b/],
    ['plant', /\b(factory|factories|plants?|manufacturing (facility|base|site|hub)|production (base|line|facility))\b/],
    ['subsidiary', /\b(subsidiar\w*|sets? up|establish\w*|opens? (an? |its )?(office|branch|store|hub|headquarters)|enters?|entry into|launch\w* in)\b/],
    ['expansion', /\bexpan\w*\b/],
    ['investment', /\b(invest\w*|injection|injects?|pours?|commits? .{0,20}(million|billion))\b/]
  ],
  ko: [['acquisition', /취득|양수|인수/], ['plant', /신규시설투자|공장/], ['subsidiary', /현지법인|법인 설립|자회사/], ['investment', /출자|투자/]],
  ja: [['acquisition', /取得|買収/], ['jv', /合弁/], ['plant', /工場/], ['subsidiary', /子会社|設立/], ['investment', /出資|投資/]]
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w) => new RegExp(`(^|[^a-z0-9])${esc(w)}(?=$|[^a-z0-9])`, 'g');

function mentions(text) {
  const out = [];
  for (const [code, c] of Object.entries(COUNTRIES)) {
    for (const [kind, words] of [['dem', c.dem], ['name', c.name]]) {
      for (const w of words) {
        for (const m of text.matchAll(wordRe(w))) {
          const at = m.index + m[1].length;
          const after = text.slice(at + w.length, at + w.length + 3);
          // "Japan's", "Japan-based" act like a demonym (the company's home)
          out.push({ code, at, len: w.length, kind: kind === 'name' && /^('s|’s|-ba)/.test(after) ? 'dem' : kind });
        }
      }
    }
  }
  // drop matches inside longer ones ("korea" inside "south korea")
  return out.filter((m) => !out.some((o) => o !== m && o.len > m.len && o.at <= m.at && o.at + o.len >= m.at + m.len)).sort((a, b) => a.at - b.at);
}

function valueUsd(text) {
  const m = /(?:us\$|\$|usd\s?)\s?([\d.,]+)\s?(billion|bn|b|million|mn|m)\b/i.exec(text);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return n * (/^b/i.test(m[2]) ? 1e9 : 1e6);
}

export function classify(title, { lang = 'en', investor = null } = {}) {
  const text = String(title || '');
  const types = TYPES[lang] || TYPES.en;
  const low = lang === 'en' ? text.toLowerCase() : text;
  const type = (types.find(([, re]) => re.test(low)) || [])[0];
  if (!type) return null;

  if (lang !== 'en') {
    const hosts = HOSTS.filter((h) => (COUNTRIES[h][lang] || []).some((w) => text.includes(w)) && h !== investor);
    return hosts.length === 1 ? { investor_country: investor, host_country: hosts[0], type, value_usd: null } : null;
  }

  const ms = mentions(low);
  if (!ms.length) return null;
  // Investor: the given one (filings), else the first demonym / possessive, else a name that opens the headline.
  // It may stay unknown (a European brand opening a plant): the owner fills it on review.
  let inv = investor;
  if (!inv) {
    const d = ms.find((m) => m.kind === 'dem') || (ms[0].at === 0 ? ms[0] : null);
    inv = d ? d.code : null;
  }
  // Host: one of our 15 markets, not the investor; prefer a name after in/into/to/for/at.
  const cands = ms.filter((m) => HOSTS.includes(m.code) && m.code !== inv);
  const prep = cands.find((m) => /\b(in|into|to|for|at|across)\s+(the\s+)?$/.test(low.slice(Math.max(0, m.at - 12), m.at)));
  const host = (prep || cands.find((m) => m.kind === 'name') || cands[0] || {}).code;
  if (!host) return null;
  return { investor_country: inv, host_country: host, type, value_usd: valueUsd(text) };
}

// Words that identify a story, for dedupe across outlets: no country words, no stop words.
const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'its', 'has', 'have', 'will', 'plans', 'plan', 'says', 'said', 'over', 'after', 'amid', 'than', 'more', 'new', 'firm', 'company', 'group', 'million', 'billion']);
export function storyWords(title) {
  const countryWords = new Set(Object.values(COUNTRIES).flatMap((c) => [...c.name, ...c.dem]).flatMap((w) => w.split(/\s+/)));
  return new Set(String(title || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w) && !countryWords.has(w)));
}
export function sameStory(a, b) {
  const A = storyWords(a), B = storyWords(b);
  if (!A.size || !B.size) return false;
  let both = 0;
  for (const w of A) if (B.has(w)) both++;
  return both >= 3 || both / Math.min(A.size, B.size) >= 0.5;
}
