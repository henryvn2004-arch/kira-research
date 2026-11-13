// ============================================================
// KIRA RESEARCH — api/email-webhook.js
// Resend webhook (S16). Resend tells us when an email was delivered, bounced, marked as spam
// or delayed. We keep a short log (email_events, shown on /en/admin/health) and stop mailing
// addresses that hard-bounced or complained (email_suppressions, checked in api/_lib/email.js),
// because mailing them again damages the domain's reputation with Gmail/Outlook.
//
// POST /api/email-webhook   signed by Resend (Svix): headers svix-id, svix-timestamp, svix-signature
//   Setup (owner): Resend dashboard → Webhooks → Add endpoint
//     URL    https://kiraresearch.com/api/email-webhook
//     Events email.delivered, email.bounced, email.complained, email.delivery_delayed
//   then copy the "Signing secret" (whsec_...) into Vercel as RESEND_WEBHOOK_SECRET and redeploy.
//
// Responses: 405 not POST · 400 missing/old/forged signature headers · 503 secret not configured
//            · 200 ok (also for event types we ignore, so Resend does not retry them)
// ============================================================

import crypto from 'crypto';

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SECRET               = process.env.RESEND_WEBHOOK_SECRET;
const TOLERANCE_S          = 300;

// The signature covers the exact bytes Resend sent, so the body must not be parsed first.
export const config = { api: { bodyParser: false } };

async function readRaw(req) {
  const chunks = [];
  let bytes = 0;
  for await (const c of req) {
    bytes += c.length;
    if (bytes > 1_000_000) throw new Error('too_large');
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Svix scheme: HMAC-SHA256 over "<id>.<timestamp>.<body>" with the base64 part of "whsec_<key>".
function verify(id, ts, sigHeader, raw) {
  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest();
  return String(sigHeader).split(' ').some(part => {
    const [ver, sig] = part.split(',');
    if (ver !== 'v1' || !sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

async function sb(path, method, body, prefer) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
               'Content-Type': 'application/json', Prefer: prefer || 'return=minimal' },
    body: JSON.stringify(body)
  });
  if (!r.ok && r.status !== 409) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

const TYPES = {
  'email.delivered':        'delivered',
  'email.bounced':          'bounced',
  'email.complained':       'complained',
  'email.delivery_delayed': 'delivery_delayed'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const id = req.headers['svix-id'], ts = req.headers['svix-timestamp'], sig = req.headers['svix-signature'];
  if (!id || !ts || !sig) return res.status(400).json({ error: 'missing_signature' });
  if (!SECRET) return res.status(503).json({ error: 'webhook_not_configured' });
  if (!(Math.abs(Date.now() / 1000 - Number(ts)) <= TOLERANCE_S)) return res.status(400).json({ error: 'stale_timestamp' });

  let raw;
  try { raw = await readRaw(req); } catch { return res.status(400).json({ error: 'bad_body' }); }
  if (!verify(id, ts, sig, raw)) return res.status(400).json({ error: 'bad_signature' });

  let evt;
  try { evt = JSON.parse(raw); } catch { return res.status(400).json({ error: 'invalid_json' }); }
  const type = TYPES[evt && evt.type];
  if (!type) return res.status(200).json({ ok: true, ignored: true });

  try {
    const d = evt.data || {};
    const to = (Array.isArray(d.to) ? d.to : [d.to]).filter(Boolean).map(a => String(a).toLowerCase());
    const bounceType = String((d.bounce && d.bounce.type) || '').toLowerCase();
    const detail = (type === 'bounced' ? [d.bounce && d.bounce.type, d.bounce && d.bounce.subType, d.bounce && d.bounce.message]
                  : type === 'delivery_delayed' ? [d.delay && d.delay.reason] : []).filter(Boolean).join(' · ').slice(0, 300) || null;

    // One row per recipient; svix-id + position keeps a retried webhook from being stored twice.
    for (let i = 0; i < Math.max(to.length, 1); i++) {
      await sb('email_events?on_conflict=svix_id', 'POST',
        { svix_id: `${id}:${i}`, type, email: to[i] || null, detail }, 'resolution=ignore-duplicates,return=minimal');
    }
    // A hard bounce or a spam complaint: never mail this address again.
    const suppress = type === 'complained' || (type === 'bounced' && bounceType !== 'transient');
    if (suppress) {
      for (const email of to) {
        await sb('email_suppressions?on_conflict=email', 'POST',
          { email, reason: type === 'complained' ? 'complained' : 'bounced' }, 'resolution=ignore-duplicates,return=minimal');
      }
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[email-webhook]', err.message);
    return res.status(500).json({ error: 'server_error' });   // Resend retries on 5xx
  }
}
