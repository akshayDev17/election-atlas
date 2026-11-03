// Writes outlines.json: one simplified, card-sized SVG outline per country, keyed by
// ISO 3166-1 alpha-2 code (the code D1 gives a nation, and flag-icons' file name).
//
//   curl -LO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson
//   node frontend/landing/outlines.mjs ne_50m_admin_0_countries.geojson
//
// Source: Natural Earth 1:50m Admin 0 countries v5.1.2 (public domain,
// naturalearthdata.com), its default (de facto) point of view. Outlying islands far
// from the mainland are dropped for a card-sized outline; the USA gets Alaska and
// Hawaii as small insets, the usual convention; Russia and Fiji are unwrapped across
// 180°. The page builder fills an outline with the country's flag only for a country
// D1 lists that has no result map.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('./outlines.json', import.meta.url));
// How far (degrees) from the main landmass an island may lie and still be drawn.
const KEEP_DEG = { ESP: 6, PRT: 4, GBR: 12, ITA: 8, AUS: 14, JPN: 30, ISR: 5, SRB: 5, IDN: 40, PHL: 15, MYS: 15, IND: 25, FRA: 12, CAN: 60, RUS: 80, TZA: 8, NZL: 14, CHL: 30, NOR: 25, DNK: 6, GRC: 8, ECU: 6 };

const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const area = (r) => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
const centroid = (r) => r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
function dp(pts, tol) { // Douglas-Peucker
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > max) { max = d; idx = i; }
  }
  return max > tol ? [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)] : [a, b];
}
const dpRing = (r, t) => { const m = r.length >> 1; return [...dp(r.slice(0, m + 1), t).slice(0, -1), ...dp(r.slice(m), t)]; };
const project = (rings, lat0) => { const k = Math.cos(lat0 * Math.PI / 180); return rings.map((r) => r.map(([x, y]) => [x * k, -y])); };
const bbox = (rings) => {
  const xs = rings.flat().map((p) => p[0]), ys = rings.flat().map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
function fit(rings, box) { // box = [x, y, w, h]
  const [x0, y0, x1, y1] = bbox(rings), s = Math.min(box[2] / (x1 - x0), box[3] / (y1 - y0));
  const ox = box[0] + (box[2] - (x1 - x0) * s) / 2, oy = box[1] + (box[3] - (y1 - y0) * s) / 2;
  return rings.map((r) => r.map(([x, y]) => [ox + (x - x0) * s, oy + (y - y0) * s]));
}
const path = (rings) => rings.map((r) => dpRing(r, 0.6)).filter((r) => r.length > 2 && area(r) > 0.6)
  .map((r) => 'M' + r.map((p) => Math.round(p[0]) + ',' + Math.round(p[1])).join('L') + 'Z').join('');

const iso2 = (p) => (p.ISO_A2_EH && p.ISO_A2_EH !== '-99' ? p.ISO_A2_EH : p.ISO_A2);

export function outline(feature) {
  const iso = feature.properties.ADM0_A3;
  let rings = polys(feature.geometry).map((p) => p[0]);
  if (iso === 'RUS' || iso === 'FJI') rings = rings.map((r) => r.map(([x, y]) => [x < 0 ? x + 360 : x, y]));
  if (iso === 'USA') {
    const lower = rings.filter((r) => centroid(r)[0] > -130 && centroid(r)[1] < 50 && centroid(r)[1] > 24);
    const alaska = rings.filter((r) => centroid(r)[1] > 50 && centroid(r)[0] < -129 && centroid(r)[0] > -180);
    const hawaii = rings.filter((r) => centroid(r)[1] < 23 && centroid(r)[0] < -150);
    return {
      viewBox: '0 0 200 100',
      d: [fit(project(lower, 38), [40, 0, 160, 100]), fit(project(alaska, 62), [0, 66, 44, 34]), fit(project(hawaii, 20), [46, 84, 22, 14])].map(path).join(''),
    };
  }
  const main = rings.reduce((a, r) => (area(r) > area(a) ? r : a)), c = centroid(main);
  const [mx0, my0, mx1, my1] = bbox([main]);
  const keep = KEEP_DEG[iso] ?? Math.max(6, 1.2 * Math.hypot(mx1 - mx0, my1 - my0));
  rings = rings.filter((r) => Math.hypot(centroid(r)[0] - c[0], centroid(r)[1] - c[1]) <= keep);
  const pr = project(rings, c[1]), [x0, y0, x1, y1] = bbox(pr), ar = (x1 - x0) / (y1 - y0);
  const w = ar >= 1 ? 200 : Math.max(1, Math.round(200 * ar)), h = ar >= 1 ? Math.max(1, Math.round(200 / ar)) : 200;
  return { viewBox: `0 0 ${w} ${h}`, d: path(fit(pr, [0, 0, w, h])) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ne = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const out = {};
  for (const f of ne.features) {
    const code = iso2(f.properties);
    if (!/^[A-Z]{2}$/.test(code ?? '') || out[code]) continue;
    const o = outline(f);
    if (o.d) out[code] = o;
  }
  const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
  writeFileSync(OUT, JSON.stringify({
    source: 'Natural Earth 1:50m Admin 0 countries v5.1.2 (public domain), default point of view; simplified by frontend/landing/outlines.mjs',
    outlines: sorted,
  }) + '\n');
  console.log(Object.keys(sorted).length, 'outlines', JSON.stringify(sorted).length, 'bytes');
}
