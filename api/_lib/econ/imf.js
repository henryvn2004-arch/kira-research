// Kira Data adapter: IMF WEO through the official SDMX API (api.imf.org). No key. Stored, kept off the site
// until the IMF grants commercial reuse. The DataMapper website endpoint refuses server requests (bot protection).
import { getJson, ISO3, FROM_ISO3, FIRST_YEAR } from './util.js';

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
