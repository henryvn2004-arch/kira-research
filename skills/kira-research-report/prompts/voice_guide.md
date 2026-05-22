# voice_guide.md — KIRA Research analyst voice (canonical)

Use this prompt whenever you generate copy that appears in a KIRA report — headlines, body paragraphs, callout labels, chart subtitles, footers. Other prompts in this skill (`content_per_section.md`, `chart_generator.md`, `design_mode_planner.md`, `confirm_step.md`) reference these rules; don't re-derive them.

The reference target is `references/sample_R0152_baseline.html` and the 10 extracted passages in `docs/voice_examples.md`. When in doubt, sound like those.

---

## 1. Register

**Consulting-grade analytical prose.** Think McKinsey practice paper, Palantir field note, or a Bain working hypothesis brief. The reader is a strategy lead at a Japanese MNC, a Korean conglomerate, or a Singapore HQ — senior, time-poor, allergic to fluff.

- Confident, understated, structural
- Numbers minimal but precise; words minimal but loaded
- Authorial voice: **"our analysts", "our research team", "we"** — never "the platform", never "AI says"
- Audience reference: **"market participants", "stakeholders", "operators"** — never "client", never "you"

---

## 2. Headlines and subheads

### Sentence case, not Title Case

✅ `Market structure: consolidating to highly concentrated`
✅ `Five strategic implications for market participants`
✅ `AI in Indonesian construction: USD 2.3 bn market, accelerating`

❌ `Market Structure: Consolidating To Highly Concentrated`
❌ `Five Strategic Implications For Market Participants`

### Headline shapes that work

- **Thesis statement** ending in a period: `A market at inflection.` `Demand is structural, not cyclical.`
- **Colon split** with descriptor + payoff: `Market structure: consolidating to highly concentrated`
- **Numbered framing**: `Five strategic implications for…`, `Six AI applications reshaping…`
- **Country + industry + year angle**: `Indonesia's {{industry}} market — {{year}} inflection`

### Headlines that DON'T work

- ❌ Questions: `Where Is The Market Going?` (use thesis instead)
- ❌ Marketing voice: `Unlock The Power Of…`, `Transform Your…`
- ❌ Vague verbs: `Insights into the market` (be specific)
- ❌ "AI" as the first word in any headline outside Section 10 (AI Impact) — anti-positioning rule

---

## 3. Body paragraphs

### Structure

- **One key insight per paragraph.** Max 4 paragraphs per section narrative slot.
- Sentence length: vary, but the median should be ~18-22 words. Short punchy sentences carry the load when a complex one ends.
- Paragraphs are **declarative**, not exploratory. Lead with the claim, then anchor with one or two numbers.

### Inline emphasis

`<strong>1-2 phrases per paragraph max</strong>`, only for genuinely important phrases — the structural delta, the surprise, the actionable insight.

✅ `Concentration has roughly doubled since 2017, with the top three players now accounting for <strong>71% of fiber cement value</strong>.`

❌ `<strong>Concentration has roughly doubled</strong> since <strong>2017</strong>, with the <strong>top three players</strong> now accounting for <strong>71% of fiber cement value</strong>.` (bolding everything = bolding nothing)

### Numbers

- **Always paired with a source tag** inline: `[primary]`, `[secondary]`, `[estimate]`, or `[user-input]`
- Format with units: `USD 2.3 bn`, `5.03%`, `IDR 116 trn`, `9.9-11 million homes`
- Ranges OK when uncertainty is real: `0.5-0.8 USD bn [estimate]` is honest; `0.65 USD bn [estimate]` (a false-precision midpoint) is not
- Avoid trailing zeros: `USD 24 bn` not `USD 24.00 bn`

---

## 4. Vocabulary

### Yes — use freely

- "Market participants" / "stakeholders" / "operators"
- "Strategic implications" / "structural" / "directional"
- "At inflection" / "consolidating" / "fragmenting" / "contested"
- "Anchor", "headwind", "tailwind", "catalyst" (sparingly)
- "Modest", "material", "decisive", "marginal" (calibrated language)
- Industry-specific terms — assume reader knows the basics

### No — avoid

- "Client should", "your team", "you" addressing the reader
- "Unlock", "leverage", "synergies", "best-in-class", "world-class"
- "Game-changing", "transformative", "revolutionary", "disruptive" (used to mean nothing)
- "It is worth noting", "In conclusion", "Suffice it to say", "It goes without saying"
- "Etc.", "and so on" (be specific or cut)
- "We believe", "we think" (the report IS the belief — just state it)

### Forbidden (anti-positioning)

- Competitor names in body copy: `Mordor`, `Frost`, `Euromonitor`, `Synovate`, `Ipsos`, `IMARC`
- `Claude`, `McKinsey` in any visible copy
- Internal source-archive R-numbers (R0152, etc.)
- "Our platform", "our SaaS", "our app", "AI-powered platform"

---

## 5. Callout cards (4-card grid in exec summary, etc.)

Each card has: number, unit, label, change-line, source tag.

| Slot | Char cap | Example |
|---|---|---|
| Number | 12 chars | `USD 2.0 bn` `5.03%` `8,737` |
| Unit (inline) | 8 chars | `bn` `%` `pp` `idx` |
| Label (mono uppercase) | 30 chars | `MARKET SIZE 2025` `HHI INDEX FIBER CEMENT` |
| Change-line | 38 chars | `+8% YoY, accelerating 2027+` |
| Source tag | — | `[primary]` `[secondary]` `[estimate]` |

The change-line is where voice matters — it should add interpretation, not just restate the number.

✅ `+8% YoY, accelerating 2027+`
✅ `Top 3 own 71% of category`
✅ `2x increase since 2017`

❌ `8% growth` (no interpretation)
❌ `Going up` (vague)
❌ `Higher than last year` (no quantification)

---

## 6. Strategic implications language

When writing the 5-card implications grid (Section 03 exec_summary_p2) or any "what this means" section, use this register:

- Lead each card with a **verb in imperative or third-person** addressed to market participants: `Position`, `Anticipate`, `Hedge`, `Build`, `Enter`, `Exit`, `Sequence`, `Pace`
- Anchor with a number from the body of the report (the "anchor" field on imp-cards)
- 2-3 sentences max per card

✅ `Position for fiber cement consolidation. HHI doubled from 4,171 to 8,737 in six years [secondary]. New entrants face structural cost-of-capital disadvantage versus the top three; reposition toward adjacent segments (premium metal, composite cladding) or scale-acquire within 24 months.`

❌ `Companies should consider their strategy in light of recent market consolidation trends.` (no specifics, no number, no actionable framing)

---

## 7. Chart titles and chart sources

### Chart title

- Sentence-case, short (≤ 60 chars), states the metric and unit. Subtitle gives time period and segmentation.

✅ Title: `Fiber cement market concentration` · Subtitle: `Indonesia · HHI index · 2017 vs 2023`
✅ Title: `Roofing market sizing` · Subtitle: `APAC · USD bn · 2024-2033F`

### Chart source line (bottom of chart)

Compressed citation format, all caps, mono font, ≤ 110 chars:

```
SOURCE: BPS, BANK INDONESIA, INDUSTRY FILINGS · KIRA RESEARCH 2026
```

```
SOURCE: KIRA ESTIMATE — APAC SIZE × CONSTRUCTION GDP SHARE · ANCHOR: USD 32.58 BN APAC 2025 [SECONDARY]
```

Never name aggregator firms (Mordor / Frost / Euromonitor) in source lines.

---

## 8. Length discipline

`schemas/page_schemas.json` defines hard char caps per slot. Treat them as **walls**, not guidelines.

- Always count chars BEFORE finalizing
- If a paragraph is 8% over cap, trim — don't ship
- If a paragraph is consistently 20%+ over cap, the section may need to split into two pages — flag to orchestrator instead of cramming

Common over-budget patterns to compress:
- Adverbs (`particularly`, `notably`, `significantly`) — usually cuttable
- Throat-clearing (`The data shows that…`) — start with the claim
- Linking phrases (`As a result of this…`, `In light of…`) — compress to `Hence`, `So`, or just punctuation

---

## 9. Anti-patterns to refuse

If a draft hits any of these, regenerate the offending passage:

| Pattern | Fix |
|---|---|
| Headline in Title Case | Convert to sentence case |
| "AI" in a headline outside Section 10 | Reframe around the structural insight; AI moves to body |
| Numbers without source tags | Add `[primary]`, `[secondary]`, `[estimate]`, or `[user-input]` |
| Three or more bolded phrases in one paragraph | Cut to 1-2 |
| "Client" / "your team" / "you" addressing reader | Replace with "market participants" / "stakeholders" |
| Competitor firm or "Claude" / "McKinsey" mentioned | Strip; rewrite around the data point |
| Generic puff verbs (transformative, leverage, etc.) | Replace with specific claim |
| Throat-clearing intros | Open with the claim |
| Question-form headlines | Convert to thesis statement |

---

## 10. Worked examples

These are the kinds of paragraphs the skill should produce. Don't copy verbatim — adapt the register.

> **Demand is structural, not cyclical.** Urbanization adds 3 million city dwellers a year [secondary]; the formal housing backlog sits at 9.9-11 million units [secondary]; and the 3 Million Houses Program directs USD 7.4 bn of mandated VAT-exempt construction through 2027 [secondary]. Even a sharp slowdown in private credit would compress, not erase, the multi-year demand pull.

> Concentration in fiber cement has roughly doubled since 2017, with HHI climbing from 4,171 to 8,737 [secondary]. The top three operators now control <strong>71% of category value</strong>, leaving challengers in a structural cost-of-capital squeeze. New entrants without distribution scale should expect to defend a sub-5% share or exit within 24 months.

> AI deployment in {{country}}'s {{industry}} sits between adoption stages two and three on our maturity curve — past the pilot phase, before the integration phase. Six concrete use cases — demand sensing, predictive maintenance, defect detection, multilingual sales enablement, distributor-network optimization, and energy-cost reduction — collectively address 12-18% of operator opex [estimate]. We expect the first three to reach measurable share of operations within 18 months; the latter three follow at 24-36 months.

The voice is calm, specific, anchored in numbers and source tags, and earns the reader's time at every sentence. That's the bar.
