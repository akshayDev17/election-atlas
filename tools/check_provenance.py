#!/usr/bin/env python3
"""The provenance gate: fail if anything but published data reaches the atlas.

    python3 tools/check_provenance.py data            # exit 0 = clean, 1 = violations
    python3 tools/check_provenance.py dist/elections/india/data --db d1.sqlite
    python3 tools/check_provenance.py dist/elections/india/data \
        --remote https://akshayprabhakant.com/elections/india/

Checks, each listed in full before the exit:

1. Every JSON file under results/, cabinet/ and members/ declares top-level
   "provenance": "published" and names its source by an https URL on a
   government publisher's host (source.url, or every sources[].url).
2. No JSON file anywhere under the data directory carries a forbidden word
   (synthetic, dummy, invented, placeholder, fake, mock) in a metadata field:
   any key named note*, source*, _note, caveat or provenance, at any depth.
   Free text is not scanned: real Sansad answers and MPLADS work titles
   contain words like "synthetic rubbers" and "synthetic track".
3. The four atlas pages (the frontend's static export: each page's HTML and
   the JavaScript chunks under _next/static/ that carry the page code) and
   manifest.json never contain the word "synthetic".
4. The dummy files removed from the atlas never come back: no file under the
   data directory has the exact bytes of one of them, and a file at one of
   their paths must be published data for a real election (an assembly or
   state-cabinet path must name one of that state's real assembly cycles).
5. With --db (a SQLite copy of the election-atlas D1 database, from
   `wrangler d1 export`): no row of a provenance-bearing table is anything but
   published, none lacks a source_id or names a source that does not exist, and
   every source is an allow-listed publisher on an allowed https host with a
   sha256 and a fetched_at. The schema's CHECK constraints already refuse such
   rows; this catches a schema that drifted away from them.
6. With --remote BASE: checks 1 to 4 run over what BASE actually serves. Every
   JSON file under DATA_DIR, the pages, the chunks the served pages load and
   manifest.json are fetched from BASE (the atlas root URL) and checked as
   served; a file BASE does not answer 200 for is a violation. DATA_DIR then only
   lists which files to fetch.
"""
import argparse
import hashlib
import json
import re
import sqlite3
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ALLOWED_HOSTS = {
    'eci.gov.in', 'old.eci.gov.in', 'presidentofindia.gov.in', 'pmindia.gov.in',
    'pib.gov.in', 'sansad.in', 'upcmo.up.nic.in', 'mplads.mospi.gov.in',
    # The President's Secretariat archive for 2017-22 (Ram Nath Kovind's term),
    # where its press releases on the 2017-19 Union reshuffles are published.
    'ramnathkovind.nic.in',
}
FORBIDDEN = re.compile(r'\b(synthetic|dummy|invented|placeholder|fake|mock)', re.I)
METADATA_KEY = re.compile(r'^(note.*|source.*|_note|caveat|provenance)$', re.I)
PROVENANCE_DIRS = ('results', 'cabinet', 'members')
PAGES = ('index.html', 'state/index.html', 'mp/index.html', 'mla/index.html')
CHUNKS = '_next/static'
SCRIPT_SRC = re.compile(r'<script\b[^>]*\bsrc="([^"]+\.js)"', re.I)

# The 53 files that held dummy data until they were deleted, with the sha256 of
# the bytes they held (work/election-atlas/data at 4c64517).
RETIRED = {
    'cabinet/state/IN-UP/2014.json': 'a8529e3832d5760c86189b056815645cea158798c25e3c682ca353efe6dd5fa8',
    'cabinet/state/IN-UP/2019.json': 'e5e59441a7e9822c0ab56ffb0d298a348c1c260f7de338b39c141687c6e9105b',
    'cabinet/state/IN-UP/2024.json': 'bb699be0fd0107b64ee1aad61c1f1f3691fa8feaf945fd189823b2b0b17828fb',
    'cabinet/union/2014.json': '7fd72bfb91b9809924cc312690eb3f1dd018b7acb1d88954e01b457af1e2bb07',
    'results/ac/IN-BR/2014-detail.json': '71fdd3e5132950669e83d6e6557d9588d38875d64cb1fc6a91325b32b97e7bb2',
    'results/ac/IN-BR/2014.json': '8e6f7e56ae7c341542f7dc4d52041f78c3b7389e5b1c3c7e6de59f878137f838',
    'results/ac/IN-BR/2019-detail.json': '1fdbce06be9297677c53bda32b7f297d9e9ee0d42c0288dffb50bf59b375a36a',
    'results/ac/IN-BR/2019.json': 'cbb388f357d7b9a8e5e0dd31e42eceb8429fd8627ff58a41f77340d792fa83f1',
    'results/ac/IN-BR/2024-detail.json': '32eb8eeddca7c080249b3810edbb1a20f27d23dd354c032854a3a6fcbdb7fb5c',
    'results/ac/IN-BR/2024.json': 'a6392473637deb8a2e8bd4efdd0cf430e445bcac94ed0c763e30f5ae55bbf0ec',
    'results/ac/IN-CT/2014-detail.json': '0449c5e4a37b55098683e41db7ad1515f0ac97071d88cf064e2fa50eb6e0f152',
    'results/ac/IN-CT/2014.json': '4ea2aa0a435d14d56ca227ff00ac5fffd517a7692d2dabead9328c171cd8a210',
    'results/ac/IN-CT/2019-detail.json': '1ccc3ce9bd7ed02029b74a9967aa01c67721e1bd83454fadd0f1697aba5de62e',
    'results/ac/IN-CT/2019.json': 'b218e3ef9aa184fd377b5d62ab2bb611a2717c95e6626613e4582ecad0936ec6',
    'results/ac/IN-CT/2024-detail.json': 'e8ac432ff6fccd53fe4db311a7b36e1a43bfcd334e116138fbc956198fb6123b',
    'results/ac/IN-CT/2024.json': 'e4d550ad25ccb7ebd5f273ed0efe29b51f59e453e2601961fabf193a66667a5a',
    'results/ac/IN-HR/2014-detail.json': '5864eb42e1c223fbcb75eb2437b6965b3fdd7ea296b3bb6a9627669d7b7df6d1',
    'results/ac/IN-HR/2014.json': 'd7cbfce6cd249e7ad07c21be152219f3deaaa7108e9864beb6d28d13828f3622',
    'results/ac/IN-HR/2019-detail.json': '6f322bad7da5186038ef22d20870ed853a77d9abcdb5fbc668e1ccbd09260df1',
    'results/ac/IN-HR/2019.json': '3bee9df938fafbc5b4259ab5cf398ff094dedc10721d5c7cc0724aa66380c6ee',
    'results/ac/IN-HR/2024-detail.json': 'e4ac83c1a098739d6a6ee832edb7160c67a6434728542cbdaae988fea617a26a',
    'results/ac/IN-HR/2024.json': '7f793d1104f3409b8e1f304ed9ce4673f81b3386d664543992901de330a01071',
    'results/ac/IN-OD/2014-detail.json': '50ed37951a8d74ffd0fe1035d004e6362e36e520b2ce30053632108c1a4b09a9',
    'results/ac/IN-OD/2014.json': 'af4cfc0b19dbd3d9642a3d1540ea41411a73fc74e25e875c267efd2c6225e831',
    'results/ac/IN-OD/2019-detail.json': 'e7655e7b6d09a1d5264744f1954d7cc63f795855ca08235b810f42c2ab8e1a38',
    'results/ac/IN-OD/2019.json': '0f3d909016398b7057509571c741421decd6d180c1ac3c5750624d46155f2ab4',
    'results/ac/IN-OD/2024-detail.json': '4b0c09ae307eb5dbf7df57559457e851797da5f7d01ae661056b833da02a0ddc',
    'results/ac/IN-OD/2024.json': '12a56dfac45a362b626b99b2183fd8b596e60f840ea766db282ff1c224abc545',
    'results/ac/IN-PB/2014-detail.json': 'cafc5ac485bfaa8b6783fb00ee50ce609909d02a2bc8f7d36bc7e04ebd1ff647',
    'results/ac/IN-PB/2014.json': 'b30cb652b7f214d5059fe89982f6f907a21d9cd11547c12360ac74e75949e59e',
    'results/ac/IN-PB/2019-detail.json': '0aa5e6b60b901ccd911e53568da3374446cbb9e8b30aef2dc2fc93c18cc008f0',
    'results/ac/IN-PB/2019.json': 'f4aef444ffb26b084277f3eb00250b9b17783711cd4e70c6e0bfa153697d2d43',
    'results/ac/IN-PB/2024-detail.json': '957d77f7c119772dcd1ec75d42ec5079b76777c49c699d9f6cd5c6e1fd038f5b',
    'results/ac/IN-PB/2024.json': 'a44e8d5d71cad796229acc2aa1791e0533fbdb86df7258470f2a93aef9cfe6e8',
    'results/ac/IN-TN/2014-detail.json': '11a389726e9159775e93de49c1056c063ca3a35d6d1b3762f73dd4aa7a0b026b',
    'results/ac/IN-TN/2014.json': 'b8f08cd4e27144e8a44323f254c124995232c355e6fb73f90b74657b514c4efe',
    'results/ac/IN-TN/2019-detail.json': '6eccbdbbb97d6856c0dca5b68ba01d99cc6cebbdc8c17f31806eba0161448b6a',
    'results/ac/IN-TN/2019.json': '3f5616ce8a5321675582c6d6f5c55805f233c463510655e39debcbe5720a29e2',
    'results/ac/IN-TN/2024-detail.json': 'a5aaa078fd4185a4f016da529fc0bb329b2907bc639e273ef7c297f6d7152bf7',
    'results/ac/IN-TN/2024.json': 'efb46daeabdb6a64e4e7c60b3d364381a4bd52112db7387e6a67f9871501182e',
    'results/ac/IN-UP/2014-detail.json': 'b56b322198efe3057270c1ff30f76a8e62335905935513108f1ced608950d37e',
    'results/ac/IN-UP/2014.json': '83f3a8cd8171a14860ec20e4ca0f5a203a0546538b3c13ce1462d220d3cbc1df',
    'results/ac/IN-UP/2019-detail.json': '8c45a188422123b78b07aacadb88740ad4026b36434a937626860d62931b64f7',
    'results/ac/IN-UP/2019.json': 'c2571e5126293d02d66bcd5a996542fc40ce9500fec6c555a3efe3805572851d',
    'results/ac/IN-UP/2024-detail.json': 'c4269001cda20cfcaf119938154e9e244d8c6f20be63a4d95b9050b470e21dfc',
    'results/ac/IN-UP/2024.json': 'a2deea27a6e9c9b19916942f04690076ee5a3379f4753d753fb21fed302d3540',
    'results/ac/IN-WB/2014-detail.json': '3c90414fb8d10f2594cb08ac186aaa7025e51d8ebc4041dde71a76b910d2a264',
    'results/ac/IN-WB/2014.json': 'a6ddd14873261f08ef8802354dd28764c7aca25997c95f29edbfe438649f5891',
    'results/ac/IN-WB/2019-detail.json': '0d2fab056b2204a5e3ad4bd57103840412f56dcd525a400cb032d587587e7387',
    'results/ac/IN-WB/2019.json': '34fe89ff9224fbb06e47e7d1198197275b872b304ae30d117cebe2acfd2bf24a',
    'results/ac/IN-WB/2024-detail.json': '689c94272fcfcc08c961a05ce52777fcf4ca68e8a5a94f67e0f8d6880fb058ea',
    'results/ac/IN-WB/2024.json': '21d50f68de3f2b5be3a9c2062033a58def773a11a6c40f2449b3ed01479be74e',
    'results/ls/byel/2014.json': 'a3270f27984ebedbf57806443c9f2290ec818c1d4f10da3ba1641031e846c440',
}
RETIRED_BYTES = set(RETIRED.values())
CYCLE_PATH = re.compile(r'^(?:results/ac|cabinet/state)/(IN-[A-Z]{2})/(\d{4})(?:-detail|-sworn-in)?\.json$')


def host_allowed(url):
    u = urlparse(url or '')
    host = (u.hostname or '').lower()
    if host.startswith('www.'):
        host = host[4:]
    return u.scheme == 'https' and host in ALLOWED_HOSTS


def source_urls(doc):
    """Every source URL a document names: source.url and sources[].url."""
    urls = []
    src = doc.get('source')
    if isinstance(src, dict) and src.get('url'):
        urls.append(src['url'])
    for s in doc.get('sources') or []:
        if isinstance(s, dict):
            urls.append(s.get('url'))
    return urls


def check_published(rel, doc):
    if not isinstance(doc, dict):
        return [f'{rel}: not a JSON object, so it carries no provenance']
    errs = []
    if doc.get('provenance') != 'published':
        errs.append(f'{rel}: provenance is {doc.get("provenance")!r}, not "published"')
    urls = source_urls(doc)
    if not urls:
        errs.append(f'{rel}: names no source URL (source.url or sources[].url)')
    errs += [f'{rel}: source URL {u!r} is not https on an allowed publisher host'
             for u in urls if not host_allowed(u)]
    return errs


def metadata_strings(node, in_meta=False):
    """Yield every string that sits under a metadata key, at any depth."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield from metadata_strings(v, in_meta or bool(METADATA_KEY.match(str(k))))
    elif isinstance(node, list):
        for v in node:
            yield from metadata_strings(v, in_meta)
    elif isinstance(node, str) and in_meta:
        yield node


def check_metadata(rel, doc):
    errs = []
    for s in metadata_strings(doc):
        m = FORBIDDEN.search(s)
        if m:
            errs.append(f'{rel}: metadata says {m.group(0)!r}: {s[:120]!r}')
    return errs


def real_cycles(data_dir):
    try:
        manifest = json.loads((data_dir / 'manifest.json').read_text(encoding='utf-8'))
        return {s: set(cs) for s, cs in manifest['elections']['ac']['cycles'].items()}
    except (OSError, KeyError, ValueError):
        return {}


def check_retired(rel, raw, cycles):
    errs = []
    if hashlib.sha256(raw).hexdigest() in RETIRED_BYTES:
        errs.append(f'{rel}: has the exact bytes of a removed dummy file')
    if rel in RETIRED:
        m = CYCLE_PATH.match(rel)
        if m and int(m.group(2)) not in cycles.get(m.group(1), set()):
            errs.append(f'{rel}: a removed dummy path, and {m.group(2)} is not a real '
                        f'assembly cycle for {m.group(1)}')
    return errs


def page_code(atlas_dir):
    """The page code: the JavaScript chunks of the static export."""
    chunks = Path(atlas_dir) / CHUNKS
    return tuple(p.relative_to(atlas_dir).as_posix() for p in sorted(chunks.rglob('*.js'))) if chunks.is_dir() else ()


def check_pages(atlas_dir):
    errs = []
    for rel in PAGES + page_code(atlas_dir) + ('data/manifest.json',):
        p = atlas_dir / rel
        if not p.is_file():
            continue
        for n, line in enumerate(p.read_text(encoding='utf-8').splitlines(), 1):
            if re.search(r'synthetic', line, re.I):
                errs.append(f'{rel}:{n}: says "synthetic"')
    return errs


def check(data_dir):
    data_dir = Path(data_dir)
    cycles = real_cycles(data_dir)
    errs = []
    for p in sorted(data_dir.rglob('*.json')):
        rel = p.relative_to(data_dir).as_posix()
        raw = p.read_bytes()
        try:
            doc = json.loads(raw)
        except ValueError as e:
            errs.append(f'{rel}: not valid JSON ({e})')
            continue
        if rel.split('/')[0] in PROVENANCE_DIRS:
            errs += check_published(rel, doc)
        errs += check_metadata(rel, doc)
        errs += check_retired(rel, raw, cycles)
    errs += check_pages(data_dir.parent)
    return errs


PROVENANCE_TABLES = ('term', 'document', 'region_tally', 'region_party_tally', 'contest', 'ministry',
                     'minister_tenure')
PUBLISHERS = ('eci', 'president-secretariat', 'pmindia', 'pib', 'sansad', 'upcmo', 'mospi-mplads')


def check_db(db_path):
    """The D1 half of the gate, over a SQLite copy of the database."""
    errs = []
    con = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    for t in PROVENANCE_TABLES + ('source',):
        if t not in tables:
            errs.append(f'D1: table {t} is missing')
    for t in PROVENANCE_TABLES:
        if t not in tables:
            continue
        n = con.execute(f"SELECT count(*) FROM {t} WHERE provenance IS NOT 'published'").fetchone()[0]
        if n:
            errs.append(f'D1: {n} row(s) of {t} are not provenance = published')
        n = con.execute(f'SELECT count(*) FROM {t} WHERE source_id IS NULL').fetchone()[0]
        if n:
            errs.append(f'D1: {n} row(s) of {t} have no source_id')
        if 'source' in tables:
            n = con.execute(f'SELECT count(*) FROM {t} WHERE source_id IS NOT NULL AND source_id NOT IN '
                            '(SELECT id FROM source)').fetchone()[0]
            if n:
                errs.append(f'D1: {n} row(s) of {t} name a source that does not exist')
    if 'source' in tables:
        for sid, publisher, url, sha, fetched in con.execute(
                'SELECT id, publisher, url, sha256, fetched_at FROM source'):
            if publisher not in PUBLISHERS:
                errs.append(f'D1: source {sid} publisher {publisher!r} is not on the allow-list')
            if not host_allowed(url):
                errs.append(f'D1: source {sid} url {url!r} is not https on an allowed publisher host')
            if not re.fullmatch(r'[0-9a-f]{64}', sha or ''):
                errs.append(f'D1: source {sid} has no sha256')
            if not fetched:
                errs.append(f'D1: source {sid} has no fetched_at')
    if 'document' in tables:
        for path, head in con.execute('SELECT path, head FROM document'):
            try:
                doc = json.loads(head)
            except ValueError:
                errs.append(f'D1: document {path} head is not JSON')
                continue
            errs += [f'D1: document {e}' for e in check_published(path, doc) + check_metadata(path, doc)]
    return errs


def fetch_mirror(base, data_dir, mirror):
    """Fetch from `base` every JSON file under data_dir and the pages, into `mirror`
    laid out like the atlas root. Returns the violations for files not served."""
    base = base.rstrip('/') + '/'
    data_dir = Path(data_dir)
    rels = ['data/' + p.relative_to(data_dir).as_posix() for p in sorted(data_dir.rglob('*.json'))]
    rels += [r for r in PAGES if (data_dir.parent / r).is_file()]
    base_path = urlparse(base).path
    errs = []
    seen = set()
    while rels:
        rel = rels.pop(0)
        if rel in seen:
            continue
        seen.add(rel)
        url = base + rel
        try:
            req = urllib.request.Request(url, headers={'user-agent': 'check_provenance/1'})
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read()
        except (urllib.error.URLError, OSError) as e:
            errs.append(f'remote: {url} not served ({e})')
            continue
        dest = Path(mirror) / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        if rel in PAGES:
            # the page code the served page actually loads
            for src in SCRIPT_SRC.findall(body.decode('utf-8', 'replace')):
                path = urlparse(src).path
                if path.startswith(base_path + CHUNKS + '/'):
                    rels.append(path[len(base_path):])
    print(f'remote: fetched {len(seen) - len(errs)} of {len(seen)} files from {base}')
    return errs


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('data_dir')
    ap.add_argument('--db', help='SQLite copy of the election-atlas D1 database')
    ap.add_argument('--remote', metavar='BASE', help='check what BASE (the atlas root URL) serves instead')
    args = ap.parse_args(argv[1:])
    if args.remote:
        with tempfile.TemporaryDirectory() as mirror:
            errs = fetch_mirror(args.remote, args.data_dir, mirror)
            errs += check(Path(mirror) / 'data')
    else:
        errs = check(args.data_dir)
    if args.db:
        errs += check_db(args.db)
    for e in errs:
        print('FAIL', e)
    print(f'provenance gate: {len(errs)} violation(s)')
    return 1 if errs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
