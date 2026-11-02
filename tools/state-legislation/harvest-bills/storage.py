"""Storage layer — the document cache and its manifests.

Encapsulates the download-target layout agreed for Phase 2:

    data/state-legislation/IN-<XX>/<section>/
        index.json        (harvested rows)
        manifest.json     (url -> local path, sha256, bytes, content-type, fetched_at)
        documents/        (gitignored; named by the store's NamingStrategy)

Nothing outside this module builds a path by hand; callers only speak
``write()`` / ``load_manifest()`` / ``save_manifest()``.
"""
from __future__ import annotations

import hashlib
import json
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data" / "state-legislation"


def _extension(content_type: str) -> str:
    ct = content_type.lower()
    if "pdf" in ct:
        return ".pdf"
    if "wordprocessingml" in ct:
        return ".docx"
    if "msword" in ct:
        return ".doc"
    if "octet-stream" in ct:
        return ".bin"
    return ""


_MAGIC: list[tuple[bytes, str]] = [
    (b"%PDF-", "application/pdf"),
    (b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    (b"\xd0\xcf\x11\xe0", "application/msword"),
]


def _sniff(content: bytes, content_type: str) -> str:
    """Let the bytes override a misleading Content-Type header.

    Goa serves valid PDFs as ``application/octet-stream``, which would name them
    ``.bin``. The magic bytes are ground truth; the header is only a hint.
    """
    for magic, guessed in _MAGIC:
        if content.startswith(magic):
            return guessed
    return content_type


class NamingStrategy(ABC):
    """Decides the on-disk filename for one downloaded document.

    Contract: ``name(url, content_type)`` returns the *filename only* — a
    relative, single-component ``Path`` — never a directory. ``DocumentStore``
    places it under its ``documents/`` directory. The extension must be
    included and derived from ``content_type``; it must never be inferred from
    the URL's own suffix or from ``pathlib`` suffix heuristics.
    """

    @abstractmethod
    def name(self, url: str, content_type: str) -> Path:
        """Return the filename (no directory) for the given URL/content type."""
        raise NotImplementedError


class HashNamingStrategy(NamingStrategy):
    """Content-addressed filename: ``<sha1(url)[:10]>-<kind><ext>``.

    Deterministic and order-independent: the same URL always maps to the same
    filename, so re-runs overwrite cleanly and a partial ``--limit`` run is a
    stable prefix of a full run. Uniqueness comes from the URL digest; ``kind``
    is a constant, human-friendly tag for the whole store (the section name),
    and the extension comes from ``content_type``.
    """

    def __init__(self, kind: str = "doc") -> None:
        self.kind = kind or "doc"

    def name(self, url: str, content_type: str) -> Path:
        digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:10]
        return Path(f"{digest}-{self.kind}{_extension(content_type) or '.bin'}")


@dataclass
class ManifestEntry:
    url: str
    path: str = ""
    sha256: str = ""
    bytes: int = 0
    content_type: str = ""
    fetched_at: str = ""
    ok: bool = True
    reason: str = ""


@dataclass
class Manifest:
    state: str
    section: str
    entries: list[ManifestEntry] = field(default_factory=list)

    @property
    def ok(self) -> int:
        return sum(1 for e in self.entries if e.ok)

    @property
    def failed(self) -> int:
        return sum(1 for e in self.entries if not e.ok)

    @property
    def total_bytes(self) -> int:
        return sum(e.bytes for e in self.entries if e.ok)


class DocumentStore:
    """One store per (state, section); knows where everything lives."""

    def __init__(
        self,
        state_code: str,
        section: str,
        naming: Optional[NamingStrategy] = None,
    ) -> None:
        self.state_code = state_code          # short code, e.g. "CG"
        self.iso = f"IN-{state_code}"         # leaf, e.g. "IN-CG"
        self.section = section
        self.base = DATA_DIR / self.iso / section
        self.naming = naming or HashNamingStrategy(kind=section)

    # -- paths -----------------------------------------------------------
    @property
    def documents_dir(self) -> Path:
        return self.base / "documents"

    @property
    def manifest_path(self) -> Path:
        return self.base / "manifest.json"

    @property
    def index_path(self) -> Path:
        return self.base / "index.json"

    # -- documents -------------------------------------------------------
    def write(self, url: str, content: bytes, content_type: str = "") -> Path:
        path = self.documents_dir / self.naming.name(url, _sniff(content, content_type))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    # -- manifest --------------------------------------------------------
    def load_manifest(self) -> Manifest:
        if not self.manifest_path.exists():
            return Manifest(state=self.iso, section=self.section)
        data = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        return Manifest(
            state=data["state"],
            section=data["section"],
            entries=[ManifestEntry(**e) for e in data.get("entries", [])],
        )

    def save_manifest(self, manifest: Manifest) -> None:
        self.manifest_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "state": self.iso,
            "section": self.section,
            "ok": manifest.ok,
            "failed": manifest.failed,
            "total_bytes": manifest.total_bytes,
            "entries": [asdict(e) for e in manifest.entries],
        }
        self.manifest_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    # -- index (Phase 1 rows) --------------------------------------------
    def save_index(self, rows: list[dict]) -> None:
        self.index_path.parent.mkdir(parents=True, exist_ok=True)
        self.index_path.write_text(
            json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
        )
