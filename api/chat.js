// KIRA RESEARCH — api/chat.js
// Follow-up Q&A chatbox for purchased reports.
// Uses Claude Sonnet — report content as context, but full knowledge available.

export const config = { maxDuration: 30, runtime: 'nodejs' };

const ANT_URL  = 'https://api.anthropic.com/v1/messages';
const ANT_KEY  = process.env.ANTHROPIC_API_KEY;
const SB_URL   = process.env.SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_KEY;
const MODEL    = 'claude-sonnet-4-20250514';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

async function getReport(reportId) {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/custom_reports?id=eq.${reportId}&select=sections,input_params`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
    });
    const d = await r.json();
    return Array.isArray(d) ? d[0] : null;
  } catch { return null; }
}

// Build a concise report summary for context (not full dump — too many tokens)
function buildReportContext(report) {
  if (!report?.sections?.length) return '';
  const params = report.input_params || {};

  const sections = report.sections
    .filter(s => s.content && s.status === 'completed')
    .map(s => {
      try {
        const p = JSON.parse(s.content);
        // Include headline + first 300 chars of commentary per section
        const snippet = (p.commentary || '').slice(0, 300).replace(/\n+/g, ' ');
        return `**${s.title}**: ${p.headline || ''} ${snippet}...`;
      } catch { return `**${s.title}**`; }
    }).join('\n\n');

  return `REPORT: ${params.industry || ''} market in ${params.country || ''}
Report type: ${params.report_type || ''}
${params.questions ? `Client focus: ${params.questions}` : ''}

SECTION SUMMARIES:
${sections}`;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { reportId, messages } = req.body;
  if (!messages?.length) return res.status(400).json({ error: 'Missing messages' });

  // Load report for context (non-fatal if missing)
  let reportContext = '';
  if (reportId) {
    const report = await getReport(reportId);
    reportContext = buildReportContext(report);
  }

  // KEY DESIGN: report is PRIMARY context, but Claude can go beyond it.
  // This is what differentiates KIRA chat from a simple FAQ bot.
  const systemPrompt = `You are a senior market research analyst at a consulting firm. You have just delivered a market research report to a client, and they are asking follow-up questions.

${reportContext ? `REPORT CONTEXT:\n${reportContext}\n\n` : ''}

YOUR APPROACH:
- Use the report findings as your foundation and primary reference point
- EXPAND beyond the report freely using your full knowledge of this market, industry, and country
- When the report doesn't cover something, say so briefly, then answer from your expertise: "The report doesn't cover this directly, but based on market dynamics..."
- Provide specific data, examples, company names, and strategic insights
- If asked to compare with other markets or benchmark against regional data, do it
- If asked about topics the report covers, cite the relevant section
- Be direct and analytical — no hedging, no "I cannot verify this"
- Format with **bold** for key terms, use bullet points for lists
- Answer as a knowledgeable advisor, not a search engine`;

  try {
    const r = await fetch(ANT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANT_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: systemPrompt,
        messages: messages.slice(-8), // last 8 turns = enough context, avoids token bloat
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: 'Claude API error: ' + err.slice(0, 200) });
    }

    const data  = await r.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not generate a response.';
    return res.json({ reply });

  } catch (e) {
    console.error('[chat]', e.message);
    return res.status(500).json({ error: e.message });
  }
}
