// ============================================================
// KIRA RESEARCH — api/_lib/econ/index.js
// Kira Data: pulls free economic series by API into econ_series (migration 057) and bilateral trade into
// econ_flows (migration 058). One adapter file per source; this file only routes and collects.
// An adapter exports `series(ind, ctx)` → rows { indicator_key, country_code, period, value, is_forecast, source_key, vintage }
// (every row has the same keys: PostgREST bulk upserts need that) and/or `flows(ctx)` → econ_flows rows.
// A source whose data_sources.env_key is not set in the environment is skipped and reported as waiting for its key.
// Used by /api/cron-econ-refresh (weekly).
// ============================================================

import * as worldbank from './worldbank.js';
import * as imf from './imf.js';
import * as psa from './psa.js';
import * as boj from './boj.js';
import * as vnNso from './vn-nso.js';
import * as ecos from './ecos.js';
import * as bot from './bot.js';
import * as estat from './estat.js';
import * as krCustoms from './kr-customs.js';
import * as opendosm from './opendosm.js';
import * as bnm from './bnm.js';
import * as singstat from './singstat.js';

export { ISO3, FIRST_YEAR } from './util.js';

// `own: true` = a heavy source that runs in its own cron slot (/api/cron-econ-refresh?source=<key>), not in the default run.
const ADAPTERS = {
  worldbank_wdi: { series: worldbank.fetchWorldBank },
  imf_weo: { series: imf.fetchImf },
  psa_openstat: { series: psa.series, flows: psa.flows },
  boj: { series: boj.series, flows: boj.flows },
  vn_nso: { series: vnNso.series },
  bok_ecos: { series: ecos.series },
  bot: { series: bot.series },
  opendosm: { series: opendosm.series, flows: opendosm.flows },
  bnm: { series: bnm.series },
  singstat: { series: singstat.series, flows: singstat.flows },
  estat: { flows: estat.flows, own: true },
  kr_customs: { flows: krCustoms.flows, own: true }
};

// indicators: econ_indicators rows; sources: data_sources rows ({ key, env_key });
// only: run just this source key (its own cron slot); otherwise run every source not marked `own`.
export async function collect(indicators, sources = [], { only = null } = {}) {
  const runs = (key) => (only ? key === only : !(ADAPTERS[key] && ADAPTERS[key].own));
  const envOf = Object.fromEntries(sources.map((s) => [s.key, s.env_key]));
  const missingKey = (src) => envOf[src] && !process.env[envOf[src]];
  const rows = [];
  const flows = [];
  const errors = [];
  const waiting = new Set();
  for (const ind of indicators) {
    const ad = ADAPTERS[ind.source_key];
    if (!ad || !ad.series || !runs(ind.source_key)) continue;
    if (missingKey(ind.source_key)) { waiting.add(ind.source_key); continue; }
    try {
      rows.push(...(await ad.series(ind, { env: process.env[envOf[ind.source_key]] })));
    } catch (err) {
      errors.push(`${ind.key}: ${err.message}`);
    }
  }
  for (const [key, ad] of Object.entries(ADAPTERS)) {
    if (!ad.flows || !runs(key)) continue;
    if (missingKey(key)) { waiting.add(key); continue; }
    try {
      flows.push(...(await ad.flows({ env: process.env[envOf[key]] })));
    } catch (err) {
      errors.push(`${key} flows: ${err.message}`);
    }
  }
  return { rows, flows, errors, waiting: [...waiting] };
}
