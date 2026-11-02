"""The atlas keeps no member portraits: initials plus a link to sansad.in.

    python3 -m unittest discover -s tools -p 'test_*.py'

No portrait file may be committed, no data file may point at one, and every
Lok Sabha member the pages link to has a Sansad member number to build that
link from. The link itself is covered by tools/test_member_link.mjs.
"""
import json
import unittest
from pathlib import Path

ATLAS = Path(__file__).resolve().parent.parent
DATA = ATLAS / 'data'


class NoStoredPortraits(unittest.TestCase):
    def test_no_portrait_files_are_kept(self):
        for d in ('photos/ls', 'photos/cabinet'):
            found = [p for p in (DATA / d).rglob('*') if p.is_file()] if (DATA / d).exists() else []
            self.assertEqual(found, [], f'data/{d} still holds files')

    def test_availability_lists_no_photos(self):
        avail = json.loads((DATA / 'availability.json').read_text(encoding='utf-8'))
        self.assertNotIn('photos', avail)

    def test_cabinet_members_carry_no_photo_field(self):
        for p in sorted((DATA / 'cabinet').rglob('*.json')):
            for m in json.loads(p.read_text(encoding='utf-8')).get('members', []):
                self.assertNotIn('photo', m, f'{p.relative_to(DATA)}: {m.get("name")}')
                if 'mpsno' in m:
                    self.assertIsInstance(m['mpsno'], int, f'{p.relative_to(DATA)}: {m.get("name")}')
                if 'house' in m:
                    self.assertEqual(m['house'], 'rs', f'{p.relative_to(DATA)}: {m.get("name")}')

    def test_every_2024_seat_has_a_sansad_member_number(self):
        doc = json.loads((DATA / 'members/ls/2024.json').read_text(encoding='utf-8'))
        members = doc['members']
        self.assertEqual(len(members), doc['count'])
        for uid, m in members.items():
            self.assertIsInstance(m.get('mpsno'), int, uid)
            self.assertFalse({'url', 'photo', 'image'} & set(m), f'{uid} keeps an image field')


if __name__ == '__main__':
    unittest.main()
