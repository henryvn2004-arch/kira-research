// ============================================================
// KIRA RESEARCH — api/ingest.js
// POST /api/ingest  { filePath: 'reports/xxx.md' }
// Authorization: Bearer SUPABASE_ANON_KEY
//
// Pipeline:
//   [1] Download .md from Supabase Storage
//   [2] Claude Sonnet reads text → extract metadata + template + patterns + chunks
//   [3] Save to source_reports, competency_templates, industry_patterns, report_chunks
//   [4] OpenAI embed all patterns + chunks → update embedding column
// ============================================================

export const config = { maxDuration: 60 };

import { createClient } from '@supabase/supabase-js';

const supabase      = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_KEY    = process.env.OPENAI_API_KEY;
const ANON_KEY      = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: accept anon key
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== ANON_KEY && token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'Missing filePath' });

  try {
    // ── [1] Download from Storage ─────────────────────────
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('reports')
      .download(filePath);

    if (dlErr) throw new Error('Download failed: ' + dlErr.message);

    const fileText = await fileData.text();
    console.log(`[ingest] Downloaded ${filePath}: ${Math.round(fileText.length / 1024)}KB`);

    // ── [2] Claude extracts intelligence ──────────────────
    console.log('[ingest] Calling Claude...');
    const extraction = await claudeExtract(fileText);
    console.log(`[ingest] Extracted: ${extraction.patterns?.length} patterns, ${extraction.chunks?.length} chunks`);

    // ── [3a] Save source report ───────────────────────────
    const { data: sourceReport, error: srErr } = await supabase
      .from('source_reports')
      .insert({
        title:            extraction.metadata.title || filePath,
        product_category: extraction.metadata.product_category || 'Unknown',
        sub_category:     extraction.metadata.sub_category || null,
        country:          extraction.metadata.country || 'Unknown',
        region:           extraction.metadata.region || null,
        year:             extraction.metadata.year || new Date().getFullYear(),
        client_industry:  extraction.metadata.client_industry || null,
        competency_type:  extraction.metadata.competency_type || 'market_analysis',
        methodology_used: extraction.metadata.methodology_used || [],
        respondent_types: extraction.metadata.respondent_types || [],
        file_path:        filePath,
        extracted:        false,
      })
      .select('id')
      .single();

    if (srErr) throw new Error('source_reports insert: ' + srErr.message);
    const sourceReportId = sourceReport.id;

    // ── [3b] Save competency template ─────────────────────
    if (extraction.template) {
      const detectedType = extraction.metadata.competency_type || 'market_analysis';
      const { data: existing } = await supabase
        .from('competency_templates')
        .select('id')
        .eq('competency_type', detectedType)
        .maybeSingle();

      if (existing) {
        await supabase.from('competency_templates')
          .update({ source_report_ids: supabase.rpc('array_append', { arr: 'source_report_ids', val: sourceReportId }) })
          .eq('id', existing.id);
      } else {
        await supabase.from('competency_templates').insert({
          competency_type:      detectedType,
          template_name:        extraction.template.name || detectedType,
          section_structure:    extraction.template.section_structure,
          methodology:          extraction.template.methodology || null,
          data_points_required: extraction.template.data_points_required || null,
          source_report_ids:    [sourceReportId],
        });
      }
    }

    // ── [3c] Save industry patterns ───────────────────────
    let patternsSaved = 0;
    for (const p of (extraction.patterns || [])) {
      const { error } = await supabase.from('industry_patterns').insert({
        industry:           p.industry || extraction.metadata.product_category || 'Unknown',
        sub_industry:       p.sub_industry || null,
        pattern_type:       p.pattern_type,
        description:        p.description,
        applicable_regions: p.applicable_regions || [],
        confidence:         p.confidence || 'medium',
        source_report_ids:  [sourceReportId],
      });
      if (!error) patternsSaved++;
    }

    // ── [3d] Save content chunks ──────────────────────────
    let chunksSaved = 0;
    for (const ch of (extraction.chunks || [])) {
      const { error } = await supabase.from('report_chunks').insert({
        source_report_id: sourceReportId,
        chunk_type:       ch.chunk_type,
        content:          ch.content,
        metadata: {
          industry:  extraction.metadata.product_category || 'Unknown',
          country:   extraction.metadata.country || 'Unknown',
          section:   ch.section || null,
          data_type: ch.data_type || null,
        },
      });
      if (!error) chunksSaved++;
    }

    // ── [4] OpenAI embeddings ──────────────────────────────
    console.log('[ingest] Generating embeddings...');

    const { data: patterns } = await supabase
      .from('industry_patterns')
      .select('id, description')
      .eq('source_report_ids', `{${sourceReportId}}`)
      .is('embedding', null);

    const { data: chunks } = await supabase
      .from('report_chunks')
      .select('id, content')
      .eq('source_report_id', sourceReportId)
      .is('embedding', null);

    const toEmbed = [
      ...(patterns || []).map(r => ({ id: r.id, text: r.description, table: 'industry_patterns' })),
      ...(chunks   || []).map(r => ({ id: r.id, text: r.content,     table: 'report_chunks' })),
    ];

    let embedded = 0;
    const BATCH = 20;

    for (let i = 0; i < toEmbed.length; i += BATCH) {
      const batch = toEmbed.slice(i, i + BATCH);
      const texts = batch.map(b => b.text.slice(0, 8000));

      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-large',
          input: texts,
          dimensions: 1536,
        }),
      });

      const embData = await embRes.json();
      if (!embRes.ok) {
        console.warn('[ingest] Embed batch error:', embData.error?.message);
        continue;
      }

      for (const item of embData.data) {
        const row = batch[item.index];
        await supabase.from(row.table)
          .update({ embedding: item.embedding })
          .eq('id', row.id);
        embedded++;
      }
    }

    // ── [5] Mark extracted ────────────────────────────────
    await supabase.from('source_reports')
      .update({ extracted: true })
      .eq('id', sourceReportId);

    console.log(`[ingest] DONE: ${patternsSaved} patterns, ${chunksSaved} chunks, ${embedded} embeddings`);

    return res.json({
      success: true,
      sourceReportId,
      patterns:  patternsSaved,
      chunks:    chunksSaved,
      embedded,
    });

  } catch (e) {
    console.error('[ingest] Error:', e.message);
    return res.status(500).json({ success: false, error: e.message });
  }
}

// ── Claude extraction ─────────────────────────────────────
async function claudeExtract(fileText) {
  const truncated = fileText.length > 150000
    ? fileText.slice(0, 150000) + '\n\n[TRUNCATED]'
    : fileText;

  const prompt = `You are analyzing a consulting market research report to extract reusable intelligence for an AI knowledge base.

Read the report carefully and extract the following. Return ONLY valid JSON, no markdown, no backticks.

{
  "metadata": {
    "title": "report title",
    "product_category": "main product/service category",
    "sub_category": "specific sub-category or null",
    "country": "country name",
    "region": "southeast_asia|south_asia|east_asia or null",
    "year": 2019,
    "client_industry": "industry of commissioning client or null",
    "competency_type": "market_analysis|competitive_landscape|market_entry|channel_analysis|pricing_study|consumer_insights|partner_search|market_sizing|industry_mapping",
    "methodology_used": ["survey","focus_groups","trade_interviews","desk_research"],
    "respondent_types": ["consumers","trade","experts"]
  },
  "template": {
    "name": "template name",
    "section_structure": [
      {"section": "Executive Summary", "purpose": "...", "typical_content": "..."}
    ],
    "methodology": "description of research methodology"
  },
  "patterns": [
    {
      "pattern_type": "channel_structure|pricing_dynamics|competitive_dynamics|consumer_behavior|regulatory|distribution|margin_structure",
      "industry": "detected industry",
      "sub_industry": "sub-industry or null",
      "description": "structural insight — STRIP all specific numbers/dates, keep frameworks and behavioral patterns",
      "applicable_regions": ["southeast_asia"],
      "confidence": "high|medium|low"
    }
  ],
  "chunks": [
    {
      "chunk_type": "framework|industry_insight|channel_data|pricing_data|competitive_insight|consumer_insight|recommendation",
      "content": "50-150 word self-contained insight — STRIP specific numbers, keep structural insights",
      "section": "which section this came from",
      "data_type": "margin_stack|brand_mapping|distribution_flow|etc or null"
    }
  ]
}

RULES:
- patterns: structural insights only, no specific numbers/dates (they are outdated)
- chunks: 50-150 words each, useful without the full report
- Aim for 5-15 patterns and 20-50 chunks
- Return ONLY the JSON

REPORT:
${truncated}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error('Claude error: ' + JSON.stringify(data.error));

  const text  = data.content?.[0]?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error('JSON parse failed: ' + text.slice(0, 200));
  }
}
