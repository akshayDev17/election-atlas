"""Post-parse enrichment — mutate rows after parsing (per-row detail fetch).

Some indices only link to a per-bill *detail page* whose real document URL
sits one hop deeper (Assam). Enrichment follows those links and replaces the
detail-page URL with the actual document URL, keeping Phase 2 a straight
download. One concrete class now; more are added without touching Phase 1.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from urllib.parse import urljoin

from http_client import HttpClient
from index_parsers import _strip_tags, infer_doc_type
from models import BillRow


class Enricher(ABC):
    @abstractmethod
    def enrich(self, rows: list[BillRow], client: HttpClient) -> list[BillRow]:
        ...


class DetailPageEnricher(Enricher):
    """Follow list links that are detail pages and pull the real document URL.

    Assam's list links to ``/legislation/bills/<stage>/<id>`` and the PDF is on
    that page's ``<object data="…">``. The two regexes are injectable, so other
    states reuse the same class with different patterns.
    """

    def __init__(self, link_re: re.Pattern | None = None, doc_re: re.Pattern | None = None) -> None:
        self.link_re = link_re or re.compile(r"/legislation/bills/(?:introduced|passed)/\d+")
        self.doc_re = doc_re or re.compile(r'object\s+data="([^"]+)"')

    def enrich(self, rows: list[BillRow], client: HttpClient) -> list[BillRow]:
        for row in rows:
            for i, link in enumerate(list(row.doc_links)):
                if self.link_re.search(link):
                    try:
                        resp = client.get(link)
                        m = self.doc_re.search(resp.text)
                        if m:
                            row.doc_links[i] = urljoin(link, m.group(1))
                    except Exception:            # noqa: BLE001 — one hop, keep the list URL
                        pass
        return rows


ENRICHERS = {"detail": DetailPageEnricher()}


def enrich(key: str, rows: list[BillRow], client: HttpClient) -> list[BillRow]:
    enricher = ENRICHERS.get(key)
    return enricher.enrich(rows, client) if enricher else rows


def assam_post(rows: list[BillRow], client: HttpClient) -> list[BillRow]:
    """Assam state-level post-step: densify the id space, then enrich links.

    The two lists expose 267 of 271 bills; ids 12, 14, 101, 175 exist only as
    detail pages. Probe every id up to ``max(list_id) + 5`` that the lists did
    NOT yield, then run the detail->PDF hop over all rows.
    """
    base = "https://assambidhansabha.org"
    seen: set[int] = set()
    for r in rows:
        for link in r.doc_links:
            m = re.search(r"/legislation/bills/(?:introduced|passed)/(\d+)", link)
            if m:
                seen.add(int(m.group(1)))
    if seen:
        for i in range(1, max(seen) + 6):
            if i in seen:
                continue
            resp = client.get(f"{base}/legislation/bills/introduced/{i}")
            if "Title :" not in resp.text:
                continue
            row = BillRow()
            tm = re.search(r"Title\s*:\s*(.*?)</span>", resp.text, re.S)
            if tm:
                row.title = _strip_tags(tm.group(1))
            ym = re.search(r"\b(19|20)\d{2}\b", row.title)
            if ym:
                row.year = ym.group(0)
            dm = re.search(r'object\s+data="([^"]+)"', resp.text)
            if dm:
                full = urljoin(f"{base}/legislation/bills/introduced/{i}", dm.group(1))
                row.doc_links = [full]
                row.doc_types = [infer_doc_type(full)]
            rows.append(row)
    return DetailPageEnricher().enrich(rows, client)
