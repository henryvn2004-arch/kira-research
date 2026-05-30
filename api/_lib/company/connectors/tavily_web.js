// ============================================================
// Tavily web search connector — overview enrichment + risk news screening.
//
// Runs TWO parallel searches per enrichment:
//   1. General overview   → description, website facts
//   2. Risk-focused       → risk_news_count, risk_news_articles facts
//
// Source: https://api.tavily.com/search
// Requires: TAVILY_API_KEY env var.
// TTL 90 days.
// ============================================================

import { failedResult } from '../connector.js';

const TAVILY_BASE = 'https://api.tavily.com/search';

// Domains to exclude from website fact — aggregators, not company sites
const EXCLUDE_DOMAINS = [
  'masothue.com', 'vietqr.io', 'tracuumst.com', 'mst.vn',
  'wikipedia.org', 'wikiwand.com',
  'bloomberg.com', 'reuters.com', 'cafef.vn', 'vneconomy.vn',
];

const COUNTRY_LABELS = {
  VN: 'Vietnam', JP: 'Japan', KR: 'South Korea', AU: 'Australia',
  SG: 'Singapore', MY: 'Malaysia', ID: 'Indonesia', TH: 'Thailand',
  PH: 'Philippines', NZ: 'New Zealand',
};

// Risk search terms per country (native language prioritised for better recall)
const RISK_TERMS = {
  VN: 'kiện tụng OR lừa đảo OR phá sản OR "nợ thuế" OR "vi phạm pháp luật"',
  JP: '訴訟 OR 詐欺 OR 破産 OR 脱税 OR 不正',
  KR: '소송 OR 사기 OR 파산 OR 탈세 OR 위반',
  AU: 'lawsuit OR fraud OR bankruptcy OR "ASIC action" OR liquidation',
  SG: 'lawsuit OR fraud OR bankruptcy OR "MAS action" OR "court order"',
  DEFAULT: 'lawsuit OR fraud OR bankruptcy OR sanctions OR "court case"',
};

async function tavilySearch(query, apiKey, maxResults) {
  const res = await globalThis.fetch(TAVILY_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      max_results:  maxResults,
      include_answer: true,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`tavily_http_${res.status}`);
  return res.json();
}

export async function fetch(entity, _ctx) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return failedResult('no_tavily_key');

  const country      = (entity.country_code || 'VN').toUpperCase();
  const countryLabel = COUNTRY_LABELS[country] || country;
  const riskTerms    = RISK_TERMS[country] || RISK_TERMS.DEFAULT;

  const overviewQuery = `${entity.canonical_name} ${countryLabel} company official overview`;
  const riskQuery     = `${entity.canonical_name} ${countryLabel} ${riskTerms}`;

  let overviewJson, riskJson;
  try {
    const [overviewRes, riskRes] = await Promise.allSettled([
      tavilySearch(overviewQuery, apiKey, 5),
      tavilySearch(riskQuery,    apiKey, 5),
    ]);
    if (overviewRes.status === 'fulfilled') overviewJson = overviewRes.value;
    if (riskRes.status     === 'fulfilled') riskJson     = riskRes.value;
  } catch (err) {
    if (err.name === 'TimeoutError') return failedResult('timeout');
    return failedResult(`fetch_error: ${err.message}`);
  }

  if (!overviewJson && !riskJson) return failedResult('both_searches_failed');

  const facts = [];
  const now   = new Date().toISOString();

  // ── Overview facts ────────────────────────────────────────────
  if (overviewJson) {
    if (overviewJson.answer && overviewJson.answer.length >= 40) {
      facts.push({
        key: 'description', value: overviewJson.answer.slice(0, 500).trim(),
        confidence: 0.7, observed_at: now,
      });
    }

    const officialResult = (overviewJson.results || []).find(r => {
      if (!r.url) return false;
      try {
        const host = new URL(r.url).hostname.replace(/^www\./, '');
        return !EXCLUDE_DOMAINS.some(d => host.includes(d));
      } catch { return false; }
    });
    if (officialResult?.url) {
      try {
        const host = new URL(officialResult.url).hostname;
        facts.push({ key: 'website', value: `https://${host}`, confidence: 0.6, observed_at: now });
      } catch { /* ignore bad URLs */ }
    }
  }

  // ── Risk news facts ───────────────────────────────────────────
  if (riskJson) {
    const articles = (riskJson.results || [])
      .filter(a => a.url && a.title && (a.score || 0) >= 0.4)
      .slice(0, 5)
      .map(a => ({
        title:          a.title,
        url:            a.url,
        published_date: a.published_date || null,
        snippet:        a.content ? a.content.slice(0, 220) : null,
        score:          Math.round((a.score || 0) * 100) / 100,
      }));

    facts.push({ key: 'risk_news_count',    value: articles.length, confidence: 0.8, observed_at: now });
    if (articles.length > 0) {
      facts.push({ key: 'risk_news_articles', value: articles, confidence: 0.8, observed_at: now });
    }
  }

  return {
    facts,
    edges: [],
    raw: {
      overview_answer_len: overviewJson?.answer?.length || 0,
      risk_results:        riskJson?.results?.length    || 0,
    },
    coverage_status: facts.length > 0 ? 'found' : 'checked_empty',
  };
}
