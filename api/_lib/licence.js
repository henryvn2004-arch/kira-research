// ============================================================
// KIRA RESEARCH — api/_lib/licence.js
// Licence option at checkout (stage 0, owner 2026-11-27):
//   single  = one reader, the base price
//   team    = up to 10 people in the same company, base x 1.8
//   company = company-wide, base x 2.6
// Rounded to whole dollars, never ending in 9 (9 becomes 8). The price is always computed on the
// server from the item's own base price; the browser only names the licence.
// ============================================================

export const LICENCES = {
  single:  { mult: 1 },
  team:    { mult: 1.8 },
  company: { mult: 2.6 }
};
export const LICENCE_KEYS = Object.keys(LICENCES);

export function normLicence(v) {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(LICENCES, v) ? v : 'single';
}

/** Whole dollar, never ending in 9. */
export function noNine(n) {
  const r = Math.round(n);
  return r % 10 === 9 ? r - 1 : r;
}

/** Base price (number) × licence multiplier. single returns the base unchanged. */
export function licencePrice(base, licence) {
  const l = normLicence(licence);
  if (l === 'single') return Number(base);
  return noNine(Number(base) * LICENCES[l].mult);
}

/** All three prices for the picker: { single, team, company }. */
export function licencePrices(base) {
  return { single: licencePrice(base, 'single'), team: licencePrice(base, 'team'), company: licencePrice(base, 'company') };
}

export const LICENCE_LABEL = {
  single:  'Single user',
  team:    'Team licence (up to 10 people, same company)',
  company: 'Company-wide licence'
};
