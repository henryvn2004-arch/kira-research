// Kira Data (D4) adapter: GDELT DOC 2.0 API (news search, no key). Fifteen small queries cover the 15 markets, for headlines that
// pair an investor country with an investment verb; rules.js keeps the ones it can classify. GDELT asks for at
// most one request every 5 seconds, so calls are spaced 6 s and a 429 waits and retries.
import { HOSTS, HOST_NAME } from './rules.js';
import { sleep } from '../econ/util.js';

const API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const VERBS = '(acquire OR acquisition OR stake OR invest OR investment OR factory OR plant OR subsidiary OR "joint venture" OR expansion)';

let last = 0;
async function get(url) {
  let why = 'no answer';   // last failure, so a run that gives up says what GDELT said (status + start of the body)
  for (let i = 0; i < 3; i++) {
    const wait = last + 6000 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' }, signal: AbortSignal.timeout(20000) }); }
    catch (e) { why = `${e.name}: ${e.cause && e.cause.code ? e.cause.code : e.message}`.slice(0, 150); continue; }   // timed out or reset: try again
    if (r.status === 429 || r.status >= 500) {
      const b = await r.text().catch(() => '');
      why = `HTTP ${r.status} ${b.replace(/\s+/g, ' ').trim().slice(0, 150)}`;
      await sleep(8000 * (i + 1)); continue;
    }
    if (!r.ok) throw new Error(`GDELT ${r.status}`);
    const t = await r.text();
    if (!t.trim()) return {};   // GDELT answers an empty body when nothing matches
    try { return JSON.parse(t); } catch (_e) { throw new Error('GDELT: ' + t.slice(0, 80)); }   // a plain-text error (query syntax)
  }
  throw new Error(`GDELT: gave up after 3 tries, last: ${why}`);
}

// → [{ source_key, url, title, domain, lang, event_date, tier }] (classification happens in index.js)
// GDELT answers "Your query was too short or too long." (or resets the connection) when one query holds too many OR terms: 17 terms
// (2 investors + 10 verbs + 5 markets) is accepted, 19 or more is not (measured 2026-11-14). So each query pairs ONE investor country
// (its noun and adjective) with the full verb list and 5 markets: 5 investors x 3 market groups = 15 queries of 17 terms. Market groups
// are the outer loop, so a run cut short by budgetMs still reads every market for some investors; a query not reached is reported and
// caught up by the next daily run (each run reads 3 days of news). rules.js finds the market and investor of each headline.
const GROUPS = [HOSTS.slice(0, 5), HOSTS.slice(5, 10), HOSTS.slice(10)];
const INVESTOR_PAIRS = [['Japan', 'Japanese'], ['Korea', 'Korean'], ['Taiwan', 'Taiwanese'], ['Singapore', 'Singaporean'], ['China', 'Chinese']];
const quoted = (h) => (HOST_NAME[h].includes(' ') ? `"${HOST_NAME[h]}"` : HOST_NAME[h]);

export function queries() {
  const out = [];
  for (const g of GROUPS) for (const inv of INVESTOR_PAIRS) {
    out.push({ hosts: g, query: `(${inv.join(' OR ')}) ${VERBS} (${g.map(quoted).join(' OR ')}) sourcelang:english` });
  }
  return out;
}

export async function items({ days = 3, budgetMs = 600000, log = null } = {}) {
  const out = [], failedHosts = new Set();
  let lastError = '', ok = 0;
  const t0 = Date.now();
  for (const q of queries()) {
    if (Date.now() - t0 > budgetMs) { q.hosts.forEach((h) => failedHosts.add(h)); continue; }
    const qs = new URLSearchParams({ query: q.query, mode: 'artlist', format: 'json', maxrecords: '250', timespan: `${days}d`, sort: 'datedesc' });
    let body;
    try { body = await get(`${API}?${qs.toString()}`); } catch (e) { q.hosts.forEach((h) => failedHosts.add(h)); lastError = e.message; if (log) log(q.query.slice(0, 40), 'failed: ' + e.message); continue; }   // one busy query should not stop the others
    ok++;
    if (log) log(q.query.slice(0, 40), (body.articles || []).length);
    for (const a of body.articles || []) {
      const d = /^(\d{4})(\d{2})(\d{2})/.exec(a.seendate || '');
      if (!a.url || !a.title || !d) continue;
      out.push({ source_key: 'gdelt', url: a.url, title: a.title.replace(/\s+([,.:;!?'’])/g, '$1').replace(/\s+-\s+/g, '-').trim(), domain: a.domain || null,
        lang: 'en', event_date: `${d[1]}-${d[2]}-${d[3]}`, tier: 'news' });
    }
  }
  if (!ok) throw new Error('GDELT: every query failed; ' + lastError);
  if (failedHosts.size) { out.failed = [...failedHosts]; out.lastError = lastError; }
  return out;
}
