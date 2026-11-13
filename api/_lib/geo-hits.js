// ============================================================
// KIRA RESEARCH — api/_lib/geo-hits.js
// Server-side log of AI crawler / AI-user requests on the server-rendered pages (api/ssr.js, api/geo.js).
//   logGeoHit(req, path)   fire-and-forget: classifies the user agent, writes nothing for ordinary visitors,
//                          never throws, never delays the page (waitUntil keeps the write alive after the reply).
// Table geo_hits (migration 067) through the geo_hit_add() RPC. Counts only requests that reach the function:
// a page the edge serves from cache is not counted (the edge cache is 10 min + stale-while-revalidate).
// ============================================================
import { waitUntil } from '@vercel/functions';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Order matters: the first match wins (Claude-SearchBot before ClaudeBot, OAI-SearchBot before a generic "bot").
export const AGENTS = [
  ['OAI-SearchBot', 'crawler'], ['GPTBot', 'crawler'], ['ChatGPT-User', 'ai_user'],
  ['Claude-SearchBot', 'crawler'], ['Claude-User', 'ai_user'], ['ClaudeBot', 'crawler'],
  ['Perplexity-User', 'ai_user'], ['PerplexityBot', 'crawler'],
  ['Google-Extended', 'crawler'], ['Googlebot', 'crawler'], ['bingbot', 'crawler'], ['Applebot', 'crawler'],
  ['Bytespider', 'crawler'], ['CCBot', 'crawler'], ['Meta-ExternalAgent', 'crawler'],
];

export function classify(ua) {
  const s = String(ua || '').toLowerCase();
  if (!s) return null;
  for (const [name, kind] of AGENTS) if (s.includes(name.toLowerCase())) return { name, kind };
  return null;
}

async function write(hit, path) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/geo_hit_add`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_day: new Date().toISOString().slice(0, 10), p_name: hit.name, p_kind: hit.kind, p_path: path }),
    });
    if (!r.ok) console.warn('[geo-hits] write failed', r.status);
  } catch (e) { console.warn('[geo-hits]', e.message); }
}

export function logGeoHit(req, path) {
  try {
    const hit = classify(req.headers && req.headers['user-agent']);
    if (!hit || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
    const p = String(path || '').split('?')[0].slice(0, 200);
    if (!p.startsWith('/')) return;
    const job = write(hit, p);
    try { waitUntil(job); } catch (_e) { /* not on Vercel: the promise still runs */ }
  } catch (_e) { /* logging must never break a page */ }
}
