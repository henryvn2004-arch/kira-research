/**
 * Google Indexing API — kiraresearch.com
 * Usage:
 *   node scripts/indexing-api.mjs                  # gửi tất cả URLs
 *   node scripts/indexing-api.mjs --urls url1,url2 # gửi URLs cụ thể
 *   node scripts/indexing-api.mjs --dry-run        # xem URLs sẽ gửi, không gửi thật
 */

import { createSign } from 'node:crypto';

const BASE_URL = 'https://kiraresearch.com';
const INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish';
const QUOTA_PER_DAY = 200;

const args = process.argv.slice(2);
const getArg = (name) => { const idx = args.indexOf(`--${name}`); return idx !== -1 ? args[idx + 1] : null; };
const hasFlag = (name) => args.includes(`--${name}`);

const CUSTOM_URLS = getArg('urls') ? getArg('urls').split(',') : null;
const LIMIT = getArg('limit') ? parseInt(getArg('limit')) : QUOTA_PER_DAY;
const DRY_RUN = hasFlag('dry-run');

// ─── JWT / OAuth2 ────────────────────────────────────────────────────────────

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function makeJWT(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(serviceAccount.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${header}.${payload}.${sig}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = makeJWT(serviceAccount);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!res.ok) throw new Error(`OAuth2 error ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

// ─── URL list ─────────────────────────────────────────────────────────────────
// Thêm URLs quan trọng của kiraresearch vào đây

function generatePriorityUrls(limit) {
  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/en/`,
    `${BASE_URL}/ja/`,
    `${BASE_URL}/ko/`,
  ];
  return urls.slice(0, limit);
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function notifyUrl(url, token) {
  const res = await fetch(INDEXING_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error(`QUOTA_EXCEEDED: ${text}`);
    console.warn(`  SKIP ${res.status}: ${url} — ${text.slice(0, 120)}`);
    return false;
  }
  return true;
}

async function sendBatch(urls, token) {
  let ok = 0, fail = 0;
  for (let i = 0; i < urls.length; i += 10) {
    const batch = urls.slice(i, i + 10);
    const results = await Promise.allSettled(batch.map((u) => notifyUrl(u, token)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) ok++;
      else if (r.status === 'rejected' && r.reason?.message?.startsWith('QUOTA_EXCEEDED')) {
        console.error('\n[!] Quota exceeded.'); return { ok, fail };
      } else fail++;
    }
    process.stdout.write(`\r  Đã gửi: ${Math.min(i + 10, urls.length)}/${urls.length} (${ok} OK, ${fail} lỗi)`);
    if (i + 10 < urls.length) await new Promise((r) => setTimeout(r, 500));
  }
  console.log();
  return { ok, fail };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) { console.error('Missing env: GOOGLE_SERVICE_ACCOUNT_JSON'); process.exit(1); }

  let serviceAccount;
  try {
    const raw = saJson.trim().startsWith('{') ? saJson : Buffer.from(saJson, 'base64').toString();
    serviceAccount = JSON.parse(raw);
  } catch { console.error('GOOGLE_SERVICE_ACCOUNT_JSON không parse được'); process.exit(1); }

  const urls = CUSTOM_URLS || generatePriorityUrls(LIMIT);
  console.log(`URLs: ${urls.length}`);

  if (DRY_RUN) { urls.forEach((u) => console.log(' ', u)); return; }

  console.log('\nLấy access token...');
  const token = await getAccessToken(serviceAccount);
  console.log('Token OK\n');

  const { ok, fail } = await sendBatch(urls, token);
  console.log(`\nXong: ${ok} OK, ${fail} lỗi`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
