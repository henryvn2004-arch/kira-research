// Pricing pages: when single-report checkout is switched on (/en/admin/config → Checkout), the
// single-report card sends readers to the library instead of the early-access form, and the lead
// line says reports are on sale. Reads /api/checkout-status; any failure leaves the page as it is.
(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const L = ['en', 'ja', 'ko', 'zh'].includes(parts[0]) ? parts[0] : 'en';
  const S = {
    en: { cta: 'Browse the library', lead: 'Every report in full, online, with PDF editions for your files. Single reports are on sale now ($PRICE); subscriptions open soon.' },
    ja: { cta: 'ライブラリを見る', lead: 'すべてのレポートの全文をオンラインで閲覧でき、保管用のPDF版も含まれます。単品レポート（$PRICE）は販売中で、購読は近日開始予定です。' },
    ko: { cta: '라이브러리 둘러보기', lead: '모든 보고서의 전문을 온라인으로 열람하고 보관용 PDF판을 받아 볼 수 있습니다. 단건 보고서($PRICE)는 판매 중이며, 구독은 곧 시작됩니다.' },
    zh: { cta: '浏览报告库', lead: '在线阅读每份报告全文，并提供可供存档的PDF版本。单份报告（$PRICE）现已开售，订阅即将开放。' }
  }[L];
  fetch('/api/checkout-status').then(r => (r.ok ? r.json() : null)).then(st => {
    if (!st || !st.report || !st.report.enabled) return;
    const a = document.querySelector('a[data-plan="report"]');
    if (a) {
      a.setAttribute('href', '/' + L + '/library');
      a.removeAttribute('data-plan');
      const span = a.querySelector('span[data-i18n]');
      if (span) { span.removeAttribute('data-i18n'); span.textContent = S.cta; }
    }
    const lead = document.querySelector('.page-hero .lead');
    if (lead) { lead.removeAttribute('data-i18n'); lead.textContent = S.lead.replace('$PRICE', '$' + st.report.price); }
  }).catch(() => {});
})();
