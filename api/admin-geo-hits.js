// ============================================================
// KIRA RESEARCH — api/admin-geo-hits.js
// AI visibility numbers for the admin GEO page (GEO G7).
//   GET /api/admin-geo-hits?days=7|30|90   (default 30)
//   → { days, bots:[{name,kind,total,days:{YYYY-MM-DD:n}}], top_paths:[{path,total}], referrals:[{src,visits}], note }
// Bots: table geo_hits (migration 067). Referrals: site_events.src for the AI assistants (track.js).
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` });
const REFS = ['chatgpt.com', 'perplexity.ai', 'gemini.google.com', 'copilot.microsoft.com', 'claude.ai'];

async function verifyBearer(req) {
  const m = (req.headers['authorization'] || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${m[1]}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? u.email.toLowerCase() : null;
  } catch (_e) { return null; }
}

async function pages(path) {
  const out = [];
  for (let from = 0; from < 50000; from += 1000) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}&limit=1000&offset=${from}`, { headers: H() });
    if (!r.ok) return null;                       // table not there yet
    const p = await r.json();
    out.push(...p);
    if (p.length < 1000) break;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const email = await verifyBearer(req);
  if (!email || !ADMIN_EMAILS.includes(email)) return res.status(401).json({ error: 'unauthorized' });
  const days = [7, 30, 90].includes(Number(req.query && req.query.days)) ? Number(req.query.days) : 30;
  const since = new Date(Date.now() - days * 864e5).toISOString();
  try {
    const [hits, ev] = await Promise.all([
      pages(`geo_hits?select=day,bot_or_ref,kind,path,count&day=gte.${since.slice(0, 10)}&order=day.asc`),
      pages(`site_events?select=src&event=eq.pageview&at=gte.${encodeURIComponent(since)}&src=in.(${REFS.map((r) => `"${r}"`).join(',')})`),
    ]);
    const bots = new Map(); const paths = new Map();
    for (const h of hits || []) {
      const k = `${h.bot_or_ref}|${h.kind}`;
      if (!bots.has(k)) bots.set(k, { name: h.bot_or_ref, kind: h.kind, total: 0, days: {} });
      const b = bots.get(k); b.total += h.count; b.days[h.day] = (b.days[h.day] || 0) + h.count;
      paths.set(h.path, (paths.get(h.path) || 0) + h.count);
    }
    const ref = new Map(REFS.map((r) => [r, 0]));
    for (const e of ev || []) ref.set(e.src, (ref.get(e.src) || 0) + 1);
    res.status(200).json({
      days,
      available: hits !== null,
      bots: [...bots.values()].sort((a, b) => b.total - a.total),
      top_paths: [...paths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([path, total]) => ({ path, total })),
      referrals: [...ref.entries()].map(([src, visits]) => ({ src, visits })),
      note: 'Crawler counts only include requests that reached the server; pages served from the edge cache are not counted.',
    });
  } catch (err) {
    console.error('[admin-geo-hits]', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
