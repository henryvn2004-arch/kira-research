// Kira Data adapter: ASEANstats (data.aseanstats.org), FDI inflows to each ASEAN member by source country, annual,
// US$ million (BPM6, net). The data portal's dashboards call POST /api/trade (no key); fdiType / Unit 115 = "FDI by
// hosts and source countries, inward". Vietnam does not report by source (every value "n.a"), so it yields nothing.
// Terms (aseanstats.org/terms-and-conditions-of-use): material may be reproduced provided ASEANstats is credited.
//   flows: reporter = host, partner = source (ISO2), product FDI_NET, flow M, freq A, USD.
import { sleep } from './util.js';

const API = 'https://data.aseanstats.org/api/trade';
const HOSTS = ['VN', 'ID', 'TH', 'MY', 'PH', 'SG', 'KH', 'LA', 'MM', 'BN'];
const SOURCES = ['JP', 'KR', 'TW', 'CN', 'HK', 'US', 'SG', 'MY', 'TH', 'ID', 'VN', 'PH', 'AU', 'NZ', 'IN', 'GB', 'DE', 'NL', 'FR', 'CH'];
const FIRST = 2012;

async function post(body) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(API, {
        method: 'POST',
        // No custom User-Agent: the site's firewall rejects unknown agent strings (tested 2026-10-15); Node's default passes.
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body).toString(),
        signal: AbortSignal.timeout(30000)
      });
      if (!r.ok) throw new Error(`ASEANstats ${r.status}`);
      const text = await r.text();
      // The host's firewall answers some data-centre addresses with a captcha page instead of JSON.
      if (/sgcaptcha/.test(text)) throw new Error('ASEANstats: blocked by the site firewall (captcha)');
      return JSON.parse(text);
    } catch (err) {
      last = err;
      await sleep(2000 * (i + 1));
    }
  }
  throw last;
}

export async function flows() {
  const years = [];
  for (let y = FIRST; y <= new Date().getUTCFullYear(); y++) years.push(y);
  const out = [];
  for (const host of HOSTS) {
    const body = await post({ Reporter: host, Partner: SOURCES.filter((s) => s !== host).join(','), Year: years.join(','),
      Frequency: 'A', Period: '00', Flow: 'F', Commodity: '1', CommodityCode: 'ALL', Unit: '115' });
    if (!body || !Array.isArray(body.Trade)) throw new Error(`ASEANstats ${host}: unexpected reply`);
    for (const t of body.Trade) {
      const v = Number(t.Value);
      if (t.Value === null || t.Value === '' || !Number.isFinite(v) || t.HostCountryCode !== host) continue;
      out.push({ source_key: 'aseanstats', reporter: host, partner: t.SourceCountryCode, product: 'FDI_NET', flow: 'M',
        freq: 'A', period: String(t.Year), value: v * 1e6, currency: 'USD' });
    }
    await sleep(500);
  }
  return out;
}
