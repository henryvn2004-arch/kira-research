// ============================================================
// KIRA RESEARCH — api/_lib/geo-slots.js
// The two blocks api/ssr.js adds outside the page root:
//   keyQuestionsHtml(reportSlug)   report page  → that report's answers (<= 15) + link to its segment hub
//   keyPointsHtml(transcriptSlug)  transcript   → that transcript's practitioner claims, each with its basis_label
// Both return '' when there is nothing to show (the slot stays empty; the page is unchanged).
// ============================================================
import { esc } from './ssr.js';
import {
  answersForDoc, answersForHub, docTitles, claimsForTranscript, countryByCode, segmentName, slugOf,
  industrySlug, topicSlug, TOPIC_LABEL, tradeIndex, tradeTopicIndexable, MIN_ANSWERS, sb,
} from './geo.js';
import { answerBlock, claimItem } from './geo-html.js';

const CSS = '<style>.geo-slot{padding-block:8px 48px;max-width:860px}.geo-slot h2{font-size:22px;margin:32px 0 12px}.geo-slot h3{font-size:17px;line-height:1.35;margin:20px 0 6px}.geo-slot p{margin:0 0 6px;line-height:1.6}.geo-slot .geo-src,.geo-slot .geo-basis{color:var(--muted);font-size:13px}.geo-slot .geo-basis{display:block}.geo-slot .geo-claims{list-style:none;padding:0}.geo-slot .geo-claims li{margin:0 0 14px;line-height:1.6}</style>';

export async function keyQuestionsHtml(slug) {
  const answers = await answersForDoc(slug, 15);
  if (!answers.length) return '';
  const titles = await docTitles([slug]);
  const body = answers.map((a) => answerBlock(a, titles)).join('');

  // "More on <segment> in <country>": only for a hub that is dense enough to be indexed.
  let more = '';
  const seg = answers.find((a) => a.segment_key);
  if (seg) {
    const [hub, co] = await Promise.all([answersForHub(seg.country_code, seg.segment_key), countryByCode(seg.country_code)]);
    if (co && hub.length >= MIN_ANSWERS) {
      const name = await segmentName(seg.segment_key);
      more = `<p><a href="/en/markets/${slugOf(co.name)}/${esc(seg.segment_key)}">More on ${esc(name)} in ${esc(co.name)}</a></p>`;
    }
  }
  return `${CSS}<div class="r-container geo-slot" lang="en"><h2>Key questions</h2>${body}${more}</div>`;
}

export async function keyPointsHtml(slug) {
  const claims = await claimsForTranscript(slug);
  if (!claims.length) return '';
  const titles = { transcripts: new Map(), reports: new Map() };   // already on this transcript's page: no self-link
  const items = claims.map((c) => claimItem(c, titles, false)).join('');

  // Links to the market hub (answers sourced from this transcript) and to the trade pages that are indexable.
  const links = [];
  const [seg] = await sb(`kira_answers?status=eq.published&source_ref->>slug=eq.${encodeURIComponent(slug)}&segment_key=not.is.null&select=country_code,segment_key&limit=1`);
  if (seg) {
    const [hub, co] = await Promise.all([answersForHub(seg.country_code, seg.segment_key), countryByCode(seg.country_code)]);
    if (co && hub.length >= MIN_ANSWERS) links.push(`<a href="/en/markets/${slugOf(co.name)}/${esc(seg.segment_key)}">More on ${esc(await segmentName(seg.segment_key))} in ${esc(co.name)}</a>`);
  }
  const { idx } = await tradeIndex();
  const seen = new Set();
  for (const c of claims) {
    const is = industrySlug(c.industry);
    const ind = idx.get(is);
    const list = ind && ind.topics.get(c.topic);
    const key = `${is}|${c.topic}`;
    if (list && !seen.has(key) && tradeTopicIndexable(list, c.topic)) {
      seen.add(key);
      links.push(`<a href="/en/trade/${esc(is)}/${topicSlug(c.topic)}">${esc(ind.name)}: ${esc((TOPIC_LABEL[c.topic] || c.topic).toLowerCase())} across Asia</a>`);
    }
  }
  return `${CSS}<div class="r-container geo-slot" lang="en"><h2>Key points</h2><ul class="geo-claims">${items}</ul>` +
    (links.length ? `<p class="geo-src">${links.slice(0, 5).join(' · ')}</p>` : '') + '</div>';
}
