// The national page's arithmetic: tenses, by-election resolution, the table's
// cut and the "not available yet" status lines, against the published files.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  NAT_DEFAULT, aggregate, aggregateStates, belowCutMessage, byeNote, compactPortfolio, memberMatches, nationalRows,
  pageList, partyMatches, regionLeader, resolveSeats, seatMaps, sortMinisters,
} from './national.ts';
import { readData } from './testData.ts';
import type { ByeDoc, Party, PcYearDoc, StateYearDoc } from './types.ts';

const pc2024 = readData<PcYearDoc>('results/ls/pc/2024.json');
const bye2024 = readData<ByeDoc>('results/ls/byel/2024.json');
const parties = new Map(readData<{ parties: Party[] }>('parties.json').parties.map(p => [p.code, p]));

// The file holds every contested seat: 542 in 2024 (Surat was returned unopposed,
// with no poll), so every count below is the file's, never a typed-in 543.
const nSeats = Object.keys(pc2024.constituencies).length;

test('2024 as elected: one seat per constituency row, every vote counted once', () => {
  const agg = aggregate(pc2024);
  const seats = [...agg.national.values()].reduce((n, t) => n + t.seats, 0);
  assert.equal(seats, nSeats);
  assert.equal(agg.national.get('BJP')?.seats, 239);
  assert.equal(agg.national.get('INC')?.seats, 99);
  const votes = [...agg.national.values()].reduce((n, t) => n + t.votes, 0);
  assert.equal(votes, agg.totalVotes);
});

test('as elected ignores by-elections; as it stands applies them and the deltas net to zero', () => {
  const elected = resolveSeats(pc2024, bye2024, 'elected');
  for (const [uid, r] of elected) assert.equal(r.p, pc2024.constituencies[uid].p);
  const stands = resolveSeats(pc2024, bye2024, 'stands');
  const { standsSeats, deltaByParty } = seatMaps(pc2024, stands);
  const held = [...standsSeats.values()].reduce((a, b) => a + b, 0);
  const unknown = [...stands.values()].filter(r => r.unknown).length;
  const vacant = [...stands.values()].filter(r => r.vacant).length;
  assert.equal(held + unknown + vacant, nSeats);
  // every seat that changed hands moves one seat from one party to another, or to a vacancy
  const net = [...deltaByParty.values()].reduce((a, b) => a + b, 0);
  assert.equal(net + vacant, 0);
});

test('a by-election with no published result leaves the seat unknown, counted for no party', () => {
  const pc: PcYearDoc = { year: 2014, constituencies: { A: { st: 'X', p: 'BJP', v: 10 }, B: { st: 'X', p: 'INC', v: 5 } } };
  const bye: ByeDoc = { seats: [{ uid: 'A', events: [{ type: 'bye', date: '2016-01-01', winner: null }] }] };
  const r = resolveSeats(pc, bye, 'stands');
  assert.deepEqual(r.get('A'), { p: null, vacant: false, unknown: true, byeCount: 1 });
  const { standsSeats, deltaByParty } = seatMaps(pc, r);
  assert.equal(standsSeats.get('BJP'), undefined);
  assert.equal(deltaByParty.size, 0, 'an unknown seat changes no party');
});

test('without a by-election file the status line says the record is not available, under either tense', () => {
  assert.equal(byeNote(2009, 'elected', null, new Map()), 'As elected · 2009 · by-election record not available yet');
  assert.equal(byeNote(2009, 'stands', null, new Map()),
    'As it stands · 2009 · by-election record not available yet, so seats show as elected');
  // only a file that lists no events can say there were none
  assert.equal(byeNote(2024, 'stands', { seats: [] }, new Map()), 'As it stands · 2024 — no by-elections on record');
});

test('the 2024 as-it-stands line counts by-elections and the latest date', () => {
  const r = resolveSeats(pc2024, bye2024, 'stands');
  assert.match(byeNote(2024, 'stands', bye2024, r), /^As it stands · \d+ by-elections? .*· \d+ vacant · as of \d{4}-\d\d-\d\d$/);
});

test('the table keeps parties that won a seat or polled half a percent, sorted by seats', () => {
  const agg = aggregate(pc2024);
  const rows = nationalRows({ agg, tense: 'elected', standsSeats: new Map(), deltaByParty: new Map(), sort: NAT_DEFAULT });
  assert.equal(rows[0].code, 'BJP');
  assert.ok(rows.every(r => r.seats > 0 || r.share >= 0.005));
  assert.ok(rows.some(r => r.code === 'BSP' && r.seats === 0), 'BSP won nothing but polled over 2%');
  const byVotes = nationalRows({ agg, tense: 'elected', standsSeats: new Map(), deltaByParty: new Map(), sort: { key: 'votes', dir: -1 } });
  for (let i = 1; i < byVotes.length; i++) assert.ok(byVotes[i - 1].votes >= byVotes[i].votes);
});

test('a party query matches code, name and alias; a party below the cut is said to be below it', () => {
  assert.ok(partyMatches('congress', 'INC', parties));
  assert.ok(partyMatches('bharatiya janata', 'BJP', parties));
  assert.ok(!partyMatches('congress', 'BJP', parties));
  assert.ok(partyMatches('', 'ANY', parties));
  const agg = aggregate(pc2024);
  const none = (code: string) => partyMatches('zzzz-no-party', code, parties);
  assert.equal(belowCutMessage(agg, 'zzzz-no-party', none), 'No party matches your search.');
  assert.match(belowCutMessage(agg, 'X', code => code === 'NOTA'), /^NOTA polled below 0\.5% and won no seats\.$/);
});

test('the 1980 state-level file aggregates to 529 seats and colours each state by its leader', () => {
  const doc = readData<StateYearDoc>('results/ls/1980.json');
  const agg = aggregateStates(doc);
  const seats = [...agg.national.values()].reduce((n, t) => n + t.seats, 0);
  assert.equal(seats, Object.values(doc.regions).reduce((n, r) => n + r.seats, 0));
  assert.equal(regionLeader(agg.byRegion.get('IN-UP')), 'INC');
  assert.equal(regionLeader(undefined), null, 'a state the file does not hold has no colour');
  assert.equal(regionLeader(new Map([['X', { seats: 0, votes: 9 }]])), null, 'votes alone lead nothing');
});

test('page numbers collapse to a window around the current page', () => {
  assert.deepEqual(pageList(0, 3), [0, 1, 2]);
  assert.deepEqual(pageList(5, 12), [0, '…', 4, 5, 6, '…', 11]);
  assert.deepEqual(pageList(0, 12), [0, 1, '…', 11]);
});

test('ministers: rank order, compact portfolio, search over name and ministry', () => {
  const sorted = sortMinisters([
    { name: 'B', rank: 'mos' }, { name: 'A', rank: 'cabinet' }, { name: 'Z', rank: 'pm' }, { name: 'C', rank: 'mos-ic' },
  ]);
  assert.deepEqual(sorted.map(m => m.name), ['Z', 'A', 'C', 'B']);
  assert.deepEqual(compactPortfolio('Minister of Home Affairs; and Minister of Cooperation'), { main: 'Home Affairs', plus: 1 });
  assert.deepEqual(compactPortfolio(''), { main: '', plus: 0 });
  assert.ok(memberMatches('railways', { name: 'X', portfolio: 'Minister of Railways' }));
  assert.ok(!memberMatches('railways', { name: 'X', portfolio: 'Minister of Defence' }));
});
