// AI visibility section for the admin GEO page (GEO G7). Self-contained: fills #geo-hits-slot.
// Needs window.db (Supabase client from /auth.js). Separate file from the page it sits in.
(function () {
  const slot = document.getElementById('geo-hits-slot');
  if (!slot) return;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (v) => Number(v || 0).toLocaleString();
  async function load(days) {
    const session = (await window.db.auth.getSession()).data.session;
    if (!session) return;
    const r = await fetch('/api/admin-geo-hits?days=' + days, { headers: { Authorization: 'Bearer ' + session.access_token } });
    if (!r.ok) { slot.innerHTML = '<p>AI visibility could not be loaded.</p>'; return; }
    const d = await r.json();
    const rows = (a, f) => a.length ? a.map(f).join('') : '<tr><td colspan="4" style="color:var(--muted)">Nothing yet</td></tr>';
    slot.innerHTML =
      '<h2 style="margin:40px 0 8px">AI visibility</h2>' +
      '<p style="color:var(--muted);font-size:13px;margin:0 0 12px">Last ' + d.days + ' days. ' + esc(d.note) + (d.available ? '' : ' (Table geo_hits is not created yet: run migration 067.)') + '</p>' +
      '<table class="tbl" style="width:100%"><thead><tr><th>Crawler / AI user</th><th>Kind</th><th style="text-align:right">Hits</th></tr></thead><tbody>' +
      rows(d.bots, (b) => '<tr><td>' + esc(b.name) + '</td><td>' + (b.kind === 'ai_user' ? 'AI user (asked for the page)' : 'Crawler') + '</td><td style="text-align:right">' + n(b.total) + '</td></tr>') + '</tbody></table>' +
      '<h3 style="margin:24px 0 8px">Visits from AI assistants</h3>' +
      '<table class="tbl" style="width:100%"><thead><tr><th>Source</th><th style="text-align:right">Visits</th></tr></thead><tbody>' +
      d.referrals.map((x) => '<tr><td>' + esc(x.src) + '</td><td style="text-align:right">' + n(x.visits) + '</td></tr>').join('') + '</tbody></table>' +
      '<h3 style="margin:24px 0 8px">Pages the bots read most</h3>' +
      '<table class="tbl" style="width:100%"><thead><tr><th>Path</th><th style="text-align:right">Hits</th></tr></thead><tbody>' +
      rows(d.top_paths, (p) => '<tr><td>' + esc(p.path) + '</td><td style="text-align:right">' + n(p.total) + '</td></tr>') + '</tbody></table>';
  }
  (async function () {
    while (!window.db) await new Promise((r) => setTimeout(r, 50));
    load(30).catch(function () { slot.innerHTML = '<p>AI visibility could not be loaded.</p>'; });
  })();
})();
