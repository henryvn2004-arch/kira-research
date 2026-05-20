// ============================================================
// KIRA RESEARCH — api/library-verify.js
// JWT-authenticated check for whether the caller has purchased
// (slug, locale).
//
//   GET /api/library-verify?slug=X&locale=Y
//   Authorization: Bearer <supabase-jwt>
//   → { purchased: boolean, purchasedAt?: iso, anyLocale?: boolean }
//
// `anyLocale` is true if the user has purchased this report in ANY locale —
// used to offer free locale-switch on a previously-purchased report.
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
  return u && u.id ? { id: u.id } : null;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
}

const LOCALES = new Set(['en','ja','ko']);

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug   = url.searchParams.get('slug');
  const locale = LOCALES.has(url.searchParams.get('locale')) ? url.searchParams.get('locale') : 'en';

  if (!slug || !/^[a-z0-9][a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: 'bad_slug' });
    return;
  }

  // Not signed in → just say "not purchased" so the page can show the buy box.
  const user = await verifyBearer(req);
  if (!user) {
    res.status(200).json({ purchased: false, anyLocale: false });
    return;
  }

  try {
    const exact = await sb(
      `purchases?user_id=eq.${user.id}` +
      `&slug=eq.${encodeURIComponent(slug)}` +
      `&locale=eq.${locale}` +
      `&status=eq.completed&select=id,created_at&limit=1`
    );
    if (Array.isArray(exact) && exact.length) {
      res.status(200).json({
        purchased: true,
        purchasedAt: exact[0].created_at,
        anyLocale: true
      });
      return;
    }

    // Not bought in this locale — check if they own it in another.
    const any = await sb(
      `purchases?user_id=eq.${user.id}` +
      `&slug=eq.${encodeURIComponent(slug)}` +
      `&status=eq.completed&select=locale,created_at&limit=1`
    );
    res.status(200).json({
      purchased: false,
      anyLocale: Array.isArray(any) && any.length > 0,
      ownedLocale: Array.isArray(any) && any.length ? any[0].locale : null
    });
  } catch (err) {
    console.error('[library-verify] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
