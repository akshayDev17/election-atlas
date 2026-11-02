// "As it stands" adds up to the seat count; an unusable by-election card leaves
// the holder unknown rather than falling back to the general-election winner.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveSeat, tallyStands } from './stands.ts';
import { readData } from './testData.ts';
import type { ByeSeat, PcYearDoc } from './types.ts';

const general = readData<PcYearDoc>('results/ls/pc/2014.json').constituencies;
const byel = readData<{ seats: ByeSeat[] }>('results/ls/byel/2014.json').seats;

function tally(st: string) {
  const pcRows = Object.fromEntries(Object.entries(general).filter(([, c]) => c.st === st));
  const t = tallyStands(pcRows, byel.filter(s => s.st === st));
  const partySeats = [...t.seats.values()].reduce((a, b) => a + b, 0);
  return { ...t, n: Object.keys(pcRows).length, rows: partySeats + t.unknown };
}

test('West Bengal 2014 as it stands adds up to 42 with Tamluk not available', () => {
  const t = tally('IN-WB');
  assert.equal(t.n, 42);
  assert.equal(t.rows, 42);
  assert.equal(t.unknown, 1);
  assert.equal(t.seats.get('AITC'), 33);
  assert.equal(t.delta.has('AITC'), false);
});

test('Karnataka 2014 as it stands adds up to 28 with three seats not available', () => {
  const t = tally('IN-KA');
  assert.equal(t.n, 28);
  assert.equal(t.rows, 28);
  assert.equal(t.unknown, 3);
  assert.equal(t.delta.size, 0);
});

test('a later by-election with a result settles a seat an earlier unusable card left unknown', () => {
  const events = [{ type: 'bye' as const, date: '2016-11-22', winner: null },
                  { type: 'bye' as const, date: '2018-03-14', winner: { n: 'X', p: 'SP', v: 1 } }];
  assert.deepEqual(resolveSeat('BJP', events), { p: 'SP', vacant: false, unknown: false });
  assert.deepEqual(resolveSeat('BJP', events.slice(0, 1)), { p: null, vacant: false, unknown: true });
});

test('a seat whose last event is a vacancy is vacant, held by no party', () => {
  assert.deepEqual(resolveSeat('INC', [{ type: 'vacated', date: '2024-01-01', reason: 'Resignation' }]),
    { p: null, vacant: true, unknown: false });
  assert.deepEqual(resolveSeat('INC', []), { p: 'INC', vacant: false, unknown: false });
});
