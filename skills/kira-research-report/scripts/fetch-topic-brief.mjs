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
import path from 'path';

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
  // Every field is coerced to a bounded string: the brief is plain data for the
  // brain route to read, never anything executable.
  const s = (v, n = 1500) => (v == null ? null : String(v).slice(0, n));
  const qs = Array.isArray(t.questions) ? t.questions.slice(0, 8).map(q => s(q, 600)) : [];
  fs.writeFileSync(path.resolve(out), JSON.stringify({
    id: s(t.slug, 120), country: s(t.country_code, 2), industry: ind ? s(ind.name, 200) : null, kind: s(t.kind, 20),
    competency: s(t.competency_key, 60), competency_label: comp ? s(comp.label, 200) : null, stage: comp ? s(comp.stage, 60) : null,
    title: s(t.title, 240), buyer_question: s(t.buyer_question), guiding_questions: qs, rationale: s(t.rationale), owner_note: s(t.note, 1000)
  }, null, 2));
  console.log('brief=written');
} catch (e) {
  console.error(`fetch-topic-brief: ${e.message}`);
  console.log('brief=none');
}
