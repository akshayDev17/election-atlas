#!/usr/bin/env python3
"""Write the atlas's data files from a copy of the election-atlas D1 database.

    npx wrangler d1 export election-atlas --remote --output d1.sql
    sqlite3 d1.sqlite < d1.sql
    python3 backend/d1/export.py --db d1.sqlite --out exported

Each row of `document` becomes one file at its old path, in its old shape: the
file's own header (`document.head`) with its body rebuilt from the fact tables,
serialized in the layout it was committed in. The pages therefore read exactly the
files they read before D1 existed.

    python3 backend/d1/export.py --db d1.sqlite --out x --compare <old data dir>

also compares every exported file with the committed one: byte-identical, or
semantically identical (parsed JSON equal), or different (exit 1).
"""
import argparse
import json
import sqlite3
import sys
from collections import OrderedDict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest import FAMILY_BODY, serialize, summarize  # noqa: E402


def loads(text):
    return json.loads(text, object_pairs_hook=OrderedDict)


def candidates(con, contest_id, basis):
    return con.execute(
        'SELECT party_code, candidate, votes FROM candidacy WHERE contest_id = ? AND basis = ? ORDER BY position',
        (contest_id, basis)).fetchall()


def contests(con, term_id, general=True):
    op = '=' if general else '>'
    return con.execute(
        f'''SELECT c.id, c.label, c.extra, s.geo_uid, s.number, s.region_code
            FROM contest c JOIN seat s ON s.id = c.seat_id
            WHERE c.term_id = ? AND c.seq {op} 0 ORDER BY c.position, c.seq''', (term_id,)).fetchall()


def body_ls_rollup(con, doc):
    regions = OrderedDict()
    for code, seats, electors, extra in con.execute(
            'SELECT region_code, seats, electors, extra FROM region_tally WHERE term_id = ? ORDER BY position',
            (doc['term_id'],)):
        parties = [OrderedDict(code=p, seats=s, votes=v) for p, s, v in con.execute(
            '''SELECT party_code, seats, votes FROM region_party_tally
               WHERE term_id = ? AND region_code = ? ORDER BY position''', (doc['term_id'], code))]
        columns = dict(seats=seats, electors=electors, parties=parties)
        if extra is None:
            regions[code] = OrderedDict(columns)
        else:
            extra = loads(extra)
            regions[code] = OrderedDict((k, columns[k] if k in columns else extra[k]) for k in extra['_keys'])
    return regions


def body_ls_pc(con, doc):
    """build-ls-results.py writes the constituency files with their uids sorted."""
    out = OrderedDict()
    for cid, _label, _extra, uid, _no, region in sorted(contests(con, doc['term_id']), key=lambda r: r[3]):
        rows = candidates(con, cid, 'party')
        if rows:
            out[uid] = OrderedDict(st=region, p=rows[0][0], v=rows[0][2],
                                   o=OrderedDict((p, v) for p, _c, v in rows[1:]))
    return out


def detail_items(con, doc, key, label_key):
    out = OrderedDict()
    for cid, label, _extra, uid, number, _region in contests(con, doc['term_id']):
        rows = candidates(con, cid, 'candidate')
        if rows:
            out[uid if key == 'uid' else number] = OrderedDict(
                [(label_key, label), ('c', [OrderedDict(n=c, p=p, v=v) for p, c, v in rows])])
    return out


def body_ls_detail(con, doc):
    return detail_items(con, doc, 'uid', 'pc')


def body_ac_detail(con, doc):
    return detail_items(con, doc, 'number', 'ac')


def body_ac(con, doc):
    out = OrderedDict()
    for no, item in body_ac_detail(con, doc).items():
        s = summarize(item['c'])
        out[no] = OrderedDict(p=s['p'], v=s['v'], o=OrderedDict(s['o']))
    return out


def body_ls_byel(con, doc):
    seats = []
    for cid, _label, extra, *_ in contests(con, doc['term_id'], general=False):
        extra = loads(extra)
        if 'entry' in extra:
            seats.append(OrderedDict(list(extra['entry'].items()) + [('events', [])]))
        event = extra['event']
        cand = candidates(con, cid, 'candidate')
        if cand:
            p, n, v = cand[0]
            event['winner'] = OrderedDict(n=n, p=p, v=v, o=OrderedDict(
                (party, votes) for party, _c, votes in candidates(con, cid, 'party')))
        seats[-1]['events'].append(event)
    return seats


def body_cabinet(con, doc):
    roster = 'sworn_in' if doc['path'].endswith('-sworn-in.json') else 'as_it_stands'
    members = []
    for person, rank, portfolio, party, seat_name, extra in con.execute(
            '''SELECT person, rank, portfolio, party_code, seat_name, extra FROM minister_tenure
               WHERE ministry_id = ? AND roster = ? ORDER BY position''', (doc['ministry_id'], roster)):
        extra = loads(extra)
        columns = dict(name=person, rank=rank, portfolio=portfolio, party=party, constituency=seat_name)
        members.append(OrderedDict((k, columns[k] if k in columns else extra[k]) for k in extra['_keys']))
    return members


BODY = {'ls-rollup': body_ls_rollup, 'ls-pc': body_ls_pc, 'ls-detail': body_ls_detail,
        'ls-byel': body_ls_byel, 'ac': body_ac, 'ac-detail': body_ac_detail, 'cabinet': body_cabinet}


def export(db_path):
    """{path: bytes} for every document in the database."""
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    files = {}
    for row in con.execute('SELECT path, family, term_id, ministry_id, head, layout FROM document ORDER BY path'):
        doc = dict(row)
        head = loads(doc['head'])
        head[FAMILY_BODY[doc['family']]] = BODY[doc['family']](con, doc)
        files[doc['path']] = serialize(head, json.loads(doc['layout']))
    return files


def compare(files, old_dir, overlay=None):
    """Per-file verdict against the committed data: 'bytes', 'semantic' or 'DIFFERENT'.
    A file under `overlay` (backend/d1/inputs) is the committed one where it exists."""
    verdicts = {}
    for rel, raw in files.items():
        old = Path(old_dir) / rel
        if overlay and (Path(overlay) / rel).is_file():
            old = Path(overlay) / rel
        if not old.exists():
            verdicts[rel] = 'DIFFERENT (no committed file)'
        elif old.read_bytes() == raw:
            verdicts[rel] = 'bytes'
        elif json.loads(old.read_bytes()) == json.loads(raw):
            verdicts[rel] = 'semantic'
        else:
            verdicts[rel] = 'DIFFERENT'
    return verdicts


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--db', required=True, help='SQLite copy of the D1 database')
    ap.add_argument('--out', required=True, help='data directory to write the files into')
    ap.add_argument('--compare', help='committed data directory to compare the export against')
    ap.add_argument('--overlay', help='files here are the committed ones where they exist (backend/d1/inputs)')
    args = ap.parse_args(argv)
    files = export(args.db)
    for rel, raw in files.items():
        p = Path(args.out) / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(raw)
    print(f'exported {len(files)} files from {args.db}')
    if not args.compare:
        return 0
    verdicts = compare(files, args.compare, args.overlay)
    if args.overlay:
        over = sorted(r for r in files if (Path(args.overlay) / r).is_file())
        if over:
            print(f'compared against {args.overlay} instead: ' + ', '.join(over))
    counts = {}
    for rel, v in verdicts.items():
        counts[v] = counts.get(v, 0) + 1
        if v != 'bytes':
            print(f'  {v:10s} {rel}')
    print('semantic diff against', args.compare, counts)
    return 1 if any(v.startswith('DIFFERENT') for v in verdicts.values()) else 0


if __name__ == '__main__':
    sys.exit(main())
