// Admin panel: price "rarity" (1.0–1.3) per report / transcript + "Recompute all prices". English only.
// Usage: kiraAdminPrices.mount(containerEl, 'report' | 'transcript'). Needs window.db (auth.js) and an admin session.
(function () {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  async function api(method, path, body) {
    const session = (await window.db.auth.getSession()).data.session;
    if (!session) throw new Error('no_session');
    const r = await fetch(path, { method: method, headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || String(r.status));
    return d;
  }
  async function mount(el, kind) {
    const noun = kind === 'report' ? 'reports' : 'transcripts';
    el.innerHTML = '<h2 style="font-size:18px;margin:32px 0 6px">Price rarity</h2>' +
      '<p style="font-size:13px;color:var(--muted);margin:0 0 12px">Multiplier 1.0–1.3 (step 0.05) for hard-to-find topics. Saving recomputes the price at once with the same formula used at publish.</p>' +
      '<div style="margin-bottom:10px"><button class="pl-btn" data-all>Recompute all prices</button> <span data-allmsg style="font-size:13px;color:var(--muted)"></span></div>' +
      '<div data-list style="font-size:13px;color:var(--muted)">Loading…</div>';
    const list = el.querySelector('[data-list]');
    el.querySelector('[data-all]').addEventListener('click', async function (e) {
      const b = e.currentTarget, m = el.querySelector('[data-allmsg]');
      b.disabled = true; m.textContent = 'Working…';
      try { const d = await api('POST', '/api/admin-prices', { action: 'recompute_all' }); m.textContent = 'Done: ' + d.reports + ' report prices and ' + d.transcripts + ' transcript prices changed.'; await load(); }
      catch (err) { m.textContent = 'Failed (' + err.message + ').'; }
      b.disabled = false;
    });
    async function load() {
      try {
        const d = await api('GET', '/api/admin-prices?kind=' + kind);
        if (!d.items.length) { list.textContent = 'No ' + noun + ' yet.'; return; }
        list.innerHTML = '<div style="overflow-x:auto;border:1px solid var(--border);border-radius:12px"><table class="pl" style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left;padding:8px 12px">Slug</th><th style="text-align:left;padding:8px 12px">Status</th><th style="text-align:left;padding:8px 12px">Price</th><th style="text-align:left;padding:8px 12px">Rarity</th><th></th></tr></thead><tbody>' +
          d.items.map(function (i) {
            return '<tr data-key="' + esc(i.key) + '"><td style="padding:8px 12px">' + esc(i.title) + '</td><td style="padding:8px 12px">' + esc(i.status) + '</td>' +
              '<td style="padding:8px 12px" data-price>' + (i.price == null ? '—' : '$' + i.price) + '</td>' +
              '<td style="padding:8px 12px"><input type="number" min="1" max="1.3" step="0.05" value="' + esc(i.rarity.toFixed(2)) + '" style="width:80px"></td>' +
              '<td style="padding:8px 12px"><button class="pl-btn" data-save>Save</button> <span data-msg style="font-size:12px;color:var(--muted)"></span></td></tr>';
          }).join('') + '</tbody></table></div>';
        list.querySelectorAll('tr[data-key]').forEach(function (tr) {
          tr.querySelector('[data-save]').addEventListener('click', async function (e) {
            const b = e.currentTarget, m = tr.querySelector('[data-msg]'), v = Number(tr.querySelector('input').value);
            if (!(v >= 1 && v <= 1.3)) { m.textContent = 'Rarity must be 1.0–1.3.'; return; }
            b.disabled = true; m.textContent = 'Saving…';
            try {
              const r = await api('PATCH', '/api/admin-prices', { kind: kind, key: tr.dataset.key, rarity: v });
              tr.querySelector('[data-price]').textContent = r.new_price == null ? '—' : '$' + r.new_price;
              m.textContent = 'Price $' + (r.old_price == null ? '—' : r.old_price) + ' → $' + (r.new_price == null ? '—' : r.new_price);
            } catch (err) { m.textContent = 'Failed (' + err.message + ').'; }
            b.disabled = false;
          });
        });
      } catch (err) { list.textContent = 'Could not load (' + err.message + ').'; }
    }
    await load();
  }
  window.kiraAdminPrices = { mount: mount };
})();
