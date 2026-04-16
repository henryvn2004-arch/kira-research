// ============================================================
// KIRA RESEARCH — api/generate-section.js
// POST /api/generate-section
// Body: { reportId, sectionIndex, sectionTitle, industry, country,
//         reportType, questions, companies, researchSummary,
//         ragContext, prevSections }
// Returns structured JSON for 1 slide section
// ~8-12s per call — well within 60s Vercel limit
// ============================================================

export const config = { maxDuration: 30 };

const ANTHROPIC_URL        = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY        = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL         = 'claude-sonnet-4-5';
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sbUpdate(table, id, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    reportId, sectionIndex, sectionTitle, totalSections,
    industry, country, reportType, questions, companies,
    researchSummary, ragContext, prevSections = []
  } = req.body;

  if (!reportId || !sectionTitle) return res.status(400).json({ error: 'Missing required fields' });

  const ragBlock = [
    ragContext?.chunkText   ? `RESEARCH LIBRARY FRAMEWORKS:\n${ragContext.chunkText}`   : '',
    ragContext?.patternText ? `INDUSTRY PATTERNS:\n${ragContext.patternText}` : ''
  ].filter(Boolean).join('\n\n---\n\n');

  const prevContext = prevSections.slice(-2)
    .map(s => {
      try {
        const p = JSON.parse(s.content);
        return `## ${s.title}\n${p.headline || ''}\n${(p.commentary || '').slice(0, 300)}...`;
      } catch { return `## ${s.title}\n${(s.content || '').slice(0, 300)}...`; }
    }).join('\n\n');

  const systemPrompt = `You are a senior market research consultant writing section ${sectionIndex + 1} of ${totalSections} for a ${reportType.replace(/_/g,' ')} report.

REPORT CONTEXT:
- Industry: ${industry}
- Market: ${country}
${questions ? `- Client focus: ${questions}` : ''}
${companies ? `- Companies: ${companies}` : ''}

CURRENT MARKET RESEARCH DATA:
${researchSummary || 'Draw on your knowledge of this market.'}

${ragBlock ? `PROPRIETARY RESEARCH LIBRARY:\n${ragBlock}` : ''}

${prevContext ? `PREVIOUS SECTIONS (for continuity — do NOT repeat):\n${prevContext}` : ''}

OUTPUT FORMAT — Return ONLY a valid JSON object (no markdown, no backticks, no explanation):
{
  "headline": "The single most important finding for this section — 1-2 punchy sentences, data-driven",

  "stats": [
    { "value": "67%", "label": "Market share top 3", "icon": "pie" },
    { "value": "$2.4B", "label": "Market size 2025", "icon": "growth" },
    { "value": "18%", "label": "Annual growth rate", "icon": "trend" }
  ],

  "chart": {
    "type": "bar",
    "title": "Chart title (add 'est.' if estimated)",
    "labels": ["Label 1", "Label 2", "Label 3"],
    "datasets": [{ "label": "Series name", "data": [30, 45, 25] }]
  },

  "table": {
    "title": "Table title",
    "headers": ["Column 1", "Column 2", "Column 3"],
    "rows": [["value", "value", "value"], ["value", "value", "value"]]
  },

  "commentary": "Full analytical prose — 250-400 words. Lead with the strategic insight, support with evidence from research data, end with implication for business. Use **bold** for key terms and company names. Use \\n\\n for paragraph breaks. Subheadings with ### if needed."
}

RULES FOR EACH FIELD:
- headline: always required. One punchy insight.
- stats: 2-4 key metrics. Pick icon from: pie|growth|trend|users|channel|price|globe|check. Use "~" prefix if estimated. Omit if section has no metrics (e.g. Regulatory, Recommendations).
- chart: include when quantitative data exists (share, size, growth, pricing, rankings). type: bar|line|pie|radar|donut. null if not applicable.
- table: include when structured comparison helps (competitors, channels, price tiers, partner list). null if not applicable.
- commentary: always required. Analytical and strategic — not descriptive or generic.
- Do NOT add AI disclaimers, mention data limitations, or say "based on available data".
- Numbers should be realistic estimates if exact data unavailable.
- Return ONLY the JSON object.`;

  const userPrompt = `Write section "${sectionTitle}" (${sectionIndex + 1} of ${totalSections}) for the ${industry} market in ${country}.`;

  try {
    const apiRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await apiRes.json();
    if (data.error) throw new Error(data.error.message);

    const raw   = data.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = { headline: '', stats: [], chart: null, table: null, commentary: raw };
    }

    const content = JSON.stringify(parsed);

    // Update this section in Supabase
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/custom_reports?id=eq.${reportId}`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const reports = await sbRes.json();
    const report  = reports?.[0];

    if (report) {
      const updatedSections = (report.sections || []).map((s, i) =>
        i === sectionIndex ? { ...s, content, status: 'completed' } : s
      );
      const allDone = updatedSections.every(s => s.status === 'completed');
      await sbUpdate('custom_reports', reportId, {
        sections:   updatedSections,
        status:     allDone ? 'completed' : 'generating',
        updated_at: new Date().toISOString()
      });
    }

    return res.json({ success: true, sectionIndex, content, parsed });

  } catch (e) {
    // Save error state for this section
    try {
      const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/custom_reports?id=eq.${reportId}`, {
        method: 'GET',
        headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` }
      });
      const reports = await sbRes.json();
      const report  = reports?.[0];
      if (report) {
        const updatedSections = (report.sections || []).map((s, i) =>
          i === sectionIndex ? { ...s, content: JSON.stringify({ headline: '', stats: [], chart: null, table: null, commentary: `Section generation failed: ${e.message}` }), status: 'failed' } : s
        );
        await sbUpdate('custom_reports', reportId, { sections: updatedSections });
      }
    } catch {}
    return res.status(500).json({ error: e.message });
  }
}
