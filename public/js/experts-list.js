// Kira Experts transcript listing (/en/experts/transcripts/). Same layout and classes as the
// library list (research.css: lib2, fgrp, fopt, lrow, sheet). Data: transcripts/catalog.json,
// filtered in the browser. Needs /js/research-i18n.js first.
(function () {
  const R = window.kiraR, t = R.t, esc = R.esc, ic = R.icon;
  const app = document.getElementById('xt-app');
  const searchEl = document.getElementById('lib-search');
  const searchForm = document.getElementById('lib-search-form');
  if (!app || !R) return;

  const BASE = '/en/experts/transcripts/';
  // Interview types (fixed list, also used to colour the row thumbnail).
  const TYPES = ['Market assessment', 'Market entry', 'Distribution & channels', 'Partner search',
    'Competitive landscape', 'Pricing & margins', 'Regulation', 'Customer voice'];
  const GROUPS = [
    { key: 'interview_type', param: 'type', label: 'Interview type' },
    { key: 'market', param: 'market', label: t('market') },
    { key: 'industry', param: 'industry', label: 'Industry' },
    { key: 'expert_group', param: 'expert', label: 'Expert' },
  ];
  const plural = (n) => n + (n === 1 ? ' transcript' : ' transcripts');
  const state = { interview_type: '', market: '', industry: '', expert_group: '', q: '', sort: 'recent' };
  const ui = { collapsed: {} };
  let items = [];

  const u0 = new URLSearchParams(location.search);
  GROUPS.forEach((g) => { if (u0.get(g.param)) state[g.key] = u0.get(g.param).slice(0, 80); });
  if (u0.get('q')) state.q = u0.get('q').slice(0, 60);
  if (u0.get('sort') === 'oldest') state.sort = 'oldest';
  if (searchEl) searchEl.value = state.q;

  const anyFilter = () => state.q || GROUPS.some((g) => state[g.key]);
  function syncUrl() {
    const u = new URL(location.href);
    GROUPS.forEach((g) => { if (state[g.key]) u.searchParams.set(g.param, state[g.key]); else u.searchParams.delete(g.param); });
    if (state.q) u.searchParams.set('q', state.q); else u.searchParams.delete('q');
    if (state.sort !== 'recent') u.searchParams.set('sort', state.sort); else u.searchParams.delete('sort');
    history.replaceState(null, '', u.pathname + u.search);
  }
  function textMatch(it) {
    const term = state.q.trim().toLowerCase();
    if (!term) return true;
    const hay = [it.title, it.interview_type, it.market, it.industry, it.expert, it.blurb].concat(it.companies || []).join(' ').toLowerCase();
    return term.split(/\s+/).every((w) => hay.includes(w));
  }
  // A group's counts ignore that group's own selection, so each count is what a click would show.
  const match = (it, skip) => textMatch(it) && GROUPS.every((g) => g.key === skip || !state[g.key] || it[g.key] === state[g.key]);

  function groupHtml(g, where) {
    const counts = {};
    items.forEach((it) => { if (match(it, g.key)) counts[it[g.key]] = (counts[it[g.key]] || 0) + 1; });
    const opts = [...new Set(items.map((it) => it[g.key]))].sort().map((v) => ({ v, n: counts[v] || 0 }));
    if (!opts.length) return '';
    const id = where + '-' + g.key;
    return '<div class="fgrp' + (ui.collapsed[g.key] ? ' collapsed' : '') + '" data-group="' + g.key + '">' +
      '<button type="button" class="fgrp-head" aria-expanded="' + !ui.collapsed[g.key] + '" aria-controls="' + id + '">' + esc(g.label) + ic('down') + '</button>' +
      '<div class="fgrp-body" id="' + id + '">' +
        opts.map((o) => '<label class="fopt' + (o.n === 0 ? ' zero' : '') + '"><input type="checkbox" data-filter="' + g.key + '" value="' + esc(o.v) + '"' + (state[g.key] === o.v ? ' checked' : '') + '>' +
          '<span class="lbl">' + esc(o.v) + '</span><span class="n">' + o.n + '</span></label>').join('') +
      '</div></div>';
  }
  const filtersHtml = (where) => GROUPS.map((g) => groupHtml(g, where)).join('');

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

  const $ = (s) => app.querySelector(s);
  const rowsEl = $('.lib2-rows');

  function rowHtml(it) {
    const initials = it.expert.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
    return '<a class="lrow" href="' + BASE + encodeURIComponent(it.slug) + '">' +
      '<div class="cover-thumb"><div class="ph xt-ph" data-t="' + Math.max(0, TYPES.indexOf(it.interview_type)) + '"><span class="xt-ph-av">' + esc(initials) + '</span><b>KIRA</b><span>' + esc(it.interview_type || 'Expert interview') + '</span></div></div>' +
      '<div class="lrow-body">' +
        '<div class="lrow-chips"><span class="chip">' + esc(it.interview_type) + '</span><span class="chip">' + esc(it.industry) + '</span><span class="chip xt-fmt">' + esc(it.format) + '</span></div>' +
        '<h3>' + esc(it.title) + '</h3>' +
        '<p>' + esc(it.blurb) + '</p>' +
        '<div class="meta">' +
          '<span>' + ic('user') + esc(it.expert) + '</span>' +
          '<span>' + ic('cal') + esc(it.as_of) + '</span>' +
          '<span>' + ic('globe') + esc(it.market) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="go"><span class="r-btn r-btn-outline">Read transcript' + ic('arrow') + '</span><span class="ic-chev">' + ic('chev') + '</span></div>' +
    '</a>';
  }
  function emptyHtml() {
    return '<div class="r-empty"><div class="r-empty-ic">' + ic('search') + '</div>' +
      '<h3>No transcripts found</h3><p>No transcript matches these filters yet. Try removing a filter, or ask us for a custom interview.</p>' +
      '<div class="acts"><button type="button" class="r-btn r-btn-primary" data-clear>' + esc(t('clearFilters')) + '</button>' +
      '<a class="r-btn r-btn-outline" href="/en/experts/#request">Request a custom interview</a></div></div>';
  }

  function render() {
    syncUrl();
    app.querySelectorAll('.lib2-filters').forEach((box) => { box.innerHTML = filtersHtml(box.dataset.where); });
    app.querySelectorAll('[data-clear]').forEach((b) => { b.hidden = !anyFilter(); });
    const nSel = GROUPS.filter((g) => state[g.key]).length;
    $('.fcount').textContent = nSel ? ' (' + nSel + ')' : '';
    $('.lib2-active').innerHTML = GROUPS.filter((g) => state[g.key]).map((g) =>
      '<button type="button" data-filter="' + g.key + '" value="' + esc(state[g.key]) + '">' + esc(state[g.key]) + ic('x') + '</button>').join('');
    $('[data-sort]').value = state.sort;
    const byDate = (a, b) => (a.published || '').localeCompare(b.published || '') || a.title.localeCompare(b.title);
    const shown = items.filter((it) => match(it)).sort(state.sort === 'oldest' ? byDate : (a, b) => byDate(b, a));
    $('.lib2-count').innerHTML = '<strong>' + esc(plural(shown.length)) + '</strong>';
    $('.lib2-mobilebar .cnt').textContent = plural(shown.length);
    $('[data-showres]').textContent = t('showResults', shown.length);
    rowsEl.innerHTML = shown.length ? shown.map(rowHtml).join('') : emptyHtml();
  }

  function setFilter(key, value) {
    if (!GROUPS.some((g) => g.key === key)) return;
    state[key] = state[key] === value ? '' : value;
    render();
  }
  function clearAll() {
    GROUPS.forEach((g) => { state[g.key] = ''; });
    state.q = '';
    if (searchEl) searchEl.value = '';
    render();
  }

  app.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.filter) setFilter(el.dataset.filter, el.value);
    else if (el.matches('[data-sort]')) { state.sort = el.value === 'oldest' ? 'oldest' : 'recent'; render(); }
  });
  app.addEventListener('click', (e) => {
    const b = e.target.closest('button, [data-close]');
    if (!b) return;
    if (b.matches('.lib2-active [data-filter]')) return setFilter(b.dataset.filter, b.value);
    if (b.hasAttribute('data-clear')) return clearAll();
    if (b.matches('.fgrp-head')) { const g = b.parentElement.dataset.group; ui.collapsed[g] = !ui.collapsed[g]; render(); return; }
    if (b.dataset.open) return openSheet(b.dataset.open);
    if (b.hasAttribute('data-applysort')) {
      const v = (app.querySelector('input[name="msort"]:checked') || {}).value;
      state.sort = v === 'oldest' ? 'oldest' : 'recent'; closeSheets(); render(); return;
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
    app.querySelectorAll('.sheet.open').forEach((s) => s.classList.remove('open'));
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheets(); });

  let timer = null;
  function runSearch() { state.q = (searchEl.value || '').trim().slice(0, 60); render(); }
  if (searchEl) searchEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 250); });
  if (searchForm) searchForm.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); runSearch(); });

  fetch('/api/transcript-list?locale=en')
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => { items = data.items || []; render(); })
    .catch(() => { rowsEl.innerHTML = '<div class="r-empty"><p>' + esc(t('loadError')) + '</p></div>'; });
})();
