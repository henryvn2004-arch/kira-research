// ============================================================
// KIRA RESEARCH — api/get-report.js
// Fetch report status + content (used for polling & re-access)
// GET /api/get-report?id=UUID
// GET /api/get-report?slug=SLUG
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  return res.json();
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id, slug } = req.query;
  if (!id && !slug) return res.status(400).json({ error: 'Missing id or slug' });

  try {
    // Try custom_reports first
    let query = id
      ? `custom_reports?id=eq.${id}&select=*&limit=1`
      : `custom_reports?slug=eq.${slug}&select=*&limit=1`;

    let data = await sb(query);
    let report = Array.isArray(data) ? data[0] : null;

    // If not found in custom_reports, try living_reports
    if (!report) {
      query = slug
        ? `living_reports?slug=eq.${slug}&select=*&limit=1`
        : null;
      if (query) {
        data   = await sb(query);
        report = Array.isArray(data) ? data[0] : null;
      }
    }

    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Return full report data including sections
    return res.json({
      id:            report.id,
      slug:          report.slug,
      status:        report.status,
      sections:      report.sections || report.full_content || [],
      inputParams:   report.input_params || {},
      totalSections: (report.sections || []).length || 8,
      createdAt:     report.created_at,
      updatedAt:     report.updated_at
    });

  } catch (e) {
    console.error('[get-report]', e);
    return res.status(500).json({ error: e.message });
  }
}
