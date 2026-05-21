// ============================================================
// KIRA RESEARCH — api/admin-aggregators.js
// Admin CRUD for aggregator submissions + sales (Sprint 4.4).
//
// Year 1 distribution = manual: owner submits reports to aggregators
// (ResearchAndMarkets, GIIResearch, etc.) and types entries here when
// they report sales back. No automation Year 1 (per Decisions Log).
//
// Auth: Authorization: Bearer <jwt> + email in ADMIN_EMAILS.
//
//   GET    /api/admin-aggregators?kind=submissions
//          ?aggregator=<slug>          · optional
//          ?status=<pending|approved|rejected|live>  · optional
//          → { items: [ {..., report_title, report_slug} ] }
//
//   GET    /api/admin-aggregators?kind=sales
//          ?aggregator=<slug>          · optional
//          → { items: [...] }
//
//   GET    /api/admin-aggregators?kind=summary
//          → { submissions_by_status, sales_total_count, sales_net_usd, sales_by_aggregator }
//
//   POST   /api/admin-aggregators?kind=submissions  body { report_id, locale, aggregator, ... } → { item }
//   POST   /api/admin-aggregators?kind=sales        body { report_id, locale, aggregator, gross_amount, ... } → { item }
//
//   PATCH  /api/admin-aggregators?kind=submissions&id=<uuid>  body { ... } → { item }
//   PATCH  /api/admin-aggregators?kind=sales&id=<uuid>        body { ... } → { item }
//
//   DELETE /api/admin-aggregators?kind=submissions&id=<uuid>  → { ok }
//   DELETE /api/admin-aggregators?kind=sales&id=<uuid>        → { ok }
// ============================================================

import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

async function supabase(path, method = 'GET', body = null) {
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
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${m[1]}` }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? { id: u.id, email: u.email.toLowerCase() } : null;
  } catch (_) { return null; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Validation ───────────────────────────────────────────
const LOCALES   = new Set(['en', 'ja', 'ko']);
const STATUSES  = new Set(['pending', 'approved', 'rejected', 'live']);
// Loose slug for aggregator names — kebab-case, allows numbers. Owner
// types these; we don't enforce a closed enum because adding partners
// shouldn't need a code change.
const AGGR_RE   = /^[a-z0-9][a-z0-9-]{1,40}$/;

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function clean(s, max = 500) {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// PostgREST IN clause helper (uuid list — input is server-side).
function inList(values) {
  return '(' + values.map(v => `"${String(v).replace(/"/g, '')}"`).join(',') + ')';
}

// ── Enrich rows with report title + slug ─────────────────
async function enrichWithReports(rows) {
  if (!Array.isArray(rows) || !rows.length) return rows || [];

  const reportIds = [...new Set(rows.map(r => r.report_id).filter(Boolean))];
  if (!reportIds.length) return rows;

  const [reports, translations] = await Promise.all([
    supabase(`living_reports?id=in.${inList(reportIds)}&select=id,slug`).catch(() => []),
    supabase(
      `report_translations?report_id=in.${inList(reportIds)}&select=report_id,locale,title`
    ).catch(() => [])
  ]);

  const slugMap  = new Map();
  const titleMap = new Map();
  for (const r of Array.isArray(reports) ? reports : [])        slugMap.set(r.id, r.slug);
  for (const t of Array.isArray(translations) ? translations : []) titleMap.set(`${t.report_id}|${t.locale}`, t.title);

  return rows.map(r => ({
    ...r,
    report_slug:  slugMap.get(r.report_id) || null,
    report_title: titleMap.get(`${r.report_id}|${r.locale}`) || null
  }));
}

// ── Handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const me = await verifyBearer(req);
  if (!me)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)        { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(me.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  const url  = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const kind = url.searchParams.get('kind');
  const id   = url.searchParams.get('id');

  // ── Summary endpoint ──
  if (req.method === 'GET' && kind === 'summary') {
    try {
      const [subs, sales] = await Promise.all([
        supabase('aggregator_submissions?select=status&limit=10000').catch(() => []),
        supabase('aggregator_sales?select=aggregator,net_amount,currency&limit=10000').catch(() => [])
      ]);

      const submissions_by_status = {};
      for (const s of subs) {
        const k = s.status || 'pending';
        submissions_by_status[k] = (submissions_by_status[k] || 0) + 1;
      }

      let sales_net_usd = 0;
      const sales_by_aggregator = {};
      for (const s of sales) {
        // Year 1 assumption: all aggregator sales reported in USD. If
        // currency mixing happens later this aggregation needs a split.
        const net = parseFloat(s.net_amount);
        if (Number.isFinite(net)) sales_net_usd += net;
        const k = s.aggregator || 'unknown';
        sales_by_aggregator[k] = (sales_by_aggregator[k] || 0) + (Number.isFinite(net) ? net : 0);
      }

      res.status(200).json({
        submissions_by_status,
        submissions_total: subs.length,
        sales_total_count: sales.length,
        sales_net_usd:     Math.round(sales_net_usd * 100) / 100,
        sales_by_aggregator
      });
      return;
    } catch (err) {
      console.error('[admin-aggregators] summary failed:', err.message);
      res.status(500).json({ error: 'server_error' });
      return;
    }
  }

  if (kind !== 'submissions' && kind !== 'sales') {
    res.status(400).json({ error: 'bad_kind', message: "kind must be one of 'submissions', 'sales', 'summary'" });
    return;
  }

  const table = kind === 'submissions' ? 'aggregator_submissions' : 'aggregator_sales';

  try {
    // ─────────── GET list ───────────
    if (req.method === 'GET') {
      const filters = ['select=*'];

      if (kind === 'submissions') {
        filters.push('order=created_at.desc', 'limit=500');
        const status = url.searchParams.get('status');
        if (status && STATUSES.has(status)) filters.push(`status=eq.${status}`);
      } else {
        filters.push('order=sold_at.desc', 'limit=500');
      }

      const aggregator = url.searchParams.get('aggregator');
      if (aggregator && AGGR_RE.test(aggregator)) {
        filters.push(`aggregator=eq.${encodeURIComponent(aggregator)}`);
      }

      const reportSlug = url.searchParams.get('slug');
      if (reportSlug && /^[a-z0-9][a-z0-9-]+$/.test(reportSlug)) {
        // Need a join to filter by slug — fetch report id first.
        const rep = await supabase(
          `living_reports?slug=eq.${encodeURIComponent(reportSlug)}&select=id&limit=1`
        ).catch(() => []);
        const rid = Array.isArray(rep) && rep[0] ? rep[0].id : null;
        if (!rid) {
          res.status(200).json({ items: [] });
          return;
        }
        filters.push(`report_id=eq.${rid}`);
      }

      const rows  = await supabase(`${table}?` + filters.join('&'));
      const items = await enrichWithReports(rows);
      res.status(200).json({ items });
      return;
    }

    // ─────────── POST create ───────────
    if (req.method === 'POST') {
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      } catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }

      if (!isUuid(body.report_id))            { res.status(400).json({ error: 'bad_report_id' }); return; }
      if (!LOCALES.has(body.locale))          { res.status(400).json({ error: 'bad_locale' }); return; }
      const aggregator = clean(body.aggregator, 60).toLowerCase();
      if (!AGGR_RE.test(aggregator))          { res.status(400).json({ error: 'bad_aggregator' }); return; }

      // Verify the report actually exists before inserting a dangling row.
      const rep = await supabase(
        `living_reports?id=eq.${body.report_id}&select=id&limit=1`
      ).catch(() => []);
      if (!Array.isArray(rep) || !rep[0]) {
        res.status(404).json({ error: 'report_not_found' });
        return;
      }

      let row;
      if (kind === 'submissions') {
        row = {
          report_id:      body.report_id,
          locale:         body.locale,
          aggregator,
          submitted_at:   body.submitted_at || null,
          status:         STATUSES.has(body.status) ? body.status : 'pending',
          aggregator_url: clean(body.aggregator_url, 500) || null,
          commission_pct: num(body.commission_pct),
          contact_name:   clean(body.contact_name, 120) || null,
          contact_email:  clean(body.contact_email, 200) || null,
          notes:          clean(body.notes, 2000) || null
        };
      } else {
        const gross = num(body.gross_amount);
        if (gross == null || gross < 0) { res.status(400).json({ error: 'bad_gross_amount' }); return; }
        row = {
          report_id:      body.report_id,
          locale:         body.locale,
          aggregator,
          sold_at:        body.sold_at || new Date().toISOString(),
          gross_amount:   gross,
          commission_pct: num(body.commission_pct),
          net_amount:     num(body.net_amount),
          currency:       clean(body.currency, 4) || 'USD',
          buyer_country:  clean(body.buyer_country, 60) || null,
          notes:          clean(body.notes, 2000) || null
        };
      }

      const inserted = await supabase(table, 'POST', row);
      const item = Array.isArray(inserted) && inserted[0] ? inserted[0] : null;
      const enriched = (await enrichWithReports([item]))[0] || item;
      logAudit({
        actor: user.email, action: 'create',
        resourceType: kind === 'submissions' ? 'aggregator_submission' : 'aggregator_sale',
        resourceId: item && item.id,
        resourceLabel: `${aggregator}/${body.locale}`, diff: { after: item }, req
      });
      res.status(200).json({ item: enriched });
      return;
    }

    // ─────────── PATCH update ───────────
    if (req.method === 'PATCH') {
      if (!isUuid(id)) { res.status(400).json({ error: 'bad_id' }); return; }
      let body;
      try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      } catch (_) { res.status(400).json({ error: 'invalid_json' }); return; }

      const patch = {};
      if (kind === 'submissions') {
        if (body.status && STATUSES.has(body.status)) patch.status = body.status;
        if (typeof body.aggregator_url === 'string')  patch.aggregator_url = clean(body.aggregator_url, 500) || null;
        if (typeof body.notes          === 'string')  patch.notes          = clean(body.notes, 2000)        || null;
        if (typeof body.contact_name   === 'string')  patch.contact_name   = clean(body.contact_name, 120)  || null;
        if (typeof body.contact_email  === 'string')  patch.contact_email  = clean(body.contact_email, 200) || null;
        if (body.commission_pct != null)              patch.commission_pct = num(body.commission_pct);
        if (body.submitted_at)                        patch.submitted_at   = body.submitted_at;
      } else {
        if (body.gross_amount != null) {
          const g = num(body.gross_amount);
          if (g == null || g < 0) { res.status(400).json({ error: 'bad_gross_amount' }); return; }
          patch.gross_amount = g;
        }
        if (body.commission_pct != null) patch.commission_pct = num(body.commission_pct);
        if (body.net_amount     != null) patch.net_amount     = num(body.net_amount);
        if (body.sold_at)                patch.sold_at        = body.sold_at;
        if (typeof body.currency      === 'string') patch.currency      = clean(body.currency, 4) || 'USD';
        if (typeof body.buyer_country === 'string') patch.buyer_country = clean(body.buyer_country, 60) || null;
        if (typeof body.notes         === 'string') patch.notes         = clean(body.notes, 2000) || null;
      }
      if (Object.keys(patch).length === 0) { res.status(400).json({ error: 'no_fields' }); return; }

      const updated = await supabase(`${table}?id=eq.${id}`, 'PATCH', patch);
      const item = Array.isArray(updated) && updated[0] ? updated[0] : null;
      if (!item) { res.status(404).json({ error: 'not_found' }); return; }
      const enriched = (await enrichWithReports([item]))[0] || item;
      logAudit({
        actor: user.email, action: 'update',
        resourceType: kind === 'submissions' ? 'aggregator_submission' : 'aggregator_sale',
        resourceId: id, diff: { patch, after: item }, req
      });
      res.status(200).json({ item: enriched });
      return;
    }

    // ─────────── DELETE ───────────
    if (req.method === 'DELETE') {
      if (!isUuid(id)) { res.status(400).json({ error: 'bad_id' }); return; }
      await supabase(`${table}?id=eq.${id}`, 'DELETE');
      logAudit({
        actor: user.email, action: 'delete',
        resourceType: kind === 'submissions' ? 'aggregator_submission' : 'aggregator_sale',
        resourceId: id, req
      });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[admin-aggregators] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
