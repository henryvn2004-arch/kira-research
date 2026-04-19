// KIRA RESEARCH — api/browser-research.js
// Server-side proxy for Anthropic web_search tool.
// Browser calls this to get live market data before planning.
// Uses web_search tool so no Perplexity API key needed.
//
// Why server-side: API key must stay in Vercel env vars, not exposed to browser.

export const config = { maxDuration: 55, runtime: 'nodejs' };

const ANT_URL = 'https://api.anthropic.com/v1/messages';
const ANT_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL   = 'claude-sonnet-4-20250514';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country, reportType, questions, companies } = req.body;
  if (!industry || !country) {
    return res.status(400).json({ error: 'Missing industry or country' });
  }

  const typeLabel = {
    market_overview:         'market overview',
    competitive_analysis:    'competitive analysis',
    customer_intelligence:   'customer intelligence',
    value_chain:             'value chain analysis',
    proposition_development: 'proposition development',
    partner_search:          'partner search',
    go_to_market:            'go-to-market strategy',
  }[reportType] || 'market research';

  const prompt = `Research the ${industry} market in ${country} for a ${typeLabel} report.
${companies ? `Companies to cover: ${companies}` : ''}
${questions  ? `Specific focus: ${questions}`    : ''}

Search for and compile:
1. Market size (USD value, recent year) and growth rate / CAGR
2. Top 3-5 companies and their estimated market share
3. Main distribution channels and their share %
4. Price tiers and typical price ranges
5. Key market trends and growth drivers (2023-2024)
6. Regulatory environment (key rules, recent changes)
7. Consumer behavior or demand characteristics

Use web search to find current data. Attribute figures to sources.
Be specific with numbers. Max 500 words.`;

  try {
    const r = await fetch(ANT_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       ANT_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1200,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Anthropic API error:', r.status, errText.slice(0, 300));
      // Don't fail — return empty so generate-report falls back to knowledge
      return res.json({ research: '', error: `API ${r.status}` });
    }

    const data = await r.json();

    // Extract text from all content blocks (handles tool_use + text interleaved)
    const research = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n\n')
      .trim();

    return res.json({ research });

  } catch (e) {
    console.error('browser-research error:', e.message);
    // Non-fatal: return empty string so caller falls back gracefully
    return res.json({ research: '', error: e.message });
  }
}
