// Kira Data (D5): national registries that need a free key (waiting until the owner adds it in Vercel).
//   houjin_bangou (JP, HOUJIN_BANGOU_APP_ID)  corporate number by name, XML reply
//   abn_lookup    (AU, ABN_GUID)              ABN by name, JSONP reply
//   nzbn          (NZ, NZBN_API_KEY)          NZBN by name
// Each search(name, key) → { reg_id, legal_name, status, founded } or null. Reply shapes checked on the first run.
import { sameName } from './names.js';

async function text(url, headers = {}) {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${r.status} ${new URL(url).host}`);
  return r.text();
}
const tag = (xml, t) => { const m = new RegExp(`<${t}>([^<]*)</${t}>`).exec(xml); return m ? m[1] : null; };

export const houjin_bangou = {
  country: 'JP',
  async search(name, key) {
    const xml = await text(`https://api.houjin-bangou.nta.go.jp/4/name?id=${encodeURIComponent(key)}&name=${encodeURIComponent(name)}&type=12&mode=2&close=0`);
    for (const c of xml.split('<corporation>').slice(1)) {
      const n = tag(c, 'name'), en = tag(c, 'enName');
      if (sameName(n, name) || (en && sameName(en, name))) {
        return { reg_id: tag(c, 'corporateNumber'), legal_name: n, status: tag(c, 'closeDate') ? 'closed' : 'active', founded: null };
      }
    }
    return null;
  }
};

export const abn_lookup = {
  country: 'AU',
  async search(name, key) {
    const t = await text(`https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodeURIComponent(name)}&maxResults=10&guid=${encodeURIComponent(key)}`);
    const body = JSON.parse(t.replace(/^[^(]*\(/, '').replace(/\)\s*;?\s*$/, ''));
    const hit = (body.Names || []).find((n) => Number(n.Score) >= 90 && sameName(n.Name, name));
    return hit ? { reg_id: hit.Abn, legal_name: hit.Name, status: hit.AbnStatus || null, founded: null } : null;
  }
};

export const nzbn = {
  country: 'NZ',
  async search(name, key) {
    const t = await text(`https://api.business.govt.nz/gateway/nzbn/v5/entities?search-term=${encodeURIComponent(name)}&page-size=10`, { 'Ocp-Apim-Subscription-Key': key, Accept: 'application/json' });
    const hit = (JSON.parse(t).items || []).find((e) => sameName(e.entityName, name));
    return hit ? { reg_id: hit.nzbn, legal_name: hit.entityName, status: hit.entityStatusDescription || null, founded: (hit.registrationDate || '').slice(0, 10) || null } : null;
  }
};
