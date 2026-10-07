#!/usr/bin/env node
// Generate the cover illustration for one report with the OpenAI Images API.
//
// Usage:
//   OPENAI_API_KEY=... node skills/kira-research-report/scripts/gen-cover.mjs \
//     --id 2026-ph-fmcg --country "Philippines" --industry "FMCG" \
//     --angle "sari-sari store modernisation and modern-trade ceiling" \
//     --out skills/kira-research-report/outputs/batch/2026-ph-fmcg/cover.jpg \
//     [--style flat_editorial] [--layout L1..L9] [--quality high|medium|low] [--dry-run]
//
// The style rotates across reports (stable hash of --id) unless --style is set.
// The cover layout (templates/page_components.html cover_L1 … cover_L9) also
// rotates, on a second hash of --id, so style and layout vary independently;
// each layout asks for its own image shape and composition. Insight images
// pass --layout L1 (landscape, left third empty).
// Prints one JSON line {ok, style, layout, model, out, prompt}. Exit 3 = no key /
// API failure: the caller uses cover_L1 with class "plain" (no illustration).
// Env: OPENAI_API_KEY (required), OPENAI_IMAGE_MODEL (default gpt-image-2),
//      OPENAI_IMAGE_QUALITY (low | medium | high, default high; --quality wins).
// Report covers are printed on the PDF cover: high (~5,500 image tokens).
// Insight images are web-only: medium (~1,400 tokens, about a quarter of the cost).
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes('--' + k);
const id = arg('id'), country = arg('country'), industry = arg('industry'), angle = arg('angle', ''), out = arg('out');
if (!id || !country || !industry || !out) {
  console.error('usage: gen-cover.mjs --id <id> --country <name> --industry <name> [--angle <text>] --out <file.jpg> [--style <id>] [--layout L1..L9] [--dry-run]');
  process.exit(2);
}

// House palette shared by every style so covers sit with the KIRA design system.
const PALETTE = 'Colour palette restricted to KIRA blue (#1E6FFF), soft sky blues, pale blue-grey, deep navy (#0B0D10) accents and lots of white.';
const STYLES = {
  flat_editorial: 'Clean flat vector editorial illustration with soft gradients and gentle shadows, like a modern consulting-report cover; calm, optimistic, detailed but uncluttered.',
  isometric: 'Crisp isometric 3D illustration of a miniature diorama, soft studio lighting, matte materials, slight depth of field.',
  line_wash: 'Fine ink line drawing with flat blue watercolour washes, architectural-sketch feel, generous white paper.',
  paper_cut: 'Layered paper-cut diorama in shades of blue and white, soft drop shadows between layers, tactile and elegant.',
  geometric: 'Not a photograph: abstract flat geometric composition built from circles, arcs, rectangles and thin grid lines, with simplified silhouettes of the industry and skyline made of those shapes; Swiss-poster restraint, no people.',
  aerial_photo: 'High-key editorial aerial photograph from a drone, early-morning soft light, cool blue colour grade, crisp detail, airy and bright, like a premium annual-report photograph.',
  risograph: 'Two-colour risograph print in KIRA blue and navy on off-white paper, visible grain and halftone texture, slight ink overlap, bold simplified shapes.',
  clay_3d: 'Soft 3D clay render of a small stylised scene, rounded forms, pastel blue and white materials, gentle global illumination, playful but polished.',
  blueprint: 'Technical blueprint drawing: precise fine blue linework, dimension-free construction lines and cutaway details on pale blue-white drafting paper; engineering-plate elegance.',
  linocut: 'Linocut relief print in deep blue ink on white paper, bold carved lines and hatching, hand-printed texture, strong silhouettes.',
  midcentury_poster: 'Mid-century travel-poster illustration in gouache, simplified forms, flat blue tonal layers, subtle paper texture, confident graphic composition.',
  low_poly: 'Faceted low-poly 3D illustration, crisp triangular facets in graded blues and white, soft ambient light, clean and modern.',
  tilt_shift_photo: 'Tilt-shift miniature-effect photograph from a high viewpoint, shallow focus band across the scene, bright daylight, cool blue grading, toy-like detail.',
  duotone_photo: 'Editorial documentary photograph rendered as a navy-and-KIRA-blue duotone, rich contrast, fine grain, magazine-feature feel.',
  glass_3d: 'Glossy 3D render of the scene built from frosted glass and soft blue translucent materials, subtle refraction, white studio background, premium tech-report feel.',
};
const names = Object.keys(STYLES);
const hash = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const style = arg('style') || names[hash % names.length];
if (!STYLES[style]) { console.error('unknown style; one of ' + names.join(', ')); process.exit(2); }

// Cover layouts: image shape + where the scene sits (see cover_L1 … cover_L9).
const C_LEFT_EMPTY = 'Composition: the scene fills the right two-thirds; the left third fades to plain white empty space with no objects or people in it (a title will be placed there). Subject never touches the left edge.';
const C_RIGHT_EMPTY = 'Composition: the scene fills the left two-thirds; the right third fades to plain white empty space with no objects or people in it (a title will be placed there). Subject never touches the right edge.';
const C_FULL = 'Composition: full-bleed scene edge to edge across the whole frame; the main subject sits in the upper-middle; the lower quarter is calm (pavement, floor, water, table top or soft wash) so a text band can overlap it.';
const C_SQUARE = 'Composition: square, the scene fills the whole frame edge to edge with the main subject centred.';
const C_PORTRAIT = 'Composition: tall portrait frame, the scene fills the whole frame edge to edge, one upright vertical subject (a building facade, tower, factory, stack of goods or street corner seen upright) centred.';
const WIDE = 'Wide landscape', SQ = 'Square', TALL = 'Tall portrait';
const LAYOUTS = {
  L1: { size: '1536x1024', shape: WIDE, comp: C_LEFT_EMPTY },   // classic: text left, art right
  L2: { size: '1536x1024', shape: WIDE, comp: C_RIGHT_EMPTY },  // mirror: art left, text right
  L3: { size: '1536x1024', shape: WIDE, comp: C_FULL },         // panorama + bottom band
  L4: { size: '1536x1024', shape: WIDE, comp: C_FULL },         // framed banner on top
  L5: { size: '1024x1024', shape: SQ, comp: C_SQUARE },         // navy split
  L6: { size: '1024x1536', shape: TALL, comp: C_PORTRAIT },     // arch window
  L7: { size: '1024x1024', shape: SQ, comp: C_SQUARE },         // full bleed + white card
  L8: { size: '1024x1536', shape: TALL, comp: C_PORTRAIT },     // strip + big outlined year
  L9: { size: '1024x1024', shape: SQ, comp: C_SQUARE },         // circle
};
const lnames = Object.keys(LAYOUTS);
const lhash = [...id].reduce((h, c) => (h * 131 + c.charCodeAt(0) + 17) >>> 0, 2166136261);
const layout = (arg('layout') || lnames[lhash % lnames.length]).toUpperCase();
if (!LAYOUTS[layout]) { console.error('unknown layout; one of ' + lnames.join(', ')); process.exit(2); }
const L = LAYOUTS[layout];

const prompt = [
  `${L.shape} cover illustration for a professional market research report on the ${industry} industry in ${country}${angle ? `, focused on ${angle}` : ''}.`,
  `Show a recognisable, respectful scene of how this industry works in ${country} today (its places, products, people at work, local setting or skyline), not generic stock imagery.`,
  STYLES[style],
  PALETTE,
  L.comp,
  'Absolutely no text, letters, numbers, signage words, logos, brand names, national flags or watermarks anywhere in the image; ships, vehicles, tanks, packages and buildings carry blank surfaces. No close-up faces.',
].join(' ');

if (flag('dry-run')) { console.log(JSON.stringify({ ok: true, dry_run: true, style, layout, size: L.size, prompt })); process.exit(0); }
const key = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
if (!key) { console.log(JSON.stringify({ ok: false, error: 'OPENAI_API_KEY missing', style, layout })); process.exit(3); }

try {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, prompt, n: 1, size: L.size,
      quality: arg('quality') || process.env.OPENAI_IMAGE_QUALITY || 'high',
      output_format: 'jpeg', output_compression: 85,
    }),
  });
  const j = await r.json();
  const b64 = j?.data?.[0]?.b64_json;
  if (!r.ok || !b64) throw new Error(`HTTP ${r.status}: ${j?.error?.message || 'no image returned'}`);
  // Only ever write a real JPEG of sane size to the requested .jpg path.
  const img = Buffer.from(b64, 'base64');
  const isJpeg = img.length > 3 && img[0] === 0xff && img[1] === 0xd8 && img[2] === 0xff;
  if (!isJpeg || img.length > 8 * 1024 * 1024) throw new Error('API did not return a JPEG under 8 MB');
  if (!/\.jpe?g$/i.test(out)) throw new Error('--out must end in .jpg');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, img);
  // Cost metering: record the API's token counts against the queue row (report id = queue id).
  // Best effort: insight covers have no queue row (the foreign key rejects them) and a logging
  // failure must never lose a finished cover.
  if (j.usage && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/report_queue_events`, {
        method: 'POST',
        headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ queue_id: arg('id'), stage: 'cover', outcome: 'usage', model, usage: { service: 'openai-image', quality: arg('quality') || process.env.OPENAI_IMAGE_QUALITY || 'high', input_tokens: j.usage.input_tokens ?? null, output_tokens: j.usage.output_tokens ?? null, total_tokens: j.usage.total_tokens ?? null } }),
        signal: AbortSignal.timeout(5000),
      });
    } catch { /* metering is optional */ }
  }
  console.log(JSON.stringify({ ok: true, style, layout, model, out, bytes: fs.statSync(out).size, usage: j.usage || null, prompt }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e), style, layout, model }));
  process.exit(3);
}
