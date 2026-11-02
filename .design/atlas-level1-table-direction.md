# Direction — the national result, read off the map and listed beside it

The level-one page answers "who won India" with a map and nothing else. The map
gives the *shape* of the answer; it cannot give the totals, and it offers no way
to ask a question of the data. This adds the missing half: the national
party-wise result as a table to the right of the map, which both reads out the
totals and drives the map as a filter.

## PRODUCT / USER / PRIMARY GOAL

**Product** — level one of the Election Atlas of India: the national map, 543
constituencies, four general elections.

**User** — someone who wants to know how a national election actually divided,
and to interrogate it: *where did this party win, and what does the country look
like with only these two on it?*

**Primary goal** — read the national result, then narrow the map to a party or a
pair of parties without losing the geography.

**Must be understood in five seconds** — which parties hold the country, and that
the table is the control for the map, not a separate report.

## VISUAL DIRECTION

**A printed election supplement**: the map is the plate, the table is the
printed key beside it. No new colour, no new ornament — the page already owns a
complete visual language, and this addition is furniture within it.

## HIERARCHY

1. **The map**, still the strongest anchor and the largest object on the page.
2. **The table**, a dense readout at the trailing edge, subordinate by position
   and by type size but equal by information value.
3. The masthead and its caveat, unchanged.

The eye goes map → table. The table's own eye-path goes **Party → Seats**, since
the leader is what a reader looks for first, and the sort default is seats
descending.

## LAYOUT

Two columns, one row:

    [ map, left-justified, height-bound ]   [ national table, fixed measure ]

The map is currently centred in a 1325px column while being only 649px wide —
because its height binds, not its width. Left-justifying it and putting the
table in the vacated space therefore costs the map **nothing at 1440px**. This
is the whole justification for the layout: the table is not competing for room,
it is occupying dead ground.

Column measure stays fixed (`17rem`–`19rem`) rather than proportional: a table
whose columns move as the window changes is a table you have to re-read.

**Below 60rem** the map keeps the height it has and the table moves beneath it
into a bounded region with its own scroll, so the *page* still never scrolls.
The page-level no-scroll rule is the primary constraint and is preserved at
every viewport; on a phone the table scrolls inside its own box instead.

## TYPOGRAPHY

No new faces, no new sizes. The table is the `--mono` data voice already used by
the hover card and level two: `.6875rem` figures, `.5625rem` letter-spaced
uppercase heads. Party codes are mono; nothing here is set in the serif.

## COLOR

**No new colour.** Selected parties keep their own party colour on the map;
everything not selected goes to `--paper-2`, the existing neutral — the "dull"
state is a desaturated *surface*, not a new grey.

Selection in the table is `--ink`, never a hue, for the same reason the caveat
is: every saturated colour on this page is a party, and a selection highlight in
orange would read as BJP.

| state | table row | map |
| --- | --- | --- |
| default | plain, `--ink` | all parties in colour |
| hovered | `--paper-2` surface | that party lifted, rest washed |
| selected | `--paper-2` surface + 2px `--ink` leading edge | keeps its colour |
| unselected while a selection exists | `--muted` text | `--paper-2` |

## DENSITY / INTERACTION / RESPONSIVE STRATEGY

Density is high and deliberate — this is a readout, and a reader scanning it
wants rows, not cards. Fourteen rows plus a "+N more" remainder, matching the
house pattern already used by the card and level two.

Interaction is one grammar, reusing what level two already established:

- **hover** a row → focus that party on the map (lift + wash), same as hovering
  a state already does
- **click** a row → toggle it into the selection; clicking again removes it
- **sort** any of Seats / Votes / Share, with the arrow and `aria-sort` level
  two already uses
- **clear** the selection from the table head, shown only when there is one

Two resets can appear in the head (sort order, selection). Both stay hidden
until they apply, which is the behaviour level two already has for sort.

## MOTION

Inherited, not invented. Rows use the existing `--ease` colour transition;
the map's scrim and lift already animate at `.24s` and are reused unchanged.
Nothing new moves, and `prefers-reduced-motion` already covers the map.

## IMAGERY

**None.** The map is the imagery. The table is pure data and the swatches are
9px squares the page already draws.

## SIGNATURE

**The selection is a filter on the country, not a highlight on a row.** Picking
BJP and INC leaves the map showing only the two-party contest — the geography
of a hung parliament, visible at a glance, which no table and no map alone can
show.

## WHAT THIS MUST NOT BECOME

- Not a dashboard. No cards, no sparklines, no summary tiles, no KPI row.
- Not a legend. A legend describes the map; this table *acts on* it, and its
  rows have to look operable.
- Not a new colour system. If it needs a colour that is not already on the page,
  the design is wrong.
