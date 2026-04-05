// ============================================================
// KIRA RESEARCH — api/embed.js
// POST /api/embed  { type: 'chunk'|'pattern', ids: [...] }
//   → generates OpenAI embeddings + updates Supabase
//
// Called manually (or by ingestion script) to embed:
//   - report_chunks (for RAG)
//   - industry_patterns (for RAG)
// ============================================================

export const config = { maxDuration: 60 };

import { createClient } from '@supabase/supabase-js';

const supabase   = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs per request

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Simple auth check — only callable with CRON_SECRET
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { type = 'chunk', ids } = req.body;
  const table  = type === 'pattern' ? 'industry_patterns' : 'report_chunks';
  const column = 'content'; // field to embed

  // ── Fetch rows without embeddings ─────────────────────
  let query = supabase
    .from(table)
    .select('id, ' + column)
    .is('embedding', null)
    .limit(BATCH_SIZE);

  if (ids?.length) query = query.in('id', ids);

  const { data: rows, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  if (!rows?.length) return res.json({ embedded: 0, message: 'Nothing to embed' });

  // ── Generate embeddings ────────────────────────────────
  const texts = rows.map(r => (r[column] || '').slice(0, 8000));

  try {
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });

    const embData = await embRes.json();
    if (!embRes.ok) throw new Error(embData.error?.message || 'OpenAI embedding error');

    const embeddings = embData.data; // [{ index, embedding }, ...]

    // ── Update rows in Supabase ────────────────────────
    let updated = 0;
    for (const item of embeddings) {
      const row = rows[item.index];
      const { error: updateErr } = await supabase
        .from(table)
        .update({ embedding: item.embedding })
        .eq('id', row.id);
      if (!updateErr) updated++;
    }

    return res.json({
      embedded: updated,
      total:    rows.length,
      table,
      message:  `Embedded ${updated}/${rows.length} rows in ${table}`,
    });

  } catch (e) {
    console.error('Embed error:', e);
    return res.status(500).json({ error: e.message });
  }
}
