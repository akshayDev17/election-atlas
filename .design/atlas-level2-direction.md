# Direction — Level 2: one state, under two grids

The contract for the state drill-down. Level 1 is built and shipped; this is what
a state's own page has to be, and why.

---

## PRODUCT / USER / PRIMARY GOAL

**Product.** The state page of the Election Atlas of India. Reached by choosing a
state on the national map. Where level 1 answers *who holds the country*, this
answers *how this state voted, at both tiers, and how the two tiers relate*.

**User.** Someone who has found their own state and wants to read it properly.
Not someone browsing the country — they have already committed to a place.

**Primary goal.** The reader must understand, in five seconds, that this state is
being shown at **two granularities at once**, and which party dominates each.

**What level 2 carries that level 1 was stripped of.** The state name, seat
counts, votes polled, turnout, and the party table. These were deliberately taken
off level 1 because they are answers about *one* place, and level 1 is about all
of them. They belong here, and they belong here **twice** — once per tier —
because an assembly result and a parliamentary result are different elections
with different party compositions.

---

## VISUAL DIRECTION

**Two grids over the same ground.** The character is that of a survey sheet: the
same landmass drawn twice, at the same scale and the same place on the page, so
the two boundary systems can be read against each other. Not two separate
graphics that happen to sit side by side — one place, two ways of cutting it.

---

## HIERARCHY

1. **The two maps.** Dominant. They are the page.
2. **The state's name and the year.** The masthead, small but unmistakable.
3. **The two party tables.** Supporting, one per tier, beneath their map.
4. **The way out.** Back to the national map. Quiet.

The eye should travel: masthead → left map → right map → the tables, or
straight from a map to its table.

---

## LAYOUT

```
← India        UTTAR PRADESH              2014  2019  2024
─────────────────────────────────────────────────────────────
MLAs · 403                       MPs · 80
┌────────────────────────┐      ┌────────────────────────┐
│                        │      │                        │
│   assembly segments    │      │  parliamentary seats   │
│                        │      │                        │
└────────────────────────┘      └────────────────────────┘
PARTY  SEATS  VOTES  SHARE      PARTY  SEATS  VOTES  SHARE
```

**Both maps share one projection and one extent.** Not two fits — one fit, used
twice. This is load-bearing: it means a point on the left is the same place as
the point directly right of it, so the parliamentary outlines visibly nest inside
one another across the two panels. If each map were fitted independently the
cross-highlight would still work but the reader could not *see* the relationship,
only be told about it.

Below 60rem the two panels stack, MLAs then MPs. The composition survives; what
is lost is the simultaneity, and that is stated rather than hidden.

---

## TYPOGRAPHY

Unchanged from level 1, and deliberately so — this is the same publication.

- **State name** — Newsreader, the page's largest type. It is the subject.
- **Tier labels** (`MLAs · 403` / `MPs · 80`) — IBM Plex Mono, uppercase, tracked,
  the same `.lbl` treatment used for the eyebrow on level 1.
- **All figures** — Plex Mono, tabular. Same table treatment as the level-1 card,
  including the alignment rule: the party column is the only non-numeric one, so
  it is the only one left-aligned; everything else right-aligns on the ones place.

---

## COLOR

**No new colour.** The party registry is the palette, exactly as on level 1, and
there is still no accent — every hue on the page belongs to a party.

The one addition is carry-over, not invention: the level-1 **focus and context**
mechanism (a paper wash over everything but the focus, and a cast shadow lifting
it) is reused here. Same values, same easing. A reader arriving from level 1
should recognise the behaviour immediately; a second, different emphasis language
for the same atlas would be a system failure, not a feature.

---

## THE SIGNATURE — the cross-highlight

**The two panels are wired to each other, and the relationship runs both ways.**

- Point at an **assembly segment** → it lifts; on the other map its
  parliamentary seat lifts, and the rest of that map washes back.
- Point at a **parliamentary seat** → it lifts; on the other map **every
  assembly segment that composes it** lifts, and the rest wash back.

The second direction is the one that earns the page. "This Lok Sabha seat is
these assembly segments" is a fact about Indian elections that almost no
visualisation shows at hover, and it is only legible because both maps share a
projection — the lit segments are visibly a contiguous block sitting inside the
lit parliamentary outline.

**This is the thing a reader will remember**, and it exists because the data
genuinely has this structure: every parliamentary constituency is a fixed bundle
of assembly segments, and we hold that mapping.

---

## DENSITY / INTERACTION / RESPONSIVE

**States to design, all of them:**

| state | what it is |
| --- | --- |
| default | nothing selected; both maps at rest |
| hover / focus | a segment or a seat lifts, its counterpart answers |
| selected | a click holds the pairing so the tables can be read against it |
| empty | **a state whose assembly boundaries are not current** — see below |
| loading | a state's geometry and results being fetched |
| error | a year or a state with no result file |

**The empty state is not hypothetical and must be designed, not stubbed.** The
assembly boundary source validates for only part of the country; for the rest the
MLA panel must say so plainly and show nothing it cannot stand behind. A
greyed-out fake map would be worse than an empty panel.

**Responsive.** Desktop is two panels side by side, and the cross-highlight is
simultaneous. Narrow, they stack, both keep their tables, and the cross-highlight
spans a scroll — weaker, but still present, because the counterpart panel moves
its focus state whether or not it is visible.

---

## MOTION

**Inherited, not new.** The level-1 durations and easing, unchanged: 0.24s on the
wash and the lift, 0.16s on the stroke. Nothing animates on load. Keyboard focus
gets the same treatment as hover. `prefers-reduced-motion` makes every transition
instant.

A second motion language here would read as a different product. The restraint is
the point.

---

## IMAGERY

**none.** Same reason as level 1: the map is drawn from geometry, which is data.
A photograph of a state would be decoration on a page whose job is measurement.

---

## GATES BEFORE DELIVERY

- **No invented geography.** If a state's assembly boundaries do not validate
  against its current assembly size, its MLA panel does not render a map.
- **The nesting must be real.** The AC→PC mapping shown must come from the data,
  never inferred from proximity. A segment lights the seat it is *declared* to
  belong to.
- **Published results only.** Assembly results are the Commission's own
  figures (`provenance: "published"`); a cycle not yet harvested shows that its
  data is not available yet, never placeholder numbers.
- Rendered at 1440 and 390 and critiqued before this is called done.
