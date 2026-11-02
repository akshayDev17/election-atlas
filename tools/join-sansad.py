#!/usr/bin/env python3
"""Join the fetched Union Council of Ministers to the Sansad member directory.

Fills in, from the official Parliament of India member directory (.gov.in):
  - party (mapped to the atlas party code),
  - state (mapped to the atlas region code),
  - constituency (Lok Sabha only; Rajya Sabha members have none),
  - the Sansad member number: `mpsno` for a Lok Sabha member, or `house: "rs"`
    for a Rajya Sabha member, so the pages can link each minister to their
    official page on sansad.in. No portrait is downloaded or stored.

Sources:
  - Lok Sabha:  https://sansad.in/api_ls/member            (all members, one call)
  - Rajya Sabha: https://sansad.in/api_rs/member/in-council-of-ministers

Usage:
  python3 tools/join-sansad.py --cycle 2024 \
      --in  _research/cabinet-fetched/2024.json \
      --out _research/cabinet-fetched/2024.enriched.json
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

LS_URL = "https://sansad.in/api_ls/member?lang=en"
RS_URL = "https://sansad.in/api_rs/member/in-council-of-ministers?lang=en"

# Manual aliases: cabinet name (normalised) -> Sansad name (normalised).
# These are the few where the two official sources genuinely disagree on
# spelling, initials, or word order. A minister matched neither exactly nor
# through an alias is left unjoined: no state, constituency or id, and only a
# party already on its own record.
ALIASES = {
    "C R PATIL": "CHANDRAKANT RAGHUNATH PATIL",
    "KRISHAN PAL": "KRISHAN PAL GURJAR",
    "PANKAJ CHAUDHARY": "PANKAJ CHOUDHARY",
    "BHUPATHI RAJU SRINIVASA VARMA": "SRINIVASA VARMA B J P VARMA BHUPATHIRAJU",
    "SUBRAHMANYAM JAISHANKAR": "S JAISHANKAR",
    "PIYUSH GOYAL": "PIYUSH VEDPRAKASH GOYAL",
    "PRATAPRAO JADHAV": "PRATAPRAO GANPATRAO JADHAV",
    "RAMDAS ATHAWALE": "RAMDAS BANDU ATHAWALE",
    "DURGADAS UIKEY": "DURGADAS D D UIKEY",
}

# Sansad party code -> atlas party code. Unmapped codes stay as-is and render
# grey (the atlas fallback) until they are added to parties.json.
PARTY_MAP = {
    "BJP": "BJP", "INC": "INC", "SP": "SP", "BSP": "BSP", "AITC": "AITC",
    "CPM": "CPM", "CPI(M)": "CPM", "CPI": "CPI", "DMK": "DMK",
    "AIADMK": "AIADMK", "YSRCP": "YSRCP", "TDP": "TDP", "BRS": "BRS",
    "JD(U)": "JDU", "JDU": "JDU", "RJD": "RJD", "SHS": "SHS", "SS": "SHS",
    "NCP": "NCP", "AAP": "AAP", "BJD": "BJD", "IND": "IND", "Ind.": "IND",
    "JD(S)": "JDS", "HAM (S)": "HAMS", "LJSP(RV)": "LJSP", "RLD": "RLD",
    "RPI (ATWL)": "RPIA", "Apna Dal (S)": "ADS",
}


def fetch_json(url):
    r = subprocess.run(["curl", "-sSL", "-m", "60", "-A", UA, url],
                       capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"curl failed for {url}: {r.stderr.decode('utf-8', 'replace')[:200]}")
    return json.loads(r.stdout.decode("utf-8", "replace"))


def norm(name):
    n = (name or "").upper()
    n = re.sub(r"\b(?:SHRI|SMT\.?|DR\.?|KUMARI|PROF\.?|COL\.?|SADHVI|SUSHRI)\s*", "", n)
    n = re.sub(r"\s+ALIAS\s+.*$", "", n)          # "Rajiv Ranjan Singh alias …"
    n = n.replace(".", "")                        # "H. D." -> "H D"
    n = re.sub(r"[^A-Z ]", "", n)
    return re.sub(r"\s+", " ", n).strip()


def no_space(name):
    return norm(name).replace(" ", "")


def norm_state(name):
    """Fold the few state-name spellings Sansad uses that regions.json doesn't."""
    s = (name or "").strip().upper()
    s = s.replace(" AND ", " & ")        # "Jammu and Kashmir" -> "Jammu & Kashmir"
    s = s.replace("NCT OF DELHI", "DELHI")
    return s


def build_lookup():
    """Return {norm_name: record} and {no_space_name: record}."""
    records = []
    ls = fetch_json(LS_URL)
    for m in ls.get("membersDtoList", []):
        if m.get("status") != "Sitting":
            continue
        name = m.get("mpFirstLastName") or f"{m.get('firstName') or ''} {m.get('lastName') or ''}"
        records.append({"house": "ls", "name": norm(name),
                        "party": m.get("partySname"), "state": m.get("stateName"),
                        "const": m.get("constName"),
                        "id": m.get("mpsno")})
    rs = fetch_json(RS_URL)
    for m in rs.get("records", []):
        name = f"{m.get('firstName') or ''} {m.get('lastName') or ''}"
        records.append({"house": "rs", "name": norm(name),
                        "party": m.get("partyCode"), "state": m.get("stateName"),
                        "const": None,
                        "id": m.get("mpCode")})
    by_norm, by_nospace = {}, {}
    for r in records:
        by_norm.setdefault(r["name"], r)
        by_nospace.setdefault(no_space(r["name"]), r)
    return by_norm, by_nospace


def match_member(cab_name, by_norm, by_nospace):
    """The directory record for a cabinet name, exactly or through ALIASES; else None."""
    key = norm(cab_name)
    # 1. exact
    if key in by_norm:
        return by_norm[key]
    # 2. exact ignoring spaces
    if no_space(key) in by_nospace:
        return by_nospace[no_space(key)]
    # 3. manual alias
    if key in ALIASES:
        t = norm(ALIASES[key])
        if t in by_norm:
            return by_norm[t]
        if no_space(t) in by_nospace:
            return by_nospace[no_space(t)]
    return None


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cycle", type=int, default=2024)
    ap.add_argument("--in", dest="inp", default=None,
                    help="cabinet JSON from fetch-cabinet.py")
    ap.add_argument("--out", default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.inp:
        doc = json.load(open(args.inp, encoding="utf-8"))
    else:
        # re-fetch the cabinet on the fly
        sys.path.insert(0, str(Path(__file__).parent))
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "fetch_cabinet", Path(__file__).parent / "fetch-cabinet.py")
        fetch_cabinet = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fetch_cabinet)
        members = fetch_cabinet.parse_portfolios(fetch_cabinet.fetch(fetch_cabinet.PMINDIA_PORTFOLIOS))
        pm = fetch_cabinet.parse_pm(fetch_cabinet.fetch(fetch_cabinet.PMINDIA_PORTFOLIOS))
        if pm:
            members.insert(0, pm)
        doc = {"members": members}

    by_norm, by_nospace = build_lookup()
    regions = json.load(open(Path(__file__).parent.parent / "data" / "regions.json", encoding="utf-8"))
    state_to_code = {}
    for r in regions["regions"]:
        for s in r.get("sourceNames", []):
            state_to_code[norm_state(s)] = r["code"]

    for m in doc["members"]:
        rec = match_member(m["name"], by_norm, by_nospace)
        if rec is None:
            for k in ("state", "constituency", "mpsno", "house"):
                m.pop(k, None)
            m["_match"] = None
            print(f"unmatched, left without a link: {m['name']}")
            continue
        m["party"] = PARTY_MAP.get(rec["party"], rec["party"])
        m["state"] = state_to_code.get(norm_state(rec["state"]))
        m["constituency"] = rec["const"]
        m["_match"] = rec["name"]
        if rec["house"] == "ls" and rec["id"]:
            m["mpsno"] = int(rec["id"])
        elif rec["house"] == "rs":
            m["house"] = "rs"  # the atlas links Rajya Sabha ministers to the RS list of ministers

    doc["_join"] = {"source": "Parliament of India (Sansad) member directory",
                    "matched": sum(1 for m in doc["members"] if m.get("_match")),
                    "total": len(doc["members"])}
    # drop the internal match field for the final file? keep it for audit.
    out = args.out or f"data/cabinet/union/{args.cycle}.json"
    if args.dry_run:
        print(json.dumps(doc, indent=2, ensure_ascii=False))
        return
    json.dump(doc, open(out, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
    print(f"enriched {len(doc['members'])} members -> {out}")


if __name__ == "__main__":
    main()
