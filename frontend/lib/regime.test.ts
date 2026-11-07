// The V-Dem regime data behind the masthead pill: every nation names a tier the
// catalogue has, the four tiers are V-Dem's four with its own colours, and India
// reads as V-Dem rates it (RoW 2025: electoral autocracy).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NATION_REGIMES, REGIME_TIERS, VDEM, regimePillText, regimeTier } from './regime.ts';

test('the four tiers are V-Dem\'s, autocracies then democracies, each with criteria and a colour', () => {
  assert.deepEqual(REGIME_TIERS.map(t => t.id),
    ['closed-autocracy', 'electoral-autocracy', 'electoral-democracy', 'liberal-democracy']);
  for (const t of REGIME_TIERS) {
    assert.match(t.colour, /^#[0-9a-f]{6}$/, t.id);
    assert.ok(t.criteria.length > 80 && t.cutoffs.length > 40, t.id);
    assert.equal(t.label, t.label[0].toUpperCase() + t.label.slice(1).toLowerCase(), 'sentence case, as V-Dem writes it');
  }
  // the legend of the Democracy Report 2026 map: reds for autocracies, blues for democracies
  assert.deepEqual(REGIME_TIERS.map(t => t.colour), ['#78130d', '#b27570', '#766f95', '#1f0561']);
});

test('every nation names a tier the catalogue has and an https page of its own', () => {
  for (const [code, n] of Object.entries(NATION_REGIMES)) {
    assert.ok(REGIME_TIERS.some(t => t.id === n.tier), `${code}: ${n.tier}`);
    assert.match(n.externalURL, /^https:\/\//, code);
    assert.match(n.externalLabel, /new tab/, `${code}: the link says it opens a new tab`);
  }
});

test('India: V-Dem RoW 2025 rates it an electoral autocracy, read from V-Dem v16 (2026)', () => {
  const india = NATION_REGIMES.IN;
  assert.equal(india.tier, 'electoral-autocracy');
  assert.equal(regimeTier(india.tier).label, 'Electoral autocracy');
  assert.equal(regimePillText(india), 'V-Dem · Electoral autocracy');
  assert.deepEqual([VDEM.version, VDEM.released, VDEM.dataYear], ['v16', 2026, 2025]);
  assert.match(india.externalURL, /ourworldindata\.org\/grapher\/political-regime\?country=~IND$/);
});

test('an unknown tier is refused, never drawn blank', () => {
  assert.throws(() => regimeTier('monarchy' as never), /unknown regime tier/);
});
