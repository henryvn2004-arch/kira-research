#!/usr/bin/env node
// Upload one cover illustration (from gen-cover.mjs) to the public `covers`
// bucket and point the report or insight at it (migration 026).
//
//   node skills/kira-research-report/scripts/upload-cover.mjs \
//     --kind report|insight --slug <slug> --in <cover.jpg>
//
// Writes three files: <slug>.jpg (1536 wide), <slug>-thumb.jpg (360x480
// portrait crop for library rows) and <slug>-wide.jpg (800x500 crop for
// insight cards). The art keeps its left third empty for the PDF title, so
// both crops sit on the right of the image. Then sets cover_url and
// cover_thumb_url on living_reports / insights (matched by slug).
// For --kind report it also copies the URLs to insights that list the report
// in related_report_slugs and have no cover of their own.
// Prints one JSON line. Env: SUPABASE_URL, SUPABASE_SERVICE_KEY.
import fs from 'node:fs';
import sharp from 'sharp';

const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const kind = arg('kind'), slug = arg('slug'), input = arg('in');
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!['report', 'insight'].includes(kind) || !slug || !input) {
  console.error('usage: upload-cover.mjs --kind report|insight --slug <slug> --in <cover.jpg>');
  process.exit(2);
}
if (!/^[a-z0-9][a-z0-9-]{1,150}$/.test(slug)) { console.error('bad slug'); process.exit(2); }
if (!URL_ || !KEY) { console.log(JSON.stringify({ ok: false, error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY missing' })); process.exit(3); }

const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const folder = kind === 'report' ? 'reports' : 'insights';
const table = kind === 'report' ? 'living_reports' : 'insights';

async function put(name, buf) {
  const r = await fetch(`${URL_}/storage/v1/object/covers/${folder}/${name}`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' },
    body: buf,
  });
  if (!r.ok) throw new Error(`upload ${name}: ${r.status} ${await r.text()}`);
  return `${URL_}/storage/v1/object/public/covers/${folder}/${name}`;
}
async function patch(path, body) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, {
    method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

try {
  const src = sharp(fs.readFileSync(input));
  const { width: w, height: h } = await src.metadata();
  if (!w || !h) throw new Error('not an image');
  // Crops anchored right of centre: the subject lives in the right two-thirds.
  const tw = Math.round(h * 3 / 4), tx = Math.max(0, Math.min(w - tw, Math.round(w * 0.62 - tw / 2)));
  const ww = Math.min(w, Math.round(w * 0.68)), wh = Math.min(h, Math.round(ww * 5 / 8));
  const full = await src.clone().resize({ width: 1536, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const thumb = await src.clone().extract({ left: tx, top: 0, width: tw, height: h }).resize(360, 480).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  const wide = await src.clone().extract({ left: w - ww, top: Math.round((h - wh) / 2), width: ww, height: wh }).resize(800, 500).jpeg({ quality: 78, mozjpeg: true }).toBuffer();

  const v = `?v=${Date.now().toString(36)}`;
  const cover_url = (await put(`${slug}.jpg`, full)) + v;
  const cover_thumb_url = (await put(`${slug}-thumb.jpg`, thumb)) + v;
  await put(`${slug}-wide.jpg`, wide);

  const rows = await patch(`${table}?slug=eq.${slug}`, { cover_url, cover_thumb_url });
  let insights = 0;
  if (kind === 'report') {
    // Linked insights without art of their own follow the report's cover.
    const own = encodeURIComponent('(cover_url.is.null,cover_url.like.*/covers/reports/*)');
    const linked = await patch(`insights?related_report_slugs=cs.${encodeURIComponent(`{${slug}}`)}&or=${own}`, { cover_url, cover_thumb_url });
    insights = linked.length;
  }
  console.log(JSON.stringify({ ok: true, kind, slug, cover_url, rows: rows.length, insights, bytes: { full: full.length, thumb: thumb.length, wide: wide.length } }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, kind, slug, error: String(e.message || e) }));
  process.exit(3);
}
