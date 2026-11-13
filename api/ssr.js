// ============================================================
// KIRA RESEARCH — api/ssr.js
// Server-rendered HTML for the four content page types, so crawlers that do not run JavaScript
// (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot…) get the real title and text in the first response.
//
//   GET /api/ssr?type=transcript|insight|report&loc=en&slug=…     (vercel.json rewrites point here)
//
// The page template (public/en/<type>/_view.html) is filled with escaped content; the client script
// still runs and re-renders over it, exactly as before. Same data and same gates as the JSON APIs:
//   transcript  published rows; the dialogue follows setting transcripts.public_full (default on)
//   insight     published, published_at reached, with a body
//   report      only what /api/library-report already makes public: abstract/lede, hook, details,
//               table of contents. Never the paid text.
//   report slug that is not published but is a topic → coming-soon page (noindex except S20 seo_test).
// Anything else → the unchanged template, so the client shows "not found" as it did before.
// ============================================================
import { coverUrls } from './_lib/cover.js';
import { plannedOf } from './_lib/planned.js';
import { logGeoHit } from './_lib/geo-hits.js';
import { keyQuestionsHtml, keyPointsHtml } from './_lib/geo-slots.js';
import { loadTranscript, splitFree, sourcesFor, sb as sbT } from './_lib/transcripts.js';
import {
  BASE, LOCALES, esc, loadTemplate, fillTemplate, send, crumbJson, titleCase, plain,
} from './_lib/ssr.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
async function sb(p) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

const L10N = {
  en: { execSummary: 'Executive summary', contents: (n) => `Table of contents · ${n} sections`, details: 'Report details', published: 'Published', pages: 'Pages', format: 'Format', glossary: 'Glossary', library: 'Library', insights: 'Insights', soon: 'Coming soon', planned: 'Planned contents', plannedNote: 'Planned before research starts. Page titles can change as the evidence comes in.', answer: 'What this report will answer', team: 'KIRA Research team', moreReport: 'Read the full report', paid: 'The full report is available to subscribers and buyers. The executive summary above is free to read.' },
  ja: { execSummary: 'エグゼクティブサマリー', contents: (n) => `目次 · ${n} セクション`, details: 'レポート情報', published: '発行', pages: 'ページ数', format: '形式', glossary: '用語集', library: 'ライブラリ', insights: 'インサイト', soon: '近日公開', planned: '予定している構成', plannedNote: '調査を始める前の計画です。調査の結果に応じてページ名が変わることがあります。', answer: 'このレポートで答える問い', team: 'KIRA Research チーム', moreReport: 'レポート全文を読む', paid: 'レポート全文は購読者・購入者向けです。上のエグゼクティブサマリーは無料で読めます。' },
  ko: { execSummary: '요약', contents: (n) => `목차 · ${n}개 섹션`, details: '보고서 정보', published: '발행', pages: '페이지', format: '형식', glossary: '용어집', library: '라이브러리', insights: '인사이트', soon: '곧 공개', planned: '예정된 구성', plannedNote: '조사를 시작하기 전의 계획입니다. 조사 결과에 따라 페이지 제목이 바뀔 수 있습니다.', answer: '이 보고서가 답하는 질문', team: 'KIRA Research 팀', moreReport: '전체 보고서 보기', paid: '전체 보고서는 구독자와 구매자에게 제공됩니다. 위의 요약은 무료로 읽을 수 있습니다.' },
  zh: { execSummary: '执行摘要', contents: (n) => `目录 · ${n} 个章节`, details: '报告信息', published: '发布', pages: '页数', format: '格式', glossary: '术语表', library: '资料库', insights: '洞察', soon: '即将发布', planned: '计划章节', plannedNote: '研究开始前的计划，页面标题可能随研究证据调整。', answer: '本报告将回答的问题', team: 'KIRA Research 团队', moreReport: '阅读完整报告', paid: '完整报告面向订阅用户和购买者。上方执行摘要可免费阅读。' },
};

const dateOf = (iso) => (iso ? String(iso).slice(0, 10) : '');
const cut = (s, n) => { const t = plain(s); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

// ── transcripts ──────────────────────────────────────────
const TAG = /\[([NF]\d+)\]/g;

async function renderTranscript(req, res, loc, slug) {
  const found = await loadTranscript(slug, loc);
  if (!found) return null;
  const { base, tr } = found;
  const served = found.locale;                                   // the language of the text on the page
  const { free, toc } = await splitFree(tr.sections || []);
  const texts = (tr.summary || []).concat(free.flatMap((s) => s.turns.map((t) => t.text)));
  const sources = sourcesFor(tr.sources, texts);

  const order = [];
  const note = (t) => { if (!order.includes(t)) order.push(t); };
  texts.forEach((x) => [...String(x).matchAll(TAG)].forEach((m) => note(m[1])));
  const chips = (text) => esc(text).replace(TAG, (_m, t) => {
    const src = sources[t];
    if (!src) return '';
    return `<a class="tv-chip ${t[0] === 'N' ? 'src' : 'fw'}" href="#ref-${t}" title="${esc(src.claim)}">${order.indexOf(t) + 1}</a>`;
  });

  const secHtml = free.map((s, i) => {
    let prevA = false;
    const turns = s.turns.map((t) => {
      if (t.who === 'A' && prevA) return `<p>${chips(t.text)}</p>`;
      const open = prevA ? '</div>' : '';
      prevA = t.who === 'A';
      return open + (t.who === 'Q'
        ? `<div class="tv-turn q"><div class="tv-who"><span class="tv-av q">KA</span>KIRA Analyst</div><p>${esc(t.text)}</p></div>`
        : `<div class="tv-turn a"><div class="tv-who"><span class="tv-av a">EX</span>Expert</div><p>${chips(t.text)}</p>`);
    }).join('') + (prevA ? '</div>' : '');
    return `<section class="tv-sec" id="s${i + 1}"><h3><span class="no">${String(i + 1).padStart(2, '0')}</span>${esc(s.title)}</h3>${turns}</section>`;
  }).join('');

  const tocHtml = toc.map((t, i) => `<li><a href="#s${i + 1}"><span>${esc(t.title)}</span></a></li>`).join('');
  const refs = order.filter((t) => sources[t]).map((t) => {
    const s = sources[t];
    const link = s.url ? ` · <a href="${esc(s.url)}" target="_blank" rel="noopener">link</a>` : '';
    return `<li id="ref-${t}"><span class="tv-chip static ${t[0] === 'N' ? 'src' : 'fw'}">${order.indexOf(t) + 1}</span><div><div class="c">${esc(s.claim)}</div><div class="m">${t[0] === 'N' ? 'Public source' : 'KIRA field interviews'} · ${esc(s.src)}${link}</div></div></li>`;
  }).join('');

  const content =
    '<!--SSR--><div class="tv-wrap">' +
      '<aside class="tv-side">' +
        `<div class="tv-card"><h4>Expert profile</h4><div class="tv-role">${esc(tr.expert_role)}</div><div class="tv-etype">${esc(tr.expert_type)} · profile drawn from KIRA field interviews</div><p class="tv-profile">${esc(tr.expert_profile)}</p></div>` +
        `<div class="tv-card"><h4>Contents</h4><ol class="tv-toc">${tocHtml}</ol></div>` +
      '</aside><div>' +
        `<div class="tv-head"><div class="tv-kicker">${esc(base.interview_type)} · Expert interview</div><h1>${esc(tr.title)}</h1>` +
          `<dl class="tv-meta"><div><dt>Format</dt><dd>${esc(base.format)}</dd></div><div><dt>As of</dt><dd>${esc(tr.as_of)}</dd></div><div><dt>Market</dt><dd>${esc(base.market)}</dd></div><div><dt>Industry</dt><dd>${esc(base.industry)}</dd></div><div><dt>Length</dt><dd>${esc(tr.length_label || '')}</dd></div></dl>` +
          `<div class="tv-tags">${(tr.companies || []).map((c) => `<span class="tv-tag">${esc(c)}</span>`).join('')}</div>` +
          `<div class="tv-note"><b>${esc(base.format)}.</b> ${esc(tr.basis)}</div></div>` +
        `<div class="tv-block"><h2>Summary</h2><ul class="tv-summary">${(tr.summary || []).map((s) => `<li>${chips(s)}</li>`).join('')}</ul></div>` +
        `<div class="tv-block"><h2>Transcript</h2>${secHtml}</div>` +
        `<div class="tv-block"><h2>Sources and basis</h2><ol class="tv-refs">${refs}</ol></div>` +
      '</div></div><!--/SSR-->';

  // JSON-LD: Article + BreadcrumbList; FAQPage only from Q/A turns that are on the page.
  const url = `${BASE}/${served}/experts/transcripts/${base.slug}`;
  const faq = [];
  for (const s of free) {
    for (let i = 0; i < s.turns.length && faq.length < 10; i++) {
      if (s.turns[i].who !== 'Q') continue;
      const ans = [];
      for (let j = i + 1; j < s.turns.length && s.turns[j].who === 'A'; j++) ans.push(plain(s.turns[j].text).replace(TAG, '').replace(/\s+/g, ' ').trim());
      if (ans.length) faq.push({ '@type': 'Question', name: plain(s.turns[i].text), acceptedAnswer: { '@type': 'Answer', text: ans.join(' ') } });
    }
  }
  const avail = await sbT(`expert_transcript_translations?transcript_id=eq.${base.id}&status=eq.published&select=locale`);
  const have = LOCALES.filter((l) => avail.some((r) => r.locale === l));
  const ld = [
    { id: 'ld-article', data: {
      '@context': 'https://schema.org', '@type': 'Article', headline: tr.title, description: tr.blurb || undefined, url,
      datePublished: base.published_at || undefined, inLanguage: served === 'zh' ? 'zh-Hans' : served,
      author: { '@type': 'Organization', name: 'Kira Research', url: BASE + '/' },
      publisher: { '@type': 'Organization', name: 'Kira Research', url: BASE + '/', logo: { '@type': 'ImageObject', url: BASE + '/logo.png' } },
      mainEntityOfPage: url, about: [base.market, base.industry].filter(Boolean),
    } },
    { id: 'ld-breadcrumb', data: crumbJson([
      { name: 'KIRA RESEARCH', item: `${BASE}/${served}/` },
      { name: 'Kira Experts', item: `${BASE}/${served}/experts/` },
      { name: 'Transcripts', item: `${BASE}/en/experts/transcripts/` },
      { name: tr.title, item: url },
    ]) },
  ];
  if (faq.length >= 2) ld.push({ id: 'ld-faq', data: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq } });

  const html = fillTemplate(await loadTemplate('transcript', req), {
    locale: served,
    title: `${tr.title} — Kira Experts — KIRA Research`,
    description: tr.blurb || cut(tr.basis, 200),
    canonical: url,
    hreflang: have.map((l) => ({ locale: l, url: `${BASE}/${l}/experts/transcripts/${base.slug}` })),
    xDefault: have.includes('en') ? `${BASE}/en/experts/transcripts/${base.slug}` : null,
    ld, content,
    slots: { KP: await keyPointsHtml(base.slug, served).catch(() => '') },
  });
  send(res, html);
  return true;
}

// ── insights ─────────────────────────────────────────────
async function renderInsight(req, res, loc, slug) {
  const rows = await sb(`insights?slug=eq.${encodeURIComponent(slug)}&status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&select=*&limit=1`);
  const base = rows[0];
  if (!base) return null;
  let served = loc;
  let trs = await sb(`insight_translations?insight_id=eq.${base.id}&status=eq.published&select=*`);
  let tr = trs.find((r) => r.locale === loc);
  if (!tr) { tr = trs.find((r) => r.locale === 'en'); served = 'en'; }
  if (!tr || !tr.body || !String(tr.body).trim()) return null;
  const have = LOCALES.filter((l) => trs.some((r) => r.locale === l && r.body));
  const url = `${BASE}/${served}/insights/${base.slug}`;
  const t = L10N[served];
  const desc = cut(tr.excerpt || tr.lede || tr.body, 200);
  const cover = coverUrls(base);
  const minutes = (String(tr.read_time || '').match(/\d+/) || [])[0];

  // body is HTML stored in the DB (written only with the service key); the client inserts it raw as well.
  const content = '<!--SSR--><div class="r-band"><div class="r-container" style="padding-block:14px 32px">' +
    `<nav class="r-crumbs" aria-label="Breadcrumb"><a href="/${served}/insights/">${esc(t.insights)}</a>${base.country ? `<span class="sep">›</span><span>${esc(titleCase(base.country))}</span>` : ''}</nav>` +
    `<div class="art-hero"><div><div class="kick">${base.category ? `<span class="chip">${esc(String(base.category).replace(/-/g, ' '))}</span>` : ''}` +
    `${base.country ? `<span>${esc(titleCase(base.country))}</span>` : ''}${base.industry ? `<span>${esc(base.industry)}</span>` : ''}` +
    `${base.published_at ? `<span>${esc(dateOf(base.published_at))}</span>` : ''}${minutes ? `<span>${esc(minutes)} min</span>` : ''}</div>` +
    `<h1>${esc(tr.title)}</h1>${tr.excerpt ? `<p class="lede">${esc(tr.excerpt)}</p>` : ''}` +
    `<div class="meta"><span>${esc(t.team)}</span></div></div></div></div></div>` +
    `<div class="r-container"><div class="art"><div style="min-width:0"><div class="art-body"><div class="article-body">${tr.body}</div></div></div></div></div><!--/SSR-->`;

  const faq = [];
  // Same rule as the page script: an answer runs to the next Q, the next heading, or the end.
  tr.body.split(/<strong>Q:\s*/).slice(1).forEach((chunk) => {
    const m = chunk.match(/^([^<]+)<\/strong>([\s\S]*)$/);
    if (!m || faq.length >= 8) return;
    const rest = m[2].split(/<h[1-6][\s>]/i)[0].replace(/^\s*(?:<[^>]+>\s*)*<strong>\s*A(?:nswer)?\s*:?\s*<\/strong>/i, '');
    const a = plain(rest).slice(0, 300);
    if (m[1].trim() && a) faq.push({ '@type': 'Question', name: m[1].trim(), acceptedAnswer: { '@type': 'Answer', text: a } });
  });
  const ld = [
    { id: 'ld-article', data: {
      '@context': 'https://schema.org', '@type': 'Article', headline: tr.title, description: desc, url,
      datePublished: base.published_at || undefined, dateModified: base.published_at || undefined,
      inLanguage: served === 'zh' ? 'zh-Hans' : served,
      author: { '@type': 'Organization', name: 'Kira Research', url: BASE + '/' },
      publisher: { '@type': 'Organization', name: 'Kira Research', url: BASE + '/', logo: { '@type': 'ImageObject', url: BASE + '/logo.png' } },
      image: (cover && cover.full) || BASE + '/logo.png', mainEntityOfPage: url,
    } },
    { id: 'ld-breadcrumb', data: crumbJson([
      { name: 'KIRA RESEARCH', item: `${BASE}/${served}/` },
      { name: 'Insights', item: `${BASE}/${served}/insights/` },
      { name: tr.title, item: url },
    ]) },
  ];
  if (faq.length >= 2) ld.push({ id: 'ld-faq', data: { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq } });

  send(res, fillTemplate(await loadTemplate('insight', req), {
    locale: served, title: `${tr.title} — KIRA RESEARCH`, description: desc, canonical: url,
    ogImage: cover && cover.full,
    hreflang: have.map((l) => ({ locale: l, url: `${BASE}/${l}/insights/${base.slug}` })),
    xDefault: `${BASE}/en/insights/${base.slug}`, ld, content,
  }));
  return true;
}

// ── reports (published) ──────────────────────────────────
async function renderReport(req, res, loc, slug) {
  const rows = await sb(`living_reports?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=*&limit=1`);
  const base = rows[0];
  if (!base) return null;
  const trs = await sb(`report_translations?report_id=eq.${base.id}&status=eq.published&select=locale,title,eyebrow,abstract,preview,toc,glossary_json,published_at,updated_at`);
  let served = loc;
  let tr = trs.find((r) => r.locale === loc);
  if (!tr) { tr = trs.find((r) => r.locale === 'en'); served = 'en'; }
  if (!tr) return null;
  const have = LOCALES.filter((l) => trs.some((r) => r.locale === l));
  const t = L10N[served];
  const pv = tr.preview && typeof tr.preview === 'object' ? tr.preview : {};
  const lede = pv.lede ? String(pv.lede) : '';
  const url = `${BASE}/${served}/reports/${base.slug}`;
  const desc = lede ? lede.slice(0, 200) : cut(tr.abstract, 200) || 'Market intelligence report from KIRA RESEARCH.';
  const cover = coverUrls(base, served);
  const toc = Array.isArray(tr.toc) ? tr.toc.filter((r) => r && r.name) : [];
  const prose = tr.abstract
    ? `<p>${esc(tr.abstract)}</p>`
    : (lede ? `<p><strong>${esc(lede)}</strong></p>` : '') + (Array.isArray(pv.paragraphs) ? pv.paragraphs.map((p) => `<p>${esc(p)}</p>`).join('') : '');
  const glossary = (Array.isArray(tr.glossary_json) ? tr.glossary_json : []).filter((g) => g && g.term);
  const eyebrow = tr.eyebrow || [titleCase(base.country), base.industry, base.year].filter(Boolean).join(' · ');
  const published = dateOf(tr.published_at || base.published_at);

  const content = '<!--SSR--><div class="r-band"><div class="r-container" style="padding-block:14px 0">' +
    `<nav class="r-crumbs" aria-label="Breadcrumb"><a href="/${served}/library">${esc(t.library)}</a>${base.country ? `<span class="sep">›</span><span>${esc(titleCase(base.country))}</span>` : ''}</nav></div></div>` +
    '<div class="r-container"><div class="rd"><article class="rd-main">' +
      `<div class="rd-eyebrow">${esc(eyebrow)}</div><h1>${esc(tr.title || base.slug)}</h1>` +
      (pv.hook ? `<p class="rd-hook">${esc(pv.hook)}</p>` : '') +
      (lede && tr.abstract ? `<p class="rd-lede">${esc(lede)}</p>` : '') +
      `<section class="rd-sec" id="overview"><h2 class="rd-sec-h">${esc(t.execSummary)}</h2><div class="rd-prose">${prose}</div></section>` +
      `<section class="rd-sec" id="report-details"><h2 class="rd-sec-h">${esc(t.details)}</h2><dl class="rd-dl">` +
        (published ? `<dt>${esc(t.published)}</dt><dd>${esc(published)}</dd>` : '') +
        (base.pages ? `<dt>${esc(t.pages)}</dt><dd>${esc(base.pages)}</dd>` : '') +
        `<dt>${esc(t.format)}</dt><dd>PDF</dd>` +
        (base.code ? `<dt>Code</dt><dd>${esc(base.code)}</dd>` : '') +
        (base.country ? `<dt>Market</dt><dd>${esc(titleCase(base.country))}</dd>` : '') +
        (base.industry ? `<dt>Industry</dt><dd>${esc(base.industry)}</dd>` : '') +
        (base.year ? `<dt>Year</dt><dd>${esc(base.year)}</dd>` : '') +
      '</dl></section>' +
      (toc.length ? `<section class="rd-sec" id="contents"><h2 class="rd-sec-h">${esc(t.contents(toc.length))}</h2><ol class="rd-contents">${toc.map((r) => `<li><span class="num">${esc(r.num || '')}</span> ${esc(r.name)}</li>`).join('')}</ol></section>` : '') +
      (glossary.length ? `<section class="rd-sec" id="glossary"><h2 class="rd-sec-h">${esc(t.glossary)}</h2><dl class="rd-gloss">${glossary.map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.definition || '')}</dd></div>`).join('')}</dl></section>` : '') +
      `<p class="rd-note">${esc(t.paid)}</p>` +
    '</article></div></div><!--/SSR-->';

  const ld = [
    { id: 'ld-product', data: {
      '@context': 'https://schema.org', '@type': 'Product', '@id': url + '#product', name: tr.title || base.slug, description: desc, url, sku: base.slug,
      category: [base.industry, titleCase(base.country)].filter(Boolean).join(' · ') || 'Market Research',
      image: cover ? cover.full : undefined,
      brand: { '@type': 'Organization', name: 'Kira Research', url: BASE + '/' },
      publisher: { '@type': 'Organization', name: 'Kira Research', url: BASE + '/', logo: { '@type': 'ImageObject', url: BASE + '/logo.png' } },
    } },
    { id: 'ld-breadcrumb', data: crumbJson([
      { name: 'KIRA RESEARCH', item: `${BASE}/${served}/` },
      { name: 'Library', item: `${BASE}/${served}/library` },
      { name: tr.title || base.slug, item: url },
    ]) },
  ];

  send(res, fillTemplate(await loadTemplate('report', req), {
    locale: served, title: `${tr.title || 'Report'} — KIRA RESEARCH`, description: desc, canonical: url,
    ogImage: cover && cover.full,
    hreflang: have.map((l) => ({ locale: l, url: `${BASE}/${l}/reports/${base.slug}` })),
    xDefault: `${BASE}/en/reports/${base.slug}`, ld, content,
    slots: { KQ: await keyQuestionsHtml(base.slug, served).catch(() => '') },
  }));
  return true;
}

// ── coming-soon (a report slug that is a planned topic) ──
async function renderSoon(req, res, loc, slug, query) {
  if (!/^[a-z0-9][a-z0-9-]{2,160}$/.test(slug)) return null;
  const rows = await sb(
    `topics?slug=eq.${encodeURIComponent(slug)}&status=neq.rejected&limit=1` +
    '&select=id,slug,year,title,buyer_question,questions,report_id,signals,' +
    'country:tax_countries(name),industry:tax_industries(name),competency:tax_competencies(label)'
  );
  const tp = rows[0];
  if (!tp) return null;
  if (tp.report_id) {
    const rep = await sb(`living_reports?id=eq.${tp.report_id}&status=eq.published&select=slug&limit=1`);
    if (rep.length) {
      res.setHeader('Cache-Control', 'public, s-maxage=300');
      res.setHeader('Location', `/${loc}/reports/${encodeURIComponent(rep[0].slug)}${query}`);
      res.status(302).end();
      return true;
    }
  }
  const t = L10N[loc];
  const sig = tp.signals || {};
  const hook = typeof sig.hook === 'string' ? sig.hook : '';
  const planned = plannedOf(sig);
  const questions = Array.isArray(tp.questions) ? tp.questions : [];
  const indexable = sig.seo_test === true && loc === 'en';
  const chips = [tp.country && tp.country.name, tp.industry && tp.industry.name, tp.competency && tp.competency.label, tp.year].filter(Boolean);
  const url = `${BASE}/${loc}/reports/${tp.slug}`;
  const desc = indexable ? [hook, tp.buyer_question].filter(Boolean).join(' ').slice(0, 300) || cut(tp.title, 200) : (hook || tp.buyer_question || tp.title).slice(0, 300);

  const body = planned
    ? `<h2>${esc(t.planned)}</h2><p class="cs-exec">${esc(t.plannedNote)}</p><ol class="cs-toc cs-toc2">${planned.map((c) => `<li><div><b>${esc(c.title)}</b><ul>${c.pages.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></li>`).join('')}</ol>`
    : (questions.length ? `<h2>${esc(t.answer)}</h2><ol class="cs-toc">${questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>` : '');
  const content = '<!--SSR--><div class="r-band"><div class="r-container"><div class="r-crumbs">' +
    `<a href="/${loc}/library">${esc(t.library)}</a><span class="sep">›</span><span>${esc((tp.country && tp.country.name) || '')}</span></div>` +
    `<div class="cs-chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('')}<span class="chip">${esc(t.soon)}</span></div>` +
    `<h1>${esc(tp.title)}</h1>${hook ? `<p class="cs-q">${esc(hook)}</p>` : ''}` +
    `${tp.buyer_question ? `<p class="cs-q">${esc(tp.buyer_question)}</p>` : ''}${body}</div></div><!--/SSR-->`;

  send(res, fillTemplate(await loadTemplate('report', req), {
    locale: loc, title: `${tp.title} — KIRA RESEARCH`, description: desc, canonical: url,
    robots: indexable ? null : 'noindex,follow',
    hreflang: [], content,
  }));
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const url = new URL(req.url, `https://${req.headers.host || 'x'}`);
  const type = url.searchParams.get('type') || '';
  const loc = LOCALES.includes(url.searchParams.get('loc')) ? url.searchParams.get('loc') : 'en';
  const slug = (url.searchParams.get('slug') || '').trim().toLowerCase().replace(/\/$/, '');
  const qs = new URLSearchParams(url.searchParams); ['type', 'loc', 'slug'].forEach((k) => qs.delete(k));
  const query = qs.toString() ? `?${qs}` : '';
  const PLURAL = { transcript: 'experts/transcripts', insight: 'insights', report: 'reports' };
  if (PLURAL[type]) logGeoHit(req, `/${loc}/${PLURAL[type]}/${slug}`);

  try {
    let done = null;
    if (/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      if (type === 'transcript') done = await renderTranscript(req, res, loc, slug);
      else if (type === 'insight') done = await renderInsight(req, res, loc, slug);
      else if (type === 'report') done = (await renderReport(req, res, loc, slug)) || (await renderSoon(req, res, loc, slug, query));
    }
    if (done) return;
    // Unknown slug: the unchanged template, as before; the client shows "not found".
    const tplType = ['transcript', 'insight', 'report'].includes(type) ? type : 'report';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.status(200).send(await loadTemplate(tplType, req));
  } catch (err) {
    console.error('[ssr]', type, slug, err.message);
    // Never take the page down because of this function: serve the plain template.
    try {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(await loadTemplate(['transcript', 'insight', 'report'].includes(type) ? type : 'report', req));
    } catch (_e) { res.status(500).send('Server error'); }
  }
}
