#!/usr/bin/env python3
"""Recover a constituency x candidate table from an ECI 'Constituency Wise Detailed
Result' PDF (2009 and 2014; 2019 and 2024 publish the same table as a spreadsheet).

Why not just read the text: pdfminer emits one table cell per text line, and its
reading order is by vertical position, so a candidate's name, party and vote counts
arrive interleaved with its neighbours'. On the 2014 report a line-order parser
recovers only about half the rows and silently mis-assigns the rest.

What works instead: every column sits in a fixed horizontal band, so fragments are
bucketed by x and then grouped into rows by y. Measured on the 2014 report:

    SL NO + NAME  x0 <  130      GENERAL  x1 in [325, 385]
    SEX           x0 135-160     POSTAL   x1 in [386, 425]
    AGE + CATEGORY x0 165-225    TOTAL    x1 in [426, 475]
    PARTY         x0 228-262     % polled x1 in [476, 540]
    Symbol        x0 265-320     % electors x1 in [541, 600]

Every recovered row is then checked against general + postal == total, which is true
of every real candidate row and of no header or total row. A row that fails is
dropped and counted, never silently accepted.
"""
from __future__ import annotations

import collections
import re

try:
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import LTTextContainer, LTTextLine
except ImportError:                                    # pragma: no cover
    extract_pages = None

NUM = re.compile(r"^\d+(?:\.\d+)?$")
_JOIN = re.compile(r"\b(and|the|of)\b")


def norm_bare(s) -> str:
    """Case/punctuation/& insensitive key with parenthetical notes dropped — enough
    to match a state header like 'ANDHRA PRADESH' or 'DADRA & NAGAR HAVELI' to the
    geometry's spelling. Kept local so this module stays standalone."""
    s = str(s or "").lower().replace("&", " and ").replace("'", "")
    s = re.sub(r"\([^)]*\)", " ", s)
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", _JOIN.sub(" ", s)).strip()

# The running page header repeats on every page and lands inside the NAME band, so
# without this it gets glued onto candidate names and inflates the row count.
# ELECTORS/VOTERS is a per-constituency FOOTER line ('ELECTORS : 983329 VOTERS : 647219'),
# not a candidate; without it every constituency gains one phantom row.
HEADER_NOISE = re.compile(
    r"(GENERAL\s+ELECTIONS|SL\s*NO|^NAME$|^CANDIDATE|^SEX$|^AGE\s*CATEGORY$|^PARTY$|"
    r"^Symbol$|^Votes\s+Secured$|^GENERAL$|^POSTAL|TOTAL:?$|% of votes|"
    r"ELECTORS|VOTERS|^TURNOUT|"
    r"[-–—]?\s*INDIA,?\s*\d{4})", re.I)

# No parliamentary constituency in India has ever recorded this many votes for one
# candidate. The guard exists because the report ends with a national 'INDIA TOTAL'
# row that satisfies general + postal == total and would otherwise be read as a
# candidate — it made the last constituency (Puducherry) carry the national total.
MAX_PLAUSIBLE_VOTES = 5_000_000

# horizontal bands, as measured off the printed header
BANDS = [
    ("name",   0.0, 130.0, "x0"),
    ("sex",  130.0, 165.0, "x0"),
    ("agecat", 165.0, 227.0, "x0"),
    ("party", 227.0, 264.0, "x0"),
    ("symbol", 264.0, 322.0, "x0"),
    ("general", 323.0, 385.0, "x1"),
    ("postal", 386.0, 425.0, "x1"),
    ("total", 426.0, 475.0, "x1"),
    ("pct_polled", 476.0, 540.0, "x1"),
    ("pct_electors", 541.0, 600.0, "x1"),
]


def band_of(x0, x1):
    for name, lo, hi, on in BANDS:
        v = x0 if on == "x0" else x1
        if lo <= v < hi:
            return name
    return None


def page_rows(page):
    """Group a page's text fragments into rows keyed by vertical position."""
    frags = []
    for el in page:
        if not isinstance(el, LTTextContainer):
            continue
        for line in el:
            if not isinstance(line, LTTextLine):
                continue
            text = line.get_text().strip()
            if text:
                frags.append((line.y0, line.x0, line.x1, text))
    frags.sort(key=lambda f: (-f[0], f[1]))

    rows, cur, cury = [], [], None
    for y, x0, x1, text in frags:
        if cury is None or abs(y - cury) <= 2.0:
            cur.append((x0, x1, text))
            cury = y if cury is None else cury
        else:
            rows.append(cur)
            cur, cury = [(x0, x1, text)], y
    if cur:
        rows.append(cur)
    return rows


def bucket(row):
    """Fragments of one row that sit in the NAME band (used only to spot the
    'CONSTITUENCY :' marker and to catch wrapped name continuations)."""
    out = []
    for x0, x1, text in sorted(row, key=lambda f: f[0]):
        if band_of(x0, x1) == "name":
            out.append(text)
    return out


AGE_CAT = re.compile(r"^\d{1,3}\s+(?:GEN|SC|ST)\s*$", re.I)
PCT = re.compile(r"^\d+(?:\.\d+)?\s*%$")
SEXWORD = re.compile(r"^[MFO]$")


def read_row(frags):
    """Recover one candidate row from its left-to-right fragments.

    Deliberately ORDER-based rather than column-band based: the 2009 and 2014
    reports print the same table but lay the columns out at different x offsets, so
    bands measured off one year mis-read the other (hand-measured 2014 bands recover
    no rows at all from the 2009 file).

    The anchor is the vote triple: scanning the numeric fragments left to right, the
    first run of three where general + postal == total is GENERAL/POSTAL/TOTAL. That
    identity holds for every real candidate row and for no header or page-header row.
    The party is then the nearest non-numeric fragment to its left that is not the
    sex, the age/category or the symbol; the name is the leftmost fragment beginning
    with the candidate's serial number."""
    fr = sorted(frags, key=lambda f: f[0])
    nums = [(i, f[2]) for i, f in enumerate(fr) if NUM.match(f[2])]

    for k in range(len(nums) - 2):
        i0, i1, i2 = nums[k][0], nums[k + 1][0], nums[k + 2][0]
        try:
            g, p, t = int(fr[i0][2]), int(fr[i1][2]), int(fr[i2][2])
        except ValueError:
            continue
        if g + p != t:
            continue

        # Column order is NAME | SEX | AGE CATEGORY | PARTY | Symbol | votes....
        # So the party is the first usable fragment AFTER the age/category column,
        # and the symbol (which sits between the party and the votes, and often wraps
        # onto a second line) is what you get if you simply scan leftwards from the
        # votes — reading 'Bicycle' or 'Cot' as a party name is exactly that mistake.
        cat_re = re.compile(r"^(?:GEN|SC|ST)$", re.I)
        age_re = re.compile(r"^\d{1,3}$")
        anchor = -1
        for i, f in enumerate(fr[:i0]):
            txt = f[2].strip()
            if SEXWORD.match(txt) or cat_re.match(txt):
                anchor = max(anchor, i)
            elif AGE_CAT.match(txt):
                anchor = max(anchor, i)
            elif age_re.match(txt) and i + 1 < i0 and cat_re.match(fr[i + 1][2].strip()):
                anchor = max(anchor, i + 1)

        party = ""
        for j in range(anchor + 1, i0):
            txt = fr[j][2].strip()
            if NUM.match(txt) or SEXWORD.match(txt) or cat_re.match(txt):
                continue
            if txt in (".", "-") or HEADER_NOISE.search(txt):
                continue
            party = txt
            break
        if not party:
            return None
        name = ""
        sex_x = next((f[0] for f in fr if SEXWORD.match(f[2].strip().split()[0]) if f[2].strip()), None)
        limit = sex_x if sex_x is not None else fr[i0][0]
        parts = []
        for f in fr[:i0]:
            if f[0] >= limit:
                continue
            txt = f[2].strip()
            if HEADER_NOISE.search(txt) or txt in (".", "-"):
                continue
            # The serial number is on its own in 1962-2004 ('1' then the name on the
            # next fragment) but glued to the name in 2009/2014 ('1  GODAM NAGESH',
            # which does not match NUM). Drop it only when it stands alone.
            if not parts and NUM.match(txt) and float(txt) < 1000:
                continue
            parts.append(txt)
        name = re.sub(r"^[\s.]+", "", " ".join(parts)).strip()
        agecat = next((f[2] for f in fr if AGE_CAT.match(f[2])), "")
        sex = next((f[2] for f in fr if SEXWORD.match(f[2].strip())), "")
        return dict(name=name, party=party, agecat=agecat, sex=sex,
                    general=g, postal=p, total=t)

    # ── layout B: a single VOTES column followed by a percentage (1962-1999) ──
    # Those reports print  NAME | SEX PARTY | VOTES | %  and have no general/postal
    # split at all, so the arithmetic anchor above cannot fire. The percentage is the
    # reliable hook here instead: it is the only fragment ending in '%', and the votes
    # are the nearest number to its left. The sex and the party share one fragment
    # ('M TDP'), which is why the party is the rest of that text rather than a
    # fragment of its own.
    for i, f in enumerate(fr):
        if not PCT.match(f[2].strip()):
            continue
        j = i - 1
        while j >= 0 and not NUM.match(fr[j][2].strip()):
            j -= 1
        if j < 0:
            continue
        votes = int(float(fr[j][2]))
        if votes > MAX_PLAUSIBLE_VOTES:
            continue

        sex, party = "", ""
        for k in range(j - 1, -1, -1):
            txt = fr[k][2].strip()
            if HEADER_NOISE.search(txt) or txt in (".", "-"):
                continue
            m = re.match(r"^([MFO])\s+(\S.*)$", txt)      # 'M TDP' / 'F IND'
            if m:
                sex, party = m.group(1), m.group(2).strip()
                break
            m2 = re.match(r"^([MFO])$", txt)              # sex on its own
            if m2 and not party:
                sex = m2.group(1)
                continue
            if not NUM.match(txt) and not party:
                party = txt
                break
        if not party or SEXWORD.match(party):
            return None

        sex_x = next((g[0] for g in fr if re.match(r"^[MFO](\s|$)", g[2].strip())), None)
        limit = sex_x if sex_x is not None else fr[j][0]
        parts = []
        for g in fr[:j]:
            if g[0] >= limit:
                continue
            txt = g[2].strip()
            if HEADER_NOISE.search(txt) or txt in (".", "-"):
                continue
            parts.append(txt)
        name = re.sub(r"^[\s.]+", "", " ".join(parts)).strip()
        name = re.sub(r"^\d{1,3}\s*[.\s]\s*", "", name).strip()   # drop leading serial
        return dict(name=name, party=party, agecat="", sex=sex,
                    general=None, postal=None, total=votes)
    return None


def parse_pdf(path, verbose=False, state_names=None):
    """Return {pc_key: {...}} plus a tally of rejected rows.

    Handles both generations of the report, which differ only in the marker and in
    whether the state is printed:
      2009/2014   'CONSTITUENCY :'   '<n> <NAME>' on one fragment, no state header
      1962-2004   'Constituency  :'  '<n>' then '. <NAME>' as separate fragments,
                                     preceded by an ALL-CAPS state header row
    The candidate table itself is identical in both, which is why one recoverer
    handles them."""
    if extract_pages is None:
        raise RuntimeError("pdfminer.six is required to read the ECI PDFs")

    states_norm = {norm_bare(s) for s in (state_names or [])}
    pcs = collections.OrderedDict()
    current = None
    current_state = None
    stats = collections.Counter()

    for page in extract_pages(path):
        for row in page_rows(page):
            name_frags = bucket(row)

            # A state section header: an ALL-CAPS line naming a state. In 1962-2004 it
            # is centred rather than left-aligned, so this scans the whole row rather
            # than just the name band. It is what lets those years carry their state
            # directly instead of inferring it from where the numbering restarts.
            joined = " ".join(t for _, _, t in sorted(row, key=lambda f: f[0])).strip()
            if (joined and not any(NUM.match(f[2]) for f in row)
                    and joined.upper() == joined and 2 < len(joined) < 34
                    and not HEADER_NOISE.search(joined)
                    and norm_bare(joined) in states_norm):
                current_state = joined.strip()
                stats["state headers"] += 1

            # The marker is 'CONSTITUENCY :' (2009/2014) or 'Constituency  :' (1962-2004).
            # Testing the row's whole text would also fire on the running page header,
            # whose wrapped column label ends in 'constituency'.
            if any(t.strip().upper().startswith("CONSTITUENCY") for t in name_frags):
                # Strip the marker off whichever fragment carries it: the number and
                # name may follow in the same fragment ('Constituency  : 10 . ELURU')
                # or in separate ones (['Constituency  :', '1 . SRIKAKULAM']).
                rest = []
                for t in name_frags:
                    s = t.strip()
                    if s.upper().startswith("CONSTITUENCY"):
                        s = re.sub(r"(?i)^CONSTITUENCY\s*:?\s*", "", s).strip()
                    if s and s not in (".", "-"):
                        rest.append(s)
                nm = re.sub(r"^[\s.]+", "", " ".join(rest).strip())
                m = re.match(r"^(\d{1,3})\s*[.\s]\s*(.+)$", nm) or \
                    re.match(r"^(\d{1,3})\s+(.+)$", nm)
                if not m:
                    stats["marker-without-name"] += 1
                    continue          # keep the previous constituency, not None
                no = int(m.group(1))
                name = re.sub(r"^[\s.]+", "", m.group(2)).strip()
                elec = None
                for f in sorted(row, key=lambda f: f[0]):
                    if NUM.match(f[2]) and int(float(f[2])) > 1000:
                        elec = int(float(f[2]))
                        break
                # Key by STATE as well as number and name. The number restarts at 1
                # in every state, and several seat names repeat across states
                # (Aurangabad, Maharajganj, Hamirpur), so keying on (number, name)
                # alone silently merges those into one block — which is why 1984
                # came out with 514 constituencies instead of 543.
                key = (current_state, no, name)
                current = pcs.setdefault(key, {"no": no, "name": name,
                                               "electors": elec, "candidates": [],
                                               "state_header": current_state})
                if elec and not current.get("electors"):
                    current["electors"] = elec
                if current_state and not current.get("state_header"):
                    current["state_header"] = current_state
                stats["constituencies"] += 1
                continue

            if current is None:
                continue

            rec = read_row(row)
            if rec and rec["total"] > MAX_PLAUSIBLE_VOTES:
                stats["rejected implausible total"] += 1
                rec = None
            if rec:
                current["candidates"].append(rec)
                stats["candidate rows"] += 1
                continue

            # a wrapped continuation of the previous candidate's name
            cand_frag = next((t for t in name_frags
                              if "CONSTITUENCY" not in t.upper()), "")
            if cand_frag and current["candidates"]:
                tail = re.sub(r"^[\d.\s]+", "", cand_frag).strip()
                tail = re.sub(r"\s+", " ", HEADER_NOISE.sub("", tail)).strip()
                if tail and not NUM.match(tail):
                    prev = current["candidates"][-1]
                    if tail not in prev["name"]:
                        prev["name"] = (prev["name"] + " " + tail).strip()
                        stats["name continuations"] += 1
                        continue
            stats["rows not read"] += 1

    if verbose:
        for k, v in stats.items():
            print(f"   {k}: {v}")
    return pcs, stats


if __name__ == "__main__":
    import json
    import sys
    pcs, stats = parse_pdf(sys.argv[1], verbose=True)
    print("constituencies:", len(pcs))
    total = sum(len(v["candidates"]) for v in pcs.values())
    print("candidate rows:", total)
    out = os.path.splitext(sys.argv[1])[0] + ".parsed.json" if (os := __import__("os")) else None
    json.dump({"constituencies": [{"no": v["no"], "name": v["name"],
                                   "electors": v["electors"],
                                   "candidates": v["candidates"]}
                                  for v in pcs.values()], "stats": dict(stats)},
              open(out, "w"), indent=1)
    print("wrote", out)
