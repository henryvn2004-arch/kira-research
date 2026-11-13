// ============================================================
// KIRA RESEARCH — api/_lib/attribution.js
// The browser (public/js/track.js) remembers the ad click that brought a visitor (Google click id +
// campaign tags) and attaches it as `attr` to sign-up POSTs. This keeps only what we expect, with
// length limits, so a hand-made request can not store arbitrary data.
// ============================================================

const KEYS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const ID_RE = /^[A-Za-z0-9_\-.]{8,200}$/;           // Google click ids are url-safe strings

// → object with at least one click id or utm_source, or null.
export function cleanAttr(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const k of KEYS) {
    const v = typeof raw[k] === 'string' ? raw[k].trim() : '';
    if (!v) continue;
    if (k === 'gclid' || k === 'gbraid' || k === 'wbraid') { if (ID_RE.test(v)) out[k] = v; }
    else out[k] = v.slice(0, 100);
  }
  if (!out.gclid && !out.gbraid && !out.wbraid && !out.utm_source) return null;
  if (typeof raw.lp === 'string' && /^\/[A-Za-z0-9/_\-.]{0,160}$/.test(raw.lp)) out.lp = raw.lp;   // landing page path
  const t = Number(raw.t);
  if (Number.isFinite(t) && t > 1.6e9 && t < 4e9) out.t = Math.floor(t);                           // click time, unix seconds
  return out;
}
