// KIRA RESEARCH — public/auth.js
// Shared auth module. Exposes window.db (Supabase client) + window.kiraAuth.
//
// Session storage strategy (Phase N.14):
//   Supabase JS defaults to localStorage, which is ORIGIN-SCOPED. That
//   means `kiraresearch.com` and `studio.kiraresearch.com` end up with
//   two separate auth sessions — a user signed-in on one site looks
//   signed-out on the other. To share the session across the main
//   domain and every *.kiraresearch.com subdomain we override the
//   Supabase storage adapter and write into cookies on the parent
//   domain `.kiraresearch.com`.
//
//   Supabase session blobs can exceed the per-cookie 4KB limit. We
//   chunk into `kira-auth.0`, `kira-auth.1`, … on write and stitch
//   back on read. localStorage still mirrors the cookie value so
//   existing read-paths keep working (nav.js heuristic, etc.).

(function () {
  const SUPABASE_URL  = 'https://iygoynbnscednfzdsflc.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5Z295bmJuc2NlZG5memRzZmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzY1OTksImV4cCI6MjA5MDk1MjU5OX0.gGI12Rjwq1WAvJuUKkgrmfaXP2idWBRXOdfYFnMtb5o';

  // ── Cross-subdomain cookie storage ────────────────────────
  // Cookies written with domain=.kiraresearch.com are sent to BOTH
  // kiraresearch.com AND studio.kiraresearch.com (plus any future
  // subdomain). When running on localhost (dev), fall back to
  // localStorage — cookies with the production domain wouldn't
  // attach to localhost requests anyway.
  const COOKIE_DOMAIN = (function () {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || /\.local$/.test(host)) return null;
    // For kiraresearch.com or any *.kiraresearch.com, use the parent domain.
    if (/(^|\.)kiraresearch\.com$/i.test(host)) return '.kiraresearch.com';
    // Vercel preview URLs (kira-research-*.vercel.app) — scope to current host.
    return null;
  })();

  const COOKIE_MAX_DAYS = 30;
  const COOKIE_CHUNK    = 3000;   // bytes per cookie chunk (well under 4KB limit)
  const MAX_CHUNKS      = 16;     // hard cap on chunked cookies — Supabase session is ~2-4KB so 16 is plenty

  function escapeRe(s) {
    return s.replace(/[.$?*|{}()\[\]\\\/\+^]/g, '\\$&');
  }
  function rawCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + escapeRe(name) + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function writeCookie(name, value) {
    if (!COOKIE_DOMAIN) return false;
    const expires = new Date(Date.now() + COOKIE_MAX_DAYS * 86400000).toUTCString();
    document.cookie =
      name + '=' + encodeURIComponent(value) +
      '; domain=' + COOKIE_DOMAIN +
      '; path=/' +
      '; expires=' + expires +
      '; SameSite=Lax' +
      '; Secure';
    return true;
  }
  function clearCookie(name) {
    if (!COOKIE_DOMAIN) return;
    document.cookie =
      name + '=' +
      '; domain=' + COOKIE_DOMAIN +
      '; path=/' +
      '; max-age=0';
  }

  // Storage adapter implementing the Web Storage API surface that
  // @supabase/auth-js expects: getItem / setItem / removeItem.
  // Reads/writes both chunked cookies AND localStorage so the
  // session round-trips across subdomains *and* legacy code that
  // reads localStorage directly keeps working.
  const sharedStorage = {
    getItem(key) {
      // Prefer chunked-cookie form if present.
      if (COOKIE_DOMAIN && rawCookie(key + '.0') !== null) {
        let out = '';
        for (let i = 0; i < MAX_CHUNKS; i++) {
          const part = rawCookie(key + '.' + i);
          if (part === null) break;
          out += part;
        }
        if (out) {
          // Mirror to localStorage so any code that reads it directly sees the same value.
          try { localStorage.setItem(key, out); } catch (_) { /* ignore */ }
          return out;
        }
      }
      // Fall back to a non-chunked cookie (small sessions).
      if (COOKIE_DOMAIN) {
        const single = rawCookie(key);
        if (single !== null) {
          try { localStorage.setItem(key, single); } catch (_) {}
          return single;
        }
      }
      // Last resort: localStorage — covers dev / preview / not-yet-migrated state.
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    setItem(key, value) {
      try { localStorage.setItem(key, value); } catch (_) {}
      if (!COOKIE_DOMAIN) return;
      // Always rewrite chunks from scratch — clear any obsolete tail first.
      const total = Math.ceil(value.length / COOKIE_CHUNK) || 1;
      // Clear single-cookie form (so it doesn't shadow the new chunked form).
      clearCookie(key);
      for (let i = 0; i < total; i++) {
        writeCookie(key + '.' + i, value.substring(i * COOKIE_CHUNK, (i + 1) * COOKIE_CHUNK));
      }
      // Trim any leftover chunks from a previously-longer session blob.
      for (let i = total; i < MAX_CHUNKS; i++) {
        if (rawCookie(key + '.' + i) === null) break;
        clearCookie(key + '.' + i);
      }
    },
    removeItem(key) {
      try { localStorage.removeItem(key); } catch (_) {}
      if (!COOKIE_DOMAIN) return;
      clearCookie(key);
      for (let i = 0; i < MAX_CHUNKS; i++) {
        if (rawCookie(key + '.' + i) === null) break;
        clearCookie(key + '.' + i);
      }
    }
  };

  // One-shot migration: if a session exists in localStorage but NOT
  // in cookies, hoist it over so the user stays signed in across
  // the kiraresearch.com ↔ studio.kiraresearch.com boundary without
  // re-signing-in.
  (function migrateLocalStorageToCookie() {
    if (!COOKIE_DOMAIN) return;
    try {
      const ls = localStorage.getItem('kira-auth');
      if (ls && rawCookie('kira-auth.0') === null && rawCookie('kira-auth') === null) {
        sharedStorage.setItem('kira-auth', ls);
      }
    } catch (_) { /* ignore */ }
  })();

  // ── Init Supabase client ───────────────────────────────────
  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession:   true,
      autoRefreshToken: true,
      storageKey:       'kira-auth',
      storage:          sharedStorage     // cross-subdomain cookie + localStorage mirror
    }
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

    // The auth-gated nav links rendered by nav.js (.kira-my-library, .kira-studio)
    // start hidden inline; reveal/hide them here so logout immediately re-hides them
    // without a page reload.
    document.querySelectorAll('.kira-my-library, .kira-studio').forEach(el => {
      el.style.display = user ? '' : 'none';
    });
  }

})();
