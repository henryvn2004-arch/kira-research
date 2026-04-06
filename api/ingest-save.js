// ============================================================
// KIRA RESEARCH — api/ingest-save.js
// POST /api/ingest-save
// Receives pre-extracted JSON from admin.html and saves to DB
// Fast: no AI calls, just DB inserts (~2-5s)
// ============================================================

export const config = { maxDuration: 30 };

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== ANON_KEY && token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { filePath, extraction } = req.body;
  if (!filePath || !extraction) return res.status(400).json({ error: 'Missing filePath or extraction' });

  try {
    // Save source report
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
      .select('id').single();

    if (srErr) throw new Error('source_reports: ' + srErr.message);
    const sourceReportId = sourceReport.id;

    // Save template
    if (extraction.template) {
      const type = extraction.metadata.competency_type || 'market_analysis';
      const { data: existing } = await supabase
        .from('competency_templates').select('id').eq('competency_type', type).maybeSingle();
      if (!existing) {
        await supabase.from('competency_templates').insert({
          competency_type:   type,
          template_name:     extraction.template.name || type,
          section_structure: extraction.template.section_structure || [],
          methodology:       extraction.template.methodology || null,
          source_report_ids: [sourceReportId],
        });
      }
    }

    // Save patterns
    let patternsSaved = 0;
    for (const p of (extraction.patterns || [])) {
      const { error } = await supabase.from('industry_patterns').insert({
        industry:           p.industry || extraction.metadata.product_category,
        sub_industry:       p.sub_industry || null,
        pattern_type:       p.pattern_type,
        description:        p.description,
        applicable_regions: p.applicable_regions || [],
        confidence:         p.confidence || 'medium',
        source_report_ids:  [sourceReportId],
      });
      if (!error) patternsSaved++;
    }

    // Save chunks
    let chunksSaved = 0;
    for (const ch of (extraction.chunks || [])) {
      const { error } = await supabase.from('report_chunks').insert({
        source_report_id: sourceReportId,
        chunk_type:       ch.chunk_type,
        content:          ch.content,
        metadata: {
          industry:  extraction.metadata.product_category,
          country:   extraction.metadata.country,
          section:   ch.section || null,
          data_type: ch.data_type || null,
        },
      });
      if (!error) chunksSaved++;
    }

    await supabase.from('source_reports').update({ extracted: true }).eq('id', sourceReportId);

    return res.json({ success: true, sourceReportId, patterns: patternsSaved, chunks: chunksSaved });

  } catch(e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
