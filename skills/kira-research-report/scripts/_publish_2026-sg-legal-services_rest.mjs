// Fallback publisher for 2026-sg-legal-services when the Supabase MCP transport
// is unavailable. Performs the same two upserts as _build_2026-sg-legal-services_sql.mjs
// (living_reports + 3 report_translations) but via the PostgREST REST API using
// SUPABASE_URL + SUPABASE_SERVICE_KEY from the environment.
//
// Run: node skills/kira-research-report/scripts/_publish_2026-sg-legal-services_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'legal-services-singapore-2026';
const NOW = new Date().toISOString();

const chartBars = [
  { pct: 74,  label: '2024',  value: 5.05 },
  { pct: 90,  label: '2028F', value: 6.17 },
  { pct: 100, label: '2030F', value: 6.82 },
];

const META = {
  en: {
    title: 'Singapore legal services 2026',
    eyebrow: 'SINGAPORE · LEGAL SERVICES · MARKET ANALYSIS',
    preview: {
      lede: "Singapore's legal services market reached USD 5.05 bn in 2024 [Deep Market 2024], anchored by a world-class disputes franchise. The next 24 months split the market: high-margin cross-border advisory and arbitration on one side, and a fast-commoditizing volume layer that ALSPs and generative AI are repricing on the other.",
      paragraphs: [
        "Singapore's defensible position is its international dispute-resolution infrastructure. SIAC registered 625 new cases in 2024 with 91% international and USD 11.86 bn in total disputed value [SIAC 2024]. The Singapore International Commercial Court rose from 2 cases in 2015 to 28 in 2024 [SICC 2024]. This franchise pulls premium cross-border advisory work that is structurally insulated from commoditization — counsel-led, bespoke, and relationship-anchored.",
        "Below the premium tier, routine work — contract review, due diligence, eDiscovery, compliance — is the substitution frontier. APAC is the fastest-growing ALSP region at 9–11% CAGR through 2032 [RM 2025], and MinLaw's 2026 guidance notes up to 44% of legal tasks are AI-automatable [MinLaw 2026]. Practice economics that depend on leveraging junior hours against this layer face structural compression.",
      ],
      chart: { title: 'SG legal services market sizing', subtitle: 'Singapore · USD bn · 2022–2030F', bars: chartBars },
    },
    toc: [
      { num: '01', name: 'Executive summary',                    pages: 'PG 04', locked: false },
      { num: '02', name: 'Market sizing and the demand profile', pages: 'PG 06', locked: true  },
      { num: '03', name: 'The international arbitration engine',  pages: 'PG 07', locked: true  },
      { num: '04', name: 'Service-line economics',               pages: 'PG 09', locked: true  },
      { num: '05', name: 'Practitioner landscape',               pages: 'PG 10', locked: true  },
      { num: '06', name: 'ALSP market entry',                    pages: 'PG 12', locked: true  },
      { num: '07', name: 'Generative AI in legal work',          pages: 'PG 13', locked: true  },
      { num: '08', name: 'Outlook and strategic implications',   pages: 'PG 14', locked: true  },
    ],
  },
  ja: {
    title: 'シンガポール 法律サービス 2026',
    eyebrow: 'シンガポール · 法律サービス · マーケット分析',
    preview: {
      lede: 'シンガポールの法律サービス市場は2024年にUSD 50.5億に達し[Deep Market 2024]、世界水準の紛争解決基盤に支えられています。今後24ヶ月で市場は二極化します。一方は高利益率の越境アドバイザリーおよび仲裁、他方はALSPと生成AIが価格を再編しつつある急速な標準化が進む大量処理レイヤーです。',
      paragraphs: [
        'シンガポールの防御可能なポジションは、国際的な紛争解決インフラにあります。SIACは2024年に625件の新規案件を登録し、そのうち91%が国際案件、72管轄の当事者が参加し、係争総額はUSD 118.6億に達しました[SIAC 2024]。シンガポール国際商業裁判所(SICC)は2015年の2件から2024年には28件へと成長しています[SICC 2024]。この基盤が引き付けるプレミアムな越境アドバイザリー業務は、代替圧力から構造的に絶縁されています。',
        'プレミアム層の下では、定型業務(契約書レビュー、デューデリジェンス、eDiscovery、コンプライアンス)が代替のフロンティアとなっています。APACは2032年までの年率9〜11%成長で最速のALSP市場です[RM 2025]。MinLawの2026年ガイドラインは法律業務の最大44%がAI自動化可能と指摘しています[MinLaw 2026]。ジュニア弁護士の稼働時間をこのレイヤーに依存する実務経済は、構造的な圧縮に直面しています。',
      ],
      chart: { title: 'SG法律サービス市場規模', subtitle: 'シンガポール · USD bn · 2022–2030F', bars: chartBars },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',     pages: 'P 04', locked: false },
      { num: '02', name: '市場規模と需要プロファイル',  pages: 'P 06', locked: true  },
      { num: '03', name: '国際仲裁基盤の分析',          pages: 'P 07', locked: true  },
      { num: '04', name: 'サービスライン経済学',        pages: 'P 09', locked: true  },
      { num: '05', name: '実務家の競争構造',            pages: 'P 10', locked: true  },
      { num: '06', name: 'ALSP市場参入',                pages: 'P 12', locked: true  },
      { num: '07', name: '法律業務における生成AI',      pages: 'P 13', locked: true  },
      { num: '08', name: '見通しと戦略的示唆',          pages: 'P 14', locked: true  },
    ],
  },
  ko: {
    title: '싱가포르 법률 서비스 2026',
    eyebrow: '싱가포르 · 법률 서비스 · 시장 분석',
    preview: {
      lede: '싱가포르 법률 서비스 시장은 2024년 USD 50.5억[Deep Market 2024]에 도달했으며, 세계 수준의 분쟁 해결 프랜차이즈를 중심으로 구축되어 있습니다. 향후 24개월은 시장을 양분합니다: 한편에는 상품화에 저항하는 고마진 국경 간 자문·중재가, 다른 한편에는 ALSP과 생성형 AI가 가격을 재편하는 빠르게 범용화되는 물량 계층이 자리합니다.',
      paragraphs: [
        '싱가포르의 방어 가능한 포지션은 국제 분쟁 해결 인프라입니다. SIAC는 2024년 72개 관할에서 625건을 접수(국제 91%)했으며 총 분쟁 금액은 USD 118.6억에 달합니다[SIAC 2024]. 싱가포르 국제상사법원(SICC)은 2015년 2건에서 2024년 28건으로 성장했습니다[SICC 2024]. 이 프랜차이즈는 상품화에 구조적으로 절연된 프리미엄 국경 간 자문 업무 — 변호사 주도, 맞춤형, 관계 기반 — 를 끌어들입니다.',
        '프리미엄 계층 아래에서 일상적 업무 — 계약 검토, 실사, eDiscovery, 컴플라이언스 — 는 대체의 최전선입니다. APAC은 2032년까지 CAGR 9~11%로 가장 빠르게 성장하는 ALSP 지역이며[RM 2025], MinLaw 2026년 가이던스는 법률 업무의 최대 44%가 AI 자동화 가능함을 명시합니다[MinLaw 2026]. 이 계층에서 주니어 인력 레버리지에 의존하는 실무 경제구조는 구조적 압박에 직면합니다.',
      ],
      chart: { title: 'SG 법률 서비스 시장 규모', subtitle: '싱가포르 · USD bn · 2022–2030F', bars: chartBars },
    },
    toc: [
      { num: '01', name: '경영진 요약',              pages: 'P 04', locked: false },
      { num: '02', name: '시장 규모와 수요 구조',     pages: 'P 06', locked: true  },
      { num: '03', name: '국제 중재 허브',            pages: 'P 07', locked: true  },
      { num: '04', name: '서비스 라인 수익 구조',     pages: 'P 09', locked: true  },
      { num: '05', name: '실무자 현황',               pages: 'P 10', locked: true  },
      { num: '06', name: 'ALSP 시장 진입',            pages: 'P 12', locked: true  },
      { num: '07', name: '법률 업무의 생성형 AI',     pages: 'P 13', locked: true  },
      { num: '08', name: '전망 및 전략적 시사점',     pages: 'P 14', locked: true  },
    ],
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'Singapore', industry: 'Legal Services', year: 2026,
    pages: 14, price: 39, currency: 'USD', status: 'published', published_at: NOW,
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
