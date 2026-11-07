// The member page names a member only on evidence: the Sansad record, else the
// 2024 winner (said to be the general-election winner), else "not available
// yet" and nobody. A seat resolves through the state's own geometry, never
// through how the result file spells it.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fold, notAvailable, seatFold } from './atlas.ts';
import {
  MPLADS_MISSING, RECORD_MISSING, ageFrom, answerOf, assemblySeats, caveatText, filterQuestions, filterWorks,
  findSeat, fmtDate, fundModel, pageOf, parseQuery, recordModel, resolveMember, splitReply,
  stageKey, stageLabel, tile, winnerOf,
  type AcTopo, type DetailDoc, type MembersDoc, type MpladsDoc, type ParliamentDoc, type PcTopo,
} from './mp.ts';
import { readData } from './testData.ts';
import type { Availability } from './types.ts';

const NOW = new Date(2026, 10, 2);
const avail = readData<Availability>('availability.json');
const upPcs = readData<PcTopo>('geo/ls/IN-UP.json');
const upAcs = readData<AcTopo>('geo/ac/IN-UP.json');
const detail = readData<DetailDoc>('results/ls/detail/2024.json');
const members = readData<MembersDoc>('members/ls/2024.json');
const gorakhpurPar = readData<ParliamentDoc>('parliament/IN-UP/gorakhpur.json');
const gorakhpurMplads = readData<MpladsDoc>('mplads/IN-UP/gorakhpur.json');

function memberFor(S: string, C: string, par: ParliamentDoc | null, pcs: PcTopo | null, results: DetailDoc | null = detail) {
  const seat = findSeat(pcs, S, C);
  const key = seat?.unique_id ?? '';
  return resolveMember({
    key: C, par, seat, winner: winnerOf(results, key),
    lsMember: (key && members.members?.[key]) || null, regionName: 'Uttar Pradesh', now: NOW,
  });
}

test('the query defaults to Gorakhpur, Uttar Pradesh, and normalises case', () => {
  assert.deepEqual(parseQuery(''), { S: 'IN-UP', C: 'gorakhpur' });
  assert.deepEqual(parseQuery('?s=in-pb&c=Bhatinda'), { S: 'IN-PB', C: 'bhatinda' });
});

test('the seat key folds the way the state page links: no (SC), no trailing state abbreviation', () => {
  assert.equal(fold('Bansgaon (SC)'), 'bansgaon');
  assert.equal(seatFold('Pratapgarhup', 'IN-UP'), 'pratapgarh');
  assert.equal(seatFold('Gorakhpur', 'IN-UP'), 'gorakhpur');
});

test('a seat resolves through the state geometry, then joins the result by unique_id', () => {
  const seat = findSeat(upPcs, 'IN-UP', 'gorakhpur');
  assert.ok(seat);
  assert.equal(seat.ls_seat_name, 'Gorakhpur');
  const w = winnerOf(detail, seat.unique_id);
  assert.ok(w);
  assert.equal(w.p, 'BJP');
  // The winner is the top vote-getter of that seat, not of any other.
  const top = Math.max(...detail.constituencies[seat.unique_id].c.map(c => c.v));
  assert.equal(w.v, top);
});

test('every Uttar Pradesh seat the state page can link to resolves to a seat with a 2024 winner', () => {
  const geoms = upPcs.objects?.pcs?.geometries ?? [];
  assert.equal(geoms.length, 80);
  for (const g of geoms) {
    const key = seatFold(g.properties!.ls_seat_name, 'IN-UP');
    const seat = findSeat(upPcs, 'IN-UP', key);
    assert.equal(seat?.unique_id, g.properties!.unique_id, key);
    assert.ok(winnerOf(detail, seat!.unique_id), key);
  }
});

test('an unknown seat key resolves to nothing; there is no winner to show', () => {
  assert.equal(findSeat(upPcs, 'IN-UP', 'nowhere'), null);
  assert.equal(winnerOf(detail, ''), null);
  assert.equal(winnerOf(null, 'S24_64'), null);
});

test('with the Sansad record the page names the sitting member and their age', () => {
  const m = memberFor('IN-UP', 'gorakhpur', gorakhpurPar, upPcs);
  assert.equal(m.evidence, 'record');
  assert.equal(m.displayName, 'Ravindra Shukla Alias Ravi Kishan');
  assert.equal(m.roleLine, 'MP · Lok Sabha · Age 57');
  assert.equal(m.mpsno, '5144');
  assert.equal(m.profileURL, 'https://sansad.in/ls/members/biography/5144?locale=en');
  assert.equal(m.stateName, 'Uttar Pradesh');
});

test('without the record the page says who won the seat at the 2024 general election', () => {
  const m = memberFor('IN-UP', 'aligarh', null, upPcs);
  assert.equal(m.evidence, 'winner');
  assert.equal(m.roleLine, 'Won the seat · 2024 general election');
  assert.ok(m.name);
  assert.equal(m.constituency, 'Aligarh');
  // The Sansad member number comes from the same seat's entry in the members file.
  const key = findSeat(upPcs, 'IN-UP', 'aligarh')!.unique_id;
  assert.equal(m.mpsno, String(members.members![key].mpsno));
});

test('with neither record nor result the page names nobody and says the result is not available yet', () => {
  const m = memberFor('IN-UP', 'aligarh', null, upPcs, null);
  assert.equal(m.evidence, 'none');
  assert.equal(m.name, '');
  assert.equal(m.party, '');
  assert.equal(m.nameLine, 'Result not available yet');
  assert.equal(m.roleLine, 'Member of Parliament · Lok Sabha');
  const noGeo = memberFor('IN-XX', 'somewhere', null, null);
  assert.equal(noGeo.constituency, 'somewhere');
  assert.equal(noGeo.mpsno, '');
  assert.equal(noGeo.profileURL, 'https://sansad.in/ls/members');
});

test('age counts a birthday only once it has passed', () => {
  assert.equal(ageFrom('17-Jul-1969', new Date(2026, 6, 16)), 56);
  assert.equal(ageFrom('17-Jul-1969', new Date(2026, 6, 17)), 57);
  assert.equal(ageFrom('', NOW), '');
});

test('the caveat always credits the ECI for the result, then only the sources the page actually used', () => {
  const eci = 'Result: Election Commission of India statistical reports. ';
  assert.equal(caveatText(false, false),
    eci + 'Where a section says “not available yet”, that data has not been added.');
  assert.equal(caveatText(true, true),
    eci + 'Figures from official sources: the Lok Sabha record (sansad.in) and MPLADS (eSAKSHI portal). ' +
    'Every question and bill links to its official document. Where a section says “not available yet”, that data has not been added.');
  assert.equal(caveatText(false, true),
    eci + 'Figures from official sources: MPLADS (eSAKSHI portal). Where a section says “not available yet”, that data has not been added.');
  assert.match(caveatText(true, false), /^Result: Election Commission of India statistical reports\. Figures from official sources: the Lok Sabha record \(sansad\.in\)\. Every question and bill/);
});

test('a missing section says "not available yet" and carries no figure', () => {
  assert.equal(MPLADS_MISSING, notAvailable('this member’s MPLADS record', 'the eSAKSHI MPLADS portal'));
  assert.equal(RECORD_MISSING, notAvailable('this member’s Sansad record', 'the Lok Sabha Secretariat (sansad.in)'));
  assert.doesNotMatch(MPLADS_MISSING + RECORD_MISSING, /\d/);
});

test('optional files are fetched only for the seats availability.json lists', () => {
  assert.deepEqual(avail.parliament?.['IN-UP'], ['gorakhpur']);
  assert.ok(avail.mplads?.['IN-UP']?.includes('aligarh'));
  assert.equal(avail.parliament?.['IN-UP']?.includes('aligarh'), false);
});

test('MPLADS tiles: a count only when the tile has one; the crore string is last', () => {
  assert.deepEqual(tile(gorakhpurMplads, 'Works Recommended'), { count: '107', rupees: 101886258.78, crore: '10.19 Crore' });
  assert.deepEqual(tile(gorakhpurMplads, 'Allocated Limit for Hon\'ble MPs'), { count: null, rupees: 147000000, crore: '14.70 Crore' });
  assert.deepEqual(tile({}, 'Works Recommended'), { count: null, rupees: null, crore: '' });
});

test('MPLADS fund: the pipeline, the gauges and the bars as shares of the total recommended', () => {
  const f = fundModel(gorakhpurMplads);
  assert.deepEqual(f.steps.map(s => [s.k, s.v]), [
    ['Allocated limit', '14.70 Crore'], ['Recommended', '107'], ['Sanctioned', '9'], ['Completed', '0'], ['Expenditure', '1.54 Crore'],
  ]);
  assert.equal(f.gauges[0].pct.toFixed(1), '10.5');
  assert.equal(f.gauges[1].pct, 0);
  assert.equal(f.gauges[1].sub, '0 of 107');
  const loc = f.panels[0].rows;
  assert.equal(Math.round(loc[0].pct + loc[1].pct), 100);
  assert.equal(f.panels[2].rows[0].pct, 100);
  assert.equal(f.panels[1].rows[2].pct, 0);
  // Without a total recommended, no bar is drawn rather than a guessed one.
  assert.ok(fundModel({ charts: gorakhpurMplads.charts }).panels.every(p => p.rows.every(r => r.pct === 0)));
});

test('works: stages, filters and paging', () => {
  assert.equal(stageKey('Work partially Completed'), 'partial');
  assert.equal(stageKey('Work Completed'), 'done');
  assert.equal(stageKey('Pending for Sanction'), 'pending');
  // The original's strip is case-sensitive, so the portal's capitalised "Work" stays.
  assert.equal(stageLabel('Work partially Completed'), 'Work Partially Completed');
  assert.equal(stageLabel('work completed'), 'Completed');
  const works = gorakhpurMplads.works ?? [];
  assert.equal(filterWorks(works, 'All').length, works.length);
  assert.ok(filterWorks(works, 'Completed').every(w => /completed/i.test(w.stage ?? '')));
  assert.ok(filterWorks(works, 'Partially').every(w => stageKey(w.stage) === 'partial'));
  const p = pageOf(works, 999, 5);
  assert.equal(p.count, Math.ceil(works.length / 5));
  assert.equal(p.page, p.count - 1);
  assert.deepEqual(pageOf([], 3, 5), { page: 0, count: 1, rows: [] });
});

test('the Lok Sabha record: attendance, question counts and filters', () => {
  const r = recordModel(gorakhpurPar);
  assert.equal(r.attPct.toFixed(1), '69.2');
  assert.equal(r.attGood, false);
  assert.equal(r.starred + r.unstarred, r.questions.length);
  assert.equal(filterQuestions(r.questions, 'Starred').length, r.starred);
  assert.equal(filterQuestions(r.questions, 'Unstarred').length, r.unstarred);
  assert.equal(recordModel({}).attPct, 0);
});

test('a question date reads as a day, month and year; the letterhead is split off the answer', () => {
  assert.equal(fmtDate('12.08.2026'), '12 Aug 2026');
  assert.equal(fmtDate('2026-08-12'), '2026-08-12');
  assert.deepEqual(splitReply('MINISTER OF COAL\n(SHRI X)\n(a) Yes.\n(b) No.'), { who: 'MINISTER OF COAL (SHRI X)', body: '(a) Yes.\n(b) No.' });
  assert.equal(answerOf('MINISTER\n(SHRI X)\nShort.'), null);
  assert.equal(answerOf('MINISTER OF COAL\n(SHRI X)\n' + 'a'.repeat(50))?.label, 'Answer · Minister Of Coal (Shri X)');
});

test('assembly seats: the ones under this constituency, in seat order; unmapped is not "none"', () => {
  const seats = assemblySeats(upAcs, 'Gorakhpur')!;
  assert.equal(seats.length, 5);
  assert.ok(seats.every(s => fold(s.pc) === 'gorakhpur'));
  assert.deepEqual([...seats].sort((a, b) => (a.no ?? 0) - (b.no ?? 0)), seats);
  assert.deepEqual(assemblySeats(upAcs, 'Nowhere'), []);
  assert.equal(assemblySeats(null, 'Gorakhpur'), null);
});
