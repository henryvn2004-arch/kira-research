// Insights list page (all locales). Needs /js/research-i18n.js first.
// Featured article + card grid from /api/insights-list; sidebar holds the
// newsletter sign-up (waitlist, source=insights) and the latest reports.
(function () {
  const R = window.kiraR, t = R.t, esc = R.esc, ic = R.icon, locale = R.locale;
  // Page 1 without a search holds the featured article + 12 cards (13);
  // every other page holds 12 cards, so the 3-column grid stays full.
  const PAGE = 12, FIRST = 13;
  const root = document.getElementById('ins-app');
  const chipsEl = document.getElementById('ins-chips');
  const searchEl = document.getElementById('ins-search');
  const searchForm = document.getElementById('ins-search-form');
  if (!root) return;

  // Chips: markets and sectors with the most published articles.
  const MARKETS = ['vietnam', 'indonesia', 'malaysia', 'thailand', 'philippines', 'singapore', 'japan'];
  const SECTORS = ['fintech', 'tourism', 'retail', 'fmcg', 'healthcare'];
  const SECTOR_LABEL = { fmcg: 'FMCG' };
  const ALLOWED = new Set(MARKETS.concat(SECTORS));

  const p0 = new URLSearchParams(location.search);
  let cat = ALLOWED.has((p0.get('cat') || '').toLowerCase()) ? p0.get('cat').toLowerCase() : '';
  let q = (p0.get('q') || '').slice(0, 64);
  let page = Math.max(1, parseInt(p0.get('page'), 10) || 1);
  if (searchEl) searchEl.value = q;

  function chipsHtml() {
    const b = (v, label) => '<button type="button" data-cat="' + v + '" aria-pressed="' + (cat === v) + '">' + esc(label) + '</button>';
    return b('', t('all')) + MARKETS.map(m => b(m, R.country(m))).join('') + '<span class="div" aria-hidden="true"></span>' +
      SECTORS.map(s => b(s, SECTOR_LABEL[s] || R.sector(s))).join('');
  }
  function syncUrl() {
    const u = new URLSearchParams();
    if (cat) u.set('cat', cat);
    if (q) u.set('q', q);
    if (page > 1) u.set('page', String(page));
    history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
  }

  const minutes = rt => { const m = String(rt || '').match(/\d+/); return m ? m[0] + ' ' + t('minRead') : ''; };
  const kicker = it => [it.country ? R.country(it.country) : '', it.industry ? R.sector(it.industry) : ''].filter(Boolean).join(' · ');
  const href = it => '/' + locale + '/insights/' + encodeURIComponent(it.slug);
  const img = (c, w) => c ? '<img src="' + esc(w ? c.wide : c.full) + '" alt="" loading="lazy" decoding="async" width="800" height="500">' : '';

  function featuredHtml(it) {
    return '<a class="ins-feature" href="' + href(it) + '">' +
      '<div class="img">' + img(it.cover, false) + '<span class="pill">' + esc(t('featured')) + '</span></div>' +
      '<div class="body">' +
        '<div class="kick"><span>' + esc(kicker(it)) + '</span><span class="d">' + esc([R.date(it.published_at), minutes(it.read_time)].filter(Boolean).join(' · ')) + '</span></div>' +
        '<h2>' + esc(it.title || it.slug) + '</h2>' +
        (it.excerpt ? '<p>' + esc(it.excerpt) + '</p>' : '') +
        '<div class="foot"><span class="by">' + ic('user') + esc(t('byTeam')) + '</span><span class="go">' + esc(t('readArticle')) + ic('arrow') + '</span></div>' +
      '</div></a>';
  }
  function cardHtml(it) {
    return '<a class="rcard" href="' + href(it) + '"><div class="img">' + img(it.cover, true) + '</div>' +
      '<div class="body"><div class="kick"><span>' + esc(kicker(it)) + '</span><span class="d">' + esc(R.date(it.published_at)) + '</span></div>' +
      '<h3>' + esc(it.title || it.slug) + '</h3>' + (it.excerpt ? '<p>' + esc(it.excerpt) + '</p>' : '') +
      '<div class="foot"><span>' + esc(minutes(it.read_time)) + '</span><span class="go">' + esc(t('readArticle')) + ic('arrow') + '</span></div></div></a>';
  }
  function pagerHtml(pages) {
    if (pages <= 1) return '';
    const set = [...new Set([1, pages, page - 1, page, page + 1].filter(n => n >= 1 && n <= pages))].sort((a, b) => a - b);
    let out = '<button type="button" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="' + esc(t('prev')) + '"><span style="transform:scaleX(-1);display:inline-flex">' + ic('chev') + '</span></button>';
    set.forEach((n, i) => {
      if (i && n - set[i - 1] > 1) out += '<span class="gap">…</span>';
      out += '<button type="button" data-page="' + n + '"' + (n === page ? ' aria-current="page"' : '') + '>' + n + '</button>';
    });
    return out + '<button type="button" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="' + esc(t('next')) + '">' + ic('chev') + '</button>';
  }

  root.innerHTML =
    '<div class="ins-wrap">' +
      '<div class="ins-main" aria-live="polite"><div class="ins-list"></div><nav class="pager" aria-label="Pages"></nav></div>' +
      '<aside class="ins-side">' +
        '<div class="ins-box soft"><div class="ib">' + ic('mail') + '</div><h3>' + esc(t('subscribeTitle')) + '</h3><p>' + esc(t('subscribeBody')) + '</p>' +
          '<form id="ins-sub" novalidate><input type="email" id="ins-sub-email" required autocomplete="email" placeholder="' + esc(t('emailPh')) + '" aria-label="' + esc(t('emailPh')) + '">' +
          '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
          '<button type="submit" class="r-btn r-btn-primary r-btn-block">' + esc(t('subscribe')) + '</button><p class="msg" hidden></p></form></div>' +
        '<div class="ins-box"><h3>' + esc(t('latestReports')) + '</h3><div class="mini-list" id="ins-reports"></div></div>' +
        '<div class="ins-box soft"><div class="ib">' + ic('book') + '</div><h3>' + esc(t('exploreLib')) + '</h3><p>' + esc(t('exploreLibBody')) + '</p>' +
          '<a class="r-btn r-btn-primary r-btn-block" href="/' + locale + '/library">' + esc(t('browseLib')) + ic('arrow') + '</a></div>' +
      '</aside>' +
    '</div>';
  const listEl = root.querySelector('.ins-list'), pagerEl = root.querySelector('.pager');

  let seq = 0;
  async function load() {
    const my = ++seq;
    syncUrl();
    if (chipsEl) chipsEl.innerHTML = chipsHtml();
    listEl.style.opacity = '.55';
    const lead = q ? PAGE : FIRST;
    const qs = new URLSearchParams({ locale, limit: String(page === 1 ? lead : PAGE), offset: String(page === 1 ? 0 : lead + (page - 2) * PAGE) });
    if (cat) qs.set('category', cat);
    if (q) qs.set('q', q);
    try {
      const r = await fetch('/api/insights-list?' + qs);
      if (!r.ok) throw new Error('http ' + r.status);
      const d = await r.json();
      if (my !== seq) return;
      const items = d.items || [];
      const total = d.total || 0;
      const pages = total <= lead ? 1 : 1 + Math.ceil((total - lead) / PAGE);
      if (!items.length) {
        listEl.innerHTML = '<div class="r-empty"><div class="r-empty-ic">' + ic('search') + '</div><p>' + esc(t('noInsights')) + '</p></div>';
      } else if (page === 1 && !q) {
        const f = items.find(i => i.featured && i.cover) || items.find(i => i.cover) || items[0];
        const rest = items.filter(i => i !== f);
        listEl.innerHTML = featuredHtml(f) + (rest.length ? '<div class="ins-head"><h2>' + esc(t('latest')) + '</h2></div><div class="ins-grid">' + rest.map(cardHtml).join('') + '</div>' : '');
      } else {
        listEl.innerHTML = '<div class="ins-grid">' + items.map(cardHtml).join('') + '</div>';
      }
      pagerEl.innerHTML = pagerHtml(pages);
    } catch (_e) {
      if (my === seq) listEl.innerHTML = '<div class="r-empty"><p>' + esc(t('loadError')) + '</p></div>';
    } finally {
      if (my === seq) listEl.style.opacity = '';
    }
  }

  async function loadReports() {
    const box = document.getElementById('ins-reports');
    try {
      const r = await fetch('/api/library-list?locale=' + locale + '&limit=4&sort=recent');
      const d = await r.json();
      box.innerHTML = (d.items || []).map(it =>
        '<a class="mini" href="/' + locale + '/reports/' + encodeURIComponent(it.slug) + '">' +
          '<div class="img">' + (it.cover ? '<img src="' + esc(it.cover.wide) + '" alt="" loading="lazy" width="800" height="500">' : '') + '</div>' +
          '<div><span class="k">' + esc(R.country(it.country)) + '</span><b>' + esc(it.title || it.slug) + '</b></div>' +
          '<span class="ic-chev">' + ic('chev') + '</span></a>').join('');
    } catch (_e) { box.closest('.ins-box').hidden = true; }
  }

  // Events
  if (chipsEl) chipsEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    const v = b.dataset.cat;
    cat = (v === '' || ALLOWED.has(v)) && cat !== v ? v : '';
    page = 1; load();
  });
  pagerEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-page]');
    if (!b || b.disabled) return;
    page = Math.max(1, parseInt(b.dataset.page, 10) || 1);
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  let timer = null;
  const runSearch = () => { q = (searchEl.value || '').trim().slice(0, 64); page = 1; load(); };
  if (searchEl) searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 300); });
  if (searchForm) searchForm.addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); runSearch(); });

  const sub = document.getElementById('ins-sub');
  sub.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = sub.querySelector('.msg'), email = document.getElementById('ins-sub-email').value.trim();
    msg.hidden = false; msg.className = 'msg';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = t('subscribeErr'); msg.className = 'msg err'; return; }
    const btn = sub.querySelector('button'); btn.disabled = true;
    try {
      const r = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale, source: 'insights', hp: sub.querySelector('[name=hp]').value }) });
      if (!r.ok) throw new Error('http ' + r.status);
      msg.textContent = t('subscribed');
      sub.querySelector('input[type=email]').value = '';
    } catch (_e) { msg.textContent = t('subscribeErr'); msg.className = 'msg err'; }
    btn.disabled = false;
  });

  load();
  loadReports();
})();
