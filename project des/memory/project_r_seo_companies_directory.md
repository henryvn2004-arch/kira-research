---
name: kira-r-seo-companies-directory
description: "Phase R — companies directory as SEO/AEO/GEO long-tail catcher. Henry's hypothesis: company-name long-tail outperforms category long-tail. Two complementary patterns proposed. Picked up 2026-05-28 as part of broader SEO/GEO/AEO push."
metadata:
  node_type: memory
  type: project
  status: next-up (2026-05-28 — SEO/GEO/AEO sprint kickoff)
---

## Status (2026-05-27 evening)

Henry signaled tomorrow's session (**2026-05-28**) starts SEO/GEO/AEO work. Phase R companies-directory is the most concrete starting point but the umbrella may also cover:

- **SEO (technical/on-page)** — schema markup expansion, internal linking, Phase 7.3 GSC follow-up
- **GEO (Generative Engine Optimization)** — make KIRA the cited source for ChatGPT / Perplexity / Gemini answers on SEA market data
- **AEO (Answer Engine Optimization)** — same family as GEO; structured data + concise factual claims tuned for LLM citation extraction

First-question to ask Henry when picking up: which scope first — Phase R companies pages, AEO surface (schema + factual concision), or GSC-side technical SEO?

## The hypothesis (Henry, 2026-05-27)

> "maybe làm 1 cái directory companies, để catch long-tail search của users? maybe list company name, hay list theo product/services/country, kiểu như top companies; kinh nghiệm của tao thì company name long tail catch dc nhiều hơn"

Henry's prior experience says **company-name long-tail catches more traffic than category long-tail**. Build a `/companies/` directory to harvest this.

## Why it's likely right (analyst take)

1. **Buyer intent is high** — query "Intimex Group coffee Vietnam revenue 2024" = research-mode buyer, not browser
2. **Aggregate volume is huge** — 100 companies × 30-50 searches/mo = 3-5k visits/mo from a single query class
3. **Aggregator playbook** — Mordor/Frost/IMARC all maintain company DBs precisely for this; KIRA copies the same SEO posture
4. **AI Overviews bias** — `[company] revenue [year]` queries often pull from tier-3 sites if they're the only ones with concise structured data → KIRA can win these

## Two patterns to build (complementary, not competing)

| Pattern | URL | Catches | Source |
|---|---|---|---|
| **A. Single-company page** | `/companies/intimex-group-vietnam` | `<company> [year]`, `<company> revenue`, `<company> competitors`, `<company> EUDR readiness` | Extract from "Top players" / "Competitive landscape" sections of existing reports |
| **B. Top-N ranking page** | `/companies/vietnam/coffee/top-exporters-2026` | `top coffee exporters vietnam`, `biggest <industry> companies <country>`, `<industry> market leaders <country>` | Same source data, ranked angle |

Both patterns reuse the same company facts (revenue, market share, products, recent moves). Build the data layer once; render two URL types.

## Risks to manage

1. **Thin content → soft-404** — page needs minimum ~300-500 words real data. Don't ship a page that's just "Intimex Group, HCMC, founded 1995, ★★★ → see report."
2. **Cannibalize own report page** — company page must NOT outrank its source report on the report's primary keyword. Solution: company page shows ~30-40% of report data + bold CTA "Get the full segmentation in [report] →".
3. **Maintenance overhead** — company info goes stale 6-12 months. Tie company-page refresh to its anchor report's regen via existing soft-delete pattern ([[project_m3_soft_delete_regen]]).
4. **Brand-voice trap** — `[company name]` SERP is owned by corporate sites + Wikipedia + LinkedIn. KIRA can't outrank those on generic facts. Win angle: KIRA-specific analytical claim ("our analysts note Intimex's EUDR pilot leads peers by 18 months") that the others don't have.

## Open questions for the session that picks this up

1. **Data extraction**: subagent reads existing `outputs/batch/<id>/en.html` and extracts company facts into `companies` table? Or LLM-generates on read from page-09 "Top players" section?
2. **Schema**: new table or columns on existing `living_reports`? Each company can be cited in N reports — many-to-many.
3. **i18n**: company names — keep Latin script in all locales, or translate (Phuc Sinh → 福生)? Recommend keep Latin globally to match aggregator convention.
4. **Sitemap + AEO surface**: each company page needs `Organization` JSON-LD + `BreadcrumbList`. Top-N pages need `ItemList` + `Article`.
5. **Volume target**: 100 companies × 3 locales = 300 pages MVP. ~500 companies = 1500 pages stretch.
6. **Cost**: extraction is one-shot per company (~50K tokens), then refreshes when source report refreshes. Manageable on Max 5x quota.

## Adjacent ideas to consider but probably defer

- **Industry × country landing pages** (`/markets/vietnam/coffee/`) — already partially implied by report library. Defer.
- **People directory** (CEOs / analysts mentioned in reports) — Wikipedia + LinkedIn own this SERP; bad ROI. Skip.
- **Investment-flow tracker** (M&A, funding rounds) — needs data feed maintenance. Defer past Year 1.

## Phase numbering

This is **Phase R**. Slots between Phase Q (insight runner) and Phase S (TBD). Adding to memory as a brainstorm parking lot — Henry plans to discuss on the other machine.

## See also

- [[project_batch_cron_system]] — same report library is the data source for company facts
- [[project_q_insight_runner]] — same extraction pattern (subagent reads en.html, emits structured records) can be reused for companies
- [[project_m3_soft_delete_regen]] — refresh semantics already work; tie company pages to anchor-report regen
- [[project_l3_source_tag_system]] — company facts need source tags too (`[Kira estimates]` or named source)
