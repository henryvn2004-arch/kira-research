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

  // ── Home — Latest Research panel + Featured grid ────────────
  // Replaces the hardcoded report rows on the homepage hero panel and the
  // Featured reports grid with the N most-recently-published reports from
  // the DB. The hardcoded markup that ships in the static HTML serves as
  // a skeleton — visible during the brief fetch window, replaced on success.
  // Containers must carry `data-live-reports="panel"` or `data-live-reports="grid"`.
  async function applyHomeFeaturedReports() {
    const panel = document.querySelector('[data-live-reports="panel"]');
    const grid  = document.querySelector('[data-live-reports="grid"]');
    if (!panel && !grid) return;

    let items;
    try { items = await fetchAll(getLocale()); }
    catch (_) { return; }

    // Sort by published_at desc (newest first). Drop unpublished.
    items = items
      .filter(it => it.slug && it.title)
      .sort((a, b) => new Date(b.published_at || 0) - new Date(a.published_at || 0));

    const locale = getLocale();

    // ── Hero panel (compact rows, max 4) ──
    if (panel) {
      const top = items.slice(0, 4);
      if (top.length) {
        const rowsHtml = top.map(it => {
          const country  = (it.country  || '').toUpperCase();
          const industry = (it.industry || '').toUpperCase();
          const price    = it.price || 39;
          const safeTitle = escapeHtml(it.title);
          return (
            '<a href="/' + locale + '/reports/' + escapeAttr(it.slug) + '" class="panel-row" style="text-decoration:none;color:inherit;">' +
              '<div>' +
                '<div class="panel-label">' + safeTitle + '</div>' +
                '<div class="panel-meta">' + escapeHtml([country, industry].filter(Boolean).join(' · ')) + '</div>' +
              '</div>' +
              '<div class="panel-value">$' + Number(price) + '</div>' +
            '</a>'
          );
        }).join('');
        // Preserve the panel-header (LIVE badge) — only replace the rows.
        const header = panel.querySelector('.panel-header');
        panel.innerHTML = (header ? header.outerHTML : '') + rowsHtml;
      }
    }

    // ── Featured grid (3 cards, prefer newer ones not already in panel) ──
    if (grid) {
      const top = items.slice(0, 3);
      if (top.length) {
        const cardsHtml = top.map(it => {
          const country  = (it.country  || '').toUpperCase();
          const industry = (it.industry || '').toUpperCase();
          const year     = it.year || '';
          const price    = it.price || 39;
          const safeTitle = escapeHtml(it.title);
          const excerpt = it.excerpt ? escapeHtml(String(it.excerpt).slice(0, 240)) + (String(it.excerpt).length > 240 ? '…' : '') : '';
          // Localized CTA labels — match the labels the rest of the page uses.
          const ctaLabel = locale === 'ja' ? 'プレビュー →' : locale === 'ko' ? '미리보기 →' : 'Preview →';
          return (
            '<a href="/' + locale + '/reports/' + escapeAttr(it.slug) + '" class="report-card">' +
              '<div class="report-meta">' +
                '<span class="country">' + escapeHtml(country) + '</span>' +
                '<span>' + escapeHtml([industry, year].filter(Boolean).join(' · ')) + '</span>' +
              '</div>' +
              '<h3>' + safeTitle + '</h3>' +
              (excerpt ? '<p class="report-desc">' + excerpt + '</p>' : '') +
              '<div class="report-footer">' +
                '<span class="report-price">$' + Number(price) + '</span>' +
                '<span class="report-cta">' + ctaLabel + '</span>' +
              '</div>' +
            '</a>'
          );
        }).join('');
        grid.innerHTML = cardsHtml;
      }
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) {
    return encodeURIComponent(String(s == null ? '' : s));
  }

  // ── Boot ────────────────────────────────────────────────────
  function boot() {
    // Defer slightly so the page's own init (library.html dynamic fetch)
    // gets to render the first batch — we just overlay the counts.
    setTimeout(() => {
      applyHomeCounts();
      applyLibraryCounts();
      applyHomeFeaturedReports();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
