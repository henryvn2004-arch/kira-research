# confirm_step.md — User confirmation gate (UC2 + UC3 only)

For UC2 (Design Mode) and UC3 (Data-grounded), present the proposed plan to the user and wait for `APPROVE / EDIT / REJECT` before running the expensive Stage 4 (Research) + Stage 5 (Content Generation) + Stage 7 (Render) sequence.

UC1 skips this step — the blueprint is pre-validated.

## When this runs

- After `design_mode_planner.md` (UC2) — confirm the section structure + query strategy
- After `data_ingestion.md` (UC3) — confirm the section structure + data integration plan + gap analysis
- (For UC1 + `--design` override → confirm step still applies)

## Input

For UC2:
- The `section_plan.json` from `design_mode_planner.md`

For UC3:
- The `section_plan.json` (from either a blueprint match OR design-mode planner — orchestrator decides)
- The `user_data_extracted.json` from `data_ingestion.md`

## Output to user (markdown formatted)

Show the user a structured plan they can scan in under 60 seconds. Don't dump JSON at them.

### UC2 confirm template

```
[CONFIRM PLAN — KIRA Report]

Topic: AI applications in Singapore legal services, 2026
Mode:  UC2 (Design Mode — novel topic, custom structure)
Estimated pages: 18
Estimated render time: 35-50 min

THESIS (1 paragraph):
Singapore legal services is at the foothills of an AI-restructuring curve: routine
doc review and contract triage are first to be priced down by tools, while complex
cross-border advisory remains protected. Within 24 months, firm economics bifurcate
into two models — high-leverage tech-augmented mid-market and high-margin
partner-led specialist.

PROPOSED SECTIONS (18 pages total):
  01.  Cover                                                    (1p)
  02.  Methodology                                              (1p)
  03.  Contents                                                 (1p)
  04.  Executive summary                                        (2p)
  05.  Divider — "Where we are on the curve"                    (1p)
  06.  Adoption stage + AI-in-legal market size                 (2p)
  07.  Use-case taxonomy (impact/effort matrix)                 (1p)
  08.  Divider — "Who's deploying"                              (1p)
  09.  Singapore firm landscape — Big-4, Big-7, mid-tier        (2p)
  10.  Global legal-tech vendor map                             (1p)
  11.  Divider — "Friction & unlocks"                           (1p)
  12.  Adoption barriers: regulation, integration, talent        (1p)
  13.  Catalysts: courts, MAS, in-house migrations               (1p)
  14.  Divider — "Outlook"                                       (1p)
  15.  Forecast + scenarios 2027-2030                            (1p)
  16.  Strategic implications (5-card grid)                      (1p)
  17.  Methodology endnote                                       (1p)

RESEARCH PLAN: 23 web-search queries across 5 buckets
  - Demand signal (5 queries): market size, practising certificate counts, M&A flow
  - Tech adoption (6 queries): AI tool deployments, adoption surveys
  - Vendor landscape (4 queries): global legal-tech + Singapore-active vendors
  - Regulatory (4 queries): MAS, MinLaw, professional rules
  - AI use cases (4 queries): doc review, e-discovery, contract automation

OUTPUT: draft mode (HTML + PDF saved locally, not published to kiraresearch.com)

Reply:
  APPROVE                            → proceed to research + generation
  EDIT <your edits>                  → revise the plan, re-confirm
  REJECT                             → halt without further work
```

### UC3 confirm template (with data integration)

```
[CONFIRM PLAN — KIRA Report with your data]

Topic: Vietnam tea market 2026
Mode:  UC3 (Data-grounded — incorporating your uploaded files)
Estimated pages: 19
Estimated render time: 40-55 min

YOUR DATA — 3 files processed, 57 facts extracted:
  • buyer_interview_2026_q1.docx  (36 KB, 18 facts)
    Category: primary research interview
  • competitor_pricing_q1.xlsx     (14 KB, 27 facts)
    Category: competitor data
  • industry_landscape_2025.pdf    (412 KB, 12 facts, partial parse — 3 chart pages were images)
    Category: industry report (tagged [secondary], not [user-input])

SOURCE MIX (planned for final report):
  [user-input]:   12 claims (your interview + xlsx)
  [secondary]:    18 claims (industry_landscape.pdf + web research)
  [primary]:       6 claims (KIRA analyst synthesis)
  [estimate]:      4 claims (KIRA estimates anchored to documented data)

GAP ANALYSIS:
  ✓ Well covered by your data:
    - 07 Competitive structure (your competitor_pricing.xlsx)
    - 08 Demand & channels (buyer interview)
  ◐ Partial coverage:
    - 04 Exec summary, 05 Macro context (some user data, web research fills gaps)
  ○ Not covered — web research only:
    - 10 AI impact in tea
    - 11 5-year forecast

PROPOSED SECTIONS (19 pages):
  [same compact layout as UC2 template]

DATA INTEGRATION PLAN:
  Section 07 (Competitive structure): your competitor_pricing.xlsx provides the
              top-5 player ranking + share. Web research confirms HHI calc.
  Section 08 (Demand channels): 4 quotes from your buyer interview integrated.
              Web research adds national-level distribution stats.
  Section 11 (Forecast): entirely web research — your data doesn't extend forward.

OUTPUT: draft mode (HTML + PDF saved locally)

Reply:
  APPROVE                            → proceed to research + generation
  EDIT <your edits>                  → revise the plan, re-confirm
  REJECT                             → halt without further work
```

## Handling user response

### `APPROVE`

Proceed to Stage 4 (Research). Pass through:
- The (potentially edited) `section_plan.json`
- The `user_data_extracted.json` (UC3)
- The query strategy

### `EDIT <free-form edits>`

Common edits to expect — handle each gracefully:

| User says | Action |
|---|---|
| "Cut section 9 (vendor map)" | Remove that section from the plan, renumber remaining sections, regenerate output for re-confirm |
| "Add a section on cross-border deal flow" | Insert at a sensible position with appropriate page_type, re-confirm |
| "Use big 4 firms by name in section 9" | Note as content guidance in section's `voice_tone_emphasis`; re-confirm |
| "Make this 22 pages, not 18" | Expand body sections (split high-density sections into 2 pages); re-confirm |
| "Use my CSV for the forecast section" | Update data_integration_plan; re-confirm. If the CSV truly doesn't support forecast, push back and explain |
| "Publish to kiraresearch.com instead of draft" | Change output_mode to `publish`. Note: UC2 → publish is unusual; ask the user to double-check (publishing means it goes into the buyable library). Owner confirmation is required at admin promotion step regardless. |
| "Less AI focus" | Reduce AI section page count, push to a single page if appropriate, re-confirm |
| "Translate to Japanese" | Refuse politely — Phase 1 is EN only |

After applying edits, re-render the confirm template and wait again. Loop until APPROVE or REJECT.

**Edit-loop cap:** if the user has rejected the plan 4 times, surface that and ask whether they'd like to start over with a fresh topic or pull back to a UC1 blueprint match.

### `REJECT`

Halt entirely. Don't run any research. Acknowledge the rejection and ask if there's a different topic to try.

## Edge cases

- **User responds with something neither APPROVE/EDIT/REJECT** ("hmm not sure"): treat as implicit EDIT — ask what they'd like to change. Don't proceed without clear approval.
- **User pastes a totally new topic instead of approving**: politely confirm — "Want me to re-parse this as a new topic, scrapping the current plan?" Yes → Stage 1 again with the new topic.
- **Edit would cut the section count below 12 or push above 24**: warn that the report will look thin (under 12) or bloated (over 24), confirm intent.
- **Edit removes the Methodology section**: refuse — methodology is required scaffolding, buyers expect it.

## Voice + tone of the confirm message itself

The confirm message is also KIRA output — it sets expectation for what the user is paying for. Tone:
- Crisp, structured, scannable
- No emojis
- Use `•` for bullets, mono fonts implied by Code block formatting
- "Reply: APPROVE / EDIT / REJECT" — directive but neutral
