# Direction — The atlas as an instrument

Level 1 of the Election Atlas of India. Contract for `work/election-atlas/index.html`.
Companion to `.design/direction.md`, which governs the portfolio. **Same voice, different register.**

## PRODUCT / USER / PRIMARY GOAL

- **Product:** the national Lok Sabha view — 36 states and UTs coloured by their leading party, over
  a timeline of election years, with the seat tally in one line.
- **User:** someone who wants to know who won where and how decisively. Arrives from the portfolio
  case study or a shared link, on a laptop, often during or just after an election.
- **Primary goal:** the national picture in five seconds; any state's full breakdown in sixty.

## VISUAL DIRECTION

**An instrument, not a poster.** The map carries all of the colour because on this page colour *is*
the data. The chrome is deliberately colourless so that nothing competes with a party.

## HIERARCHY

1. **The map** — the only area with colour, and the largest region by area.
2. **The 543-seat strip** — the national result in one line, crossed by the 272 majority threshold.
3. **The readout rail** — on demand; nothing there until the reader points at something.
4. **The timeline** — a control, quiet, aligned to the map's left edge.
5. **The header** — present, not loud. One title, one line of context.

## LAYOUT

- **Full-bleed map field, not a centred column.** The portfolio's 1088px column is a *reading*
  measure; a map is not text, and constraining it to a text measure would waste the medium.
- Map left, readout rail right (~20rem), stacked below 900px.
- The seat strip spans full width beneath the map.
- The timeline sits above the map, aligned to the map's left edge so the composition has one spine.

## TYPOGRAPHY

- **Newsreader** for the title, the region name, and any prose.
- **IBM Plex Mono** for every number, label, year, tick and unit. Nothing else.
- The same two families as the portfolio: a different register of the same voice, not a second brand.

## COLOR

| token | value | job |
|---|---|---|
| `--paper` | `#EEF1F8` | ground |
| `--ink` | `#0F1220` | text, focus, selected outline |
| `--rule` / `--rule-2` | `#D3D9E6` / `#BCC4D6` | hairlines, ticks, region strokes |
| `--muted` | `#525A6B` | secondary text |
| `--card` | `#FFFFFF` | the map's own ground, so regions sit *on* something |

- **No accent. At all.** The portfolio's blue-violet is suppressed here on purpose: every hue on
  this page belongs to a party, and a second accent would compete with the data it sits beside.
  This is the palette rule applied strictly — if the answer to "what is this colour for?" is
  "it looks cool", cut it.
- **Party colours come from `parties.json`** and are used nowhere else. Unknown codes take the
  registry's fallback grey. Colour is never invented per chart.

## DENSITY / INTERACTION / RESPONSIVE

- Dense by design: 36 regions and 543 seats, all legible at once, no pagination or filters.
- **States to design:** default · hover · `:focus-visible` · selected · loading · a year whose file
  is absent. Not just the happy path.
- **Below 900px:** map full width, readout stacks beneath it, timeline scrolls horizontally, and
  the seat strip goes to two rows. The map never shrinks below a legible size.

## MOTION

- Restrained and **causal**. Changing the year re-colours the map and re-orders the strip over
  240ms — the movement explains that it is the same seats at a different time. The readout follows
  the pointer with no animation at all.
- Nothing moves on its own. No loops, no parallax, no entrance choreography on a data instrument.
- `prefers-reduced-motion`: every transition becomes instant.

## IMAGERY

**none.** The map is drawn from geometry, which is data. A photograph or illustration here would be
decoration on a page whose entire job is measurement.

## SIGNATURE

**The 543-seat strip.** One line that is the whole national result, crossed by the 272 majority
threshold and bound to the map in *both* directions — point at a state and its block lights, point
at a block and the state lights. It is the element a reader will remember.

**It is a seat bar, not a state bar, and that distinction is load-bearing.** The first build grouped
the strip by the party each state *leads*, so the BJP run read "387" — the seats of the states BJP
leads — while the readout beside it said "BJP 211" — the seats BJP actually won. Both numbers were
correct and a reader had no way to tell they counted different things. The strip now draws each of
the 543 seats exactly once: grouped by the party that won it, and inside a run by the state it was
won in. "BJP 211" now means the same thing everywhere on the page.

## GATES BEFORE DELIVERY

- AI-slop audit: no gradients, no glow, no glass, no orbs, no decorative chart junk, no invented
  metrics. A choropleth is not a card grid; this page has no cards.
- Three-most-generic test, authorship test and removal pass, applied at critique.
- Rendered at 1440 and 390 and critiqued by a separate critic before this is called done.

---

# Built notes — what the measurements changed

Everything below was decided by measuring the render, not by eye. Several are corrections to the
contract above.

## The palette was derived from the map's own adjacency graph

Party colour is this page's primary channel, so it was treated as a data problem. The geometry's
shared arcs give the real border graph (32 adjacent pairs). Scoring every pair of parties that can
touch, in CIE Lab ΔE:

- **TDP amber sat ΔE 22 from BJP saffron, and Andhra Pradesh borders BJP-led Karnataka, Odisha and
  Puducherry.** Three collisions in a row, at the distance where two colours read as one. TDP moved
  to `#FFC300` (yellow) and BJP deepened to `#E8590C`: **22 → 55**.
- **AAP and NCP were byte-identical** (`#00838F`) in the original registry. AAP moved to `#0B72B8`.
- SP, CPM and CPI were three near-identical reds. Spread across the red family by lightness.
- Shiv Sena and BJP are both saffron in reality; split by lightness rather than by hue, because
  changing a party's hue family to satisfy a chart is the wrong trade.

**The residual, stated rather than hidden:** BJP and DMK sit at ΔE 27 and they do border each other
(Karnataka–Tamil Nadu). A search over the warm sector proved the constraint unsatisfiable — TDP,
BJP and DMK form a triangle (AP–KA, KA–TN, AP–TN) inside the orange-to-red arc, and any three
colours in that arc are either too close or stop being recognisable as those parties (the optimiser's
answer was a muddy brown for BJP). So **colour is not the only channel**: every state large enough
to be a real shape carries its postal code as a centroid label, and Karnataka and Tamil Nadu both
qualify. Where colour cannot separate two fills, the text does.

## Layout is sized to the map, not the other way round

India's projected ink is 410×438 px. The first build gave the map a `1.08fr` column — 626px at 1440 —
and the map filled **65%** of it, floating in 216px of dead space. The column is now `28.5rem` (456)
at a 522px map height, and the map fills **97%**. A wider column does not make the map bigger; it
only puts space beside it.

The readout's totals and table sit side by side rather than stacked. That was not decoration: the
stacked readout was 591px tall against the map's 474, so it — not the map — set the height of the
field, and the strip fell 27px below the 900px fold. Two panels bring the readout to 377px, the map
becomes the tallest element, and **the whole instrument now ends at 898px — above the fold.**

## What the render caught that the eye would not

- **Every map path rendered black.** A resize redraws the map and creates fresh `<path>` elements;
  `--c` is set per element, so the new ones had none and `fill:var(--c)` fell back to black. The
  ResizeObserver fires on observe, so this happened on first paint.
- **`IN-DH` renders as two geometries** (the pre-2019 source still has Dadra and Nagar Haveli and
  Daman and Diu separately), and `paths` was a Map keyed by code — so the second overwrote the
  first, which then stayed black forever.
- **Every hover and click handler was dead.** Listeners were bound per path; the resize redraw
  replaced the paths and took the listeners with them. The map drew perfectly and did nothing.
  Now delegated from the SVG root.
- **The map labels vanished** when the column narrowed, and then again for a different reason:
  `geoPath.centroid()` returns *projected* pixels while `geoContains()` takes *longitude/latitude*,
  so every containment test failed and every label was silently dropped. Labels are now computed in
  geographic space and projected at the end.
- **Headless `--virtual-time-budget` freezes CSS transitions.** Reading `fill` after a state change
  returns a mid-interpolation colour — the "the map did not grey out" alarm was this, not a bug.
  Colour assertions have to run with transitions disabled.

## Mobile is authored, not compressed

- Below 60rem the two-column grid collapses, and in source order that would put **the map above its
  own headline**. `display:contents` on the side column lets the stack be reordered to
  intro → map → readout.
- The strip drops its state subdivisions below 60rem and keeps the party runs. The state split stops
  being legible long before the party split does; keeping both would mean neither reads.
- Map labels are suppressed below a 400px-wide map. This was verified, not assumed: at a 350px map
  the collision pass drops all thirteen labels anyway, so the guard states an intent the geometry
  already enforces.
- Two-column footer tested at 390px: **634px tall against 629px for one column.** Halving the width
  doubles the lines; the pairing saves nothing. The footer's height is text volume, not layout, so it
  stays one readable column.

## The QA pass, and what it took to run it

The vision backend was rate-limited for this session, so the critique could not be a model looking
at a screenshot. It was done the other way: a small pure-Python PNG decoder, a row-by-row profile of
the render, and colour histograms against the party registry. That turned out to find things a look
would have missed as easily as it missed them.

- **The 272 was printed on top of the INC label.** The majority line sat at x=668 and the `INC 107`
  run label is centred at x=657 — 11px apart, both drawn, both illegible. The axis beneath the bar
  already said "272 — a majority" at the same x, so the number above the line was a duplicate before
  it was a collision. Deleted. Verified after: the run labels occupy y762-768, the line y772-857, the
  axis label x620-716 centred on a line at x=668.
- **A 1px border-radius was destroying the mobile bar.** At 390px a seat is 0.68px wide, so the tail
  blocks are 1–5px and rounding them anti-aliased most of the block away: **42% of the mobile strip
  was blended edge**. Removing the radius took it to **0%, with exact-colour pixels going 54% → 95%**
  (desktop 71% → 86%). A radius that is invisible on a 77px block is not invisible on a 2px one.
- **The rendered palette was confirmed against the registry, not assumed.** Decoding the map area
  returned exactly six saturated colours — `#E8590C #FFC300 #00A2E8 #C62828 #1E9E52 #0B72B8` — the
  six leading parties and nothing else.
- **The map fills 96–98% of its box on both axes at every width from 360 to 2560**, and no viewport
  in that range scrolls horizontally.
