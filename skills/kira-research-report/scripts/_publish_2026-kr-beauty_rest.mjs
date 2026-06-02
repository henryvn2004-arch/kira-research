// Publisher for 2026-kr-beauty via PostgREST (Supabase MCP transport has
// been intermittently unavailable — net::ERR_FAILED). Two upserts:
// living_reports + 3 report_translations, using SUPABASE_URL +
// SUPABASE_SERVICE_KEY from env.
//
// Run: node skills/kira-research-report/scripts/_publish_2026-kr-beauty_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'beauty-south-korea-2026';
const NOW = new Date().toISOString();

const chartBars = [
  { pct: 61,  label: '2021',  value: 9.2 },
  { pct: 76,  label: '2025',  value: 11.4 },
  { pct: 100, label: '2030F', value: 15.0 },
];

const TOC_PAGES = ['PG 04', 'PG 05', 'PG 07', 'PG 08', 'PG 10', 'PG 11', 'PG 12', 'PG 13', 'PG 14'];
const TOC_NAMES = {
  en: ['Executive summary', 'Strategic implications', 'Export sizing and destinations', 'The indie-brand structure', 'Dermocosmetics convergence and channels', 'Competitive landscape', 'AI and operations', '5-year outlook and forecast', 'Methodology and sources'],
  ja: ['エグゼクティブサマリー', '戦略的示唆', '輸出規模と仕向地', 'インディーブランド構造', 'ダーモコスメ融合とチャネル', '競争環境', 'AIとオペレーション', '5年間の見通しと予測', '調査方法と出典'],
  ko: ['경영진 요약', '전략적 시사점', '수출 규모 및 목적지', '인디 브랜드 구조', '더모코스메틱스 융합과 채널', '경쟁 구도', 'AI와 운영', '5개년 전망 및 예측', '방법론 및 출처'],
};
function buildToc(loc) {
  return TOC_NAMES[loc].map((name, i) => ({
    num: String(i + 1).padStart(2, '0'),
    name,
    pages: TOC_PAGES[i],
    locked: i !== 0,
  }));
}

const META = {
  en: {
    title: 'South Korea beauty 2026: the indie-brand export wave and dermocosmetics convergence',
    eyebrow: 'SOUTH KOREA · BEAUTY · MARKET ANALYSIS',
    preview: {
      lede: "Korean cosmetics exports reached a record USD 11.4 bn in 2025, up 12.3% YoY [KCS 2025], lifting Korea past the United States to the world's No. 2 exporter behind France [Korea Times 2025]. The growth axis has shifted: small and indie brands now drive more than 70% of beauty export value [KOTRA 2025], and dermocosmetics is the category doing the premiumization work the 2018 luxury cycle promised.",
      paragraphs: [
        "Exports reached 202 destinations in 2025, up from 172 a year earlier [Korea Herald 2025], as Europe, the Middle East and Latin America scaled alongside the US. The US is now the largest market at USD 2.2 bn [KCS 2025]; on a year-to-date basis US shipments passed China for the first time, easing the single-market China dependence that defined the prior cycle [KOTRA 2025].",
        "The growth is structurally indie. Contract developers Cosmax and Kolmar operate as a shared R&D-and-production layer, letting a startup take a brand from concept to Olive Young shelf in roughly 11 weeks versus ~38 for a major's internal pipeline [PwC K-beauty 2025]. ODM leaders posted record 2025 revenue on indie volume [Cosmax AR 2025].",
      ],
      chart: {
        title: 'Korean cosmetics export trajectory',
        subtitle: 'South Korea · USD bn · 2021–2030F',
        bars: chartBars,
      },
    },
    toc: buildToc('en'),
  },
  ja: {
    title: '韓国ビューティ 2026：インディーブランド輸出波とダーモコスメティクスの融合',
    eyebrow: '韓国 · ビューティ · マーケット分析',
    preview: {
      lede: '韓国の化粧品輸出は2025年にUSD 114億の記録を達成し、前年比+12.3% [KCS 2025]。韓国は米国を抜き、世界第2位の輸出国（フランスに次ぐ）に浮上しました [Korea Times 2025]。成長軸は変化しています：中小・インディーブランドがビューティ輸出価値の70%超を担い [KOTRA 2025]、ダーモコスメティクスが2018年の高級品サイクルが約束したプレミアム化を実現しています。',
      paragraphs: [
        '輸出先は2025年に202カ国へ拡大（前年172カ国） [Korea Herald 2025]。欧州・中東・中南米が米国と並行してスケールアップしています。米国は現在最大市場としてUSD 22億を記録 [KCS 2025]。年初来ベースでは米国向け出荷が中国を初めて上回り、前サイクルを特徴づけた中国への単一市場依存が緩和されています [KOTRA 2025]。',
        'この成長は構造的にインディー主導です。契約開発事業者のCosmax・Kolmarが共有R&D・生産レイヤーとして機能し、スタートアップが約11週間でOlive Young棚に商品を並べることを可能にしています（大手の内製パイプラインに比べ約38週短縮） [PwC K-beauty 2025]。ODM大手はインディー需要を背景に2025年の収益が過去最高を記録しました [Cosmax AR 2025]。',
      ],
      chart: {
        title: '韓国化粧品輸出の推移',
        subtitle: 'South Korea · USD bn · 2021–2030F',
        bars: chartBars,
      },
    },
    toc: buildToc('ja'),
  },
  ko: {
    title: '한국 뷰티 2026: 인디 브랜드 수출 파동과 더모코스메틱스 융합',
    eyebrow: '한국 · 뷰티 · 시장 분석',
    preview: {
      lede: '한국 화장품 수출은 2025년 역대 최고인 USD 114억을 기록하며 전년比 +12.3% 성장했고[KCS 2025], 한국은 미국을 제치고 프랑스에 이은 세계 2위 수출국으로 올라섰습니다[Korea Times 2025]. 성장축이 이동했습니다. 중소·인디 브랜드가 현재 뷰티 수출 가치의 70% 이상을 견인하며[KOTRA 2025], 더모코스메틱스가 2018년 럭셔리 사이클이 예고했던 프리미엄화를 실질적으로 수행하고 있습니다.',
      paragraphs: [
        '2025년 수출 목적지는 전년 172개국에서 202개국으로 확대되었으며[Korea Herald 2025], 유럽·중동·중남미가 미국과 함께 성장했습니다. 미국은 현재 USD 22억으로 최대 시장이며[KCS 2025], 연간 누계 기준으로는 미국 선적분이 처음으로 중국을 추월해 직전 사이클을 규정했던 중국 단일 시장 의존도가 완화되었습니다[KOTRA 2025].',
        '이 성장은 구조적으로 인디 주도입니다. ODM 업체 코스맥스와 콜마는 공유 R&D·생산 레이어로 기능하며, 스타트업이 브랜드 기획부터 Olive Young 입점까지 약 11주 — 대형사 내부 파이프라인의 ~38주 대비 — 만에 처리할 수 있게 합니다[PwC K-beauty 2025]. ODM 선두업체들은 2025년 인디 물량에 힘입어 사상 최대 매출을 기록했습니다[Cosmax AR 2025].',
      ],
      chart: {
        title: '한국 화장품 수출 추이',
        subtitle: 'South Korea · USD bn · 2021–2030F',
        bars: chartBars,
      },
    },
    toc: buildToc('ko'),
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'South Korea', industry: 'Beauty', year: 2026,
    pages: 14, price: 39, currency: 'USD', status: 'published', published_at: NOW,
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
