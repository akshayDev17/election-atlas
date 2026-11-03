// Writes the /elections page into the assembled site, from the country list derived
// from D1 (backend/d1/countries.py). backend/build_site.py runs it; by hand:
//
//   python3 backend/d1/countries.py --db d1.sqlite --site dist --out countries.json
//   node frontend/landing/build.mjs --countries countries.json --site dist
//
// Writes, under <site>/elections/:
//   index.html           page 1, whole (the Worker serves it at /elections/)
//   page/<N>/index.html  page N >= 2, whole (the Worker serves it at /elections/?page=N)
//   cards/<N>.json       page N's cards alone ({"html": ...}), which the pager and search fetch
//   index.json           the search index: name, aliases, slug and page of every country
//   img/*.webp           each country's picture at 240, 360 and 720 px wide
//   fonts/newsreader.woff2
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { cardsHtml, page, pageCount, searchIndex } from './render.mjs';
import { pictureOf, rasterise } from './pictures.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// Paths of their own under /elections/: no country slug may take one.
export const RESERVED = new Set(['page', 'cards', 'img', 'fonts', 'index.json', 'index.html']);

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/** The Classic Light fallback block, without its comment. */
export const fallbackCss = () => readFileSync(join(here, '../app/site-fallback.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').trim();

/**
 * Refuses a list the page cannot be built from; returns it unchanged. An empty
 * list builds the page that says no country is published yet: whether a deploy
 * may ship it is backend/build_site.py's call (only with --pending-ok).
 */
export function checkCountries(countries, site) {
  if (!Array.isArray(countries)) throw new Error('the country list is not a list');
  const seen = new Set();
  for (const c of countries) {
    if (!/^[A-Z]{2}$/.test(c.code ?? '')) throw new Error(`bad country code: ${JSON.stringify(c.code)}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug ?? '')) throw new Error(`${c.code}: bad slug ${JSON.stringify(c.slug)}`);
    if (RESERVED.has(c.slug)) throw new Error(`${c.code}: slug ${c.slug} is a path of the /elections page itself`);
    if (seen.has(c.slug)) throw new Error(`${c.code}: slug ${c.slug} listed twice`);
    seen.add(c.slug);
    const e = c.election;
    if (!e || !Number.isInteger(e.total) || e.total <= 0 || !Array.isArray(e.top) || e.top.length === 0) {
      throw new Error(`${c.code}: no headline result`);
    }
    if (e.top.some((t) => !Number.isInteger(t.seats) || t.seats < 0 || t.seats > e.total)) throw new Error(`${c.code}: seats out of range`);
    if (!/^https:\/\//.test(e.source?.url ?? '') || !e.source?.publisher) throw new Error(`${c.code}: no https source`);
    if (!existsSync(join(site, 'elections', c.slug, 'index.html'))) throw new Error(`${c.code}: no country page at /elections/${c.slug}/`);
  }
  return countries;
}

/** The list A to Z: by name as the page's locale orders it, the country code breaking a tie. */
export const aToZ = (countries) =>
  [...countries].sort((a, b) => a.name.localeCompare(b.name, 'en') || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));

export async function build({ countries: derived, site, outlines = readJson(join(here, 'outlines.json')).outlines, aliases = readJson(join(here, 'aliases.json')).aliases }) {
  const countries = aToZ(checkCountries(derived, site));
  const root = join(site, 'elections');
  const pictures = Object.fromEntries(countries.map((c) => [c.code, pictureOf(c, outlines)]));
  const write = (rel, data) => {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, data);
  };
  let bytes = 0;
  for (const c of countries) {
    for (const [name, data] of Object.entries(await rasterise(c, pictures[c.code], site))) {
      write(`img/${name}`, data);
      bytes += data.length;
    }
  }
  const pages = pageCount(countries.length);
  const css = fallbackCss();
  for (let n = 1; n <= pages; n++) {
    write(n === 1 ? 'index.html' : `page/${n}/index.html`, page(countries, n, pictures, { fallbackCss: css }));
    write(`cards/${n}.json`, JSON.stringify({ html: cardsHtml(countries, n, pictures) }));
  }
  write('index.json', JSON.stringify(searchIndex(countries, aliases)));
  mkdirSync(join(root, 'fonts'), { recursive: true });
  copyFileSync(join(here, 'fonts/newsreader.woff2'), join(root, 'fonts/newsreader.woff2'));
  return { countries: countries.length, pages, imageBytes: bytes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { countries: { type: 'string' }, site: { type: 'string' } } });
  if (!values.countries || !values.site) {
    console.error('usage: node frontend/landing/build.mjs --countries <countries.json> --site <dist>');
    process.exit(2);
  }
  try {
    const r = await build({ countries: readJson(values.countries), site: values.site });
    console.log(`landing: ${r.countries} ${r.countries === 1 ? 'country' : 'countries'} on ${r.pages} ${r.pages === 1 ? 'page' : 'pages'}, ${(r.imageBytes / 1024).toFixed(0)} KB of pictures -> ${join(values.site, 'elections')}/`);
  } catch (err) {
    console.error(`landing: ${err.message}`);
    process.exit(1);
  }
}
