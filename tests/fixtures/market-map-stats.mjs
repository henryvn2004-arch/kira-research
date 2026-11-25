// A small but complete stats object for the market-map renderer (goods map, Vietnam soft drinks), built from the contract in
// scripts/load-market-maps.mjs. Used by the unit tests and the screenshot script. No real company data.
const tier = (n, tot) => ({ n, pct: Math.round((100 * n) / tot) });
export function mockStats(over = {}) {
  const stages = [['Brand owner / manufacturer', 120], ['Importer / exporter', 40], ['Distributor / wholesaler', 90], ['Retail / other', 30]];
  const total = stages.reduce((a, s) => a + s[1], 0);
  const cells = (n) => [{ label: 'Carbonated drinks', n: Math.round(n * 0.5), pct_of_stage: 50, pct_of_all: Math.round((50 * n) / total) }, { label: 'Juices', n: Math.round(n * 0.3), pct_of_stage: 30, pct_of_all: Math.round((30 * n) / total) }, { label: 'Other', n: n - Math.round(n * 0.5) - Math.round(n * 0.3), pct_of_stage: 20, pct_of_all: Math.round((20 * n) / total) }];
  return {
    segment: 'Soft drinks', country: 'Vietnam', built: '2026-11-23', companies: total, price_usd: 36,
    groups: ['Carbonated drinks', 'Juices'], left_out_roles: ['retailer'], definition_extra: 'Bottled water is counted under its own segment.', item_noun: 'product',
    meta: { country_code: 'VN', country_slug: 'vietnam', segment_key: 'soft-drinks', slug: 'vietnam/soft-drinks', kind: 'goods', l2_family: 'Beverages', axis: 'stage', axis_title: 'Value-chain stage',
      stage_labels: stages.map((s) => s[0]), region_labels: ['North', 'Central', 'South', 'Not stated'], mekko: { x_title: 'Value-chain stage', y_title: 'Sub-category', y_labels: ['Carbonated drinks', 'Juices', 'Other'] } },
    kpis: [{ value: String(total), label: 'companies mapped' }, { value: '120', label: 'manufacturers / brand owners' }, { value: '130', label: 'importers, distributors and wholesalers' }, { value: '61%', label: 'with a company phone in the Excel list' }],
    stages: stages.map(([stage, n]) => ({ stage, n })), regions: [], provinces: [
      { macro_region: 'South', n: 150, pct: 53, provinces: [{ name: 'Ho Chi Minh City', n: 110 }, { name: 'Binh Duong', n: 40 }] },
      { macro_region: 'North', n: 90, pct: 32, provinces: [{ name: 'Hanoi', n: 70 }, { name: 'Hai Phong', n: 20 }] },
      { macro_region: 'Central', n: 25, pct: 9, provinces: [{ name: 'Da Nang', n: 25 }] },
      { macro_region: 'Not stated', n: 15, pct: 6, provinces: [{ name: 'Not stated', n: 15 }] },
    ],
    marimekko: stages.map(([stage, n]) => ({ stage, n, cells: cells(n) })),
    heatmap: { densest: { sub_category: 'carbonated drinks', stage: 'Brand owner / manufacturer', n: 60, pct: 21 }, rows: [{ sub_category: 'Carbonated drinks', by_stage: [60, 20, 45, 15], total: 140 }, { sub_category: 'Juices', by_stage: [36, 12, 27, 9], total: 84 }] },
    tiers_by_stage: stages.map(([stage, n]) => ({ stage, n, Large: tier(Math.round(n * 0.2), n), 'Mid-size': tier(Math.round(n * 0.3), n), Small: tier(Math.round(n * 0.4), n), 'Not rated': tier(n - Math.round(n * 0.9), n) })),
    tiers: { Large: tier(56, total), 'Mid-size': tier(84, total), Small: tier(112, total), 'Not rated': tier(28, total) },
    brands: [{ brand: 'Acme Cola', companies: 14, owner_listed: true, owner_name: 'Acme Beverage JSC', carried_by_distributors_or_retail: 9 }, { brand: 'Sunrise', companies: 8, owner_listed: false, carried_by_distributors_or_retail: 7 }],
    certifications: [{ name: 'ISO 22000', n: 31 }, { name: 'HACCP', n: 28, lb: true }], origins: [{ name: 'Thailand', n: 12 }, { name: 'Japan', n: 9, lb: true }],
    channels: [{ name: 'Wholesale', n: 80 }, { name: 'Modern trade', n: 41 }, { name: 'Online', n: 22, lb: true }],
    coverage: { region: { n_filled: 265, share_filled: 0.94 }, channels: { n_filled: 143, share_filled: 0.51 }, brands: { n_filled: 22, share_filled: 0.4, share_linked: 0.5 }, certifications: { n_filled: 59, share_filled: 0.2 }, origins: { n_filled: 21, share_filled: 0.07 } }, thresholds: {},
    top20: [1, 2, 3].map((r) => ({ rank: r, company: `Example Beverage Co ${r}`, stage: 'Brand owner / manufacturer', region: 'South', scale: 'Large', products: ['Cola', 'Orange juice'] })),
    preview: [1, 2].map((r) => ({ rank: r, company: `Example Beverage Co ${r}`, stage: 'Importer / exporter', sub_category: 'Juices', region: 'North', scale: 'Mid-size', products: ['Juice'], website: `example${r}.vn` })),
    contacts: { with_phone_pct: 61, with_email_pct: 40 },
    findings: { top_stage: { stage: 'Brand owner / manufacturer', pct: 42 }, top_sub: { name: 'Carbonated drinks', pct: 50 }, large_pct: 20, small_pct: 40, top_province: { name: 'Ho Chi Minh City', pct: 39, n: 110 }, top_region: { region: 'South', pct: 53 } },
    ...over,
  };
}
