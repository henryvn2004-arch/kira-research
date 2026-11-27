// ============================================================
// KIRA RESEARCH — api/_lib/bizdirect-lists.js
// Company lists of the sister site BizDirect Asia for one (country, segment). Contract:
//   GET https://bizdirectasia.com/api/public/kira-segment-lists?country=<slug>&segment=<market_maps.segment_key>&limit=3
//   -> { country, segment, source, lists: [{ url, title, term_slug, role, n }] }   (largest n first; [] when none)
// Never lets the page get slow or fail because of the partner: 1.5 s timeout, any error / bad shape = [] , result cached in memory
// (an answer 30 min, a failure 5 min so a down partner is not hit on every page). Only https://bizdirectasia.com/ links are kept.
// ============================================================
const API = 'https://bizdirectasia.com/api/public/kira-segment-lists';
const TIMEOUT_MS = 1500;
const OK_TTL = 30 * 60 * 1000;
const ERR_TTL = 5 * 60 * 1000;
const MAX_CACHE = 2000;
const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;
const cache = new Map();

export const isBdUrl = (u) => /^https:\/\/(www\.)?bizdirectasia\.com\/[^\s"'<>]*$/.test(String(u || ''));

// Pure: raw API JSON -> clean rows (max 3). Bad rows are dropped, not repaired.
export function parseLists(json) {
  const raw = json && Array.isArray(json.lists) ? json.lists : [];
  const out = [];
  for (const x of raw) {
    if (!x || !isBdUrl(x.url)) continue;
    const title = String(x.title == null ? '' : x.title).replace(/\s+/g, ' ').trim().slice(0, 160);
    const n = Number(x.n);
    if (!title) continue;
    out.push({ url: x.url, title, role: x.role ? String(x.role).slice(0, 40) : '', n: Number.isFinite(n) && n > 0 ? Math.round(n) : 0 });
  }
  return out.sort((a, b) => b.n - a.n).slice(0, 3);
}

export async function getBizdirectLists(country, segment, { fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (!SLUG.test(String(country || '')) || !SLUG.test(String(segment || ''))) return [];
  const key = `${country}/${segment}`;
  const hit = cache.get(key);
  if (hit && hit.exp > now()) return hit.rows;
  let rows = [], ttl = ERR_TTL;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const r = await fetchImpl(`${API}?country=${encodeURIComponent(country)}&segment=${encodeURIComponent(segment)}&limit=3`, { signal: ctl.signal, headers: { Accept: 'application/json' } });
      if (r.ok) { rows = parseLists(await r.json()); ttl = OK_TTL; }
    } finally { clearTimeout(timer); }
  } catch (_e) { rows = []; }
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, { rows, exp: now() + ttl });
  return rows;
}
export const _clearCache = () => cache.clear();

// Fixed wording of the block, 4 languages. Same research-house voice as the rest of the page.
const TXT = {
  en: { h: 'See the full lists on BizDirect Asia', n: (n) => `${n.toLocaleString('en-US')} companies`, sub: 'Company lists for this market from our sister company.' },
  ja: { h: 'BizDirect Asia で企業リストを見る', n: (n) => `${n.toLocaleString('ja-JP')} 社`, sub: '姉妹会社が提供する、この市場の企業リストです。' },
  ko: { h: 'BizDirect Asia에서 전체 목록 보기', n: (n) => `${n.toLocaleString('ko-KR')}개 기업`, sub: '자매 회사가 제공하는 이 시장의 기업 목록입니다.' },
  zh: { h: '在BizDirect Asia查看完整名录', n: (n) => `${n.toLocaleString('zh-CN')} 家企业`, sub: '由姊妹公司提供的该市场企业名录。' },
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Heading + up to 3 plain follow links (no UTM). '' when there is nothing to show. headingTag: 'h2' (default) or 'h3'.
export function listsBlockHtml(rows, loc = 'en', cls = 'bd-lists', citeHtml = '') {
  if (!rows || !rows.length) return '';
  const t = TXT[loc] || TXT.en;
  const items = rows.map((r) => `<li><a href="${esc(r.url)}">${esc(r.title)}</a>${r.n ? ` <span class="bd-n">· ${esc(t.n(r.n))}</span>` : ''}</li>`).join('');
  return `<section class="${cls}"><h2>${esc(t.h)}</h2><p class="bd-sub">${esc(t.sub)}</p>${citeHtml}<ul>${items}</ul></section>`;
}
