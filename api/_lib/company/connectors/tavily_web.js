// ============================================================
// Tavily web search connector — description + website enrichment
//
// Source: https://api.tavily.com/search
// Requires: TAVILY_API_KEY env var.
// Returns facts: description, website
//
// Runs once per entity at confidence 0.7 (LLM-summarised web snippet).
// TTL 90 days — company descriptions rarely change.
// ============================================================

import { failedResult } from '../connector.js';

const TAVILY_BASE = 'https://api.tavily.com/search';

// Domains to exclude from website fact — these are info aggregators, not company sites
const EXCLUDE_DOMAINS = [
  'masothue.com', 'vietqr.io', 'tracuumst.com', 'mst.vn',
  'wikipedia.org', 'wikiwand.com',
  'bloomberg.com', 'reuters.com', 'cafef.vn', 'vneconomy.vn',
];

export async function fetch(entity, _ctx) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return failedResult('no_tavily_key');

  const countryLabel = entity.country_code === 'VN' ? 'Vietnam' : entity.country_code;
  const query = `${entity.canonical_name} ${countryLabel} company official overview`;

  let json;
  try {
    const res = await globalThis.fetch(TAVILY_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return failedResult(`tavily_http_${res.status}`);
    json = await res.json();
  } catch (err) {
    if (err.name === 'TimeoutError') return failedResult('timeout');
    return failedResult(`fetch_error: ${err.message}`);
  }

  const facts = [];
  const now = new Date().toISOString();

  // Tavily's synthesised answer — use as company description
  if (json.answer && json.answer.length >= 40) {
    // Trim to 500 chars to avoid bloating the facts table
    const desc = json.answer.slice(0, 500).trim();
    facts.push({ key: 'description', value: desc, confidence: 0.7, observed_at: now });
  }

  // Best candidate for official website — pick highest-scored result not on an exclude domain
  const officialResult = (json.results || []).find(r => {
    if (!r.url) return false;
    try {
      const host = new URL(r.url).hostname.replace(/^www\./, '');
      return !EXCLUDE_DOMAINS.some(d => host.includes(d));
    } catch {
      return false;
    }
  });
  if (officialResult?.url) {
    try {
      const host = new URL(officialResult.url).hostname;
      facts.push({ key: 'website', value: `https://${host}`, confidence: 0.6, observed_at: now });
    } catch { /* ignore bad URLs */ }
  }

  return {
    facts,
    edges: [],
    raw: { query, answer_length: json.answer?.length || 0, result_count: json.results?.length || 0 },
    coverage_status: facts.length > 0 ? 'found' : 'checked_empty',
  };
}
