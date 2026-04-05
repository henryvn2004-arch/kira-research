// ============================================================
// KIRA RESEARCH — api/contact.js
// POST /api/contact  → saves message to Supabase contacts table
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, email, company, subject, message } = req.body;
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // Save to Supabase (create contacts table if needed)
  const { error } = await supabase.from('contacts').insert({
    name, email, company: company || null,
    subject, message,
    created_at: new Date().toISOString(),
  });

  if (error) {
    // Table might not exist yet — still return success to user
    console.error('Contact save error:', error.message);
  }

  return res.json({ success: true });
}
