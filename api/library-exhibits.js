// ============================================================
// KIRA RESEARCH — api/library-exhibits.js
// The numbers behind a report's exhibits, as an Excel or PowerPoint file (S12).
//
//   GET /api/library-exhibits?slug=X&format=xlsx|pptx       Authorization: Bearer <supabase-jwt>
//   → the file (attachment)
//
// 401 not signed in · 413 the deck would pass Vercel's 4.5 MB answer limit (use Excel) · 402 neither bought nor subscribed (the admin team passes) · 404 no such report,
// or this report has no exhibit data (reports made before S12) · 400 bad slug / format.
// Data: table report_exhibits (migration 053), written at publish by scripts/publish-exhibits.mjs.
// Nothing is counted: anyone who may read the report in full may take its numbers.
// ============================================================

import { activeSubscription } from './_lib/subscription.js';
import { verifyBearer, SLUG_RE } from './_lib/transcripts.js';
import { buildXlsx, buildPptx } from './_lib/exhibits.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }

  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const slug = url.searchParams.get('slug') || '';
  const format = url.searchParams.get('format') || '';
  if (!SLUG_RE.test(slug)) { res.status(400).json({ error: 'bad_slug' }); return; }
  if (!TYPES[format]) { res.status(400).json({ error: 'bad_format' }); return; }

  try {
    const base = (await sb(`living_reports?slug=eq.${encodeURIComponent(slug)}&select=id,slug,code&limit=1`))[0];
    if (!base) { res.status(404).json({ error: 'report_not_found' }); return; }

    const admins = (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    let allowed = admins.includes(user.email);
    if (!allowed) allowed = (await sb(`purchases?user_id=eq.${user.id}&slug=eq.${encodeURIComponent(slug)}&status=eq.completed&select=id&limit=1`)).length > 0;
    if (!allowed) allowed = !!(await activeSubscription(user.id));
    if (!allowed) { res.status(402).json({ error: 'not_purchased' }); return; }

    const row = (await sb(`report_exhibits?report_id=eq.${base.id}&select=data&limit=1`))[0];
    if (!row || !row.data || !Array.isArray(row.data.exhibits) || !row.data.exhibits.length) { res.status(404).json({ error: 'no_exhibit_data' }); return; }

    // Title for the file: English title of the report (the exhibits are in English).
    const tr = (await sb(`report_translations?report_id=eq.${base.id}&locale=eq.en&select=title&limit=1`))[0];
    const report = { title: (tr && tr.title) || base.slug, code: base.code };
    const buf = format === 'xlsx' ? await buildXlsx(report, row.data) : await buildPptx(report, row.data);
    // Vercel answers up to 4.5 MB; a deck of very many charts could pass it, then Excel is the way.
    if (buf.length > 4.3 * 1024 * 1024) { res.status(413).json({ error: 'file_too_large' }); return; }
    const stem = String(base.code || base.slug).replace(/[^A-Za-z0-9._-]+/g, '_');
    res.setHeader('Content-Type', TYPES[format]);
    res.setHeader('Content-Disposition', `attachment; filename="KIRA_${stem}_exhibits.${format}"`);
    res.status(200).send(buf);
  } catch (err) {
    console.error('[library-exhibits] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
