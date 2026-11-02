# Election Atlas

A data-driven map of India's elected representatives, from India to state to MP or MLA, built only from published government sources. It is served at
[akshayprabhakant.com/elections/india](https://akshayprabhakant.com/elections/india/)
by this repository's Worker.
The Worker answers the old address, `/work/election-atlas/*`, with a permanent redirect (308)
to the same path under `/elections/india/`, and the bare `/elections` and `/elections/` with
a permanent redirect to `/elections/india/`, query kept in both.

This repository started from a single commit of that site's `work/election-atlas` tree
(`backend/atlas-source.json` names the commit), carrying published data only: no
history, no bill PDFs and no stored portraits. `CONTEXT.md` defines the terms used here.

## Layout

| path | what |
|---|---|
| `frontend/` | the pages: Next.js 15 + React 19 + TypeScript, a static export with basePath `/elections/india` (national, `state/`, `mp/`, `mla/`), built the way the other apps on the site build theirs |
| `data/` | data the pages read that is not in D1: geometry, regions, parties, MPLADS, Sansad records, member directory, bill indexes, `manifest.json`, `availability.json` |
| `tools/` | the harvesters and the provenance gate (`tools/README.md`) |
| `backend/` | the Cloudflare Worker, its D1 schema, import and export, and the deploy checks |
| `.design/` | design notes (not published) |

## Where the data lives

- **D1 `election-atlas` is the system of record for results and councils of ministers.** `backend/migrations/0001_init.sql` is the schema. Every fact row is `provenance = 'published'` by a CHECK constraint and names a `source` row: an allow-listed government publisher, an https URL, the sha256 of the fetched file and when it was fetched.
- **The JSON under `data/results/` and `data/cabinet/` is a build artifact.** The deploy exports it from D1 (`backend/d1/export.py`) at the same paths and in the same shape the pages have always read.
- **Import inputs.** The import reads the data of the pinned github.io commit, except where `backend/d1/inputs/` holds a file at the same path. That covers the Lok Sabha 1980–2004 state files, rebuilt from the ECI reports after the move (`backend/d1/inputs/README.md`).
- **`data/members/ls/2024.json` stays committed and is not in D1.** Its source block names the Sansad directory without a sha256, so it passes `check_provenance.py` but not `validate_records.py` until it is re-harvested.
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
| `ci.yml` | pull request, push | gate tests, Worker tests, the full JSON → D1 → JSON round trip in a local SQLite, and the frontend (type-checked build, library tests, export contract, browser smoke over the assembled site); no Cloudflare access |
| `r2-upload.yml` | manual | uploads every manifest-listed PDF of the pinned commit to R2, verifying sha256 before and after |
| `d1-import.yml` | manual, `day` = 1 or 2 | applies migrations, then imports one day (1: assembly, cabinets, by-elections; 2: Lok Sabha), printing D1's rows written; the free plan allows 100,000 a day |
| `deploy.yml` | manual | builds the frontend, exports D1, diffs it against the committed JSON, runs the gate, deploys the Worker, and smoke-tests the preview (including the old address's redirect) |

The Worker config (`backend/wrangler.jsonc`) carries **no routes**, and CI and the deploy refuse one that does (`backend/check_no_routes.py`). The owner's approved routes (`akshayprabhakant.com/elections`, `/elections/*`, `/work/election-atlas` and `/work/election-atlas/*`) are attached outside this config, in a step of their own.

`backend/check_urls.py` replays the URL inventory (`.atlas-cutover/url-inventory.tsv` in the github.io repository) against any host: every old URL must redirect to its `/elections/india/` twin, which must then serve what it served before.

## Local checks

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
python3 -m unittest discover -s backend/d1 -p 'test_*.py'
node --test backend/src/test_index.mjs
python3 tools/check_provenance.py data

# the frontend (Node 22)
npm --prefix frontend ci
npm --prefix frontend run build            # type-checks; static export in frontend/out
npm --prefix frontend run test:export
python3 backend/build_site.py --out dist --data-from <exported data dir>
cp -R <exported data dir>/. data/           # the library tests read the exported results
npm --prefix frontend run test:lib
CHROME_PATH=<chrome binary> npm --prefix frontend run test:smoke   # serves dist/
```

Changes reach `main` through pull requests.
