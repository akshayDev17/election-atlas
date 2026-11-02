"""Index parsers — turn fetched index documents into BillRow objects.

One class per index shape (Strategy pattern). Phase 1 asks a parser for rows
and stays ignorant of whether the source was a GridView, a PRS card list, or a
bare link dump.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from html import unescape
from urllib.parse import urljoin

from models import BillRow, FetchMode, IndexDocument

DATE_RE = re.compile(
    r"\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}"
    r"|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}",
    re.I,
)
NUM_YEAR_RE = re.compile(r"(\d{1,3})\s*(?:of|સન|सन्|सन)\s*(\d{4})", re.I)
BARE_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")
BARE_NUMBER_RE = re.compile(r"^\d{1,3}$")


def _strip_tags(html: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", html))).strip()


def _cells(tr: str) -> list[tuple[str, str]]:
    """Return (text, raw_html) per <td>/<th> in a row."""
    out: list[tuple[str, str]] = []
    for raw in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S | re.I):
        out.append((_strip_tags(raw), raw))
    return out


def _extract_link(raw: str) -> str:
    """Return a document link from a cell, or "" for nothing.

    A ``javascript:__doPostBack`` href is ONLY a document link when its target
    names a PDF opener (Chhattisgarh's ``lnkOpenPdf``); a GridView pager/select
    postback (Rajasthan) is navigation and must be dropped, not returned.
    """
    m = re.search(r'href="([^"]+\.(?:pdf|PDF|docx?|DOCX?))"', raw)
    if m:
        return m.group(1)
    m = re.search(r'href="([^"]+)"', raw)
    if m:
        href = unescape(m.group(1))
        if href.startswith("javascript:"):
            t = re.search(r"__doPostBack\(\s*'([^']+)'", href)
            if t and "pdf" in t.group(1).lower():
                return "postback:" + t.group(1)
            return ""                               # navigation postback
        return href
    m = re.search(r"__doPostBack\(\s*'([^']+)'\s*,", raw)
    if m and "pdf" in m.group(1).lower():
        return "postback:" + m.group(1)
    return ""


def infer_doc_type(url: str) -> str:
    """Best-effort document kind from the URL — never from the anchor label.

    Goa's index mislabels at least one row ("Bill As Introduced" pointing at a
    `_final_…AP.pdf`), and AP/MP encode the kind in the path, so the URL is the
    only trustworthy signal.
    """
    u = url.lower()
    if any(k in u for k in ("_field_", "-ai", "_ai.", "/passedbills/")):
        return "introduced" if "passedbills" not in u else "passed"
    if any(k in u for k in ("_final_", "-ap", "_ap.", "/actbills/", "act%20no", "act no")):
        return "passed"
    if "ord" in u and ".pdf" in u:
        return "ordinance"
    return ""


def _add_link(row: BillRow, link: str) -> None:
    """One bill may carry several documents; keep them all, in order."""
    if link and link not in row.doc_links:
        row.doc_links.append(link)
        row.doc_types.append(infer_doc_type(link))


class IndexParser(ABC):
    @abstractmethod
    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        ...


class HtmlTableParser(IndexParser):
    """Generic <table> parser: biggest table wins; header row maps columns,
    with a positional heuristic fallback for colspan/Gujarati-Hindi headers."""

    _ALIASES = {
        "number": ["ક્રમ", "ક્રમ નં", "ક્ર", "क्रमांक", "क्र.", "क्र", "बिल नं", "बिल सं", "अनुक्रमांक", "bill number", "bill no", "bill no.", "no.", "number", "sr no", "સીરીયલ"],
        "title": ["શીર્ષક", "બિલ નામ", "નામ", "शीर्षक", "विषय", "विधेयक का नाम", "बिल का नाम", "title", "subject", "description", "name of bill"],
        "year": ["વર્ષ", "साल", "वर्ष", "सन्", "सन", "year"],
        "date": ["તારીખ", "तारीख", "तिथि", "दिनांक", "पुरःस्थापन का दिनांक", "date of introduction", "introduced", "सभा में प्रस्तुत", "date", "presented"],
    }

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            rows.extend(self._parse_one(doc))
        return rows

    def _parse_one(self, doc: IndexDocument) -> list[BillRow]:
        html = doc.content.decode("utf-8", "replace")
        tables = re.findall(r"<table[^>]*>(.*?)</table>", html, flags=re.S | re.I)
        if not tables:
            return []
        table = max(tables, key=lambda t: t.lower().count("<tr"))
        trs = re.findall(r"<tr[^>]*>(.*?)</tr>", table, flags=re.S | re.I)
        if not trs:
            return []
        # Skip the first row as a header ONLY when it actually contains <th>;
        # headerless tables (Assam's 3-column bill list) have no header row at
        # all, and treating trs[0] as one silently drops the first bill.
        has_header = "<th" in trs[0].lower()
        header = [t for t, _ in _cells(trs[0])] if has_header else []
        rows: list[BillRow] = []
        for tr in trs[1 if has_header else 0:]:
            cells = _cells(tr)
            if not cells:
                continue
            row = self._map(header, cells)
            heur = self._heuristic(cells)
            merged = self._merge(row, heur)
            if merged.title or merged.doc_link or merged.number:
                rows.append(merged)
        return rows

    @staticmethod
    def _merge(row: BillRow, heur: BillRow) -> BillRow:
        m = BillRow()
        m.title = row.title or heur.title
        for link, kind in zip(row.doc_links + heur.doc_links, row.doc_types + heur.doc_types):
            _add_link(m, link)
            if kind:
                m.doc_types[m.doc_links.index(link)] = kind
        # "N of YYYY" (the real bill number) wins over a serial column.
        if heur.number and heur.year:
            m.number, m.year = heur.number, heur.year
        else:
            m.number = row.number or heur.number
            m.year = row.year or heur.year
        m.date = heur.date or row.date
        return m

    def _map(self, header: list[str], cells: list[tuple[str, str]]) -> BillRow:
        row = BillRow()
        for idx, (text, raw) in enumerate(cells):
            h = header[idx].lower() if idx < len(header) else ""
            if any(a in h for a in self._ALIASES["number"]):
                row.number = text
            elif any(a in h for a in self._ALIASES["title"]):
                row.title = text
            elif any(a in h for a in self._ALIASES["year"]):
                row.year = text
            elif any(a in h for a in self._ALIASES["date"]):
                row.date = text
            _add_link(row, _extract_link(raw))
        if NUM_YEAR_RE.search(row.number):
            n, y = NUM_YEAR_RE.search(row.number).groups()
            row.number, row.year = n, y
        return row

    def _heuristic(self, cells: list[tuple[str, str]]) -> BillRow:
        row = BillRow()
        texts: list[str] = []
        num_year_found = False
        for text, raw in cells:
            if not text:
                continue
            _add_link(row, _extract_link(raw))
            if DATE_RE.search(text) and not row.date:
                row.date = text
                continue
            m = NUM_YEAR_RE.search(text)
            if m:
                # "N of YYYY" is the real bill number — wins over a serial cell.
                if not num_year_found:
                    row.number, row.year = m.group(1), m.group(2)
                    num_year_found = True
                continue
            texts.append(text)
        if not num_year_found:
            for text in texts:
                if BARE_NUMBER_RE.match(text) and not row.number:
                    row.number = text
                elif BARE_YEAR_RE.fullmatch(text) and not row.year:
                    row.year = text
        if not row.title and texts:
            candidates = [t for t in texts if not BARE_NUMBER_RE.match(t) and not BARE_YEAR_RE.fullmatch(t)]
            row.title = max(candidates or texts, key=len)
        return row


class PrsParser(IndexParser):
    """PRS card list: /files/bills_acts/... links carry the year in the path."""

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            html = doc.content.decode("utf-8", "replace")
            for m in re.finditer(
                r'<a[^>]+href="(/files/bills_acts/[^"]+)"[^>]*>(.*?)</a>',
                html,
                flags=re.S | re.I,
            ):
                href = m.group(1)
                title = _strip_tags(m.group(2))
                year = re.search(r"/(\d{4})/", href)
                number = re.search(r"(\d{1,4})", href.rsplit("/", 1)[-1])
                rows.append(
                    BillRow(
                        title=title,
                        doc_links=[urljoin("https://prsindia.org", href)],
                        doc_types=[infer_doc_type(href)],
                        year=year.group(1) if year else "",
                        number=number.group(1) if number else "",
                    )
                )
        return rows


class LinkFallbackParser(IndexParser):
    """Last resort: collect every PDF/DOC anchor and use its text as title."""

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            html = doc.content.decode("utf-8", "replace")
            for m in re.finditer(
                r'<a[^>]+href="([^"]+\.(?:pdf|PDF|docx?|DOCX?))"[^>]*>(.*?)</a>',
                html,
                flags=re.S | re.I,
            ):
                link = urljoin(doc.url, m.group(1))
                rows.append(
                    BillRow(
                        title=_strip_tags(m.group(2)),
                        doc_links=[link],
                        doc_types=[infer_doc_type(link)],
                    )
                )
        return rows


def make_parser(prs: bool) -> IndexParser:
    if prs:
        return PrsParser()
    return HtmlTableParser()


_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def _dev_digits(text: str) -> str:
    return text.translate(_DEVANAGARI_DIGITS)


class MizoramAccordionParser(IndexParser):
    """One bill per accordion card; each card is a vertical `<th>/<td>` table."""

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            html = doc.content.decode("utf-8", "replace")
            for table in re.findall(r'<table class="table table-bordered">(.*?)</table>', html, flags=re.S | re.I):
                row = self._parse_table(table)
                if row.title or row.number:
                    rows.append(row)
        return rows

    def _parse_table(self, table: str) -> BillRow:
        fields: dict[str, str] = {}
        hrefs: dict[str, str] = {}
        for th, td in re.findall(r'<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>', table, flags=re.S | re.I):
            key = _strip_tags(th)
            fields[key] = _strip_tags(td)
            m = re.search(r'href="([^"]+)"', td, flags=re.I)
            if m:
                hrefs[key] = m.group(1)
        row = BillRow()
        row.title = fields.get("Title of the bill", "")
        row.date = fields.get("Date of Introduction", "")
        bny = fields.get("Bill No & Year", "").strip()
        m = re.match(r"^(\d{1,3})\s+of\s+(\d{4})$", bny, re.I)
        if m:
            row.number, row.year = m.group(1), m.group(2)
        else:
            ym = re.search(r"\b(19|20)\d{2}\b", row.title)
            if ym:
                row.year = ym.group(0)
        link = hrefs.get("Download", "")
        if link and "untitled" not in link.lower():
            _add_link(row, link)
        return row


class GoaCardParser(IndexParser):
    """Goa's `.tab-info-bx.bills-info` fragment cards."""

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            aid = re.search(r"assembly_id=(\d+)", doc.url)
            html = doc.content.decode("utf-8", "replace")
            chunks = re.split(r'<div class="tab-info-bx bills-info">', html)[1:]
            for card in chunks:
                row = self._parse_card(card)
                if row.title or row.number:
                    row.assembly_id = aid.group(1) if aid else ""
                    rows.append(row)
        # The source repeats ~65 cards; dedupe on (assembly, number, year) and
        # merge document lists so a duplicate card never drops a document.
        seen: dict[tuple, BillRow] = {}
        out: list[BillRow] = []
        for r in rows:
            key = (r.assembly_id, r.number, r.year) if r.number else (r.assembly_id, r.title, r.year)
            if key in seen:
                for link, kind in zip(r.doc_links, r.doc_types):
                    if link not in seen[key].doc_links:
                        seen[key].doc_links.append(link)
                        seen[key].doc_types.append(kind)
            else:
                seen[key] = r
                out.append(r)
        return out

    def _parse_card(self, card: str) -> BillRow:
        row = BillRow()
        m = re.search(r'<h4[^>]*class="bill-no"[^>]*>(.*?)</h4>', card, flags=re.S | re.I)
        head = _strip_tags(m.group(1)) if m else ""
        # Old-assembly heads are OCR-noisy ("Bill No. I of 1993", "Bill NQ. 20",
        # "Bill N0.29 OF 2000", "Bill No. 24 of 199"). Fold homoglyphs in the
        # NUMBER token and fall back to the title's year when it is truncated.
        nm = re.search(
            r"BILL\s*N[O0Q1Il|]*\.?\s*(?:NO\.?\s*)?([^)]{0,12}?)\s*OF\s*(?:THE\s*)?(\d{2,4})",
            head.upper(),
        )
        if nm:
            tok = nm.group(1).strip(" .")
            for a, b in (("I", "1"), ("L", "1"), ("|", "1"), ("O", "0"), ("Q", "0"),
                         ("S", "5"), ("B", "8"), ("G", "6"), ("Z", "2"), ("T", "7")):
                tok = tok.replace(a, b)
            row.number = (re.sub(r"\D", "", tok) or tok)[:3]
            row.year = nm.group(2) if len(nm.group(2)) == 4 else ""
        t = re.search(r'<div[^>]*class="[^"]*text-styling-bill[^"]*"[^>]*>\s*<p[^>]*>(.*?)</p>', card, flags=re.S | re.I)
        row.title = _strip_tags(t.group(1)) if t else (head or "")
        if not row.year:
            ym = re.search(r"\b(19|20)\d{2}\b", row.title)
            if ym:
                row.year = ym.group(0)
        labels: dict[str, str] = {}
        for lab, val in re.findall(r'<label[^>]*>(.*?)</label>\s*<span[^>]*>(.*?)</span>', card, flags=re.S | re.I):
            labels[_strip_tags(lab)] = _strip_tags(val)
        row.date = labels.get("Introduced on :", "") or labels.get("Introduced on", "")
        # Every PDF/DOCX anchor in the card is a bill document (the only other
        # link is the introducer's member_detail.php). Order-independent.
        for href in re.findall(r'href="([^"]+\.(?:pdf|PDF|docx?|DOCX?))"', card):
            _add_link(row, href)
        return row


def _innermost_table_chunks(html: str) -> list[str]:
    """Return each innermost (leaf) <table>…</table>, nesting-aware.

    ``re.findall(r'<table>.*?</table>')`` breaks on nested tables — the outer
    match stops at the first inner ``</table>``. A stack scan over open/close
    events pairs correctly and lets us keep only the leaves (MP nests its data
    tables inside one layout table, and the layout table has MORE <tr>).
    """
    events = sorted(
        [(m.start(), +1) for m in re.finditer(r"<table\b", html, flags=re.I)]
        + [(m.start(), -1) for m in re.finditer(r"</table\s*>", html, flags=re.I)]
    )
    stack: list[int] = []
    chunks: list[tuple[int, int, int]] = []      # (start, end, depth)
    for pos, delta in events:
        if delta == +1:
            stack.append(pos)
        elif stack:
            start = stack.pop()
            chunks.append((start, pos, len(stack)))
    if not chunks:
        return []
    max_depth = max(d for _, _, d in chunks)
    return [html[s:e] for s, e, d in chunks if d == max_depth]


class MpYearTableParser(IndexParser):
    """MP's MS-Word-exported per-year pages: innermost tables, 8 columns."""

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            rows.extend(self._parse_one(doc))
        return rows

    def _parse_one(self, doc: IndexDocument) -> list[BillRow]:
        html = doc.content.decode("utf-8-sig", "replace")
        rows: list[BillRow] = []
        for table in _innermost_table_chunks(html):
            for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", table, flags=re.S | re.I):
                cells = _cells(tr)
                if not cells:
                    continue
                texts = [t.strip() for t, _ in cells]
                if len(cells) == 1:
                    continue                                   # session banner
                if texts and texts[0].startswith("क्र"):
                    continue                                   # header
                if not any(t for t in texts):
                    continue                                   # all-blank spacer row
                row = self._map_row(cells, doc.url)
                if row.title or row.number:
                    rows.append(row)
        return rows

    def _map_row(self, cells: list[tuple[str, str]], base_url: str) -> BillRow:
        row = BillRow()
        raw1 = cells[1][1] if len(cells) > 1 else ""
        text1 = cells[1][0].strip() if len(cells) > 1 else ""

        # Canonical number: "(क्रमांक N सन् YYYY)" — title stops before it.
        m2 = re.search(r"\(\s*क्र(?:मांक)?\s*[-–]?\s*(\d+)\s*(?:सन्|सन)\s*\d{4}", text1)
        if m2:
            row.number = m2.group(1)
            row.title = text1[: m2.start()].strip()

        # Bill PDF anchor in cell 1 (title link).
        m = re.search(r'<a[^>]+href="([^"]+\.pdf[^"]*)"[^>]*>(.*?)</a>', raw1, flags=re.S | re.I)
        if m:
            if not row.title:
                row.title = _strip_tags(m.group(2))
            _add_link(row, m.group(1))
        elif not row.title:
            row.title = text1

        if not row.number:
            if m:
                fn = re.search(r"[Bb]ill\s*[Nn]?[Oo0]?\.?\s*(\d+)", m.group(1))
                if fn:
                    row.number = fn.group(1)
            elif cells and re.match(r"\d+", cells[0][0].strip()):
                row.number = cells[0][0].strip()

        ym = re.search(r"bill[_-](\d{4})\.htm", base_url, flags=re.I)
        if ym:
            row.year = ym.group(1)
        if len(cells) > 3:
            row.date = cells[3][0].strip()
        if len(cells) > 7:
            act = re.search(r'href="([^"]+\.pdf[^"]*)"', cells[7][1], flags=re.I)
            if act:
                _add_link(row, act.group(1))
        if cells and cells[0][1]:
            ordm = re.search(r'href="([^"]*ord[^"]*\.pdf[^"]*)"', cells[0][1], flags=re.I)
            if ordm:
                _add_link(row, ordm.group(1))
        return row


class MaharashtraVidheyakeParser(IndexParser):
    """Maharashtra's per-bill rows: a Devanagari number + 1–2 relative PDFs."""

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            html = doc.content.decode("utf-8", "replace")
            for td in re.findall(
                r"<tr>\s*<td[^>]*>\s*<img[^>]*>\s*</td>\s*<td[^>]*>(.*?)</td>\s*</tr>",
                html,
                flags=re.S | re.I,
            ):
                row = self._parse_td(td, doc.url)
                if row.number or row.doc_links:
                    rows.append(row)
        # A bill introduced AND passed is listed on both sub-pages; collapse on
        # (number, year) and merge the document lists.
        seen: dict[tuple, BillRow] = {}
        out: list[BillRow] = []
        for r in rows:
            key = (r.number, r.year) if r.number else (r.title, r.year)
            if key in seen:
                for link, kind in zip(r.doc_links, r.doc_types):
                    if link not in seen[key].doc_links:
                        seen[key].doc_links.append(link)
                        seen[key].doc_types.append(kind)
            else:
                seen[key] = r
                out.append(r)
        return out

    def _parse_td(self, td: str, url: str) -> BillRow:
        row = BillRow()
        text = _strip_tags(td)
        nm = re.search(r"वि\.(स|प)\.वि\.\s*क्रं?\.?\s*[:.]?\s*([०-९0-9]+)", text)
        if nm:
            row.number = _dev_digits(nm.group(2))
        ym = re.search(r"Vidheyake_Assembly-(\d{4})", url) or re.search(r"/assembly-bill/(\d{4})/", url)
        if ym:
            row.year = ym.group(1)
        for href, label in re.findall(r'<a[^>]+href="([^"]+\.pdf)"[^>]*>(.*?)</a>', td, flags=re.S | re.I):
            full = urljoin(url, href)
            _add_link(row, full)
            lbl = _strip_tags(label)
            lang = "marathi" if "मराठी" in lbl else ("english" if any(k in lbl for k in ("इंग्रजी", "English", "Hindi")) else "")
            stage = "introduced" if ("पुरस्थापनार्थ" in full or "introduce" in full.lower()) else ("passed" if "संमत" in full else "")
            row.doc_types[-1] = "-".join(filter(None, [stage, lang]))
        return row


class RajasthanBillsParser(IndexParser):
    """Rajasthan's GovernmentBills GridView — documents are direct URLs, not postbacks.

    The `linkPdfAct` POSTBACK is BROKEN (302 -> /ErrorPage.aspx) and must never
    be replayed. Both documents are plain GETs:
      - bill text: `onclick="OpenGovernmentBills(&quot;<url>&quot;)"` on the
        linkEng / linkHindi anchors (2 per bill);
      - act:       the `linkPdfAct` link TEXT "NN/YYYY" -> ActReport/ActNN-YYYY.pdf
        (absent / "-" for bills with no Act).
    """

    BASE = "https://assembly.rajasthan.gov.in"

    def parse(self, docs: list[IndexDocument]) -> list[BillRow]:
        rows: list[BillRow] = []
        for doc in docs:
            html = doc.content.decode("utf-8", "replace")
            rows.extend(self._parse_one(html))
        return rows

    def _parse_one(self, html: str) -> list[BillRow]:
        rows: list[BillRow] = []
        for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.S | re.I):
            if "OpenGovernmentBills" not in tr and "linkPdfAct" not in tr:
                continue
            row = BillRow()
            for u in re.findall(r'OpenGovernmentBills\(&quot;([^&]+)&quot;\)', tr):
                link = urljoin(self.BASE, u)
                _add_link(row, link)
                row.doc_types[-1] = "text" if "BillReport" in link else ""
            for m in re.findall(r"linkPdfAct[^>]*>\s*([0-9]{1,4}/[0-9]{4})\s*</a>", tr, flags=re.I):
                link = f"{self.BASE}/BillInformationSystem/ActReport/Act{m.replace('/', '-')}.pdf"
                _add_link(row, link)
                row.doc_types[-1] = "act"
            for t in re.findall(r"<td[^>]*>(.*?)</td>", tr, flags=re.S | re.I):
                nm = re.search(r"^\s*([0-9]{1,4})/([0-9]{4})\s*$", _strip_tags(t))
                if nm and not row.number:
                    row.number, row.year = nm.group(1), nm.group(2)
            # Keep the bill even when no document is downloadable (empty
            # onclick + no Act) — a metadata-only row is a valid index entry.
            if row.doc_links or row.number:
                rows.append(row)
        return rows


def make_parser_for(code: str, mode) -> IndexParser:
    if mode is FetchMode.PRS_PAGER:
        return PrsParser()
    if code == "MZ":
        return MizoramAccordionParser()
    if code == "GA":
        return GoaCardParser()
    if code == "MP":
        return MpYearTableParser()
    if code == "MH":
        return MaharashtraVidheyakeParser()
    if code == "RJ":
        return RajasthanBillsParser()
    return HtmlTableParser()
