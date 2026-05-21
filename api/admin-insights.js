// ============================================================
// KIRA RESEARCH — api/admin-insights.js
// Admin CRUD for insights + insight_translations.
// Mirrors api/admin-reports.js; see that file for endpoint shape.
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

const LOCALES         = new Set(['en','ja','ko']);
const INSIGHT_STATUS  = new Set(['draft','review','published','retired']);

const INSIGHT_FIELDS = [
  'slug', 'category', 'country', 'industry',
  'featured', 'related_report_slugs', 'status', 'published_at'
];
const TRANSLATION_FIELDS = [
  'title', 'excerpt', 'lede', 'body', 'read_time',
  'status', 'published_at'
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
  if (patch.status !== undefined && !INSIGHT_STATUS.has(patch.status)) {
    return 'invalid_status';
  }
  if (patch.featured !== undefined) {
    patch.featured = patch.featured === true || patch.featured === 'true';
  }
  if (patch.related_report_slugs !== undefined) {
    if (!Array.isArray(patch.related_report_slugs)) return 'invalid_related';
    patch.related_report_slugs = patch.related_report_slugs
      .map(s => String(s || '').trim()).filter(Boolean).slice(0, 20);
  }
  ['category','country','industry'].forEach(k => {
    if (patch[k] !== undefined && patch[k] !== null) {
      patch[k] = String(patch[k]).trim().toLowerCase() || null;
    }
  });
  return null;
}

function validateTranslation(patch) {
  if (patch.status !== undefined && !INSIGHT_STATUS.has(patch.status)) return 'invalid_status';
  if (patch.title !== undefined && (typeof patch.title !== 'string' || !patch.title.trim())) {
    return 'invalid_title';
  }
  return null;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

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
    if (req.method === 'GET') {
      if (id) {
        const baseRows = await sb(`insights?id=eq.${id}&select=*&limit=1`);
        const base = Array.isArray(baseRows) ? baseRows[0] : null;
        if (!base) { res.status(404).json({ error: 'not_found' }); return; }
        const translations = await sb(
          `insight_translations?insight_id=eq.${id}&order=locale.asc&select=*`
        );
        res.status(200).json({ insight: base, translations: translations || [] });
        return;
      }
      const rows = await sb(`insights?order=updated_at.desc&select=*&limit=500`);
      let trMap = new Map();
      if (rows.length) {
        const ids = rows.map(r => r.id);
        const trs = await sb(
          `insight_translations?insight_id=in.(${ids.join(',')})&select=insight_id,locale,status`
        );
        (trs || []).forEach(t => {
          if (!trMap.has(t.insight_id)) trMap.set(t.insight_id, {});
          trMap.get(t.insight_id)[t.locale] = t.status;
        });
      }
      const enriched = rows.map(r => ({ ...r, translations: trMap.get(r.id) || {} }));
      res.status(200).json({ insights: enriched });
      return;
    }

    if (req.method === 'POST') {
      if (id && locale) {
        if (!LOCALES.has(locale)) { res.status(400).json({ error: 'invalid_locale' }); return; }
        const patch = pick(body, TRANSLATION_FIELDS);
        const err = validateTranslation(patch);
        if (err) { res.status(400).json({ error: err }); return; }
        if (!patch.title) { res.status(400).json({ error: 'title_required' }); return; }
        if (patch.status === 'published' && !patch.published_at) {
          patch.published_at = new Date().toISOString();
        }
        const payload = { insight_id: id, locale, ...patch };
        const inserted = await fetch(
          `${SUPABASE_URL}/rest/v1/insight_translations?on_conflict=insight_id,locale`,
          {
            method: 'POST',
            headers: {
              'apikey':        SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type':  'application/json',
              'Prefer':        'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(payload)
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
          resourceType: 'insight_translation', resourceId: id, resourceLabel: locale,
          diff: { after: row }, req
        });
        res.status(200).json({ ok: true, translation: row });
        return;
      }

      const patch = pick(body, INSIGHT_FIELDS);
      const err = validateBase(patch);
      if (err) { res.status(400).json({ error: err }); return; }
      if (!patch.slug) { res.status(400).json({ error: 'slug_required' }); return; }
      if (patch.status === 'published' && !patch.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const inserted = await sb('insights', 'POST', patch);
      const row = Array.isArray(inserted) ? inserted[0] : inserted;
      logAudit({
        actor: user.email, action: 'create',
        resourceType: 'insight', resourceId: row && row.id,
        resourceLabel: patch.slug, diff: { after: row }, req
      });
      res.status(200).json({ ok: true, insight: row });
      return;
    }

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
          `insight_translations?insight_id=eq.${id}&locale=eq.${locale}`,
          'PATCH', patch
        );
        const row = Array.isArray(updated) ? updated[0] : updated;
        logAudit({
          actor: user.email, action: 'update',
          resourceType: 'insight_translation', resourceId: id, resourceLabel: locale,
          diff: { patch, after: row }, req
        });
        res.status(200).json({ ok: true, translation: row });
        return;
      }
      const patch = pick(body, INSIGHT_FIELDS);
      const err = validateBase(patch);
      if (err) { res.status(400).json({ error: err }); return; }
      if (patch.status === 'published' && !patch.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const updated = await sb(`insights?id=eq.${id}`, 'PATCH', patch);
      const row = Array.isArray(updated) ? updated[0] : updated;
      logAudit({
        actor: user.email, action: 'update',
        resourceType: 'insight', resourceId: id,
        resourceLabel: row && row.slug, diff: { patch, after: row }, req
      });
      res.status(200).json({ ok: true, insight: row });
      return;
    }

    if (req.method === 'DELETE') {
      if (!id) { res.status(400).json({ error: 'id_required' }); return; }
      if (locale) {
        if (!LOCALES.has(locale)) { res.status(400).json({ error: 'invalid_locale' }); return; }
        await sb(`insight_translations?insight_id=eq.${id}&locale=eq.${locale}`, 'DELETE');
        logAudit({
          actor: user.email, action: 'delete',
          resourceType: 'insight_translation', resourceId: id, resourceLabel: locale, req
        });
        res.status(200).json({ ok: true });
        return;
      }
      // Soft-delete (insights aren't paid content, but we keep the row for backlinks).
      const updated = await sb(`insights?id=eq.${id}`, 'PATCH', { status: 'retired' });
      const row = Array.isArray(updated) ? updated[0] : updated;
      logAudit({
        actor: user.email, action: 'delete',
        resourceType: 'insight', resourceId: id,
        resourceLabel: row && row.slug, req
      });
      res.status(200).json({ ok: true, insight: row });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[admin-insights] error:', err.message);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
}
