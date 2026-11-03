"""The /elections country list is derived from D1, never kept by hand.

    python3 -m unittest discover -s backend/d1 -p 'test_*.py'

The fixture is a real excerpt of what D1 holds, written straight into a database
built from the migrations: two constituencies of the Election Commission's
published 2024 Lok Sabha result (Aruku and Eluru, Andhra Pradesh, each with the
first parties of its published party list) and Jammu and Kashmir in the 1980
state-level file, each under its own published source.
"""
import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
MIGRATIONS = sorted((HERE.parent / 'migrations').glob('*.sql'))
sys.path.insert(0, str(HERE))
import countries  # noqa: E402

SRC_2024 = (1, 'eci', 'https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/33-Constituency-Wise-Detailed-Result.xls',
            '91010daf2f545c89b053a45ebf17f04c6a602e0017d0b81d20f4eb5c456a0fac', '2026-11-02T08:52:28Z')
SRC_1980 = (2, 'eci', 'https://old.eci.gov.in/files/file/4117-general-election-1980-vol-i-ii/?do=download&r=9752&confirm=1&t=1',
            'c739cb72c63c645b1a3e00b1c1ba125cc7dff2e897f5474a865da705b59f0f76', '2026-11-02T09:57:47Z')
LAYOUT = json.dumps({'indent': None, 'ascii': False, 'newline': False})
# (geo uid, seat number, name, [(party, votes), ...] with the winner first)
PC_2024 = [
    ('S01_1', '1', 'Aruku', [('YSRCP', 477005), ('BJP', 426425), ('CPM', 123129), ('NOTA', 50470)]),
    ('S01_10', '10', 'Eluru', [('TDP', 746351), ('YSRCP', 564494), ('NOTA', 22515), ('INC', 20826)]),
]
JK_1980 = [('JKN', 3, 493143), ('IND', 1, 284459)]
PARTIES = [('YSRCP', 'Yuvajana Sramika Rythu Congress Party', '#1565C0'), ('TDP', 'Telugu Desam', '#FFC300'),
           ('BJP', 'Bharatiya Janata Party', '#E8590C'), ('INC', 'Indian National Congress', '#00A2E8'),
           ('CPM', 'Communist Party of India (Marxist)', '#9E1B32'), ('NOTA', 'None of the Above', '#B0BEC5'),
           ('JKN', 'Jammu & Kashmir National Conference', None), ('IND', 'Independent', '#78909C')]


def database(path, *, pc=True, rollup=True, nation=True):
    con = sqlite3.connect(path)
    con.execute('PRAGMA foreign_keys = ON')
    for m in MIGRATIONS:
        con.executescript(m.read_text())
    con.executemany('INSERT INTO source VALUES (?, ?, ?, ?, ?)', [SRC_2024, SRC_1980])
    regions = [('IN-AP', 'Andhra Pradesh', 'state'), ('IN-JK', 'Jammu and Kashmir', 'state')]
    if nation:
        regions.append(('IN', 'India', 'nation'))
    con.executemany('INSERT INTO region VALUES (?, ?, ?)', regions)
    con.executemany('INSERT INTO party VALUES (?, ?, ?, 1)', PARTIES)
    if not nation:
        con.commit()
        return con
    con.execute("INSERT INTO house VALUES ('ls', 'ls', 'IN')")
    con.execute("INSERT INTO term VALUES (24, 'ls', 2024, '18th Lok Sabha', 'published', 1)")
    con.execute("INSERT INTO term VALUES (80, 'ls', 1980, NULL, 'published', 2)")
    if pc:
        head = json.dumps({'schema': 2, 'provenance': 'published', 'election': 'ls', 'year': 2024,
                           'source': {'publisher': 'Election Commission of India', 'url': SRC_2024[2]}})
        con.execute("INSERT INTO document VALUES ('results/ls/pc/2024.json', 'ls-pc', 24, NULL, ?, ?, 'published', 1)",
                    (head, LAYOUT))
        for i, (uid, no, name, rows) in enumerate(PC_2024):
            con.execute("INSERT INTO seat VALUES (?, 'ls', 'IN-AP', ?, ?, ?, 2008)", (i + 1, no, name, uid))
            con.execute("INSERT INTO contest (id, term_id, seat_id, seq, position, label, provenance, source_id) "
                        "VALUES (?, 24, ?, 0, ?, ?, 'published', 1)", (i + 1, i + 1, i, name))
            con.executemany("INSERT INTO candidacy VALUES (?, 'party', ?, ?, '', ?)",
                            [(i + 1, j, p, v) for j, (p, v) in enumerate(rows)])
    if rollup:
        head = json.dumps({'schema': 2, 'provenance': 'published', 'election': 'ls', 'year': 1980,
                           'source': {'publisher': 'Election Commission of India', 'url': SRC_1980[2]}})
        con.execute("INSERT INTO document VALUES ('results/ls/1980.json', 'ls-rollup', 80, NULL, ?, ?, 'published', 2)",
                    (head, LAYOUT))
        con.execute("INSERT INTO region_tally VALUES (80, 'IN-JK', 0, 6, NULL, 'published', 2, NULL)")
        con.executemany("INSERT INTO region_party_tally VALUES (80, 'IN-JK', ?, ?, ?, ?, 'published', 2)",
                        [(j, p, s, v) for j, (p, s, v) in enumerate(JK_1980)])
    con.commit()
    return con


class Derive(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.db = self.root / 'd1.sqlite'
        self.site = self.root / 'dist'

    def tearDown(self):
        self.tmp.cleanup()

    def page(self, slug):
        p = self.site / 'elections' / slug / 'index.html'
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text('<!DOCTYPE html>')

    def test_a_nation_with_a_published_result_and_a_page_is_listed_from_its_latest_election(self):
        database(self.db).close()
        self.page('india')
        listed, skipped = countries.derive(self.db, self.site)
        self.assertEqual(skipped, [])
        self.assertEqual([c['code'] for c in listed], ['IN'])
        india = listed[0]
        self.assertEqual((india['name'], india['slug']), ('India', 'india'))
        e = india['election']
        self.assertEqual((e['year'], e['label'], e['house'], e['unit']), (2024, '18th Lok Sabha', 'Lok Sabha', 'seats'))
        # one seat each: the tie goes to the party with more votes, counted in every seat it contested
        self.assertEqual(e['total'], 2)
        self.assertEqual(e['votesPolled'], 477005 + 426425 + 123129 + 50470 + 746351 + 564494 + 22515 + 20826)
        self.assertEqual([(t['code'], t['seats'], t['votes']) for t in e['top']],
                         [('YSRCP', 1, 477005 + 564494), ('TDP', 1, 746351)])
        self.assertEqual(e['top'][0]['share'], round(100 * (477005 + 564494) / e['votesPolled'], 1))
        self.assertEqual((e['top'][0]['name'], e['top'][0]['colour']), ('Yuvajana Sramika Rythu Congress Party', '#1565C0'))
        self.assertEqual(e['source'], {'publisher': 'Election Commission of India', 'url': SRC_2024[2]})
        self.assertEqual(india['history'], {'elections': 2, 'first': 1980})
        self.assertEqual(india['seats'], {'winners': {'S01_1': 'YSRCP', 'S01_10': 'TDP'},
                                          'colours': {'TDP': '#FFC300', 'YSRCP': '#1565C0'}})

    def test_without_its_country_page_a_nation_is_not_listed(self):
        database(self.db).close()
        listed, skipped = countries.derive(self.db, self.site)
        self.assertEqual(listed, [])
        self.assertEqual(skipped, [('IN', 'no country page at /elections/india/')])

    def test_a_region_rollup_is_the_headline_when_no_constituency_file_exists(self):
        database(self.db, pc=False).close()
        self.page('india')
        (india,), _ = countries.derive(self.db, self.site)
        e = india['election']
        self.assertEqual((e['year'], e['label'], e['total']), (1980, None, 6))
        self.assertEqual([(t['code'], t['seats']) for t in e['top']], [('JKN', 3), ('IND', 1)])
        self.assertEqual(e['top'][0]['colour'], None)
        self.assertEqual(e['source']['url'], SRC_1980[2])
        self.assertIsNone(india['seats'])
        self.assertEqual(india['history'], {'elections': 1, 'first': 1980})

    def test_a_nation_without_a_published_national_result_is_not_listed(self):
        database(self.db, pc=False, rollup=False).close()
        self.page('india')
        self.assertEqual(countries.derive(self.db, self.site), ([], [('IN', 'no published national result in D1')]))

    def test_states_are_never_countries(self):
        database(self.db, nation=False).close()
        for slug in ('andhra-pradesh', 'jammu-and-kashmir'):
            self.page(slug)
        self.assertEqual(countries.derive(self.db, self.site), ([], []))

    def test_main_writes_the_list_and_refuses_an_empty_one(self):
        database(self.db).close()
        out = self.root / 'countries.json'
        self.assertEqual(countries.main(['--db', str(self.db), '--site', str(self.site), '--out', str(out)]), 1)
        self.assertFalse(out.exists())
        self.page('india')
        self.assertEqual(countries.main(['--db', str(self.db), '--site', str(self.site), '--out', str(out)]), 0)
        self.assertEqual([c['slug'] for c in json.loads(out.read_text())], ['india'])

    def test_slugs(self):
        for name, slug in [('India', 'india'), ('United Kingdom', 'united-kingdom'), ("Côte d'Ivoire", 'cote-d-ivoire'),
                           ('Bosnia and Herz.', 'bosnia-and-herz'), ('  São Tomé ', 'sao-tome')]:
            self.assertEqual(countries.slug_of(name), slug)


if __name__ == '__main__':
    unittest.main()
