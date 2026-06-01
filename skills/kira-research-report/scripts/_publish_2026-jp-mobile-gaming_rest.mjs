// Fallback publisher for 2026-jp-mobile-gaming when the Supabase MCP transport
// is unavailable. Performs the same two upserts as _build_2026-jp-mobile-gaming_sql.mjs
// (living_reports + 3 report_translations) but via the PostgREST REST API using
// SUPABASE_URL + SUPABASE_SERVICE_KEY from the environment.
//
// Run: node skills/kira-research-report/scripts/_publish_2026-jp-mobile-gaming_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'mobile-gaming-japan-2026';
const NOW = new Date().toISOString();

const chartBars = [
  { pct: 83,  label: '2020',  value: 100 },
  { pct: 100, label: '2022',  value: 120 },
  { pct: 88,  label: '2026E', value: 106 },
];

const META = {
  en: {
    title: 'Japan mobile gaming 2026',
    eyebrow: 'JAPAN · MOBILE GAMING · MARKET ANALYSIS',
    preview: {
      lede: "Japan generated roughly USD 11 bn in mobile in-app revenue over the twelve months to July 2025 [Sensor Tower 2025] — second only to China's iOS market in Asia — even as revenue slipped 2.2% and downloads fell to 628 mn. Growth no longer comes from new users; it comes from retaining and monetizing a loyal, high-spending base. In mid-2025 the Consumer Affairs Agency mandated explicit gacha probability disclosure across every storefront [CAA 2025], repricing the engine that built the market.",
      paragraphs: [
        "Japan generated roughly USD 11 bn in mobile IAP revenue over the twelve months to July 2025 [Sensor Tower 2025], second only to China's iOS market in Asia, even as revenue slipped 2.2% and downloads fell 2.5% to 628 mn. The market is no longer growing on users; it is being held up by retention and monetization of a loyal, high-spending base — an economy of depth, not reach.",
        "In mid-2025 the Consumer Affairs Agency finalized updated guidance mandating explicit probability display for all banner tiers, with sub-rarity breakdowns, across every storefront operating in Japan [CAA 2025]. Combined with JOGA/CESA self-regulation, transparency is now table stakes — and because operators rarely region-split, Japan's rules effectively set a global standard for gacha disclosure.",
      ],
      chart: { title: 'Japan mobile gaming — revenue vs downloads', subtitle: 'Indexed to 2020 = 100 · 2020–2026E', bars: chartBars },
    },
    toc: [
      { num: '01', name: 'Executive summary',                              pages: 'PG 04', locked: false },
      { num: '02', name: 'Strategic implications for market participants',  pages: 'PG 05', locked: true  },
      { num: '03', name: 'Market size, monetization, and the spender base', pages: 'PG 07', locked: true  },
      { num: '04', name: 'IP-led franchise economics',                      pages: 'PG 08', locked: true  },
      { num: '05', name: 'Publisher landscape and concentration',           pages: 'PG 10', locked: true  },
      { num: '06', name: 'Top titles: lifecycle and franchise read',        pages: 'PG 11', locked: true  },
      { num: '07', name: 'Gacha regulation: probability disclosure',        pages: 'PG 13', locked: true  },
      { num: '08', name: 'Five-year outlook and risk scenarios',            pages: 'PG 14', locked: true  },
      { num: '09', name: 'Methodology endnote and source key',             pages: 'PG 15', locked: true  },
    ],
  },
  ja: {
    title: '日本 モバイルゲーム 2026',
    eyebrow: '日本 · モバイルゲーム · マーケット分析',
    preview: {
      lede: '日本は2025年7月までの12ヶ月間でモバイルアプリ内課金収益約USD 110億を創出し[Sensor Tower 2025]、アジアでは中国iOS市場に次ぐ規模を維持しています。収益は2.2%減、ダウンロードは6億2,800万件へと縮小したものの、成長はもはや新規ユーザーではなく、ロイヤル課金層の継続率と課金深度から生まれています。2025年中頃、消費者庁は全ストアフロントでの明示的なガチャ確率開示を義務化し[CAA 2025]、市場を築いた収益エンジンを再定義しました。',
      paragraphs: [
        '日本は2025年7月までの12ヶ月間に、アジアでは中国iOSに次ぐモバイルIAP収益USD 110億を創出しました[Sensor Tower 2025]。収益は2.2%、ダウンロードは2.5%減の6億2,800万件と落ち込んだものの、市場を支えているのはユーザー数の拡大ではなく、ロイヤル課金層の継続率と課金深度です。到達範囲ではなく深度で成り立つ経済構造と言えます。',
        '2025年中頃、消費者庁は日本国内で流通するすべてのストアフロントに対し、バナー全ティアにおける明示的な確率表示およびサブレアリティ別の内訳開示を義務化する新たなガイダンスを確定しました[CAA 2025]。JOGAおよびCESAの自主規制と相まって、透明性はもはや最低水準の要件です。事業者が地域別の実装を分けることは稀であるため、日本の規制は事実上ガチャ開示のグローバルスタンダードを設定しています。',
      ],
      chart: { title: '日本モバイルゲーム — 収益対ダウンロード', subtitle: '2020年=100指数化 · 2020〜2026E', bars: chartBars },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',              pages: 'P 04', locked: false },
      { num: '02', name: '市場参加者への戦略的示唆',            pages: 'P 05', locked: true  },
      { num: '03', name: '市場規模、課金構造、課金層の実態',     pages: 'P 07', locked: true  },
      { num: '04', name: 'IP主導フランチャイズ経済',            pages: 'P 08', locked: true  },
      { num: '05', name: 'パブリッシャー競争地図と集約化',       pages: 'P 10', locked: true  },
      { num: '06', name: '主要タイトル：ライフサイクル分析',     pages: 'P 11', locked: true  },
      { num: '07', name: 'ガチャ規制：確率開示と自主規制',       pages: 'P 13', locked: true  },
      { num: '08', name: '5年間見通しとリスクシナリオ',          pages: 'P 14', locked: true  },
      { num: '09', name: '調査手法補足と出典一覧',              pages: 'P 15', locked: true  },
    ],
  },
  ko: {
    title: '일본 모바일 게임 2026',
    eyebrow: '일본 · 모바일 게임 · 시장 분석',
    preview: {
      lede: '일본은 2025년 7월까지 12개월간 모바일 인앱 매출 약 USD 110억을 창출하며[Sensor Tower 2025] 아시아에서 중국 iOS 시장 다음 규모를 유지했습니다. 매출은 2.2% 감소하고 다운로드는 6억 2,800만 건으로 줄었지만, 성장은 더 이상 신규 이용자가 아니라 충성도 높은 고지출 기반의 리텐션과 수익화에서 나옵니다. 2025년 중반 소비자청은 전 스토어에 명시적 가챠 확률 공개를 의무화하며[CAA 2025] 시장을 일군 수익 엔진을 재편했습니다.',
      paragraphs: [
        '일본은 2025년 7월까지 12개월간 모바일 IAP에서 약 USD 110억의 매출을 창출했으며[Sensor Tower 2025], 매출이 2.2%, 다운로드가 2.5% 감소해 6억 2,800만 건으로 줄었음에도 아시아에서 중국 iOS 시장 다음으로 높은 수준을 유지했습니다. 이 시장은 더 이상 이용자 수 증가로 성장하지 않습니다. 충성도 높은 고지출 기반의 리텐션과 수익화가 매출을 떠받치는 구조 — 외연이 아닌 심도의 경제입니다.',
        '2025년 중반, 소비자청은 일본 내 모든 스토어에서 모든 배너 등급의 명시적 확률 표시와 세부 희귀도 분류를 의무화하는 지침을 확정 발표했습니다[CAA 2025]. JOGA·CESA 자율 규제와 결합되어 투명성은 이제 기본 요건이 됐습니다 — 사업자들이 지역별 코드를 거의 분리하지 않기 때문에, 일본의 규칙은 사실상 가챠 공개에 관한 글로벌 표준을 설정하고 있습니다.',
      ],
      chart: { title: '일본 모바일 게임 — 매출 vs 다운로드', subtitle: '2020년=100 지수 · 2020–2026E', bars: chartBars },
    },
    toc: [
      { num: '01', name: '경영진 요약',                   pages: 'P 04', locked: false },
      { num: '02', name: '시장 참여자를 위한 전략적 시사점', pages: 'P 05', locked: true  },
      { num: '03', name: '시장 규모, 수익화, 지출자 기반',   pages: 'P 07', locked: true  },
      { num: '04', name: 'IP 중심 프랜차이즈 경제',         pages: 'P 08', locked: true  },
      { num: '05', name: '퍼블리셔 지형과 집중화',          pages: 'P 10', locked: true  },
      { num: '06', name: '주요 타이틀: 라이프사이클 분석',   pages: 'P 11', locked: true  },
      { num: '07', name: '가챠 규제: 확률 공개와 자율 규제',  pages: 'P 13', locked: true  },
      { num: '08', name: '5개년 전망과 리스크 시나리오',     pages: 'P 14', locked: true  },
      { num: '09', name: '방법론 후기 및 출처 범례',         pages: 'P 15', locked: true  },
    ],
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'Japan', industry: 'Mobile Gaming', year: 2026,
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
