// Kira Data (D7): which data pages carry enough data to be indexed (and listed in the sitemap).
// One rule for the sitemap and for the pages' own robots tag (the APIs return `indexable`):
//   country page   >= COUNTRY_MIN public indicators with a value in the last 3 years
//   corridor page  >= PAIR_MIN distinct public flow links between the two countries in the last 3 years,
//                  or at least one published move
// Counts come from the SQL function data_page_coverage() (migration 063).

export const COUNTRY_MIN = 8;
export const PAIR_MIN = 3;

const since = () => String(new Date().getUTCFullYear() - 3);

export async function coverage() {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/data_page_coverage`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ since: since() })
  });
  if (!r.ok) throw new Error(`coverage ${r.status}: ${await r.text()}`);
  const country = {}, pair = {};
  for (const row of await r.json()) {
    if (row.kind === 'country') country[row.a] = row.n;
    else pair[[row.a, row.b].sort().join('|')] = row.n;
  }
  return { country, pair };
}

export const countryIndexable = (cov, code) => (cov.country[code] || 0) >= COUNTRY_MIN;
export const pairIndexable = (cov, a, b, moves = 0) => moves > 0 || (cov.pair[[a, b].sort().join('|')] || 0) >= PAIR_MIN;
