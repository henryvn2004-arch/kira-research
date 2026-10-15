// Kira Data (D4) adapter: GDELT DOC 2.0 API (news search, no key). Three queries cover the 15 markets, for headlines that
// pair an investor country with an investment verb; rules.js keeps the ones it can classify. GDELT asks for at
// most one request every 5 seconds, so calls are spaced 6 s and a 429 waits and retries.
import { HOSTS, HOST_NAME } from './rules.js';
import { sleep } from '../econ/util.js';

const API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const INVESTORS = '(Japan OR Japanese OR Korea OR Korean OR Taiwan OR Taiwanese OR Singapore OR Singaporean OR China OR Chinese)';
const VERBS = '(acquire OR acquisition OR stake OR invest OR investment OR factory OR plant OR subsidiary OR "joint venture" OR expansion)';

let last = 0;
async function get(url) {
  for (let i = 0; i < 3; i++) {
    const wait = last + 6000 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' }, signal: AbortSignal.timeout(20000) }); }
    catch (_e) { continue; }   // timed out: try again
    if (r.status === 429 || r.status >= 500) { await sleep(8000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`GDELT ${r.status}`);
    const t = await r.text();
    if (!t.trim()) return {};   // GDELT answers an empty body when nothing matches
    try { return JSON.parse(t); } catch (_e) { throw new Error('GDELT: ' + t.slice(0, 80)); }   // a plain-text error (query syntax)
  }
  throw new Error('GDELT: busy (429/5xx/timeout after 3 tries)');
}

// → [{ source_key, url, title, domain, lang, event_date, tier }] (classification happens in index.js)
// The 15 markets go in 3 queries of 5 (GDELT allows one request every 5 seconds); rules.js finds the market of
// each headline. budgetMs keeps one run inside the function's time limit; a group not reached is reported and
// caught up by the next daily run (each run reads 3 days of news).
const GROUPS = [HOSTS.slice(0, 5), HOSTS.slice(5, 10), HOSTS.slice(10)];
const quoted = (h) => (HOST_NAME[h].includes(' ') ? `"${HOST_NAME[h]}"` : HOST_NAME[h]);

export async function items({ days = 3, budgetMs = 600000, log = null } = {}) {
  const out = [], failed = [];
  const t0 = Date.now();
  for (const g of GROUPS) {
    if (Date.now() - t0 > budgetMs) { failed.push(...g); continue; }
    const qs = new URLSearchParams({ query: `${INVESTORS} ${VERBS} (${g.map(quoted).join(' OR ')}) sourcelang:english`, mode: 'artlist', format: 'json',
      maxrecords: '250', timespan: `${days}d`, sort: 'datedesc' });
    let body;
    try { body = await get(`${API}?${qs.toString()}`); } catch (_e) { failed.push(...g); if (log) log(g.join(','), 'failed'); continue; }   // one busy query should not stop the others
    if (log) log(g.join(','), (body.articles || []).length);
    for (const a of body.articles || []) {
      const d = /^(\d{4})(\d{2})(\d{2})/.exec(a.seendate || '');
      if (!a.url || !a.title || !d) continue;
      out.push({ source_key: 'gdelt', url: a.url, title: a.title.replace(/\s+([,.:;!?'’])/g, '$1').replace(/\s+-\s+/g, '-').trim(), domain: a.domain || null,
        lang: 'en', event_date: `${d[1]}-${d[2]}-${d[3]}`, tier: 'news' });
    }
  }
  if (failed.length === HOSTS.length) throw new Error('GDELT: every query failed');
  if (failed.length) out.failed = failed;
  return out;
}
