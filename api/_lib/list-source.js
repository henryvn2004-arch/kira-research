// ============================================================
// KIRA RESEARCH — api/_lib/list-source.js
// Adapter to the BizDirect partner API (/api/partner/kira/segments/*) that builds the paid list of a market map
// (company-level phone and email, no named persons). Spec: bizdirectasia/docs/kira_segments_api.md.
//
//   buildList({ orderId, definition, nCompanies? }) -> { bytes, csv, filename, contentType, rows, sha256, expiresAt }
//   previewList(definition) -> { n, rows[] }      countList(definition) -> stats of one segment
//   listGroups(page?)       -> { groups[] }       (read-only catalogue)
//
// Env (Vercel Production): KIRA_PACKS_TOKEN, KIRA_PACKS_SECRET, BIZDIRECT_PACKS_URL. Any missing -> Error
// 'list source not configured' (the purchase then stays pending/failed and can be retried). Values are never logged.
// Every call carries the bearer token; /build also carries X-Kira-Timestamp + X-Kira-Signature
// (sha256=HMAC(secret, "<unix seconds>.<raw body>")), re-signed on each retry with the SAME body and order id, so a retry
// is idempotent on the BizDirect side (same order + same segment returns the stored file).
// The file is CSV (UTF-8 BOM, a '# Source' line first, phone_type column). It is also converted to .xlsx with the
// `xlsx` package already in package.json; the caller stores both.
// ============================================================
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';

const BUILD_TIMEOUT_MS = 180000;   // BizDirect measured 42 s for 28,016 rows, worst case ~135 s with the MX check (2026-11-23); route maxDuration 300 s
const CALL_TIMEOUT_MS = 30000;
const FILE_TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 4;
const ORDER_RE = /^[A-Za-z0-9_.:-]{3,120}$/;
// BizDirect cuts a build at this many rows (docs/kira_segments_api.md, D). It raises it later; the env value follows it.
const rowCap = () => Number(process.env.KIRA_LIST_ROW_CAP) || 40000; // BizDirect per-order cap (LMC v164, 2026-11-23)

export class ListSourceError extends Error {
  constructor(message, { code = 'list_source_error', status = null, retryable = false } = {}) {
    super(message);
    this.name = 'ListSourceError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

// Test hook: lets the unit tests replace the clock and the sleep without real waiting.
export const _io = { sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now() };

function config() {
  const token = process.env.KIRA_PACKS_TOKEN, secret = process.env.KIRA_PACKS_SECRET, base = process.env.BIZDIRECT_PACKS_URL;
  if (!token || !secret || !base) throw new ListSourceError('list source not configured', { code: 'not_configured' });
  let origin;
  try { origin = new URL(base).origin; } catch (_e) { throw new ListSourceError('list source not configured', { code: 'not_configured' }); }
  return { token, secret, origin };
}

export function sign(secret, timestamp, body) {
  return 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

const errMessage = (json) => (json && json.error && (json.error.message || json.error.code)) || '';

// One HTTP call with timeout; retries on network errors, 5xx, 429 and 409 in_progress (backoff 1s, 2s, 4s, Retry-After wins).
async function call(cfg, path, { method = 'GET', body = null, signed = false, timeoutMs = CALL_TIMEOUT_MS } = {}) {
  const raw = body == null ? null : JSON.stringify(body);
  let last;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const headers = { Authorization: `Bearer ${cfg.token}`, Accept: 'application/json' };
    if (raw != null) headers['Content-Type'] = 'application/json';
    if (signed) {
      const ts = String(Math.floor(_io.now() / 1000));
      headers['X-Kira-Timestamp'] = ts;
      headers['X-Kira-Signature'] = sign(cfg.secret, ts, raw || '');
    }
    let res = null, json = null;
    try {
      res = await fetch(cfg.origin + path, { method, headers, body: raw ?? undefined, signal: AbortSignal.timeout(timeoutMs) });
      json = await res.json().catch(() => null);
    } catch (e) {
      last = new ListSourceError('list source unreachable: ' + (e.name || 'error'), { code: 'network', retryable: true });
    }
    if (res) {
      if (res.ok) return json || {};
      const code = (json && json.error && json.error.code) || '';
      const msg = errMessage(json);
      const status = res.status;
      if (status === 401 || status === 403) throw new ListSourceError('list source rejected our credentials', { code: 'auth', status });
      if (status === 503 && /not configured/i.test(msg)) throw new ListSourceError('list source not configured', { code: 'not_configured', status });
      const transient = status >= 500 || status === 429 || (status === 409 && code === 'in_progress');
      if (!transient) {
        // 422 bad_segment / unknown_groups, 409 order_conflict, 410 expired, a row-cap refusal: retrying cannot help.
        const isCap = /cap|too[_ ]many[_ ]rows|too[_ ]large|row limit|max.?rows/i.test(code + ' ' + msg);
        throw new ListSourceError(`list source refused (${status} ${code || 'error'}): ${msg}`.slice(0, 280), { code: isCap ? 'row_cap' : (code || 'refused'), status });
      }
      last = new ListSourceError(`list source busy (${status} ${code})`, { code: status === 429 ? 'rate_limited' : (code || 'unavailable'), status, retryable: true });
      const ra = Number(res.headers.get('retry-after'));
      if (attempt < MAX_ATTEMPTS) { await _io.sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 30) * 1000 : 1000 * 2 ** (attempt - 1)); continue; }
      break;
    }
    if (attempt < MAX_ATTEMPTS) await _io.sleep(1000 * 2 ** (attempt - 1));
  }
  throw last;
}

function checkDefinition(def) {
  if (!def || typeof def !== 'object' || typeof def.country !== 'string' || !Array.isArray(def.group_keys) || !def.group_keys.length) {
    throw new ListSourceError('segment definition missing for this list', { code: 'no_definition' });
  }
  return def;
}

export async function countList(definition) {
  const cfg = config();
  checkDefinition(definition);
  const out = await call(cfg, '/api/partner/kira/segments/count', { method: 'POST', body: { segments: [{ id: 'one', ...definition }] } });
  const s = (out.segments || [])[0];
  if (!s || s.error) throw new ListSourceError('count failed: ' + (s && s.error || 'no result'), { code: 'count_failed' });
  return s;
}

export async function previewList(definition) {
  const cfg = config();
  checkDefinition(definition);
  return call(cfg, '/api/partner/kira/segments/preview', { method: 'POST', body: { segment: definition } });
}

export async function listGroups(page = 1) {
  const cfg = config();
  return call(cfg, `/api/partner/kira/segments/groups?page=${Math.max(1, Math.floor(page) || 1)}`);
}

// The download link must stay on BizDirect's host: we never send the bearer there, and never follow another origin.
async function fetchFile(cfg, downloadUrl) {
  let url;
  try { url = new URL(downloadUrl, cfg.origin); } catch (_e) { throw new ListSourceError('bad download link from list source', { code: 'bad_link' }); }
  if (url.origin !== cfg.origin) throw new ListSourceError('download link points to another host', { code: 'bad_link' });
  let last;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url.href, { signal: AbortSignal.timeout(FILE_TIMEOUT_MS) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (res.status < 500 && res.status !== 429) throw new ListSourceError(`file download refused (${res.status})`, { code: 'download_refused', status: res.status });
      last = new ListSourceError(`file download failed (${res.status})`, { code: 'download_failed', status: res.status, retryable: true });
    } catch (e) {
      if (e instanceof ListSourceError && !e.retryable) throw e;
      last = last || new ListSourceError('file download unreachable', { code: 'network', retryable: true });
    }
    if (attempt < MAX_ATTEMPTS) await _io.sleep(1000 * 2 ** (attempt - 1));
  }
  throw last;
}

// CSV (UTF-8, BOM, '# Source' line first, then the header) -> .xlsx bytes. raw:true keeps every cell a string, so
// '+84...' phone numbers and leading zeros survive. Returns null when the converter fails (the CSV is still delivered).
export function csvToXlsx(csvBuf) {
  try {
    const XLSX = createRequire(import.meta.url)('xlsx');
    const text = csvBuf.toString('utf8').replace(/^﻿/, '');
    const wb = XLSX.read(text, { type: 'string', raw: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const header = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, range: 1 })[0] || [];
    ws['!cols'] = header.map((h) => ({ wch: Math.min(40, Math.max(10, String(h).length + 2)) }));
    wb.SheetNames = ['Companies'];
    wb.Sheets = { Companies: ws };
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  } catch (_e) { return null; }
}

// Build the list of one paid order. orderId is the PayPal order id (stable across retries). The result has the
// CSV bytes and, when the converter worked, the xlsx bytes.
export async function buildList({ orderId, definition, nCompanies = null } = {}) {
  const cfg = config();
  if (!ORDER_RE.test(String(orderId || ''))) throw new ListSourceError('bad order id', { code: 'bad_order' });
  checkDefinition(definition);
  const out = await call(cfg, '/api/partner/kira/segments/build', { method: 'POST', body: { order_id: orderId, segment: definition }, signed: true, timeoutMs: BUILD_TIMEOUT_MS });
  if (out.error && out.error.code === 'empty') throw new ListSourceError('the segment has no companies', { code: 'empty' });
  let link = out.download_url, meta = out;
  if (!link) {   // fall back to the order status
    meta = await call(cfg, `/api/partner/kira/segments/orders/${encodeURIComponent(orderId)}`);
    link = meta.download_url;
  }
  if (!link) throw new ListSourceError('list source returned no download link', { code: 'no_link' });
  const rows = Number(out.rows ?? meta.rows ?? 0);
  // BizDirect cuts a build at its per-order cap without an error: never hand a buyer a silently short file.
  if (rows >= rowCap() && Number(nCompanies) > rows) {
    throw new ListSourceError(`the list has more than ${rows} companies and the list source caps an order at ${rowCap()} rows`, { code: 'row_cap' });
  }
  const csv = await fetchFile(cfg, link);
  if (csv.length < 20) throw new ListSourceError('empty file from list source', { code: 'empty_file' });
  const xlsx = csvToXlsx(csv);
  return { csv, bytes: xlsx || csv, xlsx, format: xlsx ? 'xlsx' : 'csv', rows, sha256: out.sha256 || meta.sha256 || null, expiresAt: out.expires_at || meta.expires_at || null };
}
