"""Download + verify — Phase 2.2 and 2.3.

A single download passes when: HTTP 200, non-empty, the ``Content-Length``
header (when present) matches the body, and — for PDFs — the ``%%EOF`` trailer
is present. Any failure is retried once, then recorded as a gap, never as a
silent skip.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Optional

from http_client import HttpClient
from resolvers import DocumentResolver, ResolveContext, ResolvedTarget, resolver_for


@dataclass
class AcquiredDocument:
    url: str = ""
    content: bytes = b""
    sha256: str = ""
    content_type: str = ""
    ok: bool = False
    reason: str = ""


class Downloader:
    def __init__(self, client: HttpClient) -> None:
        self.client = client

    def acquire(self, link: str, ctx: ResolveContext) -> AcquiredDocument:
        resolver: DocumentResolver = resolver_for(link)
        try:
            target: ResolvedTarget = resolver.resolve(link, ctx)
        except Exception as exc:                            # noqa: BLE001
            # A resolver may run its own session-bound POSTs (Chhattisgarh's
            # OpenFile.aspx). A transport failure there must become a recorded
            # gap, never an uncaught crash that kills the whole sweep.
            return AcquiredDocument(url=link, ok=False, reason=f"resolve {type(exc).__name__}")
        if target.content is not None:                      # session-bound, already fetched
            return self._inspect(target.url, target.content, target.content_type, -1, target.status)
        if not target.url:                                  # unresolvable (no context)
            return AcquiredDocument(url=link, ok=False, reason="unresolvable link")
        return self._fetch_verified(target.url)

    def _fetch_verified(self, url: str) -> AcquiredDocument:
        for attempt in (1, 2):
            try:
                resp = self.client.get(url)
            except Exception as exc:                        # noqa: BLE001
                result = AcquiredDocument(url=url, ok=False, reason=f"fetch {type(exc).__name__}")
            else:
                result = self._inspect(url, resp.content, resp.content_type, resp.content_length, resp.status)
            if result.ok:
                return result
        return result

    @staticmethod
    def _inspect(url, content, content_type, declared_length, status) -> AcquiredDocument:
        doc = AcquiredDocument(url=url, content=content, content_type=content_type)
        if status != 200:
            doc.reason = f"http {status}"
            return doc
        if not content:
            doc.reason = "empty body"
            return doc
        # A session-bound OpenFile.aspx that did not resolve returns HTML.
        if "text/html" in content_type.lower() or content.lstrip()[:1] in (b"<",):
            doc.reason = "html response, not a document"
            return doc
        # Content-Length is unreliable on some hosts, so it must not condemn a
        # complete PDF: for PDFs the %%EOF trailer is authoritative. Detect a
        # PDF by magic bytes too — Goa serves valid PDFs as octet-stream.
        is_pdf = (
            content.startswith(b"%PDF-")
            or "pdf" in content_type.lower()
            or url.lower().rsplit("?", 1)[0].endswith(".pdf")
        )
        if is_pdf:
            if b"%%EOF" not in content[-1024:]:
                doc.reason = "no %%EOF trailer (truncated?)"
                return doc
        elif declared_length > 0 and len(content) != declared_length:
            doc.reason = f"truncated: {len(content)}/{declared_length} bytes"
            return doc
        doc.sha256 = hashlib.sha256(content).hexdigest()
        doc.ok = True
        return doc
