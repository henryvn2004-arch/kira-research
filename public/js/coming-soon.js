// "Coming soon" report pages and the library-search fallback (migration 027).
// Needs /js/research-i18n.js first (window.kiraR). Exposes window.kiraComingSoon:
//   page(root, topic)      full page for one topic (used by reports/_view.html)
//   strip(items)           list of matching coming-soon topics (library search)
//   requestBox(keyword)    "tell us what you need" form when nothing matches
// Topic text (title, questions) is English; the surrounding copy is localised.
(function () {
  const R = window.kiraR;
  if (!R) return;
  const L = R.locale, esc = R.esc;

  const S = {
    en: {
      soon: 'Coming soon', crumbLib: 'Library', answer: 'What this report will answer',
      scoping: 'We are scoping this report', approved: 'Approved — joining the production queue',
      queued: 'In the production queue',
      steps: ['Scoped', 'Approved', 'In production', 'Review', 'Published'],
      emailPh: 'Work email', notify: 'Email me when it is published',
      fine: 'One email, the day it is published. A report that readers ask for goes to the front of our schedule.',
      eta: 'Expected by {date}', etaFine: 'Ask for it and we aim to publish by this date, then email you.', price: 'Price when published: ${price}. Asking for it costs nothing.',
      sent: 'Done — we will email you when this report is published.', err: 'Something went wrong. Please try again.',
      stripTitle: 'Coming soon', stripBody: 'Not published yet — read what each will cover and get an email when it is.',
      noneTitle: 'Not in the library yet', noneBody: 'Tell us what you are looking for and leave an email. We will tell you if we take it on.',
      kwReq: 'Notify me', reqKw: 'Your request', soonTag: 'Coming soon', exec: 'Executive summary — available on publication.',
      planned: 'Planned contents', plannedNote: 'Planned before research starts. Page titles can change as the evidence comes in.',
      peek: 'A look inside', peekNote: 'Sample layout only. The real pages, charts and numbers appear on the day the report is published.', peekTag: 'Preview on publication', peekExec: 'Executive summary',
      lib: 'Back to library',
      inbox: 'Check your inbox for a confirmation. If it is not there, look in spam and add noreply@kiraresearch.com to your contacts.',
      asked: 'You asked to be told about this report. We will email you the day it is published.'
    },
    ja: {
      soon: '近日公開', crumbLib: 'ライブラリ', answer: 'このレポートで答える問い',
      scoping: 'このレポートは企画中です', approved: '承認済み — 制作キューに入ります',
      queued: '制作キューに入っています',
      steps: ['企画', '承認', '制作中', 'レビュー', '公開'],
      emailPh: '勤務先メールアドレス', notify: '公開時にメールで通知',
      fine: '公開当日に1通だけお送りします。ご要望のあったレポートは制作を最優先します。',
      eta: '公開予定日：{date}', etaFine: 'ご希望をお知らせいただければ、この日までの公開を目指し、公開時にメールでお知らせします。', price: '公開後の価格：${price}。リクエストは無料です。',
      sent: '受け付けました。公開時にメールでお知らせします。', err: 'エラーが発生しました。もう一度お試しください。',
      stripTitle: '近日公開', stripBody: '未公開のレポートです。内容をご確認のうえ、公開時にメールで通知を受け取れます。',
      noneTitle: 'まだライブラリにありません', noneBody: 'お探しの内容とメールアドレスをお知らせください。制作する場合はご連絡します。',
      kwReq: '通知を受け取る', reqKw: 'ご要望', soonTag: '近日公開', exec: 'エグゼクティブサマリー — 公開時に閲覧できます。',
      planned: '予定している構成', plannedNote: '調査を始める前の計画です。調査の結果に応じてページ名が変わることがあります。',
      peek: '内容のイメージ', peekNote: 'レイアウトの見本です。実際のページ・グラフ・数値は公開日にご覧いただけます。', peekTag: '公開時にプレビュー', peekExec: 'エグゼクティブサマリー',
      lib: 'ライブラリに戻る',
      inbox: '確認メールをお送りしました。届かない場合は迷惑メールフォルダをご確認のうえ、noreply@kiraresearch.com を連絡先に追加してください。',
      asked: 'このレポートの公開通知を受け付け済みです。公開当日にメールでお知らせします。'
    },
    ko: {
      soon: '곧 공개', crumbLib: '라이브러리', answer: '이 보고서가 답하는 질문',
      scoping: '이 보고서는 기획 중입니다', approved: '승인됨 — 제작 대기열에 들어갑니다',
      queued: '제작 대기열에 있습니다',
      steps: ['기획', '승인', '제작 중', '검토', '공개'],
      emailPh: '업무용 이메일', notify: '공개되면 이메일로 알림',
      fine: '공개 당일 한 번만 보내드립니다. 독자가 요청한 보고서를 가장 먼저 제작합니다.',
      eta: '공개 예정일: {date}', etaFine: '요청해 주시면 이 날짜까지 공개를 목표로 하고, 공개되면 이메일로 알려드립니다.', price: '공개 후 가격: ${price}. 요청은 무료입니다.',
      sent: '접수되었습니다. 공개되면 이메일로 알려드리겠습니다.', err: '오류가 발생했습니다. 다시 시도해 주십시오.',
      stripTitle: '곧 공개', stripBody: '아직 공개 전인 보고서입니다. 다룰 내용을 확인하고 공개 시 이메일로 알림을 받으십시오.',
      noneTitle: '아직 라이브러리에 없습니다', noneBody: '찾으시는 내용과 이메일을 남겨 주십시오. 제작하게 되면 알려드리겠습니다.',
      kwReq: '알림 받기', reqKw: '요청 내용', soonTag: '곧 공개', exec: '핵심 요약 — 공개 시 열람할 수 있습니다.',
      planned: '예정된 구성', plannedNote: '조사를 시작하기 전의 계획입니다. 조사 결과에 따라 페이지 제목이 바뀔 수 있습니다.',
      peek: '미리보기', peekNote: '레이아웃 예시입니다. 실제 페이지, 차트, 수치는 보고서가 공개되는 날 확인할 수 있습니다.', peekTag: '공개 시 미리보기', peekExec: '핵심 요약',
      lib: '라이브러리로 돌아가기',
      inbox: '확인 메일을 보냈습니다. 보이지 않으면 스팸함을 확인하고 noreply@kiraresearch.com 을 연락처에 추가해 주십시오.',
      asked: '이 보고서의 공개 알림을 이미 신청하셨습니다. 공개 당일 이메일로 알려드리겠습니다.'
    },
    zh: {
      soon: '即将发布', crumbLib: '资料库', answer: '本报告将回答的问题',
      scoping: '本报告正在策划中', approved: '已批准 — 即将进入制作队列',
      queued: '已在制作队列中',
      steps: ['策划', '批准', '制作中', '审校', '发布'],
      emailPh: '工作邮箱', notify: '发布时邮件通知我',
      fine: '发布当天只发送一封邮件。读者要求的报告会排在制作计划最前面。',
      eta: '预计发布日期：{date}', etaFine: '提交请求后，我们将力争在此日期前发布，并邮件通知您。', price: '发布后价格：${price}。提交请求不收费。',
      sent: '已收到，报告发布时我们会邮件通知您。', err: '出现错误，请重试。',
      stripTitle: '即将发布', stripBody: '尚未发布。可先查看内容范围，发布时通过邮件获知。',
      noneTitle: '资料库中暂无', noneBody: '请告诉我们您的需求并留下邮箱。若我们决定制作，会通知您。',
      kwReq: '通知我', reqKw: '您的需求', soonTag: '即将发布', exec: '执行摘要 — 发布后可阅读。',
      planned: '计划章节', plannedNote: '研究开始前的计划，页面标题可能随研究证据调整。',
      peek: '内容预览', peekNote: '仅为版式示例，真实的页面、图表和数据将在报告发布当天呈现。', peekTag: '发布时预览', peekExec: '执行摘要',
      lib: '返回资料库',
      inbox: '确认邮件已发送。若未收到，请查看垃圾邮件箱，并将 noreply@kiraresearch.com 加入通讯录。',
      asked: '您已申请本报告的发布通知，发布当天我们会邮件通知您。'
    }
  };
  const s = k => (S[L] || S.en)[k] !== undefined ? (S[L] || S.en)[k] : S.en[k];

  // The reader's own browser remembers what they asked for, so coming back to the page shows
  // "you asked" instead of the form again. Convenience only: storage may be blocked, then the form shows.
  const KEY = 'kira-cs-asked';
  function asked(slug) {
    try { return (JSON.parse(localStorage.getItem(KEY)) || []).indexOf(slug) >= 0; } catch (_e) { return false; }
  }
  function remember(slug) {
    try {
      const l = (JSON.parse(localStorage.getItem(KEY)) || []).filter(x => x !== slug);
      l.push(slug); localStorage.setItem(KEY, JSON.stringify(l.slice(-200)));
    } catch (_e) { /* ignore */ }
  }

  function formHtml(attrs, button) {
    return '<form class="cs-form" data-cs-form ' + attrs + '>' +
      '<input type="email" name="email" required autocomplete="email" maxlength="200" placeholder="' + esc(s('emailPh')) + '" aria-label="' + esc(s('emailPh')) + '">' +
      '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0">' +
      '<button type="submit" class="r-btn r-btn-primary">' + esc(button) + '</button></form>' +
      '<p class="cs-fine">' + esc(s('fine')) + '</p>';
  }

  // "Expected by 15 October 2026": the date comes from /api/topic (S18); no date, no line.
  function etaHtml(t) {
    if (!t.eta || !t.eta.date) return '';
    let d;
    try {
      d = new Date(t.eta.date + 'T00:00:00Z').toLocaleDateString(L === 'zh' ? 'zh-CN' : L, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    } catch (_e) { d = t.eta.date; }
    return '<p class="cs-eta"><b>' + esc(s('eta').replace('{date}', d)) + '</b><br><span>' + esc(s('etaFine')) + '</span>' +
      (t.price ? '<br><span>' + esc(s('price').replace('${price}', '$' + t.price)) + '</span>' : '') + '</p>';
  }

  function stateLine(t) {
    if (t.state === 'in_production' || t.state === 'queued') return s('queued');
    return s(t.state === 'approved' ? 'approved' : 'scoping');
  }

  // Placeholder pages are noindex, except the English SEO-test pages (S20: api/topic.js `index`),
  // which get a description and no hreflang (their JA/KO/ZH twins stay noindex).
  function seoMeta(t) {
    if (t.index && L === 'en') {
      const d = [t.hook, t.buyer_question].filter(Boolean).join(' ').slice(0, 300);
      ['meta[name="description"]', '#meta-og-description'].forEach(q => { const e = document.querySelector(q); if (e) e.content = d; });
      document.querySelectorAll('link[data-kira-hreflang]').forEach(l => l.remove());
      return;
    }
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,follow'; document.head.appendChild(m);
  }

  // Free cover design: one of six CSS variants, picked by a stable hash of the slug (no image is generated).
  function coverIdx(slug) {
    let h = 0; const x = String(slug || '');
    for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) >>> 0;
    return h % 6;
  }

  // "A look inside": grey sample slides, one per chapter. Captions are the planned page titles
  // (or the guiding questions when nothing is planned yet). Layout only, no data.
  const SLIDES = [
    '<i class="sk-l w60"></i><i class="sk-l"></i><i class="sk-l"></i><i class="sk-l w80"></i><i class="sk-l w40"></i>',
    '<div class="sk-bars"><i style="height:35%"></i><i style="height:50%"></i><i style="height:62%"></i><i style="height:78%"></i><i style="height:92%"></i></div>',
    '<div class="sk-tbl"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
    '<div class="sk-split"><span class="sk-ring"></span><div><i class="sk-l"></i><i class="sk-l w80"></i><i class="sk-l w60"></i></div></div>',
    '<div class="sk-hbars"><i style="width:90%"></i><i style="width:70%"></i><i style="width:55%"></i><i style="width:38%"></i></div>'
  ];
  function peekHtml(t) {
    const ch = t.planned || [];
    const caps = ch.length
      ? ch.map(c => ({ k: c.title, c: c.pages[0] || '' }))
      : (t.questions || []).map(q => ({ k: '', c: q }));
    if (!caps.length) return '';
    const cards = caps.slice(0, 5).map((x, i) =>
      '<figure class="cs-slide"><div class="cs-slide-art" aria-hidden="true"><b>' + esc(i === 0 && !ch.length ? s('peekExec') : x.k || String(i + 1).padStart(2, '0')) + '</b>' +
        SLIDES[i % SLIDES.length] + '<span class="cs-slide-tag">' + esc(s('peekTag')) + '</span></div>' +
        '<figcaption>' + esc(x.c) + '</figcaption></figure>').join('');
    return '<h2>' + esc(s('peek')) + '</h2><div class="cs-peek">' + cards + '</div><p class="cs-exec">' + esc(s('peekNote')) + '</p>';
  }

  // Planned contents (chapters with page titles) when the topic has them, else the guiding questions.
  function contentsHtml(t) {
    if (t.planned && t.planned.length) {
      return '<h2>' + esc(s('planned')) + '</h2><p class="cs-exec">' + esc(s('plannedNote')) + '</p><ol class="cs-toc cs-toc2">' +
        t.planned.map(c =>
          '<li><div><b>' + esc(c.title) + '</b>' +
          '<ul>' + c.pages.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul></div></li>').join('') + '</ol>';
    }
    return t.questions && t.questions.length
      ? '<h2>' + esc(s('answer')) + '</h2><ol class="cs-toc">' + t.questions.map(q => '<li>' + esc(q) + '</li>').join('') + '</ol>' : '';
  }

  function page(root, t) {
    const done = t.state === 'scoping' ? 1 : t.state === 'approved' ? 2 : 3;
    const chips = [t.country, t.industry, t.competency, t.year].filter(Boolean);
    document.title = t.title + ' — KIRA RESEARCH';
    seoMeta(t);
    const cv = coverIdx(t.slug);

    root.innerHTML =
      '<div class="r-band"><div class="r-container">' +
        '<div class="r-crumbs"><a href="/' + L + '/library">' + esc(s('crumbLib')) + '</a><span class="sep">›</span><span>' + esc(t.country || '') + '</span></div>' +
        '<div class="cs-grid">' +
          '<div class="cs-cover cs-cv' + cv + '" aria-hidden="true"><span class="cs-ribbon">' + esc(s('soon')) + '</span>' +
            '<small>KIRA RESEARCH · ' + esc(t.country_code || '') + ' · ' + esc(t.year) + '</small>' +
            '<b>' + esc(t.title) + '</b><i>' + esc(t.competency || '') + '</i></div>' +
          '<div>' +
            '<div class="cs-chips">' + chips.map(c => '<span class="chip">' + esc(c) + '</span>').join('') + '</div>' +
            '<h1>' + esc(t.title) + '</h1>' +
            (t.buyer_question ? '<p class="cs-q">' + esc(t.buyer_question) + '</p>' : '') +
            '<div class="cs-status"><span class="cs-dot"></span>' + esc(stateLine(t)) + '</div>' +
            etaHtml(t) +
            '<ol class="cs-steps">' + s('steps').map((x, i) => '<li' + (i < done ? ' class="on"' : '') + '>' + esc(x) + '</li>').join('') + '</ol>' +
            '<div id="cs-req">' + (asked(t.slug)
              ? '<div class="cs-done" role="status">' + esc(s('asked')) + '</div>'
              : formHtml('data-topic="' + esc(t.slug) + '"', s('notify'))) + '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="r-container cs-body">' +
        peekHtml(t) + contentsHtml(t) +
        '<p class="cs-exec">' + esc(s('exec')) + '</p>' +
        '<p><a class="r-btn r-btn-outline" href="/' + L + '/library">' + esc(s('lib')) + '</a></p>' +
      '</div>';
  }

  function strip(items) {
    if (!items || !items.length) return '';
    return '<div class="cs-strip"><h3>' + esc(s('stripTitle')) + '</h3><p>' + esc(s('stripBody')) + '</p>' +
      items.map(t =>
        '<a class="cs-row" href="/' + L + '/reports/' + encodeURIComponent(t.slug) + '">' +
          '<span class="cs-tag">' + esc(s('soonTag')) + '</span><b>' + esc(t.title) + '</b>' +
          '<span class="cs-meta">' + esc([t.country, t.industry, t.year].filter(Boolean).join(' · ')) + '</span></a>').join('') +
      '</div>';
  }

  function requestBox(keyword) {
    return '<div class="cs-strip"><h3>' + esc(s('noneTitle')) + '</h3><p>' + esc(s('noneBody')) + '</p>' +
      '<p class="cs-kw">' + esc(s('reqKw')) + ': <b>' + esc(keyword) + '</b></p>' +
      formHtml('data-keyword="' + esc(keyword) + '"', s('kwReq')) + '</div>';
  }

  // One delegated handler for every request form on the page.
  document.addEventListener('submit', async e => {
    const f = e.target.closest && e.target.closest('[data-cs-form]');
    if (!f) return;
    e.preventDefault();
    const btn = f.querySelector('button'); btn.disabled = true;
    const body = { email: f.email.value, hp: f.hp.value, locale: L };
    if (f.dataset.topic) body.topic = f.dataset.topic;
    if (f.dataset.keyword) body.keyword = f.dataset.keyword;
    try {
      const r = await fetch('/api/topic-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('http ' + r.status);
      if (f.nextElementSibling) f.nextElementSibling.remove();   // the fine-print line
      remember(f.dataset.topic || ('kw:' + (f.dataset.keyword || '').toLowerCase()));
      f.outerHTML = '<div class="cs-done" role="status">' + esc(s('sent')) + '<br><small>' + esc(s('inbox')) + '</small></div>';
    } catch (_e) {
      btn.disabled = false;
      let msg = f.parentElement.querySelector('.cs-err');
      if (!msg) { msg = document.createElement('p'); msg.className = 'cs-err'; msg.setAttribute('role', 'alert'); f.after(msg); }
      msg.textContent = s('err');
    }
  });

  window.kiraComingSoon = { page, strip, requestBox };
})();
