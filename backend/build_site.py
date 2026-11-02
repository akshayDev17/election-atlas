#!/usr/bin/env python3
"""Assemble the Worker's static assets: the atlas at its full public path.

    python3 backend/build_site.py --out dist [--data-from <exported data dir>]

Copies the repository's published files into dist/work/election-atlas/, the
path the atlas has always been served at, so every asset resolves without a
prefix rewrite. Only files git tracks are candidates (never build output or a
checkout of another repository lying in the work tree), and "published" follows
the rule GitHub Pages applied: any path with a segment starting with "." or "_"
is left out (Jekyll skipped those), and so is what belongs to this repository
rather than the site (backend/, the README).

--data-from overlays the data files exported from D1 (backend/d1/export.py) and
the Lok Sabha files kept static (committed under data/ until their sources are
re-verified). The bill PDFs are not assets: the Worker streams them from R2.

--complete-against <data dir> refuses a site that lacks any results/ or cabinet/
file that directory holds: every data file the pages read before the move must
be either exported from D1 or committed here.
"""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MOUNT = Path('work/election-atlas')
NOT_PUBLISHED = {'backend', 'README.md', 'LICENSE', 'node_modules', 'dist'}


def tracked_files(root):
    out = subprocess.run(['git', '-C', str(root), 'ls-files', '-z'], capture_output=True, check=True).stdout
    return sorted(Path(p) for p in out.decode().split('\0') if p)


def published_files(root):
    for rel in tracked_files(root):
        p = root / rel
        if not p.is_file():
            continue
        if rel.parts[0] in NOT_PUBLISHED:
            continue
        if any(seg.startswith(('.', '_')) for seg in rel.parts):
            continue
        if p.suffix == '.pdf':
            continue
        yield rel


def build(out, data_from=None):
    out = Path(out)
    if out.exists():
        shutil.rmtree(out)
    site = out / MOUNT
    count = 0
    for rel in published_files(REPO):
        dest = site / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(REPO / rel, dest)
        count += 1
    overlay = 0
    if data_from:
        for p in sorted(Path(data_from).rglob('*.json')):
            dest = site / 'data' / p.relative_to(data_from)
            if dest.exists():
                sys.exit(f'build_site: {dest} is both committed and exported from D1')
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(p, dest)
            overlay += 1
    print(f'build_site: {count} committed files + {overlay} exported data files -> {site}')
    return site


def missing_against(site, old_data):
    old_data = Path(old_data)
    return [p.relative_to(old_data).as_posix() for p in sorted(old_data.rglob('*.json'))
            if p.relative_to(old_data).parts[0] in ('results', 'cabinet')
            and not (site / 'data' / p.relative_to(old_data)).exists()]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--out', default=str(REPO / 'dist'))
    ap.add_argument('--data-from', help='directory of data files exported from D1')
    ap.add_argument('--complete-against', help='data directory whose results/ and cabinet/ files must all be present')
    args = ap.parse_args(argv)
    site = build(args.out, args.data_from)
    if args.complete_against:
        missing = missing_against(site, args.complete_against)
        for rel in missing:
            print(f'build_site: MISSING data/{rel} (neither exported from D1 nor committed)')
        if missing:
            return 1
        print(f'build_site: every results/ and cabinet/ file of {args.complete_against} is present')
    return 0


if __name__ == '__main__':
    sys.exit(main())
