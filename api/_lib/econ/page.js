// ============================================================
// KIRA RESEARCH — api/_lib/econ/page.js
// Server-rendered body of /<locale>/data/<country> (api/econ-page.js): lead sentence, headline tiles, six-year table,
// trade / investment / visitor links, sources, cite box and the schema.org Dataset. Same facts and wording as the
// browser script public/js/econ-view.js (which still renders over this HTML and adds charts and downloads); the
// TEXT block below is copied from it, so change a sentence in both. No model writes any text.
// ============================================================
import { esc, ldJson } from '../ssr.js';
import { monthYear } from '../cite.js';
import { countryName } from '../geo-i18n.js';

export const BASE = 'https://kiraresearch.com';
const NUMS = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' };

export const TEXT = {
  en: {
    title: 'Market data', h1: (c) => `${c}: market data`, all: 'All markets', latest: 'Latest', history: 'Last six years',
    growthChart: 'Real GDP growth', growthUnit: '% per year', indicator: 'Indicator', updated: (d) => `Data refreshed ${d}.`,
    reports: (c) => `KIRA reports on ${c}`, notFound: 'Market not found', loadFail: 'Could not load the data. Please retry in a moment.',
    none: (c) => `Data for ${c} comes from its national statistics office and is being added.`,
    indexH1: 'Market data for 15 Asia-Pacific markets', indexLead: 'Compare the 15 markets KIRA covers, see who is investing where, and follow trade and company moves. Public sources only, refreshed every week; company moves every day.',
    lead: (c, v) => `${c}'s real GDP ${v.neg ? 'shrank' : 'grew'} <b>${v.growthAbs}</b> in ${v.year}` + (v.gdp ? `, with GDP at <b>${v.gdp}</b>.` : '.') +
      (v.hh ? ` Households spent <b>${v.hh}</b>` + (v.fdi ? `, and foreign direct investment brought a net <b>${v.fdi}</b>.` : '.') : ''),
    ofYear: (y) => `${y}`,
    citeThis: 'Cite this page', copyCite: 'Copy citation', copied: 'Copied',
    according: (m, src) => `According to KIRA Research${m ? ` (${m})` : ''}, citing ${src}: `,
    dsDesc: (c) => `${c}: headline economic indicators, trade, investment and visitor links from public statistical sources, refreshed weekly.`,
    xlsx: 'Download the full history (Excel)', xlsxPlan: 'The full history in Excel comes with the Month plan.', xlsxSeePlan: 'See the plan', xlsxFail: 'The download did not work. Please try again.',
    showAll: (n) => `Show all ${n}`, recent: 'Most recent figures', links: 'Trade, investment and visitor links', linkCol: 'Link', periodCol: 'Period', valueCol: 'Value', changeCol: 'vs. year before',
    win: { M: (a, b) => `12 months to ${b}`, Q: (a, b) => `4 quarters to ${b}`, A: (a, b) => b }, ytd: (a, b) => `${a} – ${b}`,
    grp: { TOTAL: 'Merchandise trade', FDI: 'Direct investment', VISITORS: 'Visitors' },
    link: {
      TOTAL_X: (r, p) => p ? `${r} exports to ${p}` : `${r} total exports`, TOTAL_M: (r, p) => p ? `${r} imports from ${p}` : `${r} total imports`,
      FDI_NET_X: (r, p) => `${r} direct investment in ${p} (net)`, FDI_NET_M: (r, p) => `${p} direct investment in ${r} (net)`,
      FDI_APPROVED_M: (r, p) => `Approved investment from ${p} in ${r}`,
      FDI_REALISED_M: (r, p) => p ? `Realised investment from ${p} in ${r}` : `Realised foreign investment in ${r}`,
      FDI_REG_YTD_M: (r, p) => p ? `Registered investment from ${p} in ${r} (new + added capital)` : `Registered foreign investment in ${r} (new + added capital)`,
      FDI_APPROVED_X: (r, p) => p ? `Approved investment from ${r} in ${p}` : `Approved outward investment from ${r}`,
      VISITORS_M: (r, p) => p ? `Visitors from ${p} to ${r}` : `Visitor arrivals in ${r}`
    },
    quarter: (y, q) => `Q${q} ${y}`,
    extra: { CN: 'China', HK: 'Hong Kong', US: 'United States', ASEAN: 'ASEAN' }
  },
  ja: {
    title: '市場データ', h1: (c) => `${c}：市場データ`, all: '全市場', latest: '最新', history: '直近6年',
    growthChart: '実質GDP成長率', growthUnit: '％（前年比）', indicator: '指標', updated: (d) => `データ更新日：${d}`,
    reports: (c) => `${c}に関するKIRAレポート`, notFound: '市場が見つかりません', loadFail: 'データを読み込めませんでした。しばらくしてから再度お試しください。',
    none: (c) => `${c}のデータは同国の統計機関から追加中です。`,
    indexH1: 'アジア太平洋15市場の市場データ', indexLead: 'KIRAが対象とする15市場を比較し、どこに誰が投資しているか、貿易と企業の動きを追えます。公開データのみ使用し毎週更新、企業の動きは毎日更新しています。',
    lead: (c, v) => (v.growth ? `${c}の${v.year}年の実質GDP成長率は<b>${v.growth}</b>` : '') + (v.gdp ? `、名目GDPは<b>${v.gdp}</b>でした。` : '。') +
      (v.hh ? `家計消費支出は<b>${v.hh}</b>` + (v.fdi ? `、対内直接投資の純流入は<b>${v.fdi}</b>です。` : 'です。') : ''),
    ofYear: (y) => `${y}年`,
    citeThis: 'このページを引用', copyCite: '引用をコピー', copied: 'コピーしました',
    according: (m, src) => `KIRA Research${m ? `（${m}）` : ''}によると（出典：${src}）：`,
    dsDesc: (c) => `${c}の主要経済指標、貿易・投資・訪問者のつながり。公的統計を出典とし、毎週更新。`,
    xlsx: '全期間データをダウンロード（Excel）', xlsxPlan: '全期間データのExcelは月額プランでご利用いただけます。', xlsxSeePlan: 'プランを見る', xlsxFail: 'ダウンロードできませんでした。もう一度お試しください。',
    showAll: (n) => `すべて表示（${n}件）`, recent: '最新の数値', links: '貿易・投資・訪問者のつながり', linkCol: '項目', periodCol: '期間', valueCol: '値', changeCol: '前年比',
    win: { M: (a, b) => `${b}までの12か月`, Q: (a, b) => `${b}までの4四半期`, A: (a, b) => b }, ytd: (a, b) => `${a}～${b}`,
    grp: { TOTAL: '商品貿易', FDI: '直接投資', VISITORS: '訪問者' },
    link: {
      TOTAL_X: (r, p) => p ? `${r}から${p}への輸出` : `${r}の輸出総額`, TOTAL_M: (r, p) => p ? `${r}の${p}からの輸入` : `${r}の輸入総額`,
      FDI_NET_X: (r, p) => `${r}の${p}への直接投資（ネット）`, FDI_NET_M: (r, p) => `${p}の${r}への直接投資（ネット）`,
      FDI_APPROVED_M: (r, p) => `${p}から${r}への認可投資額`,
      FDI_REALISED_M: (r, p) => p ? `${p}から${r}への投資実行額` : `${r}への外国投資実行額`,
      FDI_REG_YTD_M: (r, p) => p ? `${p}から${r}への登録投資額（新規＋増資）` : `${r}への外国投資登録額（新規＋増資）`,
      FDI_APPROVED_X: (r, p) => p ? `${r}から${p}への認可投資額` : `${r}の対外投資認可額`,
      VISITORS_M: (r, p) => p ? `${p}から${r}への訪問者数` : `${r}への訪問者数`
    },
    quarter: (y, q) => `${y}年第${q}四半期`,
    extra: { CN: '中国', HK: '香港', US: '米国', ASEAN: 'ASEAN' }
  },
  ko: {
    title: '시장 데이터', h1: (c) => `${c}: 시장 데이터`, all: '전체 시장', latest: '최신', history: '최근 6년',
    growthChart: '실질 GDP 성장률', growthUnit: '% (전년 대비)', indicator: '지표', updated: (d) => `데이터 갱신일: ${d}`,
    reports: (c) => `${c} 관련 KIRA 보고서`, notFound: '시장을 찾을 수 없습니다', loadFail: '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
    none: (c) => `${c} 데이터는 해당국 통계청 자료로 추가하는 중입니다.`,
    indexH1: '아시아·태평양 15개 시장 데이터', indexLead: 'KIRA가 다루는 15개 시장을 비교하고, 누가 어디에 투자하는지, 무역과 기업 동향을 살펴보세요. 공개 자료만 사용해 매주 갱신하며, 기업 동향은 매일 갱신합니다.',
    lead: (c, v) => (v.growth ? `${c}의 ${v.year}년 실질 GDP 성장률은 <b>${v.growth}</b>` : '') + (v.gdp ? `, 명목 GDP는 <b>${v.gdp}</b>입니다.` : '입니다.') +
      (v.hh ? ` 가계 소비지출은 <b>${v.hh}</b>` + (v.fdi ? `, 외국인직접투자 순유입은 <b>${v.fdi}</b>입니다.` : '입니다.') : ''),
    ofYear: (y) => `${y}년`,
    citeThis: '이 페이지 인용', copyCite: '인용 복사', copied: '복사됨',
    according: (m, src) => `KIRA Research${m ? `(${m})` : ''}에 따르면(출처: ${src}): `,
    dsDesc: (c) => `${c}의 주요 경제 지표와 무역·투자·방문객 연결. 공개 통계를 출처로 하며 매주 갱신.`,
    xlsx: '전체 기간 데이터 내려받기(Excel)', xlsxPlan: '전체 기간 Excel 데이터는 월간 플랜에 포함됩니다.', xlsxSeePlan: '플랜 보기', xlsxFail: '내려받지 못했습니다. 다시 시도해 주세요.',
    showAll: (n) => `전체 보기(${n}개)`, recent: '최신 수치', links: '무역·투자·방문객 연결', linkCol: '항목', periodCol: '기간', valueCol: '값', changeCol: '전년 대비',
    win: { M: (a, b) => `${b}까지 12개월`, Q: (a, b) => `${b}까지 4개 분기`, A: (a, b) => b }, ytd: (a, b) => `${a}~${b}`,
    grp: { TOTAL: '상품 무역', FDI: '직접투자', VISITORS: '방문객' },
    link: {
      TOTAL_X: (r, p) => p ? `${r}의 ${p} 수출` : `${r} 총수출`, TOTAL_M: (r, p) => p ? `${r}의 ${p}산 수입` : `${r} 총수입`,
      FDI_NET_X: (r, p) => `${r}의 ${p} 직접투자(순)`, FDI_NET_M: (r, p) => `${p}의 ${r} 직접투자(순)`,
      FDI_APPROVED_M: (r, p) => `${p}에서 ${r}로의 승인 투자액`,
      FDI_REALISED_M: (r, p) => p ? `${p}의 ${r} 투자 실행액` : `${r} 외국인투자 실행액`,
      FDI_REG_YTD_M: (r, p) => p ? `${p}의 ${r} 등록 투자액(신규+증액)` : `${r} 외국인투자 등록액(신규+증액)`,
      FDI_APPROVED_X: (r, p) => p ? `${r}의 ${p} 승인 투자액` : `${r} 해외투자 승인액`,
      VISITORS_M: (r, p) => p ? `${p}발 ${r} 방문객` : `${r} 방문객 수`
    },
    quarter: (y, q) => `${y}년 ${q}분기`,
    extra: { CN: '중국', HK: '홍콩', US: '미국', ASEAN: '아세안' }
  },
  zh: {
    title: '市场数据', h1: (c) => `${c}：市场数据`, all: '全部市场', latest: '最新', history: '近六年',
    growthChart: '实际GDP增长率', growthUnit: '%（同比）', indicator: '指标', updated: (d) => `数据更新于${d}。`,
    reports: (c) => `KIRA关于${c}的报告`, notFound: '未找到该市场', loadFail: '无法加载数据，请稍后重试。',
    none: (c) => `${c}的数据来自其国家统计机构，正在添加中。`,
    indexH1: '亚太15个市场的市场数据', indexLead: '比较KIRA覆盖的15个市场，了解谁在投资哪里，追踪贸易与企业动态。仅使用公开数据，每周更新；企业动态每日更新。',
    lead: (c, v) => (v.growth ? `${c}${v.year}年实际GDP增长<b>${v.growth}</b>` : '') + (v.gdp ? `，国内生产总值为<b>${v.gdp}</b>。` : '。') +
      (v.hh ? `家庭消费支出为<b>${v.hh}</b>` + (v.fdi ? `，外国直接投资净流入<b>${v.fdi}</b>。` : '。') : ''),
    ofYear: (y) => `${y}年`,
    citeThis: '引用本页', copyCite: '复制引用', copied: '已复制',
    according: (m, src) => `据 KIRA Research${m ? `（${m}）` : ''}引用${src}的数据：`,
    dsDesc: (c) => `${c}的主要经济指标，以及贸易、投资与访客往来。数据来自公开统计，每周更新。`,
    xlsx: '下载完整历史数据（Excel）', xlsxPlan: '完整历史数据的Excel文件包含在月度方案中。', xlsxSeePlan: '查看方案', xlsxFail: '下载失败，请重试。',
    showAll: (n) => `显示全部（${n}项）`, recent: '最新数据', links: '贸易、投资与访客往来', linkCol: '项目', periodCol: '期间', valueCol: '数值', changeCol: '同比',
    win: { M: (a, b) => `截至${b}的12个月`, Q: (a, b) => `截至${b}的4个季度`, A: (a, b) => b }, ytd: (a, b) => `${a}至${b}`,
    grp: { TOTAL: '商品贸易', FDI: '直接投资', VISITORS: '访客' },
    link: {
      TOTAL_X: (r, p) => p ? `${r}对${p}出口` : `${r}出口总额`, TOTAL_M: (r, p) => p ? `${r}自${p}进口` : `${r}进口总额`,
      FDI_NET_X: (r, p) => `${r}对${p}直接投资（净额）`, FDI_NET_M: (r, p) => `${p}对${r}直接投资（净额）`,
      FDI_APPROVED_M: (r, p) => `${p}对${r}的获批投资`,
      FDI_REALISED_M: (r, p) => p ? `${p}对${r}的实际投资` : `${r}实际利用外资`,
      FDI_REG_YTD_M: (r, p) => p ? `${p}对${r}的登记投资（新增+增资）` : `${r}外资登记额（新增+增资）`,
      FDI_APPROVED_X: (r, p) => p ? `${r}对${p}的获批投资` : `${r}获批对外投资`,
      VISITORS_M: (r, p) => p ? `${p}赴${r}访客` : `${r}入境访客`
    },
    quarter: (y, q) => `${y}年第${q}季度`,
    extra: { CN: '中国', HK: '香港', US: '美国', ASEAN: '东盟' }
  }
};

// Tiles and table keys, as in econ-view.js.
const TILE_KEYS = ['gdp_usd', 'gdp_growth', 'gdp_per_capita', 'household_spend', 'inflation', 'population', 'fdi_inflow', 'urban_share'];

// data = the payload of GET /api/econ?country=… (api/_lib/econ/load.js). Returns the page parts.
export function econPage(data, locale) {
  const loc = NUMS[locale] ? locale : 'en';
  const T = TEXT[loc];
  const NL = NUMS[loc];
  const compact = new Intl.NumberFormat(NL, { notation: 'compact', maximumSignificantDigits: 4 });
  const plain = new Intl.NumberFormat(NL, { maximumFractionDigits: 0 });
  const dec = (d) => new Intl.NumberFormat(NL, { minimumFractionDigits: d, maximumFractionDigits: d });
  const money = {};
  const cur = (v, c) => (money[c] = money[c] || new Intl.NumberFormat(NL, { style: 'currency', currency: c, notation: 'compact', maximumSignificantDigits: 4 })).format(v);
  const monthFmt = new Intl.DateTimeFormat(NL, { year: 'numeric', month: 'short', timeZone: 'UTC' });
  const dayFmt = new Intl.DateTimeFormat(NL, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

  const fmt = (v, unit, currency) => {
    if (v === null || v === undefined || !Number.isFinite(v)) return '–';
    if (unit === 'lcu' && currency) return cur(v, currency);
    if (unit === 'persons') return compact.format(v);
    if (unit === 'usd') return 'US$' + compact.format(v);
    if (unit === 'usd_per_person') return 'US$' + plain.format(v);
    if (unit === 'people') return compact.format(v);
    if (unit === 'pct') return dec(1).format(v) + '%';
    if (unit === 'lcu_per_usd') return Math.abs(v) >= 100 ? plain.format(v) : dec(2).format(v);
    return String(v);
  };
  const per = (p) => {
    const q = /^(\d{4})-Q([1-4])$/.exec(p);
    if (q) return T.quarter(q[1], q[2]);
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p);
    if (d) return dayFmt.format(new Date(Date.UTC(+d[1], +d[2] - 1, +d[3])));
    const h = /^(\d{4})-(\d{2})-H([12])$/.exec(p);
    if (h) return monthFmt.format(new Date(Date.UTC(+h[1], +h[2] - 1, 1))) + ' ' + (h[3] === '1' ? '1–15' : '16–' + new Date(Date.UTC(+h[1], +h[2], 0)).getUTCDate());
    const m = /^(\d{4})-(\d{2})$/.exec(p);
    if (m) return monthFmt.format(new Date(Date.UTC(+m[1], +m[2] - 1, 1)));
    return T.ofYear(p);
  };
  const label = (ind) => (ind.label && (ind.label[loc] || ind.label.en)) || ind.key;
  const cname = (code, name) => countryName({ code, name }, loc);

  const C = cname(data.country.code, data.country.name);
  const byKey = Object.fromEntries(data.indicators.map((i) => [i.key, i]));
  const actual = (k) => ((byKey[k] && byKey[k].series) || []).filter((p) => !p[2]);
  const last = (k) => { const s = actual(k); return s.length ? s[s.length - 1] : null; };
  const at = (k, y) => { const p = actual(k).find((x) => x[0] === y); return p ? p[1] : null; };
  const pageUrl = `${BASE}/${loc}/data/${data.country.slug}`;
  const libLink = `<a class="r-btn r-btn-outline" href="/${loc}/library?country=${encodeURIComponent(data.country.name.toLowerCase())}">${esc(T.reports(C))}</a>`;
  const out = { title: `${T.h1(C)} — KIRA Research`, description: T.dsDesc(C), robots: data.indexable ? 'index, follow' : 'noindex, nofollow', pageUrl, ld: null, countryName: C };

  if (!data.indicators.length && !(data.flows || []).length) {
    out.content = `<div class="ed-main"><div class="ed-head"><h1>${esc(T.h1(C))}</h1><p class="ed-lead">${esc(T.none(C))}</p></div><div class="ed-links">${libLink}</div></div>`;
    out.empty = true;
    return out;
  }

  // Lead sentence: values of the latest year that has GDP growth.
  const g = last('gdp_growth');
  const year = g ? g[0] : null;
  const v = year ? {
    year, growth: fmt(g[1], 'pct'), growthAbs: fmt(Math.abs(g[1]), 'pct'), neg: g[1] < 0,
    gdp: at('gdp_usd', year) !== null ? fmt(at('gdp_usd', year), 'usd') : '',
    hh: at('household_spend', year) !== null ? fmt(at('household_spend', year), 'usd') : '',
    fdi: at('fdi_inflow', year) !== null ? fmt(at('fdi_inflow', year), 'usd') : '',
  } : null;
  out.lead = v;
  const monthLbl = data.updated_at ? monthYear(data.updated_at, loc) : '';
  const srcOf = (k) => { const x = (data.sources || []).find((q) => byKey[k] && q.key === byKey[k].source_key); return x ? x.name : null; };
  const leadSrc = [...new Set(year ? ['gdp_growth', 'gdp_usd', 'household_spend', 'fdi_inflow'].filter((k) => at(k, year) !== null).map(srcOf).filter(Boolean) : [])];
  const srcText = (leadSrc.length ? leadSrc : (data.sources || []).map((q) => q.name)).slice(0, 3).join('; ');
  const attr = srcText ? esc(T.according(monthLbl, srcText)) : '';
  const citation = `KIRA Research, ${T.h1(C)}, ${monthLbl || monthYear(null, loc)}, ${pageUrl}`;
  const citeBox = `<div class="rd-box kira-cite"><h3>${esc(T.citeThis)}</h3><p class="rd-cite">${esc(citation)}</p><div class="rd-share"><button type="button" data-cite-copy="${esc(citation)}" data-copied="${esc(T.copied)}">${esc(T.copyCite)}</button></div></div>`;

  const tiles = TILE_KEYS.filter((k) => last(k)).map((k) => {
    const p = last(k);
    return `<div class="ed-tile"><span class="lbl">${esc(label(byKey[k]))}</span><span class="val">${esc(fmt(p[1], byKey[k].unit))}</span><span class="sub">${esc(T.ofYear(p[0]))}</span></div>`;
  }).join('');

  const annual = data.indicators.filter((i) => i.freq === 'A');
  const years = [...new Set(annual.flatMap((i) => actual(i.key).map((p) => p[0])))].sort().slice(-6);
  const table = `<div class="ed-table-wrap"><table class="ed-table"><thead><tr><th>${esc(T.indicator)}</th>${years.map((y) => `<th>${esc(y)}</th>`).join('')}</tr></thead><tbody>` +
    annual.map((i) => `<tr><td>${esc(label(i))}</td>${years.map((y) => `<td>${esc(fmt(at(i.key, y), i.unit, i.params && i.params.currency))}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';

  const recent = data.indicators.filter((i) => i.freq !== 'A' && last(i.key)).map((i) => {
    const p = last(i.key);
    return `<div class="ed-tile"><span class="lbl">${esc(label(i))}</span><span class="val">${esc(fmt(p[1], i.unit, i.params && i.params.currency))}</span><span class="sub">${esc(per(p[0]))}</span></div>`;
  }).join('');

  const region = (code) => { try { return new Intl.DisplayNames([loc === 'zh' ? 'zh-CN' : loc], { type: 'region' }).of(code) || code; } catch (_e) { return code; } };
  const nm = (code) => (code === 'WLD' ? '' : data.names && data.names[code] ? cname(code, data.names[code]) : T.extra[code] || region(code));
  const GROUP = (f) => (f.product === 'TOTAL' ? 'TOTAL' : f.product === 'VISITORS' ? 'VISITORS' : 'FDI');
  const linkRows = (data.flows || []).filter((f) => T.link[`${f.product}_${f.flow}`]);
  const linkTable = ['TOTAL', 'FDI', 'VISITORS'].map((gr) => {
    const list = linkRows.filter((f) => GROUP(f) === gr).sort((a, b) => (b.partner === 'WLD') - (a.partner === 'WLD') || Math.abs(b.value) - Math.abs(a.value));
    if (!list.length) return '';
    // The server prints every row (no "show all" button): a crawler that does not run scripts sees them all.
    return `<tr class="ed-grp"><th colspan="4">${esc(T.grp[gr])}</th></tr>` + list.map((f) => {
      const unit = f.currency === 'persons' ? 'persons' : 'lcu';
      const ch = f.prev && f.prev > 0 && f.value > 0 ? (f.value / f.prev - 1) * 100 : null;
      return `<tr><td>${esc(T.link[`${f.product}_${f.flow}`](nm(f.reporter), nm(f.partner)))}</td><td>${esc((/_YTD$/.test(f.product) ? T.ytd : T.win[f.freq])(per(f.from), per(f.period)))}</td>` +
        `<td>${esc(fmt(f.value, unit, f.currency))}</td><td>${ch === null ? '–' : esc((ch > 0 ? '+' : '') + dec(1).format(ch) + '%')}</td></tr>`;
    }).join('');
  }).join('');

  const updatedTxt = data.updated_at ? T.updated(new Intl.DateTimeFormat(NL, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(data.updated_at))) : '';
  const sources = '<div class="ed-sources">' + (data.sources || []).map((s) => '<span>' + (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.attribution)}</a>` : esc(s.attribution)) + '</span>').join('') +
    (updatedTxt ? `<span>${esc(updatedTxt)}</span>` : '') + '</div>';

  const leadHtml = v ? `<p class="ed-lead">${attr}${T.lead(esc(C), Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === 'string' ? esc(x) : x])))}</p>` : '';
  out.content = '<div class="ed-main"><div id="dd-bar"></div>' +
    `<div class="ed-head"><h1>${esc(T.h1(C))}</h1>${leadHtml}</div>` +
    `<section class="ed-section"><h2>${esc(T.latest)}</h2><div class="ed-tiles">${tiles}</div></section>` +
    (recent ? `<section class="ed-section"><h2>${esc(T.recent)}</h2><div class="ed-tiles">${recent}</div></section>` : '') +
    (years.length ? `<section class="ed-section"><h2>${esc(T.history)}</h2>${table}</section>` : '') +
    (linkTable ? `<section class="ed-section"><h2>${esc(T.links)}</h2><div class="ed-table-wrap"><table class="ed-table ed-links-table"><thead><tr><th>${esc(T.linkCol)}</th><th>${esc(T.periodCol)}</th><th>${esc(T.valueCol)}</th><th>${esc(T.changeCol)}</th></tr></thead><tbody>${linkTable}</tbody></table></div></section>` : '') +
    `<section class="ed-section"><div id="ed-xlsx-box"></div>${sources}<div class="ed-links">${libLink}<a class="r-btn r-btn-outline" href="/${loc}/data/">${esc(T.all)}</a></div>${citeBox}</section></div>`;

  // schema.org Dataset, only where the page may be indexed. Same facts as the page: no new figures.
  if (data.indexable) {
    const ld = {
      '@context': 'https://schema.org', '@type': 'Dataset', name: T.h1(C), description: T.dsDesc(C), url: pageUrl,
      inLanguage: loc === 'zh' ? 'zh-Hans' : loc, isAccessibleForFree: true, citation,
      spatialCoverage: { '@type': 'Place', name: C },
      creator: { '@type': 'Organization', name: 'KIRA Research', url: `${BASE}/` },
      publisher: { '@type': 'Organization', name: 'KIRA Research', url: `${BASE}/` },
    };
    if (data.updated_at) ld.dateModified = String(data.updated_at).slice(0, 10);
    const bases = (data.sources || []).filter((q) => q.url).map((q) => ({ '@type': 'CreativeWork', name: q.name, url: q.url }));
    if (bases.length) ld.isBasedOn = bases;
    out.ld = ldJson(ld);
  }
  return out;
}
