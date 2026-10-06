// Use-case slider (all locales). Homepage: all cards. Other pages: set data-product="library|experts|survey" on the
// #home-stories element to show only that product's cards. Works with or without /js/research-i18n.js.
//
// The cards below are use-case SCENARIOS, not client quotes: no company names, logos or
// quotation marks. To show real testimonials, add an item of kind 'testimonial' (only with
// the client's written permission); the slider renders it with a quote, a name and a company.
// Keep either kind of item in this array, in the order shown. One list feeds every page: the homepage shows the
// items without `home: false`; the library, Kira Experts and Kira Survey pages show every item of their own product.
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
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "Japanese consumer-goods maker",
        "ja": "日本の消費財メーカー",
        "ko": "일본 소비재 제조업체",
        "zh": "日本消费品制造商"
      },
      "title": {
        "en": "Putting a sourced number in the budget paper",
        "ja": "予算資料に根拠のある数字を載せる",
        "ko": "예산 자료에 출처가 있는 수치 넣기",
        "zh": "在预算材料中放入有出处的数字"
      },
      "body": {
        "en": "Takes the market-size figure and its source from the executive summary, so the budget proposal rests on a number that can be checked.",
        "ja": "エグゼクティブサマリーから市場規模の数値と出典を取り、予算の提案が確認できる数字に基づくようにします。",
        "ko": "요약본에서 시장 규모 수치와 출처를 가져와, 예산 제안이 확인할 수 있는 숫자에 근거하도록 합니다.",
        "zh": "从执行摘要中取得市场规模数据及其来源，使预算提案建立在可核查的数字之上。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Overseas Expansion",
        "ja": "海外展開ディレクター",
        "ko": "해외진출 디렉터",
        "zh": "海外拓展总监"
      },
      "org": {
        "en": "Korean electronics maker",
        "ja": "韓国の電機メーカー",
        "ko": "한국 전자기기 제조업체",
        "zh": "韩国电子产品制造商"
      },
      "title": {
        "en": "Reading the rules before calling counsel",
        "ja": "弁護士に相談する前に規制を読む",
        "ko": "법률 자문 전에 규제 읽어 보기",
        "zh": "咨询律师之前先读监管部分"
      },
      "body": {
        "en": "Reads the regulation section to learn which approvals a product is likely to need, so the first conversation with local counsel starts from the right questions.",
        "ja": "規制の章を読み、製品にどの認可が必要になりそうかを把握しておくことで、現地の弁護士との最初の相談を適切な問いから始めます。",
        "ko": "규제 항목을 읽고 제품에 어떤 인허가가 필요할지 파악해 두어, 현지 변호사와의 첫 상담을 올바른 질문으로 시작합니다.",
        "zh": "先阅读监管章节，了解产品可能需要哪些审批，让与当地律师的第一次沟通从正确的问题开始。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Strategy",
        "ja": "戦略ディレクター",
        "ko": "전략 디렉터",
        "zh": "战略总监"
      },
      "org": {
        "en": "Swiss healthcare company",
        "ja": "スイスのヘルスケア企業",
        "ko": "스위스 헬스케어 기업",
        "zh": "瑞士医疗健康企业"
      },
      "title": {
        "en": "Seeing who competes in each market",
        "ja": "市場ごとに競合の顔ぶれを確かめる",
        "ko": "시장별로 경쟁사 구도 확인하기",
        "zh": "看清每个市场的竞争格局"
      },
      "body": {
        "en": "Reads the competitor sections for two markets in turn to see which names appear in both and where the field is thin.",
        "ja": "二つの市場の競合の章を続けて読み、両方に登場する企業はどこか、手薄な領域はどこかを確かめます。",
        "ko": "두 시장의 경쟁사 항목을 이어서 읽고, 양쪽에 모두 나오는 기업이 어디이고 경쟁이 약한 영역이 어디인지 확인합니다.",
        "zh": "依次阅读两个市场的竞争对手章节，看哪些企业在两地都出现，哪些领域竞争较弱。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, International Business",
        "ja": "国際事業ディレクター",
        "ko": "국제사업 디렉터",
        "zh": "国际业务总监"
      },
      "org": {
        "en": "Chinese e-commerce platform",
        "ja": "中国のEC事業者",
        "ko": "중국 이커머스 플랫폼 기업",
        "zh": "中国电商平台企业"
      },
      "title": {
        "en": "Looking for the next market for a proven product",
        "ja": "実績のある商品の次の市場を探す",
        "ko": "검증된 상품의 다음 시장 찾기",
        "zh": "为已验证的产品寻找下一个市场"
      },
      "body": {
        "en": "Compares demand and channel sections across several markets to decide where a product that already sells at home should go next.",
        "ja": "複数の市場の需要とチャネルの章を比べ、本国で売れている商品を次にどこへ展開するかを決めます。",
        "ko": "여러 시장의 수요와 유통 채널 항목을 비교해, 본국에서 이미 팔리는 상품을 다음에 어디로 보낼지 정합니다.",
        "zh": "对比多个市场的需求与渠道章节，决定在本国已畅销的产品下一步进入哪里。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "French retailer",
        "ja": "フランスの小売企業",
        "ko": "프랑스 소매 기업",
        "zh": "法国零售企业"
      },
      "title": {
        "en": "Checking a price assumption",
        "ja": "価格の前提を確かめる",
        "ko": "가격 가정 점검하기",
        "zh": "检验价格假设"
      },
      "body": {
        "en": "Sets the price and channel data in the report against internal assumptions before the pricing meeting.",
        "ja": "価格会議の前に、レポートの価格・チャネルのデータを社内の前提と突き合わせます。",
        "ko": "가격 회의 전에 보고서의 가격·채널 데이터를 내부 가정과 맞춰 봅니다.",
        "zh": "在定价会议之前，把报告中的价格与渠道数据与内部假设逐一对照。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
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
        "zh": "日本综合商社"
      },
      "title": {
        "en": "Drawing up a longlist of partners",
        "ja": "提携先候補のロングリストをつくる",
        "ko": "제휴 후보 롱리스트 만들기",
        "zh": "拟定合作方长名单"
      },
      "body": {
        "en": "Uses the report's competitor and distribution sections to list the companies worth approaching before any outreach begins.",
        "ja": "レポートの競合と流通の章を使い、働きかけを始める前に、接触する価値のある企業を一覧にします。",
        "ko": "보고서의 경쟁사와 유통 항목을 활용해, 접촉을 시작하기 전에 접근할 만한 기업을 목록으로 정리합니다.",
        "zh": "利用报告中的竞争与分销章节，在正式接触之前列出值得联系的企业。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Strategic Planning",
        "ja": "戦略企画ディレクター",
        "ko": "전략기획 디렉터",
        "zh": "战略规划总监"
      },
      "org": {
        "en": "Dutch logistics group",
        "ja": "オランダの物流グループ",
        "ko": "네덜란드 물류 그룹",
        "zh": "荷兰物流集团"
      },
      "title": {
        "en": "Updating last year's plan",
        "ja": "昨年の計画を見直す",
        "ko": "작년 계획 갱신하기",
        "zh": "更新去年的规划"
      },
      "body": {
        "en": "Reads the refreshed edition and its refresh date to see what has changed in a market since the last planning cycle.",
        "ja": "更新版とその更新日を読み、前回の計画サイクル以降に市場で何が変わったかを確かめます。",
        "ko": "갱신판과 갱신 날짜를 읽고, 지난 계획 주기 이후 시장에서 무엇이 달라졌는지 확인합니다.",
        "zh": "阅读更新版及其更新日期，了解自上一轮规划以来市场发生了哪些变化。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Corporate Strategy",
        "ja": "経営戦略ディレクター",
        "ko": "기업전략 디렉터",
        "zh": "公司战略总监"
      },
      "org": {
        "en": "Korean food company",
        "ja": "韓国の食品企業",
        "ko": "한국 식품 기업",
        "zh": "韩国食品企业"
      },
      "title": {
        "en": "Reading in the team's own language",
        "ja": "チームの言語で読む",
        "ko": "팀의 언어로 읽기",
        "zh": "用团队自己的语言阅读"
      },
      "body": {
        "en": "Reads the Korean edition so the people who decide work from the same figures and sources as the people who did the research.",
        "ja": "韓国語版を読むことで、意思決定する人が、調査した人と同じ数値・同じ出典に基づいて判断できるようにします。",
        "ko": "한국어판을 읽어, 의사결정자가 조사한 사람과 같은 수치와 출처를 바탕으로 판단하도록 합니다.",
        "zh": "阅读韩文版，让决策的人与做研究的人依据同样的数据和来源。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "Taiwanese machinery maker",
        "ja": "台湾の機械メーカー",
        "ko": "대만 기계 제조업체",
        "zh": "台湾机械制造商"
      },
      "title": {
        "en": "Opening a file on a new country",
        "ja": "新しい国のファイルを始める",
        "ko": "새로운 나라의 파일 시작하기",
        "zh": "为新国家建立资料档案"
      },
      "body": {
        "en": "Starts with the free executive summary and buys the full report only for the markets that pass a first look.",
        "ja": "無料のエグゼクティブサマリーから読み始め、最初の確認を通った市場についてだけ全文レポートを購入します。",
        "ko": "무료 요약본부터 읽기 시작해, 1차 검토를 통과한 시장의 전체 보고서만 구매합니다.",
        "zh": "先读免费的执行摘要，只为通过初步筛选的市场购买完整报告。"
      }
    },
    {
      "kind": "scenario",
      "product": "library",
      "home": false,
      "role": {
        "en": "Director, Strategy & Market Intelligence",
        "ja": "戦略・市場情報ディレクター",
        "ko": "전략·시장정보 디렉터",
        "zh": "战略与市场情报总监"
      },
      "org": {
        "en": "British professional-services firm",
        "ja": "英国の専門サービス会社",
        "ko": "영국 전문 서비스 기업",
        "zh": "英国专业服务公司"
      },
      "title": {
        "en": "Giving a kick-off workshop a common reference",
        "ja": "キックオフ会議に共通の土台を用意する",
        "ko": "킥오프 워크숍에 공통 기준 마련하기",
        "zh": "为启动研讨会提供共同参照"
      },
      "body": {
        "en": "Circulates a sector report before a cross-functional workshop on a new market, so everyone starts from the same facts.",
        "ja": "新しい市場に関する部門横断のワークショップの前に業界レポートを配り、全員が同じ事実から議論を始められるようにします。",
        "ko": "새로운 시장에 대한 부서 간 워크숍 전에 산업 보고서를 배포해, 모두가 같은 사실에서 출발하도록 합니다.",
        "zh": "在围绕新市场的跨部门研讨会之前分发行业报告，让所有人从同样的事实出发。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
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
        "en": "Learning how local hiring works",
        "ja": "現地での採用の実情を知る",
        "ko": "현지 채용의 실상 알아보기",
        "zh": "了解当地招聘的实际情况"
      },
      "body": {
        "en": "Speaks with an executive who built a local team to learn how hiring, retention and pay compare with the home market.",
        "ja": "現地でチームを立ち上げた経営幹部に話を聞き、採用・定着・報酬が本国とどう違うのかを把握します。",
        "ko": "현지에서 팀을 꾸려 본 경영진에게 채용·정착·보상이 본국과 어떻게 다른지 듣습니다.",
        "zh": "与曾在当地组建团队的高管交流，了解招聘、留任与薪酬与本国有何不同。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "Korean cosmetics brand",
        "ja": "韓国の化粧品ブランド",
        "ko": "한국 화장품 브랜드",
        "zh": "韩国化妆品品牌"
      },
      "title": {
        "en": "Testing a pricing assumption",
        "ja": "価格の前提を検証する",
        "ko": "가격 가정 검증하기",
        "zh": "验证定价假设"
      },
      "body": {
        "en": "Asks an operator how comparable products are priced in the market and what discounts the channels expect.",
        "ja": "現地の事業者に、類似商品が市場でどう価格設定されているか、チャネルがどの程度の値引きを求めるかを尋ねます。",
        "ko": "현지 사업자에게 유사 제품이 시장에서 어떻게 가격이 매겨지는지, 유통 채널이 어느 정도 할인을 기대하는지 묻습니다.",
        "zh": "向当地从业者请教同类产品在市场上如何定价，以及渠道通常期待多大折扣。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Strategy",
        "ja": "戦略ディレクター",
        "ko": "전략 디렉터",
        "zh": "战略总监"
      },
      "org": {
        "en": "European medical-device company",
        "ja": "欧州の医療機器メーカー",
        "ko": "유럽 의료기기 기업",
        "zh": "欧洲医疗器械企业"
      },
      "title": {
        "en": "Understanding the approval route",
        "ja": "承認までの道筋を理解する",
        "ko": "인허가 경로 이해하기",
        "zh": "弄清审批路径"
      },
      "body": {
        "en": "Talks to an adviser who has taken a product through local registration to learn the real order of steps and who to involve.",
        "ja": "現地で製品の登録を通した経験のあるアドバイザーに、実際の手順の順序と誰を巻き込むべきかを聞きます。",
        "ko": "현지에서 제품 등록을 거쳐 본 자문가에게 실제 절차의 순서와 누구를 참여시켜야 하는지 듣습니다.",
        "zh": "向曾在当地完成产品注册的顾问请教实际的办理顺序，以及需要哪些人参与。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Overseas Expansion",
        "ja": "海外展開ディレクター",
        "ko": "해외진출 디렉터",
        "zh": "海外拓展总监"
      },
      "org": {
        "en": "Chinese industrial group",
        "ja": "中国の産業グループ",
        "ko": "중국 산업 그룹",
        "zh": "中国工业集团"
      },
      "title": {
        "en": "Choosing between entry routes",
        "ja": "進出方法を比べて選ぶ",
        "ko": "진출 방식 비교하고 고르기",
        "zh": "在进入方式之间做选择"
      },
      "body": {
        "en": "Hears from people who have used a joint venture, a distributor and a direct subsidiary, then compares what each route asked of them.",
        "ja": "合弁、代理店、直接子会社をそれぞれ経験した人から話を聞き、各方式で何が求められたかを比べます。",
        "ko": "합작법인, 유통업체, 직접 자회사를 각각 경험한 사람들의 이야기를 듣고, 방식마다 무엇이 요구됐는지 비교합니다.",
        "zh": "听取分别采用合资、分销商和直接设立子公司的人的经验，比较各条路径的要求。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Strategy",
        "ja": "戦略ディレクター",
        "ko": "전략 디렉터",
        "zh": "战略总监"
      },
      "org": {
        "en": "German machinery group",
        "ja": "ドイツの機械グループ",
        "ko": "독일 기계 그룹",
        "zh": "德国机械集团"
      },
      "title": {
        "en": "Learning why an incumbent is hard to displace",
        "ja": "既存企業がなぜ崩しにくいのかを知る",
        "ko": "기존 강자가 왜 흔들기 어려운지 알아보기",
        "zh": "了解现有龙头为何难以取代"
      },
      "body": {
        "en": "Speaks with people who have bought from the leading supplier to learn what customers value and what they would still change.",
        "ja": "業界首位の供給元から購入してきた人に話を聞き、顧客が何を評価し、それでも何を変えたいと思っているかを知ります。",
        "ko": "선두 공급업체에서 구매해 본 사람에게 고객이 무엇을 높이 평가하고 여전히 무엇을 바꾸고 싶어 하는지 듣습니다.",
        "zh": "与从头部供应商处采购过的人交流，了解客户看重什么，以及仍希望改进什么。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Partnerships",
        "ja": "提携ディレクター",
        "ko": "제휴 디렉터",
        "zh": "合作伙伴总监"
      },
      "org": {
        "en": "Japanese financial group",
        "ja": "日本の金融グループ",
        "ko": "일본 금융 그룹",
        "zh": "日本金融集团"
      },
      "title": {
        "en": "Checking a partner's standing",
        "ja": "提携候補の評判を確かめる",
        "ko": "제휴 후보의 평판 확인하기",
        "zh": "核实合作方的口碑"
      },
      "body": {
        "en": "Asks people who know the local industry how a prospective partner is regarded before taking the discussion further.",
        "ja": "話を先に進める前に、現地の業界を知る人に、提携候補がどう見られているかを尋ねます。",
        "ko": "논의를 더 진행하기 전에 현지 업계를 아는 사람에게 제휴 후보가 어떻게 평가받는지 묻습니다.",
        "zh": "在深入洽谈之前，向了解当地行业的人请教这家潜在合作方的口碑。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Business Development",
        "ja": "事業開発ディレクター",
        "ko": "사업개발 디렉터",
        "zh": "业务拓展总监"
      },
      "org": {
        "en": "Swedish industrial company",
        "ja": "スウェーデンの産業企業",
        "ko": "스웨덴 산업 기업",
        "zh": "瑞典工业企业"
      },
      "title": {
        "en": "Understanding the buyer's side",
        "ja": "買い手側の見方を理解する",
        "ko": "구매자 측의 시각 이해하기",
        "zh": "了解买方的视角"
      },
      "body": {
        "en": "Speaks with a procurement executive to learn how large buyers in the market choose and review their suppliers.",
        "ja": "調達の責任者に話を聞き、現地の大手購買企業が供給元をどう選び、どう見直しているかを知ります。",
        "ko": "구매 책임자에게 현지 대형 구매 기업이 공급업체를 어떻게 고르고 재평가하는지 듣습니다.",
        "zh": "与采购负责人交流，了解当地大型买家如何选择并复评供应商。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Overseas Expansion",
        "ja": "海外展開ディレクター",
        "ko": "해외진출 디렉터",
        "zh": "海外拓展总监"
      },
      "org": {
        "en": "Korean materials company",
        "ja": "韓国の素材メーカー",
        "ko": "한국 소재 기업",
        "zh": "韩国材料企业"
      },
      "title": {
        "en": "Preparing for a site visit",
        "ja": "現地視察に備える",
        "ko": "현지 시찰 준비하기",
        "zh": "为实地考察做准备"
      },
      "body": {
        "en": "Hears from a plant manager about local suppliers, utilities and logistics before choosing where to look.",
        "ja": "工場の責任者から、現地の供給元、ユーティリティ、物流について聞き、どこを見に行くかを決めます。",
        "ko": "공장 책임자에게 현지 공급업체, 유틸리티, 물류에 대해 듣고 어디를 둘러볼지 정합니다.",
        "zh": "听工厂负责人介绍当地的供应商、公用设施与物流，再决定去哪里考察。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Strategic Planning",
        "ja": "戦略企画ディレクター",
        "ko": "전략기획 디렉터",
        "zh": "战略规划总监"
      },
      "org": {
        "en": "Taiwanese retail group",
        "ja": "台湾の小売グループ",
        "ko": "대만 유통 그룹",
        "zh": "台湾零售集团"
      },
      "title": {
        "en": "Reviewing the plan with someone who has done it",
        "ja": "経験者と一緒に計画を見直す",
        "ko": "경험자와 함께 계획 검토하기",
        "zh": "与做过的人一起审视计划"
      },
      "body": {
        "en": "Walks a local operator through the entry plan and asks where it is most likely to stall.",
        "ja": "現地の事業者に進出計画を説明し、どこで滞りやすいかを尋ねます。",
        "ko": "현지 사업자에게 진출 계획을 설명하고 어디에서 가장 막힐 가능성이 큰지 묻습니다.",
        "zh": "向当地从业者讲解进入计划，并请教最容易在哪个环节受阻。"
      }
    },
    {
      "kind": "scenario",
      "product": "experts",
      "home": false,
      "role": {
        "en": "Director, Corporate Strategy",
        "ja": "経営戦略ディレクター",
        "ko": "기업전략 디렉터",
        "zh": "公司战略总监"
      },
      "org": {
        "en": "Australian infrastructure firm",
        "ja": "オーストラリアのインフラ企業",
        "ko": "호주 인프라 기업",
        "zh": "澳大利亚基础设施企业"
      },
      "title": {
        "en": "Getting a view on timing",
        "ja": "タイミングについて意見を聞く",
        "ko": "시기에 대한 의견 구하기",
        "zh": "听取对时机的看法"
      },
      "body": {
        "en": "Asks executives how the sector has changed over recent years, to judge whether now is the time to commit.",
        "ja": "経営幹部に、この数年で業界がどう変わってきたかを尋ね、今が投資を決めるタイミングかどうかを判断します。",
        "ko": "경영진에게 최근 몇 년간 업계가 어떻게 달라졌는지 묻고, 지금이 투자를 결정할 시점인지 판단합니다.",
        "zh": "向高管请教近几年行业发生了哪些变化，以判断现在是否是投入的时机。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "Japanese beverage company",
        "ja": "日本の飲料メーカー",
        "ko": "일본 음료 기업",
        "zh": "日本饮料企业"
      },
      "title": {
        "en": "Checking whether the price holds",
        "ja": "価格が受け入れられるかを確かめる",
        "ko": "가격이 받아들여지는지 확인하기",
        "zh": "检验价格能否被接受"
      },
      "body": {
        "en": "Surveys target customers on what they pay today and how they react to different price points before setting the local price.",
        "ja": "現地価格を決める前に、対象の顧客に現在の支払額と価格帯ごとの反応を尋ねる調査を行います。",
        "ko": "현지 가격을 정하기 전에 대상 고객에게 현재 지불하는 금액과 가격대별 반응을 묻는 설문을 진행합니다.",
        "zh": "在确定当地价格之前，向目标客户了解他们目前的支付水平，以及对不同价位的反应。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Strategy",
        "ja": "戦略ディレクター",
        "ko": "전략 디렉터",
        "zh": "战略总监"
      },
      "org": {
        "en": "German household-appliance maker",
        "ja": "ドイツの家電メーカー",
        "ko": "독일 가전 제조업체",
        "zh": "德国家电制造商"
      },
      "title": {
        "en": "Learning how a brand gets shortlisted",
        "ja": "ブランドが候補に残る過程を知る",
        "ko": "브랜드가 후보에 오르는 과정 알아보기",
        "zh": "了解品牌如何进入候选名单"
      },
      "body": {
        "en": "Interviews buyers about how they shortlist and decide, to find what the brand has to say to be considered at all.",
        "ja": "購入者に候補の絞り方と決め方をインタビューし、検討の土俵に乗るためにブランドが何を伝えるべきかを見極めます。",
        "ko": "구매자에게 후보를 추리고 결정하는 방식을 인터뷰해, 고려 대상에 오르려면 브랜드가 무엇을 말해야 하는지 파악합니다.",
        "zh": "访谈购买者如何筛选与决策，找出品牌要被纳入考虑必须传递的信息。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "Korean fashion brand",
        "ja": "韓国のファッションブランド",
        "ko": "한국 패션 브랜드",
        "zh": "韩国时尚品牌"
      },
      "title": {
        "en": "Finding the segment that responds",
        "ja": "反応してくれる顧客層を見つける",
        "ko": "반응하는 고객층 찾기",
        "zh": "找到有反应的客群"
      },
      "body": {
        "en": "Uses a survey to see which customer groups respond most to the proposition before narrowing the launch focus.",
        "ja": "調査で、どの顧客層が提案に最も反応するかを確かめてから、発売時の焦点を絞ります。",
        "ko": "설문으로 어떤 고객층이 제안에 가장 크게 반응하는지 확인한 뒤 출시 초점을 좁힙니다.",
        "zh": "先通过问卷看哪些客群对产品主张反应最强，再收窄上市时的重点。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Business Development",
        "ja": "事業開発ディレクター",
        "ko": "사업개발 디렉터",
        "zh": "业务拓展总监"
      },
      "org": {
        "en": "Chinese food-ingredients company",
        "ja": "中国の食品素材メーカー",
        "ko": "중국 식품 원료 기업",
        "zh": "中国食品原料企业"
      },
      "title": {
        "en": "Hearing from channel partners",
        "ja": "チャネルパートナーの声を聞く",
        "ko": "유통 파트너의 의견 듣기",
        "zh": "倾听渠道伙伴的声音"
      },
      "body": {
        "en": "Interviews retailers and distributors about what they need from a supplier, then builds the offer around it.",
        "ja": "小売店や卸売業者に、供給元に求めることをインタビューし、その内容に沿って提案を組み立てます。",
        "ko": "소매점과 유통업체에 공급업체에 바라는 점을 인터뷰하고, 그에 맞춰 제안을 구성합니다.",
        "zh": "访谈零售商与分销商对供应商的需求，再据此设计合作方案。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "European software firm",
        "ja": "欧州のソフトウェア企業",
        "ko": "유럽 소프트웨어 기업",
        "zh": "欧洲软件企业"
      },
      "title": {
        "en": "Learning why users try, then stop",
        "ja": "試した後に使わなくなる理由を知る",
        "ko": "써 보고 그만두는 이유 알아보기",
        "zh": "弄清用户为何试用后放弃"
      },
      "body": {
        "en": "Holds in-depth interviews with people who tried the product and stopped, to see what got in the way.",
        "ja": "製品を試して使わなくなった人にデプスインタビューを行い、何が妨げになったのかを探ります。",
        "ko": "제품을 써 보고 그만둔 사람들과 심층 인터뷰를 진행해 무엇이 걸림돌이었는지 살펴봅니다.",
        "zh": "对试用后放弃的人进行深度访谈，找出阻碍他们继续使用的原因。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Strategy",
        "ja": "戦略ディレクター",
        "ko": "전략 디렉터",
        "zh": "战略总监"
      },
      "org": {
        "en": "Japanese cosmetics firm",
        "ja": "日本の化粧品会社",
        "ko": "일본 화장품 기업",
        "zh": "日本化妆品公司"
      },
      "title": {
        "en": "Testing the name and the message",
        "ja": "名称とメッセージを試す",
        "ko": "이름과 메시지 시험해 보기",
        "zh": "测试名称与信息"
      },
      "body": {
        "en": "Shows local consumers the concept, name and pack message in their own language and notes what they understand and what puts them off.",
        "ja": "現地の消費者にコンセプト、名称、パッケージのメッセージを現地の言語で見せ、何が伝わり、何が敬遠されるかを記録します。",
        "ko": "현지 소비자에게 콘셉트, 이름, 패키지 메시지를 현지 언어로 보여 주고 무엇이 전달되고 무엇이 거부감을 주는지 기록합니다.",
        "zh": "用当地语言向本地消费者展示概念、名称与包装信息，记录他们理解了什么、抵触什么。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Business Development",
        "ja": "事業開発ディレクター",
        "ko": "사업개발 디렉터",
        "zh": "业务拓展总监"
      },
      "org": {
        "en": "Korean games company",
        "ja": "韓国のゲーム会社",
        "ko": "한국 게임 회사",
        "zh": "韩国游戏公司"
      },
      "title": {
        "en": "Measuring how well the brand is known",
        "ja": "ブランドの認知度を測る",
        "ko": "브랜드 인지도 측정하기",
        "zh": "衡量品牌知名度"
      },
      "body": {
        "en": "Surveys the market on awareness and associations before deciding how much to put behind marketing.",
        "ja": "マーケティングにどれだけ投じるかを決める前に、認知度と連想されるイメージを市場に尋ねます。",
        "ko": "마케팅에 얼마나 투입할지 정하기 전에 시장에 인지도와 연상 이미지를 묻습니다.",
        "zh": "在决定投入多少营销预算之前，先在市场上调查品牌的认知度与联想。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Strategy",
        "ja": "戦略ディレクター",
        "ko": "전략 디렉터",
        "zh": "战略总监"
      },
      "org": {
        "en": "Australian fintech company",
        "ja": "オーストラリアのフィンテック企業",
        "ko": "호주 핀테크 기업",
        "zh": "澳大利亚金融科技公司"
      },
      "title": {
        "en": "Understanding how small businesses buy",
        "ja": "中小企業の購買の仕組みを理解する",
        "ko": "중소기업이 구매하는 방식 이해하기",
        "zh": "了解小企业如何采购"
      },
      "body": {
        "en": "Interviews small-business owners in the local language about how they buy and who decides.",
        "ja": "中小企業の経営者に、現地の言語で、どう購入し誰が決めるのかをインタビューします。",
        "ko": "중소기업 경영자에게 현지 언어로 어떻게 구매하고 누가 결정하는지 인터뷰합니다.",
        "zh": "用当地语言访谈小企业主，了解他们如何采购、由谁决定。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Market Development",
        "ja": "マーケット開発ディレクター",
        "ko": "시장개발 디렉터",
        "zh": "市场开拓总监"
      },
      "org": {
        "en": "Taiwanese electronics maker",
        "ja": "台湾の電子機器メーカー",
        "ko": "대만 전자기기 제조업체",
        "zh": "台湾电子产品制造商"
      },
      "title": {
        "en": "Comparing two markets with one questionnaire",
        "ja": "一つの調査票で二つの市場を比べる",
        "ko": "하나의 설문으로 두 시장 비교하기",
        "zh": "用同一份问卷比较两个市场"
      },
      "body": {
        "en": "Runs the same questionnaire in two countries to compare what customers want and decide where to start.",
        "ja": "同じ調査票を二つの国で実施し、顧客が求めるものを比べて、どちらから始めるかを決めます。",
        "ko": "같은 설문을 두 나라에서 진행해 고객이 원하는 것을 비교하고 어디부터 시작할지 정합니다.",
        "zh": "在两个国家使用同一份问卷，比较客户的需求，并决定先从哪里开始。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, Strategic Planning",
        "ja": "戦略企画ディレクター",
        "ko": "전략기획 디렉터",
        "zh": "战略规划总监"
      },
      "org": {
        "en": "Swiss manufacturer",
        "ja": "スイスの製造業",
        "ko": "스위스 제조업체",
        "zh": "瑞士制造企业"
      },
      "title": {
        "en": "Putting a desk-research number to the test",
        "ja": "机上調査の数字を検証する",
        "ko": "데스크 조사의 수치를 검증하기",
        "zh": "检验案头研究得出的数字"
      },
      "body": {
        "en": "After reading the market report, runs a short survey to check a key assumption with real customers.",
        "ja": "市場レポートを読んだ後、短い調査を行い、重要な前提を実際の顧客に確かめます。",
        "ko": "시장 보고서를 읽은 뒤 짧은 설문을 진행해 핵심 가정을 실제 고객에게 확인합니다.",
        "zh": "读完市场报告后，用一份简短问卷向真实客户验证一个关键假设。"
      }
    },
    {
      "kind": "scenario",
      "product": "survey",
      "home": false,
      "role": {
        "en": "Director, International Business",
        "ja": "国際事業ディレクター",
        "ko": "국제사업 디렉터",
        "zh": "国际业务总监"
      },
      "org": {
        "en": "Chinese consumer-electronics brand",
        "ja": "中国の家電ブランド",
        "ko": "중국 가전 브랜드",
        "zh": "中国消费电子品牌"
      },
      "title": {
        "en": "Hearing from early customers",
        "ja": "初期の顧客の声を聞く",
        "ko": "초기 고객의 의견 듣기",
        "zh": "倾听早期客户的声音"
      },
      "body": {
        "en": "Interviews the first customers in a new market to learn why they chose the product and how they would describe it to others.",
        "ja": "新しい市場の最初の顧客に、なぜその製品を選んだのか、他の人にどう説明するかをインタビューします。",
        "ko": "새로운 시장의 첫 고객에게 왜 그 제품을 골랐는지, 다른 사람에게 어떻게 설명할지 인터뷰합니다.",
        "zh": "访谈新市场的首批客户，了解他们为何选择该产品，以及会如何向他人介绍。"
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
  const LIST = prod ? ITEMS.filter(i => i.product === prod) : ITEMS.filter(i => i.home !== false);
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
