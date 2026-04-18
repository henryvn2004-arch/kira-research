// api/research.js
// Perplexity API — market data collection
// Strategy: Tier 1 local language (ground truth) → Tier 2 English fallback (international benchmarks)
// NOTE: researchLanguage = language of the market being analyzed
//       report output language is always English (handled by generate-report.js)

export const config = { maxDuration: 60 };

// ─── Market research language mapping ────────────────────────────────────────
// researchLanguage: language used to QUERY the market (not the report output)
// keyTerms: core translated terms to construct local-language queries

const MARKET_LANG_MAP = {
  vietnam: {
    researchLanguage: 'vi',
    keyTerms: {
      market:       'thị trường',
      industry:     'ngành',
      growth:       'tăng trưởng',
      competition:  'cạnh tranh',
      consumer:     'người tiêu dùng',
      distribution: 'phân phối',
      pricing:      'giá cả',
      regulation:   'quy định pháp lý',
      forecast:     'dự báo',
      country:      'Việt Nam',
    },
  },
  indonesia: {
    researchLanguage: 'id',
    keyTerms: {
      market:       'pasar',
      industry:     'industri',
      growth:       'pertumbuhan',
      competition:  'persaingan',
      consumer:     'konsumen',
      distribution: 'distribusi',
      pricing:      'harga',
      regulation:   'regulasi',
      forecast:     'proyeksi',
      country:      'Indonesia',
    },
  },
  thailand: {
    researchLanguage: 'th',
    keyTerms: {
      market:       'ตลาด',
      industry:     'อุตสาหกรรม',
      growth:       'การเติบโต',
      competition:  'การแข่งขัน',
      consumer:     'ผู้บริโภค',
      distribution: 'การจัดจำหน่าย',
      pricing:      'ราคา',
      regulation:   'กฎระเบียบ',
      forecast:     'การคาดการณ์',
      country:      'ประเทศไทย',
    },
  },
  philippines: {
    researchLanguage: 'fil',
    keyTerms: {
      market:       'merkado',
      industry:     'industriya',
      growth:       'paglago',
      competition:  'kompetisyon',
      consumer:     'mamimili',
      distribution: 'distribusyon',
      pricing:      'presyo',
      regulation:   'regulasyon',
      forecast:     'pagtataya',
      country:      'Pilipinas',
    },
  },
  malaysia: {
    researchLanguage: 'ms',
    keyTerms: {
      market:       'pasaran',
      industry:     'industri',
      growth:       'pertumbuhan',
      competition:  'persaingan',
      consumer:     'pengguna',
      distribution: 'pengedaran',
      pricing:      'harga',
      regulation:   'peraturan',
      forecast:     'unjuran',
      country:      'Malaysia',
    },
  },
  singapore: {
    // Singapore is English-dominant — skip to Tier 2 directly
    researchLanguage: 'en',
    keyTerms: {
      market: 'market', industry: 'industry', growth: 'growth',
      competition: 'competition', consumer: 'consumer',
      distribution: 'distribution', pricing: 'pricing',
      regulation: 'regulation', forecast: 'forecast',
      country: 'Singapore',
    },
  },
};

// ─── Build Tier 1 queries (local language) ───────────────────────────────────

function buildLocalQueries(industry, country, terms) {
  const { market, growth, competition, consumer, distribution, pricing, regulation, forecast } = terms;
  const c = terms.country; // localized country name

  return [
    `${market} ${industry} ${c} 2025 2026 ${growth}`,
    `${industry} ${c} ${competition} doanh nghiệp lớn`.includes('doanh')
      ? `${industry} ${c} ${competition}`  // use translated term naturally
      : `${industry} ${c} ${competition}`,
    `${consumer} ${industry} ${c} hành vi xu hướng`.includes('hành vi')
      ? `${consumer} ${industry} ${c}`
      : `${consumer} ${industry} ${c}`,
    `${distribution} ${industry} ${c} kênh phân phối`.includes('kênh')
      ? `${distribution} ${industry} ${c}`
      : `${distribution} ${industry} ${c}`,
    `${pricing} ${industry} ${c}`,
    `${regulation} ${industry} ${c}`,
    `${market} ${industry} ${c} ${forecast} 2026 2027 2028`,
  ];
}

// ─── Build Tier 2 queries (English fallback) ─────────────────────────────────
// Used for: international benchmarks, foreign investment data, global context

function buildEnglishFallbackQueries(industry, country) {
  return [
    `${industry} market ${country} size growth 2025 2026`,
    `${industry} ${country} competitive landscape key players`,
    `${industry} ${country} foreign investment regulatory environment`,
    `${industry} Southeast Asia regional benchmark comparison`,
  ];
}

// ─── Call Perplexity ──────────────────────────────────────────────────────────

async function callPerplexity(query, researchLanguage) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [
        {
          role: 'system',
          content: `You are a market research analyst specializing in Southeast Asia.
Extract factual market data only. Return structured data with: key facts, statistics, source names, and year of data.
Search language: ${researchLanguage}.
Prioritize local sources, government statistics, industry associations, and local financial media.
If no reliable data found, respond with: {"noData": true}.`,
        },
        { role: 'user', content: query },
      ],
      max_tokens: 1000,
      return_citations: true,
    }),
  });

  if (!res.ok) throw new Error(`Perplexity error: ${res.status}`);
  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    citations: data.citations || [],
  };
}

// ─── Check if Tier 1 result has meaningful data ───────────────────────────────

function isDataThin(result) {
  if (!result || !result.content) return true;
  try {
    const parsed = JSON.parse(result.content);
    if (parsed.noData) return true;
  } catch (_) {}
  // heuristic: if response is very short, likely no useful data
  return result.content.length < 200;
}

// ─── Main research runner ─────────────────────────────────────────────────────

async function runResearch(industry, country) {
  const countryKey = country.toLowerCase().replace(/\s/g, '_');
  const langConfig = MARKET_LANG_MAP[countryKey];

  const results = { tier1: [], tier2: [], meta: { country, industry } };

  // ── Tier 1: Local language queries ──────────────────────────────────────────
  if (langConfig && langConfig.researchLanguage !== 'en') {
    const localQueries = buildLocalQueries(industry, country, langConfig.keyTerms);

    for (const query of localQueries) {
      try {
        const result = await callPerplexity(query, langConfig.researchLanguage);
        results.tier1.push({ query, ...result });
      } catch (err) {
        console.error(`Tier 1 query failed: ${query}`, err.message);
      }
    }
  }

  // ── Tier 2: English fallback ─────────────────────────────────────────────────
  // Always run for: international benchmarks + regional context
  // Also runs as primary if: country is EN-dominant OR tier 1 returned thin data
  const tier1Thin = results.tier1.every(r => isDataThin(r));
  const needsTier2 = !langConfig || langConfig.researchLanguage === 'en' || tier1Thin;

  // Always add regional/international queries regardless (for benchmarking)
  const englishQueries = buildEnglishFallbackQueries(industry, country);

  // If tier 1 was thin, run all English queries; otherwise just run regional ones
  const queriesToRun = needsTier2 ? englishQueries : englishQueries.slice(2); // last 2 = regional only

  for (const query of queriesToRun) {
    try {
      const result = await callPerplexity(query, 'en');
      results.tier2.push({ query, ...result });
    } catch (err) {
      console.error(`Tier 2 query failed: ${query}`, err.message);
    }
  }

  return results;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { industry, country } = req.body;
  if (!industry || !country) return res.status(400).json({ error: 'Missing industry or country' });

  try {
    const researchData = await runResearch(industry, country);
    return res.status(200).json({ success: true, data: researchData });
  } catch (err) {
    console.error('Research error:', err);
    return res.status(500).json({ error: err.message });
  }
}
