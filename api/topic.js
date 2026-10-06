// ============================================================
// KIRA RESEARCH — api/topic.js
// Public. Everything the "coming soon" page shows for one topic.
//
// GET /api/topic?slug=2027-vn-modern-retail-convenience-stores-market-assessment
//   → 200 { slug, title, buyer_question, questions[], country, country_code, industry,
//           competency, year, kind, state, eta_days }
//   → 200 { published: '<report slug>' }   the report exists now — page redirects
//   → 404 { error: 'not_found' }
//
//   state     scoping | requested | approved | in_production
//   eta_days  only for in_production: position in the queue / REPORTS_PER_DAY,
//             rounded up. null otherwise (no date is promised before approval).
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const REPORTS_PER_DAY = 1;   // batch pipeline throughput (Q.7: one report per day)

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
      '&select=slug,kind,year,title,buyer_question,questions,status,queued_at,report_id,' +
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

    let etaDays = null;
    if (t.status === 'queued' && t.queued_at) {
      const ahead = await sb(`topics?status=eq.queued&report_id=is.null&queued_at=lt.${encodeURIComponent(t.queued_at)}&select=id&limit=1000`);
      etaDays = Math.max(1, Math.ceil((ahead.length + 1) / REPORTS_PER_DAY));
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      slug: t.slug, title: t.title, buyer_question: t.buyer_question,
      questions: Array.isArray(t.questions) ? t.questions : [],
      country: t.country ? t.country.name : null, country_code: t.country ? t.country.code : null,
      industry: t.industry ? t.industry.name : null, competency: t.competency ? t.competency.label : null,
      year: t.year, kind: t.kind,
      state: t.status === 'proposed' ? 'scoping' : t.status === 'requested' ? 'requested' : t.status === 'approved' ? 'approved' : 'in_production',
      eta_days: etaDays
    });
  } catch (err) {
    console.error('[topic]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
