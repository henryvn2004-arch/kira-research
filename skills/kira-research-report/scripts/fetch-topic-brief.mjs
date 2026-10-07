#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/fetch-topic-brief.mjs — Phase S, Sprint S3
//
//   node scripts/fetch-topic-brief.mjs <queue-id> > <scratch>/topic_brief.json
//
// Prints the owner-approved brief for a queued report (buyer question,
// guiding questions, rationale, competency, industry) as JSON on stdout; the
// caller redirects it to a file OUTSIDE the repo (the brain scratch folder).
// Used by the BRAIN route, Step A. Prints nothing (empty file) and exits 0 when
// there is no brief or Supabase is unreachable: the route then frames the
// topic itself.
// ---------------------------------------------------------------

const [, , id] = process.argv;
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!id || !URL || !KEY) process.exit(0);
if (!/^[a-z0-9][a-z0-9-]{2,120}$/.test(id)) process.exit(0);

async function sb(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(`Supabase ${r.status}`);
  return r.json();
}

try {
  const [t] = await sb(`topics?slug=eq.${id}&select=slug,country_code,industry_id,competency_key,kind,title,buyer_question,questions,rationale,note,signals&limit=1`);
  if (!t) process.exit(0);
  const [ind] = await sb(`tax_industries?id=eq.${t.industry_id}&select=name,slug&limit=1`);
  const comp = t.competency_key ? (await sb(`tax_competencies?key=eq.${t.competency_key}&select=label,stage&limit=1`))[0] : null;
  // Every field is coerced to a bounded string: the brief is plain data for the
  // brain route to read, never anything executable.
  const s = (v, n = 1500) => (v == null ? null : String(v).slice(0, n));
  const qs = Array.isArray(t.questions) ? t.questions.slice(0, 8).map(q => s(q, 600)) : [];
  const sig = t.signals && typeof t.signals === 'object' ? t.signals : {};
  const mc = Array.isArray(sig.must_cover) ? sig.must_cover.slice(0, 8).map(m => s(m, 400)) : [];
  console.log(JSON.stringify({
    id: s(t.slug, 120), country: s(t.country_code, 2), industry: ind ? s(ind.name, 200) : null, kind: s(t.kind, 20),
    competency: s(t.competency_key, 60), competency_label: comp ? s(comp.label, 200) : null, stage: comp ? s(comp.stage, 60) : null,
    title: s(t.title, 240), lens: s(sig.lens, 40), segment: s(sig.segment, 120), buyer_question: s(t.buyer_question), guiding_questions: qs, must_cover: mc, rationale: s(t.rationale), owner_note: s(t.note, 1000)
  }, null, 2));
} catch (e) {
  console.error(`fetch-topic-brief: ${e.message}`);
}
