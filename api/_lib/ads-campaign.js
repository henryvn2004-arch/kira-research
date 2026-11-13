// ============================================================
// KIRA RESEARCH — api/_lib/ads-campaign.js
// Builds a Google Ads Editor import file (S21): one ad group per topic page, keywords written
// from the topic's market, segment and analysis, one responsive search ad per ad group.
// Pure functions (no network), so the text rules can be tested offline:
//   headline <= 30 characters, description <= 90, display-path part <= 15 (Google's limits);
//   everything is created PAUSED, nothing can spend until the owner enables it in Ads Editor.
// ============================================================

export const SITE = 'https://kiraresearch.com';

// Words a reader types that mean "free / student / job seeker": never worth a click.
export const NEGATIVES = [
  'free', 'pdf free', 'free download', 'download free', 'wikipedia', 'ppt', 'powerpoint', 'slideshare',
  'scribd', 'statistics free', 'thesis', 'dissertation', 'assignment', 'essay', 'homework', 'course',
  'jobs', 'job', 'career', 'careers', 'salary', 'internship', 'what is', 'definition', 'meaning',
  'example', 'examples', 'template', 'sample', 'news', 'stock price', 'near me', 'login', 'reddit'
];

// Two buyer-intent phrases per analysis, on top of the two every topic gets.
const EXTRA = {
  'market overview':        ['{c} {s} market size', '{s} market research {c}'],
  'competitive landscape':  ['{c} {s} competitors', '{s} competitive landscape {c}'],
  'customer insight':       ['{c} {s} consumer insights', '{s} customer segments {c}'],
  'distribution analysis':  ['{s} distribution {c}', '{c} {s} distributors'],
  'market entry strategy':  ['{s} market entry {c}', '{c} {s} entry strategy'],
  'regulatory landscape':   ['{c} {s} regulations', '{s} regulatory requirements {c}'],
  'value proposition':      ['{c} {s} value proposition', '{s} product positioning {c}']
};

const clean = s => String(s || '').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N} -]/gu, ' ').replace(/\s+/g, ' ').trim();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// The first of `options` that fits `max`, or null.
const fit = (max, ...options) => options.find(o => o && o.length <= max) || null;

export function keywordsFor({ country, segment, analysis }) {
  const c = clean(country), s = clean(segment);
  if (!c || !s) return [];
  const gen = [`${c} ${s} market report`, `${s} market ${c}`];
  const extra = (EXTRA[clean(analysis)] || ['{c} {s} market analysis', '{s} {c} market study']).map(t => t.replace('{c}', c).replace('{s}', s));
  const seen = new Set();
  return [...gen, ...extra].filter(k => k.split(' ').length <= 8 && !seen.has(k) && seen.add(k));
}

// opts: { priceOn, etaDays, published }
export function adFor(topic, opts) {
  const country = topic.country, segment = topic.segment;
  const h = [];
  const add = t => { if (t && t.length <= 30 && !h.includes(t)) h.push(t); };
  add(fit(30, `${segment} in ${country}`, `${country} ${segment}`, `${segment} market report`));
  add(fit(30, `${country} ${topic.analysis}`, `${country} market report`));
  add(opts.published ? 'Read the full report online' : (opts.etaDays ? `Ready in about ${opts.etaDays} days` : 'Email me when it is ready'));
  if (opts.priceOn) add(`Report from $${opts.price}`);
  add('Every figure has a source');
  add('Built for Japan and Korea firms');
  add('Executive summary is free');
  add('Cited, board-ready research');
  const d = [
    fit(90, topic.buyer_question),
    'Written for the decision, not a data dump. English, Japanese, Korean and Chinese editions.',
    `Sourced market research on ${segment}. Executive summary free.`
  ].filter(x => x && x.length <= 90);
  const path1 = fit(15, clean(country).replace(/ /g, '-'), 'research');
  const path2 = fit(15, clean(segment).replace(/ /g, '-'), 'report');
  return { headlines: h.slice(0, 15), descriptions: d.slice(0, 4), path1, path2 };
}

const COLS = ['Campaign', 'Campaign Type', 'Campaign Status', 'Budget', 'Budget type', 'Bid Strategy Type', 'Networks', 'Languages',
  'Ad Group', 'Ad Group Status', 'Ad Group Type', 'Max CPC', 'Keyword', 'Criterion Type', 'Ad type',
  ...Array.from({ length: 15 }, (_, i) => `Headline ${i + 1}`), 'Description 1', 'Description 2', 'Description 3', 'Description 4',
  'Path 1', 'Path 2', 'Final URL', 'Status'];
const q = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
const line = obj => COLS.map(c => q(obj[c] == null ? '' : obj[c])).join(',');

// topics: [{ slug, publishedSlug, country, segment, analysis, buyer_question }]
export function buildCampaignCsv(topics, { campaign, budget, maxCpc, languages, priceOn, price, etaDays }) {
  const rows = [COLS.join(','), line({
    Campaign: campaign, 'Campaign Type': 'Search', 'Campaign Status': 'Paused', Budget: budget, 'Budget type': 'Daily',
    'Bid Strategy Type': 'Manual CPC', Networks: 'Google search', Languages: languages
  })];
  let groups = 0, keywords = 0, skipped = 0;
  for (const t of topics) {
    const kws = keywordsFor(t);
    const published = !!t.publishedSlug;
    const ad = adFor(t, { priceOn, price, etaDays, published });
    if (kws.length < 2 || ad.headlines.length < 3 || ad.descriptions.length < 2) { skipped++; continue; }
    const group = cap(clean(`${t.country} ${t.segment} ${t.analysis}`)).slice(0, 80);
    rows.push(line({ Campaign: campaign, 'Ad Group': group, 'Ad Group Status': 'Paused', 'Ad Group Type': 'Standard', 'Max CPC': maxCpc }));
    for (const k of kws) {
      rows.push(line({ Campaign: campaign, 'Ad Group': group, Keyword: k, 'Criterion Type': 'Phrase', Status: 'Paused' }));
      rows.push(line({ Campaign: campaign, 'Ad Group': group, Keyword: k, 'Criterion Type': 'Exact', Status: 'Paused' }));
      keywords += 2;
    }
    const ads = { Campaign: campaign, 'Ad Group': group, 'Ad type': 'Responsive search ad', 'Path 1': ad.path1, 'Path 2': ad.path2,
      'Final URL': `${SITE}/en/reports/${t.publishedSlug || t.slug}`, Status: 'Paused' };
    ad.headlines.forEach((x, i) => { ads[`Headline ${i + 1}`] = x; });
    ad.descriptions.forEach((x, i) => { ads[`Description ${i + 1}`] = x; });
    rows.push(line(ads));
    groups++;
  }
  return { csv: rows.join('\n') + '\n', groups, keywords, skipped };
}
