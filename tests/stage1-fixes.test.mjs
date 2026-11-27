// Stage 1 fixes: withdrawal waiver in the PayPal custom_id, localized terms/privacy pages, no hard-coded prices in public copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildCustomId, parseCustomId } from '../api/_lib/paypal-check.js';

const UID = '123e4567-e89b-12d3-a456-426614174000';

test('custom_id carries the withdrawal waiver and stays backward compatible', () => {
  const old = buildCustomId('report', 's-1', 'en', UID);
  assert.deepEqual(parseCustomId('report', old), { item: 's-1', locale: 'en', userId: UID, licence: 'single' });
  const w = buildCustomId('report', 's-1', 'en', UID, 'single', true);
  assert.equal(parseCustomId('report', w).waiver, true);
  assert.equal(parseCustomId('report', w).licence, 'single');
  const t = buildCustomId('list', 'vn/coffee', 'ja', UID, 'team', true);
  assert.equal(parseCustomId('list', t).licence, 'team');
  assert.equal(parseCustomId('list', t).waiver, true);
  assert.equal(parseCustomId('list', buildCustomId('list', 'x', 'en', UID, 'company')).waiver, undefined);
});

test('create endpoints refuse an order without the consent tick', () => {
  for (const f of ['library-buy', 'transcript-buy', 'list-buy']) {
    const src = readFileSync(new URL(`../api/${f}.js`, import.meta.url), 'utf8');
    assert.match(src, /body\.consent !== true/, f);
    assert.match(src, /withdrawal_waiver: !!cap\.parsed\.waiver/, f);
  }
});

test('JA/KO/ZH terms and privacy exist, with the refund anchor and the English-prevails line', () => {
  const prevail = { ja: '英語版が優先', ko: '영어 버전이 우선', zh: '以英文版为准' };
  for (const loc of ['ja', 'ko', 'zh']) {
    const terms = readFileSync(new URL(`../public/${loc}/terms.html`, import.meta.url), 'utf8');
    assert.match(terms, new RegExp(`<html lang="${loc}">`));
    assert.match(terms, /id="refunds"/);
    assert.match(terms, /hello@kiraresearch\.com/);
    assert.ok(terms.includes(prevail[loc]), loc);
    const priv = readFileSync(new URL(`../public/${loc}/privacy.html`, import.meta.url), 'utf8');
    assert.ok(priv.includes(prevail[loc]), loc);
  }
  const vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  assert.doesNotMatch(vercel, /"source": "\/(ja|ko|zh)\/(terms|privacy)"/);
});

test('buy copy: refund line + terms link + required withdrawal tick in every language', () => {
  const src = readFileSync(new URL('../public/js/buy-copy.js', import.meta.url), 'utf8');
  assert.match(src, /class="kc-waiver"/);
  assert.match(src, /\/terms#refunds/);
  for (const loc of ['en', 'ja', 'ko', 'zh']) assert.match(src, new RegExp(`\\n    ${loc}: \\{`));
  const mm = readFileSync(new URL('../api/_lib/market-map/render.js', import.meta.url), 'utf8');
  assert.match(mm, /kc-waiver/);
});

test('public copy has no hard-coded prices (they come from the price data)', () => {
  const skip = /(vendor|subscription\.html|[\\/]admin[\\/]|studio|chain-data)/;
  const re = /(US\$|\$ ?)(14|18|28|29|31|36|38|39|45|49|57|78|99|149|299|1,?190)\b/;
  const bad = [];
  const walk = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (skip.test(p)) continue;
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(html|js|json)$/.test(n)) continue;
      readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (re.test(l)) bad.push(`${p}:${i + 1}`); });
    }
  };
  walk(new URL('../public', import.meta.url).pathname);
  assert.deepEqual(bad, []);
});

test('toc rows follow the curated free pages (viewer script)', () => {
  const v = readFileSync(new URL('../public/en/reports/_view.html', import.meta.url), 'utf8');
  assert.match(v, /function syncTocFlags/);
  assert.match(v, /syncTocFlags\(meta\.free\)/);
  assert.ok(existsSync(new URL('../supabase/migrations/081_fixes_stage1.sql', import.meta.url)));
});
