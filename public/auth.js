// KIRA RESEARCH — public/auth.js
// Shared auth module. Exposes window.db (Supabase client) + window.kiraAuth

(function () {
  const SUPABASE_URL  = 'https://iygoynbnscednfzdsflc.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z295bmJuc2NlZG5memRzZmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzY1OTksImV4cCI6MjA5MDk1MjU5OX0.gGI12Rjwq1WAvJuUKkgrmfaXP2idWBRXOdfYFnMtb5o';

  // ── Init Supabase client ───────────────────────────────────
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kira-auth' }
  });
  window.db = db;

  // ── kiraAuth API ──────────────────────────────────────────
  window.kiraAuth = {

    // Get current user (null if not logged in)
    async getUser() {
      const { data: { user } } = await db.auth.getUser();
      return user || null;
    },

    // Email/password sign-in
    async signIn(email, password) {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      return data.user;
    },

    // Email/password sign-up (sends confirmation email)
    async signUp(email, password) {
      const { data, error } = await db.auth.signUp({ email, password });
      if (error) throw new Error(error.message);
      return data.user;
    },

    // Google OAuth — redirects to Google, then back to `redirectTo`
    async signInWithGoogle() {
      const after   = sessionStorage.getItem('kira_redirect_after_login') || '/';
      const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + after,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
      });
      if (error) throw new Error(error.message);
    },

    // Sign out + redirect home
    async signOut() {
      await db.auth.signOut();
      window.location.href = '/';
    },

    // Redirect to /auth.html if not logged in. Returns user or null.
    async requireAuth() {
      const user = await this.getUser();
      if (!user) {
        sessionStorage.setItem('kira_redirect_after_login', window.location.pathname + window.location.search);
        window.location.href = '/auth.html';
        return null;
      }
      return user;
    },

    // Check if user has purchased a slug
    async hasPurchased(slug) {
      // PAYWALL bypass for testing
      if (new URLSearchParams(window.location.search).get('bypass') === '1') return true;

      const user = await this.getUser();
      if (!user) return false;
      const { data } = await db.from('purchases')
        .select('id').eq('user_id', user.id).eq('slug', slug)
        .eq('status', 'completed').limit(1);
      return data?.length > 0;
    },
  };

  // ── Update nav UI on auth state change ───────────────────
  // Fires on every page load + whenever sign-in/out occurs.
  db.auth.onAuthStateChange((event, session) => {
    updateNavAuth(session?.user || null);
  });

  // Also run once on load (onAuthStateChange may fire before DOM is ready)
  document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.kiraAuth.getUser();
    updateNavAuth(user);
  });

  function updateNavAuth(user) {
    // nav.js renders these elements — update if present
    const signinBtn  = document.getElementById('nav-signin-btn');
    const signoutBtn = document.getElementById('nav-signout-btn');
    const profileBtn = document.getElementById('nav-profile-btn');
    const userEmail  = document.getElementById('nav-user-email');

    if (signinBtn)  signinBtn.style.display  = user ? 'none' : 'inline-flex';
    if (signoutBtn) signoutBtn.style.display = user ? 'inline-flex' : 'none';
    if (profileBtn) profileBtn.style.display = user ? 'inline-flex' : 'none';
    if (userEmail && user) userEmail.textContent = user.email?.split('@')[0] || '';
  }

})();
