// ============================================================
// KIRA RESEARCH — api/get-my-reports.js
// GET /api/get-my-reports
// Returns all purchases + reports for the authenticated user
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Get user from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  // Fetch purchases
  const { data: purchases } = await supabase
    .from('purchases')
    .select('id, slug, report_type, amount, status, created_at')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  // Fetch custom reports
  const { data: customReports } = await supabase
    .from('custom_reports')
    .select('id, slug, report_type, status, input_params, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const reports = (customReports || []).map(r => ({
    ...r,
    source: 'custom',
    reportType: r.report_type,
    createdAt:  r.created_at,
  }));

  return res.json({ reports, purchases: purchases || [] });
}
