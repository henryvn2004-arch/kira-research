// Publisher for 2026-vn-dairy. Upserts living_reports + 3 report_translations
// via PostgREST using SUPABASE_URL + SUPABASE_SERVICE_KEY from env.
//
// Run: node skills/kira-research-report/scripts/_publish_2026-vn-dairy_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'dairy-vietnam-2026';
const NOW = new Date().toISOString();

// Vietnam dairy market trajectory (USD bn). 2022 5.3, 2025 6.2, 2028F 8.2, 2030F 9.8. Max 9.8 -> pct.
const chartBars = [
  { pct: 54,  label: '2022',  value: 5.3 },
  { pct: 63,  label: '2025',  value: 6.2 },
  { pct: 84,  label: '2028F', value: 8.2 },
  { pct: 100, label: '2030F', value: 9.8 },
];

const META = {
  en: {
    title: 'Vietnam dairy market 2026: premium import penetration and domestic consolidation',
    eyebrow: 'VIETNAM · DAIRY · MARKET ANALYSIS',
    preview: {
      lede: "A USD 6 bn category is pivoting from volume to value. Imports now fund the premium tier while a domestic leader consolidates the base — the next 24 months decide who captures the value shift. Per-capita consumption sits near 29 litres a year [VDA 2025], well below Thailand's 35 and Singapore's 45 — a structural runway. But the near-term story is value: domestic revenue grew only ~1% in 2025 while imports surged 36% [Customs 2025].",
      paragraphs: [
        "Domestic raw milk meets only ~40% of processing demand [VDA 2025]; the gap is filled by powder from New Zealand, the US and Australia. Foreign brands own the premium formula tier while Vinamilk and TH hold the liquid-milk base — a two-speed structure that defines the opportunity.",
        "Vinamilk holds near 48% of category value [Kantar BFP 2025], giving it pricing power in the base, but imported formula fragments the premium tier where no single brand dominates. Dairy exports reached USD 390.9 mn in 2025, up 20.6% [Customs 2025] — a second growth vector beyond domestic demand.",
      ],
      chart: {
        title: 'Dairy market trajectory',
        subtitle: 'Vietnam · USD bn · 2022-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',       pages: 'PG 04', locked: false },
      { num: '02', name: 'Macro context',           pages: 'PG 07', locked: true  },
      { num: '03', name: 'Sector sizing',           pages: 'PG 09', locked: true  },
      { num: '04', name: 'Segment economics',       pages: 'PG 10', locked: true  },
      { num: '05', name: 'Competitive landscape',   pages: 'PG 12', locked: true  },
      { num: '06', name: 'Demand and channels',     pages: 'PG 18', locked: true  },
      { num: '07', name: 'Regulatory landscape',    pages: 'PG 20', locked: true  },
      { num: '08', name: 'AI impact',               pages: 'PG 21', locked: true  },
      { num: '09', name: 'Five-year outlook',       pages: 'PG 23', locked: true  },
      { num: '10', name: 'Strategic implications',  pages: 'PG 24', locked: true  },
      { num: '11', name: 'Methodology endnote',     pages: 'PG 25', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム乳製品市場 2026：プレミアム輸入浸透と国内集約化',
    eyebrow: 'ベトナム · 乳製品 · マーケット分析',
    preview: {
      lede: 'USD 60億規模のカテゴリーが数量から価値へと軸足を移している。プレミアム層を輸入品が牽引する一方、国内大手が数量基盤を固める。今後24ヶ月が価値シフトの果実を誰が獲るかを決定する。一人当たり消費量は年間約29リットル[VDA 2025]にとどまり、タイの35、シンガポールの45を大きく下回る構造的な成長余地がある。ただし近期の本質は価値にあり、2025年の国内売上高はほぼ横ばいであった一方、輸入額は36%急増した[Customs 2025]。',
      paragraphs: [
        '国内生乳は加工需要の約40%しか充足できず[VDA 2025]、残りをニュージーランド・米国・オーストラリア産の粉乳が補填している。外資ブランドがプレミアム調製粉乳層を支配する一方、Vinamilk・THが液体乳の数量基盤を握る二極構造が機会の輪郭を規定している。',
        'Vinamilkはカテゴリー価値の約48%を握り[Kantar BFP 2025]、基盤での価格決定力を持つが、プレミアム層は単一ブランドが支配しない輸入調製粉乳によって断片化している。乳製品輸出は2025年にUSD 3億909万に達し、前年比+20.6%[Customs 2025]——国内需要を超えた第二の成長ベクトルである。',
      ],
      chart: {
        title: '乳製品市場の推移',
        subtitle: 'ベトナム · USD bn · 2022-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',      pages: 'P 04', locked: false },
      { num: '02', name: 'マクロ環境',                  pages: 'P 07', locked: true  },
      { num: '03', name: 'セクター規模',                pages: 'P 09', locked: true  },
      { num: '04', name: 'セグメント別経済性',          pages: 'P 10', locked: true  },
      { num: '05', name: '競争環境',                    pages: 'P 12', locked: true  },
      { num: '06', name: '需要と流通チャネル',          pages: 'P 18', locked: true  },
      { num: '07', name: '規制環境',                    pages: 'P 20', locked: true  },
      { num: '08', name: 'AI活用の影響',                pages: 'P 21', locked: true  },
      { num: '09', name: '5カ年見通し',                 pages: 'P 23', locked: true  },
      { num: '10', name: '戦略的示唆',                  pages: 'P 24', locked: true  },
      { num: '11', name: '方法論補足',                  pages: 'P 25', locked: true  },
    ],
  },

  ko: {
    title: '베트남 유제품 시장 2026: 프리미엄 수입 침투와 국내 집중화',
    eyebrow: '베트남 · 유제품 · 시장 분석',
    preview: {
      lede: 'USD 60억 규모 카테고리가 물량에서 가치 중심으로 전환하고 있습니다. 수입이 프리미엄 티어를 주도하는 동시에 국내 선도사가 기반을 공고히 하는 구조 — 향후 24개월이 가치 이동의 수혜자를 결정합니다. 1인당 소비량은 연간 약 29리터[VDA 2025]로 태국(35L)·싱가포르(45L)를 크게 하회하며 구조적 성장 여지가 존재합니다. 다만 근기간의 핵심은 가치 성장으로, 2025년 국내 매출이 ~1% 증가에 그친 반면 수입은 36% 급증했습니다[Customs 2025].',
      paragraphs: [
        '국내 원유는 가공 수요의 ~40%만 충당[VDA 2025]하며, 나머지는 뉴질랜드·미국·호주산 분유로 보완됩니다. 해외 브랜드가 프리미엄 조제분유 티어를 장악하는 반면 Vinamilk와 TH는 액상유 기반을 확보하는 이중 구조가 기회의 본질을 규정합니다.',
        'Vinamilk는 카테고리 가치의 약 48%를 보유[Kantar BFP 2025]하며 기반 시장에서 가격 결정력을 갖지만, 프리미엄 티어는 단일 브랜드가 지배하지 못하는 수입 조제분유로 분산되어 있습니다. 유제품 수출은 2025년 USD 3억 909만에 달해 전년比 +20.6%[Customs 2025] — 국내 수요를 넘어선 제2의 성장 동력입니다.',
      ],
      chart: {
        title: '유제품 시장 추세',
        subtitle: 'Vietnam · USD bn · 2022-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',           pages: 'P 04', locked: false },
      { num: '02', name: '거시 환경',             pages: 'P 07', locked: true  },
      { num: '03', name: '섹터 규모',             pages: 'P 09', locked: true  },
      { num: '04', name: '세그먼트별 경제성',     pages: 'P 10', locked: true  },
      { num: '05', name: '경쟁 구도',             pages: 'P 12', locked: true  },
      { num: '06', name: '수요와 유통 채널',      pages: 'P 18', locked: true  },
      { num: '07', name: '규제 환경',             pages: 'P 20', locked: true  },
      { num: '08', name: 'AI 영향',               pages: 'P 21', locked: true  },
      { num: '09', name: '5개년 전망',            pages: 'P 23', locked: true  },
      { num: '10', name: '전략적 시사점',         pages: 'P 24', locked: true  },
      { num: '11', name: '방법론 후기',           pages: 'P 25', locked: true  },
    ],
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'Vietnam', industry: 'Dairy', year: 2026,
    pages: 24, price: 39, currency: 'USD', status: 'published', published_at: NOW,
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
