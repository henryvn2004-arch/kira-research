// ============================================================
// KIRA RESEARCH — api/cron-insights.js
// GET /api/cron-insights
// Authorization: Bearer CRON_SECRET
// Runs daily via pg_cron — generates 2-3 SEO insights articles
// ============================================================

export const config = { maxDuration: 60 };

import { createClient } from '@supabase/supabase-js';

const supabase       = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
const CRON_SECRET    = process.env.CRON_SECRET;

// Topics rotated daily — Claude picks 2-3 per run
const TOPIC_POOL = [
  { industry: 'fintech',     country: 'Vietnam',     query: 'Vietnam fintech digital payments market 2026' },
  { industry: 'fintech',     country: 'Indonesia',   query: 'Indonesia fintech market mobile banking 2026' },
  { industry: 'ecommerce',   country: 'Indonesia',   query: 'Indonesia e-commerce market growth 2026' },
  { industry: 'ecommerce',   country: 'Vietnam',     query: 'Vietnam e-commerce market trends 2026' },
  { industry: 'fmcg',        country: 'Thailand',    query: 'Thailand FMCG packaged food consumer trends 2026' },
  { industry: 'fmcg',        country: 'Philippines', query: 'Philippines FMCG market growth 2026' },
  { industry: 'automotive',  country: 'Vietnam',     query: 'Vietnam electric vehicle EV market 2026' },
  { industry: 'automotive',  country: 'Thailand',    query: 'Thailand EV manufacturing investment 2026' },
  { industry: 'healthtech',  country: 'Philippines', query: 'Philippines digital health telemedicine 2026' },
  { industry: 'logistics',   country: 'Vietnam',     query: 'Vietnam logistics supply chain market 2026' },
  { industry: 'logistics',   country: 'Malaysia',    query: 'Malaysia logistics cold chain market 2026' },
  { industry: 'edtech',      country: 'Indonesia',   query: 'Indonesia edtech education technology market 2026' },
  { industry: 'real_estate', country: 'Vietnam',     query: 'Vietnam real estate proptech market 2026' },
  { industry: 'fintech',     country: 'Thailand',    query: 'Thailand fintech insurtech wealthtech 2026' },
  { industry: 'fmcg',        country: 'Vietnam',     query: 'Vietnam FMCG consumer goods market 2026' },
];

export default async function handler(req, res) {
  // Auth
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Pick 2 topics that haven't been written about recently
  const { data: recent } = await supabase
    .from('insights')
    .select('industry, country')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const recentSet = new Set((recent || []).map(r => `${r.industry}:${r.country}`));
  const available = TOPIC_POOL.filter(t => !recentSet.has(`${t.industry}:${t.country}`));
  const topics    = available.slice(0, 2);

  if (!topics.length) {
    return res.json({ generated: 0, message: 'All topics recently covered' });
  }

  const generated = [];

  for (const topic of topics) {
    try {
      const article = await generateArticle(topic);
      if (article) {
        await supabase.from('insights').insert(article);
        generated.push(article.slug);
      }
    } catch (e) {
      console.error('Article generation error:', topic, e.message);
    }
  }

  return res.json({ generated: generated.length, slugs: generated });
}

async function generateArticle({ industry, country, query }) {
  const prompt = `You are a market research analyst writing a free SEO article for KIRA RESEARCH.

Topic: ${query}

Write a substantive market intelligence article (800-1200 words) for this topic.

Requirements:
- Title: specific, informative, includes the year 2026
- Structure: ## headings for major sections, ### for sub-sections
- Content: use current data from web search, be specific with numbers, name key players
- Tone: analytical, consulting-style, not promotional
- End with: a brief section "What This Means" with 2-3 strategic implications
- Format: markdown with **bold** for key terms and data points

The article should answer: What's happening in this market? What are the key trends? Who are the main players? What does it mean for businesses?

Return ONLY a JSON object (no markdown backticks) with:
{
  "title": "...",
  "content": "... full markdown article ...",
  "seo_title": "... SEO optimized title ...",
  "seo_description": "... 150 char meta description ..."
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Claude error: ' + JSON.stringify(data.error));

  // Extract text content (web_search tool may produce multiple blocks)
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // Parse JSON
  const clean = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  const slug = [
    industry,
    country.toLowerCase().replace(/\s+/g, '-'),
    'market',
    '2026',
    Date.now().toString().slice(-6),
  ].join('-');

  return {
    slug,
    title:           parsed.title,
    content:         parsed.content,
    industry,
    country,
    category:        'market-analysis',
    tags:            [industry, country, '2026'],
    seo_title:       parsed.seo_title || parsed.title,
    seo_description: parsed.seo_description || '',
    status:          'published',
  };
}
