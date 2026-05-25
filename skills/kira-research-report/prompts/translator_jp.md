# translator_jp.md — KIRA Research Japanese translation prompt

Use this prompt when translating a finalized EN KIRA report HTML into JP. The input is `outputs/<slug>/en.html`; the output is `outputs/<slug>/ja.html`. Charts, layout, and numbers are kept; only translatable copy changes.

This prompt is the canonical JP voice guide for this skill. Whenever you ship JP copy in this repo, follow these rules.

---

## 0. Inputs and outputs

**Input:** A fully rendered EN HTML report (12-22 pages, KIRA brand). Has all charts as inline SVG, source tags in NEW format (Phase L.3): `[Kira estimates]` for KIRA-derived figures and `[<Source Alias> <Year>]` for named externals (e.g. `[BPS 2024]`, `[Vinacafe AR 2025]`, `[AC Nielsen 2026]`). UC3 reports may also include `[user-input]`. Callout cards with char-capped labels and change-lines. Every content page ends with a `SOURCE KEY · alias = full citation · ...` line at the bottom (the alias→full mapping for that page).

**Output:** Same HTML structure, every translatable text node replaced with JP equivalent. The PDF re-renders via the same `/api/render-pdf` endpoint after substitution.

**What you DO NOT touch:**
- SVG geometry (only `<text>` content inside SVGs)
- **Source tags — keep ALL bracketed citations verbatim in English brackets**:
  - `[Kira estimates]` stays as `[Kira estimates]` — do NOT translate to `[KIRA推計]` or `[一次情報]`
  - `[BPS 2024]`, `[Vinacafe AR 2025]`, etc. stay verbatim — do NOT translate the source name
  - `[user-input]` stays as-is
- **Source key footer line** (`SOURCE KEY · alias = ...`): translate only the LABEL `SOURCE KEY` → `出典凡例`; keep all aliases + full citations in their original English form. The full citations are proper nouns of source documents (e.g. "Badan Pusat Statistik Construction Materials Census 2024") — these are NOT translated, like company names.
- Numbers and units: `USD 2.3 bn`, `5.03%`, `IDR 116 trn` — preserve verbatim (USD/IDR stay as ISO codes, "bn"/"%"/"pp" stay English; the JP reader recognizes them)
- HTML tags, class names, IDs
- Chart SOURCE lines: keep mono-uppercase format, only translate the descriptor part (`industry trade press` → `業界専門誌`); leave `KIRA RESEARCH 2026` and dataset names (`BPS`, `BANK INDONESIA`) as-is

---

## 1. Register — 敬体 (formal polite), business analytical

Mirror the EN register: confident, understated, structural. The JP audience is a strategy lead at a Japanese MNC (sōgō shōsha, manufacturer HQ, finance) — senior, time-poor.

**Use:**
- 敬体 (です・ます) throughout body copy
- 漢語中心 — prefer Sino-Japanese compounds for technical terms
- Authorial voice: **「弊社のリサーチチーム」「当社の分析」「我々」** — never refer to KIRA as "プラットフォーム" or "AI"
- Audience reference: **「市場参加者」「ステークホルダー」「事業者」** — never 「お客様」, 「あなた」

**Avoid:**
- 常体 (である) — too academic for this register
- Over-formal honorifics (お示しいたします, etc.) — sounds like a sales letter, not a research note
- カタカナ語 padding (ソリューション, パートナーシップ, シナジー) — see Section 4

---

## 2. Headlines and subheads

### Punctuation and case

JP has no case, but mirror the EN sentence-case feel by:
- Avoiding all-caps within headlines (English fragments retain their original case, e.g. `AI` stays `AI`, not `Ai`)
- Using 「：」 (full-width colon) for the EN colon-split pattern
- Ending thesis-statement headlines with 「。」 (full stop) — same as EN's period

### Translation patterns

| EN shape | JP equivalent |
|---|---|
| `A market at inflection.` | `転換点に立つ市場。` |
| `Demand is structural, not cyclical.` | `需要は循環的ではなく構造的である。` |
| `Market structure: consolidating to highly concentrated` | `市場構造：高度集約化への移行` |
| `Five strategic implications for market participants` | `市場参加者に向けた5つの戦略的示唆` |
| `Indonesia's roofing market — 2025 inflection` | `インドネシア屋根材市場 — 2025年の転換点` |
| `Six AI applications reshaping…` | `…を再構成する6つのAI活用事例` |

### Don't

- ❌ Question-form headlines (the EN guide forbids these; preserve the rule)
- ❌ 「〜とは？」 framing (same reason)
- ❌ Marketing-voice JP: 「業界を変革する…」「未来を切り拓く…」 — these are the JP equivalents of "unlock / transform / revolutionize" and equally forbidden

---

## 3. Body paragraphs

### Structure preserved

One key insight per paragraph. Max 4 paragraphs per section. Lead with the claim.

### Sentence rhythm

- Median JP sentence length 40-55 characters (counting kana+kanji as 1 char each) — varies, but matches the EN 18-22 word range in information density
- Short punchy sentences land when they follow a complex one. Don't string 3+ short sentences in a row; that reads as choppy

### Inline emphasis

`<strong>` tags preserve their position. 1-2 phrases per paragraph max. Translate the WORDS inside `<strong>`, not the tag.

✅ `集約化は2017年以降ほぼ倍増し、上位3社が<strong>繊維セメント市場価値の71%</strong>を占めるに至っています。`

❌ Multi-bold same sentence (bolding everything = bolding nothing — preserve the EN rule)

### Numbers and source tags

Numbers stay in their EN form. Source tags stay in English brackets (whether `[Kira estimates]` or named-source aliases like `[BPS 2024]`). Surrounding JP wraps them:

✅ `年間300万人が都市部に流入し[BPS 2024]、住宅供給の積年の不足は990万〜1,100万戸に達しています[Bappenas 2025]。`
✅ `集約化は2017年以降進展し、HHIは4,171から8,737へと倍増しています[Kira estimates]。`

❌ `[一次情報]` / `[二次情報]` — tags are functional markers, not translatable copy

---

## 4. Vocabulary — JP-specific rules

### Prefer 漢語 over カタカナ for technical/structural terms

| カタカナ (avoid) | 漢語 (prefer) |
|---|---|
| マーケット | 市場 |
| プレーヤー | 事業者 / 競合 |
| グロース | 成長 |
| バリューチェーン | 価値連鎖 |
| ボリューム | 数量 / 出荷量 |
| マージン | 利益率 |
| ニッチ | 特定領域 / ニッチ (OK if specific industry usage) |
| ステークホルダー | ステークホルダー (this one IS standard JP business term, keep) |
| トレンド | 動向 / 趨勢 |
| インフレ | インフレ (standard) |
| サプライチェーン | サプライチェーン (standard) |
| プラットフォーム | プラットフォーム (when referring to actual platforms, OK; never use to describe KIRA) |

### Yes — use freely

- 市場参加者, ステークホルダー, 事業者
- 戦略的示唆, 構造的, 方向性
- 転換点, 集約化, 断片化, 競争激化
- 起点, 逆風, 追い風, 触媒 (sparingly)
- 軽微, 重要, 決定的, 限定的 (calibrated language matching EN's modest/material/decisive/marginal)

### No — avoid

- 「お客様におかれましては」「貴社」「皆様」 (addressing reader directly)
- 「活用」 used vaguely (「AIを活用」 without specifics) — same as EN "leverage" — be concrete instead
- 「ゲームチェンジャー」「革新的」「破壊的」 used to mean nothing — these are the JP empty-puff equivalents
- 「〜と思われます」「〜と考えられます」 (we believe / we think) — the report IS the belief, state it directly
- 「以上のことから」「結論として」「言うまでもなく」 (throat-clearing)
- 「等」「など」 at sentence end (be specific or cut)

### Forbidden — anti-positioning (SAME as EN rule, applies in JP too)

- Competitor firm names: `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC` — never appear in JP copy either
- `Claude`, `McKinsey` — same
- Internal R-archive numbers (R0152, etc.)
- 「弊社のプラットフォーム」「SaaS」「アプリ」「AI搭載プラットフォーム」 — never frame KIRA this way

---

## 5. Callout cards — char caps in JP

JP characters carry more information per char than English. The card slots have visual width budgets, not character-count budgets. Use these JP-specific caps:

| Slot | EN cap | JP cap | Example |
|---|---|---|---|
| Number | 12 chars | unchanged | `USD 2.0 bn` |
| Unit | 8 chars | unchanged | `bn` `%` |
| Label (mono uppercase) | 30 chars | **15 全角** | `市場規模 2025年` `HHI指数 繊維セメント` |
| Change-line | 38 chars | **20 全角** | `前年比+8%、2027年以降加速` |

**Important:** mono-uppercase labels in EN translate to **mono-bold JP** at the same font size — the JetBrains Mono font in the CSS supports JP glyphs via fallback to Noto Sans JP. Don't add 「ラベル：」 prefix; just the value.

The change-line is where voice matters — interpretation, not restatement.

✅ `前年比+8%、2027年以降加速`
✅ `上位3社が71%を占有`
✅ `2017年比で2倍に増加`

❌ `8%成長` (no interpretation)
❌ `上昇傾向` (vague)

---

## 6. Strategic implications cards

Lead each card with a verb in imperative-equivalent JP form, addressed to market participants:

| EN verb | JP equivalent |
|---|---|
| Position for X | Xに向けたポジショニングを |
| Anticipate X | Xを織り込む |
| Hedge X | Xに対するヘッジを構築 |
| Build X | Xを構築する |
| Enter / Exit | 参入する / 撤退する |
| Sequence | 段階的に進める |
| Pace | ペーシングを調整 |

Worked example:

✅ `繊維セメント市場の集約化に向けてポジショニングを。HHIは2017年の4,171から2023年には8,737へと倍増しています[Kira estimates]。流通スケールを持たない新規参入者は、シェア5%未満での防衛戦か、24ヶ月以内のスケール買収かの二者択一に直面する構造です。隣接セグメント(プレミアム金属、複合外装材)への再ポジショニングも有効な選択肢となります。`

❌ `集約化のトレンドを踏まえた戦略を検討すべきでしょう。` (no specifics, no number, no actionable framing)

---

## 7. Chart titles and SOURCE lines

### Chart title

Sentence-case JP, short. Subtitle gives time period and segmentation.

✅ Title: `繊維セメント市場の集約化` · Subtitle: `インドネシア・HHI指数・2017年 vs 2023年`
✅ Title: `屋根材市場規模` · Subtitle: `APAC・USD bn・2024-2033年予測`

### Chart SOURCE line (bottom of chart)

Preserves the EN compressed-citation format. Translate ONLY the generic descriptor portion; keep dataset names, country names in source-data context, and `KIRA RESEARCH 2026` verbatim. Mono uppercase, ≤ 110 chars.

```
SOURCE: BPS、BANK INDONESIA、業界専門誌 · KIRA RESEARCH 2026
```

```
SOURCE: KIRA推計 — APAC市場規模 × 建設業GDP比率 · ANCHOR: USD 32.58 BN APAC 2025 [SECONDARY]
```

Never name aggregator firms (Mordor / Frost / Euromonitor) in source lines.

---

## 8. Char-count discipline in JP

JP body paragraphs run roughly 0.7-0.8x the char count of their EN source (漢語 compresses information). Use this when checking layout fit:

- A 200-char EN paragraph → expect ~150-160 全角 chars in JP
- If a JP paragraph runs significantly LONGER than 0.85x the EN source, it's likely over-translated — trim カタカナ padding and adverbs
- If a JP paragraph runs UNDER 0.6x the EN source, it's likely under-translated — check for skipped clauses

Common JP over-budget patterns to compress:
- 「〜することができます」 → 「〜できます」
- 「〜することによって」 → 「〜により」
- 「〜という観点から見ると」 → 「〜の観点で」
- 「〜と言えるのではないでしょうか」 → 「〜である」 (also fixes the hedging anti-pattern)

---

## 9. Anti-patterns to refuse

| Pattern | Fix |
|---|---|
| Headline ending in 「？」 | Convert to thesis statement |
| 常体 used in body | Convert to 敬体 |
| カタカナ-heavy passage | Replace with 漢語 equivalents per Section 4 table |
| Source tags translated to 「[KIRA推計]」 or 「[一次情報]」 etc. | Restore English bracket form (`[Kira estimates]`, `[BPS 2024]`, etc.) |
| Source alias names translated (e.g. `[BPS 2024]` → `[インドネシア統計庁 2024]`) | Restore — aliases are proper nouns of source documents; they only appear in English |
| `[Kira estimates]` placed inside `<strong>` | Move outside — tags are functional markers, not emphasized content |
| `SOURCE KEY` line not localized | Translate the label to `出典凡例` but keep all alias = full citation mappings in English |
| 「貴社」「お客様」 addressing reader | Replace with 「市場参加者」「事業者」 |
| Competitor firm or `Claude` / `McKinsey` mentioned | Strip; rewrite around the data point |
| 「弊社のプラットフォーム」「AI搭載」 framing of KIRA | Reframe as 「弊社のリサーチチーム」「当社の分析」 |
| Question-form headline | Convert to thesis |
| Numbers translated to JP wareki (令和) | Restore Gregorian year |

---

## 10. Worked translation passages

EN source (from `docs/voice_examples.md` line 1):

> **Demand is structural, not cyclical.** Urbanization adds 3 million city dwellers a year [BPS 2024]; the formal housing backlog sits at 9.9-11 million units [Bappenas 2025]; and the 3 Million Houses Program directs USD 7.4 bn of mandated VAT-exempt construction through 2027 [MoF Stim Pkg 2025]. Even a sharp slowdown in private credit would compress, not erase, the multi-year demand pull.

JP translation:

> **需要は循環的ではなく構造的である。** 都市化により年間300万人が都市部へ流入し[BPS 2024]、住宅供給の積年の不足は990万〜1,100万戸に達しています[Bappenas 2025]。300万戸住宅計画はVAT免除付き建設投資をUSD 74億規模で2027年まで指示しています[MoF Stim Pkg 2025]。民間信用の急減速が起きたとしても、複数年にわたる需要の引きは縮小こそすれ消失することはありません。

---

EN source:

> Concentration has roughly doubled since 2017, with the top three players now accounting for <strong>71% of fiber cement value</strong>.

JP translation:

> 集約化は2017年以降ほぼ倍増し、上位3社が<strong>繊維セメント市場価値の71%</strong>を占めるに至っています。

---

EN source (callout change-line):

> +8% YoY, accelerating 2027+

JP translation:

> 前年比+8%、2027年以降加速

---

EN source (strategic implication):

> Position for fiber cement consolidation. HHI doubled from 4,171 to 8,737 in six years [Kira estimates]. New entrants face structural cost-of-capital disadvantage versus the top three; reposition toward adjacent segments (premium metal, composite cladding) or scale-acquire within 24 months.

JP translation:

> 繊維セメント市場の集約化に向けたポジショニングを。HHIは6年間で4,171から8,737へと倍増しています[secondary]。新規参入者は上位3社に対する構造的な資本コストの不利を抱える状況です。隣接セグメント(プレミアム金属、複合外装材)への再ポジショニング、もしくは24ヶ月以内のスケール買収による参入が選択肢となります。

---

## 11. Process

When translating an EN HTML to JP:

1. Parse the HTML — identify all translatable text nodes (skip SVG geometry, class names, IDs)
2. Translate page-by-page (preserves context within each page)
3. After translation: regex-sweep for forbidden terms (Mordor, Frost, etc., plus katakana like `クロード` for Claude) — should be zero hits, but verify
4. Char-count check on callout labels and change-lines against the JP-specific caps in Section 5
5. Write final to `outputs/<slug>/ja.html`
6. Render PDF via `/api/render-pdf` (the endpoint handles JP fonts via Noto Sans JP fallback)

If a paragraph overflows after translation, prefer trimming `<strong>` content reach or removing one adverb, NOT removing a source tag or a number. Source tags + numbers are load-bearing; voice flourishes are not.

---

## 11.5 Chunked output protocol — for batch mode (Phase Q.1, 2026-05-25)

When called from `batch_runner.md` Stage B (multi-fire batch), a single `Write` of the full 67KB+ ja.html exceeds Sonnet's per-response output cap (~32K tokens ≈ 100KB), causing partial truncation or hangs (root cause of `2026-vn-fintech` 2h24m hang). To avoid this:

**Use per-page Edit instead of one-shot Write.**

1. Read en.html. Identify:
   - **Shell prefix** — everything from `<!DOCTYPE html>` up to (but not including) the first `<div class="kira-page"`.
   - **Page blocks** — each `<div class="kira-page">…</div>` (top-level closing). Count them; should match `PAGE_COUNT` from parent.
   - **Shell suffix** — everything from after the last `</div>` (closing the last kira-page) to `</html>`.

2. **Write the shell prefix first** as ja.html:
   - Translate `<title>`, `<meta description>`, any inline shell text
   - Insert a SENTINEL comment line where pages will go: `<!-- KIRA_BATCH_PAGES_INSERT_HERE -->`
   - Then translate shell suffix (closing tags etc.)
   - Write the full skeleton + sentinel + suffix. **One Write call, ~3-5KB.**

3. **For each page block in order** (P1, P2, … Pn):
   - Translate just that page's text content per Sections 1-10 above
   - Use `Edit` to insert the translated page right before the sentinel:
     - `old_string`: `<!-- KIRA_BATCH_PAGES_INSERT_HERE -->`
     - `new_string`: `<translated page block>\n<!-- KIRA_BATCH_PAGES_INSERT_HERE -->`
   - This appends each page before the sentinel. **One Edit per page, ~3-7KB each.**

4. **After the last page**, one final `Edit` removes the sentinel:
   - `old_string`: `\n<!-- KIRA_BATCH_PAGES_INSERT_HERE -->`
   - `new_string`: ``

5. Render PDF, verify no truncation by counting `.kira-page` divs in the final file (must equal `PAGE_COUNT`).

**Why sentinel pattern vs append**: the `Edit` tool requires an exact `old_string` to anchor on. The sentinel gives a stable anchor that survives appending. Without it, you'd have to anchor on the closing tags of the previous page (fragile).

**Page-level chunking rationale**: a typical KIRA page is 200-500 words = 600-1500 tokens output. Per-page Edit fits comfortably within any response budget with headroom for thinking.

**Validation post-translation**: the parent (`batch_runner.md` Step 4.3) re-counts `.kira-page` divs and source tags. If your output is missing pages (because you skipped some), the gate will fail and the row goes to status=error with a clear log. So: translate ALL pages, in order, no skipping.
