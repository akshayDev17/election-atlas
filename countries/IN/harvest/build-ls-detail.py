#!/usr/bin/env python3
"""Build results/ls/detail/{year}.json (every candidate per Lok Sabha seat) from ECI
table 33, the constituency-wise detailed result.

    python3 countries/IN/harvest/build-ls-detail.py . 2024 data/results/ls/detail/2024.json

Reads the table through build-ls-results.py's own sheet reader and joins seats with
its GeoIndex, so the keys match the pc/ files. Run with the table cached in
_research/eci/ under the name build-ls-results.py's YEARS gives it. On 2026-11-02
it rebuilt the committed 2019 and 2024 detail files byte for byte from the files
recorded in countries/IN/inputs/ls-sources.json.
"""
import importlib.util, json, os, sys

atlas, year, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
spec = importlib.util.spec_from_file_location("build_ls", os.path.join(atlas, "countries", "IN", "harvest", "build-ls-results.py"))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

cfg = b.YEARS[year]
regions = json.load(open(os.path.join(b.DATA, "regions.json"), encoding="utf-8"))
geo = b.GeoIndex(os.path.join(b.DATA, "geo", "india-pcs.json"), regions)
rows = b.read_sheet(*cfg["detailed"])
c = cfg["detailed_cols"]
per_pc, order = {}, []
for r in rows[cfg["detailed_start"]:]:
    st, pc = b.as_str(r[c["state"]]), b.as_str(r[c["pc"]])
    party, votes = b.as_str(r[c["party"]]), b.as_int(r[c["total"]])
    if not st or not pc or not party or votes is None:
        continue
    key = (st, pc)
    if key not in per_pc:
        per_pc[key] = []
        order.append(key)
    per_pc[key].append({"n": b.as_str(r[c["candidate"]]), "p": party, "v": votes})

cons, unmatched = {}, []
for key in order:
    uid, _ = geo.uid(*key)
    if uid is None:
        unmatched.append(key)
        continue
    cons[uid] = {"pc": key[1], "c": sorted(per_pc[key], key=lambda x: -x["v"])}
# keys stay in the order the constituencies first appear in table 33
url = cfg.get("detailed_url", b.ECI_REPORTS)
doc = {"schema": 2, "provenance": "published", "election": "ls", "year": year, "region": "ALL",
       "source": {"publisher": "Election Commission of India", "url": url,
                  "title": "Election Commission of India — constituency-wise detailed result"},
       "note": "Published ECI counts. General + postal votes; shares computed in the page.",
       "constituencies": cons}
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(doc, open(out, "w", encoding="utf-8"), separators=(",", ":"))
print(json.dumps({"year": year, "constituencies": len(cons), "candidates": sum(len(v["c"]) for v in cons.values()),
                  "unmatched": unmatched}))
