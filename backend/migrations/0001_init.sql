-- election-atlas D1: the published election data behind the atlas.
--
-- The approved draft (pf-home-cf-plan election-atlas-0001_init.sql), revised by the
-- provenance gate of the plan revision §5.1:
--   * every fact carries provenance = 'published' (a CHECK, so a synthetic or dummy
--     row aborts the import) and a source_id that must name a row of `source`;
--   * `source` admits only allow-listed government publishers, an https URL, the
--     sha256 of the file that was fetched, and when it was fetched.
--
-- D1 is the system of record and the JSON the pages read is a build artifact:
-- backend/d1/export.py writes every data file back at its old path and shape from
-- these tables. `document` keeps each file's own header (note, source block,
-- schema, …) so the export reproduces the file exactly; the rows are the facts.
--
-- Counts are absolute; shares are derived at read time. Every "now" is a NULL
-- to_date, so history is never overwritten.
--
-- Row ids are 48-bit hashes of each row's natural key (backend/d1/ingest.py), so an
-- import split over two days can never give one row two ids. D1 enforces foreign
-- keys by default.

-- ── provenance ────────────────────────────────────────────────────────────────

CREATE TABLE source (
  id          INTEGER PRIMARY KEY,
  publisher   TEXT NOT NULL CHECK (publisher IN
                ('eci', 'president-secretariat', 'pmindia', 'pib', 'sansad', 'upcmo', 'mospi-mplads')),
  url         TEXT NOT NULL CHECK (url LIKE 'https://%'),
  sha256      TEXT NOT NULL CHECK (length(sha256) = 64),
  fetched_at  TEXT NOT NULL,
  UNIQUE (url, sha256)
);

-- ── reference ─────────────────────────────────────────────────────────────────

-- 'IN' is the nation (home of the Lok Sabha and the Union ministry); the rest are
-- ISO 3166-2:IN codes exactly as data/regions.json carries them.
CREATE TABLE region (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('nation', 'state', 'ut'))
) WITHOUT ROWID;

-- code = data/parties.json code where the registry covers the party, otherwise the
-- code verbatim as the result file prints it. colour is data, not a theme token.
CREATE TABLE party (
  code        TEXT PRIMARY KEY,
  name        TEXT,
  colour      TEXT,
  in_registry INTEGER NOT NULL DEFAULT 0 CHECK (in_registry IN (0, 1))
) WITHOUT ROWID;

-- 'ls' = Lok Sabha; 'vs:IN-UP' = Uttar Pradesh Vidhan Sabha, and so on.
CREATE TABLE house (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('ls', 'vs')),
  region_code TEXT NOT NULL REFERENCES region(code)
) WITHOUT ROWID;

-- One term per general election of a house.
CREATE TABLE term (
  id            INTEGER PRIMARY KEY,
  house_id      TEXT NOT NULL REFERENCES house(id),
  election_year INTEGER NOT NULL,
  label         TEXT,
  provenance    TEXT NOT NULL DEFAULT 'published' CHECK (provenance = 'published'),
  source_id     INTEGER NOT NULL REFERENCES source(id),
  UNIQUE (house_id, election_year)
);

-- ── the files the pages read ──────────────────────────────────────────────────

-- One row per exported data file. `head` is the file's JSON with its body (the
-- regions / constituencies / seats / members collection) left out; the body is
-- rebuilt from the fact tables below.
CREATE TABLE document (
  path        TEXT PRIMARY KEY,            -- relative to data/, e.g. 'results/ls/pc/2024.json'
  family      TEXT NOT NULL CHECK (family IN
                ('ls-rollup', 'ls-pc', 'ls-detail', 'ls-byel', 'ac', 'ac-detail', 'cabinet')),
  term_id     INTEGER REFERENCES term(id),
  ministry_id INTEGER REFERENCES ministry(id),
  head        TEXT NOT NULL,
  layout      TEXT NOT NULL,               -- JSON: how the file was serialized (indent, ascii, newline)
  provenance  TEXT NOT NULL DEFAULT 'published' CHECK (provenance = 'published'),
  source_id   INTEGER NOT NULL REFERENCES source(id)
) WITHOUT ROWID;

-- Every source a file names (its `source` and each `sources[]` entry), in order.
CREATE TABLE document_source (
  path      TEXT NOT NULL REFERENCES document(path),
  position  INTEGER NOT NULL,
  source_id INTEGER NOT NULL REFERENCES source(id),
  PRIMARY KEY (path, position)
) WITHOUT ROWID;

-- ── seat counts ───────────────────────────────────────────────────────────────

-- Region-level totals as published. For Lok Sabha 1980–2004 this is the only level
-- (those boundaries predate the atlas geometry).
CREATE TABLE region_tally (
  term_id     INTEGER NOT NULL REFERENCES term(id),
  region_code TEXT NOT NULL REFERENCES region(code),
  position    INTEGER NOT NULL,            -- order in the published file
  seats       INTEGER NOT NULL,
  electors    INTEGER,
  provenance  TEXT NOT NULL DEFAULT 'published' CHECK (provenance = 'published'),
  source_id   INTEGER NOT NULL REFERENCES source(id),
  PRIMARY KEY (term_id, region_code)
) WITHOUT ROWID;

CREATE TABLE region_party_tally (
  term_id     INTEGER NOT NULL,
  region_code TEXT NOT NULL,
  position    INTEGER NOT NULL,
  party_code  TEXT NOT NULL REFERENCES party(code),
  seats       INTEGER NOT NULL,
  votes       INTEGER NOT NULL,
  provenance  TEXT NOT NULL DEFAULT 'published' CHECK (provenance = 'published'),
  source_id   INTEGER NOT NULL REFERENCES source(id),
  PRIMARY KEY (term_id, region_code, position),
  FOREIGN KEY (term_id, region_code) REFERENCES region_tally(term_id, region_code)
) WITHOUT ROWID;

-- A constituency under one delimitation. geo_uid is the join key into the TopoJSON
-- (india-pcs.json unique_id such as 'S24_1'; the AC number for assembly seats).
CREATE TABLE seat (
  id           INTEGER PRIMARY KEY,
  house_id     TEXT NOT NULL REFERENCES house(id),
  region_code  TEXT NOT NULL REFERENCES region(code),
  number       TEXT NOT NULL,
  name         TEXT,
  geo_uid      TEXT,
  delimitation INTEGER NOT NULL,           -- 2008 for every seat the atlas draws
  UNIQUE (house_id, region_code, number, delimitation)
);

-- seq 0 is the general election; 1, 2, … are by-elections in the order published.
CREATE TABLE contest (
  id          INTEGER PRIMARY KEY,
  term_id     INTEGER NOT NULL REFERENCES term(id),
  seat_id     INTEGER NOT NULL REFERENCES seat(id),
  seq         INTEGER NOT NULL DEFAULT 0,
  position    INTEGER NOT NULL,            -- order in the published file
  label       TEXT,                        -- the constituency name as the result prints it
  held_on     TEXT,                        -- ISO date when the source gives one
  reason      TEXT,                        -- by-elections: why the seat fell vacant
  -- 1 = returned unopposed (no poll): one candidacy row, excluded from vote sums.
  uncontested INTEGER NOT NULL DEFAULT 0 CHECK (uncontested IN (0, 1)),
  extra       TEXT,                        -- JSON: published fields with no column (turnout, poll date, …)
  provenance  TEXT NOT NULL DEFAULT 'published' CHECK (provenance = 'published'),
  source_id   INTEGER NOT NULL REFERENCES source(id),
  UNIQUE (term_id, seat_id, seq)
);

-- Votes per candidate (basis 'candidate') and per party (basis 'party': the
-- constituency files carry party totals, with independents summed, in their own
-- party vocabulary). position keeps the source's order: in a 'party' list position
-- 0 is the winner. Same-name independents never collide.
CREATE TABLE candidacy (
  contest_id INTEGER NOT NULL REFERENCES contest(id),
  basis      TEXT NOT NULL CHECK (basis IN ('candidate', 'party')),
  position   INTEGER NOT NULL,
  party_code TEXT NOT NULL REFERENCES party(code),
  candidate  TEXT NOT NULL DEFAULT '',
  votes      INTEGER NOT NULL,
  PRIMARY KEY (contest_id, basis, position)
) WITHOUT ROWID;

-- Who holds each seat, over time: a by-election closes one row and opens the next.
-- member is '' where the source has party totals only (Lok Sabha 2009 and 2014).
CREATE TABLE seat_holding (
  id         INTEGER PRIMARY KEY,
  seat_id    INTEGER NOT NULL REFERENCES seat(id),
  term_id    INTEGER NOT NULL REFERENCES term(id),
  member     TEXT NOT NULL,
  party_code TEXT NOT NULL REFERENCES party(code),
  began_by   TEXT NOT NULL CHECK (began_by IN ('general', 'bye', 'party-change')),
  from_date  TEXT,                         -- NULL = from the start of the term
  to_date    TEXT,                         -- NULL = holds the seat now
  ended_by   TEXT CHECK (ended_by IN ('death', 'resignation', 'disqualification', 'party-change', 'term-end', 'other')),
  contest_id INTEGER REFERENCES contest(id)
);
CREATE INDEX seat_holding_by_term ON seat_holding (term_id, to_date);

-- ── councils of ministers ─────────────────────────────────────────────────────

CREATE TABLE ministry (
  id          INTEGER PRIMARY KEY,
  scope       TEXT NOT NULL CHECK (scope IN ('union', 'state')),
  region_code TEXT NOT NULL REFERENCES region(code),   -- 'IN' for the Union
  cycle       INTEGER NOT NULL,                        -- the general election it follows
  term_id     INTEGER REFERENCES term(id),
  sworn_in    TEXT,                                    -- NULL = not published yet
  ended       TEXT,                                    -- NULL = in office now
  provenance  TEXT NOT NULL DEFAULT 'published' CHECK (provenance = 'published'),
  source_id   INTEGER NOT NULL REFERENCES source(id),
  UNIQUE (scope, region_code, cycle)
);

-- One row per minister in a published roster: 'sworn_in' is the council as sworn
-- in (from_date = ministry.sworn_in); 'as_it_stands' is the council as it stands
-- on the roster's asOf date (from_date not published, so NULL; to_date NULL).
CREATE TABLE minister_tenure (
  id          INTEGER PRIMARY KEY,
  ministry_id INTEGER NOT NULL REFERENCES ministry(id),
  roster      TEXT NOT NULL CHECK (roster IN ('sworn_in', 'as_it_stands')),
  position    INTEGER NOT NULL,
  person      TEXT NOT NULL,               -- name as the source prints it
  rank        TEXT NOT NULL CHECK (rank IN ('pm', 'cm', 'deputy-cm', 'cabinet', 'mos-ic', 'mos')),
  portfolio   TEXT,
  party_code  TEXT REFERENCES party(code),
  seat_name   TEXT,                        -- constituency as printed
  from_date   TEXT,
  to_date     TEXT,
  ended_by    TEXT CHECK (ended_by IN ('resigned', 'dropped', 'portfolio-change', 'died', 'ministry-ended', 'other')),
  extra       TEXT,                        -- JSON: the published fields with no column, and their order
  provenance  TEXT NOT NULL DEFAULT 'published' CHECK (provenance = 'published'),
  source_id   INTEGER NOT NULL REFERENCES source(id),
  UNIQUE (ministry_id, roster, position)
);

-- ── read-side views ───────────────────────────────────────────────────────────

CREATE VIEW contest_winner AS
  SELECT c.id AS contest_id, c.term_id, c.seat_id, c.seq, k.party_code, k.candidate, k.votes
  FROM contest c
  JOIN candidacy k ON k.contest_id = c.id AND k.basis = 'candidate'
  WHERE k.votes = (SELECT MAX(votes) FROM candidacy WHERE contest_id = c.id AND basis = 'candidate');

CREATE VIEW seats_as_elected AS
  SELECT term_id, party_code, COUNT(*) AS seats
  FROM seat_holding WHERE began_by = 'general'
  GROUP BY term_id, party_code;

CREATE VIEW seats_as_it_stands AS
  SELECT term_id, party_code, COUNT(*) AS seats
  FROM seat_holding WHERE to_date IS NULL
  GROUP BY term_id, party_code;

CREATE VIEW cabinet_as_sworn_in AS
  SELECT t.* FROM minister_tenure t WHERE t.roster = 'sworn_in';

CREATE VIEW cabinet_as_it_stands AS
  SELECT t.* FROM minister_tenure t JOIN ministry m ON m.id = t.ministry_id
  WHERE t.roster = 'as_it_stands' AND m.ended IS NULL AND t.to_date IS NULL;
