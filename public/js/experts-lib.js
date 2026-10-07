// Kira Experts transcripts. Two modes, set on #xt-grid's container:
//   landing (/en/experts/):            the newest transcripts + a search box that opens the listing
//   list    (/en/experts/transcripts/): facets (market, industry, expert), search, sort, URL state
(function () {
  const grid = document.getElementById('xt-grid');
  if (!grid) return;
  const LIST = '/en/experts/transcripts/';
  const isList = !!document.getElementById('xt-facets');
  const q = document.getElementById('xt-q');
  const form = document.getElementById('xt-form');
  const count = document.getElementById('xt-count');
  const empty = document.getElementById('xt-empty');
  const FACETS = [
    { key: 'market', label: 'Market' },
    { key: 'industry', label: 'Industry' },
    { key: 'expert_group', label: 'Expert' },
  ];
  const state = { q: '', market: '', industry: '', expert_group: '', sort: 'new' };
  let items = [];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (role) => role.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const plural = (n) => n + (n === 1 ? ' transcript' : ' transcripts');

  function card(t) {
    return '<a class="xt-card" href="' + LIST + encodeURIComponent(t.slug) + '">' +
      '<div class="xt-meta"><span class="xt-pill">' + esc(t.market) + '</span><span class="xt-pill">' + esc(t.industry) + '</span><span class="xt-pill fmt">' + esc(t.format) + '</span></div>' +
      '<h3>' + esc(t.title) + '</h3>' +
      '<div class="xt-expert"><span class="xt-av">' + esc(initials(t.expert)) + '</span>' + esc(t.expert) + '</div>' +
      '<p class="xt-blurb">' + esc(t.blurb) + '</p>' +
      '<div class="xt-foot"><span>' + esc(t.as_of) + ' · ' + esc(t.length) + '</span><b>Read transcript →</b></div>' +
      '</a>';
  }

  function matchesText(t) {
    const term = state.q.trim().toLowerCase();
    if (!term) return true;
    const hay = [t.title, t.market, t.industry, t.expert, t.blurb].concat(t.companies || []).join(' ').toLowerCase();
    return term.split(/\s+/).every((w) => hay.includes(w));
  }
  // Facet counts respect every other active filter, so a count always equals what a click would show.
  function matches(t, skip) {
    if (!matchesText(t)) return false;
    return FACETS.every((f) => f.key === skip || !state[f.key] || t[f.key] === state[f.key]);
  }
  const newest = (a, b) => (b.published || '').localeCompare(a.published || '') || a.title.localeCompare(b.title);

  function renderFacets() {
    const box = document.getElementById('xt-facets');
    box.innerHTML = FACETS.map((f) => {
      const counts = {};
      items.forEach((t) => { if (matches(t, f.key)) counts[t[f.key]] = (counts[t[f.key]] || 0) + 1; });
      const values = [...new Set(items.map((t) => t[f.key]))].sort();
      const rows = values.map((v) => {
        const n = counts[v] || 0;
        const active = state[f.key] === v;
        return '<button type="button" class="filter-option' + (active ? ' active' : '') + '" data-k="' + f.key + '" data-v="' + esc(v) + '"' +
          (n === 0 && !active ? ' disabled' : '') + ' aria-pressed="' + active + '"><span>' + esc(v) + '</span><span class="count">' + n + '</span></button>';
      }).join('');
      return '<div class="filter-group"><h2>' + f.label + '</h2>' + rows + '</div>';
    }).join('');
  }

  function syncUrl() {
    const p = new URLSearchParams();
    ['q', 'market', 'industry', 'expert_group'].forEach((k) => { if (state[k]) p.set(k === 'expert_group' ? 'expert' : k, state[k]); });
    if (state.sort !== 'new') p.set('sort', state.sort);
    history.replaceState(null, '', LIST + (p.toString() ? '?' + p : ''));
  }

  function renderList() {
    const shown = items.filter((t) => matches(t)).sort(state.sort === 'az' ? (a, b) => a.title.localeCompare(b.title) : newest);
    grid.innerHTML = shown.map(card).join('');
    count.textContent = plural(shown.length);
    empty.hidden = shown.length > 0;
    document.getElementById('xt-clear').hidden = !(state.q || state.market || state.industry || state.expert_group);
    renderFacets();
    syncUrl();
  }

  function renderLanding() {
    const shown = items.slice().sort(newest).slice(0, 4);
    grid.innerHTML = shown.map(card).join('');
    count.textContent = plural(items.length) + ' in the library';
    empty.hidden = shown.length > 0;
  }

  if (isList) {
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.market = p.get('market') || '';
    state.industry = p.get('industry') || '';
    state.expert_group = p.get('expert') || '';
    state.sort = p.get('sort') === 'az' ? 'az' : 'new';
    q.value = state.q;
    const sort = document.getElementById('xt-sort');
    sort.value = state.sort;
    sort.addEventListener('change', () => { state.sort = sort.value; renderList(); });
    q.addEventListener('input', () => { state.q = q.value; renderList(); });
    form.addEventListener('submit', (e) => { e.preventDefault(); state.q = q.value; renderList(); });
    document.getElementById('xt-facets').addEventListener('click', (e) => {
      const b = e.target.closest('.filter-option');
      if (!b || b.disabled) return;
      state[b.dataset.k] = state[b.dataset.k] === b.dataset.v ? '' : b.dataset.v;
      renderList();
    });
    document.getElementById('xt-clear').addEventListener('click', () => {
      Object.assign(state, { q: '', market: '', industry: '', expert_group: '' });
      q.value = '';
      renderList();
    });
  } else if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = q.value.trim();
      location.href = LIST + (term ? '?q=' + encodeURIComponent(term) : '');
    });
  }

  fetch(LIST + 'catalog.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => { items = data; (isList ? renderList : renderLanding)(); })
    .catch(() => { count.textContent = ''; empty.hidden = false; });
})();
