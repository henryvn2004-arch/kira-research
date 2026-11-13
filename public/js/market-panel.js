// Kira Data (D3): the "Market data" panel on report pages and coming-soon pages.
//   window.kiraMarket.mount(el, { report: slug } | { topic: slug })
// Numbers come from /api/market-data (public sources only). The lead sentence is a fixed template filled with
// the latest values; nothing is written by a model. Renders nothing when the API has no data for the market.
(function () {
  const parts = location.pathname.split('/').filter(Boolean);
  const L = ['en', 'ja', 'ko', 'zh'].includes(parts[0]) ? parts[0] : 'en';
  const NUM = { en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN' }[L];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const T = {
    en: {
      title: 'Market data', sub: (c) => `Public statistics on ${c}, refreshed every week.`,
      all: (c) => `All market data for ${c}`, change: 'vs. year before', share: 'Share', year: 'Year', value: 'Value', flowCol: 'Trade flow',
      shareNote: 'Share: of the EU\'s trade with countries outside the EU, or of the reporting country\'s trade with the world.',
      chapter: (c) => `whole HS chapter ${c}`,
      M: (r, c) => `${r} imports from ${c}`, X: (r, c) => `${r} exports to ${c}`,
      fdi: (c) => `Japan's direct investment in ${c} (net)`, visitors: (c) => `Visitor arrivals in ${c}`, top: 'Largest origins',
      win: (a, b) => `12 months to ${b}`, quarter: (y, q) => `Q${q} ${y}`, ofYear: (y) => `${y}`,
      reporter: { EU: 'the EU', US: 'the US' },
      leadTrade: (v) => `In ${v.year}, ${v.reporter} bought <b>${v.value}</b> of ${v.product} from ${v.country}` + (v.share ? `, <b>${v.share}</b> of its ${v.eu ? 'imports from outside the EU' : 'imports'}.` : '.'),
      leadMacro: (v) => `${v.country}'s economy grew <b>${v.growth}</b> in ${v.year}` + (v.inflation ? `, with inflation at <b>${v.inflation}</b>.` : '.'),
      extra: { CN: 'China', HK: 'Hong Kong', US: 'United States', ASEAN: 'ASEAN', EU: 'EU' }
    },
    ja: {
      title: '市場データ', sub: (c) => `${c}の公的統計（毎週更新）`,
      all: (c) => `${c}の市場データをすべて見る`, change: '前年比', share: 'シェア', year: '年', value: '金額', flowCol: '貿易フロー',
      shareNote: 'シェア：EUについては域外との貿易に占める割合、その他の報告国については対世界貿易に占める割合。',
      chapter: (c) => `HS第${c}類全体`,
      M: (r, c) => `${r}の${c}からの輸入`, X: (r, c) => `${r}から${c}への輸出`,
      fdi: (c) => `日本の${c}への直接投資（ネット）`, visitors: (c) => `${c}への訪問者数`, top: '主な出発国・地域',
      win: (a, b) => `${b}までの12か月`, quarter: (y, q) => `${y}年第${q}四半期`, ofYear: (y) => `${y}年`,
      reporter: { EU: 'EU', US: '米国' },
      leadTrade: (v) => `${v.year}年、${v.reporter}は${v.country}から${v.product}を<b>${v.value}</b>輸入しました` + (v.share ? `（${v.eu ? 'EU域外からの輸入' : '輸入全体'}の<b>${v.share}</b>）。` : '。'),
      leadMacro: (v) => `${v.country}の${v.year}年の実質GDP成長率は<b>${v.growth}</b>` + (v.inflation ? `、インフレ率は<b>${v.inflation}</b>でした。` : 'でした。'),
      extra: { CN: '中国', HK: '香港', US: '米国', ASEAN: 'ASEAN', EU: 'EU' }
    },
    ko: {
      title: '시장 데이터', sub: (c) => `${c} 공식 통계, 매주 갱신`,
      all: (c) => `${c} 시장 데이터 전체 보기`, change: '전년 대비', share: '비중', year: '연도', value: '금액', flowCol: '무역 흐름',
      shareNote: '비중: EU는 역외 국가와의 교역 대비, 그 밖의 보고국은 대세계 교역 대비 비중입니다.',
      chapter: (c) => `HS 제${c}류 전체`,
      M: (r, c) => `${r}의 ${c}산 수입`, X: (r, c) => `${r}의 ${c} 수출`,
      fdi: (c) => `일본의 ${c} 직접투자(순)`, visitors: (c) => `${c} 방문객 수`, top: '주요 출발국',
      win: (a, b) => `${b}까지 12개월`, quarter: (y, q) => `${y}년 ${q}분기`, ofYear: (y) => `${y}년`,
      reporter: { EU: 'EU', US: '미국' },
      leadTrade: (v) => `${v.year}년 ${v.reporter}의 ${v.country}산 ${v.product} 수입액은 <b>${v.value}</b>` + (v.share ? `로, ${v.eu ? 'EU 역외 수입' : '전체 수입'}의 <b>${v.share}</b>를 차지했습니다.` : '입니다.'),
      leadMacro: (v) => `${v.country}의 ${v.year}년 실질 GDP 성장률은 <b>${v.growth}</b>` + (v.inflation ? `, 물가상승률은 <b>${v.inflation}</b>입니다.` : '입니다.'),
      extra: { CN: '중국', HK: '홍콩', US: '미국', ASEAN: '아세안', EU: 'EU' }
    },
    zh: {
      title: '市场数据', sub: (c) => `${c}官方统计，每周更新。`,
      all: (c) => `查看${c}全部市场数据`, change: '同比', share: '占比', year: '年份', value: '金额', flowCol: '贸易流向',
      shareNote: '占比：欧盟为占其与欧盟以外国家贸易的比重，其他报告国为占其对全球贸易的比重。',
      chapter: (c) => `HS第${c}章合计`,
      M: (r, c) => `${r}自${c}进口`, X: (r, c) => `${r}对${c}出口`,
      fdi: (c) => `日本对${c}直接投资（净额）`, visitors: (c) => `${c}入境访客`, top: '主要来源地',
      win: (a, b) => `截至${b}的12个月`, quarter: (y, q) => `${y}年第${q}季度`, ofYear: (y) => `${y}年`,
      reporter: { EU: '欧盟', US: '美国' },
      leadTrade: (v) => `${v.year}年，${v.reporter}自${v.country}进口${v.product}<b>${v.value}</b>` + (v.share ? `，占其${v.eu ? '自欧盟以外地区进口' : '进口总额'}的<b>${v.share}</b>。` : '。'),
      leadMacro: (v) => `${v.country}${v.year}年实际GDP增长<b>${v.growth}</b>` + (v.inflation ? `，通胀率为<b>${v.inflation}</b>。` : '。'),
      extra: { CN: '中国', HK: '香港', US: '美国', ASEAN: '东盟', EU: '欧盟' }
    }
  }[L];

  const compact = new Intl.NumberFormat(NUM, { notation: 'compact', maximumSignificantDigits: 3 });
  const dec = (d) => new Intl.NumberFormat(NUM, { minimumFractionDigits: d, maximumFractionDigits: d });
  const money = {};
  const cur = (v, c) => (money[c] = money[c] || new Intl.NumberFormat(NUM, { style: 'currency', currency: c, notation: 'compact', maximumSignificantDigits: 3 })).format(v);
  const pct = (v) => dec(1).format(v) + '%';
  const sharePct = (v) => (v < 0.1 ? '<' + dec(1).format(0.1) + '%' : pct(v));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function fmt(v, unit, currency) {
    if (v === null || v === undefined || !Number.isFinite(v)) return '–';
    if (currency && (unit === 'lcu' || !unit)) return cur(v, currency);
    if (unit === 'usd') return 'US$' + compact.format(v);
    if (unit === 'usd_per_person') return 'US$' + new Intl.NumberFormat(NUM, { maximumFractionDigits: 0 }).format(v);
    if (unit === 'pct') return pct(v);
    if (unit === 'lcu_per_usd') return Math.abs(v) >= 100 ? new Intl.NumberFormat(NUM, { maximumFractionDigits: 0 }).format(v) : dec(2).format(v);
    return compact.format(v);
  }
  const monthFmt = new Intl.DateTimeFormat(NUM, { year: 'numeric', month: 'short', timeZone: 'UTC' });
  function per(p) {
    const q = /^(\d{4})-Q([1-4])$/.exec(p);
    if (q) return T.quarter(q[1], q[2]);
    const m = /^(\d{4})-(\d{2})$/.exec(p);
    if (m) return monthFmt.format(new Date(Date.UTC(+m[1], +m[2] - 1, 1)));
    return T.ofYear(p);
  }
  const change = (a, b) => (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0 ? (a / b - 1) * 100 : null);
  const signed = (x) => (x === null ? '–' : (x > 0 ? '+' : '') + pct(x));

  function spark(vals) {
    if (!vals || vals.length < 2) return '';
    const W = 120, H = 28, mn = Math.min(...vals), mx = Math.max(...vals);
    const px = (i) => 2 + i * (W - 4) / (vals.length - 1), py = (x) => H - 3 - (H - 6) * (x - mn) / ((mx - mn) || 1);
    const pts = vals.map((x, i) => `${px(i).toFixed(1)},${py(x).toFixed(1)}`).join(' ');
    return '<svg class="mk-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon points="' + px(0) + ',' + H + ' ' + pts + ' ' + px(vals.length - 1) + ',' + H + '" fill="rgba(26,102,240,.12)"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="var(--primary)" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  }

  function render(d) {
    const R = window.kiraR;
    const cname = (n) => (R && R.country ? R.country(n) : n);
    const C = cname(d.country.name);
    const nm = (code) => T.reporter[code] || (d.names && d.names[code] ? cname(d.names[code]) : T.extra[code] || code);
    const label = (o) => (o && (o[L] || o.en)) || '';

    // Lead sentence: the import flow where the market weighs most (its share of the reporter's imports, at least 1%),
    // else growth and inflation.
    let lead = '', best = null;
    for (const b of d.trade) {
      for (const r of b.rows) {
        if (r.flow !== 'M' || r.chapter) continue;
        const p = r.series[r.series.length - 1], s = r.share.find((x) => x[0] === p[0]);
        if (s && s[1] >= 1 && (!best || s[1] > best.s[1])) best = { b, r, p, s };
      }
    }
    if (best) {
      lead = T.leadTrade({ year: esc(best.p[0]), reporter: esc(nm(best.r.reporter)), value: esc(cur(best.p[1], best.r.currency)), product: esc(label(best.b.label).toLowerCase()),
        country: esc(C), share: esc(pct(best.s[1])), eu: best.r.reporter === 'EU' });
      if (L === 'en') lead = cap(lead);
    } else {
      const g = d.macro.find((m) => m.key === 'gdp_growth'), inf = d.macro.find((m) => m.key === 'inflation');
      if (g) lead = T.leadMacro({ country: esc(C), year: esc(g.period), growth: esc(pct(g.value)), inflation: inf && inf.period === g.period ? esc(pct(inf.value)) : '' });
    }

    const tile = (lbl, val, sub, sp) => '<div class="mk-tile"><span class="lbl">' + esc(lbl) + '</span><span class="val">' + esc(val) + '</span>' +
      '<span class="sub">' + esc(sub) + '</span>' + spark(sp) + '</div>';
    const tiles = d.macro.map((m) => tile(label(m.label), fmt(m.value, m.unit, m.currency), per(m.period), m.spark));
    if (d.fdi) tiles.push(tile(T.fdi(C), cur(d.fdi.value, d.fdi.currency), T.win(per(d.fdi.from), per(d.fdi.period)) + (d.fdi.prev ? ' · ' + signed(change(d.fdi.value, d.fdi.prev)) : ''), null));
    if (d.visitors) tiles.push(tile(T.visitors(C), compact.format(d.visitors.value), T.win(per(d.visitors.from), per(d.visitors.period)) + (d.visitors.prev ? ' · ' + signed(change(d.visitors.value, d.visitors.prev)) : ''), null));

    const top = d.visitors && d.visitors.top.length
      ? '<p class="mk-top"><b>' + esc(T.top) + ':</b> ' + d.visitors.top.map((x) => esc(nm(x.partner)) + ' ' + esc(compact.format(x.value))).join(' · ') + '</p>' : '';

    const blocks = d.trade.slice(0, 4).map((b) => {
      const head = esc(label(b.label)) + ' <small>HS ' + esc(b.code) + '</small>';
      const rows = b.rows.slice(0, 6).map((r) => {
        const p = r.series[r.series.length - 1], q = r.series[r.series.length - 2], s = r.share.find((x) => x[0] === p[0]);
        const flowLabel = T[r.flow](nm(r.reporter), C);
        return '<tr><td>' + esc(L === 'en' ? cap(flowLabel) : flowLabel) + (r.chapter ? ' <small>(' + esc(T.chapter(r.chapter)) + ')</small>' : '') + '</td>' +
          '<td>' + esc(p[0]) + '</td><td>' + esc(cur(p[1], r.currency)) + '</td><td>' + esc(signed(q && q[0] === String(+p[0] - 1) ? change(p[1], q[1]) : null)) + '</td>' +
          '<td>' + (s ? esc(sharePct(s[1])) : '–') + '</td><td class="mk-sp">' + spark(r.series.map((x) => x[1])) + '</td></tr>';
      }).join('');
      return '<h3>' + head + '</h3><div class="mk-table-wrap"><table class="mk-table"><thead><tr><th>' + esc(T.flowCol) + '</th><th>' + esc(T.year) + '</th><th>' + esc(T.value) +
        '</th><th>' + esc(T.change) + '</th><th>' + esc(T.share) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join('');

    const credits = '<div class="mk-sources">' + d.sources.map((s) => '<span>' + (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.attribution) + '</a>' : esc(s.attribution)) + '</span>').join('') + '</div>';
    return '<section class="mk" id="market-data"><h2>' + esc(T.title) + '</h2><p class="mk-subtitle">' + esc(T.sub(C)) + '</p>' +
      (lead ? '<p class="mk-lead">' + lead + '</p>' : '') +
      '<div class="mk-tiles">' + tiles.join('') + '</div>' + top + blocks +
      (blocks ? '<p class="mk-note">' + esc(T.shareNote) + '</p>' : '') + credits +
      '<p><a class="mk-link" href="/' + L + '/data/' + esc(d.country.slug) + '">' + esc(T.all(C)) + ' →</a></p></section>';
  }

  async function mount(el, q) {
    if (!el || !q) return;
    const key = q.report ? 'report' : 'topic';
    try {
      const r = await fetch('/api/market-data?' + key + '=' + encodeURIComponent(q[key]));
      if (!r.ok) return;
      const d = await r.json();
      if (!d.macro.length && !d.trade.length && !d.fdi) return;
      if (!document.querySelector('link[data-mk-css]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = '/css/market.css'; l.dataset.mkCss = '1';
        document.head.appendChild(l);
      }
      el.innerHTML = render(d);
    } catch (_e) { /* the panel is optional: the page works without it */ }
  }

  window.kiraMarket = { mount };
})();
