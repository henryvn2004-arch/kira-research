// Fallback publisher for 2026-kr-fintech when the Supabase MCP transport
// is unavailable (net::ERR_FAILED). Upserts living_reports + 3 report_translations
// via PostgREST using SUPABASE_URL + SUPABASE_SERVICE_KEY from env.
//
// Run: node skills/kira-research-report/scripts/_publish_2026-kr-fintech_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'fintech-south-korea-2026';
const NOW = new Date().toISOString();

// Exec-chart page 4: Internet-bank net profit 2025 (KRW bn). Max 480 -> pct rel.
const chartBars = [
  { pct: 100, label: 'KakaoBank', value: 480 },
  { pct: 24,  label: 'K Bank',    value: 113 },
  { pct: 20,  label: 'Toss Bank', value: 97  },
];

const TOC_PAGES = ['PG 04','PG 05','PG 06','PG 07','PG 08','PG 09','PG 10','PG 11','PG 12','PG 13','PG 14','PG 15'];

function toc(names) {
  return names.map((name, i) => ({
    num: String(i + 1).padStart(2, '0'),
    name,
    pages: TOC_PAGES[i],
    locked: i !== 0,
  }));
}

const META = {
  en: {
    title: "South Korea fintech 2026: KakaoBank's profitability path & B2B embedded finance",
    eyebrow: 'SOUTH KOREA · FINTECH · MARKET ANALYSIS',
    preview: {
      lede: "The three internet-only banks have hit profit together for the first time, but their paths diverge sharply. KakaoBank is the test case — proving a platform model can earn a bank-grade return while the next leg of growth shifts to corporate credit and B2B embedded finance.",
      paragraphs: [
        "All three internet-only banks posted profit in 2025, a first. KakaoBank led with a record KRW 480 bn net profit [KakaoBank AR 2025]; Toss Bank roughly doubled to KRW 97 bn [FSC 2026]; K Bank slipped 12% to KRW 113 bn on its Upbit deposit-cost exposure [FSC 2026]. Scale is no longer the contest — return on equity is.",
        "With household-loan caps tightening, the banks are pivoting to corporate and sole-proprietor credit and to embedded distribution. KakaoBank's corporate book jumped ~80% in a year to KRW 3.4 trn [KakaoBank Q1 2026]; embedded finance is moving from consumer checkout into ERP, payroll, and SME invoice financing.",
      ],
      chart: {
        title: 'Internet-bank net profit, 2025',
        subtitle: 'South Korea · KRW bn',
        bars: chartBars,
      },
    },
    toc: toc([
      'Executive summary',
      'Strategic implications',
      'The market at inflection',
      'Market structure & sizing',
      'Internet-bank landscape',
      'The KakaoBank profitability path',
      'KakaoBank: company profile',
      'Loan mix & the road to 15% ROE',
      'Embedded finance moves B2B',
      'B2B embedded-finance plays',
      'Regulatory landscape',
      'AI impact & 2026-2030 outlook',
    ]),
  },

  ja: {
    title: '韓国フィンテック 2026:KakaoBankの収益化への道筋とB2B組込型金融',
    eyebrow: '韓国 · フィンテック · マーケット分析',
    preview: {
      lede: '3行のインターネット専業銀行が初めて揃って黒字を達成したが、その道筋は大きく分岐している。KakaoBank がその試金石——プラットフォームモデルで銀行水準のリターンを実証しつつ、次の成長軸を法人信用と B2B 組込型金融へと移行させている。',
      paragraphs: [
        '3行がいずれも 2025年に黒字を計上したのは初めてのことです。KakaoBank が純利益 KRW 480 bn で首位に立ち [KakaoBank AR 2025]、Toss Bank は約 2倍の KRW 97 bn [FSC 2026]、K Bank は Upbit 預金コストの影響を受けて 12%減の KRW 113 bn となりました [FSC 2026]。競争の焦点は規模ではなく、自己資本利益率へと移っています。',
        '家計融資の上限規制が強化される中、各行は法人・個人事業主向け信用と組込型配送へとピボットしています。KakaoBank の法人融資残高は 1年で約 80%増の KRW 3.4 trn に達し [KakaoBank Q1 2026]、組込型金融は消費者決済から ERP、給与、SME 請求書ファイナンスへと移行しています。',
      ],
      chart: {
        title: 'インターネット銀行 純利益 2025年',
        subtitle: '韓国 · KRW bn',
        bars: chartBars,
      },
    },
    toc: toc([
      'エグゼクティブサマリー',
      '戦略的示唆',
      '転換点に立つ市場',
      '市場構造と規模',
      'インターネット銀行の競争構図',
      'KakaoBank 収益化への道筋',
      'KakaoBank：企業プロファイル',
      '融資構成と ROE 15%への道',
      '組込型金融の B2B シフト',
      'B2B 組込型金融の事業機会',
      '規制環境',
      'AI の影響と 2026-2030年展望',
    ]),
  },

  ko: {
    title: '한국 핀테크 2026: 카카오뱅크 수익성 경로와 B2B 임베디드 금융',
    eyebrow: '한국 · 핀테크 · 시장 분석',
    preview: {
      lede: '3개 인터넷전문은행이 사상 처음으로 동시에 흑자를 기록했으나, 경로는 뚜렷하게 갈린다. 카카오뱅크가 시험 사례다 — 플랫폼 모델이 은행급 수익률을 달성할 수 있는지를 증명하는 한편, 다음 성장 동력은 기업 여신과 B2B 임베디드 금융으로 이행하고 있습니다.',
      paragraphs: [
        '3개 인터넷전문은행이 2025년 모두 흑자를 기록했습니다 — 사상 최초입니다. 카카오뱅크가 역대 최고인 순이익 KRW 480 bn으로 선두에 섰으며[KakaoBank AR 2025], 토스뱅크는 KRW 97 bn으로 두 배 가까이 증가했고[FSC 2026], 케이뱅크는 업비트 예금 비용 부담으로 12% 감소한 KRW 113 bn을 기록했습니다[FSC 2026]. 이제 경쟁의 축은 규모에서 자기자본이익률(ROE)로 이동했습니다.',
        '가계대출 한도 규제가 강화되면서 각 은행은 기업·개인사업자 여신과 임베디드 배분 전략으로 방향을 전환하고 있습니다. 카카오뱅크의 기업 여신 잔액은 1년 사이 약 80% 증가해 KRW 3.4 trn에 달했으며[KakaoBank Q1 2026], 임베디드 금융은 소비자 결제에서 ERP·급여·중소기업 매출채권 금융으로 영역을 확장하고 있습니다.',
      ],
      chart: {
        title: '인터넷은행 순이익, 2025년',
        subtitle: '대한민국 · KRW bn',
        bars: chartBars,
      },
    },
    toc: toc([
      '경영진 요약',
      '전략적 시사점',
      '변곡점의 시장',
      '시장 구조 & 규모',
      '인터넷은행 경쟁 지형',
      '카카오뱅크의 수익성 경로',
      '카카오뱅크: 기업 프로파일',
      '여신 구성 변화와 ROE 15% 경로',
      '임베디드 금융의 B2B 이행',
      'B2B 임베디드 금융 유형',
      '규제 환경',
      'AI 영향 & 2026-2030 전망',
    ]),
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'South Korea', industry: 'Fintech', year: 2026,
    pages: 18, price: 39, currency: 'USD', status: 'published', published_at: NOW,
  }];
  let res = await fetch(`${URL}/rest/v1/living_reports?on_conflict=slug`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(lrBody),
  });
  let txt = await res.text();
  if (!res.ok) { console.error('living_reports upsert FAILED', res.status, txt); process.exit(1); }
  const reportId = JSON.parse(txt)[0].id;

  const rows = ['en', 'ja', 'ko'].map((loc) => ({
    report_id: reportId,
    locale: loc,
    title: META[loc].title,
    eyebrow: META[loc].eyebrow,
    preview: META[loc].preview,
    toc: META[loc].toc,
    pdf_url: `${reportId}/${loc}.pdf`,
    status: 'published',
    published_at: NOW,
  }));
  res = await fetch(`${URL}/rest/v1/report_translations?on_conflict=report_id,locale`, {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  });
  txt = await res.text();
  if (!res.ok) { console.error('report_translations upsert FAILED', res.status, txt); process.exit(1); }
  const locs = JSON.parse(txt).map((r) => r.locale).sort().join(',');

  console.log('REPORT_ID=' + reportId);
  console.log('TRANSLATIONS=' + locs);
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
