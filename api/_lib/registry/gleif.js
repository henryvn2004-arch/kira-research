// Kira Data (D5) adapter: GLEIF API (Global LEI Index, CC0, no key, about 60 requests a minute).
//   findLei({ name, country })      → { lei, legal_name, status, founded, reg_id, parent_lei, ultimate_parent_lei } or null
//   newEntities(country, sinceDate) → LEI records of legal entities (not funds) founded in `country` since the date
//   ultimateParent(lei)             → { lei, name, country } or null
import { sameName } from './names.js';
import { sleep } from '../econ/util.js';

const API = 'https://api.gleif.org/api/v1';
let last = 0;
async function get(path) {
  for (let i = 0; i < 3; i++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    let r;
    try { r = await fetch(`${API}${path}`, { headers: { Accept: 'application/vnd.api+json' }, signal: AbortSignal.timeout(20000) }); } catch (_e) { continue; }
    if (r.status === 404) return null;                       // e.g. no parent reported
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`GLEIF ${r.status}`);
    return r.json();
  }
  throw new Error('GLEIF: busy');
}

const names = (a) => [a.entity.legalName && a.entity.legalName.name, ...(a.entity.otherNames || []).map((n) => n.name),
  ...(a.entity.transliteratedOtherNames || []).map((n) => n.name)].filter(Boolean);

function record(a) {
  return { lei: a.lei, legal_name: a.entity.legalName.name, status: a.entity.status, founded: a.entity.creationDate ? a.entity.creationDate.slice(0, 10) : null,
    reg_id: a.entity.registeredAs || null, country: a.entity.legalAddress && a.entity.legalAddress.country, category: a.entity.category || null,
    english_name: names(a).find((n) => /^[\x20-\x7E]+$/.test(n)) || a.entity.legalName.name };
}

export async function findLei({ name, country }) {
  const qs = `filter[fulltext]=${encodeURIComponent(name)}${country ? `&filter[entity.legalAddress.country]=${country}` : ''}&page[size]=10`;
  const body = await get(`/lei-records?${qs}`);
  const hit = ((body && body.data) || []).find((r) => names(r.attributes).some((n) => sameName(n, name)));
  if (!hit) return null;
  const rec = record(hit.attributes);
  const [dp, up] = [await get(`/lei-records/${rec.lei}/direct-parent`), await get(`/lei-records/${rec.lei}/ultimate-parent`)];
  rec.parent_lei = dp && dp.data ? dp.data.attributes.lei : null;
  rec.ultimate_parent_lei = up && up.data ? up.data.attributes.lei : null;
  return rec;
}

export async function newEntities(country, since) {
  const out = [];
  for (let page = 1; page <= 3; page++) {
    const body = await get(`/lei-records?filter[entity.legalAddress.country]=${country}&filter[entity.creationDate]=>${since}&page[size]=200&page[number]=${page}`);
    const data = (body && body.data) || [];
    out.push(...data.map((r) => record(r.attributes)).filter((r) => r.category !== 'FUND'));   // funds and ETFs are not company moves
    if (!body || page >= body.meta.pagination.lastPage) break;
  }
  return out;
}

export async function ultimateParent(lei) {
  const up = await get(`/lei-records/${lei}/ultimate-parent`);
  if (!up || !up.data) return null;
  const r = record(up.data.attributes);
  return { lei: r.lei, name: r.english_name, country: r.country };
}
