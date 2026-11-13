// One-off helper: builds SQL to insert living_reports + 3 report_translations
// rows for 2027-ph-tourism. Modeled on _build_2026-ph-mining_sql.mjs.
// pdf_url emits a STORAGE PATH (computed inside SQL from new_report.id).

const SLUG    = 'tourism-philippines-2027';
const COUNTRY = 'Philippines';
const INDUSTRY= 'Tourism';
const YEAR    = 2027;
const PAGES   = 17;
const PRICE   = 39;

// Exec chart — Philippines international arrivals (million). 3-bar preview subset.
// Full series 2019,2024,2025,2026F,2027F,2030T = 8.26,5.95,6.48,6.9,7.6,11. Max 11 → pct.
const chartBars = [
  { pct: 75,  label: '2019',  value: 8.3 },
  { pct: 59,  label: '2025',  value: 6.5 },
  { pct: 100, label: '2030F', value: 11  },
];

// Strip inline source tags like [DOT 2026] from teaser copy (preview is a
// marketing teaser; source keys live in the full report, not the blurb).
function stripTags(s) {
  return s.replace(/\s*\[[^\]]+\]/g, '').replace(/\s+/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
}

const META = {
  en: {
    title: 'Philippines tourism 2027 — rebuild the Korea lane, manage the island ceilings',
    eyebrow: 'PHILIPPINES · TOURISM · MARKET ANALYSIS',
    preview: {
      lede: stripTags("The Philippines closed 2025 at 6.48 million arrivals [DOT 2026], essentially flat, with receipts at PHP 694 bn [DOT 2026] on a high spend-per-arrival. Into 2027 the binding issues are a -18% Korea lane to rebuild [DOT 2026] and carrying-capacity ceilings at the marquee islands — leaving diversification and regional-gateway capacity as the engines toward the 2028 plan target."),
      paragraphs: [
        stripTags("The Philippines under-converts on volume — 6.48m arrivals trails Thailand and Malaysia by a wide margin [DOT 2026] — but earns USD 1,631 per arrival against a SEA average near USD 1,085 [DOT 2026]. The 2027 story is to defend that premium: longer-stay island and dive demand, not low-yield short-haul churn, is where the receipts line is built."),
        "This report covers the macro backdrop, the Korea source-market reset, source-market diversification (China e-visa, US long-haul yield, the domestic base), the carrying-capacity ceilings at Boracay and Palawan, the gateway airports and the Korean direct-flight map, AI's impact on hospitality economics, and a base/bull/bear outlook to 2030.",
      ],
      chart: {
        title: 'Philippines international arrivals',
        subtitle: 'Million · 2019-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',                    pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Philippines 2027',      pages: 'PG 07', locked: true  },
      { num: '05', name: 'The Korea source-market reset',        pages: 'PG 09', locked: true  },
      { num: '06', name: 'Source-market diversification',        pages: 'PG 10', locked: true  },
      { num: '07', name: 'Boracay: the binding ceiling',         pages: 'PG 11', locked: true  },
      { num: '08', name: 'Palawan: the next capacity frontier',  pages: 'PG 12', locked: true  },
      { num: '09', name: 'Gateways & the Korean direct-flight map', pages: 'PG 14', locked: true  },
      { num: '10', name: 'AI impact on hospitality',             pages: 'PG 15', locked: true  },
      { num: '11', name: '5-year outlook & forecast',            pages: 'PG 16', locked: true  },
      { num: '12', name: 'Methodology endnote',                  pages: 'PG 17', locked: true  },
    ],
  },

  ja: {
    title: 'フィリピン観光 2027 — 韓国ルートを再構築し、島嶼の収容上限を管理する',
    eyebrow: 'フィリピン · 観光 · マーケット分析',
    preview: {
      lede: stripTags("フィリピンは2025年を入国者数648万人 [DOT 2026]で終え、実質横ばいとなりました。受取額はPHP 6,940億 [DOT 2026]と、着客一人当たりの高消費を反映しています。2027年に向けた主要課題は、-18%となった韓国ルートの立て直し [DOT 2026]と主要島嶼の収容上限への対応であり、多角化と地方空港整備が2028年計画目標に向けた成長エンジンとなります。"),
      paragraphs: [
        stripTags("フィリピンの入国者数は648万人と、タイ・マレーシアを大きく下回ります [DOT 2026]。しかし着客一人当たり受取額はUSD 1,631と、ASEAN平均のUSD 1,085を上回っています [DOT 2026]。2027年の焦点はこのプレミアムを守ることです。受取額の成長を牽引するのは、低収益の短距離旅行者ではなく、長期滞在の島嶼・ダイブ需要です。"),
        "本レポートはマクロ環境、韓国送客市場のリセット、送客市場の多角化（中国e-ビザ、米国の長距離高収益、国内需要基盤）、ボラカイとパラワンの収容上限、ゲートウェイ空港と韓国直行便マップ、ホスピタリティ経済性へのAIの影響、そして2030年までの基本・強気・弱気シナリオを扱います。",
      ],
      chart: {
        title: 'フィリピン国際着客数',
        subtitle: '百万人 · 2019-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',            pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ文脈：フィリピン2027',       pages: 'P 07', locked: true  },
      { num: '05', name: '韓国送客市場のリセット',            pages: 'P 09', locked: true  },
      { num: '06', name: '送客市場の多角化',                  pages: 'P 10', locked: true  },
      { num: '07', name: 'ボラカイ：拘束力ある収容上限',      pages: 'P 11', locked: true  },
      { num: '08', name: 'パラワン：次の収容フロンティア',    pages: 'P 12', locked: true  },
      { num: '09', name: 'ゲートウェイと韓国直行便マップ',    pages: 'P 14', locked: true  },
      { num: '10', name: 'ホスピタリティへのAI影響',          pages: 'P 15', locked: true  },
      { num: '11', name: '5年間見通しと予測',                 pages: 'P 16', locked: true  },
      { num: '12', name: '方法論後記',                        pages: 'P 17', locked: true  },
    ],
  },

  ko: {
    title: '필리핀 관광 2027 — 한국 노선을 재건하고, 섬의 수용 한계를 관리하라',
    eyebrow: '필리핀 · 관광 · 시장 분석',
    preview: {
      lede: stripTags("필리핀은 2025년 648만 명 입국자[DOT 2026]로 사실상 정체 마감했으며, 수입은 높은 1인당 지출에 힘입어 PHP 6,940억[DOT 2026]을 기록했습니다. 2027년의 핵심 과제는 한국 노선 -18% 회복[DOT 2026]과 주요 섬의 수용 한계 — 다변화와 지역 게이트웨이 용량이 2028년 계획 목표를 향한 성장 동력입니다."),
      paragraphs: [
        stripTags("필리핀은 물량에서 전환율이 낮습니다 — 648만 명 입국자는 태국·말레이시아에 크게 뒤처집니다[DOT 2026]. 그러나 SEA 평균 USD 1,085 대비 USD 1,631의 1인당 수입을 올리고 있습니다[DOT 2026]. 2027년 과제는 그 프리미엄을 지키는 것입니다. 저수익 단기 체류가 아닌 장기 체류 섬·다이빙 수요가 수입선의 핵심입니다."),
        "본 보고서는 거시 환경, 한국 송출 시장 재편, 송출 시장 다변화(중국 전자비자, 미국 장거리 고수익, 내수 기반), 보라카이와 팔라완의 수용 한계, 게이트웨이 공항과 한국 직항 노선 지도, 호스피탈리티 경제성에 대한 AI의 영향, 그리고 2030년까지의 기본·낙관·비관 전망을 다룹니다.",
      ],
      chart: {
        title: '필리핀 국제 입국자 수',
        subtitle: '백만 명 · 2019-2030F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '핵심 요약',                         pages: 'P 04', locked: false },
      { num: '04', name: '거시 맥락: 필리핀 2027',            pages: 'P 07', locked: true  },
      { num: '05', name: '한국 송출 시장 재편',               pages: 'P 09', locked: true  },
      { num: '06', name: '송출 시장 다변화',                  pages: 'P 10', locked: true  },
      { num: '07', name: '보라카이: 구속력 있는 상한',        pages: 'P 11', locked: true  },
      { num: '08', name: '팔라완: 차기 수용 한계 전선',       pages: 'P 12', locked: true  },
      { num: '09', name: '게이트웨이 & 한국 직항 노선 지도',  pages: 'P 14', locked: true  },
      { num: '10', name: '호스피탈리티 분야 AI 영향',         pages: 'P 15', locked: true  },
      { num: '11', name: '5개년 전망 & 예측',                 pages: 'P 16', locked: true  },
      { num: '12', name: '방법론 후기',                       pages: 'P 17', locked: true  },
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
