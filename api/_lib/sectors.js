// Library sector groups: the ~30 report industry codes (living_reports.industry_code,
// docs/naming_convention.md) folded into 12 groups for the library filter.
// Labels per locale live in public/js/research-i18n.js (sector_<key>).
export const SECTORS = {
  food:       ['FNB', 'AGR', 'FSV'],               // food, beverage & agriculture
  consumer:   ['RTL', 'CPG', 'ECM', 'BTY'],        // consumer & retail
  finance:    ['FIN', 'BNK', 'INS', 'WLT', 'CAP'], // financial services
  tech:       ['SFT', 'DCT', 'SEM', 'MED'],        // technology, media & telecom
  health:     ['HLT', 'MDV', 'PHA', 'CAR'],        // healthcare & life sciences
  property:   ['RES', 'CON'],                      // real estate & construction
  auto:       ['AUT'],                             // automotive & mobility
  logistics:  ['LOG', 'AVI'],                      // transport & logistics
  energy:     ['ENR', 'MIN', 'CHM'],               // energy & resources
  industrial: ['MFG'],                             // industrials & manufacturing
  travel:     ['TRV'],                             // tourism & hospitality
  services:   ['EDU', 'PRO']                       // education & professional services
};

const BY_CODE = Object.fromEntries(Object.entries(SECTORS).flatMap(([k, codes]) => codes.map(c => [c, k])));

export function sectorOf(industryCode) {
  return BY_CODE[String(industryCode || '').toUpperCase()] || null;
}
