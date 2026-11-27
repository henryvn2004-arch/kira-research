// Text that goes next to every buy button (owner decisions 2026-11-27): why the item costs what it costs, the technical-only
// refund line, the EU/UK delivery line, and the short "why a report" block. EN / JA / KO / ZH.
// Display only: it never touches a click handler. Pages call kiraBuyCopy.block(kind, data, opts) and put the HTML under the button.
//   kind 'report'      data { pages, exhibits }          → "44 pages · 26 charts · EN/JA/KO/ZH"
//   kind 'transcript'  data { length_label }             → "about 25 min read · every marked source"
//   kind 'list'        data { companies }                → "812 companies · Excel file"
//   opts.why = true adds the three "why not just ask a chatbot" bullets (report pages); opts.hasExhibits tells it the report has chart data.
(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const L = ['en', 'ja', 'ko', 'zh'].includes(parts[0]) ? parts[0] : 'en';
  const S = {
    en: {
      pages: (n) => n + ' pages', charts: (n) => n + ' charts', langs: 'EN/JA/KO/ZH', excel: 'Excel file', every: 'every marked source',
      read: (m) => 'about ' + m + ' min read', companies: (n) => n + ' companies', whyPrice: 'Why this price:',
      refund: 'Can’t open or download it? Full refund within 7 days.', refundLink: 'Refund terms',
      eu: 'Delivery starts immediately; by buying you agree this ends the 14-day withdrawal right (EU/UK).',
      whyHead: 'Why buy a report instead of asking a chatbot?',
      w1: 'Every figure has a named source and a date, so you can open it and check it.',
      w2: 'Full Japanese, Korean and Chinese editions, with sources searched in each market’s own language.',
      w3x: 'Charts download as editable Excel and PowerPoint.', w3: 'Refreshed within 12 months of publication, and dated on every page.',
      cmp: 'Compare with other options'
    },
    ja: {
      pages: (n) => n + 'ページ', charts: (n) => '図表' + n + '点', langs: 'EN/JA/KO/ZH', excel: 'Excelファイル', every: '全出典付き',
      read: (m) => '読了目安 約' + m + '分', companies: (n) => n + '社', whyPrice: '価格の理由：',
      refund: '開けない・ダウンロードできない場合は、7日以内に全額返金します。', refundLink: '返金について',
      eu: '購入と同時に提供を開始します。購入により、EU・英国における14日間の撤回権が終了することに同意したものとみなします。',
      whyHead: 'チャットボットではなく、なぜレポートを買うのか。',
      w1: 'すべての数値に出典名と日付があり、開いて確認できます。',
      w2: '日本語・韓国語・中国語の完全版を用意し、各市場の現地語で情報源を調査しています。',
      w3x: '図表は編集可能なExcelとPowerPointでダウンロードできます。', w3: '公開から12か月以内に更新し、全ページに日付を表示しています。',
      cmp: '他の選択肢と比較する'
    },
    ko: {
      pages: (n) => n + '페이지', charts: (n) => '도표 ' + n + '개', langs: 'EN/JA/KO/ZH', excel: 'Excel 파일', every: '모든 출처 표시',
      read: (m) => '읽는 시간 약 ' + m + '분', companies: (n) => '기업 ' + n + '개', whyPrice: '가격의 이유:',
      refund: '열거나 내려받을 수 없나요? 7일 이내 전액 환불해 드립니다.', refundLink: '환불 안내',
      eu: '구매 즉시 제공이 시작되며, 구매하시면 이로써 EU·영국의 14일 철회권이 종료됨에 동의하시게 됩니다.',
      whyHead: '챗봇 대신 보고서를 사는 이유.',
      w1: '모든 수치에 출처명과 날짜가 있어 직접 열어 확인할 수 있습니다.',
      w2: '일본어·한국어·중국어 전체판을 제공하며, 시장별 현지어로 출처를 조사합니다.',
      w3x: '도표를 편집 가능한 Excel과 PowerPoint로 내려받을 수 있습니다.', w3: '게재 후 12개월 이내에 갱신하며 모든 페이지에 날짜를 표시합니다.',
      cmp: '다른 선택지와 비교하기'
    },
    zh: {
      pages: (n) => n + '页', charts: (n) => n + '张图表', langs: 'EN/JA/KO/ZH', excel: 'Excel文件', every: '标明全部来源',
      read: (m) => '阅读约' + m + '分钟', companies: (n) => n + '家企业', whyPrice: '价格说明：',
      refund: '无法打开或下载？7天内全额退款。', refundLink: '退款条款',
      eu: '购买后立即交付；购买即表示您同意由此终止欧盟/英国的14天撤销权。',
      whyHead: '为什么买报告，而不是问聊天机器人？',
      w1: '每个数据都有具名来源和日期，可打开查看核实。',
      w2: '提供完整的日文、韩文和中文版本，并用各市场当地语言检索来源。',
      w3x: '图表可下载为可编辑的Excel和PowerPoint。', w3: '发布后12个月内更新，每页均注明日期。',
      cmp: '与其他方式对比'
    }
  }[L];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function css() {
    if (document.getElementById('bc-css')) return;
    const st = document.createElement('style'); st.id = 'bc-css';
    st.textContent = '.bc{margin-top:10px;font-size:13px;line-height:1.55;color:var(--muted)}.bc p{margin:0 0 6px}.bc .bc-why{color:var(--text)}' +
      '.bc a{color:var(--primary);text-decoration:none}.bc .bc-eu{font-size:12px;opacity:.9}.bc .bc-waiver{display:flex;gap:8px;align-items:flex-start;cursor:pointer}.bc .bc-waiver input{margin-top:3px;flex:none}' +
      '.bc-more{margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:13px;line-height:1.55;color:var(--muted)}' +
      '.bc-more h4{margin:0 0 6px;font-size:13px;color:var(--text)}.bc-more ul{margin:0 0 8px;padding-left:18px}.bc-more li{margin-bottom:4px}.bc-more a{color:var(--primary);text-decoration:none}';
    document.head.appendChild(st);
  }

  // The reason for the price, from what is in the item.
  function reason(kind, d) {
    d = d || {};
    const bits = [];
    if (kind === 'report') {
      if (d.pages) bits.push(S.pages(d.pages));
      if (d.exhibits) bits.push(S.charts(d.exhibits));
      bits.push(S.langs);
    } else if (kind === 'transcript') {
      const m = (String(d.length_label || '').match(/\d+/) || [])[0];
      if (m) bits.push(S.read(m));
      bits.push(S.every);
    } else if (kind === 'list') {
      if (d.companies) bits.push(S.companies(d.companies));
      bits.push(S.excel);
    }
    return bits.join(' · ');
  }

  // Under every buy button: reason + refund + EU/UK line. kind/data as above.
  function block(kind, d) {
    css();
    const r = reason(kind, d);
    return '<div class="bc" data-bc="' + esc(kind) + '">' +
      (r ? '<p class="bc-why">' + esc(S.whyPrice) + ' ' + esc(r) + '</p>' : '') +
      '<p>' + esc(S.refund) + ' <a href="/' + L + '/terms#refunds">' + esc(S.refundLink) + '</a></p>' +
      '<label class="bc-eu bc-waiver"><input type="checkbox" class="kc-waiver"> <span>' + esc(S.eu) + '</span></label></div>';
  }

  // Report pages: three bullets under the buy box. The Excel/PowerPoint bullet only where the report has chart data.
  function why(opts) {
    css();
    const has = !!(opts && opts.hasExhibits);
    return '<div class="bc-more"><h4>' + esc(S.whyHead) + '</h4><ul><li>' + esc(S.w1) + '</li><li>' + esc(S.w2) + '</li><li>' + esc(has ? S.w3x : S.w3) + '</li></ul>' +
      '<a href="/' + L + '/pricing#compare">' + esc(S.cmp) + ' →</a></div>';
  }

  window.kiraBuyCopy = { reason, block, why, strings: S, locale: L };
})();
