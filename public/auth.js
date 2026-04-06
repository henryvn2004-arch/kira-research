// ============================================================
// KIRA RESEARCH — auth.js
// Supabase Auth + direct DB queries (replaces serverless fns)
// Include on every page: <script src="/auth.js"></script>
// ============================================================

const SUPABASE_URL  = 'https://iygoynbnscednfzdsflc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z295bmJuc2NlZG5memRzZmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzY1OTksImV4cCI6MjA5MDk1MjU5OX0.gGI12Rjwq1WAvJuUKkgrmfaXP2idWBRXOdfYFnMtb5o';

const _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});

window.db = _supa;

async function getSession() {
  const { data } = await _supa.auth.getSession();
  return data.session;
}
async function getUser() {
  const session = await getSession();
  return session ? session.user : null;
}
async function signUp(email, password) {
  const { data, error } = await _supa.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}
async function signIn(email, password) {
  const { data, error } = await _supa.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
async function signOut() {
  await _supa.auth.signOut();
  window.location.href = '/';
}
async function requireAuth() {
  const user = await getUser();
  if (!user) {
    sessionStorage.setItem('kira_redirect_after_login', window.location.href);
    window.location.href = '/auth.html';
  }
  return user;
}
async function hasPurchased(slug) {
  if (localStorage.getItem('PAYWALL_DISABLED') === 'true') return true;
  const user = await getUser();
  if (!user) return false;
  const { data } = await _supa
    .from('purchases').select('id')
    .eq('user_id', user.id).eq('slug', slug).eq('status', 'completed')
    .maybeSingle();
  return !!data;
}

// ── Direct DB helpers (no serverless needed) ──────────────
window.kiraDB = {
  async searchLibrary({ q='', industry='', country='', limit=50 }={}) {
    let query = _supa.from('living_reports')
      .select('id,slug,title,industry,country,report_type,preview_content,price,last_refreshed,tags')
      .eq('status','active').order('last_refreshed',{ascending:false}).limit(limit);
    if (industry) query = query.ilike('industry',`%${industry}%`);
    if (country)  query = query.eq('country', country);
    if (q) query = query.or(`title.ilike.%${q}%,industry.ilike.%${q}%,country.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getLivingReport(idOrSlug) {
    const isUUID = /^[0-9a-f-]{36}$/.test(idOrSlug);
    const col = isUUID ? 'id' : 'slug';
    const { data, error } = await _supa.from('living_reports')
      .select('*').eq('status','active').eq(col, idOrSlug).single();
    if (error) throw error;
    return data;
  },

  async getInsights({ industry='', country='', limit=20 }={}) {
    let query = _supa.from('insights')
      .select('id,slug,title,content,industry,country,tags,created_at')
      .eq('status','published').order('created_at',{ascending:false}).limit(limit);
    if (industry) query = query.ilike('industry',`%${industry}%`);
    if (country)  query = query.eq('country', country);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getInsightBySlug(slug) {
    const { data, error } = await _supa.from('insights')
      .select('*').eq('slug', slug).eq('status','published').single();
    if (error) throw error;
    return data;
  },

  async getMyReports() {
    const user = await getUser();
    if (!user) return { reports: [], purchases: [] };
    const [{ data: reports }, { data: purchases }] = await Promise.all([
      _supa.from('custom_reports')
        .select('id,slug,report_type,status,input_params,created_at')
        .eq('user_id', user.id).order('created_at',{ascending:false}),
      _supa.from('purchases')
        .select('id,slug,report_type,amount,status,created_at')
        .eq('user_id', user.id).eq('status','completed')
        .order('created_at',{ascending:false}),
    ]);
    return {
      reports: (reports||[]).map(r=>({...r, source:'custom', reportType:r.report_type, createdAt:r.created_at})),
      purchases: purchases||[],
    };
  },

  async submitContact({ name, email, company, subject, message }) {
    const { error } = await _supa.from('contacts')
      .insert({ name, email, company: company||null, subject, message });
    if (error) throw error;
    return true;
  },
};

window.kiraAuth = { getSession, getUser, signUp, signIn, signOut, requireAuth, hasPurchased };
