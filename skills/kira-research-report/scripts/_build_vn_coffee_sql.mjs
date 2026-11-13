// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-vn-coffee. Run: `node skills/kira-research-report/scripts/_build_vn_coffee_sql.mjs > /tmp/insert.sql`
// then feed the file to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (e.g. "<report_id>/en.pdf"), NOT a full URL.
// api/library-content.js resolvePdfUrl auto-detects: storage paths get a fresh
// 1-hour signed URL per buyer call; full http(s) URLs pass through unchanged.
// Storage upload happens AFTER this SQL (Step 6b in batch_runner.md) via
// scripts/upload-pdf.mjs.
//
// Phase M.2 (2026-05-23): switched from `${RAW_BASE}/${locale}.pdf` (GitHub raw)
// to storage path computed inside the SQL CTE from `new_report.id`. PDFs are
// .gitignored in outputs/batch — Supabase Storage is canonical.

const SLUG    = 'vietnam-coffee-2026';
const COUNTRY = 'Vietnam';
const INDUSTRY= 'Coffee';
const YEAR    = 2026;
const PAGES   = 22;   // ~22 pages per the TOC (methodology endnote = P22). Adjust per actual render.
const PRICE   = 39;

// Chart bars — Vietnam coffee export value (USD bn). Max 6.1 → pct relative.
const chartBars = [
  { pct: 57,  label: '2022',  value: 3.5 },
  { pct: 92,  label: '2024',  value: 5.6 },
  { pct: 100, label: '2026F', value: 6.1 },
];

const META = {
  en: {
    title: 'Vietnam coffee market 2026: Arabica premiumization & export dynamics',
    eyebrow: 'VIETNAM · COFFEE · MARKET ANALYSIS',
    preview: {
      lede: "Vietnam's coffee sector entered 2026 anchored by a USD 5.6 billion export franchise (record value despite a 12.6% volume contraction), a structural robusta re-rating that lifted ICE robusta to an average USD 4,200/t in 2024, and an arabica specialty pull from Da Lat and Son La that reframes the country beyond commodity robusta. EUDR enforcement from December 2025 turns traceability spend into a license-to-trade for ~38% of Vietnamese green that ships to the EU.",
      paragraphs: [
        "This report covers the macro context (GDP, weather, FX, policy floor), the full coffee value chain (green bean, soluble, roast-and-ground segment economics), competitive structure across the top exporters (Intimex, Simexco, Phuc Sinh, Vinacafe and the multinational adjacencies of Nestle, JDE Peet's, Louis Dreyfus), demand drivers across export buyers and the domestic cafe wave, the EUDR + arabica protected-origin regulatory landscape, and a 5-year outlook to 2031.",
        "The 2026 AI impact on Vietnamese coffee is operational rather than peripheral. Major operators have begun deploying AI for yield forecasting (Dak Lak field-level satellite + agronomy models), roast-curve optimization at specialty roasters, traceability-block reconciliation for EUDR compliance, and fraud detection across the green-bean export documentation chain. Six distinct AI use cases are profiled in Section 10.",
      ],
      chart: {
        title: 'Vietnam coffee export value (USD bn)',
        subtitle: '2022 actual · 2024 actual · 2026 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                              pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                                 pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                        pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context',                            pages: 'PG 06', locked: true  },
      { num: '05', name: 'Sector overview & sizing',                 pages: 'PG 08', locked: true  },
      { num: '06', name: 'Segment economics',                        pages: 'PG 10', locked: true  },
      { num: '07', name: 'Competitive landscape',                    pages: 'PG 12', locked: true  },
      { num: '08', name: 'Demand drivers & channels',                pages: 'PG 17', locked: true  },
      { num: '09', name: 'Regulatory landscape',                     pages: 'PG 19', locked: true  },
      { num: '10', name: 'AI impact on coffee value chain',          pages: 'PG 20', locked: true  },
      { num: '11', name: 'Outlook & forecast 2026–2031',             pages: 'PG 21', locked: true  },
      { num: '12', name: 'Methodology endnote',                      pages: 'PG 22', locked: true  },
    ],
  },

  ja: {
    title: 'ベトナムコーヒー市場 2026:アラビカのプレミアム化と輸出動向',
    eyebrow: 'ベトナム · コーヒー · マーケット分析',
    preview: {
      lede: 'ベトナムのコーヒーセクターは2026年、USD 56億規模の輸出フランチャイズ(数量は12.6%減少した一方で過去最高金額)、ICEロブスタが2024年平均USD 4,200/tに上昇した構造的な再評価、そしてダラットおよびソンラ発のアラビカ・スペシャルティ需要を起点とする再定位を迎えています。2025年12月のEUDR施行により、トレーサビリティ投資はEU向けに出荷されるベトナム産グリーンの約38%にとって取引許認可と化します。',
      paragraphs: [
        '本レポートはマクロ環境(GDP・天候・為替・政策フロア)、コーヒー価値連鎖全体(グリーンビーン・可溶性・焙煎挽きの各セグメント経済性)、主要輸出業者(Intimex、Simexco、Phuc Sinh、Vinacafe)と多国籍隣接事業者(Nestle、JDE Peet\'s、Louis Dreyfus)による競争構造、輸出バイヤーおよび国内カフェ波としての需要ドライバー、EUDRおよびアラビカ保護原産地を含む規制環境、そして2031年までの5年間の展望を扱います。',
        '2026年のベトナムコーヒーへのAIインパクトは周縁的ではなく実務的です。主要事業者はダクラクにおける圃場単位の衛星×農学モデルによる収量予測、スペシャルティ焙煎業者における焙煎曲線最適化、EUDR対応のトレーサビリティブロック照合、グリーンビーン輸出ドキュメント連鎖の不正検知でAI実装を開始しています。第10章で6つの具体的活用事例を取り上げます。',
      ],
      chart: {
        title: 'ベトナムコーヒー輸出金額(USD bn)',
        subtitle: '2022年実績 · 2024年実績 · 2026年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                  pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブサマリー',                pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境',                            pages: 'P 06', locked: true  },
      { num: '05', name: 'セクター概観 & 市場規模',               pages: 'P 08', locked: true  },
      { num: '06', name: 'セグメント経済性',                      pages: 'P 10', locked: true  },
      { num: '07', name: '競争環境',                              pages: 'P 12', locked: true  },
      { num: '08', name: '需要ドライバー & チャネル',              pages: 'P 17', locked: true  },
      { num: '09', name: '規制環境',                              pages: 'P 19', locked: true  },
      { num: '10', name: 'コーヒー価値連鎖へのAI影響',             pages: 'P 20', locked: true  },
      { num: '11', name: '展望 & 予測 2026-2031',                 pages: 'P 21', locked: true  },
      { num: '12', name: '調査手法巻末注',                        pages: 'P 22', locked: true  },
    ],
  },

  ko: {
    title: '베트남 커피 시장 2026: 아라비카 프리미엄화와 수출 동향',
    eyebrow: '베트남 · 커피 · 시장 분석',
    preview: {
      lede: '베트남 커피 부문은 2026년에 USD 56억 규모의 수출 프랜차이즈(물량은 12.6% 감소했음에도 사상 최고 금액), ICE 로부스타가 2024년 평균 USD 4,200/t로 상승한 구조적 재평가, 그리고 달랏과 선라發 아라비카 스페셜티 수요를 기반으로 커머디티 로부스타 너머로 재정의되는 국면에 진입했습니다. 2025년 12월 EUDR 시행으로 트레이서빌리티 투자는 EU 출하 베트남 그린의 약 38%에 대한 라이선스 요건으로 전환됩니다.',
      paragraphs: [
        '본 보고서는 거시 환경(GDP·기후·환율·정책 플로어), 커피 밸류 체인 전반(그린빈·인스턴트·로스트앤그라운드 세그먼트별 경제성), 주요 수출업체(Intimex, Simexco, Phuc Sinh, Vinacafe) 및 다국적 인접 사업자(Nestle, JDE Peet\'s, Louis Dreyfus)의 경쟁 구조, 수출 바이어와 국내 카페 확산을 통한 수요 견인 요인, EUDR 및 아라비카 원산지 보호를 포함한 규제 환경, 그리고 2031년까지의 5년 전망을 다룹니다.',
        '2026년 베트남 커피에 대한 AI 영향은 주변적이 아닌 운영적입니다. 주요 사업자들은 닥락 필드 단위 위성×농학 모델을 활용한 수율 예측, 스페셜티 로스터의 로스팅 곡선 최적화, EUDR 대응 트레이서빌리티 블록 조정, 그린빈 수출 문서 체인의 사기 감지에 AI를 도입하기 시작했습니다. 제10장에서 6가지 활용 사례를 다룹니다.',
      ],
      chart: {
        title: '베트남 커피 수출 금액 (USD bn)',
        subtitle: '2022 실적 · 2024 실적 · 2026 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법론',                         pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                pages: 'P 03', locked: false },
      { num: '03', name: '요약',                                pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경',                           pages: 'P 06', locked: true  },
      { num: '05', name: '산업 개관 & 규모',                    pages: 'P 08', locked: true  },
      { num: '06', name: '세그먼트별 경제성',                   pages: 'P 10', locked: true  },
      { num: '07', name: '경쟁 환경',                           pages: 'P 12', locked: true  },
      { num: '08', name: '수요 견인 요인 & 채널',               pages: 'P 17', locked: true  },
      { num: '09', name: '규제 환경',                           pages: 'P 19', locked: true  },
      { num: '10', name: '커피 밸류 체인의 AI 영향',            pages: 'P 20', locked: true  },
      { num: '11', name: '전망 & 예측 2026-2031',               pages: 'P 21', locked: true  },
      { num: '12', name: '방법론 권말주',                       pages: 'P 22', locked: true  },
    ],
  },
};

// SQL string-literal helper using dollar-quoting so we don't have to escape
// single quotes inside Vietnamese/Japanese/Korean text. Tag is picked to be
// unique enough that no payload can collide.
function dq(s, tag = 'kbat') {
  return `$${tag}$${s}$${tag}$`;
}

const transValues = ['en', 'ja', 'ko'].map((loc) => {
  const m = META[loc];
  const previewJson = JSON.stringify(m.preview);
  const tocJson     = JSON.stringify(m.toc);
  // pdf_url omitted from VALUES — it's computed inside SELECT from new_report.id
  // as `<report_id>::text || '/' || locale || '.pdf'` (Supabase Storage path).
  return `('${loc}', ${dq(m.title)}, ${dq(m.eyebrow)}, ${dq(previewJson)}, ${dq(tocJson)})`;
}).join(',\n      ');

// SQL emits storage-path pdf_url so a re-run after PDF re-upload picks up new
// signed URLs cleanly. ON CONFLICT clauses are also idempotent — re-runs refresh
// updated_at, published_at, and pdf_url without errors.
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
  new_report.id::text || '/' || t.locale || '.pdf',  -- storage path: <uuid>/<locale>.pdf
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
