#!/usr/bin/env node
// Generate the cover illustration for one report with the OpenAI Images API.
//
// Usage:
//   OPENAI_API_KEY=... node skills/kira-research-report/scripts/gen-cover.mjs \
//     --id 2026-ph-fmcg --country "Philippines" --industry "FMCG" \
//     --angle "sari-sari store modernisation and modern-trade ceiling" \
//     --out skills/kira-research-report/outputs/batch/2026-ph-fmcg/cover.jpg \
//     [--style flat_editorial] [--dry-run]
//
// The style rotates across reports (stable hash of --id) unless --style is set.
// Prints one JSON line {ok, style, model, out, prompt}. Exit 3 = no key / API
// failure: the caller keeps the cover without an illustration (cover--plain).
// Env: OPENAI_API_KEY (required), OPENAI_IMAGE_MODEL (default gpt-image-1),
//      OPENAI_IMAGE_QUALITY (low | medium | high, default high).
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d = null) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = k => process.argv.includes('--' + k);
const id = arg('id'), country = arg('country'), industry = arg('industry'), angle = arg('angle', ''), out = arg('out');
if (!id || !country || !industry || !out) {
  console.error('usage: gen-cover.mjs --id <id> --country <name> --industry <name> [--angle <text>] --out <file.jpg> [--style <id>] [--dry-run]');
  process.exit(2);
}

// House palette shared by every style so covers sit with the KIRA design system.
const PALETTE = 'Colour palette restricted to KIRA blue (#1E6FFF), soft sky blues, pale blue-grey, deep navy (#0B0D10) accents and lots of white.';
const STYLES = {
  flat_editorial: 'Clean flat vector editorial illustration with soft gradients and gentle shadows, like a modern consulting-report cover; calm, optimistic, detailed but uncluttered.',
  isometric: 'Crisp isometric 3D illustration of a miniature diorama, soft studio lighting, matte materials, slight depth of field.',
  line_wash: 'Fine ink line drawing with flat blue watercolour washes, architectural-sketch feel, generous white paper.',
  paper_cut: 'Layered paper-cut diorama in shades of blue and white, soft drop shadows between layers, tactile and elegant.',
  geometric: 'Minimal geometric composition of simple shapes, subtle grid lines and data-like motifs that evoke the industry; Swiss-design restraint.',
};
const names = Object.keys(STYLES);
const hash = [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const style = arg('style') || names[hash % names.length];
if (!STYLES[style]) { console.error('unknown style; one of ' + names.join(', ')); process.exit(2); }

const prompt = [
  `Wide landscape cover illustration for a professional market research report on the ${industry} industry in ${country}${angle ? `, focused on ${angle}` : ''}.`,
  `Show a recognisable, respectful scene of how this industry works in ${country} today (its places, products, people at work, local setting or skyline), not generic stock imagery.`,
  STYLES[style],
  PALETTE,
  'Composition: the scene fills the right two-thirds; the left third fades to plain white empty space (a title will be placed there). Subject never touches the left edge.',
  'Absolutely no text, letters, numbers, signage words, logos, brand names, flags with text or watermarks anywhere in the image. No close-up faces.',
].join(' ');

if (flag('dry-run')) { console.log(JSON.stringify({ ok: true, dry_run: true, style, prompt })); process.exit(0); }
const key = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
if (!key) { console.log(JSON.stringify({ ok: false, error: 'OPENAI_API_KEY missing', style })); process.exit(3); }

try {
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, prompt, n: 1, size: '1536x1024',
      quality: process.env.OPENAI_IMAGE_QUALITY || 'high',
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
  console.log(JSON.stringify({ ok: true, style, model, out, bytes: fs.statSync(out).size, prompt }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e.message || e), style, model }));
  process.exit(3);
}
