// Kira Data (D4): company moves pages, rendered inside /<locale>/data/_view.html.
//   /<locale>/data/moves                     the feed, filters ?host=VN&investor=JP&type=acquisition
//   /<locale>/data/<investor>-in-<host>      a corridor page, e.g. /en/data/japan-in-vietnam
// Data from /api/moves (published moves from public sources only). Headlines link to their publisher.
(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const L = ['en', 'ja', 'ko', 'zh'].includes(parts[0]) ? parts[0] : 'en';
  const NUM = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' }[L];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slugOf = (n) => String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Investors with a corridor page; hosts are the 15 markets (names from the API).
  const INVESTOR_SLUG = { japan: 'JP', 'south-korea': 'KR', taiwan: 'TW', singapore: 'SG', china: 'CN' };
  const HOST_SLUG = { vietnam: 'VN', thailand: 'TH', indonesia: 'ID', malaysia: 'MY', philippines: 'PH', singapore: 'SG', taiwan: 'TW', australia: 'AU',
    'new-zealand': 'NZ', cambodia: 'KH', laos: 'LA', myanmar: 'MM', brunei: 'BN', japan: 'JP', 'south-korea': 'KR' };

  const T = {
    en: {
      feedH1: 'Company moves into Asia-Pacific markets', feedLead: 'Investments, acquisitions, new plants and subsidiaries in the 15 markets KIRA covers, checked by our analysts before they appear here.',
      corrH1: (i, h) => `${i} in ${h}: investment and company moves`, corrLead: (i, h) => `Direct investment, trade and the latest company moves from ${i} into ${h}.`,
      all: 'All', host: 'Market', investor: 'From', typeCol: 'Type', more: 'Show older moves', none: 'No moves published here yet. We add them as they happen.',
      moves: 'Latest company moves', links: 'Investment, trade and visitors', also: (n) => `also reported by ${n} more`, hostData: (h) => `Market data for ${h}`, reports: (h) => `KIRA reports on ${h}`,
      allMoves: 'All company moves', win: (b) => `12 months to ${b}`, winQ: (b) => `4 quarters to ${b}`, ytd: (a, b) => `${a} – ${b}`, ofYear: (y) => `${y}`, quarter: (y, q) => `Q${q} ${y}`, change: 'vs. year before', loadFail: 'Could not load the data. Please retry in a moment.',
      link: { FDI_NET_X: (r, p) => `${r} direct investment in ${p} (net)`, FDI_NET_M: (r, p) => `${p} direct investment in ${r} (net)`, FDI_APPROVED_M: (r, p) => `Approved investment from ${p} in ${r}`,
        FDI_REALISED_M: (r, p) => p ? `Realised investment from ${p} in ${r}` : `Realised foreign investment in ${r}`,
        FDI_REG_YTD_M: (r, p) => p ? `Registered investment from ${p} in ${r} (new + added capital)` : `Registered foreign investment in ${r} (new + added capital)`,
        FDI_APPROVED_X: (r, p) => p ? `Approved investment from ${r} in ${p}` : `Approved outward investment from ${r}`,
        TOTAL_X: (r, p) => `${r} exports to ${p}`, TOTAL_M: (r, p) => `${r} imports from ${p}`, VISITORS_M: (r, p) => `Visitors from ${p} to ${r}` },
      type: { acquisition: 'Acquisition', stake: 'Stake', investment: 'Investment', plant: 'New plant', jv: 'Joint venture', subsidiary: 'New subsidiary or office', expansion: 'Expansion', exit: 'Exit', other: 'Other' },
      extra: { CN: 'China', HK: 'Hong Kong', US: 'United States', IN: 'India', DE: 'Germany', FR: 'France', GB: 'United Kingdom' }, unknown: 'Unknown'
    },
    ja: {
      feedH1: 'アジア太平洋市場への企業の動き', feedLead: 'KIRAが対象とする15市場への投資、買収、工場新設、子会社設立。アナリストが確認したものだけを掲載しています。',
      corrH1: (i, h) => `${i}→${h}：投資と企業の動き`, corrLead: (i, h) => `${i}から${h}への直接投資、貿易、最新の企業の動き。`,
      all: 'すべて', host: '市場', investor: '投資元', typeCol: '種類', more: 'さらに表示', none: 'まだ掲載された動きはありません。発生し次第追加します。',
      moves: '最新の企業の動き', links: '投資・貿易・訪問者', also: (n) => `ほか${n}件の報道`, hostData: (h) => `${h}の市場データ`, reports: (h) => `${h}に関するKIRAレポート`,
      allMoves: '企業の動き一覧', win: (b) => `${b}までの12か月`, winQ: (b) => `${b}までの4四半期`, ytd: (a, b) => `${a}～${b}`, ofYear: (y) => `${y}年`, quarter: (y, q) => `${y}年第${q}四半期`, change: '前年比', loadFail: 'データを読み込めませんでした。しばらくしてから再度お試しください。',
      link: { FDI_NET_X: (r, p) => `${r}の${p}への直接投資（ネット）`, FDI_NET_M: (r, p) => `${p}の${r}への直接投資（ネット）`, FDI_APPROVED_M: (r, p) => `${p}から${r}への認可投資額`,
        FDI_REALISED_M: (r, p) => p ? `${p}から${r}への投資実行額` : `${r}への外国投資実行額`,
        FDI_REG_YTD_M: (r, p) => p ? `${p}から${r}への登録投資額（新規＋増資）` : `${r}への外国投資登録額（新規＋増資）`,
        FDI_APPROVED_X: (r, p) => p ? `${r}から${p}への認可投資額` : `${r}の対外投資認可額`,
        TOTAL_X: (r, p) => `${r}から${p}への輸出`, TOTAL_M: (r, p) => `${r}の${p}からの輸入`, VISITORS_M: (r, p) => `${p}から${r}への訪問者数` },
      type: { acquisition: '買収', stake: '出資・株式取得', investment: '投資', plant: '工場新設', jv: '合弁', subsidiary: '子会社・拠点設立', expansion: '事業拡大', exit: '撤退・売却', other: 'その他' },
      extra: { CN: '中国', HK: '香港', US: '米国', IN: 'インド', DE: 'ドイツ', FR: 'フランス', GB: '英国' }, unknown: '不明'
    },
    ko: {
      feedH1: '아시아·태평양 시장의 기업 동향', feedLead: 'KIRA가 다루는 15개 시장으로의 투자, 인수, 공장 신설, 법인 설립. 애널리스트가 확인한 건만 싣습니다.',
      corrH1: (i, h) => `${i}→${h}: 투자와 기업 동향`, corrLead: (i, h) => `${i}에서 ${h}로의 직접투자, 무역, 최신 기업 동향.`,
      all: '전체', host: '시장', investor: '투자국', typeCol: '유형', more: '이전 동향 더 보기', none: '아직 게시된 동향이 없습니다. 발생하는 대로 추가합니다.',
      moves: '최신 기업 동향', links: '투자·무역·방문객', also: (n) => `외 ${n}건 보도`, hostData: (h) => `${h} 시장 데이터`, reports: (h) => `${h} 관련 KIRA 보고서`,
      allMoves: '기업 동향 전체', win: (b) => `${b}까지 12개월`, winQ: (b) => `${b}까지 4개 분기`, ytd: (a, b) => `${a}~${b}`, ofYear: (y) => `${y}년`, quarter: (y, q) => `${y}년 ${q}분기`, change: '전년 대비', loadFail: '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
      link: { FDI_NET_X: (r, p) => `${r}의 ${p} 직접투자(순)`, FDI_NET_M: (r, p) => `${p}의 ${r} 직접투자(순)`, FDI_APPROVED_M: (r, p) => `${p}에서 ${r}로의 승인 투자액`,
        FDI_REALISED_M: (r, p) => p ? `${p}의 ${r} 투자 실행액` : `${r} 외국인투자 실행액`,
        FDI_REG_YTD_M: (r, p) => p ? `${p}의 ${r} 등록 투자액(신규+증액)` : `${r} 외국인투자 등록액(신규+증액)`,
        FDI_APPROVED_X: (r, p) => p ? `${r}의 ${p} 승인 투자액` : `${r} 해외투자 승인액`,
        TOTAL_X: (r, p) => `${r}의 ${p} 수출`, TOTAL_M: (r, p) => `${r}의 ${p}산 수입`, VISITORS_M: (r, p) => `${p}발 ${r} 방문객` },
      type: { acquisition: '인수', stake: '지분 취득', investment: '투자', plant: '공장 신설', jv: '합작', subsidiary: '법인·사무소 설립', expansion: '확장', exit: '철수·매각', other: '기타' },
      extra: { CN: '중국', HK: '홍콩', US: '미국', IN: '인도', DE: '독일', FR: '프랑스', GB: '영국' }, unknown: '미상'
    },
    zh: {
      feedH1: '企业进入亚太市场动态', feedLead: 'KIRA覆盖的15个市场中的投资、收购、新建工厂和设立子公司，经分析师核实后发布。',
      corrH1: (i, h) => `${i}→${h}：投资与企业动态`, corrLead: (i, h) => `${i}对${h}的直接投资、贸易及最新企业动态。`,
      all: '全部', host: '市场', investor: '投资来源', typeCol: '类型', more: '查看更早动态', none: '暂无已发布的动态，有新动态时会及时添加。',
      moves: '最新企业动态', links: '投资、贸易与访客', also: (n) => `另有${n}家媒体报道`, hostData: (h) => `${h}市场数据`, reports: (h) => `KIRA关于${h}的报告`,
      allMoves: '全部企业动态', win: (b) => `截至${b}的12个月`, winQ: (b) => `截至${b}的4个季度`, ytd: (a, b) => `${a}至${b}`, ofYear: (y) => `${y}年`, quarter: (y, q) => `${y}年第${q}季度`, change: '同比', loadFail: '无法加载数据，请稍后重试。',
      link: { FDI_NET_X: (r, p) => `${r}对${p}直接投资（净额）`, FDI_NET_M: (r, p) => `${p}对${r}直接投资（净额）`, FDI_APPROVED_M: (r, p) => `${p}对${r}的获批投资`,
        FDI_REALISED_M: (r, p) => p ? `${p}对${r}的实际投资` : `${r}实际利用外资`,
        FDI_REG_YTD_M: (r, p) => p ? `${p}对${r}的登记投资（新增+增资）` : `${r}外资登记额（新增+增资）`,
        FDI_APPROVED_X: (r, p) => p ? `${r}对${p}的获批投资` : `${r}获批对外投资`,
        TOTAL_X: (r, p) => `${r}对${p}出口`, TOTAL_M: (r, p) => `${r}自${p}进口`, VISITORS_M: (r, p) => `${p}赴${r}访客` },
      type: { acquisition: '收购', stake: '入股', investment: '投资', plant: '新建工厂', jv: '合资', subsidiary: '设立子公司或办事处', expansion: '扩张', exit: '退出', other: '其他' },
      extra: { CN: '中国', HK: '香港', US: '美国', IN: '印度', DE: '德国', FR: '法国', GB: '英国' }, unknown: '未知'
    }
  }[L];

  // Country names not in the database or T.extra come from the browser, in the page's language.
  const region = (code) => { try { return new Intl.DisplayNames([L === 'zh' ? 'zh-CN' : L], { type: 'region' }).of(code) || code; } catch (_e) { return code; } };
  const compact = new Intl.NumberFormat(NUM, { notation: 'compact', maximumSignificantDigits: 3 });
  const pct1 = new Intl.NumberFormat(NUM, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const money = {};
  const cur = (v, c) => (c === 'persons' ? compact.format(v) : (money[c] = money[c] || new Intl.NumberFormat(NUM, { style: 'currency', currency: c, notation: 'compact', maximumSignificantDigits: 3 })).format(v));
  const dateFmt = new Intl.DateTimeFormat(NUM, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const monthFmt = new Intl.DateTimeFormat(NUM, { year: 'numeric', month: 'short', timeZone: 'UTC' });
  function per(p) {
    const q = /^(\d{4})-Q([1-4])$/.exec(p);
    if (q) return T.quarter(q[1], q[2]);
    const m = /^(\d{4})-(\d{2})$/.exec(p);
    if (m) return monthFmt.format(new Date(Date.UTC(+m[1], +m[2] - 1, 1)));
    return T.ofYear(p);
  }

  function handles(slug) { return slug === 'moves' || corridorOf(slug) !== null; }
  function corridorOf(slug) {
    const m = /^([a-z-]+)-in-([a-z-]+)$/.exec(slug || '');
    if (!m || !INVESTOR_SLUG[m[1]] || !HOST_SLUG[m[2]] || INVESTOR_SLUG[m[1]] === HOST_SLUG[m[2]]) return null;
    return { investor: INVESTOR_SLUG[m[1]], host: HOST_SLUG[m[2]] };
  }

  function list(events, nm) {
    if (!events.length) return '<p class="mv-none">' + esc(T.none) + '</p>';
    return '<ol class="mv-list">' + events.map((e) => '<li><time datetime="' + esc(e.event_date) + '">' + esc(dateFmt.format(new Date(e.event_date + 'T00:00:00Z'))) + '</time>' +
      '<div><span class="mv-type mv-' + esc(e.type) + '">' + esc(T.type[e.type] || e.type) + '</span>' +
      '<span class="mv-route">' + esc(e.investor_country ? nm(e.investor_country) : T.unknown) + ' → ' + esc(nm(e.host_country)) + '</span>' +
      (e.company ? '<b class="mv-co">' + esc(e.company) + '</b>' : '') +
      '<a class="mv-title" href="' + esc(e.url) + '" target="_blank" rel="noopener nofollow">' + esc(e.title) + '</a>' +
      '<small>' + esc(e.domain || '') + (e.also ? ' · ' + esc(T.also(e.also)) : '') + '</small></div></li>').join('') + '</ol>';
  }
  function credits(sources) {
    return '<div class="ed-sources">' + sources.map((s) => '<span>' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.attribution) + '</a>' : esc(s.attribution)) + '</span>').join('') + '</div>';
  }
  async function get(qs) {
    const r = await fetch('/api/moves?' + new URLSearchParams(qs).toString());
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  async function render(root, slug) {
    const R = window.kiraR;
    const cname = (n) => (R && R.country ? R.country(n) : n);
    const crumb = document.getElementById('ed-crumb-country');
    const crumbData = document.getElementById('ed-crumb-data');
    if (crumbData) crumbData.href = '/' + L + '/data/';
    const fail = () => { root.innerHTML = '<div class="r-empty" style="margin-block:64px"><h3>' + esc(T.loadFail) + '</h3></div>'; };

    // ---- corridor page ----
    const c = corridorOf(slug);
    if (c) {
      let d;
      try { d = await get({ host: c.host, investor: c.investor, limit: 30 }); } catch (_e) { return fail(); }
      const nm = (code) => (d.names[code] ? cname(d.names[code]) : T.extra[code] || region(code));
      const I = nm(c.investor), H = nm(c.host);
      document.title = T.corrH1(I, H) + ' — KIRA Research';
      if (crumb) crumb.textContent = I + ' → ' + H;
      const links = (d.corridor ? d.corridor.links : []).filter((l) => T.link[l.product + '_' + l.flow]);
      const tiles = links.map((l) => {
        const ch = l.prev && l.prev > 0 && l.value > 0 ? (l.value / l.prev - 1) * 100 : null;
        return '<div class="ed-tile"><span class="lbl">' + esc(T.link[l.product + '_' + l.flow](nm(l.reporter), nm(l.partner))) + '</span>' +
          '<span class="val">' + esc(cur(l.value, l.currency)) + '</span><span class="sub">' + esc(l.freq === 'A' ? per(l.period) : /_YTD$/.test(l.product) ? T.ytd(per(l.from), per(l.period)) : l.freq === 'Q' ? T.winQ(per(l.period)) : T.win(per(l.period))) +
          (ch === null ? '' : ' · ' + esc((ch > 0 ? '+' : '') + pct1.format(ch) + '% ' + T.change)) + '</span></div>';
      }).join('');
      const hostSlug = slugOf(d.names[c.host]);
      root.innerHTML = '<div class="ed-main"><div class="ed-head"><h1>' + esc(T.corrH1(I, H)) + '</h1><p class="ed-lead">' + esc(T.corrLead(I, H)) + '</p></div>' +
        (tiles ? '<section class="ed-section"><h2>' + esc(T.links) + '</h2><div class="ed-tiles">' + tiles + '</div></section>' : '') +
        '<section class="ed-section"><h2>' + esc(T.moves) + '</h2>' + list(d.events, nm) + '</section>' +
        '<section class="ed-section">' + credits(d.sources) + '<div class="ed-links">' +
        '<a class="r-btn r-btn-outline" href="/' + L + '/data/' + esc(hostSlug) + '">' + esc(T.hostData(H)) + '</a>' +
        '<a class="r-btn r-btn-outline" href="/' + L + '/library?country=' + encodeURIComponent(String(d.names[c.host] || '').toLowerCase()) + '">' + esc(T.reports(H)) + '</a>' +
        '<a class="r-btn r-btn-outline" href="/' + L + '/data/moves?host=' + c.host + '">' + esc(T.allMoves) + '</a></div></section></div>';
      return;
    }

    // ---- feed ----
    const qs = new URLSearchParams(location.search);
    const f = { host: qs.get('host') || '', investor: qs.get('investor') || '', type: qs.get('type') || '' };
    let d;
    try { d = await get({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), limit: 50 }); } catch (_e) { return fail(); }
    const nm = (code) => (d.names[code] ? cname(d.names[code]) : T.extra[code] || region(code));
    document.title = T.feedH1 + ' — KIRA Research';
    if (crumb) crumb.textContent = T.allMoves;
    const opt = (v, label, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>';
    const hosts = Object.values(HOST_SLUG), investors = ['JP', 'KR', 'TW', 'SG', 'CN', 'HK', 'US'];
    const filters = '<form class="mv-filters" id="mv-f">' +
      '<label>' + esc(T.host) + '<select name="host">' + opt('', T.all, f.host) + hosts.map((h) => opt(h, nm(h), f.host)).join('') + '</select></label>' +
      '<label>' + esc(T.investor) + '<select name="investor">' + opt('', T.all, f.investor) + investors.map((h) => opt(h, nm(h), f.investor)).join('') + '</select></label>' +
      '<label>' + esc(T.typeCol) + '<select name="type">' + opt('', T.all, f.type) + Object.keys(T.type).map((k) => opt(k, T.type[k], f.type)).join('') + '</select></label></form>';
    root.innerHTML = '<div class="ed-main"><div class="ed-head"><h1>' + esc(T.feedH1) + '</h1><p class="ed-lead">' + esc(T.feedLead) + '</p></div>' + filters +
      '<section class="ed-section" id="mv-out">' + list(d.events, nm) + '</section>' +
      (d.events.length === 50 ? '<p><button type="button" class="r-btn r-btn-outline" id="mv-more">' + esc(T.more) + '</button></p>' : '') +
      '<section class="ed-section">' + credits(d.sources) + '</section></div>';
    document.getElementById('mv-f').addEventListener('change', (e) => {
      const p = new URLSearchParams(new FormData(e.currentTarget));
      for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
      location.search = p.toString();
    });
    const more = document.getElementById('mv-more');
    if (more) more.addEventListener('click', async () => {
      more.disabled = true;
      const lastDate = d.events[d.events.length - 1].event_date;
      try {
        const next = await get({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), limit: 50, before: lastDate });
        document.getElementById('mv-out').insertAdjacentHTML('beforeend', list(next.events, nm));
        if (next.events.length < 50) more.remove(); else { d = next; more.disabled = false; }
      } catch (_e) { more.disabled = false; }
    });
  }

  window.kiraMoves = { handles, render };
})();
