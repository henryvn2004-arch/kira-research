// Kira Data (D7): names and links for a "new moves" alert (moves_alerts row: host_country, investor_country, locale).
// The slugs match public/js/data-moves.js (corridor pages exist for these five investors × the 15 markets).

export const INVESTOR_SLUG = { JP: 'japan', KR: 'south-korea', TW: 'taiwan', SG: 'singapore', CN: 'china' };
export const HOST_SLUG = { VN: 'vietnam', TH: 'thailand', ID: 'indonesia', MY: 'malaysia', PH: 'philippines', SG: 'singapore', TW: 'taiwan',
  AU: 'australia', NZ: 'new-zealand', KH: 'cambodia', LA: 'laos', MM: 'myanmar', BN: 'brunei', JP: 'japan', KR: 'south-korea' };

const names = new Intl.DisplayNames(['en'], { type: 'region' });
export const countryName = (code) => { try { return names.of(code) || code; } catch { return code; } };

// "Japan → Vietnam", "All investors → Vietnam", "Japan → all 15 markets".
export function alertLabel(row) {
  const from = row.investor_country ? countryName(row.investor_country) : 'All investors';
  const to = row.host_country ? countryName(row.host_country) : 'all 15 markets';
  return `Company moves: ${from} → ${to}`;
}

// The page an alert is about (no query string when it is a corridor page), with extra query params appended.
export function alertPath(row, params = {}) {
  const loc = row.locale || 'en';
  const inv = row.investor_country, host = row.host_country;
  let path, q = {};
  if (inv && host && INVESTOR_SLUG[inv] && HOST_SLUG[host]) path = `/${loc}/data/${INVESTOR_SLUG[inv]}-in-${HOST_SLUG[host]}`;
  else {
    path = `/${loc}/data/moves`;
    if (host) q.host = host;
    if (inv) q.investor = inv;
  }
  const qs = new URLSearchParams({ ...q, ...params }).toString();
  return qs ? `${path}?${qs}` : path;
}
