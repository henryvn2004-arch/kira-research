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
//   GET /api/admin-ads-campaign?format=json        → { groups, keywords, skipped, priceOn, etaDays } for a preview
//
// The "from $49" headline is only written while single-report checkout is on
// (config checkout.single_report_enabled), the "ready in about N days" one uses ondemand.target_days.
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================

import { getConfig } from './_lib/config.js';
import { REPORT_PRICE_MIN } from './_lib/pricing.js';
import { buildCampaignCsv, NEGATIVES } from './_lib/ads-campaign.js';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
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
    const etaDays = await getConfig('ondemand.target_days');
    const out = buildCampaignCsv(topics, {
      campaign: 'KIRA Reports - Pilot', budget: num(query.budget, 1, 500, 20), maxCpc: num(query.cpc, 0.1, 20, 1).toFixed(2),
      languages: String(query.languages || 'English').replace(/[^A-Za-z ,]/g, '').slice(0, 60) || 'English',
      priceOn, price: REPORT_PRICE_MIN, etaDays
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
