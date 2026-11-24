// ============================================================
// KIRA RESEARCH — api/_lib/listing.js
// Plain list of links (title + link, newest first) put into the raw HTML of the three listing pages
// (library, insights, expert transcripts), so crawlers that do not run JavaScript can follow them to
// the items. The page script replaces the container content when it runs, as before.
// ============================================================
import { BASE, LOCALES, esc } from './ssr.js';

export const LIMIT = 50;

const L10N = {
  library: { en: 'Latest reports', ja: '最新のレポート', ko: '최신 보고서', zh: '最新报告', path: 'reports', all: 'library' },
  insights: { en: 'Latest insights', ja: '最新のインサイト', ko: '최신 인사이트', zh: '最新洞察', path: 'insights', all: 'insights/' },
  transcripts: { en: 'Latest expert interview transcripts', ja: '最新のインタビュー記録', ko: '최신 인터뷰 기록', zh: '最新访谈记录', path: 'experts/transcripts', all: 'experts/transcripts/' },
};
export const TYPES = Object.keys(L10N);
export const CONTAINER = { library: 'lib-app', insights: 'ins-app', transcripts: 'xt-app' };

// items: [{ slug, title, locale?, blurb? }]
export function listHtml(type, loc, items) {
  const cfg = L10N[type];
  if (!cfg || !items.length) return '';
  const lis = items.slice(0, LIMIT).map((it) => {
    const l = LOCALES.includes(it.locale) ? it.locale : loc;
    return `<li><a href="/${l}/${cfg.path}/${esc(it.slug)}">${esc(it.title)}</a></li>`;
  }).join('');
  return '<style>.seo-list{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}</style>' +
    '<noscript><style>.seo-list{position:static;width:auto;height:auto;overflow:visible;clip:auto;white-space:normal}</style></noscript>' +
    `<nav class="seo-list" aria-label="${esc(cfg[loc] || cfg.en)}"><h2>${esc(cfg[loc] || cfg.en)}</h2><ul>${lis}</ul></nav>`;
}

// Put the list as the first child of the page container (<main id="lib-app">).
export function injectList(html, type, listMarkup) {
  if (!listMarkup) return html;
  const re = new RegExp(`(<main\\b[^>]*\\bid="${CONTAINER[type]}"[^>]*>)`);
  return re.test(html) ? html.replace(re, (m) => m + listMarkup) : html;
}

export const pageUrl = (type, loc) => `${BASE}/${loc}/${L10N[type].all}`;

// Newest first, title in the page language else English. sb(path) → rows (injected for tests).
export async function listItems(sb, type, loc) {
  const langs = loc === 'en' ? 'en' : `${loc},en`;
  const pick = (trs, key, id) => {
    const mine = trs.filter((t) => t[key] === id);
    return mine.find((t) => t.locale === loc) || mine.find((t) => t.locale === 'en');
  };
  if (type === 'library') {
    const bases = await sb(`living_reports?status=eq.published&order=published_at.desc.nullslast&limit=${LIMIT}&select=id,slug`);
    if (!bases.length) return [];
    const trs = await sb(`report_translations?report_id=in.(${bases.map((b) => b.id).join(',')})&status=eq.published&locale=in.(${langs})&select=report_id,locale,title`);
    return bases.map((b) => { const t = pick(trs, 'report_id', b.id); return t && t.title ? { slug: b.slug, title: t.title, locale: t.locale } : null; }).filter(Boolean);
  }
  if (type === 'insights') {
    const bases = await sb(`insights?status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&order=published_at.desc&limit=${LIMIT}&select=id,slug`);
    if (!bases.length) return [];
    const trs = await sb(`insight_translations?insight_id=in.(${bases.map((b) => b.id).join(',')})&status=eq.published&locale=in.(${langs})&select=insight_id,locale,title`);
    return bases.map((b) => { const t = pick(trs, 'insight_id', b.id); return t && t.title ? { slug: b.slug, title: t.title, locale: t.locale } : null; }).filter(Boolean);
  }
  const bases = await sb(`expert_transcripts?status=eq.published&order=published_at.desc&limit=${LIMIT}&select=id,slug`);
  if (!bases.length) return [];
  const trs = await sb(`expert_transcript_translations?transcript_id=in.(${bases.map((b) => b.id).join(',')})&status=eq.published&locale=in.(${langs})&select=transcript_id,locale,title`);
  return bases.map((b) => { const t = pick(trs, 'transcript_id', b.id); return t && t.title ? { slug: b.slug, title: t.title, locale: t.locale } : null; }).filter(Boolean);
}
