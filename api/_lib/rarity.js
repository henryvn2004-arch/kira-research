// Validation for the owner's price "rarity" multiplier (1.0–1.3, step 0.05). Pure, used by api/admin-prices.js.
import { RARITY_MIN, RARITY_MAX } from './pricing.js';

// Returns { ok: true, value } (rounded to 2 decimals) or { ok: false, error }.
export function parseRarity(input) {
  if (input === null || input === undefined || input === '' || typeof input === 'boolean') return { ok: false, error: 'rarity_required' };
  const n = typeof input === 'number' ? input : Number(String(input).trim());
  if (!Number.isFinite(n)) return { ok: false, error: 'rarity_not_a_number' };
  const v = Math.round(n * 100) / 100;
  if (v < RARITY_MIN || v > RARITY_MAX) return { ok: false, error: 'rarity_out_of_range' };
  return { ok: true, value: v };
}
