// The V-Dem regime data behind the country cards' pill: every nation names a tier the
// catalogue has, the four tiers are V-Dem's four with its own colours exactly (and a
// dark set derived from them by the one rule regime.ts states), each with an ink
// at AA contrast, and India reads as V-Dem rates it (RoW 2025: electoral autocracy).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NATION_REGIMES, REGIME_TIERS, VDEM, regimePillText, regimeTier } from './regime.ts';

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
/* WCAG 2.x contrast ratio between two hex colours. */
function contrast(a: string, b: string): number {
  const lum = (h: string) => { const [r, g, bl] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
/* OKLCH of a hex colour (Ottosson's OKLab): [lightness, chroma, hue in degrees]. */
function oklch(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360];
}
const WHITE = '#ffffff', DARKEST = '#0f1220', LIGHT_CARD = '#ffffff', DARK_CARD = '#1b2032';

test('the four tiers are V-Dem\'s, autocracies then democracies, each with criteria and a colour', () => {
  assert.deepEqual(REGIME_TIERS.map(t => t.id),
    ['closed-autocracy', 'electoral-autocracy', 'electoral-democracy', 'liberal-democracy']);
  for (const t of REGIME_TIERS) {
    for (const c of [t.colour, t.colourDark, t.ink, t.inkDark]) assert.match(c, /^#[0-9a-f]{6}$/, t.id);
    assert.ok(t.criteria.length > 80 && t.cutoffs.length > 40, t.id);
    assert.equal(t.label, t.label[0].toUpperCase() + t.label.slice(1).toLowerCase(), 'sentence case, as V-Dem writes it');
  }
  // the legend of the Democracy Report 2026 map (Figure 4, p. 10, the fill operators of
  // its six legend rectangles; the four RoW tiers, without the two grey-zone swatches):
  // reds for autocracies, blues for democracies, exactly as V-Dem prints them
  assert.deepEqual(REGIME_TIERS.map(t => t.colour), ['#78130d', '#b27570', '#766f95', '#1f0561']);
});

test('the dark set follows the one rule regime.ts states, and every ink is the better of white and the darkest ink, at AA', () => {
  assert.deepEqual(REGIME_TIERS.map(t => t.colourDark), ['#f88b7b', '#995f5a', '#8079a0', '#c5c7ff']);
  assert.deepEqual(REGIME_TIERS.map(t => t.ink), ['#ffffff', '#0f1220', '#ffffff', '#ffffff']);
  assert.deepEqual(REGIME_TIERS.map(t => t.inkDark), ['#0f1220', '#ffffff', '#0f1220', '#0f1220']);
  const [cardL] = oklch(DARK_CARD);
  for (const t of REGIME_TIERS) {
    // the rule: the same OKLCH hue and chroma (chroma only ever reduced, for sRGB),
    // lightness at 0.8 of the hex's distance below white, above the dark card
    const [L, C, H] = oklch(t.colour), [dL, dC, dH] = oklch(t.colourDark);
    assert.ok(Math.abs(dL - (cardL + 0.8 * (1 - L))) < 0.01, `${t.id}: dark lightness ${dL.toFixed(3)} for light ${L.toFixed(3)}`);
    assert.ok(Math.abs(((dH - H + 540) % 360) - 180) < 1.5, `${t.id}: hue ${dH.toFixed(1)} vs ${H.toFixed(1)}`);
    assert.ok(dC <= C + 0.002 && dC > C * 0.5, `${t.id}: chroma ${dC.toFixed(3)} vs ${C.toFixed(3)}`);
    // the ink: whichever of white and the site's darkest ink contrasts more, AA or better
    for (const [fill, ink, card] of [[t.colour, t.ink, LIGHT_CARD], [t.colourDark, t.inkDark, DARK_CARD]] as const) {
      const better = contrast(WHITE, fill) >= contrast(DARKEST, fill) ? WHITE : DARKEST;
      assert.equal(ink, better, `${t.id}: ink on ${fill}`);
      assert.ok(contrast(ink, fill) >= 4.5, `${t.id}: ${ink} on ${fill} is ${contrast(ink, fill).toFixed(2)}:1`);
      // the fill itself stands on its card (WCAG 1.4.11's 3:1 for a component's edge)
      assert.ok(contrast(fill, card) >= 3, `${t.id}: ${fill} on ${card} is ${contrast(fill, card).toFixed(2)}:1`);
    }
  }
  // the four dark fills stay apart from one another
  const dark = REGIME_TIERS.map(t => t.colourDark);
  for (let i = 0; i < dark.length; i++) for (let j = i + 1; j < dark.length; j++) {
    const [aL, aC, aH] = oklch(dark[i]), [bL, bC, bH] = oklch(dark[j]);
    const apart = Math.abs(aL - bL) > 0.04 || Math.abs(aC - bC) > 0.03 || Math.abs(((aH - bH + 540) % 360) - 180) > 20;
    assert.ok(apart, `${dark[i]} and ${dark[j]} look alike`);
  }
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
