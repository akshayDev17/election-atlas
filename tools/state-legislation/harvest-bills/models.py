"""Domain models for the state-legislation harvest pipeline.

Kept dependency-free so the data structures are importable from every
other module without circular imports.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class FetchMode(str, Enum):
    """How a tier's index page must be acquired (Phase 1.1 dispatch)."""

    STATIC_CURL = "static_curl"
    NEVA_SESSION = "neva_session"
    WEBFORMS_POSTBACK = "webforms_postback"
    PRS_PAGER = "prs_pager"
    GAZETTE_POSTBACK = "gazette_postback"
    NUMBERED_PAGER = "numbered_pager"
    LINK_FANOUT = "link_fanout"
    GOA_ASSEMBLY_PAGER = "goa_assembly_pager"
    MAHARASHTRA_FANOUT = "maharashtra_fanout"


class Variant(str, Enum):
    """Which stage of a bill the state publishes (Phase 0.1a)."""

    INTRODUCED = "introduced"
    PASSED = "passed"
    NONE = "none"


class Capability(str, Enum):
    """What the reachable bill source ultimately yields (Phase 0.1b)."""

    INDEX_ONLY = "index_only"
    DOCUMENT_SCAN = "document_scan"
    DOCUMENT_TEXT = "document_text"
    NONE = "none"


@dataclass
class SourceTier:
    """One resolvable bill source for a state."""

    name: str
    url: str
    kind: str                                   # official | PRS | Gazette
    fetch_mode: FetchMode
    fallbacks: list[FetchMode] = field(default_factory=list)
    note: str = ""
    opts: dict = field(default_factory=dict)    # fetch-strategy options (pager/fan-out config)
    parser: str = ""                            # parser key ("" = generic, else "MZ"/"GA"/"MP")
    enrich: str = ""                            # post-parse enrichment key ("" = none, "detail" = follow detail pages)


@dataclass
class ResolvedState:
    """Phase 0 output: everything Phase 1..N needs about one state."""

    code: str
    name: str
    variant: set[Variant]
    capability: Capability
    tiers: list[SourceTier]


@dataclass
class BillRow:
    """Phase 1 output: one bill entry scraped off the index.

    ``doc_links`` is the source of truth — a bill routinely maps to MORE THAN
    ONE document (Delhi: bill + as-assented; AP: PassedBills + ActBills; Goa:
    As Introduced + As Passed as the normal case; MP: bill + Act + ordinance),
    so a single-valued field silently loses documents. ``doc_types`` runs
    parallel to it and is inferred from the URL, never the anchor label.
    ``doc_link`` remains as a read-only convenience = the first document.
    """

    title: str = ""
    number: str = ""
    year: str = ""
    date: str = ""
    assembly_id: str = ""
    doc_links: list[str] = field(default_factory=list)
    doc_types: list[str] = field(default_factory=list)

    @property
    def doc_link(self) -> str:
        return self.doc_links[0] if self.doc_links else ""


@dataclass
class IndexDocument:
    """A fetched index payload (url + bytes)."""

    url: str
    content: bytes
