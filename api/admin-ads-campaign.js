// ============================================================
// KIRA RESEARCH — api/admin-ads-campaign.js
// The Google Ads Editor import file for the paid-search test (S21). One ad group per topic page
// (the coming-soon or published page is the landing page), keywords and one responsive search ad
// each. EVERYTHING IS PAUSED: importing it into Ads Editor spends nothing until the owner enables it.
//
//   GET /api/admin-ads-campaign                    → CSV (first 100 topics, best score first)
//       ?limit=100 (max 500) &offset=0              next slice, so the test can grow in steps
//       &budget=20 (USD per day, 1-500) &cpc=1.00 (max CPC cap, 0.10-20) &languages=English
//   GET /api/admin-ads-campaign?kind=negatives     → text: the shared negative keywords, one per line
//   GET /api/admin-ads-campaign?kind=pagefeed      → CSV page feed for Dynamic Search Ads (Page URL, Custom label): indexable EN pages only
//   GET /api/admin-ads-campaign?kind=dsa           → Ads Editor file, one DSA campaign (Paused, $10/day, page-feed targets)
//       ?budget=10 &cpc=1.50 &locations=Japan,South Korea,...
//   GET /api/admin-ads-campaign?kind=dsa-negatives → text: negatives for the DSA campaign (incl. cross-negatives with BizDirect)
//   GET /api/admin-ads-campaign?format=json        → { groups, keywords, skipped, priceOn, etaDays } for a preview
//
// The "Report from $X" headline (X = the lowest price on sale now, read from the data) is only written while single-report checkout is on
// (config checkout.single_report_enabled), the "ready in about N days" one uses ondemand.target_days.
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================

import { getConfig } from './_lib/config.js';
import { REPORT_PRICE_MIN, TRANSCRIPT_PRICE_MIN } from './_lib/pricing.js';
import { buildCampaignCsv, NEGATIVES } from './_lib/ads-campaign.js';
import { buildPageFeed, buildDsaCsv, negativesText, DEFAULT_LOCATIONS } from './_lib/ads-dsa.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` });

async function verifyBearer(req) {
  const m = (req.headers['authorization'] || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${m[1]}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? { id: u.id, email: u.email.toLowerCase() } : null;
  } catch (_) { return null; }
}

const num = (v, lo, hi, dflt) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt; };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  const query = req.query || {};
  if (query.kind === 'negatives') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="kira-ads-negative-keywords.txt"');
    res.status(200).send(NEGATIVES.join('\n') + '\n');
    return;
  }

  if (query.kind === 'dsa-negatives') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="kira-dsa-negative-keywords.txt"');
    res.status(200).send(negativesText());
    return;
  }

  if (query.kind === 'pagefeed' || query.kind === 'dsa') {
    try {
      if (query.kind === 'dsa') {
        const [rOn, tOn] = await Promise.all([getConfig('checkout.single_report_enabled'), getConfig('checkout.transcript_enabled')]);
        const locs = String(query.locations || '').split(',').map(x => x.replace(/[^A-Za-z .]/g, '').trim()).filter(Boolean);
        const out = buildDsaCsv({ budget: num(query.budget, 1, 500, 10), maxCpc: num(query.cpc, 0.1, 20, 1.5).toFixed(2),
          locations: locs.length ? locs : DEFAULT_LOCATIONS, reportPrice: rOn ? REPORT_PRICE_MIN : null, transcriptPrice: tOn ? TRANSCRIPT_PRICE_MIN : null });
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="kira-ads-dsa-campaign.csv"');
        res.status(200).send(out.csv);
        return;
      }
      const get = async (path) => {
        const rows = [];
        for (let from = 0; from < 20000; from += 1000) {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}&order=slug.asc&limit=1000&offset=${from}`, { headers: H() });
          if (!r.ok) throw new Error(`${path.split('?')[0]} ${r.status}`);
          const part = await r.json(); rows.push(...part);
          if (part.length < 1000) break;
        }
        return rows;
      };
      const mapsOn = await getConfig('marketmaps.indexing_enabled');
      const [maps, reps, trs] = await Promise.all([
        mapsOn ? get('market_maps?status=eq.published&indexable=eq.true&n_companies=gte.50&commentary=not.is.null&select=slug,country,n_companies,indexable,commentary:commentary_built_at') : [],
        get('living_reports?status=eq.published&select=slug,country,price,status,report_translations!inner(locale,status)&report_translations.locale=eq.en&report_translations.status=eq.published'),
        get('expert_transcripts?status=eq.published&select=slug,market,status,price,expert_transcript_translations!inner(locale,status)&expert_transcript_translations.locale=eq.en&expert_transcript_translations.status=eq.published')
      ]);
      const out = buildPageFeed({
        maps,
        reports: reps.map(r => ({ ...r, hasEn: Array.isArray(r.report_translations) && r.report_translations.length > 0 })),
        transcripts: trs.map(t => ({ ...t, hasEn: Array.isArray(t.expert_transcript_translations) && t.expert_transcript_translations.length > 0 }))
      });
      if (query.format === 'json') { res.status(200).json({ counts: out.counts, total: out.total, mapsIndexingOn: !!mapsOn }); return; }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="kira-ads-page-feed.csv"');
      res.status(200).send(out.csv);
    } catch (err) {
      console.error('[admin-ads-campaign] dsa error:', err.message);
      res.status(500).json({ error: 'server_error' });
    }
    return;
  }

  try {
    const limit  = Math.round(num(query.limit, 1, 500, 100));
    const offset = Math.round(num(query.offset, 0, 5000, 0));
    const r = await fetch(`${SUPABASE_URL}/rest/v1/topics?select=slug,title,buyer_question,signals,report:living_reports(slug,status),country:tax_countries(name)` +
      '&status=in.(queued,approved,requested,proposed)&limit=5000', { headers: H() });
    if (!r.ok) throw new Error(`topics ${r.status}`);
    const topics = (await r.json())
      .map(t => ({
        slug: t.slug,
        publishedSlug: t.report && t.report.status === 'published' ? t.report.slug : null,
        country: t.country ? t.country.name : '',
        segment: (t.signals && t.signals.segment) || '',
        analysis: (t.signals && t.signals.analysis) || '',
        buyer_question: t.buyer_question || '',
        score: Number(t.signals && t.signals.score) || 0
      }))
      .filter(t => t.country && t.segment)
      .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
      .slice(offset, offset + limit);

    const priceOn = await getConfig('checkout.single_report_enabled');
    let fromPrice = REPORT_PRICE_MIN;
    try {
      const pr = await fetch(`${SUPABASE_URL}/rest/v1/living_reports?status=eq.published&price=gt.0&select=price&order=price.asc&limit=1`, { headers: H() });
      const row = pr.ok ? (await pr.json())[0] : null;
      if (row && row.price > 0) fromPrice = Number(row.price);
    } catch (_e) { /* the rule's floor is used */ }
    const etaDays = await getConfig('ondemand.target_days');
    const out = buildCampaignCsv(topics, {
      campaign: 'KIRA Reports - Pilot', budget: num(query.budget, 1, 500, 20), maxCpc: num(query.cpc, 0.1, 20, 1).toFixed(2),
      languages: String(query.languages || 'English').replace(/[^A-Za-z ,]/g, '').slice(0, 60) || 'English',
      priceOn, price: fromPrice, etaDays
    });

    if (query.format === 'json') {
      res.status(200).json({ groups: out.groups, keywords: out.keywords, skipped: out.skipped, priceOn, etaDays, offset, limit });
      return;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kira-ads-campaign-${offset}-${offset + limit}.csv"`);
    res.status(200).send(out.csv);
  } catch (err) {
    console.error('[admin-ads-campaign] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
