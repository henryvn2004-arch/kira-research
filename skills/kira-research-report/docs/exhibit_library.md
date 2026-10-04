# exhibit_library.md — the 16 KIRA exhibit types

**What this is.** The rules and the coordinate maths for every exhibit a report page can carry.
The working snippets live in `templates/exhibits.html` (an 18-page gallery you can open in a browser).
Each snippet sits between `<!-- EXHIBIT_START: <type> -->` and `<!-- EXHIBIT_END: <type> -->`.
Styles come from `templates/master_styles.css`, in the "Exhibit layer (2026-10)" block and its
"Exhibit library helpers" sub-block (classes `.ex-*`).

This file replaces the short pattern list in `docs/chart_patterns.md` and `prompts/chart_generator.md`.
Those files are still valid for the older fixed page types.

All gallery data is illustrative. Never copy a number from the gallery into a report.

---

## 1. Page anatomy (every exhibit page)

```html
<div class="page exhibit-page">
  <div class="page-inner">
    <div class="page-header">
      <div class="page-section-tag">{{SECTION_TAG}}</div>
      <div class="page-section-counter">{{PAGE_NUM}} / {{TOTAL_PAGES}}</div>
    </div>
    <h1 class="page-h1">{{ACTION_TITLE}}</h1>          <!-- full-sentence so-what, sentence case -->
    <p class="page-kicker">{{KICKER_HTML}}</p>          <!-- one line: context or how to read it -->
    <div class="layout layout-main-side">               <!-- see section 3 -->
      <!-- EXHIBIT_START: bar --> <div class="exhibit">…</div> <!-- EXHIBIT_END: bar -->
      <div class="commentary">…</div>
    </div>
    <div class="takeaway"><span>{{SO_WHAT_SENTENCE}}</span></div>
    <div class="source-key">{{SOURCE_KEY_HTML}}</div>   <!-- optional -->
    <div class="page-footer">
      <div class="logo-foot">KIRA<span class="accent">.</span> RESEARCH</div>
      <div>{{FOOTER_TEXT}}</div>
    </div>
  </div>
</div>
```

The exhibit frame:

```html
<div class="exhibit">                       <!-- add "plain" for no card (tables) -->
  <div class="exhibit-title">What is measured</div>                  <!-- noun phrase, not the so-what -->
  <div class="exhibit-sub">Country · unit · period · how to read</div>
  <div class="ex-legend">…</div>             <!-- only if direct labels are impossible -->
  <div class="exhibit-body"> <svg viewBox="0 0 W H">…</svg> </div>
  <div class="exhibit-note">Source: [Kira estimates]; [Alias Year]</div>
</div>
```

**Writing rules for the words on the page.**
- Action title: one sentence of 70-90 characters that states the conclusion, e.g. "Taxes take 22% of the shelf price, more than the whole distribution chain". Do not write a topic label like "Price build-up". One line is best and two lines is the maximum.
- Kicker: one line of context or reading guidance. The exhibit title names *what* is shown. The page title says *so what*.
- Commentary: an `h3` heading, two short paragraphs that each open with a bold claim, and at most one `.callout-box` (Watch / Caveat / Implication / What would change it).
- Takeaway: one sentence that says what the reader should do. Do not repeat the title.
- Every number shown is tag-compatible. Each source either goes in `.exhibit-note` as `[Kira estimates]` or `[Alias Year]` aliases, or sits next to the number (`.ex-src` inside a big number). Mark an estimate as an estimate. Never show an untagged figure.

---

## 2. Design rules (all exhibits)

1. **One highlight colour.** `.hl-fill` / `var(--primary)` goes only on the bar, segment, line, cell or node that carries the insight. Everything else uses `.base-fill` (#C9D3E3) or the greys `.ex-g1` (#8E9BB0), `.ex-g2` (#B4BFD0) and `.ex-g3` (#DCE2EC). Keep red (`.neg-fill`), green (`.pos-fill`) and amber (`.warn-fill`) for real good/bad meaning. Never use them as series colours.
2. **Annotate the point on the chart.** The key fact is written next to the mark it explains, as `.annot-text` with an optional `.annot-line` leader. Examples: "1.7x the regional average", "Overtakes Thailand ~2028F", "Taxes = 22% of shelf".
3. **Sort.** Bars, table rows, heatmap rows, tornado rows and football-field rows are sorted by the value that matters. Only time and process order override this.
4. **Bars start at zero.** Bar, stacked, waterfall and marimekko axes all start at zero. Lines may use a zoomed axis, but say so in `.exhibit-sub`.
5. **Label directly. Use a legend only when you must.** Values sit on or beside the marks (`.svg-value`), and series names sit at the end of the line or stack. Use `.ex-legend` only when segments are too thin to name, as in 100% stacks and marimekko.
6. **Show forecasts as dashed.** Forecast bars use `.ex-bar-fc` (tinted fill, dashed outline). Forecast lines use `.ex-line-fc`, and the uncertainty range is a shaded `.ex-band` polygon. Label the split ("ACTUAL / FORECAST") and put E/F suffixes on years (2025E, 2030F).
7. **Put the source line in `.exhibit-note`, never inside the SVG.** Keep it to one line, e.g. `Source: [Kira estimates]; [Retail audit 2025]`.
8. **Keep text legible.** Nothing renders below 9 px. Keep SVG `viewBox` dimensions at or below the measured body size (section 3) so the scale stays ≥ 1. Use the text classes: `.axis-text` 9 px mono, `.svg-label` 10 px, `.svg-value` 10 px bold mono, `.annot-text` 10.5 px bold, `.ex-small` 9.5 px.
9. **Gaps and ids.** Leave a 2 px gap between stacked segments and adjacent tiles: subtract 2 from each segment height or width. Never give an element an `id`, because several SVGs share one HTML document. Do not use `<defs>` markers. Draw arrowheads as `<path>`.
10. **Keep exhibits static and self-contained.** No JS, no external assets, no `<image>`, no gradients, no shadows, no 3D. Use flat CSS-class fills only.
11. **Limit the clutter.** Show at most 3 series per line chart, 4-5 segments per stack, 6 donut slices and 8-10 bars. Fold the rest into "Other" or split the data into small multiples.

---

## 3. Layouts and space budget

Measured at 1280×720 with a one-line title and a one-line kicker. A second title line costs about 28 px of height and a second kicker line about 20 px.

| Layout class | Columns | Exhibit body (W×H px) | Use for | Recommended viewBox |
|---|---|---|---|---|
| `layout-full` | 1 | 1138 × 360 | one wide exhibit (Gantt, flow, long time series) | `0 0 1110 330` |
| `layout-full ex-rows` | 1 + callout strip | 1138 × 285 | full exhibit plus a one-line callout underneath | `0 0 1110 270` |
| `layout-split` | 1 : 1 | 544 × 360 | two exhibits that answer one question (absolute + mix, cost + sensitivity) | `0 0 500 300` |
| `layout-main-side` | 2 : 1 | 735 × 360 | **default**: one exhibit plus commentary | `0 0 720 316` |
| `layout-side-main` | 1 : 2 | 735 × 360 | commentary leads (a bridge you must explain first) | `0 0 720 316` |
| `layout-trio` | 1 : 1 : 1 | 346 × 360 | three small exhibits, or two exhibits plus commentary | `0 0 300 300` |
| `layout-stack ex-top-auto` | rows: auto / 1fr | 1138 × 210 (lower) | a big-number row over a wide supporting exhibit | `0 0 1100 160` |
| `layout-hero` | 1 : 2.2 | 759 × 360 | one big number (left) proving the title, a chart (right) | `0 0 720 310` |

**How many exhibits?**
- 1 exhibit: `main-side` with commentary is the default. Use `full` (with `ex-rows` for a callout) for wide, time-based or process exhibits.
- 1 exhibit + a hero number: `hero` (`.big-number` on the left).
- 2 exhibits: `split`. Both must support the same title. Otherwise make two pages.
- 3 exhibits: `trio`. Or use two exhibits plus a `.commentary` column, which is better.
- A number row + an exhibit: `layout-stack ex-top-auto`, with the `.ex-bn-row` big numbers on top.
- Commentary first: `side-main`.

Inside a layout cell, `.ex-cell` stacks two blocks vertically, for example a small exhibit and a callout.

---

## 4. Choosing an exhibit (message → exhibit)

| The message is… | Use | Not |
|---|---|---|
| "X is the biggest / fastest / lowest" (ranking) | `bar` (horizontal, sorted, one highlight) | donut |
| "It grew from A to B" (few periods) | `bar` (vertical by year, forecast dashed) | line with 3 points |
| "The trend over 8+ periods / X overtakes Y" | `line` | bar |
| "The mix is shifting" | `stacked_bar` (100%) | several donuts |
| "The market grows and who takes the growth" | `stacked_bar` (absolute) next to `stacked_bar` (100%) | — |
| "How A becomes B" (bridge, price build-up, cost stack) | `waterfall` | stacked bar |
| "Where each option / category sits on two dimensions" | `matrix_2x2` | table |
| "Scores across two dimensions" (segment × country) | `heatmap` | clustered bars |
| "Which option wins against the criteria" | `comparison_table` | heatmap |
| "What drives the number, and which lever matters" | `driver_tree` | waterfall |
| "How big is the prize really" (TAM → SOM, conversion) | `funnel` | donut |
| "What it costs or is worth, as a range / what moves the answer" | `range` (football field, tornado) | bars with error ticks |
| "When things happened / the plan and its gates" | `timeline` (events or Gantt) | table of dates |
| "How the chain works and where it breaks" | `flow` | bullet list |
| "Where in the country" | `tile_map` | a table of 17 regions |
| "One number says it all" | `big_number` | a one-bar chart |
| "Share of one total at one moment" (≤ 6 parts) | `donut` | pie, 3D |
| "Segment size and who wins each segment" | `marimekko` | two separate charts |

---

## 5. Coordinate conventions (all SVG exhibits)

- Origin is top-left and y grows downward. Set `viewBox="0 0 W H"` and no width or height attributes. `.exhibit-body svg` fills the body and keeps the aspect ratio (`meet`).
- Linear scale: `px = p0 + (value - v0) × k`, where `k = plot_length / (vmax - v0)`. For bars, `v0 = 0`.
- Vertical bars: `y_top = base - value × k`, `height = value × k`.
- Category slots: `x_i = x0 + i × slot + (slot - bar_width) / 2`. Make the bar width 55-65% of the slot.
- Text baseline: centre a label vertically on a bar by setting `y = bar_y + bar_h / 2 + 4` for 10 px text.
- Round coordinates to 0.1. Put the scale in a comment at the top of the SVG, `<!-- scale: … -->`, so the next editor can extend it.

---

## 6. The 16 types

Each entry gives: use / don't use · data shape · layouts · rules · skeleton.

### 6.1 `bar`
- **Use:** ranking (horizontal, sorted descending); value by year or segment (vertical); one comparison bar against a benchmark.
- **Don't use:** for more than 12 categories (show the top 8 + Other), or for shares of one total that must sum to 100% (use `stacked_bar`).
- **Data:** `[{label, value, highlight?, forecast?}]` plus an optional `benchmark` value.
- **Layouts:** main-side (horizontal), hero (vertical by year), split.
- **Rules:** sort the bars. Start at zero. Use one `.hl-fill` bar and make the rest `.base-fill`. Put value labels at the bar end. Draw the benchmark as a dashed `.ex-ref` line with its label at the top. Forecast bars use `.ex-bar-fc`, with a dashed `.ex-event` divider and "ACTUAL" / "FORECAST" `.ex-axis-title` labels. Show a CAGR as a bracket `<path class="annot-line">` above the bars.

```html
<svg viewBox="0 0 720 320">
  <!-- scale: x = 120 + value*32 ; bar i: y = 34 + i*46, height 26 -->
  <line class="ex-ref" x1="350.4" y1="24" x2="350.4" y2="296"/>          <!-- benchmark 7.2 -> 120+7.2*32 -->
  <text class="ex-axis-title" x="354.4" y="20">SEA average 7.2%</text>
  <!-- row i (repeat): -->
  <text class="svg-label ex-label-strong" x="110" y="51" text-anchor="end">Philippines</text>
  <rect class="hl-fill" x="120" y="34" width="403.2" height="26" rx="2"/>   <!-- 12.6*32 -->
  <text class="svg-value ex-label-hl" x="529.2" y="51">12.6%</text>
  <text class="annot-text" x="587.2" y="45">1.7x the regional average</text>
  <line class="ex-zero" x1="120" y1="28" x2="120" y2="296"/>
</svg>
```
For vertical bars: `base = 292`, `k = (base - top) / axis_max` (gallery: k = 5.2 for an axis to 50). Bar i: `x = x0 + i*slot + (slot-bw)/2`, `y = base - v*k`. Put the year label at `base + 15` and the value at `y - 6`.

### 6.2 `stacked_bar`
- **Use:** composition over time (absolute); mix shift (100%); one segment split across a few rows (horizontal 100%).
- **Don't use:** for more than 5 segments, or when the reader must compare middle segments precisely (use small bars instead).
- **Data:** `periods[]` × `segments[]` → value matrix. For 100%, normalise per row.
- **Layouts:** split (absolute + 100%), stack (horizontal split under a number row), main-side.
- **Rules:** put the highlight segment **on the baseline** (or at the left of a 100% bar) so it can be compared across bars. Colour the other segments `.ex-g1 → .ex-g3`, darkest next to the highlight. Leave a 2 px gap between segments. Put segment values inside when the segment is ≥ 18 px high or ≥ 34 px wide. A too-thin highlight value goes beside the bar in `.ex-label-hl`. Put totals above the stacks. Write segment names at the right of the last stack, or use `.ex-legend` for 100% bars. Show forecast columns with `fill-opacity="0.75"` and an E/F suffix.

```html
<svg viewBox="0 0 480 316">
  <!-- scale: segment height = value*1.75 stacked up from y=296 ; column i: x = 16 + i*74 + 14, width 46 -->
  <rect class="hl-fill" x="30" y="292.5" width="46" height="1.5"/>     <!-- seg 1: h=v*k, drawn h-2 tall -->
  <rect class="ex-g1"   x="30" y="254"   width="46" height="36.5"/>    <!-- seg 2: 22*1.75=38.5 tall, starts where seg 1 ended -->
  <text class="ex-in-dark" x="53" y="276.3" text-anchor="middle">22</text>
  <text class="svg-value"  x="53" y="…"   text-anchor="middle">94</text> <!-- total, 7 px above the stack -->
  <text class="axis-text"  x="53" y="311" text-anchor="middle">2019</text>
</svg>
```
100% bar: `x = x0 + share% × (W/100)`. Each segment is `share×W/100 − 2` wide. Rows at `y = top + i*row_h`.

### 6.3 `line`
- **Use:** a trend over 6+ periods; crossover or convergence; forecast with an uncertainty range; events that explain kinks.
- **Don't use:** for 2-4 periods (use bars), for categories without order, or for more than 3 series.
- **Data:** `x[]` (years) and `series[] {name, values[], highlight?}`. Add `forecast_from` and an optional `range {low[], high[]}` and `events[] {x, label}`.
- **Layouts:** main-side, full.
- **Rules:** the subject is `.ex-line-hl` (2.5 px blue) and comparators are `.ex-line-base` (grey). Split each series into an actual `<path>` and a forecast `<path class="… ex-line-fc">` that share the join point. Draw the range as an `.ex-band` polygon: the upper points left→right, then the lower points right→left. Put end labels (`name value`) at `x1 + 8`, nudged so they don't touch. Draw events as `.annot-line` stubs to `.annot-text` placed in free space, never on top of a line. Put light `.grid-line`s every axis step and label every 2nd or 3rd year.

```html
<svg viewBox="0 0 720 304">
  <!-- scale: x = 44 + (year-2015)*37.07 ; y = 286 - value*5.6 (axis 0-45) -->
  <line class="grid-line" x1="44" y1="174" x2="600" y2="174"/><text class="axis-text" x="38" y="177" text-anchor="end">20</text>
  <line class="ex-event" x1="377.6" y1="26" x2="377.6" y2="286"/><text class="ex-axis-title" x="382.6" y="32">FORECAST</text>
  <polygon class="ex-band" points="377.6,123.6 …(high, left→right) 600,56.4 600,101.2 …(low, right→left)"/>
  <path class="ex-line-base" d="M44 118 L81.1 115.2 …"/>               <!-- comparator actuals -->
  <path class="ex-line-hl" d="M44 185.2 L81.1 176.8 … L377.6 123.6"/>  <!-- subject actuals -->
  <path class="ex-line-hl ex-line-fc" d="M377.6 123.6 … L600 78.8"/>    <!-- subject forecast -->
  <text class="svg-value ex-label-hl" x="608" y="82.8">Vietnam 37.0</text>
</svg>
```

### 6.4 `waterfall`
- **Use:** a bridge from A to B (last year to this year, budget to actual); a price build-up from ex-factory to shelf; a cost or margin stack.
- **Don't use:** for more than 9 steps (group the small ones), or when the steps are not additive.
- **Data:** `start {label, value}`, `steps[] {label, delta, highlight?}`, `end {label, value}`. The end must equal the start plus the deltas. Check the sum.
- **Layouts:** side-main (explain, then show), main-side, full.
- **Rules:** start and end totals are `.ex-total-fill` (dark grey). Steps are `.base-fill`, the insight steps `.hl-fill`, and negative steps `.neg-fill` only when "bad" is the point. Draw dashed `.ex-conn` connectors at the running total between bars. Value labels go above each bar ("+3.6", with a minus sign for negatives). The category goes below, and an optional second line gives "% of total". Bracket the insight ("Taxes = 22% of shelf price").

```html
<svg viewBox="0 0 720 316">
  <!-- scale: y = 282 - value*7.2 ; bar i: x = 10 + i*100 + 19, width 62; floating bar spans running total before -> after -->
  <rect class="ex-total-fill" x="29" y="152.4" width="62" height="129.6"/>   <!-- 18.0 -> 0..18 -->
  <line class="ex-conn" x1="91" y1="152.4" x2="129" y2="152.4"/>             <!-- running total 18.0 -->
  <rect class="hl-fill" x="129" y="126.5" width="62" height="25.9"/>         <!-- +3.6: from 18.0 to 21.6 -->
  <text class="svg-value ex-label-hl" x="160" y="120.5" text-anchor="middle">+3.6</text>
  <text class="svg-label" x="160" y="297" text-anchor="middle">Sugar excise</text>
  <text class="axis-text" x="160" y="309" text-anchor="middle">11% of shelf</text>
</svg>
```
For a negative delta, the bar spans from `running - |d|` to `running`, and the connector continues from the lower edge.

### 6.5 `matrix_2x2`
- **Use:** positioning on two dimensions (attractiveness × ability to win, growth × margin, price × quality). Add a bubble size for a third variable.
- **Don't use:** when the axes are not continuous or scored, or for more than 12 items. With fewer than 4 items, use a table.
- **Data:** `items[] {label, x, y, size?}`, the axis ranges and the split values (the market average or the scale midpoint).
- **Layouts:** main-side, split.
- **Rules:** build four quadrant rects (`.ex-quad`) and tint the target quadrant `.ex-quad-hl`. Put quadrant names in the corners (`.ex-quad-label`, with `.hl` on the target). Add an axis title on each axis, with a rotated `transform="translate(14 cy) rotate(-90)"` for y. Bubble radius is `r = c × √size`, because area must match the value. Draw the largest bubbles first so small ones sit on top. Label each bubble directly, choosing the side with free space. Highlight the bubbles in the target quadrant only.

```html
<svg viewBox="0 0 720 316">
  <!-- scale: x = 64 + growth*42.4 (0-15%) ; y = 278 - (margin-20)*8.73 (20-50%) ; r = 13*sqrt(size) -->
  <rect class="ex-quad"    x="64"  y="16" width="318" height="131"/>
  <rect class="ex-quad-hl" x="382" y="16" width="318" height="131"/>   <!-- split at x(7.5)=382, y(35)=147 -->
  <rect class="ex-quad"    x="64"  y="147" width="318" height="131"/>
  <rect class="ex-quad"    x="382" y="147" width="318" height="131"/>
  <text class="ex-quad-label hl" x="692" y="31" text-anchor="end">Build · invest to lead</text>
  <circle class="ex-bubble-hl" cx="594" cy="85.9" r="10.1"/>
  <text class="svg-label ex-label-strong" x="594" y="70.8" text-anchor="middle">RTD coffee</text>
  <text class="ex-axis-title" x="382" y="308" text-anchor="middle">Value CAGR 2024-29F</text>
</svg>
```

### 6.6 `heatmap`
- **Use:** scores or values on a rows × columns grid (segment × country, criterion × option, month × region).
- **Don't use:** for more than about 10 × 8 cells at this page size, or when the exact values matter more than the pattern (use a table).
- **Data:** `rows[]`, `cols[]` and a `matrix[r][c]`, binned to 5 steps (1-5 scores, or quintiles of the value).
- **Layouts:** main-side, full.
- **Rules:** it is an HTML table (`table.ex-heat`), so the text wraps and scales without coordinate maths. Use one sequential blue, `td.h1 … td.h5`, and print the value in every cell. Sort the rows by their average and add a `td.sum` average column. Outline the priority cells with `td.hl`. Put a scale key `.ex-scale` under the table. Never use a red-to-green rainbow.

```html
<table class="ex-heat">
  <thead><tr><th class="row">Segment</th><th>VN</th><th>PH</th>…<th>Avg</th></tr></thead>
  <tbody><tr><th class="row">RTD coffee</th><td class="h5 hl">5</td><td class="h4">4</td>…<td class="sum">3.6</td></tr></tbody>
</table>
<div class="ex-scale">1 = low<i style="background:#EEF2F8"></i>…<i style="background:#1E5BD6"></i>5 = high</div>
```
Wrap it as `<div class="exhibit-body ex-html">` so the table and the scale stack vertically.

### 6.7 `comparison_table`
- **Use:** options × criteria with a recommendation; player profiles side by side; a scorecard.
- **Don't use:** for more than 6 options or 6 criteria. When every cell is a number, use a heatmap or bars.
- **Data:** `options[] {name, ratings[criterion]: strong|fair|weak, note?, overall 0-100, recommended?}`.
- **Layouts:** main-side (with commentary), full.
- **Rules:** use `table.kira-table` (existing). Ratings are `<span class="rating strong|fair|weak">`. Add a short mono note under a chip only where a number decides the cell. Show overall fit as a Harvey ball, `<span class="ex-harvey" style="--v:75">` (0/25/50/75/100). Mark the recommended row with `tr.recommended`, which adds the "· RECOMMENDED" tag. Use the `.exhibit.plain` frame. `.ex-compact` tightens the padding for 6+ rows.

```html
<table class="kira-table">
  <thead><tr><th>Entry route</th><th>Speed to shelf</th>…<th class="ex-c">Overall fit</th><th>Key risk</th></tr></thead>
  <tbody>
    <tr class="recommended"><td class="row-label">JV with local bottler</td>
      <td><span class="rating fair">Fair</span></td>
      <td><span class="rating fair">Fair</span><br><span class="mono">USD 24-33 m</span></td>…
      <td class="ex-c"><span class="ex-harvey" style="--v:75"></span></td><td>Partner governance</td></tr>
  </tbody>
</table>
```

### 6.8 `driver_tree`
- **Use:** to break a KPI into multiplicative or additive drivers (revenue = outlets × drop size × frequency; margin = price − cost stack) and show which lever matters.
- **Don't use:** for more than 3 levels or 8 leaves at this size, or when the drivers are not arithmetically linked.
- **Data:** a tree of `{label, value, formula_note, highlight?, children[]}`. The children must multiply or add up to the parent. Check it.
- **Layouts:** main-side, full.
- **Rules:** run the levels left → right. Box columns are `x = [0, 200, 410]` with widths `[160, 170, 196]` and box height 44. Place the leaves first, then centre each parent on its children (`y_parent = mean(y_children)`). Links are elbow paths from the parent's right edge to the child's left edge, with the bend at the midpoint. Each box shows the title (`.ex-node-title`, left), the value (`.ex-node-value`, right) and the formula or benchmark (`.ex-node-note`). Highlight the lever and its path (`.ex-node-hl`), and size the prize beside it as `.annot-text`.

```html
<svg viewBox="0 0 720 316">
  <!-- leaf y: 4, 54, 112, 162, 220, 270 (pairs 6 px apart, groups 14 px) ; parent y = mean of its two leaves -->
  <path class="ex-link" d="M370 51 H390 V26 H410"/>     <!-- parent (x 200..370, y 29) -> child (x 410, y 4) -->
  <rect class="ex-node-hl" x="410" y="54" width="196" height="44" rx="4"/>
  <text class="ex-node-title" x="420" y="70">Coverage</text>
  <text class="ex-node-value ex-label-hl" x="596" y="70" text-anchor="end">30%</text>
  <text class="ex-node-note" x="420" y="87">peer best 45%</text>
  <text class="annot-text" x="626" y="72">+15 pts to peer</text>
</svg>
```
The root box is taller (H + 20) and puts its value on a second line at 16 px.

### 6.9 `funnel`
- **Use:** TAM → SAM → SOM; conversion (aware → tried → bought → repeat); a pipeline.
- **Don't use:** for stages that are not nested subsets.
- **Data:** `steps[] {key, description, value}` in decreasing order. Drop-off % between steps = `1 − next/this`.
- **Layouts:** trio, split, main-side.
- **Rules:**
  - TAM/SAM/SOM ratios are often 40:1, so draw a **stylised** funnel of fixed trapezoids that taper (widths 290 → 200 → 110 → 60) and print "not to scale" in `.exhibit-sub`.
  - For a conversion funnel to scale, use centred horizontal bars with `width = value/max × W`, `x = cx − width/2`.
  - Put values inside the shapes and the drop-off % at the right of each transition. List the definitions under the funnel (key + description). Only the final step is highlighted.

```html
<svg viewBox="0 0 300 330">
  <!-- trapezoid i: top width w[i], bottom width w[i+1], centred at cx=150 ; y = 10 + i*(84+6) -->
  <polygon class="ex-g3" points="5,10 295,10 250,94 50,94"/>
  <text class="ex-in-dark" x="150" y="38" text-anchor="middle">TAM</text>
  <text class="ex-in-dark" x="150" y="58" text-anchor="middle" style="font-size:15px">41.0</text>
  <text class="svg-value" x="264" y="101">-76%</text>                    <!-- at the TAM->SAM seam -->
  <polygon class="hl-fill" points="95,190 205,190 180,274 120,274"/>     <!-- SOM -->
</svg>
```

### 6.10 `donut`
- **Use:** sparingly, for one snapshot share of one total with 2-6 parts, when "part of a whole" *is* the message.
- **Don't use:** for comparisons over time (use `stacked_bar`), for more than 6 parts, for side-by-side donuts, or for pies.
- **Data:** `parts[] {label, share}` summing to 100, and a centre label (the total).
- **Layouts:** trio, split.
- **Rules:** draw one `<circle>` per part with `stroke-dasharray`. Start at 12 o'clock. Order parts largest first, with "Other" last. The highlight part is blue and the rest are greys. Put the total in the centre. List the parts underneath with a swatch and %, since direct labels rarely fit in a trio cell.

```html
<svg viewBox="0 0 300 296">
  <!-- r=72, C = 2*pi*72 = 452.39 ; part: dasharray "(share*C - 2) C", dashoffset -(cumulative share*C) -->
  <g transform="rotate(-90 150 100)">
    <circle cx="150" cy="100" r="72" fill="none" stroke="#DCE2EC" stroke-width="26" stroke-dasharray="260.39 452.39" stroke-dashoffset="0"/>
    <circle cx="150" cy="100" r="72" fill="none" stroke="var(--primary)" stroke-width="26" stroke-dasharray="74.91 452.39" stroke-dashoffset="-262.39"/>
  </g>
  <text class="ex-node-value" x="150" y="98" text-anchor="middle" style="font-size:17px">PHP 21.6 bn</text>
</svg>
```

### 6.11 `range`
- **Use:**
  - Football field: value or cost ranges by method or option, low-base-high.
  - Scenario ranges.
  - Tornado: one-at-a-time sensitivity of an output (NPV, 2030 market size) to its inputs.
- **Don't use:** for single-point estimates, or for a tornado with fewer than 3 drivers.
- **Data:**
  - Football field: `rows[] {label, low, high, base}`.
  - Tornado: `rows[] {driver ±x%, output_low, output_high}` and the `base` output.
- **Layouts:** split (both together), main-side.
- **Rules:**
  - Football field: draw a bar from low to high and a dark `.ex-zero` tick at the base. Print the end values outside the bar. Add light gridlines with axis values. Highlight the recommended option.
  - Tornado: sort by total swing, widest on top. Draw a centre line at the base with a "Base NPV 42" label below it. Make the downside bar solid and the upside bar the same colour at 45% opacity. Put the output values at the bar ends. Only the top driver is blue.

```html
<svg viewBox="0 0 500 300">
  <!-- football field: x = 150 + value*3.6 (0-90) ; row i: y = 30 + i*62, height 24 -->
  <rect class="hl-fill" x="236.4" y="92" width="32.4" height="24" rx="2"/>      <!-- 24..33 -->
  <line class="ex-zero" x1="250.8" y1="88" x2="250.8" y2="120"/>                 <!-- base 28 -->
  <!-- tornado: x = 290 + delta*7 ; downside rect x = 290+neg*7 width -neg*7 ; upside rect x = 290 width pos*7 -->
</svg>
```

### 6.12 `timeline`
Two variants, both under the `timeline` marker.
- **Events:**
  - **Use:** policy changes, market entries and exits, launches on a dated axis.
  - **Data:** `events[] {date_decimal, date_label, title, body?, track: above|below}`.
  - **Rules:** run a horizontal axis (`.ex-g3` rail) with years underneath. The two tracks are policy above (blue `.ex-dot-hl`, `.tl-marker-*` text) and market below (grey). Stagger labels on 2 tiers (46 / 100 px from the axis) so neighbours never collide. Within the last 150 px of the axis, right-align labels to the left of their stem. Draw a short dashed amber `.ex-today` marker. Keep it to at most 10 events.
- **Gantt / roadmap:**
  - **Use:** a plan with phases, workstreams and decision gates.
  - **Data:** `rows[] {workstream, bars[] {start_q, end_q, kind: base|critical|conditional, label}}` and `gates[] {q, label}`.
  - **Rules:** draw a row-label column (200 px) and quarter header cells, with year 1 in `.ex-g3` and year 2 in `.ex-s0`. Bars are `.ex-g1`, the critical path `.hl-fill` and conditional work `.ex-bar-fc` (dashed). Draw gates as black diamonds on a gate line, with dashed `.ex-event` guides up through the rows. Stagger neighbouring gate labels by 14 px.
- **Layouts:** main-side (events), `layout-full ex-rows` (Gantt plus a callout).

```html
<svg viewBox="0 0 1110 270">
  <!-- Gantt: quarter q starts at x = 200 + q*113.75 ; row i: y = 30 + i*38 + 10, bar height 18 -->
  <rect class="hl-fill" x="600.1" y="154" width="223.5" height="18" rx="3"/>      <!-- Q3.5..Q5.5 -->
  <path class="ex-gate" d="M825.6 227 L832.6 234 L825.6 241 L818.6 234 Z"/>      <!-- gate at q=5.5, gate line y=234 -->
</svg>
<!-- Events: x = 30 + (t-2018)*73.33 ; axis y = 160 ; label tiers at 160 ∓ 46 / 100 -->
```

### 6.13 `flow`
- **Use:** a value chain or route to market, a process, or a customer journey, with stages and optional swimlanes (margin, lead time, pain points, levers).
- **Don't use:** for loops or branching logic (a decision tree needs a different page), or for more than 7 stages.
- **Data:** `stages[] {n, name, highlight?}` and `lanes[] {name, cells[stage_count]}`. Pain points are numbered.
- **Layouts:** full (`ex-rows` for a callout), main-side for 4 or fewer stages.
- **Rules:**
  - It is an HTML grid (`.ex-flow` with `--cols: N`), with a first column for the lane names.
  - Stages are clip-path chevrons (`.stage`; `.stage.hl` for the problem stage). The first stage has a flat left edge automatically.
  - Lane cells are short, at most 2 lines. The highlighted stage's cells take `.cell.hl`.
  - Pain points are `<span class="ex-pain">1</span>` red numbered markers. Red is allowed here because a pain point is a "bad" state.
  - Numbers in cells go in `<span class="mono">`.

```html
<div class="ex-flow" style="--cols:6">
  <div></div>
  <div class="stage"><span class="n">01</span>Importer / brand owner</div> … <div class="stage hl"><span class="n">03</span>Sub-distributor</div> …
  <div class="lane">Margin taken</div><div class="cell">…</div> … <div class="cell hl"><span class="mono">6-8%</span></div> …
  <div class="lane">Pain points</div> … <div class="cell hl"><span class="ex-pain">2</span><strong>Patchy outer-island coverage</strong></div> …
</div>
```

### 6.14 `tile_map`
- **Use:** a regional split when geography matters but exact shapes do not: provinces or regions coloured by value, or a target cluster.
- **Don't use:** for more than about 40 tiles at this size, or when adjacency is misleading. Never load shapefiles or geographic paths.
- **Data:** `tiles[] {code, name, col, row, value}`. The grid positions approximate geography, as in the PH layout below.
- **Layouts:** main-side (map + key + annotation), split.
- **Rules:**
  - Tiles are equal squares: `x = ox + col×(s+g)`, `y = oy + row×(s+g)` with `s = 46`, `g = 4`.
  - Fill with the sequential bins `.ex-s1 … .ex-s5` and state the bin edges in a key.
  - Each tile shows a code (`.ex-tile-code`) and a value (`.ex-tile-val`). Text is white on s4/s5 and dark on s1-s3.
  - Outline the target cluster with one `.ex-tile-outline` path and annotate it.
  - Name the island or region groups with rotated axis titles at the left.
- **Reference grids:**
  - Philippines, 17 regions (col,row): I(1,0) CAR(2,0) II(3,0) · III(2,1) · NCR(2,2) IV-A(3,2) · IV-B(1,3) V(4,3) · VI(2,4) VII(3,4) VIII(4,4) · IX(1,5) X(2,5) XIII(3,5) · BARMM(1,6) XII(2,6) XI(3,6). Groups: Luzon rows 0-3, Visayas row 4, Mindanao rows 5-6.
  - Vietnam, 6 socio-economic regions (one column, north → south): Northern Midlands & Mountains(0,0) Red River Delta(1,0) · North & South Central Coast(1,1) · Central Highlands(0,2) Southeast(1,3) · Mekong Delta(0,4). For 63 or 34 provinces, use a 6-column grid of 11-12 rows with `s = 26`. Put the label inside as a 2-3 letter code only, and the values in a side table.

```html
<svg viewBox="0 0 720 352">
  <!-- tile (col,row) at x = 80 + col*50, y = 4 + row*50, size 46 -->
  <rect class="ex-s5" x="180" y="104" width="46" height="46" rx="3"/>
  <text class="ex-tile-code" x="186" y="120" fill="#FFFFFF">NCR</text>
  <text class="ex-tile-val"  x="186" y="142" fill="#FFFFFF">48%</text>
  <path class="ex-tile-outline" d="M177 51 H229 V101 H279 V153 H177 Z"/>
</svg>
```

### 6.15 `big_number`
- **Use:** when one number is the headline (hero layout), or a row of 2-4 headline stats over a supporting exhibit.
- **Don't use:** for more than 4 numbers (use a table), or for a number without a label and a source.
- **Data:** `{value, label, context?, source_tag, highlight?}`.
- **Layouts:** hero (single `.big-number`, left), `layout-stack ex-top-auto` (`.ex-bn-row`, top).
- **Rules:**
  - The value is short: "1.9x", "USD 4.2 bn", "58%", "3 of 5".
  - The label says what it measures, and the context sentence (hero only) gives the from → to.
  - Every number carries its tag in `.ex-src`.
  - In a row, only the number that proves the title keeps the blue `.big-number`. The others take `.big-number.muted`.

```html
<div class="ex-bn-row" style="--n:4">
  <div class="big-number muted"><div class="value">USD 4.2 bn</div><div class="label">SEA RTD tea retail value, 2025</div><div class="ex-src">[Kira estimates]</div></div>
  <div class="big-number"><div class="value">58%</div><div class="label">Sold through traditional trade</div><div class="ex-src">[Retail audit 2025]</div></div>
  …
</div>
```

### 6.16 `marimekko`
- **Use:** a market map. Column width is segment size, and the stack inside is player or channel share. It answers "big segments, and who wins each".
- **Don't use:** for fewer than 3 or more than 6 columns. A segment under about 8% of the market becomes too thin. Don't use it when the reader needs exact shares (use a table).
- **Data:** `segments[] {name, size}` and `players[]` → `share[segment][player]` (each column sums to 100).
- **Layouts:** main-side, full.
- **Rules:**
  - Column width is `size/total × W`. Cell height is `share × H/100`, stacked up from the baseline.
  - The subject player sits on the baseline in blue so its share reads across the columns. Other players are greys.
  - Leave 2 px gaps.
  - Label a cell only when it is ≥ 34 px wide and ≥ 16 px tall.
  - Put the segment name and size above each column, with players in `.ex-legend`.
  - Add a one-line reading note under the chart.

```html
<svg viewBox="0 0 720 310">
  <!-- column width = size/total*700 ; cell height = share%*2.5 ; stack from y=290 upward ; 2px gaps -->
  <rect class="hl-fill" x="10" y="212.5" width="263.8" height="75.5"/>      <!-- Savoury 0.9/2.37 = 38% of width (265.8 - 2), leader 31% -->
  <text class="ex-in-label" x="141.9" y="254.3" text-anchor="middle">31%</text>
  <text class="svg-label ex-label-strong" x="12" y="18">Savoury snacks</text>
  <text class="axis-text" x="12" y="32">USD 0.9 bn · 38%</text>
</svg>
```

---

## 7. Class reference (Exhibit library helpers)

| Purpose | Classes |
|---|---|
| Highlight / muted fills | `.hl-fill` `.base-fill` `.ex-g1` `.ex-g2` `.ex-g3` `.ex-hl-soft` `.ex-total-fill` |
| Meaningful fills | `.neg-fill` `.pos-fill` `.warn-fill` (good/bad only) |
| Forecast | `.ex-bar-fc` (bars) · `.ex-line-fc` (lines) · `.ex-band` (range) |
| Sequential scale | `.ex-s0` … `.ex-s5` (SVG) · `td.h1` … `td.h5` (heatmap) |
| Lines & guides | `.ex-line-hl` `.ex-line-base` `.ex-zero` `.ex-ref` `.ex-conn` `.ex-event` `.ex-today` `.grid-line` `.axis-line` `.ex-link` |
| Marks | `.ex-dot-hl` `.ex-dot-base` `.ex-bubble-hl` `.ex-bubble-base` `.ex-node` `.ex-node-hl` `.ex-gate` `.ex-quad` `.ex-quad-hl` `.ex-tile-outline` |
| SVG text | `.axis-text` `.ex-axis-title` `.svg-label` `.svg-value` `.annot-text` `.ex-small` `.ex-in-label` (white) `.ex-in-dark` `.ex-label-hl` `.ex-label-strong` `.ex-quad-label` `.ex-node-title` `.ex-node-value` `.ex-node-note` `.ex-tile-code` `.ex-tile-val` `.tl-marker-date/-label/-body` |
| HTML blocks | `.ex-legend` `.ex-heat` `.ex-scale` `.ex-harvey` `.ex-bn-row` `.ex-flow` `.ex-pain` `.ex-cell` |
| Layout modifiers | `.layout.ex-rows` (exhibit + callout strip) · `.layout-stack.ex-top-auto` (number row + exhibit) |

## 8. Pre-flight checklist (per exhibit)

- [ ] The title is a full-sentence so-what. The exhibit title names the measure. `.exhibit-sub` gives country, unit and period.
- [ ] Exactly one highlight idea. Bars sorted. Bar axes from zero. Forecast dashed and labelled.
- [ ] The key point is annotated on the chart. Labels are direct, with a legend only if unavoidable.
- [ ] The viewBox is ≤ the body size for the chosen layout (section 3). No text renders under 9 px. No two labels overlap. No label sits outside the viewBox.
- [ ] Every number is tagged (`.exhibit-note` or `.ex-src`). Totals add up, and tree children multiply or add to the parent.
- [ ] No `id`s and no external assets. Render the page and look at it before shipping.
