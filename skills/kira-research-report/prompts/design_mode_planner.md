# design_mode_planner.md — Stage 3b (UC2 — novel-topic planning)

When the orchestrator routes UC2 ("design mode"), the topic doesn't match a UC1 blueprint well enough to template against. Your job: design a section structure from first principles, then hand off a `section_plan.json` that the confirm step + downstream stages can consume the same way they'd consume a blueprint.

## When this runs

- `route == "UC2"` from `orchestrator.md` output
- The blueprint match score was < 0.7, OR the user forced `--design`

## Input

- The parsed topic JSON from Stage 1
- The orchestrator decision JSON from Stage 2 (specifically `reasoning` + `all_scores`, useful context for what didn't fit)
- The page-type catalog in `schemas/page_schemas.json` (12 available page types)
- The brand voice rules in `prompts/voice_guide.md`
- The brand guideline in `references/brand_guideline.md`

## Process — think before you outline

### Step 1 — Diagnose the topic

Answer these explicitly (in scratch notes, not in the final output):

1. **What's the buyer's actual question?** Not "Tell me about X" but the strategy question behind it. Example: "AI in legal services Singapore" — buyer is asking *"What does the AI-disruption curve look like for white-shoe Singapore law firms over the next 3 years, and where should we be positioned?"*
2. **What's the industry's domain shape?** Is this regulated services? Hardware? Pure software? Distribution-heavy? B2B? Each shape favors different section emphases.
3. **What's the geography's role?** Is the country the unit of analysis (e.g. Indonesia roofing — country defines the entire market) or is it a deployment context (e.g. AI in legal services Singapore — Singapore is where it lands, but the underlying technology is global)?
4. **What's the time dimension?** Snapshot-of-now? Forecast? Inflection-point analysis?
5. **What does a senior consultant want to tell stakeholders here?** Sketch the one-paragraph thesis. The section structure should serve that thesis.

### Step 2 — Required sections (always)

Every report has these regardless of topic:

1. **Cover** (page type: `cover`)
2. **Methodology overview** (`methodology_inline`)
3. **Contents** (`toc`)
4. **Executive summary** — 2 pages: `exec_summary_p1` + `exec_summary_p2_implications`
5. **Methodology endnote** (`methodology_endnote`)

That's 6 pages of fixed scaffolding. Add 1 chapter divider before the body kicks off (page 06 area).

### Step 3 — Body section design

The body sits between exec summary and methodology endnote. Budget: 11-16 pages typical (so total lands at 17-22).

For each body section ask:
- What insight does it deliver?
- Which existing page-type fits? (`market_data_chart`, `competitive_structure`, `competitive_profile_deep`, `ai_overview`, `forecast_outlook` — see `schemas/page_schemas.json`)
- Does it need a dark divider opening it? (Use dividers for ~4-6 major chapter breaks max — too many gets noisy)
- Will it skip if research is thin?

### Step 4 — Chapter-skeleton templates by topic shape

Pick the closest fit, then customize:

#### Shape A — Services / professional industries (legal, accounting, advisory, financial services)

```
01 Cover
02 Methodology
03 TOC
04 Exec summary (2 pages)
05 Divider: "The shifting demand profile"
06 Demand drivers (1-2 pages)
07 Buyer segments + spend (1-2 pages)
08 Divider: "Practitioner landscape"
09 Service-line economics (2 pages)
10 Leading firms profile (3-4 pages)
11 Divider: "AI / tech disruption"
12 AI use case map (2 pages)
13 Pace-of-adoption + winners (1 page)
14 Divider: "Outlook"
15 5-year scenarios (2 pages)
16 Strategic implications (5-card grid, can reuse exec_summary_p2 layout)
17 Methodology endnote
```

#### Shape B — Tech adoption / horizontal innovation (AI in X, automation in Y)

```
01 Cover, 02 Methodology, 03 TOC
04 Exec summary (2 pages)
05 Divider: "Where we are on the curve"
06 Adoption stage + market size (2 pages, S-curve chart prominent)
07 Use-case taxonomy (1-2 pages, impact/effort matrix)
08 Divider: "Who's deploying"
09 Operator profiles + announced moves (2-3 pages)
10 Vendor landscape (1-2 pages)
11 Divider: "Friction & unlocks"
12 Adoption barriers (regulation, integration, talent) (1-2 pages)
13 Catalysts + tipping points (1 page)
14 Divider: "Outlook"
15 Forecast + sensitivities (2 pages)
16 Implications + positioning (5-card grid)
17 Methodology endnote
```

#### Shape C — Regulatory landscape / policy impact

```
04 Exec summary
05 Divider: "Regulatory baseline"
06 Current regime overview (2 pages)
07 Recent enforcement / case studies (2 pages)
08 Divider: "What's changing"
09 Pending policy actions (2 pages)
10 Cross-border implications (1 page)
11 Divider: "Operator response"
12 Compliance economics (1-2 pages)
13 Tech / process adaptations (1 page)
14 Divider: "Outlook"
15 Scenarios (1-2 pages)
16 Implications
17 Methodology endnote
```

#### Shape D — Country × industry but not in market_analysis blueprint fit

(E.g. very small / niche industries, or non-SEA geographies)

Adapt the market_analysis 19-section structure, but allow yourself to:
- Cut sections if research is thin (e.g. skip "Player profiles" if there are <3 named players)
- Compress "Demand & channels" + "Regulatory" into one section if either is light
- Skip "AI impact" if the industry has no meaningful AI inflection

If you find yourself sticking very close to market_analysis with minor tweaks, surface a `consider_new_blueprint: true` flag in your output — that's a candidate for promoting into Phase 2 blueprint registry.

### Step 5 — Per-section design decisions

For each section in your designed structure:

```json
{
  "id": "06_demand_drivers",
  "section_num": "04",
  "title_pattern": "Demand drivers in Singapore legal services 2026",
  "page_type": "market_data_chart",
  "page_count": 2,
  "purpose": "Identify the structural and cyclical forces pulling demand for legal services in Singapore: M&A volumes, cross-border deal flow, regulatory enforcement intensity, in-house counsel substitution",
  "skip_if": "if M&A activity data unavailable, compress into single page",
  "research_inputs_expected": ["MAS deal data", "law society of Singapore filings", "Big4 legal-tech surveys"],
  "voice_tone_emphasis": "structural framing — distinguish secular shifts (M&A globalization, regulation density) from cyclical (interest rate cycle, post-COVID rebound)"
}
```

## Output — `section_plan.json`

```json
{
  "design_mode_version": 1,
  "topic": "<from topic parser>",
  "thesis_one_paragraph": "Singapore legal services is at the foothills of an AI-restructuring curve: routine doc review and contract triage are first to be priced down by tools, while complex cross-border advisory remains protected. Within 24 months, firm economics bifurcate into two models — high-leverage tech-augmented mid-market and high-margin partner-led specialist.",
  "estimated_pages": 18,
  "estimated_render_time_min": 35-50,
  "default_output_mode": "draft",
  "requires_confirm_step": true,
  "consider_new_blueprint": false,
  "shape_template_used": "Shape B (tech adoption)",
  "sections": [
    {
      "id": "01_cover",
      "section_num": "00",
      "title_pattern": "Singapore legal services in the AI transition — 2026",
      "page_type": "cover",
      "page_count": 1,
      "purpose": "Cover",
      "skip_if": null
    },
    {
      "id": "02_methodology",
      "section_num": "01",
      "title_pattern": "Methodology",
      "page_type": "methodology_inline",
      "page_count": 1,
      "purpose": "Methodology overview"
    },
    {
      "id": "...": "..."
    }
  ],
  "query_strategy_designed": {
    "query_count": 23,
    "buckets": [
      {
        "bucket": "demand_signal",
        "queries": [
          "Singapore legal services market size revenue 2025",
          "Singapore Law Society practising certificate 2025",
          "Singapore M&A deal value 2025"
        ]
      },
      { "bucket": "tech_adoption", "queries": ["..."] },
      { "bucket": "vendor_landscape", "queries": ["..."] },
      { "bucket": "regulatory", "queries": ["..."] },
      { "bucket": "ai_use_cases", "queries": ["..."] }
    ]
  },
  "design_notes": "Singapore legal services doesn't fit market_analysis well (services, not goods; small player count; regulation-heavy). Custom structure leans on Shape B (tech adoption) because the buyer's core question is about AI displacement timing — country/industry are the deployment context.  Section 12 (vendor landscape) covers both global legal-tech players and Singapore-specific deployments."
}
```

## After producing this output

Hand off to `confirm_step.md`. Do NOT proceed to Stage 4 (Research) without user approval.

## Checklist before returning

- [ ] Required scaffolding sections (cover / methodology / TOC / exec / methodology_endnote) all present
- [ ] Body section count fits in 11-16 pages (so total ≈ 17-22)
- [ ] Each section has page_type assigned from the 12 catalog entries
- [ ] Page-types unfamiliar to page_components.html will be composed from CSS utilities — flagged in design_notes
- [ ] Dividers used judiciously (~4-6 max, not on every section)
- [ ] Thesis paragraph drafted and tested for KIRA voice (read voice_guide.md before writing it)
- [ ] `requires_confirm_step: true` (UC2 ALWAYS requires confirm)
