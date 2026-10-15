// Kira Data (D5) adapter: ACRA entities with a Unique Entity Number, on data.gov.sg (no key, Singapore Open Data
// Licence). search(name) finds a company's UEN; newSince(days) lists companies registered in the last days.
import { getJson } from '../econ/util.js';
import { sameName } from './names.js';

const API = 'https://data.gov.sg/api/action/datastore_search';
const RESOURCE = 'd_3f960c10fed6145404ca7b821f263b87';
const COMPANY = /company/i;   // Local Company, Foreign Company; not sole proprietorships or partnerships

export async function search(name) {
  // A plain q ranks any word; a q on the name column matches the name's words.
  const q = JSON.stringify({ entity_name: String(name).replace(/[^\p{L}\p{N}& .-]+/gu, ' ').trim() });
  const body = await getJson(`${API}?${new URLSearchParams({ resource_id: RESOURCE, q, limit: '20' }).toString()}`);
  const recs = (body && body.result && body.result.records) || [];
  const hit = recs.find((r) => COMPANY.test(r.entity_type_desc || '') && /registered|live/i.test(r.uen_status_desc || '') && sameName(r.entity_name, name));
  return hit ? { reg_id: hit.uen, legal_name: hit.entity_name, status: hit.uen_status_desc, founded: hit.uen_issue_date || null, entity_type: hit.entity_type_desc } : null;
}

// The dataset is refreshed a few days behind, so look back 14 days (company_events.url dedupes repeats).
export async function newSince(days = 14) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const body = await getJson(`${API}?${new URLSearchParams({ resource_id: RESOURCE, filters: JSON.stringify({ uen_issue_date: day }), limit: '2000' }).toString()}`);
    for (const r of (body && body.result && body.result.records) || []) {
      if (COMPANY.test(r.entity_type_desc || '') && r.issuance_agency_desc === 'ACRA') out.push({ uen: r.uen, name: r.entity_name, type: r.entity_type_desc, date: r.uen_issue_date });
    }
  }
  return out;
}
