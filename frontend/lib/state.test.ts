// The state page's decisions: which file a Lok Sabha year is drawn from, the two
// tenses with their by-elections and unknown holders, the seat tables, and the
// "not available yet" sentences that stand in for absent data.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CMO_UP, acCycles, parentsOf, seatFold } from './atlas.ts';
import { regionLeader } from './national.ts';
import {
  DEFAULT_SORT, acCardRows, aggregateFrom, aggregateStateLevel, beltAsOf, beltVoidText, cabinetPublisher,
  cycleAvailable, firstLsYear, latestCycle, lsVoid, lsYearKind, missingCaption, mpKeysByName, pageCountOf,
  pcCaption, pcCardRows, resolvePcSeats, seatPaint, seatsByParty, standsAvailable, tableRows,
  tenseAfterLoad, unknownSeatsText, type AcYearDoc, type DetailDoc,
} from './state.ts';
import { readData } from './testData.ts';
import type { Availability, ByeSeat, Manifest, PcYearDoc, RegionsDoc, StateYearDoc } from './types.ts';

type PcTopo = { objects: { pcs: { geometries: { properties: { unique_id: string; ls_seat_code: string | number } }[] } } };

const avail = readData<Availability>('availability.json');
const parents = parentsOf(readData<RegionsDoc>('regions.json').regions);
const manifest = readData<Manifest>('manifest.json');

const uidToSeatOf = (st: string) => new Map(readData<PcTopo>(`geo/ls/${st}.json`).objects.pcs.geometries
  .map(g => [g.properties.unique_id, String(g.properties.ls_seat_code)]));
const pcRowsOf = (year: number, st: string) => Object.fromEntries(
  Object.entries(readData<PcYearDoc>(`results/ls/pc/${year}.json`).constituencies).filter(([, c]) => c.st === st));
const byeSeatsOf = (year: number, st: string) =>
  (readData<{ seats: ByeSeat[] }>(`results/ls/byel/${year}.json`).seats).filter(s => s.st === st);

test('the strip lists every Lok Sabha year; 1980-2004 are state-level, 2009 on constituency-level', () => {
  const years = manifest.elections.ls.years;
  assert.deepEqual(years, [1980, 1984, 1989, 1991, 1996, 2004, 2009, 2014, 2019, 2024]);
  for (const y of [1980, 1984, 1989, 1991, 1996, 2004]) assert.equal(lsYearKind(avail, y), 'state', String(y));
  for (const y of [2009, 2014, 2019, 2024]) assert.equal(lsYearKind(avail, y), 'pc', String(y));
  assert.equal(lsYearKind(avail, 1977), 'missing');
  assert.equal(lsYearKind({}, 2024), 'missing', 'an unreadable index makes every year not available');
});

test('a year carried from the India map is honoured only when the strip has it', () => {
  const years = manifest.elections.ls.years;
  assert.equal(firstLsYear(years, 1980), 1980);
  assert.equal(firstLsYear(years, 1977), 2024);
  assert.equal(firstLsYear(years, 0), 2024);
});

test('Uttar Pradesh 1980 state-level: what the file holds, the seats adding up to 85', () => {
  const doc = readData<StateYearDoc>('results/ls/1980.json');
  const up = aggregateStateLevel(doc, 'IN-UP', parents);
  assert.ok(up);
  assert.equal(up.seats, 85);
  assert.equal(up.partOf, null);
  assert.deepEqual(up.includes, ['IN-UT'], 'the 1980 entry covers present-day Uttarakhand');
  assert.equal([...up.agg.m.values()].reduce((n, t) => n + t.seats, 0), 85);
  assert.equal(up.agg.total, doc.regions['IN-UP'].parties.reduce((n, p) => n + p.votes, 0));
  assert.equal(regionLeader(up.agg.m), 'INC');
  const rows = tableRows(up.agg, DEFAULT_SORT, null);
  assert.equal(rows[0].code, 'INC');
  assert.ok(rows.every(r => r.seats > 0 || r.votes > 0));
});

test('a state the state-level file holds no entry for, nor for a state it was part of, gets no figures at all', () => {
  const doc: StateYearDoc = { year: 1980, regions: { 'IN-UP': { seats: 85, electors: null, parties: [] } } };
  assert.equal(aggregateStateLevel(doc, 'IN-TG', parents), null);
  assert.equal(aggregateStateLevel(doc, 'IN-KL', parents), null);
  assert.equal(regionLeader(undefined), null);
});

test('the empty Lok Sabha panel: not available yet only when the year’s file is not in the data', () => {
  const base = { regionName: 'Assam', year: 1989, seatCount: 14 };
  assert.deepEqual(lsVoid({ ...base, fileRead: true }), {
    caption: '14 seats · no result for this year',
    text: 'No 1989 Lok Sabha result for Assam in the Election Commission of India report for this election.',
  });
  assert.deepEqual(lsVoid({ ...base, fileRead: false }), {
    caption: '14 seats · not available yet',
    text: 'Not available yet — Assam 1989 Lok Sabha results have not been added from the Election Commission of India.',
  });
});

test('Assam 1989 and Ladakh/Jammu and Kashmir 1991: in the report’s file, with no entry, so no result rather than not added', () => {
  const y1989 = readData<StateYearDoc>('results/ls/1989.json');
  assert.equal(lsYearKind(avail, 1989), 'state');
  assert.equal(aggregateStateLevel(y1989, 'IN-AS', parents), null);
  const y1991 = readData<StateYearDoc>('results/ls/1991.json');
  assert.equal(lsYearKind(avail, 1991), 'state');
  assert.equal(aggregateStateLevel(y1991, 'IN-JK', parents), null);
  assert.equal(aggregateStateLevel(y1991, 'IN-LA', parents), null, 'Ladakh reads Jammu and Kashmir, which has no 1991 entry');
  assert.equal(lsVoid({ regionName: 'Ladakh', year: 1991, seatCount: 1, fileRead: true }).text,
    'No 1991 Lok Sabha result for Ladakh in the Election Commission of India report for this election.');
});

const SPLITS = [['IN-TG', 'IN-AP'], ['IN-UT', 'IN-UP'], ['IN-CT', 'IN-MP'], ['IN-JH', 'IN-BR']] as const;
const STATE_LEVEL = ' · state-level result: this election’s constituency boundaries predate the atlas map';

test('1980: Telangana, Uttarakhand, Chhattisgarh and Jharkhand read the entry of the state they were part of', () => {
  const doc = readData<StateYearDoc>('results/ls/1980.json');
  for (const [successor, parent] of SPLITS) {
    assert.equal(doc.regions[successor], undefined, `${successor} has no 1980 entry of its own`);
    const own = aggregateStateLevel(doc, successor, parents);
    const whole = aggregateStateLevel(doc, parent, parents);
    assert.ok(own && whole, successor);
    assert.equal(own.partOf, parent);
    assert.deepEqual(own.includes, []);
    assert.equal(own.seats, doc.regions[parent].seats);
    assert.equal(regionLeader(own.agg.m), regionLeader(whole.agg.m), `${successor} takes ${parent}'s fill`);
    assert.equal(whole.partOf, null);
    assert.ok(whole.includes.includes(successor), `${parent} 1980 includes present-day ${successor}`);
  }
  const tg = aggregateStateLevel(doc, 'IN-TG', parents)!;
  const ap = aggregateStateLevel(doc, 'IN-AP', parents)!;
  assert.equal(ap.seats, 42);
  const caption = { kind: 'state' as const, tense: 'elected' as const, byeKnown: false, byeSeats: [] };
  assert.equal(pcCaption({ ...caption, seats: tg.seats, regionName: 'Telangana', partOf: 'Andhra Pradesh', includes: [] }),
    '42 seats across Andhra Pradesh' + STATE_LEVEL);
  assert.equal(pcCaption({ ...caption, seats: ap.seats, regionName: 'Andhra Pradesh', partOf: null, includes: ['Telangana'] }),
    '42 seats, including present-day Telangana' + STATE_LEVEL);
});

test('after each split a state reads its own entry and its parent no longer includes it', () => {
  const y2004 = readData<StateYearDoc>('results/ls/2004.json');
  for (const [successor, parent] of SPLITS.filter(([s]) => s !== 'IN-TG')) {
    const own = aggregateStateLevel(y2004, successor, parents);
    assert.ok(own, successor);
    assert.equal(own.partOf, null, `${successor} has its own 2004 entry`);
    assert.equal(own.seats, y2004.regions[successor].seats);
    assert.ok(!aggregateStateLevel(y2004, parent, parents)!.includes.includes(successor));
  }
  assert.equal(aggregateStateLevel(y2004, 'IN-TG', parents)?.partOf, 'IN-AP', 'Telangana was still part of Andhra Pradesh in 2004');
  const y2019 = readData<StateYearDoc>('results/ls/2019.json');
  const tg = aggregateStateLevel(y2019, 'IN-TG', parents);
  assert.ok(tg);
  assert.equal(tg.partOf, null);
  assert.equal(tg.seats, y2019.regions['IN-TG'].seats);
  assert.deepEqual(aggregateStateLevel(y2019, 'IN-AP', parents)?.includes, []);
});

test('as elected, the 2024 Uttar Pradesh table adds up to its 80 seats', () => {
  const rows = pcRowsOf(2024, 'IN-UP');
  const agg = aggregateFrom(rows);
  const t = tableRows(agg, DEFAULT_SORT, null);
  assert.equal(t.reduce((n, r) => n + r.seats, 0), 80);
  assert.ok(Math.abs(t.reduce((n, r) => n + r.share, 0) - 1) < 1e-9);
  for (let i = 1; i < t.length; i++) assert.ok(t[i - 1].seats >= t[i].seats);
  const byVotesAsc = tableRows(agg, { key: 'votes', dir: 1 }, null);
  for (let i = 1; i < byVotesAsc.length; i++) assert.ok(byVotesAsc[i - 1].votes <= byVotesAsc[i].votes);
});

test('West Bengal 2014: as elected every seat shows its general winner; as it stands Tamluk is unknown', () => {
  const pcRows = pcRowsOf(2014, 'IN-WB'), uidToSeat = uidToSeatOf('IN-WB'), byes = byeSeatsOf(2014, 'IN-WB');
  const elected = resolvePcSeats(pcRows, uidToSeat, byes, 'elected');
  assert.equal(elected.stands, null);
  assert.equal(elected.resolved.size, 42);
  const tamlukE = elected.resolved.get('30');
  assert.ok(tamlukE);
  assert.equal(tamlukE.p, 'AITC');
  assert.equal(tamlukE.byeCount, 1, 'the events are carried under either tense, for the card');

  const stands = resolvePcSeats(pcRows, uidToSeat, byes, 'stands');
  assert.ok(stands.stands);
  const tamluk = stands.resolved.get('30');
  assert.ok(tamluk);
  assert.equal(tamluk.p, null);
  assert.equal(tamluk.unknown, true);
  assert.equal(stands.stands.unknown, 1);
  const t = tableRows(aggregateFrom(pcRows), DEFAULT_SORT, stands.stands);
  assert.equal(t.reduce((n, r) => n + r.seats, 0) + stands.stands.unknown, 42);
  assert.equal(unknownSeatsText(1), '1 seat: by-election result not available yet');
  assert.equal(unknownSeatsText(3), '3 seats: by-election result not available yet');
});

test('Uttar Pradesh 2014 as it stands: the by-election changes show as deltas', () => {
  const pcRows = pcRowsOf(2014, 'IN-UP');
  const { stands } = resolvePcSeats(pcRows, uidToSeatOf('IN-UP'), byeSeatsOf(2014, 'IN-UP'), 'stands');
  assert.ok(stands);
  const t = tableRows(aggregateFrom(pcRows), DEFAULT_SORT, stands);
  const bjp = t.find(r => r.code === 'BJP'), rld = t.find(r => r.code === 'RLD');
  assert.ok(bjp && rld);
  assert.equal(bjp.delta, -3, 'Kairana, Phulpur and Gorakhpur went to other parties');
  assert.equal(rld.delta, 1);
  assert.equal(t.reduce((n, r) => n + r.seats, 0), 80);
});

test('the Lok Sabha caption: a by-election count only from a record that exists', () => {
  const base = { kind: 'pc' as const, seats: 80, regionName: 'Uttar Pradesh', partOf: null, includes: [] };
  const byes = byeSeatsOf(2014, 'IN-UP');
  assert.equal(pcCaption({ ...base, tense: 'elected', byeKnown: true, byeSeats: byes }), '80 seats');
  assert.equal(pcCaption({ ...base, tense: 'stands', byeKnown: false, byeSeats: [] }),
    '80 seats · by-election record not available yet, so seats show as elected');
  assert.equal(pcCaption({ ...base, tense: 'stands', byeKnown: true, byeSeats: byes }),
    '80 seats · as it stands · 4 by-elections in Uttar Pradesh');
  assert.equal(pcCaption({ ...base, tense: 'stands', byeKnown: true, byeSeats: [] }),
    '80 seats · as it stands · none in Uttar Pradesh');
  assert.equal(pcCaption({ ...base, kind: 'state', seats: 85, tense: 'elected', byeKnown: false, byeSeats: [] }),
    '85 seats · state-level result: this election’s constituency boundaries predate the atlas map');
  assert.equal(missingCaption(80), '80 seats · not available yet');
});

test('"As it stands" is available from a by-election record or the cycle\'s current council', () => {
  assert.equal(standsAvailable(avail, 'IN-OD', 2024, 2024), true, 'the 2024 by-election record');
  assert.equal(standsAvailable(avail, 'IN-OD', 2009, 2019), false, 'neither record');
  assert.equal(standsAvailable(avail, 'IN-UP', 2009, 2022), true, 'the UP 2022 council as it stands');
  assert.equal(standsAvailable(avail, 'IN-UP', 1980, null), false);
  assert.equal(standsAvailable(avail, 'IN-AP', null, null), false);
});

test('a tense asked for in the URL is withdrawn only once both panels have loaded with nothing for it', () => {
  assert.equal(tenseAfterLoad('stands', false, false), 'stands');
  assert.equal(tenseAfterLoad('stands', true, false), 'elected');
  assert.equal(tenseAfterLoad('stands', true, true), 'stands');
  assert.equal(tenseAfterLoad('elected', true, true), 'elected');
});

test('assembly cycles: the latest added is shown first; a cycle not added stays listed', () => {
  const up = acCycles(avail, 'IN-UP');
  assert.deepEqual(up.map(c => c.year), [2012, 2017, 2022]);
  assert.equal(latestCycle(up), 2022);
  assert.equal(cycleAvailable(up, 2012), false);
  assert.equal(cycleAvailable(up, 2017), true);
  assert.equal(latestCycle([{ year: 2013, ok: false }, { year: 2018, ok: false }]), 2018);
  assert.equal(latestCycle([]), undefined);
  assert.deepEqual(acCycles(avail, 'IN-AP'), []);
});

test('the hover card rows are keyed as the map is, and never borrow another seat\'s', () => {
  const det = readData<DetailDoc>('results/ac/IN-OD/2019-detail.json');
  const od = readData<AcYearDoc>('results/ac/IN-OD/2019.json');
  const rows = acCardRows(det, new Set(['96', '97']));
  assert.deepEqual([...rows.keys()], ['97']);
  assert.ok(od.no_result && '96' in od.no_result);
  const pc = pcCardRows(readData<DetailDoc>('results/ls/detail/2024.json'), uidToSeatOf('IN-UP'));
  assert.equal(pc.size, 80);
  assert.equal(pcCardRows(null, uidToSeatOf('IN-UP')).size, 0, 'a year without detail: cards without candidates');
});

test('seat paint: vacancy grey, ground for no party or a party left out, marks only as it stands', () => {
  const colour = (c: string) => `#${c}`;
  const none = new Set<string>();
  const r = { p: 'BJP', vacant: false, unknown: false, byeCount: 1, events: [] };
  assert.deepEqual(seatPaint('BJP', r, 'elected', none, colour), { fill: '#BJP', bye: false, vacant: false });
  assert.deepEqual(seatPaint('BJP', r, 'stands', none, colour), { fill: '#BJP', bye: true, vacant: false });
  assert.deepEqual(seatPaint('BJP', r, 'stands', new Set(['INC']), colour), { fill: 'var(--paper-2)', bye: true, vacant: false });
  assert.deepEqual(seatPaint(null, { ...r, p: null, unknown: true }, 'stands', none, colour).fill, 'var(--paper-2)');
  assert.deepEqual(seatPaint(null, { ...r, p: null, vacant: true }, 'stands', none, colour), { fill: 'var(--vacant)', bye: false, vacant: true });
  assert.equal(seatPaint(undefined, null, 'elected', none, colour).fill, 'var(--paper-2)');
});

test('party seats for row focus skip seats with no known holder', () => {
  assert.deepEqual([...seatsByParty(new Map([['1', 'BJP'], ['2', null], ['3', 'BJP'], ['4', 'SP']]))],
    [['BJP', ['1', '3']], ['SP', ['4']]]);
});

test('the MPLADS join: seat names keyed as the fetcher keys them', () => {
  assert.equal(seatFold('HAMIRPURUP', 'IN-UP'), 'hamirpur');
  assert.equal(seatFold('Bhadohi', 'IN-UP'), 'bhadohi');
  assert.equal(seatFold('Nagina (SC)', 'IN-UP'), 'nagina');
  const idx = readData<{ mps: { constituency: string; constituency_key: string }[] }>('mplads/IN-UP/index.json');
  const m = mpKeysByName(idx, 'IN-UP');
  assert.equal(m.get(seatFold('Agra', 'IN-UP')), 'agra');
  assert.equal(mpKeysByName(null, 'IN-UP').size, 0);
});

test('the council of ministers: "not available yet" names the roster and its publisher', () => {
  assert.equal(cabinetPublisher('IN-UP', 'Uttar Pradesh', CMO_UP), CMO_UP);
  assert.equal(cabinetPublisher('IN-OD', 'Odisha', CMO_UP), 'the Government of Odisha');
  assert.equal(beltVoidText('Uttar Pradesh', 'elected', 2022, CMO_UP),
    'Not available yet — the Uttar Pradesh council of ministers as sworn in for the 2022 assembly has not been added from the Chief Minister’s Office, Uttar Pradesh.');
  assert.match(beltVoidText('Odisha', 'stands', 2024, 'the Government of Odisha'), /as it stands for the 2024 assembly/);
  assert.equal(beltAsOf('stands', { fetchedAt: '2026-11-01' }), 'as it stands · fetched 2026-11-01');
  assert.equal(beltAsOf('elected', { swornIn: '2022-03-25' }), 'as sworn in · 2022-03-25');
});

test('paging: at least one page, ten rows a page', () => {
  assert.equal(pageCountOf(0), 1);
  assert.equal(pageCountOf(10), 1);
  assert.equal(pageCountOf(11), 2);
});

test('a one-seat state reads "1 seat", never "1 seats"', () => {
  const one = { kind: 'pc' as const, seats: 1, regionName: 'Sikkim', partOf: null, includes: [] };
  assert.equal(pcCaption({ ...one, tense: 'elected', byeKnown: true, byeSeats: [] }), '1 seat');
  assert.equal(missingCaption(1), '1 seat · not available yet');
  assert.equal(missingCaption(2), '2 seats · not available yet');
});
