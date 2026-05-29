// ============================================================
// Company Intelligence — unified search() interface
//
// Routes queries to the right external search provider.
// Provider priority:
//   entity lookup → Exa
//   news/scandal   → Tavily
//   general/scale  → Serper (fallback)
//
// Add API keys to Vercel env vars:
//   TAVILY_API_KEY, SERPER_API_KEY, EXA_API_KEY
// Missing key → that provider is skipped; auto routing falls back.
// ============================================================

/**
 * @typedef {Object} SearchResult
 * @property {string} title
 * @property {string} url
 * @property {string} snippet
 * @property {string} [published_date]
 */

/**
 * @typedef {Object} SearchResponse
 * @property {SearchResult[]} results
 * @property {string}         provider   - which provider actually answered
 * @property {number}         cost_units - 1 for standard call; do NOT use deep-research endpoints
 */

/**
 * Perform a web search via the best available provider for the given type.
 *
 * @param {string} query
 * @param {{
 *   provider?:    'tavily'|'serper'|'exa'|'auto',
 *   type?:        'entity'|'news'|'general',
 *   num_results?: number,
 *   lang?:        string,   // e.g. 'vi' for Vietnamese sources
 * }} opts
 * @returns {Promise<SearchResponse>}
 */
export async function search(query, opts = {}) {
  const {
    provider = 'auto',
    type = 'general',
    num_results = 5,
    lang,
  } = opts;

  const chosen = provider === 'auto' ? pickProvider(type) : provider;

  switch (chosen) {
    case 'tavily': return searchTavily(query, { num_results, lang });
    case 'exa':    return searchExa(query, { num_results, lang });
    case 'serper': return searchSerper(query, { num_results, lang });
    default:
      throw new Error(`Unknown search provider: ${chosen}`);
  }
}

// ── Provider implementations (Sprint 6 will flesh these out) ──

async function searchTavily(query, { num_results, lang }) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error('TAVILY_API_KEY not set');

  const res = await globalThis.fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'basic',  // never use 'advanced' — costs ~250 units
      max_results: num_results,
      ...(lang ? { include_domains: [], exclude_domains: [] } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const data = await res.json();

  return {
    provider: 'tavily',
    cost_units: 1,
    results: (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content || r.snippet || '',
      published_date: r.published_date,
    })),
  };
}

async function searchExa(query, { num_results }) {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error('EXA_API_KEY not set');

  const res = await globalThis.fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify({
      query,
      numResults: num_results,
      useAutoprompt: true,
      contents: { text: { maxCharacters: 1000 } },
    }),
  });
  if (!res.ok) throw new Error(`Exa error: ${res.status}`);
  const data = await res.json();

  return {
    provider: 'exa',
    cost_units: 1,
    results: (data.results || []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.text || r.excerpt || '',
      published_date: r.publishedDate,
    })),
  };
}

async function searchSerper(query, { num_results, lang }) {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error('SERPER_API_KEY not set');

  const res = await globalThis.fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': key },
    body: JSON.stringify({
      q: query,
      num: num_results,
      ...(lang ? { hl: lang, gl: lang === 'vi' ? 'vn' : undefined } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Serper error: ${res.status}`);
  const data = await res.json();

  return {
    provider: 'serper',
    cost_units: 1,
    results: (data.organic || []).map(r => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet || '',
      published_date: r.date,
    })),
  };
}

function pickProvider(type) {
  if (type === 'entity') {
    if (process.env.EXA_API_KEY)    return 'exa';
    if (process.env.SERPER_API_KEY) return 'serper';
    if (process.env.TAVILY_API_KEY) return 'tavily';
  }
  if (type === 'news') {
    if (process.env.TAVILY_API_KEY) return 'tavily';
    if (process.env.SERPER_API_KEY) return 'serper';
  }
  // general / fallback order
  if (process.env.SERPER_API_KEY) return 'serper';
  if (process.env.TAVILY_API_KEY) return 'tavily';
  if (process.env.EXA_API_KEY)    return 'exa';
  throw new Error('No search API key configured (SERPER_API_KEY / TAVILY_API_KEY / EXA_API_KEY)');
}
