"""Document resolvers — turn a Phase-1 ``doc_link`` into something fetchable.

Phase 1 emits three kinds of link:
  * an absolute http(s) URL            -> fetch directly
  * a ``javascript:__doPostBack(...)`` -> session-bound (replay the postback,
    then read the session's ``OpenFile.aspx``)
  * a ``postback:<target>``            -> session-bound (same flow)

A resolver returns a ``ResolvedTarget``: either a URL for the downloader to
GET, or bytes it has already retrieved itself (the session-bound case, where
there is no stable per-document URL at all).
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from html import unescape
from typing import Optional

from http_client import HttpClient


@dataclass
class ResolvedTarget:
    url: str = ""                      # downloader GETs this
    content: Optional[bytes] = None    # already fetched (session-bound)
    status: int = 200                  # for the already-fetched case
    content_type: str = ""


@dataclass
class ResolveContext:
    """Everything a session-bound resolver needs that a row does not carry."""

    client: HttpClient = field(default_factory=HttpClient)
    tier_url: str = ""                 # the WebForms/NeVA tier that owns the postback
    form_data: dict = field(default_factory=dict)


def _hidden_fields(html: str) -> dict:
    out = {}
    for name, value in re.findall(r'id="(__[A-Z]+)"[^>]*value="([^"]*)"', html):
        out[name] = unescape(value)
    return out


def _postback_target(link: str) -> Optional[str]:
    link = unescape(link)                     # &#39; -> '
    if link.startswith("postback:"):
        return link[len("postback:"):]
    m = re.search(r"__doPostBack\(\s*'([^']+)'", link)
    if m:
        return m.group(1)
    m = re.search(r"__doPostBack\(\s*([^'),\s]+)", link)
    return m.group(1) if m else None


class DocumentResolver(ABC):
    @abstractmethod
    def resolve(self, link: str, ctx: ResolveContext) -> ResolvedTarget:
        ...


class DirectResolver(DocumentResolver):
    """Plain absolute URL — nothing to do but hand it to the downloader."""

    def resolve(self, link: str, ctx: ResolveContext) -> ResolvedTarget:
        return ResolvedTarget(url=link)


class SessionBoundResolver(DocumentResolver):
    """ASP.NET WebForms document behind a ``__doPostBack`` link.

    Implements the Chhattisgarh e-Vidhan flow: GET the tier page for state,
    replay the row's postback, then GET ``OpenFile.aspx`` on the same cookie
    jar. The document has no stable URL, so the bytes are returned directly.
    """

    def resolve(self, link: str, ctx: ResolveContext) -> ResolvedTarget:
        target = _postback_target(link)
        if target is None or not ctx.tier_url:
            return ResolvedTarget()                  # no context -> unresolvable
        base = ctx.tier_url.rstrip("/") + "/"

        # 1. populate the grid (the search that renders this row's postback
        #    control), echoing fresh viewstate into the same cookie jar.
        page = ctx.client.get(base)
        fields = {**_hidden_fields(page.text), **ctx.form_data}
        if not fields.get("__EVENTTARGET"):
            fields["__EVENTTARGET"] = "btnSearch"
        fields["__EVENTARGUMENT"] = ""
        result = ctx.client.post(base, fields, referer=base)

        # 2. fire the row's own postback, carrying the state that rendered it.
        fields2 = {**_hidden_fields(result.text), **ctx.form_data}
        fields2["__EVENTTARGET"] = target
        fields2["__EVENTARGUMENT"] = ""
        ctx.client.post(base, fields2, referer=base)

        # 3. the document is served from the session's OpenFile.aspx.
        resp = ctx.client.get(base + "OpenFile.aspx")
        return ResolvedTarget(content=resp.content, status=resp.status, content_type=resp.content_type)


RESOLVER_REGISTRY = {"direct": DirectResolver, "session_bound": SessionBoundResolver}


def resolver_for(link: str) -> DocumentResolver:
    if link.startswith("postback:") or "__doPostBack" in link:
        return SessionBoundResolver()
    return DirectResolver()
