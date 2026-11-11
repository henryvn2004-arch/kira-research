// ============================================================
// KIRA RESEARCH — api/admin-geo.js
// Admin view of the GEO data layer (migration 065) and the LinkedIn post queue.
//
//   GET  /api/admin-geo            → { health, queue, log_ready }
//   POST /api/admin-geo            body { transcript_slug, posted: true|false } → { ok }   (migration 066 geo_post_log)
//
// health  published answers/claims (total, per country), rows added in 1 / 7 days, last insert per source,
//         indexable hubs and trade pages (same rules as api/_lib/geo.js), documents published in the last
//         7 days with no rows yet (= a daily hook failed).
// queue   one ready-to-copy LinkedIn post per transcript with published field claims, newest first:
//         2 claims + the basis label + the transcript link + the segment hub link (else the trade page, if indexable).
// Auth: Bearer <supabase-jwt>, email in ADMIN_EMAILS.
// ============================================================
import { sb, docTitles, tradeIndex, tradeTopicIndexable, industrySlug, topicSlug, listHubs, countryByCode, slugOf, segmentName, TOPIC_LABEL } from './_lib/geo.js';
import { geoHealth } from './_lib/geo-health.js';
import { logAudit } from './_lib/audit.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const BASE = 'https://kiraresearch.com';
const SLUG_RE = /^[a-z0-9][a-z0-9-]+$/;
const MAX_POSTS = 15;

async function verifyBearer(req) {
  const m = (req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${m[1]}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? { id: u.id, email: u.email.toLowerCase() } : null;
  } catch (_e) { return null; }
}

// Brand rules (CLAUDE.md): no "AI", no "Claude", no competitor names in copy. A claim that has one is not used.
const BANNED = /\bAI\b|artificial intelligence|\bclaude\b|\bmckinsey\b|\bmordor\b|\bfrost\b|\beuromonitor\b|\bsynovate\b|\bipsos\b/i;
const LABEL = 'KIRA field research';

function pickClaims(claims) {
  const clean = claims.filter((c) => c.claim_text && c.claim_text.length <= 260 && !BANNED.test(c.claim_text) && !BANNED.test(c.speaker_role || ''));
  const first = clean[0];
  if (!first) return [];
  const second = clean.find((c) => c.id !== first.id && c.topic !== first.topic) || clean.find((c) => c.id !== first.id);
  return second ? [first, second] : [first];
}

async function buildQueue() {
  const rows = await sb('field_claims?status=eq.published&select=id,topic,industry,country_code,speaker_role,claim_text,transcript_slug,basis_label,created_at&order=created_at.desc&limit=600');
  const bySlug = new Map();
  for (const r of rows) {
    if (!bySlug.has(r.transcript_slug)) bySlug.set(r.transcript_slug, []);
    bySlug.get(r.transcript_slug).push(r);
  }
  const slugs = [...bySlug.keys()].slice(0, MAX_POSTS * 2);
  const titles = (await docTitles(slugs)).transcripts;            // published transcripts only
  const [trade, hubs] = await Promise.all([tradeIndex(), listHubs()]);
  const out = [];
  for (const slug of slugs) {
    if (!titles.has(slug)) continue;
    const all = bySlug.get(slug).slice().reverse();               // oldest first = the order of the interview
    const picked = pickClaims(all);
    if (!picked.length) continue;
    const c0 = picked[0];
    // Link to the most specific page that is indexable (the same rules as the sitemap): the segment hub, else the
    // trade page, else only the transcript. field_claims.industry is a level-2 segment slug or null.
    let pageUrl = null, pageLabel = null;
    if (c0.industry) {
      const hub = hubs.find((h) => h.code === c0.country_code && h.segment === c0.industry && h.indexable);
      const co = hub ? await countryByCode(c0.country_code) : null;
      if (hub && co) {
        pageUrl = `${BASE}/en/markets/${slugOf(co.name)}/${hub.segment}`;
        pageLabel = `${await segmentName(hub.segment)} in ${co.name}`;
      } else {
        const isl = industrySlug(c0.industry);
        const ind = trade.idx.get(isl);
        if (ind) {
          const good = picked.find((c) => ind.topics.get(c.topic) && tradeTopicIndexable(ind.topics.get(c.topic), c.topic));
          if (good) { pageUrl = `${BASE}/en/trade/${isl}/${topicSlug(good.topic)}`; pageLabel = `${ind.name}: ${TOPIC_LABEL[good.topic] || good.topic}`; }
        }
      }
    }
    const basis = BANNED.test(c0.basis_label || '') ? '' : String(c0.basis_label || '').trim();
    const basisLine = basis.toLowerCase().includes(LABEL.toLowerCase()) ? basis : `${LABEL}${basis ? ` (${basis})` : ''}`;
    const title = titles.get(slug);
    const url = `${BASE}/en/experts/transcripts/${slug}`;
    const text = [
      title,
      '',
      `Two things practitioners said in ${LABEL}:`,
      ...picked.map((c) => `• “${c.claim_text.trim()}” (${c.speaker_role})`),
      '',
      `Basis: ${basisLine}.`,
      `Full interview: ${url}`,
      pageUrl ? `More on ${pageLabel}: ${pageUrl}` : null,
    ].filter((l) => l !== null).join('\n');
    out.push({ transcript_slug: slug, title, newest_claim_at: bySlug.get(slug)[0].created_at, claims: picked.length, text });
    if (out.length >= MAX_POSTS) break;
  }
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)                              { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)          { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const slug = String(b.transcript_slug || '');
      if (!SLUG_RE.test(slug) || typeof b.posted !== 'boolean') { res.status(400).json({ error: 'bad_request' }); return; }
      const hdr = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
      const r = b.posted
        ? await fetch(`${SUPABASE_URL}/rest/v1/geo_post_log?on_conflict=transcript_slug`, {
            method: 'POST', headers: { ...hdr, Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ transcript_slug: slug, posted_at: new Date().toISOString(), posted_by: user.email }),
          })
        : await fetch(`${SUPABASE_URL}/rest/v1/geo_post_log?transcript_slug=eq.${encodeURIComponent(slug)}`, { method: 'DELETE', headers: hdr });
      if (!r.ok) { console.error('[admin-geo] log write:', r.status); res.status(r.status === 404 ? 409 : 500).json({ error: r.status === 404 ? 'log_not_ready' : 'server_error' }); return; }
      logAudit({ actor: user.email, action: 'update', resourceType: 'geo_post', resourceId: slug, resourceLabel: b.posted ? 'posted' : 'unposted', req });
      res.status(200).json({ ok: true });
      return;
    }

    const [health, queue, log] = await Promise.all([
      geoHealth(),
      buildQueue(),
      sb('geo_post_log?select=transcript_slug,posted_at,posted_by&limit=2000').catch(() => null),   // null until migration 066 is applied
    ]);
    const posted = new Map((log || []).map((r) => [r.transcript_slug, r]));
    res.status(200).json({
      health,
      queue: queue.map((q) => ({ ...q, posted: posted.has(q.transcript_slug) ? posted.get(q.transcript_slug) : null })),
      log_ready: log !== null,
    });
  } catch (err) {
    console.error('[admin-geo] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
