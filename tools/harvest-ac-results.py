#!/usr/bin/env python3
"""Harvest published assembly results from the ECI statistical reports.

For each state/cycle below this reads the report's "10 - Detailed Results"
spreadsheet (one row per candidate) and writes the two files the state page
reads, at the real cycle's path:

    data/results/ac/{STATE}/{year}.json         winner + votes per AC  (colours the map)
    data/results/ac/{STATE}/{year}-detail.json  every candidate per AC (the hover card)

Before writing, each cycle is cross-checked against two other tables of the
same report, and the harvester stops if either disagrees:
  - seats won per party  == "5 - Performance of Political Parties"
  - contesting candidates == "9 - Candidate Data Summary"

Sources:
  - new ECI site: https://www.eci.gov.in/eci-backend/public/api/election-result?category_id=N
    (categories are matched by cat_name, never by a hard-coded id)
  - old ECI site: https://old.eci.gov.in/files/file/<id>-<slug>/?do=download
    (works without the csrfKey or a cookie)

Only spreadsheet cycles are harvested, and a cycle marked "hold" is skipped
unless named with --only (see its comment for why). The PDF-only cycles (UP 2012, PB 2012,
HR 2014, OD 2014, BR 2015, CT 2013, CT 2018) are not, and stay "not available yet".

Usage (from the repository root):
    python3 tools/harvest-ac-results.py                 # all cycles
    python3 tools/harvest-ac-results.py --only IN-UP:2022
    python3 tools/harvest-ac-results.py --cache /tmp/harvest --dry-run
"""
import argparse
import collections
import html
import io
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest_common import (DATA, DEFAULT_CACHE, SourceShapeError, cell, fetch,  # noqa: E402
                            num, sheets, source_block, write_json)
from validate_records import require_valid  # noqa: E402

API = "https://www.eci.gov.in/eci-backend/public/api/election-result?category_id={}"
OLD = "https://old.eci.gov.in/files/file/{id}-{slug}/"
CT_2023 = "https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/chhattisgarh/2023/"

STATE_NAMES = {
    "IN-UP": "Uttar Pradesh", "IN-WB": "West Bengal", "IN-BR": "Bihar", "IN-TN": "Tamil Nadu",
    "IN-OD": "Odisha", "IN-PB": "Punjab", "IN-CT": "Chhattisgarh", "IN-HR": "Haryana",
}

# The 17 spreadsheet cycles. Each names exactly one way to find its report.
CYCLES = [
    {"region": "IN-UP", "year": 2017, "old": (3471, "uttar-pradesh-general-legislative-election-2017")},
    {"region": "IN-UP", "year": 2022, "old": (14185, "uttar-pradesh-general-legislative-election-2022")},
    {"region": "IN-WB", "year": 2016, "old": (3469, "west-bengal-general-legislative-election-2016")},
    {"region": "IN-WB", "year": 2021, "old": (14106, "west-bengal-general-legislative-election-2021-including-ac-56-58")},
    {"region": "IN-WB", "year": 2026, "api": r"Legislative Assembly of West Bengal 2026 Including AC 144"},
    {"region": "IN-BR", "year": 2020, "old": (12787, "bihar-legislative-election-2020")},
    {"region": "IN-BR", "year": 2025, "api": r"Legislative Assembly of Bihar October to November 2025 Statistical Report"},
    {"region": "IN-TN", "year": 2016, "old": (3473, "tamil-nadu-general-legislative-election-2016"),
     # Held: the report disagrees with itself. Table 10 gives ADMK 134 / DMK 89
     # seats; table 5 prints 135 / 88. The cross-check cannot pass, and this
     # harvester does not pick a side, so the cycle stays "not available yet".
     # Run it with --only IN-TN:2016 to see the check fail.
     "hold": "table 5 seats (ADMK 135, DMK 88) disagree with table 10 (ADMK 134, DMK 89)"},
    {"region": "IN-TN", "year": 2021, "old": (13680, "tamil-nadu-general-legislative-election-2021")},
    {"region": "IN-TN", "year": 2026, "api": r"Legislative Assembly of Tamil Nadu 2026"},
    {"region": "IN-OD", "year": 2019, "old": (11679, "odisha-legislative-assembly-election-2019")},
    {"region": "IN-OD", "year": 2024, "api": r"Odisha Legislative Assembly Election.?2024"},
    {"region": "IN-PB", "year": 2017, "old": (3614, "punjab-general-legislative-election-2017")},
    {"region": "IN-PB", "year": 2022, "old": (14165, "punjab-general-legislative-election-2022")},
    {"region": "IN-CT", "year": 2023, "direct": {
        "detail": CT_2023 + "Detailed_Results.xlsx",
        "perf": CT_2023 + "Performance_of_Political_Parties.xlsx",
        "cand": CT_2023 + "Candidate_Data_Summary.xlsx",
        "parties": CT_2023 + "List_Of_Political_Parties_Participated.xlsx"}},
    {"region": "IN-HR", "year": 2019, "old": (11697, "haryana-legislative-assembly-election-2019")},
    {"region": "IN-HR", "year": 2024, "api": r"Haryana Legislative Assembly Election.*2024"},
]


# ── locating the three report files ──────────────────────────────────────────
def report_kind(title: str):
    """'10 - Detailed Results.xlsx' -> 'detail'; also 'perf', 'cand', 'parties'."""
    base = re.sub(r"\.(xlsx|xls|pdf)$", "", title.strip(), flags=re.I)
    base = re.sub(r"^\s*\d+\s*[-.]?\s*", "", base).strip().lower()
    base = re.sub(r"\s+", " ", base)
    if re.fullmatch(r"detailed results?", base):
        return "detail"
    if re.fullmatch(r"performance of pol?i?tical parties", base):
        return "perf"
    if re.fullmatch(r"candidates? data summary", base):
        return "cand"
    if re.fullmatch(r"list of political parties participated", base):
        return "parties"
    return None


def pick(found: dict, kind: str, cycle_id: str, required=True):
    """Prefer the spreadsheet; fall back to the PDF only for the summary tables."""
    options = found.get(kind, {})
    for ext in ("xlsx", "xls"):
        if ext in options:
            return options[ext], ext
    if kind in ("cand",) and "pdf" in options:
        return options["pdf"], "pdf"
    if required:
        raise SourceShapeError(f"{cycle_id}: no spreadsheet for '{kind}' in the report (have {sorted(options)})")
    return None, None


def locate_old(cycle, cache):
    fid, slug = cycle["old"]
    base = OLD.format(id=fid, slug=slug)
    page = fetch(base + "?do=download", cache)
    text = page["bytes"].decode("utf-8", "replace")
    found = collections.defaultdict(dict)
    for m in re.finditer(r"<li[^>]*class=.ipsDataItem[^>]*>(.*?)</li>", text, re.S):
        block = m.group(1)
        label = " ".join(re.sub(r"<[^>]+>", " ", block).split())
        name = re.match(r"(.*?\.(xlsx|xls|pdf))\b", label, re.I)
        link = re.search(r"[?&]r=(\d+)", html.unescape(block))
        if not name or not link:
            continue
        kind = report_kind(name.group(1))
        if kind:
            ext = name.group(2).lower()
            if ext in found[kind]:
                raise SourceShapeError(f"{base}: two '{kind}' .{ext} files listed")
            found[kind][ext] = f"{base}?do=download&r={link.group(1)}&confirm=1&t=1"
    if not found:
        raise SourceShapeError(f"{base}: download page lists no report files (layout changed?)")
    return found


_categories = None


def api_categories(cache):
    """Every category the new ECI backend answers, walked until it stops answering."""
    global _categories
    if _categories is None:
        _categories, misses, n = [], 0, 0
        while misses < 5:
            n += 1
            got = fetch(API.format(n), cache, missing_ok=True)
            doc = json.loads(got["bytes"]) if got else {}
            if not doc.get("cat_name"):
                misses += 1
                continue
            misses = 0
            _categories.append(doc)
    return _categories


def locate_api(cycle, cache):
    want = re.compile(cycle["api"], re.I)
    hits = []
    for doc in api_categories(cache):
        name = " ".join(doc["cat_name"].split())
        if not want.search(name):
            continue
        found = collections.defaultdict(dict)
        for r in doc.get("results") or []:
            kind = report_kind(r.get("title") or "")
            if not kind:
                continue
            if r.get("xlsx_url"):
                found[kind][(r.get("xls_extension") or "xlsx").lower()] = r["xlsx_url"]
            if r.get("pdf_zip_url"):
                found[kind]["pdf"] = r["pdf_zip_url"]
        if "detail" in found:
            hits.append((name, found))
    if len(hits) != 1:
        raise SourceShapeError(
            f"{cycle['region']} {cycle['year']}: {len(hits)} ECI categories match /{cycle['api']}/ "
            f"with a Detailed Results file ({[h[0] for h in hits]}); expected exactly one")
    return hits[0][1]


def locate(cycle, cache):
    if "old" in cycle:
        return locate_old(cycle, cache)
    if "api" in cycle:
        return locate_api(cycle, cache)
    return {k: {u.rsplit(".", 1)[1].lower(): u} for k, u in cycle["direct"].items()}


# ── spreadsheet reading ──────────────────────────────────────────────────────
def header_index(rows, required):
    """Find the header row containing every required label; return (row index, {label: col})."""
    for i, row in enumerate(rows[:12]):
        labels = [cell(c).upper() for c in row]
        if all(any(lab == r for lab in labels) for r in required):
            return i, {lab: j for j, lab in enumerate(labels) if lab}
    raise SourceShapeError(f"no header row with {required}")


# ── parsing the three tables ─────────────────────────────────────────────────
NEW_COLS = ("AC NO.", "AC NAME", "CANDIDATE NAME", "PARTY", "GENERAL", "POSTAL", "TOTAL")
OLD_COLS = ("CONSTITUENCY NO.", "CONSTITUENCY NAME", "CANDIDATE NAME", "PARTY NAME",
            "VALID VOTES POLLED IN GENERAL", "VALID VOTES POLLED IN POSTAL", "TOTAL VALID VOTES")


def parse_detail(body: bytes, state_name: str, cycle_id: str):
    """-> {ac_no: {"ac": name, "c": [{n, p(ECI abbreviation), v}, ...]}} in source order."""
    rows = next(iter(sheets(body).values()))
    try:
        h, col = header_index(rows, NEW_COLS)
        cols, state_col = NEW_COLS, col.get("STATE/UT NAME")
    except SourceShapeError:
        h, col = header_index(rows, OLD_COLS)
        cols, state_col = OLD_COLS, None
    c_no, c_name, c_cand, c_party, c_gen, c_post, c_total = (col[k] for k in cols)
    acs, last_no = {}, None
    for r_i, row in enumerate(rows[h + 1:], start=h + 2):
        if not any(cell(c) for c in row):
            continue
        label = cell(row[0]).upper()
        if re.fullmatch(r"TURN ?OUT", label):
            # per-AC subtotal row: it must equal the candidates just read, or the
            # rows were not grouped the way this parser assumes
            got = sum(c["v"] for c in acs[last_no]["c"]) if last_no in acs else None
            if got != num(row[c_total]):
                raise SourceShapeError(f"{cycle_id} row {r_i}: TURN OUT {row[c_total]} != AC {last_no} sum {got}")
            continue
        if re.fullmatch(r"GRAND TOTAL ?:?", label):
            got = sum(c["v"] for a in acs.values() for c in a["c"])
            if got != num(row[c_total]):
                raise SourceShapeError(f"{cycle_id} row {r_i}: GRAND TOTAL {row[c_total]} != sum of rows {got}")
            continue
        no = num(row[c_no]) if c_no < len(row) else None
        if no is None:
            # trailing disclaimer / footnote lines carry text but no AC number
            if any(cell(c) for c in row[c_cand:c_total + 1]):
                raise SourceShapeError(f"{cycle_id} row {r_i}: candidate data without an AC number: {row}")
            continue
        if state_col is not None and cell(row[state_col]).lower() != state_name.lower():
            raise SourceShapeError(f"{cycle_id} row {r_i}: state {row[state_col]!r}, expected {state_name}")
        name = re.sub(r"^\d+\s+", "", cell(row[c_cand]))
        party = cell(row[c_party])
        gen, post, total = num(row[c_gen]), num(row[c_post]), num(row[c_total])
        if not name or not party:
            raise SourceShapeError(f"{cycle_id} row {r_i}: incomplete candidate row {row}")
        if total is None and gen is None and post is None:
            pass  # no votes at all: an AC whose poll is not in this report (checked per AC below)
        elif total is None or (gen or 0) + (post or 0) != total:
            raise SourceShapeError(f"{cycle_id} row {r_i}: general {gen} + postal {post} != total {total}")
        if party.upper() == "NOTA" or name.upper() == "NOTA":
            name, party = "NOTA", "NOTA"
        entry = acs.setdefault(no, {"ac": cell(row[c_name]), "c": []})
        if entry["ac"] != cell(row[c_name]):
            raise SourceShapeError(f"{cycle_id} row {r_i}: AC {no} named both {entry['ac']!r} and {row[c_name]!r}")
        entry["c"].append({"n": name, "p": party, "v": total})
        last_no = no
    if not acs:
        raise SourceShapeError(f"{cycle_id}: no candidate rows")
    for no, entry in acs.items():
        blank = [c["v"] is None for c in entry["c"]]
        if any(blank) and not all(blank):
            raise SourceShapeError(f"{cycle_id} AC {no}: some candidates have votes and some have none")
        entry["polled"] = not all(blank)
    return acs


def parse_party_names(body: bytes):
    """'List of Political Parties Participated' -> {normalised full name: abbreviation},
    from either layout of table 3 (2016-17: PARTY NAME / PARTY ABBREVIATION; later:
    ABBREVIATION / PARTY)."""
    rows = next(iter(sheets(body).values()))
    try:
        h, col = header_index(rows, ("PARTY NAME", "PARTY ABBREVIATION"))
        name_col, abbr_col = col["PARTY NAME"], col["PARTY ABBREVIATION"]
    except SourceShapeError:
        h, col = header_index(rows, ("ABBREVIATION", "PARTY"))
        name_col, abbr_col = col["PARTY"], col["ABBREVIATION"]
    out = {"independent": "IND", "none of the above": "NOTA"}
    for row in rows[h + 1:]:
        if max(name_col, abbr_col) >= len(row):
            continue
        name, abbr = cell(row[name_col]), cell(row[abbr_col])
        if name and abbr:
            out[name.lower()] = abbr
    return out


def parse_perf(body: bytes, party_names: dict, cycle_id: str):
    """-> {ECI abbreviation: seats won}, from either layout of table 5.

    The 2016-17 layout names parties in full; party_names (table 3's full name ->
    abbreviation map) turns them into abbreviations."""
    rows = next(iter(sheets(body).values()))
    try:
        h, col = header_index(rows, ("ABBREVIATION", "WON"))
        key_col, by_name = col["ABBREVIATION"], False
    except SourceShapeError:
        h, col = header_index(rows, ("PARTY NAME", "WON"))
        key_col, by_name = col["PARTY NAME"], True
    won = {}
    for row in rows[h + 1:]:
        if key_col >= len(row) or col["WON"] >= len(row):
            continue
        key, w = cell(row[key_col]), row[col["WON"]]
        if not key or (isinstance(w, str) and not w.strip()) or w is None:
            continue  # section headers ("NATIONAL PARTIES") and totals with no party
        if key.lower() in ("total", "grand total"):
            continue
        w = num(w) or 0
        if by_name:
            abbr = party_names.get(key.lower())
            if abbr is None:
                if w:
                    raise SourceShapeError(f"{cycle_id}: table 5 party {key!r} won {w} but has no abbreviation in table 3")
                continue
            key = abbr
        won[key] = won.get(key, 0) + w
    if not won:
        raise SourceShapeError(f"{cycle_id}: table 5 has no party rows")
    return won


def parse_cand(body: bytes, ext: str, cycle_id: str) -> int:
    """Contesting candidates (all categories, all genders) from table 9."""
    if ext == "pdf":
        from pypdf import PdfReader
        text = " ".join(p.extract_text() or "" for p in PdfReader(io.BytesIO(body)).pages)
        m = re.search(r"5\.\s*CONTESTING CANDIDATES(.*?)6\.\s*FORFEITED", text, re.S)
        if not m:
            raise SourceShapeError(f"{cycle_id}: table 9 PDF has no CONTESTING CANDIDATES section")
        nums = [int(x) for x in re.findall(r"\b\d+\b", m.group(1).split("d.Total", 1)[-1])]
        # GEN, SC, ST and TOTAL, each as male / female / total
        if len(nums) != 12 or nums[2] + nums[5] + nums[8] != nums[11]:
            raise SourceShapeError(f"{cycle_id}: table 9 PDF contesting block is not 4x(m,f,total): {nums}")
        return nums[11]
    book = sheets(body)
    if "Contesting Candidates" in book:  # 2016-17 layout: one sheet per section, no totals filled
        total = 0
        for row in book["Contesting Candidates"]:
            if cell(row[0]).lower() in ("male", "female", "third gender"):
                total += sum(num(c) or 0 for c in row[1:4])
        if not total:
            raise SourceShapeError(f"{cycle_id}: table 9 'Contesting Candidates' sheet has no counts")
        return total
    rows = next(iter(book.values()))
    h, col = header_index(rows, ("TOTAL",))
    in_section = False
    for row in rows[h + 1:]:
        label = cell(row[0]).upper()
        if re.match(r"\d+\.", label):
            in_section = "CONTESTING CANDIDATES" in label
        elif in_section and re.match(r"D\.\s*TOTAL", label):
            return num(row[col["TOTAL"]])
    raise SourceShapeError(f"{cycle_id}: table 9 has no '5. CONTESTING CANDIDATES / d. Total' row")


# ── party codes and geometry ─────────────────────────────────────────────────
def norm(s) -> str:
    s = str(s or "").lower().replace("&", " and ").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    s = re.sub(r"\b(and|the|of)\b", " ", s)
    return " ".join(s.split())


def party_code_map(parties_doc):
    """(ECI abbreviation, table 3 {abbreviation: full name}) -> atlas code, as the Lok Sabha
    files carry it: parties.json where it covers the party by table 3's full name, or by the
    abbreviation when table 3 gives no full name (an abbreviation never overrides the full
    name: TN 2026's TMC is not Trinamool), otherwise the abbreviation reduced to its letters
    and digits (CPI(ML)(L) -> CPIMLL)."""
    by_norm = {}
    for p in parties_doc["parties"]:
        for key in [p["code"], p["name"], *p.get("aliases", [])]:
            by_norm.setdefault(norm(key), p["code"])

    def code_for(abbr, full_names):
        if abbr in ("NOTA", "IND"):
            return abbr
        key = full_names.get(abbr) or abbr
        if norm(key) in by_norm:
            return by_norm[norm(key)]
        code = re.sub(r"[^A-Za-z0-9]", "", abbr)[:14]
        if not code:
            raise SourceShapeError(f"party abbreviation {abbr!r} has no letters or digits")
        return code
    return code_for


def geo_ac_numbers(region: str):
    topo = json.loads((DATA / "geo" / "ac" / f"{region}.json").read_text())
    geoms = topo["objects"]["acs"]["geometries"]
    return {g["properties"]["no"]: g["properties"]["ac"] for g in geoms}


# ── one cycle ────────────────────────────────────────────────────────────────
def colour_entry(cands, winner, code):
    """One AC's colour-file entry: the winner's party `p` and votes `v`, and `o`, every
    other candidate's votes summed by party code (NOTA included), as the Lok Sabha files
    carry it, so the page's vote totals count every vote, not only the winners'."""
    others = collections.Counter()
    for c in cands:
        if c is not winner and c["v"]:
            others[code(c["p"])] += c["v"]
    return {"p": code(winner["p"]), "v": winner["v"], "o": dict(others)}


def harvest(cycle, cache, code_for):
    region, year = cycle["region"], cycle["year"]
    cid = f"{region} {year}"
    found = locate(cycle, cache)
    detail_url, ext = pick(found, "detail", cid)
    perf_url, _ = pick(found, "perf", cid)
    cand_url, cand_ext = pick(found, "cand", cid)
    detail_got = fetch(detail_url, cache, min_bytes=2048)
    acs = parse_detail(detail_got["bytes"], STATE_NAMES[region], cid)

    geo = geo_ac_numbers(region)
    extra, absent = set(acs) - set(geo), set(geo) - set(acs)
    if extra or len(absent) > 3:
        raise SourceShapeError(
            f"{cid}: AC numbers in the report do not match the boundary set "
            f"(missing {sorted(absent)[:10]}, extra {sorted(extra)[:10]})")

    parties_url, _ = pick(found, "parties", cid)
    party_names = parse_party_names(fetch(parties_url, cache)["bytes"])
    full_names = {abbr: name for name, abbr in party_names.items()}
    published_won = parse_perf(fetch(perf_url, cache)["bytes"], party_names, cid)
    published_cands = parse_cand(fetch(cand_url, cache)["bytes"], cand_ext, cid)

    seats, colour, detail = collections.Counter(), {}, {}
    # ACs with no result in this report: listed with candidates but no votes, or
    # not listed at all (a poll countermanded and held later, e.g. TN 2016, OD 2019)
    no_result = {str(no): a["ac"] for no, a in acs.items() if not a["polled"]}
    no_result.update({str(no): geo[no] for no in absent})
    no_result = dict(sorted(no_result.items(), key=lambda kv: int(kv[0])))
    for no in sorted(acs):
        if not acs[no]["polled"]:
            continue
        cands = sorted(acs[no]["c"], key=lambda c: -c["v"])
        field = [c for c in cands if c["p"] != "NOTA"]
        if len(field) > 1 and field[0]["v"] == field[1]["v"]:
            raise SourceShapeError(f"{cid} AC {no}: tie at the top ({field[0]['n']} / {field[1]['n']})")
        seats[field[0]["p"]] += 1
        colour[str(no)] = colour_entry(cands, field[0], lambda abbr: code_for(abbr, full_names))
        detail[str(no)] = {"ac": acs[no]["ac"],
                           "c": [{"n": c["n"], "p": code_for(c["p"], full_names), "v": c["v"]} for c in cands]}

    counted_cands = sum(1 for a in acs.values() if a["polled"] for c in a["c"] if c["p"] != "NOTA")
    published_won = {k: v for k, v in published_won.items() if v}
    check = {
        "cycle": cid, "acs": len(acs), "no_result": no_result,
        "seats_match": dict(seats) == published_won,
        "seats_from_detail": dict(sorted(seats.items())),
        "seats_published": dict(sorted(published_won.items())),
        "candidates_from_detail": counted_cands, "candidates_published": published_cands,
        "candidates_match": counted_cands == published_cands,
        "detail_url": detail_url, "perf_url": perf_url, "cand_url": cand_url,
    }
    if not check["seats_match"]:
        diff = {k: (seats.get(k, 0), published_won.get(k, 0))
                for k in set(seats) | set(published_won) if seats.get(k, 0) != published_won.get(k, 0)}
        raise SourceShapeError(f"{cid}: seats won disagree with table 5 (detail, published): {diff}")
    if not check["candidates_match"]:
        raise SourceShapeError(f"{cid}: {counted_cands} contesting candidates in table 10, table 9 says {published_cands}")

    src = source_block("eci", detail_got, table="10 - Detailed Results",
                       verified_against=[perf_url, cand_url])
    meta = {"schema": 2, "election": "ac", "year": year, "region": region,
            "provenance": "published", "source": src}
    if no_result:
        meta["no_result"] = no_result
    colour_doc = {**meta, "note": (
        "Published Election Commission of India result. `p` is the winning party code "
        "(data/parties.json, matched by the party's full name in the report's table 3, or by "
        "abbreviation where table 3 gives none; otherwise the ECI abbreviation reduced to its "
        "letters and digits) and "
        "`v` its total votes (general + postal); `o` is every other party's votes in the AC, "
        "summed by the same code, NOTA included. Keys are AC numbers as the boundary set carries them. "
        "`no_result` lists ACs this report carries no result for."),
        "constituencies": colour}
    detail_doc = {**meta, "note": (
        "Published Election Commission of India result: every candidate per AC, general + postal "
        "votes, sorted by votes. NOTA is listed as its own row."),
        "constituencies": detail}
    return colour_doc, detail_doc, check


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Harvest ECI assembly results (the spreadsheet cycles).")
    ap.add_argument("--only", action="append", help="REGION:YEAR, repeatable (default: every cycle)")
    ap.add_argument("--cache", default=str(DEFAULT_CACHE))
    ap.add_argument("--out", default=str(DATA / "results" / "ac"))
    ap.add_argument("--dry-run", action="store_true", help="fetch, parse and check, but write nothing")
    args = ap.parse_args(argv)

    known = {f"{c['region']}:{c['year']}": c for c in CYCLES}
    wanted = args.only or [k for k, c in known.items() if "hold" not in c]
    unknown = [w for w in wanted if w not in known]
    if unknown:
        raise SystemExit(f"unknown cycle in --only: {unknown}; known: {sorted(known)}")
    cycles = [known[w] for w in wanted]
    code_for = party_code_map(json.loads((DATA / "parties.json").read_text()))
    outputs = {}
    for cycle in cycles:
        colour_doc, detail_doc, check = harvest(cycle, args.cache, code_for)
        base = Path(args.out) / cycle["region"]
        outputs[base / f"{cycle['year']}.json"] = colour_doc
        outputs[base / f"{cycle['year']}-detail.json"] = detail_doc
        print(f"{check['cycle']}: {check['acs']} ACs, seats match table 5, "
              f"{check['candidates_from_detail']} candidates match table 9")
    require_valid(outputs, args.cache)
    if not args.dry_run:
        for path, doc in outputs.items():
            write_json(path, doc)
        print(f"wrote {len(outputs)} files under {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
