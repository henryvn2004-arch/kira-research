// ============================================================
// KIRA RESEARCH — api/chain-search.js
// Public GET. Finds the Kira Chain (value chain of a product or service) that
// matches what a reader typed.
//
// GET /api/chain-search?q=<text>
// → { items: [{ country_code, country_name, slug, name, summary, stats, score }], all: boolean }
//
// With no query (or one shorter than 2 characters) it lists every published
// chain (all: true), which is what the landing page shows as "available now".
// Matching is done here, not in SQL: the table holds one row per product and
// country, so a few hundred rows at most. It forgives case, accents, a typo or
// two, and filler words ("coffee market in vietnam" finds Vietnam · Coffee).
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const STOP = new Set(['in', 'the', 'of', 'and', 'for', 'market', 'markets', 'industry', 'sector',
  'chain', 'value', 'supply', 'companies', 'company', 'players', 'who', 'is', 'a', 'an']);

const norm = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

async function rest(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

function distance(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

function scoreTerm(term, q, qTokens) {
  if (!term) return 0;
  if (term === q) return 100;
  if (term.startsWith(q) || q.startsWith(term)) return 85;
  const tTokens = term.split(' ');
  if (` ${term} `.includes(` ${q} `) || ` ${q} `.includes(` ${term} `)) return 70;
  const d = distance(term, q);
  if (d <= (term.length >= 6 ? 2 : 1)) return 60 - d * 5;
  if (qTokens.some((t) => tTokens.includes(t))) return 55;
  return 0;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const raw = String(req.query?.q || '').slice(0, 80);
  try {
    const [chains, countries] = await Promise.all([
      rest('chains?status=eq.published&select=country_code,slug,name,aliases,summary,stats&limit=500'),
      rest('tax_countries?select=code,name').catch(() => [])
    ]);
    const cname = Object.fromEntries(countries.map((c) => [c.code, c.name]));
    const shape = (c, score) => ({ country_code: c.country_code, country_name: cname[c.country_code] || c.country_code,
      slug: c.slug, name: c.name, summary: c.summary, stats: c.stats, score });

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');

    const qn = norm(raw);
    if (qn.length < 2) return res.status(200).json({ items: chains.map((c) => shape(c, 0)).slice(0, 50), all: true });

    // Country words are not part of the product: use them as a hint only.
    const wanted = new Set();
    let rest_q = ` ${qn} `;
    for (const c of countries) {
      for (const w of [norm(c.name), c.code.toLowerCase()]) {
        if (w.length >= 2 && rest_q.includes(` ${w} `)) { wanted.add(c.code); rest_q = rest_q.replace(` ${w} `, ' '); }
      }
    }
    const qTokens = rest_q.trim().split(' ').filter((t) => t && !STOP.has(t));
    const q = qTokens.join(' ');

    // A query that names a market only returns that market's chains ("rice in thailand" must not show Vietnam).
    const pool = wanted.size ? chains.filter((c) => wanted.has(c.country_code)) : chains;
    const items = pool.map((c) => {
      let best = 0;
      if (q) for (const t of [c.name, ...(c.aliases || [])]) best = Math.max(best, scoreTerm(norm(t), q, qTokens));
      else if (wanted.has(c.country_code)) best = 50;              // only a country was typed: list its chains
      if (best && wanted.has(c.country_code)) best += 10;
      return best >= 50 ? shape(c, best) : null;
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 8);

    return res.status(200).json({ items, all: false });
  } catch (err) {
    console.error('[chain-search]', err.message);
    return res.status(500).json({ error: 'search_failed' });
  }
}
