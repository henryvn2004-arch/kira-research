// One-off helper: builds the SQL to insert living_reports + 3 report_translations
// rows for 2026-sg-private-credit (Singapore private credit 2026).
// Modeled on _build_2026-sg-legal-services_sql.mjs.
// Run: `node skills/kira-research-report/scripts/_build_2026-sg-private-credit_sql.mjs > /tmp/insert_sg_pc.sql`
// then feed to Supabase MCP execute_sql.
//
// pdf_url emits a STORAGE PATH (<report_id>/<locale>.pdf), computed inside the SQL
// CTE from new_report.id — NOT a GitHub raw URL.

const SLUG     = 'private-credit-singapore-2026';
const COUNTRY  = 'Singapore';
const INDUSTRY = 'Private Credit';
const YEAR     = 2026;
const PAGES    = 18;
const PRICE    = 39;

// Exec chart — APAC private credit AUM trajectory, USD bn. Preview subset: 2024 / 2027F / 2031F. Max 156.
const chartBars = [
  { pct: 38,  label: '2024',  value: 59 },
  { pct: 59,  label: '2027F', value: 92 },
  { pct: 100, label: '2031F', value: 156 },
];

const META = {
  en: {
    title: 'Singapore private credit 2026',
    eyebrow: 'SINGAPORE · PRIVATE CREDIT · MARKET ANALYSIS',
    preview: {
      lede: "An APAC pool tracking from USD 59 bn toward USD 92 bn by 2027, a SGD 1 bn state Growth Fund, a Temasek platform seeded at roughly USD 10 bn, and a retail-access framework in consultation — the city-state is converting hub infrastructure into balance-sheet share. AUM growth dynamics and strategic outlook through 2031.",
      paragraphs: [
        "Singapore anchors APAC private credit through legal predictability, the Variable Capital Company regime and deep distribution — supporting origination, structuring and restructuring at scale [Chambers SG 2026]. State capital has moved in behind that role: a SGD 1 bn Private Credit Growth Fund mandated to Apollo [MTI 2025] and a Temasek platform seeded at roughly USD 10 bn [Temasek 2024]. Hub status is being converted into balance-sheet weight.",
        "Banks held over 80% of APAC credit at end-2023 [AIMA 2025] — far higher than the US or Europe, the source of the multi-year convergence trade. Basel-driven retrenchment has narrowed bank appetite to investment-grade and collateral-rich names, against an APAC MSME finance gap of USD 2.5 trn [IFC 2025]. Non-bank lenders fill the cash-flow-lending middle the banks vacate.",
      ],
      chart: {
        title: 'APAC private credit AUM trajectory',
        subtitle: 'APAC · USD bn · 2024–2031F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',                  pages: 'PG 04', locked: false },
      { num: '02', name: 'The structural demand pull',         pages: 'PG 06', locked: true  },
      { num: '03', name: 'Market sizing: global to Singapore', pages: 'PG 07', locked: true  },
      { num: '04', name: 'Demand drivers',                     pages: 'PG 08', locked: true  },
      { num: '05', name: 'Manager landscape',                  pages: 'PG 09', locked: true  },
      { num: '06', name: 'Strategy & segment mix',             pages: 'PG 10', locked: true  },
      { num: '07', name: 'Platform landscape',                 pages: 'PG 11', locked: true  },
      { num: '08', name: 'Policy & access architecture',       pages: 'PG 12', locked: true  },
      { num: '09', name: 'Regulatory & fund structure',        pages: 'PG 13', locked: true  },
      { num: '10', name: 'AUM growth dynamics',                pages: 'PG 14', locked: true  },
      { num: '11', name: 'AI in private credit operations',    pages: 'PG 15', locked: true  },
      { num: '12', name: 'Risk, forecast & methodology',       pages: 'PG 16', locked: true  },
    ],
  },

  ja: {
    title: 'シンガポール プライベートクレジット 2026',
    eyebrow: 'シンガポール · プライベートクレジット · マーケット分析',
    preview: {
      lede: 'APACのプールはUSD 590億からUSD 920億へ（2027年予測）で推移し、SGD 10億規模の国家成長基金、テマセクが約USD 100億を拠出した運用基盤、リテール向け制度の諮問手続きが進む中、同国はハブインフラをバランスシートシェアへと転換しつつあります。2031年までのAUM成長動態と戦略的見通し。',
      paragraphs: [
        'シンガポールは法的予見可能性、VCC制度、深い流通網を通じてAPACのプライベートクレジットを支え、組成・ストラクチャリング・リストラクチャリングを大規模に担っています[Chambers SG 2026]。国家資本もその役割の後ろに動いており、SGD 10億のプライベートクレジット成長基金はApolloに委託され[MTI 2025]、テマセクの基盤は約USD 100億の出資を受けています[Temasek 2024]。ハブとしての地位がバランスシートの厚みへと転換されつつあります。',
        '銀行は2023年末時点でAPACクレジットの80%超を保有しており[AIMA 2025]、米国・欧州を大きく上回る水準です。バーゼル規制に伴う後退により銀行の選好は投資適格・担保豊富な先へと絞り込まれ、USD 2.5兆にのぼるAPACのMSMEファイナンスギャップが未充足のまま残っています[IFC 2025]。ノンバンクの貸し手は、銀行が退いたキャッシュフロー融資の中間層を補完する役割を担っています。',
      ],
      chart: {
        title: 'APACプライベートクレジットAUM推移',
        subtitle: 'APAC · USD bn · 2024–2031F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',                     pages: 'P 04', locked: false },
      { num: '02', name: '構造的需要の引き',                           pages: 'P 06', locked: true  },
      { num: '03', name: '市場規模：グローバルからシンガポールへ',     pages: 'P 07', locked: true  },
      { num: '04', name: '需要ドライバー',                             pages: 'P 08', locked: true  },
      { num: '05', name: '運用会社の全体像',                           pages: 'P 09', locked: true  },
      { num: '06', name: '戦略・セグメント構成',                       pages: 'P 10', locked: true  },
      { num: '07', name: '基盤プラットフォームの全体像',               pages: 'P 11', locked: true  },
      { num: '08', name: '政策・アクセス制度',                         pages: 'P 12', locked: true  },
      { num: '09', name: '規制・ファンド構造',                         pages: 'P 13', locked: true  },
      { num: '10', name: 'AUM成長動態',                                pages: 'P 14', locked: true  },
      { num: '11', name: 'プライベートクレジット業務におけるAI',       pages: 'P 15', locked: true  },
      { num: '12', name: 'リスク・予測・方法論',                       pages: 'P 16', locked: true  },
    ],
  },

  ko: {
    title: '싱가포르 민간 신용 2026',
    eyebrow: '싱가포르 · 민간 신용 · 시장 분석',
    preview: {
      lede: 'USD 590억에서 2027년 USD 920억으로 성장하는 APAC 운용자산(AUM), SGD 10억 규모의 국가 성장 펀드, 약 USD 100억 규모로 조성된 Temasek 운용사, 협의 중인 소매 접근성 체계 — 싱가포르는 허브 인프라를 실질적인 AUM 점유로 전환하고 있습니다. 2031년까지의 AUM 성장 동향과 전략적 전망.',
      paragraphs: [
        '싱가포르는 법적 예측 가능성, 가변자본회사(VCC) 체제, 폭넓은 유통망을 통해 APAC 민간 신용의 앵커 역할을 수행하며 오리지네이션·구조화·구조조정을 대규모로 지원합니다[Chambers SG 2026]. 국가 자본도 이 역할 뒤에 진입했습니다: Apollo에 위탁된 SGD 10억 민간 신용 성장 펀드[MTI 2025]와 약 USD 100억 규모로 조성된 Temasek 운용사[Temasek 2024]. 허브 지위가 실질적인 자본 비중으로 전환되고 있습니다.',
        '은행은 2023년 말 기준 APAC 신용의 80% 이상을 보유[AIMA 2025] — 미국·유럽보다 훨씬 높아, 다년간의 수렴 거래 배경이 됩니다. Basel 규제 주도의 축소는 은행의 투자 범위를 투자등급 및 담보 우량 기업으로 좁혔고, 이는 USD 2.5 trn에 달하는 APAC 중소기업 금융 갭[IFC 2025] 속에서 은행이 떠난 현금 흐름 대출 영역을 비은행 자본이 채우는 구조입니다.',
      ],
      chart: {
        title: 'APAC 민간 신용 AUM 추이',
        subtitle: 'APAC · USD bn · 2024–2031F',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',                       pages: 'P 04', locked: false },
      { num: '02', name: '구조적 수요 견인',                  pages: 'P 06', locked: true  },
      { num: '03', name: '시장 규모: 글로벌에서 싱가포르까지', pages: 'P 07', locked: true  },
      { num: '04', name: '수요 동인',                         pages: 'P 08', locked: true  },
      { num: '05', name: '운용사 지형',                       pages: 'P 09', locked: true  },
      { num: '06', name: '전략 및 세그먼트 구성',             pages: 'P 10', locked: true  },
      { num: '07', name: '운용사 현황',                       pages: 'P 11', locked: true  },
      { num: '08', name: '정책 및 접근성 체계',               pages: 'P 12', locked: true  },
      { num: '09', name: '규제 및 펀드 구조',                 pages: 'P 13', locked: true  },
      { num: '10', name: 'AUM 성장 동향',                     pages: 'P 14', locked: true  },
      { num: '11', name: '민간 신용 운용의 AI 활용',          pages: 'P 15', locked: true  },
      { num: '12', name: '리스크, 전망 및 방법론',            pages: 'P 16', locked: true  },
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
