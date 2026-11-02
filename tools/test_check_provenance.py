"""The provenance gate must pass clean published data and fail on anything else.

    python3 -m unittest discover -s tools -p 'test_*.py'

Each negative case plants one violation in an otherwise clean copy of a minimal
atlas tree and asserts the checker exits non-zero: proof the gate can fail.
"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
CHECKER = TOOLS / 'check_provenance.py'
REAL_DATA = TOOLS.parent / 'data'

ECI_URL = 'https://www.eci.gov.in/statistical-reports'
MANIFEST = {
    'schema': 1,
    'note': 'Fixture manifest.',
    'elections': {'ls': {'years': [2024]}, 'ac': {'cycles': {'IN-UP': [2012, 2017, 2022]}}},
}
PUBLISHED_PC = {
    'schema': 2, 'provenance': 'published', 'election': 'ls', 'year': 2024,
    'note': 'Published result.',
    'source': {'publisher': 'Election Commission of India', 'url': ECI_URL},
    'constituencies': {'S24_1': {'st': 'IN-UP', 'p': 'INC', 'v': 547967}},
}


def write(root, rel, doc):
    p = root / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(doc if isinstance(doc, str) else json.dumps(doc), encoding='utf-8')


def run_checker(data_dir):
    return subprocess.run([sys.executable, str(CHECKER), str(data_dir)],
                          capture_output=True, text=True)


class ProvenanceGate(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.atlas = Path(self.tmp.name)
        self.data = self.atlas / 'data'
        write(self.data, 'manifest.json', MANIFEST)
        write(self.data, 'results/ls/pc/2024.json', PUBLISHED_PC)
        write(self.atlas, 'index.html', '<p>Results: Election Commission of India.</p>')

    def tearDown(self):
        self.tmp.cleanup()

    def assertFails(self, needle):
        r = run_checker(self.data)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn(needle, r.stdout)

    def test_clean_fixture_passes(self):
        r = run_checker(self.data)
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_synthetic_provenance_fails(self):
        write(self.data, 'results/ls/pc/2024.json', {**PUBLISHED_PC, 'provenance': 'synthetic'})
        self.assertFails("provenance is 'synthetic'")

    def test_dummy_note_fails(self):
        write(self.data, 'cabinet/union/2024.json', {
            **PUBLISHED_PC, 'note': 'Dummy roster for the atlas.'})
        self.assertFails("metadata says 'Dummy'")

    def test_missing_provenance_fails(self):
        doc = {k: v for k, v in PUBLISHED_PC.items() if k != 'provenance'}
        write(self.data, 'results/ls/pc/2024.json', doc)
        self.assertFails('provenance is None')

    def test_source_off_the_allow_list_fails(self):
        write(self.data, 'results/ls/pc/2024.json', {
            **PUBLISHED_PC, 'source': {'publisher': 'x', 'url': 'https://example.com/r.xlsx'}})
        self.assertFails('not https on an allowed publisher host')

    def test_forbidden_word_in_nested_metadata_fails(self):
        write(self.data, 'mplads/IN-UP/index.json', {'mps': [{'note_source': 'invented for a demo'}]})
        self.assertFails("metadata says 'invented'")

    def test_forbidden_word_in_free_text_passes(self):
        write(self.data, 'mplads/IN-UP/x.json', {'works': [{'description': 'SYNTHETIC TRACK KA NIRMAN'}]})
        r = run_checker(self.data)
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_page_saying_synthetic_fails(self):
        write(self.atlas, 'index.html', '<p>the assembly figures are synthetic</p>')
        self.assertFails('says "synthetic"')

    def test_retired_path_for_a_year_that_was_never_a_cycle_fails(self):
        write(self.data, 'results/ac/IN-UP/2024.json', {**PUBLISHED_PC, 'election': 'ac'})
        self.assertFails('2024 is not a real assembly cycle for IN-UP')

    def test_retired_path_for_a_real_cycle_passes(self):
        manifest = json.loads(json.dumps(MANIFEST))
        manifest['elections']['ac']['cycles']['IN-HR'] = [2014, 2019, 2024]
        write(self.data, 'manifest.json', manifest)
        write(self.data, 'results/ac/IN-HR/2024.json', {**PUBLISHED_PC, 'election': 'ac'})
        r = run_checker(self.data)
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_removed_dummy_bytes_fail_wherever_they_land(self):
        # This repository starts from published data only, so the removed dummy
        # files are not in it or its history. Plant some bytes and register their
        # hash as one removed file's: the checker must refuse them on any path.
        raw = json.dumps({**PUBLISHED_PC, 'year': 2019}).encode()
        p = self.data / 'results/ls/byel/2019.json'
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(raw)
        code = ('import hashlib, sys; sys.path.insert(0, sys.argv[1]); import check_provenance as c; '
                'c.RETIRED_BYTES.add(hashlib.sha256(open(sys.argv[2], "rb").read()).hexdigest()); '
                'sys.exit(c.main(["check_provenance.py", sys.argv[3]]))')
        r = subprocess.run([sys.executable, '-c', code, str(TOOLS), str(p), str(self.data)],
                           capture_output=True, text=True)
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn('exact bytes of a removed dummy file', r.stdout)


class Remote(unittest.TestCase):
    """--remote checks what a host serves: here a local server over a fixture tree."""

    def setUp(self):
        import functools
        import http.server
        import threading
        self.tmp = tempfile.TemporaryDirectory()
        self.served = Path(self.tmp.name) / 'served'
        self.listed = Path(self.tmp.name) / 'listed'
        for root in (self.served, self.listed):
            write(root / 'data', 'manifest.json', MANIFEST)
            write(root / 'data', 'results/ls/pc/2024.json', PUBLISHED_PC)
            write(root, 'index.html', '<p>Results: Election Commission of India.</p>')
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(self.served))
        handler.log_message = lambda *a: None
        self.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.base = f'http://127.0.0.1:{self.server.server_address[1]}/'

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.tmp.cleanup()

    def run_remote(self):
        return subprocess.run([sys.executable, str(CHECKER), str(self.listed / 'data'), '--remote', self.base],
                              capture_output=True, text=True)

    def test_clean_host_passes(self):
        r = self.run_remote()
        self.assertEqual(r.returncode, 0, r.stdout)

    def test_host_serving_synthetic_data_fails(self):
        write(self.served / 'data', 'results/ls/pc/2024.json', {**PUBLISHED_PC, 'provenance': 'synthetic'})
        r = self.run_remote()
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn("provenance is 'synthetic'", r.stdout)

    def test_file_the_host_does_not_serve_fails(self):
        (self.served / 'data' / 'results/ls/pc/2024.json').unlink()
        r = self.run_remote()
        self.assertEqual(r.returncode, 1, r.stdout)
        self.assertIn('not served', r.stdout)


class RealData(unittest.TestCase):
    def test_atlas_data_passes_the_gate(self):
        r = run_checker(REAL_DATA)
        self.assertEqual(r.returncode, 0, r.stdout)


if __name__ == '__main__':
    unittest.main()
