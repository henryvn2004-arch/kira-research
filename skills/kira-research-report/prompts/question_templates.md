# question_templates.md — AEO/GEO question-form headlines per locale

Used by `insight_runner.md` to convert report section H2s into question-form headlines optimized for Answer Engine Optimization (AEO — Google AI Overviews, Perplexity, ChatGPT browsing) and Generative Engine Optimization (GEO).

---

## Why question form

- Google AI Overviews + People Also Ask boxes index question-form H2s heavily
- Perplexity + Claude.ai citations prefer pages with clear Q&A structure
- `FAQPage` JSON-LD schema (which we inject) requires question/answer pairs

**EN allows `?` ending.** JA/KO conventions (per `translator_jp.md` / `translator_ko.md` Section 9) **forbid `？/?` in headlines** — use compact noun-phrase form that still reads as a question. Examples below.

---

## Section A — EN templates

Map original section H2 to question form. Use the closest matching template.

| Original section type | Question H2 template (EN) | Slug key suggestion |
|---|---|---|
| Executive summary / overview | `What you need to know about [X market in country, year]?` | `overview` |
| Macro context | `What's the macro backdrop for [X] in [country], [year]?` | `macro-context` |
| Market sizing | `How large is [X market in country], [year]?` | `market-size` |
| Sector economics / unit economics | `What are the unit economics of [X] in [country]?` | `unit-economics` |
| Segment breakdown | `What segments make up [X market] in [country]?` | `segments` |
| Competitive landscape | `Who are the top players in [X] in [country], [year]?` | `top-players` |
| Demand drivers | `What's driving [X market] growth in [country]?` | `growth-drivers` |
| Channels / distribution | `How does [X] reach end customers in [country]?` | `distribution` |
| Regulatory landscape | `What regulations affect [X] in [country], [year]?` | `regulation` |
| AI impact | `How is AI reshaping [X] in [country], [year]?` | `ai-impact` |
| Forecast / outlook | `What's the outlook for [X market in country] through [year+5]?` | `outlook` |
| Strategic implications | `How should companies position in [X market in country]?` | `strategy` |
| Risk factors | `What risks face [X market participants] in [country]?` | `risks` |
| Pricing trends | `How are prices moving in [X market in country]?` | `pricing` |
| Entry strategy | `How to enter [X market in country]?` | `entry` |

**Slug rule**: `<industry-lower>-<country-lower>-<slug_key>-<year>` (e.g. `coffee-vietnam-market-size-2026`).

**Variations** for headline freshness — pick whichever fits better:
- `How large is [X]?` ↔ `What is the size of [X market]?` ↔ `How big is [X] in [year]?`
- `Who leads [X]?` ↔ `Who are the top [N] players in [X]?` ↔ `Which companies dominate [X]?`
- `What drives [X]?` ↔ `Why is [X] growing?` ↔ `What's behind [X] growth?`

---

## Section B — JA templates

JA register per `translator_jp.md` Section 2/9:
- 敬体 (です・ます) in body, but **headlines may use noun-phrase form** (体言止め) — punchier, no `？`.
- NEVER `？` in headlines (per anti-pattern table line 240).
- NEVER `〜とは？` framing.

| Original section type | JA headline (noun-phrase / 体言止め) |
|---|---|
| Executive summary | `[country]・[X市場 year]年の要点` |
| Macro context | `[country]・[X]市場のマクロ環境` |
| Market sizing | `[country]・[X市場]の規模 — [year]年実績と予測` |
| Sector economics | `[country]・[X]のユニットエコノミクス` |
| Segment breakdown | `[country]・[X市場]を構成するセグメント` |
| Competitive landscape | `[country]・[X]の主要事業者 — [year]年` |
| Demand drivers | `[country]・[X市場]の成長牽引要因` |
| Channels | `[country]・[X]の流通チャネル構造` |
| Regulatory | `[country]・[X]を規定する規制環境 [year]年` |
| AI impact | `AIが[country]・[X]を再構成する6つの活用事例` |
| Forecast | `[country]・[X市場]の[year]年以降の見通し` |
| Strategic implications | `[country]・[X市場]における戦略的ポジショニング` |
| Risk factors | `[country]・[X市場参加者]が直面するリスク` |
| Pricing | `[country]・[X]の価格動向` |
| Entry strategy | `[country]・[X市場]への参入戦略` |

**JA-specific notes:**
- Use 「・」 (中点) to separate country and topic.
- AI section uses concrete count (`6つの活用事例`) when known — more specific = better AEO.
- Translation rule for FAQ JSON-LD: even though headline drops `？`, the FAQ schema `Question` field should restore the interrogative form (`市場規模はどうですか` or `主要事業者は誰ですか`) for proper indexing — this is invisible to readers but matters for AI Overviews.

---

## Section C — KO templates

KO register per `translator_ko.md` Section 2/9:
- 합쇼체 in body, but **headlines may use 명사형 (noun form)** — punchier, no `?`.
- NEVER `?` in headlines (per anti-pattern table line 244).
- NEVER `~란?` framing.

| Original section type | KO headline (noun form / 명사형) |
|---|---|
| Executive summary | `[country]・[X시장 year]년 핵심 요점` |
| Macro context | `[country]・[X] 시장의 거시 환경` |
| Market sizing | `[country]・[X시장] 규모 — [year]년 실적 및 전망` |
| Sector economics | `[country]・[X]의 단위 경제성` |
| Segment breakdown | `[country]・[X시장]을 구성하는 세그먼트` |
| Competitive landscape | `[country]・[X]의 주요 사업자 — [year]년` |
| Demand drivers | `[country]・[X시장] 성장 견인 요인` |
| Channels | `[country]・[X]의 유통 채널 구조` |
| Regulatory | `[country]・[X]을 규정하는 규제 환경 [year]년` |
| AI impact | `AI가 [country]・[X]을 재편하는 6가지 활용 사례` |
| Forecast | `[country]・[X시장]의 [year]년 이후 전망` |
| Strategic implications | `[country]・[X시장]에서의 전략적 포지셔닝` |
| Risk factors | `[country]・[X시장 참여자]가 직면하는 리스크` |
| Pricing | `[country]・[X]의 가격 동향` |
| Entry strategy | `[country]・[X시장] 진입 전략` |

**KO-specific notes:**
- Use 「·」 or 「ㆍ」 to separate country and topic.
- FAQ JSON-LD `Question` field — restore interrogative form (`시장 규모는 어떻습니까` or `주요 사업자는 누구입니까`) even though visible headline drops `?`.

---

## Section D — JSON-LD schema to inject per Insight

The Insight template at `public/<locale>/insights/_view.html` already injects `Article` JSON-LD per CLAUDE.md note. The Insight body content should ALSO include inline `FAQPage` schema for AEO. Pattern:

```html
<script type="application/ld+json" id="ld-faq-insight">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "<question form of the H2 — for JA/KO use restored ? form>",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "<first paragraph of body, plain text, ~300-500 chars>"
      }
    }
  ]
}
</script>
```

Insight_runner.md subagents should embed this script tag at the top of the `body` field. The template renders it inline; Google AI Overviews + Bing Chat parse it.

**For trilingual**: each locale's body has its own FAQ schema, with the locale's question/answer in that locale.

---

## Section E — Slug derivation rules (summary)

```
slug = <industry-lower>-<country-lower>-<slug_key>-<year>
```

Examples:
- `coffee-vietnam-market-size-2026`
- `fintech-vietnam-top-players-2026`
- `aquaculture-vietnam-outlook-2027`

Constraints:
- All lowercase, dashes only, ASCII only (no Vietnamese diacritics — strip via `slugify`)
- Country = full English name (vietnam, indonesia, thailand, japan, korea, ...) NOT ISO code
- `slug_key` from Section A right column
- If collision: append `-2`, `-3`

The slug is the same across all 3 locales (EN/JA/KO). Locale-specific routing via `/<locale>/insights/<slug>` happens at the Vercel rewrite layer — the slug doesn't change.

---

## Section F — What this does NOT do

- This file is a **reference** for the extraction subagent in insight_runner.md Stage E. It is NOT executed; the subagent reads it as guidance.
- It does NOT enumerate every possible question — the subagent uses these as templates and adapts wording per actual section content.
- It does NOT replace `translator_jp.md` / `translator_ko.md` — those govern body translation. This file only governs HEADLINES.

---

## Phase Q.2 changelog (2026-05-25)

- New file. Reference for insight_runner.md.
- 15 section types × 3 locales = 45 question templates.
- FAQPage JSON-LD pattern documented for AEO.
