#!/usr/bin/env python3
"""Derive the /elections country list from a copy of the election-atlas D1 database.

    python3 backend/d1/countries.py --db d1.sqlite --site dist --out countries.json

A country is listed only when both hold:

  * D1 has its published national result: a `region` of kind 'nation' whose
    national house ('ls') has a general election with a published constituency
    file (family 'ls-pc') or region roll-up ('ls-rollup'); every such row is
    provenance 'published' with a source, by D1's CHECK constraints, and the
    deploy runs the provenance gate over D1 before anything ships;
  * its country page exists in the assembled site: <site>/elections/<slug>/index.html.

Nothing else decides which countries show: there is no hand-kept list. The
figures are read the way the atlas's own export reads them (export.py), so the
card says what the country page says: seats are the constituencies each party
won at the general election, and a vote share is the party's votes over every
vote polled (NOTA included), as the national page derives them.

The output is a build artifact, sorted A to Z by name, that the page builder
(frontend/landing/build.mjs) renders. It carries D1's facts only; the pictures
and search aliases are the builder's own assets.
"""
import argparse
import json
import re
import sqlite3
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export import body_ls_pc, body_ls_rollup, loads  # noqa: E402

# A house kind's name on a card. D1's national house kind is 'ls' (CHECK on house.kind).
HOUSE_NAME = {'ls': 'Lok Sabha'}
RESULT_FAMILIES = ('ls-pc', 'ls-rollup')


def slug_of(name):
    """'India' -> 'india', 'United Kingdom' -> 'united-kingdom', 'Côte d'Ivoire' -> 'cote-d-ivoire'."""
    ascii_name = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', ascii_name.lower()).strip('-')


def nations(con):
    return con.execute("SELECT code, name FROM region WHERE kind = 'nation' ORDER BY code").fetchall()


def national_elections(con, code):
    """Each general election of the nation's national house that has a published result
    file, newest first: (house kind, term id, year, label, document row)."""
    rows = con.execute(
        f'''SELECT h.kind, t.id, t.election_year, t.label, d.path, d.family, d.head, d.source_id
            FROM house h
            JOIN term t ON t.house_id = h.id AND t.provenance = 'published' AND t.source_id IS NOT NULL
            JOIN document d ON d.term_id = t.id AND d.provenance = 'published' AND d.source_id IS NOT NULL
            WHERE h.region_code = ? AND h.kind = 'ls'
              AND d.family IN ({",".join("?" * len(RESULT_FAMILIES))})
            ORDER BY t.election_year DESC''', (code, *RESULT_FAMILIES)).fetchall()
    by_term = {}
    for kind, term_id, year, label, path, family, head, source_id in rows:
        docs = by_term.setdefault(term_id, {'kind': kind, 'term_id': term_id, 'year': year, 'label': label, 'docs': {}})
        docs['docs'][family] = {'path': path, 'family': family, 'term_id': term_id, 'head': head, 'source_id': source_id}
    return sorted(by_term.values(), key=lambda e: -e['year'])


def tallies_from_pc(con, doc):
    """Seats won and votes per party, the seat winners and the seat count, from the
    constituency file: the national page's aggregate()."""
    seats = body_ls_pc(con, doc)
    party = {}
    winners = {}
    for uid, c in seats.items():
        t = party.setdefault(c['p'], [0, 0])
        t[0] += 1
        t[1] += c['v']
        winners[uid] = c['p']
        for code, votes in c['o'].items():
            party.setdefault(code, [0, 0])[1] += votes
    return party, len(seats), winners


def tallies_from_rollup(con, doc):
    """The same from the region roll-up, the only result for an election whose
    boundaries predate the atlas geometry: the national page's aggregateStates()."""
    party = {}
    total = 0
    for region in body_ls_rollup(con, doc).values():
        total += region['seats']
        for p in region['parties']:
            t = party.setdefault(p['code'], [0, 0])
            t[0] += p['seats']
            t[1] += p['votes']
    return party, total, None


def headline(con, party, total, n=2):
    """The top `n` parties by seats (most votes breaks a tie), as the national page ranks them."""
    votes_polled = sum(v for _s, v in party.values())
    ranked = sorted(((code, s, v) for code, (s, v) in party.items() if s > 0), key=lambda r: (-r[1], -r[2], r[0]))[:n]
    top = []
    for code, s, v in ranked:
        row = con.execute('SELECT name, colour FROM party WHERE code = ?', (code,)).fetchone()
        top.append({
            'code': code,
            'name': row[0] if row and row[0] else code,
            'colour': row[1] if row else None,
            'seats': s,
            'votes': v,
            'share': round(100 * v / votes_polled, 1) if votes_polled else None,
        })
    return {'total': total, 'votesPolled': votes_polled, 'top': top}


def source_of(con, doc):
    url, publisher = con.execute('SELECT url, publisher FROM source WHERE id = ?', (doc['source_id'],)).fetchone()
    head_source = loads(doc['head']).get('source') or {}
    name = head_source.get('publisher') if isinstance(head_source.get('publisher'), str) else None
    return {'publisher': name or publisher, 'url': url}


def colours_of(con, codes):
    return {code: colour for code, colour in con.execute(
        f'SELECT code, colour FROM party WHERE code IN ({",".join("?" * len(codes))})', sorted(codes))} if codes else {}


def country(con, code, name):
    """The country's latest published national result, or None when D1 holds none."""
    elections = national_elections(con, code)
    if not elections:
        return None
    latest = elections[0]
    if 'ls-pc' in latest['docs']:
        doc = latest['docs']['ls-pc']
        party, total, winners = tallies_from_pc(con, doc)
    else:
        doc = latest['docs']['ls-rollup']
        party, total, winners = tallies_from_rollup(con, doc)
    if total <= 0:
        return None
    out = {
        'code': code,
        'name': name,
        'slug': slug_of(name),
        'election': {
            'year': latest['year'],
            'label': latest['label'],
            'house': HOUSE_NAME[latest['kind']],
            'unit': 'seats',
            **headline(con, party, total),
            'source': source_of(con, doc),
        },
        'history': {'elections': len(elections), 'first': elections[-1]['year']},
        'seats': None,
    }
    if winners:
        out['seats'] = {'winners': winners, 'colours': colours_of(con, set(winners.values()))}
    return out


def page_exists(site, slug):
    return (Path(site) / 'elections' / slug / 'index.html').is_file()


def derive(db_path, site):
    """(listed countries A to Z, [(code, why) for each nation D1 holds that is not listed])."""
    con = sqlite3.connect(db_path)
    listed, skipped = [], []
    for code, name in nations(con):
        c = country(con, code, name)
        if c is None:
            skipped.append((code, 'no published national result in D1'))
        elif not page_exists(site, c['slug']):
            skipped.append((code, f'no country page at /elections/{c["slug"]}/'))
        else:
            listed.append(c)
    listed.sort(key=lambda c: (unicodedata.normalize('NFKD', c['name']).casefold(), c['code']))
    return listed, skipped


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--db', required=True, help='SQLite copy of the D1 database')
    ap.add_argument('--site', required=True, help='the assembled site (backend/build_site.py --out)')
    ap.add_argument('--out', required=True, help='where to write the derived country list (JSON)')
    args = ap.parse_args(argv)
    listed, skipped = derive(args.db, args.site)
    for code, why in skipped:
        print(f'countries: {code} not listed: {why}')
    if not listed:
        print('countries: D1 holds no country with a published national result and a country page')
        return 1
    Path(args.out).write_text(json.dumps(listed, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'countries: {len(listed)} listed ({", ".join(c["name"] for c in listed)}) -> {args.out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
