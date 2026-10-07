# brain_route.md — Stage 3d (BRAIN route: question-led report plan)

The BRAIN route turns a topic into a **buyer question**, lets the KIRA brain pick the analyses that answer it, and hands a `section_plan.json` to the normal Stage 4–7 pipeline (research → content → charts → render). It replaces blueprint matching (UC1) and design mode (UC2) whenever the brain is available.

## Where the brain lives — and what never leaves it

- The brain is in the **private** repo `kira-pipeline`, folder `brain/`. Path: env `KIRA_BRAIN_DIR` if set, else `<repo root>/../kira-pipeline/brain`. If neither exists, this route is unavailable and the orchestrator falls back to UC1/UC2.
- Write every brain artifact (framing, context pack, plan notes, brain trace) to a scratch folder **outside this repo**: env `KIRA_BRAIN_SCRATCH` if set, else the folder the caller names, else `<os temp dir>/kira-brain/<report_id>/`. Never write them under this repo, never commit them, never paste their contents into a commit message.
- The report itself never mentions the brain, modules, the archive, past projects or clients, framework names, or process reference models. It speaks as "our analysts".

## Step A — Frame the buyer question

Input: Stage 1 topic JSON + the queue row (`id`, `topic`, `country`, `industry`, `year`).

0. Fetch the owner-approved topic brief (a planner output the owner reviewed): `node skills/kira-research-report/scripts/fetch-topic-brief.mjs "<id>" > "<scratch>/topic_brief.json"`. If the file is non-empty, read it. An empty file means no brief: continue with step 1.
   - A topic is **one market segment in one country seen through one lens**, not a single narrow question. `segment` is the scope; keep the whole segment in view.
   - `lens` (when present) is the primary `question_types` value: use it as-is, so the brain's full storyline for that question type is the spine.
   - `buyer_question` is the decision the report answers. `guiding_questions` (4-6) are the chapters the report must cover (put them in `framing.json` as `guiding_questions`); they set coverage, they do not narrow the scope.
   - `must_cover` lists triggers (deals, rules, dates, named players) that must appear as evidence inside the relevant chapters. They are never the frame of the whole report. Facts marked VERIFY must be checked in Stage 4 before use.
   - `competency_label` + `stage` tell you which kind of analysis the buyer is at (explore, enter or expand). Keep the owner's wording of the questions.
1. If `data/report_framing.json` exists and has an entry for this `id`, use it as-is (owner-reviewed framing) and skip to Step B.
2. Otherwise frame it yourself. **Default buyer:** a Japanese or Korean company (strategy / corporate-development / country-launch lead) deciding whether and how to enter, expand in, invest in or partner in this market. Adjust when the market is the buyer's home: JP market → Korean or other foreign entrant; KR market → Japanese entrant; AU resources → Japanese or Korean offtaker / investor. If the topic is about an incumbent's moves (e.g. "Jollibee dominance"), the buyer is a foreign challenger or a would-be partner of the incumbent.
3. Write the question in one sentence a buyer would actually ask, keeping the topic's angle (e.g. "Philippines FMCG 2026: sari-sari modernization…" → "How should a Japanese FMCG brand win distribution in the Philippines as sari-sari stores modernise and modern trade hits its ceiling?").
4. Classify, using **only** the values defined in `<brain>/modules/selection_matrix.json`:
   - `question_types`: 1 primary (+ at most 1 secondary) from `question_types`
   - `offering`: 1–2 from `offering_overrides`
   - `countries`: ISO-2 (the market), `client`: ISO-2 (buyer's home), `position`: `new_entrant` unless the buyer clearly already operates there
   - `industry`: 1–2 folder names under `<brain>/industry/` (omit to let retrieval match by keywords)
   - `keywords`: 6–12 English terms (industry, sub-categories, channels, regulation names from the topic)
5. Save `framing.json` to the scratch folder:
```json
{"id": "...", "buyer": "Japanese FMCG brand owner", "question": "...", "question_types": ["distribution_channel"],
 "offering": ["fmcg"], "countries": ["PH"], "client": "JP", "position": "new_entrant", "industry": ["consumer_products"],
 "keywords": ["sari-sari", "modern trade", "FMCG", "distributor", "general trade"]}
```

## Step B — Build the context pack

```bash
python3 "<brain>/runner/retrieve.py" --q <question_types...> --offering <offering...> --countries <countries...> \
  --client <client> --position <position> [--industry <slugs...>] --keywords <keywords...> \
  --out "<scratch>/pack.md"
```
Then read `<brain>/runner/expert_prompt.md` and follow its **Procedure steps 1–3** (frame, select modules, plan evidence) on the pack. Keep the spine at 6–10 analyses. Record selections, drops and swaps in `<scratch>/brain_trace.md` (internal only).

## Step C — Turn the spine into a story and a page plan

Read `prompts/storytelling.md` (arc, page grammar, hooks) and `docs/exhibit_library.md` (16 exhibit types, layouts) first.

When a topic brief exists, every `guiding_questions` entry must be answered by at least one page, and the storyline's action titles must make the answers findable; list the mapping (question → page) in `brain_trace.md`.

Produce `section_plan.json` in the design-mode format (so Stages 4–7 run unchanged) with `route: "BRAIN"`, `buyer_question`, `thesis_one_paragraph` (working answer: a hypothesis to test, not a conclusion), `storyline` (the action titles of all body pages in order; read alone, they must tell the story), `default_output_mode: "publish"` and `requires_confirm_step: false`.

### 1. Build the arc before the pages

Map the spine analyses onto the arc in `storytelling.md` §2 (Hook → Situation → Complication → Resolution → Proof of action).
- Decide the **complication**: the one tension the report resolves. It is usually where the obvious move fails.
- Give that complication the most pages.
- Group analyses into 4–7 chapters; each chapter title is a claim.

### 2. Give each analysis the pages it earns

**There is no page target.** Each analysis gets 1–3 exhibit pages, depending on how many distinct claims its evidence supports. A 30–40 page report is normal when the evidence is rich.

The pack lists each analysis's expected exhibits with a `type`, under `exhibits`. Use them as the menu:
- pick the 1–3 exhibits per page that prove that page's claim;
- prefer the module's listed types;
- add a `big_number` breather page where a single number carries a chapter.

The anti-padding rule is the only cut: a page with no new data-backed claim is dropped.

### 3. Name the report

Follow `docs/naming_convention.md`. Pick from the framing:
- **Stage:** `XPL` when the question is whether the market is worth a look (size, growth, structure). `ENT` when it is how to get in (entry mode, partner, channel, pricing, go/no-go). `XPN` when the buyer already operates there.
- **Segment:** the 1–4 word noun a buyer would type (`coffee chains`, `cold chain`).
- **Angle:** in ≤ 60 characters. Prefer a question the report answers, in the owner's hook style (`How to win…?`, `Where to play…?`, `How to enter…?`, `How to expand…?`, `What are the key impacts of…?`); start from the approved brief's title when there is one. A statement (the working answer or tension) is allowed when a question would not fit.

Run `node scripts/report-name.mjs --country … --industry … --stage … --type D --year … --segment … --angle … --keywords "<synonyms and local-language terms from the pack glossary>" --out outputs/batch/<id>/naming.json`. Fix any rule it reports and run it again. Copy the result into `section_plan.json` as `naming`. Stage 5 may sharpen the angle once the evidence is in; rerun the script if it does.

### 4. Fixed pages

| Position | Page | Page type |
|---|---|---|
| Opening | Cover | `cover_<layout>` with the generated illustration (render_and_output Step 1b; layout from gen-cover's JSON). Title lines and report kind from `naming.json`; subtitle = the buyer question (≤110 chars). |
| Opening | Methodology | `methodology_inline` |
| Opening | Contents | `toc`. Chapters plus page titles; may run to 2–3 pages. |
| Executive summary, page 1 | The hook | `exhibit_page`, layout `layout-main-side` (exhibit or `big_number` + commentary with the 3 reasons) or `layout-hero` (big number + chart, reasons in the takeaway and on page 2). Title = the answer (go / no-go / conditional + the one-line reason). Kicker = the tension. |
| Executive summary, page 2 | Why | `exhibit_page`. The supporting arguments as a `comparison_table` or short cards, and the recommended move in the takeaway. |
| Chapter openers | Dividers | `divider`. Title = the chapter's claim; thesis = the tension it resolves. |
| Body | One or more pages per analysis | `exhibit_page` by default. The older specialised types (`competitive_profile_deep`, `channel_waterfall`, `policy_timeline`, `persona_profile`) may be used when they fit better. |
| Decision chapter | Conditions to win | `exhibit_page` with a `comparison_table`: condition / how sure we are / how to test it. Any number of conditions. |
| Decision chapter | Risks | `risk_matrix`, or `exhibit_page` with a `heatmap`. |
| Decision chapter | Options compared | `decision_scorecard` (use it here, and do not repeat the same grid as a `comparison_table` elsewhere; a `matrix_2x2` of the options in the body complements it). Use when real alternatives exist. |
| Decision chapter | Recommended path | `stage_gate_plan`, or `exhibit_page` with a `timeline` (Gantt with gates) plus a `comparison_table` of gate tests and budgets. Then a first-90-days page if it does not fit. |
| Near the end | Who's who | `players-page` pages printed by `scripts/render-players.mjs` from `players.json` (see "Who's who" below). Its own chapter in the contents. |
| Near the end | Methodology & sources | `methodology_endnote` (may run to 2 pages) |
| Last | Closing | `closing` (identical brand page; no image generation) |

Treaty and tariff checks go on a `timeline` or `comparison_table` page. A landed-cost build-up is a `waterfall`. How the industry operates is a `flow` exhibit; use the pack's process flow but describe today's practice, not the 2010 model.

### 5. Page entry

Each body page in `section_plan.json` carries:

```json
{"id": "05_channel_margins_p1", "chapter": "Who controls the route", "section_num": "05",
 "page_type": "exhibit_page", "layout": "layout-main-side",
 "action_title": "A sachet loses 40% of its shelf price before it reaches the store owner's hand",
 "exhibits": [{"type": "waterfall", "shows": "ex-factory to shelf price build-up for a PHP 10 sachet, by layer"}],
 "companion": "commentary",
 "takeaway_intent": "the layer to squeeze is the second-tier wholesaler, not the retailer",
 "hook": "concrete scene",
 "analysis_brief": "Build the margin stack layer by layer for one or two reference packs. Separate front-end margin from back-end income (rebates, listing and display fees). Decision rule: a layer keeping >15% without a service it performs is the one to bypass. Pitfall: list prices are not transaction prices.",
 "research_inputs_expected": ["distributor margin bands (trade press, distributor filings)", "retail mark-up on sachets (press reports of store checks)"]}
```

- `action_title` is a hypothesis; Stage 5 rewrites it to what the evidence shows.
- `analysis_brief` is in plain words: no module slugs, card IDs or framework names.
- `companion` is one of `commentary`, `big_number`, `callout`, `second exhibit`.
- `hook` is a technique from storytelling §4, used on chapter openers and on 1 page in 3.
- Decision pages are not chart-bearing for the pre-render "chart_data populated" check.

### Who's who (owner, 2026-10-07)

The last chapter lists the companies in the industry, grouped by value-chain stage. It is also the seed of KIRA's company database, so it must be accurate.

- **Stages:** 3–6, in value-chain order, taken from the pack's value chain and cut down to the stages that matter for this product in this country. Plain labels of 26 characters or fewer, e.g. for ready-to-drink beverages: "Ingredients and packaging", "Brand owners and makers", "Importers", "Distributors", "Retail and on-trade". Buyers and service firms (co-packers, 3PLs) count when the buyer question needs them.
- **Players:** 15–60 companies that operate in this country. One row per company per stage (a maker that also imports may appear twice). Fields: `name` (trading name, ≤26 characters), `legal_name` (registered name, local script or diacritics kept, when found), `name_local` (optional), `stage`, `role` (what it does here, a few words), `origin` (ISO code of the owner's or brand's home country), `ownership` (local / foreign / jv / state / listed), `brands`, `scale` (stores, capacity or revenue with year, only if sourced), `source` (an alias in `sources`), `url` (optional).
- **Finding them:** search in the market's business language as well as English. Company names, distributor lists and registry entries are written in the local language (Vietnamese "nhà phân phối …", "công ty nhập khẩu …"; Thai "ผู้จัดจำหน่าย …"; Indonesian "distributor resmi …"; Japanese "販売代理店", "輸入元"; Korean "총판", "수입사"). Good sources: industry association member lists, stock exchange and business registry listings, trade fair exhibitor lists, distributor and importer websites, official stores on e-commerce platforms, and the press. Do this for English-dominant markets too where companies list themselves in a local language (Malaysia: Bahasa Malaysia).
- **Rules:** every player carries a source; no person names; no company that cannot be found in a source; leave a field out rather than guess it. The chapter makes no claims about market share beyond what the body supports.
- Write `outputs/batch/<id>/players.json` (format in the header of `scripts/render-players.mjs`), run `node scripts/render-players.mjs --id <id> --check` until it passes, then `node scripts/render-players.mjs --id <id> --section <NN>` and place the pages it prints before the methodology endnote. The page walk fills `{{PAGE_NUM}}` / `{{TOTAL_PAGES}}`. Set `title` to an action title (e.g. "Who's who: 48 players, and the importers hold the keys") and `as_of` to the month of the research.

### Query strategy

Fill `query_strategy_designed` from the evidence plan (Step B): 20–30 English queries, bucketed by section. Local-language queries follow topic_parser's `local_search_priority` (this rule wins over the brain's own "always search locally" line): for tier-1 / tier-2 markets, use the pack's **industry glossary** (`vi` / `ja` / `ko` / `zh` practitioner terms) on top of `references/local_lang_query_glossary.md`; for `skip` markets (English-dominant, e.g. SG, PH), add only 2–4 queries with local trade slang where it finds data English misses (e.g. Filipino retail terms for mark-ups or store types). If the buyer is an incumbent, add the baseline queries (its filings, local subsidiaries) first.

## Rules carried into Stages 4–7

- Archive analogues in the pack give structure and hypotheses only. **Never** present a number from them as current; every number in the report comes from Stage 4 research and carries a source tag.
- Source tags follow `content_per_section.md` Step 5 (`[Kira estimates]` / `[<Alias> <Year>]`), not the numbered [n] style of the brain's chat format.
- Check labels before writing (brain procedure step 6): every number keeps its source's scope — country, category, year, currency, list vs actual. A chart or comparison uses one measurement base and one period; never set "grocery spend" against "FMCG value", or 2024 against 2026, without saying so on the chart.
- Deals and rules have dates: say "agreed" vs "completed" (a stake increase that closes next year is not done yet), and quote legal thresholds in the law's own currency (e.g. PHP 25 mn, with a USD conversion in brackets if useful).
- Be decisive where evidence allows; state what is uncertain. Estimates are ranges with the logic shown.
- "Platform" may describe a third party's service in plain words (e.g. "an eB2B ordering network", "a marketplace"); never describe KIRA or its work as a platform.
- The caller may override `default_output_mode` (e.g. `draft` for a test run).

## Checklist before returning

- [ ] `framing.json`, `pack.md`, `brain_trace.md` are in the scratch folder outside the repo
- [ ] Exec summary states the answer to the buyer question, not a market description
- [ ] `storyline` (all action titles in order) reads as an argument on its own
- [ ] Every body page has a page type, a layout, its exhibit types, a takeaway intent and an `analysis_brief`
- [ ] Exhibit variety: no single type on more than a third of body pages; at least one breather page per two chapters
- [ ] Conditions, risks, path (and options when alternatives exist) are present
- [ ] No brain-internal names anywhere in `section_plan.json` titles or briefs
- [ ] `naming.json` written by `scripts/report-name.mjs` (exit 0) and copied into `section_plan.json`
- [ ] The "Who's who" chapter is in the plan, and the query strategy has company-discovery queries in the local language

Return `section_plan.json`.
