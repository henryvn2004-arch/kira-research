// One-off helper: builds META + constants for 2026-vn-cosmetics publish.
// Consumed by _publish_2026-vn-cosmetics_rest.mjs (PostgREST path).

export const SLUG     = 'cosmetics-vietnam-2026';
export const COUNTRY  = 'Vietnam';
export const INDUSTRY = 'Cosmetics';
export const YEAR     = 2026;
export const PAGES    = 14;
export const PRICE    = 39;

// Exec chart (page 4): cosmetics market trajectory, USD bn, 2022–2030F.
// Tallest bar = 2030F 3.2 = 100%.
const chartBars = [
  { pct: 66,  label: '2022',  value: 2.1  },
  { pct: 78,  label: '2024',  value: 2.5  },
  { pct: 84,  label: '2026E', value: 2.7  },
  { pct: 92,  label: '2028F', value: 2.95 },
  { pct: 100, label: '2030F', value: 3.2  },
];

export const META = {
  en: {
    title: 'Vietnam cosmetics 2026 — indie brands break out as the dermatology channel scales',
    eyebrow: 'VIETNAM · COSMETICS · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's cosmetics market reached roughly USD 2.5 bn in 2024 and tracks toward USD 3.2 bn by 2030, but the structural story is who is winning the new demand. Foreign brands still hold about 90% of value; the openings for local players are the indie-brand wave and the dermatology-led skincare build-out, both routed through fast-scaling modern trade and livestream channels.",
      paragraphs: [
        'Local brands hold only about 10% of market value, yet the cohort is compounding faster than the market. Cocoon grew its livestream sales ~203% year-on-year in a single 2025 mega-event and sold nearly 200,000 orders in the session. Natural, locally-inspired positioning aimed at Gen Z and millennials is the wedge.',
        'Skincare is the largest and fastest segment — roughly USD 1.27 bn in 2025 growing ~7.3% to 2030 — and dermocosmetics is doing the premiumization work, distributed through dermatology-style chains. Hasaki, which pairs retail with skin clinics, runs ~260 stores and is the local channel anchor.',
      ],
      chart: {
        title: 'Vietnam cosmetics market trajectory',
        subtitle: 'Vietnam · USD bn · 2022–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',                 pages: 'PG 004', locked: false },
      { num: '02', name: 'Strategic implications',            pages: 'PG 005', locked: true  },
      { num: '03', name: 'Market size and segments',          pages: 'PG 007', locked: true  },
      { num: '04', name: 'The local indie-brand emergence',   pages: 'PG 008', locked: true  },
      { num: '05', name: 'Dermatology channel and distribution', pages: 'PG 009', locked: true },
      { num: '06', name: 'Competitive landscape',             pages: 'PG 011', locked: true  },
      { num: '07', name: 'AI and operations',                 pages: 'PG 012', locked: true  },
      { num: '08', name: '5-year outlook and forecast',       pages: 'PG 013', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム化粧品2026 — インディーブランドの台頭と皮膚科チャネルの拡大',
    eyebrow: 'ベトナム · 化粧品 · 市場分析',
    preview: {
      lede: 'ベトナムの化粧品市場は2024年に約USD 25億に達し、2030年にはUSD 32億に向かう軌道にあるが、構造的な論点は誰が新規需要を取り込むかにある。外資系ブランドが依然として価値シェアの約90%を保有する一方、国内事業者に開かれた機会はインディーブランドの波と皮膚科主導のスキンケア構築——いずれも急拡大するモダントレードおよびライブコマースを経由している。',
      paragraphs: [
        '国内ブランドの市場価値シェアは約10%に留まるが、コホート全体は市場平均を大幅に上回るペースで複利成長している。Cocoonは2025年の単一メガライブイベントでライブコマース売上を前年比約203%成長させ、約20万件の注文を獲得した。ベトナム発・自然派ポジショニングによるZ世代・ミレニアル層への訴求が差別化の起点となっている。',
        'スキンケアは最大かつ最速成長のセグメントであり——2025年に約USD 12.7億、2030年にかけて年率約7.3%成長で約USD 19.4億——ダーモコスメが皮膚科型チェーンを通じてプレミアム化を担っている。小売と皮膚科クリニックを組み合わせたHasakiは約260店舗を展開し、国内チャネルの基軸となっている。',
      ],
      chart: {
        title: 'ベトナム化粧品市場の軌跡',
        subtitle: 'ベトナム · USD bn · 2022–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',          pages: 'P 004', locked: false },
      { num: '02', name: '戦略的示唆',                      pages: 'P 005', locked: true  },
      { num: '03', name: '市場規模とセグメント',            pages: 'P 007', locked: true  },
      { num: '04', name: '国内インディーブランドの台頭',    pages: 'P 008', locked: true  },
      { num: '05', name: '皮膚科チャネルと流通',            pages: 'P 009', locked: true  },
      { num: '06', name: '競争環境',                        pages: 'P 011', locked: true  },
      { num: '07', name: 'AIと業務運営',                    pages: 'P 012', locked: true  },
      { num: '08', name: '5年見通しと予測',                 pages: 'P 013', locked: true  },
    ],
  },

  ko: {
    title: '베트남 화장품 2026 — 인디 브랜드의 부상과 피부과 채널의 확장',
    eyebrow: '베트남 · 화장품 · 시장 분석',
    preview: {
      lede: '베트남 화장품 시장은 2024년 약 USD 25억에 달하며 2030년 USD 32억을 향해 나아가고 있습니다. 그러나 구조적 핵심은 누가 신규 수요를 장악하느냐에 있습니다. 외국 브랜드가 여전히 전체 가치의 약 90%를 점유하고 있으며, 로컬 사업자에게 열린 기회는 인디 브랜드 부상과 피부과 주도 스킨케어 채널 구축 — 두 흐름 모두 빠르게 확장하는 현대 유통 및 라이브스트림 채널을 통해 실현되고 있습니다.',
      paragraphs: [
        '로컬 브랜드의 시장 가치 점유율은 약 10%에 불과하지만, 이 코호트는 시장 전체보다 훨씬 빠르게 성장하고 있습니다. Cocoon은 2025년 단일 메가 라이브스트림 이벤트에서 전년 대비 ~203% 성장하며 약 20만 건의 주문을 기록했습니다. 자연 유래 성분과 베트남 정체성을 앞세운 Gen Z·밀레니얼 타겟 포지셔닝이 진입 쐐기가 되고 있습니다.',
        '스킨케어는 가장 크고 가장 빠르게 성장하는 세그먼트입니다 — 2025년 약 USD 12.7억으로 2030년까지 연 ~7.3% 성장 전망 — 더모코스메틱스가 프리미엄화를 견인하며 피부과 스타일 체인을 통해 유통됩니다. 소매와 피부 클리닉을 결합한 Hasaki는 ~260개 매장을 운영하며 로컬 채널의 핵심 기반입니다.',
      ],
      chart: {
        title: '베트남 화장품 시장 궤적',
        subtitle: '베트남 · USD bn · 2022–2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',              pages: 'P 004', locked: false },
      { num: '02', name: '전략적 시사점',            pages: 'P 005', locked: true  },
      { num: '03', name: '시장 규모 및 세그먼트',    pages: 'P 007', locked: true  },
      { num: '04', name: '로컬 인디 브랜드의 부상',  pages: 'P 008', locked: true  },
      { num: '05', name: '피부과 채널 및 유통',      pages: 'P 009', locked: true  },
      { num: '06', name: '경쟁 구도',                pages: 'P 011', locked: true  },
      { num: '07', name: 'AI 및 운영',               pages: 'P 012', locked: true  },
      { num: '08', name: '5개년 전망 및 예측',       pages: 'P 013', locked: true  },
    ],
  },
};
