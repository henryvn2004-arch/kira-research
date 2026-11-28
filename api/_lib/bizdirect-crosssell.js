// ============================================================
// KIRA RESEARCH — api/_lib/bizdirect-crosssell.js
// W6 cross-sell towards the sister site BizDirect Asia. Two small pieces, both silent when BizDirect has no list:
//   • mapCtaHtml(rows, loc)        one line next to the buy button of a market map (links with UTM crosssell_map)
//   • emailCrosssell(country, segment, loc)  { url, label } last line of the "report ready" and purchase emails (UTM crosssell_email)
// The plain content links of W1 (bizdirect-lists.js) stay without UTM; only these two carry it.
// ============================================================
import { getBizdirectLists, isBdUrl } from './bizdirect-lists.js';
import { sb } from './geo.js';

export function withUtm(url, campaign) {
  if (!isBdUrl(url)) return null;
  const u = new URL(url);
  u.searchParams.set('utm_source', 'kira');
  u.searchParams.set('utm_medium', 'referral');
  u.searchParams.set('utm_campaign', campaign);
  return u.toString();
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CTA = {
  en: 'Need contacts, filters and updates? Open the live list on BizDirect Asia →',
  ja: '連絡先・絞り込み・更新が必要ですか？BizDirect Asia でライブリストを開く →',
  ko: '연락처, 필터, 업데이트가 필요하신가요? BizDirect Asia에서 실시간 목록 열기 →',
  zh: '需要联系方式、筛选和更新？在BizDirect Asia打开实时名录 →',
};
const MAIL = {
  en: (n) => `Companies in this market: ${n} on BizDirect Asia →`,
  ja: (n) => `この市場の企業数：BizDirect Asia に${n}社 →`,
  ko: (n) => `이 시장의 기업: BizDirect Asia에 ${n}개 →`,
  zh: (n) => `该市场的企业：BizDirect Asia 共${n}家 →`,
};
const NF = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

// rows = result of getBizdirectLists (largest first). '' when there is none.
export function mapCtaHtml(rows, loc = 'en') {
  const first = rows && rows[0], href = first && withUtm(first.url, 'crosssell_map');
  if (!href) return '';
  return `<div class="sub bd-cta" style="margin-top:10px"><a href="${esc(href)}" rel="noopener">${esc(CTA[loc] || CTA.en)}</a></div>`;
}

// Pure: rows -> { url, label } or null (needs a list and its company count).
export function emailLine(rows, loc = 'en') {
  const first = rows && rows[0], href = first && withUtm(first.url, 'crosssell_email');
  const n = first && Number(first.n);
  if (!href || !Number.isFinite(n) || n <= 0) return null;
  const l = MAIL[loc] ? loc : 'en';
  return { url: href, label: MAIL[l](n.toLocaleString(NF[l])) };
}

export async function emailCrosssell(country, segment, loc = 'en', deps = {}) {
  if (!country || !segment) return null;
  try { return emailLine(await (deps.getLists || getBizdirectLists)(country, segment), loc); } catch (_e) { return null; }
}

// Purchase receipts: look the join key up by slug (report / transcript: migration 077 columns; list: the map's own country + segment_key).
// Any error = null, the receipt is unchanged.
export async function emailCrosssellForSlug(kind, slug, loc = 'en', deps = {}) {
  if (!/^[a-z0-9][a-z0-9-]{0,200}$/.test(String(slug || ''))) return null;
  try {
    const q = deps.sb || sb;
    const rows = kind === 'list'
      ? await q(`market_maps?slug=eq.${encodeURIComponent(slug)}&select=country,segment_key&limit=1`)
      : await q(`${kind === 'transcript' ? 'expert_transcripts' : 'living_reports'}?slug=eq.${encodeURIComponent(slug)}&select=market_map_country,market_map_segment&limit=1`);
    const r = rows && rows[0];
    if (!r) return null;
    return await emailCrosssell(r.country || r.market_map_country, r.segment_key || r.market_map_segment, loc, deps);
  } catch (_e) { return null; }
}
