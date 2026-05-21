// ============================================================
// KIRA RESEARCH — api/admin-reports.js
// Admin CRUD for living_reports + report_translations.
//
// Auth: Authorization: Bearer <supabase-jwt>; email must be in ADMIN_EMAILS.
//
//   GET    /api/admin-reports                      → list all base rows
//   GET    /api/admin-reports?id=<uuid>            → base + all translations
//   POST   /api/admin-reports                      body { ...baseFields }
//                                                  → creates living_reports row
//   PATCH  /api/admin-reports?id=<uuid>            body { ...patch }
//                                                  → updates living_reports row
//   POST   /api/admin-reports?id=<uuid>&locale=en  body { ...translationFields }
//                                                  → upsert report_translations row
//   PATCH  /api/admin-reports?id=<uuid>&locale=en  body { ...patch }
//                                                  → update translation
//   DELETE /api/admin-reports?id=<uuid>            → soft-delete (status='retired')
//   DELETE /api/admin-reports?id=<uuid>&locale=en  → delete a single translation
// ============================================================

import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        (method === 'POST' || method === 'PATCH') ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
}

const LOCALES        = new Set(['en', 'ja', 'ko']);
const REPORT_STATUS  = new Set(['draft', 'published', 'retired']);
const TRANS_STATUS   = new Set(['draft', 'review', 'published', 'retired']);

// Whitelist of fields admins can write — never trust the client.
const REPORT_FIELDS = [
  'slug', 'country', 'industry', 'year', 'pages',
  'price', 'currency', 'aggregators', 'status', 'published_at'
];
const TRANSLATION_FIELDS = [
  'title', 'eyebrow', 'preview', 'toc',
  'full_content', 'pdf_url', 'status', 'published_at'
];

function pick(obj, allowed) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  allowed.forEach(k => {
    if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  });
  return out;
}

function validateBase(patch) {
  if (patch.slug !== undefined && !/^[a-z0-9][a-z0-9-]+$/.test(String(patch.slug))) {
    return 'invalid_slug';
  }
  if (patch.status !== undefined && !REPORT_STATUS.has(patch.status)) {
    return 'invalid_status';
  }
  if (patch.year !== undefined) {
    const y = parseInt(patch.year, 10);
    if (isNaN(y) || y < 2000 || y > 2100) return 'invalid_year';
    patch.year = y;
  }
  if (patch.price !== undefined) {
    const p = Number(patch.price);
    if (isNaN(p) || p < 0 || p > 100000) return 'invalid_price';
    patch.price = p;
  }
  if (patch.pages !== undefined && patch.pages !== null) {
    const n = parseInt(patch.pages, 10);
    if (isNaN(n) || n < 0 || n > 5000) return 'invalid_pages';
    patch.pages = n;
  }
  if (patch.aggregators !== undefined) {
    if (!Array.isArray(patch.aggregators)) return 'invalid_aggregators';
    patch.aggregators = patch.aggregators
      .map(s => String(s || '').trim()).filter(Boolean).slice(0, 20);
  }
  return null;
}

function validateTranslation(patch) {
  if (patch.status !== undefined && !TRANS_STATUS.has(patch.status)) {
    return 'invalid_status';
  }
  if (patch.title !== undefined && (typeof patch.title !== 'string' || !patch.title.trim())) {
    return 'invalid_title';
  }
  // preview / toc / full_content must be JSON-serialisable (already objects here).
  ['preview', 'toc', 'full_content'].forEach(k => {
    if (patch[k] !== undefined && patch[k] !== null && typeof patch[k] !== 'object') {
      // Allow client to send stringified JSON; parse it here.
      try { patch[k] = JSON.parse(patch[k]); } catch (_) { /* swallow; caught below */ }
    }
  });
  return null;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  // ── Auth + admin allowlist ──────────────────────────────
  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0) { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  const url    = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const id     = url.searchParams.get('id');
  const locale = url.searchParams.get('locale');

  let body = {};
  if (req.method === 'POST' || req.method === 'PATCH') {
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch (_) {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }
  }

  try {
    // ════════════════════════════════════════════════════════
    //  GET  — list  OR  single
    // ════════════════════════════════════════════════════════
    if (req.method === 'GET') {
      if (id) {
        const baseRows = await sb(
          `living_reports?id=eq.${id}&select=*&limit=1`
        );
        const base = Array.isArray(baseRows) ? baseRows[0] : null;
        if (!base) { res.status(404).json({ error: 'not_found' }); return; }
        const translations = await sb(
          `report_translations?report_id=eq.${id}&order=locale.asc&select=*`
        );
        res.status(200).json({ report: base, translations: translations || [] });
        return;
      }
      // List — all statuses, newest first
      const rows = await sb(
        `living_reports?order=updated_at.desc&select=*&limit=500`
      );
      // Pull translation counts so the table can show "EN ✓ JA — KO —"
      let trMap = new Map();
      let statsMap = new Map();
      if (rows.length) {
        const ids = rows.map(r => r.id);
        const idList = ids.join(',');
        // Translations + purchases in parallel — both are independent reads.
        const [trs, purchases] = await Promise.all([
          sb(`report_translations?report_id=in.(${idList})&select=report_id,locale,status`),
          // Sprint 4.2: aggregate purchases per report. We pull all rows
          // (completed + refunded + pending) so the JS aggregator can split
          // them. PostgREST doesn't support GROUP BY in REST API, so we
          // tally client-side. With Year 1 volume this is fine (<1k rows).
          sb(`purchases?report_id=in.(${idList})&select=report_id,status,amount&limit=5000`)
        ]);
        (trs || []).forEach(t => {
          if (!trMap.has(t.report_id)) trMap.set(t.report_id, {});
          trMap.get(t.report_id)[t.locale] = t.status;
        });
        (purchases || []).forEach(p => {
          if (!p.report_id) return;
          const cur = statsMap.get(p.report_id) || { completed: 0, refunded: 0, revenue: 0 };
          if (p.status === 'completed') {
            cur.completed += 1;
            cur.revenue += parseFloat(p.amount) || 0;
          } else if (p.status === 'refunded') {
            cur.refunded += 1;
          }
          statsMap.set(p.report_id, cur);
        });
      }
      const enriched = rows.map(r => ({
        ...r,
        translations: trMap.get(r.id) || {},
        stats: statsMap.get(r.id) || { completed: 0, refunded: 0, revenue: 0 }
      }));
      res.status(200).json({ reports: enriched });
      return;
    }

    // ════════════════════════════════════════════════════════
    //  POST  — create base report  OR  upsert translation
    // ════════════════════════════════════════════════════════
    if (req.method === 'POST') {
      // Translation upsert
      if (id && locale) {
        if (!LOCALES.has(locale)) { res.status(400).json({ error: 'invalid_locale' }); return; }
        const patch = pick(body, TRANSLATION_FIELDS);
        const err = validateTranslation(patch);
        if (err) { res.status(400).json({ error: err }); return; }
        if (!patch.title) { res.status(400).json({ error: 'title_required' }); return; }

        // Auto-set published_at when status flips to published.
        if (patch.status === 'published' && !patch.published_at) {
          patch.published_at = new Date().toISOString();
        }

        const row = {
          report_id: id,
          locale,
          ...patch
        };
        // Upsert via PostgREST: on_conflict on (report_id, locale).
        const inserted = await fetch(
          `${SUPABASE_URL}/rest/v1/report_translations?on_conflict=report_id,locale`,
          {
            method: 'POST',
            headers: {
              'apikey':        SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type':  'application/json',
              'Prefer':        'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(row)
          }
        );
        if (!inserted.ok) {
          const txt = await inserted.text();
          throw new Error(`upsert ${inserted.status}: ${txt}`);
        }
        const data = await inserted.json();
        const row = Array.isArray(data) ? data[0] : data;
        logAudit({
          actor: user.email, action: 'update',
          resourceType: 'report_translation', resourceId: id, resourceLabel: locale,
          diff: { after: row }, req
        });
        res.status(200).json({ ok: true, translation: row });
        return;
      }

      // Create base report
      const patch = pick(body, REPORT_FIELDS);
      const err = validateBase(patch);
      if (err) { res.status(400).json({ error: err }); return; }
      if (!patch.slug || !patch.country || !patch.industry || !patch.year) {
        res.status(400).json({ error: 'missing_required_fields' }); return;
      }
      if (patch.status === 'published' && !patch.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const inserted = await sb('living_reports', 'POST', patch);
      const row = Array.isArray(inserted) ? inserted[0] : inserted;
      logAudit({
        actor: user.email, action: 'create',
        resourceType: 'report', resourceId: row && row.id,
        resourceLabel: patch.slug, diff: { after: row }, req
      });
      res.status(200).json({ ok: true, report: row });
      return;
    }

    // ════════════════════════════════════════════════════════
    //  PATCH  — update base  OR  update translation
    // ════════════════════════════════════════════════════════
    if (req.method === 'PATCH') {
      if (!id) { res.status(400).json({ error: 'id_required' }); return; }

      if (locale) {
        if (!LOCALES.has(locale)) { res.status(400).json({ error: 'invalid_locale' }); return; }
        const patch = pick(body, TRANSLATION_FIELDS);
        const err = validateTranslation(patch);
        if (err) { res.status(400).json({ error: err }); return; }
        if (patch.status === 'published' && !patch.published_at) {
          patch.published_at = new Date().toISOString();
        }
        const updated = await sb(
          `report_translations?report_id=eq.${id}&locale=eq.${locale}`,
          'PATCH', patch
        );
        const row = Array.isArray(updated) ? updated[0] : updated;
        logAudit({
          actor: user.email, action: 'update',
          resourceType: 'report_translation', resourceId: id, resourceLabel: locale,
          diff: { patch, after: row }, req
        });
        res.status(200).json({ ok: true, translation: row });
        return;
      }

      const patch = pick(body, REPORT_FIELDS);
      const err = validateBase(patch);
      if (err) { res.status(400).json({ error: err }); return; }
      if (patch.status === 'published' && !patch.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const updated = await sb(`living_reports?id=eq.${id}`, 'PATCH', patch);
      const row = Array.isArray(updated) ? updated[0] : updated;
      logAudit({
        actor: user.email, action: 'update',
        resourceType: 'report', resourceId: id,
        resourceLabel: row && row.slug, diff: { patch, after: row }, req
      });
      res.status(200).json({ ok: true, report: row });
      return;
    }

    // ════════════════════════════════════════════════════════
    //  DELETE  — soft-delete base  OR  hard-delete translation
    // ════════════════════════════════════════════════════════
    if (req.method === 'DELETE') {
      if (!id) { res.status(400).json({ error: 'id_required' }); return; }
      if (locale) {
        if (!LOCALES.has(locale)) { res.status(400).json({ error: 'invalid_locale' }); return; }
        await sb(`report_translations?report_id=eq.${id}&locale=eq.${locale}`, 'DELETE');
        logAudit({
          actor: user.email, action: 'delete',
          resourceType: 'report_translation', resourceId: id, resourceLabel: locale, req
        });
        res.status(200).json({ ok: true });
        return;
      }
      // Soft-delete base — never hard-delete (would orphan purchases).
      const updated = await sb(`living_reports?id=eq.${id}`, 'PATCH', { status: 'retired' });
      const row = Array.isArray(updated) ? updated[0] : updated;
      logAudit({
        actor: user.email, action: 'delete',
        resourceType: 'report', resourceId: id,
        resourceLabel: row && row.slug, req
      });
      res.status(200).json({ ok: true, report: row });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[admin-reports] error:', err.message);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
}
