// Use-case slider (all locales). Homepage: all cards. Other pages: set data-product="library|experts|survey" on the
// #home-stories element to show only that product's cards. Works with or without /js/research-i18n.js.
//
// The cards below are use-case SCENARIOS, not client quotes: no company names, logos or
// quotation marks. To show real testimonials, add an item of kind 'testimonial' (only with
// the client's written permission); the slider renders it with a quote, a name and a company.
// Keep either kind of item in this array, in the order shown.
//
//   { kind: 'testimonial', product: 'library' | 'experts' | 'survey' | 'combined',
//     quote:   { en: '...', ja: '...', ko: '...', zh: '...' },
//     name:    'Full name',
//     role:    { en: 'Director, ...', ja: '...', ko: '...', zh: '...' },
//     company: 'Company name',
//     country: { en: 'Japan', ja: '日本', ko: '일본', zh: '日本' } }
(function () {
  const root = document.getElementById('home-stories');
  if (!root) return;
  const R = window.kiraR || {};
  const esc = R.esc || (s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'));
  const first = location.pathname.split('/')[1];
  const locale = R.locale || (['en', 'ja', 'ko', 'zh'].includes(first) ? first : 'en');
  const prod = root.dataset.product || '';
  const HEAD = {
  "eyebrow": {
    "en": "USE CASES",
    "ja": "活用シーン",
    "ko": "활용 사례",
    "zh": "使用场景"
  },
  "title": {
    "en": "How teams use KIRA Research",
    "ja": "チームはKIRA Researchをこう使う",
    "ko": "팀은 KIRA Research를 이렇게 씁니다",
    "zh": "团队如何使用KIRA Research"
  },
  "sub": {
    "en": "Reports, expert conversations and customer surveys, applied to the decisions that market-development, business-development and strategy teams face.",
    "ja": "レポート、専門家との対話、顧客調査を、市場開発・事業開発・戦略の各チームが直面する意思決定に役立てる場面です。",
    "ko": "보고서, 전문가 대화, 고객 설문을 시장개발·사업개발·전략 팀이 마주하는 의사결정에 적용하는 장면입니다.",
    "zh": "把研究报告、专家交流与客户调研，用于市场开拓、业务拓展与战略团队面对的决策。"
  },
  "prev": {
    "en": "Previous",
    "ja": "前へ",
    "ko": "이전",
    "zh": "上一张"
  },
  "next": {
    "en": "Next",
    "ja": "次へ",
    "ko": "다음",
    "zh": "下一张"
  }
};
  const PRODUCT = {
  "library": {
    "en": "Research reports",
    "ja": "リサーチレポート",
    "ko": "리서치 보고서",
    "zh": "研究报告"
  },
  "experts": {
    "en": "Kira Experts",
    "ja": "Kira Experts",
    "ko": "Kira Experts",
    "zh": "Kira Experts"
  },
  "survey": {
    "en": "Kira Survey",
    "ja": "Kira Survey",
    "ko": "Kira Survey",
    "zh": "Kira Survey"
  },
  "combined": {
    "en": "Reports · Experts · Survey",
    "ja": "レポート・Experts・Survey",
    "ko": "보고서·Experts·Survey",
    "zh": "报告·Experts·Survey"
  }
};
  const ITEMS = [
  {
    "kind": "scenario",
    "product": "library",
    "role": {
      "en": "Director, Market Development",
      "ja": "マーケット開発ディレクター",
      "ko": "시장개발 디렉터",
      "zh": "市场开拓总监"
    },
    "org": {
      "en": "Japanese manufacturer",
      "ja": "日本のメーカー",
      "ko": "일본 제조업체",
      "zh": "日本制造企业"
    },
    "title": {
      "en": "Choosing which market comes first",
      "ja": "最初に進出する市場を選ぶ",
      "ko": "가장 먼저 진출할 시장 고르기",
      "zh": "选择优先进入哪个市场"
    },
    "body": {
      "en": "Reads reports on several ASEAN markets side by side, with the same structure and sourcing, to shortlist where to enter first before committing travel and budget.",
      "ja": "複数のASEAN市場のレポートを、同じ構成・同じ出典基準で並べて読み、渡航や予算を投じる前に、最初に参入する市場を絞り込みます。",
      "ko": "여러 ASEAN 시장의 보고서를 같은 구성과 같은 출처 기준으로 나란히 읽고, 출장과 예산을 투입하기 전에 가장 먼저 진출할 시장을 추립니다.",
      "zh": "把多个东南亚市场的报告按相同结构与来源标准并排阅读，在投入差旅与预算之前，先筛出优先进入的市场。"
    }
  },
  {
    "kind": "scenario",
    "product": "experts",
    "role": {
      "en": "Director, Business Development",
      "ja": "事業開発ディレクター",
      "ko": "사업개발 디렉터",
      "zh": "业务拓展总监"
    },
    "org": {
      "en": "Korean consumer brand",
      "ja": "韓国の消費財ブランド",
      "ko": "한국 소비재 브랜드",
      "zh": "韩国消费品牌"
    },
    "title": {
      "en": "Checking a distributor before signing",
      "ja": "契約前に販売代理店を確かめる",
      "ko": "계약 전에 유통업체 확인하기",
      "zh": "签约前核实分销商"
    },
    "body": {
      "en": "Speaks with people who have worked with distributors in the market to learn how such relationships usually run, then goes into the negotiation better informed.",
      "ja": "現地で販売代理店と仕事をしてきた人に話を聞き、そうした関係が通常どう運ぶのかを把握したうえで、交渉に臨みます。",
      "ko": "현지에서 유통업체와 일해 본 사람에게 그런 관계가 보통 어떻게 운영되는지 듣고, 더 많은 정보를 갖춘 채 협상에 임합니다.",
      "zh": "与曾在当地与分销商合作过的人交流，了解这类合作通常如何运作，带着更充分的信息进入谈判。"
    }
  },
  {
    "kind": "scenario",
    "product": "survey",
    "role": {
      "en": "Director, Strategy",
      "ja": "戦略ディレクター",
      "ko": "전략 디렉터",
      "zh": "战略总监"
    },
    "org": {
      "en": "European food company",
      "ja": "欧州の食品企業",
      "ko": "유럽 식품 기업",
      "zh": "欧洲食品企业"
    },
    "title": {
      "en": "Finding out why shoppers would switch",
      "ja": "買い手が乗り換える理由を探る",
      "ko": "구매자가 바꾸는 이유 알아내기",
      "zh": "弄清购买者为何会转换品牌"
    },
    "body": {
      "en": "Commissions a customer survey in the local language to learn what drives choice, instead of assuming the home market's habits carry over.",
      "ja": "本国市場の習慣がそのまま通用すると決めつけず、現地の言語で顧客調査を行い、選択を左右する要因を明らかにします。",
      "ko": "본국 시장의 습관이 그대로 통할 것이라 가정하지 않고, 현지 언어로 고객 설문을 진행해 선택을 좌우하는 요인을 파악합니다.",
      "zh": "不想当然地认为母国市场的习惯可以照搬，而是用当地语言开展客户问卷，找出影响选择的因素。"
    }
  },
  {
    "kind": "scenario",
    "product": "library",
    "role": {
      "en": "Director, Overseas Expansion",
      "ja": "海外展開ディレクター",
      "ko": "해외진출 디렉터",
      "zh": "海外拓展总监"
    },
    "org": {
      "en": "Chinese electronics maker",
      "ja": "中国の電子機器メーカー",
      "ko": "중국 전자기기 제조업체",
      "zh": "中国电子产品制造商"
    },
    "title": {
      "en": "Briefing the board on a new market",
      "ja": "新市場について取締役会に説明する",
      "ko": "새 시장에 대해 이사회에 보고하기",
      "zh": "向董事会汇报新市场"
    },
    "body": {
      "en": "Builds the board paper on the report's sourced figures and market map, so every number can be traced back to where it came from.",
      "ja": "出典付きの数値と市場マップを取締役会資料の土台にし、すべての数字を根拠までたどれるようにします。",
      "ko": "출처가 명시된 수치와 시장 지도를 이사회 자료의 토대로 삼아, 모든 숫자를 근거까지 추적할 수 있게 합니다.",
      "zh": "以附有来源的数据和市场图谱作为董事会材料的基础，每一个数字都能追溯到出处。"
    }
  },
  {
    "kind": "scenario",
    "product": "experts",
    "role": {
      "en": "Director, Strategy",
      "ja": "戦略ディレクター",
      "ko": "전략 디렉터",
      "zh": "战略总监"
    },
    "org": {
      "en": "Australian agribusiness",
      "ja": "オーストラリアの農業関連企業",
      "ko": "호주 농업 관련 기업",
      "zh": "澳大利亚农业企业"
    },
    "title": {
      "en": "Seeing how regulation works in practice",
      "ja": "規制の運用の実態を知る",
      "ko": "규제가 실제로 어떻게 운용되는지 보기",
      "zh": "了解监管在实践中如何执行"
    },
    "body": {
      "en": "Talks to a practitioner about how licences and approvals are actually applied, beyond the text of the rules.",
      "ja": "条文の文言を超えて、許認可が実際にどう運用されているかを、実務家から聞きます。",
      "ko": "규정 문언을 넘어 인허가가 실제로 어떻게 적용되는지 실무자에게 직접 듣습니다.",
      "zh": "向从业者了解许可与审批在条文之外实际如何执行。"
    }
  },
  {
    "kind": "scenario",
    "product": "survey",
    "role": {
      "en": "Director, Market Development",
      "ja": "マーケット開発ディレクター",
      "ko": "시장개발 디렉터",
      "zh": "市场开拓总监"
    },
    "org": {
      "en": "Taiwanese component supplier",
      "ja": "台湾の部品サプライヤー",
      "ko": "대만 부품 공급업체",
      "zh": "台湾零部件供应商"
    },
    "title": {
      "en": "Learning what local buyers value",
      "ja": "現地の購買担当者が重視する点を知る",
      "ko": "현지 구매자가 중시하는 점 파악하기",
      "zh": "了解本地买家看重什么"
    },
    "body": {
      "en": "Runs in-depth interviews with industrial buyers to understand how they select suppliers before adapting the product and offer.",
      "ja": "産業向けの購買担当者にデプスインタビューを行い、供給元の選び方を理解してから、製品と提案を現地向けに調整します。",
      "ko": "산업용 구매 담당자와 심층 인터뷰를 진행해 공급업체 선정 방식을 이해한 뒤, 제품과 제안을 현지에 맞게 조정합니다.",
      "zh": "对工业采购方开展深度访谈，了解他们如何选择供应商，再据此调整产品与方案。"
    }
  },
  {
    "kind": "scenario",
    "product": "library",
    "role": {
      "en": "Director, Strategy & Market Intelligence",
      "ja": "戦略・市場情報ディレクター",
      "ko": "전략·시장정보 디렉터",
      "zh": "战略与市场情报总监"
    },
    "org": {
      "en": "German machinery group",
      "ja": "ドイツの機械メーカーグループ",
      "ko": "독일 기계 그룹",
      "zh": "德国机械集团"
    },
    "title": {
      "en": "Keeping a regional watch-list current",
      "ja": "地域のウォッチリストを最新に保つ",
      "ko": "지역 관심 목록을 최신으로 유지하기",
      "zh": "保持区域关注清单的更新"
    },
    "body": {
      "en": "Follows new reports and short insights on target sectors across markets, so the regional plan keeps pace with what is changing.",
      "ja": "対象業界について各市場の新しいレポートや短いインサイトを追い、地域計画が変化に遅れないようにします。",
      "ko": "대상 산업에 대한 각 시장의 새 보고서와 짧은 인사이트를 따라가며, 지역 계획이 변화를 놓치지 않도록 합니다.",
      "zh": "持续关注目标行业在各市场的新报告与短篇洞察，让区域计划跟上变化。"
    }
  },
  {
    "kind": "scenario",
    "product": "experts",
    "role": {
      "en": "Director, Business Development",
      "ja": "事業開発ディレクター",
      "ko": "사업개발 디렉터",
      "zh": "业务拓展总监"
    },
    "org": {
      "en": "Japanese trading company",
      "ja": "日本の商社",
      "ko": "일본 종합상사",
      "zh": "日本贸易公司"
    },
    "title": {
      "en": "Sounding out a partnership idea",
      "ja": "提携のアイデアを打診する",
      "ko": "제휴 아이디어 타진하기",
      "zh": "试探合作构想"
    },
    "body": {
      "en": "Holds a conversation with an experienced operator to pressure-test a joint-venture idea before approaching the partner.",
      "ja": "実務経験の豊富な事業者と対話し、パートナー候補に持ちかける前に、合弁のアイデアを検証します。",
      "ko": "경험이 풍부한 사업자와 대화하며, 파트너에게 접근하기 전에 합작 아이디어를 검증합니다.",
      "zh": "与经验丰富的经营者交流，在接触合作方之前先检验合资构想是否站得住脚。"
    }
  },
  {
    "kind": "scenario",
    "product": "survey",
    "role": {
      "en": "Director, Market Development",
      "ja": "マーケット開発ディレクター",
      "ko": "시장개발 디렉터",
      "zh": "市场开拓总监"
    },
    "org": {
      "en": "Korean software company",
      "ja": "韓国のソフトウェア企業",
      "ko": "한국 소프트웨어 기업",
      "zh": "韩国软件企业"
    },
    "title": {
      "en": "Testing a product concept with local customers",
      "ja": "製品コンセプトを現地の顧客で試す",
      "ko": "제품 콘셉트를 현지 고객에게 시험하기",
      "zh": "用本地客户检验产品概念"
    },
    "body": {
      "en": "Interviews prospective customers in the market to see whether the concept fits how they work and buy.",
      "ja": "現地の見込み客にインタビューし、そのコンセプトが彼らの仕事や購買のしかたに合うかを確かめます。",
      "ko": "시장의 잠재 고객을 인터뷰해 그 콘셉트가 그들의 업무와 구매 방식에 맞는지 확인합니다.",
      "zh": "访谈当地潜在客户，看这一概念是否契合他们的工作与购买方式。"
    }
  },
  {
    "kind": "scenario",
    "product": "library",
    "role": {
      "en": "Director, Strategy",
      "ja": "戦略ディレクター",
      "ko": "전략 디렉터",
      "zh": "战略总监"
    },
    "org": {
      "en": "Regional HQ of a European chemicals group",
      "ja": "欧州化学グループの地域統括拠点",
      "ko": "유럽 화학 그룹의 지역 본부",
      "zh": "欧洲化工集团的区域总部"
    },
    "title": {
      "en": "Comparing sector economics across markets",
      "ja": "市場間で業界の収益構造を比べる",
      "ko": "시장 간 산업 수익 구조 비교하기",
      "zh": "跨市场比较行业经济性"
    },
    "body": {
      "en": "Reads sector reports for several markets to compare structure, competitors and entry conditions on a common footing.",
      "ja": "複数市場の業界レポートを読み、構造、競合、参入条件を同じ基準で比較します。",
      "ko": "여러 시장의 산업 보고서를 읽고 구조, 경쟁사, 진입 조건을 같은 기준으로 비교합니다.",
      "zh": "阅读多个市场的行业报告，在同一基础上比较结构、竞争对手与进入条件。"
    }
  },
  {
    "kind": "scenario",
    "product": "experts",
    "role": {
      "en": "Director, International Business",
      "ja": "国際事業ディレクター",
      "ko": "국제사업 디렉터",
      "zh": "国际业务总监"
    },
    "org": {
      "en": "Chinese consumer-goods company",
      "ja": "中国の消費財メーカー",
      "ko": "중국 소비재 기업",
      "zh": "中国消费品企业"
    },
    "title": {
      "en": "Learning how local competitors respond",
      "ja": "現地競合の反応を知る",
      "ko": "현지 경쟁사의 대응 파악하기",
      "zh": "了解本地竞争对手如何应对"
    },
    "body": {
      "en": "Speaks with people who have watched established players react to newcomers on price, channels and talent.",
      "ja": "既存事業者が新規参入者に対して、価格、チャネル、人材の面でどう動くかを見てきた人に話を聞きます。",
      "ko": "기존 사업자가 신규 진입자에 가격, 채널, 인재 면에서 어떻게 대응하는지 지켜본 사람과 이야기합니다.",
      "zh": "与亲眼见过现有企业在价格、渠道和人才方面应对新进入者的人交流。"
    }
  },
  {
    "kind": "scenario",
    "product": "survey",
    "role": {
      "en": "Director, Business Development",
      "ja": "事業開発ディレクター",
      "ko": "사업개발 디렉터",
      "zh": "业务拓展总监"
    },
    "org": {
      "en": "Japanese retailer",
      "ja": "日本の小売企業",
      "ko": "일본 유통 기업",
      "zh": "日本零售企业"
    },
    "title": {
      "en": "Understanding the purchase journey",
      "ja": "購買プロセスを理解する",
      "ko": "구매 과정 이해하기",
      "zh": "理解购买路径"
    },
    "body": {
      "en": "Surveys shoppers on how they find, compare and buy, so channel choices rest on local evidence.",
      "ja": "買い手がどう探し、比較し、購入するかを調査し、チャネルの選択を現地の根拠に基づかせます。",
      "ko": "구매자가 어떻게 찾고, 비교하고, 구매하는지 조사하여 채널 선택이 현지 근거에 기반하도록 합니다.",
      "zh": "调研买家如何搜寻、比较与购买，使渠道选择有本地证据作支撑。"
    }
  },
  {
    "kind": "scenario",
    "product": "library",
    "role": {
      "en": "Director, Corporate Strategy",
      "ja": "経営戦略ディレクター",
      "ko": "기업전략 디렉터",
      "zh": "公司战略总监"
    },
    "org": {
      "en": "Australian financial-services firm",
      "ja": "オーストラリアの金融サービス会社",
      "ko": "호주 금융 서비스 기업",
      "zh": "澳大利亚金融服务公司"
    },
    "title": {
      "en": "Screening Asia for the next market",
      "ja": "次の市場をアジアから絞り込む",
      "ko": "다음 시장을 아시아에서 추리기",
      "zh": "在亚洲范围内筛选下一个市场"
    },
    "body": {
      "en": "Uses market and sector reports as a first screen before deciding where deeper work is worth commissioning.",
      "ja": "市場・業界レポートを最初のスクリーニングに使い、どこに追加調査を依頼する価値があるかを判断します。",
      "ko": "시장·산업 보고서를 1차 선별에 활용해, 어디에 추가 조사를 의뢰할 가치가 있는지 판단합니다.",
      "zh": "把市场与行业报告作为初步筛选，再决定哪些方向值得委托更深入的研究。"
    }
  },
  {
    "kind": "scenario",
    "product": "combined",
    "role": {
      "en": "Director, Strategic Planning",
      "ja": "戦略企画ディレクター",
      "ko": "전략기획 디렉터",
      "zh": "战略规划总监"
    },
    "org": {
      "en": "Korean conglomerate unit",
      "ja": "韓国の財閥系事業会社",
      "ko": "한국 대기업 그룹 계열사",
      "zh": "韩国大型集团旗下公司"
    },
    "title": {
      "en": "Reading the market, then asking the customer",
      "ja": "市場を読み、次に顧客に聞く",
      "ko": "시장을 읽고, 다음에 고객에게 묻기",
      "zh": "先读懂市场，再请教客户"
    },
    "body": {
      "en": "Starts with a report to frame the market, follows with Kira Experts for operating realities, and closes the remaining gaps with a customer survey.",
      "ja": "まずレポートで市場の全体像をつかみ、Kira Expertsで現場の実情を確かめ、残る空白を顧客調査で埋めます。",
      "ko": "먼저 보고서로 시장의 틀을 잡고, Kira Experts로 현장의 실상을 확인한 뒤, 남은 공백을 고객 설문으로 메웁니다.",
      "zh": "先用报告搭起市场框架，再通过Kira Experts了解运营实况，最后用客户问卷补上剩余的空白。"
    }
  },
  {
    "kind": "scenario",
    "product": "experts",
    "role": {
      "en": "Director, Business Development",
      "ja": "事業開発ディレクター",
      "ko": "사업개발 디렉터",
      "zh": "业务拓展总监"
    },
    "org": {
      "en": "European automotive supplier",
      "ja": "欧州の自動車部品メーカー",
      "ko": "유럽 자동차 부품 업체",
      "zh": "欧洲汽车零部件供应商"
    },
    "title": {
      "en": "Preparing for a first visit",
      "ja": "初回の訪問に備える",
      "ko": "첫 방문 준비하기",
      "zh": "为首次拜访做准备"
    },
    "body": {
      "en": "Speaks with an adviser who knows the local industry before the first trip, so the meetings start from the right questions.",
      "ja": "初めての出張の前に、現地の業界を知るアドバイザーと話し、最初の面談から適切な問いで始められるようにします。",
      "ko": "첫 출장 전에 현지 산업을 아는 자문가와 이야기해, 첫 미팅부터 올바른 질문으로 시작합니다.",
      "zh": "首次出差前先与了解当地行业的顾问交流，让第一次会面就从正确的问题开始。"
    }
  }
];
  const PAGE_HEAD = {
    "library": {
      "title": {
        "en": "How teams use our reports",
        "ja": "チームはレポートをこう使う",
        "ko": "팀은 보고서를 이렇게 씁니다",
        "zh": "团队如何使用我们的报告"
      },
      "sub": {
        "en": "Where the library fits in market-development, business-development and strategy work.",
        "ja": "市場開発・事業開発・戦略の業務で、ライブラリが役立つ場面です。",
        "ko": "시장개발·사업개발·전략 업무에서 라이브러리가 쓰이는 장면입니다.",
        "zh": "资料库在市场开拓、业务拓展与战略工作中的应用场景。"
      }
    },
    "experts": {
      "title": {
        "en": "How teams use Kira Experts",
        "ja": "チームはKira Expertsをこう使う",
        "ko": "팀은 Kira Experts를 이렇게 씁니다",
        "zh": "团队如何使用Kira Experts"
      },
      "sub": {
        "en": "Conversations with people who know the market, applied to the questions teams are weighing.",
        "ja": "市場を知る人との対話を、チームが検討中の問いに生かす場面です。",
        "ko": "시장을 아는 사람과의 대화를 팀이 고민하는 질문에 적용하는 장면입니다.",
        "zh": "与熟悉市场的人交流，用于团队正在权衡的问题。"
      }
    },
    "survey": {
      "title": {
        "en": "How teams use Kira Survey",
        "ja": "チームはKira Surveyをこう使う",
        "ko": "팀은 Kira Survey를 이렇게 씁니다",
        "zh": "团队如何使用Kira Survey"
      },
      "sub": {
        "en": "Customer surveys and interviews in the local market, applied to the decisions teams are making.",
        "ja": "現地市場での顧客調査とインタビューを、チームの意思決定に生かす場面です。",
        "ko": "현지 시장의 고객 설문과 인터뷰를 팀의 의사결정에 적용하는 장면입니다.",
        "zh": "在本地市场开展的客户调研与访谈，用于团队的决策。"
      }
    }
  };
  if (PAGE_HEAD[prod]) Object.assign(HEAD, PAGE_HEAD[prod]);
  const LIST = prod ? ITEMS.filter(i => i.product === prod) : ITEMS;
  const pick = o => (o && (o[locale] || o.en)) || '';
  const ICON = {
    library: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    experts: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
    survey: '<path d="M9 4h6l1 2h3v14H5V6h3z"/><path d="M8.5 12.5l1.5 1.5 3-3M8.5 17h7"/>',
    combined: '<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>'
  };
  const svg = p => '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const QUOTE = '<svg class="st-q" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M10 6C6.7 7.3 4 10 4 14.5V19h6v-6H7c.1-2.2 1.3-3.6 3-4.5zm10 0c-3.3 1.3-6 4-6 8.5V19h6v-6h-3c.1-2.2 1.3-3.6 3-4.5z"/></svg>';
  const chevron = d => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';

  function card(it) {
    const chip = '<span class="st-chip">' + svg(ICON[it.product] || ICON.library) + esc(pick(PRODUCT[it.product])) + '</span>';
    if (it.kind === 'testimonial') {
      return '<article class="st-card st-real">' + chip + QUOTE +
        '<p class="st-quote">' + esc(pick(it.quote)) + '</p>' +
        '<footer><b>' + esc(it.name) + '</b><span>' + esc(pick(it.role)) + '</span><span>' + esc(it.company) + (it.country ? ' · ' + esc(pick(it.country)) : '') + '</span></footer></article>';
    }
    return '<article class="st-card">' + chip +
      '<h3>' + esc(pick(it.title)) + '</h3><p>' + esc(pick(it.body)) + '</p>' +
      '<footer><b>' + esc(pick(it.role)) + '</b><span>' + esc(pick(it.org)) + '</span></footer></article>';
  }

  root.classList.add('st-sec');
  if (prod) root.classList.add('st-solo');
  root.innerHTML =
    '<div class="st-head"><div><div class="st-eyebrow">' + esc(pick(HEAD.eyebrow)) + '</div><h2>' + esc(pick(HEAD.title)) + '</h2><p>' + esc(pick(HEAD.sub)) + '</p></div>' +
      '<div class="st-nav"><button type="button" class="st-prev" aria-label="' + esc(pick(HEAD.prev)) + '">' + chevron('M15 6l-6 6 6 6') + '</button>' +
      '<button type="button" class="st-next" aria-label="' + esc(pick(HEAD.next)) + '">' + chevron('M9 6l6 6-6 6') + '</button></div></div>' +
    '<div class="st-track" tabindex="0" role="region" aria-label="' + esc(pick(HEAD.title)) + '">' + LIST.map(card).join('') + '</div>' +
    '<div class="st-dots" aria-hidden="true"></div>';

  const track = root.querySelector('.st-track'), prev = root.querySelector('.st-prev'), next = root.querySelector('.st-next'), dots = root.querySelector('.st-dots');
  const pages = () => Math.max(1, Math.ceil((track.scrollWidth - 4) / track.clientWidth));
  const page = () => Math.round(track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth) * (pages() - 1));
  function sync() {
    const n = pages();
    root.classList.toggle('st-static', n < 2);
    if (dots.children.length !== n) dots.innerHTML = Array.from({ length: n }, (_, i) => '<i data-i="' + i + '"></i>').join('');
    const p = page();
    Array.from(dots.children).forEach((d, i) => d.classList.toggle('on', i === p));
    prev.disabled = track.scrollLeft < 4;
    next.disabled = track.scrollLeft > track.scrollWidth - track.clientWidth - 4;
  }
  const by = dir => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' });
  prev.addEventListener('click', () => by(-1));
  next.addEventListener('click', () => by(1));
  track.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); by(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); by(-1); } });
  let raf = 0;
  track.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();
