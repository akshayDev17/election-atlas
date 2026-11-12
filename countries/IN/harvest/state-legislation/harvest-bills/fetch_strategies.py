"""Fetch strategies — one class per FetchMode (Strategy pattern + LSP).

Every strategy exposes the same ``fetch(url) -> list[IndexDocument]``
contract, so Phase 1 dispatches through the abstraction and never branches on
concrete classes (Open/Closed).
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from html import unescape
from typing import Optional
from urllib.parse import urljoin, urlparse

from http_client import HttpClient
from models import FetchMode, IndexDocument


def _host_of(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}"


class FetchStrategy(ABC):
    mode: FetchMode

    def __init__(self, client: HttpClient) -> None:
        self.client = client

    @abstractmethod
    def fetch(self, url: str) -> list[IndexDocument]:
        ...


class StaticCurlStrategy(FetchStrategy):
    mode = FetchMode.STATIC_CURL

    def fetch(self, url: str) -> list[IndexDocument]:
        r = self.client.get(url)
        return [IndexDocument(url=r.url, content=r.content)]


class NevaSessionStrategy(FetchStrategy):
    mode = FetchMode.NEVA_SESSION

    def fetch(self, url: str) -> list[IndexDocument]:
        base = _host_of(url)
        self.client.get(base + "/")                 # seed the session (redirect trap)
        r = self.client.get(url, referer=base + "/")
        return [IndexDocument(url=r.url, content=r.content)]


class _PostbackStrategy(FetchStrategy, ABC):
    """Shared GET -> echo hidden state -> POST replay (WebForms family)."""

    def __init__(self, client: HttpClient, form_data: Optional[dict] = None) -> None:
        super().__init__(client)
        self.form_data = form_data or {}

    def fetch(self, url: str) -> list[IndexDocument]:
        url = url.rstrip("/") + "/"                 # trailing-slash trap
        page = self.client.get(url)
        fields = {**self._hidden(page.text), **self.form_data}
        r = self.client.post(url, fields, referer=url)
        return [IndexDocument(url=r.url, content=r.content)]

    @staticmethod
    def _hidden(html: str) -> dict:
        out = {}
        for name, value in re.findall(
            r'id="(__[A-Z]+)"[^>]*value="([^"]*)"', html
        ):
            out[name] = unescape(value)
        return out


class WebFormsPostbackStrategy(_PostbackStrategy):
    mode = FetchMode.WEBFORMS_POSTBACK


class GazettePostbackStrategy(_PostbackStrategy):
    mode = FetchMode.GAZETTE_POSTBACK


class PrsPagerStrategy(FetchStrategy):
    mode = FetchMode.PRS_PAGER
    # Safety cap only — the real terminator is "a page contributes nothing
    # new". PRS repeats the last page past the end (KA: page 13 = 16 files,
    # page 14 repeats it), so stop when a page adds no unseen file, not after
    # a fixed page count. 200 pages @ 50 = 10k bills, far beyond any state.
    MAX_PAGES = 200

    def fetch(self, url: str) -> list[IndexDocument]:
        docs: list[IndexDocument] = []
        seen: set[str] = set()
        for page in range(1, self.MAX_PAGES + 1):
            sep = "&" if "?" in url else "?"
            paged = f"{url}{sep}page={page}&per-page=50"
            r = self.client.get(paged)
            file_set = set(re.findall(r"/files/bills_acts/[^\"']+", r.text))
            if not file_set or not (file_set - seen):   # empty, or nothing new
                break
            seen |= file_set
            docs.append(IndexDocument(url=r.url, content=r.content))
        return docs


class NumberedPagerStrategy(FetchStrategy):
    """Walk ``{page}``-templated URLs until a page stops matching a marker.

    Generic over Mizoram (39 pages of cards), Assam (11+3 list pages) and any
    other server-side ``?page=N`` index. The per-state differences are data in
    ``opts``, not code — Open/Closed.
    """

    mode = FetchMode.NUMBERED_PAGER

    def __init__(self, client: HttpClient, opts: Optional[dict] = None) -> None:
        super().__init__(client)
        self.opts = opts or {}

    def fetch(self, url: str) -> list[IndexDocument]:
        template = self.opts["page_template"]           # contains {page}
        marker = self.opts.get("marker")                # page must match to count
        max_pages = int(self.opts.get("max_pages", 60))
        docs: list[IndexDocument] = []
        for page in range(1, max_pages + 1):
            r = self.client.get(template.format(page=page))
            if not r.content.strip():
                break
            if marker and not re.search(marker, r.text, flags=re.I):
                break
            docs.append(IndexDocument(url=r.url, content=r.content))
        return docs


class LinkFanoutStrategy(FetchStrategy):
    """Fetch a hub page, discover sub-links by regex, fetch each one."""

    mode = FetchMode.LINK_FANOUT

    def __init__(self, client: HttpClient, opts: Optional[dict] = None) -> None:
        super().__init__(client)
        self.opts = opts or {}

    def fetch(self, url: str) -> list[IndexDocument]:
        link_re = self.opts["link_re"]
        max_links = int(self.opts.get("max_links", 100))
        hub = self.client.get(url)
        links = sorted(set(re.findall(link_re, hub.text, flags=re.I)))
        docs: list[IndexDocument] = []
        for link in links[:max_links]:
            full = urljoin(self.opts.get("base", url), link)
            r = self.client.get(full)
            if r.content:
                docs.append(IndexDocument(url=r.url, content=r.content))
        return docs


class GoaAssemblyPagerStrategy(FetchStrategy):
    """Goa's two-level fragment: enumerate assemblies, then page each at 5/page.

    Page 1 is ``~*~``-framed (cards | page count | total | name | script) and
    pages >= 2 are bare HTML; an out-of-range page returns 0 bytes. One
    bespoke class, one state — behind the same ``fetch`` contract as the rest.
    """

    mode = FetchMode.GOA_ASSEMBLY_PAGER

    def __init__(self, client: HttpClient, opts: Optional[dict] = None) -> None:
        super().__init__(client)
        self.opts = opts or {}

    def fetch(self, url: str) -> list[IndexDocument]:
        combos = self.client.get(self.opts["combo_url"])
        assemblies = sorted(
            {int(m) for m in re.findall(r"<option\s+value=['\"](\d+)['\"]", combos.text) if m != "0"}
        )
        docs: list[IndexDocument] = []
        for a in assemblies:
            r1 = self.client.get(self.opts["page1_template"].format(assembly=a))
            if not r1.content.strip():
                continue
            parts = r1.text.split("~*~")
            cards = parts[0]
            total = int(parts[2]) if len(parts) > 2 and parts[2].strip().isdigit() else 0
            docs.append(IndexDocument(url=r1.url, content=cards.encode("utf-8")))
            for page in range(2, -(-total // 5) + 1):
                rn = self.client.get(self.opts["pageN_template"].format(assembly=a, page=page))
                if not rn.content.strip():
                    break
                docs.append(IndexDocument(url=rn.url, content=rn.content))
        return docs


class MaharashtraFanoutStrategy(FetchStrategy):
    """Maharashtra's registry-first fan-out: directory -> status sub-pages.

    The registry's working source is a per-year link directory
    (`Vidheyake_Assembly-2026.aspx`). It links the status sub-pages
    (`-2026-L-C-Bill-introduce.aspx`, `-2026-L-A-Bill.aspx`) plus any
    cross-year page it exposes (`-2025-L-C-Bill-pass.aspx`); the bill rows and
    PDF links live on those sub-pages. No session, no postback — plain GET at
    every hop.
    """

    mode = FetchMode.MAHARASHTRA_FANOUT

    def fetch(self, url: str) -> list[IndexDocument]:
        hub = self.client.get(url)
        subs = sorted(set(re.findall(
            r'href="([^"]*Vidheyake_Assembly-\d{4}-[A-Za-z0-9-]+\.aspx)"',
            hub.text, flags=re.I)))
        docs: list[IndexDocument] = []
        for s in subs:
            r = self.client.get(urljoin(url, s))
            if r.content:
                docs.append(IndexDocument(url=r.url, content=r.content))
        return docs


# Registry (Open/Closed): add a new mode by registering a class, not by
# editing the dispatch in Phase 1.
STRATEGY_REGISTRY = {
    FetchMode.STATIC_CURL: StaticCurlStrategy,
    FetchMode.NEVA_SESSION: NevaSessionStrategy,
    FetchMode.WEBFORMS_POSTBACK: WebFormsPostbackStrategy,
    FetchMode.PRS_PAGER: PrsPagerStrategy,
    FetchMode.GAZETTE_POSTBACK: GazettePostbackStrategy,
    FetchMode.NUMBERED_PAGER: NumberedPagerStrategy,
    FetchMode.LINK_FANOUT: LinkFanoutStrategy,
    FetchMode.GOA_ASSEMBLY_PAGER: GoaAssemblyPagerStrategy,
    FetchMode.MAHARASHTRA_FANOUT: MaharashtraFanoutStrategy,
}


def make_strategy(
    mode: FetchMode,
    client: HttpClient,
    form_data: Optional[dict] = None,
    opts: Optional[dict] = None,
) -> FetchStrategy:
    cls = STRATEGY_REGISTRY[mode]
    if issubclass(cls, _PostbackStrategy):
        return cls(client, form_data=form_data)
    if issubclass(cls, (NumberedPagerStrategy, LinkFanoutStrategy, GoaAssemblyPagerStrategy)):
        return cls(client, opts=opts)
    return cls(client)
