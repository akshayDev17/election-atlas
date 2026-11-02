#!/usr/bin/env python3
"""Phase 1 — index harvest. Run from this directory.

    python3 phase1.py CG            # one state, full JSON
    python3 phase1.py all           # every state, one summary line each
    python3 phase1.py all --check-links   # also HEAD each doc_link (slow)

Phases implemented here: 1.1 (index fetch, dispatch on fetch_mode),
1.2 (extract rows), 1.3 (normalize links), 1.4 (drop 404/empty rows).

``rows`` / ``total_rows`` = distinct index entries (title/number/year/date/
doc_link) the parser pulled off the index, summed over tiers, after
normalize -> drop-empty -> dedup. It is an extraction yield, NOT the state's
true bill count and NOT a count of valid documents.
"""
from __future__ import annotations

import argparse
import json
import sys
from typing import Optional
from urllib.parse import quote, urljoin

from enrich import assam_post
from fetch_strategies import make_strategy
from http_client import HttpClient
from index_parsers import LinkFallbackParser, make_parser_for
from models import BillRow, FetchMode, IndexDocument, ResolvedState
from registry import POSTBACK_DATA, resolve, resolve_all


def _normalize_link(link: str, base: str) -> str:
    link = link.strip().replace("\\", "/")          # backslash -> slash
    link = quote(link, safe=":/?#[]@!$&'()*+,;=%~-")  # encode literal spaces, keep structure
    if link and not link.startswith(("http://", "https://", "javascript:", "mailto:")):
        link = urljoin(base, link)
    return link


def _normalize_rows(rows: list[BillRow], base: str) -> list[BillRow]:
    for r in rows:
        r.doc_links = [_normalize_link(link, base) for link in r.doc_links]
    return rows


def _drop_bad(rows: list[BillRow], check_links: bool) -> list[BillRow]:
    # Drop only rows with NO usable content; a metadata-only row (no documents)
    # is a valid Phase-1 output for index_only states.
    kept = [r for r in rows if (r.title or r.number or r.year or r.doc_links)]
    if not check_links:
        return kept
    # Verify every http(s) document and keep the survivors; a row keeps its
    # metadata even when all its documents are dead.
    client = HttpClient()
    for r in kept:
        alive, types = [], []
        for link, kind in zip(r.doc_links, r.doc_types):
            if not link.startswith(("http://", "https://")):
                alive.append(link); types.append(kind)   # postback refs: Phase 2
                continue
            try:
                if client.get(link, timeout=30).status == 200:
                    alive.append(link); types.append(kind)
            except Exception:
                pass
        r.doc_links, r.doc_types = alive, types
    return kept


def _dedup(rows: list[BillRow]) -> list[BillRow]:
    seen = set()
    out = []
    for r in rows:
        # date is in the key: Mizoram has genuinely distinct bills that share
        # (title, number, links) but differ only by date — do not collapse them.
        key = (r.assembly_id, r.title, r.number, r.year, r.date, tuple(sorted(r.doc_links)))
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


def _row_to_dict(r: BillRow) -> dict:
    return {
        "title": r.title,
        "number": r.number,
        "year": r.year,
        "date": r.date,
        "doc_link": r.doc_link,          # convenience = first document
        "doc_links": r.doc_links,        # source of truth
        "doc_types": r.doc_types,
    }


def _harvest_tier(tier, state: ResolvedState, client: HttpClient, check_links: bool) -> tuple[list[BillRow], Optional[str]]:
    last_err: Optional[str] = None
    for _ in (1, 2):                                   # one retry for transient failures
        try:
            strategy = make_strategy(
                tier.fetch_mode, client, form_data=POSTBACK_DATA.get(state.code), opts=tier.opts or None
            )
            docs = [d for d in strategy.fetch(tier.url) if d.content]
            parser = make_parser_for(state.code, tier.fetch_mode)
            rows = parser.parse(docs)
            if not rows:
                rows = LinkFallbackParser().parse(docs)   # graceful degrade
            rows = _normalize_rows(rows, tier.url)
            rows = _drop_bad(rows, check_links)
            return _dedup(rows), None
        except Exception as exc:  # one tier must not kill the run
            last_err = f"{type(exc).__name__}: {exc}"
    return [], last_err


def collect_rows(state: ResolvedState, check_links: bool = False) -> list[tuple[object, list[BillRow]]]:
    """Full, deduped rows per tier — the input Phase 2 downloads from."""
    client = HttpClient()
    return [(tier, _harvest_tier(tier, state, client, check_links)[0]) for tier in state.tiers]


def collect_all(state: ResolvedState, check_links: bool = False) -> tuple[list[BillRow], list[str]]:
    """Combined, cross-tier-deduped rows, plus per-tier error strings."""
    client = HttpClient()
    rows: list[BillRow] = []
    errors: list[str] = []
    for tier in state.tiers:
        trows, err = _harvest_tier(tier, state, client, check_links)
        if err:
            errors.append(f"{tier.name}: {err}")
        rows.extend(trows)
    rows = _dedup(rows)
    if state.code == "AS":
        rows = assam_post(rows, client)
    return rows, errors


def harvest(state: ResolvedState, check_links: bool = False) -> dict:
    client = HttpClient()
    result = {"code": state.code, "name": state.name, "tiers": []}
    all_rows: list[BillRow] = []
    for tier in state.tiers:
        rows, error = _harvest_tier(tier, state, client, check_links)
        all_rows.extend(rows)
        tier_result = {"tier": tier.name, "url": tier.url, "mode": tier.fetch_mode.value, "rows": len(rows), "error": error}
        tier_result["documents"] = sum(len(r.doc_links) for r in rows)
        tier_result["sample"] = [_row_to_dict(r) for r in rows[:5]]
        result["tiers"].append(tier_result)
    all_rows = _dedup(all_rows)
    if state.code == "AS":
        all_rows = assam_post(all_rows, client)
    result["total_rows"] = len(all_rows)
    result["total_documents"] = sum(len(r.doc_links) for r in all_rows)
    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("target", help="ISO code, or 'all'")
    ap.add_argument("--check-links", action="store_true", help="HEAD each doc_link to drop 404s")
    args = ap.parse_args()

    if args.target.lower() == "all":
        for s in resolve_all():
            if not s.tiers:
                print(f"{s.code:4s} {s.name:44s} no-legislature")
                continue
            r = harvest(s, args.check_links)
            errs = [t["error"] for t in r["tiers"] if t["error"]]
            flag = "OK " if not errs else "ERR"
            print(f"{s.code:4s} {s.name:44s} {flag} rows={r['total_rows']:5d} docs={r['total_documents']:5d} tiers={len(r['tiers'])} {(' | ' + '; '.join(errs)) if errs else ''}")
        return 0

    s = resolve(args.target)
    if s is None:
        print(f"unknown state: {args.target}", file=sys.stderr)
        return 2
    print(json.dumps(harvest(s, args.check_links), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
