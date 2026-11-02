# 0001 — Six states publish no downloadable bill document

**Status:** open
**Area:** state-legislation / bills
**Found:** 2026-09-23, while harvesting the latest ten documents per state
**Blocks:** the MLA bill page for these six states has no primary source to serve

## What

The harvester commits the latest ten bill documents per state. Twenty-five of
thirty-one states yield documents. These six yield none — and in every case the
cause is the **source**, not the harvester: the index is reachable, it simply
carries no downloadable document. Counts below are from the run of 2026-09-23.

| State | index rows | docs attempted | why there are none |
|---|---|---|---|
| Gujarat (GJ) | 14 | 0 | every "Document" link in the NeVA register is **404**; the register carries metadata only |
| Himachal Pradesh (HP) | 201 | 0 | metadata only — **0 document links exist at all**; titles are blank on 198 of 201 |
| Uttar Pradesh (UP) | 0 | 0 | the Liferay bill search is **portlet-stateful**, so no row is retrievable by replay |
| Jammu and Kashmir (JK) | 1 | 1 | the NeVA register is a broken shell (filter exists, zero records); the one reachable link fails |
| Nagaland (NL) | 25 | 10 | all 10 attempted links **404**; the rows are seeded with `test bill` / `Bill Demo` / "This is a sample Bill" |
| Puducherry (PY) | 5 | 5 | all 5 "As Introduced" PDFs **404**; row 1 is literally `Sample` |

GJ, HP and UP produce no `doc_links` at all, so nothing was even attempted.
JK, NL and PY produce links that were attempted and failed.

## Why it matters

A state with no bill PDF cannot back its MLA bill page with a primary official
source. Per the project rule, a **documented gap is a finding, not a blank** —
so this is recorded rather than silently omitted, and the page must not imply a
document exists where none does.

## Possible routes (not yet verified)

- **Gujarat** — bill text from the official e-Gazette (`egazette.gujarat.gov.in`),
  with PRS as a convenience mirror only.
- **Himachal Pradesh** — no document source identified; the NeVA dashboard has no links.
- **Uttar Pradesh** — PRS (258 bills) is the usable tier.
- **Jammu and Kashmir** — no working official register found.
- **Nagaland** — PRS as a fallback; the official rows are test data.
- **Puducherry** — PRS as a fallback; the official rows are test/sample data.

Any route adopted here still needs the same verification the other states got
before it can be called a working source.

## References

- `data/mla/SOURCE-REGISTRY.md` — the Bills section's per-state status column and detail blocks
- `data/mla/SOURCES.md` — the frozen recon evidence (never edited)
- `tools/state-legislation/harvest-bills/` — the harvester that produced these counts
