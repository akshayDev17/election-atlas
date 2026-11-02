# Election Atlas

A data-driven map of India's elected representatives — India → state → MP/MLA — backed by official government sources. This context covers the Atlas site and the Harvester that feeds it.

## Language

**Atlas**:
The site that renders election data into pages (India, state, and one representative each).
_Avoid_: the app, the website, the frontend

**Harvester**:
The scheduled job that polls official government sources and emits structured data files the Atlas reads.
_Avoid_: the engine, the scraper, the fetcher, the sync job, the pipeline

**Bill record**:
One legislative bill's structured data — title, sponsor, type, status, date, source URL, and the sha256 of its source PDF.
_Avoid_: bill entry, bill row

**Sponsor**:
The MLA who introduced a bill — a Minister for a government bill, a non-Minister for a private member's bill. Always an MLA; never the Governor.
_Avoid_: originator, introducer, author

**Government bill**:
A bill introduced by a Minister.
_Avoid_: official bill

**Private member's bill**:
A bill introduced by an MLA who is not a Minister.
_Avoid_: non-official bill, PMB

**Checkpoint index**:
A per-state record of bills already seen, keyed by bill id with each source PDF's sha256, used to detect new or changed bills between runs.
_Avoid_: manifest, cache

**Money Bill**:
A bill on a tax/money subject (Article 199) that cannot be introduced without the Governor's prior recommendation — which is why some bill PDFs open with a recommendation letter.
_Avoid_: financial bill

**Source registry**:
The hand-maintained map of which source works for each section per state/UT — the conclusion, as opposed to the `SOURCES.md` investigation report.
_Avoid_: conclusion report, working-sources
