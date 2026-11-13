// One-off helper for 2026-id-healthcare.
// Run: `node skills/kira-research-report/scripts/_build_id_healthcare_sql.mjs > /tmp/insert.sql`
// then feed to Supabase MCP execute_sql.

const SLUG    = 'healthcare-indonesia-2026';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'Healthcare';
const YEAR    = 2026;
const PAGES   = 16;
const PRICE   = 39;

// Indonesia hospital market trajectory · USD bn · 2022-2030F
// bars: 2022=16.2, 2023=17.5, 2024=18.4, 2025=19.5, 2026F=21.1, 2027F=23.0, 2028F=25.1, 2029F=27.4, 2030F=30.0 (max 40)
const chartBars = [
  { pct: 49, label: '2024',  value: 18.4 },
  { pct: 53, label: '2025',  value: 19.5 },
  { pct: 75, label: '2030F', value: 30.0 },
];

const META = {
  en: {
    title: 'Indonesia healthcare 2026 — BPJS reform and the private-chain reset',
    eyebrow: 'INDONESIA · HEALTHCARE · MARKET ANALYSIS',
    preview: {
      lede: "Indonesia's USD 19.5 bn hospital market enters 2026 against the largest payer reset in a decade: BPJS Kesehatan's KRIS standard-class rollout, a Rp 9.56 tn payer deficit, and INA-CBGs migrating to iDRG severity-weighted pricing. Across a still-fragmented 1,787-hospital private sector, the top 10-15 chains hold only ~10% of private beds — and Djarum's Rp 1.04 tn Hermina entry plus Quadria's stake signal the consolidation thesis is now backed by patient capital.",
      paragraphs: [
        "This report covers Indonesia's macro and JKN-coverage anchors, USD 19.5 bn hospital market sizing through 2030F, competitive landscape across 2,820 hospitals with CR4 below 40 nationally, deep dive on Siloam (SILO), Mitra Keluarga (MIKA) and Hermina (HEAL), the BPJS reform agenda (KRIS, iDRG, foreign-hospital opening), AI use cases and operator adoption, and a five-year outlook with three scenarios.",
        "The structural call: hospitals that ran on class-1 cross-subsidy must rebuild margin elsewhere as KRIS standardises inpatient facilities and iDRG re-prices case-mix on severity. Private chains that consolidate, capture corporate-payer pivot, and adopt clinical-AI early sit on the long tail; sub-scale operators face a margin squeeze. Strategic outlook through 2031 with implications for operators, payers and capital allocators.",
      ],
      chart: {
        title: 'Indonesia hospital market trajectory (USD bn)',
        subtitle: '2024 actual · 2025 actual · 2030 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                       pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                          pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                 pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                     pages: 'PG 06', locked: true  },
      { num: '05', name: 'Macro indicators',                  pages: 'PG 07', locked: true  },
      { num: '06', name: 'Market sizing & segments',          pages: 'PG 08', locked: true  },
      { num: '07', name: 'Competitive landscape',             pages: 'PG 09', locked: true  },
      { num: '08', name: 'Market structure & players',        pages: 'PG 10', locked: true  },
      { num: '09', name: 'Player deep dive',                  pages: 'PG 11', locked: true  },
      { num: '10', name: 'Regulatory & BPJS reform',          pages: 'PG 12', locked: true  },
      { num: '11', name: 'AI impact',                         pages: 'PG 13', locked: true  },
      { num: '12', name: '5-year outlook',                    pages: 'PG 15', locked: true  },
    ],
  },

  ja: {
    title: 'インドネシア医療 2026 — BPJS改革と民間チェーン再編',
    eyebrow: 'インドネシア · 医療 · マーケット分析',
    preview: {
      lede: 'インドネシアのUSD 195億規模の病院市場は2026年、過去10年で最大のペイヤー再構築を迎えます。BPJS KesehatanのKRIS標準クラス段階導入、Rp 9.56兆のペイヤー収支不足、INA-CBGsからiDRGへの重症度重み付け価格体系への移行が同時進行します。依然として断片的な1,787の民間病院セクターでは上位10-15チェーンが民間ベッドの約10%しか保有せず、Djarumの1.04兆ルピアによるHermina参入とQuadriaの出資参加が、集約化テーゼに本格的なペイシェント・キャピタルの後ろ盾を与えています。',
      paragraphs: [
        '本レポートはインドネシアのマクロとJKNカバレッジ基盤、2030年予測までのUSD 195億規模の病院市場、全国2,820病院にわたるCR4が40未満の競合環境、Siloam(SILO)・Mitra Keluarga(MIKA)・Hermina(HEAL)の深掘り、BPJS改革アジェンダ(KRIS、iDRG、外資系病院開放)、AIユースケースと事業者導入動向、3シナリオの5年展望を扱います。',
        '構造的な論点 — KRISが入院施設を標準化しiDRGがケースミックスを重症度ベースで再価格化する中、クラス1のクロスサブシディに依存していた病院は他で利益を再構築する必要があります。集約化を進め、法人ペイヤー軸足転換を捉え、臨床AIを早期に導入する民間チェーンがロングテールを握り、規模未満の事業者は利益圧縮に直面します。2031年までの戦略展望は事業者・ペイヤー・資金配分者それぞれへの示唆を含みます。',
      ],
      chart: {
        title: 'インドネシア病院市場推移(USD bn)',
        subtitle: '2024年実績 · 2025年実績 · 2030年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '方法論',                          pages: 'P 02', locked: false },
      { num: '02', name: '目次',                            pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブ・サマリー',        pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ・コンテクスト',            pages: 'P 06', locked: true  },
      { num: '05', name: 'マクロ指標',                      pages: 'P 07', locked: true  },
      { num: '06', name: '市場規模とセグメント',            pages: 'P 08', locked: true  },
      { num: '07', name: '競合環境',                        pages: 'P 09', locked: true  },
      { num: '08', name: '市場構造と事業者',                pages: 'P 10', locked: true  },
      { num: '09', name: '主要事業者の深掘り',              pages: 'P 11', locked: true  },
      { num: '10', name: '規制とBPJS改革',                  pages: 'P 12', locked: true  },
      { num: '11', name: 'AIインパクト',                    pages: 'P 13', locked: true  },
      { num: '12', name: '5年展望',                         pages: 'P 15', locked: true  },
    ],
  },

  ko: {
    title: '인도네시아 헬스케어 2026 — BPJS 개혁과 민간 체인의 재편',
    eyebrow: '인도네시아 · 헬스케어 · 시장 분석',
    preview: {
      lede: '인도네시아 USD 195억 규모 병원 시장은 2026년 지난 10년간 최대 규모의 지급자(payer) 재편을 마주합니다. BPJS Kesehatan의 KRIS 표준 병실 등급 도입, Rp 9.56조 적자, INA-CBGs에서 중증도 가중 가격 체계 iDRG로의 이행이 동시에 진행됩니다. 1,787개 민간 병원으로 여전히 분절된 부문에서 상위 10-15개 체인이 민간 병상의 약 10%만을 보유하며, Djarum의 1.04조 루피아 Hermina 진입과 Quadria 지분 참여가 집중화 테제에 본격적인 인내 자본의 뒷받침을 더하고 있습니다.',
      paragraphs: [
        '본 보고서는 인도네시아 거시 환경과 JKN 보장률 기준점, 2030F까지의 USD 195억 병원 시장 규모, 전국 2,820개 병원 CR4 40 미만의 경쟁 구도, Siloam(SILO) · Mitra Keluarga(MIKA) · Hermina(HEAL) 심층 분석, BPJS 개혁 어젠다(KRIS, iDRG, 외국 병원 개방), AI 활용 사례와 사업자 도입 동향, 3가지 시나리오 기반 5년 전망을 다룹니다.',
        '구조적 시사점 — KRIS가 입원 시설을 표준화하고 iDRG가 케이스믹스를 중증도 기준으로 재가격화함에 따라, 클래스 1 교차 보조에 의존해온 병원은 마진을 다른 영역에서 재구축해야 합니다. 집중화를 진행하고 법인 지급자 축 전환을 포착하며 임상 AI를 조기 도입한 민간 체인이 롱테일을 차지하고, 규모 미달 사업자는 마진 압박에 직면합니다. 2031년까지의 전략 전망은 사업자 · 지급자 · 자본 배분자 각각에 대한 시사점을 포함합니다.',
      ],
      chart: {
        title: '인도네시아 병원 시장 추이 (USD bn)',
        subtitle: '2024 실적 · 2025 실적 · 2030 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '방법론',                          pages: 'P 02', locked: false },
      { num: '02', name: '목차',                            pages: 'P 03', locked: false },
      { num: '03', name: '총괄 요약',                       pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',                       pages: 'P 06', locked: true  },
      { num: '05', name: '거시 지표',                       pages: 'P 07', locked: true  },
      { num: '06', name: '시장 규모 & 세그먼트',            pages: 'P 08', locked: true  },
      { num: '07', name: '경쟁 구도',                       pages: 'P 09', locked: true  },
      { num: '08', name: '시장 구조 & 사업자',              pages: 'P 10', locked: true  },
      { num: '09', name: '사업자 심층 분석',                pages: 'P 11', locked: true  },
      { num: '10', name: '규제 & BPJS 개혁',                pages: 'P 12', locked: true  },
      { num: '11', name: 'AI 영향',                         pages: 'P 13', locked: true  },
      { num: '12', name: '5년 전망',                        pages: 'P 15', locked: true  },
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
