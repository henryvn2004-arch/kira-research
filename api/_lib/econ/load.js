// ============================================================
// KIRA RESEARCH — api/_lib/econ/load.js
// The reads behind GET /api/econ and the server-rendered /<locale>/data/<country> page (api/econ-page.js):
// one place, so the JSON and the HTML always carry the same figures.
// ============================================================
import { LINK_PRODUCTS, summarise } from './summarise.js';
import { COUNTRY_MIN } from './coverage.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export async function sb(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}
// PostgREST returns at most 1000 rows per request; page through longer reads.
export async function sbAll(path) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sb(`${path}&limit=1000&offset=${offset}`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

export const slugOf = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');


// Public sources and their active indicators. `sources` is empty until a source is marked public.
export async function loadBase() {
  const [countries, sources] = await Promise.all([
    sb('tax_countries?select=code,name,ord&order=ord'),
    sb('data_sources?public=eq.true&select=key,name,url,licence,attribution')
  ]);
  if (!sources.length) return { countries, sources, indicators: [], srcIn: '' };
  const srcIn = `in.(${sources.map((s) => s.key).join(',')})`;
  const indicators = await sb(`econ_indicators?active=eq.true&source_key=${srcIn}&select=key,source_key,country_code,label,unit,freq,ord,params&order=ord`);
  return { countries, sources, indicators, srcIn };
}

// Every public indicator and link for one market (q = slug or ISO code). null when the market is unknown.
export async function loadCountry(base, q) {
  const { countries, sources, indicators, srcIn } = base;
  const country = countries.find((c) => c.code === String(q).toUpperCase() || slugOf(c.name) === slugOf(q));
  if (!country) return null;
  const since = String(new Date().getUTCFullYear() - 3);
  const [rows, flowRows] = await Promise.all([
    sbAll(`econ_series?country_code=eq.${country.code}&source_key=${srcIn}` +
      `&select=indicator_key,period,value,is_forecast,retrieved_at&order=indicator_key.asc,period.asc`),
    sbAll(`econ_flows?or=(reporter.eq.${country.code},partner.eq.${country.code})&source_key=${srcIn}` +
      `&product=in.(${LINK_PRODUCTS.join(',')})&period=gte.${since}` +
      `&select=source_key,reporter,partner,product,flow,freq,period,value,currency,retrieved_at` +
      // Sort on the whole primary key: paging over a non-unique sort repeats and skips rows.
      `&order=source_key,reporter,partner,product,flow,freq,period.desc`)
  ]);
  const byInd = {};
  let updated = null;
  for (const r of rows) {
    (byInd[r.indicator_key] = byInd[r.indicator_key] || []).push([r.period, r.value, r.is_forecast]);
    if (!updated || r.retrieved_at > updated) updated = r.retrieved_at;
  }
  for (const r of flowRows) if (!updated || r.retrieved_at > updated) updated = r.retrieved_at;
  const flows = summarise(flowRows);
  // Same rule as data_page_coverage(): indicators with an actual (not forecast) value in the last 3 years.
  const recent = new Set(rows.filter((r) => !r.is_forecast && r.period >= since).map((r) => r.indicator_key));
  return {
    country: { code: country.code, name: country.name, slug: slugOf(country.name) },
    updated_at: updated,
    indicators: indicators.filter((i) => byInd[i.key]).map((i) => ({ ...i, series: byInd[i.key] })),
    flows,
    indexable: recent.size >= COUNTRY_MIN,
    names: Object.fromEntries(countries.map((c) => [c.code, c.name])),
    sources: sources.filter((s) => indicators.some((i) => i.source_key === s.key && byInd[i.key]) || flows.some((f) => f.source_key === s.key))
  };
}
