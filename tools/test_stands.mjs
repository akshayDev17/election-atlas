// The state page's "as it stands" tally must add up to the state's seat count.
//     node --test tools/test_stands.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveSeat, tallyStands } from '../state/stands.js';

const read = p => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const general = read('results/ls/pc/2014.json').constituencies;
const byel = read('results/ls/byel/2014.json').seats;

function tally(st) {
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
  const events = [{ type: 'bye', date: '2016-11-22', winner: null },
                  { type: 'bye', date: '2018-03-14', winner: { p: 'SP' } }];
  assert.deepEqual(resolveSeat('BJP', events), { p: 'SP', vacant: false, unknown: false });
  assert.deepEqual(resolveSeat('BJP', events.slice(0, 1)), { p: null, vacant: false, unknown: true });
});
