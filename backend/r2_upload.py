#!/usr/bin/env python3
"""Upload the state bill PDFs to the R2 bucket, verified against their manifests.

    python3 backend/r2_upload.py --atlas <github.io checkout>/work/election-atlas

Every data/state-legislation/IN-XX/bills/manifest.json entry whose `path` is a
PDF is one object. For each entry:

  1. the checked-out file's sha256 must equal the manifest's sha256 (else it is a
     mismatch and is not uploaded);
  2. it is put to election-atlas-docs under its path relative to the atlas root
     (data/state-legislation/IN-XX/bills/documents/<hash>-bills.pdf), the key the
     Worker serves it from;
  3. it is read back from R2 and its sha256 compared again.

An entry whose file is not in the checkout (the 167 MB Andhra Pradesh scan was
never committed) is reported as absent. Exits 1 on any mismatch or failed upload.
Runs in GitHub Actions with the repository's CLOUDFLARE_API_TOKEN; never locally.
"""
import argparse
import hashlib
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BUCKET = 'election-atlas-docs'
WRANGLER = ['npx', '--yes', 'wrangler@4.151.1']
MiB = 1024 * 1024


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(MiB), b''):
            h.update(block)
    return h.hexdigest()


def manifest_entries(atlas):
    for m in sorted((atlas / 'data' / 'state-legislation').glob('*/bills/manifest.json')):
        for e in json.loads(m.read_text(encoding='utf-8'))['entries']:
            if str(e.get('path', '')).endswith('.pdf'):
                key = (m.parent / e['path']).relative_to(atlas).as_posix()
                yield key, e


def wrangler(*args, stdout=None):
    return subprocess.run(WRANGLER + list(args), stdout=stdout, stderr=subprocess.PIPE)


def remote_sha256(key):
    r = wrangler('r2', 'object', 'get', f'{BUCKET}/{key}', '--remote', '--pipe', stdout=subprocess.PIPE)
    return hashlib.sha256(r.stdout).hexdigest() if r.returncode == 0 else None


def upload_one(atlas, key, entry):
    path = atlas / key
    if not path.exists():
        return key, 'absent', path.name
    local = sha256_file(path)
    if local != entry['sha256']:
        return key, 'mismatch', f'checkout {local} != manifest {entry["sha256"]}'
    r = wrangler('r2', 'object', 'put', f'{BUCKET}/{key}', '--remote', '--file', str(path),
                 '--content-type', 'application/pdf')
    if r.returncode != 0:
        return key, 'failed', r.stderr.decode(errors='replace')[-400:]
    remote = remote_sha256(key)
    if remote != entry['sha256']:
        return key, 'mismatch', f'R2 {remote} != manifest {entry["sha256"]}'
    return key, 'verified', f'{path.stat().st_size} B'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--atlas', required=True, help='work/election-atlas of the pinned github.io checkout')
    ap.add_argument('--jobs', type=int, default=6)
    args = ap.parse_args(argv)
    atlas = Path(args.atlas)
    entries = list(manifest_entries(atlas))
    with ThreadPoolExecutor(args.jobs) as pool:
        results = list(pool.map(lambda ke: upload_one(atlas, *ke), entries))
    by_state = {}
    for key, state, detail in results:
        by_state.setdefault(state, []).append((key, detail))
    big = [k for k, e in entries if (atlas / k).exists() and (atlas / k).stat().st_size > 25 * MiB]
    print(f'manifest PDF entries: {len(entries)}')
    for state in ('verified', 'absent', 'mismatch', 'failed'):
        print(f'{state}: {len(by_state.get(state, []))}')
        if state != 'verified':
            for key, detail in by_state.get(state, []):
                print(f'  {key}: {detail}')
    print(f'over 25 MiB: {len(big)}')
    for k in big:
        print(f'  {k}: {dict(by_state.get("verified", [])).get(k, "NOT verified")}')
    return 1 if by_state.get('mismatch') or by_state.get('failed') else 0


if __name__ == '__main__':
    sys.exit(main())
