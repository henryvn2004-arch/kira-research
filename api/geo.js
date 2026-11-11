// ============================================================
// KIRA RESEARCH — api/geo.js
// GEO hubs (G4/G7): server-rendered pages built from kira_answers, field_claims and segment_crosswalk.
//   GET /api/geo?type=hub&loc=en&country=vietnam&segment=<segment_key>      /<loc>/markets/<country>/<segment>
//   GET /api/geo?type=trade&loc=en&industry=<slug>&topic=<topic-slug>       /<loc>/trade/<industry>/<topic>
//   GET /api/geo?type=trade-industry&loc=en&industry=<slug>                 /<loc>/trade/<industry>
// Languages: a page in ja/ko/zh is rendered from the translated rows (kira_answers.i18n / field_claims.i18n)
// with its own canonical and hreflang, and is indexable when the same thresholds hold on the translated rows.
// When they do not, the URL serves the English text with the English canonical and noindex,follow.
// Index rules: hub = >= 1 published report/transcript AND >= 5 answers in that language;
//   trade page = >= 3 claims from >= 2 transcripts in that language; trade industry hub = one indexable topic.
// Every practitioner claim is printed with its basis_label (modelled interviews built on KIRA field research).
// Freshness: tables are read per request; the edge caches 10 min + stale-while-revalidate (vercel.json).
// ============================================================
import {
  BASE, LOCALES, esc, loadTemplate, fillTemplate, crumbJson, plain,
} from './_lib/ssr.js';
import {
  INTENT_ORDER, TOPIC_INTENT, topicSlug, topicKey, sb, ansLoc, claimLoc,
  countryBySlug, countryByCode, segmentName, answersForHub, docTitles, hubIndexable,
  publishedClaims, listHubs, countries, slugOf, crosswalk, bizdirectSummary, tradeIndex, tradeTopicIndexable,
} from './_lib/geo.js';
import { T, countryName } from './_lib/geo-i18n.js';
import { logGeoHit } from './_lib/geo-hits.js';
import { answerBlock, claimItem, modelledNote, whoDecidesHtml } from './_lib/geo-html.js';

const cut = (s, n) => { const t = plain(s); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const day = (iso) => String(iso || '').slice(0, 10);
const loc2 = (l) => (LOCALES.includes(l) ? l : 'en');
const bdUrl = (u) => /^https:\/\/(www\.)?bizdirectasia\.com\//.test(u || '');

function page(res, html, { status = 200, cache = true } = {}) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache ? 'public, s-maxage=600, stale-while-revalidate=86400' : 'public, s-maxage=60');
  res.status(status).send(html);
}

// o.loc = language of the content; o.path = its own path (/<loc>/…) which is also the canonical;
// o.hreflang = [{locale, url}] of the language editions that are indexable.
async function shell(req, res, o) {
  page(res, fillTemplate(await loadTemplate('hub', req), {
    locale: o.loc, title: o.title, description: o.description, canonical: `${BASE}${o.path}`,
    robots: o.indexable ? null : 'noindex,follow', hreflang: o.hreflang || [], xDefault: o.xDefault || null,
    ld: o.ld || [], content: o.content,
  }), { status: o.status || 200, cache: !o.status });
}

const crumbs = (items) => `<nav class="r-crumbs" aria-label="Breadcrumb">${items.map((c, i) => (c.href ? `<a href="${esc(c.href)}">${esc(c.name)}</a>` : `<span>${esc(c.name)}</span>`) + (i < items.length - 1 ? '<span class="sep">›</span>' : '')).join('')}</nav>`;

function notFound(req, res, loc) {
  const L = T.en;
  return shell(req, res, {
    loc: 'en', indexable: false, status: 404, path: '/en/', title: `${L.nfTitle} — KIRA RESEARCH`, description: L.nfTitle,
    content: `<!--SSR--><h1>${L.nfTitle}</h1><p>${L.nfBody} <a href="/${loc}/library">${L.nfBrowse}</a>.</p><!--/SSR-->`,
  });
}

// ── segment hub ──────────────────────────────────────────
async function renderHub(req, res, loc, countrySlug, segment) {
  const country = await countryBySlug(countrySlug);
  if (!country) return notFound(req, res, loc);
  const answers = await answersForHub(country.code, segment);
  if (!answers.length) return notFound(req, res, loc);
  const slugs = answers.map((a) => a.source_ref && a.source_ref.slug);
  const known = await docTitles(slugs);                                  // which documents are published
  const ok = Object.fromEntries(LOCALES.map((l) => [l, hubIndexable(answers, known, l)]));

  // The language of the page: the requested one when it qualifies, else English text, noindex, English canonical.
  const fallback = loc !== 'en' && !ok[loc];
  const vl = fallback ? 'en' : loc;
  const L = T[vl];
  const titles = vl === 'en' ? known : await docTitles(slugs, vl);
  titles.countrySlug = countrySlug;
  const rows = answers.map((a) => ansLoc(a, vl)).filter(Boolean);
  const segName = await segmentName(segment);
  const cName = countryName(country, vl);
  const updated = day(answers.reduce((m, a) => (a.updated_at > m ? a.updated_at : m), ''));
  const path = `/${vl}/markets/${countrySlug}/${segment}`;
  const h1 = L.h1Hub(cName, segName);

  const byIntent = new Map();
  for (const a of rows) {
    const g = a.source_kind === 'econ' ? 'trade_data' : a.intent;      // Kira Data answers sit in "Trade and data"
    if (!byIntent.has(g)) byIntent.set(g, []);
    byIntent.get(g).push(a);
  }
  const intents = [...byIntent.keys()].sort((x, y) => INTENT_ORDER.indexOf(x) - INTENT_ORDER.indexOf(y));
  const qa = intents.map((i) => `<section id="${esc(i)}"><h2>${esc(L.intents[i] || i)}</h2>${byIntent.get(i).map((a) => answerBlock(a, titles, L, vl)).join('')}</section>`).join('');

  const docSlugs = [...new Set(slugs.filter(Boolean))];
  const repSlugs = docSlugs.filter((s) => known.reports.has(s));
  const trSlugs = docSlugs.filter((s) => known.transcripts.has(s));

  // Field claims of this market and segment: the claim's industry is the segment key, or it comes from one of the hub's transcripts.
  const claims = (await publishedClaims()).filter((c) => c.country_code === country.code && (c.industry === segment || trSlugs.includes(c.transcript_slug)))
    .map((c) => claimLoc(c, vl)).filter(Boolean);
  const trade = claims.length
    ? `<section id="how-the-trade-works"><h2>${esc(L.howTrade)}</h2>${modelledNote(L, vl)}<ul class="geo-claims">${claims.slice(0, 20).map((c) => claimItem(c, titles, vl)).join('')}</ul></section>` : '';

  // BizDirect Asia segment summary (final shape); nothing at all on 400/503/timeout.
  let bd = null;
  try { bd = await bizdirectSummary(await crosswalk(country.code, segment)); } catch (_e) { bd = null; }
  const segs = bd && Array.isArray(bd.segments) ? bd.segments.filter((s) => s && (s.companies > 0 || (s.pages || []).length)) : [];
  const decide = whoDecidesHtml(claims, L, vl, titles, segs.flatMap((s) => s.pages || []));

  // Who's who.
  let who = '';
  try {
    if (segs.length) {
      who = `<section id="whos-who"><h2>${esc(L.whosWho)}</h2>` + segs.map((s) => {
        const pages = (s.pages || []).filter((p) => bdUrl(p.url));
        const top = (s.top_companies || []).slice(0, 10).filter((c) => c && c.name);
        const regions = (s.top_regions || []).slice(0, 5).filter((r) => r && r.region);
        return `<h3>${esc(s.name || s.term)}</h3><p>${esc(L.bdCompanies(Number(s.companies) || 0))}` +
          (pages.length ? ' ' + pages.map((p) => `<a href="${esc(p.url)}" rel="noopener">${esc(L.bdList(p.role ? String(p.role).toLowerCase() : ''))}</a>`).join(' · ') : '') + '</p>' +
          (top.length ? `<ul class="geo-list">${top.map((c) => `<li>${esc(c.name)}${c.region ? ` (${esc(c.region)})` : ''}</li>`).join('')}</ul>` : '') +
          (regions.length ? `<p class="geo-note">${esc(L.topRegions)} ${regions.map((r) => `${esc(r.region)} (${esc(r.companies)})`).join(', ')}</p>` : '');
      }).join('') + `<p class="geo-note">${esc(L.companyData)}</p></section>`;
    }
  } catch (_e) { who = ''; }

  // Related reports / transcripts / insights.
  let ins = [];
  if (repSlugs.length) {
    try {
      ins = await sb(`insights?status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&related_report_slugs=ov.{${repSlugs.map((s) => s.replace(/[^a-z0-9-]/g, '')).join(',')}}&select=slug,insight_translations(locale,title,status,body)&limit=6`);
    } catch (_e) { ins = []; }
  }
  const insItems = ins.map((r) => {
    const all = (r.insight_translations || []).filter((t) => t.status === 'published' && t.body);
    const tr = all.find((t) => t.locale === vl) || all.find((t) => t.locale === 'en');
    return tr ? `<li>${esc(L.kInsight)} <a href="/${esc(tr.locale)}/insights/${esc(r.slug)}">${esc(tr.title)}</a></li>` : '';
  }).filter(Boolean);
  const related =
    `<section id="related"><h2>${esc(L.related)}</h2><ul class="geo-list">` +
    repSlugs.map((s) => `<li>${esc(L.kReport)} <a href="/${vl}/reports/${esc(s)}">${esc(titles.reports.get(s) || known.reports.get(s))}</a></li>`).join('') +
    trSlugs.map((s) => `<li>${esc(L.kInterview)} <a href="/${vl}/experts/transcripts/${esc(s)}">${esc(titles.transcripts.get(s) || known.transcripts.get(s))}</a></li>`).join('') +
    insItems.join('') + '</ul></section>';

  const market = repSlugs.length ? `<section id="market-data"><div id="hub-market" data-report="${esc(repSlugs[0])}"></div></section>` : '';
  const content = '<!--SSR-->' +
    crumbs([{ name: L.library, href: `/${vl}/library` }, { name: cName }, { name: segName }]) +
    `<h1>${esc(h1)}</h1><p class="geo-meta">${esc(L.metaHub(updated, rows.length))}</p>` +
    qa + market + decide + trade + who + related + '<!--/SSR-->';

  const ld = [
    { id: 'ld-breadcrumb', data: crumbJson([
      { name: 'KIRA RESEARCH', item: `${BASE}/${vl}/` }, { name: L.library, item: `${BASE}/${vl}/library` },
      { name: `${cName} ${segName}`, item: BASE + path }]) },
    { id: 'ld-faq', data: { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: vl === 'zh' ? 'zh-Hans' : vl, mainEntity: rows.slice(0, 40).map((a) => ({ '@type': 'Question', name: a.question, acceptedAnswer: { '@type': 'Answer', text: a.answer_short } })) } },
  ];
  const editions = LOCALES.filter((l) => ok[l]);
  await shell(req, res, {
    loc: vl, indexable: !fallback && ok[vl], path, title: `${h1} — KIRA RESEARCH`, description: cut(rows[0].answer_short, 200), ld, content,
    hreflang: editions.map((l) => ({ locale: l, url: `${BASE}/${l}/markets/${countrySlug}/${segment}` })),
    xDefault: ok.en ? `${BASE}/en/markets/${countrySlug}/${segment}` : null,
  });
  return true;
}

// ── trade pages ──────────────────────────────────────────
// Picks the language of a trade page: the requested one when its translated claims qualify, else English.
async function tradeView(loc, industry, topic) {
  const first = await tradeIndex(loc);
  const mine = first.idx.get(industry) && first.idx.get(industry).topics;
  if (loc === 'en' || (mine && topic && mine.get(topic) && tradeTopicIndexable(mine.get(topic), topic)) ||
      (mine && !topic && [...mine].some(([k, v]) => tradeTopicIndexable(v, k)))) return { vl: loc, fallback: false, ...first };
  return { vl: 'en', fallback: true, ...(await tradeIndex('en')) };
}

// "Who decides" for one industry (segment): claims on buyers and decision makers across its markets.
async function decideFor(ind, L, vl, titles) {
  const claims = ['buyer_roles', 'decision_makers'].flatMap((t) => ind.topics.get(t) || []);
  if (claims.length < 2) return '';
  const pages = [];
  if (ind.key) {
    for (const code of [...new Set(claims.map((c) => c.country_code))].slice(0, 4)) {
      try { const bd = await bizdirectSummary(await crosswalk(code, ind.key)); pages.push(...((bd && bd.segments) || []).flatMap((x) => x.pages || [])); } catch (_e) { /* no BizDirect links */ }
    }
  }
  return whoDecidesHtml(claims, L, vl, { transcripts: titles, reports: new Map() }, pages);
}

async function renderTrade(req, res, loc, industry, topicSlg) {
  const topic = topicKey(topicSlg);
  const { vl, fallback, idx, titles } = await tradeView(loc, industry, topic);
  const ind = idx.get(industry);
  const claims = ind && ind.topics.get(topic);
  if (!claims || topic === 'other') return notFound(req, res, loc);
  const L = T[vl];
  const indexable = !fallback && tradeTopicIndexable(claims, topic);
  const label = L.topics[topic] || topic;
  const t = { transcripts: titles, reports: new Map() };
  const path = `/${vl}/trade/${industry}/${topicSlg}`;
  const h1 = L.tradeH1(ind.name, label);
  const updated = day(claims.reduce((m, c) => (c.updated_at > m ? c.updated_at : m), ''));

  const byCountry = new Map();
  for (const c of claims) { if (!byCountry.has(c.country_code)) byCountry.set(c.country_code, []); byCountry.get(c.country_code).push(c); }
  const blocks = [];
  const intent = TOPIC_INTENT[topic];
  for (const [code, list] of byCountry) {
    const co = await countryByCode(code);
    const slugs = [...new Set(list.map((c) => c.transcript_slug))];
    let rel = [];
    if (intent) {
      rel = (await sb(`kira_answers?status=eq.published&source_kind=eq.transcript&intent=eq.${intent}&country_code=eq.${encodeURIComponent(code)}&source_ref->>slug=in.(${slugs.map((s) => `"${s}"`).join(',')})&select=id,question,intent,answer_short,year,primary_source,source_kind,source_ref,i18n&limit=6`))
        .map((a) => ansLoc(a, vl)).filter(Boolean);
    }
    blocks.push(`<section id="${esc(code.toLowerCase())}"><h2>${esc(co ? countryName(co, vl) : code)}</h2><ul class="geo-claims">${list.map((c) => claimItem(c, t, vl)).join('')}</ul>` +
      (rel.length ? `<h3 class="geo-note">${esc(L.relatedAnswers)}</h3>${rel.map((a) => answerBlock(a, t, L, vl)).join('')}` : '') + '</section>');
  }
  const siblings = [...ind.topics.entries()].filter(([k, v]) => k !== topic && tradeTopicIndexable(v, k));
  const decide = topic === 'buyer_roles' || topic === 'decision_makers' ? await decideFor(ind, L, vl, titles) : '';
  const content = '<!--SSR-->' +
    crumbs([{ name: L.library, href: `/${vl}/library` }, { name: ind.name, href: `/${vl}/trade/${industry}` }, { name: label }]) +
    `<h1>${esc(h1)}</h1><p class="geo-meta">${esc(L.tradeMeta(updated, claims.length, new Set(claims.map((c) => c.transcript_slug)).size))}</p>` +
    (decide || modelledNote(L, vl)) + blocks.join('') +
    (siblings.length ? `<section id="more"><h2>${esc(L.moreOn(ind.name))}</h2><ul class="geo-list">${siblings.map(([k]) => `<li><a href="/${vl}/trade/${industry}/${topicSlug(k)}">${esc(L.topics[k] || k)}</a></li>`).join('')}</ul></section>` : '') +
    '<!--/SSR-->';
  const ld = [{ id: 'ld-breadcrumb', data: crumbJson([
    { name: 'KIRA RESEARCH', item: `${BASE}/${vl}/` }, { name: ind.name, item: `${BASE}/${vl}/trade/${industry}` }, { name: label, item: BASE + path }]) }];

  // Language editions that are indexable (each language's own claims against the same thresholds).
  const editions = [];
  for (const l of LOCALES) {
    const x = (await tradeIndex(l)).idx.get(industry);
    const cl = x && x.topics.get(topic);
    if (cl && tradeTopicIndexable(cl, topic)) editions.push(l);
  }
  await shell(req, res, {
    loc: vl, indexable, path, title: `${h1} — KIRA RESEARCH`, description: cut(claims[0].claim_text, 200), ld, content,
    hreflang: editions.map((l) => ({ locale: l, url: `${BASE}/${l}/trade/${industry}/${topicSlg}` })),
    xDefault: editions.includes('en') ? `${BASE}/en/trade/${industry}/${topicSlg}` : null,
  });
  return true;
}

async function renderTradeIndustry(req, res, loc, industry) {
  const { vl, fallback, idx, titles } = await tradeView(loc, industry, null);
  const ind = idx.get(industry);
  if (!ind) return notFound(req, res, loc);
  const L = T[vl];
  const topics = [...ind.topics.entries()].filter(([k]) => k !== 'other').sort((a, b) => b[1].length - a[1].length);
  const good = topics.filter(([k, v]) => tradeTopicIndexable(v, k));
  const path = `/${vl}/trade/${industry}`;
  const decide = await decideFor(ind, L, vl, titles);
  const content = '<!--SSR-->' +
    crumbs([{ name: L.library, href: `/${vl}/library` }, { name: ind.name }]) +
    `<h1>${esc(L.indH1(ind.name))}</h1><p class="geo-meta">${esc(L.indMeta(ind.name))}</p>` + decide +
    `<ul class="geo-list">${topics.map(([k, v]) => {
      const okT = tradeTopicIndexable(v, k);
      return `<li>${okT ? `<a href="/${vl}/trade/${industry}/${topicSlug(k)}">${esc(L.topics[k] || k)}</a>` : esc(L.topics[k] || k)} · ${esc(L.statements(v.length))}</li>`;
    }).join('')}</ul><!--/SSR-->`;
  const ld = [{ id: 'ld-breadcrumb', data: crumbJson([{ name: 'KIRA RESEARCH', item: `${BASE}/${vl}/` }, { name: ind.name, item: BASE + path }]) }];
  const editions = [];
  for (const l of LOCALES) {
    const x = (await tradeIndex(l)).idx.get(industry);
    if (x && [...x.topics].some(([k, v]) => tradeTopicIndexable(v, k))) editions.push(l);
  }
  await shell(req, res, {
    loc: vl, indexable: !fallback && good.length > 0, path, title: `${L.indH1(ind.name)} — KIRA RESEARCH`, description: cut(L.indMeta(ind.name), 200), ld, content,
    hreflang: editions.map((l) => ({ locale: l, url: `${BASE}/${l}/trade/${industry}` })),
    xDefault: editions.includes('en') ? `${BASE}/en/trade/${industry}` : null,
  });
  return true;
}

// ── hub index pages: /<loc>/markets and /<loc>/markets/<country> ──
async function groupName(key) {
  const i = key.indexOf('--');
  return i > 0 ? segmentName(key.slice(0, i)) : null;
}

async function renderCountry(req, res, loc, countrySlug) {
  const country = await countryBySlug(countrySlug);
  if (!country) return notFound(req, res, loc);
  const hubs = (await listHubs()).filter((h) => h.code === country.code);
  if (!hubs.length) return notFound(req, res, loc);
  const okFor = (l) => hubs.filter((h) => h.byLocale[l]);
  const fallback = loc !== 'en' && !okFor(loc).length;
  const vl = fallback ? 'en' : loc;
  const L = T[vl];
  const list = okFor(vl);
  const cName = countryName(country, vl);
  const groups = new Map();
  for (const h of list) {
    const g = (await groupName(h.segment)) || L.otherGroup;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push({ h, name: await segmentName(h.segment) });
  }
  const path = `/${vl}/markets/${countrySlug}`;
  const h1 = L.countryH1(cName);
  const content = '<!--SSR-->' + crumbs([{ name: L.library, href: `/${vl}/library` }, { name: L.marketsH1, href: `/${vl}/markets` }, { name: cName }]) +
    `<h1>${esc(h1)}</h1><p class="geo-meta">${esc(L.countryMeta(list.length))}</p>` +
    [...groups.entries()].sort((a, b) => (a[0] === L.otherGroup) - (b[0] === L.otherGroup) || a[0].localeCompare(b[0])).map(([g, items]) =>
      `<section><h2>${esc(g)}</h2><ul class="geo-list">${items.sort((a, b) => a.name.localeCompare(b.name)).map(({ h, name }) => `<li><a href="/${vl}/markets/${countrySlug}/${esc(h.segment)}">${esc(name)}</a> · ${esc(L.answersN(h.counts[vl]))}</li>`).join('')}</ul></section>`).join('') +
    '<!--/SSR-->';
  const editions = LOCALES.filter((l) => okFor(l).length);
  await shell(req, res, {
    loc: vl, indexable: !fallback && list.length > 0, path, title: `${h1} — KIRA RESEARCH`, description: cut(L.countryMeta(list.length), 200),
    ld: [{ id: 'ld-breadcrumb', data: crumbJson([{ name: 'KIRA RESEARCH', item: `${BASE}/${vl}/` }, { name: L.marketsH1, item: `${BASE}/${vl}/markets` }, { name: cName, item: BASE + path }]) }],
    content, hreflang: editions.map((l) => ({ locale: l, url: `${BASE}/${l}/markets/${countrySlug}` })),
    xDefault: editions.includes('en') ? `${BASE}/en/markets/${countrySlug}` : null,
  });
  return true;
}

async function renderMarkets(req, res, loc) {
  const hubs = await listHubs();
  const cos = await countries();
  const okFor = (l) => hubs.filter((h) => h.byLocale[l]);
  const fallback = loc !== 'en' && !okFor(loc).length;
  const vl = fallback ? 'en' : loc;
  const L = T[vl];
  const list = cos.map((c) => ({ c, n: okFor(vl).filter((h) => h.code === c.code).length })).filter((x) => x.n > 0)
    .sort((a, b) => countryName(a.c, vl).localeCompare(countryName(b.c, vl)));
  const path = `/${vl}/markets`;
  const content = '<!--SSR-->' + crumbs([{ name: L.library, href: `/${vl}/library` }, { name: L.marketsH1 }]) +
    `<h1>${esc(L.marketsH1)}</h1><p class="geo-meta">${esc(L.marketsMeta(list.length))}</p>` +
    `<ul class="geo-list">${list.map(({ c, n }) => `<li><a href="/${vl}/markets/${slugOf(c.name)}">${esc(countryName(c, vl))}</a> · ${esc(L.industriesN(n))}</li>`).join('')}</ul><!--/SSR-->`;
  const editions = LOCALES.filter((l) => okFor(l).length);
  await shell(req, res, {
    loc: vl, indexable: !fallback && list.length > 0, path, title: `${L.marketsH1} — KIRA RESEARCH`, description: cut(L.marketsMeta(list.length), 200),
    ld: [{ id: 'ld-breadcrumb', data: crumbJson([{ name: 'KIRA RESEARCH', item: `${BASE}/${vl}/` }, { name: L.marketsH1, item: BASE + path }]) }],
    content, hreflang: editions.map((l) => ({ locale: l, url: `${BASE}/${l}/markets` })),
    xDefault: editions.includes('en') ? `${BASE}/en/markets` : null,
  });
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const q = new URL(req.url, `https://${req.headers.host || 'x'}`).searchParams;
  const loc = loc2(q.get('loc'));
  const g = (k) => (q.get(k) || '').trim().toLowerCase().replace(/\/$/, '');
  const ok = (s) => /^[a-z0-9][a-z0-9-]{0,120}$/.test(s);
  try {
    const type = q.get('type');
    if (type === 'hub') logGeoHit(req, `/${loc}/markets/${g('country')}/${g('segment')}`);
    else if (type === 'trade') logGeoHit(req, `/${loc}/trade/${g('industry')}/${g('topic')}`);
    else if (type === 'market-country') logGeoHit(req, `/${loc}/markets/${g('country')}`);
    else if (type === 'markets') logGeoHit(req, `/${loc}/markets`);
    else if (type === 'trade-industry') logGeoHit(req, `/${loc}/trade/${g('industry')}`);
    if (type === 'hub' && ok(g('country')) && ok(g('segment'))) return void (await renderHub(req, res, loc, g('country'), g('segment')));
    if (type === 'trade' && ok(g('industry')) && ok(g('topic'))) return void (await renderTrade(req, res, loc, g('industry'), g('topic')));
    if (type === 'markets') return void (await renderMarkets(req, res, loc));
    if (type === 'market-country' && ok(g('country'))) return void (await renderCountry(req, res, loc, g('country')));
    if (type === 'trade-industry' && ok(g('industry'))) return void (await renderTradeIndustry(req, res, loc, g('industry')));
    await notFound(req, res, loc);
  } catch (err) {
    console.error('[geo]', q.get('type'), err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Server error');
  }
}
