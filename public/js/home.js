// Homepage (all locales). Needs /js/research-i18n.js first.
// Everything shown is live: report and insight cards, counts per sector and
// per market and the featured report all come from the library and insights
// APIs. Nothing is invented while loading: numbers stay
// "—" until the data arrives.
(function () {
  const R = window.kiraR, t = R.t, esc = R.esc, ic = R.icon, locale = R.locale;
  const $ = s => document.querySelector(s);
  const SECTOR_ICON = {
    food: '<path d="M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-1.7 1.5-2.5 3.6-2.5 6.5V13h3V21"/>',
    consumer: '<path d="M4 5h2l2 11h10l2-8H7"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
    finance: '<path d="M3 9l9-5 9 5M5 9v9M10 9v9M14 9v9M19 9v9M3 20h18"/>',
    tech: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    health: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    property: '<path d="M3 21V9l7-5 7 5v12M10 21v-6h4v6M17 11h4v10"/>',
    auto: '<path d="M4 16l1.5-5a2 2 0 0 1 2-1.5h9a2 2 0 0 1 2 1.5L20 16v3h-3v-2H7v2H4z"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
    logistics: '<path d="M2 7h11v9H2zM13 10h4l4 3v3h-8"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
    energy: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    industrial: '<path d="M3 21V10l5 3V10l5 3V10l5 3V5h3v16z"/>',
    travel: '<path d="M2 16l20-8-3 9-6-2-3 4-1-5z"/>',
    services: '<path d="M3 8l9-4 9 4-9 4zM7 10v5c3 2 7 2 10 0v-5"/>'
  };
  const MARKETS = {
    asean: ['vietnam', 'thailand', 'indonesia', 'malaysia', 'singapore', 'philippines', 'cambodia', 'laos', 'myanmar', 'brunei'],
    apac: ['japan', 'south korea', 'taiwan', 'australia', 'new zealand']
  };
  const CODE = { vietnam: 'VN', thailand: 'TH', indonesia: 'ID', malaysia: 'MY', singapore: 'SG', philippines: 'PH', cambodia: 'KH', laos: 'LA', myanmar: 'MM', brunei: 'BN', japan: 'JP', 'south korea': 'KR', taiwan: 'TW', australia: 'AU', 'new zealand': 'NZ' };
  const svg = p => '<svg class="ic" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const reportHref = it => '/' + locale + '/reports/' + encodeURIComponent(it.slug);

  // Hero search → library
  const form = $('#home-search');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const q = (form.querySelector('input').value || '').trim().slice(0, 60);
    location.href = '/' + locale + '/library' + (q ? '?q=' + encodeURIComponent(q) : '');
  });

  function reportCard(it, featured) {
    return '<a class="rcard" href="' + reportHref(it) + '">' +
      '<div class="img">' + (it.cover ? '<img src="' + esc(it.cover.wide) + '" alt="" loading="lazy" decoding="async" width="800" height="500">' : '') +
        (featured ? '<span class="home-pill">' + esc(t('newTag')) + '</span>' : '') + '</div>' +
      '<div class="body"><div class="kick"><span>' + esc([R.country(it.country), it.sector ? t('sector_' + it.sector) : it.industry].filter(Boolean).join(' · ')) + '</span>' +
        '<span class="d">' + esc(R.date(it.published_at)) + '</span></div>' +
        '<h3>' + esc(it.title || it.slug) + '</h3>' + (it.excerpt ? '<p>' + esc(it.excerpt) + '</p>' : '') +
        '<div class="foot"><span class="meta"><span>' + ic('doc') + esc(t(it.type || 'D')) + '</span>' +
          (it.pages ? '<span>' + ic('pages') + esc(t('nPages', it.pages)) + '</span>' : '') + '</span>' +
          '<span class="home-go" aria-hidden="true">' + ic('arrow') + '</span></div></div></a>';
  }
  function insightCard(it) {
    const m = (String(it.read_time || '').match(/\d+/) || [])[0];
    return '<a class="rcard" href="/' + locale + '/insights/' + encodeURIComponent(it.slug) + '">' +
      '<div class="img">' + (it.cover ? '<img src="' + esc(it.cover.wide) + '" alt="" loading="lazy" decoding="async" width="800" height="500">' : '') + '</div>' +
      '<div class="body"><div class="kick"><span>' + esc([R.country(it.country), R.sector(it.industry)].filter(Boolean).join(' · ')) + '</span>' +
        '<span class="d">' + esc(R.date(it.published_at)) + '</span></div>' +
        '<h3>' + esc(it.title || it.slug) + '</h3>' + (it.excerpt ? '<p>' + esc(it.excerpt) + '</p>' : '') +
        '<div class="foot"><span>' + (m ? esc(m + ' ' + t('minRead')) : '') + '</span><span class="home-go" aria-hidden="true">' + ic('arrow') + '</span></div></div></a>';
  }

  async function loadReports() {
    try {
      const r = await fetch('/api/library-list?locale=' + locale + '&limit=24&sort=recent');
      const d = await r.json();
      const items = d.items || [], f = d.facets || {};
      const total = f.totalPublished != null ? f.totalPublished : d.total;
      document.querySelectorAll('[data-stat="reports"]').forEach(el => { el.textContent = total; });
      const withCover = items.filter(i => i.cover);

      // Latest reports: newest four
      const grid = $('#home-reports');
      if (grid) grid.innerHTML = items.slice(0, 4).map((it, i) => reportCard(it, i === 0)).join('');

      // Sectors with live counts (largest first, 7 shown + more)
      const sectors = Object.entries(f.sectors || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      const sg = $('#home-sectors');
      if (sg) sg.innerHTML = sectors.slice(0, 7).map(([k, n]) =>
        '<a class="home-tile" href="/' + locale + '/library?sector=' + encodeURIComponent(k) + '">' +
          '<span class="ib">' + svg(SECTOR_ICON[k] || '') + '</span><b>' + esc(t('sector_' + k)) + '</b><span>' + esc(t('reports', n)) + '</span></a>').join('') +
        '<a class="home-tile more" href="/' + locale + '/library"><span class="ib">' + ic('arrow') + '</span><b>' + esc(t('moreSectors')) + '</b><span>' + esc(t('sectorsCount', sectors.length)) + '</span></a>';
      document.querySelectorAll('[data-stat="sectors"]').forEach(el => { el.textContent = sectors.length; });

      // Markets with live counts
      const counts = f.countries || {};
      const row = m => {
        const n = counts[m] || 0;
        return '<a class="home-mkt' + (n ? '' : ' zero') + '" href="/' + locale + '/library?country=' + encodeURIComponent(m) + '">' +
          '<span class="code">' + CODE[m] + '</span><span class="nm">' + esc(R.country(m)) + '</span>' +
          '<span class="n">' + (n ? esc(t('reports', n)) : '—') + '</span></a>';
      };
      const mk = $('#home-markets');
      if (mk) mk.innerHTML =
        '<div class="grp"><h3>' + esc(t('regionAsean')) + '</h3>' + MARKETS.asean.map(row).join('') + '</div>' +
        '<div class="grp"><h3>' + esc(t('regionApac')) + '</h3>' + MARKETS.apac.map(row).join('') + '</div>';

      // Featured report: the newest one with a cover
      const ft = withCover[0] || items[0];
      const fe = $('#home-featured');
      if (fe && ft) fe.innerHTML =
        '<div class="k">' + esc(t('featuredReport')) + '</div>' +
        '<a class="home-ft" href="' + reportHref(ft) + '">' +
          '<div class="cover-thumb">' + (ft.cover ? '<img src="' + esc(ft.cover.thumb) + '" alt="" loading="lazy" width="360" height="480">' : '') + '</div>' +
          '<div class="kick">' + esc([R.country(ft.country), ft.sector ? t('sector_' + ft.sector) : ''].filter(Boolean).join(' · ')) + '</div>' +
          '<h3>' + esc(ft.title || ft.slug) + '</h3>' + (ft.excerpt ? '<p>' + esc(ft.excerpt) + '</p>' : '') +
          '<span class="r-link">' + esc(t('viewReport')) + ' →</span></a>';
    } catch (_e) { /* the static skeleton stays; links still work */ }
  }

  async function loadInsights() {
    const grid = $('#home-insights');
    if (!grid) return;
    try {
      const r = await fetch('/api/insights-list?locale=' + locale + '&limit=8');
      const d = await r.json();
      const items = (d.items || []).filter(i => i.cover).concat((d.items || []).filter(i => !i.cover)).slice(0, 4);
      if (items.length) grid.innerHTML = items.map(insightCard).join('');
    } catch (_e) { /* keep skeleton */ }
  }

  loadReports();
  loadInsights();
})();
