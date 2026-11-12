#!/usr/bin/env python3
"""
Fetch one MP's parliamentary record from the Sansad / Lok Sabha API and write it to
data/parliament/<STATE>/<constituency_key>.json — curl-only; stdlib + pypdf
(pinned in requirements.txt, for the PDF reply fallback).

Covers: profile (name, DOB, party, constituency), attendance (per session, summed),
questions (metadata + official PDF/DOCX URLs), bills (Private Members', filtered by
introducer name). Recipe + field schema in countries/IN/harvest/sansad-record-recipe.md.

Usage:
  python3 countries/IN/harvest/fetch-sansad-record.py 5144 18 IN-UP gorakhpur
  python3 countries/IN/harvest/fetch-sansad-record.py --list            # dump LS18 members (mpsno -> name)
  python3 countries/IN/harvest/fetch-sansad-record.py --replies data/parliament/IN-UP/gorakhpur.json
  python3 countries/IN/harvest/fetch-sansad-record.py --replies ... --limit 3   # smoke-test the extractor

The reply TEXT of a question is not fetched in the metadata pass — it lives in the
per-question DOCX (`word/document.xml`), which must be downloaded + unzipped one at
a time. `--replies` is that second pass: it backfills `replyText` for every question
that has a `docxUrl`, and leaves the rest null (the ~36 earliest-session questions
have no DOCX at all — only a PDF — and we never fabricate a reply for them).
"""
import argparse
import html
import io
import json
import os
import re
import ssl
import sys
import time
import urllib.parse
import urllib.request
import zipfile

try:
    SSL_CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
except Exception:
    SSL_CTX = ssl.create_default_context()


BASE = "https://sansad.in"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
POLLITE = 0.2


def get(path, params, tries=5, backoff=20):
    """GET a Sansad endpoint and return JSON. Retry politely — the gov server 503s
    intermittently (whole-site, transient, not a ban)."""
    url = BASE + path + "?" + urllib.parse.urlencode(params)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
                raw = r.read()
            try:
                return json.loads(raw.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                return json.loads(raw.decode("iso-8859-1"))
        except Exception as e:
            if i == tries - 1:
                raise
            print(f"      retry {i + 1}/{tries - 1} in {backoff}s ({e})", file=sys.stderr)
            time.sleep(backoff)


def norm_name(s):
    s = (s or "").lower()
    for t in ("shri", "smt", "dr", "dr.", "prof", "prof."):
        s = s.replace(t, "")
    return "".join(c for c in s if c.isalnum())


def name_matches(a, b):
    na, nb = norm_name(a), norm_name(b)
    return bool(na and nb) and (na in nb or nb in na)


def find_list(obj, key_hint):
    """Sansad bills/attendance wrap their rows in differing envelopes; find the
    list of dicts that carries the given key hint."""
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for v in obj.values():
            if isinstance(v, list) and v and isinstance(v[0], dict) and key_hint in v[0]:
                return v
    return []


def _docx_paragraphs(xml):
    """Extract the visible text of every <w:p> paragraph from word/document.xml.
    Match whole <w:p>…</w:p> blocks (not a naive </w:p> split) so heavily-formatted
    paragraphs — bold/italic runs, nested tags — don't leak raw XML into the text."""
    out = []
    for block in re.findall(r"<w:p\b.*?</w:p>", xml, re.S):
        runs = re.findall(r"<w:t\b[^>]*>(.*?)</w:t>", block, re.S)
        out.append(html.unescape("".join(runs)).strip())
    return out


def _answer_marker(paras):
    """Return the index of the ANSWER heading, tolerating 'A N S W E R' spacing."""
    for i, p in enumerate(paras):
        if re.sub(r"[^A-Za-z]", "", p).upper() == "ANSWER":
            return i
    return None


def extract_reply(xml):
    """Return the ministry's written reply from a Lok Sabha Q&A DOCX, or None.

    Layout: question header + text → ANSWER marker → minister designation/name →
    the (a)(b)(c) reply → a '****' footer (tables in an ANNEXURE are <w:tbl>, not
    <w:p>, so they never leak in). We take everything after the marker up to the
    footer; the minister attribution is harmless and kept for provenance."""
    paras = _docx_paragraphs(xml)
    idx = _answer_marker(paras)
    if idx is None:
        return None
    body = paras[idx + 1:]
    cut = len(body)
    for i, p in enumerate(body):
        if re.fullmatch(r"\*+", p.strip()) or p.strip().upper().startswith("ANNEXURE"):
            cut = i
            break
    reply = "\n".join(p for p in body[:cut] if p)
    return reply.strip() or None


def extract_reply_from_pdf(raw):
    """Extract the ministry's written reply from the official Q&A PDF.

    Fallback for the DOCX path: earlier sessions store a binary OLE `.doc` (or no
    DOCX at all), but the PDF is present on every question and is text-based.
    PDF text is line-wrapped, so we split into lines, find the ANSWER marker, and
    take everything after it up to the trailing '***' footer — same contract as
    `extract_reply`, just noisier line structure."""
    from pypdf import PdfReader  # pinned in requirements.txt
    reader = PdfReader(io.BytesIO(raw))
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    idx = _answer_marker(lines)
    if idx is None:
        return None
    body = lines[idx + 1:]
    cut = len(body)
    for i, l in enumerate(body):
        if re.fullmatch(r"\*+", l) or l.upper().startswith("ANNEXURE"):
            cut = i
            break
    reply = "\n".join(l for l in body[:cut])
    return reply.strip() or None


def _get_bytes(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
        return r.read()


def fetch_record(mpsno, loksabha, state_code, constituency_key):
    print(f"=== {constituency_key} (mpsno {mpsno}, Lok Sabha {loksabha}) ===")

    # 1. profile
    m = get(f"/api_ls/member/{mpsno}", {"lang": "en"})
    name = (m.get("fullName") or
            f"{m.get('initial') or ''} {m.get('firstName') or ''} {m.get('lastName') or ''}".strip())
    profile = {
        "name": name,
        "party": m.get("partySname") or m.get("partyFname"),
        "constituency": m.get("constituency") or m.get("constName"),
        "state": m.get("stateName"),
        "dateOfBirth": m.get("dateOfBirth"),
        "photoUrl": m.get("photoUrl"),
    }
    print(f"  profile: {name} · {profile['party']} · {profile['constituency']}")

    # 2. questions (metadata + official source URL)
    q = get("/api_ls/question/qetFilteredQuestionsAns", {
        "loksabhaNo": loksabha, "pageNo": 1, "locale": "en",
        "pageSize": 500, "memberCode": mpsno,
    })
    # response is [{listOfQuestions:[...], totalRecordSize, _metadata}] — unwrap it
    qlist = []
    if isinstance(q, list) and q and isinstance(q[0], dict) and "listOfQuestions" in q[0]:
        qlist = q[0]["listOfQuestions"]
    else:
        qlist = find_list(q, "quesNo")
    questions = []
    for x in qlist:
        pdf = x.get("questionsFilePath")   # always present (274/274) — browser-native
        docx = x.get("questionsDocPath")   # nullable (36 earliest-session Qs have none)
        questions.append({
            "questionNumber": x.get("quesNo"),
            "subject": x.get("subjects"),
            "ministry": x.get("ministry"),
            "type": x.get("type"),
            "date": x.get("date"),
            "sessionNo": x.get("sessionNo"),
            "pdfUrl": pdf,                 # canonical provenance link ("open in new tab")
            "docxUrl": docx,               # source of the reply text (may be null)
            "sourceUrl": pdf,              # alias of pdfUrl (DB `source_url` contract)
            "replyText": None,             # filled by the --replies backfill pass
        })
    print(f"  questions: {len(questions)}")

    # 3. bills (no member filter — filter client-side on introducer name)
    b = get("/api_rs/legislation/getBills", {
        "loksabha": loksabha, "billType": "Private Member", "page": 1,
        "size": 500, "locale": "en", "sortOn": "billIntroducedDate", "sortBy": "desc",
    })
    bills = []
    for x in find_list(b, "billNumber"):
        if name_matches(x.get("billIntroducedBy"), name):
            bills.append({
                "billNumber": x.get("billNumber"),
                "billName": x.get("billName"),
                "billType": x.get("billType"),
                "introducedOn": x.get("billIntroducedDate"),
                "status": x.get("status"),
                "sourceUrl": x.get("billIntroducedFile"),
                "billText": None,
            })
    print(f"  bills: {len(bills)}")

    # 4. attendance — sum across sessions until the member-wise list goes empty
    signed = total = 0
    sessions = 0
    for s in range(1, 30):
        agg = get("/api_ls/member/getMemberAttendanceMemberWise", {
            "loksabha": loksabha, "session": s, "locale": "en",
        })
        rows = find_list(agg, "signedDaysCount")
        if not rows:
            break
        sessions = s
        row = next((r for r in rows if str(r.get("mpsno")) == str(mpsno)), None)
        dates = get("/api_ls/member/attendance/session-dates", {
            "loksabha": loksabha, "session": s,
        })
        total += len(dates) if isinstance(dates, list) else 0
        if row:
            signed += int(row.get("signedDaysCount") or 0)
        time.sleep(POLLITE)
    attendance = {"signedDays": signed, "totalDays": total}
    print(f"  attendance: {signed}/{total} across {sessions} sessions")

    out = {
        "schema": 1,
        "person": constituency_key,
        "mpsno": mpsno,
        "loksabha": loksabha,
        "profile": profile,
        "attendance": attendance,
        "questions": questions,
        "bills": bills,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))  # the repository root
    dest = os.path.join(root, "data", "parliament", state_code, f"{constituency_key}.json")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"\nwrote {dest}: {len(questions)} questions · {len(bills)} bills · "
          f"{attendance['signedDays']}/{attendance['totalDays']} attendance")


def fetch_replies(path, limit=None, polite=0.25):
    """Backfill `replyText` into an already-fetched record JSON, in place.

    Per question: try the DOCX first (clean paragraph text), then fall back to the
    always-present PDF (line-wrapped text). The DOCX is skipped when it's absent,
    is a binary OLE `.doc` (earlier sessions), or parses without an ANSWER marker.
    We never fabricate a reply — if neither source yields one it stays null.
    Questions already carrying a `replyText` are skipped, so the pass is resumable."""
    with open(path, encoding="utf-8") as f:
        record = json.load(f)
    questions = record.get("questions", [])
    todo = [q for q in questions if not q.get("replyText")]
    if limit:
        todo = todo[:limit]
    print(f"{path}: extracting {len(todo)} replies (of {len(questions)} questions)")

    done = failed = still_null = 0
    for i, q in enumerate(todo, 1):
        try:
            reply = None
            if q.get("docxUrl"):
                raw = _get_bytes(q["docxUrl"])
                if raw[:2] == b"PK":                 # a real .docx zip (not OLE .doc)
                    try:
                        xml = zipfile.ZipFile(io.BytesIO(raw)).read(
                            "word/document.xml").decode("utf-8")
                        reply = extract_reply(xml)
                    except (KeyError, zipfile.BadZipFile):
                        reply = None
            if not reply:
                reply = extract_reply_from_pdf(_get_bytes(q["pdfUrl"]))
            q["replyText"] = reply
            done += 1 if reply else 0
            still_null += 0 if reply else 1
        except Exception as e:
            failed += 1
            print(f"  ! Q{q.get('questionNumber')}: {e}", file=sys.stderr)
        if i % 20 == 0:
            print(f"  {i}/{len(todo)} …")
            with open(path, "w", encoding="utf-8") as f:  # checkpoint every 20
                json.dump(record, f, ensure_ascii=False, indent=1)
        time.sleep(polite)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=1)
    filled = sum(1 for q in questions if q.get("replyText"))
    print(f"done: {done} extracted · {failed} failed · {still_null} still null · "
          f"{filled} total with replyText")


def list_members(loksabha=18):
    r = get("/api_ls/question/getMembers", {"lkNo": loksabha})
    rows = find_list(r, "mpNo")
    for x in rows:
        print(f"{x.get('mpNo')}  {x.get('mpName')}")


def main():
    ap = argparse.ArgumentParser(description="Fetch one MP's Sansad parliamentary record.")
    ap.add_argument("mpsno", nargs="?", type=int, help="Sansad member id (mpsno)")
    ap.add_argument("loksabha", nargs="?", type=int, default=18)
    ap.add_argument("state_code", nargs="?", help="atlas state code, e.g. IN-UP")
    ap.add_argument("constituency_key", nargs="?", help="join key, e.g. gorakhpur")
    ap.add_argument("--list", action="store_true", help="dump LS18 members and exit")
    ap.add_argument("--replies", metavar="JSON", help="backfill replyText into an existing record JSON")
    ap.add_argument("--limit", type=int, help="cap questions for --replies (smoke test)")
    args = ap.parse_args()

    if args.list:
        list_members(args.loksabha)
        return
    if args.replies:
        fetch_replies(args.replies, limit=args.limit)
        return
    if not all([args.mpsno, args.state_code, args.constituency_key]):
        ap.print_help()
        sys.exit(1)
    fetch_record(args.mpsno, args.loksabha, args.state_code, args.constituency_key)


if __name__ == "__main__":
    main()
