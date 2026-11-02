"""Phase 0 — resolve sources from SOURCE-REGISTRY.md.

Reads the Bills section's markdown table (the machine-readable part) and
combines it with the per-state override maps below (variant / capability /
fallbacks / postback payloads) that the markdown prose does not yet carry in a
structured form. The URL -> fetch_mode derivation is deterministic.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Optional
from urllib.parse import quote_plus

from models import Capability, FetchMode, ResolvedState, SourceTier, Variant

REPO_ROOT = Path(__file__).resolve().parents[3]
REGISTRY_PATH = REPO_ROOT / "data" / "mla" / "SOURCE-REGISTRY.md"

# name-in-table -> ISO code
STATE_CODES = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    "Assam": "AS",
    "Bihar": "BR",
    "Chhattisgarh": "CG",
    "Goa": "GA",
    "Gujarat": "GJ",
    "Haryana": "HR",
    "Himachal Pradesh": "HP",
    "Jammu and Kashmir": "JK",
    "Jharkhand": "JH",
    "Karnataka": "KA",
    "Kerala": "KL",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MH",
    "Manipur": "MN",
    "Meghalaya": "ML",
    "Mizoram": "MZ",
    "Nagaland": "NL",
    "Odisha": "OD",
    "Puducherry": "PY",
    "Punjab": "PB",
    "Rajasthan": "RJ",
    "Sikkim": "SK",
    "Tamil Nadu": "TN",
    "Telangana": "TG",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "Uttarakhand": "UT",
    "West Bengal": "WB",
    "Delhi": "DL",
    "Andaman & Nicobar Islands": "AN",
    "Chandigarh": "CH",
    "Dadra and Nagar Haveli and Daman and Diu": "DH",
    "Ladakh": "LA",
    "Lakshadweep": "LD",
}

NO_LEGISLATURE = {"AN", "CH", "DH", "LA", "LD"}

# v1 hints, to be reconciled with the registry prose as the structured flags land.
VARIANTS: dict[str, set[Variant]] = {
    "CG": {Variant.INTRODUCED, Variant.PASSED},
    "GA": {Variant.INTRODUCED, Variant.PASSED},
    "PB": {Variant.INTRODUCED, Variant.PASSED},
    "MH": {Variant.INTRODUCED, Variant.PASSED},
    "DL": {Variant.INTRODUCED},
    "UT": {Variant.PASSED},
    "TN": {Variant.PASSED},
    "AR": {Variant.PASSED},
}

CAPABILITY: dict[str, Capability] = {
    "PB": Capability.DOCUMENT_TEXT,
    "GA": Capability.DOCUMENT_TEXT,
    "MH": Capability.DOCUMENT_TEXT,
    "AR": Capability.DOCUMENT_TEXT,
    "TN": Capability.DOCUMENT_TEXT,
    "WB": Capability.DOCUMENT_TEXT,
    "JH": Capability.DOCUMENT_TEXT,
    "RJ": Capability.DOCUMENT_TEXT,
    "TG": Capability.DOCUMENT_TEXT,
    "GJ": Capability.DOCUMENT_TEXT,
    "KA": Capability.DOCUMENT_SCAN,
    "MP": Capability.DOCUMENT_SCAN,
    "CG": Capability.DOCUMENT_SCAN,
    "BR": Capability.DOCUMENT_SCAN,
    "DL": Capability.DOCUMENT_TEXT,
    "MZ": Capability.DOCUMENT_TEXT,
    "MN": Capability.DOCUMENT_TEXT,
    "HP": Capability.INDEX_ONLY,
    "NL": Capability.INDEX_ONLY,
    "PY": Capability.INDEX_ONLY,
    "JK": Capability.INDEX_ONLY,
    "UP": Capability.NONE,
    "KL": Capability.NONE,
    "HR": Capability.NONE,
    "ML": Capability.NONE,
    "SK": Capability.NONE,
    "OD": Capability.NONE,
    "TR": Capability.NONE,
}

# Primary fetch_mode + ordered fallbacks (from the fetch-mode table).
FALLBACKS: dict[str, list[FetchMode]] = {
    "RJ": [FetchMode.PRS_PAGER],
    "KA": [FetchMode.PRS_PAGER],
    "MN": [FetchMode.PRS_PAGER],
    "DL": [FetchMode.NEVA_SESSION],
    "BR": [FetchMode.STATIC_CURL, FetchMode.GAZETTE_POSTBACK],
    "CG": [FetchMode.STATIC_CURL, FetchMode.PRS_PAGER],
    "TG": [FetchMode.NEVA_SESSION],
    "UT": [FetchMode.STATIC_CURL],
}

# WebForms / gazette postback payloads (state-specific search parameters).
POSTBACK_DATA: dict[str, dict] = {
    # Chhattisgarh e-Vidhan: category 70 = विधेयक (Bills)
    "CG": {
        "__EVENTTARGET": "btnSearch",
        "__EVENTARGUMENT": "",
        "ddlCategory": "70",
        "ddlDept": "",
        "ddlYear": "",
    },
}


def derive_mode(url: str) -> Optional[FetchMode]:
    u = (url or "").strip()
    if not u or u == "—" or "not applicable" in u or "no legislature" in u or "://" not in u:
        return None
    if "prsindia.org" in url:
        return FetchMode.PRS_PAGER
    if ".neva.gov.in" in url:
        return FetchMode.NEVA_SESSION
    if "evidhan" in url:
        return FetchMode.WEBFORMS_POSTBACK
    if "egazette.bihar.gov.in" in url:
        return FetchMode.GAZETTE_POSTBACK
    return FetchMode.STATIC_CURL


def _fallback_tier(name: str, mode: FetchMode) -> Optional[SourceTier]:
    """Materialize a fallback mode into a harvestable tier, when possible.

    PRS's URL is derivable from the state name. NEVA / Gazette / static
    fallbacks each carry their own per-state URL and are not wired yet, so
    they return ``None`` and are simply not appended.
    """
    if mode is FetchMode.PRS_PAGER:
        return SourceTier(
            name=f"{name} — PRS",
            url=f"https://prsindia.org/bills/states?state={quote_plus(name)}",
            kind="PRS (unofficial)",
            fetch_mode=mode,
            note="fallback",
        )
    return None


def _parse_table_rows(path: Path) -> list[dict]:
    lines = path.read_text(encoding="utf-8").split("\n")
    st = next(i for i, l in enumerate(lines) if l.startswith("## Bills"))
    en = next(i for i, l in enumerate(lines) if i > st and l.startswith("## "))
    rows: list[dict] = []
    for l in lines[st:en]:
        if not l.startswith("|") or l.startswith("|---") or "State/UT" in l:
            continue
        cells = [c.strip() for c in l.strip("|").split("|")]
        if len(cells) < 4 or cells[0].startswith("_all"):
            continue
        rows.append({"name": cells[0], "url": cells[1], "kind": cells[2], "status": cells[3]})
    return rows


def _base_name(name: str) -> str:
    return name.split(" — ")[0].strip()


# Fetch/parse plan for the states whose index is NOT a single page. One entry
# per tier; ``mode`` + ``opts`` drive the fetch strategy, ``parser``/``enrich``
# drive extraction. Everything else in the file derives from the markdown table.
TIER_PLAN: dict[str, list[dict]] = {
    "MZ": [
        {
            "url": "https://www.mizoramassembly.in/government-bill",
            "mode": FetchMode.NUMBERED_PAGER,
            "opts": {
                "page_template": "https://www.mizoramassembly.in/government-bill?page={page}",
                "marker": r"table-bordered",
                "max_pages": 50,
            },
            "parser": "MZ",
        },
        {
            "url": "https://www.mizoramassembly.in/private-bill",
            "mode": FetchMode.STATIC_CURL,
            "parser": "MZ",
        },
    ],
    "AS": [
        {
            "url": "https://assambidhansabha.org/legislation/bills/introduced",
            "mode": FetchMode.NUMBERED_PAGER,
            "opts": {
                "page_template": "https://assambidhansabha.org/legislation/bills/introduced?page={page}",
                "marker": r"legislation/bills/(?:introduced|passed)/\d+",
                "max_pages": 20,
            },
            "parser": "",
        },
        {
            "url": "https://assambidhansabha.org/legislation/bills/passed",
            "mode": FetchMode.NUMBERED_PAGER,
            "opts": {
                "page_template": "https://assambidhansabha.org/legislation/bills/passed?page={page}",
                "marker": r"legislation/bills/(?:introduced|passed)/\d+",
                "max_pages": 20,
            },
            "parser": "",
        },
    ],
    "MP": [
        {
            "url": "https://mpvidhansabha.nic.in/bill.htm",
            "mode": FetchMode.LINK_FANOUT,
            "opts": {
                "link_re": r"bill_\d{4}\.htm",
                "base": "https://mpvidhansabha.nic.in/bill.htm",
                "max_links": 20,
            },
            "parser": "MP",
        },
    ],
    "GA": [
        {
            "url": "https://www.goavidhansabha.gov.in/_bills.php",
            "mode": FetchMode.GOA_ASSEMBLY_PAGER,
            "opts": {
                "combo_url": "https://www.goavidhansabha.gov.in/_get_combo_details.php?mode=BILLS&a_id=14",
                "page1_template": "https://www.goavidhansabha.gov.in/_bills.php?assembly_id={assembly}&member_id=0&session_id=0&billtype_id=0&display_id=",
                "pageN_template": "https://www.goavidhansabha.gov.in/_bills.php?ajax=1&page={page}&assembly_id={assembly}&member_id=0&session_id=0&billtype_id=0&display_id=0",
            },
            "parser": "GA",
        },
    ],
    "MH": [
        {
            "url": "https://mls.org.in/Vidheyake_Assembly-2026.aspx",
            "mode": FetchMode.MAHARASHTRA_FANOUT,
            "parser": "MH",
        },
    ],
    "RJ": [
        {
            "url": "https://assembly.rajasthan.gov.in/Containers/Legislation/GovernmentBills.aspx",
            "mode": FetchMode.STATIC_CURL,
            "parser": "RJ",
        },
    ],
}


def resolve_all() -> list[ResolvedState]:
    rows = _parse_table_rows(REGISTRY_PATH)
    grouped: dict[str, list[dict]] = {}
    for r in rows:
        grouped.setdefault(_base_name(r["name"]), []).append(r)

    states: list[ResolvedState] = []
    for base_name, tier_rows in grouped.items():
        code = STATE_CODES.get(base_name)
        if code is None:
            continue
        tiers: list[SourceTier] = []
        if code in TIER_PLAN:
            for plan in TIER_PLAN[code]:
                tiers.append(
                    SourceTier(
                        name=base_name,
                        url=plan["url"],
                        kind="official assembly",
                        fetch_mode=plan["mode"],
                        opts=plan.get("opts", {}),
                        parser=plan.get("parser", ""),
                        enrich=plan.get("enrich", ""),
                        note="",
                    )
                )
        else:
            for r in tier_rows:
                mode = derive_mode(r["url"])
                if mode is None:                       # "not applicable — no legislature"
                    continue
                url = re.sub(r"\*\*|`", "", r["url"])
                tiers.append(
                    SourceTier(
                        name=r["name"],
                        url=url,
                        kind=r["kind"],
                        fetch_mode=mode,
                        note=r["status"],
                    )
                )
        # Materialize fallback modes into real tiers (PRS today; others deferred).
        for mode in FALLBACKS.get(code, []):
            ft = _fallback_tier(base_name, mode)
            if ft is not None:
                tiers.append(ft)

        variant = VARIANTS.get(code, set())
        capability = CAPABILITY.get(code, Capability.INDEX_ONLY)
        if code in NO_LEGISLATURE:
            capability = Capability.NONE
        states.append(
            ResolvedState(
                code=code,
                name=base_name,
                variant=variant,
                capability=capability,
                tiers=tiers,
            )
        )
    return states


def resolve(code: str) -> Optional[ResolvedState]:
    code = code.upper()
    for s in resolve_all():
        if s.code == code:
            return s
    return None


if __name__ == "__main__":  # pragma: no cover
    for s in resolve_all():
        print(s.code, s.name, len(s.tiers), "tiers", s.capability.value)
