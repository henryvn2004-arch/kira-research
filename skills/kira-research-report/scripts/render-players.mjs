#!/usr/bin/env node
// "Who's who" pages: the industry's players grouped by value-chain stage
// (owner, 2026-10-07). Reads outputs/batch/<id>/players.json, checks it, and
// prints the page HTML to splice in before the methodology endnote.
//
// Usage:
//   node skills/kira-research-report/scripts/render-players.mjs --id <queue id> [--section 09] [--check]
//
// --check   validate only (exit 1 with the problems listed)
// Output pages keep {{PAGE_NUM}} / {{TOTAL_PAGES}} for the page walk to fill.
// The same players.json feeds the database (scripts/publish-players.mjs).
//
// players.json:
// { "country_code": "VN", "industry_code": "FSV", "segment": "coffee chains", "as_of": "2026-10",
//   "title": "Who's who: 48 players from bean to cup", "subhead": "…",
//   "stages":  [{ "key": "roast", "label": "Roasters and suppliers" }, …],            // value-chain order
//   "players": [{ "name": "trading name ≤26 chars", "legal_name": "…", "name_local": "…", "stage": "roast", "role": "…",
//                 "origin": "JP", "ownership": "foreign", "brands": ["…"], "scale": "…",
//                 "source": "JFC 2025", "url": "https://…" }, …],
//   "sources": { "JFC 2025": "Jollibee Foods Corp., Annual report 2025" } }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const id = arg('id');
if (!id) { console.error('usage: render-players.mjs --id <queue id> [--section NN] [--check]'); process.exit(2); }
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '../outputs/batch', id, 'players.json');
if (!fs.existsSync(file)) { console.error('missing ' + file); process.exit(2); }
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const MIN_PLAYERS = 15, MIN_STAGES = 3, COLS = 5, ROWS = 6;

function check(d) {
  const errs = [];
  const stages = d.stages || [], players = d.players || [], sources = d.sources || {};
  const keys = new Set(stages.map(s => s.key));
  if (!/^[A-Z]{2}$/.test(d.country_code || '')) errs.push('country_code must be ISO alpha-2');
  if (!d.title) errs.push('title missing');
  if (stages.length < MIN_STAGES) errs.push(`need at least ${MIN_STAGES} value-chain stages (got ${stages.length})`);
  if (players.length < MIN_PLAYERS) errs.push(`need at least ${MIN_PLAYERS} players (got ${players.length})`);
  const seen = new Set();
  players.forEach((p, i) => {
    const at = `players[${i}] ${p.name || ''}`;
    if (!p.name) errs.push(`${at}: name missing`);
    else if (p.name.length > 26) errs.push(`${at}: name longer than 26 characters (use the trading name; put the full name in legal_name)`);
    if (!keys.has(p.stage)) errs.push(`${at}: unknown stage "${p.stage}"`);
    if (!p.source || !sources[p.source]) errs.push(`${at}: source "${p.source}" missing or not in sources`);
    if (p.origin && !/^[A-Z]{2}$/.test(p.origin)) errs.push(`${at}: origin must be ISO alpha-2`);
    const k = `${(p.name || '').toLowerCase()}|${p.stage}`;
    if (seen.has(k)) errs.push(`${at}: listed twice in the same stage`);
    seen.add(k);
  });
  stages.forEach(s => {
    if (!players.some(p => p.stage === s.key)) errs.push(`stage "${s.key}" has no players`);
    if (!s.label || s.label.length > 26) errs.push(`stage "${s.key}": label missing or longer than 26 characters`);
  });
  return errs;
}

const errs = check(data);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
if (process.argv.includes('--check')) { console.log(`players.json ok: ${data.players.length} players, ${data.stages.length} stages`); process.exit(0); }

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const section = arg('section', '');

// Columns: one per stage, a stage with more than ROWS players continues in the next column.
const cols = [];
for (const s of data.stages) {
  const ps = data.players.filter(p => p.stage === s.key);
  for (let i = 0; i < ps.length; i += ROWS) cols.push({ label: s.label, cont: i > 0, players: ps.slice(i, i + ROWS) });
}

const card = p => `        <div class="pl-card">
          <div class="pl-name"><span>${esc(p.name)}</span>${p.origin ? `<span class="pl-origin">${esc(p.origin)}</span>` : ''}</div>
          <div class="pl-meta">${esc([p.role, (p.brands || []).join(', ')].filter(Boolean).join(' · '))}</div>
          <div class="pl-scale">${esc(p.scale || '')} <span class="pl-src">[${esc(p.source)}]</span></div>
        </div>`;

const pages = [];
for (let i = 0; i < cols.length; i += COLS) {
  const group = cols.slice(i, i + COLS);
  const aliases = [...new Set(group.flatMap(c => c.players.map(p => p.source)))];
  pages.push(`<div class="page players-page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">${section ? `Section ${esc(section)} · ` : ''}Who's who</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">${esc(data.title)}${i > 0 ? ' (continued)' : ''}</h1>
    ${i === 0 && data.subhead ? `<p class="page-subhead">${esc(data.subhead)}</p>` : ''}
    <div class="pl-grid" style="grid-template-columns: repeat(${group.length}, 1fr);">
${group.map(c => `      <div class="pl-col">
        <div class="pl-stage">${esc(c.label)}${c.cont ? ' (cont.)' : ''}</div>
${c.players.map(card).join('\n')}
      </div>`).join('\n')}
    </div>
    <div class="source-key">${aliases.map(a => `${esc(a)} = ${esc(data.sources[a])}`).join(' · ')}</div>
    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>Players as of ${esc(data.as_of || '')}. Origin = home country of the owner or brand.</div>
    </div>
  </div>
</div>`);
}
console.log(pages.join('\n\n'));
console.error(`render-players: ${data.players.length} players, ${data.stages.length} stages, ${pages.length} page(s)`);
