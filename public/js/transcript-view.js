// One Kira Experts transcript (/<locale>/experts/transcripts/<slug> → _view.html).
// /api/transcript gives the summary and the free opening; a signed-in, entitled reader
// also gets the full dialogue from /api/transcript-content. Locked turns are never sent
// to other readers: the page draws placeholder lines under a blur instead.
(async function () {
  const root = document.getElementById('tv-root');
  if (!root) return;
  const R = window.kiraR;
  const ic = (n) => (R && R.icon ? R.icon(n) : '');
  const parts = location.pathname.split('/').filter(Boolean);
  const locale = ['en', 'ja', 'ko', 'zh'].includes(parts[0]) ? parts[0] : 'en';
  const slug = (parts[3] || '').replace(/\/$/, '');
  const WAITLIST = '/en/pricing#waitlist';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TAG = /\[([NF]\d+)\]/g;

  function fail(title, body) {
    root.innerHTML = '<div class="r-empty" style="margin-block:64px"><h3>' + esc(title) + '</h3>' + (body ? '<p>' + esc(body) + '</p>' : '') +
      '<a class="r-btn r-btn-outline" href="/en/experts/transcripts/">Browse all transcripts</a></div>';
  }
  if (!/^[a-z0-9][a-z0-9-]+$/.test(slug)) return fail('Transcript not found');

  let data;
  try {
    const r = await fetch('/api/transcript?slug=' + encodeURIComponent(slug) + '&locale=' + locale);
    if (r.status === 404) return fail('Transcript not found', 'It may have been moved or retired.');
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
  } catch (_e) {
    return fail('Could not load this transcript', 'Please retry in a moment.');
  }

  // Full text for entitled readers (admins today, subscribers once subscriptions open).
  let full = null;
  try {
    for (let i = 0; i < 100 && !window.kiraAuth; i++) await new Promise((res) => setTimeout(res, 20));
    const session = window.db ? (await window.db.auth.getSession()).data.session : null;
    if (session) {
      const r = await fetch('/api/transcript-content?slug=' + encodeURIComponent(slug) + '&locale=' + locale,
        { headers: { Authorization: 'Bearer ' + session.access_token } });
      if (r.ok) full = await r.json();
    }
  } catch (_e) { /* the free view still works */ }

  const sections = full ? full.sections : data.sections;
  const sources = full ? full.sources : data.sources;
  const locked = !full && data.lockedTurns > 0;

  // Markers are numbered in order of first use on the page.
  const order = [];
  const note = (t) => { if (!order.includes(t)) order.push(t); };
  data.summary.forEach((s) => [...s.matchAll(TAG)].forEach((m) => note(m[1])));
  sections.forEach((s) => s.turns.forEach((t) => [...t.text.matchAll(TAG)].forEach((m) => note(m[1]))));
  const chips = (text) => esc(text).replace(TAG, (_m, t) => {
    const src = sources[t];
    if (!src) return '';
    return '<a class="tv-chip ' + (t[0] === 'N' ? 'src' : 'fw') + '" href="#ref-' + t + '" title="' + esc(src.claim) + '">' + (order.indexOf(t) + 1) + '</a>';
  });

  const secHtml = sections.map((s, i) => {
    let prevA = false;
    const turns = s.turns.map((t) => {
      if (t.who === 'A' && prevA) return '<p>' + chips(t.text) + '</p>';
      const open = prevA ? '</div>' : '';
      prevA = t.who === 'A';
      return open + (t.who === 'Q'
        ? '<div class="tv-turn q"><div class="tv-who"><span class="tv-av q">KA</span>KIRA Analyst</div><p>' + esc(t.text) + '</p></div>'
        : '<div class="tv-turn a"><div class="tv-who"><span class="tv-av a">EX</span>Expert</div><p>' + chips(t.text) + '</p>');
    }).join('') + (prevA ? '</div>' : '');
    return '<section class="tv-sec" id="s' + (i + 1) + '"><h3><span class="no">' + String(i + 1).padStart(2, '0') + '</span>' + esc(s.title) + '</h3>' + turns + '</section>';
  }).join('');

  const toc = (full ? sections.map((s) => ({ title: s.title, locked: false })) : data.toc).map((t, i) =>
    '<li><a href="#' + (t.locked && !data.sections[i] ? 'tv-locked' : 's' + (i + 1)) + '"' + (t.locked ? ' class="locked"' : '') + '><span>' + esc(t.title) + '</span>' +
    (t.locked ? '<span class="lk">' + ic('lock') + '</span>' : '') + '</a></li>').join('');

  const lockedHtml = !locked ? '' :
    '<div class="tv-locked" id="tv-locked">' +
      '<div class="tv-ghost" aria-hidden="true">' +
        Array.from({ length: 3 }, () => '<div class="h"></div>' +
          '<div class="gq"><div class="w"></div><div class="l" style="width:72%"></div></div>' +
          '<div class="ga"><div class="w"></div><div class="l"></div><div class="l"></div><div class="l" style="width:88%"></div><div class="l" style="width:61%"></div></div>').join('') +
      '</div>' +
      '<div class="tv-lock"><div class="tv-lock-card">' + ic('lock') +
        '<h3>The rest of this interview is for subscribers</h3>' +
        '<p>You have read the opening ' + (data.totalTurns - data.lockedTurns) + ' of ' + data.totalTurns + ' turns. The full transcript, with every marked source, is part of the KIRA subscription.</p>' +
        '<a class="r-btn r-btn-primary" href="' + WAITLIST + '">Request early access</a>' +
        '<a class="alt" href="/auth.html" id="tv-signin">Already have access? Sign in</a>' +
      '</div></div>' +
    '</div>';

  const refs = order.filter((t) => sources[t]).map((t) => {
    const s = sources[t];
    const link = s.url ? ' · <a href="' + esc(s.url) + '" target="_blank" rel="noopener">link</a>' : '';
    return '<li id="ref-' + t + '"><span class="tv-chip static ' + (t[0] === 'N' ? 'src' : 'fw') + '">' + (order.indexOf(t) + 1) + '</span><div><div class="c">' + esc(s.claim) + '</div>' +
      '<div class="m">' + (t[0] === 'N' ? 'Public source' : 'KIRA field interviews') + ' · ' + esc(s.src) + link + '</div></div></li>';
  }).join('');
  const total = data.sourceCounts.public + data.sourceCounts.field;
  const hidden = total - order.filter((t) => sources[t]).length;

  root.innerHTML =
    '<div class="tv-wrap">' +
      '<aside class="tv-side">' +
        '<div class="tv-card"><h4>Expert profile</h4><div class="tv-role">' + esc(data.expert_role) + '</div>' +
          '<div class="tv-etype">' + esc(data.expert_type) + ' · profile drawn from KIRA field interviews</div><p class="tv-profile">' + esc(data.expert_profile) + '</p></div>' +
        '<div class="tv-card"><h4>Contents</h4><ol class="tv-toc">' + toc + '</ol></div>' +
        '<div class="tv-card"><h4>How to read the markers</h4><div class="tv-legend">' +
          '<div><span class="tv-chip static src">1</span><span>Public source, 2024–2026. Every number comes from one of these (' + data.sourceCounts.public + ' in this transcript).</span></div>' +
          '<div><span class="tv-chip static fw">2</span><span>How the trade works, as practitioners described it in KIRA\'s interviews (' + data.sourceCounts.field + ').</span></div>' +
        '</div></div>' +
      '</aside>' +
      '<div>' +
        '<div class="tv-head"><div class="tv-kicker">' + esc(data.interview_type) + ' · Expert interview</div>' +
          '<h1>' + esc(data.title) + '</h1>' +
          '<dl class="tv-meta"><div><dt>Format</dt><dd>' + esc(data.format) + '</dd></div><div><dt>As of</dt><dd>' + esc(data.as_of) + '</dd></div>' +
            '<div><dt>Market</dt><dd>' + esc(data.market) + '</dd></div><div><dt>Industry</dt><dd>' + esc(data.industry) + '</dd></div>' +
            '<div><dt>Length</dt><dd>' + esc(data.length_label || '') + '</dd></div></dl>' +
          '<div class="tv-tags">' + data.companies.map((c) => '<span class="tv-tag">' + esc(c) + '</span>').join('') + '</div>' +
          '<div class="tv-note"><b>' + esc(data.format) + '.</b> ' + esc(data.basis) + '</div>' +
        '</div>' +
        '<div class="tv-block"><h2>Summary</h2><ul class="tv-summary">' + data.summary.map((s) => '<li>' + chips(s) + '</li>').join('') + '</ul></div>' +
        '<div class="tv-block"><h2>Transcript</h2>' + secHtml + '</div>' +
        lockedHtml +
        '<div class="tv-block"><h2>Sources and basis</h2><ol class="tv-refs">' + refs + '</ol>' +
          (hidden > 0 ? '<p class="tv-refs-more">' + hidden + ' more sources are cited in the full transcript.</p>' : '') + '</div>' +
        '<div class="tv-block"><h2>About this transcript</h2><p class="tv-about">KIRA modelled interviews are built on our in-depth field interviews and follow the same question structure: business context, who decides, purchase criteria, channel economics, imports, regulation, technology and entry advice. Answers draw only on the sources listed. Channel-practice items reflect what practitioners told our analysts; sourced figures are current to their publication date.</p></div>' +
      '</div>' +
    '</div>';

  const signin = document.getElementById('tv-signin');
  if (signin) signin.addEventListener('click', () => {
    try { sessionStorage.setItem('kira_redirect_after_login', location.pathname); } catch (_e) { /* storage blocked */ }
  });

  // Head tags.
  const desc = data.blurb || '';
  document.title = data.title + ' — Kira Experts — KIRA Research';
  const set = (id, attr, v) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, v); };
  set('meta-description', 'content', desc);
  set('meta-og-title', 'content', data.title);
  set('meta-og-description', 'content', desc);
  set('meta-canonical', 'href', 'https://kiraresearch.com/' + locale + '/experts/transcripts/' + slug);
})();
