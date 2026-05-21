// ============================================================
// KIRA RESEARCH — api/admin-transactions.js
// Admin endpoint for purchase ledger: list, detail, manual refund flag.
//
// Auth: Authorization: Bearer <jwt> + email in ADMIN_EMAILS.
//
//   GET  /api/admin-transactions                        → { transactions: [...] }
//        ?status=completed|refunded|pending  · optional
//        ?locale=en|ja|ko                    · optional
//        ?slug=<slug>                        · optional
//
//   GET  /api/admin-transactions?id=<uuid>              → { transaction, downloads }
//
//   PATCH /api/admin-transactions?id=<uuid>             → { ok, transaction }
//        body: { status: 'refunded'|'completed', refund_note?: string }
//
// Year 1 refund flow: PATCH only flips the status flag — actual PayPal
// money refund still happens in the PayPal dashboard. We surface that
// caveat in the UI label so admin knows.
// ============================================================

import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// ── Supabase REST (service-key bypasses RLS) ───────────────
async function supabase(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        method === 'POST' || method === 'PATCH' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${res.status}: ${err}`);
  }
  return res.status === 204 ? null : res.json();
}

// ── Supabase Auth admin: pull user objects by id (batch) ──
//
// /auth/v1/admin/users supports pagination but no id-list filter, so for
// modest user counts (Year 1) we fetch the full list once and build a map.
// Capped at 1000 to keep latency bounded; admin views are read-mostly.
async function fetchUserMap() {
  const out = new Map();
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=50`,
      {
        headers: {
          'apikey':        SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    if (!r.ok) {
      console.warn('[admin-transactions] auth/admin/users failed', r.status);
      break;
    }
    const data = await r.json().catch(() => ({}));
    const users = data.users || [];
    for (const u of users) {
      out.set(u.id, { email: u.email || null, created_at: u.created_at || null });
    }
    if (users.length < 50) break;
  }
  return out;
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${m[1]}`
      }
    });
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

const STATUSES = new Set(['pending', 'completed', 'refunded', 'failed']);
const LOCALES  = new Set(['en', 'ja', 'ko']);

// PostgREST IN clause: values are bare, comma-separated, parenthesised.
// We control the input (uuids only) so injection isn't a concern, but quote
// defensively anyway.
function inList(values) {
  return '(' + values.map(v => `"${String(v).replace(/"/g, '')}"`).join(',') + ')';
}

// ── Handler ────────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const id  = url.searchParams.get('id');

  try {
    // ─────────────────────────────────────────────
    // GET ?id=<uuid> → single transaction + downloads
    // ─────────────────────────────────────────────
    if (req.method === 'GET' && id) {
      const rows = await supabase(
        `purchases?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
      );
      const tx = Array.isArray(rows) && rows[0] ? rows[0] : null;
      if (!tx) { res.status(404).json({ error: 'not_found' }); return; }

      // Linked report title (best-effort).
      let reportTitle = null;
      if (tx.report_id) {
        const t = await supabase(
          `report_translations?report_id=eq.${tx.report_id}` +
          `&locale=eq.${tx.locale}&select=title&limit=1`
        ).catch(() => []);
        reportTitle = Array.isArray(t) && t[0] ? t[0].title : null;
      }

      // Linked user email.
      let userEmail = null;
      if (tx.user_id) {
        const r = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users/${tx.user_id}`,
          {
            headers: {
              'apikey':        SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            }
          }
        ).catch(() => null);
        if (r && r.ok) {
          const u = await r.json().catch(() => ({}));
          userEmail = u && u.email ? u.email : null;
        }
      }

      // Downloads for this user × report (audit trail of when they pulled it).
      let downloads = [];
      if (tx.user_id && tx.report_id) {
        downloads = await supabase(
          `downloads?user_id=eq.${tx.user_id}&report_id=eq.${tx.report_id}` +
          `&select=id,delivered_at,locale,ua&order=delivered_at.desc&limit=20`
        ).catch(() => []);
      }

      res.status(200).json({
        transaction: { ...tx, report_title: reportTitle, user_email: userEmail },
        downloads:   Array.isArray(downloads) ? downloads : []
      });
      return;
    }

    // ─────────────────────────────────────────────
    // GET (no id) → list with enriched join data
    // ─────────────────────────────────────────────
    if (req.method === 'GET') {
      const filters = ['order=created_at.desc', 'limit=200', 'select=*'];

      const status = url.searchParams.get('status');
      if (status && STATUSES.has(status)) filters.push(`status=eq.${status}`);

      const locale = url.searchParams.get('locale');
      if (locale && LOCALES.has(locale)) filters.push(`locale=eq.${locale}`);

      const slug = url.searchParams.get('slug');
      if (slug && /^[a-z0-9][a-z0-9-]+$/.test(slug)) {
        filters.push(`slug=eq.${encodeURIComponent(slug)}`);
      }

      const purchases = await supabase('purchases?' + filters.join('&'));

      // Enrich with report titles + user emails. One round-trip each, joined
      // in JS — PostgREST can't OR-join across (report_id, locale) pairs from
      // a different row, and we don't need pagination Year 1.
      const reportIds = [...new Set(purchases.map(p => p.report_id).filter(Boolean))];
      const titleMap = new Map();
      if (reportIds.length) {
        const rows = await supabase(
          `report_translations?report_id=in.${inList(reportIds)}` +
          `&select=report_id,locale,title`
        ).catch(() => []);
        for (const t of Array.isArray(rows) ? rows : []) {
          titleMap.set(`${t.report_id}|${t.locale}`, t.title);
        }
      }

      const userMap = await fetchUserMap();

      const transactions = purchases.map(p => ({
        ...p,
        report_title: titleMap.get(`${p.report_id}|${p.locale}`) || null,
        user_email:   userMap.get(p.user_id)?.email || null
      }));

      res.status(200).json({ transactions });
      return;
    }

    // ─────────────────────────────────────────────
    // PATCH ?id=<uuid> → flip status (refund flag)
    // ─────────────────────────────────────────────
    if (req.method === 'PATCH') {
      if (!id) { res.status(400).json({ error: 'id_required' }); return; }

      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      } catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }

      const patch = {};
      if (body.status && STATUSES.has(body.status)) patch.status = body.status;
      // refund_note is intentionally NOT persisted (no column for it Year 1) —
      // accept it for forward compat but ignore. Log so admin sees what they sent.
      if (body.refund_note) {
        console.log('[admin-transactions] refund_note (not persisted):', body.refund_note.slice(0, 200));
      }
      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: 'no_fields' });
        return;
      }

      const updated = await supabase(
        `purchases?id=eq.${encodeURIComponent(id)}`, 'PATCH', patch
      );
      const tx = Array.isArray(updated) && updated[0] ? updated[0] : null;
      if (!tx) { res.status(404).json({ error: 'not_found' }); return; }

      logAudit({
        actor: user.email,
        action: patch.status === 'refunded' ? 'refund' : 'update',
        resourceType: 'transaction', resourceId: id,
        resourceLabel: tx.slug ? `${tx.slug}/${tx.locale || 'en'}` : null,
        diff: { patch, refund_note: body.refund_note || null, after: tx }, req
      });
      res.status(200).json({ ok: true, transaction: tx });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[admin-transactions] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
