#!/usr/bin/env python3
"""Stamp every atlas JS module URL with a content-hash version: `./lib/atlas.js?v=1a2b3c4d`.

    python3 tools/version_modules.py           # rewrite the pages and modules in place
    python3 tools/version_modules.py --check   # exit 1 if any version is out of date

The live site serves the pages with a 10-minute browser cache but the JS modules
with 4 hours, so without versions a returning visitor can get a new page with the
old module it imports and the page breaks (a missing export is a SyntaxError).
With a version on every module URL, a changed module gets a new URL that no cache
holds.

Starting from every page (*.html outside tools/, data/ and _research/), it follows
the relative imports in <script> blocks (`from '...'`, `import '...'`,
`import('...')`), then in each imported module.
Versions are computed leaves first: a module's version is the sha256 of its text
after its own imports have been versioned, so a change to any module changes the
URL of every module and page that reaches it. Never edit a `?v=` by hand.
"""
import hashlib
import re
import sys
from pathlib import Path

ATLAS = Path(__file__).resolve().parent.parent
# atlas-source, dist and exported are a CI checkout of the pinned github.io atlas and
# build output (backend/build_site.py, backend/d1/export.py), never pages of this repo.
SKIP_DIRS = {'tools', 'data', '_research', 'node_modules', '.venv', 'atlas-source', 'dist', 'exported'}

# A relative module specifier after `from`, `import` or `import(`, with any old version.
SPECIFIER = re.compile(
    r"""(?P<lead>\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)"""
    r"""(?P<q>['"])(?P<path>\.\.?/[^'"?#\s]+?\.m?js)(?:\?v=[0-9a-f]*)?(?P=q)""")
# A root-absolute specifier: versioning it would need the site root, so refuse it.
ABSOLUTE = re.compile(r"""(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]/[^'"]*\.m?js['"]""")
SCRIPT_BLOCK = re.compile(r'(<script\b[^>]*>)(.*?)(</script>)', re.S | re.I)


def find_pages(root):
    return sorted(p for p in root.rglob('*.html')
                  if not SKIP_DIRS.intersection(p.relative_to(root).parts[:-1]))


def content_version(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:8]


def resolve_module(root, importer, spec):
    target = (importer.parent / spec).resolve()
    if not target.is_file():
        raise SystemExit(f'{importer.relative_to(root)}: imports {spec}, which does not exist')
    if root not in target.parents:
        raise SystemExit(f'{importer.relative_to(root)}: imports {spec}, outside {root}')
    return target


def rewrite_specifiers(text, versioned_url):
    """Replace each relative module specifier with versioned_url(path)."""
    def stamp(m):
        return f"{m['lead']}{m['q']}{versioned_url(m['path'])}{m['q']}"
    return SPECIFIER.sub(stamp, text)


def refuse_absolute(root, path, text):
    m = ABSOLUTE.search(text)
    if m:
        raise SystemExit(f'{path.relative_to(root)}: root-absolute import {m[0]} cannot be versioned; '
                         'use a relative path')


def versioned_texts(root):
    """Map each page and reachable module to its text with every module URL versioned."""
    root = root.resolve()
    versions, texts = {}, {}

    def module_version(path, chain):
        if path in chain:
            cycle = ' -> '.join(str(p.relative_to(root)) for p in (*chain, path))
            raise SystemExit(f'import cycle: {cycle}')
        if path not in versions:
            text = path.read_text(encoding='utf-8')
            refuse_absolute(root, path, text)
            texts[path] = rewrite_specifiers(text, url_for(path, (*chain, path)))
            versions[path] = content_version(texts[path])
        return versions[path]

    def url_for(importer, chain):
        def versioned_url(spec):
            target = resolve_module(root, importer, spec)
            return f'{spec}?v={module_version(target, chain)}'
        return versioned_url

    for page in find_pages(root):
        html = page.read_text(encoding='utf-8')
        to_url = url_for(page, ())

        def rewrite_script(m):
            tag, body, end = m.groups()
            refuse_absolute(root, page, body)
            return tag + rewrite_specifiers(body, to_url) + end

        texts[page] = SCRIPT_BLOCK.sub(rewrite_script, html)
    return texts


def stale_files(root):
    texts = versioned_texts(root)
    return {p: t for p, t in texts.items() if p.read_text(encoding='utf-8') != t}


def main(argv):
    check = '--check' in argv
    root = ATLAS.resolve()
    stale = stale_files(root)
    names = [str(p.relative_to(root)) for p in sorted(stale)]
    if check:
        if stale:
            print('module versions are out of date in: ' + ', '.join(names), file=sys.stderr)
            print('run: python3 work/election-atlas/tools/version_modules.py', file=sys.stderr)
            return 1
        print('module versions are up to date')
        return 0
    for path, text in stale.items():
        path.write_text(text, encoding='utf-8')
    print('rewrote ' + ', '.join(names) if names else 'module versions already up to date')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
