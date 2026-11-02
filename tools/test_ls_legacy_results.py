#!/usr/bin/env python3
"""Lok Sabha 1980-2004 state files: the ECI report's state headers (Delhi; Goa, Daman &
Diu), a winner whose long name swallows the party column (Dhenkanal 1991), and a seat
returned unopposed (Srinagar 1980 and 1989).

The parser tests feed eci_pdf.parse_pdf rows copied from the ECI reports, as
(x0, x1, text) fragments in place of pdfminer's layout; the data tests read the
published state files data/results/ls/{year}.json.

    python3 tools/test_ls_legacy_results.py
"""
import collections
import importlib.util
import json
import re
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parent
sys.path.insert(0, str(HERE))


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


eci_pdf = load("eci_pdf", "eci_pdf.py")
builder = load("build_ls_results", "build-ls-results.py")
GEO = builder.GeoIndex(ATLAS / "data" / "geo" / "india-pcs.json",
                       json.loads((ATLAS / "data" / "regions.json").read_text(encoding="utf-8")))
HEADER_NAMES = set(GEO.state_names) | set(builder.ECI_OLD_STATE_NAMES)


def parse(pages):
    """parse_pdf over pages given as lists of rows, each row a list of fragments."""
    real = eci_pdf.extract_pages, eci_pdf.page_rows
    eci_pdf.extract_pages, eci_pdf.page_rows = (lambda path: pages), (lambda page: page)
    try:
        parsed, _ = eci_pdf.parse_pdf("report.pdf", state_names=HEADER_NAMES)
    finally:
        eci_pdf.extract_pages, eci_pdf.page_rows = real
    return {name: blk for (_, _, name), blk in parsed.items()}


def region_of(header):
    return GEO.region_of_state.get(GEO.state(header))


def marker(x1, text):
    return [(37, 98, "Constituency  :"), (109, x1, text)]


def candidate(name, party, votes, share):
    return [(88, 200, name), (340, 374, party), (428, 452, votes), (476, 500, share)]


# 1980 report p159: the only candidate in Srinagar, with no poll held
SRINAGAR_1980 = [(106, 198, "1 . FAROOQ ABDULLAH"), (358, 393, "M JKN"),
                 (466, 470, "0"), (496, 518, "#Num!")]
# 1991 report p245: the winner's name runs into the sex and party column
DHENKANAL_1991 = [(88, 374, "1 . RAJA KAMAKHYA PRASAD SINGHDEO MAHINDR BAHADUR M INC"),
                  (428, 452, "270123"), (476, 500, "51.23%")]


class StateHeaders(unittest.TestCase):
    def test_1991_national_capital_territory_header_is_delhi(self):
        blocks = parse([[
            [(228, 312, "DAMAN & DIU")],
            marker(214, "1 . DAMAN AND DIU"),
            candidate("1 . TANDEL DEV JI JOGI BHAI", "M BJP", "29237", "37.70%"),
            [(141, 399, "NATIONAL CAPITAL TERRITORY OF DELHI")],
            marker(187, "1 . NEW DELHI"),
            candidate("1 . LAL KRISHAN ADVANI", "M BJP", "93662", "51.12%"),
        ]])
        self.assertEqual(region_of(blocks["DAMAN AND DIU"]["state_header"]), "IN-DH")
        self.assertEqual(region_of(blocks["NEW DELHI"]["state_header"]), "IN-DL")

    def test_1984_title_case_delhi_header_is_delhi(self):
        blocks = parse([[
            [(193, 347, "DADRA & NAGAR HAVELI")],
            marker(286, "1 . DADRA & NAGAR HAVELI (ST)"),
            candidate("1 . GAVLI SITARAM JIVYABHAI", "M IND", "20852", "54.33%"),
            [(250, 280, "Delhi")],
            marker(187, "1 . NEW DELHI"),
            candidate("1 . KRSIHAN CHANDRA PANT", "M INC", "131932", "67.86%"),
        ]])
        self.assertEqual(region_of(blocks["DADRA & NAGAR HAVELI (ST)"]["state_header"]), "IN-DH")
        self.assertEqual(region_of(blocks["NEW DELHI"]["state_header"]), "IN-DL")

    def test_1980_goa_daman_diu_header_is_goa(self):
        for header in ("GOA, DAMAN & DIU", "GOA DAMAN & DIU"):
            blocks = parse([[
                [(250, 290, "BIHAR")],
                marker(200, "54 . PALAMAU (SC)"),
                candidate("1 . KAMLA KUMARI", "F INC", "150000", "50.00%"),
                [(200, 330, header)],
                marker(187, "1 . PANAJI"),
                candidate("1 . SHAIKH HASSAN HAROON", "M INC", "50000", "40.00%"),
            ]])
            self.assertEqual(region_of(blocks["PALAMAU (SC)"]["state_header"]), "IN-BR")
            self.assertEqual(region_of(blocks["PANAJI"]["state_header"]), "IN-GA", header)

    def test_summary_table_row_naming_a_state_is_not_a_header(self):
        names = {eci_pdf.norm_bare("Delhi")}
        self.assertEqual(eci_pdf.state_header([(100, 150, "Delhi")], names), "Delhi")
        self.assertIsNone(eci_pdf.state_header([(100, 150, "Delhi"), (300, 310, "7")], names))


class GluedNameAndParty(unittest.TestCase):
    def test_dhenkanal_1991_winner_is_inc(self):
        row = eci_pdf.read_row(DHENKANAL_1991)
        self.assertEqual((row["party"], row["sex"], row["total"]), ("INC", "M", 270123))
        self.assertEqual(row["name"], "RAJA KAMAKHYA PRASAD SINGHDEO MAHINDR BAHADUR")

    def test_party_with_a_bracketed_suffix(self):
        row = eci_pdf.read_row([(88, 374, "5 . SOME LONG CANDIDATE NAME M JNP (JP)"),
                                (432, 452, "2459"), (480, 500, "0.50%")])
        self.assertEqual((row["party"], row["sex"]), ("JNP (JP)", "M"))

    def test_separate_sex_party_fragment_still_reads(self):
        row = eci_pdf.read_row([(88, 194, "2 . TATHAGATA SATPATHY"), (340, 369, "M JD"),
                                (428, 452, "228437"), (476, 500, "43.33%")])
        self.assertEqual((row["name"], row["party"], row["total"]),
                         ("TATHAGATA SATPATHY", "JD", 228437))


class Unopposed(unittest.TestCase):
    def test_lone_candidate_with_no_votes_is_read(self):
        row = eci_pdf.read_row(SRINAGAR_1980)
        self.assertEqual((row["name"], row["party"], row["total"]), ("FAROOQ ABDULLAH", "JKN", 0))

    def test_constituency_records_the_page_it_is_printed_on(self):
        blocks = parse([
            [[(250, 330, "JAMMU & KASHMIR")], marker(185, "1 . BARAMULLA"),
             candidate("1 . KHAWAJA MUBARAK SHAH", "M JKN", "140000", "55.00%")],
            [[(250, 330, "JAMMU & KASHMIR")], marker(185, "2 . SRINAGAR"), SRINAGAR_1980],
        ])
        self.assertEqual(blocks["SRINAGAR"]["page"], 2)
        self.assertEqual([(c["party"], c["total"]) for c in blocks["SRINAGAR"]["candidates"]],
                         [("JKN", 0)])

    def test_state_file_counts_and_names_the_unopposed_seat(self):
        entry = dict(no=2, constituency="SRINAGAR", party="JKN", report_page=159)
        pcs = {"a": dict(st="IN-JK", p="JKN", v=140000, o={"INC": 90000}),
               "b": dict(st="IN-JK", p="JKN", v=0, o={}, _unopposed=entry)}
        region = builder.state_from_pcs(pcs, {}, None, GEO)["IN-JK"]
        self.assertEqual(region["parties"], [{"code": "JKN", "seats": 2, "votes": 140000},
                                             {"code": "INC", "seats": 0, "votes": 90000}])
        self.assertEqual(region["unopposed"], [entry])


def state_file(year):
    return json.loads((ATLAS / "data" / "results" / "ls" / f"{year}.json").read_text(encoding="utf-8"))


def national_seats(doc):
    seats = collections.Counter()
    for region in doc["regions"].values():
        for p in region["parties"]:
            seats[p["code"]] += p["seats"]
    return seats


# seats polled, from each report's 'Number of Candidates per Constituency' table
ECI_SEATS_POLLED = {1980: 529, 1984: 514, 1989: 529, 1991: 521, 1996: 543, 2004: 543}


class PublishedStateFiles(unittest.TestCase):
    def test_every_seat_is_counted_once_in_its_region(self):
        for year, polled in ECI_SEATS_POLLED.items():
            doc = state_file(year)
            for code, region in doc["regions"].items():
                self.assertEqual(region["seats"], sum(p["seats"] for p in region["parties"]),
                                 f"{year} {code}")
            self.assertEqual(sum(r["seats"] for r in doc["regions"].values()), polled, year)

    def test_delhi_is_its_own_region(self):
        for year in ECI_SEATS_POLLED:
            regions = state_file(year)["regions"]
            self.assertEqual(regions["IN-DL"]["seats"], 7, year)
            self.assertEqual(regions["IN-DH"]["seats"], 1 if year < 1987 else 2, year)
            self.assertEqual(regions["IN-GA"]["seats"], 2, year)

    def test_goa_daman_diu_is_not_counted_in_bihar(self):
        for year in (1980, 1984):
            self.assertEqual(state_file(year)["regions"]["IN-BR"]["seats"], 54, year)

    def test_dhenkanal_1991_seat_is_inc(self):
        doc = state_file(1991)
        self.assertEqual(national_seats(doc)["INC"], 232)
        for year in ECI_SEATS_POLLED:
            junk = [c for c in national_seats(state_file(year)) if re.match(r"^\d", c)]
            self.assertEqual(junk, [], year)

    def test_srinagar_returned_unopposed_counts_for_jkn(self):
        for year, page in ((1980, 159), (1989, 186)):
            doc = state_file(year)
            self.assertEqual(national_seats(doc)["JKN"], 3, year)
            self.assertEqual(doc["regions"]["IN-JK"]["unopposed"], [
                {"no": 2, "constituency": "SRINAGAR", "party": "JKN", "report_page": page}])



class CheckMode(unittest.TestCase):
    def test_check_downloads_nothing_and_names_a_missing_input(self):
        with tempfile.TemporaryDirectory() as research, \
                mock.patch.object(builder, "RESEARCH", research), \
                mock.patch.object(builder, "fetch", side_effect=AssertionError("network")), \
                mock.patch.object(sys, "argv", ["build-ls-results.py", "--year", "1991", "--check"]):
            with self.assertRaises(SystemExit) as stop:
                builder.main()
            self.assertIn("eci_pdfs/general-election-1991-vol-i-ii_part1.pdf", str(stop.exception))
            self.assertEqual(list(Path(research).iterdir()), [])

    def test_check_accepts_inputs_already_present(self):
        cfg = builder.YEARS[1991]
        with tempfile.TemporaryDirectory() as research, \
                mock.patch.object(builder, "RESEARCH", research):
            for rel in builder.source_inputs(1991, cfg):
                (Path(research) / rel).parent.mkdir(parents=True, exist_ok=True)
                (Path(research) / rel).write_bytes(b"x")
            self.assertIsNone(builder.require_inputs(1991, cfg))

if __name__ == "__main__":
    unittest.main()
