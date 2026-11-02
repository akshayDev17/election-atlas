// A member is their initials on the party colour plus a link to their own
// official page on sansad.in; no portrait is stored or requested. The "not
// available yet" sentence never carries a figure.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  acCycles, byelAvailable, inkOn, initials, lsResultsAvailable, lsStateAvailable, notAvailable,
  sansadMemberURL, unionRoster,
} from './atlas.ts';

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
