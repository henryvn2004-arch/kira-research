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
  if (a.source_kind === 'econ') {                 // Kira Data (economic series): link to the market's data page
    return `${L.src} ${esc(a.primary_source || L.srcEcon)}${yr}` + (titles.countrySlug ? ` · <a href="/${loc}/data/${esc(titles.countrySlug)}">${esc(L.srcEcon)}</a>` : '');
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

// ── "Who decides": field claims on buyers and decision makers, sorted into three columns ──
// Sorted by words in the English claim text; a claim that matches nothing goes by its topic.
const RISK_RE = /\b(risk|liab|warrant|blam|responsib|guarant|penalt|recall|accountab|bear|bears)/i;
const SPEC_RE = /\b(specif|approv|design|engineer|architect|consultan|recommend|prescrib|tender|standard|qualif|shortlist)/i;
export function decideColumns(claims) {
  const cols = { spec: [], buy: [], risk: [] };
  for (const c of claims) {
    if (c.topic !== 'buyer_roles' && c.topic !== 'decision_makers') continue;
    const t = c.claim_en || c.claim_text;
    const k = RISK_RE.test(t) ? 'risk' : SPEC_RE.test(t) ? 'spec' : (c.topic === 'decision_makers' ? 'spec' : 'buy');
    cols[k].push(c);
  }
  return cols;
}
// Role words in the claims → BizDirect list roles.
const ROLE_WORDS = { distributor: /distributor|dealer/i, wholesaler: /wholesal/i, importer: /importer|import agent/i, manufacturer: /manufactur|maker|producer/i, retailer: /retailer|retail chain/i, supplier: /supplier/i };
export function rolesIn(claims) {
  const text = claims.map((c) => `${c.claim_en || c.claim_text} ${c.speaker_role || ''}`).join(' ');
  return Object.keys(ROLE_WORDS).filter((r) => ROLE_WORDS[r].test(text));
}
// pages = BizDirect segment-summary pages [{role,url}] (possibly from several markets).
export function whoDecidesHtml(claims, L, loc, titles, pages) {
  const cols = decideColumns(claims);
  const n = cols.spec.length + cols.buy.length + cols.risk.length;
  if (n < 2) return '';
  const cell = (k, label) => `<div><h3>${esc(label)}</h3>` + (cols[k].length
    ? `<ul class="geo-claims">${cols[k].map((c) => claimItem(c, titles, loc, false)).join('')}</ul>` : `<p class="geo-note">${esc(L.whoEmpty)}</p>`) + '</div>';
  const roles = rolesIn(cols.spec.concat(cols.buy, cols.risk));
  const links = (pages || []).filter((p) => p && roles.includes(String(p.role || '').toLowerCase()) && /^https:\/\/(www\.)?bizdirectasia\.com\//.test(p.url || ''));
  const uniq = [...new Map(links.map((p) => [p.url, p])).values()];
  return `<section id="who-decides"><h2>${esc(L.whoDecides)}</h2>${modelledNote(L, loc)}<div class="geo-map">${cell('spec', L.whoSpecifies)}${cell('buy', L.whoBuys)}${cell('risk', L.whoRisk)}</div>` +
    (uniq.length ? `<p class="geo-note">${esc(L.bdRoles)} ${uniq.map((p) => `<a href="${esc(p.url)}" rel="noopener">${esc(L.bdList(String(p.role).toLowerCase()))}</a>`).join(' · ')}</p>` : '') + '</section>';
}
