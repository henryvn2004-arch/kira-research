// ============================================================
// KIRA RESEARCH — api/chat.js
// Follow-up Q&A chatbox on purchased reports
// POST /api/chat  { reportId, messages: [{role, content}] }
// ============================================================

export const config = { maxDuration: 30 };

const ANTHROPIC_URL        = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY        = process.env.ANTHROPIC_API_KEY;
const CLAUDE_MODEL         = 'claude-sonnet-4-5';
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Fetch report content from Supabase ───────────────────
async function getReportContext(reportId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/custom_reports?id=eq.${reportId}&select=sections,input_params&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    }
  );
  const data = await res.json();
  const report = Array.isArray(data) ? data[0] : null;
  if (!report) return { context: '', meta: {} };

  // Build context string from sections (truncate to avoid context limit)
  const sections = report.sections || [];
  const context = sections.map(s =>
    `## ${s.title}\n${(s.content || '').substring(0, 1200)}`
  ).join('\n\n---\n\n');

  return {
    context: context.substring(0, 12000), // max ~12k chars of report context
    meta: report.input_params || {}
  };
}

// ── Save chat history ────────────────────────────────────
async function saveChat(userId, reportId, messages) {
  if (!userId) return;
  try {
    // Upsert chat history
    await fetch(`${SUPABASE_URL}/rest/v1/chat_history`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: userId,
        report_id: reportId,
        report_type: 'custom_report',
        messages,
        updated_at: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('Failed to save chat history:', e.message);
  }
}

// ── Main handler ─────────────────────────────────────────
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { reportId, messages, userId } = req.body;
  if (!reportId || !messages?.length) {
    return res.status(400).json({ error: 'Missing reportId or messages' });
  }

  try {
    // Fetch report context
    const { context, meta } = await getReportContext(reportId);

    const systemPrompt = `You are a senior market research analyst at KIRA RESEARCH. You have just completed a ${meta.reportType?.replace(/_/g,' ') || 'market'} report on the ${meta.industry || 'target'} industry in ${meta.country || 'the target market'}.

The user has purchased this report and is asking follow-up questions. Answer using the report data as your primary source, supplemented by your general market knowledge.

REPORT CONTENT:
${context || 'Report content unavailable — answer based on general market knowledge.'}

GUIDELINES:
- Answer concisely and specifically — reference the report data where relevant
- If the question is beyond the report scope, say so briefly then answer from general knowledge
- Use **bold** for key terms and data points
- Keep answers focused and actionable
- Do NOT repeat the full report — extract and synthesize the relevant parts
- Maintain a professional but conversational tone`;

    // Claude API call
    const apiRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 800,
        system: systemPrompt,
        messages: messages.slice(-10) // keep last 10 turns to avoid token overflow
      })
    });

    const data = await apiRes.json();
    if (data.error) throw new Error(data.error.message);

    const reply = data.content?.[0]?.text || 'Sorry, I could not generate a response.';

    // Save updated chat history async (non-blocking)
    saveChat(userId, reportId, messages);

    return res.json({ reply });

  } catch (e) {
    console.error('[chat]', e);
    return res.status(500).json({ error: e.message });
  }
}
