# chart_patterns.md — 5 SVG patterns from the R0152 baseline

Each pattern below is extracted from `references/sample_R0152_baseline.html`. Copy the SVG verbatim into a section's content_spec, replace the data values, and the styling falls out of the design tokens automatically.

`prompts/chart_generator.md` references this file — when picking a pattern for a section, scan here first before composing fresh SVG.

---

## Pattern 1 — Stacked vertical bar (category-by-period)

**Use for:** market sizing where the total is broken into 2-3 segments and you want both totals and segment composition across 3 time periods.

**Baseline example:** "Indonesia roofing materials — sized by category" — Fiber cement / Metal / Concrete-clay tile, 2023 / 2025E / 2031F.

**Schema fit:** `exec_summary_p1.chart_right` (viewBox height 240-280).

```html
<div class="chart-header">
  <div>
    <div class="chart-title">{{title}}</div>
    <div class="chart-subtitle">{{subtitle}}</div>
  </div>
  <div class="chart-unit">{{unit}}</div>
</div>
<div class="chart-body-flex">
  <svg viewBox="0 0 480 280" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <!-- Axes -->
    <line class="axis-line" x1="60" y1="20" x2="60" y2="240"/>
    <line class="axis-line" x1="60" y1="240" x2="470" y2="240"/>
    <!-- Grid -->
    <line class="grid-line" x1="60" y1="60"  x2="470" y2="60"/>
    <line class="grid-line" x1="60" y1="100" x2="470" y2="100"/>
    <line class="grid-line" x1="60" y1="140" x2="470" y2="140"/>
    <line class="grid-line" x1="60" y1="180" x2="470" y2="180"/>
    <!-- Y-axis labels -->
    <text class="axis-text" x="55" y="244" text-anchor="end">0</text>
    <text class="axis-text" x="55" y="184" text-anchor="end">800</text>
    <text class="axis-text" x="55" y="144" text-anchor="end">1,200</text>
    <text class="axis-text" x="55" y="104" text-anchor="end">1,600</text>
    <text class="axis-text" x="55" y="64"  text-anchor="end">2,000</text>

    <!-- Period 1: 2023 -->
    <rect class="bar-primary"   x="90"  y="138" width="22" height="102"/>  <!-- Segment 1 -->
    <rect class="bar-secondary" x="115" y="180" width="22" height="60"/>   <!-- Segment 2 -->
    <rect class="bar-tertiary"  x="140" y="216" width="22" height="24"/>   <!-- Segment 3 -->

    <!-- Period 2: 2025E -->
    <rect class="bar-primary"   x="220" y="120" width="22" height="120"/>
    <rect class="bar-secondary" x="245" y="170" width="22" height="70"/>
    <rect class="bar-tertiary"  x="270" y="212" width="22" height="28"/>

    <!-- Period 3: 2031F -->
    <rect class="bar-primary"   x="350" y="68"  width="22" height="172"/>
    <rect class="bar-secondary" x="375" y="148" width="22" height="92"/>
    <rect class="bar-tertiary"  x="400" y="200" width="22" height="40"/>

    <!-- Period axis labels -->
    <text class="axis-text" x="125" y="258" text-anchor="middle">2023</text>
    <text class="axis-text" x="255" y="258" text-anchor="middle">2025E</text>
    <text class="axis-text" x="385" y="258" text-anchor="middle">2031F</text>

    <!-- Data labels above bars (use label-data for headline value, label-small for segment values) -->
    <text class="label-data"  x="101" y="132" text-anchor="middle">1,100</text>
    <text class="label-small" x="126" y="174" text-anchor="middle">286</text>
    <text class="label-small" x="151" y="210" text-anchor="middle">~520</text>
    <!-- ... etc per period ... -->

    <!-- Legend (top of chart) -->
    <rect class="bar-primary"   x="60"  y="10" width="10" height="10"/>
    <text class="label-small" x="74"  y="19">{{segment_1_name}}</text>
    <rect class="bar-secondary" x="160" y="10" width="10" height="10"/>
    <text class="label-small" x="174" y="19">{{segment_2_name}}</text>
    <rect class="bar-tertiary"  x="225" y="10" width="10" height="10"/>
    <text class="label-small" x="239" y="19">{{segment_3_name}}</text>
  </svg>
</div>
<div class="chart-source">{{source_line}}</div>
```

### Customization checklist
- Y-axis scale: pick max value, divide into 4 equal grid steps. Compute each bar `height = (value / max) * 220`.
- `~` prefix on label values indicates KIRA estimate (anchor in chart-source line)
- `2031F` (forecast) bars can use bar-tertiary stroke-only style — see Pattern 2

---

## Pattern 2 — Two-period comparison with trend arrow (HHI threshold band)

**Use for:** concentration metrics with named thresholds (HHI 1500 / 2500 / 5000), or any 2-point time-series where the delta is the headline.

**Baseline example:** "Fiber cement market concentration (HHI) — 2017 vs 2023"

**Schema fit:** `competitive_structure.comp_chart_card` (viewBox height ~200).

```html
<div class="chart-header">
  <div>
    <div class="chart-title">{{title}}</div>
    <div class="chart-subtitle">{{subtitle}}</div>
  </div>
  <div class="chart-unit">{{unit}}</div>
</div>
<div class="chart-body-flex">
  <svg viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
    <!-- Threshold band fills (drawn first so bars overlay) -->
    <rect x="50" y="20"  width="540" height="38" fill="#FEF3E7" opacity="0.7"/>  <!-- Highly concentrated -->
    <rect x="50" y="58"  width="540" height="50" fill="#FEFCE8" opacity="0.7"/>  <!-- Concentrated -->
    <rect x="50" y="108" width="540" height="76" fill="#E6F7F3" opacity="0.5"/>  <!-- Competitive -->

    <!-- Band labels -->
    <text class="label-small" x="585" y="32"  text-anchor="end" style="fill:#D97706">Highly concentrated &gt;8,000</text>
    <text class="label-small" x="585" y="80"  text-anchor="end" style="fill:#A16207">Concentrated 2,500-8,000</text>
    <text class="label-small" x="585" y="135" text-anchor="end" style="fill:#00A88B">Competitive &lt;2,500</text>

    <!-- Baseline -->
    <line class="axis-line" x1="50" y1="184" x2="590" y2="184"/>

    <!-- Period 1 bar -->
    <rect class="bar-secondary" x="150" y="120" width="80" height="64"/>
    <text class="label-data" x="190" y="112" text-anchor="middle">4,171</text>
    <text class="axis-text" x="190" y="200" text-anchor="middle">2017</text>

    <!-- Period 2 bar (colored amber/red to signal it crossed threshold) -->
    <rect class="bar-tertiary" x="370" y="34" width="80" height="150"/>
    <text class="label-data" x="410" y="28" text-anchor="middle" style="fill:#D97706">8,737</text>
    <text class="axis-text" x="410" y="200" text-anchor="middle">2023</text>

    <!-- Trend arrow connecting the two bars -->
    <path d="M 235 100 L 360 60" stroke="var(--primary)" stroke-width="2" fill="none" marker-end="url(#arr)"/>
    <text class="label-small" x="298" y="76" text-anchor="middle" style="fill:var(--primary); font-weight:700">+4,566 pts / 6 yrs</text>
    <defs>
      <marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
        <path d="M0,0 L0,6 L9,3 z" fill="var(--primary)"/>
      </marker>
    </defs>
  </svg>
</div>
<div class="chart-source">{{source_line}}</div>
```

### Customization checklist
- Bar height = `(value / scale_max) * 150` — adjust `scale_max` to fit the highest band threshold
- Arrow path: M(end of bar 1) L(start of bar 2) — keeps the arrow above both bars
- If the metric DOESN'T cross a threshold, keep both bars `class="bar-secondary"` (neutral color) — don't false-flag a non-event

---

## Pattern 3 — Two-period bar with CAGR arrow indicator

**Use for:** forecast pages, growth-rate emphasis, "X to Y by Z" framing where CAGR is the headline.

**Baseline example:** "Construction design software — global trajectory" — 9.9 (2024) → 15.4 (2030F), CAGR 7.7%

**Schema fit:** `ai_overview.exec_chart` or `forecast_outlook` (viewBox height 240).

```html
<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <!-- Axes -->
  <line class="axis-line" x1="50" y1="20" x2="50" y2="200"/>
  <line class="axis-line" x1="50" y1="200" x2="390" y2="200"/>
  <!-- Grid -->
  <line class="grid-line" x1="50" y1="60"  x2="390" y2="60"/>
  <line class="grid-line" x1="50" y1="100" x2="390" y2="100"/>
  <line class="grid-line" x1="50" y1="140" x2="390" y2="140"/>
  <!-- Y-axis labels -->
  <text class="axis-text" x="45" y="204" text-anchor="end">0</text>
  <text class="axis-text" x="45" y="144" text-anchor="end">5</text>
  <text class="axis-text" x="45" y="104" text-anchor="end">10</text>
  <text class="axis-text" x="45" y="64"  text-anchor="end">15</text>
  <text class="axis-text" x="45" y="24"  text-anchor="end">20</text>

  <!-- Actual (left bar, neutral color) -->
  <rect class="bar-secondary" x="120" y="121" width="60" height="79"/>
  <text class="label-data" x="150" y="113" text-anchor="middle">9.9</text>
  <text class="axis-text"  x="150" y="218" text-anchor="middle">2024</text>

  <!-- Forecast (right bar, primary color) -->
  <rect class="bar-primary" x="270" y="79" width="60" height="121"/>
  <text class="label-data" x="300" y="71" text-anchor="middle">15.4</text>
  <text class="axis-text"  x="300" y="218" text-anchor="middle">2030F</text>

  <!-- CAGR arrow + label -->
  <path d="M 185 120 L 265 90" stroke="var(--primary)" stroke-width="2" fill="none" marker-end="url(#arr2)"/>
  <text class="label-small" x="225" y="100" text-anchor="middle" style="fill:var(--primary); font-weight:700">CAGR 7.7%</text>

  <defs>
    <marker id="arr2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <path d="M0,0 L0,6 L9,3 z" fill="var(--primary)"/>
    </marker>
  </defs>
</svg>
```

### Customization checklist
- `marker id="arr2"` — important: use a unique marker id per chart so SVGs assembled in one page don't collide (other charts use `arr`, `arr3`, etc.)
- CAGR label placement: midpoint of the arrow, ~10px above its trajectory
- For multi-year forecasts (3+ periods), switch to Pattern 1 (stacked bars) and add the CAGR as the chart subtitle instead

---

## Pattern 4 — Implication-card grid (5-card layout, NOT an SVG)

**Use for:** "Strategic implications" section, second exec-summary page, "Five forces driving X", etc.

**Baseline example:** "Five strategic implications for market participants" — 5 cards, each ≤360 chars body + anchor.

```html
<div class="imp-grid">
  <div class="imp-card">
    <div class="num">01 · {{tag_label}}</div>
    <div class="title">{{card_title}}</div>
    <div class="body-text">
      {{card_body_with_inline_strongs}}
    </div>
    <div class="anchor">Anchor: <span class="num-anchor">{{anchor_value}}</span> {{anchor_label}}</div>
  </div>
  <!-- Repeat 4 more times: 02, 03, 04, 05 -->
</div>
```

### Slot caps (from page_schemas.json)
- `tag_label`: 18 chars (SUBSTITUTION / CHANNEL / CONSOLIDATION / AI-DIGITAL / SUSTAINABILITY pattern)
- `card_title`: 55 chars, max 2 lines
- `card_body`: 360 chars including inline `<strong>` markup
- `anchor_label`: 50 chars

### Anchor field
The anchor is a single irrefutable data point that justifies the card's argument. It restates the most important number from the body OR introduces a complementary number. Always one of:
- A `%` figure
- A `USD X bn/m` figure
- A small integer count (60+, 48+)
- A growth rate

**Bad anchor:** `Anchor: Strong growth ahead` (vague, no number)
**Good anchor:** `Anchor: HHI +109% in 6 years`

---

## Pattern 5 — AI use-case grid (6-card 2×3 layout)

**Use for:** AI impact section's second page; can also serve "use case taxonomy" sections in UC2.

**Baseline example:** "Six AI applications reshaping roofing, exterior & insulation operators"

```html
<div class="ai-usecase-grid">
  <div class="ai-usecase">
    <div class="uc-num">01 · {{category_tag}}</div>
    <div class="uc-title">{{use_case_title}}</div>
    <div class="uc-body">
      {{use_case_body}}
    </div>
    <div class="uc-example">{{observable_example}}</div>
  </div>
  <!-- Repeat 5 more times -->
</div>
```

### Slot caps
- `category_tag`: 12 chars (DEMAND / SPEC / PRICING / QUALITY / WASTE / SEARCH style — single-word abstract)
- `use_case_title`: 60 chars, sentence case
- `use_case_body`: 280 chars
- `observable_example`: 60 chars, formatted as `Observable: <named operator>` or `Benchmark: <named benchmark>` or `Pilot: <named pilot>`

### Tone reminder
This is the AI section — the only section where AI can be foregrounded. Other voice rules still apply: sentence-case headlines, anchored quantification, no fluff verbs.

---

## Patterns not yet documented (Phase 2 candidates)

When you find yourself composing a section that doesn't match any pattern above, you may need to invent a layout from `templates/master_styles.css` utility classes. If you do this 2+ times for the same chart shape, propose it for inclusion here in Phase 2. Likely Phase 2 patterns:

- Adoption S-curve (single-series with curve fit + adoption-stage labels)
- Player market-share donut/pie
- Channel-mix sankey (overkill for 1280×720 — needs assessment)
- Use case impact matrix (X = effort, Y = impact, dots for use cases)
- Geographic heatmap (in-country regional split)

For now, stick to the 5 patterns above for predictable visual rhythm.
