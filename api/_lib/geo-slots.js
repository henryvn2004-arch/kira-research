// ============================================================
// KIRA RESEARCH — api/_lib/geo-slots.js
// The two blocks api/ssr.js adds outside the page root:
//   keyQuestionsHtml(reportSlug, loc)    report page → that report's answers (<= 15) + link to its segment hub
//   keyPointsHtml(transcriptSlug, loc)   transcript  → that transcript's practitioner claims, each with its basis_label
// In ja/ko/zh the translated rows are used when there are any; otherwise the English rows, marked lang="en".
// Both return '' when there is nothing to show (the slot stays empty; the page is unchanged).
// ============================================================
import { esc } from './ssr.js';
import {
  answersForDoc, answersForHub, docTitles, claimsForTranscript, countryByCode, segmentName, slugOf,
  industrySlug, topicSlug, tradeIndex, tradeTopicIndexable, MIN_ANSWERS, ansLoc, claimLoc, sb,
} from './geo.js';
import { answerBlock, claimItem } from './geo-html.js';
import { T, countryName } from './geo-i18n.js';

const CSS = '<style>.geo-slot{padding-block:8px 48px;max-width:860px}.geo-slot h2{font-size:22px;margin:32px 0 12px}.geo-slot h3{font-size:17px;line-height:1.35;margin:20px 0 6px}.geo-slot p{margin:0 0 6px;line-height:1.6}.geo-slot .geo-src,.geo-slot .geo-basis{color:var(--muted);font-size:13px}.geo-slot .geo-basis{display:block}.geo-slot .geo-claims{list-style:none;padding:0}.geo-slot .geo-claims li{margin:0 0 14px;line-height:1.6}</style>';

// Language of the block: the page's own when its rows are translated, else English.
const pickLang = (loc, items, fn) => {
  const tr = loc === 'en' ? items : items.map((x) => fn(x, loc)).filter(Boolean);
  return tr.length ? { vl: loc, rows: tr } : { vl: 'en', rows: items };
};

export async function keyQuestionsHtml(slug, loc = 'en') {
  const answers = await answersForDoc(slug, 15);
  if (!answers.length) return '';
  const { vl, rows } = pickLang(loc, answers, ansLoc);
  const L = T[vl];
  const titles = await docTitles([slug], vl);
  const body = rows.map((a) => answerBlock(a, titles, L, vl)).join('');

  // "More on <segment> in <country>": only for a hub with enough answers in that language.
  let more = '';
  const seg = answers.find((a) => a.segment_key);
  if (seg) {
    const [hub, co] = await Promise.all([answersForHub(seg.country_code, seg.segment_key), countryByCode(seg.country_code)]);
    const n = (l) => hub.filter((a) => ansLoc(a, l)).length;
    const hl = n(vl) >= MIN_ANSWERS ? vl : (n('en') >= MIN_ANSWERS ? 'en' : null);
    if (co && hl) {
      more = `<p><a href="/${hl}/markets/${slugOf(co.name)}/${esc(seg.segment_key)}">${esc(T[hl].moreSeg(await segmentName(seg.segment_key), countryName(co, hl)))}</a></p>`;
    }
  }
  return `${CSS}<div class="r-container geo-slot" lang="${vl === 'zh' ? 'zh-Hans' : vl}"><h2>${esc(L.keyQuestions)}</h2>${body}${more}</div>`;
}

export async function keyPointsHtml(slug, loc = 'en') {
  const claims = await claimsForTranscript(slug);
  if (!claims.length) return '';
  const { vl, rows } = pickLang(loc, claims, claimLoc);
  const L = T[vl];
  const titles = { transcripts: new Map(), reports: new Map() };   // already on this transcript's page: no self-link
  const items = rows.map((c) => claimItem(c, titles, vl, false)).join('');

  // Links to the market hub (answers sourced from this transcript) and to the trade pages that are indexable.
  const links = [];
  const [seg] = await sb(`kira_answers?status=eq.published&source_ref->>slug=eq.${encodeURIComponent(slug)}&segment_key=not.is.null&select=country_code,segment_key&limit=1`);
  if (seg) {
    const [hub, co] = await Promise.all([answersForHub(seg.country_code, seg.segment_key), countryByCode(seg.country_code)]);
    const n = (l) => hub.filter((a) => ansLoc(a, l)).length;
    const hl = n(vl) >= MIN_ANSWERS ? vl : (n('en') >= MIN_ANSWERS ? 'en' : null);
    if (co && hl) links.push(`<a href="/${hl}/markets/${slugOf(co.name)}/${esc(seg.segment_key)}">${esc(T[hl].moreSeg(await segmentName(seg.segment_key), countryName(co, hl)))}</a>`);
  }
  const tl = async (l) => (await tradeIndex(l)).idx;
  const seen = new Set();
  for (const c of claims) {
    const is = industrySlug(c.industry);
    const key = `${is}|${c.topic}`;
    if (seen.has(key)) continue;
    for (const l of vl === 'en' ? ['en'] : [vl, 'en']) {
      const ind = (await tl(l)).get(is);
      const list = ind && ind.topics.get(c.topic);
      if (list && tradeTopicIndexable(list, c.topic)) {
        seen.add(key);
        links.push(`<a href="/${l}/trade/${esc(is)}/${topicSlug(c.topic)}">${esc(T[l].acrossAsia(ind.name, T[l].topics[c.topic] || c.topic))}</a>`);
        break;
      }
    }
  }
  return `${CSS}<div class="r-container geo-slot" lang="${vl === 'zh' ? 'zh-Hans' : vl}"><h2>${esc(L.keyPoints)}</h2><ul class="geo-claims">${items}</ul>` +
    (links.length ? `<p class="geo-src">${links.slice(0, 5).join(' · ')}</p>` : '') + '</div>';
}
