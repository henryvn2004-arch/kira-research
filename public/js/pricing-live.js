// Pricing pages: follow the checkout switches (/en/admin/config → Checkout). Reads /api/checkout-status;
// any failure leaves the page as it is (early-access forms).
//   single reports on  → the single-report card says "Browse the library" and links to the library
//   Month plan on      → the Month card says "Subscribe" and links to /<locale>/subscription
//   the lead line says what is on sale now
(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const L = ['en', 'ja', 'ko', 'zh'].includes(parts[0]) ? parts[0] : 'en';
  const S = {
    en: { browse: 'Browse the library', subscribe: 'Subscribe',
      leadReport: 'Every report in full, online, with PDF editions for your files. Single reports are on sale now ($REPORT); subscriptions open soon.',
      leadBoth: 'Every report in full, online, with PDF editions for your files. Single reports ($REPORT) and the Month plan ($MONTH a month) are on sale now.',
      leadMonth: 'Every report in full, online, with PDF editions for your files. The Month plan ($MONTH a month) is on sale now.' },
    ja: { browse: 'ライブラリを見る', subscribe: '購読する',
      leadReport: 'すべてのレポートの全文をオンラインで閲覧でき、保管用のPDF版も含まれます。単品レポート（$REPORT）は販売中で、購読は近日開始予定です。',
      leadBoth: 'すべてのレポートの全文をオンラインで閲覧でき、保管用のPDF版も含まれます。単品レポート（$REPORT）と月額プラン（月$MONTH）を販売中です。',
      leadMonth: 'すべてのレポートの全文をオンラインで閲覧でき、保管用のPDF版も含まれます。月額プラン（月$MONTH）を販売中です。' },
    ko: { browse: '라이브러리 둘러보기', subscribe: '구독하기',
      leadReport: '모든 보고서의 전문을 온라인으로 열람하고 보관용 PDF판을 받아 볼 수 있습니다. 단건 보고서($REPORT)는 판매 중이며, 구독은 곧 시작됩니다.',
      leadBoth: '모든 보고서의 전문을 온라인으로 열람하고 보관용 PDF판을 받아 볼 수 있습니다. 단건 보고서($REPORT)와 월간 플랜(월 $MONTH)을 판매 중입니다.',
      leadMonth: '모든 보고서의 전문을 온라인으로 열람하고 보관용 PDF판을 받아 볼 수 있습니다. 월간 플랜(월 $MONTH)을 판매 중입니다.' },
    zh: { browse: '浏览报告库', subscribe: '订阅',
      leadReport: '在线阅读每份报告全文，并提供可供存档的PDF版本。单份报告（$REPORT）现已开售，订阅即将开放。',
      leadBoth: '在线阅读每份报告全文，并提供可供存档的PDF版本。单份报告（$REPORT）和月度方案（每月$MONTH）现已开售。',
      leadMonth: '在线阅读每份报告全文，并提供可供存档的PDF版本。月度方案（每月$MONTH）现已开售。' }
  }[L];
  const retext = (a, text) => {
    const span = a.querySelector('span[data-i18n]');
    if (span) { span.removeAttribute('data-i18n'); span.textContent = text; }
  };
  fetch('/api/checkout-status').then(r => (r.ok ? r.json() : null)).then(st => {
    if (!st) return;
    const rep = st.report && st.report.enabled, mon = st.subscription && st.subscription.enabled;
    if (!rep && !mon) return;
    if (rep) {
      const a = document.querySelector('a[data-plan="report"]');
      if (a) { a.setAttribute('href', '/' + L + '/library'); a.removeAttribute('data-plan'); retext(a, S.browse); }
    }
    if (mon) {
      const a = document.querySelector('a[data-plan="month"]');
      if (a) { a.setAttribute('href', '/' + L + '/subscription'); a.removeAttribute('data-plan'); retext(a, S.subscribe); }
    }
    const lead = document.querySelector('.page-hero .lead');
    if (lead) {
      const text = rep && mon ? S.leadBoth : mon ? S.leadMonth : S.leadReport;
      lead.removeAttribute('data-i18n');
      lead.textContent = text.replace('$REPORT', '$' + (st.report ? st.report.price : 49)).replace('$MONTH', '$' + (st.subscription ? st.subscription.price : 149));
    }
  }).catch(() => {});
})();
