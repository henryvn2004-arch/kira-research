// ============================================================
// KIRA RESEARCH — api/_lib/search-interpret.js
// Turns a reader's search into a placeholder-topic name, fully automatically.
//
// Input : the market the search names (one of KIRA's markets), the industries
//         KIRA covers there (the only allowed parents), and the rest of the query.
// Output: { ok:true, industryId, industryName, topic, title, slug } or { ok:false, why }
//
// Two modes (setting search.interpret_mode):
//   routine (default)  no model call from the website. A cached decision is returned at once; a new
//                      query returns { ok:false, why:'pending' } and waits in search_misses until the
//                      report Routine decides it (scripts/interpret-searches.mjs, batch_runner Step 0.7).
//   api                the old live call to a small model from here (needs ANTHROPIC_API_KEY credit;
//                      daily cap search.daily_model_limit).
// The guards (shape, denylist, name must share a word with the query, cache) are the same in both:
// they live in search-rules.js. All fail-closed: any doubt means the request form.
// ============================================================

import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from './config.js';
import { DENY, normText, passesPrefilter, cacheKey, build, SYSTEM, prompt, parse, accept } from './search-rules.js';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MODEL = 'claude-haiku-4-5';
// Daily model-call limit and the on/off switch are owner settings: search.daily_model_limit,
// search.auto_placeholders (api/_lib/config.js, edited on /en/admin/config).

async function sb(path, method = 'GET', body, prefer) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
               'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();                 // 201/204 with return=minimal has no body
  return t ? JSON.parse(t) : null;
}

export async function interpretSearch(country, industries, rest) {
  const text = normText(rest);
  if (!passesPrefilter(text)) return { ok: false, why: 'filtered' };
  if (!industries.length) return { ok: false, why: 'no_industries' };

  const key = cacheKey(country.country_code, text);
  try {
    const hit = await sb(`search_interpretations?key=eq.${encodeURIComponent(key)}&select=ok,industry_id,topic&limit=1`);
    if (hit.length) {
      if (!hit[0].ok) return { ok: false, why: 'declined' };
      const industry = industries.find(i => i.id === hit[0].industry_id);
      const built = industry && hit[0].topic && !DENY.test(hit[0].topic) ? build(country, industry, hit[0].topic) : null;
      return built || { ok: false, why: 'declined' };
    }
  } catch (e) { console.error('[search-interpret] cache read', e.message); }

  // Mode "routine" (default): no model call from the website. The query stays in search_misses and the
  // batch script scripts/interpret-searches.mjs (run by the report Routine) decides it; once decided the
  // answer is in the cache above and the next search lands on the placeholder at once.
  if ((await getConfig('search.interpret_mode')) !== 'api') return { ok: false, why: 'pending' };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, why: 'no_key' };
  if (!(await getConfig('search.auto_placeholders'))) return { ok: false, why: 'disabled' };
  try {
    const used = await sb('rpc/llm_calls_today', 'POST', {});
    if (typeof used === 'number' && used >= (await getConfig('search.daily_model_limit'))) return { ok: false, why: 'budget' };
  } catch (_e) { return { ok: false, why: 'error' }; }

  let out;
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 8000 });
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 150, system: SYSTEM,
      messages: [{ role: 'user', content: prompt(country, industries, text) }]
    });
    out = parse(msg.content && msg.content[0] && msg.content[0].text);
  } catch (e) {
    console.error('[search-interpret] model call', e.message);
    return { ok: false, why: 'error' };    // not cached: a later search may succeed
  }

  const built = accept(country, industries, text, out);
  try {
    await sb('search_interpretations', 'POST', {
      key, country_code: country.country_code, ok: !!built,
      industry_id: built ? built.industryId : null, topic: built ? built.topic : null,
      reason: built ? null : String((out && out.ok === false ? 'declined' : 'invalid')).slice(0, 40)
    }, 'resolution=ignore-duplicates,return=minimal');
  } catch (e) { console.error('[search-interpret] cache write', e.message); }
  return built || { ok: false, why: 'declined' };
}

// Industries KIRA covers in a market (the only allowed parents), alphabetical.
export async function coveredIndustries(countryCode) {
  const rows = await sb(`tax_country_industry?country_code=eq.${encodeURIComponent(countryCode)}&status=eq.active&select=industry:tax_industries(id,name,slug)`);
  return rows.map(r => r.industry).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}
