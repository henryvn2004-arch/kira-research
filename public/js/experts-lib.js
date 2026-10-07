// Kira Experts landing (/en/experts/): the newest transcripts, plus a search box that opens
// the full listing at /en/experts/transcripts/ (js/experts-list.js).
(function () {
  const grid = document.getElementById('xt-grid');
  if (!grid) return;
  const LIST = '/en/experts/transcripts/';
  const q = document.getElementById('xt-q');
  const form = document.getElementById('xt-form');
  const count = document.getElementById('xt-count');
  const empty = document.getElementById('xt-empty');

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (role) => role.split(/[\s,]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const newest = (a, b) => (b.published || '').localeCompare(a.published || '') || a.title.localeCompare(b.title);

  function card(t) {
    return '<a class="xt-card" href="' + LIST + encodeURIComponent(t.slug) + '">' +
      '<div class="xt-meta"><span class="xt-pill type">' + esc(t.interview_type) + '</span><span class="xt-pill">' + esc(t.market) + '</span><span class="xt-pill">' + esc(t.industry) + '</span><span class="xt-pill fmt">' + esc(t.format) + '</span></div>' +
      '<h3>' + esc(t.title) + '</h3>' +
      '<div class="xt-expert"><span class="xt-av">' + esc(initials(t.expert)) + '</span>' + esc(t.expert) + '</div>' +
      '<p class="xt-blurb">' + esc(t.blurb) + '</p>' +
      '<div class="xt-foot"><span>' + esc(t.as_of) + ' · ' + esc(t.length) + '</span><b>Read transcript →</b></div>' +
      '</a>';
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const term = q.value.trim();
      location.href = LIST + (term ? '?q=' + encodeURIComponent(term) : '');
    });
  }

  fetch(LIST + 'catalog.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((items) => {
      grid.innerHTML = items.slice().sort(newest).slice(0, 4).map(card).join('');
      count.textContent = items.length + (items.length === 1 ? ' transcript' : ' transcripts') + ' in the library';
      empty.hidden = items.length > 0;
    })
    .catch(() => { count.textContent = ''; empty.hidden = false; });
})();
