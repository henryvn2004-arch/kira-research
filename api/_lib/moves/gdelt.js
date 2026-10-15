// Kira Data (D4) adapter: GDELT DOC 2.0 API (news search, no key). One query per host market for headlines that
// pair an investor country with an investment verb; rules.js keeps the ones it can classify. GDELT asks for at
// most one request every 5 seconds, so calls are spaced 6 s and a 429 waits and retries.
import { HOSTS, HOST_NAME } from './rules.js';
import { sleep } from '../econ/util.js';

const API = 'https://api.gdeltproject.org/api/v2/doc/doc';
const INVESTORS = '(Japan OR Japanese OR Korea OR Korean OR Taiwan OR Taiwanese OR Singapore OR Singaporean OR China OR Chinese)';
const VERBS = '(acquire OR acquisition OR stake OR invest OR investment OR factory OR plant OR subsidiary OR "joint venture" OR expansion)';

let last = 0;
async function get(url) {
  for (let i = 0; i < 4; i++) {
    const wait = last + 6000 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' }, signal: AbortSignal.timeout(30000) }); }
    catch (_e) { continue; }   // timed out: try again
    if (r.status === 429 || r.status >= 500) { await sleep(10000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`GDELT ${r.status}`);
    const t = await r.text();
    if (!t.trim()) return {};   // GDELT answers an empty body when nothing matches
    try { return JSON.parse(t); } catch (_e) { throw new Error('GDELT: ' + t.slice(0, 80)); }   // a plain-text error (query syntax)
  }
  throw new Error('GDELT: busy (429/5xx after 4 tries)');
}

// → [{ source_key, url, title, domain, lang, event_date, tier }] (classification happens in index.js)
export async function items({ days = 3 } = {}) {
  const out = [], failed = [];
  for (const h of HOSTS) {
    const name = HOST_NAME[h].includes(' ') ? `"${HOST_NAME[h]}"` : HOST_NAME[h];
    const qs = new URLSearchParams({ query: `${INVESTORS} ${VERBS} ${name} sourcelang:english`, mode: 'artlist', format: 'json', maxrecords: '75', timespan: `${days}d`, sort: 'datedesc' });
    let body;
    try { body = await get(`${API}?${qs.toString()}`); } catch (_e) { failed.push(h); continue; }   // one busy query should not stop the others
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
