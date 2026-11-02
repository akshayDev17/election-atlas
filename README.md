# Election Atlas

A data-driven map of India's elected representatives, from India to state to MP or MLA, built only from published government sources. It is served at
[akshayprabhakant.com/work/election-atlas](https://akshayprabhakant.com/work/election-atlas/)
(GitHub Pages, from `akshayDev17/akshayDev17.github.io`, until this repository's Worker is routed there).

This repository started from a single commit of that site's `work/election-atlas` tree
(`backend/atlas-source.json` names the commit), carrying published data only: no
history, no bill PDFs and no stored portraits. `CONTEXT.md` defines the terms used here.

## Layout

| path | what |
|---|---|
| `index.html`, `state/`, `mp/`, `mla/`, `lib/`, `vendor/` | the pages; every data fetch is relative, so they work under any mount path |
| `data/` | data the pages read that is not in D1: geometry, regions, parties, MPLADS, Sansad records, member directory, bill indexes, `manifest.json`, `availability.json` |
| `tools/` | the harvesters and the provenance gate (`tools/README.md`) |
| `backend/` | the Cloudflare Worker, its D1 schema, import and export, and the deploy checks |
| `.design/` | design notes (not published) |

## Where the data lives

- **D1 `election-atlas` is the system of record for results and councils of ministers.** `backend/migrations/0001_init.sql` is the schema. Every fact row is `provenance = 'published'` by a CHECK constraint and names a `source` row: an allow-listed government publisher, an https URL, the sha256 of the fetched file and when it was fetched.
- **The JSON under `data/results/` and `data/cabinet/` is a build artifact.** The deploy exports it from D1 (`backend/d1/export.py`) at the same paths and in the same shape the pages have always read.
- **Some files stay committed and are not in D1** (`python3 backend/d1/ingest.py --data <dir> --list-static`):
  - The Lok Sabha state files for 1980 to 2004 (`data/results/ls/{1980,…,2004}.json`). Their Election Commission sources are recorded in `backend/d1/ls-sources.json`, but the current builder does not reproduce them: their committed seat counts predate a fix to its winner rule, which moves 2 to 8 seats a year from IND to the real winner.
  - `data/members/ls/2024.json`, whose source block names the Sansad directory without a sha256.

  These files pass `check_provenance.py`. They cannot pass `validate_records.py` until they are re-harvested.
- **The state bill PDFs live in the R2 bucket `election-atlas-docs`.** They are stored under their atlas-relative path, and the Worker streams them with Range support at their old URLs. Each bill manifest (`data/state-legislation/IN-XX/bills/manifest.json`) records the source URL, sha256, size and fetch time of every PDF.

## The provenance gate

Nothing but published data reaches D1, the exported files or the site:

1. `tools/validate_records.py` runs over every record inside `backend/d1/ingest.py` before any SQL is written.
2. D1's CHECK constraints refuse any other provenance, a missing source, a publisher off the allow-list, a URL that is not https, or a missing sha256.
3. `tools/check_provenance.py <data> --db <D1 copy>` runs over the export and over D1 before every deploy.
4. CI runs the negative tests on every pull request: planted synthetic or dummy data must fail each check.

## Workflows (GitHub Actions, `production` environment)

| workflow | trigger | does |
|---|---|---|
| `ci.yml` | pull request, push | gate tests, Worker tests, and the full JSON → D1 → JSON round trip in a local SQLite; no Cloudflare access |
| `r2-upload.yml` | manual | uploads every manifest-listed PDF of the pinned commit to R2, verifying sha256 before and after |
| `d1-import.yml` | manual, `day` = 1 or 2 | applies migrations, then imports one day (1: assembly, cabinets, by-elections; 2: Lok Sabha), printing D1's rows written; the free plan allows 100,000 a day |
| `deploy.yml` | manual | exports D1, diffs it against the committed JSON, runs the gate, deploys the Worker, and smoke-tests the preview |

The Worker config (`backend/wrangler.jsonc`) carries **no routes**, and CI and the deploy refuse one that does (`backend/check_no_routes.py`). Until the owner approves routing `akshayprabhakant.com/work/election-atlas` to it, the Worker answers only on its workers.dev preview URL.

`backend/check_urls.py` replays the URL inventory (`.atlas-cutover/url-inventory.tsv` in the github.io repository) against any host.

## Local checks

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
python3 -m unittest discover -s backend/d1 -p 'test_*.py'
node --test backend/src/test_index.mjs
python3 tools/check_provenance.py data
```

Changes reach `main` through pull requests.
