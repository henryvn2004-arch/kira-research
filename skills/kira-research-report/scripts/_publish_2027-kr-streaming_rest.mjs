// Fallback publisher for 2027-kr-streaming when the Supabase MCP transport
// is unavailable (net::ERR_FAILED). Upserts living_reports + 3 report_translations
// via PostgREST using SUPABASE_URL + SUPABASE_SERVICE_KEY from env.
//
// Run: node skills/kira-research-report/scripts/_publish_2027-kr-streaming_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'streaming-south-korea-2027';
const NOW = new Date().toISOString();

// Exec-chart page 4: Korea OTT subscriber share (% subs, 2025). Max 40 -> pct rel.
const chartBars = [
  { pct: 100, label: 'Netflix',      value: 40 },
  { pct: 53,  label: 'Coupang Play', value: 21 },
  { pct: 43,  label: 'Tving',        value: 17 },
  { pct: 18,  label: 'Wavve',        value: 7  },
  { pct: 15,  label: 'Disney+',      value: 6  },
];

const TOC_PAGES = ['PG 04','PG 05','PG 07','PG 08','PG 10','PG 11','PG 13','PG 14','PG 15'];

function toc(names) {
  return names.map((name, i) => ({
    num: String(i + 1).padStart(2, '0'),
    name,
    pages: TOC_PAGES[i],
    locked: i !== 0,
  }));
}

const META = {
  en: {
    title: 'South Korea streaming 2027: the Tving–Wavve consolidation & K-content licensing economics',
    eyebrow: 'SOUTH KOREA · STREAMING · MARKET ANALYSIS',
    preview: {
      lede: "Korea's streaming market is worth roughly USD 3.9 bn in 2026 [3Vision 2026], yet a single global platform now takes the majority of viewing while domestic services merge to survive. The two questions into 2027 are whether the Tving–Wavve combination can hold share against Netflix, and whether Korean production keeps any of the upside its content creates abroad.",
      paragraphs: [
        "Netflix leads the subscription market at roughly 40% of subscribers (~13.9 m) [WiseApp 2025], and by smartphone usage-time its lead is wider still [Korea Times 2025]. Domestic services — Coupang Play, Tving, Wavve — hold a larger combined subscriber base [Omdia 2025], but no single Korean service approaches Netflix alone. Stacking averages ~1.7 services per subscriber [Omdia 2025], so growth now comes from ARPU and tier upgrades, not new households.",
        "CJ ENM's Tving and SK-and-broadcaster-backed Wavve won conditional FTC clearance to merge in mid-2025 [Korea Herald 2025]; combined they reach roughly 24% subscriber share [Kira estimates]. The condition — hold pricing through end-2026 [FTC 2025] — caps the near-term ARPU lever the deal was meant to unlock.",
      ],
      chart: {
        title: 'Korea OTT subscriber share',
        subtitle: 'South Korea · % subscribers · 2025',
        bars: chartBars,
      },
    },
    toc: toc([
      'Executive summary',
      'Strategic implications',
      'Market sizing and subscriber share',
      'The Tving–Wavve consolidation',
      'K-content licensing economics',
      'Competitive landscape',
      'AI and operations',
      '5-year outlook and forecast',
      'Methodology and sources',
    ]),
  },

  ja: {
    title: '韓国ストリーミング 2027：Tving–Wavve統合とKコンテンツのライセンス経済',
    eyebrow: '韓国 · ストリーミング · マーケット分析',
    preview: {
      lede: '韓国のストリーミング市場は2026年に概算USD 3.9 bn [3Vision 2026]の規模を持つが、視聴の過半数を単一のグローバルプラットフォームが占め、国内サービスは生き残りをかけて統合を進めています。2027年に向けた問いは2つ：Tving–Wavve統合体がNetflixに対してシェアを維持できるか、そして韓国の制作会社が自ら生み出すコンテンツの上昇価値を取り込めるか。',
      paragraphs: [
        'Netflixは加入者ベースで約40%のシェア（約1,390万人） [WiseApp 2025]を確保し、スマートフォン利用時間ではさらに大きなリードを持ちます [Korea Times 2025]。国内サービス — Coupang Play、Tving、Wavve — は合算で大きな加入者数を持つものの [Omdia 2025]、個別サービスとしてNetflixに匹敵するものはありません。重複契約は加入者1人当たり平均約1.7サービス [Omdia 2025]に達しており、成長はARPUとプラン上位移行によってもたらされ、新規世帯獲得によるものではありません。',
        'CJ ENMのTvingとSK・放送局連合のWavveは2025年半ばにFTCから条件付き統合承認を取得し [Korea Herald 2025]、統合後の加入者シェアは約24% [Kira estimates]に達します。条件 — 2026年末まで現行料金水準を維持すること [FTC 2025] — は、統合の目的だった近期ARPUの引き上げを封じています。',
      ],
      chart: {
        title: '韓国OTT加入者シェア',
        subtitle: '韓国 · 加入者% · 2025年',
        bars: chartBars,
      },
    },
    toc: toc([
      'エグゼクティブサマリー',
      '戦略的示唆',
      '市場規模と加入者シェア',
      'Tving–Wavve統合',
      'Kコンテンツのライセンス経済',
      '競合環境',
      'AIと事業運営',
      '5年間の展望と予測',
      '調査手法と出典',
    ]),
  },

  ko: {
    title: '한국 스트리밍 2027: Tving–Wavve 합병과 K-콘텐츠 라이선스 경제학',
    eyebrow: '한국 · 스트리밍 · 시장 분석',
    preview: {
      lede: '한국 스트리밍 시장 규모는 2026년 약 USD 3.9 bn[3Vision 2026]이지만, 단일 글로벌 플랫폼이 시청 점유율 대부분을 가져가는 가운데 국내 서비스들은 생존을 위해 합병에 나서고 있습니다. 2027년으로 향하는 핵심 질문은 두 가지입니다. Tving–Wavve 합산이 Netflix에 맞서 점유율을 유지할 수 있는가, 그리고 한국 제작사가 자국 콘텐츠가 해외에서 창출하는 부가가치의 일부라도 가져올 수 있는가입니다.',
      paragraphs: [
        'Netflix는 구독 시장에서 약 40% 점유율(~1,390만 명)[WiseApp 2025]로 선두를 지키고 있으며, 스마트폰 이용 시간 기준으로는 격차가 더 벌어집니다[Korea Times 2025]. 국내 서비스들(Coupang Play, Tving, Wavve)의 합산 구독자 수는 Netflix를 웃돌지만[Omdia 2025], 단일 국내 서비스로는 Netflix에 근접하는 곳이 없습니다. 스태킹은 구독자당 평균 ~1.7개 서비스[Omdia 2025]로, 성장은 이제 신규 가구 확보가 아닌 ARPU 개선과 요금제 상향에서 나옵니다.',
        'CJ ENM의 Tving과 SK·방송사 연합이 뒷받침하는 Wavve는 2025년 중반 공정위로부터 조건부 합병 승인을 받았습니다[Korea Herald 2025]. 양사 합산 점유율은 약 24%[Kira estimates]로 추정됩니다. 다만 2026년 말까지 요금을 동결해야 한다는 조건[FTC 2025]은 합병의 원래 목적이었던 단기 ARPU 개선을 제약합니다.',
      ],
      chart: {
        title: '한국 OTT 구독자 점유율',
        subtitle: '한국 · % 구독자 · 2025',
        bars: chartBars,
      },
    },
    toc: toc([
      '경영진 요약',
      '전략적 시사점',
      '시장 규모 및 구독자 점유율',
      'Tving–Wavve 합병',
      'K-콘텐츠 라이선스 경제학',
      '경쟁 구도',
      'AI 및 운영',
      '5개년 전망 및 예측',
      '방법론 및 출처',
    ]),
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'South Korea', industry: 'Streaming', year: 2027,
    pages: 15, price: 39, currency: 'USD', status: 'published', published_at: NOW,
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
