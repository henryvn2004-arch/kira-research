#!/usr/bin/env node
// One-off: write <slug>-sm.jpg (228x304) next to every report's -thumb.jpg in the
// public `covers` bucket, so the library list stops loading 360x480 images for 64-76px slots.
// New covers get it from upload-cover.mjs. Safe to re-run. Env: SUPABASE_URL, SUPABASE_SERVICE_KEY.
import sharp from 'sharp';
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL_ || !KEY) { console.error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing'); process.exit(3); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const rows = await (await fetch(`${URL_}/rest/v1/living_reports?select=slug,cover_thumb_url&cover_thumb_url=not.is.null&limit=1000`, { headers: H })).json();
let ok = 0, bad = 0;
for (const r of rows) {
  try {
    const m = /\/covers\/(reports\/[^?]+)-thumb\.jpg/.exec(r.cover_thumb_url);
    if (!m) throw new Error('unexpected url');
    const src = await fetch(r.cover_thumb_url);
    if (!src.ok) throw new Error('thumb ' + src.status);
    const sm = await sharp(Buffer.from(await src.arrayBuffer())).resize(228, 304).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    const up = await fetch(`${URL_}/storage/v1/object/covers/${m[1]}-sm.jpg`, {
      method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' }, body: sm });
    if (!up.ok) throw new Error('upload ' + up.status + ' ' + await up.text());
    ok++;
  } catch (e) { bad++; console.log('FAIL', r.slug, String(e.message || e)); }
}
console.log(JSON.stringify({ reports: rows.length, ok, bad }));
