#!/usr/bin/env python3
"""Assembly files must carry the party codes the rest of the atlas uses.

    python3 tools/test_harvest_ac_results.py
"""
import importlib.util
import json
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
spec = importlib.util.spec_from_file_location("harvest_ac_results", HERE / "harvest-ac-results.py")
ac = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ac)

code_for = ac.party_code_map(json.loads((HERE.parent / "data" / "parties.json").read_text()))
TABLE_3 = {"AAAP": "Aam Aadmi Party", "CPIM": "Communist Party of India  (Marxist)",
           "CPI(ML)(L)": "Communist Party of India  (Marxist-Leninist)  (Liberation)"}


class PartyCodes(unittest.TestCase):
    def test_eci_only_abbreviation_maps_through_its_table_3_name(self):
        self.assertEqual(code_for("AAAP", TABLE_3), "AAP")
        self.assertEqual(code_for("CPIM", TABLE_3), "CPM")

    def test_abbreviation_parties_json_knows_maps_directly(self):
        self.assertEqual(code_for("BJP", {}), "BJP")

    def test_unknown_party_keeps_its_abbreviation_letters_and_digits(self):
        self.assertEqual(code_for("CPI(ML)(L)", TABLE_3), "CPIMLL")
        self.assertEqual(code_for("﻿AIFB", {}), "AIFB")

    def test_abbreviation_never_overrides_its_table_3_name(self):
        self.assertEqual(code_for("TMC", {"TMC": "Thamizhaga Munnetra Congress"}), "TMC")
        self.assertEqual(code_for("TMC", {}), "AITC")

    def test_independent_and_nota_are_kept(self):
        self.assertEqual(code_for("IND", {}), "IND")
        self.assertEqual(code_for("NOTA", {}), "NOTA")


class ColourEntry(unittest.TestCase):
    def test_other_parties_votes_are_kept_by_party(self):
        cands = [{"n": "A", "p": "SP", "v": 100}, {"n": "B", "p": "BJP", "v": 80},
                 {"n": "N", "p": "NOTA", "v": 5}, {"n": "C", "p": "IND", "v": 3},
                 {"n": "D", "p": "IND", "v": 2}, {"n": "E", "p": "XYZ", "v": 0}]
        entry = ac.colour_entry(cands, cands[0], lambda abbr: code_for(abbr, {}))
        self.assertEqual(entry, {"p": "SP", "v": 100, "o": {"BJP": 80, "NOTA": 5, "IND": 5}})

    def test_winner_shares_a_code_with_another_candidate(self):
        cands = [{"n": "A", "p": "IND", "v": 50}, {"n": "B", "p": "IND", "v": 50 - 1}]
        entry = ac.colour_entry(cands, cands[0], lambda abbr: code_for(abbr, {}))
        self.assertEqual(entry, {"p": "IND", "v": 50, "o": {"IND": 49}})


if __name__ == "__main__":
    unittest.main()
