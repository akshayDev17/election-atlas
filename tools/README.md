# tools

Build scripts for the election atlas.
Run from the repository root (paths below are relative to it).

## Setup

- Python dependencies are pinned in `requirements.txt`:
  `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`,
  then run the scripts with `.venv/bin/python`.

## Published-data harvesters

Every file these write carries `"provenance": "published"` and a `source`
(`publisher`, `url`, `sha256`, `fetched_at`) for each file it was read from.
Downloads are kept in `_research/harvest/` (gitignored; move it with `--cache`),
and each harvester runs `validate_records.py` over its output before writing.
Each stops with an error on a source shape it does not expect.

| script | writes | source |
| --- | --- | --- |
| `harvest-ac-results.py` | `data/results/ac/{STATE}/{cycle}.json` + `-detail.json` | ECI statistical reports, table 10 (cross-checked against tables 5 and 9) |
| `harvest-ls-byel.py` | `data/results/ls/byel/{2014,2019,2024}.json` | ECI by-election index cards |
| `harvest-union-cabinet.py` | `data/cabinet/union/{2014,2024}.json` and `{2014,2024}-sworn-in.json` | President's Secretariat releases, PM India, PIB (2024 `changes`), Sansad |
| `harvest-up-cabinet.py` | `data/cabinet/state/IN-UP/2022.json` | Chief Minister's Office, Uttar Pradesh |

- run: `.venv/bin/python tools/harvest-ac-results.py` (each takes `--dry-run`)
- `validate_records.py`: the per-record gate each harvester runs before writing
  (`check_provenance.py` below is the repository-wide gate CI runs). `python3 tools/validate_records.py
  [--cache DIR] <files or dirs>` exits non-zero and lists every record that is not
  published, names a publisher or host off the allow-list, has a sha256 that does
  not match the cached source, or has synthetic/dummy wording in its metadata.
  `python3 tools/test_validate_records.py` shows it failing on such records.
  Without `--cache` it checks sha256 against `_research/harvest/` when that exists,
  and prints `sha256 NOT checked` for any source that cache does not hold (or when
  there is no cache); with `--cache` every source must be in it.
- `python3 tools/test_harvest_ac_results.py` and `python3 tools/test_harvest_ls_byel.py`:
  party codes, assembly colour entries (winner plus other parties' votes), and
  by-election term assembly.
- `python3 tools/test_ls_legacy_results.py`: the 1980-2004 Lok Sabha state files put
  Delhi and Goa, Daman & Diu in their own regions, read a winner whose long name runs
  into the party column (Dhenkanal 1991, INC), and count Srinagar's unopposed return
  (1980 and 1989, JKN) with its report page.
- the pages' own tests live with the frontend (`frontend/lib/*.test.ts`, run with
  `npm --prefix frontend run test:lib`): the "as it stands" seat tally adds up to each
  state's seat count, a hover card shows only the hovered seat (including an AC listed
  in a file's `no_result`), and members are initials on the party colour plus a "View
  official photo on sansad.in" link built from the Sansad member number.
- `python3 tools/test_no_stored_portraits.py`: no portrait files under `data/photos/ls`
  or `data/photos/cabinet`, no `photos` key in `data/availability.json`, no `photo`
  field on any cabinet member, and an integer `mpsno` (and no image field) for every
  2024 Lok Sabha seat.
- `python3 tools/test_harvest_union_cabinet.py`: sworn-in ministers take party, seat
  and Sansad id from the as-it-stands roster only by exact name or an explicit alias;
  join-sansad joins only by exact name or alias; and every `mpsno` on both 2024
  rosters is that minister's own seat in `data/members/ls/2024.json`, with the same
  state and constituency.

## Succession

1. `build-ls-results.py`
   - builds Lok Sabha result files
2. `eci_pdf.py`
   - PDF fallback, auto-invoked by the above
3. `fetch-cabinet.py`
   - fetches the Union Council of Ministers
4. `join-sansad.py`
   - enriches the cabinet with party / state / constituency / Sansad member number
5. `build-availability.py`
   - rewrites `data/availability.json` after any data file is added or removed
6. `check_provenance.py`
   - the provenance gate; must pass before anything is published

## Scripts

### build-ls-results.py

- source: ECI Statistical Reports (retrieved into `_research/eci/`, gitignored)
  - `https://www.eci.gov.in/`
  - `https://results.eci.gov.in/`
- output: `data/results/ls/pc/{year}.json` + state files
- run: `python3 tools/build-ls-results.py --year 2024`
- verify: `python3 tools/build-ls-results.py --year 2024 --check`
- pre-2008 years (1980–2004, state level only): the script downloads each year's
  report and the three party lists it reads into `_research/harvest/` and records
  each file's `url`, `sha256` and `fetched_at` in the state file's `source` /
  `sources`, so `validate_records.py` passes for them
  - `--check` downloads nothing: it reads those inputs from `_research/eci/` and stops,
    naming the file, if one is not there
  - a seat the report records as returned unopposed (its one candidate, no votes)
    still counts, and the region lists it under `unopposed` with the report's PDF page

### build-ls-detail.py

- source: ECI table 33 (constituency-wise detailed result), cached as for `build-ls-results.py`
- output: `data/results/ls/detail/{year}.json`
- run: `python3 tools/build-ls-detail.py . 2024 data/results/ls/detail/2024.json`

### eci_pdf.py

- recovers a constituency × candidate table from an ECI PDF
- used by `build-ls-results.py` for years with no XLS (e.g. 2009, 2014)
- not run directly

### fetch-cabinet.py

- source: PM India portfolios + PIB communiqués
  - `https://www.pmindia.gov.in/en/news_updates/portfolios-of-the-union-council-of-ministers-2/`
  - `https://www.pib.gov.in/PressReleasePage.aspx` (reshuffles)
- output: name / rank / portfolio + `changes` (reshuffles)
- run: `python3 tools/fetch-cabinet.py --cycle 2024 --out data/cabinet/union/2024.json`
- reshuffles: `--communique <pib-url>` (repeatable)
- preview: `--dry-run`

### join-sansad.py

- source: Parliament of India member directory
  - Lok Sabha: `https://sansad.in/api_ls/member`
  - Rajya Sabha: `https://sansad.in/api_rs/member/in-council-of-ministers`
- adds: party, state, constituency, and `mpsno` (Lok Sabha) or `house: "rs"` (Rajya Sabha);
  no portrait is downloaded
- matches a minister only by exact name or an entry in its `ALIASES`; a minister
  matched neither way is printed and left without state, constituency or id (no
  sansad.in link), keeping only a party already on its own record
- run: `python3 tools/join-sansad.py --cycle 2024 --in <fetched.json> --out <enriched.json>`
- options: `--dry-run`

### build-availability.py

- writes `data/availability.json`: which optional files exist (by-elections,
  cabinet rosters per tense, assembly cycles per state, Sansad records, MPLADS
  files, the Lok Sabha member record, and which Lok Sabha years have the
  constituency-level or only the state-level result), so the pages show "not
  available yet" instead of probing
- reads years from `manifest.elections.ls.years` and assembly cycles from
  `manifest.elections.ac.cycles`
- run: `python3 tools/build-availability.py`
- verify: `python3 tools/build-availability.py --check` (CI runs this)

### check_provenance.py

- fails if anything but published data is in `data/`:
  - every `results/**`, `cabinet/**` and `members/**` file must carry `"provenance": "published"`
    and an https source URL on a government publisher's host
  - no metadata field (`note*`, `source*`, `_note`, `caveat`, `provenance`)
    may say synthetic, dummy, invented, placeholder, fake or mock
  - the four pages (the frontend export's HTML and its `_next/static` chunks) and
    `manifest.json` never say "synthetic"
  - the removed dummy files never come back, by path or by bytes
- run: `python3 tools/check_provenance.py data` (add `--db <SQLite copy of D1>` to check D1 too)
- negative tests: `python3 -m unittest discover -s tools -p 'test_*.py'`
- CI: `.github/workflows/ci.yml` on every pull request and push to main, and
  `deploy.yml` (dispatched by hand, or called by `ci.yml` after a passing push to
  main) over the D1 export and D1 itself before every deploy

## Data file conventions

- each tense of a council of ministers is its own file: `{cycle}.json` is the
  council as it stands, `{cycle}-sworn-in.json` the council as sworn in
- a state council is keyed by the state's assembly cycle, not a Lok Sabha year
- an assembly cycle needs both `results/ac/{S}/{cycle}.json` and
  `{cycle}-detail.json` before the pages draw it

## Notes

- fetches use `curl` (this machine's Python SSL bundle is broken)
- cabinet artifacts land in `data/cabinet/union/`
- party colours + symbol images have no `.gov.in` source; symbol names only:
  - `https://www.eci.gov.in/eci-backend/public/api/list-of-political-party`
  - `https://www.eci.gov.in/eci-backend/public/api/recognition-derecognition`
