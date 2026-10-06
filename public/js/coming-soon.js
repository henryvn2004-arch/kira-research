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
      queued: n => 'In the production queue — estimated ' + (n > 1 ? 'about ' + n + ' days' : 'within a day'),
      steps: ['Scoped', 'Approved', 'In production', 'Review', 'Published'],
      emailPh: 'Work email', notify: 'Email me when it is published',
      fine: 'One email, the day it is published. Requests from readers move a report up our schedule.',
      sent: 'Done — we will email you when this report is published.', err: 'Something went wrong. Please try again.',
      stripTitle: 'Coming soon', stripBody: 'Not published yet — read what each will cover and get an email when it is.',
      noneTitle: 'Not in the library yet', noneBody: 'Tell us what you are looking for and leave an email. We will tell you if we take it on.',
      kwReq: 'Notify me', reqKw: 'Your request', soonTag: 'Coming soon', exec: 'Executive summary — available on publication.',
      lib: 'Back to library'
    },
    ja: {
      soon: '近日公開', crumbLib: 'ライブラリ', answer: 'このレポートで答える問い',
      scoping: 'このレポートは企画中です', approved: '承認済み — 制作キューに入ります',
      queued: n => '制作キューに入っています — 公開まで約' + n + '日の見込み',
      steps: ['企画', '承認', '制作中', 'レビュー', '公開'],
      emailPh: '勤務先メールアドレス', notify: '公開時にメールで通知',
      fine: '公開当日に1通だけお送りします。ご要望の多いレポートは優先して制作します。',
      sent: '受け付けました。公開時にメールでお知らせします。', err: 'エラーが発生しました。もう一度お試しください。',
      stripTitle: '近日公開', stripBody: '未公開のレポートです。内容をご確認のうえ、公開時にメールで通知を受け取れます。',
      noneTitle: 'まだライブラリにありません', noneBody: 'お探しの内容とメールアドレスをお知らせください。制作する場合はご連絡します。',
      kwReq: '通知を受け取る', reqKw: 'ご要望', soonTag: '近日公開', exec: 'エグゼクティブサマリー — 公開時に閲覧できます。',
      lib: 'ライブラリに戻る'
    },
    ko: {
      soon: '곧 공개', crumbLib: '라이브러리', answer: '이 보고서가 답하는 질문',
      scoping: '이 보고서는 기획 중입니다', approved: '승인됨 — 제작 대기열에 들어갑니다',
      queued: n => '제작 대기열에 있습니다 — 공개까지 약 ' + n + '일 예상',
      steps: ['기획', '승인', '제작 중', '검토', '공개'],
      emailPh: '업무용 이메일', notify: '공개되면 이메일로 알림',
      fine: '공개 당일 한 번만 보내드립니다. 독자 요청이 많은 보고서를 우선 제작합니다.',
      sent: '접수되었습니다. 공개되면 이메일로 알려드리겠습니다.', err: '오류가 발생했습니다. 다시 시도해 주십시오.',
      stripTitle: '곧 공개', stripBody: '아직 공개 전인 보고서입니다. 다룰 내용을 확인하고 공개 시 이메일로 알림을 받으십시오.',
      noneTitle: '아직 라이브러리에 없습니다', noneBody: '찾으시는 내용과 이메일을 남겨 주십시오. 제작하게 되면 알려드리겠습니다.',
      kwReq: '알림 받기', reqKw: '요청 내용', soonTag: '곧 공개', exec: '핵심 요약 — 공개 시 열람할 수 있습니다.',
      lib: '라이브러리로 돌아가기'
    },
    zh: {
      soon: '即将发布', crumbLib: '资料库', answer: '本报告将回答的问题',
      scoping: '本报告正在策划中', approved: '已批准 — 即将进入制作队列',
      queued: n => '已在制作队列中 — 预计约 ' + n + ' 天',
      steps: ['策划', '批准', '制作中', '审校', '发布'],
      emailPh: '工作邮箱', notify: '发布时邮件通知我',
      fine: '发布当天只发送一封邮件。读者的请求会让报告优先制作。',
      sent: '已收到，报告发布时我们会邮件通知您。', err: '出现错误，请重试。',
      stripTitle: '即将发布', stripBody: '尚未发布。可先查看内容范围，发布时通过邮件获知。',
      noneTitle: '资料库中暂无', noneBody: '请告诉我们您的需求并留下邮箱。若我们决定制作，会通知您。',
      kwReq: '通知我', reqKw: '您的需求', soonTag: '即将发布', exec: '执行摘要 — 发布后可阅读。',
      lib: '返回资料库'
    }
  };
  const s = k => (S[L] || S.en)[k] !== undefined ? (S[L] || S.en)[k] : S.en[k];

  function formHtml(attrs, button) {
    return '<form class="cs-form" data-cs-form ' + attrs + '>' +
      '<input type="email" name="email" required autocomplete="email" maxlength="200" placeholder="' + esc(s('emailPh')) + '" aria-label="' + esc(s('emailPh')) + '">' +
      '<input type="text" name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;opacity:0;height:0">' +
      '<button type="submit" class="r-btn r-btn-primary">' + esc(button) + '</button></form>' +
      '<p class="cs-fine">' + esc(s('fine')) + '</p>';
  }

  function stateLine(t) {
    if (t.state === 'in_production' || t.state === 'queued') return s('queued')(t.eta_days || 1);
    return s(t.state === 'approved' ? 'approved' : 'scoping');
  }

  function page(root, t) {
    const done = t.state === 'scoping' ? 1 : t.state === 'approved' ? 2 : 3;
    const chips = [t.country, t.industry, t.competency, t.year].filter(Boolean);
    document.title = t.title + ' — KIRA RESEARCH';
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,follow'; document.head.appendChild(m);

    root.innerHTML =
      '<div class="r-band"><div class="r-container">' +
        '<div class="r-crumbs"><a href="/' + L + '/library">' + esc(s('crumbLib')) + '</a><span class="sep">›</span><span>' + esc(t.country || '') + '</span></div>' +
        '<div class="cs-grid">' +
          '<div class="cs-cover" aria-hidden="true"><span class="cs-ribbon">' + esc(s('soon')) + '</span>' +
            '<small>KIRA RESEARCH · ' + esc(t.country_code || '') + ' · ' + esc(t.year) + '</small>' +
            '<b>' + esc(t.title) + '</b><i>' + esc(t.competency || '') + '</i></div>' +
          '<div>' +
            '<div class="cs-chips">' + chips.map(c => '<span class="chip">' + esc(c) + '</span>').join('') + '</div>' +
            '<h1>' + esc(t.title) + '</h1>' +
            (t.buyer_question ? '<p class="cs-q">' + esc(t.buyer_question) + '</p>' : '') +
            '<div class="cs-status"><span class="cs-dot"></span>' + esc(stateLine(t)) + '</div>' +
            '<ol class="cs-steps">' + s('steps').map((x, i) => '<li' + (i < done ? ' class="on"' : '') + '>' + esc(x) + '</li>').join('') + '</ol>' +
            '<div id="cs-req">' + formHtml('data-topic="' + esc(t.slug) + '"', s('notify')) + '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>' +
      '<div class="r-container cs-body">' +
        (t.questions && t.questions.length
          ? '<h2>' + esc(s('answer')) + '</h2><ol class="cs-toc">' + t.questions.map(q => '<li>' + esc(q) + '</li>').join('') + '</ol>' : '') +
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
      f.outerHTML = '<div class="cs-done" role="status">' + esc(s('sent')) + '</div>';
    } catch (_e) {
      btn.disabled = false;
      let msg = f.parentElement.querySelector('.cs-err');
      if (!msg) { msg = document.createElement('p'); msg.className = 'cs-err'; msg.setAttribute('role', 'alert'); f.after(msg); }
      msg.textContent = s('err');
    }
  });

  window.kiraComingSoon = { page, strip, requestBox };
})();
