"""The source registry (countries/<CC>/sources.json) is what both gates read.

    python3 -m unittest discover -s tools -p 'test_*.py'

Every registered publisher carries its id, hosts, licence, terms URL and the day
the terms were read; ids are unique across countries; India's Election Commission
is recorded as all-rights-reserved with its terms URL; and the gates refuse a
publisher or host the registry does not name while a second country's registry
is picked up without any edit to a gate.
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
from harvest import registry, validate  # noqa: E402

SHA = '0' * 64


def record(publisher, url):
    return {'provenance': 'published', 'note': 'Published result.',
            'source': {'publisher': publisher, 'url': url, 'sha256': SHA, 'fetched_at': '2026-11-01T00:00:00Z'}}


class Registry(unittest.TestCase):
    def test_every_publisher_is_complete(self):
        pubs = registry.publishers()
        self.assertTrue(pubs)
        for pid, entry in pubs.items():
            for key in registry.PUBLISHER_KEYS:
                self.assertIn(key, entry, f'{pid} lacks {key}')
            self.assertTrue(entry['hosts'], f'{pid} names no host')
            if entry['licence_url'] is not None:
                self.assertTrue(entry['licence_url'].startswith('https://'), pid)
            if entry['licence'] != 'unchecked':
                self.assertRegex(entry['licence_checked'] or '', r'^\d{4}-\d{2}-\d{2}$', pid)

    def test_india_registers_its_seven_publishers(self):
        self.assertEqual(sorted(registry.registries()['IN']['publishers'][i]['id'] for i in range(7)),
                         ['eci', 'mospi-mplads', 'pib', 'pmindia', 'president-secretariat', 'sansad', 'upcmo'])

    def test_eci_is_all_rights_reserved_with_its_terms_url(self):
        eci = registry.publishers()['eci']
        self.assertEqual(eci['licence'], 'all-rights-reserved')
        self.assertEqual(eci['licence_url'], 'https://www.eci.gov.in/terms-and-conditions')
        self.assertIsNotNone(eci['licence_checked'])

    def test_every_election_names_a_registered_publisher_and_a_cross_check(self):
        doc = registry.registries()['IN']
        ids = set(registry.publishers())
        for e in doc['elections']:
            self.assertIn(e['publisher'], ids, e['id'])
            self.assertTrue(e['cross_check'], e['id'])
            self.assertTrue((REPO / e['harvester']).is_file(), e['harvester'])
        for c in doc['councils']:
            self.assertTrue(set(c['publishers']) <= ids, c['id'])
            self.assertTrue((REPO / c['harvester']).is_file(), c['harvester'])

    def test_a_host_matches_itself_or_a_subdomain_only(self):
        self.assertTrue(registry.host_matches('www.eci.gov.in', ['eci.gov.in']))
        self.assertTrue(registry.host_matches('old.eci.gov.in', ['eci.gov.in']))
        self.assertFalse(registry.host_matches('eci.gov.in.example.com', ['eci.gov.in']))
        self.assertFalse(registry.host_matches('noteci.gov.in', ['eci.gov.in']))

    def test_the_same_id_in_two_countries_is_refused(self):
        with tempfile.TemporaryDirectory() as t:
            for cc in ('AA', 'BB'):
                d = Path(t) / cc
                d.mkdir()
                (d / 'sources.json').write_text(json.dumps({'publishers': [
                    {'id': 'eci', 'name': 'x', 'hosts': ['example.org'], 'licence': 'unchecked',
                     'licence_url': None, 'licence_checked': None}]}))
            with self.assertRaises(ValueError):
                registry.publishers(Path(t))

    def test_a_host_with_a_scheme_or_capitals_is_refused(self):
        with tempfile.TemporaryDirectory() as t:
            d = Path(t) / 'AA'
            d.mkdir()
            for host in ('https://example.org', 'Example.org', 'example.org/path'):
                (d / 'sources.json').write_text(json.dumps({'publishers': [
                    {'id': 'x', 'name': 'x', 'hosts': [host], 'licence': 'unchecked',
                     'licence_url': None, 'licence_checked': None}]}))
                with self.assertRaises(ValueError, msg=host):
                    registry.publishers(Path(t))


class GatesReadTheRegistry(unittest.TestCase):
    def test_validate_accepts_a_registered_publisher_on_its_host(self):
        self.assertEqual(validate.validate(record('eci', 'https://old.eci.gov.in/x.xlsx')), [])

    def test_validate_refuses_an_unregistered_publisher(self):
        problems = validate.validate(record('gb-parliament', 'https://electionresults.parliament.uk/x.csv'))
        self.assertTrue(any("not on the allow-list" in p for p in problems), problems)

    def test_validate_refuses_another_publishers_host(self):
        problems = validate.validate(record('eci', 'https://pib.gov.in/x.xlsx'))
        self.assertTrue(any('does not belong to eci' in p for p in problems), problems)

    def test_a_second_countrys_registry_is_read_without_touching_the_gate(self):
        with tempfile.TemporaryDirectory() as t:
            for cc, pid, host in (('IN', 'eci', 'eci.gov.in'), ('GB', 'gb-parliament', 'parliament.uk')):
                d = Path(t) / cc
                d.mkdir()
                (d / 'sources.json').write_text(json.dumps({'publishers': [
                    {'id': pid, 'name': pid, 'hosts': [host], 'licence': 'unchecked',
                     'licence_url': None, 'licence_checked': None}]}))
            pubs = registry.publishers(Path(t))
            self.assertEqual(sorted(pubs), ['eci', 'gb-parliament'])
            self.assertTrue(registry.host_of_publisher('gb-parliament', 'https://electionresults.parliament.uk/x.csv', pubs))
            self.assertFalse(registry.host_of_publisher('eci', 'https://electionresults.parliament.uk/x.csv', pubs))
            self.assertFalse(registry.host_of_any_publisher('http://www.eci.gov.in/x', pubs))


if __name__ == '__main__':
    unittest.main()
