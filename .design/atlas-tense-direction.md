# Direction — the tense: "as elected" / "as it stands"

PRODUCT — the Election Atlas gains a page-wide mode that reconciles the count on
polling day with the reality of the term after it (by-elections, vacancies, and the
cabinet that emerged from them). Two levels share it.

USER / PRIMARY GOAL — a reader who selects an election year can see both the result
as counted, and how the term actually ended up. The one control that switches this is
the tense; every surface obeys it.

## The tense

- **As elected** — seats as counted on polling day; the cabinet sworn in with that cycle.
- **As it stands** — seats after every by-election to date in that term (a past cycle =
  just before the next general election; the ongoing cycle = today); the cabinet as
  modified by by-election-driven office changes.

One switch, one meaning, three surfaces (map, party table, cabinet belt). It is NOT a
"by-election filter": it is the page's tense.

## HIERARCHY

1. The map (unchanged, height-bound, still the signature).
2. The by-election marks — the only thing that *moves* when the tense flips.
3. The party table's Δ column and the cabinet belt as equal secondaries.

## The rules that keep it honest

- **Two states never share a shape.** A by-election mark is a dashed `--ink` outline,
  distinct from hover (fill), selection (leading edge), and the state outline (solid).
- **Vacant is grey, not a party.** `--vacant` is a neutral, labelled in the readout and
  the card, never readable as a party hue.
- **Turnout is not comparable across tenses.** A by-election figure is always labelled
  as such, never merged into a general-election key.
- **No data = disabled with a reason.** A cycle with no by-elections disables the
  control and the readout says so; a control that appears operable and does nothing has
  already failed once here (the dead zoom).
- **Motion: only the changed seats move.** Rely on the existing `fill .22s` transition;
  no page-level crossfade. The marks persist after the animation.
- **The map declares its own state.** The mapnote is permanent and states the tense,
  the change count, and the as-of date.

## The cabinet belt

- One belt, many rows: cards flow **down first** (`grid-auto-flow: column`) then
  continue right with horizontal scroll. Fade gradients on both ends, shown only where
  overflow exists.
- Portrait slot (initials monogram in party colour; no stored portraits, see
  `work/election-atlas/data/photos/README.md`), name in Newsreader, portfolio in
  IBM Plex Mono, constituency muted with the 9px party swatch.
- Level 1: the belt occupies the field's trailing space (third `1fr` track — land the
  height-bound map can never use). Level 2: full-width band, same belt, wider.
- The belt obeys the tense: `members` as elected, `members + changes` as it stands.

## LAYOUT / DENSITY / RESPONSIVE

- Level 1 stays one screen (`--map-spill:1`, forced=0). The masthead holds the tense
  control beside the years (one row, no height cost); the mapnote reserves its own line
  under the map (`padding-bottom`), so the map shrinks ~26px to account for it — measured.
- Below 56rem the field stacks and the belt is removed on level 1. The trailing width it
  fills only exists while the map is height-bound; on a narrow screen the map is width-bound,
  so that land is gone and the belt would only squeeze the map. Level 2 keeps its full-width
  belt below the panels at every width.
- Belt text is 12px floor (role/seat), scope/asof 10px. No interactive-data label below 10px.
- Horizontal scrolling never steals the page's vertical wheel; `overscroll-behavior-x: contain`
  + `scroll-snap-type: x mandatory` + explicit prev/next step controls. No auto-advance.

## The delta

- A dedicated right-aligned `±` column in the party table, present only in "as it stands" mode,
  sortable, 500 weight, with an explicit sign (`+2` / `−1`, U+2212). Level 1 and level 2's PC
  table both carry it.

## COLOR

No new hue. `--vacant` is a neutral grey, the only new token. Marks and selection stay
`--ink`.

## MOTION

Precise, quiet. The tense flip animates exactly the seats that changed; the belt fades
are static gradients whose presence is the scroll state. `prefers-reduced-motion`
collapses transitions as on the rest of the page.

## IMAGERY

None: initials monograms only, plus a "View official photo on sansad.in" link.
Decided: the belt must not depend on photos to be correct.

## SIGNATURE

The dashed-ink mark on a by-election seat — a visible scar where the election result and
the term's reality diverged.
