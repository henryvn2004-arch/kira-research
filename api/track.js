// ============================================================
// KIRA RESEARCH — api/track.js
// Receives the first-party funnel events sent by /js/track.js and stores one row each in
// site_events (migration 037). Public by nature, so it is defensive:
//   - POST only; answers 204 whatever it decides (nothing to probe)
//   - only accepts requests whose Origin is the production site (previews / local are ignored)
//   - drops bots by user agent (headless browsers, crawlers, link previewers, our own smoke tests)
//   - strict allowlist for event names and shapes; path only (query string never stored)
//   - best-effort per-IP rate limit in memory; the IP itself is never stored
// Nothing identifies a person: sid is a random per-tab id.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const EVENTS = new Set(['pageview', 'search', 'request_email', 'waitlist', 'lead']);
const LOCALES = new Set(['en', 'ja', 'ko', 'zh']);
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|preview|facebookexternalhit|embedly|monitor|uptime|curl|wget|python|node-fetch|axios|go-http|java\/|httpclient|playwright|puppeteer|selenium|phantom/i;
const ORIGIN = /^https:\/\/(www\.)?kiraresearch\.com$/;

// Per-instance, best effort: 120 events / minute / IP.
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.t > 60000) { hits.set(ip, { t: now, n: 1 }); if (hits.size > 5000) hits.clear(); return false; }
  rec.n++;
  return rec.n > 120;
}

function pathInfo(path) {
  const m = path.match(/^\/(en|ja|ko|zh)(\/.*)?$/);
  const locale = m ? m[1] : null;
  const rest = (m ? (m[2] || '') : path).replace(/\/+$/, '');
  let kind = 'other';
  if (rest === '' ) kind = 'home';
  else if (rest === '/library') kind = 'library';
  else if (rest === '/pricing') kind = 'pricing';
  else if (/^\/insights(\/|$)/.test(rest)) kind = 'insight';
  else if (/^\/reports\/[^/]+$/.test(rest)) kind = 'report';
  return { locale, kind };
}

function sourceOf(refHost, utm) {
  if (utm && /^[a-z0-9_.-]{1,40}$/i.test(utm)) return utm.toLowerCase();
  const h = String(refHost || '').toLowerCase().replace(/^www\./, '');
  if (!h || /(^|\.)kiraresearch\.com$/.test(h)) return null;       // direct, or internal navigation
  if (/(^|\.)google\./.test(h)) return 'google';
  if (/(^|\.)bing\.com$/.test(h)) return 'bing';
  if (/duckduckgo\.com$/.test(h)) return 'duckduckgo';
  if (/(^|\.)naver\.com$/.test(h)) return 'naver';
  if (/(^|\.)baidu\.com$/.test(h)) return 'baidu';
  if (/(^|\.)yahoo\./.test(h)) return 'yahoo';
  if (/(^|\.)linkedin\.com$|^lnkd\.in$/.test(h)) return 'linkedin';
  if (/(^|\.)facebook\.com$|^fb\.com$/.test(h)) return 'facebook';
  if (/^t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/.test(h)) return 'x';
  return /^[a-z0-9.-]{1,60}$/.test(h) ? h.slice(0, 40) : 'other';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).end(); return; }
  res.status(204).end();                                   // always the same answer; work continues below

  try {
    if (!ORIGIN.test(String(req.headers['origin'] || ''))) return;
    const ua = String(req.headers['user-agent'] || '');
    if (!ua || BOT.test(ua)) return;
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (limited(ip)) return;

    let b = req.body;
    if (typeof b === 'string') { if (b.length > 2000) return; try { b = JSON.parse(b); } catch (_e) { return; } }
    if (!b || typeof b !== 'object') return;

    const event = String(b.e || '');
    const sid   = String(b.s || '');
    const path  = String(b.p || '').split('?')[0].split('#')[0].slice(0, 200);
    if (!EVENTS.has(event) || !/^[a-z0-9]{8,40}$/.test(sid) || !path.startsWith('/')) return;

    const { locale, kind } = pathInfo(path);
    const row = {
      sid, event, path,
      locale: locale && LOCALES.has(locale) ? locale : null,
      kind: event === 'pageview' ? kind : null,
      src: event === 'pageview' ? sourceOf(b.r, b.u) : null,
      hit: event === 'search' ? b.h === true : null
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/site_events`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(row)
    });
    if (!r.ok) console.warn('[track] insert failed', r.status);
  } catch (err) {
    console.warn('[track] error:', err.message);
  }
}
