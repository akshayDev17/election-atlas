"""Minimal stdlib HTTP client with a persistent cookie jar.

Injectable dependency (DIP): fetch strategies receive an ``HttpClient`` and
never build their own opener, so transport concerns stay in one place.

TLS policy: try verified first; on a certificate failure, retry unverified
(same behaviour as ``curl -k``), because several NIC government hosts serve
broken/incomplete chains that no client can verify.
"""
from __future__ import annotations

import http.client
import http.cookiejar
import socket
import ssl
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Optional

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

# Per-host timeout overrides (seconds). mls.org.in / assembly.rajasthan.gov.in
# are genuinely slow to first byte under load, so they need more than the 60 s
# default. The *body-stall* problem is handled separately (see
# BODY_READ_TIMEOUT), not by lengthening this — a longer overall timeout is
# exactly what made the old 180 s overrides harmful.
HOST_TIMEOUTS = {"mls.org.in": 120, "assembly.rajasthan.gov.in": 120}

# Once headers have arrived, shorten the socket timeout. A host may legitimately
# take a while to start responding, but a body that goes quiet mid-stream is a
# lying Content-Length — stop there and keep what actually arrived. Kept at the
# historical 60 s default: some of these pages legitimately take ~40 s to stream.
BODY_READ_TIMEOUT = 60


def _timeout_for(url: str, default: int) -> int:
    return HOST_TIMEOUTS.get(urllib.parse.urlsplit(url).netloc, default)


CHUNK_SIZE = 64 * 1024


def _read_body(r) -> bytes:
    """Read a response body in bounded chunks instead of trusting Content-Length.

    ``mls.org.in`` and ``assembly.rajasthan.gov.in`` sometimes declare a
    Content-Length larger than the bytes they actually send, then stall or
    close. ``r.read()`` with no argument calls ``_safe_read(length)`` and blocks
    on that phantom remainder until the socket times out; reading a fixed chunk
    at a time lets us stop at EOF (or a mid-body timeout) and keep whatever
    genuinely arrived.
    """
    try:
        r.fp.raw._sock.settimeout(BODY_READ_TIMEOUT)
    except Exception:                              # internals differ across versions
        pass
    parts: list[bytes] = []
    while True:
        try:
            chunk = r.read(CHUNK_SIZE)
        except (TimeoutError, socket.timeout):
            if not parts:
                raise                              # nothing arrived: a real timeout
            break                                  # stalled mid-body: keep partial
        except http.client.IncompleteRead as e:
            parts.append(e.partial)                # truncated: keep partial
            break
        if not chunk:
            break                                  # clean EOF
        parts.append(chunk)
    return b"".join(parts)


@dataclass
class Response:
    status: int
    url: str
    content: bytes
    headers: dict = field(default_factory=dict)

    @property
    def text(self) -> str:
        return self.content.decode("utf-8", "replace")

    @property
    def content_type(self) -> str:
        return self.headers.get("Content-Type", "")

    @property
    def content_length(self) -> int:
        v = self.headers.get("Content-Length")
        return int(v) if v and v.isdigit() else -1


def _ctx(verify: bool) -> ssl.SSLContext:
    if verify:
        try:
            ctx = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
        except Exception:
            ctx = ssl.create_default_context()
    else:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    try:
        ctx.options |= 0x4                      # SSL_OP_LEGACY_SERVER_CONNECT
    except Exception:
        pass
    return ctx


class HttpClient:
    def __init__(self) -> None:
        jar = http.cookiejar.CookieJar()
        self._verified = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(jar),
            urllib.request.HTTPSHandler(context=_ctx(True)),
        )
        self._insecure = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(jar),
            urllib.request.HTTPSHandler(context=_ctx(False)),
        )

    def _open(self, req: urllib.request.Request, timeout: int):
        try:
            return self._verified.open(req, timeout=timeout)
        except urllib.error.URLError as e:
            if self._is_tls_error(e.reason):
                return self._insecure.open(req, timeout=timeout)
            raise
        except ssl.SSLError as e:
            if self._is_tls_error(e):
                return self._insecure.open(req, timeout=timeout)
            raise

    @staticmethod
    def _is_tls_error(e) -> bool:
        if isinstance(e, ssl.SSLError):
            return any(k in str(e) for k in ("CERTIFICATE", "certificate", "UNSAFE_LEGACY", "unsafe legacy", "tls", "handshake"))
        return False

    @staticmethod
    def _with_retry(call, attempts: int = 3):
        """Retry transient transport failures, never an answered request.

        One tier can issue hundreds of requests (Goa's pager ~500), so a single
        dropped connection must not fail the whole tier. An HTTP status (4xx/5xx)
        is a real answer and propagates immediately.
        """
        last: Optional[BaseException] = None
        for _ in range(attempts):
            try:
                return call()
            except urllib.error.HTTPError:
                raise
            except (urllib.error.URLError, TimeoutError, socket.timeout, OSError) as exc:
                last = exc
        raise last

    def _send(self, req: urllib.request.Request, timeout: int) -> Response:
        with self._open(req, timeout) as r:
            return Response(r.status, r.geturl(), _read_body(r), dict(r.headers.items()))

    def get(self, url: str, referer: Optional[str] = None, timeout: int = 60) -> Response:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", UA)
        if referer:
            req.add_header("Referer", referer)
        return self._with_retry(lambda: self._send(req, _timeout_for(url, timeout)))

    def post(
        self, url: str, data: dict, referer: Optional[str] = None, timeout: int = 90
    ) -> Response:
        body = urllib.parse.urlencode(data).encode("utf-8")
        req = urllib.request.Request(url, data=body, method="POST")
        req.add_header("User-Agent", UA)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        if referer:
            req.add_header("Referer", referer)
        return self._with_retry(lambda: self._send(req, _timeout_for(url, timeout)))
