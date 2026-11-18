// ============================================================
// KIRA RESEARCH — api/brand-mentions.js
// Public endpoint for BizDirect Asia: which published reports and expert interviews name a brand
// in their FULL text?
//
//   GET /api/brand-mentions?
//       brand=Panasonic                  (required, <= 60 chars)
//       &alias=パナソニック&alias=國際牌   (optional, repeatable, up to 12; other spellings of the brand)
//       &strict=1                        (optional; the brand is also an everyday word — "Base", "Apple":
//                                         only exact-case mentions count, and at least 5 of them)
//       &country=japan                   (optional; lowercase English name. Only reorders: items of that market
//                                         come first. Items of other markets are still returned, each with its market)
//       &locale=en|ja|ko|zh              (default en; titles come in this locale, text is searched in it and in EN)
//       &limit=24                        (per kind, max 60)
//
// Returns { brand, reports: { total, items: [...] }, interviews: { total, items: [...] }, locale }.
//
// PAYWALL: the search runs inside Postgres (content_brand_mentions, migration 069). Only the catalogue
// fields KIRA already publishes in /api/library-list and /api/transcript-list come back (title, excerpt/hook,
// market, industry, year, type, price, cover/thumb, blurb), plus `mentions` (a count) — never a passage,
// quote or any other part of the text. A count of 1 means "named once"; it says nothing about where.
// ============================================================

import { coverUrls } from './_lib/cover.js';
import { buildPatterns, isMention, STRICT_MIN, WEAK_MIN } from './_lib/brand-match.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const LOCALES = new Set(['en', 'ja', 'ko', 'zh']);

async function sb(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const inList = (xs) => encodeURIComponent(`(${xs.map((x) => `"${x.replace(/"/g, '')}"`).join(',')})`);

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const brand  = (url.searchParams.get('brand') || '').trim();
  const locale = LOCALES.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';
  const country = (url.searchParams.get('country') || '').trim().toLowerCase();
  const limit  = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 24, 1), 60);
  const strict = url.searchParams.get('strict') === '1';
  if (!brand || brand.length > 60) { res.status(400).json({ error: 'bad_brand' }); return; }
  const aliases = url.searchParams.getAll('alias').slice(0, 12);

  const patterns = buildPatterns([brand, ...aliases], { strict });
  if (!patterns.solid.length && !patterns.weak.length) {
    // Nothing safe to search for (one-character names): an honest empty answer, not a guess.
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({ brand, reports: { total: 0, items: [] }, interviews: { total: 0, items: [] }, locale, ignored: patterns.ignored });
    return;
  }

  try {
    const locales = locale === 'en' ? ['en'] : [locale, 'en'];
    const hits = await sb('rpc/content_brand_mentions', { p_solid: patterns.solid, p_weak: patterns.weak, p_locales: locales });

    // One row per (kind, slug): the largest count over the two languages.
    const best = new Map();
    for (const h of hits) {
      const m = { solid: h.n_solid, weak: h.n_weak };
      if (!isMention(m, strict)) continue;
      const k = `${h.kind}:${h.slug}`;
      const n = m.solid + m.weak;
      if (!best.has(k) || n > best.get(k).n) best.set(k, { kind: h.kind, slug: h.slug, n });
    }
    const slugsOf = (kind) => [...best.values()].filter((x) => x.kind === kind);
    const reportHits = slugsOf('report');
    const transcriptHits = slugsOf('transcript');

    const [reports, interviews] = await Promise.all([loadReports(reportHits, locale), loadInterviews(transcriptHits, locale)]);
    const order = (a, b) => (Number(b.market === country) - Number(a.market === country)) || b.mentions - a.mentions || String(b.published || '').localeCompare(String(a.published || ''));
    reports.sort(order);
    interviews.sort(order);

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.status(200).json({
      brand, locale, weakMinMentions: strict ? STRICT_MIN : WEAK_MIN,
      reports: { total: reports.length, items: reports.slice(0, limit) },
      interviews: { total: interviews.length, items: interviews.slice(0, limit) },
    });
  } catch (err) {
    console.error('[brand-mentions] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}

// Catalogue fields only, shaped like /api/library-list items.
async function loadReports(hits, locale) {
  if (!hits.length) return [];
  const rows = await sb(`living_reports?status=eq.published&slug=in.${inList(hits.map((h) => h.slug))}` +
    '&select=id,slug,country,industry,year,pages,price,report_type,published_at,cover_url,cover_thumb_url');
  const trs = rows.length ? await sb(`report_translations?report_id=in.(${rows.map((r) => r.id).join(',')})&status=eq.published&locale=in.(${locale},en)&select=report_id,locale,title,preview`) : [];
  const n = new Map(hits.map((h) => [h.slug, h.n]));
  return rows.map((r) => {
    const mine = trs.filter((t) => t.report_id === r.id);
    const t = mine.find((x) => x.locale === locale) || mine.find((x) => x.locale === 'en');
    if (!t) return null;
    const pv = t.preview && typeof t.preview === 'object' ? t.preview : {};
    return {
      slug: r.slug, title: t.title, excerpt: pv.lede ? String(pv.lede).slice(0, 240) : null, hook: pv.hook ? String(pv.hook).slice(0, 160) : null,
      country: r.country, market: (r.country || '').toLowerCase(), industry: r.industry, year: r.year, pages: r.pages, price: r.price,
      type: r.report_type || null, published: r.published_at || null, cover: coverUrls(r, t.locale), locale: t.locale, mentions: n.get(r.slug) || 0,
    };
  }).filter(Boolean);
}

// Catalogue fields only, shaped like /api/transcript-list items.
async function loadInterviews(hits, locale) {
  if (!hits.length) return [];
  const rows = await sb(`expert_transcripts?status=eq.published&slug=in.${inList(hits.map((h) => h.slug))}` +
    '&select=id,slug,interview_type,market,industry,expert_group,published_at,thumb_url');
  const trs = rows.length ? await sb(`expert_transcript_translations?transcript_id=in.(${rows.map((r) => r.id).join(',')})&status=eq.published&locale=in.(${locale},en)&select=transcript_id,locale,title,blurb,expert_role,expert_type,as_of,length_label`) : [];
  const n = new Map(hits.map((h) => [h.slug, h.n]));
  return rows.map((b) => {
    const mine = trs.filter((t) => t.transcript_id === b.id);
    const t = mine.find((x) => x.locale === locale) || mine.find((x) => x.locale === 'en');
    if (!t) return null;
    return {
      slug: b.slug, title: t.title, blurb: t.blurb, market: (b.market || '').toLowerCase(), industry: b.industry, interview_type: b.interview_type,
      expert: t.expert_role, expert_type: t.expert_type, as_of: t.as_of, length: t.length_label, published: b.published_at, thumb: b.thumb_url || null,
      locale: t.locale, mentions: n.get(b.slug) || 0,
    };
  }).filter(Boolean);
}
