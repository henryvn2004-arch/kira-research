// ============================================================
// KIRA RESEARCH — api/_lib/econ.js
// Kira Data (D1): pulls free economic series by API and stores them in econ_series (migration 057).
// One adapter per source. Each returns rows { indicator_key, country_code, period, value, is_forecast, source_key, vintage }
// with the same keys, because PostgREST bulk upserts need every object to share them.
//   worldbank_wdi  api.worldbank.org/v2, no key, CC BY 4.0 (public). No Taiwan.
//   imf_weo        IMF SDMX API (api.imf.org, dataflow IMF.RES/WEO), no key. Stored but kept off the site
//                  (data_sources.public = false) until the IMF grants commercial reuse. The DataMapper
//                  website endpoint is not used: its bot protection refuses server requests.
// Used by /api/cron-econ-refresh (weekly).
// ============================================================

// KIRA country code → ISO3 used by the World Bank and the IMF.
export const ISO3 = {
  VN: 'VNM', ID: 'IDN', TH: 'THA', MY: 'MYS', PH: 'PHL', SG: 'SGP', TW: 'TWN', AU: 'AUS',
  NZ: 'NZL', KH: 'KHM', LA: 'LAO', MM: 'MMR', BN: 'BRN', JP: 'JPN', KR: 'KOR'
};
const FROM_ISO3 = Object.fromEntries(Object.entries(ISO3).map(([k, v]) => [v, k]));
export const FIRST_YEAR = 2000;

async function getJson(url, { tries = 3 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)' } });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (err) {
      last = err;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw last;
}

// World Bank: one call per indicator for all countries.
export async function fetchWorldBank(ind) {
  const countries = Object.values(ISO3).filter((c) => c !== 'TWN').join(';');
  const year = new Date().getUTCFullYear();
  const url = `https://api.worldbank.org/v2/country/${countries}/indicator/${encodeURIComponent(ind.source_code)}` +
    `?format=json&date=${FIRST_YEAR}:${year}&per_page=5000`;
  const body = await getJson(url);
  if (!Array.isArray(body) || !Array.isArray(body[1])) {
    if (Array.isArray(body) && body[0] && body[0].total === 0) return [];
    throw new Error(`World Bank: unexpected reply for ${ind.source_code}`);
  }
  const rows = [];
  for (const o of body[1]) {
    const cc = FROM_ISO3[o.countryiso3code];
    if (!cc || o.value === null || o.value === undefined || !/^\d{4}$/.test(o.date)) continue;
    rows.push({ indicator_key: ind.key, country_code: cc, period: o.date, value: Number(o.value), is_forecast: false, source_key: ind.source_key, vintage: null });
  }
  return rows;
}

// IMF WEO through SDMX 3.0: one call per indicator for all countries. Values come in base units.
// Years from the current one onward are projections.
export async function fetchImf(ind) {
  const key = `${Object.values(ISO3).join('+')}.${encodeURIComponent(ind.source_code)}.A`;
  const body = await getJson(`https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.RES/WEO/+/${key}?dimensionAtObservation=TIME_PERIOD&attributes=dsd&measures=all`);
  const st = body && body.data && body.data.structures && body.data.structures[0];
  const ds = body && body.data && body.data.dataSets && body.data.dataSets[0];
  if (!st || !ds) throw new Error(`IMF: unexpected reply for ${ind.source_code}`);
  const dims = st.dimensions.series;
  const cIdx = dims.findIndex((d) => d.id === 'COUNTRY');
  const years = st.dimensions.observation[0].values.map((v) => v.value);
  const thisYear = new Date().getUTCFullYear();
  const rows = [];
  for (const [sk, ser] of Object.entries(ds.series || {})) {
    const cc = FROM_ISO3[dims[cIdx].values[Number(sk.split(':')[cIdx])].id];
    if (!cc) continue;
    const vintage = Array.isArray(ser.attributes) ? ser.attributes.find((a) => typeof a === 'string') || null : null;
    for (const [oi, obs] of Object.entries(ser.observations || {})) {
      const y = years[Number(oi)];
      const yr = Number(y);
      const v = Number(obs && obs[0]);
      if (!/^\d{4}$/.test(y) || obs[0] === null || !Number.isFinite(v) || yr < FIRST_YEAR || yr > thisYear + 5) continue;
      rows.push({ indicator_key: ind.key, country_code: cc, period: y, value: v, is_forecast: yr >= thisYear, source_key: ind.source_key, vintage });
    }
  }
  return rows;
}

const ADAPTERS = { worldbank_wdi: fetchWorldBank, imf_weo: fetchImf };

// Fetches every active indicator; one failing indicator does not stop the others.
export async function collect(indicators) {
  const rows = [];
  const errors = [];
  for (const ind of indicators) {
    const fn = ADAPTERS[ind.source_key];
    if (!fn) continue;
    try {
      rows.push(...(await fn(ind)));
    } catch (err) {
      errors.push(`${ind.key}: ${err.message}`);
    }
  }
  return { rows, errors };
}
