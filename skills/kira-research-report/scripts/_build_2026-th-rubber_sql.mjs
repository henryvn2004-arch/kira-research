// One-off helper: builds SQL to upsert living_reports + 3 report_translations
// rows for 2026-th-rubber. Run:
//   node skills/kira-research-report/scripts/_build_2026-th-rubber_sql.mjs > /tmp/th_rubber.sql
// pdf_url is a STORAGE PATH computed inside the SQL from new_report.id.

const SLUG    = 'thailand-rubber-2026';
const COUNTRY = 'Thailand';
const INDUSTRY= 'Rubber';
const YEAR    = 2026;
const PAGES   = 27;
const PRICE   = 39;

// Preview chart — Thailand NR export value (USD bn). Max 6.0 → pct relative.
const chartBars = [
  { pct: 77,  label: '2024',  value: 4.6 },
  { pct: 93,  label: '2025',  value: 5.6 },
  { pct: 100, label: '2026F', value: 6.0 },
];

const META = {
  en: {
    title: 'Thailand rubber 2026: tire-grade export pricing and synthetic substitution pressure',
    eyebrow: 'THAILAND · RUBBER · MARKET ANALYSIS',
    preview: {
      lede: "Thailand's natural rubber sector enters 2026 at an inflection: a fifth consecutive year of global supply deficit is putting a floor under prices even as Thai output eases to 4.7 Mt, while EUDR compliance splits the market into traceable and conventional flows. Export value climbed to roughly USD 5.6 bn in 2025 on a price-and-mix re-rating rather than volume, and the next 18 months decide which exporters capture the documented-origin premium and which defend on tonnes alone.",
      paragraphs: [
        "This report covers the macro backdrop (a slow-growth economy with a strong baht), a flat-volume market sizing where the SICOM benchmark and grade mix — not planted hectares — drive revenue, grade economics across block rubber, concentrated latex and RSS, the concentrated exporter tier with four player profiles, China-anchored demand and EV-lifted intensity, the EUDR regulatory pivot, AI-enabled traceability and yield technology, and a five-year price-scenario outlook.",
        "Every quantitative claim carries an inline source tag, with [Kira estimates] marking figures derived from our own analyst triangulation of Rubber Authority of Thailand situation reports, ANRPC supply-demand balances, and trade data. Forward figures are directional price scenarios anchored to documented base years, not point predictions.",
      ],
      chart: {
        title: 'Thailand rubber export value (USD bn)',
        subtitle: 'Thailand · USD bn · 2024 actual · 2026 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                      pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                         pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                    pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',         pages: 'PG 09', locked: true  },
      { num: '06', name: 'Grade economics',                  pages: 'PG 11', locked: true  },
      { num: '07', name: 'Competitive landscape',            pages: 'PG 13', locked: true  },
      { num: '08', name: 'Demand drivers & channels',        pages: 'PG 19', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',    pages: 'PG 22', locked: true  },
      { num: '10', name: 'AI & traceability technology',     pages: 'PG 23', locked: true  },
      { num: '11', name: 'Five-year outlook & methodology',  pages: 'PG 26', locked: true  },
    ],
  },

  ja: {
    title: 'タイ天然ゴム市場 2026:タイヤグレード輸出価格と合成ゴム代替圧力',
    eyebrow: 'タイ · ゴム · マーケット分析',
    preview: {
      lede: 'タイの天然ゴム部門は2026年に転換点を迎えます。世界的な供給不足が5年連続で価格を下支えする一方、タイの生産量は4.7 Mtへ緩み、EUDR対応が市場をトレーサブルな流通と従来型の流通に二分します。2025年の輸出額は数量ではなく価格・グレード構成の再評価により約USD 56億へ上昇し、今後18か月がどの輸出事業者が産地証明プレミアムを獲得し、どの事業者が数量のみで防衛するかを決定づけます。',
      paragraphs: [
        '本レポートは、マクロ環境(低成長経済と強いバーツ)、作付面積ではなくSICOMベンチマークとグレード構成が収益を左右する数量横ばいの市場規模、ブロックゴム・濃縮ラテックス・RSSにわたるグレード経済性、4社プロファイルを含む集約された輸出事業者層、中国主導の需要とEVによる需要強度の上昇、EUDR規制への転換、AIを活用したトレーサビリティと収量技術、そして5年間の価格シナリオ見通しを扱います。',
        'すべての定量的主張にはインライン出典タグを付し、[Kira estimates]はタイゴム公社(RAOT)の状況報告、ANRPCの需給バランス、貿易データに対する当社アナリストの三角測量から導いた数値を示します。将来値は基準年に紐づく方向性の価格シナリオであり、確定的予測ではありません。',
      ],
      chart: {
        title: 'タイ天然ゴム輸出額の推移',
        subtitle: 'タイ · USD bn · 2024年実績 · 2026年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                     pages: 'P 02', locked: false },
      { num: '02', name: '目次',                         pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',       pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                   pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観・市場規模',       pages: 'P 09', locked: true  },
      { num: '06', name: 'グレード経済性',               pages: 'P 11', locked: true  },
      { num: '07', name: '競合環境',                     pages: 'P 13', locked: true  },
      { num: '08', name: '需要ドライバーと流通チャネル', pages: 'P 19', locked: true  },
      { num: '09', name: '規制・政策環境',               pages: 'P 22', locked: true  },
      { num: '10', name: 'AI・トレーサビリティ技術',     pages: 'P 23', locked: true  },
      { num: '11', name: '5年間見通しと分析手法',        pages: 'P 26', locked: true  },
    ],
  },

  ko: {
    title: '태국 고무 2026: 타이어급 수출 가격과 합성고무 대체 압력',
    eyebrow: '태국 · 고무 · 시장 분석',
    preview: {
      lede: '태국 천연고무 부문은 2026년 변곡점에 진입합니다. 세계적 공급 부족이 5년 연속 가격을 지지하는 가운데 태국 생산량은 4.7 Mt으로 둔화되고, EUDR 준수가 시장을 추적 가능한 흐름과 기존 흐름으로 이분화합니다. 2025년 수출 가치는 물량이 아니라 가격·등급 구성 재평가에 힘입어 약 USD 56억으로 상승했으며, 향후 18개월이 어느 수출업체가 원산지 증명 프리미엄을 확보하고 어느 업체가 물량만으로 방어할지를 결정합니다.',
      paragraphs: [
        '본 보고서는 거시 환경(저성장 경제와 강한 바트화), 재배 면적이 아니라 SICOM 벤치마크와 등급 구성이 매출을 좌우하는 물량 정체 시장 규모, 블록 고무·농축 라텍스·RSS에 걸친 등급별 경제성, 4개 기업 프로필을 포함한 집중된 수출업체 계층, 중국 주도 수요와 EV로 인한 수요 집약도 상승, EUDR 규제 전환, AI 기반 추적성 및 수율 기술, 그리고 5개년 가격 시나리오 전망을 다룹니다.',
        '모든 정량적 주장에는 인라인 출처 태그가 붙으며, [Kira estimates]는 태국고무청(RAOT) 상황 보고서, ANRPC 수급 균형, 무역 데이터에 대한 당사 애널리스트 삼각검증에서 도출한 수치를 나타냅니다. 향후 수치는 기준 연도에 근거한 방향성 가격 시나리오이며 확정적 예측이 아닙니다.',
      ],
      chart: {
        title: '태국 고무 수출 가치 추이',
        subtitle: 'Thailand · USD bn · 2024 실적 · 2026 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법론',                pages: 'P 02', locked: false },
      { num: '02', name: '목차',                       pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',                  pages: 'P 06', locked: true  },
      { num: '05', name: '산업 개요 및 규모',          pages: 'P 09', locked: true  },
      { num: '06', name: '등급별 경제성',              pages: 'P 11', locked: true  },
      { num: '07', name: '경쟁 구도',                  pages: 'P 13', locked: true  },
      { num: '08', name: '수요 동인 및 유통 채널',     pages: 'P 19', locked: true  },
      { num: '09', name: '규제 및 정책 환경',          pages: 'P 22', locked: true  },
      { num: '10', name: 'AI 및 추적 기술',            pages: 'P 23', locked: true  },
      { num: '11', name: '5개년 전망 및 방법론',       pages: 'P 26', locked: true  },
    ],
  },
};

export const PUBLISH = { SLUG, COUNTRY, INDUSTRY, YEAR, PAGES, PRICE, META };
