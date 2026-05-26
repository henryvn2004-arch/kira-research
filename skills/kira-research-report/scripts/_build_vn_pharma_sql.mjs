// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-vn-pharma. Patterned on _build_vn_fintech_sql.mjs.

const SLUG    = 'vietnam-pharma-2027';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'Pharma';
const YEAR    = 2027;
const PAGES   = 26;
const PRICE   = 39;

// Chart on page 4 (exec summary): Vietnam pharma market trajectory · USD bn · 2023-2030F
// Values: 6.8, 7.4, 8.0, 8.7, 9.4, 10.2, 12.0  (last = 2030F; max scale 16 → pct = val/16*100)
const chartBars = [
  { pct: 50, label: '2024',  value: 7.4  },
  { pct: 54, label: '2025',  value: 8.0  },
  { pct: 75, label: '2030F', value: 12.0 },
];

const META = {
  en: {
    title: "Vietnam pharma 2027 outlook: generics localization and biosimilar adoption",
    eyebrow: 'VIETNAM · PHARMA · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's pharma market enters 2027 anchored on a USD 8.0 bn 2025 base trending to USD 12.0 bn by 2030. Decision 1165 sets the domestic-supply policy floor at 80% volume / 70% value by 2030, and Circular 40/2025/TT-BYT now rewards EU-GMP-certified local production in hospital tenders. The biosimilar wave — Celltrion's Remsima and Herzuma already launched; Nanogen's Stimus in late-stage trials — opens the second margin leg.",
      paragraphs: [
        "This report covers macro and policy backbone (demographics, BHYT insurance coverage, Decision 1165 architecture), market sizing across ETC and OTC with pharmacy-chain channel splits (Long Chau, Pharmacity, An Khang), the localization race led by 17 EU-GMP-certified plants, foreign-strategic stakes (SK ~48% in Imexpharm, Taisho 51% in DHG, Abbott 52% in Domesco), biosimilar therapeutic windows across oncology and insulin, and Law 44/2024 / Circular 40/2025 tender mechanics.",
        "The 2025-27 window is the localization lock-in period — EU-GMP commitments, tender lot positioning and biosimilar dossier filings made now lock cost positions through 2030. The competitive landscape covers domestic majors (DHG, Imexpharm, Traphaco, Domesco, Pymepharco, Bidiphar) with two deep operator profiles, plus a 5-year base/bull/bear forecast to 2030 and KIRA's methodology endnote with full source alias key.",
      ],
      chart: {
        title: 'Vietnam pharma market trajectory (USD bn)',
        subtitle: '2024 actual · 2025 actual · 2030 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                            pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                               pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                      pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro & policy backbone',                pages: 'PG 07', locked: true  },
      { num: '05', name: 'Market sizing & channel split',          pages: 'PG 10', locked: true  },
      { num: '06', name: 'Localization & the EU-GMP race',         pages: 'PG 13', locked: true  },
      { num: '07', name: 'Competitive landscape',                  pages: 'PG 16', locked: true  },
      { num: '08', name: 'Biosimilar adoption',                    pages: 'PG 20', locked: true  },
      { num: '09', name: 'Regulatory & tender system',             pages: 'PG 23', locked: true  },
      { num: '10', name: '5-year outlook & forecast',              pages: 'PG 25', locked: true  },
      { num: '11', name: 'Methodology endnote',                    pages: 'PG 26', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム医薬品 2027展望:ジェネリック国産化とバイオシミラー普及',
    eyebrow: 'ベトナム · 医薬品 · マーケット分析',
    preview: {
      lede: 'ベトナム医薬品市場は2027年、2025年のUSD 80億ドル基盤から2030年にUSD 120億ドルへ向かう推移上にあります。決定1165号は国産供給の政策フロアを2030年までに数量80%・金額70%と設定し、通達40/2025/TT-BYTは病院入札におけるEU-GMP取得国産品を明示的に優遇するようになりました。バイオシミラー第一波 — CelltrionのRemsimaとHerzumaが既に上市、NanogenのStimusが後期試験中 — が第二の収益軸を開きます。',
      paragraphs: [
        '本レポートはマクロ・政策の構造的基盤(人口動態、BHYT医療保険カバレッジ、決定1165号の制度設計)、ETC・OTC両軸での市場規模と薬局チェーン(Long Chau、Pharmacity、An Khang)のチャネル構成、EU-GMP取得済み17工場が主導する国産化競争、外資系戦略保有(SKによるImexpharm約48%、大正製薬によるDHG 51%、AbbottによるDomesco 52%)、がん・インスリン領域のバイオシミラー治療機会、そして法律44/2024号・通達40/2025号の入札メカニズムを扱います。',
        '2025-27年は国産化ロックイン期間であり、いま行うEU-GMP投資、入札ロット位置取り、バイオシミラー申請がコスト構造を2030年まで固定します。競争環境は国内大手(DHG、Imexpharm、Traphaco、Domesco、Pymepharco、Bidiphar)を対象とし、2社の詳細プロファイル、2030年に向けたベース・ブル・ベア5年予測、KIRA方法論補足と完全な出典エイリアス凡例を収録します。',
      ],
      chart: {
        title: 'ベトナム医薬品市場の推移(USD bn)',
        subtitle: '2024年実績 · 2025年実績 · 2030年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査方法',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                  pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',                pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ・政策の構造的基盤',              pages: 'P 07', locked: true  },
      { num: '05', name: '市場規模とチャネル構成',                pages: 'P 10', locked: true  },
      { num: '06', name: '国産化とEU-GMP取得競争',                pages: 'P 13', locked: true  },
      { num: '07', name: '競争環境',                              pages: 'P 16', locked: true  },
      { num: '08', name: 'バイオシミラーの普及',                  pages: 'P 20', locked: true  },
      { num: '09', name: '規制と入札制度',                        pages: 'P 23', locked: true  },
      { num: '10', name: '5年展望と予測',                          pages: 'P 25', locked: true  },
      { num: '11', name: '方法論補足',                            pages: 'P 26', locked: true  },
    ],
  },

  ko: {
    title: '베트남 제약 2027 전망: 제네릭 국산화와 바이오시밀러 도입',
    eyebrow: '베트남 · 제약 · 시장 분석',
    preview: {
      lede: '베트남 제약 시장은 2027년 USD 80억 달러 2025년 기반에서 2030년 USD 120억 달러로 향하는 추세에 진입합니다. Decision 1165는 국산 공급 정책 하한선을 2030년까지 물량 80%·금액 70%로 설정했으며, Circular 40/2025/TT-BYT는 병원 입찰에서 EU-GMP 인증 국산 생산을 명시적으로 우대하게 되었습니다. 바이오시밀러 물결 — Celltrion의 Remsima와 Herzuma 이미 출시, Nanogen의 Stimus 후기 임상 진행 — 은 두 번째 수익 축을 열어줍니다.',
      paragraphs: [
        '본 보고서는 거시·정책 기반(인구 구조, BHYT 의료보험 커버리지, Decision 1165 제도 설계), ETC와 OTC 양축의 시장규모 및 약국 체인(Long Chau, Pharmacity, An Khang) 채널 구성, EU-GMP 인증 17개 공장이 주도하는 국산화 경쟁, 외국계 전략 지분(SK의 Imexpharm 약 48%, 다이쇼의 DHG 51%, Abbott의 Domesco 52%), 항암제·인슐린 영역의 바이오시밀러 치료 영역, 그리고 Law 44/2024·Circular 40/2025 입찰 메커니즘을 다룹니다.',
        '2025-27년은 국산화 락인 시기로, 지금 결정되는 EU-GMP 투자·입찰 로트 포지셔닝·바이오시밀러 등록 신청이 2030년까지의 비용 구조를 고정합니다. 경쟁 환경은 국내 주요 사업자(DHG, Imexpharm, Traphaco, Domesco, Pymepharco, Bidiphar)를 대상으로 하며, 두 사업자에 대한 심층 프로파일, 2030년까지 베이스·강세·약세 5년 전망, 그리고 전체 출처 별칭 키가 포함된 KIRA 방법론 부기를 담았습니다.',
      ],
      chart: {
        title: '베트남 제약 시장 궤적 (USD bn)',
        subtitle: '2024 실적 · 2025 실적 · 2030 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법',                            pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                 pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                          pages: 'P 04', locked: false },
      { num: '04', name: '거시·정책 기반',                       pages: 'P 07', locked: true  },
      { num: '05', name: '시장규모 및 채널 분할',                pages: 'P 10', locked: true  },
      { num: '06', name: '국산화 및 EU-GMP 경쟁',                pages: 'P 13', locked: true  },
      { num: '07', name: '경쟁 환경',                            pages: 'P 16', locked: true  },
      { num: '08', name: '바이오시밀러 도입',                    pages: 'P 20', locked: true  },
      { num: '09', name: '규제 및 입찰 제도',                    pages: 'P 23', locked: true  },
      { num: '10', name: '5년 전망 및 시나리오',                 pages: 'P 25', locked: true  },
      { num: '11', name: '방법론 부기',                          pages: 'P 26', locked: true  },
    ],
  },
};

function dq(s, tag = 'kbat') {
  return `$${tag}$${s}$${tag}$`;
}

const transValues = ['en', 'ja', 'ko'].map((loc) => {
  const m = META[loc];
  const previewJson = JSON.stringify(m.preview);
  const tocJson     = JSON.stringify(m.toc);
  return `('${loc}', ${dq(m.title)}, ${dq(m.eyebrow)}, ${dq(previewJson)}, ${dq(tocJson)})`;
}).join(',\n      ');

const sql = `
WITH new_report AS (
  INSERT INTO living_reports (slug, country, industry, year, pages, price, currency, status, published_at)
  VALUES (${dq(SLUG)}, ${dq(COUNTRY)}, ${dq(INDUSTRY)}, ${YEAR}, ${PAGES}, ${PRICE}, 'USD', 'published', now())
  ON CONFLICT (slug) DO UPDATE SET
    updated_at   = now(),
    published_at = now(),
    pages        = EXCLUDED.pages,
    status       = 'published'
  RETURNING id
)
INSERT INTO report_translations (report_id, locale, title, eyebrow, preview, toc, pdf_url, status, published_at)
SELECT
  new_report.id,
  t.locale,
  t.title,
  t.eyebrow,
  t.preview::jsonb,
  t.toc::jsonb,
  new_report.id::text || '/' || t.locale || '.pdf',
  'published',
  now()
FROM new_report
CROSS JOIN (VALUES
      ${transValues}
) AS t(locale, title, eyebrow, preview, toc)
ON CONFLICT (report_id, locale) DO UPDATE SET
  title        = EXCLUDED.title,
  eyebrow      = EXCLUDED.eyebrow,
  preview      = EXCLUDED.preview,
  toc          = EXCLUDED.toc,
  pdf_url      = EXCLUDED.pdf_url,
  status       = 'published',
  published_at = now()
RETURNING report_id, locale, title;
`;

process.stdout.write(sql);
