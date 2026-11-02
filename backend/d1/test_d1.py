"""The D1 half of the provenance gate, and the JSON -> D1 -> JSON round trip.

    python3 -m unittest discover -s backend/d1 -p 'test_*.py'

The fixture is a real excerpt: the first two constituencies of the Election
Commission's published Chhattisgarh 2023 result, with that file's own source block.
Each negative case plants one violation and asserts the gate refuses it.
"""
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
MIGRATION = REPO / 'backend' / 'migrations' / '0001_init.sql'
sys.path.insert(0, str(HERE))
import export  # noqa: E402
import ingest  # noqa: E402

SOURCE = {
    'publisher': 'eci',
    'url': 'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/chhattisgarh/2023/Detailed_Results.xlsx',
    'sha256': '0a5e8276d4dad3fa13c7f2a5d9a0354de065122009eb532e69a21f9ee6481746',
    'fetched_at': '2026-11-01T21:19:50Z',
    'table': '10 - Detailed Results',
}
CANDIDATES = {
    '1': {'ac': 'Bharatpur-Sonhat (ST)', 'c': [
        {'n': 'Renuka Singh Saruta', 'p': 'BJP', 'v': 55809}, {'n': 'Gulab Kamro', 'p': 'INC', 'v': 50890},
        {'n': 'Shyam Singh Markam', 'p': 'GGP', 'v': 33863}, {'n': 'NOTA', 'p': 'NOTA', 'v': 2573},
        {'n': 'Shubh Sharan Singh', 'p': 'IND', 'v': 1042}, {'n': 'Shimla Cherwa', 'p': 'IND', 'v': 981}]},
    '2': {'ac': 'Manendragarh', 'c': [
        {'n': 'Shyam Bihari Jaiswal', 'p': 'BJP', 'v': 48503}, {'n': 'Ramesh Singh Vakil', 'p': 'INC', 'v': 36623},
        {'n': 'Shekh Ismail', 'p': 'GGP', 'v': 10411}, {'n': 'NOTA', 'p': 'NOTA', 'v': 1308}]},
}


def head(note):
    return {'schema': 2, 'election': 'ac', 'year': 2023, 'region': 'IN-CT', 'provenance': 'published',
            'source': dict(SOURCE), 'note': note}


def write(root, rel, doc):
    p = Path(root) / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')


def fixture(root):
    write(root, 'regions.json', {'schema': 1, 'regions': [
        {'code': 'IN-CT', 'name': 'Chhattisgarh', 'type': 'state'}]})
    write(root, 'parties.json', {'schema': 1, 'parties': [
        {'code': 'BJP', 'name': 'Bharatiya Janata Party', 'colour': '#E8590C'},
        {'code': 'INC', 'name': 'Indian National Congress', 'colour': '#00A2E8'}]})
    detail = {**head('Published Election Commission of India result: every candidate per AC.'),
              'constituencies': CANDIDATES}
    summary = {**head('Published Election Commission of India result.'),
               'constituencies': {no: ingest.summarize(x['c']) for no, x in CANDIDATES.items()}}
    write(root, 'results/ac/IN-CT/2023-detail.json', detail)
    write(root, 'results/ac/IN-CT/2023.json', summary)


def run_ingest(data, out, registry=None):
    args = [sys.executable, str(HERE / 'ingest.py'), '--data', str(data), '--day', 'all', '--out', str(out),
            '--registry', str(registry or Path(data) / 'no-registry.json')]
    return subprocess.run(args, capture_output=True, text=True)


def load(db, *sql_files):
    con = sqlite3.connect(db)
    con.execute('PRAGMA foreign_keys = ON')
    con.executescript(MIGRATION.read_text())
    for f in sql_files:
        con.executescript(Path(f).read_text())
    con.commit()
    return con


class RoundTrip(unittest.TestCase):
    def test_export_reproduces_the_committed_bytes(self):
        with tempfile.TemporaryDirectory() as t:
            data = Path(t) / 'data'
            fixture(data)
            r = run_ingest(data, Path(t) / 'all.sql')
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            load(Path(t) / 'd1.sqlite', Path(t) / 'all.sql').close()
            files = export.export(Path(t) / 'd1.sqlite')
            self.assertEqual(sorted(files), ['results/ac/IN-CT/2023-detail.json', 'results/ac/IN-CT/2023.json'])
            self.assertEqual(set(export.compare(files, data).values()), {'bytes'})


class IngestRefuses(unittest.TestCase):
    def assertRefused(self, mutate, needle):
        with tempfile.TemporaryDirectory() as t:
            data = Path(t) / 'data'
            fixture(data)
            p = data / 'results/ac/IN-CT/2023-detail.json'
            doc = json.loads(p.read_text())
            mutate(doc)
            p.write_text(json.dumps(doc))
            r = run_ingest(data, Path(t) / 'all.sql')
            self.assertNotEqual(r.returncode, 0, r.stdout)
            self.assertIn(needle, r.stdout + r.stderr)
            self.assertFalse((Path(t) / 'all.sql').exists(), 'SQL was written for a refused import')

    def test_synthetic_provenance(self):
        self.assertRefused(lambda d: d.update(provenance='synthetic'), "provenance is 'synthetic'")

    def test_dummy_note(self):
        self.assertRefused(lambda d: d.update(note='Dummy result for the atlas'), "forbidden word 'Dummy'")

    def test_publisher_off_the_allow_list(self):
        self.assertRefused(lambda d: d['source'].update(publisher='wikipedia'), 'not on the allow-list')

    def test_missing_sha256(self):
        self.assertRefused(lambda d: d['source'].pop('sha256'), 'sha256 is missing')


class SchemaRefuses(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.con = load(Path(self.tmp.name) / 'd1.sqlite')
        self.con.execute("INSERT INTO source VALUES (1, 'eci', 'https://www.eci.gov.in/x.xlsx', ?, '2026-11-01')",
                         ('0' * 64,))
        self.con.execute("INSERT INTO region VALUES ('IN', 'India', 'nation')")
        self.con.execute("INSERT INTO house VALUES ('ls', 'ls', 'IN')")

    def tearDown(self):
        self.con.close()
        self.tmp.cleanup()

    def assertRejected(self, sql, params=()):
        with self.assertRaises(sqlite3.IntegrityError):
            self.con.execute(sql, params)

    def test_synthetic_row(self):
        self.assertRejected("INSERT INTO term (id, house_id, election_year, provenance, source_id) "
                            "VALUES (1, 'ls', 2024, 'synthetic', 1)")

    def test_dummy_row(self):
        self.assertRejected("INSERT INTO term (id, house_id, election_year, provenance, source_id) "
                            "VALUES (1, 'ls', 2024, 'dummy', 1)")

    def test_row_without_source(self):
        self.assertRejected("INSERT INTO term (id, house_id, election_year) VALUES (1, 'ls', 2024)")

    def test_row_naming_a_missing_source(self):
        self.assertRejected("INSERT INTO term (id, house_id, election_year, source_id) VALUES (1, 'ls', 2024, 99)")

    def test_publisher_off_the_allow_list(self):
        self.assertRejected("INSERT INTO source VALUES (2, 'wikipedia', 'https://en.wikipedia.org/x', ?, 'd')",
                            ('0' * 64,))

    def test_source_without_a_hash(self):
        self.assertRejected("INSERT INTO source VALUES (2, 'eci', 'https://www.eci.gov.in/y', 'abc', 'd')")

    def test_plain_http_source(self):
        self.assertRejected("INSERT INTO source VALUES (2, 'eci', 'http://www.eci.gov.in/y', ?, 'd')", ('0' * 64,))


class CheckerOverD1(unittest.TestCase):
    """check_provenance.py --db must fail on a database whose schema lost its CHECKs."""

    def run_checker(self, db, data):
        return subprocess.run([sys.executable, str(REPO / 'tools' / 'check_provenance.py'), str(data), '--db', str(db)],
                              capture_output=True, text=True)

    def test_clean_database_passes(self):
        with tempfile.TemporaryDirectory() as t:
            data = Path(t) / 'data'
            fixture(data)
            self.assertEqual(run_ingest(data, Path(t) / 'all.sql').returncode, 0)
            load(Path(t) / 'd1.sqlite', Path(t) / 'all.sql').close()
            r = self.run_checker(Path(t) / 'd1.sqlite', data)
            self.assertEqual(r.returncode, 0, r.stdout)

    def test_drifted_schema_with_a_synthetic_row_fails(self):
        with tempfile.TemporaryDirectory() as t:
            data = Path(t) / 'data'
            fixture(data)
            self.assertEqual(run_ingest(data, Path(t) / 'all.sql').returncode, 0)
            con = load(Path(t) / 'd1.sqlite', Path(t) / 'all.sql')
            # the drift: term rebuilt without its CHECK, then a synthetic row
            con.executescript('''PRAGMA foreign_keys = OFF;
                CREATE TABLE term2 AS SELECT * FROM term; DROP TABLE term; ALTER TABLE term2 RENAME TO term;
                INSERT INTO term (id, house_id, election_year, provenance, source_id)
                VALUES (7, 'ls', 2014, 'synthetic', NULL);''')
            con.commit()
            con.close()
            r = self.run_checker(Path(t) / 'd1.sqlite', data)
            self.assertEqual(r.returncode, 1, r.stdout)
            self.assertIn('not provenance = published', r.stdout)
            self.assertIn('have no source_id', r.stdout)


if __name__ == '__main__':
    unittest.main()
