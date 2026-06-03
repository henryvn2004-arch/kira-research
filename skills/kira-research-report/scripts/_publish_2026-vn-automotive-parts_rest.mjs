// Fallback publisher for 2026-vn-automotive-parts when the Supabase MCP transport
// is unavailable (net::ERR_FAILED). Upserts living_reports + 3 report_translations
// via PostgREST using SUPABASE_URL + SUPABASE_SERVICE_KEY from env.
//
// Run: node skills/kira-research-report/scripts/_publish_2026-vn-automotive-parts_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'automotive-parts-vietnam-2026';
const NOW = new Date().toISOString();

// Vietnam auto components market (USD bn). 2023 4.5, 2026 6.4, 2029 9.3, 2032F 13.1. Max 13.1 -> pct.
const chartBars = [
  { pct: 34,  label: '2023',  value: 4.5 },
  { pct: 49,  label: '2026',  value: 6.4 },
  { pct: 71,  label: '2029',  value: 9.3 },
  { pct: 100, label: '2032F', value: 13.1 },
];

const META = {
  en: {
    title: 'Vietnam automotive parts 2026: Japanese OEM Tier-2 cluster expansion and the localization-rate reset',
    eyebrow: 'VIETNAM · AUTOMOTIVE PARTS · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam exports components at scale — global majors place wiring, seats, tyres, plastics and precision-mechanics plants here for shipment to the US, Europe and ASEAN [Vietnambiz 2025]. Yet the chain is shallow at home: makers produce mostly simple, bulky, low-tech, labour-intensive parts [Dan Viet 2024], so a domestically assembled car still carries roughly only 20% local content [Vietnam Briefing 2025] and the import bill climbs.",
      paragraphs: [
        "Decree 205 of 2025, effective 1 September 2025, lets prioritized supporting-industry firms recover up to 50% of machinery, R&D, training and technology-transfer cost [VietnamPlus 2025]. Paired with the standing 0% import duty on components for domestic assembly through 2027 [Vietnam Briefing 2025], it is aimed squarely at moving Vietnamese SMEs into the OEM-qualified Tier-2 tier [Kira estimates].",
        "This report covers the components market and trade structure, the localization-rate gap between actual and target, the northern and central supplier clusters and the Tier-2 base, the competitive landscape of foreign Tier-1 majors and OEM-anchored groups, AI at the quality and predictive-maintenance gate, and a 5-year outlook toward roughly USD 9 bn by 2030 with scenario sensitivities and five strategic action vectors.",
      ],
      chart: {
        title: 'Vietnam auto components market',
        subtitle: 'Vietnam · USD bn · 2023–2032F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',                 pages: 'PG 04', locked: false },
      { num: '02', name: 'Strategic implications',            pages: 'PG 05', locked: true  },
      { num: '03', name: 'Market sizing and trade structure', pages: 'PG 07', locked: true  },
      { num: '04', name: 'The localization gap and demand',   pages: 'PG 08', locked: true  },
      { num: '05', name: 'Cluster and supplier structure',    pages: 'PG 10', locked: true  },
      { num: '06', name: 'Competitive landscape',             pages: 'PG 11', locked: true  },
      { num: '07', name: 'AI and operations',                 pages: 'PG 12', locked: true  },
      { num: '08', name: '5-year outlook and forecast',       pages: 'PG 13', locked: true  },
      { num: '09', name: 'Methodology and sources',           pages: 'PG 14', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム自動車部品 2026：日系OEM Tier-2クラスター拡大と現地化率の再設定',
    eyebrow: 'ベトナム · 自動車部品 · マーケット分析',
    preview: {
      lede: 'ベトナムはグローバル規模で部品を輸出しています — 大手メーカーがワイヤリング、シート、タイヤ、プラスチック、精密機械の各工場を設け、米国・欧州・ASEANへ出荷しています[Vietnambiz 2025]。しかし国内の連鎖は浅く、製造される部品の大半は単純・大型・低技術・労働集約型に限られ[Dan Viet 2024]、国内組み立て車の現地コンテンツは依然として約20%程度にとどまり[Vietnam Briefing 2025]、輸入額は増加を続けています。',
      paragraphs: [
        '2025年政令205号（2025年9月1日施行）により、優先支援産業企業は機械・R&D・研修・技術移転費用の最大50%を回収できます[VietnamPlus 2025]。2027年まで国内組み立て向け部品の輸入関税0%が継続されること[Vietnam Briefing 2025]と組み合わせることで、ベトナム中小企業をOEM認定Tier-2層へ引き上げることを明確に狙った政策です[Kira estimates]。',
        '本レポートは部品市場と貿易構造、実績値と目標値の現地化率格差、北部・中部のサプライヤークラスターとTier-2基盤、外資系Tier-1大手とOEM系列グループの競争環境、品質・予知保全の制約点におけるAI、そして2030年に約USD 90億へ向かう5年間の見通しを、シナリオ感応度と5つの戦略的アクションベクターとともに扱います。',
      ],
      chart: {
        title: 'ベトナム自動車部品市場',
        subtitle: 'Vietnam · USD bn · 2023–2032F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',          pages: 'P 04', locked: false },
      { num: '02', name: '戦略的示唆',                      pages: 'P 05', locked: true  },
      { num: '03', name: '市場規模と貿易構造',              pages: 'P 07', locked: true  },
      { num: '04', name: '現地化格差と需要',                pages: 'P 08', locked: true  },
      { num: '05', name: 'クラスターとサプライヤー構造',    pages: 'P 10', locked: true  },
      { num: '06', name: '競争環境',                        pages: 'P 11', locked: true  },
      { num: '07', name: 'AIと生産オペレーション',          pages: 'P 12', locked: true  },
      { num: '08', name: '5年間の見通しと予測',             pages: 'P 13', locked: true  },
      { num: '09', name: '調査手法と出典',                  pages: 'P 14', locked: true  },
    ],
  },

  ko: {
    title: '베트남 자동차 부품 2026: 일본계 OEM Tier-2 클러스터 확장과 현지화율 재설정',
    eyebrow: '베트남 · 자동차 부품 · 시장 분석',
    preview: {
      lede: '베트남은 글로벌 주요 기업의 와이어링 하네스, 시트, 타이어, 플라스틱, 정밀 기계 부품을 미국·유럽·ASEAN으로 수출하고 있습니다[Vietnambiz 2025]. 그러나 국내 공급망은 구조적으로 얕습니다. 현지 생산 품목의 대부분은 단순·대형·저기술·노동 집약적 부품[Dan Viet 2024]에 그쳐, 국내에서 조립되는 차량의 현지 조달 비율은 여전히 약 20% 수준[Vietnam Briefing 2025]에 불과하고 수입액은 계속 증가하고 있습니다.',
      paragraphs: [
        '2025년 시행령 205호는 2025년 9월 1일 발효되어, 우선 지원 산업 기업이 기계 설비, R&D, 교육, 기술 이전 비용의 최대 50%를 환급받을 수 있도록 합니다[VietnamPlus 2025]. 2027년까지 국내 조립용 부품에 대한 0% 수입 관세와 결합하여[Vietnam Briefing 2025], 이 조치는 베트남 중소기업을 OEM 인증 Tier-2 단계로 진입시키는 것을 목표로 합니다[Kira estimates].',
        '본 보고서는 부품 시장과 무역 구조, 실제와 목표 간 현지화율 격차, 북부·중부 공급업체 클러스터와 Tier-2 기반, 외국계 Tier-1 대기업과 OEM 연계 그룹의 경쟁 구도, 품질·예지 보전 관문에서의 AI, 그리고 2030년 약 USD 90억을 향하는 5개년 전망을 시나리오 민감도 및 다섯 가지 전략적 실행 방향과 함께 다룹니다.',
      ],
      chart: {
        title: '베트남 자동차 부품 시장',
        subtitle: 'Vietnam · USD bn · 2023–2032F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',                     pages: 'P 04', locked: false },
      { num: '02', name: '전략적 시사점',                   pages: 'P 05', locked: true  },
      { num: '03', name: '시장 규모 및 무역 구조',          pages: 'P 07', locked: true  },
      { num: '04', name: '현지화율 격차와 수요',            pages: 'P 08', locked: true  },
      { num: '05', name: '클러스터 및 공급업체 구조',       pages: 'P 10', locked: true  },
      { num: '06', name: '경쟁 구도',                       pages: 'P 11', locked: true  },
      { num: '07', name: 'AI와 생산 운영',                  pages: 'P 12', locked: true  },
      { num: '08', name: '5개년 전망 및 예측',              pages: 'P 13', locked: true  },
      { num: '09', name: '방법론 및 출처',                  pages: 'P 14', locked: true  },
    ],
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'Vietnam', industry: 'Automotive Parts', year: 2026,
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
