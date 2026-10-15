// PXWeb API v1 helpers (PSA OpenSTAT, Vietnam NSO). Queries ask for json-stat v1: PSA's json-stat2 answers with
// wrong values ("value":[1.0]) and NSO's json-stat2 returns 404 (checked 2026-10-14).
// Value codes are positions ("0", "1", ...) that move as years are added, so callers select by label:
// meta() reads the table's variables, pick() turns labels into codes.
import { getJson } from './util.js';

export async function meta(base, path) {
  const m = await getJson(base + path);
  if (!m || !Array.isArray(m.variables)) throw new Error(`PXWeb: no metadata for ${path}`);
  return m.variables;
}

// Codes of `variable` whose label passes `test` (a function or a list of exact labels).
export function pick(vars, variable, test) {
  const v = vars.find((x) => x.code === variable);
  if (!v) throw new Error(`PXWeb: no variable "${variable}"`);
  const ok = typeof test === 'function' ? test : (t) => test.includes(t.trim());
  return v.values.filter((code, i) => ok(v.valueTexts[i], code));
}

// Runs a query; returns one object per cell: { <variable code>: <value label>, ..., value }.
export async function query(base, path, selections) {
  const body = {
    query: Object.entries(selections).map(([code, values]) => ({ code, selection: { filter: 'item', values } })),
    response: { format: 'json-stat' }
  };
  const res = await getJson(base + path, { body });
  const ds = res && (res.dataset || res[Object.keys(res)[0]]);
  if (!ds || !ds.dimension || !Array.isArray(ds.value)) throw new Error(`PXWeb: unexpected reply for ${path}`);
  const ids = ds.dimension.id, size = ds.dimension.size;
  const cats = ids.map((id) => {
    const c = ds.dimension[id].category;
    const order = Object.entries(c.index).sort((a, b) => a[1] - b[1]).map(([code]) => code);
    return order.map((code) => (c.label ? c.label[code] : code));
  });
  const out = [];
  ds.value.forEach((val, flat) => {
    if (val === null || val === undefined) return;
    const cell = { value: Number(val) };
    let rest = flat;
    for (let d = ids.length - 1; d >= 0; d--) {
      cell[ids[d]] = cats[d][rest % size[d]];
      rest = Math.floor(rest / size[d]);
    }
    if (Number.isFinite(cell.value)) out.push(cell);
  });
  return out;
}
