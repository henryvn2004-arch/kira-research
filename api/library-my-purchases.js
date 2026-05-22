// ============================================================
// KIRA RESEARCH — api/library-my-purchases.js
// List the signed-in user's completed library purchases, joined
// with report metadata for the profile / "My Library" page.
//
//   GET /api/library-my-purchases
//   Authorization: Bearer <supabase-jwt>
//   → { items: [{ slug, locale, title, country, industry, year, purchasedAt, hasPdf }] }
//
// 401 if unauthenticated. One row per (slug × locale) purchase.
// PDF URLs are NOT pre-signed here — to download, the client calls the
// existing /api/library-content endpoint which signs on demand. That
// keeps the signed-URL TTL fresh and the signing logic in one place.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json'
    }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${m[1]}` }
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? { id: u.id, email: (u.email || '').toLowerCase() } : null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  try {
    // 1) All completed purchases for this user, newest first.
    const purchases = await sb(
      `purchases?user_id=eq.${user.id}` +
      `&status=eq.completed` +
      `&select=slug,locale,report_id,amount,currency,captured_at,created_at` +
      `&order=captured_at.desc.nullslast,created_at.desc`
    );
    if (!Array.isArray(purchases) || purchases.length === 0) {
      res.status(200).json({ items: [], email: user.email });
      return;
    }

    // 2) Unique report_ids — batch-fetch base metadata.
    const reportIds = [...new Set(purchases.map(p => p.report_id).filter(Boolean))];
    let basesById = {};
    if (reportIds.length) {
      const baseRows = await sb(
        `living_reports?id=in.(${reportIds.join(',')})` +
        `&select=id,slug,country,industry,year`
      );
      basesById = Object.fromEntries((baseRows || []).map(b => [b.id, b]));
    }

    // 3) Batch-fetch translations for (report_id, locale) pairs we care about.
    //    Use the locale the user actually purchased. If that translation is
    //    missing, fall back to EN title so the row still renders.
    const wantedPairs = purchases.map(p => ({ report_id: p.report_id, locale: p.locale }));
    const allTranslations = await sb(
      `report_translations?report_id=in.(${reportIds.join(',')})` +
      `&select=report_id,locale,title,pdf_url`
    );
    const transIndex = {};
    (allTranslations || []).forEach(t => {
      transIndex[`${t.report_id}:${t.locale}`] = t;
    });

    function pickTranslation(reportId, locale) {
      return transIndex[`${reportId}:${locale}`]
          || transIndex[`${reportId}:en`]
          || null;
    }

    // 4) Compose response items. Keep purchase order.
    const items = purchases.map(p => {
      const base = basesById[p.report_id] || {};
      const t    = pickTranslation(p.report_id, p.locale);
      return {
        slug:        p.slug || base.slug,
        locale:      p.locale,
        title:       t ? t.title : (p.slug || '(untitled)'),
        country:     base.country  || null,
        industry:    base.industry || null,
        year:        base.year     || null,
        amount:      p.amount,
        currency:    p.currency || 'USD',
        purchasedAt: p.captured_at || p.created_at,
        hasPdf:      !!(t && t.pdf_url)
      };
    });

    res.status(200).json({ items, email: user.email });
  } catch (err) {
    console.error('[library-my-purchases] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
