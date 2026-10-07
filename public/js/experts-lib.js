// Kira Experts transcript library: loads the catalog and filters it client-side.
(function () {
  const grid = document.getElementById('xt-grid');
  if (!grid) return;
  const q = document.getElementById('xt-q');
  const selM = document.getElementById('xt-market');
  const selI = document.getElementById('xt-industry');
  const count = document.getElementById('xt-count');
  const empty = document.getElementById('xt-empty');
  let items = [];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (role) => role.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  function fill(sel, values) {
    [...new Set(values)].sort().forEach((v) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      sel.appendChild(o);
    });
  }

  function card(t) {
    return '<a class="xt-card" href="/en/experts/transcripts/' + encodeURIComponent(t.slug) + '">' +
      '<div class="xt-meta"><span class="xt-pill">' + esc(t.market) + '</span><span class="xt-pill">' + esc(t.industry) + '</span><span class="xt-pill fmt">' + esc(t.format) + '</span></div>' +
      '<h3>' + esc(t.title) + '</h3>' +
      '<div class="xt-expert"><span class="xt-av">' + esc(initials(t.expert)) + '</span>' + esc(t.expert) + '</div>' +
      '<p class="xt-blurb">' + esc(t.blurb) + '</p>' +
      '<div class="xt-foot"><span>' + esc(t.as_of) + ' · ' + esc(t.length) + '</span><b>Read transcript →</b></div>' +
      '</a>';
  }

  function render() {
    const term = (q.value || '').trim().toLowerCase();
    const shown = items.filter((t) => {
      if (selM.value && t.market !== selM.value) return false;
      if (selI.value && t.industry !== selI.value) return false;
      if (!term) return true;
      const hay = [t.title, t.market, t.industry, t.expert, t.blurb].concat(t.companies || []).join(' ').toLowerCase();
      return term.split(/\s+/).every((w) => hay.includes(w));
    });
    grid.innerHTML = shown.map(card).join('');
    count.textContent = shown.length + (shown.length === 1 ? ' transcript' : ' transcripts');
    empty.hidden = shown.length > 0;
  }

  fetch('/en/experts/transcripts/catalog.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((data) => {
      items = data;
      fill(selM, items.map((t) => t.market));
      fill(selI, items.map((t) => t.industry));
      render();
    })
    .catch(() => { count.textContent = ''; empty.hidden = false; });

  [q, selM, selI].forEach((el) => el.addEventListener('input', render));
})();
