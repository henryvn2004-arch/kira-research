// ============================================================
// KIRA RESEARCH — auth.js
// Supabase Auth helper, include in every page via <script src="/auth.js">
// ============================================================

const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co'; // replace after setup
const SUPABASE_ANON = 'YOUR_ANON_KEY';                    // replace after setup

// ── Init Supabase client ──────────────────────────────────
const _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});

// ── Public helpers ────────────────────────────────────────

/** Get current session (null if not logged in) */
async function getSession() {
  const { data } = await _supa.auth.getSession();
  return data.session;
}

/** Get current user object */
async function getUser() {
  const session = await getSession();
  return session ? session.user : null;
}

/** Sign up with email + password */
async function signUp(email, password) {
  const { data, error } = await _supa.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

/** Sign in with email + password */
async function signIn(email, password) {
  const { data, error } = await _supa.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Sign out */
async function signOut() {
  await _supa.auth.signOut();
  window.location.href = '/';
}

/** Require login — redirect to auth page if not logged in */
async function requireAuth() {
  const user = await getUser();
  if (!user) {
    sessionStorage.setItem('kira_redirect_after_login', window.location.href);
    window.location.href = '/auth.html';
  }
  return user;
}

/** Check if user has purchased a specific report slug */
async function hasPurchased(slug) {
  // Allow bypass for testing
  if (localStorage.getItem('PAYWALL_DISABLED') === 'true') return true;

  const user = await getUser();
  if (!user) return false;

  const { data, error } = await _supa
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('slug', slug)
    .eq('status', 'completed')
    .maybeSingle();

  return !error && data !== null;
}

/** Update navbar UI based on auth state */
async function updateNavAuth() {
  const user = await getUser();
  const signInBtn  = document.getElementById('nav-signin');
  const signOutBtn = document.getElementById('nav-signout');
  const profileBtn = document.getElementById('nav-profile');

  if (user) {
    if (signInBtn)  signInBtn.style.display  = 'none';
    if (signOutBtn) signOutBtn.style.display = 'inline-flex';
    if (profileBtn) profileBtn.style.display = 'inline-flex';
  } else {
    if (signInBtn)  signInBtn.style.display  = 'inline-flex';
    if (signOutBtn) signOutBtn.style.display = 'none';
    if (profileBtn) profileBtn.style.display = 'none';
  }
}

// ── Auto-run on every page ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();

  // Sign-out button (if present on page)
  const signOutBtn = document.getElementById('nav-signout');
  if (signOutBtn) signOutBtn.addEventListener('click', signOut);
});

// ── Expose on window ──────────────────────────────────────
window.kiraAuth = { getSession, getUser, signUp, signIn, signOut, requireAuth, hasPurchased };
