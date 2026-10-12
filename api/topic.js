// ============================================================
// KIRA RESEARCH — api/topic.js
// Public. Everything the "coming soon" page shows for one topic.
//
// GET /api/topic?slug=2027-vn-modern-retail-convenience-stores-market-assessment
//   → 200 { slug, title, buyer_question, questions[], country, country_code, industry,
//           competency, year, kind, state }
//   → 200 { published: '<report slug>' }   the report exists now — page redirects
//   → 404 { error: 'not_found' }
//
//   state     scoping | approved | in_production
//             proposed and requested (a reader-created topic nobody has reviewed)
//             and any status not listed here read as scoping.
//   eta       { date: 'YYYY-MM-DD', days } the date we promise if the reader asks for it now
//             (S18, api/_lib/eta.js): today + ondemand.target_days, or later when other requested
//             reports are ahead. null when it can not be worked out.
//   price     USD price of the report once published, or null while checkout is off
//             (config checkout.single_report_enabled, S19).
// ============================================================

import { topicEta } from './_lib/eta.js';
import { getConfig } from './_lib/config.js';
import { REPORT_PRICE_DEFAULT } from './_lib/pricing.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const slug = String((req.query || {}).slug || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,160}$/.test(slug)) return res.status(404).json({ error: 'not_found' });

  try {
    const rows = await sb(
      `topics?slug=eq.${encodeURIComponent(slug)}&status=neq.rejected&limit=1` +
      '&select=id,slug,kind,year,title,buyer_question,questions,status,report_id,' +
      'country:tax_countries(code,name),industry:tax_industries(name),competency:tax_competencies(label)'
    );
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    const t = rows[0];

    if (t.report_id) {
      const rep = await sb(`living_reports?id=eq.${t.report_id}&status=eq.published&select=slug&limit=1`);
      if (rep.length) {
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json({ published: rep[0].slug });
      }
    }

    const eta = await topicEta(t.id);
    const purchase = await getConfig('checkout.single_report_enabled');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      eta: eta ? { date: eta.date, days: eta.days } : null,
      price: purchase ? REPORT_PRICE_DEFAULT : null,
      slug: t.slug, title: t.title, buyer_question: t.buyer_question,
      questions: Array.isArray(t.questions) ? t.questions : [],
      country: t.country ? t.country.name : null, country_code: t.country ? t.country.code : null,
      industry: t.industry ? t.industry.name : null, competency: t.competency ? t.competency.label : null,
      year: t.year, kind: t.kind,
      state: t.status === 'queued' ? 'in_production' : t.status === 'approved' ? 'approved' : 'scoping'
    });
  } catch (err) {
    console.error('[topic]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
