// Kira Data dashboard: the tab bar (All markets + 15 markets), the "Investing from" filter and the chart blocks
// on /<locale>/data/ and /<locale>/data/<country>. Each block answers one buyer question:
//   All markets: where to go (growth vs income, league table), is now a good time (currencies), who invests where (ASEAN matrix, or one investor's
//   trend), latest company moves.  One market: trade momentum, who is investing, latest company moves.
// Data: /api/econ-dash (public sources only), /api/moves. Charts: Chart.js (vendored, /js/vendor).
// Called by econ-view.js: window.kiraDash.mount({ bar, body, code }).
(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const L = ['en', 'ja', 'ko', 'zh'].includes(parts[0]) ? parts[0] : 'en';
  const NUM = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' }[L];
  const R = window.kiraR;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LENS = ['JP', 'KR', 'TW', 'CN', 'SG', 'HK', 'US'];
  const CORRIDOR = { JP: 'japan', KR: 'south-korea', TW: 'taiwan', SG: 'singapore', CN: 'china' };
  const SRC = { aseanstats: 'ASEANstats', bkpm: 'BKPM (Indonesia)', boj: 'Bank of Japan', psa_openstat: 'Philippine Statistics Authority',
    tw_mac: 'Taiwan, Investment Commission', vn_nso: 'Viet Nam National Statistics Office', vn_customs: 'Viet Nam Customs', singstat: 'SingStat', worldbank_wdi: 'World Bank', ecb: 'European Central Bank' };
  const PAL = ['#1A66F0', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#0EA5E9', '#64748B', '#EC4899'];

  const T = {
    en: {
      hCmp: 'Compare markets over time', capCmp: 'Pick up to 5 markets.', cmpMetric: 'Measure',
      hPulse: 'The latest reading in each market', pulseCols: ['Market', 'Inflation', 'Policy rate', 'GDP growth', 'Currency vs US$, 1 month'],
      capPulse: 'Monthly or quarterly figures where the national source publishes them, otherwise the latest year (World Bank). Arrows compare with the reading before.',
      hBal: (c, b) => `${c}: trade balance with each partner, 12 months to ${b}`, capBal: 'Above zero = exports to the partner are larger than imports from it.',
      qNow: 'Is now a good time', hFx: 'Local currencies against the US dollar', fx1m: 'Past month', fx1y: 'Past 12 months',
      capFx: (d) => `Above zero = the local currency gained against the US dollar. ECB daily rates up to ${d}; no rate is published for the Vietnamese dong, Taiwan dollar, riel, kip, kyat or Brunei dollar.`,
      all: 'All markets', from: 'Investing from', any: 'Any country',
      qWhere: 'Where to go', hWhere: 'Growth and income across the markets', capBubble: 'Bubble size = GDP. Further right = richer; higher = faster growth (3-year average).',
      xInc: 'GDP per person (US$, log scale)', yGrowth: 'Real GDP growth, 3-year average (%)',
      cols: ['Market', 'Growth (3 yrs)', 'Inflation', 'GDP per person', 'GDP', 'FDI inflow'], rowHint: 'Click a market to open it.', noTW: 'Taiwan is not in World Bank data.',
      qWho: 'Who is investing where', hMatrix: (y) => `Net direct investment into ASEAN markets by source, ${y}`, hostInv: 'Market ↓ / from →',
      capMatrix: 'Pick a country under "Investing from" to see its trend in each market. Red = more money left than came in.',
      hLensLine: (i) => `${i}: net direct investment into each ASEAN market`, hOut: (i, b) => `${i}'s own statistics: investment into each market, 12 months to ${b}`,
      hOutYtd: (i, b) => `${i}'s own statistics: investment into each market, year to ${b}`,
      qMoves: 'Who just moved in', hMoves: (h, i) => 'Latest company moves' + (h ? ' into ' + h : '') + (i ? ' from ' + i : ''), allMoves: 'All company moves →',
      qTrade: 'Trade momentum', hTrade: (c) => `${c}: trade with its largest partners, monthly`, hTradeLens: (c, i) => `${i} ↔ ${c}: monthly trade`,
      imports: (c) => `Imports into ${c}`, exports: (c) => `Exports from ${c}`, exTo: (c, p) => `${c} exports to ${p}`, imFrom: (c, p) => `${c} imports from ${p}`,
      totEx: (c) => `${c} total exports`, totIm: (c) => `${c} total imports`, win12: (b) => `12 months to ${b}`, yoy: 'vs. year before',
      hInvest: (c) => `Who is investing in ${c}`, hInvestLens: (i, c) => `${i} → ${c}: direct investment`, noLens: (i, c) => `No published figures yet on investment from ${i} in ${c}.`,
      cur: 'Latest', prev: 'Year before', ytdCur: (p) => `Year to ${p}`, ytdPrev: (p) => `Same period, year before (${p})`,
      winCur: (a, b) => `${a} – ${b}`, prod: {
        FDI_NET: 'Net direct investment', FDI_NET_OUT: (i) => `Net direct investment from ${i}`, FDI_APPROVED: 'Approved investment',
        FDI_APPROVED_OUT: (i) => `Approved investment from ${i}`, FDI_REALISED: 'Realised investment', FDI_REG_YTD: 'Registered investment (new + added capital), year to date'
      },
      bySource: 'by source country', srcLbl: (s, p) => `Source: ${s} · latest ${p}`, corridor: (i, c) => `${i} in ${c}: investment and company moves →`,
      neg: 'Negative = more money left than came in.', quarter: (y, q) => `Q${q} ${y}`, ofYear: (y) => y,
      extra: { ASEAN: 'ASEAN', WLD: 'World', EU: 'European Union' }
    },
    ja: {
      hCmp: '市場を時系列で比較', capCmp: '最大5市場まで選べます。', cmpMetric: '指標',
      hPulse: '各市場の最新の数値', pulseCols: ['市場', 'インフレ率', '政策金利', 'GDP成長率', '対米ドル相場（1か月）'],
      capPulse: '各国統計が公表している場合は月次・四半期の数値、それ以外は直近年（世界銀行）。矢印は前回の数値との比較です。',
      hBal: (c, b) => `${c}：相手国別の貿易収支、${b}までの12か月`, capBal: 'ゼロより上＝相手国への輸出が相手国からの輸入を上回る。',
      qNow: '今が好機か', hFx: '各国通貨の対米ドル相場', fx1m: '過去1か月', fx1y: '過去12か月',
      capFx: (d) => `ゼロより上＝現地通貨が米ドルに対して上昇。欧州中央銀行の日次レート（${d}まで）。ベトナムドン、台湾ドル、リエル、キープ、チャット、ブルネイドルのレートは公表されていません。`,
      all: '全市場', from: '投資元', any: 'すべての国',
      qWhere: 'どこへ進出するか', hWhere: '各市場の成長率と所得水準', capBubble: '円の大きさ＝GDP。右ほど所得が高く、上ほど成長が速い（3年平均）。',
      xInc: '1人当たりGDP（米ドル、対数目盛）', yGrowth: '実質GDP成長率・3年平均（％）',
      cols: ['市場', '成長率（3年）', 'インフレ率', '1人当たりGDP', 'GDP', '対内直接投資'], rowHint: '市場をクリックすると詳細を表示します。', noTW: '台湾は世界銀行のデータに含まれません。',
      qWho: '誰がどこに投資しているか', hMatrix: (y) => `ASEAN各市場への投資元別の直接投資（ネット）、${y}年`, hostInv: '市場 ↓ ／ 投資元 →',
      capMatrix: '「投資元」で国を選ぶと、各市場への推移を表示します。赤＝流出超過。',
      hLensLine: (i) => `${i}：ASEAN各市場への直接投資（ネット）`, hOut: (i, b) => `${i}側の統計：各市場への投資、${b}までの12か月`,
      hOutYtd: (i, b) => `${i}側の統計：各市場への投資、${b}までの年初来`,
      qMoves: '最近進出した企業', hMoves: (h, i) => (i ? i + 'から' : '') + (h ? h + 'への' : '') + '最新の企業の動き', allMoves: '企業の動きをすべて見る →',
      qTrade: '貿易の勢い', hTrade: (c) => `${c}：主要相手国との貿易（月次）`, hTradeLens: (c, i) => `${i} ↔ ${c}：月次貿易`,
      imports: (c) => `${c}の輸入`, exports: (c) => `${c}の輸出`, exTo: (c, p) => `${c}から${p}への輸出`, imFrom: (c, p) => `${c}の${p}からの輸入`,
      totEx: (c) => `${c}の輸出総額`, totIm: (c) => `${c}の輸入総額`, win12: (b) => `${b}までの12か月`, yoy: '前年比',
      hInvest: (c) => `${c}に投資しているのは誰か`, hInvestLens: (i, c) => `${i} → ${c}：直接投資`, noLens: (i, c) => `${i}から${c}への投資の公表データはまだありません。`,
      cur: '最新', prev: '前年', ytdCur: (p) => `${p}までの年初来`, ytdPrev: (p) => `前年同期（${p}）`,
      winCur: (a, b) => `${a}～${b}`, prod: {
        FDI_NET: '直接投資（ネット）', FDI_NET_OUT: (i) => `${i}からの直接投資（ネット）`, FDI_APPROVED: '認可投資額',
        FDI_APPROVED_OUT: (i) => `${i}からの認可投資額`, FDI_REALISED: '投資実行額', FDI_REG_YTD: '登録投資額（新規＋増資）、年初来'
      },
      bySource: '投資元別', srcLbl: (s, p) => `出所：${s}・最新 ${p}`, corridor: (i, c) => `${c}における${i}：投資と企業の動き →`,
      neg: 'マイナス＝流出超過。', quarter: (y, q) => `${y}年第${q}四半期`, ofYear: (y) => `${y}年`,
      extra: { ASEAN: 'ASEAN', WLD: '世界', EU: '欧州連合' }
    },
    ko: {
      hCmp: '시장별 추이 비교', capCmp: '최대 5개 시장까지 고를 수 있습니다.', cmpMetric: '지표',
      hPulse: '시장별 최신 수치', pulseCols: ['시장', '물가상승률', '기준금리', 'GDP 성장률', '대미 달러 환율(1개월)'],
      capPulse: '해당국 통계가 공표하는 경우 월간·분기 수치, 아니면 최근 연도(세계은행). 화살표는 직전 수치와의 비교입니다.',
      hBal: (c, b) => `${c}: 교역국별 무역수지, ${b}까지 12개월`, capBal: '0보다 위 = 해당국으로의 수출이 해당국으로부터의 수입보다 많음.',
      qNow: '지금이 적기인가', hFx: '현지 통화의 대미 달러 환율', fx1m: '최근 1개월', fx1y: '최근 12개월',
      capFx: (d) => `0보다 위 = 현지 통화가 미 달러 대비 강세. 유럽중앙은행 일간 환율(${d}까지). 베트남 동, 대만 달러, 리엘, 킵, 짯, 브루나이 달러 환율은 공표되지 않습니다.`,
      all: '전체 시장', from: '투자국', any: '모든 국가',
      qWhere: '어디로 갈 것인가', hWhere: '시장별 성장률과 소득 수준', capBubble: '원 크기 = GDP. 오른쪽일수록 소득이 높고, 위쪽일수록 성장이 빠릅니다(3년 평균).',
      xInc: '1인당 GDP(미국 달러, 로그 척도)', yGrowth: '실질 GDP 성장률, 3년 평균(%)',
      cols: ['시장', '성장률(3년)', '물가상승률', '1인당 GDP', 'GDP', '외국인직접투자'], rowHint: '시장을 클릭하면 상세 화면이 열립니다.', noTW: '대만은 세계은행 데이터에 포함되지 않습니다.',
      qWho: '누가 어디에 투자하는가', hMatrix: (y) => `아세안 시장별 투자국별 직접투자(순), ${y}년`, hostInv: '시장 ↓ / 투자국 →',
      capMatrix: '"투자국"에서 국가를 고르면 시장별 추이를 보여 줍니다. 빨간색 = 순유출.',
      hLensLine: (i) => `${i}: 아세안 시장별 직접투자(순)`, hOut: (i, b) => `${i} 측 통계: 시장별 투자, ${b}까지 12개월`,
      hOutYtd: (i, b) => `${i} 측 통계: 시장별 투자, ${b}까지 연초 누계`,
      qMoves: '최근 진출한 기업', hMoves: (h, i) => (i ? i + '발 ' : '') + (h ? h + ' ' : '') + '최신 기업 동향', allMoves: '기업 동향 전체 보기 →',
      qTrade: '무역 흐름', hTrade: (c) => `${c}: 주요 교역국과의 무역(월간)`, hTradeLens: (c, i) => `${i} ↔ ${c}: 월간 무역`,
      imports: (c) => `${c} 수입`, exports: (c) => `${c} 수출`, exTo: (c, p) => `${c}의 ${p} 수출`, imFrom: (c, p) => `${c}의 ${p}산 수입`,
      totEx: (c) => `${c} 총수출`, totIm: (c) => `${c} 총수입`, win12: (b) => `${b}까지 12개월`, yoy: '전년 대비',
      hInvest: (c) => `누가 ${c}에 투자하는가`, hInvestLens: (i, c) => `${i} → ${c}: 직접투자`, noLens: (i, c) => `${i}의 ${c} 투자에 대한 공표 수치가 아직 없습니다.`,
      cur: '최신', prev: '전년', ytdCur: (p) => `${p}까지 연초 누계`, ytdPrev: (p) => `전년 동기(${p})`,
      winCur: (a, b) => `${a}~${b}`, prod: {
        FDI_NET: '직접투자(순)', FDI_NET_OUT: (i) => `${i}의 직접투자(순)`, FDI_APPROVED: '승인 투자액',
        FDI_APPROVED_OUT: (i) => `${i}의 승인 투자액`, FDI_REALISED: '투자 실행액', FDI_REG_YTD: '등록 투자액(신규+증액), 연초 누계'
      },
      bySource: '투자국별', srcLbl: (s, p) => `출처: ${s} · 최신 ${p}`, corridor: (i, c) => `${c} 내 ${i}: 투자와 기업 동향 →`,
      neg: '음수 = 순유출.', quarter: (y, q) => `${y}년 ${q}분기`, ofYear: (y) => `${y}년`,
      extra: { ASEAN: '아세안', WLD: '세계', EU: '유럽연합' }
    },
    zh: {
      hCmp: '市场走势对比', capCmp: '最多可选5个市场。', cmpMetric: '指标',
      hPulse: '各市场最新数据', pulseCols: ['市场', '通胀率', '政策利率', 'GDP增长率', '兑美元汇率（1个月）'],
      capPulse: '国家统计机构公布月度或季度数据时使用该数据，否则使用最近年份（世界银行）。箭头为与上一期数据比较。',
      hBal: (c, b) => `${c}：与各贸易伙伴的贸易差额，截至${b}的12个月`, capBal: '高于零＝对该伙伴的出口大于自其进口。',
      qNow: '现在是好时机吗', hFx: '各国货币兑美元走势', fx1m: '近1个月', fx1y: '近12个月',
      capFx: (d) => `高于零＝本币兑美元升值。欧洲中央银行每日汇率（截至${d}）。越南盾、新台币、瑞尔、基普、缅元和文莱元无公布汇率。`,
      all: '全部市场', from: '投资来源', any: '任意国家',
      qWhere: '去哪里', hWhere: '各市场的增长与收入水平', capBubble: '圆圈大小＝GDP。越靠右收入越高，越靠上增长越快（3年平均）。',
      xInc: '人均GDP（美元，对数刻度）', yGrowth: '实际GDP增长率，3年平均（%）',
      cols: ['市场', '增长率（3年）', '通胀率', '人均GDP', 'GDP', '外国直接投资流入'], rowHint: '点击市场查看详情。', noTW: '世界银行数据不包括台湾。',
      qWho: '谁在投资哪里', hMatrix: (y) => `东盟各市场按来源国划分的直接投资净额，${y}年`, hostInv: '市场 ↓ ／ 来源 →',
      capMatrix: '在"投资来源"中选择国家，可查看其在各市场的趋势。红色＝净流出。',
      hLensLine: (i) => `${i}：对东盟各市场的直接投资净额`, hOut: (i, b) => `${i}方统计：对各市场的投资，截至${b}的12个月`,
      hOutYtd: (i, b) => `${i}方统计：对各市场的投资，截至${b}的年内累计`,
      qMoves: '谁刚刚进入', hMoves: (h, i) => (i ? i + '企业' : '') + (h ? '进入' + h + '的' : '') + '最新动态', allMoves: '查看全部企业动态 →',
      qTrade: '贸易势头', hTrade: (c) => `${c}：与主要伙伴的贸易（月度）`, hTradeLens: (c, i) => `${i} ↔ ${c}：月度贸易`,
      imports: (c) => `${c}进口`, exports: (c) => `${c}出口`, exTo: (c, p) => `${c}对${p}出口`, imFrom: (c, p) => `${c}自${p}进口`,
      totEx: (c) => `${c}出口总额`, totIm: (c) => `${c}进口总额`, win12: (b) => `截至${b}的12个月`, yoy: '同比',
      hInvest: (c) => `谁在投资${c}`, hInvestLens: (i, c) => `${i} → ${c}：直接投资`, noLens: (i, c) => `尚无${i}对${c}投资的公开数据。`,
      cur: '最新', prev: '上年', ytdCur: (p) => `截至${p}的年内累计`, ytdPrev: (p) => `上年同期（${p}）`,
      winCur: (a, b) => `${a}至${b}`, prod: {
        FDI_NET: '直接投资净额', FDI_NET_OUT: (i) => `${i}的直接投资净额`, FDI_APPROVED: '获批投资',
        FDI_APPROVED_OUT: (i) => `${i}的获批投资`, FDI_REALISED: '实际投资', FDI_REG_YTD: '登记投资（新增＋增资），年内累计'
      },
      bySource: '按来源国', srcLbl: (s, p) => `来源：${s} · 最新 ${p}`, corridor: (i, c) => `${i}在${c}：投资与企业动态 →`,
      neg: '负数＝净流出。', quarter: (y, q) => `${y}年第${q}季度`, ofYear: (y) => `${y}年`,
      extra: { ASEAN: '东盟', WLD: '世界', EU: '欧盟' }
    }
  }[L];

  // ---- formatting -------------------------------------------------------------------------
  const pct1 = new Intl.NumberFormat(NUM, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const curFmt = {};
  const money = (v, c) => (v == null || !Number.isFinite(v) ? '–' : (curFmt[c || 'USD'] = curFmt[c || 'USD'] ||
    new Intl.NumberFormat(NUM, { style: 'currency', currency: c || 'USD', notation: 'compact', maximumSignificantDigits: 3 })).format(v));
  const pct = (v) => (v == null || !Number.isFinite(v) ? '–' : pct1.format(v) + '%');
  const change = (a, b) => (a > 0 && b > 0 ? (a / b - 1) * 100 : null);
  const monthFmt = new Intl.DateTimeFormat(NUM, { year: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayFmt = new Intl.DateTimeFormat(NUM, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  function per(p) {
    const q = /^(\d{4})-Q([1-4])$/.exec(p);
    if (q) return T.quarter(q[1], q[2]);
    const m = /^(\d{4})-(\d{2})$/.exec(p);
    if (m) return monthFmt.format(new Date(Date.UTC(+m[1], +m[2] - 1, 1)));
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p);
    if (d) return dayFmt.format(new Date(Date.UTC(+d[1], +d[2] - 1, +d[3])));
    return T.ofYear(p);
  }
  let NAMES = {};
  const region = (code) => { try { return new Intl.DisplayNames([L === 'zh' ? 'zh-CN' : L], { type: 'region' }).of(code) || code; } catch (_e) { return code; } };
  const nm = (code) => T.extra[code] || (NAMES[code] ? (R && R.country ? R.country(NAMES[code]) : NAMES[code]) : region(code));

  // ---- state ------------------------------------------------------------------------------
  const params = new URLSearchParams(location.search);
  // Only a code from LENS is kept (taken from the list, not from the URL text).
  const pickLens = (v) => LENS[LENS.indexOf(String(v || '').toUpperCase())] || '';
  let lens = pickLens(params.get('from'));
  let D = null;
  const charts = [];
  // Compare block: chosen markets and measure (kept while the filter changes).
  let cmp = ['VN', 'TH', 'ID', 'MY'], cmpKey = 'gdp_growth';
  const CMP_KEYS = ['gdp_growth', 'inflation', 'gdp_per_capita', 'fdi_inflow', 'exports_usd', 'gdp_usd'];

  async function data() {
    if (D) return D;
    const r = await fetch('/api/econ-dash');
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
    NAMES = Object.fromEntries(D.countries.map((c) => [c.code, c.name]));
    return D;
  }
  const href = (slug) => '/' + L + '/data/' + (slug || '') + (lens ? '?from=' + lens : '');

  // ---- tab bar + investing-from filter ------------------------------------------------------
  function bar(el, code) {
    el.innerHTML = '<div class="dd-bar"><nav class="dd-tabs" aria-label="' + esc(T.all) + '">' +
      '<a class="dd-tab' + (code ? '' : ' on') + '" data-slug="" href="' + esc(href('')) + '"' + (code ? '' : ' aria-current="page"') + '>' + esc(T.all) + '</a>' +
      D.countries.map((c) => '<a class="dd-tab' + (c.code === code ? ' on' : '') + '" data-slug="' + esc(c.slug) + '" href="' + esc(href(c.slug)) + '"' + (c.code === code ? ' aria-current="page"' : '') + '>' + esc(nm(c.code)) + '</a>').join('') +
      '</nav><label class="dd-lens">' + esc(T.from) + ' <select id="dd-lens"><option value="">' + esc(T.any) + '</option>' +
      LENS.filter((c) => c !== code).map((c) => '<option value="' + c + '"' + (c === lens ? ' selected' : '') + '>' + esc(nm(c)) + '</option>').join('') + '</select></label></div>';
    const on = el.querySelector('.dd-tab.on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // ---- charts ---------------------------------------------------------------------------------
  function setup() {
    if (!window.Chart) return false;
    Chart.defaults.font.family = "Satoshi, system-ui, sans-serif";
    Chart.defaults.color = '#475569';
    Chart.defaults.borderColor = '#E5E7EB';
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    return true;
  }
  function draw(id, cfg) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    cfg.options = Object.assign({ maintainAspectRatio: false, responsive: true }, cfg.options || {});
    charts.push(new Chart(el, cfg));
  }
  const moneyAxis = (c) => ({ ticks: { callback: (v) => money(v, c) } });
  const tipMoney = (c) => ({ callbacks: { label: (x) => (x.dataset.label ? x.dataset.label + ': ' : '') + money(x.raw, c) } });
  const sec = (q, h, body, cap) => '<section class="ed-section dd-sec"><div class="dd-q">' + esc(q) + '</div><h2>' + esc(h) + '</h2>' + body + (cap ? '<p class="dd-cap">' + cap + '</p>' : '') + '</section>';
  const box = (id, cls) => '<div class="dd-card"><div class="dd-chart' + (cls ? ' ' + cls : '') + '"><canvas id="' + id + '"></canvas></div></div>';

  // ---- helpers over the data -------------------------------------------------------------------
  const lastN = (pts, n) => pts.slice(-n);
  const avg = (a) => (a.length ? a.reduce((t, x) => t + x, 0) / a.length : null);
  const latest = (c, k) => { const s = (D.compare[c] || {})[k] || []; return s.length ? s[s.length - 1] : null; };
  // Window sums for a group of series of one source: the latest window (12 months / 4 quarters, or year to date)
  // and the one before it. Returns { label, prevLabel, rows: [{ key, cur, prev }] }.
  function windows(list) {
    const f = list[0], periods = [...new Set(list.flatMap((s) => s.points.map((p) => p[0])))].sort();
    const lastP = periods[periods.length - 1];
    if (/_YTD$/.test(f.product)) {
      const [y, m] = lastP.split('-'), before = (Number(y) - 1) + '-' + m;
      return { label: T.ytdCur(per(lastP)), prevLabel: T.ytdPrev(per(before)), last: lastP,
        rows: list.map((s) => ({ s, cur: (s.points.find((p) => p[0] === lastP) || [])[1], prev: (s.points.find((p) => p[0] === before) || [])[1] })) };
    }
    const n = f.freq === 'Q' ? 4 : 12, cur = periods.slice(-n), prev = periods.slice(-2 * n, -n);
    const sum = (s, ps) => { const v = s.points.filter((p) => ps.includes(p[0])); return v.length ? v.reduce((t, p) => t + p[1], 0) : null; };
    return { label: T.winCur(per(cur[0]), per(lastP)), prevLabel: prev.length === n ? T.winCur(per(prev[0]), per(prev[n - 1])) : null, last: lastP,
      rows: list.map((s) => ({ s, cur: sum(s, cur), prev: prev.length === n ? sum(s, prev) : null })) };
  }

  // Credit lines of the sources the dashboard uses.
  const credits = () => '<div class="ed-sources">' + (D.sources || []).map((s) => '<span>' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.attribution) + '</a>' : esc(s.attribution)) + '</span>').join('') + '</div>';

  // ---- moves block (shared) -----------------------------------------------------------------------
  async function moves(el, host) {
    try {
      const qs = new URLSearchParams({ limit: '5' });
      if (host) qs.set('host', host);
      if (lens) qs.set('investor', lens);
      const r = await fetch('/api/moves?' + qs.toString());
      if (!r.ok) return;
      const d = await r.json();
      if (!(d.events || []).length || !window.kiraMoves || !window.kiraMoves.list) return;   // nothing yet: no empty block
      el.innerHTML = sec(T.qMoves, T.hMoves(host ? nm(host) : '', lens ? nm(lens) : ''),
        window.kiraMoves.list(d.events, nm) + '<p class="dd-cap"><a href="' + esc('/' + L + '/data/moves' + (host || lens ? '?' + new URLSearchParams(Object.assign({}, host ? { host } : {}, lens ? { investor: lens } : {})).toString() : '')) + '">' + esc(T.allMoves) + '</a></p>');
    } catch (_e) { /* the block stays empty */ }
  }

  // Compare chart: redrawn on its own when the chosen markets or the measure change.
  let cmpChart = null;
  function drawCompare() {
    const el = document.getElementById('dd-cmp');
    if (!el || !window.Chart) return;
    const unit = (D.units[cmpKey] || {}).unit;
    const years = [...new Set(cmp.flatMap((cc) => ((D.compare[cc] || {})[cmpKey] || []).map((p) => p[0])))].sort();
    const fmt = (v) => (unit === 'pct' ? pct(v) : money(v));
    if (cmpChart) { cmpChart.destroy(); charts.splice(charts.indexOf(cmpChart), 1); }
    draw('dd-cmp', { type: 'line', data: { labels: years.map(per), datasets: cmp.map((cc, i) => ({ label: nm(cc),
      data: years.map((y) => { const p = ((D.compare[cc] || {})[cmpKey] || []).find((x) => x[0] === y); return p ? p[1] : null; }),
      borderColor: PAL[i], backgroundColor: PAL[i], tension: 0, pointRadius: 2, spanGaps: true })) },
      options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: { callbacks: { label: (x) => x.dataset.label + ': ' + fmt(x.raw) } } },
        scales: { y: { ticks: { callback: (v) => fmt(v) } }, x: { ticks: { maxTicksLimit: 10 } } } } });
    cmpChart = charts[charts.length - 1];
  }

  // ---- All markets ----------------------------------------------------------------------------------
  function renderAll(el) {
    const rows = D.countries.filter((c) => latest(c.code, 'gdp_per_capita') && latest(c.code, 'gdp_growth'))
      .map((c) => ({ c, g: avg(lastN(D.compare[c.code].gdp_growth, 3).map((p) => p[1])), inc: latest(c.code, 'gdp_per_capita')[1],
        gdp: (latest(c.code, 'gdp_usd') || [])[1], inf: (latest(c.code, 'inflation') || [])[1], fdi: (latest(c.code, 'fdi_inflow') || [])[1] }))
      .sort((a, b) => b.g - a.g);
    const yr = (latest(rows[0] && rows[0].c.code, 'gdp_growth') || [])[0];
    let h = sec(T.qWhere, T.hWhere,
      '<div class="dd-grid2">' + box('dd-bubble', 'tall') +
      '<div class="dd-card ed-table-wrap dd-league"><table class="ed-table"><thead><tr>' + T.cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr><td><a href="' + esc(href(r.c.slug)) + '">' + esc(nm(r.c.code)) + '</a></td><td>' + pct(r.g) + '</td><td>' + pct(r.inf) + '</td><td>' + money(r.inc) + '</td><td>' + money(r.gdp) + '</td><td>' + money(r.fdi) + '</td></tr>').join('') +
      '</tbody></table></div></div>', esc(T.capBubble) + ' ' + esc(T.rowHint) + ' ' + esc(T.noTW) + (yr ? ' · ' + esc(T.srcLbl(SRC.worldbank_wdi, per(yr))) : ''));

    // Compare: chosen markets on one line chart, one measure at a time.
    const cmpable = D.countries.filter((c) => D.compare[c.code]);
    h += sec(T.qWhere, T.hCmp, '<div class="dd-card"><div class="dd-cmp-ctl"><div class="dd-chips">' +
      cmpable.map((c) => '<button type="button" class="dd-chip' + (cmp.includes(c.code) ? ' on' : '') + '" data-cc="' + esc(c.code) + '" aria-pressed="' + cmp.includes(c.code) + '">' + esc(nm(c.code)) + '</button>').join('') +
      '</div><label class="dd-lens">' + esc(T.cmpMetric) + ' <select id="dd-cmp-key">' +
      CMP_KEYS.filter((k) => D.units[k]).map((k) => '<option value="' + k + '"' + (k === cmpKey ? ' selected' : '') + '>' + esc(D.units[k].label[L] || D.units[k].label.en) + '</option>').join('') +
      '</select></label></div><div class="dd-chart"><canvas id="dd-cmp"></canvas></div></div>', esc(T.capCmp) + ' · ' + esc(T.srcLbl(SRC.worldbank_wdi, per(yr || ''))));

    // Pulse: the latest reading per market (national monthly / quarterly where published, else the latest year).
    const fxBy = Object.fromEntries((D.fx || []).map((f) => [f.code, f]));
    const arrow = (v, p) => (v == null || p == null || v === p ? '' : v > p ? ' <span class="dd-ar">▲</span>' : ' <span class="dd-ar">▼</span>');
    const pcell = (x) => (x ? '<td>' + pct(x.value) + arrow(x.value, x.prev) + '<small>' + esc(per(x.period)) + '</small></td>' : '<td class="dd-na">–</td>');
    const annual = (cc, k) => { const a = (D.compare[cc] || {})[k] || []; const l = a[a.length - 1], b = a[a.length - 2]; return l ? { period: l[0], value: l[1], prev: b ? b[1] : null } : null; };
    // Policy rates come from central banks that need a key for most markets: the column shows once 4 markets have one.
    const rates = Object.values(D.pulse || {}).filter((p) => p.rate).length >= 4;
    h += sec(T.qNow, T.hPulse, '<div class="dd-card ed-table-wrap dd-pulse"><table class="ed-table"><thead><tr>' + T.pulseCols.filter((_c, i) => rates || i !== 2).map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      D.countries.map((c) => {
        const p = (D.pulse || {})[c.code] || {}, f = fxBy[c.code];
        const fxc = f && f.m1 ? (f.m1[1] / f.last[1] - 1) * 100 : null;
        return '<tr><td><a href="' + esc(href(c.slug)) + '">' + esc(nm(c.code)) + '</a></td>' + pcell(p.inflation || annual(c.code, 'inflation')) + (rates ? pcell(p.rate) : '') + pcell(p.growth || annual(c.code, 'gdp_growth')) +
          (fxc == null ? '<td class="dd-na">–</td>' : '<td class="' + (fxc >= 0 ? 'dd-up' : 'dd-dn') + '">' + (fxc > 0 ? '+' : '') + pct(fxc) + '<small>' + esc(per(f.last[0])) + '</small></td>') + '</tr>';
      }).join('') + '</tbody></table></div>', esc(T.capPulse));

    // Currencies: change against the US dollar over a month and a year (positive = the local currency gained).
    const fx = (D.fx || []).filter((f) => f.m1 || f.y1);
    const gain = (now, then) => (then ? (then[1] / now[1] - 1) * 100 : null);
    const fxRows = fx.map((f) => ({ code: f.code, m: gain(f.last, f.m1), y: gain(f.last, f.y1), day: f.last[0] })).sort((a, b) => (b.y || 0) - (a.y || 0));
    if (fxRows.length) h += sec(T.qNow, T.hFx, box('dd-fx'), esc(T.capFx(per(fxRows.map((r) => r.day).sort().pop()))));

    // Who invests where: the ASEAN matrix, or one investor's trend by market.
    const asean = D.invest.filter((s) => s.src === 'aseanstats' && !s.out);
    const years = [...new Set(asean.flatMap((s) => s.points.map((p) => p[0])))].sort();
    const ly = years[years.length - 1];
    const hosts = [...new Set(asean.map((s) => s.host))].sort((a, b) => nm(a).localeCompare(nm(b)));
    const at = (s, y) => { const p = s && s.points.find((x) => x[0] === y); return p ? p[1] : null; };
    if (!lens) {
      // Columns: the investors the filter offers (the buyers KIRA writes for), in a fixed order.
      const invs = LENS.filter((i) => asean.some((s) => s.investor === i));
      const max = Math.max(1, ...asean.filter((s) => invs.includes(s.investor)).map((s) => Math.abs(at(s, ly) || 0)));
      const cell = (v) => {
        if (v == null) return '<td class="dd-na">–</td>';
        const a = Math.min(1, Math.sqrt(Math.abs(v) / max));
        const bg = v >= 0 ? `rgba(26,102,240,${(a * 0.85).toFixed(2)})` : `rgba(220,38,38,${(a * 0.6).toFixed(2)})`;
        return '<td style="background:' + bg + ';color:' + (a > 0.5 ? '#fff' : 'inherit') + '">' + money(v) + '</td>';
      };
      h += sec(T.qWho, T.hMatrix(ly), '<div class="dd-card ed-table-wrap"><table class="ed-table dd-heat"><thead><tr><th>' + esc(T.hostInv) + '</th>' + invs.map((i) => '<th>' + esc(nm(i)) + '</th>').join('') + '</tr></thead><tbody>' +
        hosts.map((ho) => '<tr><td><a href="' + esc(href((D.countries.find((c) => c.code === ho) || {}).slug)) + '">' + esc(nm(ho)) + '</a></td>' + invs.map((i) => cell(at(asean.find((s) => s.host === ho && s.investor === i), ly))).join('') + '</tr>').join('') +
        '</tbody></table></div>', esc(T.capMatrix) + ' · ' + esc(T.srcLbl(SRC.aseanstats, per(ly))));
    } else {
      const mine = asean.filter((s) => s.investor === lens);
      if (mine.length) h += sec(T.qWho, T.hLensLine(nm(lens)), box('dd-lensline'), esc(T.neg) + ' ' + esc(T.srcLbl(SRC.aseanstats, per(ly))));
      // The investor's own statistics (Bank of Japan, Taiwan approvals): latest window by market, our 15 markets only.
      const own = D.invest.filter((s) => s.out && s.investor === lens && NAMES[s.host]);
      if (own.length) {
        const w = windows(own);
        h += sec(T.qWho, (/_YTD$/.test(own[0].product) ? T.hOutYtd : T.hOut)(nm(lens), per(w.last)), box('dd-own'), esc(T.srcLbl(SRC[own[0].src] || own[0].src, per(w.last))));
      }
    }
    h += '<div id="dd-moves"></div>' + credits();
    el.innerHTML = h;
    el.querySelectorAll('.dd-league tbody tr').forEach((tr, i) => tr.addEventListener('click', (e) => { if (e.target.tagName !== 'A') location.href = href(rows[i].c.slug); }));

    if (!setup()) return;
    const pts = rows.map((r) => ({ x: r.inc, y: r.g, r: Math.max(4, Math.sqrt((r.gdp || 0) / 1e9) * 0.8), n: nm(r.c.code), slug: r.c.slug }));
    draw('dd-bubble', {
      type: 'bubble', data: { datasets: [{ data: pts, backgroundColor: 'rgba(26,102,240,.28)', borderColor: '#1A66F0', borderWidth: 1 }] },
      options: {
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => `${x.raw.n}: ${pct(x.raw.y)}, ${money(x.raw.x)}` } } },
        scales: { x: { type: 'logarithmic', title: { display: true, text: T.xInc }, ticks: { callback: (v) => ([1000, 3000, 10000, 30000, 100000].includes(v) ? money(v) : '') } },
          y: { title: { display: true, text: T.yGrowth } } },
        onClick: (_e, els) => { if (els.length) location.href = href(pts[els[0].index].slug); }
      },
      plugins: [{ id: 'labels', afterDatasetsDraw(ch) {
        const ctx = ch.ctx; ctx.save(); ctx.font = '11px Satoshi, system-ui, sans-serif'; ctx.fillStyle = '#0F172A';
        ch.getDatasetMeta(0).data.forEach((p, i) => ctx.fillText(pts[i].n, p.x + p.options.radius + 3, p.y + 4));
        ctx.restore();
      } }]
    });
    drawCompare();
    el.querySelectorAll('.dd-chip').forEach((b) => b.addEventListener('click', () => {
      const cc = cmpable.find((c) => c.code === b.dataset.cc).code;   // a code from the list, not the page text
      if (cmp.includes(cc)) cmp = cmp.filter((x) => x !== cc); else if (cmp.length < 5) cmp = [...cmp, cc]; else return;
      b.classList.toggle('on', cmp.includes(cc)); b.setAttribute('aria-pressed', cmp.includes(cc));
      drawCompare();
    }));
    const ck = document.getElementById('dd-cmp-key');
    if (ck) ck.addEventListener('change', () => { cmpKey = CMP_KEYS[CMP_KEYS.indexOf(ck.value)] || 'gdp_growth'; drawCompare(); });
    if (fxRows.length) {
      draw('dd-fx', { type: 'bar', data: { labels: fxRows.map((r) => nm(r.code)), datasets: [
        { label: T.fx1m, data: fxRows.map((r) => r.m), backgroundColor: '#BFD3FB' },
        { label: T.fx1y, data: fxRows.map((r) => r.y), backgroundColor: fxRows.map((r) => ((r.y || 0) < 0 ? '#94A3B8' : '#1A66F0')) }] },
        options: { plugins: { tooltip: { callbacks: { label: (x) => x.dataset.label + ': ' + (x.raw > 0 ? '+' : '') + pct(x.raw) } } }, scales: { y: { ticks: { callback: (v) => v + '%' } } } } });
    }
    if (lens) {
      const mine = asean.filter((s) => s.investor === lens).sort((a, b) => Math.abs(at(b, ly) || 0) - Math.abs(at(a, ly) || 0));
      draw('dd-lensline', { type: 'line', data: { labels: years.map(per), datasets: mine.map((s, i) => ({ label: nm(s.host), data: years.map((y) => at(s, y)), borderColor: PAL[i % 8], backgroundColor: PAL[i % 8], tension: 0, pointRadius: 2 })) },
        options: { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: tipMoney('USD') }, scales: { y: moneyAxis('USD') } } });
      const own = D.invest.filter((s) => s.out && s.investor === lens && NAMES[s.host]);
      if (own.length) {
        const w = windows(own), list = w.rows.filter((r) => r.cur != null).sort((a, b) => b.cur - a.cur), c = own[0].currency;
        draw('dd-own', { type: 'bar', data: { labels: list.map((r) => nm(r.s.host)), datasets: [
          { label: w.label, data: list.map((r) => r.cur), backgroundColor: '#1A66F0' },
          ...(w.prevLabel ? [{ label: w.prevLabel, data: list.map((r) => r.prev), backgroundColor: '#BFD3FB' }] : [])] },
          options: { plugins: { tooltip: tipMoney(c) }, scales: { y: moneyAxis(c) } } });
      }
    }
    moves(document.getElementById('dd-moves'), null);
  }

  // ---- one market ---------------------------------------------------------------------------------------
  function renderCountry(el, code) {
    const C = nm(code);
    let h = '';
    const draws = [];

    // Trade momentum (monthly trade by partner, from this market's own statistics).
    const tr = D.trade.filter((s) => s.reporter === code);
    if (tr.length) {
      const c = tr[0].currency, months = [...new Set(tr.flatMap((s) => s.points.map((p) => p[0])))].sort();
      const lastM = months[months.length - 1];
      const sum = (s, a, b) => (s ? s.points.slice(a, b).reduce((t, p) => t + p[1], 0) : null);
      const l12 = (s) => s.points.slice(-12).reduce((t, p) => t + p[1], 0);
      const pick = (flow) => (lens ? tr.filter((s) => s.flow === flow && s.partner === lens) : tr.filter((s) => s.flow === flow && s.partner !== 'WLD').sort((a, b) => l12(b) - l12(a)).slice(0, 5));
      // Trade balance per partner over the last 12 months (exports minus imports), partners with both directions.
      const bal = [...new Set(tr.filter((s) => s.partner !== 'WLD').map((s) => s.partner))].map((p) => {
        const x = tr.find((s) => s.flow === 'X' && s.partner === p), m = tr.find((s) => s.flow === 'M' && s.partner === p);
        return x && m ? { p, v: sum(x, -12) - sum(m, -12) } : null;
      }).filter(Boolean).sort((a, b) => b.v - a.v);
      const kpi = (label, s) => { if (!s) return ''; const a = sum(s, -12), b = s.points.length >= 24 ? sum(s, -24, -12) : null, g = change(a, b);
        return '<div class="ed-tile"><span class="lbl">' + esc(label) + '</span><span class="val">' + esc(money(a, c)) + '</span><span class="sub">' + esc(T.win12(per(lastM))) +
          (g == null ? '' : ' · <b class="' + (g >= 0 ? 'dd-up' : 'dd-dn') + '">' + (g >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(g)) + '</b> ' + esc(T.yoy)) + '</span></div>'; };
      const fx = (f) => tr.find((s) => s.flow === f && s.partner === (lens || 'WLD'));
      const tiles = lens ? kpi(T.exTo(C, nm(lens)), fx('X')) + kpi(T.imFrom(C, nm(lens)), fx('M')) : kpi(T.totEx(C), fx('X')) + kpi(T.totIm(C), fx('M'));
      if (!lens || pick('X').length || pick('M').length) {
        h += sec(T.qTrade, lens ? T.hTradeLens(C, nm(lens)) : T.hTrade(C),
          (tiles ? '<div class="ed-tiles">' + tiles + '</div>' : '') +
          '<div class="dd-grid2 dd-even"><div class="dd-card"><h3>' + esc(T.imports(C)) + '</h3><div class="dd-chart"><canvas id="dd-tm"></canvas></div></div>' +
          '<div class="dd-card"><h3>' + esc(T.exports(C)) + '</h3><div class="dd-chart"><canvas id="dd-tx"></canvas></div></div></div>',
          esc(T.srcLbl(SRC[tr[0].src] || tr[0].src, per(lastM))) +
          (bal.length ? '</p><h3 class="dd-sub">' + esc(T.hBal(C, per(lastM))) + '</h3><div class="dd-card"><div class="dd-chart" style="height:' + Math.max(220, bal.length * 30 + 60) + 'px"><canvas id="dd-bal"></canvas></div></div><p class="dd-cap">' + esc(T.capBal) : ''));
        if (bal.length) draws.push(() => draw('dd-bal', { type: 'bar', data: { labels: bal.map((r) => nm(r.p)), datasets: [{ data: bal.map((r) => r.v),
          backgroundColor: bal.map((r) => (lens && r.p !== lens ? (r.v >= 0 ? '#BFD3FB' : '#F5C2C2') : r.v >= 0 ? '#1A66F0' : '#DC2626')) }] },
          options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => money(x.raw, c) } } }, scales: { x: moneyAxis(c) } } }));
        const opt = { interaction: { mode: 'index', intersect: false }, plugins: { tooltip: tipMoney(c) }, scales: { y: moneyAxis(c), x: { ticks: { maxTicksLimit: 8 } } } };
        const ds = (f) => pick(f).map((s, i) => ({ label: nm(s.partner), data: months.map((m) => { const p = s.points.find((x) => x[0] === m); return p ? p[1] : null; }), borderColor: PAL[i], backgroundColor: PAL[i], tension: 0, pointRadius: 0, borderWidth: 2 }));
        draws.push(() => draw('dd-tm', { type: 'line', data: { labels: months.map(per), datasets: ds('M') }, options: opt }));
        draws.push(() => draw('dd-tx', { type: 'line', data: { labels: months.map(per), datasets: ds('X') }, options: opt }));
      }
    }

    // Who is investing: one chart per source and measure.
    const inv = D.invest.filter((s) => s.host === code && (lens ? s.investor === lens : !s.out && s.investor !== 'WLD' && s.investor !== 'ASEAN'));
    const groups = {};
    for (const s of inv) (groups[[s.src, s.product, s.out ? 1 : 0].join('|')] = groups[[s.src, s.product, s.out ? 1 : 0].join('|')] || []).push(s);
    const blocks = Object.values(groups).sort((a, b) => ({ A: 2, Q: 1, M: 0 }[a[0].freq] - { A: 2, Q: 1, M: 0 }[b[0].freq]));
    if (blocks.length) {
      let body = '';
      blocks.forEach((list, k) => {
        const f = list[0], c = f.currency, id = 'dd-inv' + k;
        const title = f.out ? T.prod[f.product + '_OUT'](nm(f.investor)) : T.prod[f.product] + (lens ? '' : ', ' + T.bySource);
        const lastP = list.flatMap((s) => s.points.map((p) => p[0])).sort().pop();
        body += '<div class="dd-card"><h3>' + esc(title) + '</h3><div class="dd-chart"><canvas id="' + id + '"></canvas></div><p class="dd-cap">' + esc(T.srcLbl(SRC[f.src] || f.src, per(lastP))) + (f.product === 'FDI_NET' ? ' · ' + esc(T.neg) : '') + '</p></div>';
        // Year-to-date figures restart every January, so they are always compared with the same period a year before.
        if ((f.freq === 'A' || lens) && !/_YTD$/.test(f.product)) {
          // A time series: by year for annual data; with one investor, every period.
          const periods = [...new Set(list.flatMap((s) => s.points.map((p) => p[0])))].sort().slice(f.freq === 'M' ? -24 : 0);
          const top = list.slice().sort((a, b) => Math.abs((b.points[b.points.length - 1] || [])[1] || 0) - Math.abs((a.points[a.points.length - 1] || [])[1] || 0)).slice(0, 6);
          const one = top.length === 1;
          draws.push(() => draw(id, { type: one ? 'bar' : 'line', data: { labels: periods.map(per), datasets: top.map((s, i) => ({ label: nm(s.investor), data: periods.map((p) => { const x = s.points.find((y) => y[0] === p); return x ? x[1] : null; }),
            borderColor: PAL[i], backgroundColor: one ? periods.map((p) => { const x = s.points.find((y) => y[0] === p); return x && x[1] < 0 ? '#94A3B8' : PAL[i]; }) : PAL[i], tension: 0, pointRadius: 2 })) },
            options: { interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: !one }, tooltip: tipMoney(c) }, scales: { y: moneyAxis(c), x: { ticks: { maxTicksLimit: 10 } } } } }));
        } else {
          const w = windows(list), rows = w.rows.filter((r) => r.cur != null).sort((a, b) => b.cur - a.cur).slice(0, 8);
          draws.push(() => draw(id, { type: 'bar', data: { labels: rows.map((r) => nm(r.s.investor)), datasets: [
            { label: w.label, data: rows.map((r) => r.cur), backgroundColor: '#1A66F0' },
            ...(w.prevLabel ? [{ label: w.prevLabel, data: rows.map((r) => r.prev), backgroundColor: '#BFD3FB' }] : [])] },
            options: { plugins: { tooltip: tipMoney(c) }, scales: { y: moneyAxis(c) } } }));
        }
      });
      h += sec(T.qWho, lens ? T.hInvestLens(nm(lens), C) : T.hInvest(C), '<div class="dd-grid2 dd-even">' + body + '</div>');
    } else if (lens) {
      h += sec(T.qWho, T.hInvestLens(nm(lens), C), '<p class="dd-cap">' + esc(T.noLens(nm(lens), C)) + '</p>');
    }
    if (lens && CORRIDOR[lens] && lens !== code) {
      h += '<div class="ed-links"><a class="r-btn r-btn-outline" href="/' + L + '/data/' + CORRIDOR[lens] + '-in-' + (D.countries.find((x) => x.code === code) || {}).slug + '">' + esc(T.corridor(nm(lens), C)) + '</a></div>';
    }
    h += '<div id="dd-moves"></div>';
    el.innerHTML = h;
    if (setup()) draws.forEach((f) => f());
    moves(document.getElementById('dd-moves'), code);
  }

  async function mount(o) {
    let ok = true;
    try { await data(); } catch (_e) { ok = false; }
    if (!ok) { if (o.body) o.body.innerHTML = ''; return; }
    const paint = () => {
      charts.splice(0).forEach((c) => c.destroy());
      if (o.bar) bar(o.bar, o.code);
      if (o.body) (o.code ? renderCountry(o.body, o.code) : renderAll(o.body));
      const sel = document.getElementById('dd-lens');
      if (sel) sel.addEventListener('change', () => {
        lens = pickLens(sel.value);
        const u = new URL(location.href);
        if (lens) u.searchParams.set('from', lens); else u.searchParams.delete('from');
        history.replaceState(null, '', u.pathname + u.search);
        paint();
      });
    };
    paint();
  }

  window.kiraDash = { mount };
})();
