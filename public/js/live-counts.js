// ============================================================
// KIRA RESEARCH — js/live-counts.js
//
// Replaces hardcoded report counts on /<locale>/ + /<locale>/library
// with live counts fetched from /api/library-list.
//
// Hides facet rows + industry cells with zero matching reports — honest
// surface beats impressive fake numbers.
//
// Auto-runs on DOMContentLoaded. Detects which surface it's on via
// presence of `.industries-grid` (home) or `.filters` (library).
// ============================================================

(function () {
  'use strict';

  // ── Industry mapping ────────────────────────────────────────
  // Homepage shows 12 brand-defined industry cells. Each maps to one or
  // more DB `industry` values via the `data-industry-key` attribute on
  // the cell (comma-separated, case-insensitive). DB values that don't
  // map to any cell stay visible on the library page sidebar (which is
  // populated dynamically from DB), but don't surface on the homepage.
  //
  // Keep this comment in sync with `data-industry-key` attrs in
  // public/{en,ja,ko}/index.html `.ind-cell` blocks.

  function norm(s) { return String(s || '').trim().toLowerCase(); }

  function getLocale() {
    if (window.kira && window.kira.locale) return window.kira.locale;
    const m = window.location.pathname.match(/^\/(en|ja|ko)\//);
    return m ? m[1] : 'en';
  }

  async function fetchAll(locale) {
    // limit=200 → enough headroom for Year 1. Bump when corpus grows.
    const r = await fetch('/api/library-list?locale=' + encodeURIComponent(locale) + '&limit=200');
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    return Array.isArray(j.items) ? j.items : [];
  }

  // ── Homepage ────────────────────────────────────────────────
  async function applyHomeCounts() {
    const cells = document.querySelectorAll('.industries-grid .ind-cell');
    if (!cells.length) return;

    let items;
    try { items = await fetchAll(getLocale()); }
    catch (_) { return; /* keep hardcoded as fallback */ }

    // Count per DB industry
    const dbCounts = {};
    items.forEach(it => {
      const k = norm(it.industry);
      if (k) dbCounts[k] = (dbCounts[k] || 0) + 1;
    });

    cells.forEach(cell => {
      const keys = (cell.getAttribute('data-industry-key') || '')
        .split(',').map(norm).filter(Boolean);
      const total = keys.reduce((sum, k) => sum + (dbCounts[k] || 0), 0);
      const countEl = cell.querySelector('.ind-count');
      if (total === 0) {
        cell.style.display = 'none';
        return;
      }
      if (countEl) {
        countEl.textContent = total + (total === 1 ? ' report' : ' reports');
      }
    });
  }

  // ── Library page ────────────────────────────────────────────
  async function applyLibraryCounts() {
    const filters = document.querySelector('.filters');
    if (!filters) return;

    let items;
    try { items = await fetchAll(getLocale()); }
    catch (_) { return; }

    const total = items.length;

    // Per-facet counts
    const byCountry  = {};
    const byIndustry = {};
    const byYear     = {};
    const byPrice    = { lt30: 0, '30-49': 0, gt50: 0 };

    items.forEach(it => {
      const c = norm(it.country);
      const ind = norm(it.industry);
      const y = String(it.year || '');
      const p = Number(it.price || 0);

      if (c)   byCountry[c]    = (byCountry[c]  || 0) + 1;
      if (ind) byIndustry[ind] = (byIndustry[ind] || 0) + 1;
      if (y)   byYear[y]       = (byYear[y] || 0) + 1;
      if (p < 30)              byPrice.lt30++;
      else if (p <= 49)        byPrice['30-49']++;
      else                     byPrice.gt50++;
    });

    // Update header chip ("128 REPORTS" → real total)
    const headerCount = document.getElementById('lib-count');
    if (headerCount) headerCount.textContent = total + (total === 1 ? ' REPORT' : ' REPORTS');

    // Update each .filter-option, hide rows with 0
    function updateGroup(group, lookup) {
      const opts = filters.querySelectorAll('[data-filter="' + group + '"]');
      opts.forEach(opt => {
        const val = norm(opt.dataset.value);
        const n = val === '' ? total : (lookup[val] || 0);
        const countSpan = opt.querySelector('.count');
        if (countSpan) countSpan.textContent = n;
        // Keep the "All" row visible always; hide other 0-rows.
        if (val !== '' && n === 0) opt.style.display = 'none';
        else opt.style.display = '';
      });
    }

    updateGroup('country',  byCountry);
    updateGroup('industry', byIndustry);
    updateGroup('year',     byYear);
    updateGroup('price',    byPrice);

    // Surface DB values that aren't in the hardcoded sidebar yet
    // (e.g. industries like Coffee/SaaS, years like 2027).
    appendUnseen(filters, 'industry', byIndustry, k => k.charAt(0).toUpperCase() + k.slice(1));
    appendUnseen(filters, 'year',     byYear,     k => k);
  }

  function appendUnseen(filters, group, counts, labeler) {
    // Find the .filter-group block that contains this data-filter.
    let groupEl = null;
    filters.querySelectorAll('.filter-group').forEach(g => {
      if (g.querySelector('[data-filter="' + group + '"]')) groupEl = g;
    });
    if (!groupEl) return;

    const knownVals = new Set(
      Array.from(groupEl.querySelectorAll('[data-filter="' + group + '"]'))
           .map(o => norm(o.dataset.value)).filter(Boolean)
    );
    const sorted = Object.keys(counts).sort();
    // For year, sort descending so 2027 sits above 2026.
    if (group === 'year') sorted.reverse();

    sorted.forEach(k => {
      if (knownVals.has(k) || !counts[k]) return;
      const row = document.createElement('div');
      row.className = 'filter-option';
      row.dataset.filter = group;
      row.dataset.value  = k;
      row.innerHTML = '<span>' + labeler(k) + '</span><span class="count">' + counts[k] + '</span>';
      row.addEventListener('click', () => {
        groupEl.querySelectorAll('[data-filter="' + group + '"]').forEach(o => o.classList.remove('active'));
        row.classList.add('active');
        const u = new URL(window.location.href);
        u.searchParams.set(group, k);
        window.location.href = u.toString();
      });
      groupEl.appendChild(row);
    });
  }

  // ── Boot ────────────────────────────────────────────────────
  function boot() {
    // Defer slightly so the page's own init (library.html dynamic fetch)
    // gets to render the first batch — we just overlay the counts.
    setTimeout(() => {
      applyHomeCounts();
      applyLibraryCounts();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
