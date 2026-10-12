// ============================================================
// KIRA RESEARCH — api/admin-ads-conversions.js
// The sign-ups that came from a Google Ads click, as a file Google Ads can import ("offline
// conversions"). Each sign-up stored the click id of the ad that brought the visitor
// (attribution, migration 048); here they are listed with a conversion name, time and value.
//
//   GET /api/admin-ads-conversions?days=30            → CSV download (default 90 days, max 90:
//                                                        Google ignores clicks older than that)
//   GET /api/admin-ads-conversions?days=30&format=json → { rows, counts } for the Funnel page
//
// CSV layout = Google Ads' offline conversion template (UTC times, one click id per row).
// Conversion names must match the conversion actions created in Google Ads (see workplan S17).
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================

import { getConfig } from './_lib/config.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` });

// table → conversion name (exactly as typed in Google Ads) and the config key that holds its value
const SOURCES = [
  { table: 'topic_requests', name: 'KIRA email request', valueKey: 'ads.value_request' },
  { table: 'waitlist',       name: 'KIRA waitlist',      valueKey: 'ads.value_waitlist' },
  { table: 'leads',          name: 'KIRA enquiry',       valueKey: 'ads.value_lead' }
];

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

const stamp = iso => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');
const csvCell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

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

  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query && req.query.days, 10) || 90));
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const rows = [];
    for (const src of SOURCES) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${src.table}?select=created_at,attribution&attribution=not.is.null&created_at=gte.${encodeURIComponent(since)}&order=created_at.asc&limit=5000`, { headers: H() });
      if (!r.ok) throw new Error(`${src.table} ${r.status}`);
      const value = await getConfig(src.valueKey);
      for (const x of await r.json()) {
        const a = x.attribution || {};
        const id = a.gclid ? { gclid: a.gclid } : a.gbraid ? { gbraid: a.gbraid } : a.wbraid ? { wbraid: a.wbraid } : null;
        if (!id) continue;     // a utm-only visit is not an ad click Google can match
        rows.push({ ...id, name: src.name, time: stamp(x.created_at), value, campaign: a.utm_campaign || '' });
      }
    }
    rows.sort((p, q) => p.time.localeCompare(q.time));

    if (req.query && req.query.format === 'json') {
      const counts = {};
      for (const x of rows) counts[x.name] = (counts[x.name] || 0) + 1;
      res.status(200).json({ days, total: rows.length, counts, rows: rows.slice(-200) });
      return;
    }

    const head = 'Google Click ID,GBRAID,WBRAID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency';
    const lines = rows.map(x => [x.gclid || '', x.gbraid || '', x.wbraid || '', x.name, x.time, x.value, 'USD'].map(csvCell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="kira-ads-conversions-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(['Parameters:TimeZone=+0000', head, ...lines].join('\n') + '\n');
  } catch (err) {
    console.error('[admin-ads-conversions] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
