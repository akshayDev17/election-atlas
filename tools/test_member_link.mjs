// A member is their initials on the party colour plus a link to their own
// official page on sansad.in; no portrait is stored or requested.
//     node --test tools/test_member_link.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monogramHTML, officialPhotoHTML, sansadMemberURL, inkOn } from '../lib/atlas.js';

test('a Lok Sabha member links to their biography by mpsno, in a new tab', () => {
  const html = officialPhotoHTML('ls', 4589);
  assert.match(html, /href="https:\/\/sansad\.in\/ls\/members\/biography\/4589\?locale=en"/);
  assert.match(html, /target="_blank" rel="noopener"/);
  assert.match(html, />View official photo on sansad\.in ↗</);
});

test('a Rajya Sabha minister links to the Rajya Sabha list of ministers', () => {
  assert.equal(sansadMemberURL('rs', undefined), 'https://sansad.in/rs/members/in-council-of-ministers');
});

test('no member number, no link: an id is never invented', () => {
  assert.equal(officialPhotoHTML('ls', ''), '');
  assert.equal(officialPhotoHTML(undefined, undefined), '');
  assert.equal(officialPhotoHTML('ls', 'S24_64'), '');
});

test('the monogram is the initials on the party colour, with readable ink', () => {
  const html = monogramHTML('Shri Narendra Modi', '#E8590C');
  assert.match(html, />NM</);
  assert.match(html, /--mono-bg:#E8590C/);
  assert.doesNotMatch(html, /<img/);
  assert.equal(inkOn('#000000'), '#ffffff');
  assert.equal(inkOn('#ffff00'), '#1a1a1a');
  assert.equal(monogramHTML('NARENDRA MODI'), '<span class="monogram" aria-hidden="true">NM</span>');
});
