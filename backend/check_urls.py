#!/usr/bin/env python3
"""Replay the atlas's URL inventory against a host and report every mismatch.

    python3 backend/check_urls.py --base https://election-atlas.<sub>.workers.dev \\
        --inventory <github.io>/.atlas-cutover/url-inventory.tsv --dist dist \\
        --manifests <github.io>/work/election-atlas/data/state-legislation --out results.tsv

Checks, for every /work/election-atlas row of the inventory:

  file      200, and the body is byte-identical to the built asset in --dist
            (an explicit .../index.html answers 307 to its directory on Workers
            static assets, where Pages answered 200 - the approved plan §3.2 - so
            the redirect is followed once and the page must then be identical)
            (bill PDFs: Content-Length and a ranged read checked against the
            manifest, whole-file sha256 for the ones over 25 MiB);
  retired   404 (dummy data, fair-use images, stored portraits), except a removed
            dummy path that now holds a real published result (Haryana and Odisha
            2019/2024, the 2014 by-elections: revision §4.2), which is checked as a
            file and counted as "retired path, now published data";
  page      200;
  redirect  a 3xx to the same URL with the trailing slash;
  deeplink  200, and the same page URL without its trailing slash redirects to
            it with the query string intact.

Paths revision §7 dropped from the new repository (tools/vendor/, tools/tessdata/)
are expected to answer 404 and are counted separately. So are the data files a
deploy listed as pending (--pending, the PENDING lines of build_site.py
--pending-ok): not in D1 yet, they answer 404 and the pages say "not available
yet" for them. Every asset in --dist
that the inventory does not list (files added since it was taken) must also
answer 200 with the same bytes. Exits 1 on any failure.
"""
import argparse
import hashlib
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ATLAS = '/work/election-atlas/'
RETIRED_BY_S7 = ('tools/vendor/', 'tools/tessdata/')
MiB = 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


OPENER = urllib.request.build_opener(NoRedirect)


def get(url, headers=None, method='GET', read=True):
    req = urllib.request.Request(url, headers={'user-agent': 'election-atlas-check/1', **(headers or {})},
                                 method=method)
    try:
        with OPENER.open(req, timeout=120) as r:
            return r.status, dict(r.headers), (r.read() if read else b'')
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), b''
    except Exception as e:  # noqa: BLE001 - network errors are a failed check
        return 0, {'error': str(e)}, b''


def header(h, name):
    return next((v for k, v in h.items() if k.lower() == name), None)


def sha(b):
    return hashlib.sha256(b).hexdigest()


def read_inventory(path):
    lines = [l.rstrip('\n') for l in open(path, encoding='utf-8') if not l.startswith('#')]
    cols = lines[0].split('\t')
    return [dict(zip(cols, l.split('\t'))) for l in lines[1:] if l]


def pdf_manifest(manifests_dir):
    out = {}
    for m in Path(manifests_dir).glob('*/bills/manifest.json'):
        for e in json.loads(m.read_text(encoding='utf-8'))['entries']:
            if str(e.get('path', '')).endswith('.pdf'):
                rel = (m.parent / e['path']).relative_to(Path(manifests_dir).parent.parent).as_posix()
                out[rel] = e
    return out


def check_pdf(base, rel, entry):
    url = base + ATLAS + rel
    status, h, _ = get(url, method='HEAD', read=False)
    if status != 200 or header(h, 'content-length') != str(entry['bytes']):
        return 'FAIL', f'HEAD {status} length {header(h, "content-length")} != {entry["bytes"]}'
    status, h, body = get(url, {'range': 'bytes=0-1023'})
    want = f'bytes 0-1023/{entry["bytes"]}'
    if status != 206 or header(h, 'content-range') != want or len(body) != 1024 or not body.startswith(b'%PDF'):
        return 'FAIL', f'Range {status} {header(h, "content-range")} {len(body)} B'
    if entry['bytes'] > 25 * MiB:
        status, _h, body = get(url)
        if status != 200 or sha(body) != entry['sha256']:
            return 'FAIL', f'full GET {status} sha256 {sha(body)[:12]} != manifest'
        return 'ok', f'206 range ok; whole file sha256 matches ({entry["bytes"]} B)'
    return 'ok', '206 range ok; length matches'


def check_row(base, row, dist, pdfs, pending=frozenset()):
    kind, url = row['kind'], row['url']
    rel = url[len(ATLAS):] if url.startswith(ATLAS) else ''
    if rel in pending:
        status, _h, _b = get(base + url, read=False)
        return 'pending (not in D1 yet)', ('ok' if status == 404 else 'FAIL'), f'{status}'
    if kind == 'file' and rel.startswith(RETIRED_BY_S7):
        status, _h, _b = get(base + url, read=False)
        return 'retired-s7', ('ok' if status == 404 else 'FAIL'), f'{status} (dropped by revision §7)'
    if kind == 'file' and rel.endswith('.pdf'):
        if rel not in pdfs:
            return kind, 'FAIL', 'PDF not in any bill manifest'
        verdict, detail = check_pdf(base, rel, pdfs[rel])
        return kind, verdict, detail
    if kind == 'retired' and (dist / url.lstrip('/')).exists():
        _k, verdict, detail = check_row(base, {**row, 'kind': 'file'}, dist, pdfs, pending)
        return 'retired path, now published data', verdict, detail
    if kind == 'file':
        status, h, body = get(base + url)
        local = dist / url.lstrip('/')
        note = ''
        if status in (301, 302, 307, 308) and url.endswith('/index.html'):
            loc = urllib.parse.urljoin(base + url, header(h, 'location') or '')
            if loc != base + url[:-len('index.html')]:
                return kind, 'FAIL', f'{status} -> {loc}'
            status, h, body = get(loc)
            note = f' (via {status} after the redirect to the directory)'
            kind = 'file (index.html redirects to its directory)'
        if status != 200:
            return kind, 'FAIL', f'{status}'
        if not local.exists():
            return kind, 'FAIL', '200 but no built asset to compare'
        same = sha(body) == sha(local.read_bytes())
        return kind, ('ok' if same else 'FAIL'), ('200, bytes match the built asset' if same else '200, BYTES DIFFER') + note
    if kind == 'retired':
        status, _h, _b = get(base + url, read=False)
        return kind, ('ok' if status == 404 else 'FAIL'), f'{status} ({row["expect"]})'
    if kind == 'page':
        status, _h, _b = get(base + url, read=False)
        return kind, ('ok' if status == 200 else 'FAIL'), f'{status}'
    if kind == 'redirect':
        status, h, _b = get(base + url, read=False)
        loc = urllib.parse.urljoin(base + url, header(h, 'location') or '')
        ok = status in (301, 302, 307, 308) and loc == base + url + '/'
        return kind, ('ok' if ok else 'FAIL'), f'{status} -> {loc}'
    if kind == 'deeplink':
        status, _h, _b = get(base + url, read=False)
        if status != 200:
            return kind, 'FAIL', f'{status}'
        path, _, query = url.partition('?')
        bare = path.rstrip('/') + '?' + query
        s2, h, _b = get(base + bare, read=False)
        loc = urllib.parse.urljoin(base + bare, header(h, 'location') or '')
        ok = s2 in (301, 302, 307, 308) and loc == base + url
        return kind, ('ok' if ok else 'FAIL'), f'200; {bare} -> {s2} {loc[len(base):]}'
    return kind, 'skip', 'not an atlas row'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--base', required=True, help='host to check, e.g. https://election-atlas.x.workers.dev')
    ap.add_argument('--inventory', required=True)
    ap.add_argument('--dist', required=True, help='the built static assets (backend/build_site.py --out)')
    ap.add_argument('--manifests', required=True, help='data/state-legislation of the pinned atlas')
    ap.add_argument('--out', help='write one TSV line per check here')
    ap.add_argument('--jobs', type=int, default=16)
    ap.add_argument('--pending', help='a file listing the data files the deploy reported pending '
                    '(lines "PENDING data/..." or plain "data/..." paths)')
    args = ap.parse_args(argv)
    base = args.base.rstrip('/')
    dist = Path(args.dist)
    pdfs = pdf_manifest(args.manifests)
    pending = set()
    if args.pending:
        for line in Path(args.pending).read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line.startswith('PENDING '):
                line = line[len('PENDING '):]
            if line.startswith('data/'):
                pending.add(line)
    rows = [r for r in read_inventory(args.inventory) if r['url'].startswith('/work/election-atlas')]
    listed = {r['url'] for r in rows}
    extra = [{'kind': 'file', 'url': '/' + p.relative_to(dist).as_posix(), 'expect': '200'}
             for p in sorted(dist.rglob('*')) if p.is_file() and '/' + p.relative_to(dist).as_posix() not in listed]
    for r in extra:
        r['kind'] = 'file'
        r['_new'] = True
    todo = rows + extra
    with ThreadPoolExecutor(args.jobs) as pool:
        results = list(pool.map(lambda r: (r, *check_row(base, r, dist, pdfs, pending)), todo))
    summary = {}
    lines = []
    for r, kind, verdict, detail in results:
        label = kind + (' (added since the inventory)' if r.get('_new') else '')
        summary.setdefault(label, {}).setdefault(verdict, 0)
        summary[label][verdict] += 1
        lines.append(f'{label}\t{verdict}\t{r["url"]}\t{detail}')
    if args.out:
        Path(args.out).write_text('\n'.join(lines) + '\n', encoding='utf-8')
    for l in lines:
        if '\tFAIL\t' in l:
            print(l)
    for label, counts in summary.items():
        print(f'{label:40s} {counts}')
    return 1 if any('FAIL' in c for c in summary.values()) else 0


if __name__ == '__main__':
    sys.exit(main())
