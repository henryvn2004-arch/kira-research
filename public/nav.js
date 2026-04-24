// ============================================================
// KIRA RESEARCH — nav.js
// Injects consistent nav + footer into every page.
// Include AFTER auth.js: <script src="/nav.js"></script>
// ============================================================

(function () {
  function init() {
  // ── NAV HTML ─────────────────────────────────────────────
  const NAV_HTML = `
<nav id="kira-nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo">
      <img src="/logo.png" alt="KIRA RESEARCH" />
    </a>

    <ul class="nav-links" id="nav-links">
      <li class="nav-dropdown">
        <a href="#" class="nav-drop-trigger">
          Reports
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <div class="nav-dropdown-menu">
          <div class="ddm-section-label">Research</div>
          <a href="/report.html" class="ddm-item">
            <div class="ddm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 17h6M9 13h6M9 9h3m-6 13h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v15a2 2 0 002 2z"/></svg>
            </div>
            <div class="ddm-text">
              <span class="ddm-label">Market Analysis</span>
              <span class="ddm-desc">7 modules · Market overview, competitive, customer intelligence & more</span>
            </div>
          </a>
          <a href="/strategy-builder.html" class="ddm-item">
            <div class="ddm-icon" style="background:rgba(246,173,85,.1);border-color:rgba(246,173,85,.2)">
              <svg viewBox="0 0 24 24" fill="none" stroke="#F6AD55" stroke-width="1.5"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <div class="ddm-text">
              <span class="ddm-label">Strategy Builder</span>
              <span class="ddm-desc">10 modules · Upload docs · AI builds your strategic report</span>
            </div>
          </a>
          <div class="ddm-divider"></div>
          <div class="ddm-section-label">Studio</div>
          <a href="/docreport.html" class="ddm-item">
            <div class="ddm-icon" style="background:rgba(0,201,167,.1);border-color:rgba(0,201,167,.2)">
              <svg viewBox="0 0 24 24" fill="none" stroke="#00C9A7" stroke-width="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <div class="ddm-text">
              <span class="ddm-label">Document Intelligence</span>
              <span class="ddm-desc">Upload files · AI analyzes · consulting-style output</span>
            </div>
          </a>
          <a href="/studio/" class="ddm-item">
            <div class="ddm-icon" style="background:rgba(0,201,167,.1);border-color:rgba(0,201,167,.2)">
              <svg viewBox="0 0 24 24" fill="none" stroke="#00C9A7" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
            <div class="ddm-text">
              <span class="ddm-label">All Studio Tools →</span>
              <span class="ddm-desc">Presentation Builder, Report Writer & more coming soon</span>
            </div>
          </a>
        </div>
      </li>
      <li><a href="/library.html">Library</a></li>
      <li><a href="/insights.html">Insights</a></li>
      <li><a href="/pricing.html">Pricing</a></li>
      <li><a href="/about.html">About</a></li>
    </ul>

    <div class="nav-actions">
      <!-- Logged OUT -->
      <a href="/report.html" class="nav-btn nav-btn-ghost" id="nav-generate" style="display:none">Try Free</a>
      <a href="/auth.html"   class="nav-btn nav-btn-primary" id="nav-signin">Sign In</a>

      <!-- Logged IN: account widget -->
      <div class="nav-account" id="nav-account" style="display:none">
        <button class="nav-account-btn" id="nav-account-btn" onclick="toggleAccountMenu()">
          <div class="nav-avatar" id="nav-avatar">?</div>
          <div class="nav-credit-chip" id="nav-credit-chip">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polygon points="6,1 11,4 11,8 6,11 1,8 1,4" stroke="#1E6FFF" stroke-width="1.2" fill="rgba(30,111,255,.15)"/></svg>
            <span id="nav-credit-val">—</span>
          </div>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5L5 6.5L8 3.5" stroke="#A3A9B6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="nav-account-menu" id="nav-account-menu">
          <div class="nam-header">
            <div class="nam-email" id="nam-email"></div>
            <div class="nam-balance">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polygon points="6,1 11,4 11,8 6,11 1,8 1,4" stroke="#1E6FFF" stroke-width="1.2" fill="rgba(30,111,255,.15)"/></svg>
              <span id="nam-balance-val">—</span> credits
            </div>
          </div>
          <div class="nam-divider"></div>
          <a href="/profile.html"  class="nam-item">📄 My Reports</a>
          <a href="/pricing.html"  class="nam-item nam-topup">⬡ Top Up Credits</a>
          <div class="nam-divider"></div>
          <button class="nam-item nam-signout" id="nav-signout">Sign Out</button>
        </div>
      </div>
    </div>

    <!-- Mobile burger -->
    <button class="nav-burger" id="nav-burger" onclick="toggleMobileNav()">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>

<!-- Mobile nav overlay -->
<div class="mobile-nav" id="mobile-nav">
  <div class="mobile-nav-inner">
    <div class="mobile-section-label">Reports</div>
    <a href="/report.html"            class="mobile-link">Market Analysis</a>
    <a href="/strategy-builder.html"  class="mobile-link">Strategy Builder</a>
    <a href="/docreport.html"         class="mobile-link">Document Intelligence</a>
    <div class="mobile-divider"></div>
    <a href="/library.html"  class="mobile-link">Library</a>
    <a href="/insights.html" class="mobile-link">Insights</a>
    <a href="/pricing.html"  class="mobile-link">Pricing</a>
    <a href="/about.html"    class="mobile-link">About</a>
    <div class="mobile-divider"></div>
    <a href="/auth.html"     class="mobile-link" id="mobile-signin"  style="display:none">Sign In</a>
    <div id="mobile-account-section" style="display:none">
      <div class="mobile-credit-row">
        <span style="color:#A3A9B6;font-size:14px">Credits</span>
        <span class="mobile-credit-val" id="mobile-credit-val">—</span>
      </div>
      <a href="/profile.html"  class="mobile-link" id="mobile-profile">My Reports</a>
      <a href="/pricing.html"  class="mobile-link" style="color:#1E6FFF">⬡ Top Up Credits</a>
      <button class="mobile-link mobile-signout" id="mobile-signout">Sign Out</button>
    </div>
  </div>
</div>`;

  // ── FOOTER HTML ───────────────────────────────────────────
  const FOOTER_HTML = `
<footer id="kira-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <img src="/logo.png" alt="KIRA RESEARCH" class="footer-logo" />
      <p class="footer-tagline">Driven by insight. Built for impact.</p>
    </div>
    <div class="footer-cols">
      <div class="footer-col">
        <div class="footer-col-title">Reports</div>
        <a href="/report.html">Market Analysis</a>
        <a href="/strategy-builder.html">Strategy Builder</a>
        <a href="/docreport.html">Document Intelligence</a>
        <a href="/library.html">Living Library</a>
      </div>
      <div class="footer-col">
        <div class="footer-col-title">Resources</div>
        <a href="/insights.html">Insights</a>
        <a href="/pricing.html">Pricing</a>
        <a href="/about.html">About</a>
        <a href="/contact.html">Contact</a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2026 KIRA RESEARCH. All rights reserved.</span>
  </div>
</footer>`;

  // ── CSS ───────────────────────────────────────────────────
  const CSS = `
/* ── Shared Nav ── */
#kira-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  border-bottom: 1px solid #1A1D24;
  background: rgba(11,13,16,.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}
#kira-nav .nav-inner {
  max-width: 1120px; margin: 0 auto;
  padding: 0 32px; height: 96px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
.nav-logo img { height: 88px; width: auto; max-width: 280px; object-fit: contain; display: block; }
.nav-links {
  display: flex; align-items: center; gap: 4px; list-style: none;
  margin: 0; padding: 0;
}
.nav-links > li > a, .nav-drop-trigger {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 12px; border-radius: 6px;
  font-size: 13px; color: #A3A9B6;
  transition: color .15s, background .15s;
  text-decoration: none; white-space: nowrap;
  background: transparent; border: none; cursor: pointer; font-family: Arial, sans-serif;
}
.nav-links > li > a:hover, .nav-drop-trigger:hover { color: #fff; background: rgba(255,255,255,.05); }

/* active page highlight */
.nav-links > li > a.active { color: #fff; }

/* ── Dropdown ── */
.nav-dropdown { position: relative; }

/* bridge: invisible padding so mouse can travel from trigger to menu */
.nav-dropdown::after {
  content: ''; position: absolute;
  top: 100%; left: 0; right: 0;
  height: 12px; /* covers the gap */
}

.nav-dropdown-menu {
  position: absolute; top: calc(100% + 8px); left: -8px;
  background: #11151C; border: 1px solid #242A35;
  border-radius: 12px; padding: 8px; min-width: 260px;
  box-shadow: 0 16px 48px rgba(0,0,0,.6);
  opacity: 0; visibility: hidden; pointer-events: none;
  transform: translateY(-6px);
  transition: opacity .18s ease, transform .18s ease, visibility .18s;
}

/* show on hover — both trigger and menu keep it open */
.nav-dropdown:hover .nav-dropdown-menu {
  opacity: 1; visibility: visible; pointer-events: all; transform: translateY(0);
}

.ddm-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px;
  text-decoration: none; transition: background .15s;
  margin-bottom: 2px;
}
.ddm-item:last-child { margin-bottom: 0; }
.ddm-item:hover { background: #161B24; }
.ddm-icon {
  width: 32px; height: 32px; flex-shrink: 0;
  background: rgba(30,111,255,.1); border: 1px solid rgba(30,111,255,.2);
  border-radius: 7px; display: flex; align-items: center; justify-content: center;
}
.ddm-icon svg { width: 15px; height: 15px; stroke: #1E6FFF; }
.ddm-text { display: flex; flex-direction: column; gap: 2px; }
.ddm-label { font-size: 13px; font-weight: 600; color: #fff; }
.ddm-desc { font-size: 11px; color: #5A6278; }
.ddm-section-label { font-size: 9px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #5A6278; padding: 4px 12px 2px; }
.ddm-divider { height: 1px; background: #1A1D24; margin: 6px 0; }

/* ── Account widget ── */
.nav-account { position: relative; }
.nav-account-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 10px 5px 5px; border-radius: 8px;
  background: #11151C; border: 1px solid #1A1D24;
  cursor: pointer; transition: border-color .15s;
  font-family: Arial,sans-serif;
}
.nav-account-btn:hover { border-color: #242A35; }
.nav-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(30,111,255,.2); border: 1px solid rgba(30,111,255,.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #1E6FFF; flex-shrink: 0;
}
.nav-credit-chip {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 700; color: #fff;
}
.nav-account-menu {
  position: absolute; top: calc(100% + 8px); right: 0;
  background: #11151C; border: 1px solid #242A35;
  border-radius: 12px; padding: 6px; min-width: 220px;
  box-shadow: 0 16px 48px rgba(0,0,0,.6);
  opacity: 0; visibility: hidden; pointer-events: none;
  transform: translateY(-6px);
  transition: opacity .18s ease, transform .18s ease, visibility .18s;
  z-index: 200;
}
.nav-account-menu.open {
  opacity: 1; visibility: visible; pointer-events: all; transform: translateY(0);
}
.nam-header { padding: 10px 12px 8px; }
.nam-email { font-size: 12px; color: #A3A9B6; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nam-balance { font-size: 13px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 5px; }
.nam-divider { height: 1px; background: #1A1D24; margin: 4px 0; }
.nam-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border-radius: 7px;
  font-size: 13px; color: #A3A9B6; text-decoration: none;
  transition: background .15s, color .15s;
  background: transparent; border: none; cursor: pointer;
  font-family: Arial,sans-serif; width: 100%; text-align: left;
}
.nam-item:hover { background: #161B24; color: #fff; }
.nam-topup { color: #1E6FFF; }
.nam-topup:hover { color: #1E6FFF; }
.nam-signout:hover { color: #FC8181; }
/* mobile credit row */
.mobile-credit-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 0; border-bottom: 1px solid #1A1D24;
}
.mobile-credit-val { font-size: 15px; font-weight: 700; color: #1E6FFF; }

/* ── Nav actions ── */
.nav-actions { display: flex; align-items: center; gap: 8px; }
.nav-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 6px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all .2s; border: none; font-family: Arial,sans-serif;
  text-decoration: none; white-space: nowrap;
}
.nav-btn-ghost { background: transparent; color: #A3A9B6; }
.nav-btn-ghost:hover { color: #fff; background: rgba(255,255,255,.05); }
.nav-btn-primary { background: #1E6FFF; color: #fff; }
.nav-btn-primary:hover { background: #1558CC; box-shadow: 0 0 20px rgba(30,111,255,.3); }

/* ── Burger (mobile) ── */
.nav-burger {
  display: none; flex-direction: column; gap: 4px;
  background: transparent; border: none; cursor: pointer; padding: 8px;
}
.nav-burger span {
  display: block; width: 20px; height: 2px;
  background: #A3A9B6; border-radius: 2px; transition: all .2s;
}

/* ── Mobile nav ── */
.mobile-nav {
  display: none; position: fixed; top: 96px; left: 0; right: 0; bottom: 0;
  background: #0B0D10; z-index: 999; overflow-y: auto;
  border-top: 1px solid #1A1D24;
}
.mobile-nav.open { display: block; }
.mobile-nav-inner { padding: 16px 24px 40px; }
.mobile-section-label {
  font-size: 10px; color: #5A6278; text-transform: uppercase;
  letter-spacing: .1em; padding: 12px 0 8px;
}
.mobile-link {
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 0; font-size: 15px; color: #A3A9B6;
  border-bottom: 1px solid #1A1D24; text-decoration: none;
  background: transparent; border-left: none; border-right: none; border-top: none;
  cursor: pointer; font-family: Arial,sans-serif; width: 100%; text-align: left;
  transition: color .15s;
}
.mobile-link:hover { color: #fff; }
.mobile-price { font-size: 12px; color: #1E6FFF; }
.mobile-divider { height: 1px; background: #1A1D24; margin: 8px 0; }
.mobile-signout { color: #FC8181; }

/* ── Footer ── */
#kira-footer {
  border-top: 1px solid #1A1D24;
  background: #0B0D10;
  padding: 56px 0 0;
}
.footer-inner {
  max-width: 1120px; margin: 0 auto; padding: 0 32px 48px;
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 48px; flex-wrap: wrap;
  border-bottom: 1px solid #1A1D24;
}
.footer-brand { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; }
.footer-logo { height: auto; width: 240px; max-width: 240px; object-fit: contain; opacity: .9; display: block; }
.footer-tagline { font-size: 14px; color: #5A6278; font-weight: 700; width: 240px; text-align: center; }
.footer-cols { display: flex; gap: 64px; }
.footer-col { display: flex; flex-direction: column; gap: 10px; }
.footer-col-title {
  font-size: 11px; color: #5A6278;
  text-transform: uppercase; letter-spacing: .1em;
  margin-bottom: 4px;
}
.footer-col a {
  font-size: 13px; color: #A3A9B6; text-decoration: none;
  transition: color .15s;
}
.footer-col a:hover { color: #fff; }
.footer-bottom {
  max-width: 1120px; margin: 0 auto;
  padding: 20px 32px; font-size: 11px; color: #5A6278;
}

/* ── Responsive ── */
@media (max-width: 860px) {
  .nav-links, .nav-actions .nav-btn-ghost, #nav-generate { display: none; }
  .nav-burger { display: flex; }
  .footer-cols { gap: 40px; }
}
@media (max-width: 560px) {
  #kira-nav .nav-inner { padding: 0 20px; }
  .footer-inner { padding: 0 20px 40px; }
  .footer-bottom { padding: 20px; }
  .footer-cols { flex-direction: column; gap: 28px; }
}`;

  // ── Inject CSS ────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  // ── Inject Nav ────────────────────────────────────────────
  const navWrap = document.createElement('div');
  navWrap.innerHTML = NAV_HTML;
  document.body.insertBefore(navWrap.firstElementChild, document.body.firstChild);
  // mobile nav
  document.body.insertBefore(navWrap.firstElementChild, document.body.children[1]);

  // ── Inject Footer ─────────────────────────────────────────
  const footWrap = document.createElement('div');
  footWrap.innerHTML = FOOTER_HTML;
  document.body.appendChild(footWrap.firstElementChild);

  // ── Add body padding so content isn't behind fixed nav ───
  document.body.style.paddingTop = '96px';

  // ── Active page highlight ─────────────────────────────────
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a, .mobile-link').forEach(a => {
    if (a.getAttribute('href') && path.endsWith(a.getAttribute('href').replace('/', ''))) {
      a.classList.add('active');
      a.style.color = '#fff';
    }
  });

  // ── Mobile nav toggle ─────────────────────────────────────
  window.toggleMobileNav = function () {
    const mn     = document.getElementById('mobile-nav');
    const burger = document.getElementById('nav-burger');
    const open   = mn.classList.toggle('open');
    burger.style.opacity = open ? '1' : '';
    document.body.style.overflow = open ? 'hidden' : '';
  };

  // Close mobile nav on link click
  document.querySelectorAll('.mobile-link').forEach(a => {
    a.addEventListener('click', () => {
      document.getElementById('mobile-nav').classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ── Auth state in nav ──────────────────────────────────────
  async function updateNav() {
    if (!window.kiraAuth) return;
    const user = await window.kiraAuth.getUser();

    const signin         = document.getElementById('nav-signin');
    const navGenerate    = document.getElementById('nav-generate');
    const navAccount     = document.getElementById('nav-account');
    const mSignin        = document.getElementById('mobile-signin');
    const mAccountSection = document.getElementById('mobile-account-section');

    if (user) {
      if (signin)          signin.style.display      = 'none';
      if (navGenerate)     navGenerate.style.display  = 'none';
      if (navAccount)      navAccount.style.display   = 'flex';
      if (mSignin)         mSignin.style.display      = 'none';
      if (mAccountSection) mAccountSection.style.display = 'block';

      // Avatar initial
      const initial = (user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase();
      const avatar  = document.getElementById('nav-avatar');
      if (avatar) avatar.textContent = initial;

      // Email in dropdown
      const namEmail = document.getElementById('nam-email');
      if (namEmail) namEmail.textContent = user.email || '';

      // Mobile profile email
      const mProfile = document.getElementById('mobile-profile');
      if (mProfile) mProfile.textContent = 'My Reports';

      // Load credit balance
      try {
        const r = await fetch(`/api/credits?action=balance&userId=${user.id}`);
        const d = await r.json();
        const bal = d.balance ?? 0;
        const chip = document.getElementById('nav-credit-val');
        const namBal = document.getElementById('nam-balance-val');
        const mBal   = document.getElementById('mobile-credit-val');
        if (chip)   chip.textContent   = bal;
        if (namBal) namBal.textContent = bal;
        if (mBal)   mBal.textContent   = bal + ' credits';
      } catch {}

      // Sign out
      const signout  = document.getElementById('nav-signout');
      const mSignout = document.getElementById('mobile-signout');
      [signout, mSignout].forEach(btn => {
        if (btn) btn.onclick = () => window.kiraAuth.signOut();
      });

    } else {
      if (signin)          signin.style.display      = 'inline-flex';
      if (navGenerate)     navGenerate.style.display  = 'inline-flex';
      if (navAccount)      navAccount.style.display   = 'none';
      if (mSignin)         mSignin.style.display      = 'flex';
      if (mAccountSection) mAccountSection.style.display = 'none';
    }
  }

  // Account dropdown toggle
  window.toggleAccountMenu = function () {
    const menu = document.getElementById('nav-account-menu');
    if (menu) menu.classList.toggle('open');
  };

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const widget = document.getElementById('nav-account');
    const menu   = document.getElementById('nav-account-menu');
    if (menu && widget && !widget.contains(e.target)) {
      menu.classList.remove('open');
    }
  });

  // Run after DOM + auth ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateNav);
  } else {
    updateNav();
  }

  } // end init

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();