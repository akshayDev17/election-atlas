"""Shared plumbing for the published-data harvesters.

Every harvester fetches an official file, keeps the exact bytes in a local
cache, and stamps the output with where the bytes came from:

    "provenance": "published",
    "source": {"publisher": ..., "url": ..., "sha256": ..., "fetched_at": ...}

The cache is what lets validate_records.py prove the sha256 in an output file is
the hash of a file that was really fetched. It defaults to `_research/harvest/`
(gitignored) and can be moved with --cache.

Fetches use curl, because this machine's Python SSL bundle is broken (see
tools/README.md).
"""
import datetime as dt
import hashlib
import io
import json
import re
import subprocess
from pathlib import Path

ATLAS = Path(__file__).resolve().parent.parent
DATA = ATLAS / "data"
DEFAULT_CACHE = ATLAS / "_research" / "harvest"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")


class SourceShapeError(RuntimeError):
    """The source did not look the way the harvester expects. Never guess past it."""


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def cache_path(cache: Path, url: str) -> Path:
    """One file per URL, named by the URL's hash plus a readable tail."""
    tail = re.sub(r"[^A-Za-z0-9._-]+", "_", url.rstrip("/").split("/")[-1])[-80:] or "index"
    return Path(cache) / f"{sha256_bytes(url.encode())[:16]}-{tail}"


def fetch(url: str, cache: Path, refresh: bool = False, min_bytes: int = 1,
          missing_ok: bool = False):
    """Fetch `url` once into the cache and return {url, path, sha256, fetched_at, bytes}.

    A cached copy is reused unless `refresh` is set; fetched_at is the time the
    cached bytes were downloaded (kept in a sidecar), so reruns are reproducible.
    With missing_ok, an HTTP 400/404 returns None instead of raising (and caches nothing).
    """
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    path = cache_path(cache, url)
    meta = path.with_name(path.name + ".meta.json")
    if refresh or not path.exists() or not meta.exists():
        part = path.with_name(path.name + ".part")
        r = subprocess.run(
            ["curl", "-sSL", "-m", "180", "--retry", "3", "--retry-delay", "5",
             "-A", UA, "-o", str(part), "-w", "%{http_code}", url],
            capture_output=True)
        status = r.stdout.decode().strip()
        if r.returncode != 0 or not status.startswith("2"):
            part.unlink(missing_ok=True)
            if missing_ok and status in ("400", "404"):
                return None
            raise RuntimeError(f"fetch failed for {url}: HTTP {status or '-'} "
                               f"{r.stderr.decode('utf-8', 'replace')[:300]}")
        part.replace(path)
        fetched_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        meta.write_text(json.dumps({"url": url, "fetched_at": fetched_at}))
    body = path.read_bytes()
    if len(body) < min_bytes:
        raise SourceShapeError(f"{url}: {len(body)} bytes, expected at least {min_bytes}")
    return {
        "url": url,
        "path": path,
        "sha256": sha256_bytes(body),
        "fetched_at": json.loads(meta.read_text())["fetched_at"],
        "bytes": body,
    }


def source_block(publisher: str, got: dict, **extra) -> dict:
    """The `source` object every output file carries."""
    block = {"publisher": publisher, "url": got["url"], "sha256": got["sha256"],
             "fetched_at": got["fetched_at"]}
    block.update(extra)
    return block


def write_json(path: Path, doc: dict) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


# ── spreadsheets ─────────────────────────────────────────────────────────────
def sheets(body: bytes):
    """{sheet name: rows} for a .xls or .xlsx body, judged by its magic bytes."""
    if body[:4] == b"\xd0\xcf\x11\xe0":
        import xlrd
        wb = xlrd.open_workbook(file_contents=body, ignore_workbook_corruption=True)
        return {sh.name: [sh.row_values(r) for r in range(sh.nrows)] for sh in wb.sheets()}
    if body[:2] == b"PK":
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(body), read_only=True, data_only=True)
        out = {name: [list(r) for r in wb[name].iter_rows(values_only=True)] for name in wb.sheetnames}
        wb.close()
        return out
    raise SourceShapeError(f"not a spreadsheet (starts {body[:16]!r})")


def cell(v) -> str:
    """A cell as single-spaced text ('' for empty)."""
    return "" if v is None else " ".join(str(v).split())


def num(v):
    """A count cell -> int; '' or a lone '-' (ECI's nil) -> None. Anything else is a shape error."""
    if v is None or (isinstance(v, str) and v.strip() in ("", "-")):
        return None
    if isinstance(v, (int, float)):
        if float(v) != int(v):
            raise SourceShapeError(f"expected a whole count, got {v!r}")
        return int(v)
    s = str(v).strip().replace(",", "")
    if re.fullmatch(r"\d+(\.0+)?", s):
        return int(float(s))
    raise SourceShapeError(f"expected a count, got {v!r}")
