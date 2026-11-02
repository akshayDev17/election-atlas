# Direction — Search (party / minister) + party symbols

PRODUCT — Election Atlas of India, level 1. A data page: 543-constituency map shaded by winner,
a national party table, a horizontal council-of-ministers belt. Single-screen, height-bound, no
forced vertical scroll (`--map-spill:1`), width maximised.

USER / PRIMARY GOAL — a reader who wants to find one thing fast: "where did X party win?" and
"who is the railways minister?". Find is a query, not a mode.

## The two searches
1. **Find party** — narrows the national table to matching rows AND dims every seat on the map
   that is not one of the matching parties. Text-driven recede-to-find, the same idiom the page
   already uses for hover.
2. **Find minister** — spotlights matching cabinet cards and lets the rest fall back. The belt
   keeps its shape (dim, not hide) so a match is seen among its peers.

## Design language decisions
- Search is a **fill-in line**, not a toggle. The masthead already has a mode cluster (year /
  tense, tab-underline idiom). Search gets its own row so query never reads as mode.
- Same underline idiom as the year tabs: `border-bottom:1px solid var(--rule-2)`, active edge
  `--ink`. **No accent colour** — every saturated hue is a party; the active edge is --ink, the
  same colour as the selection leading edge and the state outlines.
- Mono throughout (IBM Plex Mono), labels 9px uppercase, input 13px, count 10px. Quiet data
  instruments, no placeholder theatrics.
- Dim is opacity (`.belt-card.dim{opacity:.28}`), not a new colour — consistent with the map's
  scrim philosophy. `prefers-reduced-motion` drops the transition.
- Mobile (≤56rem): minister search hidden, because the belt is hidden there and a dead input is
  worse than none. Party search stays (the table still renders).

## Party symbol (cabinet, not map/table)
- The cabinet's per-card party indicator switches from a 9px colour square to the party's
  symbol image when one is on file, falling back to the colour square. Symbols live in
  `data/photos/parties/` with a `data/parties-symbols.json` manifest (code → file + license).
- Map and table keep colour — colour is the map's whole channel; the symbol is a cabinet-only
  identification aid. A party with no symbol keeps its swatch.

## Signature
The two searches are the same gesture wearing two faces: a fill-in line that makes everything
else recede and leaves only what you asked for, in a page that otherwise never scrolls.
