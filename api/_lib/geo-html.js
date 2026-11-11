// ============================================================
// KIRA RESEARCH — api/_lib/geo-html.js
// Markup shared by the GEO hubs (api/geo.js) and the report / transcript pages (api/_lib/geo-slots.js):
// a Q&A block with its source line, and a practitioner claim with its basis label on the same line.
// L = interface strings (geo-i18n.js T[loc]); loc = language of the links.
// ============================================================
import { esc } from './ssr.js';

export function sourceLine(a, titles, L, loc) {
  const ref = a.source_ref || {};
  const yr = a.year ? `, ${esc(a.year)}` : '';
  if (a.source_kind === 'transcript') {
    const t = titles.transcripts.get(ref.slug);
    return `${L.src} ${L.srcField}${yr}` + (t ? ` · <a href="/${loc}/experts/transcripts/${esc(ref.slug)}">${esc(t)}</a>` : '');
  }
  const t = titles.reports.get(ref.slug);
  return `${L.src} ${esc(a.primary_source || L.srcDefault)}${yr}` + (t ? ` · ${L.srcReport} <a href="/${loc}/reports/${esc(ref.slug)}">${esc(t)}</a>` : '');
}

export const answerBlock = (a, titles, L, loc, tag = 'h3') =>
  `<${tag}>${esc(a.question)}</${tag}><p>${esc(a.answer_short)}</p><p class="geo-src">${sourceLine(a, titles, L, loc)}</p>`;

// A practitioner statement: never a quote, never one named person; the basis label sits on the same line.
export function claimItem(c, titles, loc, withLink = true) {
  const t = withLink ? titles.transcripts.get(c.transcript_slug) : null;
  const who = c.speaker_role ? `${esc(c.speaker_role)} · ` : '';
  return `<li>${esc(c.claim_text)} <span class="geo-basis">${who}${esc(c.basis_label)}` +
    (t ? ` · <a href="/${loc}/experts/transcripts/${esc(c.transcript_slug)}">${esc(t)}</a>` : '') + '</span></li>';
}

// The line above every list of field claims: they are modelled interviews, not recorded calls.
const METHOD_LABEL = { en: 'Methodology', ja: '調査手法', ko: '방법론', zh: '研究方法' };
export const modelledNote = (L, loc) =>
  `<p class="geo-note geo-src">${L.modelled((label) => `<a href="/${loc}/methodology">${esc(METHOD_LABEL[loc] || label)}</a>`)}</p>`;
