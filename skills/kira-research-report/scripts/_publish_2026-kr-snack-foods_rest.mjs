// Publisher for 2026-kr-snack-foods via PostgREST (Supabase MCP-independent).
// Upserts living_reports + 3 report_translations using SUPABASE_URL +
// SUPABASE_SERVICE_KEY from env. Prints the resolved report_id on success.
//
// Run: node skills/kira-research-report/scripts/_publish_2026-kr-snack-foods_rest.mjs

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'snack-foods-south-korea-2026';
const NOW = new Date().toISOString();

// Korean ramyeon export trajectory (USD bn). Max 2.1 (2030F) -> pct=100.
const chartBars = [
  { pct: 37,  label: '2022',  value: '0.77' },
  { pct: 60,  label: '2024',  value: '1.25' },
  { pct: 72,  label: '2025',  value: '1.52' },
  { pct: 100, label: '2030F', value: '2.1' },
];

const TOC_PAGES = ['PG 04','PG 05','PG 06','PG 07','PG 08','PG 09','PG 11','PG 12','PG 14'];

const META = {
  en: {
    title: 'Korea snack foods 2026 — the record ramyeon export run and the private-label shelf rewrite',
    eyebrow: 'SOUTH KOREA · SNACK FOODS · MARKET ANALYSIS',
    preview: {
      lede: "Korean instant-noodle exports crossed USD 1.52 bn in 2025, up 21.8% — the first single food category past USD 1.5 bn [KCS 2026] — inside a record USD 13.62 bn K-Food export run [MAFRA 2026]. At home, a maturing, single-person, value-led market is being reshaped by convenience-store private label, now near 30% of chain sales [BGF Retail 2025]. The next leg of growth is set abroad and at the lowest price points.",
      paragraphs: [
        "Ramyeon exports have grown about 23% a year since 2021 and seven-fold over the decade [KCS 2026], with China up 47.9% to USD 385 m and the US at USD 255 m — together over 40% of shipments. The boom rewired the competitive order: Samyang, roughly 80% export-weighted, posted FY2025 revenue of KRW 2.35 trn, up 36% [Samyang FY2025], overtaking the domestic incumbent on profit.",
        "With the home market mature, convenience chains turned private label into the growth lever. CU private-label sales rose 19.1% in the first nine months of 2025 after 21.8% in 2024 [BGF Retail 2025]; the leading ultra-value range grew about 194% in a year to KRW 130 bn cumulative [GS25 2025]. Value tiers and export both expand; the undifferentiated mid-tier brand is squeezed.",
      ],
      chart: {
        title: 'Korean ramyeon export trajectory',
        subtitle: 'USD bn · 2015–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',          pages: TOC_PAGES[0], locked: false },
      { num: '02', name: 'Strategic implications',      pages: TOC_PAGES[1], locked: true  },
      { num: '03', name: 'Market sizing and segments',  pages: TOC_PAGES[2], locked: true  },
      { num: '04', name: 'Demand structure',            pages: TOC_PAGES[3], locked: true  },
      { num: '05', name: 'Channel and private label',   pages: TOC_PAGES[4], locked: true  },
      { num: '06', name: 'Competitive landscape',       pages: TOC_PAGES[5], locked: true  },
      { num: '07', name: 'AI and operations',           pages: TOC_PAGES[6], locked: true  },
      { num: '08', name: '5-year outlook and forecast', pages: TOC_PAGES[7], locked: true  },
      { num: '09', name: 'Methodology and sources',     pages: TOC_PAGES[8], locked: true  },
    ],
  },

  ja: {
    title: '韓国スナック食品 2026 — 記録的なラーメン輸出とPBによる棚の再編',
    eyebrow: '韓国 · スナック食品 · マーケット分析',
    preview: {
      lede: '韓国の即席麺輸出は2025年にUSD 15.2億、前年比+21.8%増を記録し、単一食品カテゴリーとして初めてUSD 15億を突破した[KCS 2026]。これはK-Food輸出過去最高のUSD 136.2億の一部を成す[MAFRA 2026]。国内では、成熟した単身世帯・バリュー主導の市場をコンビニのプライベートブランドが再編しており、現在はチェーン売上の約30%に迫っている[BGF Retail 2025]。次の成長局面は海外と最低価格帯で展開される。',
      paragraphs: [
        'ラーメン輸出は2021年以降年率約23%で成長し、10年間で7倍に達しています[KCS 2026]。中国は+47.9%増のUSD 3.85億、米国はUSD 2.55億と、2市場で出荷量の40%超を占めます。この急増が競争秩序を塗り替えました。輸出比率が約80%のサムヤンはFY2025売上高KRW 2.35兆、+36%増を計上し[Samyang FY2025]、利益面で国内首位企業を逆転しています。',
        '成熟した国内市場においてコンビニチェーンはPBを成長レバーに転換しました。CUのPB売上は2025年1〜9月に19.1%増（2024年は21.8%増）[BGF Retail 2025]、最上位の超低価格ラインは1年間で約194%増の累計KRW 1,300億に達しています[GS25 2025]。バリュー帯と輸出は共に拡大し、差別化されていないミドル帯ブランドは挟み撃ちにされています。',
      ],
      chart: {
        title: '韓国のラーメン輸出推移',
        subtitle: 'USD bn · 2015–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',        pages: TOC_PAGES[0], locked: false },
      { num: '02', name: '戦略的示唆',                    pages: TOC_PAGES[1], locked: true  },
      { num: '03', name: '市場規模とセグメント',          pages: TOC_PAGES[2], locked: true  },
      { num: '04', name: '需要構造',                      pages: TOC_PAGES[3], locked: true  },
      { num: '05', name: 'チャネルとプライベートブランド', pages: TOC_PAGES[4], locked: true  },
      { num: '06', name: '競争構造',                      pages: TOC_PAGES[5], locked: true  },
      { num: '07', name: 'AIと業務オペレーション',        pages: TOC_PAGES[6], locked: true  },
      { num: '08', name: '5カ年展望と予測',               pages: TOC_PAGES[7], locked: true  },
      { num: '09', name: '調査方法と出典',                pages: TOC_PAGES[8], locked: true  },
    ],
  },

  ko: {
    title: '한국 스낵 식품 2026 — 라면 수출 사상 최고치와 자체브랜드의 진열대 재편',
    eyebrow: '대한민국 · 스낵 식품 · 시장 분석',
    preview: {
      lede: '한국 즉석 면류 수출이 2025년 USD 15.2억을 돌파하며 21.8% 성장, 단일 식품 카테고리 최초로 USD 15억을 넘어섰습니다[KCS 2026]. 이는 사상 최고치인 USD 136.2억 K-Food 수출의 일환입니다[MAFRA 2026]. 국내에서는 성숙하고 1인 가구 중심의 가치 지향 시장이 편의점 자체브랜드에 의해 재편되고 있으며, 자체브랜드는 현재 체인 매출의 약 30%에 근접했습니다[BGF Retail 2025]. 다음 성장 구간은 해외와 최저가 가격대에서 열립니다.',
      paragraphs: [
        '라면 수출은 2021년 이후 연평균 약 23% 성장하며 10년간 7배 증가했습니다[KCS 2026]. 중국이 47.9% 급증하여 USD 3.85억, 미국은 USD 2.55억으로 두 시장이 수출의 40% 이상을 차지합니다. 수출 호황은 경쟁 질서를 재편했습니다. 수출 비중이 약 80%에 달하는 삼양은 FY2025 매출 KRW 2.35조, +36%를 기록하며[Samyang FY2025] 이익 기준으로 국내 선도사를 추월했습니다.',
        '성숙한 내수 시장에서 편의점 체인들은 자체브랜드를 성장 레버로 전환했습니다. CU 자체브랜드 매출은 2025년 9개월간 19.1% 성장하며 2024년 21.8%에 이어 증가세를 이어갔습니다[BGF Retail 2025]. 최저가 라인업은 1년간 약 194% 급성장하여 누적 KRW 1,300억에 달했습니다[GS25 2025]. 가치 가격대와 수출이 동시에 확대되는 반면, 차별화되지 않은 중간 가격대 브랜드는 압박을 받고 있습니다.',
      ],
      chart: {
        title: '한국 라면 수출 추이',
        subtitle: 'USD bn · 2015–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',            pages: TOC_PAGES[0], locked: false },
      { num: '02', name: '전략적 시사점',          pages: TOC_PAGES[1], locked: true  },
      { num: '03', name: '시장 규모 및 세그먼트',  pages: TOC_PAGES[2], locked: true  },
      { num: '04', name: '수요 구조',              pages: TOC_PAGES[3], locked: true  },
      { num: '05', name: '채널 및 자체브랜드',     pages: TOC_PAGES[4], locked: true  },
      { num: '06', name: '경쟁 구도',              pages: TOC_PAGES[5], locked: true  },
      { num: '07', name: 'AI와 공정 운영',         pages: TOC_PAGES[6], locked: true  },
      { num: '08', name: '5개년 전망 및 예측',     pages: TOC_PAGES[7], locked: true  },
      { num: '09', name: '방법론 및 출처',         pages: TOC_PAGES[8], locked: true  },
    ],
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'South Korea', industry: 'Snack Foods', year: 2026,
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
