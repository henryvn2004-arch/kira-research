// "Coming soon" entries for the library list: topics in the production queue that have no report yet.
// Used by api/library-list.js when the page asks for status=all or status=soon.
//
//   soonRows(f)    one page of topics shaped like library rows ({ soon: true, ... }), plus the total
//   soonFacets()   counts for the sidebar (market, sector, year, stage), cached for 10 minutes
//
// Filters mirror the published ones where the data allows it: market, sector (tax_industries.sector,
// migration 055), year, stage (competency stage: explore/enter/expand = XPL/ENT/XPN), industry, text in
// the title. Every queued topic is a deep report ('D'); the snapshot type ('S') has none.
import { plannedOf } from './planned.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const STAGE_OF = { XPL: 'explore', ENT: 'enter', XPN: 'expand' };
const CODE_OF = { explore: 'XPL', enter: 'ENT', expand: 'XPN' };
const BASE = 'status=eq.queued&report_id=is.null';

async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, Prefer: 'count=exact' }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const rows = await res.json();
  const total = parseInt((res.headers.get('content-range') || '').split('/')[1], 10);
  return { rows, total: Number.isFinite(total) ? total : rows.length };
}

// f: { country, industry, sector, year, stage (XPL|ENT|XPN), type, q, offset, limit }
export async function soonRows(f) {
  if (f.type && f.type !== 'D') return { rows: [], total: 0 };          // topics are all deep reports
  const where = [BASE];
  if (f.country)  where.push(`tax_countries.name=ilike.${encodeURIComponent(f.country)}`);
  if (f.industry) where.push(`tax_industries.name=ilike.${encodeURIComponent(`*${f.industry}*`)}`);
  if (f.sector)   where.push(`tax_industries.sector=eq.${encodeURIComponent(f.sector)}`);
  if (f.year)     where.push(`year=eq.${f.year}`);
  if (f.stage)    where.push(`tax_competencies.stage=eq.${STAGE_OF[f.stage]}`);
  if (f.q)        where.push(`title=ilike.${encodeURIComponent(`*${f.q}*`)}`);
  const competency = f.stage ? 'tax_competencies!inner(stage)' : 'tax_competencies(stage)';
  const { rows, total } = await sb(
    `topics?${where.join('&')}&order=priority_score.desc.nullslast,slug.asc&limit=${f.limit}&offset=${f.offset}` +
    `&select=slug,title,year,signals,tax_countries!inner(name),tax_industries!inner(name,sector),${competency}`
  );
  return {
    total,
    rows: rows.map(t => ({
      soon: true,
      code: null, slug: t.slug,
      country: t.tax_countries ? t.tax_countries.name : null,
      industry: t.tax_industries ? t.tax_industries.name : null,
      sector: t.tax_industries ? t.tax_industries.sector || null : null,
      year: t.year, pages: null, price: null,
      stage: t.tax_competencies ? CODE_OF[t.tax_competencies.stage] || null : null,
      type: 'D', published_at: null, cover: null,
      title: t.title,
      hook: t.signals && typeof t.signals.hook === 'string' ? t.signals.hook.slice(0, 160) : null,
      excerpt: null, locale: null, hasTranslation: false,
      planned: !!plannedOf(t.signals)
    }))
  };
}

let cache = null;   // { at, data } — warm function instances reuse it; the CDN caches the response too
export async function soonFacets() {
  if (cache && Date.now() - cache.at < 600000) return cache.data;
  const all = [];
  // PostgREST returns at most 1000 rows a request: read the queue in pages (about 1,900 topics today).
  for (let off = 0; off < 8000; off += 1000) {
    const { rows } = await sb(
      `topics?${BASE}&order=slug.asc&limit=1000&offset=${off}` +
      '&select=year,tax_countries(name),tax_industries(sector),tax_competencies(stage)'
    );
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  const data = { total: all.length, countries: {}, sectors: {}, years: {}, stages: {} };
  const bump = (o, k) => { if (k) o[k] = (o[k] || 0) + 1; };
  all.forEach(r => {
    bump(data.countries, r.tax_countries && r.tax_countries.name ? r.tax_countries.name.toLowerCase() : '');
    bump(data.sectors, r.tax_industries && r.tax_industries.sector);
    bump(data.years, r.year);
    bump(data.stages, r.tax_competencies && CODE_OF[r.tax_competencies.stage]);
  });
  cache = { at: Date.now(), data };
  return data;
}
