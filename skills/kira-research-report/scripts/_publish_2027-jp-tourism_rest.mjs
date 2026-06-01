// Fallback publisher for 2027-jp-tourism when the Supabase MCP transport
// is unavailable (net::ERR_FAILED). Same two upserts as
// _build_2027-jp-tourism_sql.mjs (living_reports + 3 report_translations)
// but via PostgREST using SUPABASE_URL + SUPABASE_SERVICE_KEY from env.
//
// Run: node skills/kira-research-report/scripts/_publish_2027-jp-tourism_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'tourism-japan-2027';
const NOW = new Date().toISOString();

const chartBars = [
  { pct: 62,  label: '2024',  value: 36.9 },
  { pct: 69,  label: '2026F', value: 41.4 },
  { pct: 74,  label: '2027F', value: 44.5 },
  { pct: 100, label: '2030T', value: 60   },
];

const META = {
  en: {
    title: "Japan tourism market 2027: the yen tailwind fades, dispersal becomes strategy",
    eyebrow: 'JAPAN · TOURISM · MARKET ANALYSIS',
    preview: {
      lede: "Japan closed 2025 at a record 42.68 million arrivals and JPY 9.46 trillion in visitor spending. Into 2027 the weak-yen tailwind is structurally fading and the China lane has been cut by a travel advisory — leaving high-value long-haul demand and a state-funded regional-dispersal push as the engines of the path to 60 million arrivals by 2030.",
      paragraphs: [
        "This report frames 2026-27 as the post-tailwind reset, not a pause before another FX-driven surge. It covers the macro pivot from a weak-yen boom to a spend-per-visitor and high-value-mix revenue model, the China demand shock (arrivals cut 60.7% in January 2026 after a November 2025 travel advisory), and the source-market diversification that lets the value strategy survive the China cut.",
        "The new Tourism Nation plan sets a 130-million regional-overnight-stay target for 2030 — 2.2x the 2025 base — funded by tripling the departure tax to JPY 3,000 from July 2026 and lifting the tourism agency budget to JPY 138.3 billion. The report maps the competitive and capacity constraints (OTAs, carriers, the hotel-labour gap), the 2027 regulatory round, AI's impact on hospitality yield and multilingual service, and a base / bull / bear forecast to 2030.",
      ],
      chart: {
        title: 'Japan international arrivals (million)',
        subtitle: '2024 actual · 2026-27 forecast · 2030 target',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'Executive summary',                      pages: 'PG 04', locked: false },
      { num: '04', name: 'Macro context: Japan 2027',              pages: 'PG 07', locked: true  },
      { num: '05', name: 'The China demand shock',                 pages: 'PG 09', locked: true  },
      { num: '06', name: 'Source-market diversification',          pages: 'PG 10', locked: true  },
      { num: '07', name: 'Regional dispersal & the funding engine',pages: 'PG 12', locked: true  },
      { num: '08', name: 'Competitive & capacity map',             pages: 'PG 13', locked: true  },
      { num: '09', name: 'Regulatory & policy landscape',          pages: 'PG 15', locked: true  },
      { num: '10', name: 'AI impact on hospitality',               pages: 'PG 16', locked: true  },
      { num: '11', name: '5-year outlook & forecast',              pages: 'PG 17', locked: true  },
      { num: '12', name: 'Methodology endnote',                    pages: 'PG 17', locked: true  },
    ],
  },
  ja: {
    title: '日本観光市場 2027:円安追い風の終焉、地域分散が戦略の軸へ',
    eyebrow: '日本 · 観光 · マーケット分析',
    preview: {
      lede: '日本は2025年に入国者数4,268万人、訪日消費JPY 9.46兆円という記録を達成しました。2027年に向けて円安追い風は構造的に衰退し、渡航勧告により中国ルートが大幅に縮小するなか、高付加価値の長距離需要と国の地域分散推進が2030年6,000万人目標への主要な原動力となっています。',
      paragraphs: [
        '本レポートは2026〜27年を、FX主導の次なる急増の前の小休止ではなく「追い風後のリセット」と位置づけます。円安ブームから訪問客単価・高付加価値ミックス型の収益モデルへのマクロ転換、中国需要ショック(2025年11月の渡航勧告後、2026年1月に入国者数60.7%減)、そして価値戦略が中国減を乗り越えられる送客元の多様化を扱います。',
        '新たな観光立国計画は2030年に地域延べ宿泊1.3億泊(2025年比2.2倍)を目標に掲げ、2026年7月からの出国税JPY 3,000への倍増と観光庁予算JPY 1,383億円への増額で財源を確保します。本レポートは競合・供給能力の制約(OTA、航空会社、ホテルの労働力ギャップ)、2027年の規制ラウンド、ホスピタリティの収益管理と多言語サービスへのAI影響、そして2030年までのベース・強気・弱気予測を整理します。',
      ],
      chart: {
        title: '日本の外国人入国者数(百万人)',
        subtitle: '2024年実績 · 2026〜27年予測 · 2030年目標',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: 'エグゼクティブサマリー',          pages: 'P 04', locked: false },
      { num: '04', name: 'マクロ環境:日本 2027',           pages: 'P 07', locked: true  },
      { num: '05', name: '中国需要ショック',                pages: 'P 09', locked: true  },
      { num: '06', name: '送客元の多様化',                  pages: 'P 10', locked: true  },
      { num: '07', name: '地域分散と財源エンジン',          pages: 'P 12', locked: true  },
      { num: '08', name: '競合・供給能力マップ',            pages: 'P 13', locked: true  },
      { num: '09', name: '規制・政策の動向',                pages: 'P 15', locked: true  },
      { num: '10', name: 'AIのホスピタリティへの影響',      pages: 'P 16', locked: true  },
      { num: '11', name: '5年間の見通しと予測',             pages: 'P 17', locked: true  },
      { num: '12', name: '方法論補足',                      pages: 'P 17', locked: true  },
    ],
  },
  ko: {
    title: '일본 관광 시장 2027: 엔저 순풍이 사라지고 지역 분산이 전략이 된다',
    eyebrow: '일본 · 관광 · 시장 분석',
    preview: {
      lede: '일본은 2025년 사상 최대인 4,268만 명 입국과 방문객 소비 JPY 9.46조를 기록했습니다. 2027년으로 향하면서 엔저 순풍은 구조적으로 소멸하고 있으며, 중국 노선은 여행 권고로 사실상 차단된 상황입니다. 고가치 장거리 수요와 정부 주도의 지역 분산 정책이 2030년 6,000만 명 달성 경로를 이끄는 핵심 동력으로 부상하고 있습니다.',
      paragraphs: [
        '본 보고서는 2026-27년을 FX 주도의 또 다른 급증 직전의 휴지기가 아니라 "순풍 이후의 리셋"으로 규정합니다. 엔저 붐에서 방문객 1인당 소비·고가치 믹스 기반 수익 모델로의 거시 전환, 중국 수요 충격(2025년 11월 여행 권고 후 2026년 1월 입국 60.7% 감소), 그리고 가치 전략이 중국 감소를 견뎌내게 하는 공급 시장 다변화를 다룹니다.',
        '신규 관광입국 계획은 2030년 지역 연박 1.3억 박(2025년 대비 2.2배)을 목표로 설정하고, 2026년 7월부터 출국세를 JPY 3,000으로 3배 인상하며 관광청 예산을 JPY 1,383억으로 증액해 재원을 확보합니다. 본 보고서는 경쟁·공급 능력 제약(OTA, 항공사, 호텔 인력 격차), 2027년 규제 라운드, 호스피탈리티 수익 관리와 다국어 서비스에 대한 AI 영향, 그리고 2030년까지의 기본·낙관·비관 시나리오를 정리합니다.',
      ],
      chart: {
        title: '일본 외국인 입국자 수 (백만 명)',
        subtitle: '2024 실적 · 2026-27 예측 · 2030 목표',
        bars: chartBars,
      },
    },
    toc: [
      { num: '03', name: '경영진 요약',                    pages: 'P 04', locked: false },
      { num: '04', name: '거시 환경: 일본 2027',           pages: 'P 07', locked: true  },
      { num: '05', name: '중국 수요 충격',                 pages: 'P 09', locked: true  },
      { num: '06', name: '공급 시장 다변화',               pages: 'P 10', locked: true  },
      { num: '07', name: '지역 분산 & 재원 조달 구조',     pages: 'P 12', locked: true  },
      { num: '08', name: '경쟁·공급 구조',                 pages: 'P 13', locked: true  },
      { num: '09', name: '규제 & 정책 환경',               pages: 'P 15', locked: true  },
      { num: '10', name: 'AI가 호스피탈리티에 미치는 영향',pages: 'P 16', locked: true  },
      { num: '11', name: '5개년 전망 & 시나리오',          pages: 'P 17', locked: true  },
      { num: '12', name: '방법론 미주',                    pages: 'P 17', locked: true  },
    ],
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'Japan', industry: 'Tourism', year: 2027,
    pages: 17, price: 39, currency: 'USD', status: 'published', published_at: NOW,
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
