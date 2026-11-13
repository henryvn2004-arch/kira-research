# Insights v2: short, news-led briefs (plan, 2026-10-14)

Owner asked to rebuild `/insights` (2026-10-14): report extracts (S-insights from 2026-10-13) read as
recycled content and do not help SEO/AEO/GEO. New insights are **new, dated, short** pieces about what just
changed in one of KIRA's 15 markets, written so search engines and answer engines can quote them.

Status: **pipeline built 2026-10-14** (private `kira-pipeline/brain/insights/runner/`, not run yet). The 5 briefs
in `pilot/` were the first format; after reviewing them the owner asked for **commentary columns** instead
(see "Format, revised" below).

## Format, revised after the pilot (owner, 2026-10-14)

The pilot briefs were too narrow: readers ask a chatbot about "Decree 342" directly, and few know the decree
number in the first place. Each column now takes one big force (tariffs, rates and capital flows,
geopolitics, technology, energy, consumer change, regulation) and says what it does to an industry in KIRA's
markets, with a point of view, like a column in a leading business paper: what happened, our view (what most
coverage misses), a winners/losers table, 2-3 predictions with a time frame and a signpost to watch, 3 FAQ,
dated sources. 450-650 words. Titles name the force and the industry, never a decree number. Topics come from
what is trending in the last 7-14 days: one batch finds 5-10 candidate titles and writes the best 3-5.
Bylines: desks for now; the owner will send a list of real reviewers.

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Scope | One country × one industry × one driver per piece | KIRA cannot win global queries ("Trump tariffs") against wire services; long-tail market questions ("Vietnam Decree 342 foreign retail licence") are winnable and match the buyer (JP/KR/CN companies entering ASEAN) |
| Drivers (fixed list) | `policy` Policy & regulation · `trade` Trade & market access · `tax` Tax & incentives · `energy` Energy & resources · `tech` Technology & infrastructure · `capital` Capital & deals · `consumer` Consumer & demand | Small, stable list for hub pages and schema `about` |
| Length | 300–500 words EN, 2–3 min read | Owner: short |
| Cadence | Target 5–10 a day once automated, every piece in EN + JA/KO/ZH at publish | Owner |
| Structure | H1 (event + market + effect) → one-line answer (dek) → 3 key takeaways → 1–3 short sections (a table where it fits) → FAQ (3 Q&A, 1–2 sentences each) → sources (title, publisher, date, link) → related report / coming-soon page | Answer-first; tables and dated numbers are what answer engines quote |
| Facts | Every number has a dated public source in the `sources` list; news no older than 14 days (30 for a law about to take effect); conflicting sources are named, not hidden | No invented numbers (hard rule); trust signal |
| URL | Keep `/<locale>/insights/<slug>`; add hub pages per driver, country and industry instead of nesting URLs | An article belongs to several drivers/industries; changing a category would break URLs; the 118 indexed URLs keep working |
| Author | **Desk bylines**, one per country: "KIRA Vietnam Desk", etc., with a desk page and a monogram badge. No invented named people | Invented analysts with stock or generated faces are fake authorship: a trust and E-E-A-T risk if found, and not allowed by the no-fabrication rule. Real named contributors can be added later as real people |
| Schema | `NewsArticle` (author = Organization desk, `about` = country + industry + driver), `FAQPage`, `BreadcrumbList`. No `ClaimReview` (fact-check sites only), no fake `Person` | |
| Images | One chart drawn from the article's own numbers (SVG) when the data supports it; listing thumbnails from the six CSS cover designs already used on coming-soon pages. No generated images, no stock photos by default (Pexels/Unsplash only if the owner wants photos) | Free, on-brand, and a chart is original content others cite |
| Old insights | The 118 report extracts stay live, labelled "From the report", listed after the new briefs | Keep indexed URLs and report links |
| Input | The weekly planner's news scan (`kira-pipeline/taxonomy/planner_weekly.md`) already finds dated, sourced signals per country × industry; each strong signal can become a brief that links to the boosted topic's report or coming-soon page | Reuse; drives readers to the email form on coming-soon pages |

## Pilot (2026-10-14)

`pilot/{en,ja,ko,zh}.json`, one structure per locale (fields: slug, country, industry, driver, author,
published, read_min, title, dek, takeaways, sections[{h2, p, list, ol, table}], faq, sources, related).

1. VN · policy · Decree 342/2026 on foreign-invested trading and retail (effective 18 Oct 2026)
2. ID · trade · halal deadline for imported food and drinks (17/18 Oct 2026)
3. TH · tech · data centre pause, 166 projects (4 Sept / 1 Oct 2026)
4. MY · tax · Budget 2027 (tabled 9 Oct 2026)
5. PH · energy · Meralco October 2026 power rate

## Next (written before the format change; steps 2-3 are now the insights runner)

1. Template: render this structure on `insights/_view.html` (key takeaways box, tables, FAQ, sources,
   desk byline, chart), desk pages, hub pages, `NewsArticle` schema; DB fields for driver, takeaways,
   faq, sources (migration).
2. Generator in private `kira-pipeline` (same pattern as the Kira Experts daily runner): pick signals →
   write → independent source check (every number must appear in a fetched source) → publish → translate
   JA/KO/ZH with a number-fidelity gate.
3. Measure: Search Console + visits referred by answer engines (chatgpt.com, perplexity.ai, gemini) in
   `/en/admin/funnel`.
