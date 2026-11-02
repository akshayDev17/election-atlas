#!/usr/bin/env python3
"""Build the atlas's Lok Sabha result files from the Election Commission of India's
own published Statistical Reports.

Inputs (all ECI, all retrieved by the survey in _research/eci/):

  Constituency Wise Detailed Result   one row per candidate: state, PC, candidate,
                                      party, general/postal/total votes
  State Wise Seat Won & Valid Votes   one row per state x party: seats won, votes,
                                      total electors, total valid votes
  List of Political Parties           ABBREVIATION <-> PARTY NAME bridge; the two
                                      tables above use different naming conventions
                                      (abbreviations vs full names), so this file is
                                      what lets them be reconciled.

Outputs, in the shape data/manifest.json declares:

  data/results/ls/<year>.json        state level: region -> seats, electors, parties[]
  data/results/ls/pc/<year>.json     constituency level:
                                       { "S07_8": {"st":"IN-HR","p":"BJP","v":123,"o":{...}} }

Every emitted number is an ABSOLUTE COUNT. Percentages from the source are never
carried across; the pages derive shares from these counts at read time.

Run:  python3 tools/build-ls-results.py [--year 2024] [--check]
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys

try:
    import xlrd  # .xls  (BIFF) — the ECI files need ignore_workbook_corruption
except ImportError:
    xlrd = None
try:
    import openpyxl  # .xlsx
except ImportError:
    openpyxl = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH = os.path.join(ROOT, "_research", "eci")
DATA = os.path.join(ROOT, "data")

# The Commission's statistical-reports index, which lists every year's report.
# A year whose table files have a direct URL on the Commission's site names them
# in `statewise_url` / `detailed_url`; any other year points at this index.
ECI_REPORTS = "https://www.eci.gov.in/statistical-reports"
ECI_GE2024 = "https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/"

# ── per-year ECI source configuration ──────────────────────────────────────────
# row/col indices are read off the actual files; see _research/ECI-SOURCES.md.
YEARS = {
    2024: dict(
        detailed=("ls2024_statistical/33-Constituency-Wise-Detailed-Result.xls", "xls"),
        detailed_cols=dict(state=0, pc=1, candidate=2, party=6, total=12, valid=9),
        detailed_start=3,
        statewise=("ls2024_statistical/17-State-Wise-Seat-Won-&-Valid-Votes-Polled-by-Political-Parties.xls", "xls"),
        statewise_cols=dict(state=0, ptype=1, party=2, valid=3, electors=4, seats=5, votes=6),
        statewise_start=2,
        parties=("ls2024_statistical/3-List-Of-Political-Parties-Participated.xlsx", "xlsx"),
        parties_cols=dict(abbr=2, name=4), parties_start=2,
        # a separate PC-wise summary carries the elector/turnout figures per PC
        pcwise=("ls2024_statistical/7-Constituency-(PC)-Wise-Summary.xls", "xls"),
        pcwise_cols=dict(state=0, no=0, name=1, electors=4, voters=9), pcwise_start=3,
        note="Election Commission of India, General Election 2024 (18th Lok Sabha) — statistical reports, tables 17 and 33.",
        statewise_url=ECI_GE2024 + "17-State-Wise-Seat-Won-&-Valid-Votes-Polled-by-Political-Parties.xls",
        detailed_url=ECI_GE2024 + "33-Constituency-Wise-Detailed-Result.xls",
    ),
    2019: dict(
        detailed=("eci_pdfs/GE2019_33-constituency-wise-detailed-result_part1.xls", "xls"),
        detailed_cols=dict(state=0, pc=1, candidate=2, party=6, total=10),
        detailed_start=3,
        statewise=("eci_pdfs/GE2019_17-state-wise-seat-won-valid-votes-polled-by-political-parties_part2.xls", "xls"),
        statewise_cols=dict(state=0, ptype=1, party=2, valid=3, electors=4, seats=5, votes=6),
        statewise_start=2,
        parties=("eci_pdfs/GE2019_3-list-of-political-parties-participated_part1.xls", "xls"),
        parties_cols=dict(abbr=2, name=4), parties_start=2,
        pcwise=("eci_pdfs/GE2019_7-constituency-pc-wise-summary_part1.xls", "xls"),
        pcwise_cols=dict(state=0, no=0, name=1, electors=4, voters=10), pcwise_start=2,
        winners=("eci_pdfs/GE2019_4-list-of-successful-candidate_part2.xls", "xls"),
        winners_cols=dict(state=1, pc=2, winner=3, party=6, margin=8), winners_start=3,
        note="Election Commission of India, General Election 2019 (17th Lok Sabha) — statistical reports, tables 17 and 33.",
    ),
    2009: dict(
        # 2009 is PDF-only for EVERY table: this was the year whose ECI category        # carries no spreadsheet attachments at all.
        detailed=None,
        pdf_detailed="eci_pdfs/GE2009_constituency-wise-detailed-result.pdf",
        detailed_cols={}, detailed_start=0,
        statewise=None,                      # exists only as a PDF
        statewise_cols={}, statewise_start=0,
        parties=None,                        # exists only as a PDF; the union bridge covers it
        parties_cols={}, parties_start=0,
        pc_context=None,                     # no PC-wise spreadsheet — inferred from the PDF
        pcwise=None,
        note="Election Commission of India, General Election 2009 (15th Lok Sabha) — statistical report. Every table for this year is published as PDF only; the constituency-level result was recovered from ECI's PDF and every row is validated by general + postal == total.",
    ),
    2014: dict(
        # the 2014 detailed result is PDF-only; eci_pdf.parse_pdf recovers it
        detailed=None,
        pdf_detailed="eci_pdfs/GE2014_constituency-wise-detailed-result_part1.pdf",
        detailed_cols={}, detailed_start=0,
        statewise=("eci_pdfs/GE2014_state-wise-seat-won-and-valid-votes-polled-by-political-party_part2.xlsx", "xlsx"),
        statewise_cols=dict(state=0, ptype=1, party=2, valid=3, electors=4, seats=5, votes=6),
        statewise_start=3,
        parties=("eci_pdfs/GE2014_list-of-political-parties-participated_part2.xlsx", "xlsx"),
        parties_cols=dict(abbr=2, name=4), parties_start=3,
        # the PDF carries no state label per constituency, so the PC-wise table
        # supplies it: it lists STATE | PC NO | PC NAME for all 543 seats
        pc_context=("eci_pdfs/GE2014_constituencypc-wise-summary-table_part2.xlsx", "xlsx"),
        pc_context_cols=dict(state=0, no=1, name=2), pc_context_start=2,
        winners=("eci_pdfs/GE2014_list-of-successful-candidates_part2.xlsx", "xlsx"),
        winners_cols=dict(state=1, pc=2, winner=3, party=6, margin=8), winners_start=2,
        pcwise=None,
        note="Election Commission of India, General Election 2014 (16th Lok Sabha) — statistical reports. The constituency-level table was recovered from ECI's PDF (the only format it publishes for this year); every row is validated by general + postal == total.",
    ),
}

# ── pre-2008 archive years: state level only ──────────────────────────────────
# These seven reports are PDF-only, and the recoverer reads them to the vote (each
# is cross-checked against TCPD in ECI-SOURCES.md §8). But they were fought on the
# pre-2008 delimitation: data/geo/india-pcs.json holds the CURRENT 543 seats, so
# matching e.g. 1962's 'Srikakulam' to the modern seat of that name would join two
# different constituencies. Only the state file is emitted — the state totals are
# the state totals, whatever the boundaries inside them.
# `expected_seats` is the size of the Lok Sabha at that election, used as a check
# that the recoverer found every constituency.
# State names the older reports print that data/regions.json no longer uses.
# GeoIndex.state() already maps these to the modern region; they are listed here so
# the PDF recoverer RECOGNISES them as a state header in the first place.
ECI_OLD_STATE_NAMES = [
    "Orissa", "Pondicherry", "Delhi", "Andaman & Nicobar Islands",
    "Dadra & Nagar Haveli", "Daman & Diu", "Uttaranchal", "NCT of Delhi",
]

ARCHIVE_STATE_ONLY = {
    1980: ("general-election-1980-vol-i-ii_part1.pdf", 529),
    1984: ("general-election-1984-vol-i-ii_part1.pdf", 514),
    1989: ("general-election-1989-vol-i-ii_part1.pdf", 529),
    1991: ("general-election-1991-vol-i-ii_part1.pdf", 521),
    1996: ("general-election-1996-vol-i-ii_part1.pdf", 543),
    2004: ("general-election-2004-vol-i-ii-iii_part1.pdf", 543),
}
for _y, (_f, _seats) in ARCHIVE_STATE_ONLY.items():
    YEARS[_y] = dict(
        detailed=None, pdf_detailed=f"eci_pdfs/{_f}",
        detailed_cols={}, detailed_start=0,
        statewise=None, statewise_cols={}, statewise_start=0,
        parties=None, parties_cols={}, parties_start=0,
        pc_context=None, pcwise=None,
        state_only=True, expected_seats=_seats,
        note=(f"Election Commission of India, General Election {_y} — statistical report "
              "(published as PDF only). State-level totals. The constituency boundaries "
              "of this election predate the atlas geometry, so no per-constituency file "
              "is produced for it."),
    )


# ── text normalisation ────────────────────────────────────────────────────────
_AND = re.compile(r"\b(and|the|of)\b")


def norm(s) -> str:
    """Case/punctuation/& insensitive key. Keeps words like 'united' and 'marxist'
    that distinguish real parties; drops only join words."""
    s = str(s or "").lower().replace("&", " and ").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = _AND.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def norm_bare(s) -> str:
    """norm() with parenthetical annotations dropped.

    The geometry names several seats as 'Kaziranga (ex Kaliabor)' where the ECI
    prints plain 'Kaziranga'; the bracket is the boundary commission's note about
    the seat's former name, not part of the name."""
    return norm(re.sub(r"\([^)]*\)", " ", str(s or "")))


def slug(s) -> str:
    return re.sub(r"[^A-Za-z0-9]", "", str(s or ""))[:14] or "UNK"


# ── generic spreadsheet readers ───────────────────────────────────────────────
def read_sheet(path: str, kind: str):
    """Return list-of-rows (list of cell values) from a .xls or .xlsx."""
    full = path if os.path.isabs(path) else os.path.join(RESEARCH, path)
    if kind == "xls":
        # the ECI workbooks trip xlrd's strict compound-document check
        wb = xlrd.open_workbook(full, ignore_workbook_corruption=True)
        sh = wb.sheet_by_index(0)
        return [[sh.cell_value(r, c) for c in range(sh.ncols)] for r in range(sh.nrows)]
    wb = openpyxl.load_workbook(full, read_only=True, data_only=True)
    sh = wb[wb.sheetnames[0]]
    rows = [list(r) for r in sh.iter_rows(values_only=True)]
    wb.close()
    return rows


def as_int(v):
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip().replace(",", "")
        if not v:
            return None
    try:
        return int(round(float(v)))
    except (TypeError, ValueError):
        return None


def as_str(v) -> str:
    return "" if v is None else str(v).strip()


# ── party vocabulary ──────────────────────────────────────────────────────────
class PartyIndex:
    """Resolves the several spellings the ECI uses down to one code per party.

    Priority: the atlas's own controlled vocabulary (data/parties.json) wins; then
    the year's ECI ABBREVIATION -> PARTY NAME bridge ties an abbreviation and its
    full name to the same code; anything still unknown keeps its ECI abbreviation
    (or a slug of its name) so no vote is silently dropped into a bucket.
    """

    def __init__(self, parties_doc):
        self.doc = parties_doc
        self.by_norm = {}
        for p in parties_doc["parties"]:
            for key in [p["code"], p["name"], *p.get("aliases", [])]:
                self.by_norm[norm(key)] = p["code"]
        self.known_codes = {p["code"] for p in parties_doc["parties"]}
        self.fallback = parties_doc.get("fallback", {}).get("code", "OTHER")
        self.unresolved = collections.Counter()
        self.bridge = {}

    def add_bridge(self, abbr: str, full: str):
        """Register ECI abbreviation <-> full name, both resolving to one code."""
        abbr, full = abbr.strip(), full.strip()
        if not abbr and not full:
            return
        code = self.code_for_name(full) or self.code_for_name(abbr)
        if code is None:
            code = slug(abbr) if abbr else slug(full)
        self.bridge[norm(abbr)] = code
        self.bridge[norm(full)] = code
        self.bridge[abbr] = code
        self.bridge[full] = code

    def code_for_name(self, name: str):
        if name is None:
            return None
        n = norm(name)
        if n in self.by_norm:
            return self.by_norm[n]
        if n in self.bridge:
            return self.bridge[n]
        raw = str(name).strip()
        if raw in self.bridge:
            return self.bridge[raw]
        return None

    def resolve(self, name: str) -> str:
        code = self.code_for_name(name)
        if code:
            return code
        raw = str(name or "").strip()
        c = slug(raw)
        self.unresolved[raw] += 1
        return c


# ── geography index ───────────────────────────────────────────────────────────
class GeoIndex:
    """data/geo/india-pcs.json is the geometry the constituency layer draws.
    Every result row has to land on one of its unique_ids (e.g. 'S07_8')."""

    # Spelling differences the ECI and the boundary source genuinely disagree on.
    # Each is a transliteration or an older name for the same seat, not a guess:
    # they are cross-checked against the ECI's own PC-number table in verify_numbers().
    PC_ALIAS = {
        "thirupathi": "tirupati",
        "guwahati": "gauhati",
        "puducherry": "pondicherry",
        "andaman nicobar islands": "andaman nicobar",
        "narsaraopet": "narasaraopet",
        "ananthapur": "anantapur",
        "kurnoolu": "kurnool",
        "patliputra": "pataliputra",
        "hatkanangale": "hatkanangle",
        "baharaich": "bahraich",
        "haridwar": "hardwar",
        "dadar nagar haveli": "dadra nagar haveli",
        # 2019-only spellings / the seat's older name where the geometry records no
        # "(ex ...)" note to lean on
        "aruku": "araku",
        "barrackpore": "barrackpur",
        "sarguja": "surguja",
        "nowgong": "nagaon",
        # 2014-only spellings, present in ECI's own PDF for that year
        "secundrabad": "secunderabad",
        "chelvella": "chevella",
        "joynagar": "jaynagar",
        "burdwan durgapur": "bardhaman durgapur",
        "cooch behar": "coochbehar",
        "ferozpur": "firozpur",
        "nainital udhamsingh": "nainital udhamsingh nagar",
        "dadar nagar haveli": "dadra nagar haveli",
    }

    def __init__(self, geo_path, regions_doc):
        geo = json.load(open(geo_path, encoding="utf-8"))
        self.by_state = collections.defaultdict(dict)   # geo state -> norm(name) -> uid
        self.bare_state = collections.defaultdict(dict)  # same, parentheticals dropped
        self.globaln = collections.defaultdict(list)    # norm(name) -> [uid]
        self.global_bare = collections.defaultdict(list)
        self.former_state = collections.defaultdict(dict)  # "(ex X)" -> uid, per state
        self.former_global = collections.defaultdict(list)
        self.state_names = set()
        self.by_uid = {}
        for g in geo["objects"]["pcs"]["geometries"]:
            p = g["properties"]
            uid, st, name = p["unique_id"], p["state_ut_name"], p["ls_seat_name"]
            self.by_uid[uid] = dict(state=st, name=name,
                                    code=str(p.get("ls_seat_code") or "").strip())
            self.by_state[st][norm(name)] = uid
            self.bare_state[st][norm_bare(name)] = uid
            self.globaln[norm(name)].append(uid)
            self.global_bare[norm_bare(name)].append(uid)
            self.state_names.add(st)
            # Several seats are named "<current name> (ex <former name>)". The ECI
            # sometimes prints the FORMER name (its 2019 report still says
            # 'Kaliabor', 'Mangaldoi', 'Tezpur' for Assam), so index those too —
            # the geometry itself supplies the crosswalk, which is why this is a
            # lookup rather than a guess.
            for ex in re.findall(r"\(\s*ex\.?\s+([^)]*)\)", name, re.I):
                k = norm(ex)
                if k:
                    self.former_state[st][k] = uid
                    self.former_global[k].append(uid)
        # region code (IN-XX) -> geo state name
        self.region_of_state = {}
        for r in regions_doc["regions"]:
            for nm in [r["name"], *r.get("sourceNames", [])]:
                for gs in self.state_names:
                    if norm(gs) == norm(nm):
                        self.region_of_state[gs] = r["code"]
        # ECI prints a few states under a longer or older name
        self.state_alias = {
            "andaman nicobar islands": "Andaman & Nicobar",
            "nct delhi": "Delhi",
            "delhi": "Delhi",
            "jammu kashmir": "Jammu & Kashmir",
            "dadra nagar haveli daman diu": "Dadra and Nagar Haveli and Daman and Diu",
            "dadar nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
            "pondicherry": "Puducherry",
            "puducherry": "Puducherry",
            "orissa": "Odisha",
            "uttaranchal": "Uttarakhand",
        }

    def state(self, eci_state: str):
        n = norm(eci_state)
        if n in self.state_alias:
            return self.state_alias[n]
        for gs in self.state_names:
            if norm(gs) == n:
                return gs
        # "Dadra & Nagar Haveli and Daman & Diu" vs geo's spelled-out version
        for gs in self.state_names:
            if n and (n in norm(gs) or norm(gs) in n):
                return gs
        return None

    def uid(self, eci_state: str, pc_name: str):
        """Resolve one ECI (state, PC) pair to a geometry unique_id.

        Order: exact name inside the state, then the parenthetical-stripped name,
        then a global match when the state label is stale (the 2014 ECI file still
        files Telangana's seats under 'Andhra Pradesh', which the post-2014 geometry
        has split), then the explicit alias table, then fuzzy."""
        st = self.state(eci_state)
        key = norm(pc_name)
        bare = norm_bare(pc_name)
        aliased = self.PC_ALIAS.get(key, key)
        keys = list(dict.fromkeys([key, bare, aliased,
                                   self.PC_ALIAS.get(bare, bare)]))

        if st:
            for k in keys:
                if k in self.by_state[st]:
                    return self.by_state[st][k], st
                if k in self.bare_state[st]:
                    return self.bare_state[st][k], st
                if k in self.former_state[st]:
                    return self.former_state[st][k], st

        for table in (self.globaln, self.global_bare, self.former_global):
            for k in keys:
                cands = table.get(k, [])
                if len(cands) == 1:
                    return cands[0], self.by_uid[cands[0]]["state"]

        if st:
            for table in (self.by_state[st], self.bare_state[st], self.former_state[st]):
                near = _fuzzy(keys[0], table)
                if near:
                    return near, st
        return None, st


def _fuzzy(n, table, cutoff=0.90):
    import difflib
    best, score = None, 0.0
    for k, uid in table.items():
        r = difflib.SequenceMatcher(None, n, k).ratio()
        if r > score:
            best, score = uid, r
    return best if score >= cutoff else None


# ── builders ──────────────────────────────────────────────────────────────────
def build_party_index(cfg, parties_doc):
    ix = PartyIndex(parties_doc)
    rows = read_sheet(*cfg["parties"])
    c = cfg["parties_cols"]
    for r in rows[cfg["parties_start"]:]:
        abbr, name = as_str(r[c["abbr"]]), as_str(r[c["name"]])
        ix.add_bridge(abbr, name)
    return ix


def build_constituencies(cfg, ix: PartyIndex, geo: GeoIndex, log):
    """Detailed result -> {uid: {p, v, o{}, st, name}}."""
    path, kind = cfg["detailed"]
    rows = read_sheet(path, kind)
    c = cfg["detailed_cols"]
    # Keep the CANDIDATES, not just a per-party total. The winner is the candidate
    # with the most votes; summing by party first and then taking the biggest bucket
    # hands the seat to whichever party fielded the most candidates. Every
    # independent in a constituency shares the code IND, so that mistake put a
    # phantom IND winner in front of a real BJP one in Ladakh 2014 and 2019.
    per_pc = collections.defaultdict(list)
    unmatched = collections.Counter()
    for r in rows[cfg["detailed_start"]:]:
        st, pc = as_str(r[c["state"]]), as_str(r[c["pc"]])
        party, votes = as_str(r[c["party"]]), as_int(r[c["total"]])
        if not st or not pc or not party or votes is None:
            continue
        per_pc[(st, pc)].append((ix.resolve(party), votes))

    out = {}
    for (st, pc), cands in per_pc.items():
        uid, gstate = geo.uid(st, pc)
        if uid is None:
            unmatched[f"{st} | {pc}"] += 1
            continue
        region = geo.region_of_state.get(gstate)
        if region is None:
            unmatched[f"<no region for {gstate}>"] += 1
            continue
        win_code, win_votes, others = split_winner(cands)
        out[uid] = dict(st=region, p=win_code, v=win_votes, o=others,
                        _name=pc, _eci_state=st)
    log["pc_unmatched"] = dict(unmatched)
    log["pc_count"] = len(out)
    return out


def split_winner(cands):
    """cands: [(party_code, votes)] -> (winner_code, winner_votes, {party: votes}).

    The winner is the single highest-polling candidate; `others` is everyone else,
    summed by party. When two candidates share a code (two independents), the code
    can therefore legitimately appear in `others` with more votes than the winner
    holds as an individual — which is exactly what the ECI's own winners table
    confirms happens."""
    if not cands:
        return None, 0, {}
    top = max(cands, key=lambda x: x[1])
    others = collections.Counter()
    dropped = False
    for code, votes in cands:
        if not dropped and code == top[0] and votes == top[1]:
            dropped = True          # remove one instance of the winner only
            continue
        others[code] += votes
    return top[0], top[1], {k: v for k, v in others.items() if v > 0}


def build_party_index(cfg, parties_doc, borrow_from=()):
    """The party vocabulary for one year.

    Years whose party list is only published as a PDF (2009) borrow the
    ABBREVIATION <-> PARTY NAME bridges of the years that do publish one; the
    abbreviations are stable across reports, and a year with no list would otherwise
    emit raw codes that disagree with every other year."""
    ix = PartyIndex(parties_doc)
    for src in (cfg, *borrow_from):
        if not src.get("parties"):
            continue
        rows = read_sheet(*src["parties"])
        c = src["parties_cols"]
        for r in rows[src["parties_start"]:]:
            ix.add_bridge(as_str(r[c["abbr"]]), as_str(r[c["name"]]))
    return ix


def infer_state_context(parsed, geo):
    """Work out which state each constituency belongs to, from the PDF alone.

    The report walks the country state by state, restarting the constituency number
    at 1 each time, but never prints the state name beside a result. Splitting on the
    numbering reset recovers the runs; each run is then matched to the geometry state
    whose constituency names it overlaps most. That is enough to place all 543, and
    it is what makes 2009 work, since that year publishes no PC-wise table at all."""
    runs, cur, prev = [], [], None
    for key, blk in parsed.items():
        no = blk["no"]
        if prev is not None and no <= prev and cur:
            runs.append(cur)
            cur = []
        cur.append(key)
        prev = no
    if cur:
        runs.append(cur)

    ctx, report = {}, []
    for run in runs:
        names = [norm_bare(parsed[k]["name"]) for k in run]
        best, score = None, -1
        for st in geo.state_names:
            table = geo.bare_state[st]
            hits = sum(1 for n in names if n in table)
            if hits > score:
                best, score = st, hits
        report.append({"run": len(run), "first": parsed[run[0]]["name"],
                       "state": best, "name_hits": score})
        for k in run:
            ctx[k] = best
    return ctx, report


def build_constituencies_from_pdf(cfg, ix: PartyIndex, geo: GeoIndex, log):
    """Same output as build_constituencies(), but sourced from a PDF.

    The state for each constituency comes from the ECI's PC-wise table when the year
    publishes one, and otherwise from the report's own ordering (see
    infer_state_context). That also resolves seats whose names repeat across states
    (Maharajganj, Aurangabad, Hamirpur)."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "eci_pdf", os.path.join(os.path.dirname(os.path.abspath(__file__)), "eci_pdf.py"))
    eci_pdf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(eci_pdf)

    path = os.path.join(RESEARCH, cfg["pdf_detailed"])
    parsed, stats = eci_pdf.parse_pdf(path)
    log["pdf_stats"] = dict(stats)

    ctx = {}
    if cfg.get("pc_context"):
        rows = read_sheet(*cfg["pc_context"])
        c = cfg["pc_context_cols"]
        for r in rows[cfg["pc_context_start"]:]:
            st, no, name = as_str(r[c["state"]]), as_int(r[c["no"]]), as_str(r[c["name"]])
            if st and no is not None and name:
                ctx[(no, norm(name))] = st
                ctx[(no, norm_bare(name))] = st
        state_of = {k: ctx.get((b["no"], norm(b["name"]))) or ctx.get((b["no"], norm_bare(b["name"])))
                    for k, b in parsed.items()}
    else:
        # The 1962-2004 reports print the state as a section header; prefer that,
        # since it is what the ECI itself says. Fall back to inferring the state from
        # where the constituency numbering restarts (which is what 2009 needs, as its
        # report prints no state header at all).
        state_of, runs = infer_state_context(parsed, geo)
        log["inferred_state_runs"] = runs

    out, unmatched = {}, collections.Counter()
    for key, blk in parsed.items():
        name = blk["name"]
        st = blk.get("state_header") or state_of.get(key)
        uid, gstate = geo.uid(st or "", name)
        if uid is None:
            uid, gstate = geo.uid(name, name)      # global fallback
        if uid is None or gstate is None:
            unmatched[f"{blk['no']} {name}"] += 1
            continue
        region = geo.region_of_state.get(gstate)
        if region is None:
            unmatched[f"<no region for {gstate}>"] += 1
            continue
        cands = [(ix.resolve(c["party"]), c["total"]) for c in blk["candidates"]]
        if not cands:
            continue
        win_code, win_votes, others = split_winner(cands)
        out[uid] = dict(st=region, p=win_code, v=win_votes, o=others,
                        _name=name, _eci_state=st or gstate, _electors=blk.get("electors"))
    log["pc_unmatched"] = dict(unmatched)
    log["pc_count"] = len(out)
    return out


def build_state_only_from_pdf(cfg, ix: PartyIndex, geo: GeoIndex, log):
    """Pre-2008 elections: recover the constituencies, but key the output by REGION
    rather than by geometry id.

    Those elections used the pre-2008 delimitation, so their constituencies are not
    the ones in data/geo/india-pcs.json. Matching 1962's 'Srikakulam' to the modern
    seat of that name would silently join two different constituencies, so the
    constituency layer is deliberately not produced. The state totals are unaffected
    — a state's votes are its votes whatever the boundaries inside it — so the
    entries returned here carry a placeholder id and a real region code, which is all
    state_from_pcs() needs to build the state file."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "eci_pdf", os.path.join(os.path.dirname(os.path.abspath(__file__)), "eci_pdf.py"))
    eci_pdf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(eci_pdf)

    # The pre-2000 reports print some states under names the modern registry does not
    # use, so a header like 'ORISSA' or 'PONDICHERRY' would not be recognised and its
    # constituencies would inherit whatever state preceded them.
    hdr_names = set(geo.state_names) | set(ECI_OLD_STATE_NAMES)
    parsed, stats = eci_pdf.parse_pdf(os.path.join(RESEARCH, cfg["pdf_detailed"]),
                                      state_names=hdr_names)
    log["pdf_stats"] = dict(stats)
    log["pdf_constituencies"] = len(parsed)
    expected = cfg.get("expected_seats")
    if expected:
        log["seats_expected"] = expected
        log["seats_found"] = len(parsed)
        log["seats_complete"] = (len(parsed) == expected)

    out, unmatched = {}, collections.Counter()
    for (st_hdr, no, name), blk in parsed.items():
        gs = geo.state(st_hdr) if st_hdr else None
        region = geo.region_of_state.get(gs) if gs else None
        if region is None:
            unmatched[f"{st_hdr} | {no} {name}"] += 1
            continue
        cands = [(ix.resolve(c["party"]), c["total"]) for c in blk["candidates"]]
        if not cands:
            continue
        win_code, win_votes, others = split_winner(cands)
        # key on everything identifying the seat, not just (region, number): two
        # states can fold into one region (Dadra & Nagar Haveli and Daman & Diu both
        # map to IN-DH) and their constituency numbers restart independently, so a
        # (region, no) key silently drops one of them.
        out[f"{region}#{st_hdr}#{no}#{name}"] = dict(
            st=region, p=win_code, v=win_votes, o=others,
            _name=name, _eci_state=st_hdr, _electors=blk.get("electors"))
    log["state_unmatched"] = dict(unmatched)
    log["state_count"] = len(out)
    return out


def build_state_rows(cfg, geo: GeoIndex, log):
    # 2009 publishes no state-wise spreadsheet at all, so there is nothing to read;
    # that year's state file is derived entirely from its constituency rows.
    if not cfg.get("statewise"):
        log["state_rows"] = 0
        log["state_rows_note"] = "no state-wise table for this year (PDF-only year)"
        return {}
    path, kind = cfg["statewise"]
    rows = read_sheet(path, kind)
    c = cfg["statewise_cols"]
    states = {}
    for r in rows[cfg["statewise_start"]:]:
        st, party = as_str(r[c["state"]]), as_str(r[c["party"]])
        if not st or not party:
            continue
        votes = as_int(r[c["votes"]]) or 0
        seats = as_int(r[c["seats"]]) or 0
        s = states.setdefault(st, dict(parties=collections.Counter(),
                                       seats=collections.Counter(),
                                       valid=as_int(r[c["valid"]]),
                                       electors=as_int(r[c["electors"]])))
        s["parties"][party] += votes
        s["seats"][party] += seats
    log["state_rows"] = len(states)
    return states


def build_winners(cfg, ix: PartyIndex, geo: GeoIndex, log):
    """2014-style fallback: a winners-only table (no per-candidate votes)."""
    path, kind = cfg["winners"]
    rows = read_sheet(path, kind)
    c = cfg["winners_cols"]
    out, unmatched = {}, collections.Counter()
    for r in rows[cfg["winners_start"]:]:
        st, pc, party = as_str(r[c["state"]]), as_str(r[c["pc"]]), as_str(r[c["party"]])
        if not st or not pc or not party:
            continue
        uid, gstate = geo.uid(st, pc)
        if uid is None:
            unmatched[f"{st} | {pc}"] += 1
            continue
        region = geo.region_of_state.get(gstate)
        if region is None:
            continue
        out[uid] = dict(st=region, p=ix.resolve(party),
                        _name=pc, _margin=as_int(r[c["margin"]]), _eci_state=st)
    log["winner_unmatched"] = dict(unmatched)
    log["winner_count"] = len(out)
    return out


def state_from_pcs(pcs, states, ix, geo):
    """Derive the state-level file from the constituency rows.

    The state file must be the exact sum of the constituency file, or the map and
    the table on the same page can disagree. Where the ECI's own state-level table
    exists it is used for `electors` (the constituency table carries no electorate
    for 2019/2024) and as the reconciliation check, but the votes come from the
    candidate-level table, which names parties the state table sometimes folds into
    'Independent'."""
    agg = collections.defaultdict(collections.Counter)
    seats = collections.defaultdict(collections.Counter)
    for c in pcs.values():
        if "v" not in c:
            continue
        agg[c["st"]][c["p"]] += c["v"]
        seats[c["st"]][c["p"]] += 1
        for k, v in (c.get("o") or {}).items():
            agg[c["st"]][k] += v
    electors = {}
    for st, s in states.items():
        gs = geo.state(st)
        if gs:
            r = geo.region_of_state.get(gs)
            if r:
                electors[r] = s["electors"]
    if not electors:
        # no state table for this year: the PDF prints "Total Electors" per
        # constituency, so the state figure is the sum of its constituencies
        acc = collections.Counter()
        for c in pcs.values():
            if c.get("_electors"):
                acc[c["st"]] += c["_electors"]
        electors = dict(acc)
    out = {}
    for region, parties in agg.items():
        out[region] = dict(
            electors=electors.get(region),
            parties=[{"code": k, "seats": seats[region].get(k, 0), "votes": v}
                     for k, v in parties.most_common()])
    return out


def state_from_table(states, ix, geo, log):
    """Fallback when a year has no candidate-level table (2014): the ECI's own
    state x party table is then the only source, so it becomes the state file."""
    out = {}
    for st, s in states.items():
        gs = geo.state(st)
        region = geo.region_of_state.get(gs) if gs else None
        if region is None:
            log.setdefault("state_unmapped", []).append(st)
            continue
        out[region] = dict(
            seats_total=sum(s["seats"].values()),
            electors=s["electors"],
            parties=[{"code": ix.resolve(n), "seats": s["seats"].get(n, 0), "votes": v}
                     for n, v in s["parties"].most_common()])
    return out


def emit(year, cfg, pcs, states, ix, geo, log):
    # ── constituency file ──
    constituencies = {}
    for uid, c in sorted(pcs.items()):
        e = {"st": c["st"], "p": c["p"]}
        if "v" in c:
            e["v"] = c["v"]
        if c.get("o"):
            e["o"] = c["o"]
        constituencies[uid] = e
    detail_src = cfg["detailed"][0] if cfg.get("detailed") else (
        cfg.get("winners", ("", ""))[0] if cfg.get("winners") else None)
    pc_doc = {
        "schema": 2, "provenance": "published", "election": "ls", "year": year,
        "note": ("PUBLISHED RESULT. Every value is an ABSOLUTE COUNT carried from the "
                 "Election Commission of India's own statistical report; no percentage is "
                 "stored. `p` is the winning party and `v` its votes; `o` holds every other "
                 "party that polled in the constituency. " + cfg["note"]),
        "source": {
            "publisher": "Election Commission of India",
            "url": cfg.get("detailed_url", ECI_REPORTS),
            "detail_table": detail_src,
            "party_code_rule": ("data/parties.json code where the vocabulary covers the party, "
                                "otherwise the ECI abbreviation printed in the source table"),
        },
        "constituencies": constituencies,
    }
    pp = None
    if not cfg.get("state_only"):
        os.makedirs(os.path.join(DATA, "results", "ls", "pc"), exist_ok=True)
        pp = os.path.join(DATA, "results", "ls", "pc", f"{year}.json")
        json.dump(pc_doc, open(pp, "w", encoding="utf-8"), ensure_ascii=False,
                  separators=(",", ":"))

    # ── state file ──
    have_votes = any("v" in c for c in pcs.values())
    if have_votes and cfg.get("state_only"):
        region_data = state_from_pcs(pcs, states, ix, geo)
        src_note = ("state totals are the exact sum of every constituency in this "
                    "election's published detailed result. No constituency file is "
                    "written for this year: its boundaries predate the atlas geometry")
    elif have_votes:
        region_data = state_from_pcs(pcs, states, ix, geo)
        src_note = ("state totals are the exact sum of the constituency file above; "
                    "electors come from the ECI's state-wise table")
    else:
        region_data = state_from_table(states, ix, geo, log)
        src_note = ("this year's constituency table is winners-only, so seats and votes "
                    "come from the ECI's state-wise table; `margins` records each winner's "
                    "published margin")
    regions = {}
    for region, d in region_data.items():
        regions[region] = {
            "seats": d.get("seats_total") if d.get("seats_total") is not None
            else sum(p["seats"] for p in d["parties"]),
            "electors": d["electors"],
            "parties": d["parties"],
        }
    st_doc = {
        "schema": 2, "provenance": "published", "election": "ls", "year": year,
        "note": ("PUBLISHED RESULT. Every value here is an ABSOLUTE COUNT. No percentage is "
                 "stored anywhere: the page derives every share from these numbers. `electors` "
                 "is the registered electorate. " + src_note + ". " + cfg["note"]),
        "source": {"publisher": "Election Commission of India",
                   "url": cfg.get("statewise_url", ECI_REPORTS),
                   "table": cfg["statewise"][0] if cfg.get("statewise") else None,
                   "detail_table": detail_src,
                   "derivation": "constituency" if have_votes else "state_table"},
        "regions": regions,
    }
    sp = os.path.join(DATA, "results", "ls", f"{year}.json")
    json.dump(st_doc, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    log["state_file"] = sp
    log["pc_file"] = pp
    return st_doc, pc_doc


def reconcile(year, cfg, pcs, states, ix, geo, log):
    """Check the constituency rows against the ECI's own state x party table.

    Compared on the ECI's OWN state labels, not the atlas regions, because the two
    genuinely disagree in two documented ways:
      * ECI 2014 reports united Andhra Pradesh; the atlas geometry splits Telangana
        out. Grouping by the ECI label keeps the two 42-seat halves together, which
        is what that report actually says.
      * ECI's 2019 report files Ladakh under Jammu & Kashmir (one state then).
    Per-party comparison additionally ignores the year's 'Unrecognised' row: the
    2014 state table puts every registered-unrecognised party in that one bucket,
    so its per-party split cannot be compared against a candidate-level table that
    names them individually.

    The STATES TOTAL line is the real test — it must match exactly.
    """
    mine = collections.defaultdict(collections.Counter)
    for c in pcs.values():
        if "v" not in c:
            continue
        st = c.get("_eci_state")
        if st is None:                      # 2024/2019 path records the region only
            st = c["st"]
        mine[st][c["p"]] += c["v"]
        for k, v in (c.get("o") or {}).items():
            mine[st][k] += v

    off = collections.defaultdict(collections.Counter)
    for st, s in states.items():
        for name, votes in s["parties"].items():
            off[st][ix.resolve(name)] += votes

    totals_ok = totals_bad = parties_ok = parties_bad = 0
    detail = []
    for st in sorted(set(mine) | set(off)):
        a, o = mine.get(st, collections.Counter()), off.get(st, collections.Counter())

        # The one legitimate reason the two ECI tables disagree on a total: codes my
        # side has that its party table carries no row for. In 2019 that is nothing
        # (ECI lists NOTA there); in 2014 the party table omits NOTA entirely AND
        # collapses every unrecognised party into one 'Unrecognised' row. So for a
        # state the identity is
        #     gap = (votes in my codes absent from ECI's table) - ECI's 'Unrecognised'
        # If that holds, every vote is accounted for and the remaining difference is
        # purely how the two tables name things. Anything else is a real defect.
        missing = {k: v for k, v in a.items() if k not in o}
        unrec_eci = sum(v for k, v in o.items() if k.upper().startswith("UNRECOGNISED"))
        gap = sum(a.values()) - sum(o.values())
        attributable = sum(missing.values()) - unrec_eci
        explained = (gap == 0) or (gap == attributable)
        reasons = []
        if gap == 0:
            totals_ok += 1
        elif explained:
            totals_ok += 1
            reasons.append(
                f"{gap:,} votes in categories ECI's table does not name individually "
                f"({sum(missing.values()):,} in unnamed party codes, of which "
                f"{unrec_eci:,} sit in ECI's own 'Unrecognised' row)")
        else:
            totals_bad += 1
            reasons.append(f"TOTAL MISMATCH — investigate (gap {gap:,}, "
                           f"attributable {attributable:,})")

        # compare only codes both tables name
        shared = collections.Counter({k: v for k, v in a.items() if k in o and
                                      not k.upper().startswith("UNRECOGNISED")})
        o_named = collections.Counter({k: v for k, v in o.items()
                                       if not k.upper().startswith("UNRECOGNISED")})
        if shared == o_named:
            parties_ok += 1
            detail.append({"eci_state": st, "mine": sum(a.values()), "eci": sum(o.values()),
                           "gap": gap, "explained": explained,
                           "kinds": reasons, "diffs": {}})
            continue
        parties_bad += 1
        diffs = {k: (shared.get(k, 0), o_named.get(k, 0)) for k in set(shared) | set(o_named)
                 if shared.get(k, 0) != o_named.get(k, 0)}
        reasons.append("per-party labelling differs: "
                       + ", ".join(f"{k} {v[0] - v[1]:+,}" for k, v in sorted(
                           diffs.items(), key=lambda x: -abs(x[1][0] - x[1][1]))[:4]))
        detail.append({"eci_state": st, "mine": sum(a.values()), "eci": sum(o.values()),
                       "gap": gap, "explained": explained, "kinds": reasons,
                       "diffs": {k: list(v) for k, v in sorted(diffs.items())[:8]}})
    log["reconcile"] = {"eci_state_totals_exact": totals_ok, "eci_state_totals_differ": totals_bad,
                        "party_maps_exact": parties_ok, "party_maps_differ": parties_bad}
    log["reconcile_detail"] = detail
    return totals_ok, totals_bad, detail


def verify_numbers(cfg, geo: GeoIndex, log, year):
    """Independent check that the name join put every seat in the right place.

    The ECI's PC-wise summary table carries an official PC *number* beside each PC
    name. The geometry carries its own seat code. If a name-based join is correct,
    the two numbers agree for every constituency — so this catches a plausible but
    wrong match that the aggregate reconciliation would happily absorb."""
    if not cfg.get("pcwise"):
        log["pc_number_check"] = "no PC-numbered table in this year's set"
        return
    path, kind = cfg["pcwise"]
    rows = read_sheet(path, kind)
    c = cfg["pcwise_cols"]
    ok = bad = skipped = 0
    diffs = []
    state = None
    for r in rows[cfg["pcwise_start"]:]:
        raw_state, raw_no, raw_name = as_str(r[c["state"]]), as_int(r[c["no"]]), as_str(r[c["name"]])
        # a state banner row: names a state, carries no PC number and no PC name.
        # 'State-Total' rows look the same but are not state names.
        if raw_state and raw_no is None and not raw_name:
            if "total" not in raw_state.lower():
                state = raw_state
            continue
        if raw_no is None or not raw_name:
            skipped += 1
            continue
        st = state or raw_state
        uid, _ = geo.uid(st, raw_name)
        if uid is None:
            bad += 1
            diffs.append((st, raw_no, raw_name, "unmatched"))
            continue
        gcode = geo.by_uid[uid]["code"]
        if gcode and str(gcode) == str(raw_no):
            ok += 1
        else:
            bad += 1
            diffs.append((st, raw_no, raw_name, f"geo={gcode} {geo.by_uid[uid]['name']}"))
    log["pc_number_check"] = {"agree": ok, "disagree": bad, "skipped": skipped, "year": year}
    if diffs:
        log["pc_number_diffs"] = diffs[:20]


def propose_party_additions(years):
    """List the parties that WIN seats but are not in data/parties.json.

    The pages colour a constituency with `partyByCode.get(code) || fallback`, so every
    code missing from the registry renders in the neutral fallback. On the 2024 map
    that is 56 of 543 seats reading as one anonymous grey, which misrepresents the
    result. This writes the merge-ready list rather than editing parties.json: that
    file's colours are documented as tuned against the map's adjacency graph with a
    CIELab separation score, which is the owner's call, not a build step's."""
    registry = json.load(open(os.path.join(DATA, "parties.json"), encoding="utf-8"))
    known = {p["code"] for p in registry["parties"]}
    agg = collections.defaultdict(lambda: {"seats": collections.Counter(),
                                           "names": set()})
    for y in years:
        path = os.path.join(DATA, "results", "ls", "pc", f"{y}.json")
        if not os.path.exists(path):
            continue
        for c in json.load(open(path, encoding="utf-8"))["constituencies"].values():
            if c["p"] not in known:
                agg[c["p"]]["seats"][y] += 1
    # recover full names from every year's party list
    names = {}
    for cfg in YEARS.values():
        if not cfg.get("parties"):
            continue
        rows = read_sheet(*cfg["parties"])
        c = cfg["parties_cols"]
        for r in rows[cfg["parties_start"]:]:
            a, n = as_str(r[c["abbr"]]), as_str(r[c["name"]])
            if a and n:
                names.setdefault(a, n)
                names.setdefault(slug(a), n)   # 'JD(S)' -> 'JDS', the code the build emits
    out = []
    for code, info in sorted(agg.items(), key=lambda kv: -sum(kv[1]["seats"].values())):
        out.append({"code": code, "name": names.get(code, ""),
                    "seats_by_year": dict(sorted(info["seats"].items())),
                    "seats_total": sum(info["seats"].values()),
                    "colour": None,
                    "note": "colour to be chosen by the owner, per the method in parties.json"})
    dest = os.path.join(DATA, "parties.proposed-additions.json")
    json.dump({"note": ("Parties that win at least one Lok Sabha seat in a built year but "
                        "are absent from data/parties.json, so the pages render them in "
                        "the neutral fallback colour. Merge the ones you want, choosing "
                        "colours by the same adjacency/CIELab method parties.json "
                        "documents. Generated by tools/build-ls-results.py --propose."),
               "registry": "data/parties.json", "fallback": registry.get("fallback"),
               "proposed": out},
              open(dest, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    tot = sum(p["seats_total"] for p in out)
    print(f"wrote {dest}: {len(out)} parties covering {tot} seat-wins")
    for p in out[:12]:
        print(f"   {p['code']:<10} {p['seats_total']:>3} seats  {p['name'][:48]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, action="append")
    ap.add_argument("--check", action="store_true", help="report only, do not write")
    ap.add_argument("--propose", action="store_true",
                    help="list parties that win seats but are missing from parties.json")
    args = ap.parse_args()

    parties_doc = json.load(open(os.path.join(DATA, "parties.json"), encoding="utf-8"))
    regions_doc = json.load(open(os.path.join(DATA, "regions.json"), encoding="utf-8"))
    geo = GeoIndex(os.path.join(DATA, "geo", "india-pcs.json"), regions_doc)

    if args.propose:
        propose_party_additions(args.year or sorted(YEARS))
        return {}

    years = args.year or sorted(YEARS)
    report = {}
    for y in years:
        cfg = YEARS[y]
        log = {"year": y}
        ix = build_party_index(cfg, parties_doc,
                               borrow_from=[c for k, c in YEARS.items() if k != y])
        states = build_state_rows(cfg, geo, log)
        if cfg.get("detailed"):
            pcs = build_constituencies(cfg, ix, geo, log)
        elif cfg.get("state_only"):
            pcs = build_state_only_from_pdf(cfg, ix, geo, log)
        elif cfg.get("pdf_detailed"):
            pcs = build_constituencies_from_pdf(cfg, ix, geo, log)
        elif cfg.get("winners"):
            pcs = build_winners(cfg, ix, geo, log)
        else:
            pcs = {}
            log["pc_note"] = "no machine-readable source in this year's set"
        log["parties_seen"] = len(ix.bridge) // 2 + len(ix.by_norm)
        log["unresolved_party_names"] = len(ix.unresolved)
        log["top_unresolved"] = ix.unresolved.most_common(10)
        verify_numbers(cfg, geo, log, y)
        if not args.check:
            emit(y, cfg, pcs, states, ix, geo, log)
            if pcs and states:
                reconcile(y, cfg, pcs, states, ix, geo, log)
            elif pcs:
                # no second ECI table to check against (2009): the cross-check for
                # that year is the third-party comparison recorded in ECI-SOURCES.md
                log["reconcile"] = "no state-wise ECI table published for this year"
        report[y] = log
        if not args.check:
            audit_dir = os.path.join(RESEARCH)
            os.makedirs(audit_dir, exist_ok=True)
            json.dump(log, open(os.path.join(audit_dir, f"build-audit-{y}.json"), "w",
                                encoding="utf-8"), indent=1, ensure_ascii=False)
        print(json.dumps({k: v for k, v in log.items() if k != "reconcile_detail"},
                         indent=1, ensure_ascii=False))
    return report


if __name__ == "__main__":
    main()
