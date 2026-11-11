// ============================================================
// KIRA RESEARCH — api/geo.js
// GEO hubs (G4): server-rendered pages built from kira_answers, field_claims and segment_crosswalk.
//   GET /api/geo?type=hub&loc=en&country=vietnam&segment=<segment_key>      /<loc>/markets/<country>/<segment>
//   GET /api/geo?type=trade&loc=en&industry=<slug>&topic=<topic-slug>       /<loc>/trade/<industry>/<topic>
//   GET /api/geo?type=trade-industry&loc=en&industry=<slug>                 /<loc>/trade/<industry>
// Content is English for now: non-EN routes render the same text, canonical = the EN URL, noindex,follow.
// Index rules (EN only): hub = >= 1 published report/transcript AND >= 5 published answers;
//   trade page = >= 3 claims from >= 2 transcripts; trade industry hub = at least one indexable topic.
// Every practitioner claim is printed with its basis_label (modelled interviews built on KIRA field research).
// Freshness: tables are read per request; the edge caches 10 min + stale-while-revalidate (vercel.json).
// ============================================================
import {
  BASE, LOCALES, esc, loadTemplate, fillTemplate, crumbJson, plain,
} from './_lib/ssr.js';
import {
  INTENT_ORDER, INTENT_LABEL, TOPIC_LABEL, TOPIC_INTENT, topicSlug, topicKey, sb,
  countryBySlug, countryByCode, segmentName, answersForHub, docTitles, hubIndexable,
  claimsForTranscripts, crosswalk, bizdirectSummary, tradeIndex, tradeTopicIndexable,
} from './_lib/geo.js';
import { answerBlock, claimItem } from './_lib/geo-html.js';

const cut = (s, n) => { const t = plain(s); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };
const day = (iso) => String(iso || '').slice(0, 10);
const loc2 = (l) => (LOCALES.includes(l) ? l : 'en');

function page(res, html, { status = 200, cache = true } = {}) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', cache ? 'public, s-maxage=600, stale-while-revalidate=86400' : 'public, s-maxage=60');
  res.status(status).send(html);
}

async function shell(req, res, o) {
  const url = `${BASE}${o.path}`;                                   // canonical is always the EN URL
  const ok = o.indexable && o.loc === 'en';
  page(res, fillTemplate(await loadTemplate('hub', req), {
    locale: 'en', title: o.title, description: o.description, canonical: url,
    robots: ok ? null : 'noindex,follow', hreflang: [], ld: o.ld || [], content: o.content,
  }), { status: o.status || 200, cache: !o.status });
}

const crumbs = (items) => `<nav class="r-crumbs" aria-label="Breadcrumb">${items.map((c, i) => (c.href ? `<a href="${esc(c.href)}">${esc(c.name)}</a>` : `<span>${esc(c.name)}</span>`) + (i < items.length - 1 ? '<span class="sep">›</span>' : '')).join('')}</nav>`;

function notFound(req, res, loc) {
  return shell(req, res, {
    loc, indexable: false, status: 404, path: `/${loc}/`, title: 'Page not found — KIRA RESEARCH', description: 'This page does not exist.',
    content: `<!--SSR--><h1>Page not found</h1><p>There is nothing published at this address. <a href="/${loc}/library">Browse the library</a>.</p><!--/SSR-->`,
  });
}

// ── segment hub ──────────────────────────────────────────
async function renderHub(req, res, loc, countrySlug, segment) {
  const country = await countryBySlug(countrySlug);
  if (!country) return notFound(req, res, loc);
  const answers = await answersForHub(country.code, segment);
  if (!answers.length) return notFound(req, res, loc);
  const segName = await segmentName(segment);
  const titles = await docTitles(answers.map((a) => a.source_ref && a.source_ref.slug));
  const indexable = hubIndexable(answers, titles);
  const updated = day(answers.reduce((m, a) => (a.updated_at > m ? a.updated_at : m), ''));
  const path = `/${loc}/markets/${countrySlug}/${segment}`;
  const h1 = `${country.name} ${segName}: key facts`;

  // Q&A grouped by intent (H2), question = H3.
  const byIntent = new Map();
  for (const a of answers) {
    if (!byIntent.has(a.intent)) byIntent.set(a.intent, []);
    byIntent.get(a.intent).push(a);
  }
  const intents = [...byIntent.keys()].sort((x, y) => INTENT_ORDER.indexOf(x) - INTENT_ORDER.indexOf(y));
  const qa = intents.map((i) => `<section id="${esc(i)}"><h2>${esc(INTENT_LABEL[i] || i)}</h2>${byIntent.get(i).map((a) => answerBlock(a, titles)).join('')}</section>`).join('');

  const docSlugs = [...new Set(answers.map((a) => a.source_ref && a.source_ref.slug).filter(Boolean))];
  const repSlugs = docSlugs.filter((s) => titles.reports.has(s));
  const trSlugs = docSlugs.filter((s) => titles.transcripts.has(s));

  // How the trade works: statements from this market's transcripts that feed the hub.
  const claims = (await claimsForTranscripts(trSlugs)).filter((c) => c.country_code === country.code);
  const trade = claims.length
    ? `<section id="how-the-trade-works"><h2>How the trade works</h2><ul class="geo-claims">${claims.slice(0, 20).map((c) => claimItem(c, titles)).join('')}</ul></section>` : '';

  // Who's who: BizDirect summary; nothing at all until it answers 200.
  let who = '';
  try {
    const cw = await crosswalk(country.code, segment);
    const bd = await bizdirectSummary(cw);
    const list = bd && (bd.companies || bd.items || bd.players);
    if (Array.isArray(list) && list.length) {
      const link = (x) => { const u = x.url || x.profile_url || x.link; return /^https:\/\/(www\.)?bizdirectasia\.com\//.test(u || '') ? u : ''; };
      const more = bd.list_url || bd.url;
      who = `<section id="whos-who"><h2>Who's who</h2><ul class="geo-list">${list.slice(0, 12).map((x) => {
        const n = esc(x.name || x.title || ''); const u = link(x);
        return n ? `<li>${u ? `<a href="${esc(u)}" rel="noopener">${n}</a>` : n}</li>` : '';
      }).join('')}</ul>` +
        (typeof more === 'string' && /^https:\/\/(www\.)?bizdirectasia\.com\//.test(more) ? `<p class="geo-note"><a href="${esc(more)}" rel="noopener">See the full company list on BizDirect Asia</a></p>` : '') + '</section>';
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
    const tr = (r.insight_translations || []).find((t) => t.locale === 'en' && t.status === 'published' && t.body);
    return tr ? `<li><a href="/en/insights/${esc(r.slug)}">${esc(tr.title)}</a></li>` : '';
  }).filter(Boolean);
  const related =
    `<section id="related"><h2>Related reports, interviews and insights</h2><ul class="geo-list">` +
    repSlugs.map((s) => `<li>Report: <a href="/en/reports/${esc(s)}">${esc(titles.reports.get(s))}</a></li>`).join('') +
    trSlugs.map((s) => `<li>Expert interview: <a href="/en/experts/transcripts/${esc(s)}">${esc(titles.transcripts.get(s))}</a></li>`).join('') +
    insItems.map((x) => x.replace('<li>', '<li>Insight: ')).join('') + '</ul></section>';

  const market = repSlugs.length ? `<section id="market-data"><div id="hub-market" data-report="${esc(repSlugs[0])}"></div></section>` : '';
  const content = '<!--SSR-->' +
    crumbs([{ name: 'Library', href: `/${loc}/library` }, { name: country.name }, { name: segName }]) +
    `<h1>${esc(h1)}</h1><p class="geo-meta">Last updated ${esc(updated)} · ${answers.length} sourced answers from KIRA RESEARCH reports and field research. Every figure shows its year and source.</p>` +
    qa + market + trade + who + related + '<!--/SSR-->';

  const ld = [
    { id: 'ld-breadcrumb', data: crumbJson([
      { name: 'KIRA RESEARCH', item: `${BASE}/${loc}/` }, { name: 'Library', item: `${BASE}/${loc}/library` },
      { name: `${country.name} ${segName}`, item: BASE + path }]) },
    { id: 'ld-faq', data: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: answers.slice(0, 40).map((a) => ({ '@type': 'Question', name: a.question, acceptedAnswer: { '@type': 'Answer', text: a.answer_short } })) } },
  ];
  await shell(req, res, { loc, indexable, path, title: `${h1} — KIRA RESEARCH`, description: cut(answers[0].answer_short, 200), ld, content });
  return true;
}

// ── trade pages ──────────────────────────────────────────
async function renderTrade(req, res, loc, industry, topicSlg) {
  const topic = topicKey(topicSlg);
  const { idx, titles } = await tradeIndex();
  const ind = idx.get(industry);
  const claims = ind && ind.topics.get(topic);
  if (!claims || topic === 'other') return notFound(req, res, loc);
  const indexable = tradeTopicIndexable(claims, topic);
  const label = TOPIC_LABEL[topic] || topic;
  const t = { transcripts: titles, reports: new Map() };
  const path = `/${loc}/trade/${industry}/${topicSlg}`;
  const h1 = `${ind.name}: ${label.toLowerCase()} — what practitioners say`;
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
      rel = (await sb(`kira_answers?status=eq.published&source_kind=eq.transcript&intent=eq.${intent}&country_code=eq.${encodeURIComponent(code)}&source_ref->>slug=in.(${slugs.map((s) => `"${s}"`).join(',')})&select=id,question,intent,answer_short,year,primary_source,source_kind,source_ref&limit=6`)).filter((a) => a.answer_short);
    }
    blocks.push(`<section id="${esc(code.toLowerCase())}"><h2>${esc(co ? co.name : code)}</h2><ul class="geo-claims">${list.map((c) => claimItem(c, t)).join('')}</ul>` +
      (rel.length ? `<h3 class="geo-note">Related answers</h3>${rel.map((a) => answerBlock(a, { transcripts: titles, reports: new Map() }, 'h3')).join('')}` : '') + '</section>');
  }
  const siblings = [...ind.topics.entries()].filter(([k, v]) => k !== topic && tradeTopicIndexable(v, k));
  const content = '<!--SSR-->' +
    crumbs([{ name: 'Library', href: `/${loc}/library` }, { name: ind.name, href: `/${loc}/trade/${industry}` }, { name: label }]) +
    `<h1>${esc(h1)}</h1><p class="geo-meta">Last updated ${esc(updated)} · ${claims.length} practitioner statements from ${new Set(claims.map((c) => c.transcript_slug)).size} modelled interviews. They are built on KIRA field research and never presented as one person's words.</p>` +
    blocks.join('') +
    (siblings.length ? `<section id="more"><h2>More on ${esc(ind.name)}</h2><ul class="geo-list">${siblings.map(([k]) => `<li><a href="/${loc}/trade/${industry}/${topicSlug(k)}">${esc(TOPIC_LABEL[k] || k)}</a></li>`).join('')}</ul></section>` : '') +
    '<!--/SSR-->';
  const ld = [{ id: 'ld-breadcrumb', data: crumbJson([
    { name: 'KIRA RESEARCH', item: `${BASE}/${loc}/` }, { name: ind.name, item: `${BASE}/${loc}/trade/${industry}` }, { name: label, item: BASE + path }]) }];
  await shell(req, res, { loc, indexable, path, title: `${h1} — KIRA RESEARCH`, description: cut(claims[0].claim_text, 200), ld, content });
  return true;
}

async function renderTradeIndustry(req, res, loc, industry) {
  const { idx } = await tradeIndex();
  const ind = idx.get(industry);
  if (!ind) return notFound(req, res, loc);
  const topics = [...ind.topics.entries()].filter(([k]) => k !== 'other').sort((a, b) => b[1].length - a[1].length);
  const good = topics.filter(([k, v]) => tradeTopicIndexable(v, k));
  const path = `/${loc}/trade/${industry}`;
  const content = '<!--SSR-->' +
    crumbs([{ name: 'Library', href: `/${loc}/library` }, { name: ind.name }]) +
    `<h1>${esc(ind.name)}: how the trade works</h1><p class="geo-meta">Practitioner views on ${esc(ind.name.toLowerCase())} across Asian markets, grouped by topic. Statements come from modelled interviews built on KIRA field research.</p>` +
    `<ul class="geo-list">${topics.map(([k, v]) => {
      const ok = tradeTopicIndexable(v, k);
      return `<li>${ok ? `<a href="/${loc}/trade/${industry}/${topicSlug(k)}">${esc(TOPIC_LABEL[k] || k)}</a>` : esc(TOPIC_LABEL[k] || k)} · ${v.length} statements</li>`;
    }).join('')}</ul><!--/SSR-->`;
  const ld = [{ id: 'ld-breadcrumb', data: crumbJson([{ name: 'KIRA RESEARCH', item: `${BASE}/${loc}/` }, { name: ind.name, item: BASE + path }]) }];
  await shell(req, res, { loc, indexable: good.length > 0, path, title: `${ind.name}: how the trade works — KIRA RESEARCH`, description: `Practitioner views on ${ind.name} in Asian markets, by topic.`, ld, content });
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
    if (type === 'hub' && ok(g('country')) && ok(g('segment'))) return void (await renderHub(req, res, loc, g('country'), g('segment')));
    if (type === 'trade' && ok(g('industry')) && ok(g('topic'))) return void (await renderTrade(req, res, loc, g('industry'), g('topic')));
    if (type === 'trade-industry' && ok(g('industry'))) return void (await renderTradeIndustry(req, res, loc, g('industry')));
    await notFound(req, res, loc);
  } catch (err) {
    console.error('[geo]', q.get('type'), err.message);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Server error');
  }
}
