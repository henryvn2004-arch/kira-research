// ============================================================
// KIRA RESEARCH — api/library-pdf.js
// The PDF download link for a report, with the Month plan's allowance applied.
//
//   GET /api/library-pdf?slug=X&locale=Y        Authorization: Bearer <supabase-jwt>
//   → { pdf_url, via: 'purchase' | 'subscription', used?, limit? }
//
// 401 not signed in · 402 neither bought nor subscribed · 404 no such report / no PDF yet
// 429 { error: 'pdf_limit_reached', used, limit } — a subscriber has used this period's allowance
//
// A reader who bought the report always gets the link (no counting). A subscriber's first download of a
// given PDF in a billing period uses one of the allowance (setting subscription.pdf_per_month); getting
// the same PDF again in that period is free.
// ============================================================

import { resolvePdfUrl, downloadNameFor } from './_lib/report-pdf.js';
import { activeSubscription, claimPdf } from './_lib/subscription.js';
import { verifyBearer, LOCALES } from './_lib/transcripts.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug = url.searchParams.get('slug') || '';
  const locale = LOCALES.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';
  if (!/^[a-z0-9][a-z0-9-]+$/.test(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }

  try {
    const baseRows = await sb(`living_reports?slug=eq.${encodeURIComponent(slug)}&select=id,slug,code,country,industry,segment,year&limit=1`);
    const base = baseRows[0];
    if (!base) { res.status(404).json({ error: 'report_not_found' }); return; }

    const bought = await sb(`purchases?user_id=eq.${user.id}&slug=eq.${encodeURIComponent(slug)}&status=eq.completed&select=id&limit=1`);
    let via = 'purchase', allowance = null;
    if (!bought.length) {
      const sub = await activeSubscription(user.id);
      if (!sub) { res.status(402).json({ error: 'not_purchased' }); return; }
      via = 'subscription';
      // The language we will actually serve (falls back to English like library-content).
      let tr = (await sb(`report_translations?report_id=eq.${base.id}&locale=eq.${locale}&status=eq.published&select=pdf_url,locale&limit=1`))[0];
      if (!tr && locale !== 'en') tr = (await sb(`report_translations?report_id=eq.${base.id}&locale=eq.en&status=eq.published&select=pdf_url,locale&limit=1`))[0];
      if (!tr || !tr.pdf_url) { res.status(404).json({ error: 'pdf_missing' }); return; }
      allowance = await claimPdf(user.id, sub, slug, tr.locale);
      if (!allowance.ok) { res.status(429).json({ error: 'pdf_limit_reached', used: allowance.used, limit: allowance.limit }); return; }
      const link = await resolvePdfUrl(tr.pdf_url, downloadNameFor(base, tr.locale));
      if (!link) { res.status(404).json({ error: 'pdf_missing' }); return; }
      res.status(200).json({ pdf_url: link, via, used: allowance.used, limit: allowance.limit });
      return;
    }

    let tr = (await sb(`report_translations?report_id=eq.${base.id}&locale=eq.${locale}&status=eq.published&select=pdf_url,locale&limit=1`))[0];
    if (!tr && locale !== 'en') tr = (await sb(`report_translations?report_id=eq.${base.id}&locale=eq.en&status=eq.published&select=pdf_url,locale&limit=1`))[0];
    if (!tr || !tr.pdf_url) { res.status(404).json({ error: 'pdf_missing' }); return; }
    const link = await resolvePdfUrl(tr.pdf_url, downloadNameFor(base, tr.locale));
    if (!link) { res.status(404).json({ error: 'pdf_missing' }); return; }
    res.status(200).json({ pdf_url: link, via });
  } catch (err) {
    console.error('[library-pdf] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
