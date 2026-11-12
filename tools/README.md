# tools

The repository-wide gates and builders. Run from the repository root (paths
below are relative to it). A country's own harvesters live under
`countries/<CC>/harvest/`; India's are documented in
`countries/IN/harvest/README.md`.

## Setup

- Python dependencies are pinned in `requirements.txt`:
  `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`,
  then run the scripts with `.venv/bin/python`.

## The source registry

`countries/<CC>/sources.json` (today `countries/IN/sources.json`) is the one
allow-list: each publisher's `id`, `hosts`, `licence`, `licence_url` and
`licence_checked`, and per election the official table its harvester reads and
the second table it cross-checks before writing. `harvest/registry.py` reads
every country's file. `harvest/validate.py` passes a source URL whose host is
one of its publisher's hosts or a subdomain of one; `check_provenance.py` drops a
leading `www.` and requires the host to be exactly a registered host. Adding a publisher is an edit there plus a migration that
mirrors it into D1, never an edit to a gate. `python3 -m unittest tools/test_registry.py`
checks the registry's shape and that both gates read it.

## The two gates

- `harvest/validate.py`: the per-record gate every harvester runs before writing
  and `backend/d1/ingest.py` runs before any SQL is written.
  `python3 harvest/validate.py [--cache DIR] <files or dirs>` exits non-zero and
  lists every record that is not published, names a publisher or host the
  registry does not hold, has a sha256 that does not match the cached source, or
  has synthetic/dummy wording in its metadata. `python3 tools/test_validate_records.py`
  shows it failing on such records. Without `--cache` it checks sha256 against
  `_research/harvest/` when that exists, and prints `sha256 NOT checked` for any
  source that cache does not hold (or when there is no cache); with `--cache`
  every source must be in it.
- `check_provenance.py`: the repository-wide gate CI runs. It fails if anything
  but published data is in `data/`:
  - every `results/**`, `cabinet/**` and `members/**` file must carry `"provenance": "published"`
    and an https source URL on a registered publisher's host
  - no metadata field (`note*`, `source*`, `_note`, `caveat`, `provenance`)
    may say synthetic, dummy, invented, placeholder, fake or mock
  - the four pages (the frontend export's HTML and its `_next/static` chunks) and
    `manifest.json` never say "synthetic"
  - the removed dummy files never come back, by path or by bytes
  - with `--db <SQLite copy of D1>`: every fact row is published and names an
    existing source, every source is a registered publisher on one of its https
    hosts with a sha256 and a fetched_at, and D1's own publisher allow-list (the
    `publisher` table once there is one; until then the CHECK on `source.publisher`)
    names exactly the registry's publishers
  - run: `python3 tools/check_provenance.py data` (add `--db <SQLite copy of D1>` to check D1 too)
  - negative tests: `python3 -m unittest discover -s tools -p 'test_*.py'`
  - CI: `.github/workflows/ci.yml` on every pull request and push to main, and
    `deploy.yml` (dispatched by hand, or called by `ci.yml` after a passing push to
    main) over the D1 export and D1 itself before every deploy

## Tests kept here

- `test_check_provenance.py`: each negative case plants one violation in a clean
  fixture tree (and in a D1 built from the migrations) and asserts the gate fails.
- `test_validate_records.py`: the per-record gate failing on each kind of bad record.
- `test_registry.py`: the registry's shape, and that the gates read it.
- `test_no_stored_portraits.py`: no portrait files under `data/photos/ls`
  or `data/photos/cabinet`, no `photos` key in `data/availability.json`, no `photo`
  field on any cabinet member, and an integer `mpsno` (and no image field) for every
  2024 Lok Sabha seat.
- the pages' own tests live with the frontend (`frontend/lib/*.test.ts`, run with
  `npm --prefix frontend run test:lib`); India's harvester tests live in
  `countries/IN/tests/` and run with
  `python3 -m unittest discover -s countries/IN/tests -p 'test_*.py'`.

## build-availability.py

- writes `data/availability.json`: which optional files exist (by-elections,
  cabinet rosters per tense, assembly cycles per state, Sansad records, MPLADS
  files, the Lok Sabha member record, and which Lok Sabha years have the
  constituency-level or only the state-level result), so the pages show "not
  available yet" instead of probing
- reads years from `manifest.elections.ls.years` and assembly cycles from
  `manifest.elections.ac.cycles`
- run: `python3 tools/build-availability.py`
- verify: `python3 tools/build-availability.py --check` (CI runs this over the
  assembled site, from its copy under `dist/elections/india/tools/`)

## Data file conventions

- each tense of a council of ministers is its own file: `{cycle}.json` is the
  council as it stands, `{cycle}-sworn-in.json` the council as sworn in
- a state council is keyed by the state's assembly cycle, not a Lok Sabha year
- an assembly cycle needs both `results/ac/{S}/{cycle}.json` and
  `{cycle}-detail.json` before the pages draw it
