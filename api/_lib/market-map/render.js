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
//   renderHub(model, params, opts)  full document for the hub /<loc>/market-maps (small landing + paged table)
//   renderCountryHub(model, opts)   full document for /<loc>/market-maps/<country>
//
// opts: { path, canonical, robots, buy: { enabled, price } , hubPath }
// The stats JSON is the contract with the private pipeline (see the header of scripts/load-market-maps.mjs).
// Nothing here ever prints a phone number, an email or a named person: the stats hold none.
// ============================================================
import { BASE, esc, ldJson } from '../ssr.js';
import { BANDS, SORTS, isFiltered, hubHref } from './hub.js';

const TIERS = ['Large', 'Mid-size', 'Small', 'Not rated'];
const SHORT = {
  'Brand owner / manufacturer': 'Brand owner / mfr.',
  'Importer / exporter': 'Importer / exporter',
  'Distributor / wholesaler': 'Distributor / wholesaler',
  'Retail / other': 'Retail / other',
};
const short = (s) => SHORT[s] || s;
const TC = { Large: 'c1', 'Mid-size': 'c2', Small: 'c3', 'Not rated': 'c4' };
// colour class of a mekko row label: first four labels c1,c2,c3,c5(amber); "Other", "Not rated" and "Not stated" are grey (c4)
const yc = (S, g) => {
  const L = S.meta?.mekko?.y_labels || [];
  if (['Other', 'Not rated', 'Not stated'].includes(g)) return 'c4';
  const i = L.filter((x) => !['Other', 'Not rated', 'Not stated'].includes(x)).indexOf(g);
  return ['c1', 'c2', 'c3', 'c5'][Math.max(0, Math.min(3, i))];
};
// coverage gates: an optional exhibit is hidden when too few companies have the field
const TH_DEFAULT = { region: 0.8, channels: 0.5, brands_min_n: 5, certifications_min_n: 5, origins_min_n: 5 };
const cov = (S, f) => S.coverage?.[f] || null;
const th = (S) => ({ ...TH_DEFAULT, ...(S.thresholds || {}) });
export function show(S, f) {
  const c = cov(S, f), t = th(S);
  if (f === 'region') return !!(S.regions && S.provinces && (!c || c.share_filled >= t.region));
  if (f === 'channels') return !!(S.channels && S.channels.length && c && c.share_filled >= t.channels);
  if (f === 'brands') return !!(S.brands || []).filter((b) => b.companies >= 2).length && (!c || c.n_filled >= t.brands_min_n);
  if (f === 'certifications') return !!(S.certifications && S.certifications.length) && (!c || c.n_filled >= t.certifications_min_n);
  if (f === 'origins') return !!(S.origins && S.origins.length) && (!c || c.n_filled >= t.origins_min_n);
  return true;
}
// "based on N companies" line under every optional chart
const based = (S, f, what) => { const c = cov(S, f); return c ? ` Based on ${nf(c.n_filled)} companies with ${what} (${Math.round(c.share_filled * 100)}% of the ${nf(S.companies)} mapped).` : ''; };
const rc = (S, g) => (g === 'Not stated' ? 'c4' : `c${Math.min(4, Math.max(1, (S.meta?.region_labels || ['North', 'Central', 'South', 'Not stated']).indexOf(g) + 1))}`);
const AXIS = (S) => S.meta?.axis || 'stage';
const AXIS_TITLE = (S) => S.meta?.axis_title || 'Value-chain stage';
const lc = (s) => String(s || '').toLowerCase();
const cap1 = (s) => String(s || '').slice(0, 1).toUpperCase() + String(s || '').slice(1);
const f1 = (x) => Number(x).toFixed(1);
const dedupe = (s) => String(s).replace(/\b(\w+) \1\b/g, '$1');   // "environmental service service" -> "environmental service"
const nf = (n) => Number(n).toLocaleString('en-US');
const countrySlug = (S) => String(S.meta?.slug || '').split('/')[0] || String(S.country || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

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
  const W = 520, x0 = 38, x1 = 514, y0 = 70, y1 = 350, pw = x1 - x0, ph = y1 - y0, n = S.companies, M = S.meta.mekko;
  const b = [];
  for (const t of [0, 50, 100]) b.push(T(x0 - 6, y1 - ph * t / 100 + 4, `${t}%`, 'ax', 'end'));
  let x = x0; const narrowKey = [];
  for (const col of S.marimekko) {
    const w = pw * col.n / n;
    const narrow = w < pw * 0.08;   // header labels would collide: letter tag here, name in the key below the chart
    if (narrow) {
      const tag = String.fromCharCode(65 + narrowKey.length); narrowKey.push([tag, short(col.stage)]);
      b.push(T(x + w / 2, 14, tag, 'hd', 'middle'));
    } else {
      const lines = wrap(short(col.stage), w - 4, 11).slice(0, 3);
      lines.forEach((ln, i) => b.push(T(x + w / 2, 14 + i * 13, ln, 'hd', 'middle')));
      b.push(T(x + w / 2, 14 + lines.length * 13 + 2, `${col.n} cos.`, 'ax', 'middle'));
    }
    let y = y0;
    for (const c of col.cells) {
      const h = col.n ? ph * c.n / col.n : 0;
      if (h <= 0) continue;
      const k = yc(S, c.label);
      b.push(`<rect x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(w - 1.5, 0))}" height="${f1(Math.max(h - 1.5, 0))}" class="f-${k}"><title>${esc(col.stage)}, ${esc(c.label)}: ${c.n} companies (${c.pct_of_stage}% of ${AXIS(S)}, ${c.pct_of_all}% of all)</title></rect>`);
      if (c.pct_of_all >= 5) {
        b.push(T(x + w / 2, y + h / 2 + (h > 34 ? -2 : 4), String(c.n), `cl on-${k}`, 'middle'));
        if (h > 34) b.push(T(x + w / 2, y + h / 2 + 11, `${c.pct_of_stage}%`, `cs on-${k}`, 'middle'));
      }
      y += h;
    }
    x += w;
  }
  let lx = x0, ly = 378;
  for (const g of M.y_labels) {
    const need = 16 + g.length * 6.5 + 18;
    if (lx + need > W) { lx = x0; ly += 15; }
    b.push(`<rect x="${f1(lx)}" y="${ly}" width="11" height="11" class="f-${yc(S, g)}"/>`); b.push(T(lx + 16, ly + 10, g, 'ax'));
    lx += need;
  }
  if (narrowKey.length) { ly += 17; b.push(T(x0, ly + 10, narrowKey.map(([t, nm]) => `${t} = ${nm}`).join('   '), 'ax')); }
  return svg(W, ly + 18, b.join(''), `Companies by ${AXIS(S)} and ${lc(M.y_title)}`, `Column width = companies in the ${AXIS(S)}; height = share by ${lc(M.y_title)}. Numbers in the table next to it.`);
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

// count text of a list item; lb = merged spellings of one label, so the count is a lower bound
const lbn = (i) => (i.lb ? `at least ${i.n}` : `${i.n}`);

function ranked(items, unit, labelW = 170, cls = 'f-c2') {
  const W = 520, rowh = 26, H = rowh * items.length + 8, mx = Math.max(1, ...items.map((i) => i[1])), bw = W - labelW - 56;
  const b = [];
  items.forEach(([lab, v, lb], i) => {
    const y = 4 + i * rowh, w = Math.max(2, bw * v / mx), l = lab.length <= 26 ? lab : `${lab.slice(0, 25)}...`, vt = lb ? `${v}+` : String(v);
    b.push(T(labelW - 8, y + 15, l, 'hd', 'end'));
    b.push(`<rect x="${labelW}" y="${y + 3}" width="${f1(w)}" height="16" class="${cls}"><title>${esc(lab)}: ${lb ? 'at least ' : ''}${v} ${unit}</title></rect>`);
    b.push(T(labelW + w + 5, y + 16, vt, 'cl'));
  });
  return svg(W, H, b.join(''), `Ranked bars (${unit})`, items.map(([l, v, lb]) => `${l} ${lb ? `${v}+` : v}`).join('; '));
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
  const f = S.findings, ax = AXIS(S), M = S.meta.mekko || null;
  const byLarge = (S.tiers_by_stage || []).slice();
  const best = byLarge.length ? byLarge.reduce((a, r) => (r.Large.pct > a.Large.pct ? r : a), byLarge[0]) : null;
  const pool = byLarge.filter((r) => r.n >= 10);
  const low = byLarge.length ? (pool.length ? pool : byLarge).reduce((a, r) => (r.Large.pct < a.Large.pct ? r : a), (pool.length ? pool : byLarge)[0]) : null;
  const b0 = S.brands && S.brands[0];
  const hm = S.heatmap && S.heatmap.densest;
  const goods = M && M.y_title === 'Sub-category' && !!S.marimekko;
  return {
    marimekko: goods
      ? `${lc(f.top_stage.stage)} is the largest ${ax} at ${f.top_stage.pct}%, and ${lc(f.top_sub.name)} is the largest sub-category at ${f.top_sub.pct}% of companies`
      : `${lc(f.top_stage.stage)} is the largest ${ax} at ${f.top_stage.pct}% of companies; ${f.large_pct}% of all companies are Large`,
    heatmap: hm ? `The densest cell is ${lc(hm.sub_category)} x ${lc(hm.stage)}: ${hm.n} companies (${hm.pct}% of the list)` : '',
    stacked: !best ? '' : `${best.stage} has the highest share of Large companies (${best.Large.pct}%); ${low.stage} the lowest (${low.Large.pct}%)`,
    brands: b0 ? `Brands carried by companies in this list: ${b0.brand} leads, named by ${b0.lb ? "at least " : ""}${b0.companies} companies` : '',
    channels: S.channels && S.channels[0] ? `${S.channels[0].name} is the most-cited sales channel (${lbn(S.channels[0])} companies)` : '',
    region: f.top_province ? `${f.top_province.name} alone holds ${f.top_province.pct}% of mapped companies (${f.top_province.n})` : '',
    concentration: `${f.small_pct}% of companies are Small; only ${f.large_pct}% are Large`,
    certs: S.certifications && S.certifications[0] ? `${S.certifications[0].name} is the most-cited certification (${lbn(S.certifications[0])} companies)` : '',
    origins: S.origins && S.origins[0] ? `${S.origins[0].name} is the most-cited sourcing origin (${lbn(S.origins[0])} companies)` : '',
  };
}

export function fallbackTakeaway(S) {
  const f = S.findings, geo = show(S, 'region') && f.top_region;
  return [
    `We map ${S.companies} ${lc(S.segment)} companies in ${S.country}.`,
    `${cap1(lc(f.top_stage.stage))} is the largest ${AXIS(S)} at ${f.top_stage.pct}%${S.meta.mekko && S.meta.mekko.y_title === 'Sub-category' && S.marimekko ? ` and ${lc(f.top_sub.name)} the largest sub-category at ${f.top_sub.pct}%` : ''}.`,
    geo ? `${f.top_region.region} holds ${f.top_region.pct}% of them.` : '',
    `${f.small_pct}% of companies are Small and ${f.large_pct}% are Large by website footprint.`,
  ].filter(Boolean).join(' ');
}

// ── CSS: every rule lives under .mm so it can sit next to kira.css and the shared nav ──
export const MM_CSS = `
:root{--mm-c1:#0F3D91;--mm-c2:#1A66F0;--mm-c3:#9CC0FF;--mm-c4:#CBD2D9;--mm-c5:#C98A12;--mm-on-c5:#0F172A;--mm-on-c1:#FFFFFF;--mm-on-c2:#FFFFFF;--mm-on-c3:#0F172A;--mm-on-c4:#0F172A}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0B0D10;--surface:#14181D;--surface-2:#1B2027;--text:#E6E9EE;--muted:#9AA6B5;--muted-dim:#8793A3;--border:#262D36;--border-strong:#39434F;--primary:#6EA2FF;--primary-dim:#8DB6FF;
--mm-c1:#B7D0FF;--mm-c2:#6EA2FF;--mm-c3:#2F5FB8;--mm-c4:#3A4350;--mm-c5:#E8B65A;--mm-on-c5:#0B0D10;--mm-on-c1:#0B0D10;--mm-on-c2:#0B0D10;--mm-on-c3:#FFFFFF;--mm-on-c4:#E6E9EE}}
:root[data-theme="dark"]{--bg:#0B0D10;--surface:#14181D;--surface-2:#1B2027;--text:#E6E9EE;--muted:#9AA6B5;--muted-dim:#8793A3;--border:#262D36;--border-strong:#39434F;--primary:#6EA2FF;--primary-dim:#8DB6FF;
--mm-c1:#B7D0FF;--mm-c2:#6EA2FF;--mm-c3:#2F5FB8;--mm-c4:#3A4350;--mm-c5:#E8B65A;--mm-on-c5:#0B0D10;--mm-on-c1:#0B0D10;--mm-on-c2:#0B0D10;--mm-on-c3:#FFFFFF;--mm-on-c4:#E6E9EE}
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
.mm .f-c1{fill:var(--mm-c1)}.mm .f-c2{fill:var(--mm-c2)}.mm .f-c3{fill:var(--mm-c3)}.mm .f-c4{fill:var(--mm-c4)}.mm .f-c5{fill:var(--mm-c5)}
.mm svg text.on-c1{fill:var(--mm-on-c1)}.mm svg text.on-c2{fill:var(--mm-on-c2)}.mm svg text.on-c3{fill:var(--mm-on-c3)}.mm svg text.on-c4{fill:var(--mm-on-c4)}.mm svg text.on-c5{fill:var(--mm-on-c5)}
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
.mm.r-container{max-width:1240px;padding:0 24px 40px}.mm .lib2{padding-block:28px 24px}
.mm .lrow .chip{max-width:100%}.mm .lrow{grid-template-columns:52px minmax(0,1fr) auto}.mm .lrow::after{content:"View list →";border:1px solid var(--primary);color:var(--primary);border-radius:8px;padding:9px 16px;font-size:14px;font-weight:600;white-space:nowrap}.mm .lrow:hover::after{background:var(--primary);color:#fff}.mm .mm-sort{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted)}.mm .mm-sort a{white-space:nowrap;padding:4px 10px;border:1px solid var(--border-strong);border-radius:999px;color:var(--text)}.mm .mm-sort a.on{background:var(--primary);border-color:var(--primary);color:#fff}.mm .mm-bycountry{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;margin-top:28px;padding-top:18px;border-top:1px solid var(--border);font-size:14px}.mm .mm-bycountry b{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.mm .mm-bycountry a{color:var(--primary)}.mm .lrow .meta b{color:var(--text);font-weight:600}.mm .mm-ico{width:52px;height:52px;border-radius:12px;background:var(--primary-soft,#EAF1FE);color:var(--primary);display:flex;align-items:center;justify-content:center;flex:none}.mm .mm-ico svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.mm .mm-fdet>summary{list-style:none;cursor:default}.mm .mm-fdet>summary::-webkit-details-marker{display:none}.mm .mm-fdet>summary a{pointer-events:auto}
.mm .lib2-side-head h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;border:0;padding:0;margin:0;line-height:1.4}.mm .lib2-count strong{font-weight:700}
.mm .lib2-bar .k{font-size:13px}.mm .lib2-bar select{display:none}
@media (min-width:961px){.mm .mm-fdet>summary{pointer-events:none}}
@media (max-width:960px){.mm .lib2-side{display:block}.mm .lib2-bar{display:flex}.mm .mm-fdet>summary{cursor:pointer;border-bottom:1px solid var(--border)}.mm .mm-fdet:not([open])>summary{border-bottom:0}.mm .mm-fdet>summary::after{content:"+";font-size:18px;color:var(--primary);margin-left:auto;padding-left:12px}.mm .mm-fdet[open]>summary::after{content:"−"}.mm .lib2-side-head{gap:10px}.mm .lib2-side-head h2{margin-right:auto}}
@media (max-width:640px){.mm.r-container{padding:0 16px 32px}.mm .lrow::after{display:none}.mm .lrow{grid-template-columns:52px minmax(0,1fr)}.mm .lib2-bar{flex-wrap:wrap;gap:8px 12px}.mm .mm-sort span{display:none}}
.mm .fgrp-body .fopt{cursor:pointer}.mm .fopt input{pointer-events:none}
.mm .hubbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.mm .hubbar input[type=search]{flex:1 1 220px;min-width:0;padding:10px 12px;border:1px solid var(--border-strong);border-radius:8px;background:var(--bg);color:var(--text);font:inherit}.mm .hubbar select{padding:6px 8px;border:1px solid var(--border-strong);border-radius:6px;background:var(--bg);color:var(--text);font:inherit}
.mm a.fopt{text-decoration:none}.mm a.fopt:hover .lbl{text-decoration:underline}.mm a.fopt.on .lbl{font-weight:700;color:var(--primary)}
.mm .fgrp>.fgrp-head{padding:14px 16px;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--primary)}
.mm .tag{font-size:10px;letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--border-strong);border-radius:4px;padding:0 5px;margin-left:6px;color:var(--muted);vertical-align:middle}
.mm .sbtn{padding:10px 16px;border-radius:8px;border:1px solid var(--border-strong);background:var(--surface);color:var(--text);font:inherit;font-weight:600;cursor:pointer}
.mm .pager{display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:16px;font-size:14px}.mm .pager a{color:var(--primary);font-weight:600}.mm .pager .off{color:var(--muted-dim)}
.mm .pager .nums{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.mm .pager .nums a,.mm .pager .cur{min-width:30px;text-align:center;padding:3px 6px;border-radius:6px;border:1px solid var(--border)}.mm .pager .cur{background:var(--primary);color:var(--bg);border-color:var(--primary);font-weight:700}.mm .pager .gap{color:var(--muted-dim)}
.mm .fam{margin-top:26px}.mm .fam h2{font-size:17px;margin-bottom:10px}.mm .fam h2 i{font-style:normal;font-size:12px;color:var(--muted-dim);font-weight:400}
.mm .mmlist{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px 24px}.mm .mmlist li{font-size:14px;padding:3px 0;border-bottom:1px solid var(--border)}.mm .mmlist a{color:var(--primary);font-weight:600}.mm .mmlist a:hover{text-decoration:underline}
.mm .k{font-size:12px;color:var(--muted-dim)}.mm tr[hidden]{display:none}.mm td a:hover{text-decoration:underline}
@media (max-width:860px){.mm .grid,.mm .method{grid-template-columns:1fr}.mm .wide{grid-column:auto}.mm .take{grid-template-columns:1fr;gap:6px}.mm .kpis{grid-template-columns:1fr 1fr}.mm .kpi:nth-child(2){border-right:0;margin-right:0}.mm .kpi{border-bottom:1px solid var(--border)}}
@media (max-width:480px){.mm{padding:16px 16px 44px}.mm .kpi b{font-size:26px}.mm h2{font-size:18px}.mm .big b{font-size:28px}}
`;

// The hub and the country hubs do not draw charts, KPI rows, tables or the buy box: they get the stylesheet without those rules.
const MAP_ONLY_CSS = ['.mm .crumb', '.mm h1', '.mm .kpi', '.mm .take', '.mm .lab', '.mm .grid', '.mm figure', '.mm .at', '.mm .sub', '.mm svg', '.mm .f-c1', '.mm figcaption', '.mm .sowhat', '.mm .scroll', '.mm table', '.mm th', '.mm .num', '.mm td.n', '.mm .heat', '.mm .top', '.mm .big', '.mm .impl', '.mm .buy', '.mm .cols', '.mm .method', '@media (max-width:860px)'];
export const MM_HUB_CSS = MM_CSS.split('\n').filter((l) => !MAP_ONLY_CSS.some((x) => l.startsWith(x))).join('\n');

// ── buy box ──────────────────────────────────────────────
function buyBox(S, opts) {
  const n = S.companies, p = S.price_usd, b = opts.buy || {};
  const cols = `<div class="cols"><div>Company, legal name, website, region</div><div>${esc(AXIS_TITLE(S))}, sub-category, matched ${S.item_noun === 'service' ? 'services' : 'products'}, scale tier</div><div>${S.item_noun === 'service' ? 'Services' : 'Products'}, brands, channels, sourcing origins, certifications</div><div>Company phone (up to ${S.contacts.with_phone_pct}% of rows) and email (up to ${S.contacts.with_email_pct}% of rows), no named persons</div><div>Founded, employees, branches, description, social pages</div><div>Profile link and source line, dated ${esc(S.built)}</div></div>`;
  const keyword = `List: ${S.country} ${S.segment}`.slice(0, 80);
  if (b.enabled) {
    return `<div class="buy" id="buy"><b style="font-size:20px">Excel list: ${n} companies, $${p}</b>${cols}
<button class="btn" type="button" id="mm-buy">Get the list, $${p}</button><div class="msg" id="mm-msg" role="status"></div>
<div class="sub" style="margin-top:8px">One file, one-time purchase, a snapshot of ${esc(S.built)}. Up to 500 companies $36, above 500 $57. Download link valid 7 days, up to 5 downloads; the list is also kept under My Library.</div></div>`;
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
  { // one sub-category holding 90%+ of the companies: single-colour mekko and heatmap say nothing, so show the stage bar alone
    const M0 = S.meta.mekko, rows = S.marimekko || [];
    if (M0 && M0.y_title === 'Sub-category' && rows.length && S.companies) {
      const share = Math.max(...M0.y_labels.map((l) => rows.reduce((a, c) => a + ((c.cells.find((x) => x.label === l) || {}).n || 0), 0))) / S.companies;
      if (share >= 0.9) S = { ...S, marimekko: null, heatmap: null };
    }
  }
  const n = S.companies, cn = S.country, seg = S.segment, Ti = titles(S), ax = AXIS(S), axT = AXIS_TITLE(S);
  const hubPath = opts.hubPath || '/en/market-maps';
  const countryPath = `${hubPath}/${countrySlug(S)}`;
  const so = (k) => (C && C.so_what && C.so_what[k] ? `<p class="sowhat" data-slot="so_what.${k}"><b>So what</b>${esc(C.so_what[k])}</p>` : '');
  const tk = C && C.takeaway ? C.takeaway : fallbackTakeaway(S);
  const M = S.meta.mekko || { y_labels: [], y_title: '' }, stages = S.stages.map((s) => s.stage);
  const kpis = (S.kpis && S.kpis.length ? S.kpis : [
    { value: String(n), label: 'companies mapped' },
    { value: String(S.stages[0].n), label: 'manufacturers / brand owners' },
    { value: String((S.stages[1]?.n || 0) + (S.stages[2]?.n || 0)), label: 'importers, distributors and wholesalers' },
    { value: `${S.contacts.with_phone_pct}%`, label: 'with a company phone in the Excel list' },
  ]).map((k) => `<div class="kpi"><b class="num">${esc(k.value)}</b><span>${esc(k.label)}</span></div>`).join('');

  const mt = !(S.marimekko && S.marimekko.length) ? '' : `<table><tr><th>${esc(cap1(ax))}</th><th class="n">Cos.</th>${M.y_labels.map((g) => `<th class="n">${esc(g)}</th>`).join('')}</tr>${S.marimekko.map((c) =>
    `<tr><td>${esc(short(c.stage))}</td><td class="n">${c.n}</td>${c.cells.map((x) => `<td class="n">${x.n} (${x.pct_of_stage}%)</td>`).join('')}</tr>`).join('')}</table>`;

  let heat = '';
  if (S.heatmap && S.heatmap.rows && S.heatmap.rows.length) {
    const mx = Math.max(1, ...S.heatmap.rows.map((r) => Math.max(...r.by_stage)));
    const hc = (v) => { const a = v ? 6 + Math.floor(70 * v / mx) : 0; return `<td class="h" style="background:color-mix(in srgb,var(--mm-c2) ${a}%,var(--bg));${a > 48 ? 'color:var(--mm-on-c2);' : ''}">${v}</td>`; };
    heat = `<table class="heat"><tr><th>Sub-category</th>${stages.map((s) => `<th class="n">${esc(short(s))}</th>`).join('')}<th class="n">Total</th></tr>${S.heatmap.rows.map((r) =>
      `<tr><td>${esc(r.sub_category)}</td>${r.by_stage.map(hc).join('')}<td class="n">${r.total}</td></tr>`).join('')}</table>`;
  }

  const brands = (S.brands || []).filter((b) => b.companies >= 2);
  const ownCol = brands.some((b) => b.owner_listed !== null && b.owner_listed !== undefined);
  const brandsTbl = `<table><tr><th>Brand</th><th class="n">Companies</th>${ownCol ? '<th>Owner or carrier</th>' : ''}</tr>${brands.map((b) =>
    `<tr><td>${esc(b.brand)}</td><td class="n">${b.companies}</td>${ownCol ? `<td>${b.owner_listed ? `Owner listed: ${esc(b.owner_name)}` : 'No company named after the brand in the list'}${b.carried_by_distributors_or_retail ? ` (${b.carried_by_distributors_or_retail} distributors / retail)` : ''}</td>` : ''}</tr>`).join('')}</table>`;
  const tiersCap = TIERS.map((t) => `${t} ${S.tiers[t].n} (${S.tiers[t].pct}%)`).join(' · ');
  const topProd = S.top20.some((r) => r.products && r.products.length);
  const top = S.top20.map((r) => `<tr><td class="n">${r.rank}</td><td>${esc(r.company)}</td><td>${esc(r.stage)}</td><td>${esc(r.region)}</td><td>${esc(r.scale)}</td>${topProd ? `<td>${esc((r.products || []).join('; '))}</td>` : ''}</tr>`).join('');
  const prev = S.preview.map((r) => `<tr><td class="n">${r.rank}</td><td>${esc(r.company)}</td><td>${esc(r.stage)}</td><td>${esc(r.sub_category)}</td><td>${esc(r.region)}</td><td>${esc(r.scale)}</td><td>${esc((r.products || []).join('; '))}</td><td>${esc(r.website)}</td></tr>`).join('');
  const provCap = (S.provinces || []).filter((g) => g.n > 0).map((g) => `${g.macro_region}: ${g.provinces.map((x) => `${x.name} ${x.n}`).join(', ')}`).join(' · ');

  let no = 0; const num = () => `<i>${String(++no).padStart(2, '0')}</i>`;
  const sec1 = !(S.marimekko && S.marimekko.length) && S.stages.length < 2 ? '' : `<section><h2>${num()}Structure of the mapped company base</h2><div class="grid">
${S.marimekko && S.marimekko.length ? `<figure class="wide"><h3 class="at">${esc(Ti.marimekko)}</h3><div class="sub">Column width = companies in the ${esc(ax)}; height = share of the ${esc(ax)} by ${esc(lc(M.y_title))}; cells of 5% of all companies or more are labelled. Based on all ${nf(n)} mapped companies.</div>
<div class="grid" style="gap:16px 28px;align-items:start">${marimekko(S)}<div class="scroll">${mt}</div></div>${so('marimekko')}</figure>` : `<figure class="wide"><h3 class="at">${esc(Ti.marimekko)}</h3><div class="sub">Companies by ${esc(ax)}. Based on all ${nf(n)} mapped companies.</div>${ranked(S.stages.map((x) => [x.stage, x.n]), 'companies')}<figcaption>${esc(S.stages.map((x) => `${x.stage} ${x.n}`).join(' · '))}.</figcaption>${so('marimekko')}</figure>`}
${heat ? `<figure class="wide"><h3 class="at">${esc(Ti.heatmap)}</h3><div class="sub">Companies by main sub-category (product group with most matched products) and ${esc(ax)}. Based on all ${nf(n)} mapped companies.</div><div class="scroll">${heat}</div>${so('heatmap')}</figure>` : ''}
</div></section>`;
  const f = S.findings;
  const sec2 = `<section><h2>${num()}Scale and concentration</h2><div class="grid">
${M.y_title === 'Scale tier' || !(S.tiers_by_stage && S.tiers_by_stage.length) ? '' : `<figure><h3 class="at">${esc(Ti.stacked)}</h3><div class="sub">Scale tier within each ${esc(ax)}, % of the ${esc(ax)}'s companies. Based on all ${nf(n)} mapped companies.</div>${stacked(S)}<figcaption>${esc(S.tiers_by_stage.map((r) => `${r.stage}: ${TIERS.map((t) => `${t} ${r[t].pct}%`).join(', ')}`).join(' · '))}</figcaption>${so('stacked')}</figure>`}
<figure><h3 class="at">${esc(Ti.concentration)}</h3><div class="sub">All ${n} companies, relative scale from website footprint (not revenue)</div>
<div class="big"><div><b class="num">${f.small_pct}%</b><span>Small</span></div><div><b class="num">${S.tiers['Mid-size'].pct}%</b><span>Mid-size</span></div><div><b class="num">${f.large_pct}%</b><span>Large</span></div></div>${concentration(S)}<figcaption>${esc(tiersCap)}. ${esc(S.meta.scale_caption || 'Large = top 25% of companies in the country by website footprint, Small = below the 40th point of the 0-99 scale; relative, not revenue.')}</figcaption>${so('concentration')}</figure>
</div></section>`;
  const showBrands = show(S, 'brands'), showCh = show(S, 'channels'), showReg = show(S, 'region');
  const sec3 = (showCh || showBrands) ? `<section><h2>${num()}${showCh && showBrands ? 'Channels and brands' : showCh ? 'Channels' : 'Brands'}</h2><div class="grid">
${showCh ? `<figure><h3 class="at">${esc(Ti.channels)}</h3><div class="sub">Sales channels the companies name on their own websites (similar wordings grouped)</div>${ranked(S.channels.map((c) => [c.name, c.n, c.lb]), 'companies')}<figcaption>${esc(S.channels.map((c) => `${c.name} ${c.n}${c.lb ? '+' : ''}`).join(' · '))}.${esc(based(S, 'channels', 'a stated channel'))}</figcaption>${so('channels')}</figure>` : ''}
${showBrands ? `<figure><h3 class="at">${esc(Ti.brands)}</h3><div class="sub">Brands named anywhere on these companies' websites; not limited to this product line.</div>${ranked(brands.map((b) => [b.brand, b.companies, b.lb]), 'companies')}<div class="scroll">${brandsTbl}</div><figcaption>${esc(based(S, 'brands', 'a listed brand').trim())}</figcaption>${so('brands')}</figure>` : ''}
</div></section>` : '';
  const sec3b = showReg ? `<section><h2>${num()}Geography</h2><div class="grid"><figure class="wide"><h3 class="at">${esc(Ti.region)}</h3><div class="sub">Main provinces by region; tile width = companies</div>${provinces(S)}<figcaption>${esc(provCap)}.${esc(based(S, 'region', 'a stated region'))}</figcaption>${so('region')}</figure></div></section>` : '';
  let sec4 = '';
  const showC = show(S, 'certifications'), showO = show(S, 'origins');
  if (showC || showO) {
    sec4 = `<section><h2>${num()}Capability and sourcing signals</h2><div class="grid">`;
    for (const [k, f, items, sub, what] of [['certs', 'certifications', S.certifications, 'Companies citing each certification; a company can cite several', 'a certification'], ['origins', 'origins', S.origins, `Companies naming each country as a source${S.meta?.origins_home_excluded ? `; ${S.country} itself left out` : ''}; "+" = at least, a company can name a country in two spellings`, 'a sourcing origin']]) {
      if (f === 'certifications' ? showC : showO) sec4 += `<figure><h3 class="at">${esc(Ti[k])}</h3><div class="sub">${esc(sub)}</div>${ranked(items.map((i) => [i.name, i.n, i.lb]), 'companies')}<figcaption>${esc(items.map((i) => `${i.name} ${i.n}${i.lb ? '+' : ''}`).join(' · '))}.${esc(based(S, f, what))}</figcaption>${so(k)}</figure>`;
    }
    sec4 += '</div></section>';
  }
  const sec5 = !S.top20.length ? '' : `<section><h2>${num()}Leading companies by relative scale</h2><div class="scroll top"><table><tr><th class="n">#</th><th>Company</th><th>${esc(cap1(ax))}</th><th>Region</th><th>Scale</th>${topProd ? `<th>${S.item_noun === 'service' ? 'Services' : 'Products'}</th>` : ''}</tr>${top}</table></div></section>`;
  const impl = C && Array.isArray(C.implications) && C.implications.length
    ? `<section data-slot="implications"><h2>${num()}Implications for a foreign company looking for partners</h2><div class="impl"><ul>${C.implications.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div></section>` : '';
  const sec7 = !S.preview.length ? '' : `<section><h2>${num()}Preview of the Excel list (10 of ${n} rows, contacts hidden)</h2><div class="scroll top"><table><tr><th class="n">Rank</th><th>Company</th><th>${esc(cap1(ax))}</th><th>Sub-category</th><th>Region</th><th>Scale</th><th>${S.item_noun === 'service' ? 'Services' : 'Products'}</th><th>Website</th></tr>${prev}</table></div></section>`;
  const groups = dedupe(S.groups.join(', '));
  const left = (S.left_out_roles || []).length ? ` Companies whose main role is ${esc(S.left_out_roles.join(' or '))} are left out because they serve the ${esc(S.item_noun)} rather than supply it.` : '';
  const regCov = cov(S, 'region');
  const sec8 = `<section><h2>${num()}Scope and method</h2><div class="method">
<div><h3>Definition</h3><p>Companies in ${esc(cn)} whose own website lists at least one specific ${esc(S.item_noun)} in these groups: ${esc(groups)}. ${esc(S.definition_extra || '')}${left}</p></div>
<div><h3>Method and limits</h3><ul><li>Source: company websites read by BizDirect Asia, built ${esc(S.built)}; scale tier is a BizDirect estimate from website footprint, not revenue.</li><li>${esc(cap1(ax))} comes from the company's main ${S.meta?.kind === 'service' ? 'service' : 'role'}${showReg && regCov ? `; region from its stated location (${Math.round(regCov.share_filled * 100)}% of companies state one)` : ''}.</li><li>Only companies BizDirect has read are counted; small or offline-only businesses are under-represented.</li></ul></div></div></section>`;

  return `<main class="mm" id="mm-root" data-slug="${esc(S.meta?.slug || '')}">
<div class="crumb"><a href="${esc(hubPath)}">Market Map</a><i>/</i><a href="${esc(countryPath)}">${esc(cn)}</a><i>/</i>${esc(seg)}</div>
<h1>${esc(cn)} ${esc(lc(seg))}: who is in the market, where they sit and how big they are</h1>
<p class="dek">A company-level map of ${esc(lc(seg))} companies in ${esc(cn)}, compiled from company websites by ${esc(lc(axT))}, region and relative scale. Snapshot ${esc(S.built)}.</p>
<div class="kpis">${kpis}</div>
<div class="take" data-slot="takeaway"><div class="lab">Executive takeaway</div><p>${esc(tk)}</p></div>
${sec1}${sec2}${sec3}${sec3b}${sec4}${sec5}${impl}${sec7}
${buyBox(S, opts)}
${sec8}
<div class="foot"><span>KIRA Research · Know first. Move first.</span><span>Data: BizDirect Asia (bizdirectasia.com) · snapshot ${esc(S.built)}</span></div>
</main>`;
}

// ── document shell: head, JSON-LD, shared chrome (nav.js builds the header and footer) ──
function shell({ title, description, canonical, robots, ld, body, buyScripts = '', researchCss = false }) {
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
${researchCss ? '<link rel="stylesheet" href="/css/research.css">\n' : ''}<style>${researchCss ? MM_HUB_CSS : MM_CSS}</style>
${(ld || []).map((l) => `<script type="application/ld+json" id="${l.id}">${ldJson(l.data)}</script>`).join('\n')}
</head><body>
<!-- nav + footer injected by /js/nav.js -->
${body}
${buyScripts}<script src="/js/nav.js" defer></script>
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
        { '@type': 'ListItem', position: 2, name: 'Market Map', item: hubUrl },
        { '@type': 'ListItem', position: 3, name: S.country, item: `${hubUrl}/${countrySlug(S)}` },
        { '@type': 'ListItem', position: 4, name: S.segment, item: canonical },
      ] } },
  ];
  return shell({ title: mapTitle(S), description: mapDescription(S, !!(opts.buy && opts.buy.enabled)), canonical, robots: opts.robots || 'noindex,follow', ld, body: renderBody(S, C, opts),
    buyScripts: opts.buy && opts.buy.enabled ? '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="/auth.js"></script><script src="/js/market-map-buy.js" defer></script>\n' : '' });
}

// ── hub and country hubs ──
// The hub is a small landing page (country tiles, top industries, a search box, 50 rows a page) laid out like the report
// library (research.css: lib2, fgrp, fopt). It is rendered on the server from query parameters (api/_lib/market-map/hub.js);
// every filter and page is a plain link, so it reads without JavaScript and a crawler can follow it.
export { BANDS };
const EMPTY = {
  en: { h: 'Company lists are being prepared', p: 'The first lists for each country and segment will appear here soon. In the meantime, our research reports are open to read.', a: 'Explore the library →' },
  ja: { h: '企業リストを準備中です', p: '国・セグメント別の最初のリストを近日中に掲載します。それまでは、リサーチレポートをご覧いただけます。', a: 'ライブラリを見る →' },
  ko: { h: '기업 리스트를 준비하고 있습니다', p: '국가·세그먼트별 첫 리스트가 곧 게시됩니다. 그동안 리서치 보고서를 읽어 보실 수 있습니다.', a: '라이브러리 보기 →' },
  zh: { h: '企业名单筹备中', p: '各国家和细分领域的首批名单即将上线。在此期间，欢迎先阅读我们的研究报告。', a: '浏览报告库 →' },
};
const kindTag = (i) => (i.kind === 'service' ? ' <span class="tag">Services</span>' : '');
const crumbLd = (items) => [{ id: 'ld-breadcrumb', data: { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, item], n) => ({ '@type': 'ListItem', position: n + 1, name, item })) } }];

const IC = { food: 'M6 3v7a2 2 0 0 0 4 0V3M8 3v18M16 21V3c-2 1-3.5 3.5-3.5 7 0 2 1 3 3.5 3', store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9c0 1.7 1.3 3 2.7 3S9.3 10.7 9.3 9c0 1.7 1.3 3 2.7 3s2.7-1.3 2.7-3c0 1.7 1.3 3 2.7 3S20 10.7 20 9M10 20v-5h4v5', health: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z', tech: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4', build: 'M5 21V4h9v17M14 9h5v12M3 21h18M8 8h3M8 12h3M8 16h3', truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19.5a1.7 1.7 0 1 0 .01 0M17 19.5a1.7 1.7 0 1 0 .01 0', money: 'M12 3a9 9 0 1 0 .01 0M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1 0-2-.5-2.5-1.5M12 6.5V8M12 16v1.5', school: 'M2 9l10-5 10 5-10 5zM6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6', bed: 'M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 .01 0', factory: 'M3 21V10l6 3V10l6 3V6h3v15zM3 21h18', leaf: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19c2-4 5-7 9-9', spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z', brief: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16', mega: 'M4 10v4h3l8 4V6L7 10zM18 9a4 4 0 0 1 0 6', grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' };
const ICON_RULES = [['food', /food|beverage|drink|restaurant|cafe|coffee|bakery|catering|dining/], ['health', /health|medical|clinic|hospital|pharma|dental|care|wellness/], ['tech', /\bit\b|software|tech|digital|electronic|data|telecom|computer/], ['build', /construction|real estate|property|architect|engineering|building/], ['truck', /freight|logistic|transport|shipping|delivery|warehouse|automotive|vehicle|car /], ['money', /financ|bank|insurance|invest|account|loan|leasing/], ['school', /educat|school|training|tutor|learning/], ['bed', /hotel|travel|tour|hospitality|accommodation/], ['factory', /manufactur|industrial|machinery|equipment|metal|chemical|plastic|packaging|material/], ['leaf', /agri|farm|forest|fish|energy|solar|environment|waste|recycl|water/], ['spark', /beauty|cosmetic|salon|spa|fashion|apparel|clothing|textile|art |creative|design|cleaning|personal/], ['mega', /advertis|marketing|media|publish|print|event|public relations/], ['brief', /consult|legal|law|business|service|advisory|recruit|staffing/], ['store', /retail|wholesale|shop|store|trading|trade|supermarket|furniture|home|household/]];
const iconOf = (i) => { const t = `${i.l2_family || ''} ${i.title} `.toLowerCase(); const r = ICON_RULES.find(([, re]) => re.test(t)); return r ? r[0] : 'grid'; };
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${Object.entries(IC).map(([k, d]) => `<symbol id="i-${k}" viewBox="0 0 24 24"><path d="${d}"/></symbol>`).join('')}</svg>`;
const SEARCH_IC = '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>';
const HOME_IC = '<svg class="ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7M6 9.5V20h12V9.5"/></svg>';
// Library-style breadcrumb: home icon, then [label, href?] steps (the last one is plain text).
const crumbs = (steps) => `<nav class="r-crumbs" aria-label="Breadcrumb"><a href="/en/" aria-label="Home">${HOME_IC}</a>${steps.map(([t, h]) => `<span class="sep">&rsaquo;</span>${h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`}`).join('')}</nav>`;

function pager(m, p) {
  if (m.pages < 2) return '';
  const at = (n) => hubHref(p, { page: n });
  const nums = [...new Set([1, m.page - 2, m.page - 1, m.page, m.page + 1, m.page + 2, m.pages])].filter((n) => n >= 1 && n <= m.pages).sort((a, b) => a - b);
  let last = 0, mid = '';
  for (const n of nums) { if (n - last > 1) mid += '<span class="gap">…</span>'; mid += n === m.page ? `<span class="cur" aria-current="page">${n}</span>` : `<a href="${esc(at(n))}">${n}</a>`; last = n; }
  return `<nav class="pager" aria-label="Pages">${m.page > 1 ? `<a rel="prev" href="${esc(at(m.page - 1))}">← Previous</a>` : '<span class="off">← Previous</span>'}<span class="nums">${mid}</span>${m.page < m.pages ? `<a rel="next" href="${esc(at(m.page + 1))}">Next →</a>` : '<span class="off">Next →</span>'}</nav>`;
}

// model: hubModel() of api/_lib/market-map/hub.js; params: parseParams(); items may carry phone_pct / email_pct.
export function renderHub(model, params, opts = {}) {
  const p = params || {};
  const m = model;
  const loc = ['en', 'ja', 'ko', 'zh'].includes(opts.loc) ? opts.loc : 'en';
  const E = EMPTY[loc];
  const filtered = isFiltered(p);
  const canonical = opts.canonical || `${BASE}${hubHref(p, { page: m.page })}`;
  const link = (over) => esc(hubHref(p, { page: 1, ...over }));
  const opt = (label, n, on, over, offOver) => `<a class="fopt${on ? ' on' : ''}" href="${link(on ? offOver : over)}"${on ? ' aria-current="true"' : ''}><input type="checkbox" tabindex="-1" aria-hidden="true"${on ? ' checked' : ''}><span class="lbl">${esc(label)}</span><span class="n">${n}</span></a>`;
  const grp = (k, label, body) => (body ? `<div class="fgrp" data-group="${k}"><div class="fgrp-head">${esc(label)}</div><div class="fgrp-body">${body}</div></div>` : '');
  const F = m.facets;
  const filterHtml = [
    grp('country', 'Country', F.countries.map((c) => opt(c.name, c.n, p.country === c.slug, { country: c.slug }, { country: '' })).join('')),
    grp('family', 'Industry', F.industries.map((c) => opt(c.name, c.n, p.industry === c.name, { industry: c.name }, { industry: '' })).join('')),
    grp('kind', 'Goods or services', F.kinds.map((c) => opt(c.name, c.n, p.kind === c.key, { kind: c.key }, { kind: '' })).join('')),
    grp('band', 'Number of companies', F.sizes.map((c) => opt(c.name, c.n, p.size === c.key, { size: c.key }, { size: '' })).join('')),
  ].join('');
  const rows = m.items.map((i) => `<a class="lrow" href="/en/market-maps/${esc(i.slug)}"><div class="mm-ico" aria-hidden="true"><svg><use href="#i-${iconOf(i)}"/></svg></div><div class="lrow-body"><div class="lrow-chips"><span class="chip">${esc(i.l2_family || 'List')}</span>${i.kind === 'service' ? '<span class="chip">Services</span>' : ''}</div><h3>${esc(i.title)}</h3><div class="meta">${[`${nf(i.companies)} companies`, i.phone_pct == null ? '' : `${i.phone_pct}% phone`, i.email_pct == null ? '' : `${i.email_pct}% email`, `$${i.price}`, esc(i.built)].filter(Boolean).join(' · ')}</div></div></a>`).join('');
  const sortBar = m.total > 1 ? `<nav class="mm-sort" aria-label="Sort"><span>Sort</span>${SORTS.map(([k, name]) => `<a href="${link({ sort: k })}"${(p.sort || '') === k ? ' class="on" aria-current="true"' : ''}>${name}</a>`).join('')}</nav>` : '';
  const from = m.total ? (m.page - 1) * m.pageSize + 1 : 0;
  const hidden = ['country', 'industry', 'kind', 'size', 'sort'].filter((k) => p[k]).map((k) => `<input type="hidden" name="${k}" value="${esc(p[k])}">`).join('');
  const band = `<header class="r-band"><div class="r-container">
${crumbs([['MARKET MAP']])}
<h1>Company lists: every company in a segment, by country</h1>
<p class="r-sub">Each list covers the companies of one segment in one country, compiled from company websites. The overview of each list is free; the Excel file with company-level phone and email is $36 up to 500 companies, $57 above.</p>
${m.all ? `<form class="r-search" method="get" action="/en/market-maps#lists" role="search">${hidden}${SEARCH_IC}<input type="search" id="mm-q" name="q" value="${esc(p.q)}" maxlength="60" placeholder="Search segment, country or industry" aria-label="Search company lists"><button type="submit" class="r-btn r-btn-primary">Search</button></form>` : ''}
</div></header>`;
  const body = `${band}
<main class="mm r-container" id="mm-root">
${m.all ? `${SPRITE}<div class="lib2" id="lists"><aside class="lib2-side" aria-label="Refine by"><details class="mm-fdet" open><summary class="lib2-side-head"><h2>Refine by</h2>${filtered ? `<a class="r-link" href="/en/market-maps#lists">Clear all</a>` : ''}</summary><div class="lib2-filters">${filterHtml}</div></details></aside>
<section class="lib2-main"><div class="lib2-bar"><div class="lib2-count" id="mm-count">${m.total ? `<strong>${nf(m.total)} lists</strong> <span class="pg">(${nf(from)}-${nf(from + m.items.length - 1)}, ${esc((SORTS.find((x) => x[0] === p.sort) || SORTS[0])[2])})</span>` : '<strong>0 lists</strong>'}</div>${sortBar}</div>
${m.total ? `<div class="lib2-rows" id="mm-table">${rows}</div>${pager(m, p)}` : '<div class="r-empty" id="mm-none"><h3>No list matches these filters</h3><p>Try removing a filter or searching for another segment.</p><div class="acts"><a class="r-btn r-btn-primary" href="/en/market-maps#lists">Clear filters</a></div></div>'}</section></div>
<nav class="mm-bycountry" aria-label="Browse by country"><b>Browse by country</b>${m.countries.map((c) => `<a href="/en/market-maps/${esc(c.slug)}">${esc(c.name)}</a>`).join('')}</nav>
<script>if(window.matchMedia&&matchMedia("(max-width:960px)").matches){var d=document.querySelector(".mm-fdet");if(d)d.open=false}</script>`
  : `<div class="mm-empty" style="margin-top:24px;padding:28px 24px;border:1px solid var(--border,#e5e7eb);border-radius:12px;max-width:640px"><p style="margin:0 0 8px;font-size:20px;font-weight:600">${esc(E.h)}</p><p class="dek" style="margin:0 0 16px">${esc(E.p)}</p><a href="/${loc}/library" style="font-weight:600">${esc(E.a)}</a></div>`}
<div class="foot"><span>KIRA Research · Know first. Move first.</span><span>Data: BizDirect Asia (bizdirectasia.com)</span></div>
</main>`;
  const ld = crumbLd([['Kira Research', `${BASE}/`], ['Market Map', `${BASE}/en/market-maps`]]);
  const title = `Company lists by country and segment${m.page > 1 ? ` (page ${m.page})` : ''} | KIRA Research`;
  return shell({ title, description: 'Company lists for segments across Asia-Pacific markets: who is in the market, where they sit and how big they are. Free overview, Excel list for sale.', canonical, robots: opts.robots || 'noindex,follow', ld, body, researchCss: true });
}

// model: countryModel() of hub.js. Every map of the country as a plain link, grouped by industry family.
export function renderCountryHub(c, opts = {}) {
  // goods and services lists can share a title: the kind tag shows only where it tells two lists apart
  const seen = new Set(), dup = new Set();
  for (const i of c.items) { const t = i.title.toLowerCase(); if (seen.has(t)) dup.add(t); seen.add(t); }
  const canonical = opts.canonical || `${BASE}/en/market-maps/${c.slug}`;
  const gid = (n) => `f${n + 1}`;
  const groups = c.groups.map((g, n) => `<section class="fam" id="${gid(n)}"><h2>${esc(g.name)} <i>${g.items.length} ${g.items.length === 1 ? 'list' : 'lists'}</i></h2><ul class="mmlist">${g.items.map((i) =>
    `<li><a href="/en/market-maps/${esc(i.slug)}">${esc(i.title)}</a>${dup.has(i.title.toLowerCase()) ? kindTag(i) : ''} <span class="k">${nf(i.companies)} companies</span></li>`).join('')}</ul></section>`).join('');
  const side = c.groups.map((g, n) => `<a class="fopt" href="#${gid(n)}"><span class="lbl">${esc(g.name)}</span><span class="n">${g.items.length}</span></a>`).join('');
  const body = `<header class="r-band"><div class="r-container">
${crumbs([['MARKET MAP', '/en/market-maps'], [c.name]])}
<h1>${esc(c.name)} company lists: ${nf(c.items.length)} segments mapped</h1>
<p class="r-sub">${nf(c.companies)} company entries across ${nf(c.items.length)} segments in ${esc(c.name)}, compiled from company websites. Open a segment for its free overview; the Excel list with company-level phone and email is $36 up to 500 companies, $57 above.</p>
<form class="r-search" method="get" action="/en/market-maps#lists" role="search"><input type="hidden" name="country" value="${esc(c.slug)}">${SEARCH_IC}<input type="search" name="q" maxlength="60" placeholder="Search ${esc(c.name)} segments" aria-label="Search ${esc(c.name)} company lists"><button type="submit" class="r-btn r-btn-primary">Search</button></form>
</div></header>
<main class="mm r-container" id="mm-root">
<div class="lib2"><aside class="lib2-side" aria-label="Industries"><details class="mm-fdet" open><summary class="lib2-side-head"><h2>Industries</h2></summary><div class="lib2-filters"><div class="fgrp"><div class="fgrp-body">${side}</div></div></div></details></aside>
<section class="lib2-main"><div class="lib2-bar"><div class="lib2-count"><strong>${nf(c.items.length)} lists</strong> <span class="pg">(grouped by industry)</span></div></div>
${groups}
<p class="k" style="margin-top:24px"><a href="/en/market-maps?country=${esc(c.slug)}#lists">Filter ${esc(c.name)} lists by size and type</a> · <a href="/en/market-maps">All countries</a></p></section></div>
<script>if(window.matchMedia&&matchMedia("(max-width:960px)").matches){var d=document.querySelector(".mm-fdet");if(d)d.open=false}</script>
<div class="foot"><span>KIRA Research · Know first. Move first.</span><span>Data: BizDirect Asia (bizdirectasia.com)</span></div>
</main>`;
  const ld = crumbLd([['Kira Research', `${BASE}/`], ['Market Map', `${BASE}/en/market-maps`], [c.name, canonical]]);
  return shell({ title: `${c.name} company lists by segment | KIRA Research`, description: `${nf(c.items.length)} company lists for ${c.name}, grouped by industry: who is in each segment, where they sit and how big they are. Free overview, Excel list for sale.`, canonical, robots: opts.robots || 'noindex,follow', ld, body, researchCss: true });
}
