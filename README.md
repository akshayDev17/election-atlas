# Election Atlas

A data-driven map of India's elected representatives, from India to state to MP or MLA, built only from published government sources. It is served at
[akshayprabhakant.com/elections/india](https://akshayprabhakant.com/elections/india/)
by this repository's Worker.
The Worker answers the old address, `/work/election-atlas/*`, with a permanent redirect (308)
to the same path under `/elections/india/`, query kept.

The same Worker serves the country list at
[akshayprabhakant.com/elections](https://akshayprabhakant.com/elections/): one card per
country with its latest national result, A to Z, ten to a page with the page in the address
(`/elections/?page=3`), and a search that runs on the device over one small index of every
country. **Which countries it lists comes from D1, not from a hand-kept list**
(`backend/d1/countries.py`): a nation whose published national result D1 holds, and whose
country page (`/elections/<slug>/`) the site has. Today that is India. Each card's picture is
the country's result map where the atlas publishes seat boundaries (India), and otherwise its
outline (Natural Earth, public domain) filled with its flag (flag-icons, MIT), both generated
at build time as WebP (`frontend/landing/`). The page self-hosts one Newsreader subset that
covers Latin Extended-A, so an accented name never pulls a second font file.

The shared site theme comes from site-shell (`akshayDev17/site-themes`, `shell/`). The Worker binds
it as `SHELL` and passes each of the five pages' HTML (the four atlas pages and the country list)
through its `compose()`, which adds the theme's boot script and tokens right after
`<meta charset>`, and fills the `<site-slot name="site-path">` at the top of each page's masthead
(`frontend/components/SitePath.tsx`, and the country list's header) with the site path: the row of
the site's apps, with Election Atlas current and linked to the country list, then on its own line
the page's trail (Election Atlas › India › state › seat; none on the country list, the atlas's
root). The page's own heading sits under both. A page's HTML is one file for every query, so the
Worker first writes the crumbs for the request's query into the slot, named from the same data
files the page reads (`backend/src/sitepath.js`). The page loads site-shell's own files (its picker
script) from `akshayprabhakant.com/_site/*`, which is routed to site-shell, not to this Worker. It
fails open: with site-shell missing, unreachable or throwing, the page is served exactly as built,
its slot showing the page's own back link, and the `:where(:root)` Classic Light block
(`frontend/app/site-fallback.css`) keeps every shared token defined. The frontend bundles no theme
code: each header renders a plain `<site-theme-picker hide-label>`, which site-shell's script
defines. So `next dev`, which has no Worker in front of it, shows Classic Light from the fallback
block and no picker. For theme work, use the harness in `frontend/shell-contract/` and the browser
smoke with `SITE_THEMES_DIR` (below): they serve `dist/` through this Worker and the real
site-shell, with `/_site/*` answered from site-shell's files as the zone route does. **Deploy
order:** site-shell must exist before this Worker is deployed with the binding, or
`wrangler deploy` refuses.

This repository started from a single commit of that site's `work/election-atlas` tree
(`backend/atlas-source.json` names the commit), carrying published data only: no
history, no bill PDFs and no stored portraits. `CONTEXT.md` defines the terms used here.

## Layout

| path | what |
|---|---|
| `frontend/` | the pages: Next.js 15 + React 19 + TypeScript, a static export with basePath `/elections/india` (national, `state/`, `mp/`, `mla/`), built the way the other apps on the site build theirs |
| `frontend/landing/` | the `/elections` country list: its renderer, card pictures, outlines (`outlines.json`, keyed by ISO code), search aliases and font; `backend/build_site.py --db` runs it over the countries `backend/d1/countries.py` derives from D1 |
| `data/` | data the pages read that is not in D1: geometry, regions, parties, MPLADS, Sansad records, member directory, bill indexes, `manifest.json`, `availability.json` |
| `countries/IN/` | everything India-specific: `sources.json` (the publisher registry and each election's source and cross-check), `harvest/` (the harvesters, `countries/IN/harvest/README.md`), `inputs/` (import inputs) and `tests/` |
| `harvest/` | country-neutral harvest code: fetch-and-hash plumbing, the registry reader and the per-record gate `harvest/validate.py` |
| `tools/` | the repo-wide gates and builders: the provenance gate and its negative tests, `build-availability.py` (`tools/README.md`) |
| `backend/` | the Cloudflare Worker, its D1 schema, import and export, and the deploy checks |
| `.design/` | design notes (not published) |

## Where the data lives

- **D1 `election-atlas` is the system of record for results and councils of ministers.** `backend/migrations/0001_init.sql` is the schema. Every fact row is `provenance = 'published'` by a CHECK constraint and names a `source` row: an allow-listed government publisher, an https URL, the sha256 of the fetched file and when it was fetched.
- **The JSON under `data/results/` and `data/cabinet/` is a build artifact.** The deploy exports it from D1 (`backend/d1/export.py`) at the same paths and in the same shape the pages have always read.
- **Import inputs.** The import reads the data of the pinned github.io commit, except where `countries/IN/inputs/` holds a file at the same path. That covers the Lok Sabha 1980–2004 state files, rebuilt from the ECI reports after the move (`countries/IN/inputs/README.md`).
- **A nation's V-Dem regime tier is frontend config, not data the pages fetch.** `frontend/lib/regime.ts` holds each nation's Regimes of the World tier (V-Dem v16, 2026; data year 2025, as Our World in Data publishes it) and V-Dem's four tier definitions, for the pill on each country's card on `/elections` and the dialog behind it (the country list's renderer reads that module by the card's ISO code, so `build_site.py` runs it under node's type stripping; the nation page itself shows no pill). It is neither in D1 nor under `data/`: the provenance gate is for government-published election facts, and a V-Dem rating is a research classification with its own source, cited in that file.
- **`data/members/ls/2024.json` stays committed and is not in D1.** Its source block names the Sansad directory without a sha256, so it passes `check_provenance.py` but not `harvest/validate.py` until it is re-harvested.
- **The state bill PDFs live in the R2 bucket `election-atlas-docs`.** They are stored under their atlas-relative path, and the Worker streams them with Range support at their old URLs. Each bill manifest (`data/state-legislation/IN-XX/bills/manifest.json`) records the source URL, sha256, size and fetch time of every PDF.

## The provenance gate

Nothing but published data reaches D1, the exported files or the site:

1. `harvest/validate.py` runs over every record inside `backend/d1/ingest.py` before any SQL is written.
2. D1's CHECK constraints refuse any other provenance, a missing source, a publisher off the allow-list, a URL that is not https, or a missing sha256.
3. `tools/check_provenance.py <data> --db <D1 copy>` runs over the export and over D1 before every deploy, and fails if D1's publisher allow-list differs from the registry.
4. CI runs the negative tests on every pull request: planted synthetic or dummy data must fail each check.

The publisher allow-list lives in one place, `countries/<CC>/sources.json` (today `countries/IN/sources.json`), which both gates read; its fields and how each gate matches a host are in `tools/README.md`. Adding a publisher is an edit there plus a migration, never an edit to a gate.

## Workflows (GitHub Actions, `production` environment)

| workflow | trigger | does |
|---|---|---|
| `ci.yml` | pull request, push | gate tests, Worker tests, the full JSON → D1 → JSON round trip in a local SQLite, the frontend (type-checked build, library tests, export contract, the country list built from that D1 and its tests, browser smoke over the assembled site), and the Worker with `akshayDev17/site-themes` `main`'s site-shell in local `wrangler dev` (the contract, then the browser smoke again through it); the tests need no Cloudflare access, and a push to main that passes them calls `deploy.yml` below |
| `r2-upload.yml` | manual | uploads every manifest-listed PDF of the pinned commit to R2, verifying sha256 before and after |
| `d1-import.yml` | manual, `day` = 1 or 2 | applies migrations, then imports one day (1: assembly, cabinets, by-elections; 2: Lok Sabha), printing D1's rows written; the free plan allows 100,000 a day |
| `deploy.yml` | manual, and automatically after a passing push to main | builds the frontend, exports D1, diffs it against the committed JSON, derives the country list from that D1, runs the gate, deploys the Worker, and smoke-tests the preview (including the old address's redirect, the country list, and that every page is composed by site-shell) |

The Worker config (`backend/wrangler.jsonc`) carries **no routes**, and CI and the deploy refuse one that does (`backend/check_no_routes.py`). The owner's approved routes (`akshayprabhakant.com/elections`, `/elections/*`, `/work/election-atlas` and `/work/election-atlas/*`) are attached outside this config, in a step of their own.

`backend/check_urls.py` replays the URL inventory (`.atlas-cutover/url-inventory.tsv` in the github.io repository) against any host: every old URL must redirect to its `/elections/india/` twin, which must then serve what it served before.

## Local checks

```sh
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
python3 -m unittest discover -s backend/d1 -p 'test_*.py'
node --experimental-strip-types --test backend/src/test_index.mjs
python3 tools/check_provenance.py data

# the frontend (Node 22)
npm --prefix frontend ci
npm --prefix frontend run build            # type-checks; static export in frontend/out
npm --prefix frontend run test:export
python3 backend/build_site.py --out dist --data-from <exported data dir> --db <D1 copy>
npm --prefix frontend run test:landing     # the /elections country list, then the built one in dist/
cp -R <exported data dir>/. data/           # the library tests read the exported results
npm --prefix frontend run test:lib
CHROME_PATH=<chrome binary> npm --prefix frontend run test:smoke   # serves dist/

# the Worker with the real site-shell, in local workerd (no account), over dist/
SITE_THEMES_DIR=<site-themes checkout> npm --prefix frontend run test:shell
SITE_THEMES_DIR=<site-themes checkout> CHROME_PATH=<chrome binary> npm --prefix frontend run test:smoke
```

Changes reach `main` through pull requests.
