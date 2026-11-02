// A seat's hover card shows only that seat. Patkura (Odisha 2019, AC 96) has no
// result in the ECI report (countermanded); hovering it after its neighbour
// Kendrapara must show Patkura's own card, never Kendrapara's numbers.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NO_RESULT_NOTE, VACANT_NOTE, cardModel, type Candidate, type CardSeat } from './card.ts';
import { readData } from './testData.ts';

type AcYear = { no_result?: Record<string, string> };
type AcDetail = { constituencies: Record<string, { c: Candidate[] }> };
type AcTopo = { objects: { acs: { geometries: { properties: { no: number; ac: string } }[] } } };

const colourFile = readData<AcYear>('results/ac/IN-OD/2019.json');
const detail = readData<AcDetail>('results/ac/IN-OD/2019-detail.json').constituencies;
const acName = new Map(readData<AcTopo>('geo/ac/IN-OD.json').objects.acs.geometries
  .map(g => [String(g.properties.no), g.properties.ac]));

// What the page's card holds after hovering `key`.
const hover = (key: string) => cardModel({
  which: 'ac', key, name: acName.get(key) || '',
  cands: detail[key]?.c, r: null, tense: 'elected',
  acMissing: false, noResult: key in (colourFile.no_result || {}),
});

const seat = (over: Partial<CardSeat>): CardSeat => ({
  which: 'pc', key: '1', name: 'X', cands: undefined, r: null, tense: 'elected',
  acMissing: false, noResult: false, ...over,
});

test('Patkura is in the 2019 file\'s no_result and has no candidate detail', () => {
  assert.ok('96' in (colourFile.no_result || {}));
  assert.equal(detail['96'], undefined);
});

test('hovering Patkura after Kendrapara shows Patkura\'s own card, never Kendrapara\'s numbers', () => {
  const kendrapara = hover('97');
  assert.ok(kendrapara.show);
  assert.equal(kendrapara.head.kind, 'result');
  assert.match(kendrapara.head.name, /KENDRAPARA/);

  const patkura = hover('96');
  assert.ok(patkura.show, 'Patkura must have its own card');
  assert.deepEqual(patkura.head, {
    kind: 'noResult', sub: 'Assembly constituency 96', name: acName.get('96'), note: NO_RESULT_NOTE,
  });
  assert.match(patkura.head.name, /PATKURA/);
  assert.equal(NO_RESULT_NOTE, 'Result not available yet (countermanded or not in this report)');
  const text = JSON.stringify(patkura);
  assert.doesNotMatch(text, /KENDRAPARA/);
  for (const c of detail['97'].c) {
    assert.ok(!text.includes(c.n), `Patkura's card names Kendrapara's candidate ${c.n}`);
    assert.ok(!text.includes(String(c.v)), `Patkura's card shows Kendrapara's figure ${c.v}`);
  }
});

test('a seat with nothing to show gives no card, so the page hides it', () => {
  assert.deepEqual(cardModel(seat({ which: 'ac', name: 'X' })), { show: false });
});

test('a seat with candidates lists six and folds the rest into "+N more"', () => {
  const cands = Array.from({ length: 9 }, (_, i) => ({ n: `C${i}`, p: `P${i}`, v: 100 - i * 10 }));
  const m = cardModel(seat({ cands }));
  assert.ok(m.show && m.head.kind === 'result');
  const total = cands.reduce((n, c) => n + c.v, 0);
  assert.equal(m.head.candidates, 9);
  assert.equal(m.head.polled, total);
  assert.equal(m.head.rows.length, 6);
  assert.equal(m.head.sub, 'Lok Sabha constituency');
  assert.deepEqual(m.head.winner, { n: 'C0', p: 'P0' });
  assert.deepEqual(m.head.more, { count: 3, v: 40 + 30 + 20, share: 90 / total });
});

test('a cycle not added shows the seat name and nothing that reads as a result', () => {
  const m = cardModel(seat({ which: 'ac', name: 'Behat', acMissing: true }));
  assert.deepEqual(m, { show: true, head: { kind: 'acMissing', sub: 'Assembly constituency', name: 'Behat' }, foot: { kind: 'none' } });
});

test('a Lok Sabha seat without candidate detail says so, and shows its by-elections only as it stands', () => {
  const events = [{ type: 'bye' as const, date: '2020-11-10', winner: { n: 'Sunil Kumar', p: 'JDU', v: 403360 }, turnout: 61.36 }];
  const r = { p: 'JDU', vacant: false, unknown: false, byeCount: 1, events };
  const elected = cardModel(seat({ r }));
  assert.ok(elected.show);
  assert.equal(elected.head.kind, 'noDetail');
  assert.deepEqual(elected.foot, { kind: 'none' });
  const stands = cardModel(seat({ r, tense: 'stands' }));
  assert.ok(stands.show);
  assert.deepEqual(stands.foot, {
    kind: 'byes', rows: [{ kind: 'won', date: '2020-11-10', n: 'Sunil Kumar', p: 'JDU', v: 403360, turnout: 61.36 }],
  });
});

test('an unusable by-election card reads "not available yet", never the general-election winner', () => {
  const events = [{ type: 'bye' as const, date: '2016-11-22', winner: null }];
  const m = cardModel(seat({ r: { p: null, vacant: false, unknown: true, byeCount: 1, events }, tense: 'stands' }));
  assert.ok(m.show);
  assert.deepEqual(m.foot, { kind: 'byes', rows: [{ kind: 'unknown', date: '2016-11-22' }] });
});

test('a vacant seat as it stands says it is vacant', () => {
  const events = [{ type: 'vacated' as const, date: '2024-06-01', reason: 'Resignation' }];
  const r = { p: null, vacant: true, unknown: false, byeCount: 0, events };
  const m = cardModel(seat({ r, tense: 'stands' }));
  assert.ok(m.show);
  assert.deepEqual(m.foot, { kind: 'vacant', note: VACANT_NOTE });
});
