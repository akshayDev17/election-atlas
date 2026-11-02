#!/usr/bin/env python3
"""Harvest the Uttar Pradesh council of ministers as it stands, from the CM's Office.

Writes data/cabinet/state/IN-UP/2022.json: the ministry formed after the 2022
assembly election, as it stands on the day of the fetch (`members`). The state
page keys state cabinets by the real assembly cycle and reads the roster as
sworn in from a separate {cycle}-sworn-in.json, which is not produced here.

Source: the Chief Minister's Office, Uttar Pradesh (linked as "मंत्री परिषद"
from uplegisassembly.gov.in):
    https://upcmo.up.nic.in/cabinet_minister.htm    Cabinet (incl. CM and Deputy CMs)
    https://upcmo.up.nic.in/state_minister_ic.htm   Ministers of State (Independent Charge)
    https://upcmo.up.nic.in/state_minister.htm      Ministers of State

The pages are hand-made HTML, so every row must have exactly four cells
(serial, name, designation, portfolio), serials must run 1..n, and each
designation must be one this page is expected to carry; anything else stops
the harvest. The sworn-in roster of 2022 and the 2012 and 2017 ministries have
no official machine-readable source yet and are not produced.

Usage (from the repository root):
    python3 tools/harvest-up-cabinet.py
    python3 tools/harvest-up-cabinet.py --cache /tmp/harvest --dry-run
"""
import argparse
import html
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest_common import DATA, DEFAULT_CACHE, SourceShapeError, fetch, source_block, write_json  # noqa: E402
from validate_records import require_valid  # noqa: E402

BASE = "https://upcmo.up.nic.in/"
PAGES = [  # page, heading it must carry, designation -> rank
    ("cabinet_minister.htm", "Cabinet Ministers",
     {"Chief Minister": "cm", "Deputy Chief Minister": "cabinet", "Cabinet Minister": "cabinet"}),
    ("state_minister_ic.htm", "Ministers Of State (Independent Charge)",
     {"Minister of State (Independent Charge)": "mos-ic"}),
    ("state_minister.htm", "State Ministers",
     {"State Minister": "mos"}),
]
TITLE = r"(?:Shri|Smt\.?|Sushri|Kumari|Dr\.?|Prof\.?|Km\.?)\s+"


def text(fragment: str) -> str:
    t = html.unescape(re.sub(r"<[^>]+>", " ", fragment)).replace(" ", " ")
    return " ".join(t.split())


def parse_page(page: str, heading: str, ranks: dict, where: str):
    page = re.sub(r"<!--.*?-->", "", page, flags=re.S)  # drop commented-out tables
    if heading.lower() not in text(page).lower():
        raise SourceShapeError(f"{where}: heading {heading!r} not found (layout changed?)")
    members, expect = [], 1
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, flags=re.S | re.I):
        cells = [text(c) for c in re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.S | re.I)]
        if not cells or not re.fullmatch(r"\d+\.", cells[0]):
            continue
        if len(cells) != 4:
            raise SourceShapeError(f"{where}: row {cells[0]} has {len(cells)} cells, expected 4: {cells}")
        serial, name, role, portfolio = cells
        if int(serial[:-1]) != expect:
            raise SourceShapeError(f"{where}: serial {serial} out of order, expected {expect}.")
        expect += 1
        if role not in ranks:
            raise SourceShapeError(f"{where}: {name!r} has designation {role!r}, expected one of {sorted(ranks)}")
        if not name or not portfolio:
            raise SourceShapeError(f"{where}: row {serial} has an empty name or portfolio")
        items = [p.strip(" .") for p in re.split(r"\s*,\s*", portfolio) if p.strip(" .")]
        members.append({"name": re.sub(rf"^{TITLE}", "", name).upper(), "rank": ranks[role],
                        "role": role, "portfolio": "; ".join(items)})
    if not members:
        raise SourceShapeError(f"{where}: no minister rows")
    return members


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Harvest the UP council of ministers as it stands (upcmo).")
    ap.add_argument("--cache", default=str(DEFAULT_CACHE))
    ap.add_argument("--out", default=str(DATA / "cabinet" / "state" / "IN-UP" / "2022.json"))
    ap.add_argument("--refresh", action="store_true", help="fetch the pages again instead of using the cache")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    members, sources = [], []
    for page, heading, ranks in PAGES:
        got = fetch(BASE + page, args.cache, refresh=args.refresh)
        rows = parse_page(got["bytes"].decode("utf-8", "replace"), heading, ranks, got["url"])
        for m in rows:
            m["src"] = len(sources)
        members += rows
        sources.append(source_block("upcmo", got))
        print(f"{page}: {len(rows)} ministers")
    if sum(m["rank"] == "cm" for m in members) != 1:
        raise SourceShapeError("expected exactly one Chief Minister")
    as_of = min(s["fetched_at"] for s in sources)[:10]
    doc = {
        "schema": 2, "scope": "state", "region": "IN-UP", "cycle": 2022,
        "term": "18th Uttar Pradesh Legislative Assembly",
        "provenance": "published", "source": sources[0], "sources": sources,
        "note": ("Council of ministers of Uttar Pradesh as it stands, from the Chief Minister's Office "
                 "roster pages, on `asOf`. `role` is the designation as published; `src` indexes `sources`. "
                 "The 2022 roster as sworn in (2022-sworn-in.json) has not been added from an official source."),
        "asOf": as_of,
        "fetchedAt": as_of,
        "members": members,
        "changes": [],
    }
    require_valid({args.out: doc}, args.cache)
    if not args.dry_run:
        write_json(Path(args.out), doc)
        print(f"wrote {len(members)} ministers to {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
