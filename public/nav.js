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
          <a href="/report.html" class="ddm-item">
            <div class="ddm-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 17h6M9 13h6M9 9h3m-6 13h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v15a2 2 0 002 2z"/></svg>
            </div>
            <div class="ddm-text">
              <span class="ddm-label">Market Analysis</span>
              <span class="ddm-desc">7 modules · Market overview, competitive, customer intelligence & more</span>
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
      <a href="/auth.html"    class="nav-btn nav-btn-ghost" id="nav-signin"  style="display:none">Sign in</a>
      <a href="/profile.html" class="nav-btn nav-btn-ghost" id="nav-profile" style="display:none">My Reports</a>
      <button class="nav-btn nav-btn-ghost" id="nav-signout" style="display:none">Sign out</button>
      <a href="/report.html"  class="nav-btn nav-btn-primary" id="nav-generate">Generate Report</a>
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
    <a href="/report.html"   class="mobile-link">Market Analysis</a>
    <div class="mobile-divider"></div>
    <a href="/library.html"  class="mobile-link">Library</a>
    <a href="/insights.html" class="mobile-link">Insights</a>
    <a href="/pricing.html"  class="mobile-link">Pricing</a>
    <a href="/about.html"    class="mobile-link">About</a>
    <div class="mobile-divider"></div>
    <a href="/auth.html"     class="mobile-link" id="mobile-signin"  style="display:none">Sign in</a>
    <a href="/profile.html"  class="mobile-link" id="mobile-profile" style="display:none">My Reports</a>
    <button class="mobile-link mobile-signout" id="mobile-signout"   style="display:none">Sign out</button>
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
  padding: 0 32px; height: 64px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
.nav-logo img { height: 36px; width: auto; max-width: 160px; object-fit: contain; display: block; }
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
  display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0;
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
.footer-brand { display: flex; flex-direction: column; gap: 12px; }
.footer-logo { height: auto; width: 140px; max-width: 140px; object-fit: contain; opacity: .85; display: block; }
.footer-tagline { font-size: 12px; color: #5A6278; }
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
  document.body.style.paddingTop = '64px';

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

    const signin   = document.getElementById('nav-signin');
    const profile  = document.getElementById('nav-profile');
    const signout  = document.getElementById('nav-signout');
    const mSignin  = document.getElementById('mobile-signin');
    const mProfile = document.getElementById('mobile-profile');
    const mSignout = document.getElementById('mobile-signout');

    if (user) {
      if (signin)   signin.style.display   = 'none';
      if (profile)  profile.style.display  = 'inline-flex';
      if (signout)  signout.style.display  = 'inline-flex';
      if (mSignin)  mSignin.style.display  = 'none';
      if (mProfile) mProfile.style.display = 'flex';
      if (mSignout) mSignout.style.display = 'flex';
    } else {
      if (signin)   signin.style.display   = 'inline-flex';
      if (profile)  profile.style.display  = 'none';
      if (signout)  signout.style.display  = 'none';
      if (mSignin)  mSignin.style.display  = 'flex';
      if (mProfile) mProfile.style.display = 'none';
      if (mSignout) mSignout.style.display = 'none';
    }

    // sign out buttons
    [signout, mSignout].forEach(btn => {
      if (btn) btn.addEventListener('click', () => window.kiraAuth.signOut());
    });
  }

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