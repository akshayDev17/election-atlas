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
MIGRATIONS = sorted((REPO / 'backend' / 'migrations').glob('*.sql'))
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
            '--registry', str(registry or Path(data) / 'no-registry.json'),
            '--inputs', str(Path(data) / 'no-inputs')]
    return subprocess.run(args, capture_output=True, text=True)


def load(db, *sql_files):
    con = sqlite3.connect(db)
    con.execute('PRAGMA foreign_keys = ON')
    for m in MIGRATIONS:
        con.executescript(m.read_text())
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


LS_1980_SOURCE = {
    'publisher': 'eci',
    'url': 'https://old.eci.gov.in/files/file/4117-general-election-1980-vol-i-ii/?do=download&r=9752&confirm=1&t=1',
    'sha256': 'c739cb72c63c645b1a3e00b1c1ba125cc7dff2e897f5474a865da705b59f0f76',
    'fetched_at': '2026-11-02T09:57:47Z',
    'file': 'eci_pdfs/general-election-1980-vol-i-ii_part1.pdf',
}
# Jammu and Kashmir in the rebuilt 1980 state file (two of its parties): Srinagar
# was returned unopposed.
LS_1980_JK = {'seats': 6, 'electors': None, 'parties': [
    {'code': 'JKN', 'seats': 3, 'votes': 493143}, {'code': 'IND', 'seats': 1, 'votes': 284459}],
    'unopposed': [{'no': 2, 'constituency': 'SRINAGAR', 'party': 'JKN', 'report_page': 159}]}


def ls_1980(regions):
    return {'schema': 2, 'provenance': 'published', 'election': 'ls', 'year': 1980,
            'note': 'Published result.', 'source': dict(LS_1980_SOURCE), 'regions': regions}


class InputsOverlayAndExtras(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.data = self.root / 'data'
        fixture(self.data)
        regions = load_json_text(self.data / 'regions.json')
        regions['regions'].append({'code': 'IN-JK', 'name': 'Jammu and Kashmir', 'type': 'ut'})
        write(self.data, 'regions.json', regions)

    def tearDown(self):
        self.tmp.cleanup()

    def ingest(self, *extra):
        args = [sys.executable, str(HERE / 'ingest.py'), '--data', str(self.data), '--day', 'all',
                '--out', str(self.root / 'all.sql'), '--registry', str(self.root / 'none.json'),
                '--inputs', str(self.root / 'inputs'), *extra]
        return subprocess.run(args, capture_output=True, text=True)

    def test_an_input_replaces_the_pinned_file_and_its_region_extras_round_trip(self):
        # pinned: no unopposed list; the committed input carries one
        write(self.data, 'results/ls/1980.json', ls_1980({'IN-JK': {k: v for k, v in LS_1980_JK.items() if k != 'unopposed'}}))
        write(self.root / 'inputs', 'results/ls/1980.json', ls_1980({'IN-JK': LS_1980_JK}))
        r = self.ingest()
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('results/ls/1980.json', r.stdout)
        load(self.root / 'd1.sqlite', self.root / 'all.sql').close()
        files = export.export(self.root / 'd1.sqlite')
        verdicts = export.compare(files, self.data, self.root / 'inputs')
        self.assertEqual(verdicts['results/ls/1980.json'], 'bytes')
        self.assertEqual(json.loads(files['results/ls/1980.json'])['regions']['IN-JK']['unopposed'],
                         LS_1980_JK['unopposed'])

    def test_years_select_documents_and_max_rows_refuses_an_overrun(self):
        write(self.data, 'results/ls/1980.json', ls_1980({'IN-JK': LS_1980_JK}))
        r = self.ingest('--years', '1980')
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        sql = (self.root / 'all.sql').read_text()
        self.assertIn("'results/ls/1980.json'", sql)
        self.assertNotIn("'results/ac/IN-CT/2023.json'", sql)
        (self.root / 'all.sql').unlink()
        r = self.ingest('--max-rows', '10')
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('exceeds --max-rows 10', r.stdout + r.stderr)
        self.assertFalse((self.root / 'all.sql').exists(), 'SQL was written for a refused import')

    def test_documents_already_in_d1_are_left_out(self):
        present = self.root / 'present.txt'
        present.write_text('results/ac/IN-CT/2023-detail.json\nresults/ac/IN-CT/2023.json\n')
        r = self.ingest('--skip-present', str(present))
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertNotIn('INSERT INTO document', (self.root / 'all.sql').read_text())


def load_json_text(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


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
