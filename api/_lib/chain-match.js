// ============================================================
// KIRA RESEARCH — api/_lib/chain-match.js
// How a reader's words are matched to a Kira Chain. Shared by /api/chain-search (what the reader
// sees) and /api/notify-chain-published (who gets emailed), so the two can never disagree.
// It forgives case, accents, a typo or two, and filler words; a country word is only a hint.
// ============================================================

export const STOP = new Set(['in', 'the', 'of', 'and', 'for', 'market', 'markets', 'industry', 'sector',
  'chain', 'value', 'supply', 'companies', 'company', 'players', 'who', 'is', 'a', 'an']);

export const norm = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

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

export function scoreTerm(term, q, qTokens) {
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


// → [{ chain, score }] best first. `countries` = [{ code, name }]; a query that names a market only
// returns that market's chains ("rice in thailand" must not show Vietnam). minScore 50 = what search shows.
export function matchChains(raw, chains, countries, minScore = 50) {
  const qn = norm(raw);
  if (qn.length < 2) return [];
  const wanted = new Set();
  let rest_q = ` ${qn} `;
  for (const c of countries) {
    for (const w of [norm(c.name), c.code.toLowerCase()]) {
      if (w.length >= 2 && rest_q.includes(` ${w} `)) { wanted.add(c.code); rest_q = rest_q.replace(` ${w} `, ' '); }
    }
  }
  const qTokens = rest_q.trim().split(' ').filter((t) => t && !STOP.has(t));
  const q = qTokens.join(' ');
  const pool = wanted.size ? chains.filter((c) => wanted.has(c.country_code)) : chains;
  return pool.map((c) => {
    let best = 0;
    if (q) for (const t of [c.name, ...(c.aliases || [])]) best = Math.max(best, scoreTerm(norm(t), q, qTokens));
    else if (wanted.has(c.country_code)) best = 50;              // only a country was typed: list its chains
    if (best && wanted.has(c.country_code)) best += 10;
    return best >= minScore ? { chain: c, score: best } : null;
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}
