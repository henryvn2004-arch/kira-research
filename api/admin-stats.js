// ============================================================
// KIRA RESEARCH — api/admin-stats.js
// Admin landing-page aggregator. Returns counts + recent activity
// across leads / reports / insights / purchases in a single round-trip.
//
// Auth: same as other admin endpoints — Authorization: Bearer <jwt>
// verified against ADMIN_EMAILS whitelist.
//
//   GET /api/admin-stats → {
//     leads:       { total, by_status: { new, contacted, qualified, closed, rejected } },
//     reports:     { total, by_status: { draft, published } },
//     insights:    { total, by_status: { draft, published } },
//     purchases:   { count, revenue_usd },
//     waitlist:    { total, by_plan: { week, month, annual, not-sure }, by_status: {...} },
//     recent_leads:     [ { id, name, company, status, created_at }, ... up to 5 ],
//     recent_purchases: [ { id, slug, locale, amount, currency, created_at }, ... up to 5 ],
//     pipeline:    { state, by_status, work_left, completed_7d, last_batch_at, hours_since } | null
//   }
//
// Every section gracefully degrades to zero if its table isn't migrated
// yet — so the dashboard renders cleanly on a fresh DB.
// ============================================================

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAILS         = (process.env.ADMIN_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// ── Supabase helper with count support ──
// PostgREST: Prefer: count=exact + HEAD request gives total in Content-Range.
async function sb(path, { count = false, method = 'GET' } = {}) {
  const headers = {
    'apikey':        SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type':  'application/json'
  };
  if (count) headers['Prefer'] = 'count=exact';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers });
  if (!res.ok) {
    // Don't throw — let caller fall back to zero. Logs the issue server-side.
    console.warn(`[admin-stats] sb ${path}: ${res.status} ${await res.text().catch(() => '')}`);
    return { rows: [], total: 0 };
  }
  const range = res.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1], 10) || 0;
  const rows  = method === 'HEAD' ? [] : await res.json().catch(() => []);
  return { rows, total };
}

async function verifyBearer(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey':        SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${m[1]}`
      }
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.email ? { id: u.id, email: u.email.toLowerCase() } : null;
  } catch (_) { return null; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ── Count tally helper — buckets rows by a field (e.g. 'status') ──
function tally(rows, field) {
  const out = {};
  for (const r of rows) {
    const k = r[field] || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// ── Report-pipeline health (Sprint S1) ──
// The batch queue lives in git (data/report_queue.csv) and every runner fire
// commits "batch: ..." messages, so health = queue counts + commit history from
// the public repo. No DB involved; cached 5 min per warm instance. Returns null
// on any GitHub failure so the dashboard simply hides the card.
const GH_REPO = 'henryvn2004-arch/kira-research';
const WORK_STATES = new Set(['pending', 'en_done', 'ja_done', 'en_in_progress', 'ja_in_progress', 'ko_in_progress']);
let pipelineCache = { at: 0, value: null };

function csvStatuses(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const split = (ln) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < ln.length; i++) {
      const c = ln[i];
      if (q) { if (c === '"' && ln[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const idx = split(lines[0]).indexOf('status');
  const by = {};
  for (const ln of lines.slice(1)) {
    const st = split(ln)[idx] || 'unknown';
    by[st] = (by[st] || 0) + 1;
  }
  return by;
}

async function pipelineHealth() {
  if (Date.now() - pipelineCache.at < 5 * 60 * 1000) return pipelineCache.value;
  try {
    const gh = { 'User-Agent': 'kira-admin', 'Accept': 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) gh['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const [csvRes, comRes] = await Promise.all([
      fetch(`https://raw.githubusercontent.com/${GH_REPO}/main/data/report_queue.csv`),
      fetch(`https://api.github.com/repos/${GH_REPO}/commits?path=data/report_queue.csv&per_page=100`, { headers: gh })
    ]);
    if (!csvRes.ok || !comRes.ok) throw new Error(`github ${csvRes.status}/${comRes.status}`);
    const by_status = csvStatuses(await csvRes.text());
    const commits = (await comRes.json()).filter(c => /^batch:/.test(c.commit.message));
    const work_left = Object.entries(by_status).reduce((n, [k, v]) => n + (WORK_STATES.has(k) ? v : 0), 0);
    const last = commits[0] ? commits[0].commit.committer.date : null;
    const hours_since = last ? Math.round((Date.now() - new Date(last).getTime()) / 36e5) : null;
    const weekAgo = Date.now() - 7 * 864e5;
    const completed_7d = commits.filter(c => /^batch: complete/.test(c.commit.message) && new Date(c.commit.committer.date).getTime() > weekAgo).length;
    // idle = nothing to do (fine); stalled = work waiting but no runner commit for 30h+
    const state = work_left === 0 ? 'idle' : (hours_since == null || hours_since > 30 ? 'stalled' : 'running');
    pipelineCache = { at: Date.now(), value: { state, by_status, work_left, completed_7d, last_batch_at: last, hours_since } };
  } catch (err) {
    console.warn('[admin-stats] pipeline health:', err.message);
    pipelineCache = { at: Date.now(), value: null };
  }
  return pipelineCache.value;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const user = await verifyBearer(req);
  if (!user)                           { res.status(401).json({ error: 'unauthenticated' }); return; }
  if (ADMIN_EMAILS.length === 0)       { res.status(500).json({ error: 'admin_not_configured' }); return; }
  if (!ADMIN_EMAILS.includes(user.email)) { res.status(403).json({ error: 'not_admin' }); return; }

  try {
    // Run all queries in parallel — they're independent and reduce wall-clock
    // for the dashboard load. Each gracefully degrades on table-missing errors.
    const [
      leadsAll,
      reportsAll,
      insightsAll,
      purchasesAll,
      recentLeads,
      recentPurchases,
      pipeline,
      waitlistAll
    ] = await Promise.all([
      sb('leads?select=status&limit=10000'),
      sb('living_reports?select=status&limit=10000'),
      sb('insights?select=status&limit=10000'),
      sb('purchases?select=amount,currency,status&status=eq.completed&limit=10000'),
      sb('leads?select=id,name,company,status,created_at,locale&order=created_at.desc&limit=5'),
      sb('purchases?select=id,slug,locale,amount,currency,created_at,status&status=eq.completed&order=created_at.desc&limit=5'),
      pipelineHealth(),
      sb('waitlist?select=plan,status&limit=10000')   // migration 025; zero until applied
    ]);

    // Aggregate revenue (sum amount of completed purchases). All Year 1 prices
    // are USD so we report a single revenue_usd number; if currency mixing
    // ever happens this aggregate would need per-currency split.
    const revenue = purchasesAll.rows.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    res.status(200).json({
      leads: {
        total: leadsAll.rows.length,
        by_status: tally(leadsAll.rows, 'status')
      },
      reports: {
        total: reportsAll.rows.length,
        by_status: tally(reportsAll.rows, 'status')
      },
      insights: {
        total: insightsAll.rows.length,
        by_status: tally(insightsAll.rows, 'status')
      },
      purchases: {
        count:        purchasesAll.rows.length,
        revenue_usd:  Math.round(revenue * 100) / 100   // 2dp
      },
      waitlist: {
        total:   waitlistAll.rows.length,
        by_plan: tally(waitlistAll.rows, 'plan'),
        by_status: tally(waitlistAll.rows, 'status')
      },
      recent_leads:     recentLeads.rows,
      recent_purchases: recentPurchases.rows,
      pipeline,
      // Pass through the caller's email so the page can render "signed in as X"
      // without an extra round-trip to /auth/v1/user.
      admin_email: user.email
    });
  } catch (err) {
    console.error('[admin-stats] error:', err.message);
    res.status(500).json({ error: 'server_error' });
  }
}
