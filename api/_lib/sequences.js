// ============================================================
// KIRA RESEARCH — api/_lib/sequences.js
// Pure selection rules for the nurture emails (stage 1, 2026-11-27): who gets what, when, and who is left out.
// No I/O here (api/cron-sequences.js fetches the rows and sends); that keeps the rules unit-testable
// (tests/sequences.test.mjs).
//
//   A  coming-soon requesters, once their report is published (notified_at = day 0, sent by notify-topic-published):
//        A3   +3 days   reminder (not for buyers)
//        A10  +10 days  two related reports (not for buyers)
//   D  buyers: D3  +3 days  two related items for the same country / segment. One follow-up, no discount.
//   ABN abandoned checkout, signed-in buyers only (their email is known): ABN1 +1 h, ABN24 +24 h.
//   DIGEST  weekly "new reports on <country> / <industry>" for confirmed alerts, at most 5 items.
// Every sequence stops on opt-out (email_optouts) and on purchase; the three last also on unsubscribe of the alert.
// A window is [due, due + grace): a job that was off for days does not send a stale reminder when it comes back.
// ============================================================

import { createHmac, timingSafeEqual } from 'node:crypto';

export const HOUR = 3600e3, DAY = 86400e3;
export const KINDS = ['A0', 'A3', 'A10', 'D3', 'ABN1', 'ABN24', 'DIGEST'];

// kind → [due after, give up after]
export const WINDOWS = {
  A3: [3 * DAY, 9 * DAY],
  A10: [10 * DAY, 17 * DAY],
  D3: [3 * DAY, 9 * DAY],
  ABN1: [1 * HOUR, 24 * HOUR],
  ABN24: [24 * HOUR, 72 * HOUR]
};

export const MAX_DIGEST_ITEMS = 5;
export const DIGEST_EVERY = 7 * DAY;

const lc = (s) => String(s || '').trim().toLowerCase();
const t0 = (x) => (x ? new Date(x).getTime() : NaN);
export const slugify = (s) => lc(s).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const inWindow = (kind, ageMs) => ageMs >= WINDOWS[kind][0] && ageMs < WINDOWS[kind][1];

// Set of "email|slug" for what each buyer owns (any language, any kind).
export const ownedSet = (buyers) => new Set((buyers || []).map((b) => `${lc(b.email)}|${b.slug}`));

// ── A: requesters of a coming-soon report ────────────────────────────────
// requests: seq_a_candidates rows. buyers: seq_buyers rows. optouts: Set(email). logged: Set("KIND|ref_key").
export function dueTopicSteps({ requests, buyers, optouts = new Set(), logged = new Set(), now = Date.now() }) {
  const owned = ownedSet(buyers);
  const out = [];
  for (const r of requests || []) {
    const email = lc(r.email);
    if (!email || optouts.has(email) || owned.has(`${email}|${r.report_slug}`)) continue;
    const age = now - t0(r.notified_at);
    if (!(age >= 0)) continue;
    // One step at a time: a request that is already past +10 days gets the +10 email only.
    const kind = inWindow('A10', age) ? 'A10' : inWindow('A3', age) ? 'A3' : null;
    if (!kind || logged.has(`${kind}|${r.request_id}`)) continue;
    out.push({ kind, request: r });
  }
  return out;
}

// ── D: buyers, one follow-up ──────────────────────────────────────────────
// loggedEmails: Set of emails that already got a D3 in the last 30 days (one follow-up per person, whatever they bought).
export function dueBuyerSteps({ buyers, optouts = new Set(), logged = new Set(), loggedEmails = new Set(), now = Date.now() }) {
  const seen = new Set(), out = [];
  const sorted = [...(buyers || [])].sort((a, b) => t0(a.captured_at) - t0(b.captured_at));
  for (const p of sorted) {
    const email = lc(p.email);
    if (!email || optouts.has(email) || loggedEmails.has(email) || seen.has(email)) continue;
    if (!inWindow('D3', now - t0(p.captured_at)) || logged.has(`D3|${p.purchase_key}`)) continue;
    seen.add(email);
    out.push({ kind: 'D3', purchase: p });
  }
  return out;
}

// ── ABN: abandoned checkout ───────────────────────────────────────────────
// orders: checkout_orders rows. paidOrders: Set(paypal_order_id) already in a purchase table. buyers: seq_buyers rows.
// One email per order: an order that first shows up after 24 h gets only the 24-hour one.
export function dueAbandoned({ orders, paidOrders = new Set(), buyers, optouts = new Set(), logged = new Set(), now = Date.now() }) {
  const owned = ownedSet(buyers);
  const out = [];
  for (const o of orders || []) {
    const email = lc(o.email);
    if (!email || optouts.has(email) || paidOrders.has(o.paypal_order_id) || owned.has(`${email}|${o.slug}`)) continue;
    const age = now - t0(o.created_at);
    const kind = inWindow('ABN24', age) ? 'ABN24' : inWindow('ABN1', age) ? 'ABN1' : null;
    if (!kind) continue;
    if (logged.has(`ABN1|${o.paypal_order_id}`) && kind === 'ABN1') continue;
    if (logged.has(`ABN24|${o.paypal_order_id}`)) continue;
    if (kind === 'ABN24' && logged.has(`ABN24|${o.paypal_order_id}`)) continue;
    out.push({ kind, order: o });
  }
  return out;
}

// ── related items ─────────────────────────────────────────────────────────
// catalog: [{ kind: 'report'|'transcript'|'list', slug, title, country, industry, price, published_at }]
// (country / industry lower-case). Same country + industry first, then same country, then same industry; newest
// first inside a tier; different kinds are preferred so the two picks are not two reports. Never an owned or base item.
export function pickRelated({ country, industry, baseSlug, owned = new Set(), email = '', catalog, n = 2 }) {
  const c = slugify(country), i = slugify(industry);
  const tier = (it) => {
    const sc = slugify(it.country) === c, si = !!i && slugify(it.industry) === i;
    return sc && si ? 0 : sc ? 1 : si ? 2 : 9;
  };
  const pool = (catalog || [])
    .filter((it) => it.slug !== baseSlug && !owned.has(`${lc(email)}|${it.slug}`) && tier(it) < 9)
    .sort((a, b) => tier(a) - tier(b) || t0(b.published_at) - t0(a.published_at));
  const picked = [];
  for (const it of pool) { if (picked.length < n && !picked.some((p) => p.kind === it.kind)) picked.push(it); }
  for (const it of pool) { if (picked.length < n && !picked.includes(it)) picked.push(it); }
  return picked.slice(0, n);
}

// ── weekly digest ─────────────────────────────────────────────────────────
// alert: report_alerts row (status active). items: [{ kind, slug, title, price, published_at, country, industry }] already
// published; an item counts when it is newer than the alert's last digest (or confirmation) and matches country (+ industry).
export function digestFor({ alert, items, now = Date.now() }) {
  const since = t0(alert.last_digest_at || alert.confirmed_at);
  if (!(since > 0) || now - since < DIGEST_EVERY) return [];
  const c = slugify(alert.country), i = slugify(alert.industry);
  return (items || [])
    .filter((it) => t0(it.published_at) > since && slugify(it.country) === c && (!i || slugify(it.industry) === i || slugify(it.industry_alt) === i))
    .sort((a, b) => t0(b.published_at) - t0(a.published_at))
    .slice(0, MAX_DIGEST_ITEMS);
}

// ── unsubscribe link for the nurture emails (no account, no stored token: HMAC of the address) ──
function key() {
  return process.env.EMAIL_UNSUB_SECRET || process.env.GUEST_ACCESS_SECRET || process.env.SUPABASE_SERVICE_KEY || null;
}
export function signEmail(email, k = key()) {
  if (!k) return null;
  return createHmac('sha256', k).update('optout:' + lc(email)).digest('base64url').slice(0, 32);
}
export function verifyEmailSig(email, sig, k = key()) {
  const want = signEmail(email, k);
  if (!want || typeof sig !== 'string' || sig.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(want));
}
export function optoutUrl(appUrl, email, k = key()) {
  const s = signEmail(email, k);
  return s ? `${appUrl}/api/report-alert?a=optout&e=${encodeURIComponent(lc(email))}&s=${s}` : null;
}
