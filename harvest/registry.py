"""The source registry: which publishers may enter the atlas, one file per country.

Each country keeps `countries/<CC>/sources.json`. Its `publishers` list is the
allow-list every gate reads: harvest/validate.py (inside the harvesters and the
import) and tools/check_provenance.py (over the export and over D1). A record's
source must name one of these publisher ids and an https URL whose host is one
of the publisher's hosts or a subdomain of one.

    from harvest.registry import publishers, host_of_publisher

Adding a publisher is an edit to its country's registry plus a migration that
mirrors it into D1; `check_provenance.py --db` fails while the two differ.
"""
import json
from pathlib import Path
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parents[1]
COUNTRIES = REPO / "countries"
PUBLISHER_KEYS = ("id", "name", "hosts", "licence", "licence_url", "licence_checked")


def registries(countries_dir=COUNTRIES) -> dict:
    """{country code: its sources.json}, for every country that has one."""
    out = {}
    for path in sorted(Path(countries_dir).glob("*/sources.json")):
        doc = json.loads(path.read_text(encoding="utf-8"))
        out[path.parent.name] = doc
    return out


def publishers(countries_dir=COUNTRIES) -> dict:
    """{publisher id: publisher entry}, across every country's registry.

    A publisher id names one publisher in the whole atlas, so the same id in two
    registries is an error, and so is an entry missing one of PUBLISHER_KEYS or
    naming a host with a scheme, a path or upper-case letters."""
    out = {}
    for country, doc in registries(countries_dir).items():
        for entry in doc.get("publishers") or []:
            missing = [k for k in PUBLISHER_KEYS if k not in entry]
            if missing:
                raise ValueError(f"countries/{country}/sources.json: publisher {entry.get('id')!r} "
                                 f"lacks {', '.join(missing)}")
            pid = entry["id"]
            if pid in out:
                raise ValueError(f"publisher id {pid!r} is in both {out[pid]['country']} and {country}")
            hosts = entry["hosts"]
            if not hosts or any(h != h.lower() or "/" in h or ":" in h for h in hosts):
                raise ValueError(f"countries/{country}/sources.json: publisher {pid!r} hosts must be "
                                 f"bare lower-case host names, got {hosts!r}")
            out[pid] = dict(entry, country=country)
    return out


def host_matches(host: str, hosts) -> bool:
    """A host matches a registry host when it is that host or a subdomain of it."""
    host = (host or "").lower()
    return any(host == h or host.endswith("." + h) for h in hosts)


def host_of_publisher(publisher: str, url: str, registry: dict) -> bool:
    """True when `url` is https on one of `publisher`'s hosts (or a subdomain)."""
    entry = registry.get(publisher)
    if not entry:
        return False
    u = urlparse(url or "")
    return u.scheme == "https" and host_matches(u.hostname, entry["hosts"])


def host_of_any_publisher(url: str, registry: dict) -> bool:
    """True when `url` is https on some registered publisher's host (or a subdomain)."""
    u = urlparse(url or "")
    return u.scheme == "https" and any(host_matches(u.hostname, e["hosts"]) for e in registry.values())
