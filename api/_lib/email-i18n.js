// ============================================================
// KIRA RESEARCH — api/_lib/email-i18n.js
// Every reader-facing email in EN / JA / KO / ZH (stage 1, 2026-11-27). The language is the one of the page where the
// person signed up or bought (`locale` stored on the request / alert / purchase). Unknown locale → English.
// Plain and short on purpose; "we", no "AI" lead, no competitor names. Placeholders are {name}.
//   tr(loc, 'key', { vars })   → string
//   noun(loc, kind)            → "report" | "transcript" | "company list" in that language
// ============================================================

export const LOCALES = ['en', 'ja', 'ko', 'zh'];
export const normLocale = (l) => (LOCALES.includes(String(l || '').toLowerCase()) ? String(l).toLowerCase() : 'en');

const S = {
  // ── shared ──
  signoff: { en: '— The KIRA RESEARCH team', ja: '— KIRA RESEARCH チーム', ko: '— KIRA RESEARCH 팀', zh: '— KIRA RESEARCH 团队' },
  stop: { en: 'Stop these emails', ja: '配信を停止する', ko: '수신 중지', zh: '退订这些邮件' },
  whySent: {
    en: 'You get this because you left your email on kiraresearch.com.',
    ja: 'kiraresearch.com でメールアドレスをご登録いただいたため、お送りしています。',
    ko: 'kiraresearch.com에 이메일을 남기셨기 때문에 보내드립니다.',
    zh: '您在 kiraresearch.com 留下了邮箱，因此收到此邮件。'
  },
  refund: {
    en: 'Can’t open or download it? Full refund within 7 days: reply to this email.',
    ja: '開けない・ダウンロードできない場合は、7日以内に全額返金します。このメールに返信してください。',
    ko: '열거나 내려받을 수 없나요? 7일 이내 전액 환불해 드립니다. 이 메일에 회신해 주세요.',
    zh: '无法打开或下载？7天内全额退款，直接回复此邮件即可。'
  },
  pages: { en: '{n} pages', ja: '{n}ページ', ko: '{n}페이지', zh: '{n}页' },
  charts: { en: '{n} charts', ja: '図表{n}点', ko: '도표 {n}개', zh: '{n}张图表' },
  companies: { en: '{n} companies', ja: '{n}社', ko: '기업 {n}개', zh: '{n}家企业' },
  excelFile: { en: 'Excel file', ja: 'Excelファイル', ko: 'Excel 파일', zh: 'Excel文件' },
  editions: { en: 'EN/JA/KO/ZH', ja: 'EN/JA/KO/ZH', ko: 'EN/JA/KO/ZH', zh: 'EN/JA/KO/ZH' },
  kindReport: { en: 'report', ja: 'レポート', ko: '보고서', zh: '报告' },
  kindTranscript: { en: 'transcript', ja: 'トランスクリプト', ko: '녹취록', zh: '访谈记录' },
  kindList: { en: 'company list', ja: '企業リスト', ko: '기업 리스트', zh: '企业名单' },
  kindMap: { en: 'market map', ja: 'マーケットマップ', ko: '마켓맵', zh: '市场图谱' },

  // ── receipt (api/library-buy, transcript-buy, list-buy) ──
  'receipt.subject': {
    en: 'Your KIRA RESEARCH {noun} — {title}', ja: 'KIRA RESEARCH {noun}のご購入ありがとうございます — {title}',
    ko: 'KIRA RESEARCH {noun} 구매 안내 — {title}', zh: '您的 KIRA RESEARCH {noun} — {title}'
  },
  'receipt.thanks': { en: 'Thanks for your purchase.', ja: 'ご購入ありがとうございます。', ko: '구매해 주셔서 감사합니다.', zh: '感谢您的购买。' },
  'receipt.access': { en: 'You now have access to', ja: 'ご利用いただけます：', ko: '이제 다음 자료를 이용하실 수 있습니다:', zh: '您现在可以使用：' },
  'receipt.thankBuy': { en: 'Thank you for buying', ja: 'ご購入ありがとうございます：', ko: '구매해 주셔서 감사합니다:', zh: '感谢您购买：' },
  'receipt.amount': { en: 'Amount', ja: 'お支払い金額', ko: '결제 금액', zh: '金额' },
  'receipt.licence': { en: 'Licence', ja: 'ライセンス', ko: '라이선스', zh: '授权' },
  'receipt.licenceTeam': {
    en: 'Team licence (up to 10 people, same company)', ja: 'チームライセンス（同一企業の最大10名）',
    ko: '팀 라이선스(동일 회사 최대 10명)', zh: '团队授权（同一公司最多10人）'
  },
  'receipt.licenceCompany': { en: 'Company-wide licence', ja: '全社ライセンス', ko: '전사 라이선스', zh: '全公司授权' },
  'receipt.open': { en: 'Open your {noun}', ja: '{noun}を開く', ko: '{noun} 열기', zh: '打开您的{noun}' },
  'receipt.openSignedIn': { en: 'Open your {noun} (signs you in)', ja: '{noun}を開く（自動でサインインします）', ko: '{noun} 열기(자동 로그인)', zh: '打开您的{noun}（自动登录）' },
  'receipt.view': { en: 'View your {noun}', ja: '{noun}を見る', ko: '{noun} 보기', zh: '查看您的{noun}' },
  'receipt.signInNote': {
    en: 'We created your KIRA account from this email address. The button signs you in; to come back later, use "Email me a sign-in link" on the sign-in page.',
    ja: 'このメールアドレスでKIRAのアカウントを作成しました。ボタンからサインインできます。次回からは、サインインページの「サインイン用リンクをメールで送る」をご利用ください。',
    ko: '이 이메일 주소로 KIRA 계정을 만들었습니다. 버튼을 누르면 로그인됩니다. 다음에는 로그인 페이지의 "로그인 링크를 이메일로 받기"를 이용해 주세요.',
    zh: '我们已用此邮箱为您创建了KIRA账户。点击按钮即可登录；以后请在登录页使用“通过邮件获取登录链接”。'
  },
  'receipt.signIn': { en: 'Sign in', ja: 'サインイン', ko: '로그인', zh: '登录' },
  'receipt.listReady': {
    en: 'Your Excel file is ready. The link works for 7 days and for up to 5 downloads; you can also find it under My Library in your profile.',
    ja: 'Excelファイルの準備ができました。リンクは7日間、最大5回までダウンロードできます。プロフィールの「マイライブラリ」からも開けます。',
    ko: 'Excel 파일이 준비되었습니다. 링크는 7일간, 최대 5회까지 내려받을 수 있으며 프로필의 "내 라이브러리"에서도 찾으실 수 있습니다.',
    zh: 'Excel文件已准备好。链接7天内有效，最多可下载5次；也可在个人资料的“我的资料库”中找到。'
  },
  'receipt.listPending': {
    en: 'We are preparing your Excel file and will email the download link as soon as it is ready. You do not need to do anything.',
    ja: 'Excelファイルを準備中です。完成しだい、ダウンロード用リンクをメールでお送りします。お手続きは不要です。',
    ko: 'Excel 파일을 준비 중이며, 완료되는 대로 다운로드 링크를 이메일로 보내드립니다. 별도로 하실 일은 없습니다.',
    zh: '我们正在准备您的Excel文件，完成后会立即邮件发送下载链接，您无需任何操作。'
  },
  'receipt.listDownload': { en: 'Download your Excel list', ja: 'Excelリストをダウンロード', ko: 'Excel 리스트 내려받기', zh: '下载Excel名单' },
  'receipt.listView': { en: 'View the list page', ja: 'リストのページを見る', ko: '리스트 페이지 보기', zh: '查看名单页面' },
  'receipt.pdfDirect': { en: 'Direct PDF link (expires in 1 hour)', ja: 'PDF直接リンク（1時間で失効）', ko: 'PDF 직접 링크(1시간 후 만료)', zh: 'PDF直接链接（1小时后失效）' },
  'receipt.download': { en: 'download', ja: 'ダウンロード', ko: '내려받기', zh: '下载' },
  'receipt.questions': { en: 'If you have any questions, just reply to this email.', ja: 'ご不明な点は、このメールにご返信ください。', ko: '궁금한 점은 이 메일에 회신해 주세요.', zh: '如有任何问题，请直接回复此邮件。' },

  // ── "we got your request" (coming-soon request) ──
  'req.subject': { en: 'We got your request', ja: 'リクエストを受け付けました', ko: '요청이 접수되었습니다', zh: '我们已收到您的请求' },
  'req.heading': { en: 'We got your request.', ja: 'リクエストを受け付けました。', ko: '요청이 접수되었습니다.', zh: '我们已收到您的请求。' },
  'req.lead': {
    en: 'You asked to be told when this report is published:', ja: '次のレポートの公開をお知らせするよう、ご依頼いただきました：',
    ko: '다음 보고서가 게시되면 알려 달라고 요청하셨습니다:', zh: '您希望在以下报告发布时收到通知：'
  },
  'req.eta': {
    en: 'We expect to publish it by {eta}, and we will email you once, on the day it is ready. You can check its status any time here:',
    ja: '{eta}までに公開する予定です。完成した当日に、1回だけメールでお知らせします。状況はいつでも次のページで確認できます：',
    ko: '{eta}까지 게시할 예정이며, 준비된 날 한 번만 이메일로 알려드립니다. 진행 상황은 언제든 아래에서 확인하실 수 있습니다:',
    zh: '我们预计在{eta}前发布，完成当天会邮件通知您一次。您可随时在此查看进度：'
  },
  'req.noEta': {
    en: 'We will email you once, on the day it is ready. You can check its status any time here:',
    ja: '完成した当日に、1回だけメールでお知らせします。状況はいつでも次のページで確認できます：',
    ko: '준비된 날 한 번만 이메일로 알려드립니다. 진행 상황은 언제든 아래에서 확인하실 수 있습니다:',
    zh: '完成当天会邮件通知您一次。您可随时在此查看进度：'
  },
  'req.spam': {
    en: 'If our emails land in spam, mark this one as "not spam" and add noreply@kiraresearch.com to your contacts so the next one reaches you.',
    ja: 'メールが迷惑メールに入った場合は「迷惑メールではない」に設定し、noreply@kiraresearch.com を連絡先に追加してください。',
    ko: '메일이 스팸함에 들어갔다면 "스팸 아님"으로 표시하고 noreply@kiraresearch.com을 연락처에 추가해 주세요.',
    zh: '如果邮件进入垃圾箱，请标记为“非垃圾邮件”，并把 noreply@kiraresearch.com 加入通讯录。'
  },
  'req.notYou': {
    en: 'Not you? Ignore this message; we will only send one more email about this report.',
    ja: '心当たりがない場合は、このメールを無視してください。このレポートについてお送りするのは、あと1通のみです。',
    ko: '본인이 아니라면 이 메일을 무시해 주세요. 이 보고서에 대해서는 한 번만 더 메일을 보냅니다.',
    zh: '不是您本人？请忽略此邮件；关于这份报告，我们只会再发一封邮件。'
  },

  // ── Sequence A: coming-soon request, now published (day 0) ──
  'pub.subject': { en: 'Now published — {title}', ja: '公開しました — {title}', ko: '게시되었습니다 — {title}', zh: '已发布 — {title}' },
  'pub.heading': {
    en: 'The report you asked about is now published.', ja: 'ご依頼いただいたレポートを公開しました。',
    ko: '요청하신 보고서가 게시되었습니다.', zh: '您关注的报告已经发布。'
  },
  'pub.reason': {
    en: 'You get this once because you asked to be told when it was ready. The executive summary is free to read; the full report is {price}.',
    ja: 'ご依頼いただいたため、1回だけお送りしています。エグゼクティブサマリーは無料でお読みいただけます。レポート全文は{price}です。',
    ko: '요청하셨기 때문에 한 번만 보내드립니다. 핵심 요약은 무료로 읽으실 수 있으며, 보고서 전체는 {price}입니다.',
    zh: '您曾要求在报告完成时通知，因此只发送这一次。执行摘要可免费阅读；完整报告售价{price}。'
  },
  'pub.priceLine': { en: 'Full report: {price} · {reason}', ja: 'レポート全文：{price} ・ {reason}', ko: '보고서 전체: {price} · {reason}', zh: '完整报告：{price} · {reason}' },
  'pub.cta': { en: 'Open the report — {price}', ja: 'レポートを開く — {price}', ko: '보고서 열기 — {price}', zh: '打开报告 — {price}' },
  'pub.free': { en: 'Read the free summary first', ja: 'まず無料サマリーを読む', ko: '무료 요약 먼저 읽기', zh: '先阅读免费摘要' },

  // ── Sequence A, +3 days: reminder ──
  'rem.subject': { en: 'Still interested? {title}', ja: 'ご検討中でしょうか — {title}', ko: '아직 관심 있으신가요? {title}', zh: '仍在考虑吗？{title}' },
  'rem.heading': { en: 'The report is ready when you are.', ja: 'レポートはいつでもお読みいただけます。', ko: '보고서는 언제든 보실 수 있습니다.', zh: '报告随时可以阅读。' },
  'rem.body': {
    en: 'A few days ago we published the report you asked about. The free preview shows the first pages, so you can check it fits before you buy.',
    ja: '数日前に、ご依頼いただいたレポートを公開しました。無料プレビューで冒頭のページをご覧いただけるので、購入前に内容をご確認いただけます。',
    ko: '며칠 전 요청하신 보고서를 게시했습니다. 무료 미리보기에서 앞부분 페이지를 보실 수 있으니 구매 전에 확인해 보세요.',
    zh: '几天前我们发布了您关注的报告。免费预览包含开头的若干页，您可以先确认是否合适再购买。'
  },
  'rem.once': {
    en: 'This is the only reminder; after one more email we will not write again about this report.',
    ja: 'お送りする催促はこれが最後です。このレポートについて、あと1通のみお送りします。',
    ko: '이 메일이 마지막 알림입니다. 이 보고서에 대해서는 한 번만 더 메일을 보냅니다.',
    zh: '这是最后一次提醒；关于这份报告，我们只会再发一封邮件。'
  },

  // ── Sequence A, +10 days: two related reports ──
  'rel10.subject': { en: 'Two more reports on {topic}', ja: '{topic}に関する、ほかの2本のレポート', ko: '{topic} 관련 보고서 2건', zh: '另外两份关于{topic}的报告' },
  'rel10.heading': { en: 'Related reading', ja: '関連レポート', ko: '관련 자료', zh: '相关阅读' },
  'rel10.body': {
    en: 'Others who asked about this topic also looked at these. Each has a free preview.',
    ja: 'このテーマに関心をお持ちの方は、次の資料もご覧になっています。いずれも無料プレビューがあります。',
    ko: '이 주제에 관심 있는 분들이 함께 본 자료입니다. 모두 무료 미리보기가 있습니다.',
    zh: '关注此主题的读者也看了以下内容，均提供免费预览。'
  },
  'rel10.last': { en: 'This is the last email about this report.', ja: 'このレポートについてのメールは、これが最後です。', ko: '이 보고서에 대한 마지막 메일입니다.', zh: '这是关于这份报告的最后一封邮件。' },

  // ── Sequence D: buyers, +3 days ──
  'buy3.subject': { en: 'More on {topic}', ja: '{topic}について、さらに', ko: '{topic} 관련 추가 자료', zh: '更多关于{topic}的内容' },
  'buy3.heading': { en: 'More on the same market', ja: '同じ市場に関する資料', ko: '같은 시장의 다른 자료', zh: '同一市场的更多资料' },
  'buy3.body': {
    en: 'You bought {title} a few days ago. These cover the same market from another angle. Each has a free preview.',
    ja: '数日前に「{title}」をご購入いただきました。同じ市場を別の角度から扱った資料をご案内します。いずれも無料プレビューがあります。',
    ko: '며칠 전 "{title}"을(를) 구매하셨습니다. 같은 시장을 다른 각도에서 다룬 자료입니다. 모두 무료 미리보기가 있습니다.',
    zh: '几天前您购买了《{title}》。以下资料从另一个角度覆盖同一市场，均提供免费预览。'
  },
  'buy3.last': { en: 'This is the only follow-up we send after a purchase.', ja: '購入後のご案内は、このメール1通のみです。', ko: '구매 후 보내는 안내는 이 메일 한 번뿐입니다.', zh: '购买后我们只发送这一封跟进邮件。' },

  // ── Abandoned checkout ──
  'ab1.subject': { en: 'Your order for {title} is waiting', ja: '「{title}」のご注文が完了していません', ko: '"{title}" 주문이 완료되지 않았습니다', zh: '您的订单尚未完成：{title}' },
  'ab1.heading': { en: 'You did not finish your order.', ja: 'ご注文がまだ完了していません。', ko: '주문이 아직 완료되지 않았습니다.', zh: '您的订单尚未完成。' },
  'ab1.body': {
    en: 'You started checkout for {title} ({price}), but the payment was not completed, so nothing was charged. The button takes you back to it.',
    ja: '「{title}」（{price}）のお支払い手続きを開始されましたが、完了していないため、料金は請求されていません。下のボタンから続きをお進めいただけます。',
    ko: '"{title}"({price}) 결제를 시작하셨지만 완료되지 않아 요금은 청구되지 않았습니다. 아래 버튼으로 돌아가실 수 있습니다.',
    zh: '您开始为《{title}》（{price}）结账，但付款未完成，因此未扣款。点击按钮即可返回。'
  },
  'ab1.cta': { en: 'Back to my order', ja: '注文に戻る', ko: '주문으로 돌아가기', zh: '返回订单' },
  'ab2.subject': { en: 'Last reminder: {title}', ja: '最後のご案内：{title}', ko: '마지막 안내: {title}', zh: '最后提醒：{title}' },
  'ab2.heading': { en: 'One last note about your order.', ja: 'ご注文について、最後のご案内です。', ko: '주문에 대한 마지막 안내입니다.', zh: '关于您订单的最后一则提醒。' },
  'ab2.body': {
    en: 'Your checkout for {title} is still open. If something went wrong with the payment, or you could not open the page, reply and tell us. We do not send more reminders after this one.',
    ja: '「{title}」のご注文は、まだ完了していません。お支払いで問題があった場合や、ページが開けなかった場合は、このメールにご返信ください。これ以降の催促はお送りしません。',
    ko: '"{title}" 주문이 아직 완료되지 않았습니다. 결제에 문제가 있었거나 페이지가 열리지 않았다면 회신해 알려 주세요. 이후에는 더 이상 알림을 보내지 않습니다.',
    zh: '您为《{title}》发起的订单仍未完成。如付款出现问题或页面无法打开，请直接回复告知我们。此后不再发送提醒。'
  },

  // ── coming-soon topic published for other requests (chain) ──
  'chain.subject': { en: 'Now available — {title}', ja: '公開しました — {title}', ko: '이용 가능합니다 — {title}', zh: '已上线 — {title}' },
  'chain.heading': {
    en: 'The value chain you searched for is now available.', ja: 'ご検索いただいたバリューチェーンを公開しました。',
    ko: '검색하신 밸류체인이 공개되었습니다.', zh: '您搜索的价值链已经上线。'
  },
  'chain.cta': { en: 'Open the chain', ja: 'チェーンを開く', ko: '체인 열기', zh: '打开价值链' },
  'chain.once': {
    en: 'You are receiving this once because you asked to be told when it was ready.',
    ja: 'ご依頼いただいたため、1回だけお送りしています。', ko: '요청하셨기 때문에 한 번만 보내드립니다.', zh: '您曾要求完成时通知，因此只发送这一次。'
  },

  // ── Kira Data moves alerts ──
  'mv.confirmSubject': { en: 'Confirm your alert: {label}', ja: 'アラートの確認：{label}', ko: '알림 확인: {label}', zh: '请确认您的提醒：{label}' },
  'mv.confirmHeading': { en: 'Confirm your alert', ja: 'アラートの確認', ko: '알림 확인', zh: '确认您的提醒' },
  'mv.confirmLead': {
    en: 'You asked us to email you when we publish new company moves:', ja: '新しい企業動向を公開したときにメールでお知らせするよう、ご依頼いただきました：',
    ko: '새로운 기업 동향을 게시하면 이메일로 알려 달라고 요청하셨습니다:', zh: '您希望在我们发布新的企业动向时收到邮件：'
  },
  'mv.confirmBtn': { en: 'Confirm the alert', ja: 'アラートを確認する', ko: '알림 확인하기', zh: '确认提醒' },
  'mv.confirmNote': {
    en: 'Nothing is sent until you confirm. Not you? Ignore this message and you will not hear from us again.',
    ja: '確認いただくまで何も送信しません。心当たりがない場合は、このメールを無視してください。以後メールは届きません。',
    ko: '확인하시기 전에는 아무것도 보내지 않습니다. 본인이 아니라면 이 메일을 무시해 주세요. 더 이상 메일이 가지 않습니다.',
    zh: '您确认之前不会发送任何邮件。不是您本人？请忽略此邮件，我们不会再联系您。'
  },
  'mv.digestOne': { en: 'New move: {title}', ja: '新しい動向：{title}', ko: '새 동향: {title}', zh: '新动向：{title}' },
  'mv.digestMany': { en: '{n} new company moves: {label}', ja: '企業動向{n}件：{label}', ko: '새 기업 동향 {n}건: {label}', zh: '{n}条新的企业动向：{label}' },
  'mv.digestHeading': { en: 'New company moves', ja: '新しい企業動向', ko: '새로운 기업 동향', zh: '新的企业动向' },
  'mv.digestAll': { en: 'See all moves', ja: 'すべての動向を見る', ko: '모든 동향 보기', zh: '查看全部动向' },
  'mv.why': {
    en: 'You get this because you confirmed an alert on kiraresearch.com.', ja: 'kiraresearch.com でアラートを確認いただいたため、お送りしています。',
    ko: 'kiraresearch.com에서 알림을 확인하셨기 때문에 보내드립니다.', zh: '您在 kiraresearch.com 确认了提醒，因此收到此邮件。'
  },
  'mv.type.acquisition': { en: 'Acquisition', ja: '買収', ko: '인수', zh: '收购' },
  'mv.type.stake': { en: 'Stake', ja: '出資', ko: '지분 취득', zh: '参股' },
  'mv.type.investment': { en: 'Investment', ja: '投資', ko: '투자', zh: '投资' },
  'mv.type.plant': { en: 'New plant', ja: '新工場', ko: '신규 공장', zh: '新建工厂' },
  'mv.type.jv': { en: 'Joint venture', ja: '合弁事業', ko: '합작사업', zh: '合资' },
  'mv.type.subsidiary': { en: 'New subsidiary or office', ja: '新会社・拠点', ko: '신규 법인·사무소', zh: '新设子公司或办事处' },
  'mv.type.expansion': { en: 'Expansion', ja: '拡張', ko: '확장', zh: '扩张' },
  'mv.type.exit': { en: 'Exit', ja: '撤退', ko: '철수', zh: '退出' },

  // ── "New reports on <country> / <industry>" alert (double opt-in, weekly digest) ──
  'ra.label': { en: 'New reports: {what}', ja: '新着レポート：{what}', ko: '신규 보고서: {what}', zh: '新报告：{what}' },
  'ra.confirmSubject': { en: 'Confirm: new reports on {what}', ja: '確認のお願い：{what}の新着レポート', ko: '확인 요청: {what} 신규 보고서', zh: '请确认：{what}新报告提醒' },
  'ra.confirmHeading': { en: 'Confirm your alert', ja: 'アラートの確認', ko: '알림 확인', zh: '确认您的提醒' },
  'ra.confirmLead': {
    en: 'You asked us to email you when we publish new reports and market maps on:', ja: '次のテーマで新しいレポートやマーケットマップを公開したときに、メールでお知らせします：',
    ko: '다음 주제의 새 보고서와 마켓맵을 게시하면 이메일로 알려 드립니다:', zh: '我们发布以下主题的新报告和市场图谱时，会邮件通知您：'
  },
  'ra.confirmBtn': { en: 'Confirm the alert', ja: 'アラートを確認する', ko: '알림 확인하기', zh: '确认提醒' },
  'ra.confirmNote': {
    en: 'We send one short email a week, only when something new is published. Nothing is sent until you confirm. Not you? Ignore this message.',
    ja: '新しい資料が公開されたときだけ、週に1通、短いメールをお送りします。確認いただくまで何も送信しません。心当たりがない場合は無視してください。',
    ko: '새 자료가 게시될 때만 주 1회 짧은 메일을 보내드립니다. 확인하시기 전에는 아무것도 보내지 않습니다. 본인이 아니라면 무시해 주세요.',
    zh: '仅在有新内容发布时，每周发送一封简短邮件。您确认之前不会发送任何邮件。不是您本人？请忽略此邮件。'
  },
  'ra.sampleHead': { en: 'A free sample while you wait', ja: '待ち時間に、無料サンプルをどうぞ', ko: '기다리시는 동안 무료 샘플', zh: '先看一份免费样本' },
  'ra.sampleBody': {
    en: 'The free preview of our most recent report on this market:', ja: 'この市場に関する最新レポートの無料プレビューです：',
    ko: '이 시장에 대한 최신 보고서의 무료 미리보기입니다:', zh: '这是我们关于该市场最新报告的免费预览：'
  },
  'ra.confirmedBanner': { en: 'Alert confirmed.', ja: 'アラートを確認しました。', ko: '알림을 확인했습니다.', zh: '提醒已确认。' },
  'ra.digestSubject': { en: '{n} new on {what}', ja: '{what}：新着{n}件', ko: '{what}: 신규 {n}건', zh: '{what}：新增{n}项' },
  'ra.digestHeading': { en: 'New this week', ja: '今週の新着', ko: '이번 주 신규', zh: '本周新增' },
  'ra.digestMore': { en: 'Browse everything on this market', ja: 'この市場の資料をすべて見る', ko: '이 시장의 모든 자료 보기', zh: '浏览该市场的全部内容' },
  'ra.why': {
    en: 'You get this because you confirmed an alert on kiraresearch.com.', ja: 'kiraresearch.com でアラートを確認いただいたため、お送りしています。',
    ko: 'kiraresearch.com에서 알림을 확인하셨기 때문에 보내드립니다.', zh: '您在 kiraresearch.com 确认了提醒，因此收到此邮件。'
  },
  'ra.itemReport': { en: 'Report', ja: 'レポート', ko: '보고서', zh: '报告' },
  'ra.itemMap': { en: 'Company list', ja: '企業リスト', ko: '기업 리스트', zh: '企业名单' },
  'ra.allIndustries': { en: 'all industries', ja: '全業種', ko: '전 산업', zh: '全部行业' },

  // ── form on the pages ──
  // (the form strings live in public/js/report-alert.js; the server only returns codes)
};

function fill(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
}

export function tr(loc, key, vars) {
  const e = S[key];
  if (!e) return key;
  return fill(e[normLocale(loc)] || e.en, vars);
}

export function noun(loc, kind) {
  return tr(loc, kind === 'transcript' ? 'kindTranscript' : kind === 'list' ? 'kindList' : kind === 'map' ? 'kindMap' : 'kindReport');
}

// "44 pages · 26 charts · EN/JA/KO/ZH" for a report; same idea for the other kinds (what the buy box shows).
export function reasonLine(loc, kind, d = {}) {
  const bits = [];
  if (kind === 'report') {
    if (d.pages) bits.push(tr(loc, 'pages', { n: d.pages }));
    if (d.exhibits) bits.push(tr(loc, 'charts', { n: d.exhibits }));
    bits.push(tr(loc, 'editions'));
  } else if (kind === 'list') {
    if (d.companies) bits.push(tr(loc, 'companies', { n: d.companies }));
    bits.push(tr(loc, 'excelFile'));
  }
  return bits.join(' · ');
}

export const STRING_KEYS = Object.keys(S);
export const STRINGS = S;
