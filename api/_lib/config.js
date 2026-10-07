// ============================================================
// KIRA RESEARCH — api/_lib/config.js
// Owner-editable settings that take effect without a deploy (table app_config, migration 036,
// edited on /en/admin/config). Every setting is registered here with its type, limits and the
// default the code used before it became editable, so:
//   - a missing row, a bad value or an unreachable database all fall back to the default
//     (the site never breaks because of config);
//   - the admin page can only write values that pass validation here.
// Read with `await getConfig('key')`; instances cache the table for 60 s, so a change is live
// within about a minute everywhere.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export const CONFIG = {
  'search.auto_placeholders': {
    group: 'Search', type: 'bool', default: true,
    label: 'Create placeholder pages for product searches automatically',
    help: 'On: a search such as "condom market in australia" gets a coming-soon page after an AI check. Off: that step is skipped and the reader sees the plain request form (everything else about search is unchanged).'
  },
  'search.daily_model_limit': {
    group: 'Search', type: 'int', min: 0, max: 5000, default: 300, unit: 'calls per 24 h',
    label: 'Daily limit for the AI check behind automatic placeholders',
    help: 'Caps how many new searches per 24 hours may be sent to the model. 0 stops new checks (cached answers still work). This is the spending cap for that feature.'
  },
  'topics.demand_weight_request': {
    group: 'Topic queue', type: 'int', min: 0, max: 50, default: 3, unit: 'points',
    label: 'Demand points for an "email me when it is ready" request',
    help: 'Topics with more demand points are produced first and shown first in Topics. A reader who leaves an email is a stronger signal than a search, hence more points.'
  },
  'topics.demand_weight_search': {
    group: 'Topic queue', type: 'int', min: 0, max: 50, default: 1, unit: 'points',
    label: 'Demand points for one search that found nothing',
    help: 'Added once per search that matched no published report. Set to 0 to rank by email requests only.'
  },
  'pipeline.stale_minutes': {
    group: 'Report pipeline', type: 'int', min: 60, max: 600, default: 150, unit: 'minutes',
    label: 'A running report counts as stuck after',
    help: 'If a stage has been "in progress" longer than this, the next runner fire puts it back and the Pipeline page flags it. Keep it above the longest stage (English generation can take 90 minutes).'
  },
  'pipeline.stalled_hours': {
    group: 'Report pipeline', type: 'int', min: 6, max: 168, default: 30, unit: 'hours',
    label: 'Warn when no report stage has finished for',
    help: 'With work waiting in the queue, the dashboard and Health page turn red after this many hours without a finished stage.'
  },
  'notify.report_ready_enabled': {
    group: 'Emails', type: 'bool', default: true,
    label: 'Send the daily "your report is ready" emails',
    help: 'Off: the daily job runs but sends nothing and keeps everyone queued, so they are emailed when you switch it back on.'
  }
};

let cache = { at: 0, rows: null };

async function loadRows() {
  if (cache.rows && Date.now() - cache.at < 60 * 1000) return cache.rows;
  let rows = cache.rows || {};
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/app_config?select=key,value,updated_at,updated_by`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}`);
    rows = Object.fromEntries((await r.json()).map(x => [x.key, x]));
  } catch (err) {
    console.warn('[config] using last known / default values:', err.message);
  }
  cache = { at: Date.now(), rows };
  return rows;
}

export function invalidateConfig() { cache = { at: 0, rows: null }; }

// Validate a raw value for a registered key. Returns { ok:true, value } or { ok:false, error }.
export function coerceConfig(key, raw) {
  const def = CONFIG[key];
  if (!def) return { ok: false, error: 'unknown_key' };
  if (def.type === 'bool') {
    if (raw === true || raw === 'true') return { ok: true, value: true };
    if (raw === false || raw === 'false') return { ok: true, value: false };
    return { ok: false, error: 'not_a_boolean' };
  }
  if (def.type === 'int') {
    const n = typeof raw === 'number' ? raw : (typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN);
    if (!Number.isInteger(n)) return { ok: false, error: 'not_a_whole_number' };
    if (n < def.min || n > def.max) return { ok: false, error: `out_of_range_${def.min}_${def.max}` };
    return { ok: true, value: n };
  }
  return { ok: false, error: 'bad_type' };
}

export async function getConfig(key) {
  const def = CONFIG[key];
  if (!def) throw new Error(`unregistered config key ${key}`);
  const row = (await loadRows())[key];
  if (row) {
    const c = coerceConfig(key, row.value);
    if (c.ok) return c.value;
  }
  return def.default;
}

// For the admin page: every registered setting with its current value and where it comes from.
export async function listConfig() {
  const rows = await loadRows();
  return Object.entries(CONFIG).map(([key, def]) => {
    const row = rows[key];
    const c = row ? coerceConfig(key, row.value) : null;
    return {
      key, group: def.group, type: def.type, label: def.label, help: def.help, unit: def.unit || null,
      min: def.min ?? null, max: def.max ?? null, default: def.default,
      value: c && c.ok ? c.value : def.default,
      is_default: !(c && c.ok),
      updated_at: c && c.ok ? row.updated_at : null, updated_by: c && c.ok ? row.updated_by : null
    };
  });
}
