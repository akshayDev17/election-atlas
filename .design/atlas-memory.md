# Design memory — the election atlas

Read this before touching `work/election-atlas/`. It records what was decided, what the
critic caught, and the numbers that are easy to get wrong twice.

Direction files: `.design/atlas-direction.md` (level 1), `.design/atlas-level2-direction.md`
(level 2), `.design/atlas-level1-table-direction.md` (the national table).

## Tokens

No new tokens. The national table was built entirely from what level 1 already had.

| token | value | job here |
| --- | --- | --- |
| `--paper` | `#EEF1F8` | ground |
| `--paper-2` | `#E3E9F4` | the "dull" state — unselected parties, row hover, caveat surface |
| `--ink` | `#0F1220` | text, state outlines, selection edge. 15.28:1 on `--paper-2` (APCA Lc 91.9) |
| `--muted` | `#525A6B` | labels; rows left out of a selection. 6.12:1 on `--paper` (APCA Lc 75.6 — the floor) |
| `--rule` / `--rule-2` | `#D3D9E6` / `#BCC4D6` | hairlines |
| `--table-w` | `clamp(16.5rem,20vw,19rem)` | the table measure. Fixed, never proportional |
| `--map-spill` | `1` | the one dial: >1 trades page scroll for map width |

**No accent colour, and this is load-bearing.** Every saturated hue on these pages is a
party. The conventional caution orange is `BJP #E8590C`; `SP #D32F2F` and `DMK #C62828`
are the reds; `TDP #FFC300` is the amber. A warning colour or a red dot would read as a
party, and a 9px coloured square is *literally* the party swatch (`#card .sw`,
`.ntable .sw`). Selection, focus and warning are therefore all expressed in `--ink`.

## Numbers to not re-derive

- **India's projected extent is 0.8839 wide : 1 tall.** Width and height cannot both be
  filled. The map is always height-bound on a normal viewport, so its width is derived.
- At 1440x900 the map is **649px wide** in a 1325px column. Multiplying 731 by 0.884 gives
  646, not 877 — a critic got this backwards and built a whole fix on it. Divide.
- `--map-spill:1` holds **0 forced page scroll** at every viewport tested (1440x900,
  1280x720, 1024x768, 900x700, 390x800, 360x640). That is the page's primary constraint.
- 743 party codes polled nationally in 2024. `seats>0 OR share>=0.5%` gives **48 parties
  covering 96.6%** of the vote.

## What the critic caught, and the fixes

The critic pass was **pixel-sampled, not visual** — the critic model had no image input and
said so rather than claiming a look. It decoded the PNGs with a pure-Python decoder.

| finding | fix |
| --- | --- |
| The map/table gap was **76px at 900 wide and 421px at 1280** — not stable, therefore residue rather than composition | `.field` became `grid-template-columns:max-content var(--table-w)`. `1fr` took all the slack and threw the table to the far edge; a fixed track keeps it beside the plate and lets slack fall past both. **Gap is now 24–37px at every width** |
| Hover and selected shared `--paper-2`, so with a filter live a hovered non-selected row wore the *selected* surface | Hover is now a **fill**, selection is a **leading edge**. They cannot share a shape |
| `+N more` carried populated figures under clickable rows and read as withheld | Removed, with an explicit stated cut instead. (The critic assumed ~40 parties; there are 743, so "show all" was not viable) |
| The table announced itself as a caption, not a control | A live hint line: the contract by default, the count when a filter is on. `clear selection` promoted to `--ink` at body scale |
| `Seats won` measured 56px against ~26px siblings, so the header read as one string | Shortened to `Seats`; `table-layout:fixed` with fixed column tracks, which also stops the figures shifting on sort |
| Icon-only sort reset beside a text one | Both are text now |

**Rejected fix, and why it matters:** the critic computed the map element as 877px wide
(from `884/1000 x 731`) and concluded 149px of internal slack was drifting the columns. The
ratio divides, not multiplies: the element is 649px, which the probe measured directly.
A confidently-argued fix built on a backwards ratio would have "corrected" something that
was already right. **Measure the claim before acting on it, however well-argued.**

## Lessons

1. **A gap that changes with the viewport is not composition, it is the absence of a
   decision.** The tell was 76 → 421px, not the absolute size. An `1fr` track beside a
   fixed one always produces this: it eats the slack and pins the second object to the edge.
2. **Two states must never share a shape.** Hover and selection differing by a 2px line is
   not a distinction, it is a coin flip on a dark screen.
3. **An explicit, stated criterion beats a silent cap.** `+N more` is a dead end that looks
   clickable; "parties holding a seat, or polling 0.5%" is honest and the reader can audit it.
   Both clauses are needed — a seats-only cut drops BSP (2.04%), BJD (1.46%) and AIADMK
   (1.39%), parties that polled in the millions and won nothing.
4. **`max-content` is the right track for a height-bound object.** It sizes to the object
   instead of stretching, which is what let the table sit beside the map without a JS
   measurement.
5. **Verify with the real event.** `:focus-visible` does not match after a mouse click, so a
   focus-ring rule written only for keyboard leaves the clicked case broken. Dispatch real
   mouse events; do not infer from the selector.

## The tense + cabinet belt (appended after that work)

Direction contract: `.design/atlas-tense-direction.md`. Both levels gained a page-wide
**tense** — `As elected` / `As it stands` — driving by-election marks on the map, a `±`
delta column in the party table, and a cabinet belt. Dummy data only:
`data/results/ls/byel/2014.json` (5 cases in UP: same-party, flip, two by-elections, vacant,
PM vacates Varanasi) + `data/cabinet/{union/2014,union/2024,state/IN-UP}.json`.

New tokens: `--vacant:#C7CDD9` (vacant seat fill, a neutral — never a party hue);
`--belt-card-w` (9.25rem L1 / 9rem L2); `--belt-rows` (3 / 2).

Numbers measured (chrome-headless-shell + iframe harness, DOM boxes):
- L1 map is **626×708** at 1440×900 — the mapnote's reserved line costs 26px of height, 23px
  of width (was 649×734). `forced=0` still holds at 1440/1280/390.
- L1 belt track (the trailing space) is **373px** at 1440, 410 at 1280. L2 forced-scroll 776px
  (maps+tables+belt; level 2 always scrolled).

What the critic caught (pixel-decoded + partial vision), and the outcome:
| finding | outcome |
| --- | --- |
| Delta was a footnote (`281−1`, no sign, no column) | **Fixed** — a dedicated right-aligned `±` column, sortable, 500 weight, `+2`/`−1` (U+2212), on both levels |
| Level 2 had no delta at all | **Fixed** — but only after the ordering bug below was caught |
| Belt had no scroll-snap or step controls | **Fixed** — `scroll-snap-type:x mandatory` + prev/next buttons shown only where overflow exists |
| Belt title read "16th Lok Sabha" (confused with tense) | **Fixed** — title is "Union council of ministers", ordinal moved to the as-of line |
| Belt mono 9px/8px too small | **Fixed** — role/seat 12px, scope/asof 10px; tense control 12px |
| Tense toggle 15px from the years, no separator | **Fixed** — hairline + gap between them |
| 36px map/table leading-edge offset | **Rejected** — measured map/fig/field all at x=57.6; no offset exists |
| Restore the belt on mobile | **Rejected on purpose** — on a narrow screen the map is width-bound, so the trailing land the belt fills is gone and the belt would only shrink the height-bound map (primary constraint). Level 2 keeps its belt at every width. Contract updated. |

Three bugs that were not visible until measured/probed:
1. The permanent mapnote overflowed the map figure — `height:100%` on the map ignores the
   note sibling. Fix: `.mapfig{padding-bottom:calc(var(--s3)+0.875rem)}` + note `position:absolute`.
2. On mobile the belt's content height (grid `auto` row + `height:100%` scroll) ate the fr rows
   and collapsed the map to 0. Fixed by removing the belt below 56rem on L1 (see above).
3. Level 2 rendered its table **before** `paintPC` computed `pcDelta`, so the ± column was
   blank. Order matters: `layout → paintPC (builds pcDelta) → renderTable`.

Lessons: a percentage-height map must account for every permanent sibling; a horizontal-scroll
region in an `auto` grid row needs a definite height or it swallows the flex track; a data
column that is rendered before its data is computed shows nothing with no error; and a belt's
row count is never a constant — `floor(available height ÷ tallest-card height)`, measured at
runtime and re-fit on resize, or the last row clips under a browser zoom.

## Search (party / minister) + party symbols — Sep 13
Added two masthead search bars (L1) and party-symbol images in the cabinet (L1+L2).

- **Find party** narrows the national table AND dims the map (a seat stays bright only if it
  passes both the click-selection and the text query). Count is "N of M" (M = table's unfiltered
  row count). A truthful empty state distinguishes "no match" from "matched below the 0.5% cut"
  (RLD 2019, VBA/PMK 2024 polled <0.5% — the flat "no party matches" was a lie). The mapnote is
  query-aware: "· 2 parties showing" / "· no seat matches 'xyz'".
- **Find minister** spotlights matching belt cards. Dimming is the map's recede idiom, NOT raw
  opacity: `.belt-card.dim .belt-face{filter:saturate(.22)}` + name → `--muted`. Raw `opacity:.28`
  put names at 1.68:1 (unreadable). First match is scrolled into view (`behavior:'auto'` — smooth
  fights `scroll-snap-type:x mandatory` and freezes under headless virtual-time).
- Party symbols: 24/24 Wikipedia infobox logos downloaded to `data/photos/parties/` +
  `data/parties-symbols.json`. Cabinet's 9px colour square → 18px emblem (`max-width/height`,
  no letterbox) with a colour-square fallback (incl. on image error). Map/table keep colour.
  9 files are monochrome black line art (election symbols); mixed aspect ratios (JDU arrow 3.4:1,
  JDS 1:1.5) — `object-fit:contain` in a fixed box letterboxes wide banners, so use
  `max-width/max-height + width/height:auto` instead.
- Wikimedia now rejects the `240px` thumb (HTTP 400); the allowlist is 20/40/60/120/250/330/500/960… — use 250px.

**Critic method caveat (this run):** vision backends returned 429 for the whole turn, so the
critic pixel-sampled + OCR'd + read source rather than viewing the PNGs. It still caught real
defects (2.72:1 placeholder, 1.55:1 field boundary, the false empty state, the stale count,
`outline:0` on the only input). Fixed: `--rule-3:#7C8598` boundary (3.28:1), placeholder to full
`--muted` (6.12:1), input gets the page's `:focus-visible` ring, labels on a shared 6.5rem track
so the two inputs align, row spans (`space-between`) instead of pooling 525px of dead space,
label promoted to the `.lbl` tier (10px/.15em), concrete placeholders ("e.g. BJP, Congress, AITC").

**Lesson:** a new control must inherit the page's already-written idioms — its focus ring, its
contrast arithmetic, its recede mechanism — not re-derive its own. The three tells that a
component was generated rather than designed: a placeholder restating its label, two count
formats in one component, and `outline:0` with no replacement. And a search that reports a match
it never takes you to is only half a search.
