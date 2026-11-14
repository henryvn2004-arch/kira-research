#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/interpret-searches.mjs
//
// Files reader searches that found nothing under one of KIRA's covered industries, so they become
// coming-soon placeholder pages. The judgement is made by the report Routine itself (subscription, no
// API key); this script holds everything around it. Setting search.interpret_mode (default "routine").
//
//   node interpret-searches.mjs apply <file.json>      apply decisions, then attach waiting emails
//
// Decision file: [{ "query": "<query from list>", "ok": true|false, "industry": <number>, "topic": "<name>" }]
//
// apply runs the SAME guards as the online path (api/_lib/search-rules.js), writes the cache row
// (search_interpretations), creates the placeholder topic (ensure_reader_topic: status 'requested',
// source 'reader') and moves every email request left on that search (topic_requests with a keyword
// and no topic) onto the new topic, so the "report published" email and the requested-band priority
// apply. Idempotent. Exit 0 on every handled case; non-zero only when Supabase is unreachable.
// ---------------------------------------------------------------

import fs from 'fs';
import { getConfig } from '../../../api/_lib/config.js';
import { topicEta } from '../../../api/_lib/eta.js';
import { autoApprove, recordPromise } from '../../../api/_lib/topic-demand.js';
import { cleanQuery, normText, passesPrefilter, cacheKey, accept, build, outline, SYSTEM, prompt } from '../../../api/_lib/search-rules.js';

const URL = (process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL);
const KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY);
if (!URL || !KEY) { console.error('interpret-searches: SUPABASE_URL / SUPABASE_SERVICE_KEY missing'); process.exit(2); }

async function sb(path, method = 'GET', body, prefer) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (r.status === 409) return 409;
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const rpc = (name, args) => sb(`rpc/${name}`, 'POST', args);
const enc = encodeURIComponent;
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };

// Market named in the query and what is left of it; null unless exactly one market is named.
async function resolve(query) {
  const q = cleanQuery(query);
  if (q.length < 3) return null;
  const c = (await rpc('search_country', { q }))[0];
  if (!c || !c.rest) return null;
  const text = normText(c.rest);
  if (!passesPrefilter(text)) return null;
  return { q, country: { country_code: c.country_code, country_name: c.country_name }, text, key: cacheKey(c.country_code, text) };
}

// Industries KIRA covers in a market (the only allowed parents), alphabetical: the numbered list the judge sees.
async function industriesOf(code) {
  const rows = await sb(`tax_country_industry?country_code=eq.${enc(code)}&status=eq.active&select=industry:tax_industries(id,name,slug)`);
  return rows.map(r => r.industry).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
}

const cached = async key => (await sb(`search_interpretations?key=eq.${enc(key)}&select=ok,industry_id,topic&limit=1`))[0] || null;

async function list() {
  const limit = Math.max(1, Math.min(100, Number(arg('--limit')) || 20));
  if (!(await getConfig('search.auto_placeholders')) || (await getConfig('search.interpret_mode')) !== 'routine') {
    console.log(JSON.stringify({ count: 0, items: [], note: 'switched off (search.auto_placeholders or search.interpret_mode)' }, null, 2));
    return;
  }
  const misses = await sb('search_misses?select=keyword,searches&order=searches.desc,last_at.desc&limit=400');
  const items = [], seen = new Set(), memo = new Map();
  for (const m of misses) {
    if (items.length >= limit) break;
    const r = await resolve(m.keyword);
    if (!r || seen.has(r.key)) continue;
    seen.add(r.key);
    if (await cached(r.key)) continue;
    if (!memo.has(r.country.country_code)) memo.set(r.country.country_code, await industriesOf(r.country.country_code));
    const industries = memo.get(r.country.country_code);
    if (!industries.length) continue;
    items.push({
      query: m.keyword, market: r.country.country_name, searches: m.searches,
      prompt: prompt(r.country, industries, r.text)
    });
  }
  console.log(JSON.stringify({ system: SYSTEM, count: items.length, items }, null, 2));
}

// Create the topic for an accepted decision (idempotent by slug).
async function makeTopic(built, country) {
  const made = (await rpc('ensure_reader_topic', {
    p_cc: country.country_code, p_industry: built.industryId, p_slug: built.slug, p_title: built.title,
    p_questions: outline(built.topic.toLowerCase(), country.country_name)
  }))[0];
  return made && made.o_status !== 'rejected' ? made : null;
}

// Move email requests left on this search onto the topic; returns how many moved.
async function attach(query, topicSlug) {
  const [t] = await sb(`topics?slug=eq.${enc(topicSlug)}&select=id,status,note,report_id,promise_at&limit=1`);
  if (!t) return 0;
  const rows = await sb(`topic_requests?topic_id=is.null&keyword=not.is.null&select=id,keyword&limit=1000`);
  const want = cleanQuery(query).toLowerCase();
  let moved = 0;
  for (const row of rows) {
    if (cleanQuery(row.keyword).toLowerCase() !== want) continue;
    const res = await sb(`topic_requests?id=eq.${row.id}`, 'PATCH', { topic_id: t.id }, 'return=minimal');
    if (res === 409) await sb(`topic_requests?id=eq.${row.id}`, 'DELETE');   // that address already asked for this topic
    else moved++;
  }
  if (moved && !t.report_id) {
    await autoApprove(t);
    await recordPromise(t, await topicEta(t.id));
  }
  return moved;
}

async function apply(file) {
  const decisions = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  if (!Array.isArray(decisions)) throw new Error('decision file must be a JSON array');
  const sum = { decided: 0, created: 0, declined: 0, invalid: 0, skipped: 0, emails_moved: 0 };

  for (const d of decisions) {
    try {
      const r = await resolve(d && d.query);
      if (!r) { sum.invalid++; continue; }
      const industries = await industriesOf(r.country.country_code);
      const built = accept(r.country, industries, r.text, d);
      await sb('search_interpretations', 'POST', {
        key: r.key, country_code: r.country.country_code, ok: !!built,
        industry_id: built ? built.industryId : null, topic: built ? built.topic : null,
        reason: built ? null : (d.ok === false ? 'declined' : 'invalid')
      }, 'resolution=ignore-duplicates,return=minimal');
      sum.decided++;
      if (!built) { d.ok === false ? sum.declined++ : sum.invalid++; continue; }
      const made = await makeTopic(built, r.country);
      if (!made) { sum.invalid++; continue; }
      const [t] = await sb(`topics?slug=eq.${enc(made.o_slug)}&select=id,search_count&limit=1`);
      const [miss] = await sb(`search_misses?keyword=eq.${enc(String(d.query).toLowerCase().slice(0, 60))}&select=searches&limit=1`);
      if (t && miss) await sb(`topics?id=eq.${t.id}`, 'PATCH', { search_count: (t.search_count || 0) + miss.searches }, 'return=minimal');
      sum.created++;
    } catch (e) { console.error(`interpret-searches: ${JSON.stringify(d && d.query)}: ${e.message}`); sum.invalid++; }
  }

  // Sweep: email requests waiting on any search that has an accepted decision in the cache.
  const waiting = await sb('topic_requests?topic_id=is.null&keyword=not.is.null&select=keyword&limit=1000');
  for (const k of new Set(waiting.map(w => cleanQuery(w.keyword).toLowerCase()))) {
    try {
      const r = await resolve(k);
      const hit = r && await cached(r.key);
      if (!hit || !hit.ok || !hit.topic) continue;
      const industry = (await industriesOf(r.country.country_code)).find(i => i.id === hit.industry_id);
      const built = industry && build(r.country, industry, hit.topic);
      if (!built) continue;
      const made = await makeTopic(built, r.country);
      if (made) sum.emails_moved += await attach(k, made.o_slug);
    } catch (e) { console.error(`interpret-searches: sweep ${JSON.stringify(k)}: ${e.message}`); }
  }
  console.log(JSON.stringify(sum));
}

const [cmd, file] = process.argv.slice(2);
try {
  if (cmd === 'list') await list();
  else if (cmd === 'apply') await apply(file);
  else { console.error('usage: interpret-searches.mjs list [--limit N] | apply <file.json>'); process.exit(1); }
} catch (e) { console.error(`interpret-searches: ${e.message}`); process.exit(2); }
