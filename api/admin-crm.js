// ============================================================
// KIRA RESEARCH — api/admin-crm.js
// CRM for /en/admin/crm: one row per person (lower-case email), built at read time from
//   leads · waitlist · topic_requests ("email me when ready") · purchases (+ auth.users for the buyer's email)
// plus what the owner decides, kept in crm_contacts (migration 038): stage, note, follow-up date.
// Nothing is copied between tables, so the people list can never drift from the source tables.
//
//   GET   /api/admin-crm                       → { people: [...], counts }
//   PATCH /api/admin-crm   body { email, stage?, note?, follow_up_at? }   (follow_up_at '' clears it)
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================

import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const STAGES = new Set(['open', 'talking', 'won', 'lost']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const H = () => ({ apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' });

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

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function rest(path, opts = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { ...H(), ...(opts.headers || {}) }, cache: 'no-store' });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function userEmails() {
  const out = new Map();
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=50`, { headers: H() });
    if (!r.ok) break;
    const users = ((await r.json().catch(() => ({}))).users) || [];
    for (const u of users) if (u.email) out.set(u.id, u.email.toLowerCase());
    if (users.length < 50) break;
  }
  return out;
}

const iso = (v) => (v ? new Date(v).toISOString() : null);

async function buildPeople() {
  const [leads, waitlist, requests, purchases, contacts, emails] = await Promise.all([
    rest('leads?select=email,name,company,role,created_at,locale,tier,brief,status&order=created_at.desc&limit=500'),
    rest('waitlist?select=email,name,company,role,created_at,locale,plan,status&order=created_at.desc&limit=500'),
    rest('topic_requests?select=email,created_at,locale,keyword,notified_at&order=created_at.desc&limit=1000'),
    rest('purchases?select=user_id,slug,amount,currency,status,created_at,captured_at,locale&status=eq.completed&order=created_at.desc&limit=500'),
    rest('crm_contacts?select=*&limit=2000'),
    userEmails()
  ]);

  const people = new Map();
  const get = (email) => {
    const key = String(email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(key)) return null;
    if (!people.has(key)) people.set(key, { email: key, name: null, company: null, role: null, locale: null, events: [], spend: 0, currency: null, first_seen: null, last_seen: null });
    return people.get(key);
  };
  const touch = (p, at, ev) => {
    p.events.push({ ...ev, at: iso(at) });
    const t = new Date(at).getTime();
    if (!p.first_seen || t < new Date(p.first_seen).getTime()) p.first_seen = iso(at);
    if (!p.last_seen || t > new Date(p.last_seen).getTime()) p.last_seen = iso(at);
  };
  const fill = (p, row) => {
    for (const k of ['name', 'company', 'role']) if (!p[k] && row[k]) p[k] = row[k];
    if (!p.locale && row.locale) p.locale = row.locale;
  };

  for (const l of leads) { const p = get(l.email); if (!p) continue; fill(p, l); touch(p, l.created_at, { type: 'lead', text: `Sent a request (${l.tier})`, detail: l.brief || '' }); }
  for (const w of waitlist) { const p = get(w.email); if (!p) continue; fill(p, w); touch(p, w.created_at, { type: 'waitlist', text: `Joined the waitlist (${w.plan})` }); }
  for (const t of requests) { const p = get(t.email); if (!p) continue; fill(p, t); touch(p, t.created_at, { type: 'request', text: `Asked to be emailed when ready: ${t.keyword || 'a topic'}`, detail: t.notified_at ? 'Notified ' + t.notified_at.slice(0, 10) : '' }); }
  const unattributed = { count: 0, amount: 0 };
  for (const b of purchases) {
    const p = get(emails.get(b.user_id));
    if (!p) { unattributed.count++; unattributed.amount += Number(b.amount || 0); continue; }  // no account / email behind this payment
    fill(p, b); p.spend += Number(b.amount || 0); p.currency = b.currency || p.currency;
    touch(p, b.captured_at || b.created_at, { type: 'purchase', text: `Bought ${b.slug} (${b.currency || 'USD'} ${Number(b.amount || 0).toFixed(2)})` });
  }

  const meta = new Map(contacts.map(c => [c.email, c]));
  // A person the owner has already noted stays in the list even if the source rows were removed.
  for (const c of contacts) get(c.email);

  const out = [];
  for (const p of people.values()) {
    const c = meta.get(p.email) || {};
    const bought = p.events.some(e => e.type === 'purchase');
    p.events.sort((a, b) => (a.at < b.at ? 1 : -1));
    const kinds = [...new Set(p.events.map(e => e.type))];
    out.push({
      ...p,
      spend: Math.round(p.spend * 100) / 100,
      kinds,
      stage: c.stage || (bought ? 'won' : 'open'),
      note: c.note || '',
      follow_up_at: c.follow_up_at || null
    });
  }
  out.sort((a, b) => (a.last_seen < b.last_seen ? 1 : -1));
  return { people: out, unattributed };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    if (req.method === 'GET') {
      const { people, unattributed } = await buildPeople();
      const today = new Date().toISOString().slice(0, 10);
      const counts = {
        total: people.length,
        buyers: people.filter(p => p.kinds.includes('purchase')).length,
        talking: people.filter(p => p.stage === 'talking').length,
        due: people.filter(p => p.follow_up_at && p.follow_up_at <= today && p.stage !== 'won' && p.stage !== 'lost').length
      };
      res.status(200).json({ people, counts, today, unattributed });
      return;
    }

    if (req.method === 'PATCH') {
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
      catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }

      const email = String(body.email || '').trim().toLowerCase();
      if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'email_required' }); return; }

      const row = { email };
      if (body.stage !== undefined) {
        if (!STAGES.has(body.stage)) { res.status(400).json({ error: 'bad_stage' }); return; }
        row.stage = body.stage;
      }
      if (body.note !== undefined) row.note = String(body.note).slice(0, 2000);
      if (body.follow_up_at !== undefined) {
        if (body.follow_up_at === '' || body.follow_up_at === null) row.follow_up_at = null;
        else if (/^\d{4}-\d{2}-\d{2}$/.test(body.follow_up_at)) row.follow_up_at = body.follow_up_at;
        else { res.status(400).json({ error: 'bad_date' }); return; }
      }
      if (Object.keys(row).length === 1) { res.status(400).json({ error: 'no_fields' }); return; }

      const saved = await rest('crm_contacts?on_conflict=email', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(row)
      });
      logAudit({ actor: user.email, action: 'update', resourceType: 'crm_contact', resourceId: email, resourceLabel: Object.keys(row).filter(k => k !== 'email').join(', '), req });
      res.status(200).json({ ok: true, contact: Array.isArray(saved) ? saved[0] : saved });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[admin-crm] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
