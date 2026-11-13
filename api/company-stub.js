// ============================================================
// KIRA RESEARCH — api/company-stub.js
// Create a minimal company entity + report stub from a search result.
//
// POST /api/company-stub
// Body: { name, tax_id, country_code }
//
// Idempotent — if entity already exists (by tax_id + country), returns
// the existing slug. Use this before redirecting to a company page that
// was discovered via OpenCorporates (i.e. not yet in the DB).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { normaliseName, makeSlug } from './_lib/company/normalize.js';
import { SUPPORTED_COUNTRIES } from './_lib/company/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { name, tax_id, country_code } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'missing_name' });
  }
  if (!country_code || !SUPPORTED_COUNTRIES.includes(country_code.toUpperCase())) {
    return res.status(400).json({ error: 'invalid_country' });
  }

  const canonName = name.trim().slice(0, 255);
  const country   = country_code.toUpperCase();
  const taxId     = tax_id && typeof tax_id === 'string' ? tax_id.trim().slice(0, 30) : null;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );

  // 1) Check if entity already exists (by tax_id + country when tax_id present)
  let entityId = null;
  if (taxId) {
    const { data: existing } = await supabase
      .from('entities')
      .select('id')
      .eq('type', 'company')
      .eq('country_code', country)
      .eq('tax_id', taxId)
      .maybeSingle();
    if (existing) entityId = existing.id;
  }

  // 2) Create entity if not found
  if (!entityId) {
    const { data: newEntity, error: eErr } = await supabase
      .from('entities')
      .insert({
        type: 'company',
        country_code: country,
        tax_id: taxId,
        canonical_name: canonName,
        name_norm: normaliseName(canonName, country),
        status_cache: 'unknown',
      })
      .select('id')
      .single();

    if (eErr || !newEntity) {
      // Possible race — try fetching again
      if (taxId) {
        const { data: retry } = await supabase
          .from('entities')
          .select('id')
          .eq('type', 'company')
          .eq('country_code', country)
          .eq('tax_id', taxId)
          .maybeSingle();
        if (retry) {
          entityId = retry.id;
        } else {
          return res.status(500).json({ error: 'entity_insert_failed' });
        }
      } else {
        return res.status(500).json({ error: 'entity_insert_failed' });
      }
    } else {
      entityId = newEntity.id;
    }
  }

  // 3) Get or create company_reports stub
  const { data: crExisting } = await supabase
    .from('company_reports')
    .select('slug')
    .eq('entity_id', entityId)
    .maybeSingle();

  if (crExisting?.slug) {
    return res.status(200).json({ slug: crExisting.slug, entity_id: entityId });
  }

  // Generate slug: country-name_norm-taxid (taxId fallback = first 8 of entityId uuid)
  const slugTaxId = taxId || entityId.replace(/-/g, '').slice(0, 8);
  const slug = makeSlug(canonName, slugTaxId, country);

  const { error: crErr } = await supabase
    .from('company_reports')
    .insert({
      entity_id: entityId,
      slug,
      payload: null,
      pipeline_version: 0,
    });

  if (crErr) {
    // Slug conflict or race — fetch whatever was inserted
    const { data: crRetry } = await supabase
      .from('company_reports')
      .select('slug')
      .eq('entity_id', entityId)
      .maybeSingle();
    const finalSlug = crRetry?.slug;
    if (!finalSlug) return res.status(500).json({ error: 'stub_insert_failed' });
    return res.status(200).json({ slug: finalSlug, entity_id: entityId });
  }

  return res.status(200).json({ slug, entity_id: entityId });
}
