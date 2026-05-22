# chart_generator.md — Stage 6 (inline SVG charts)

Produce inline `<svg>` for the charts referenced by `content_per_section.md` outputs. All SVGs use KIRA design tokens (CSS classes from `templates/master_styles.css`); no external chart libraries.

## Input

For each chart:
- The `chart_right` (or equivalent) block from a section's `content_spec`, including:
  - `title`, `subtitle`, `unit`, `source`
  - `data.series` with values, labels, source_tag
  - `data.periods`
- The page type (determines SVG viewBox height — typically 240 for exec_summary_p1, 280 for market_data_chart, 360 for forecast_outlook)

## Patterns to support (Phase 1)

Pick the closest pattern. Worked SVG examples for each are documented in `docs/chart_patterns.md`.

| Pattern | Use case |
|---|---|
| **Bar chart vertical** | Market size over years, segment values, year-over-year growth |
| **Bar chart horizontal** | Player market shares, ranked segment breakdowns |
| **Stacked bar** | Segment composition over time, channel-mix evolution |
| **Line + area** | Multi-year trends, CAGR overlays |
| **HHI threshold band** | Competitive concentration with the 1,500 / 2,500 / 5,000 bands |
| **CAGR arrow indicator** | Forecast pages, growth-rate emphasis |
| **Adoption curve / S-curve** | AI adoption trajectory, technology penetration |
| **Use-case impact matrix** | 2×N grid: X = effort/timeline, Y = impact (AI section page 2) |
| **Distribution donut/pie** | Channel mix shares, single-snapshot composition |

## Design system constraints

**Must use:**
- `viewBox="0 0 <w> <h>"` set to the chart card's interior dimensions (typically 100% width)
- Stroke / fill colors from CSS vars via `style="fill: var(--primary)"` OR utility classes like `class="bar-primary"` (defined in master_styles.css)
- `font-family: 'JetBrains Mono', monospace` for axis labels, ticks, data labels
- `font-family: 'Satoshi', sans-serif; font-weight: 700` for in-chart titles/legends (if any)
- `tabular-nums` font feature on all numeric text so columns align

**Avoid:**
- Hard-coded brand colors (always use CSS vars)
- Inline `style="font-family: Arial"` (use Satoshi/JetBrains stack from master_styles.css)
- Decorative chart-junk: 3D effects, drop shadows, gradients (KIRA design = flat, calibrated, restrained)
- Animated SVGs (PDFs render once; animation wastes effort)
- More than 3 data series per chart (illegible at 1280×720 scale)
- Tooltip / interactivity (PDF target)

## Color palette for series

For multi-series charts, walk through this palette in order:

1. `var(--primary)` — KIRA blue (#1E6FFF) — for the headline/highlighted series
2. `var(--text-mid)` — neutral gray (#4A5568) — for comparison/baseline series
3. `var(--green)` — green (#00A88B) — for positive deltas / secondary-tagged data
4. `var(--amber)` — amber (#D97706) — for cautionary / estimate-tagged data

Don't introduce new colors. If you need to differentiate more than 3 series, switch chart pattern (e.g. small multiples) rather than expanding the palette.

## Bar-chart vertical — canonical example

```html
<div class="chart-header">
  <div>
    <div class="chart-title">Roofing market trajectory</div>
    <div class="chart-subtitle">Indonesia · USD bn · 2024-2030F</div>
  </div>
  <div class="chart-unit">USD BN</div>
</div>
<div class="chart-body-flex">
  <svg viewBox="0 0 560 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <!-- Y axis baseline -->
    <line x1="40" y1="200" x2="540" y2="200" stroke="#E5E7EB" stroke-width="1" />

    <!-- Bars -->
    <!-- 7 periods, max value 3.1, scale: y = 200 - (value/3.1 * 170) -->
    <g class="mono">
      <!-- 2024 — 1.6 -->
      <rect x="55"  y="113" width="55" height="87"  fill="#1E6FFF"></rect>
      <text x="82"  y="218" text-anchor="middle" font-size="10" fill="#6B7280">2024</text>
      <text x="82"  y="106" text-anchor="middle" font-size="10" font-weight="700" fill="#0B0D10">1.6</text>

      <!-- 2025 — 1.8 -->
      <rect x="125" y="102" width="55" height="98"  fill="#1E6FFF"></rect>
      <text x="152" y="218" text-anchor="middle" font-size="10" fill="#6B7280">2025</text>
      <text x="152" y="95"  text-anchor="middle" font-size="10" font-weight="700" fill="#0B0D10">1.8</text>

      <!-- ...subsequent periods follow same template... -->

      <!-- Forecast bar styled differently to signal estimate -->
      <rect x="475" y="30"  width="55" height="170" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="3,2"></rect>
      <text x="502" y="218" text-anchor="middle" font-size="10" fill="#6B7280">2030F</text>
      <text x="502" y="23"  text-anchor="middle" font-size="10" font-weight="700" fill="#D97706">3.1</text>
    </g>
  </svg>
</div>
<div class="chart-source">SOURCE: BPS, BCI ASIA, INDUSTRY FILINGS · KIRA RESEARCH 2026</div>
```

Key rules from this example:
- `<svg viewBox>` defines internal coordinate system; the chart card sizes it. Always use viewBox + preserveAspectRatio.
- Axis labels (year) in mono font at 10px, neutral gray
- Data labels above each bar in mono 10px **bold black**
- Forecast bars use **dashed amber outline** to signal estimate / future
- Source line below the SVG (not inside it)

## HHI threshold band — canonical example

```html
<svg viewBox="0 0 480 240">
  <!-- Threshold bands (drawn first so bars overlay) -->
  <rect x="40" y="40"  width="420" height="40" fill="#EEF3FF" opacity="0.4"></rect>  <!-- Competitive zone -->
  <rect x="40" y="80"  width="420" height="40" fill="#FEF3E7" opacity="0.4"></rect>  <!-- Moderately concentrated -->
  <rect x="40" y="120" width="420" height="80" fill="#FEE2E2" opacity="0.4"></rect>  <!-- Highly concentrated -->

  <!-- Threshold lines + labels -->
  <line x1="40" y1="80"  x2="460" y2="80"  stroke="#D1D5DB" stroke-dasharray="2,2" />
  <line x1="40" y1="120" x2="460" y2="120" stroke="#D1D5DB" stroke-dasharray="2,2" />
  <text x="455" y="78"  text-anchor="end" font-size="9" class="mono" fill="#6B7280">1,500</text>
  <text x="455" y="118" text-anchor="end" font-size="9" class="mono" fill="#6B7280">2,500</text>

  <!-- HHI 2017 marker -->
  <circle cx="140" cy="62" r="5" fill="#4A5568"></circle>
  <text x="140" y="50" text-anchor="middle" font-size="10" class="mono" font-weight="700" fill="#0B0D10">4,171</text>
  <text x="140" y="218" text-anchor="middle" font-size="10" class="mono" fill="#6B7280">2017</text>

  <!-- HHI 2023 marker -->
  <circle cx="340" cy="172" r="6" fill="#1E6FFF"></circle>
  <text x="340" y="160" text-anchor="middle" font-size="10" class="mono" font-weight="700" fill="#1E6FFF">8,737</text>
  <text x="340" y="218" text-anchor="middle" font-size="10" class="mono" fill="#6B7280">2023</text>

  <!-- Trend arrow -->
  <path d="M 150 65 L 330 168" stroke="#1E6FFF" stroke-width="1.5" stroke-dasharray="3,2" fill="none"></path>
  <polygon points="330,168 322,162 325,170" fill="#1E6FFF"></polygon>
</svg>
```

## Output format

For each chart referenced in a section's `content_spec`, emit:

```json
{
  "section_id": "04_exec_summary",
  "chart_slot": "chart_right",
  "pattern_used": "bar_chart_vertical",
  "svg_html": "<div class=\"chart-header\">...</div><div class=\"chart-body-flex\"><svg viewBox=\"0 0 560 240\">...</svg></div><div class=\"chart-source\">SOURCE: ...</div>",
  "data_source_summary": "BPS, BCI ASIA, industry filings; forecast = KIRA estimate anchored to APAC USD 32.58 bn × Indonesia construction GDP share",
  "estimated_height_px": 240
}
```

## Validation before handing off to Stage 7

For each SVG you produce:

- [ ] viewBox is set (not just width/height)
- [ ] No external assets (`<image href>`, web fonts) — must be self-contained
- [ ] All colors are CSS vars or KIRA palette hex literals (#1E6FFF, #4A5568, #00A88B, #D97706, #6B7280, #E5E7EB, #0B0D10)
- [ ] All data labels have units stated (in subtitle, axis title, or near the chart-unit chip — not lost)
- [ ] Source line uses compressed citation, no aggregator firm names, ends with `· KIRA RESEARCH {{year}}`
- [ ] Estimate-tagged data points are visually differentiated (dashed outline, amber color, or annotated)
- [ ] Total rendered height ≤ `estimated_height_px` for the slot (don't blow past schema's `svg_viewbox_height` cap)
