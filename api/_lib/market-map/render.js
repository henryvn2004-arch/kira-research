// ============================================================
// KIRA RESEARCH — api/_lib/market-map/render.js
// The one renderer of a market map: stats JSON (+ optional commentary JSON) -> HTML.
// Port of the approved v2 page (private pipeline, market_mapping/pilot/page_v2.py). Everything is computed
// from the stats by code; server-side inline SVG, no chart library, no client script except the small
// "request this list" form. The commentary layer is optional: without it every slot falls back to a
// fixed sentence built from the numbers, and the page reads complete.
//
//   renderBody(S, C, opts)      <main class="mm">…</main>            (what the route puts inside the chrome)
//   renderDocument(S, C, opts)  a full HTML document (head, JSON-LD, nav.js chrome)
//   renderHub(rows, opts)       full document for the hub /<loc>/market-maps/
//
// opts: { path, canonical, robots, buy: { enabled, price } , hubPath }
// The stats JSON is the contract with the private pipeline (see the header of scripts/load-market-maps.mjs).
// Nothing here ever prints a phone number, an email or a named person: the stats hold none.
// ============================================================
import { BASE, esc, ldJson } from '../ssr.js';

const TIERS = ['Large', 'Mid-size', 'Small', 'Not rated'];
const SHORT = {
  'Brand owner / manufacturer': 'Brand owner / mfr.',
  'Importer / exporter': 'Importer / exporter',
  'Distributor / wholesaler': 'Distributor / wholesaler',
  'Retail / other': 'Retail / other',
};
const short = (s) => SHORT[s] || s;
const TC = { Large: 'c1', 'Mid-size': 'c2', Small: 'c3', 'Not rated': 'c4' };
const rc = (S, g) => (g === 'Not stated' ? 'c4' : `c${Math.min(4, Math.max(1, (S.meta?.region_labels || ['North', 'Central', 'South', 'Not stated']).indexOf(g) + 1))}`);
const REGION_LABELS = (S) => S.meta?.region_labels || S.regions.map((r) => r.region);
const AXIS = (S) => S.meta?.axis || 'stage';
const AXIS_TITLE = (S) => S.meta?.axis_title || 'Value-chain stage';
const lc = (s) => String(s || '').toLowerCase();
const cap1 = (s) => String(s || '').slice(0, 1).toUpperCase() + String(s || '').slice(1);
const f1 = (x) => Number(x).toFixed(1);
const dedupe = (s) => String(s).replace(/\b(\w+) \1\b/g, '$1');   // "environmental service service" -> "environmental service"
const nf = (n) => Number(n).toLocaleString('en-US');

// ── SVG helpers ──────────────────────────────────────────
function wrap(text, widthPx, fs) {
  const cpl = Math.max(4, Math.floor(widthPx / (fs * 0.56)));
  const lines = []; let cur = '';
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    if (cur && cur.length + 1 + w.length > cpl) { lines.push(cur); cur = w; } else cur = (cur ? `${cur} ${w}` : w);
  }
  if (cur) lines.push(cur);
  return lines;
}
const T = (x, y, s, cls = '', anchor = 'start') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
const svg = (w, h, body, title, desc) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg"><title>${esc(title)}</title><desc>${esc(desc)}</desc>${body}</svg>`;

function marimekko(S) {
  const W = 520, H = 410, x0 = 38, x1 = 514, y0 = 70, y1 = 350, pw = x1 - x0, ph = y1 - y0, n = S.companies;
  const b = [];
  for (const t of [0, 50, 100]) b.push(T(x0 - 6, y1 - ph * t / 100 + 4, `${t}%`, 'ax', 'end'));
  let x = x0;
  for (const col of S.marimekko) {
    const w = pw * col.n / n;
    const lines = wrap(short(col.stage), w - 4, 11).slice(0, 3);
    lines.forEach((ln, i) => b.push(T(x + w / 2, 14 + i * 13, ln, 'hd', 'middle')));
    b.push(T(x + w / 2, 14 + lines.length * 13 + 2, `${col.n} cos.`, 'ax', 'middle'));
    let y = y0;
    for (const c of col.cells) {
      const h = col.n ? ph * c.n / col.n : 0;
      if (h <= 0) continue;
      const k = rc(S, c.region);
      b.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(w - 1.5, 0))}" height="${f1(Math.max(h - 1.5, 0))}" class="f-${k}"><title>${esc(col.stage)}, ${esc(c.region)}: ${c.n} companies (${c.pct_of_stage}% of ${AXIS(S)}, ${c.pct_of_all}% of all)</title></rect>`);
      if (c.pct_of_all >= 5) {
        b.push(T(x + w / 2, y + h / 2 + (h > 34 ? -2 : 4), String(c.n), `cl on-${k}`, 'middle'));
        if (h > 34) b.push(T(x + w / 2, y + h / 2 + 11, `${c.pct_of_stage}%`, `cs on-${k}`, 'middle'));
      }
      y += h;
    }
    x += w;
  }
  let lx = x0;
  for (const g of REGION_LABELS(S)) {
    b.push(`<rect x="${f1(lx)}" y="378" width="11" height="11" class="f-${rc(S, g)}"/>`); b.push(T(lx + 16, 388, g, 'ax'));
    lx += 16 + g.length * 6.5 + 18;
  }
  return svg(W, H, b.join(''), `Companies by ${AXIS(S)} and region`, 'Column width = companies in the group; height = share by region. Numbers in the table next to it.');
}

function stacked(S) {
  const W = 520, rowh = 46, n = S.tiers_by_stage.length, H = 22 + rowh * n + 34, lab = 132, bw = W - lab - 52;
  const b = [];
  S.tiers_by_stage.forEach((row, i) => {
    const y = 14 + i * rowh; let x = lab;
    wrap(short(row.stage), lab - 8, 11).slice(0, 2).forEach((ln, k) => b.push(T(0, y + 14 + k * 13, ln, 'hd')));
    for (const t of TIERS) {
      const c = row[t]; const w = row.n ? bw * c.n / row.n : 0;
      if (w <= 0) continue;
      b.push(`<rect x="${f1(x)}" y="${y}" width="${f1(Math.max(w - 1, 0))}" height="26" class="f-${TC[t]}"><title>${esc(row.stage)}, ${t}: ${c.n} (${c.pct}%)</title></rect>`);
      if (c.pct >= 8) b.push(T(x + w / 2, y + 17, `${c.pct}%`, `cl on-${TC[t]}`, 'middle'));
      x += w;
    }
    b.push(T(W, y + 17, `n=${row.n}`, 'ax', 'end'));
  });
  let lx = lab;
  for (const t of TIERS) {
    const yy = H - 10;
    b.push(`<rect x="${lx}" y="${yy - 10}" width="11" height="11" class="f-${TC[t]}"/>`); b.push(T(lx + 16, yy, t, 'ax'));
    lx += 16 + t.length * 6.5 + 16;
  }
  return svg(W, H, b.join(''), `Scale tier within each ${AXIS(S)}`, '100% stacked bars of Large, Mid-size, Small and Not rated companies per group.');
}

function ranked(items, unit, labelW = 170, cls = 'f-c2') {
  const W = 520, rowh = 26, H = rowh * items.length + 8, mx = Math.max(1, ...items.map((i) => i[1])), bw = W - labelW - 56;
  const b = [];
  items.forEach(([lab, v], i) => {
    const y = 4 + i * rowh, w = Math.max(2, bw * v / mx), l = lab.length <= 26 ? lab : `${lab.slice(0, 25)}...`;
    b.push(T(labelW - 8, y + 15, l, 'hd', 'end'));
    b.push(`<rect x="${labelW}" y="${y + 3}" width="${f1(w)}" height="16" class="${cls}"><title>${esc(lab)}: ${v} ${unit}</title></rect>`);
    b.push(T(labelW + w + 5, y + 16, String(v), 'cl'));
  });
  return svg(W, H, b.join(''), `Ranked bars (${unit})`, items.map(([l, v]) => `${l} ${v}`).join('; '));
}

function provinces(S) {
  const groups = S.provinces.filter((g) => g.n > 0);
  const W = 520, bandh = 74, H = groups.length * bandh + 8, b = [];
  groups.forEach((g, i) => {
    const y = 4 + i * bandh, k = rc(S, g.macro_region);
    b.push(T(0, y + 12, `${g.macro_region}: ${g.n} companies (${g.pct}%)`, 'hd'));
    const tot = g.provinces.reduce((a, p) => a + p.n, 0) || 1; let x = 0;
    for (const p of g.provinces) {
      const w = W * p.n / tot;
      b.push(`<rect x="${f1(x)}" y="${y + 20}" width="${f1(Math.max(w - 2, 0))}" height="48" class="f-${k}"><title>${esc(p.name)}: ${p.n} companies</title></rect>`);
      if (w >= 40) {
        wrap(p.name, w - 8, 10).slice(0, 2).forEach((ln, j) => b.push(T(x + 5, y + 36 + j * 11, ln, `cs on-${k}`)));
        b.push(T(x + 5, y + 62, String(p.n), `cl on-${k}`));
      } else if (w >= 16) b.push(T(x + w / 2, y + 48, String(p.n), `cs on-${k}`, 'middle'));
      x += w;
    }
  });
  return svg(W, H, b.join(''), 'Companies by main province', 'Tile width = companies in the province; bands follow the region order of the chart above.');
}

function concentration(S) {
  const W = 520, H = 46, n = S.companies, b = []; let x = 0;
  for (const t of TIERS) {
    const c = S.tiers[t]; const w = W * c.n / n;
    if (w <= 0) continue;
    b.push(`<rect x="${f1(x)}" y="6" width="${f1(Math.max(w - 2, 0))}" height="34" class="f-${TC[t]}"><title>${t}: ${c.n} (${c.pct}%)</title></rect>`);
    if (w > 54) b.push(T(x + w / 2, 28, `${t} ${c.pct}%`, `cl on-${TC[t]}`, 'middle'));
    x += w;
  }
  return svg(W, H, b.join(''), 'Company scale concentration', 'Single bar of Large, Mid-size, Small, Not rated counts.');
}

// ── text helpers: action titles and fallbacks, all from the numbers ──
export function titles(S) {
  const f = S.findings, ax = AXIS(S);
  const byLarge = S.tiers_by_stage.slice();
  const best = byLarge.reduce((a, r) => (r.Large.pct > a.Large.pct ? r : a), byLarge[0]);
  const pool = byLarge.filter((r) => r.n >= 10);
  const low = (pool.length ? pool : byLarge).reduce((a, r) => (r.Large.pct < a.Large.pct ? r : a), (pool.length ? pool : byLarge)[0]);
  const b0 = S.brands && S.brands[0];
  const hm = S.heatmap && S.heatmap.densest;
  return {
    marimekko: `${f.top_region.region} holds ${f.top_region.pct}% of mapped companies, and ${lc(f.top_stage.stage)} is the largest ${ax} at ${f.top_stage.pct}%`,
    heatmap: hm ? `The densest cell is ${lc(hm.sub_category)} x ${lc(hm.stage)}: ${hm.n} companies (${hm.pct}% of the list)` : '',
    stacked: `${best.stage} has the highest share of Large companies (${best.Large.pct}%); ${low.stage} the lowest (${low.Large.pct}%)`,
    brands: b0 ? `${b0.brand} is the most-listed brand, carried by ${b0.companies} companies` : '',
    region: `${f.top_province.name} alone holds ${f.top_province.pct}% of mapped companies (${f.top_province.n})`,
    concentration: `${f.small_pct}% of companies are Small; only ${f.large_pct}% are Large`,
    certs: S.certifications && S.certifications[0] ? `${S.certifications[0].name} is the most-cited certification (${S.certifications[0].n} companies)` : '',
    origins: S.origins && S.origins[0] ? `${S.origins[0].name} is the most-cited sourcing origin (${S.origins[0].n} companies)` : '',
  };
}

export function fallbackTakeaway(S) {
  const f = S.findings;
  return [
    `We map ${S.companies} ${lc(S.segment)} companies in ${S.country}.`,
    `${f.top_region.region} holds ${f.top_region.pct}% of them and ${lc(f.top_stage.stage)} is the largest ${AXIS(S)} at ${f.top_stage.pct}%.`,
    `${f.small_pct}% of companies are Small and ${f.large_pct}% are Large by website footprint.`,
  ].join(' ');
}

// ── CSS: every rule lives under .mm so it can sit next to kira.css and the shared nav ──
export const MM_CSS = `
:root{--mm-c1:#0F3D91;--mm-c2:#1A66F0;--mm-c3:#9CC0FF;--mm-c4:#CBD2D9;--mm-on-c1:#FFFFFF;--mm-on-c2:#FFFFFF;--mm-on-c3:#0F172A;--mm-on-c4:#0F172A}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0B0D10;--surface:#14181D;--surface-2:#1B2027;--text:#E6E9EE;--muted:#9AA6B5;--muted-dim:#8793A3;--border:#262D36;--border-strong:#39434F;--primary:#6EA2FF;--primary-dim:#8DB6FF;
--mm-c1:#B7D0FF;--mm-c2:#6EA2FF;--mm-c3:#2F5FB8;--mm-c4:#3A4350;--mm-on-c1:#0B0D10;--mm-on-c2:#0B0D10;--mm-on-c3:#FFFFFF;--mm-on-c4:#E6E9EE}}
:root[data-theme="dark"]{--bg:#0B0D10;--surface:#14181D;--surface-2:#1B2027;--text:#E6E9EE;--muted:#9AA6B5;--muted-dim:#8793A3;--border:#262D36;--border-strong:#39434F;--primary:#6EA2FF;--primary-dim:#8DB6FF;
--mm-c1:#B7D0FF;--mm-c2:#6EA2FF;--mm-c3:#2F5FB8;--mm-c4:#3A4350;--mm-on-c1:#0B0D10;--mm-on-c2:#0B0D10;--mm-on-c3:#FFFFFF;--mm-on-c4:#E6E9EE}
.mm{max-width:1120px;margin:0 auto;padding:20px 16px 56px;display:block}
.mm .crumb{margin-top:6px;font-size:12px;color:var(--primary);letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.mm .crumb a:hover{text-decoration:underline}.mm .crumb i{font-style:normal;color:var(--muted-dim);margin:0 6px}
.mm h1{font-size:clamp(26px,5vw,40px);line-height:1.12;letter-spacing:-.025em;margin:8px 0 10px;font-weight:700;max-width:860px}
.mm .dek{color:var(--muted);font-size:16px;max-width:820px}
.mm .kpis{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-top:22px}
.mm .kpi{padding:14px 14px 12px 0;margin-right:14px;border-right:1px solid var(--border)}.mm .kpi:last-child{border:0;margin:0}
.mm .kpi b{display:block;font-size:30px;line-height:1.1;letter-spacing:-.03em}.mm .kpi span{font-size:12px;color:var(--muted)}
.mm .take{margin-top:22px;background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--primary);border-radius:10px;padding:16px 18px;display:grid;grid-template-columns:150px 1fr;gap:14px}
.mm .lab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--primary);font-weight:700}
.mm .take p{font-size:16px}
.mm section{margin-top:38px}
.mm h2{font-size:20px;letter-spacing:-.01em;border-bottom:1px solid var(--text);padding-bottom:8px;margin-bottom:18px;display:flex;gap:10px;align-items:baseline}
.mm h2 i{font-style:normal;font-size:12px;color:var(--primary);letter-spacing:.08em}
.mm .grid{display:grid;grid-template-columns:1fr 1fr;gap:30px 36px}.mm .wide{grid-column:1/-1}
.mm figure{min-width:0}
.mm .at{font-size:16px;line-height:1.3;font-weight:700;margin-bottom:2px}
.mm .sub{font-size:12px;color:var(--muted-dim);margin-bottom:10px}
.mm figure svg{display:block;width:100%;height:auto;max-width:560px}
.mm svg text{fill:var(--text);font-family:inherit}.mm svg .ax{font-size:11px;fill:var(--muted-dim)}.mm svg .hd{font-size:11px;font-weight:600}.mm svg .cl{font-size:12px;font-weight:700}.mm svg .cs{font-size:10px}
.mm .f-c1{fill:var(--mm-c1)}.mm .f-c2{fill:var(--mm-c2)}.mm .f-c3{fill:var(--mm-c3)}.mm .f-c4{fill:var(--mm-c4)}
.mm svg text.on-c1{fill:var(--mm-on-c1)}.mm svg text.on-c2{fill:var(--mm-on-c2)}.mm svg text.on-c3{fill:var(--mm-on-c3)}.mm svg text.on-c4{fill:var(--mm-on-c4)}
.mm figcaption{font-size:12px;color:var(--muted);border-top:1px solid var(--border);padding-top:8px;margin-top:8px}
.mm .sowhat{margin-top:8px;font-size:13px;border-left:3px solid var(--primary);padding:2px 0 2px 10px}
.mm .sowhat b{color:var(--primary);font-size:10px;letter-spacing:.12em;text-transform:uppercase;margin-right:6px}
.mm .scroll{overflow-x:auto}
.mm table{width:100%;border-collapse:collapse;font-size:13px}.mm th,.mm td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);vertical-align:top}
.mm th{color:var(--muted);font-weight:600;font-size:11px;letter-spacing:.05em;text-transform:uppercase}
.mm .num,.mm td.n,.mm th.n{font-family:'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}
.mm td.n,.mm th.n{text-align:right}
.mm .heat td.h{text-align:center;font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700}
.mm .top{border-top:2px solid var(--text)}
.mm .big{display:flex;gap:20px;flex-wrap:wrap;margin:6px 0 10px}.mm .big div{min-width:110px}.mm .big b{display:block;font-size:34px;line-height:1.1;letter-spacing:-.03em}.mm .big span{font-size:12px;color:var(--muted)}
.mm .impl{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:16px 18px}.mm .impl ul{padding-left:18px}.mm .impl li{margin:6px 0}
.mm .buy{margin-top:34px;background:var(--surface);border:2px solid var(--primary);border-radius:12px;padding:18px}
.mm .buy .btn{display:inline-block;background:var(--primary);color:var(--bg);font-weight:700;padding:10px 18px;border-radius:8px;border:0;font-size:15px;margin-top:12px}
.mm .buy form{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.mm .buy form .btn{margin-top:0}
.mm .buy input[type=email]{flex:1 1 220px;min-width:0;padding:10px 12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--bg);color:var(--text);font:inherit}
.mm .buy .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.mm .buy .msg{margin-top:8px;font-size:13px;color:var(--muted)}
.mm .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:4px 22px;margin-top:8px;font-size:13px;color:var(--muted)}
.mm .method{display:grid;grid-template-columns:1fr 1fr;gap:24px}.mm .method h3{font-size:13px;border-top:2px solid var(--primary);padding-top:8px;margin-bottom:6px}.mm .method p,.mm .method li{font-size:12px;color:var(--muted)}.mm .method ul{padding-left:16px}
.mm .foot{margin-top:30px;border-top:2px solid var(--text);padding-top:10px;font-size:11px;color:var(--muted-dim);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.mm .hubfam{margin-top:30px}.mm .hubfam h2{font-size:18px}
.mm .hubgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.mm .hubcard{display:block;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}.mm .hubcard:hover{border-color:var(--primary)}
.mm .hubcard b{display:block;font-size:15px}.mm .hubcard span{font-size:12px;color:var(--muted)}
@media (max-width:860px){.mm .grid,.mm .method{grid-template-columns:1fr}.mm .wide{grid-column:auto}.mm .take{grid-template-columns:1fr;gap:6px}.mm .kpis{grid-template-columns:1fr 1fr}.mm .kpi:nth-child(2){border-right:0;margin-right:0}.mm .kpi{border-bottom:1px solid var(--border)}}
@media (max-width:480px){.mm{padding:16px 16px 44px}.mm .kpi b{font-size:26px}.mm h2{font-size:18px}.mm .big b{font-size:28px}}
`;

// ── buy box ──────────────────────────────────────────────
function buyBox(S, opts) {
  const n = S.companies, p = S.price_usd, b = opts.buy || {};
  const cols = `<div class="cols"><div>Company, legal name, website, region</div><div>${esc(AXIS_TITLE(S))}, sub-category, matched ${S.item_noun === 'service' ? 'services' : 'products'}, scale tier</div><div>${S.item_noun === 'service' ? 'Services' : 'Products'}, brands, channels, sourcing origins, certifications</div><div>Company phone (${S.contacts.with_phone_pct}% of rows) and email (${S.contacts.with_email_pct}% of rows), no named persons</div><div>Founded, employees, branches, description, social pages</div><div>Profile link and source line, dated ${esc(S.built)}</div></div>`;
  const keyword = `List: ${S.country} ${S.segment}`.slice(0, 80);
  if (b.enabled) {
    return `<div class="buy" id="buy"><b style="font-size:20px">Excel list: ${n} companies, $${p}</b>${cols}
<button class="btn" type="button" id="mm-buy" data-slug="${esc(S.meta?.slug || '')}">Get the list, $${p}</button><div class="msg" id="mm-msg" role="status"></div>
<div class="sub" style="margin-top:8px">One file, one-time purchase, a snapshot of ${esc(S.built)}. Up to 500 companies $49, above 500 $99.</div></div>
<script>(function(){var b=document.getElementById('mm-buy'),m=document.getElementById('mm-msg');if(!b)return;b.addEventListener('click',function(){b.disabled=true;fetch('/api/market-map-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:b.getAttribute('data-slug')})}).then(function(r){return r.json().catch(function(){return{}})}).then(function(j){m.textContent=(j&&j.message)||'Ordering opens soon.';b.disabled=false}).catch(function(){m.textContent='Something went wrong. Please try again.';b.disabled=false})})})();</script>`;
  }
  return `<div class="buy" id="buy"><b style="font-size:20px">Excel list: ${n} companies</b>${cols}
<form id="mm-req" novalidate><label class="hp" aria-hidden="true">Leave empty<input type="text" name="hp" tabindex="-1" autocomplete="off"></label>
<input type="email" name="email" placeholder="Your work email" aria-label="Your work email" autocomplete="email" required><button class="btn" type="submit">Request this list</button></form>
<div class="msg" id="mm-msg" role="status"></div>
<div class="sub" style="margin-top:8px">Leave your email and we write to you when the list is ready to order. One file, a snapshot of ${esc(S.built)}.</div></div>
<script>(function(){var f=document.getElementById('mm-req'),m=document.getElementById('mm-msg');if(!f)return;f.addEventListener('submit',function(e){e.preventDefault();var em=f.elements.email.value.trim();if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)){m.textContent='Please enter a valid email address.';return}var btn=f.querySelector('button');btn.disabled=true;fetch('/api/topic-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:em,keyword:${JSON.stringify(keyword).replace(/</g, '\\u003c')},locale:'en',hp:f.elements.hp.value})}).then(function(r){if(!r.ok)throw 0;m.textContent='Thank you. We have your request and will email you.';f.reset();btn.disabled=false}).catch(function(){m.textContent='Something went wrong. Please try again.';btn.disabled=false})})})();</script>`;
}

// ── page body ────────────────────────────────────────────
export function renderBody(S, C, opts = {}) {
  const n = S.companies, cn = S.country, seg = S.segment, Ti = titles(S), ax = AXIS(S), axT = AXIS_TITLE(S);
  const hubPath = opts.hubPath || '/en/market-maps';
  const so = (k) => (C && C.so_what && C.so_what[k] ? `<p class="sowhat" data-slot="so_what.${k}"><b>So what</b>${esc(C.so_what[k])}</p>` : '');
  const tk = C && C.takeaway ? C.takeaway : fallbackTakeaway(S);
  const RL = REGION_LABELS(S), stages = S.stages.map((s) => s.stage);
  const kpis = (S.kpis && S.kpis.length ? S.kpis : [
    { value: String(n), label: 'companies mapped' },
    { value: String(S.stages[0].n), label: 'manufacturers / brand owners' },
    { value: String((S.stages[1]?.n || 0) + (S.stages[2]?.n || 0)), label: 'importers, distributors and wholesalers' },
    { value: `${S.contacts.with_phone_pct}%`, label: 'with a company phone in the Excel list' },
  ]).map((k) => `<div class="kpi"><b class="num">${esc(k.value)}</b><span>${esc(k.label)}</span></div>`).join('');

  const mt = `<table><tr><th>${esc(cap1(ax))}</th><th class="n">Cos.</th>${RL.map((g) => `<th class="n">${esc(g)}</th>`).join('')}</tr>${S.marimekko.map((c) =>
    `<tr><td>${esc(short(c.stage))}</td><td class="n">${c.n}</td>${c.cells.map((x) => `<td class="n">${x.n} (${x.pct_of_stage}%)</td>`).join('')}</tr>`).join('')}</table>`;

  let heat = '';
  if (S.heatmap && S.heatmap.rows && S.heatmap.rows.length) {
    const mx = Math.max(1, ...S.heatmap.rows.map((r) => Math.max(...r.by_stage)));
    const hc = (v) => { const a = v ? 6 + Math.floor(70 * v / mx) : 0; return `<td class="h" style="background:color-mix(in srgb,var(--mm-c2) ${a}%,var(--bg));${a > 48 ? 'color:var(--mm-on-c2);' : ''}">${v}</td>`; };
    heat = `<table class="heat"><tr><th>Sub-category</th>${stages.map((s) => `<th class="n">${esc(short(s))}</th>`).join('')}<th class="n">Total</th></tr>${S.heatmap.rows.map((r) =>
      `<tr><td>${esc(r.sub_category)}</td>${r.by_stage.map(hc).join('')}<td class="n">${r.total}</td></tr>`).join('')}</table>`;
  }

  const brands = (S.brands || []).filter((b) => b.companies >= 2);
  const brandsTbl = `<table><tr><th>Brand</th><th class="n">Companies</th><th>Owner or carrier</th></tr>${brands.map((b) =>
    `<tr><td>${esc(b.brand)}</td><td class="n">${b.companies}</td><td>${b.owner_listed ? `Owner listed: ${esc(b.owner_name)}` : 'No company named after the brand in the list'}${b.carried_by_distributors_or_retail ? ` (${b.carried_by_distributors_or_retail} distributors / retail)` : ''}</td></tr>`).join('')}</table>`;
  const tiersCap = TIERS.map((t) => `${t} ${S.tiers[t].n} (${S.tiers[t].pct}%)`).join(' · ');
  const top = S.top20.map((r) => `<tr><td class="n">${r.rank}</td><td>${esc(r.company)}</td><td>${esc(r.stage)}</td><td>${esc(r.region)}</td><td>${esc(r.scale)}</td></tr>`).join('');
  const prev = S.preview.map((r) => `<tr><td class="n">${r.rank}</td><td>${esc(r.company)}</td><td>${esc(r.stage)}</td><td>${esc(r.sub_category)}</td><td>${esc(r.region)}</td><td>${esc(r.scale)}</td><td>${esc((r.products || []).join('; '))}</td><td>${esc(r.website)}</td></tr>`).join('');
  const provCap = S.provinces.filter((g) => g.n > 0).map((g) => `${g.macro_region}: ${g.provinces.map((x) => `${x.name} ${x.n}`).join(', ')}`).join(' · ');

  let no = 0; const num = () => `<i>${String(++no).padStart(2, '0')}</i>`;
  const sec1 = `<section><h2>${num()}Structure of the mapped company base</h2><div class="grid">
<figure class="wide"><h3 class="at">${esc(Ti.marimekko)}</h3><div class="sub">Column width = companies in the ${esc(ax)}; height = share of the ${esc(ax)} by region; cells of 5% of all companies or more are labelled</div>
<div class="grid" style="gap:16px 28px;align-items:start">${marimekko(S)}<div class="scroll">${mt}</div></div>${so('marimekko')}</figure>
${heat ? `<figure class="wide"><h3 class="at">${esc(Ti.heatmap)}</h3><div class="sub">Companies by main sub-category (product group with most matched products) and ${esc(ax)}</div><div class="scroll">${heat}</div>${so('heatmap')}</figure>` : ''}
</div></section>`;
  const f = S.findings;
  const sec2 = `<section><h2>${num()}Scale and concentration</h2><div class="grid">
<figure><h3 class="at">${esc(Ti.stacked)}</h3><div class="sub">Scale tier within each ${esc(ax)}, % of the ${esc(ax)}'s companies</div>${stacked(S)}<figcaption>${esc(S.tiers_by_stage.map((r) => `${r.stage}: ${TIERS.map((t) => `${t} ${r[t].pct}%`).join(', ')}`).join(' · '))}</figcaption>${so('stacked')}</figure>
<figure><h3 class="at">${esc(Ti.concentration)}</h3><div class="sub">All ${n} companies, relative scale from website footprint (not revenue)</div>
<div class="big"><div><b class="num">${f.small_pct}%</b><span>Small</span></div><div><b class="num">${S.tiers['Mid-size'].pct}%</b><span>Mid-size</span></div><div><b class="num">${f.large_pct}%</b><span>Large</span></div></div>${concentration(S)}<figcaption>${esc(tiersCap)}. Large = top 25% of companies in the country by website footprint, Small = below the 40th point of the 0-99 scale; relative, not revenue.</figcaption>${so('concentration')}</figure>
</div></section>`;
  const sec3 = `<section><h2>${num()}Geography${brands.length ? ' and brands' : ''}</h2><div class="grid">
<figure><h3 class="at">${esc(Ti.region)}</h3><div class="sub">Main provinces by region; tile width = companies</div>${provinces(S)}<figcaption>${esc(provCap)}</figcaption>${so('region')}</figure>
${brands.length ? `<figure><h3 class="at">${esc(Ti.brands)}</h3><div class="sub">Top ${brands.length} brands by number of companies carrying them</div>${ranked(brands.map((b) => [b.brand, b.companies]), 'companies')}<div class="scroll">${brandsTbl}</div>${so('brands')}</figure>` : ''}
</div></section>`;
  let sec4 = '';
  if ((S.certifications && S.certifications.length) || (S.origins && S.origins.length)) {
    sec4 = `<section><h2>${num()}Capability and sourcing signals</h2><div class="grid">`;
    for (const [k, items, ttl, sub] of [['certs', S.certifications, 'Certifications cited', 'Companies citing each certification; a company can cite several'], ['origins', S.origins, 'Sourcing origins cited', 'Companies naming each country as a source']]) {
      if (items && items.length) sec4 += `<figure><h3 class="at">${esc(Ti[k])}</h3><div class="sub">${esc(sub)}</div>${ranked(items.map((i) => [i.name, i.n]), 'companies')}<figcaption>${esc(items.map((i) => `${i.name} ${i.n}`).join(' · '))}</figcaption>${so(k)}</figure>`;
      void ttl;
    }
    sec4 += '</div></section>';
  }
  const sec5 = `<section><h2>${num()}Leading companies by relative scale</h2><div class="scroll top"><table><tr><th class="n">#</th><th>Company</th><th>${esc(cap1(ax))}</th><th>Region</th><th>Scale</th></tr>${top}</table></div></section>`;
  const impl = C && Array.isArray(C.implications) && C.implications.length
    ? `<section data-slot="implications"><h2>${num()}Implications for a foreign company looking for partners</h2><div class="impl"><ul>${C.implications.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></section>` : '';
  const sec7 = `<section><h2>${num()}Preview of the Excel list (10 of ${n} rows, contacts hidden)</h2><div class="scroll top"><table><tr><th class="n">Rank</th><th>Company</th><th>${esc(cap1(ax))}</th><th>Sub-category</th><th>Region</th><th>Scale</th><th>${S.item_noun === 'service' ? 'Services' : 'Products'}</th><th>Website</th></tr>${prev}</table></div></section>`;
  const groups = dedupe(S.groups.join(', '));
  const left = (S.left_out_roles || []).length ? ` Companies whose main role is ${esc(S.left_out_roles.join(' or '))} are left out because they serve the ${esc(S.item_noun)} rather than supply it.` : '';
  const notStated = (S.regions.find((r) => r.region === 'Not stated') || { pct: 0 }).pct;
  const sec8 = `<section><h2>${num()}Scope and method</h2><div class="method">
<div><h3>Definition</h3><p>Companies in ${esc(cn)} whose own website lists at least one specific ${esc(S.item_noun)} in these groups: ${esc(groups)}. ${esc(S.definition_extra || '')}${left}</p></div>
<div><h3>Method and limits</h3><ul><li>Source: company websites read by BizDirect Asia, built ${esc(S.built)}; scale tier is a BizDirect estimate from website footprint, not revenue.</li><li>${esc(cap1(ax))} comes from the company's main ${S.meta?.kind === 'service' ? 'service' : 'role'}; region from its stated location (${notStated}% not stated).</li><li>Only companies BizDirect has read are counted; small or offline-only businesses are under-represented.</li></ul></div></div></section>`;

  return `<main class="mm" id="mm-root" data-slug="${esc(S.meta?.slug || '')}">
<div class="crumb"><a href="${esc(hubPath)}">Market maps</a><i>/</i>${esc(cn)}<i>/</i>${esc(seg)}</div>
<h1>${esc(cn)} ${esc(lc(seg))}: who is in the market, where they sit and how big they are</h1>
<p class="dek">A company-level map of ${esc(lc(seg))} companies in ${esc(cn)}, compiled from company websites by ${esc(lc(axT))}, region and relative scale. Snapshot ${esc(S.built)}.</p>
<div class="kpis">${kpis}</div>
<div class="take" data-slot="takeaway"><div class="lab">Executive takeaway</div><p>${esc(tk)}</p></div>
${sec1}${sec2}${sec3}${sec4}${sec5}${impl}${sec7}
${buyBox(S, opts)}
${sec8}
<div class="foot"><span>KIRA Research · Know first. Move first.</span><span>Data: BizDirect Asia (bizdirectasia.com) · snapshot ${esc(S.built)}</span></div>
</main>`;
}

// ── document shell: head, JSON-LD, shared chrome (nav.js builds the header and footer) ──
function shell({ title, description, canonical, robots, ld, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${esc(robots)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="KIRA RESEARCH"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${BASE}/og-image.png"><meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${BASE}/og-image.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://api.fontshare.com">
<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,400&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/kira.css">
<style>${MM_CSS}</style>
${(ld || []).map((l) => `<script type="application/ld+json" id="${l.id}">${ldJson(l.data)}</script>`).join('\n')}
</head><body>
<!-- nav + footer injected by /js/nav.js -->
${body}
<script src="/js/nav.js" defer></script>
</body></html>`;
}

export function mapTitle(S) { return `${S.segment} companies in ${S.country}: market landscape and company list | KIRA Research`; }
export function mapDescription(S, buyOn = false) {
  return `${S.companies} ${lc(S.segment)} companies in ${S.country} mapped by ${lc(AXIS_TITLE(S))}, region, scale${S.brands && S.brands.length ? ' and brands' : ''}. Free overview${buyOn ? `; Excel list $${S.price_usd}` : '; Excel list on request'}.`;
}

export function renderDocument(S, C, opts = {}) {
  const canonical = opts.canonical || `${BASE}/en/market-maps/${S.meta?.slug}`;
  const hubUrl = `${BASE}${opts.hubPath || '/en/market-maps'}`;
  const ld = [
    { id: 'ld-dataset', data: {
      '@context': 'https://schema.org', '@type': 'Dataset', name: `${S.segment} companies in ${S.country}: market map`,
      description: mapDescription(S, !!(opts.buy && opts.buy.enabled)), url: canonical, dateModified: S.built, temporalCoverage: S.built,
      spatialCoverage: { '@type': 'Place', name: S.country }, isAccessibleForFree: true, inLanguage: 'en',
      variableMeasured: [AXIS_TITLE(S), 'Region', 'Relative scale tier'],
      creator: { '@type': 'Organization', name: 'Kira Research', url: `${BASE}/` },
      publisher: { '@type': 'Organization', name: 'Kira Research', url: `${BASE}/` },
    } },
    { id: 'ld-breadcrumb', data: {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Kira Research', item: `${BASE}/` },
        { '@type': 'ListItem', position: 2, name: 'Market maps', item: hubUrl },
        { '@type': 'ListItem', position: 3, name: `${S.country} ${lc(S.segment)}`, item: canonical },
      ] } },
  ];
  return shell({ title: mapTitle(S), description: mapDescription(S, !!(opts.buy && opts.buy.enabled)), canonical, robots: opts.robots || 'noindex,follow', ld, body: renderBody(S, C, opts) });
}

// rows: [{ country, segment_key, title, l2_family, n_companies, stats }] (published). Grouped by L2 family, then country.
export function renderHub(rows, opts = {}) {
  const canonical = opts.canonical || `${BASE}/en/market-maps`;
  const fams = new Map();
  for (const r of rows) {
    const k = r.l2_family || 'Other segments';
    if (!fams.has(k)) fams.set(k, []);
    fams.get(k).push(r);
  }
  const cname = (r) => r.stats?.country || cap1(r.country);
  const body = `<main class="mm" id="mm-root">
<div class="crumb">Market maps</div>
<h1>Market maps: who is in each market, by country and segment</h1>
<p class="dek">Each map shows the companies in one segment of one country, compiled from company websites, split by ${'value-chain stage or service type'}, region and relative scale. The overview is free; the full company list is an Excel file.</p>
${rows.length ? [...fams.keys()].sort().map((fam) => `<div class="hubfam"><h2>${esc(fam)}</h2><div class="hubgrid">${fams.get(fam).sort((a, b) => cname(a).localeCompare(cname(b)) || a.title.localeCompare(b.title)).map((r) =>
    `<a class="hubcard" href="/en/market-maps/${esc(r.country)}/${esc(r.segment_key)}"><b>${esc(cname(r))}: ${esc(r.title)}</b><span>${nf(r.n_companies)} companies mapped</span></a>`).join('')}</div></div>`).join('')
  : '<p class="dek" style="margin-top:24px">No market maps are published yet.</p>'}
<div class="foot"><span>KIRA Research · Know first. Move first.</span><span>Data: BizDirect Asia (bizdirectasia.com)</span></div>
</main>`;
  const ld = [{ id: 'ld-breadcrumb', data: { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Kira Research', item: `${BASE}/` }, { '@type': 'ListItem', position: 2, name: 'Market maps', item: canonical }] } }];
  return shell({ title: 'Market maps: companies by country and segment | KIRA Research', description: 'Company-level maps of segments across 15 Asia-Pacific markets: who is in the market, where they sit and how big they are. Free overview, Excel list on request.', canonical, robots: opts.robots || 'noindex,follow', ld, body });
}
