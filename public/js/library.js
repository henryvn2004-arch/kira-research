// Library list page (all locales). Needs /js/research-i18n.js first.
// Server-side filtering via /api/library-list; facet counts come from the same
// response and are counted over all published reports.
(function () {
  const R = window.kiraR, t = R.t, esc = R.esc, ic = R.icon, locale = R.locale;
  const PAGE = 20;
  const GROUPS = ['stage', 'type', 'country', 'sector', 'year'];          // sidebar groups
  const FILTERS = ['stage', 'type', 'country', 'sector', 'industry', 'year']; // + industry, set from links
  const SECTOR_KEYS = ['food', 'consumer', 'finance', 'tech', 'health', 'property', 'auto', 'logistics', 'energy', 'industrial', 'travel', 'services'];
  const STAGES = ['XPL', 'ENT', 'XPN'], TYPES = ['D', 'S'];
  const LIST_LIMIT = 8;               // options shown before "Show more"

  const app = document.getElementById('lib-app');
  const searchEl = document.getElementById('lib-search');
  const searchForm = document.getElementById('lib-search-form');
  if (!app) return;

  const state = { stage: '', type: '', country: '', sector: '', industry: '', year: '', q: '', sort: 'recent', page: 1 };
  const ui = { expanded: {}, collapsed: {}, find: {} };
  let facets = null, lastTotal = 0;

  // ── State from URL ──
  const u0 = new URLSearchParams(location.search);
  const st = (u0.get('stage') || '').toUpperCase(); if (STAGES.includes(st)) state.stage = st;
  const ty = (u0.get('type') || '').toUpperCase(); if (TYPES.includes(ty)) state.type = ty;
  if (u0.get('country')) state.country = u0.get('country').toLowerCase().slice(0, 60);
  if (u0.get('industry')) state.industry = u0.get('industry').toLowerCase().slice(0, 60);
  if (SECTOR_KEYS.includes(u0.get('sector'))) state.sector = u0.get('sector');
  if (/^\d{4}$/.test(u0.get('year') || '')) state.year = u0.get('year');
  if (u0.get('q')) state.q = u0.get('q').slice(0, 60);
  if (u0.get('sort') === 'oldest') state.sort = 'oldest';
  const p0 = parseInt(u0.get('page'), 10); if (p0 > 1) state.page = p0;
  if (searchEl) searchEl.value = state.q;

  function syncUrl() {
    const u = new URL(location.href);
    ['stage', 'type', 'country', 'sector', 'industry', 'year', 'q'].forEach(k => { if (state[k]) u.searchParams.set(k, state[k]); else u.searchParams.delete(k); });
    if (state.sort !== 'recent') u.searchParams.set('sort', state.sort); else u.searchParams.delete('sort');
    if (state.page > 1) u.searchParams.set('page', state.page); else u.searchParams.delete('page');
    u.searchParams.delete('filter');
    history.replaceState(null, '', u.pathname + u.search);
  }
  function setFilter(group, value) {
    if (!FILTERS.includes(group)) return;
    const v = state[group] === value ? '' : value;
    if (group === 'stage') state.stage = v; else if (group === 'type') state.type = v;
    else if (group === 'country') state.country = v; else if (group === 'industry') state.industry = v;
    else if (group === 'sector') state.sector = SECTOR_KEYS.includes(v) ? v : '';
    else state.year = v;
    state.page = 1;
    load();
  }
  function clearAll() {
    state.stage = state.type = state.country = state.sector = state.industry = state.year = state.q = '';
    state.page = 1;
    if (searchEl) searchEl.value = '';
    load();
  }
  const anyFilter = () => ['stage', 'type', 'country', 'sector', 'industry', 'year', 'q'].some(k => state[k]);

  // ── Facets ──
  function labelFor(group, value) {
    if (group === 'stage' || group === 'type') return t(value);
    if (group === 'country') return R.country(value);
    if (group === 'industry') return R.sector(value);
    if (group === 'sector') return t('sector_' + value);
    return String(value);
  }
  function options(group) {
    const f = facets || {};
    let list;
    if (group === 'stage') list = STAGES.map(v => [v, (f.stages || {})[v] || 0]);
    else if (group === 'type') list = TYPES.map(v => [v, (f.types || {})[v] || 0]);
    else if (group === 'country') list = Object.entries(f.countries || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    else if (group === 'sector') list = SECTOR_KEYS.map(k => [k, (f.sectors || {})[k] || 0]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    else list = Object.entries(f.years || {}).sort((a, b) => String(b[0]).localeCompare(String(a[0])));
    list = list.map(([v, n]) => ({ value: String(v), n, label: labelFor(group, v) }));
    if (state[group] && !list.some(o => o.value === state[group])) list.unshift({ value: state[group], n: 0, label: labelFor(group, state[group]) });
    return list;
  }
  const GROUP_LABEL = { stage: 'stage', type: 'type', country: 'market', sector: 'sector', year: 'year' };
  function groupHtml(group, where) {
    const all = options(group);
    if (!all.length) return '';
    const find = (ui.find[group] || '').toLowerCase();
    let opts = find ? all.filter(o => o.label.toLowerCase().includes(find) || o.value.includes(find)) : all;
    const long = !find && opts.length > LIST_LIMIT && !ui.expanded[group];
    if (long) opts = opts.filter((o, i) => i < LIST_LIMIT || o.value === state[group]);
    const searchable = group === 'country' && all.length > LIST_LIMIT;
    const id = where + '-' + group;
    return '<div class="fgrp' + (ui.collapsed[group] ? ' collapsed' : '') + '" data-group="' + group + '">' +
      '<button type="button" class="fgrp-head" aria-expanded="' + !ui.collapsed[group] + '" aria-controls="' + id + '">' +
        esc(t(GROUP_LABEL[group])) + ic('down') + '</button>' +
      '<div class="fgrp-body" id="' + id + '">' +
        (searchable ? '<label class="fgrp-find">' + ic('search') + '<input type="search" data-find="' + group + '" value="' + esc(ui.find[group] || '') + '" placeholder="' + esc(t(group === 'country' ? 'searchMarkets' : 'searchSectors')) + '" aria-label="' + esc(t(group === 'country' ? 'searchMarkets' : 'searchSectors')) + '"></label>' : '') +
        opts.map(o =>
          '<label class="fopt' + (o.n === 0 ? ' zero' : '') + '"><input type="checkbox" data-filter="' + group + '" value="' + esc(o.value) + '"' + (state[group] === o.value ? ' checked' : '') + '>' +
          '<span class="lbl">' + esc(o.label) + (group === 'type' && o.value === 'S' && o.n === 0 ? '<span class="soon">' + esc(t('coming')) + '</span>' : '') + '</span>' +
          '<span class="n">' + o.n + '</span></label>').join('') +
        (!find && all.length > LIST_LIMIT
          ? '<button type="button" class="r-link fgrp-more" data-more="' + group + '">' + esc(t(ui.expanded[group] ? 'showLess' : 'showMore')) + ic('down') + '</button>' : '') +
      '</div></div>';
  }
  function filtersHtml(where) { return GROUPS.map(g => groupHtml(g, where)).join(''); }

  // ── Skeleton ──
  app.innerHTML =
    '<div class="lib2">' +
      '<aside class="lib2-side" aria-label="' + esc(t('refineBy')) + '">' +
        '<div class="lib2-side-head"><h2>' + esc(t('refineBy')) + '</h2><button type="button" class="r-link" data-clear hidden>' + esc(t('clearAll')) + '</button></div>' +
        '<div class="lib2-filters" data-where="side"></div>' +
      '</aside>' +
      '<section class="lib2-main" aria-live="polite">' +
        '<div class="lib2-mobilebar">' +
          '<button type="button" class="r-btn r-btn-outline" data-open="filters">' + ic('filter') + esc(t('filters')) + '<span class="fcount"></span></button>' +
          '<button type="button" class="r-btn r-btn-outline" data-open="sort">' + esc(t('sort')) + ic('down') + '</button>' +
          '<span class="cnt"></span>' +
        '</div>' +
        '<div class="lib2-active"></div>' +
        '<div class="lib2-bar"><div class="lib2-count"></div>' +
          '<label class="lib2-sort">' + esc(t('sort')) + ' <select class="r-select" data-sort>' +
            '<option value="recent">' + esc(t('sortLatest')) + '</option><option value="oldest">' + esc(t('sortOldest')) + '</option></select></label></div>' +
        '<div class="lib2-rows"></div>' +
        '<nav class="pager" aria-label="Pages"></nav>' +
      '</section>' +
    '</div>' +
    '<div class="sheet" data-sheet="filters" role="dialog" aria-modal="true" aria-label="' + esc(t('filters')) + '">' +
      '<div class="sheet-scrim" data-close></div>' +
      '<div class="sheet-panel"><div class="sheet-grab"></div>' +
        '<div class="sheet-head"><h2>' + esc(t('filters')) + '</h2><div class="acts"><button type="button" class="r-link" data-clear>' + esc(t('clearAll')) + '</button>' +
          '<button type="button" class="x" data-close aria-label="' + esc(t('close')) + '">' + ic('x') + '</button></div></div>' +
        '<div class="sheet-body lib2-filters" data-where="sheet"></div>' +
        '<div class="sheet-foot"><button type="button" class="r-btn r-btn-primary r-btn-block" data-close data-showres></button></div>' +
      '</div></div>' +
    '<div class="sheet" data-sheet="sort" role="dialog" aria-modal="true" aria-label="' + esc(t('sort')) + '">' +
      '<div class="sheet-scrim" data-close></div>' +
      '<div class="sheet-panel"><div class="sheet-grab"></div>' +
        '<div class="sheet-head"><h2>' + esc(t('sort')) + '</h2><button type="button" class="x" data-close aria-label="' + esc(t('close')) + '">' + ic('x') + '</button></div>' +
        '<div class="sheet-body">' +
          '<label class="sortopt"><input type="radio" name="msort" value="recent">' + esc(t('sortLatest')) + '</label>' +
          '<label class="sortopt"><input type="radio" name="msort" value="oldest">' + esc(t('sortOldest')) + '</label>' +
        '</div>' +
        '<div class="sheet-foot"><button type="button" class="r-btn r-btn-primary r-btn-block" data-applysort>' + esc(t('apply')) + '</button></div>' +
      '</div></div>';

  const $ = s => app.querySelector(s);
  const rowsEl = $('.lib2-rows'), pagerEl = $('.pager');

  function renderFilters() {
    app.querySelectorAll('.lib2-filters').forEach(box => {
      const active = document.activeElement && box.contains(document.activeElement) && document.activeElement.dataset.find;
      box.innerHTML = filtersHtml(box.dataset.where);
      if (active) {   // keep typing focus in the option search box
        const inp = box.querySelector('[data-find="' + active + '"]');
        if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
      }
    });
    const on = anyFilter();
    app.querySelectorAll('[data-clear]').forEach(b => { b.hidden = !on; });
    const nSel = FILTERS.filter(g => state[g]).length;
    $('.fcount').textContent = nSel ? ' (' + nSel + ')' : '';
    $('.lib2-active').innerHTML = FILTERS.filter(g => state[g]).map(g =>
      '<button type="button" data-filter="' + g + '" value="' + esc(state[g]) + '">' + esc(labelFor(g, state[g])) + ic('x') + '</button>').join('');
    $('[data-sort]').value = state.sort;
  }

  function coverHtml(it, isNew) {
    const c = it.cover;
    return '<div class="cover-thumb">' +
      (c ? '<img src="' + esc(c.sm || c.thumb) + '" alt="" loading="lazy" decoding="async" width="228" height="304" data-fallback="' + esc(c.thumb) + '">'
         : '<div class="ph"><b>KIRA</b><span>' + esc(R.country(it.country)) + ' ' + esc(R.sector(it.industry)) + '</span></div>') +
      (isNew ? '<span class="tag-new">' + esc(t('newTag')) + '</span>' : '') +
    '</div>';
  }
  function rowHtml(it) {
    const isNew = it.published_at && (Date.now() - new Date(it.published_at).getTime()) < 30 * 864e5;
    const title = it.title || String(it.slug || '').replace(/-/g, ' ');
    const chips = [it.industry ? R.sector(it.industry) : '', it.stage ? t(it.stage) : ''].filter(Boolean);
    const pages = it.pages ? '<span>' + ic('pages') + esc(t('nPages', it.pages)) + '</span>' : '';
    return '<a class="lrow" href="/' + locale + '/reports/' + encodeURIComponent(it.slug) + '">' +
      coverHtml(it, isNew) +
      '<div class="lrow-body">' +
        '<div class="lrow-chips">' + chips.map(c => '<span class="chip">' + esc(c) + '</span>').join('') + '</div>' +
        '<h3>' + esc(title) + '</h3>' +
        (it.excerpt ? '<p>' + esc(it.excerpt) + '</p>' : '') +
        '<div class="meta">' +
          '<span>' + ic('doc') + esc(t(it.type || 'D')) + '</span>' + pages +
          (it.published_at ? '<span>' + ic('cal') + esc(R.date(it.published_at)) + '</span>' : '') +
          (it.country ? '<span>' + ic('globe') + esc(R.country(it.country)) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="go"><span class="r-btn r-btn-outline">' + esc(t('viewReport')) + ic('arrow') + '</span>' +
        '<span class="ic-chev">' + ic('chev') + '</span></div>' +
    '</a>';
  }
  function emptyHtml() {
    return '<div class="r-empty"><div class="r-empty-ic">' + ic('search') + '</div>' +
      '<h3>' + esc(t('noneTitle')) + '</h3><p>' + esc(t('noneBody')) + '</p>' +
      '<div class="acts"><button type="button" class="r-btn r-btn-primary" data-clear>' + esc(t('clearFilters')) + '</button>' +
      '<a class="r-btn r-btn-outline" href="/' + locale + '/library">' + esc(t('browseAll')) + '</a></div></div>';
  }
  function pagerHtml(pages) {
    if (pages <= 1) return '';
    const p = state.page, set = new Set([1, pages, p - 1, p, p + 1].filter(n => n >= 1 && n <= pages));
    const nums = [...set].sort((a, b) => a - b);
    let out = '<button type="button" data-page="' + (p - 1) + '"' + (p === 1 ? ' disabled' : '') + ' aria-label="' + esc(t('prev')) + '">' + '<span style="transform:scaleX(-1);display:inline-flex">' + ic('chev') + '</span></button>';
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) out += '<span class="gap">…</span>';
      out += '<button type="button" data-page="' + n + '"' + (n === p ? ' aria-current="page"' : '') + '>' + n + '</button>';
    });
    return out + '<button type="button" data-page="' + (p + 1) + '"' + (p === pages ? ' disabled' : '') + ' aria-label="' + esc(t('next')) + '">' + ic('chev') + '</button>';
  }

  let seq = 0;
  async function load() {
    const my = ++seq;
    syncUrl();
    renderFilters();
    rowsEl.style.opacity = '.55';
    const qs = new URLSearchParams({ locale, sort: state.sort, limit: String(PAGE), offset: String((state.page - 1) * PAGE) });
    ['stage', 'type', 'country', 'sector', 'industry', 'year', 'q'].forEach(k => { if (state[k]) qs.set(k, state[k]); });
    try {
      const r = await fetch('/api/library-list?' + qs);
      if (!r.ok) throw new Error('http ' + r.status);
      const d = await r.json();
      if (my !== seq) return;
      facets = d.facets || facets;
      lastTotal = d.total || 0;
      const pages = Math.max(1, Math.ceil(lastTotal / PAGE));
      if (state.page > pages) { state.page = pages; return load(); }
      renderFilters();
      $('.lib2-count').innerHTML = '<strong>' + esc(t('reports', lastTotal)) + '</strong>' + (pages > 1 ? '<span class="pg">(' + esc(t('page', state.page, pages)) + ')</span>' : '');
      $('.lib2-mobilebar .cnt').textContent = t('reports', lastTotal);
      app.querySelector('[data-showres]').textContent = t('showResults', lastTotal);
      rowsEl.innerHTML = (d.items || []).length ? d.items.map(rowHtml).join('') : emptyHtml();
      pagerEl.innerHTML = pagerHtml(pages);
    } catch (_e) {
      if (my !== seq) return;
      rowsEl.innerHTML = '<div class="r-empty"><p>' + esc(t('loadError')) + '</p></div>';
    } finally {
      if (my === seq) rowsEl.style.opacity = '';
    }
  }

  // ── Events (delegated; filter markup is re-rendered on every load) ──
  // Small list thumbnail missing (older cover): fall back to the full thumbnail once.
  app.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName === 'IMG' && img.dataset.fallback) { const f = img.dataset.fallback; delete img.dataset.fallback; img.src = f; }
  }, true);
  app.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.filter) setFilter(el.dataset.filter, el.value);
    else if (el.matches('[data-sort]')) { state.sort = el.value === 'oldest' ? 'oldest' : 'recent'; state.page = 1; load(); }
  });
  app.addEventListener('input', e => {
    const g = e.target.dataset.find;
    if (g && GROUPS.includes(g)) { ui.find[g] = e.target.value.slice(0, 40); renderFilters(); }
  });
  app.addEventListener('click', e => {
    const b = e.target.closest('button, [data-close]');
    if (!b) return;
    if (b.matches('.lib2-active [data-filter]')) return setFilter(b.dataset.filter, b.value);
    if (b.hasAttribute('data-clear')) return clearAll();
    if (b.matches('.fgrp-head')) { const g = b.parentElement.dataset.group; if (GROUPS.includes(g)) { ui.collapsed[g] = !ui.collapsed[g]; renderFilters(); } return; }
    if (b.dataset.more && GROUPS.includes(b.dataset.more)) { ui.expanded[b.dataset.more] = !ui.expanded[b.dataset.more]; renderFilters(); return; }
    if (b.dataset.page) { const n = parseInt(b.dataset.page, 10); if (n >= 1) { state.page = n; load(); app.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    if (b.dataset.open) return openSheet(b.dataset.open);
    if (b.hasAttribute('data-applysort')) {
      const v = (app.querySelector('input[name="msort"]:checked') || {}).value;
      state.sort = v === 'oldest' ? 'oldest' : 'recent'; state.page = 1; closeSheets(); load(); return;
    }
    if (b.hasAttribute('data-close')) closeSheets();
  });
  let lastFocus = null;
  function openSheet(name) {
    const s = app.querySelector('[data-sheet="' + (name === 'sort' ? 'sort' : 'filters') + '"]');
    if (!s) return;
    if (name === 'sort') { const r = app.querySelector('input[name="msort"][value="' + state.sort + '"]'); if (r) r.checked = true; }
    lastFocus = document.activeElement;
    s.classList.add('open'); document.body.style.overflow = 'hidden';
    const x = s.querySelector('.x'); if (x) x.focus();
  }
  function closeSheets() {
    app.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open'));
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheets(); });

  // ── Search (hero) ──
  let timer = null;
  function runSearch() { state.q = (searchEl.value || '').trim().slice(0, 60); state.page = 1; load(); }
  if (searchEl) searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 300); });
  if (searchForm) searchForm.addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); runSearch(); });

  load();
})();
