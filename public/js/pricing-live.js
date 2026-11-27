// Pricing pages: show the prices that are really on sale (owner decision 2026-11-27: items are sold one by one, no subscriptions).
// Reads /api/checkout-status, which gives the lowest and highest price now in the data for reports and transcripts and the
// rule's bounds for company lists. Any failure leaves the static numbers in the page (the rule's bounds).
(function () {
  const rng = (o) => (o && o.from != null && o.to != null ? (o.from === o.to ? String(o.from) : o.from + '–' + o.to) : null);
  const put = (id, v) => { const el = document.getElementById(id); if (el && v != null) el.textContent = v; };
  fetch('/api/checkout-status').then((r) => (r.ok ? r.json() : null)).then((st) => {
    if (!st) return;
    put('pr-report', rng(st.report));
    put('pr-transcript', rng(st.transcript));
    put('pr-list', rng(st.list));
    put('cmp-r', st.report && st.report.from);
    put('cmp-t', st.transcript && st.transcript.from);
    put('cmp-l', st.list && st.list.from);
  }).catch(() => {});
})();
