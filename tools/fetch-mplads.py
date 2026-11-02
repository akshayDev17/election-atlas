#!/usr/bin/env python3
"""
Fetch one state's full MPLADS per-MP data from the eSAKSHI portal and write it to
data/mplads/<STATE_CODE>.json — curl-only, stdlib-only, no third-party.

Confirmed against https://mplads.mospi.gov.in/digigov/dashboard.html (2026-09).
No cookie / session / CSRF needed. The only hard requirement is the request
Content-Type; the payload is a CSV "combo" string in one of three envelopes.

Usage:
  python3 tools/fetch-mplads.py IN-UP 33            # full state
  python3 tools/fetch-mplads.py IN-UP 33 --limit 3  # first 3 constituencies (smoke test)

eSAKSHI state_id (house 2 = Lok Sabha): UP = 33.  List them with --states.
"""
import argparse
import json
import os
import ssl
import sys
import time
import urllib.request

# This host is reached through a TLS-intercepting proxy whose root CA is in the
# macOS system bundle. curl trusts it automatically; python.org builds do not.
try:
    SSL_CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
except Exception:
    SSL_CTX = ssl.create_default_context()

BASE = "https://mplads.mospi.gov.in/rest/PreLoginDashboardData"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
CT = "application/json; charset=utf-8"
HOUSE = 2          # 2 = Lok Sabha, 1 = Rajya Sabha (counter-intuitive but confirmed)
TENURE = 7         # 7 = 18th Lok Sabha, 5 = 17th Lok Sabha
POLLITE = 0.2      # seconds between requests — the gov pool 503s if hammered

PIE_LABELS = [
    "Development Fund",
    "Location wise Development Work Recommendation",
    "Development Work Recommendation Status",
    "Work Category wise Development Work Recommendation",
]


def post(path, body, raw=False):
    """POST to the portal. raw=True sends `body` verbatim (getgraphdata wants a
    bare CSV string); raw=False JSON-encodes a dict. Response is ISO-8859-1."""
    data = body.encode("utf-8") if isinstance(body, str) else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        BASE + path, data=data, method="POST",
        headers={"Content-Type": CT, "User-Agent": UA,
                 "Accept": "application/json, text/javascript, */*; q=0.01"},
    )
    with urllib.request.urlopen(req, timeout=45, context=SSL_CTX) as r:
        text = r.read().decode("iso-8859-1")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


def post_retry(path, body, raw=False, tries=8, backoff=25):
    """The F5 pool 503s whole-site intermittently (~100s windows, not a ban).
    Retry politely; only the last failure raises."""
    for i in range(tries):
        try:
            return post(path, body, raw)
        except Exception as e:
            if i == tries - 1:
                raise
            print(f"      retry {i + 1}/{tries - 1} in {backoff}s ({e})", file=sys.stderr)
            time.sleep(backoff)
    raise RuntimeError("unreachable")


def norm(v):
    """Strip the NBSP the server prefixes to money strings (lone 0xA0 or UTF-8)."""
    if isinstance(v, str):
        return v.replace("\u00c2\u00a0", " ").replace("\u00a0", " ").strip()
    if isinstance(v, list):
        return [norm(x) for x in v]
    if isinstance(v, dict):
        return {k: norm(x) for k, x in v.items()}
    return v


def keyify(name, abbr=""):
    """A stable join key: lowercase alphanumerics, "(SC)"/"(ST)" dropped, and the
    trailing state abbreviation the portal appends to names shared across states
    (e.g. "HAMIRPUR(UP)" -> "hamirpur", matching the atlas's own seat name)."""
    s = (name or "").lower()
    for token in ("(sc)", "(st)"):
        s = s.replace(token, "")
    s = "".join(ch for ch in s if ch.isalnum())
    if abbr and s.endswith(abbr.lower()):
        s = s[:-len(abbr)]
    return s


def clean_work(w):
    return {
        "category": w.get("WORK_CATEGORY"),
        "activity": w.get("ACTIVITY_NAME"),
        "description": w.get("WORK_DESCRIPTION"),
        "agency": w.get("IDA_NAME"),
        "recommended_amount": w.get("RECOMMENDED_AMOUNT"),
        "sanctioned_amount": w.get("SANCTION_AMOUNT"),
        "stage": w.get("WORK_STAGE"),
        "recommended_date": w.get("RECOMMENDATION_DATE"),
        "sanctioned_date": w.get("SANCTION_DATE"),
        "letter_no": w.get("LETTER_NO"),
    }


def extract_works(report):
    """getTilesReportData returns {"<caption>": "<json-string>"} where the inner
    string is the list of works. Parse it twice."""
    report = norm(report)
    if not isinstance(report, dict):
        return []
    for value in report.values():
        arr = value
        if isinstance(arr, str):
            try:
                arr = json.loads(arr)
            except json.JSONDecodeError:
                continue
        if isinstance(arr, list):
            return [clean_work(w) for w in arr
                    if isinstance(w, dict) and "WORK_DESCRIPTION" in w]
    return []


def fetch_state(state_code, state_id, limit=0):
    abbr = state_code.split("-", 1)[-1]  # IN-UP -> UP (the portal's disambiguation suffix)
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # the repository root
    outdir = os.path.join(root, "data", "mplads", state_code)
    os.makedirs(outdir, exist_ok=True)
    print(f"=== {state_code} (state_id {state_id}, Lok Sabha, 18th tenure) -> {outdir} ===")
    pie = post_retry("/getPieChartLabels", "")
    labels = list(pie.values())
    print(f"  pie labels: {labels}")
    consts = post_retry("/getConstituencyData", {"id": str(state_id)})
    # the portal occasionally lists a constituency twice (same ID) — dedupe by ID
    seen = set()
    consts = [c for c in consts if c["ID"] not in seen and not seen.add(c["ID"])]
    print(f"  constituencies: {len(consts)}")
    if limit:
        consts = consts[:limit]
    index = []
    for ci, c in enumerate(consts, 1):
        cid, cname = c["ID"], c["CAPTION"]
        combo_mp = post_retry("/getMpAndConstCombo", {"const_combo": f"{cid},{HOUSE},"})
        for m in combo_mp:
            mid, mname = m["ID"], m["CAPTION"]
            combo = f"{state_id},{cid},{mid},{HOUSE},{TENURE}"
            rec = {
                "const_id": cid,
                "constituency": norm(cname),
                "constituency_key": keyify(cname, abbr),
                "mp_id": mid,
                "mp_name": norm(mname),
            }
            rec["tiles"] = norm(post_retry("/getTilesData", {"uname": combo}))
            charts = {}
            for lab in labels:
                g = post_retry("/getgraphdata", f"{combo},{lab}", raw=True)
                if isinstance(g, dict):
                    for val in g.values():
                        if isinstance(val, dict):
                            charts[lab] = val
            rec["charts"] = charts
            rec["works"] = extract_works(
                post_retry("/getTilesReportData",
                           {"combo": combo, "key": "Works Recommended"}))
            # one file per MP, fetched lazily by the level-3 MP page
            fname = rec["constituency_key"] + ".json"
            with open(os.path.join(outdir, fname), "w", encoding="utf-8") as f:
                json.dump(rec, f, ensure_ascii=False, indent=1)
            index.append({
                "constituency_key": rec["constituency_key"],
                "constituency": rec["constituency"],
                "mp_id": rec["mp_id"],
                "mp_name": rec["mp_name"],
                "works": len(rec["works"]),
                "file": fname,
            })
            print(f"  [{ci}/{len(consts)}] {cname}: {mname} — {len(rec['works'])} works -> {fname}")
            time.sleep(POLLITE)
    index_doc = {
        "schema": 1,
        "note": "MPLADS per-MP index. `file` is the per-MP JSON in this directory; "
                "`constituency_key` joins to an atlas parliamentary constituency "
                "(normalized ls_seat_name).",
        "state": state_code,
        "state_id": state_id,
        "house": HOUSE,
        "tenure_id": TENURE,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "mps": index,
    }
    with open(os.path.join(outdir, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index_doc, f, ensure_ascii=False, indent=1)
    print(f"\nwrote {len(index)} per-MP files + index.json in {outdir}")


def main():
    ap = argparse.ArgumentParser(description="Fetch MPLADS per-MP data for one state.")
    ap.add_argument("state_code", help="atlas state code, e.g. IN-UP")
    ap.add_argument("state_id", type=int, help="eSAKSHI numeric state id, e.g. 33 for UP")
    ap.add_argument("--limit", type=int, default=0, help="fetch only the first N constituencies")
    ap.add_argument("--states", action="store_true", help="print the eSAKSHI state id map and exit")
    args = ap.parse_args()

    if args.states:
        for s in post_retry("/getStateData", {}):
            print(f"{s['STATE_ID']:>3}  {s['STATE_NAME']}")
        return

    fetch_state(args.state_code, args.state_id, args.limit)


if __name__ == "__main__":
    main()
