// ============================================================
// KIRA RESEARCH — api/_lib/cite.js
// "Cite this page" for the server-rendered pages (markets hubs, market maps): the citation string
//   KIRA Research, <page title>, <Month YYYY>, <canonical URL>
// and the box that shows it (same classes as the report page's cite box: .rd-box, .rd-cite, .rd-share).
// The copy button is wired by /js/cite-copy.js (loaded by the page template).
// ============================================================
import { esc } from './ssr.js';

const NUM_LOCALE = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

// "November 2026" (ja 2026年11月, ko 2026년 11월, zh 2026年11月) from an ISO date or Date; today when missing or invalid.
export function monthYear(d, loc = 'en') {
  let t = d ? new Date(d) : new Date();
  if (Number.isNaN(t.getTime())) t = new Date();
  try { return new Intl.DateTimeFormat(NUM_LOCALE[loc] || 'en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' }).format(t); } catch (_e) { return String(t.getUTCFullYear()); }
}

export const citationText = (title, d, url, loc = 'en') => `KIRA Research, ${title}, ${monthYear(d, loc)}, ${url}`;

// o: { heading, copy, copied, citation }
export const citeBlock = (o) =>
  `<div class="rd-box kira-cite"><h3>${esc(o.heading)}</h3><p class="rd-cite">${esc(o.citation)}</p>` +
  `<div class="rd-share"><button type="button" data-cite-copy="${esc(o.citation)}" data-copied="${esc(o.copied)}">${esc(o.copy)}</button></div></div>`;
