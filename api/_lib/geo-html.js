// ============================================================
// KIRA RESEARCH — api/_lib/geo-html.js
// Markup shared by the GEO hubs (api/geo.js) and the report / transcript pages (api/ssr.js):
// a Q&A block with its source line, and a practitioner claim with its basis label on the same line.
// ============================================================
import { esc } from './ssr.js';

export function sourceLine(a, titles) {
  const ref = a.source_ref || {};
  const yr = a.year ? `, ${esc(a.year)}` : '';
  if (a.source_kind === 'transcript') {
    const t = titles.transcripts.get(ref.slug);
    return `Source: KIRA field research (modelled interview)${yr}` + (t ? ` · <a href="/en/experts/transcripts/${esc(ref.slug)}">${esc(t)}</a>` : '');
  }
  const t = titles.reports.get(ref.slug);
  return `Source: ${esc(a.primary_source || 'KIRA research')}${yr}` + (t ? ` · KIRA report: <a href="/en/reports/${esc(ref.slug)}">${esc(t)}</a>` : '');
}

export const answerBlock = (a, titles, tag = 'h3') =>
  `<${tag}>${esc(a.question)}</${tag}><p>${esc(a.answer_short)}</p><p class="geo-src">${sourceLine(a, titles)}</p>`;

// A practitioner statement: never a quote, never one named person; the basis label sits on the same line.
export function claimItem(c, titles, withLink = true) {
  const t = withLink ? titles.transcripts.get(c.transcript_slug) : null;
  const who = c.speaker_role ? `${esc(c.speaker_role)} · ` : '';
  return `<li>${esc(c.claim_text)} <span class="geo-basis">${who}${esc(c.basis_label)}` +
    (t ? ` · <a href="/en/experts/transcripts/${esc(c.transcript_slug)}">${esc(t)}</a>` : '') + '</span></li>';
}
