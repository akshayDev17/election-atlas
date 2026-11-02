#!/usr/bin/env python3
"""Phase 0 — resolve sources. Run from this directory.

    python3 phase0.py all          # JSON array, every state
    python3 phase0.py CG           # JSON object, one state
"""
from __future__ import annotations

import json
import sys

from models import Capability, FetchMode, ResolvedState, Variant
from registry import resolve, resolve_all


def _enum(v):
    return v.value if isinstance(v, (FetchMode, Variant, Capability)) else v


def state_to_dict(s: ResolvedState) -> dict:
    return {
        "code": s.code,
        "name": s.name,
        "variant": sorted(_enum(v) for v in s.variant),
        "capability": _enum(s.capability),
        "tiers": [
            {
                "name": t.name,
                "url": t.url,
                "kind": t.kind,
                "fetch_mode": _enum(t.fetch_mode),
                "fallbacks": [_enum(f) for f in t.fallbacks],
                "note": t.note,
            }
            for t in s.tiers
        ],
    }


def main() -> int:
    arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    if arg.lower() == "all":
        payload = [state_to_dict(s) for s in resolve_all()]
    else:
        s = resolve(arg)
        if s is None:
            print(f"unknown state: {arg}", file=sys.stderr)
            return 2
        payload = state_to_dict(s)
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
