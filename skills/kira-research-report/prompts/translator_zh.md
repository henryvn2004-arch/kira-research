# translator_zh.md — KIRA Research Simplified Chinese translation prompt

Use this prompt when translating a finalized EN KIRA report HTML into Simplified Chinese (简体中文, locale code `zh`). The input is `outputs/<slug>/en.html`; the output is `outputs/<slug>/zh.html`. Charts, layout, and numbers are kept; only translatable copy changes.

This prompt is the canonical ZH voice guide for this skill. Whenever you ship ZH copy in this repo, follow these rules. It mirrors `translator_jp.md` and `translator_ko.md`; where this file is silent, follow the same rule from those two.

---

## 0. Inputs and outputs

**Input:** A fully rendered EN HTML report (12-40 pages, KIRA brand). Has all charts as inline SVG, source tags in the Phase L.3 format: `[Kira estimates]` for KIRA-derived figures and `[<Source Alias> <Year>]` for named externals (e.g. `[BPS 2024]`, `[Vinacafe AR 2025]`). UC3 reports may also include `[user-input]`. Callout cards with char-capped labels and change-lines. Every content page ends with a `<div class="source-key">` line (alias = full citation; the `SOURCE KEY ·` label comes from CSS `::before`).

**Output:** Same HTML structure, every translatable text node replaced with its Simplified Chinese equivalent. The PDF re-renders via the same `/api/render-pdf` endpoint.

**Document shell (ZH-specific, do these in the shell Write):**
- `<html lang="en">` → **`<html lang="zh-Hans">`**. The CSS matches it with `html:lang(zh)` and picks the SC font; never use `lang="zh-CN"`/`"ja"` by habit.
- Add the SC webfont to `<head>`, right after the existing Google Fonts `<link>`:
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700;900&display=swap">`
  The PDF renderer has no system CJK fonts; without this link Chinese renders as tofu boxes or with Japanese glyph shapes.
- Font stacks: current reports carry `var(--font-cjk)` in every `font-family` (master_styles.css), and `html:lang(zh)` sets it to `'Noto Sans SC'`, so nothing more is needed. **If the inlined `<style>` has no `--font-cjk`** (older reports, e.g. backfill rows), insert `'Noto Sans SC', ` after every `'Satoshi', ` and every `'JetBrains Mono', ` in `font-family` declarations — in the shell `<style>` and in inline `style="…"` attributes inside pages — exactly as older ja/ko files did with Noto Sans JP/KR. Never add Noto Sans JP/KR/TC to a ZH file (wrong glyph variants for shared Han characters).
- In the shell `<style>`, change the `.source-key::before` content to `"来源说明 · "`, and translate any other visible CSS `content:` strings (e.g. `"MARKET LEADER"` → `"市场领先者"`).

**What you DO NOT touch:**
- SVG geometry (only `<text>` content inside SVGs)
- **Source tags — keep ALL bracketed citations verbatim in English brackets**:
  - `[Kira estimates]` stays as `[Kira estimates]` — do NOT translate to `[KIRA估算]` or `[一手数据]`
  - `[BPS 2024]`, `[Vinacafe AR 2025]`, etc. stay verbatim — do NOT translate the source name (`[BPS 2024]` must NOT become `[印尼统计局 2024]`)
  - `[user-input]` stays as-is
  - An inline descriptive tail inside a tag MAY be translated while the alias prefix stays: `[Kira estimates · computed from active-user-share above]` → `[Kira estimates · 基于上文活跃用户占比推算]`
- **Source key line**: only the label changes (`来源说明`, via CSS as above); all aliases + full citations stay in their original form. They are proper nouns of source documents.
- Numbers and units: `USD 2.3 bn`, `5.03%`, `IDR 116 trn`, `+8 pp` — preserve verbatim. ISO currency codes stay (`USD`, `IDR`, `VND`, `THB`…); do NOT convert to 亿/万 or to 美元 when the EN uses `USD … bn`. Keep ASCII digits and `%`.
- HTML tags, class names, IDs, `data-*` attributes
- Image references: `<img src="cover.jpg">`, `src="brand/logo.png"`, `src="brand/logo-white.png"` stay exactly as written. Translate the cover and closing page text normally; keep contact details (email, website, LinkedIn name) verbatim.
- Chart SOURCE lines: keep mono-uppercase format, only translate the generic descriptor (`industry trade press` → `行业媒体`); leave `KIRA RESEARCH 2026` and dataset names (`BPS`, `BANK INDONESIA`) as-is.

---

## 1. Register — 书面语 (formal business written Chinese)

Mirror the EN register: confident, understated, structural. The ZH audience is a senior strategy / planning lead (战略规划、投资发展、海外事业部) at a Chinese company — mainland HQ, Hong Kong-based or Singapore-based — investing in ASEAN. Senior, time-poor, reads a lot of research; dislikes sales tone.

**Use:**
- 书面语 throughout: concise, declarative, no 口语 particles (吧、呢、啦、哦)
- Structural, quantified statements: lead with the claim, then the number, then the implication
- Authorial voice: **「本公司研究团队」「我们」「本报告」「我们的分析」** — never refer to KIRA as 「平台」「AI」「系统」「工具」
- Audience reference: **「市场参与者」「投资者」「企业」「进入者」** — never 「贵公司」「贵司」「您」「亲」「各位」

**Avoid:**
- 网络用语 / 营销腔 (赋能、抓手、闭环、颠覆、引爆、风口、弯道超车、强势来袭)
- Over-literal English syntax (被-passive chains, 「对……进行……」 padding, stacked 「的」)
- Hedging (「我们认为」「似乎」「可能会在一定程度上」) — the report IS the view; state it

---

## 2. Headlines and subheads

### Punctuation and spacing

- Full-width punctuation in Chinese text: `，。：；（）「」？！、` — but keep ASCII digits, `%`, `.` inside numbers, and half-width punctuation inside English tokens/tags.
- **No spaces** between Chinese characters and Latin letters or digits (`2025年市场规模USD 2.0 bn`, `HHI指数`). Be consistent: never insert CJK–Latin spacing anywhere in the file. Spaces inside English tokens (`USD 2.0 bn`, `[BPS 2024]`) stay.
- Colon-split headline pattern: use full-width `：` (`市场结构：向高度集中过渡`); the EN em-dash pattern may use `——`.
- Thesis headlines end with `。` as the EN ends with a period; short labels and chart titles take no end punctuation.
- Use `「」` sparingly for quoted terms; `“”` is also acceptable but stay consistent within one report.

### Question-style titles (owner preference)

The report title and buyer-question headlines in the BRAIN route are often questions ("How to win…?", "Where should…?"). **When the EN is a question, keep it a question** in natural Chinese — do not turn it into a statement:

| EN shape | ZH pattern |
|---|---|
| `How a foreign brand wins the food-led gap` / `How to win …?` | `外资品牌如何抢占……？` / `如何在……中胜出？` |
| `Where to enter first?` | `首站应选在哪里？` / `应优先进入哪个市场？` |
| `Which entry mode fits?` | `哪种进入模式更合适？` |
| `Is the market worth entering now?` | `现在进入是否值得？` |
| `Go or no-go?` | `进入还是放弃？` |

Do NOT invent question form for thesis headlines that are statements in EN; those stay statements.

### Translation patterns

| EN shape | ZH equivalent |
|---|---|
| `A market at inflection.` | `处于拐点的市场。` |
| `Demand is structural, not cyclical.` | `需求是结构性的，而非周期性的。` |
| `Market structure: consolidating to highly concentrated` | `市场结构：向高度集中过渡` |
| `Five strategic implications for market participants` | `对市场参与者的五项战略启示` |
| `Indonesia's roofing market — 2025 inflection` | `印度尼西亚屋面材料市场——2025年拐点` |
| `Vietnam coffee chains 2026: how a foreign brand wins the food-led gap` | `越南咖啡连锁2026：外资品牌如何抢占以餐食为主导的空白市场？` (title = question when the angle is a "how") |

### Don't

- ❌ Marketing-voice: 「颠覆行业」「开启未来」「引领变革」 — equivalents of "unlock / transform / revolutionize", equally forbidden
- ❌ 「……是什么？」 / 「一文读懂……」 clickbait framing
- ❌ Exclamation marks

---

## 3. Body paragraphs

### Structure preserved

One key insight per paragraph. Max 4 paragraphs per section. Lead with the claim.

### Sentence rhythm

- Median ZH sentence 35-55 characters. Break long English sentences at `；` or into two sentences rather than stacking clauses with 「的」.
- A short sentence lands after a complex one. Don't string 3+ short sentences in a row.

### Inline emphasis

`<strong>` tags keep their position; translate the words inside, not the tag. 1-2 phrases per paragraph max.

✅ `自2017年以来，市场集中度大约翻了一番，前三大企业目前占<strong>纤维水泥市场价值的71%</strong>。`

### Numbers and source tags

Numbers stay in their EN form; source tags stay in English brackets, placed right after the clause they support (before the full-width `，` or `。`):

✅ `城市化每年新增城市人口300万[BPS 2024]，正规住房缺口达990万至1,100万套[Bappenas 2025]。`
✅ `自2017年以来集中度持续提升，HHI由4,171升至8,737[Kira estimates]。`

Ranges: use `至` or `–` (`990万至1,100万套`, `2024–2033F`). Counts of people/units MAY use 万/亿 when the EN uses plain words ("3 million city dwellers" → `300万`), but money with an ISO code keeps the EN `bn`/`m` form (`USD 7.4 bn`, not `74亿美元`).

❌ `[一手]` / `[二手]` — tags are functional markers, not translatable copy
❌ `[Kira estimates]` inside `<strong>` — move it outside

---

## 4. Vocabulary — ZH-specific rules

### Mainland Simplified terminology only

Use mainland (PRC) standard terms; avoid Taiwan / Hong Kong-only usage and Traditional characters.

| Avoid (TW/HK) | Use (mainland) |
|---|---|
| 資訊 / 資料 (for data) | 信息 / 数据 |
| 軟體 / 網路 | 软件 / 网络 |
| 品質 | 质量 |
| 營運 | 运营 |
| 行銷 | 营销 |
| 公部門 | 公共部门 |
| 星國 / 星洲 | 新加坡 |
| 印尼 (in headlines) | 印度尼西亚 (first mention / titles); 印尼 acceptable in dense body text and charts |
| 菲國 / 泰國 | 菲律宾 / 泰国 |

### Names

- **Countries / regions:** use the labels in `references/naming_vocab.json` (`zh`), e.g. 越南、泰国、印度尼西亚、马来西亚、新加坡、菲律宾、柬埔寨、老挝、缅甸、文莱、东帝汶、澳大利亚、新西兰、日本、韩国; Taiwan is always **「中国台湾」**. ASEAN = **东盟**.
- **Companies and legal entities:** give the official Chinese name where one is established and commonly used (Toyota → 丰田, Samsung → 三星; `Vinamilk`, `Masan` stay as written because no standard Chinese name is in use); otherwise keep the original name in its original script. Never invent a transliteration.
- **Laws, decrees, agencies:** use the established Chinese name where one exists (e.g. `越南电子商务法`, `印度尼西亚投资协调委员会`); otherwise keep the English name. At first mention you may add the original in parentheses: `经济需求测试（economic needs test）`, `第31/2021号法令（Decree 31/2021）`.
- **First mention of an English term of art** may be followed by the original in parentheses; afterwards use the Chinese only.

### Glossary (recurring terms in this corpus)

| EN | ZH |
|---|---|
| market entry | 市场进入 |
| market entry brief | 市场进入简报 |
| market scan | 市场扫描 |
| expansion brief | 业务拓展简报 |
| entry mode | 进入模式 |
| economic needs test (ENT) | 经济需求测试 |
| foreign direct investment (FDI) | 外商直接投资（FDI） |
| foreign investor | 外国投资者 / 外资企业 |
| foreign ownership cap | 外资持股上限 |
| joint venture (JV) | 合资企业 |
| wholly foreign-owned enterprise | 外商独资企业 |
| local partner | 本地合作伙伴 |
| licensing / franchising | 授权经营 / 特许经营 |
| M&A / acquisition | 并购 / 收购 |
| greenfield | 绿地投资 |
| regulatory climate | 监管环境 |
| regulator | 监管机构 |
| investment licence (IRC/ERC) | 投资许可（投资登记证/企业登记证） |
| incentives | 优惠政策 |
| special economic zone | 经济特区 |
| supply chain / value chain | 供应链 / 产业链（价值链 for value-chain analysis） |
| competitive landscape | 竞争格局 |
| market share | 市场份额 |
| market leader | 市场领先者 |
| incumbent | 现有企业 / 在位企业 |
| new entrant | 新进入者 |
| white space | 市场空白 |
| addressable market (TAM/SAM) | 可触达市场（TAM/SAM） |
| CAGR | 年复合增长率（CAGR） |
| unit economics | 单位经济模型 |
| payback period | 投资回收期 |
| go/no-go | 进入/放弃决策 |
| decision scorecard | 决策评分卡 |
| stage-gate plan | 阶段门控计划 |
| first-site economics | 首店（首个项目）经济性 |
| distribution channel / modern trade / general trade | 分销渠道 / 现代渠道 / 传统渠道 |
| pricing power | 定价能力 |
| consolidation / fragmentation | 整合 / 分散 |
| tailwind / headwind | 顺风因素 / 逆风因素 |
| downside / base / upside case | 悲观 / 基准 / 乐观情景 |
| key risks / mitigants | 主要风险 / 缓释措施 |
| strategic implications | 战略启示 |
| executive summary | 执行摘要 |
| methodology | 研究方法 |
| contents | 目录 |
| forecast (F) | 预测（`2030F` stays as written） |
| YoY | 同比 |
| pp (percentage points) | 个百分点 (body); `pp` stays in callout numbers |

### Forbidden — anti-positioning (same as EN rule, applies in ZH too)

- Competitor firm names in any script: `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC`, and their Chinese names (弗若斯特沙利文、欧睿、益普索、麦肯锡 etc.) — never in ZH copy
- `Claude` / 克劳德, `McKinsey` / 麦肯锡 — same
- Internal R-archive numbers (R0152, etc.)
- Framing KIRA as 「平台」「本平台」「研究平台」「AI驱动」「人工智能驱动」「AI赋能」「SaaS」「应用」 — never. 「平台」 is fine only when the report itself is about real-world platforms (e-commerce platforms, payment platforms).
- Addressing the reader: 「贵公司」「贵司」「您」「亲」 — never

---

## 5. Callout cards — char caps in ZH

Chinese characters are full-width; use the same compression as JP/KO:

| Slot | EN cap | ZH cap | Example |
|---|---|---|---|
| Number | 12 chars | unchanged | `USD 2.0 bn` |
| Unit | 8 chars | unchanged | `bn` `%` |
| Label (mono uppercase) | 30 chars | **14 字** | `2025年市场规模` `纤维水泥HHI指数` |
| Change-line | 38 chars | **18 字** | `同比+8%，2027年后加速` |

Mono-uppercase labels become mono-bold Chinese at the same size (Noto Sans SC is in the mono stack via `--font-cjk`). Don't add a 「标签：」 prefix.

The change-line carries interpretation, not restatement:

✅ `同比+8%，2027年后加速` · ✅ `前三大企业占71%` · ✅ `较2017年翻倍`
❌ `增长8%` (no interpretation) · ❌ `呈上升趋势` (vague)

---

## 6. Strategic implications cards

Lead each card with a verb phrase addressed to market participants:

| EN verb | ZH |
|---|---|
| Position for X | 为X提前布局 |
| Anticipate X | 预判X |
| Hedge X | 对冲X风险 |
| Build X | 构建X |
| Enter / Exit | 进入 / 退出 |
| Sequence | 分阶段推进 |
| Pace | 把握节奏 |
| Partner with X | 与X合作 |

✅ `为纤维水泥市场整合提前布局。HHI在六年间由4,171升至8,737[Kira estimates]。相较前三大企业，新进入者在资本成本上处于结构性劣势；可向相邻细分市场（高端金属、复合外墙材料）转型，或在24个月内通过收购取得规模。`

❌ `建议企业结合自身情况综合考虑市场集中趋势。` (no number, no actionable framing)

---

## 7. Chart titles and SOURCE lines

### Chart title

Short, no end punctuation. Subtitle gives period and segmentation, separated by `·`.

✅ Title: `纤维水泥市场集中度` · Subtitle: `印度尼西亚 · HHI指数 · 2017 vs 2023`
✅ Title: `屋面材料市场规模` · Subtitle: `亚太 · USD bn · 2024–2033F`

### Chart SOURCE line

Keep the compressed mono format; translate only the generic descriptor; ≤ 110 chars.

```
SOURCE: BPS, BANK INDONESIA, 行业媒体 · KIRA RESEARCH 2026
```

Never name aggregator firms in source lines.

---

## 8. Char-count discipline in ZH

ZH body text runs roughly **0.45-0.6x** the EN character count (one Han character ≈ one EN word-fragment), but each character is full-width, so visual width is ~0.9-1.1x EN. Check layout fit by visual width, not raw count:

- A 200-char EN paragraph → expect ~90-120 ZH characters
- Significantly more than 0.65x → likely over-translated; cut 「进行」「相关」「方面」「的」 padding
- Under 0.35x → likely under-translated; check for skipped clauses

Compression patterns:
- 「对……进行分析」 → 「分析……」
- 「在……方面」 → drop or 「……上」
- 「具有……的能力」 → 「能够……」
- 「可以说是」「从某种程度上来说」 → drop
- 「以及」 chains → `、` lists

---

## 9. Anti-patterns to refuse

| Pattern | Fix |
|---|---|
| Traditional characters (們、這、為、國、經、產、業、資、場、發、關) | Convert to Simplified |
| TW/HK terminology (資訊、軟體、行銷、星國) | Mainland term per Section 4 |
| Japanese kanji forms (経、済、発、関、図) | Simplified forms (经、济、发、关、图) |
| Source tags translated (`[KIRA估算]`, `[印尼统计局 2024]`) | Restore English form |
| `SOURCE KEY` label left in English | CSS `::before` content → `来源说明 · ` |
| 「贵公司」「您」 addressing the reader | 「市场参与者」「投资者」「企业」 |
| KIRA called 「平台」/「AI」 | 「本公司研究团队」「我们的分析」 |
| Competitor firm, `Claude`, `McKinsey` (any script) | Strip; rewrite around the data point |
| `USD 2.3 bn` turned into `23亿美元` | Restore EN form |
| Spaces between Chinese and digits/Latin in some places but not others | Remove them everywhere |
| English sentence left untranslated | Translate (only names, tags, citations, contact details stay English) |
| `<html lang="en">` / `lang="ja"` left in shell | `lang="zh-Hans"` |

---

## 10. Worked translation passages

EN:

> **Demand is structural, not cyclical.** Urbanization adds 3 million city dwellers a year [BPS 2024]; the formal housing backlog sits at 9.9-11 million units [Bappenas 2025]; and the 3 Million Houses Program directs USD 7.4 bn of mandated VAT-exempt construction through 2027 [MoF Stim Pkg 2025]. Even a sharp slowdown in private credit would compress, not erase, the multi-year demand pull.

ZH:

> **需求是结构性的，而非周期性的。** 城市化每年新增城市人口300万[BPS 2024]；正规住房缺口达990万至1,100万套[Bappenas 2025]；“三百万套住房计划”将在2027年前引导USD 7.4 bn免征增值税的指定建设投资[MoF Stim Pkg 2025]。即便私人信贷大幅放缓，多年期的需求拉动也只会收窄，而不会消失。

---

EN (callout change-line): `+8% YoY, accelerating 2027+` → ZH: `同比+8%，2027年后加速`

---

EN (regulatory):

> The economic needs test still gates foreign retail outlets beyond the first store [MOIT 2025]; a JV with a licensed local distributor removes it.

ZH:

> 经济需求测试（economic needs test）仍是外资零售门店在首店之后扩张的门槛[MOIT 2025]；与持牌本地分销商组建合资企业可绕开这一限制。

---

## 11. Process

1. Parse the HTML — identify all translatable text nodes (skip SVG geometry, class names, IDs)
2. Apply the shell changes in Section 0 (`lang="zh-Hans"`, Noto Sans SC link, font-stack fallback for older files, `来源说明` label)
3. Translate page by page (keeps context within each page)
4. Regex-sweep for forbidden terms and for Traditional / kana / hangul leftovers — should be zero hits
5. Check callout labels and change-lines against Section 5 caps
6. Write final to `outputs/<slug>/zh.html`
7. Render PDF via `/api/render-pdf` (`scripts/render-one.mjs`); glyphs come from the Noto Sans SC webfont link

If a paragraph overflows after translation, trim padding words or one `<strong>` reach, NOT a source tag or a number.

### Validation checklist (run before returning)

- [ ] `<html lang="zh-Hans">`; Noto Sans SC `<link>` present; every font stack reaches `'Noto Sans SC'` (directly or via `--font-cjk`)
- [ ] `<title>`, `<meta name="description">`, `og:title` translated; title keeps question form when the EN title is a question
- [ ] Top-level page count (`<div class="page[" ]`) equals the EN count
- [ ] Every EN source-tag alias present, untranslated; `[Kira estimates]` never inside `<strong>`
- [ ] `.source-key::before` reads `来源说明 · `
- [ ] Zero hits: `Mordor|Frost|Euromonitor|Synovate|Ipsos|IMARC|Claude|McKinsey|麦肯锡|克劳德|弗若斯特|欧睿|益普索`
- [ ] Zero hits: `本平台|我们的平台|KIRA ?平台|研究平台|AI ?驱动|人工智能驱动|AI ?赋能|贵公司|贵司|亲们`
- [ ] No kana / hangul; no Traditional-only characters
- [ ] No untranslated English sentences outside names, tags, citations, source keys and contact details
- [ ] Callout labels ≤ 14 字, change-lines ≤ 18 字
- [ ] Numbers, units and ISO currency codes identical to EN

---

## 11.5 Chunked output protocol — for batch mode (Phase S4, 2026-10-05)

Called from `batch_runner.md` Stage D / E. Same protocol as `translator_ko.md` §11.5 — a single `Write` of a 70KB+ zh.html exceeds the per-response output cap, so:

1. Read en.html. Identify the **shell prefix** (everything before the first top-level `<div class="page"` / `<div class="page cover-page"` — regex `<div class="page[" ]`; `page-*` subdivs are NOT page boundaries), the **page blocks** (count must equal `PAGE_COUNT` from the parent) and the **shell suffix**.
2. **Write the shell first** as zh.html with the Section 0 shell changes, the translated `<title>` / meta, a sentinel `<!-- KIRA_PAGES_INSERT_HERE -->` where the pages go, and the suffix. One Write call.
3. **For each page block in order**: translate it per Sections 1-10, then `Edit` zh.html replacing the sentinel with `<translated page>\n<!-- KIRA_PAGES_INSERT_HERE -->`. One Edit per page. For older files without `--font-cjk`, also add `'Noto Sans SC', ` inside any inline `font-family` in that page.
4. After the last page, one final `Edit` removes the sentinel.
5. Render the PDF and verify the top-level page count equals `PAGE_COUNT`.

Translate ALL pages, in order, no skipping. The parent re-counts pages and source tags and fails the row on any mismatch.
