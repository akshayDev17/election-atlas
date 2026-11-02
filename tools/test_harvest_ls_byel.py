#!/usr/bin/env python3
"""By-election term files: unusable cards stay events in their seat, and only
the elected marker (never a name's own last letter) is stripped from a winner.

    python3 tools/test_harvest_ls_byel.py
"""
import importlib.util
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location("harvest_ls_byel", HERE / "harvest-ls-byel.py")
byel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(byel)

CARDS_URL = "https://old.eci.gov.in/ByeElection/2018/ByeElection(Jan-June2018).xlsx"
HELD_URL = "https://old.eci.gov.in/files/file/9899-x/?do=download&r=31801"


def got(url):
    return {"url": url, "sha256": "0" * 64, "fetched_at": "2026-11-01T00:00:00Z"}


def card(declared):
    return {"declared": declared, "poll": declared, "reason": "Resignation", "nota": 1,
            "voted": 16, "electors": 32,
            "cands": [{"n": "WINNER", "party": "SP", "v": 10}, {"n": "RUNNER", "party": "BJP", "v": 5}]}


GORAKHPUR = {"uid": "S24_64", "seat": "64", "pc": "Gorakhpur", "st": "IN-UP"}


def held(seat, date):
    return {**seat, "date": date, "why": "the ECI index card does not add up", "src": got(HELD_URL)}


class HeldCards(unittest.TestCase):
    def term(self, cards, held_cards):
        return byel.term_doc(2014, cards, held_cards, lambda party, year: party)

    def test_held_card_is_a_seat_event_with_no_winner(self):
        bellary = {"uid": "S10_9", "seat": "9", "pc": "Bellary", "st": "IN-KA"}
        doc = self.term({(GORAKHPUR["uid"], "2018-03-14"): (card("2018-03-14"), GORAKHPUR, got(CARDS_URL))},
                        [held(bellary, "2018-11-06")])
        seats = {s["uid"]: s for s in doc["seats"]}
        self.assertNotIn("not_recorded", doc)
        self.assertEqual(seats["S10_9"]["general"]["p"], "BJP")
        self.assertEqual(seats["S10_9"]["events"], [
            {"type": "bye", "date": "2018-11-06", "winner": None,
             "why": "the ECI index card does not add up", "src": 1}])
        self.assertEqual(doc["sources"][1]["url"], HELD_URL)
        self.assertEqual(seats["S24_64"]["events"][0]["winner"]["p"], "SP")

    def test_events_in_a_seat_run_in_date_order(self):
        doc = self.term({(GORAKHPUR["uid"], "2018-03-14"): (card("2018-03-14"), GORAKHPUR, got(CARDS_URL))},
                        [held(GORAKHPUR, "2016-11-22")])
        events = doc["seats"][0]["events"]
        self.assertEqual([e["date"] for e in events], ["2016-11-22", "2018-03-14"])
        self.assertIsNone(events[0]["winner"])
        self.assertEqual(events[-1]["winner"]["p"], "SP")


class ElectedMark(unittest.TestCase):
    def test_marker_is_stripped(self):
        for printed in ["RAVI KISHAN (E)", "RAVI KISHAN(E)", "RAVI KISHAN 'E'", "RAVI KISHAN E",
                        "RAVI KISHAN ('E')", "RAVI KISHAN Ë", "RAVI KISHAN (€)"]:
            self.assertEqual(byel.strip_elected_mark(printed), "RAVI KISHAN", printed)

    def test_name_ending_in_e_is_kept(self):
        for name in ["SUPRIYA SULE", "SHRIMANT CHH. UDAYANRAJE PRATAPSINHMAHARAJ BHONSLE"]:
            self.assertEqual(byel.strip_elected_mark(name), name)
        self.assertEqual(byel.strip_elected_mark("SUPRIYA SULE (E)"), "SUPRIYA SULE")


if __name__ == "__main__":
    unittest.main()
