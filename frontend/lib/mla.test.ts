// The MLA page shows the latest added assembly cycle's result for one seat, or
// the "not available yet" sentence when no added cycle carries it: never a
// name, a number or a zero standing in for a missing result.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { acCycles, fold } from './atlas.ts';
import {
  findSeat, formatMargin, heroOf, isMapped, parentSeat, partyLook, readQuery, resultMissing, shownCycle,
  stateNameOf, type AcDetailDoc, type AcTopoDoc, type CoverageDoc,
} from './mla.ts';
import { readData } from './testData.ts';
import type { Availability, PartiesDoc, RegionsDoc, SymbolsDoc } from './types.ts';

const avail = readData<Availability>('availability.json');
const regions = readData<RegionsDoc>('regions.json');
const coverage = readData<CoverageDoc>('geo/ac/coverage.json');
const upTopo = readData<AcTopoDoc>('geo/ac/IN-UP.json');

test('the query: state upper-cased and defaulting to Uttar Pradesh, seat key lower-cased', () => {
  assert.deepEqual(readQuery('?s=in-br&c=Agiaon'), { state: 'IN-BR', seat: 'agiaon' });
  assert.deepEqual(readQuery(''), { state: 'IN-UP', seat: '' });
});

test('a seat key drops reservation marks and punctuation', () => {
  assert.equal(fold('Rampur Maniharan(SC)'), 'rampurmaniharan');
  assert.equal(fold('SAHARANPUR'), 'saharanpur');
  assert.equal(fold(undefined), '');
});

test('the hero shows the latest cycle whose result has been added', () => {
  const cycles = acCycles(avail, 'IN-UP');
  assert.deepEqual(cycles.map(c => c.year), [2012, 2017, 2022]);
  assert.equal(shownCycle(cycles), 2022);
  assert.equal(shownCycle([{ year: 2017, ok: true }, { year: 2022, ok: false }]), 2017);
  assert.equal(shownCycle([{ year: 2012, ok: false }]), null);
  assert.equal(shownCycle([]), null);
});

test('only a state in coverage.json is looked up in assembly geometry', () => {
  assert.equal(isMapped(coverage, 'IN-UP'), true);
  assert.equal(isMapped(coverage, 'IN-MH'), false);
  assert.equal(isMapped(null, 'IN-UP'), false);
});

test('a seat resolves by its key to its name, number and parent Lok Sabha seat', () => {
  assert.deepEqual(findSeat(upTopo, 'behat'), { name: 'Behat', no: '1', pc: 'SAHARANPUR' });
  assert.deepEqual(findSeat(upTopo, 'rampurmaniharan'), { name: 'Rampur Maniharan(SC)', no: '6', pc: 'SAHARANPUR' });
});

test('an unknown seat keeps its key as the name, with no number and no parent', () => {
  assert.deepEqual(findSeat(upTopo, 'nosuchseat'), { name: 'nosuchseat', no: '', pc: '' });
  assert.deepEqual(findSeat(null, 'behat'), { name: 'behat', no: '', pc: '' });
});

test('Behat 2022: winner, margin over the runner-up as a share of all votes, candidates', () => {
  const detail = readData<AcDetailDoc>('results/ac/IN-UP/2022-detail.json');
  const hero = heroOf({ detail, seatNo: '1', shownYear: 2022, cycles: acCycles(avail, 'IN-UP'), stateName: 'Uttar Pradesh' });
  assert.equal(hero.kind, 'result');
  if (hero.kind !== 'result') return;
  assert.equal(hero.year, 2022);
  assert.equal(hero.winner.n, 'Umar Ali Khan');
  assert.equal(hero.winner.p, 'SP');
  assert.equal(hero.winner.v, 134513);
  assert.equal(hero.candidates, 9);
  assert.equal(formatMargin(hero.marginPct), '+13.5%');
});

test('every mapped seat in every covered state has a result in its shown cycle', () => {
  for (const state of Object.keys(coverage.checked ?? {})) {
    const cycles = acCycles(avail, state);
    const year = shownCycle(cycles);
    assert.ok(year, `${state} has an added cycle`);
    const detail = readData<AcDetailDoc>(`results/ac/${state}/${year}-detail.json`);
    const topo = readData<AcTopoDoc>(`geo/ac/${state}.json`);
    for (const g of topo.objects?.acs?.geometries ?? []) {
      const seat = findSeat(topo, fold(g.properties.ac));
      const hero = heroOf({ detail, seatNo: seat.no, shownYear: year, cycles, stateName: state });
      assert.equal(hero.kind, 'result', `${state} ${g.properties.ac}`);
    }
  }
});

test('a lone candidate wins by no margin rather than an invented one', () => {
  const detail: AcDetailDoc = { constituencies: { 7: { c: [{ n: 'A B', p: 'X', v: 100 }] } } };
  const hero = heroOf({ detail, seatNo: '7', shownYear: 2022, cycles: [], stateName: 'S' });
  assert.equal(hero.kind === 'result' && formatMargin(hero.marginPct), '+0.0%');
});

test('no result for the seat: the sentence names the latest cycle and the state, and holds no other figure', () => {
  const cycles = acCycles(avail, 'IN-UP');
  const detail = readData<AcDetailDoc>('results/ac/IN-UP/2022-detail.json');
  const hero = heroOf({ detail, seatNo: '', shownYear: 2022, cycles, stateName: 'Uttar Pradesh' });
  assert.deepEqual(hero, {
    kind: 'missing',
    message: 'Not available yet — the 2022 Uttar Pradesh assembly result for this seat has not been added from the Election Commission of India.',
  });
  assert.doesNotMatch(hero.kind === 'missing' ? hero.message.replace('2022', '') : '', /\d/);
});

test('no added cycle at all: the latest listed cycle is named', () => {
  const cycles = [{ year: 2012, ok: false }, { year: 2017, ok: false }];
  const hero = heroOf({ detail: null, seatNo: '1', shownYear: shownCycle(cycles), cycles, stateName: 'Uttar Pradesh' });
  assert.equal(hero.kind === 'missing' && hero.message,
    'Not available yet — the 2017 Uttar Pradesh assembly result for this seat has not been added from the Election Commission of India.');
});

test('a state with no assembly cycles on record: the sentence names no year', () => {
  const name = stateNameOf(regions, 'IN-MH');
  assert.equal(name, 'Maharashtra');
  const cycles = acCycles(avail, 'IN-MH');
  assert.deepEqual(cycles, []);
  const hero = heroOf({ detail: null, seatNo: '', shownYear: null, cycles, stateName: name });
  assert.equal(hero.kind === 'missing' && hero.message,
    'Not available yet — the Maharashtra assembly result for this seat has not been added from the Election Commission of India.');
  assert.equal(resultMissing(null, 'X'), 'Not available yet — the X assembly result for this seat has not been added from the Election Commission of India.');
});

test('a state outside regions.json is named by its code', () => {
  assert.equal(stateNameOf(regions, 'IN-ZZ'), 'IN-ZZ');
  assert.equal(stateNameOf(null, 'IN-UP'), 'IN-UP');
});

test('the parent Lok Sabha seat links to its MP page by key; none when the geometry does not say', () => {
  assert.deepEqual(parentSeat('SAHARANPUR'), { title: 'Saharanpur', key: 'saharanpur' });
  assert.deepEqual(parentSeat('ROBERTSGANJ (SC)'), { title: 'Robertsganj (Sc)', key: 'robertsganj' });
  assert.equal(parentSeat(''), null);
});

test('a party: registry name and colour, symbol file under the data root; fallback colour outside the registry', () => {
  const parties = readData<PartiesDoc>('parties.json');
  const symbols = readData<SymbolsDoc>('parties-symbols.json');
  const sp = partyLook('SP', parties, symbols, '/d/');
  assert.equal(sp.name, parties.parties.find(p => p.code === 'SP')!.name);
  assert.equal(sp.colour, parties.parties.find(p => p.code === 'SP')!.colour);
  const file = symbols.symbols?.SP?.file;
  assert.equal(sp.symbol, file ? '/d/' + file : null);
  assert.deepEqual(partyLook('ZZZ', parties, symbols, '/d/'), { name: 'ZZZ', colour: parties.fallback.colour, symbol: null });
  assert.deepEqual(partyLook('ZZZ', null, null, '/d/'), { name: 'ZZZ', colour: '#888', symbol: null });
});
