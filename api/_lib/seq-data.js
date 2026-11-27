// ============================================================
// KIRA RESEARCH — api/_lib/seq-data.js
// Reads and writes the sequence job needs (Supabase REST, service key). The rules are in sequences.js (pure).
// ============================================================
import { listPrice } from './pricing.js';
import { slugify } from './sequences.js';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const H = (extra) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(extra || {}) });

export async function sb(path, method = 'GET', body, prefer) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { method, headers: H(prefer ? { Prefer: prefer } : null), body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) { const e = new Error(`Supabase ${r.status}: ${await r.text()}`); e.status = r.status; throw e; }
  return r.status === 204 || !(r.headers.get('content-type') || '').includes('json') ? null : r.json();
}

const inList = (arr) => `in.(${arr.map((x) => `"${String(x).replace(/"/g, '')}"`).join(',')})`;
const chunk = (arr, n = 100) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export const candidatesA = (sinceIso) => sb('rpc/seq_a_candidates', 'POST', { since: sinceIso });
export const buyersSince = (sinceIso) => sb('rpc/seq_buyers', 'POST', { since: sinceIso });

export async function optoutsFor(emails) {
  const out = new Set();
  for (const c of chunk([...new Set(emails.map((e) => String(e).toLowerCase()))])) {
    const rows = await sb(`email_optouts?select=email&email=${encodeURIComponent(inList(c))}`).catch(() => []);
    for (const r of rows || []) out.add(r.email);
  }
  return out;
}

// Set of "KIND|ref_key" already sent (any time), for the given kinds and refs.
export async function loggedSet(kinds, sinceIso) {
  const rows = await sb(`email_sequence_log?select=kind,ref_key,email&kind=${encodeURIComponent(inList(kinds))}&sent_at=gte.${encodeURIComponent(sinceIso)}&limit=20000`);
  return { keys: new Set(rows.map((r) => `${r.kind}|${r.ref_key}`)), emails: new Set(rows.map((r) => String(r.email).toLowerCase())) };
}

// Claim-then-send: the unique (kind, ref_key) row is the lock. true = this run owns the send.
export async function claim(kind, refKey, email, locale) {
  try {
    await sb('email_sequence_log', 'POST', { kind, ref_key: String(refKey), email: String(email).toLowerCase(), locale }, 'return=minimal');
    return true;
  } catch (e) {
    if (e.status === 409) return false;
    throw e;
  }
}
export const release = (kind, refKey) => sb(`email_sequence_log?kind=eq.${kind}&ref_key=eq.${encodeURIComponent(String(refKey))}`, 'DELETE').catch(() => {});

export async function paidOrderIds(ids) {
  const out = new Set();
  for (const c of chunk(ids)) {
    for (const t of ['purchases', 'transcript_purchases', 'list_purchases']) {
      const rows = await sb(`${t}?select=paypal_order_id&paypal_order_id=${encodeURIComponent(inList(c))}&status=eq.completed`).catch(() => []);
      for (const r of rows || []) out.add(r.paypal_order_id);
    }
  }
  return out;
}

// Titles/prices of what we sell. Reports and transcripts come whole (a few hundred rows); lists are read per country.
export async function loadCatalog() {
  const [reports, rtr, transcripts, ttr] = await Promise.all([
    sb('living_reports?status=eq.published&select=id,slug,country,industry,price,pages,exhibits,published_at&limit=2000'),
    sb('report_translations?status=eq.published&select=report_id,locale,title&limit=10000').catch(() => []),
    sb('expert_transcripts?status=eq.published&select=id,slug,market,industry,price,published_at&limit=2000').catch(() => []),
    sb('expert_transcript_translations?status=eq.published&select=transcript_id,locale,title&limit=10000').catch(() => [])
  ]);
  const titles = new Map();
  for (const t of rtr) titles.set(`r:${t.report_id}:${t.locale}`, t.title);
  for (const t of ttr) titles.set(`t:${t.transcript_id}:${t.locale}`, t.title);
  const items = [
    ...reports.map((r) => ({ kind: 'report', id: r.id, slug: r.slug, country: r.country, industry: r.industry, price: r.price, pages: r.pages, exhibits: r.exhibits, published_at: r.published_at })),
    ...transcripts.map((t) => ({ kind: 'transcript', id: t.id, slug: t.slug, country: t.market, industry: t.industry, price: t.price, published_at: t.published_at }))
  ];
  const titleOf = (it, loc) => titles.get(`${it.kind === 'report' ? 'r' : 't'}:${it.id}:${loc}`) || titles.get(`${it.kind === 'report' ? 'r' : 't'}:${it.id}:en`) || it.slug;
  return { items, titleOf, bySlug: new Map(items.map((i) => [i.slug, i])) };
}

// The best-selling-shape of a list for one country: biggest published maps first.
export async function mapsForCountry(country, limit = 3) {
  const rows = await sb(`market_maps?country=eq.${encodeURIComponent(slugify(country))}&status=eq.published&select=slug,title,l2_family,n_companies,created_at&order=n_companies.desc&limit=${limit}`).catch(() => []);
  return rows.map((m) => ({ kind: 'list', slug: m.slug, title: `${m.title} (company list)`, country: slugify(country), industry: m.title, price: listPrice(m.n_companies), published_at: m.created_at }));
}

export async function newMapsSince(country, sinceIso, limit = 20) {
  const rows = await sb(`market_maps?country=eq.${encodeURIComponent(slugify(country))}&status=eq.published&created_at=gt.${encodeURIComponent(sinceIso)}&select=slug,title,l2_family,n_companies,created_at&order=created_at.desc&limit=${limit}`).catch(() => []);
  return rows.map((m) => ({ kind: 'list', slug: m.slug, title: `${m.title} (company list)`, country: slugify(country), industry: m.title, industry_alt: m.l2_family, price: listPrice(m.n_companies), published_at: m.created_at }));
}

export const activeAlerts = () => sb('report_alerts?status=eq.active&select=id,email,country,industry,locale,token,confirmed_at,last_digest_at&order=id.asc&limit=1000');
export const markDigest = (id, nowIso) => sb(`report_alerts?id=eq.${id}`, 'PATCH', { last_digest_at: nowIso, last_sent_at: nowIso }, 'return=minimal');
export const abandonedOrders = (sinceIso) => sb(`checkout_orders?created_at=gte.${encodeURIComponent(sinceIso)}&select=paypal_order_id,kind,slug,locale,email,amount,currency,created_at&order=created_at.asc&limit=1000`);
