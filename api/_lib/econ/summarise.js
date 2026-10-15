// Kira Data: sums econ_flows rows into "links" (latest 12 months / 4 quarters / year and the window before it).
// Used by /api/econ (country page) and /api/moves (corridor page).

export const LINK_PRODUCTS = ['TOTAL', 'FDI_NET', 'FDI_APPROVED', 'FDI_REALISED', 'FDI_REG_YTD', 'VISITORS'];
const WINDOW = { M: 12, Q: 4, A: 1 };

// One row per (source, reporter, partner, product, flow): the latest full window and the one before it.
// A product ending in _YTD holds year-to-date values: the latest month is the window (from January) and the same
// month a year before is the comparison.
export function summarise(rows) {
  const groups = {};
  for (const r of rows) {
    const k = [r.source_key, r.reporter, r.partner, r.product, r.flow, r.freq, r.currency].join('|');
    (groups[k] = groups[k] || []).push(r);
  }
  const latestYtd = {};
  for (const r of rows) {
    if (!/_YTD$/.test(r.product)) continue;
    const k = [r.source_key, r.reporter, r.product].join('|');
    if (!latestYtd[k] || r.period > latestYtd[k]) latestYtd[k] = r.period;
  }
  const out = [];
  for (const list of Object.values(groups)) {
    const f = list[0], n = WINDOW[f.freq] || 1;
    list.sort((a, b) => (a.period < b.period ? 1 : -1));
    if (/_YTD$/.test(f.product)) {
      const last = list[0], [y, m] = last.period.split('-');
      // Only partners listed in the latest month: an older year-to-date figure is not comparable.
      if (last.period < latestYtd[[f.source_key, f.reporter, f.product].join('|')]) continue;
      const before = list.find((r) => r.period === `${Number(y) - 1}-${m}`);
      out.push({ source_key: f.source_key, reporter: f.reporter, partner: f.partner, product: f.product, flow: f.flow, freq: f.freq,
        currency: f.currency, period: last.period, from: `${y}-01`, value: Number(last.value), prev: before ? Number(before.value) : null });
      continue;
    }
    if (list.length < n) continue;
    const sum = (a) => a.reduce((t, r) => t + Number(r.value), 0);
    const cur = list.slice(0, n), prev = list.slice(n, 2 * n);
    out.push({
      source_key: f.source_key, reporter: f.reporter, partner: f.partner, product: f.product, flow: f.flow, freq: f.freq,
      currency: f.currency, period: cur[0].period, from: cur[n - 1].period, value: sum(cur),
      prev: prev.length === n ? sum(prev) : null
    });
  }
  return out;
}
