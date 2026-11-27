// ============================================================
// KIRA RESEARCH — api/_lib/ads-dsa.js
// Dynamic Search Ads (DSA) test, set up 2026-11-27 (W4). Pure functions, no network:
//   buildPageFeed(rows)  → CSV for the Google Ads page feed (`Page URL`, `Custom label`)
//   buildDsaCsv(opts)    → Google Ads Editor import file, one DSA campaign, everything PAUSED
//   DSA_NEGATIVES        → shared negative list (generic noise + the BizDirect cross-negatives)
// Only pages that search engines may index go in the feed: English market maps that pass the gate and
// have commentary, published reports and transcripts that have an English edition. Nothing here spends
// money: the campaign, ad groups, targets and ads are all created Paused.
// ============================================================

import { SITE, NEGATIVES } from './ads-campaign.js';
import { listPrice, transcriptPriceOf, REPORT_PRICE_DEFAULT } from './pricing.js';

// ── Cross-negatives with BizDirect (same owner: one query may not show two of our ads) ──────────────────────
// BizDirect sells company contacts (distributor lists, supplier directories, emails, phones). KIRA sells the
// research and, through a market map, a company list file. So the PLAIN word "list" is NOT negative here (a
// "<product> companies list <country>" search is exactly what a market map answers); only the shapes that ask for
// a contact / distributor / supplier directory are.
export const BIZDIRECT_NEGATIVES = [
  'distributor', 'distributors', 'distributors list', 'list of companies', 'company list', 'directory',
  'suppliers', 'supplier list', 'manufacturers list', 'importers list',
  'contact', 'contacts', 'email', 'phone', 'b2b database'
];
// Words that stay OFF the negative list on purpose (checked by the tests): a plain "list" would block market-map searches.
export const NOT_NEGATIVE = ['list', 'companies', 'company', 'database'];
// General noise for a paid research product, on top of the shared S21 list.
const GENERAL_NEGATIVES = ['jobs', 'salary', 'free download', 'pdf free', 'wiki', 'near me'];

export const DSA_NEGATIVES = [...new Set([...GENERAL_NEGATIVES, ...NEGATIVES, ...BIZDIRECT_NEGATIVES])];

// Default targeting (the founder can edit them in Ads Editor before import). UK / EEA are left out until the site has a consent banner with Consent Mode v2 (see the guide).
export const DEFAULT_LOCATIONS = ['Japan', 'South Korea', 'Singapore', 'Taiwan', 'Australia', 'United States'];

export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// rows: { maps: [{slug,country,n_companies,indexable,commentary}], reports: [{slug,country,price,status,hasEn}],
//         transcripts: [{slug,market,status,hasEn}] } → [{ url, kind, country, price }]
// Each filter is repeated here (the query asks for the same), so a loose query can never put a thin page in the feed.
export function feedItems({ maps = [], reports = [], transcripts = [] }) {
  const out = [];
  for (const m of maps) {
    const n = Number(m.n_companies) || 0;
    if (!m.slug || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(m.slug)) continue;
    if (m.indexable !== true || n < 50 || !m.commentary) continue;
    out.push({ url: `${SITE}/en/market-maps/${m.slug}`, kind: 'map', country: slugify(m.country), price: listPrice(n) });
  }
  for (const r of reports) {
    if (!r.slug || r.status !== 'published' || !r.hasEn) continue;
    out.push({ url: `${SITE}/en/reports/${r.slug}`, kind: 'report', country: slugify(r.country), price: Math.round(Number(r.price) || 0) || REPORT_PRICE_DEFAULT });
  }
  for (const t of transcripts) {
    if (!t.slug || t.status !== 'published' || !t.hasEn) continue;
    out.push({ url: `${SITE}/en/experts/transcripts/${t.slug}`, kind: 'transcript', country: slugify(t.market), price: transcriptPriceOf(t) });
  }
  return out;
}

export const labelsFor = (i) => [`kind_${i.kind}`, i.country ? `country_${i.country}` : '', `price_${i.price}`].filter(Boolean);

const q = (v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

// Google Ads page feed: header `Page URL,Custom label`; several labels in one cell are separated by semicolons.
export function buildPageFeed(rows) {
  const items = feedItems(rows);
  const csv = ['Page URL,Custom label', ...items.map((i) => `${q(i.url)},${q(labelsFor(i).join(';'))}`)].join('\n') + '\n';
  const counts = { map: 0, report: 0, transcript: 0 };
  items.forEach((i) => { counts[i.kind]++; });
  return { csv, counts, total: items.length };
}

// ── Ads (descriptions <= 90 characters, Google's limit; no "AI", no "platform", no competitor names) ──────────
export function dsaDescriptions({ reportPrice = null, transcriptPrice = null } = {}) {
  return {
    map: [
      `Company list by stage of the value chain, with a free overview. Excel file from $${listPrice(1)}.`,
      'Market map: who operates where, sized and sourced. Free overview before you buy.'
    ],
    report: [
      reportPrice ? `Sourced market research for the decision. English, Japanese, Korean, Chinese. From $${reportPrice}.`
        : 'Sourced market research for the decision. English, Japanese, Korean and Chinese editions.',
      'Every figure cited, executive summary free. Built for teams entering Asia-Pacific markets.'
    ],
    transcript: [
      transcriptPrice ? `Expert interview transcripts on your market, every claim tied to a source. $${transcriptPrice} each.`
        : 'Expert interview transcripts on your market, every claim tied to a source.',
      'Modelled interviews on field frameworks and dated 2024-2026 sources. Free preview.'
    ]
  };
}

const COLS = ['Campaign', 'Campaign Type', 'Campaign Status', 'Budget', 'Budget type', 'Bid Strategy Type', 'Networks', 'Languages',
  'Location', 'Tracking template', 'Final URL suffix', 'Domain name', 'DSA targeting source',
  'Ad Group', 'Ad Group Status', 'Ad Group Type', 'Max CPC', 'Dynamic ad target', 'Ad type',
  'Description 1', 'Description 2', 'Status', 'Comment'];
const csvq = (v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const line = (o) => COLS.map((c) => csvq(o[c] == null ? '' : o[c])).join(',');

export const CAMPAIGN_DEFAULT = 'KIRA DSA - Pilot';

// opts: { campaign, budget (USD/day), maxCpc, locations[], languages, reportPrice, transcriptPrice }
// reportPrice / transcriptPrice are null while that checkout switch is off, so no ad promises a price nobody can pay.
export function buildDsaCsv(opts = {}) {
  const campaign = opts.campaign || CAMPAIGN_DEFAULT;
  const budget = opts.budget || 10, maxCpc = opts.maxCpc || '1.50';
  const locations = (opts.locations && opts.locations.length ? opts.locations : DEFAULT_LOCATIONS);
  const desc = dsaDescriptions({ reportPrice: opts.reportPrice || null, transcriptPrice: opts.transcriptPrice || null });
  const rows = [COLS.join(',')];
  // one campaign row (first location rides on it), then one extra row per further location
  rows.push(line({
    Campaign: campaign, 'Campaign Type': 'Search', 'Campaign Status': 'Paused', Budget: budget, 'Budget type': 'Daily',
    'Bid Strategy Type': 'Manual CPC', Networks: 'Google search', Languages: opts.languages || 'English',
    Location: locations[0], 'Tracking template': '{lpurl}', 'Final URL suffix': 'utm_source=google&utm_medium=cpc&utm_campaign={campaignid}',
    'Domain name': 'kiraresearch.com', 'DSA targeting source': 'Page feed',
    Comment: 'Targeting source = page feed only. Turn Final URL expansion OFF in Campaign settings (guide step).'
  }));
  for (const loc of locations.slice(1)) rows.push(line({ Campaign: campaign, Location: loc }));
  for (const [kind, label] of [['map', 'Market maps / company lists'], ['report', 'Reports'], ['transcript', 'Expert transcripts']]) {
    const group = `DSA - ${label}`;
    rows.push(line({ Campaign: campaign, 'Ad Group': group, 'Ad Group Status': 'Paused', 'Ad Group Type': 'Dynamic', 'Max CPC': maxCpc }));
    rows.push(line({ Campaign: campaign, 'Ad Group': group, 'Dynamic ad target': `Custom label equals kind_${kind}`, Status: 'Paused' }));
    rows.push(line({ Campaign: campaign, 'Ad Group': group, 'Ad type': 'Dynamic search ad', 'Description 1': desc[kind][0], 'Description 2': desc[kind][1], Status: 'Paused' }));
  }
  return { csv: rows.join('\n') + '\n', descriptions: desc };
}

export function negativesText() {
  return [
    '# KIRA shared negative keyword list for the DSA campaign (phrase match). Paste into Google Ads > Tools > Shared library > Negative keyword lists.',
    '# Cross-negatives with BizDirect (same owner: Google treats two ads of one owner on the same query as unfair advantage).',
    '# KIRA sells a company list only as a market-map Excel file, so the plain word "list" is NOT negative here: only the shapes',
    '# "distributors list / supplier list / company list / manufacturers list / importers list / list of companies", contacts, emails, phones.',
    '# (Lines that start with # are comments: delete them before pasting.)',
    ...DSA_NEGATIVES.map((k) => `"${k}"`)
  ].join('\n') + '\n';
}
