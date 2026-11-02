#!/usr/bin/env python3
"""Turn the atlas's published JSON into SQL for the election-atlas D1 database.

    python3 backend/d1/ingest.py --data <atlas data dir> --day 1 --out day1.sql
    python3 backend/d1/ingest.py --data <atlas data dir> --day 2 --out day2.sql
    python3 backend/d1/ingest.py --data <atlas data dir> --day all --out all.sql

The input is the data directory of the github.io repository at a pinned commit
(work/election-atlas/data): the JSON the pages read today. The free D1 plan allows
100,000 rows written per day, so the first import is split:

    day 1  assembly results (results/ac), councils of ministers (cabinet),
           Lok Sabha by-elections (results/ls/byel)
    day 2  Lok Sabha general elections (results/ls/{year}, pc/, detail/)

Every document passes tools/validate_records.py before any SQL is written; one
violation refuses the whole run. The Lok Sabha files that predate the harvest
schema carry no sha256 in their own `source` block; their sources come from
backend/d1/ls-sources.json: the files re-fetched from the Election Commission on
2026-11-02 that rebuild them byte for byte. A Lok Sabha file with neither its own
sha256 nor a reproduced registry entry is not imported (see --list-static).

A file under backend/d1/inputs/ replaces the pinned data file at the same path:
the Lok Sabha 1980-2004 state files, rebuilt after the move, are imported from there.

Row ids are 48-bit hashes of natural keys, so rows shared by both days (sources,
parties, regions, terms, seats) are written with INSERT OR IGNORE and get the same
id whichever day writes them first.
"""
import argparse
import hashlib
import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
sys.path.insert(0, str(REPO / 'tools'))
from validate_records import validate  # noqa: E402

LS_SOURCES = HERE / 'ls-sources.json'
INPUTS = HERE / 'inputs'
SHA256 = re.compile(r'^[0-9a-f]{64}$')
DELIMITATION = 2008
STATEMENT_BYTES = 90_000          # D1 caps one SQL statement at 100 KB

FAMILY_BODY = {
    'ls-rollup': 'regions', 'ls-pc': 'constituencies', 'ls-detail': 'constituencies',
    'ls-byel': 'seats', 'ac': 'constituencies', 'ac-detail': 'constituencies',
    'cabinet': 'members',
}
DAY_OF_FAMILY = {'ac': 1, 'ac-detail': 1, 'cabinet': 1, 'ls-byel': 1,
                 'ls-rollup': 2, 'ls-pc': 2, 'ls-detail': 2}
LS_LEGACY = ('ls-rollup', 'ls-pc', 'ls-detail')


def rid(*key):
    """A stable 48-bit row id for a natural key."""
    h = hashlib.sha256('\x1f'.join(map(str, key)).encode()).digest()
    return int.from_bytes(h[:6], 'big')


def family_of(rel):
    if rel.startswith('cabinet/'):
        return 'cabinet'
    if rel.startswith('results/ac/'):
        return 'ac-detail' if rel.endswith('-detail.json') else 'ac'
    if rel.startswith('results/ls/byel/'):
        return 'ls-byel'
    if rel.startswith('results/ls/pc/'):
        return 'ls-pc'
    if rel.startswith('results/ls/detail/'):
        return 'ls-detail'
    if re.fullmatch(r'results/ls/\d{4}\.json', rel):
        return 'ls-rollup'
    return None


def load_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'), object_pairs_hook=OrderedDict)


class Inputs:
    """The import's input files: the pinned atlas data directory, with any file under
    the overlay directory (backend/d1/inputs) replacing the one at the same path."""

    def __init__(self, data_dir, overlay=None):
        self.data_dir = Path(data_dir)
        self.overlay = Path(overlay) if overlay and Path(overlay).is_dir() else None

    def path(self, rel):
        if self.overlay is not None and (self.overlay / rel).is_file():
            return self.overlay / rel
        return self.data_dir / rel

    def json_files(self):
        rels = {p.relative_to(self.data_dir).as_posix() for p in self.data_dir.rglob('*.json')}
        if self.overlay is not None:
            rels |= {p.relative_to(self.overlay).as_posix() for p in self.overlay.rglob('*.json')}
        return sorted(rels)

    def overlaid(self):
        return [] if self.overlay is None else sorted(
            p.relative_to(self.overlay).as_posix() for p in self.overlay.rglob('*.json'))


def uses_registry(rel, doc):
    """A Lok Sabha file built before the harvest schema names its source without a
    sha256; its verified sources come from backend/d1/ls-sources.json instead."""
    src = doc.get('source') if isinstance(doc, dict) else None
    return family_of(rel) in LS_LEGACY and not (isinstance(src, dict) and SHA256.match(src.get('sha256') or ''))


def d1_documents(inputs, registry, skip=()):
    """{rel path: doc} for every file D1 holds (less `skip`), and the files left static."""
    docs, static = OrderedDict(), []
    for rel in inputs.json_files():
        fam = family_of(rel)
        if fam is None or rel in skip:
            continue
        doc = load_json(inputs.path(rel))
        if uses_registry(rel, doc) and not registry_sources(registry, rel):
            static.append(rel)
            continue
        docs[rel] = doc
    return docs, static


def registry_sources(registry, rel):
    entry = registry.get(rel) or {}
    if entry.get('reproduced') not in ('bytes', 'semantic'):
        return []
    return entry.get('sources') or []


def doc_sources(rel, doc, registry):
    """The ordered source blocks a document stands on (position 0 is its primary)."""
    if uses_registry(rel, doc):
        return [{k: s[k] for k in ('publisher', 'url', 'sha256', 'fetched_at')}
                for s in registry_sources(registry, rel)]
    blocks = [doc['source']] + list(doc.get('sources') or [])
    return [{k: b.get(k) for k in ('publisher', 'url', 'sha256', 'fetched_at')} for b in blocks]


def validate_all(docs, registry):
    """tools/validate_records.py over every document; for a legacy Lok Sabha file the
    record checked is its own metadata plus the registry's sources."""
    report = []
    for rel, doc in docs.items():
        if uses_registry(rel, doc):
            srcs = doc_sources(rel, doc, registry)
            record = {k: v for k, v in doc.items() if k not in ('source', FAMILY_BODY[family_of(rel)])}
            record.update(source=srcs[0], sources=srcs[1:])
            problems = validate(record, None, [])
        else:
            problems = validate(doc, None, [])
        report += [f'{rel}: {p}' for p in problems]
    if report:
        raise SystemExit('validate_records: refusing to import\n  ' + '\n  '.join(report))


# ── the model: every row of every table, tagged with the day that writes it ─────

class Model:
    SHARED = ('source', 'region', 'party', 'house', 'term', 'seat')

    def __init__(self, inputs):
        self.rows = OrderedDict((t, OrderedDict()) for t in (
            'source', 'region', 'party', 'house', 'term', 'seat', 'ministry', 'document',
            'document_source', 'region_tally', 'region_party_tally', 'contest', 'candidacy',
            'seat_holding', 'minister_tenure'))
        self.day = {}                 # (table, key) -> first day that needs the row
        self.byel_events = []         # (term, seat, event, winner, contest, day)
        regions = load_json(inputs.path('regions.json'))['regions']
        self.region_info = {r['code']: r for r in regions}
        parties = load_json(inputs.path('parties.json'))
        self.party_info = {p['code']: p for p in parties['parties']}

    def put(self, table, key, row, day, shared=False):
        """Add a row; a shared row keeps its first values and the earliest day."""
        rows = self.rows[table]
        if key in rows:
            if not shared:
                raise SystemExit(f'duplicate {table} row {key}')
            self.day[(table, key)] = min(self.day[(table, key)], day)
            return rows[key]
        rows[key] = row
        self.day[(table, key)] = day
        return row

    def source(self, block, day):
        sid = rid('source', block['url'], block['sha256'])
        self.put('source', sid, dict(id=sid, **block), day, shared=True)
        return sid

    def region(self, code, day):
        if code == 'IN':
            row = dict(code='IN', name='India', kind='nation')
        else:
            info = self.region_info.get(code)
            if info is None:
                raise SystemExit(f'region {code!r} is not in data/regions.json')
            row = dict(code=code, name=info['name'], kind=info['type'])
        self.put('region', code, row, day, shared=True)
        return code

    def party(self, code, day):
        info = self.party_info.get(code)
        row = dict(code=code, name=info and info.get('name'), colour=info and info.get('colour'),
                   in_registry=1 if info else 0)
        self.put('party', code, row, day, shared=True)
        return code

    def house(self, house_id, day):
        kind, _, region = house_id.partition(':')
        self.region(region or 'IN', day)
        self.put('house', house_id, dict(id=house_id, kind=kind, region_code=region or 'IN'), day, shared=True)
        return house_id

    def term(self, house_id, year, label, source_id, day):
        self.house(house_id, day)
        tid = rid('term', house_id, year)
        row = self.put('term', tid, dict(id=tid, house_id=house_id, election_year=year, label=label,
                                          source_id=source_id), day, shared=True)
        if row['label'] is None and label:
            row['label'] = label
        return tid

    def seat(self, house_id, region, number, name, geo_uid, day):
        self.region(region, day)
        self.house(house_id, day)
        sid = rid('seat', house_id, region, number, DELIMITATION)
        self.put('seat', sid, dict(id=sid, house_id=house_id, region_code=region, number=str(number),
                                   name=name, geo_uid=geo_uid, delimitation=DELIMITATION), day, shared=True)
        return sid

    def contest(self, term_id, seat_id, seq, position, source_id, day, label=None, held_on=None,
                reason=None, extra=None):
        cid = rid('contest', term_id, seat_id, seq)
        rows = self.rows['contest']
        if cid in rows:                       # pc and detail files share one contest
            row = rows[cid]
            if label and not row['label']:
                row['label'] = label
            return cid
        self.put('contest', cid, dict(id=cid, term_id=term_id, seat_id=seat_id, seq=seq, position=position,
                                      label=label, held_on=held_on, reason=reason, uncontested=0,
                                      extra=None if extra is None else json.dumps(extra, ensure_ascii=False),
                                      source_id=source_id), day)
        return cid

    def candidacy(self, contest_id, basis, position, party, votes, day, candidate=''):
        self.party(party, day)
        self.put('candidacy', (contest_id, basis, position),
                 dict(contest_id=contest_id, basis=basis, position=position, party_code=party,
                      candidate=candidate, votes=votes), day)


def ls_seat_ids(model, rel, cons, day, label_key=None):
    """{uid: seat id} for a Lok Sabha constituency body keyed by geo uid (S24_1)."""
    ids = {}
    for uid, item in cons.items():
        m = re.fullmatch(r'[SU](\d+)_(\d+)', uid)
        if not m:
            raise SystemExit(f'{rel}: constituency key {uid!r} is not a geo uid')
        region = item.get('st') or model.uid_region.get(uid)
        if region is None:
            raise SystemExit(f'{rel}: no state for {uid}')
        ids[uid] = model.seat('ls', region, m.group(2), item.get(label_key) if label_key else None, uid, day)
    return ids


def build(inputs, registry, skip=()):
    docs, static = d1_documents(inputs, registry, skip)
    validate_all(docs, registry)
    model = Model(inputs)
    # the state of each Lok Sabha seat, for the detail files, which are keyed by uid only
    model.uid_region = {}
    for rel in inputs.json_files():
        if rel.startswith('results/ls/pc/'):
            model.uid_region.update({u: c['st'] for u, c in load_json(inputs.path(rel))['constituencies'].items()})

    # day order, then path: the first document to need a shared row decides its values
    ordered = sorted(docs.items(), key=lambda kv: (DAY_OF_FAMILY[family_of(kv[0])], kv[0]))
    general_holders = {}                  # (term, seat) -> holding row of the general winner
    for rel, doc in ordered:
        fam = family_of(rel)
        day = DAY_OF_FAMILY[fam]
        srcs = doc_sources(rel, doc, registry)
        src_ids = [model.source(s, day) for s in srcs]
        primary = src_ids[0]
        body_key = FAMILY_BODY[fam]
        head = OrderedDict((k, (None if k == body_key else v)) for k, v in doc.items())
        term_id = ministry_id = None
        body = doc[body_key]

        if fam in ('ac', 'ac-detail'):
            region = doc['region']
            house = f'vs:{region}'
            term_id = model.term(house, doc['year'], None, primary, day)
            if fam == 'ac-detail':
                for pos, (no, item) in enumerate(body.items()):
                    seat_id = model.seat(house, region, no, item['ac'], no, day)
                    cid = model.contest(term_id, seat_id, 0, pos, primary, day, label=item['ac'])
                    for i, c in enumerate(item['c']):
                        model.candidacy(cid, 'candidate', i, c['p'], c['v'], day, candidate=c['n'])
                    w = max(item['c'], key=lambda c: c['v'])
                    general_holders[(term_id, seat_id)] = holding(model, seat_id, term_id, w['n'], w['p'],
                                                                  'general', None, cid, day)
            else:
                check_ac_summary(rel, doc, inputs.path(rel.replace('.json', '-detail.json')))

        elif fam == 'ls-rollup':
            term_id = model.term('ls', doc['year'], None, primary, day)
            for pos, (code, reg) in enumerate(body.items()):
                model.region(code, day)
                more = OrderedDict((k, v) for k, v in reg.items() if k not in ('seats', 'electors', 'parties'))
                extra = None if not more else json.dumps(
                    OrderedDict([('_keys', list(reg))] + list(more.items())), ensure_ascii=False)
                model.put('region_tally', (term_id, code), dict(
                    term_id=term_id, region_code=code, position=pos, seats=reg['seats'],
                    electors=reg['electors'], extra=extra, source_id=primary), day)
                for i, p in enumerate(reg['parties']):
                    model.party(p['code'], day)
                    model.put('region_party_tally', (term_id, code, i), dict(
                        term_id=term_id, region_code=code, position=i, party_code=p['code'],
                        seats=p['seats'], votes=p['votes'], source_id=primary), day)

        elif fam in ('ls-pc', 'ls-detail'):
            term_id = model.term('ls', doc['year'], None, primary, day)
            seats = ls_seat_ids(model, rel, body, day, 'pc' if fam == 'ls-detail' else None)
            for pos, (uid, item) in enumerate(body.items()):
                cid = model.contest(term_id, seats[uid], 0, pos, primary, day,
                                    label=item.get('pc') if fam == 'ls-detail' else None)
                if fam == 'ls-pc':
                    model.candidacy(cid, 'party', 0, item['p'], item['v'], day)
                    for i, (party, votes) in enumerate(item['o'].items(), 1):
                        model.candidacy(cid, 'party', i, party, votes, day)
                    h = general_holders.get((term_id, seats[uid]))
                    if h is None:
                        general_holders[(term_id, seats[uid])] = holding(
                            model, seats[uid], term_id, '', item['p'], 'general', None, cid, day)
                    else:
                        h['party_code'] = model.party(item['p'], day)
                else:
                    for i, c in enumerate(item['c']):
                        model.candidacy(cid, 'candidate', i, c['p'], c['v'], day, candidate=c['n'])
                    w = max(item['c'], key=lambda c: c['v'])
                    h = general_holders.get((term_id, seats[uid]))
                    if h is None:
                        general_holders[(term_id, seats[uid])] = holding(
                            model, seats[uid], term_id, w['n'], w['p'], 'general', None, cid, day)
                    else:
                        h['member'] = w['n']

        elif fam == 'ls-byel':
            term_id = model.term('ls', doc['cycle'], doc.get('term'), primary, day)
            pos = 0
            for entry in body:
                region = entry['st']
                seat_id = model.seat('ls', region, entry['seat'], entry['pc'], entry['uid'], day)
                for k, ev in enumerate(entry['events']):
                    extra = OrderedDict()
                    if k == 0:
                        extra['entry'] = OrderedDict((a, b) for a, b in entry.items() if a != 'events')
                    extra['event'] = OrderedDict((a, (None if a == 'winner' else b)) for a, b in ev.items())
                    src = ev.get('src')
                    source_id = src_ids[1 + src] if isinstance(src, int) and 0 <= src < len(src_ids) - 1 else primary
                    cid = model.contest(term_id, seat_id, k + 1, pos, source_id, day, label=entry['pc'],
                                        held_on=ev.get('date'), reason=ev.get('reason'), extra=extra)
                    pos += 1
                    win = ev.get('winner')
                    if win:
                        model.candidacy(cid, 'candidate', 0, win['p'], win['v'], day, candidate=win['n'])
                        for i, (party, votes) in enumerate(win['o'].items(), 1):
                            model.candidacy(cid, 'party', i, party, votes, day)
                    model.byel_events.append((term_id, seat_id, ev, win, cid, day))

        elif fam == 'cabinet':
            scope = doc['scope']
            region = model.region(doc.get('region') or 'IN', day)
            house = 'ls' if scope == 'union' else f'vs:{region}'
            tid = rid('term', house, doc['cycle'])
            mid = rid('ministry', scope, region, doc['cycle'])
            row = model.put('ministry', mid, dict(
                id=mid, scope=scope, region_code=region, cycle=doc['cycle'],
                term_id=tid, sworn_in=doc.get('swornIn'), ended=None, source_id=primary), day, shared=True)
            if row['sworn_in'] is None and doc.get('swornIn'):
                row['sworn_in'] = doc['swornIn']
            ministry_id = mid
            roster = 'sworn_in' if rel.endswith('-sworn-in.json') else 'as_it_stands'
            for i, m in enumerate(body):
                src = m.get('src')
                source_id = src_ids[1 + src] if isinstance(src, int) and 0 <= src < len(src_ids) - 1 else primary
                party = m.get('party')
                if party is not None:
                    model.party(party, day)
                extra = OrderedDict([('_keys', list(m))])
                extra.update((k, v) for k, v in m.items()
                             if k not in ('name', 'rank', 'portfolio', 'party', 'constituency'))
                tenure_id = rid('tenure', mid, roster, i)
                model.put('minister_tenure', tenure_id, dict(
                    id=tenure_id, ministry_id=mid, roster=roster, position=i, person=m['name'],
                    rank=m['rank'], portfolio=m.get('portfolio'), party_code=party,
                    seat_name=m.get('constituency'),
                    from_date=doc.get('swornIn') if roster == 'sworn_in' else None,
                    to_date=None, ended_by=None, extra=json.dumps(extra, ensure_ascii=False),
                    source_id=source_id), day)

        model.put('document', rel, dict(path=rel, family=fam, term_id=term_id, ministry_id=ministry_id,
                                        head=json.dumps(head, ensure_ascii=False),
                                        layout=json.dumps(layout_of(inputs.path(rel), doc)),
                                        source_id=primary), day)
        for i, s in enumerate(src_ids):
            model.put('document_source', (rel, i), dict(path=rel, position=i, source_id=s), day)

    apply_byelections(model, general_holders)
    # a ministry's term exists only if some document created it
    for row in model.rows['ministry'].values():
        if row['term_id'] not in model.rows['term']:
            row['term_id'] = None
    return model, static



def holding(model, seat_id, term_id, member, party, began_by, from_date, contest_id, day):
    hid = rid('holding', seat_id, term_id, began_by, from_date or '', contest_id)
    model.party(party, day)
    return model.put('seat_holding', hid, dict(
        id=hid, seat_id=seat_id, term_id=term_id, member=member, party_code=party, began_by=began_by,
        from_date=from_date, to_date=None, ended_by=None, contest_id=contest_id), day)


ENDED_BY = (('death', 'death'), ('died', 'death'), ('resign', 'resignation'), ('disqualif', 'disqualification'))


def apply_byelections(model, general_holders):
    """A by-election closes the seat's current holding and, when the winner is
    published, opens the next one."""
    current = dict(general_holders)
    for term_id, seat_id, ev, win, cid, day in sorted(model.byel_events, key=lambda e: e[2].get('date') or ''):
        why = (ev.get('reason') or '').lower()
        prev = current.get((term_id, seat_id))
        if prev is not None and prev['to_date'] is None:
            prev['to_date'] = ev.get('date')
            prev['ended_by'] = next((v for k, v in ENDED_BY if k in why), 'other')
        if win:
            current[(term_id, seat_id)] = holding(model, seat_id, term_id, win['n'], win['p'], 'bye',
                                                  ev.get('date'), cid, day)


LAYOUTS = [dict(indent=i, ascii=a, newline=n) for i in (None, 1, 2) for a in (False, True) for n in (True, False)]


def serialize(doc, layout):
    """The bytes of a data file in one of the layouts the atlas's tools write."""
    if layout['indent'] is None:
        text = json.dumps(doc, ensure_ascii=layout['ascii'], separators=(',', ':'))
    else:
        text = json.dumps(doc, ensure_ascii=layout['ascii'], indent=layout['indent'])
    return (text + ('\n' if layout['newline'] else '')).encode('utf-8')


def layout_of(path, doc):
    """The layout that reproduces the committed file byte for byte (compact if none does;
    the export is then only semantically equal, which the deploy gate reports)."""
    raw = Path(path).read_bytes()
    for layout in LAYOUTS:
        if serialize(doc, layout) == raw:
            return layout
    return dict(indent=None, ascii=False, newline=True, exact=False)


def check_ac_summary(rel, doc, detail_path):
    """An assembly summary file is exported from its detail file's candidacies; refuse
    to import one that would not come back identical."""
    detail = load_json(detail_path)
    if set(detail['constituencies']) != set(doc['constituencies']):
        raise SystemExit(f'{rel}: constituencies differ from {detail_path.name}')
    for no, item in detail['constituencies'].items():
        if summarize(item['c']) != dict(doc['constituencies'][no]):
            raise SystemExit(f'{rel}: constituency {no} is not the summary of its candidates')


def summarize(cands):
    """{p, v, o}: the winner's party and votes, and every other candidate's votes
    summed by party, in candidate order."""
    w = max(range(len(cands)), key=lambda i: cands[i]['v'])
    o = OrderedDict()
    for i, c in enumerate(cands):
        if i != w:
            o[c['p']] = o.get(c['p'], 0) + c['v']
    return {'p': cands[w]['p'], 'v': cands[w]['v'], 'o': dict(o)}


# ── SQL ────────────────────────────────────────────────────────────────────────

COLUMNS = {
    'source': ('id', 'publisher', 'url', 'sha256', 'fetched_at'),
    'region': ('code', 'name', 'kind'),
    'party': ('code', 'name', 'colour', 'in_registry'),
    'house': ('id', 'kind', 'region_code'),
    'term': ('id', 'house_id', 'election_year', 'label', 'source_id'),
    'seat': ('id', 'house_id', 'region_code', 'number', 'name', 'geo_uid', 'delimitation'),
    'ministry': ('id', 'scope', 'region_code', 'cycle', 'term_id', 'sworn_in', 'ended', 'source_id'),
    'document': ('path', 'family', 'term_id', 'ministry_id', 'head', 'layout', 'source_id'),
    'document_source': ('path', 'position', 'source_id'),
    'region_tally': ('term_id', 'region_code', 'position', 'seats', 'electors', 'extra', 'source_id'),
    'region_party_tally': ('term_id', 'region_code', 'position', 'party_code', 'seats', 'votes', 'source_id'),
    'contest': ('id', 'term_id', 'seat_id', 'seq', 'position', 'label', 'held_on', 'reason', 'uncontested',
                'extra', 'source_id'),
    'candidacy': ('contest_id', 'basis', 'position', 'party_code', 'candidate', 'votes'),
    'seat_holding': ('id', 'seat_id', 'term_id', 'member', 'party_code', 'began_by', 'from_date', 'to_date',
                     'ended_by', 'contest_id'),
    'minister_tenure': ('id', 'ministry_id', 'roster', 'position', 'person', 'rank', 'portfolio', 'party_code',
                        'seat_name', 'from_date', 'to_date', 'ended_by', 'extra', 'source_id'),
}
# insert order respects foreign keys
ORDER = ('source', 'region', 'party', 'house', 'term', 'seat', 'ministry', 'document', 'document_source',
         'region_tally', 'region_party_tally', 'contest', 'candidacy', 'seat_holding', 'minister_tenure')
SHARED_TABLES = ('source', 'region', 'party', 'house', 'term', 'seat', 'ministry')


def lit(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return str(int(v))
    if isinstance(v, int):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def rows_for_day(model, table, day):
    """A day writes its own rows, and every shared row its rows depend on.
    Shared rows are written by the earliest day that needs them, and again (ignored
    if present) by any later day, so a day never depends on another having run."""
    return [r for k, r in model.rows[table].items()
            if day == 'all' or model.day[(table, k)] == day
            or (table in SHARED_TABLES and needed_on(model, table, k, day))]


def needed_on(model, table, key, day):
    return key in model.needed.get((table, day), ())


def compute_needed(model):
    """Shared rows referenced by each day's own rows (so a later day re-asserts them)."""
    needed = {}

    def need(table, key, day):
        needed.setdefault((table, day), set()).add(key)

    for table in ORDER:
        for k, r in model.rows[table].items():
            day = model.day[(table, k)]
            for col, ref in (('source_id', 'source'), ('party_code', 'party'), ('region_code', 'region'),
                             ('house_id', 'house'), ('term_id', 'term'), ('seat_id', 'seat'),
                             ('ministry_id', 'ministry')):
                if r.get(col) is not None:
                    need(ref, r[col], day)
    # closure: terms need sources and houses, seats need houses and regions, …
    for _ in range(3):
        for (table, day), keys in list(needed.items()):
            for k in list(keys):
                r = model.rows[table].get(k)
                if r is None:
                    continue
                for col, ref in (('source_id', 'source'), ('region_code', 'region'), ('house_id', 'house'),
                                 ('term_id', 'term')):
                    if r.get(col) is not None:
                        need(ref, r[col], day)
    model.needed = needed


def to_sql(model, day):
    compute_needed(model)
    out = [f'-- election-atlas D1 import, day {day}; generated by backend/d1/ingest.py']
    counts = {}
    for table in ORDER:
        rows = rows_for_day(model, table, day)
        counts[table] = len(rows)
        if not rows:
            continue
        cols = COLUMNS[table]
        verb = 'INSERT OR IGNORE' if table in SHARED_TABLES else 'INSERT'
        prefix = f'{verb} INTO {table} ({", ".join(cols)}) VALUES\n'
        chunk, size = [], len(prefix)
        for r in rows:
            values = '(' + ', '.join(lit(r[c]) for c in cols) + ')'
            if chunk and size + len(values) + 2 > STATEMENT_BYTES:
                out.append(prefix + ',\n'.join(chunk) + ';')
                chunk, size = [], len(prefix)
            chunk.append(values)
            size += len(values) + 2
        out.append(prefix + ',\n'.join(chunk) + ';')
    return '\n'.join(out) + '\n', counts


SECONDARY_INDEXES = {'source': 1, 'term': 1, 'seat': 1, 'contest': 1, 'seat_holding': 1, 'ministry': 1,
                     'minister_tenure': 1}


def estimate_rows_written(counts):
    """rows x (1 + secondary indexes): D1's documented counting rule."""
    return sum(n * (1 + SECONDARY_INDEXES.get(t, 0)) for t, n in counts.items())


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--data', required=True, help='the atlas data directory (work/election-atlas/data)')
    ap.add_argument('--day', choices=('1', '2', 'all'), help='which import day to emit')
    ap.add_argument('--out', help='write the SQL here')
    ap.add_argument('--registry', default=str(LS_SOURCES))
    ap.add_argument('--inputs', default=str(INPUTS),
                    help='files here replace the data directory\'s at the same path (default backend/d1/inputs)')
    ap.add_argument('--years', help='comma-separated election years: import only those years\' documents '
                    '(e.g. 2024,2014 to fit a day\'s write allowance); others are left for a later run')
    ap.add_argument('--max-rows', type=int, help='refuse (exit 1, no SQL written) if the estimated rows written '
                    'exceed this, e.g. what is left of the free plan\'s 100,000 a day')
    ap.add_argument('--skip-present', help='a file of document paths already in D1 (one per line); '
                    'they and their rows are left out')
    ap.add_argument('--list-static', action='store_true',
                    help='print the Lok Sabha files the registry does not cover (kept as static files)')
    args = ap.parse_args(argv)
    registry = load_json(args.registry) if Path(args.registry).exists() else {}
    skip = set()
    if args.skip_present:
        skip = {l.strip() for l in Path(args.skip_present).read_text(encoding='utf-8').splitlines() if l.strip()}
    inputs = Inputs(args.data, args.inputs)
    if args.years:
        wanted = {y.strip() for y in args.years.split(',') if y.strip()}
        skip |= {rel for rel in inputs.json_files()
                 if family_of(rel) and not set(re.findall(r'(?<!\d)(\d{4})(?!\d)', rel)) & wanted}
    model, static = build(inputs, registry, skip)
    if args.list_static:
        print('\n'.join(static))
        return 0
    if not args.day or not args.out:
        ap.error('--day and --out are required unless --list-static')
    day = args.day if args.day == 'all' else int(args.day)
    sql, counts = to_sql(model, day)
    estimate = estimate_rows_written(counts)
    if args.max_rows is not None and estimate > args.max_rows:
        for t, n in counts.items():
            print(f'{t:20s} {n:7d}')
        raise SystemExit(f'refusing: an estimated {estimate} rows written exceeds --max-rows {args.max_rows}')
    Path(args.out).write_text(sql, encoding='utf-8')
    for t, n in counts.items():
        print(f'{t:20s} {n:7d}')
    if skip:
        print(f'left out, already in D1: {len(skip)} documents')
    if inputs.overlaid():
        print('read from ' + str(inputs.overlay) + ' instead of the data directory:')
        print('\n'.join('  ' + r for r in inputs.overlaid()))
    print(f'estimated rows written (rows x (1 + secondary indexes)): {estimate_rows_written(counts)}')
    if static:
        print('not imported (no verified source yet; served as committed static files):')
        print('\n'.join('  ' + s for s in static))
    return 0


if __name__ == '__main__':
    sys.exit(main())
