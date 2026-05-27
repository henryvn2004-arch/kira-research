// One-off helper for 2026-id-fintech.
// Run: `node skills/kira-research-report/scripts/_build_id_fintech_sql.mjs > /tmp/insert.sql`
// then feed to Supabase MCP execute_sql.

const SLUG    = 'fintech-indonesia-2026';
const COUNTRY = 'Indonesia';
const INDUSTRY= 'Fintech';
const YEAR    = 2026;
const PAGES   = 15;
const PRICE   = 39;

// BNPL market trajectory · USD bn · 2021-2030F
// bars in HTML: 2021=3.1, 2022=4.6, 2023=5.9, 2024=7.6, 2025=8.6, 2026=9.4, 2027=10.4, 2028=11.4, 2029=12.5, 2030F=13.6 (max 16)
const chartBars = [
  { pct: 48, label: '2024',  value: 7.6 },
  { pct: 54, label: '2025',  value: 8.6 },
  { pct: 85, label: '2030F', value: 13.6 },
];

const META = {
  en: {
    title: 'Indonesia paylater — regulatory tightening and the credit-scoring reset',
    eyebrow: 'INDONESIA · FINTECH · MARKET ANALYSIS',
    preview: {
      lede: "Indonesia's paylater regime enters 2026 at a USD 8.6 bn BNPL pool, brought inside POJK 32/2025's prudential perimeter and re-anchored around a 0.1% daily-interest cap. A new alternative-credit-scoring regime under POJK 29/2024 and a 6-month transition window closing 15 June 2026 decide which of ~16 operators survive at scale. The next 24 months separate bank-and-multifinance survivors from sub-scale fintech exits.",
      paragraphs: [
        "This report covers the policy context running up to POJK 32/2025, the current statute map across OJK, Bank Indonesia and Pefindo Biro Kredit, a six-marker policy timeline 2016-2026, recent changes (POJK 32/2025 + POJK 29/2024) in detail, pending changes and lobby positioning through mid-2026, compliance cost and winner/loser mapping across ~16 operators, and a cross-border read against Singapore, Malaysia, Thailand and the Philippines.",
        "The 2026 transition window is the structural inflection — standalone fintech BNPL is no longer permitted, multifinance approval requires prior OJK consent, and underwriting moves from app-only behavioural data to a regulated, bureau-anchored stack within 18 months. Operators choose between bank charter, multifinance approval, or partner-sponsored distribution before 15 June 2026. Penalties run up to IDR 15 bn plus management removal and licence revocation.",
      ],
      chart: {
        title: 'Indonesia BNPL market trajectory (USD bn)',
        subtitle: '2024 actual · 2025 actual · 2030 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Methodology',                          pages: 'PG 02', locked: false },
      { num: '02', name: 'Contents',                             pages: 'PG 03', locked: false },
      { num: '03', name: 'Executive summary',                    pages: 'PG 04', locked: false },
      { num: '04', name: 'Regulatory brief',                     pages: 'PG 06', locked: true  },
      { num: '05', name: 'Policy context & history',             pages: 'PG 07', locked: true  },
      { num: '06', name: 'Current framework & regulators',       pages: 'PG 08', locked: true  },
      { num: '07', name: 'Policy timeline',                      pages: 'PG 09', locked: true  },
      { num: '08', name: 'Recent changes in detail',             pages: 'PG 10', locked: true  },
      { num: '09', name: 'Pending changes & lobby',              pages: 'PG 12', locked: true  },
      { num: '10', name: 'Compliance cost & winner/loser map',   pages: 'PG 13', locked: true  },
      { num: '11', name: 'Cross-border comparison',              pages: 'PG 14', locked: true  },
      { num: '12', name: 'Methodology endnote',                  pages: 'PG 15', locked: true  },
    ],
  },

  ja: {
    title: 'インドネシア・ペイレイター — 規制強化と信用スコアリングの再構築',
    eyebrow: 'インドネシア · フィンテック · マーケット分析',
    preview: {
      lede: 'インドネシアのペイレイター制度は2026年、USD 8.6 bn規模のBNPL市場で出発します。POJK 32/2025により健全性監督の枠内に取り込まれ、0.1%の日利上限を軸に再構築されます。POJK 29/2024による新たな代替信用スコアリング制度と、2026年6月15日に閉じる6ヶ月の移行期間が、約16社の事業者のうちいずれが規模を維持できるかを決定づけます。今後24ヶ月で、銀行・マルチファイナンスの生き残り組と、規模に満たないフィンテック撤退組が分かれます。',
      paragraphs: [
        '本レポートはPOJK 32/2025に至る政策背景、OJK・Bank Indonesia・Pefindo Biro Kreditにまたがる現行法令マップ、2016-2026年の6つの起点による政策タイムライン、直近の変更点(POJK 32/2025 + POJK 29/2024)の詳細、2026年央までの未確定変更と業界ロビー、約16社にわたるコンプライアンス・コストと勝者/敗者マップ、シンガポール・マレーシア・タイ・フィリピンとの越境比較を扱います。',
        '2026年の移行期間は構造的転換点です — スタンドアロンのフィンテックBNPLは許容されなくなり、マルチファイナンス認可にはOJKの事前承認が必要となり、引受は18ヶ月以内にアプリ単独の行動データから、規制下のクレジットビューロー基盤スタックへ移行します。事業者は2026年6月15日までに、銀行ライセンス・マルチファイナンス承認・パートナー仲介流通のいずれかを選択します。違反は最大IDR 150億の罰金に加え、経営陣解任とライセンス取消が課されます。',
      ],
      chart: {
        title: 'インドネシアBNPL市場推移(USD bn)',
        subtitle: '2024年実績 · 2025年実績 · 2030年予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '調査手法',                              pages: 'P 02', locked: false },
      { num: '02', name: '目次',                                  pages: 'P 03', locked: false },
      { num: '03', name: 'エグゼクティブ・サマリー',              pages: 'P 04', locked: false },
      { num: '04', name: '規制ブリーフ',                          pages: 'P 06', locked: true  },
      { num: '05', name: '政策背景と沿革',                        pages: 'P 07', locked: true  },
      { num: '06', name: '現行枠組みと監督機関',                  pages: 'P 08', locked: true  },
      { num: '07', name: '政策タイムライン',                      pages: 'P 09', locked: true  },
      { num: '08', name: '直近の変更点(詳細)',                   pages: 'P 10', locked: true  },
      { num: '09', name: '未確定の変更と業界ロビー',              pages: 'P 12', locked: true  },
      { num: '10', name: 'コンプライアンス・コストと勝者/敗者マップ', pages: 'P 13', locked: true  },
      { num: '11', name: '越境比較',                              pages: 'P 14', locked: true  },
      { num: '12', name: '調査手法・巻末注',                      pages: 'P 15', locked: true  },
    ],
  },

  ko: {
    title: '인도네시아 페이레이터 — 규제 강화와 신용평가 체계 재편',
    eyebrow: '인도네시아 · 핀테크 · 시장 분석',
    preview: {
      lede: '인도네시아 페이레이터 제도는 2026년 USD 8.6 bn 규모의 BNPL 시장에서 출발합니다. POJK 32/2025로 건전성 감독의 울타리 안으로 편입되고, 일일 0.1% 금리 상한을 축으로 재편됩니다. POJK 29/2024에 따른 새로운 대체 신용평가 제도와 2026년 6월 15일에 종료되는 6개월 전환 기간이, 약 16개 사업자 중 누가 규모를 유지할 수 있을지를 좌우합니다. 향후 24개월 동안 은행 · 멀티파이낸스 생존 그룹과 규모 미달 핀테크 이탈 그룹이 갈립니다.',
      paragraphs: [
        '본 보고서는 POJK 32/2025에 이르기까지의 정책 맥락, OJK · Bank Indonesia · Pefindo Biro Kredit에 걸친 현행 법령 지도, 2016-2026년 6개 시점의 정책 타임라인, 최근 변경 사항(POJK 32/2025 + POJK 29/2024)의 상세, 2026년 중반까지의 계류 변경과 업계 로비, 약 16개 사업자에 걸친 컴플라이언스 비용과 승자/패자 지도, 싱가포르 · 말레이시아 · 태국 · 필리핀과의 국경 간 비교를 다룹니다.',
        '2026년 전환 기간은 구조적 변곡점입니다 — 독립형 핀테크 BNPL은 더 이상 허용되지 않고, 멀티파이낸스 승인은 OJK 사전 동의가 필요하며, 인수 심사는 18개월 이내에 앱 단독 행동 데이터에서 규제 기반 신용정보회사 스택으로 이동합니다. 사업자는 2026년 6월 15일까지 은행 라이선스, 멀티파이낸스 승인, 파트너 매개 유통 중 하나를 선택해야 합니다. 위반 시 최대 IDR 150억 벌금에 더해 경영진 해임과 라이선스 취소가 부과됩니다.',
      ],
      chart: {
        title: '인도네시아 BNPL 시장 추이 (USD bn)',
        subtitle: '2024 실적 · 2025 실적 · 2030 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '조사 방법론',                            pages: 'P 02', locked: false },
      { num: '02', name: '목차',                                  pages: 'P 03', locked: false },
      { num: '03', name: '경영진 요약',                            pages: 'P 04', locked: false },
      { num: '04', name: '규제 브리프',                            pages: 'P 06', locked: true  },
      { num: '05', name: '정책 맥락 & 연혁',                       pages: 'P 07', locked: true  },
      { num: '06', name: '현행 체계 & 규제기관',                   pages: 'P 08', locked: true  },
      { num: '07', name: '정책 타임라인',                          pages: 'P 09', locked: true  },
      { num: '08', name: '최근 변경 상세',                         pages: 'P 10', locked: true  },
      { num: '09', name: '계류 중 변경 & 로비 동향',               pages: 'P 12', locked: true  },
      { num: '10', name: '컴플라이언스 비용 & 승자/패자 지도',     pages: 'P 13', locked: true  },
      { num: '11', name: '국경 간 비교',                           pages: 'P 14', locked: true  },
      { num: '12', name: '방법론 미주',                            pages: 'P 15', locked: true  },
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
