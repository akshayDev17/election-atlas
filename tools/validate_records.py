#!/usr/bin/env python3
"""Refuse any record that is not published data from an allow-listed publisher.

Every harvester calls validate() on each document before writing it, and the
same checks run from the command line over files already on disk:

    python3 tools/validate_records.py data/results/ac data/cabinet/state/IN-UP/2022.json
    python3 tools/validate_records.py --cache _research/harvest data/results/ls/byel

A document passes only if:
  - its top-level `provenance` is "published", and so is every nested `provenance`;
  - it has a `source` object, and every source block (`source` and each entry of
    `sources`) names a publisher on the allow-list and a https URL whose host
    belongs to that publisher;
  - every source block carries a 64-hex `sha256` and a `fetched_at`; the sha256
    must equal the hash of the cached file that URL was fetched into (always
    inside a harvester and with an explicit --cache; without --cache the harvest
    cache is used when it exists, and a source it does not hold, or a missing
    cache, is reported as "sha256 NOT checked" rather than failed);
  - no metadata value (keys `note*`, `source*`, `_note`, `caveat*`, `provenance`)
    contains synthetic, dummy, invented, placeholder, fake or mock.

Free text such as candidate names or ministers' portfolios is not scanned:
real Sansad answers contain words like "synthetic rubbers".

Exits non-zero and lists every violation if any document fails.
"""
import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))
from harvest_common import DEFAULT_CACHE, cache_path, sha256_bytes  # noqa: E402

# publisher id -> hosts it publishes from (a host matches itself or any subdomain)
PUBLISHER_HOSTS = {
    "eci": ("eci.gov.in",),
    # ramnathkovind.nic.in is the President's Secretariat archive of President
    # Kovind's term (2017-22); presidentofindia.gov.in does not carry those releases
    "president-secretariat": ("presidentofindia.gov.in", "ramnathkovind.nic.in"),
    "pmindia": ("pmindia.gov.in",),
    "pib": ("pib.gov.in",),
    "sansad": ("sansad.in",),
    "upcmo": ("upcmo.up.nic.in",),
    "mospi-mplads": ("mplads.mospi.gov.in",),
}

FORBIDDEN = re.compile(r"synthetic|dummy|invented|placeholder|fake|mock", re.I)
METADATA_KEY = re.compile(r"^_?(note|source|caveat|provenance)", re.I)
SHA256 = re.compile(r"^[0-9a-f]{64}$")


def host_allowed(publisher: str, url: str) -> bool:
    hosts = PUBLISHER_HOSTS.get(publisher)
    if not hosts:
        return False
    host = (urlparse(url).hostname or "").lower()
    return any(host == h or host.endswith("." + h) for h in hosts)


def source_blocks(doc: dict):
    """Yield (where, block) for the top-level source and each entry of sources."""
    if "source" in doc:
        yield "source", doc["source"]
    for i, block in enumerate(doc.get("sources") or []):
        yield f"sources[{i}]", block


def check_source(where: str, block, cache, unchecked=None) -> list:
    if not isinstance(block, dict):
        return [f"{where}: must be an object with publisher, url, sha256 and fetched_at"]
    problems = []
    publisher, url = block.get("publisher"), block.get("url") or ""
    if publisher not in PUBLISHER_HOSTS:
        problems.append(f"{where}.publisher {publisher!r} is not on the allow-list")
    if not url.startswith("https://"):
        problems.append(f"{where}.url {url!r} is not https")
    elif publisher in PUBLISHER_HOSTS and not host_allowed(publisher, url):
        problems.append(f"{where}.url host {urlparse(url).hostname!r} does not belong to {publisher}")
    sha = block.get("sha256") or ""
    if not SHA256.match(sha):
        problems.append(f"{where}.sha256 is missing or not 64 lowercase hex characters")
    if not block.get("fetched_at"):
        problems.append(f"{where}.fetched_at is missing")
    if cache is not None and url and SHA256.match(sha):
        cached = cache_path(Path(cache), url)
        if not cached.exists():
            missing = f"{where}: no cached copy of {url} to verify sha256 against"
            (problems if unchecked is None else unchecked).append(missing)
        elif sha256_bytes(cached.read_bytes()) != sha:
            problems.append(f"{where}.sha256 does not match the cached copy of {url}")
    return problems


def scan_metadata(node, path="") -> list:
    """Forbidden words in metadata values, and any provenance that is not published."""
    problems = []
    if isinstance(node, dict):
        for k, v in node.items():
            here = f"{path}.{k}" if path else k
            if k == "provenance" and v != "published":
                problems.append(f"{here} is {v!r}, not 'published'")
            if METADATA_KEY.match(str(k)):
                text = json.dumps(v, ensure_ascii=False)
                hit = FORBIDDEN.search(text)
                if hit:
                    problems.append(f"{here} contains the forbidden word {hit.group(0)!r}")
            problems += scan_metadata(v, here)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            problems += scan_metadata(v, f"{path}[{i}]")
    return problems


def validate(doc, cache=None, unchecked=None) -> list:
    """Return the list of problems with one document (empty when it passes).

    A source with no cached copy is a problem, unless `unchecked` is a list: then it
    is recorded there instead (its sha256 was not checked)."""
    if not isinstance(doc, dict):
        return ["document is not a JSON object"]
    problems = []
    if doc.get("provenance") != "published":
        problems.append(f"provenance is {doc.get('provenance')!r}, not 'published'")
    if "source" not in doc:
        problems.append("no top-level source")
    for where, block in source_blocks(doc):
        problems += check_source(where, block, cache, unchecked)
    problems += [p for p in scan_metadata(doc) if not p.startswith("provenance is ")]
    return problems


def require_valid(docs: dict, cache) -> None:
    """Harvester entry point: docs is {output path: document}. Raise on any problem."""
    report = []
    for path, doc in docs.items():
        report += [f"{path}: {p}" for p in validate(doc, cache)]
    if report:
        raise SystemExit("validate_records: refusing to write\n  " + "\n  ".join(report))


def iter_json(paths):
    for p in map(Path, paths):
        if p.is_dir():
            yield from sorted(p.rglob("*.json"))
        else:
            yield p


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("paths", nargs="+", help="JSON files or directories to check")
    ap.add_argument("--cache", help="harvest cache directory for the sha256 check; every source must be "
                    "in it (default: the harvest cache, if present, checking only what it holds)")
    args = ap.parse_args(argv)
    strict = args.cache is not None
    cache = args.cache or (str(DEFAULT_CACHE) if DEFAULT_CACHE.is_dir() else None)
    if cache is None:
        print("validate_records: sha256 NOT checked: no harvest cache (pass --cache DIR)")
    failed = 0
    checked = 0
    for path in iter_json(args.paths):
        checked += 1
        try:
            doc = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            print(f"{path}: unreadable JSON ({e})")
            failed += 1
            continue
        unchecked = None if strict else []
        problems = validate(doc, cache, unchecked)
        for u in unchecked or []:
            print(f"{path}: sha256 NOT checked: {u}")
        if problems:
            failed += 1
            for p in problems:
                print(f"{path}: {p}")
    print(f"validate_records: {checked} checked, {failed} failed")
    return 1 if failed or not checked else 0


if __name__ == "__main__":
    sys.exit(main())
