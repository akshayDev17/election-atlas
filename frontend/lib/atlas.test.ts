// A member is their initials on the party colour plus a link to their own
// official page on sansad.in; no portrait is stored or requested. The "not
// available yet" sentence never carries a figure.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  acCycles, byelAvailable, coverNote, formedLater, inkOn, initials, lsResultsAvailable, lsStateAvailable, notAvailable,
  parentsOf, partOfText, resultRegion, sansadMemberURL, unionRoster,
} from './atlas.ts';
import { readData } from './testData.ts';
import type { RegionsDoc, StateYearDoc } from './types.ts';

test('a Lok Sabha member links to their biography by mpsno', () => {
  assert.equal(sansadMemberURL('ls', 4589), 'https://sansad.in/ls/members/biography/4589?locale=en');
});

test('a Rajya Sabha minister links to the Rajya Sabha list of ministers', () => {
  assert.equal(sansadMemberURL('rs', undefined), 'https://sansad.in/rs/members/in-council-of-ministers');
});

test('no member number, no link: an id is never invented', () => {
  assert.equal(sansadMemberURL('ls', ''), '');
  assert.equal(sansadMemberURL(undefined, undefined), '');
  assert.equal(sansadMemberURL('ls', 'S24_64'), '');
});

test('initials drop an honorific and take two words', () => {
  assert.equal(initials('Shri Narendra Modi'), 'NM');
  assert.equal(initials('NARENDRA MODI'), 'NM');
  assert.equal(initials('Dr. S. Jaishankar'), 'SJ');
  assert.equal(initials(''), '?');
});

test('the monogram ink reads on the party colour', () => {
  assert.equal(inkOn('#000000'), '#ffffff');
  assert.equal(inkOn('#ffff00'), '#1a1a1a');
  assert.equal(inkOn('#fff'), '#1a1a1a');
  assert.equal(inkOn('not a colour'), '');
});

test('"not available yet" names what is missing and who publishes it, never a number', () => {
  const s = notAvailable('the 2009 Lok Sabha results', 'the Election Commission of India', 'have');
  assert.equal(s, 'Not available yet — the 2009 Lok Sabha results have not been added from the Election Commission of India.');
  assert.doesNotMatch(notAvailable('the council of ministers', 'X'), /\d/);
});

test('availability: a missing index or key reads as not available', () => {
  assert.equal(lsResultsAvailable({}, 2024), false);
  assert.equal(lsStateAvailable({ ls: { state: { 1980: true } } }, 1980), true);
  assert.equal(byelAvailable({ ls: { byel: { 2009: false } } }, 2009), false);
  assert.deepEqual(unionRoster({}, 2024), { sworn_in: false, as_it_stands: false });
  assert.deepEqual(acCycles({ ac: { 'IN-UP': { cycles: { 2022: true, 2012: false } } } }, 'IN-UP'),
    [{ year: 2012, ok: false }, { year: 2022, ok: true }]);
});

test('the states formed later, and what each was carved from, are read from regions.json', () => {
  const parents = parentsOf(readData<RegionsDoc>('regions.json').regions);
  assert.deepEqual(Object.fromEntries(parents),
    { 'IN-TG': 'IN-AP', 'IN-UT': 'IN-UP', 'IN-CT': 'IN-MP', 'IN-JH': 'IN-BR', 'IN-LA': 'IN-JK' });
});

test('a year’s file decides whether a state was part of another: its own entry, else its parent’s', () => {
  const parents = parentsOf(readData<RegionsDoc>('regions.json').regions);
  const entry = { seats: 1, electors: null, parties: [] };
  const before: StateYearDoc = { year: 1980, regions: { 'IN-AP': entry } };
  const after: StateYearDoc = { year: 2019, regions: { 'IN-AP': entry, 'IN-TG': entry } };
  assert.equal(resultRegion(before, 'IN-TG', parents), 'IN-AP');
  assert.equal(resultRegion(after, 'IN-TG', parents), 'IN-TG');
  assert.equal(resultRegion(before, 'IN-UT', parents), null, 'neither its own entry nor its parent\'s');
  assert.deepEqual(formedLater(before, 'IN-AP', parents), ['IN-TG']);
  assert.deepEqual(formedLater(after, 'IN-AP', parents), []);
  assert.equal(partOfText('Andhra Pradesh', 1980), 'Part of Andhra Pradesh in 1980');
  assert.equal(coverNote('Andhra Pradesh', []), ' across Andhra Pradesh');
  assert.equal(coverNote(null, ['Telangana']), ', including present-day Telangana');
  assert.equal(coverNote(null, []), '');
});
