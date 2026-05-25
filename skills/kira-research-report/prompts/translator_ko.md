# translator_ko.md — KIRA Research Korean translation prompt

Use this prompt when translating a finalized EN KIRA report HTML into KO. The input is `outputs/<slug>/en.html`; the output is `outputs/<slug>/ko.html`. Charts, layout, and numbers are kept; only translatable copy changes.

This prompt is the canonical KO voice guide for this skill. Whenever you ship KO copy in this repo, follow these rules.

---

## 0. Inputs and outputs

**Input:** A fully rendered EN HTML report (12-22 pages, KIRA brand). Has all charts as inline SVG, source tags in NEW format (Phase L.3): `[Kira estimates]` for KIRA-derived figures and `[<Source Alias> <Year>]` for named externals (e.g. `[BPS 2024]`, `[Vinacafe AR 2025]`, `[AC Nielsen 2026]`). UC3 reports may also include `[user-input]`. Callout cards with char-capped labels and change-lines. Every content page ends with a `SOURCE KEY · alias = full citation · ...` line at the bottom (the alias→full mapping for that page).

**Output:** Same HTML structure, every translatable text node replaced with KO equivalent. The PDF re-renders via the same `/api/render-pdf` endpoint after substitution.

**What you DO NOT touch:**
- SVG geometry (only `<text>` content inside SVGs)
- **Source tags — keep ALL bracketed citations verbatim in English brackets**:
  - `[Kira estimates]` stays as `[Kira estimates]` — do NOT translate to `[KIRA 추정]` or `[1차자료]`
  - `[BPS 2024]`, `[Vinacafe AR 2025]`, etc. stay verbatim — do NOT translate the source name
  - `[user-input]` stays as-is
- **Source key footer line** (`SOURCE KEY · alias = ...`): translate only the LABEL `SOURCE KEY` → `출처 범례`; keep all aliases + full citations in their original English form. The full citations are proper nouns of source documents — these are NOT translated, like company names.
- Numbers and units: `USD 2.3 bn`, `5.03%`, `IDR 116 trn` — preserve verbatim (USD/IDR stay as ISO codes, "bn"/"%"/"pp" stay English; the KO reader recognizes them)
- HTML tags, class names, IDs
- Chart SOURCE lines: keep mono-uppercase format, only translate the descriptor part (`industry trade press` → `업계 전문지`); leave `KIRA RESEARCH 2026` and dataset names (`BPS`, `BANK INDONESIA`) as-is

---

## 1. Register — 합쇼체 (formal business)

Mirror the EN register: confident, understated, structural. The KO audience is a strategy lead at a Korean conglomerate (chaebol HQ, financial group, manufacturer) — senior, time-poor.

**Use:**
- 합쇼체 (-습니다 / -입니다 / -합니다) throughout body copy
- 한자어 중심 — prefer Sino-Korean compounds for technical/structural terms
- Authorial voice: **「당사 리서치팀」「당사 분석」「우리」** — never refer to KIRA as 「플랫폼」 or 「AI」
- Audience reference: **「시장 참여자」「이해관계자」「사업자」** — never 「귀사」, 「고객님」, 「여러분」

**Avoid:**
- 해요체 (-아요/-어요) — too informal for this register
- Over-formal honorifics (보여드리겠습니다, 알려드리오니 etc.) — sounds like a sales letter
- 외래어 (영어 차용어) padding (솔루션, 파트너십, 시너지) — see Section 4

---

## 2. Headlines and subheads

### Punctuation and case

KO has no case for Hangul, but mirror the EN sentence-case feel by:
- Avoiding all-caps within headlines (English fragments retain their case, e.g. `AI` stays `AI`)
- Using 「:」 (half-width colon) or 「 — 」 for the EN colon-split pattern
- Ending thesis-statement headlines with 「.」 — same as EN's period

### Translation patterns

| EN shape | KO equivalent |
|---|---|
| `A market at inflection.` | `변곡점에 선 시장.` |
| `Demand is structural, not cyclical.` | `수요는 순환적이 아니라 구조적이다.` (헤드라인은 -다 종결 OK) |
| `Market structure: consolidating to highly concentrated` | `시장 구조: 고도 집중화로의 이행` |
| `Five strategic implications for market participants` | `시장 참여자를 위한 5가지 전략적 시사점` |
| `Indonesia's roofing market — 2025 inflection` | `인도네시아 지붕재 시장 — 2025년 변곡점` |
| `Six AI applications reshaping…` | `…을(를) 재편하는 6가지 AI 활용 사례` |

**Headline-style 종결 note:** Headlines may use `-다` (declarative root form) for compactness — same energy as English period-ended thesis statements. Body paragraphs use 합쇼체 `-습니다`.

### Don't

- ❌ Question-form headlines (the EN guide forbids these; preserve the rule)
- ❌ 「~란?」 framing (same reason)
- ❌ Marketing-voice KO: 「업계를 혁신하는…」「미래를 여는…」 — these are the KO equivalents of "unlock / transform / revolutionize" and equally forbidden

---

## 3. Body paragraphs

### Structure preserved

One key insight per paragraph. Max 4 paragraphs per section. Lead with the claim.

### Sentence rhythm

- Median KO sentence length 50-70 characters (counting Hangul syllable blocks as 1 char) — varies, but matches EN information density
- Short punchy sentences land when they follow a complex one. Don't string 3+ short sentences in a row

### Inline emphasis

`<strong>` tags preserve position. 1-2 phrases per paragraph max. Translate WORDS inside `<strong>`, not the tag.

✅ `집중화는 2017년 이후 거의 두 배로 증가하여, 상위 3개 사업자가 <strong>섬유 시멘트 가치의 71%</strong>를 점유하기에 이르렀습니다.`

❌ Multi-bold same sentence (bolding everything = bolding nothing)

### Numbers and source tags

Numbers stay in their EN form. Source tags stay in English brackets (whether `[Kira estimates]` or named-source aliases like `[BPS 2024]`). Surrounding KO wraps them:

✅ `매년 300만 명이 도시 지역으로 유입되며[BPS 2024], 주택 공급의 누적 부족분은 990만~1,100만 호에 이릅니다[Bappenas 2025].`
✅ `2017년 이후 집중화가 진전되어 HHI는 4,171에서 8,737로 두 배 증가했습니다[Kira estimates].`

❌ `[1차]` / `[2차]` — tags are functional markers, not translatable copy

---

## 4. Vocabulary — KO-specific rules

### Prefer 한자어 over 외래어 for technical/structural terms

| 외래어 (avoid) | 한자어 (prefer) |
|---|---|
| 마켓 | 시장 |
| 플레이어 | 사업자 / 경쟁사 |
| 그로스 | 성장 |
| 밸류 체인 | 가치 사슬 |
| 볼륨 | 물량 / 출하량 |
| 마진 | 마진율 / 이익률 |
| 니치 | 특정 영역 / 틈새 (니치 OK as standard biz term) |
| 트렌드 | 추세 / 동향 |
| 인플레 | 인플레 (standard) |
| 서플라이 체인 | 공급망 |
| 플랫폼 | 플랫폼 (when referring to actual platforms, OK; never use to describe KIRA) |
| 스테이크홀더 | 이해관계자 |
| 인사이트 | 인사이트 (standard biz term, OK) or 통찰 |

### Yes — use freely

- 시장 참여자, 이해관계자, 사업자
- 전략적 시사점, 구조적, 방향성
- 변곡점, 집중화, 분절화, 경쟁 격화
- 기점, 역풍, 순풍, 촉매 (sparingly)
- 경미한, 중요한, 결정적인, 한계적 (calibrated language)

### No — avoid

- 「귀사께서는」「귀하」「여러분」 (addressing reader directly)
- 「활용」 used vaguely (「AI를 활용」 without specifics) — same as EN "leverage" — be concrete
- 「게임 체인저」「혁신적인」「파괴적인」 used to mean nothing — KO empty-puff equivalents
- 「~인 것 같습니다」「~라고 생각됩니다」 (we believe / we think) — the report IS the belief, state it
- 「이상의 내용을 종합하면」「결론적으로」「말할 필요도 없이」 (throat-clearing)
- 「등」「등등」 at sentence end (be specific or cut)

### Forbidden — anti-positioning (SAME as EN rule, applies in KO too)

- Competitor firm names: `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC` — never in KO copy
- `Claude`, `McKinsey` — same
- Internal R-archive numbers (R0152, etc.)
- 「당사의 플랫폼」「SaaS」「앱」「AI 기반 플랫폼」 — never frame KIRA this way

---

## 5. Callout cards — char caps in KO

KO Hangul syllable blocks carry roughly the same visual width as 全角 JP, so the same compression applies:

| Slot | EN cap | KO cap | Example |
|---|---|---|---|
| Number | 12 chars | unchanged | `USD 2.0 bn` |
| Unit | 8 chars | unchanged | `bn` `%` |
| Label (mono uppercase) | 30 chars | **15 음절** | `시장규모 2025년` `HHI 지수 섬유시멘트` |
| Change-line | 38 chars | **20 음절** | `전년比 +8%, 2027년 이후 가속` |

**Important:** mono-uppercase labels in EN translate to **mono-bold KO** at the same font size — the JetBrains Mono font in the CSS supports KO glyphs via fallback to Noto Sans KR. Don't add 「레이블:」 prefix; just the value.

The change-line is where voice matters — interpretation, not restatement.

✅ `전년比 +8%, 2027년 이후 가속`
✅ `상위 3사가 71% 점유`
✅ `2017년 대비 2배 증가`

❌ `8% 성장` (no interpretation)
❌ `상승 추세` (vague)

---

## 6. Strategic implications cards

Lead each card with a verb-noun phrase in declarative-imperative KO form, addressed to market participants:

| EN verb | KO equivalent |
|---|---|
| Position for X | X에 대비한 포지셔닝을 |
| Anticipate X | X을(를) 사전에 반영 |
| Hedge X | X에 대한 헤지 구축 |
| Build X | X을(를) 구축 |
| Enter / Exit | 진입 / 철수 |
| Sequence | 단계적으로 추진 |
| Pace | 페이싱 조정 |

Worked example:

✅ `섬유 시멘트 시장 집중화에 대비한 포지셔닝을. HHI는 2017년 4,171에서 2023년 8,737로 두 배 증가했습니다[Kira estimates]. 유통 규모를 확보하지 못한 신규 진입자는 5% 미만 점유 방어 또는 24개월 내 규모 확보형 인수 중 양자택일에 직면합니다. 인접 세그먼트(프리미엄 메탈, 복합 외장재)로의 재포지셔닝도 유효한 선택지입니다.`

❌ `집중화 추세를 고려한 전략을 검토해야 합니다.` (no specifics, no number, no actionable framing)

---

## 7. Chart titles and SOURCE lines

### Chart title

Sentence-case KO, short. Subtitle gives time period and segmentation.

✅ Title: `섬유 시멘트 시장 집중화` · Subtitle: `인도네시아 · HHI 지수 · 2017 vs 2023`
✅ Title: `지붕재 시장 규모` · Subtitle: `APAC · USD bn · 2024-2033F`

### Chart SOURCE line (bottom of chart)

Preserves the EN compressed-citation format. Translate ONLY the generic descriptor portion; keep dataset names, country names in source-data context, and `KIRA RESEARCH 2026` verbatim. Mono uppercase, ≤ 110 chars.

```
SOURCE: BPS, BANK INDONESIA, 업계 전문지 · KIRA RESEARCH 2026
```

```
SOURCE: KIRA 추정 — APAC 시장규모 × 건설업 GDP 비중 · ANCHOR: USD 32.58 BN APAC 2025 [SECONDARY]
```

Never name aggregator firms (Mordor / Frost / Euromonitor) in source lines.

---

## 8. Char-count discipline in KO

KO body paragraphs run roughly 0.75-0.85x the char count of their EN source (한자어 compresses similar to JP). Use this when checking layout fit:

- A 200-char EN paragraph → expect ~150-170 음절 in KO
- If a KO paragraph runs significantly LONGER than 0.9x the EN source, it's likely over-translated — trim 외래어 padding and 부사
- If a KO paragraph runs UNDER 0.6x the EN source, it's likely under-translated — check for skipped clauses

Common KO over-budget patterns to compress:
- 「~할 수 있습니다」 → 「~합니다」 (when context allows)
- 「~함으로써」 → 「~하여」
- 「~라는 관점에서 보면」 → 「~의 관점에서」
- 「~라고 할 수 있지 않을까 생각됩니다」 → 「~입니다」 (also fixes hedging)
- 「~에 있어서」 → 「~에서」

---

## 9. Anti-patterns to refuse

| Pattern | Fix |
|---|---|
| Headline ending in 「?」 | Convert to thesis statement |
| 해요체 used in body | Convert to 합쇼체 |
| 외래어-heavy passage | Replace with 한자어 equivalents per Section 4 table |
| Source tags translated to 「[1차자료]」 or 「[KIRA 추정]」 etc. | Restore English bracket form (`[Kira estimates]`, `[BPS 2024]`, etc.) |
| Source alias names translated (e.g. `[BPS 2024]` → `[인도네시아 통계청 2024]`) | Restore — aliases are proper nouns of source documents; they only appear in English |
| `[Kira estimates]` placed inside `<strong>` | Move outside — tags are functional markers |
| `SOURCE KEY` line not localized | Translate the label to `출처 범례` but keep all alias = full citation mappings in English |
| 「귀사」「고객님」 addressing reader | Replace with 「시장 참여자」「사업자」 |
| Competitor firm or `Claude` / `McKinsey` mentioned | Strip; rewrite around the data point |
| 「당사의 플랫폼」「AI 기반」 framing of KIRA | Reframe as 「당사 리서치팀」「당사 분석」 |
| Question-form headline | Convert to thesis |
| Numbers translated to KO-style (만, 억) when EN used bn/m | Restore EN bn/m form |

---

## 10. Worked translation passages

EN source (from `docs/voice_examples.md` line 1):

> **Demand is structural, not cyclical.** Urbanization adds 3 million city dwellers a year [BPS 2024]; the formal housing backlog sits at 9.9-11 million units [Bappenas 2025]; and the 3 Million Houses Program directs USD 7.4 bn of mandated VAT-exempt construction through 2027 [MoF Stim Pkg 2025]. Even a sharp slowdown in private credit would compress, not erase, the multi-year demand pull.

KO translation:

> **수요는 순환적이 아니라 구조적이다.** 도시화로 매년 300만 명이 도시 지역으로 유입되며[BPS 2024], 주택 공급의 누적 부족분은 990만~1,100만 호에 이릅니다[Bappenas 2025]. 300만 호 주택 계획은 VAT 면제 의무 건설 투자 USD 74억 규모를 2027년까지 지시하고 있습니다[MoF Stim Pkg 2025]. 민간 신용의 급격한 둔화가 발생하더라도, 다년간에 걸친 수요 견인은 축소될지언정 소실되지는 않을 것입니다.

---

EN source:

> Concentration has roughly doubled since 2017, with the top three players now accounting for <strong>71% of fiber cement value</strong>.

KO translation:

> 집중화는 2017년 이후 거의 두 배로 증가하여, 상위 3개 사업자가 <strong>섬유 시멘트 가치의 71%</strong>를 점유하기에 이르렀습니다.

---

EN source (callout change-line):

> +8% YoY, accelerating 2027+

KO translation:

> 전년比 +8%, 2027년 이후 가속

---

EN source (strategic implication):

> Position for fiber cement consolidation. HHI doubled from 4,171 to 8,737 in six years [Kira estimates]. New entrants face structural cost-of-capital disadvantage versus the top three; reposition toward adjacent segments (premium metal, composite cladding) or scale-acquire within 24 months.

KO translation:

> 섬유 시멘트 시장 집중화에 대비한 포지셔닝을. HHI는 6년간 4,171에서 8,737로 두 배 증가했습니다[secondary]. 신규 진입자는 상위 3사 대비 구조적 자본비용 열위에 처해 있습니다. 인접 세그먼트(프리미엄 메탈, 복합 외장재)로의 재포지셔닝 또는 24개월 내 규모 확보형 인수가 선택지입니다.

---

## 11. Process

When translating an EN HTML to KO:

1. Parse the HTML — identify all translatable text nodes (skip SVG geometry, class names, IDs)
2. Translate page-by-page (preserves context within each page)
3. After translation: regex-sweep for forbidden terms (Mordor, Frost, etc., plus hangul like `클로드` for Claude) — should be zero hits, but verify
4. Char-count check on callout labels and change-lines against the KO-specific caps in Section 5
5. Write final to `outputs/<slug>/ko.html`
6. Render PDF via `/api/render-pdf` (the endpoint handles KO fonts via Noto Sans KR fallback)

If a paragraph overflows after translation, prefer trimming `<strong>` content reach or removing one 부사, NOT removing a source tag or a number. Source tags + numbers are load-bearing; voice flourishes are not.

---

## 11.5 Chunked output protocol — for batch mode (Phase Q.1, 2026-05-25)

When called from `batch_runner.md` Stage C (multi-fire batch), a single `Write` of the full 67KB+ ko.html exceeds Sonnet's per-response output cap (~32K tokens ≈ 100KB), causing partial truncation or hangs. To avoid this:

**Use per-page Edit instead of one-shot Write.**

1. Read en.html. Identify:
   - **Shell prefix** — everything from `<!DOCTYPE html>` up to (but not including) the first `<div class="kira-page"`.
   - **Page blocks** — each `<div class="kira-page">…</div>` (top-level closing). Count them; should match `PAGE_COUNT` from parent.
   - **Shell suffix** — everything from after the last `</div>` (closing the last kira-page) to `</html>`.

2. **Write the shell prefix first** as ko.html:
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

**Page-level chunking rationale**: a typical KIRA page is 200-500 words = 600-1500 tokens output. Per-page Edit fits comfortably within any response budget with headroom for thinking.

**Validation post-translation**: the parent (`batch_runner.md` Step 5.2) re-counts `.kira-page` divs and source tags. If your output is missing pages (because you skipped some), the gate will fail and the row goes to status=error with a clear log. So: translate ALL pages, in order, no skipping.
