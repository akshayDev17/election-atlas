#!/usr/bin/env python3
"""Harvest published Lok Sabha by-election results from the ECI index cards.

Writes data/results/ls/byel/{2014,2019,2024}.json — one file per Lok Sabha
term, keyed by the general election that opened it — in the shape the national
and state pages read for the "as it stands" tense:

    {"seats": [{"uid": "S24_64", "seat": "64", "pc": "Gorakhpur", "st": "IN-UP",
                "general": {"p": "BJP", "n": "..."},
                "events": [{"type": "bye", "date": "2018-03-14", "poll": "2018-03-11",
                            "reason": "...", "turnout": 47.79, "src": 6,
                            "winner": {"n": "...", "p": "SP", "v": 456589,
                                       "o": {"BJP": 434788, "NOTA": 8331}}}]}]}

`date` is the date the result was declared (when the seat changed hands);
`poll` is polling day. `turnout` is `polled` / `electors` (percent), both counts
as printed on the index card. `src` indexes the document's `sources`.

Every by-election in a term is read from ECI's own index cards. Each card is
checked before use: candidate votes must add up to the card's valid-votes
total, the candidate count must equal "Contested", and the PC must join to
data/geo/india-pcs.json by state and number with a matching name.

Sources (all Election Commission of India):
  - 2014 to June 2018: the combined workbooks linked from the "Bye-Election
    Results" tab of https://www.eci.gov.in/statistical-reports (that page is
    rendered in the browser, so the links are listed here verbatim);
  - July 2018 to 2024: the old site's "Bye-Elections Result in Xls/Pdf Format"
    file pages, listed by the ECI API (old-assebly-by-election-innerpage-data);
  - 2025 on: the new backend's election-result categories, matched by cat_name.

A by-election whose ECI card cannot be used (see HELD) is still an event in
its seat, with `winner` null and `why` saying what is wrong with the card, so
the seat's holder reads as not available yet rather than as the general-election
winner. Seats vacated without a by-election having been held are not recorded:
the index cards cover polls, and no published source with the vacancy date has
been harvested.

Usage (from the repository root):
    python3 countries/IN/harvest/harvest-ls-byel.py
    python3 countries/IN/harvest/harvest-ls-byel.py --cache /tmp/harvest --dry-run
"""
import argparse
import datetime as dt
import difflib
import json
import re
import subprocess
import sys
from functools import lru_cache
from pathlib import Path
from urllib.parse import unquote

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))  # the repository root
from harvest.common import (DATA, DEFAULT_CACHE, UA, SourceShapeError, cell,  # noqa: E402
                            fetch, num, sheets, source_block, write_json)
from harvest.validate import require_valid  # noqa: E402

OLD_BYE = "https://old.eci.gov.in/ByeElection/"
COMBINED_WORKBOOKS = [  # 2014 to June 2018, as linked from www.eci.gov.in/statistical-reports
    OLD_BYE + "2014/Bye-Election%20PC%202014.xlsx",
    OLD_BYE + "2015/Bye%20Election%20%20PC%20&%20AC,%20Jan-April,%20%202015.xlsx",
    OLD_BYE + "2015/Bye-election%20PC%20and%20AC,%20June%20to%20Dec,%202015.xlsx",
    OLD_BYE + "2016/Bye-electionPCAC_Jan-June2016.xlsx",
    OLD_BYE + "2016/Bye-electionPCAC_July-Dec2016.xlsx",
    OLD_BYE + "2017/ByeElectionJan-Dec2017.xlsx",
    OLD_BYE + "2018/ByeElection(Jan-June2018).xlsx",
]
OLD_SITE_LISTING = ("https://www.eci.gov.in/eci-backend/public/api/"
                    "old-assebly-by-election-innerpage-data?categories=110")
API = "https://www.eci.gov.in/eci-backend/public/api/election-result?category_id={}"

TERMS = {  # general-election year -> term and the declaration-date window it owns
    2014: {"term": "16th Lok Sabha", "from": "2014-05-16", "to": "2019-05-23"},
    2019: {"term": "17th Lok Sabha", "from": "2019-05-23", "to": "2024-06-04"},
    2024: {"term": "18th Lok Sabha", "from": "2024-06-04", "to": "9999-12-31"},
}

# Cards whose own figures do not add up. Their results are not used: each one is
# an event with `winner` null and `why`, so the gap is visible rather than silent.
# Key: (workbook label, sheet name) -> what is wrong with the card. The label is
# the file name, or "old.eci file <id> r=<record>" for an old-site download.
HELD = {
    ("Bye-electionPCAC_July-Dec2016.xlsx", "14-Lakhimpur, Assam PC"):
        "candidate votes on the ECI index card add up to 85,543 against 988,789 valid votes",
    ("Bye-electionPCAC_July-Dec2016.xlsx", "30-Tamluk(Gen) West bengal PC"):
        "candidate votes on the ECI index card add up to 1,292,717 against 1,294,717 valid votes",
    ("old.eci file 9899 r=31801", "9-Bellory,Karnataka,PC"):
        "the party column of the ECI index card holds election symbols, not parties",
    ("old.eci file 9899 r=31801", "20-Mandya, KR,PC"):
        "the party column of the ECI index card is shifted by one row against the candidates",
    ("old.eci file 9899 r=31801", "14-Shimoga,KR,PC"):
        "the ECI index card has a candidate row with no name or party",
}

# The few state names an index card spells differently from the geometry.
STATE_ALIASES = {
    "jammu kashmir": "jammu and kashmir",
    "dadra nagar haveli": "dadra and nagar haveli and daman and diu",
}


# ── discovering the cards ────────────────────────────────────────────────────
PC_FILE = re.compile(r"(\bPC\b|-PC-|\bPC[- ]?\d|\(PC\))", re.I)


def workbook_label(url: str) -> str:
    m = re.search(r"/files/file/(\d+)-[^/]*/\?do=download&r=(\d+)", url)
    return f"old.eci file {m.group(1)} r={m.group(2)}" if m else unquote(url.rsplit("/", 1)[-1])


@lru_cache(maxsize=None)
def old_file_page(file_id: int) -> str:
    """Canonical old-site file page URL (the site redirects any slug to the real one)."""
    r = subprocess.run(["curl", "-s", "-m", "60", "-A", UA, "-o", "/dev/null", "-w", "%{redirect_url}",
                        f"https://old.eci.gov.in/files/file/{file_id}-x/"], capture_output=True)
    url = r.stdout.decode().strip()
    if not re.fullmatch(rf"https://old\.eci\.gov\.in/files/file/{file_id}-[a-z0-9-]+/", url):
        raise SourceShapeError(f"old.eci file {file_id}: no canonical redirect (got {url!r})")
    return url


def listed_card_files(cache):
    """URLs of PC index-card workbooks from the old-site listing and the new API."""
    urls = list(COMBINED_WORKBOOKS)
    listing = json.loads(fetch(OLD_SITE_LISTING, cache)["bytes"])
    if not listing.get("obsData"):
        raise SourceShapeError(f"{OLD_SITE_LISTING}: no obsData (API shape changed?)")
    for entry in listing["obsData"]:
        books = [a for a in entry.get("attachments_details") or []
                 if (a.get("record_realname") or "").lower().endswith((".xlsx", ".xls"))]
        # a page holding one combined workbook (e.g. July-Dec 2018) is read whole;
        # otherwise only the files named as parliamentary cards
        combined = len(books) == 1 and re.search(r"\b20(1[89]|2\d)\b", entry.get("heading") or "")
        for att in books:
            if combined or PC_FILE.search(att.get("record_realname") or ""):
                # the old site's own download link; the new backend's /api/download
                # proxy for the same record answers HTTP 500 for some files
                urls.append(f"{old_file_page(att['record_file_id'])}?do=download"
                            f"&r={att['record_id']}&confirm=1&t=1")
    misses, n = 0, 0
    while misses < 5:
        n += 1
        got = fetch(API.format(n), cache, missing_ok=True)
        doc = json.loads(got["bytes"]) if got else {}
        if not doc.get("cat_name"):
            misses += 1
            continue
        misses = 0
        if not re.search(r"\bbye", doc["cat_name"], re.I):
            continue
        for r in doc.get("results") or []:
            title = r.get("title") or ""
            if re.search(r"[-,]\s*PC\b", title) and r.get("xlsx_url"):
                urls.append(r["xlsx_url"])
    return urls


# ── reading one index card ───────────────────────────────────────────────────
def texts(row):
    return [cell(c) for c in row]


def last_count(row):
    """The last whole-number cell in a row (the TOTAL column on every card layout)."""
    for c in reversed(row):
        if isinstance(c, (int, float)) or (isinstance(c, str) and re.fullmatch(r"\s*\d+(\.0+)?\s*", c)):
            return num(c)
    return None


def find_row(rows, pattern, start=0, stop=None):
    rx = re.compile(pattern, re.I)
    for i in range(start, stop if stop is not None else len(rows)):
        if any(rx.search(t) for t in texts(rows[i])[:3]):
            return i
    return None


def date_options(v):
    """Possible calendar dates for a date cell. Text is read day-first, as ECI prints it.
    A spreadsheet date may have been auto-converted with day and month swapped, so both
    readings are offered when both are valid; the caller keeps the one that fits."""
    if isinstance(v, (dt.datetime, dt.date)):
        d = v.date() if isinstance(v, dt.datetime) else v
        opts = {d}
        if d.day <= 12:
            opts.add(dt.date(d.year, d.day, d.month))
        return opts
    m = re.fullmatch(r"(\d{1,2})[-./](\d{1,2})[-./](\d{4})", cell(v))
    if not m:
        return set()
    try:
        return {dt.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))}
    except ValueError:
        return set()


def settle_dates(poll_cell, declared_cell, where):
    """(poll, declared): the only reading where 0 <= declared - poll <= 60 days (a by-poll
    held alongside an assembly election is counted with it, up to five weeks later)."""
    fits = {(p, d) for p in date_options(poll_cell) for d in date_options(declared_cell)
            if 0 <= (d - p).days <= 60}
    if len(fits) != 1:
        raise SourceShapeError(f"{where}: cannot settle poll {poll_cell!r} / declared {declared_cell!r} ({sorted(fits)})")
    p, d = fits.pop()
    return p.isoformat(), d.isoformat()


def read_header(rows, where):
    """State, PC number and PC name from the card's first lines."""
    head = " | ".join(t for r in rows[:8] for t in texts(r) if t)
    st = re.search(r"Parliamentary Cons\w+\s+(?:of\s+)?([A-Za-z&. ]+?)\s*(?:,|\||$)", head, re.I)
    pc = re.search(r"(?:Number|No\.?)\s+and\s+name\s+(?:of\s+)?Parliamentary Cons\w+\s+"
                   r"0*(\d+)\s*(?:\((?:GEN|SC|ST)\))?\s*[-–]?\s*([^|]+)", head, re.I)
    if not st or not pc:
        raise SourceShapeError(f"{where}: no state / PC number line in the card header: {head[:200]}")
    return st.group(1).strip(), int(pc.group(1)), pc.group(2).strip()


def old_card_dates(rows, where):
    """(poll, declared) from the POLLING / COUNTING / DECLARATION OF RESULT block."""
    d = find_row(rows, r"^POLLING$")
    if d is None:
        raise SourceShapeError(f"{where}: no POLLING / COUNTING / DECLARATION header")
    labels = [t.upper() for t in texts(rows[d])]
    pc, dc = labels.index("POLLING"), labels.index("DECLARATION OF RESULT")
    return settle_dates(rows[d + 1][pc], rows[d + 1][dc], where)


def read_old_card(rows, where):
    """2014 to 2018 layout: sections I-VIII, candidate table S.No./Candidate/Party/Votes."""
    def section_total(label):
        i = find_row(rows, label)
        j = find_row(rows, r"^TOTAL$", i + 1) if i is not None else None
        if j is None:
            raise SourceShapeError(f"{where}: no TOTAL row under {label}")
        return last_count(rows[j])

    def labelled(label):
        i = find_row(rows, label)
        if i is None:
            raise SourceShapeError(f"{where}: no row {label}")
        return last_count(rows[i])

    electors = section_total(r"^II\.?\s*ELECTORS")
    voted = section_total(r"^V\.?\s*ELECTORS WHO VOTED")
    valid = labelled(r"^VALID$")
    nota = labelled(r"VOTES POLLED FOR .NOTA")
    contested = labelled(r"^CONTESTED$")
    poll, declared = old_card_dates(rows, where)
    c = find_row(rows, r"CAUSE OF VACANCY")
    reason = next((t for t in texts(rows[c])[1:] if t), "") if c is not None else ""
    h = find_row(rows, r"^S\.\s*No\.?$")
    if h is None:
        raise SourceShapeError(f"{where}: no S.No./Candidate/Party/Votes header")
    labels = [t.lower() for t in texts(rows[h])]
    si = next(i for i, t in enumerate(labels) if re.fullmatch(r"s\.\s*no\.?", t))
    ci, pi, vi = labels.index("candidate"), labels.index("party"), labels.index("votes")
    cands = []
    for row in rows[h + 1:]:
        t = texts(row)
        if not re.fullmatch(r"\d+(\.0+)?", t[si] or ""):
            break
        cands.append({"n": t[ci], "party": t[pi], "v": num(row[vi])})
    return electors, voted, valid, nota, contested, poll, declared, reason, cands


def read_new_card(rows, where):
    """2019 on (Form 21E layout): sections I-IX, candidate table with per-segment votes."""
    def labelled(label, start=0):
        i = find_row(rows, label, start)
        if i is None:
            raise SourceShapeError(f"{where}: no row {label}")
        return i

    sec2 = labelled(r"^ELECTORS$")
    electors = last_count(rows[labelled(r"^Total$", sec2)])
    sec6 = labelled(r"^COMBINED DETAILS")
    voted = last_count(rows[labelled(r"^Total votes polled", sec6)])
    valid = last_count(rows[labelled(r"^Total valid votes", sec6)])
    nota = last_count(rows[labelled(r"^Total votes polled for .NOTA", sec6)])
    contested = last_count(rows[labelled(r"^Contested$")])

    def value(label):
        return next((c for c in rows[labelled(label)][2:] if cell(c)), None)

    poll, declared = settle_dates(value(r"^Date\(s\)\s*Of Poll"), value(r"^Date of declaration"), where)
    reason = cell(value(r"^If yes, reasons? thereof"))
    h = labelled(r"^SL\.?\s*No")
    labels = [t.lower() for t in texts(rows[h])]
    pi = next(i for i, t in enumerate(labels) if "party" in t)
    ti = next((i for i, t in enumerate(labels) if t.startswith("total")), None)
    if ti is None:
        raise SourceShapeError(f"{where}: candidate table has no Total column")
    cands = []
    for row in rows[h + 1:]:
        t = texts(row)
        if re.fullmatch(r"total", t[0] or "", re.I):
            break
        if not re.fullmatch(r"\d+(\.0+)?", t[0] or ""):
            continue  # the assembly-segment sub-header row
        cands.append({"n": t[1], "party": t[pi], "v": num(row[ti])})
    return electors, voted, valid, nota, contested, poll, declared, reason, cands


def strip_elected_mark(name: str) -> str:
    """ECI marks the winner's name as elected: "(E)", "'E'", a trailing E after a space,
    or an E with diaeresis/acute or a euro sign from a lost encoding. It is an
    annotation, not the name; an E that ends the name itself (SULE) is kept."""
    return re.sub(r"""(?:\s+|\s*[("'])\s*['"]?(?:[EËÉ]|€)\s*['"]?\s*\)?\s*["']?$""", "", name).strip()


def read_card(rows, where):
    """-> card dict, or None when the sheet is not a parliamentary index card."""
    head = " ".join(t for r in rows[:6] for t in texts(r) if t)
    if not re.search(r"Parliamentary Cons", head, re.I):
        return None
    state, pc_no, pc_name = read_header(rows, where)
    reader = read_new_card if find_row(rows, r"^SL\.?\s*No") is not None else read_old_card
    electors, voted, valid, nota, contested, poll, declared, reason, cands = reader(rows, where)
    if None in (electors, voted, valid, nota, contested) or not cands:
        raise SourceShapeError(f"{where}: card is missing electors, votes or candidates")
    if any(c["v"] is None or not c["n"] or not c["party"] for c in cands):
        raise SourceShapeError(f"{where}: incomplete candidate row")
    if len(cands) != contested:
        raise SourceShapeError(f"{where}: {len(cands)} candidate rows, card says {contested} contested")
    if sum(c["v"] for c in cands) != valid:
        raise SourceShapeError(f"{where}: candidate votes sum {sum(c['v'] for c in cands)} != valid votes {valid}")
    cands.sort(key=lambda c: -c["v"])
    cands[0]["n"] = strip_elected_mark(cands[0]["n"])
    if len(cands) > 1 and cands[0]["v"] == cands[1]["v"]:
        raise SourceShapeError(f"{where}: tie at the top")
    return {"state": state, "pc_no": pc_no, "pc_name": pc_name, "poll": poll, "declared": declared,
            "reason": reason, "electors": electors, "voted": voted, "nota": nota, "cands": cands}


# ── joining to the atlas ─────────────────────────────────────────────────────
def key(s) -> str:
    s = re.sub(r"\((?:gen|sc|st|s\.?\s*t\.?|s\.?\s*c\.?)\)", " ", str(s).lower())
    s = s.replace("&", " and ")
    return " ".join(re.sub(r"[^a-z]+", " ", s).split())


def geometry_index():
    topo = json.loads((DATA / "geo" / "india-pcs.json").read_text())
    regions = json.loads((DATA / "regions.json").read_text())["regions"]
    region_of = {key(n): r["code"] for r in regions for n in [r["name"], *r.get("sourceNames", [])]}
    seats = {}
    for g in topo["objects"]["pcs"]["geometries"]:
        p = g["properties"]
        seats[(key(p["state_ut_name"]), int(p["ls_seat_code"]))] = {
            "uid": p["unique_id"], "seat": p["ls_seat_code"], "pc": p["ls_seat_name"],
            "st": region_of.get(key(p["state_ut_name"]))}
    if any(not s["st"] for s in seats.values()):
        raise SourceShapeError("a geometry state name has no region in regions.json")
    return seats


def name_variants(geo_name: str):
    """'Kaziranga (ex Kaliabor)' -> {'kaziranga', 'kaliabor'}: the boundary set notes a
    seat's former name, which older index cards still print."""
    out = {key(re.sub(r"\([^)]*\)", " ", geo_name))}
    out |= {key(m) for m in re.findall(r"\(ex ([^)]*)\)", geo_name, re.I)}
    return out


def join(card, seats, where):
    """The geometry seat for a card: by state and name (numbers changed with Assam's 2023
    delimitation, which the boundary set follows), falling back to the PC number."""
    state = key(card["state"])
    state = STATE_ALIASES.get(state, state)
    in_state = [s for (st, _), s in seats.items() if st == state]
    if not in_state:
        raise SourceShapeError(f"{where}: no geometry for state {card['state']!r}")
    name = key(re.sub(r",.*$", "", card["pc_name"]))
    named = [s for s in in_state if name in name_variants(s["pc"])]
    if len(named) == 1:
        return named[0]
    seat = seats.get((state, card["pc_no"]))
    if seat and any(name in v or v in name or difflib.SequenceMatcher(None, name, v).ratio() >= 0.8
                    for v in name_variants(seat["pc"])):
        return seat
    raise SourceShapeError(f"{where}: card PC {card['pc_no']} {card['pc_name']!r} matches no geometry seat in {card['state']}")


# Party spellings an index card prints that no ECI party list carries: the 2016
# Tura card prints "NPP" for the National People's Party, which ECI's statistical
# reports abbreviate NPEP.
PRINTED_ALIASES = {"npp": "NPEP"}

# Old-site categories holding the 2014 and 2019 Lok Sabha statistical reports
# (linked from www.eci.gov.in/statistical-reports); 2024 is on the new backend.
LS_REPORT_CATEGORIES = {2014: 97, 2019: 1551}


def norm_party(s) -> str:
    s = str(s or "").lower().replace("&", " and ").replace("'", "")
    s = re.sub(r"\bj\s*and\s*k\b", "jammu and kashmir", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(re.sub(r"\b(and|the|of)\b", " ", s).split())


def read_party_list(body: bytes, where: str):
    """Table 3, "List of Political Parties Participated" -> {normalised name: abbreviation}."""
    rows = next(iter(sheets(body).values()))
    h = next((i for i, row in enumerate(rows[:8]) if "ABBREVIATION" in [t.upper() for t in texts(row)]), None)
    if h is None:
        raise SourceShapeError(f"{where}: no ABBREVIATION header in the party list")
    cols = [t.upper() for t in texts(rows[h])]
    ai, ni = cols.index("ABBREVIATION"), cols.index("PARTY NAME")
    out = {norm_party(row[ni]): cell(row[ai]) for row in rows[h + 1:] if cell(row[ai]) and cell(row[ni])}
    if len(out) < 100:
        raise SourceShapeError(f"{where}: only {len(out)} parties listed")
    return out


def eci_party_names(cache):
    """{general-election year: {normalised full name: ECI abbreviation}} from table 3 of
    each Lok Sabha statistical report. Newer index cards print full party names; this
    ties them back to the abbreviations the general-election files use."""
    lists = {}
    for year, category in LS_REPORT_CATEGORIES.items():
        url = ("https://www.eci.gov.in/eci-backend/public/api/"
               f"old-assebly-by-election-innerpage-data?categories={category}")
        listing = json.loads(fetch(url, cache)["bytes"])
        if str(year) not in (listing.get("title") or ""):
            raise SourceShapeError(f"{url}: expected the {year} Lok Sabha report, got {listing.get('title')!r}")
        att = next((a for e in listing.get("obsData") or [] for a in e.get("attachments_details") or []
                    if re.search(r"List of Political Parties Participated\.xlsx?$", a.get("record_realname") or "", re.I)),
                   None)
        if att is None:
            raise SourceShapeError(f"{url}: no 'List of Political Parties Participated' spreadsheet")
        got = fetch(f"{old_file_page(att['record_file_id'])}?do=download&r={att['record_id']}&confirm=1&t=1", cache)
        lists[year] = read_party_list(got["bytes"], got["url"])
    for n in range(1, 60):
        got = fetch(API.format(n), cache, missing_ok=True)
        doc = json.loads(got["bytes"]) if got else {}
        if not re.search(r"General Election to Lok\s*sabha.?2024", doc.get("cat_name") or "", re.I):
            continue
        for r in doc.get("results") or []:
            if re.search(r"List of Political Parties Participated", r.get("title") or "", re.I):
                lists[2024] = read_party_list(fetch(r["xlsx_url"], cache)["bytes"], r["xlsx_url"])
        break
    if 2024 not in lists:
        raise SourceShapeError("ECI 2024 Lok Sabha table 3 (List of Political Parties Participated) not found")
    return lists


def party_code_map(parties_doc, eci_lists):
    """(printed party, term year) -> the atlas code: parties.json where it covers the party,
    else the ECI abbreviation (the term's own report first), else the printed text verbatim."""
    by_norm = {"independent": "IND", "ind": "IND"}
    for p in parties_doc["parties"]:
        for k in [p["code"], p["name"], *p.get("aliases", [])]:
            by_norm.setdefault(norm_party(k), p["code"])

    def code_for(printed, year):
        n = norm_party(printed)
        if n in PRINTED_ALIASES:
            printed, n = PRINTED_ALIASES[n], norm_party(PRINTED_ALIASES[n])
        if n in by_norm:
            return by_norm[n]
        for y in [year, *sorted(eci_lists, reverse=True)]:
            abbr = eci_lists[y].get(n)
            if abbr:
                return by_norm.get(norm_party(abbr), abbr)
        return printed
    return code_for


# ── assembling a term ────────────────────────────────────────────────────────
def build(cache):
    seats = geometry_index()
    code_for = party_code_map(json.loads((DATA / "parties.json").read_text()), eci_party_names(cache))
    cards, held = {}, []  # (uid, declared) -> (card, seat, fetched); held cards
    for url in listed_card_files(cache):
        got = fetch(url, cache, min_bytes=1024)
        for sheet, rows in sheets(got["bytes"]).items():
            fname = workbook_label(url)
            where = f"{fname[:60]} [{sheet}]"
            if (fname, sheet) in HELD:
                state, pc_no, pc_name = read_header(rows, where)
                seat = join({"state": state, "pc_no": pc_no, "pc_name": pc_name}, seats, where)
                _, declared = old_card_dates(rows, where)
                held.append({**{k: seat[k] for k in ("uid", "seat", "pc", "st")}, "date": declared,
                             "why": HELD[(fname, sheet)], "src": got, "key": (fname, sheet)})
                continue
            card = read_card(rows, where)
            if card is None:
                continue
            seat = join(card, seats, where)
            k = (seat["uid"], card["declared"])
            if k in cards:
                prev = cards[k][0]
                if prev["cands"] != card["cands"]:
                    raise SourceShapeError(f"{where}: {seat['pc']} {card['declared']} listed twice with different results")
                continue
            cards[k] = (card, seat, got)
    missing = set(HELD) - {h["key"] for h in held}
    if missing:
        raise SourceShapeError(f"HELD lists cards that were not found: {sorted(missing)}")
    return cards, held, code_for


def term_doc(year, cards, held, code_for):
    spec = TERMS[year]
    general = json.loads((DATA / "results" / "ls" / "pc" / f"{year}.json").read_text())["constituencies"]
    detail_path = DATA / "results" / "ls" / "detail" / f"{year}.json"
    detail = json.loads(detail_path.read_text())["constituencies"] if detail_path.exists() else {}
    picked = sorted(((c, s, g) for c, s, g in cards.values() if spec["from"] <= c["declared"] < spec["to"]),
                    key=lambda t: (t[0]["declared"], t[1]["uid"]))
    sources, src_index, by_seat = [], {}, {}

    def src_of(got):
        if got["url"] not in src_index:
            src_index[got["url"]] = len(sources)
            sources.append(source_block("eci", got))
        return src_index[got["url"]]

    def events_of(seat):
        if seat["uid"] not in by_seat:
            g = general.get(seat["uid"])
            if not g:
                raise SourceShapeError(f"{seat['uid']} has no {year} general result to start the term from")
            gen = {"p": g["p"]}
            top = (detail.get(seat["uid"]) or {}).get("c") or []
            if top:
                gen["n"] = top[0]["n"]
            by_seat[seat["uid"]] = {**{k: seat[k] for k in ("uid", "seat", "pc", "st")},
                                    "general": gen, "events": []}
        return by_seat[seat["uid"]]["events"]

    for card, seat, got in picked:
        win, rest = card["cands"][0], card["cands"][1:]
        others = {}
        for c in rest:
            others[code_for(c["party"], year)] = others.get(code_for(c["party"], year), 0) + c["v"]
        others["NOTA"] = card["nota"]
        events_of(seat).append({
            "type": "bye", "date": card["declared"], "poll": card["poll"], "reason": card["reason"],
            "winner": {"n": win["n"], "p": code_for(win["party"], year), "v": win["v"], "o": others},
            "turnout": round(100 * card["voted"] / card["electors"], 2),
            "electors": card["electors"], "polled": card["voted"],
            "src": src_of(got)})
    if not sources:
        raise SourceShapeError(f"{year}: no by-election cards found in the term window")
    for h in held:
        if spec["from"] <= h["date"] < spec["to"]:
            events_of(h).append({"type": "bye", "date": h["date"], "winner": None,
                                 "why": h["why"], "src": src_of(h["src"])})
    for seat in by_seat.values():
        seat["events"].sort(key=lambda e: e["date"])
    return {
        "schema": 2, "election": "ls", "cycle": year, "term": spec["term"],
        "provenance": "published", "source": sources[0], "sources": sources,
        "note": ("Published Election Commission of India by-election results for the term, one event "
                 "per poll, read from ECI's index cards. `date` is the declaration of result, `poll` is "
                 "polling day, `turnout` is votes polled over electors as printed on the card, and `src` "
                 "indexes `sources`. `general.n` is present where the general-election candidate file "
                 "exists. `winner` is null where the poll's ECI card cannot be used (`why`); a seat whose "
                 "latest event has no winner has no known holder yet. Seats vacated without a by-election held are not recorded here."),
        "seats": sorted(by_seat.values(), key=lambda s: (s["st"], int(s["seat"]))),
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Harvest ECI Lok Sabha by-election results per term.")
    ap.add_argument("--cache", default=str(DEFAULT_CACHE))
    ap.add_argument("--out", default=str(DATA / "results" / "ls" / "byel"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    cards, held, code_for = build(args.cache)
    outputs = {}
    for year in TERMS:
        doc = term_doc(year, cards, held, code_for)
        outputs[Path(args.out) / f"{year}.json"] = doc
        events = [(s, e) for s in doc["seats"] for e in s["events"]]
        print(f"{year} ({doc['term']}): {len(events)} by-elections in {len(doc['seats'])} seats")
        for s, e in events:
            w = e["winner"]
            print(f"   {e['date']}  {s['pc']:<22} {s['st']}  "
                  + (f"{w['n']} ({s['general']['p']} -> {w['p']})" if w else f"WINNER NOT AVAILABLE: {e['why']}"))
    require_valid(outputs, args.cache)
    if not args.dry_run:
        for path, doc in outputs.items():
            write_json(path, doc)
        print(f"wrote {len(outputs)} files under {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
