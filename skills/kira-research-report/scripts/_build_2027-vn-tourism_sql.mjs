// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2027-vn-tourism. Run via Supabase MCP execute_sql.

const SLUG    = 'vietnam-tourism-2027';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'Tourism';
const YEAR    = 2027;
const PAGES   = 28;
const PRICE   = 39;

// Chart bars: Vietnam international arrivals (million). 2023–2030F.
// Values from exec chart: 12.6, 17.6, 21.2, 25.0, 28.0, 31.0, 34.0
// For preview bar chart: show 2023, 2025 actual, 2027F, 2030F — tallest (34.0) = 100%
const chartBars = [
  { pct: 37,  label: '2023',  value: 12.6 },
  { pct: 52,  label: '2024',  value: 17.6 },
  { pct: 62,  label: '2025',  value: 21.2 },
  { pct: 74,  label: '2027F', value: 25.0 },
  { pct: 100, label: '2030F', value: 34.0 },
];

const META = {
  en: {
    title: "Vietnam's tourism market — 2027: Korean inbound recovery & luxury build-out",
    eyebrow: 'VIETNAM · TOURISM · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam closed 2025 at 21.2 million international arrivals — a new record. The Korean lane, softer in 2025 than 2024, re-accelerates into the APEC-2027 luxury-resort completion window, and the yield-per-visitor inflection becomes the structural question for 2027. This report delivers a five-year view on Korean arrival recovery, the luxury pipeline, and the revenue-per-visitor inflection point.",
      paragraphs: [
        "Vietnam received 4.33 million Korean visitors in 2025, 20.5% of international arrivals and second only to China. The 5.2% YoY dip masks a Cam Ranh-led divergence: Khanh Hoa drew ~50% of all Korean arrivals through August on 17 daily Seoul flights. Korean volumes are forecast to return to 4.6–4.8m by 2027 on K-culture pull and a denser inbound flight grid.",
        "Phu Quoc alone carries USD 5.25bn of APEC-2027 infrastructure and Sun Group's announced 15-hotel build-out adds ~6,500 five-star rooms, near-doubling premium inventory. Marriott signed 10 new Vietnam properties with Sun Group, anchoring the 2026–2030 luxury pipeline. The report maps the competitive estate, visa-policy tailwinds, AI impact on hospitality, and base/bull/bear outlook to 2030.",
      ],
      chart: {
        title: 'Vietnam international arrivals (million)',
        subtitle: '2023–2025 actual · 2027–2030 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',                    pages: 'PG 004', locked: false },
      { num: '04', name: 'Macro context: Vietnam 2027',          pages: 'PG 007', locked: true  },
      { num: '05', name: 'Sector overview & sizing',             pages: 'PG 010', locked: true  },
      { num: '06', name: 'Segment economics',                    pages: 'PG 012', locked: true  },
      { num: '07', name: 'Competitive landscape',                pages: 'PG 014', locked: true  },
      { num: '07a', name: 'Operator profile · Vinpearl',         pages: 'PG 016', locked: true  },
      { num: '07b', name: 'Operator profile · Sun Group',        pages: 'PG 017', locked: true  },
      { num: '07c', name: 'Operator profile · Marriott Vietnam', pages: 'PG 018', locked: true  },
      { num: '07d', name: 'Operator profile · IHG Vietnam',      pages: 'PG 019', locked: true  },
      { num: '08', name: 'Demand drivers & channels',            pages: 'PG 021', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',        pages: 'PG 024', locked: true  },
      { num: '10', name: 'AI impact on hospitality',             pages: 'PG 026', locked: true  },
      { num: '11', name: '5-year outlook & forecast',            pages: 'PG 027', locked: true  },
      { num: '12', name: 'Methodology endnote',                  pages: 'PG 028', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナム観光市場 — 2027年展望：韓国インバウンド回復と高級セグメントの成長',
    eyebrow: 'ベトナム · 観光 · マーケット分析',
    preview: {
      lede: 'ベトナムは2025年に国際入国者数2,120万人という新記録を達成しました。2025年にやや軟調だった韓国ルートはAPEC 2027の高級リゾート完工ウィンドウに向けて再加速しており、訪問者1人当たり収益の転換が2027年の構造的課題となっています。本レポートは韓国人入国者の回復、高級パイプライン、収益転換点について5年間の展望を提供します。',
      paragraphs: [
        'ベトナムは2025年に韓国人訪問者433万人を受け入れ、国際入国者の20.5%を占め中国に次ぐ第2位です。前年比5.2%減という数字はカムラン主導の二極化を覆い隠しています。カインホア省は8月までにソウル便17便を通じて韓国人入国者全体の約50%を吸収しました。Kカルチャー牽引と高密度な内航便網により、韓国人入国者は2027年に460〜480万人へ回帰する見込みです。',
        'フーコックだけでAPEC 2027向けインフラUSD 52.5億を抱え、Sun Groupが発表した15ホテルの建設計画は5つ星客室を約6,500室追加し、高級在庫をほぼ倍増させます。MarriottはSun Groupとベトナムで10物件の新規契約を締結し、2026〜2030年の高級パイプラインを固定しています。本レポートは競合状況、ビザ政策の追い風、ホスピタリティへのAI影響、2030年までの基本・強気・弱気シナリオを網羅します。',
      ],
      chart: {
        title: 'ベトナム国際入国者数（百万人）',
        subtitle: '2023〜2025年実績 · 2027〜2030年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',                 pages: 'P 004', locked: false },
      { num: '04', name: 'マクロ環境：ベトナム 2027年',           pages: 'P 007', locked: true  },
      { num: '05', name: 'セクター概要と市場規模',                 pages: 'P 010', locked: true  },
      { num: '06', name: 'セグメント別収益構造',                   pages: 'P 012', locked: true  },
      { num: '07', name: '競合状況',                               pages: 'P 014', locked: true  },
      { num: '07a', name: 'オペレータープロファイル · Vinpearl',   pages: 'P 016', locked: true  },
      { num: '07b', name: 'オペレータープロファイル · Sun Group',  pages: 'P 017', locked: true  },
      { num: '07c', name: 'オペレータープロファイル · Marriott',   pages: 'P 018', locked: true  },
      { num: '07d', name: 'オペレータープロファイル · IHG',        pages: 'P 019', locked: true  },
      { num: '08', name: '需要ドライバーとチャネル',               pages: 'P 021', locked: true  },
      { num: '09', name: '規制・政策の状況',                       pages: 'P 024', locked: true  },
      { num: '10', name: 'ホスピタリティへのAI影響',               pages: 'P 026', locked: true  },
      { num: '11', name: '5年間展望と予測',                        pages: 'P 027', locked: true  },
      { num: '12', name: '調査手法エンドノート',                   pages: 'P 028', locked: true  },
    ],
  },

  ko: {
    title: '베트남 관광 2027 전망: 한국인 인바운드 회복과 럭셔리 세그먼트 성장',
    eyebrow: '베트남 · 관광 · 시장 분석',
    preview: {
      lede: '베트남은 2025년 국제 방문객 2,120만 명을 기록하며 사상 최고치를 갱신했습니다. 2025년 소폭 하락했던 한국인 입국자 수는 APEC-2027 럭셔리 리조트 완공 시점을 앞두고 재가속화되고 있으며, 방문객당 수익 변곡점이 2027년의 핵심 구조적 과제로 부상합니다. 본 보고서는 한국인 방문객 회복, 럭셔리 파이프라인, 수익 변곡점에 대한 5개년 전망을 제공합니다.',
      paragraphs: [
        '베트남은 2025년 한국인 방문객 433만 명을 수용했으며, 이는 국제 방문객의 20.5%로 중국에 이어 두 번째 규모입니다. 전년 대비 5.2% 감소 이면에는 캄라인 주도의 구조적 분기가 존재합니다. 카인호아는 서울 직항 17편을 통해 8월까지 전체 한국인 방문객의 약 50%를 흡수했습니다. K-문화 견인력과 인바운드 노선망 확충을 바탕으로 한국인 방문객이 2027년까지 460만-480만 명 수준으로 회복될 것으로 전망됩니다.',
        '푸꾸옥 단독으로 APEC-2027 인프라 투자 USD 52.5억이 집중되며, 선 그룹의 15개 호텔 신축 계획은 5성급 객실 약 6,500실을 추가해 프리미엄 재고를 거의 두 배 수준으로 끌어올립니다. 매리어트는 선 그룹과 베트남 내 신규 10개 호텔 계약을 체결해 2026-2030년 럭셔리 파이프라인의 축을 형성합니다. 본 보고서는 경쟁 구도, 비자 정책 순풍, 호스피탈리티에 대한 AI 영향, 2030년까지의 기본·낙관·비관 시나리오를 다룹니다.',
      ],
      chart: {
        title: '베트남 국제 방문객 수 (백만 명)',
        subtitle: '2023–2025 실적 · 2027–2030 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '요약',                                   pages: 'P 004', locked: false },
      { num: '04', name: '거시 맥락: 베트남 2027',                 pages: 'P 007', locked: true  },
      { num: '05', name: '섹터 개요 및 시장 규모',                 pages: 'P 010', locked: true  },
      { num: '06', name: '세그먼트 경제학',                        pages: 'P 012', locked: true  },
      { num: '07', name: '경쟁 환경',                              pages: 'P 014', locked: true  },
      { num: '07a', name: '사업자 프로파일 · Vinpearl',            pages: 'P 016', locked: true  },
      { num: '07b', name: '사업자 프로파일 · Sun Group',           pages: 'P 017', locked: true  },
      { num: '07c', name: '사업자 프로파일 · Marriott Vietnam',    pages: 'P 018', locked: true  },
      { num: '07d', name: '사업자 프로파일 · IHG Vietnam',         pages: 'P 019', locked: true  },
      { num: '08', name: '수요 동인 및 채널',                      pages: 'P 021', locked: true  },
      { num: '09', name: '규제 및 정책 환경',                      pages: 'P 024', locked: true  },
      { num: '10', name: 'AI의 호스피탈리티 영향',                 pages: 'P 026', locked: true  },
      { num: '11', name: '5개년 전망 및 예측',                     pages: 'P 027', locked: true  },
      { num: '12', name: '방법론 엔드노트',                        pages: 'P 028', locked: true  },
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
