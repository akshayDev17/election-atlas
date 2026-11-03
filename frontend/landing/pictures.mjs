// Each listed country's card picture, generated at build time as right-sized WebP.
//
//   result map  a country whose D1 result names each seat's winner and whose
//               seat boundaries the atlas publishes (RESULT_MAPS): every seat
//               filled with the colour of the party that won it, as the
//               country page draws it.
//   flag shape  any other country: its outline (outlines.json, Natural Earth,
//               public domain) filled with its national flag (flag-icons, MIT),
//               the flag stretched to the outline's box and clipped to it. The
//               page draws a 1px edge stroke over it in --text-muted, so a flag
//               with large white or navy fields never fades into the card.
//
// Which countries get a picture is never decided here: the builder asks for one
// picture per country of the derived list, and a country with neither a result
// map nor an outline and a flag stops the build.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { geoMercator, geoPath } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
export const FLAGS = join(require.resolve('flag-icons/package.json'), '../flags/4x3');
export const WIDTHS = [240, 360, 720];
const NO_RESULT = '#C7CDD9';

/** Seat boundaries the atlas publishes, by nation code: paths inside the assembled site. */
export const RESULT_MAPS = {
  IN: {
    seats: 'elections/india/data/geo/india-pcs.json', seatsObject: 'pcs', seatKey: 'unique_id',
    borders: 'elections/india/data/geo/india-states.json', bordersObject: 'states',
    parties: 'elections/india/data/parties.json',
    W: 884, H: 1000,
    credit: 'India from the atlas’s constituency boundaries and the Election Commission of India’s results.',
  },
};

/**
 * What a country's picture is, or a thrown error naming what is missing.
 * Pure but for checking that the flag file exists.
 */
export function pictureOf(country, outlines, { flagsDir = FLAGS, resultMaps = RESULT_MAPS } = {}) {
  const map = resultMaps[country.code];
  if (map && country.seats) {
    const year = country.election.year;
    return {
      kind: 'result-map', base: `${country.slug}-map-${year}`, widths: WIDTHS, w: map.W, h: map.H,
      alt: `Map of ${country.name}, ${year} ${country.election.house} election: each of the ${Object.keys(country.seats.winners).length} constituencies with a result filled with the colour of the party that won it.`,
      credit: map.credit,
    };
  }
  const outline = outlines[country.code];
  const flag = join(flagsDir, `${country.code.toLowerCase()}.svg`);
  if (!outline || !existsSync(flag)) {
    throw new Error(`no picture for ${country.name} (${country.code}): ${outline ? '' : 'no outline in outlines.json; '}${existsSync(flag) ? '' : `no flag at ${flag}`}`);
  }
  const [, , w, h] = outline.viewBox.split(' ').map(Number);
  return {
    kind: 'flag-shape', base: `${country.slug}-flag`, widths: WIDTHS, w, h, viewBox: outline.viewBox, d: outline.d, flag,
    alt: `Outline of ${country.name} filled with its national flag`,
  };
}

/** The result map as SVG at `width` px: seats filled by winner, state borders over them. */
export function resultMapSvg(country, site, width, map = RESULT_MAPS[country.code]) {
  const read = (p) => JSON.parse(readFileSync(join(site, p), 'utf8'));
  const seatsTopo = read(map.seats), bordersTopo = read(map.borders), partiesDoc = read(map.parties);
  const registry = new Map(partiesDoc.parties.map((p) => [p.code, p.colour]));
  const fallback = partiesDoc.fallback.colour;
  // The country page's rule: the registry's colour, else the registry's fallback.
  const colour = (code) => country.seats.colours[code] ?? registry.get(code) ?? fallback;
  const regions = feature(bordersTopo, bordersTopo.objects[map.bordersObject]);
  const path = geoPath(geoMercator().fitExtent([[2, 2], [map.W - 2, map.H - 2]], regions));
  const r1 = (d) => (d || '').replace(/(\d+\.\d)\d+/g, '$1');
  const seats = feature(seatsTopo, seatsTopo.objects[map.seatsObject]).features.map((f) => {
    const p = country.seats.winners[f.properties[map.seatKey]];
    // A seat with no result in the file (Surat 2024, returned unopposed) stays a neutral grey.
    const fill = p ? colour(p) : NO_RESULT;
    return `<path d="${r1(path(f))}" fill="${fill}" stroke="${fill}" stroke-width=".5"/>`;
  }).join('');
  const borders = r1(path(mesh(bordersTopo, bordersTopo.objects[map.bordersObject])));
  const height = Math.round(width * map.H / map.W);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${map.W} ${map.H}" width="${width}" height="${height}">${seats}<path d="${borders}" fill="none" stroke="#0F1220" stroke-opacity=".6" stroke-width="1.1" stroke-linejoin="round"/></svg>`;
}

/** The outline filled with the flag as SVG at `width` px: the flag stretched to the outline's box, clipped to it. */
export function flagShapeSvg(pic, width) {
  const raw = readFileSync(pic.flag, 'utf8');
  const open = raw.match(/<svg\b[^>]*>/);
  if (!open) throw new Error(`${pic.flag} is not an SVG`);
  const viewBox = open[0].match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 640 480';
  const inner = raw.slice(open.index + open[0].length, raw.lastIndexOf('</svg>'));
  const height = Math.round(width * pic.h / pic.w);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${pic.viewBox}" width="${width}" height="${height}">`
    + `<defs><clipPath id="landing-outline"><path d="${pic.d}"/></clipPath></defs>`
    + `<g clip-path="url(#landing-outline)"><svg x="0" y="0" width="${pic.w}" height="${pic.h}" viewBox="${viewBox}" preserveAspectRatio="none">${inner}</svg></g></svg>`;
}

/** SVG text to WebP bytes, at the SVG's own pixel size. */
export const webp = (svg) => sharp(Buffer.from(svg)).webp({ quality: 80, alphaQuality: 50, effort: 6 }).toBuffer();

/** {file name: WebP bytes} for one country's picture at every width. */
export async function rasterise(country, pic, site) {
  const out = {};
  for (const w of pic.widths) {
    const svg = pic.kind === 'result-map' ? resultMapSvg(country, site, w) : flagShapeSvg(pic, w);
    out[`${pic.base}-${w}.webp`] = await webp(svg);
  }
  return out;
}
