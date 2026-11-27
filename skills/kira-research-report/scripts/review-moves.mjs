#!/usr/bin/env node
// ---------------------------------------------------------------
// scripts/review-moves.mjs
//
// Reviews the draft company moves (company_events, status 'draft': news items and new-company flags gathered by
// /api/cron-moves and /api/cron-registry) so the owner does not have to. The judgement is made by the report Routine
// itself (subscription, no API key); this script holds everything around it.
//
//   node review-moves.mjs list [--limit 40]          print the drafts as JSON (newest first) with the review criteria
//   node review-moves.mjs apply <decisions.json>     apply the decisions
//
// Decision file: [{ "id": 8, "decision": "publish"|"reject", "reason": "...", "company": "...", "investor_country": "JP",
//                   "host_country": "VN", "type": "plant" }]   (company / countries / type optional: they fill gaps or correct the draft)
//
// apply re-checks every "publish" with api/_lib/moves/review.js: http(s) source URL, a company name, host = one of the 15
// markets, investor = a known country other than the host, and no repeat of a move already published (same company + host +
// type within 60 days: that one is rejected as a duplicate). A publish that fails a guard stays a draft and is reported.
// Reviewed rows get reviewed_by 'routine' and the reason in raw.review. /en/admin/moves still lets the owner override.
// Idempotent: only drafts are touched. Exit 0 on every handled case; non-zero only when Supabase is unreachable.
// ---------------------------------------------------------------

import fs from 'fs';
import { checkDecision, TYPES } from '../../../api/_lib/moves/review.js';
import { HOSTS, COUNTRY_CODES } from '../../../api/_lib/moves/rules.js';

const URL_ = (process.env.SUPABASE_URL || process.env.KIRA_SUPABASE_URL);
const KEY = (process.env.SUPABASE_SERVICE_KEY || process.env.KIRA_SUPABASE_SERVICE_KEY);
if (!URL_ || !KEY) { console.error('review-moves: SUPABASE_URL / SUPABASE_SERVICE_KEY missing'); process.exit(2); }

async function sb(path, method = 'GET', body) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(method === 'GET' ? {} : { Prefer: 'return=minimal' }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };

const CRITERIA = [
  'PUBLISH only a real, named company from outside the host market that makes a concrete move into one of the 15 markets: a factory or plant, an office or subsidiary, a joint venture, an acquisition or stake, a committed investment, a store or branch opening, a licence or approval to operate.',
  'REJECT rumour, plans with no commitment, opinion or analysis, politics and security stories, a domestic company expanding at home, funds / ETFs / trusts / shell registrations, the same move already published, headlines where no company is named, and exits only if they are not a clear market withdrawal.',
  'Set company (the foreign investor, not the target), investor_country (ISO2 of its home, never the host), host_country and type when the draft has them missing or wrong. When the headline is not enough, open the URL and read the article before deciding.',
  'Write a short reason for every decision (one sentence).'
];

async function list() {
  const limit = Math.min(Number(arg('--limit')) || 40, 200);
  const rows = await sb(`company_events?status=eq.draft&select=id,source_key,tier,url,title,domain,event_date,investor_country,host_country,type,company,value_usd,also,raw&order=event_date.desc,id.desc&limit=${limit}`);
  const total = await sb('company_events?status=eq.draft&select=id&limit=1000');
  console.log(JSON.stringify({ criteria: CRITERIA, markets: HOSTS, countries: COUNTRY_CODES, types: TYPES, drafts_total: total.length, items: rows }, null, 1));
}

async function apply() {
  const file = process.argv[3];
  if (!file) { console.error('usage: review-moves.mjs apply <decisions.json>'); process.exit(2); }
  const decisions = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(decisions)) { console.error('decisions must be an array'); process.exit(2); }
  const since = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
  const published = await sb(`company_events?status=eq.published&event_date=gte.${since}&select=id,company,host_country,type,event_date&limit=5000`);
  const res = { published: 0, rejected: 0, duplicates: 0, refused: [], skipped: [] };
  for (const d of decisions) {
    const id = Number(d && d.id);
    if (!Number.isInteger(id)) { res.skipped.push({ id: d && d.id, why: 'bad_id' }); continue; }
    const row = (await sb(`company_events?id=eq.${id}&select=id,status,source_key,url,domain,title,company,investor_country,host_country,type,event_date,raw`))[0];
    if (!row) { res.skipped.push({ id, why: 'not_found' }); continue; }
    const c = checkDecision(row, d, published);
    if (!c.ok) {
      if (c.error === 'not_a_draft') res.skipped.push({ id, why: 'not_a_draft' }); else res.refused.push({ id, why: c.error });
      continue;
    }
    await sb(`company_events?id=eq.${id}&status=eq.draft`, 'PATCH', c.patch);
    if (c.patch.status === 'published') { res.published++; published.push({ id, company: c.patch.company, host_country: c.patch.host_country, type: c.patch.type, event_date: row.event_date }); }
    else { res.rejected++; if (c.duplicate_of) res.duplicates++; }
  }
  console.log(JSON.stringify(res));
}

const cmd = process.argv[2];
try {
  if (cmd === 'list') await list();
  else if (cmd === 'apply') await apply();
  else { console.error('usage: review-moves.mjs list [--limit N] | apply <decisions.json>'); process.exit(2); }
} catch (e) { console.error('review-moves:', e.message); process.exit(1); }
