"""Module versions must follow content: a changed module changes every importer's URL.

    python3 -m unittest discover -s tools -p 'test_*.py'

Each test copies the atlas pages and modules into a temporary tree, runs the
generator, edits one module, runs it again, and compares the URLs. This is what
stops a returning visitor getting a new page with an old cached module.
"""
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parent
ATLAS = TOOLS.parent
sys.path.insert(0, str(TOOLS))
import version_modules  # noqa: E402

PAGES = ['index.html', 'state/index.html', 'mla/index.html', 'mp/index.html']
MODULE_DIRS = ['lib', 'state', 'vendor']


def copy_atlas(dest):
    for d in MODULE_DIRS:
        for src in (ATLAS / d).glob('*.js'):
            (dest / d).mkdir(parents=True, exist_ok=True)
            shutil.copy(src, dest / d / src.name)
    for page in PAGES:
        (dest / page).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ATLAS / page, dest / page)


def write_versions(root):
    for path, text in version_modules.stale_files(root).items():
        path.write_text(text, encoding='utf-8')


def urls_of(path, name):
    """Every versioned URL of module `name` referenced from the file at path."""
    return set(re.findall(rf'[./]*[\w/-]*{re.escape(name)}\?v=[0-9a-f]{{8}}', path.read_text(encoding='utf-8')))


def append(path, text):
    path.write_text(path.read_text(encoding='utf-8') + text, encoding='utf-8')


class VersionModulesTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp()).resolve()
        self.addCleanup(shutil.rmtree, self.root)
        copy_atlas(self.root)
        write_versions(self.root)

    def test_every_page_import_is_versioned(self):
        for page in PAGES:
            html = (self.root / page).read_text(encoding='utf-8')
            for spec in re.findall(r"""(?:from\s*|import\s*\(\s*)['"](\.\.?/[^'"]+)['"]""", html):
                self.assertRegex(spec, r'\.js\?v=[0-9a-f]{8}$', f'{page}: {spec}')

    def test_changed_leaf_changes_every_importer_url(self):
        geo, arr, imap = (self.root / 'vendor' / n for n in ('d3-geo.js', 'd3-array.js', 'internmap.js'))
        before = {
            'arr->imap': urls_of(arr, 'internmap.js'),
            'geo->arr': urls_of(geo, 'd3-array.js'),
            'national->geo': urls_of(self.root / 'index.html', 'd3-geo.js'),
            'state->geo': urls_of(self.root / 'state/index.html', 'd3-geo.js'),
        }
        self.assertTrue(all(before.values()), before)
        append(imap, '\n// changed\n')
        write_versions(self.root)
        after = {
            'arr->imap': urls_of(arr, 'internmap.js'),
            'geo->arr': urls_of(geo, 'd3-array.js'),
            'national->geo': urls_of(self.root / 'index.html', 'd3-geo.js'),
            'state->geo': urls_of(self.root / 'state/index.html', 'd3-geo.js'),
        }
        for key in before:
            self.assertTrue(after[key], key)
            self.assertNotEqual(before[key], after[key], f'{key} kept its URL after internmap.js changed')

    def test_changed_shared_module_changes_every_page_and_nothing_else(self):
        before = {p: (self.root / p).read_text(encoding='utf-8') for p in PAGES}
        geo_before = urls_of(self.root / 'index.html', 'd3-geo.js')
        append(self.root / 'lib/atlas.js', '\nexport const added = 1;\n')
        self.assertEqual(set(version_modules.stale_files(self.root)),
                         {self.root / p for p in PAGES})
        write_versions(self.root)
        for page in PAGES:
            self.assertNotEqual(before[page], (self.root / page).read_text(encoding='utf-8'), page)
        self.assertEqual(geo_before, urls_of(self.root / 'index.html', 'd3-geo.js'))

    def test_check_fails_on_a_stale_version(self):
        append(self.root / 'state/card.js', '\n// changed\n')
        stale = version_modules.stale_files(self.root)
        self.assertEqual(set(stale), {self.root / 'state/index.html'})

    def test_missing_module_and_cycle_are_errors(self):
        append(self.root / 'state/card.js', "\nimport './nowhere.js';\n")
        with self.assertRaisesRegex(SystemExit, 'nowhere.js, which does not exist'):
            version_modules.stale_files(self.root)
        (self.root / 'state/card.js').write_text("import './stands.js';\n", encoding='utf-8')
        append(self.root / 'state/stands.js', "\nimport './card.js';\n")
        with self.assertRaisesRegex(SystemExit, 'import cycle'):
            version_modules.stale_files(self.root)


if __name__ == '__main__':
    unittest.main()
