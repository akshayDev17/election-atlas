// A seat's hover card shows only that seat. Patkura (Odisha 2019, AC 96) has no
// result in the ECI report (countermanded); hovering it after its neighbour
// Kendrapara must show Patkura's own card, never Kendrapara's numbers.
//     node --test tools/test_card.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cardBody } from '../state/card.js';

const read = p => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url)));
const colourFile = read('results/ac/IN-OD/2019.json');
const detail = read('results/ac/IN-OD/2019-detail.json').constituencies;
const acName = new Map(read('geo/ac/IN-OD.json').objects.acs.geometries
  .map(g => [String(g.properties.no), g.properties.ac]));
const nf = n => Math.round(n).toLocaleString('en-IN');
const fmt = { colour: () => '#888', nf, pc1: n => (n * 100).toFixed(1) + '%', faceFor: () => '' };

// What the page's card holds after hovering `key`: the seat's body, or nothing
// (hidden) when the body is empty.
const hover = key => cardBody({
  which: 'ac', key, name: acName.get(key) || '',
  cands: detail[key] && detail[key].c, r: null, tense: 'elected',
  acMissing: false, noResult: key in (colourFile.no_result || {}),
}, fmt);

test('Patkura is in the 2019 file\'s no_result and has no candidate detail', () => {
  assert.ok('96' in colourFile.no_result);
  assert.equal(detail['96'], undefined);
});

test('hovering Patkura after Kendrapara shows Patkura\'s own card, never Kendrapara\'s numbers', () => {
  const kendrapara = hover('97');
  assert.match(kendrapara, /KENDRAPARA/);
  const patkura = hover('96');
  assert.notEqual(patkura, '', 'Patkura must have its own card');
  assert.match(patkura, /PATKURA/);
  assert.match(patkura, /Assembly constituency 96/);
  assert.match(patkura, /Result not available yet \(countermanded or not in this report\)/);
  assert.doesNotMatch(patkura, /KENDRAPARA/);
  for (const c of detail['97'].c) {
    assert.ok(!patkura.includes(c.n), `Patkura's card names Kendrapara's candidate ${c.n}`);
    assert.ok(!patkura.includes(nf(c.v)), `Patkura's card shows Kendrapara's figure ${nf(c.v)}`);
  }
});

test('a seat with nothing to show gives an empty body, so the page hides the card', () => {
  assert.equal(cardBody({ which: 'ac', key: '1', name: 'X', cands: undefined, r: null,
    tense: 'elected', acMissing: false, noResult: false }, fmt), '');
});
