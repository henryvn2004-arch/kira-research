// Fallback publisher for 2027-jp-cybersecurity when the Supabase MCP transport
// is unavailable (net::ERR_FAILED). Same two upserts as
// _build_2027-jp-cybersecurity_sql.mjs (living_reports + 3 report_translations)
// but via PostgREST using SUPABASE_URL + SUPABASE_SERVICE_KEY from env.
//
// Run: node skills/kira-research-report/scripts/_publish_2027-jp-cybersecurity_rest.mjs
// Prints the resolved report_id on success.

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
if (!URL || !KEY) { console.error('MISSING env SUPABASE_URL/SUPABASE_SERVICE_KEY'); process.exit(1); }

const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'Content-Type': 'application/json',
};

const SLUG = 'cybersecurity-japan-2027';
const NOW = new Date().toISOString();

const chartBars = [
  { pct: 64,  label: 'FY2024',  value: 1.80 },
  { pct: 79,  label: 'FY2026F', value: 2.24 },
  { pct: 100, label: 'FY2028F', value: 2.83 },
];

const META = {
  en: {
    title: 'Japan cybersecurity 2027: corporate governance code reform & the CISO hiring shift',
    eyebrow: 'JAPAN · CYBERSECURITY · MARKET ANALYSIS',
    preview: {
      lede: "Japan's cybersecurity market enters 2027 on a governance-driven demand surge: the FSA's 2026 Corporate Governance Code revision strengthens board responsibility for cyber risk [FSA 2026], the Active Cyber Defense Act imposes incident-reporting on 15 critical-infrastructure sectors by November 2026 [ACDA 2025], and METI targets tripling industry sales toward JPY 3 tn within a decade [METI 2025]. The information security market scales from JPY 1.80 tn (FY2024) toward a forecast JPY 2.83 tn by FY2028.",
      paragraphs: [
        "This report covers the macro and regulatory context, market sizing and segment CAGR, the 2025–2026 threat landscape (ransomware, supply-chain attacks, nation-state actors), the Corporate Governance Code reform and securities-report disclosure economics, the CISO hiring and compensation shift, the 110,000-person talent deficit, the competitive landscape and MSSP segment, zero-trust and cloud adoption, OT/ICS critical-infrastructure exposure, and a forecast to FY2028 with five strategic action vectors.",
        "Governance turns the CISO into a board concern. CISO set-up among large Japanese enterprises has reached 73.3%, but only 38.7% use a formal CISO title [IPA 2025]. The reform pushes firms to formalise the role, raise its reporting line, and disclose oversight in the annual securities report — re-pricing senior CISO compensation to JPY 14–25 mn [Robert Half 2025] against a domestic talent pool that cannot yet supply board-fluent security leadership.",
      ],
      chart: {
        title: 'JP information security market (JPY tn)',
        subtitle: 'FY2024 actual · FY2026 forecast · FY2028 forecast',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'Executive summary',                 pages: 'PG 03', locked: false },
      { num: '02', name: 'Market sizing and growth',          pages: 'PG 04', locked: true  },
      { num: '03', name: 'Demand drivers and segment structure', pages: 'PG 05', locked: true },
      { num: '04', name: 'Threat landscape 2025–2026',         pages: 'PG 06', locked: true  },
      { num: '05', name: 'Regulatory and policy timeline',     pages: 'PG 07', locked: true  },
      { num: '06', name: 'Corporate Governance Code reform',   pages: 'PG 08', locked: true  },
      { num: '07', name: 'The CISO hiring shift',              pages: 'PG 09', locked: true  },
      { num: '08', name: 'Talent deficit and workforce',       pages: 'PG 10', locked: true  },
      { num: '09', name: 'Competitive landscape',              pages: 'PG 11', locked: true  },
      { num: '10', name: 'Zero trust and cloud security',      pages: 'PG 12', locked: true  },
      { num: '11', name: 'OT/ICS and critical infrastructure', pages: 'PG 13', locked: true  },
      { num: '12', name: 'Forecast and strategic implications', pages: 'PG 14', locked: true },
    ],
  },
  ja: {
    title: '日本サイバーセキュリティ 2027：コーポレートガバナンスコード改訂とCISO採用の構造転換',
    eyebrow: '日本 · サイバーセキュリティ · マーケット分析',
    preview: {
      lede: '日本のサイバーセキュリティ市場は2027年、ガバナンス主導の需要拡大局面を迎えます。FSAの2026年コーポレートガバナンスコード改訂が取締役会のサイバーリスク責任を強化し[FSA 2026]、能動的サイバー防御法は2026年11月までに15の重要インフラ業種にインシデント報告を義務付け[ACDA 2025]、METIは10年以内に産業売上をJPY 3兆超へ3倍化する目標を掲げます[METI 2025]。情報セキュリティ市場はFY2024のJPY 1.80兆からFY2028予測のJPY 2.83兆へ拡大します。',
      paragraphs: [
        '本レポートはマクロ・規制環境、市場規模とセグメントCAGR、2025–2026年の脅威動向（ランサムウェア・サプライチェーン攻撃・国家主体）、コーポレートガバナンスコード改訂と有価証券報告書の開示経済性、CISO採用と報酬の転換、11万人の人材不足、競争環境とMSSPセグメント、ゼロトラストとクラウド導入、OT/ICS重要インフラのエクスポージャー、そしてFY2028までの予測と5つの戦略的アクションベクトルを扱います。',
        'ガバナンス改訂はCISOを取締役会の関心事に変えます。日本の大手企業におけるCISO設置率は73.3%に達する一方、正式なCISO肩書を用いるのは38.7%に留まります[IPA 2025]。改訂は役職のフォーマル化・報告ラインの格上げ・有価証券報告書での監督開示を促し、シニアCISOの報酬をJPY 1,400万〜2,500万へ再評価します[Robert Half 2025]。取締役会対応能力を持つセキュリティリーダーは国内人材プールでは供給不足です。',
      ],
      chart: {
        title: '情報セキュリティ市場規模（JPY 兆）',
        subtitle: 'FY2024実績 · FY2026予測 · FY2028予測',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: 'エグゼクティブサマリー',              pages: 'P 03', locked: false },
      { num: '02', name: '市場規模と成長',                      pages: 'P 04', locked: true  },
      { num: '03', name: '需要要因とセグメント構造',            pages: 'P 05', locked: true  },
      { num: '04', name: '脅威動向 2025–2026',                  pages: 'P 06', locked: true  },
      { num: '05', name: '規制・政策タイムライン',              pages: 'P 07', locked: true  },
      { num: '06', name: 'コーポレートガバナンスコード改訂',    pages: 'P 08', locked: true  },
      { num: '07', name: 'CISOフォーマル化の転換',              pages: 'P 09', locked: true  },
      { num: '08', name: '人材不足と労働力',                    pages: 'P 10', locked: true  },
      { num: '09', name: '競争環境',                            pages: 'P 11', locked: true  },
      { num: '10', name: 'ゼロトラストとクラウドセキュリティ',  pages: 'P 12', locked: true  },
      { num: '11', name: 'OT/ICSと重要インフラ',                pages: 'P 13', locked: true  },
      { num: '12', name: '予測と戦略的示唆',                    pages: 'P 14', locked: true  },
    ],
  },
  ko: {
    title: '일본 사이버보안 2027: 기업지배구조 코드 개혁과 CISO 채용 구조 변화',
    eyebrow: '일본 · 사이버보안 · 시장 분석',
    preview: {
      lede: '일본 사이버보안 시장은 2027년 지배구조 주도의 수요 확대 국면에 진입합니다. FSA의 2026년 기업지배구조 코드 개정이 이사회의 사이버 리스크 책임을 강화하고[FSA 2026], 적극적 사이버방어법은 2026년 11월까지 15개 중요 인프라 부문에 사고 보고를 의무화하며[ACDA 2025], METI는 10년 내 산업 매출을 JPY 3조 이상으로 3배 확대를 목표로 합니다[METI 2025]. 정보보안 시장은 FY2024 JPY 1.80조에서 FY2028 예측 JPY 2.83조로 성장합니다.',
      paragraphs: [
        '본 보고서는 거시·규제 환경, 시장 규모와 세그먼트 CAGR, 2025–2026년 위협 지형(랜섬웨어·공급망 공격·국가 주체), 기업지배구조 코드 개혁과 유가증권보고서 공시 경제성, CISO 채용 및 보수 변화, 11만 명 인재 부족, 경쟁 지형과 MSSP 세그먼트, 제로 트러스트·클라우드 도입, OT/ICS 중요 인프라 노출, 그리고 FY2028까지의 전망과 다섯 가지 전략적 실행 방향을 다룹니다.',
        '지배구조 개혁은 CISO를 이사회 의제로 끌어올립니다. 대기업의 CISO 설치율은 73.3%에 달하지만 공식 CISO 직함 사용은 38.7%에 그칩니다[IPA 2025]. 개혁은 역할의 공식화, 보고 라인 격상, 유가증권보고서 감독 공시를 압박하며 시니어 CISO 보수를 JPY 1,400만~2,500만으로 재산정합니다[Robert Half 2025]. 이사회 친화적 보안 리더십은 국내 인재풀이 즉시 공급하기 어렵습니다.',
      ],
      chart: {
        title: '정보보안 시장 규모 (JPY 조)',
        subtitle: 'FY2024 실적 · FY2026 예측 · FY2028 예측',
        bars: chartBars,
      },
    },
    toc: [
      { num: '01', name: '경영진 요약',                         pages: 'P 03', locked: false },
      { num: '02', name: '시장 규모 및 성장',                   pages: 'P 04', locked: true  },
      { num: '03', name: '수요 동인 및 세그먼트 구조',          pages: 'P 05', locked: true  },
      { num: '04', name: '위협 지형 2025–2026',                 pages: 'P 06', locked: true  },
      { num: '05', name: '규제·정책 타임라인',                  pages: 'P 07', locked: true  },
      { num: '06', name: '기업지배구조 코드 개혁',              pages: 'P 08', locked: true  },
      { num: '07', name: 'CISO 채용 구조 변화',                 pages: 'P 09', locked: true  },
      { num: '08', name: '인재 부족 및 인력',                   pages: 'P 10', locked: true  },
      { num: '09', name: '경쟁 지형',                           pages: 'P 11', locked: true  },
      { num: '10', name: '제로 트러스트 및 클라우드 보안',      pages: 'P 12', locked: true  },
      { num: '11', name: 'OT/ICS 및 중요 인프라',               pages: 'P 13', locked: true  },
      { num: '12', name: '전망 및 전략적 시사점',               pages: 'P 14', locked: true  },
    ],
  },
};

async function main() {
  const lrBody = [{
    slug: SLUG, country: 'Japan', industry: 'Cybersecurity', year: 2027,
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
