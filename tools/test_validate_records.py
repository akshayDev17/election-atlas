#!/usr/bin/env python3
"""The provenance gate must fail on anything that is not published data.

    python3 tools/test_validate_records.py
"""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest_common import cache_path, sha256_bytes  # noqa: E402
from validate_records import main, validate  # noqa: E402

URL = "https://www.eci.gov.in/eci-backend/public/all_files/example/10-Detailed-Results.xlsx"
BODY = b"published bytes"


def record(**over):
    doc = {"provenance": "published",
           "source": {"publisher": "eci", "url": URL, "sha256": sha256_bytes(BODY),
                      "fetched_at": "2026-11-02T00:00:00Z"},
           "note": "Published Election Commission of India result.",
           "constituencies": {"1": {"p": "BJP", "v": 1}}}
    doc.update(over)
    return doc


class Gate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.cache = Path(self.tmp.name)
        cache_path(self.cache, URL).write_bytes(BODY)

    def tearDown(self):
        self.tmp.cleanup()

    def test_published_record_passes(self):
        self.assertEqual(validate(record(), self.cache), [])

    def test_synthetic_provenance_fails(self):
        self.assertTrue(validate(record(provenance="synthetic"), self.cache))

    def test_missing_provenance_fails(self):
        doc = record()
        del doc["provenance"]
        self.assertTrue(validate(doc, self.cache))

    def test_dummy_note_fails(self):
        self.assertTrue(validate(record(note="Dummy roster for the atlas."), self.cache))

    def test_forbidden_word_in_nested_source_fails(self):
        doc = record(sources=[dict(record()["source"], table="invented table")])
        self.assertTrue(validate(doc, self.cache))

    def test_free_text_is_not_scanned(self):
        # real Sansad answers mention "synthetic rubbers"; only metadata keys are scanned
        doc = record(answer="imports of synthetic rubbers")
        self.assertEqual(validate(doc, self.cache), [])

    def test_publisher_off_allow_list_fails(self):
        doc = record(source=dict(record()["source"], publisher="wikipedia"))
        self.assertTrue(validate(doc, self.cache))

    def test_host_of_another_publisher_fails(self):
        doc = record(source=dict(record()["source"], url="https://pib.gov.in/x.xlsx"))
        self.assertTrue(validate(doc, self.cache))

    def test_sha256_mismatch_fails(self):
        doc = record(source=dict(record()["source"], sha256="0" * 64))
        self.assertTrue(validate(doc, self.cache))

    def test_command_line_exits_non_zero_on_a_bad_file(self):
        bad = self.cache / "bad.json"
        bad.write_text(json.dumps(record(provenance="dummy")))
        good = self.cache / "good.json"
        good.write_text(json.dumps(record()))
        self.assertEqual(main([str(good), "--cache", str(self.cache)]), 0)
        self.assertEqual(main([str(bad), "--cache", str(self.cache)]), 1)

    def run_cli(self, *args):
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = main(list(args))
        return code, out.getvalue()

    def test_command_line_checks_sha256_against_the_harvest_cache_by_default(self):
        bad = self.cache / "bad-sha.json"
        bad.write_text(json.dumps(record(source=dict(record()["source"], sha256="0" * 64))))
        with mock.patch("validate_records.DEFAULT_CACHE", self.cache):
            code, out = self.run_cli(str(bad))
        self.assertEqual(code, 1)
        self.assertIn("sha256 does not match", out)

    def test_command_line_says_when_sha256_was_not_checked(self):
        good = self.cache / "good.json"
        good.write_text(json.dumps(record()))
        with mock.patch("validate_records.DEFAULT_CACHE", self.cache / "absent"):
            code, out = self.run_cli(str(good))
        self.assertEqual(code, 0)
        self.assertIn("sha256 NOT checked", out)

    def test_default_cache_reports_a_source_it_does_not_hold_as_not_checked(self):
        other = record(source=dict(record()["source"], url="https://www.eci.gov.in/not-fetched.xlsx"))
        path = self.cache / "other.json"
        path.write_text(json.dumps(other))
        with mock.patch("validate_records.DEFAULT_CACHE", self.cache):
            code, out = self.run_cli(str(path))
        self.assertEqual(code, 0)
        self.assertIn("sha256 NOT checked", out)
        code, out = self.run_cli(str(path), "--cache", str(self.cache))
        self.assertEqual(code, 1)
        self.assertIn("no cached copy", out)


if __name__ == "__main__":
    unittest.main()
