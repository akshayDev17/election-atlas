#!/usr/bin/env python3
"""Phase 2 — document acquisition. Run from this directory.

    python3 phase2.py CG --limit 5     # up to 5 documents, in source order
    python3 phase2.py PB               # download every document of every row
    python3 phase2.py all --latest 10  # the 10 NEWEST documents per state

Pipeline: resolve a state's rows (Phase 1, in-process) -> for each row's
``doc_links`` resolve the real target -> download + verify -> write into
``data/state-legislation/IN-XX/bills/documents/`` -> persist ``index.json``
and ``manifest.json``.
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime, timezone

from downloader import AcquiredDocument, Downloader
from http_client import HttpClient
from models import BillRow, FetchMode
from phase1 import collect_all
from registry import POSTBACK_DATA, resolve, resolve_all
from resolvers import ResolveContext
from storage import DocumentStore, Manifest, ManifestEntry


def _row_to_index(r: BillRow) -> dict:
    return {
        "title": r.title,
        "number": r.number,
        "year": r.year,
        "date": r.date,
        "doc_links": r.doc_links,
        "doc_types": r.doc_types,
    }


def _recency_key(r: BillRow) -> tuple:
    """Newest-first sort key = (year, bill number).

    The year lives in a different place per state (its own field, the title, or
    the date), so try each in turn; a row whose year can't be found sorts last.
    """
    year = 0
    for src in (r.year, r.title, r.date):
        m = re.search(r"\b(19|20)\d{2}\b", src or "")
        if m:
            year = int(m.group(0))
            break
    num = 0
    m = re.search(r"\d+", r.number or "")
    if m:
        num = int(m.group(0))
    return (year, num)


def run(state, limit: int = 0, latest: int = 0) -> dict:
    store = DocumentStore(state.code, "bills")
    client = HttpClient()
    downloader = Downloader(client)

    # One session-bound context per WebForms tier (Chhattisgarh e-Vidhan).
    postback_ctxs = [
        ResolveContext(client=client, tier_url=t.url, form_data=POSTBACK_DATA.get(state.code))
        for t in state.tiers
        if t.fetch_mode is FetchMode.WEBFORMS_POSTBACK
    ]

    manifest = Manifest(state=store.iso, section=store.section)
    index_rows: list[dict] = []
    cache: dict[str, AcquiredDocument] = {}          # url -> result (dedupe within run)

    rows, errors = collect_all(state)
    if latest:                                   # newest-first, then cap on docs
        rows = sorted(rows, key=_recency_key, reverse=True)
        limit = latest
    for row in rows:
        index_rows.append(_row_to_index(row))
        for link in row.doc_links:
            if limit and len(cache) >= limit:
                break
            if link in cache:
                continue
            session_bound = link.startswith("postback:") or "__doPostBack" in link
            ctx = postback_ctxs[0] if (session_bound and postback_ctxs) else ResolveContext(client=client)
            cache[link] = downloader.acquire(link, ctx)
        if limit and len(cache) >= limit:
            break

    # Persist results: an entry per link, in stable order.
    for link, acquired in cache.items():
        entry = ManifestEntry(url=link, fetched_at=datetime.now(timezone.utc).isoformat())
        if acquired.ok:
            path = store.write(link, acquired.content, content_type=acquired.content_type)
            entry.path = str(path.relative_to(store.base))
            entry.sha256 = acquired.sha256
            entry.bytes = len(acquired.content)
            entry.content_type = acquired.content_type
        else:
            entry.ok = False
            entry.reason = acquired.reason
        manifest.entries.append(entry)

    store.save_index(index_rows)
    store.save_manifest(manifest)
    return {
        "state": store.iso,
        "rows": len(index_rows),
        "documents": len(manifest.entries),
        "downloaded": manifest.ok,
        "failed": manifest.failed,
        "bytes": manifest.total_bytes,
        "dir": str(store.base),
        "errors": errors,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("target", help="ISO code, or 'all'")
    ap.add_argument("--limit", type=int, default=0, help="max documents, in source order (0 = all)")
    ap.add_argument("--latest", type=int, default=0, help="keep the N newest documents per state (sorts newest-first; 0 = off)")
    args = ap.parse_args()

    if args.target.lower() == "all":
        for s in resolve_all():
            if not s.tiers:
                print(f"{s.code:4s} {s.name:44s} no-legislature")
                continue
            r = run(s, args.limit, args.latest)
            errs = r.get("errors", [])
            flag = "OK " if not errs else "ERR"
            print(f"{r['state']:6s} {flag} rows={r['rows']:5d} docs={r['documents']:5d} ok={r['downloaded']:5d} fail={r['failed']:4d} {r['bytes']:>12d} B  {(' | ' + '; '.join(errs)) if errs else ''}")
        return 0

    s = resolve(args.target)
    if s is None:
        print(f"unknown state: {args.target}", file=sys.stderr)
        return 2
    import json
    print(json.dumps(run(s, args.limit, args.latest), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
