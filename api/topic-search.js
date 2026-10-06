// ============================================================
// KIRA RESEARCH — api/topic-search.js
// Public. The "no published report" layers of library search.
//
// GET  /api/topic-search?q=convenience stores vietnam
//   Read only. Planned topics matching the query (typo-tolerant, pg_trgm).
//   → { items: [{ slug, title, country, country_code, industry, competency, year, state }] }
//
// POST /api/topic-search  { q, unmet? }
//   Same answer, plus the demand side. `unmet: true` means the library found
//   no published report for this query, so:
//     • a planned topic that matches gets search_count + 1;
//     • if no topic matches but the query names exactly one market and an
//       industry KIRA covers there (an active tax_country_industry pair), a
//       placeholder topic is created (status 'proposed', one per pair) and
//       returned, so the reader lands on a page with that name;
//     • otherwise, if the query names exactly one market, Claude Haiku decides
//       (api/_lib/search-interpret.js) whether it is a lawful product or service
//       that belongs under one of that market's covered industries; if so a
//       placeholder named after the query is created ("Condom market in Australia");
//     • anything else is counted in search_misses and returns no items.
//   The market + covered-industry requirement, the model's judgement, a hard
//   denylist and a daily call budget are the spam bound; no human review needed.
//
//   state  scoping       proposed or requested — not approved yet, no date promised
//          in_progress   approved or queued — in the production queue
// ============================================================

import { interpretSearch, coveredIndustries } from './_lib/search-interpret.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function rpc(name, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!r.ok) throw new Error(`Supabase ${name} ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

// Letters/digits/space/&/- only; short queries match too much.
function cleanQuery(raw) {
  return String(raw || '').replace(/[^\p{L}\p{N} &-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

const item = t => ({
  slug: t.slug, title: t.title, country: t.country_name, country_code: t.country_code,
  industry: t.industry, competency: t.competency, year: t.year,
  state: t.status === 'approved' || t.status === 'queued' ? 'in_progress' : 'scoping'
});

// The reader's own wording as the title, only when every word is part of the
// market name, the industry name or filler. Otherwise the title is built from
// the taxonomy, so a search string can never put arbitrary text on a public page.
function titleFor(q, countryName, industryName) {
  const words = s => s.toLowerCase().replace(/[^a-z0-9& ]+/g, ' ').split(/\s+/).filter(Boolean);
  const allowed = new Set([...words(countryName), ...words(industryName), 'in', 'the', 'of', 'for', 'a', 'korea']);
  const ws = words(q);
  if (ws.length && ws.every(w => allowed.has(w))) {
    let s = q.replace(/\s+/g, ' ').trim();
    s = s.charAt(0).toUpperCase() + s.slice(1);
    const esc = countryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return s.replace(new RegExp('\\b' + esc + '\\b', 'i'), countryName).slice(0, 120);
  }
  return `${industryName} in ${countryName}`.slice(0, 120);
}

// Neutral outline of what a market overview covers; the owner edits it when approving.
const outline = (industry, country) => [
  `How large is the ${industry} market in ${country}, and how fast is it growing?`,
  'Who are the leading players, and what share does each hold?',
  'Where is the white space for a foreign entrant, and which segments are already crowded?',
  'What would make it a go or no-go, and what are the first steps?'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let q, unmet = false;
  if (req.method === 'POST') {
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
    catch { return res.status(400).json({ error: 'invalid_json' }); }
    q = cleanQuery(body && body.q);
    unmet = !!(body && body.unmet);
  } else {
    q = cleanQuery((req.query || {}).q);
  }
  if (q.length < 3) return res.status(200).json({ items: [] });

  try {
    const rows = await rpc('search_topics', { q, lim: 6 });
    if (rows.length) {
      if (req.method === 'POST' && unmet && rows[0].score >= 0.6) await rpc('bump_topic_search', { p_slug: rows[0].slug });
      if (req.method === 'GET') res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).json({ items: rows.map(item) });
    }

    if (req.method === 'POST' && unmet) {
      const pair = (await rpc('resolve_search_pair', { q }))[0];
      if (pair) {
        const title = titleFor(q, pair.country_name, pair.industry_name);
        const made = (await rpc('ensure_search_topic', {
          p_cc: pair.country_code, p_industry: pair.industry_id, p_title: title,
          p_questions: outline(pair.industry_name, pair.country_name)
        }))[0];
        if (made && made.o_status !== 'rejected') {
          await rpc('bump_topic_search', { p_slug: made.o_slug });
          return res.status(200).json({ items: [{
            slug: made.o_slug, title: made.o_title, country: pair.country_name, country_code: pair.country_code,
            industry: pair.industry_name, competency: null, year: 2027, state: 'scoping'
          }] });
        }
      }
      // Not an exact industry: let the model file it under a covered parent industry.
      const ctry = (await rpc('search_country', { q }))[0];
      if (ctry && ctry.rest) {
        const verdict = await interpretSearch(ctry, await coveredIndustries(ctry.country_code), ctry.rest);
        if (verdict.ok) {
          const made = (await rpc('ensure_reader_topic', {
            p_cc: ctry.country_code, p_industry: verdict.industryId, p_slug: verdict.slug, p_title: verdict.title,
            p_questions: outline(verdict.topic.toLowerCase(), ctry.country_name)
          }))[0];
          if (made && made.o_status !== 'rejected') {
            await rpc('bump_topic_search', { p_slug: made.o_slug });
            return res.status(200).json({ items: [{
              slug: made.o_slug, title: made.o_title, country: ctry.country_name, country_code: ctry.country_code,
              industry: verdict.industryName, competency: null, year: 2027, state: 'scoping'
            }] });
          }
        }
      }
      await rpc('log_search_miss', { p_kw: q });
    }
    return res.status(200).json({ items: [] });
  } catch (err) {
    console.error('[topic-search]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
}
