#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/fetch-topic-brief.mjs — Phase S, Sprint S3
//
//   node scripts/fetch-topic-brief.mjs <queue-id> <out.json>
//
// Writes the owner-approved brief for a queued report (buyer question,
// guiding questions, rationale, competency, industry) to <out.json>, which
// must live OUTSIDE the repo (the brain scratch folder). Used by the BRAIN
// route, Step A. Exits 0 with no file when there is no brief or Supabase is
// unreachable: the route then frames the topic itself.
// ---------------------------------------------------------------

import fs from 'fs';

const [, , id, out] = process.argv;
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!id || !out || !URL || !KEY) { console.log('brief=none'); process.exit(0); }
if (!/^[a-z0-9][a-z0-9-]{2,120}$/.test(id)) { console.log('brief=none'); process.exit(0); }

async function sb(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
}

try {
  const [t] = await sb(`topics?slug=eq.${id}&select=slug,country_code,industry_id,competency_key,kind,title,buyer_question,questions,rationale,note&limit=1`);
  if (!t) { console.log('brief=none'); process.exit(0); }
  const [ind] = await sb(`tax_industries?id=eq.${t.industry_id}&select=name,slug&limit=1`);
  const comp = t.competency_key ? (await sb(`tax_competencies?key=eq.${t.competency_key}&select=label,stage&limit=1`))[0] : null;
  fs.writeFileSync(out, JSON.stringify({
    id: t.slug, country: t.country_code, industry: ind ? ind.name : null, kind: t.kind,
    competency: t.competency_key, competency_label: comp ? comp.label : null, stage: comp ? comp.stage : null,
    title: t.title, buyer_question: t.buyer_question, guiding_questions: t.questions, rationale: t.rationale, owner_note: t.note
  }, null, 2));
  console.log('brief=written');
} catch (e) {
  console.error(`fetch-topic-brief: ${e.message}`);
  console.log('brief=none');
}
