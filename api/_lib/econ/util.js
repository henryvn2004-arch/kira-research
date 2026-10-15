// Shared helpers for the Kira Data adapters (api/_lib/econ/*).
// KIRA country code → ISO3 used by the World Bank and the IMF.
export const ISO3 = {
  VN: 'VNM', ID: 'IDN', TH: 'THA', MY: 'MYS', PH: 'PHL', SG: 'SGP', TW: 'TWN', AU: 'AUS',
  NZ: 'NZL', KH: 'KHM', LA: 'LAO', MM: 'MMR', BN: 'BRN', JP: 'JPN', KR: 'KOR'
};
export const FROM_ISO3 = Object.fromEntries(Object.entries(ISO3).map(([k, v]) => [v, k]));
export const FIRST_YEAR = 2000;

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// GET (or POST with `body`) returning JSON, with up to 3 tries. `headers` are added to the defaults.
export async function getJson(url, { tries = 3, headers = {}, body = null } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers: { Accept: 'application/json', 'User-Agent': 'KIRA Research data refresh (kiraresearch.com)', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (err) {
      last = err;
      await new Promise((res) => setTimeout(res, 1500 * (i + 1)));
    }
  }
  throw last;
}
